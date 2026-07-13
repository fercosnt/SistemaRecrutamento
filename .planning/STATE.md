---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: M5 — Gestão de Usuários & Perfil RH
status: executing
stopped_at: Completed 29-02-PLAN.md (NovoUsuarioDialog — RHF+Zod create form → action:'criar'; honest copy; EMAIL_EXISTS field / EMAIL_SEND_FAILED warning / pending disable)
last_updated: "2026-07-13T20:05:00Z"
last_activity: 2026-07-13 -- Phase 29 Plan 02 complete (NovoUsuarioDialog create form)
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 12
  completed_plans: 10
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-13 — M5/v5.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 29 — Console de Gestão de Usuários RH

## Current Position

Phase: 29 (Console de Gestão de Usuários RH) — EXECUTING
Plan: 3 of 4 (29-01 data layer + 29-02 NovoUsuarioDialog complete)
Status: Executing Phase 29
Last activity: 2026-07-13 -- Phase 29 Plan 02 complete (NovoUsuarioDialog create form)

Progress: [████████░░] 83%

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
| Phase 28 P04 | 12min | 2 tasks | 2 files |
| Phase 28 P05 | 2min | 2 tasks | 2 files |
| Phase 28 P06 | 6min | 2 tasks | 2 files |
| Phase 29 P01 | 5min | 3 tasks | 4 files |
| Phase 29 P02 | 4min | 1 task | 2 files |

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions. As que ancoram o M5 (segurança é o eixo):

- [M2/Phase 10]: EFs privilegiadas = two-client + **autorizar DEPOIS de autenticar** (`getUser()` → checar papel + posse) — base direta de SEG-01 (criar/mudar-papel/desativar/reset via EF).
- [M2/Phases 8/11 · M4/Phase 24]: RLS é row-level, **não** column-level; `select('*')` vaza — leituras admin-only via RLS + allowlist; base de SEG-02 (a lista de `usuarios_rh` só o `administrador` lê).
- [M4/Phase 24 · SEC-09]: a policy `auth_admin_le_usuarios_rh` (dependência do `custom_access_token_hook`, SECURITY INVOKER) foi declarada em migration file (idempotente, byte-for-behavior do predicate live) — **preservar, NÃO re-migrar** (SEG-02). Ver [[reference_auth_hook_rls_gap]].
- [M2/Phases 6–15 · M4]: Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL `$$`; grava version row sozinho; no-BEGIN/COMMIT-wrapper) — caminho p/ as migrations de `usuarios_rh`/auditoria da P28.
- [Projeto/invariante]: service_role NUNCA no client — toda escrita privilegiada server-side (SEG-01, guard de bundle).
- [M4/Phase 24 · SEC-11]: os stubs de `ConfiguracoesPage` (A14) e `MeuPerfilPage` (A37) foram gutados a empty-state/stub no M4 (RH shell + route + `RoleGuard` mantidos) — o M5 preenche o conteúdo real (P29/P30).
- [Phase ?]: [Phase 28/28-04 · SEG-02]: usuarios_rh roster is admin-only via is_active_rh_admin() plpgsql DEFINER predicate; own-row SELECT preserved as live 'RH pode ler seu proprio perfil' (not duplicated); self-promotion UPDATE policy dropped (SEG-03 early close).
- [Phase ?]: [Phase 28/28-04 · USR-06]: logs_auditoria append-only (drop forgeable authenticated INSERT + REVOKE writes); limpar_logs_antigos() byte-preserved diff excludes categoria usuario/seguranca from the 730-day purge.
- [Phase 28/28-05 · USR-07]: anti-lockout is a BEFORE UPDATE OR DELETE trigger with pg_advisory_xact_lock before the admin count(*) (defeats write-skew to 0 admins); fires inside the DEFINER RPC and for raw service_role, RAISE P0001 -> LAST_ADMIN. EF pre-count is friendly defense-in-depth; the trigger is the hard backstop.
- [Phase 28/28-05 · USR-06]: gerir_usuario_rh_mutacao + criar_usuario_rh_com_audit are SECURITY DEFINER RPCs that mutate usuarios_rh AND write log_auditoria(categoria=usuario) in one tx (atomic); REVOKE EXECUTE from public/authenticated/anon; param names pinned verbatim to 28-06 EF .rpc() calls.
- [Phase ?]: 28-06: gerenciar-usuario-rh EF is the single admin-gated write-path — authenticate (anon getUser) THEN authorize administrador-ONLY from usuarios_rh (no recrutador->rh normalization, role never from the JWT); .strict() discriminated-union body; RPC sites pinned to 28-05 sigs; 28-02 Deno test GREEN 9/9; deploy is 28-07.
- [Phase 29/29-02 · USR-02]: NovoUsuarioDialog (UI-only) = bare RHF register/Controller + zodResolver(novoUsuarioSchema) (LoginRHPage idiom, NOT shadcn Form-field — 0 grep matches) dispatching action:'criar' via useCriarUsuario. Feedback ownership split: the HOOK toasts success/EMAIL_SEND_FAILED-warning + invalidates the roster; the DIALOG owns only the ERROR branch — EMAIL_EXISTS → setError('email') + stays open, VALIDATION/FORBIDDEN/NOT_FOUND/SERVER_ERROR → exact UI-SPEC pt-BR toast.error + stays open — and NEVER double-toasts. Dialog CLOSES on any mutateAsync resolve (success OR warning). Honest helper promises only what the EF does (resetPasswordForEmail, T-29-04); papel fixed Select {Recrutador, Administrador} default recrutador (T-29-05). Client Zod blocks the invoke before it happens. RTL tested over Radix Dialog/Select via native-equivalent mocks (repo idiom). 813/813 vitest, tsc flat 104.
- [Phase 29/29-01 · USR-01..05]: console data layer (UI-only, no backend) = usuariosRhService — allowlist roster read `USUARIOS_RH_LIST_COLUMNS` (9 cols, NEVER wildcard, T-29-01) + 5 EF-backed writes through gerenciar-usuario-rh (T-29-02, client never writes usuarios_rh). Every EF error_code → `.details.error_code`; UNAUTHORIZED is a DISTINCT session-expired outcome; EMAIL_SEND_FAILED resolves success-with-warning (no throw). Client novoUsuarioSchema mirrors the EF `_shared/usuario-rh-schemas` `.strict()` criar branch verbatim — drift guard asserted in the 26-case contract test (safeParse under the shared schema). useUsuariosRh hooks invalidate `usuariosRhKeys.list()` on every mutation success (server-truth for anti-lockout). Flat feature layout per CONTEXT lock. 801/801 vitest, tsc flat 104.

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

Last session: 2026-07-13T20:05:00Z
Stopped at: Completed 29-02-PLAN.md (NovoUsuarioDialog — RHF+Zod create form, honest copy, error_code → field/toast mapping, pending disable)
Resume file: None

## Operator Next Steps

- Plan the first phase with `/gsd-plan-phase 28`
