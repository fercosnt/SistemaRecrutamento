---
status: partial
phase: 11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3
source: [11-VERIFICATION.md, 11-REVIEW.md, 11-UI-REVIEW.md]
started: 2026-06-09
updated: 2026-06-26
---

## Resultado da sessão live 2026-06-26 (seed E2E do funil)

Os 4 testes abaixo estavam BLOCKED-on-data (0 candidaturas em avaliacao_assincrona).
Resolvido criando 2 candidaturas de teste (vaga [TESTE] Dentista — Funil E2E):
`a1dd4c42` (percorreu o funil) + `f73682b6` (limpa em avaliacao_assincrona).

- **#1 Fluxo de avaliação do candidato: ✅ PASS (após fix F4).** Login
  `candidato2.funil@teste.com` → `/candidato/avaliacao/f73682b6-...` mostra os cards
  dos testes; SJT-MC com 3 cenários (opções embaralhadas, sem peso/tag), caso aberto
  (Mariana), Big Five 120 itens. **BUG pego e corrigido: `avaliacaoService` filtrava
  perguntas por status='ativo' mas o canônico é 'active' → tela vinha vazia (fix F4,
  commit 686c460).**
- **#2 SJT scoring (AVAL-03): ✅ PASS — IA real provada em PROD pela 1ª vez.**
  `pontuar_sjt` (MC) → 10/12 sucesso. `avaliar-redacao` (caso aberto) → 7/25
  pendente_humano com 5 dimensões BARS + red_flags (a IA avaliou contra a rubric).
  O caminho que era 100% quebrado pré-C1/C2 funciona end-to-end.
- **#3 RH scorecard: ✅** scores visíveis nas telas de entrevista/decisão.
- **#4 back-lock:** server-side já verificado (42501); UX de autosave não re-observado.
- **Fragilidade:** `avaliar-redacao` ~38s + overload transiente da Anthropic (1º 500,
  OK no retry). Devolutiva Big-Five não grava (timeout de 5 IA calls).

## Current Test
[server-side guarantees verified via RLS/SQL; flow itself unexercised — 0 candidaturas at avaliacao_assincrona, 0 respostas, 0 scores]

## Tests

### 1. Full candidate assessment flow (AVAL-01/02/09)
expected: Navigate as a real candidato whose candidatura is at `avaliacao_assincrona` → `/candidato/avaliacao/:candidatura_id`. Glass shell, one neutral card per teste (Pendente/Concluído + tempo). Open SJT MC: radio options (shuffled, no peso/tag visible), soft timer, "Salvo automaticamente" affordance. Submit (confirm dialog) → card flips to "Concluído". Candidate sees ZERO score/threshold/percent.
result: [pending — visual; **BLOCKED on data**: 0 candidaturas are at etapa=avaliacao_assincrona (all 6 sit at triagem). An RH must advance a candidatura to avaliacao_assincrona before this flow can be opened. The answer-key hiding (no peso/tag to candidate) is verified server-side in #2.]

### 2. SJT open-case AI scoring (AVAL-03) — **re-test after the C1/C2 fix**
expected: Answer the dentista open-case (200-500 words) → submit → `avaliar-redacao` EF (redeployed 2026-06-09 with the fixed `{candidatura_id, pergunta_id, texto}` contract + pergunta-by-id lookup) scores via `work_sample_sjt` prompt → `scores_candidato` row tipo='sjt' subtipo='caso_aberto' with a rubric-WEIGHTED composite 0-25 (dentista 25/20/25/15/15), citacoes, red_flags. `<13/25 OR red_flag OR insufficient_evidence` → status='pendente_humano'. **This path was 100% broken pre-fix (code-review C1/C2) — verify it now works end-to-end.**
result: [pending — needs a real candidatura at avaliacao_assincrona + AI call. **Infra confirmed:** EF `avaliar-redacao` deployed (v2, ACTIVE, verify_jwt:true); `pontuar_sjt` exists + SECURITY DEFINER; answer-key table `perguntas_opcao_sjt` has NO candidato/anon SELECT policy (gabarito protected — verified pg_policies). Cannot exercise the AI scoring until data exists.]

### 3. RH scorecard (AVAL-02/03)
expected: As RH, the scorecard shows the MC per-item breakdown (NO "Sugestão da IA" badge — MC is deterministic, fixed post-UI-review) + the open-case BARS dimensions + SugestaoIABadge on the AI (open-case) block only + "Requer revisão humana" on pendente_humano. As candidato role → 0 rows from scores_candidato.
result: [pending — visual for the RH view. **"candidato → 0 rows from scores_candidato" PASSES server-side:** `scores_candidato` has only `rh_le_scores` (SELECT, rh/administrador); no candidato policy → candidato reads 0 rows (verified pg_policies). The RH visual breakdown needs ≥1 score row to inspect.]

### 4. Autosave 30s + back-lock (AVAL-09)
expected: Observe the 30s debounced autosave; advance the etapa past avaliacao_assincrona (RH action) then attempt to edit → neutral "Sua etapa avançou…" locked state (no error toast). MC re-submit after etapa advance is server-blocked (42501).
result: [pending — visual for autosave/locked-state. **Server-side back-lock PASSES:** `respostas_avaliacao` write policy `cand_escreve_respostas_aval` (ALL) requires `c.etapa_atual = 'avaliacao_assincrona'`; once etapa advances, writes are RLS-denied (42501). SELECT stays open (`cand_le_respostas_aval`) so the candidate can still view. Verified via pg_policies; the 30s autosave UX still needs human observation.]

## Summary
total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 1

## Technical evidence (2026-06-09, read-only)
- Server-side guarantees VERIFIED via pg_policies:
  - Answer-key protected: `perguntas_opcao_sjt` → only `rh_gerencia_opcoes_sjt` (ALL, rh/admin), no candidato SELECT.
  - Back-lock (#4): `respostas_avaliacao` write gated on `etapa_atual='avaliacao_assincrona'` → 42501 after advance.
  - Candidato → 0 scores (#3): `scores_candidato` SELECT only for rh/admin.
- EF `avaliar-redacao` v2 ACTIVE (C1/C2 contract fix deployed, commit c183cd3). `pontuar_sjt`/`get_opcoes_sjt` SECURITY DEFINER.
- DATA BLOCKER: 0 candidaturas at avaliacao_assincrona, 0 respostas_avaliacao, 0 scores_candidato → the live flow + AI scoring (#1, #2, and the visual halves of #3/#4) cannot be exercised until an RH advances a candidatura.

## Gaps
(code-review C1/C2 — open-case submit contract was fully broken, FIXED commit c183cd3 + EF redeployed; UAT #2 verifies live)
(UI-review 17/24 — typography/spacing drift + MC already-submitted read-only state → Phase 16 hardening; MC SugestaoIABadge mislabel FIXED)
(I2 — per-card "Tempo estimado" is a constant ~10 min placeholder until wired to perguntas.tempo_est_min — Phase 16/backlog)
