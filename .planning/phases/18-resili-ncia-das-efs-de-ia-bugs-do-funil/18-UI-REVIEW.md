# Phase 18 — UI Review

**Audited:** 2026-06-29
**Baseline:** `18-UI-SPEC.md` (approved design contract — `<AsyncState>` States Contract + verbatim PT-BR copy + Color/Typography/Spacing tokens)
**Screenshots:** partial — dev server live on :3003; only the public landing page is reachable unauthenticated. The 5 `<AsyncState>` adoption surfaces are auth-gated (RH/candidate) and route-deep, so the substantive audit is **code-level** (appropriate: RESIL-03 is state-rendering logic, not new layout). Landing capture confirmed the glass UI / brand tokens render.
**Scope note:** Hardening phase. ONE shared `<AsyncState>` graceful-degradation wrapper (loading → slow → error → empty → success) adopted on 5 AI-backed screens + `HubSection` refactored to delegate. No new screens, no new tokens. Scored on scoped merits, not whole-system perfection.
**Advisory / non-blocking.**

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All 9 verbatim PT-BR contract strings single-sourced in one `COPY` const; AI_UNAVAILABLE vs generic split correct; no English label leakage |
| 2. Visuals | 4/4 | Exactly-one-of-5-states render in binding priority order; AlertTriangle as signal-only; every icon `aria-hidden`; header correctly inside success children (no flash) |
| 3. Color | 4/4 | `<AsyncState>` is intentionally neutral — `text-red-300` icon ONLY, no accent fill, no red background. Hex colors in adopter screens are all pre-Phase-18 (not introduced here) |
| 4. Typography | 3/4 | Wrapper holds to two-weight / 3-size contract (`text-sm`/`text-base`/`text-lg`, `font-semibold`). `ConsolidacaoDashboard` domain-empty block uses `text-xl` heading + un-muted body — diverges from the standardized empty/error typography |
| 5. Spacing | 4/4 | All spacing on the 4-multiple scale (`p-6`/`p-12`/`py-12`/`gap-2`/`gap-3`); the single arbitrary value is the declared `min-h-[44px]` touch-target exception |
| 6. Experience Design | 4/4 | Five states + standardized retry + disabled-while-retrying (no double-submit) + slow-timer that never overwrites a resolved state; WR-04 + WR-05 both reflected; 11/11 contract tests green |

**Overall: 23/24**

---

## Top 3 Priority Fixes

1. **(WARNING) `ConsolidacaoDashboard` domain-empty block typography drifts from the wrapper's standardized empty/error block** — `ConsolidacaoDashboard.tsx:118-125` renders the "Ainda não há scorecards para consolidar" heading at `text-xl font-semibold` and its body with no size/opacity class, while `<AsyncState>`'s `EstadoVazio` standardizes `text-base font-semibold text-white` (md:text-lg) heading + `text-sm text-white/70` body. The two empty-ish states now look visibly different on the same screen. *User impact:* minor visual inconsistency between AsyncState's generic empty and this domain empty. *Fix:* align the domain-empty block to the `EstadoVazio` typography (`text-base font-semibold text-white` heading; `text-sm text-white/70` body) — the phase's stated goal is "the two never drift."

2. **(WARNING) `DevolutivaBigFiveView` — the literal ~30s Big Five devolutiva read — is NOT on `<AsyncState>`** (explicitly deferred in `18-06-SUMMARY.md` → `deferred-items.md`). The slow-copy "Estamos processando com IA… ~30s" was wired onto the *questionnaire* read region (`getBigfiveItens`, a fast DB read that correctly got the *neutral* WR-04 override), not onto the actual slow AI call. *User impact:* the one screen where the ~30s slow-copy is most needed (the real AI devolutiva) does not yet show it — the candidate can still hit a bare/blank wait there. *Fix:* adopt `<AsyncState>` on `DevolutivaBigFiveView.tsx` with the DEFAULT (non-overridden) slow copy, since that IS a genuine ~30s AI call.

3. **(WARNING) Duplicate inline `extractEfErrorCode` logic in `entrevistaService.ts:573` (and a per-screen `errorCodeOf()` repeated in 5 components)** — carried from 18-05's deferred list. Each adopter screen re-declares its own `errorCodeOf(error)` instead of importing one shared helper, re-introducing the exact per-service drift the shared `extractEfErrorCode` was created to kill. *User impact:* none today (all copies are identical), but a future error-code addition must be hand-applied in 6 places — a regression vector for the copy split. *Fix:* export one `errorCodeOf(error: ServiceErrorLike)` next to `extractEfErrorCode` in `@/lib/efErrors` and have all adopters import it; drop the inline duplicate in `entrevistaService.ts`.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

Excellent — full contract compliance.

- **All 9 verbatim PT-BR strings present and single-sourced** in one `COPY` const (`AsyncState.tsx:56-76`): slow heading/body, error heading, `overload` body, `generic` body, empty heading/body, retry `label`, retry `inflight`. Grep confirms each verbatim against the `18-UI-SPEC §Copywriting Contract` — zero paraphrase.
- **AI_UNAVAILABLE → sobrecarga / else → generic split is correct** (`AsyncState.tsx:175`): `errorCode === AI_UNAVAILABLE ? overload : generic`. The contract's two error bodies are both reachable and both asserted in the test (`AsyncState.test.tsx`, 11/11 green).
- **No generic English label leakage** in any of the 7 audited files (grep for `submit`/`OK`/`went wrong`/`try again` returned only legitimate identifiers like `handleSubmit`, `submittedIds`).
- **MIXED_VAGA copy preserved verbatim** (`ComparativoScreen.tsx:78-79`) via a per-call `error.generic` override — the Phase-10 "vagas diferentes" string never collapses into the generic/sobrecarga copy.
- **WR-04 neutral slow-copy override** is correctly applied on all four NON-AI DB-read screens (BigFive questionnaire `:387`, SJT `:192`, Redação `:248`, HubSection `:94`) — "Carregando… / Isso pode levar alguns segundos." instead of the factually-wrong "processando com IA / ~30s" on a plain DB read. This is a genuinely sharp distinction the team got right.

### Pillar 2: Visuals (4/4)

- **Exactly-one-of-5-states render** in the binding priority order `loading → slow → isError → isEmpty → children` (`AsyncState.tsx:161-208`). Verified each branch is mutually exclusive (`if / else if` chain).
- **AlertTriangle is a signal, never a fill** (`AsyncState.tsx:178`: `h-8 w-8 text-red-300`) — no red background/border, matching `18-UI-SPEC §Color` ("red off the verdict, signal only").
- **Every icon carries `aria-hidden="true"`** (Loader2 slow `:167`, AlertTriangle `:178`, Loader2 retry `:191`, RotateCcw `:196`) — 4 a11y attributes in the wrapper; `ComparativoScreen` carries 13 (`scope`, `aria-hidden`). The retry GlassButton's label is real text, so the action is screen-reader-named.
- **Header band does not flash** during loading/error: in `ComparativoScreen.tsx:143` the SugestaoIABadge + Exportar-PDF header sits INSIDE `<AsyncState>` children, so it renders only on success — no transient header over a skeleton.
- Visual hierarchy in the state blocks is clear (icon → semibold heading → muted body → action), centered with `py-12`/`p-12` breathing room per the `ConsolidacaoDashboard` idiom.

### Pillar 3: Color (4/4)

- **`<AsyncState>` is intentionally neutral** — grep of the component for accent/destructive classes returns ONLY `text-red-300` (the error icon, 1 use) and zero `bg-primary`/`text-accent`/`#35BFAD`/red-fill. This is exactly the `18-UI-SPEC §Color` directive ("nothing new in this phase; the retry uses `variant="white"`, not accent").
- **Hardcoded hex in the adopter screens is all pre-Phase-18.** The 18 hex hits (`#35BFAD`, `#00109E`, `#6EE6D6`) live in `ComparativoScreen` (Phase 10), `SjtCasoAbertoScreen` (Phase 11), `RedacaoEditorScreen` (Phase 13), `BigFiveQuestionnaireScreen` (Phase 12). None sit on a line Phase 18 touched (the `<AsyncState>` adoption added the wrapper + `errorCodeOf`, not new color). Out of scope for a hardening pass; noted only so the score isn't mistaken for "no hardcoded color exists anywhere."
- The 60/30/10 split is untouched by this phase (dark-glass surface 60% / white-translucent 30% / accent 10% reserved) — landing-page screenshot confirms the brand surface renders correctly.

### Pillar 4: Typography (3/4)

The only pillar with a real defect, hence the −1.

- **The wrapper itself is fully compliant** — three sizes only (`text-sm`, `text-base`, `text-lg`) and ONE weight (`font-semibold`), matching `18-UI-SPEC §Typography` ("two weights: regular body / semibold heading"; state-block heading `text-base font-semibold text-white`, body `text-sm text-white/70`). `EstadoVazio` (`AsyncState.tsx:104-110`) is the canonical block.
- **DEFECT — `ConsolidacaoDashboard` domain-empty diverges** (`ConsolidacaoDashboard.tsx:118-125`): heading is `text-xl font-semibold` (vs the standardized `text-base`/md:`text-lg`) and the body `<p>` carries no size/opacity (inherits, no `text-sm text-white/70`). So on a screen that ALSO uses `<AsyncState>`'s generic empty, the two empty states render at different sizes/weights. This contradicts the phase's explicit "never drift" goal. It is a deliberate success-path branch (a loaded-but-empty content state, per the SUMMARY) — keeping it as a branch is fine, but it should reuse the `EstadoVazio` typography.
- No `>4 sizes` or `>2 weights` violation anywhere in the audited set; the issue is consistency, not scale explosion.

### Pillar 5: Spacing (4/4)

- **All spacing on the 4-multiple scale declared in `18-UI-SPEC §Spacing Scale`**: `p-6` (lg/24px glass padding), `p-12`/`py-12` (xl/48px centered breathing room), `gap-2`/`gap-3` (sm), `space-y-3`, plus icon/skeleton sizing (`h-24`, `h-8`, `h-6`, `h-4`, `w-full`, `max-w-md`).
- **The single arbitrary value is `min-h-[44px]`** on the retry GlassButton (`AsyncState.tsx:187`) — the declared, deliberate touch-target exception (mobile candidate surfaces), NOT arbitrary drift. No stray `[13px]`/`[1.7rem]`-type values.
- HubSection delegation keeps `p-6` on its own glass shell and passes `glass={false}` so there is no double-surface / double-padding.

### Pillar 6: Experience Design (4/4)

- **Full five-state coverage + standardized retry.** Loading skeleton (`:164`), slow escalation (`:165-171`), error + AlertTriangle + body + retry (`:174-203`), empty (`:204`), success children (`:207`).
- **No-double-submit on retry** — `disabled={retrying}` + `Loader2` + "Tentando…" (`:186-200`). Submit buttons on the candidate screens keep their own inline in-flight (`Enviando…` + disabled) per `18-UI-SPEC §Slow-call submit affordance`.
- **Slow-timer correctness** — `useEffect` resets `isSlow` on every loading transition and clears on unmount (`:149-157`), so a resolved success/error is shown immediately and never overwritten by a stale slow flag (the binding rule). Test asserts this with fake timers (`advanceTimersByTime(8000)`).
- **WR-04 (neutral slow-copy on DB reads)** and **WR-05 (BigFive empty-items guard, `ordered.length === 0` → "Avaliação indisponível no momento" + back-to-panel, `BigFiveQuestionnaireScreen.tsx:412-422`)** are both present in the shipped code — the code-review fixes are reflected.
- **Information-disclosure safe** — the error state renders only static copy keyed off the `errorCode` STRING; it never echoes the raw transport/Supabase error (T-18-04-ID), confirmed in code and by the per-screen `errorCodeOf()` returning only the code.
- 11/11 `AsyncState` contract tests green; full suite 657 tests passing per SUMMARY.
- Minor (informational, no deduction): the per-screen `errorCodeOf()` is copy-pasted across 5 components instead of shared — see Top Fix #3. Functionally identical today; flagged as a maintenance/drift vector only.

---

## Registry Safety

`components.json` absent (`NO_SHADCN`) — shadcn vendored manually; `18-UI-SPEC §Registry Safety` declares the gate **not applicable** (no registry installs; `<AsyncState>` composes only already-vendored `Glass`/`GlassButton`/`Skeleton` + lucide icons). Registry audit **skipped** per the gate. No third-party blocks to scan.

---

## Files Audited

- `src/components/ui/AsyncState.tsx` (the shared wrapper — primary subject)
- `src/features/hub-candidato/components/HubSection.tsx` (generalized base, delegates)
- `src/features/decisao/components/ConsolidacaoDashboard.tsx` (RH adopter — retry exemplar source)
- `src/features/triagem/components/ComparativoScreen.tsx` (RH adopter — MIXED_VAGA preserved)
- `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx` (candidate adopter — WR-05 guard)
- `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx` (candidate adopter)
- `src/features/avaliacao/components/RedacaoEditorScreen.tsx` (candidate adopter — migrated from bespoke retry)
- `src/components/ui/glass.tsx` (Glass/GlassButton API, for class verification)
- Baseline docs: `18-UI-SPEC.md`, `18-CONTEXT.md`, `18-04/05/06-PLAN.md`, `18-04/06-SUMMARY.md`

Verification run: `npm run test:run -- src/components/ui/__tests__/AsyncState.test.tsx` → 11 passed. Landing-page screenshot captured to `.planning/ui-reviews/18-20260629-144116/desktop.png` (gitignored).
