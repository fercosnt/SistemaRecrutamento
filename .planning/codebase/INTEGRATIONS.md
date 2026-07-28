# Integrações Externas

**Data de Análise:** 2026-04-19
**Projeto:** Sistema de Recrutamento Beauty Smile

Este documento cataloga todos os serviços externos, webhooks, e fluxos de autenticação que o sistema consome ou expõe.

---

## APIs e Serviços Externos

### Supabase (Backend principal)

- **Propósito:** Autenticação, banco Postgres, Storage e (potencialmente) Realtime. Única camada de dados do sistema — não há backend próprio.
- **Projeto identificado:** `isljnozzlvckrgjjbjwp.supabase.co` (citado em `docs/email-templates/README.md:72` e `docs/email-templates/SETUP_GUIDE.md:7`).
- **SDK:** `@supabase/supabase-js ^2.48.1`.
- **Clientes inicializados em `src/lib/supabase/client.ts`:**
  - `supabase` (linha 42) — anon key, `flowType: 'pkce'`, `storageKey: 'sb-auth-token'`, `persistSession`, `autoRefreshToken`.
  - `supabaseAdmin` (linha 79) — service role key, `storageKey: 'sb-admin-auth-token'`, usado para operações que bypassam RLS (ex.: criação de candidato em `cadastroService.ts`).
- **Variáveis de ambiente:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_SERVICE_ROLE_KEY` *(red flag: está sendo lido client-side — é embutido no bundle)*.

### Supabase Auth

- **Tipo:** Email + senha, fluxo PKCE.
- **Usado em:**
  - `signUp` — `src/features/cadastro/services/authService.ts` e `cadastroService.ts`.
  - `signInWithPassword` — `src/components/pages/LoginCandidatoPage.tsx`, `LoginRHPage.tsx`.
  - `resetPasswordForEmail` — `src/components/pages/EsqueciSenhaPage.tsx` (redirect para `/auth/redefinir-senha`).
  - `updateUser` — `RedefinirSenhaPage.tsx`.
  - `onAuthStateChange` global em `src/App.tsx:193-222` (escuta `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`).
  - `getSession`/`getUser` — helpers em `client.ts:95-112`.
- **Dois "tipos" de usuário coexistentes no mesmo projeto Supabase:**
  - Candidatos — registro na tabela `public.candidatos` (FK para `auth.users`).
  - Usuários RH — registro na tabela `public.usuarios_rh` (com campo `role` incluindo `administrador`). Login separado em `/auth/login-rh`.
- **Detecção de tipo de usuário:** `src/services/userTypeDetectionService.ts` consulta ambas as tabelas após login.
- **Sessões temporárias vs. "lembrar-me":** lógica custom em `src/App.tsx:137-180` usando `sessionStorage` + `localStorage` com flags `auth-session-temporary`, `auth-was-temporary`, e equivalentes `admin-*`.
- **Timeout de inatividade (admin):** hook `useSessionTimeout` em `src/hooks/useSessionTimeout.ts` (30 minutos).
- **Auditoria:** tabela `public.logs_acesso` (migration `20250116_create_logs_acesso_table.sql`) registra `login_sucesso`, `login_falha`, `logout`, `password_reset_request/completed/failed`, `sessao_expirada`, `acesso_negado`. Serviço: `src/services/logAccessService.ts`. Metadados capturam IP, device type, browser, OS via `ua-parser-js`.

### Supabase Database

- **Schema principal:** `public` (`database.types.ts` tem tipagem gerada apenas para 4 tabelas públicas: `candidatos`, `vagas`, `candidaturas`, `usuarios_rh`).
- **Tabelas reais do sistema (conforme código e `docs/RLS_POLICIES.md:3`):** 34 tabelas com 103 policies RLS.
  - `candidatos`, `usuarios_rh` — usuários.
  - `vagas`, `candidaturas` — núcleo do processo seletivo.
  - `disponibilidade`, `autorizacoes` — dados complementares do cadastro.
  - `logs_acesso` — auditoria.
  - `avatars` (bucket storage, também consultado como `.from('avatars')` em `MeuPerfilCandidatoPage.tsx:207`).
  - Outras citadas em docs: `enderecos`, `dados_profissionais`, `historico_acoes`, `etapas`, testes psicométricos (Big Five, DISC, Raven), questionários de cultura.
- **Enums (`database.types.ts:430-449`):**
  - `status_vaga`: `rascunho | ativa | inativa | arquivada`.
  - `status_candidatura`: `aguardando_resposta | em_analise | aprovado_proxima | rejeitado | finalizado`.
  - `etapa_processo`: `triagem | bigfive | disc | entrevista_online | raven | cultura | entrevista_presencial | avaliacao_final | aprovado | rejeitado`.
- **Padrão de acesso:** todos os selects/inserts/updates via `supabase.from('<tabela>')` nos arquivos em `src/features/**/services/` e alguns componentes de página. Listagem abrangente em `candidaturasService.ts` (33 KB — responsável pela maior parte da lógica de processo seletivo).
- **RLS:** habilitado em todas as tabelas; políticas documentadas em `docs/RLS_POLICIES.md`. Quatro papéis: `anon`, candidato autenticado, `usuarios_rh`, admin.

### Supabase Storage

- **Buckets confirmados no código:**
  - `avatars` — upload de foto de perfil do candidato (`MeuPerfilCandidatoPage.tsx:206-225`), path `avatars/<candidatoId>-<timestamp>.<ext>`.
  - `curriculos-candidatos` — documentado em `docs/API_ENDPOINTS.md:407-432` para upload de currículo em PDF, path `<candidatoId>/curriculum.pdf`. URL pública é persistida em `candidaturas.curriculo_url` (ver `database.types.ts:247`).
- **Limites referenciados em docs:** uploads até 50 MB/min (`docs/API_ENDPOINTS.md:517`).

### Supabase Realtime

- **Documentado** em `docs/API_ENDPOINTS.md:436-478` (subscribes em `candidaturas` e `historico_acoes`). **Não localizei chamadas `.channel(...)` no código `src/` atual** — pode estar previsto mas não implementado (red flag: feature documentada sem código).

### Supabase Edge Functions

- **Não há diretório `supabase/functions/`** — apenas `supabase/migrations/` com 2 arquivos. Nenhuma Edge Function em uso.

---

### ViaCEP (API pública brasileira)

- **Serviço:** `src/features/cadastro/services/viaCepService.ts`.
- **URL base:** `https://viacep.com.br/ws/<cep>/json/`.
- **Uso:** autocomplete de endereço por CEP no step "Dados Pessoais" do formulário de cadastro.
- **Features:** validação de formato, timeout 5s via `AbortController`, cache em memória (`Map`), mapeamento de resposta para schema do formulário.
- **Auth:** nenhuma (API pública, sem key).

---

### n8n (Automação / Workflows)

- **Host:** `https://n8n.srv881294.hstgr.cloud/` (servidor Hostinger — URL hard-coded em `src/features/cadastro/services/n8nService.ts:122-168`, 9 workflows × 2 modos = 18 URLs fixas no código). **Red flag:** não usa a `VITE_N8N_WEBHOOK_URL` documentada em `.env.local.example:6` nem as `VITE_N8N_WEBHOOK_BASE_URL`/`VITE_N8N_WEBHOOK_TEST_BASE_URL` descritas em `docs/WEBHOOKS_N8N.md:25-31`.
- **Serviço:** `src/features/cadastro/services/n8nService.ts` (11 KB).
- **Modos:** `test` (URLs `/webhook-test/<uuid>`) e `production` (URLs `/webhook/<uuid>`), configurável via argumento.
- **Robustez:** retry de 3 tentativas, timeout 10s, retry apenas para 500/502/503/504, mapeamento de status para `N8NError` com códigos `NETWORK_ERROR | TIMEOUT_ERROR | HTTP_ERROR | VALIDATION_ERROR | WORKFLOW_NOT_FOUND | UNKNOWN_ERROR`.
- **Workflows configurados (`N8N_WORKFLOWS`):**
  1. `analise-formulario` (`54ea9375-...`) — dispara na criação de candidato; documentado em `docs/WEBHOOKS_N8N.md:41-100`. Aciona IA para análise de perfil, score de fit, email de boas-vindas, notificação ao RH.
  2. `analise-bigfive` (`f06cd652-...`) — score Big Five.
  3. `analise-disc` (`cb94ab77-...`) — score DISC.
  4. `analise-raven` (`c82466ce-...`) — inteligência Raven.
  5. `analise-fit-cultural` (`03438617-...`) — questionário de cultura.
  6. `analise-entrevistas` (`8eb085fb-...`) — avaliação de entrevistas.
  7. `emails-automaticos` (`cca72655-...`) — disparo de emails transacionais.
  8. `lembretes-cron` (`0ec6a910-...`) — disparos agendados de lembretes.
  9. `integracao-notion` (`a8008b0b-...`) — sincronização com Notion.
- **Chamadas encontradas no código:** apenas `notifyCandidatoCriado` em `cadastroService.ts` (wrapper que dispara `analise-formulario`). Os outros 8 workflows estão mapeados mas **não invocados no código atual** — red flag: integrações planejadas e parcialmente inertes.
- **Payload de exemplo (`N8NWebhookPayload` em `n8nService.ts:48-76`):**
  ```json
  {
    "event": "candidato.created",
    "timestamp": "2026-04-19T10:30:00.000Z",
    "data": {
      "candidato": { "id", "nome_completo", "email", "telefone", "cpf" },
      "vaga_id": "uuid-opcional",
      "metadata": { "created_at", "has_all_data": true }
    }
  }
  ```

### Documentação MCP para n8n

- **`MCP/n8n_instructions`** (12 KB) — instruções operacionais para uso de `n8n-MCP` (Model Context Protocol) por agentes de IA que editam workflows n8n. Não é código executado em runtime do app — é contexto para operadores/Claude.

---

## Email

- **Provedor primário:** Supabase Auth SMTP padrão (ou SMTP customizado — SendGrid/Mailgun/AWS SES sugeridos em `docs/email-templates/SETUP_GUIDE.md:84-108`).
- **Templates:** `docs/email-templates/`:
  - `candidato-recuperacao-senha.html` + `.txt`
  - `admin-recuperacao-senha.html` + `.txt`
  - `confirmacao-alteracao-senha.html` + `.txt`
- **Variáveis Supabase usadas:** `{{ .ConfirmationURL }}`.
- **Status:** templates criados e documentados, mas configuração no Supabase Dashboard é **manual e listada como pendente** (`README.md:80-83`). Red flag: duplicação de conteúdo HTML em múltiplos lugares sem automação.
- **Emails transacionais não-auth:** disparados via workflow n8n `emails-automaticos`.
- **Serviço local:** `src/services/passwordChangeConfirmationService.ts` (5.7 KB) — orquestra envio de confirmação pós-alteração de senha (provavelmente via Supabase ou n8n).

---

## Task Master AI (Ferramenta de desenvolvimento — não runtime)

- **Diretório:** `.taskmaster/` (config, tasks, reports, templates).
- **Propósito:** gestão de tarefas estruturadas por PRD durante desenvolvimento. Não é parte do app em produção.
- **Modelos configurados (`.taskmaster/config.json`):**
  - Main: Anthropic `claude-sonnet-4-20250514`.
  - Research: Perplexity `sonar-pro`.
  - Fallback: Gemini CLI `gemini-2.5-pro`.
- **`.env.example`** (raiz) lista chaves API de 11 provedores LLM — todas consumidas exclusivamente pelo Task Master, **nunca pelo app**.

---

## Armazenamento

- **Banco:** Postgres via Supabase (único).
- **Arquivos:** Supabase Storage (`avatars`, `curriculos-candidatos`).
- **Cache / filas:** nenhuma (sem Redis, sem SQS).
- **Client-side:** `localStorage` (Supabase sessions, "lembrar-me"), `sessionStorage` (flag de sessão temporária), Map in-memory (cache ViaCEP).

---

## Monitoramento e Observabilidade

- **Error tracking:** **nenhum** (sem Sentry, sem Datadog). Red flag.
- **Logs runtime:** `console.log/warn/error` apenas.
- **Auditoria de segurança:** tabela `logs_acesso` no Supabase (ver seção Auth).
- **ErrorBoundary:** `src/components/ErrorBoundary.tsx` e `src/features/cadastro/components/ErrorBoundary.tsx` — captura erros React e mostra fallback, sem reportar a serviço externo.

---

## CI/CD e Deploy

- **CI pipeline:** **nenhum** (`.github/workflows/`, `.gitlab-ci.yml` ausentes). Red flag.
- **Hosting:** não declarado em nenhum config (`vercel.json`, `netlify.toml`, `Dockerfile` ausentes).
- **Build manual:** `npm run build` → `build/`.

---

## Autenticação (Fluxos Resumidos)

**Candidato — Signup** (`src/features/cadastro/services/cadastroService.ts`):
1. `supabase.auth.signUp({ email, password })` (via `authService.ts`).
2. `supabaseAdmin.from('candidatos').insert(...)` — usa service role client.
3. Insert em `disponibilidade` e `autorizacoes` (mesmo client admin).
4. Rollback manual se qualquer passo falhar.
5. (Disparo assíncrono) `notifyCandidatoCriado` → n8n `analise-formulario`.

**Candidato — Login** (`LoginCandidatoPage.tsx`):
- `supabase.auth.signInWithPassword` → hidrata `authStore` (zustand).
- Grava flags "lembrar-me" em `localStorage`/`sessionStorage`.
- Loga evento `login_sucesso`/`login_falha` em `logs_acesso`.

**RH/Admin — Login** (`LoginRHPage.tsx`):
- Mesmo `signInWithPassword`, mas valida existência em `usuarios_rh` e papel (`usuario` vs `administrador`).
- Hidrata `adminAuthStore`; `ProtectedAdminRoute` filtra por papel (ex.: `/rh/configuracoes` requer `administrador`, `routes.tsx:314`).

**Recuperação de senha:**
- `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/redefinir-senha?tipo=rh?' })`.
- Email usa template `Reset Password` configurado no Supabase (pendente, ver seção Email).
- `RedefinirSenhaPage.tsx` chama `supabase.auth.updateUser({ password })` e dispara confirmação via `passwordChangeConfirmationService`.

---

## Variáveis de Ambiente — Consolidado

**Runtime do app (`src/*`):**
- `VITE_SUPABASE_URL` *(obrigatória)*
- `VITE_SUPABASE_ANON_KEY` *(obrigatória)*
- `VITE_SUPABASE_SERVICE_ROLE_KEY` *(usada — **red flag de segurança**)*

**Documentadas mas não consumidas pelo código atual:**
- `VITE_N8N_WEBHOOK_URL` — URLs n8n estão hard-coded.
- `VITE_N8N_WEBHOOK_BASE_URL` / `VITE_N8N_WEBHOOK_TEST_BASE_URL` — idem.
- `VITE_ENVIRONMENT` — não referenciada.
- `VITE_APP_URL` — mencionada em `SETUP_GUIDE.md:116` apenas.

**Testes (`playwright.config.ts` carrega `.env.test`):**
- `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USER_NAME`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Task Master (`.env`, não runtime):**
- `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `MISTRAL_API_KEY`, `XAI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `AZURE_OPENAI_API_KEY`, `OLLAMA_API_KEY`, `GITHUB_API_KEY`.

**Localização dos arquivos `.env`** *(conteúdo não inspecionado — apenas existência)*:
- `.env.example` (raiz) — chaves Task Master.
- `.env.local.example`, `.env.local` (raiz) — Supabase + n8n.
- `.env.test.example`, `.env.test` (raiz) — credenciais de teste E2E.

---

## Webhooks

**Outgoing (do app para fora):**
- 9 webhooks para n8n (ver seção n8n) — apenas `analise-formulario` é efetivamente chamado hoje.

**Incoming (de fora para o app):**
- Callbacks OAuth/Email do Supabase Auth: `/auth/redefinir-senha`, `/auth/callback` implícito via `detectSessionInUrl: true` (`client.ts:51`).
- Nenhum endpoint webhook próprio (não há backend).

---

## Red Flags de Integração

1. **Service role key do Supabase exposta no bundle** (`VITE_*` é inlined pelo Vite) — comprometer o frontend compromete todo o banco.
2. **URLs n8n hard-coded** (incluindo UUIDs) no `n8nService.ts`; rotacionar/mudar ambiente requer code change.
3. **8 de 9 workflows n8n não são disparados pelo código atual** — IA, emails, Notion, lembretes integração parcial/incompleta.
4. **Realtime documentado mas não implementado.**
5. **Configuração manual dos templates de email no Supabase Dashboard** sem automação/CLI; duplicação HTML.
6. **Sem error tracking externo** — erros em produção não são observados.
7. **Sem CI/CD** — integrações quebradas só aparecem manualmente.
8. **Projeto Supabase com ID exposto em docs públicos** (`isljnozzlvckrgjjbjwp`) — baixo risco, mas evitável.
9. **`@supabase/auth-helpers-react`** instalado (pacote para SSR/Next.js), sem uso — pode indicar cópia de boilerplate e/ou intenção de migração.
10. **Duas tabelas de usuário (`candidatos`/`usuarios_rh`)** compartilhando `auth.users` do Supabase — padrão comum, mas exige disciplina de RLS; `supabaseAdmin` é usado em vários lugares do cadastro, aumentando superfície de ataque.

---

*Auditoria de integrações gerada em 2026-04-19. Fontes: `src/lib/supabase/client.ts`, `src/features/cadastro/services/{n8nService,viaCepService,authService,cadastroService,duplicateCheckService}.ts`, `src/features/vagas/services/*`, `src/services/*`, `src/App.tsx`, `src/router/routes.tsx`, `database.types.ts`, `supabase/migrations/*.sql`, `docs/{WEBHOOKS_N8N,INTEGRATION_GUIDE,API_ENDPOINTS,RLS_POLICIES,TASKMASTER_SETUP}.md`, `docs/email-templates/*`, `MCP/n8n_instructions`.*
