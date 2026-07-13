# Phase 29: Console de Gestão de Usuários RH (A14 UI) - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas, all recommendations accepted by Fernando

<domain>
## Phase Boundary

Entrega a **UI real** do console de gestão de usuários RH em `/rh/configuracoes` (hoje um empty-state "Gestão de usuários ainda não disponível"). O `administrador` lista os usuários RH e executa toda ação de conta ponta-a-ponta **através do write-path seguro da Phase 28** (a EF `gerenciar-usuario-rh`), nunca escrevendo direto do client.

Requisitos: USR-01 (listar), USR-02 (criar + novo usuário define senha), USR-03 (mudar papel), USR-04 (desativar/reativar), USR-05 (reset de senha).

**Substrato existente:** rota `/rh/configuracoes` + `RoleGuard role="administrador"` + `ConfiguracoesPage` (empty-state) já existem (Phase 25 esvaziou o mock). EF `gerenciar-usuario-rh` deployada (Phase 28, authenticate-THEN-authorize, ações criar/mudar_papel/ativar/desativar/resetar_senha, contrato de erro `{ok,error_code,message,field?}`). RLS `usuarios_rh` admin-only (admin lê o roster completo). Padrões: `supabase.functions.invoke` (ver decisaoService/triagemService), features em `src/features/admin/`, TanStack Query, shadcn table/dialog/dropdown-menu/alert-dialog/badge/form/input, `<AsyncState>` 5-state (M3).

**Fora do escopo:** o self-service "Meu Perfil" (Phase 30); troca de email (v2 USR-08); UI de auditoria navegável (v2 USR-10); convite-email lifecycle (v2 USR-09). Nenhuma mudança de backend — o backend está pronto na Phase 28.
</domain>

<decisions>
## Implementation Decisions

### Área 1 — Data layer & integração com a EF (USR-01..05)
- **`usuariosRhService`** em `src/features/admin/services/`: **list** via `supabase.from('usuarios_rh').select(<allowlist>)` (a RLS admin-only já entrega o roster completo — sem EF p/ leitura); **writes** (criar/mudar_papel/ativar/desativar/resetar_senha) via `supabase.functions.invoke('gerenciar-usuario-rh', { body: { action, ... } })`, parseando `{ ok, error_code, message, field? }`.
- **Projeção da lista = allowlist explícito** (`id, user_id, nome_completo, email, cargo, role, ativo, primeiro_acesso, data_ultimo_login`) — NUNCA `select('*')` (disciplina de projeção do projeto; a lista é PII interna).
- **Estado servidor = TanStack Query**: hook `useUsuariosRh()` (query) + mutations (criar/mudarPapel/ativarDesativar/resetarSenha) que **invalidam a query da lista** no sucesso (optimistic opcional, à discrição). Query key hierárquica (`usuariosRhKeys`).
- **Tratamento de erro = map `error_code` → toast pt-BR**: `LAST_ADMIN` (não pode rebaixar/desativar o último admin), `EMAIL_EXISTS` (→ field email no dialog), `VALIDATION`/`FORBIDDEN`/`SERVER_ERROR` (genéricos pt-BR), `NOT_FOUND`. `EMAIL_SEND_FAILED` no criar = **sucesso-com-aviso** (usuário criado; email de senha falhou — reenviar depois).

### Área 2 — Interações do console (USR-02..05, USR-07 UX)
- **Criar = Dialog "Novo usuário"** (RHF + Zod: email, nome_completo, cargo, papel ∈ {recrutador, administrador}) → invoke `criar` → toast de sucesso + refetch. Mensagem honesta: o usuário recebe um email para definir a senha (o que a EF de fato dispara), sem prometer mais que isso.
- **Ações da linha = dropdown-menu** (Editar papel · Ativar/Desativar · Resetar senha). Desativar e Resetar senha ficam atrás de um **AlertDialog** de confirmação pt-BR. Editar papel = um pequeno dialog/select {recrutador, administrador}.
- **Anti-lockout UX = hint client + servidor autoritativo**: desabilitar (com tooltip) as ações Desativar / Rebaixar-papel na linha do **último administrador ativo** (contagem client-side sobre a lista carregada); a EF/trigger `LAST_ADMIN` continua a fonte de verdade (se uma race disparar, mostra o toast). O hint é UX, não segurança.
- **Status = Badges**: Badge ativo/inativo + Badge de papel (recrutador/administrador); `primeiro_acesso=true` → indicador "Aguardando 1º acesso". `data_ultimo_login` formatado (ou "—").

### Área 3 — Guards & estados (SEG-02 UI, escopo)
- **Acesso**: manter o `RoleGuard role="administrador"` que já existe na rota + a EF autoriza no servidor (defesa em profundidade). Sem checagem de role ad-hoc na página.
- **Loading/empty/error = reusar `<AsyncState>`** (contrato 5-state do M3) — nunca tela em branco; "Tentar novamente" no erro.
- **Auto-gestão**: o admin logado aparece na própria lista; ações destrutivas na própria linha caem na mesma trava anti-lockout (o servidor decide) — não esconder a própria linha.
- **Confirmações = AlertDialog pt-BR honesto** para Desativar (perde acesso ao painel) e Resetar senha (dispara email de redefinição) — sem promessa de e-mail além do que a EF realmente faz.

### Claude's Discretion
- Se a lista de criar usa um único Dialog ou um Sheet; nomes exatos dos componentes; se `useUsuariosRh` mora em `hooks/` da feature admin; formato exato das mensagens de toast; se o "Editar papel" é um dialog dedicado ou um inline select com confirm; uso de optimistic update vs simples invalidate.
- Se o filtro/busca por nome/email entra agora (nice-to-have) ou fica p/ depois — priorizar o CRUD funcional primeiro.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- EF `gerenciar-usuario-rh` (Phase 28) — o único write-path. Contrato de erro `{ok,error_code,message,field?}`. Retorna `{userId, usuarioRhId}` no criar.
- `supabase.functions.invoke(...)` idiom — `src/features/decisao/services/decisaoService.ts:93`, `src/features/triagem/services/triagemService.ts:248`.
- shadcn primitives: `table.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `dropdown-menu.tsx`, `form.tsx`, `input.tsx`, `badge.tsx`, `button.tsx`.
- `<AsyncState>` 5-state wrapper (M3, Phase 18). Toast via sonner (single-instance, `resolve.dedupe`).
- TanStack Query v5 (staleTime 5min, retry 2), query keys hierárquicas.
- `ConfiguracoesPage` em `src/components/pages/` (legado; a UI real pode viver aqui ou migrar p/ `src/features/admin/components/` à discrição — a rota importa `ConfiguracoesPage`).

### Established Patterns
- Feature-first: `src/features/admin/{components,hooks,services,schemas,types}/`.
- Services com classes de erro customizadas; parse do error_code estruturado da EF.
- Allowlist de projeção (nunca `select('*')` — [[reference_select_star_leaks_pii]]).
- RoleGuard fora do lazy element (Phase 19 bundle split).

### Integration Points
- `src/router/routes.tsx:60` — `ConfiguracoesPage` lazy + `RoleGuard role="administrador"`. A UI real substitui o empty-state DENTRO da página (rota/guard intactos).
- `src/features/admin/` — nova service + hooks + components + schemas.
- `database.types.ts` (raiz) já tem `usuarios_rh` Row + as 3 novas funções (Phase 28).
</code_context>

<specifics>
## Specific Ideas

- Conta de teste: `e2e.admin@beautysmile.com.br` (administrador) — usar p/ o UAT visual/live. **0 contas recrutador hoje** → o primeiro recrutador é criado PELA feature (USR-02), fechando o loop do caminho recrutador.
- A EF já dispara `resetPasswordForEmail` → `/auth/redefinir-senha?tipo=rh`. A copy do console deve refletir isso honestamente ("enviamos um email para o usuário definir a senha"), sem inventar canais.
- `EMAIL_SEND_FAILED` é sucesso-com-aviso (não erro): o usuário existe; o email pode ser reenviado (reset).
</specifics>

<deferred>
## Deferred Ideas

- Meu Perfil RH self-service (nome/foto/senha própria) → Phase 30.
- Troca de email do usuário RH → v2 (USR-08).
- UI de auditoria navegável/filtrável (a trilha já é gravada) → v2 (USR-10).
- Convite-email lifecycle completo (expiração/reenvio) → v2 (USR-09).
- Busca/filtro/paginação rica → nice-to-have, só se sobrar (o roster RH é pequeno).
</deferred>
