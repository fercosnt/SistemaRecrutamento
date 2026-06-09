---
phase: 10
slug: triagem-rh-com-ia-comparativo-etapa-2
review_date: 2026-06-09
baseline: 10-UI-SPEC.md (approved)
screenshots: not captured (no dev server running on ports 3003/3000)
auditor: gsd-ui-auditor (claude-sonnet-4-6)
---

# Phase 10 — UI Review

**Audited:** 2026-06-09
**Baseline:** 10-UI-SPEC.md (approved design contract)
**Screenshots:** not captured (no dev server detected on ports 3003/3000 — static code audit)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Four copy deviations: error heading missing full stop, "Avançar candidato" CTA rendered as bare "Avançar", mixed-vagas 400 copy exists only in test file not in the error path, confirm dialog body paraphrases contract instead of quoting it |
| 2. Visuals | 3/4 | RNF-07a badge placement satisfies spec on both surfaces; null-score "—" chip inherits text-2xl from score branch (visual oversize for a non-score indicator); sticky-left in comparativo correct |
| 3. Color | 3/4 | Two accent usages beyond the five-item reserved list: Reprocessar text label colored #35BFAD (should be neutral/white), avatar initials gradient from-[#35BFAD] on both surfaces (not on reserved list) |
| 4. Typography | 3/4 | Candidaturas counter widget uses text-4xl font-bold — a new element outside the contract's 4-size/2-weight surface. Score null "—" chip also renders text-2xl (24px) which is the score size, semantically correct but applied to a non-score symbol |
| 5. Spacing | 2/4 | Dense table cells use shadcn TableCell/TableHead default padding (p-2 / px-2 = 8px horizontal) instead of the spec-required px-4 (16px horizontal). No cell in TriagemTable.tsx overrides horizontal cell padding to 16px. This affects all 9 columns × every row |
| 6. Experience Design | 3/4 | All critical states covered (loading, error, empty with filter vs no-filter, skeleton per-row, reprocess, PDF states); confirm dialogs present; mixed-vagas 400 error surfaced only via error?.message passthrough without the spec copy |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Dense table horizontal cell padding is 8px, not 16px (spec: px-4)** — scan-density across 30+ rows is compromised; content in narrow cells (score chip, date, etapa badge) reads cramped when the cell's own content is also compact. Fix: add `className="px-4 py-2"` override on every `<TableCell>` and `<TableHead>` in `TriagemTable.tsx` (shadcn's base is `p-2` / `px-2`; spec requires `px-4 py-2` for the dense table). Affects `TriagemTable.tsx` lines 217–229 (TableHead) and 247–345 (all TableCell instances).

2. **"Avançar candidato" CTA label is rendered as bare "Avançar"** — the spec's primary CTA label for the comparativo is explicitly "Avançar candidato" (verb + noun), matching the pattern of the panel's "Comparar (N)". Using only "Avançar" removes the noun that makes the action's target unambiguous, especially when multiple candidates are visible. Fix: change the `AlertDialogTrigger` button text at `ComparativoScreen.tsx:266` from `Avançar` to `Avançar candidato`.

3. **Accent #35BFAD applied to "Reprocessar análise" text button and avatar gradients — both off the reserved list** — accent was contracted to exactly 5 surfaces. At `TriagemTable.tsx:151` the "Reprocessar análise" interactive text uses `text-[#35BFAD]`, which is visually indistinguishable from the primary CTA "Comparar (N)". This dilutes the accent's signal value. The avatar gradient (`from-[#35BFAD] to-[#00109E]`) on both surfaces also uses the brand accent on a decorative element outside the reserved list. Fix for Reprocessar: use `text-white/80 hover:text-white` (neutral interactive). Fix for avatars: replace gradient with `bg-white/20` (neutral glass-consistent) or a single token color not in the accent set.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**PASS — most copy is precise and pt-BR-correct.** Four deviations from contract:

**WARNING — Error heading missing full stop (`VagaCandidatosRHPage.tsx:148`)**
- Contract: `"Erro ao carregar candidaturas."` (with period)
- Implemented: `Erro ao carregar candidaturas` (no period)
- Minor but breaks the punctuation convention used throughout (all body copy in error states ends with a period per the spec table).

**WARNING — Primary CTA in comparativo is "Avançar" not "Avançar candidato" (`ComparativoScreen.tsx:266`)**
- Contract copywriting table: `Avançar candidato` (accent)
- Implemented trigger button: `Avançar` (bare verb)
- The confirm dialog title correctly reads "Avançar {c.nome} para a próxima etapa?" (line 272) — the dialog copy matches. The trigger label does not.

**WARNING — Mixed-vagas EF 400 copy not implemented in the error render path (`ComparativoCandidatosPage.tsx:150`)**
- Contract: `"Os candidatos selecionados pertencem a vagas diferentes. Compare candidatos de uma mesma vaga."`
- Implemented: `{error?.message ?? 'Não foi possível gerar o comparativo. Tente novamente.'}`
- The spec copy appears only in the test file (`ComparativoScreen.test.tsx:167`). When the EF returns 400 with this specific message, `error?.message` will surface whatever the API returns, not the specified user-facing copy. There is no branch that catches HTTP 400 to display the spec string.

**INFO — Avançar confirm dialog description is a paraphrase, not the contract string**
- Contract body: `"O candidato seguirá para a próxima etapa do processo seletivo."` (not in the spec's confirm table, so there is no official body string — only title and confirm-button label are locked). The description at `ComparativoScreen.tsx:277` reads *"O candidato seguirá para a próxima etapa do processo seletivo. A sugestão da IA é apenas um apoio — a decisão é sempre humana."* — this is stronger than the spec requires and aligns with RNF-07a. Not a defect, noted for completeness.

**PASS items verified:**
- `SugestaoIABadge` text at `SugestaoIABadge.tsx:19`: exact contract string "Sugestão da IA — decisão é sempre humana"
- Compare-bar count at `TriagemTable.tsx:357`: "{N} de 10 selecionados" — matches spec
- Compare disabled tooltip <2 at `TriagemTable.tsx:390`: exact match
- Compare disabled tooltip at 10 at `TriagemTable.tsx:260`, `391`: exact match
- Empty state heading `VagaCandidatosRHPage.tsx:302`: exact match "Nenhuma candidatura encontrada"
- Empty state body both branches `VagaCandidatosRHPage.tsx:306–307`: exact match
- Loading panel `VagaCandidatosRHPage.tsx:133`: exact match "Carregando candidaturas…"
- Score pending `TriagemTable.tsx:127`: exact match "Analisando…"
- Score failed `TriagemTable.tsx:142`: exact match "— Falhou"
- Reprocess text `TriagemTable.tsx:154`: exact match "Reprocessar análise"
- Reprocess tooltip `TriagemTable.tsx:157`: exact match
- Rejeitar confirm title `ComparativoScreen.tsx:301`: "Rejeitar {c.nome}?" — matches
- Rejeitar confirm body `ComparativoScreen.tsx:303–306`: matches contract
- Rejeitar confirm button `ComparativoScreen.tsx:314`: "Rejeitar" — matches
- PDF generating `ComparativoScreen.tsx:117`: "Gerando PDF…" — matches
- PDF success toast `ComparativoScreen.tsx:92`: "PDF exportado." — matches
- PDF error toast `ComparativoScreen.tsx:94`: matches
- Voltar para Vagas button `VagaCandidatosRHPage.tsx:159`: matches

---

### Pillar 2: Visuals (3/4)

**WARNING — Null score "—" chip uses text-2xl (24px), spec assigns text-2xl to "Score number in score cell"**
- `TriagemTable.tsx:169`: The null/no-analysis "—" chip applies `text-2xl font-semibold`. The spec reserves `text-2xl` specifically for score numbers (0-100). A placeholder dash at 24px in the chip reads like a numeric value where none exists. A `text-sm` or `text-xs` dash would correctly signal "no data" without implying a score magnitude. Not a critical issue but a visual semantic error.

**PASS — SugestaoIABadge visible without scrolling on both surfaces**
- Panel: badge is in the table header row (`TriagemTable.tsx:221`), which is the first visible row — spec-compliant.
- Comparativo: badge renders at the top of `ComparativoScreen` before the scroll container (`ComparativoScreen.tsx:104`), wrapped in a header `div` — spec-compliant.

**PASS — Score band chip always shows number + color together** (never a bare dot). Color and number in same element — RNF-07a satisfied.

**PASS — Flags rendered as neutral badges** (`bg-white/10 text-white/70 border-white/20`) with no gating color — spec-compliant, `TriagemTable.tsx:336–339`, `ComparativoScreen.tsx:239–241`.

**PASS — Sticky-left first column in comparativo** at `ComparativoScreen.tsx:70`: `sticky left-0 z-10 min-w-[160px]` — exact contract dimensions.

**PASS — Candidate columns min-w-[200px]** at `ComparativoScreen.tsx:72` — matches spec.

**PASS — All icon-only buttons have aria-labels** (Reprocessar at line 149, Ver Perfil at line 326, checkbox at line 267).

**PASS — Score band color thresholds are exact**: ≥70 verde, ≥40 amarelo, <40 vermelho — `scoreBandClass` in both `TriagemTable.tsx:106–109` and `ComparativoScreen.tsx:63–66`.

**INFO — Loading spinner is a raw CSS div (`border-b-2 border-white`) rather than a shadcn Skeleton or Lucide `Loader2`** at `VagaCandidatosRHPage.tsx:131–132`. Not a spec violation (spec says "Carregando candidaturas…" but doesn't mandate spinner type), but inconsistent with `ComparativoCandidatosPage.tsx:144` which uses `<Loader2>`.

---

### Pillar 3: Color (3/4)

**Accent reserved list: 5 items in spec. Actual usage count: 8+ distinct elements.**

**WARNING — "Reprocessar análise" text button uses `text-[#35BFAD]` (`TriagemTable.tsx:151`)**
- This element is not on the reserved list. The interactive text for re-triggering analysis reads with the same visual weight as the primary "Comparar (N)" CTA, creating false-equivalence in the accent-priority hierarchy.

**WARNING — Avatar initials use `bg-gradient-to-br from-[#35BFAD] to-[#00109E]`** (`TriagemTable.tsx:274`, `ComparativoScreen.tsx:139`)
- Not on reserved list. Avatar circles are decorative identity elements, not interactive affordances. The accent gradient on avatars means the most-seen element per row carries accent, undermining the 60/30/10 balance.

**INFO — Ranking medal badges in comparativo header use `bg-[#35BFAD]/10 border-[#35BFAD]/40`** (`ComparativoScreen.tsx:144`)
- Not on reserved list but uses very low opacity (10%/40%), making it a subtle tint rather than a full accent hit. Borderline; could be argued as informative IA-ranking framing. Not a hard fail.

**PASS items:**
- "Comparar (N)" button accent `bg-[#35BFAD]` (enabled state) — reserved #1 ✓
- SugestaoIABadge accent border/icon — reserved #2 ✓
- Selected-row `data-[state=selected]:bg-[#35BFAD]/10` — reserved #3 ✓
- "Avançar" button `bg-[#35BFAD]` in comparativo — reserved #4 ✓
- "Exportar PDF" accent-outline `border-[#35BFAD]/60 text-[#35BFAD]` — reserved #5 ✓ (border opacity `/60` vs unspecified in spec — not a meaningful deviation)
- "Rejeitar" button correctly uses `border-red-500/40 bg-red-500/10 text-red-300` — destructive, not accent ✓
- Flags use neutral `bg-white/10 text-white/70` — no gating color ✓
- Status badges use semantic colors (yellow/blue/green/red) for status values — not accent ✓
- Hardcoded `#35BFAD` and `#00109E` are the project's own CSS custom property values; no unauthorized color tokens introduced ✓
- No `text-primary`/`bg-primary` Tailwind token drift; all colors use direct hex or `white/N` patterns consistent with the glass dark-blue shell ✓

---

### Pillar 4: Typography (3/4)

**Contract surface: 4 sizes (xs/sm/xl/2xl) and 2 weights (400/600). Phase 10 new components.**

**WARNING — Candidaturas counter widget at `VagaCandidatosRHPage.tsx:212` uses `text-4xl font-bold`**
- `text-4xl` is a fifth size outside the 4-size contract surface. `font-bold` (700) is a third weight.
- The spec explicitly states the existing `<h1 className="text-3xl font-bold">` from the canonical page shell may remain, but the counter widget is new Phase-10 component code — it is not pre-existing shell chrome.
- Impact: a visually prominent "40" or "120" candidate count rendered at 36px/700 dominates the header glass panel, competing with the page title hierarchy.

**PASS — New Phase-10 components use only the contracted weight/size pairs:**
- `text-xl font-semibold` for section headings (`ComparativoScreen.tsx:131`, `VagaCandidatosRHPage.tsx:147`)
- `text-xs font-semibold` for column headers, badges, labels (throughout `TriagemTable.tsx:217–229`, `SugestaoIABadge.tsx:34`)
- `text-sm` for body/cell text (throughout both components)
- `text-2xl font-semibold` for score chips — both score and null chip (`TriagemTable.tsx:169/186`, `ComparativoScreen.tsx:175`)
- `font-normal` is effectively the default for body cells (no explicit override needed) ✓
- No `font-medium` (500) introduced in Phase-10 components ✓
- SugestaoIABadge: `text-xs font-semibold leading-[1.4]` — matches spec exactly ✓

**INFO — Score null "—" at text-2xl**: redundant with Pillar 2 visual finding. Not a typography contract violation per se (text-2xl is a declared size), but semantically it places a non-score symbol at score size.

---

### Pillar 5: Spacing (2/4)

**BLOCKER — Dense table horizontal cell padding falls back to shadcn default 8px instead of spec 16px.**

The spec declares `px-4` (16px) as the horizontal cell padding for the dense triagem table. The shadcn `TableCell` base class is `p-2` (8px all sides). The `TableHead` base is `px-2` (8px). No `<TableCell>` in `TriagemTable.tsx` overrides horizontal padding to `px-4`:

- Lines 247, 272, 283, 287, 293, 299, 305, 316, 322: all bare `<TableCell>` or `<TableCell className="...">` with only non-padding props (`w-11`, `w-24`, `max-w-[200px]`, `text-sm text-white/70`)
- Header cells (lines 217–229): `<TableHead className="text-xs font-semibold text-white/80">` — inherits `px-2`

At 20 rows × 9 columns visible simultaneously, the 8px horizontal gutters produce a visibly cramped layout where badge text and name strings run uncomfortably close to cell borders. The spec notes "horizontal cell padding: 16px (px-4)" as an explicit requirement, not an inherited default.

**PASS — Vertical row padding**: The `min-h-[44px]` on `TableRow` (`TriagemTable.tsx:245`) satisfies the 44px click-target floor. However, `p-2` (8px) is the cell's vertical default. The spec requires `py-2` (8px vertical) which happens to match the default — so vertical padding is incidentally correct.

**PASS — Comparativo cell padding**: `px-4 py-4` (`ComparativoScreen.tsx:70/72`) matches the spec's `p-4` (16px) for the read-heavy comparativo ✓

**PASS — Page-level spacing**: `py-8` at `VagaCandidatosRHPage.tsx:172`, `space-y-6` for inter-section rhythm — matches xl/lg scale ✓

**PASS — Filter bar**: `gap-4` (`VagaCandidatosRHPage.tsx:223`) — matches spec `gap-4` for the filter bar ✓

**PASS — Glass panel inner padding**: `p-6` throughout — matches `lg` (24px) scale ✓

**PASS — Empty state**: `p-12` on the empty-state glass panel (`VagaCandidatosRHPage.tsx:299`) — matches `2xl` (48px) scale ✓

**PASS — Sticky compare bar**: `p-4` (`TriagemTable.tsx:355`) and `gap-3` — on-scale ✓

**PASS — Arbitrary dimension values are structural, not spacing**: `min-w-[160px]`, `min-w-[200px]`, `min-h-[40px]`, `min-h-[44px]` — these are dimension constraints from the spec, not arbitrary spacing values. `[10px]` font-size is a typography choice (fine-print flag badges), not a spacing token.

---

### Pillar 6: Experience Design (3/4)

**PASS — Loading states**: Full-page spinner with "Carregando candidaturas…" for the panel (`VagaCandidatosRHPage.tsx:127–138`); per-row skeleton shimmer for pending analyses (`TriagemTable.tsx:123–130`); `Loader2` spinner with "Gerando comparativo…" for the comparativo (`ComparativoCandidatosPage.tsx:142–146`); `isGenerating` state with "Gerando PDF…" during PDF export (`ComparativoScreen.tsx:82–98`) ✓

**PASS — Error states**: Panel load error with heading, detail, and "Voltar para Vagas" (`VagaCandidatosRHPage.tsx:141–165`); comparativo error with fallback copy and "Voltar ao painel" (`ComparativoCandidatosPage.tsx:147–151`); reprocess + advance/reject failure toasts ✓

**PASS — Empty states**: Two-branch empty state differentiating "no candidatures" from "filters active" (`VagaCandidatosRHPage.tsx:298–309`) ✓

**PASS — Score row states**: Three states fully covered — `pendente` (skeleton), `falhou` (neutral band + visible reprocess action), scored (chip) ✓

**PASS — Confirm dialogs for destructive actions**: Both Avançar and Rejeitar require confirmation via `alert-dialog.tsx`. Rejeitar dialog uses destructive styling (`bg-red-500`) ✓

**PASS — Selection guardrails**: Checkbox disabled at cap-10 with tooltip; "Comparar" disabled below 2 with tooltip; cap-10 logic correct (`capReached && !isSelected`) ✓

**PASS — RNF-07a guardrail prominent**: Badge appears on both surfaces before scroll; compact variant in column header, full variant in comparativo header ✓

**WARNING — Mixed-vagas EF 400 error copy not surfaced with the specified string (`ComparativoCandidatosPage.tsx:150`)**
- The error render branch shows `{error?.message ?? fallback}`. When the EF returns HTTP 400 with the specific "pertencem a vagas diferentes" error, the raw API error message will propagate unless the `useComparativo` hook maps 400 errors to the contract copy. The test (`ComparativoScreen.test.tsx:167`) verifies the string exists in a test fixture, but there is no error-code branch in the page that injects this specific copy. The user may see a raw API error string instead of the friendly specified copy.

**INFO — Invalid selection state (`ids.length < 2`) is handled in `ComparativoCandidatosPage.tsx:136–141`** with a copy "Selecione ao menos 2 candidatos para comparar." — this path is reachable only by direct URL navigation (the panel guards it via disabled button); the copy matches the tooltip spec ✓

**INFO — `queryClient.invalidateQueries` called on Avançar/Rejeitar** to refresh the panel after inline actions (`ComparativoCandidatosPage.tsx:99`) — good UX hygiene, not required by spec but welcome ✓

---

## Registry Audit

No `components.json` at repo root — shadcn is manually managed. Third-party registry vetting gate not applicable. No third-party registry blocks declared in UI-SPEC.md. Registry audit skipped per protocol.

---

## Files Audited

- `src/components/pages/VagaCandidatosRHPage.tsx`
- `src/features/triagem/components/TriagemTable.tsx`
- `src/features/triagem/components/SugestaoIABadge.tsx`
- `src/features/triagem/components/ComparativoScreen.tsx`
- `src/components/pages/ComparativoCandidatosPage.tsx`
- `src/components/ui/table.tsx` (shadcn base — to verify default padding)

Referenced:
- `.planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-UI-SPEC.md`
- `.planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-CONTEXT.md`
