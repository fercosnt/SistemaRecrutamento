# Phase 25 — UI Review

**Audited:** 2026-07-12
**Baseline:** `25-UI-SPEC.md` (approved design contract) + Beauty Smile glass design system
**Screenshots:** not captured — app dev server (port 3003 per CLAUDE.md) not running; ports 3000/8080 are unrelated services. **Code-only audit** (Tailwind class audit, string/copy audit, state-handling + a11y-attribute review).
**Verdict:** ADVISORY / non-blocking. No BLOCKERs. Findings are WARNING-level polish + inherited consistency debt.
**Registry safety:** N/A — `shadcn_initialized: false`, no `components.json`, **no third-party registries** declared (UI-SPEC §Registry Safety). Gate skipped.

> Pillars scored against the **task-specific 6-pillar set** the orchestrator requested for this phase
> (visual hierarchy · consistency · accessibility · responsive · state coverage · copy/microcopy),
> which maps the UI-SPEC checker dimensions to the actual hardening surfaces of Phase 25.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Visual hierarchy | 3/4 | Kanban focal-point (D2) + hub dominant CTA met; hub name header `text-5xl` over-dominates vs 28px display cap |
| 2. Consistency (tokens/spacing/typography) | 2/4 | 9 type sizes vs 4 declared, 2 forbidden weights (`font-bold`/`font-medium`), hex literals `#35BFAD`/`#00109E` (56×) instead of `bg-accent`/`bg-primary` tokens, `min-h` 32/40/44 drift across sibling CTAs |
| 3. Accessibility | 3/4 | Strong aria discipline on new work (aria-hidden glyphs, labelled icon buttons, char counter); RHTopBar mobile-menu button unlabelled + 3 controls below the declared 44px tap-min |
| 4. Responsive behavior | 4/4 | Kanban grid `repeat(6)` desktop / `repeat(4)` tablet / `repeat(2)` mobile exactly per §1; empty-states centered/max-w; code-verified only (no visual) |
| 5. State coverage | 4/4 | Empty / loading / error / terminal all covered — empty-state pages, hub Skeleton + in-shell 404, Kanban terminal pills, reject validation Alert |
| 6. Copy/microcopy | 4/4 | All contract copy verbatim, pt-BR, product-language compliant (no clinical wording); lone nit: modal "Salvar Alterações" (Title Case) vs contract "Salvar alterações" |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **Typography scale drift — 9 distinct sizes + 2 off-contract weights** (Consistency 2/4). UI-SPEC §Typography declares exactly **4 sizes** (`text-sm/base/xl/3xl`) and **2 weights** (400 + semibold-600; bold-700 explicitly forbidden). Delivered surfaces use `text-xs/lg/2xl/4xl/5xl` on top of the 4, plus `font-bold` (`KanbanBoard.tsx:247`, `UpdateStatusModal.tsx:175`, `CandidatosRHPage.tsx:457/872`) and `font-medium` (16×). *User impact:* uneven heading rhythm across RH surfaces. *Fix (scoped, since most is inherited debt):* at minimum cap the hub name header `HubCandidatoRH.tsx:162` `text-5xl`→`text-3xl` (28px display max) and swap the 4 `font-bold`→`font-semibold`; log the `text-xs`/`text-2xl` dense-card patterns as pre-existing M1/Phase-17 debt for a dedicated typography pass.

2. **Brand color hardcoded as hex literals instead of design tokens** (Consistency 2/4). `#35BFAD` appears 36× and `#00109E` 20× across the scoped files rather than the `bg-accent`/`bg-primary` / `variant="accent"` tokens (memory `reference_bg_primary_token_fixed` confirms `bg-primary` is valid — prefer the token). *User impact:* none at runtime, but any future palette change requires a 56-site sweep and risks drift. *Fix:* replace literal `bg-[#35BFAD]`/`bg-[#00109E]` with `bg-accent`/`bg-primary` (and `text-primary`/`text-accent`) — `CriarEditarVagaPage` already models this correctly via `GlassButton variant="accent"`.

3. **Tap targets below the declared 44px minimum + one unlabelled icon button** (Accessibility 3/4). UI-SPEC §Spacing declares "touch target minimum 44px for **every** interactive control", yet Kanban "Ver Perfil" is `min-h-[32px]` (`KanbanBoard.tsx:260`), and the Comparativo Avançar/Rejeitar/export + Candidatos actions are `min-h-[40px]` (`ComparativoScreen.tsx:163/318/348`, `CandidatosRHPage.tsx:410`). Separately, the RHTopBar mobile-menu button (`RHTopBar.tsx:61-66`) is icon-only (`<Menu/>`) with **no `aria-label`/`sr-only`** — no accessible name. *User impact:* harder taps + a screen-reader-nameless control on mobile. *Fix:* raise those controls to `min-h-11`/`min-h-[44px]`; add `aria-label="Abrir menu"` (or `<span className="sr-only">`) to the RHTopBar button — mirror the already-correct `RHSidebar` collapse/logout buttons.

---

## Detailed Findings

### Pillar 1: Visual hierarchy (3/4)
- **PASS** — Kanban focal-point contract (D2) implemented: at rest the eye anchors on the per-column gradient hue bar + emoji + label + count pill; during drag the green dashed "Solte aqui" drop indicator is the sole competing anchor (`KanbanBoard.tsx:319-356`). No competing focal element introduced.
- **PASS** — Hub RH leads with a single dominant turquoise "Próximo passo" CTA (`HubCandidatoRH.tsx:169-186`) + name header + etapa chip + 8-stage timeline; passed/current/future states visually differentiated (`:200-218`).
- **PASS** — Gated empty-states use the canonical centered `GlassCard` rhythm (muted lucide icon 48px + 20px/600 heading + muted body, `py-12`) — `ConfiguracoesPage.tsx:35-46`, `MeuPerfilPage.tsx:31-41`.
- **WARNING** — `HubCandidatoRH.tsx:162` name header is `text-5xl` (~48px), well above the spec's 28px page-display cap; it over-dominates the dominant CTA below it and inverts the intended "CTA-first" hierarchy on the hub. (Inherited from Phase 17; the Phase-25 not-found state in the same file correctly uses `text-xl` at `:130`.)

### Pillar 2: Consistency — glass tokens / spacing / typography (2/4)
- **WARNING (typography)** — 9 distinct type sizes vs 4 declared: `text-sm` (64×), `text-xs` (22×), `text-xl` (12×), `text-base` (9×), `text-2xl` (4×), `text-3xl` (3×), `text-lg`/`text-4xl`/`text-5xl` (1× each). `text-xs` dense micro-labels dominate the Kanban card (score chip/contacts/Ver-Perfil).
- **WARNING (weights)** — `font-medium` (16×) and `font-bold` (4×: `KanbanBoard.tsx:247`, `UpdateStatusModal.tsx:175`, `CandidatosRHPage.tsx:457/872`) violate the 400 + semibold-600-only rule. Spec: "Bold (700) is NOT used."
- **WARNING (tokens)** — hardcoded `#35BFAD` (36×) + `#00109E` (20×) instead of `bg-accent`/`bg-primary`. Most within the accent reserved-for list (active nav `RHSidebar:209`, CTAs, avatar fills) but expressed as literals, not tokens. One over-reach: the hub etapa chip is a **badge** styled `bg-[#35BFAD]` (`HubCandidatoRH.tsx:163`) — spec says accent is "NOT applied to badges."
- **WARNING (spacing)** — `min-h` drift across sibling interactive controls: 32px (`KanbanBoard:260`), 40px (`ComparativoScreen:163/318/348`, `CandidatosRHPage:410`), 44px (`HubCandidatoRH` ×5, `DecisaoFinalPage:157`). New Phase-25 work nails 44px; adjacent controls don't.
- *Attribution:* the bulk of the type/weight/hex debt is **inherited** (M1 dense cards, Phase-17 hub) — this is a hardening phase reusing existing surfaces (UI-SPEC framing). Scored on the delivered artifact, which is internally inconsistent; not a Phase-25 regression.

### Pillar 3: Accessibility (3/4)
- **PASS** — Kanban column emoji glyph `aria-hidden="true"` (`KanbanBoard.tsx:325`); hub back-link `ArrowLeft` `aria-hidden` (`HubCandidatoRH.tsx:144`); ComparativoScreen action icons all `aria-hidden`.
- **PASS** — Icon-only controls in `RHSidebar` carry accessible names: collapse toggle `aria-label` (`:274`), collapsed logout `aria-label="Sair"` (`:264`), mobile toggle `sr-only "Abrir menu"` (`:293`).
- **PASS** — Reject justificativa textarea wired for a11y: `aria-describedby="motivo-rejeicao-ajuda"` + live char counter `{len}/{50}` with green-on-valid state (`UpdateStatusModal.tsx:246-262`); reject action stays `disabled` until ≥50 chars (`:325-330`).
- **WARNING** — `RHTopBar.tsx:61-66` mobile-menu button is icon-only (`<Menu/>`) with no `aria-label`/`sr-only` → no accessible name (grep confirms zero aria-label/sr-only in the file).
- **WARNING** — sub-44px tap targets on `KanbanBoard:260` (32px) and `ComparativoScreen:163/318/348` + `CandidatosRHPage:410` (40px) contradict the spec's own 44px "every interactive control" exception (desktop-first mitigates severity).
- **UNVERIFIED** — glass text contrast (`white/50`–`white/70` on translucent surfaces, e.g. `KanbanBoard:337` "Arraste aqui", `RHTopBar:86`) not measurable without screenshots; flag `needs_human_review` for a rendered contrast check.

### Pillar 4: Responsive behavior (4/4)
- **PASS** — Kanban grid implements the §1 contract exactly: `grid-cols-[repeat(2,…)] md:grid-cols-[repeat(4,…)] lg:grid-cols-[repeat(6,…)]` inside a horizontal-scroll container (`KanbanBoard.tsx:407`); the old `repeat(7)` was correctly reduced to `repeat(6)` and terminals removed as columns.
- **PASS** — Empty-state pages use `max-w-7xl`/`max-w-4xl` centered with responsive `p-8`; hub timeline `flex-wrap`; sidebar mobile drawer + backdrop; TopBar hides user labels `hidden md:block`.
- **MINOR** — at 375px the 2-col mobile grid (`minmax(200px,280px)` ×2 = 400px min) forces horizontal scroll; inherent to a mobile Kanban and acceptable, but worth a visual confirm.
- *Caveat:* verified from the class contract only — no dev server, so rendered breakpoints not visually confirmed.

### Pillar 5: State coverage — empty / loading / error / terminal (4/4)
- **PASS (empty)** — `/rh/configuracoes` + RH `/rh/perfil` replaced with centered no-CTA empty-states (UX-06); Kanban empty column shows "Arraste aqui" (`KanbanBoard.tsx:337`); hub sections render `sem_dados`/`futuro` via `HubSection`.
- **PASS (loading)** — hub gates on `loadingContexto` with `Skeleton` (`HubCandidatoRH.tsx:158`); modal shows "Salvando..." on `isPending` (`UpdateStatusModal.tsx:333`); ComparativoScreen uses `AsyncState` + `Loader2`.
- **PASS (error)** — explicit in-shell 404 "Candidatura não encontrada" gated on settled query `!loadingContexto && (errorContexto || !contexto)` (`HubCandidatoRH.tsx:120-152`) — correctly NOT the global NotFoundPage; modal surfaces `validationError` in a destructive Alert (`:290-300`).
- **PASS (terminal)** — terminal candidaturas render a green `Aprovado` / red `Rejeitado` pill on the card (`KanbanBoard.tsx:89-108, 208-219`); no "Rejeitado" drop column exists, closing the reject-without-trail vector at the UI (§1).
- **MINOR** — hub "Score de Triagem" section is hardwired `temDados=false` (`HubCandidatoRH.tsx:231`) so it never shows data — intentional (redirects to the triagem panel) but effectively a static pointer.

### Pillar 6: Copy / microcopy (4/4)
- **PASS** — all Copywriting Contract strings present verbatim: "Salvar alterações" (`CriarEditarVagaPage.tsx:1163`), "Gestão de usuários ainda não disponível" + body (`ConfiguracoesPage.tsx:39-43`), "Edição de perfil em breve" + body (`MeuPerfilPage.tsx:35-38`), "Candidatura não encontrada" + body + "Voltar aos candidatos" (`HubCandidatoRH.tsx:130-146`), reject audit copy citing RNF-07a/LGPD-02 (`UpdateStatusModal.tsx:251-253`).
- **PASS** — Kanban labels sourced from the single-source `ETAPA_M2_LABELS` (no hardcoded 2nd copy, `KanbanBoard.tsx:79`); drag/drop copy "Arraste aqui" (rest) / "Solte aqui" (active) reads cleanly.
- **PASS** — product-language compliant: grep for `teste psicol`/`psicológic` across all scoped files → **none**; hub uses "avaliação comportamental/cognitiva".
- **NIT** — `UpdateStatusModal.tsx:333` button reads "Salvar Alterações" (Title Case) while the contract CTA is "Salvar alterações" (sentence case); align capitalization. (Inherited Title-Case pt-BR labels elsewhere, e.g. `STATUS_LABELS`, are also sentence-case-divergent but out of this phase's copy contract.)

---

## Files Audited
- `src/components/KanbanBoard.tsx` — 6-stage rewire, terminal pills, responsive grid, Ver-Perfil id forward
- `src/components/modals/UpdateStatusModal.tsx` — reject justificativa ≥50-char gate + audit copy
- `src/components/pages/CriarEditarVagaPage.tsx` — "Salvar alterações" accent CTA + edit-path
- `src/features/hub-candidato/components/HubCandidatoRH.tsx` — in-shell 404 not-found, timeline, CTAs
- `src/components/pages/ConfiguracoesPage.tsx` — gated empty-state (A14)
- `src/components/pages/MeuPerfilPage.tsx` — gated empty-state (A37)
- `src/components/RHSidebar.tsx` — badge removal, role-gated Admin item, labelled icon buttons
- `src/components/RHTopBar.tsx` — no-op search removed; mobile-menu button (a11y finding)
- `src/components/pages/CandidatosRHPage.tsx` — 3 no-op dropdown items removed
- `src/components/pages/VagasRHPage.tsx` — real per-vaga counts (RH sessions)
- `src/features/decisao/components/DecisaoFinalPage.tsx` — presence-gated ComparativoScreen embed
- `src/features/triagem/components/ComparativoScreen.tsx` — `showActions` presence-gating of avançar/rejeitar
