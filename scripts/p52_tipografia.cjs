#!/usr/bin/env node
'use strict';
/*
 * p52_tipografia.cjs — a varredura do contrato tipográfico da Phase 52 (52-UI-SPEC §Typography,
 * «Varredura do executor»), sobre as LINHAS ACRESCENTADAS pela fase desde a base, nunca sobre
 * arquivos inteiros (vários arquivos tocados carregam herança fora do escopo, medida na UI-SPEC).
 *
 * O CONTRATO. Quatro tamanhos — 14/16/24/48 (`text-sm`/`text-base`/`text-2xl`/`text-5xl`) — e dois
 * pesos — 400/600. Nenhuma variante responsiva de tamanho. O padrão é o da UI-SPEC, traduzido para
 * RegExp do JS com as mesmas classes (`[:alnum:]` → `A-Za-z0-9`):
 *
 *   (^|[^-[:alnum:]])((sm|md|lg):)?text-(xs|lg|xl|[346789]xl|\[[0-9]+px\])([^-[:alnum:]]|$)
 *   | md:text-2xl
 *   | font-(medium|bold)([^-[:alnum:]]|$)
 *
 * Acusa `text-xs`, `text-[13px]`, `text-xl md:text-2xl`, `text-3xl`, `font-medium`, `text-lg font-bold`;
 * não acusa `text-2xl font-semibold`, `text-5xl font-semibold`, `text-base`, `text-white/70`,
 * `text-sm font-semibold` — o `--auto-teste` prova as onze amostras contra a MESMA função `acusa()`
 * que o uso normal chama (um teste sobre uma cópia do padrão não morderia nada).
 *
 * Uso:
 *   node scripts/p52_tipografia.cjs --base <ref> [--permitir-vazio] -- <caminhos…>
 *     roda `git diff <base>..HEAD -U0 -- <caminhos> ':!src/**\/__tests__/**'`, fica com as linhas que
 *     começam por `+` e não por `+++`, e aplica `acusa()` a cada uma, com o arquivo do hunk.
 *   node scripts/p52_tipografia.cjs --auto-teste
 *
 * Saída:
 *   TIPOGRAFIA OK (<n> linhas acrescentadas varridas)                          exit 0
 *   TIPOGRAFIA FORA DO CONTRATO: <arquivo>:<trecho>   (uma linha por achado)   exit 1
 *   TIPOGRAFIA VACUA: nenhuma linha acrescentada …   — zero linhas não provam nada;
 *                    só passa com `--permitir-vazio` (e então diz que foi vazia)  exit 1
 *   TIPOGRAFIA ERRO: …  (uso errado, base que não resolve, git que falha)       exit 1
 *
 * Sem dependências: Node built-ins e git. Só lê.
 */

const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const PADRAO =
  /(^|[^-A-Za-z0-9])((sm|md|lg):)?text-(xs|lg|xl|[346789]xl|\[[0-9]+px\])([^-A-Za-z0-9]|$)|md:text-2xl|font-(medium|bold)([^-A-Za-z0-9]|$)/;

/* A ÚNICA função de casamento — chamada pelo uso normal E pelo auto-teste. */
function acusa(linha) {
  return PADRAO.test(linha);
}

/*
 * Julga o texto de um `git diff -U0`: as linhas acrescentadas (começam por `+`, não por `+++`), cada
 * uma com o arquivo do hunk (`+++ b/<arquivo>`). Pura: devolve { codigo, linhas, achados, saida[] }.
 */
function julgarDiff(texto, { permitirVazio = false } = {}) {
  let arquivo = '?';
  let linhas = 0;
  const achados = [];
  for (const l of String(texto).split('\n')) {
    if (l.startsWith('+++')) {
      const m = l.match(/^\+\+\+ (?:b\/)?(.*)$/);
      arquivo = m ? m[1] : '?';
      continue;
    }
    if (!l.startsWith('+')) continue;
    linhas += 1;
    if (acusa(l)) achados.push(`${arquivo}:${l.slice(1).trim().slice(0, 200)}`);
  }
  const saida = [];
  let codigo;
  if (achados.length) {
    for (const a of achados) saida.push(`TIPOGRAFIA FORA DO CONTRATO: ${a}`);
    codigo = 1;
  } else if (linhas === 0) {
    if (permitirVazio) {
      saida.push('TIPOGRAFIA OK (0 linhas acrescentadas varridas — vazio permitido por --permitir-vazio)');
      codigo = 0;
    } else {
      saida.push('TIPOGRAFIA VACUA: nenhuma linha acrescentada nos caminhos pedidos — zero linhas nao provam nada (use --permitir-vazio so se o vazio for o esperado)');
      codigo = 1;
    }
  } else {
    saida.push(`TIPOGRAFIA OK (${linhas} linhas acrescentadas varridas)`);
    codigo = 0;
  }
  return { codigo, linhas, achados, saida };
}

function lerDiff(base, caminhos) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '-q', `${base}^{commit}`], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    throw new Error(`base nao resolve: ${base}`);
  }
  return execFileSync('git', ['--no-optional-locks', 'diff', `${base}..HEAD`, '-U0', '--no-color', '--', ...caminhos, ':!src/**/__tests__/**'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 256 * 1024 * 1024,
  });
}

/* ------------------------------------------------------------------------------------------------
 * AUTO-TESTE — sem git, sem rede: as amostras da UI-SPEC contra `acusa()`, e diffs simulados contra
 * `julgarDiff()` (o mesmo caminho do uso normal depois do `git diff`).
 * ---------------------------------------------------------------------------------------------- */

const ACUSADAS = ['text-xs', 'text-[13px]', 'text-xl md:text-2xl', 'text-3xl', 'font-medium', 'text-lg font-bold'];
const ACEITAS = ['text-2xl font-semibold', 'text-5xl font-semibold', 'text-base', 'text-white/70', 'text-sm font-semibold'];

const DIFF = (corpo) => `diff --git a/src/x.tsx b/src/x.tsx\n--- a/src/x.tsx\n+++ b/src/x.tsx\n@@ -0,0 +1,${corpo.length} @@\n${corpo.map((l) => `+${l}`).join('\n')}\n`;

function autoTeste() {
  let n = 0;
  const falhas = [];
  const conferir = (nome, ok, detalhe) => {
    n += 1;
    console.log(`  ${ok ? 'ok    ' : 'FALHOU'} ${String(n).padStart(2, ' ')} ${nome}${ok ? '' : ` — ${detalhe}`}`);
    if (!ok) falhas.push(nome);
  };
  // As amostras como classe dentro de uma linha de JSX, do jeito que chegam no diff.
  for (const a of ACUSADAS) conferir(`acusa «${a}»`, acusa(`+        <p className="${a} text-white">x</p>`), 'amostra proibida NAO acusada (lado errado)');
  for (const a of ACEITAS) conferir(`aceita «${a}»`, !acusa(`+        <p className="${a} text-white">x</p>`), 'amostra permitida ACUSADA (lado errado)');
  // julgarDiff: vazio recusa; vazio permitido passa; uma linha fora do contrato recusa com o arquivo;
  // tudo dentro passa com a contagem.
  const v = julgarDiff('');
  conferir('diff vazio → TIPOGRAFIA VACUA, codigo 1', v.codigo === 1 && /^TIPOGRAFIA VACUA:/.test(v.saida[0]), `codigo ${v.codigo}: ${v.saida[0]}`);
  const vp = julgarDiff('', { permitirVazio: true });
  conferir('diff vazio com --permitir-vazio → codigo 0', vp.codigo === 0 && /^TIPOGRAFIA OK \(0 /.test(vp.saida[0]), `codigo ${vp.codigo}: ${vp.saida[0]}`);
  const so_cabecalho = julgarDiff('diff --git a/src/x.tsx b/src/x.tsx\n--- a/src/x.tsx\n+++ b/src/x.tsx\n@@ -3 +2,0 @@\n-  removida\n');
  conferir('diff so com remocao (zero linhas acrescentadas) → TIPOGRAFIA VACUA', so_cabecalho.codigo === 1 && /^TIPOGRAFIA VACUA:/.test(so_cabecalho.saida[0]), `codigo ${so_cabecalho.codigo}`);
  const fora = julgarDiff(DIFF(['<h2 className="text-2xl font-semibold">ok</h2>', '<span className="text-xs">ruim</span>']));
  conferir(
    'linha fora do contrato → TIPOGRAFIA FORA DO CONTRATO: src/x.tsx:…, codigo 1',
    fora.codigo === 1 && fora.achados.length === 1 && fora.saida[0].startsWith('TIPOGRAFIA FORA DO CONTRATO: src/x.tsx:<span className="text-xs">'),
    `codigo ${fora.codigo}: ${fora.saida.join(' | ')}`
  );
  const dentro = julgarDiff(DIFF(['<h2 className="text-2xl font-semibold">ok</h2>', '<p className="text-base text-white/70">ok</p>', '<b className="text-sm font-semibold">ok</b>']));
  conferir('tudo dentro → TIPOGRAFIA OK (3 linhas …), codigo 0', dentro.codigo === 0 && dentro.saida[0] === 'TIPOGRAFIA OK (3 linhas acrescentadas varridas)', `codigo ${dentro.codigo}: ${dentro.saida[0]}`);
  const DECLARADOS = ACUSADAS.length + ACEITAS.length + 5;
  if (n !== DECLARADOS) {
    console.log(`auto-teste FALHOU: rodaram ${n} casos, declarados ${DECLARADOS}`);
    return 1;
  }
  if (falhas.length) {
    console.log(`auto-teste FALHOU: ${falhas.length}/${n} (${falhas.join(' | ')})`);
    return 1;
  }
  console.log(`auto-teste ok: ${n} casos (${ACUSADAS.length} acusadas + ${ACEITAS.length} aceitas + 5 de julgamento)`);
  return 0;
}

function principal() {
  const a = process.argv.slice(2);
  if (a.length === 1 && a[0] === '--auto-teste') process.exit(autoTeste());
  let base = null;
  let permitirVazio = false;
  const caminhos = [];
  let depois = false;
  for (let i = 0; i < a.length; i += 1) {
    if (depois) caminhos.push(a[i]);
    else if (a[i] === '--') depois = true;
    else if (a[i] === '--base' && i + 1 < a.length) base = a[++i];
    else if (a[i] === '--permitir-vazio') permitirVazio = true;
    else {
      console.error(`TIPOGRAFIA ERRO: opcao desconhecida ou sem valor: ${a[i]}`);
      process.exit(1);
    }
  }
  if (!base || !caminhos.length) {
    console.error('TIPOGRAFIA ERRO: uso: node scripts/p52_tipografia.cjs --base <ref> [--permitir-vazio] -- <caminhos…>   |   --auto-teste');
    process.exit(1);
  }
  let r;
  try {
    r = julgarDiff(lerDiff(base, caminhos), { permitirVazio });
  } catch (e) {
    console.error(`TIPOGRAFIA ERRO: ${String(e && e.message).split('\n')[0]}`);
    process.exit(1);
  }
  for (const l of r.saida) (r.codigo === 0 ? console.log : console.error)(l);
  process.exit(r.codigo);
}

module.exports = { acusa, julgarDiff, PADRAO };

if (require.main === module) principal();
