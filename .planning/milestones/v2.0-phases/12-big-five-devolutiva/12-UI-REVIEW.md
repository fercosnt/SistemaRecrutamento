# Phase 12 — UI Review

**Audited:** 2026-06-23
**Baseline:** Abstract 6-pillar standards + Beauty Smile design system (glass UI, deep-blue `#00109E` base, turquoise accents, candidate mobile-first / RH desktop-first). No UI-SPEC.md exists for Phase 12 — audited against abstract standards.
**Screenshots:** Partially captured. Dev server live on `:3003`, but the Big Five surfaces are behind `RoleGuard` and gated on the **12-06 PROD apply wave (tables + EFs not yet shipped)** per `12-05-SUMMARY.md`. Only the public root (`desktop.png`) was capturable; the questionnaire/devolutiva/scorecard could not be rendered. **This is a code-only audit of the three Phase-12 surfaces.**
**Scope:** `BigFiveQuestionnaireScreen` (candidate), `DevolutivaBigFiveView` (candidate, LGPD-sensitive), `ScorecardAvaliacao` / `BigFiveBreakdown` (RH), with `AvaliacaoContainer` as the entry surface.
**Note:** UI review is **advisory / non-blocking**.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Tone is respectful, neutral and LGPD-aware throughout; but the legally-required disclaimer ships an unrendered placeholder (`Dra. [Nome], CRP-XX/XXXXX`) — a known go-live blocker that is live in the candidate-facing fallback string. |
| 2. Visuals | 3/4 | Clear hierarchy and a consistent glass shell; weakened by the Devolutiva tabs using default light-theme tokens on a dark glass panel, and decorative icons lacking `aria-hidden`. |
| 3. Color | 2/4 | Percentile/progress bars render in the **brand accent** (`bg-primary`) on the devolutiva — a personal psychometric result shown in an "achievement" color, in tension with the file's own "informational, never a judgment" contract. Accent (`#35BFAD`) also hardcoded as an arbitrary value instead of a token. |
| 4. Typography | 3/4 | 8 distinct sizes and 3 weights across the four files — slightly above the ≤4-size / ≤2-weight heuristic, but the surface is content-dense (120-item form + 5-dimension report) so the spread is largely justified. |
| 5. Spacing | 4/4 | Clean, fully token-on-scale spacing (`gap-2`, `space-y-*`, `p-6/8/12`, `py-20`). Zero arbitrary px/rem spacing — every `[44px]` is an intentional WCAG touch-target floor, not an off-scale gap. |
| 6. Experience Design | 3/4 | Excellent state coverage (loading/error/empty/locked/disabled + destructive-confirm). Gap: the 5-point Likert option grid and Progress bars have no programmatic accessible labels, and the devolutiva error state implies an email channel that the context says is only fire-and-forget/deferred. |

**Overall: 18/24**

---

## Top Priority Fixes

1. **Placeholder in the legally-required CFP/CRP disclaimer ships to the candidate** — `DevolutivaBigFiveView.tsx:63-68`. The fallback footer reads `Gerenciada pela Dra. [Nome], CRP-XX/XXXXX (responsável técnica)`. If the EF payload omits `disclaimer_lgpd_crp`, the candidate sees raw template tokens on a compliance-sensitive psychometric report. **Fix:** Block go-live until the real responsible-technician name + CRP registration are in the EF payload AND the fallback constant; until then, if the EF disclaimer is missing, suppress the named-technician sentence rather than render `[Nome]`. (Already tracked — confirmed live at `:65`.)

2. **Percentile bars use the brand accent (`bg-primary`) on the devolutiva** — `DevolutivaBigFiveView.tsx:171` + `progress.tsx:17,24`. The file header explicitly promises "Neutral/professional colors — the percentile is informational, NEVER a red/green judgment," yet the shadcn `Progress` default fills the bar with the turquoise accent, which reads as "higher = better / achievement." On a contextual, non-eliminatory OCEAN profile this visually contradicts the LGPD-respectful framing. **Fix:** Pass a neutral indicator class (e.g. a glass-white/`bg-white/40` fill on a `bg-white/10` track) to the dashboard `Progress`, reserving the accent for the questionnaire's neutral completion bar where "progress = good" is honest.

3. **Devolutiva tabs use default light-theme tokens on a dark glass panel** — `DevolutivaBigFiveView.tsx:181-188`. `TabsTrigger`/`TabsList` inherit `text-foreground` / `data-[state=active]:bg-card` from `tabs.tsx`, which on the deep-blue glass surface produces low-contrast / off-system tab chrome while every sibling element is `text-white`/`text-white/70`. The five OCEAN dimensions are the primary navigation of the report. **Fix:** Style the triggers for the glass context (`text-white/70`, active = `bg-white/20 text-white`) to match the rest of the panel and guarantee legible contrast.

4. **No accessible label on the 5-point Likert grid or the Progress bars** — `BigFiveQuestionnaireScreen.tsx:118-145, 289`. The radio options are labeled per-option, but neither `RadioGroup` nor the `Progress` carries an `aria-label` describing the question/scale, and the percentile `Progress` bars (devolutiva) announce only a bare value. On a 120-item form this is a meaningful screen-reader burden. **Fix:** Add `aria-label={item.texto}` to each `RadioGroup` and an `aria-label` to each Progress (`"Progresso: {n} de 120"` / `"{Dim}: percentil {n}"`).

5. **Decorative icons lack `aria-hidden`** — only `ScorecardAvaliacao.tsx:51` sets it; the `Loader2`, `Lock`, `Check`, `AlertCircle` icons across `BigFiveQuestionnaireScreen` and `DevolutivaBigFiveView` (lines `84, 91, 107, 118, 229, 336`) do not. **Fix:** Add `aria-hidden="true"` to the purely decorative lucide icons (the adjacent text already conveys meaning).

6. **Devolutiva error state over-promises an email channel** — `DevolutivaBigFiveView.tsx:120-121`: "avisaremos por e-mail quando estiver pronta." The Phase-12 context states the n8n email pipeline does not exist and is fire-and-forget/deferred (in-app is the primary channel). **Fix:** Soften to "Atualize esta página em alguns instantes" (or similar) so the UI doesn't commit to a notification that may never send.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

Strong overall. The product language discipline is genuinely good for a sensitive LGPD/psychometric surface:

- **Respectful, non-clinical framing held end-to-end.** `grep -ic "neuroticismo"` = **0** in both `DevolutivaBigFiveView.tsx` and `ScorecardAvaliacao.tsx`; `"Sensibilidade Emocional"` appears **3×** (devolutiva) and **2×** (scorecard). The "N" dimension is never given its clinical pathological name candidate-facing (LGPD-04 / T-12-21 honored).
- **Score-blind questionnaire copy.** The progress feedback is the neutral `{answeredCount}/{BIGFIVE_TOTAL_ITENS}` count (`BigFiveQuestionnaireScreen.tsx:291`) — no score/threshold/pass-fail string, satisfying RNF-07a / T-12-20.
- **Supportive intro + emotional disclaimer** (`:247-255`): "não há respostas certas ou erradas… É um self-assessment do seu estilo de trabalho" plus the "se você estava cansado, com fome…" caveat — exactly the non-judgmental tone the brief asks for.
- **RH scorecard is explicitly non-eliminatory** (`ScorecardAvaliacao.tsx:256-261`): "Contextual · não-eliminatório" + "Sinaliza estilo de trabalho — não decide a etapa. Decisão sempre humana." (RNF-07a).
- **Destructive-action confirm copy is clear** (`BigFiveQuestionnaireScreen.tsx:345-348`): "Enviar avaliação? Após enviar, você não poderá editar suas respostas." with "Revisar" / "Enviar".

**BLOCKER (content):** `DevolutivaBigFiveView.tsx:63-68` — the LGPD/CFP fallback disclaimer contains unrendered placeholders `Dra. [Nome], CRP-XX/XXXXX`. Confirmed live at line 65. This is the legally-required responsible-technician attribution on a psychometric report; if the EF omits the field, the candidate reads raw tokens. Known/tracked go-live blocker — reaffirmed here.

**WARNING:** `DevolutivaBigFiveView.tsx:120-121` error copy promises an email ("avisaremos por e-mail") the context flags as deferred/non-existent. See Top Fix #6.

No generic CTA labels found ("Submit"/"OK"/"Click here" absent from the phase components; all CTAs are domain-specific: "Começar", "Avançar", "Concluir avaliação", "Voltar ao painel").

### Pillar 2: Visuals (3/4)

- **Clear focal point + hierarchy.** Each surface has a single dominant element: the questionnaire's `text-2xl`/`text-lg` page heading + one Likert block per item; the devolutiva's `text-2xl` profile header over a 5-row dashboard; the RH cards with `CardTitle` + neutral score values. Hierarchy is driven by size + weight + opacity (`text-white` vs `text-white/70` vs `text-white/50`), which is consistent and readable.
- **Selected-state affordance is correct.** The chosen Likert option is glass-white (`bg-white/30`, `BigFiveQuestionnaireScreen.tsx:132`), deliberately NOT the accent — matches the "selection ≠ score" intent.
- **WARNING — tabs break the glass system.** `DevolutivaBigFiveView.tsx:181-188`: `TabsTrigger`/`TabsList` inherit default light-theme tokens (`text-foreground`, `data-[state=active]:bg-card`, `tabs.tsx:45`) on a dark glass panel where everything else is white-on-glass. Likely low-contrast active state and an off-system look on the report's primary navigation. See Top Fix #3.
- **WARNING — icon accessibility.** Only 1 of the decorative icons across the two candidate files carries `aria-hidden` (it's in the RH file). Loaders, Lock, Check, AlertCircle are announced redundantly to screen readers. See Top Fix #5.

### Pillar 3: Color (2/4)

Lowest-scoring pillar — the issue is semantic color choice on a compliance-sensitive surface, not brand drift.

- **BLOCKER (judgment-color tension):** The OCEAN percentile bars on the devolutiva dashboard render via the default `Progress`, whose indicator is `bg-primary` (`progress.tsx:24`, track `bg-primary/20` at `:17`). `DevolutivaBigFiveView.tsx:11-12` explicitly promises "Neutral/professional colors — the percentile is informational, NEVER a red/green judgment." A personal psychometric result drawn in the turquoise brand/achievement color undercuts that promise — a 95th-percentile bar visually "wins," a 10th "loses," on a profile that is by design non-evaluative. See Top Fix #2.
- **Hardcoded accent as an arbitrary value, not a token.** `text-[#35BFAD]` appears at `BigFiveQuestionnaireScreen.tsx:90` and `AvaliacaoContainer.tsx:77,163`; `text-[#EF4444]` at `AvaliacaoContainer.tsx:349`. These bypass the design-token layer (`text-primary` / `text-destructive`). Functional and on-brand, but they make a future palette change a find-replace across files. **Fix:** route through tokens.
- **Otherwise color-disciplined:** the rest is the white-on-glass system (`text-white`, `bg-white/5..30`, `border-white/10..20`). No red/green pass-fail tints on the RH scorecard (the brief's key requirement) — confirmed: score values are plain `text-white`, never tinted.

### Pillar 4: Typography (3/4)

Distinct sizes across the four phase components (frequency):

```
text-sm ×23   text-xs ×10   text-xl ×7   text-base ×4
text-2xl ×3   text-lg ×1    text-4xl ×1  text-3xl ×1
```

Weights: `font-semibold ×15`, `font-medium ×4`, `font-normal ×1`.

- **8 sizes** exceeds the ≤4 heuristic, but this is two dense surfaces (a 120-item form and a 5-dimension report + an RH multi-card scorecard), so a fuller scale is reasonable. The `text-4xl`/`text-3xl` outliers are the `AvaliacaoContainer` hero heading (`:146`), not the Phase-12 screens themselves — within the questionnaire/devolutiva the spread is `2xl → xl → lg → base → sm → xs`, a coherent ramp.
- **3 weights** is one over the ≤2 heuristic; `font-normal` appears once (`BigFiveQuestionnaireScreen.tsx:131`, intentionally overriding the Label's default bold for an option chip), `font-medium`/`font-semibold` carry the hierarchy. Acceptable.
- `leading-relaxed`/`leading-snug` applied to body and disclaimer text — good readability discipline on long interpretive paragraphs.

WARNING: minor — consider collapsing `text-lg` (single use, `:281`) into the existing `text-xl`/`text-base` ramp to tighten the scale.

### Pillar 5: Spacing (4/4)

Cleanest pillar. Spacing is entirely on the Tailwind scale:

```
gap-2 ×16   space-y-1 ×6   space-y-3 ×5   space-y-4 ×4   space-y-5 ×3
p-12 ×3     py-20 ×2       mt-8 ×2        pl-4/pl-5 ×2   ...
```

- **Zero off-scale spacing.** Every arbitrary value is `min-h-[44px]` — the WCAG 2.5.5 / Apple HIG 44px touch-target floor, applied consistently to every interactive control (Likert rows `:131`, all buttons `:261,310,321,332`, status pills). That is correct use of an arbitrary value, not a spacing-scale violation.
- Vertical rhythm is consistent (`space-y-5`/`space-y-6` between panels, `space-y-3` within items, `pb-5` + `border-b` to separate Likert items). Mobile-first column layout with `sm:flex-row` for the Likert options (`:121`) is the right responsive choice for the candidate persona.

No finding rises above informational here.

### Pillar 6: Experience Design (3/4)

State coverage is the strength of this implementation. Per surface:

- **`BigFiveQuestionnaireScreen`:** loading skeletons (`:210-221`), back-lock/etapa-advanced state (`:225-237`, neutral Lock, never alarming), per-page `disabled` gating on "Avançar" until the page is answered (`:319`) and "Concluir" until all 120 are answered (`:331`), autosave affordance (Salvando…/Salvo/transient-fail, `:80-103`), submitting spinner, **and a destructive-action confirm dialog** before final submit (`AlertDialog`, `:326-355`). The `LOCKED` error path routes the candidate back to the panel with a neutral toast rather than an error wall (`:199-204`). This is thorough.
- **`DevolutivaBigFiveView`:** distinct loading, error, and "not-ready" states (`:103-134`), each with a recovery CTA back to the panel.
- **`ScorecardAvaliacao`:** loading skeletons, error message, and a genuine empty state ("Sem avaliações registradas ainda.", `:335`), plus a `pendente_humano` "Requer revisão humana" marker (`:48-55`) — never an auto-decision (RNF-07a).

WARNINGs:
- **Accessibility of the core interaction.** The 5-point Likert `RadioGroup` has no `aria-label` tying the option group to the statement, and the `Progress` bars announce only a numeric value with no context. On a 120-item instrument this materially degrades the screen-reader experience. See Top Fix #4.
- **Error state promises a channel that may not fire** (email), see Pillar 1 / Top Fix #6.
- **No autosave affordance on the devolutiva** is fine (read-only), but note the questionnaire's transient-fail copy ("tentando novamente…") is the only signal of a save problem — acceptable given the 30s-debounce + back-lock model inherited from Phase 11.

Registry-safety note: no third-party shadcn registries are in play for this phase (all primitives — `radio-group`, `progress`, `tabs`, `alert-dialog`, `card`, `badge`, `skeleton` — are the vendored official shadcn set; threat T-12-SC was `accept`/no new packages). No registry flags.

---

## Files Audited

- `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx` (candidate questionnaire — 120-item Likert)
- `src/features/avaliacao/components/DevolutivaBigFiveView.tsx` (candidate devolutiva — LGPD-sensitive)
- `src/features/avaliacao/components/ScorecardAvaliacao.tsx` (RH scorecard — `BigFiveBreakdown`)
- `src/features/avaliacao/components/AvaliacaoContainer.tsx` (candidate entry surface — Big Five card wiring)
- `src/features/avaliacao/components/index.ts` (barrel — exports verified)
- `src/components/ui/progress.tsx`, `tabs.tsx`, `glass.tsx` (primitive defaults inspected for color/contrast findings)
- Context: `12-CONTEXT.md`, `12-05-PLAN.md`, `12-05-SUMMARY.md`

**Screenshot captured:** `.planning/ui-reviews/12-20260623-131702/desktop.png` (public root only — Big Five surfaces gated behind RoleGuard + the un-shipped 12-06 apply wave; not representative of the audited screens).
