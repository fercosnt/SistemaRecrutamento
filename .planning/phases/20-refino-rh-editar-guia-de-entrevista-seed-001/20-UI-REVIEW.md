# Phase 20 — UI Review

**Audited:** 2026-06-30
**Baseline:** `20-UI-SPEC.md` (approved design contract — Área 3 locked interaction model)
**Screenshots:** not captured. Dev server IS up (port 3003 → 200), but the audited surface lives behind RH auth at `/rh/candidato/:id/entrevista` (Guia tab) and requires a real authenticated session + candidatura id. A blind CLI screenshot of `localhost:3003` would capture only the public/login surface, not `GuiaEntrevistaPanel` edit mode. Audit is code-level (class/string/state analysis against the verbatim UI-SPEC contract).
**Stance:** advisory (non-blocking). Scope bounded to ENTREV-06/07 edit mode; evaluated on scoped merits.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every contract string present verbatim, single-sourced in `COPY`; PT-BR; no generic labels. |
| 2. Visuals | 4/4 | Clear edit/view hierarchy; all icon-only buttons carry `aria-label`; decorative icons `aria-hidden`. |
| 3. Color | 3/4 | Accent reserved correctly, BUT a hardcoded `#00109E` literal leaks onto the Select popover (off-contract). |
| 4. Typography | 4/4 | Exactly 4 sizes {xs,sm,base,xl} + one explicit weight (font-semibold); inside the declared scale. |
| 5. Spacing | 4/4 | All spacing on the 4-grid; `min-h-[44px]` is the spec-mandated target; `12px` carry-over intentional. |
| 6. Experience Design | 2/4 | States covered, BUT the save-error region is a hand-rolled band, NOT the `<AsyncState>` the scope says to reuse — and it ships NO retry button despite the contract listing "Tentar novamente". |

**Overall: 21/24**

---

## Top 3 Priority Fixes

1. **Save-error has no retry affordance (WARNING)** — UI-SPEC §Copywriting Contract lists a *"Save retry"* row: **"Tentar novamente"** / **"Tentando…"** (the AsyncState retry idiom), and the scope lock says the save in-flight/error should *"reuse `<AsyncState>` error idiom for the in-flight save."* The implemented error band (`GuiaEntrevistaPanel.tsx:568-578`) is a static `role="alert"` div with heading + body only — there is **no retry button** and `AsyncState` is **never imported**. After a transient/network save failure the RH must manually re-click "Salvar edições" (which is still enabled, so it is recoverable — hence WARNING not BLOCKER), but the contracted one-tap retry is missing. *Fix:* either render the save-error through `<AsyncState glass={false} isError errorCode={saveErrorCode} onRetry={handleSave} retrying={saving} copy={{ error: { heading: COPY.errHeading, generic: COPY.errGeneric } }} />`, or add a "Tentar novamente" `GlassButton` (calling `handleSave`) to the existing band.

2. **Hardcoded `#00109E` brand-blue on the Select popover (WARNING)** — `GuiaEntrevistaPanel.tsx:223` sets `bg-[#00109E]/95` on `<SelectContent>`. UI-SPEC §Color declares ONLY `#35BFAD` as a literal-hex accent and routes every other surface through `white/*` glass tokens; `#00109E` is not on any declared list and per project memory the `bg-primary` token is the sanctioned brand-blue route (`reference_bg_primary_token_fixed`: "use `bg-primary`, not hex `#00109E`"). *Fix:* replace `bg-[#00109E]/95` with the token form (`bg-primary/95` or the project's glass popover surface) so the dimensão dropdown matches the token system and survives a theme change.

3. **AsyncState `slow`@8s escalation is silently dropped on save (WARNING)** — the scope lock explicitly names *"`slow`@8s + `error` + retry idiom"* as the contract to reuse. The hand-rolled band covers only the error leg; there is no slow-state ("Estamos processando com IA…" / "Salvando…" timed escalation). The save RPC is fast (no Anthropic call — CONTEXT Área 1), so this is low user-impact, but it is a contract divergence from the named idiom. *Fix:* folding the save states into `<AsyncState>` (fix #1) reuses the `slow` timer for free; otherwise document the omission as an accepted deviation in the SUMMARY.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
**PASS.** Every contracted string is present, verbatim, and single-sourced in the `COPY` const (`GuiaEntrevistaPanel.tsx:69-93`) — the no-drift idiom the UI-SPEC mandates.

- Toggle "Editar guia" (L70, used L495); primary "Salvar edições" + "Salvando…" (L71-72, L590); "Cancelar" (L73); "Adicionar pergunta"/"Adicionar" (L74-75); labels "Pergunta"/"Dimensão" (L76-77); dirty hint "Você tem edições não salvas." (L78); reorder aria "Mover para cima"/"Mover para baixo" (L79-80); delete aria "Remover pergunta" (L81); badges "IA"/"Manual" (L82-83).
- Delete dialog copy matches verbatim: title "Remover esta pergunta?" (L84), body about removal-on-save (L85-86), confirm "Remover pergunta" (L87) — the resolved checker FLAG.
- Save-error copy keyed by code (L90-92): "Não foi possível salvar agora." + generic / permission body — never echoes the raw RPC error (T-20-16 honored at the copy layer).
- No generic labels (no bare "Submit"/"OK"/"Save"); all PT-BR.
- Minor: the contract's empty-state heading "Nenhum guia gerado ainda" + body "Gere o guia para preparar a entrevista." are merged into one `emptyBody` line (L88) rendered as a single `<p>` (L538) rather than heading+body. Cosmetic; copy content is intact. Not scored down.

### Pillar 2: Visuals (4/4)
**PASS.** Clear hierarchy and a11y affordances throughout.

- Focal point: the accent "Salvar edições" `GlassButton` (L583-591, `variant="accent"`) is the single committing action; Cancelar is neutral `variant="white"` — correct primary/secondary differentiation.
- Every icon-only control carries an `aria-label`: reorder up/down (L237/L248), delete (L256), and decorative icons are `aria-hidden="true"` (L130, L242, L251, L260, L314, L494, L510, L519, L589, L598).
- Origem badge gives IA (accent + Sparkles, L128-133) vs Manual (neutral, L122-126) visual distinction — the ENTREV-08 audit affordance, user-observable in both view and edit modes.
- Reorder boundary buttons are `disabled` (L239/L248), not hidden → stable focus order (a11y, matches §Accessibility).
- Leading question number `font-semibold text-white` (L143, L205) anchors each row.

### Pillar 3: Color (3/4)
**WARNING — one off-contract hardcoded literal.**

- Accent `#35BFAD` usage audited (`grep`): 4 literal sites — IA badge border+bg (L129), IA badge Sparkles (L130), and the two generate-CTA Sparkles (L510, L519) — all on the §Color reserved list. The "Salvar edições" accent is routed through `GlassButton variant="accent"` → `bg-brand-accent/10` (token), correct. **Accent is NOT on** Manual badge / Cancelar / reorder / delete — matches the explicit closed list and RNF-07a (accent never on a destructive control).
- Destructive red idiom correct: delete button + confirm action use `border-red-400/30 bg-red-500/15 text-red-300` (L258, L274) — matches the declared destructive tokens and the TranscricaoReviewPanel idiom.
- **Defect (`GuiaEntrevistaPanel.tsx:223`):** `<SelectContent className="… bg-[#00109E]/95 …">` — a hardcoded brand-blue hex that is on NO declared color list. §Color routes non-accent surfaces through `white/*` glass tokens, and project memory (`reference_bg_primary_token_fixed`) says use `bg-primary`, not the `#00109E` literal. This is the only color contract miss → caps the pillar at 3.

### Pillar 4: Typography (4/4)
**PASS.** `grep` distribution: `text-base` ×6, `text-sm` ×13, `text-xl` ×1, `text-xs` ×5 → exactly the 4 declared sizes {12,14,16,20}; nothing outside the scale. Weights: `font-semibold` ×19 (the only explicit weight); body text uses the implicit `font-normal` default → 400/600 only, as contracted.

- Inline `Input` for pergunta is `text-base text-white/90` (L211) — matches the displayed question typography (L142) so toggling edit mode does not reflow row height (the explicit §Typography rule).
- "Âncoras BARS 1–5" eyebrow is `text-xs font-semibold uppercase` (L155, L284) in both modes — consistent.

### Pillar 5: Spacing (4/4)
**PASS.** `grep` shows every spacing class on the 4-grid: `gap-1`, `gap-2`, `px-2/3/4`, `py-0.5/2/3`, `space-y-1/2/3/4`. Row inner padding `px-3 py-3` (L140, L203) is the intentional 12px carry-over from the read-only `PerguntaRow` (§Spacing exception — preserves visual continuity with view mode). The only bracketed arbitrary value is `min-h-[44px]` ×12 — the spec-mandated 44px touch/click target on every interactive control. No rogue px/rem values.

- Note (a11y, not spacing-scored): icon-only reorder + delete buttons are `h-9 w-9` = 36px, below the 44px preference. §Spacing permits this *only if keyboard-focusable with a visible ring* — they satisfy it (`focus-visible:ring-2 focus-visible:ring-white/40` L240/L249, `ring-red-300/50` L258). Within contract, but the 44px-preferred path was not taken.

### Pillar 6: Experience Design (2/4)
**WARNING — state coverage is solid, but the named `<AsyncState>` reuse contract is not honored.**

State machine coverage vs §Interaction Contract:
- **view / edit toggle** — present; "Editar guia" `disabled` when no guide (`!hasGuide`, L491). ✓
- **dirty** — `dirty` flag set on every change (L433-436); Salvar `disabled={saving || !dirty}` (L586); optional hint shown (L580). ✓
- **saving** — label → "Salvando…" + disabled, no double-submit (L590, L474 guard). ✓
- **save-success** — `useEffect` resets draft + exits edit on guide reference change (L414-418); host fires toast "Edições do guia salvas." (`EntrevistaWorkspace.tsx:96-98`). ✓
- **delete confirm** — AlertDialog, removal staged in draft, persisted only on save (L253-280, L460-462). ✓
- **reorder** — up/down swap with boundary `disabled` (L446-458). ✓
- **RNF-07a** — panel only mutates the guide jsonb; no `candidaturas` write. ✓

**Defects driving the 2:**
- **(BLOCKER-of-contract, user-impact WARNING) No `<AsyncState>` reuse + no retry button.** The scope lock and §Copywriting "Save retry" row contract a "Tentar novamente"/"Tentando…" retry on save failure via the AsyncState idiom. The implementation rolls its own static error band (L568-578) with heading+body only; `AsyncState` is never imported into this file. The error is recoverable (the dirty draft is preserved and Salvar stays enabled), so a task is not *broken* — but the contracted one-tap retry + the `slow`@8s escalation are both absent. This is the single largest divergence from the design contract in the phase.
- The error band is `role="alert"` (good) but lives below the Add form; on a tall guide the RH may not see it without scrolling. Minor.

Two findings against this pillar (the auditor requirement that every scored pillar carry ≥1 specific finding is met across all six).

---

## Registry Safety

Not applicable. `components.json` is absent (`NO_COMPONENTS_JSON`) — shadcn is vendored (Figma Make export), and UI-SPEC §Registry Safety lists **zero third-party registries** (all primitives already in `src/components/ui/`; `react-dnd` intentionally NOT used). No new dependency added (SUMMARY `tech-stack.added: []`). Registry audit skipped per the gate.

---

## Files Audited

- `src/features/entrevista/components/GuiaEntrevistaPanel.tsx` (the edit-mode panel + EditablePerguntaRow + OrigemBadge + AddPerguntaForm — primary subject)
- `src/features/entrevista/components/EntrevistaWorkspace.tsx` (host wiring: saveEdits/saving/saveError/saveErrorCode + success toast)
- `src/components/ui/AsyncState.tsx` (the in-flight/error/retry contract the scope says to reuse — confirmed NOT imported by the panel)
- `src/components/ui/glass.tsx` (GlassButton `variant="accent"` → `bg-brand-accent/10` token verification)
- `.planning/.../20-UI-SPEC.md` (audit baseline), `20-CONTEXT.md` (Área 3 locked decisions), `20-05-PLAN.md`, `20-05-SUMMARY.md`
