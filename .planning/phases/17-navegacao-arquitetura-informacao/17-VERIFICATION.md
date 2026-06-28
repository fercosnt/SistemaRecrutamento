---
phase: 17-navegacao-arquitetura-informacao
verified: 2026-06-28T17:43:00Z
status: human_needed
score: 13/13
overrides_applied: 0
human_verification:
  - test: "J1 candidato pós-candidatura → avaliação via Dashboard step-CTA"
    expected: "Login as candidato test user → land on /candidato/dashboard → click 'Continuar para Avaliação Assíncrona' → URL becomes /candidato/avaliacao/:id. Requires seeded candidatura at etapa avaliacao_assincrona (E2E_CANDIDATURA_ID). WR-02: for non-avaliacao stages the CTA shows 'Acompanhar candidatura' and stays on /candidato/dashboard — assert that too."
    why_human: "Requires live Supabase auth + seeded candidatura at correct etapa. E2E_AUTH_TEST_USERS must be true in .env.test."
  - test: "J2 RH TriagemTable → hub → each of 3 workspaces (entrevista, decisão, redação)"
    expected: "Login as administrador → open /rh/vagas/:id/candidatos → click candidate name row → hub heading visible → click 'Abrir Entrevista' → heading 'Entrevista' visible; back → click 'Abrir Decisão final' → heading 'Decisão final' visible; back → click 'Abrir workspace de redação' → RedacaoReviewPanel heading visible. Requires a seeded candidatura at entrevista_online or later stage."
    why_human: "Requires live Supabase auth + seeded candidatura with etapa_atual that makes each workspace CTA active. J2 covers the code-review fix (bbeab99) that added the dedicated 'Abrir workspace de redação' CTA."
  - test: "J3 Admin sidebar → /admin/*"
    expected: "Login as administrador → sidebar shows 'Admin' item → click → URL becomes /admin/ai-logs → heading visible. Verify item is NOT visible when logged in as rh (generic recruiter)."
    why_human: "Requires live Supabase auth as administrador. Only administrador credential exists in PROD (no recrutador row — RESEARCH A3)."
  - test: "Hub data sections show correct etapa-guided state (WR-01 Redação scope)"
    expected: "Open hub for a candidato at avaliacao_assincrona. Redação section should reflect THIS candidato's redação presence (not vaga-queue count). Score de Triagem section shows sem_dados empty state (temDados=false intentional — IN-03). Future stages show 'Etapa ainda não iniciada'. No hardcoded scores/percentages anywhere."
    why_human: "Data-flow correctness for per-candidato section state requires a live candidatura with real data. WR-01 (Redação scope) is the most important correctness item to confirm — the fix scopes the data check to r.candidatura_id === candidaturaId."
---

# Phase 17: Navegacao & Arquitetura de Informacao — Verification Report

**Phase Goal:** Cabear na navegação real de produção o funil construído no M2 (avaliação do candidato + workspaces RH de entrevista/redação/decisão + telas admin), hoje só alcançável por URL direta / DevNavigationMenu DEV-only. Reescreve o perfil mock do RH como hub de candidato real (guiado por etapa), consolida Dashboard × Perfil do candidato, dá entrada às telas admin, adiciona 404, remove legado morto comprovado, e protege as jornadas com teste E2E de navegabilidade.
**Verified:** 2026-06-28T17:43:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `src/lib/navegacao/funilNavMap.ts` is the single source over all 8 EtapaFunilM2 values, imports EtapaFunilM2 + ETAPA_M2_LABELS from triagemService (no parallel enum), all route fns carry candidaturaId | VERIFIED | File exists 129 lines; `Record<EtapaFunilM2, FunilNavEntry>` enforces TS exhaustiveness; imports `type EtapaFunilM2, ETAPA_M2_LABELS` from `@/features/triagem/services/triagemService`; zero local `type EtapaFunilM2 =`; zero React/Supabase imports; funilNavMap.test.ts passes 5/5 |
| 2 | routes.tsx has catch-all `path:'*'` as last route → NotFoundPage; param-preserving plural→singular redirect exists; DevNav stays DEV-gated | VERIFIED | Catch-all at routes.tsx:467 is last entry before devNavigationPages; `RedirectToHub` useParams wrapper at :313-314; `import.meta.env.DEV && <DevNavigationMenu />` at App.tsx:222 untouched; devnav-gate test GREEN; routes.nav.test.ts 4/4 GREEN |
| 3 | `src/features/hub-candidato/` exists; PerfilCandidatoRHPage is 20-line thin wrapper rendering HubCandidatoRH; DISC/Raven/manifesto/recharts dropped; hub is service-backed with real hooks | VERIFIED | PerfilCandidatoRHPage.tsx is 20 lines, returns `<HubCandidatoRH />`; grep DISC/Raven/manifesto/recharts = 0; HubCandidatoRH.tsx 275 lines composed with useScorecardCandidato, useConsolidacao, useEntrevistaContexto, funilNavMap; no select('*') |
| 4 | TriagemTable row entry is SPA Link carrying candidaturaId (row.id), no raw `<a href.*candidatos>` | VERIFIED | `grep -c "href=.*candidatos" TriagemTable.tsx` = 0; line 329: `to={\`/rh/candidatos/${row.id}\`}` via React Router Link |
| 5 | Hub's 3 RH workspaces are click-reachable: entrevista + decisão via funilNavMap etapa-CTA, redação via dedicated "Abrir workspace de redação" CTA → `/rh/candidato/:id/redacao` | VERIFIED | funilNavMap returns `/rh/candidato/${id}/entrevista` for entrevista_online/presencial and `/rh/candidato/${id}/decisao` for decisao_final/aprovado/rejeitado; dedicated `onClick={() => navigate(\`/rh/candidato/${candidaturaId}/redacao\`)}` at HubCandidatoRH:242 with text "Abrir workspace de redação" (code-review fix bbeab99 applied) |
| 6 | Dashboard is funnel hub with funilNavMap step-CTA + LGPD card; ROLE_HOME.candidato repointed to `/candidato/dashboard` | VERIFIED | `funilNavMap` imported and called at DashboardCandidatoPage:11,110; "Continuar para"/"Acompanhar candidatura" CTA wired; `explicacao` LGPD path at line 421; RoleGuard.tsx:54 `candidato: '/candidato/dashboard'`; mock block "45%"/"Vagas Compatíveis" = 0 occurrences; bg-primary = 0; RoleGuard.tsx grep confirms `/candidato/dashboard` |
| 7 | Perfil stripped to dados pessoais + edição; VAGAS PARTICIPANDO + PROGRESSO blocks removed | VERIFIED | grep `VAGAS PARTICIPANDO\|PROGRESSO NO PROCESSO\|ETAPA_PROCESSO_LABELS\|useCandidaturas` = 0; handleSalvarDados preserved at line 52 |
| 8 | Admin sidebar item role-gated to `administrador` only (D-13); cosmetic, RoleGuard+RLS remain real gate | VERIFIED | RHSidebar.tsx:100 `...(role === 'administrador' ? [{id:'admin', label:'Admin', icon:<ShieldCheck/>}] : [])`; ShieldCheck imported from lucide-react; `/admin/ai-logs` at line 114; RHSidebar.admin.test.ts 3/3 GREEN |
| 9 | NotFoundPage is Beauty Smile glass 404 with role-aware back-link; bg-primary = 0 | VERIFIED | NotFoundPage.tsx exists; contains "404", "Página não encontrada"; useRole() switch produces /candidato/dashboard, /rh/dashboard, / for 3 cases; `grep -c "bg-primary" NotFoundPage.tsx` = 0 |
| 10 | Legacy 12 files deleted; MeuPerfilPage.tsx kept and still referenced in routes.tsx | VERIFIED | All 12 confirmed-dead files (`ls` errors): VagaLPPage, TesteBigFive/DISC/Raven, Instrucoes*, ConclusaoTestes, QuestionarioPage/Cultura, InscricaoPage, GlassShowcase; MeuPerfilPage.tsx exists at components/pages/; routes.tsx references it at line 54 + 394 |
| 11 | legacy-routes grep guard passes GREEN (12 dead = 0 refs in routes.tsx; MeuPerfilPage > 0) | VERIFIED | `npm run test:run -- legacy-routes` → 13/13 tests PASS |
| 12 | E2E navegacao.spec.ts covers 4 journeys; J4 runs unconditionally under E2E_AUTH_TEST_USERS gate; J1-J3 inside describeRealAuth | VERIFIED | `npx playwright test navegacao --list` → 12 tests (4 journeys × 3 projects); J4 at spec:85 is outside describeRealAuth; J1-J3 at spec:110+ inside `describeRealAuth`; E2E_AUTH_TEST_USERS grep confirms gating pattern |
| 13 | J4 (404 unconditional) passes against the wired build | VERIFIED | `npx playwright test navegacao --grep "404"` → 3/3 PASS across chromium + mobile-chrome + tablet (4.2s) |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/navegacao/funilNavMap.ts` | Single-source EtapaFunilM2 → nav entry, candidaturaId-parameterized | VERIFIED | 129 lines, Record<EtapaFunilM2, FunilNavEntry>, pure module |
| `src/components/pages/NotFoundPage.tsx` | Beauty Smile glass 404, role-aware back-link | VERIFIED | Exists, correct copy, no bg-primary, role switch wired |
| `src/router/routes.tsx` | catch-all path:'*' + normalization redirect | VERIFIED | Catch-all last at :467; RedirectToHub wrapper at :313-314 |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx` | RHLayout-shelled, candidaturaId-keyed, etapa-guided CTAs, real hooks | VERIFIED | 275 lines, funilNavMap + useScorecardCandidato + useConsolidacao wired |
| `src/features/hub-candidato/components/HubSection.tsx` | Empty-state wrapper with future/sem_dados/error states | VERIFIED | Exports HubSection; "Etapa ainda não iniciada" + "Esta etapa será liberada" verbatim |
| `src/features/hub-candidato/index.ts` | Barrel re-exporting HubCandidatoRH | VERIFIED | Re-exports HubCandidatoRH + HubSection |
| `src/components/pages/PerfilCandidatoRHPage.tsx` | Thin wrapper rendering HubCandidatoRH | VERIFIED | 20 lines, named export preserved, no recharts/DISC/Raven |
| `src/components/RHSidebar.tsx` | Role-gated Admin nav item | VERIFIED | ShieldCheck item gated on `role === 'administrador'` |
| `src/components/pages/DashboardCandidatoPage.tsx` | funilNavMap step-CTA + LGPD card | VERIFIED | funilNavMap imported, CTAs wired, LGPD card present |
| `src/components/RoleGuard.tsx` | ROLE_HOME.candidato → /candidato/dashboard | VERIFIED | Line 54 confirmed |
| `e2e/navegacao.spec.ts` | 4 journeys; J4 unconditional; J1-J3 gated | VERIFIED | Lists 12 tests (4×3 projects); structure confirmed |
| 12 legacy page files | Deleted | VERIFIED | All 12 absent |
| `src/components/pages/MeuPerfilPage.tsx` | Kept (live RHTopBar.tsx entry) | VERIFIED | Exists, referenced in routes.tsx |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `funilNavMap.ts` | `triagemService.ts` | `import { type EtapaFunilM2, ETAPA_M2_LABELS }` | WIRED | Confirmed via grep — no local redeclaration |
| `routes.tsx` | `NotFoundPage.tsx` | `path: '*'` element | WIRED | Line 467-469 |
| `NotFoundPage.tsx` | `authStore.ts` | `useRole()` for role-aware back-link | WIRED | Line 29 confirmed |
| `HubCandidatoRH.tsx` | `funilNavMap.ts` | `import { funilNavMap }` | WIRED | Line 33 confirmed |
| `HubCandidatoRH.tsx` | `useScorecardCandidato` | service-backed section read | WIRED | Line 89 confirmed |
| `TriagemTable.tsx` | `/rh/candidatos/:id` | `<Link to={\`/rh/candidatos/${row.id}\`}>` | WIRED | Line 329, row.id = candidaturaId |
| `RHSidebar.tsx` | `/admin/ai-logs` | `handleMenuClick 'admin'` + role gate | WIRED | Lines 100-114 confirmed |
| `DashboardCandidatoPage.tsx` | `funilNavMap.ts` | step-CTA route lookup | WIRED | Lines 11, 110 confirmed |
| `DashboardCandidatoPage.tsx` | `/candidato/explicacao/:id` | LGPD card CTA | WIRED | Line 421 confirmed |
| `RoleGuard.tsx` | `/candidato/dashboard` | `ROLE_HOME.candidato` | WIRED | Line 54 confirmed |
| `legacy-routes.grep.test.ts` | `routes.tsx` | grep guard zero-refs | WIRED | 13/13 GREEN |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| funilNavMap unit tests | `npm run test:run -- funilNavMap` | 5/5 PASS | PASS |
| Hub empty-state test | `npm run test:run -- hubEmptyState` | 3/3 PASS | PASS |
| RHSidebar admin role-gate test | `npm run test:run -- RHSidebar.admin` | 3/3 PASS | PASS |
| Route catch-all + redirect test | `npm run test:run -- routes.nav` | 4/4 PASS | PASS |
| Legacy-routes grep guard | `npm run test:run -- legacy-routes` | 13/13 PASS | PASS |
| DevNav gate | `npm run test:run -- devnav-gate` | 1/1 PASS | PASS |
| J4 404 E2E unconditional | `npx playwright test navegacao --grep "404"` | 3/3 PASS | PASS |
| Full Vitest suite | `npm run test:run` | 637/637 PASS (2 Deno EF files pre-existing fail) | PASS |
| Build | `npm run build` | Exit 0 | PASS |
| tsc baseline | `npm run lint` (count errors) | 258 (down from 290 — D-12 deletions reduced it) | PASS |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `NotFoundPage.tsx` | 22-24 | Comment claims `bg-primary` is "broken project-wide" — factually incorrect per `tailwind.config.js` + `globals.css` (WR-04 from code review) | INFO | Misleading comment; hex literal `bg-[#00109E]` is functionally identical to `bg-primary` but creates drift. Pre-existing code review finding already captured, not a new defect. |
| `HubCandidatoRH.tsx` | 178-187 | `temDados=false` hardcoded for Score de Triagem section — always shows empty state (IN-03) | INFO | If intent is to redirect to vaga panel, the unreachable child JSX is dead code. Not a data-integrity issue. |
| `HubCandidatoRH.tsx` | 91 | `useRedacaoRevisao(vagaId)` is a vaga-level queue, not candidatura-scoped — temRedacaoDoCandidato filter applied via `r.candidatura_id === candidaturaId` at line 100 (WR-01 code-review fix was applied) | INFO | The fix was applied (line 100 filters by candidatura_id). Requires human confirmation that `RedacaoReviewRow` actually carries `candidatura_id` in live data. |
| `DashboardCandidatoPage.tsx` | 328-332 | Inline `etapa_atual.replace('_',' ')` diverges from `ETAPA_M2_LABELS` label format (IN-05) | INFO | Minor consistency gap — "Avaliacao assincrona" vs "Avaliação Assíncrona". Not functional. |

No TBD/FIXME/XXX debt markers found in Phase 17 modified files.

### Human Verification Required

#### 1. J1 — Candidato pós-candidatura → avaliação via Dashboard step-CTA

**Test:** Log in as candidato test user → verify landing on `/candidato/dashboard` (ROLE_HOME repoint) → with a candidatura at `avaliacao_assincrona`, click "Continuar para Avaliação Assíncrona" button → confirm URL navigates to `/candidato/avaliacao/:id`. Also test with a candidatura at a stage where `rotaCandidato` is null (e.g. `triagem`) → confirm "Acompanhar candidatura" CTA appears and clicking stays on Dashboard.

**Expected:** Route/heading resolves correctly. Dashboard shows candidate's candidaturas + step-CTA + LGPD card (when at decisao/aprovado/rejeitado).

**Why human:** Requires live Supabase auth + seeded candidatura at specific etapa. Set `E2E_AUTH_TEST_USERS=true`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `E2E_CANDIDATURA_ID`, `E2E_VAGA_ID` in `.env.test` to run `npx playwright test navegacao`.

#### 2. J2 — RH TriagemTable → hub → each of 3 workspaces

**Test:** Log in as administrador → open a vaga's TriagemTable → click a candidate row name (should SPA-navigate to hub, not full-page reload) → verify hub heading visible and etapa chip shown → click "Abrir {label}" for current stage → verify workspace heading ("Entrevista" / "Decisão final") → back to hub → click "Abrir workspace de redação" → verify RedacaoReviewPanel heading visible.

**Expected:** TriagemTable link uses candidaturaId (row.id). Hub shows etapa-guided dominant CTA. All 3 workspaces reachable by click (entrevista, decisão via funilNavMap; redação via dedicated CTA at `/rh/candidato/:id/redacao`).

**Why human:** Requires live Supabase auth + seeded candidatura with etapa that has a workspace. Also validates WR-01 fix: Redação section should reflect only this candidatura's data (not the entire vaga queue).

#### 3. J3 — Admin sidebar → /admin/*

**Test:** Log in as administrador → verify sidebar shows "Admin" item with ShieldCheck icon → click → URL becomes `/admin/ai-logs` → admin heading visible. Also verify: log in as generic `rh` user (if available) → "Admin" item NOT visible.

**Expected:** Role-gated sidebar item works. The `/admin/*` RoleGuard remains the real access control.

**Why human:** Requires live Supabase auth as administrador. No generic `rh` account exists in PROD (RESEARCH A3).

#### 4. Hub data sections — etapa-guided state and WR-01 Redação scope

**Test:** Open hub for a candidatura at each major etapa (triagem, avaliacao_assincrona, entrevista_online). Verify: current etapa shows dominant "Abrir {label}" CTA (turquoise); past stages show "Revisar {label}" (neutral); future stages show "Etapa ainda não iniciada" empty state. Redação section shows data only when THIS candidatura has a redação — not just any candidatura in the vaga.

**Expected:** No hardcoded scores/percentages anywhere. Sections show real service data or explicit empty states. WR-01 fix (filtering by `candidatura_id`) works as intended.

**Why human:** Requires live data with candidaturas at different etapas. Data-flow correctness cannot be verified by grep alone.

### Gaps Summary

No automated gaps. All 13 must-haves are VERIFIED. The 4 human verification items are live-auth/data journeys that are legitimately ungated in automated CI (M2 precedent: 08-HUMAN-UAT.md, 10-HUMAN-UAT.md, 11-HUMAN-UAT.md all used the same pattern). The code-review WR-01 fix (Redação scope) was applied in commit bbeab99 before this verification.

---

_Verified: 2026-06-28T17:43:00Z_
_Verifier: Claude (gsd-verifier)_
