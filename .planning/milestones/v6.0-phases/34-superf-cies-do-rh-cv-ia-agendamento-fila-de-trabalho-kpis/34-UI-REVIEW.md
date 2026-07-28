# Phase 34 — UI Review

**Audited:** 2026-07-17
**Baseline:** `.planning/phases/34-superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis/34-UI-SPEC.md` (approved contract)
**Screenshots:** not captured — no dev server detected on :3003 (this project's documented port, per `CLAUDE.md`), :5173, or :3000 (the :3000 responder is an unrelated app — `307 → /login` redirect behavior inconsistent with this Vite SPA). Code-only audit.
**Scope:** VISRH-01/02/03 (CV/IA/Histórico), AGEND-02/03 (Agendamento), KPI-01/03 (Fila), KPI-02/04 (Dashboard) — the 8 files listed in `required_reading`.
**Note:** This is advisory (non-blocking). Phase 34's functional/security verification (`34-VERIFICATION.md`, 23/23 truths) and code review (`34-REVIEW.md`, CR-01/WR-01/WR-02/IN-02 fixed) already passed — this review audits the visual/UX design *contract* specifically, which neither of those passes covered.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | CV block's declared "Nenhum currículo enviado" empty-state copy is unreachable — every failure mode (missing CV, network error) collapses into the generic error string |
| 2. Visuals | 2/4 | Big Five ("Perfil comportamental" neutral bands) — explicitly required content for VISRH-02's "FULL analysis" — is entirely absent from the allowlist and the render |
| 3. Color | 2/4 | 3 of 4 new Phase-34 files hardcode `#35BFAD` hex instead of the spec's preferred `bg-accent`/`text-accent` tokens; the 4th (FilaTrabalhoTab) correctly uses tokens — internal inconsistency within the same phase |
| 4. Typography | 3/4 | `RelatoriosRHPage.tsx` uses arbitrary `text-[28px]` instead of the declared `text-3xl` token (same computed value, wrong vehicle) across its whole typographic identity |
| 5. Spacing | 3/4 | Spacing scale (gap/p/space-y) is clean multiples-of-4 throughout every new file; one in-scope button (`Ver Perfil`, `CandidatosRHPage.tsx:426`) is `min-h-[40px]`, 4px under the declared 44px touch-target floor |
| 6. Experience Design | 2/4 | The vendored shadcn `Calendar` day cells (`size-8` = 32px) fall short of the UI-SPEC's own explicitly-named "calendar day cells" 44px minimum in the flagship new Agendamento date picker |

**Overall: 14/24**

---

## Top 3 Priority Fixes

1. **Análise da IA never shows Big Five bands, despite VISRH-02 promising the "FULL" analysis** — RH reviews an "Análise da IA" block that silently omits an entire declared sub-section (`Perfil comportamental` neutral bands), and has no way to know anything is missing since the block renders as if complete. This can bias hiring judgment on partial signal. **Fix:** add the Big Five columns to `ANALISE_HUB_ALLOWLIST` (`analiseCandidatoService.ts:43`) and render a `Perfil comportamental` section in `AnaliseIABlock.tsx` using the same neutral, non-clinical band-label pattern already established elsewhere (RNF-12a) — or, if Big Five is intentionally deferred, update `34-UI-SPEC.md` to say so explicitly rather than leaving a silently-broken promise.

2. **Interview-scheduling date picker's day cells are 32px, 12px under the 44px minimum the spec itself names for "calendar day cells"** — `src/components/ui/calendar.tsx:43-46` ships the vendored shadcn primitive unmodified (`day: cn(buttonVariants({variant:'ghost'}), 'size-8 p-0 ...')`), and `AgendamentoBlock.tsx`'s `DataHoraPicker` (the brand-new AGEND-02/03 date control) uses it as-is. This is the flagship new interaction surface of the phase and it ships with a WCAG 2.5.5 shortfall the org's own convention explicitly flags. **Fix:** override `day`/`cell` classNames in the `Calendar` usage (or the shared primitive) to `size-11` (44px) for RH surfaces, matching every other new control in this phase.

3. **CV button's "no CV attached" state is unreachable — a normal, common outcome reads as a transient failure** — `CvButton.tsx` has no branch producing the spec's declared `Nenhum currículo enviado` / `O candidato não anexou um currículo nesta candidatura.` copy; every failure (missing file, network error, EF error) surfaces the same `Não foi possível abrir o currículo. Tente novamente em instantes.` string. An RH user viewing a candidate who genuinely never uploaded a CV will see "couldn't open, try again" and retry indefinitely instead of the honest "nothing was attached" message. **Fix:** have `getSignedUrl`/the EF distinguish a missing-CV response (e.g. a typed error code or a null/404 case) from a generic failure, and branch `CvButton`'s error state on it to show the declared empty copy.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

**What matches well:** the Fila (`FilaTrabalhoTab.tsx`), Dashboard (`RelatoriosRHPage.tsx`), Histórico (`HistoricoBlock.tsx`), and IA "Análise ainda não disponível"/"falhou" (`AnaliseIABlock.tsx`) copy strings all match the UI-SPEC signature/per-surface tables verbatim, including the exact heading+body split for empty/error states. The `Cancelar entrevista` destructive confirmation copy matches character-for-character (`AgendamentoBlock.tsx:582-583`).

**Findings:**
- **[BLOCKER-class]** CV block's declared empty copy `Nenhum currículo enviado` / `O candidato não anexou um currículo nesta candidatura.` (UI-SPEC §CV block copy table) has no corresponding code path in `CvButton.tsx:30-87`. The component only tracks `loading`/`error` booleans; there is no third "no CV" outcome. Every failure — a genuinely-missing CV included — renders the generic error string (line 82). This is a signature-table string the checker explicitly requires and it is dead on arrival.
- **[WARNING]** `AgendamentoBlockInner`'s read-error copy (`AgendamentoBlock.tsx:389-391`: "Não foi possível carregar o agendamento. Verifique sua conexão e tente novamente.") is a surface-specific variant not listed anywhere in the UI-SPEC's per-surface Agendamento copy table (which only declares Save/Reschedule/Cancel/Comparecimento/Empty/Gated-off strings, no distinct read-error string) — it appears to freelance off the top-level generic error contract (`Não foi possível carregar os dados...`) with different wording. Low severity (meaning is preserved) but it is not a verbatim contract string either.
- **[INFO, pre-existing/unresolved]** `AgendamentoBlock.tsx:463`: `submitLabel={isReschedule ? 'Salvar agendamento' : 'Salvar agendamento'}` — dead ternary, both branches identical (already flagged as code-review IN-01, left unresolved). Not a spec violation per se (spec only declares one "Salvar agendamento" string), but the dead ternary signals an intended-but-dropped reschedule-specific copy state.

### Pillar 2: Visuals (2/4)

**What matches well:** every new surface has a single clear focal point (dominant CTA per surface: `Abrir currículo`, `Agendar entrevista`, the Fila table, the 3-metric-card dashboard header). Icon-only affordances are consistently paired with visible labels or `aria-label` (`CvButton`'s `FileText`, `AgendamentoBlock`'s `CalendarDays`/`RotateCcw`/`Ban`, `SlaBadge`'s `AlertTriangle`). Score/status chips carry number+color in one element throughout (the colorblind-safe `ScoreCell` invariant is respected everywhere it's used).

**Findings:**
- **[BLOCKER-class]** Big Five is entirely missing from the Análise da IA block. `ANALISE_HUB_ALLOWLIST` (`analiseCandidatoService.ts:43`) is `'score_match, pontos_fortes, gaps, flags, status'` — no Big Five columns are read at all — and `AnaliseIABlock.tsx` has no `Perfil comportamental` render branch. UI-SPEC §Surface 1 is explicit: "Renders: ... Big Five as **neutral descriptive bands** (RNF-12a)." VISRH-02's own doc comment in `AnaliseIABlock.tsx:1-9` calls this "the FULL IA analysis" — it is not full. (The pre-existing "Avaliação Assíncrona" `HubSection` elsewhere on the hub shows only a count sentence, not Big Five bands either — there is no substitute rendering anywhere on the page.)
- **[WARNING]** Visual-hierarchy dilution in the "Próximo passo" cluster: the dominant turquoise CTA (`Abrir {label}`, `HubCandidatoRH.tsx:251-257`) sits directly beside a turquoise-outlined `Avançar` action (line 207-215) and, a few sections down, a second **solid** turquoise CTA (`Abrir workspace de redação`, lines 360-368) — three accent-weighted actions compete in the same viewport region against the spec's own "single dominant CTA per surface" rule (§Color, reserved-list item 1). Largely pre-existing (Phase 17/31 work), but Phase 34's new `Reagendar entrevista` (turquoise-outlined) and the Fila's per-row turquoise `Abrir` link add to the same pattern rather than counter it.
- **[WARNING]** `CandidatosRHPage.tsx:473` — the page header combines `font-bold font-normal` on the same `<h1>` (contradictory weight utilities on one element) alongside a non-token `text-[40px]`. Pre-existing, but present in a file this phase modified to add the Fila tab.

### Pillar 3: Color (2/4)

**What matches well:** the semantic/status palette (score bands, SLA aging/breach badges, agendamento status chips) is implemented exactly as declared — `bg-green-500/20 text-green-300 border-green-500/30` / `bg-yellow-500/20 text-yellow-200 border-yellow-500/30` / `bg-red-500/20 text-red-300 border-red-500/30`, always paired with a text label (verified in `AnaliseIABlock.tsx:44-51`, `SlaBadge.tsx:30-31,37-51`, `AgendamentoBlock.tsx:74-81`). All four dashboard charts use `--chart-N` CSS custom properties exclusively — zero raw hex found in any chart config (`RelatoriosRHPage.tsx:54-57,183,195,207,219`), correctly matching the CLAUDE.md/UI-SPEC chart contract.

**Findings:**
- **[WARNING]** Token-discipline drift: `grep` for `#35BFAD` across the phase-34 files returns 7 hits in `HubCandidatoRH.tsx` (lines 164, 185, 197, 210, 254, 287, 364), 1 in `AnaliseIABlock.tsx:58`, and 5 in `AgendamentoBlock.tsx` (lines 75-76, 339, 445, 562) — all hardcoded hex instead of the spec's stated-preferred `bg-accent`/`text-accent` tokens ("Token discipline" §Color: "Prefer semantic tokens `bg-accent`/`text-accent` for turquoise in NEW code"). Meanwhile `FilaTrabalhoTab.tsx:93` (also new this phase) correctly uses `text-accent` — an inconsistency **within the same phase's own deliverables**, not just legacy debt.
- **[WARNING]** Accent-budget overrun: the UI-SPEC's reserved turquoise list is 4 items (dominant CTA, current-etapa chip + eyebrow, AI signal, active-tab/chart-series). `FilaTrabalhoTab.tsx:91-97`'s per-row `Abrir` link is turquoise (`text-accent`) on **every row** of the queue table — not on the reserved list, and exactly the "never all interactive elements" anti-pattern the spec calls out by name.

### Pillar 4: Typography (3/4)

**What matches well:** every new component file (`CvButton`, `AnaliseIABlock`, `HistoricoBlock`, `AgendamentoBlock`, `SlaBadge`) restricts itself to `text-xs/sm/base/xl/2xl` for sizing and `font-normal`/`font-semibold` for weight, matching the declared 14/16/20/24px roles and the 400/600 weight rule almost everywhere.

**Findings:**
- **[WARNING]** `RelatoriosRHPage.tsx` uses the arbitrary value `text-[28px]` four times (lines 119, 156, 162, 168 — the page `<h1>` and all 3 metric-card numbers) instead of the declared `text-3xl` token. Confirmed in `src/styles/globals.css:85` that `--text-3xl: 1.75rem` (28px) is the project's own custom token for exactly this value — so the rendered pixel size is correct, but the entire new Dashboard surface's defining numerals bypass the design-token vehicle the spec names, for no apparent reason (no arbitrary-value comment or justification in the file).
- **[INFO]** `FilaTrabalhoTab.tsx:93`'s `Abrir` link carries `font-medium` (500) — a 3rd weight beyond the declared 400/600 (the spec's only carved-out 500 exception is the pre-existing Tabs-trigger className, which this is not).
- **[INFO, pre-existing]** `CandidatosRHPage.tsx:473` — `text-[40px]` combined with contradictory `font-bold font-normal`.

### Pillar 5: Spacing (3/4)

**What matches well:** every `gap-`/`p-`/`px-`/`py-`/`space-y-` value found across the 6 new/touched component files is a clean multiple of 4 (`gap-1/2/3/4`, `p-3/6`, `px-2/3/4/5/6/8`, `py-0/1/12`, `space-y-1/2/3/4/5/6`) — no arbitrary spacing values anywhere in the new Phase-34 code. `min-h-[44px]`/`min-h-11` is applied correctly and consistently on every new interactive control audited (CV button, timeline chips, agendamento form controls, toggle-group items, Fila row link).

**Findings:**
- **[WARNING]** `CandidatosRHPage.tsx:426` — the `Ver Perfil` card button is `min-h-[40px]`, 4px short of the declared 44px touch-target floor that every other button in this review correctly honors. Pre-existing (not new this phase) but present in a file this phase modified.
- **[INFO]** Several `Select` triggers on `CandidatosRHPage.tsx` use arbitrary pixel widths (`w-[140px]`, `w-[180px]`, `w-[160px]`, `w-[130px]`, `w-[300px]` — lines 497, 526, 644, 667, 858) with no corresponding declared token; these are pre-existing and outside the spec's declared scope (width, not spacing/padding), noted for completeness only.

### Pillar 6: Experience Design (2/4)

**What matches well:** all 6 declared surfaces (CV, IA, Histórico, Agendamento, Fila, Dashboard) route through `HubSection`/`AsyncState`, correctly implementing the loading→(slow)→error→empty→success priority order. The destructive confirm (`Cancelar entrevista`) correctly uses `AlertDialog` with the exact declared copy. Mutation pending states (`Salvando…`/`Cancelando…` with `Loader2` + `aria-busy`) are present everywhere a write happens. `aria-live="polite"` is correctly applied to the CV button's inline error and the agendamento form's submit region.

**Findings:**
- **[BLOCKER-class]** `src/components/ui/calendar.tsx:43-46` — the vendored shadcn `Calendar` primitive's `day` cells are `size-8` (32px), used unmodified by `AgendamentoBlock.tsx`'s `DataHoraPicker` (the phase's flagship new scheduling control). UI-SPEC §Spacing Scale explicitly lists "calendar day cells" in its 44px touch-target exception list, and §Accessibility repeats the ≥44px rule for "every interactive control." This is a concrete, spec-cited, unmet requirement in brand-new interaction surface — not a pre-existing legacy gap.
- **[WARNING]** UI-SPEC §Accessibility requires "a data caption/summary accompanies each chart for screen readers." None of the 4 `ChartContainer` blocks in `RelatoriosRHPage.tsx` (Volume/Tempo/Conversão/Drop) carry a caption or summary beyond the visual `<h2>` title — `accessibilityLayer` is correctly enabled (partial credit) but the explicit caption requirement is unmet for all 4 charts.
- **[INFO, pre-existing/unresolved]** `src/features/funil/constants/slaThresholds.ts:58-61`'s `diasNaEtapa` does not guard `NaN` from a malformed `entrouEtapaEm` (code-review IN-04, left unresolved) — a malformed timestamp would render "NaN dias" in the Fila table.

---

## Registry Safety

Not applicable — `components.json` does not exist in this repo (confirmed: `test -f components.json` → false). shadcn is manually vendored under `src/components/ui/` per the UI-SPEC's own Design System table; no third-party registry is declared for Phase 34. Registry audit skipped per the gate's own rule.

---

## Files Audited

- `.planning/phases/34-superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis/34-UI-SPEC.md` (design contract)
- `.planning/phases/34-superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis/34-02-SUMMARY.md`, `34-REVIEW.md`, `34-VERIFICATION.md` (cross-reference)
- `src/features/hub-candidato/components/HubCandidatoRH.tsx`
- `src/features/hub-candidato/components/AnaliseIABlock.tsx`
- `src/features/hub-candidato/components/CvButton.tsx`
- `src/features/hub-candidato/components/HistoricoBlock.tsx`
- `src/features/hub-candidato/services/analiseCandidatoService.ts`
- `src/features/agendamento/components/AgendamentoBlock.tsx`
- `src/features/funil/components/FilaTrabalhoTab.tsx`
- `src/features/funil/components/SlaBadge.tsx`
- `src/features/funil/hooks/useFilaTrabalho.ts`
- `src/features/funil/services/filaTrabalhoService.ts`
- `src/features/funil/constants/slaThresholds.ts`
- `src/components/pages/CandidatosRHPage.tsx`
- `src/components/pages/RelatoriosRHPage.tsx`
- `src/components/ui/calendar.tsx`
- `src/components/ui/AsyncState.tsx`
- `src/features/hub-candidato/components/HubSection.tsx`
- `src/styles/globals.css` (token verification: `--text-3xl`, `--text-xl`, `--text-sm`, `--text-base`)
