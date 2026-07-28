# Arquitetura — Sistema de Recrutamento Beauty Smile

**Data de Análise:** 2026-04-19

## Visão Geral do Padrão

**Padrão Global:** SPA React (Vite) + BaaS Supabase (Postgres + Auth + Storage) + Automação N8N via webhooks.

**Características Principais:**
- Arquitetura **frontend-heavy**: toda a lógica de negócio vive no navegador, acessando diretamente o Supabase (sem backend proprio). RLS (Row Level Security) é o único guardião server-side.
- **Dois domínios de autenticação separados** (Candidato e RH/Admin) compartilhando o mesmo projeto Supabase Auth, distinguidos por tabelas de perfil diferentes (`candidatos` vs `usuarios_rh`) e dois stores Zustand independentes (`authStore` e `adminAuthStore`).
- **Organização híbrida**: coexistem dois padrões — código legado em `src/components/pages/*` (todas as páginas — 34 arquivos) e código novo em `src/features/<dominio>/*` (cadastro, vagas, auth).
- **Estado do servidor** via TanStack Query (queries + mutations com cache keys estruturadas em `vagasKeys`, `candidaturasKeys`). **Estado de autenticação** via Zustand com `persist` em `localStorage`.
- **Fluxos assíncronos longos** (análise de testes psicométricos, envio de e-mails, integração Notion) são delegados a **N8N** via webhooks (`n8nService.ts`, `candidaturasService.ts` → `fernandocosta.app.n8n.cloud/webhook/*`).
- Sistema inacabado e com bugs conhecidos: muitas páginas de teste psicométrico (Big Five, DISC, Raven) existem mas ainda não estão totalmente integradas com o restante do fluxo.

## Personas / Domínios de Usuário

### 1. Candidato (candidato)
- **Tabela de perfil:** `candidatos` (database.types.ts:12-116), ligada a `auth.users.id` via `user_id`.
- **Store:** `src/store/authStore.ts` (useAuthStore).
- **Login:** `src/components/pages/LoginCandidatoPage.tsx` → rota `/auth/login`.
- **Cadastro:** `src/components/pages/CadastroPage.tsx` → rota `/cadastro` (wrap do `CadastroMultiStepForm`).
- **Protetor de rota:** `src/components/ProtectedRoute.tsx` — redireciona para `/auth/login`.
- **Área privada:** `/candidato/*` (dashboard, perfil, candidatura, questionários, testes).

### 2. RH / Admin (usuarios_rh)
- **Tabela de perfil:** `usuarios_rh` (database.types.ts:366-422) com campo `role: 'recrutador' | 'administrador'`.
- **Store:** `src/store/adminAuthStore.ts` (useAdminAuthStore) com hierarquia de roles e mapa `DEFAULT_PERMISSIONS` por role (adminAuthStore.ts:136-177).
- **Login:** `src/components/pages/LoginRHPage.tsx` → rota `/auth/login-rh`.
- **Protetor de rota:** `src/components/ProtectedAdminRoute.tsx` — aceita props `requireRole` e `requirePermission` (ProtectedAdminRoute.tsx:83-162).
- **Área privada:** `/rh/*` (dashboard, candidatos, vagas, relatórios, configurações, suporte).

> **Observação:** Ambos os stores são inicializados no `RootLayout` (App.tsx:137-233), escutando os mesmos eventos de `supabase.auth.onAuthStateChange`. Um único usuário autenticado do Supabase pode ser candidato OU RH — a distinção vem da presença (ou não) de perfil correspondente em `candidatos` / `usuarios_rh`.

## Fronteira Frontend ↔ Backend

Não há backend Node/servidor HTTP próprio. A fronteira é:

```
Browser (React SPA)
   │
   ├──► Supabase JS SDK   ──► Postgres (RLS)
   │    (supabase client)
   │    src/lib/supabase/client.ts:42 (client anon)
   │    src/lib/supabase/client.ts:79 (client service-role — inseguro no browser!)
   │
   ├──► Supabase Auth     ──► auth.users
   │    (getSession, onAuthStateChange, signIn/signUp)
   │
   ├──► Supabase Storage  ──► buckets de avatares, currículos, gravações, imagens Raven
   │
   ├──► ViaCEP API        ──► features/cadastro/services/viaCepService.ts
   │
   └──► N8N Webhooks      ──► fernandocosta.app.n8n.cloud/webhook/*
        (features/cadastro/services/n8nService.ts,
         features/vagas/services/candidaturasService.ts:60)
```

**Cliente Supabase (dois clients — cliente anônimo + cliente service-role):**
- `supabase` (anon key) — operações normais respeitando RLS.
- `supabaseAdmin` (service role key) — **bypassa RLS**; usado para cadastro e operações admin. A service key está exposta no frontend via `VITE_SUPABASE_SERVICE_ROLE_KEY` (src/lib/supabase/client.ts:14), o que é um **risco de segurança crítico** (ver CONCERNS).

## Arquitetura de Autenticação

**Backbone:** Supabase Auth com flow type `pkce` (src/lib/supabase/client.ts:57), session persistida em `localStorage` sob duas chaves distintas:
- `sb-auth-token` (cliente principal)
- `sb-admin-auth-token` (cliente admin)

**Dois stores Zustand paralelos:**

| Store | Arquivo | localStorage key | Para |
|---|---|---|---|
| `useAuthStore` | src/store/authStore.ts | `auth-storage` | Candidato |
| `useAdminAuthStore` | src/store/adminAuthStore.ts | `admin-auth-storage` | RH/Admin |

**Inicialização (App.tsx:184-225):** no mount do `RootLayout`, ambos os stores são inicializados em paralelo (`Promise.all([initialize(), initializeAdmin()])`), e só depois um listener global de `onAuthStateChange` é registrado para evitar race conditions.

**Lógica de "Lembrar-me" (App.tsx:139-177):**
- Flag em `sessionStorage`: `auth-session-temporary` / `admin-auth-session-temporary` (sobrevive só à aba).
- Flag em `localStorage`: `auth-was-temporary` / `admin-auth-was-temporary` (detecta reabertura do navegador).
- Se a flag `was-temporary` está no localStorage mas `session-temporary` sumiu do sessionStorage, o app infere que o navegador foi fechado e força logout.

**Timeout de sessão RH:** `src/hooks/useSessionTimeout.ts` — monitora inatividade (30 min) apenas para admin.

**Recuperação de senha:** rotas `/auth/esqueci-senha` e `/auth/redefinir-senha`, templates de e-mail em `docs/email-templates/` (admin e candidato têm templates separados).

## Fluxo de Dados Principal

### Fluxo 1 — Cadastro do Candidato

```
/cadastro (CadastroPage)
   │
   ▼
CadastroMultiStepForm                      (4 steps via React Hook Form + Zod)
   ├─ Step 1: DadosPessoaisStep            (nome, CPF, email, celular, LinkedIn, Instagram)
   ├─ Step 2: EnderecoStep                 (useViaCEP hook → auto-preenche)
   ├─ Step 3: DisponibilidadeStep
   ├─ Step 3.5: DadosProfissionaisStep     (existe no steps/ mas não ativo no fluxo)
   └─ Step 4: AutorizacoesStep             (LGPD)
   │
   ▼
useDuplicateCheck ──► duplicateCheckService.ts (verifica CPF/email existente)
   │
   ▼
cadastroService.createCandidato()
   ├─ supabaseAdmin.auth.signUp()          (service role — cria auth.users)
   └─ supabaseAdmin.from('candidatos').insert()
   │
   ▼
n8nService.trigger('candidato.created')    (webhook async, fire-and-forget + retry 3x)
```

### Fluxo 2 — Candidatura a uma Vaga

```
/vagas (VagasPublicasPage)                 (pública)
   │
   ├─► /vagas/:id (VagaDetalhePage / VagaLPPage)
   │
   ▼
Candidato autenticado clica "Candidatar-se"
   │
   ▼
/candidato/candidatura/instrucoes          (InstrucoesFormularioPage)
   │
   ▼
/candidato/candidatura/formulario/:vagaId  (FormularioCandidaturaPage)
   │
   ▼
useCreateCandidatura (mutation)
   ├─ checkDuplicateApplication()
   ├─ supabase.from('candidaturas').insert({
   │     candidato_id, vaga_id,
   │     status: 'aguardando_resposta',
   │     etapa_atual: 'triagem',
   │     curriculo_url (Supabase Storage)
   │   })
   └─ POST N8N webhook nova-candidatura     (candidaturasService.ts:60)
   │
   ▼
Candidato avança por etapas do enum etapa_processo:
   triagem → bigfive → disc → entrevista_online → raven →
   cultura → entrevista_presencial → avaliacao_final → aprovado | rejeitado
```

### Fluxo 3 — Revisão pelo RH

```
/rh/dashboard (DashboardRHPage)
   │
   ├─► /rh/candidatos                       (lista geral de candidatos)
   ├─► /rh/candidatos/:id                   (PerfilCandidatoRHPage)
   ├─► /rh/vagas                            (CRUD de vagas)
   │   ├─ /rh/vagas/nova                    (CriarEditarVagaPage)
   │   └─ /rh/vagas/:id/editar              (CriarEditarVagaPage reuso)
   ├─► /rh/vagas/:id/candidatos             (VagaCandidatosRHPage — kanban por etapa)
   ├─► /rh/relatorios
   └─► /rh/configuracoes                    (requireRole="administrador")
   │
   ▼
updateCandidaturaStatus()
   ├─ UPDATE candidaturas SET status, etapa_atual, data_decisao_final
   └─ POST N8N webhook → dispara e-mail / avança no pipeline
```

### Fluxo 4 — Testes Psicométricos (inacabado)

Cada teste tem 3 páginas: instruções, aplicação, resultado armazenado em `candidaturas.analise_ia_*` (JSON).
- Big Five: `/testes/bigfive/instrucoes` → `/testes/bigfive` → `analise_ia_bigfive`
- DISC: `/testes/disc/instrucoes` → `/testes/disc` → `analise_ia_disc`
- Raven: `/testes/raven/instrucoes` → `/testes/raven` → `analise_ia_raven` (imagens de estímulo em `src/assets/images/raven/*.webp`)
- Conclusão: `/testes/conclusao`

As respostas são enviadas via N8N (`analise-bigfive`, `analise-disc`, `analise-raven`) e o resultado é armazenado nas colunas JSON de `candidaturas`.

## Gerenciamento de Estado

| Tipo de estado | Ferramenta | Onde |
|---|---|---|
| **Autenticação (client)** | Zustand + persist | `src/store/authStore.ts`, `src/store/adminAuthStore.ts` |
| **Server state / cache** | TanStack Query v5 | `src/features/vagas/hooks/useVagas.ts`, `useCandidaturas.ts` |
| **Forms** | React Hook Form + Zod | `src/features/cadastro/**`, pages de auth |
| **UI local** | useState/useReducer | em cada componente |
| **Vagas store** | Zustand | `src/features/vagas/store/vagasStore.ts` (filtros de UI) |

**Configuração do QueryClient** (App.tsx:24-33):
- `staleTime: 5 min`, `gcTime: 10 min`, `retry: 2`, `refetchOnWindowFocus: false`.

**Query keys hierárquicas:** `['vagas'] → ['vagas', 'list'] → ['vagas', 'list', {filters, orderBy, pagination}]` (useVagas.ts:36-49). Mesmo padrão para candidaturas.

## Modelo de Roteamento

**Biblioteca:** `react-router-dom` v6 com `createBrowserRouter` + flag `v7_startTransition`.

**Arquitetura:** todas as rotas definidas em **um único array** exportado em `src/router/routes.tsx`, envolvidas por um `RootLayout` único (App.tsx:247-262).

**Grupos de rotas (routes.tsx:71-335):**

| Prefixo | Proteção | Páginas |
|---|---|---|
| `/` | Pública | LandingPage, VagasPublicasPage, VagaDetalhePage, ManifestoPage, GlassShowcase |
| `/auth/*` | Pública | InscricaoPage, LoginCandidatoPage, LoginRHPage, EsqueciSenhaPage, RedefinirSenhaPage |
| `/cadastro` | Pública | CadastroPage (multi-step) |
| `/candidato/*` | `ProtectedRoute` | Dashboard, Perfil, Candidatura, Questionários |
| `/testes/*` | `ProtectedRoute` | Big Five, DISC, Raven (instruções + teste), Conclusão |
| `/rh/*` | `ProtectedAdminRoute` | Dashboard RH, Candidatos, Vagas, Relatórios, Suporte, Configurações (+`requireRole="administrador"`) |

**Menu de desenvolvimento (App.tsx:41-123):** um `DevNavigationMenu` flutuante (botão no canto inferior direito) lista todas as páginas categorizadas em `devNavigationPages` (routes.tsx:343-377) — **deve ser removido em produção**.

## Organização por Features

Coexistência de **dois padrões organizacionais**:

### Padrão A — Legado (por tipo): `src/components/pages/*`
Todas as 34 páginas da aplicação estão nesta pasta, misturando públicas, auth, candidato, RH e testes. Elas **importam serviços/hooks** de `src/features/*` e estado dos stores.

### Padrão B — Moderno (por domínio): `src/features/*`
Introduzido em PRDs mais recentes. Cada feature encapsula: `components/`, `hooks/`, `services/`, `types/`, `schemas/`, `utils/`.

- **`src/features/auth/`** — apenas esqueleto: `hooks/index.ts`, `services/index.ts`, `types/index.ts` (ainda não povoado).
- **`src/features/cadastro/`** — o mais maduro: fluxo multi-step completo com testes.
- **`src/features/vagas/`** — hooks TanStack Query para vagas e candidaturas (adicionados no commit `86ee934`).

As **páginas em `components/pages/` chamam os serviços de `features/`** — ou seja, features funcionam como camada de lógica/dados e as páginas em `components/pages/` como camada de apresentação/composição.

## Arquitetura do Formulário Multi-Step (Cadastro)

Arquivo principal: `src/features/cadastro/components/CadastroMultiStepForm.tsx`.

**Conceitos:**
- Um único `useForm` com schema Zod agregado (`candidatoFormSchema`).
- Cada step tem seu próprio **sub-schema** (`dadosPessoaisSchema`, `enderecoSchema`, `disponibilidadeSchema`, `autorizacoesSchema`) para validação incremental no botão "Próximo" (CadastroMultiStepForm.tsx:63-80).
- Array `FORM_STEPS: StepConfig[]` mapeia id → {title, description, schema, component}.
- `FormProvider` compartilha estado entre steps; cada step lê via `useFormContext`.
- `LoadingProgress` (cadastro/components/LoadingProgress.tsx) mostra progresso por `stage` durante submissão.
- Erros capturados por `ErrorBoundary` próprio da feature (cadastro/components/ErrorBoundary.tsx).
- Toasts via hook dedicado `useFormToast` (cadastro/hooks/useFormToast.ts).

**Validações especiais:**
- `useViaCEP` preenche endereço automaticamente (cadastro/hooks/useViaCEP.ts).
- `useDuplicateCheck` valida CPF/email em tempo real contra a tabela `candidatos` antes de submeter (cadastro/hooks/useDuplicateCheck.ts, cadastro/services/duplicateCheckService.ts).
- `cpfValidator.ts` em `utils/` (com testes em `__tests__/cpfValidator.test.ts`).

## Shell da Área RH

**Composição:**
- `src/components/RHLayout.tsx` (RHLayout.tsx:17-51) — wrapper com `BackgroundImage` + `RHSidebar` + `RHTopBar` + `<main>` para conteúdo.
- `src/components/RHSidebar.tsx` — navegação lateral, colapsável, responsiva (mobile drawer). Detecta página ativa pelo prefixo da rota (RHSidebar.tsx:47-55). Usa `useAuthStore` (bug: deveria usar `useAdminAuthStore`).
- `src/components/RHTopBar.tsx` — topo com busca, notificações, avatar.

Cada página RH chama `<RHLayout>` internamente (padrão composicional, não route-level).

## Webhooks e Automação Externa (N8N)

**Serviço:** `src/features/cadastro/services/n8nService.ts` — wrapper centralizado com retry (3x) e timeout (10s).

**9 workflows configurados** (n8nService.ts:21-30):
```ts
type N8NWorkflow =
  | 'analise-formulario'
  | 'analise-bigfive'
  | 'analise-disc'
  | 'analise-raven'
  | 'analise-fit-cultural'
  | 'analise-entrevistas'
  | 'emails-automaticos'
  | 'lembretes-cron'
  | 'integracao-notion'
```

**Dois modos:** `test` e `production` — cada workflow tem duas URLs configuradas, selecionadas por `N8NMode`.

**Webhook dedicado de candidaturas:** `candidaturasService.ts:60` aponta para `https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura`, executado após insert bem-sucedido.

**Documentação:** `docs/WEBHOOKS_N8N.md`, `docs/technical/BACKEND_API_WEBHOOKS.md`.

## Tratamento de Erros

**Estratégia:** Error Boundaries + toasts + Custom Error Classes.

**Padrões:**
- `src/components/ErrorBoundary.tsx` — boundary raiz para rotas de auth críticas (esqueci/redefinir senha) — routes.tsx:117-128.
- `src/features/cadastro/components/ErrorBoundary.tsx` — boundary específico da feature.
- **Custom errors** nos services: `CandidaturasServiceError` (candidaturasService.ts:39-55) com códigos tipados (`INVALID_INPUT | DUPLICATE_APPLICATION | NETWORK_ERROR | DATABASE_ERROR | WEBHOOK_ERROR | NOT_FOUND | UNAUTHORIZED`). Mesmo padrão em `duplicateCheckService`, `cadastroService`.
- **Notificações:** `sonner` (Toaster em App.tsx:239) com `toast.error()` em rotas protegidas e mutações.
- **Retry automático:** TanStack Query (retry: 2) + n8nService (retry: 3).

## Preocupações Transversais (Cross-Cutting)

| Preocupação | Abordagem |
|---|---|
| **Logging** | `console.log/error` + tabela `logs_acesso` no DB (migration `20250116_create_logs_acesso_table.sql`) |
| **Validação** | Zod + React Hook Form; CPF validator customizado (cpfValidator.ts) |
| **Auth/Authz** | Supabase Auth + RLS + role checks no Zustand (`hasRole`, `hasPermission`) |
| **Persistência** | `persist` middleware do Zustand em `localStorage` |
| **Sessão** | `useSessionTimeout` hook (30 min para admin) |
| **Images** | TipTap para rich text, assets estáticos em `src/assets/images/raven/*.webp` |
| **Design tokens** | Tailwind + paleta azul Beauty Smile (`#00109E`), glass UI custom em `ui/glass.tsx` |

## Pontos de Entrada

| Entrada | Local | Dispara |
|---|---|---|
| Vite entrypoint | `src/main.tsx` | Mount do `App` no DOM |
| Root component | `src/App.tsx` | QueryClientProvider + RouterProvider + RootLayout |
| Router | `src/router/routes.tsx` | Array de 34 rotas |
| Dev menu | `App.tsx:41` (`DevNavigationMenu`) | Navegação provisória |

## Enums do Domínio (database.types.ts:430-449)

- `status_vaga`: `rascunho | ativa | inativa | arquivada`
- `status_candidatura`: `aguardando_resposta | em_analise | aprovado_proxima | rejeitado | finalizado`
- `etapa_processo`: `triagem | bigfive | disc | entrevista_online | raven | cultura | entrevista_presencial | avaliacao_final | aprovado | rejeitado`

O enum `etapa_processo` **é o pipeline oficial** de recrutamento do sistema — qualquer PRD futuro deve respeitar essas 10 etapas.

---

*Análise de arquitetura: 2026-04-19*
