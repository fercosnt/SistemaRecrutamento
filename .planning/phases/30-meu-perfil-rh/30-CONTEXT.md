# Phase 30: Meu Perfil RH (A37 self-service) - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas, all recommendations accepted by Fernando

<domain>
## Phase Boundary

Entrega o **self-service de perfil** do usuário RH em `/rh/perfil` (hoje um stub "Edição de perfil em breve"). Cada usuário RH gerencia o PRÓPRIO perfil — edita nome de exibição, troca a própria senha (com re-autenticação), faz upload da própria foto — com a garantia dura de que esse caminho self-service **nunca** pode escalar um papel.

Requisitos: PERFIL-01 (editar nome), PERFIL-02 (trocar senha c/ senha atual), PERFIL-03 (foto own-row), SEG-03 (anti-privilege-escalation — o caminho de perfil NUNCA altera `role`; nenhuma rota/API/RLS permite auto-promoção).

**Contexto crítico da Phase 28:** a Phase 28 **DROPOU** a policy own-row UPDATE de `usuarios_rh` (`RH pode atualizar seu próprio perfil`, que era um buraco de self-promotion sem WITH CHECK) — então o client **não pode mais escrever `usuarios_rh` diretamente**. O perfil precisa de um write-path NOVO e seguro, e esse write-path É onde SEG-03 vive.

**Substrato existente:** `MeuPerfilPage` stub em `src/components/pages/` + rota `/rh/perfil` (routes.tsx:403) + RoleGuard rh/administrador + RHLayout. `usuarios_rh` já tem `avatar_url` + `nome_completo`. Analogs: `cvUploadService` (upload bucket privado, path schema `{auth.uid()}/{uuid}.pdf`), `passwordService`/`authService` (GoTrue signInWithPassword/updateUser), `<AsyncState>` 5-state, RHF+Zod (LoginRHPage idiom).

**Fora do escopo:** gestão de TERCEIROS (isso é A14/Phase 29); troca de email (v2 USR-08); qualquer coisa que toque role/ativo/cargo do próprio usuário (proibido por SEG-03).
</domain>

<decisions>
## Implementation Decisions

### Área 1 — Write path do perfil (SEG-03 — o eixo) (PERFIL-01, SEG-03)
- **RPC SECURITY DEFINER `atualizar_meu_perfil_rh(p_nome text, p_avatar_url text)`**: faz `UPDATE public.usuarios_rh SET nome_completo=p_nome, avatar_url=p_avatar_url, updated_by=auth.uid(), updated_at=now() WHERE user_id=auth.uid()`. **SEG-03 fechado por CONSTRUÇÃO**: `role`/`ativo`/`deleted_at`/`cargo`/`email` NÃO estão no SET → o caminho self-service fisicamente não consegue escalar papel nem reativar/renomear cargo. `SET search_path=public`. `GRANT EXECUTE TO authenticated` (é self-service, baixo privilégio — diferente das RPCs admin-only da Phase 28 que são REVOKE de authenticated). O `WHERE user_id=auth.uid()` garante que só escreve a PRÓPRIA linha.
- **Colunas editáveis = só `nome_completo` + `avatar_url`**. Nunca role, ativo, cargo, email, deleted_at.
- **RLS UPDATE de `usuarios_rh` segue NEGADA** a todo role client (Phase 28 dropou; não re-adicionar) — o RPC DEFINER é o único write-path self-service. `avatar_url` NULL-safe (p_avatar_url pode ser NULL = não muda foto; usar COALESCE ou dois args opcionais à discrição).
- **Auditoria best-effort**: `log_auditoria` `categoria='usuario'` `acao='editar_perfil'` `usuario_id=auth.uid()` `recurso_id=própria row id` — leve, não-fatal (dentro do RPC ou best-effort). `severidade='info'`.

### Área 2 — Senha & re-autenticação (PERFIL-02)
- **Trocar senha = GoTrue client-only, sem backend**: verificar a senha ATUAL via `supabase.auth.signInWithPassword({ email, password: atual })` (re-auth); se ok → `supabase.auth.updateUser({ password: nova })`. Senha atual errada → erro no campo "senha atual".
- **Exige senha atual** (re-autenticação) — anti-account-takeover se a sessão vazar.
- **Validação Zod**: nova senha min 8, confirmar nova (match), nova ≠ atual; mensagens pt-BR. Redação Pitfall-7 (nunca logar senha/token — precedente `passwordService`).
- **Feedback**: toast de sucesso; a sessão permanece válida (sem logout forçado).

### Área 3 — Foto, UI & estados (PERFIL-03)
- **Upload own-folder**: bucket privado (novo `avatars-rh` OU reusar o padrão de curriculos se apropriado — à discrição), path `{auth.uid()}/avatar.<ext>`, **RLS own-folder** (o usuário só lê/escreve dentro da própria pasta — analog `cvUploadService`/curriculos bucket policy). Depois do upload, gravar `avatar_url` (URL assinada ou path) via `atualizar_meu_perfil_rh`.
- **Limites**: ≤2MB, `image/png|jpeg|webp`, validado no client E na storage policy.
- **Layout**: substituir o stub — RHLayout ÚNICO (a página renderiza body; sem duplo-nest), seções Perfil (nome + foto) / Senha (RHF+Zod). `<AsyncState>` onde carrega o próprio registro (`usuarios_rh` own-row — a Phase 28 preservou a policy own-row SELECT `RH pode ler seu próprio perfil`, então o self-read funciona). Copy honesta pt-BR.
- **Escopo = só o próprio usuário** (`auth.uid()`); sem gestão de terceiros.

### Claude's Discretion
- Nome exato do bucket (novo `avatars-rh` vs reuso); se `avatar_url` guarda path vs signed URL (private bucket → signed URL on read, ou render via `createSignedUrl`); se o RPC recebe 2 args opcionais ou faz COALESCE; se auditoria fica dentro do RPC ou best-effort no service; nomes de componentes/hooks; se o perfil e a senha são um form só ou dois; se a foto usa preview otimista.
- Feature dir: `src/features/perfil-rh/` (novo) ou dentro de `admin/` — à discrição, feature-first.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MeuPerfilPage` stub (`src/components/pages/MeuPerfilPage.tsx`) — rota `/rh/perfil` (routes.tsx:403), RoleGuard rh/administrador, RHLayout, export nomeado `MeuPerfilPage` (a rota importa por esse nome — preservar).
- `cvUploadService` (`src/features/vagas/services/cvUploadService.ts`) — upload a bucket privado, path schema `{auth.uid()}/...`, validação de MIME/tamanho — analog direto do avatar upload.
- `passwordService` / `authService` (`src/features/auth/services/`) — GoTrue `signInWithPassword`, redação Pitfall-7; `supabase.auth.updateUser` é o novo call p/ trocar senha.
- `<AsyncState>` 5-state; RHF+Zod (LoginRHPage register/Controller+zodResolver); sonner toast; glass UI.
- `usuarios_rh` own-row SELECT policy `RH pode ler seu próprio perfil` (Phase 28 preservou) → o self-read do perfil funciona. `avatar_url`/`nome_completo` colunas existem.
- Migrations PROD via Supabase MCP `apply_migration` (bypassa 42601). `log_auditoria` RPC (categoria='usuario').

### Established Patterns
- Privileged/self writes NUNCA escrevem `role` no client; RLS UPDATE de `usuarios_rh` negada → RPC DEFINER é o write-path. SEG-03 = o RPC fisicamente não toca role.
- Storage own-folder RLS: `(storage.foldername(name))[1] = auth.uid()::text` (curriculos bucket precedent).
- Verificar corpo LIVE de qualquer função antes de CREATE OR REPLACE (M4/DBMIG-02).
- Behavioral SQL smokes com JWT impersonado como gate (Phase 28 precedent) — p/ SEG-03 (o RPC não escreve role) + own-row-only.

### Integration Points
- Nova migration `supabase/migrations/*.sql`: RPC `atualizar_meu_perfil_rh` + storage bucket `avatars-rh` + policies own-folder. Aplicar via MCP ([BLOCKING] wave).
- Nova feature `src/features/perfil-rh/` (service/hooks/schemas/components) — à discrição.
- `MeuPerfilPage` (modificado): substitui o stub, preserva rota + RoleGuard + RHLayout.
- `database.types.ts` (raiz) regenerar após a migration (nova RPC).
</code_context>

<specifics>
## Specific Ideas

- SEG-03 é o eixo: prove por smoke que (a) o RPC atualiza SÓ a própria linha (WHERE user_id=auth.uid()), (b) um recrutador NÃO consegue mudar `role` por NENHUM caminho (RPC não expõe role; RLS UPDATE negada — re-provar o smoke da Phase 28 WR-01 continua verde), (c) o RPC não escreve outra linha que não a do caller.
- Conta de teste: `e2e.admin@beautysmile.com.br`; a primeira conta recrutador é criada pela Phase 29 (A14) — o caminho recrutador do perfil pode ser exercitado com ela no HUMAN-UAT.
- Password change real (GoTrue) + avatar delivery são round-trips live → HUMAN-UAT.
</specifics>

<deferred>
## Deferred Ideas

- Troca de email do próprio usuário RH → v2 (USR-08, fluxo de confirmação GoTrue).
- Gestão de terceiros (nome/foto/senha de OUTROS usuários) → é A14/Phase 29 (já entregue).
- MFA/2FA → fora do M5.
- Editar cargo/telefone do próprio perfil → fora do escopo enxuto (só nome/foto/senha); cargo é gerido pelo admin (A14).
</deferred>
