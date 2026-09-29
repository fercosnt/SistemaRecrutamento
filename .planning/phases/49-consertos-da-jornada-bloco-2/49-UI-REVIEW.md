# Phase 49 — UI Review

**Audited:** 2026-09-29
**Baseline:** abstract 6-pillar standards (no UI-SPEC.md for this phase)
**Screenshots:** not captured (code-only audit, by instruction: no dev server against PROD data, no PROD login)
**Interaction captures:** off (workflow.ui_interaction_capture is false). Every interaction finding below is code-derived, not observed.

Scope: 26 non-test front-end files changed by the phase (2152 insertions). Most of the 29 plans are SQL or Edge Function work. The audit covers the front-end surfaces those plans touched. The .gitignore gate for `.planning/ui-reviews/` was run.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Honest, specific state copy. Some generic or hardcoded strings remain (`Salvar Alterações`, `mínimo 50`, `Intel`). |
| 2. Visuals | 3/4 | The provenance badge is one component used everywhere. In DecisaoFinalPage the ranking shows bare `C1`/`C2` with no candidate name. `truncate` clips the new `aguardando revisão` state on the card. |
| 3. Color | 3/4 | Neutral-for-no-score is applied consistently. Amber means "contingency" in two places. The neutral grays are inconsistent, and several copy lines are at 40–50% white. |
| 4. Typography | 3/4 | Weights are disciplined (semibold dominates). There is a `text-[10px]` in the comparativo and 8 size steps. |
| 5. Spacing | 3/4 | The touch-target floor (44px) is applied to new controls. The comparativo uses 40px and arbitrary min-widths. |
| 6. Experience Design | 3/4 | Loading, error, empty, and blocked states are handled well. Gaps: radiogroup keyboard support, an unreachable disabled-checkbox reason, and no error state on DecisaoFinalPage queries. |

**Overall: 18/24**

No pillar is a 1 and there are no BLOCKERs. Every score of 3 is backed by the WARNINGs below. None of them breaks a task flow. Several affect the human review the phase was meant to protect.

---

## Top 3 Priority Fixes

1. **DecisaoFinalPage comparativo shows only `C1`/`C2` labels** (WARNING). `resolveFinalistCandidates` sets `nome: r.nome || r.candidate_id`, and `listFinalistas` returns no names. The RH user is ranking finalists for a final decision without seeing who is who. The 49-22 fix made the mapping correct by key, but the user still cannot verify it. Fix: resolve names from `posicoes` (candidatura id) through an existing RH-scoped read, as `ComparativoCandidatosPage` does via `selection`. If names are withheld on purpose, add a visible "Candidato C1 = candidatura ...abcd" reference so the label can be checked.
2. **ScoreCard clips the new state text** (WARNING). `ScoreCard.tsx:132/147/160` apply `truncate` to a value inside a 2-column grid card (`grid-cols-2`, `min-w-0 flex-1`). `aguardando revisão` (Cultura) will be cut with an ellipsis on narrow cards, and it carries the whole meaning of the state. Fix: drop `truncate` and use `break-words` or `leading-tight`, or shorten the label to `em revisão`. Also unify the "neutral" colour (`COR_NEUTRA` is `text-white/70`, but the Cultura no-note case uses `text-white/50`).
3. **TranscricaoReviewPanel `role="radio"` group has no keyboard model** (WARNING). At `TranscricaoReviewPanel.tsx:~520-540` the buttons declare `role="radio"` and `aria-checked` but have only `onClick`. A radiogroup must be one tab stop with arrow-key movement. As built, a keyboard or screen-reader user gets N tab stops that announce as radios but do not behave like radios. This selector gates which interview the AI analysis is filed under. Fix: use the existing Radix `RadioGroup` from `components/ui`, or implement roving `tabIndex` with ArrowLeft/Right handlers.

Additional fixes (4-8), in priority order:

4. **TriagemTable: the reason for a disabled checkbox is unreachable** (`TriagemTable.tsx:300-314`). A disabled `Checkbox` is not focusable. The tooltip sits on a wrapping `<span>`, so keyboard and touch users never see "Candidatura encerrada não entra no comparativo." Give the span `tabIndex={0}` and an `aria-describedby` with the reason, or show the reason as visible text next to the "Encerrada" badge (which already exists in the same row).
5. **UpdateStatusModal contradicts itself when there is no transition** (`UpdateStatusModal.tsx:221-238, 336-357, 304-310`). It says "não pode ser alterado por aqui", yet it still shows a permanently disabled `Salvar Alterações` button and the "Mudar o status aqui não envia e-mail" note. Hide the save button and the email note in that branch, and make Cancelar read "Fechar". Also, `validationError` "Selecione um status para continuar" (line 160) can never fire, because the submit button is disabled when `!novoStatus`. It is dead code.
6. **Minimum-length copy is hardcoded** (`UpdateStatusModal.tsx:278`: `"(mínimo 50 caracteres)"`), while the counter uses `JUSTIFICATIVA_MIN`. Interpolate the constant, or the placeholder and the counter will drift apart the day the constant changes. This is the same class of defect the phase fixed elsewhere (D-59).
7. **Low-contrast supporting text** on the glass background: `RedacaoReviewPanel.tsx:171` (`text-white/40` for citation location), `LiberacaoCognitivoBlock.tsx:107,121,129` (`text-white/50` on `text-xs`), `ScoreCard` "não fez" (`text-white/50`), `TriagemTable.tsx:478`. Raise to at least `/70` for anything a reviewer needs to read. A 12px string at 50% white on saturated blue is unlikely to reach 4.5:1.
8. **Comparativo `text-[10px]`** (`ComparativoScreen.tsx:285, 381`) is below the phase's own 12px floor (`text-xs`) and was added next to the new provenance badge. Use `text-xs`.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

Strengths (evidence-based):
- Provenance copy is centralised and pinned (`ProvenienciaIABadge.tsx:60-69`). It says "modelo não registrado" instead of staying silent. The same string feeds the screen and the PDF.
- Empty and blocked states name the reason and the next step. Examples: `DecisaoFinalPage.tsx:223-244` (below the minimum vs above the ceiling, the two cases are distinguished), `SEM_RESULTADO_IA_COPY` in `ComparativoScreen.tsx` ("Isto não é falha de conexão: fale com o administrador"), and `UpdateStatusModal.tsx:226-237`.
- The product-language rule holds: I found no "teste psicológico" in the audited files. `LiberacaoCognitivoBlock` uses "Avaliação de raciocínio".
- The RH-facing screens no longer show a percentile or hit count (LiberacaoCognitivoBlock, ScoreCard). This matches RNF-07a/UX-07.

Findings:
- WARNING `UpdateStatusModal.tsx:356` `Salvar Alterações` is generic, and the action can be a rejection. Use a verb tied to the outcome (`Registrar rejeição` / `Aprovar para próxima etapa`).
- WARNING `UpdateStatusModal.tsx:278` hardcoded `mínimo 50` (see fix 6).
- WARNING `ScoreCard.tsx:143` `Intel` is an unexplained abbreviation, and the cell has no tooltip. It reads oddly beside "Big Five" and "Cultura". Use `Raciocínio` (the label `LiberacaoCognitivoBlock` already uses, so the two screens stay consistent).
- WARNING The `AiLogsPage` state label `Fallback` is an English technical term in an otherwise pt-BR screen. The `ProvenienciaIABadge` says "modelo de contingência". Use one vocabulary (`Contingência`).
- WARNING The `TranscricaoReviewPanel` copy for the interview-type selector reads: "…uma análise com o tipo errado supera a análise da entrevista errada." That sentence is hard to parse, and the verb `supera` collides with the "superada" state used elsewhere in the same panel. Rewrite it in plain words.

### Pillar 2: Visuals (3/4)

Strengths:
- One provenance badge (`ProvenienciaIABadge`) is used across comparativo, decisão final, redação, guia, and análise. Icon plus text plus amber for contingency means the state is not colour-only.
- A clear focal point on the modal and on the card (ScoreGeral is set apart with `text-2xl`).
- Icon-only usage is covered: the new icons carry `aria-hidden` next to text.

Findings:
- WARNING DecisaoFinalPage anonymous labels (Top fix 1).
- WARNING ScoreCard truncation (Top fix 2).
- WARNING `ScoreCard.tsx:107` `animate-pulse` on the Score Geral dot is a permanent decorative animation with no `motion-reduce:` variant. The Score Geral itself is hidden when null (0 of 39 in PROD), so this is minor.
- WARNING The "Encerrada" badge is defined three times with near-identical classes (`KanbanBoard`, `TriagemTable`, plus the ProvenienciaIABadge non-amber variant). Extract a shared `SeloEncerrada`, or the three will drift. The phase's own theme (one source of truth) applies here.

### Pillar 3: Color (3/4)

Findings:
- Positive: neutral gray for absent scores (`COR_NEUTRA`) prevents "red zero" from meaning no data. Amber is reserved for contingency in `ProvenienciaIABadge`, `AiLogsPage` (`ai-log-fallback`), and `RedacaoRubricaVersaoAviso`.
- Accent use is restrained. The teal `#35BFAD` is used on the primary actions and on `LiberacaoCognitivoBlock` headings.
- WARNING Hardcoded hex values in components: `#35BFAD` (about 8 sites), `#00109E` (`ComparativoScreen.tsx:146,410`, `UpdateStatusModal.tsx:255`, `TriagemTable.tsx`). These should be design tokens. This is pre-existing and was not introduced by the phase, but the phase added more sites.
- WARNING Neutral gray is used at 70% in `ScoreCard` for Big Five and Intel and at 50% for Cultura "não fez". The same meaning has two greys.
- WARNING `ScoreCard.tsx:70` `if (!score) return 'text-white/50'` treats a real score of `0` the same as "no score". After the phase, only human-reviewed notes reach this function, and a genuine 0 would be greyed.
- WARNING Low-contrast opacity levels (see fix 7). Usage across the audited files: `/40` x5, `/50` x10, `/60` x21.
- Distribution: not measurable without a rendered page; code review only.

### Pillar 4: Typography (3/4)

Distribution across the 11 audited files: `text-sm` 85, `text-xs` 41, `text-base` 26, `text-xl` 11, `text-2xl` 4, `text-lg` 1, `text-3xl` 1, `text-4xl` 1. Weights: `font-semibold` 99, `font-bold` 3, `font-medium` 3.

- Weights are in good shape: essentially one weight for emphasis.
- WARNING Eight distinct size steps across 11 files is at the top edge of a reasonable scale. The count comes from the page heading (3xl/4xl) and stat text (2xl), so it is defensible, but `text-lg` is used once (`LiberacaoCognitivoBlock.tsx:122`). Fold it into `text-xl` or `text-base`.
- WARNING `text-[10px]` in `ComparativoScreen.tsx:285,381` (fix 8).
- Inputs use `text-base`, which avoids the iOS zoom on focus. Good.

### Pillar 5: Spacing (3/4)

- Positive: new interactive elements use `min-h-[44px]` (tabs in `DecisaoFinalPage`, buttons in `LiberacaoCognitivoBlock`, radio buttons in `TranscricaoReviewPanel`). Vertical rhythm uses `space-y-2/3/4/6` on the Tailwind scale.
- WARNING `ComparativoScreen` action buttons are `min-h-[40px]` (lines 251, 410, 448), below the 44px used in the same phase elsewhere. That is the RH-facing "Avançar/Rejeitar" pair on the decision-critical screen.
- WARNING Arbitrary widths: `min-w-[160px]`, `min-w-[200px]`, `max-w-[62ch]` (`LiberacaoCognitivoBlock`). The comparativo table is horizontally scrolling by design; the arbitrary widths are acceptable there, but should be noted for narrow desktop viewports.
- Not verified: responsive behaviour at 768 and 375. There are no screenshots. The ScoreCard grid (`grid-cols-2`) is the most likely place to fail on a narrow card.

### Pillar 6: Experience Design (3/4)

State coverage (code-derived):
- Loading: `Skeleton` in `LiberacaoCognitivoBlock` and `DecisaoFinalPage` dashboard. The comparativo uses `AsyncState` with loading, slow, error, and retry.
- Error: typed error codes (`MIXED_VAGA`, `SEM_RESULTADO_IA`) map to specific copy.
- Empty and blocked: the below-minimum and above-ceiling comparativo states, the no-transition modal, the "Ainda não liberada" state, and the encerrada selo are all present.
- Destructive action: rejection goes through the audited `registrar_decisao` with a 50-character justification and a live counter (`UpdateStatusModal`). The system does not auto-reject on score (RNF-07a): the SugestaoIABadge remains on the AI outputs and the phase removed numeric scores from the RH hub. That point is satisfied.

Findings:
- WARNING TranscricaoReviewPanel radiogroup a11y (Top fix 3).
- WARNING TriagemTable disabled-checkbox reason unreachable by keyboard and touch (fix 4).
- WARNING `DecisaoFinalPage.tsx:113-131` three `useQuery` calls (`vaga`, `finalistas`, `decisaoAtual`) have no error branch. If `listFinalistas` fails, `finalistIds` is empty and the Comparativo tab tells the user "Ainda não há o que comparar. Hoje há 0" — a false statement caused by a failed read, not by absence of data. The screen shows an empty state in place of an error state. Add `isError` handling with a retry.
- WARNING `LiberacaoCognitivoBlock.tsx:58-60` handles `isLoading` only. A failed query yields `data === undefined`, so the block renders "Ainda não liberada" (line 143). That is again an error rendered as an empty state, and it invites an RH user to click "Liberar avaliação" on a candidate whose real state is unknown. The `liberar`/`revogar` mutations also have no visible error feedback in this component (there is no `onError` UI here; a toast in the hook would cover it, unverified).
- WARNING `UpdateStatusModal` no-transition branch (fix 5) and dead validation.
- WARNING `AiLogsPage` `causaLegivel` falls back to the raw error code when the cause is unknown (`?? causa`). It is acceptable for an admin log, but that text is unlocalised.
- Not verified without a browser: focus management on modal open/close, focus ring visibility on the glass surfaces, and touch behaviour of tooltips.

---

## Registry Safety

Skipped: no third-party registry review applies to this phase (no UI-SPEC registry table; the phase adds no shadcn blocks).

## Files Audited

- `/Users/fernando/code/SistemaRecrutamento/src/components/ScoreCard.tsx`
- `/Users/fernando/code/SistemaRecrutamento/src/components/modals/UpdateStatusModal.tsx`
- `/Users/fernando/code/SistemaRecrutamento/src/components/KanbanBoard.tsx` (diff)
- `/Users/fernando/code/SistemaRecrutamento/src/components/pages/ComparativoCandidatosPage.tsx` (diff)
- `/Users/fernando/code/SistemaRecrutamento/src/features/triagem/components/ProvenienciaIABadge.tsx`
- `/Users/fernando/code/SistemaRecrutamento/src/features/triagem/components/ComparativoScreen.tsx` (diff + greps)
- `/Users/fernando/code/SistemaRecrutamento/src/features/triagem/components/TriagemTable.tsx` (diff + checkbox block)
- `/Users/fernando/code/SistemaRecrutamento/src/features/triagem/components/RedacaoReviewPanel.tsx` and `RedacaoOverrideForm.tsx` (diff)
- `/Users/fernando/code/SistemaRecrutamento/src/features/admin/ai-logs/components/AiLogsPage.tsx` (diff)
- `/Users/fernando/code/SistemaRecrutamento/src/features/entrevista/components/TranscricaoReviewPanel.tsx` (diff, copy and radiogroup)
- `/Users/fernando/code/SistemaRecrutamento/src/features/entrevista/components/GuiaEntrevistaPanel.tsx` (diff)
- `/Users/fernando/code/SistemaRecrutamento/src/features/hub-candidato/components/AnaliseIABlock.tsx` and `HubCandidatoRH.tsx` (diff)
- `/Users/fernando/code/SistemaRecrutamento/src/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock.tsx`
- `/Users/fernando/code/SistemaRecrutamento/src/features/decisao/components/DecisaoFinalPage.tsx`

Limits of this audit: the 29 SUMMARY/PLAN files were sampled through their frontmatter and the git history of `src/` (the SQL and Edge Function plans were out of scope). `GuiaEntrevistaPanel`, `RedacaoReviewPanel`, and `TranscricaoReviewPanel` were read through diffs and greps, not line by line. DashboardCandidato was not found among the files changed by the phase and was not audited.
