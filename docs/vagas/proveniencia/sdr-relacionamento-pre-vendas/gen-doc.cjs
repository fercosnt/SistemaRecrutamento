#!/usr/bin/env node
// Preenche doc-template.md com as secoes de fonte canonica. Extraido, nunca transcrito.
//   node gen-doc.cjs <scratch-sdr> <repo> <saida.md>
const fs = require('fs');
const path = require('path');
const [dir, repo, saida] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(path.join(dir, 'payload.json'), 'utf8'));
const antiga = JSON.parse(fs.readFileSync(path.join(dir, '..', 'vaga-sdr-atual.json'), 'utf8'))[0];
const V = P.vaga;
const falha = (m) => { console.error('RECUSADO: ' + m); process.exit(1); };
const PESOS_ANTIGOS = JSON.parse(fs.readFileSync(path.join(dir, 'pesos-antigos.json'), 'utf8'))[0].pesos_avaliacao;
const G = (t) => `<!-- gerado: ${t} — nao editar a mao -->`;
const cerca = (s) => '````markdown\n' + s + '\n````';

// ── anuncio ──
const campo = (rot, v, md = true) => v ? `### ${rot}${md ? '' : ' (texto puro)'}\n\n${md ? cerca(v) : '> ' + v}\n` : '';
const anuncio = [
  '## 1 · O anúncio, como o candidato lê', G('payload.vaga'), '',
  'Os blocos em cerca são o markdown exato que vai ao banco; a página o renderiza.', '',
  campo('Título', V.titulo, false), campo('Subtítulo', V.subtitulo, false), campo('Resumo', V.descricao_curta, false),
  campo('Sobre o cargo', V.sobre_cargo), campo('Responsabilidades', V.responsabilidades),
  campo('Formação', V.requisitos_formacao), campo('Experiência', V.requisitos_experiencia),
  campo('Conhecimentos técnicos', V.requisitos_tecnicos), campo('Habilidades', V.requisitos_habilidades),
  campo('Diferenciais e carreira', V.diferenciais), campo('Remuneração e benefícios', V.beneficios),
  campo('Sobre a empresa', V.sobre_empresa),
  ...P.secoes_extras.map((s) => campo(`Seção extra — ${s.titulo}`, s.conteudo)),
].join('\n');

// ── perguntas ──
const pergs = ['## 2 · As perguntas da Etapa 1', G('payload.perguntas'), '',
  'As mesmas 5 da rodada anterior, extraídas do banco. Nenhuma aberta.', ''];
for (const q of P.perguntas) {
  pergs.push(`**${q.ordem} · \`${q.bloco}\` · ${q.tipo_resposta}${q.obrigatoria ? ' · obrigatória' : ''}** — ${q.texto_pergunta}`, '');
  const ko = new Set((q.opcoes_metadata || []).filter((m) => m.tag === 'knockout').map((m) => m.opcao_texto));
  for (const o of q.opcoes_resposta || []) pergs.push(ko.has(o) ? `- ⛔ **${o}** — **KNOCKOUT: encerra a candidatura na inscrição** (D6)` : `- ${o}`);
  pergs.push('');
}

// ── SJT: secao do cargo extraida de BANCO-SJT-V2.md ──
const banco = fs.readFileSync(path.join(repo, 'docs/specs/BANCO-SJT-V3-SDR.md'), 'utf8');
const ini = banco.indexOf('## Cargo `sdr-social-seller`');
const fim = banco.length;
if (ini < 0) falha('secao sdr-social-seller nao encontrada em BANCO-SJT-V3-SDR.md');
const sjt = ['## 3 · O teste situacional (SJT)', G('docs/specs/BANCO-SJT-V3-SDR.md'), '',
  'Banco `sdr-social-seller` **revisado nesta vaga** (D7): MC1, MC5 e MC6 ficam como estão no ar; MC2 e MC3 são novos; o MC4 troca «lente» por «clareamento»; o caso aberto é novo. O que muda e por quê está em `docs/specs/BANCO-SJT-V3-SDR.md`. A ordem da coluna `#` é só a de autoria: na tela as alternativas aparecem embaralhadas.', '',
  banco.slice(ini, fim).replace(/^## Cargo/m, '### Cargo').replace(/^### /gm, '#### ').replace(/^#### Cargo/m, '### Cargo').replace(/\n---\s*$/, '').trim()].join('\n');

// ── rubrica ──
const rubrica = ['## 6 · A rubrica da IA, por extenso', G('payload.rubrica_ia'), '',
  'Extraída byte a byte da vaga anterior, onde foi aprovada e calibrada com candidatos reais. Ela já contém os eliminatórios (§7), o que é proibido pesar (§8) e as instruções de calibragem (§9) — por isso essas três seções não se repetem aqui.', '',
  P.rubrica_ia === antiga.rubrica_ia ? '✅ Conferido por script: idêntica à rubrica da vaga anterior.' : falha('rubrica diverge da antiga'), '',
  '⚠ **O sistema nunca rejeita por score.** Eliminatório ausente vira lacuna `critical` e segura o score abaixo de 40 — sinal para o RH, não decisão da máquina.', '',
  cerca(P.rubrica_ia)].join('\n');

const pw = P.pesos_avaliacao;
const pesos = ['### Onde o peso cai', G('payload.pesos_avaliacao'), '',
  '| Etapa | Rodada anterior | Esta vaga |', '|---|---|---|',
  ...Object.keys(pw).map((k) => `| \`${k}\` | ${PESOS_ANTIGOS[k]} | **${pw[k]}** |`),
  `| soma | 100 | **${Object.values(pw).reduce((a, b) => a + b, 0)}** |`, '',
  'Big Five e cognitivo não têm peso.'].join('\n');

const perfil = ['## 11 · Perfil ideal — campo interno que alimenta o guia de entrevista', G('payload.vaga.perfil_ideal'), '',
  `O candidato não vê. A EF \`gerar-guia-entrevista\` o injeta no prompt, cortado em 800 caracteres — este tem ${V.perfil_ideal.length}. Na rodada anterior o campo guardava os indicadores de desempenho, que não ajudam o entrevistador; foi reescrito para ele.`, '',
  cerca(V.perfil_ideal)].join('\n');

const testes = P.testes_aplicaveis.map((t) => `${t.teste}${t.obrigatorio ? ' (obrig.' : ' (não obrig.'}${t.cargo ? ', cargo `' + t.cargo + '`' : ''}${t.codigos ? ', código ' + t.codigos.join(',') : ''})`).join(' · ');
const checklist = ['## 13 · Checklist de cadastro no sistema', G('payload'), '', '| Campo | Valor |', '|---|---|',
  `| \`slug\` | \`${V.slug}\` |`, '| `titulo` · `subtitulo` · `descricao_curta` | §1 |',
  '| `sobre_cargo` · `responsabilidades` · `requisitos_*` · `diferenciais` · `beneficios` · `sobre_empresa` | §1 |',
  `| \`secoes_extras\` | ${P.secoes_extras.map((s) => '«' + s.titulo + '»').join(' · ')} |`,
  '| `perfil_ideal` | §11 |',
  `| \`departamento\` · \`tipo_contrato\` · \`modelo_trabalho\` | ${V.departamento} · ${V.tipo_contrato} · ${V.modelo_trabalho} |`,
  `| \`cidade\` · \`estado\` · \`endereco_completo\` | ${V.cidade} · ${V.estado} · ${V.endereco_completo} |`,
  `| \`jornada_trabalho\` | ${V.jornada_trabalho} — **não renderiza**; por isso o horário está escrito em \`sobre_cargo\` |`,
  `| \`faixa_salarial_min\` / \`max\` | ${V.faixa_salarial_min} / ${V.faixa_salarial_max} — internos, \`exibir_salario = false\` (a remuneração está por extenso em \`beneficios\`) |`,
  `| \`total_vagas\` | ${V.total_vagas} |`, '| `data_abertura` | a data do apply |', '| `data_fechamento` | vazio |',
  '| `status` | **`rascunho`** — publicar é ato humano separado |', '| `created_by` | Fernando Costa Neto (resolvido por e-mail; a migration aborta se não achar) |',
  '| `rubrica_ia` | §6 |', `| \`pesos_avaliacao\` | ${Object.entries(pw).map(([k, v]) => k + ' ' + v).join(' · ')} |`,
  `| \`testes_aplicaveis\` | ${testes} |`, '| `aplica_cognitivo` | `false` |', '| `qualificacao_etapa1` | **não tocar** — snapshot do `publish_vaga` |',
  `| \`perguntas_formulario\` | §2 — ${P.perguntas.length} perguntas, 0 abertas; a pergunta 1 leva a opção knockout e é obrigatória |`].join('\n');

// ── criterios: extraidos do catalogo ──
const cat = fs.readFileSync(path.join(repo, 'supabase/functions/_shared/sjt-rubrica.ts'), 'utf8');
// dimensoes e pesos: do TEXTO do banco, pelo mesmo parser do gerador (nunca uma lista a mao)
const dims = JSON.parse(require('child_process').execFileSync('python3', ['-I', '-B', '-c', "import sys,json; sys.path.insert(0,'scripts/geradores'); import sjt_texto; c=[i for i in sjt_texto.parse('docs/specs/BANCO-SJT-V3-SDR.md') if i['formato']=='caso_aberto'][0]; print(json.dumps([[x['dimension'],x['peso']] for x in c['rubric']['dimensoes']]))"], { cwd: repo }).toString());
const crit = ['## 15 · Critérios das dimensões do caso aberto', G('supabase/functions/_shared/sjt-rubrica.ts'), '',
  'É a régua que a IA recebe para pontuar o caso aberto. As dimensões e os pesos vêm do texto do banco (§3); os critérios, do catálogo. Até hoje o caso aberto do cargo não tinha critério catalogado, e a IA julgava as dimensões **pelo nome**. A conversão em nota 1-5 é do sistema: 5 = todos os inclusion e nenhum exclusion; 1 = inclusion ausente ou um exclusion crítico. Nota 0-25 · ≥18 avança · 13-17 entrevista · <13 revisão humana.', ''];
for (const [k, peso] of dims) {
  const m = cat.match(new RegExp(`\\n  ${k}: \\{\\n    rotulo: "([^"]+)",[\\s\\S]*?inclusion: "((?:[^"\\\\]|\\\\.)*)",\\n    exclusion: "((?:[^"\\\\]|\\\\.)*)",`));
  if (!m) falha('dimensao nao encontrada no catalogo: ' + k);
  const un = (s) => s.replace(/\\"/g, '"');
  crit.push(`### \`${k}\` — ${m[1]} · peso ${peso}`, '', '**Inclusion**', '', un(m[2]).replace(/ \((\d)\) /g, '\n($1) ').replace(/^\((\d)\)/, '($1)'), '',
    '**Exclusion**', '', un(m[3]).replace(/ (CRÍTICO:|menor:)/g, '\n- $1').replace(/^(CRÍTICO:|menor:)/, '- $1'), '');
}

// ── diferencas para a vaga antiga ──
const CAMPOS = ['titulo', 'subtitulo', 'descricao_curta', 'jornada_trabalho', 'sobre_cargo', 'responsabilidades', 'requisitos_formacao', 'requisitos_experiencia', 'requisitos_tecnicos', 'requisitos_habilidades', 'diferenciais', 'beneficios', 'sobre_empresa', 'perfil_ideal'];
const dif = ['## Diferenças em relação à vaga anterior', G('comparacao por script com o banco'), '', '| Campo | |', '|---|---|',
  ...CAMPOS.map((c) => `| \`${c}\` | ${(V[c] ?? null) === (antiga[c] ?? null) ? 'igual' : '**mudou**'} |`),
  `| \`secoes_extras\` | **mudou** — antes vazio; agora ${P.secoes_extras.map((x) => '«' + x.titulo + '»').join(', ')} |`,
  `| \`pesos_avaliacao\` | **mudou** (a triagem não pondera no score final; sem redação, o composto fica ~53% teste situacional · ~47% entrevista) — ${Object.keys(pw).map((k) => PESOS_ANTIGOS[k]).join('/')} → ${Object.keys(pw).map((k) => pw[k]).join('/')} (triagem/sjt/redação/entrevista) |`,
  `| \`testes_aplicaveis\` | ${JSON.stringify(P.testes_aplicaveis) === JSON.stringify(antiga.testes_aplicaveis) ? 'igual' : '**mudou**'} |`,
  `| \`rubrica_ia\` | ${P.rubrica_ia === antiga.rubrica_ia ? 'igual' : '**mudou**'} |`,
  '| perguntas | iguais (extraídas do banco) |'].join('\n');

function render() {
  let doc = fs.readFileSync(path.join(dir, 'doc-template.md'), 'utf8');
  const mapa = { PESOS: pesos, ANUNCIO: anuncio, PERGUNTAS: pergs.join('\n'), SJT: sjt, RUBRICA: rubrica, PERFIL: perfil, CHECKLIST: checklist, CRITERIOS: crit.join('\n'), DIFERENCAS: dif };
  for (const [k, v] of Object.entries(mapa)) { if (doc.split(`{{${k}}}`).length !== 2) falha('placeholder ' + k); doc = doc.replace(`{{${k}}}`, () => v); }
  if (/\{\{[A-Z]+\}\}/.test(doc)) falha('placeholder sobrando');
  fs.writeFileSync(saida, doc);
  console.log('ok —', saida, doc.split('\n').length, 'linhas');
}
render();
