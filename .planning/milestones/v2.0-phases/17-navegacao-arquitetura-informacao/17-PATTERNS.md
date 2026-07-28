# Phase 17: Navegação & Arquitetura de Informação - Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 9 (2 NEW · 7 MODIFIED/EXTENDED)
**Analogs found:** 9 / 9 (every artifact has an in-repo analog — this is a wiring/IA phase, not greenfield)

> **Read this first (planner/executor):** This phase *connects* existing M2 pieces. Almost every "build" instinct is wrong — the corresponding service/hook/shell already exists and is RLS-correct. The two genuinely-new files are `funilNavMap.ts` (pure derivation) and `NotFoundPage.tsx` (presentational). Everything else is **mirror an existing pattern + swap the destination/data source**, never design-from-scratch.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/navegacao/funilNavMap.ts` | utility (pure derivation) | transform | `src/lib/opcoes/opcoesNormalize.ts` | exact (same `src/lib/` pure-module convention) |
| `src/components/pages/NotFoundPage.tsx` | component (page) | request-response (read role) | `src/components/pages/DashboardCandidatoPage.tsx` (glass shell) + `RoleGuard.tsx` (`ROLE_HOME`) | role-match (glass page + store role read) |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx` *(new feature, D-15)* | component (page/hub) | request-response (compose reads) | `src/features/entrevista/components/EntrevistaWorkspace.tsx` | exact (RHLayout host + `useParams` candidaturaId + service hooks + empty states) |
| `src/components/pages/PerfilCandidatoRHPage.tsx` *(rewrite OR thin redirect to hub — D-05)* | component (page) | request-response | `EntrevistaWorkspace.tsx` + `useScorecardCandidato`/`useConsolidacao`/`useExplicacao` | exact |
| `src/router/routes.tsx` *(catch-all + redirects — D-08/D-14)* | route (config) | request-response | itself (existing `RouteObject[]` + `RoleGuard` form) + `RoleGuard.tsx` `<Navigate>` | exact |
| `src/components/pages/DashboardCandidatoPage.tsx` *(step-CTA + LGPD card — D-09/D-11)* | component (page) | request-response | itself (`useCandidaturas` + `useNavigate` already wired) | exact (edit-in-place) |
| `src/components/pages/MeuPerfilCandidatoPage.tsx` *(strip candidatura lists — D-10)* | component (page) | request-response | itself (already a glass profile-edit page) | exact (edit-in-place) |
| `src/components/RHSidebar.tsx` *(role-gated Admin item — D-13)* | component (nav) | event-driven | itself (`menuItems` + `getActivePageFromPath` + `handleMenuClick`) | exact (extend in place) |
| `e2e/navegacao.spec.ts` *(navigability smoke — D-16)* | test | request-response | `e2e/cadastro-flow.spec.ts` (structure) + `e2e/login-flow.spec.ts` (gated real-auth) + `e2e/explicacao-flow.spec.ts` (heading/CTA assertion) | exact |

> **No "No Analog Found" section** — every file maps to an existing pattern. (Section retained below, empty, per template.)

---

## Pattern Assignments

### `src/lib/navegacao/funilNavMap.ts` (utility, transform) — NEW (D-17)

**Analog:** `src/lib/opcoes/opcoesNormalize.ts` — the precedent for a **pure, React-free, Supabase-free module under `src/lib/`** that BOTH a feature and a page import (acyclic `feature → lib`, per CLAUDE.md import rules). Mirror its module-doc header explaining *why it lives in `lib/` not a feature*.

**What to mirror:** the file's "lives under `src/lib/` precisely so BOTH X and Y import it" doc convention + named-export pure functions. Same here: Dashboard (candidate) AND the hub (RH) both import `funilNavMap`.

**Enum source to REUSE (do NOT recreate)** — `src/features/triagem/services/triagemService.ts` L293-325:
```typescript
export type EtapaFunilM2 =
  | 'inscricao' | 'triagem' | 'avaliacao_assincrona'
  | 'entrevista_online' | 'entrevista_presencial'
  | 'decisao_final' | 'aprovado' | 'rejeitado'

export const ETAPA_M2_LABELS: Record<EtapaFunilM2, string> = {
  inscricao: 'Inscrição', triagem: 'Triagem',
  avaliacao_assincrona: 'Avaliação Assíncrona',
  entrevista_online: 'Entrevista Online',
  entrevista_presencial: 'Entrevista Presencial',
  decisao_final: 'Decisão Final', aprovado: 'Aprovado', rejeitado: 'Rejeitado',
}
```

**Contract to write** (from UI-SPEC §Interaction Contract + RESEARCH Pattern 1):
```typescript
import { type EtapaFunilM2, ETAPA_M2_LABELS } from '@/features/triagem/services/triagemService'

interface FunilNavEntry {
  label: string                                         // = ETAPA_M2_LABELS[etapa]
  rotaCandidato: (candidaturaId: string) => string | null   // null = no candidate screen this etapa
  rotaWorkspaceRH: (candidaturaId: string) => string | null // null = no RH workspace this etapa
  ctaCandidato: string   // "Continuar para {label}"  (UI-SPEC copy)
  ctaRH: string          // "Abrir {label}"           (UI-SPEC copy)
}
// EXHAUSTIVE over the 8 keys — TS enforces Record<EtapaFunilM2, FunilNavEntry>.
// All :id route segments below carry a candidaturaId (see Shared Pattern: id contract).
export const funilNavMap: Record<EtapaFunilM2, FunilNavEntry> = { /* ... */ }
```

**Verified route targets per etapa** (from `routes.tsx`, all `:id`/`:candidaturaId` = candidaturaId):
| EtapaFunilM2 | rotaCandidato | rotaWorkspaceRH |
|--------------|---------------|-----------------|
| `inscricao` | `null` (no pending screen) | `null` (hub only) |
| `triagem` | `null` (RH-side) | `null` (hub itself) |
| `avaliacao_assincrona` | `/candidato/avaliacao/${id}` | `null` (hub reviews scores) |
| `entrevista_online` | `null` (RH-scheduled) | `/rh/candidato/${id}/entrevista` |
| `entrevista_presencial` | `null` | `/rh/candidato/${id}/entrevista` |
| `decisao_final` | `null` (+ LGPD card path) | `/rh/candidato/${id}/decisao` |
| `aprovado` | `null` | `/rh/candidato/${id}/decisao` |
| `rejeitado` | `/candidato/explicacao/${id}` (LGPD) | `/rh/candidato/${id}/decisao` |

> `/candidato/prova-cognitiva/:id` and `/candidato/redacao/:id` are **sub-screens** of `/candidato/avaliacao/:id` (the container fans out internally — `AvaliacaoContainer`). The map routes the candidate to `/candidato/avaliacao/${id}` during `avaliacao_assincrona`. [ASSUMED — RESEARCH A2]

**Test analog:** unit test mirroring any `__tests__` exhaustiveness check — assert all 8 `EtapaFunilM2` keys present + each route fn interpolates the candidaturaId (RESEARCH Wave 0: `src/lib/navegacao/__tests__/funilNavMap.test.ts`).

---

### `src/components/pages/NotFoundPage.tsx` (component, role-read) — NEW (D-14)

**Analog (glass shell):** `src/components/pages/DashboardCandidatoPage.tsx` L92-99 — the canonical `BackgroundImage` glass-surface skeleton. The 404 is a **standalone glass surface with NO persona navbar** (must render for any/unknown role — UI-SPEC §Persona shells).

**Imports + shell skeleton to mirror** (DashboardCandidatoPage L1-9, L92-99):
```tsx
import { useNavigate } from 'react-router-dom'
import { BackgroundImage } from '../BackgroundImage'
import { BeautySmileLogo } from '../BeautySmileLogo'
import { Glass, GlassCard, GlassButton } from '../ui/glass'
import { useAuthStore } from '@/store/authStore'
// ...
<div className="relative min-h-screen">
  <BackgroundImage background="gradient" className="min-h-screen py-20"
    overlayColor="bg-black" overlayOpacity={15}>
    {/* centered GlassCard: "404" display + "Página não encontrada" heading + body + role-aware back-link */}
  </BackgroundImage>
</div>
```

**Role-aware back-link (read role from store, mirror `ROLE_HOME` from `RoleGuard.tsx` L48-52):**
```tsx
const role = useAuthStore((s) => s.role)   // 'candidato' | 'rh' | 'administrador' | null
// UI-SPEC §404 copy + targets:
//   candidato → "Voltar ao meu painel" → /candidato/dashboard
//   rh|administrador → "Voltar ao painel RH" → /rh/dashboard
//   null → "Voltar ao início" → /
```
> Note: `RoleGuard.ROLE_HOME.candidato` is `/candidato/perfil`, but the 404 back-link target per UI-SPEC is `/candidato/dashboard` — use the UI-SPEC copy table, NOT `ROLE_HOME` verbatim. (See Shared Pattern: candidate landing.)

**Copy (UI-SPEC §404 — verbatim):** Display "404" · Heading "Página não encontrada" · Body "O endereço que você tentou acessar não existe ou foi movido."

**Caveat:** use `bg-[#00109E]` / `bg-white/NN` glass — **never `bg-primary`** (broken project-wide; see Shared Pattern: broken token).

---

### `src/features/hub-candidato/components/HubCandidatoRH.tsx` (component, compose-reads) — NEW REWRITE (D-05/D-07/D-15)

> Per D-15, the substantial NEW screen (hub rewrite) is born in `src/features/`. The 1864-line `PerfilCandidatoRHPage.tsx` mock is replaced — either rewritten in place to call the hub, or made a thin wrapper rendering the new feature component. **DROP** the DISC/Raven/manifesto tabs (`PerfilCandidatoRHPage.tsx` L55 `TesteType`, recharts radar/pie L36-52) — those M1 concepts do not exist in M2.

**Analog (the whole shape):** `src/features/entrevista/components/EntrevistaWorkspace.tsx` — RHLayout-shelled, role-gated, `useParams<{id}>()` = candidaturaId, composes multiple `features/*` hooks, each section service-backed with loading/empty handling.

**Shell + params + heading to mirror** (EntrevistaWorkspace L20-23, L61-67, L111-114):
```tsx
import { useParams } from 'react-router-dom'
import { RHLayout } from '@/components/RHLayout'
import { Glass } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'
// ...
export function HubCandidatoRH() {
  const { id } = useParams<{ id: string }>()
  const candidaturaId = id ?? ''       // ⚠ candidaturaId, NOT candidato.id (Pitfall 1 — Shared Pattern below)
  // ...
  return (
    <RHLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-white md:text-4xl">{/* candidate name header */}</h1>
        {/* stage timeline (etapa_atual chip = accent) + sections below */}
      </div>
    </RHLayout>
  )
}
```

**Hub sections → real service hook map (D-07 — each reads a real hook OR shows empty state; NEVER hardcode):**
| Hub section (UI-SPEC) | Hook to call | Module |
|-----------------------|--------------|--------|
| Identidade + etapa chip | (candidatura row already in scope) + `ETAPA_M2_LABELS` | `triagemService` |
| Score de Triagem (IA) | `useTriagemPanel` / `useComparativo` | `features/triagem/hooks` |
| Avaliação Assíncrona (Work-Sample/SJT + Big Five) | `useScorecardCandidato(candidaturaId)` | `features/avaliacao/hooks/useScorecardCandidato.ts` |
| Avaliação Cognitiva | (cognitive band via entrevista scores) `useEntrevistaScorecard` `tipo==='cognitivo'` | `features/entrevista/hooks` |
| Redação | `useRedacaoRevisao` | `features/triagem/hooks/useRedacaoRevisao.ts` |
| Entrevista | `useEntrevistaContexto` / `useEntrevistaScorecard(candidaturaId)` | `features/entrevista/hooks/useEntrevistaScorecard.ts` |
| Decisão Final | `useConsolidacao(candidaturaId, vagaId)` | `features/decisao/hooks/useConsolidacao.ts` |
| Explicação/LGPD | `useExplicacao(candidaturaId)` | `features/explicacao/hooks/useExplicacao.ts` |

**Service-backed section + empty-state pattern to mirror** (`useScorecardCandidato.ts` L26-39 signature; RESEARCH §Code Examples):
```tsx
const { data: scores, isLoading } = useScorecardCandidato(candidaturaId)
if (isLoading) return <Skeleton className="..." />            // mirror EntrevistaWorkspace skeleton
if (!scores?.length) return <EmptyState
  heading="Sem dados nesta etapa"
  body="Nenhum registro foi gerado ainda para esta etapa." />  // UI-SPEC copy (reached, no data)
// future/not-reached etapa → "Etapa ainda não iniciada" / "...liberada quando o candidato avançar..."
// else render the real scores — NEVER hardcode (the sin of the 1864-line mock)
```

> **`vagaId` resolution:** `useConsolidacao` needs `(candidaturaId, vagaId)`. EntrevistaWorkspace resolves `vagaId` from `useEntrevistaContexto(candidaturaId).vaga_id` (L67-68) — mirror that to feed the decisão section.

**Hooks are query-keyed by candidaturaId + project defaults** (staleTime 5min, retry 2, `enabled: !!candidaturaId`) — `useScorecardCandidato.ts` L16-39 is the canonical query-key + `useQuery` shape; do not invent new fetch logic (reuse avoids the `select('*')` PII leak — MEMORY `reference_select_star_leaks_pii`).

---

### `src/router/routes.tsx` (route config) — catch-all 404 + normalization redirects (D-08/D-14)

**Analog:** the file itself — `RouteObject[]` element/object form, every protected route wrapped in `<RoleGuard role=...>`. Stay in this form (do NOT introduce the data-router `loader`/`redirect()` API — churn, rejected per D-15).

**Catch-all 404 (append LAST in the array — D-14):**
```tsx
// no RoleGuard — must render for any/unknown role
{ path: '*', element: <NotFoundPage /> }
```

**Param-preserving redirect (D-08) — Pitfall 5: `<Navigate to="...:id">` does NOT interpolate.** Mirror the `RoleGuard.tsx` `<Navigate ... replace />` idiom but resolve the param via `useParams` in a tiny wrapper:
```tsx
// RoleGuard precedent (RoleGuard.tsx L124-126): <Navigate to={`...${var}`} replace />
function RedirectCandidatoHub() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/rh/candidato/${id}`} replace />   // resolved, not literal ":id"
}
// then in routes: { path: '/rh/candidatos/:id', element: <RedirectCandidatoHub /> }
// OR keep /rh/candidatos/:id as the canonical hub mount and point the singular workspaces at it.
```
> The D-08 choice (plural vs singular canonical) is a planner decision [RESEARCH A1]; **the load-bearing constraint is the id carried = candidaturaId** (Shared Pattern below), not the singular/plural string.

**Legacy deletion scrub (D-12) — three references per file** (`routes.tsx`): for each confirmed-dead page delete (1) the `import {X}` (L11-87 region), (2) the `RouteObject`, (3) the `devNavigationPages` entry (L533-567). Run `npm run build` (tsc) after each. Confirmed-dead set (RESEARCH Legacy verdicts): `VagaLPPage` (hard-delete, no route) + `/testes/*` tree (`TesteBigFive/DISC/Raven` + their `Instrucoes*` + `ConclusaoTestes`) + `QuestionarioPage` + `QuestionarioCulturaPage` + `InscricaoPage` + `GlassShowcase`. **KEEP `MeuPerfilPage`** (`/rh/perfil`) — it has a LIVE entry (`RHTopBar.tsx:38` `navigate('/rh/perfil')`).

---

### `src/components/pages/DashboardCandidatoPage.tsx` (component) — step-CTA + LGPD card (D-09/D-11)

**Analog:** itself — `useCandidaturas` + `useNavigate` are ALREADY wired (L1-31). This is edit-in-place per D-15.

**Already-present wiring to reuse** (L1-31):
```tsx
import { useNavigate } from 'react-router-dom'
import { useCandidaturas, useCandidaturasCount } from '@/features/vagas/hooks'
const { data: candidaturasData } = useCandidaturas(filters, 'mais_recentes', { page: 1, limit: 50 })
```

**Replace the hardcoded mock "Testes disponíveis" block (L311-402** — Big Five "Concluído ✓", DISC "45%", Inteligência "0%", "Vagas Compatíveis 3") **with the funnel step-CTA** (RESEARCH §Code Examples):
```tsx
import { funilNavMap } from '@/lib/navegacao/funilNavMap'
const entry = funilNavMap[candidatura.etapa_atual as EtapaFunilM2]   // ⚠ see drift note below
const destino = entry.rotaCandidato(candidatura.id)                  // candidaturaId, NOT vaga_id
// Primary CTA (accent turquoise, single dominant): "Continuar para {entry.label}"
//   onClick={() => destino && navigate(destino)}
// LGPD card (D-11): when etapa ∈ {decisao_final,aprovado,rejeitado} && decisão exists →
//   "Entenda a decisão sobre sua candidatura" / CTA "Ver explicação" → /candidato/explicacao/{candidatura.id}
```

> **DRIFT LANDMINE (verified):** `Candidatura.etapa_atual` is typed `EtapaProcesso` (M1 legacy: `bigfive/disc/raven/cultura` — `vagasTypes.ts` L200-210, L351), but the **runtime DB value is an M2 enum** (`avaliacao_assincrona`, etc.). The `funilNavMap` is keyed on `EtapaFunilM2`. The planner must reconcile: cast/narrow `etapa_atual` to `EtapaFunilM2` at the read site, and guard unknown values (map lookup may be `undefined` if a stale M1 value ever surfaces) → fall back to "Acompanhar candidatura" neutral CTA (UI-SPEC). Do NOT use `ETAPA_PROCESSO_LABELS` (M1) for the CTA label — use `ETAPA_M2_LABELS` via the map.

**Caveat:** use SPA `navigate()` (already imported), NOT `<a href>`. Avoid `bg-primary` for the accent CTA — `bg-[#00109E]` / `bg-brand-accent` (turquoise `#35BFAD`).

---

### `src/components/pages/MeuPerfilCandidatoPage.tsx` (component) — strip candidatura lists (D-10)

**Analog:** itself — already a glass profile-edit page (`BackgroundImage` + `CandidatoNavbar` + `GlassCard`, dados-pessoais + senha forms, L1-104). Edit-in-place per D-15.

**What to remove (D-10, kills the `CAND-DASH-DUP-01` overlap):** the "VAGAS PARTICIPANDO" + "PROGRESSO" candidatura-list blocks (RESEARCH: L656-782) + the `useCandidaturas` import (L15) and `ETAPA_PROCESSO_LABELS`/`STATUS_CANDIDATURA_LABELS`/`Candidatura` imports (L16-17) if they become unused after the strip. Perfil = **dados pessoais + edição only**; the funnel/candidatura list lives on Dashboard now.

**What to keep:** `handleSalvarDados` (L55-104) supabase update + Zustand `setCandidato` sync — the data+edit responsibility. (This is the canonical candidate glass-shell page referenced by UI-SPEC §Persona shells — its layout is the visual reference for the 404 and Dashboard.)

---

### `src/components/RHSidebar.tsx` (nav component) — role-gated Admin item (D-13)

**Analog:** itself — the `menuItems` array (L59-92), `getActivePageFromPath` (L47-55), `handleMenuClick` routes map (L94-103). Extend in place, do not rewrite.

**Three touch points to mirror the existing item pattern** (RESEARCH §Code Examples + verified L47-103):
```tsx
import { ShieldCheck } from 'lucide-react'   // 24px, consistent with existing sidebar icons
const role = useAuthStore((s) => s.role)      // store is the single auth source

// 1. menuItems (L59-92) — append role-gated:
...(role === 'administrador'
  ? [{ id: 'admin', label: 'Admin', icon: <ShieldCheck size={24} /> }]
  : []),

// 2. getActivePageFromPath (L47-55) — add branch:
if (pathname.startsWith('/admin')) return 'admin';

// 3. handleMenuClick routes map (L96-103) — add default sub-nav target:
'admin': '/admin/ai-logs',
```
> **Visibility is cosmetic, NOT the control** — the `/admin/*` routes already carry `RoleGuard role="administrador"` (routes.tsx L491-524) + RLS. Hiding the item is UX only (UI-SPEC §Admin entry; RESEARCH §Security V4). Item carries a **visible "Admin" text label** (no icon-only affordance — a11y). The active-state class for the item reuses the existing `bg-[#35BFAD]` active style (L198-200).

---

### `e2e/navegacao.spec.ts` (test) — navigability smoke (D-16)

**Analogs (three, combined):**
- **Structure / fill-helpers / `test.describe`:** `e2e/cadastro-flow.spec.ts` L23-90 (imports `{ test, expect, type Page }`, local helpers, `Date.now()` unique fixtures).
- **Gated real-auth:** `e2e/login-flow.spec.ts` L17-73 — `const REAL_AUTH = process.env.E2E_AUTH_TEST_USERS === 'true'`; `const describeRealAuth = REAL_AUTH ? test.describe : test.describe.skip`; `TEST_USER` from env. Use this gate for the RH/admin + candidate journeys that need login.
- **Heading/CTA assertion (route, NOT data — D-16):** `e2e/explicacao-flow.spec.ts` L39-67 — `login(page)` helper, `page.goto(...)`, then `expect(page.getByRole('heading', {name:/.../i})).toBeVisible()` + `expect(page.getByRole('button'|'link', {name:/.../i})).toBeVisible()`.

**Assertion pattern to mirror** (RESEARCH §Code Examples):
```ts
// Journey 4 (unconditional — no auth): invalid URL → 404
await page.goto('/rota/invalida/xyz')
await expect(page.getByRole('heading', { name: /Página não encontrada/i })).toBeVisible()
await expect(page.getByRole('link', { name: /Voltar/i })).toBeVisible()
// Journeys 1-3 (gated real-auth via describeRealAuth):
//   1. candidato login → Dashboard step-CTA → /candidato/avaliacao/:id heading
//   2. RH login-rh → TriagemTable "Ver Perfil" → hub heading → "Abrir {label}" → each of 3 workspace headings
//   3. admin login → sidebar "Admin" → /admin/* heading
```
> **Known limitation (RESEARCH A3):** only `administrador` test creds exist (0 `recrutador` rows — MEMORY `reference_auth_hook_rls_gap`). The generic-`rh` journey has no seeded account; document it as a smoke gap. Workspace headings to assert: "Entrevista" (`EntrevistaWorkspace` L114), "Decisão final" (`DecisaoFinalPage` L131), `RedacaoReviewPanel` (RHLayout-shelled, L203).

---

## Shared Patterns

### candidaturaId is the universal key (THE central landmine — Pitfall 1)
**Source of truth:** every workspace does `const { id } = useParams<{ id: string }>()` and treats `id` as a **candidatura id** (`EntrevistaWorkspace.tsx` L62-63, `DecisaoFinalPage.tsx` L72, `RedacaoReviewPanel.tsx` L144). Every hub hook keys on candidaturaId (`useScorecardCandidato.ts` L18-19, `useExplicacao.ts` L34-35, `useConsolidacao.ts` L21-24).
**Apply to:** `funilNavMap` (route fns take `candidaturaId`), the hub (`useParams` id = candidaturaId), the Dashboard CTA (`entry.rotaCandidato(candidatura.id)`), the D-08 redirect.
**The trap:** `TriagemTable.tsx` L324-325 links `<a href={/rh/candidatos/${candidato?.id}}>` — a **candidato id** via a full-page `<a href>`. But `TriagemRow.id` is the **candidatura** id. The planner MUST lock the hub's id contract = **candidaturaId** (change the TriagemTable link to `row.id`, prefer SPA `navigate`/`<Link>`), or every wired workspace CTA hands the wrong id and renders blank. State the chosen id in a D-NN-citing truth.
```tsx
// EntrevistaWorkspace.tsx L62-67 — the contract to honor:
const { id } = useParams<{ id: string }>()
const candidaturaId = id ?? ''
const { data: contexto } = useEntrevistaContexto(candidaturaId)
const vagaId = contexto?.vaga_id   // resolve vaga from candidatura, never the reverse
```

### candidate landing is `/candidato/perfil`, NOT `/candidato/dashboard` (Pitfall 3 / A5)
**Source:** `RoleGuard.tsx` L48-52 `ROLE_HOME.candidato = '/candidato/perfil'`; post-login/cadastro/candidatura all land on perfil. Dashboard is reached only as a "back" target today.
**Apply to:** Dashboard (D-09 makes it the funnel hub) + the D-16 smoke journey #1. The planner must EITHER repoint `ROLE_HOME.candidato` + post-flow navigations to `/candidato/dashboard`, OR surface the funnel CTA from Perfil too — else the funnel stays unreachable despite a green smoke. This is a load-bearing IA decision (HIGH risk if ignored). The 404 back-link + smoke must start where users actually land.

### `bg-primary` is broken project-wide (Pitfall 4 / D-26)
**Source:** `tailwind.config` expects HSL components but `globals.css` defines HEX → `hsl(#00109E)` invalid; `bg-primary` renders transparent/wrong.
**Apply to:** NotFoundPage, the hub, the Dashboard accent CTA, the LGPD card. Use `bg-[#00109E]` hex literal (precedent `LoginCandidatoPage`) or valid glass tokens `bg-brand-primary/NN` / `bg-white/NN` / accent `bg-[#35BFAD]` (the sidebar active-state precedent, `RHSidebar.tsx` L199). **Never `bg-primary`.**

### RoleGuard + RLS is the real control; sidebar visibility is cosmetic
**Source:** `RoleGuard.tsx` (UX guard) + Supabase RLS (real enforcement); `/admin/*` already `RoleGuard role="administrador"` (routes.tsx L491-524).
**Apply to:** the Admin sidebar item (D-13) — gate visibility on `useAuthStore(s => s.role) === 'administrador'`, but rely on the existing route guard + RLS for actual access (defense-in-depth, already shipped). Do not weaken or add a new access boundary.

### Query-key + `useQuery` convention (reuse, do not reinvent reads)
**Source:** `useScorecardCandidato.ts` L16-39 — hierarchical keys (`{all, byCandidatura(id)}`), `enabled: !!candidaturaId`, `staleTime: 5*60*1000`, `retry: 2`. `useConsolidacao.ts` L18-41 and `useExplicacao.ts` L31-65 follow the same idiom.
**Apply to:** every hub section read — reuse the existing feature hooks verbatim (they are RLS-correct + allowlist-projected). Reusing them avoids the `select('*')` PII-leak class (MEMORY `reference_select_star_leaks_pii`). No new candidate-facing selects this phase.

### Pure `src/lib/` module convention (acyclic feature → lib)
**Source:** `opcoesNormalize.ts` L9-17 module doc — lives in `src/lib/` so BOTH a feature and a page import it without a `feature → feature` cycle.
**Apply to:** `funilNavMap.ts` — same rationale (Dashboard page + hub feature both import it). Named exports, no React/Supabase, pure functions.

---

## No Analog Found

*(none — every file maps to an in-repo analog; this is a wiring/IA phase over shipped M2 code)*

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | — |

---

## Metadata

**Analog search scope:** `src/lib/`, `src/components/pages/`, `src/components/` (RoleGuard, RHSidebar, RHLayout), `src/features/{triagem,avaliacao,entrevista,decisao,explicacao,vagas,avaliacao-cognitiva}/{hooks,components,services}`, `src/router/`, `e2e/`
**Files scanned:** ~18 (routes.tsx, triagemService.ts, opcoesNormalize.ts, RoleGuard.tsx, RHSidebar.tsx, RHLayout.tsx, TriagemTable.tsx, MeuPerfilCandidatoPage.tsx, DashboardCandidatoPage.tsx, PerfilCandidatoRHPage.tsx, EntrevistaWorkspace.tsx, DecisaoFinalPage.tsx, RedacaoReviewPanel.tsx, useScorecardCandidato.ts, useExplicacao.ts, useConsolidacao.ts, vagasTypes.ts, e2e/{cadastro,login,explicacao}-flow.spec.ts)
**Pattern extraction date:** 2026-06-28
**Read-only:** no source files modified; PATTERNS.md is the only artifact written.
