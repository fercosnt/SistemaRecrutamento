# Phase 17 — UI Review

**Audited:** 2026-06-28
**Baseline:** 17-UI-SPEC.md (approved 2026-06-28, status: approved)
**Screenshots:** Not captured — dev server detected at localhost:3003 but Playwright MCP unavailable; audit conducted via code review only. (Note: the dev server is live and the J4 Playwright smoke passed in 17-05, so the wiring is confirmed navigable.)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | 4 verbatim copy misses across Dashboard empty states, filtered empty, and LGPD body |
| 2. Visuals | 3/4 | Visual hierarchy works for hub and 404; Dashboard h1 weight unspecified; hub candidate-name at text-3xl not the 48px Display |
| 3. Color | 3/4 | No bg-primary violations; accent overextended in sidebar (active nav + avatar dot + user avatar) beyond the 4-element reserved list |
| 4. Typography | 2/4 | font-bold (700) used 6 times on stat counters in violation of "2 weights only (400/600)"; 3 non-spec sizes (text-3xl/text-4xl/text-5xl/text-lg) in new surfaces |
| 5. Spacing | 3/4 | Standard 4px-scale Tailwind spacing throughout; 3 legitimate arbitrary values (min-h-[44px] tap targets, sidebar w-[280px]/h-[120px]/w-[120px] avatar) — all justified or pre-existing |
| 6. Experience Design | 4/4 | All loading/error/empty states wired per spec; drift guard on etapa_atual cast; LGPD gate correct; tap targets ≥44px; collapse aria-label present; mobile sr-only present |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Dashboard empty-state copy misses UI-SPEC verbatim contract** — candidates who have no applications, or who filter to zero results, see off-spec strings that do not match the approved content contract. Fix: change `DashboardCandidatoPage.tsx:281` from `'Você ainda não se candidatou a nenhuma vaga'` to `'Você ainda não se candidatou'`; change `DashboardCandidatoPage.tsx:290` from `'Explorar Vagas Disponíveis'` to `'Ver vagas'`; add the missing filtered-empty heading `'Nenhuma candidatura neste filtro'` and body `'Tente outro status ou limpe o filtro.'` in the filtered-zero branch (currently falls through to the same generic block).

2. **font-bold (700) on Dashboard stat counters violates the "2 weights only: 400/600" typography rule** — the six `text-4xl font-bold` stat counters (`DashboardCandidatoPage.tsx:194,198,202,206,210,214`) use weight 700, which the UI-SPEC explicitly prohibits: "Bold (700) is NOT used on these surfaces — the 404 display numeral uses 600 semibold at 48px." Fix: change all 6 instances from `font-bold` to `font-semibold`.

3. **Hub candidate-name header uses text-3xl/md:text-4xl instead of the spec's 48px Display role** — `HubCandidatoRH.tsx:121` sets the candidate name (the hub's top-level identity heading, the only element that should use the Display size) to `text-3xl font-semibold text-white md:text-4xl` (30px→36px), below the 48px spec. Fix: change to `text-5xl font-semibold` (or `text-[48px] font-semibold`) to match the "hub candidate name header" Display role defined in the Typography table.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

**PASS — 404 page:** All three verbatim copy strings present and exactly matched: display "404" (in JSX at line 71 of NotFoundPage.tsx), heading "Página não encontrada" (line 77), body "O endereço que você tentou acessar não existe ou foi movido." (line 82), all three role-aware back-link labels (lines 39/44/48).

**PASS — Hub empty states (HubSection):** All four states present verbatim in the `COPY` constant at `HubSection.tsx:50-61`: "Etapa ainda não iniciada" / "Esta etapa será liberada quando o candidato avançar no funil." / "Sem dados nesta etapa" / "Nenhum registro foi gerado ainda para esta etapa." plus error state "Não foi possível carregar esta seção." / "Tente recarregar a página."

**PASS — Hub CTA copy:** `entradaAtual.ctaRH` resolves to `"Abrir {label}"` from `funilNavMap.ts` (e.g. "Abrir Entrevista Online"); "Revisar {label}" for passed stages (`HubCandidatoRH.tsx:165`); "Próximo passo" eyebrow at line 131.

**PASS — LGPD card title and CTA:** "Entenda a decisão sobre sua candidatura" (line 408), "Ver explicação" (line 425) — verbatim match.

**WARNING — Dashboard zero-candidaturas empty state heading:** The UI-SPEC prescribes `"Você ainda não se candidatou"` as the heading. The implementation at `DashboardCandidatoPage.tsx:281` renders `'Você ainda não se candidatou a nenhuma vaga'` (extra suffix "a nenhuma vaga") inside a `<p>` rather than as a standalone heading, and it is conditionally interpolated as part of an inline string rather than a dedicated element. The spec also prescribes body `"Explore as vagas abertas e dê o primeiro passo."` — not found. The CTA is specified as `"Ver vagas"` but the implementation renders `"Explorar Vagas Disponíveis"` at line 290.

**WARNING — Dashboard filtered-empty state:** The UI-SPEC prescribes a distinct filtered-zero state with heading `"Nenhuma candidatura neste filtro"` and body `"Tente outro status ou limpe o filtro."` The implementation uses a single shared empty-state block for both zero-total and zero-filtered — the filtered branch (`statusFilter !== 'todas'`) falls through to the same generic block without the spec's prescribed copy.

**WARNING — LGPD card body:** The UI-SPEC specifies `"Você tem direito a uma explicação sobre como sua avaliação foi conduzida (LGPD Art. 20)."` The implementation at `DashboardCandidatoPage.tsx:411-413` reads: `"Você tem direito a uma explicação sobre como sua avaliação foi conduzida (LGPD Art. 20)."` — this is a PASS on close inspection (the text matches; the grep for the full body returned it split across a JSX line boundary).

**MINOR — Dashboard h1 title copy:** The heading "Dashboard de Candidato" at line 185 is reasonable Portuguese but was not in the UI-SPEC copywriting table. The spec defines CTA/empty/error strings, not page titles, so this is not a contractual miss — but the verbosity ("Dashboard de Candidato" could simply be "Seu Painel") is weak relative to Beauty Smile brand voice. Advisory only.

**MINOR — Hub IN-04 redação button label:** `"Abrir workspace de redação"` at `HubCandidatoRH.tsx:245` is not in the UI-SPEC copywriting table. The spec defines "Abrir {label}" for the current-stage CTA and "Revisar {label}" for passed stages. This always-visible secondary button (intentionally added as IN-04 to keep the 3rd workspace reachable regardless of data state) uses a non-spec label. Low impact but drift risk.

---

### Pillar 2: Visuals (3/4)

**PASS — 404 page visual hierarchy:** Standalone glass surface on BackgroundImage gradient with no persona navbar (spec-correct). Clear focal hierarchy: logo → display numeral "404" at text-[48px] → h1 heading at text-2xl → body at text-base → single turquoise accent CTA. No icon-only affordances. BeautySmileLogo present.

**PASS — Hub visual hierarchy:** Identity header → single dominant turquoise CTA → 8-stage timeline always visible → per-section HubSection cards. Etapa chip in turquoise accent provides clear current-position signal. Skeleton loading states prevent layout shift. No empty white panels — every section has an explicit state renderer.

**PASS — Sidebar Admin item:** "Admin" item renders with visible text label and `ShieldCheck` icon, consistent with other sidebar items at 24px icon size. Active-state detection via `pathname.startsWith('/admin')` at line 58 of RHSidebar.tsx — correct. Item is conditionally rendered only for `administrador` role.

**PASS — Accessibility — icon-only controls:** The collapse toggle carries `aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}` at `RHSidebar.tsx:275`. The mobile hamburger has `<span className="sr-only">Abrir menu</span>` at line 294. Chevron icons use `aria-hidden="true"` at line 279/282. The 404 back-link `ArrowLeft` icon has `aria-hidden="true"`.

**WARNING — Hub candidate-name header uses text-3xl/md:text-4xl:** The spec's Display role (48px, Montserrat, for the hub candidate name header) is not met. At `HubCandidatoRH.tsx:121`, the name renders at `text-3xl` (30px) scaling to `text-4xl` (36px) on md breakpoint. This reduces the candidate identity prominence that the "hub bem completo" design intent requires — the name should anchor the page at Display weight.

**WARNING — Dashboard h1 lacks font-semibold / font class:** `DashboardCandidatoPage.tsx:185`: `<h1 className="text-white text-5xl mb-2 drop-shadow-lg">` has no explicit weight class. Browser default for `<h1>` is bold (700), which violates the spec's "2 weights only: 400/600." If the Tailwind base reset removes heading bold, this renders at weight 400, which is too light for a 48px hero. Either way the absence of `font-semibold` is a spec gap.

**WARNING — Dashboard collapsed logout button uses `title` not `aria-label`:** `RHSidebar.tsx:265` sets `title="Sair"` on the collapsed logout button. `title` attributes are not reliably surfaced by all screen readers (they are tooltip-only, not accessible name). The spec requires `aria-label` for icon-only controls. Change to `aria-label="Sair"`.

---

### Pillar 3: Color (3/4)

**PASS — No bg-primary token used:** All new/rewritten files in scope return 0 matches for `bg-primary`. Token D-26 workaround honored throughout.

**PASS — 60/30/10 distribution on candidate-facing surfaces:** BackgroundImage gradient (`#35BFAD → #00109E`) provides the 60% dominant field. Glass surfaces (`bg-white/15`, `bg-black/30`, `GlassCard variant="dark"`) provide the 30% secondary. Accent (#35BFAD) reserved for interaction affordances.

**PASS — 404 accent usage:** Single accent affordance is the GlassButton (`bg-[#35BFAD]/30`) — the back-link. Matches spec element #4 exactly.

**PASS — Dashboard accent usage:** Step-CTA button (`bg-[#35BFAD]` when `destino != null`), LGPD card CTA (`bg-[#35BFAD]`), and the LGPD card icon (`text-[#35BFAD] ShieldCheck`). The step-CTA matches reserved element #1 (dominant CTA). The LGPD CTA matches reserved element #3. The icon is a visual amplifier for the LGPD card, not an additional interactive element — acceptable.

**WARNING — Sidebar accent overextended beyond reserved list:** The sidebar uses `bg-[#35BFAD]` in 3 places not on the UI-SPEC reserved list: (1) active nav item background (`RHSidebar.tsx:211`) — this is a system-level active state that is defensible but not listed; (2) collapsed-mode badge dot (`line 232`) — a notification indicator; (3) user avatar background (`line 245`) — purely decorative. The spec's reserved list states "Everything else interactive uses neutral glass affordances." The active-state use is the most defensible (it is the established M2 sidebar pattern). The avatar dot is the cleanest violation — it uses accent as decoration, not as a navigation or CTA affordance.

**PASS — No unspecified hardcoded hex:** Beyond the two declared tokens (#35BFAD and #00109E), no other hex literals appear in the new files.

---

### Pillar 4: Typography (2/4)

**PASS — HubSection and NotFoundPage:** Both use only the two spec weights (font-semibold / implicit regular) and sizes within the spec's four roles.

**PASS — HubCandidatoRH section headings:** `text-xl font-semibold md:text-2xl` at HubSection.tsx:77 — within the Heading role (24px/600), responsive scaling acceptable.

**VIOLATION — font-bold (700) on Dashboard stat counters:** 6 instances at `DashboardCandidatoPage.tsx:194,198,202,206,210,214`. The spec explicitly states "Two weights only: 400 (regular) + 600 (semibold). Bold (700) is NOT used on these surfaces." The stat counters use `text-4xl font-bold` — both the weight (700) and size (36px, outside the spec's {14,16,24,48}px) are violations.

**VIOLATION — Text sizes outside the spec's {14,16,24,48}px set:**
- `text-3xl` (30px) in `HubCandidatoRH.tsx:121` (candidate name), `DashboardCandidatoPage.tsx:191,223` (section headings)
- `text-4xl` (36px) in stat counters (6×), `HubCandidatoRH.tsx:121` (md breakpoint)
- `text-5xl` (48px) in `DashboardCandidatoPage.tsx:185`, `MeuPerfilCandidatoPage.tsx:343` — these are technically the Display role (48px) but rendered without `font-semibold`
- `text-lg` (18px) in `HubSection.tsx:68` (empty-state heading on md) — outside the four-role scale

The spec permits four sizes: 14 (text-sm), 16 (text-base), 24 (text-2xl), 48 (text-5xl / text-[48px]). The pre-existing DashboardCandidatoPage uses text-3xl/text-4xl in the stats panel and section headers, which are M2 carry-overs not redesigned by Phase 17 — but the hub (new in this phase) also introduces text-3xl at the candidate name, which is the one size the spec explicitly calls Display.

**PASS — font-medium:** 3 uses across the new files — `font-medium` is weight 500, which lies between the spec's 400 and 600. These are minor (navbar username text, status badge label, sidebar avatar initial). Low visual impact.

**Summary of weight violations:** 6 `font-bold`, 3 `font-medium`. The spec allows only regular (400, Tailwind default) and semibold (600). Nine usages of unauthorized weights.

---

### Pillar 5: Spacing (3/4)

**PASS — Standard scale throughout:** All primary layout spacing uses the Tailwind numeric classes on the 4px base: `p-6` (24px), `p-8` (32px), `gap-2/3/4/6`, `space-y-2/3/4/6/8`, `py-12`, `py-16`, `py-20`. These map correctly to the xl/2xl/3xl scale tokens in the spec.

**PASS — Arbitrary values are justified:**
- `min-h-[44px]` — tap target minimum per spec ("≥44px ... no other exceptions"). 5 uses in HubCandidatoRH.tsx, all on interactive buttons.
- `w-[280px]` / `w-[104px]` — sidebar fixed widths; the sidebar is pre-existing infrastructure, not new this phase.
- `h-[120px]` — sidebar logo area height; pre-existing.
- `w-[120px] h-[120px]` — avatar size in MeuPerfil; pre-existing.
- `text-[48px]` — 404 display numeral; exactly the spec's Display size.

**MINOR — `p-0` appears twice:** Zeroing padding is on-scale (0 × 4px) but unusual in a glass-card context. Both appear in the sidebar `ScrollArea` internals and do not affect user-visible content alignment. Not a violation.

**MINOR — `p-12`:** 48px (2xl token). Used once in Dashboard empty state `p-12 text-center` card. Matches the spec's "2xl = 48px: Major section breaks, empty-state vertical breathing." Correct usage.

---

### Pillar 6: Experience Design (4/4)

**PASS — Loading states:** Every hub section passes `isLoading` to `HubSection` which renders a `Skeleton`. The identity header has its own `loadingContexto` branch rendering `<Skeleton className="h-20 w-full bg-white/5">`. Dashboard list has `animate-pulse` skeletons for the 3-card loading state. The states are all wired to real TanStack Query `isLoading` flags, not hardcoded.

**PASS — Error states:** `HubSection.tsx:81` renders the error copy ("Não foi possível carregar esta seção.") when `isError` is true. All 6 hub sections pass their query's `isError` flag. Dashboard list has an `AlertCircle` error card with "Erro ao carregar candidaturas."

**PASS — Empty states:** Three-tier empty system: `futuro` (locked future stage), `sem_dados` (reached but no data), `com_dados` (children shown). The HubSection `COPY` constants are the single source of truth, pinned by `hubEmptyState.test.tsx`. Dashboard handles zero-total and filtered-zero (though the copy deviates — see Pillar 1).

**PASS — Drift guard:** `getStepCTA` in DashboardCandidatoPage casts `candidatura.etapa_atual as EtapaFunilM2`, guards the map lookup for `undefined`, and guards `rotaCandidato` for `null` — yielding the neutral "Acompanhar candidatura" fallback. Never crashes, never invents a route.

**PASS — LGPD gate:** `hasDecisaoFinal` correctly gates on etapa ∈ {decisao_final, aprovado, rejeitado} AND (`data_decisao_final` OR `feedback_rejeicao`) present — both paths to final decision are covered.

**PASS — Tap targets:** All interactive buttons in HubCandidatoRH use `min-h-[44px]`. NotFoundPage GlassButton uses `min-h-11` (44px). Sidebar nav items use `px-4 py-3` (approximate 48px height).

**PASS — Collapse toggle accessibility:** `aria-label` on the collapse button properly alternates between "Expandir menu lateral" and "Recolher menu lateral". Mobile toggle has `<span className="sr-only">Abrir menu</span>`.

**PASS — Disabled states:** `GlassButton` on Perfil senha form has `disabled` prop wired to form completeness check. Logout button does not need disabled state.

**ADVISORY — Collapsed logout uses `title` not `aria-label`:** `RHSidebar.tsx:265` (`title="Sair"`) on the icon-only collapsed logout button. `title` is a tooltip attribute not reliably exposed as an accessible name. This should be `aria-label="Sair"`. Not a task-blocking failure but a real a11y gap.

---

## Registry Safety

Registry audit: no third-party registries declared in UI-SPEC.md; no `components.json` at project root. Vetting gate not triggered.

---

## Files Audited

- `/src/components/pages/NotFoundPage.tsx` (new — Phase 17/Plan 02)
- `/src/features/hub-candidato/components/HubSection.tsx` (new — Phase 17/Plan 03)
- `/src/features/hub-candidato/components/HubCandidatoRH.tsx` (new — Phase 17/Plan 03)
- `/src/features/hub-candidato/index.ts` (new — Phase 17/Plan 03)
- `/src/components/pages/DashboardCandidatoPage.tsx` (modified — Phase 17/Plan 04)
- `/src/components/pages/MeuPerfilCandidatoPage.tsx` (modified — Phase 17/Plan 04)
- `/src/components/RHSidebar.tsx` (modified — Phase 17/Plan 03)
- `/src/lib/navegacao/funilNavMap.ts` (new — Phase 17/Plan 02; not an audited UI surface but verified for copy/label sourcing)
- `.planning/phases/17-navegacao-arquitetura-informacao/17-UI-SPEC.md` (design contract baseline)
- `.planning/phases/17-navegacao-arquitetura-informacao/17-01 through 17-05 SUMMARY.md` (what was built)
