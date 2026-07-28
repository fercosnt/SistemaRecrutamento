---
phase: 12-big-five-devolutiva
status: verified
threats_total: 26
threats_closed: 26
threats_open: 0
accepted_risks: 6
unregistered_flags: 0
asvs_level: 2
register_authored_at_plan_time: true
audited: 2026-06-23
auditor: gsd-security-auditor
audited_against: "CURRENT fixed code (post 12-REVIEW: CR-01..05 + WR-01..06 fixed in 2e3cebe/3ef58e5/781c6a6/ca6cdda/cc8b667; both EFs redeployed PROD v5 JWT-on)"
---

# Phase 12: Security Audit — Big Five + Devolutiva

**Audited:** 2026-06-23
**Disposition:** all 26 plan-time threats verified CLOSED in the implemented + just-fixed code.
**Result:** SECURED — `threats_open: 0`.

This audit verifies each plan-time STRIDE threat (T-12-01 .. T-12-26 + the per-plan
T-12-SC supply-chain disposition) against the **current** source, which incorporates
the 5 Critical + 6 Warning fixes the 12-REVIEW found and which the 12-VERIFICATION
confirmed redeployed to PROD v5 (JWT-on). It does not re-run a full retroactive STRIDE
scan (register was authored at plan time); it confirms each declared mitigation is
present at the cited entry point, and flags any obvious new gap (none found).

---

## Threat Verification (Closed)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-12-01 | Tampering (client-sent score) | mitigate | `bigfiveSchema.ts:37-43` `SubmitBigfiveBodySchema.strict()` + `avaliacao-schemas.ts:131-137` `SubmitBigfiveFinalBodySchema.strict()` (no `score` field); contract test GREEN (`bigfive-contract.test.ts`, 7/7) |
| T-12-02 | Info Disclosure (answer-key projection) | mitigate | `20260612000001_bigfive_itens.sql:200-212` `get_bigfive_itens()` SECURITY DEFINER projects only `(item_id, texto, ordem)`, `SET search_path=''`, REVOKE PUBLIC + GRANT authenticated |
| T-12-03 | Repudiation/compliance (LGPD-04 prompt) | mitigate | `forbidden-strings.grep.test.ts:166,186-189` targets `08-bigfive-devolutiva.md`; guard 16/16 GREEN |
| T-12-04 | Info Disclosure (answer-key exfiltration) | mitigate | `20260612000001_bigfive_itens.sql:55-60` RLS enabled, NO candidato SELECT policy; `dimensao/faceta/reverse_keyed` documented AS the scoring key; reader RPC is the only candidate path |
| T-12-05 | Tampering (client-sent score) | mitigate | `avaliacao-schemas.ts:135` `respostas: z.record(..., z.number().int().min(1).max(5))` — 1..5 enforced; `.strict()` has no score field |
| T-12-06 | Tampering (wrong reverse-key set) | mitigate | `bigfive-scoring.ts:35-46` REVERSED = 55 ids verbatim (N7/E6/O12/A17/C13); golden test pins raws + bands (`bigfive-scoring.test.ts` 11/11 GREEN; live seed cross-check: symmetric diff empty) |
| T-12-07 | Info Disclosure (scores_candidato leak to candidate) | mitigate | scores_candidato has NO candidate SELECT (Phase-11, confirmed live); `devolutivas_candidato` is the only candidate-facing row, own-row RLS `candidato_id = auth.uid()` (`20260612000002:51-53`) |
| T-12-08 | Elevation/Spoofing (submit EF auth) | mitigate | `submit-bigfive-final/index.ts:119-124` two-client D-23, `supabaseUser.auth.getUser()` → 401; service_role only after authorize; static SDK import (L38) |
| T-12-09 | Info Disclosure / IDOR (scoring another's candidatura) | mitigate | `submit-bigfive-final/index.ts:144-158` allowlist read of candidaturas → 403 if `candidato_id !== user.id` OR `etapa_atual !== 'avaliacao_assincrona'`, BEFORE any write |
| T-12-10 | Tampering (client-sent score) | mitigate | `submit-bigfive-final/index.ts:82-107` `validateBody()` mirrors `.strict` (rejects extra fields incl. `score`), exact 1..120 coverage; server-side re-score `score()` (L188) — client never sends a score |
| T-12-11 | Repudiation/compliance (auto-reject by trait — RNF-07a) | mitigate | `submit-bigfive-final/index.ts:197-208` status='sucesso' always; grep: ZERO `candidaturas` insert/update/upsert/delete + ZERO `pendente_humano`/`auto_reject`/`avancar_etapa` in either EF |
| T-12-12 | Info Disclosure (score in logs) | mitigate | `submit-bigfive-final/index.ts:238-246` log = ids/counts/status only (Pitfall 7); never raw respostas/score/percentil |
| T-12-13 | Repudiation/compliance (LGPD/CFP clinical language) | mitigate | `gerar-devolutiva-bigfive/index.ts:64-170` 25 curated CRP-safe BAND_TEMPLATES + IA personalize-only + word-count gate + fixed disclaimers; "Sensibilidade Emocional" (L69); LGPD-04 guard GREEN |
| T-12-14 | Tampering (devolutiva for wrong test — RF-19b) | mitigate | `gerar-devolutiva-bigfive/index.ts:350-356` refuse when `scoreRow.tipo !== 'big_five'` BEFORE any AI call or write (HTTP 422) |
| T-12-15 | Info Disclosure (IA invents social comparison) | mitigate | `gerar-devolutiva-bigfive/index.ts:287-321` `personalizeDim` polishes the official template only; graceful-degrade to raw template on word-count miss (never free-generates) |
| T-12-16 | Info Disclosure (prompt injection) | mitigate | `gerar-devolutiva-bigfive/index.ts:537-543` no candidate free text reaches the LLM (Likert-only); only dim label/percentil/official template; callAi injection-detect still runs in prod |
| T-12-17 | Info Disclosure (answer-key in questionnaire) | mitigate | `bigfiveService.ts:116-138` `getBigfiveItens()` calls `get_bigfive_itens` RPC (item_id/texto/ordem only); no dim/faceta/reverse reaches the client |
| T-12-18 | Tampering (client posts a score) | mitigate | `bigfiveSchema.ts:37-60` client body is the `.strict` twin (no score); `bigfiveService.ts:154-167` posts `buildSubmitBigfiveBody` output only; contract test GREEN |
| T-12-19 | Info Disclosure (score/PII via select('*')) | mitigate | `bigfiveService.ts:233` `loadDevolutiva` explicit allowlist (`id, candidatura_id, candidato_id, conteudo_jsonb, created_at`); `scoresRhService.ts:125-126` `SCORES_ALLOWLIST` constant — zero `select('*')` in either |
| T-12-20 | Info Disclosure (candidate sees a score during questionnaire) | mitigate | `BigFiveQuestionnaireScreen.tsx:287` progress is NEUTRAL `{n}/120` only; grep confirms no percentil/banda/score render in the questionnaire (only comments asserting the invariant) |
| T-12-21 | Repudiation/compliance (clinical label in candidate UI) | mitigate | `DevolutivaBigFiveView.tsx:37-43` + `ScorecardAvaliacao.tsx:223-229` "Sensibilidade Emocional" for N; grep `neuroticismo` = 0 across components + prompt; "Contextual · não-eliminatório" markers |
| T-12-22 | Tampering (42601 partial migration apply) | mitigate | Both migrations no-wrapper (D-22); applied via MCP `apply_migration` (bypasses 42601) per 12-06-SUMMARY; live PROD: 2 tables + reader present |
| T-12-23 | Info Disclosure (answer-key exposed post-apply) | mitigate | Live PROD smoke (12-06-SUMMARY + 12-VERIFICATION Management-API query): `get_bigfive_itens` SECURITY DEFINER projects (item_id,texto,ordem); seed 120/55 reverse_keyed; no candidate SELECT on bigfive_itens |
| T-12-24 | Elevation (EF deployed verify_jwt OFF) | mitigate | Live PROD: `submit-bigfive-final` + `gerar-devolutiva-bigfive` ACTIVE v5 JWT-on; anon curl → HTTP 401 (12-VERIFICATION behavioral spot-check) |
| T-12-25 | Info Disclosure (candidate reads scores_candidato) | mitigate | Live PROD pg_policies query (12-VERIFICATION): no candidate SELECT on scores_candidato/bigfive_itens; own-row + RH allowlist on devolutivas_candidato |
| T-12-26 | Repudiation/compliance (wrong prompt active) | mitigate (degrade-safe) | `gerar-devolutiva-bigfive/index.ts:503-517` `loadPrompt('bigfive_devolutiva')` with graceful inline fallback; activation flip deactivates priors of the same call_type. Curated prompt not yet is_active in PROD — EF degrades to a CRP-safe inline path (deferred to canonical sync; see Accepted/Deferred AR-12-06). No insecure state. |

**Closed: 26/26.**

---

## Accepted Risks Log

| ID | Threat | Disposition | Rationale |
|----|--------|-------------|-----------|
| AR-12-SC | T-12-SC (supply-chain — npm/deno installs) | accept | No new packages this phase. Both EFs reuse the pinned Phase-9/11 SDKs via STATIC top-level imports (`@supabase/supabase-js@2`, `zod@3.25.76`, `@anthropic-ai/sdk@0.102.0`, `openai@6.42.0`). The `.join("npm:")` dynamic-import anti-pattern that hid specifiers from the bundler (the recurring PROD-breaking class) was removed in `gerar-devolutiva-bigfive` (CR-01 fix) — both EFs now match `avaliar-redacao`. RESEARCH §Package Legitimacy: N/A. Accepted per plan disposition (appears in all 6 plan registers). |
| AR-12-06 | bigfive_devolutiva prompt not yet is_active in PROD | accept (deferred, non-security) | The curated D-lite prompt row is not yet in `prompt_versions` (new call_type; enum value added live in 12-06). `loadPrompt` throws → the EF degrades to a CRP-safe inline prompt (functional, not the curated template). This is a content-quality/go-live item, not an exploitable threat — no insecure state results. Activation deferred to the canonical `scripts/sync-prompts.ts` path, and is itself blocked by the CRP fill below. |
| AR-12-CRP | `CRP-XX/XXXXX` + `[Nome]` placeholders in the LGPD/CFP disclaimer | accept (compliance go-live blocker, non-exploitable) | Present in `08-bigfive-devolutiva.md:129`, `gerar-devolutiva-bigfive/index.ts:188`, `DevolutivaBigFiveView.tsx:65`. A legal/product input (the responsible psychologist's CRP registration), NOT a code defect or an attacker-reachable vulnerability. Must be filled before the devolutiva goes live / before the prompt is activated. Tracked as a go-live blocker, not a security-open threat. |
| AR-12-NORM | Big Five norm table is a V1 sex='N' adult fallback (not the full Johnson 2014 table) | accept | `bigfive-scoring.ts:78-110` — percentile precision is a V2/UAT refinement. Because Big Five is CONTEXTUAL and decides nothing (RNF-07a), an approximate percentile carries no eliminatory weight; no security impact. Documented in code with the source-file pointer for the V2 upgrade. |
| AR-12-SEED | Seed-text face-validity (IN-01 duplicate text items 6/36/91; IN-02 gendered forms) | accept (cosmetic, non-security) | Scoring is keyed by `item_id`/`faceta`, not text → no scoring corruption and no security impact. Candidate-facing face-validity only. Deferred per 12-VERIFICATION item 4. |
| AR-12-WR05 | `loadDevolutiva` ownership is RLS-primary (app-layer ownership assertion is defense-in-depth only) | accept | `bigfiveService.ts:233` now includes `candidato_id` in the allowlist (WR-05 fix) enabling belt-and-suspenders; primary defense remains the own-row RLS policy `candidato_id = auth.uid()` confirmed live. Acceptable given the verified live policy; a non-owner returns 0 rows. |

---

## Unregistered Flags

**None.** No `## Threat Flags` section was authored in any of the six 12-0N-SUMMARY
files. The executor recorded threat status inline (12-04 `## Threat Model Status`),
and every item there maps to an existing T-12-* id already in the register. No new
attack surface appeared during implementation without a threat mapping.

---

## Audit Notes

- **Recurring-class checks (project memory) — all clean:**
  - *EF authenticate ≠ authorize (IDOR/PII):* `submit-bigfive-final` authorizes
    ownership + etapa BEFORE any service_role write (T-12-08/09). `gerar-devolutiva-bigfive`
    is internally invoked (service_role) and gated by the RF-19b type precondition
    before any AI/write (T-12-14); it reads `candidaturas` only to resolve the owner.
  - *select('*') PII leak:* both client services use explicit allowlists; the
    candidate item read and devolutiva read are answer-key-/own-row-safe (T-12-17/19).
  - *answer-key exposure:* base tables have NO candidate SELECT; the only candidate
    path is the projecting SECURITY DEFINER reader (T-12-02/04/23) — confirmed live.
  - *RNF-07a (no auto-reject on a Big Five score):* verified by grep + read — no write
    path from any trait value to a `candidaturas` decision exists in either EF or the
    two migrations (T-12-11; reinforced by the pure-math scorer).
- **Audited against the FIXED code:** the CR-01 dynamic-import, CR-02 missing
  `candidato_id`/phantom `score_id`, CR-03 missing `.select()`, CR-04 insert-vs-upsert,
  and CR-05 fabricated `dev-1` id defects are all confirmed repaired in the current
  source and both EFs redeployed PROD v5 (12-VERIFICATION). These were correctness/
  availability defects in the devolutiva chain — none of them weakened a declared
  security mitigation; the answer-key, IDOR, RNF-07a, and PII-allowlist invariants
  held even in the pre-fix state.
- **Live PROD evidence** for the apply-wave threats (T-12-22..26) comes from the
  12-06-SUMMARY apply log and the 12-VERIFICATION Management-API behavioral checks
  (seed 120/55, pg_policies, schema nullability, RPC projection, EF JWT-on 401,
  EF deploy v5 ACTIVE) — not from documentation/intent alone.

---

_Audited: 2026-06-23 · gsd-security-auditor · ASVS L2 · register authored at plan time (mitigation-presence verification)_
