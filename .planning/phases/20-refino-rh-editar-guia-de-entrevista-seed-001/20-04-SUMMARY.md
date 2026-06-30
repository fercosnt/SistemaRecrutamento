---
phase: 20-refino-rh-editar-guia-de-entrevista-seed-001
plan: 04
subsystem: supabase/functions/gerar-guia-entrevista (EF regen merge-preserve)
tags: [ENTREV-08, edge-function, merge-preserve, upsert, anti-silent-discard, lgpd, rnf-07a]
requires:
  - "entrevista_guias.updated_at + UNIQUE(candidatura_id,tipo) (20-02, live in PROD)"
  - "GuiaPergunta.origem + origem-aware normalizeGuia (20-03 read layer carries provenance)"
  - "20-01 RED Deno merge-preserve test (the gate this plan flips GREEN)"
provides:
  - "gerar-guia-entrevista regen merges manual + fresh-IA into one row (INSERT → upsert ON CONFLICT)"
  - "ENTREV-08 hard invariant enforced server-side: origem:'manual' questions never dropped by a regen"
  - "failed-regen guard: guide==null carries manualQs into the incompleto payload (no clobber)"
  - "fresh questions stamped origem:'ia' post-parse — the field 20-03 reads + 20-05 badges"
affects:
  - "20-04 Task 2 [BLOCKING] PROD redeploy (deferred to orchestrator gate — NOT done here)"
  - "Phase 21 (live regen round-trip UAT — deferred)"
tech-stack:
  added: []
  patterns:
    - "read-merge-upsert: read current via select('guia') allowlist, split by origem, merge, upsert on the UNIQUE arbiter"
    - "merge BEFORE the never-absent `guide ?? {incompleto}` fallback (Pitfall 3 failed-regen trap)"
    - "post-parse origem:'ia' stamp (zod/v4 schema + helper surface untouched — A1)"
    - "upsert idiom cloned from gerar-devolutiva-bigfive:458-468 / analise-candidato-individual:316"
key-files:
  created:
    - ".planning/phases/20-refino-rh-editar-guia-de-entrevista-seed-001/20-04-SUMMARY.md"
  modified:
    - "supabase/functions/gerar-guia-entrevista/index.ts"
decisions:
  - "Merge identifies manual questions strictly by `q.origem === 'manual'` (the field is authoritative — survives reorder/edit), NEVER by text/order match (ENTREV-08 anti-silent-discard)."
  - "The read-current + merge runs BEFORE the `guide ?? {incompleto}` fallback so a FAILED/poisoned regen carries manualQs into the incompleto payload — a parse failure cannot wipe a manual edit (RESEARCH Pitfall 3)."
  - "Fresh questions stamped origem:'ia' POST-parse via .map (not via the LLM zod/v4 schema) — the InterviewGuideSchema + zodOutputFormat/zodResponseFormat helper surface stay byte-unchanged (A1)."
  - "read-current uses select('guia') allowlist, never select('*') (reference_select_star_leaks_pii); two-client auth block (L143-199) + redacted LGPD log + persistFlags build all UNCHANGED; EF still never writes candidaturas (RNF-07a)."
  - "Task 2 [BLOCKING] PROD redeploy is NOT performed here — it is human-gated and owned by the orchestrator (Phase-18 precedent). Code + green Deno test only."
metrics:
  duration: "~6min"
  completed: 2026-06-29
  tasks: 1 of 2 (Task 2 = orchestrator-gated PROD redeploy, deferred)
  files: 1
  tsc: 257
  tests: "Deno merge-preserve 3/3 GREEN; vitest 675/675 (no regression)"
---

# Phase 20 Plan 04: gerar-guia-entrevista merge-preserve (ENTREV-08) Summary

**One-liner:** Changed `gerar-guia-entrevista` from a blind `.insert()` to a read-merge-upsert that NEVER drops an `origem:'manual'` question (including the failed-regen path), stamps fresh questions `origem:'ia'` post-parse, and targets the `UNIQUE(candidatura_id,tipo)` arbiter — flipping the 20-01 RED Deno merge-preserve test to GREEN (3/3) while the auth path, redacted log, and RNF-07a stay untouched.

## Objective (met — code half)

Closed the central ENTREV-08 anti-silent-discard invariant: the EF was built to INSERT a new row per regen (orphaning manual edits); a regen now merges preserved `origem:'manual'` questions + fresh-IA into one row via upsert on the UNIQUE arbiter. The deterministic invariant is proven by the now-green Deno test. The [BLOCKING] PROD redeploy (Task 2) is human-gated and handed to the orchestrator — **the EF was NOT redeployed here**.

## What shipped

### Task 1 — Read-merge-upsert preserving manual questions + failed-regen guard + origem:'ia' stamp (commit `099ade9`)

`supabase/functions/gerar-guia-entrevista/index.ts` — replaced the blind `.insert()` (old L318-323) with a read-merge-upsert in the persist block (§8a):

- **Read current (allowlist):** `.from("entrevista_guias").select("guia").eq("candidatura_id", …).eq("tipo", …).maybeSingle()` — `select("guia")`, NEVER `select('*')` (`reference_select_star_leaks_pii`).
- **Preserve manual:** `const manualQs = currentQs.filter((q) => q.origem === "manual")` — questions read from `currentGuia?.questions ?? currentGuia?.perguntas ?? []`; identified strictly by the authoritative `origem` field, never by text/order.
- **Stamp fresh IA:** `const freshIaQs = (guide?.questions ?? []).map((q) => ({ ...q, origem: "ia" as const }))` — POST-parse, no touch to the zod/v4 schema or the `zodOutputFormat`/`zodResponseFormat` helper surface.
- **Merge:** `const mergedQuestions = [...manualQs, ...freshIaQs]`.
- **Upsert (was insert):** `.upsert({ candidatura_id, tipo, guia: guide ? { ...guide, questions: mergedQuestions } : { incompleto: true, flags: persistFlags, questions: manualQs }, prompt_version, updated_at: new Date().toISOString() }, { onConflict: "candidatura_id,tipo" })`.
- **Failed-regen guard (Pitfall 3):** the read + merge runs BEFORE the `guide ?? {incompleto}` fallback, and the `guide == null` branch carries `manualQs` into the incompleto payload — a failed/poisoned regen can no longer clobber a manual edit.

**Unchanged (as required):** the two-client authenticate-then-authorize block (L143-199, role from `usuarios_rh`, own-vaga via `vagas.created_by`, admin bypass), the `persistFlags` build (§8), the redacted LGPD-02 log, and the static `npm:` SDK imports. The EF still never writes `candidaturas` (RNF-07a).

### Task 2 — [BLOCKING] Redeploy gerar-guia-entrevista to PROD — DEFERRED to orchestrator

`checkpoint:human-action` / `gate="blocking"`. Per the execution objective, the PROD redeploy is **not** performed by this executor — it is human-gated and owned by the orchestrator (Phase-18 precedent). The deployed bundle stays frozen on the old blind INSERT until the orchestrator runs `supabase functions deploy gerar-guia-entrevista` (or MCP `deploy_edge_function`) and confirms via `get_edge_function` that the live source contains `onConflict`. The merge logic lives in `index.ts`, not `_shared`, so there is no cross-EF bundle drift (`reference_ef_shared_bundle_freeze`). Live regen round-trip is deferred to Phase 21.

## Verification

- `deno test --allow-read --allow-env supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts` → **3/3 GREEN** (was 3/3 RED before the change):
  - successful regen PRESERVES the `origem:'manual'` question;
  - FAILED regen (guide=null) does NOT clobber the manual question;
  - freshly-generated questions are stamped `origem:'ia'`.
- Grep gates: `onConflict: "candidatura_id,tipo"` present; `origem` present (6 occurrences); no blind `.insert()` into `entrevista_guias`; no actual `select('*')` (the only `'*'` matches are the two NÃO/NUNCA comment lines).
- `npm run lint` (tsc --noEmit): **257 errors** — flat at the FOUND-08 baseline (≤ 257), zero new.
- `npm run test:run` (frontend vitest): **675/675 GREEN** — no regression.

## Deviations from Plan

None — plan executed as written for the code half (Task 1). Task 2 (PROD redeploy) is intentionally deferred to the orchestrator's human gate per the execution objective; this is not a deviation but the planned [BLOCKING] handoff.

## Threat surface

No new security surface. The plan's threat register is satisfied by the implementation:
- T-20-12 (manual question dropped) — mitigated: split by `origem === 'manual'`, keep all, Deno test asserts it.
- T-20-13 (failed/poisoned regen wipes the row) — mitigated: merge runs before the fallback; incompleto payload carries `manualQs`.
- T-20-14 (over-projection on read-current) — mitigated: `select("guia")` allowlist, never `select('*')`.
- T-20-15 (auth regression) — accept: the two-client auth block is UNCHANGED.
- T-20-SC (supply-chain) — accept: zero external packages added; `npm:` imports stay static; zod/v4 pin untouched.

## Known Stubs

None.

## Self-Check: PASSED

- `supabase/functions/gerar-guia-entrevista/index.ts` — present (modified; contains `onConflict: "candidatura_id,tipo"` upsert).
- `.planning/phases/20-refino-rh-editar-guia-de-entrevista-seed-001/20-04-SUMMARY.md` — present (this file).
- Commit `099ade9` — present in git log (`feat(20-04): merge-preserve upsert in gerar-guia-entrevista`).

## Redeploy (orchestrator gate, 2026-06-30)

gerar-guia-entrevista redeployed to PROD via `supabase functions deploy` (CLI, user-run): **v2 → v3**, verify_jwt:true preserved, new bundle hash, ACTIVE. ENTREV-08 merge-preserve is now LIVE. Live regen round-trip verification deferred to Phase 21.
