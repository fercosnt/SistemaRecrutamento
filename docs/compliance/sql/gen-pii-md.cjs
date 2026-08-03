#!/usr/bin/env node
/**
 * gen-pii-md.cjs — gera `docs/compliance/pii-inventory.md` a partir de
 * `docs/compliance/pii-inventory.yaml`.
 *
 * Requirement: INVENT-01 · Phase 42 / Plan 42-04 · D-P42-17
 *
 * POR QUE ESTE SCRIPT EXISTE
 * O CONTEXT (D-P42-17) trava o inventário PII em formato DUPLO: um YAML
 * legível por máquina como FONTE (o que as Phases 44 e 45 consomem como dado)
 * e uma tabela Markdown legível por gente. Duas cópias do mesmo fato divergem
 * — sempre. Gerar a segunda a partir da primeira remove a possibilidade.
 *
 * Rodar:  node docs/compliance/sql/gen-pii-md.cjs
 * Checar: node docs/compliance/sql/gen-pii-md.cjs --check
 *         (sai 1 se o .md no disco divergir do que o YAML produz — use isto
 *          em revisão; é o que impede o .md de virar prosa órfã)
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'pii-inventory.yaml');
const OUT = path.join(ROOT, 'pii-inventory.md');

const ICON = {
  apagar: '🗑️ apagar',
  anonimizar: '🎭 anonimizar',
  preservar: '🔒 preservar',
  preservar_com_ressalva: '⚠️ preservar c/ ressalva',
};

const flat = (s) => String(s).trim().replace(/\n/g, ' ');

function render(d) {
  const o = [];
  o.push('# Inventário de PII — visão legível (gerado)');
  o.push('');
  o.push('> ⚠️ **Arquivo GERADO** de [`pii-inventory.yaml`](./pii-inventory.yaml) por `docs/compliance/sql/gen-pii-md.cjs`.');
  o.push('> Não editar à mão — em caso de divergência, **o YAML vence**.');
  o.push('');
  o.push('| Campo | Valor |');
  o.push('|-------|-------|');
  o.push(`| Requirement | **${d.meta.requirement}** |`);
  o.push(`| Data de coleta | **${d.meta.coletado_em}** |`);
  o.push(`| Query reprodutora | \`${d.meta.query_reprodutora}\` |`);
  o.push(`| Semente | \`${d.meta.semente}\` |`);
  o.push(`| Escopo | ${d.meta.escopo.tabelas_base_public} tabelas · ${d.meta.escopo.colunas_public} colunas · ${d.meta.escopo.fks_public} FKs (${d.meta.escopo.fks_para_auth_users} para auth.users) |`);
  o.push('');
  o.push('**Fonte:** ' + flat(d.meta.fonte));
  o.push('');
  o.push('## Vocabulário');
  o.push('');
  o.push('| Classificação | Significado |');
  o.push('|---------------|-------------|');
  for (const [k, v] of Object.entries(d.classificacoes)) o.push(`| ${ICON[k]} | ${flat(v)} |`);
  o.push('');
  o.push('## Regras de cobertura');
  o.push('');
  o.push('Toda coluna do schema `public` está classificada — por regra, ou por entrada explícita. **Entrada explícita sempre vence a regra.**');
  o.push('');
  o.push('| Regra | Padrão | Classificação | Razão |');
  o.push('|-------|--------|---------------|-------|');
  for (const r of d.regras_padrao) o.push(`| **${r.id}** | ${r.padrao} | ${ICON[r.classificacao]} | ${flat(r.razao)} |`);
  o.push('');
  o.push('## Tabelas com PII — classificação explícita');
  o.push('');
  const tot = {};
  for (const [tn, tv] of Object.entries(d.tabelas)) {
    o.push(`### \`${tn}\``);
    o.push('');
    if (tv.natureza) o.push('> ' + flat(tv.natureza));
    if (tv.fk_para_auth_users) { o.push('> '); o.push('> **FK → auth.users:** `' + tv.fk_para_auth_users + '`'); }
    if (tv.populacao_viva_2026_07_29) { o.push('> '); o.push('> **População viva (2026-07-29):** ' + JSON.stringify(tv.populacao_viva_2026_07_29)); }
    o.push('');
    o.push('| Coluna | Classificação | Tipo | Nota |');
    o.push('|--------|---------------|------|------|');
    for (const [cn, cv] of Object.entries(tv.colunas || {})) {
      tot[cv.classificacao] = (tot[cv.classificacao] || 0) + 1;
      o.push(`| \`${cn}\` | ${ICON[cv.classificacao]} | ${cv.tipo || cv.regra || '—'} | ${cv.nota || ''} |`);
    }
    o.push('');
  }
  o.push('## Tabelas sem PII de titular');
  o.push('');
  o.push('Cobertas integralmente pela regra **' + d.tabelas_sem_pii_titular.regra_aplicada + '** — ' + d.tabelas_sem_pii_titular.nota);
  o.push('');
  for (const t of d.tabelas_sem_pii_titular.lista) o.push('- `' + t + '`');
  o.push('');
  o.push('## Achados para a Phase 45');
  o.push('');
  for (const a of d.achados) {
    o.push(`### ${a.id} — ${a.titulo} (${a.severidade})`);
    o.push('');
    o.push(String(a.detalhe).trim());
    o.push('');
  }
  o.push('## Totais');
  o.push('');
  o.push('| Classificação | Colunas |');
  o.push('|---------------|--------:|');
  for (const [k, v] of Object.entries(tot)) o.push(`| ${ICON[k]} | ${v} |`);
  o.push(`| **Total explícito** | **${Object.values(tot).reduce((a, b) => a + b, 0)}** |`);
  o.push('');
  o.push(`Cobertura de tabelas: **${Object.keys(d.tabelas).length + d.tabelas_sem_pii_titular.lista.length} / ${d.meta.escopo.tabelas_base_public}**.`);
  return o.join('\n') + '\n';
}

const doc = yaml.load(fs.readFileSync(SRC, 'utf8'));
const out = render(doc);

if (process.argv.includes('--check')) {
  const disco = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (disco !== out) {
    console.error('DIVERGENTE: pii-inventory.md não corresponde a pii-inventory.yaml.');
    console.error('Rode: node docs/compliance/sql/gen-pii-md.cjs');
    process.exit(1);
  }
  console.log('OK: pii-inventory.md está em sincronia com o YAML.');
  process.exit(0);
}

fs.writeFileSync(OUT, out);
console.log(`pii-inventory.md gerado (${out.split('\n').length} linhas) de pii-inventory.yaml`);
