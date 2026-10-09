#!/usr/bin/env node
'use strict';
/*
 * p51_portao.cjs — o portão do JORN-42: D-12 da Phase 50 (mudança de controle de acesso = review
 * bloqueante antes de toda escrita em PROD) aplicado por máquina, no MESMO comando da escrita.
 *
 *   node scripts/p51_portao.cjs --revisao <prefixo-dos-REVIEW> --base <ref> [--pin <ref>]
 *                               --plano <caminho> --modo revisao|apply|deploy|push
 *   node scripts/p51_portao.cjs --auto-teste
 *
 * Saída: `PORTAO OK: revisao=<arquivo> reviewed_head=<sha> pin=<sha|-> modo=<modo>` e código 0; em
 * todo outro caso `PORTAO RECUSADO: <motivo>` (stderr) e código 1 — inclusive erro inesperado e
 * opção desconhecida (fail-closed). O 51-16 liga a ele cada escrita por `&&`:
 *   `node scripts/p51_portao.cjs … --modo apply  && node p46apply.cjs migrate <arquivo>`
 *   `node scripts/p51_portao.cjs … --modo deploy && node efdeploy.cjs <slug>`
 *   `node scripts/p51_portao.cjs … --modo push   && … && git push origin <sha>:refs/heads/main`
 *
 * DE ONDE VEM CADA REGRA — a semântica é a das cadeias de shell do 50-02 / 50-10, sem mudança:
 *   (1) a revisão lida é o `<prefixo>-<N>.md` de MAIOR N, commitada UMA única vez em HEAD e idêntica
 *       a HEAD (nem staged, nem modificada) — WR-02 do 50-REVIEW-ACESSO-1: a de maior N é escolhida
 *       pelo diretório, e uma revisão nova ainda não commitada (rodada de conserto em andamento, ou
 *       outra janela) amarraria a escrita a um texto que ninguém registrou. Uma de maior N não
 *       commitada RECUSA; não se cai para a anterior. As de N menor também têm de estar commitadas
 *       uma única vez (o laço do verify da Task 1 do 50-10): revisão assinada não se reescreve.
 *   (2) frontmatter com `critical: 0` (exatamente uma linha `critical:` no bloco `findings:`) e
 *       `reviewed_head` / `diff_base` hexadecimais, cada um uma única vez, que resolvem a commit.
 *   (3) `diff_base` ancestral (ou igual) de `--base`: a revisão cobre a onda inteira.
 *   (4-revisao) `reviewed_head` ancestral de HEAD e nenhum código fora de `.planning/` mudou entre
 *       ele e HEAD (`git diff --quiet <reviewed_head> HEAD -- . ':!.planning'`).
 *   (4) fora do modo revisao: `--pin` obrigatório e resolve. `apply`: HEAD = pin (WR-06 do
 *       50-REVIEW-TRACER-1/2/3 — o que se aplica é o commit fixado). `deploy`/`push`: pin ancestral de
 *       HEAD e `git diff --quiet <pin> HEAD -- . ':!.planning'` — commits só de `.planning/` (SUMMARY
 *       parcial, STATE, a linha do todo) não travam o deploy com as migrations já no ar; código
 *       depois do pin, sim (WR-03 do 50-REVIEW-ACESSO-1: igualdade de CÓDIGO, não HEAD = pin).
 *   (5) fora do modo revisao: `reviewed_head` ancestral do pin e `git diff --quiet <reviewed_head>
 *       <pin> -- . ':!.planning'` — o código do pin é o código revisado.
 *   A revisão é conferida ANTES do pin: sem revisão, todo modo recusa por ela, com ou sem `--pin`.
 *
 *   modo     | (1)(2)(3) revisão | (4-revisao) | (4) pin                         | (5) pin = revisado | (6) plano | (7) árvore
 *   ---------+-------------------+-------------+---------------------------------+--------------------+-----------+-----------
 *   revisao  | sim               | sim         | `--pin` é recusado              | —                  | sim       | sim
 *   apply    | sim               | —           | obrigatório; HEAD = pin         | sim                | sim       | sim
 *   deploy   | sim               | —           | obrigatório; só .planning/ após | sim                | sim       | sim
 *   push     | sim               | —           | obrigatório; só .planning/ após | sim                | sim       | sim
 *   (6) o `--plano` (o programa que escreve em PROD) existia no `reviewed_head`, não mudou entre ele e
 *       HEAD e não está modificado na árvore — a revisão cobre o plano que vai rodar.
 *   (7) árvore limpa (rastreados, staged e não rastreados) nos caminhos que vão a PROD:
 *       supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts
 *       (`efdeploy.cjs` e `p46apply.cjs` leem do disco: árvore suja publicaria o que não foi revisado).
 *       Arquivos sujos de outras sessões FORA dessa lista (docs/specs, docs/vagas, AGENTS.md,
 *       .planning/) não recusam — o auto-teste prova isso.
 *
 * POR QUE PROGRAMA, E NÃO LINHA DE SHELL: as cadeias da Phase 50 (WR-02, WR-03, WR-06) foram
 * reescritas e re-revisadas três vezes nas rodadas do 50-REVIEW-TRACER-1..3, e cada plano que as
 * copiava podia errar de um jeito novo. Aqui elas viram uma função com auto-teste que prova, num
 * repositório temporário, o caso OK de cada modo e CADA recusa com o motivo esperado.
 *
 * O QUE ESTE PROGRAMA NUNCA FAZ: escrever no repositório real, aplicar migration, publicar Edge
 * Function, empurrar. Só lê git (`--no-optional-locks`: nem o `status` reescreve o índice). O
 * `--auto-teste` escreve só no diretório que ele mesmo cria com `fs.mkdtempSync(os.tmpdir())`, com
 * as variáveis `GIT_*` do ambiente removidas e a configuração global/sistema desligada, confere que
 * cada repositório de caso é a raiz de si mesmo antes de usá-lo, e apaga o diretório no fim
 * (inclusive em falha).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const MODOS = ['revisao', 'apply', 'deploy', 'push'];

class Recusa extends Error {}
function recusar(motivo) {
  throw new Recusa(motivo);
}

const VIGIADOS = ['supabase', 'src', 'scripts', 'e2e', 'docs/compliance', 'p46apply.cjs', 'efdeploy.cjs', 'database.types.ts'];
const FORA_PLANNING = ['.', ':(exclude).planning'];

/* Git só de leitura. `--no-optional-locks`: nem o `status` reescreve o índice (refresh de stat). */
function gitEm(cwd, env) {
  const base = ['--no-optional-locks'];
  const g = (...a) => execFileSync('git', [...base, ...a], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  g.cru = (...a) => execFileSync('git', [...base, ...a], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  // Verdadeiro SÓ com saída 0. `merge-base --is-ancestor` (1 = não é ancestral) e `diff --quiet` (1 = difere)
  // e qualquer erro do git (128) caem todos em falso — e falso, aqui, é sempre recusa (fail-closed).
  g.ok = (...a) => spawnSync('git', [...base, ...a], { cwd, env, stdio: 'ignore' }).status === 0;
  g.rev = (x) => {
    try {
      return g('rev-parse', '--verify', '-q', '--end-of-options', `${x}^{commit}`) || null;
    } catch {
      return null;
    }
  };
  g.nomes = (...a) => {
    try {
      return g('diff', '--name-only', ...a).split('\n').filter(Boolean).join(' ');
    } catch {
      return '(git diff falhou)';
    }
  };
  return g;
}

function verificar(o, cwd, env) {
  /* (0) parâmetros */
  if (!MODOS.includes(o.modo)) recusar(`MODO INVALIDO: ${o.modo} (aceitos: ${MODOS.join('|')})`);
  for (const k of ['revisao', 'base', 'plano']) if (!o[k]) recusar(`SEM PARAMETRO: --${k}`);
  if (o.modo === 'revisao' && o.pin !== undefined) recusar('PIN NO MODO revisao: o modo revisao nao confere pin; use --modo apply|deploy|push');

  const real = fs.realpathSync(cwd);
  let top;
  try {
    top = fs.realpathSync(gitEm(real, env)('rev-parse', '--show-toplevel'));
  } catch {
    recusar(`FORA DE UM REPOSITORIO GIT: ${cwd}`);
  }
  // Todo comando roda na RAIZ: o pathspec `.` de (4)/(5) é relativo ao cwd do git, e rodado de um
  // subdiretório cobriria só esse subdiretório (caso do auto-teste).
  const G = gitEm(top, env);
  const naRaiz = (p, nome) => {
    const rel = path.relative(top, path.resolve(real, p));
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) recusar(`${nome} FORA DO REPOSITORIO: ${p}`);
    return rel.split(path.sep).join('/');
  };
  const curto = (s) => s.slice(0, 8);

  /* (1) a revisão de MAIOR N existe, foi commitada UMA vez e é idêntica a HEAD (WR-02 do 50-REVIEW-ACESSO-1) */
  const pref = naRaiz(o.revisao, '--revisao');
  const dirRel = path.posix.dirname(pref);
  const baseNome = path.posix.basename(pref);
  const re = new RegExp(`^${baseNome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-([0-9]+)\\.md$`);
  let nomes = [];
  try {
    nomes = fs.readdirSync(path.join(top, dirRel));
  } catch {
    recusar(`SEM REVISAO: diretorio ${dirRel} ilegivel`);
  }
  const ns = [...new Set(nomes.map((f) => (f.match(re) || [])[1]).filter(Boolean).map(Number))].sort((a, b) => a - b);
  if (!ns.length) recusar(`SEM REVISAO: nenhum ${baseNome}-<N>.md em ${dirRel}`);
  const nMax = ns[ns.length - 1];
  const arq = `${dirRel}/${baseNome}-${nMax}.md`;
  const vezes = (f) => {
    try {
      return Number(G('rev-list', '--count', 'HEAD', '--', f));
    } catch {
      return NaN;
    }
  };
  const vMax = vezes(arq);
  if (vMax === 0 || Number.isNaN(vMax)) recusar(`REVISAO NAO COMMITADA: ${arq} nao esta em nenhum commit de HEAD (a de maior N e a que vale; nao se cai para a anterior)`);
  if (vMax !== 1) recusar(`REVISAO REESCRITA: ${arq} aparece em ${vMax} commit(s) de HEAD (exigido: 1 — cada rodada e um arquivo NOVO)`);
  for (const k of ns.slice(0, -1)) {
    const f = `${dirRel}/${baseNome}-${k}.md`;
    const v = vezes(f);
    if (v !== 1) recusar(`REVISAO ANTERIOR REESCRITA OU NAO COMMITADA: ${f} aparece em ${v} commit(s) de HEAD (exigido: 1)`);
  }
  if (!G.ok('diff', '--quiet', 'HEAD', '--', arq)) recusar(`REVISAO DIFERENTE DE HEAD (staged ou modificada na arvore): ${arq}`);

  /* (2) frontmatter: `critical: 0` no bloco `findings:`; `reviewed_head` e `diff_base` hexadecimais que resolvem */
  let txt;
  try {
    txt = G.cru('show', `HEAD:${arq}`);
  } catch {
    recusar(`REVISAO ILEGIVEL EM HEAD: ${arq}`);
  }
  const linhas = txt.split(/\r?\n/);
  const fim = linhas.indexOf('---', 1);
  if (linhas[0] !== '---' || fim < 0) recusar(`REVISAO SEM FRONTMATTER: ${arq}`);
  const fm = linhas.slice(1, fim);
  const iF = fm.findIndex((l) => /^findings:\s*$/.test(l));
  if (iF < 0) recusar(`REVISAO SEM findings: ${arq}`);
  const bloco = [];
  for (let i = iF + 1; i < fm.length && /^\s/.test(fm[i]); i += 1) bloco.push(fm[i]);
  const crit = bloco.filter((l) => /^\s+critical\s*:/.test(l));
  if (crit.length !== 1) recusar(`REVISAO SEM findings.critical (ou repetido: ${crit.length}): ${arq}`);
  if (!/^\s+critical:\s*0\s*$/.test(crit[0])) recusar(`REVISAO COM CRITICO: «${crit[0].trim()}» em ${arq}`);
  const campo = (nome) => {
    const ls = fm.filter((l) => new RegExp(`^${nome}\\s*:`).test(l));
    if (ls.length !== 1) recusar(`REVISAO SEM ${nome} (ou repetido: ${ls.length}): ${arq}`);
    const m = ls[0].match(new RegExp(`^${nome}: *([0-9a-f]{7,40}) *$`));
    if (!m) recusar(`REVISAO COM ${nome} NAO HEXADECIMAL: «${ls[0]}» em ${arq}`);
    const sha = G.rev(m[1]);
    if (!sha) recusar(`${nome} ${m[1]} de ${arq} NAO RESOLVE`);
    return sha;
  };
  const rh = campo('reviewed_head');
  const db = campo('diff_base');

  /* (3) a revisão cobre a onda inteira: diff_base ancestral (ou igual) de --base */
  const base = G.rev(o.base);
  if (!base) recusar(`BASE NAO RESOLVE: --base ${o.base}`);
  if (!G.ok('merge-base', '--is-ancestor', db, base)) {
    recusar(`REVISAO NAO COBRE A BASE: diff_base=${curto(db)} de ${arq} nao e ancestral (nem igual) de --base ${o.base} (${curto(base)})`);
  }
  const head = G.rev('HEAD');
  if (!head) recusar('HEAD NAO RESOLVE');

  let pin = null;
  if (o.modo === 'revisao') {
    /* (4-revisao) nenhum código fora de .planning/ mudou depois do reviewed_head */
    if (!G.ok('merge-base', '--is-ancestor', rh, head)) recusar(`reviewed_head ${curto(rh)} de ${arq} FORA DO HISTORICO DE HEAD`);
    if (!G.ok('diff', '--quiet', rh, head, '--', ...FORA_PLANNING)) {
      recusar(`CODIGO DEPOIS DA REVISAO ${arq} (reviewed_head ${curto(rh)}): ${G.nomes(rh, head, '--', ...FORA_PLANNING)}`);
    }
  } else {
    /* (4) o pin: obrigatório e resolve; apply exige HEAD = pin; deploy/push aceitam depois dele só commits de .planning/ */
    if (o.pin === undefined || o.pin === '') recusar(`SEM PIN: --pin e obrigatorio no modo ${o.modo}`);
    pin = G.rev(o.pin);
    if (!pin) recusar(`PIN NAO RESOLVE: --pin ${o.pin}`);
    if (o.modo === 'apply') {
      if (head !== pin) recusar(`HEAD != PIN: HEAD=${curto(head)} pin=${curto(pin)} (${o.pin}) — o modo apply exige HEAD = pin`);
    } else {
      if (!G.ok('merge-base', '--is-ancestor', pin, head)) recusar(`PIN ${curto(pin)} (${o.pin}) FORA DO HISTORICO DE HEAD`);
      if (!G.ok('diff', '--quiet', pin, head, '--', ...FORA_PLANNING)) {
        recusar(`CODIGO DEPOIS DO PIN ${curto(pin)} (${o.pin}): ${G.nomes(pin, head, '--', ...FORA_PLANNING)}`);
      }
    }
    /* (5) o código do pin é o código revisado */
    if (!G.ok('merge-base', '--is-ancestor', rh, pin)) recusar(`reviewed_head ${curto(rh)} de ${arq} FORA DO HISTORICO DO PIN ${curto(pin)}`);
    if (!G.ok('diff', '--quiet', rh, pin, '--', ...FORA_PLANNING)) {
      recusar(`CODIGO DO PIN != CODIGO REVISADO em ${arq} (reviewed_head ${curto(rh)}, pin ${curto(pin)}): ${G.nomes(rh, pin, '--', ...FORA_PLANNING)}`);
    }
  }

  /* (6) o plano que escreve em PROD é o revisado: existia no reviewed_head, não mudou depois, nem na árvore */
  const plano = naRaiz(o.plano, '--plano');
  if (!G.ok('cat-file', '-e', `${rh}:${plano}`)) recusar(`PLANO AUSENTE NO reviewed_head: ${plano} nao existe em ${curto(rh)} (a revisao nao o cobriu, ou o caminho esta errado)`);
  if (!G.ok('diff', '--quiet', rh, head, '--', plano)) recusar(`PLANO MUDOU DEPOIS DA REVISAO: ${plano} (reviewed_head ${curto(rh)} -> HEAD ${curto(head)})`);
  if (!G.ok('diff', '--quiet', 'HEAD', '--', plano)) recusar(`PLANO MODIFICADO NA ARVORE: ${plano} difere de HEAD (staged ou nao)`);

  /* (7) árvore limpa nos caminhos que vão a PROD (rastreados, staged e não rastreados) */
  let sujo;
  try {
    sujo = G('status', '--porcelain', '--untracked-files=all', '--', ...VIGIADOS);
  } catch {
    recusar('GIT STATUS FALHOU');
  }
  if (sujo) recusar(`ARVORE SUJA: ${sujo.split('\n').join(' | ')}`);

  return `PORTAO OK: revisao=${arq} reviewed_head=${rh} pin=${pin || '-'} modo=${o.modo}`;
}

function checar(o, cwd, env) {
  try {
    return { ok: true, linha: verificar(o, cwd, env || process.env) };
  } catch (e) {
    if (e instanceof Recusa) return { ok: false, motivo: e.message };
    return { ok: false, motivo: `ERRO INESPERADO: ${String(e && e.message).split('\n')[0]}` };
  }
}

/* ------------------------------------------------------------------------------------------------
 * AUTO-TESTE — repositório git temporário em os.tmpdir(); nunca toca o repositório real.
 * ---------------------------------------------------------------------------------------------- */

const REV = '.planning/f/F-REVIEW-PORTAO';
const PLANO = '.planning/f/F-PLAN.md';
const BASE_REF = 'refs/gsd/t/base';

function frontmatter(c) {
  const l = ['---', 'phase: t', 'reviewed: 2026-10-09T00:00:00Z'];
  if (c.diff_base !== undefined) l.push(`diff_base: ${c.diff_base}`);
  if (c.reviewed_head !== undefined) l.push(`reviewed_head: ${c.reviewed_head}`);
  if (c.findings !== false) {
    l.push('findings:');
    if (c.critical !== undefined) l.push(`  critical: ${c.critical}`);
    if (c.critical2 !== undefined) l.push(`  critical: ${c.critical2}`);
    l.push('  warning: 2', '  info: 1', '  total: 3');
  }
  l.push('status: issues_found', '---', '', '# revisao de teste', '');
  return l.join('\n');
}

function envIsolado() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  env.GIT_CONFIG_NOSYSTEM = '1';
  env.GIT_CONFIG_GLOBAL = os.devNull;
  env.GIT_TERMINAL_PROMPT = '0';
  return env;
}

function novoRepo(raiz, nome, env) {
  const dir = path.join(raiz, nome);
  fs.mkdirSync(dir);
  const git = (...a) => execFileSync('git', a, { cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q');
  git('config', 'user.name', 'auto-teste');
  git('config', 'user.email', 'auto-teste@p51.invalid');
  git('config', 'commit.gpgsign', 'false');
  // Trava de isolamento: o repositório do caso TEM de ser o diretório temporário — nunca o real.
  if (fs.realpathSync(git('rev-parse', '--show-toplevel')) !== fs.realpathSync(dir)) {
    throw new Error(`AUTO-TESTE ABORTADO: ${dir} nao e a raiz do proprio repositorio`);
  }
  const r = {
    dir,
    git,
    escrever(arq, txt) {
      const p = path.join(dir, arq);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, txt);
    },
    commit(msg) {
      git('add', '-A', '--', '.');
      git('commit', '-q', '--allow-empty', '-m', msg);
      return git('rev-parse', 'HEAD');
    },
    revisao(n, c) {
      r.escrever(`${REV}-${n}.md`, frontmatter(c));
    },
  };
  return r;
}

/* Cenário básico: c0 (base da onda) → c1 (código da onda = reviewed_head) → c2 (a revisão, commitada uma vez). */
function basico(r, c = {}) {
  r.escrever('src/a.js', '1\n');
  r.escrever('supabase/m.sql', 'select 1;\n');
  r.escrever(PLANO, 'plano\n');
  r.escrever('docs/specs/x.md', 'x\n');
  const c0 = r.commit('c0 base');
  r.git('update-ref', BASE_REF, c0);
  r.escrever('src/a.js', '2\n');
  const c1 = r.commit('c1 codigo da onda');
  if (c.semRevisao) return { c0, c1, c2: c1 };
  r.revisao(1, { diff_base: c0, reviewed_head: c1, critical: 0, ...c.fm });
  const c2 = r.commit('revisao 1');
  return { c0, c1, c2 };
}

const PIN_REF = 'refs/gsd/t/pin';
function fixarPin(r, sha) {
  r.git('update-ref', PIN_REF, sha);
}

const OPT = { revisao: REV, base: BASE_REF, plano: PLANO, modo: 'revisao' };
const OK = { ok: true };
const rec = (re) => ({ ok: false, motivo: re });

/* Cada caso: monta o estado e devolve { o, cwd? } (o = opções sobre OPT); `espera` = OK ou rec(/motivo/). */
const CASOS = [
  {
    nome: 'revisao: tudo bate',
    montar: (r) => (basico(r), {}),
    espera: OK,
  },
  {
    nome: 'revisao: commit so de .planning depois da revisao passa',
    montar: (r) => {
      basico(r);
      r.escrever('.planning/STATE.md', 'estado\n');
      r.commit('docs: state');
      return {};
    },
    espera: OK,
  },
  {
    nome: 'revisao: arquivo sujo FORA dos caminhos vigiados (docs/specs, AGENTS.md, .planning) passa',
    montar: (r) => {
      basico(r);
      r.escrever('docs/specs/x.md', 'outra sessao\n');
      r.escrever('AGENTS.md', 'outra sessao\n');
      r.escrever('.planning/f/.gitkeep', '');
      return {};
    },
    espera: OK,
  },
  {
    nome: 'revisao: rodada de conserto — vale a de maior N (-1 com critico, -2 sem)',
    montar: (r) => {
      const { c0 } = basico(r, { fm: { critical: 2 } });
      r.escrever('src/a.js', '3\n');
      const c3 = r.commit('fix: conserto');
      r.revisao(2, { diff_base: c0, reviewed_head: c3, critical: 0 });
      r.commit('revisao 2');
      return {};
    },
    espera: OK,
  },
  {
    nome: 'revisao: diff_base ANTERIOR a --base passa (ancestral)',
    montar: (r) => {
      const { c1 } = basico(r);
      r.git('update-ref', 'refs/gsd/t/base2', c1);
      return { o: { base: 'refs/gsd/t/base2' } };
    },
    espera: OK,
  },
  {
    nome: 'recusa: sem arquivo de revisao',
    montar: (r) => (basico(r, { semRevisao: true }), {}),
    espera: rec(/^SEM REVISAO: /),
  },
  {
    nome: 'recusa: revisao so staged (nunca commitada)',
    montar: (r) => {
      const { c0, c1 } = basico(r, { semRevisao: true });
      r.revisao(1, { diff_base: c0, reviewed_head: c1, critical: 0 });
      r.git('add', '--', `${REV}-1.md`);
      return {};
    },
    espera: rec(/^REVISAO NAO COMMITADA: /),
  },
  {
    nome: 'recusa: revisao de maior N nao commitada (WR-02: nao cai para a anterior)',
    montar: (r) => {
      const { c0, c1 } = basico(r);
      r.revisao(2, { diff_base: c0, reviewed_head: c1, critical: 0 });
      return {};
    },
    espera: rec(/^REVISAO NAO COMMITADA: .*-2\.md/),
  },
  {
    nome: 'recusa: revisao commitada e modificada na arvore',
    montar: (r) => {
      basico(r);
      fs.appendFileSync(path.join(r.dir, `${REV}-1.md`), 'editada depois\n');
      return {};
    },
    espera: rec(/^REVISAO DIFERENTE DE HEAD /),
  },
  {
    nome: 'recusa: revisao commitada e modificada staged',
    montar: (r) => {
      basico(r);
      fs.appendFileSync(path.join(r.dir, `${REV}-1.md`), 'editada depois\n');
      r.git('add', '--', `${REV}-1.md`);
      return {};
    },
    espera: rec(/^REVISAO DIFERENTE DE HEAD /),
  },
  {
    nome: 'recusa: revisao reescrita (commitada duas vezes)',
    montar: (r) => {
      basico(r);
      fs.appendFileSync(path.join(r.dir, `${REV}-1.md`), 'reescrita\n');
      r.commit('reescreve revisao');
      return {};
    },
    espera: rec(/^REVISAO REESCRITA: .* 2 commit/),
  },
  {
    nome: 'recusa: revisao ANTERIOR reescrita (a -1 commitada duas vezes, a -2 em ordem)',
    montar: (r) => {
      const { c0, c1 } = basico(r);
      fs.appendFileSync(path.join(r.dir, `${REV}-1.md`), 'reescrita\n');
      r.commit('reescreve revisao 1');
      r.revisao(2, { diff_base: c0, reviewed_head: c1, critical: 0 });
      r.commit('revisao 2');
      return {};
    },
    espera: rec(/^REVISAO ANTERIOR REESCRITA OU NAO COMMITADA: .*-1\.md/),
  },
  {
    nome: 'recusa: critical diferente de 0',
    montar: (r) => (basico(r, { fm: { critical: 1 } }), {}),
    espera: rec(/^REVISAO COM CRITICO: /),
  },
  {
    nome: 'recusa: findings sem critical',
    montar: (r) => (basico(r, { fm: { critical: undefined } }), {}),
    espera: rec(/^REVISAO SEM findings\.critical /),
  },
  {
    nome: 'recusa: critical repetido no bloco (0 e 1)',
    montar: (r) => (basico(r, { fm: { critical: 0, critical2: 1 } }), {}),
    espera: rec(/^REVISAO SEM findings\.critical /),
  },
  {
    nome: 'recusa: sem bloco findings',
    montar: (r) => (basico(r, { fm: { findings: false } }), {}),
    espera: rec(/^REVISAO SEM findings: /),
  },
  {
    nome: 'recusa: revisao sem frontmatter',
    montar: (r) => {
      const { c1 } = basico(r, { semRevisao: true });
      r.escrever(`${REV}-1.md`, `# revisao\nreviewed_head: ${c1}\n  critical: 0\n`);
      r.commit('revisao 1 sem frontmatter');
      return {};
    },
    espera: rec(/^REVISAO SEM FRONTMATTER: /),
  },
  {
    nome: 'recusa: sem reviewed_head',
    montar: (r) => (basico(r, { fm: { reviewed_head: undefined } }), {}),
    espera: rec(/^REVISAO SEM reviewed_head /),
  },
  {
    nome: 'recusa: reviewed_head hexadecimal que nao resolve',
    montar: (r) => (basico(r, { fm: { reviewed_head: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' } }), {}),
    espera: rec(/^reviewed_head deadbeef.* NAO RESOLVE/),
  },
  {
    nome: 'recusa: reviewed_head nao hexadecimal',
    montar: (r) => (basico(r, { fm: { reviewed_head: 'HEAD' } }), {}),
    espera: rec(/^REVISAO COM reviewed_head NAO HEXADECIMAL: /),
  },
  {
    nome: 'recusa: sem diff_base',
    montar: (r) => (basico(r, { fm: { diff_base: undefined } }), {}),
    espera: rec(/^REVISAO SEM diff_base /),
  },
  {
    nome: 'recusa: diff_base POSTERIOR a --base (revisao nao cobre a onda inteira)',
    montar: (r) => {
      const c0 = (() => {
        r.escrever('src/a.js', '1\n');
        r.escrever(PLANO, 'plano\n');
        return r.commit('c0');
      })();
      r.git('update-ref', BASE_REF, c0);
      r.escrever('src/a.js', '2\n');
      const c1 = r.commit('c1');
      r.escrever('src/b.js', 'b\n');
      const c1b = r.commit('c1b');
      r.revisao(1, { diff_base: c1, reviewed_head: c1b, critical: 0 });
      r.commit('revisao 1');
      return {};
    },
    espera: rec(/^REVISAO NAO COBRE A BASE: /),
  },
  {
    nome: 'recusa: --base que nao resolve',
    montar: (r) => (basico(r), { o: { base: 'refs/gsd/t/nao-existe' } }),
    espera: rec(/^BASE NAO RESOLVE: /),
  },
  {
    nome: 'recusa: codigo fora de .planning/ commitado depois do reviewed_head',
    montar: (r) => {
      basico(r);
      r.escrever('supabase/m.sql', 'select 2;\n');
      r.commit('fix: depois da revisao');
      return {};
    },
    espera: rec(/^CODIGO DEPOIS DA REVISAO .*supabase\/m\.sql/),
  },
  {
    nome: 'recusa: codigo depois da revisao, rodando de um SUBDIRETORIO (pathspec na raiz)',
    montar: (r) => {
      basico(r);
      r.escrever('supabase/m.sql', 'select 2;\n');
      r.commit('fix: depois da revisao');
      return { cwd: path.join(r.dir, 'src'), o: { revisao: `../${REV}`, plano: `../${PLANO}` } };
    },
    espera: rec(/^CODIGO DEPOIS DA REVISAO .*supabase\/m\.sql/),
  },
  {
    nome: 'revisao: rodando de um subdiretorio, tudo bate',
    montar: (r) => (basico(r), { cwd: path.join(r.dir, 'src'), o: { revisao: `../${REV}`, plano: `../${PLANO}` } }),
    espera: OK,
  },
  {
    nome: 'recusa: reviewed_head fora do historico de HEAD',
    montar: (r) => {
      const { c0, c1 } = basico(r, { semRevisao: true });
      r.git('checkout', '-q', '-b', 'lado');
      r.escrever('.planning/lado.md', 'lado\n');
      const s1 = r.commit('lado');
      r.git('checkout', '-q', '-');
      r.revisao(1, { diff_base: c0, reviewed_head: s1, critical: 0 });
      r.commit('revisao 1');
      void c1;
      return {};
    },
    espera: rec(/^reviewed_head .* FORA DO HISTORICO DE HEAD/),
  },
  {
    nome: 'recusa: --plano alterado e commitado depois da revisao',
    montar: (r) => {
      basico(r);
      r.escrever(PLANO, 'plano editado\n');
      r.commit('docs: plano');
      return {};
    },
    espera: rec(/^PLANO MUDOU DEPOIS DA REVISAO: /),
  },
  {
    nome: 'recusa: --plano modificado na arvore (nao commitado)',
    montar: (r) => {
      basico(r);
      r.escrever(PLANO, 'plano editado\n');
      return {};
    },
    espera: rec(/^PLANO MODIFICADO NA ARVORE: /),
  },
  {
    nome: 'recusa: --plano que nao existia no reviewed_head (caminho errado ou plano novo)',
    montar: (r) => (basico(r), { o: { plano: '.planning/f/G-PLAN.md' } }),
    espera: rec(/^PLANO AUSENTE NO reviewed_head: /),
  },
  {
    nome: 'recusa: arvore suja — src/ modificado',
    montar: (r) => {
      basico(r);
      r.escrever('src/a.js', 'sujo\n');
      return {};
    },
    espera: rec(/^ARVORE SUJA: .*src\/a\.js/),
  },
  {
    nome: 'recusa: arvore suja — arquivo novo nao rastreado em scripts/',
    montar: (r) => {
      basico(r);
      r.escrever('scripts/novo.cjs', '//\n');
      return {};
    },
    espera: rec(/^ARVORE SUJA: .*scripts\/novo\.cjs/),
  },
  {
    nome: 'recusa: arvore suja — p46apply.cjs staged',
    montar: (r) => {
      basico(r);
      r.escrever('p46apply.cjs', '//\n');
      r.git('add', '--', 'p46apply.cjs');
      return {};
    },
    espera: rec(/^ARVORE SUJA: .*p46apply\.cjs/),
  },
  {
    nome: 'recusa: modo invalido',
    montar: (r) => (basico(r), { o: { modo: 'aplicar' } }),
    espera: rec(/^MODO INVALIDO: /),
  },
  {
    nome: 'recusa: sem --plano',
    montar: (r) => (basico(r), { o: { plano: undefined } }),
    espera: rec(/^SEM PARAMETRO: --plano/),
  },
  {
    nome: 'recusa: --pin no modo revisao (o modo revisao nao confere pin)',
    montar: (r) => (basico(r), { o: { pin: 'HEAD' } }),
    espera: rec(/^PIN NO MODO revisao: /),
  },
  /* ---- modos apply / deploy / push (pin) ---- */
  {
    nome: 'apply: HEAD = pin e codigo do pin = codigo revisado',
    montar: (r) => {
      const { c2 } = basico(r);
      fixarPin(r, c2);
      return { o: { modo: 'apply', pin: PIN_REF } };
    },
    espera: OK,
  },
  {
    nome: 'recusa: apply com HEAD != pin (commit so de .planning depois do pin)',
    montar: (r) => {
      const { c2 } = basico(r);
      fixarPin(r, c2);
      r.escrever('.planning/STATE.md', 'estado\n');
      r.commit('docs: state');
      return { o: { modo: 'apply', pin: PIN_REF } };
    },
    espera: rec(/^HEAD != PIN: /),
  },
  {
    nome: 'recusa: apply com codigo do pin != codigo revisado (codigo entre reviewed_head e pin)',
    montar: (r) => {
      basico(r);
      r.escrever('src/a.js', '3\n');
      fixarPin(r, r.commit('fix: depois da revisao'));
      return { o: { modo: 'apply', pin: PIN_REF } };
    },
    espera: rec(/^CODIGO DO PIN != CODIGO REVISADO .*src\/a\.js/),
  },
  {
    nome: 'deploy: commits so de .planning/ depois do pin passam',
    montar: (r) => {
      const { c2 } = basico(r);
      fixarPin(r, c2);
      r.escrever('.planning/f/F-SUMMARY.md', 'parcial\n');
      r.commit('docs: summary parcial');
      r.escrever('.planning/STATE.md', 'estado\n');
      r.commit('docs: state');
      return { o: { modo: 'deploy', pin: PIN_REF } };
    },
    espera: OK,
  },
  {
    nome: 'push: commits so de .planning/ depois do pin passam',
    montar: (r) => {
      const { c2 } = basico(r);
      fixarPin(r, c2);
      r.escrever('.planning/todos/42.md', 'linha datada\n');
      r.commit('docs: todo 42');
      return { o: { modo: 'push', pin: PIN_REF } };
    },
    espera: OK,
  },
  {
    nome: 'recusa: deploy com codigo depois do pin',
    montar: (r) => {
      const { c2 } = basico(r);
      fixarPin(r, c2);
      r.escrever('supabase/functions/f/index.ts', 'export {};\n');
      r.commit('fix: ef depois do pin');
      return { o: { modo: 'deploy', pin: PIN_REF } };
    },
    espera: rec(/^CODIGO DEPOIS DO PIN .*supabase\/functions\/f\/index\.ts/),
  },
  {
    nome: 'recusa: push com codigo depois do pin',
    montar: (r) => {
      const { c2 } = basico(r);
      fixarPin(r, c2);
      r.escrever('src/b.tsx', 'export const B = 1;\n');
      r.commit('feat: cliente depois do pin');
      return { o: { modo: 'push', pin: PIN_REF } };
    },
    espera: rec(/^CODIGO DEPOIS DO PIN .*src\/b\.tsx/),
  },
  {
    nome: 'recusa: deploy com codigo do pin != codigo revisado (so .planning/ depois do pin)',
    montar: (r) => {
      basico(r);
      r.escrever('supabase/m.sql', 'select 3;\n');
      fixarPin(r, r.commit('fix: depois da revisao'));
      r.escrever('.planning/STATE.md', 'estado\n');
      r.commit('docs: state');
      return { o: { modo: 'deploy', pin: PIN_REF } };
    },
    espera: rec(/^CODIGO DO PIN != CODIGO REVISADO .*supabase\/m\.sql/),
  },
  {
    nome: 'recusa: apply sem --pin',
    montar: (r) => (basico(r), { o: { modo: 'apply' } }),
    espera: rec(/^SEM PIN: /),
  },
  {
    nome: 'recusa: deploy sem --pin',
    montar: (r) => (basico(r), { o: { modo: 'deploy' } }),
    espera: rec(/^SEM PIN: /),
  },
  {
    nome: 'recusa: push sem --pin',
    montar: (r) => (basico(r), { o: { modo: 'push' } }),
    espera: rec(/^SEM PIN: /),
  },
  {
    nome: 'recusa: --pin que nao resolve',
    montar: (r) => (basico(r), { o: { modo: 'apply', pin: 'refs/gsd/t/nao-existe' } }),
    espera: rec(/^PIN NAO RESOLVE: /),
  },
  {
    nome: 'recusa: deploy com pin fora do historico de HEAD',
    montar: (r) => {
      basico(r);
      r.git('checkout', '-q', '-b', 'lado');
      r.escrever('.planning/lado.md', 'lado\n');
      fixarPin(r, r.commit('lado'));
      r.git('checkout', '-q', '-');
      return { o: { modo: 'deploy', pin: PIN_REF } };
    },
    espera: rec(/^PIN .* FORA DO HISTORICO DE HEAD/),
  },
  {
    nome: 'recusa: apply com reviewed_head fora do historico do pin',
    montar: (r) => {
      const { c0 } = basico(r, { semRevisao: true });
      r.git('checkout', '-q', '-b', 'lado');
      r.escrever('.planning/lado.md', 'lado\n');
      const s1 = r.commit('lado');
      r.git('checkout', '-q', '-');
      r.revisao(1, { diff_base: c0, reviewed_head: s1, critical: 0 });
      fixarPin(r, r.commit('revisao 1'));
      return { o: { modo: 'apply', pin: PIN_REF } };
    },
    espera: rec(/^reviewed_head .* FORA DO HISTORICO DO PIN/),
  },
  {
    nome: 'recusa: apply sem revisao recusa pela revisao ANTES de conferir o pin (nem --pin dado)',
    montar: (r) => (basico(r, { semRevisao: true }), { o: { modo: 'apply' } }),
    espera: rec(/^SEM REVISAO: /),
  },
  {
    nome: 'recusa: apply com o plano mudado depois da revisao (codigo do pin = revisado)',
    montar: (r) => {
      basico(r);
      r.escrever(PLANO, 'plano editado\n');
      fixarPin(r, r.commit('docs: plano'));
      return { o: { modo: 'apply', pin: PIN_REF } };
    },
    espera: rec(/^PLANO MUDOU DEPOIS DA REVISAO: /),
  },
  {
    nome: 'recusa: deploy com o plano mudado num commit so de .planning/ depois do pin',
    montar: (r) => {
      const { c2 } = basico(r);
      fixarPin(r, c2);
      r.escrever(PLANO, 'plano editado\n');
      r.commit('docs: plano');
      return { o: { modo: 'deploy', pin: PIN_REF } };
    },
    espera: rec(/^PLANO MUDOU DEPOIS DA REVISAO: /),
  },
  {
    nome: 'recusa: push com arvore suja (efdeploy.cjs modificado)',
    montar: (r) => {
      r.escrever('efdeploy.cjs', '//\n');
      const { c2 } = basico(r);
      fixarPin(r, c2);
      r.escrever('efdeploy.cjs', '// editado\n');
      return { o: { modo: 'push', pin: PIN_REF } };
    },
    espera: rec(/^ARVORE SUJA: .*efdeploy\.cjs/),
  },
];

/* Casos de ponta a ponta: o programa como processo (argumentos, saída e código de saída). */
const CASOS_CLI = [
  {
    nome: 'cli: PORTAO OK e saida 0',
    montar: (r) => (basico(r), {}),
    args: ['--revisao', REV, '--base', BASE_REF, '--plano', PLANO, '--modo', 'revisao'],
    status: 0,
    saida: /^PORTAO OK: revisao=\.planning\/f\/F-REVIEW-PORTAO-1\.md reviewed_head=[0-9a-f]{40} pin=- modo=revisao$/m,
  },
  {
    nome: 'cli: PORTAO RECUSADO e saida 1 (sem revisao)',
    montar: (r) => (basico(r, { semRevisao: true }), {}),
    args: ['--revisao', REV, '--base', BASE_REF, '--plano', PLANO, '--modo', 'revisao'],
    status: 1,
    saida: /^PORTAO RECUSADO: SEM REVISAO: /m,
  },
  {
    nome: 'cli: apply com pin — PORTAO OK com o sha do pin e saida 0',
    montar: (r) => {
      const { c2 } = basico(r);
      fixarPin(r, c2);
      return {};
    },
    args: ['--revisao', REV, '--base', BASE_REF, '--pin', PIN_REF, '--plano', PLANO, '--modo', 'apply'],
    status: 0,
    saida: /^PORTAO OK: revisao=\.planning\/f\/F-REVIEW-PORTAO-1\.md reviewed_head=[0-9a-f]{40} pin=[0-9a-f]{40} modo=apply$/m,
  },
  {
    nome: 'cli: opcao desconhecida recusa com saida 1',
    montar: (r) => (basico(r), {}),
    args: ['--revisao', REV, '--base', BASE_REF, '--plano', PLANO, '--modo', 'revisao', '--forcar', 'sim'],
    status: 1,
    saida: /^PORTAO RECUSADO: OPCAO DESCONHECIDA: --forcar/m,
  },
];

function autoTeste() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'p51-portao-'));
  const env = envIsolado();
  const falhas = [];
  let n = 0;
  try {
    CASOS.forEach((c, i) => {
      n += 1;
      let obtido;
      try {
        const r = novoRepo(raiz, `caso-${String(i + 1).padStart(2, '0')}`, env);
        const m = c.montar(r) || {};
        const o = { ...OPT, ...(m.o || {}) };
        obtido = checar(o, m.cwd || r.dir, env);
      } catch (e) {
        obtido = { ok: false, motivo: `MONTAGEM FALHOU: ${String(e && e.message).split('\n')[0]}` };
      }
      const bate = c.espera.ok ? obtido.ok === true : obtido.ok === false && c.espera.motivo.test(obtido.motivo);
      if (bate) console.log(`  ok    ${String(n).padStart(2, ' ')} ${c.nome}`);
      else {
        falhas.push(c.nome);
        console.log(`  FALHOU ${String(n).padStart(2, ' ')} ${c.nome}: esperado ${c.espera.ok ? 'PORTAO OK' : `recusa ${c.espera.motivo}`}; obtido ${obtido.ok ? obtido.linha : `recusa «${obtido.motivo}»`}`);
      }
    });
    CASOS_CLI.forEach((c, i) => {
      n += 1;
      let st;
      let out = '';
      try {
        const r = novoRepo(raiz, `cli-${String(i + 1).padStart(2, '0')}`, env);
        c.montar(r);
        const p = spawnSync(process.execPath, [__filename, ...c.args], { cwd: r.dir, env, encoding: 'utf8' });
        st = p.status;
        out = `${p.stdout || ''}${p.stderr || ''}`;
      } catch (e) {
        st = 'excecao';
        out = String(e && e.message);
      }
      if (st === c.status && c.saida.test(out)) console.log(`  ok    ${String(n).padStart(2, ' ')} ${c.nome}`);
      else {
        falhas.push(c.nome);
        console.log(`  FALHOU ${String(n).padStart(2, ' ')} ${c.nome}: esperado saida ${c.status} e ${c.saida}; obtido saida ${st}: ${out.trim().split('\n').slice(-1)[0]}`);
      }
    });
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
  if (fs.existsSync(raiz)) {
    console.log(`auto-teste FALHOU: diretorio temporario ${raiz} nao foi apagado`);
    return 1;
  }
  if (falhas.length) {
    console.log(`auto-teste FALHOU: ${falhas.length}/${n} casos (${falhas.join(' | ')})`);
    return 1;
  }
  console.log(`auto-teste ok: ${n} casos`);
  return 0;
}

/* ------------------------------------------------------------------------------------------------
 * CLI
 * ---------------------------------------------------------------------------------------------- */

function lerArgs(v) {
  const o = {};
  for (let i = 0; i < v.length; i += 1) {
    const k = v[i];
    if (!['--revisao', '--base', '--pin', '--plano', '--modo'].includes(k)) recusar(`OPCAO DESCONHECIDA: ${k}`);
    if (i + 1 >= v.length) recusar(`OPCAO SEM VALOR: ${k}`);
    o[k.slice(2)] = v[i + 1];
    i += 1;
  }
  return o;
}

function main() {
  const v = process.argv.slice(2);
  if (v.length === 1 && v[0] === '--auto-teste') process.exit(autoTeste());
  let r;
  try {
    r = checar(lerArgs(v), process.cwd(), process.env);
  } catch (e) {
    r = { ok: false, motivo: e instanceof Recusa ? e.message : `ERRO INESPERADO: ${String(e && e.message).split('\n')[0]}` };
  }
  if (r.ok) {
    console.log(r.linha);
    process.exit(0);
  }
  console.error(`PORTAO RECUSADO: ${r.motivo}`);
  process.exit(1);
}

if (require.main === module) main();

module.exports = { checar, MODOS };
