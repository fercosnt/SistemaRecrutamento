# Phase 15 — UI Review

**Audited:** 2026-06-26
**Baseline:** `15-UI-SPEC.md` (approved design contract, 2026-06-25) + Beauty Smile design system (glass + RH panel, locked since M1)
**Screenshots:** Partial — dev server live on `:3003`, but all three Phase-15 routes are RoleGuard-gated and redirect to login when hit unauthenticated via CLI Playwright. Shell/gradient/glass confirmed visually (login surface); authenticated Phase-15 surfaces audited by code analysis. Visual confirmation of the consolidated dashboard, decision form, and bias table interiors is DEFERRED to live UAT.
**Stance:** Adversarial retroactive audit. Phase-15 is advisory (no BLOCK gate). a11y gaps are EXPECTED and routed to Phase 16 (Compliance & A11y Hardening), not counted as phase failures.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every contract string is verbatim (CTAs, toasts, dialogs, empty/error states, advisory note); candidate surface is non-clinical with zero score/band/QI/percentil leakage. |
| 2. Visuals | 3/4 | Clear focal hierarchy (hero score, breakdown, recommendation, terminal CTA); `SugestaoIABadge` correctly isolated to the recommendation block only. Tab group is a custom `aria-pressed` button row, not a true ARIA tablist (carry-in). |
| 3. Color | 3/4 | 60/30/10 honored; neutral score/breakdown, destructive `rejeitado`, amber `em_espera`. One accent leak: `text-[#35BFAD]` on the Comparativo loading spinner — spec reserves accent EXCLUSIVELY for the recommendation badge. |
| 4. Typography | 3/4 | 4 sizes / 2 weights almost exactly. Two deviations: a stray `font-medium` (500 — third weight) on a breakdown label, and `text-[28px]` arbitrary H1 in BiasAuditPage where the role token is `text-3xl`. |
| 5. Spacing | 4/4 | 100% on the declared 4px scale (`space-y-1/2/3/4/6/8`, `p-4/6/12`, `gap-1/2/3/4`, `py-20`); zero arbitrary px spacing values; `min-h-[44px]` touch floor applied to every CTA per spec. |
| 6. Experience Design | 4/4 | All three surfaces cover loading + error(retry) + empty; terminal decision and revision-request both alert-dialog-gated; append-only note, idempotent "já solicitou" disabled state, char counter, CTA gating, irreversibility framing all present. |

**Overall: 21/24** — strong, ship-ready. All deductions are minor polish/a11y, none break task completion.

---

## Top 3 Priority Fixes

1. **Accent leak on the Comparativo loading spinner** (`DecisaoFinalPage.tsx:178`) — the spec's Color section reserves `#35BFAD` for the `SugestaoIABadge` recommendation signal ONLY and explicitly lists "generic hover / loading" as forbidden. The spinner `text-[#35BFAD]` dilutes the "this is the one advisory signal" semantic. **Fix:** change the spinner to neutral glass-white (`text-white/70`), matching the error-state `AlertTriangle` neutrality already used two lines below.
2. **Third font weight introduced** (`ConsolidacaoDashboard.tsx:58`) — the breakdown etapa label uses `font-medium` (500). The Typography contract is explicit: "Only two weights: 400 ... and 600 ... No 500/700/800 despite availability." **Fix:** change `font-medium` → `font-semibold` (the 600 label role) on the breakdown label span.
3. **Arbitrary H1 size in BiasAuditPage** (`BiasAuditPage.tsx:87`) — uses `text-[28px]` while the other two page H1s use the role token `text-3xl md:text-4xl`. 28px happens to equal `text-3xl`'s base, so it renders identically at mobile, but it drops the responsive `md:text-4xl` cap and breaks token consistency. **Fix:** replace `text-[28px] ... leading-tight` with `text-3xl md:text-4xl ... leading-tight` to match `DecisaoFinalPage` and `ExplicacaoCandidatoPage`.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- **Verbatim contract match across all three surfaces.** Spot-checked against the Copywriting Contract: decision options `Aprovar`/`Rejeitar`/`Manter em espera` (`decisaoSchema.ts:35-37`); justificativa label + `(obrigatória — mínimo 50 caracteres)` + char counter `{n} / 50 mín.` + too-short error (`RegistrarDecisaoForm.tsx:124-148`); both alert-dialog variants including the LGPD Art. 20 mention on the `rejeitado` path (`RegistrarDecisaoForm.tsx:172-185`); toasts `Decisão registrada e etapa finalizada.` / error (`useRegistrarDecisao.ts:37,41`); append-only note (`:90-91`).
- **Candidate surface is non-clinical and clean (LGPD-04/RNF-07a).** Grep for `teste psicol|psicol|QI|percentil|psicom` on `features/explicacao` returns ZERO render-path hits — the only match is a JSDoc line asserting none are rendered. Result line, reason eyebrow, gratitude, revision-right intro, CTA, "já solicitou", revision-result, not-available, and load-error copy are all verbatim (`ExplicacaoCandidatoPage.tsx:33-49`, `SolicitarRevisaoCTA.tsx:40-49`).
- **Bias-audit copy verbatim** including the always-visible AGE-only limitation banner, the 4/5-rule tooltip, `Snapshot registrado em bias_audit_log.`, and empty-state body (`BiasAuditPage.tsx:107-113,201-204`; `useBiasAudit.ts:45`).
- No generic labels (`Submit`/`OK`/`Click Here`) anywhere. The recommendation advisory note ("a decisão é sempre humana") is present verbatim.

### Pillar 2: Visuals (3/4)
- **Focal hierarchy is correct.** The RH dashboard leads with the hero consolidated score (`text-3xl`), then breakdown, then accent-badged recommendation — the intended primary anchor. Tabs default to Dashboard per spec (`DecisaoFinalPage.tsx:73`).
- **`SugestaoIABadge` placement is contract-perfect** — exactly one placement, on the Recomendação block (`ConsolidacaoDashboard.tsx:156`), never on the score or breakdown rows. This is the most-commonly-violated rule in this codebase's history (Phase 11 mislabel) and it is correct here.
- **Icon-only affordances are labeled.** All `AlertTriangle`/`Loader2`/`Sparkles` icons carry `aria-hidden="true"`; the N/A pill and 4/5-flag use Radix `Tooltip` with real text content, not bare icons.
- **WARNING (carry-in):** The three workspace tabs are rendered as a `<button aria-pressed>` group (`DecisaoFinalPage.tsx:133-150`), not a semantic ARIA `tablist` / `role=tab` / `role=tabpanel` structure. Same pattern flagged in Phase 14. Visually fine; semantically incomplete → Phase 16.

### Pillar 3: Color (3/4)
- **60/30/10 distribution honored.** Dominant `#00109E` surface, secondary translucent-white glass on all panels/tables/forms, accent rare.
- **Status treatments match the Color section exactly.** Consolidated score is neutral `text-white` (no tint); breakdown badges are `border-white/15 bg-white/5 text-white/70` (the `ScorecardAvaliacao` neutrality contract); N/A pill neutral with tooltip; `rejeitado` selected → `border-red-400/30 bg-red-500/15 text-red-300`, `em_espera` → amber, `aprovado`/unselected → neutral glass (`RegistrarDecisaoForm.tsx:57-64`); bias 4/5 flag row → destructive tint, reference band neutral with micro-label (`BiasAuditPage.tsx:174,180`).
- **Candidate surface carries no score/band/ratio/color verdict** — confirmed: only neutral glass card, result line, reason, gratitude, revision block.
- **WARNING — accent leak:** `text-[#35BFAD]` on the Comparativo loading spinner (`DecisaoFinalPage.tsx:178`). The spec's reserved-accent list is a single item (the recommendation badge) and explicitly excludes "generic hover / loading". One-line fix (Top Fix #1). Total accent surface area is otherwise correct (1 intended placement).

### Pillar 4: Typography (3/4)
- **Distribution:** sizes in use = `text-xs / sm / base / xl / 3xl / 4xl` — these map cleanly onto the 4 semantic roles (xs/sm = label role, base = body, xl = panel title, 3xl+md:4xl = page H1). Weights: `font-semibold` (32×) + `font-normal` (1× — the inline justificativa sub-label, a legitimate 400 body treatment).
- **WARNING — third weight:** one `font-medium` (500) at `ConsolidacaoDashboard.tsx:58` violates the explicit "no 500" rule (Top Fix #2).
- **WARNING — arbitrary H1 token:** `text-[28px]` at `BiasAuditPage.tsx:87` instead of the `text-3xl md:text-4xl` role token used by the other two H1s (Top Fix #3). Renders ~identically at base but is token-inconsistent and drops the responsive cap.
- **MINOR (advisory):** candidate reason eyebrow uses `text-sm ... text-white/70` (`ExplicacaoCandidatoPage.tsx:141`) where the spec's uppercase-micro-label treatment is `text-xs ... text-white/50`. The RH/bias eyebrows correctly use `text-xs ... text-white/50`. Cosmetic — slightly heavier candidate eyebrow. Optional align.
- Load-bearing reading (candidate reason + RH justificativa + recommendation prose) correctly renders at `text-base leading-relaxed` — never compressed below 16px. Good.

### Pillar 5: Spacing (4/4)
- **Fully on-scale.** Every spacing class resolves to the declared 4px scale: `space-y-1/2/3/4/6/8`, `p-4/6/12`, `py-2/3/12/20`, `gap-1/2/3/4`, `px-4`, `mt-8`. Grep for arbitrary `[..px]` spacing returns zero.
- **Touch floor applied per spec:** `min-h-[44px]` on the decision CTA, the 3 decision radios, the 3 RH tabs, the revision CTA, back nav, and the bias snapshot/export buttons (`RegistrarDecisaoForm.tsx:111,159`; `DecisaoFinalPage.tsx:141`; `SolicitarRevisaoCTA.tsx:82,106`; `BiasAuditPage.tsx:92,99`). 44 = 4×11, the documented on-scale exception.
- Card/panel inner padding `p-6`, empty/error/explanation padding `p-12`, candidate shell `py-20` — all match the spec's named tokens.

### Pillar 6: Experience Design (4/4)
- **Complete state coverage on all three surfaces:** loading (skeleton/pulse), error-with-retry, and empty — verified in `ConsolidacaoDashboard` (`:93,102,117`), `DecisaoFinalPage` Comparativo tab (`:166,176,181,186`), `ExplicacaoCandidatoPage` (`:61,76,102`), `BiasAuditPage` (`:116,120,129`).
- **Destructive/terminal actions gated.** The terminal decision is alert-dialog-confirmed with irreversibility framing and a dedicated `rejeitado` body mentioning LGPD Art. 20 (`RegistrarDecisaoForm.tsx:153-188`); the revision request is alert-dialog-confirmed (`SolicitarRevisaoCTA.tsx:100-129`).
- **Guardrails honored.** CTA disabled until `decisao` selected AND justificativa ≥ 50 (`RegistrarDecisaoForm.tsx:75`); append-only note on existing decision; idempotent disabled "já solicitou" state with dated tooltip (`SolicitarRevisaoCTA.tsx:71-95`); char counter live; submitting spinners on every async CTA. The form NEVER writes `candidaturas` directly (RPC owns `avancar_etapa`) — RNF-07a/LGPD-02 structural guardrail intact.
- **Routing correct & role-gated:** `/candidato/explicacao/:id` → `RoleGuard role="candidato"`; `/rh/candidato/:id/decisao` → `role={['rh','administrador']}`; `/admin/bias-audit` → `role="administrador"` (`routes.tsx:286,408,518`).

---

## Routed to Phase 16 (Compliance & A11y Hardening — advisory, not blocking)

These are a11y/contrast items consistent with the carry-in notes from Phase 14 already routed to Phase 16. Group them with that batch:

1. **ARIA tablist semantics** — `DecisaoFinalPage` tabs are an `aria-pressed` button row, not `role=tablist`/`role=tab`/`role=tabpanel` with arrow-key roving focus. (Same as Phase 14 carry-in.)
2. **Custom radio group keyboard semantics** — the decision selector uses custom `role="radio"` buttons (`RegistrarDecisaoForm.tsx:97-118`) without roving tabindex / arrow-key navigation (the in-scope shadcn `radio-group` primitive would have provided this for free). Screen-reader role is announced, but keyboard arrow-navigation between options is absent.
3. **Amber-on-translucent AA contrast** — `em_espera` selected state `text-amber-300` on `bg-amber-500/15` (`RegistrarDecisaoForm.tsx:60`) and the bias `text-amber-100/200/300` on translucent amber banner (`BiasAuditPage.tsx:107,152`). Same amber-on-translucent pattern flagged in Phase 14; verify ≥4.5:1 in the WCAG AA sweep.
4. **`text-white/50` and `text-white/60` micro-label contrast** — eyebrows, captions, weight readouts, and "referência" micro-label at /50–/60 over translucent glass. Same `text-white/50-60` carry-in as Phase 14; verify against AA.
5. **Tooltip-only information on `cursor-help` triggers** — the N/A pill and 4/5-flag convey their explanation solely via Radix `Tooltip` (hover/focus). Confirm keyboard-focus reachability and that the information is not exclusively pointer-gated for the AA pass.

**Count routed to Phase 16: 5 items.** (Note: native `title=` tooltips — a Phase 14 carry-in — were NOT reintroduced here; Phase 15 correctly uses Radix `Tooltip`. Good.)

---

## Files Audited
- `src/features/decisao/components/ConsolidacaoDashboard.tsx`
- `src/features/decisao/components/DecisaoFinalPage.tsx`
- `src/features/decisao/components/RegistrarDecisaoForm.tsx`
- `src/features/decisao/schemas/decisaoSchema.ts`
- `src/features/decisao/hooks/useRegistrarDecisao.ts`
- `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx`
- `src/features/explicacao/components/SolicitarRevisaoCTA.tsx`
- `src/features/explicacao/hooks/useExplicacao.ts`
- `src/features/admin/bias-audit/components/BiasAuditPage.tsx`
- `src/features/admin/bias-audit/hooks/useBiasAudit.ts`
- `src/features/triagem/components/SugestaoIABadge.tsx` (reuse verification)
- `src/features/avaliacao/components/ScorecardAvaliacao.tsx` (neutral-badge pattern verification)
- `src/router/routes.tsx` (RoleGuard wiring lines 286, 408, 518)

**Registry audit:** No `components.json` at root (project uses vendored shadcn primitives in `src/components/ui/` since M1); UI-SPEC declares zero third-party registries. Registry safety audit SKIPPED — not applicable.
