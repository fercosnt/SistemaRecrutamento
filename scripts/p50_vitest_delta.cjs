#!/usr/bin/env node
'use strict';
/*
 * p50_vitest_delta.cjs — o portão da suíte Vitest da Phase 50, julgado por DELTA contra a base da
 * fase, medida NA MESMA EXECUÇÃO (50-09 Task 3).
 *
 * POR QUE DELTA E NÃO «ZERO FALHAS». A base intocada da fase já reprova testes (no planejamento:
 * dois casos do portão de promessas 47-09, em src/__tests__/promessasComExecutor.test.ts, cujas
 * saídas honestas — construir o executor ou retirar a promessa — pertencem à fila de fecho do M8).
 * Um portão «zero falhas» seria vermelho antes de qualquer trabalho; isentar a entrada é a saída
 * desonesta que a própria mensagem daquele teste proíbe. Então o portão é: NENHUMA falha em HEAD que
 * não falhe também na base — e a lista de pré-existentes é MEDIDA aqui, nunca escrita aqui. Este
 * arquivo não contém nome de teste, de arquivo de teste nem contagem.
 *
 * COMO.
 *   0. Recusa (exit 1) se `refs/gsd/50-01/base` não resolve, ou se há alteração rastreada não
 *      commitada em src/ supabase/ tests/ vite.config.ts package.json package-lock.json — o portão
 *      julga código COMMITADO.
 *   1. Para cada ref — a base da fase (`refs/gsd/50-01/base`, sem código da Phase 50) e HEAD —
 *      `git archive` num diretório novo (`fs.mkdtempSync` sob `os.tmpdir()`), com o `node_modules`
 *      do checkout ligado por symlink. As duas cópias são simétricas: o mesmo comando, o mesmo
 *      `node_modules`, e as MESMAS variáveis falsas (`CI=true`, `VITE_SUPABASE_URL`,
 *      `VITE_SUPABASE_ANON_KEY`). O arquivo de ambiente real (não rastreado) NUNCA é copiado, ligado
 *      nem lido — sem as duas variáveis falsas ~50 arquivos reprovariam no import.
 *   2. Só na cópia de HEAD, antes da execução, entra a MORDIDA: um arquivo de teste que reprova por
 *      construção. Se a comparação não a acusar como nova, ela é vazia (`mordida=FALHOU`).
 *   3. `npx vitest run --reporter=json --outputFile=<dir>/vitest.json` em cada cópia.
 *   4. Ids de falha: `<caminho relativo> > <fullName>` de toda asserção `failed`, mais
 *      `<caminho> > [SUITE]` para arquivo cujo status não é `passed` e que não tem asserção
 *      reprovada (erro de coleta/import; a mensagem sai impressa, fora do id, porque traz o caminho
 *      temporário).
 *   5. Julgamento: (1) mordida — o conjunto de HEAD tem o id da mordida e ele sai como NOVO; depois
 *      os ids da mordida saem do conjunto; (2) pisos — os dois relatórios com `numTotalTests > 0`, e
 *      todo arquivo de teste da base presente no relatório de HEAD (`ARQUIVO SUMIU: <caminho>`);
 *      (3) `novas` = HEAD − base, `corrigidas` = base − HEAD, `pre-existentes` = interseção — cada
 *      uma impressa por inteiro, um id por linha.
 *   Linha final, exata:
 *     vitest delta: base=<sha7> <total>/<falhas> · head=<sha7> <total>/<falhas> · pre-existentes=<k> · corrigidas=<c> · novas=<n> · mordida=<ok|FALHOU>
 *   (os totais de head NÃO contam a mordida). Exit 0 só com novas=0, nenhum arquivo sumido e
 *   mordida=ok. Os dois diretórios temporários saem num `finally`.
 *
 * Sem dependências: Node built-ins, git, tar e o vitest do próprio checkout.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASE_REF = 'refs/gsd/50-01/base';
const MORDIDA_REL = path.join('src', '__tests__', 'p50-mordida-delta.test.ts');
const MORDIDA_SRC =
  "import { describe, it, expect } from 'vitest'\n\n" +
  '// Plantado SÓ na cópia de HEAD por scripts/p50_vitest_delta.cjs — reprova por construção.\n' +
  "describe('p50 mordida do delta', () => {\n" +
  "  it('reprova por construcao (se o delta nao a acusar como nova, a comparacao e vazia)', () => {\n" +
  '    expect(1).toBe(2)\n' +
  '  })\n' +
  '})\n';
const AMBIENTE_FALSO = {
  CI: 'true',
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_ANON_KEY: 'p50-delta-fake',
};
const ESCOPO_LIMPO = ['src', 'supabase', 'tests', 'vite.config.ts', 'package.json', 'package-lock.json'];

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function resolverRef(ref) {
  try {
    return git(['rev-parse', '--verify', '-q', `${ref}^{commit}`]).trim();
  } catch {
    return null;
  }
}

function extrair(ref, rotulo) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `p50-vdelta-${rotulo}-`)));
  const tar = path.join(dir, '..', `${path.basename(dir)}.tar`);
  try {
    git(['archive', '--format=tar', '-o', tar, ref]);
    execFileSync('tar', ['-x', '-f', tar, '-C', dir], { stdio: ['ignore', 'ignore', 'pipe'] });
  } finally {
    fs.rmSync(tar, { force: true });
  }
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  return dir;
}

function rodarVitest(dir, rotulo) {
  const saida = path.join(dir, 'vitest.json');
  const env = { ...process.env, ...AMBIENTE_FALSO };
  const t0 = Date.now();
  const r = spawnSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${saida}`], {
    cwd: dir,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 256 * 1024 * 1024,
  });
  const ms = Date.now() - t0;
  if (!fs.existsSync(saida)) {
    const cauda = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-15).join('\n');
    throw new Error(`vitest (${rotulo}) nao escreveu ${saida} (status ${r.status}):\n${cauda}`);
  }
  console.log(`vitest ${rotulo}: status ${r.status} · ${ms} ms`);
  return JSON.parse(fs.readFileSync(saida, 'utf8'));
}

function relativo(dir, nome) {
  let n = nome;
  try {
    n = fs.realpathSync(nome);
  } catch {
    /* arquivo pode não existir mais; usa o nome cru */
  }
  const rel = path.relative(dir, n);
  return rel.startsWith('..') ? nome : rel;
}

/* Conjunto de ids de falha + lista de arquivos do relatório. */
function falhas(rel, dir, rotulo) {
  const ids = new Set();
  const arquivos = new Set();
  for (const tr of rel.testResults || []) {
    const p = relativo(dir, tr.name);
    arquivos.add(p);
    const reprovadas = (tr.assertionResults || []).filter((a) => a.status === 'failed');
    for (const a of reprovadas) ids.add(`${p} > ${a.fullName || [...(a.ancestorTitles || []), a.title].join(' ')}`);
    if (tr.status !== 'passed' && reprovadas.length === 0) {
      ids.add(`${p} > [SUITE]`);
      const msg = String(tr.message || '').split('\n').slice(0, 3).join(' | ').slice(0, 300);
      console.log(`  [SUITE] ${rotulo} ${p} (status ${tr.status}): ${msg}`);
    }
  }
  return { ids, arquivos };
}

function imprimir(titulo, conj) {
  const l = [...conj].sort();
  console.log(`${titulo} (${l.length}):`);
  for (const x of l) console.log(`  - ${x}`);
}

function principal() {
  const shaBase = resolverRef(BASE_REF);
  if (!shaBase) {
    console.error(`vitest delta: ${BASE_REF} nao resolve — a base da fase (fixada pelo 50-01 Step 0) e obrigatoria`);
    process.exit(1);
  }
  const sujo = git(['status', '--porcelain', '--', ...ESCOPO_LIMPO]).trim();
  if (sujo) {
    console.error(`vitest delta: arvore rastreada com alteracao nao commitada em ${ESCOPO_LIMPO.join(' ')} — o portao julga codigo COMMITADO:\n${sujo}`);
    process.exit(1);
  }
  const shaHead = resolverRef('HEAD');
  const dirs = [];
  let codigo = 1;
  try {
    const dBase = extrair(shaBase, 'base');
    dirs.push(dBase);
    const dHead = extrair(shaHead, 'head');
    dirs.push(dHead);
    fs.writeFileSync(path.join(dHead, MORDIDA_REL), MORDIDA_SRC, 'utf8');

    const rBase = rodarVitest(dBase, `base ${shaBase.slice(0, 7)}`);
    const rHead = rodarVitest(dHead, `head ${shaHead.slice(0, 7)}`);
    const fb = falhas(rBase, dBase, 'base');
    const fh = falhas(rHead, dHead, 'head');

    // (1) mordida
    const idsMordida = [...fh.ids].filter((x) => x.startsWith(`${MORDIDA_REL} > `));
    const mordidaOk = idsMordida.length > 0 && idsMordida.every((x) => !fb.ids.has(x));
    for (const x of idsMordida) fh.ids.delete(x);
    const mordidaTotal = (rHead.testResults || [])
      .filter((tr) => relativo(dHead, tr.name) === MORDIDA_REL)
      .reduce((n, tr) => n + (tr.assertionResults || []).length, 0);
    fh.arquivos.delete(MORDIDA_REL);

    // (2) pisos
    let pisosOk = true;
    if (!(rBase.numTotalTests > 0) || !(rHead.numTotalTests > 0)) {
      console.log(`PISO: numTotalTests base=${rBase.numTotalTests} head=${rHead.numTotalTests} — relatorio vazio`);
      pisosOk = false;
    }
    const sumiram = [...fb.arquivos].filter((p) => !fh.arquivos.has(p)).sort();
    for (const p of sumiram) console.log(`ARQUIVO SUMIU: ${p}`);
    if (sumiram.length) pisosOk = false;

    // (3) conjuntos
    const novas = new Set([...fh.ids].filter((x) => !fb.ids.has(x)));
    const corrigidas = new Set([...fb.ids].filter((x) => !fh.ids.has(x)));
    const pre = new Set([...fh.ids].filter((x) => fb.ids.has(x)));
    imprimir('pre-existentes (falham na base e em HEAD)', pre);
    imprimir('corrigidas (falham na base, passam em HEAD)', corrigidas);
    imprimir('NOVAS (falham em HEAD, passavam na base)', novas);
    console.log(`mordida: ${idsMordida.length ? idsMordida.join(' ; ') : '(nenhum id da mordida no relatorio de HEAD)'} → ${mordidaOk ? 'acusada como nova' : 'NAO acusada'}`);

    const headTotal = rHead.numTotalTests - mordidaTotal;
    const headFalhas = rHead.numFailedTests - idsMordida.length;
    console.log(
      `vitest delta: base=${shaBase.slice(0, 7)} ${rBase.numTotalTests}/${rBase.numFailedTests} · head=${shaHead.slice(0, 7)} ${headTotal}/${headFalhas} · pre-existentes=${pre.size} · corrigidas=${corrigidas.size} · novas=${novas.size} · mordida=${mordidaOk ? 'ok' : 'FALHOU'}`
    );
    codigo = novas.size === 0 && pisosOk && mordidaOk ? 0 : 1;
  } catch (e) {
    console.error(`vitest delta: ERRO — ${e.message}`);
    codigo = 1;
  } finally {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  }
  process.exit(codigo);
}

if (require.main === module) principal();
