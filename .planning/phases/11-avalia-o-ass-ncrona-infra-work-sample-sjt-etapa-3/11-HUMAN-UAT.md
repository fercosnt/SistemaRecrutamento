---
status: partial
phase: 11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3
source: [11-VERIFICATION.md, 11-REVIEW.md, 11-UI-REVIEW.md]
started: 2026-06-09
updated: 2026-06-09
---

## Current Test
[awaiting human testing — all require a live candidatura at etapa='avaliacao_assincrona' + real AI calls + visual]

## Tests

### 1. Full candidate assessment flow (AVAL-01/02/09)
expected: Navigate as a real candidato whose candidatura is at `avaliacao_assincrona` → `/candidato/avaliacao/:candidatura_id`. Glass shell, one neutral card per teste (Pendente/Concluído + tempo). Open SJT MC: radio options (shuffled, no peso/tag visible), soft timer, "Salvo automaticamente" affordance. Submit (confirm dialog) → card flips to "Concluído". Candidate sees ZERO score/threshold/percent.
result: [pending]

### 2. SJT open-case AI scoring (AVAL-03) — **re-test after the C1/C2 fix**
expected: Answer the dentista open-case (200-500 words) → submit → `avaliar-redacao` EF (redeployed 2026-06-09 with the fixed `{candidatura_id, pergunta_id, texto}` contract + pergunta-by-id lookup) scores via `work_sample_sjt` prompt → `scores_candidato` row tipo='sjt' subtipo='caso_aberto' with a rubric-WEIGHTED composite 0-25 (dentista 25/20/25/15/15), citacoes, red_flags. `<13/25 OR red_flag OR insufficient_evidence` → status='pendente_humano'. **This path was 100% broken pre-fix (code-review C1/C2) — verify it now works end-to-end.**
result: [pending]

### 3. RH scorecard (AVAL-02/03)
expected: As RH, the scorecard shows the MC per-item breakdown (NO "Sugestão da IA" badge — MC is deterministic, fixed post-UI-review) + the open-case BARS dimensions + SugestaoIABadge on the AI (open-case) block only + "Requer revisão humana" on pendente_humano. As candidato role → 0 rows from scores_candidato.
result: [pending]

### 4. Autosave 30s + back-lock (AVAL-09)
expected: Observe the 30s debounced autosave; advance the etapa past avaliacao_assincrona (RH action) then attempt to edit → neutral "Sua etapa avançou…" locked state (no error toast). MC re-submit after etapa advance is server-blocked (42501).
result: [pending]

## Summary
total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
(code-review C1/C2 — open-case submit contract was fully broken, FIXED commit c183cd3 + EF redeployed; UAT #2 verifies live)
(UI-review 17/24 — typography/spacing drift + MC already-submitted read-only state → Phase 16 hardening; MC SugestaoIABadge mislabel FIXED)
(I2 — per-card "Tempo estimado" is a constant ~10 min placeholder until wired to perguntas.tempo_est_min — Phase 16/backlog)
