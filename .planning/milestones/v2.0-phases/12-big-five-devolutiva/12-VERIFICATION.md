---
phase: 12-big-five-devolutiva
verified: 2026-06-23T16:08:27Z
status: human_needed
score: 3/3 roadmap success criteria verified (code-level); 14/14 plan must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  note: "Initial verification, run retroactively after the 12-REVIEW (c142933) found the devolutiva chain dead-on-arrival and 5 Critical + 6 Warning were fixed (commits 2e3cebe, 3ef58e5, 781c6a6, ca6cdda, cc8b667) and both EFs redeployed to PROD v5. This report verifies the CURRENT (fixed) state."
human_verification:
  - test: "Full live e2e — a real candidate at etapa_atual='avaliacao_assincrona' completes the 120-item Big Five, the score lands in scores_candidato (tipo='big_five'), the devolutiva generates and renders in-app with 5 dims + percentil + band + interpretive text + LGPD disclaimers."
    expected: "submit-bigfive-final returns { ok:true, devolutiva_id:<uuid> }; a devolutivas_candidato row is persisted (candidato_id set, conteudo_jsonb populated); the candidate sees their devolutiva at /candidato/avaliacao/:candidaturaId/bigfive/devolutiva. candidaturas is NEVER mutated (RNF-07a)."
    why_human: "Requires a live candidate session with a valid JWT at the avaliacao stage; the EFs are JWT-on (anon curl → 401), so the full chain cannot be exercised programmatically without a real auth token. The unit/Deno tests pass but mock the DB; only a live run proves the end-to-end persistence + render."
  - test: "Activate the bigfive_devolutiva prompt in PROD via the canonical sync path (scripts/sync-prompts.ts / prompts-sync CI), then re-run a devolutiva generation."
    expected: "prompt_versions has a bigfive_devolutiva row with is_active=true; the EF uses the curated D-lite template (not its inline fallback). VERIFIED ABSENT NOW: live query returned ZERO bigfive_devolutiva rows in prompt_versions — the deferred git→DB sync was never done. The EF degrades gracefully to a minimal inline prompt today (functional, but not the curated template)."
    why_human: "Deferred to the canonical sync path; ALSO blocked by the CRP placeholder (next item) — the prompt must not be activated until the CRP registration is filled."
  - test: "Fill the registered psychologist's CRP registration number (IN-05) and single-source the LGPD/CFP disclaimer before go-live."
    expected: "No remaining 'CRP-XX/XXXXX' or '[Nome]' placeholders in the devolutiva surfaces. VERIFIED PRESENT NOW (go-live blocker): placeholders confirmed in docs/conhecimento/prompts/templates/08-bigfive-devolutiva.md:129, supabase/functions/gerar-devolutiva-bigfive/index.ts:188, and src/features/avaliacao/components/DevolutivaBigFiveView.tsx:65."
    why_human: "Requires the actual CRP registration of the responsible psychologist — a legal/product input, not a code change. Go-live blocker for the devolutiva."
  - test: "Decide on the Info findings IN-01/IN-02 (seed-text duplicates + gendered/agreement corrections vs the source JSON)."
    expected: "Items 6/36/91 ('Me irrito facilmente.' repeated) and items 10/35 gendered-form corrections re-checked against docs/conhecimento/big-five/fontes/ipip-neo-120-questions-pt-br.json. Does not affect scoring (keyed by item_id/faceta, not text) — face-validity only."
    why_human: "Requires a judgment call against the source JSON; cosmetic, candidate-facing, non-blocking for the code goal."
---

# Phase 12: Big Five + Devolutiva Verification Report

**Phase Goal:** O candidato responde o Big Five contextual com scoring à prova de adulteração server-side, e recebe uma devolutiva D-lite respeitosa e LGPD-compliant — sem que o Big Five rejeite ninguém.

**Verified:** 2026-06-23T16:08:27Z
**Status:** human_needed
**Re-verification:** No — initial verification, run retroactively after the 12-REVIEW gap-fix cycle. Verifies the CURRENT (fixed + redeployed) state, not the original PROD-broken state.

## Goal Achievement

The code-level goal is **fully met**. All three roadmap success criteria are verified in the codebase and against live PROD. The three compounding bugs the code review found (CR-01 dynamic imports, CR-02 schema-mismatched INSERT, CR-03 missing `.select()`) are confirmed FIXED in the current source, and both EFs are confirmed REDEPLOYED to PROD v5 ACTIVE JWT-on. Status is `human_needed` (not `passed`) only because three things are intrinsically human/deferred: the full live e2e (needs a real candidate JWT), the prompt activation (deferred to the canonical sync, also blocked by CRP), and the CRP placeholder fill (a legal/product input, a go-live blocker).

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Candidate answers 120 Likert IPIP-NEO-120 PT-BR; scoring happens server-side via `submit-bigfive-final` (anti-tampering); persists `scores_candidato` tipo=`big_five` with 5 OCEAN dims + 30 facets + norm_group in metadata | ✓ VERIFIED | `submit-bigfive-final/index.ts`: static import of `score()` (L39), authorize-then-act (L119-158), `.strict` body gate rejecting any `score` field (L82-107 / EF schema L131-137), re-scores server-side (L188), INSERTs scores_candidato tipo='big_five' with `{dimensoes, facetas, norm_group}` metadata + `.select("id").single()` (L197-214, CR-03 fix). `_shared/bigfive-scoring.ts` produces 5 OCEAN domains + 30 facetas + norm_group (L222-234). Scorer REVERSED set = 55 ids, faceta/dimensao derivation matches seed exactly (cross-checked programmatically: symmetric diff empty, 0 seed mismatches). Live PROD: bigfive_itens = 120 rows / 55 reverse_keyed; scores_candidato has NO candidate SELECT policy. Deno scoring 11/11 + submit 8/8 GREEN. |
| 2 | After completion, `gerar-devolutiva-bigfive` produces a hybrid devolutiva (25 band templates + IA: 5 dim + percentil + 5 bands + ~150-200 words/dim + LGPD disclaimers without CRP nominalization), delivered in-app + email, persisted in `devolutivas_candidato` | ✓ VERIFIED (code-level; prompt+CRP deferred) | `gerar-devolutiva-bigfive/index.ts`: static imports (L41-52, CR-01 fix), RF-19b guard refusing non-big_five (L350-356), resolves candidato_id via candidaturas (L362-374, CR-02 fix), deterministic band-of-percentil + 25 BAND_TEMPLATES (L93-170), callAi with injected zodOutputFormat/zodResponseFormat (L558-559, WR-02 fix), word-count gate + retry + graceful-degrade (L287-321), upsert onConflict candidatura_id + `.select("id").single()` no fabricated id (L420-442, CR-04/CR-05 fix), attribution candidato_id/vaga_id to callAi (L304-305, WR-01 fix). "Sensibilidade Emocional" for N never the clinical label (L69, DIM_LABEL). Live PROD: devolutivas_candidato has candidato_id NOT NULL and NO score_id column — EF upsert matches schema exactly. Deno devolutiva 4/4 GREEN. **Deferred:** bigfive_devolutiva prompt has ZERO rows in PROD prompt_versions (EF uses inline fallback); CRP placeholder unresolved (go-live blocker). Email is n8n fire-and-forget (in-app is source of truth). |
| 3 | No devolutiva is generated for SJT/Redação — only a generic stage-complete message | ✓ VERIFIED | `gerar-devolutiva-bigfive/index.ts:350-356` — RF-19b hard guard: reads the precondition score row and returns `{ status: "refused" }` (HTTP 422) when `scoreRow.tipo !== "big_five"`. The guard runs BEFORE any AI call or write (service_role bypasses RLS, so the type precondition is checked first). Migration comment + table COMMENT both pin "ONLY Big Five (RF-19b)". Deno test `gerar-devolutiva-bigfive/index.test.ts` covers the refuse path (4/4 GREEN). |

**Score:** 3/3 roadmap success criteria verified at the code level. 14/14 plan must-haves verified (see below).

### Critical Invariant — RNF-07a (system NEVER auto-rejects on a Big Five trait/score)

**✓ VERIFIED — no write path from a trait value to a `candidaturas` decision exists.**

- `submit-bigfive-final`: the ONLY `candidaturas` access is a read-only `.select("id, candidato_id, vaga_id, etapa_atual")` for authorization (L144-148). It NEVER `.update`/`.insert`/`.upsert`/`.delete` on candidaturas; status='sucesso' is written SEMPRE; no `pendente_humano`, no auto-advance, no auto-reject. Neutral payload `{ ok:true, devolutiva_id }` — the candidate never receives a score/percentil/banda.
- `gerar-devolutiva-bigfive`: the ONLY `candidaturas` access is a read-only `.select("candidato_id, vaga_id")` to resolve the owner (L362-366). No mutation.
- The two Phase-12 migrations contain NO trigger that writes candidaturas from a score (the only candidaturas reference is the `devolutivas_candidato.candidatura_id` FK declaration).
- Grep for `\.update\(|\.delete\(|pendente_humano|auto_reject|avancar_etapa|etapa_atual\s*=` across both EFs returned matches only inside comments.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/_shared/bigfive-scoring.ts` | REVERSED set, FACET_TO_DOMAIN, norm table, score() TS-port | ✓ VERIFIED | 236 lines. 55-id REVERSED set (per-domain N7 E6 O12 A17 C13), facetOf, T-score, cubic percentile, band cutoffs, WR-03 120-key guard (L193-202). Pure math, no DB writes. |
| `supabase/functions/submit-bigfive-final/index.ts` | candidate scoring EF (authorize-then-act, never-reject) | ✓ VERIFIED | 291 lines. Static import (L38), auth→authz→validate→score→insert+select (CR-03), neutral payload, inline devolutiva invoke (best-effort). |
| `supabase/functions/gerar-devolutiva-bigfive/index.ts` | hybrid template+IA devolutiva EF | ✓ VERIFIED | 591 lines. All CR-01/02/04/05 + WR-01/02 fixes present. 25 band templates, RF-19b guard, upsert with real-id requirement. |
| `supabase/functions/_shared/avaliacao-schemas.ts` | SubmitBigfiveFinalBodySchema (.strict) + BigfiveDevolutivaSchema | ✓ VERIFIED | 179 lines. SubmitBigfiveFinalBodySchema `.strict()` 1..5 (L131-137); BigfiveDevolutivaSchema (L151). |
| `supabase/migrations/20260612000001_bigfive_itens.sql` | bigfive_itens + 120 seed + get_bigfive_itens + RLS | ✓ VERIFIED + LIVE | 213 lines. 120-row seed, 55 reverse_keyed, no candidate SELECT, get_bigfive_itens SECURITY DEFINER projects item_id/texto/ordem only. Live PROD: 120/55, RPC exists with correct projection. |
| `supabase/migrations/20260612000002_devolutivas_candidato.sql` | devolutivas_candidato + own-row + RH allowlist | ✓ VERIFIED + LIVE | 62 lines. candidato_id NOT NULL, no score_id col, UNIQUE(candidatura_id), own-row + RH allowlist RLS, no candidate write. Live PROD schema + policies match exactly. |
| `src/features/avaliacao/services/bigfiveService.ts` | getBigfiveItens, submitBigfiveFinal, loadDevolutiva | ✓ VERIFIED | 246 lines. RPC reader, neutral submit ack, own-row allowlist read (WR-05 candidato_id added, L233), WR-06 400→INVALID_INPUT mapping. |
| `src/features/avaliacao/schemas/bigfiveSchema.ts` | client SubmitBigfiveBodySchema (.strict, no score) | ✓ VERIFIED | 80 lines. `.strict()` body, parse-on-build, isAllAnswered/countAnswered. |
| `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx` | 120-item paginated Likert | ✓ VERIFIED | 361 lines. getBigfiveItens query, useAutosaveAvaliacao, submitBigfiveFinal, NEUTRAL progress only (never a score). |
| `src/features/avaliacao/components/DevolutivaBigFiveView.tsx` | in-app 5-dim devolutiva | ✓ VERIFIED | 232 lines. loadDevolutiva own-row, "Sensibilidade Emocional" for N, LGPD footer (carries CRP placeholder — IN-05). |
| `src/features/avaliacao/services/scoresRhService.ts` | RH contextual scorecard service (allowlist) | ✓ VERIFIED | 154 lines. SCORES_ALLOWLIST (never select('*')), isBigFiveRow discriminator, big_five metadata shape. |
| `src/router/routes.tsx` | bigfive questionnaire + devolutiva routes | ✓ VERIFIED | Routes `/candidato/avaliacao/:candidaturaId/bigfive` + `/bigfive/devolutiva` registered (L228, L236); imports from features/avaliacao/components. |
| `docs/conhecimento/prompts/templates/08-bigfive-devolutiva.md` | bigfive_devolutiva prompt (LGPD-04) | ✓ VERIFIED (git); ⚠️ not in PROD DB | 159 lines. call_type bigfive_devolutiva, "Sensibilidade Emocional", no clinical labels. CRP placeholder + "Pendente revisão final CRP" flagged. NOT synced to PROD prompt_versions (deferred). |
| `database.types.ts` (12-06) | regenerated types | ◐ PARTIAL | The client surfaces use NARROW confined casts (RPC name / row type) documented to drop after the 12-06 regen. Does not block the goal; the live schema is confirmed correct via Management API queries. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `bigfiveService.ts` | submit-bigfive-final EF | `supabase.functions.invoke('submit-bigfive-final')` | ✓ WIRED | L165. Body built via `buildSubmitBigfiveBody` (.strict, no score). |
| `submit-bigfive-final` | `_shared/bigfive-scoring.ts` | `import { score }` | ✓ WIRED | L39 static import; called L188. |
| `submit-bigfive-final` | `gerar-devolutiva-bigfive` | inline functions.invoke with score_id | ✓ WIRED | L222-224 with the REAL scoreId from `.select("id").single()` (CR-03). |
| `gerar-devolutiva-bigfive` | `_shared/ai-client.ts` (callAi/loadPrompt) | static import + injected zod builders | ✓ WIRED | L47-52 import; loadPrompt L505; callAi L533 with zodOutputFormat/zodResponseFormat (WR-02). |
| `gerar-devolutiva-bigfive` | `devolutivas_candidato` | upsert onConflict candidatura_id + candidato_id | ✓ WIRED | L420-433; candidato_id resolved from candidaturas (CR-02). |
| `routes.tsx` | BigFiveQuestionnaireScreen + DevolutivaBigFiveView | route registration | ✓ WIRED | L228/L236; import from components index L55. |
| PROD prompt_versions | bigfive_devolutiva is_active=true | sync-prompts + activation flip | ✗ NOT_WIRED (DEFERRED) | Live query: ZERO bigfive_devolutiva rows. EF degrades to inline fallback (functional). Deferred to canonical sync; blocked by CRP. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| BigFiveQuestionnaireScreen | itens (120 Likert prompts) | getBigfiveItens → get_bigfive_itens RPC | Yes — live RPC returns 120 rows (item_id/texto/ordem) | ✓ FLOWING |
| DevolutivaBigFiveView | devolutiva (conteudo_jsonb) | loadDevolutiva → own-row devolutivas_candidato | Conditional — flows once a devolutiva row exists; the generation chain is now repaired (CR-01..05) but has NOT been exercised in a live e2e | ⚠️ HUMAN-VERIFY (e2e) — code path verified end-to-end statically; live data flow needs a real candidate run (human item 1) |
| scores_candidato (RH scorecard) | metadata.dimensoes | submit-bigfive-final score() | Yes — server-side score() math is deterministic and tested | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Vitest avaliacao feature (incl. bigfive-contract) | `npx vitest run src/features/avaliacao` | 24 passed / 5 files | ✓ PASS |
| Deno scoring tests | `deno test _shared/bigfive-scoring.test.ts` | 11 passed / 0 failed | ✓ PASS |
| Deno submit EF tests | `deno test submit-bigfive-final/index.test.ts` | 8 passed / 0 failed | ✓ PASS |
| Deno devolutiva EF tests | `deno test gerar-devolutiva-bigfive/index.test.ts` | 4 passed / 0 failed | ✓ PASS |
| Lint baseline | `tsc --noEmit` error count | 291 (baseline held, no regression) | ✓ PASS |
| Seed↔scorer REVERSED agreement | python cross-check (55 ids, faceta/dim) | symmetric diff empty; 0 mismatches | ✓ PASS |
| EF deploy state | `supabase functions list` | submit + gerar both ACTIVE v5 (2026-06-23) | ✓ PASS |
| EF JWT-on gateway | anon curl POST both EFs | HTTP 401 (both) | ✓ PASS |
| Live schema (devolutivas) | information_schema query | candidato_id NOT NULL, no score_id col | ✓ PASS |
| Live RLS (scores/devolutivas/itens) | pg_policies query | no candidate SELECT on scores/itens; own-row + RH on devolutivas | ✓ PASS |
| Live seed | count + reverse_keyed | 120 / 55 | ✓ PASS |
| Live RPC | pg_proc query | get_bigfive_itens SECURITY DEFINER, projects (item_id,texto,ordem) | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` declared for this phase. The 12-SMOKES.md runbook is a SQL-smoke checklist for the apply wave; its live equivalents were executed directly against PROD via the Management API queries above (seed count, RLS policies, schema nullability, RPC projection) — all PASS. The remaining live SQL smokes that require a candidate JWT (candidate-deny on scores, candidate own-row devolutiva, RH allowlist read) are covered structurally by the RLS policy queries above and behaviorally by the human e2e item.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AVAL-04 | 12-01..06 | Big Five IPIP-NEO-120 PT-BR scoring TS-port server-side anti-tampering via submit-bigfive-final; 5 OCEAN + 30 facets + norm_group; persists scores_candidato tipo=big_five | ✓ SATISFIED | Truth 1 + scoring core + live schema/RLS/seed. |
| AVAL-08 | 12-01,04,05,06 | Devolutiva Big Five D-lite hybrid (25 templates + IA; 5 dim + percentil + bands + ~150-200 words + LGPD disclaimers without CRP nominalization) via gerar-devolutiva-bigfive; in-app + email; persists devolutivas_candidato; NEVER for SJT/Redação | ✓ SATISFIED (code); prompt activation + CRP fill deferred | Truths 2+3 + EF + migration + RLS. The curated prompt is not yet active in PROD (graceful fallback) and CRP placeholder is unresolved — both human/deferred go-live items, not code gaps. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| 08-bigfive-devolutiva.md / gerar EF / DevolutivaBigFiveView | :129 / :188 / :65 | `CRP-XX/XXXXX` + `[Nome]` placeholder | ⚠️ Warning (go-live blocker, deferred IN-05) | Legal disclaimer not finalized; must be filled before the prompt is activated / feature goes live. Tracked as human item 3. Not a code defect. |
| bigfive_itens seed | :78,:108,:163 | "Me irrito facilmente." duplicated (items 6/36/91) | ℹ️ Info (IN-01) | Face-validity only; scoring is keyed by item_id/faceta, not text. Deferred. |
| bigfive_itens seed | :82,:107 | 3rd-person / misplaced "(a)" gendered forms | ℹ️ Info (IN-02) | Cosmetic, candidate-facing. Deferred. |

No `TBD`/`FIXME`/`XXX` debt markers and no `TODO`/`PLACEHOLDER` in any Phase-12 modified code file. The `CRP-XX/XXXXX` strings are intentional, documented placeholders flagged "Pendente revisão final CRP" — a known go-live input, surfaced as human item 3 (not an unreferenced debt marker).

### Human Verification Required

1. **Full live e2e** — a real candidate at `avaliacao_assincrona` completes the Big Five → score lands → devolutiva generates and renders. The EFs are JWT-on (anon curl → 401), so the full chain needs a real auth token; unit/Deno tests mock the DB. This is the one path that proves the CR-01..05 repairs actually persist + render in PROD.

2. **Activate the bigfive_devolutiva prompt in PROD** via the canonical sync (scripts/sync-prompts.ts / prompts-sync CI). Verified absent now (ZERO rows in prompt_versions). The EF degrades gracefully to an inline prompt today. Blocked by item 3.

3. **Fill the psychologist's CRP registration (IN-05)** and single-source the LGPD/CFP disclaimer. Verified present now in the prompt template, the EF, and the client. Go-live blocker for the devolutiva; a legal/product input.

4. **Decide on Info findings IN-01/IN-02** (seed-text duplicate/gendered corrections vs the source JSON). Cosmetic, non-blocking.

### Gaps Summary

**No code-level gaps block the phase goal.** The original PROD-breaking defects the code review found (the devolutiva chain failing on every invocation via three compounding bugs) are all confirmed fixed in the current source and the EFs are redeployed to PROD v5 ACTIVE JWT-on. The scoring core, the answer-key/PII protections, and RNF-07a (no trait→candidaturas write path) are all verified — including against the live PROD schema, RLS policies, seed, and deploy state.

The phase is `human_needed` rather than `passed` because three deliverables are intrinsically human/deferred and cannot be closed by code inspection: (1) the full live candidate e2e, (2) the bigfive_devolutiva prompt activation (deferred to the canonical sync, also blocked by CRP), and (3) the CRP registration fill (a legal input + go-live blocker). These are honestly recorded as human-verification items, not resolved. Item (4) covers the cosmetic seed-text Info findings.

---

_Verified: 2026-06-23T16:08:27Z_
_Verifier: Claude (gsd-verifier)_
