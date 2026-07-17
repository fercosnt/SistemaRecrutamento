# Phase 35 — UI Review

**Audited:** 2026-07-17
**Baseline:** `.planning/phases/35-painel-do-candidato-leitura-do-agendamento/35-UI-SPEC.md`
**Screenshots:** not captured — no dev server detected on the project's port (3003, per CLAUDE.md; confirmed unreachable). Ports 3000/8080 responded but serve unrelated content (`/login` plain-text, `404 page not found`), not this Vite app — audit is code-only.
**Status:** ADVISORY (non-blocking) — findings below do not gate the phase.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | All signature-table strings match verbatim; 2 fallback strings for null link/local are undocumented in the spec's copy contract |
| 2. Visuals | 4/4 | Layout order, chip markup, and icon+label pairing match the spec and the page's existing precedent exactly |
| 3. Color | 4/4 | Accent turquoise used on exactly the 2 declared elements; semantic status/amber palettes match the spec table verbatim |
| 4. Typography | 3/4 | Status chip label uses `font-medium` (500) where the spec mandates `font-semibold` (600) — a 3rd weight the spec explicitly forbids |
| 5. Spacing | 3/4 | Scale discipline is clean (no arbitrary values), but the declared `gap-1`/4px "icon-to-label" token is never actually used — every icon+label pair uses `gap-2`/8px instead |
| 6. Experience Design | 4/4 | All 5 states (loading/error/empty/full/cancelled) implemented to spec; AGEND-05 date gating, retry wiring, and focus/link-security hygiene all correct |

**Overall: 21/24**

---

## Top 3 Priority Fixes

All findings below are WARNING-severity (advisory, non-blocking) — no BLOCKER was found; the card is functionally correct, secure, and accessible.

1. **Status chip label weight (`font-medium` vs spec's `font-semibold`)** — `AgendamentoCandidatoCard.tsx:180` — Visual impact is subtle (500 vs 600 is a small delta) but it introduces a 3rd font weight into a file whose own contract states "never introduce a 3rd weight" (35-UI-SPEC.md Typography, line 70). Root cause: the executor correctly copied the *existing* `DashboardCandidatoPage.tsx:372` chip markup verbatim (per the spec's own "identical markup" instruction), and that pre-existing markup already uses `font-medium`, not `font-semibold` — the spec's two instructions conflict. Fix: either change line 180 to `font-semibold` to satisfy the phase's literal typography contract, or (lower-risk) leave as-is and amend 35-UI-SPEC.md's Typography table to note the inherited `font-medium` exception so future audits don't re-flag it.

2. **Declared 4px icon-to-label spacing token (`gap-1`) is never used** — `AgendamentoCandidatoCard.tsx:125,177,182,216,249,261` — The UI-SPEC's Spacing Scale table declares `xs/4px` for "Icon-to-label gaps (`gap-1`)", but every one of the 6 icon+label pairs in the shipped card (status chip, tipo chip, video link, `.ics` button, retry button, 24h badge) uses `gap-2`/8px instead. The implementation is internally consistent (matches the page's own established icon+label convention, e.g. `DashboardCandidatoPage.tsx:329`), so this reads as a stale/aspirational token declared by the spec but never grounded in actual codebase practice, not a real UX defect. Fix: amend 35-UI-SPEC.md's spacing table to describe `gap-2` as the icon-to-label token used in this phase, so the contract stops citing a token that has zero real usage.

3. **Two fallback copy strings shipped without a spec entry** — `AgendamentoCandidatoCard.tsx:208` (`"Link da videochamada será informado em breve"`) and `:229` (`"Local: {...} ?? 'a ser confirmado'"`) — The UI-SPEC's Copywriting Contract signature table covers every state EXCEPT "online interview scheduled but RH hasn't set the link yet" and "presencial interview scheduled but RH hasn't set the address yet." The executor added sensible pt-BR fallback copy for these null-`local_ou_link` edge cases (a real, good defensive catch — `local_ou_link` is nullable per `MeuAgendamentoRow`), but the strings never went through the copy contract's review. Fix: backfill both strings into 35-UI-SPEC.md's per-element copy table so they're covered by future audits and copy review.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Matches (verified verbatim against the UI-SPEC signature + per-element tables):**
- Primary CTA `Adicionar à agenda (.ics)` — `:264` ✓
- Empty state heading `Aguardando agendamento` + body `O RH ainda não agendou sua entrevista. Assim que a data for definida, ela aparecerá aqui.` — `:142-146` ✓ exact
- Error state `Não foi possível carregar os detalhes da sua entrevista.` + `Tentar novamente` — `:119-121,128` ✓ exact (note: the underlying service throws `MeuAgendamentoServiceError` with a *different*, more technical message at `agendamentoCandidatoService.ts:74-78` — correctly NOT surfaced to the UI; the component renders only the static spec copy, never `error.message`)
- Eyebrow `Sua entrevista` — `:93` ✓
- Status labels (Agendada/Em andamento/Concluída/Reagendada/Cancelada/Não compareceu) — `STATUS_CONFIG` `:55-60` ✓ exact match to the semantic palette table
- Tipo labels `Online`/`Presencial` — `:188` ✓
- Data/hora format + `(horário de Brasília)` caption — `:198` ✓
- `Entrar na videochamada` + its two-part aria-label (`"...abre em nova aba)"`) — `:215,219` ✓ exact
- `Local: ` prefix — `:229` ✓
- `≤24h` badge `Sua entrevista é em menos de 24h` — `:251` ✓
- `reagendada` note `O horário da sua entrevista foi atualizado.` — `:236-238` ✓ exact
- `cancelada` note `Esta entrevista foi cancelada. Você será avisado aqui se uma nova data for marcada.` — `:241-244` ✓ exact
- `.ics` button `aria-label="Adicionar entrevista à agenda, baixar arquivo .ics"` — `:260` ✓ exact

**Gap:** two fallback strings for null `local_ou_link` (`:208`, `:229`'s `?? 'a ser confirmado'`) are not itemized anywhere in the spec's Copywriting Contract. Both are reasonable, on-brand pt-BR, and not clinical — no tone violation — but they shipped without going through the contract, which is exactly the kind of drift the copy pillar exists to catch. See Priority Fix #3.

### Pillar 2: Visuals (4/4)

- Layout order matches the spec's ASCII diagram exactly: eyebrow → status+tipo chips (`flex flex-wrap gap-2`, `:175`) → data/hora → link/local → conditional reagendada/cancelada note → conditional 24h badge → conditional `.ics` button (last element, `:256`).
- No icon-only interactive elements: every tappable control (`.ics` button, retry button, video link) pairs its icon with a visible text label — confirmed at `:125,216,261`.
- Chip markup is byte-for-byte equivalent to the pre-existing candidatura-level status chip (`DashboardCandidatoPage.tsx:370-375`) — same class set (`flex items-center gap-2 rounded-lg px-4 py-2 {bg} border border-white/20`, `h-5 w-5` icon, `font-{weight} {color}` label), just class-order-shuffled, which Tailwind treats identically. This is the "identical markup, reuse not reinvent" requirement satisfied.
- Colorblind-safe: every chip/badge (status, tipo, 24h) carries a text label in the same element as its color — verified for all 3.
- Long-text overflow handled: `break-words` present on both the video-link anchor (`:216`) and both link/local `<p>` fallbacks (`:225,228`) — no horizontal overflow risk.
- All icons (`CalendarCheck`, `Clock`, `CheckCircle2`, `RefreshCw`, `AlertCircle`, `Video`, `MapPin`, `Download`, `CalendarClock`) are `aria-hidden="true"` at every render site — confirmed for all instances.
- Two simultaneous turquoise elements (video-link pill + `.ics` button) can render together in the base "online, upcoming, non-cancelled" case. This is spec-mandated (the accent budget explicitly reserves exactly these 2 elements), and the implementation differentiates them well — the video link is a ghost/bordered pill (`border-[#35BFAD]/60 ... text-[#35BFAD]`) while `.ics` is solid (`bg-[#35BFAD]`) — so the two don't visually compete for the same "primary action" read. No deduction.

### Pillar 3: Color (4/4)

- Accent turquoise (`#35BFAD`) appears on exactly 2 elements in the component, matching the spec's explicit budget: the `.ics` button (`:261`, solid) and the video link/pill (`:216`, bordered/tinted). No third turquoise use found anywhere in the file.
- Amber ≤24h badge: `bg-amber-500/25 text-amber-100 border-amber-300/40` (`:249`) — byte-identical to the spec's cited FX-07-fixed pair, correctly excluded from the accent budget (semantic warning, not "this is tappable").
- Semantic status palette (`STATUS_CONFIG`, `:55-60`) matches the spec's 6-row table exactly: `agendada`→green-300/green-500-20, `em_andamento`→blue-300/blue-500-20, `concluida`→gray-300/gray-500-20, `reagendada`→yellow-300/yellow-500-20, `cancelada`→red-300/red-500-20, `nao_compareceu`→gray-300/gray-500-20.
- Neutral tipo chip (`bg-white/10 border-white/20 text-white/80`, `:182`) matches the spec's explicit "never colored, it's not a status signal" instruction.
- `cancelada`/`reagendada` inline notes use `text-red-200/90`/`text-yellow-200/90` (`:236,241`) — one shade lighter than the chip's `-300` tone but the same hue family, and legible against the same translucent white-glass-over-branded-gradient surface every other light-toned text on this page already uses (`GlassCard variant="white"` = `bg-white/15` per `glass.tsx:32`, sitting on a colored gradient background, not a literal white background) — not a new low-contrast combination, just a paler variant of an already-used family.
- Minor, systemic (not phase-35-specific) observation: `#35BFAD` is hardcoded via Tailwind arbitrary-value brackets rather than a semantic `bg-accent`/`text-accent` utility, even though the spec's own color table cites `hsl(var(--accent))` as the canonical token. This is inherited from the rest of `DashboardCandidatoPage.tsx` (e.g. lines 401, 420, 438 do the same) and the spec explicitly directs "reuse verbatim" — not a phase-35 regression, not scored down.

### Pillar 4: Typography (3/4)

- Sizes: only `text-xs` (eyebrow) and `text-sm` (everything else) appear in the new code — 2 distinct sizes, matches the spec's declared scale exactly.
- Weights: `font-semibold` (600) appears correctly on all "Label/emphasis" elements per spec — empty-state heading (`:142`), retry button (`:125`), video-link label (`:216`), 24h badge (`:249`), `.ics` button (`:261`). Default (400) correctly applies to eyebrow/body text (no explicit weight class needed).
- **Deviation:** the status chip's label span (`:180`, `font-medium ${statusInfo.color}`) uses weight 500, not the spec's declared 600 for "status label" under the Label/emphasis row (35-UI-SPEC.md Typography table, line 66). This is a literal, citable violation of the phase's own stated rule ("new copy uses only 400 and 600 ... never introduce a 3rd weight," line 70) — even though it's inherited verbatim from the pre-existing `DashboardCandidatoPage.tsx:372` chip (which has the same weight, pre-dating this phase). See Priority Fix #1.
- Line-height / tracking: `tracking-wide` present on the eyebrow (`:93`) per spec; no explicit line-height overrides anywhere else, consistent with "reuses the page's existing scale."

### Pillar 5: Spacing (3/4)

- No arbitrary/hand-rolled spacing values anywhere except the spec-mandated `min-h-[44px]` touch-target overrides (`:125,216,261`) — every other spacing class is a standard Tailwind scale multiple of 4 (`gap-1/2/3`, `px-3/4`, `py-1.5/2`, `pt-4`, `mt-0.5/4`).
- Chip padding matches the spec's literal declarations: status chip `px-4 py-2` (`:177`) and tipo chip `px-3 py-1.5` (`:182`) both match the spec's explicit per-chip values.
- Container reuses the existing footer separator verbatim: `mt-4 ... border-t border-white/10 pt-4` (`:92`) matches spec instruction to reuse, not reinvent.
- 44px minimum touch targets verified present on all 3 tappable controls the spec calls out: `.ics` button (`:261`), video link/pill (`:216`), and retry button (`:125`) — all carry `min-h-[44px]`. The non-tappable status/tipo chips and the 24h badge correctly do NOT carry this class (they're not controls).
- **Deviation:** the spec's Spacing Scale table declares an `xs`/4px token used for "Icon-to-label gaps (`gap-1`)" (line 48), but grep across the file shows `gap-1` used exactly once (`:141`, a vertical gap between the empty-state heading and body text — not an icon-to-label gap) and every actual icon+label pairing (6 occurrences: `:125,177,182,216,249,261`) uses `gap-2`/8px instead. The 8px value is internally consistent and matches the page's own established icon+label convention (`DashboardCandidatoPage.tsx:329`), so this is not a real UX/consistency problem — but it is a genuine mismatch between the spec's declared token and the shipped code. See Priority Fix #2.

### Pillar 6: Experience Design (4/4)

- All 5 contract states implemented and verified against the States Contract table:
  - **loading** (`:103-112`): 2-line skeleton pulse, `h-4`/`h-3 w-2/3` `bg-white/10 animate-pulse` — byte-identical to spec.
  - **error** (`:115-133`): static copy (never leaks `error.message`), retry button wired to `refetch()` (`:124`), does not block the rest of the candidatura card (only the footer slot is replaced).
  - **no-agendamento** (`:136-151`): `CalendarClock` icon + exact heading/body copy, no chip/button — matches spec.
  - **has-agendamento** (`:153-266`): full chip/date/link/badge/button assembly; `reagendada`/`em_andamento`/`concluida`/`nao_compareceu` all correctly fall through the same branch with only the status chip + conditional note differing, as specified.
  - **cancelada-visible** (`:162-163,195,203,240-245`): data/hora and link/local rows dimmed via `opacity-70`, status chip and tipo chip stay undimmed/prominent, inline cancellation note renders, and `.ics`/24h badge are correctly suppressed via the shared `upcoming` gate (`ehUpcomingNaoCancelada` returns `false` whenever `status === 'cancelada'`) — this is the correct, spec-mandated behavior, not a gap.
- AGEND-05 gating is a clean pure-function pair (`ehUpcomingNaoCancelada`, `estaDentroDe24h` in `agendamentoCandidatoService.ts:223-240`) with `Number.isNaN` guards against invalid `data_hora` — both correctly composed in the component (`:166-167`).
- Security/robustness details that double as UX correctness: unsafe URL schemes (`javascript:`/`data:`) are rendered as inert plain text rather than a clickable anchor (`isSafeHttpUrl`, `:69-76,210-226`); the external video link uses `target="_blank" rel="noopener noreferrer"` (`:213-214`); the `.ics` generator guards against an invalid `data_hora` with a typed error before ever calling `.toISOString()` (`agendamentoCandidatoService.ts:166-172`) instead of throwing an opaque `RangeError`.
- No `outline-none` anywhere in the component — global focus ring is preserved on every tappable control, matching the spec's accessibility requirement.
- No disabled/confirmation states were required (read-only surface, no destructive action) — correctly absent, not a gap.

---

## Files Audited

- `src/features/agendamento/components/AgendamentoCandidatoCard.tsx` (primary subject — 269 lines, full read)
- `src/components/pages/DashboardCandidatoPage.tsx` (mount surface + precedent-chip comparison, full read)
- `src/lib/datetime/formatDataHoraSP.ts` (SP-pinned formatter, full read)
- `src/features/agendamento/services/agendamentoCandidatoService.ts` (`.ics` generation, RFC-5545 folding, AGEND-05 predicates — full read)
- `src/features/agendamento/hooks/useMeuAgendamento.ts` (query hook — full read)
- `src/components/ui/glass.tsx` (`GlassCard variant="white"` background token, to verify contrast assumptions)
- `.planning/phases/35-painel-do-candidato-leitura-do-agendamento/35-UI-SPEC.md` (design contract, full read)

**Registry Safety:** not applicable — no `components.json` in the repo (shadcn primitives are manually vendored per the spec's own Design System table); gate correctly skipped.
