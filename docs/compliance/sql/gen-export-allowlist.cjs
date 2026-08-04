#!/usr/bin/env node
/**
 * gen-export-allowlist.cjs — gera `docs/compliance/export-allowlist.json` e seu
 * espelho `supabase/functions/_shared/exportAllowlist.ts`.
 *
 * Requirement: EXPORT-02 · EXPORT-06 · Phase 44 / Plan 44-01 (Task 3) · BD-6
 *
 * POR QUE ESTE SCRIPT LÊ TRÊS FONTES E NÃO UMA
 * A `44-CONTEXT.md` §Área 2 travou a allowlist como DERIVADA do
 * `pii-inventory.yaml` — e a decisão continua certa. O que o BD-6 mediu é que o
 * INSUMO envelheceu: o catálogo vivo tem 67 tabelas / 1013 colunas contra as
 * 64 / 993 declaradas no YAML, colhidas cinco dias antes. E o drift caiu
 * exatamente no lugar de que esta fase depende: as QUATRO colunas de
 * consentimento versionado de `autorizacoes` (`consent_text_version`,
 * `consent_text_hash`, `consent_registrado_em`, `autorizacao_marketing_vagas`)
 * aparecem ZERO vezes no YAML — e são precisamente a dependência que o ROADMAP
 * nomeia da Phase 44 sobre a Phase 43.
 *
 * Derivar a allowlist do YAML sozinho produziria um artefato VERDE que omite,
 * em silêncio, a própria dependência declarada da fase. Daí as três entradas:
 *
 *   CATÁLOGO VIVO  → EXISTÊNCIA de tabela e de coluna (a verdade de hoje)
 *   pii-inventory  → CLASSIFICAÇÃO (o que a exclusão faz com a coluna)
 *   export-scope   → ESCOPO DO TITULAR (isto é dado da pessoa, Art. 18 II?)
 *
 * E daí o FECHO OBRIGATÓRIO: tabela viva sem disposição, ou coluna viva de
 * tabela em escopo sem veredito, é ERRO DE FECHAMENTO que FALHA A GERAÇÃO
 * nomeando o objeto no stderr. Nunca omissão silenciosa. Um fecho que falha
 * alto é a única forma de a próxima janela de drift ser descoberta pela
 * geração em vez de pelo titular.
 *
 * ESTE SCRIPT NÃO FALA COM O BANCO
 * Não abre conexão, não aceita credencial, não lê variável de ambiente de
 * projeto. A medição do catálogo é trabalho do ORQUESTRADOR (subagentes GSD não
 * recebem os tools MCP do Supabase — anthropics/claude-code#13898), e
 * `catalogo-vivo-44.json` é a fronteira versionada entre os dois mundos.
 *
 * Rodar:      node docs/compliance/sql/gen-export-allowlist.cjs
 * Checar:     node docs/compliance/sql/gen-export-allowlist.cjs --check
 * Colar SQL:  node docs/compliance/sql/gen-export-allowlist.cjs --sql-values
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ---------------------------------------------------------------------------
// Caminhos — as três entradas e os dois artefatos
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(__dirname, '..', '..', '..');

const CATALOGO = path.join(ROOT, 'catalogo-vivo-44.json');
const INVENTARIO = path.join(ROOT, 'pii-inventory.yaml');
const ESCOPO = path.join(ROOT, 'export-scope-rules.yaml');

const OUT_JSON = path.join(ROOT, 'export-allowlist.json');
const OUT_TS = path.join(REPO, 'supabase', 'functions', '_shared', 'exportAllowlist.ts');

const REL = (p) => path.relative(REPO, p).split(path.sep).join('/');

const VOCABULARIO_EXCLUSAO = [
  'telemetria_interna',
  'pii_de_terceiro',
  'segredo',
  'configuracao_do_produto',
  'vocabulario_do_sistema',
];

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------
function morrer(msg) {
  console.error(msg);
  process.exit(1);
}

/**
 * ⚠ `safeLoad`, NUNCA `load`.
 * Em js-yaml 3.x o `load` usa `DEFAULT_FULL_SCHEMA`, que aceita tipos
 * JavaScript; o `safeLoad` usa o schema seguro. O `gen-pii-md.cjs:110` usa a
 * forma insegura — essa linha especificamente NÃO é para ser copiada. O risco
 * prático é nulo (a entrada é arquivo do próprio repositório), mas um script de
 * compliance que carrega YAML com schema full é exatamente o detalhe que uma
 * auditoria futura marca.
 */
const lerYaml = (p) => yaml.safeLoad(fs.readFileSync(p, 'utf8'));

function lerCatalogo() {
  if (!fs.existsSync(CATALOGO)) {
    morrer(
      `ERRO: catálogo vivo ausente em ${REL(CATALOGO)}.\n` +
        `  Ele é MEDIDO contra PROD pelo orquestrador no plano 44-03 (M2) e é a\n` +
        `  fonte da EXISTÊNCIA de coluna. Sem ele a allowlist sairia derivada de\n` +
        `  documento datado — que é literalmente o defeito que o BD-6 mediu.\n` +
        `  Consulta reprodutora: docs/compliance/sql/01-pii-catalog.sql`,
    );
  }
  let cat;
  try {
    cat = JSON.parse(fs.readFileSync(CATALOGO, 'utf8'));
  } catch (e) {
    morrer(`ERRO: ${REL(CATALOGO)} não é JSON válido — ${e.message}`);
  }
  if (!cat || !cat.meta || !cat.meta.medido_em) {
    morrer(
      `ERRO: ${REL(CATALOGO)} sem meta.medido_em.\n` +
        `  Todo número deste artefato carrega o carimbo da medição que o autorizou\n` +
        `  (44-MEASUREMENTS §Regra de honestidade de número). Um catálogo sem data\n` +
        `  é indistinguível de um catálogo colado de outra semana.`,
    );
  }
  if (!Array.isArray(cat.colunas) || cat.colunas.length === 0) {
    morrer(`ERRO: ${REL(CATALOGO)} sem a lista \`colunas\` (formato: [{tabela, coluna, tipo}]).`);
  }
  return cat;
}

// ---------------------------------------------------------------------------
// Regras R1–R5 do `pii-inventory.yaml`, como funções pequenas
// ---------------------------------------------------------------------------
// R2 NÃO mora aqui: ela é a única regra cujo veredito de EXPORT depende de para
// QUEM o ponteiro aponta, e essa partição é DADO (bloco `ponteiros` do
// export-scope-rules.yaml), não código.
//
// R4 também não mora aqui, e a ausência é deliberada: "configuração de vaga,
// biblioteca de perguntas, templates, itens de teste" é regra de TABELA, e
// tabela vive em `fora_do_escopo_por_regra`. Se R4 pudesse resolver uma COLUNA
// de tabela em escopo do titular, "conteúdo do produto" viraria a porta por
// onde uma coluna não classificada sairia calada.

/** R1 — identificador técnico ou carimbo temporal. */
const R1 = (nome) =>
  nome === 'id' ||
  /_id$/.test(nome) ||
  nome === 'created_at' ||
  nome === 'updated_at' ||
  nome === 'deleted_at' ||
  /_em$/.test(nome);

/** R3 — estado de processo: flag, contador, score, enum de status/etapa, timestamp de fluxo. */
const TIPOS_R3 = /^(boolean|smallint|integer|bigint|numeric|decimal|real|double precision|date|time|timestamp|USER-DEFINED)/;
const R3 = (_nome, tipo) => typeof tipo === 'string' && TIPOS_R3.test(tipo);

/** R5 — jsonb de análise de IA e snapshots de estado. */
const R5_NOMES = new Set(['raw_response', 'conteudo_jsonb', 'metadata', 'dados_antes', 'dados_depois']);
const R5 = (nome) => /^analise_ia/.test(nome) || R5_NOMES.has(nome);

/**
 * Nome que ANUNCIA endereço: `*_url`, `url_*`, `*_uri`, `*_link`, `link_*` e os
 * plurais. É o gatilho do fecho de `ponteiros_de_infra` — não o veredito.
 *
 * ⚠ O padrão decide QUEM PRECISA DE VEREDITO, nunca qual é o veredito. A
 * distinção é o ponto: `agendamentos_entrevista.local_ou_link` e
 * `candidatos.instagram_url` casam o padrão e ficam VISÍVEIS no arquivo legível,
 * porque são dado do titular. Se o padrão decidisse sozinho, o gerador estaria
 * escondendo do titular o que ele mesmo digitou — e ninguém teria assinado isso.
 *
 * O padrão viaja para dentro do artefato (`meta.padrao_nome_de_endereco`) porque
 * o consumidor do arquivo legível precisa do MESMO padrão para fechar o caso de
 * tabela desconhecida, e duas cópias de uma regex divergem.
 */
const NOME_DE_ENDERECO = '(^|_)(url|urls|uri|uris|link|links)($|_)';
const casaNomeDeEndereco = (nome) => new RegExp(NOME_DE_ENDERECO).test(nome);

/** Glob de nome de TABELA: `config_*`, `*_itens`, `perguntas*`. */
function casaGlob(padrao, nome) {
  const re = new RegExp(
    '^' +
      padrao
        .split('*')
        .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*') +
      '$',
  );
  return re.test(nome);
}

// ---------------------------------------------------------------------------
// Fecho
// ---------------------------------------------------------------------------
function construir() {
  const cat = lerCatalogo();
  const inv = lerYaml(INVENTARIO);
  const esc = lerYaml(ESCOPO);

  const erros = [];

  for (const bloco of ['meta', 'escopo_titular', 'fora_do_escopo', 'fora_do_escopo_por_regra', 'colunas_nunca', 'ponteiros', 'ponteiros_de_infra', 'decisoes_por_coluna']) {
    if (!esc[bloco]) erros.push(`${REL(ESCOPO)}: bloco obrigatório ausente — \`${bloco}\``);
  }
  if (erros.length) morrer(erros.join('\n'));

  // --- catálogo vivo → mapa tabela → { coluna: tipo } ----------------------
  const vivo = new Map();
  for (const c of cat.colunas) {
    if (!vivo.has(c.tabela)) vivo.set(c.tabela, new Map());
    vivo.get(c.tabela).set(c.coluna, c.tipo);
  }

  // --- vocabulário fechado das exclusões ----------------------------------
  for (const [t, razao] of Object.entries(esc.fora_do_escopo)) {
    if (!VOCABULARIO_EXCLUSAO.includes(razao)) {
      erros.push(`fora_do_escopo.${t}: razão \`${razao}\` fora do vocabulário fechado (${VOCABULARIO_EXCLUSAO.join(' | ')})`);
    }
  }
  for (const r of esc.fora_do_escopo_por_regra) {
    // Uma regra sem razão é a MESMA omissão que este arquivo existe para impedir.
    if (!r || !r.id || !r.padrao || !r.razao) {
      erros.push(`fora_do_escopo_por_regra: entrada sem id/padrao/razao — ${JSON.stringify(r)}`);
    } else if (!VOCABULARIO_EXCLUSAO.includes(r.razao)) {
      erros.push(`fora_do_escopo_por_regra.${r.id}: razão \`${r.razao}\` fora do vocabulário fechado`);
    }
  }

  // --- fecho sobre a PRÓPRIA regra R2 do inventário ------------------------
  // Todo nome citado no `padrao` da R2 tem de aparecer em `ponteiros`. É o que
  // impede a regra do inventário de crescer sem que o escopo tome conhecimento.
  const doTitular = new Set(esc.ponteiros.do_titular || []);
  const deTerceiro = new Set(esc.ponteiros.de_terceiro || []);
  const regraR2 = (inv.regras_padrao || []).find((r) => r.id === 'R2');
  if (regraR2) {
    for (const nome of String(regraR2.padrao).split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!doTitular.has(nome) && !deTerceiro.has(nome)) {
        erros.push(
          `fecho da regra R2: \`${nome}\` é ponteiro de pessoa no ${REL(INVENTARIO)} e não aparece ` +
            `em \`ponteiros.do_titular\` nem em \`ponteiros.de_terceiro\` do ${REL(ESCOPO)}`,
        );
      }
    }
  }

  // --- fecho de TABELAS ----------------------------------------------------
  // ⚠ O universo do fecho é `cat.tabelas` (a lista COMPLETA de tabelas base de
  // `public`), NÃO as tabelas que aparecem em `cat.colunas`. A medição do
  // catálogo colhe colunas apenas das tabelas do escopo declarado — derivar o
  // universo delas faria o fecho perguntar "toda tabela que eu já sabia que
  // existia tem disposição?", que é uma tautologia. A tabela NOVA, que é
  // precisamente o caso do BD-6, nunca teria coluna colhida e escaparia calada.
  // `cat.tabelas` é opcional por compatibilidade com catálogos antigos; quando
  // ausente, o fecho degrada para o universo das colunas e diz isso no artefato.
  const universoTabelas = Array.isArray(cat.tabelas) && cat.tabelas.length ? cat.tabelas : [...vivo.keys()];
  const fechoSobreCatalogoCompleto = Array.isArray(cat.tabelas) && cat.tabelas.length > 0;

  const excluidas = {};
  const emEscopo = [];
  for (const tabela of [...new Set(universoTabelas)].sort()) {
    if (esc.escopo_titular[tabela]) {
      // Tabela em escopo cujo catálogo não trouxe coluna nenhuma produziria uma
      // entrada de allowlist VAZIA — um export honesto por acidente de estar em
      // branco. É o mesmo modo de falha que o fecho de `chave_titular` cobre.
      if (!vivo.has(tabela)) {
        erros.push(
          `ERRO DE FECHAMENTO (catálogo incompleto): \`${tabela}\` está em \`escopo_titular\` e existe ` +
            `em \`tabelas\` do catálogo, mas NENHUMA coluna dela foi colhida. Refaça a medição incluindo-a — ` +
            `gerar assim produziria uma projeção vazia que parece cópia honesta.`,
        );
        continue;
      }
      emEscopo.push(tabela);
      continue;
    }
    if (esc.fora_do_escopo[tabela]) {
      excluidas[tabela] = esc.fora_do_escopo[tabela];
      continue;
    }
    const regra = esc.fora_do_escopo_por_regra.find((r) => r && r.padrao && casaGlob(r.padrao, tabela));
    if (regra) {
      excluidas[tabela] = regra.razao;
      continue;
    }
    erros.push(
      `ERRO DE FECHAMENTO (tabela): \`${tabela}\` existe no catálogo vivo e não cai em ` +
        `\`escopo_titular\`, \`fora_do_escopo\` nem em regra de \`fora_do_escopo_por_regra\`. ` +
        `Decida em ${REL(ESCOPO)} — omitir em silêncio não é opção.`,
    );
  }

  // Tabela declarada em escopo que ainda não existe: AVISO, não erro. Tabela
  // ausente não vaza coluna nenhuma; o caminho perigoso é o inverso, e o fecho
  // acima já o cobre.
  const declaradasNaoVivas = Object.keys(esc.escopo_titular).filter((t) => !vivo.has(t)).sort();

  // --- fecho de CHAVE DE TITULAR -------------------------------------------
  for (const tabela of emEscopo) {
    const { chave_titular: chave, razao } = esc.escopo_titular[tabela];
    if (!chave || !razao) {
      erros.push(`escopo_titular.${tabela}: \`chave_titular\` e \`razao\` são obrigatórios`);
      continue;
    }
    if (!vivo.get(tabela).has(chave)) {
      erros.push(
        `ERRO DE FECHAMENTO (chave): \`${tabela}.${chave}\` é declarada como \`chave_titular\` e ` +
          `NÃO existe no catálogo vivo. O mapa de chaves é dado; um dado errado tem de parar a ` +
          `geração em vez de render uma leitura vazia em runtime.`,
      );
    }
  }

  // --- fecho de COLUNAS ----------------------------------------------------
  const vetos = new Set(esc.colunas_nunca || []);
  const tabelas = {};

  for (const tabela of emEscopo) {
    const decl = esc.escopo_titular[tabela];
    const colunas = [];
    const proveniencia = {};
    const colunas_excluidas = {};

    for (const [coluna, tipo] of [...vivo.get(tabela).entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      const chave = `${tabela}.${coluna}`;

      // 1 · veto absoluto — precede tudo, inclusive entrada explícita do inventário
      if (vetos.has(coluna)) {
        colunas_excluidas[coluna] = 'veto_absoluto (colunas_nunca)';
        continue;
      }
      // 2 · decisão explícita por coluna
      const decisao = esc.decisoes_por_coluna[chave];
      if (decisao !== undefined) {
        if (decisao.export === true) {
          colunas.push(coluna);
          proveniencia[coluna] = 'decisoes_por_coluna';
        } else {
          colunas_excluidas[coluna] = `decisoes_por_coluna: ${decisao.razao || 'sem razão'}`;
        }
        continue;
      }
      // 3 · ponteiro de pessoa (R2 partida) — ANTES da entrada explícita do
      //     inventário de propósito: o inventário classifica `agendado_por` e
      //     `avaliador_id` como `preservar` com nota "Funcionário", e entrada
      //     explícita venceria a regra. Seguir a ordem literal exportaria UUID
      //     de funcionário na cópia do candidato — a mesma `pii_de_terceiro`
      //     que o escopo exclui no nível da tabela.
      if (deTerceiro.has(coluna)) {
        colunas_excluidas[coluna] = 'pii_de_terceiro (R2)';
        continue;
      }
      if (doTitular.has(coluna)) {
        colunas.push(coluna);
        proveniencia[coluna] = 'R2:do_titular';
        continue;
      }
      // 4 · entrada explícita de coluna no inventário
      const entrada = inv.tabelas && inv.tabelas[tabela] && inv.tabelas[tabela].colunas && inv.tabelas[tabela].colunas[coluna];
      if (entrada) {
        colunas.push(coluna);
        proveniencia[coluna] = `inventario:${entrada.classificacao}`;
        continue;
      }
      // 5–7 · regras por padrão
      if (R1(coluna)) {
        colunas.push(coluna);
        proveniencia[coluna] = 'R1';
        continue;
      }
      if (R3(coluna, tipo)) {
        colunas.push(coluna);
        proveniencia[coluna] = 'R3';
        continue;
      }
      if (R5(coluna)) {
        colunas.push(coluna);
        proveniencia[coluna] = 'R5';
        continue;
      }
      // 8 · sobra
      erros.push(
        `ERRO DE FECHAMENTO (coluna): \`${chave}\` (tipo ${tipo}) existe no catálogo vivo e nenhuma ` +
          `fonte a resolve — nem \`colunas_nunca\`, nem \`decisoes_por_coluna\`, nem \`ponteiros\`, ` +
          `nem entrada explícita no ${REL(INVENTARIO)}, nem R1/R3/R5. ` +
          `Dê um veredito em \`decisoes_por_coluna\` do ${REL(ESCOPO)}.`,
      );
    }

    tabelas[tabela] = {
      chave_titular: decl.chave_titular,
      ligacao: decl.ligacao,
      razao: decl.razao,
      colunas,
      proveniencia,
      colunas_excluidas,
      // Preenchido pelo fecho de PONTEIROS DE INFRA, logo abaixo. A chave existe
      // SEMPRE, inclusive vazia: o consumidor distingue "esta tabela não tem
      // endereço nenhum" de "este artefato é velho e não conhece a chave".
      fora_do_arquivo_legivel: [],
    };
  }

  // --- fecho de PONTEIROS DE INFRA ----------------------------------------
  // O que decide o que a PESSOA lê no `.html`. Duas direções, e as duas mordem:
  //
  //  · DIRETA — coluna EXPORTADA com nome de endereço e sem veredito FALHA a
  //    geração. É o que impede a próxima coluna `*_url` de entrar no arquivo
  //    legível em silêncio, que é literalmente o defeito que este bloco corrige.
  //  · INVERSA — veredito que não aponta mais para coluna exportada de tabela em
  //    escopo é ÓRFÃO, e uma exclusão órfã DEIXA DE EXCLUIR sem avisar: a coluna
  //    renomeada volta a ser renderizada com o veredito antigo apodrecendo ao
  //    lado. Mesmo modo de falha que o `05-export-allowlist-drift.sql` já nomeia.
  const infra = esc.ponteiros_de_infra || {};
  for (const [chave, v] of Object.entries(infra)) {
    if (!v || typeof v.fora_do_arquivo_legivel !== 'boolean' || !v.razao) {
      erros.push(
        `ponteiros_de_infra.${chave}: \`fora_do_arquivo_legivel\` (booleano) e \`razao\` são ` +
          `obrigatórios. Um veredito sem razão é a omissão que este bloco existe para impedir.`,
      );
      continue;
    }
    const [tabela, coluna] = chave.split('.');
    if (!tabelas[tabela] || !tabelas[tabela].colunas.includes(coluna)) {
      erros.push(
        `VEREDITO ÓRFÃO (ponteiros_de_infra): \`${chave}\` tem veredito em ${REL(ESCOPO)} e NÃO é ` +
          `coluna exportada de tabela em escopo. Um veredito órfão deixa de valer em silêncio — ` +
          `remova-o ou corrija o nome.`,
      );
      continue;
    }
    if (v.fora_do_arquivo_legivel) tabelas[tabela].fora_do_arquivo_legivel.push(coluna);
  }
  for (const [tabela, t] of Object.entries(tabelas)) {
    t.fora_do_arquivo_legivel.sort();
    for (const coluna of t.colunas) {
      if (!casaNomeDeEndereco(coluna)) continue;
      if (infra[`${tabela}.${coluna}`] !== undefined) continue;
      erros.push(
        `ERRO DE FECHAMENTO (ponteiro de infra): \`${tabela}.${coluna}\` é EXPORTADA e tem nome de ` +
          `endereço, e nenhum veredito em \`ponteiros_de_infra\` do ${REL(ESCOPO)} diz se ela se LÊ ` +
          `ou se é ponteiro. Declare \`fora_do_arquivo_legivel\` com razão — as duas respostas são ` +
          `legítimas, o silêncio não é.`,
      );
    }
  }

  if (erros.length) {
    console.error(`FECHAMENTO REPROVADO — ${erros.length} pendência(s):\n`);
    for (const e of erros) console.error('  · ' + e);
    console.error(
      `\nA geração NÃO produziu artefato. Isto é o mecanismo do BD-6 funcionando:\n` +
        `uma coluna viva sem veredito nunca sai em silêncio da allowlist.`,
    );
    process.exit(1);
  }

  const colunasExportadas = Object.values(tabelas).reduce((a, t) => a + t.colunas.length, 0);
  // ⚠ A CONTRAPARTE DO NÚMERO ACIMA, e ela não é decoração. `colunas_exportadas`
  // sozinha não permite a ninguém — nem à Phase 45, que consome este artefato como
  // plano de exclusão (EXPORT-06) — saber se as colunas que ficaram de fora ficaram
  // por VEREDITO ou por ESQUECIMENTO. A soma das duas TEM de fechar com as colunas
  // vivas das tabelas em escopo, e é essa identidade que o smoke SQL verifica.
  const colunasExcluidasEmEscopo = Object.values(tabelas).reduce(
    (a, t) => a + Object.keys(t.colunas_excluidas || {}).length,
    0,
  );
  const colunasForaDoArquivoLegivel = Object.values(tabelas).reduce(
    (a, t) => a + t.fora_do_arquivo_legivel.length,
    0,
  );

  return {
    meta: {
      requirement: 'EXPORT-02',
      fase: 44,
      versao: esc.meta.versao,
      // `gerado_em` é carimbo de EXECUÇÃO; em `--check` ele é pinado a partir do
      // artefato em disco, senão toda checagem divergiria pelo relógio.
      gerado_em: new Date().toISOString(),
      // ⚠ COPIADO do catálogo, JAMAIS gerado aqui (T-44-13). É o que torna a
      // proveniência do artefato irrepudiável.
      medido_em: cat.meta.medido_em,
      fonte_catalogo: REL(CATALOGO),
      fonte_classificacao: REL(INVENTARIO),
      fonte_escopo: REL(ESCOPO),
      gerador: REL(path.join(__dirname, 'gen-export-allowlist.cjs')),
      consumidores: esc.meta.consumidores,
      // ⚠ NOMES LITERAIS. `tabelas_catalogadas` é o universo do fecho de tabela;
      // `tabelas_com_colunas_colhidas` é o universo do fecho de COLUNA. Chamar
      // qualquer um dos dois de "tabelas_vivas" faria o artefato afirmar que
      // `public` tem 50 tabelas quando a medição registrou 67 — número falso em
      // arquivo de compliance é pior que número ausente.
      totais: {
        tabelas_catalogadas: [...new Set(universoTabelas)].length,
        tabelas_com_colunas_colhidas: vivo.size,
        colunas_colhidas: cat.colunas.length,
        tabelas_em_escopo: emEscopo.length,
        colunas_exportadas: colunasExportadas,
        colunas_excluidas_em_escopo: colunasExcluidasEmEscopo,
        // A identidade que o smoke verifica contra `information_schema`:
        // exportadas + excluídas = colunas vivas das tabelas em escopo. Uma coluna
        // que não esteja em nenhum dos dois lados é coluna SEM VEREDITO.
        colunas_com_veredito_em_escopo: colunasExportadas + colunasExcluidasEmEscopo,
        tabelas_excluidas: Object.keys(excluidas).length,
        // ⚠ NÃO entra na identidade acima de propósito. Estas colunas SÃO
        // exportadas (o `.json` as carrega); o que elas não fazem é aparecer no
        // arquivo que a pessoa lê. Somá-las às excluídas confundiria dois fatos
        // diferentes num número só.
        colunas_fora_do_arquivo_legivel: colunasForaDoArquivoLegivel,
      },
      // O padrão que dispara o fecho de `ponteiros_de_infra`. Viaja no artefato
      // porque o gerador do arquivo legível precisa do MESMO padrão para fechar o
      // caso da tabela que ele não conhece (artefato do cliente mais novo que a
      // Edge Function implantada, ou o contrário). Duas cópias de uma regex
      // divergem; esta é a única.
      padrao_nome_de_endereco: NOME_DE_ENDERECO,
      // Os totais MEDIDOS contra o banco, copiados do catálogo como `medido_em`
      // — nunca recontados aqui. É o denominador honesto do fecho.
      totais_medidos_em_public: (cat.meta && cat.meta.totais) || null,
      fecho_de_tabela_sobre_catalogo_completo: fechoSobreCatalogoCompleto,
      escopo_declarado_nao_vivo: declaradasNaoVivas,
    },
    tabelas,
    excluidas,
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
    ` * exportAllowlist.ts — ESPELHO GERADO da allowlist do export.\n` +
    ` *\n` +
    ` * Requirement: EXPORT-02 · EXPORT-06 · Phase 44\n` +
    ` *\n` +
    ` * ⚠ ARQUIVO GERADO por \`docs/compliance/sql/gen-export-allowlist.cjs\`.\n` +
    ` * NÃO EDITAR À MÃO — \`--check\` reprova qualquer divergência, e reprova\n` +
    ` * este arquivo separadamente do \`.json\`: um \`--check\` que olhasse só um\n` +
    ` * dos dois deixaria o outro apodrecer.\n` +
    ` *\n` +
    ` * POR QUE UM MÓDULO .ts E NÃO O IMPORT DO .json\n` +
    ` * Import estático de JSON saindo do diretório da Edge Function é a assunção\n` +
    ` * A1 da 44-RESEARCH e pode NÃO sobreviver ao bundler do deploy. Um módulo\n` +
    ` * TypeScript comum não depende de resolução de JSON. Uma fonte só (o\n` +
    ` * gerador), dois artefatos, ambos sob \`--check\`.\n` +
    ` *\n` +
    ` * Regenerar: node docs/compliance/sql/gen-export-allowlist.cjs\n` +
    ` */\n` +
    `export const EXPORT_ALLOWLIST = ${JSON.stringify(ordenar(doc), null, 2)} as const;\n`
  );
}

// ---------------------------------------------------------------------------
// Modos
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

/**
 * Os DOIS conjuntos que o smoke SQL precisa — e por que são dois.
 *
 * A allowlist é, POR DESENHO, um subconjunto próprio das colunas vivas das
 * tabelas em escopo (358 de 392 na geração de 2026-08-03). Um smoke que
 * definisse drift como `viva AND NOT IN allowlist` devolveria as 34 exclusões
 * TODA VEZ, para sempre — e um relatório que sempre mostra 34 linhas treina
 * todo mundo a ignorá-lo. A linha 35, que é o vazamento real, passaria
 * despercebida, e a prova de mordida não distinguiria 35 de ruído.
 *
 * É a imagem espelhada do P39/CR-02: uma guarda que grita sempre é tão inútil
 * quanto uma que nunca grita.
 *
 * Por isso o universo com veredito é `allowlist ∪ excluídas`, e é contra ELE
 * que o catálogo vivo é comparado. Sobra dos dois lados = coluna sem veredito.
 */
function paresPor(doc, quais) {
  const pares = [];
  for (const [tabela, t] of Object.entries(doc.tabelas)) {
    const nomes = quais === 'colunas' ? t.colunas : Object.keys(t.colunas_excluidas || {});
    for (const coluna of nomes) pares.push(`('${tabela}','${coluna}')`);
  }
  return pares.sort();
}

/**
 * Nada além dos pares: a saída é para ser COLADA no `VALUES` do smoke SQL.
 *
 * ⚠ A INDENTAÇÃO DE 4 ESPAÇOS É PARTE DO CONTRATO, NÃO ESTILO.
 * O extrator da asserção (k) de `exportAllowlist.test.ts` casa
 * `/^ {4}\('([a-z0-9_]+)','([a-z0-9_]+)'\),?$/`, com o `{4}` literal. Emitir sem
 * indentação (como esta função fazia até o plano 44-04) faz o extrator ler ZERO
 * pares e a (k) falhar dizendo "o `VALUES` envelheceu" — mensagem que aponta
 * para a causa errada, e que custa uma investigação inteira antes de alguém
 * desconfiar do espaço em branco.
 *
 * Enquanto a indentação era responsabilidade de quem colava, "Colar SQL" no
 * docblock era falso: a saída não era colável sem uma edição manual que nenhum
 * lugar documentava. Alinhar o gerador ao consumidor é a correção certa — o
 * inverso (afrouxar o regex para `^\s*\(`) faria a asserção aceitar um bloco
 * desalinhado e perderia a única checagem barata de que o paste caiu no lugar
 * certo do arquivo.
 */
const INDENT_VALUES = '    ';
function emitirPares(pares) {
  if (!pares.length) {
    // Um `VALUES` vazio é SQL inválido. Melhor falhar alto aqui do que colar um
    // bloco que só quebra quando alguém rodar a consulta contra PROD.
    morrer('ERRO: conjunto vazio — não há pares para emitir. O smoke SQL não pode receber um `VALUES` vazio.');
  }
  process.stdout.write(
    pares.map((p, i) => INDENT_VALUES + (i === pares.length - 1 ? p : p + ',')).join('\n') + '\n',
  );
  process.exit(0);
}

// `--sql-values-excluidas` ANTES de `--sql-values`: `includes` não é prefixo,
// mas a ordem deixa explícito que a flag mais específica manda.
if (args.includes('--sql-values-excluidas')) {
  emitirPares(paresPor(construir(), 'excluidas'));
}

if (args.includes('--sql-values')) {
  emitirPares(paresPor(construir(), 'colunas'));
}

if (args.includes('--check')) {
  let discoJson = null;
  try {
    discoJson = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  } catch {
    morrer(
      `DIVERGENTE: ${REL(OUT_JSON)} ausente ou ilegível.\n` +
        `  Rode: node ${REL(path.join(__dirname, 'gen-export-allowlist.cjs'))}`,
    );
  }
  const doc = construir();
  // Pina o carimbo de execução do disco: sem isso o `--check` divergiria pelo
  // relógio e nunca poderia sair 0 — um gate que nunca passa não é um gate.
  doc.meta.gerado_em = discoJson.meta && discoJson.meta.gerado_em;

  const esperadoJson = serializarJson(doc);
  if (fs.readFileSync(OUT_JSON, 'utf8') !== esperadoJson) {
    morrer(
      `DIVERGENTE: ${REL(OUT_JSON)} não corresponde às fontes.\n` +
        `  Rode: node ${REL(path.join(__dirname, 'gen-export-allowlist.cjs'))}`,
    );
  }
  const esperadoTs = serializarTs(doc);
  const tsDisco = fs.existsSync(OUT_TS) ? fs.readFileSync(OUT_TS, 'utf8') : '';
  if (tsDisco !== esperadoTs) {
    morrer(
      `DIVERGENTE: ${REL(OUT_TS)} ${tsDisco === '' ? 'ausente' : 'não corresponde'} às fontes.\n` +
        `  O espelho .ts é gerado, não escrito à mão.\n` +
        `  Rode: node ${REL(path.join(__dirname, 'gen-export-allowlist.cjs'))}`,
    );
  }
  console.log(`OK: ${REL(OUT_JSON)} e ${REL(OUT_TS)} estão em sincronia com as três fontes.`);
  process.exit(0);
}

const doc = construir();
fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
fs.writeFileSync(OUT_JSON, serializarJson(doc));
fs.writeFileSync(OUT_TS, serializarTs(doc));

const t = doc.meta.totais;
console.log(
  `export-allowlist.json gerado — ${t.tabelas_em_escopo} tabelas em escopo, ` +
    `${t.colunas_exportadas} colunas, ${t.tabelas_excluidas} tabelas excluídas ` +
    `(catálogo medido em ${doc.meta.medido_em}).`,
);
console.log(`espelho ${REL(OUT_TS)} gerado.`);
if (doc.meta.escopo_declarado_nao_vivo.length) {
  console.error(
    `AVISO: tabela(s) declarada(s) em \`escopo_titular\` e ausente(s) do catálogo vivo: ` +
      `${doc.meta.escopo_declarado_nao_vivo.join(', ')}. Registrado em ` +
      `\`meta.escopo_declarado_nao_vivo\` — tabela ausente não vaza coluna, mas também não é para sumir do radar.`,
  );
}
