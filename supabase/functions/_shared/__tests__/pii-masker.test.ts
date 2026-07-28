/**
 * Phase 9 / Plan 09-01 Task 2 — Wave 0 RED scaffold for `_shared/pii-masker.ts`.
 *
 * Gates IA-02 (PII never reaches a log write) + RESEARCH Pitfall 6.
 * Flips GREEN in Plan 09-05 (the `_shared` helpers wave) when `pii-masker.ts`
 * lands the PT-BR PII regex rules from `08-edge-function-reference.ts` §PII.
 *
 * NO real API call happens (orchestrator-decision #2) — pure string transform.
 *
 * ── Why this is RED now ──
 * `../pii-masker.ts` does not exist yet, so the dynamic import below throws a
 * module-not-found error. That IS the RED assertion. When Plan 05 creates the
 * helper, the import resolves and the behavioral assertions take over.
 *
 * Run: deno test --allow-read supabase/functions/_shared/__tests__/pii-masker.test.ts
 *
 * @see docs/conhecimento/prompts/templates/08-edge-function-reference.ts (PII_RULES L106)
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-RESEARCH.md (Pitfall 6)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// RED until Plan 09-05: dynamic import so the file parses/typechecks even while
// the module is absent — the failure surfaces at test run, not at parse time.
async function loadMasker() {
  const mod = await import("../pii-masker.ts");
  return mod as {
    maskPII: (text: string) => { masked: string; placeholders: string[] };
  };
}

// Synthetic PT-BR PII fixtures (NOT real data — IA-02 / T-09-02 fixture rule).
const FIXTURES = {
  cpf: "123.456.789-09",
  cnpj: "12.345.678/0001-95",
  email: "candidato@example.com",
  telefone: "(11) 98765-4321",
  dataNasc: "01/01/1990",
  endereco: "Rua das Flores, 123",
  rg: "12.345.678-9",
};

Deno.test("IA-02 — maskPII replaces CPF with [CPF] placeholder", async () => {
  const { maskPII } = await loadMasker();
  const { masked, placeholders } = maskPII(`CPF do candidato: ${FIXTURES.cpf}`);
  assert(!masked.includes(FIXTURES.cpf), "CPF must not survive masking");
  assert(masked.includes("[CPF]"), "masked output must carry the [CPF] placeholder");
  assert(placeholders.includes("[CPF]"), "placeholders list must report [CPF]");
});

Deno.test("IA-02 — maskPII replaces CNPJ, email, telefone, data-nasc, endereco, RG", async () => {
  const { maskPII } = await loadMasker();
  const input = [
    `CNPJ ${FIXTURES.cnpj}`,
    `email ${FIXTURES.email}`,
    `tel ${FIXTURES.telefone}`,
    `nasc ${FIXTURES.dataNasc}`,
    `end ${FIXTURES.endereco}`,
    `rg ${FIXTURES.rg}`,
  ].join("\n");
  const { masked, placeholders } = maskPII(input);
  for (const raw of Object.values(FIXTURES)) {
    assert(!masked.includes(raw), `raw PII must not survive masking: ${raw}`);
  }
  for (const ph of ["[CNPJ]", "[EMAIL]", "[TELEFONE]", "[DATA_NASC]", "[ENDERECO]", "[RG]"]) {
    assert(placeholders.includes(ph), `placeholders list must report ${ph}`);
  }
});

Deno.test("IA-02 — maskPII returns the placeholders-found list (audit trail)", async () => {
  const { maskPII } = await loadMasker();
  const { placeholders } = maskPII(`${FIXTURES.cpf} e ${FIXTURES.email}`);
  // Order-independent set membership; both detected PII types must be reported.
  assertEquals(new Set(placeholders).has("[CPF]"), true);
  assertEquals(new Set(placeholders).has("[EMAIL]"), true);
});

Deno.test("IA-02 — text with no PII returns the input unchanged + empty list", async () => {
  const { maskPII } = await loadMasker();
  const clean = "Resumo: experiencia em atendimento ao cliente e vendas.";
  const { masked, placeholders } = maskPII(clean);
  assertEquals(masked, clean);
  assertEquals(placeholders.length, 0);
});
