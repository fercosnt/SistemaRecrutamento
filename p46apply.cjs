#!/usr/bin/env node
'use strict';
/*
 * p46apply.cjs — aplicador de migrations pela Management API do Supabase.
 *
 * ⚠ RECONSTRUÍDO em 2026-08-23 a partir do contrato escrito em CLAUDE.md
 *   (seção "✅ Via de apply ATUAL"). O arquivo original da Phase 46 não estava
 *   no repositório — nunca foi commitado. Este é o mesmo contrato, e as três
 *   propriedades medidas em 2026-08-22 continuam sendo o motivo de ele existir:
 *
 *   1. ATOMICIDADE. O endpoint roda o corpo INTEIRO da requisição numa única
 *      transação. Por isso a migration e a linha de
 *      `supabase_migrations.schema_migrations` vão na MESMA requisição: um apply
 *      que roda mas não se registra é indistinguível de um que não rodou.
 *   2. A `version` nasce CORRETA. Não há `UPDATE ... SET version` a fazer — essa
 *      instrução, ainda escrita dentro dos cabeçalhos das migrations antigas, é
 *      resíduo do `apply_migration` do MCP, que carimbava o instante do apply.
 *   3. O md5 bate POR CONSTRUÇÃO — o corpo vem de `fs.readFileSync`, não de uma
 *      transcrição — e ainda assim é CONFERIDO por leitura de volta do ledger.
 *
 *   A diferença entre este caminho e o `apply_migration` do MCP é exatamente
 *   essa: lá o SQL é transcrito pelo modelo. Foi por aí que duas das cinco
 *   migrations do M8 chegaram a PROD com os comentários descartados.
 *
 * Uso:
 *   node p46apply.cjs migrate <arquivo...>   aplica migration(s) + registra no ledger
 *   node p46apply.cjs run <arquivo...>       executa arquivo(s) SEM registrar (smokes)
 *   node p46apply.cjs sql "<query>"          executa uma query solta
 *
 *   --dry-run   imprime o que faria e sai sem tocar em nada
 *
 * Token: Keychain do macOS, serviço "Supabase CLI", conta "supabase".
 *        Ou a env SUPABASE_ACCESS_TOKEN, que tem precedência.
 * ⚠ Não é necessária a senha do banco — ela não é recuperável no painel.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'isljnozzlvckrgjjbjwp';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

function die(msg) {
  console.error(`p46apply: ${msg}`);
  process.exit(1);
}

function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try {
    return execFileSync(
      'security',
      ['find-generic-password', '-s', 'Supabase CLI', '-a', 'supabase', '-w'],
      { encoding: 'utf8' }
    ).trim();
  } catch {
    die('token não encontrado. Defina SUPABASE_ACCESS_TOKEN ou grave no Keychain (serviço "Supabase CLI", conta "supabase").');
  }
}

async function query(sql) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    const e = new Error(`HTTP ${res.status}: ${text}`);
    e.status = res.status;
    e.body = text;
    throw e;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* O `version` e o `name` vêm do NOME DO ARQUIVO, nunca do relógio. */
function parseName(file) {
  const base = path.basename(file, '.sql');
  const m = base.match(/^(\d{14})_(.+)$/);
  if (!m) die(`nome de arquivo fora do padrão <version14>_<name>.sql: ${base}`);
  return { version: m[1], name: m[2] };
}

/* Literal SQL — dobra a aspa simples. Usado só para os metadados do ledger e
 * para o corpo dentro de `statements[1]`; o corpo executado NÃO passa por aqui. */
function lit(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

async function migrate(files, dryRun) {
  for (const file of files) {
    if (!fs.existsSync(file)) die(`arquivo não encontrado: ${file}`);
    const { version, name } = parseName(file);
    /* Byte a byte, do disco. É o ponto inteiro deste programa. */
    const body = fs.readFileSync(file, 'utf8');
    const md5File = crypto.createHash('md5').update(body, 'utf8').digest('hex');

    /* Migration + registro na MESMA requisição ⇒ mesma transação.
     * `statements[1]` guarda o arquivo LITERAL, comentários inclusive — é o que
     * torna o md5 conferível depois. */
    const sql = `${body}\n\nINSERT INTO supabase_migrations.schema_migrations (version, name, statements)\nVALUES (${lit(version)}, ${lit(name)}, ARRAY[${lit(body)}]);\n`;

    console.log(`\n── ${path.basename(file)}`);
    console.log(`   version : ${version}`);
    console.log(`   name    : ${name}`);
    console.log(`   octetos : ${Buffer.byteLength(body, 'utf8')}`);
    console.log(`   md5     : ${md5File}`);

    if (dryRun) {
      console.log('   DRY-RUN — nada enviado.');
      continue;
    }

    const already = await query(
      `SELECT version FROM supabase_migrations.schema_migrations WHERE version = ${lit(version)};`
    );
    if (Array.isArray(already) && already.length > 0) {
      die(`version ${version} JÁ está no ledger. Recusando reaplicar — decida à mão.`);
    }

    await query(sql);

    /* Cross-check: md5 do que o LEDGER guardou contra o md5 do ARQUIVO.
     * Bate por construção, e mesmo assim é lido de volta — porque "aplicado" e
     * "escriturado" são afirmações diferentes. */
    const back = await query(
      `SELECT md5(statements[1]) AS md5_ledger, octet_length(statements[1]) AS octetos, name\n         FROM supabase_migrations.schema_migrations WHERE version = ${lit(version)};`
    );
    const row = Array.isArray(back) ? back[0] : null;
    if (!row) die(`APLICADO MAS NÃO ESCRITURADO: ${version} não voltou do ledger.`);
    if (row.md5_ledger !== md5File) {
      die(
        `md5 DIVERGE — ledger=${row.md5_ledger} arquivo=${md5File}. ` +
          `O corpo registrado não é o do disco. NÃO siga para a próxima migration.`
      );
    }
    console.log(`   ✅ aplicada e escriturada — md5 do ledger BATE (${row.octetos} octetos)`);
  }
}

async function run(files, dryRun) {
  for (const file of files) {
    if (!fs.existsSync(file)) die(`arquivo não encontrado: ${file}`);
    const body = fs.readFileSync(file, 'utf8');
    console.log(`\n── run ${path.basename(file)} (${Buffer.byteLength(body, 'utf8')} octetos, SEM registro no ledger)`);
    if (dryRun) {
      console.log('   DRY-RUN — nada enviado.');
      continue;
    }
    const out = await query(body);
    console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
  }
}

(async () => {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const args = argv.filter((a) => a !== '--dry-run');
  const cmd = args.shift();

  try {
    if (cmd === 'migrate') {
      if (!args.length) die('uso: p46apply.cjs migrate <arquivo...>');
      await migrate(args, dryRun);
    } else if (cmd === 'run') {
      if (!args.length) die('uso: p46apply.cjs run <arquivo...>');
      await run(args, dryRun);
    } else if (cmd === 'sql') {
      if (!args.length) die('uso: p46apply.cjs sql "<query>"');
      if (dryRun) {
        console.log(args.join(' '));
      } else {
        const out = await query(args.join(' '));
        console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
      }
    } else {
      die('comandos: migrate | run | sql   (flag: --dry-run)');
    }
  } catch (err) {
    die(err.message);
  }
})();
