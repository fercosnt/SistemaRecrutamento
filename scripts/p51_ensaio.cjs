#!/usr/bin/env node
'use strict';
/*
 * p51_ensaio.cjs — ENSAIO da Onda B da Phase 51 contra PROD, numa requisição que ABORTA.
 *
 * Cópia adaptada de `scripts/p50_ensaio.cjs` (mesmo contrato de CLI, mesmas garantias, mesmos
 * códigos de saída 0/1/3). Serve a TODA a Onda B: 51-06 (chave `raven`), 51-08 (registro do
 * pedido de revisão), 51-10 (fila/KPI/prazo), 51-13 (motor), e ao portão do 51-16.
 *
 * O QUE GARANTE QUE NADA PERSISTE. O endpoint da Management API roda o corpo INTEIRO da
 * requisição numa única transação (CLAUDE.md §«Via de apply ATUAL», propriedade 1 — medido em
 * 2026-08-22: `CREATE TABLE; SELECT 1/0;` deixou a tabela inexistente). Este programa compõe
 *
 *     PREFIXO (REPEATABLE READ + SET LOCAL lock_timeout/statement_timeout + marcas p51.tx E p50.tx
 *              + reset das GUCs de evidência e dos pares de smoke)
 *   + [depois de CADA parte abaixo: guarda de transação `ponto()`]
 *   + [--vistas: sonda de vistas externas ANTES]
 *   + migrations p51 ainda fora do ledger (ou as pedidas por --migracoes=, ou nenhuma)
 *   + [mutação avulsa — `--mutacao=x.sql` ou `p51_mutacoes.cjs`]
 *   + [--vistas: sonda DEPOIS + comparação]
 *   + cada arquivo SQL dado (smokes)
 *   + DO $ens$ … RAISE EXCEPTION 'ENSAIO_P51_TERMINOU smokes=[<k>=<p>/<e>,…] fechou=<…> evidencia=<…>'
 *
 * e manda por `node p46apply.cjs run` (o corpo vem do DISCO, byte a byte). O sentinela no fim
 * aborta a transação: a migration, a linha de ledger (que o `run` nem escreve) e qualquer escrita
 * de smoke voltam. Antes e depois de TODA execução, `capturar()` lê (só leitura) o que nenhum
 * ensaio pode mudar — ver o comentário dela. Qualquer diferença é `PERSISTIU: <chave>: antes ->
 * depois`, saída 1.
 *
 * A PREMISSA «uma requisição = uma transação» vale só se nenhuma parte composta a encerrar (WR-02
 * do 50-REVIEW-TRACER-2). Duas guardas, herdadas do p50:
 *   1. PREVENTIVA — `compor` recusa (`P51E RECUSADO (transacao)`, nada enviado) toda parte com
 *      BEGIN/START TRANSACTION/COMMIT/END/ROLLBACK/ABORT/SAVEPOINT/RELEASE/PREPARE TRANSACTION
 *      no nível de topo (o analisador `terminadores` é o do p50, reusado por require);
 *   2. ESTRUTURAL — o PREFIXO grava o txid numa GUC LOCAL; depois de CADA parte e no FIM, antes do
 *      sentinela, um bloco exige GUC = `txid_current()`, senão `P51E FAIL (transacao)`.
 *
 * POR QUE AS DUAS MARCAS. Os smokes novos da fase (p51_*) recusam rodar fora do ensaio pela marca
 * `p51.tx`; os smokes LEGADOS que a Onda B re-roda (p50_acesso_recrutador, p49_44 e afins)
 * recusam pela marca `p50.tx` (bloco `$p50_so_ensaio$`). O PREFIXO grava as duas com o MESMO txid,
 * então qualquer um deles roda aqui e nenhum roda por `p46apply.cjs run` (que COMMITA).
 *
 * Como a Management API não devolve NOTICE, os PÓS-PORTÕES p51 ANEXAM o que mediram à GUC de
 * sessão `p51.evidencia`; o sentinela a carrega para fora na mensagem do erro, e a linha de
 * veredito a copia. Os smokes publicam o par `smoke<k>.pass`/`smoke<k>.esperado`; o sentinela
 * reporta `smokes=[<k>=<p>/<e>,…]` SÓ para os pares em que alguma das duas GUCs foi definida
 * (k ∈ 50, 51a, 51b). Verde exige todo par reportado com pass = esperado.
 *
 * LOCK. Cada ensaio com migration segura o lock que ela toma até abortar. `lock_timeout = 3s`
 * limita a ESPERA na fila; `statement_timeout = 5s` limita cada INSTRUÇÃO — abaixo dos 8 s de
 * `statement_timeout` de `authenticated`/`authenticator` medidos em PROD. A duração é impressa.
 * `LOCK TIMEOUT` / `STATEMENT TIMEOUT` saem com código 3 SEM concluir nada; subir o teto não é
 * decisão do executor.
 *
 * SERIALIZAÇÃO (40001). REPEATABLE READ; um UPDATE de smoke numa linha commitada por outra
 * transação depois do snapshot dá 40001 — movido por TRÁFEGO, não pelo que o ensaio prova.
 * `classificarSaida()` (do p50) o separa ANTES de qualquer leitura de FAIL: a requisição é
 * repetida UMA vez; um segundo 40001 sai `INCONCLUSIVO — SERIALIZACAO (40001)`, código 3.
 *
 * Uso:
 *   node scripts/p51_ensaio.cjs [--migracoes=a.sql,b.sql | --sem-migracoes] [--vistas] [--mutacao=x.sql] <arquivo.sql…>
 *     (padrão)          prefixa toda migration de MIGS que exista no disco e NÃO esteja no ledger
 *     --migracoes=a,b   prefixa exatamente essas (cada uma tem de existir e estar fora do ledger)
 *     --sem-migracoes   não prefixa nenhuma (smoke contra os objetos VIVOS)
 *     --vistas          sonda `supabase/tests/p50_vistas_externas.sql` (sem mudança; GUC
 *                       `p50.vistas`) antes e depois das migrations, na mesma transação;
 *                       reprova com `P51V FAIL (vistas)`
 *     --mutacao=x.sql   insere o arquivo DEPOIS das migrations e ANTES da sonda «depois»
 *
 * Saída (uma linha):
 *   ENSAIO VERDE: <arquivos> · prefixadas=[…] · aplicadas=[…] · ausentes=[…] · [vistas=igual[+fechou[…]]|vacua · ]
 *                 smokes=[…] · evidencia=<…> · <ms> ms                                       (exit 0)
 *   ENSAIO VERMELHO: <primeira linha FAIL/ERROR>                                             (exit 1)
 *   ENSAIO VERMELHO: P51E RECUSADO (transacao): … (nada enviado)                             (exit 1)
 *   LOCK TIMEOUT / STATEMENT TIMEOUT                                                         (exit 3)
 *   INCONCLUSIVO — SERIALIZACAO (40001) duas vezes seguidas: …                               (exit 3)
 *   PERSISTIU: …                                                                             (exit 1)
 *
 * Sem dependências (git/p46apply por execFileSync). Como módulo:
 *   { compor, rodar, capturar, diferencas, planejar, versao, MIGS, SENTINELA, PREFIXO, FIM, ROOT, … }
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const P50 = require('./p50_ensaio.cjs');

const ROOT = path.resolve(__dirname, '..');
const APPLY = path.join(ROOT, 'p46apply.cjs');
const SENTINELA = 'ENSAIO_P51_TERMINOU';

/* Ordem de aplicação das migrations da Onda B (versões fixadas no planejamento, 51-06). As que
 * ainda não existem no disco simplesmente não são prefixadas (`ausentes=`). */
const MIGS = [
  'supabase/migrations/20261008000001_p51_raven_em_avaliacao_status.sql',
  'supabase/migrations/20261008000002_p51_revisao_rejeicao.sql',
  'supabase/migrations/20261008000003_p51_fila_tres_origens.sql',
  'supabase/migrations/20261008000004_p51_motor_revisao_rejeicao.sql',
];

/* Pares de smoke que o sentinela conhece: <chave no relatório> -> prefixo das GUCs. */
const PARES = [
  ['50', 'smoke50'],
  ['51a', 'smoke51a'],
  ['51b', 'smoke51b'],
];

const PREFIXO =
  // UM snapshot para a requisição inteira (WR-03 do 50-REVIEW-TRACER-2): tem de ser a PRIMEIRA
  // instrução. Em RR, um UPDATE numa linha que mudou depois do snapshot dá 40001 — INCONCLUSIVO.
  'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;\n' +
  "SET LOCAL lock_timeout = '3s';\n" +
  "SET LOCAL statement_timeout = '5s';\n" +
  // As DUAS marcas, LOCAIS, com o mesmo txid: p51.tx (smokes p51) e p50.tx (smokes legados p50/49).
  "SELECT set_config('p51.tx', txid_current()::text, true), set_config('p50.tx', txid_current()::text, true);\n" +
  // Uma conexão do pool pode trazer GUCs de sessão de uma execução anterior que COMMITOU: zera as
  // que o veredito lê, para não herdar número alheio.
  "SELECT set_config('smoke50.pass', '', false), set_config('smoke50.esperado', '', false),\n" +
  "       set_config('smoke51a.pass', '', false), set_config('smoke51a.esperado', '', false),\n" +
  "       set_config('smoke51b.pass', '', false), set_config('smoke51b.esperado', '', false),\n" +
  "       set_config('p51.evidencia', '', false), set_config('p50.evidencia', '', false),\n" +
  "       set_config('p50.vistas', '', false), set_config('p50.vistas_antes', '', false),\n" +
  "       set_config('p50.vistas_fechou', '', false);\n" +
  // Um SET TRANSACTION ignorado (aviso, não erro) deixaria o ensaio em READ COMMITTED calado.
  'DO $p51iso$\n' +
  'BEGIN\n' +
  "  IF current_setting('transaction_isolation') <> 'repeatable read' THEN\n" +
  "    RAISE EXCEPTION 'P51E FAIL (isolamento): a requisicao roda em % — sem snapshot unico o antes x depois tem janela de trafego', current_setting('transaction_isolation');\n" +
  '  END IF;\n' +
  'END\n' +
  '$p51iso$;\n';

/* Condição SQL «a transação da requisição ainda é a que o PREFIXO marcou». */
const MESMA_TX = "coalesce(current_setting('p51.tx', true), '') = txid_current()::text";

/* Guarda de transação depois de uma parte do corpo. */
function ponto(rotulo) {
  const r = String(rotulo).replace(/[^A-Za-z0-9_. -]/g, '_');
  return (
    '\nRESET ROLE;\n' +
    'DO $p51tx$\n' +
    'BEGIN\n' +
    `  IF NOT (${MESMA_TX}) THEN\n` +
    `    RAISE EXCEPTION 'P51E FAIL (transacao): a transacao da requisicao terminou dentro de ${r} — o que veio antes PERSISTIU; o ensaio parou aqui';\n` +
    '  END IF;\n' +
    'END\n' +
    '$p51tx$;\n'
  );
}

const FIM =
  '\nRESET ROLE;\n' +
  'DO $ens$\n' +
  'DECLARE\n' +
  "  v_s text := '';\n" +
  '  v_p text;\n' +
  '  v_e text;\n' +
  '  k   text[];\n' +
  'BEGIN\n' +
  `  IF NOT (${MESMA_TX}) THEN\n` +
  "    RAISE EXCEPTION 'P51E FAIL (transacao): o corpo commitou no meio — algo PERSISTIU antes deste ponto';\n" +
  '  END IF;\n' +
  `  FOREACH k SLICE 1 IN ARRAY ARRAY[${PARES.map(([c, g]) => `['${c}', '${g}']`).join(', ')}] LOOP\n` +
  "    v_p := coalesce(current_setting(k[2] || '.pass', true), '');\n" +
  "    v_e := coalesce(current_setting(k[2] || '.esperado', true), '');\n" +
  "    IF v_p <> '' OR v_e <> '' THEN\n" +
  "      v_s := v_s || CASE WHEN v_s = '' THEN '' ELSE ',' END || k[1] || '=' || coalesce(nullif(v_p, ''), 'n/a') || '/' || coalesce(nullif(v_e, ''), 'n/a');\n" +
  '    END IF;\n' +
  '  END LOOP;\n' +
  "  RAISE EXCEPTION '% smokes=[%] fechou=% evidencia=%', '" + SENTINELA + "', v_s,\n" +
  "    coalesce(nullif(current_setting('p50.vistas_fechou', true), ''), '-'),\n" +
  "    coalesce(nullif(btrim(current_setting('p51.evidencia', true)), ''), '-');\n" +
  'END\n' +
  '$ens$;\n';

/*
 * Sonda de vistas: o arquivo do p50 SEM mudança (GUC `p50.vistas`), e a comparação do p50 com o
 * prefixo de reprovação trocado para P51V. A regra (inclusive o FECHAMENTO «A» do operador,
 * 50-03) está documentada no `p50_ensaio.cjs`; aqui só muda o rótulo.
 */
const SONDA = P50.SONDA;
const GUARDA_ANTES = P50.GUARDA_ANTES;
const COMPARA = P50.COMPARA.split('P50V FAIL (vistas)').join('P51V FAIL (vistas)');
if (P50.COMPARA.split('P50V FAIL (vistas)').length < 3) {
  throw new Error('p51_ensaio: a comparacao de vistas do p50 mudou de forma (rotulo P50V FAIL (vistas) nao encontrado) — revisar antes de usar');
}

const RE_SENTINELA = new RegExp(SENTINELA + ' smokes=\\[([^\\]]*)\\](?: fechou=(\\S+))? evidencia=([^"\\\\]*)');

function versao(arq) {
  return path.basename(arq).slice(0, 14);
}

function abs(arq) {
  return path.isAbsolute(arq) ? arq : path.join(ROOT, arq);
}

/* Query só-leitura pela via do projeto; devolve as linhas. */
function sqlLeitura(q) {
  const s = execFileSync('node', [APPLY, 'sql', q], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(s.slice(s.indexOf('[')));
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (xs) => `ARRAY[${xs.map(lit).join(', ')}]::text[]`;

/* Estado que decide o PLANO (o que prefixar): o ledger das versões p51. */
function lerEstado() {
  const vs = MIGS.map(versao).map(lit).join(',');
  const q =
    'set transaction read only; select ' +
    `(select coalesce(json_agg(version order by version), '[]'::json) from supabase_migrations.schema_migrations where version in (${vs})) as ledger`;
  return { ledger: sqlLeitura(q)[0].ledger };
}

/*
 * Funções nomeadas POR FORMA nas migrations p51 que existem no disco (`CREATE [OR REPLACE]
 * FUNCTION public.<nome>(`) — nenhuma lista literal: a migration nova entra na vigilância por
 * existir. `get_avaliacao_status` é a do 51-06 e entra também pelo nome (o objeto vigiado desde já).
 */
function funcoesP51() {
  const nomes = new Set(['get_avaliacao_status']);
  for (const m of MIGS) {
    if (!fs.existsSync(abs(m))) continue;
    const t = fs.readFileSync(abs(m), 'utf8');
    const re = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/gi;
    let x;
    while ((x = re.exec(t))) nomes.add(x[1].toLowerCase());
  }
  return [...nomes].sort();
}

/*
 * IMPRESSÃO DIGITAL de função — a mesma expressão do `scripts/p50_desfazer.cjs` (FP_FN): `to_jsonb`
 * da linha de pg_proc INTEIRA (não envelhece quando nasce coluna nova), menos `proacl` (comparada
 * como CONJUNTO ordenado de aclexplode) e `proargdefaults`; mais argumentos, ACL e comentário.
 */
const ACL_SQL = (p) =>
  `coalesce((SELECT string_agg(x, ',' ORDER BY x) FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text || ':' || a.grantor::regrole::text AS x FROM pg_catalog.aclexplode(coalesce(${p}.proacl, pg_catalog.acldefault('f', ${p}.proowner))) a) s), '')`;
const FP_FN = (p) =>
  `md5(((to_jsonb(${p}) - 'proacl' - 'proargdefaults')::text) || '|' || pg_catalog.pg_get_function_arguments(${p}.oid) || '|' || ${ACL_SQL(p)} || '|' || coalesce(pg_catalog.obj_description(${p}.oid, 'pg_proc'), '<null>'))`;

/* md5 de um conjunto ordenado de textos; '' quando vazio. */
const MD5_SET = (expr, from) => `(SELECT md5(coalesce(string_agg(x, E'\\n' ORDER BY x), '')) FROM (SELECT ${expr} AS x ${from}) s)`;

/*
 * Impressão digital do que NENHUM ensaio pode mudar — baseline capturada NA execução, sem
 * constante; leitura só-leitura com `search_path = ''`. Usada pelo CLI deste arquivo E por
 * `p51_mutacoes.cjs` (o mesmo critério nos dois runners). Cobre:
 *   ledger         as linhas das quatro versões p51, com md5(statements[1]);
 *   revisao        `to_regclass('public.revisao_rejeicao')` e, quando ela existir, relacl,
 *                  relrowsecurity/relforcerowsecurity, constraints (conname + def), índices,
 *                  policies (`to_jsonb` da linha de pg_policies) e triggers não internos — cada
 *                  conjunto ordenado e resumido por md5 (MB4/MB6/MB7 do 51-08 e MD2 do 51-13 mexem
 *                  nesses objetos; no pós-apply do 51-16 a tabela é viva: um GRANT ou um DROP
 *                  CONSTRAINT que escapasse do aborto tem de sair PERSISTIU);
 *   funcoes        FP_FN de `public.get_avaliacao_status(uuid)` e de TODA sobrecarga das funções
 *                  nomeadas por forma nas migrations p51 do disco;
 *   mutacoes       as funções `public.p51_mutacao_%` (tem de ser vazia);
 *   fixtures       titulares sintéticos dos smokes p51 (`p51%smoke-%@invalido.local`) em
 *                  auth.users e candidatos — o que um envelope de smoke que não revertesse deixaria.
 */
function capturar() {
  const vs = MIGS.map(versao).map(lit).join(',');
  const RR = "pg_catalog.to_regclass('public.revisao_rejeicao')";
  const q =
    "set transaction read only; set local search_path = ''; select " +
    `(select coalesce(json_agg(json_build_object('v', version, 'md5', md5(coalesce(statements[1], ''))) order by version), '[]'::json) from supabase_migrations.schema_migrations where version in (${vs})) as ledger, ` +
    'json_build_object(' +
    `'existe', ${RR}::text, ` +
    `'relacl', (select coalesce(c.relacl::text, '<null>') from pg_catalog.pg_class c where c.oid = ${RR}), ` +
    `'rls', (select c.relrowsecurity::text || '/' || c.relforcerowsecurity::text from pg_catalog.pg_class c where c.oid = ${RR}), ` +
    `'constraints', ${MD5_SET("co.conname || ' ' || pg_catalog.pg_get_constraintdef(co.oid)", `FROM pg_catalog.pg_constraint co WHERE co.conrelid = ${RR}`)}, ` +
    `'indices', ${MD5_SET('pg_catalog.pg_get_indexdef(i.indexrelid)', `FROM pg_catalog.pg_index i WHERE i.indrelid = ${RR}`)}, ` +
    `'policies', ${MD5_SET('to_jsonb(pp)::text', "FROM pg_catalog.pg_policies pp WHERE pp.schemaname = 'public' AND pp.tablename = 'revisao_rejeicao'")}, ` +
    `'triggers', ${MD5_SET("t.tgname || ' ' || pg_catalog.pg_get_triggerdef(t.oid)", `FROM pg_catalog.pg_trigger t WHERE t.tgrelid = ${RR} AND NOT t.tgisinternal`)}` +
    ') as revisao, ' +
    `(select coalesce(json_object_agg(p.oid::pg_catalog.regprocedure::text, ${FP_FN('p')} order by p.oid::pg_catalog.regprocedure::text), '{}'::json) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = any (${arr(funcoesP51())})) as funcoes, ` +
    "(select coalesce(json_agg(p.oid::pg_catalog.regprocedure::text order by p.oid::pg_catalog.regprocedure::text), '[]'::json) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'p51\\_mutacao\\_%') as mutacoes, " +
    "json_build_object('users', (select count(*) from auth.users u where u.email like 'p51%smoke-%@invalido.local'), 'candidatos', (select count(*) from public.candidatos c where c.email like 'p51%smoke-%@invalido.local')) as fixtures";
  return sqlLeitura(q)[0];
}

/* As chaves (achatadas) em que duas capturas diferem — para o PERSISTIU dizer O QUE mudou. */
const diferencas = P50.diferencas;

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

/* Recusa ALTO uma parte com terminador de transação no nível de topo — antes de enviar nada. */
function recusarTerminadores(texto, rotulo) {
  let of;
  try {
    of = P50.terminadores(texto);
  } catch (e) {
    throw new Error(`P51E RECUSADO (transacao): ${rotulo} nao pode ser lido para a guarda de transacao (${e.message})`);
  }
  if (of.length) {
    throw new Error(
      `P51E RECUSADO (transacao): ${rotulo} tem instrucao de controle de transacao no nivel de topo [${of.join(' | ')}] — num ensaio ela COMMITARIA o que veio antes e rodaria o resto fora da transacao que aborta`
    );
  }
}

/* Compõe o corpo do ensaio. Lança `P51E RECUSADO (transacao)` sem enviar nada. */
function compor({ prefixadas = [], arquivos = [], mutacao = null, rotuloMutacao = 'MUTACAO', vistas = false } = {}) {
  const partes = [PREFIXO];
  const parte = (rotulo, texto) => {
    recusarTerminadores(texto, rotulo);
    return texto;
  };
  const sonda = vistas ? parte(`SONDA ${path.basename(SONDA)}`, fs.readFileSync(abs(SONDA), 'utf8')) : null;
  if (vistas) partes.push('\n-- ═══ SONDA DE VISTAS (ANTES) ═══\nRESET ROLE;\n' + sonda + GUARDA_ANTES + ponto('SONDA ANTES'));
  for (const m of prefixadas) {
    const rot = `MIGRATION ${path.basename(m)}`;
    partes.push(`\n-- ═══ ${rot} ═══\n` + parte(rot, fs.readFileSync(abs(m), 'utf8')) + ponto(rot));
  }
  if (mutacao) partes.push(`\n-- ═══ ${rotuloMutacao} ═══\nRESET ROLE;\n${parte(rotuloMutacao, mutacao)}\n` + ponto(rotuloMutacao));
  if (vistas) partes.push('\n-- ═══ SONDA DE VISTAS (DEPOIS) ═══\nRESET ROLE;\n' + sonda + COMPARA + ponto('SONDA DEPOIS'));
  for (const a of arquivos) {
    const rot = `ARQUIVO ${path.basename(a)}`;
    partes.push(`\n-- ═══ ${rot} ═══\nRESET ROLE;\n` + parte(rot, fs.readFileSync(abs(a), 'utf8')) + ponto(rot));
  }
  partes.push(FIM);
  return partes.join('\n');
}

const classificarSaida = P50.classificarSaida;

/* Roda um corpo pela via do projeto. Não sai do processo: devolve o texto e a classificação. */
function rodar(corpo, rotulo) {
  const arq = path.join(os.tmpdir(), `p51_ensaio_${String(rotulo).replace(/[^A-Za-z0-9_-]/g, '_')}_${process.pid}.sql`);
  fs.writeFileSync(arq, corpo, 'utf8');
  const t0 = Date.now();
  let out;
  try {
    out = execFileSync('node', [APPLY, 'run', arq], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    out = `${e.stdout || ''}${e.stderr || ''}`;
  }
  const ms = Date.now() - t0;
  try {
    fs.unlinkSync(arq);
  } catch {
    /* arquivo temporário: nada a fazer */
  }
  const { timeout, serializacao } = classificarSaida(out);
  const m = out.match(RE_SENTINELA);
  return {
    out,
    ms,
    timeout,
    serializacao,
    sentinela: !!m,
    smokes: m ? m[1] : null,
    fechou: m && m[2] && m[2] !== '-' ? m[2] : null,
    evidencia: m ? m[3].trim() : null,
  };
}

/* Pares `k=p/e` do texto de `smokes=[…]`. */
function lerPares(smokes) {
  return String(smokes || '')
    .split(',')
    .filter(Boolean)
    .map((x) => {
      const [k, v] = x.split('=');
      const [p, e] = String(v || '').split('/');
      return { k, p, e };
    });
}

/* Primeira linha que explica a reprovação (qualquer prefixo). */
function primeiraFalha(out) {
  const f = out.match(/([A-Z][A-Z0-9-]* FAIL \([^)]*\)[^"\\]*)/) || out.match(/([A-Z][A-Z0-9-]* RECUSADO[^"\\]*)/) || out.match(/ERROR:\s+([^"\\]*)/);
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

  let corpo;
  try {
    corpo = compor({
      prefixadas: plano.prefixadas,
      arquivos,
      vistas,
      mutacao: mutacaoArq ? fs.readFileSync(abs(mutacaoArq), 'utf8') : null,
      rotuloMutacao: mutacaoArq ? `MUTACAO ${path.basename(mutacaoArq)}` : 'MUTACAO',
    });
  } catch (e) {
    console.error(`ENSAIO VERMELHO: ${e.message} (nada enviado)`);
    process.exit(1);
  }
  const antes = capturar();
  let r = rodar(corpo, 'cli');
  if (r.serializacao) {
    console.error(`SERIALIZACAO (40001): ensaio (${r.ms} ms) — escrita concorrente numa linha que um envelope de smoke escreve, depois do snapshot da requisicao; INCONCLUSIVO (nada julgado), repetindo UMA vez`);
    r = rodar(corpo, 'cli_repeticao');
  }

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
  if (r.serializacao) {
    console.error(`INCONCLUSIVO — SERIALIZACAO (40001) duas vezes seguidas (${r.ms} ms): ${primeiraFalha(r.out)} — nada concluido (nem verde, nem vermelho de clausula); repetir mais tarde, sem laco`);
    process.exit(3);
  }
  const temFail = /FAIL \(/.test(r.out);
  const pares = r.sentinela ? lerPares(r.smokes) : [];
  const parRuim = pares.find((x) => !/^[0-9]+$/.test(x.p || '') || x.p !== x.e);
  if (!r.sentinela || temFail || parRuim) {
    console.error(`ENSAIO VERMELHO: ${!r.sentinela || temFail ? primeiraFalha(r.out) : `smokes=[${r.smokes}] (${parRuim.k}: pass != esperado)`} (${r.ms} ms)`);
    process.exit(1);
  }
  console.log(
    `ENSAIO VERDE: ${arquivos.join(',') || '-'} · prefixadas=${lista(prefV)} · aplicadas=${lista(plano.aplicadas)} · ausentes=${lista(plano.ausentes)} · ${vistas ? `vistas=${plano.prefixadas.length || mutacaoArq ? `igual${r.fechou ? `+fechou[${r.fechou}]` : ''}` : 'vacua'} · ` : ''}smokes=[${r.smokes}] · evidencia=${r.evidencia} · ${r.ms} ms`
  );
}

module.exports = {
  compor,
  rodar,
  capturar,
  diferencas,
  planejar,
  lerEstado,
  versao,
  sqlLeitura,
  primeiraFalha,
  classificarSaida,
  lerPares,
  funcoesP51,
  recusarTerminadores,
  ponto,
  MIGS,
  PARES,
  SENTINELA,
  RE_SENTINELA,
  PREFIXO,
  FIM,
  COMPARA,
  SONDA,
  ROOT,
  APPLY,
};

if (require.main === module) principal();
