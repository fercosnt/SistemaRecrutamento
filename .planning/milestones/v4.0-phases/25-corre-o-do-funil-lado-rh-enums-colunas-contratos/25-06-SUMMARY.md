---
phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos
plan: 06
subsystem: RH shell + mock-screen gating (dead-affordance sweep, empty-states)
tags: [UX-06, dead-affordance, empty-state, offboarding-lgpd, rh-shell]
requires:
  - "GlassCard / Glass empty-state idiom (AsyncState.EstadoVazio typography, UI-SPEC §2)"
  - "ComparativoScreen (shared by DecisaoFinalPage + ComparativoCandidatosPage)"
  - "routes.tsx /rh/configuracoes (RoleGuard administrador) + /rh/perfil (RoleGuard rh/administrador) — untouched"
provides:
  - "RHSidebar with no hardcoded 12/5 badges (rows reflow)"
  - "RHTopBar with the no-op global search removed (topbar reflows around real controls)"
  - "ComparativoScreen onAvancar/onRejeitar OPTIONAL — Ação row gated on both handlers present"
  - "DecisaoFinalPage embeds ComparativoScreen read-only (no no-op avançar/rejeitar)"
  - "ConfiguracoesPage (A14) = single GlassCard empty-state 'Gestão de usuários ainda não disponível' (no mock user list / audit PII / stub handlers)"
  - "MeuPerfilPage (A37) = single GlassCard empty-state 'Edição de perfil em breve' (no stub save/senha/foto forms)"
affects:
  - "src/components/RHSidebar.tsx (badge data removed)"
  - "src/components/RHTopBar.tsx (search removed, dead imports pruned)"
  - "src/features/triagem/components/ComparativoScreen.tsx (optional action handlers + gated Ação row)"
  - "src/features/decisao/components/DecisaoFinalPage.tsx (no-op prop passthrough removed)"
  - "src/components/pages/ConfiguracoesPage.tsx (1975→48 lines; whole mock console replaced)"
  - "src/components/pages/MeuPerfilPage.tsx (339→46 lines; stub forms replaced)"
tech-stack:
  added: []
  patterns:
    - "In-shell glass empty-state (GlassCard + muted lucide icon + 20px/600 heading + 14px body, py-12, NO CTA) — reuses AsyncState.EstadoVazio rhythm, no new visual language"
    - "Shared component made read-only via OPTIONAL handlers + presence-gated action region (no 2nd copy, no DEV-gate)"
    - "Remove (not disable) dead affordances — layouts reflow, no empty container / dangling border / 0-or-em-dash placeholder"
key-files:
  created:
    - .planning/phases/25-corre-o-do-funil-lado-rh-enums-colunas-contratos/25-06-SUMMARY.md
  modified:
    - src/components/RHSidebar.tsx
    - src/components/RHTopBar.tsx
    - src/features/triagem/components/ComparativoScreen.tsx
    - src/features/decisao/components/DecisaoFinalPage.tsx
    - src/components/pages/ConfiguracoesPage.tsx
    - src/components/pages/MeuPerfilPage.tsx
decisions:
  - "The two mock screens are gated (not deleted): whole mock content region → one centered GlassCard empty-state; RH shell + page header/title + route + RoleGuard KEPT; real impl deferred to M5 (UI-SPEC §2 / offboarding-LGPD minimum)"
  - "DecisaoFinalPage no-op avançar/rejeitar hidden by making ComparativoScreen.onAvancar/onRejeitar OPTIONAL + gating the Ação <tr> on both being present — the read-only embed omits the handlers; ComparativoCandidatosPage (real handlers) is unchanged. Chosen over a 2nd copy of the comparison view"
  - "25-03 already removed the CriarEditarVagaPage 'Usar da Biblioteca' no-op buttons (b9deb60, shared UX-06) — NOT re-touched here (file-disjoint); 25-06 swept only the genuinely-remaining affordances"
  - "ComparativoScreen.tsx edited despite not being in files_modified — the only clean way to hide the embedded no-op without duplicating the component (Rule-3 blocking deviation)"
metrics:
  duration: ~12min
  tasks: 3
  files: 6
  tsc_errors: 107
  tests: "781/781 full suite (ComparativoScreen 6/6)"
  completed: 2026-07-11
---

# Phase 25 Plan 06: Dead-Affordance Sweep + Mock-Screen Empty-State Gating Summary

UX-06 closed on the RH shell: the capability-lying dead affordances (hardcoded 12/5 sidebar badges, the no-op global search, the DecisaoFinalPage no-op avançar/rejeitar) are removed, and the two 100%-mock RH screens (`/rh/configuracoes` A14, RH `MeuPerfilPage` A37) are gated behind a clear "not available" empty-state — RH shell + route + RoleGuard preserved, real feature deferred to M5.

## What Was Built

**Task 1 — dead-affordance removals (`b325624`)**

1. **`RHSidebar.tsx`** — dropped the hardcoded `badge: 12` (Candidatos) and `badge: 5` (Vagas) menu-item data. `MenuItem.badge` stays optional and the render conditional (`item.badge && item.badge > 0`) now never fires for any item, so no "0" and no gap render — the rows reflow tighter around the label alone.
2. **`RHTopBar.tsx`** — removed the no-op global search: the `<form>`/`<input>` "Buscar candidatos, vagas…" block, the `handleSearch` handler (was `console.log` only), and the now-dead `searchQuery` state. Pruned the imports that fell dead as a result (`React` — only used by `React.FormEvent`; `useState`; the `Search` lucide icon; the pre-existing dead `Badge` import). The topbar (`justify-between`) reflows to left logo + right user dropdown.
3. **`ComparativoScreen.tsx`** (enabling change for #4) — `onAvancar`/`onRejeitar` are now **optional**; a `showActions = Boolean(onAvancar && onRejeitar)` gate wraps the entire "Ação" `<tr>` (Avançar/Rejeitar dialogs), and the button `onClick`s use optional-call (`onAvancar?.()`). Consumers that pass both handlers (ComparativoCandidatosPage, the 6/6 unit test) are unchanged; a read-only embed that omits them renders no action buttons.
4. **`DecisaoFinalPage.tsx`** — removed the `onAvancar={() => {}}` / `onRejeitar={() => {}}` no-op passthrough on the embedded `ComparativoScreen`. The comparison table stays fully visible; the real decision path is `registrar_decisao` on the Decisão tab (unchanged).

**Task 2 — gate `/rh/configuracoes` (A14) (`77ec85d`)**

Replaced the entire 1951-line mock admin console — a fake user list with PII-shaped names/emails, fake audit logs naming candidates, dead M1 webhook names (Big Five/DISC/Raven/Cultura), and stub save/toggle/excluir/reset/permissões/vincular handlers that persisted nothing — with a single centered `GlassCard` empty-state: `Users` icon, 20px/600 heading **"Gestão de usuários ainda não disponível"**, 14px body per UI-SPEC §2, `py-12`, **no CTA**. The RH shell, the page header/title ("Configurações"), the route, and the `RoleGuard(administrador)` are kept. This removes the fabricated user/candidate identifiers from the render (offboarding-LGPD minimum, T-25-06-01). File 1975 → 48 lines.

**Task 3 — gate RH `MeuPerfilPage` (A37) (`d9ea149`)**

Replaced the stub save/senha/foto forms (seeded with a hardcoded fake user "João Silva", handlers all `TODO(M5)`) with a single centered `GlassCard` empty-state: `UserRound` icon, 20px/600 heading **"Edição de perfil em breve"**, body per UI-SPEC §2, `py-12`, **no CTA**. RH shell + header + route + `RoleGuard(rh/administrador)` kept. File 339 → 46 lines.

## Task Commits

| Task | Gate | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | refactor (sweep) | `b325624` | RHSidebar.tsx, RHTopBar.tsx, ComparativoScreen.tsx, DecisaoFinalPage.tsx |
| 2 | feat (gate A14) | `77ec85d` | src/components/pages/ConfiguracoesPage.tsx |
| 3 | feat (gate A37) | `d9ea149` | src/components/pages/MeuPerfilPage.tsx |

## Verification

- Task 1 greps: `badge: ?12|badge: ?5` in RHSidebar == **0**; `handleSearch` in RHTopBar == **0**; no-op `onAvancar={()=>{}}`/`onRejeitar={()=>{}}` in DecisaoFinalPage == **0**.
- Task 2 greps: `Gestão de usuários ainda não disponível` present; `handleToggle|handleExcluir|handleReset` == **0**; route sanity `configuracoes` still in routes.tsx (not edited).
- Task 3 greps: `Edição de perfil em breve` present; `handleSalvarDados|handleAlterarSenha|handleAlterarFoto` == **0**.
- `npm run test:run` (full): **781/781 pass** (96 files) — no regression; ComparativoScreen suite **6/6** (still asserts Avançar/Rejeitar fire when both handlers are passed).
- `npm run lint` (tsc --noEmit): **107 errors** — DOWN from the 115 FOUND-08 baseline (−8: the gutted pages cleared their React/onVoltar/Glass-onClick/Vaga errors + RHTopBar's dead Badge import). NOT increased.
- `npm run build`: green (pre-existing chunk-size advisories only).

## Deviations from Plan

**1. [Rule 3 - blocking] `ComparativoScreen.tsx` edited (not in `files_modified`).** The plan's Task 1 action requires hiding the embedded no-op avançar/rejeitar buttons, which live *inside* the shared `ComparativoScreen`. The clean way to hide them for the DecisaoFinalPage embed without breaking the other consumer (ComparativoCandidatosPage, which passes real handlers) is to make the two handlers optional and gate the Ação row on their presence — so `ComparativoScreen.tsx` received a minimal, backward-compatible change. No 2nd copy of the comparison view was created; the 6/6 ComparativoScreen test is unchanged and green.

**2. No-op (already satisfied by 25-03).** The UI-SPEC §4 dead-affordance table also lists the `CriarEditarVagaPage` "📚 Usar da Biblioteca" / "Preview" no-op buttons. 25-03 already removed those (commit b9deb60, shared UX-06). Verified they are gone; NOT re-touched or reverted here (file-disjoint). The dashboard `—` tiles listed in UI-SPEC §4 are out of this plan's `files_modified`/`<tasks>` scope (DashboardRH not touched) and were not part of 25-06's three tasks — left for the phase's remaining scope / any dashboard-specific follow-up.

Otherwise: plan executed as written. No Rule 1/2/4 deviations, no auth gates, zero package installs.

## Threat Model Outcome

- **T-25-06-01** (Information Disclosure — mock user list / audit logs render fabricated identifiers; stub handlers imply live user-mgmt): **mitigated** — both mock screens' content regions replaced with empty-states; all mock state/handlers removed; `RoleGuard` kept (A14/A37 real impl → M5).
- **T-25-06-02** (Spoofing / capability lie — no-op search, badges, avançar/rejeitar imply actions that do nothing): **mitigated** — removed (not disabled); no dangling placeholder, layouts reflow.
- **T-25-06-03** (availability — deleting a route breaks RH nav / RoleGuard coverage): **avoided** — routes + RoleGuard untouched (grep sanity); only the content region changed.
- **T-25-SC** (supply chain): **n/a** — zero package installs.

## Known Stubs

None introduced. The two gated screens intentionally render a "not available"/"em breve" empty-state (feature deferred to M5) — this is a documented deferral, not a data-wiring stub, and it removes the prior fabricated-data render rather than adding one.

## Follow-ups (NOT this plan)

- Visual confirmation of the two empty-states + the reflowed sidebar/topbar is the deferred HUMAN-UAT (per plan `<verification>`).
- Wave 2 remains: 25-07 (BLOCKING — apply 5 migrations via Supabase MCP + regen types + live SQL smokes) and 25-08 (re-measure + re-pin ci.yml tsc baseline; measured 107 now).

## Self-Check: PASSED

- FOUND: src/components/RHSidebar.tsx (badge:12/5 removed)
- FOUND: src/components/RHTopBar.tsx (handleSearch removed)
- FOUND: src/features/triagem/components/ComparativoScreen.tsx (optional handlers + gated Ação row)
- FOUND: src/features/decisao/components/DecisaoFinalPage.tsx (no-op passthrough removed)
- FOUND: src/components/pages/ConfiguracoesPage.tsx ("Gestão de usuários ainda não disponível")
- FOUND: src/components/pages/MeuPerfilPage.tsx ("Edição de perfil em breve")
- FOUND commit: b325624 (T1 sweep)
- FOUND commit: 77ec85d (T2 gate A14)
- FOUND commit: d9ea149 (T3 gate A37)
