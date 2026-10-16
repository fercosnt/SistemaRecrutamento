#!/usr/bin/env node
// Preenche doc-template.md da vaga de dentista com as secoes de fonte canonica. Extraido, nunca
// transcrito.   node gen-doc.cjs <dir> <repo> <saida.md>
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const [dir, repo, saida] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(path.join(dir, 'payload.json'), 'utf8'));
const RED = P.redacoes_novas[0];
const V = P.vaga;
const BANCO = 'docs/specs/BANCO-SJT-DENTISTA-V2.md';
const falha = (m) => { console.error('RECUSADO: ' + m); process.exit(1); };
const G = (t) => `<!-- gerado: ${t} — nao editar a mao -->`;
const cerca = (s) => '````markdown\n' + s + '\n````';
const campo = (rot, v, md = true) => v ? `### ${rot}${md ? '' : ' (texto puro)'}\n\n${md ? cerca(v) : '> ' + v}\n` : '';

const anuncio = ['## 1 · O anúncio, como o candidato lê', G('payload.vaga'), '',
  'Os blocos em cerca são o markdown exato que vai ao banco; a página o renderiza.', '',
  campo('Título', V.titulo, false), campo('Subtítulo', V.subtitulo, false), campo('Resumo', V.descricao_curta, false),
  campo('Sobre o cargo', V.sobre_cargo), campo('Responsabilidades', V.responsabilidades),
  campo('Formação', V.requisitos_formacao), campo('Experiência', V.requisitos_experiencia),
  campo('Conhecimentos técnicos', V.requisitos_tecnicos), campo('Habilidades', V.requisitos_habilidades),
  campo('Diferenciais', V.diferenciais), campo('Contrato e benefícios', V.beneficios),
  campo('Sobre a empresa', V.sobre_empresa),
  ...P.secoes_extras.map((s) => campo(`Seção extra — ${s.titulo}`, s.conteudo))].join('\n');

const pergs = ['## 2 · As perguntas da Etapa 1', G('payload.perguntas'), '', `${P.perguntas.length} perguntas, nenhuma aberta.`, ''];
for (const q of P.perguntas) {
  pergs.push(`**${q.ordem} · \`${q.bloco}\` · ${q.tipo_resposta}${q.obrigatoria ? ' · obrigatória' : ''}** — ${q.texto_pergunta}`, '');
  const ko = new Set((q.opcoes_metadata || []).filter((m) => m.tag === 'knockout').map((m) => m.opcao_texto));
  for (const o of q.opcoes_resposta || []) pergs.push(ko.has(o) ? `- ⛔ **${o}** — **KNOCKOUT: encerra a candidatura na inscrição** (D7)` : `- ${o}`);
  pergs.push('');
}

const banco = fs.readFileSync(path.join(repo, BANCO), 'utf8');
const ini = banco.indexOf('## Cargo `dentista`');
if (ini < 0) falha('secao do cargo nao encontrada em ' + BANCO);
const sjt = ['## 3 · O teste situacional (SJT)', G(BANCO), '',
  'Banco `dentista` revisto nesta vaga (D9). O que muda e por quê está no cabeçalho de `' + BANCO + '`. A ordem da coluna `#` é só a de autoria: na tela as alternativas aparecem embaralhadas.', '',
  banco.slice(ini).replace(/^## Cargo/m, '### Cargo').replace(/^### (MC|Caso)/gm, '#### $1').trim()].join('\n');

const redacao = ['## 4 · Redação cultural', G('payload.redacoes_novas'), '',
  `Código \`${RED.codigo}\` — redação NOVA, criada pela migration da vaga com o texto exato do formulário antigo do operador. Mede a «experiência UAU» da cultura da clínica (valor primário \`${RED.valor_primario}\`, secundário \`${RED.valor_secundario}\`) por um caso real com resultado, não por adjetivo. Complementa o caso escrito: o caso pergunta como a pessoa FARIA a primeira sessão; a redação pede algo que ela JÁ FEZ. 200 a 500 palavras. O código evita «D4», que já é o nome de uma dimensão da nota da redação.`, '',
  '> ' + RED.texto].join('\n');

const rubrica = ['## 6 · A rubrica da IA, por extenso', G('payload.rubrica_ia'), '',
  'Contém os eliminatórios (§7), o que é proibido pesar (§8) e as instruções de calibragem (§9) — por isso essas três seções não se repetem aqui.', '',
  '⚠ **O sistema nunca rejeita por score.** Eliminatório ausente vira lacuna `critical` e segura o score abaixo de 40 — sinal para o RH, não decisão da máquina.', '',
  cerca(P.rubrica_ia)].join('\n');

const pw = P.pesos_avaliacao;
const pesos = ['### Onde o peso cai', G('payload.pesos_avaliacao'), '', '| Etapa | Peso |', '|---|---|',
  ...Object.keys(pw).map((k) => `| \`${k}\` | ${pw[k]} |`), `| soma | ${Object.values(pw).reduce((a, b) => a + b, 0)} |`, '',
  'Pesos do template `dentista`. ⚠ O score final **não pondera a triagem** — ela aparece como contexto (`consolidar-decisao-final`, UX-09). O composto usa teste situacional, redação e entrevista, renormalizados: ~44% · ~19% · ~37%.'].join('\n');

const perfil = ['## 11 · Perfil ideal — campo interno que alimenta o guia de entrevista', G('payload.vaga.perfil_ideal'), '',
  `O candidato não vê. A EF \`gerar-guia-entrevista\` o injeta no prompt, cortado em 800 caracteres — este tem ${V.perfil_ideal.length}.`, '', cerca(V.perfil_ideal)].join('\n');

const testes = P.testes_aplicaveis.map((t) => `${t.teste}${t.obrigatorio ? ' (obrig.' : ' (não obrig.'}${t.cargo ? ', cargo `' + t.cargo + '`' : ''}${t.codigos ? ', código ' + t.codigos.join(',') : ''})`).join(' · ');
const checklist = ['## 13 · Checklist de cadastro no sistema', G('payload'), '', '| Campo | Valor |', '|---|---|',
  `| \`slug\` | \`${V.slug}\` |`, '| `titulo` · `subtitulo` · `descricao_curta` | §1 |',
  '| `sobre_cargo` · `responsabilidades` · `requisitos_*` · `diferenciais` · `beneficios` · `sobre_empresa` | §1 |',
  `| \`secoes_extras\` | ${P.secoes_extras.map((s) => '«' + s.titulo + '»').join(' · ')} |`, '| `perfil_ideal` | §11 |',
  `| \`departamento\` · \`tipo_contrato\` · \`modelo_trabalho\` | ${V.departamento} · ${V.tipo_contrato} · ${V.modelo_trabalho} |`,
  `| \`cidade\` · \`estado\` · \`endereco_completo\` | ${V.cidade} · ${V.estado} · ${V.endereco_completo} |`,
  `| \`jornada_trabalho\` | ${V.jornada_trabalho} — **não renderiza**; por isso o horário está em \`sobre_cargo\` |`,
  '| `faixa_salarial_min` / `max` | vazios — o valor é combinado na entrevista |', `| \`total_vagas\` | ${V.total_vagas} |`,
  '| `data_abertura` | a data do apply |', '| `status` | **`rascunho`** — publicar é ato humano separado |',
  '| `created_by` | Fernando Costa Neto (resolvido por e-mail; a migration aborta se não achar) |', '| `rubrica_ia` | §6 |',
  `| \`pesos_avaliacao\` | ${Object.entries(pw).map(([k, v]) => k + ' ' + v).join(' · ')} |`, `| \`testes_aplicaveis\` | ${testes} |`,
  '| `aplica_cognitivo` | `false` |', '| `qualificacao_etapa1` | **não tocar** — snapshot do `publish_vaga` |',
  `| \`perguntas_formulario\` | §2 — ${P.perguntas.length} perguntas, 0 abertas; a pergunta 1 leva as opções knockout e é obrigatória |`].join('\n');

// dimensoes e pesos do caso: do TEXTO do banco, pelo mesmo parser do gerador; criterios: do catalogo
const dims = JSON.parse(execFileSync('python3', ['-I', '-B', '-c', `import sys,json; sys.path.insert(0,'scripts/geradores'); import sjt_texto; c=[i for i in sjt_texto.parse('${BANCO}') if i['formato']=='caso_aberto'][0]; print(json.dumps([[x['dimension'],x['peso']] for x in c['rubric']['dimensoes']]))`], { cwd: repo }).toString());
const cat = fs.readFileSync(path.join(repo, 'supabase/functions/_shared/sjt-rubrica.ts'), 'utf8');
const crit = ['## 15 · Critérios das dimensões do caso escrito', G('supabase/functions/_shared/sjt-rubrica.ts'), '',
  'É a régua que a IA recebe para pontuar o caso escrito. As dimensões e os pesos vêm do texto do banco (§3); os critérios, do catálogo. A conversão em nota 1-5 é do sistema: 5 = todos os inclusion e nenhum exclusion; 1 = inclusion ausente ou um exclusion crítico. Nota 0-25 · ≥18 avança · 13-17 entrevista · <13 revisão humana.', ''];
for (const [k, peso] of dims) {
  const m = cat.match(new RegExp(`\\n  ${k}: \\{\\n    rotulo: "([^"]+)",[\\s\\S]*?inclusion: "((?:[^"\\\\]|\\\\.)*)",\\n    exclusion: "((?:[^"\\\\]|\\\\.)*)",`));
  if (!m) falha('dimensao nao encontrada no catalogo: ' + k);
  const un = (s) => s.replace(/\\"/g, '"');
  crit.push(`### \`${k}\` — ${m[1]} · peso ${peso}`, '', '**Inclusion**', '', un(m[2]).replace(/ \((\d)\) /g, '\n($1) '), '',
    '**Exclusion**', '', un(m[3]).replace(/ (CRÍTICO:|menor:)/g, '\n- $1').replace(/^(CRÍTICO:|menor:)/, '- $1'), '');
}

let doc = fs.readFileSync(path.join(dir, 'doc-template.md'), 'utf8');
const mapa = { PESOS: pesos, ANUNCIO: anuncio, PERGUNTAS: pergs.join('\n'), SJT: sjt, REDACAO: redacao, RUBRICA: rubrica, PERFIL: perfil, CHECKLIST: checklist, CRITERIOS: crit.join('\n') };
for (const [k, v] of Object.entries(mapa)) { if (doc.split(`{{${k}}}`).length !== 2) falha('placeholder ' + k); doc = doc.replace(`{{${k}}}`, () => v); }
if (/\{\{[A-Z]+\}\}/.test(doc)) falha('placeholder sobrando');
fs.writeFileSync(saida, doc);
console.log('ok —', saida, doc.split('\n').length, 'linhas');
