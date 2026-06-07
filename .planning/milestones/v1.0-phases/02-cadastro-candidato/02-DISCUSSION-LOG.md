# Phase 2: Cadastro Candidato - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 02-cadastro-candidato
**Areas discussed:** Auto-login + Success UX, Error UX mapping, Duplicate check (RPC + race + timing), Form state + LGPD

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-login + success UX (CAD-06) | Como o client obtém sessão após Edge Function criar o candidato; welcome UX | ✓ |
| Error UX mapping (CAD-03, CAD-07) | Edge Function error → form UI: toast, per-field, banner; roteamento de erro | ✓ |
| Duplicate check: RPC + race + timing | Migrar para RPC SECURITY DEFINER, timing, rate limit | ✓ |
| Form state + LGPD (persistência + audit) | Refresh, leave guard, consent granular, audit trail | ✓ |

**User's choice:** Todas as 4 áreas selecionadas (multi-select).

---

## Auto-login + Success UX

### Q1: Como o client obtém sessão após Edge Function criar o candidato?

| Option | Description | Selected |
|--------|-------------|----------|
| signInWithPassword após success (Recommended) | Client chama signInWithPassword quando Edge Function retorna ok. Simples, usa senha no form, sem mudar contract. | ✓ |
| Edge Function retorna tokens | Retorna access_token+refresh_token; client chama setSession(). Mais seguro (não reenvia senha), exige alterar Edge Function. | |
| Cadastro cria conta, usuário loga manual | Sem auto-login: redireciona para /auth/login com email pré-preenchido. Viola CAD-06. | |

**User's choice:** signInWithPassword após success

### Q2: Se Edge Function der ok mas auto-login falhar, o que fazer?

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect /auth/login com email + toast (Recommended) | "Cadastro concluído. Faça login para continuar." Email pré-preenchido. | |
| Retry automático 1x com backoff 500ms | Tenta signInWithPassword mais uma vez; se falhar, cai no redirect manual. | ✓ |
| Tela de erro dedicada com CTA manual | Mostra "Conta criada, não conseguimos entrar automaticamente" + botão "Ir para login". | |

**User's choice:** Retry automático 1x com backoff 500ms
**Notes:** Combina com fallback do Recommended — se o retry também falhar, cai no redirect para /auth/login com email + toast. Decisão registrada como D-02.

### Q3: Feedback de sucesso quando o candidato aterrissa em /candidato/perfil?

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect direto + toast Sonner (Recommended) | "Cadastro concluído! Bem-vindo(a), {nome}." Consistente com padrão Sonner. | ✓ |
| Modal de boas-vindas na /candidato/perfil | Modal com próximos passos. Educativo mas intrusivo. | |
| Tela intermediária /cadastro/concluido | Página dedicada com CTA "Ver meu perfil". Formal, adiciona 1 rota. | |
| Redirect direto, sem feedback visual | Minimalista, mas user pode ficar na dúvida. | |

**User's choice:** Redirect direto + toast Sonner

### Q4: Feedback visual durante submit da Edge Function?

| Option | Description | Selected |
|--------|-------------|----------|
| Button disabled + inline spinner (Recommended) | Padrão do form atual. "Criando..." + Loader2. Consistente. | ✓ |
| Overlay full-screen com microcopy | Bloqueia a tela com "Criando sua conta..." | |
| Progress bar com etapas fictícias | "Validando... Criando conta..." Teatro. | |

**User's choice:** Button disabled + inline spinner

---

## Error UX mapping

### Q1: Como surfacear erros da Edge Function no formulário?

| Option | Description | Selected |
|--------|-------------|----------|
| Mix: per-field p/ duplicados + toast p/ outros (Recommended) | EMAIL_EXISTS/CPF_EXISTS → erro inline + volta pro Step 1. Genéricos → toast. | ✓ |
| Tudo por toast Sonner | Consistente mas não aponta pro campo. | |
| Banner persistente no topo do form | Mais visível que toast, ocupa espaço fixo. | |
| Modal de erro bloqueante | Invasivo, ruim p/ duplicado. | |

**User's choice:** Mix: per-field p/ duplicados + toast p/ outros

### Q2: Como a Edge Function deve retornar erros?

| Option | Description | Selected |
|--------|-------------|----------|
| Adicionar code estruturado (Recommended) | { ok: false, error_code: 'EMAIL_EXISTS'|'CPF_EXISTS'|'VALIDATION'|'SERVER_ERROR', message, field? }. Robusto. | ✓ |
| Manter string + regex no client | Frágil a mudanças de copy. | |
| Códigos HTTP + body livre | 409/400/500. Atualmente tudo volta 400. | |

**User's choice:** Adicionar code estruturado

### Q3: Se duplicado só pegar no submit final, para onde volta o usuário?

| Option | Description | Selected |
|--------|-------------|----------|
| Volta para Step 1 com erro no campo (Recommended) | Form navega auto para Step 1, marca email/cpf inválido, toast. | ✓ |
| Fica no step atual + CTA 'Voltar para Dados Pessoais' | Inline + botão de volta. Mais cliques. | |
| Reseta form inteiro | User perde tudo. Ruim. | |

**User's choice:** Volta para Step 1 com erro no campo

### Q4: Tom e estilo das mensagens de erro?

| Option | Description | Selected |
|--------|-------------|----------|
| pt-BR cordial sem jargão técnico (Recommended) | Alinhado com PROJECT.md e copy da Edge Function atual. | ✓ |
| + código de referência para suporte | "E-042. Contate suporte@..." Mais rastreável mas ruído. | |
| Técnico/verbose | Repassa mensagem Supabase. Ruim para UX. | |

**User's choice:** pt-BR cordial sem jargão técnico

---

## Duplicate check — RPC + race + timing

### Q1: Assinatura da RPC check_candidato_duplicate?

| Option | Description | Selected |
|--------|-------------|----------|
| check_candidato_duplicate(p_cpf, p_email) → jsonb (Recommended) | Retorna {cpf_exists, email_exists}. 1 call por alteração. | ✓ |
| Funções separadas: check_cpf / check_email | Granular, 2 calls. Mais boilerplate. | |
| Retorno invertido: {available, conflicts[]} | Mais semântico mas difere do esperado. | |

**User's choice:** check_candidato_duplicate(p_cpf, p_email) → jsonb

### Q2: Quando disparar o check durante o preenchimento do form?

| Option | Description | Selected |
|--------|-------------|----------|
| On blur (manter atual) (Recommended) | useDuplicateCheck atual: sair do campo, debounce 300ms. Zero mudança de UX. | ✓ |
| Debounced while typing (500ms) | Feedback imediato, mais calls, mais flash na UI. | |
| Só no clique de "Próximo" | Menos calls, feedback tardio. | |

**User's choice:** On blur (manter atual)

### Q3: Re-checar no submit final antes de chamar a Edge Function?

| Option | Description | Selected |
|--------|-------------|----------|
| Não — trust unique constraint + error UX (Recommended) | Edge Function + unique no banco = verdade. Race tratada por D-06/D-07. | ✓ |
| Sim — re-check antes de submit | +1 RPC call. Fecha race na maioria dos casos. | |
| Só se último check foi há +60s | Híbrido. Cobertura parcial. | |

**User's choice:** Não — trust unique constraint + error UX

### Q4: Rate limiting da RPC?

| Option | Description | Selected |
|--------|-------------|----------|
| Postgres-side rate limit via policies (Recommended) | Policy por IP/auth nos últimos 60s, rejeita após N. Previne enumeration. | ✓ |
| Sem rate limit no MVP | Risk aceito. | |
| Rate limit via Edge wrapper | Contradiz D-01a (RPC direto). | |

**User's choice:** Postgres-side rate limit via policies

---

## Form state + LGPD

### Q1: Persistência do estado multi-step se der refresh?

| Option | Description | Selected |
|--------|-------------|----------|
| sessionStorage (sem senha) (Recommended) | Salva Steps 1-3. Some ao fechar aba. Apaga em sucesso. NUNCA salva senha. | ✓ |
| Apenas memória (status quo RHF) | Refresh zera tudo. | |
| localStorage com TTL 24h | Mais PII em disco. Risco LGPD maior. | |

**User's choice:** sessionStorage (sem senha)

### Q2: Comportamento ao sair no meio do fluxo?

| Option | Description | Selected |
|--------|-------------|----------|
| Warn com beforeunload nativo (Recommended) | window.onbeforeunload prompt padrão. | ✓ |
| Salvar silenciosamente e nav livre | Menos fricção, user pode não perceber o draft. | |
| Sem warn e sem persistência | Minimalista, pior UX. | |

**User's choice:** Warn com beforeunload nativo

### Q3: Checkbox LGPD — como organizar?

| Option | Description | Selected |
|--------|-------------|----------|
| 1 obrigatório + 3 opcionais (Recommended) | uso_dados obrigatório; comunicação/retenção/vídeo opcionais. LGPD Art. 8. | ✓ |
| 1 checkbox geral "Aceito termos" | Menos granular, potencial non-compliance. | |
| 4 obrigatórios | Força consentimento. Não alinha com LGPD. | |

**User's choice:** 1 obrigatório + 3 opcionais

### Q4: LGPD audit trail além de IP + timestamp + flags?

| Option | Description | Selected |
|--------|-------------|----------|
| + policy_version (coluna simples) (Recommended) | Coluna policy_version text. Rastreável sem peso extra. | ✓ |
| Status quo | Já suficiente para MVP. | |
| + hash SHA-256 do texto | Prova criptográfica. Overkill MVP. | |
| + snapshot do texto completo | Auditoria forte, peso redundante. | |

**User's choice:** + policy_version (coluna simples)

---

## Claude's Discretion

Áreas onde o usuário deixou flexibilidade:
- Estrutura interna de `useCadastroDraft` (setTimeout/useEffect, debounce do save)
- Naming exato dos error codes (desde que SCREAMING_SNAKE_CASE consistente)
- Path do field no `VALIDATION` error (nome canônico vs Zod path)
- Implementação do leave guard (beforeunload puro vs `useBlocker`)
- Layout visual dos 4 checkboxes LGPD (accordion vs inline, contanto que o obrigatório se destaque)
- Naming da migration SQL (seguir padrão Supabase CLI)

## Deferred Ideas

Ideias mencionadas que ficaram registradas para fases futuras (ver CONTEXT.md `<deferred>` para lista completa):
- Validação live por campo — Phase 5 (HARD-04/05)
- Modal de confirmação antes do submit — M2 se UAT pedir
- Análise de força de senha / HaveIBeenPwned — Phase 3 hardening de auth
- i18n dos error codes — quando sistema virar multi-language
- Rate limit global por email (além de IP) — próximo round se observar abuse
