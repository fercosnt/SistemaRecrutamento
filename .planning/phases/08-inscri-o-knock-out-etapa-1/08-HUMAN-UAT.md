---
status: partial
phase: 08-inscri-o-knock-out-etapa-1
source: [08-VERIFICATION.md]
started: 2026-06-08T02:35:13Z
updated: 2026-06-08T02:35:13Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Redeploy submit-candidatura Edge Function
expected: `supabase functions deploy submit-candidatura` succeeds; the EF then forwards the RPC `status` + `etapa_atual` in the success payload so the inline D-15 knockout branch activates client-side. (DB-side knockout + feedback_rejeicao persistence is already live in PROD; only the EF passthrough is undeployed.)
result: [pending]

### 2. D-15 neutral rejection card — visual/tone
expected: After a knocked-out submission, `FormularioCandidaturaPage` shows the neutral D-15 message inline as a calm/muted GlassCard (no red alarm banner, no success toast, no navigation), and the discriminatory criterion is NEVER shown.
result: [pending]

### 3. Live E2E knockout flow
expected: Running `e2e/inscricao-knockout.spec.ts` with the env flags against a seeded knockout vaga passes — knockout fires, survivor advances to triagem, neutral message shown, no criterion leak.
result: [pending]

### 4. Dashboard visual — knocked-out candidatura
expected: On `/dashboard` (candidate), a rejected candidatura shows the "Rejeitado" status badge with the `feedback_rejeicao` neutral message below it; the 6 stat counters (Total / Aguardando / Em Análise / Aprovadas / Rejeitadas / Finalizadas) render real numbers; the status filter works.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
