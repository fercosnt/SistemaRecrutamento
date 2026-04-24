# Phase 3: Login + Recuperação de Senha — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `03-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 03-login-recuperacao-senha
**Areas discussed:** Mensagens de erro no login, "Lembrar-me" default + storage strategy, Fluxo de recuperação de senha — UX, Escopo dos carryover bugs

---

## Area 1 — Mensagens de erro no login

### Q1.1 — Como tratar credenciais inválidas (email não existe OU senha errada)?

| Option | Description | Selected |
|--------|-------------|----------|
| Genérica "Email ou senha inválidos" | Mensagem única para ambos os casos. Previne user enumeration. Padrão Supabase e de bancos/gov. Mais seguro, menos amigável. | ✓ |
| Específica por tipo | "Email não cadastrado" vs "Senha incorreta". UX melhor, mas permite enumeração. Requer chamada extra RPC. | |
| Híbrida — genérica + "Esqueceu?" proeminente | Genérica + link "Esqueci minha senha" e "Criar conta" bem visíveis. | |

**User's choice:** Genérica "Email ou senha inválidos"
**Notes:** Alinhado com princípio de segurança do projeto (mesmo critério do duplicate check de CPF/email no cadastro — previne enumeration).

### Q1.2 — Erro de "Email não confirmado" — o que mostrar?

| Option | Description | Selected |
|--------|-------------|----------|
| Mensagem + botão "Reenviar email de confirmação" | Detecta `email_not_confirmed` do Supabase, mostra mensagem clara + CTA `supabase.auth.resend()`. | ✓ |
| Só mensagem (sem reenviar) | "Confirme seu email antes de fazer login." Sem CTA. | |
| Tratar como "credenciais inválidas" | Esconde o fato de que email está cadastrado mas não confirmado. Máxima segurança. | |

**User's choice:** Mensagem + botão "Reenviar email de confirmação"

### Q1.3 — Rate limit (Supabase bloqueia após X tentativas) — UX?

| Option | Description | Selected |
|--------|-------------|----------|
| Mensagem + timer de cooldown | "Muitas tentativas. Tente novamente em Xs." Countdown visual, botão disable até zerar. | ✓ |
| Mensagem sem timer | "Muitas tentativas. Aguarde alguns minutos." | |
| Silencioso (trata como erro genérico) | Não revela rate limit explicitamente. | |

**User's choice:** Mensagem + timer de cooldown

### Q1.4 — Erro de rede / servidor indisponível — o que mostrar?

| Option | Description | Selected |
|--------|-------------|----------|
| Mensagem dedicada + "Tentar novamente" | "Erro de conexão. Verifique sua internet." + botão retry. Pattern do `duplicateCheckService` (code: NETWORK_ERROR). | ✓ |
| Trata como erro genérico | Mesma mensagem que "credenciais inválidas". Confunde usuário. | |

**User's choice:** Mensagem dedicada + "Tentar novamente"
**Notes:** Mantém consistência com taxonomy Phase 2 (`code: 'NETWORK_ERROR'`).

---

## Area 2 — "Lembrar-me" — default + storage strategy

### Q2.1 — Checkbox "Lembrar-me" — estado padrão?

| Option | Description | Selected |
|--------|-------------|----------|
| Marcado por padrão | UX amigável, padrão de apps modernos (GitHub, Figma). | ✓ |
| Desmarcado por padrão | Mais privado, requer opt-in explícito. | |

**User's choice:** Marcado por padrão

### Q2.2 — Se "Lembrar-me" DESMARCADO — quanto dura a sessão?

| Option | Description | Selected |
|--------|-------------|----------|
| Morre ao fechar a aba (sessionStorage) | Troca storage do supabase-js pra `sessionStorage`. Fechar aba = logout forçado. | ✓ |
| Dura só o tempo do access token (~1h) | Mantém em localStorage mas disable refresh token. | |
| Morre em 30min de inatividade (como RH) | Reusa `useSessionTimeout` hook existente. | |

**User's choice:** Morre ao fechar a aba (sessionStorage)
**Notes:** Comportamento clássico de "não lembrar". Estratégia técnica fica Claude's Discretion (D-19 em CONTEXT.md).

### Q2.3 — Candidato logado com "Lembrar-me" marcado — tem timeout?

| Option | Description | Selected |
|--------|-------------|----------|
| Sem timeout — sessão indefinida | Candidatos ficam logados indefinidamente (refresh tokens renovam). Igual GitHub, LinkedIn. | ✓ |
| Timeout longo (7-30 dias sem acesso) | Expira após X dias sem atividade. Requer custom logic. | |
| Usa mesmo timeout do RH (30min inatividade) | Aplicar `useSessionTimeout` também pra candidatos. | |

**User's choice:** Sem timeout — sessão indefinida

### Q2.4 — Após login bem-sucedido — para onde redirecionar candidato?

| Option | Description | Selected |
|--------|-------------|----------|
| Sempre `/candidato/perfil` (padrão do cadastro) | Igual cadastro: após auto-login vai pra `/candidato/perfil`. Consistente. | ✓ |
| Pra rota pretendida (se veio de route guard) ou `/candidato/perfil` | Se RoleGuard redirecionou de rota protegida, volta pra lá. Requer `returnTo` state. | |
| `/candidato/vagas` (lista de vagas) | Leva direto pra ação. | |

**User's choice:** Sempre `/candidato/perfil` (padrão do cadastro)
**Notes:** `returnTo` fica como deferred idea — Phase 4 (candidatura flow) pode reabrir.

---

## Area 3 — Fluxo de recuperação de senha — UX

### Q3.1 — Página "Esqueci senha" — feedback após submit?

| Option | Description | Selected |
|--------|-------------|----------|
| Mensagem neutra "Se o email estiver cadastrado, enviamos link" | Não confirma se email existe (previne enumeração). Sempre mostra sucesso. | ✓ |
| Confirma explicitamente "Email enviado para X" | Confirma envio. Revela existência — vaza info. | |

**User's choice:** Mensagem neutra
**Notes:** Consistência com D-01 (credenciais genéricas).

### Q3.2 — Página de redefinição — campos?

| Option | Description | Selected |
|--------|-------------|----------|
| Nova senha + Confirmar nova senha (mesmo pattern do cadastro) | 2 campos. Pattern existe em DadosPessoaisStep. | ✓ |
| Só nova senha (com eye-toggle) | 1 campo com toggle visível/invisível. Mais simples, mais erro. | |

**User's choice:** Nova senha + Confirmar nova senha

### Q3.3 — Password strength feedback durante redefinição?

| Option | Description | Selected |
|--------|-------------|----------|
| Validação Zod silenciosa + mensagem de erro ao submit | Mesmo regex do cadastro. Erro só no submit. | ✓ |
| Checklist visual em tempo real | Feedback durante digitação. UX melhor, componente novo. | |
| Barra de strength (Fraca/Média/Forte) | Score visual (zxcvbn). Dependência + complexidade. | |

**User's choice:** Validação Zod silenciosa
**Notes:** zxcvbn fica deferred (feedback UX depois). Mesmo pattern do cadastro = zero custo de consistência.

### Q3.4 — Após redefinir senha com sucesso — o que acontece?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-login + toast "Senha alterada" + navegar `/candidato/perfil` | Reusa pattern `tryAutoLogin` do Phase 2. | ✓ |
| Redirect pra `/auth/login` com toast | Força novo login com nova senha. Mais conservador. | |
| Redirect + email de notificação "Sua senha foi alterada" | Email de segurança. Requer template Supabase. | |

**User's choice:** Auto-login + toast + navegar
**Notes:** Email de notificação fica deferred (boa prática de segurança — revisitar Phase 5 hardening).

---

## Area 4 — Escopo dos carryover bugs

### Q4.1 — Bug 1 (AUTH-JWT-01) — extractRole lê JWT payload ao invés de app_metadata. Incluir em Phase 3?

| Option | Description | Selected |
|--------|-------------|----------|
| Sim — fix é pré-requisito pra candidato logar | Sem esse fix, `role` fica null → RoleGuard trava em `/auth/login`. Bloqueia success criterion 1. | ✓ |
| Não — tratar separadamente | Adiar. Mas bloqueia o success criterion 1. | |

**User's choice:** Sim — fix é pré-requisito
**Notes:** Bloqueante crítico.

### Q4.2 — Bug 2/3 (AUTH-LOGIN-01/02) — LoginRHPage forja role "administrador". Incluir?

| Option | Description | Selected |
|--------|-------------|----------|
| Sim — reescrever LoginRH com mesmo fluxo canonical | `signInWithPassword` + verifica role do JWT (via fix Bug 1). Remove setters legados. | ✓ |
| Sim mas escopo mínimo | Só validação JWT, sem reescrever UX. | |
| Não — phase só candidato, RH Phase 5 | ROADMAP fala "candidato" apenas. Phase 5 (hardening) cuida. | |

**User's choice:** Sim — reescrever LoginRH com mesmo fluxo canonical
**Notes:** Pareado com Bug 1, mesma camada de auth. Superfície pequena porque só muda autenticação, não layout.

### Q4.3 — Bug 6 (AUTH-RPC-01) — check_candidato_duplicate cpf_exists false. Incluir?

| Option | Description | Selected |
|--------|-------------|----------|
| Não — out of Phase 3 scope (não é auth) | É cadastro-facing bug. UNIQUE + error-match safety net. Phase 4 ou 5. | ✓ |
| Sim — piggyback com outras migrations de auth | Se Phase 3 rodar migration, corrige Bug 6 junto. | |

**User's choice:** Não — out of Phase 3 scope
**Notes:** Continuará tracked em `KNOWN-ISSUES-CARRYOVER-PHASE-3.md` (renomeável futuramente se re-scoped para Phase 4/5).

### Q4.4 — LGPD / policy_version em redefinição de senha?

| Option | Description | Selected |
|--------|-------------|----------|
| Não reapresentar consentimento — já aceito no cadastro | Usuário já consentiu com POLICY_VERSION atual. Reset não muda consentimento. | ✓ |
| Reapresentar + armazenar novo consentimento | Se POLICY_VERSION mudou, pede re-consent. Requer lógica extra. | |

**User's choice:** Não reapresentar
**Notes:** Futura versão v2 da política pode reabrir (deferred).

---

## Claude's Discretion

Áreas em que Claude decide durante planning/implementation:

- **D-19** — Estratégia técnica de swap entre `localStorage`/`sessionStorage` (3 opções abertas: recriar client, storage wrapper, forçar signOut em beforeunload).
- **D-20** — Biblioteca de JWT decode (`jwt-decode` vs base64 split manual).
- **D-21** — Layout/UI dos 4 formulários (Login Candidato, Login RH, Esqueci Senha, Redefinir Senha) dentro do design system Beauty Smile + shadcn/ui. Se divergir significativamente do cadastro, rodar `/gsd-ui-phase 3` antes de planejar.

---

## Deferred Ideas

Ideias que surgiram durante a discussão mas pertencem a outras phases:

- **MFA / 2FA / passkeys** → Phase 5 hardening ou milestone v2.0
- **Social login (Google/LinkedIn/GitHub OAuth)** → backlog M2
- **Password strength meter visual (zxcvbn)** → Phase 5 se feedback pedir
- **LGPD re-consent em reset de senha** → só se POLICY_VERSION mudar
- **Email de notificação "sua senha foi alterada"** → Phase 5 hardening
- **Returning URL após login (`returnTo` state)** → Phase 4 (candidatura flow) pode reabrir
- **Session timeout para candidato** → Phase 5 se compliance pedir
- **Telemetria/auditoria de logins** → Phase 5 hardening
- **Drop do legacy `error` alias (T-02-03)** → Phase 5 ou v2.0
- **Bug 6 / AUTH-RPC-01** → Phase 4 ou 5 (tracked em KNOWN-ISSUES-CARRYOVER-PHASE-3.md)
