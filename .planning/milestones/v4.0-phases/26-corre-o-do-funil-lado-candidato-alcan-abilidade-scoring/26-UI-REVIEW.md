# Phase 26 — UI Review

**Audited:** 2026-07-12
**Baseline:** `26-UI-SPEC.md` (correction contract, inherits palette/type/spacing from `11-UI-SPEC.md`)
**Screenshots:** not captured — no dev server detected on :3003 (project default) or :3000 (occupied by an unrelated app redirecting to `/login`); code-only audit
**Scope discipline:** audited ONLY the two declared phase-26 UI deltas (card-state-from-RPC + cognitivo card in `AvaliacaoContainer.tsx`; the 6-screen honest-copy replacement), verified against `git show 8649520` and `git show 8f864c4` (the two commits that touch these files) so every finding below is attributable to what Phase 26 actually changed vs. what it inherited untouched.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | All 6 spec replacements are byte-verbatim + CI-guarded, but the identical "avisaremos por e-mail" anti-pattern survives one hop upstream of the funnel this phase fixes (`useCandidaturas.ts:299`), unguarded and unscoped. |
| 2. Visuals | 4/4 | Cognitivo card is a true peer (identical GlassCard/title/pill/CTA treatment, correctly ordered last); icon+label pairing holds across all reachable states. |
| 3. Color | 4/4 | Accent (`#35BFAD`) confirmed confined to the 2 declared touchpoints; `em_andamento` verified in code to share the exact neutral tint as `pendente` — the load-bearing anti-pattern (color-as-warning) is correctly avoided. |
| 4. Typography | 3/4 | The delta itself adds zero new sizes/weights (cognitivo card reuses `text-xl font-semibold`; copy-only commit touches no type classes) — but the inherited surface still carries pre-existing `text-xs`/`text-2xl` outliers against the declared 4-size scale. |
| 5. Spacing | 4/4 | Delta reuses the exact token set declared (`p-6`, `space-y-4`, `gap-2`, `px-3 py-1.5`, `min-h-[44px]`); no new arbitrary values introduced. |
| 6. Experience Design | 3/4 | The state-source fix (RPC booleans, not a phantom field) is a genuine correctness improvement, but one of the contract's 4 documented card states (`bloqueado`/Indisponível) is unreachable dead code, and the new `em_andamento` render path has no connected-mode test asserting it. |

**Overall: 21/24**

---

## Top 3 Priority Fixes

1. **Residual dishonest e-mail promise just outside the guarded scope** — `src/features/vagas/hooks/useCandidaturas.ts:299`, the candidatura-submission success toast reads *"Candidatura enviada com sucesso! Você receberá um email com os próximos passos."* This is the exact anti-pattern UX-01 was built to eradicate (the product has no e-mail notification infra), sitting one screen upstream of the funnel Phase 26 corrected, and it is invisible to both the new grep guard (file not in `WAIT_STATE_FILES`) and its own regex (no literal "por e-mail" — it says "um email com", so even a broadened guard would miss it as currently written). **Fix:** replace the toast description with the canonical line and extend the grep guard's file list (or regex) to catch "receberá um email" without the "por e-mail" suffix.
2. **`em_andamento` card state has no connected-mode assertion** — `AvaliacaoContainer.test.tsx`'s 26-06 describe block covers the `aplica_cognitivo` gate and pendente/concluído derivations, but no test renders a card with `iniciado: true` through the connected path and asserts `CircleDot` + "Em andamento" + "Continuar avaliação" render (the fixture at line 111 sets `candidatura.status`, not a per-card `iniciado` flag). Since this is the one net-new visual branch the Card State Contract specifies, a regression here (e.g. someone re-introducing a color tint) would ship silently. **Fix:** add a case to the existing 26-06 describe block with one card's `iniciado: true` and assert the neutral tint + label + CTA text.
3. **The 4th documented card state (`bloqueado`/Indisponível) is permanently dead code** — `statusInfo()`'s `'bloqueado'`/`'indisponivel'` branch (lines 141-143) has existed since Phase 11 and is still never emitted by `deriveCardState()`, which only returns `concluido`/`em_andamento`/`pendente`. The 26-UI-SPEC Card State Contract documents 4 states as if all were reachable; in the shipped implementation only 3 are. Not a regression Phase 26 introduced, but Phase 26 was the chance to either wire a real per-card blocking condition or delete the dead branch — it did neither. **Fix (low urgency, doc/cleanup item):** either delete the unreachable branch + row from the contract, or use it for a real intra-etapa dependency if one exists (e.g., a test gated behind another).

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**What Phase 26 changed (verified via `git show 8649520`, string-only diff, 7 insertions/7 deletions across 6 files):**
- `AvaliacaoContainer.tsx:229` — ✅ matches spec row 1 verbatim: *"Você concluiu todas as avaliações desta etapa. Acompanhe o andamento pelo seu painel."*
- `RedacaoEditorScreen.tsx:278` — ✅ matches spec row 2 verbatim.
- `DevolutivaBigFiveView.tsx:157` — ✅ matches spec row 3 verbatim: *"Volte em alguns instantes. Acompanhe o andamento pelo seu painel."*
- `ProvaCognitivaScreen.tsx:82` (`postSubmit`) + `:18` (doc prose) — ✅ both updated in lockstep, matching spec rows 4/4b.
- `SolicitarRevisaoCTA.tsx:45` (`dialogBody`) — ✅ matches spec row 5 verbatim.
- `SuporteRHPage.tsx:162-163` — ✅ matches spec row 6 verbatim.
- **CI grep guard** (`src/__tests__/guards/wait-state-copy.grep.test.ts`, new in this phase) is well-built: scoped path allowlist (not a global ban), positive assertion the canonical string is present in all 6 files, negative assertion the ban patterns are gone, plus regex-correctness sub-tests proving no false-positive on the LGPD consent string / RH "Notificar candidato por email" toggle / password-reset copy. This is exactly the kind of durable regression net the spec asked for.
- **Consent copy untouched** — confirmed `AutorizacoesStep.tsx:58/93/185` was not touched (out of scope, correctly respected).

**What the audit found the phase left behind:** `src/features/vagas/hooks/useCandidaturas.ts:299` fires *"Você receberá um email com os próximos passos."* on `useCreateCandidatura`'s `onSuccess` toast — i.e., at candidatura submission, the literal front door of the funnel this phase is correcting. This is the same "the system has no e-mail infra" lie the phase's own rationale calls out (26-CONTEXT.md: "o painel é a fonte da verdade"). It sat outside the declared 6-screen scope, so it is not a phase-26 regression, but it is a real, user-visible instance of the exact defect class this phase was chartered to close, and it was not caught because (a) the file isn't in the guard's allowlist and (b) the guard's regex requires the literal "por e-mail" substring, which this string doesn't contain even though it's the same broken promise. Docked one point for this — a copywriting-contract audit that stops exactly at the declared file list misses the adjacent instance of the very problem being fixed.

### Pillar 2: Visuals (4/4)

- Cognitivo card (the one net-new visual element) renders through the exact same `GlassCard variant="white" blur="md"` → `h3.text-xl.font-semibold` title → `text-white/80 text-sm` meta → right-aligned pill → conditional CTA structure as every sibling card (`AvaliacaoContainer.tsx:242-274`) — verified byte-identical to the existing card-render loop, not a bespoke branch. Satisfies the spec's "no special styling; it is a peer card."
- Ordering: confirmed the cognitivo card is `push`ed after the main `for` loop (`deriveCards`, lines 358-391), so it always renders last regardless of `testes_aplicaveis` order — matches spec.
- Icon+label pairing holds for every reachable state: `Circle`+"Pendente", `CircleDot`+"Em andamento", `CheckCircle2`+"Concluído" all render icon and text together inside the same pill (`AvaliacaoContainer.tsx:255-260`) — no icon-only affordance introduced.
- No focal-point regression: the page retains one clear H1 ("Avaliação") + one panel; the new card doesn't compete for primacy.
- Not scored against (inherited, unrelated to this phase's touched lines): `SuporteRHPage.tsx`'s pre-existing icon-only "remove attachment" button (line 537-544) has no `aria-label`; heavy emoji use in that page's headings (🛠️🐛💡❓📋✅❌) predates this phase and only 1 line of that file changed here.

### Pillar 3: Color (4/4)

- Accent (`#35BFAD`) usage inside the phase-26 diff is exactly the 2 spec-declared touchpoints: the `concluido`/`feito` case in `statusInfo()` (`AvaliacaoContainer.tsx:133`) and the all-done panel's `CheckCircle2` (`:226`). Grepped the full file for `#35BFAD` — no third site.
- Verified in code (not just the doc comment) that `em_andamento` shares the identical `text-white/70` tint as `pendente` (`:140` vs `:145`) and both pills share the same `bg-white/10 border border-white/20` container class (`:255`) — the spec's core anti-pattern ("never a warning/color tint" between these two states) is genuinely, structurally true, not just claimed in a comment.
- `bloqueado`/`indisponivel` uses `text-white/60` (`:143`), distinct from the other two only by being unreachable (see Experience Design finding #3) — not a color violation, just currently moot.
- Destructive red (`#EF4444`) confirmed used ONLY for the load-error icon (`:490`), matching the spec's "no destructive candidate actions" rule.
- Not scored against (inherited, untouched by this phase's commits): `RedacaoEditorScreen.tsx`'s autosave-saved affordance also uses `text-[#35BFAD]` (`:86`) and `SuporteRHPage.tsx` uses `#35BFAD` for a decorative icon badge (`:180-181`) plus severity badges in red/orange/yellow/green (`:140-147`) — all predate Phase 26 (confirmed via `git show 8649520`, none of these lines are in the diff) and sit outside this phase's 60/30/10 accounting, which the 26-UI-SPEC itself scopes as "this phase" only.

### Pillar 4: Typography (3/4)

- The phase-26 diff itself is typography-neutral: `git show 8649520` is a pure string swap (0 class changes) and `git show 8f864c4`'s new cognitivo card reuses the exact `text-xl font-semibold drop-shadow-md` card-title class already used by every sibling — no new size or weight is introduced by this phase.
- However, the surface being audited (the 6 files named in the phase's own contract) still shows sizes outside the declared 4-size/2-weight scale when read as a whole: `text-xs` (`DevolutivaBigFiveView.tsx:218` tab triggers, `:248` LGPD footer) and `text-2xl` (`DevolutivaBigFiveView.tsx:186`, `RedacaoEditorScreen.tsx:219,276`, `AvaliacaoContainer.tsx:299` wrong-etapa heading) appear alongside the contract's `text-sm`/`text-base`/`text-xl`/`text-3xl→4xl`. All of these predate Phase 26 (Phase 12/13 commits per `git log`) and were already flagged as debt in the Phase-11/12 UI reviews (deferred to a "Phase 16 polish" that evidently didn't fully land). This is real, but it is inherited debt the 26-UI-SPEC chose to declare "inherited verbatim" rather than re-audit — scoring the pillar at 4/4 would imply the whole typographic surface is clean, which it is not, even though Phase 26's own edits are.

### Pillar 5: Spacing (4/4)

- Every class touched or added by Phase 26 comes from the declared scale: `p-6` (GlassCard default), `space-y-4`/`space-y-6`/`space-y-8` (panel rhythm), `gap-2`/`px-3 py-1.5` (pill), `mt-4` (CTA top margin), `p-12` (all-done state) — no arbitrary bracket values were added by either commit.
- `min-h-[44px]` is present on every card CTA and the status pill (`:255`, `:267`), correctly using the documented mobile-a11y exception rather than a random arbitrary value.
- Not scored against (inherited, pre-existing): `gap-1.5` (6px, off the declared 4/8/16/24/32/48/64 scale) appears in the timer rows of `ProvaCognitivaScreen.tsx:295` and `RedacaoEditorScreen.tsx:81/86/91` — confirmed via `git blame`/`git log` these lines are Phase 13/14 in origin, untouched by either Phase-26 commit.

### Pillar 6: Experience Design (3/4)

- **Real improvement, verified structurally:** `deriveCardState()` (`:323-331`) now reads presence booleans off `get_avaliacao_status` (`registrado`/`iniciado`) instead of the phantom `entry.status` field that `testeAplicavelSchema` never carried — this is a genuine bug fix, not cosmetic, and it's covered by connected-mode tests (`AvaliacaoContainer.test.tsx:148+`) exercising the `aplica_cognitivo` gate at both `true`/`false` and asserting the template-driven cognitivo entry is suppressed in favor of exactly one gated append.
- **Full state coverage on the new surface:** the cognitivo card inherits loading (skeleton), error+retry, opt-in-not-applicable, and empty-item-set states identically to its siblings (`ProvaCognitivaScreen.tsx:181-281`) — no state was left uncovered by wiring the real route.
- **Gap 1 — untested visual branch:** no test renders a card through the connected path with `iniciado: true` and asserts the `CircleDot`/"Em andamento"/"Continuar avaliação" render trio; the only fixture using the string `'em_andamento'` (`:111`) sets `candidatura.status`, an unrelated field. A future refactor could silently break this branch and CI would stay green.
- **Gap 2 — dead contract state:** the `bloqueado`/`indisponivel` branch in `statusInfo()` has been unreachable since Phase 11 and remains so after Phase 26; the 26-UI-SPEC's Card State Contract table presents it as one of 4 live states. Either the state should be wired to a real condition or the contract/branch should be pruned — as shipped, 25% of the documented contract is aspirational.

---

## Registry Safety

`components.json` not present (project uses vendored shadcn primitives, no CLI-managed registry — confirmed by `26-UI-SPEC.md`'s own "Registry Safety" section and by `test -f components.json` returning false). Registry audit not applicable; skipped per protocol.

---

## Files Audited

- `.planning/phases/26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring/26-UI-SPEC.md`
- `.planning/phases/26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring/26-CONTEXT.md`
- `src/features/avaliacao/components/AvaliacaoContainer.tsx` (+ `git show 8f864c4`, `git show d600258` for historical baseline)
- `src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx`
- `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx`
- `src/features/avaliacao/components/RedacaoEditorScreen.tsx`
- `src/features/avaliacao/components/DevolutivaBigFiveView.tsx`
- `src/features/explicacao/components/SolicitarRevisaoCTA.tsx`
- `src/components/pages/SuporteRHPage.tsx`
- `src/features/avaliacao/services/avaliacaoService.ts` (`getAvaliacaoContext`, `getAvaliacaoStatus`)
- `src/__tests__/guards/wait-state-copy.grep.test.ts`
- `src/components/ui/glass.tsx` (variant enum cross-check)
- `src/router/routes.tsx` (route-param cross-check, `/candidato/prova-cognitiva/:candidaturaId`)
- `src/lib/navegacao/funilNavMap.ts` (sub-screen comment cross-check)
- `src/features/vagas/hooks/useCandidaturas.ts` (adjacent copy finding, line 299)
- `src/components/pages/DashboardCandidatoPage.tsx`, `src/components/pages/VagaDetalhePage.tsx` (canonical-copy precedent cross-check)
- `git show 8649520`, `git show 8f864c4` (exact phase-26 diffs, used to separate delta findings from inherited debt)
