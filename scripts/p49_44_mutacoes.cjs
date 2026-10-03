#!/usr/bin/env node
'use strict';
/*
 * p49_44_mutacoes.cjs — prova, por execução, que cada portão novo do 49-44 MORDE.
 *
 * Roda contra PROD pela via do projeto (`p46apply.cjs run`), e TODA requisição termina em
 * `RAISE EXCEPTION 'ENSAIO_P49_44_TERMINOU'` (ou num `P49C FAIL` antes dele): o endpoint executa o
 * corpo inteiro numa transação, então nada persiste. No fim, uma leitura só-leitura confere que
 * nem as funções, nem as políticas, nem a linha do ledger existem (`PERSISTIU`).
 *
 *   CONTROLE : lock_timeout + statement_timeout + migration + smoke + sentinela
 *              ⇒ tem de chegar ao sentinela, sem `P49C FAIL` (senão CONTROLE VERMELHO, para ali).
 *   M1..M8   : lock_timeout + statement_timeout + migration INTACTA + MUTAÇÃO + smoke + sentinela
 *              ⇒ tem de reprovar na letra esperada (e, em (g), com o rótulo esperado na lista) e
 *              NÃO chegar ao sentinela. A mutação entra DEPOIS da migration, para que o pré e o
 *              pós-portão passem e quem morda seja o SMOKE (o portão recorrente).
 *
 * LOCK. Cada requisição segura `AccessExclusiveLock` em `respostas_avaliacao` até abortar (os
 * CREATE POLICY da migration; o DROP POLICY de M6–M8). `lock_timeout = 3s` limita a ESPERA na
 * fila; `statement_timeout = 5s` limita cada INSTRUÇÃO com o lock seguro — abaixo dos 8 s de
 * `statement_timeout` de `authenticated` medidos em PROD (um autosave que espera mais que isso
 * falha). A duração de cada requisição é impressa. `LOCK TIMEOUT` / `STATEMENT TIMEOUT` saem 1
 * SEM concluir nada sobre o portão; subir o teto não é decisão do executor.
 *
 * Uso: node scripts/p49_44_mutacoes.cjs        (sem dependências; git/p46apply por execFileSync)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MIG = 'supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql';
const SMOKE = 'supabase/tests/p49_44_resposta_caso_aberto_smoke.sql';
const APPLY = path.join(ROOT, 'p46apply.cjs');
const SENTINELA = 'ENSAIO_P49_44_TERMINOU';
const PREFIXO = "SET LOCAL lock_timeout = '3s';\nSET LOCAL statement_timeout = '5s';\n";
const FIM = `\nDO $ens$ BEGIN RAISE EXCEPTION '${SENTINELA}'; END $ens$;\n`;

function sair(msg) {
  console.error(msg);
  process.exit(1);
}

const mig = fs.readFileSync(path.join(ROOT, MIG), 'utf8');
const smoke = fs.readFileSync(path.join(ROOT, SMOKE), 'utf8');

/* Um trecho do arquivo, delimitado por um início LITERAL único e um fim literal. */
function extrair(inicio, fim, rotulo) {
  const n = mig.split(inicio).length - 1;
  if (n !== 1) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} (inicio «${inicio}» ocorre ${n} vez(es) na migration)`);
  const a = mig.indexOf(inicio);
  const b = mig.indexOf(fim, a);
  if (b < 0) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} (fim «${fim}» nao encontrado)`);
  return mig.slice(a, b + fim.length);
}

/* Troca textual sobre uma âncora LITERAL que tem de ocorrer exatamente uma vez no trecho. */
function trocar(trecho, ancora, novo, rotulo) {
  const n = trecho.split(ancora).length - 1;
  if (n !== 1) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} («${ancora}» ocorre ${n} vez(es) no trecho)`);
  return trecho.replace(ancora, novo);
}

const fnLer = extrair('CREATE OR REPLACE FUNCTION public.ler_resposta_caso_aberto_sjt(', '$ler$;', 'RPC');
const fnHelper = extrair('CREATE OR REPLACE FUNCTION public.caso_aberto_sjt_enviado(', '$enviado$;', 'helper');
const pol = (nome) => extrair(`CREATE POLICY ${nome} ON`, ';', nome);
const semRestrictive = (nome, rotulo) =>
  `DROP POLICY ${nome} ON public.respostas_avaliacao;\n` + trocar(pol(nome), 'AS RESTRICTIVE', '', rotulo);

const MUTACOES = [
  {
    id: 'M1',
    desc: 'RPC sem a condicao de posse do rh',
    letra: 'd',
    sql: trocar(fnLer, ' OR v_dono IS DISTINCT FROM v_uid', '', 'M1'),
  },
  {
    id: 'M2',
    desc: 'RPC sem a guarda de papel inteira',
    letra: 'd',
    sql: trocar(fnLer, "IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN", 'IF false THEN', 'M2'),
  },
  {
    id: 'M3',
    desc: 'RPC sem a condicao de envio (devolve o rascunho)',
    letra: 'e',
    sql: trocar(fnLer, 'IF NOT EXISTS (', 'IF false AND NOT EXISTS (', 'M3'),
  },
  {
    id: 'M4',
    desc: 'helper caso_aberto_sjt_enviado sempre falso',
    letra: 'g',
    rotulo: 'upsert',
    sql: trocar(fnHelper, 'RETURN EXISTS (', 'RETURN false AND EXISTS (', 'M4'),
  },
  {
    id: 'M5',
    desc: 'GRANT EXECUTE da RPC a anon',
    letra: 'a',
    sql: 'GRANT EXECUTE ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) TO anon;',
  },
  { id: 'M6', desc: 'cand_congela_caso_aberto_ins sem AS RESTRICTIVE', letra: 'g', rotulo: 'g_ins', sql: semRestrictive('cand_congela_caso_aberto_ins', 'M6') },
  { id: 'M7', desc: 'cand_congela_caso_aberto_upd sem AS RESTRICTIVE', letra: 'g', rotulo: 'upd', sql: semRestrictive('cand_congela_caso_aberto_upd', 'M7') },
  { id: 'M8', desc: 'cand_congela_caso_aberto_del sem AS RESTRICTIVE', letra: 'g', rotulo: 'del', sql: semRestrictive('cand_congela_caso_aberto_del', 'M8') },
];

function rodar(rodada, mutacao) {
  const corpo = PREFIXO + mig + '\n' + (mutacao ? `\n-- MUTACAO ${rodada}\n${mutacao}\n` : '') + '\n' + smoke + FIM;
  const arq = path.join(os.tmpdir(), `p49_44_${rodada}.sql`);
  fs.writeFileSync(arq, corpo, 'utf8');
  const t0 = Date.now();
  let out;
  try {
    out = execFileSync('node', [APPLY, 'run', arq], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = `${e.stdout || ''}${e.stderr || ''}`;
  }
  const ms = Date.now() - t0;
  if (/\b55P03\b|lock timeout/i.test(out)) sair(`LOCK TIMEOUT: ${rodada} (${ms} ms) — nada concluido sobre o portao; repetir mais tarde`);
  if (/\b57014\b|statement timeout/i.test(out)) sair(`STATEMENT TIMEOUT: ${rodada} (${ms} ms) — nada concluido sobre o portao; subir o teto NAO e decisao do executor`);
  return { out, ms };
}

function falha(out) {
  const m = out.match(/P49C FAIL \(([^)]+)\)(?::\s*\[([^\]]*)\])?/);
  if (!m) return null;
  return { letra: m[1], rotulos: m[2] ? m[2].split(',').filter(Boolean) : [] };
}

// ── CONTROLE ────────────────────────────────────────────────────────────────
const ctl = rodar('CONTROLE', null);
const ctlFalha = falha(ctl.out);
if (ctlFalha || !ctl.out.includes(SENTINELA)) {
  console.error(ctl.out.split('\n').slice(-6).join('\n'));
  sair(`CONTROLE VERMELHO (${ctl.ms} ms): ${ctlFalha ? `P49C FAIL (${ctlFalha.letra})` : 'sentinela ausente'}`);
}
console.log(`CONTROLE verde — sentinela alcancado, nenhum P49C FAIL (${ctl.ms} ms)`);

// ── MUTAÇÕES ────────────────────────────────────────────────────────────────
let mordem = 0;
let seguidasSemMorder = 0;
const naoMordem = [];
for (const m of MUTACOES) {
  const r = rodar(m.id, m.sql);
  const f = falha(r.out);
  let motivo = null;
  if (r.out.includes(SENTINELA)) motivo = 'chegou ao sentinela';
  else if (!f) motivo = `sem P49C FAIL (saida: ${r.out.trim().split('\n').slice(-2).join(' | ').slice(0, 300)})`;
  else if (f.letra !== m.letra) motivo = `reprovou em (${f.letra}), esperado (${m.letra})`;
  else if (f.rotulos.some((x) => x.startsWith('c_'))) motivo = `controle vacuo [${f.rotulos.join(',')}]`;
  else if (m.rotulo && !f.rotulos.includes(m.rotulo)) motivo = `rotulo ${m.rotulo} ausente de [${f.rotulos.join(',')}]`;

  const lista = f && f.rotulos.length ? ` [${f.rotulos.join(',')}]` : '';
  if (motivo) {
    console.log(`NAO MORDE: ${m.id} (${m.desc}) — ${motivo} (${r.ms} ms)`);
    naoMordem.push(m.id);
    seguidasSemMorder += 1;
    if (seguidasSemMorder >= 2) sair('SUSPEITA DE INSTRUMENTO: duas mutacoes seguidas nao mordem — medir o harness antes de concluir qualquer coisa sobre o portao (PATTERNS §L)');
  } else {
    mordem += 1;
    seguidasSemMorder = 0;
    console.log(`${m.id} morde: ${m.desc} -> P49C FAIL (${f.letra})${lista} (${r.ms} ms)`);
  }
}

// ── NADA PERSISTIU ──────────────────────────────────────────────────────────
const q =
  "set transaction read only; select to_regprocedure('public.ler_resposta_caso_aberto_sjt(uuid)') is null as sem_rpc, " +
  "to_regprocedure('public.caso_aberto_sjt_enviado(uuid)') is null as sem_helper, " +
  "(select count(*) from pg_policies where schemaname = 'public' and tablename = 'respostas_avaliacao' and policyname like 'cand_congela_caso_aberto_%') as politicas, " +
  "(select count(*) from supabase_migrations.schema_migrations where version = '20261003000001') as ledger";
const s = execFileSync('node', [APPLY, 'sql', q], { cwd: ROOT, encoding: 'utf8' });
const row = JSON.parse(s.slice(s.indexOf('[')))[0];
if (row.sem_rpc !== true || row.sem_helper !== true || Number(row.politicas) !== 0 || Number(row.ledger) !== 0) {
  sair(`PERSISTIU: ${JSON.stringify(row)}`);
}
console.log(`leitura so-leitura: ${JSON.stringify(row)}`);

if (naoMordem.length) sair(`NAO MORDE: ${naoMordem.join(', ')}`);
console.log(`controle verde; ${mordem}/${MUTACOES.length} mutacoes mordem; nada persistiu`);
