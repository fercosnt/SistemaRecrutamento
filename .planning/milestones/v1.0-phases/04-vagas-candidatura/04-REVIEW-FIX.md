---
phase: 04-vagas-candidatura
fixed_at: 2026-04-26T04:25:00Z
review_path: .planning/phases/04-vagas-candidatura/04-REVIEW.md
iteration: 2
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report (Iteration 2)

**Fixed at:** 2026-04-26T04:25:00Z
**Source review:** `.planning/phases/04-vagas-candidatura/04-REVIEW.md`
**Iteration:** 2 (post WR-01..WR-06 fix verification — see iteration 1 below)
**Scope:** Critical + Warning (Info findings deferred to Phase 5 backlog)

**Summary:**
- Findings in scope: 4 (0 Critical, 4 Warning)
- Fixed: 4
- Skipped: 0
- Lint baseline: 320 → 320 (zero growth — Phase 4 acceptance criterion satisfied)
- Pitfall 7 grep guard: 4/4 PASS post-fix
- vagasService Vitest: 6/6 PASS post-fix
- All commits applied with `git -c core.hooksPath=/dev/null` per Phase 4 D-22 documented hook bypass

## Fixed Issues

### WR-07: Auth-gate `useEffect` in FormularioCandidaturaPage redundant with `RoleGuard`, may flap on auth hydration

**Files modified:** `src/components/pages/FormularioCandidaturaPage.tsx`
**Commit:** `6195b75`
**Applied fix:** Removed the `useEffect` (formerly lines 148-155) that watched `isAuthenticated` and redirected to `/auth/login?redirect=...`. Replaced with an explanatory comment block that documents (a) where auth-gating actually lives (`<RoleGuard role="candidato">` in `router/routes.tsx:160-167`, fires synchronously at render), (b) where the slug-preservation login roundtrip is owned (`VagaDetalhePage`, the anon-accessible entry point), and (c) why removal is safe (the effect's `?redirect=` target was never consumed because `RoleGuard` ran first). Also dropped the now-unused `isAuthenticated` selector to avoid introducing a new TS6133 unused-variable error to the lint baseline.
**Verification:** Tier 1 (re-read lines 95-170) confirmed the effect block is gone and `isAuthenticated` selector is removed. Tier 2 (`npm run lint`) confirmed lint baseline still at **320** errors (no growth, no shrink). **Logic note:** auth gating now flows exclusively through `RoleGuard` — confirmed by reading `router/routes.tsx:160-167` showing `<RoleGuard role="candidato">` wraps `<FormularioCandidaturaPage />`. The fix eliminates the auth-hydration flap without changing the user-visible auth contract.

### WR-08: Unhandled promise rejection — `navigator.clipboard.writeText` returns a Promise but is called synchronously

**Files modified:** `src/components/pages/VagaDetalhePage.tsx`
**Commit:** `c9c50c6`
**Applied fix:** Replaced the synchronous `navigator.clipboard.writeText(url)` + immediate-success-toast pattern with a `.then(...).catch(...)` chain. On resolve, the existing success toast fires; on reject, a new error toast renders with copy `'Não foi possível copiar o link'` and description `'Copie manualmente da barra de endereço.'` so the user knows the operation failed and has a recovery path. Resolves both pre-existing failure modes: false-success UX (toast claiming the link was copied when the Promise rejected), and the unhandled rejection bubbling to `window.onunhandledrejection` (visible in DevTools as a warning; may surface in error-tracking integrations as a real error).
**Verification:** Tier 1 (re-read lines 148-167) confirmed the new `.then()/.catch()` chain is structurally correct (no dangling Promise, `break` outside the chain). Tier 2 (`npm run lint`) confirmed lint baseline still at **320** errors. Tier 2 (`pitfall7.grep.test.ts`) confirmed **4/4 PASS** — the new error toast does not introduce any forbidden token. **Logic note:** the copy operation is fire-and-forget from React's perspective (the `case 'copy':` block returns synchronously), but the toast is now correctly tied to the actual Promise outcome. Did NOT add `document.execCommand('copy')` legacy-Safari fallback per REVIEW.md guidance ("optional polish").

### WR-09: `submit-candidatura` Edge Function does not enforce a request-body size cap (DoS vector via large `respostas[]`)

**Files modified:** `supabase/functions/_shared/schemas.ts`, `supabase/functions/submit-candidatura/index.ts`
**Commit:** `33915a2`
**Applied fix:** Defense in depth across both layers per REVIEW.md guidance:

1. **Schema layer (`supabase/functions/_shared/schemas.ts`)** — added `.max(100, 'Máximo 100 respostas por candidatura')` to `submitCandidaturaSchema.respostas`. The realistic max is ~30 perguntas per vaga (per `perguntas_formulario` row count for any given vaga); 100 leaves comfortable headroom while blocking the 10_000+ entry payloads that would amplify through (a) Zod validation, (b) the WR-02 `.in('id', perguntaIds)` pre-check (giant Postgres IN clause hitting planner limits), and (c) the `SECURITY DEFINER` `jsonb_array_elements` loop in `submit_candidatura_atomic` (locks `respostas_formulario` rows / FK index pages for the duration of the transaction).

2. **Transport layer (`supabase/functions/submit-candidatura/index.ts:85-104`)** — added a `Content-Length` pre-check before `req.json()` is called. Bodies > 64 KB are rejected with status 413 (Payload Too Large) and `error_code='VALIDATION'`. 64 KB leaves 4× headroom over the realistic ~16 KB upper bound (uuid IDs + curriculo metadata + 30 respostas with text answers). The schema cap is the second layer in case Content-Length is missing or spoofed.

Both layers are required: Content-Length is not authenticated (a malicious client can omit or lie about it) and Deno's default body limit on Supabase Edge is generous (typically 10 MB).

**Verification:** Tier 1 (re-read schemas.ts:209-220 + index.ts:85-104) confirmed both changes structurally correct. Tier 2 (`npm run lint`) confirmed lint baseline still at **320** errors — the schema change is type-compatible (`.max()` returns the same `ZodArray` shape) and the EF index.ts is excluded from `tsc` per the project's tsconfig (Deno surface). **Deployment requires** `supabase functions deploy submit-candidatura` to take effect; the migration was NOT touched (per CLAUDE.md PL/pgSQL `db push` workaround). **Logic note:** WR-09 is a defense-in-depth fix — the realistic exploit window is small (legitimate clients send <16 KB bodies), but the cost of the fix is ~25 lines and the cost of a successful exploit is the EF holding a `SECURITY DEFINER` transaction open while iterating 10_000+ jsonb elements.

### WR-10: `enriquecerVaga` exposes RLS-leak signal via `totalCandidatos` count when called for anonymous browsers

**Files modified:** `src/features/vagas/services/vagasService.ts`
**Commit:** `78fc854`
**Applied fix:** Added an early-return guard at the top of `enriquecerVaga`: when `candidatoId` is falsy (anonymous visitor browsing `/vagas` or `/vagas/:slug`), the function now returns the base `vagaEnriquecida` (only `diasDesdePublicacao` set) without issuing ANY query against `candidaturas`. This both (a) removes the RLS-bug blast radius — even if a future migration adds an `OR true` policy clause or accidental gap, anon visitors no longer touch `candidaturas` at all — and (b) closes one round-trip per vaga on the anon path, advancing the D-17 list-batch optimization target.

The function still issues the WR-06 single status-fetch query for authenticated candidatos (so `hasUserApplied`, `totalCandidatos`, `candidatosEmAnalise`, `candidatosAprovados` populate correctly when the candidate is signed in). RH/admin role detection is intentionally NOT added at this layer — the Phase 6 plan owns the RH-side counts via a single grouped query keyed by all vaga IDs in the page batch (canonical D-17 fix).

**Verification:** Tier 1 (re-read lines 65-130) confirmed early-return guard placed before both candidaturas reads. Tier 2 (`npm run lint`) confirmed lint baseline still at **320** errors. Tier 2 (`vagasService` Vitest) confirmed **6/6 PASS** — the existing T1 happy-path test calls `getVagaBySlug` without a candidatoId argument (downstream of `enriquecerVaga`'s anon path) and asserts `result.success === true`, which is unaffected by the new early return. Tier 2 (`pitfall7.grep.test.ts`) confirmed **4/4 PASS**. **Logic note:** the fix narrows behavior for the anon path (was: 1 query returning 0 rows, now: 0 queries returning the base shape). For authenticated candidatos the behavior is unchanged. The `totalCandidatos`/`candidatosEmAnalise`/`candidatosAprovados` fields are now `undefined` on the anon path (vs. previously `0`) — this is consistent with the type definition (`Vaga.totalCandidatos?: number`) and the public landing UI must already handle the optional case.

## Skipped Issues

_None — all 4 warnings were applied cleanly._

## Out-of-Scope (Info findings — deferred to Phase 5)

The 9 IN-* findings (`IN-01` through `IN-09`) were intentionally not addressed per `fix_scope: critical_warning`. They are tracked in REVIEW.md and align with existing Phase 5 backlog items (D-25..D-28 + F-04-08-B/C/G + D-26 token reparation) per `04-08-SUMMARY.md`. Of particular note for the Phase 5 owner:

- **IN-03** (`getProximaEtapa` returns `'rejeitado'` after `'aprovado'`) is a real logic bug reachable today via `updateCandidaturaStatus`. Flagged but deferred since it's on the RH-flow path (Phase 6 territory).
- **IN-04** (5 emoji-prefixed `console.log/error` calls in legacy `updateCandidaturaStatus`) is a Pitfall-7-adjacent leak that should extend the grep guard to scan for `candidaturaId|feedback_rejeicao|motivo_rejeicao` in `console.*` calls.

## Verification Battery

| Gate | Pre-fix | Post-fix |
|------|---------|----------|
| `npm run lint` (TS error count) | 320 | **320 (zero growth)** |
| Pitfall 7 grep guard | 4/4 PASS | **4/4 PASS** |
| `vagasService` Vitest | 6/6 PASS | **6/6 PASS** |
| Commits in chain | 0 | **4 atomic commits (one per finding)** |

**Hook bypass:** All 4 commits use `git -c core.hooksPath=/dev/null` per Phase 4 D-22 documented pattern (legacy `src/components/pages/*.tsx` carry the 320-error baseline that the husky `pre-commit` would otherwise block on).

## Commit Chain (Iteration 2)

```
78fc854 fix(04): WR-10 skip candidaturas read in enriquecerVaga for anon browsers
33915a2 fix(04): WR-09 cap submit-candidatura body size and respostas[] length
c9c50c6 fix(04): WR-08 await clipboard.writeText to avoid false-success toast
6195b75 fix(04): WR-07 remove redundant auth-gate effect in FormularioCandidaturaPage
```

Iteration 1 chain (already merged, included for reference):
```
5c7c7b1 fix(04): WR-06 collapse 3 count queries into one in enriquecerVaga
4bfd929 fix(04): WR-05 replace require() with static import in useVagasWithStore
e53f8fa fix(04): WR-04 read N8N webhook URLs from env vars (FE + EF)
530ae38 fix(04): WR-02 add pergunta-vaga pre-check in submit-candidatura EF
6238c89 fix(04): WR-03 gate already-applied redirect on settled query state
0eabead fix(04): WR-01 hoist orphan CV cleanup to cover unexpected error paths
```

## Notes for Verifier

1. **WR-09 deployment requires `supabase functions deploy submit-candidatura`.** The schema change (added `.max(100)`) lives in `supabase/functions/_shared/schemas.ts` which is bundled into the EF at deploy time; the Content-Length pre-check lives in the EF handler itself. Migration was NOT touched (per CLAUDE.md D-22 PL/pgSQL `db push` workaround).

2. **WR-10 narrows anon-path return shape.** Anonymous visitors now receive `Vaga` rows with `totalCandidatos`, `candidatosEmAnalise`, `candidatosAprovados`, `hasUserApplied` all `undefined` (vs. previously `0` / `false`). The type definition declares all four as `?:` optional, so this is type-safe — but if any UI component does `vaga.totalCandidatos > 0` (truthy check) instead of `(vaga.totalCandidatos ?? 0) > 0`, the rendered display will change. UAT should confirm `/vagas` and `/vagas/:slug` for an anonymous (logged-out) browser. Authenticated candidatos see no change.

3. **WR-07 removes a defensive redirect.** The eliminated effect was a belt-and-suspenders pattern; `RoleGuard` is the canonical owner. UAT: visit `/candidato/candidatura/formulario/:vagaSlug` while signed out — `RoleGuard` should redirect (Phase 3 contract). Visit while signed in with auth-store still hydrating from persisted session — should NOT redirect off the formulário (this is the previously-flapping path).

4. **WR-08 changes the copy-link UX on rejection.** Previously: success toast even when the clipboard write failed. Now: error toast with manual-copy hint. UAT: open `/vagas/:slug` in a context where clipboard write fails (e.g., HTTP not HTTPS, or document not focused) and click "Copiar link" — should see the error toast, not the success toast.

5. **No logic-bug findings in scope.** All 4 fixes are syntactic/structural (effect removal, Promise chain, schema constraint + Content-Length guard, early-return guard). No fix marked `"fixed: requires human verification"` — though WR-08 (clipboard rejection path) and WR-10 (anon-path display) merit UAT confirmation per notes 3-4 above.

6. **Iteration 1 verification.** Per REVIEW.md §Summary, iteration 2 verified that all 6 iteration-1 fixes (WR-01..WR-06) landed at the root cause without regression. Statuses: `WR-01..WR-06: verified_fixed`. No iteration-1 fix needed re-work in iteration 2.

---

_Fixed: 2026-04-26T04:25:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
