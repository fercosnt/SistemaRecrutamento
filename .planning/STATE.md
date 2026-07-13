---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: M5 — Gestão de Usuários & Perfil RH
status: executing
stopped_at: "28-03 executado — RED harness B: 3 behavioral SQL smokes (usr_rh_seg02_smoke.sql SEG-02 roster-leak/own-row/admin-roster/SEC-09; usr_rh_anti_lockout_smoke.sql USR-07 last-admin P0001 + 2-session advisory-lock proof; usr_rh_audit_append_only_smoke.sql USR-06 atomic mutate+audit + append-only). Impersonated JWT, disposable fixtures, ROLLBACK-free cleanup — RED até 28-04/28-05 aplicarem e 28-08 rodar em PROD. Commits 3219e03, 00d4c8a, 5614728. Next: 28-04 (SEG-02 RLS rewrite + logs_auditoria append-only)."
last_updated: "2026-07-13T05:06:30.000Z"
last_activity: 2026-07-13 -- 28-03 concluído (RED harness B — SQL smokes)
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 8
  completed_plans: 3
  percent: 38
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-13 — M5/v5.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 28 — Gestão de Usuários RH — Núcleo Seguro

## Current Position

Phase: 28 (Gestão de Usuários RH — Núcleo Seguro) — EXECUTING
Plan: 4 of 8 (28-01 ✓, 28-02 ✓, 28-03 ✓)
Status: Executing Phase 28
Last activity: 2026-07-13 -- 28-03 concluído (RED harness B: 3 behavioral SQL smokes SEG-02/USR-07/USR-06, RED até apply)

Progress: [████░░░░░░] 38%

## Roadmap (M5 — Phases 28–30)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 28 — Gestão de Usuários RH · Núcleo Seguro | EF service_role authenticate-THEN-authorize p/ toda escrita de usuário + RLS `usuarios_rh` admin-only (auth-hook preservado) + auditoria append-only + guarda anti-lockout | USR-06, USR-07, SEG-01, SEG-02 |
| 29 — Console de Gestão de Usuários RH (A14 UI) | `administrador` lista/cria/muda-papel/desativa-reativa/reseta senha de usuários RH pela UI real de `/rh/configuracoes`, ponta-a-ponta pelo write-path seguro da P28 | USR-01, USR-02, USR-03, USR-04, USR-05 |
| 30 — Meu Perfil RH (A37 self-service) | Usuário RH edita o próprio nome/foto + troca a própria senha (re-auth), sem jamais escrever `role` (anti-privilege-escalation) | PERFIL-01, PERFIL-02, PERFIL-03, SEG-03 |

Coverage: 13/13 requirements mapeados ✓ · 0 unmapped. Execução numérica: 28 → 29 → 30. Todas as 3 fases são candidatas a `/gsd-secure-phase` (P28 é o núcleo da superfície de escalonamento).

## Performance Metrics

**Velocity (histórico de milestones):**

- M1 (v1.0): 7 fases / ~40 plans — shipped 2026-06-06. · M2 (v2.0): 11 fases / 63 plans — shipped 2026-06-26. · Phase 17 standalone: 5 plans — shipped 2026-06-28. · M3 (v3.0): 4 fases / 16 plans — shipped 2026-06-30. · M4 (v4.0): 6 fases / 43 plans — shipped 2026-07-13.
- Ledger detalhado por plano arquivado em `milestones/v*.0-*` e nos SUMMARY de cada fase.

**By Phase (M5):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 28 | TBD | - | - |
| 29 | TBD | - | - |
| 30 | TBD | - | - |

*Updated after each plan completion.*

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions. As que ancoram o M5 (segurança é o eixo):

- [M2/Phase 10]: EFs privilegiadas = two-client + **autorizar DEPOIS de autenticar** (`getUser()` → checar papel + posse) — base direta de SEG-01 (criar/mudar-papel/desativar/reset via EF).
- [M2/Phases 8/11 · M4/Phase 24]: RLS é row-level, **não** column-level; `select('*')` vaza — leituras admin-only via RLS + allowlist; base de SEG-02 (a lista de `usuarios_rh` só o `administrador` lê).
- [M4/Phase 24 · SEC-09]: a policy `auth_admin_le_usuarios_rh` (dependência do `custom_access_token_hook`, SECURITY INVOKER) foi declarada em migration file (idempotente, byte-for-behavior do predicate live) — **preservar, NÃO re-migrar** (SEG-02). Ver [[reference_auth_hook_rls_gap]].
- [M2/Phases 6–15 · M4]: Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL `$$`; grava version row sozinho; no-BEGIN/COMMIT-wrapper) — caminho p/ as migrations de `usuarios_rh`/auditoria da P28.
- [Projeto/invariante]: service_role NUNCA no client — toda escrita privilegiada server-side (SEG-01, guard de bundle).
- [M4/Phase 24 · SEC-11]: os stubs de `ConfiguracoesPage` (A14) e `MeuPerfilPage` (A37) foram gutados a empty-state/stub no M4 (RH shell + route + `RoleGuard` mantidos) — o M5 preenche o conteúdo real (P29/P30).

### Pending Todos

Herdados/deferidos, fora do escopo enxuto do M5 (rastreados p/ M6/backlog):

- **v2 do próprio M5:** USR-08 (troca de email GoTrue), USR-09 (invite lifecycle c/ expiração), USR-10 (UI navegável da trilha de auditoria).
- **Carregados do M4:** DBMIG-01 baseline+rebuild (environment-gated), SEC-03 Vault secret `n8n_webhook_base` (human-action), CC0-01 seed cognitivo, confirmatory HUMAN-UATs P22/23/24. Ver `.planning/todos/` + `.planning/M5-DRAFT.md` (Operação & Comunicação → M6).

### Blockers/Concerns

- None. Roadmap M5 criado; aguardando `/gsd-plan-phase 28`.
- **Segurança é o eixo** — P28 (núcleo: EF + RLS + anti-lockout + auditoria) deve aterrissar e ser securável ANTES de a UI (P29) poder alargar a superfície de escalonamento. SEG-03 (perfil nunca escreve `role`) verificado em P30 contra o mundo onde o ÚNICO write-path de `role` é a EF admin da P28.
- **Contas de teste PROD:** `e2e.admin@beautysmile.com.br` (administrador). ⚠️ 0 contas `role='recrutador'` hoje — o M5 cria a primeira (via a própria feature, P29) p/ exercitar o caminho recrutador.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Feature (v2) | USR-08 email-change · USR-09 invite lifecycle · USR-10 UI de auditoria | Deferred → M5-v2/backlog | M5 kickoff |
| Feature | Operação & Comunicação (notificação, agendamento, KPIs, banco de talentos, retenção LGPD, PSICO) | Deferred → M6 (`.planning/M5-DRAFT.md`) | M4 close · M5 kickoff |
| Tech-debt | DBMIG-01 baseline+rebuild (environment-gated) · SEC-03 Vault secret · CC0-01 seed cognitivo | Deferred → M6/backlog | M4 close |

## Session Continuity

Last session: 2026-07-13T04:00:00.000Z
Stopped at: ROADMAP.md do M5 criado (3 fases 28–30, 13/13 reqs mapeados) + REQUIREMENTS.md traceability preenchida + STATE.md atualizado. Next: `/gsd-plan-phase 28`.
Resume file: None

## Operator Next Steps

- Plan the first phase with `/gsd-plan-phase 28`
