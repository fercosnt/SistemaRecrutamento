---
status: partial
phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil
source: [31-VERIFICATION.md]
started: 2026-07-15
updated: 2026-07-15
---

## Current Test

[awaiting human testing — live PROD RH session]

## Tests

### 1. Kanban card ⋯ menu: Avançar/Retroceder/Rejeitar on a real logged-in RH session
expected: Menu opens on every non-terminal card (aria-label "Ações do candidato"); Avançar moves 1-click to the next stage; Retroceder opens the destino+justificativa dialog and, on confirm, moves the card backward; Rejeitar opens the shared dialog (motivo Select + justificativa counter, ≥50) and, on confirm, moves the card to the terminal "Rejeitado" pill. No menu renders on terminal (aprovado/rejeitado) cards.
result: [pending]

### 2. HubCandidatoRH "Próximo passo" action row on a real candidate profile
expected: Avançar/Retroceder/Rejeitar render beside the dominant "Abrir {etapa}" CTA without displacing it; after any of the three actions the Hub's own etapa chip/timeline refreshes (WR-01 fix — entrevistaKeys invalidation) instead of staying stale and re-offering an already-terminal action.
result: [pending]

### 3. ComparativoScreen Rejeitar — standalone route + read-only DecisaoFinalPage embed
expected: On the standalone /rh/.../comparativo route, Rejeitar opens the shared RejeitarCandidaturaDialog (motivo + ≥50 justificativa) and writes through the RPC; on the DecisaoFinalPage "Comparativo" tab (finalists view), NO Ação row / Rejeitar button appears at all (read-only embed).
result: [pending]

### 4. Post-reject audit trail visibility with correct human author
expected: After a real reject (any surface), the candidate's historico/trilha shows the RH user as ator and the free-text justificativa in criterio_texto — matching "fica registrada na trilha de auditoria". (Server-side already proven by the 31-06 SQL smokes against a disposable fixture; this confirms the same through a real UI click.)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

None — all 10 automated must-haves verified; the server-authoritative invariants are smoke-proven live in PROD (asserts a/e/f/c/b-d GREEN). These 4 items are confirmatory visual/interaction UATs deferred per prior-phase precedent (Phases 8/10/11/17/21).
