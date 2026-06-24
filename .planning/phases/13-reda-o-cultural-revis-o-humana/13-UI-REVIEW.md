# Phase 13 — UI Review

**Audited:** 2026-06-24
**Baseline:** `13-UI-SPEC.md` (approved 2026-06-23) + Beauty Smile glass design system
**Screenshots:** Captured the two target routes, but both redirect to the auth login gate unauthenticated (`/candidato/redacao/:id` and `/rh/candidato/:id/redacao` are auth + role + data gated). Live visual capture of the actual essay editor and RH review surfaces is not possible without a seeded session — this audit is **code-based** for both surfaces. The captures confirm only that the glass-over-gradient shell and `#00109E` brand surface render correctly.
**Stance:** Advisory / non-blocking. No commit.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All 27 contracted strings present verbatim; RNF-07a neutral framing held; pt-BR clean. |
| 2. Visuals | 4/4 | Clear focal hierarchy on both surfaces; `SugestaoIABadge` on every AI block; essay panel is the dominant RH zone. |
| 3. Color | 4/4 | RNF-07a color separation **perfectly clean** — zero triage/score/verdict leak to the candidate; accent stays rare. |
| 4. Typography | 3/4 | A 5th `text-*` size (`text-xs`) appears on the RH side, one beyond the declared 4-size contract. |
| 5. Spacing | 4/4 | Every value on the 4px scale; `min-h-[44px]` touch floor honored; no arbitrary off-scale spacing. |
| 6. Experience Design | 3/4 | Loading/error/empty/locked/disabled states all covered; gaps are a11y-adjacent (Phase 16 scope) + two interaction edges. |

**Overall: 22/24**

---

## Top Priority Fixes

1. **`text-xs` is a 5th typography size on the RH panel (off-contract)** — The spec declares exactly 4 sizes (`text-sm` / `text-base` / `text-xl` / `text-3xl`). `RedacaoReviewPanel.tsx` uses `text-xs` 7× for the "Raciocínio" / "Citações" micro-labels (lines 96, 107) and `RedacaoOverrideForm.tsx` uses it for the BARS-helper / dúvida-helper / threshold note (lines 204, 235, 296). *Impact:* a sub-14px tier the contract does not sanction; weakens the "exactly 4 sizes" discipline and risks legibility on the load-bearing reading panel. *Fix:* promote those micro-labels to `text-sm` (with the existing `text-white/50` muting carrying the de-emphasis), or formally amend the spec to admit a 12px caption tier — pick one and make it deliberate. (Phase 16-eligible polish; advisory.)

2. **Candidate submit-disabled tooltip is a native `title` on a `<span>`, not a Radix tooltip** — `RedacaoEditorScreen.tsx:339-345` wraps the disabled `GlassButton` in `<span title="A redação precisa ter entre 200 e 500 palavras.">`. *Impact:* a disabled button does not fire pointer events in many browsers, so the wrapping-span `title` is the only hint surface — and native `title` is keyboard-inaccessible and slow to appear. The RH override form has the identical pattern (`RedacaoOverrideForm.tsx:307`). *Fix:* the visible `RedacaoCounter` helper ("{N} palavras — mínimo 200") already communicates the gate inline, so this is belt-and-suspenders; if keeping it, migrate to the vendored Radix `Tooltip` (already used in `RedacaoCorBadge`) for a11y parity. (Phase 16.)

3. **J/K queue navigation is hinted but not implemented; A/R/D fire on a global keydown that can mis-trigger** — The `?` hint copy promises "J/K: próxima/anterior · A: aprovar · R: reprovar · D: dúvida" (`13-UI-SPEC.md` line 197), and `RedacaoSidebar` is the queue, but no J/K handler exists in `RedacaoOverrideForm.tsx` (only A/R/D at lines 174-194) and the panel never advances selection. Separately, the A/R/D handler is a `window` keydown that only guards `TEXTAREA`/`INPUT` (line 178) — pressing `a`/`r`/`d` while the page is focused but not typing immediately stages a decision and opens the confirm dialog, even before notes are written (the `notasOk` guard blocks the *save*, but the keypress still flips the radio). *Impact:* the documented J/K nav is a dead affordance; the A/R/D shortcut can surprise a reviewer mid-read. *Fix:* implement J/K against the sidebar's `setSelectedId`, and scope the A/R/D listener to the review panel container (or require focus on the form) rather than `window`.

### Additional recommendations (minor)

4. **Sidebar default filter can hide the only pending essays** — `RedacaoSidebar` defaults to `vermelho+amarelo` (correct per spec), but if every pending essay is `verde`, the list renders "Nenhuma redação pendente de revisão." while the parent `rows.length > 0`. The auto-select (`rows[0]`) still picks a verde essay into the right panel, so the sidebar empty-text contradicts the populated reading panel. *Fix:* when the filtered set is empty but `items` is not, show "Nenhuma vermelha ou amarela — {N} verde(s) sob demanda." to reconcile.

5. **`tab === 'duvidas'` cast `as never` on the hook options** — `RedacaoReviewPanel.tsx:164` passes `{ enabled: ... } as never` to `useDuvidasGestor`. Per the project's own `feedback_integration_contract_gap` learning, `as never` masks a type-contract gap; drop it once the hook's options type is regenerated. (Non-visual; flagged for hygiene.)

6. **Essay reading panel renders raw text with no max-width measure** — `EssayPanel` (`RedacaoReviewPanel.tsx:136`) renders the full essay at `text-base leading-relaxed` inside the 65% column with `whitespace-pre-wrap` but no `max-w-prose` / measure cap. On a 1440px+ desktop the 65% column is ~850px wide; 16px text at that measure exceeds the ~75ch comfortable-reading line length the PRD RF-R-22 "careful reading" intent implies. *Fix:* add `max-w-prose` (or `max-w-[70ch]`) to the essay `<p>`.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

Verified all 27 contracted strings present **verbatim**:

- **Candidate** — "Redação cultural" (`RedacaoEditorScreen.tsx:303`), "Enviar redação" (358), "Resposta registrada. Você pode revisar até concluir a etapa." (180), "Redações concluídas." (274), "Salvo automaticamente" (78), "{N} palavras — mínimo 200" / "máximo 500" (`RedacaoCounter.tsx:79-81`), "A redação precisa ter entre 200 e 500 palavras." (343), "Sua etapa avançou." (211), "Nenhuma redação pendente" (254), "Não foi possível carregar a redação." (239), "Próxima pergunta" (386), "Tempo estimado: 15-25 min" (314), "Tempo nesta redação: {mm:ss}" (`RedacaoCronometro.tsx:50`).
- **RH** — "Ajuste por dimensão" (`RedacaoOverrideForm.tsx:201`), "Justificativa da revisão (obrigatória)" (241), "{N}/50 — mínimo 50 caracteres" (259), "Dúvida — escalar ao gestor" (275), "Salvar revisão" (314), "Revisão salva." (193), "Nenhuma redação pendente de revisão." (`RedacaoSidebar.tsx:115`), "Mostrando vermelhas e amarelas." (83), "Filtrar por cor" (90), "Composto e cor recalculados ao ajustar." (235), "Marcada como vermelha por: {regra}." (`RedacaoCorBadge.tsx:103`), "Aprovar redação?" / "Reprovar redação?" (327), "Sugestão da IA — decisão é sempre humana" (via reused `SugestaoIABadge`, wired 4×).
- **RNF-07a copy discipline held**: post-submit is "Resposta registrada." — no score, no quality feedback (`RedacaoEditorScreen.tsx:180`). The back-lock surfaces as the neutral "Sua etapa avançou." `toast.info` (195), never an error.
- Generic-label scan (`Submit`/`OK`/`Cancel`/`Save`) returned zero hits.
- **FLAG (non-blocking, checker-acknowledged):** single-word confirm buttons inside titled dialogs — "Enviar" (372), "Voltar"/"Reprovar"/"Aprovar" (336-347). This is the approved Phase 11/12 convention; the titled `AlertDialogTitle` supplies the verb context. Not deducted.

### Pillar 2: Visuals (4/4)

- **Candidate focal point:** H1 "Redação cultural" + the large `Textarea` (`rows={14}`) is the unambiguous focal zone; the counter, cronômetro, and autosave affordance are secondary status text. Clear hierarchy via size (`text-xl` H1 → `text-base` body → `text-sm` status).
- **RH focal point:** the spec mandates the essay-text panel as the dominant zone — honored via the `lg:grid-cols-[35%_65%]` split (`RedacaoReviewPanel.tsx:271`), with the full essay on the 65% side and the Salvar CTA anchoring the 35% left panel.
- **`SugestaoIABadge` on every AI-derived block** — 4 instances: the "Análise da IA" header (`variant="full"`, line 69), each per-dimension score row (`compact`, 82), the Raciocínio block (`compact`, 99), and the slider group header (`compact`, `RedacaoOverrideForm.tsx:202`). The RNF-07a "decisão é sempre humana" guardrail is visually pervasive on the RH surface.
- **Icon-only buttons:** none unlabeled. The vermelho badge's `AlertTriangle` is `aria-hidden` with the rule named in the tooltip (`RedacaoCorBadge.tsx:98-103`); the `CorBadge` carries `aria-label="Triagem {Cor}"` (50).
- **Visual hierarchy through severity:** sidebar sorts vermelho→amarelo→verde (`COR_SEVERITY`, `RedacaoSidebar.tsx:26,61`) and auto-selects the most-severe pending essay first (`RedacaoReviewPanel.tsx:170-173`) — the highest-risk essay is the default focus.

### Pillar 3: Color (4/4)

This is the make-or-break pillar for Phase 13, and it is **clean**.

- **RNF-07a color separation — zero leak to the candidate.** A targeted grep of the three candidate files (`RedacaoEditorScreen`, `RedacaoCounter`, `RedacaoCronometro`) for `emerald-*`, `red-300/400/500`, `amber-500`, `verde`/`amarelo`/`vermelho`, `score`, `threshold`, `aprovado`/`reprovado`, `/100`, `composto` returned **only two matches — both code comments asserting the rule** (`RedacaoEditorScreen.tsx:18,179`). No triage tint, no numeric score, no pass/fail color, no verdict reaches the candidate.
- **Candidate counter code-of-colors** matches the spec's 3-band rule exactly (`RedacaoCounter.tsx:85-90`): `<200` → muted `text-white/60`; `200-500` → accent `#35BFAD` (inline `style`, in-range = "valid band"); `>500` → warm `text-amber-300/80`. Critically, **below-min is muted, never alarm-red** — the "too short ≠ you failed" RNF-07a distinction is honored.
- **Accent (`#35BFAD`) stays rare and reserved** — 6 hardcoded occurrences, all on the sanctioned list: candidate autosave check (`RedacaoEditorScreen.tsx:76`), all-done check icon (273), the in-range counter (`RedacaoCounter.tsx:90`), and the RH `SugestaoIABadge` tint (in the reused badge). Not used on the candidate CTA, RH decisão buttons, or slider fills — those use glass-white (`bg-white/20`→`bg-white/30`), exactly as the contract demands.
- **RH 3-color triage tints** match the spec verbatim (`RedacaoCorBadge.tsx:26-30`): verde `bg-emerald-500/15 text-emerald-300 border-emerald-400/30`, amarelo `amber-500/15…`, vermelho `red-500/15…`. The emerald verde is correctly distinct from the `#35BFAD` accent role.
- **Destructive `#EF4444`** appears 3×, all sanctioned: candidate + RH load-failed `AlertCircle` iconography (`RedacaoEditorScreen.tsx:237`) and the Reprovar confirm action tint (`RedacaoOverrideForm.tsx:344`). Never used for the below-min counter.
- Dominant `#00109E` (gradient candidate / solid RH panel) + secondary translucent-white glass follow the 60/30/10 split. No off-palette hardcoded colors.

### Pillar 4: Typography (3/4)

- **Weights: 2, compliant.** Only `font-semibold` (29×) and `font-normal` (1×) — no 500/700/800. Matches the "exactly 2 weights" contract.
- **Sizes: 5 distinct, one over contract.** Found `text-2xl` (2×), `text-base` (5×), `text-sm` (31×), `text-xl` (8×), `text-xs` (7×). The spec declares 4 roles: `text-sm` / `text-base` / `text-xl` / `text-3xl` (with `md:text-4xl` as a responsive cap). Two deviations:
  - `text-2xl` (the candidate H1 on the locked/all-done/empty states, `RedacaoEditorScreen.tsx:211,274`) is *smaller* than the declared `text-3xl` page-heading role — a minor inconsistency with the spec's H1 size, but it inherits the Phase 11/12 candidate state-screen precedent (those state cards use `text-2xl`), so it's a continuity choice, not a regression.
  - **`text-xs` is a genuine 5th tier** not in the contract — used for RH micro-labels: "Raciocínio"/"Citações" (`RedacaoReviewPanel.tsx:96,107`), the BARS-scale helper, the recompute note, and the dúvida helper (`RedacaoOverrideForm.tsx:204,235,296). This is the one real deduction (see Top Fix #1).
- **Essay reading typography is correct** — the load-bearing RH essay text is `text-base leading-relaxed` (≈16px/1.625, `RedacaoReviewPanel.tsx:136`), the one place line-height goes to 1.6+ per spec. The candidate textarea is `text-base leading-normal` (16px/1.5). Neither compresses below 16px.
- **14/16 weight-differentiation honored** — `text-sm font-semibold` labels vs `text-base` (regular) body, as the spec intends.

### Pillar 5: Spacing (4/4)

- **All values on the 4px scale.** Distribution: `gap-2` (12×), `p-6` (8×), `space-y-2` (7×), `p-12` (6×, the state-screen vertical padding per spec's 2xl token), `space-y-1/3/4/6` (sections), `gap-1.5` (icon-to-label in the autosave affordance). No off-scale odd values.
- **Touch-target floor honored** — `min-h-[44px]` appears 6× on every candidate CTA + RH action/filter/tab button (`RedacaoEditorScreen.tsx:351,384`, `RedacaoOverrideForm.tsx:285,312`, `RedacaoSidebar.tsx:101`, `RedacaoReviewPanel.tsx:219`). This is the sanctioned on-scale exception (44 = 4×11).
- **Container rhythm matches the inherited shell** — candidate `py-20` + `max-w-2xl` (`RedacaoEditorScreen.tsx:402,405`), RH panels at `p-6` inside the `space-y-6` column. Consistent with the Phase 11/12 4/4 spacing baseline.
- **Heights on-scale:** `min-h-24` (notes textarea), `h-48`/`h-64`/`h-8` (skeletons) are all Tailwind-scale values, not arbitrary px.
- No arbitrary `[Npx]` spacing outside the `[44px]` touch floor.

### Pillar 6: Experience Design (3/4)

State coverage is strong; deductions are interaction-edge + a11y-adjacent (mostly Phase 16 scope).

- **Loading:** candidate has an `animate-pulse` glass skeleton (`RedacaoEditorScreen.tsx:226`); RH has a `Skeleton` block (`RedacaoReviewPanel.tsx:256-259`). The container also handles `resolvingVaga || isLoading` combined.
- **Error:** candidate load-failed state with "Tentar novamente" `refetch` (239-245); RH "Não foi possível carregar a fila de revisão." (262); save errors via `toast.error` on both `onError` paths.
- **Empty:** candidate "Nenhuma redação pendente" (254) + the `!pergunta` fallback (289); RH "Nenhuma redação pendente de revisão." (`RedacaoSidebar.tsx:115`) + the dúvidas-empty (`RedacaoReviewPanel.tsx:234`).
- **Locked / back-lock:** candidate `locked` → neutral "Sua etapa avançou." (206-221); the etapa-gate also surfaces in the container. RNF-07a-safe (never an error toast).
- **All-done:** candidate "Redações concluídas." with the `#35BFAD` check (269-283).
- **Disabled gating:** submit disabled until `submitEnabled && isValid && !submitting` (350); Salvar disabled until `notasOk && decisao && !saving` (305). Sliders/textarea disabled while `saving`.
- **Confirmation for irreversible/destructive:** candidate submit `AlertDialog` (363-375); RH Aprovar/Reprovar `AlertDialog` with the Reprovar action tinted `#EF4444` (318-351); Dúvida escalates inline with no destructive confirm, per spec.
- **Autosave + optimistic UI:** `useAutosaveAvaliacao` reused; the `localSubmitted` immutable-Set pattern (`RedacaoEditorScreen.tsx:116-121`) makes the all-done / next-question UI update instantly before the `minhas` refetch — a deliberate, correct fix.

**Deductions:**
- **J/K queue nav is hinted but unimplemented** and the A/R/D `window`-scoped keydown can mis-fire (Top Fix #3).
- **Sidebar empty-filter / populated-panel contradiction** when all pending essays are verde (Recommendation #4).
- **a11y gaps** (Phase 16 scope per CONTEXT): the disabled-button `title` tooltip is keyboard-inaccessible (Top Fix #2); the essay reading panel lacks a measure cap (Recommendation #6). aria coverage is present but thin (`aria-label` 2×, `aria-pressed` 2×, `aria-hidden` 1×, `htmlFor` 2×, `role` 1×).

---

## RNF-07a Compliance Statement

The defining risk of this phase — the candidate seeing the RH-only 3-color triage / score / verdict — is **fully mitigated in code**:
- The candidate files contain **no** triage tint, numeric score, threshold, composite, or aprovado/reprovado string (verified by negative grep; only rule-asserting comments matched).
- The candidate counter's colors are length-band guidance (`#35BFAD` in-range, muted below-min, amber above-max), never a quality verdict, and below-min is muted rather than alarm-red.
- The 3-color system, BARS sliders, composite `/100`, and decisão controls live exclusively in `src/features/triagem/` (RH surface), which the candidate cannot reach (route role-gate + RLS deny + allowlist read).

This is the single most important contract in Phase 13, and it passes cleanly.

---

## Registry Safety

`components.json` exists (shadcn initialized). Per `13-UI-SPEC.md` §Registry Safety: **no third-party registries declared** — all primitives (`textarea`, `slider`, `radio-group`, `label`, `badge`, `button`, `card`, `alert-dialog`, `progress`, `skeleton`, `tabs`, `tooltip`) are shadcn-official and already vendored in `src/components/ui/` since M1/Phase 7. Registry audit: **0 third-party blocks checked, no flags.** No suspicious-pattern scan required.

---

## Files Audited

- `src/features/avaliacao/components/RedacaoEditorScreen.tsx` (candidate essay editor — shell, textarea, counter, cronômetro, autosave, submit dialog, all states)
- `src/features/avaliacao/components/RedacaoCounter.tsx` (3-band word counter, code-of-colors)
- `src/features/avaliacao/components/RedacaoCronometro.tsx` (informative elapsed timer)
- `src/features/avaliacao/components/AvaliacaoContainer.tsx` (parent container — essay card entry point, context)
- `src/features/triagem/components/RedacaoReviewPanel.tsx` (RH 1-at-a-time review, two-column 35/65, Análise IA, tabs)
- `src/features/triagem/components/RedacaoOverrideForm.tsx` (BARS sliders, notes ≥50 gate, decisão radio, A/R/D shortcuts, confirms)
- `src/features/triagem/components/RedacaoSidebar.tsx` (severity-sorted queue, color filter)
- `src/features/triagem/components/RedacaoCorBadge.tsx` (3-color triage chip + vermelho rule-tooltip badge)
- `src/features/triagem/components/SugestaoIABadge.tsx` (reused — verified copy source for the AI guardrail)

**Screenshots:** `.planning/ui-reviews/13-20260624-135642/` (both routes redirect to auth gate; documentary only, gitignored).
