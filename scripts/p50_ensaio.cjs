#!/usr/bin/env node
'use strict';
/*
 * p50_ensaio.cjs — ENSAIO da Phase 50 contra PROD, numa requisição que ABORTA.
 *
 * O QUE GARANTE QUE NADA PERSISTE. O endpoint da Management API roda o corpo INTEIRO da
 * requisição numa única transação (CLAUDE.md §«Via de apply ATUAL», propriedade 1 — medido em
 * 2026-08-22: `CREATE TABLE; SELECT 1/0;` deixou a tabela inexistente). Este programa compõe
 *
 *     PREFIXO (SET LOCAL lock_timeout/statement_timeout + reset das GUCs de evidência)
 *   + migrations p50 ainda fora do ledger (ou as pedidas por --migracoes=, ou nenhuma)
 *   + [mutação avulsa — só quando chamado por p50_mutacoes.cjs]
 *   + cada arquivo SQL dado (smokes)
 *   + DO $ens$ … RAISE EXCEPTION 'ENSAIO_P50_TERMINOU smoke50=<p>/<e> evidencia=<…>'
 *
 * e manda por `node p46apply.cjs run` (o corpo vem do DISCO, byte a byte, como no apply). O
 * sentinela no fim aborta a transação: a migration, a linha de ledger (que o `run` nem escreve)
 * e qualquer escrita de smoke voltam. Antes e depois de TODA execução, `capturar()` lê (só
 * leitura) o ledger das quatro versões p50 com md5, o corpo/ACL do helper, TODAS as policies de
 * `public`, `role|ativo|deleted_at` de cada linha de `usuarios_rh` e a borda de `candidaturas`
 * (mortas/rascunho) — as duas últimas porque o smoke ESCREVE nelas dentro do envelope P50C1.
 * Qualquer diferença é `PERSISTIU: <chave>: antes -> depois`. (Ainda fora: o corpo das funções
 * que as migrations 0002–0004 vão tocar — WR-04 do 50-REVIEW-TRACER-1, aberto.)
 *
 * Como a Management API não devolve NOTICE, cada PÓS-PORTÃO p50 ANEXA o que mediu à GUC de
 * sessão `p50.evidencia`; o sentinela a carrega para fora na mensagem do erro, e a linha de
 * veredito a copia.
 *
 * LOCK. Cada ensaio com migration segura `AccessExclusiveLock` nas tabelas cujas policies a
 * migration altera (no 0001: `candidaturas`) até abortar. `lock_timeout = 3s` limita a ESPERA na
 * fila; `statement_timeout = 5s` limita cada INSTRUÇÃO com o lock seguro — abaixo dos 8 s de
 * `statement_timeout` de `authenticated`/`authenticator` medidos em PROD. A duração é impressa.
 * `LOCK TIMEOUT` / `STATEMENT TIMEOUT` saem com código 3 SEM concluir nada; subir o teto não é
 * decisão do executor.
 *
 * Uso:
 *   node scripts/p50_ensaio.cjs [--migracoes=a.sql,b.sql | --sem-migracoes] [--vistas] [--mutacao=x.sql] <arquivo.sql…>
 *     (padrão)          prefixa toda migration de MIGS que exista no disco e NÃO esteja no ledger
 *     --migracoes=a,b   prefixa exatamente essas (cada uma tem de existir e estar fora do ledger)
 *     --sem-migracoes   não prefixa nenhuma (smoke contra os objetos VIVOS)
 *     --vistas          sonda de vistas externas antes e depois das migrations, na mesma transação
 *     --mutacao=x.sql   insere o arquivo DEPOIS das migrations e ANTES da sonda «depois» (o mesmo
 *                       encaixe das mutações do runner). Com `--vistas --sem-migracoes
 *                       --mutacao=supabase/tests/p50_desfazer_tracer.sql`, sem arquivos, é o
 *                       ENSAIO REVERSO do 50-02: sonda do estado VIVO → o desfazer → sonda →
 *                       compara, tudo na mesma transação que aborta (antes × depois do apply sem
 *                       janela de tráfego entre as duas fotografias)
 *
 * Saída (uma linha):
 *   ENSAIO VERDE: <arquivos> · prefixadas=[…] · aplicadas=[…] · ausentes=[…] · [vistas=… ·]
 *                 smoke50=p/e · evidencia=<…> · <ms> ms                                    (exit 0)
 *   ENSAIO VERMELHO: <primeira linha FAIL/ERROR>                                           (exit 1)
 *   LOCK TIMEOUT / STATEMENT TIMEOUT                                                       (exit 3)
 *   PERSISTIU: …                                                                           (exit 1)
 *
 * Sem dependências (git/p46apply por execFileSync). Como módulo: { compor, rodar, MIGS, … }.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const APPLY = path.join(ROOT, 'p46apply.cjs');
const SENTINELA = 'ENSAIO_P50_TERMINOU';

/* Ordem de aplicação das migrations da fase (versões fixadas no planejamento). */
const MIGS = [
  'supabase/migrations/20261005000001_p50_helper_candidaturas.sql',
  'supabase/migrations/20261005000002_p50_policies_rh_ativo.sql',
  'supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql',
  'supabase/migrations/20261005000004_p50_rpcs_escrita.sql',
];

const PREFIXO =
  "SET LOCAL lock_timeout = '3s';\n" +
  "SET LOCAL statement_timeout = '5s';\n" +
  // Uma conexão do pool pode trazer GUCs de sessão de uma execução anterior que COMMITOU (um
  // smoke rodado depois do apply): zera as que o veredito lê, para não herdar número alheio.
  "SELECT set_config('smoke50.pass', '', false), set_config('smoke50.esperado', '', false),\n" +
  "       set_config('p50.evidencia', '', false), set_config('p50.vistas', '', false),\n" +
  "       set_config('p50.vistas_antes', '', false);\n";

const FIM =
  '\nRESET ROLE;\n' +
  'DO $ens$\n' +
  'DECLARE\n' +
  "  p text := current_setting('smoke50.pass', true);\n" +
  "  e text := current_setting('smoke50.esperado', true);\n" +
  'BEGIN\n' +
  "  RAISE EXCEPTION '% smoke50=% evidencia=%', '" + SENTINELA + "',\n" +
  "    CASE WHEN coalesce(p, '') = '' OR coalesce(e, '') = '' THEN 'n/a' ELSE p || '/' || e END,\n" +
  "    coalesce(nullif(current_setting('p50.evidencia', true), ''), '-');\n" +
  'END\n' +
  '$ens$;\n';

/* Sonda de vistas externas (D-12) e a comparação antes × depois na MESMA transação. */
const SONDA = 'supabase/tests/p50_vistas_externas.sql';
const GUARDA_ANTES = "\nRESET ROLE;\nSELECT set_config('p50.vistas_antes', current_setting('p50.vistas'), false);\n";
const COMPARA =
  '\nRESET ROLE;\n' +
  'DO $vistas_compara$\n' +
  'DECLARE\n' +
  "  a jsonb := nullif(current_setting('p50.vistas_antes', true), '')::jsonb;\n" +
  "  d jsonb := nullif(current_setting('p50.vistas', true), '')::jsonb;\n" +
  '  v_dif text;\n' +
  '  v_adm text;\n' +
  'BEGIN\n' +
  '  IF a IS NULL OR d IS NULL THEN\n' +
  "    RAISE EXCEPTION 'P50V FAIL (vistas): fotografia ausente (antes=%, depois=%) — a sonda nao rodou', a IS NOT NULL, d IS NOT NULL;\n" +
  '  END IF;\n' +
  "  SELECT string_agg(u.ator || '.' || u.rel, ',' ORDER BY u.ator, u.rel) INTO v_dif\n" +
  '    FROM (\n' +
  "      SELECT e.key AS ator, r.key AS rel FROM jsonb_each(a -> 'atores') e, jsonb_each(e.value) r\n" +
  '      UNION\n' +
  "      SELECT e.key, r.key FROM jsonb_each(d -> 'atores') e, jsonb_each(e.value) r\n" +
  '    ) u\n' +
  "   WHERE (a -> 'atores' -> u.ator -> u.rel) IS DISTINCT FROM (d -> 'atores' -> u.ator -> u.rel);\n" +
  "  IF v_dif IS NOT NULL OR (a -> 'atores') IS DISTINCT FROM (d -> 'atores') THEN\n" +
  "    RAISE EXCEPTION 'P50V FAIL (vistas): %', coalesce(v_dif, 'conjunto de atores mudou');\n" +
  '  END IF;\n' +
  "  SELECT string_agg(x.k, ',' ORDER BY x.k) INTO v_adm\n" +
  "    FROM (SELECT 'antes.' || key AS k FROM jsonb_each(a -> 'admin_ve_tudo') WHERE value IS DISTINCT FROM 'true'::jsonb\n" +
  "          UNION ALL\n" +
  "          SELECT 'depois.' || key FROM jsonb_each(d -> 'admin_ve_tudo') WHERE value IS DISTINCT FROM 'true'::jsonb) x;\n" +
  '  IF v_adm IS NOT NULL THEN\n' +
  "    RAISE EXCEPTION 'P50V FAIL (vistas): administrador nao ve tudo em %', v_adm;\n" +
  '  END IF;\n' +
  "  IF (a -> 'relacoes') IS DISTINCT FROM (d -> 'relacoes') THEN\n" +
  "    RAISE EXCEPTION 'P50V FAIL (vistas): conjunto de relacoes mudou (% -> %)', a -> 'relacoes', d -> 'relacoes';\n" +
  '  END IF;\n' +
  'END\n' +
  '$vistas_compara$;\n';

const RE_SENTINELA = new RegExp(SENTINELA + ' smoke50=(\\S+) evidencia=([^"\\\\]*)');

function versao(arq) {
  return path.basename(arq).slice(0, 14);
}

function abs(arq) {
  return path.isAbsolute(arq) ? arq : path.join(ROOT, arq);
}

/* Query só-leitura pela via do projeto; devolve as linhas. */
function sqlLeitura(q) {
  const s = execFileSync('node', [APPLY, 'sql', q], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(s.slice(s.indexOf('[')));
}

/* Estado que decide o PLANO (o que prefixar): o ledger das versões p50 e a existência do helper.
 * NÃO é a checagem de persistência — essa é `capturar()`, abaixo. */
function lerEstado() {
  const vs = MIGS.map(versao).map((v) => `'${v}'`).join(',');
  const q =
    'set transaction read only; select ' +
    `(select coalesce(json_agg(version order by version), '[]'::json) from supabase_migrations.schema_migrations where version in (${vs})) as ledger, ` +
    "to_regprocedure('public.is_active_rh_user()')::text as helper";
  const row = sqlLeitura(q)[0];
  return { ledger: row.ledger, helper: row.helper };
}

/*
 * Impressão digital do que NENHUM ensaio pode mudar — baseline capturada NA execução, sem
 * constante; leitura só-leitura. Usada pelo CLI deste arquivo E por `p50_mutacoes.cjs` (o mesmo
 * critério nos dois runners). Cobre:
 *   ledger      as linhas das quatro versões p50, com md5 do corpo;
 *   helper      `public.is_active_rh_user()`: assinatura, md5(prosrc), ACL, prosecdef, proconfig;
 *   politicas   TODA policy de `public`: md5(qual|with_check) || roles || cmd || permissive
 *               (não só as que casam a forma — uma policy alheia alterada também é PERSISTIU);
 *   usuarios_rh por linha, `role|ativo|deleted_at` — as colunas que o smoke ESCREVE dentro do
 *               envelope P50C1 (troca de papel e exclusão de a_ativo, cláusulas (b)/(c));
 *   borda       as candidaturas mortas/rascunho (`deleted_at IS NOT NULL OR is_rascunho`) com o
 *               estado de cada uma — a população que a cláusula (f) SEMEIA dentro do envelope.
 * Colunas de relógio (`updated_at`, último acesso) ficam de fora de propósito: tráfego legítimo
 * as move, e o que o smoke escreve está nas colunas acima.
 */
function capturar() {
  const vs = MIGS.map(versao).map((v) => `'${v}'`).join(',');
  const q =
    'set transaction read only; select ' +
    `(select coalesce(json_agg(json_build_object('v', version, 'md5', md5(coalesce(statements[1], ''))) order by version), '[]'::json) from supabase_migrations.schema_migrations where version in (${vs})) as ledger, ` +
    "(select json_build_object('sig', p.oid::regprocedure::text, 'src', md5(p.prosrc), 'acl', p.proacl::text, 'secdef', p.prosecdef, 'conf', p.proconfig::text) from pg_catalog.pg_proc p where p.oid = to_regprocedure('public.is_active_rh_user()')) as helper, " +
    "(select coalesce(json_object_agg(tablename || '.' || policyname, md5(coalesce(qual, '') || '|' || coalesce(with_check, '')) || roles::text || cmd || permissive order by tablename, policyname), '{}'::json) from pg_catalog.pg_policies where schemaname = 'public') as politicas, " +
    "(select coalesce(json_object_agg(u.id::text, concat_ws('|', u.role, u.ativo, u.deleted_at) order by u.id), '{}'::json) from public.usuarios_rh u) as usuarios_rh, " +
    "(select coalesce(json_object_agg(c.id::text, concat_ws('|', c.deleted_at, c.is_rascunho) order by c.id), '{}'::json) from public.candidaturas c where c.deleted_at is not null or c.is_rascunho) as borda";
  return sqlLeitura(q)[0];
}

/* As chaves (achatadas) em que duas capturas diferem — para o PERSISTIU dizer O QUE mudou. */
function diferencas(a, d) {
  const plano = (o, pre, acc) => {
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) plano(o[k], pre ? `${pre}.${k}` : k, acc);
    } else acc[pre] = o;
    return acc;
  };
  const A = plano(a, '', {});
  const D = plano(d, '', {});
  const ks = [...new Set([...Object.keys(A), ...Object.keys(D)])].sort();
  return ks.filter((k) => JSON.stringify(A[k]) !== JSON.stringify(D[k])).map((k) => `${k}: ${JSON.stringify(A[k])} -> ${JSON.stringify(D[k])}`);
}

/* Decide o que prefixar. modo: 'padrao' | 'lista' | 'nenhuma'. */
function planejar(modo, lista, estado) {
  const noLedger = new Set(estado.ledger);
  const aplicadas = MIGS.map(versao).filter((v) => noLedger.has(v));
  let prefixadas;
  if (modo === 'nenhuma') {
    prefixadas = [];
  } else if (modo === 'lista') {
    prefixadas = lista.map((a) => {
      if (!fs.existsSync(abs(a))) throw new Error(`migration pedida nao existe no disco: ${a}`);
      if (noLedger.has(versao(a))) throw new Error(`migration pedida JA esta no ledger (aplicada): ${a}`);
      return a;
    });
  } else {
    prefixadas = MIGS.filter((m) => !noLedger.has(versao(m)) && fs.existsSync(abs(m)));
  }
  const pv = new Set(prefixadas.map(versao));
  const ausentes = MIGS.map(versao).filter((v) => !noLedger.has(v) && !pv.has(v));
  return { prefixadas, aplicadas, ausentes };
}

/* Compõe o corpo do ensaio. */
function compor({ prefixadas = [], arquivos = [], mutacao = null, rotuloMutacao = 'MUTACAO', vistas = false } = {}) {
  const partes = [PREFIXO];
  const sonda = vistas ? fs.readFileSync(abs(SONDA), 'utf8') : null;
  if (vistas) partes.push('\n-- ═══ SONDA DE VISTAS (ANTES) ═══\nRESET ROLE;\n' + sonda + GUARDA_ANTES);
  for (const m of prefixadas) partes.push(`\n-- ═══ MIGRATION ${path.basename(m)} ═══\n` + fs.readFileSync(abs(m), 'utf8'));
  if (mutacao) partes.push(`\n-- ═══ ${rotuloMutacao} ═══\nRESET ROLE;\n${mutacao}\n`);
  if (vistas) partes.push('\n-- ═══ SONDA DE VISTAS (DEPOIS) ═══\nRESET ROLE;\n' + sonda + COMPARA);
  for (const a of arquivos) partes.push(`\n-- ═══ ARQUIVO ${path.basename(a)} ═══\nRESET ROLE;\n` + fs.readFileSync(abs(a), 'utf8'));
  partes.push(FIM);
  return partes.join('\n');
}

/* Roda um corpo pela via do projeto. Não sai do processo: devolve o texto e a classificação. */
function rodar(corpo, rotulo) {
  const arq = path.join(os.tmpdir(), `p50_ensaio_${String(rotulo).replace(/[^A-Za-z0-9_-]/g, '_')}_${process.pid}.sql`);
  fs.writeFileSync(arq, corpo, 'utf8');
  const t0 = Date.now();
  let out;
  try {
    out = execFileSync('node', [APPLY, 'run', arq], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    out = `${e.stdout || ''}${e.stderr || ''}`;
  }
  const ms = Date.now() - t0;
  let timeout = null;
  if (/\b55P03\b|lock timeout/i.test(out)) timeout = 'LOCK TIMEOUT';
  else if (/\b57014\b|statement timeout/i.test(out)) timeout = 'STATEMENT TIMEOUT';
  const m = out.match(RE_SENTINELA);
  return {
    out,
    ms,
    timeout,
    sentinela: !!m,
    smoke50: m ? m[1] : null,
    evidencia: m ? m[2].trim() : null,
  };
}

/* Primeira linha que explica a reprovação. */
function primeiraFalha(out) {
  const f = out.match(/(P50[A-Z]* FAIL \([^)]*\)[^"\\]*)/) || out.match(/([A-Z0-9-]+ FAIL[^"\\]*)/) || out.match(/ERROR:\s+([^"\\]*)/);
  if (f) return f[1].trim().slice(0, 600);
  return out.trim().split('\n').slice(-3).join(' | ').slice(0, 600);
}

function lista(vs) {
  return `[${vs.join(',')}]`;
}

function principal() {
  const argv = process.argv.slice(2);
  let modo = 'padrao';
  let listaMig = [];
  let vistas = false;
  let mutacaoArq = null;
  const arquivos = [];
  for (const a of argv) {
    if (a === '--sem-migracoes') modo = 'nenhuma';
    else if (a.startsWith('--mutacao=')) mutacaoArq = a.slice('--mutacao='.length) || null;
    else if (a.startsWith('--migracoes=')) {
      modo = 'lista';
      listaMig = a.slice('--migracoes='.length).split(',').filter(Boolean);
    } else if (a === '--vistas') vistas = true;
    else if (a.startsWith('--')) {
      console.error(`opcao desconhecida: ${a}`);
      process.exit(1);
    } else arquivos.push(a);
  }
  for (const a of arquivos) {
    if (!fs.existsSync(abs(a))) {
      console.error(`arquivo nao encontrado: ${a}`);
      process.exit(1);
    }
  }
  if (mutacaoArq && !fs.existsSync(abs(mutacaoArq))) {
    console.error(`arquivo de mutacao nao encontrado: ${mutacaoArq}`);
    process.exit(1);
  }
  const estado = lerEstado();
  let plano;
  try {
    plano = planejar(modo, listaMig, estado);
  } catch (e) {
    console.error(`ENSAIO VERMELHO: ${e.message}`);
    process.exit(1);
  }
  const prefV = plano.prefixadas.map(versao);
  console.log(`ensaio: prefixadas=${lista(prefV)} aplicadas=${lista(plano.aplicadas)} ausentes=${lista(plano.ausentes)} arquivos=${arquivos.join(',') || '-'}${mutacaoArq ? ` mutacao=${mutacaoArq}` : ''}`);

  const antes = capturar();
  const corpo = compor({
    prefixadas: plano.prefixadas,
    arquivos,
    vistas,
    mutacao: mutacaoArq ? fs.readFileSync(abs(mutacaoArq), 'utf8') : null,
    rotuloMutacao: mutacaoArq ? `MUTACAO ${path.basename(mutacaoArq)}` : 'MUTACAO',
  });
  const r = rodar(corpo, 'cli');

  const depois = capturar();
  const dif = diferencas(antes, depois);
  if (dif.length) {
    console.error(`PERSISTIU (${r.ms} ms): ${dif.join(' ; ')}`);
    process.exit(1);
  }

  if (r.timeout) {
    console.error(`${r.timeout}: ensaio (${r.ms} ms) — nada concluido; repetir mais tarde (subir o teto NAO e decisao do executor)`);
    process.exit(3);
  }
  const temFail = /FAIL \(/.test(r.out);
  let smokeOk = true;
  if (r.sentinela && r.smoke50 && r.smoke50 !== 'n/a') {
    const [p, e] = r.smoke50.split('/');
    smokeOk = p === e;
  }
  if (!r.sentinela || temFail || !smokeOk) {
    console.error(`ENSAIO VERMELHO: ${!r.sentinela || temFail ? primeiraFalha(r.out) : `smoke50=${r.smoke50} (pass != esperado)`} (${r.ms} ms)`);
    process.exit(1);
  }
  console.log(
    `ENSAIO VERDE: ${arquivos.join(',') || '-'} · prefixadas=${lista(prefV)} · aplicadas=${lista(plano.aplicadas)} · ausentes=${lista(plano.ausentes)} · ${vistas ? `vistas=${plano.prefixadas.length || mutacaoArq ? 'igual' : 'vacua'} · ` : ''}smoke50=${r.smoke50} · evidencia=${r.evidencia} · ${r.ms} ms`
  );
}

module.exports = { compor, rodar, planejar, lerEstado, capturar, diferencas, sqlLeitura, primeiraFalha, versao, MIGS, SENTINELA, PREFIXO, FIM, SONDA, ROOT, APPLY };

if (require.main === module) principal();
