---
artifact: SQL-Smoke Runbook
phase: 06-pipeline-backbone-schema
requirements: [FUNIL-01, FUNIL-02, FUNIL-03, FUNIL-04, LGPD-02]
project_ref: isljnozzlvckrgjjbjwp
nyquist_compliant: true
wave_0_complete: true
applied_via: Supabase MCP (execute_sql) 2026-06-07
updated: 2026-06-07
---

# Phase 6 — SQL-Smoke Runbook

> **Canonical verification harness for the whole phase.** Every migration apply in plans
> 06-02..06-05 runs its matching audit section from here and pastes the result back into the
> `Result captured:` block. Run all queries in the **Supabase SQL Editor** against project
> `isljnozzlvckrgjjbjwp`. Capture COUNTS / distributions only — **never paste row-level PII**
> (no `SELECT *` dumps of candidato data). [T-06-RB-02]

## Audit → Requirement → Applying Plan map

| Section | Requirement | Proves | Applied by plan |
|---------|-------------|--------|-----------------|
| §A Discovery | FUNIL-01 precondition | live etapa distribution + count BEFORE any DDL | 06-02 (run first) |
| §B Audit FUNIL-01 | FUNIL-01 | enum cutover, zero data loss (pre/post count match) | 06-02 cutover |
| §C Audit FUNIL-02 | FUNIL-02 | regression blocked w/o justificativa; forward/skip/terminal allowed | 06-04 trigger |
| §D Audit FUNIL-03 | FUNIL-03 | every transition writes one `historico_candidatura` row | 06-04 trigger |
| §E Audit FUNIL-04 | FUNIL-04 | candidato isolation + RH/admin reads + 100% RLS structural | 06-05 RLS |
| §F Audit LGPD-02 | LGPD-02 | zero decisions persisted without a human actor | 06-03 `decisao_final` (re-confirmed 06-05) |

---

## §A — DISCOVERY (run FIRST, before any DDL — FUNIL-01 precondition)

> Removes RESEARCH Assumptions A1/A5 (live row distribution unknown). Run this **before**
> finalizing/applying the 06-02 cutover `USING CASE`.

```sql
-- A1. Live row count + etapa distribution (tells you whether orphan logging is needed)
SELECT etapa_atual, count(*) FROM public.candidaturas GROUP BY etapa_atual ORDER BY count(*) DESC;

-- A2. Current column default (MUST be dropped first during cutover — Pitfall 3)
SELECT column_default FROM information_schema.columns
 WHERE table_schema='public' AND table_name='candidaturas' AND column_name='etapa_atual';

-- A3. Confirm the 3 net-new tables are absent (expect 0 rows)
SELECT tablename FROM pg_tables
 WHERE schemaname='public'
   AND tablename IN ('historico_candidatura','decisao_final','bias_audit_log');
```

> **Orphan note:** if §A1 shows any `etapa_atual` value other than
> `triagem / aprovado / rejeitado / entrevista_online / entrevista_presencial`, those orphan
> rows collapse to `triagem` during cutover (D-05) and **each MUST get a
> `historico_candidatura` audit line** (`etapa_de=<legacy>`, `etapa_para='triagem'`,
> `criterio_texto='colapso de valor legado órfão (D-05)'`, `ator=NULL`, `auto_rejeitado=true`)
> in the same SQL-Editor session, after the table exists.

**Result captured:** (2026-06-07, via Supabase MCP, project isljnozzlvckrgjjbjwp)
```
§A1 distribution: triagem=3, raven=2, cultura=1
discovery_total_rows = 6
§A2 default = 'triagem'::etapa_processo  (dropped first during cutover)
§A3 existing new tables = none (historico_candidatura / decisao_final / bias_audit_log all absent)
ORPHANS PRESENT: raven (2) + cultura (1) = 3 rows -> collapse to triagem (D-05), audit-logged.
```

---

## §B — AUDIT FUNIL-01 (cutover: no data loss)

Applied by **06-02**. Run AFTER the cutover + historico table apply.

```sql
-- Post-cutover distribution — total MUST equal §A discovery_total_rows (zero data loss)
SELECT etapa_atual, count(*) FROM public.candidaturas GROUP BY etapa_atual ORDER BY count(*) DESC;
```

**Expected mapping:** `triagem` stays `triagem`; `entrevista_online`/`entrevista_presencial`/
`aprovado`/`rejeitado` keep identity; legacy orphans (`bigfive/disc/raven/cultura/avaliacao_final`)
→ `triagem`. **post_total MUST == discovery_total_rows.**

**Result captured:** (2026-06-07)
```
post_dist: triagem=6 (3 originais + 3 órfãos colapsados)
post_total = 6  == discovery_total_rows (6)  -> ZERO DATA LOSS ✓
orphan audit rows: 3 (raven×2 + cultura×1) gravados em historico_candidatura (ator NULL, auto_rejeitado=true) ✓
data_loss = none
```

---

## §C — AUDIT FUNIL-02 (regression block)

Applied by **06-04**. Pick a real candidatura at `triagem` (`<id>`). Run the 4 cases in order.
Leave the candidatura in a clean state afterward (or restore from `backup_m2.candidaturas_pre_funil`).

```sql
-- (a) forward / skip-ahead → MUST succeed (D-06)
UPDATE public.candidaturas SET etapa_atual='entrevista_online' WHERE id='<id>';            -- OK

-- (b) regress to an earlier etapa with EMPTY justificativa → MUST raise the exception
UPDATE public.candidaturas SET etapa_atual='inscricao' WHERE id='<id>';                     -- expect EXCEPTION
--   'Regressão de etapa exige justificativa preenchida'

-- (c) same regression WITH justificativa → MUST succeed
UPDATE public.candidaturas SET etapa_atual='inscricao', etapa_justificativa='motivo do retorno...'
 WHERE id='<id>';                                                                            -- OK

-- (d) set a terminal from any stage → MUST succeed (D-06)
UPDATE public.candidaturas SET etapa_atual='rejeitado', etapa_justificativa='decisão...' WHERE id='<id>'; -- OK
```

**Result captured:** (2026-06-07, candidatura d5491f18, each case run in BEGIN…RAISE→rollback so prod state untouched)
```
(a) forward/skip   = OK  (triagem→entrevista_online; audit de=triagem para=entrevista_online)
(b) regress empty  = EXCEPTION raised ✓  ('Regressão de etapa exige justificativa preenchida')
(c) regress + just = OK  (audit de=triagem para=inscricao criterio='retorno para reavaliação (smoke 06)')
(d) terminal       = OK  (triagem→rejeitado, no justificativa needed)
```

---

## §D — AUDIT FUNIL-03 (audit trail)

Applied by **06-04**. Run AFTER the §C transitions.

```sql
-- Every transition recorded with criterio + ator + timestamp
SELECT candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em
  FROM public.historico_candidatura ORDER BY criado_em DESC LIMIT 50;

-- System/auto actions are exactly the ator IS NULL rows (service_role / EF context)
SELECT count(*) FROM public.historico_candidatura WHERE ator IS NULL AND auto_rejeitado = true;
```

**Expected:** each successful §C transition produced exactly one row; human (RH) transitions
have `ator = <RH auth.uid>`; service_role/system writes have `ator IS NULL` + `auto_rejeitado=true`.

**Result captured:** (2026-06-07)
```
rows_per_transition = 1 (yes — one historico row per transition, verified inline)
ator_human_populated = yes — RH-JWT smoke (§E) recorded ator = RH auth.uid() (aaaaaaaa-…)
ator_system_null    = yes — service_role / MCP-context transitions recorded ator IS NULL + auto_rejeitado=true
NOTE: actor capture works under SECURITY DEFINER because auth.uid() is GUC-based (see Deviation D-06-DEFINER).
```

---

## §E — AUDIT FUNIL-04 (RLS isolation)

Applied by **06-05**. Role-impersonation read + structural proof.

**Role-impersonation (run as each role / JWT context):**
```
- As candidato A: read own candidatura            → visible (>=1 row)
- As candidato A: read another candidato's row     → 0 rows
- As RH:          read all candidaturas            → visible
- As candidato:   UPDATE candidaturas.etapa_atual  → denied (no candidato UPDATE policy)
- As RH:          UPDATE candidaturas.etapa_atual  → allowed (fires the 06-04 trigger)
```

**Structural proof:**
```sql
-- RLS enabled on 100% of the M2 backbone tables (rowsecurity MUST be true for all 4)
SELECT tablename, rowsecurity FROM pg_tables
 WHERE schemaname='public'
   AND tablename IN ('candidaturas','historico_candidatura','decisao_final','bias_audit_log');

-- Policy inventory — confirm expected policies exist, no 'admin'/auth_user_id residue
SELECT tablename, policyname, cmd FROM pg_policies
 WHERE schemaname='public'
   AND tablename IN ('candidaturas','historico_candidatura','decisao_final','bias_audit_log')
 ORDER BY tablename, cmd;
```

**Result captured:** (2026-06-07, real-JWT impersonation via SET LOCAL ROLE authenticated + request.jwt.claims, rolled back)
```
candidato own read      = visible (candidato D sees 1 of 6)
candidato cross read    = isolated (sees only own; RH sees all 6)
RH read all             = visible (6)
candidato UPDATE (subm) = denied (0 rows affected on is_rascunho=false candidatura)
RH UPDATE               = allowed (1 row; trigger fired; audit ator = RH auth.uid())
rowsecurity all 4 true  = yes (candidaturas, historico_candidatura, decisao_final, bias_audit_log)
policy inventory clean  = yes (new policies use user_id + app_metadata.role + 'rh'/'administrador'; no 'admin'/auth_user_id)
```
> **Pre-existing M1 policies noted:** candidaturas already had `"RH atualiza candidaturas" [UPDATE]`
> (via usuarios_rh membership) and `"Candidato atualiza rascunhos" [UPDATE]` (scoped to is_rascunho=true).
> RESEARCH Open-Q3 said none existed — it was wrong. The new `rh_avanca_etapa` is additive (OR'd) and
> harmless. Residual: a candidato could change etapa on their OWN rascunho (draft) — pre-existing
> draft-editing behavior, scoped to drafts, trigger still audits. Submitted candidaturas are correctly
> candidato-UPDATE-denied. Logged as finding F-06-RASCUNHO (non-blocking).

---

## §F — AUDIT LGPD-02 (zero-auto-rejection guardrail)

Applied by **06-03** (`decisao_final` created complete); re-confirmed end-to-end by **06-05**.

```sql
-- MUST return 0 — no decision ever persisted without a human actor
SELECT count(*) AS auto_decisoes FROM public.decisao_final WHERE por_usuario IS NULL;
```

Also confirm a **client INSERT into `decisao_final` is rejected** end-to-end (RLS `WITH CHECK false`).

**Result captured:** (2026-06-07)
```
auto_decisoes = 0 ✓ (decisao_final.por_usuario IS NULL count)
client INSERT rejected = yes ✓ (candidato-JWT INSERT into decisao_final blocked by WITH CHECK false)
```

---

## Phase gate (06-05 finalization)

- [x] §A discovery captured; §B post_total (6) == discovery_total_rows (6)
- [x] §C four regression-block cases behave per D-06
- [x] §D every transition logged with criterio/ator/timestamp
- [x] §E rowsecurity true on all 4 tables; candidato isolated; RH UPDATE allowed
- [x] §F `auto_decisoes = 0`; client `decisao_final` INSERT rejected
- [x] migrations recorded in supabase_migrations (versions 20260607000001–06) → `db push` will report up to date (run `supabase db push --linked` from your terminal to confirm the local-CLI view)
- [x] `database.types.ts` regenerated (8-value enum + 3 tables + etapa_justificativa); `npm run test:run` = 358/358 pass, 0 regressions
- [x] frontmatter flipped: `nyquist_compliant: true`, `wave_0_complete: true`

## Deviation — D-06-DEFINER (trigger SECURITY DEFINER)

The plan/RESEARCH (Pitfall 4 / D-09) specified `avancar_etapa()` as SECURITY INVOKER. Live RH-JWT
testing proved that breaks the core flow: an invoker trigger runs the historico_candidatura INSERT
as the RH (role `authenticated`), which RLS blocks (no client INSERT policy) → every real RH
etapa-advance fails. Fix (approved by Fernando 2026-06-07): make the trigger **SECURITY DEFINER
+ SET search_path = '' + REVOKE ALL FROM PUBLIC**. Pitfall 4's premise was false — `auth.uid()` is
GUC-based (request.jwt.claims), so actor capture (D-09) is preserved under DEFINER (empirically:
RH transition recorded ator = RH uid; service_role recorded NULL). Service-role smokes hid the bug
(service_role bypasses RLS); the live JWT smoke caught it. Migration file 20260607000005 reflects
this; the audit table stays append-only-via-trigger (no direct client INSERT policy).
