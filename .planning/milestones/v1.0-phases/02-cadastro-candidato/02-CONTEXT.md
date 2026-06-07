# Phase 2: Cadastro Candidato - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

O candidato completa o formulário multi-step de 4 etapas (Dados Pessoais, Endereço, Disponibilidade, Autorizações LGPD), o client chama a Edge Function `cadastrar-candidato` (já existente, criada na Phase 1), o client faz auto-login imediatamente após, e o candidato aterrisa em `/candidato/perfil` com toast de boas-vindas. Duplicate-check via RPC `SECURITY DEFINER` (substituindo o anon SELECT legado). Sem novo UI — reaproveitamento do `CadastroMultiStepForm` existente, adicionando apenas persistência de draft, error-handling estruturado e wiring de auto-login.

7 requirements: CAD-01 a CAD-07.

</domain>

<decisions>
## Implementation Decisions

### Auto-login + Success UX (CAD-06)

- **D-01:** **Session via `supabase.auth.signInWithPassword(email, senha)`** logo após a Edge Function retornar `{ ok: true }`. Client mantém a senha em memória (React Hook Form state) durante o handler de success e descarta em seguida. Não exige alterar o contract da Edge Function (já deployada).
- **D-02:** **Fallback de auto-login** — se `signInWithPassword` falhar, retry 1x com backoff 500ms. Se ainda falhar: `navigate('/auth/login?email=<email>')` + toast Sonner "Cadastro concluído. Faça login para continuar." (conta foi criada com sucesso; só o auto-login falhou).
- **D-03:** **Success feedback** — redirect direto para `/candidato/perfil` + toast Sonner `"Cadastro concluído! Bem-vindo(a), {primeiro_nome}."`. Sem modal, sem tela intermediária.
- **D-04:** **Loading durante submit** — botão "Criar conta" vira "Criando..." com `Loader2` inline (lucide-react, já instalado) e `disabled=true`. Padrão do form atual, consistente com resto do sistema.

### Error Handling (CAD-03, CAD-07)

- **D-05:** **Contract estruturado na Edge Function** — alterar `cadastrar-candidato/index.ts` e `_shared/schemas.ts` para retornar `{ ok: false, error_code: 'EMAIL_EXISTS' | 'CPF_EXISTS' | 'VALIDATION' | 'SERVER_ERROR', message: string, field?: string }`. `message` segue em pt-BR cordial para fallback de exibição.
- **D-06:** **Client error routing** — `cadastroService` mapeia `error_code`:
  - `EMAIL_EXISTS` → erro inline no campo `email` do Step 1 + auto-navigate para Step 1 + toast explicativo
  - `CPF_EXISTS` → idem para campo `cpf` do Step 1
  - `VALIDATION` → erro inline no campo indicado por `field` (se presente) no step correspondente
  - `SERVER_ERROR` / `NETWORK_ERROR` / fallback → toast Sonner genérico, user permanece no step atual, botão Submit re-habilitado para retry
- **D-07:** **Race de duplicate no submit** — se duplicado só pegar na Edge Function (passou o debounce-check, outra conta criada na janela), client já está coberto por D-06 (auto-navigate para Step 1 + erro inline). Form não reseta; preenchimento dos Steps 2-4 permanece.
- **D-08:** **Tom da copy** — pt-BR cordial sem jargão técnico, alinhado com PROJECT.md e com mensagens já em uso na Edge Function atual (ex.: "Este email já está cadastrado."). Nunca repassar mensagem crua de Supabase/Postgres ao usuário.

### Duplicate Check — RPC + Timing + Rate Limit (CAD-03)

- **D-09:** **RPC `public.check_candidato_duplicate(p_cpf text, p_email text) RETURNS jsonb`** `SECURITY DEFINER`, retornando `{ cpf_exists: boolean, email_exists: boolean }`. Implementada em nova migration (forward da Phase 1 baseline). `duplicateCheckService` do client passa a chamar `supabase.rpc('check_candidato_duplicate', ...)` em vez do anon SELECT atual.
- **D-10:** **Timing — on blur (manter comportamento atual)**. `useDuplicateCheck` continua disparando ao sair do campo, debounce 300ms, abort controller existente. Zero mudança de UX — só troca o transporte (anon SELECT → RPC).
- **D-11:** **Sem pre-submit re-check**. Trust na unique constraint do banco + error UX de D-06. Economiza 1 RPC call por submit, race fica ≤ 1% dos casos e é tratada graciosamente.
- **D-12:** **Rate limit Postgres-side**. Policy dentro da migration que cria a RPC: tabela `rate_limit_check_duplicate (ip, called_at)` + check no corpo da função (30 calls/60s por IP, via `inet_client_addr()` + `auth.uid()`). Excedente retorna `{ cpf_exists: null, email_exists: null, rate_limited: true }` — client mostra toast "Muitas tentativas. Aguarde alguns instantes." e libera o campo.

### Form State + Navigation (CAD-01)

- **D-13:** **Persistência via sessionStorage**. Hook novo `useCadastroDraft` expondo `save(step, data)`, `load()`, `clear()`. Key: `cadastro:draft:v1`. Salva Steps 1-3 **excluindo** `senha` e `confirmar_senha` (NUNCA gravados em storage). `clear()` roda em 3 situações: success da Edge Function, logout, mudança de user no `onAuthStateChange`.
- **D-14:** **Leave guard com `beforeunload`**. Hook `useLeaveGuard(isDirty)` registra listener `window.addEventListener('beforeunload', ...)` enquanto o form tiver dirty state e steps não finalizados. Remove o listener em success ou em unmount. React Router `useBlocker` fica como fallback para navegação interna (não obrigatório no MVP).

### LGPD (CAD-05)

- **D-15:** **Checkboxes LGPD — 1 obrigatório + 3 opcionais**. UI agrupa visualmente:
  - **Obrigatório** (bloqueia submit se false): `autorizacao_uso_dados` — "Concordo com o uso dos meus dados para fins de recrutamento."
  - **Opcionais**: `autorizacao_comunicacao` (receber comunicações Beauty Smile), `autorizacao_retencao_curriculo` (manter currículo para futuras vagas), `autorizacao_analise_video` (análise de vídeo em entrevistas gravadas).
  - Alinhado com LGPD Art. 8 (consent granular por finalidade). Edge Function já aceita os 4 campos.
- **D-16:** **Audit trail + `policy_version`**. Nova migration adiciona coluna `policy_version text NOT NULL DEFAULT 'v1.0-2026-04'` em `autorizacoes`. Constante `POLICY_VERSION` em `supabase/functions/_shared/constants.ts` grava a versão corrente no insert. Permite rastreabilidade futura sem peso de guardar o texto completo. IP + timestamp + flags + `policy_version` = trilha LGPD MVP.

### Claude's Discretion

- Estrutura interna do hook `useCadastroDraft` (setTimeout vs useEffect, debounce do save)
- Nome dos `error_code` individuais (SCREAMING_SNAKE_CASE; `EMAIL_EXISTS`/`CPF_EXISTS` recomendados pela semântica já usada)
- Como passar `field` no `VALIDATION` error (nome canônico do campo vs path Zod)
- Implementação do leave guard (beforeunload puro vs React Router `useBlocker`) — desde que UX seja idempotente
- Layout exato dos 4 checkboxes LGPD (accordion expansível com "Saiba mais" vs todos visíveis) — desde que o obrigatório esteja destacado
- Naming da migration do RPC (seguir padrão Supabase CLI; pode ser `0005_check_candidato_duplicate_rpc.sql` seguindo sequência da Phase 1)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projeto e Requisitos
- `.planning/PROJECT.md` — Visão, constraints (LGPD, pt-BR, security), key decisions
- `.planning/REQUIREMENTS.md` — 7 requirements CAD-01..07 com acceptance criteria
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria (4 itens), depends on Phase 1

### Phase 1 (herança obrigatória — Phase 2 constrói em cima)
- `.planning/phases/01-foundation-saneada/01-CONTEXT.md` — D-01 (Edge Function), D-01a (RPC duplicate), D-01b (contract `{ ok, data?, error? }`)
- `.planning/phases/01-foundation-saneada/01-05-PLAN.md` — Edge Function `cadastrar-candidato` spec original
- `.planning/phases/01-foundation-saneada/KNOWN-ISSUES-CARRYOVER-PHASE-3.md` — bugs auth diferidos (não afetam Phase 2 mas bom conhecer)

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Fluxo auth, fronteira frontend↔backend
- `.planning/codebase/CONVENTIONS.md` — Schemas Zod, custom error classes, naming
- `.planning/codebase/STRUCTURE.md` — Feature-based organization `features/<dominio>/`
- `.planning/codebase/CONCERNS.md` — Bugs conhecidos e riscos técnicos

### Arquivos Críticos (ler antes de modificar)
- `supabase/functions/cadastrar-candidato/index.ts` — Edge Function deployada; alterar para retornar `error_code` estruturado (D-05)
- `supabase/functions/_shared/schemas.ts` — Schema Zod compartilhado; adicionar tipo `CadastroErrorCode`
- `src/features/cadastro/services/cadastroService.ts` — Já invoca Edge Function; trocar `CadastroError.code` por mapeamento de `error_code` (D-06)
- `src/features/cadastro/services/duplicateCheckService.ts` — Migrar de anon SELECT para `supabase.rpc('check_candidato_duplicate', ...)` (D-09)
- `src/features/cadastro/hooks/useDuplicateCheck.ts` — Manter debounce 300ms + abort controller; só trocar o transporte
- `src/features/cadastro/components/CadastroMultiStepForm.tsx` — Wiring final: adicionar useCadastroDraft, useLeaveGuard, handler de success com auto-login + redirect + toast
- `src/features/cadastro/schemas/` — Zod schemas por step (aggregate + per-step) — usar na validação existente
- `supabase/migrations/` — Adicionar nova migration para RPC + rate_limit + `policy_version` em `autorizacoes`

### PRD e Referências Técnicas
- `docs/prds/PRD-MASTER-sistema-recrutamento.md` — PRD-Mestre (seção Cadastro Candidato)
- `docs/RLS_POLICIES.md` — Padrões SQL de RLS e SECURITY DEFINER
- `docs/technical/SECURITY_DECISIONS.md` — Decisões de segurança existentes (ex: Como Edge Function e RPCs coexistem)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CadastroMultiStepForm` + `steps/*.tsx` — Form de 4 steps já implementado; só precisa wiring
- `useDuplicateCheck` — Hook com debounce 300ms + abort controller; trocar transporte para RPC
- `useViaCEP` — Auto-preenchimento de endereço OK, manter
- `cpfValidator.ts` — 35 testes passando, formatação + dígito verificador
- `cadastroService.cadastrarCandidato()` — Já delega para Edge Function (D-01 herdado)
- `CadastroError` — Custom error class com union de codes; estender para mapear `error_code` estruturado (D-06)
- `supabase.auth.signInWithPassword` — Disponível no client anon para auto-login
- `toast` do Sonner — Feedback de erros genéricos e success (D-03, D-06)
- `Loader2` do lucide-react — Inline spinner no botão submit (D-04)
- `Input`, `Checkbox`, `Label` do shadcn/ui — Primitives para os 4 checkboxes LGPD (D-15)

### Established Patterns
- Zustand `authStore` unificado (Phase 1) — session acquirida por `signInWithPassword` já dispara update reativo
- React Hook Form + Zod por step + aggregate schema
- TanStack Query v5 — não usado no cadastro (fluxo imperativo), mas idêntico a outras features
- Supabase Edge Functions no padrão `{ ok, data?, error? }` (estender com `error_code`)
- Feature-based org: tudo novo em `src/features/cadastro/{components,hooks,services,schemas,types}`
- Testes colocados: `__tests__/` ao lado do arquivo, `.test.ts` / `.test.tsx`

### Integration Points
- `supabase.functions.invoke('cadastrar-candidato', ...)` — ponto único de integração server
- `supabase.rpc('check_candidato_duplicate', ...)` — novo ponto (substitui anon SELECT)
- `useAuthStore` — atualiza automaticamente no `onAuthStateChange` disparado pelo `signInWithPassword`
- `useNavigate` (React Router) — redirect para `/candidato/perfil` no success
- `window.addEventListener('beforeunload', ...)` — leave guard (D-14)
- `sessionStorage` — draft persistence (D-13)

</code_context>

<specifics>
## Specific Ideas

- `POLICY_VERSION = 'v1.0-2026-04'` como constante compartilhada em `_shared/constants.ts` — mesma const usada pela Edge Function e pelo front (para exibir no checkbox "Saiba mais")
- Rate limit: 30 calls/60s por IP via Postgres policy na própria migration (reusa padrão de D-01a Phase 1 — "Rate limiting para RPC via policies Postgres")
- `useCadastroDraft` key `cadastro:draft:v1` — `v1` no prefixo permite bump futuro se schema do draft mudar
- Error code granular: `EMAIL_EXISTS`, `CPF_EXISTS` (per-field); `VALIDATION` com `field` opcional; `SERVER_ERROR` e `NETWORK_ERROR` (genéricos, só toast)
- Logout em outra aba (herdado de Phase 1 `onAuthStateChange`) deve disparar `clear()` do draft — user trocou de conta
- Success toast: usar `data.dadosPessoais.nome_completo.split(' ')[0]` para pegar primeiro nome ("Bem-vindo(a), Fernando.")

</specifics>

<deferred>
## Deferred Ideas

- **Validação live por campo vs on-Next** — manter o padrão RHF atual (validação dispara no click do Próximo). Pode virar melhoria de UX em Phase 5 (HARD-04/HARD-05).
- **Re-check ao editar email/CPF depois de passar o Step 1** — `useDuplicateCheck` já é stateful, dispara novo check se valor mudar. Comportamento esperado, nada a planejar.
- **Modal de confirmação antes do submit final** — não está no requirement, adiciona fricção. Fica para M2 se feedback de UAT pedir.
- **Edição de draft entre sessões (localStorage com TTL)** — sessionStorage atende o caso "refresh acidental". Persistência entre sessões é cenário raro para cadastro curto (< 10 min).
- **i18n dos error codes** — sistema ainda single-language pt-BR; quando virar multi-lang, error_code fica estável, message vira chave de tradução.
- **Rate limit global por email (além de IP)** — Phase 2 usa só IP. Se observar abuse, adicionar no próximo round.
- **Análise de senha (força, leaks via HaveIBeenPwned)** — fora de escopo MVP. Supabase Auth já tem minLength. Pode ir para Phase 3 (HARDening de auth).

</deferred>

---

*Phase: 02-cadastro-candidato*
*Context gathered: 2026-04-20*
