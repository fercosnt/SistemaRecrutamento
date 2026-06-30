# Milestones

## v3.0 M3 — Refinamento RH & Hardening (Shipped: 2026-06-30)

**Phases completed:** 4 phases, 16 plans, 32 tasks

**Key accomplishments:**

- Per-call wall-clock timeout (25s default, env-configurable) + `maxRetries:0` added to both the Anthropic `messages.parse()` and OpenAI fallback `parse()` calls in the shared `callAi()` orchestrator — closing the live 38–102s hang (achado #1) without rebuilding the existing retry/backoff/circuit-breaker/fallback machinery.
- gerar-devolutiva-bigfive now fans out its 5 OCEAN dims via Promise.allSettled at 1 attempt/dim with per-dim deterministic degrade and preserved O-C-E-A-N order — killing the 5×2 sequential AI-call timeout (achado #2) while keeping RNF-07a (degrade writes only templates, never a decision).
- Exported `normalizeSjtComposite` (body byte-unchanged) + 2 Deno cases locking the SJT-composite aggregation, and a multi-table mocked-supabase Vitest locking the avaliação perguntas `status='active'` sentinel — the two live PROD bugs (350e994, 686c460) now have the regression coverage that would have caught each.
- Extracted ONE shared `<AsyncState>` presentational wrapper that renders the binding 5-state contract (loading → slow@8s → error → empty → success) with single-sourced verbatim PT-BR copy, an `AI_UNAVAILABLE`-driven sobrecarga/generic error split, and the standardized "Tentar novamente" retry — then refactored `HubSection` to delegate to it with zero behavior drift.
- 1. [Scope clarification] bigfiveService has no client-side `gerar-devolutiva-bigfive` invoke.
- Wired the shared `<AsyncState>` (18-04) + the `error_code` service plumbing (18-05) onto the five AI-backed screens — Consolidação, Comparativo, BigFive, SJT caso aberto, Redação — so candidate and RH always see loading / slow / error / retry (never a blank screen), with `AI_UNAVAILABLE` rendering the sobrecarga copy, generic errors the generic copy, and `MIXED_VAGA` preserved.
- Plan:
- 1. [Rule 3 - Blocking] Relaxed the `lazyNamed` generic so a mixed-export module type-checks
- Gap A — `useEntrevistaScorecard` (Task 1):
- 1. [Rule 3 - Blocking] Migration grep gate tripped on an explanatory comment
- Plan:
- One-liner:
- One-liner:
- One-liner:

---

## v1.0 M1 — MVP Candidato (Shipped: 2026-06-06)

**Phases completed:** 7 phases (1, 2, 3, 4, 4.1, 4.2, 5), 43 plans, 95 tasks
**Audit:** PASSED — 38/38 requirements satisfied, integration sound, CI green (run 27076233734). See `milestones/v1.0-MILESTONE-AUDIT.md`.
**Timeline:** 2025-11-05 → 2026-06-06 · ~47.9k LOC (src) · branch `backup/local-state-2026-04`

**Delivered:** A secure, mobile-first ATS candidate experience — register, log in, recover password, browse jobs, apply with CV upload, and view real application status on a profile page — built security-first on Supabase (Auth + DB + Storage + Edge Functions).

**Key accomplishments:**

- **Security foundation (Phase 1):** Removed the `service_role` client from the browser bundle (privileged ops moved to Edge Functions), unified auth into a single Zustand store with role derived from the JWT `app_metadata` (DB-lookup fallback), and replaced the dual ProtectedRoute/ProtectedAdminRoute system with a single role-aware `RoleGuard` (auth → role → children, preserved redirect). RLS anon-SELECT on `candidatos` moved to a `SECURITY DEFINER` RPC returning only a boolean.
- **Candidate registration (Phase 2):** End-to-end 4-step cadastro wired to a Deno Edge Function (Zod validation + atomic `candidatos` insert with rollback + LGPD consent), CPF/email duplicate-check via RPC, ViaCEP autofill, sessionStorage draft persistence, auto-login → `/candidato/perfil`. Verified by 13 Playwright scenarios + iPhone 12 Pro UAT.
- **Login + password recovery (Phase 3):** Login with remember-me (`persistSession`), anti-enumeration recovery flow, and a 3-state redefinir-senha machine — later migrated PKCE→email-OTP (Phase 5) to eliminate the cross-browser `code_verifier` deeplink failure. ~1.5k LoC of legacy auth code deleted.
- **Jobs + application (Phase 4):** Public job listing filtered by `status='ativa'`, slug-routed detail pages (anti-enumeration), and an atomic candidatura submit via Edge Function (two-client pattern, IDOR cross-check, 23505→DUPLICATE mapping) with private-bucket CV upload. VAGA-03 `?redirect=` preserved through login with an anti-open-redirect guard.
- **Auth hydration gate (Phase 4.1/4.2):** Introduced `hydrateFromSession` + `waitForCandidatoHydrated` to close the async gap between `onAuthStateChange` and navigation across all three login paths, plus a `RoleGuard` redirect-loop guard — establishing the smoke-runtime test gate Phase 4 lacked. Phase 1 verification artifacts backfilled.
- **Profile + hardening (Phase 5):** Real-data candidate profile, repaired the semantic-token system at its source (HSL channel triplets), root-level ErrorBoundary, first-ever GitHub Actions CI (unit + e2e + lighthouse) + Lighthouse CI + axe-core a11y at **zero WCAG A/AA violations**, two DB data-hygiene migrations, and a **fully green live CI run**.

**Known tech debt (deferred to M2 backlog):** PERF-01 ≤60s apply→display cache-invalidation window · HARD-02 Lighthouse Performance 0.62–0.68 (user-approved warn-baseline; bundle work post-M1) · FOUND-08 husky tsc gate bypassed pending 292-error baseline burn-down · stray RH-path debug `console.log`. Full detail in `milestones/v1.0-MILESTONE-AUDIT.md`.

---

## v2.0 M2 — Funil RH + Avaliação por IA (Shipped: 2026-06-26)

**Phases completed:** 11 phases (6–16), 63 plans
**Audit:** PASSED — 42/42 requirements satisfied, 11/11 phases, 5/5 e2e flows. The single BLOCKER (AVAL-03) was fixed + redeployed + PROD-smoked post-audit (commit `39a164e`). See `v2.0-MILESTONE-AUDIT.md`.
**Timeline:** 2026-06-06 → 2026-06-26 · 344 commits (99 `feat`) · 463 files changed (+78.2k / −0.8k) · ~67.4k LOC (src) · branch `backup/local-state-2026-04` · git range `8841c40` → `d565d33`

**Delivered:** The full RH (recruiter) hiring funnel with AI-assisted evaluation — a 6-stage auditable pipeline where the candidate registers, applies, completes async evaluation, and is interviewed, while the recruiter triages with AI, compares candidates, reviews structured BARS scorecards, and makes an auditable final decision. The invariant throughout: the system **never auto-rejects on a score** (RNF-07a); AI is always a recommendation, a human always decides.

**Key accomplishments:**

- **Pipeline backbone & RLS (Phase 6):** Deprecated the legacy 10-value `etapa_processo` enum (with backup) for a 6-stage enum + 2 terminals; `avancar_etapa()` PL/pgSQL trigger auto-advances and blocks unjustified regression, writing the `historico_candidatura` audit row in the same transaction; structural guardrail forbids any `decisao_final` with `por_usuario IS NULL`; RLS on 100% of new tables. 6 migrations live in PROD via Supabase MCP.
- **Vaga config + inscrição + knockouts (Phases 7–8):** Per-role templates (8 cargos) with default `testes_aplicaveis` + weight sliders (Σ=100%) + an option-tag wizard. LGPD-clean inscription form (no CPF/foto/saúde, Zod `.strict()` client + server) with a **server-authoritative knockout sweep** inside `submit_candidatura_atomic` (tag-only, no trait/score/idade) → synchronous auto-rejection + 1 audit row. Security gate caught + fixed a HIGH LGPD `select('*')` leak.
- **AI prompt library + cost infra + triagem (Phases 9–10):** 7 versioned prompts (system + user + Zod schema), hybrid git→DB versioning, mandatory cost/token logging, ephemeral prompt caching (≤R$0,50/candidate), `cost-alerter` EF, and a CI grep guard for forbidden product-language (LGPD-04). On top: AI `score_match` per application (≤30s, Zod-validated) + a 2-10 side-by-side comparativo with relative ranking + PDF export. Code review caught + fixed a CRITICAL IDOR/PII gap in the comparativo EF.
- **Async evaluation — SJT + Big Five + redação (Phases 11–13):** Deterministic Work-Sample/SJT (Σ peso 4/2/1/0, answer-keys RLS-protected, options via SECURITY DEFINER RPC) + open-case BARS; anti-tampering server-side Big Five (IPIP-NEO-120 PT-BR, 5 OCEAN + 30 facets) with a respectful hybrid D-lite devolutiva; cultural-fit redação scored by a dedicated AI EF (4 BARS dims + 3-color) with **mandatory human review** (every essay → `pendente_humano`, slider override, ≥50-char notes, escalation on "duvida"). Autosave + back-lock; never auto-rejects.
- **Interviews + cognitive + final decision (Phases 14–15):** AI-companion STAR/PEI interview guides (≥1 question per weak dimension) + transcript analysis (BARS + flags + citations; a language/accent flag at <3 blocks advance until human review) + opt-in CC0 cognitive reasoning marked **CONTEXTUAL**. Final decision consolidates all scorecards (never re-scores), requires a ≥50-char justification (`por_usuario` NOT NULL, DB-enforced), exposes an LGPD Art. 20 candidate explanation endpoint ("Solicitar revisão por pessoa natural" → internal ticket), and records a monthly EEOC 4/5 bias snapshot with CSV export.
- **WCAG-AA + tech-debt hardening (Phase 16):** Main M2 RH + candidate screens pass axe-core Tier-A GREEN **15/15** (zero serious/critical, WCAG AA) enforced in CI — hand-rolled tabs/radiogroups → Radix vendored, contrast bumps, slider `aria-valuetext`, keyboard-focusable tooltips. M1 tech-debt triaged (RH-path `console.*` removed, dead biasMath fns removed, RHSidebar mobile-menu bug fixed → tsc 291→290, ci.yml gate tightened).

**Known deferred items at close (non-blocking):** 5 live HUMAN-UAT round-trips (real PROD data/accounts — Phases 10/11/14 + others) · 4 advisory WARNINGs from audit (bigfive_devolutiva prompt not seeded → in-EF fallback; two `select('*')` allowlist-discipline gaps with no active leak; consolidar-decisao-final shows Big-Five/cognitivo as context-only). **Carried tech debt:** HARD-02 bundle code-splitting · PERF-01 cache-invalidation ≤60s · FOUND-08 tsc burn-down tail · CC0 cognitive item-bank real seed (pontuar_cognitivo has empty-bank guard). Full detail in `v2.0-MILESTONE-AUDIT.md`.

---
