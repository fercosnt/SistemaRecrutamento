---
phase: 33-camada-de-dados-do-agendamento-de-entrevista
plan: 02
status: complete
wave: 2
requirements: [AGEND-01, SEG-03]
completed: 2026-07-16
---

# 33-02 SUMMARY — bidirectional RLS + candidate DEFINER RPC + 8-assertion smoke (RED)

## What was built

Appended the security layer to `supabase/migrations/20260716000001_agendamentos_entrevista.sql`
and authored the load-bearing SEG-03 behavioral smoke (RED pre-apply — 33-03 turns it GREEN).

**RLS (RH):** `ENABLE ROW LEVEL SECURITY` + EXACTLY ONE policy `rh_gerencia_agendamento`
(`FOR ALL TO authenticated`) whose USING **and** WITH CHECK are the **WR-04 join-through-candidaturas**
predicate copied verbatim from `rh_le_historico` (admin bypass OR `rh` AND
`candidatura_id IN (candidaturas JOIN vagas WHERE created_by=(select auth.uid()))`). The
spoofable direct `vaga_id IN (SELECT id FROM public.vagas …)` form is **absent** (Pitfall 1;
grep-gated out, hardened to also reject `SELECT id FROM public.vagas WHERE created_by` and
`vaga_id = ANY`). **No candidate SELECT/write policy exists** → column isolation by construction.

**Candidate read (`get_meu_agendamento`):** `SECURITY DEFINER SET search_path=''` RPC cloning
`get_minha_redacao`. Returns a **7-column allowlist** (id, candidatura_id, tipo, data_hora,
local_ou_link, status, compareceu) — `observacoes_rh`/`entrevistador`/`agendado_por`/`updated_by`/`vaga_id`
are physically absent from the signature. Ownership enforced INSIDE via
`candidaturas→candidatos WHERE ca.user_id = auth.uid()`; `deleted_at IS NULL` (cancelada stays
visible). `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated`.

**Smoke (`supabase/tests/seg33_agendamento_smokes.sql`):** 8 JWT-impersonated assertions (a–h),
disposable `33010033-*` namespace, real-user fixture (2 real 0-vaga `usuarios_rh` A/B + real
candidato + a 2nd real user for (g), with a non-owning-user fallback; `vagas.created_by` FK
respected — no synthetic UUIDs). (b) owner write+read; (a) cross-recruiter read deny; (c)
spoofed-vaga_id INSERT deny (42501); (d) admin bypass; (e) candidate direct base-table deny;
(f) candidate RPC allow (allowlist); (g) cross-candidate RPC deny; (h) candidate write deny.
GREEN gate = all 8 `PASS` NOTICEs (Pitfall 2).

## Verification
- grep gates `RLS_OK` + `RPC_OK` + `SMOKE_OK` all PASS (after rewording two migration COMMENT
  false-positives — prose lines that put "RETURNS TABLE"/"CREATE TYPE" next to excluded col names).
- Exactly 1 `CREATE POLICY`; excluded cols absent from the RPC signature; distinct disposable
  namespace (0 seg32 collisions).
- `authenticated` holds table privileges via Supabase default privileges (verified live on
  `candidaturas`) → the new table auto-grants; no explicit table GRANT needed; RLS is the gate
  (anon has no policy → denied).
- Smoke is **RED pre-apply** by design (objects absent → fixture SKIP) until 33-03 applies.

## Key files
- modified: `supabase/migrations/20260716000001_agendamentos_entrevista.sql` (RLS + RPC section)
- created:  `supabase/tests/seg33_agendamento_smokes.sql` (8 assertions)
- modified: `.planning/phases/33-.../33-VALIDATION.md` (wave_0_complete → true; smoke authored)

## Notes / deviations
- Plan-check Warning 1 honored: assertion (c)'s documented purpose corrected (denied by BOTH the
  join-through WITH CHECK and the 33-01 trigger; the AUTHORITATIVE predicate-choice guard is the
  hardened static grep, not (c)). The PROD-unsafe DISABLE-TRIGGER alternative was rejected.
- (g) uses a 2nd real candidato when one exists, else falls back to recruiter A's user_id — either
  way it proves a non-owning user gets 0 rows via the DEFINER ownership join.

## Self-Check: PASSED
