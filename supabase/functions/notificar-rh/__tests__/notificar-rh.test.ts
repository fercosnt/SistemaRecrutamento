/**
 * Phase 42 / Plan 42-07 — REVISAO-01: invariantes puros da EF `notificar-rh`.
 *
 * Testa `helpers.ts` (funções puras) SEM disparar `Deno.serve` — mesmo padrão do
 * irmão `notificar-candidato/__tests__/notificar-candidato.test.ts`. Zero rede, zero
 * segredo: `--allow-net` NÃO é passado, e nenhum caso aqui toca `fetch`.
 *
 * O que este arquivo prova, em ordem de importância:
 *   1. PRIVACIDADE (T-42-24) — o corpo do e-mail ao RH não carrega nome de candidato
 *      nem `candidatura_id`. Em modo `teste` o corpo inteiro viaja para `resend.dev`,
 *      um domínio de TERCEIRO. A asserção é negativa e estrutural: a assinatura de
 *      `corpoRevisaoSolicitada` não aceita esses campos, e um objeto com campo extra
 *      injetado por qualquer caminho não os faz aparecer no HTML.
 *   2. NÃO-COLISÃO da `dedupe_key` — a chave é POR DESTINATÁRIO. Uma chave só por
 *      candidatura faria o primeiro RH consumir o claim e os demais receberem
 *      `duplicate`, silenciosamente (T-42-26).
 *   3. XSS — `tituloVaga` é dado digitado por humano no CRUD de vagas; sai escapado.
 *   4. LOG (T-42-24) — `logSeguroRh` é allowlist e NÃO deixa passar `dedupe_key`
 *      (que embute o `candidatura_id` completo E o `user_id` do RH).
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *        supabase/functions/notificar-rh
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  APP_BASE_URL_PADRAO,
  assuntoRevisaoSolicitada,
  construirCorpoResendRh,
  corpoRevisaoSolicitada,
  logSeguroRh,
  montarDedupeKeyRh,
  montarUrlFila,
  refCurta,
} from "../helpers.ts";
import { FROM, REPLY_TO } from "../../_shared/email-config.ts";

const TITULO = "Dentista Sênior";
const URL_FILA = "https://recruta.beautysmile.com.br/rh/revisoes";

// ─── 1) dedupe_key por destinatário ─────────────────────────────────────────

Deno.test("REVISAO-01 — montarDedupeKeyRh: '{candidatura}:revisao_solicitada:{user}'", () => {
  assertEquals(
    montarDedupeKeyRh("cand-1", "user-9"),
    "cand-1:revisao_solicitada:user-9",
  );
});

Deno.test("REVISAO-01 — NÃO-COLISÃO: dois destinatários da MESMA candidatura ⇒ chaves distintas", () => {
  const a = montarDedupeKeyRh("cand-1", "admin-aaa");
  const b = montarDedupeKeyRh("cand-1", "recrutador-bbb");
  assert(
    a !== b,
    "chave por candidatura (e não por destinatário) faria o 1º RH consumir o claim " +
      "e todos os demais receberem skipped:duplicate em silêncio",
  );
  assert(a.endsWith("admin-aaa"), `a chave deve terminar no user_id: ${a}`);
  assert(b.endsWith("recrutador-bbb"), `a chave deve terminar no user_id: ${b}`);
});

// ─── 2) assunto ─────────────────────────────────────────────────────────────

Deno.test("REVISAO-01 — assuntoRevisaoSolicitada nomeia a vaga e nunca um candidato", () => {
  const s = assuntoRevisaoSolicitada(TITULO);
  assert(s.length > 0, "assunto não pode ser vazio");
  assert(s.includes(TITULO), `assunto deve citar a vaga: ${s}`);
  // A assinatura não tem parâmetro de nome — a asserção pinada é que a PALAVRA
  // 'candidato' não aparece, tornando impossível um "candidato Fulano" futuro.
  assert(
    !/candidat/i.test(s),
    `assunto não deve nomear o candidato (RH vê o nome na fila, não no e-mail): ${s}`,
  );
});

Deno.test("REVISAO-01 — assuntoRevisaoSolicitada neutraliza CR/LF (header injection)", () => {
  const s = assuntoRevisaoSolicitada("Vaga X\r\nBcc: intruso@exemplo.com");
  assert(!/[\r\n]/.test(s), `assunto com CR/LF permite injeção de header: ${s}`);
});

// ─── 3) corpo: privacidade + XSS + link ─────────────────────────────────────

Deno.test("REVISAO-01 — corpoRevisaoSolicitada traz a vaga escapada e o link da fila", () => {
  const html = corpoRevisaoSolicitada({ tituloVaga: TITULO, urlFila: URL_FILA });
  assert(html.includes(TITULO), "o corpo deve citar o título da vaga");
  assert(html.includes(URL_FILA), "o corpo deve levar para a fila /rh/revisoes");
  assert(html.startsWith("<!doctype html>"), "deve usar layoutBase do projeto");
});

Deno.test("T-42-24 — corpoRevisaoSolicitada NÃO emite nome de candidato nem candidatura_id", () => {
  // A assinatura não aceita esses campos. Este caso prova que injetá-los por um
  // caminho lateral (objeto com campo extra) também não os faz aparecer no HTML —
  // em modo `teste` este corpo viaja INTEIRO para resend.dev, domínio de terceiro.
  const NOME = "Fulano de Tal";
  const CANDIDATURA = "11111111-2222-3333-4444-555555555555";
  const argsInjetados = {
    tituloVaga: TITULO,
    urlFila: URL_FILA,
    nomeCandidato: NOME,
    candidatura_id: CANDIDATURA,
    email: "candidato.real@gmail.com",
  } as unknown as Parameters<typeof corpoRevisaoSolicitada>[0];

  const html = corpoRevisaoSolicitada(argsInjetados);
  assert(!html.includes(NOME), "REGRESSÃO T-42-24: nome de candidato no corpo do e-mail ao RH");
  assert(!html.includes(CANDIDATURA), "REGRESSÃO T-42-24: candidatura_id no corpo do e-mail");
  assert(
    !html.includes("candidato.real@gmail.com"),
    "REGRESSÃO T-42-24: e-mail de candidato no corpo",
  );
});

Deno.test("T-42-24 — corpoRevisaoSolicitada escapa HTML no título da vaga (XSS)", () => {
  const html = corpoRevisaoSolicitada({
    tituloVaga: '<script>alert("x")</script>',
    urlFila: URL_FILA,
  });
  assert(html.includes("&lt;script&gt;"), "o título deve sair escapado");
  assert(
    !html.includes("<script>"),
    "REGRESSÃO XSS: tag <script> crua no corpo do e-mail",
  );
});

// ─── 4) corpo Resend ────────────────────────────────────────────────────────

Deno.test("REVISAO-01 — construirCorpoResendRh usa FROM/REPLY_TO, sem anexo e sem a chave", () => {
  const corpo = construirCorpoResendRh({
    para: "delivered+revisao_solicitada_rh@resend.dev",
    subject: "s",
    html: "<p>h</p>",
  });
  assertEquals(corpo.from, FROM);
  assertEquals(corpo.reply_to, REPLY_TO);
  assertEquals(corpo.to, "delivered+revisao_solicitada_rh@resend.dev");
  assertEquals("attachments" in corpo, false, "o e-mail ao RH não carrega anexo");
  const serial = JSON.stringify(corpo);
  assert(
    !/authorization|bearer|api[_-]?key/i.test(serial),
    "o corpo JSON nunca pode conter a chave da API",
  );
});

// ─── 5) log seguro ──────────────────────────────────────────────────────────

Deno.test("T-42-24 — logSeguroRh é allowlist e barra dedupe_key (embute candidatura_id + user_id)", () => {
  const filtrado = logSeguroRh({
    evento: "revisao_solicitada",
    status: "enviado",
    destinatarios: 5,
    candidatura_ref: "11111111",
    // tudo abaixo deve ser descartado
    dedupe_key: "11111111-2222-3333-4444-555555555555:revisao_solicitada:user-9",
    candidatura_id: "11111111-2222-3333-4444-555555555555",
    user_id: "9e6b0f1a-0000-0000-0000-000000000000",
    email: "rh.real@beautysmile.com.br",
    nome_completo: "Fulana RH",
    html: "<p>corpo</p>",
  });
  assertEquals(filtrado, {
    evento: "revisao_solicitada",
    status: "enviado",
    destinatarios: 5,
    candidatura_ref: "11111111",
  });
  for (const proibida of ["dedupe_key", "candidatura_id", "user_id", "email", "nome_completo", "html"]) {
    assert(!(proibida in filtrado), `logSeguroRh deixou passar '${proibida}'`);
  }
});

Deno.test("T-42-24 — refCurta trunca o id (nunca o uuid completo em log)", () => {
  assertEquals(refCurta("11111111-2222-3333-4444-555555555555"), "11111111");
  assertEquals(refCurta("abc"), "abc");
  assertEquals(refCurta(""), "");
});

// ─── 6) URL da fila ────────────────────────────────────────────────────────

Deno.test("REVISAO-01 — montarUrlFila: default canônico, barra final normalizada", () => {
  assertEquals(montarUrlFila(), `${APP_BASE_URL_PADRAO}/rh/revisoes`);
  assertEquals(
    montarUrlFila("https://recruta.beautysmile.com.br/"),
    "https://recruta.beautysmile.com.br/rh/revisoes",
  );
});

Deno.test("REVISAO-01 — montarUrlFila rejeita base malformada e cai no default (link nunca quebra)", () => {
  // Uma env malformada NÃO pode produzir um link hostil nem quebrado num e-mail
  // interno — mesma doutrina fail-safe de `resolverModo` (valor ruim ⇒ default).
  for (const ruim of ["", "   ", "javascript:alert(1)", "http://inseguro.example", "nao-e-url"]) {
    assertEquals(
      montarUrlFila(ruim),
      `${APP_BASE_URL_PADRAO}/rh/revisoes`,
      `base '${ruim}' deveria cair no default`,
    );
  }
});
