# Concerns do Codebase — Sistema de Recrutamento Beauty Smile

**Data da Análise:** 2026-04-19
**Branch Analisada:** `feat/prd-dev-005-foundation`
**Foco:** Bugs, trabalho incompleto, débito técnico, riscos

> Resumo executivo: O sistema foi construído em múltiplas rondas reativas (Round 1–5 + rounds de refinamento E2E) sob pressão do usuário final. Há ~40 documentos de correção em `docs/` indicando que **o desenvolvimento foi firefighting**, não planejamento. O padrão dominante de erros é **desalinhamento entre frontend e schema real do banco** (colunas/enums/campos que o código supunha mas não existiam). Há muita coisa funcional, mas o estado geral é frágil e há 9 testes E2E de login falhando no último `test-results.log`.

---

## 1. Evidência de Bugs e Correções Tentadas

A pasta `docs/` contém uma **trilha documental de fogo** — cada `CORRECAO_*.md` / `FIX_*.md` é um incêndio apagado. Analisando 10+ desses documentos, surge um padrão claro.

### 1.1 Padrão Dominante: Desalinhamento Schema ↔ Frontend

O código **chutou nomes de colunas e enums** em vez de verificar o schema real. Isso produziu uma sequência de erros 400 em produção:

| Bug | Arquivo | Coluna usada (errada) | Coluna real | Doc |
|-----|---------|----------------------|-------------|-----|
| Candidaturas 400 | `src/features/vagas/services/candidaturasService.ts` (15 ocorrências) | `data_candidatura` | `created_at` | `docs/FIX_CANDIDATURAS_400_ERROR.md` |
| Vagas sempre "inativas" | `src/components/pages/VagasRHPage.tsx:173` | `vaga.ativa` (boolean) | `vaga.status` (enum) | `docs/CORRECOES_VAGAS_RH_URGENTE.md` |
| Vaga localizacao 400 | `src/features/vagas/services/candidaturasService.ts:673` | `localizacao`, `ativa` | `cidade`, `estado`, `status` | `docs/VAGA_LOCALIZACAO_FIX_COMPLETE.md` |
| Status "desistente" inválido | `src/components/modals/UpdateStatusModal.tsx:41-59` | `'desistente'` no enum | Removido (não existe em `status_candidatura`) | `docs/SESSAO_CORRECOES_ROUND4_SUMMARY.md` |
| Filtro `{ ativa: true }` | `src/components/pages/CandidatosRHPage.tsx:153` | Filtro em campo inexistente | Substituído por `apenasAtivas: false` | `docs/CORRECOES_VAGAS_RH_ROUND2.md` |
| Vagas pausadas sumiam | `src/components/pages/VagasRHPage.tsx:62` | `useVagas()` sem filtro | Filtro `apenasAtivas: false` + limit 100 | `docs/CORRECOES_VAGAS_RH_ROUND2.md` |
| Slug duplicado ao duplicar | `src/components/pages/VagasRHPage.tsx:104-113` | Slug copiado literal | Gerar slug único | `docs/CORRECOES_VAGAS_RH_ROUND2.md` |

**Conclusão 1:** Todo este grupo de bugs poderia ter sido prevenido com `database.types.ts` corretamente gerado. Veja item 3.1.

### 1.2 Padrão: Mock Data Hardcoded Deixado em Produção

Múltiplas páginas RH e do candidato ficaram com arrays fake após a fase inicial de UI, e **ninguém trocou por dados reais até o usuário reclamar**:

| Página | Mock que ficou | Ação | Doc |
|--------|---------------|------|-----|
| `MeuPerfilCandidatoPage.tsx:56-118` | `vagasParticipando` (3 fake) + `etapasProcesso` (7 fake) | Substituído por `useCandidaturas()` | `docs/FIX_CANDIDATE_PROFILE_DATABASE_INTEGRATION.md`, `docs/SESSAO_CORRECOES_ROUND5_SUMMARY.md` |
| `RHSidebar.tsx` / `RHTopBar.tsx` | `userName: 'João Silva'`, `userRole: 'Administrador'` hardcoded | Conectado ao `authStore` | `docs/CORRECOES_AREA_RH.md` (Fase 1) |
| `DashboardRHPage`, `VagasRHPage`, `CandidatosRHPage` | 100% Mock em teste manual reportado | Reescritas para 100% DB | `docs/CORRECOES_AREA_RH.md` (tabela Resumo Executivo) |

### 1.3 Padrão: Bugs de Estado do React Query

| Bug | Sintoma | Fix | Arquivo |
|-----|---------|-----|---------|
| UI não atualiza após mudar status | Precisava F5 manual | `invalidateQueries` → `refetchQueries` com `type: 'active'` | `src/features/vagas/hooks/useCandidaturas.ts:340-344` (`docs/CORRECAO_AUTO_REFRESH_STATUS.md`) |
| Etapa não avança ao aprovar | `etapa_atual` ficava travada após `status='aprovado_proxima'` | Adicionado auto-advance na service | `src/features/vagas/services/candidaturasService.ts` (`docs/SESSAO_CORRECOES_ROUND4_SUMMARY.md` item 2) |

### 1.4 Padrão: Playwright / E2E Frágeis

Os testes E2E passaram por **3 rounds de refinamento** e ainda não todos passam:

- **Round 1** (`docs/E2E_TEST_REFINEMENT_ROUND1.md`): mensagens de erro no teste não batiam com schema Zod real; strict-mode violation; faltavam `data-testid`.
- **Round 2** (`docs/E2E_TEST_REFINEMENT_ROUND2.md`): Suites 6-9 falhavam com `SecurityError: Failed to read the 'localStorage' property` — causa: `page.evaluate(() => localStorage.clear())` antes de `page.goto()`.
- **Round 3** (`docs/E2E_TEST_REFINEMENT_ROUND3.md`): mesmo bug em Suites 3-5 + aparece novo bloqueador ("testes requerem tokens válidos do Supabase").
- **Último run (`test-results.log`):** 12 passed, 9 failed de 21 (login-flow). Falhas críticas:
  - Login com email/senha vazios não mostra mensagem "email/senha é obrigatório" esperada (provavelmente validação não dispara no submit vazio).
  - **Rotas protegidas não redirecionam para `/auth/login`** quando acessadas sem sessão — página carrega `/candidato/perfil` mesmo deslogado. Isso é uma **falha de segurança**, não apenas um teste quebrado.
  - Logout básico não funciona (3x no log).
  - Mobile logout: botão "Sair" não aparece em iPhone 12 Pro (viewport) → 60s timeout.
  - Tab-navigation não foca no campo email.

### 1.5 Outras Correções Notáveis

- **Etapas do processo** (`docs/CORRECAO_ETAPAS_REORDENACAO.md`): ordem estava errada (cultura antes de presencial); "Raven" precisou ser renomeado para "Cognitivo" (só no label); novo enum `avaliacao_final` exigiu **migração de banco** (`supabase/migrations/20250123_add_avaliacao_final_etapa.sql`) — o que indica schema mutável em produção.
- **Database Types vazio** (`docs/FIX_DATABASE_TYPES_GENERATION.md`): `database.types.ts` ficou vazio depois de uma tentativa de regeneração mal-sucedida. Runtime continuou funcionando mas TypeScript quebrou (veja seção 3).

---

## 2. Features Incompletas

### 2.1 PRD-0001 (Cadastro) — Task 1 oficialmente "in-progress"

Em `.taskmaster/tasks/tasks.json` (linha 8):

```json
"id": 1, "title": "Configurar validação de formulário...", "status": "in-progress"
```

Subtasks 2, 3, 4 (schema Zod, types, integração RHF) estão **`pending`** — mas `SESSION_PROGRESS.md` afirma que tudo está 100%. Há **inconsistência entre o taskmaster e a documentação de sessão**.

Tasks 2–9 do PRD-0001 aparecem como `pending` no JSON mas `SESSION_PROGRESS.md` marca todas como concluídas. Provavelmente o taskmaster não foi atualizado.

### 2.2 PRD-0005 (Foundation for Job Application) — tag ativa

`.taskmaster/state.json`: `"currentTag": "prd-0005"`. As 8 tasks deste PRD aparecem todas como `done` — mas o commit mais recente é `feat: PRD-DEV-005 - Foundation for Job Application System` e **43 arquivos estão modificados sem commit** (ver `git status`). Isso sugere que o trabalho está meio-feito no branch.

### 2.3 TODOs em Código (Features Não Implementadas)

Busca por `TODO|FIXME|HACK|XXX` em `src/` retornou comentários explícitos de trabalho inacabado:

| Arquivo | Linha | TODO |
|---------|-------|------|
| `src/components/pages/FormularioCandidaturaPage.tsx` | 192 | Fazer upload do currículo para Supabase Storage |
| `src/components/pages/FormularioCandidaturaPage.tsx` | 193 | Salvar respostas do formulário no banco (criar tabela `formularios_candidatura`) |
| `src/components/pages/FormularioCandidaturaPage.tsx` | 195 | Criar candidatura (vincula `candidato_id` + `vaga_id`) |
| `src/components/pages/CriarEditarVagaPage.tsx` | 137–139 | Carregar `perguntasTriagem`, `perguntasCultura`, `instrucoesIA` de tabelas relacionadas |
| `src/components/pages/LoginCandidatoPage.tsx` | 28 | Implementar redirecionamento por etapa quando tabela candidaturas estiver disponível |
| `src/components/RHTopBar.tsx` | 33 | Implementar busca global |
| `src/components/RHSidebar.tsx` | 43 | Adicionar campo de perfil na tabela candidatos ou usuários |
| `src/components/pages/CandidatosRHPage.tsx` | 208 | Quando tiver scores calculados, ordenar por eles |

### 2.4 Uncommitted Work in Progress (43 arquivos)

`git status` mostra 43 arquivos modificados + vários novos não-trackados incluindo:

- `src/components/ErrorBoundary.tsx` (novo, não commitado)
- `src/components/KanbanBoard.tsx` (novo)
- `src/components/ProtectedAdminRoute.tsx` / `ProtectedRoute.tsx` (novos — **componentes de segurança críticos não commitados**)
- `src/components/ScoreCard.tsx`, `src/components/modals/` (novos)
- `src/components/pages/CadastroPage.tsx`, `RelatoriosRHPage.tsx`, `VagaCandidatosRHPage.tsx`, `VagaDetalhePage.tsx` (novas páginas)
- `src/hooks/`, `src/schemas/`, `src/services/`, `src/store/` (novos diretórios de serviços)
- `supabase/` (novo — migrações não trackadas)
- `e2e/job-application-flow.spec.ts`, `e2e/password-recovery-flow.spec.ts` (novos testes)

**Risco:** muito trabalho vivo no working tree. Se o ambiente for perdido, perde-se horas de código.

### 2.5 Task List Pendente de Aprovação

`docs/RESTAURACAO_CANDIDATOS_RH_PAGE.md` (linha 3): **"Status: ⏳ PENDENTE APROVAÇÃO"** — documento lista funcionalidades que foram **removidas inadvertidamente** (3 abas, Kanban drag-drop, scores Big Five/DISC/Raven/Cultura, funil por vaga). Sugere um desenvolvimento que "desfez" partes do sistema anterior.

---

## 3. Arquivos com Sinais de Problema

### 3.1 `database.types.ts.tmp` — artefato de regeneração quebrada

Arquivo de 7 linhas apenas com o tipo `Json`. É resíduo de uma tentativa `npx supabase gen types > database.types.ts.tmp` que falhou no meio. Deveria ser deletado.

`database.types.ts` atual tem 534 linhas — foi regenerado depois, mas o `.tmp` nunca foi removido. Arquivo órfão.

### 3.2 Assets deletados + reintroduzidos em formato diferente

`git status` mostra:

```
D src/assets/3fc028ae080bb7435c5ebf8f1e62a8036e20c73c.png
?? src/assets/3fc028ae080bb7435c5ebf8f1e62a8036e20c73c.avif
D src/assets/5feab6fe2a4e5e85a5b01894d30667ea3a06a9d0.png
?? src/assets/5feab6fe2a4e5e85a5b01894d30667ea3a06a9d0.webp
(6 trocas)
```

Hashes hexadecimais como nome indicam **assets exportados do Figma** (provavelmente via Figma Make). Alguém trocou PNG → AVIF/WEBP manualmente. Há dois outros assets ainda só em PNG (`a81ed2cde200cdf4e82689faaeafaceff5cd291a.png`, `91b67d31b9aa67c340ac4a375a9832d8c0284448.png`), indicando troca incompleta.

### 3.3 `src/copiar-imagens-raven.sh` — shell script no source

Script shell dentro de `src/` (vai ser bundled pelo Vite a menos que esteja explicitamente excluído). Indica ferramenta ad-hoc para copiar imagens do teste de Raven.

### 3.4 `src/styles/globals.css.backup` (não-trackado)

Backup manual de CSS. Sinal de que ninguém confiava no Git para reverter.

### 3.5 `test-results.log` commitado no root

Log de teste no root do projeto, commitado. 349 linhas mostrando 9 falhas ativas. Deveria estar em `.gitignore`.

### 3.6 Duplicidade de páginas: `VagasPage.tsx` vs `VagasPublicasPage.tsx` vs `VagasRHPage.tsx`

Três páginas de vagas:
- `src/components/pages/VagasPage.tsx` (aparece no inventário legado como "pública")
- `src/components/pages/VagasPublicasPage.tsx`
- `src/components/pages/VagasRHPage.tsx`
- `src/components/pages/VagaCandidatosRHPage.tsx` (novo, não commitado)
- `src/components/pages/VagaDetalhePage.tsx` (novo, não commitado)
- `src/components/pages/VagaLPPage.tsx` (landing page de vaga)

O router importa `VagasPublicasPage` e `VagaDetalhePage`; `VagasPage.tsx` pode ser página morta ainda não removida.

### 3.7 Duplicidade de páginas de cadastro: `CadastroPage.tsx` vs `InscricaoPage.tsx`

`CadastroPage.tsx` (novo, não-trackado) e `InscricaoPage.tsx` (existente, listada no inventário). Ambas importadas no router. Provável sobreposição de responsabilidade.

### 3.8 Duplicidade de perfil: `MeuPerfilPage.tsx` vs `MeuPerfilCandidatoPage.tsx`

`MeuPerfilPage.tsx` aparece em `src/components/pages/` mas o router importa `MeuPerfilPage` como RH e `MeuPerfilCandidatoPage` como candidato. Dois componentes diferentes que poderiam compartilhar base.

---

## 4. Riscos Técnicos

### 4.1 Dois Auth Stores Paralelos (`authStore` + `adminAuthStore`)

`src/store/authStore.ts` + `src/store/adminAuthStore.ts`. Em `src/App.tsx` (linhas 137–232) há lógica **duplicada** de "Lembrar-me" para cada store, cada um com suas próprias flags em `sessionStorage` / `localStorage`:

- `auth-session-temporary`, `auth-was-temporary`
- `admin-auth-session-temporary`, `admin-auth-was-temporary`

Todos escutam o **mesmo** `supabase.auth.onAuthStateChange` e atualizam ambos os stores simultaneamente. Isso é um anti-pattern: ao logar como candidato, o `adminAuthStore` também recebe o user. Se o `ProtectedAdminRoute` só verifica `isAdminAuthenticated`, um candidato pode acessar páginas RH até o sistema validar role no banco (provável TOCTOU).

A **falha real detectada pelos testes E2E** (`test-results.log`, teste 3.1) — que rotas protegidas não redirecionam para login — é coerente com essa arquitetura dupla.

### 4.2 RLS com Policies Anonymous Arriscadas

`docs/RLS_POLICIES.md` (linha 109, 126):
- "Allow anonymous SELECT for duplicate check" em `candidatos`
- "Allow anonymous duplicate check" em `candidaturas`

Essas policies permitem que **qualquer pessoa não autenticada** faça SELECT na tabela `candidatos` para checar CPF/email. Se não houver filtros extras na policy (ex.: retornar apenas `id`/`nome`, não dados sensíveis), dá para enumerar a base de CPFs. Precisa verificar se a policy usa `SECURITY DEFINER` com colunas restritas.

### 4.3 Geração de Types Manual é Pontos de Falha

`docs/FIX_DATABASE_TYPES_GENERATION.md` assume que o usuário roda manualmente `npx supabase gen types typescript --project-id ... > database.types.ts`. Não há script npm configurado em `package.json`, não há hook pré-commit, não há CI. Qualquer mudança de schema **não** sincroniza com TS — e como vimos na seção 1.1, isso gerou 7+ bugs de produção.

### 4.4 Webhook N8N como Dependência Externa Síncrona

`src/features/cadastro/services/n8nService.ts` (e `candidaturasService.ts`): 9 workflows N8N diferentes (`analise-formulario`, `analise-bigfive`, `analise-disc`, `analise-raven`, `analise-fit-cultural`, `analise-entrevistas`, `emails-automaticos`, `lembretes-cron`, `integracao-notion`). Fluxo de candidatura dispara webhook com retry 3x + timeout 10s.

Riscos:
- **URLs do N8N vivem em env vars** (test + production). Se um workflow cair, análise de IA trava.
- **Retry 3x** com backoff pode bloquear UI se for síncrono. Confirmar se é fire-and-forget.
- Comentário em `task 6` diz "Falha no webhook NÃO deve bloquear o cadastro" mas não validei que está respeitado em todos os call sites.
- N8N em `fernandocosta.app.n8n.cloud` — conta pessoal, não empresarial. Risco de disponibilidade.

### 4.5 Validação de Duplicatas com Race Condition

`src/features/cadastro/hooks/useDuplicateCheck.ts` + `duplicateCheckService.ts`:
- Debounce 800ms.
- `Promise.all` em `checkBothDuplicates`.
- AbortController para race conditions.

Porém o check é client-side. Um atacante pode ignorar o debounce e martelar o endpoint (RLS anonymous SELECT permite). Não vi rate-limiting aplicado a esse caminho (há `src/services/rateLimitService.ts` mas não sei se cobre este fluxo).

### 4.6 Zero Tests para o Store / Services Críticos

Não há `__tests__/` para:
- `src/store/authStore.ts`
- `src/store/adminAuthStore.ts`
- `src/features/vagas/services/candidaturasService.ts` (o que mais mudou)
- `src/features/vagas/services/vagasService.ts`

Apenas `src/features/cadastro/utils/cpfValidator.ts` tem testes (35). Cobertura de código executável é baixíssima.

### 4.7 Environment Variables Pouco Documentadas

`.env`, `.env.test`, `.env.test.example` existem mas não li conteúdo (forbidden). `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_N8N_WEBHOOK_URL` são referenciadas na documentação mas não vi checagem no bootstrap de App que valida presença. Se uma env var faltar, app falha silenciosamente.

### 4.8 Sessões Temporárias Implementadas de Forma Frágil

Em `src/App.tsx:137-177`, lógica de "Lembrar-me" mistura `sessionStorage` + `localStorage` com flags (`auth-session-temporary`, `auth-was-temporary`) e faz `supabase.auth.signOut()` baseado em heurística de existência de flag. Race conditions possíveis ao trocar aba, reload durante init, etc.

---

## 5. Dívida Técnica Aparente

### 5.1 Estrutura Pages Inconsistente

Existem **três locais diferentes** para páginas:

- `src/components/pages/` (35 arquivos, padrão dominante — legado de Figma Make)
- `src/pages/vagas/` (previsto no PRD-0005 task 1, pode ou não existir)
- `src/features/*/components/` (feature-based, padrão PRD-0001)

O `docs/INVENTARIO-SISTEMA-RECRUTAMENTO.md` (linha 33) chama o estilo original de "Component-based architecture" sem React Router; depois do PRD-0001 mudou para feature-based com React Router. Projeto está em **meio-termo de migração de arquitetura**.

### 5.2 Figma Make Como Origem (Legacy)

Inventário descreve origem em Figma Make. Assets com hash hexadecimal, componentes em `src/components/figma/ImageWithFallback.tsx`, e comentário "Menu dev deve ser removido em produção" em `App.tsx:116`. Várias dessas convenções não casam com código "production-grade".

### 5.3 Knowledge Sprawl: 40+ Docs Soltos

`docs/` tem 40+ arquivos `.md` sem hierarquia clara:
- `PROGRESS_SUMMARY.md` e `SESSION_PROGRESS.md` no root (relatos de sessão)
- `ROUND5_COMPLETION_FINAL.md`, `SESSAO_CORRECOES_ROUND3/4/5_SUMMARY.md` (histórico de rodadas)
- `TASK_5/6/7/8/9/10_COMPLETED.md` (um por task — redundante)
- `FASE_4_COMPLETION_SUMMARY.md` (fase que não bate com taskmaster)
- `PRD-4_COMPLETED.md` (enquanto taskmaster usa prd-0004)
- `DOCUMENTACAO-TECNICA-BEAUTY-SMILE-V2.md` + `CHECKPOINT-BEAUTY-SMILE-V3.0.md` (versões de doc)
- `email-templates/`, `sql/`, `technical/`, `testing/`, `validations/` (subpastas sem índice)

Nenhum `README.md` raiz referencia esta estrutura. Para um novo dev é impossível navegar.

### 5.4 Tracking Ad-hoc (Taskmaster vs Docs vs Commits)

Three sources of truth conflitantes:
- `.taskmaster/tasks/tasks.json` (270 pending + 35 done + 3 completed)
- `SESSION_PROGRESS.md` (afirma 9/9 tasks do PRD-0001 feitas)
- Git log (16 commits no branch, mostra progressão 1→9)

PRD-0001 task 1 está "in-progress" no JSON mas "completed" nos docs. Impossível dizer ao certo onde o trabalho parou.

### 5.5 Dev Navigation Menu em Produção

`src/App.tsx:41-123` — `<DevNavigationMenu>` é um botão flutuante que lista todas as rotas (incluindo `/rh/*`). Comentário diz "Remover em produção". Não há flag de ambiente (`import.meta.env.DEV`) controlando. Se for deploy produção agora, **usuário final vê menu de admin** que expõe toda a superfície da aplicação.

### 5.6 Nomenclatura em Dois Idiomas

Código em PT-BR + EN misturado: `celular` (PT) vs `phone`, `candidato_id` (PT) vs `userId`. Tipos TypeScript inferidos do banco mantêm PT (`nome_completo`, `data_nascimento`). Em handlers React, variáveis às vezes viram `candidate`, `handleLogout` (EN). Falta de convenção.

### 5.7 Múltiplos Layouts Concorrentes

- `RHLayout` + `RHSidebar` + `RHTopBar` (área RH)
- Área de candidato sem layout dedicado (cada page usa `BackgroundImage` isoladamente)
- `GlassShowcase` como página de design system

### 5.8 Arquivos Grandes Não Modularizados

(`wc -l` retornou 0 nesta sessão — provavelmente argumento de pipe falhou via Bash sandbox — mas indicações via `docs/`):
- `src/features/vagas/services/candidaturasService.ts`: mencionado com linha 1153+ nos docs → **>1000 linhas**. 5 funções principais (`checkDuplicateApplication`, `createCandidatura`, `listCandidaturas`, `listAllCandidaturas`, `listCandidaturasByVaga`) num só arquivo. Deveria ser quebrado.
- `src/features/cadastro/schemas/candidatoSchema.ts`: 400+ linhas.
- `src/features/cadastro/types/formTypes.ts`: 350+ linhas.

---

## 6. Recomendações para o PRD

### 6.1 Top 3 Áreas Quebradas a Reconstruir

1. **Autenticação & Route Protection** — `authStore` + `adminAuthStore` paralelos, rotas protegidas que não protegem (E2E prova), lógica de "Lembrar-me" com flags duplicadas em `localStorage` + `sessionStorage`. Testes E2E mostram que deslogado você consegue `/candidato/perfil`. Reconstruir:
   - Unificar em **um único store de auth** com campo `role` (`candidato` | `rh` | `admin`).
   - Implementar `<RoleGuard>` no React Router que lê role do banco (não do token).
   - Remover flags manuais; usar a sessão do Supabase como única fonte.

2. **Schema ↔ Types Pipeline** — 7+ bugs de produção vieram de colunas/enums desalinhados. Automatizar:
   - Script `npm run gen:types` em `package.json`.
   - Hook pré-commit (husky) que regenera e comita `database.types.ts`.
   - CI que falha build se `tsc --noEmit` errar.
   - Usar `Database['public']['Enums']['...']` em vez de strings literais para enums.

3. **Candidaturas Service monolítico** — `candidaturasService.ts` foi onde **mais bugs aconteceram** (data_candidatura, localizacao/ativa, desistente). Fragmentar:
   - `candidaturasQueryService.ts` (list/get)
   - `candidaturasMutationService.ts` (create/update/delete)
   - `candidaturasStatusService.ts` (transições de status e auto-advance)
   - `candidaturasWebhookService.ts` (disparos N8N)
   - Adicionar testes para cada função — hoje tem zero.

### 6.2 Candidatos a Redesign

- **Auth unificado** (um store, guard centralizado) — crítico por segurança.
- **Roteamento limpar dev menu** — remover ou gatear por `import.meta.env.DEV`.
- **Pages migration** — escolher entre `src/components/pages/` (legado Figma) ou `src/features/*/components/pages/` (feature-based). Hoje é híbrido inexplicável.
- **ErrorBoundary global + Sentry/logging** — já existe `src/components/ErrorBoundary.tsx` (não commitado). Ligar a um serviço real.
- **Fluxo de testes psicométricos** — Big Five, DISC, Raven (Cognitivo) têm páginas de instrução + execução + resultados. Nenhum documento cita conclusão ou testes automatizados. Provável feature semi-funcional.

### 6.3 Features Não-Negociáveis (do taskmaster e commits)

O que **realmente funciona hoje** (preservar):
- Formulário multi-step de cadastro (`src/features/cadastro/components/CadastroMultiStepForm.tsx`) com validação Zod + RHF + ViaCEP + duplicate check. PRD-0001 tasks 1–9.
- CRUD de Vagas RH (depois da ronda de fix) — `VagasRHPage`, `CriarEditarVagaPage`.
- Dashboard RH + Candidatos RH (reescritas 100% de DB em `docs/CORRECOES_AREA_RH.md`).
- Login candidato (PRD-0002 todas as tasks `done`), com `Remember me` e redirect pós-login.
- Perfil do candidato mostrando candidaturas reais após Round 5.
- RLS: 103 policies em 34 tabelas — backend aparentemente sólido (mas ver concern 4.2).

O que **provavelmente não está pronto**:
- Upload de currículo (TODO na `FormularioCandidaturaPage:192`).
- Tabela `formularios_candidatura` (TODO:193).
- Busca global RH (TODO em `RHTopBar:33`).
- Scores sendo ordenados (TODO em `CandidatosRHPage:208`).
- Perguntas de triagem / cultura de cada vaga (TODOs em `CriarEditarVagaPage:137-139`).
- Redirect por etapa no login (TODO em `LoginCandidatoPage:28`).
- Restauração de Kanban + tabs em CandidatosRH (doc "PENDENTE APROVAÇÃO").

### 6.4 Priorização Sugerida para o PRD

1. **Fase Saneamento** — pipeline de types, remover dev menu em prod, deletar `.tmp`/`.backup`, commitar o WIP (43 arquivos), resolver os 9 E2E failures.
2. **Fase Segurança** — unificar auth, proteger rotas de verdade, revisar RLS anonymous, implementar logging.
3. **Fase Completar Features** — endereçar cada TODO acima com escopo claro (upload, perguntas vaga, scores).
4. **Fase Refactor** — quebrar `candidaturasService.ts`, consolidar layouts, resolver duplicidade de páginas.
5. **Fase Testes** — cobertura unit nos services críticos, E2E estável (hoje 12/21).

---

## Apêndice: Arquivos-chave para consulta

| Tipo | Arquivo |
|------|---------|
| Sumário de sessão | `PROGRESS_SUMMARY.md`, `SESSION_PROGRESS.md` |
| Inventário legado | `docs/INVENTARIO-SISTEMA-RECRUTAMENTO.md` |
| Taskmaster state | `.taskmaster/state.json`, `.taskmaster/tasks/tasks.json` |
| Fix trail | `docs/CORRECAO_*.md`, `docs/CORRECOES_*.md`, `docs/FIX_*.md`, `docs/SESSAO_CORRECOES_ROUND*.md` |
| E2E failures | `test-results.log` |
| RLS | `docs/RLS_POLICIES.md` |
| Webhooks | `docs/WEBHOOKS_N8N.md` (novo, não-lido aqui) |
| PRDs | `docs/prds/0001...0021-prd-*.md`, `docs/prds/prd-db-*.md`, `docs/prds/prd-frontend-*.md` (27 PRDs) |
| App root | `src/App.tsx`, `src/router/routes.tsx` |
| Auth stores | `src/store/authStore.ts`, `src/store/adminAuthStore.ts` |
| Service high-risk | `src/features/vagas/services/candidaturasService.ts` |
| Type broken | `database.types.ts`, `database.types.ts.tmp` |

---

*Concerns audit: 2026-04-19*
