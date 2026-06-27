---
phase: 06-pipeline-backbone-schema
plan: 04
status: complete
requirements: [FUNIL-02, FUNIL-03]
completed: 2026-06-07
applied_via: Supabase MCP (execute_sql)
deviation: D-06-DEFINER (SECURITY INVOKER -> SECURITY DEFINER)
---

# 06-04 SUMMARY — avancar_etapa() trigger

## What was built
`avancar_etapa()` BEFORE UPDATE OF etapa_atual trigger on candidaturas: forward/skip free,
terminals (aprovado/rejeitado) allowed from any stage, regression (NEW < OLD by enum ordinal)
blocked unless `etapa_justificativa` non-empty; writes one historico_candidatura row per
transition in-txn (ator = auth.uid(), auto_rejeitado = ator IS NULL). Idempotent trigger bind.

## Deviation — D-06-DEFINER (approved by Fernando 2026-06-07)
Plan specified SECURITY INVOKER (Pitfall 4 / D-09). Live RH-JWT smoke proved that breaks the
flow: the invoker trigger runs the historico INSERT as the RH (`authenticated`), which RLS blocks
(no client INSERT policy) → every real RH advance fails. Fix: **SECURITY DEFINER + SET search_path=''
+ REVOKE ALL FROM PUBLIC**. Pitfall 4 was false — `auth.uid()` is GUC-based, so actor capture is
preserved under DEFINER (verified: RH transition → ator=RH uid; service_role → NULL). Service-role
smokes hid the bug; the JWT smoke caught it.

## Key files
- created: `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` (DEFINER + REVOKE)
- regenerated: `database.types.ts`

## Verification (FUNIL-02 §C / FUNIL-03 §D)
- (a) forward OK, (b) regress-empty RAISES, (c) regress+justificativa OK, (d) terminal OK.
- Each transition wrote exactly one historico row; criterio_texto copied from etapa_justificativa;
  ator = caller's auth.uid(). All cases rolled back (prod state untouched).

## Self-Check: PASSED