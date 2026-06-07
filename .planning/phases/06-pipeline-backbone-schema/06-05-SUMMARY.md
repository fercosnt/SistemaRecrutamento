---
phase: 06-pipeline-backbone-schema
plan: 05
status: complete
requirements: [FUNIL-04, LGPD-02]
completed: 2026-06-07
applied_via: Supabase MCP (execute_sql)
---

# 06-05 SUMMARY — M2 backbone RLS bundle

## What was built
FUNIL-04 RLS on candidaturas + historico_candidatura using live-verified identifiers:
- `candidato_le_propria_candidatura` (SELECT, user_id = auth.uid())
- `rh_le_candidaturas` (SELECT, JWT app_metadata.role IN rh/administrador)
- `rh_avanca_etapa` (UPDATE) — D-08 direct-UPDATE advance path
- `candidato_le_proprio_historico` + `rh_le_historico` (SELECT)
No INSERT policy on historico (trigger is the sole writer — SECURITY DEFINER per 06-04 fix).

## Findings (non-blocking)
- **F-06-RASCUNHO:** candidaturas already had pre-existing M1 UPDATE policies — `"RH atualiza
  candidaturas"` (usuarios_rh) and `"Candidato atualiza rascunhos"` (is_rascunho=true). RESEARCH
  Open-Q3 ("no existing UPDATE policy") was wrong. `rh_avanca_etapa` is additive/harmless. Residual:
  candidato can change etapa on own draft (scoped to drafts, trigger audits); submitted candidaturas
  correctly candidato-UPDATE-denied.
- Advisor: `avancar_etapa()` SECURITY DEFINER was flagged executable by anon/authenticated → hardened
  with REVOKE ALL FROM PUBLIC (trigger still fires). Pre-existing advisor debt (21 security_definer_view
  ERRORs, rls_policy_always_true on M1 tables) is out of scope for this phase.

## Key files
- created: `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql`
- updated: `.planning/phases/06-pipeline-backbone-schema/06-SQL-SMOKE-RUNBOOK.md` (results + frontmatter)
- regenerated: `database.types.ts`

## Verification (FUNIL-04 §E / LGPD-02 §F)
- rowsecurity true on all 4 M2 tables. Real-JWT: candidato isolated (sees own only), RH sees all (6),
  candidato UPDATE on submitted denied, RH UPDATE allowed (trigger fired, ator=RH uid).
- LGPD-02 audit = 0; client decisao_final INSERT rejected. `npm run test:run` = 358/358, 0 regressions.

## Self-Check: PASSED