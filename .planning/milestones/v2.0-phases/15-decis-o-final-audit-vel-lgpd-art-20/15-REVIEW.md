---
phase: 15-decis-o-final-audit-vel-lgpd-art-20
reviewed: 2026-06-25T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - src/features/admin/bias-audit/biasMath.ts
  - src/features/admin/bias-audit/components/BiasAuditPage.tsx
  - src/features/admin/bias-audit/hooks/useBiasAudit.ts
  - src/features/admin/bias-audit/services/biasAuditService.ts
  - src/features/decisao/components/ConsolidacaoDashboard.tsx
  - src/features/decisao/components/DecisaoFinalPage.tsx
  - src/features/decisao/components/RegistrarDecisaoForm.tsx
  - src/features/decisao/hooks/useConsolidacao.ts
  - src/features/decisao/hooks/useRegistrarDecisao.ts
  - src/features/decisao/schemas/consolidacaoSchema.ts
  - src/features/decisao/schemas/decisaoSchema.ts
  - src/features/decisao/services/decisaoService.ts
  - src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
  - src/features/explicacao/components/SolicitarRevisaoCTA.tsx
  - src/features/explicacao/hooks/useExplicacao.ts
  - src/features/explicacao/services/explicacaoService.ts
  - src/router/routes.tsx
  - supabase/functions/consolidar-decisao-final/index.ts
  - supabase/migrations/20260625100001_decisao_final_phase15.sql
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-06-25
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Phase 15 (Decisão Final auditável + LGPD Art. 20) was reviewed adversarially against the
stated invariants: EF authenticate≠authorize, candidate-never-sees-scores (LGPD-04),
client↔EF contract drift, RNF-07a no-auto-reject, AI-EF static imports, and bias-audit
age-only minimization.

**The load-bearing security invariants hold.** The `consolidar-decisao-final` EF correctly
splits the two-client posture (anon `getUser()` + service_role privileged reads), derives
the RH role from `usuarios_rh` (NOT the unreliable EF `getUser().app_metadata`), and
enforces `vagas.created_by` ownership BEFORE touching any score — the Phase-10 C1 pattern
is honored and the EF test suite proves all four authorize branches (candidato→403,
non-owner rh→403, admin-bypass→200, unauthenticated→401). The candidate `explicacaoService`
reads `decisao_final` via an explicit 5-column allowlist that excludes every score/band and
never joins `scores_candidato`; the reachability gate (`decisao='rejeitado'` only) and the
templated non-clinical `reason` are correctly enforced at the data layer. The migration's
4 SECURITY DEFINER RPCs each authorize before writing, `por_usuario := auth.uid()` is the
LGPD-02 guardrail, and no path auto-rejects. The EF uses a static `npm:zod` import (no
`.join("")` trap). `tsc --noEmit` is clean for all Phase-15 files; the `database.types.ts`
regen landed (the four new RPCs + `bias_audit_log` are typed — the `as never` casts the
JSDoc still references were already removed).

**However, the bias-audit subsystem has a real display bug and a structural quality problem,
and the RH-side decision reads have a cross-vaga confidentiality gap.** No BLOCKER-tier
defect was proven, but five WARNINGs (one a guaranteed-silent data bug, one a cross-tenant
read, one a contract drift between the SQL writer and its TS consumer) should be fixed.

## Warnings

### WR-01: Bias snapshot "excluded count" footnote never renders — SQL writes `excluidos_sem_data`, the page reads `excluded_sem_data`

**File:** `supabase/migrations/20260625100001_decisao_final_phase15.sql:420` and `src/features/admin/bias-audit/components/BiasAuditPage.tsx:217-220`
**Issue:** The `gerar_bias_snapshot` RPC writes the excluded-no-birthdate count into the
`dados` jsonb under the **Portuguese** key `excluidos_sem_data` (SQL line 420). But the TS
type (`biasMath.ts:73` `excluded_sem_data`) and `BiasAuditPage` (lines 217, 219) read the
**English** key `excluded_sem_data`. Because the page renders the live DB jsonb (the
`gerarSnapshot` return value is discarded; `useGerarBiasSnapshot` invalidates and refetches
via `listLatestSnapshot`), `snapshot.dados.excluded_sem_data` is always `undefined`. The
Pitfall-4 honesty footnote ("N candidato(s) sem data de nascimento válida — excluídos do
banding (contabilizados, nunca descartados)") will NEVER appear, defeating the very
reconciliation guarantee LGPD-01/Pitfall-4 was designed to surface. The `as unknown as
BiasAuditSnapshot` cast in `biasAuditService.ts:77,113` masks the mismatch from the
type-checker. No test catches it (the no-drift claim is never asserted against the SQL).
**Fix:** Align the names. Cheapest fix is client-side (no migration re-apply needed) — read
the SQL's actual key:
```tsx
// BiasAuditPage.tsx — read the key the live RPC actually writes
{snapshot.dados?.excluidos_sem_data ? (
  <p className="text-xs text-white/50">
    {snapshot.dados.excluidos_sem_data} candidato(s) sem data de nascimento válida — …
  </p>
) : null}
```
and rename `BandResult`/`AdverseImpactResult.excluded_sem_data` → `excluidos_sem_data` in
`biasMath.ts` so the type matches the persisted jsonb. (Preferred long-term: pick ONE
spelling and use it in both the SQL `jsonb_build_object` and the TS type.)

### WR-02: `biasMath.ts` is dead code presented as a load-bearing "no-drift mirror" — and it has already drifted from the SQL

**File:** `src/features/admin/bias-audit/biasMath.ts:92-159`
**Issue:** `computeAdverseImpact` and `bandFromAge` are never called from any production code
path (`grep` confirms zero non-test callers). All real banding + EEOC computation happens
server-side in `gerar_bias_snapshot`, and `BiasAuditPage` renders the SQL-produced jsonb
directly. The module's header claims it "MUST stay identical to the SQL" (the no-drift
invariant), but it is never executed against real data and has already diverged on three
points: (a) field name `excluded_sem_data` vs SQL `excluidos_sem_data` (WR-01); (b)
`n_total` here is `Σ applicants + excluded` (line 147-148) but the SQL `v_n_total` is
`Σ applicants` only (line 362), excluding the excluded count; (c) reference-band tie-break —
TS takes the first max by iteration order (strict `>`, line 127), the SQL uses
`ORDER BY rate DESC, faixa ASC` (line 370), so on a selection-rate tie the two pick
DIFFERENT reference bands and therefore can flag different bands. A "mirror" that is dead,
untested-against-its-source, and already wrong gives false confidence in an LGPD-compliance
surface.
**Fix:** Either (a) wire `biasMath.ts` into a contract/parity test that feeds the SAME band
inputs to both the TS function and the live SQL RPC and asserts identical output (making it
a real mirror), or (b) delete the module and let the SQL be the single source of truth (the
page already only reads SQL output). If kept, fix the three drifts: rename the field, make
`n_total` match the SQL definition, and replace the strict-`>` reference scan with a
`>=`/faixa-ASC tie-break that matches `ORDER BY rate DESC, faixa ASC`.

### WR-03: RH-side decision reads (`getDecisaoAtual`, `listFinalistas`) expose other recruiters' candidates' decisions + internal justificativa cross-vaga

**File:** `src/features/decisao/services/decisaoService.ts:166-191` (`listFinalistas`), `198-224` (`getDecisaoAtual`)
**Issue:** These reads go through the anon client and are bounded only by the Phase-6
`rh_le_decisao_final` RLS policy, which is `USING (role IN ('rh','administrador'))` with NO
`vagas.created_by` ownership scope. So any authenticated RH who navigates to
`/rh/candidato/:id/decisao` (or knows/guesses a candidatura id) can read the `decisao`,
`em`, and the **internal `justificativa`** of a candidatura belonging to a vaga owned by a
DIFFERENT recruiter — and `listFinalistas` enumerates all `decisao_final` rows of any vaga.
This is an inconsistent authorization surface: the new `consolidar-decisao-final` EF
carefully enforces per-vaga ownership for `role='rh'` (index.ts:267), but the page's direct
table reads do not, so the ownership boundary the EF establishes is trivially side-stepped
by the two non-EF queries on the same page. The RLS gap is pre-existing (Phase 6), but
Phase-15 is the first feature to actually read through it candidate-by-candidate.
**Fix:** Scope the RH read to owned vagas (admin bypass), consistent with the EF. Either
tighten `rh_le_decisao_final` to also require `EXISTS (SELECT 1 FROM vagas v JOIN
candidaturas c ON c.vaga_id=v.id WHERE c.id=decisao_final.candidatura_id AND
(v.created_by=auth.uid() OR (auth.jwt()#>>'{app_metadata,role}')='administrador'))`, or add a
SECURITY DEFINER read RPC mirroring the EF's ownership check. Confirm against the M2 product
decision on whether non-owning RH are meant to see peers' decisions; if intentionally shared,
document it explicitly so it is not mistaken for a leak.

### WR-04: Stale JSDoc claims `as never` casts and "AUTHORED-NOT-APPLIED" that no longer match the shipped code

**File:** `src/features/decisao/services/decisaoService.ts:124-127,142`, `src/features/explicacao/services/explicacaoService.ts:38-42,217,258`, `src/features/admin/bias-audit/services/biasAuditService.ts:12-15`
**Issue:** The migration is already applied to PROD and `database.types.ts` is regenerated
(the four RPCs + `bias_audit_log` are typed; `tsc` is green). Yet the service JSDoc blocks
still assert "AUTHORED-NOT-APPLIED … minimal `as never` casts … 15-06 cleans the casts
after the regen" while the line-level comments two lines down now say "is live in PROD +
present in database.types.ts (15-06 regen)". The headers and the code contradict each other,
and no `as never` cast actually remains on the RPC calls. Misleading provenance comments on a
compliance-sensitive feature invite a future reader to "re-clean" casts that are already gone
or to mistrust that the migration shipped.
**Fix:** Update the three service header comments to drop the "AUTHORED-NOT-APPLIED" /
`as never` narrative now that the migration is live and types are regenerated. Keep only the
factual "live in PROD + typed" line.

### WR-05: Candidate "no rejected decision yet" path on the revision RPC surfaces a generic retry error instead of the neutral not-available state

**File:** `src/features/explicacao/services/explicacaoService.ts:272-281` and `supabase/migrations/20260625100001_decisao_final_phase15.sql:198-205`
**Issue:** `solicitar_revisao_decisao` raises `no_data_found` (NOT `42501`) when the
candidate owns the candidatura but no `decisao='rejeitado'` row exists (reachability gate,
SQL lines 198-205). `solicitarRevisao` only maps `42501`/`403` to the neutral `'denied'`
outcome; `no_data_found` falls through to the thrown `ExplicacaoServiceError('Não foi
possível enviar a solicitação. Tente novamente.')`, which `useSolicitarRevisao` shows as a
retry toast. A candidate hitting a benign race (decision withdrawn/amended between page load
and click) is told to "try again" on an action that can never succeed. Low blast radius
because the page reachability gate normally precludes this, but the inconsistency is real.
**Fix:** Treat the reachability `no_data_found` from this RPC as a non-retryable neutral
outcome (e.g. map PG code `P0002`/`no_data_found` to `'denied'` or a distinct
`'unavailable'` outcome the hook surfaces with a "página não disponível" message rather than
"tente novamente").

## Info

### IN-01: `DecisaoFinalPage.resolveFinalistCandidates` comment about "score order" does not apply to its caller

**File:** `src/features/decisao/components/DecisaoFinalPage.tsx:55-68,112-115`
**Issue:** `resolveFinalistCandidates` resolves the anonymized `C{n}` ids back to
`finalistIds[n-1]`, relying on the EF anonymizing in the input-array order. The cloned
ComparativoCandidatosPage comment says the EF "anonimiza pela ordem de score", but here the
`finalistIds` array is just `decisao_final` row order (no score sort). The resolution is
still internally consistent (same array in and out), so this is correct — but if the EF ever
re-sorts inputs by score before anonymizing, both call sites silently mis-map. Add a one-line
note that this relies on stable input-order anonymization, or have the EF echo back the
candidatura id so the fragile `replace(/\D/g,'')` index parse can be dropped.
**Fix:** Document the input-order dependency, or return the candidatura id from the EF.

### IN-02: `n_total` / `populacao` / `metodo` / `limitacao` written by the SQL are never surfaced and partially diverge from the TS text

**File:** `supabase/migrations/20260625100001_decisao_final_phase15.sql:409-421`
**Issue:** The SQL `dados` carries `metodo: 'eeoc_4_5_age_band_v1'`, a `populacao` object,
`n_total`, and a `limitacao` string; the TS `AdverseImpactResult` carries different `metodo`
/`limitacao` prose and no `populacao`. None of these are rendered by `BiasAuditPage` (it
reads only `bands`, `faixa_referencia`, `small_sample_warning`, and the misspelled
excluded key). Harmless today, but the divergent dual definitions are latent drift.
**Fix:** Render the SQL `limitacao`/`metodo` from the snapshot if they are meant to be
shown, or drop the unused TS prose; converge on one authoritative `dados` schema.

### IN-03: `gerarSnapshot` return value is typed `BiasAuditSnapshot` but discarded; `dados` is unvalidated

**File:** `src/features/admin/bias-audit/services/biasAuditService.ts:93-114` and `hooks/useBiasAudit.ts:41-44`
**Issue:** `gerarSnapshot` casts the RPC row `as unknown as BiasAuditSnapshot` and returns
it, but `useGerarBiasSnapshot` ignores the returned data and refetches. The double cast and
the unused typed return are dead surface that hid WR-01's field mismatch. Consider returning
`void` (or validating `dados` with a Zod parse at the boundary so the SQL/TS field-name
contract is enforced at runtime instead of silently cast away).
**Fix:** Either drop the return type to `void` or parse `dados` through a schema that would
have failed loudly on the `excluidos_sem_data`/`excluded_sem_data` mismatch.

### IN-04: EF `console.error` redaction relies on `body` being assigned; safe today but fragile

**File:** `supabase/functions/consolidar-decisao-final/index.ts:353-356`
**Issue:** The outer `catch` logs `{ vaga_id: body.vaga_id }`. `body` is declared with `let`
above both try blocks and is always assigned before the main try (line 248), so this cannot
throw a ReferenceError today. It is, however, one refactor away from logging an undefined or
moving the body parse into the guarded block. Minor robustness note — the redaction intent
(ids/counts only, no PII) is otherwise correctly implemented.
**Fix:** Optional — guard with `body?.vaga_id` for resilience to future reordering.

---

_Reviewed: 2026-06-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
