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
 * Só leitura de git. NUNCA roda `git push` — quem empurra é o comando que o chama, e só depois de
 * `enumeracao ok`.
 *
 * Uso:
 *   node scripts/p50_enumera.cjs --de <rev> --ate <rev> --caminhos '<regex>' --assunto '<regex>'
 * Saída: uma linha `<sha> <planning|codigo|ALHEIO[…]> <assunto>` por commit e, no fim,
 *        `enumeracao ok: <n> commit(s) em <de>..<ate>`.
 */

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
    if (!['--de', '--ate', '--caminhos', '--assunto'].includes(k)) sair(`opcao desconhecida: ${k}`);
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
    } else {
      classe = 'codigo';
    }
  }
  console.log(`${h} ${classe} ${assunto}`);
}
if (alheio) sair('COMMIT ALHEIO: PARAR');
console.log(`enumeracao ok: ${hs.length} commit(s) em ${de.slice(0, 8)}..${ate.slice(0, 8)}`);
