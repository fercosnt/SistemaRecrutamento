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
  renderarEmail,
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
