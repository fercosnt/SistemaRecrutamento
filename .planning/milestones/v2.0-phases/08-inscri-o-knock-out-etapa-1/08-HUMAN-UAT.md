---
status: complete
phase: 08-inscri-o-knock-out-etapa-1
source: [08-VERIFICATION.md]
started: 2026-06-08T02:35:13Z
updated: 2026-06-21T00:00:00Z
---

## Current Test

[testing complete — 4/4 PASS, 0 issues, seed fixture cleaned up (see Follow-ups)]


## Tests

### 1. Redeploy submit-candidatura Edge Function
expected: `supabase functions deploy submit-candidatura` succeeds; the EF then forwards the RPC `status` + `etapa_atual` in the success payload so the inline D-15 knockout branch activates client-side. (DB-side knockout + feedback_rejeicao persistence is already live in PROD; only the EF passthrough is undeployed.)
result: PASS — `supabase functions deploy submit-candidatura` succeeded (script 81.7kB, _shared bundled). PROD now runs **version 6** (was v5 from ~April, pre-Phase-8), `verify_jwt:true` preserved. Confirmed via `get_edge_function`: deployed body contains the Phase 8 / D-16 passthrough — success payload returns `{ candidaturaId, candidaturaUrl, status, etapa_atual }` (index.ts:326-337); the audit-only `opcao_knockout_id` criterion is never returned.

### 2. D-15 neutral rejection card — visual/tone
expected: After a knocked-out submission, `FormularioCandidaturaPage` shows the neutral D-15 message inline as a calm/muted GlassCard (no red alarm banner, no success toast, no navigation), and the discriminatory criterion is NEVER shown.
result: PASS — verified live 2026-06-21 by Fernando. Seeded a knockout fixture on `teste-analista-marketing-digital-remoto` (single_choice "disponibilidade", "Mais de 30 dias" tagged knockout), submitted as fernando@beautysmile.com.br selecting the knockout option → inline neutral card "Inscrição recebida / Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento." rendered in place (no success toast, no nav, no red alarm, criterion not shown). (First attempt accidentally selected "Imediata" → survived to triagem; that candidatura was hard-deleted and re-submitted.)

### 3. Live E2E knockout flow
expected: Running `e2e/inscricao-knockout.spec.ts` with the env flags against a seeded knockout vaga passes — knockout fires, survivor advances to triagem, neutral message shown, no criterion leak.
result: PASS — live flow manually verified end-to-end 2026-06-21 by Fernando. BOTH branches exercised against the seeded knockout fixture on `teste-analista-marketing-digital-remoto`: (a) SURVIVOR — first submission selected "Imediata" → candidatura advanced to etapa=triagem (status aguardando_resposta, opcao_knockout_id NULL); (b) KNOCKOUT — after deleting that candidatura, re-submitted selecting "Mais de 30 dias" → status=rejeitado, neutral D-15 card shown inline (#2), no criterion leak, dashboard "Rejeitado" badge (#4). The automated `e2e/inscricao-knockout.spec.ts`: 3 passed (no-leak contract across chromium/mobile-chrome/tablet); its env-gated live-submit cases (6 skipped) remain optional now that the behavior is human-confirmed.

### 4. Dashboard visual — knocked-out candidatura
expected: On `/dashboard` (candidate), a rejected candidatura shows the "Rejeitado" status badge with the `feedback_rejeicao` neutral message below it; the 6 stat counters (Total / Aguardando / Em Análise / Aprovadas / Rejeitadas / Finalizadas) render real numbers; the status filter works.
result: PASS — verified live 2026-06-21 by Fernando. On `/candidato/perfil` the rejected candidatura shows the red "Rejeitado" badge + neutral `feedback_rejeicao` message ("a mensagem está ótima" — criterion not shown). The 6 counters + status filter live on `/candidato/dashboard` (a separate route from /perfil): confirmed correct when accessed directly. OBSERVATION (non-blocking, → backlog/Phase 16): the in-app navigation PATH to `/candidato/dashboard` is not obvious — user reached it by URL. Worth reviewing the candidate IA/nav so the dashboard is discoverable.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
(ALL 4 CLOSED 2026-06-21 — status: complete, 4/4 PASS, 0 code issues.)
(#1 closed 2026-06-09 — EF redeployed to v6 with D-16 passthrough.)
(#2/#3/#4 closed 2026-06-21 via a manual live knockout submission against a seeded fixture on
 teste-analista-marketing-digital-remoto — see "Current Test" cleanup note for fixture IDs.)

## Follow-ups (non-blocking, → backlog / Phase 16)
- NAV/IA: the candidate `/candidato/dashboard` (6 counters + status filter) is not reachable by an
  obvious in-app path — Fernando had to open it by URL. Review candidate navigation so the dashboard
  is discoverable. (Not a Phase-8 deliverable defect; the page itself works.)
- FIXTURE CLEANUP — DONE 2026-06-21: the seeded knockout question (perguntas_formulario
  49a74ef7…) + its knockout metadata + the resulting rejeitado candidatura were all hard-deleted.
  PROD verified back to original state (teste-analista-marketing-digital-remoto: 0 form questions;
  system back to 6 candidaturas). Reset gotcha for future test-data work: candidaturas has TWO
  unique (candidato_id, vaga_id) indexes — one WITHOUT a deleted_at filter — so soft-delete does
  NOT free the slot; hard-delete is required, and historico_candidatura + decisao_final are
  ON DELETE NO ACTION (must be cleared manually before deleting the candidatura).
