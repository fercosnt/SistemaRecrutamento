---
phase: 14-entrevistas-com-ia-companion-etapas-4-5
type: human-uat
status: deferred
created: 2026-06-25
verification: 14-VERIFICATION.md (status: human_needed, 7/7 must-haves verified)
---

# Phase 14 — Human UAT (deferred)

Phase 14 verification passed all 7 automated must-haves. These 4 items require a live
end-to-end round-trip (a real candidatura with prior scores + RH login + deployed EFs)
and were deferred during the autonomous run (user choice, 2026-06-25). Consistent with the
deferred-UAT pattern from phases 8 / 10 / 11.

## Preconditions / blockers

- **RH login** — items 2 & 3 need a working RH session. The known unmigrated **auth-hook RLS
  gap** ([[reference_auth_hook_rls_gap]]) currently makes RH login resolve to `candidato` in
  the JWT (→ GET candidatos 406 → logout). Apply the auth-hook fix (grant+policy
  `supabase_auth_admin` on `usuarios_rh`, or hook SECURITY DEFINER) + the stacked LoginRHPage
  race fix (uncommitted `src/components/pages/LoginRHPage.tsx`) before items 2/3.
- **CC0 seed** — item 4 (cognitive band display) is blocked until the CC0 cognitive item bank
  is sourced + seeded (`.planning/todos/pending/cc0-cognitive-item-bank-sourcing.md`). Until
  then `pontuar_cognitivo` raises `no_data_found` (CR-01 guard) and the prova shows
  "prova não configurada" — by design.

## UAT items

### UAT-1 — Interview guide generation round-trip (ENTREV-02)
- **Steps:** As RH, open `/rh/candidato/:id/entrevista` for a candidate with Big Five +
  redação + (optional) work-sample scores → Guia tab → generate guide.
- **Expected:** STAR/PEI questions render; weak dimensions are prioritized (the dimensions
  with the lowest prior scores get the most/first questions); online vs presencial branch
  matches the vaga modality. No score/band leaks into candidate-facing copy.

### UAT-2 — Transcript analysis → flag-block → confirm review (ENTREV-03 / ENTREV-04)
- **Steps:** Paste a ≥200-char transcript → analyze → if the language/accent bias flag fires,
  the "Avançar etapa" CTA is disabled; click "Confirmar revisão humana".
- **Expected:** Competency BARS scores DISPLAY in the scorecard + transcript panel (CR-04
  normalization live); the flag block shows; "Confirmar revisão humana" calls
  `confirmar_revisao_entrevista` and the readback confirms `revisao_confirmada_em` set
  (no silent no-op — CR-03/WR-07).

### UAT-3 — Confirmed review unblocks `avancar_etapa` server-side (ENTREV-04)
- **Steps:** After UAT-2 confirms the review, attempt the funil advance on the server.
- **Expected:** With `revisao_confirmada_em` set, the `avancar_etapa` flag guard (migration
  `20260624000004`) no longer raises `check_violation`; without it, the advance is blocked.
  WR-04: an RH user who does NOT own the vaga cannot read this candidate's interview data.

### UAT-4 — Cognitive band card (ENTREV-05) — BLOCKED on CC0 seed
- **Steps:** (after CC0 seed) candidate completes `/candidato/prova-cognitiva/:candidaturaId`
  on an opt-in vaga (`aplica_cognitivo=true`); RH views the CognitivoBandCard.
- **Expected:** candidate sees a NEUTRAL acknowledgment (no score/band — RNF-07a); raw picks +
  proctoring persist to `cognitivo_respostas` (CR-02); RH sees the band as CONTEXTUAL (never
  a pass/fail, never an auto-reject); reject is audit-only (WR-03).
