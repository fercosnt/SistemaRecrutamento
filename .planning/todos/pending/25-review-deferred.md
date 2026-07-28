---
id: 25-review-deferred
created: 2026-07-12
source: Phase 25 code review (25-REVIEW.md — MED-03, LOW-02 deferred by --fix run)
priority: medium
resolves_phase: null
tags: [funil-25, code-review, deferred, reconsider-reject, select-star-pii, m5-hardening-scope]
---

# Phase 25 code-review — deferred findings (MED-03, LOW-02)

Two findings from `25-REVIEW.md` were intentionally NOT auto-fixed by the
`/gsd:code-review --fix` run (2026-07-12). The three in-scope defects (MED-01,
MED-02, LOW-01) were fixed and committed. These two need judgment beyond a
mechanical patch.

---

## MED-03 — "Reconsider rejected candidate" leaves `etapa_atual` stuck at `rejeitado`

**File(s):**
- `supabase/migrations/20260709000012_registrar_decisao_amend.sql:119-123`
- `src/components/modals/UpdateStatusModal.tsx:62`
- `src/features/vagas/services/candidaturasService.ts:443-448`
- `src/components/KanbanBoard.tsx:100-101`

**Issue:** Phase 25's `registrar_decisao` reject branch now writes BOTH
`etapa_atual='rejeitado'` and `status='rejeitado'`. The modal still offers the
`rejeitado → em_analise` "reconsiderar" transition, which routes through
`updateCandidaturaStatus` (status-only: `novaEtapa = etapa_atual` stays
`'rejeitado'`). Result: `status='em_analise'` but `etapa_atual='rejeitado'` — an
inconsistent terminal etapa on an active status. The Kanban terminal pill keys on
`etapa === 'rejeitado' || status === 'rejeitado'`, so the reconsidered candidate
still renders "Rejeitado" and never returns to a working column. The reconsider
action is effectively a visual no-op and the DB is left contradictory (also
mis-drives `funilNavMap` / hub etapa reads).

**Why deferred:** Needs a **product decision**, not a mechanical fix. Two viable
directions, each with UX/audit consequences:
1. Add a resume-reason field and, on un-reject, move `etapa_atual` back to a
   working stage through the audited `avancar_etapa` path (requires a non-empty
   `etapa_justificativa` because it is a backward move — surface a short reason
   field in the modal). OR
2. Remove the `rejeitado → em_analise` transition entirely (no reconsider from a
   terminal reject; force a fresh candidatura instead).

**Suggested fix (if direction 1 chosen):** when `statusAtual === 'rejeitado'` and
the new status is `em_analise`, call `updateCandidaturaEtapa(candidaturaId,
'triagem')` (or the appropriate resume stage) so `avancar_etapa` writes an audited
transition and the terminal pill clears — collect the mandatory
`etapa_justificativa` first.

**Candidate home:** M5 (Operação & Comunicação) / follow-up funnel-semantics pass.

---

## LOW-02 — `listAllCandidaturas` `select('*')` over-fetches candidate PII

**File:** `src/features/vagas/services/candidaturasService.ts:542-545`

**Issue:** `listAllCandidaturas` selects `*, candidato:candidatos(*), vaga:vagas(*), …`.
Per the standing project rule ([[reference_select_star_leaks_pii]]) RLS is
row-level only and does not hide columns, so this ships every column RLS lets RH
read for each joined candidate (potentially CPF and other sensitive fields) to the
browser for a list view that only renders name/email/phone. Data-minimization
violation.

**Why deferred:** **Pre-existing, NOT a Phase-25 regression** — Phase 25 only
removed `getProximaEtapa` from this file; the star-join predates it. RH is an
authorized role, so it is a hardening item, not a new leak. Belongs to a
security-hardening pass, not this correctness --fix run.

**Suggested fix:** Replace the star-joins with an explicit allowlist projection
(mirror `triagemService.listTriagemPanel` / the `v_triagem_panel` view), e.g.
`candidato:candidatos(id, nome_completo, email, celular)` and only the `vagas`
columns the list actually renders.

**Candidate home:** M5 security-hardening pass / next `select('*')` PII sweep.
