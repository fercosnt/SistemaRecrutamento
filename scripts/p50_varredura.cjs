#!/usr/bin/env node
'use strict';
/*
 * p50_varredura.cjs — REDE DE REGRESSÃO da Phase 50, selecionada POR FORMA (50-09 Task 3).
 *
 * O QUE ELA É — e o que ela NÃO é.
 *   É a rede que pega «quebra que ninguém listou»: todo smoke de `supabase/tests/*.sql` que NOMEIA
 *   um objeto reescrito pela fase roda duas vezes, sempre dentro do ENVELOPE QUE ABORTA de
 *   `scripts/p50_ensaio.cjs` (mesma composição, mesma checagem de persistência), e o par de
 *   resultados vira um veredito. NÃO é a prova da D-08: o estado intocado de
 *   `anonimizar_candidato` / `plano_exclusao_titular` é provado pelas checagens que precisam
 *   passar (a impressão digital início × fim dentro dos PÓS-PORTÕES de 50-04/50-05, e a conferência
 *   ao vivo antes × depois do 50-10). Uma linha `INCONCLUSIVO` ou `pre-existente` do p45 aqui vai
 *   para a lista do 50-10 — nunca é lida como evidência da D-08.
 *
 * SELEÇÃO POR FORMA. Os NOMES vigiados são o escopo deliberado da fase e saem das PRÓPRIAS
 *   migrations da fase (`MIGS` do p50_ensaio), lidas do disco nesta execução — nenhuma lista literal
 *   que envelheça quando a fase ganhar um objeto:
 *     funções   `CREATE [OR REPLACE] FUNCTION public.<nome>`  (as reescritas + o helper)
 *     policies  `ALTER POLICY <nome> ON`
 *     vistas    `ALTER VIEW public.<nome>`
 *   O conjunto de ARQUIVOS é descoberto: todo `supabase/tests/*.sql` cujo texto casa a alternância
 *   desses nomes (com borda de palavra), menos os que casam `teardown`, `retroativos`,
 *   `p46_fixture_elegivel` e `^p50_` (estes têm os próprios portões). A contagem e a lista saem
 *   impressas, com a população de nomes.
 *
 * MODOS
 *   --modo=ensaio            para cada arquivo: (A) `--sem-migracoes` (objetos VIVOS) e (B) o prefixo
 *                            padrão (as migrations p50 fora do ledger), ambos abortando. Antes do
 *                            apply do 50-10, A = sem a expansão e B = com ela.
 *   --modo=rodada --rotulo=antes|depois
 *                            cada arquivo UMA vez, `--sem-migracoes` (objetos vivos), resultado em
 *                            `${TMPDIR:-/tmp}/p50_varredura_<rotulo>.json` — para rodar ao redor do
 *                            apply do 50-10.
 *   --comparar               lê os dois JSONs da rodada e julga antes (A) × depois (B).
 *   --so=<trecho>            restringe aos arquivos cujo nome contém o trecho (depuração). A linha
 *                            final passa a começar com `varredura-parcial:` — uma execução filtrada
 *                            NUNCA satisfaz o portão.
 *
 * VEREDITO por arquivo
 *   ok                  verde/verde
 *   esperado-reescrito  vermelho → verde, SÓ para arquivo alterado desde `refs/gsd/50-expansao/base`
 *                       (calculado com git, nunca com lista)
 *   REGRESSAO           verde → vermelho
 *   pre-existente       vermelho/vermelho com a MESMA primeira cláusula reprovada
 *   INVESTIGAR          vermelho/vermelho com cláusula diferente, ou vermelho → verde num arquivo
 *                       que a fase NÃO alterou
 *   INCONCLUSIVO        timeout (55P03/57014) ou 40001 em qualquer das duas execuções, depois de
 *                       UMA repetição (~60 s depois) — nunca concluído
 *   Primeira cláusula: `/([A-Z0-9-]+ FAIL \([^)]*\))/`; sem ela, o erro (SQLSTATE + mensagem, com
 *   uuids e números normalizados, para que duas execuções do MESMO erro comparem iguais).
 *
 * SAÍDA: a tabela e a linha final
 *   varredura: <n> arquivos · ok=<a> reescritos=<b> pre-existentes=<c> inconclusivos=<d> · regressoes=<r> investigar=<i>
 *   Exit 1 se regressoes > 0 ou investigar > 0, ou se qualquer execução PERSISTIU (a varredura para
 *   ali). Antes e depois de CADA execução, `capturar()` do p50_ensaio lê (só leitura) o estado que
 *   nenhum ensaio pode mudar.
 *
 * Sem dependências: Node built-ins + o próprio p50_ensaio.cjs.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const E = require('./p50_ensaio.cjs');

const ROOT = E.ROOT;
const TESTS = path.join(ROOT, 'supabase', 'tests');
const BASE_REF = 'refs/gsd/50-expansao/base';
const EXCLUI = [/teardown/, /retroativos/, /p46_fixture_elegivel/, /^p50_/];
const RE_CLAUSULA = /([A-Z0-9-]+ FAIL \([^)]*\))/;
const ESPERA_REPETICAO_MS = 60000;

function dormir(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/* Nomes vigiados, lidos POR FORMA das migrations da fase. */
function nomesDaFase() {
  const funcoes = new Set();
  const politicas = new Set();
  const vistas = new Set();
  for (const m of E.MIGS) {
    const src = fs.readFileSync(path.join(ROOT, m), 'utf8');
    for (const x of src.matchAll(/^CREATE (?:OR REPLACE )?FUNCTION public\.([a-z_][a-z0-9_]*)\s*\(/gim)) funcoes.add(x[1]);
    for (const x of src.matchAll(/^ALTER POLICY ([a-z_][a-z0-9_]*) ON /gim)) politicas.add(x[1]);
    for (const x of src.matchAll(/^ALTER VIEW public\.([a-z_][a-z0-9_]*)/gim)) vistas.add(x[1]);
  }
  return { funcoes: [...funcoes].sort(), politicas: [...politicas].sort(), vistas: [...vistas].sort() };
}

function selecionar(nomes, so) {
  const todos = [...nomes.funcoes, ...nomes.politicas, ...nomes.vistas];
  if (!nomes.funcoes.length || !nomes.politicas.length || !nomes.vistas.length) {
    throw new Error(`selecao vazia por forma (funcoes=${nomes.funcoes.length} politicas=${nomes.politicas.length} vistas=${nomes.vistas.length}) — as migrations da fase mudaram de forma; a rede ficaria cega`);
  }
  const re = new RegExp(`\\b(${todos.join('|')})\\b`);
  const arquivos = fs.readdirSync(TESTS).filter((f) => f.endsWith('.sql')).sort();
  const selecionados = [];
  const excluidos = [];
  for (const f of arquivos) {
    const txt = fs.readFileSync(path.join(TESTS, f), 'utf8');
    if (!re.test(txt)) continue;
    if (EXCLUI.some((x) => x.test(f))) { excluidos.push(f); continue; }
    if (so && !f.includes(so)) continue;
    selecionados.push(f);
  }
  return { selecionados, excluidos, populacaoSql: arquivos.length };
}

/* Arquivo alterado desde a base da expansão (árvore de trabalho × ref). */
function alteradoDesdeBase(f) {
  try {
    execFileSync('git', ['diff', '--quiet', BASE_REF, '--', path.join('supabase', 'tests', f)], { cwd: ROOT, stdio: 'ignore' });
    return false;
  } catch (e) {
    if (e.status === 1) return true;
    throw new Error(`git diff contra ${BASE_REF} falhou para ${f} (status ${e.status})`);
  }
}

function normalizar(s) {
  return String(s)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\b\d+(\.\d+)?\b/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

/*
 * ARQUIVO SÓ-DE-RESULTADO (sonda de prontidão). Um arquivo SEM `RAISE EXCEPTION`, sem `DO`, sem
 * corpo `$…$`, que é (opcionalmente) `SET TRANSACTION READ ONLY;` + UMA consulta `SELECT`/`WITH`,
 * diz o veredito numa LINHA DE BOOLEANOS — que o envelope que aborta nunca devolve (o sentinela
 * aborta a requisição). Rodado como está, ele sairia VERDE em qualquer estado: portão vazio. A
 * varredura o EMBRULHA: a consulta vira a fonte de uma `set_config('p50.evidencia', …)` que lista
 * `coluna:true|false|null|nao-booleano` de cada linha, e o sentinela carrega isso para fora. VERDE
 * só com ≥ 1 linha e TODA coluna `true`; senão VERMELHO com cláusula `FALSO [colunas]`.
 */
const RE_SO_RESULTADO_INICIO = /^\s*SET TRANSACTION READ ONLY;\s*\n/i;
function soResultado(txt) {
  const semCab = txt.replace(RE_SO_RESULTADO_INICIO, '');
  const semComent = semCab.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ').replace(/'(?:[^']|'')*'/g, "''");
  if (/RAISE\s+EXCEPTION/i.test(semComent) || /\$[A-Za-z_]*\$/.test(semComent) || /^\s*DO\b/im.test(semComent)) return null;
  const partes = semComent.split(';').map((x) => x.trim()).filter(Boolean);
  if (partes.length !== 1 || !/^(WITH|SELECT)\b/i.test(partes[0])) return null;
  const corpo = semCab.trim().replace(/;\s*$/, '');
  const cab = RE_SO_RESULTADO_INICIO.test(txt) ? 'SET TRANSACTION READ ONLY;\n' : '';
  return (
    `${cab}-- p50_varredura: arquivo só-de-resultado embrulhado (a linha de booleanos sai pelo sentinela)\n` +
    "SELECT set_config('p50.evidencia', 'RS:' || coalesce((\n" +
    "  SELECT string_agg(j.key || ':' || CASE WHEN jsonb_typeof(j.value) = 'boolean' THEN j.value::text\n" +
    "                                        WHEN jsonb_typeof(j.value) = 'null' THEN 'null' ELSE 'nao-booleano' END, ',' ORDER BY t.n, j.key)\n" +
    '    FROM (SELECT row_number() OVER () AS n, to_jsonb(q) AS r FROM (\n' +
    `${corpo}\n` +
    '    ) q) t, jsonb_each(t.r) j\n' +
    "  ), ''), false);\n"
  );
}

/* Julga a saída de UMA execução do envelope (mesma regra do CLI do p50_ensaio). */
function julgar(r, soRes) {
  if (r.timeout) return { estado: 'TIMEOUT', clausula: r.timeout, detalhe: r.timeout };
  if (r.serializacao) return { estado: 'TIMEOUT', clausula: '40001', detalhe: 'SERIALIZACAO (40001)' };
  const temFail = /FAIL \(/.test(r.out);
  let smokeOk = true;
  if (r.sentinela && r.smoke50 && r.smoke50 !== 'n/a') {
    const [p, e] = r.smoke50.split('/');
    smokeOk = p === e;
  }
  if (soRes && r.sentinela && !temFail) {
    const ev = (r.evidencia || '').trim();
    if (!ev.startsWith('RS:')) return { estado: 'VERMELHO', clausula: 'SO-RESULTADO sem evidencia', detalhe: `evidencia=${ev.slice(0, 200)}` };
    const pares = ev.slice(3).split(',').filter(Boolean);
    const falsos = pares.filter((p) => !p.endsWith(':true')).map((p) => p.replace(/:(false|null|nao-booleano)$/, '=$1'));
    if (!pares.length) return { estado: 'VERMELHO', clausula: 'SO-RESULTADO sem linha', detalhe: 'a consulta nao devolveu linha' };
    if (falsos.length) return { estado: 'VERMELHO', clausula: `FALSO [${falsos.join(',')}]`, detalhe: `${falsos.length} de ${pares.length} colunas nao-true` };
    return { estado: 'VERDE', clausula: null, detalhe: `${pares.length} colunas true` };
  }
  if (r.sentinela && !temFail && smokeOk) return { estado: 'VERDE', clausula: null, detalhe: '' };
  const m = r.out.match(RE_CLAUSULA);
  const det = E.primeiraFalha(r.out);
  return { estado: 'VERMELHO', clausula: m ? m[1] : `ERRO ${normalizar(det)}`, detalhe: det.slice(0, 220) };
}

/* Uma execução no envelope que aborta, com a checagem de persistência do p50_ensaio. */
function executar(f, modo) {
  const estado = E.lerEstado();
  const plano = E.planejar(modo === 'sem' ? 'nenhuma' : 'padrao', [], estado);
  const soRes = soResultado(fs.readFileSync(path.join(TESTS, f), 'utf8'));
  let alvo = path.join('supabase', 'tests', f);
  if (soRes) {
    alvo = path.join(os.tmpdir(), `p50_varredura_rs_${process.pid}_${f}`);
    fs.writeFileSync(alvo, soRes, 'utf8');
  }
  const corpo = E.compor({ prefixadas: plano.prefixadas, arquivos: [alvo] });
  const rotulo = `varredura_${modo}_${f.replace(/\W/g, '_')}`;
  const umaVez = () => {
    const antes = E.capturar();
    let r = E.rodar(corpo, rotulo);
    if (r.serializacao) r = E.rodar(corpo, `${rotulo}_rep40001`);
    const depois = E.capturar();
    const dif = E.diferencas(antes, depois);
    if (dif.length) {
      console.error(`PERSISTIU em ${f} (${modo}): ${dif.join(' ; ')}`);
      console.error('varredura INTERROMPIDA: um ensaio deixou rastro em PROD — nada mais roda');
      process.exit(1);
    }
    return r;
  };
  let r = umaVez();
  let j = julgar(r, !!soRes);
  if (j.estado === 'TIMEOUT') {
    console.error(`  … ${f} (${modo}): ${j.detalhe} — inconclusivo; repetindo UMA vez em ~${ESPERA_REPETICAO_MS / 1000} s`);
    dormir(ESPERA_REPETICAO_MS);
    r = umaVez();
    j = julgar(r, !!soRes);
  }
  if (soRes) fs.rmSync(alvo, { force: true });
  return { ...j, ms: r.ms, prefixadas: plano.prefixadas.map(E.versao), soResultado: !!soRes };
}

function veredito(f, a, b) {
  if (a.estado === 'TIMEOUT' || b.estado === 'TIMEOUT') return 'INCONCLUSIVO';
  if (a.estado === 'VERDE' && b.estado === 'VERDE') return 'ok';
  if (a.estado === 'VERDE' && b.estado === 'VERMELHO') return 'REGRESSAO';
  if (a.estado === 'VERMELHO' && b.estado === 'VERDE') return alteradoDesdeBase(f) ? 'esperado-reescrito' : 'INVESTIGAR';
  return a.clausula === b.clausula ? 'pre-existente' : 'INVESTIGAR';
}

function relatorio(linhas, rotA, rotB, parcial) {
  const cont = { ok: 0, 'esperado-reescrito': 0, 'pre-existente': 0, INCONCLUSIVO: 0, REGRESSAO: 0, INVESTIGAR: 0 };
  console.log('');
  console.log(`| arquivo | ${rotA} | ${rotB} | primeira cláusula reprovada (${rotA} → ${rotB}) | veredito |`);
  console.log('|---|---|---|---|---|');
  for (const l of linhas) {
    cont[l.veredito] += 1;
    const ca = l.a.clausula || '—';
    const cb = l.b.clausula || '—';
    console.log(`| ${l.arquivo}${l.a.soResultado ? ' (só-resultado, embrulhado)' : ''} | ${l.a.estado} | ${l.b.estado} | ${ca === cb ? ca : `${ca} → ${cb}`} | ${l.veredito} |`);
  }
  const lista50 = linhas.filter((l) => l.veredito === 'pre-existente' || l.veredito === 'INCONCLUSIVO');
  if (lista50.length) {
    console.log('');
    console.log('PARA O 50-10 (repetir ao vivo; nunca ler como evidência):');
    for (const l of lista50) console.log(`  - ${l.arquivo}: ${l.veredito} (${l.a.clausula || l.b.clausula})`);
  }
  for (const l of linhas.filter((x) => x.veredito === 'REGRESSAO' || x.veredito === 'INVESTIGAR')) {
    console.log(`DETALHE ${l.veredito} ${l.arquivo}: ${rotA}=${l.a.detalhe || 'verde'} | ${rotB}=${l.b.detalhe || 'verde'}`);
  }
  console.log('');
  console.log(
    `${parcial ? 'varredura-parcial' : 'varredura'}: ${linhas.length} arquivos · ok=${cont.ok} reescritos=${cont['esperado-reescrito']} pre-existentes=${cont['pre-existente']} inconclusivos=${cont.INCONCLUSIVO} · regressoes=${cont.REGRESSAO} investigar=${cont.INVESTIGAR}`
  );
  return cont.REGRESSAO > 0 || cont.INVESTIGAR > 0 ? 1 : 0;
}

function arqRodada(rotulo) {
  return path.join(process.env.TMPDIR || os.tmpdir(), `p50_varredura_${rotulo}.json`);
}

function principal() {
  const argv = process.argv.slice(2);
  const opt = (k) => (argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || null;
  const modo = opt('modo');
  const so = opt('so');
  const comparar = argv.includes('--comparar');

  if (comparar) {
    const A = JSON.parse(fs.readFileSync(arqRodada('antes'), 'utf8'));
    const B = JSON.parse(fs.readFileSync(arqRodada('depois'), 'utf8'));
    const nomes = [...new Set([...Object.keys(A.arquivos), ...Object.keys(B.arquivos)])].sort();
    const linhas = nomes.map((f) => {
      const a = A.arquivos[f] || { estado: 'TIMEOUT', clausula: 'AUSENTE na rodada antes', detalhe: 'ausente' };
      const b = B.arquivos[f] || { estado: 'TIMEOUT', clausula: 'AUSENTE na rodada depois', detalhe: 'ausente' };
      return { arquivo: f, a, b, veredito: veredito(f, a, b) };
    });
    console.log(`comparar: antes=${A.quando} (${A.parcial ? 'PARCIAL' : 'completa'}) · depois=${B.quando} (${B.parcial ? 'PARCIAL' : 'completa'})`);
    process.exit(relatorio(linhas, 'antes', 'depois', A.parcial || B.parcial));
  }

  if (modo !== 'ensaio' && modo !== 'rodada') {
    console.error('uso: --modo=ensaio | --modo=rodada --rotulo=antes|depois | --comparar   [--so=<trecho>]');
    process.exit(2);
  }
  const nomes = nomesDaFase();
  const { selecionados, excluidos, populacaoSql } = selecionar(nomes, so);
  console.log(`nomes da fase (por forma, de ${E.MIGS.length} migrations): funcoes=${nomes.funcoes.length} politicas=${nomes.politicas.length} vistas=${nomes.vistas.length}`);
  console.log(`  funcoes: ${nomes.funcoes.join(', ')}`);
  console.log(`  politicas: ${nomes.politicas.join(', ')}`);
  console.log(`  vistas: ${nomes.vistas.join(', ')}`);
  console.log(`selecionados: ${selecionados.length} de ${populacaoSql} supabase/tests/*.sql (excluidos por nome: ${excluidos.join(', ') || '-'})${so ? ` · FILTRO --so=${so}` : ''}`);
  for (const f of selecionados) console.log(`  - ${f}`);
  if (!selecionados.length) {
    console.error('NENHUM arquivo selecionado — a rede estaria vazia');
    process.exit(1);
  }

  if (modo === 'rodada') {
    const rotulo = opt('rotulo');
    if (rotulo !== 'antes' && rotulo !== 'depois') {
      console.error('--modo=rodada exige --rotulo=antes|depois');
      process.exit(2);
    }
    const saida = { quando: new Date().toISOString(), rotulo, parcial: !!so, arquivos: {} };
    for (const f of selecionados) {
      const r = executar(f, 'sem');
      saida.arquivos[f] = r;
      console.log(`  ${r.estado.padEnd(8)} ${f} ${r.clausula ? `· ${r.clausula}` : ''} · ${r.ms} ms`);
    }
    fs.writeFileSync(arqRodada(rotulo), JSON.stringify(saida, null, 2));
    console.log(`rodada ${rotulo}: ${selecionados.length} arquivos → ${arqRodada(rotulo)}`);
    process.exit(0);
  }

  const linhas = [];
  for (const f of selecionados) {
    const a = executar(f, 'sem');
    const b = executar(f, 'com');
    const v = veredito(f, a, b);
    linhas.push({ arquivo: f, a, b, veredito: v });
    console.log(`  ${v.padEnd(18)} ${f} · A=${a.estado}${a.clausula ? ` (${a.clausula})` : ''} ${a.ms} ms · B=${b.estado}${b.clausula ? ` (${b.clausula})` : ''} prefixadas=[${b.prefixadas.join(',')}] ${b.ms} ms`);
  }
  process.exit(relatorio(linhas, 'A sem expansão', 'B com expansão', !!so));
}

module.exports = { nomesDaFase, selecionar, julgar, veredito, alteradoDesdeBase, normalizar, soResultado };

if (require.main === module) principal();
