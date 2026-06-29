---
phase: 19
slug: performance-bundle-cache
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-29
---

# Phase 19 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (3 PLAN.md `<threat_model>` blocks); this audit VERIFIES each declared mitigation against the implemented code (no net-new threat scan).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| build-time Node script → repo filesystem | `scripts/assert-chunks.mjs` reads `build/` output only; no untrusted input, no network, no eval | build artifact bytes (non-sensitive) |
| test harness → in-memory QueryClient | regression tests mock the service layer; no real Supabase/network calls | mocked DTOs only |
| unauthenticated/candidate client → lazy `/rh/*` `/admin/*` route chunk (public JS) | the lazy chunk JS is publicly fetchable; it carries UI code, not data | UI bundle code (no secrets) |
| candidate role → RH/admin route element | `RoleGuard` must render BEFORE the lazy element resolves (EoP gate) | route-render authorization decision |
| build config → prod runtime | a `manualChunks` misconfig can ship a blank prod app (self-DoS) | bundle init order |
| client cache (TanStack Query) → Supabase (source of truth) | `invalidateQueries` triggers a re-read; the RLS-gated DB is authoritative | own-row candidatura/consolidacao reads |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation (verified evidence) | Status |
|-----------|----------|-----------|-------------|--------------------------------|--------|
| T-19-01-01 | Tampering | `scripts/assert-chunks.mjs` reads build artifacts | accept | Pure `node:fs` reads only — imports `node:fs`/`node:path`/`node:url` (assert-chunks.mjs:26-28); no `eval`/`fetch`/`require`/network. Accepted risk AR-19-01. | closed |
| T-19-01-02 | Denial of Service | `PageSkeleton` infinite/blank fallback | mitigate | `PageSkeleton.tsx:24-38` is static markup — grep confirms NO hooks/`useQuery`/`fetch`/`supabase`. Single wired Suspense fallback (App.tsx:226). React caches the resolved chunk Promise → no re-visit flash. | closed |
| T-19-01-SC | Tampering | npm installs | mitigate | ZERO new packages — `git log 2148780~1..d18c5bf -- package.json package-lock.json` returns empty. Supply-chain neutral. | closed |
| T-19-02-01 | Elevation of Privilege | `routes.tsx` RoleGuard during the lazy rewrite | mitigate | **Load-bearing check.** Every lazy `/rh/*` `/admin/*` component is the CHILD of an EAGER `<RoleGuard role={...}>` (routes.tsx:291-468, all 18 lazy routes). `RoleGuard` is statically imported (routes.tsx:30) → renders synchronously; the role check (`RoleGuard.tsx:156-158` redirects on wrong role) fires BEFORE the lazy chunk is requested. `<Suspense>` sits ABOVE the guard (App.tsx:226). JSX-tag invariant intact: 31 `<RoleGuard` = 31 `</RoleGuard>`. A candidate is bounced before any RH/admin chunk loads. | closed |
| T-19-02-02 | Information Disclosure | lazy RH/admin route chunk fetchable by anon client | accept | By-design / no new exposure: route chunks contain UI code only; all data access is RLS + EF-authorized server-side. Same posture as the prior monolith (the code already shipped in the public bundle). Splitting it out is neutral. Accepted risk AR-19-02. | closed |
| T-19-02-03 | Denial of Service (self-inflicted) | `manualChunks` circular-init blank prod screen | mitigate | NARROW react-vendor only — `vite.config.ts:123-132` matches only `node_modules/react/`, `react-dom/`, `react-router`, `scheduler/`; everything else returns `undefined` (auto-chunk). NO broad `node_modules→vendor` branch. Build green, no "Cannot access X before initialization". | closed |
| T-19-02-04 | Availability | lazy route shows blank on chunk-load | mitigate | Single `<Suspense fallback={<PageSkeleton/>}>` wrapping `<Outlet/>` in RootLayout (App.tsx:226-228) — every lazy route shows the branded glass skeleton, never blank. | closed |
| T-19-02-SC | Tampering | npm installs | mitigate | ZERO new packages (same evidence as T-19-01-SC: no package.json/lock diff across Phase 19). Supply-chain neutral. | closed |
| T-19-03-01 | Tampering | consolidacao invalidation scope | mitigate | Invalidation is TARGETED in BOTH Phase-19 hooks: `useEntrevistaScorecard.ts:196-201` uses `decisaoKeys.consolidacao(candidaturaId, vagaId)` (or the consolidacao-prefix `[...decisaoKeys.all,'consolidacao',candidaturaId]` fallback — still namespace-scoped, NOT a broad `decisaoKeys.all`); `useRedacaoRevisao.ts:74-78` uses `decisaoKeys.consolidacao(vars.candidaturaId, vagaId)`. No bare `queryKey: decisaoKeys.all` in either Phase-19 hook (grep clean; the one `decisaoKeys.all` invalidation lives in `useRegistrarDecisao.ts:38` — out of Phase-19 scope, pre-existing). Regression test asserts `spy` NOT called with `decisaoKeys.all` (useEntrevistaScorecard.test.ts:103). | closed |
| T-19-03-02 | Information Disclosure | refetchOnWindowFocus widening reads | mitigate | Applied PER-QUERY to `useCandidaturas` only (useCandidaturas.ts:121, paired with `staleTime: 1*60*1000` L112) — the candidate's own-row, already-RLS-scoped list. Global default stays `false` (App.tsx:43) so RH/AI reads are not refetched. No new data path. | closed |
| T-19-03-03 | Tampering (integrity invariant) | consolidacao / candidaturas writes (RNF-07a) | accept/mitigate | Cache-only invalidation — grep for `.update(`/`.insert(`/`.upsert(`/`.delete(`/`from('candidaturas')` in both Phase-19 hooks returns NONE. consolidacao stays read-only/advisory; zero candidaturas writes by trait/score/idade. RNF-07a preserved. | closed |
| T-19-03-SC | Tampering | npm installs | mitigate | ZERO new packages (same evidence as T-19-01-SC). Supply-chain neutral. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-19-01 | T-19-01-01 | `scripts/assert-chunks.mjs` is a build-time gate that reads only the local git-ignored `build/` output via `node:fs` — no untrusted input, no network, no `eval`. Tampering surface limited to the local repo filesystem the developer already controls. | gsd-security-auditor (verified) | 2026-06-29 |
| AR-19-02 | T-19-02-02 | Lazy `/rh/*` `/admin/*` route chunks are publicly fetchable JS, but contain UI code only — no data, no secrets. All data access is enforced server-side by RLS + Edge-Function authorization. Code-splitting is neutral vs. the prior monolith (the same code already shipped in the public bundle). | gsd-security-auditor (verified) | 2026-06-29 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags

None. No `## Threat Flags` section appears in any Plan SUMMARY. `19-03-SUMMARY.md` (§Threat Surface) explicitly maps to the existing register (T-19-03-01..SC) and states "No Threat Flags". No net-new attack surface emerged during implementation.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-29 | 12 | 12 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-29
