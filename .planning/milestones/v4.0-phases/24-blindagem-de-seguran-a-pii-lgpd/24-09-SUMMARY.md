# Plan 24-09 Summary — Edge Function Redeploys (SEC-04, UX-08)

**Status:** ✅ Complete (1 live check deferred to HUMAN-UAT)
**Wave:** 4 (BLOCKING · non-autonomous · EF redeploy to PROD)
**Completed:** 2026-07-09 (orchestrator-run inline via `supabase functions deploy`)
**Requirements:** SEC-04, UX-08

## What was done

Redeployed the two Edge Functions whose PROD behavior changed (bundle-freeze: the 24-05/24-07 source edits were inert until redeploy). Both `verify_jwt=true` preserved.

- **`gerar-devolutiva-bigfive` v11 → v12** — the SEC-04 Bearer self-auth guard (`guardDevolutivaBearer`, `DEVOLUTIVA_INVOKE_SECRET ?? SERVICE_KEY`) is now LIVE. Live smoke: no-Bearer POST → **401**, wrong-Bearer → **401**. IDOR closed.
- **`submit-bigfive-final` v6 → v7** — now bundles the 116 active-set `validateBody` + the O ×6/5-prorate scorer. **This redeploy also fixed a live outage**: `get_edge_function` proved the deployed v6 still ran the OLD 120-item bundle, so after 24-08 made `get_bigfive_itens()`=116 the candidate submit was 400ing (116 ≠ 120) until v7 landed.

## Notable finding

The deployed-vs-local diff (`reference_ef_shared_bundle_freeze`) caught that Wave-3's DB change had opened a **transient PROD break** in the Big-Five submit — closed by this Wave-4 redeploy. Exactly the Wave-3→Wave-4 ordering the plan mandated.

## Deferred
- **UX-08 live 116-item candidate submit → 200** — HUMAN-UAT (`24-HUMAN-UAT.md`). `verify_jwt=true` 401s a raw curl at the gateway before `validateBody`, so a true end-to-end submit needs a real candidate session in etapa `avaliacao_assincrona`. Deploy landing is proven (v7, script-size change, deno 10/10 incl. 116-active + 120-rejection, DB=116).
- **submit-candidatura redundant n8n env-var fire** — no active double-fire today (SEC-03 trigger graceful-skips until the Vault secret is set); drop it when the Vault secret is created. → `deferred-items.md`.

## key-files
- modified (PROD): `supabase/functions/submit-bigfive-final` (v7), `supabase/functions/gerar-devolutiva-bigfive` (v12)
- appended: `24-PROD-LANDING.md` (Wave 4 section)

## Self-Check: PASSED
- Both EFs redeployed (versions bumped); SEC-04 live 401/401 PASS; UX-08 bundle landed (v7); verify_jwt unchanged; RNF-07a preserved (submit writes only scores_candidato). One live candidate-submit check deferred to HUMAN-UAT.
