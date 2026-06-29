---
phase: 18
slug: resili-ncia-das-efs-de-ia-bugs-do-funil
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-29
---

# Phase 18 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Phase 18 = Resiliência das EFs de IA & Bugs do Funil (RESIL-01/02/03, FIX-01/02).
> Register authored at plan time (7 `<threat_model>` blocks across 18-01..18-07-PLAN.md).
> This audit VERIFIES each declared mitigation against the implemented code — no net-new scan.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| AI EF → Anthropic/OpenAI provider | Outbound provider call; an overloaded/slow provider must not hang the EF past its 150s idle ceiling | Masked prompt input; no raw PII (maskPII upstream) |
| AI EF → caller (client) | On exhaustion the EF surfaces a structured `error_code` only (e.g. `{error_code:'AI_UNAVAILABLE'}`) | Code-only error contract; no stack/PII |
| bigfive EF → Anthropic (×5 concurrent) | 5 concurrent provider calls per devolutiva; must stay within isolate/exec limits and not violate RNF-07a on failure | Per-dim band template fallback; no decisional write |
| consolidar EF (deterministic) → decisao record | Read-only aggregation must never auto-decide (RNF-07a); NO-LLM | Read-only score aggregation (zero DB writes) |
| RH client → consolidar/comparativo EF | Privileged read; service_role bypasses RLS → EF must authenticate THEN authorize (role + ownership) | RH JWT; vaga ownership via `vagas.created_by` |
| EF response body → service → `<AsyncState>` component | Service translates transport→domain error; must surface only a code, never raw error/PII | `error_code` string only (ASVS V7) |
| local EF code → PROD deployed bundle | A partial/stale `_shared` deploy leaves some EFs hanging or running pre-Phase-18 authz | EF bundle (human-gated PROD deploy) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-18-01-DoS | Denial of Service | `callAi` retry composition | mitigate | `maxRetries:0` on BOTH provider calls (`ai-client.ts:369` Anthropic, `:470` OpenAI fallback) + per-call `timeout: AI_CALL_TIMEOUT_MS` (`:368`, `:469`); hand-rolled `while (attempt < MAX_ATTEMPTS)` loop (`:349`) is the SOLE retry owner → no 3×3=9 amplification, no 60-min dynamic-timeout hang. | closed |
| T-18-01-DoS2 | Denial of Service | env `MAX_ATTEMPTS` | accept | `MAX_ATTEMPTS` env-configurable but operator-controlled (`ai-client.ts:70`, default-guard `?? "3"`); not request-controlled. Default 3 is bounded. → AR-18-01. | closed |
| T-18-01-ID | Information Disclosure | provider error surfaced to caller | mitigate | Exhaustion path throws a wrapped string message (`ai-client.ts:477`) with no PII; `callAi` returns only `error_code` on result; the 503 body shape is set per-EF. No raw provider error echoed. | closed |
| T-18-01-T | Tampering | retry/degrade path writing a score | mitigate | Task touches only provider-call options; `callAi` writes nothing to `candidaturas`. RNF-07a preserved. | closed |
| T-18-02-DoS | Denial of Service | 5-way parallel provider fan-out | accept | `Promise.allSettled` over 5 dims (`gerar-devolutiva-bigfive/index.ts:397`), 1 attempt each (`:316`); per-call timeout (Plan 01) bounds each; within isolate/exec limits (RESEARCH budget proof). Concurrency-cap-2 is a documented fallback lever, not needed now. → AR-18-02. | closed |
| T-18-02-T | Tampering | per-dim degrade path | mitigate | Degrade returns deterministic `BAND_TEMPLATES` text (`:424-434`); writes only to `devolutivas_candidato` (`:458`), never `candidaturas`. `personalizeDim` never throws. RNF-07a preserved. | closed |
| T-18-02-ID | Information Disclosure | EF logs / error body | mitigate | Logs redacted to ids/counts/status only (`:482-489`); no raw provider error or PII echoed. | closed |
| T-18-02-EoP | Elevation of Privilege | serve-wrapper authz | mitigate | RF-19b `tipo !== 'big_five'` refuse (`:357`), LGPD attribution (candidato_id/vaga_id `:403-405`), service_role precondition read untouched by handler-internals refactor. ASVS V4 preserved. | closed |
| T-18-03-T | Tampering | consolidar consolidado | mitigate | `normalizeSjtComposite` body byte-unchanged (`consolidar-decisao-final/index.ts:173-182`); consolidar is NO-LLM (no callAi/anthropic/openai/AI-EF invoke present) and performs ZERO DB writes (no insert/update/upsert/delete). RNF-07a preserved. | closed |
| T-18-03-ID | Information Disclosure | avaliacaoService perguntas read | mitigate | Read keeps explicit column allowlist (`id,cargo,cenario,formato,tempo_est_min,rubric,status`); no `select('*')` in any of the 4 services (grep confirms only allowlist-doc comments). | closed |
| T-18-03-V | Validation (coverage) | regression coverage gap | mitigate | FIX-01 (`normalizeSjtComposite` exported + 2 Deno cases) and FIX-02 (`avaliacaoService` `.eq('status','active')` Vitest) close the Nyquist gap so a future edit can't silently regress the sentinel/aggregation. | closed |
| T-18-04-ID | Information Disclosure | `<AsyncState>` error rendering | mitigate | Error state renders ONLY static verbatim PT-BR copy keyed off `errorCode` string (`AsyncState.tsx:174-203`, `COPY` const `:56-76`); component has NO `error` prop — it cannot parse/echo raw Supabase/transport error, stack, or PII. | closed |
| T-18-04-ID2 | Information Disclosure | `errorCode` prop | accept | `errorCode` carries only a code like `AI_UNAVAILABLE` (set by service layer extracting only the body's `error_code`). Low-sensitivity; no PII by contract. → AR-18-03. | closed |
| T-18-04-T | Tampering | retry action | mitigate | Retry re-runs a read/invoke (non-destructive); `disabled={retrying}` (`AsyncState.tsx:186`) prevents double-submit; retry rendered in error state only. No write to candidaturas. | closed |
| T-18-05-ID | Information Disclosure | `extractEfErrorCode` | mitigate | Helper returns ONLY the string `error_code` (or undefined) and discards the rest of the body (`efErrors.ts:38-68`); no stack/message/PII surfaced. NEVER throws (try/catch degrades `:56`). ASVS V7. | closed |
| T-18-05-ID2 | Information Disclosure | `*ServiceError` details | mitigate | Thrown error carries `error_code` in `details` (`decisaoService.ts:106`, `avaliacaoService.ts:327`); the static PT-BR `message` is what surfaces; screens pass only the code to `<AsyncState>` — raw `error` in details is never rendered candidate-facing. | closed |
| T-18-05-ID3 | Information Disclosure | service reads | mitigate | No read query / allowlist modified; no `select('*')` introduced in any of the 4 services (grep-confirmed). | closed |
| T-18-05-T | Tampering | service write paths | mitigate | Plan touches only error-handling after `invoke`; writes nothing to candidaturas. MIXED_VAGA preserved (`triagemService.ts:269-272`); NO-LLM consolidar `data.ok===false` branch preserved (`decisaoService.ts:113`). RNF-07a unaffected. | closed |
| T-18-06-ID | Information Disclosure | candidate AI screens error rendering | mitigate | All 5 screens pass only `errorCode` string (`errorCodeOf(error)` / `errorCode`) into `<AsyncState>` (ConsolidacaoDashboard:113, SjtCasoAbertoScreen:190, RedacaoEditorScreen:246, BigFiveQuestionnaireScreen:385, ComparativoScreen:137); wrapper renders static copy. No raw error/stack/PII reaches the candidate. ASVS V7. | closed |
| T-18-06-T | Tampering | retry action | mitigate | Retry re-runs a read/invoke (non-destructive); `<AsyncState>` disables it while retrying. No write to candidaturas; RNF-07a unaffected. | closed |
| T-18-06-T2 | Tampering | ComparativoScreen MIXED_VAGA | mitigate | MIXED_VAGA error path preserved through the `<AsyncState>` adoption (errorCode threaded from `invokeComparativo`); not collapsed into a generic error. | closed |
| T-18-07-DoS | Denial of Service | partial redeploy | mitigate | All 7 callAi-importing EFs + consolidar redeployed to PROD (18-07-SUMMARY: 8 EFs version-bumped, fresh `ezbr_sha256` API-confirmed); no stale `_shared` bundle keeps the 60-min hang. | closed |
| T-18-07-T | Tampering | EF deploy bundle | mitigate | Static `npm:` imports preserved across all 7 EFs (grep: no `await import(...)` constructed specifier — every `.join`/dynamic-import match is in comments; 5-6 static external imports each). No `ERR_MODULE_NOT_FOUND` regression. | closed |
| T-18-07-EoP | Elevation of Privilege | serve-wrapper authz on redeploy | mitigate | Two-client authenticate-THEN-authorize preserved on privileged EFs (consolidar: `auth.getUser`→`usuarios_rh` role→`vagas.created_by` ownership; comparativo skeleton clone). `verify_jwt` posture preserved on all 8 (18-07-SUMMARY). ASVS V4. | closed |
| T-18-07-ID | Information Disclosure | new env vars | accept | `AI_CALL_TIMEOUT_MS`/`MAX_ATTEMPTS` are non-secret ops tunables with safe defaults; absence is safe (code default-guards). No secret exposure. → AR-18-04. | closed |
| T-18-SC | Tampering (supply-chain) | npm/Deno imports | mitigate | No package added in any plan (01-07); all `npm:` imports STATIC (Pitfall 7). No install → no slopcheck gate triggered (RESEARCH Package Legitimacy Audit: N/A). Declared identically in plans 01-06 + as T-18-07-SC. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-18-01 | T-18-01-DoS2 | `MAX_ATTEMPTS` is operator-controlled (env), not request-controlled; a misconfig is an ops concern, not an external DoS vector. Default 3 is bounded and default-guarded (absence in PROD is safe). | Phase 18 plan author | 2026-06-29 |
| AR-18-02 | T-18-02-DoS | 5 small concurrent provider calls per a single candidate's devolutiva, bounded by the per-call timeout (Plan 01) and within the 256MB isolate + 150s/400s exec limits (RESEARCH budget proof). Concurrency-cap-2 is a documented fallback lever if PROD shows 429 clustering — not needed now. | Phase 18 plan author | 2026-06-29 |
| AR-18-03 | T-18-04-ID2 | `errorCode` carries only a low-sensitivity domain code (e.g. `AI_UNAVAILABLE`) extracted by the service layer; no PII by contract. | Phase 18 plan author | 2026-06-29 |
| AR-18-04 | T-18-07-ID | `AI_CALL_TIMEOUT_MS`/`MAX_ATTEMPTS` are non-secret ops tunables with safe code defaults; their absence is safe and they expose no secret. | Phase 18 plan author | 2026-06-29 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags

None. The SUMMARY `## Threat Flags` sections (18-01..18-07) all report no new
security-relevant surface (no new network endpoint, auth path, file access, or
schema). Phase 18 is hardening/consolidation: changes are internal to handler
fan-out, a presentational wrapper, a code-only error extractor, regression tests,
and an EF redeploy — no new attack surface introduced. No unmapped flag found.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-29 | 25 | 25 | 0 | gsd-security-auditor |

Note: 25 = 24 distinct threat IDs + the supply-chain class (`T-18-SC` declared in
plans 01-06 and re-stated as `T-18-07-SC`), verified once as a single class.

### Verification highlights (code-confirmed, not documentation-trusted)
- **RESIL-01 retry-amplification bound** — `maxRetries:0` present on BOTH provider calls (`ai-client.ts:369`, `:470`); the env-configurable hand-rolled loop (`:349`) is the sole retry owner. No 3×3=9 amplification.
- **RESIL-03 LGPD surface** — `extractEfErrorCode` (`efErrors.ts`) is code-only and never throws; `<AsyncState>` has no `error` prop and renders only static copy keyed off the `errorCode` string. No raw error/PII reaches the candidate-facing client across all 5 screens.
- **RNF-07a** — `consolidar-decisao-final` is NO-LLM and performs ZERO DB writes; the bigfive degrade path writes only band templates to `devolutivas_candidato`, never `candidaturas`.
- **authenticate-THEN-authorize** — preserved on consolidar (getUser → usuarios_rh role → vagas.created_by ownership) and comparativo.
- **Static npm: imports** — no dynamic `await import(...)` constructed-specifier regression in any of the 7 redeployed EFs (matches are all comments).
- **Review cross-check** — the two highest-value code-review warnings touching these threats were already FIXED in source: WR-01 (bigfive `idempotency_key` threaded, `index.ts:590` — cost-replay path for T-18-02) and WR-03 (`extractEfErrorCode` reads `error.context` first — T-18-05 fidelity). Remaining review findings (WR-02/04/05/06, IN-01..05) are robustness/UX, not declared-threat mitigation gaps.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (AR-18-01..04)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-29
