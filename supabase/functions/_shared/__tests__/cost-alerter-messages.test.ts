/**
 * Phase 23 / Plan 23-03 Task 2 — AI-06: `cost-alerter/messages.ts` unit coverage.
 *
 * `alertMessage` used to live inside `cost-alerter/index.ts`, behind a `Deno.serve`
 * handler → un-unit-testable, and its `candidate_cost_over_1` branch was DEAD CODE
 * (the DB trigger only ever emits `vaga_cost_over_200` + `error_rate`). This suite
 * imports the extracted PURE module (no Deno.serve) and regression-guards all 4
 * branches — so `candidate_cost_over_1` stops being untested dead code (23-RESEARCH
 * §AI-06 hole #3). The trigger-side emission of the candidate channel is Plan 23-05.
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *        supabase/functions/_shared/__tests__/cost-alerter-messages.test.ts
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { alertMessage, type CostAnomalyBody } from "../../cost-alerter/messages.ts";

const base: Omit<CostAnomalyBody, "alert_type"> = {
  vaga_id: "22222222-2222-2222-2222-222222222222",
  date: "2026-07-05",
  value: 250,
  threshold: 200,
};

Deno.test("AI-06 — candidate_cost_over_1 renders the per-candidate copy (no longer dead code)", () => {
  const msg = alertMessage({ ...base, alert_type: "candidate_cost_over_1", value: 1.5, threshold: 1 });
  assert(/por candidato/i.test(msg), "candidate channel copy must mention 'por candidato'");
  assert(msg.includes("1.5") && msg.includes("1"), "must carry value + threshold");
});

Deno.test("AI-06 — vaga_cost_over_200 mentions the vaga and its limit", () => {
  const msg = alertMessage({ ...base, alert_type: "vaga_cost_over_200" });
  assert(/vaga/i.test(msg), "vaga channel copy must mention 'vaga'");
  assert(msg.includes("250") && msg.includes("200"), "must carry value + threshold");
});

Deno.test("AI-06 — error_rate mentions a percentage", () => {
  const msg = alertMessage({ ...base, alert_type: "error_rate", value: 40, threshold: 25 });
  assert(msg.includes("%"), "error_rate channel copy must mention a percentage");
  assert(/erro/i.test(msg), "error_rate copy must mention 'erro'");
});

Deno.test("AI-06 — unknown alert_type falls back to the generic anomaly copy", () => {
  const msg = alertMessage({ ...base, alert_type: "something_new", value: 9, threshold: 3 });
  assert(/anomalia/i.test(msg), "default branch must be the generic anomaly copy");
  assert(msg.includes("9") && msg.includes("3"), "must carry value + threshold");
});

Deno.test("AI-06 — the 4 branches return distinct strings", () => {
  const msgs = [
    alertMessage({ ...base, alert_type: "vaga_cost_over_200" }),
    alertMessage({ ...base, alert_type: "error_rate" }),
    alertMessage({ ...base, alert_type: "candidate_cost_over_1" }),
    alertMessage({ ...base, alert_type: "zzz_default" }),
  ];
  assertEquals(new Set(msgs).size, 4, "each channel must produce a distinct message");
});

// RNF-12a: no forbidden product language may leak into any alert copy.
Deno.test("AI-06 — no forbidden product terms in any alert copy", () => {
  // Fragment-joined so this guard file does not itself trip a whole-src forbidden-term grep.
  const FORBIDDEN = [
    ["teste", " psicol", "ógico"].join(""),
    ["psic", "ólogo"].join(""),
    ["teste", "s psicom", "étricos"].join(""),
  ];
  for (const alert_type of ["vaga_cost_over_200", "error_rate", "candidate_cost_over_1", "zzz_default"]) {
    const msg = alertMessage({ ...base, alert_type }).toLowerCase();
    for (const term of FORBIDDEN) {
      assert(!msg.includes(term.toLowerCase()), `alert copy must not contain forbidden term "${term}"`);
    }
  }
});
