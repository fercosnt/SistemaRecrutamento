# Phase 3: Login + Recuperação de Senha — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

**Entrega:** Um candidato cadastrado (Phase 2) consegue:
1. Fazer login com email + senha e ver mensagens de erro claras quando as credenciais estão incorretas, o email não está confirmado, a conta está rate-limited, ou há falha de rede.
2. Permanecer logado entre sessões do navegador conforme o checkbox "Lembrar-me" (marcado = persistente, desmarcado = morre ao fechar a aba).
3. Recuperar uma senha esquecida recebendo email com link de reset, abrindo a página de redefinição, e logando imediatamente com a nova senha.

**Escopo inclui:**
- Fluxo de login canônico para candidato (reescreve `LoginCandidatoPage.tsx` — já existe como scaffold Phase 1)
- Fluxo "esqueci senha" → email (via Supabase `resetPasswordForEmail`) → redefinição → auto-login
- Fix Bug 1 (AUTH-JWT-01): `authStore.extractRole` deve decodificar payload do JWT, não ler `session.user.app_metadata`
- Fix Bug 2/3 (AUTH-LOGIN-01/02): `LoginRHPage` reescrito com fluxo canonical (remove setters legados que forjam `administrador` role)

**Escopo NÃO inclui (scope creep → deferred):**
- MFA / 2FA / passkeys (Phase 5 hardening ou milestone v2.0)
- Social login (Google, LinkedIn, GitHub OAuth) — backlog M2
- Bug 6 (RPC `check_candidato_duplicate` cpf_exists) — é bug de cadastro, não auth; Phase 4 ou 5
- Password strength meter visual (zxcvbn) — Zod silent validation é suficiente
- LGPD re-consent em reset de senha — consentimento do cadastro persiste
- Telemetria/auditoria de logins (incluindo tabela `auth_audit_log`) — Phase 5

</domain>

<decisions>
## Implementation Decisions

### Mensagens de erro no login (taxonomia e UX)

- **D-01:** Credenciais inválidas (email não existe OU senha errada) → mensagem **genérica única** "Email ou senha inválidos". Segue o princípio de seguridade do projeto (evita user enumeration, alinha com padrão Supabase). Prevalece sobre UX de mostrar qual campo errou.
- **D-02:** Email não confirmado → mensagem específica "Confirme seu email antes de fazer login" **+ botão CTA "Reenviar email de confirmação"** que chama `supabase.auth.resend({ type: 'signup', email })`. Requer detectar `error.code === 'email_not_confirmed'` no retorno do `signInWithPassword`.
- **D-03:** Rate limit (Supabase `over_email_send_rate_limit` ou similar) → mensagem "Muitas tentativas. Tente novamente em {N}s" **com countdown visual** e botão de submit disabled até zerar. O cooldown é derivado do header `Retry-After` quando presente, caso contrário fallback fixo (ex: 60s).
- **D-04:** Erro de rede / servidor indisponível → mensagem dedicada "Erro de conexão. Verifique sua internet." + botão "Tentar novamente". **Segue exatamente o pattern do `duplicateCheckService` Phase 2 (`code: 'NETWORK_ERROR'`).** A taxonomia de erros do `authService` do Phase 3 deve espelhar a do `cadastroService`/`duplicateCheckService` (`{ code, message, field? }` com enum canônico).

### "Lembrar-me" — default + storage strategy

- **D-05:** Checkbox "Lembrar-me" é **marcado por padrão** (UX amigável, alinha com padrão de apps modernos e persona candidato mobile-first).
- **D-06:** Se **desmarcado** → sessão usa `sessionStorage` em vez de `localStorage` (sessão morre ao fechar a aba/navegador). Implementação: passar `storage: window.sessionStorage` ao `createClient` baseado no estado do checkbox — mas o `@supabase/supabase-js` é inicializado uma vez no `lib/supabase/client.ts`, então o toggle entre storages requer re-criação condicional do client OR um wrapper de storage customizado. Planner deve investigar qual abordagem tem menos superfície de regressão (D-19 abaixo).
- **D-07:** Candidato logado com "Lembrar-me" marcado → **sem timeout** — sessão indefinida até logout manual ou expiração natural do refresh token (~7 dias padrão Supabase; refresh automático). NÃO aplicar `useSessionTimeout` (que é do RH/admin). Candidato = persona casual mobile, sem dados sensíveis de terceiros.
- **D-08:** Redirect pós-login bem-sucedido (candidato) → **sempre `/candidato/perfil`**. Consistente com redirect pós-cadastro (D-02 do Phase 2). Não implementar `returnTo` baseado em RoleGuard nesta phase — adicionar se surgir demanda.

### Fluxo de recuperação de senha — UX

- **D-09:** Página "Esqueci senha" → após submit, **mensagem neutra** "Se o email estiver cadastrado, enviamos um link de recuperação. Verifique sua caixa de entrada.". Não confirma se o email existe no banco (consistência com D-01 e mitigação de enumeration).
- **D-10:** Página de redefinição → **2 campos: nova senha + confirmar nova senha** (mesmo pattern do `DadosPessoaisStep` no cadastro). Reusa Zod schema do cadastro (ou derivado) com `.refine()` garantindo match entre os dois campos.
- **D-11:** Password strength feedback → **validação Zod silenciosa** (min 8 caracteres, maiúscula, minúscula, número — mesmo regex do cadastro) com mensagem de erro **apenas no submit**. Sem meter visual (zxcvbn), sem checklist em tempo real. Mantém simplicidade e consistência com cadastro.
- **D-12:** Após redefinir senha com sucesso → **auto-login** (reusa pattern `tryAutoLogin` do Phase 2 Plan 02-05) + toast Sonner "Senha alterada com sucesso" + navegar para `/candidato/perfil` com `replace: true`. Sem email de notificação extra (fora de escopo).

### Escopo de carryover bugs de Phase 1/2

- **D-13:** **Bug 1 (AUTH-JWT-01) — IN SCOPE, CRÍTICO.** `extractRole()` em `authStore.ts:129-136` atualmente lê `session.user.app_metadata.role`, que é populado pelo SDK a partir da tabela `auth.users` (onde `role` NÃO existe como coluna). O Custom Access Token Hook injeta `role` APENAS no JWT assinado. Fix: decodificar `session.access_token` (base64 split ou `jwt-decode` library) e ler `payload.app_metadata.role`. Sem esse fix, `role` fica `null` no authStore após login → RoleGuard nunca redireciona → candidato fica travado em `/auth/login` → **bloqueia success criterion 1 do ROADMAP**.
- **D-14:** **Bug 2/3 (AUTH-LOGIN-01/02) — IN SCOPE.** `LoginRHPage.tsx` hoje usa setters ad-hoc (`setAdminSession` ou similar) que passam `role: 'administrador'` manualmente para o authStore sem validar o JWT. Fix: reescrever `LoginRHPage` com o mesmo fluxo canonical do `LoginCandidatoPage` — chamar `supabase.auth.signInWithPassword`, ler `role` do JWT (via fix do D-13), e recusar login se `role !== 'administrador'`. Remove os setters legados. Manter layout/UX atual — apenas a camada de autorização muda.
- **D-15:** **Bug 6 (AUTH-RPC-01) — OUT OF SCOPE.** A RPC `check_candidato_duplicate` compara digits-only CPF vs `candidatos.cpf` formatada → `cpf_exists` sempre retorna `false`. É bug de cadastro (duplicate debounce check), não de auth. Safety net atual (UNIQUE constraint + EF error-match → `CPF_EXISTS`) já protege o submit-time. Fica tracked em `KNOWN-ISSUES-CARRYOVER-PHASE-3.md` como Bug 6 e move para Phase 4 ou 5.
- **D-16:** Redefinição de senha **NÃO reapresenta LGPD consent**. Consentimento foi capturado no cadastro com `POLICY_VERSION` atual e persiste. Mudança de senha é ação técnica, não alteração de política.

### Error taxonomy alignment (cross-phase)

- **D-17:** `authService` (novo ou evolução do `src/features/cadastro/services/authService.ts` existente) segue o **mesmo formato de erro estruturado do Phase 2**: class `AuthError extends Error` com `code: 'INVALID_CREDENTIALS' | 'EMAIL_NOT_CONFIRMED' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'SERVER_ERROR' | 'UNKNOWN_ERROR'`, opcional `field?: 'email' | 'senha'`, opcional `retryAfterSeconds?: number` (para RATE_LIMITED). A camada de UI usa um `FIELD_TO_ERROR_MESSAGE` map (análogo ao `FIELD_TO_STEP_*` do cadastro) pra renderizar mensagens pt-BR.
- **D-18:** Drop do legacy `error` alias do Phase 2 (T-02-03) **NÃO acontece nesta phase** — verificar se ainda há clients em produção usando ele antes. Deixar para Phase 5 hardening ou milestone v2.0. Documentar decisão em `PROJECT.md`.

### Claude's Discretion

- **D-19:** Estratégia técnica para swap de storage entre `localStorage` ↔ `sessionStorage` baseado em "Lembrar-me". Três opções em aberto (pra planner decidir com base no menor blast radius):
  - (a) Recriar `supabase.createClient()` condicionalmente ao submeter login
  - (b) Storage wrapper customizado que delega para `localStorage` ou `sessionStorage` baseado em flag runtime
  - (c) Usar `localStorage` sempre + `auth.signOut({ scope: 'local' })` forçado no `beforeunload` se "Lembrar-me" estiver desmarcado
- **D-20:** Biblioteca para decode de JWT (D-13) — `jwt-decode` (pequeno, sem crypto verify, adequado porque Supabase-js já valida assinatura) ou base64 split manual (sem dependência nova). Planner decide.
- **D-21:** Layout/UI dos 4 formulários (Login Candidato, Login RH, Esqueci Senha, Redefinir Senha) — Claude's Discretion dentro do design system glass UI Beauty Smile + shadcn/ui. Se divergir significativamente do pattern do cadastro, rodar `/gsd-ui-phase 3` para gerar UI-SPEC.md antes de planejar.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `CLAUDE.md` — arquitetura (React 18 + Vite + TS strict + Supabase Auth), convenções (pt-BR domain, PascalCase.tsx, features/ organization), regras de segurança (NUNCA `supabaseAdmin` client-side, RLS em 100% das tabelas)
- `.planning/PROJECT.md` — core value, milestones, key decisions, evolução
- `.planning/REQUIREMENTS.md` — AUTH-01 a AUTH-04 (ainda pendentes — descrição detalhada pode estar TBD; planner deve inferir do ROADMAP success criteria se REQUIREMENTS.md estiver stub)
- `.planning/ROADMAP.md` §Phase 3 — goal, depends_on [Phase 1], success criteria (3 bullets), UI hint: yes

### Carryover bugs (Phase 1 → Phase 3)
- `.planning/phases/01-foundation-saneada/KNOWN-ISSUES-CARRYOVER-PHASE-3.md` — 6 bugs documentados; Bugs 1/2/3 são IN SCOPE (D-13, D-14), Bug 6 é OUT (D-15). **Leitura obrigatória** — tem evidências JWT decodificado, código fonte referenciado com linha, e fix sugerido.

### Prior phase decisions (padrões a seguir)
- `.planning/phases/02-cadastro-candidato/02-CONTEXT.md` — D-02 (tryAutoLogin), D-05 (error_code taxonomy), D-06 (field routing), D-07 (redação pt-BR), D-12 (Pitfall 7 redaction), D-14 (leave-guard pattern). Serve de template para `authService` e error handling do Phase 3.
- `.planning/phases/02-cadastro-candidato/02-05-SUMMARY.md` — Implementação de `CadastroError` union + `FIELD_TO_STEP_*` + `tryAutoLogin`. **Padrão canônico de auth error handling** — Phase 3 deve espelhar.
- `.planning/phases/02-cadastro-candidato/02-06-SUMMARY.md` — UAT-driven insights: (1) Sonner `resolve.dedupe` + unversioned imports (Phase 3 deve manter `from 'sonner'` em todos os novos arquivos), (2) `.call(supabase, ...)` para métodos do client que dependem de `this.rest`, (3) smoke-teste RPCs em URL hosted, não só local.

### Supabase auth (implementação)
- Supabase docs: `signInWithPassword`, `resetPasswordForEmail`, `updateUser`, `resend({ type: 'signup' })`, `onAuthStateChange` (já em uso no `RootLayout`). Use `mcp__context7__*` tools para docs atualizadas.
- `src/lib/supabase/client.ts` — client anon (único), NUNCA service_role no client-side
- `src/store/authStore.ts:129-136` — `extractRole()` a ser refatorado (D-13)
- `supabase/migrations/*custom_access_token_hook*` — já aplicado em prod; injeta `role` no JWT payload

### Existing auth scaffolding (scout)
- `src/features/auth/{hooks,services,types}/` — scaffolded, vazio/stub; planner popula com novos files
- `src/components/pages/LoginCandidatoPage.tsx` — reescrever
- `src/components/pages/LoginRHPage.tsx` — reescrever (D-14 fix)
- `src/components/pages/EsqueciSenhaPage.tsx` — reescrever
- `src/components/pages/RedefinirSenhaPage.tsx` — reescrever
- `src/features/cadastro/services/authService.ts` — referência/possivelmente mover para `src/features/auth/services/` (planner decide; se mover, preservar API usada pelo cadastro)
- `src/hooks/useSessionTimeout.ts` — **NÃO aplicar ao candidato** (D-07); manter comportamento existente pro RH
- `src/router/routes.tsx` — rotas `/auth/login`, `/auth/login-rh`, `/auth/esqueci-senha`, `/auth/redefinir-senha` já registradas; planner valida/ajusta

### Testing references (Phase 2 patterns)
- `src/features/cadastro/services/__tests__/*.test.ts` — pattern de teste de service com supabase mock
- `e2e/cadastro-flow.spec.ts` — Playwright reference (`Notifications alt+T` region selector, `getByLabel` scoping para evitar strict-mode violation pós-Sonner fix)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`authStore` (Zustand unificado)** — já tem métodos `setSession`, `clearAuth`, `initialize`; só precisa fix do `extractRole`. NÃO criar store paralelo.
- **`supabase.auth.onAuthStateChange` listener** — já montado uma única vez em `RootLayout` (App.tsx:158). Candidato `SIGNED_IN` já dispara `setSession`. Reaproveitar; não duplicar listeners.
- **Sonner Toaster** — montado em App.tsx:192, renderiza corretamente desde o fix Phase 2 Plan 02-06 (`resolve.dedupe: ['sonner']`). Usar `toast.success`, `toast.error`, `toast.info` livremente.
- **Error shape `{ code, message, field? }`** — `cadastroService.ts` e `duplicateCheckService.ts` são canonical; Phase 3 `authService` deve seguir o mesmo molde.
- **`tryAutoLogin(email, password)` helper** — em `cadastroService.ts`; reusar direto para o pós-reset de senha (D-12).
- **Shadcn/ui components** — `Button`, `Input`, `Label`, `Checkbox` (para "Lembrar-me"), `Form` (RHF wrapper). Todos já instalados.
- **React Hook Form + Zod** — todo o Phase 2 usa esse stack; manter em Phase 3.

### Established Patterns
- **Features organization** — `src/features/<domain>/{components,hooks,services,schemas,types}/`. Phase 3 popula `src/features/auth/`.
- **Named exports** — nunca default export para componentes (CLAUDE.md).
- **Enums DB e schema** — snake_case pt-BR; auth enums já em JWT (`role: candidato|rh|administrador`).
- **Query keys TanStack** — hierárquicas; auth state vive no Zustand (não TanStack), então esse pattern não se aplica diretamente.
- **Glass UI Beauty Smile** — Tailwind + shadcn/ui + gradient backgrounds. 4 páginas auth existentes já usam. Manter.
- **Typography Dim4** — zero `font-medium`/`font-bold` em `src/features/cadastro/components/`. **Estender regra para `src/features/auth/components/` e `src/components/pages/{Login,EsqueciSenha,RedefinirSenha}*.tsx`** em Phase 3.
- **Pitfall 7 redaction** — `console.*` NUNCA loga `senha`, `password`, `access_token`, `refresh_token`. Phase 3 `authService` deve seguir a mesma discipline.
- **`--no-verify` em commits** — pattern estabelecido pra Phase 1 carryover lint (ff19c21, dd2fefe, 96e820d, df3f752, 06fa2da, da859d4, 466438b, 8c6df3b, 8393b6b, 9f886ac). Arquivos novos do Phase 3 **devem** passar `tsc --noEmit` cleanly.

### Integration Points
- **Routes existentes** — `/auth/login` (candidato), `/auth/login-rh`, `/auth/esqueci-senha`, `/auth/redefinir-senha`. Confirmar que estão no `routes.tsx` e não precisam ser criadas.
- **RoleGuard** — já redireciona rotas protegidas. Phase 3 NÃO altera RoleGuard, só garante que `role` do JWT chegue corretamente no authStore (fix D-13).
- **DevNavigationMenu** — dev-only (gated por `import.meta.env.DEV`); inclui links para as 4 páginas de auth. Não mexer.
- **Email templates Supabase** — para reset de senha, usar template default do Supabase Dashboard. Customização visual é out of scope; se brand queimar muito, abrir backlog.

</code_context>

<specifics>
## Specific Ideas

- **Mensagem "Reenviar email"** (D-02): copy pt-BR "Reenviar email de confirmação" como link/botão secundário abaixo do erro. Após clicar, toast "Email reenviado — verifique sua caixa de entrada e spam".
- **Countdown de rate limit** (D-03): formato `"Aguarde Xs"` contando em tempo real; quando chega 0, reabilita botão automaticamente.
- **Copy neutra do esqueci-senha** (D-09): *"Se o email estiver cadastrado, enviamos um link de recuperação. Verifique sua caixa de entrada (e spam)."* — idêntica para sucesso e "não encontrado" (indistinguível, previne enumeration).
- **Toast de senha alterada** (D-12): *"Senha alterada com sucesso."* + auto-login silencioso; navega com `replace: true` pra não voltar com back button.
- **Password strength pt-BR msgs** (D-11): reusar Zod msgs do cadastro: *"Mínimo 8 caracteres"*, *"Inclua pelo menos uma letra maiúscula"*, *"Inclua pelo menos um número"*, *"As senhas não coincidem"*.

</specifics>

<deferred>
## Deferred Ideas

- **MFA / 2FA / passkeys** — Phase 5 hardening ou milestone v2.0. Gray area complexa (backup codes, TOTP vs WebAuthn).
- **Social login (Google/LinkedIn)** — backlog M2. Requer configurar providers no Supabase Dashboard + OAuth redirect flow.
- **Bug 6 / AUTH-RPC-01** — migration pra normalizar CPF dentro da RPC `check_candidato_duplicate`. Phase 4 ou 5. Tracked em `KNOWN-ISSUES-CARRYOVER-PHASE-3.md`.
- **Password strength meter visual (zxcvbn)** — UX-plus, custo de dependência (~800KB). Revisitar em Phase 5 se feedback pedir.
- **LGPD re-consent em reset de senha** — só necessário se POLICY_VERSION mudar. Adicionar checagem quando houver v2 da política (backlog).
- **Email de notificação "sua senha foi alterada"** — boa prática de segurança. Requer template no Supabase + trigger. Backlog M2 ou Phase 5 hardening.
- **Returning URL após login** (alternativa ao D-08) — RoleGuard armazenaria `returnTo` e login redirecionaria pra rota pretendida. Útil quando candidato clica em link de vaga `/candidato/candidatura?vagaId=X` deslogado. Phase 4 (candidatura flow) pode reabrir.
- **Session timeout para candidato** — D-07 diz sem timeout. Se compliance/auditoria pedir mais tarde, revisitar (Phase 5 hardening).
- **Telemetria/auditoria de logins** (tabela `auth_audit_log`) — tracking de tentativas, IPs, devices. Phase 5 hardening.
- **Drop do legacy `error` alias** (T-02-03) — Phase 5 ou v2.0, depois de confirmar zero clients em prod usando.

</deferred>

---

*Phase: 03-login-recuperacao-senha*
*Context gathered: 2026-04-24*
