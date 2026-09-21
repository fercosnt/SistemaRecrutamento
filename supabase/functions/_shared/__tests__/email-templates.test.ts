/**
 * Phase 38 / Plan 38-02 Task 2 — os 4 templates + grep-guard da rejeição (COMM-02/03/05/06).
 *
 * O grep-guard (D-15/RNF-07a) é o proof do COMM-06: falha alto se qualquer token de
 * scoring/critério aparecer no e-mail de decisão. Prova também o escape de HTML e a
 * ausência de react-email na fonte.
 *
 * Run: deno test supabase/functions/_shared/__tests__/email-templates.test.ts --allow-env --allow-read
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  COPY_APROVACAO,
  COPY_REJEICAO,
  layoutBase,
  renderarEmail,
  SUBJECTS,
} from "../email-templates.ts";
import type { EventoNotificacao } from "../email-config.ts";

const EVENTOS: EventoNotificacao[] = [
  "candidatura_recebida",
  "avaliacao_liberada",
  "convite_entrevista",
  "decisao_final",
];

const DADOS = {
  nomeCandidato: "Ana <b>Silva</b>",
  tituloVaga: "Dentista Clínico Geral",
  dataHoraFmt: "sábado, 1 de agosto de 2026 às 14:30",
  localOuLink: "Rua Exemplo, 100 — São Paulo",
  tipoEntrevista: "Presencial",
};

/**
 * Extrai o PREHEADER do html — o `<span display:none>` que `layoutBase` injeta como
 * primeiro filho do `<body>`.
 *
 * Promovido ao topo do arquivo pela Phase 42 / Plan 42-01 Task 3. Os testes W-01 de
 * `:109-137` (P39) conferiam o preheader com `html.includes(...)`, que prova PRESENÇA mas
 * não IGUALDADE: um preheader errado que por acaso contenha a substring esperada passaria,
 * e um preheader vazio não é distinguível de um ausente. O bloco T-42-V1 no fim do arquivo
 * precisa comparar a string COMPLETA, então a extração virou explícita. Os testes antigos
 * seguem intocados de propósito — eles cobrem outra coisa (a ausência do texto do outro
 * desfecho) e continuam valendo.
 */
function extrairPreheader(html: string): string {
  const m = html.match(/<span style="display:none[^"]*">([\s\S]*?)<\/span>/);
  return m ? m[1].trim() : "";
}

Deno.test("COMM-02/03/04/05 — os 4 eventos renderizam subject + html não-vazios", () => {
  for (const evento of EVENTOS) {
    const { subject, html } = renderarEmail(evento, DADOS);
    assert(subject.length > 0, `${evento}: subject vazio`);
    assert(html.length > 0, `${evento}: html vazio`);
    assert(html.includes("Dentista Clínico Geral"), `${evento}: falta a vaga`);
  }
});

Deno.test("COMM-06 — valores do candidato são HTML-escapados (Ana <b> → &lt;b&gt;)", () => {
  const { html } = renderarEmail("candidatura_recebida", DADOS);
  assert(html.includes("Ana &lt;b&gt;Silva&lt;/b&gt;"), "o nome deveria estar escapado");
  assert(!html.includes("Ana <b>Silva</b>"), "não deveria haver <b> cru do nome");
});

Deno.test("COMM-04 — convite menciona data/hora, local e o anexo .ics", () => {
  const { html } = renderarEmail("convite_entrevista", DADOS);
  assert(html.includes("14:30"), "falta a data/hora formatada");
  assert(html.includes("Exemplo"), "falta o local");
  assert(/\.ics/i.test(html), "deveria mencionar o anexo .ics");
});

Deno.test("COMM-05/06 — GREP-GUARD: e-mail de decisão NÃO contém token de scoring", () => {
  const { html } = renderarEmail("decisao_final", DADOS);
  const proibido = /score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio/i;
  assert(
    !proibido.test(html),
    "VAZOU token de scoring na cópia de rejeição (D-15/RNF-07a)",
  );
});

Deno.test("COMM-05 — decisão usa a cópia neutra congelada literal", () => {
  const { html } = renderarEmail("decisao_final", DADOS);
  assert(html.includes(COPY_REJEICAO), "deveria conter a COPY_REJEICAO congelada");
});

// ── Gap-closure P39 / CR-01 — o desfecho da decisão ─────────────────────────
// O evento `decisao` do trigger da P39 cobre aprovado E rejeitado com corpo ids-only.
// Antes do fix, `corpoDecisao` usava exclusivamente COPY_REJEICAO ⇒ todo APROVADO recebia
// a rejeição. Estes testes são o guard de regressão dessa troca de desfecho.

Deno.test("CR-01 — desfecho 'aprovado' renderiza a APROVAÇÃO e NUNCA a rejeição", () => {
  const { html, subject } = renderarEmail("decisao_final", {
    ...DADOS,
    desfecho: "aprovado",
  });
  assert(html.includes(COPY_APROVACAO), "deveria conter a COPY_APROVACAO");
  assert(
    !html.includes(COPY_REJEICAO),
    "REGRESSÃO CR-01: aprovado recebeu a cópia de REJEIÇÃO",
  );
  assert(/boa not[íi]cia/i.test(subject), `subject não sinaliza aprovação: ${subject}`);
});

Deno.test("CR-01 — desfecho 'rejeitado' mantém a cópia congelada de rejeição", () => {
  const { html } = renderarEmail("decisao_final", {
    ...DADOS,
    desfecho: "rejeitado",
  });
  assert(html.includes(COPY_REJEICAO), "deveria conter a COPY_REJEICAO congelada");
  assert(!html.includes(COPY_APROVACAO), "não deveria conter a cópia de aprovação");
});

Deno.test("CR-01 — desfecho AUSENTE é fail-safe para rejeição (default histórico)", () => {
  const { html } = renderarEmail("decisao_final", DADOS);
  assert(html.includes(COPY_REJEICAO), "sem desfecho deveria cair na rejeição");
  assert(!html.includes(COPY_APROVACAO), "sem desfecho não pode render aprovação");
});

// ── Gap-closure P39 / W-01 — o PREHEADER também ramifica ────────────────────
// Achado no UAT ao vivo (2026-07-28): o fix f3b7304 ramificou corpo e assunto, mas o
// preheader continuou literal ("Atualização sobre a sua candidatura."), então na caixa
// de entrada o aprovado via assunto "Boa notícia…" ao lado de uma prévia morna.
// O preheader é texto oculto (<span display:none>) — só o cliente de e-mail o exibe na
// listagem —, por isso os testes acima, que olham o corpo visível, não o pegavam.

Deno.test("W-01 — preheader do desfecho 'aprovado' sinaliza boa notícia", () => {
  const { html } = renderarEmail("decisao_final", { ...DADOS, desfecho: "aprovado" });
  assert(
    html.includes("Boa notícia sobre a sua candidatura."),
    "REGRESSÃO W-01: preheader do aprovado não sinaliza boa notícia",
  );
  assert(
    !html.includes("Atualização sobre a sua candidatura."),
    "REGRESSÃO W-01: aprovado ainda carrega o preheader neutro de decisão",
  );
});

Deno.test("W-01 — preheader do desfecho 'rejeitado' permanece neutro", () => {
  const { html } = renderarEmail("decisao_final", { ...DADOS, desfecho: "rejeitado" });
  assert(
    html.includes("Atualização sobre a sua candidatura."),
    "preheader da rejeição deveria seguir neutro",
  );
  assert(
    !html.includes("Boa notícia"),
    "rejeição NUNCA pode anunciar boa notícia no preheader",
  );
});

Deno.test("W-01 — preheader sem desfecho é fail-safe (neutro, nunca boa notícia)", () => {
  const { html } = renderarEmail("decisao_final", DADOS);
  assert(html.includes("Atualização sobre a sua candidatura."), "sem desfecho ⇒ neutro");
  assert(!html.includes("Boa notícia"), "sem desfecho NUNCA pode anunciar aprovação");
});

Deno.test("D-15/RNF-07a — GREP-GUARD cobre os DOIS desfechos da decisão", () => {
  const proibido = /score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio/i;
  for (const desfecho of ["aprovado", "rejeitado"] as const) {
    const { html } = renderarEmail("decisao_final", { ...DADOS, desfecho });
    assert(
      !proibido.test(html),
      `VAZOU token de scoring no desfecho '${desfecho}' (D-15/RNF-07a)`,
    );
  }
});

// ── T-42-V1 — NÃO-REGRESSÃO W-01: subject E preheader pinados por literal ───
//
// Phase 42 / Plan 42-01 Task 3 (D-P42-14).
//
// O defeito W-01 (achado no UAT ao vivo em 2026-07-28) foi um preheader que ficou LITERAL
// quando `subject` e `corpo` passaram a ramificar por desfecho: na caixa de entrada, o
// candidato aprovado via o assunto "Boa notícia…" ao lado da prévia "Atualização sobre a sua
// candidatura.". A metade errada era invisível a TODA asserção que olha só o texto visível —
// o preheader é `<span display:none>`, existe apenas para o cliente de e-mail renderizar na
// listagem. Foi por isso que escapou dos testes de corpo E do UAT de leitura do e-mail aberto.
//
// Os testes W-01 de `:109-137` provam que cada desfecho NÃO carrega a prévia do outro. Este
// bloco é mais forte e complementar: pina o par (subject, preheader) de cada evento vivo
// contra a string COMPLETA de hoje, lida do código-fonte. Qualquer mudança de copy passa a
// exigir uma edição consciente deste arquivo, em vez de escorregar silenciosamente.
//
// É a rede que impede a Phase 42 de repetir a classe de defeito ao adicionar o 5º evento no
// plano 42-08. O 5º evento NÃO entra aqui — este bloco cobre exclusivamente os 4 vivos.
//
// DESVIO REGISTRADO (42-01 Task 3): o PLAN pede os 3 desfechos de `decisao_final` como
// (aprovado, rejeitado, em_espera). `em_espera` NÃO existe: `DadosEmail.desfecho` é
// `"aprovado" | "rejeitado"` opcional (email-templates.ts:76) e a EF o deriva por ternário
// de `etapa_atual` (notificar-candidato/index.ts:336), então nunca produz um terceiro valor.
// Passar "em_espera" seria erro de compilação. O terceiro desfecho REAL é o AUSENTE — o
// fail-safe documentado em `:74` e `:149`, e o mesmo que o teste W-01 de `:133` já cobre.
// São esses 3 que estão pinados abaixo.

Deno.test("T-42-V1 — par (subject, preheader) de candidatura_recebida", () => {
  const { subject, html } = renderarEmail("candidatura_recebida", DADOS);
  assertEquals(subject, "Recebemos sua candidatura — Dentista Clínico Geral");
  assertEquals(extrairPreheader(html), "Recebemos a sua candidatura na Beauty Smile.");
});

Deno.test("T-42-V1 — par (subject, preheader) de avaliacao_liberada", () => {
  const { subject, html } = renderarEmail("avaliacao_liberada", DADOS);
  assertEquals(subject, "Sua candidatura avançou — Dentista Clínico Geral");
  assertEquals(extrairPreheader(html), "Sua candidatura avançou — nova etapa liberada.");
});

Deno.test("T-42-V1 — par (subject, preheader) de convite_entrevista", () => {
  const { subject, html } = renderarEmail("convite_entrevista", DADOS);
  assertEquals(subject, "Convite de entrevista — Dentista Clínico Geral");
  assertEquals(extrairPreheader(html), "Você foi convidado(a) para uma entrevista.");
});

Deno.test("2026-09-06 — convite_entrevista REAGENDADO: assunto, prévia e abertura mudam; anexo .ics continua", () => {
  const { subject, html } = renderarEmail("convite_entrevista", { ...DADOS, reagendada: true });
  assertEquals(subject, "Entrevista reagendada — Dentista Clínico Geral");
  assertEquals(extrairPreheader(html), "Sua entrevista foi reagendada — confira a nova data.");
  assert(html.includes("foi <strong>reagendada</strong>"), "abertura deve dizer que foi reagendada");
  assert(!html.includes("Você está convidado(a)"), "não pode parecer um convite novo");
  assert(html.includes(".ics"), "o .ics atualiza o evento no calendário (mesmo UID)");
});

Deno.test("T-42-V1 — par (subject, preheader) de decisao_final · desfecho aprovado", () => {
  const { subject, html } = renderarEmail("decisao_final", { ...DADOS, desfecho: "aprovado" });
  assertEquals(subject, "Boa notícia sobre sua candidatura — Dentista Clínico Geral");
  assertEquals(extrairPreheader(html), "Boa notícia sobre a sua candidatura.");
});

Deno.test("T-42-V1 — par (subject, preheader) de decisao_final · desfecho rejeitado", () => {
  const { subject, html } = renderarEmail("decisao_final", { ...DADOS, desfecho: "rejeitado" });
  assertEquals(subject, "Atualização sobre sua candidatura — Dentista Clínico Geral");
  assertEquals(extrairPreheader(html), "Atualização sobre a sua candidatura.");
});

Deno.test("T-42-V1 — par (subject, preheader) de decisao_final · desfecho AUSENTE (fail-safe)", () => {
  // Sem `desfecho`, o par tem de ser IDÊNTICO ao da rejeição — o default histórico.
  // Se um dia o fail-safe virar aprovação por acidente, um candidato rejeitado recebe
  // "Boa notícia" na caixa de entrada. Esta é a asserção que impede isso.
  const { subject, html } = renderarEmail("decisao_final", DADOS);
  assertEquals(subject, "Atualização sobre sua candidatura — Dentista Clínico Geral");
  assertEquals(extrairPreheader(html), "Atualização sobre a sua candidatura.");
});

// ── T-42-V2 — O 5º EVENTO: `revisao_respondida` (Plan 42-08 · REVISAO-04) ───
//
// Phase 42 / Plan 42-08 Task 1 (D-P42-14).
//
// O e-mail que avisa o candidato de que sua solicitação de revisão do Art. 20 foi
// RESPONDIDA. É o 5º evento do pipeline de comunicação e a edição de maior risco da fase:
// os defeitos CR-01, CR-02 e W-01 nasceram todos de um sítio do vocabulário que ficou para
// trás quando o vizinho mudou.
//
// A DECISÃO REGISTRADA E PINADA AQUI (questão aberta nº3 da pesquisa da fase):
// a PRÉVIA DE CAIXA DE ENTRADA **não ramifica** por veredito. O assunto já diz que se trata
// da resposta à solicitação; ramificar a prévia por `mantida`/`revertida` anteciparia o
// desfecho NA LISTA DE E-MAILS, antes de a pessoa abrir a mensagem. A lição do W-01 é que
// **não decidir** é o defeito — não que ramificar seja sempre certo. O teste T-42-V2c exige
// IGUALDADE LITERAL da prévia entre os dois vereditos: um futuro que queira ramificar terá de
// alterar este teste de propósito, e isso aparece no diff.
//
// DADOS mínimos de propósito: `DadosEmail.vereditoRevisao` é OPCIONAL, e o corpo tem de ter um
// caminho honesto para a ausência (T-42-V2d) — foi exatamente um corpo que assumia a presença
// de um campo que produziu o CR-01.

const DADOS_REV = {
  nomeCandidato: "Ana <b>Silva</b>",
  tituloVaga: "Dentista Clínico Geral",
};

Deno.test("T-42-V2a — revisao_respondida ('mantida') rende subject com a vaga + corpo não-vazio", () => {
  const { subject, html } = renderarEmail("revisao_respondida", {
    ...DADOS_REV,
    vereditoRevisao: "mantida",
  });
  assert(subject.length > 0, "subject vazio");
  assert(subject.includes("Dentista Clínico Geral"), `subject sem a vaga: ${subject}`);
  assert(html.length > 0, "html vazio");
  assert(extrairPreheader(html).length > 0, "prévia VAZIA (classe de defeito W-01)");
});

Deno.test("T-42-V2b — o SUBJECT não ramifica por veredito; o CORPO ramifica", () => {
  const mantida = renderarEmail("revisao_respondida", {
    ...DADOS_REV,
    vereditoRevisao: "mantida",
  });
  const revertida = renderarEmail("revisao_respondida", {
    ...DADOS_REV,
    vereditoRevisao: "revertida",
  });

  assertEquals(
    mantida.subject,
    revertida.subject,
    "o ASSUNTO antecipa o desfecho da revisão na caixa de entrada — decisão de produto " +
      "que esta fase não toma (ver o comentário do PREHEADERS)",
  );
  assert(
    mantida.html !== revertida.html,
    "o CORPO é idêntico nos dois vereditos — o e-mail não diz o que aconteceu, " +
      "que é a classe de defeito do CR-01 (corpo genérico para desfechos distintos)",
  );
});

Deno.test("T-42-V2c — a PRÉVIA é literalmente IDÊNTICA para 'mantida' e 'revertida'", () => {
  // Igualdade LITERAL, não `includes`: `includes` prova presença, não igualdade — e foi
  // essa exata fraqueza que deixou o W-01 passar pelos testes de :109-137.
  const pMantida = extrairPreheader(
    renderarEmail("revisao_respondida", { ...DADOS_REV, vereditoRevisao: "mantida" }).html,
  );
  const pRevertida = extrairPreheader(
    renderarEmail("revisao_respondida", { ...DADOS_REV, vereditoRevisao: "revertida" }).html,
  );

  assert(pMantida.length > 0, "prévia vazia — a caixa de entrada mostraria uma linha em branco");
  assertEquals(
    pMantida,
    pRevertida,
    "a PRÉVIA passou a ramificar por veredito: o desfecho da revisão vaza na LISTA de " +
      "e-mails, antes de a pessoa abrir a mensagem. Se isso for intencional, é decisão de " +
      "produto e este teste tem de ser alterado DE PROPÓSITO.",
  );
});

Deno.test("T-42-V2d — vereditoRevisao AUSENTE não lança e ainda rende assunto, prévia e corpo", () => {
  // `vereditoRevisao` é opcional em DadosEmail. Um corpo que assumisse a presença dele
  // quebraria em runtime dentro de um dispatch at-most-once — o e-mail sumiria sem rastro.
  const { subject, html } = renderarEmail("revisao_respondida", DADOS_REV);
  assert(subject.length > 0, "subject vazio sem o veredito");
  assert(extrairPreheader(html).length > 0, "prévia vazia sem o veredito");
  assert(html.length > 0, "html vazio sem o veredito");
  // O caminho neutro não pode AFIRMAR um desfecho que não conhece.
  assert(
    !/decis[ãa]o foi mantida|anterior foi revista|reaberta e ser[áa] decidida/i.test(html),
    "o caminho SEM veredito afirmou um desfecho — fail-safe tem de ser neutro",
  );
});

Deno.test("T-42-V2e — GREP-GUARD (D-15/RNF-07a) + proibição de prazo estatutário no 5º evento", () => {
  // A lista literal de termos vetados vive NESTE arquivo, nunca em outro artefato: um
  // grep-guard cuja lista mora no código que ele guarda não guarda nada.
  const proibido = /score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio/i;
  // Invariante nº2 da UI-SPEC da fase: o Art. 20 NÃO fixa prazo. A copy nunca o inventa.
  const prazoVetado = /prazo legal|prazo da lei|prazo lgpd/i;

  for (const veredito of ["mantida", "revertida", undefined] as const) {
    const { html, subject } = renderarEmail("revisao_respondida", {
      ...DADOS_REV,
      vereditoRevisao: veredito,
    });
    assert(
      !proibido.test(html),
      `VAZOU token de avaliação no 5º evento (veredito=${veredito}) — D-15/RNF-07a`,
    );
    assert(
      !prazoVetado.test(html) && !prazoVetado.test(subject),
      `o 5º evento promete PRAZO ESTATUTÁRIO (veredito=${veredito}) — o Art. 20 não fixa prazo`,
    );
  }
});

Deno.test("T-42-V2f — tituloVaga com <script> sai ESCAPADO no HTML do 5º evento", () => {
  const { html } = renderarEmail("revisao_respondida", {
    nomeCandidato: "Ana Silva",
    tituloVaga: "<script>alert(1)</script>",
    vereditoRevisao: "revertida",
  });
  assert(!html.includes("<script>"), "tag <script> CRUA no corpo do 5º evento");
  assert(html.includes("&lt;script&gt;"), "o título da vaga deveria estar escapado");
});

// ── T-48-10 — O EVENTO DA LIBERAÇÃO COGNITIVA: `avaliacao_cognitiva_liberada` (D-22) ───
//
// Phase 48 / Plan 48-10 (JORN-15). Liberar a avaliação cognitiva passa a avisar o candidato:
// é uma ação pedida a ele, e a promessa nova do e-mail de confirmação (D-09 — «avisaremos
// quando houver algo para você fazer») só é verdade se esta liberação avisar.
//
// Linguagem de produto (CLAUDE.md): «avaliação cognitiva», NUNCA «teste psicológico». E o
// e-mail NÃO carrega instrumento, nota, critério nem motivo — é um aviso de que há algo a
// fazer no painel, não uma comunicação sobre a avaliação. O grep-guard abaixo mora NESTE
// arquivo, pelo mesmo motivo do T-42-V2e: a lista vetada não pode viver no código que ela guarda.

const DADOS_COG = {
  nomeCandidato: "Ana <b>Silva</b>",
  tituloVaga: "Dentista Clínico Geral",
};

/** Qualquer endereço do domínio raiz — D-07 (nenhuma ocorrência literal nova do canal). */
const RE_ENDERECO_DOMINIO = /[a-z0-9._%+-]*\s*@\s*beautysmile\.com\.br/i;

Deno.test("T-48-10a — avaliacao_cognitiva_liberada: assunto nomeia a avaliação cognitiva; corpo tem a vaga e o painel", () => {
  const { subject, html } = renderarEmail("avaliacao_cognitiva_liberada", DADOS_COG);
  assert(/avalia[çc][ãa]o cognitiva/i.test(subject), `assunto sem «avaliação cognitiva»: ${subject}`);
  assert(html.includes("Dentista Clínico Geral"), "o corpo tem de dizer de qual vaga se trata");
  assert(html.includes("Acesse o seu painel"), "o corpo tem de mandar a pessoa ao painel");
  assert(extrairPreheader(html).length > 0, "prévia VAZIA (classe de defeito W-01)");
});

Deno.test("T-48-10b — par (subject, preheader) de avaliacao_cognitiva_liberada pinado por literal", () => {
  const { subject, html } = renderarEmail("avaliacao_cognitiva_liberada", DADOS_COG);
  assertEquals(subject, "Uma avaliação cognitiva foi liberada para você");
  assertEquals(extrairPreheader(html), "Uma avaliação cognitiva está disponível no seu painel.");
});

Deno.test("T-48-10c — GREP-GUARD: sem nota, score, instrumento, critério, motivo nem «teste psicológico»", () => {
  const proibido = /score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio|teste psicol/i;
  const { subject, html } = renderarEmail("avaliacao_cognitiva_liberada", DADOS_COG);
  assert(!proibido.test(html), "VAZOU token de avaliação no e-mail da liberação cognitiva");
  assert(!proibido.test(subject), "VAZOU token de avaliação no ASSUNTO da liberação cognitiva");
  // O instrumento não é nomeado ao candidato (o nome do teste é dado interno do RH).
  assert(!/raven|matrizes/i.test(html + subject), "o e-mail nomeou o instrumento");
  // D-07: nenhum endereço do domínio raiz no corpo (o REPLY_TO já é o canal).
  assert(!RE_ENDERECO_DOMINIO.test(html), "o corpo citou um endereço @beautysmile.com.br (D-07)");
});

Deno.test("T-48-10d — valores do candidato e da vaga saem ESCAPADOS", () => {
  const { html } = renderarEmail("avaliacao_cognitiva_liberada", {
    nomeCandidato: "Ana <b>Silva</b>",
    tituloVaga: "<script>alert(1)</script>",
  });
  assert(!html.includes("<script>"), "tag <script> CRUA no corpo");
  assert(html.includes("&lt;script&gt;"), "o título da vaga deveria estar escapado");
  assert(html.includes("Ana &lt;b&gt;Silva&lt;/b&gt;"), "o nome deveria estar escapado");
});

Deno.test("COMM-06 — a fonte do módulo não IMPORTA react-email nem react", async () => {
  const src = await Deno.readTextFile(
    new URL("../email-templates.ts", import.meta.url),
  );
  // Só linhas de import contam (menção em comentário não é uso).
  const importaReact = src.split("\n").some((l) =>
    /^\s*import\b/.test(l) && /(@react-email|["']react["'])/.test(l)
  );
  assertEquals(importaReact, false);
});

// ── T-48-13 — A CÓPIA DA REABERTURA (JORN-19 · D-01 · D-10) ─────────────────────────────
//
// Desde o plano 48-11 o veredito `revertida` REABRE a candidatura (decisão final, aguardando
// nova decisão, prazo de 10 dias corridos). O e-mail diz isso com a DATA EXATA — a data-limite
// em São Paulo, formatada pela EF a partir de `decisao_final.prazo_nova_decisao_em`. Sem data
// legível, a frase sai SEM data: o sistema nunca diz ao candidato uma data que não gravou.
// A frase é a de D-01, pinada letra por letra aqui e na página do candidato (plano 48-14).

const FRASE_REABERTA = "Após a revisão, sua candidatura foi reaberta e será decidida novamente";

Deno.test("T-48-13a — revertida COM prazo: a frase de D-01 com a data exata", () => {
  const { html } = renderarEmail("revisao_respondida", {
    ...DADOS_REV,
    vereditoRevisao: "revertida",
    prazoNovaDecisaoFmt: "03/10/2026",
  });
  assert(
    html.includes(`${FRASE_REABERTA} até 03/10/2026.`),
    "o corpo da reabertura não diz a frase de D-01 com a data",
  );
});

Deno.test("T-48-13b — revertida SEM prazo: a frase de D-01 SEM data (nunca data inventada)", () => {
  const { html } = renderarEmail("revisao_respondida", {
    ...DADOS_REV,
    vereditoRevisao: "revertida",
  });
  assert(html.includes(`${FRASE_REABERTA}.`), "sem prazo, a frase de D-01 tem de sair sem data");
  assert(!/\bat[ée] \d/.test(html), "sem prazo, o corpo não pode trazer data nenhuma");
});

Deno.test("T-48-13c — prazo malformado é tratado como AUSENTE: frase sem data", () => {
  for (const ruim of ["amanhã", "2026-10-03", "3/10/2026", "<b>03/10/2026</b>", ""]) {
    const { html } = renderarEmail("revisao_respondida", {
      ...DADOS_REV,
      vereditoRevisao: "revertida",
      prazoNovaDecisaoFmt: ruim,
    });
    assert(html.includes(`${FRASE_REABERTA}.`), `prazo '${ruim}' deveria virar frase sem data`);
    assert(!/novamente até/.test(html), `prazo '${ruim}' virou data no e-mail`);
  }
});

Deno.test("T-48-13d — mantida ignora o prazo; nenhum corpo carrega a cópia antiga", () => {
  const mantida = renderarEmail("revisao_respondida", {
    ...DADOS_REV,
    vereditoRevisao: "mantida",
    prazoNovaDecisaoFmt: "03/10/2026",
  }).html;
  assert(mantida.includes("Após a revisão, a decisão foi mantida."), "a cópia de mantida mudou");
  assert(!mantida.includes("03/10/2026") && !/reaberta/.test(mantida), "mantida recebeu a data/reabertura");
  for (const veredito of ["mantida", "revertida", undefined] as const) {
    const { html } = renderarEmail("revisao_respondida", { ...DADOS_REV, vereditoRevisao: veredito });
    assert(!/anterior foi revista/.test(html), `a cópia antiga sobreviveu (${veredito})`);
  }
});

Deno.test("T-48-13e — assunto e prévia continuam SEM ramificar (T-42-V2c), com ou sem prazo", () => {
  const com = renderarEmail("revisao_respondida", {
    ...DADOS_REV,
    vereditoRevisao: "revertida",
    prazoNovaDecisaoFmt: "03/10/2026",
  });
  const mantida = renderarEmail("revisao_respondida", { ...DADOS_REV, vereditoRevisao: "mantida" });
  assertEquals(com.subject, mantida.subject);
  assertEquals(extrairPreheader(com.html), extrairPreheader(mantida.html));
  assert(!com.subject.includes("03/10/2026"), "a data vazou para o assunto");
});

// ── T-48-16 — JORN-U2 · D-09: todo e-mail ao CANDIDATO leva ao login dele ────────────────
//
// A promessa nova do e-mail de confirmação («acompanhe pelo seu painel») aponta para um lugar
// que o candidato precisa alcançar com um clique — a condição do operador em D-09. O link vai
// por PARÂMETRO (`DadosEmail.urlLogin`) nos corpos de candidato, NUNCA no rodapé de
// `layoutBase`: o mesmo layout monta os e-mails do RH e o recibo pós-exclusão, que sai depois
// de a conta deixar de existir.
//
// A lista de eventos é a do PRÓPRIO código (`Object.keys(SUBJECTS)`, o Record fechado por
// `EventoNotificacao`), não uma lista literal: um 7º evento entra na vigilância sem edição.

const URL_LOGIN = "https://rh.beautysmile.com.br/auth/login";

/** Todas as ramificações de corpo que existem hoje (desfecho, veredito, reagendamento). */
const VARIANTES_U2: Array<Record<string, unknown>> = [
  {},
  { desfecho: "aprovado" },
  { desfecho: "rejeitado" },
  { vereditoRevisao: "mantida" },
  { vereditoRevisao: "revertida", prazoNovaDecisaoFmt: "03/10/2026" },
  { reagendada: true },
];

const EVENTOS_DO_CODIGO = Object.keys(SUBJECTS) as EventoNotificacao[];

Deno.test("T-48-16a — a vigilância cobre os eventos do código (inclusive o 6º, do 48-10)", () => {
  assert(EVENTOS_DO_CODIGO.length >= 6, `só ${EVENTOS_DO_CODIGO.length} eventos em SUBJECTS`);
  assert(EVENTOS_DO_CODIGO.includes("avaliacao_cognitiva_liberada"));
});

Deno.test("T-48-16b — com urlLogin, TODO corpo de candidato tem o botão «Acessar meu painel» e o link por extenso", () => {
  for (const evento of EVENTOS_DO_CODIGO) {
    for (const extra of VARIANTES_U2) {
      const dados = { ...DADOS, ...extra, urlLogin: URL_LOGIN };
      const { html } = renderarEmail(evento, dados as typeof DADOS);
      assert(html.includes("Acessar meu painel"), `${evento} ${JSON.stringify(extra)}: sem o botão`);
      assert(html.includes(`href="${URL_LOGIN}"`), `${evento} ${JSON.stringify(extra)}: o botão não aponta para o login`);
      assert(
        html.includes(`Se o botão não funcionar, acesse: ${URL_LOGIN}`),
        `${evento} ${JSON.stringify(extra)}: falta o link por extenso`,
      );
    }
  }
});

Deno.test("T-48-16c — SEM urlLogin, nenhum corpo sai com o bloco (nunca link quebrado)", () => {
  for (const evento of EVENTOS_DO_CODIGO) {
    for (const extra of VARIANTES_U2) {
      const { html } = renderarEmail(evento, { ...DADOS, ...extra } as typeof DADOS);
      assert(!html.includes("Acessar meu painel"), `${evento}: botão sem destino`);
      assert(!html.includes("/auth/login"), `${evento}: link de login sem urlLogin`);
      assert(!html.includes('href=""'), `${evento}: href vazio`);
    }
  }
  // string vazia vale como ausente
  const vazio = { ...DADOS, urlLogin: "" };
  assert(!renderarEmail("candidatura_recebida", vazio as typeof DADOS).html.includes("Acessar meu painel"));
});

Deno.test("T-48-16d — layoutBase sozinho (como o chamam notificar-rh e o recibo) NÃO tem link de login", () => {
  const html = layoutBase({ preheader: "p", conteudoHtml: "<p>c</p>" });
  assert(!html.includes("/auth/login"), "o layout comum carrega link de login — vazaria ao RH e ao recibo");
  assert(!html.includes("Acessar meu painel"));
});

Deno.test("T-48-16e — o link é ESCAPADO no href e no texto", () => {
  const hostil = 'https://rh.beautysmile.com.br/auth/login?x="><script>alert(1)</script>';
  const dados = { ...DADOS, urlLogin: hostil };
  const { html } = renderarEmail("candidatura_recebida", dados as typeof DADOS);
  assert(!html.includes("<script>"), "tag <script> CRUA vinda do link");
  assert(html.includes("&quot;&gt;&lt;script&gt;"), "o link deveria sair escapado");
});

Deno.test("T-48-16f — o bloco não quebra os grep-guards: sem token de avaliação nem endereço do domínio", () => {
  const proibido = /score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio|teste psicol/i;
  for (const evento of EVENTOS_DO_CODIGO) {
    const dados = { ...DADOS, urlLogin: URL_LOGIN };
    const { html } = renderarEmail(evento, dados as typeof DADOS);
    const bloco = html.slice(html.indexOf("Acessar meu painel") - 300);
    assert(!proibido.test(bloco), `${evento}: token vetado no bloco de acesso`);
    assert(!RE_ENDERECO_DOMINIO.test(html), `${evento}: endereço @beautysmile.com.br no corpo (D-07)`);
  }
});

// ── T-48-16 (Task 2) — JORN-15 · D-09: a promessa do e-mail de confirmação ───────────────
//
// O e-mail prometia avisar em cada etapa; o sistema avisava em 1 de 4. O operador escolheu
// mudar a PROMESSA (D-09), não passar a avisar em cada avanço: acompanhe pelo painel, e o
// e-mail vem quando houver algo para fazer ou uma decisão. A frase antiga é montada por
// concatenação para que este arquivo não a contenha literal.

const PROMESSA_D09 =
  "Acompanhe o andamento pelo seu painel a qualquer momento. Avisaremos por e-mail quando " +
  "houver algo para você fazer ou uma decisão sobre a sua candidatura.";
const PROMESSA_ANTIGA = "a cada " + "etapa";

Deno.test("T-48-16g — a confirmação diz a promessa de D-09, literal", () => {
  const { html } = renderarEmail("candidatura_recebida", DADOS);
  assert(html.includes(PROMESSA_D09), "a confirmação não traz a cópia de D-09");
  assert(html.includes("Acompanhe o andamento pelo seu painel"), "sem a frase canônica do front");
});

Deno.test("T-48-16h — NENHUM corpo de candidato promete aviso em cada etapa", () => {
  for (const evento of EVENTOS_DO_CODIGO) {
    for (const extra of VARIANTES_U2) {
      const dados = { ...DADOS, ...extra, urlLogin: URL_LOGIN };
      const { html, subject } = renderarEmail(evento, dados as typeof DADOS);
      assert(!html.includes(PROMESSA_ANTIGA), `${evento}: promete aviso em cada etapa`);
      assert(!subject.includes(PROMESSA_ANTIGA), `${evento}: assunto promete aviso em cada etapa`);
    }
  }
});
