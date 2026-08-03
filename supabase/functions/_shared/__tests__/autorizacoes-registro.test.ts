/**
 * Phase 43 / Plan 43-01 Task 2 — CONSENT-01 · CONSENT-03 · CONSENT-05 · BD-4.
 *
 * Os DOIS sítios do SERVIDOR que DECIDEM o valor gravado em `public.autorizacoes`:
 *
 *   1. `_shared/schemas.ts` — `autorizacoesSchema`, que até esta fase repunha
 *      `true` via `.optional().default(true)` em DUAS colunas
 *   2. `cadastrar-candidato/index.ts:293-297` — que repunha `true` de novo, com
 *      `?? true`, para o caso de o schema não ter reposto
 *
 * ⚠ POR QUE ESTES TESTES SÃO DO LADO SERVIDOR E NÃO DO CLIENTE: os 6 sítios de
 * `.default(true)` no client (plano 43-03) mudam o que o CHECKBOX mostra. Estes
 * dois mudam o que o BANCO GRAVA. Corrigir só o cliente entregaria o checkbox
 * desmarcado E o banco gravando `true` — o pior resultado possível, porque
 * *parece* corrigido.
 *
 * ⚠ ESCOPO NEGATIVO DELIBERADO: `montarRegistroAutorizacoes` NÃO faz coalescência
 * `??` sobre flag nenhuma. Coalescer é justamente o defeito que esta fase remove;
 * um `?? true` reintroduzido aqui reprova o teste 2 e o teste 3.
 *
 * RUNTIME: Deno (`deno test`) — a linha literal correspondente vive no `exclude`
 * do `vite.config.ts` (lição do 42-07).
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-01-PLAN.md Task 2
 */
import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { autorizacoesSchema } from "../schemas.ts";
import {
  montarRegistroAutorizacoes,
  type ContextoRegistroAutorizacoes,
  type FlagsAutorizacoes,
} from "../autorizacoes-registro.ts";

// Contexto de referência — os valores que a EF calcula uma vez e injeta.
const CTX: ContextoRegistroAutorizacoes = {
  candidatoId: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  ipAceite: "203.0.113.7",
  policyVersion: "v1.0-2026-04",
  consentTextVersion: "v2-2026-08",
  consentTextHash: "d".repeat(64),
  registradoEm: "2026-08-01T12:00:00.000Z",
};

const FLAGS_TODAS_TRUE: FlagsAutorizacoes = {
  autorizacao_uso_dados: true,
  autorizacao_marketing_vagas: true,
  autorizacao_retencao_curriculo: true,
};

// ---------------------------------------------------------------------------
// 1. O schema deixou de repor `true` — os opcionais deixaram de ser opcionais
// ---------------------------------------------------------------------------
Deno.test("1. autorizacoesSchema REJEITA um corpo que omite os dois consentimentos opcionais", () => {
  const r = autorizacoesSchema.safeParse({ autorizacao_uso_dados: true });
  assert(
    !r.success,
    "omitir marketing/retenção tem de FALHAR. Enquanto houver `.optional().default(true)` " +
      "o servidor inventa consentimento que ninguém deu (CONSENT-01).",
  );

  // E com as três presentes, passa.
  const ok = autorizacoesSchema.safeParse(FLAGS_TODAS_TRUE);
  assert(ok.success, "as três flags explícitas têm de parsear");
});

Deno.test("1b. autorizacoesSchema não tem default algum: `false` sobrevive ao parse", () => {
  const r = autorizacoesSchema.safeParse({
    autorizacao_uso_dados: true,
    autorizacao_marketing_vagas: false,
    autorizacao_retencao_curriculo: false,
  });
  assert(r.success);
  assertEquals(r.data.autorizacao_marketing_vagas, false);
  assertEquals(r.data.autorizacao_retencao_curriculo, false);
});

// ---------------------------------------------------------------------------
// 2 e 3. `false` chega ao registro como `false` — nunca `true`
// ---------------------------------------------------------------------------
Deno.test("2. um corpo com autorizacao_marketing_vagas: false produz `false` no registro", () => {
  const registro = montarRegistroAutorizacoes(
    { ...FLAGS_TODAS_TRUE, autorizacao_marketing_vagas: false },
    CTX,
  );
  assertEquals(
    registro.autorizacao_marketing_vagas,
    false,
    "o servidor repôs `true` sobre um `false` explícito — é o defeito CONSENT-01/03 inteiro",
  );
  assertNotEquals(registro.autorizacao_marketing_vagas, true);
});

Deno.test("3. um corpo com autorizacao_retencao_curriculo: false produz `false` no registro", () => {
  const registro = montarRegistroAutorizacoes(
    { ...FLAGS_TODAS_TRUE, autorizacao_retencao_curriculo: false },
    CTX,
  );
  assertEquals(registro.autorizacao_retencao_curriculo, false);
});

// ---------------------------------------------------------------------------
// 4. `autorizacao_analise_video` é REJEITADO, não descartado em silêncio
// ---------------------------------------------------------------------------
Deno.test("4. um corpo que ainda mande autorizacao_analise_video é REJEITADO pelo .strict()", () => {
  const r = autorizacoesSchema.safeParse({
    ...FLAGS_TODAS_TRUE,
    autorizacao_analise_video: true,
  });
  assert(
    !r.success,
    "a chave tem de REJEITAR (400 VALIDATION), não ser descartada. Descartar em " +
      "silêncio devolveria 200 a um cliente que acredita ter registrado uma " +
      "escolha que não existe mais (BD-2 / CONSENT-05, D-04 / LGPD-01).",
  );

  // O mesmo vale para a chave APOSENTADA `autorizacao_comunicacao`: o cliente
  // desatualizado recebe erro em vez de ter o campo comido.
  const r2 = autorizacoesSchema.safeParse({
    ...FLAGS_TODAS_TRUE,
    autorizacao_comunicacao: true,
  });
  assert(!r2.success, "autorizacao_comunicacao saiu do contrato de entrada");
});

// ---------------------------------------------------------------------------
// 5. O montador NUNCA emite a chave de vídeo
// ---------------------------------------------------------------------------
Deno.test("5. montarRegistroAutorizacoes NUNCA emite a chave autorizacao_analise_video", () => {
  const registro = montarRegistroAutorizacoes(FLAGS_TODAS_TRUE, CTX);
  assert(
    !Object.prototype.hasOwnProperty.call(
      registro,
      "autorizacao_analise_video",
    ),
    "a coleta PAROU (BD-2). A coluna permanece com os valores históricos; " +
      "escrever nela agora seria continuar coletando por outro nome.",
  );
  // Nem sequer como `false`: `false` também é uma afirmação sobre uma pergunta
  // que deixou de ser feita.
  assertEquals(
    JSON.stringify(registro).includes("video"),
    false,
    "nenhuma chave do registro pode mencionar vídeo",
  );
});

// ---------------------------------------------------------------------------
// 6. As colunas de PROVA vêm preenchidas
// ---------------------------------------------------------------------------
Deno.test("6. o registro carrega consent_text_version, consent_text_hash, consent_registrado_em e policy_version", () => {
  const registro = montarRegistroAutorizacoes(FLAGS_TODAS_TRUE, CTX);
  assertEquals(registro.consent_text_version, CTX.consentTextVersion);
  assertEquals(registro.consent_text_hash, CTX.consentTextHash);
  assertEquals(registro.consent_registrado_em, CTX.registradoEm);
  assertEquals(registro.policy_version, CTX.policyVersion);

  // Nenhuma delas pode sair vazia — uma linha nova com prova NULL seria
  // indistinguível de uma linha histórica pré-enforcement (SC#1).
  for (
    const chave of [
      "consent_text_version",
      "consent_text_hash",
      "consent_registrado_em",
    ] as const
  ) {
    assert(
      typeof registro[chave] === "string" && registro[chave].length > 0,
      `${chave} não pode nascer vazia numa linha pós-enforcement`,
    );
  }

  // E os vínculos de identidade.
  assertEquals(registro.candidato_id, CTX.candidatoId);
  assertEquals(registro.user_id, CTX.userId);
  assertEquals(registro.ip_aceite, CTX.ipAceite);
  assertEquals(registro.autorizacao_uso_dados, true);
});

// ---------------------------------------------------------------------------
// 7. NEGATIVA — esta fase não passa a coletar o que não coletava
// ---------------------------------------------------------------------------
Deno.test("7. o registro NÃO carrega user_agent_aceite", () => {
  const registro = montarRegistroAutorizacoes(FLAGS_TODAS_TRUE, CTX);
  assert(
    !Object.prototype.hasOwnProperty.call(registro, "user_agent_aceite"),
    "a coluna existe e continua sem ser escrita. Uma fase sobre consentimento " +
      "honesto não é licença para começar a coletar um dado a mais de passagem.",
  );
});

// ---------------------------------------------------------------------------
// Extra — `ipAceite` ausente vira `null` explícito, não `undefined`
// ---------------------------------------------------------------------------
Deno.test("8. ipAceite ausente é gravado como null explícito", () => {
  const registro = montarRegistroAutorizacoes(FLAGS_TODAS_TRUE, {
    ...CTX,
    ipAceite: null,
  });
  assertEquals(registro.ip_aceite, null);
});
