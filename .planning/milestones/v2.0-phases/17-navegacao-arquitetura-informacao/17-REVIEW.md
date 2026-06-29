---
phase: 17-navegacao-arquitetura-informacao
reviewed: 2026-06-28T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/lib/navegacao/funilNavMap.ts
  - src/router/routes.tsx
  - src/components/pages/NotFoundPage.tsx
  - src/components/RoleGuard.tsx
  - src/components/RHSidebar.tsx
  - src/features/hub-candidato/components/HubCandidatoRH.tsx
  - src/features/hub-candidato/components/HubSection.tsx
  - src/features/hub-candidato/index.ts
  - src/components/pages/PerfilCandidatoRHPage.tsx
  - src/features/triagem/components/TriagemTable.tsx
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/components/pages/MeuPerfilCandidatoPage.tsx
  - src/components/pages/LoginCandidatoPage.tsx
  - src/features/cadastro/components/CadastroMultiStepForm.tsx
  - src/components/pages/FormularioCandidaturaPage.tsx
  - e2e/navegacao.spec.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-06-28
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Phase 17 is a navigation/IA + legacy-cleanup phase: a single-source funnel→screen map (`funilNavMap`), a 404 catch-all, a candidate-landing repoint, a role-gated Admin sidebar item, the conversion of `TriagemTable`'s row link to carry `candidaturaId`, and the replacement of the 1864-line `PerfilCandidatoRHPage` mock with a service-backed hub. I reviewed all 16 files plus traced the consumed hooks (`useEntrevistaContexto`, `useScorecardCandidato`, `useRedacaoRevisao`, `useConsolidacao`, `useEntrexistaScorecard`) and the route-ranking semantics.

**Access control is sound.** The repointed `ROLE_HOME` and the catch-all both target static internal paths. `RedirectToHub` interpolates the resolved `useParams` id into a fixed internal template — no open redirect. The Admin sidebar item is purely cosmetic; `/admin/*` keeps its `RoleGuard role="administrador"` + RLS. `RoleGuard`'s sequential loading→auth→role→children ordering is intact and the role-null DB-fallback path is preserved.

**The candidaturaId id-contract holds.** `TriagemTable` now navigates with `row.id` (candidaturaId), and the hub + `funilNavMap` route fns + `DashboardCandidatoPage` step-CTA all key on candidaturaId consistently. No wrong-id wiring found.

**No PII/LGPD regression.** The new hub reuses the existing allowlist-projected hooks (`getEntrevistaContexto` uses an explicit column list, not `select('*')`). No candidate-facing star projection was introduced.

**No BLOCKERS.** The findings below are correctness/robustness/quality issues. The most material is WR-01 (the hub's Redação section presents a vaga-level review-queue signal as if it were candidate-level), and WR-02 (a gated E2E journey that can never reach its asserted URL for stages whose candidate route is null).

Pre-existing legacy errors unrelated to this phase (the ~258-error tsc baseline, the `userRole='RH'` hardcode, the `bg-primary` legacy usages in unchanged lines, the count-cap at 100) are noted only where the phase's own comments make a claim that does not match the code, and are not counted as phase defects.

## Warnings

### WR-01: Hub "Redação" section reports a vaga-level queue signal as candidate-level data

**File:** `src/features/hub-candidato/components/HubCandidatoRH.tsx:91, 213-223`
**Issue:** The hub keys every section on `candidaturaId` (Pitfall 1, the whole point of the rewrite), but the Redação section is driven by `redacaoQuery = useRedacaoRevisao(vagaId)`. `useRedacaoRevisao` lists the **review queue for the entire vaga** (`listRedacoesRevisao(vagaId)`, ordered by severity), not the redação of THIS candidatura. So `estado={estadoDaSecao('avaliacao_assincrona', etapaAtual, (redacaoQuery.data?.length ?? 0) > 0)}` flips to `com_dados` — and renders "Há redações na fila de revisão desta vaga" — whenever ANY candidate in the vaga has a pending redação, even if the candidate in scope has none. This is a candidate-scope correctness defect in the section the rewrite explicitly promised to make per-candidate ("Every section reflects the candidate's FULL M2 pipeline by reading a REAL hook keyed by candidaturaId"). It does not leak another candidate's PII (the copy is generic), but it shows a misleading "data exists for this candidate" state.
**Fix:** Either filter the vaga queue down to this candidatura before computing `temDados`, or gate the section on a candidatura-scoped read. Minimal version:
```tsx
const temRedacaoDoCandidato = (redacaoQuery.data ?? []).some(
  (r) => r.candidatura_id === candidaturaId, // confirm the row carries candidatura_id
)
// ...
estado={estadoDaSecao('avaliacao_assincrona', etapaAtual, temRedacaoDoCandidato)}
```
If `RedacaoReviewRow` does not expose `candidatura_id`, the section should fall back to a static "abra o workspace de redação" affordance with no data-presence claim, rather than asserting candidate-level data from a vaga-level count.

### WR-02: Gated E2E journey J1 can assert a URL it will never reach for null-route stages

**File:** `e2e/navegacao.spec.ts:108-121`
**Issue:** J1 clicks the button matching `/Continuar para|Acompanhar/i` and then asserts `toHaveURL(/\/candidato\/avaliacao\//)`. But the Dashboard step-CTA renders the neutral "Acompanhar candidatura" label precisely when `getStepCTA` returns `destino === null` (stages with no candidate-facing screen — `triagem`, `inscricao`, the interview/decision stages — or a stale M1 etapa). For those candidaturas the click is a no-op (`if (stepCTA.destino) navigate(...)`, DashboardCandidatoPage:375), so the URL never becomes `/candidato/avaliacao/` and the test times out. The journey only passes if the seeded candidate happens to sit at `avaliacao_assincrona` (the one candidate-routable stage), which the spec does not pin or document.
**Fix:** Seed/assert the candidate is at `avaliacao_assincrona` before J1, or assert on the CTA label/route conditionally: only assert the `/candidato/avaliacao/` URL when the clicked button text is "Continuar para…"; for "Acompanhar candidatura" assert it stays on `/candidato/dashboard`. Document the required seeded etapa in the env-var preamble alongside `E2E_CANDIDATURA_ID`.

### WR-03: E2E login helpers will hang on a stale `#senha` selector if the password input id ever changes

**File:** `e2e/navegacao.spec.ts:62, 71`
**Issue:** Both `loginCandidato` and `loginRH` use `page.locator('#senha, #password')`. The actual login pages render `id="password"` only (LoginCandidatoPage:314, LoginRHPage:316) — there is no `#senha`. The OR-selector currently resolves to `#password`, so it works today, but the `#senha` half is dead and misleading: it signals the author was unsure of the field id. If a future refactor renames the password input, the dead `#senha` alternative provides a false sense of resilience. Combined with WR-02, the gated suite is fragile.
**Fix:** Use `page.locator('#password')` (the real id) in both helpers, dropping the non-existent `#senha`. If cross-form resilience is genuinely wanted, target by role/label (`getByLabel(/senha/i)`) instead of two competing ids.

### WR-04: Stale comment claims `bg-primary` is "broken project-wide" while the code (and the rest of the codebase) relies on it working

**File:** `src/components/pages/NotFoundPage.tsx:22-24`; `src/features/hub-candidato/components/HubSection.tsx:17-18`
**Issue:** Both new files carry a load-bearing comment asserting 'the Tailwind "primary" background utility is broken project-wide (HSL-vs-HEX mismatch)' and therefore use `bg-[#00109E]` hex literals. But `tailwind.config.js:26-28` defines `primary: { DEFAULT: "hsl(var(--primary))" }` and `globals.css:59` sets `--primary: 234 100% 31%` — which IS `#00109E`. The token resolves correctly, and the unchanged `LoginCandidatoPage` (this phase, lines 371/400) and `FormularioCandidaturaPage` (lines 488/529/657/583) still use `bg-primary`/`text-primary` and depend on it rendering. The comment is therefore wrong, and it institutionalizes a hex-literal anti-pattern (#00109E hardcoded in 2 new files) justified by a false premise. If there is a real contrast bug it is undocumented; if there is not, the divergence (hex in new files, token in old) is pure drift.
**Fix:** Verify whether `bg-primary` actually mis-renders. If it works (it appears to), replace the hex literals with `bg-primary` for consistency and delete the misleading comments. If a specific surface genuinely fails, document the exact failure (which utility, which build path) rather than a blanket "project-wide" claim that the same phase's other files contradict.

## Info

### IN-01: `RHSidebar` user-section role is hardcoded `'RH'`, mislabeling administradores

**File:** `src/components/RHSidebar.tsx:46-47, 249`
**Issue:** The phase added a role-gated Admin menu item (correct, cosmetic-only), but the user card still renders `userRole = 'RH'` for everyone, including an authenticated `administrador`. An admin sees the "Admin" nav item yet a "RH" badge. The component now subscribes to `role` (line 36) so the real value is in hand. Pre-existing hardcode, but the phase touched this exact component and could have resolved the inconsistency it now visibly creates.
**Fix:** Derive the label from the subscribed `role`, e.g. `const userRole = role === 'administrador' ? 'Administrador' : 'RH'`.

### IN-02: Deleted M1 pages are still referenced in committed docs

**File:** `src/guidelines/Guidelines.md` (GlassShowcase), `src/INSTRUCOES-RAVEN.md` (TesteBigFivePage, TesteDISCPage)
**Issue:** The 12-file deletion removed `GlassShowcase.tsx`, `TesteBigFivePage.tsx`, `TesteDISCPage.tsx`, etc., but docs under `src/` still name them, leaving dangling references. No source/import references remain (verified), so this is doc hygiene only.
**Fix:** Update or remove the stale doc mentions so the deleted-component names do not resurface as phantom guidance.

### IN-03: Hub "Score de Triagem" section hardcodes `temDados=false`, so it can never show data

**File:** `src/features/hub-candidato/components/HubCandidatoRH.tsx:178-187`
**Issue:** The Score de Triagem `HubSection` passes `estado={estadoDaSecao('triagem', etapaAtual, false)}` — the `temDados` argument is the literal `false`, so for any reached candidate the section renders the `sem_dados` empty state and the child paragraph ("O score de triagem por IA é exibido no painel de triagem da vaga.") is never shown (HubSection only renders children when `estado === 'com_dados'`). The section is effectively always an empty state by construction. If that is the intent (redirect to the vaga panel), the child paragraph is dead JSX; if not, the data flag is wrong.
**Fix:** Either drop the unreachable child and rely on the `sem_dados` copy, or wire a real triagem-score presence flag if the section is meant to surface content.

### IN-04: `funilNavMap` never routes to the Redação RH workspace (`/rh/candidato/:id/redacao`)

**File:** `src/lib/navegacao/funilNavMap.ts:86-92`
**Issue:** The map is the "single source of truth" for stage→workspace navigation, but no stage's `rotaWorkspaceRH` returns `/rh/candidato/:id/redacao` (the `RedacaoReviewPanel` mount in routes.tsx:320). The Redação review surface is therefore unreachable through the map's CTA flow; the hub's Redação section only tells the reviewer to "abra o workspace de redação" with no link. The `avaliacao_assincrona` stage returns `rotaWorkspaceRH: () => null`. This is a navigation-coverage gap given the phase's stated goal of making M2 workspaces reachable by click.
**Fix:** If Redação is part of the avaliação-assíncrona RH flow, expose its route (e.g. add a dedicated redação CTA, or make `avaliacao_assincrona.rotaWorkspaceRH` return the redação panel path) so the workspace is reachable from the hub.

### IN-05: `DashboardCandidatoPage` still renders raw `etapa_atual.replace('_',' ')`, capitalized, for unknown M2 values

**File:** `src/components/pages/DashboardCandidatoPage.tsx:328-332`
**Issue:** While the step-CTA path is drift-guarded via `funilNavMap`/`ETAPA_M2_LABELS` (good), the inline "Etapa atual:" line still prints `candidatura.etapa_atual.replace('_', ' ')` with `.capitalize`. For an M2 value like `avaliacao_assincrona` this shows "Avaliacao assincrona" (no accent, machine-style), diverging from the `ETAPA_M2_LABELS` label ("Avaliação Assíncrona") used everywhere else this phase introduced. Minor consistency gap, not a bug.
**Fix:** Render the label via the same single source: `ETAPA_M2_LABELS[candidatura.etapa_atual as EtapaFunilM2] ?? candidatura.etapa_atual` so the displayed etapa name matches the CTA and the hub.

---

_Reviewed: 2026-06-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
