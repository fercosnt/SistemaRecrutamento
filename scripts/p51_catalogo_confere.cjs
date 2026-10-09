#!/usr/bin/env node
'use strict';
/*
 * p51_catalogo_confere.cjs — «o catálogo vivo de `revisao_rejeicao` = o acréscimo 51-15 do
 * `docs/compliance/catalogo-vivo-44.json`», por IGUALDADE (WR-08 do 51-REVIEW-PORTAO-1).
 *
 * O QUE ESTAVA ERRADO. O verify 4 do Task 2 do 51-16 lia tipo, nulidade e ordinal de cada coluna viva,
 * mas só testava `JSON.stringify(catalogo).includes(nome)`: `id` aparece 926 vezes no arquivo,
 * `candidatura_id` 42, e `veredito`, `resultado`, `reaberta_em`… existem em outras tabelas. O teste não
 * pegava tipo ou nulidade divergentes, nem coluna do acréscimo que não foi ao ar (só vivo ⊆ arquivo) —
 * um portão que se apresentava como prova de igualdade sem medir igualdade.
 *
 * O QUE CONFERE AGORA. O acréscimo de `meta.acrescimos` cujo `tabelas` contém `revisao_rejeicao` tem de
 * ser EXATAMENTE UM; e, nas DUAS direções, por igualdade de conjunto:
 *   · `medicao` (as strings «<coluna> <data_type>[ NOT NULL] (<ordinal>)» que o 51-15 gravou da medição
 *     no ensaio) = o mesmo formato montado das colunas vivas (coluna, tipo, nulidade, ordinal);
 *   · `colunas` («revisao_rejeicao.<coluna>») = as colunas vivas.
 * Lista viva vazia, acréscimo sem `medicao`/`colunas`, ou tamanhos diferentes = FALHA (vacuidade não
 * prova igualdade).
 *
 * Uso:
 *   node scripts/p51_catalogo_confere.cjs --vivo            lê PROD (só leitura, `p46apply.cjs sql`)
 *   node scripts/p51_catalogo_confere.cjs --json <arquivo>  lê a lista viva de um arquivo — o JSON que
 *                                                           `supabase/tests/p51_catalogo_revisao_rejeicao.sql`
 *                                                           publica em `evidencia=` dentro do ensaio
 *   node scripts/p51_catalogo_confere.cjs --auto-teste      casos puros (sem rede)
 * Saída: `catalogo vivo de revisao_rejeicao = acrescimo 51-15 … (<n> colunas)` e código 0; senão
 *        `CATALOGO VIVO DIFERE DO ACRESCIMO: <motivos>` (stderr) e código 1.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TABELA = 'revisao_rejeicao';
const Q_VIVO =
  "set transaction read only; select coalesce(json_agg(json_build_object('c', c.column_name, 't', c.data_type, 'n', c.is_nullable, 'o', c.ordinal_position) " +
  'order by c.ordinal_position), \'[]\'::json) as cols from information_schema.columns c join information_schema.tables t ' +
  "on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE' " +
  `where c.table_schema = 'public' and c.table_name = '${TABELA}'`;

/* «<coluna> <data_type>[ NOT NULL] (<ordinal>)» — o formato de `medicao` do acréscimo 51-15. */
const formatar = (x) => `${x.c} ${x.t}${x.n === 'NO' ? ' NOT NULL' : ''} (${x.o})`;

/* Pura e total. vivo = [{c,t,n,o}], catalogo = o JSON inteiro do catalogo-vivo-44. */
function conferir(vivo, catalogo) {
  const erros = [];
  const acs = (((catalogo || {}).meta || {}).acrescimos || []).filter((a) => Array.isArray(a.tabelas) && a.tabelas.includes(TABELA));
  if (acs.length !== 1) return { ok: false, erros: [`${acs.length} acrescimo(s) de ${TABELA} no catalogo (exigido exatamente 1)`] };
  const ac = acs[0];
  if (!Array.isArray(vivo) || !vivo.length) erros.push('lista viva vazia (a tabela nao existe ou nao foi lida)');
  const A = Array.isArray(ac.medicao) ? ac.medicao : [];
  const CA = Array.isArray(ac.colunas) ? ac.colunas : [];
  if (!A.length) erros.push('acrescimo sem medicao');
  if (!CA.length) erros.push('acrescimo sem colunas');
  if (erros.length) return { ok: false, erros };
  const V = vivo.map(formatar);
  const CV = vivo.map((x) => `${TABELA}.${x.c}`);
  const fora = (a, b) => a.filter((x) => !b.includes(x));
  for (const x of fora(V, A)) erros.push(`vivo sem igual no acrescimo: «${x}»`);
  for (const x of fora(A, V)) erros.push(`acrescimo sem igual no vivo: «${x}»`);
  for (const x of fora(CV, CA)) erros.push(`coluna viva fora de colunas do acrescimo: ${x}`);
  for (const x of fora(CA, CV)) erros.push(`coluna do acrescimo fora do vivo: ${x}`);
  if (new Set(V).size !== V.length || new Set(A).size !== A.length) erros.push('entrada repetida (vivo ou acrescimo)');
  if (V.length !== A.length || CV.length !== CA.length) erros.push(`tamanhos: vivo=${V.length} medicao=${A.length} colunas=${CA.length}`);
  return { ok: erros.length === 0, erros, n: V.length, plano: ac.plano };
}

function lerVivo() {
  const s = execFileSync('node', [path.join(ROOT, 'p46apply.cjs'), 'sql', Q_VIVO], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
  return JSON.parse(s.slice(s.indexOf('[')))[0].cols || [];
}

function lerCatalogo() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/compliance/catalogo-vivo-44.json'), 'utf8'));
}

function autoTeste() {
  const cat = lerCatalogo();
  const ac = cat.meta.acrescimos.find((a) => (a.tabelas || []).includes(TABELA));
  // a lista viva «verdadeira» reconstruída do próprio acréscimo (o caso OK) — e cada deformação dela
  const base = ac.medicao.map((m) => {
    const x = m.match(/^(\S+) (.+?)( NOT NULL)? \((\d+)\)$/);
    return { c: x[1], t: x[2], n: x[3] ? 'NO' : 'YES', o: Number(x[4]) };
  });
  const clone = () => base.map((x) => ({ ...x }));
  const casos = [
    ['igual nas duas direcoes', clone(), true],
    ['coluna renomeada', clone().map((x) => (x.c === 'veredito' ? { ...x, c: 'veredito_x' } : x)), false],
    ['tipo diferente', clone().map((x) => (x.c === 'resultado' ? { ...x, t: 'character varying' } : x)), false],
    ['nulidade diferente', clone().map((x) => (x.c === 'rejeitado_por' ? { ...x, n: 'NO' } : x)), false],
    ['ordinal diferente', clone().map((x) => (x.c === 'origem' ? { ...x, o: 99 } : x)), false],
    ['coluna do acrescimo que nao foi ao ar', clone().filter((x) => x.c !== 'alerta_prazo_enviado_em'), false],
    ['coluna viva a mais', [...clone(), { c: 'extra', t: 'text', n: 'YES', o: 17 }], false],
    ['lista viva vazia', [], false],
    ['nome que existe em outra tabela trocado (id -> candidatura_id duplicado)', clone().map((x) => (x.c === 'id' ? { ...x, c: 'candidatura_id' } : x)), false],
  ];
  const casosCat = [
    ['zero acrescimos de revisao_rejeicao', { meta: { acrescimos: [] } }],
    ['dois acrescimos de revisao_rejeicao', { meta: { acrescimos: [ac, ac] } }],
  ];
  let falhas = 0;
  for (const [nome, vivo, esp] of casos) {
    const r = conferir(vivo, cat);
    const ok = r.ok === esp;
    if (!ok) falhas += 1;
    console.log(`  ${ok ? 'ok    ' : 'FALHOU'} ${nome}: ${r.ok ? 'igual' : r.erros.slice(0, 2).join('; ')}`);
  }
  for (const [nome, c] of casosCat) {
    const r = conferir(clone(), c);
    const ok = r.ok === false;
    if (!ok) falhas += 1;
    console.log(`  ${ok ? 'ok    ' : 'FALHOU'} ${nome}: ${r.ok ? 'igual' : r.erros[0]}`);
  }
  const n = casos.length + casosCat.length;
  console.log(falhas ? `auto-teste FALHOU: ${falhas}/${n}` : `auto-teste ok: ${n} casos`);
  return falhas ? 1 : 0;
}

function main() {
  const a = process.argv.slice(2);
  if (a.length === 1 && a[0] === '--auto-teste') process.exit(autoTeste());
  let vivo;
  try {
    if (a.length === 1 && a[0] === '--vivo') vivo = lerVivo();
    else if (a.length === 2 && a[0] === '--json') vivo = JSON.parse(fs.readFileSync(a[1] === '-' ? 0 : a[1], 'utf8'));
    else {
      console.error('CATALOGO VIVO DIFERE DO ACRESCIMO: uso: --vivo | --json <arquivo|-> | --auto-teste');
      process.exit(1);
    }
  } catch (e) {
    console.error(`CATALOGO VIVO DIFERE DO ACRESCIMO: leitura falhou (fail-closed): ${String(e && e.message).split('\n')[0]}`);
    process.exit(1);
  }
  const r = conferir(vivo, lerCatalogo());
  if (!r.ok) {
    console.error(`CATALOGO VIVO DIFERE DO ACRESCIMO: ${r.erros.join('; ')}`);
    process.exit(1);
  }
  console.log(`catalogo vivo de ${TABELA} = acrescimo ${r.plano} do catalogo-vivo-44, por igualdade de conjunto nas duas direcoes (coluna, tipo, nulidade, ordinal) (${r.n} colunas)`);
}

module.exports = { conferir, formatar, Q_VIVO };

if (require.main === module) main();
