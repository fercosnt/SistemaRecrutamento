#!/usr/bin/env node
'use strict';
/*
 * p50_enumera.cjs — enumeração LITERAL dos commits de um intervalo, antes de todo push da Phase 50.
 *
 * Classifica cada commit de <de>..<ate> (do mais antigo ao mais novo) pelos ARQUIVOS que ele toca
 * (`git diff-tree --no-commit-id --name-only -r`), não só pelo assunto (regra do 49-45, Task 2,
 * Passo 0):
 *   · só `.planning/`                                  → `planning` (qualquer assunto);
 *   · algum arquivo fora de `.planning/`               → `codigo` sse TODOS esses arquivos casam
 *     `--caminhos` E o assunto casa `--assunto`; senão `ALHEIO[motivo]`.
 * Recusa merge no intervalo (`MERGE NO INTERVALO … PARAR`) e intervalo vazio. Qualquer ALHEIO ⇒
 * `COMMIT ALHEIO: PARAR`, saída 1 («commit alheio = PARAR»).
 *
 * AMARRAÇÃO À REVISÃO E AO APPLY (WR-06 do 50-REVIEW-TRACER-1) — um `fix(50-01): …` commitado
 * DEPOIS da revisão ou do apply casa a allowlist e o assunto, e sem isto subia para `main`:
 *   · `--revisoes <prefixo>`: lê o `<prefixo>-<N>.md` de MAIOR N (a revisão mais recente), exige
 *     no frontmatter `critical: 0` no bloco `findings:` e um `reviewed_head` que resolva; todo
 *     commit `codigo` tem de estar contido nele (`merge-base --is-ancestor`), senão
 *     `ALHEIO[codigo depois do reviewed_head …]`.
 *   · `--aplicado <rev>`: todo commit `codigo` tem de estar contido no commit APLICADO (o pin do
 *     apply), senão `ALHEIO[codigo depois do apply …]` — o que sobe é o que está em PROD.
 *
 * Só leitura de git. NUNCA roda `git push` — quem empurra é o comando que o chama, e só depois de
 * `enumeracao ok`.
 *
 * Uso:
 *   node scripts/p50_enumera.cjs --de <rev> --ate <rev> --caminhos '<regex>' --assunto '<regex>'
 *                                [--revisoes <prefixo-dos-REVIEW>] [--aplicado <rev>]
 * Saída: uma linha `<sha> <planning|codigo|ALHEIO[…]> <assunto>` por commit e, no fim,
 *        `enumeracao ok: <n> commit(s) em <de>..<ate>`.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function sair(msg) {
  console.error(msg);
  process.exit(1);
}

function git(...a) {
  return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function args() {
  const o = {};
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i += 1) {
    const k = v[i];
    if (!['--de', '--ate', '--caminhos', '--assunto', '--revisoes', '--aplicado'].includes(k)) sair(`opcao desconhecida: ${k}`);
    if (i + 1 >= v.length) sair(`opcao sem valor: ${k}`);
    o[k.slice(2)] = v[i + 1];
    i += 1;
  }
  for (const k of ['de', 'ate', 'caminhos', 'assunto']) if (!o[k]) sair(`ENUM SEM PARAMETRO: --${k}`);
  return o;
}

const o = args();
let de;
let ate;
try {
  de = git('rev-parse', '--verify', '-q', `${o.de}^{commit}`);
  ate = git('rev-parse', '--verify', '-q', `${o.ate}^{commit}`);
} catch {
  sair(`REVISAO INVALIDA: --de ${o.de} / --ate ${o.ate}`);
}
const reCaminhos = new RegExp(o.caminhos);
const reAssunto = new RegExp(o.assunto);

/* A revisão mais recente: `<prefixo>-<N>.md` de maior N; frontmatter com critical: 0 e reviewed_head. */
let revisado = null;
let revisadoArq = null;
if (o.revisoes) {
  const dir = path.dirname(o.revisoes);
  const base = path.basename(o.revisoes);
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-([0-9]+)\\.md$`);
  let nomes = [];
  try {
    nomes = fs.readdirSync(dir);
  } catch {
    sair(`SEM REVISAO: diretorio ${dir} ilegivel`);
  }
  const ns = nomes.map((f) => (f.match(re) || [])[1]).filter(Boolean).map(Number).sort((a, b) => a - b);
  if (!ns.length) sair(`SEM REVISAO: nenhum ${base}-<N>.md em ${dir}`);
  revisadoArq = path.join(dir, `${base}-${ns[ns.length - 1]}.md`);
  const txt = fs.readFileSync(revisadoArq, 'utf8').split('\n');
  if (txt[0] !== '---') sair(`REVISAO SEM FRONTMATTER: ${revisadoArq}`);
  const fim = txt.indexOf('---', 1);
  const fm = fim > 0 ? txt.slice(1, fim) : [];
  const iF = fm.findIndex((l) => /^findings:\s*$/.test(l));
  const bloco = [];
  for (let i = iF + 1; iF >= 0 && i < fm.length && /^\s/.test(fm[i]); i += 1) bloco.push(fm[i]);
  if (!bloco.includes('  critical: 0')) sair(`REVISAO COM CRITICO (ou sem findings.critical): ${revisadoArq}`);
  const rh = (fm.map((l) => l.match(/^reviewed_head: *([0-9a-f]{7,40}) *$/)).find(Boolean) || [])[1];
  if (!rh) sair(`REVISAO SEM reviewed_head: ${revisadoArq}`);
  try {
    revisado = git('rev-parse', '--verify', '-q', `${rh}^{commit}`);
  } catch {
    sair(`reviewed_head ${rh} de ${revisadoArq} nao resolve`);
  }
}
let aplicado = null;
if (o.aplicado) {
  try {
    aplicado = git('rev-parse', '--verify', '-q', `${o.aplicado}^{commit}`);
  } catch {
    sair(`REVISAO INVALIDA: --aplicado ${o.aplicado}`);
  }
}
function contido(h, em) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', h, em], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const merges = git('rev-list', '--merges', `${de}..${ate}`);
if (merges) sair(`MERGE NO INTERVALO ${de.slice(0, 8)}..${ate.slice(0, 8)}: PARAR (${merges.split('\n').join(',')})`);
const hs = git('rev-list', '--reverse', `${de}..${ate}`).split('\n').filter(Boolean);
if (!hs.length) sair(`INTERVALO VAZIO ${de.slice(0, 8)}..${ate.slice(0, 8)}`);

let alheio = false;
for (const h of hs) {
  const assunto = git('log', '-1', '--format=%s', h);
  const fora = git('diff-tree', '--no-commit-id', '--name-only', '-r', h)
    .split('\n')
    .filter(Boolean)
    .filter((f) => !f.startsWith('.planning/'));
  let classe = 'planning';
  if (fora.length) {
    const nao = fora.filter((f) => !reCaminhos.test(f));
    if (nao.length) {
      classe = `ALHEIO[fora da lista: ${nao.join(',')}]`;
      alheio = true;
    } else if (!reAssunto.test(assunto)) {
      classe = 'ALHEIO[codigo com assunto fora do padrao]';
      alheio = true;
    } else if (revisado && !contido(h, revisado)) {
      classe = `ALHEIO[codigo depois do reviewed_head ${revisado.slice(0, 8)} de ${path.basename(revisadoArq)}]`;
      alheio = true;
    } else if (aplicado && !contido(h, aplicado)) {
      classe = `ALHEIO[codigo depois do apply ${aplicado.slice(0, 8)}]`;
      alheio = true;
    } else {
      classe = 'codigo';
    }
  }
  console.log(`${h} ${classe} ${assunto}`);
}
if (alheio) sair('COMMIT ALHEIO: PARAR');
console.log(
  `enumeracao ok: ${hs.length} commit(s) em ${de.slice(0, 8)}..${ate.slice(0, 8)}${revisado ? ` · codigo coberto por ${path.basename(revisadoArq)} (reviewed_head ${revisado.slice(0, 8)})` : ''}${aplicado ? ` · codigo contido no apply ${aplicado.slice(0, 8)}` : ''}`
);
