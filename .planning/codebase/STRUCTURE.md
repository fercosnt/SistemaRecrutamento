# Estrutura do Codebase — Sistema de Recrutamento Beauty Smile

**Data de Análise:** 2026-04-19

## Árvore de Diretórios (Top-Level)

```
DB Sistema de recrutamento/
├── src/                          # Todo o código-fonte React
├── public/                       # (não presente — Vite usa src/assets)
├── build/                        # Build de produção (gerado)
├── e2e/                          # Testes Playwright E2E
├── supabase/                     # Migrations SQL do Supabase CLI
├── docs/                         # ~50 documentos: PRDs, SQL, technical, testing
├── .taskmaster/                  # Estado do Task Master AI (gestão de tarefas)
├── .planning/                    # Documentos de planejamento GSD
├── .cursor/                      # Configuração Cursor/Cursor rules
├── .claude/                      # Configuração Claude Code
├── node_modules/                 # Dependências
├── test-results/                 # Saída dos testes
├── playwright-report/            # HTML reports do Playwright
├── package.json                  # Manifesto de dependências
├── package-lock.json             # Lockfile
├── vite.config.ts                # Config Vite
├── tsconfig.json                 # Config TypeScript
├── tsconfig.node.json            # TS para Node/Vite
├── tailwind.config.js            # Config Tailwind
├── postcss.config.js             # PostCSS
├── playwright.config.ts          # Config Playwright
├── database.types.ts             # Tipos gerados do schema Supabase (535 linhas)
├── index.html                    # HTML entrypoint
├── .env.example / .env.local / .env.test  # Variáveis de ambiente (Vite)
├── .cursorrules                  # Regras para Cursor AI
├── README.md
├── PROGRESS_SUMMARY.md
├── SESSION_PROGRESS.md           # 71 KB — histórico de sessões de desenvolvimento
└── MCP/                          # Configuração de MCP servers
```

## Propósito dos Diretórios-Raiz

**`src/`** — Código-fonte React. Único lugar onde código de produção vive.

**`build/`** — Gerado por `vite build`. Não commitar conteúdo novo.

**`e2e/`** — Testes Playwright (ver seção dedicada).

**`supabase/`** — Apenas `migrations/*.sql`. Os SQLs mais recentes e numerados vivem em `docs/sql/sql/*`.

**`docs/`** — **Volumosa documentação em português**: PRDs, relatórios de correção, checklists de teste, templates de e-mail, SQL de referência.

**`.taskmaster/`** — Estado de gestão de tarefas via Task Master AI (state.json, tasks.json).

**`.planning/`** — Documentos GSD (este diretório). Estrutura: `.planning/codebase/`.

## Estrutura de `src/`

```
src/
├── main.tsx                      # Entrypoint Vite → monta <App />
├── App.tsx                       # Root: QueryClient + Router + RootLayout + DevNavigationMenu
├── Attributions.md               # Créditos de assets
├── copiar-imagens-raven.sh       # Script shell auxiliar
│
├── assets/
│   ├── images/
│   │   ├── raven/                # 60+ imagens .webp para teste Raven (A1..E12)
│   │   └── backgrounds.ts        # Mapa de backgrounds nomeados
│   └── (outros assets removidos no git status)
│
├── components/                   # Componentes compartilhados + páginas legadas
│   ├── pages/                    # TODAS as 34 páginas (rotas)
│   ├── ui/                       # Primitivos shadcn/ui (~48 arquivos)
│   ├── examples/                 # CardExamples, LayoutExamples (docs visuais)
│   ├── figma/                    # ImageWithFallback (helper de imports do Figma)
│   ├── BeautySmileLogo.tsx       # Logo SVG
│   ├── BackgroundImage.tsx       # Background com variantes (azul, escuro, etc.)
│   ├── RHLayout.tsx              # Shell da área RH (Sidebar + TopBar + main)
│   ├── RHSidebar.tsx             # Navegação lateral RH (colapsável)
│   ├── RHTopBar.tsx              # Topo com busca, notificações, avatar RH
│   ├── MetricCard.tsx            # Card de métrica (dashboards)
│   ├── ScoreCard.tsx             # Card de score (perfil candidato)
│   ├── KanbanBoard.tsx           # Kanban por etapa_processo
│   ├── ProtectedRoute.tsx        # HOC de rota (candidato)
│   ├── ProtectedAdminRoute.tsx   # HOC de rota (RH/admin) com requireRole/requirePermission
│   ├── ErrorBoundary.tsx         # Boundary genérico
│   ├── RichTextEditor.tsx        # Editor TipTap (usado em descrição de vagas)
│   └── GlassShowcase.tsx         # Página /showcase (design system)
│
├── features/                     # Padrão moderno: organização por domínio
│   ├── auth/                     # (esqueleto, ainda não povoado)
│   ├── cadastro/                 # Feature mais madura (multi-step)
│   └── vagas/                    # TanStack Query hooks de vagas/candidaturas
│
├── router/
│   └── routes.tsx                # Array único de rotas + devNavigationPages (377 linhas)
│
├── store/                        # Zustand stores globais
│   ├── authStore.ts              # Candidato (useAuthStore) — persist: 'auth-storage'
│   └── adminAuthStore.ts         # RH/Admin (useAdminAuthStore) — persist: 'admin-auth-storage'
│
├── lib/
│   ├── supabase/
│   │   └── client.ts             # supabase (anon) + supabaseAdmin (service role)
│   └── utils.ts                  # helpers genéricos (cn, etc.)
│
├── hooks/
│   └── useSessionTimeout.ts      # Timeout de 30 min para sessão admin
│
└── guidelines/                   # Documentação interna de design/código
    ├── DesignPatterns.md
    ├── Guidelines.md
    └── CodeSnippets.md
```

> **Diretórios esperados mas ausentes:** não existem `src/contexts/`, `src/services/`, `src/types/`, `src/utils/` no root do `src/`. Esses papéis estão distribuídos dentro de cada `features/<domain>/`.

## `src/components/pages/` — Todas as Páginas (34 arquivos)

### Páginas Públicas

| Arquivo | Rota | Descrição |
|---|---|---|
| `LandingPage.tsx` | `/` | Homepage da Beauty Smile |
| `VagasPublicasPage.tsx` | `/vagas` | Lista pública de vagas com filtros |
| `VagaDetalhePage.tsx` | `/vagas/:id` | Detalhe de uma vaga (variante principal) |
| `VagaLPPage.tsx` | — | Landing page alternativa de divulgação de vaga (não no router) |
| `VagasPage.tsx` | — | Página legada de vagas (não no router) |
| `ManifestoPage.tsx` | `/manifesto` | Manifesto/cultura da empresa |

### Páginas de Autenticação

| Arquivo | Rota | Descrição |
|---|---|---|
| `LoginCandidatoPage.tsx` | `/auth/login` | Login candidato (email + senha + lembrar-me) |
| `LoginRHPage.tsx` | `/auth/login-rh` | Login RH/Admin separado |
| `EsqueciSenhaPage.tsx` | `/auth/esqueci-senha` | Envia email de reset (candidato ou RH conforme detecção) |
| `RedefinirSenhaPage.tsx` | `/auth/redefinir-senha` | Define nova senha (deeplink do email) |
| `InscricaoPage.tsx` | `/auth/inscricao` | Inscrição rápida (versão legada/alternativa) |
| `CadastroPage.tsx` | `/cadastro` | Wrap do `CadastroMultiStepForm` (PRD-1) |

### Páginas do Candidato (área logada `/candidato/*`)

| Arquivo | Rota | Descrição |
|---|---|---|
| `DashboardCandidatoPage.tsx` | `/candidato/dashboard` | Overview do candidato: candidaturas, progresso, testes pendentes |
| `MeuPerfilCandidatoPage.tsx` | `/candidato/perfil` | Edição de perfil pessoal do candidato |
| `MeuPerfilPage.tsx` | — (reusado em `/rh/perfil`) | Perfil genérico, atualmente montado pelo RH |
| `InstrucoesFormularioPage.tsx` | `/candidato/candidatura/instrucoes` | Instruções antes do formulário de candidatura |
| `FormularioCandidaturaPage.tsx` | `/candidato/candidatura/formulario/:vagaId` | Upload de currículo + perguntas da vaga |
| `QuestionarioPage.tsx` | `/candidato/questionario` | Questionário genérico |
| `QuestionarioCulturaPage.tsx` | `/candidato/questionario-cultura` | Fit cultural |

### Páginas de Testes Psicométricos

| Arquivo | Rota | Descrição |
|---|---|---|
| `InstrucoesBigFivePage.tsx` | `/testes/bigfive/instrucoes` | Instruções Big Five |
| `TesteBigFivePage.tsx` | `/testes/bigfive` | Aplicação Big Five |
| `InstrucoesDISCPage.tsx` | `/testes/disc/instrucoes` | Instruções DISC |
| `TesteDISCPage.tsx` | `/testes/disc` | Aplicação DISC |
| `InstrucoesRavenPage.tsx` | `/testes/raven/instrucoes` | Instruções Raven |
| `TesteRavenPage.tsx` | `/testes/raven` | Aplicação Raven (usa imagens em `src/assets/images/raven/`) |
| `ConclusaoTestesPage.tsx` | `/testes/conclusao` | Tela de encerramento dos testes |

### Páginas RH/Admin (área logada `/rh/*`)

| Arquivo | Rota | Descrição |
|---|---|---|
| `DashboardRHPage.tsx` | `/rh/dashboard` | Dashboard com métricas gerais (cards, charts) |
| `CandidatosRHPage.tsx` | `/rh/candidatos` | Lista e busca geral de candidatos |
| `PerfilCandidatoRHPage.tsx` | `/rh/candidatos/:id` | Perfil detalhado do candidato para avaliação RH |
| `VagasRHPage.tsx` | `/rh/vagas` | CRUD de vagas (lista) |
| `CriarEditarVagaPage.tsx` | `/rh/vagas/nova`, `/rh/vagas/:id/editar` | Criação e edição de vaga (página única reusada) |
| `VagaCandidatosRHPage.tsx` | `/rh/vagas/:id/candidatos` | Candidatos de uma vaga (Kanban por `etapa_processo`) |
| `ConfiguracoesPage.tsx` | `/rh/configuracoes` | Configurações do sistema (`requireRole="administrador"`) |
| `SuporteRHPage.tsx` | `/rh/suporte` | Suporte técnico / canais de ajuda |
| `RelatoriosRHPage.tsx` | `/rh/relatorios` | Relatórios e analytics |

## `src/features/` — Organização por Domínio

### `features/auth/` (esqueleto)

```
features/auth/
├── README.md
├── hooks/index.ts                # vazio (barrel)
├── services/index.ts             # vazio (barrel)
└── types/index.ts                # vazio (barrel)
```

Ainda não implementada. Lógica de auth atualmente vive nos stores Zustand e em `features/cadastro/services/authService.ts`.

### `features/cadastro/` — Feature Mais Madura

```
features/cadastro/
├── README.md
├── components/
│   ├── CadastroMultiStepForm.tsx       # Orquestrador dos 4 steps
│   ├── LoadingProgress.tsx             # Barra de progresso durante submit
│   ├── ErrorBoundary.tsx               # Boundary específico da feature
│   ├── index.ts                        # Barrel export
│   ├── __tests__/
│   │   └── LoadingProgress.test.tsx
│   └── steps/
│       ├── DadosPessoaisStep.tsx       # Step 1: nome, CPF, email, celular, LinkedIn, Instagram
│       ├── EnderecoStep.tsx            # Step 2: CEP + auto-fill via ViaCEP
│       ├── DisponibilidadeStep.tsx     # Step 3: disponibilidade
│       ├── DadosProfissionaisStep.tsx  # (existe mas não ativo no fluxo atual)
│       ├── AutorizacoesStep.tsx        # Step 4: LGPD / consentimentos
│       └── index.ts
├── hooks/
│   ├── useDuplicateCheck.ts            # Verifica CPF/email existente
│   ├── useFormToast.ts                 # Helpers de toast para o form
│   ├── useViaCEP.ts                    # Busca endereço por CEP
│   └── index.ts
├── services/
│   ├── authService.ts                  # Login/signup do candidato
│   ├── cadastroService.ts              # Cria candidato (supabaseAdmin)
│   ├── duplicateCheckService.ts        # Query direta de duplicatas
│   ├── n8nService.ts                   # Wrapper dos 9 workflows N8N
│   ├── viaCepService.ts                # Chamada externa ViaCEP
│   ├── index.ts
│   └── __tests__/
│       ├── authService.test.ts
│       ├── cadastroService.test.ts
│       ├── duplicateCheckService.test.ts
│       └── n8nService.test.ts
├── schemas/
│   ├── candidatoSchema.ts              # Schemas Zod agregado + sub-schemas por step
│   └── index.ts
├── types/
│   ├── formTypes.ts                    # Tipos do form
│   └── index.ts
└── utils/
    ├── cpfValidator.ts                 # Validação de CPF
    ├── __tests__/cpfValidator.test.ts
    └── index.ts
```

### `features/vagas/` — Estado do Servidor (TanStack Query)

```
features/vagas/
├── services/
│   ├── vagasService.ts                 # CRUD de vagas
│   └── candidaturasService.ts          # Candidaturas + N8N webhook nova-candidatura
├── hooks/
│   ├── useVagas.ts                     # useQuery wrappers (listVagas, getVagaById, ...)
│   ├── useCandidaturas.ts              # useQuery + useMutation (createCandidatura, updateStatus)
│   └── index.ts
├── store/
│   └── vagasStore.ts                   # Zustand para filtros de UI de vagas
└── types/
    └── vagasTypes.ts                   # Tipos (Vaga, Candidatura, Filters, OrderBy, etc.)
```

## `src/components/ui/` — Primitivos shadcn/ui

48 arquivos wrappando Radix Primitives com estilo Tailwind. Padrão shadcn/ui canônico:

```
accordion.tsx       alert.tsx           alert-dialog.tsx    aspect-ratio.tsx
avatar.tsx          badge.tsx           breadcrumb.tsx      button.tsx
calendar.tsx        card.tsx            carousel.tsx        chart.tsx
checkbox.tsx        collapsible.tsx     command.tsx         context-menu.tsx
dialog.tsx          drawer.tsx          dropdown-menu.tsx   form.tsx
glass.tsx           hover-card.tsx      input.tsx           input-otp.tsx
label.tsx           menubar.tsx         navigation-menu.tsx pagination.tsx
popover.tsx         progress.tsx        radio-group.tsx     resizable.tsx
scroll-area.tsx     select.tsx          separator.tsx       sheet.tsx
sidebar.tsx         skeleton.tsx        slider.tsx          sonner.tsx
switch.tsx          table.tsx           tabs.tsx            textarea.tsx
toggle.tsx          toggle-group.tsx    tooltip.tsx
use-mobile.ts       utils.ts
```

**Customizações proprietárias:**
- `glass.tsx` — componente de glassmorphism do design system Beauty Smile.
- `sonner.tsx` — wrapper do toaster.
- `use-mobile.ts` + `utils.ts` — helpers (`cn` via clsx + tailwind-merge).

## `supabase/`

```
supabase/
└── migrations/
    ├── 20250116_create_logs_acesso_table.sql
    └── 20250123_add_avaliacao_final_etapa.sql
```

> **Observação importante:** o Supabase CLI tem apenas 2 migrations, mas **o schema real foi construído via SQLs numerados em `docs/sql/sql/*`** (ver seção docs abaixo). Isso explica por que `database.types.ts` menciona tabelas (`logs_acesso`, `preferencias`, `sessoes`, `webhooks`, `templates_email`, etc.) que **não estão expostas** em `database.types.ts` atual — só aparecem 4 tabelas públicas: `candidatos`, `vagas`, `candidaturas`, `usuarios_rh`.

## `e2e/` — Testes Playwright

```
e2e/
├── README.md                           # Documenta cada spec (testes por categoria)
├── cadastro-flow.spec.ts               # PRD-DB-001 — Cadastro multi-step
├── login-flow.spec.ts                  # PRD-DEV-002 — 20 testes (funcional, sessão, segurança, UX)
├── password-recovery-flow.spec.ts      # Fluxo esqueci/redefinir senha
└── job-application-flow.spec.ts        # Candidatura em vaga (PRD-DEV-005)
```

Config: `playwright.config.ts` no root. Saída em `test-results/` e `playwright-report/`.

## `docs/` — Documentação Massiva

Aproximadamente **50 arquivos**, todos em português. Organizados por função:

### Raiz de `docs/` — Relatórios de sessão, correções, inventários

```
docs/
├── INVENTARIO-SISTEMA-RECRUTAMENTO.md           # Inventário-mestre (ler primeiro!)
├── DOCUMENTACAO-TECNICA-BEAUTY-SMILE-V2.md      # Documentação técnica consolidada V2
├── CHECKPOINT-BEAUTY-SMILE-V3.0.md              # Snapshot V3
├── API_ENDPOINTS.md
├── BACKEND_COMPLETION_SUMMARY.md
├── RLS_POLICIES.md
├── MUDANCAS-BANCO-DADOS.md
├── WEBHOOKS_N8N.md
├── INTEGRATION_GUIDE.md
├── RESPONSIVE_DESIGN.md
├── SECURITY_LOGGING_IMPLEMENTATION.md
├── SETUP_LOGS_ACESSO_TABLE.md
├── DATABASE_TYPES_GENERATION_COMPLETE.md
├── FIX_DATABASE_TYPES_GENERATION.md
├── VAGA_LOCALIZACAO_FIX_COMPLETE.md
├── FIX_CANDIDATE_PROFILE_DATABASE_INTEGRATION.md
├── FIX_CANDIDATURAS_400_ERROR.md
├── FEATURE_AUTO_AVANCAR_ETAPA.md
├── CORRECAO_AUTO_REFRESH_STATUS.md
├── CORRECAO_ETAPAS_REORDENACAO.md
├── CORRECOES_AREA_RH.md
├── CORRECOES_VAGAS_RH_URGENTE.md
├── CORRECOES_VAGAS_RH_ROUND2.md
├── RESTAURACAO_CANDIDATOS_RH_PAGE.md
├── SESSAO_CORRECOES_ROUND3_SUMMARY.md .. ROUND5_COMPLETION_FINAL.md
├── FASE_4_COMPLETION_SUMMARY.md
├── PRD-4_COMPLETED.md
├── TASK_5_COMPLETED.md .. TASK_10_COMPLETED.md
├── E2E_TEST_REFINEMENT_ROUND1..3.md
├── TASKMASTER_SETUP.md
├── Test DISC 2a06049b8baf8010baecd426b60bfa0a.md
├── As 5 Grandes Traços e 10 Aspectos 2a06049b8baf80ad8a86d79a33419631.md
├── create-prd.md
└── generate-tasks.md
```

### `docs/prds/` — Product Requirements Documents (27 PRDs)

```
docs/prds/
├── 0001-prd-sistema-cadastro-candidatos.md              # Auth/Cadastro candidato
├── 0002-prd-sistema-login-candidatos.md
├── 0003-prd-sistema-login-rh-admin.md
├── 0004-prd-sistema-recuperacao-senha.md
├── 0005-prd-fluxo-aplicacao-vagas.md                    # Candidatura em vagas
├── 0006-prd-dashboard-candidato.md
├── 0007-prd-teste-big-five.md
├── 0008-prd-teste-disc.md
├── 0009-prd-teste-raven.md
├── 0010-prd-visualizacao-resultados-testes.md
├── 0011-prd-integracao-n8n-analise-testes.md
├── 0012-prd-dashboard-rh-admin.md
├── 0013-prd-gestao-candidatos.md
├── 0014-prd-aprovacao-rejeicao-candidatos.md
├── 0015-prd-sistema-comunicacao-candidatos.md
├── 0016-prd-crud-vagas.md
├── 0017-prd-gestao-candidaturas-vaga.md
├── 0018-prd-pipeline-recrutamento.md                    # Etapas do processo
├── 0019-prd-edicao-perfil-candidato.md
├── 0020-prd-configuracoes-sistema.md
├── 0021-prd-gestao-documentos-rh.md
├── prd-db-001-autenticacao-usuarios.md                  # PRDs "DB" = schema/backend
├── prd-db-002-vagas-candidaturas.md
├── prd-db-003-testes-psicometricos.md
├── prd-db-004-entrevistas-avaliacoes.md
├── prd-db-005-configuracoes-sistema.md
├── prd-frontend-meu-perfil.md
└── tasks/                                               # Tasks geradas a partir dos PRDs
    ├── tasks-prd-db-001..005-*.md
    ├── tasklist-meu-perfil-implementation.md
    ├── tasks-completar-backend-100-porcento.md
    ├── TEST_REPORT_CONSOLIDATED.md
    ├── test-report-prd-db-001.md
    ├── performance-advisors-consolidated-report.md
    └── security-advisors-consolidated-report.md
```

### `docs/sql/` — Scripts SQL (o schema real)

```
docs/sql/
├── seed-vagas-teste.sql
└── sql/                                    # 40+ scripts numerados, aplicados manualmente
    ├── 01-setup-inicial.sql
    ├── 02-tabela-candidatos.sql
    ├── 03-tabela-usuarios-rh.sql
    ├── 04-tabela-preferencias.sql
    ├── 05-tabela-vagas-assoc.sql
    ├── 06-tabela-sessoes.sql
    ├── 07-tabela-logs.sql
    ├── 08-storage-avatars.sql
    ├── 09-views.sql
    ├── 10-auth-config.sql
    ├── 11-enums-vagas-candidaturas.sql
    ├── 12-criar-tabela-vagas.sql
    ├── 13-tabela-candidaturas.sql
    ├── 14-tabelas-perguntas-respostas-formulario.sql
    ├── 15-tabelas-perguntas-respostas-cultura.sql
    ├── 16-functions-vagas-candidaturas.sql
    ├── 17-rls-vagas-candidaturas.sql
    ├── 18-storage-curriculos.sql
    ├── 19-enums-{configuracoes,testes-psicometricos}.sql
    ├── 20-{tabela-configuracoes-empresa, tabelas-bigfive}.sql
    ├── 21-{tabela-templates-email, tabelas-disc}.sql
    ├── 22-{tabelas-raven, tabelas-webhooks}.sql
    ├── 23-{functions-calculo-scores, tabelas-biblioteca-perguntas}.sql
    ├── 24-{tabela-logs-auditoria, triggers-testes-psicometricos}.sql
    ├── 25-{functions-configuracoes, rls-testes-psicometricos}.sql
    ├── 26-{storage-raven-imagens, triggers-configuracoes}.sql
    ├── 27-{enums-entrevistas-avaliacoes, popular-questoes-exemplo, views-configuracoes}.sql
    ├── 28-{rls-configuracoes, tabela-entrevistas-online}.sql
    └── 29-tabela-entrevistas-presenciais.sql
```

### `docs/technical/` — Documentação técnica profunda

```
docs/technical/
├── BACKEND_API_WEBHOOKS.md
├── FRONTEND_BACKEND_HANDOFF.md
├── FRONTEND_INTEGRATION_GUIDE.md
├── IMPLEMENTATION_NOTES.md
├── IMPLEMENTATION_SUMMARY.md
├── SECURITY_DECISIONS.md
├── STORAGE_GRAVACOES_USAGE_GUIDE.md
├── STORAGE_RAVEN_USAGE_GUIDE.md
├── performance-optimizations.md
└── security-advisors-consolidated.md
```

### `docs/testing/` — Planos e relatórios de teste

```
docs/testing/
├── PRD-1-QUICK-TEST-GUIDE.md
├── PRD-1-STATUS-SUMMARY.md
├── PRD-1-VERIFICATION-CHECKLIST.md
├── PRD-2-LOGIN-TEST-CHECKLIST.md
├── PLANO_TESTES_STATUS_UPDATE.md
├── TEST_REPORT_TASK_13.md
├── CORRECOES_IMPLEMENTACAO_STATUS_UPDATE.md
├── CORRECOES_NAVEGACAO.md
└── CORRECOES_TELEFONE_CELULAR.md
```

### `docs/validations/` — Relatórios de validação

```
docs/validations/
├── TESTING_CHECKLIST.md
├── TEST_REPORT_CONSOLIDATED.md
├── VALIDACAO-PRD-DB-004-REPORT.md
├── VALIDACAO_BANCO_DADOS.md
├── VALIDACAO_BANCO_DADOS_PRD002.md
├── VALIDATION_REPORT_PRD-DB-003.md
├── VERIFICACAO_PRD_DB_005.md
├── test-report-prd-db-001.md
└── test-report-prd-db-004.md
```

### `docs/email-templates/` — Templates HTML/TXT de e-mail

```
docs/email-templates/
├── README.md
├── SETUP_GUIDE.md
├── admin-recuperacao-senha.html / .txt
├── candidato-recuperacao-senha.html / .txt
└── confirmacao-alteracao-senha.html / .txt
```

## Convenções de Nomes

| Artefato | Padrão | Exemplo |
|---|---|---|
| Componentes React | PascalCase `.tsx` | `DashboardRHPage.tsx`, `RHSidebar.tsx` |
| Hooks | camelCase com prefixo `use` | `useSessionTimeout.ts`, `useViaCEP.ts` |
| Serviços | camelCase `<dominio>Service.ts` | `cadastroService.ts`, `candidaturasService.ts` |
| Schemas | camelCase `<dominio>Schema.ts` | `candidatoSchema.ts` |
| Stores Zustand | camelCase `<dominio>Store.ts` | `authStore.ts`, `adminAuthStore.ts` |
| Pastas features | kebab-case (não — é tudo minúscula simples) | `cadastro/`, `vagas/`, `auth/` |
| Pastas de UI | minúsculas | `ui/`, `pages/`, `examples/` |
| PRDs | `NNNN-prd-nome.md` (ou `prd-db-NNN-*`) | `0005-prd-fluxo-aplicacao-vagas.md` |
| Migrations SQL | `NN-descricao.sql` | `13-tabela-candidaturas.sql` |
| Tests | `__tests__/arquivo.test.ts` co-localizado | `services/__tests__/authService.test.ts` |
| E2E specs | `<flow>-flow.spec.ts` | `cadastro-flow.spec.ts` |
| Páginas RH | sufixo `RHPage` | `CandidatosRHPage.tsx`, `VagasRHPage.tsx` |
| Páginas Candidato | sufixo `CandidatoPage` ou `Page` | `DashboardCandidatoPage.tsx`, `MeuPerfilCandidatoPage.tsx` |

## Localização de Arquivos-Chave

**Entrypoints:**
- `src/main.tsx` — mount do React.
- `src/App.tsx` — árvore de providers + RootLayout.
- `src/router/routes.tsx` — definição de todas as rotas.

**Configuração:**
- `vite.config.ts` — build + aliases (`@/*` → `src/*`).
- `tsconfig.json` — configuração TS.
- `tailwind.config.js` — tokens de design.
- `playwright.config.ts` — config E2E.
- `.env.local`, `.env.example`, `.env.test` — variáveis Vite.

**Lógica de Domínio:**
- `src/features/cadastro/services/cadastroService.ts` — criação de candidato.
- `src/features/cadastro/services/n8nService.ts` — integração N8N.
- `src/features/vagas/services/vagasService.ts` — CRUD vagas.
- `src/features/vagas/services/candidaturasService.ts` — candidaturas.
- `src/store/authStore.ts` / `adminAuthStore.ts` — auth.

**Tipos gerados:**
- `database.types.ts` (raiz) — tipos Supabase (535 linhas, 4 tabelas expostas).

**Testes:**
- Unit tests co-localizados em `__tests__/` dentro de cada feature.
- E2E em `e2e/*.spec.ts`.

## Onde Adicionar Código Novo

**Nova página (rota):**
- Arquivo em `src/components/pages/<Nome>Page.tsx` (segue o padrão legado).
- Registrar rota em `src/router/routes.tsx`, escolhendo ProtectedRoute ou ProtectedAdminRoute.
- Adicionar entrada em `devNavigationPages` (routes.tsx:343) para facilitar dev.

**Nova feature completa (de preferência):**
- Criar pasta `src/features/<dominio>/` com subpastas `components/`, `hooks/`, `services/`, `types/`, `schemas/`, `utils/`.
- Um `index.ts` barrel em cada subpasta.
- Seguir o exemplo de `features/cadastro/`.

**Novo componente UI genérico:**
- Se for primitivo estilo shadcn → `src/components/ui/<componente>.tsx`.
- Se for componente composto reusável → `src/components/<Componente>.tsx` na raiz de components/.

**Novo serviço de dados:**
- Dentro de uma feature: `src/features/<dominio>/services/<nome>Service.ts`.
- Com classe de erro customizada (padrão `<Nome>ServiceError` com union de códigos).

**Novo hook TanStack Query:**
- Dentro de `src/features/<dominio>/hooks/use<Nome>.ts`.
- Definir `queryKeys` hierárquicas no topo do arquivo (padrão `vagasKeys`, `candidaturasKeys`).

**Novo schema Zod:**
- `src/features/<dominio>/schemas/<dominio>Schema.ts` exportando schema agregado + sub-schemas.

**Nova migration SQL:**
- Se usar CLI Supabase: `supabase/migrations/YYYYMMDD_descricao.sql`.
- Se seguir padrão manual do projeto: `docs/sql/sql/NN-descricao.sql` (próximo número disponível).

**Novo teste E2E:**
- `e2e/<flow>-flow.spec.ts` seguindo a estrutura documentada em `e2e/README.md`.

**Novo PRD:**
- `docs/prds/NNNN-prd-<nome>.md` (próximo número disponível — já vai até 0021).
- Tasks derivadas em `docs/prds/tasks/tasks-prd-<nome>.md`.

## Diretórios Especiais

**`src/guidelines/`** — Design patterns e code snippets internos, consumidos pelas conversas com IA (Cursor/Claude).

**`src/components/examples/`** — `CardExamples.tsx`, `LayoutExamples.tsx` — demos visuais do design system (vistas em `/showcase`).

**`src/components/figma/`** — `ImageWithFallback.tsx` — helper para imports vindos do Figma Make.

**`.taskmaster/`** — gestão de tarefas via Task Master AI; `tasks/tasks.json` lista tarefas por PRD. `state.json` mantém estado.

**`.planning/`** — documentos GSD (este diretório). Subpasta `codebase/` contém mapeamentos estruturais (ARCHITECTURE.md, STRUCTURE.md).

**`MCP/`** — configuração de servidores MCP (Model Context Protocol) para integração com Claude/IDE.

**`build/`** e **`playwright-report/`** e **`test-results/`** — **gerados**, não devem ser editados à mão. Já incluídos no `.gitignore` (presumivelmente).

---

*Análise de estrutura: 2026-04-19*
