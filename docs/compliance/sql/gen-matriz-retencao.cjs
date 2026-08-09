#!/usr/bin/env node
/**
 * gen-matriz-retencao.cjs — gera a matriz de retenção por etapa como artefato
 * DERIVADO, e os seus dois consumidores:
 *
 *   docs/compliance/matriz-retencao.json                              (auditoria)
 *   src/features/transparencia/constants/matrizRetencao.generated.ts  (frontend)
 *
 * Requirement: TRANSP-02 · Phase 47 / Plan 47-01
 *
 * ESTE SCRIPT NÃO FALA COM O BANCO. Não abre conexão, não lê credencial, não usa
 * MCP. Só `fs`, `path` e o `js-yaml` que os três geradores irmãos já usam —
 * **zero dependência npm nova** (invariante do M8 herdada do M7).
 *
 * POR QUE A FONTE É UM YAML AUTORADO E DATADO, E NÃO O `VALUES` DO SEED
 * A matriz viva mora em `public.config_retencao_etapa` e é EDITÁVEL EM PRODUÇÃO
 * pela RPC `salvar_janela_retencao` (Phase 43 / RETEN-01). O único artefato deste
 * repositório que carrega `janela_meses` como dado é o bloco `VALUES` do seed da
 * migration `20260801000002_p43_config_retencao.sql` — e ele é
 * `ON CONFLICT DO NOTHING`: é o estado INICIAL, não o vigente. Derivar a página
 * pública dele PARECERIA derivação e não seria; publicaria 24 meses para uma etapa
 * que um administrador já encurtou. (Foi exatamente o que a medição de 2026-08-09
 * encontrou em `rejeitado`.)
 *
 * A fonte correta é `docs/compliance/matriz-retencao.yaml`, cujos números são
 * MEDIDOS na matriz viva e cuja data de medição vai carimbada no artefato. O
 * carimbo público de vigência é `meta.medido_em`, **nunca** `meta.gerado_em`: a
 * data do build não sabe nada sobre a política.
 *
 * OS RÓTULOS E A ORDEM VÊM DO MÓDULO DO FUNIL, LIDO COMO TEXTO
 * `ETAPA_M2_LABELS` e `ETAPA_M2_OPTIONS` (`src/features/triagem/services/
 * triagemService.ts`) são a fonte única de rótulos pt-BR deste repositório. Um
 * `.cjs` não importa TypeScript, então a extração é por leitura de fonte — e é a
 * forma correta, porque um segundo mapa de rótulos faria a página pública e a tela
 * do RH chamarem a mesma etapa por nomes diferentes. Se qualquer um dos dois
 * blocos não puder ser extraído, este script MORRE dizendo qual bloco faltou e em
 * que arquivo.
 *
 * O QUE ESTE SCRIPT GARANTE — as travas que fazem a matriz não mentir
 *
 *   1 · COBERTURA. Toda etapa do mapa de rótulos do funil tem entrada na fonte, e
 *       toda entrada da fonte existe no mapa. Qualquer um dos dois lados faltando
 *       REPROVA a geração NOMEANDO a etapa: uma etapa nova no enum não chega à
 *       página pública com prazo e sem motivo escrito.
 *
 *   2 · PROJEÇÃO MÍNIMA. Cada etapa carrega EXATAMENTE `janela_meses`,
 *       `finalidade` e `base_legal`. `origem`, `alterado_por` e `atualizado_em` da
 *       tabela viva não entram em artefato nenhum: `alterado_por` resolveria para
 *       nome de administrador, e publicá-lo trocaria transparência sobre o
 *       candidato por exposição de um funcionário — a mesma razão pela qual
 *       `usuarios_rh` é admin-only desde a SEG-02. Chave desconhecida reprova.
 *
 *   3 · INTERVALO. `janela_meses` é inteiro entre 1 e 24, espelhando o
 *       `CHECK (janela_meses BETWEEN 1 AND 24)` vivo da tabela. Um prazo
 *       indeterminado no Bloco 1 é impossível por construção e, se aparecer, é
 *       falha de geração — nunca um estado de tela (regra "fail high").
 *
 *   4 · MOTIVO ESCRITO. `finalidade` e `base_legal` não-vazias em toda etapa. As
 *       duas são fato jurídico AUTORADO: não existem em `config_retencao_etapa`.
 *
 *   5 · CARIMBO. `meta.medido_em` presente e no formato `AAAA-MM-DD`. Sem ele a
 *       página não pode declarar vigência, e uma página de retenção sem vigência é
 *       prosa.
 *
 *   6 · VOCABULÁRIO. Nenhum texto destinado ao candidato contém termo banido pela
 *       `47-UI-SPEC.md` §Bans — nem construção elástica ("podemos", "entre
 *       outros"), nem vocabulário de engenharia, nem expressão de totalidade.
 *
 *   7 · FAIL HIGH. Zero etapas reprova. Uma página de retenção vazia seria a
 *       declaração pública de que a empresa não guarda nada.
 *
 * Rodar:  node docs/compliance/sql/gen-matriz-retencao.cjs
 * Checar: node docs/compliance/sql/gen-matriz-retencao.cjs --check
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ---------------------------------------------------------------------------
// Caminhos — duas entradas (a fonte autorada + o módulo do funil), duas saídas
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(__dirname, '..', '..', '..');

const FONTE = path.join(ROOT, 'matriz-retencao.yaml');
const FUNIL = path.join(REPO, 'src', 'features', 'triagem', 'services', 'triagemService.ts');

const OUT_JSON = path.join(ROOT, 'matriz-retencao.json');
const OUT_TS = path.join(REPO, 'src', 'features', 'transparencia', 'constants', 'matrizRetencao.generated.ts');

const REL = (p) => path.relative(REPO, p).split(path.sep).join('/');
const GERADOR = REL(path.join(__dirname, 'gen-matriz-retencao.cjs'));

function morrer(msg) {
  console.error(msg);
  process.exit(1);
}

/**
 * ⚠ `safeLoad`, NUNCA `load` — mesma razão do `gen-recibo-exclusao.cjs:86-91`:
 * em js-yaml 3.x o `load` usa o schema full. Script de compliance que carrega
 * YAML com schema full é o detalhe que uma auditoria futura marca.
 */
const lerYaml = (p) => yaml.safeLoad(fs.readFileSync(p, 'utf8'));

const achatar = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
// VOCABULÁRIO BANIDO — 47-UI-SPEC.md §Bans desta fase, escopo "páginas públicas"
// ---------------------------------------------------------------------------

/**
 * Estes termos são banidos do texto que o CANDIDATO lê. O escopo é o desta
 * página, não o repositório inteiro: este projeto já produziu DUAS vezes o defeito
 * de escrever um grep repo-wide que reprova a própria spec (43, "automaticamente";
 * 44, os verbos de exclusão).
 *
 * As três famílias e por que cada uma:
 *   · elásticas — transformam um fato verificável numa promessa ("entre outros"
 *     numa lista é a confissão de que a lista está incompleta);
 *   · engenharia — vocabulário travado desde a 45-UI-SPEC; a redação permitida é
 *     "sem ligação com você";
 *   · totalidade / prazo eterno — factualmente falsas: a trilha de decisão
 *     sobrevive, e o que sobrevive não é "sobre a pessoa para sempre".
 */
const BANIDOS = [
  'podemos',
  'poderemos',
  'eventualmente',
  'a nosso critério',
  'entre outros',
  'dentre outras',
  'etc.',
  'anonimizado',
  'pseudonimizado',
  'tombstone',
  'desvinculado',
  'todos os seus dados',
  'tudo o que temos sobre você',
  'apagamos tudo',
  'não informado',
  'a definir',
  'a confirmar',
  'teste psicológico',
  'pessoa natural',
  'para sempre',
  'indefinidamente',
  'permanentemente',
  'data_deletion_log',
  'delete_candidate_data',
];

/** Os TRÊS campos que a fonte declara por etapa — vocabulário FECHADO (trava 2). */
const CAMPOS_DA_ETAPA = ['janela_meses', 'finalidade', 'base_legal'];

// ---------------------------------------------------------------------------
// Extração do módulo do funil — UMA fonte de rótulos neste repositório
// ---------------------------------------------------------------------------
function extrairDoFunil() {
  let src;
  try {
    src = fs.readFileSync(FUNIL, 'utf8');
  } catch {
    morrer(`FALHA: o módulo do funil ${REL(FUNIL)} não pôde ser lido — sem ele não há rótulos nem ordem.`);
  }

  const blocoRotulos = src.match(/export const ETAPA_M2_LABELS[^=]*=\s*\{([\s\S]*?)\n\}/);
  if (!blocoRotulos) {
    morrer(
      `FALHA: bloco ETAPA_M2_LABELS não encontrado em ${REL(FUNIL)}.\n` +
        `  Um mapa de rótulos próprio produziria a divergência de nomenclatura que este gerador existe para impedir.`,
    );
  }
  const rotulos = {};
  for (const m of blocoRotulos[1].matchAll(/^\s*([a-z_]+)\s*:\s*'([^']*)'\s*,?\s*$/gm)) {
    rotulos[m[1]] = m[2];
  }
  if (Object.keys(rotulos).length === 0) {
    morrer(`FALHA: ETAPA_M2_LABELS foi encontrado em ${REL(FUNIL)} mas nenhum rótulo pôde ser extraído dele.`);
  }

  const blocoOrdem = src.match(/export const ETAPA_M2_OPTIONS[\s\S]*?\[([\s\S]*?)\]\s*as EtapaFunilM2\[\]/);
  if (!blocoOrdem) {
    morrer(
      `FALHA: bloco ETAPA_M2_OPTIONS não encontrado em ${REL(FUNIL)}.\n` +
        `  A ordem da página é a ordem do funil — a alfabética não é a ordem em que a pessoa vive o processo.`,
    );
  }
  const ordem = [...blocoOrdem[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  if (ordem.length === 0) {
    morrer(`FALHA: ETAPA_M2_OPTIONS foi encontrado em ${REL(FUNIL)} mas nenhuma etapa pôde ser extraída dele.`);
  }

  return { rotulos, ordem };
}

// ---------------------------------------------------------------------------
// Construção — cada validação MATA a geração nomeando o item
// ---------------------------------------------------------------------------
function construir() {
  const fonte = lerYaml(FONTE);
  const { rotulos, ordem } = extrairDoFunil();

  if (!fonte || typeof fonte !== 'object') {
    morrer(`FALHA: ${REL(FONTE)} não é um documento YAML válido.`);
  }

  const meta = fonte.meta || {};
  const medidoEm = achatar(meta.medido_em);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(medidoEm)) {
    morrer(
      `FALHA: meta.medido_em ausente, vazia ou fora do formato AAAA-MM-DD em ${REL(FONTE)}.\n` +
        `  O carimbo público de vigência é a data da MEDIÇÃO da matriz viva, nunca a data do build.`,
    );
  }
  const metodo = achatar(meta.metodo);
  if (metodo === '') {
    morrer(`FALHA: meta.metodo vazio em ${REL(FONTE)} — uma data de medição sem método declarado não é auditável.`);
  }

  const etapasFonte = fonte.etapas || {};
  const chavesFonte = Object.keys(etapasFonte);
  if (chavesFonte.length === 0) {
    // Regra "fail high": lista vazia é falha de geração, jamais um estado de tela.
    morrer(
      `FALHA: nenhuma etapa em ${REL(FONTE)}.\n` +
        `  Uma matriz de retenção vazia seria a declaração pública de que a empresa não guarda nada.`,
    );
  }

  // Trava 1, ida: etapa do funil ausente da fonte.
  for (const etapa of Object.keys(rotulos)) {
    if (!Object.prototype.hasOwnProperty.call(etapasFonte, etapa)) {
      morrer(
        `FALHA: etapa «${etapa}» existe no funil e NÃO tem entrada em ${REL(FONTE)}.\n` +
          `  Uma etapa nova no enum não chega à página pública com prazo e sem finalidade e base legal escritas.`,
      );
    }
  }
  // Trava 1, volta: entrada órfã na fonte.
  for (const etapa of chavesFonte) {
    if (!Object.prototype.hasOwnProperty.call(rotulos, etapa)) {
      morrer(
        `FALHA: etapa «${etapa}» está em ${REL(FONTE)} e NÃO existe no funil (${REL(FUNIL)}).\n` +
          `  Fonte órfã: a página publicaria um prazo para um estado que o sistema não tem.`,
      );
    }
  }
  // Toda etapa do funil precisa estar na ordem extraída — senão a saída perderia a ficha.
  for (const etapa of Object.keys(rotulos)) {
    if (ordem.indexOf(etapa) < 0) {
      morrer(`FALHA: etapa «${etapa}» tem rótulo no funil e não aparece na ordem de ETAPA_M2_OPTIONS.`);
    }
  }

  const etapas = ordem.map((etapa) => {
    const bruto = etapasFonte[etapa] || {};

    // Trava 2: vocabulário FECHADO de campos. `origem`, `alterado_por` e
    // `atualizado_em` reprovam aqui, e é onde têm de reprovar.
    for (const chave of Object.keys(bruto)) {
      if (CAMPOS_DA_ETAPA.indexOf(chave) < 0) {
        morrer(
          `FALHA: campo desconhecido «${chave}» na etapa «${etapa}» de ${REL(FONTE)}.\n` +
            `  A projeção é mínima: ${CAMPOS_DA_ETAPA.join(', ')}. Coluna administrativa não vai para a página pública.`,
        );
      }
    }

    // Trava 3: espelha o CHECK vivo da tabela.
    const janela = bruto.janela_meses;
    if (!Number.isInteger(janela) || janela < 1 || janela > 24) {
      morrer(
        `FALHA: janela_meses inválida na etapa «${etapa}»: ${JSON.stringify(janela)}.\n` +
          `  A tabela viva tem CHECK (janela_meses BETWEEN 1 AND 24) — um prazo fora disso é falha de geração.`,
      );
    }

    // Trava 4: motivo escrito.
    const campos = {};
    for (const campo of ['finalidade', 'base_legal']) {
      const texto = achatar(bruto[campo]);
      if (texto === '') {
        morrer(
          `FALHA: campo «${campo}» vazio ou ausente na etapa «${etapa}» de ${REL(FONTE)}.\n` +
            `  Nenhuma etapa chega à página pública com prazo e sem motivo escrito.`,
        );
      }
      campos[campo] = texto;
    }

    // Trava 6: vocabulário banido no texto que o candidato lê.
    for (const campo of ['finalidade', 'base_legal']) {
      const alvo = campos[campo].toLowerCase();
      for (const banido of BANIDOS) {
        if (alvo.indexOf(banido) >= 0) {
          morrer(
            `FALHA: termo banido «${banido}» em ${campo} da etapa «${etapa}».\n` +
              `  47-UI-SPEC.md §Bans — o escopo é o texto que o candidato lê nas páginas públicas.`,
          );
        }
      }
    }

    return {
      etapa,
      rotulo: rotulos[etapa],
      janela_meses: janela,
      finalidade: campos.finalidade,
      base_legal: campos.base_legal,
    };
  });

  if (etapas.length === 0) {
    morrer(`FALHA: a geração produziu zero etapas — falha de geração, nunca um estado de tela.`);
  }

  const janelas = etapas.map((e) => e.janela_meses);

  return {
    meta: {
      requirement: achatar(meta.requirement) || 'TRANSP-02',
      fase: meta.fase == null ? 47 : meta.fase,
      fonte: achatar(meta.fonte),
      medido_em: medidoEm,
      metodo,
      nota_divergencia: achatar(meta.nota_divergencia),
      gerador: GERADOR,
      gerado_em: new Date().toISOString(),
      totais: {
        etapas: etapas.length,
        janela_min_meses: Math.min(...janelas),
        janela_max_meses: Math.max(...janelas),
      },
    },
    // ORDEM DE FUNIL, jamais alfabética: é a ordem em que a pessoa vive o processo.
    etapas,
  };
}

// ---------------------------------------------------------------------------
// Serialização determinística — é o que torna o `--check` possível
// ---------------------------------------------------------------------------
function ordenar(v) {
  if (Array.isArray(v)) return v.map(ordenar);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = ordenar(v[k]);
    return o;
  }
  return v;
}

const serializarJson = (doc) => JSON.stringify(ordenar(doc), null, 2) + '\n';

function serializarTs(doc) {
  return (
    `/**\n` +
    ` * matrizRetencao.generated.ts — ESPELHO GERADO da matriz de retenção por etapa.\n` +
    ` *\n` +
    ` * Requirement: TRANSP-02 · Phase 47\n` +
    ` * Consumidor: o Bloco 1 de /privacidade (src/features/transparencia/)\n` +
    ` *\n` +
    ` * ⚠ ARQUIVO GERADO por \`${GERADOR}\`.\n` +
    ` * NÃO EDITAR À MÃO — \`--check\` reprova qualquer divergência, e reprova este\n` +
    ` * arquivo SEPARADAMENTE do \`.json\`: um \`--check\` que olhasse só um dos dois\n` +
    ` * deixaria o outro apodrecer.\n` +
    ` *\n` +
    ` * O PRAZO É DERIVADO, NUNCA DIGITADO NUM COMPONENTE. A fonte é\n` +
    ` * \`docs/compliance/matriz-retencao.yaml\`, cujos números são MEDIDOS na matriz\n` +
    ` * viva (\`public.config_retencao_etapa\`, editável em produção). O carimbo público\n` +
    ` * de vigência é \`meta.medido_em\` — a data da medição, nunca a data do build.\n` +
    ` *\n` +
    ` * A projeção é MÍNIMA: \`origem\`, quem alterou e quando não chegam aqui.\n` +
    ` * Publicar o nome de quem administra trocaria transparência sobre o candidato\n` +
    ` * por exposição de um funcionário (SEG-02).\n` +
    ` *\n` +
    ` * Regenerar: node ${GERADOR}\n` +
    ` */\n` +
    `export const MATRIZ_RETENCAO = ${JSON.stringify(ordenar(doc), null, 2)} as const;\n` +
    `\n` +
    `export type EtapaRetencao = (typeof MATRIZ_RETENCAO)['etapas'][number];\n`
  );
}

// ---------------------------------------------------------------------------
// Modos
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.includes('--check')) {
  const doc = construir();

  // Pina o carimbo de execução do disco: sem isso o `--check` divergiria pelo
  // relógio e nunca poderia sair 0 — um gate que nunca passa não é um gate, é
  // treinamento para desligá-lo.
  let discoJson = null;
  try {
    discoJson = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  } catch {
    discoJson = null;
  }
  if (discoJson === null) {
    morrer(`DIVERGENTE: ${REL(OUT_JSON)} ausente ou ilegível.\n  Rode: node ${GERADOR}`);
  }
  doc.meta.gerado_em = discoJson.meta && discoJson.meta.gerado_em;

  // Cada artefato conferido SEPARADAMENTE, e ausência tratada como DIVERGÊNCIA —
  // nunca como erro de I/O.
  const esperados = [
    [OUT_JSON, serializarJson(doc)],
    [OUT_TS, serializarTs(doc)],
  ];
  for (const [saida, esperado] of esperados) {
    const disco = fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8') : '';
    if (disco !== esperado) {
      morrer(
        `DIVERGENTE: ${REL(saida)} ${disco === '' ? 'ausente' : 'não corresponde'} à fonte ${REL(FONTE)}.\n` +
          `  Este artefato é gerado, não escrito à mão.\n  Rode: node ${GERADOR}`,
      );
    }
  }

  console.log(`OK: ${REL(OUT_JSON)} e ${REL(OUT_TS)} estão em sincronia com ${REL(FONTE)}.`);
  process.exit(0);
}

const doc = construir();
for (const saida of [OUT_JSON, OUT_TS]) {
  fs.mkdirSync(path.dirname(saida), { recursive: true });
}
fs.writeFileSync(OUT_JSON, serializarJson(doc));
fs.writeFileSync(OUT_TS, serializarTs(doc));

const t = doc.meta.totais;
console.log(
  `matriz-retencao.json gerado — ${t.etapas} etapa(s) na ordem do funil, ` +
    `janelas de ${t.janela_min_meses} a ${t.janela_max_meses} meses ` +
    `(matriz viva medida em ${doc.meta.medido_em}).`,
);
console.log(`espelho ${REL(OUT_TS)} gerado.`);
