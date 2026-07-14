---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: Operação do Funil RH
status: planning
last_updated: "2026-07-14T22:05:43.194Z"
last_activity: 2026-07-14
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-13 — M5/v5.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 30 — Meu Perfil RH

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-07-14 — Milestone v6.0 started

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
| Phase 29 P03 | 12min | 2 tasks | 3 files |
| Phase 29 P04 | 5min | 3 tasks | 4 files |
| Phase 30 P02 | 8min | 2 tasks | 2 files |
| Phase 30 P03 | 2min | 2 tasks | 1 file |
| Phase 30 P04 | 10min | 2 tasks | 5 files |
| Phase 30 P05 | 7min | 3 tasks | 10 files |

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
- [Phase 29/29-04 · USR-01/02/03/04/05]: GestaoUsuariosPage composes the console (useUsuariosRh query → `<AsyncState>` 5-state → UsuariosRhTable, header + "Novo usuário" CTA owning NovoUsuarioDialog open state) and is wired into ConfiguracoesPage IN PLACE of the M4 empty-state — **single RHLayout owner** (GestaoUsuariosPage is body-only, `space-y-6`, no legacy `p-8`; 0 RHLayout import/JSX). routes.tsx + `RoleGuard role="administrador"` UNTOUCHED (defense-in-depth over the Phase-28 EF authz, T-29-11) — regression-locked by a routes.tsx source assertion in the integration test (T-29-13). AsyncState `copy` override injects the UI-SPEC error/empty strings without editing the shared wrapper; `glass` default true keeps loading/error/empty/success all on a glass surface (never blank, T-29-12). This is the plan that makes USR-01..05 reachable END-TO-END → all 5 marked Complete in REQUIREMENTS.md (checklist + traceability). D-04-DOC deviation: reworded ConfiguracoesPage docstring so the old empty-state string is truly absent (tripped the `! grep` verify). vitest 832/832, tsc flat 104, build 0 (PERF-03 chunks all met). Phase 29 CODE-COMPLETE across 29-01..04.
- [Phase 29/29-03 · USR-01/03/04/05]: EditarPapelDialog + UsuariosRhTable (UI-only, no backend) — glass roster <table> binding ONLY the 9 allowlisted UsuarioRhRow cols (T-29-07; no avatar_url/telefone/created_by) with papel/status badges (AA tints), "Aguardando 1º acesso" chip, "(você)" self-marker (authStore user.id, row NOT hidden), and a per-row Ações DropdownMenu. Row confirms are CONTROLLED AlertDialogs opened from DropdownMenuItem onClick via per-row state (editOpen + confirm) — NOT AlertDialogTrigger-in-menu (which closes the menu and swallows the open); Ativar bypasses the confirm (direct dispatch ativar:true). Every write via the 29-01 hooks (feedback ownership split — the hook toasts + maps LAST_ADMIN + invalidates; the table only swallows the rejection, no double-toast). Anti-lockout (USR-07 UX, T-29-08) derived from rows (role==='administrador' && ativo, count===1): last-active-admin row disables Desativar + the EditarPapelDialog demote (→recrutador) "Salvar papel" with the TriagemTable `<span className=inline-flex>` keyboard-safe disabled-tooltip idiom; the Phase-28 BEFORE UPDATE/DELETE trigger LAST_ADMIN is the authoritative backstop. Resetar-senha confirm is honest (dispatches an e-mail; current password stays valid — T-29-09, no lock claim). Legacy DB role (gerente/visualizador) normalized to 'recrutador' for the Select default + neutral-tint badge fallback. RTL 13/13 (Radix DropdownMenu/AlertDialog/Dialog/Select/Tooltip mocked native + within(row) scoping). 826/826 vitest, tsc flat 104.
- [Phase 29/29-02 · USR-02]: NovoUsuarioDialog (UI-only) = bare RHF register/Controller + zodResolver(novoUsuarioSchema) (LoginRHPage idiom, NOT shadcn Form-field — 0 grep matches) dispatching action:'criar' via useCriarUsuario. Feedback ownership split: the HOOK toasts success/EMAIL_SEND_FAILED-warning + invalidates the roster; the DIALOG owns only the ERROR branch — EMAIL_EXISTS → setError('email') + stays open, VALIDATION/FORBIDDEN/NOT_FOUND/SERVER_ERROR → exact UI-SPEC pt-BR toast.error + stays open — and NEVER double-toasts. Dialog CLOSES on any mutateAsync resolve (success OR warning). Honest helper promises only what the EF does (resetPasswordForEmail, T-29-04); papel fixed Select {Recrutador, Administrador} default recrutador (T-29-05). Client Zod blocks the invoke before it happens. RTL tested over Radix Dialog/Select via native-equivalent mocks (repo idiom). 813/813 vitest, tsc flat 104.
- [Phase 29/29-01 · USR-01..05]: console data layer (UI-only, no backend) = usuariosRhService — allowlist roster read `USUARIOS_RH_LIST_COLUMNS` (9 cols, NEVER wildcard, T-29-01) + 5 EF-backed writes through gerenciar-usuario-rh (T-29-02, client never writes usuarios_rh). Every EF error_code → `.details.error_code`; UNAUTHORIZED is a DISTINCT session-expired outcome; EMAIL_SEND_FAILED resolves success-with-warning (no throw). Client novoUsuarioSchema mirrors the EF `_shared/usuario-rh-schemas` `.strict()` criar branch verbatim — drift guard asserted in the 26-case contract test (safeParse under the shared schema). useUsuariosRh hooks invalidate `usuariosRhKeys.list()` on every mutation success (server-truth for anti-lockout). Flat feature layout per CONTEXT lock. 801/801 vitest, tsc flat 104.
- [Phase 30/30-05 · PERFIL-01/02/03 · SEG-03]: perfil-rh UI wired (3 tasks, 10 files, 877/877 vitest). **PerfilSection** (bare RHF + zodResolver(perfilNomeSchema), NOT shadcn Form-field — grep-guarded): "Nome de exibição" edit + AvatarUpload + READ-ONLY SEG-03 `<dl>` (Email/Cargo/Papel + "geridos por um administrador" note + non-interactive Papel Badge). **SEG-03 verified by a component test asserting the ABSENCE of any papel/cargo/email textbox/combobox/button** (no UI role-escalation path). **AvatarUpload**: signed-URL preview (useQuery staleTime 55min, never logged) / initials fallback, real `<button>` + labeled hidden file input, aria-live status; validateAvatar BEFORE upload → inline FILE_TOO_LARGE/INVALID_MIME. **WARNING #3**: avatar auto-saves via `atualizar.mutate({nome:<loaded/edited>,avatarPath})` — the unconditional RPC SET never blanks nome_completo. **SenhaSection**: 3 password fields, WRONG_CURRENT→`setError('senha_atual')` (form open, session preserved, NO logout), Zod nova≥8/match/differ. **MeuPerfilPage**: stub → real (single RHLayout owner, AsyncState-gated own-row, old "em breve" string gone, routes.tsx untouched). **Task 3 BLOCKER (Success Criterion #1)**: RHTopBar + RHSidebar now derive `userName = adminUser?.nome_completo || candidato?.nome_completo || email-prefix` (email prefix = LAST-resort; before, RH chrome ALWAYS showed the email prefix because candidato is null for RH) + render `adminUser?.avatar_url` signed panel-wide else initials disc; D-13 nav-role gating unchanged. `setAdminUser` (30-04 hook) → chrome updates WITHOUT re-login (RHShellIdentity.test 4/4). Deviations: (Rule 1) RHSidebar.admin.test wrapped in QueryClientProvider (new useQuery dep); (Rule 1) JSDoc "FormField"→"Form-field" to pass the feature grep guard. tsc flat 104, build 0 (PERF-03 chunks met). NEXT = 30-06 [BLOCKING] PROD apply.
- [Phase 30/30-04 · PERFIL-01/PERFIL-02/PERFIL-03]: perfil-rh CLIENT data layer (5 files, RED→GREEN in-plan). `perfilRhService`: own-row read via EXACT 7-col allowlist `.select(PERFIL_RH_COLUMNS).eq('user_id',uid)` (test asserts no `*` — T-30-06); `atualizarPerfil` → `rpc('atualizar_meu_perfil_rh',{p_nome,p_avatar_url})` carrying `as never` + `TODO(30-06)` (RPC not yet in database.types.ts); `alterarSenha` = `signInWithPassword(current)` BEFORE `updateUser(new)` (ANY signIn error → typed WRONG_CURRENT field, never rotates; weak/same_password → WEAK_PASSWORD; NO signOut); `validateAvatar`/`uploadAvatar` (avatars-rh `{uid}/avatar.<ext>` upsert, returns PATH not signed-URL)/`getAvatarSignedUrl`. Pitfall-7 redaction (`{hasPassword}`/`{sizeKb,mime,hasFile}`). `usePerfilRh` hooks: own-row query + 3 mutations. **BLOCKER fix: `useAtualizarPerfil` onSuccess merges edited `{nome_completo,avatar_url,updated_at}` onto current `adminUser` and calls `setAdminUser(merged)` → RH panel chrome (RHTopBar/RHSidebar) reflects new name/avatar WITHOUT a re-login.** **Avatar-always-carries-nome (WARNING #3): `useUploadAvatar` returns ONLY the path; persistence flows through `atualizarPerfil({nome:<loaded>,avatarPath})` so the unconditional RPC SET never blanks nome.** `useAlterarSenha` has NO onError toast — WRONG_CURRENT is a field error owned by SenhaSection (30-05). 21/21 vitest + pitfall-7 guard GREEN, tsc flat 104. Zero deviations.
- [Phase 30/30-03 · PERFIL-01/PERFIL-03/SEG-03]: authored `20260714000001_perfil_rh_rpc_avatars.sql` (files-only; NOT applied — 30-06 owns the MCP apply). `atualizar_meu_perfil_rh(p_nome, p_avatar_url)` DEFINER SET search_path=public: SET list column-limited to nome_completo/avatar_url (+updated_by/updated_at), `WHERE user_id=auth.uid()` own-row-only (NOT_FOUND→P0002), `COALESCE` keeps the avatar on name-only save, best-effort in-RPC `log_auditoria(categoria=usuario,info)` — **SEG-03 by construction** (role/ativo/cargo/email/deleted_at physically absent from SET). `GRANT EXECUTE TO authenticated` — the INVERSE of Phase-28's REVOKE; safe because uid-scoped + column-limited; NO client UPDATE RLS policy re-added (Phase-28 hole stays dropped). Private `avatars-rh` bucket (2MB png/jpeg/webp, idempotent) + 4 own-folder `storage.objects` policies gated `(storage.foldername(name))[1]=(select auth.uid()::text)` — owner-only, NO rh/admin reads-any clause (curriculos analog MINUS cross-user). No BEGIN/COMMIT wrapper (MCP wraps it; wrapper trips 42601 on CLI pooler). Both SET-list grep guards PASS (first-item + comma-preceded); foldername count 5≥4. One atomic commit (both tasks, single file).

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

Last session: 2026-07-14T16:29:57.009Z
Stopped at: context exhaustion at 75% (2026-07-14)
Resume file: None

## Operator Next Steps

- Phase 29 is code-complete (console live at `/rh/configuracoes`). Recommended next: `/gsd-secure-phase 29` (privilege-escalation surface — RoleGuard defense-in-depth + AsyncState no-blank + route/guard regression) and a `/gsd-verify-work` live UAT with admin `e2e.admin@beautysmile.com.br` (exercise USR-01..05 end-to-end; USR-02 creates the system's first `recrutador`).
- Then execute Phase 30 (Meu Perfil RH — A37 self-service, SEG-03 anti-privilege-escalation): `/gsd-plan-phase 30`.
