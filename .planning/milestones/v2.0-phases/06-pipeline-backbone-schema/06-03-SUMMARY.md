---
phase: 06-pipeline-backbone-schema
plan: 03
status: complete
requirements: [LGPD-02, FUNIL-04]
completed: 2026-06-07
applied_via: Supabase MCP (execute_sql)
---

# 06-03 SUMMARY — decisao_final + bias_audit_log

## What was built
- `decisao_final` created COMPLETE (D-02): `por_usuario uuid NOT NULL` (LGPD-02 guardrail),
  `justificativa CHECK length>=50`, `decisao` enum (aprovado/rejeitado/em_espera), unique
  candidatura_id, LGPD Art. 20 columns. RLS: client INSERT `WITH CHECK (false)`, RH/admin SELECT,
  candidato-own SELECT.
- `bias_audit_log` schema-only placeholder (LGPD-03 snapshot deferred to Phase 15), admin-only SELECT.

## Key files
- created: `supabase/migrations/20260607000003_decisao_final.sql`
- created: `supabase/migrations/20260607000004_bias_audit_log.sql`

## Verification (LGPD-02 §F)
- `SELECT count(*) FROM decisao_final WHERE por_usuario IS NULL` = 0.
- Client (candidato-JWT) INSERT into decisao_final rejected by WITH CHECK (false).
- rowsecurity true on both tables; correct identifiers (user_id, 'administrador', no 'admin'/auth_user_id).

## Self-Check: PASSED