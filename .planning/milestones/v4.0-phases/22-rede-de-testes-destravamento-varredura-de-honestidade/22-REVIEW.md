---
phase: 22-rede-de-testes-destravamento-varredura-de-honestidade
reviewed: 2026-07-05T00:00:00Z
depth: deep
files_reviewed: 31
files_reviewed_list:
  - .github/workflows/ci.yml
  - tsconfig.json
  - package.json
  - package-lock.json
  - .env.test.example
  - supabase/functions/deno.json
  - src/components/pages/LandingPage.tsx
  - src/components/pages/LoginCandidatoPage.tsx
  - src/components/pages/LoginRHPage.tsx
  - src/features/auth/utils/resolveRedirect.ts
  - src/features/auth/utils/index.ts
  - src/components/pages/CadastroPage.tsx
  - src/features/cadastro/components/CadastroMultiStepForm.tsx
  - src/assets/images/backgrounds.ts
  - supabase/functions/gerar-devolutiva-bigfive/index.ts
  - src/__tests__/guards/forbidden-strings.grep.test.ts
  - src/__tests__/guards/no-hardcoded-test-creds.grep.test.ts
  - src/features/auth/utils/__tests__/resolveRedirect.test.ts
  - src/components/pages/__tests__/LoginCandidatoPage.test.tsx
  - supabase/functions/_shared/__tests__/ai-client.test.ts
  - e2e/README.md
  - e2e/auth-hydration.spec.ts
  - e2e/candidatura-submit.spec.ts
  - e2e/explicacao-flow.spec.ts
  - e2e/fixtures/a11y-session.ts
  - e2e/login-flow.spec.ts
  - e2e/navegacao.spec.ts
  - e2e/password-recovery-flow.spec.ts
  - e2e/perfil.spec.ts
  - e2e/prova-cognitiva.spec.ts
  - e2e/vagas-browse.spec.ts
findings:
  critical: 1
  warning: 3
  info: 4
  total: 8
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-07-05
**Depth:** deep
**Files Reviewed:** 31
**Status:** issues_found

## Summary

Phase 22 delivers a genuinely well-executed hardening pass. I independently reproduced every headline claim rather than trusting the SUMMARYs:

- `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` → **148 passed / 0 failed**, matching the plan's claim exactly. `strict-schema.test.ts` is correctly excluded from the Deno run and still passes green under Vitest (7/7).
- `npm run -s lint 2>&1 | grep -c "error TS"` → **133**, exact match to the pinned `ci.yml` gate. `TS2307` = 0, `TS2304 'Deno'` leaks = 0. The gate math (`-gt 133`, no `continue-on-error` on `deno-test`) is a real red-on-growth gate, not a cosmetic one.
- `npm run test:run` → **721 passed (83 files)** on vitest 4.1.9 / happy-dom 20.10.6 — the version bumps did not silently break anything.
- `npm audit --json` → vitest / `@vitest/ui` / happy-dom no longer appear at all (previously CRITICAL/HIGH).
- `npm run build` → succeeds (only the pre-existing, out-of-scope chunk-size warning).
- Dead deps (`motion`, `@supabase/auth-helpers-react`) are fully gone from `package.json`/lockfile with zero remaining import sites; no `"*"` wildcards remain.
- The `resolveRedirect` extraction is byte-identical to the pre-existing implementation (diffed against `dab9bac`), and the `psicólogo(a)` fragment-join in `gerar-devolutiva-bigfive` produces a byte-identical runtime string to the original literal.
- `!isValid` was correctly dropped from both `formState` destructures and both `disabled` expressions, with no dangling `TS6133`, and `EsqueciSenhaPage`/`RedefinirSenhaPage` were correctly left untouched.
- All hardcoded e2e credentials were correctly replaced with env-reads that are only ever dereferenced inside `describeRealAuth`/`test.skip(...)`-gated blocks; `.env.test` stays gitignored and untouched.

Two real defects survived this otherwise careful execution, one of them squarely in the security-sensitive `resolveRedirect` guard that this phase promotes to "the single source of truth" and expands to a second consumer.

## Critical Issues

### CR-01: `resolveRedirect` does not reject backslash/control-character open-redirect bypasses, and this phase both formalizes it as the app's one security boundary and widens its blast radius

**File:** `src/features/auth/utils/resolveRedirect.ts:23-34` (consumed by `src/components/pages/LoginCandidatoPage.tsx:117`, `src/components/pages/LoginCandidatoPage.tsx:487`, `src/components/pages/CadastroPage.tsx:32`, `src/features/cadastro/components/CadastroMultiStepForm.tsx:459`)

**Issue:**
The guard only checks two things:
```ts
if (raw.startsWith('//')) return fallback
if (!raw.startsWith('/')) return fallback
```
This misses the well-documented CWE-601 bypass class where the browser's own WHATWG URL parser treats a backslash (`\`) — or a stripped tab/newline — as equivalent to `/` for "special" schemes (`http`/`https`), turning a string that looks root-anchored into a protocol-relative one. I verified this is real, not theoretical, using Node's `URL` (which implements the same spec the browser does):

```
"/\evil.com"   => https://evil.com/   origin=https://evil.com
"/\\evil.com"  => https://evil.com/   origin=https://evil.com
"/\t/evil.com" => https://evil.com/   origin=https://evil.com   (raw tab char)
```
An attacker link `?redirect=%2F%5Cevil.com` (or `%2F%09%2Fevil.com`) decodes via `URLSearchParams.get()` to exactly `/\evil.com` / `/\t/evil.com`, both of which pass `resolveRedirect` unchanged (they start with `/`, not `//`).

I also verified the practical in-app consequence with `happy-dom`'s `history.pushState` (which implements the same-origin `pushState` check from the HTML spec): calling `navigate('/\\evil.com', { replace: true })` throws a `DOMException` ("cannot be created in a document with origin ... and URL ...") rather than actually navigating cross-origin. So today, thanks to react-router ultimately delegating to the native `history.pushState`, the *practical* impact is not a full open-redirect exfiltration — it is an uncaught-looking `DOMException` that gets swallowed by the generic `catch` in `LoginCandidatoPage.onSubmit` (and in `CadastroMultiStepForm.handleFormSubmit`), surfacing as a confusing "Erro inesperado. Tente novamente." toast **after the user has already been authenticated / after the account was already created** — i.e., a real, reproducible broken-flow bug for anyone who clicks such a crafted link, even though it stops short of redirecting to the attacker's origin.

This matters more, not less, because of what this phase did: the function's own doc comment now says it is *"the SINGLE source of truth for validating a redirect target before any client-side navigation"* and it gained a brand-new unit-test file (`resolveRedirect.test.ts`) plus a second real consumer (`CadastroPage` → `CadastroMultiStepForm`) this phase. The new tests assert `//evil.com`, `https://evil.com`, and non-root paths are rejected, but none of the added tests exercise the backslash/control-character class — so the "single source of truth" claim is not actually backed by test coverage against the most common real-world bypass technique for exactly this kind of prefix-based check. Relying on the browser's incidental `pushState` same-origin enforcement as the actual security boundary (instead of the function that is documented and tested as the boundary) is fragile: it silently stops protecting the moment any code path uses the resolved value with `window.location.href =`, an `<a href>`, or a full-page redirect instead of `useNavigate()`.

**Fix:**
Replace the prefix checks with real URL parsing + origin comparison, which naturally absorbs backslash/control-character normalization because it uses the same algorithm the browser uses:
```ts
export function resolveRedirect(
  raw: string | null | undefined,
  fallback = '/candidato/dashboard'
): string {
  if (!raw) return fallback
  try {
    const resolved = new URL(raw, window.location.origin)
    if (resolved.origin !== window.location.origin) return fallback
    return resolved.pathname + resolved.search + resolved.hash
  } catch {
    return fallback
  }
}
```
Add regression tests for `'/\\evil.com'`, `'/\\\\evil.com'`, `'/%09/evil.com'`-decoded-equivalent (`'/\t/evil.com'`), and any other control-character variant, alongside the existing `//evil.com` / `https://evil.com` cases.

## Warnings

### WR-01: Clearing `candidatura_vaga_id` on every successful candidate login can wipe the vaga context before it is ever consumed, specifically on the auto-login-failure fallback path

**File:** `src/components/pages/LoginCandidatoPage.tsx:112` (interacts with `src/components/pages/CadastroPage.tsx:38` and `src/features/cadastro/components/CadastroMultiStepForm.tsx:460-463`)

**Issue:**
`localStorage.removeItem('candidatura_vaga_id')` now runs unconditionally on every successful login through `LoginCandidatoPage`. I traced the one real producer/consumer pair of this key:
- Written by `CadastroPage.tsx:38` from `?vagaId` (reachable today only via a direct/external link to `/cadastro?vagaId=<id>` — nothing in the SPA's own navigation graph links there, confirmed by repo-wide grep).
- Read by `InstrucoesFormularioPage.tsx:15` as a fallback when no `?vagaId` query param is present (and nothing in the SPA's navigation graph links to `/candidato/candidatura/instrucoes` either — same grep).

The one coded-for path that actually routes back through `LoginCandidatoPage` while this key is still meaningful is `CadastroMultiStepForm.handleFormSubmit`'s `tryAutoLogin` failure branch (`CadastroMultiStepForm.tsx:460-463`): when the post-signup auto-login fails (a real, retried-once-then-give-up path, not hypothetical — see `authService.ts` `tryAutoLogin` doc: "Retorna `false` se ambas falharem"), the user is bounced to `/auth/login?email=...` **without** `?vagaId` or `?redirect`. If they then log in manually via `LoginCandidatoPage`, the new `removeItem` fires immediately on that login — before the user has any chance to reach `InstrucoesFormularioPage` and consume the value. Previously the key would have persisted indefinitely (the "orphan" the phase set out to fix), so a user could still recover it via a later visit; now the first ordinary login after a failed auto-login silently deletes the association, and any subsequent attempt to start the candidatura from that stale vaga context falls back to the hardcoded `vagaId='1'` in `InstrucoesFormularioPage.tsx:28-29`.

The practical exposure is narrowed by the fact that both the write path (`/cadastro?vagaId=`) and the read path (`/candidato/candidatura/instrucoes`) are already unreachable via any in-app `navigate()`/`<Link>` call today (only reachable via an external link or manual URL entry) — so this is a real but narrow regression, not a mainstream one.

**Fix:** Either (a) only clear the key when it is not needed for an in-flight candidatura resume (e.g., clear it from within the cadastro auto-login success path instead of from the generic login page), or (b) don't rely on localStorage survival at all — thread the `vagaId` through the same `?redirect`/`?email` query param mechanism used elsewhere in this phase so the auto-login-failure bounce doesn't lose it, and only clear the orphan key once it has actually been consumed by `InstrucoesFormularioPage` (i.e., move the `removeItem` next to the `getItem` rather than to login).

### WR-02: Fragment-joining the "psicólogo(a)" literal to evade the LGPD-04 compliance guard weakens that guard's value as an audit control

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:190-198`

**Issue:** `const _PSI = ["psicól", "ogo(a)"].join("")` exists purely so the literal string "psicólogo" never appears contiguously in the source, specifically to avoid tripping `forbidden-strings.grep.test.ts`'s `psic[oó]logo` alternation. I confirmed the runtime string is byte-identical to the original ("Conteúdo revisado por psicólogo(a) responsável.") — no user-visible change, no logic bug. But the underlying pattern (already established for `_NEG` before this phase, and now extended) is a code-smell with real audit-tooling consequences: the forbidden-strings guard exists specifically as an automated LGPD-04/RNF-12 compliance scanner over `src/` + `supabase/functions/`. Deliberately splitting a banned literal across string-concatenation fragments so the scanner can't see it defeats the scanner's actual purpose — an auditor (or a future author who copies this pattern to hide something that is *not* a compliant, negated disclaimer) gets a false "green" from the one automated control that is supposed to catch exactly this. The guard has no mechanism to distinguish "legitimately compliant professional-disclaimer text, hidden from the scanner on purpose" from "actually non-compliant text, hidden from the scanner on purpose" — it can't, by construction, once literals are allowed to be split like this.

**Fix:** Prefer making the guard context-aware for the one legitimate exception (a professional-review attribution, as opposed to clinical/psychometric framing of the assessment itself) — e.g., an explicit allow-list line/file exemption with a code comment pointing at the guard, mirroring the `isExemptDevolutivaLine` negated-disclaimer pattern already used elsewhere in the same guard file — rather than obfuscating the literal. If the fragment-join approach is kept, at minimum add a lint comment convention (e.g. `// lgpd-04-fragment-join: <reason>`) that a future audit can grep for, so obfuscated-but-compliant strings stay distinguishable from an actual regression hidden the same way.

### WR-03: `?redirect` guard call is duplicated across `CadastroPage` and `CadastroMultiStepForm` with no behavioral difference, making the security-relevant guarding harder to audit

**File:** `src/components/pages/CadastroPage.tsx:32` and `src/features/cadastro/components/CadastroMultiStepForm.tsx:459`

**Issue:** `CadastroPage` already fully resolves the redirect target (`resolveRedirect(searchParams.get('redirect'))`, always a non-empty, already-safe string) before handing it to `CadastroMultiStepForm` as `redirectTo`. `CadastroMultiStepForm` then calls `resolveRedirect(redirectTo)` again before navigating. This is harmless today (re-resolving an already-resolved value is idempotent), but it means the "guard the raw param" invariant that Plan 22-03's acceptance criteria explicitly asks for ("no raw `searchParams.get('redirect')` passed to `navigate`") is satisfied by two independent call sites rather than one, which is exactly the kind of duplicated security-sensitive logic this phase's own `resolveRedirect` extraction was trying to eliminate (per the CI-06 dedup lesson cited in the plan). A future edit to `CadastroPage` that forgets to pre-resolve (e.g., someone passes `searchParams.get('redirect')` directly to `redirectTo`) would silently still be "safe" only because `CadastroMultiStepForm` happens to re-guard — but nothing enforces that invariant or documents that the second call is the one load-bearing guard.

**Fix:** Pick one owner for the guard. Either have `CadastroPage` pass the raw `searchParams.get('redirect')` through untouched and let `CadastroMultiStepForm` be the sole `resolveRedirect` call site (matching the "CadastroMultiStepForm re-guards on consumption" comment already in the code), or have `CadastroMultiStepForm` trust its `redirectTo` prop as pre-resolved and drop the second call — not both.

## Info

### IN-01: Stale module doc-headers on the two files most changed by this phase

**File:** `src/components/pages/LoginCandidatoPage.tsx:2`, `src/components/pages/LoginRHPage.tsx:2`
**Issue:** Both files still open with `Phase 3 Wave 4 (Plan 03-05)` as their attribution comment, despite substantial Phase 22 edits (button-enablement, redirect propagation, orphan cleanup). Not incorrect, just stale provenance that will mislead a future reader trying to find "when was this last touched."
**Fix:** Append a one-line `Phase 22 / Plan 22-03: …` note near the top doc-comment, consistent with how `resolveRedirect.ts` and `CadastroMultiStepForm.tsx` already attribute their Phase-22 edits inline.

### IN-02: Inconsistent import path for `resolveRedirect` across its own consumers

**File:** `src/components/pages/LoginCandidatoPage.tsx:51`, `src/components/pages/CadastroPage.tsx:5`, `src/features/cadastro/components/CadastroMultiStepForm.tsx:55` vs. `src/features/auth/utils/index.ts:9`
**Issue:** All three consumers import `resolveRedirect` from the direct module path (`@/features/auth/utils/resolveRedirect`) rather than the barrel (`@/features/auth/utils`), even though the barrel re-exports it and `LoginCandidatoPage` imports its sibling `waitForCandidatoHydrated` from that same barrel one line above. Harmless, but an inconsistent import convention within a single file.
**Fix:** Pick one: either import `resolveRedirect` from the barrel everywhere (consistent with `waitForCandidatoHydrated`), or drop the barrel re-export if the direct path is preferred.

### IN-03: Exact-pinning the 8 previously-wildcard deps removes automatic patch-level updates going forward

**File:** `package.json` (`@tiptap/*`, `clsx`, `react-dnd`, `react-dnd-html5-backend`, `tailwind-merge`)
**Issue:** This was an explicit, documented CI-09 decision ("teto de versão, zero mudança de comportamento") and is correctly implemented — but exact pins (no `^`) mean these packages will never receive even patch-level security fixes via routine `npm install` again; someone has to remember to bump them manually.
**Fix:** No action required for this phase, but consider wiring these into whatever periodic dependency-review process (Dependabot/Renovate or a manual quarterly pass) the project already uses, so the new ceiling doesn't quietly become permanent staleness.

### IN-04: Historical hardcoded real test credentials remain in `docs/`, outside the new CI-08 guard's scan scope

**File:** `docs/TASK_10_COMPLETED.md`, `docs/testing/TEST_REPORT_TASK_13.md`, `docs/testing/PRD-2-LOGIN-TEST-CHECKLIST.md`
**Issue:** These pre-existing files (untouched by this phase's diff, confirmed via `git diff --stat dab9bac..HEAD -- docs/` returning nothing) still contain `fernando@beautysmile.com.br` / `teste123` in prose/checklists. The new `no-hardcoded-test-creds.grep.test.ts` guard deliberately scopes `SCAN_ROOTS = ['e2e']` only (matching this phase's stated CI-08 scope), so these are not caught and not a regression introduced by Phase 22 — but CLAUDE.md's "no secrets in git" hard rule technically still applies to `docs/`.
**Fix:** Out of scope for this phase; flag for a future documentation-hygiene pass (or widen the guard's `SCAN_ROOTS` to include `docs/` with an appropriate exemption list, mirroring how `forbidden-strings.grep.test.ts` deliberately excludes `docs/`/`.planning/` for a different reason).

---

_Reviewed: 2026-07-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
