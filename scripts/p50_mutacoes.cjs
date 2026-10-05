#!/usr/bin/env node
'use strict';
/*
 * p50_mutacoes.cjs — prova, por execução, que cada cláusula do smoke p50 MORDE.
 *
 * Roda contra PROD pela composição do `scripts/p50_ensaio.cjs` (mesmo prefixo, mesmo sentinela,
 * mesma via `p46apply.cjs run`). TODA requisição termina em `RAISE EXCEPTION
 * 'ENSAIO_P50_TERMINOU …'` (ou num `P50C FAIL` antes dele): o endpoint executa o corpo inteiro
 * numa transação, então nada persiste. O modo é o PADRÃO do ensaio — prefixa as migrations p50
 * que estão no disco e fora do ledger — então o MESMO runner serve antes do apply (com
 * 20261005000001 prefixada) e depois dele (contra os objetos vivos, sem prefixo).
 *
 *   CONTROLE : prefixo + migrations faltantes + smoke + sentinela
 *              ⇒ tem de chegar ao sentinela com smoke50 = esperado, sem `FAIL (` (senão
 *                CONTROLE VERMELHO, e para ali).
 *   M1..M6   : prefixo + migrations faltantes + MUTAÇÃO (DDL avulsa) + smoke + sentinela
 *              ⇒ tem de reprovar na letra declarada e NÃO chegar ao sentinela. A mutação entra
 *                DEPOIS da migration, para que o pré e o pós-portão passem e quem morda seja o
 *                SMOKE (o portão recorrente). Cada uma declara `requer`: se a versão exigida não
 *                está aplicada nem prefixável, sai `PULADA (migration ausente)` e não conta.
 *
 * As mutações que reescrevem objetos da migration são EXTRAÍDAS dela por âncora literal única
 * (`trocar`), para não divergirem do texto que vai ao apply.
 *
 * PERSISTÊNCIA por baseline capturada NA execução (sem constante): ANTES do CONTROLE e DEPOIS do
 * laço, leitura só-leitura de (i) as linhas do ledger das quatro versões p50 (com md5 do corpo),
 * (ii) o helper (existência, md5(prosrc), ACL) e (iii) `md5(qual|with_check) || roles` de toda
 * policy cujo qual/with_check casa `created_by` ou `is_active_rh_user` (varredura por forma).
 * As duas leituras têm de ser idênticas, senão `PERSISTIU`. Funciona igual antes do apply (helper
 * ausente) e depois (helper presente).
 *
 * LOCK. Cada requisição com a migration prefixada segura `AccessExclusiveLock` em `candidaturas`
 * até abortar (o ALTER POLICY da migration e o de M2/M4/M5/M6). `lock_timeout = 3s` /
 * `statement_timeout = 5s` vêm do prefixo do ensaio. A duração de cada requisição é impressa.
 * `LOCK TIMEOUT` / `STATEMENT TIMEOUT` saem 3 SEM concluir nada sobre o portão.
 *
 * Saída final esperada: `controle verde; <n>/<n> mutacoes mordem; nada persistiu`.
 *
 * Uso: node scripts/p50_mutacoes.cjs        (sem dependências)
 */

const fs = require('fs');
const path = require('path');
const E = require('./p50_ensaio.cjs');

const MIG1 = E.MIGS[0];
const SMOKE = 'supabase/tests/p50_acesso_recrutador_smoke.sql';

function sair(msg, codigo = 1) {
  console.error(msg);
  process.exit(codigo);
}

const mig1 = fs.readFileSync(path.join(E.ROOT, MIG1), 'utf8');

/* Um trecho da migration, delimitado por um início LITERAL único e um fim literal. */
function extrair(texto, inicio, fim, rotulo) {
  const n = texto.split(inicio).length - 1;
  if (n !== 1) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} (inicio «${inicio}» ocorre ${n} vez(es))`);
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  if (b < 0) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} (fim «${fim}» nao encontrado)`);
  return texto.slice(a, b + fim.length);
}

/* Troca textual sobre uma âncora LITERAL que tem de ocorrer exatamente uma vez no trecho. */
function trocar(trecho, ancora, novo, rotulo) {
  const n = trecho.split(ancora).length - 1;
  if (n !== 1) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} («${ancora}» ocorre ${n} vez(es) no trecho)`);
  return trecho.replace(ancora, novo);
}

const fnHelper = extrair(mig1, 'CREATE FUNCTION public.is_active_rh_user()', '$helper$;', 'helper');
const polCand = extrair(mig1, 'ALTER POLICY rh_le_candidaturas ON public.candidaturas', '\n  );', 'rh_le_candidaturas');
const HELPER_NA_POLICY = ' AND (SELECT public.is_active_rh_user())';

const MUTACOES = [
  {
    id: 'M1',
    desc: 'helper sempre verdadeiro (mesmo ACL: CREATE OR REPLACE preserva)',
    letra: 'b',
    requer: ['20261005000001'],
    sql: trocar(trocar(fnHelper, 'CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', 'M1'), 'RETURN coalesce(ok, false);', 'RETURN true;', 'M1'),
  },
  {
    id: 'M2',
    desc: 'ramo rh so pelo JWT (sem o helper vivo)',
    letra: 'd',
    requer: ['20261005000001'],
    sql: trocar(polCand, HELPER_NA_POLICY, '', 'M2'),
  },
  {
    id: 'M3',
    desc: 'GRANT EXECUTE do helper a anon',
    letra: 'a',
    requer: ['20261005000001'],
    sql: 'GRANT EXECUTE ON FUNCTION public.is_active_rh_user() TO anon;',
  },
  {
    id: 'M4',
    desc: 'ramo rh de volta a posse (vagas.created_by = auth.uid()), ainda TO authenticated',
    letra: 'c',
    requer: ['20261005000001'],
    sql:
      trocar(
        polCand,
        '(SELECT public.is_active_rh_user())',
        '(vaga_id IN (SELECT vagas.id FROM public.vagas WHERE vagas.created_by = (SELECT auth.uid())))',
        'M4'
      ),
  },
  {
    id: 'M5',
    desc: 'policy de volta a TO public',
    letra: 'f',
    requer: ['20261005000001'],
    sql: 'ALTER POLICY rh_le_candidaturas ON public.candidaturas TO public;',
  },
  {
    id: 'M6',
    desc: "disjunto do administrador alterado (= ANY (ARRAY['administrador']))",
    letra: 'e',
    requer: ['20261005000001'],
    sql: trocar(polCand, "= 'administrador')", "= ANY (ARRAY['administrador']))", 'M6'),
  },
];

/* Impressão digital do que nenhum ensaio pode mudar (baseline capturada NA execução). */
function capturar() {
  const vs = E.MIGS.map(E.versao).map((v) => `'${v}'`).join(',');
  const q =
    'set transaction read only; select ' +
    `(select coalesce(json_agg(json_build_object('v', version, 'md5', md5(coalesce(statements[1], ''))) order by version), '[]'::json) from supabase_migrations.schema_migrations where version in (${vs})) as ledger, ` +
    "(select json_build_object('sig', p.oid::regprocedure::text, 'src', md5(p.prosrc), 'acl', p.proacl::text, 'secdef', p.prosecdef, 'conf', p.proconfig::text) from pg_catalog.pg_proc p where p.oid = to_regprocedure('public.is_active_rh_user()')) as helper, " +
    "(select coalesce(json_agg(json_build_object('p', schemaname || '.' || tablename || '.' || policyname, 'f', md5(coalesce(qual, '') || '|' || coalesce(with_check, '')) || roles::text) order by schemaname, tablename, policyname), '[]'::json) from pg_catalog.pg_policies where (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~* '(created_by|is_active_rh_user)') as politicas";
  return E.sqlLeitura(q)[0];
}

function falha(out) {
  const m = out.match(/P50C FAIL \(([^)]+)\)(?::\s*\[([^\]]*)\])?/);
  if (!m) return null;
  return { letra: m[1], rotulos: m[2] ? m[2].split(',').filter(Boolean) : [] };
}

function rodarOuSair(corpo, rodada) {
  const r = E.rodar(corpo, `mut_${rodada}`);
  if (r.timeout) sair(`${r.timeout}: ${rodada} (${r.ms} ms) — nada concluido sobre o portao; repetir mais tarde (subir o teto NAO e decisao do executor)`, 3);
  return r;
}

// ── baseline de persistência + plano ───────────────────────────────────────
const antes = capturar();
const plano = E.planejar('padrao', [], E.lerEstado());
const disponiveis = new Set([...plano.aplicadas, ...plano.prefixadas.map(E.versao)]);
console.log(
  `modo: prefixadas=[${plano.prefixadas.map(E.versao).join(',')}] aplicadas=[${plano.aplicadas.join(',')}] ausentes=[${plano.ausentes.join(',')}]`
);
console.log(`baseline: helper=${antes.helper ? 'presente' : 'ausente'} ledger=${antes.ledger.length} politicas(forma)=${antes.politicas.length}`);

// ── CONTROLE ────────────────────────────────────────────────────────────────
const ctl = rodarOuSair(E.compor({ prefixadas: plano.prefixadas, arquivos: [SMOKE] }), 'CONTROLE');
const ctlFalha = falha(ctl.out);
const ctlSmoke = ctl.smoke50 && ctl.smoke50 !== 'n/a' ? ctl.smoke50.split('/') : null;
if (ctlFalha || !ctl.sentinela || !ctlSmoke || ctlSmoke[0] !== ctlSmoke[1]) {
  console.error(E.primeiraFalha(ctl.out));
  sair(`CONTROLE VERMELHO (${ctl.ms} ms): ${ctlFalha ? `P50C FAIL (${ctlFalha.letra})` : !ctl.sentinela ? 'sentinela ausente' : `smoke50=${ctl.smoke50}`}`);
}
console.log(`CONTROLE verde — sentinela alcancado, smoke50=${ctl.smoke50}, nenhum P50C FAIL (${ctl.ms} ms)`);

// ── MUTAÇÕES ────────────────────────────────────────────────────────────────
let mordem = 0;
let contadas = 0;
let seguidasSemMorder = 0;
const naoMordem = [];
for (const m of MUTACOES) {
  const falta = m.requer.filter((v) => !disponiveis.has(v));
  if (falta.length) {
    console.log(`PULADA (migration ausente): ${m.id} (${m.desc}) — requer ${falta.join(',')}`);
    continue;
  }
  contadas += 1;
  const r = rodarOuSair(E.compor({ prefixadas: plano.prefixadas, arquivos: [SMOKE], mutacao: m.sql, rotuloMutacao: `MUTACAO ${m.id}` }), m.id);
  const f = falha(r.out);
  let motivo = null;
  if (r.sentinela) motivo = `chegou ao sentinela (smoke50=${r.smoke50})`;
  else if (!f) motivo = `sem P50C FAIL (${E.primeiraFalha(r.out).slice(0, 300)})`;
  else if (f.letra !== m.letra) motivo = `reprovou em (${f.letra}), esperado (${m.letra})`;
  else if (f.rotulos.some((x) => x.startsWith('c_'))) motivo = `controle vacuo [${f.rotulos.join(',')}]`;

  const lista = f && f.rotulos.length ? ` [${f.rotulos.join(',')}]` : '';
  if (motivo) {
    console.log(`NAO MORDE: ${m.id} (${m.desc}) — ${motivo} (${r.ms} ms)`);
    naoMordem.push(m.id);
    seguidasSemMorder += 1;
    if (seguidasSemMorder >= 2) sair('SUSPEITA DE INSTRUMENTO: duas mutacoes seguidas nao mordem — medir o harness antes de concluir qualquer coisa sobre o portao (PATTERNS §L)');
  } else {
    mordem += 1;
    seguidasSemMorder = 0;
    console.log(`${m.id} morde: ${m.desc} -> P50C FAIL (${f.letra})${lista} (${r.ms} ms)`);
  }
}

// ── NADA PERSISTIU ──────────────────────────────────────────────────────────
const depois = capturar();
if (JSON.stringify(antes) !== JSON.stringify(depois)) {
  sair(`PERSISTIU: antes=${JSON.stringify(antes)} depois=${JSON.stringify(depois)}`);
}
console.log(`leitura so-leitura igual a baseline: helper=${depois.helper ? 'presente' : 'ausente'} ledger=${JSON.stringify(depois.ledger)} politicas(forma)=${depois.politicas.length}`);

if (naoMordem.length) sair(`NAO MORDE: ${naoMordem.join(', ')}`);
if (contadas === 0) sair('NENHUMA MUTACAO RODOU: todas puladas — nada provado');
console.log(`controle verde; ${mordem}/${contadas} mutacoes mordem; nada persistiu`);
