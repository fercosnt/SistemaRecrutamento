# Plan 23-06 SUMMARY — redeploy 9 EFs (bundle-freeze) + verify_jwt drift-guard

**Plan:** 23-06 (Wave 4, [BLOCKING] non-autonomous — PROD redeploy)
**Status:** 9 EFs redeployed via `supabase functions deploy` (CLI, authorized by Fernando) + verify_jwt preserved + boot smoke green
**Mechanism:** Supabase CLI 2.105.0 (auto-bundles `_shared`), project `isljnozzlvckrgjjbjwp`. Not MCP `deploy_edge_function` (which would require uploading every `_shared` file manually).

## Task 1 — redeploy + verify_jwt drift-guard (checker WR-03)

**verify_jwt BEFORE → AFTER (all 9 preserved, no drift):**

| EF | verify_jwt | version before→after |
|----|-----------|---------------------|
| cost-alerter | false → false (--no-verify-jwt) | 7→8 |
| analise-candidato-individual | false → false (--no-verify-jwt) | 11→12 |
| comparativo-candidatos | true → true | 14→15 |
| avaliar-redacao | true → true | 7→8 |
| avaliar-redacao-cultural | true → true | 3→4 |
| avaliar-transcricao-entrevista | true → true | 3→4 |
| gerar-guia-entrevista | true → true | 5→6 |
| gerar-devolutiva-bigfive | true → true | 9→10 |
| consolidar-decisao-final | true → true | 4→5 |

All `ezbr_sha256` bundle hashes changed → fresh bundles carrying the merged `_shared` code (23-01 sharedBreaker/timeout/replay/parseIntEnv, 23-02 SCHEMA_VERSIONS realign + narrowed catch + emitPromptStubAlert + transcricao 60s, 23-03 kill-switch + cost-alerter messages). No verify_jwt/authz change (Phase 24 owns that). `submit-bigfive-final` NOT redeployed (it's a caller, not an ai-client consumer).

**Static imports:** `grep -rn 'import(\[' supabase/functions` → 4 matches, ALL in doc-COMMENTS explaining the historical `.join("npm:")` bug + its fix — **zero actual dynamic-join imports in code**. The booting EFs confirm static `npm:` imports resolve.

## Task 2 — boot smoke (no-auth curl → structured 401, not 500/module-error)
- `gerar-devolutiva-bigfive` → 401 `UNAUTHORIZED_NO_AUTH_HEADER` (verify_jwt) — boots ✓
- `avaliar-transcricao-entrevista` → 401 — boots ✓
- `analise-candidato-individual` → 401 `UNAUTHORIZED` (own Bearer self-auth, verify_jwt=false) — boots ✓

The new bundles boot cleanly (no ERR_MODULE_NOT_FOUND, no 500 crash), proving the merged `_shared` code loads.

## Deferred to HUMAN-UAT (live-invocation smoke)
The full live smoke — actually invoking each of the 5 previously-stub call_types against the seed candidatura and confirming `ai_call_logs` records the **real semver** (not a 0.0.0 stub / 500), plus `bigfive_devolutiva` resolving the real prompt live — needs the seed candidatura (`candidato.funil@teste.com` / candidatura `a1dd4c42`) + JWT orchestration (gotrue /token → curl EFs). Deferred to `23-HUMAN-UAT.md` (same pattern as Phase 22's deferred live checks). With `ai_call_logs.prompt_version` now added (23-05), the next real invocation will log successfully (the table was 0-rows before).

## Requirements now LIVE (post-redeploy)
- **AI-01**: the 7 call_types run the real prompt-library prompt (SCHEMA_VERSIONS realigned + narrowed catch live); `bigfive_devolutiva` row exists + EF redeployed.
- **AI-04**: avaliar-transcricao-entrevista 60s timeout override live.
- **AI-06**: cost kill-switch + RAISE-WARNING trigger live; `ai_call_logs.prompt_version` unblocks the cost data.
- **UX-07/UX-09**: consolidar-decisao-final (triagem-out + ≥2-stage gate) live; devolutiva band-only prompt live.
