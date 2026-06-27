---
phase: 15-decis-o-final-audit-vel-lgpd-art-20
plan: 07
wave: 4
status: complete
gap_closure: true
requirements: [DECISAO-03, DECISAO-04, LGPD-03]
completed: 2026-06-26
key-files:
  created:
    - supabase/migrations/20260625100002_decisao_final_rh_vaga_scope.sql
  modified:
    - src/features/admin/bias-audit/biasMath.ts
    - src/features/admin/bias-audit/__tests__/biasMath.test.ts
    - src/features/admin/bias-audit/components/BiasAuditPage.tsx
    - src/features/admin/bias-audit/services/biasAuditService.ts
    - src/features/decisao/services/decisaoService.ts
    - src/features/explicacao/services/explicacaoService.ts
    - src/features/explicacao/hooks/useExplicacao.ts
    - src/features/explicacao/services/__tests__/explicacaoService.test.ts
---

# 15-07 SUMMARY — Phase-15 code-review gap closure (WR-01..WR-05)

Closes the five WARNINGs from `15-REVIEW.md`: the silent bias-footnote field bug, the drifted parity oracle, the RH cross-vaga confidentiality gap, the stale provenance JSDoc, and the misleading retry toast on the revision RPC.

## What landed

### Task 1 — client warnings (commit `dd89256`)

- **WR-01 (silent display bug):** the `gerar_bias_snapshot` SQL writes the excluded-no-birthdate count under the pt-BR key `excluidos_sem_data` (migration `20260625100001:420`), but `BiasAuditPage` read the English key `excluded_sem_data` → the Pitfall-4 honesty footnote NEVER rendered. Fixed: the page now reads `snapshot.dados.excluidos_sem_data`; the `biasMath` type field (`AdverseImpactResult` / `ComputeOptions`) renamed `excluded_sem_data → excluidos_sem_data` so the type matches the persisted jsonb.
- **WR-02 (drifted oracle):** `biasMath.ts` has ZERO non-test production callers — the live scorer is the SQL RPC; the page renders SQL jsonb directly. The module is the **parity oracle** the golden test checks the SQL contract against, so it was aligned to the SQL truth on three points: (a) field rename above; (b) `n_total = Σ applicants ONLY` (matches SQL `v_n_total := COALESCE(sum(applicants),0)`, line 362 — the excluded count is NOT added in); (c) reference-band tie-break = highest selection_rate then `faixa ASC` (matches SQL `ORDER BY rate DESC, faixa ASC` over `WHERE applicants > 0 LIMIT 1`, line 369-371), replacing the strict-`>` first-max scan. A header note now declares the SQL RPC the production scorer and this module the parity oracle. The golden test gained 2 SQL-matching assertions (`n_total = 80` with 3 excluded; tie-break picks the lower faixa).
- **WR-04 (stale provenance JSDoc):** the migration is live + typed since 15-06, yet `decisaoService` / `explicacaoService` / `biasAuditService` headers still claimed "AUTHORED-NOT-APPLIED … `as never` casts … 15-06 cleans them". All `AUTHORED-NOT-APPLIED` claims removed across the 3 services (verified `grep -c` → 0); the comments now state the factual "LIVE in PROD + typed (15-06 regen), no `as never` casts remain".
- **WR-05 (misleading retry toast):** `solicitar_revisao_decisao` RAISEs `no_data_found` (SQLSTATE `P0002`, NOT `42501`) when the candidate owns the candidatura but no `decisao='rejeitado'` row exists (reachability gate). `solicitarRevisao` previously fell through to the generic `ExplicacaoServiceError('… Tente novamente.')` retry toast for an action that can never succeed. Fixed: added a third `ExplicacaoWriteOutcome` value `'unavailable'`; the service maps `P0002`/`no_data_found → 'unavailable'`; `useSolicitarRevisao` surfaces the distinct pt-BR message "Não há decisão rejeitada para revisar nesta página." instead of the retry copy. A parametrized test asserts both `P0002` and `no_data_found` resolve to `'unavailable'` and do NOT fire the webhook.

### Task 2 — WR-03 RLS migration, FILE only (commit `bf20b6b`)

- **WR-03 (RH horizontal-access gap):** the Phase-6 `rh_le_decisao_final` policy was role-only (`role IN ('rh','administrador')`) with no `vagas.created_by` scope, so any RH could read the `decisao` / `em` / internal `justificativa` of a candidatura on another recruiter's vaga (and `listFinalistas` enumerated any vaga's rows), side-stepping the per-vaga ownership the `consolidar-decisao-final` EF enforces.
- Authored `supabase/migrations/20260625100002_decisao_final_rh_vaga_scope.sql` (no BEGIN/COMMIT wrapper): `DROP POLICY IF EXISTS rh_le_decisao_final` + `CREATE POLICY` scoped to administrador-bypass OR `role='rh' AND candidatura_id IN (… candidaturas JOIN vagas WHERE v.created_by = (select auth.uid()))`. Mirrors the Phase-14 WR-04 precedent (`rh_le_scores` / `rh_le_entrevista_analises`, migration `20260625000001:314-327`). `candidato_le_propria_decisao` + `decisao_final_no_client_insert` are NOT operated on (mentioned only in comments stating they stay intact).

## ⚠️ PROD BOUNDARY — migration UNAPPLIED

`supabase/migrations/20260625100002_decisao_final_rh_vaga_scope.sql` is **AUTHORED AS A FILE ONLY**. No `apply_migration`, `supabase db push`, any `mcp__supabase__*` tool, or `db:types` was run by this executor. **The orchestrator applies the WR-03 migration to PROD with the user's authorization AFTER this plan returns**, then verifies the policy is vaga-scoped live (e.g. a non-owning `rh` JWT reads 0 rows for a peer's candidatura; an admin reads all; the candidate own-row read is unchanged).

## Gates

- `npm run test:run -- biasMath explicacao` → **35 passed** (20 biasMath incl. 2 new SQL-parity assertions + 15 explicacao incl. the new WR-05 case).
- `npm run build` exit **0**.
- `tsc --noEmit` (`npm run lint`) → **291** errors (flat vs the 291 pre-plan baseline; ≤305 cap honored — no regression).

## Deviations from Plan

None — plan executed exactly as written. Rules 1-4 not triggered; no missing critical functionality, no blocking issues, no architectural decisions. (One in-task refinement that is NOT a deviation: the WR-02 reference-band tie-break loop was written to also resolve the degenerate all-zero-rate case the way the SQL `LIMIT 1` does — the lowest eligible `faixa` wins — so the oracle matches the SQL on that edge too.)

## Notes

- WR-05 surfaced one extra in-scope edit not enumerated in the plan's `files_modified`: `src/features/explicacao/hooks/useExplicacao.ts` (the hook that consumes the new `'unavailable'` outcome). Without it the new service outcome would have no UI consumer and the candidate would see no toast at all for the reachability case. Treated as the natural completion of the WR-05 fix, not a deviation.
- IN-01..IN-04 (info-tier review findings) are out of scope for this gap-closure plan and remain advisory for Phase 16 polish.
- All three requirement IDs (DECISAO-03, DECISAO-04, LGPD-03) the warnings touched are reinforced: WR-03 hardens DECISAO-03 RH reads, WR-05 hardens the DECISAO-04 / LGPD Art. 20 revision path, WR-01/02 harden the LGPD-03 bias-audit honesty surface.

## Self-Check: PASSED

- Created files exist: `20260625100002_decisao_final_rh_vaga_scope.sql`, `15-07-SUMMARY.md`, `biasMath.ts`, `useExplicacao.ts` — all FOUND.
- Commits exist: `dd89256` (Task 1), `bf20b6b` (Task 2) — both FOUND in git log.
