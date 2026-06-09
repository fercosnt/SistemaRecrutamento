# Phase 11 — UI Review

**Audited:** 2026-06-09
**Baseline:** 11-UI-SPEC.md (approved 2026-06-09)
**Screenshots:** Not captured (no dev server detected on ports 3003 / 3000 / 5173)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Main CTAs / empty / all-done states match spec; card meta omits the spec "•" separator; one missing back-lock state |
| 2. Visuals | 3/4 | Glass shell replicated correctly; H1 "Avaliação" missing `font-semibold`; no Progress bar in MC screen despite spec import list |
| 3. Color | 3/4 | 60/30/10 respected on candidate side; `#EF4444` used on load-error icon in candidate shell (spec: icon-only destructive OK); `SugestaoIABadge` on deterministic MC block is a spec violation |
| 4. Typography | 2/4 | Two undeclared weights (`font-medium` on navbar name and dimension labels); `text-2xl` on locked-state H1 is outside the 4-size contract |
| 5. Spacing | 3/4 | Scale is 4px/8pt throughout; `py-1.5` on status pill is a non-standard fractional; otherwise clean |
| 6. Experience Design | 3/4 | Loading/error/empty/disabled states all present; "already submitted" back-lock state missing from SJT MC screen; MC screen has no progress bar |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **`SugestaoIABadge` on deterministic MC block** (`ScorecardAvaliacao.tsx:87`) — MC scoring is fully deterministic (no AI); attaching the "Sugestão da IA — decisão é sempre humana" badge to it is factually wrong and misleads RH into treating a deterministic score as an AI suggestion. Remove `<SugestaoIABadge variant="full" />` from `McBreakdown`; leave it only on `CasoAbertoBreakdown` (and per-dimension `compact`). WARNING (degrades data integrity of the RH tool).

2. **Missing "already submitted" read-only state in `SjtMultiplaEscolhaScreen`** — The UI-SPEC copy contract declares: `Esta avaliação já foi enviada. Suas respostas foram registradas.` with a `Lock` icon and read-only content display. `SjtCasoAbertoScreen` handles the `locked` prop from `useAutosaveAvaliacao` and renders the mid-session lock. `SjtMultiplaEscolhaScreen` has no equivalent guard: if a user navigates back to the MC screen after submission the component re-renders with the radio group enabled. Add a `locked` state check at the top of `SjtMultiplaEscolhaScreen` analogous to the one in `SjtCasoAbertoScreen:151-166`. WARNING (interaction integrity).

3. **`font-medium` (weight 500) used in two places, `text-2xl` outside the 4-size contract** — The spec declares exactly 2 weights: 400 and 600. `font-medium` (500) appears at `AvaliacaoContainer.tsx:121` (navbar candidate name) and `ScorecardAvaliacao.tsx:166` (dimension label). Additionally `text-2xl` at `SjtCasoAbertoScreen.tsx:156` and `AvaliacaoContainer.tsx:233` (WrongEtapa H1) is not in the 4-size contract (`text-sm/text-base/text-xl/text-3xl`). Change `font-medium` → `font-semibold` (or `font-normal`) in both locations; change the two `text-2xl` headings to `text-xl`. WARNING (typography contract drift).

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Passing:**
- `AvaliacaoContainer.tsx:204-205`: CTAs "Continuar avaliação" / "Começar avaliação" match spec exactly.
- `AvaliacaoContainer.tsx:153`: "Nenhuma avaliação pendente" (empty state heading) matches spec.
- `AvaliacaoContainer.tsx:145`: Subheading copy matches spec verbatim.
- `AvaliacaoContainer.tsx:161-163`: All-done state "Tudo concluído!" + body copy matches spec.
- `SjtMultiplaEscolhaScreen.tsx:205`: Soft-timer label matches spec: `Tempo sugerido: {mm:ss} (sem limite rígido)`.
- `SjtMultiplaEscolhaScreen.tsx:265`: Last-item CTA "Concluir avaliação" matches spec.
- `SjtMultiplaEscolhaScreen.tsx:271-278`: Alert-dialog confirm matches spec: title "Enviar avaliação?", body "Após enviar, você não poderá editar suas respostas.", confirm "Enviar", cancel "Revisar".
- `SjtCasoAbertoScreen.tsx:66/73`: Autosave copy "Salvando…" / "Salvo automaticamente" matches spec.
- `SjtCasoAbertoScreen.tsx:80`: Save-fail copy matches spec.
- `SjtCasoAbertoScreen.tsx:192-195`: Word-count helper three-variant format matches spec exactly.
- `SjtCasoAbertoScreen.tsx:224`: Textarea placeholder "Comece a escrever sua resposta aqui…" matches spec.
- `AvaliacaoContainer.tsx:344-348`: Error-state copy and CTA "Tentar novamente" match spec.
- No "teste psicológico" language found (LGPD-04 compliant).

**Gaps:**

- WARNING — `AvaliacaoContainer.tsx:187`: Per-card meta renders as `Tempo estimado: ~{N} min` on one line, with the status pill as a separate div. Spec contract says the meta line is `Tempo estimado: ~{N} min • {status}` (the bullet separator unifies both in a single text block). The layout separates them spatially instead. Not a functional failure, but a spec drift.

- WARNING — No "Esta avaliação já foi enviada. Suas respostas foram registradas." state is rendered anywhere on the candidate side for either MC or open-case. The back-lock that covers "etapa advanced mid-session" is present (`SjtCasoAbertoScreen.tsx:151-166`), but there is no state for the case where a candidate navigates back to an already-completed test (post-submission). The spec explicitly contracts this copy and a `Lock` icon + read-only display.

- INFO — `SjtMultiplaEscolhaScreen.tsx:181`: Empty-state copy is "Nenhuma avaliação pendente" — identical to the container's empty-state heading. The spec doesn't differentiate these, so this is acceptable but slightly ambiguous in context.

### Pillar 2: Visuals (3/4)

**Passing:**
- `AvaliacaoContainer.tsx:107-112`: `BackgroundImage background="gradient" overlayColor="bg-black" overlayOpacity={15}` + sticky navbar — exact D-27 shell replication.
- `AvaliacaoContainer.tsx:113`: Sticky navbar: `backdrop-blur-md bg-white/5 sticky top-0 z-50` — matches shell.
- `AvaliacaoContainer.tsx:142`: `BeautySmileLogo` present in container.
- `GlassPanel`/`GlassCard`/`Glass` primitives used throughout — no new shell introduced.
- Visual hierarchy: card title `text-xl font-semibold`, meta `text-sm`, CTA full-width — clear scan order.
- Status pills with icons (`Circle`, `CheckCircle2`, `Lock`) plus text labels — not icon-only; accessible.
- Touch targets universally applied: `min-h-[44px]` on status pill container, all CTAs, radio option rows.
- `ScorecardAvaliacao.tsx`: neutral card layout, no red/green tints on score values — correctly structured.
- `SjtCasoAbertoScreen.tsx:62`: `AutosaveIndicator` placed top-right of screen alongside heading — matches spec placement contract.

**Gaps:**

- WARNING — `AvaliacaoContainer.tsx:143`: Container page H1 `<h1 className="text-white text-3xl md:text-4xl mb-2 drop-shadow-lg">` is missing `font-semibold`. The spec states the page heading role is 28px/semibold 600. Without `font-semibold`, the H1 renders at browser-default weight (400), which is the same weight as body text and collapses the visual hierarchy at the top of the screen. This is a meaningful visual regression on a mobile-first surface.

- WARNING — `SjtMultiplaEscolhaScreen.tsx`: No `<Progress>` component from the declared shadcn set appears anywhere in the MC screen. The spec includes `progress` in the in-scope shadcn primitives. While the spec doesn't mandate it as an explicit contract element (it is listed under the design system primitives, not the copywriting contract), the "Situação {n} de {total}" heading provides positional context. The absence of a progress bar for a multi-item assessment is a minor UX gap but not a spec defect.

- INFO — `SjtMultiplaEscolhaScreen.tsx`: No sticky navbar / logo in the SJT screens (`ScreenShell` is a bare `BackgroundImage` + column). This is a divergence from the D-27 shell, but may be intentional (focused test environment). The spec states "copy DashboardCandidatoPage" for the container, not necessarily the individual test screens. Not flagged as a defect.

### Pillar 3: Color (3/4)

**Passing:**
- 60% dominant: `background="gradient"` + `overlayColor="bg-black"` on all candidate surfaces — correct.
- 30% secondary: `bg-white/5` to `bg-white/20` used on glass primitives throughout — correct.
- Accent `#35BFAD` appearances:
  1. `SjtCasoAbertoScreen.tsx:73` — autosave "Salvo automaticamente" Check icon — correct (reserved use 1).
  2. `AvaliacaoContainer.tsx:74` — `statusInfo` for `feito`/`concluido` → `text-[#35BFAD]` — correct (reserved use 3: completed-test check).
  3. `AvaliacaoContainer.tsx:160` — `CheckCircle2` on all-done state — same use 3 (same element, different render path).
- No `text-red`, `bg-red`, `text-green`, `bg-green` on candidate-facing or RH scorecard surfaces.
- `ScorecardAvaliacao.tsx`: scores rendered as `{score} / {max}` with `text-white` / `text-white/50` — neutral, no pass-fail tinting.

**Gaps:**

- WARNING — `ScorecardAvaliacao.tsx:87`: `SugestaoIABadge` (accent `#35BFAD`) applied to `McBreakdown` (deterministic scoring — no AI). The spec reserves the badge for "AI-derived score blocks." MC scoring is `Σ peso(opcao_marcada)` — fully deterministic, server-side. Placing the accent-colored AI badge on it creates a fourth unreserved accent use and — more critically — communicates false AI provenance to RH, undermining the "Sugestão da IA" guardrail's credibility. The badge should appear only on `CasoAbertoBreakdown` blocks.

- INFO — `AvaliacaoContainer.tsx:342`: `AlertCircle` icon uses `text-[#EF4444]` in the error state (load failed). The spec states destructive `#EF4444` is for "locked / blocked / error iconography ONLY — never a button fill." This exact usage (error icon, not a button fill) falls within the spec's exception. Acceptable. Flagged for transparency.

### Pillar 4: Typography (2/4)

The spec contract is strict: exactly 4 sizes (`text-sm`, `text-base`, `text-xl`, `text-3xl`) and exactly 2 weights (`font-normal` 400, `font-semibold` 600).

**Sizes observed across all four files:**
`text-xs` (scorecard citações/tags), `text-sm`, `text-base`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl` — 7 distinct sizes against a contract of 4.

**Violations:**

- BLOCKER for spec fidelity — `text-xs` used at `ScorecardAvaliacao.tsx:48, 111, 174, 190, 203` (badge labels, section headers "Citações" / "Red flags"). `text-xs` is not in the 4-size contract. The RH scorecard is the desktop shell (different persona from the candidate glass), but the spec's typography section covers this phase's surfaces and doesn't carve out a separate scale for the RH view. Five occurrences.

- WARNING — `text-2xl` at `SjtCasoAbertoScreen.tsx:156` (etapa-avancou lock H1) and `AvaliacaoContainer.tsx:233` (wrong-etapa lock H1). Both are candidate-facing headings. The spec mandates `text-3xl` (responsive `md:text-4xl`) for the page/container heading role; `text-2xl` sits between the declared `text-xl` and `text-3xl` rungs and is not in the contract. These should be `text-xl` (card-title role) or `text-3xl` (page-heading role) depending on intent.

- WARNING — `text-4xl` at `AvaliacaoContainer.tsx:143` as the `md:` breakpoint variant (`md:text-4xl`). Spec caps responsive at `md:text-4xl` for the container heading, so this is within spec. Not a violation.

**Weights observed:**
`font-normal` (1 hit), `font-medium` (2 hits), `font-semibold` (15 hits). Three distinct weights against a contract of 2.

- WARNING — `font-medium` (weight 500) at `AvaliacaoContainer.tsx:121` (navbar candidate name) and `ScorecardAvaliacao.tsx:166` (dimension label). The spec explicitly bans 500/700/800. Both should be either `font-normal` (body context) or `font-semibold` (label context). The navbar name is a label-level element → `font-semibold` is the correct remediation.

- INFO — `AvaliacaoContainer.tsx:143`: H1 has no weight class, meaning it renders at default weight (which for most browsers is `font-bold` on `<h1>` without a CSS reset, but Tailwind resets this to `font-normal` via Preflight). The spec requires `font-semibold` on the page heading. Add `font-semibold` to line 143.

### Pillar 5: Spacing (3/4)

The spec scale: `gap-1` (xs/4px), `gap-2` (sm/8px), `gap-4`/`space-y-4` (md/16px), `p-6`/`space-y-6` (lg/24px), `space-y-8` (xl/32px), `p-12` (2xl/48px), `py-20` (3xl/64px).

**Passing:**
- `py-20` on all `BackgroundImage` wrappers — correct 3xl shell convention.
- `p-12` on empty/all-done/error/lock states — correct 2xl.
- `p-6` on loading skeleton cards — correct lg.
- `space-y-4`, `space-y-6`, `space-y-8` in container — all within scale.
- `gap-4` on nav/button rows — correct md.
- `gap-2`, `gap-1` on badge/icon-text rows — correct sm/xs.
- `min-h-[44px]` used consistently on all touch targets — spec-mandated mobile a11y exception, correctly applied.

**Gaps:**

- WARNING — `AvaliacaoContainer.tsx:189`: Status pill container uses `py-1.5` (6px). Tailwind's 0.5-step increments are not on the declared 4-scale (`py-1`=4px, `py-2`=8px). This is a fractional off-scale value. The pill height is anchored by `min-h-[44px]` so the touch target is safe, but `py-1.5` is an undeclared spacing token. Change to `py-1` (if min-h handles height) or `py-2` for a taller pill appearance.

- INFO — `SjtCasoAbertoScreen.tsx:282` / `SjtMultiplaEscolhaScreen.tsx:299`: `mt-8` (32px) on the screen column — within scale (xl token). Acceptable.

- INFO — `ScorecardAvaliacao.tsx:48`: Badge inner padding is managed by the `Badge` component's built-in styles (shadcn default). Not directly authored, so not audited as a custom spacing violation.

### Pillar 6: Experience Design (3/4)

**Passing:**
- **Loading:** Skeleton glass cards with `animate-pulse` in container (`AvaliacaoContainer.tsx:318-328`) and skeleton cards in MC screen (`SjtMultiplaEscolhaScreen.tsx:163-175`) and open-case (`SjtCasoAbertoScreen.tsx:168-174`). RH scorecard uses `Skeleton` component (`ScorecardAvaliacao.tsx:229-234`). Spec-compliant: "no text."
- **Error (load failed):** Full-panel error state in `AvaliacaoContainer.tsx:331-355` with copy, icon, and "Tentar novamente" refetch button — matches spec.
- **Empty states:** Container empty (no tests), all-done, both screen empty-question fallbacks — all present.
- **Disabled states:** `Avançar` disabled until `currentAnswered` (`SjtMultiplaEscolhaScreen.tsx:245`); `Concluir` disabled until `allAnswered || submitting` (line 257); `Enviar resposta` disabled when `belowMin || aboveMax || submitting` (`SjtCasoAbertoScreen.tsx:241`). Spec-compliant.
- **Irreversible-submit confirmation:** `alert-dialog` with exact spec copy on both screens. Both `AlertDialogCancel` = "Revisar", `AlertDialogAction` = "Enviar."
- **Autosave affordance:** `AutosaveIndicator` correctly covers all three states (saving/saved/error) with spec-mandated copy and icons. Placed top-right alongside heading.
- **Back-lock (etapa-advanced mid-session):** `SjtCasoAbertoScreen.tsx:151-166` handles `locked` prop from `useAutosaveAvaliacao` — copy matches spec, Lock icon, neutral tone, "Voltar ao painel."
- **Wrong-etapa gate:** `AvaliacaoContainer.tsx:358-359` + `WrongEtapaState` component — copy matches spec, neutral messaging, redirect to dashboard.
- **Submit success toast:** `toast.success('Avaliação enviada com sucesso')` on both screens — matches spec.
- **RNF-07a:** No score, percentage, threshold, "aprovado," or "reprovado" on any candidate-facing render path. Status labels are neutral (Pendente / Concluído / Indisponível). Candidate score tables are in `ScorecardAvaliacao` which is RH-only.
- **SugestaoIABadge on RH AI blocks:** Present on `CasoAbertoBreakdown` panel header and per-dimension compact — correct. `RevisaoHumanaMarker` shown when `pendente_humano` — neutral, no auto-rejection.

**Gaps:**

- WARNING — `SjtMultiplaEscolhaScreen.tsx`: No "already submitted" read-only state. The spec contract declares: `Esta avaliação já foi enviada. Suas respostas foram registradas.` with read-only content + `Lock` icon. The open-case screen handles this via `locked` from the autosave hook (which detects the RLS 42501 on write attempts). The MC screen (`SjtMultiplaEscolhaScreen.tsx`) has no equivalent check — it does not call `useAutosaveAvaliacao` (MC has no autosave), so the back-lock detection mechanism is absent entirely. If the candidate navigates back to the MC route after submission, they see the radio group fully enabled. A guard should check `ctx?.teste_status?.sjt_mc === 'feito'` (or the equivalent from `AvaliacaoContext`) and render the locked state.

- INFO — No `<Progress>` component in either SJT screen. The spec declares it as in-scope but does not mandate it in the copywriting/interaction contract tables. The "Situação {n} de {total}" heading text provides sufficient positional context for a V1 implementation.

- INFO — `ScorecardAvaliacao.tsx` has no loading error retry button — only a text fallback `Não foi possível carregar as avaliações.` (`ScorecardAvaliacao.tsx:239-241`). The container has a proper retry CTA; the scorecard (RH desktop, embedded component) may intentionally omit this because it is a panel within a larger RH page that presumably has its own reload mechanism.

---

## Registry Safety

Registry audit: 0 third-party blocks — all primitives are shadcn official (`radio-group`, `textarea`, `progress`, `badge`, `button`, `alert-dialog`, `skeleton`, `card`, `label`) vendored in `src/components/ui/` since M1. No `shadcn view` gate required.

---

## Files Audited

- `src/features/avaliacao/components/AvaliacaoContainer.tsx`
- `src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx`
- `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx`
- `src/features/avaliacao/components/ScorecardAvaliacao.tsx`
- `.planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-UI-SPEC.md` (contract reference)
- `.planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-CONTEXT.md` (domain reference)
