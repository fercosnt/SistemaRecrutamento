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

  // ── Cargos de MARKETING (2026-10-14) ────────────────────────────────────────────
  //
  // As 13 chaves abaixo vêm dos três documentos de vaga do squad de Marketing, §15
  // («Critérios das dimensões do caso aberto»), revisados pelo operador em 12-13/10 e
  // aplicados pelas migrations 20261013000101..104 e 20261014000001. Elas estavam
  // AUSENTES deste catálogo, e a consequência foi medida em 12/10: o bloco enviado ao
  // modelo dizia honestamente «esta dimensão não tem critérios catalogados; avalie pelo
  // sentido da própria chave» — e cada dimensão virava o que o modelo achasse que o nome
  // dela significa, produzindo nota 0-25 com banda em 13 e 18 sem régua por trás.
  //
  // ⚠ `ancoras: null` nas treze, pela MESMA razão das cinco do dentista: a REGRA_NIVEIS_SJT
  // já converte inclusion/exclusion em 1-5. Escrever âncoras aqui seria invenção. Por isso
  // os `inclusion` são numerados — «metade dos inclusion» só significa algo se forem
  // contáveis — e cada `exclusion` diz se é CRÍTICO ou menor, que é o que a regra usa.
  //
  // ⚠ `dimensao_clinica` NÃO SE APLICA. O campo existe para o catálogo clínico do cargo
  // `dentista`; estes são cargos de marketing e audiovisual. Preencher com algo parecido
  // seria exatamente a falsa atribuição que este arquivo existe para impedir.
  //
  // ⚠ O caso aberto destes três cargos É o teste prático: o candidato sobe o trabalho num
  // Drive dele e usa o campo para o link e o raciocínio. A IA NÃO ABRE O LINK. Todos os
  // critérios abaixo são sobre o TEXTO. Quando o texto não aborda a dimensão, a saída é
  // `insufficient_evidence` — nunca nota baixa por ausência (REGRA_INSUFFICIENT_SJT).
  // Exceção medida: em `social-media` a entrega é texto no próprio campo, e aí o modelo VÊ
  // a peça; mas ele NÃO viu o Instagram do Dr. Jr., então `leitura_da_voz` se julga pela
  // coerência entre o que ela descreveu e o que o roteiro faz.
  //
  // Fonte de cada campo: docs/vagas/<slug>.md §15, extraído por script (nunca transcrito).
  leitura_da_voz: {
    rotulo: "Leitura da voz",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Nomeia pelo menos duas marcas concretas do jeito do Dr. Jr. falar - como abre, que tipo de analogia usa, onde põe o termo técnico, o grau de informalidade. (2) Liga pelo menos uma dessas marcas a uma escolha que fez no roteiro. (3) As marcas são verificáveis no perfil, não atributos genéricos de comunicador. (4) Diz o que não imitou, ou onde se afastou de propósito.",
    exclusion: "CRÍTICO: só adjetivos (\"didático\", \"acessível\", \"carismático\") sem nenhuma marca concreta. Isso não prova que assistiu. CRÍTICO: atribui ao Dr. Jr. características do material-fonte, que foi gravado por outra pessoa. É o erro central que este teste existe para pegar. menor: descreve a voz a partir da bio ou da descrição do perfil, sem evidência de ter assistido a conteúdo.",
    template_bars: null,
  },  // `social-media`
  decisao_de_recorte: {
    rotulo: "Decisão de recorte",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Diz qual ângulo escolheu do material e por quê. (2) Nomeia pelo menos uma coisa que descartou, e a razão. (3) A razão é sobre o espectador - o que retém, o que confunde - e não sobre gosto. (4) Explica como resolveu o problema do mecanismo denso: os ~40 segundos de contexto que o assunto exige antes de fazer sentido.",
    exclusion: "CRÍTICO: não menciona nada descartado. Material denso obriga a escolher; quem não conta o que ficou de fora provavelmente resumiu em vez de escolher. CRÍTICO: justifica por \"achei mais interessante\" ou equivalente, sem critério. menor: trata o material como se coubesse inteiro em 60 segundos.",
    template_bars: null,
  },  // `social-media`
  criterio_do_desdobramento: {
    rotulo: "Critério do desdobramento",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Diz por que aquele formato e não os outros dois oferecidos. (2) A razão vem do conteúdo - o que o assunto pede - e não da facilidade de produzir. (3) O desdobramento acrescenta algo que o Reel não entrega, em vez de repetir em outro suporte.",
    exclusion: "CRÍTICO: o desdobramento é o roteiro recortado, sem peça própria. menor: justifica por preferência pessoal (\"gosto mais de carrossel\").",
    template_bars: null,
  },  // `social-media`
  conformidade_percebida: {
    rotulo: "Conformidade percebida sem aviso",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Identifica pelo menos um dos percentuais sem referência no material (70% menos dor, 40% menos edema, 45% contra 18% de cicatrização). (2) Diz o que faria: pedir a fonte, omitir o número, ou reescrever em linguagem de possibilidade. (3) A decisão preserva o impacto da peça em vez de apenas esvaziá-la.",
    exclusion: "CRÍTICO: propõe usar um dos percentuais como hook, sem ressalva. menor: fala de \"conformidade\" em geral sem apontar nenhum trecho.",
    template_bars: null,
  },  // `social-media`
  clareza_do_processo: {
    rotulo: "Clareza do processo",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) O texto diz o que foi feito, em que ordem, e não apenas o que resultou. (2) Dá para outra pessoa repetir o caminho a partir do que está escrito. (3) Separa o que foi decisão própria do que foi restrição do material.",
    exclusion: "CRÍTICO: o texto descreve o resultado em vez do caminho (\"fiz um Reel sobre fotobiomodulação\", \"montei a sequência do dia 08\"). CRÍTICO: o texto é curto demais para sustentar qualquer juízo (abaixo de ~60 palavras) e não há o que avaliar além da entrega em si. menor: descreve o caminho mas nunca distingue decisão de restrição: tudo aparece como escolha, inclusive o que o material impôs.",
    template_bars: null,
  },  // `social-media`, `videomaker-storymaker`, `editor-video`
  criterio_de_selecao: {
    rotulo: "Critério de seleção",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Diz por que aquele dia entre as seis pastas. (2) Diz por que aqueles stories dentro do dia escolhido. (3) Nomeia o que descartou e a razão. (4) O critério é do espectador - o que prende, o que repete - e não da conveniência de edição.",
    exclusion: "CRÍTICO: escolheu o dia e não diz por quê. A escolha do dia é a primeira decisão editorial do cargo. CRÍTICO: \"escolhi o que tinha mais material\", sem critério editorial. menor: descreve o dia sem dizer o que selecionou dentro dele.",
    template_bars: null,
  },  // `videomaker-storymaker`
  arco_do_dia: {
    rotulo: "Arco do dia",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Descreve uma lógica de ordem: o que abre, o que sustenta, o que fecha. (2) A ordem tem razão declarada - não é a cronologia do material por falta de decisão. (3) Diz onde está o ponto alto do dia e por que ele cai ali.",
    exclusion: "CRÍTICO: a sequência é a ordem em que o material foi gravado, sem nenhuma decisão de montagem. menor: usa a palavra \"narrativa\" sem descrever a ordem que montou.",
    template_bars: null,
  },  // `videomaker-storymaker`
  uso_da_reserva: {
    rotulo: "Uso do banco de reserva",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Diz se foi à pasta RESERVAS - e, se não foi, por que não precisou. (2) Se usou: o tema escolhido conversa com o que o dia já tinha, em vez de ser enchimento. (3) Trata a reserva como recurso editorial, não como tapa-buraco.",
    exclusion: "CRÍTICO: escolheu um dia fraco, entregou pouco, e não menciona a reserva. A solução estava nomeada, em caixa alta, na mesma lista de pastas. menor: usou a reserva sem ligar o tema ao dia.",
    template_bars: null,
  },  // `videomaker-storymaker`
  o_que_ficou_de_fora: {
    rotulo: "O que ficou de fora",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Nomeia pelo menos uma coisa que escolheu não publicar. (2) Dá a razão, e ela é editorial ou de respeito a quem aparece - não uma regra recitada. (3) A decisão é dele, aplicada àquele material, não um princípio genérico.",
    exclusion: "CRÍTICO: não menciona nada deixado de fora. É a competência que não aparece em portfólio: ela se manifesta no que não existe na entrega. menor: recita a norma (\"não publico paciente sem termo\") sem aplicá-la a nada do material que recebeu.",
    template_bars: null,
  },  // `videomaker-storymaker`
  decisao_de_corte: {
    rotulo: "Decisão de corte",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Diz onde começou o Reel e por quê. (2) Nomeia o que cortou do material denso. (3) Liga a escolha à retenção, não à fidelidade ao bruto. (4) Explica o que fez com o preâmbulo - o trecho de contexto que antecede o ponto.",
    exclusion: "CRÍTICO: manteve a ordem do bruto e não diz por quê. CRÍTICO: justifica por \"ficou melhor assim\", sem critério. menor: fala de ritmo sem dizer onde cortou.",
    template_bars: null,
  },  // `editor-video`
  logica_das_variacoes: {
    rotulo: "Lógica das variações de hook",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Diz o que cada uma das três testa. (2) As três testam coisas diferentes - ângulos distintos, não a mesma frase reescrita. (3) Diz como saberia qual venceu: que número olharia.",
    exclusion: "CRÍTICO: as três mudam só a frase, com a mesma imagem e o mesmo argumento. É exatamente o que o descritivo do cargo proíbe: \"versões diferentes entre si, não só troca de texto\". menor: nomeia as três sem dizer o que cada uma testa.",
    template_bars: null,
  },  // `editor-video`
  uso_do_material: {
    rotulo: "Uso do material de apoio",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Diz o que fez com os inserts - quais escolheu e por quê. (2) Há critério de quando cortar para apoio e quando ficar na fala. (3) Reconhece o risco dos dois extremos: só talking head cortado ignora metade do material; troca de plano a cada frase vira videoclipe.",
    exclusion: "CRÍTICO: não menciona os inserts. São cerca de 50 clipes na pasta; ignorá-los em silêncio é decisão não tomada. menor: usou inserts sem critério declarado.",
    template_bars: null,
  },  // `editor-video`
  conformidade_sinalizada: {
    rotulo: "Conformidade sinalizada",
    ancoras: null,
    dimensao_clinica: "(não se aplica — cargo de marketing, fora do catálogo clínico)",
    inclusion: "(1) Identifica as afirmações problemáticas do pacote que escolheu - proporcional, não absoluto. (2) Diz o que faria, e a proposta preserva o impacto em vez de só esvaziar. (3) Sinaliza em vez de decidir: a mensagem é da social media.",
    exclusion: "CRÍTICO: reescreveu a mensagem por conta própria e entregou sem avisar. É a invasão de alçada do MC2, medida duas vezes por caminhos diferentes. CRÍTICO: não identificou nenhuma afirmação, tendo sido avisado no briefing que elas existem. menor: identificou e não propôs nada.",
    template_bars: null,
  },  // `editor-video`
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
