---
phase: 17
slug: 17-navegacao-arquitetura-informacao
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-28
auditor: gsd-security-auditor (claude-sonnet-4-6)
---

# Phase 17 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Source: plan-time `<threat_model>` blocks in 17-01-PLAN.md through 17-05-PLAN.md
> (`register_authored_at_plan_time: true`).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| test harness → live Supabase (gated) | E2E J1-J3 log in against real auth only when `E2E_AUTH_TEST_USERS=true`; creds from env with hardcoded non-secret fallbacks matching the project precedent (login-flow.spec.ts). | Test-user email/password (test environment only) |
| unknown URL → router catch-all | Any/unknown path (including unauthenticated) hits path:'*'; the 404 must not leak protected route names or require a role. | None (terminal presentational page) |
| old path → redirect | The `/rh/candidato/:id` (singular) → `/rh/candidatos/:id` (plural) normalization maps a static internal path param via `useParams` into a fixed template — no user-supplied redirect target. | Route param (candidaturaId) — no sensitive data |
| RH user → hub reads | The hub reads candidate pipeline data via existing features/* hooks behind Supabase RLS; no new query/select introduced. | Candidate pipeline data (RLS-gated, column-allowlisted) |
| sidebar role gate → /admin/* | The Admin item is visible only for `administrador` (cosmetic), but real access is the route RoleGuard + RLS. | None (visibility only) |
| candidato → own-row reads | Dashboard/Perfil read the candidate's own candidaturas (own-row reads behind RLS). | Own candidatura data (RLS-gated) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-17-01-CRED | Information Disclosure | e2e/navegacao.spec.ts real-auth creds | mitigate | Creds read from `process.env.TEST_USER_EMAIL/PASSWORD` / `TEST_ADMIN_*`; fallback to non-secret domain test values (login-flow.spec.ts precedent); J1-J3 gated behind `describeRealAuth` (`E2E_AUTH_TEST_USERS==='true'`) | CLOSED |
| T-17-01-SC | Tampering | npm/pip/cargo supply chain (Plan 01) | accept | Zero packages installed this plan (RESEARCH Package Legitimacy Audit N/A) — AR-17-SC | CLOSED |
| T-17-02-OR | Tampering | routes.tsx normalization redirect (D-08) | mitigate | `RedirectToHub` reads `useParams<{id:string}>()` and interpolates into the fixed template `/rh/candidatos/${id}`; no user-supplied redirect target; no open-redirect | CLOSED |
| T-17-02-404 | Information Disclosure | NotFoundPage role-aware back-link | mitigate | Back-link reads store `role` only (via `useRole()`); switch produces one of 3 fixed internal targets (`/candidato/dashboard`, `/rh/dashboard`, `/`); no protected route names exposed; no RoleGuard so no redirect-loop | CLOSED |
| T-17-02-EOP | Elevation of Privilege | catch-all `path:'*'` without RoleGuard | accept | Intentionally guard-free (must render for any role); grants NO access — terminal presentational 404 page; real access control unchanged on /rh/* and /admin/* (RoleGuard + RLS) — AR-17-02-EOP | CLOSED |
| T-17-02-SC | Tampering | npm installs (Plan 02) | accept | Zero packages installed — AR-17-SC | CLOSED |
| T-17-03-AC | Elevation of Privilege | RHSidebar Admin item (D-13) | mitigate | Item gated on `role === 'administrador'` (cosmetic only); `/admin/*` routes retain `RoleGuard role="administrador"` + RLS — verified `routes.tsx:401` and surrounding admin blocks | CLOSED |
| T-17-03-PII | Information Disclosure | hub pipeline reads (D-07) | mitigate | `HubCandidatoRH` reuses existing allowlist-projected hooks (`useScorecardCandidato`, `useConsolidacao`, `useEntrevistaContexto`, `useEntrevistaScorecard`, `useRedacaoRevisao`) — zero new `select('*')` candidate-facing reads; RLS is row-level only (MEMORY reference_select_star_leaks_pii) | CLOSED |
| T-17-03-ID | Spoofing/Tampering | TriagemTable id contract (Pitfall 1) | mitigate | `TriagemTable` navigates via SPA `<Link to=/rh/candidatos/${row.id}>` where `row.id` is the candidaturaId (`triagemService.ts TriagemRow`), NOT `candidato.id`; raw `href` to candidatos is gone (grep confirms 0 matches) | CLOSED |
| T-17-03-SC | Tampering | npm installs (Plan 03) | accept | Only `ShieldCheck` from already-installed `lucide-react`; zero new packages — AR-17-SC | CLOSED |
| T-17-04-PII | Information Disclosure | Dashboard/Perfil own-row reads | mitigate | Dashboard reuses `useCandidaturas` (RLS-gated + allowlist-projected); Perfil strip REMOVES candidatura reads; no new `select('*')` introduced | CLOSED |
| T-17-04-ID | Tampering | Dashboard CTA route param | mitigate | Step-CTA and LGPD CTA interpolate `candidatura.id` from the user's own RLS-scoped list into fixed internal route templates; `etapa_atual` cast is guarded — undefined lookup yields neutral CTA, never a wrong-id route; `resolveRedirect` anti-open-redirect property preserved in login | CLOSED |
| T-17-04-LAND | Elevation of Privilege | ROLE_HOME landing repoint | accept | `ROLE_HOME.candidato` changed from `/candidato/perfil` to `/candidato/dashboard`; both routes are already candidato-RoleGuard-protected; no cross-role exposure introduced — AR-17-04-LAND | CLOSED |
| T-17-04-SC | Tampering | npm installs (Plan 04) | accept | Zero packages installed — AR-17-SC | CLOSED |
| T-17-05-DEL | Denial of Service (self-inflicted build break) | routes.tsx legacy scrub | mitigate | 4-edit atomic removal per file (file + import + route object + devNav entry); `npm run build` verified after deletions (exits 0); per-file zero-use re-grep preceded each deletion; MeuPerfilPage explicitly KEPT | CLOSED |
| T-17-05-DEV | Information Disclosure | DevNavigationMenu coverage | accept | `DevNavigationMenu` stays `import.meta.env.DEV`-gated in `App.tsx:222`; devnav-gate grep guard re-runs GREEN; production nav covers the funnel but DevNav removal deferred until 100% coverage confirmed — AR-17-05-DEV | CLOSED |
| T-17-05-CRED | Information Disclosure | e2e/navegacao.spec.ts real-auth (Plan 05) | mitigate | Creds from `process.env`; J1-J3 gated behind `describeRealAuth` (`E2E_AUTH_TEST_USERS==='true'`); same verification as T-17-01-CRED | CLOSED |
| T-17-05-SC | Tampering | npm installs (Plan 05) | accept | Zero packages installed — AR-17-SC | CLOSED |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-17-SC | T-17-01-SC, T-17-02-SC, T-17-03-SC, T-17-04-SC, T-17-05-SC | Zero new packages installed across all 5 plans. RESEARCH Package Legitimacy Audit returned N/A for each wave. No supply-chain surface. | plan-author (Plan 01-05) | 2026-06-28 |
| AR-17-02-EOP | T-17-02-EOP | The catch-all `path:'*'` route has no RoleGuard by design — it must render for unauthenticated and any-role visitors. It is a terminal presentational 404 page that grants no access to any resource. Real access control for /rh/* and /admin/* routes is unchanged (RoleGuard + Supabase RLS). | plan-author (Plan 02) | 2026-06-28 |
| AR-17-04-LAND | T-17-04-LAND | Repointing `ROLE_HOME.candidato` from `/candidato/perfil` to `/candidato/dashboard` changes only where a candidato lands after authentication. Both routes have always been `candidato`-RoleGuard-protected; no cross-role access is introduced. The change makes the funnel hub the actual post-login destination (D-09 UX requirement). | plan-author (Plan 04) | 2026-06-28 |
| AR-17-05-DEV | T-17-05-DEV | `DevNavigationMenu` remains mounted behind `import.meta.env.DEV` in `App.tsx:222` and is tree-shaken from production builds. Removal is deferred until production navigation achieves 100% funnel coverage so developers retain the dev-only navigation tool. The devnav-gate grep guard runs GREEN. | plan-author (Plan 05) | 2026-06-28 |

---

## Unregistered Threat Flags

No SUMMARY.md `## Threat Flags` sections declared new unregistered attack surface in any of the 5 plans. All summaries explicitly state "Threat Flags: None" for Plans 02-05, and Plan 01 produced no production code (Wave 0 RED battery only). No unregistered flags to record.

---

## Verification Evidence

| Threat ID | Pattern Verified | File:Location |
|-----------|-----------------|---------------|
| T-17-01-CRED | `E2E_AUTH_TEST_USERS === 'true'` gate; `process.env.TEST_USER_EMAIL` | `e2e/navegacao.spec.ts:58-59` |
| T-17-02-OR | `RedirectToHub`; `useParams<{id:string}>()`; `/rh/candidatos/${id}` fixed template | `src/router/routes.tsx:94-96, 314` |
| T-17-02-404 | `useRole()`; switch with 3 fixed targets `/candidato/dashboard`, `/rh/dashboard`, `/` | `src/components/pages/NotFoundPage.tsx:29, 37-45` |
| T-17-02-EOP | `path: '*'` with `element: <NotFoundPage />` — no wrapping RoleGuard | `src/router/routes.tsx:467` |
| T-17-03-AC | `role === 'administrador'` spread gate; `RoleGuard role="administrador"` on /admin/* | `src/components/RHSidebar.tsx:100-101`; `src/router/routes.tsx:401+` |
| T-17-03-PII | `useScorecardCandidato`, `useConsolidacao`, `useEntrevistaContexto`, `useEntrevistaScorecard`, `useRedacaoRevisao` imports; zero `select('*')` | `src/features/hub-candidato/components/HubCandidatoRH.tsx:38-41` |
| T-17-03-ID | `<Link to={\`/rh/candidatos/${row.id}\`}>` with comment "row.id = candidaturaId" | `src/features/triagem/components/TriagemTable.tsx:325-329` |
| T-17-04-PII | `useCandidaturas` reused (no new select); Perfil strip removes candidatura reads | `src/components/pages/DashboardCandidatoPage.tsx` (no new select('*')) |
| T-17-04-ID | `candidatura.id` from own RLS-scoped list in fixed template; `resolveRedirect` rejects `//evil`, `javascript:`, non-slash paths | `src/components/pages/DashboardCandidatoPage.tsx:425`; `src/components/pages/LoginCandidatoPage.tsx:68-72` |
| T-17-04-LAND | `ROLE_HOME.candidato: '/candidato/dashboard'` | `src/components/RoleGuard.tsx:54` |
| T-17-05-DEL | 12 dead component names return 0 grep matches in `routes.tsx`; files confirmed absent on disk | `src/router/routes.tsx` (grep count: 0) |
| T-17-05-DEV | `{import.meta.env.DEV && <DevNavigationMenu />}` | `src/App.tsx:222` |
| T-17-05-CRED | `describeRealAuth`; `process.env.E2E_AUTH_TEST_USERS` | `e2e/navegacao.spec.ts:58-59, 110` |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-28 | 18 | 18 | 0 | gsd-security-auditor (claude-sonnet-4-6) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-28
