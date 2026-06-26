---
phase: 14
slug: entrevistas-com-ia-companion-etapas-4-5
artifact: ui-review
audited_at: 2026-06-25
baseline: 14-UI-SPEC.md (approved 2026-06-24)
advisory: true
blocking: false
screenshots: partial (landing surface only — workspace + prova routes are role-gated, not reachable via CLI without auth)
score: 19
score_max: 24
pillars:
  copywriting: 3
  visuals: 3
  color: 4
  typography: 4
  spacing: 4
  experience_design: 1
routed_to: phase-16
---

# Phase 14 — UI Review

**Audited:** 2026-06-25
**Baseline:** `14-UI-SPEC.md` (approved 2026-06-24)
**Stance:** ADVISORY / non-blocking. Findings with `file:line` for Phase 16 (Compliance & A11y Hardening, WCAG AA) to consume — same routing precedent as Phases 10/11/13.
**Screenshots:** Partial. Dev server live on `:3003`; landing surface captured (`.planning/ui-reviews/14-20260625-211348/`) confirming the `#00109E` glass-over-gradient brand surface. The two Phase-14 surfaces (`/rh/candidato/:id/entrevista`, `/candidato/prova-cognitiva/:candidatura_id`) are role-gated + RLS-deny and cannot be reached by the headless CLI without an authenticated session — so visual pillars (Visuals, Color, Typography, Spacing) were audited from code + class analysis, not pixels.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | LGPD/RNF-07a invariants all clean; but 5 RH strings diverge from the contract (WR-02/WR-03 relabels) without the spec being updated |
| 2. Visuals | 3/4 | Strong hierarchy + every AI block badged; but the dashboard's primary landing tab ships a dead "Agendar entrevista" CTA + no scheduling picker |
| 3. Color | 4/4 | Accent `#35BFAD` reserved to AI signal only (2 sites); amber 24h / red flag tints exactly per the §Color table; zero stray hex |
| 4. Typography | 4/4 | Exactly 4 sizes (xs eyebrow = sm role) + 2 weights (400/600); transcript & citations at `text-base leading-relaxed` per the load-bearing-reading rule |
| 5. Spacing | 4/4 | All on the 4px scale (`gap-2/3`, `p-6`, `p-12`, `py-20`); the only arbitrary value is the justified `min-h-[44px]` a11y floor |
| 6. Experience Design | 1/4 | The scheduling flow (a core ENTREV-02 dashboard affordance) is unbuilt — dead CTA; candidate autosave affordance promised in copy but absent; no skeleton/error on the cognitive band path's write |

**Overall: 19/24** (advisory — does not gate ship)

---

## Top 3 Priority Fixes

1. **Dead "Agendar entrevista" CTA on the default landing tab** — `EntrevistaDashboard.tsx:194-200` renders the button, but `EntrevistaWorkspace.tsx:143` mounts the dashboard *without* an `onAgendar` handler, so the click is a silent no-op. The spec's `calendar` + time `select` scheduling UI (UI-SPEC §Copywriting "Agendar entrevista", §Component Inventory `EntrevistaDashboard`) is **entirely absent**. **Impact:** the gestor lands on the primary anchor tab and cannot perform the one write action it advertises — schedule the interview that the whole 24h-marker logic depends on. **Fix:** either wire a `calendar`+time-`select` popover to `onAgendar` and a `salvar_agendamento` write, or (if scheduling is deliberately out of V1 scope) follow the same WR-02 pattern already used on `AvancarEtapaCTA` — render the button `disabled` with a tooltip naming where scheduling happens, so it is not a dead control.

2. **Candidate autosave affordance promised in copy but never rendered** — `ProvaCognitivaScreen.tsx:63` intro tells the candidate "suas respostas ficam salvas", and the spec reserves the *second* (and only candidate-facing) accent touchpoint for **"Salvo automaticamente"** (`Check` `#35BFAD`, UI-SPEC §Color item 2 + §Copywriting "Autosave — saved"). No `useAutosaveAvaliacao` / `AutosaveAffordance` is wired into the screen (confirmed: `grep` finds only doc-comment references in `useProctoring.ts`, no JSX). **Impact:** the candidate is told their answers persist, but answers live only in React state (`respostas`) until submit — a refresh loses everything, contradicting the disclosure (a trust/fairness regression on the candidate surface). **Fix:** either wire the `useAutosaveAvaliacao` 30s-local/30s-DB pattern + the `Check #35BFAD` "Salvo automaticamente" affordance per spec, or soften the intro copy to not promise persistence if autosave is genuinely deferred.

3. **RH copy diverged from the contract without the contract being updated** — five RH strings were relabeled (the WR-03 "audit-only, not a rejection" pivot) but `14-UI-SPEC.md` §Copywriting still specifies the old strings: `CognitivoBandCard.tsx:147` ships "Registrar ressalva no log de auditoria" (spec: "Rejeitar com base no raciocínio lógico"); `:153` dialog title "Registrar ressalva sobre o raciocínio lógico?" (spec: "Rejeitar com base no raciocínio lógico?"); `:186` confirm "Registrar no log de auditoria" (spec: "Registrar e rejeitar"). **Impact:** the new copy is arguably *better* for RNF-07a (it no longer claims the UI rejects a candidate), but the spec is now stale, so a future audit can't tell intended-deviation from drift. **Fix:** patch `14-UI-SPEC.md` §"RH cognitive band — rejection-by-cognitive-alone gate" to ratify the audit-only relabels (cite WR-03), so the contract matches the shipped, more-compliant copy.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**LGPD-04 / RNF-07a product-language invariants — all clean (the load-bearing constraints PASS):**
- Candidate copy is non-clinical throughout — `ProvaCognitivaScreen.tsx:61` "Prova de raciocínio lógico"; no "teste psicológico", no "QI" anywhere (`COPY` block `:60-86`).
- Candidate post-submit is the neutral acknowledgment, no score/band/pass-fail: `:73` "Prova registrada. Avisaremos sobre os próximos passos." ✓
- Proctoring disclosed transparently as fairness, not surveillance: `:64-65` "...Nenhuma câmera, gravação ou biometria é usada." ✓
- The cognitive band carries the verbatim "Contextual · não-eliminatório" + the "nunca elimina sozinho" tooltip (`CognitivoBandCard.tsx:113-119`). ✓
- Irreversible submit gated by the relabeled-per-checker "Enviar prova?" `alert-dialog` (`ProvaCognitivaScreen.tsx:82-86`). ✓
- Paste-block toast copy is exact: `useProctoring.ts:64` "Cole desabilitado nesta resposta — digite sua resposta." ✓

**Deviations (why not 4):**
- **WARNING** — 5 RH cognitive-band strings diverge from the spec (see Top Fix #3). The divergence is an *improvement* for compliance (audit-only framing), but the spec was not updated, so it reads as undocumented drift.
- **WARNING** — `EntrevistaScorecardInline.tsx:96-98` renders the "BARS sliders 1–5 — notas_humanas" as body subtext plus an added "A decisão é sempre humana." line; the spec framed that string as a parenthetical helper on the "Avaliação por competência" label. Cosmetic, but a deviation from the literal contract.
- No generic CTA anti-patterns found (grep for bare Submit/OK/Save/Cancel = none). Empty/error/loading copy on the candidate prova matches the contract verbatim (`ProvaCognitivaScreen.tsx:76-81` ↔ UI-SPEC §Cognitive prova rows).

### Pillar 2: Visuals (3/4)

- **Clear focal point + hierarchy:** each surface has a single H1 (`text-3xl md:text-4xl`), section H3s at `text-xl`, then `text-sm` labels — strong size/weight differentiation. ✓
- **Every AI-derived block badged:** `SugestaoIABadge` on the guide header (`GuiaEntrevistaPanel.tsx:89` full), each transcript dimension (`TranscricaoReviewPanel.tsx:62` compact), the transcript result header (`:145` full), the scorecard when AI-seeded (`EntrevistaScorecardInline.tsx:94` compact), and the cognitive band (`CognitivoBandCard.tsx:107` compact). Matches §Component Inventory exactly. ✓
- **Default landing = "Painel do candidato"** (`EntrevistaWorkspace.tsx:65`), the declared primary anchor (checker FLAG resolution). ✓
- **Icon-only buttons:** none — all CTAs are text-labeled; decorative icons carry `aria-hidden="true"` (`CalendarClock`, `Sparkles`, `CircleDashed`, `AlertTriangle`). ✓
- **WARNING (drives the −1):** the dashboard's primary tab ships a **non-functional** "Agendar entrevista" button (Top Fix #1) and no scheduling picker — a visible affordance with no behavior on the first thing the gestor sees. A focal CTA that does nothing is a visual-trust defect even if the rest of the hierarchy is excellent.

### Pillar 3: Color (4/4)

- **60/30/10 holds.** Dominant `#00109E` brand surface (confirmed in the captured landing screenshot); secondary translucent-white glass (`bg-white/5`–`bg-white/20`) on every panel, pill, option card, and CTA; accent `#35BFAD` is **rare and reserved**.
- **Accent appears at exactly 2 sites**, both the AI signal — `GuiaEntrevistaPanel.tsx:101` and `:110` (the `Sparkles` on the generate CTAs). The `SugestaoIABadge` carries its own accent internally (reused verbatim). Accent is correctly **absent** from candidate CTA, RH action buttons, slider fills, the 24h marker, and the band. ✓ (Note: the spec's reserved accent site #2 — the candidate autosave `Check` — is unbuilt; see Pillar 6 — that is a *missing* affordance, not an accent misuse.)
- **Status tints match the §Color table to the byte:** amber 24h pill `bg-amber-500/15 text-amber-300 border-amber-400/30` (`EntrevistaDashboard.tsx:124`); neutral ≥24h `border-white/20 bg-white/5 text-white/80` (`:125`); destructive flag block `border-red-400/30 bg-red-500/15 text-red-300` (`TranscricaoReviewPanel.tsx:175`). Scores carry NO red/green pass-fail tint (band & dimensions are neutral white). ✓
- **Zero stray hardcoded color** beyond the two intended accent hexes (grep confirmed). ✓

### Pillar 4: Typography (4/4)

- **Exactly 4 semantic sizes + 2 weights**, per the contract. Distribution: `text-sm` ×32 (label/600), `text-base` ×11 (body/400), `text-xl` ×9 (title/600), `text-3xl`+`text-4xl` ×2 each (H1 + responsive cap), `text-xs` ×6 (the uppercase eyebrow treatment of the sm label role — `tracking-wide text-white/50`, e.g. `GuiaEntrevistaPanel.tsx:64`, `TranscricaoReviewPanel.tsx:156`). Weights: `font-semibold` ×46, `font-normal` ×2 — no 500/700/800. ✓
- **Load-bearing transcript reading rule honored:** the paste box (`TranscricaoReviewPanel.tsx:124`), per-dimension reasoning (`:69`), and citations (`:159`) all render at `text-base leading-relaxed` (≈16px/1.625), never compressed. ✓
- **Candidate scenario body** at `text-base leading-relaxed` with `whitespace-pre-line` (`ProvaCognitivaScreen.tsx:309`) — comfortable mobile reading, never smaller. ✓
- The 14/16 proximity is weight-separated exactly as the spec intends. No findings.

### Pillar 5: Spacing (4/4)

- **All spacing on the 4px scale.** Top tokens: `gap-2` ×16, `px-4` ×11, `space-y-4` ×10, `py-2` ×10, `space-y-2` ×7, `p-6` ×6, `p-12` ×5 (empty/error 2xl), `py-20` ×2 (candidate 3xl breathing room from the SJT shell). Maps cleanly onto the §Spacing Scale table (md/lg/xl/2xl/3xl). ✓
- **Zone rhythm:** workspace zones at `space-y-6` (`EntrevistaWorkspace.tsx:113`, `:138`), panel inner padding `p-6` (`:139` etc.). ✓
- **Only arbitrary value = `min-h-[44px]`** — the justified mobile a11y touch-target floor (44 = 4×11), present on every candidate option label and nav button and on the RH action buttons for Phase-13 consistency. This is the checker-acknowledged non-blocking exception, not a violation. No off-scale `px`/`rem` values found.

### Pillar 6: Experience Design (1/4)

This is the weak pillar — the *visual* pillars are strong, but interaction completeness has real gaps.

- **BLOCKER (the −3 driver): the ENTREV-02 scheduling flow is unbuilt.** `EntrevistaDashboard.tsx:194-200` advertises "Agendar entrevista" but `EntrevistaWorkspace.tsx:143` never wires `onAgendar`, and no `calendar`+time-`select` UI exists anywhere in the feature (grep confirmed). The 24h-marker logic (`compute24hMarker`, `Marker24h`) is fully built and correct — but it computes against `entrevista_agendada_em`, which the gestor has **no UI path to set**. The primary landing tab's headline action is a dead button. (If scheduling is intentionally deferred, it must be reframed as a disabled+tooltip control like `AvancarEtapaCTA`, not a live no-op.)
- **WARNING: candidate autosave affordance promised but absent** — see Top Fix #2. The intro copy guarantees persistence the screen does not deliver; answers are React-state-only until submit.
- **WARNING: the cognitive-band write has no loading/disabled-during-write feedback loop into the card.** `EntrevistaWorkspace.tsx:152-156` mounts `CognitivoBandCard` with a hardcoded `rejecting={false}`; `handleRegistrarRessalvaCognitiva` (`:101-109`) fires a fire-and-forget promise with toast on settle but never sets a pending state, so the alert-dialog's "Registrar no log de auditoria" action is not disabled during the in-flight write (double-submit possible). The card *supports* a `rejecting` prop (`CognitivoBandCard.tsx:143,181`) — it's just never driven.

**What IS solid here (keeps it off a flat 1 in substance, though scored 1 for the blocker):**
- Candidate prova state machine is genuinely thorough: distinct loading (skeleton), context-error+retry, opt-in gate, items-error+retry, post-submit neutral, and empty-itemset states (`ProvaCognitivaScreen.tsx:172-272`), each with a "Voltar ao painel" escape. ✓
- Submit is gated by an irreversible `alert-dialog` with the correct "Enviar prova?" copy + a `submitting` spinner + a 42501 back-lock toast (`:156-169`). ✓
- Transcript flag correctly **gates `avancar_etapa()`** via a disabled CTA + tooltip; "Confirmar revisão humana" is the only enabled release path (`TranscricaoReviewPanel.tsx:204-225`). ✓
- The reject-by-cognitive path forces a mandatory expanded justification before the `bias_audit_log` write (`CognitivoBandCard.tsx:92,181`). ✓
- Workspace skeletons on contexto + scores loading (`EntrevistaWorkspace.tsx:141,150`). ✓

---

## Registry Safety

`components.json` is **not present** at the repo root (`NO_SHADCN_CONFIG`) — shadcn primitives are vendored directly under `src/components/ui/` (project precedent since M1/Phase 7), and the UI-SPEC §Registry Safety declares **no third-party registries**. Per the gate rules, the registry safety audit is **skipped** (no `shadcn` CLI state to diff, no third-party blocks to vet). No Registry Safety section required.

---

## A11y notes for Phase 16 (WCAG AA hardening)

Routed forward, non-blocking:
- **Tabs are plain `<button aria-pressed>`** (`EntrevistaWorkspace.tsx:117-133`), not an ARIA `tablist`/`tab`/`tabpanel` structure — no roving tabindex, no `aria-controls` linking each tab to its panel. Phase 16 should consider the Radix `tabs` primitive (already in scope per the spec) or add the full ARIA tab pattern.
- **Submit-disabled tooltip is a native `title`** (`ProvaCognitivaScreen.tsx:367`), not the Radix `Tooltip` — native `title` is not keyboard/SR-reliable. The "Responda todas as questões para concluir." hint should move to the Radix tooltip used elsewhere.
- **Contrast risk on muted text:** repeated `text-white/50` and `text-white/60` on translucent glass (e.g. `GuiaEntrevistaPanel.tsx:64,126`, `EntrevistaDashboard.tsx:186`) may fall below the 4.5:1 AA threshold over the `#00109E`/glass blend — Phase 16 should measure and bump the low-alpha micro-labels/eyebrows.
- **Amber 24h pill** `text-amber-300` on `bg-amber-500/15` — verify AA contrast at Phase 16; amber-on-translucent is a common AA near-miss.
- **Slider has `aria-label`** (`EntrevistaScorecardInline.tsx:115`) ✓ but no `aria-valuetext` announcing "{n} / 5" — add for SR parity with the visible readout.

---

## Files Audited

- `src/features/entrevista/components/EntrevistaWorkspace.tsx`
- `src/features/entrevista/components/EntrevistaDashboard.tsx`
- `src/features/entrevista/components/GuiaEntrevistaPanel.tsx`
- `src/features/entrevista/components/TranscricaoReviewPanel.tsx`
- `src/features/entrevista/components/EntrevistaScorecardInline.tsx`
- `src/features/entrevista/components/CognitivoBandCard.tsx`
- `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx`
- (cross-referenced) `src/features/avaliacao-cognitiva/hooks/useProctoring.ts` — paste-block toast copy verification

**Baseline:** `.planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-UI-SPEC.md`
**Screenshots:** `.planning/ui-reviews/14-20260625-211348/` (landing surface only; gitignored)
