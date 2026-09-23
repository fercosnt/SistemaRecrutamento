/**
 * `_shared/sjt-rubrica.ts` — a rubrica do CASO ABERTO do SJT, por CHAVE de dimensão.
 *
 * Fase 49 / Plano 49-23 — JORN-35. Irmão de `_shared/bars-redacao.ts` (49-09): mesma
 * forma de defeito, mesma forma de conserto.
 *
 * ── O DEFEITO QUE ESTE ARQUIVO REMOVE (medido em PROD, 2026-09-22) ───────────────
 *
 * O prompt ativo `work_sample_sjt` manda pontuar «1-5 por dimensão BARS específica do
 * cenário» e o `user_template` traz o placeholder `{{BARS_RUBRIC_WITH_CRITERIA}}` —
 * mas `ResolvedPrompt` não tem `user_template`, então esse texto NUNCA é enviado a
 * provedor nenhum. O que a EF `avaliar-redacao` passava como `vagaRubricBlock` era:
 *
 *     Vaga: <uuid>
 *
 * A rubrica da pergunta (`perguntas.rubric.dimensoes`) ficava só no banco, do lado do
 * cálculo. Consequência medida na ÚNICA SJT de caso aberto avaliada em PROD
 * (`scores_candidato` id `8acf3c98`, score 7/25, `pendente_humano`): o modelo devolveu
 * como `dimension` os CINCO ITENS DO ENUNCIADO («Avaliação diagnóstica estética,
 * funcional e periodontal», «Conduta na consulta de hoje», «Plano de tratamento de
 * curto e médio prazo», «Comunicação com a paciente…», «Riscos, consentimento e
 * acompanhamento») — ZERO casando as 5 chaves da rubrica. E `dimension` é
 * `z.string()` livre no `WorkSampleScoringSchema`, então nada reprovava.
 *
 * O dano não era o nome errado: era o peso-PADRÃO 1 para chave desconhecida em
 * `avaliar-redacao/index.ts:131` — o `??` que devolvia 1 quando a busca do peso pelo
 * nome devolvido falhava. (A expressão NÃO é citada aqui de propósito: o portão
 * estático deste plano procura por ela no disco, e reproduzi-la para registro
 * histórico a deixaria encontrável — quem grepasse pelo defeito voltaria a achá-lo.
 * Mesma decisão do 49-09 em `essay-schemas.ts`.)
 * Nenhum nome casava ⇒ TODA dimensão caía no peso 1 ⇒
 * a média ponderada 25/20/25/15/15 virava média UNIFORME, com aparência de nota
 * ponderada. Com os scores reais devolvidos (1,1,1,2,2) o composto uniforme deu 7,00;
 * pela rubrica daria 6,50. Um número plausível, medindo outra coisa.
 *
 * ── CONTRATO: ZERO IMPORTS ──────────────────────────────────────────────────────
 * Nenhum `npm:`, nenhuma URL remota, nenhum `https://deno.land/std`. Molde de
 * `email-config.ts:12-17` e de `bars-redacao.ts`. Motivos: (a) o arquivo entra no
 * fechamento de import de qualquer EF sem exigir entrada de import map; (b) o teste
 * roda sem `--allow-net`; (c) se um dia a tela do RH precisar dos rótulos, ela o
 * importa por caminho relativo do `src/` — um único `npm:` aqui quebraria isso e
 * obrigaria a DUPLICAR a tabela, e duas tabelas de rubrica divergem em silêncio.
 * Há portão estático para isso.
 *
 * ── FONTE DE CADA CAMPO (nada aqui é inferido de arquivo vizinho) ────────────────
 *
 * As 5 CHAVES e os PESOS são os vivos, lidos de PROD e idênticos ao seed:
 *   `perguntas.rubric.dimensoes` da única pergunta `formato='caso_aberto'`
 *   (`11000001-…-0000000000ca`, dentista, «O sorriso dos sonhos da Mariana»),
 *   seed em `supabase/migrations/20260611000002_perguntas_sjt.sql:181-195`.
 *   Medido em 2026-09-22: 25/20/25/15/15, exatamente as 5 chaves abaixo.
 *
 * `rotulo`, `dimensao_clinica`, `inclusion` e `exclusion`: TRANSCRITOS da tabela
 *   «Rubric BARS (0-5 por dimensão)» de `docs/conhecimento/sjt/banco-sjt-dentista.md`
 *   (linhas 83-89) — a rubrica do próprio caso, que é o que o RH lê. A coluna
 *   «Dimensão» daquela tabela é quem declara o mapeamento chave → dimensão clínica
 *   (D10, D10, D2/D6, D1/D9, D3/D5); isso não é inferência minha, está escrito lá.
 *
 * `template_bars`: os templates reutilizáveis da Parte B de
 *   `docs/conhecimento/sjt/bars-rubrics-por-dimensao.md` (linhas 65-83), anexados
 *   SOMENTE onde o próprio template declara reuso neste caso («reuso: Mariana»):
 *   B4 → `raciocinio_clinico_estetico`, B1 → `comunicacao_expectativa`. Os outros
 *   três ficam `null` — B2 é «Honestidade / Ética comercial (reuso: Renata, SDR
 *   work-sample, CV-*)» e B3 é «Priorização / In-basket (reuso: Assistente
 *   Financeiro)»: casá-los com `etica_minimamente_invasivo` e `planejamento_decisao`
 *   pela semelhança do nome seria exatamente a invenção que este arquivo existe
 *   para acabar.
 *
 * `REGRA_NIVEIS_SJT`: TRANSCRITA de `bars-rubrics-por-dimensao.md:63` («Regra de
 *   scoring (igual ao template 07)»). O `system_template` ativo de `work_sample_sjt`
 *   carrega a MESMA regra, palavra por palavra (conferido em PROD) — ela é repetida
 *   dentro do bloco de propósito: `callAi` entrega este texto SEM rótulo e SEM
 *   ordenação garantida, então o bloco tem de se explicar sozinho, sem depender de
 *   um texto de sistema que ele não pode ler.
 *
 * ── ⚠ `ancoras` É `null` NAS CINCO, E ISSO É UMA MEDIÇÃO, NÃO UM ESQUECIMENTO ────
 *
 * Não existem âncoras 1–5 por dimensão DA RUBRICA em nenhuma das fontes. O que
 * existe são âncoras 1–5 das 10 DIMENSÕES CLÍNICAS do catálogo
 * (`PESQUISA-sjt-odontologia-beauty-smile.md` §5, e a D1 repetida em
 * `bars-rubrics-por-dimensao.md` Parte A) — outra coisa. Transcrevê-las para cá seria
 * falsa atribuição, por duas razões independentes e verificáveis na tabela da fonte:
 *
 *   1. DUAS chaves da rubrica declaram a MESMA dimensão clínica (D10:
 *      `raciocinio_clinico_estetico` e `planejamento_decisao`). Copiar as âncoras da
 *      D10 nas duas as tornaria idênticas — e os `inclusion` delas são diferentes.
 *   2. TRÊS chaves declaram um PAR (D2/D6, D1/D9, D3/D5). Escolher uma das duas é
 *      arbítrio; fundir as duas é composição. As duas coisas produzem uma âncora que
 *      nenhuma fonte escreveu.
 *
 *   E o conteúdo divergiria: a âncora 5 da D10 é «Cita literatura recente; integra
 *   evidência + experiência clínica + preferência do paciente» — que NÃO é o nível 5
 *   de `planejamento_decisao` segundo a rubrica do caso («Sequência correta
 *   placa/periodonto → planejamento → execução; opções minimamente invasivas»).
 *   Uma âncora emprestada faria o modelo pontuar a dimensão errada com aparência de
 *   rigor.
 *
 * Logo: `ancoras: null` nas cinco, e o bloco diz ao modelo, em voz alta, que não há
 * âncoras por nível para aquela dimensão e que ele deve aplicar a REGRA_NIVEIS_SJT
 * sobre o `inclusion`/`exclusion` dela — sem inventar. O campo `ancoras` continua no
 * tipo porque a própria fonte prevê que elas cheguem
 * (`bars-rubrics-por-dimensao.md:43`: «As âncoras 1-5 das demais dimensões (D2-D10)
 * … devem ser portadas para este arquivo conforme cada uma for usada num case») e o
 * caminho de renderização existe e é exercitado por teste (catálogo injetado).
 *
 * ⚠ Há teste fixando `ancoras === null` nas cinco. Se um dia âncoras REAIS por
 * dimensão da rubrica existirem numa fonte, esse teste reprova de propósito: ele
 * obriga quem as acrescentar a registrar de onde veio cada uma.
 *
 * ── RNF-07a ─────────────────────────────────────────────────────────────────────
 * Nada aqui rejeita candidato. O caso aberto SEMPRE passa por revisão humana
 * (`docs/prds/m2-funil-rh/PRD-sjt-work-sample-odontologia.md` RF-SJT-05: `< 13/25`
 * OU red flag → revisão; nunca rejeição automática).
 *
 * @module supabase/functions/_shared/sjt-rubrica
 * @see supabase/functions/_shared/bars-redacao.ts (o irmão, 49-09 — mesma forma)
 * @see supabase/functions/avaliar-redacao/index.ts (o único consumidor hoje)
 */

/** Uma dimensão da rubrica do caso aberto, indexada pela CHAVE que a vaga declara. */
export interface DimensaoSjt {
  /** Nome pt-BR que o RH lê. Transcrito da rubrica do caso. */
  readonly rotulo: string;
  /**
   * Âncoras comportamentais por nível, 5→1. `null` quando a fonte NÃO traz âncoras
   * por nível para ESTA dimensão da rubrica — ver o §`ancoras` do docblock. Nunca
   * preencher com âncoras de outra dimensão.
   */
  readonly ancoras: Record<1 | 2 | 3 | 4 | 5, string> | null;
  /** Dimensão(ões) do catálogo clínico que a rubrica do caso cita para esta chave. */
  readonly dimensao_clinica: string;
  /** Critérios que DEVEM estar presentes (coluna «Inclusion» da rubrica do caso). */
  readonly inclusion: string;
  /** Critérios que NÃO podem estar presentes (coluna «Exclusion / Red flag»). */
  readonly exclusion: string;
  /** Template reutilizável da Parte B, só onde o template declara reuso neste caso. */
  readonly template_bars: {
    readonly id: string;
    readonly nome: string;
    readonly inclusion_5: string;
    readonly exclusion_5: string;
  } | null;
}

/**
 * Regra de conversão de critérios em score, 5→1.
 *
 * TRANSCRITA de `docs/conhecimento/sjt/bars-rubrics-por-dimensao.md:63`. É a MESMA
 * regra que o `system_template` ativo de `work_sample_sjt` carrega (conferido em
 * PROD) — repetida aqui porque o bloco tem de se explicar sozinho.
 */
export const REGRA_NIVEIS_SJT: Record<5 | 4 | 3 | 2 | 1, string> = {
  5: "todos inclusion atendidos + nenhum exclusion violado",
  4: "maioria dos inclusion + nenhum exclusion crítico",
  3: "~metade dos inclusion + 1 exclusion menor",
  2: "poucos inclusion + 2 ou mais exclusion",
  1: "inclusion ausente OU 1+ exclusion crítico",
};

/**
 * Regra do `insufficient_evidence`, transcrita da mesma fonte (`:63`) e coerente com
 * o `system_template` ativo («Não chutar baixo»).
 */
export const REGRA_INSUFFICIENT_SJT =
  "a resposta não aborda a dimensão. Use `insufficient_evidence` — não chutar baixo.";

/**
 * As 5 dimensões da rubrica do caso aberto, indexadas pela CHAVE VIVA de
 * `perguntas.rubric.dimensoes`.
 *
 * ⚠ A chave é o contrato. O peso NÃO está aqui de propósito: ele vem da rubrica da
 * VAGA em tempo de execução (um admin pode reponderar sem tocar código), e congelar
 * 25/20/25/15/15 numa constante seria a «fotografia que se apresenta como
 * invariante» que o CLAUDE.md §«Portões» descreve.
 */
export const DIMENSOES_SJT: Record<string, DimensaoSjt> = {
  raciocinio_clinico_estetico: {
    rotulo: "Raciocínio clínico-estético",
    ancoras: null,
    dimensao_clinica: "D10",
    inclusion:
      "Identifica gengivite (tratar antes), bruxismo (proteção/contenção), exposição gengival e apinhamento como fatores que mudam o plano",
    exclusion: "Parte direto pro preparo de lentes ignorando gengivite/bruxismo",
    template_bars: {
      id: "B4",
      nome: "Raciocínio clínico-estético",
      inclusion_5:
        "identifica condições subjacentes a tratar antes da estética; opções minimamente invasivas; integra evidência",
      exclusion_5:
        "parte pra intervenção estética ignorando condições de base; desgaste agressivo sem indicação",
    },
  },
  planejamento_decisao: {
    rotulo: "Planejamento / decisão",
    ancoras: null,
    dimensao_clinica: "D10",
    inclusion:
      "Sequência correta (placa/periodonto → planejamento → execução); oferece opções minimamente invasivas (clareamento + alinhador + facetas com mínimo/sem desgaste)",
    exclusion: 'Desgaste agressivo de dentes hígidos sem indicação; "começar hoje"',
    template_bars: null,
  },
  comunicacao_expectativa: {
    rotulo: "Comunicação / expectativa",
    ancoras: null,
    dimensao_clinica: "D2/D6",
    inclusion:
      'Alinha expectativa do Instagram com a realidade; usa mock-up/ensaio; honestidade financeira (por que "só 6 da frente" pode desarmonizar cor)',
    exclusion: "Promete resultado irreal pra fechar; usa o casamento como gatilho de venda",
    template_bars: {
      id: "B1",
      nome: "Comunicação / Expectativa",
      inclusion_5:
        "alinha expectativa à realidade; usa recurso de apoio (mock-up/registro); honestidade financeira/de prazo",
      exclusion_5:
        "promessa de resultado irreal; uso de gatilho emocional (casamento/formatura) como pressão de venda",
    },
  },
  etica_minimamente_invasivo: {
    rotulo: "Ética / minimamente invasivo",
    ancoras: null,
    dimensao_clinica: "D1/D9",
    inclusion: "Autonomia ≠ obrigação de executar; recusa desgaste desnecessário; documenta",
    exclusion: 'Aceita destruir estrutura hígida "porque é o dinheiro dela"',
    template_bars: null,
  },
  consentimento_continuidade: {
    rotulo: "Consentimento / continuidade",
    ancoras: null,
    dimensao_clinica: "D3/D5",
    inclusion:
      "TCLE sobre irreversibilidade; manutenção das lentes + contenção pro bruxismo; follow-up; planejamento digital",
    exclusion: "Sem consentimento informado sobre irreversibilidade",
    template_bars: null,
  },
};

/**
 * Red flags do caso, transcritas de `banco-sjt-dentista.md:91`. Não são dimensão:
 * vão no campo `red_flags` do schema e disparam revisão humana (nunca rejeição).
 */
export const RED_FLAGS_SJT_CASO_ABERTO: readonly string[] = [
  "promessa irreal",
  "sequência clínica ignorada",
  "desgaste sem indicação",
];

/** Entrada mínima que a rubrica da vaga oferece: a chave e o peso. */
export interface DimensaoRubricaVaga {
  dimension: string;
  peso: number;
}

/**
 * Monta o bloco de rubrica que vai ao modelo como `vagaRubricBlock`.
 *
 * ⚠ AUTOEXPLICATIVO POR OBRIGAÇÃO: `callAi` entrega este texto LITERAL como 2º bloco
 * de system (Anthropic, com `cache_control: ephemeral`, `ai-client.ts:827`) ou
 * concatenado com `\n\n` ao `system_template` (fallback OpenAI, `:1043`) — sem
 * acrescentar cabeçalho, rótulo nem ordenação. Todo cabeçalho que dá sentido a este
 * texto mora AQUI dentro.
 *
 * Função PURA: não muta a entrada, não lê ambiente, não lança para entrada
 * malformada (uma rubrica torta no banco não pode derrubar a avaliação).
 *
 * O bloco entra no `requestFingerprint` de `callAi` (`ai-client.ts:486`, que inclui
 * `vagaRubricBlock` no canônico), então a chave efetiva de idempotência muda com a
 * rubrica: nenhuma avaliação feita SEM rubrica é replayada como se tivesse sido feita
 * com ela.
 *
 * @param dimensoes as dimensões da rubrica DA VAGA (`perguntas.rubric.dimensoes`)
 * @param catalogo catálogo de rótulos/critérios; default `DIMENSOES_SJT`. O parâmetro
 *   existe para o teste exercitar o caminho de renderização de `ancoras` sem que
 *   nenhuma âncora inventada entre na constante de produção.
 */
export function montarBlocoRubricaSjt(
  dimensoes: readonly DimensaoRubricaVaga[] | null | undefined,
  catalogo: Record<string, DimensaoSjt> = DIMENSOES_SJT,
): string {
  const lista = Array.isArray(dimensoes) ? dimensoes : [];
  const validas = lista.filter(
    (d) => d && typeof d === "object" && typeof d.dimension === "string" && d.dimension.length > 0,
  );

  const partes: string[] = [];
  partes.push("# RUBRICA DA VAGA — as dimensões desta avaliação, com peso e critérios");
  partes.push("");

  if (validas.length === 0) {
    // Defesa em profundidade: a EF só chama isto com rubrica presente, mas uma
    // rubrica torta no banco não pode virar um bloco que MENTE dizendo que há
    // dimensões. Dizer «não há» é a única saída honesta.
    partes.push(
      "A vaga NÃO declarou dimensões de rubrica para este caso. Pontue apenas as dimensões que o próprio enunciado do cenário exige e NÃO invente nomes de dimensão.",
    );
    return partes.join("\n");
  }

  partes.push(
    `Avalie a resposta SOMENTE nas ${validas.length} dimensões listadas abaixo, uma entrada de \`dimension_scores\` para cada.`,
  );
  partes.push("");
  partes.push("## REGRA DE NOMEAÇÃO (obrigatória)");
  partes.push(
    "No campo `dimension` de cada item, devolva a CHAVE exata da dimensão, copiada literalmente como aparece abaixo (ex.: `" +
      validas[0].dimension +
      "`).",
  );
  partes.push(
    "NÃO devolva o rótulo em português, NÃO invente um nome novo e NÃO use um trecho do enunciado: os itens numerados que o cenário pede descrever NÃO são as dimensões desta rubrica.",
  );
  partes.push(
    "Uma `dimension` fora desta lista é DESCARTADA da nota e manda a avaliação inteira para revisão humana.",
  );
  partes.push("");
  partes.push("## COMO CONVERTER OS CRITÉRIOS EM SCORE (escala 1–5)");
  for (const nivel of [5, 4, 3, 2, 1] as const) {
    partes.push(`- Score ${nivel} = ${REGRA_NIVEIS_SJT[nivel]}`);
  }
  partes.push(`- \`insufficient_evidence\` = ${REGRA_INSUFFICIENT_SJT}`);
  partes.push("");

  let i = 0;
  for (const d of validas) {
    i += 1;
    const peso = Number.isFinite(Number(d.peso)) ? Number(d.peso) : 0;
    const def = Object.prototype.hasOwnProperty.call(catalogo, d.dimension)
      ? catalogo[d.dimension]
      : undefined;

    partes.push(
      `## Dimensão ${i} de ${validas.length} — chave \`${d.dimension}\` (peso ${peso})`,
    );
    if (!def) {
      // Chave que a vaga declarou e o catálogo não conhece. NUNCA inventar critérios
      // para ela — o bloco diz que não há, e é isso.
      partes.push(
        "⚠ Esta dimensão vem da rubrica da vaga e NÃO tem rótulo, critérios nem âncoras oficiais catalogados.",
      );
      partes.push(
        "Avalie-a pelo sentido da própria chave e pela regra de conversão acima. NÃO invente critérios de inclusion/exclusion para ela.",
      );
      partes.push("");
      continue;
    }

    partes.push(`Rótulo (é assim que o RH lê esta dimensão): ${def.rotulo}`);
    partes.push(`Dimensão clínica de referência: ${def.dimensao_clinica}`);
    partes.push(`Inclusion (deve estar presente): ${def.inclusion}`);
    partes.push(`Exclusion / red flag (não pode estar presente): ${def.exclusion}`);
    if (def.template_bars) {
      partes.push(
        `Template BARS ${def.template_bars.id} («${def.template_bars.nome}») — nível 5 inclusion: ${def.template_bars.inclusion_5}`,
      );
      partes.push(
        `Template BARS ${def.template_bars.id} — nível 5 exclusion: ${def.template_bars.exclusion_5}`,
      );
    }
    if (def.ancoras) {
      partes.push("Âncoras comportamentais (5 → 1):");
      for (const nivel of [5, 4, 3, 2, 1] as const) {
        partes.push(`- ${nivel}: ${def.ancoras[nivel]}`);
      }
    } else {
      partes.push(
        "Âncoras 1–5: NÃO há âncoras por nível catalogadas para esta dimensão. Aplique a regra de conversão acima sobre o inclusion/exclusion desta dimensão — não invente âncoras.",
      );
    }
    partes.push("");
  }

  partes.push("## RED FLAGS DO CASO (campo `red_flags`, não são dimensão)");
  partes.push(
    `Marque red flag se a resposta apresentar: ${RED_FLAGS_SJT_CASO_ABERTO.join(" · ")}.`,
  );
  partes.push(
    "Red flag manda a avaliação para revisão HUMANA. A decisão final é sempre de uma pessoa — nenhuma nota rejeita candidato (RNF-07a).",
  );

  return partes.join("\n");
}

/** Conjunto das chaves que a rubrica da vaga declarou — o vocabulário válido. */
export function chavesDaRubrica(
  dimensoes: readonly DimensaoRubricaVaga[] | null | undefined,
): Set<string> {
  const out = new Set<string>();
  if (!Array.isArray(dimensoes)) return out;
  for (const d of dimensoes) {
    if (d && typeof d === "object" && typeof d.dimension === "string" && d.dimension.length > 0) {
      out.add(d.dimension);
    }
  }
  return out;
}
