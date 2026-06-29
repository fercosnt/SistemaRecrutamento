# Plan 18-07 Summary — [BLOCKING] PROD EF Redeploy

**Plan:** 18-07
**Requirements:** RESIL-01, RESIL-02, FIX-01 (runtime activation)
**Status:** Complete
**Completed:** 2026-06-29
**Mode:** Human-gated PROD deploy (autonomous: false) — user ran `supabase functions deploy` via CLI (auto-bundles `_shared`)

## Objective

Ship the Phase 18 code changes to PROD by redeploying every Edge Function whose
frozen `_shared/ai-client.ts` bundle predates the RESIL-01 timeout change, plus
`gerar-devolutiva-bigfive` (RESIL-02) and `consolidar-decisao-final` (FIX-01).
Until each EF is redeployed it keeps its stale `_shared` bundle and still hangs
(Deno bundle-freeze, RESEARCH Pitfall 6).

## What shipped

### Task 1 — Enumerate redeploy set (autonomous)
`grep -rl "callAi" supabase/functions/*/index.ts` → 7 EFs import the shared helper:
analise-candidato-individual, avaliar-redacao, avaliar-redacao-cultural,
avaliar-transcricao-entrevista, comparativo-candidatos, gerar-devolutiva-bigfive,
gerar-guia-entrevista. Plus `consolidar-decisao-final` (FIX-01 verify/redeploy) = **8 EFs**.

### Task 2 — Redeploy to PROD (human-gated)
User executed `supabase functions deploy <name>` for all 8 (CLI 2.105.0, linked
project `isljnozzlvckrgjjbjwp`). The 2 public functions deployed with
`--no-verify-jwt` to preserve their posture; the rest kept JWT ON.

Verified via Supabase Management API (`list_edge_functions`) — all 8 bumped a
version with a fresh `ezbr_sha256` (new bundle) and `verify_jwt` preserved:

| EF | Version | verify_jwt |
|----|---------|-----------|
| analise-candidato-individual | v10→v11 | false |
| comparativo-candidatos | v13→v14 | false |
| avaliar-redacao | v6→v7 | true |
| avaliar-redacao-cultural | v2→v3 | true |
| avaliar-transcricao-entrevista | v2→v3 | true |
| gerar-devolutiva-bigfive | v6→v7 | true |
| gerar-guia-entrevista | v1→v2 | true |
| consolidar-decisao-final | v2→v3 | true |

## Verification

- All 8 EFs `ACTIVE` with new bundle hashes + version bumps (API-confirmed).
- `verify_jwt` posture preserved on every function (2 public, 6 JWT-ON).
- No code committed by this plan (deploy-only); working tree unaffected.

## Deviations

None. Deploy path was the project-precedent CLI (auto-bundles `_shared`), chosen
by the user over MCP per-EF bundling.

## Deferred

- **Live round-trip verification** under real Anthropic latency/overload (RESIL-01/02
  behavior visible end-to-end; consolidar FIX-01 with a real `work_sample_sjt='na'`
  candidatura) → **Phase 21** (PROD-01/02 live UATs), per CONTEXT Área 3 + RESEARCH
  Manual-Only Verifications. This plan ships the code to PROD; Phase 21 proves it live.

## Key files

- No source files modified (deploy-only plan).
- PROD state: 8 Edge Functions redeployed (versions above).
