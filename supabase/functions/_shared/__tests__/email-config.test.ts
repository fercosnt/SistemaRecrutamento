/**
 * Phase 36 / Plan 36-01 — DELIV-01 + DELIV-02 + DELIV-03.
 *
 * Prova o contrato canônico de `_shared/email-config.ts`: identidade de remetente
 * congelada (From/Reply-To/domínio) e o fail-safe "não enviar para gente real por
 * default" (modo `teste` quando `NOTIFICACOES_MODO` está ausente ou malformado).
 *
 * Roda SEM rede: `email-config.ts` tem zero imports, então `--allow-net` é
 * desnecessário. Os casos que mexem em env salvam o valor original e restauram
 * em `finally` — nunca deixar env sujo entre testes.
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *        supabase/functions/_shared/__tests__/email-config.test.ts
 */
import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DOMINIO_ENVIO,
  FROM,
  REPLY_TO,
  exigirChaveApi,
  resolverDestinatario,
  resolverModo,
} from "../email-config.ts";

// (1) FAIL-SAFE: env ausente ⇒ teste
Deno.test("DELIV-03 — NOTIFICACOES_MODO ausente ⇒ 'teste' (fail-safe)", () => {
  const original = Deno.env.get("NOTIFICACOES_MODO");
  Deno.env.delete("NOTIFICACOES_MODO");
  try {
    assertEquals(resolverModo(), "teste");
  } finally {
    if (original !== undefined) Deno.env.set("NOTIFICACOES_MODO", original);
  }
});

// (2) FAIL-SAFE: valor inválido (typo 'prod') ⇒ teste, NUNCA producao
Deno.test("DELIV-03 — 'prod' (typo), 'PRODUCTION' e '' ⇒ 'teste', nunca 'producao'", () => {
  assertEquals(resolverModo("prod"), "teste");
  assertEquals(resolverModo("PRODUCTION"), "teste");
  assertEquals(resolverModo(""), "teste");
});

// (3) modo teste redireciona e PRESERVA o original
Deno.test("DELIV-03 — modo teste ⇒ delivered+<evento>@resend.dev, original preservado", () => {
  const r = resolverDestinatario("candidato.real@gmail.com", "convite_entrevista", "teste");
  assertEquals(r.para, "delivered+convite_entrevista@resend.dev");
  assertEquals(r.destinatario_original, "candidato.real@gmail.com");
  assert(r.redirecionado);
});

// (4) NENHUM evento em modo teste escapa para fora de @resend.dev ← a asserção do DELIV-03
Deno.test("DELIV-03 — os 4 eventos em modo teste terminam em @resend.dev", () => {
  for (
    const ev of [
      "candidatura_recebida",
      "avaliacao_liberada",
      "convite_entrevista",
      "decisao_final",
    ] as const
  ) {
    const r = resolverDestinatario("alguem@empresa.com", ev, "teste");
    assert(r.para.endsWith("@resend.dev"), `${ev} vazou para ${r.para}`);
  }
});

// (5) producao passa direto
Deno.test("DELIV-01 — modo producao envia ao endereço real, sem redirecionar", () => {
  const r = resolverDestinatario("candidato.real@gmail.com", "decisao_final", "producao");
  assertEquals(r.para, "candidato.real@gmail.com");
  assertEquals(r.redirecionado, false);
});

// (6) producao sem chave ⇒ erro EXPLÍCITO
Deno.test("DELIV-02 — producao sem chave lança erro explícito (não 401 opaco)", () => {
  assertThrows(() => exigirChaveApi(undefined, "producao"), Error, "RESEND_API_KEY");
  assertEquals(exigirChaveApi(undefined, "teste"), ""); // teste tolera ausência
});

// (7) constantes canônicas congeladas (DELIV-01)
Deno.test("DELIV-01 — From/Reply-To/domínio são os valores canônicos do CONTEXT", () => {
  assertEquals(DOMINIO_ENVIO, "recruta.beautysmile.com.br");
  assertEquals(FROM, "Beauty Smile Recrutamento <nao-responda@recruta.beautysmile.com.br>");
  assertEquals(REPLY_TO, "recrutamento@beautysmile.com.br");
  assert(!FROM.includes("resend.dev"), "From de produção nunca pode ser onboarding@resend.dev");
});

/*
 * ─── Casos 8 e 9: MUTATION-PROOF do fail-safe do DELIV-03 (code review WR-01) ───
 *
 * Os casos 1-7 acima deixavam DUAS mutações fail-open vivas — verificado
 * empiricamente pelo reviewer, 7 passed / 0 failed em ambas:
 *
 *   Mutação A:  `modo: ModoNotificacao = resolverModo()`  →  `= 'producao'`
 *   Mutação B:  `Deno.env.get('NOTIFICACOES_MODO')`       →  `('NOTIFICACOES_MODE')`
 *
 * Causa: os casos 3/4/5 passam `modo` EXPLICITAMENTE como 3º argumento, então
 * o binding do parâmetro default — exatamente a forma como a P38 vai chamar
 * (`resolverDestinatario(email, evento)`) — nunca era exercitado; e nenhum caso
 * cobria o caminho POSITIVO da env (só os negativos, que caem em 'teste' de
 * qualquer jeito e por isso sobrevivem a um typo no nome da variável).
 *
 * O caso (8) mata a mutação B; o caso (9) mata a mutação A. NÃO substituir por
 * chamadas com `modo` explícito: é justamente a ausência do 3º argumento que
 * dá valor ao caso (9).
 */

// (8) o caminho POSITIVO da env — prova que `NOTIFICACOES_MODO` é lida DE VERDADE
Deno.test("DELIV-03 — NOTIFICACOES_MODO='producao' ⇒ 'producao' (env é lida de verdade)", () => {
  const original = Deno.env.get("NOTIFICACOES_MODO");
  Deno.env.set("NOTIFICACOES_MODO", "  PRODUCAO  "); // trim + lowercase
  try {
    assertEquals(
      resolverModo(),
      "producao",
      "resolverModo() sem argumento deve ler a env NOTIFICACOES_MODO — nome errado da env mata o modo produção em silêncio",
    );
  } finally {
    if (original === undefined) Deno.env.delete("NOTIFICACOES_MODO");
    else Deno.env.set("NOTIFICACOES_MODO", original);
  }
});

// (9) o DEFAULT de resolverDestinatario — a chamada real da P38, SEM 3º argumento
Deno.test("DELIV-03 — resolverDestinatario sem modo explícito herda o fail-safe da env", () => {
  const original = Deno.env.get("NOTIFICACOES_MODO");
  Deno.env.delete("NOTIFICACOES_MODO");
  try {
    const r = resolverDestinatario("candidato.real@gmail.com", "decisao_final");
    assertEquals(r.para, "delivered+decisao_final@resend.dev");
    assertEquals(r.destinatario_original, "candidato.real@gmail.com");
    assert(r.redirecionado, "sem env explícita o default NÃO pode ser producao");
  } finally {
    if (original !== undefined) Deno.env.set("NOTIFICACOES_MODO", original);
  }
});
