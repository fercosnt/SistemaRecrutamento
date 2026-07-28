# Phase 17: Navegação & Arquitetura de Informação - Research

**Researched:** 2026-06-28
**Domain:** Frontend navigation wiring + Information Architecture + legacy cleanup (React 18 + React Router v6 + TanStack Query v5 + Zustand)
**Confidence:** HIGH (router map, orphan proof, id-semantics, legacy verdicts all verified directly against source; no external library research needed — this is an in-repo wiring phase)

## Summary

Phase 17 is a **navigation-wiring + IA + legacy-cleanup** phase over the M2 funnel that already shipped. The features work (UAT-proven in M2) but most of the funnel has **no inbound navigation** in production — it is reachable only by direct URL or the DEV-only `DevNavigationMenu`. This research verified, against source, exactly which routes are orphaned, where the entry points are, what id each route expects, which legacy files are provably dead, and what test patterns exist. No new product capability is added.

The single most load-bearing finding the planner must internalize: **`candidaturaId` is the universal key across the entire M2 funnel.** Every workspace (`/rh/candidato/:id/{entrevista,decisao,redacao}`) reads `useParams<{ id }>()` and treats `id` as a **candidatura id**; every candidate evaluation route and every hub data hook (`useScorecardCandidato`, `useExplicacao`, `useEntrevistaContexto`) is keyed by **candidaturaId**. But the existing hub entry link in `TriagemTable` (line 325) navigates with a **candidato id** (`candidato?.id`) to `/rh/candidatos/:id`. The route-normalization decision (D-08) and the hub rewrite (D-05) must reconcile this candidato-id-vs-candidatura-id mismatch, or the wired CTAs will hand the wrong id to the workspaces.

**Primary recommendation:** Build `src/lib/navegacao/funilNavMap.ts` as the single source mapping `EtapaFunilM2 → { rotaCandidato, rotaWorkspaceRH, label, cta }` (D-17), keyed/parameterized by **candidaturaId**. Wire the candidate Dashboard CTA and the RH hub from this one map. Normalize the route inconsistency so the hub operates on a candidatura id (the funnel's native key). Hard-delete only `VagaLPPage` now (verified dead); apply route-coupled case-by-case verdicts below for the rest. Protect all four journeys with a Playwright navigability smoke that asserts route/heading resolution (not data flow), reusing the gated-real-auth pattern already in `e2e/login-flow.spec.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

> This standalone mini-fase has **no REQ-IDs**. Trackable decisions are D-01..D-17. The downstream
> decision-coverage gate reads plan frontmatter `must_haves`/`truths`/`objective`, so every plan MUST
> cite the D-NN it implements in a traceability `truth`.

### Locked Decisions (verbatim from CONTEXT.md ## Decisions)

**Escopo & Definition of Done**
- **D-01:** Mini-fase **standalone** (fora de milestone) cobrindo as **7 recomendações** do nav-audit. Registrada como Phase 17 no ROADMAP.md fora dos milestones v1.0/v2.0.
- **D-02:** `DevNavigationMenu` **mantido como rede de segurança DEV-only** (`App.tsx`, gated por `import.meta.env.DEV`). NÃO remover até a navegação de produção cobrir 100%.
- **D-03:** **DoD = wiring + teste(s) E2E de jornada navegável.** O E2E é o gate que prova navegabilidade clicando (não por URL). Implementa a lição do §8 do audit ("gate de jornada navegável").

**Funil RH — entrada + hub de candidato**
- **D-04:** Modelo de entrada = **Hub de candidato (opção A)**. Fluxo `TriagemTable → hub do candidato → workspace`. O link `nome → /rh/candidatos/:id` já existe na TriagemTable (linha 325) — muda-se o conteúdo de destino, não o link.
- **D-05:** `PerfilCandidatoRHPage` (mock de 1864 linhas, dados hardcoded) **reescrito como hub real** reusando os services de `features/*`. **Dropar** as abas DISC / Raven / manifesto (conceitos do funil antigo, não existem no M2). Resolve `ENTREV-PERFIL-DUP-01`.
- **D-06:** Hub **guiado por `etapa_atual`**: CTA "próximo passo" em destaque para o workspace da etapa corrente + acesso às etapas já percorridas; etapas futuras aparecem como empty state (não somem).
- **D-07:** Hub **"bem completo"** — reflete o **pipeline inteiro** do candidato. **Nunca inventar dados**: cada seção lê de service real ou mostra empty state.
- **D-08:** **Padronizar a inconsistência de rotas** `/rh/candidatos/:id` (plural, perfil) vs `/rh/candidato/:id/*` (singular, workspaces) → um padrão único + **redirects** das rotas antigas para não quebrar links existentes.

**Funil candidato — Dashboard / Perfil / LGPD**
- **D-09:** **Dashboard = hub do funil do candidato** — minhas candidaturas + **CTA guiado por etapa** que roteia para a etapa pendente (`/candidato/avaliacao/:id` e órfãs redação/cognitiva). Espelha o modelo guiado-por-etapa do RH.
- **D-10:** **Perfil = dados pessoais + edição** (papel distinto do Dashboard). Resolve a sobreposição funcional `CAND-DASH-DUP-01` (hoje ambos listam candidaturas+status).
- **D-11:** **Explicação LGPD** (`/candidato/explicacao/:id`) alcançável via **card in-app no Dashboard** quando há decisão final. É o único caminho que existe hoje (sem infra de notificação/e-mail).

**Limpeza de legado / Admin / 404**
- **D-12:** **Remoção conservadora.** Deletar AGORA só o **comprovadamente morto** (`VagaLPPage` — 1213 linhas, zero-imports já confirmado). Os "prováveis legado" (`/testes/*`, `QuestionarioPage`/`QuestionarioCulturaPage`, `InscricaoPage`, `MeuPerfilPage`, `GlassShowcase`) → **verificação caso-a-caso** (confirmar zero-uso real) antes de deletar; **deferir** o que não for confirmado morto. Hard-delete (arquivo + rota) só sobre o que passar na verificação.
- **D-13:** **Entrada admin** = item **"Admin" no sidebar RH**, role-gated (`administrador`), abrindo sub-navegação para `/admin/*` (`ai-logs`, `prompt-versions`, `ai-costs`, `bias-audit`). Reusa o sidebar existente.
- **D-14:** **404 estilizada Beauty Smile** com catch-all `path: '*'` + link de volta (home ou dashboard conforme role). O router hoje não tem catch-all nem NotFound.

### Claude's Discretion (verbatim from CONTEXT.md ## Claude's Discretion)
- **D-15 (Arquitetura de pastas):** **Migração híbrida.** Telas novas substanciais (o hub reescrito) nascem em `src/features/` seguindo a convenção do CLAUDE.md; **edições** em telas existentes (DashboardCandidatoPage, MeuPerfilCandidatoPage) **ficam em `src/components/pages/`** para minimizar churn/risco. Lógica compartilhada de navegação → `src/lib/`. **Sem migração em massa** de pages→features.
- **D-16 (Escopo do teste E2E):** **Smoke de navegabilidade** (Playwright, precedente `cadastro-flow.spec.ts`). Cobre as 4 jornadas que a auditoria marcou ❌ QUEBRA. Asserta que links/CTAs **resolvem para a tela certa** (rota/heading), **não** o fluxo de dados ponta-a-ponta.
- **D-17 (Mapa etapa→tela):** **Fonte única.** Módulo nav-map em `src/lib/navegacao/funilNavMap.ts` reusando `EtapaFunilM2` + `ETAPA_M2_LABELS` de `src/features/triagem/services/triagemService.ts`, mapeando `etapa_atual → { rota candidato, rota workspace RH, label, CTA }`. Consumido tanto pelo CTA do Dashboard (candidato) quanto pelo hub (RH).

### Deferred Ideas (OUT OF SCOPE — do not research/recommend)
- **Sistema de notificação / e-mail** (entrada "ideal" para LGPD e funil — sem infra hoje; futuro).
- **Atalhos diretos por etapa na linha da TriagemTable** (o "tempero" da opção C — refinamento futuro).
- **Migração em massa `components/pages/` → `features/`** — fora de escopo; só o hub novo migra (D-15).
- **Reescrever as abas do mock como telas separadas** (bigfive/disc/raven/formulario) — NÃO; já têm telas reais.
- **ENTREV-GUIA-EDIT-01** (RH editar perguntas no guia) — deferido; depende do workspace estar acessível (que ESTA fase entrega).
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Route table + catch-all 404 + normalization redirects | Browser/Client (React Router config) | — | Pure SPA routing; `src/router/routes.tsx` is the single declarative table |
| `funilNavMap` (etapa→tela) | Browser/Client (`src/lib/`) | — | Pure derivation from an enum; no I/O. Shared logic, not a feature |
| RH candidate hub (read pipeline → render sections/CTAs) | Browser/Client (`src/features/` component) | API/DB (read via existing `features/*` services + RLS) | Hub is a read-only composition of existing services; no new write/auth |
| Candidate Dashboard step-CTA + LGPD card | Browser/Client (`src/components/pages/`) | API/DB (read via `useCandidaturas`) | Edit-in-place per D-15; reads existing candidatura data |
| Admin sidebar entry (role-gated nav item) | Browser/Client (`RHSidebar`) | — | Role read from Zustand store; real authorization stays in RoleGuard + RLS (defense-in-depth already shipped) |
| Legacy file deletion | Build-time (file removal + route removal) | — | Code-level cleanup; no runtime/user-facing surface |
| Navigability smoke E2E | Test harness (Playwright) | API/DB (gated real-auth round-trip) | Asserts route/heading resolution; real auth gated behind `E2E_AUTH_TEST_USERS` |

**Tier sanity check for the planner:** Nothing in this phase belongs in the API/Edge-Function tier. There are **zero** new RPCs, migrations, or Edge Functions. Any plan task proposing a DB/EF change is mis-scoped — this is a client-routing + IA phase. Authorization stays where M2 already enforced it (RoleGuard for UX + Supabase RLS for real enforcement); the admin sidebar item is a navigation affordance, not a new access-control boundary.

## Standard Stack

**No external packages installed this phase.** Everything is already in the repo. The "stack" below is the in-repo modules the planner must reuse rather than reinvent.

### Core (already present — REUSE, do not add)
| Module | Location | Purpose | Why Standard |
|--------|----------|---------|--------------|
| React Router v6 `RouteObject[]` | `src/router/routes.tsx` | Single declarative route table | Already the project's only routing source; catch-all + redirects go here `[VERIFIED: src/router/routes.tsx]` |
| `RoleGuard` | `src/components/RoleGuard.tsx` | Role-aware route guard (`role: Role \| Role[]`) | Used by every protected route; admin gating reuses it `[VERIFIED: src/components/RoleGuard.tsx]` |
| `EtapaFunilM2` + `ETAPA_M2_LABELS` | `src/features/triagem/services/triagemService.ts` (L293/L316) | The 8-value funnel enum + pt-BR labels | D-17 single source; do NOT create a parallel enum `[VERIFIED: triagemService.ts L293-325]` |
| TanStack Query v5 hooks (`useCandidaturas`, `useScorecardCandidato`, `useExplicacao`, `useEntrevistaScorecard`, `useComparativo`, `useRedacaoRevisao`) | `src/features/*/hooks/` | Service-backed reads for hub sections (D-07) | Each keyed by `candidaturaId`; reuse for empty-state-aware sections `[VERIFIED: grep src/features/*/hooks]` |
| `RHLayout` / `RHSidebar` / `RHTopBar` | `src/components/` | RH shell (sidebar + topbar) wrapping every RH/admin screen | Hub + admin item live in this shell; workspaces already mount it `[VERIFIED: RHLayout.tsx, EntrevistaWorkspace.tsx:112]` |
| `CandidatoNavbar` + `BackgroundImage` + glass primitives | `src/components/layouts/`, `src/components/ui/glass.tsx` | Candidate persona shell + glass surfaces (Dashboard, Perfil, 404) | Per UI-SPEC; reuse canonical pattern `[VERIFIED: CandidatoNavbar.tsx]` |
| Playwright (gated real-auth) | `e2e/` + `playwright.config.ts` | Navigability smoke (D-16) | `e2e/login-flow.spec.ts` precedent; baseURL `:3003`, 3 projects `[VERIFIED: playwright.config.ts]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `RouteObject[]` redirects via `<Navigate>` element | `loader`/`redirect()` data-router API | Repo uses the element/object form throughout — stay consistent; introducing data-router redirect() is churn (rejected per D-15 conservative scope) |
| New `src/features/hub-candidato/` for the hub | Keep hub in `src/components/pages/` | D-15 explicitly says substantial NEW screens go in `features/` — the hub qualifies; edits to existing pages stay in `pages/` |
| Parallel etapa enum in `lib/navegacao` | Reuse `EtapaFunilM2` | D-17 mandates reuse; a parallel enum drifts when the DB enum changes (the exact bug `ETAPA_M2_LABELS` was created to fix — see triagemService.ts L307-314) |

**Installation:** none. `npm install` adds nothing this phase.

## Package Legitimacy Audit

> Not applicable — this phase installs **zero** external packages. All modules are in-repo (verified above). No registry lookups, slopcheck, or supply-chain gate is triggered.

| Package | Registry | Disposition |
|---------|----------|-------------|
| (none) | — | No external packages added |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram — navigation graph (current vs. target)

```
CURRENT (production reachable — solid) vs ORPHAN (dashed = direct-URL/DevNav only)

  PUBLIC          CANDIDATE                          RH / ADMIN
  ──────          ─────────                          ──────────
  /  ──► /vagas ──► /vagas/:id ──► /cadastro          /auth/login-rh ──► /rh/dashboard
                                      │                                       │ (sidebar)
                                      ▼ (login/cadastro lands here)           ├─► /rh/candidatos
            ┌──────────────► /candidato/perfil ◄── ROLE_HOME.candidato        ├─► /rh/vagas ──► /rh/vagas/:id/candidatos
            │  (CandidatoNavbar "Área")        │                              │        (TriagemTable, REAL)
            │                                  │ "Ver Perfil"  <a href>       │              │
   /candidato/dashboard  ◄─(only "back" from   │  candidato.id                │              ▼
       │  orphans; NOT a real entry today)     ▼                              │     /rh/vagas/:id/comparativo
       │                          ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄              │
       ┊ (D-09 wires CTA)         ┊ /rh/candidatos/:id  =  MOCK 1864 LoC      │
       ▼                          ┊ (PerfilCandidatoRHPage, hardcoded)        │
  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄         ┊                                          │
  ┊ /candidato/avaliacao/:id ┊    └─►  D-05 REWRITE → HUB (etapa-aware)        │
  ┊  ├ /mc  ├ /caso          ┊            │  reads features/* services        │
  ┊  ├ /bigfive[/devolutiva] ┊            │  CTA via funilNavMap (candidaturaId)
  ┊ /candidato/redacao/:id   ┊            ▼ (D-04/D-06 wires)                  │
  ┊ /candidato/prova-cognitiva/:id        ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄    │
  ┊ /candidato/explicacao/:id ┊  ◄─D-11   ┊ /rh/candidato/:id/entrevista  ┊ ◄─┘ D-13 admin item
  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄         (card)  ┊ /rh/candidato/:id/decisao     ┊      adds sidebar →
                                          ┊ /rh/candidato/:id/redacao     ┊      /admin/{ai-logs,
  KEY MISMATCH (D-08): hub link carries   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄        prompt-versions,
  candidato.id, but workspaces' useParams id = candidaturaId.                    ai-costs,bias-audit}
  funilNavMap MUST emit candidaturaId-based workspace routes.

  /*  (catch-all) ──► D-14 NotFound (role-aware back-link)   [ABSENT today]
```

**Data-flow trace (target):** RH clicks a name in TriagemTable → `funilNavMap` reads the candidatura's `etapa_atual` → hub renders the full pipeline (each section reads its `features/*` service, empty-state when no data) → "Abrir {label}" CTA navigates to `rotaWorkspaceRH(candidaturaId)`. Candidate side mirrors it: Dashboard reads `useCandidaturas`, the per-candidatura CTA reads `funilNavMap[etapa_atual].rotaCandidato(candidaturaId)`; when `etapa_atual ∈ {decisao_final, aprovado, rejeitado}` and a decisão exists, the LGPD card links to `/candidato/explicacao/:candidaturaId`.

### Recommended Project Structure (D-15 hybrid)
```
src/
├── lib/
│   └── navegacao/
│       └── funilNavMap.ts        # NEW — single source: EtapaFunilM2 → { label, rotaCandidato, rotaWorkspaceRH, ctaCandidato, ctaRH }
│                                  #       reuses EtapaFunilM2 + ETAPA_M2_LABELS (no parallel enum)
├── features/
│   └── <hub-candidato>/          # NEW — substantial rewrite of the RH hub (D-05/D-15)
│       ├── components/           #       HubCandidatoRH + section components
│       ├── hooks/                #       (thin; mostly reuses existing features/* hooks)
│       └── types/
├── components/
│   ├── pages/
│   │   ├── DashboardCandidatoPage.tsx   # EDIT in place (D-09) — replace mock "Testes disponíveis" block (L311-402) with funnel CTA + LGPD card
│   │   ├── MeuPerfilCandidatoPage.tsx   # EDIT in place (D-10) — remove "VAGAS PARTICIPANDO" + "PROGRESSO" candidatura lists (L656-782)
│   │   └── NotFoundPage.tsx              # NEW (D-14) — Beauty Smile glass 404, role-aware back-link
│   ├── RHSidebar.tsx             # EDIT (D-13) — add role-gated "Admin" item + /admin/* active-state branch
│   └── RoleGuard.tsx             # (reused; ROLE_HOME.candidato may need review — see Pitfall 3)
└── router/routes.tsx            # EDIT — catch-all path:'*' (D-14) + normalization redirects (D-08)
```

### Pattern 1: `funilNavMap` single source (D-17)
**What:** A `Record<EtapaFunilM2, ...>` keyed by the 8 enum values, emitting candidaturaId-parameterized routes + labels reused from `ETAPA_M2_LABELS`.
**When to use:** Both the candidate Dashboard CTA and the RH hub CTA/section navigation.
**Contract (shape from UI-SPEC §Interaction Contract):**
```typescript
// src/lib/navegacao/funilNavMap.ts
// Source: D-17 + verified enum at src/features/triagem/services/triagemService.ts L293-325
import { type EtapaFunilM2, ETAPA_M2_LABELS } from '@/features/triagem/services/triagemService'

interface FunilNavEntry {
  label: string                                  // = ETAPA_M2_LABELS[etapa]
  rotaCandidato: (candidaturaId: string) => string | null   // null = no candidate-facing screen for this etapa
  rotaWorkspaceRH: (candidaturaId: string) => string | null // null = no RH workspace for this etapa
  ctaCandidato: string                           // "Continuar para {label}" (interpolated)
  ctaRH: string                                  // "Abrir {label}"
}

// 8 keys MUST be exhaustive (TS will enforce Record<EtapaFunilM2, ...>):
// inscricao · triagem · avaliacao_assincrona · entrevista_online ·
// entrevista_presencial · decisao_final · aprovado · rejeitado
```
**Verified route targets per etapa (from routes.tsx, all `:id` = candidaturaId):**
| EtapaFunilM2 | rotaCandidato | rotaWorkspaceRH |
|--------------|---------------|-----------------|
| `inscricao` | `/candidato/dashboard` (no pending screen) | hub only |
| `triagem` | acompanhar (no candidate action) | `/rh/candidato/:id` (hub) — triage is RH-side |
| `avaliacao_assincrona` | `/candidato/avaliacao/:id` | hub (review scores) |
| `entrevista_online` | (RH-scheduled; candidate acompanha) | `/rh/candidato/:id/entrevista` |
| `entrevista_presencial` | (RH-scheduled) | `/rh/candidato/:id/entrevista` |
| `decisao_final` | acompanhar + LGPD card when decided | `/rh/candidato/:id/decisao` |
| `aprovado` | acompanhar | `/rh/candidato/:id/decisao` |
| `rejeitado` | LGPD card → `/candidato/explicacao/:id` | `/rh/candidato/:id/decisao` |

> Note `/candidato/prova-cognitiva/:id` and `/candidato/redacao/:id` are sub-screens of the avaliação container (opt-in / essay), not their own etapa. They are reached from inside `/candidato/avaliacao/:id` (the container already navigates to them — verified AvaliacaoContainer.tsx:312). The map should route the candidate to `/candidato/avaliacao/:id` during `avaliacao_assincrona`; the container fans out internally. `[ASSUMED — A2]`

### Pattern 2: Route normalization via `<Navigate>` redirect (D-08)
**What:** Keep the new canonical pattern and add redirect route entries for the old paths.
**Example:**
```tsx
// Source: react-router-dom RouteObject element form (repo convention, routes.tsx)
// If canonical becomes /rh/candidato/:id (singular) for BOTH hub and workspaces:
{ path: '/rh/candidatos/:id', element: <Navigate to="/rh/candidato/:id" replace /> }  // ⚠ see Pitfall 5 — params don't interpolate in `to`
```
**Reality check (Pitfall 5):** React Router does NOT interpolate `:id` inside a static `to` string. A param-preserving redirect needs a tiny wrapper component that reads `useParams()` and returns `<Navigate to={...} replace />`, OR the redirect is done at the new route. The planner must not write `<Navigate to="/rh/candidato/:id" />` literally.

### Anti-Patterns to Avoid
- **Parallel etapa enum / hardcoded labels in the nav map** — reuse `EtapaFunilM2` + `ETAPA_M2_LABELS` (D-17). A parallel copy reintroduces the exact 22P02 drift bug documented at triagemService.ts L307-314.
- **Passing candidato.id where a candidaturaId is expected** — the central landmine (see Pitfall 1). Workspaces + all hub hooks key on candidaturaId.
- **Using `bg-primary`** — broken project-wide (D-26); use `bg-[#00109E]` hex literal or glass `bg-brand-primary/NN` (see Pitfall 4).
- **Inventing hub data** — the sin of the 1864-line mock (D-05/D-07). Every section reads a real service or shows the explicit empty state from UI-SPEC.
- **Removing or weakening `DevNavigationMenu`** — D-02 keeps it as the DEV-only safety net until production nav covers 100%. There is a grep guard (`src/__tests__/guards/devnav-gate.grep.test.ts`) — do not break it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| etapa → screen mapping | Inline `switch(etapa)` in Dashboard AND hub | `funilNavMap.ts` (D-17) | Two switches drift; one map is exhaustive-checked by TS over `Record<EtapaFunilM2, ...>` |
| etapa pt-BR labels | New label dict | `ETAPA_M2_LABELS` | Already the funnel's source-of-truth; matches DB enum |
| Hub pipeline reads (score, sjt, big five, cognitiva, entrevista, decisão, LGPD) | New fetch logic | Existing `features/*` hooks (`useScorecardCandidato`, `useEntrevistaScorecard`, `useComparativo`, `useExplicacao`, …) | All exist, RLS-correct, allowlist-projected; rebuilding risks the `select('*')` PII leak (see MEMORY reference_select_star_leaks_pii) |
| Role gating of the admin item | Manual `localStorage` role check | `useAuthStore(state => state.role) === 'administrador'` + RoleGuard on routes | Store is the single auth source; routes already RoleGuard-protected for real enforcement |
| Candidate persona shell (navbar/avatar/logout) | New header JSX | `CandidatoNavbar` | Already extracted (Phase 5 WR-02-09) to kill copy-paste drift |
| RH shell | New layout | `RHLayout` (sidebar+topbar+darkBlue bg) | Workspaces + admin pages already use it |

**Key insight:** This phase's value is *connecting* existing pieces. Almost every "build" instinct here is wrong — the corresponding piece already exists and is service-backed. The two genuinely-new artifacts are `funilNavMap.ts` (pure derivation) and `NotFoundPage.tsx` (presentational). Everything else is wiring + deletion + one rewrite that *replaces* hardcoded data with existing service calls.

## Runtime State Inventory

> Rename/refactor/cleanup phase → this inventory applies to the **legacy deletions** (D-12). For deletions, the relevant "runtime state" is: what still references the file/route after the file is removed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no DB rows key on any deleted page/route. The funnel keys on candidaturaId, not on legacy `/testes/*` routes. **Verified:** none of the deleted routes appear in any service/migration. | none |
| Live service config | None — no external service (n8n, Datadog, etc.) references these client routes. Pure SPA paths. | none |
| OS-registered state | None — client-only. | none |
| Secrets/env vars | The E2E real-auth path reads `TEST_USER_EMAIL/PASSWORD/E2E_AUTH_TEST_USERS` (existing, `.env.test`). The RH-journey smoke (D-16) will need RH/admin test creds. **Note from MEMORY:** 0 accounts with role `recrutador`; only `administrador` accounts exist (`reference_auth_hook_rls_gap`). The admin journey can seed; the generic-`rh` journey has no test account. | Provide an `administrador` test credential for the RH/admin smoke (gated). Document that `rh`-only path lacks a seeded account. |
| Build artifacts | Deleting a page file requires deleting (a) its route entry in `routes.tsx`, (b) its import at the top of `routes.tsx`, AND (c) its entry in the `devNavigationPages` array (routes.tsx L533-567). Leaving a stale import → TS build break; leaving a stale devNav entry → DevNav link to a 404. | For each confirmed-dead file: delete file + import + route + devNav entry, atomically. |

**The canonical question — after every reference is removed, what still points at the deleted file?** Answer (verified by grep): for `VagaLPPage`, nothing (it has no route, no import, only self-references). For the route-coupled legacy pages, only `routes.tsx` (import + route + devNav map). No runtime caching, no DB, no external service. Deletion is safe once those three `routes.tsx` references go.

## Common Pitfalls

### Pitfall 1: candidato.id vs candidaturaId mismatch (THE central landmine)
**What goes wrong:** The hub wires "Abrir Entrevista" → `/rh/candidato/<candidato.id>/entrevista`, but `EntrevistaWorkspace` does `const candidaturaId = useParams().id` and feeds it to `useEntrevistaContexto(candidaturaId)`. A candidato id there yields no contexto → blank/empty workspace.
**Why it happens:** `TriagemTable` line 325 link is `href={/rh/candidatos/${candidato?.id}}` (candidato), but `TriagemRow.id` (verified triagemService.ts L76) is the **candidatura** id, and ALL workspaces + hub hooks (`useScorecardCandidato`, `useExplicacao`, `useEntrevistaContexto`) key on candidaturaId.
**How to avoid:** Decide the hub's id contract explicitly. Cleanest: the hub operates on a **candidaturaId** (change the TriagemTable link to use `row.id`, and normalize the route to carry candidaturaId). If the route must stay candidato-keyed, the hub must resolve the candidatura(s) for that candidato before emitting workspace CTAs. The planner MUST state which id `/rh/candidatos/:id` (or its normalized form) carries.
**Warning signs:** Workspace renders but every section is empty for a real candidate; `useEntrevistaContexto` returns undefined; `vagaId` never resolves.

### Pitfall 2: `<a href>` full-page reload vs SPA `<Link>`/`navigate`
**What goes wrong:** The existing hub entry (TriagemTable L324) is a raw `<a href>` — a full document reload, not SPA navigation. New CTAs should use `useNavigate()`/`<Link>` for SPA behavior; mixing causes a flash + auth re-hydration on each click.
**Why it happens:** Legacy code used `<a href>`; the rest of the app uses `navigate()`.
**How to avoid:** Use `useNavigate()` (sidebar precedent) or React Router `<Link>` for all new nav. If keeping the TriagemTable anchor for now, be aware the smoke test will still pass (URL resolves) but the UX differs.
**Warning signs:** Page flicker / full reload on "Ver Perfil"; Zustand re-init on click.

### Pitfall 3: candidate home is `/candidato/perfil`, NOT `/candidato/dashboard`
**What goes wrong:** D-09 makes Dashboard the funnel hub, but **today every post-login/cadastro/candidatura flow lands on `/candidato/perfil`** (verified: `ROLE_HOME.candidato = '/candidato/perfil'` RoleGuard.tsx:49; CandidatoNavbar "Área" → perfil; Cadastro/Login/Formulario all navigate to perfil). Dashboard is currently reached only as a "back" target from orphaned screens. If the CTA lives on Dashboard but users never land there, the funnel stays unreachable.
**Why it happens:** Historical IA — Perfil was the de-facto landing; Dashboard was secondary.
**How to avoid:** The planner must decide one of: (a) repoint `ROLE_HOME.candidato` + post-flow navigations to `/candidato/dashboard`, or (b) surface the funnel CTA from Perfil too (or a link Perfil→Dashboard). Whichever is chosen, the D-16 smoke journey #1 ("candidato pós-candidatura → avaliação pelo Dashboard") must start where users actually land. This is a load-bearing IA decision, not a styling choice.
**Warning signs:** Smoke test navigates to `/candidato/dashboard` directly (masking that no production path leads there); real users still can't reach avaliação.

### Pitfall 4: `bg-primary` is broken project-wide (D-26)
**What goes wrong:** `tailwind.config` expects HSL components but `globals.css` defines HEX → `hsl(#00109E)` is invalid; `bg-primary` renders wrong/transparent.
**How to avoid:** Use `bg-[#00109E]` hex literal (precedent LoginCandidatoPage) or glass `bg-brand-primary/NN` / `bg-white/NN` (valid). The 404 + hub + Dashboard CTA must NOT use `bg-primary`.
**Warning signs:** A "primary" surface renders transparent/white.

### Pitfall 5: React Router `<Navigate to="...:id">` does not interpolate params
**What goes wrong:** A normalization redirect written as `<Navigate to="/rh/candidato/:id" replace />` navigates literally to the string `/rh/candidato/:id`, not the resolved id.
**How to avoid:** Use a tiny redirect wrapper: `const { id } = useParams(); return <Navigate to={`/rh/candidato/${id}`} replace />`. Or avoid same-content duplicate routes by pointing the old path's `element` at the new component directly.
**Warning signs:** Redirect lands on a literal `:id` URL → 404 (or, post-D-14, the NotFound page).

### Pitfall 6: deleting a page without scrubbing all three `routes.tsx` references
**What goes wrong:** Removing `GlassShowcase.tsx` but leaving its `import { GlassShowcase }` → TS build break; leaving its `devNavigationPages` entry → DevNav link to a now-404 route.
**How to avoid:** For each confirmed-dead file, delete (1) file, (2) import line, (3) route object, (4) `devNavigationPages` entry — atomically. Run `npm run build` (tsc) after each deletion.
**Warning signs:** `tsc` error "Cannot find module"; DevNav shows a link that 404s.

### Pitfall 7: `MeuPerfilPage` (`/rh/perfil`) is NOT dead — has a live entry
**What goes wrong:** Treating `/rh/perfil` (RH self-profile, `MeuPerfilPage`) as legacy-dead and deleting it.
**Why it happens:** The nav-audit listed it as "provável mock/legado".
**How to avoid:** `RHTopBar.tsx:38` calls `navigate('/rh/perfil')` — it has a live in-app entry. Verdict: **KEEP/DEFER** (see Legacy table). Do not delete.
**Warning signs:** RH topbar "Meu Perfil" affordance 404s.

## Code Examples

### Reading etapa for the candidate CTA (Dashboard, D-09)
```tsx
// Source: verified hook signatures — useCandidaturas (vagas/hooks), funilNavMap (NEW)
const { data } = useCandidaturas(undefined, 'mais_recentes', { page: 1, limit: 50 })
// each candidatura carries id + etapa_atual + status + vaga (verified DashboardCandidatoPage usage)
const entry = funilNavMap[candidatura.etapa_atual]                 // exhaustive over EtapaFunilM2
const destino = entry.rotaCandidato(candidatura.id)               // candidaturaId, NOT vaga_id
// CTA: "Continuar para {entry.label}"  → onClick={() => destino && navigate(destino)}
```

### Hub section reading a real service with empty-state (RH hub, D-07)
```tsx
// Source: verified useScorecardCandidato signature (avaliacao/hooks/useScorecardCandidato.ts L26-33)
const { data: scores, isLoading } = useScorecardCandidato(candidaturaId)
if (isLoading) return <SectionSkeleton />
if (!scores?.length) return <EmptyState heading="Sem dados nesta etapa"
  body="Nenhum registro foi gerado ainda para esta etapa." />   // UI-SPEC copy
// else render the real scores — NEVER hardcode
```

### Admin sidebar item, role-gated (D-13)
```tsx
// Source: verified RHSidebar.tsx menuItems pattern (L59-92) + useAuthStore role
const role = useAuthStore((s) => s.role)
const menuItems: MenuItem[] = [
  /* ...existing 6 items... */
  ...(role === 'administrador' ? [{ id: 'admin', label: 'Admin', icon: <ShieldCheck size={24} /> }] : []),
]
// getActivePageFromPath needs: if (pathname.startsWith('/admin')) return 'admin'  (L47-55)
// handleMenuClick routes map needs: 'admin': '/admin/ai-logs'  (L96-103)  — default sub-nav target
```

### Catch-all 404 (D-14)
```tsx
// Source: react-router RouteObject form; append LAST in routes array (routes.tsx)
{ path: '*', element: <NotFoundPage /> }   // role-aware back-link reads useAuthStore().role
// no RoleGuard — must render for any/unknown role (UI-SPEC: standalone glass surface)
```

### Navigability smoke assertion (D-16, route/heading not data)
```ts
// Source: e2e/explicacao-flow.spec.ts + login-flow.spec.ts patterns
await page.goto('/rota/invalida/xyz')
await expect(page.getByRole('heading', { name: /Página não encontrada/i })).toBeVisible()
await expect(page.getByRole('link', { name: /Voltar/i })).toBeVisible()
// RH journey (gated real-auth): login-rh → TriagemTable → click name → hub heading → click "Abrir {label}" → workspace heading
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<a href>` for in-app nav (TriagemTable) | `useNavigate()` / `<Link>` (SPA) | repo-wide convention | New CTAs should be SPA; legacy anchor is the exception |
| Legacy M1 enum `EtapaProcesso` (bigfive/disc/raven/cultura) | M2 `EtapaFunilM2` (8 values) + `ETAPA_M2_LABELS` | M2 (Phase 6+) | The mock + `MeuPerfilCandidatoPage` still use M1 `ETAPA_PROCESSO_LABELS` — the rewrite/edit must switch to M2 labels |
| Per-page copy-pasted persona shell | `CandidatoNavbar` / `RHLayout` extracted | Phase 5 (WR-02-09) | Reuse the shared shells; don't reintroduce copies |

**Deprecated/outdated:**
- The DISC / Raven / manifesto funnel concepts: do NOT exist in M2. The mock's DISC/inteligencia(raven)/cultura tabs (verified PerfilCandidatoRHPage L216/L224/L257) are dropped (D-05).
- `ETAPA_PROCESSO_LABELS` (M1, vagasTypes) used in `MeuPerfilCandidatoPage` L709/L768 — the candidate funnel surfaces should read `ETAPA_M2_LABELS` for consistency with the actual DB enum.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The normalized canonical route pattern (singular `/rh/candidato/:id` vs plural) is a planner choice; both are viable as long as the id carried is a candidaturaId. | Pattern 2 / D-08 | Low — either works; the id semantics (Pitfall 1) is the real constraint, not the singular/plural choice |
| A2 | `/candidato/prova-cognitiva/:id` and `/candidato/redacao/:id` are sub-screens of the avaliação container, not standalone etapas; the candidate CTA routes to `/candidato/avaliacao/:id` and the container fans out. | Pattern 1 table | Medium — if a vaga's cognitiva is meant to be a separately-navigable etapa, the map needs an extra entry. Verified AvaliacaoContainer.tsx:312 navigates to `/candidato/redacao/:id` internally, supporting this. |
| A3 | An `administrador` E2E test credential can be provided for the gated RH/admin smoke; the generic-`rh` path has no seeded account (0 `recrutador` rows per MEMORY). | Runtime State Inventory | Low — admin path is testable; document the `rh`-account gap as a known smoke limitation |
| A4 | The hub belongs in a new `src/features/` dir (D-15 says substantial NEW screens go in features). | Recommended Structure | Low — D-15 is explicit; if the planner reads "rewrite of existing page" as an edit, it could land in pages/ instead. Either honors D-15's intent if churn stays bounded |
| A5 | Whether to repoint `ROLE_HOME.candidato`/post-flow nav to `/candidato/dashboard` (vs. surfacing the CTA on Perfil) is a planner IA decision, not pre-decided by CONTEXT. | Pitfall 3 | High if ignored — picking the wrong landing leaves the funnel unreachable for real users despite a green smoke test |

## Open Questions

1. **Which id does the normalized `/rh/candidatos/:id` (hub) carry — candidato or candidatura?**
   - What we know: workspaces + all hub hooks key on candidaturaId; TriagemTable currently passes candidato.id but `row.id` is the candidatura id.
   - What's unclear: whether the hub should resolve candidatura(s) from a candidato (one candidato can have multiple candidaturas), or be keyed per-candidatura directly.
   - Recommendation: Key the hub per **candidaturaId** (change TriagemTable link to `row.id`). A candidato with multiple candidaturas is naturally one row per candidatura in TriagemTable already. This avoids a candidato→candidatura resolution step and aligns with every downstream hook. The planner should lock this in a D-NN-citing truth.

2. **Does the candidate funnel CTA live on Dashboard (requiring a landing repoint) or also on Perfil?** (see Pitfall 3 / A5)
   - Recommendation: Make Dashboard the funnel hub per D-09 AND repoint the candidate landing (`ROLE_HOME.candidato` + post-cadastro/login/candidatura navigations) to `/candidato/dashboard`, leaving Perfil as data+edit (D-10). Verify the D-16 smoke starts from the real landing.

3. **Final legacy-deletion set** — see the per-file verdicts below; the planner confirms the "case-by-case" subset to delete now vs defer.

## Legacy Cleanup Verdicts (D-12 — per-file, evidence-based)

> Method: grep for (a) `import` of the component outside `routes.tsx`, (b) any `navigate()`/`<Link>`/`href` to its route outside `routes.tsx`. "Self-ref only" = the only match is the component's own `export function`. All verified 2026-06-28.

| File / Route | Component | External importers | In-app nav to route | VERDICT |
|--------------|-----------|--------------------|--------------------|---------|
| `src/components/pages/VagaLPPage.tsx` (no route) | VagaLPPage | none (self-ref only) | n/a (unrouted) | **HARD-DELETE NOW** — confirmed dead, zero refs, 1213 LoC. The only AGREED hard-delete (D-12). |
| `/testes/bigfive` + `/testes/bigfive/instrucoes` | TesteBigFivePage, InstrucoesBigFivePage | none (self-ref only) | none | **CONFIRMED-DEAD** — safe to delete file+route+devNav. Superseded by `/candidato/avaliacao/:id/bigfive`. |
| `/testes/disc` + `/instrucoes` | TesteDISCPage, InstrucoesDISCPage | none | none | **CONFIRMED-DEAD** — DISC not in M2 at all. |
| `/testes/raven` + `/instrucoes` | TesteRavenPage, InstrucoesRavenPage | none | none | **CONFIRMED-DEAD** — Raven not in M2. |
| `/testes/conclusao` | ConclusaoTestesPage | none | none | **CONFIRMED-DEAD**. |
| `/candidato/questionario` | QuestionarioPage | none | none | **CONFIRMED-DEAD** (orphan, no entry). |
| `/candidato/questionario-cultura` | QuestionarioCulturaPage | none | none | **CONFIRMED-DEAD** (orphan). |
| `/auth/inscricao` | InscricaoPage | none | none | **CONFIRMED-DEAD** — superseded by `/cadastro`. (Verify no auth-email link points to it before deleting; grep found none in src.) |
| `/showcase` | GlassShowcase | none | none | **CONFIRMED-DEAD** (dev showcase). |
| `/rh/perfil` | MeuPerfilPage | none | **`RHTopBar.tsx:38` navigate('/rh/perfil')** | **KEEP / DEFER** — has a LIVE in-app entry. NOT dead. Do not delete. |

**Net deletable now (verified zero in-app reachability):** `VagaLPPage` (hard-delete, agreed) + the `/testes/*` tree (7 components) + `QuestionarioPage` + `QuestionarioCulturaPage` + `InscricaoPage` + `GlassShowcase`. Each deletion = file + import + route + `devNavigationPages` entry. **`MeuPerfilPage` stays.** The planner may stage these conservatively (D-12) — `VagaLPPage` is risk-free; the route-coupled set is also low-risk given zero inbound nav, but each carries a route+devNav scrub.

> ⚠️ Per D-12, the planner decides how aggressively to delete the "provável legado" set. Research verdict: all listed above (except MeuPerfilPage) are provably zero-inbound-nav and safe. None are referenced by any service, migration, or external system (see Runtime State Inventory).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vite dev server (`npm run dev`, port 3003) | E2E baseURL, manual smoke | ✓ | per package.json | — |
| Playwright | D-16 navigability smoke | ✓ | installed (`@playwright/test`, 3 projects) | — |
| Vitest | unit tests (route table, funilNavMap) | ✓ | installed | — |
| `.env.test` real-auth creds (`TEST_USER_*`, `E2E_AUTH_TEST_USERS`) | gated RH/candidate smoke | ✓ (candidate) / partial (RH) | — | RH/admin needs an `administrador` test credential; `rh`-role account does not exist (0 `recrutador` rows) |
| Live Supabase | gated real-auth E2E only | ✓ | project `isljnozzlvckrgjjbjwp` | mocked specs (page.route) cover the non-auth core unconditionally |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** RH/admin gated smoke needs an `administrador` seed credential; the mocked, unconditional specs still run in CI without live auth.

## Validation Architecture

> `workflow.nyquist_validation` not explicitly false → section included. This phase's testable behaviors are **route resolution, redirects, role-gating, empty states, and the 404 catch-all** — navigation, not data flow (D-16).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit) + Playwright (E2E), both installed |
| Config file | `playwright.config.ts` (testDir `./e2e`, baseURL `http://localhost:3003`, projects: chromium + mobile-chrome + tablet, timeout 60s) — Vitest config lives in `vite.config.ts` (no separate `vitest.config.*`) |
| Quick run command | `npm run test:run` (Vitest single run) |
| Full E2E command | `npm run test:e2e` (Playwright) |

### Phase Decision → Test Map (no REQ-IDs; tracks D-NN)
| Decision | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|-------------------|-------------|
| D-17 | `funilNavMap` is exhaustive over the 8 `EtapaFunilM2` values + emits candidaturaId routes + reuses `ETAPA_M2_LABELS` | unit | `npm run test:run -- funilNavMap` | ❌ Wave 0 (`src/lib/navegacao/__tests__/funilNavMap.test.ts`) |
| D-14 | catch-all `path:'*'` resolves any unknown URL to NotFound; role-aware back-link copy | unit + e2e | `npm run test:run -- routes` + `npm run test:e2e -- navegacao` | ❌ Wave 0 |
| D-08 | old `/rh/candidatos/:id` (and any normalized-away path) redirects param-preserving to the canonical route | unit (route table) + e2e | `npm run test:e2e -- navegacao` | ❌ Wave 0 |
| D-13 | "Admin" sidebar item renders ONLY for `administrador`; hidden for `rh`/`candidato`; routes to `/admin/*` | unit (RHSidebar render) | `npm run test:run -- RHSidebar` | ❌ Wave 0 |
| D-04/D-06 | RH: TriagemTable → hub → each of 3 workspaces resolves to the right heading (route, not data) | e2e (gated real-auth, admin cred) | `npm run test:e2e -- navegacao` | ❌ Wave 0 (`e2e/navegacao.spec.ts`) |
| D-09/D-11 | Candidate: Dashboard step-CTA → `/candidato/avaliacao/:id` heading; LGPD card → `/candidato/explicacao/:id` when decided | e2e (gated real-auth) | `npm run test:e2e -- navegacao` | ❌ Wave 0 |
| D-07 | hub sections show empty state (not invented data) when a service returns empty | unit (section component) | `npm run test:run -- hub` | ❌ Wave 0 |
| D-05/D-12 | mock data strings (DISC/Raven/manifesto + hardcoded "45%"/"Concluído") are GONE; deleted files have zero `routes.tsx` refs | grep guard (Vitest) | `npm run test:run -- legacy` or extend existing `*.grep.test.ts` | ❌ Wave 0 (or extend `src/__tests__/guards/`) |

### Sampling Rate
- **Per task commit:** `npm run test:run -- <touched-area>` (fast Vitest) + `npm run build` (tsc — note ~301 pre-existing baseline; do not grow it).
- **Per wave merge:** full `npm run test:run` + targeted `npm run test:e2e -- navegacao`.
- **Phase gate:** full Vitest green + Playwright navegacao spec green (gated real-auth scenarios run with `E2E_AUTH_TEST_USERS=true` + admin cred) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/lib/navegacao/__tests__/funilNavMap.test.ts` — exhaustiveness over `EtapaFunilM2` + candidaturaId param shape (D-17)
- [ ] `e2e/navegacao.spec.ts` — 4 journeys, route/heading assertions, gated real-auth for RH+candidate (D-16)
- [ ] `src/components/__tests__/RHSidebar.test.tsx` — admin item role-gating (D-13) — verify none exists yet
- [ ] Route-table unit test (catch-all present + redirect targets) (D-08/D-14)
- [ ] Legacy-deletion grep guard — assert deleted components have no `routes.tsx` import/route/devNav entry (D-12); may extend an existing `src/__tests__/guards/*.grep.test.ts`
- [ ] Hub empty-state unit test (D-07)
- [ ] `administrador` E2E credential wired into `.env.test` (gated) for the RH/admin journey

*(Existing infra to reuse: `e2e/login-flow.spec.ts` real-auth gating pattern, `e2e/explicacao-flow.spec.ts` heading/CTA assertion pattern, `playwright.config.ts` 3-project setup, `src/__tests__/guards/devnav-gate.grep.test.ts` grep-guard precedent.)*

## Security Domain

> `security_enforcement` absent in config → treat as enabled. This is a navigation phase with **no new auth/data surface** — security is "do not regress what M2 enforced."

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Authorization stays defense-in-depth: RoleGuard (UX) + Supabase RLS (real). The admin sidebar item is a nav affordance, NOT a new control — admin routes already `RoleGuard role="administrador"` (verified routes.tsx L491-524). |
| V4 Access Control | yes | Do not expose RH/admin nav to non-privileged roles. The "Admin" item must render only for `administrador` (D-13); the underlying `/admin/*` routes remain RoleGuard + RLS protected regardless of sidebar visibility (UI hiding is not the control). |
| V5 Input Validation | minimal | Route params (`:id`) are opaque UUIDs consumed by existing RLS-gated services; no new validation surface this phase. |
| V7 Error Handling | yes | 404 must not leak: a role-aware back-link is fine; the page must render for null/unknown role without exposing protected route names. |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hiding admin nav item ≠ access control (client-only gate) | Elevation of Privilege | Keep route-level RoleGuard + RLS; sidebar visibility is cosmetic only (already true) |
| `select('*')` PII leak if hub re-implements reads | Information Disclosure | REUSE existing allowlist-projected `features/*` services; do NOT write new candidate-facing selects (MEMORY: `reference_select_star_leaks_pii`, pego em Phase 8 security gate) |
| Candidate reaching RH workspace by guessing a candidaturaId URL | Elevation of Privilege | Unchanged — RoleGuard + RLS already deny; this phase adds inbound *links* for RH only, not new access |
| Open redirect via normalization (D-08) | Tampering | Redirect targets are static internal routes only; never derive a redirect target from user input |

## Project Constraints (from CLAUDE.md)

- **File Structure:** features in `src/features/<dominio>/{components,hooks,services,schemas,types}`; pages in `src/components/pages/` (legado, migrar gradualmente). D-15 hybrid honors this: hub→features, edits→pages.
- **Components:** PascalCase.tsx, **named export** (never default). Hooks `useCamelCase.ts`. Services `camelCaseService.ts`.
- **Imports:** `@/` for absolutes, relative within a feature.
- **Idioma:** domain pt-BR (labels, enums, messages); technical code en.
- **Enums DB:** snake_case pt-BR (`etapa_processo` → `EtapaFunilM2`). Reuse, don't recreate.
- **Security Rules:** RoleGuard + RLS on all user-data tables; `DevNavigationMenu` gated by `import.meta.env.DEV` (D-02 — keep); product language "avaliação comportamental/cognitiva" (never "teste psicológico") — the hub stage labels + LGPD card must honor this; system NEVER auto-rejects by score (RNF-07a) — not touched here but the hub must not introduce score-driven actions.
- **`database.types.ts`** lives at the REPO ROOT (not `src/types/`) and is CLI-generated — never edit. (Not regenerated this phase — no schema change.)
- **Commit hook:** `tsc --noEmit` pre-commit against a ~301-error legacy baseline; commits in this repo use `git -c core.hooksPath=/dev/null` (allowlisted) — do not GROW the tsc baseline.

## Sources

### Primary (HIGH confidence — verified directly against source this session)
- `src/router/routes.tsx` — full route table (40 routes), confirmed no catch-all, devNav map L533-567, RoleGuard usage per route
- `src/features/triagem/services/triagemService.ts` L75-97, L293-339 — `TriagemRow.id`=candidaturaId, `EtapaFunilM2`, `ETAPA_M2_LABELS`
- `src/features/triagem/components/TriagemTable.tsx` L324-325 — `<a href>` link with `candidato?.id`
- `src/components/RoleGuard.tsx` L48-52 — `ROLE_HOME.candidato='/candidato/perfil'`
- `src/components/RHSidebar.tsx` L47-103 — menuItems, active-state, no admin item, no role-gate
- `src/components/RHLayout.tsx`, `src/components/layouts/CandidatoNavbar.tsx` — persona shells
- `src/components/pages/DashboardCandidatoPage.tsx` L311-402 (hardcoded mock "Testes" block), `MeuPerfilCandidatoPage.tsx` L656-782 (candidatura-list overlap)
- `src/features/{entrevista,decisao,triagem}/components/*` — `useParams<{id}>()` = candidaturaId (orphan proof via grep)
- `src/features/avaliacao/hooks/useScorecardCandidato.ts`, `src/features/explicacao/hooks/useExplicacao.ts` — candidaturaId-keyed
- `e2e/login-flow.spec.ts`, `e2e/explicacao-flow.spec.ts`, `playwright.config.ts` — real-auth gating + heading-assertion patterns
- grep audits — orphan proof (no inbound nav to workspaces/avaliacao), legacy zero-import verification, `MeuPerfilPage` live entry (RHTopBar.tsx:38)
- `.planning/ui-reviews/nav-audit-2026-06-28.md`, `17-CONTEXT.md`, `17-UI-SPEC.md` — authoritative spec
- `~/.claude/skills/beauty-smile-design-system/SKILL.md` — `#00109E`/`#35BFAD`, glass tokens, public/admin themes

### Secondary (MEDIUM)
- MEMORY references: `reference_select_star_leaks_pii`, `reference_auth_hook_rls_gap` (0 `recrutador` accounts), tsc ~301 baseline + hook-bypass convention

### Tertiary (LOW)
- none — no external/unverified claims; this phase required no library research

## Metadata

**Confidence breakdown:**
- Standard stack (in-repo modules): HIGH — every module read directly; no external deps
- Architecture / routing: HIGH — full route table + orphan proof + id-semantics verified by grep
- Pitfalls: HIGH — each pitfall traced to a specific verified line (candidaturaId mismatch, `<a href>`, ROLE_HOME, bg-primary, Navigate interpolation, deletion scrub, MeuPerfilPage live entry)
- Legacy verdicts: HIGH — per-file grep evidence; one correction to the audit (MeuPerfilPage NOT dead)
- IA decisions (landing repoint, hub id contract): flagged as planner decisions (A5/Open Q1-2) — these are choices, not facts

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (stable; in-repo, no fast-moving external deps). Re-verify only if `routes.tsx`, `triagemService.ts`, or the workspace `useParams` contracts change before planning.
