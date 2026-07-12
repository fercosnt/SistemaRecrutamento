---
phase: 27
plan: "06"
wave: 4
status: complete
requirements: [CI-07, CI-13]
autonomous: false
completed: 2026-07-12
---

# 27-06 SUMMARY — [BLOCKING] EF redeploys + verify_jwt live smoke (CI-07, CI-13)

Executed orchestrator-led via `supabase functions deploy` (CLI authenticated; bundles `_shared` + reads config.toml `import_map = ./functions/deno.json`). Mirrors the Phase 24-09 redeploy-BLOCKING precedent.

## Task 1 — CI-07: redeploy the 5 shared-`zod` EFs ✅
- **Canary first (A2 de-risk):** redeployed `avaliar-redacao-cultural` (script 2.97MB) → no-auth curl **401** (< 500 → booted, bare-`zod` resolved at runtime via the deno.json import map; no ERR_MODULE / import-500). The CLI printed "Specifying import_map through flags is no longer supported. Please use deno.json instead." — confirming it read the config.toml→deno.json map (informational, not an error).
- Redeployed the remaining 4: `submit-candidatura`, `avaliar-transcricao-entrevista`, `gerar-guia-entrevista`, `consolidar-decisao-final` — all "Deployed Functions" success. No EF outside the 5-set touched.
- These deploys also land the **27-03 submit-candidatura handler refactor** (testable `handler(req,deps)`, byte-equivalent per its Deno test) live.

## Task 2 — CI-13: live verify_jwt posture matches config.toml ✅
No-auth curl to each invoke URL:
- **5 jwt-on EFs → HTTP 401** (submit-candidatura, avaliar-redacao-cultural, avaliar-transcricao-entrevista, gerar-guia-entrevista, consolidar-decisao-final): verify_jwt still ON after redeploy — no silent flip / auth hole (#4059 guard).
- **3 Bearer-self-auth EFs → handled 4xx, reachable** (verify_jwt=false, NOT redeployed this phase — posture unchanged from Phase 24 SEC-04): `analise-candidato-individual` 405, `cost-alerter` 405 (own guards → booted, definitively NOT platform-gated since a verify_jwt=true EF can only 401), `gerar-devolutiva-bigfive` 401 (its own guardDevolutivaBearer). None flipped to jwt-on; server-to-server preserved.
- Live posture == the 12-function declaration in `supabase/config.toml`. No divergence to reconcile.

## Files
- files_modified: [] (deploy-only; no repo changes). Live PROD: 5 EFs redeployed.

## Gates
CI-07 live (bare-`zod` resolves on all 5) · CI-13 live posture confirmed (5×401 / 405,405,401) · no auth hole, no broken server-to-server path · RNF-07a unaffected.
