# Phase 28: Gestão de Usuários RH — Núcleo Seguro - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas, all recommendations accepted by Fernando

<domain>
## Phase Boundary

Entrega o **núcleo de servidor seguro** para gerir contas RH — sem UI (a UI é a Phase 29). Requisitos: USR-06 (auditoria), USR-07 (anti-lockout), SEG-01 (escrita privilegiada só via EF authenticate-THEN-authorize), SEG-02 (RLS admin-only + auth-hook preservado).

Concretamente: (1) uma Edge Function service_role que autentica-DEPOIS-autoriza toda escrita de usuário RH; (2) o modelo de dados/RLS de `usuarios_rh` que só admin lê/escreve (via EF) preservando `auth_admin_le_usuarios_rh`; (3) trilha de auditoria append-only das ações; (4) guarda anti-lockout server-enforced (≥1 administrador ativo sempre).

**Fora do escopo desta fase:** qualquer tela/console (Phase 29), self-service de perfil (Phase 30). A EF já deve suportar a ação `criar` porque o console (P29/USR-02) a consome, mas nenhuma UI é construída aqui.

**Substrato já existente (scout):** `usuarios_rh` já tem `ativo`, `deleted_at`, `avatar_url`, `primeiro_acesso`, `cargo`, `role`, `created_by`, `updated_by`, `data_ultimo_login`, `user_id`, view `v_usuarios_rh_ativos`. Auditoria genérica `logs_auditoria` + RPC `log_auditoria()` com enum `categoria_log_auditoria` (inclui `'usuario'` e `'seguranca'`) já existem. `_shared/audit-logger.ts` existe. Padrão EF authenticate-THEN-authorize já vive em comparativo-candidatos / consolidar-decisao-final / gerar-guia-entrevista. Policy `auth_admin_le_usuarios_rh` declarada em `20260706110006_sec09_auth_admin_policy.sql` (M4/SEC-09).
</domain>

<decisions>
## Implementation Decisions

### Área 1 — Edge Function privilegiada & autorização (SEG-01, USR-02, USR-03)
- **EF única `gerenciar-usuario-rh`** com `action` discriminada via Zod discriminated-union (`criar` / `mudar_papel` / `ativar` / `desativar` / `resetar_senha`) — um só ponto authenticate-THEN-authorize (menos superfície). Reusa `_shared` helpers.
- **Autorização = fonte de verdade, não o JWT:** `getUser()` (autentica) → SELECT `role` de `usuarios_rh` pelo `user_id` com service_role → exige `role='administrador' AND ativo=true AND deleted_at IS NULL` (autoriza) ANTES de qualquer escrita. Chamador não-autenticado → 401; autenticado não-admin → 403.
- **Criar usuário (USR-02):** `supabase.auth.admin.createUser` (senha temporária aleatória, `email_confirm:true`) + linha `usuarios_rh` (`primeiro_acesso=true`, `created_by`=ator, `ativo=true`) na mesma operação; depois gera/dispara link de **recovery** do GoTrue para o próprio usuário definir a senha. Convite-por-email com lifecycle completo fica em v2 (USR-09).
- **Mudança de papel (USR-03) vale no próximo login/refresh** — o `custom_access_token_hook` relê `usuarios_rh` a cada emissão de token; documentar que a sessão ativa não muta instantaneamente (sem force-logout remoto no M5).

### Área 2 — Modelo de dados, RLS & anti-lockout (SEG-02, USR-04, USR-07)
- **Desativar (USR-04) = `ativo=false`** (reversível; reativar = `ativo=true`). `deleted_at` fica reservado p/ remoção lógica futura — **não usado no M5** (nunca hard-delete de identidade — LGPD).
- **Usuário desativado é bloqueado de logar por defesa em profundidade:** o caminho de login / auth-hook nega o papel/sessão RH quando `NOT ativo OR deleted_at IS NOT NULL` (teeth no app, não depende do GoTrue); ban via `auth.admin` opcional como reforço. **Cuidado:** verificar o corpo LIVE do `custom_access_token_hook` antes de alterá-lo (precedente M4/DBMIG-02: `CREATE OR REPLACE` cego dropou um guard) — preservar `auth_admin_le_usuarios_rh` e a resolução de papel existente.
- **RLS de `usuarios_rh` (SEG-02):** SELECT admin-only (subquery `role='administrador'` em `usuarios_rh`) **+ own-row** (o próprio usuário lê seu registro — necessário p/ A37 na Phase 30); INSERT/UPDATE/DELETE **negados a todos os roles no client** — só a EF service_role escreve. `recrutador`/candidato leem 0 linhas da lista. Policy `auth_admin_le_usuarios_rh` (SEC-09) **preservada intacta** (não re-migrar/quebrar).
- **Anti-lockout (USR-07) por defesa em profundidade:** checagem no corpo da EF (conta administradores ativos antes de rebaixar/desativar/remover → erro distinto amigável) **+** trigger `BEFORE UPDATE/DELETE` em `usuarios_rh` como backstop que recusa qualquer mutação que resultaria em 0 administradores ativos (`role='administrador' AND ativo AND deleted_at IS NULL`).

### Área 3 — Trilha de auditoria (USR-06)
- **Reusar `logs_auditoria` + RPC `log_auditoria()`** com `categoria='usuario'` — não criar tabela nova. Mapeamento: `usuario_id`=ator (admin), `recurso_id`=alvo (usuário gerido), `recurso_tipo='usuarios_rh'`, `acao` ∈ {criar, mudar_papel, desativar, reativar, resetar_senha}, `dados_antes`/`dados_depois` (papel/status antes-depois), `sucesso=true`, `severidade` apropriada.
- **Append-only:** garantir que `logs_auditoria` não tem policy de UPDATE/DELETE para nenhum role (INSERT só via RPC SECURITY DEFINER `log_auditoria`); verificar o estado atual e endurecer se necessário.
- **Atomicidade ação↔log:** mutações puramente-DB (mudar_papel, ativar, desativar) rodam numa RPC SECURITY DEFINER que faz a mutação **e** grava a auditoria na MESMA transação; ações que tocam GoTrue fora do Postgres (criar via `auth.admin.createUser`, reset de senha) logam logo após com best-effort + alarme se o log falhar (a mutação já é fonte de verdade).
- **O que é auditado:** as 5 ações mutantes, 1 linha cada; leituras da lista **não** são auditadas.

### Claude's Discretion
- Nomes exatos de arquivos de migration/EF, shape preciso do Zod schema, formato das mensagens de erro (seguir o contrato estruturado `{ ok, error_code, message, field? }` do projeto), e se a checagem anti-lockout na EF reusa a mesma RPC do trigger.
- Se o reset de senha (USR-05) usa `auth.admin.generateLink({type:'recovery'})` vs `resetPasswordForEmail` server-side — escolher o que entrega o link de redefinição de forma mais confiável no ambiente atual (GoTrue SMTP do Supabase Pro).
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `usuarios_rh` (colunas já suportam quase tudo: `ativo`, `deleted_at`, `avatar_url`, `primeiro_acesso`, `cargo`, `role`, `created_by`, `updated_by`, `data_ultimo_login`) + view `v_usuarios_rh_ativos`.
- `logs_auditoria` table + `log_auditoria()` RPC + enum `categoria_log_auditoria` (`'usuario'`, `'seguranca'`, …) + `_shared/audit-logger.ts`.
- Padrão EF authenticate-THEN-authorize: `comparativo-candidatos`, `consolidar-decisao-final`, `gerar-guia-entrevista`, `avaliar-transcricao-entrevista`. `_shared/` helpers (schemas.ts, constants.ts, pii-masker.ts, injection-detector.ts).
- Contrato de erro estruturado de EF `{ ok, error_code, message, field? }` (Key Decisions PROJECT.md).
- Migrations PROD via **Supabase MCP `apply_migration`** (bypassa 42601; grava a version-row) — apply é wave [BLOCKING] autorizado por Fernando.

### Established Patterns
- Role lido de `usuarios_rh` via `custom_access_token_hook` (SECURITY INVOKER) + policy `auth_admin_le_usuarios_rh` (grant SELECT p/ `supabase_auth_admin`). **Não re-migrar.**
- RLS "nunca é segredo de coluna"; escrita privilegiada só server-side (invariante do projeto — service_role nunca no client).
- Trigger BEFORE UPDATE com guard (precedente M4/P25 reject-guard, M4/DBMIG-02 avancar_etapa) — modelo p/ o trigger anti-lockout.
- Smokes comportamentais com JWT impersonado (`set_config request.jwt.claims` + `SET ROLE authenticated`) como gate de verificação — modelo p/ os smokes SEG-01/02/USR-07.

### Integration Points
- Nova EF em `supabase/functions/gerenciar-usuario-rh/` (+ `_shared`).
- Migrations em `supabase/migrations/` (RLS usuarios_rh, trigger anti-lockout, hardening append-only de logs_auditoria se necessário, RPC(s) SECURITY DEFINER de mutação+audit).
- O login path / auth-hook: verificar corpo LIVE antes de tocar (bloqueio de inativo).
- `database.types.ts` na RAIZ do repo (regenerar após migrations).
</code_context>

<specifics>
## Specific Ideas

- Contas de teste PROD: `e2e.admin@beautysmile.com.br` (administrador). **0 contas `role='recrutador'`** hoje — a primeira será criada pela própria feature (Phase 29/USR-02), então os smokes desta fase que precisam de um não-admin podem impersonar via `set_config` de claims em vez de depender de uma conta real.
- Verificar o corpo LIVE de qualquer função/hook antes de `CREATE OR REPLACE` (lição M4/DBMIG-02 e M4/P27 — `pg_get_functiondef`).
- `submit_candidatura_atomic` / EFs privilegiadas são o precedente direto de authenticate-THEN-authorize + RPC SECURITY DEFINER.
</specifics>

<deferred>
## Deferred Ideas

- USR-08 troca de email do usuário RH (fluxo de confirmação GoTrue) → v2.
- USR-09 convite-por-email com lifecycle completo (expiração/reenvio) → v2 (o M5 usa createUser+recovery).
- USR-10 UI de auditoria navegável/filtrável → v2 (o M5 grava a trilha; a consulta rica fica depois).
- Force-logout remoto / revogação de sessão ao mudar papel → não no M5 (papel vale no próximo refresh).
</deferred>
