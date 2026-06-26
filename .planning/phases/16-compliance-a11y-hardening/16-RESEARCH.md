# Phase 16: Compliance & A11y Hardening - Research

**Researched:** 2026-06-26
**Domain:** WCAG 2.1 AA accessibility remediation + axe-core CI gating (Playwright) + trivial tsc burn-down + RH-login verification
**Confidence:** HIGH (existing tooling, primitives, and fix-targets all verified in-tree)

## Summary

Phase 16 is a **hardening phase that reuses existing tooling end-to-end** — no new libraries, no new design tokens, no new auth migration. The a11y harness already exists (`@axe-core/playwright@4.11.3` + `axe-core@4.11.4` engine installed; `e2e/a11y.spec.ts` + `playwright.config.ts` present; the CI `e2e` job already runs `npx playwright test --project=chromium` unconditionally). The work is to **expand** the existing public-route axe loop to the 16 main M2 screens behind a serious/critical-zero gate, and to **fix in place** the 15 carry-in defects (FX-01..FX-15) the UI-SPEC already mapped to `file:line`. Every Radix primitive needed for the semantic fixes (`RadioGroup`, `Tabs`, `Tooltip`, `Slider`) is already vendored in `src/components/ui/` — the fixes are swaps/attribute-adds, not new components.

The CI gate is **fold-into-existing**: add a Tier-A unconditional loop to `e2e/a11y.spec.ts` that mocks a candidate-role and an RH-role Supabase session via the established `makeJwt` + `page.route('**/auth/v1/token?grant_type=password')` idiom (already in `perfil.spec.ts`), then asserts `results.violations.filter(v => v.impact==='serious'||v.impact==='critical')` is empty per screen. Tier-B real-login sweeps reuse the `E2E_REAL_LOGIN=1` skip-with-reason gating (already in `prova-cognitiva.spec.ts` / `explicacao-flow.spec.ts`). No new CI job required.

The auth-hook RLS gap is **already CLOSED in PROD** (verified live 2026-06-26 — confirmed in CONTEXT.md). Phase 16 auth work is therefore narrow: **commit the staged `LoginRHPage.tsx` race fix** (diff inspected — widens role-ready polling 100ms→3s AND widens the gate admin-only→`{rh, administrador}`) and **verify a real RH-login round-trip** carries `role='rh'/'administrador'` in the JWT. **DO NOT author a new auth migration.**

**Primary recommendation:** Extend `e2e/a11y.spec.ts` with a Tier-A mocked-session loop over the 16 screens (serious/critical-zero assertion, `.exclude()` for tracked false-positives), fix FX-01..FX-14 in place using the already-vendored Radix primitives, treat FX-15 + the tsc burn-down as **scoped/conditional** (most tsc errors are structural — only ~3 enum-label fixes + unused-var/import removals are truly trivial), commit the staged LoginRHPage fix, and verify RH login live.

## Project Constraints (from CLAUDE.md)

- **Types are generated:** `database.types.ts` lives at the **repo ROOT** (not `src/types/`) and is regenerated via Supabase CLI — **NEVER edit manually**. tsc fixes must adapt *consumer code* to the generated type, never edit the generated type.
- **Commits use the hook bypass:** `git -c core.hooksPath=/dev/null` (the husky tsc pre-commit hook vs the legacy tsc baseline). This bypass is **KEPT** in Phase 16 (CONTEXT explicitly: do not re-enable the pre-commit hook).
- **Security:** never `supabaseAdmin`/service_role on the client; RLS on 100% of user-data tables; `DevNavigationMenu` gated by `import.meta.env.DEV`.
- **Product language (LGPD/RNF-07a):** "avaliação comportamental/cognitiva" never "teste psicológico"; the system NEVER auto-rejects by score. (A11y fixes must not surface a score/band/percentile on a candidate surface.)
- **Conventions:** PascalCase.tsx named exports; `@/` absolute imports; pt-BR domain language; features under `src/features/<dominio>/`.
- **PROD DDL:** via Supabase MCP `apply_migration` (no-BEGIN/COMMIT wrapper) — **NOT needed this phase** (no new migration).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| axe-core scan + serious/critical gate | CI (Playwright e2e job) | — | Headless browser scans rendered DOM; the existing `e2e` job already runs Playwright unconditionally |
| Mocked-session render of role-gated routes | Browser/Client (test harness) | — | `RoleGuard` reads `authStore.role` (from JWT `app_metadata.role`); mock the token endpoint, the guard renders children client-side |
| ARIA semantics / contrast / keyboard fixes | Browser/Client (React components) | — | Pure presentation-tier fixes in `src/features/**` components using vendored Radix primitives |
| `aria-live` autosave announce | Browser/Client | — | DOM live-region; no server involvement |
| RH role in JWT | API/Backend (Supabase Auth hook) | DB (`usuarios_rh` RLS) | `custom_access_token_hook` reads `usuarios_rh` — **already PROD-verified correct**; no tier change |
| LoginRHPage role-ready race | Browser/Client (`authStore` hydration) | — | Frontend polls `authStore.getState().role` after `hydrateFromSession` awaits the `usuarios_rh` round-trip |
| Trivial tsc burn-down | Browser/Client (consumer code) | — | Adapt consumer code to the generated root `database.types.ts`; never edit generated types |

## Standard Stack

**No new packages.** Everything required is already installed and verified in-tree.

### Core (already present — verified)
| Library | Version (verified in node_modules) | Purpose | Why Standard |
|---------|------------------------------------|---------|--------------|
| `@axe-core/playwright` | **4.11.3** [VERIFIED: node_modules + package.json `^4.11.3`] | `AxeBuilder` axe scan inside Playwright | Already the project's a11y engine (Phase 5 `a11y.spec.ts`); Deque-maintained, the de-facto standard |
| `axe-core` | **4.11.4** [VERIFIED: node_modules] | Underlying WCAG rule engine | Transitive engine behind `@axe-core/playwright`; carries `wcag2a/2aa/21a/21aa` tag sets |
| `@playwright/test` | **1.56.1** [VERIFIED: package.json `^1.56.1`] | E2E runner + CI | Existing harness; chromium project + `webServer: npm run dev` on `:3003` |

### Supporting (vendored Radix primitives — all present in `src/components/ui/`)
| Primitive | File | Purpose / Used By | When to Use |
|-----------|------|-------------------|-------------|
| `RadioGroup` | `src/components/ui/radio-group.tsx` [VERIFIED] | Keyboard-correct radiogroup (arrow-key roving focus for free) | FX-05 `RegistrarDecisaoForm`, FX-06 `SjtMultiplaEscolhaScreen`/`BigFiveQuestionnaireScreen` |
| `Tabs` | `src/components/ui/tabs.tsx` [VERIFIED] | `tablist`/`tab`/`tabpanel` ARIA pattern | FX-04 `DecisaoFinalPage`, `EntrevistaWorkspace` custom `aria-pressed` tabs |
| `Tooltip` | `src/components/ui/tooltip.tsx` [VERIFIED] | Keyboard/SR-reachable tooltip | FX-09 `ProvaCognitivaScreen` native `title=`, FX-10 `cursor-help` triggers, FX-12 dead CTA |
| `Slider` | `src/components/ui/slider.tsx` [VERIFIED] | Already used; add `aria-valuetext` | FX-11 `EntrevistaScorecardInline`, `RedacaoReviewPanel`, `config-vaga` weight sliders |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Swap to Radix `RadioGroup` (FX-05/06) | Keep hand-rolled `role="radio"` + add roving `tabindex` + ArrowKey handlers manually | Manual roving-focus is ~30 LoC per group and error-prone; Radix gives keyboard nav + name/role/state for free. **Recommend swap to primitive.** (The hand-rolled version in `RegistrarDecisaoForm.tsx:96-118` already only sets `aria-checked`, no keyboard nav — confirmed.) |
| Fold a11y into existing `e2e` job | Dedicated `a11y` CI job | Isolation is marginally cleaner but adds CI minutes + a second `npm ci`/`playwright install`. **Recommend fold-in** (UI-SPEC §4b default); the spec already runs inside `npx playwright test`. |

**Installation:** none — `npm ci` already provisions everything.

## Package Legitimacy Audit

> No external packages are installed this phase. The two relevant packages are pre-existing project dependencies, registry-verified.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@axe-core/playwright` | npm | mature (Deque) | high (millions/wk) | github.com/dequelabs/axe-core-npm | not run (pre-existing dep) | Pre-approved (already in lockfile) |
| `axe-core` | npm | mature (Deque) | very high | github.com/dequelabs/axe-core | not run (pre-existing dep) | Pre-approved (transitive) |

**Packages removed due to slopcheck [SLOP] verdict:** none — no installs this phase.
**Packages flagged as suspicious [SUS]:** none.

*slopcheck was not run because Phase 16 installs zero new packages; both packages above are already in the committed lockfile and are the canonical Deque a11y tools (github.com/dequelabs).*

## Architecture Patterns

### System Architecture Diagram — the axe-core CI gate flow

```
                        ┌──────────────────────────────────────────────┐
                        │  CI: .github/workflows/ci.yml  →  e2e job     │
                        │  npx playwright test --project=chromium       │
                        │  (webServer: npm run dev → :3003)             │
                        └───────────────────────┬──────────────────────┘
                                                │
                        ┌───────────────────────▼──────────────────────┐
                        │            e2e/a11y.spec.ts                    │
                        └───┬───────────────────────────────────────┬───┘
                            │                                       │
         ┌──────────────────▼─────────────┐      ┌──────────────────▼──────────────────┐
         │ EXISTING public-route loop      │      │ NEW Tier-A main-M2 loop (per screen) │
         │ (Phase 5 — untouched)           │      │ UNCONDITIONAL — the blocking gate    │
         │ routes[] → AxeBuilder           │      └──────────────────┬──────────────────┘
         │ expect(violations).toEqual([])  │                         │
         └─────────────────────────────────┘     ┌───────────────────▼───────────────────┐
                                                  │ per screen:                            │
                                                  │  page.route('**/auth/v1/token...')     │  ← mock token
                                                  │    → makeJwt({app_metadata.role})      │     (candidate OR rh)
                                                  │  page.route('**/rest/v1/<table>**')    │  ← mock data reads
                                                  │  page.goto(route)                      │
                                                  │  RoleGuard reads authStore.role        │  ← renders children
                                                  │  new AxeBuilder({page})                │
                                                  │    .withTags(wcag2a/2aa/21a/21aa)      │
                                                  │    .exclude(<tracked false-positives>) │
                                                  │    .analyze()                          │
                                                  │  blocking = violations.filter(         │
                                                  │    v => impact serious|critical)       │
                                                  │  expect(blocking).toEqual([])          │  ← GATE
                                                  └────────────────────────────────────────┘

         ┌─────────────────────────────────────────────────────────────────────────────────┐
         │ Tier-B real-login sweep (E2E_REAL_LOGIN=1) — skip-with-reason in default CI       │
         │ login() helper → real Supabase → screens needing live scores/seeded candidatura   │
         │ + manual keyboard / focus / aria-live checks (AB-5/AB-6/AB-8) in 16-HUMAN-UAT.md  │
         └─────────────────────────────────────────────────────────────────────────────────┘
```

### Pattern 1: Tier-A mocked-session axe scan of a role-gated route
**What:** Render a `RoleGuard`-protected route under a mocked Supabase session, then run axe and assert zero serious/critical.
**When to use:** Every in-scope screen whose data can be faithfully mocked (the unconditional CI gate).
**Why it works:** `RoleGuard` (verified `src/components/RoleGuard.tsx:84-156`) gates only on `authStore.role`, which is derived from the JWT `app_metadata.role` via `extractRole` (`src/features/auth/utils/extractRole.ts`). Mocking the token endpoint with a JWT carrying the right role populates `role` and the guard renders children — no live Supabase.

```typescript
// Source: existing idiom in e2e/perfil.spec.ts:35-94 (makeJwt + page.route)
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fake-signature-not-verified` // supabase-js never re-verifies client-side
}

async function mockSession(page: Page, role: 'candidato' | 'rh' | 'administrador') {
  const jwt = makeJwt({
    sub: 'test-uuid',
    email: 'a11y@beautysmile.com.br',
    app_metadata: { role, provider: 'email' }, // ← extractRole reads app_metadata.role
    exp: Math.floor(Date.now() / 1000) + 3600,
  })
  await page.route('**/auth/v1/token?grant_type=password', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      access_token: jwt, refresh_token: 'fake', expires_in: 3600, token_type: 'bearer',
      user: { id: 'test-uuid', email: 'a11y@beautysmile.com.br', app_metadata: { provider: 'email' } },
    })}))
  // Mock the data reads each screen needs to render its shell (per-screen rest/v1 routes).
}
```

```typescript
// Source: @axe-core/playwright README + UI-SPEC §4a + WebSearch best-practice (Deque)
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .exclude(DEFERRED_SELECT_PLACEHOLDER) // tracked false-positives (Phase 5 precedent)
  .analyze()
const blocking = results.violations.filter(
  (v) => v.impact === 'serious' || v.impact === 'critical',
)
expect(blocking).toEqual([]) // operationalizes "axe-core >=90"
```

**Note on the assertion shape:** The existing public-route loop uses the *stricter* `expect(results.violations).toEqual([])` (zero of ANY impact). The new main-M2 loop uses the serious/critical filter per the UI-SPEC §2 acceptance bar (`moderate`/`minor` advisory). Both are legitimate; keep the existing public loop strict (don't loosen a green gate), and use the filtered assertion for the new screens. [CITED: UI-SPEC §2 + §4a]

### Pattern 2: `.exclude()` for tracked false-positives (never disable a whole screen)
**What:** When a vendored-primitive node produces a genuine axe false-positive (e.g. the `input-otp` transparent input, the Select placeholder), exclude that selector with a tracking comment — never skip the screen's assertion.
**When to use:** Only for documented false-positives or explicitly-deferred token nodes.
**Example:** `e2e/a11y.spec.ts:59-87` already establishes `DEFERRED_SELECT_PLACEHOLDER = '[data-slot="select-trigger"]'` and `OTP_TRANSPARENT_INPUT = '#token'` with full justification comments. Reuse this exact mechanism. [CITED: e2e/a11y.spec.ts:42-77]

### Anti-Patterns to Avoid
- **Hand-rolling a roving-tabindex radiogroup when Radix `RadioGroup` is vendored.** The existing `RegistrarDecisaoForm` hand-roll only sets `aria-checked` with no keyboard nav — that IS the FX-05 defect. Don't reproduce it; swap to the primitive.
- **`test.skip()`-ing a whole screen to make the gate green.** Use `.exclude(selector)` for the offending node only.
- **Loosening the existing public-route `toEqual([])` gate.** It is green at zero-any-impact; leave it strict.
- **Editing the generated root `database.types.ts` to silence a tsc error.** Adapt consumer code instead (CLAUDE.md hard rule).
- **Authoring a new auth-hook migration.** The RLS+grant+hook chain is PROD-verified complete (CONTEXT.md). Frontend-only auth work this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard-navigable radiogroup (arrow keys, roving tabindex) | Custom `role="radio"` + keydown handlers + `tabIndex` juggling | Vendored `RadioGroup` (`src/components/ui/radio-group.tsx`) | Radix gives ArrowUp/Down/Left/Right roving focus, name/role/state, and Space/Enter selection for free; the hand-roll is the exact FX-05/06 defect |
| ARIA tab pattern (`tablist`/`tab`/`tabpanel` + `aria-controls` + roving focus) | Custom `<button aria-pressed>` rows | Vendored `Tabs` (`src/components/ui/tabs.tsx`) | The custom `aria-pressed` button is not a tab; Radix `Tabs` is the FX-04 fix |
| Keyboard/SR-reachable tooltip | Native `title=` attribute | Vendored `Tooltip` (`src/components/ui/tooltip.tsx`) | `title=` is not reliably keyboard-focusable or SR-announced (FX-09); Radix `Tooltip` focus-triggers + `aria-describedby` |
| Severity-filtered axe assertion | Reimplement impact filtering / custom scoring | `results.violations.filter(v => v.impact === 'serious' \|\| 'critical')` | `@axe-core/playwright` has no built-in severity filter — filter the results array (Deque-confirmed pattern) |
| JWT role extraction in tests | Re-derive role-reading logic | `makeJwt({ app_metadata: { role } })` (perfil.spec.ts idiom) | supabase-js never re-verifies the signature client-side; the existing `makeJwt` is the sanctioned mock |

**Key insight:** every semantic/keyboard fix in this phase has a **vendored Radix primitive already sitting in `src/components/ui/`**. The phase is almost entirely "replace the hand-roll with the primitive that's already there" — the riskiest hand-rolls (radiogroup, tabs) are the actual defects.

## Runtime State Inventory

> Phase 16 is a code/config + test-harness phase. It writes **no** new PROD DDL (the auth-hook chain is already applied and verified). One staged frontend file must be committed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no data migration. The auth-hook reads `usuarios_rh`, already correct in PROD. | none |
| Live service config | None — no Edge Function redeploy in scope. (No EF touched by a11y/tsc fixes.) | none |
| OS-registered state | None — verified: no scheduler/cron/process registration touched. | none |
| Secrets/env vars | None changed. Tier-B uses existing `E2E_REAL_LOGIN` / `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` env vars (already referenced in `prova-cognitiva.spec.ts`, `perfil.spec.ts`). No new secret. | none |
| Build artifacts | None — no package rename. The staged `src/components/pages/LoginRHPage.tsx` (race fix) is an uncommitted working-tree edit, NOT a build artifact. | **Commit the staged file** (`git -c core.hooksPath=/dev/null`) |
| Migration-version drift | Known cosmetic drift (MCP `apply_migration` timestamp vs filename version) — **deferred** per CONTEXT §Deferred. | none (documented) |

**The one non-code action:** commit the already-staged `src/components/pages/LoginRHPage.tsx` (inspected — see Pitfall 5).

## Common Pitfalls

### Pitfall 1: "Trivial tsc burn-down" is mostly NOT trivial — only ~3 enum fixes + unused-var removal are safe one-liners
**What goes wrong:** Treating the ~291 tsc baseline as a flat field of one-liners. It is not.
**Why it happens:** The error histogram (verified this session) is dominated by **structural** classes, not trivial ones:
- **TS2307 (65, the largest bucket)** — module-not-found, ALL in `src/components/ui/*` vendored shadcn primitives (versioned-import pattern). **Structural — DO NOT touch** (risks the whole primitive library; these are the legacy-baseline core).
- **TS7006 (45) implicit-any params**, **TS2322 (43) type-assignment**, **TS2339 (23) property-missing**, **TS2345 (8)** — mostly structural; each needs a real type decision.
- **TS2551 (17) "Did you mean…"** — in `CriarEditarVagaPage.tsx` (`faixa_salarial`/`descricao_completa`/`requisito_*` → columns that don't exist on the generated row type) and `DadosProfissionaisStep.tsx` (`dadosProfissionais` → `dadosPessoais`, cascades ~12×). These look like typos but are **structural schema/form-shape mismatches** — a single rename cascades; verify each before touching. **Not trivial.**

**The genuinely trivial set (verified to error and to be self-contained):**
- **TS6133 (59) unused vars/imports** — e.g. `'React' is declared but never read` across `BeautySmileLogo.tsx`, `GlassShowcase.tsx`, `CardExamples.tsx`, many `pages/*`. Safe one-line deletions (verify no side-effect import).
- **TS2353/TS2561 enum-label mismatches in `vagasTypes.ts` (exactly 3, verified):**
  - L581 `clinica` → `clinico` (TS2561 "Did you mean to write 'clinico'") — **true one-liner** (`Departamento` union has `clinico`).
  - L734 `big_five` → `bigfive` (TS2561 "Did you mean to write 'bigfive'") in `ETAPA_TO_KANBAN` — **true one-liner**.
  - L569 `tempo_integral` (TS2353 "does not exist in `Record<TipoVaga, string>`") — **CAUTION: NOT a one-char typo.** `TipoVaga = 'CLT' | 'PJ'` (verified) — the entire `TIPO_VAGA_LABELS` map (`tempo_integral`/`meio_periodo`/`estagio`/`temporario`) is stale and mismatches the 2-member union. Fixing it means rewriting the map to `{ CLT, PJ }` OR widening the union — a **decision, not a typo**. Flag to planner.
- **TS6196 (3) unused declared types** (e.g. `vagasService.ts:22 'CandidaturaRow'`) — safe deletions.

**How to avoid:** Plan the tsc task as "burn down TS6133 + the 2 confirmed one-line enum typos (clinica, big_five) only; classify TS2307/TS2322/TS2339/TS2551 + the TipoVaga map as out-of-scope structural." Measure the baseline before/after; the gate is **zero-growth** (CI red only if count *rises* above baseline — `ci.yml:43-51`). Update the CI baseline number if it drops.
**Warning signs:** A "one-line" enum fix that produces a *new* error elsewhere = it was structural (the value was load-bearing). Revert and defer.

### Pitfall 2: FX-15 `biasMath` is LIVE, not a flat dead file — delete only the dead runtime functions, KEEP the type exports
**What goes wrong:** Reading FX-15 as "delete `biasMath.ts` if unreferenced" and removing the whole file.
**Why it happens:** CONTEXT/UI-SPEC say "delete if truly unreferenced." But it IS referenced (verified):
- **Type exports are live:** `BandResult` + `AdverseImpactResult` are imported by `BiasAuditPage.tsx:47,71,168` AND `biasAuditService.ts:22,32,126,135`.
- **Runtime functions are dead:** `computeAdverseImpact` + `bandFromAge` have **zero non-test callers in `src/`** (verified — grep returns only `__tests__` + the file itself). The real computation runs server-side in `gerar_bias_snapshot`; the service consumes `snapshot.dados` (the "TS mirror" comment at `biasAuditService.ts:18` confirms the math was mirrored, then superseded by the DB snapshot).
**How to avoid:** FX-15 = delete the dead `computeAdverseImpact`/`bandFromAge` functions + their constants if unreferenced, **keep the `BandResult`/`AdverseImpactResult` type exports** (and update the `biasMath.test.ts` accordingly, or delete it with the functions). This is a **conditional, surgical cleanup — not `rm biasMath.ts`**. Lean toward keeping the file (types live there) and removing only the dead functions; or move the two types into `biasAuditService.ts`/a types file and then delete `biasMath.ts`. Either is fine — but a flat delete breaks the build.
**Warning signs:** `npm run build` fails with "BandResult is not exported" → you deleted the live types.

### Pitfall 3: Mocked-session axe scan under-tests keyboard/focus/live-region — those go to Tier-B/UAT
**What goes wrong:** Assuming a green axe scan proves the radiogroup keyboard nav (FX-05/06), the tab roving focus (FX-04), or the autosave `aria-live` announce (FX-13) actually works.
**Why it happens:** axe models name/role/value/contrast (AB-1..AB-4, AB-7) but **cannot** fully test keyboard operability (AB-5), visible focus order (AB-6), or live-region announcement (AB-8) — the UI-SPEC §2 explicitly splits "verified-via-CI" from "verified-via-review/UAT."
**How to avoid:** Put AB-5/AB-6/AB-8 manual checks in `16-HUMAN-UAT.md` (Tab-through each radiogroup/tablist with arrow keys; confirm visible focus ring on glass; confirm SR announces autosave). The axe gate is necessary, not sufficient — don't mark FX-04/05/06/13 "done" on a green scan alone.
**Warning signs:** A radiogroup that passes axe but you can't operate with arrow keys = the keyboard nav is still broken (axe didn't catch it).

### Pitfall 4: Amber/white-alpha contrast (FX-07/FX-08) must be measured at the COMPOSITED background, not the token nominal
**What goes wrong:** Bumping `text-white/50`→`/70` by guess and assuming it passes.
**Why it happens:** The text sits on translucent glass (`bg-white/5..20`) over the `#00109E` brand gradient — the *effective* background is a blend, and axe's `color-contrast` rule computes against the composited pixel. A nominal token ratio is meaningless here.
**How to avoid:** Let axe's `color-contrast` violation report drive the exact target node + measured ratio; bump the alpha until axe goes green at that node. Keep the eyebrow size token and apply the bump *consistently* so the treatment stays uniform (UI-SPEC FX-08). Don't change the amber *semantic* (it stays the `em_espera`/warning signal — FX-07).
**Warning signs:** Contrast passes on one screen's amber pill but fails on another with a different glass tint underneath — the composite differs; fix per-node.

### Pitfall 5: The staged `LoginRHPage.tsx` fix does TWO things — verify both in the RH-login round-trip
**What goes wrong:** Committing the staged file and assuming the RH-login race is closed without testing.
**Why it happens (verified diff):** The staged `src/components/pages/LoginRHPage.tsx` change:
1. **Widens the role-ready polling window** from `5 × 20ms = 100ms` to `60 × 50ms = 3s`. Root cause (per the new inline comment): `onAuthStateChange` → `setTimeout(0)` → `hydrateFromSession` **awaits `fetchProfile()` (a `usuarios_rh` round-trip)** before setting `role`; on a cold DB connection that exceeds 100ms, so the old bound raced ahead and **false-rejected a valid admin** (signOut → "sem acesso" → bounced to `/vagas`).
2. **Widens the gate** from `role !== 'administrador'` (admin-only) to `role !== 'administrador' && role !== 'rh'` — so legitimate recrutadores (role `'rh'`) are admitted.
**How to avoid:** The RH-login verification (research focus 5) must confirm **both**: (a) a `recrutador`-backed account logs in and reaches `/rh/dashboard` (not bounced), AND (b) the JWT carries `app_metadata.role ∈ {'rh','administrador'}`. A cold-start login (first login after idle) is the stress case for the 3s window.
**Warning signs:** Admin login works warm but bounces on the first cold login = the 3s window still isn't enough (unlikely, but the failure mode to watch).

## Code Examples

Verified patterns from in-tree sources.

### FX-04 — replace custom `aria-pressed` tabs with Radix `Tabs`
```tsx
// Target: DecisaoFinalPage.tsx:117-150, EntrevistaWorkspace.tsx:117-133
// Source: vendored src/components/ui/tabs.tsx (Radix) — gives tablist/tab/tabpanel + roving focus
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

<Tabs value={active} onValueChange={setActive}>
  <TabsList>
    <TabsTrigger value="consolidacao">Consolidação</TabsTrigger>
    <TabsTrigger value="decisao">Decisão</TabsTrigger>
  </TabsList>
  <TabsContent value="consolidacao"><ConsolidacaoDashboard /></TabsContent>
  <TabsContent value="decisao"><RegistrarDecisaoForm /></TabsContent>
</Tabs>
```

### FX-05 — replace hand-rolled radiogroup with Radix `RadioGroup`
```tsx
// Target: RegistrarDecisaoForm.tsx:95-118 (currently role="radiogroup" + role="radio" buttons,
//         only aria-checked set, NO keyboard nav — verified). Radix gives arrow-key roving focus.
// Source: vendored src/components/ui/radio-group.tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

<RadioGroup value={decisao} onValueChange={setDecisao} aria-label="Decisão"
            className="grid gap-3 sm:grid-cols-3">
  {DECISAO_OPTIONS.map((opt) => (
    <div key={opt.value} className="flex items-center gap-2 min-h-[44px]">
      <RadioGroupItem value={opt.value} id={`decisao-${opt.value}`} />
      <Label htmlFor={`decisao-${opt.value}`} className="text-sm font-semibold">{opt.label}</Label>
    </div>
  ))}
</RadioGroup>
```

### FX-09 — replace native `title=` with Radix `Tooltip`
```tsx
// Target: ProvaCognitivaScreen.tsx:367 (native title= submit-disabled hint — not keyboard/SR-reliable)
// Source: vendored src/components/ui/tooltip.tsx (already used elsewhere in the codebase)
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

<Tooltip>
  <TooltipTrigger asChild>
    {/* a real <button> (or tabIndex={0}) so the trigger is keyboard-focusable */}
    <span><Button disabled={!allAnswered}>Concluir prova</Button></span>
  </TooltipTrigger>
  <TooltipContent>Responda todas as questões para concluir.</TooltipContent>
</Tooltip>
```

### FX-11 — add `aria-valuetext` to existing sliders
```tsx
// Target: EntrevistaScorecardInline.tsx:109-118 (Slider HAS aria-label, LACKS aria-valuetext — verified),
//         RedacaoReviewPanel BARS sliders, config-vaga weight sliders.
// Source: vendored src/components/ui/slider.tsx (Radix). Forward aria-valuetext so SR hears "{n} / 5" / "{n}%".
<Slider
  min={1} max={5} step={1}
  value={[scores[c.key]]}
  onValueChange={(v: number[]) => setDim(c.key, v[0])}
  aria-label={c.label}
  aria-valuetext={`${scores[c.key]} de 5`}   // ← ADD — human-readable readout for SR
/>
// For weight sliders: aria-valuetext={`${pct}%`}
```

### Enum-label one-liner fixes (the only safe tsc enum edits)
```ts
// src/features/vagas/types/vagasTypes.ts
// L581  clinica:  'Clínica',  →  clinico:  'Clínica',     // TS2561 — Departamento union has 'clinico'
// L734  big_five: 'testes',   →  bigfive:  'testes',       // TS2561 — EtapaProcesso uses 'bigfive'
// L569  tempo_integral: ...   →  DO NOT one-line: TIPO_VAGA_LABELS map is stale vs TipoVaga='CLT'|'PJ' (decision, defer/escalate)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Native `title=` for hints/tooltips | Radix `Tooltip` (focus-triggerable + `aria-describedby`) | shadcn/Radix era (already project norm — Phase 15 used Radix Tooltip not `title=`) | FX-09 native `title` is the last holdout; replace |
| Hand-rolled `role="radio"`/`aria-pressed` widgets | Radix `RadioGroup`/`Tabs` (keyboard nav for free) | Vendored primitives already present | FX-04/05/06 hand-rolls are the defects |
| `@axe-core/playwright` `toEqual([])` zero-any-impact | severity-filtered `serious|critical` gate for incremental hardening | Deque guidance — gate on severity from day one | Lets `moderate`/`minor` stay advisory while blocking real defects (UI-SPEC §2) |

**Deprecated/outdated:**
- Native HTML `title` attribute as an accessibility affordance — not reliably keyboard/SR reachable; FX-09.
- The `reference_auth_hook_rls_gap` memory's "still NOT migrated" note — **superseded**: the RLS+grant+hook chain is PROD-verified complete as of 2026-06-26 (CONTEXT.md). The only residual is the frontend race (the staged LoginRHPage fix).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Mocking only `**/auth/v1/token**` + per-screen `**/rest/v1/<table>**` reads is enough for every Tier-A screen to render its shell past `RoleGuard`. Some HIGH-risk screens (R5 redação, R6 entrevista, R7 decisão, C5 bigfive) read live `scores_candidato`/seeded candidatura that may be hard to mock faithfully. | Validation Arch / Pattern 1 | Those screens fall back to Tier-B (`E2E_REAL_LOGIN`) instead of the unconditional gate — fewer screens in the blocking CI gate than the nominal 16. Planner should expect a Tier-A subset + Tier-B remainder, not all-16-in-CI. |
| A2 | The 3 polish one-liners (FX-01/02/03) and the enum fixes (`clinica`, `big_five`) do not cascade new tsc errors. | tsc / Pitfall 1 | A cascade means the value was load-bearing → revert + defer that one. Low risk for the 2 confirmed enum typos; verified self-contained. |
| A3 | No Edge Function is touched by any a11y/tsc fix, so no EF redeploy is needed (avoids the `_shared` bundle-freeze + `.join("npm:")` import-bug classes from memory). | Runtime State Inventory | If a fix reaches into a `supabase/functions/**` file, the EF redeploy + import-bug caveats re-apply. Grep-confirm FX targets are all under `src/`. |
| A4 | The `e2e` CI job's `npm run dev` webServer + chromium can render all Tier-A screens headlessly within the 60s per-test timeout. | Validation Arch | A heavy screen (C5 BigFive 120 Likert items) may approach the timeout; may need per-test timeout bump or item virtualization awareness. |
| A5 | Tier-B RH-login verification needs a real `recrutador`/`administrador` account in PROD (the candidate `TEST_USER` is candidato-role). | RH-login verification | If no RH test account exists, the live RH round-trip can't run automated — falls to manual UAT (Fernando logs in). |

**If this table is empty:** it is not — A1 and A5 are the load-bearing ones for the planner.

## Open Questions

1. **Which of the 16 screens render faithfully under a mocked session (Tier-A) vs need real login (Tier-B)?**
   - What we know: R1 (login form), R2 (vaga config), R3/R4 (tables), C1 (form), C2/C9 (hub/transparency) likely mock cleanly. R5/R6/R7/C5 read live scores/seeded etapa state.
   - What's unclear: exact mock surface for the score-driven screens.
   - Recommendation: planner spikes one HIGH-risk screen (R7 `DecisaoFinalPage`) first; if the mock is tractable it's Tier-A, else Tier-B. Default the score-driven four to Tier-B + manual UAT to keep CI green.

2. **Does a real RH (`recrutador`) test account exist in PROD for the live login verify?**
   - What we know: `TEST_USER` (`fernando@beautysmile.com.br`) is candidato-role; the existing `login()` helpers assert `/\/candidato/`.
   - Recommendation: the RH verify is a HUMAN-UAT step (Fernando logs into `/auth/login-rh` with a real RH account, confirms `/rh/dashboard` + inspects the JWT `app_metadata.role` via devtools/`extractRole`). Provide an env-gated Tier-B RH login spec as the automated companion if an account is available.

3. **What is the post-burn-down tsc baseline number for the CI gate?**
   - What we know: gate is zero-growth above the frozen baseline (`ci.yml` currently says 292; live count ~291).
   - Recommendation: after the FX-14 console removals + TS6133 + 2 enum fixes, re-measure and **lower the `ci.yml` baseline** to the new count (so the gate tightens, not stays loose).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@axe-core/playwright` | Tier-A/B axe scans | ✓ | 4.11.3 | — |
| `axe-core` engine | axe rule set | ✓ | 4.11.4 | — |
| `@playwright/test` + chromium | e2e harness + CI | ✓ | 1.56.1 | — |
| Vendored Radix primitives (`radio-group`, `tabs`, `tooltip`, `slider`) | FX semantic fixes | ✓ | in `src/components/ui/` | — |
| Real RH PROD account | Live RH-login verify | ✗ (unconfirmed) | — | Manual UAT by Fernando (he has RH access) |
| Supabase MCP `apply_migration` | (not needed) | — | — | n/a — no migration this phase |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** real RH account → manual UAT (Fernando logs in).

## Validation Architecture

> nyquist_validation is enabled (not `false` in config). This section drives `16-VALIDATION.md`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright `@playwright/test` 1.56.1 (e2e, chromium) + Vitest (unit, for cleanups/tsc) |
| Config file | `playwright.config.ts` (chromium project, `baseURL :3003`, `webServer: npm run dev`) |
| Quick run command | `npx playwright test e2e/a11y.spec.ts --project=chromium` |
| Full suite command | `npx playwright test --project=chromium` (CI `e2e` job) + `npm run test:run` (Vitest) + `npm run -s lint` (tsc baseline gate) |

### Requirements / Fixes → Test Map
| Req / Fix | Behavior | Test Type | Automated Command | Layer |
|-----------|----------|-----------|-------------------|-------|
| LGPD-05 / axe ≥90 | Each Tier-A main M2 screen: zero serious/critical axe violations | a11y (axe) | `npx playwright test e2e/a11y.spec.ts --project=chromium` | **Tier-A (unconditional CI gate)** |
| FX-01/02/03 | Polish one-liners (accent leak, weight token, H1 token) | a11y + visual review | covered by the screen's axe scan (contrast/no-regression) + UI review | Tier-A + review |
| FX-04 | Tabs are `tablist`/`tab`/`tabpanel` (AB-3) | a11y (axe `aria-required-children`) | a11y.spec Tier-A on R6/R7 | Tier-A |
| FX-05/06 | Radiogroup name/role/state (AB-2/AB-3) | a11y (axe) for semantics | a11y.spec Tier-A on R7/C3/C5 | Tier-A |
| FX-05/06 | Radiogroup arrow-key roving focus (AB-5) | **manual keyboard** | — (axe cannot model) | **Tier-B / HUMAN-UAT** |
| FX-07/08 | Amber + white-alpha contrast ≥4.5:1 at composite (AB-1) | a11y (axe `color-contrast`) | a11y.spec Tier-A on R6/R7/R8 | Tier-A |
| FX-09 | No native `title=`; Radix Tooltip focus-reachable (AB-5/AB-7) | a11y (axe `button-name`) + manual focus | a11y.spec Tier-A on C8 + manual | Tier-A + UAT |
| FX-10 | Tooltip trigger keyboard-focusable + `aria-describedby` (AB-5) | manual keyboard | — | Tier-B / HUMAN-UAT |
| FX-11 | Sliders expose `aria-valuetext` (AB-2/AB-8) | a11y (axe `aria-valid-attr-value`) + manual SR | a11y.spec Tier-A on R6 + manual | Tier-A + UAT |
| FX-12 | Dead Agendar CTA disabled + named (AB-5) | a11y + manual | a11y.spec Tier-A on R6 | Tier-A |
| FX-13 | Autosave status announced via `aria-live` (AB-8) | **manual SR** | — (axe under-tests live regions) | **Tier-B / HUMAN-UAT** |
| FX-14 | Zero `console.*` on RH-path | unit (grep guard) | extend the existing `pitfall7.grep` / forbidden-strings test, or a new grep test | Vitest |
| FX-15 | `biasMath` dead functions removed, build green | unit + build | `npm run build` + `npm run test:run` | Vitest/build |
| FOUND-08 | tsc count does not rise (and ideally drops) | type-check gate | `npm run -s lint` count ≤ baseline | CI `unit` job |
| Auth (LoginRHPage) | Staged race fix committed; RH login reaches `/rh/dashboard` with role in JWT | e2e (env-gated) + UAT | `E2E_REAL_LOGIN=1 npx playwright test` (RH variant) + manual | **Tier-B / HUMAN-UAT** |

### Sampling Rate
- **Per task commit:** `npx playwright test e2e/a11y.spec.ts --project=chromium` (the screen(s) touched) + `npm run -s lint` (tsc no-growth).
- **Per wave merge:** full `npx playwright test --project=chromium` + `npm run test:run` + `npm run build`.
- **Phase gate:** Tier-A axe gate green (zero serious/critical on all in-scope mockable screens) + tsc baseline not risen (ideally lowered + `ci.yml` updated) + RH-login UAT PASS, before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `e2e/a11y.spec.ts` — **extend** (do NOT create a parallel file) with the Tier-A main-M2 loop + `mockSession(page, role)` helper (candidate + rh fixtures). RED until FX fixes land — the failing axe assertions ARE the contract.
- [ ] `e2e/a11y.spec.ts` — Tier-B `E2E_REAL_LOGIN` block for score-driven screens (skip-with-reason in CI).
- [ ] RH-login Tier-B spec (env-gated) OR a `16-HUMAN-UAT.md` runbook step for the live RH round-trip + JWT role inspection.
- [ ] FX-14 grep guard — extend the existing forbidden-strings/`pitfall7.grep` mechanism to assert zero `console.*` on the RH-path files (`PerfilCandidatoRHPage.tsx`, `SuporteRHPage.tsx`, + the decisao/entrevista/triagem features).
- [ ] `16-HUMAN-UAT.md` — manual AB-5/AB-6/AB-8 checks (arrow-key radiogroup/tablist nav, visible focus on glass, SR autosave announce) + the RH-login round-trip.
- Framework install: **none** — all present.

## Security Domain

> `security_enforcement` not set to `false` → included. Phase 16 is a11y/quality hardening with **no new data flows, no new endpoints, no new packages** — the security surface is minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (verify-only) | RH-login: `custom_access_token_hook` + `usuarios_rh` RLS — **already PROD-verified**; LoginRHPage gate widened to `{rh, administrador}`. No new auth code beyond the staged race fix. |
| V3 Session Management | yes (verify-only) | JWT role hydration race (the LoginRHPage fix). Confirm role lands before the gate decides. |
| V4 Access Control | yes | `RoleGuard` is UX defense-in-depth; real authz is RLS (unchanged). A11y mocks use a fake (non-verifiable) JWT **in tests only** — never a real-secret path; supabase-js doesn't re-verify client-side, so the mock is test-local and safe. |
| V5 Input Validation | no | No new inputs/forms; hardening existing surfaces only. |
| V6 Cryptography | no | No crypto touched. Test `makeJwt` is intentionally unsigned (test-only). |
| V7 Errors & Logging | yes | FX-14 removes debug `console.*` on the RH-path — reduces incidental log exposure (aligns with the project's Pitfall-7 redaction discipline). |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Test `makeJwt` mock leaking into a production path | Spoofing | Mock lives only in `e2e/*.spec.ts` (test-local `page.route`); never imported by `src/`. supabase-js client-side never re-verifies, but RLS (server) is the real gate — unchanged. |
| Debug `console.*` leaking PII on RH path | Information Disclosure | FX-14 removal + the existing forbidden-strings/Pitfall-7 grep guard. |
| Widened LoginRHPage gate (`admin`→`{rh,admin}`) over-admitting | Elevation of Privilege | The gate is UX-only; server RLS still scopes every RH read by `usuarios_rh` membership + vaga ownership (Phase 15 WR-03). Widening the *client* gate cannot grant data access the RLS doesn't already permit. Verify in the RH-login UAT. |

## Sources

### Primary (HIGH confidence)
- In-tree files (read this session): `e2e/a11y.spec.ts`, `playwright.config.ts`, `e2e/perfil.spec.ts`, `e2e/prova-cognitiva.spec.ts`, `e2e/explicacao-flow.spec.ts`, `src/components/RoleGuard.tsx`, `src/features/vagas/types/vagasTypes.ts`, `src/features/decisao/components/RegistrarDecisaoForm.tsx`, `src/features/entrevista/components/EntrevistaScorecardInline.tsx`, `.github/workflows/ci.yml`, `git diff src/components/pages/LoginRHPage.tsx`.
- `node_modules` version probes: `@axe-core/playwright@4.11.3`, `axe-core@4.11.4`, `@playwright/test@1.56.1` (package.json `^1.56.1`).
- `npm run -s lint` live tsc error histogram (this session).
- CONTEXT.md + UI-SPEC.md (the locked scope + acceptance contract).

### Secondary (MEDIUM confidence)
- Deque `@axe-core/playwright` severity-filter best practice (`results.violations.filter(v => v.impact === 'serious'||'critical')`) — cross-confirmed against the UI-SPEC §4a pattern and Playwright a11y docs.

### Tertiary (LOW confidence)
- (none load-bearing — all key claims verified in-tree.)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps + primitives verified installed in node_modules / `src/components/ui/`.
- Architecture (CI gate): HIGH — mirrors the existing `a11y.spec.ts` + `perfil.spec.ts` + CI `e2e` job exactly.
- Fix idioms (FX-01..15): HIGH — every target verified at `file:line`; primitives confirmed present.
- tsc burn-down scope: HIGH — live histogram inspected; trivial vs structural split confirmed.
- RH-login: HIGH — staged diff inspected; PROD chain pre-verified per CONTEXT.
- Tier-A vs Tier-B screen split: MEDIUM — exact mock surface for score-driven screens (A1/Open-Q1) needs a spike.

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (stable — vendored tooling, no fast-moving deps)
