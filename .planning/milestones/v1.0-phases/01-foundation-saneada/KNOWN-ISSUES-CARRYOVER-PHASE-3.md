# Phase 1 — Known Issues (Carryover to Phase 3: Login + Recuperação de Senha)

**Data de identificação inicial:** 2026-04-20
**Descoberto em:** Post-Wave-2 manual validation (Custom Access Token Hook + type regen)
**Status:** 6 bugs documentados (Bugs 4 e 5 resolvidos em Phase 2; Bug 6 adicionado 2026-04-21 em Phase 2 Plan 02-03 UAT), **não bloqueantes para fechar Phase 1 ou Phase 2**
**Resolução natural:** Phase 3 reescreve os fluxos de login e trata carryovers do cadastro (conforme roadmap).

---

## Contexto

Após Wave 2 do Phase 1 aplicar a migration do Custom Access Token Hook e o hook ser ativado no Supabase Dashboard, foi realizada validação manual do fluxo completo (login real → JWT inspect → redirect).

**✅ O que está funcionando:**
- Hook `custom_access_token_hook` enriquece JWT com `app_metadata.role` (verificado via jwt.io)
- Migrations 0001-0004 aplicadas em prod via `supabase db push`
- `database.types.ts` regenerado com schema real completo (3218 linhas, 30+ tabelas)
- Login API-level funciona (Supabase autentica, token é emitido)
- RoleGuard redireciona rotas protegidas deslogadas (FOUND-05 atingido)

**🐛 O que NÃO funciona end-to-end:**

---

## Bug 1 — authStore.extractRole() falha para candidato

**Arquivo:** [src/store/authStore.ts:129-136](../../../src/store/authStore.ts#L129)

**Sintoma:**
- Candidato loga com sucesso (JWT emitido com `app_metadata.role = "candidato"`)
- `auth-storage` em localStorage mostra `role: null`
- RoleGuard não redireciona porque `role` nunca é populado
- Usuário fica preso na página de login

**Causa raiz:**
`extractRole()` lê `session.user.app_metadata.role`, mas o Supabase JS SDK popula `session.user.app_metadata` a partir do registro `auth.users` (não do JWT assinado). O hook só injeta no JWT — o registro do usuário não tem a coluna `role` em `raw_app_meta_data`.

**Evidência:**
```
// JWT decodificado em jwt.io (payload):
{
  "app_metadata": {
    "provider": "email",
    "providers": ["email"],
    "role": "candidato"  // ✅ presente no JWT
  },
  ...
}

// session.user.app_metadata em localStorage:
{
  "provider": "email",
  "providers": ["email"]
  // ❌ SEM role
}
```

**Fix proposto (Phase 3):**

Opção A — Decodificar o access_token JWT diretamente:
```ts
import { jwtDecode } from 'jwt-decode'

function extractRole(session: Session | null): Role | null {
  if (!session?.access_token) return null
  try {
    const payload = jwtDecode<{ app_metadata?: { role?: string } }>(
      session.access_token
    )
    const raw = payload.app_metadata?.role
    if (raw === 'candidato' || raw === 'rh' || raw === 'administrador') {
      return raw
    }
  } catch {
    return null
  }
  return null
}
```

Opção B — Sempre chamar `initialize()` após `SIGNED_IN` para triggerar `fetchProfile()` fallback (query DB).

Recomendação: Opção A (mais performática, não depende de RLS e network).

---

## Bug 2 — LoginRHPage forja role "administrador" sem validação robusta

**Arquivo:** [src/components/pages/LoginRHPage.tsx](../../../src/components/pages/LoginRHPage.tsx)

**Sintoma:**
- Usuário candidato (ex: `fernando@beautysmile.com.br`) loga via `/auth/login-rh`
- `auth-storage` em localStorage mostra `role: "administrador"`
- **Usuário NÃO é RH** — JWT tem `app_metadata.role: "candidato"`

**Causa raiz:**
LoginRHPage (código legado pré-unificação) chama `setAdminUser()` do authStore passando algum objeto que satisfaz a heurística `'nome_completo' in adminUser`. O setter assume que quem está chamando já validou e define `role='administrador'` (ou `'rh'`) diretamente.

Sem saber o código exato do LoginRHPage, o padrão é:
1. `supabase.auth.signInWithPassword()` — funciona para qualquer usuário
2. Query em `usuarios_rh` buscando `user_id = session.user.id`
3. **Se retornar qualquer coisa**, chama `setAdminUser(row)` que seta role admin
4. Não há check explícito "se candidato, rejeitar login em /auth/login-rh"

**Falha de segurança:** potencial bypass se a query legacy retornar dados ou se o setter não validar tipos em runtime.

**Fix proposto (Phase 3):**
- Reescrever `LoginRHPage` para NÃO chamar setters legados
- Após `signInWithPassword`, chamar apenas `store.initialize()` (que via hook-aware extractRole + fetchProfile fallback resolve o role corretamente)
- Se `role === 'candidato'` após initialize, exibir erro "Esta área é exclusiva para recrutadores" e dar logout
- Redirect para `/rh/dashboard` apenas se `role === 'rh' || role === 'administrador'`

---

## Bug 3 — useVagas() query usa campo `ativa` inexistente

**Arquivo:** [src/features/vagas/hooks/useVagas.ts](../../../src/features/vagas/hooks/useVagas.ts) (inferido)

**Sintoma:**
```
HEAD https://isljnozzlvckrgjjbjwp.supabase.co/rest/v1/vagas?select=*&ativa=eq.true 400 (Bad Request)
```

**Causa raiz:**
Hook faz query com `.eq('ativa', true)`. Coluna `ativa` não existe no schema real — deveria ser `.eq('status', 'ativa')` (enum `status_vaga`).

Já estava documentado em `.planning/codebase/CONCERNS.md` seção 1.1 como padrão recorrente de bugs pré-existentes.

**Fix proposto:** Phase 4 (Vagas + Candidatura — 01-04 do M1) já aborda. Não é novo bug, é contexto.

---

## Bug 4 — Edge Function cadastrar-candidato retorna 401 (deploy sem --no-verify-jwt) [PHASE 2 SCOPE]

**Arquivo:** deploy config (não no repo — é parâmetro do `supabase functions deploy`)

**Descoberto em:** UAT Test 9 (2026-04-20)

**Sintoma:**
- POST /functions/v1/cadastrar-candidato → 401 Unauthorized no gateway
- Cadastro end-to-end quebra mesmo com função bem codificada e deployada

**Causa raiz:**
Comando `supabase functions deploy cadastrar-candidato` rodou sem a flag `--no-verify-jwt`. Por padrão Supabase exige JWT válido no header Authorization; cadastro é fluxo anônimo por definição (usuário ainda não existe), então nenhum JWT pode ser enviado.

**Fix proposto (Phase 2):**
```bash
npx supabase functions deploy cadastrar-candidato \
  --no-verify-jwt \
  --project-ref isljnozzlvckrgjjbjwp
```
Validação continua enforced pelo Zod schema dentro da função + service_role server-side. Adicionar a flag à runbook de deploy da Phase 2 (CAD-DEPLOY-01 no 01-UAT.md Gaps).

---

## Bug 5 — @supabase/supabase-js v2.48.1 incompatível com sb_publishable_ anon key [PHASE 2 SCOPE]

**Arquivo:** [package.json](../../../package.json) + [src/features/cadastro/services/duplicateCheckService.ts](../../../src/features/cadastro/services/duplicateCheckService.ts)

**Descoberto em:** UAT Test 9 (2026-04-20) — também bloqueia UAT Test 10

**Sintoma:**
```
TypeError: Cannot read properties of undefined (reading 'rest')
   at supabase.rpc (duplicateCheckService.ts:144)
```
Erro acontece ANTES de qualquer network request — cliente SDK falha ao construir a URL do RPC.

**Causa raiz:**
Supabase rolled out new anon key format `sb_publishable_...` em late 2025 / early 2026. @supabase/supabase-js v2.48.1 não parseia corretamente esse formato para todos os clients (rpc, functions). Resultado: o objeto `rest` sub-client fica `undefined`.

Afeta tanto `supabase.rpc(...)` (duplicateCheckService) quanto potencialmente `supabase.functions.invoke(...)` (cadastroService).

**Fix proposto (Phase 2):**
```bash
npm install @supabase/supabase-js@latest
# Expect: >= 2.50.x which handles sb_publishable_ format
npm run lint
npm run build
# Spot-test: supabase.rpc('check_candidato_duplicate') + functions.invoke('cadastrar-candidato')
```

Fix adicionais que o upgrade pode destravar:
- Remover o cast `as unknown as ...` em duplicateCheckService.ts (ficou como workaround até db:types regenerar — Plan 04)

---

## Bug 6 — RPC `check_candidato_duplicate` sempre retorna cpf_exists=false [PHASE 3 SCOPE]

**Arquivo:** migration que criou/patchou a RPC — ver `supabase/migrations/0004_*.sql` (criação, Plan 01-04 FOUND-10) + `supabase/migrations/0005_*.sql` (patch rate_limit, Plan 02-02)

**Descoberto em:** Plan 02-03 live UAT (2026-04-21) — side-effect da fix de schema alignment em commit `9547d65`.

**Sintoma:**
- `useDuplicateCheck` para o campo CPF no formulário de cadastro sempre reporta "CPF disponível" (sem feedback pre-submit ao usuário), mesmo para CPFs que já existem no DB.
- `supabase.rpc('check_candidato_duplicate', { p_cpf: '12345678900', p_email: '...' })` retorna `cpf_exists: false` para qualquer CPF já cadastrado.

**Causa raiz:**
Plan 02-03 (commit `9547d65`) corrigiu um schema-mismatch na Edge Function: a tabela `candidatos` tem CHECK constraint exigindo CPF no formato `XXX.XXX.XXX-XX`, mas o cliente enviava digits-only (`cleanCPF()`). A EF passou a formatar no write-boundary para satisfazer a constraint.

Consequência não prevista: a RPC `check_candidato_duplicate` compara o `p_cpf` recebido (digits-only do cliente) contra `candidatos.cpf` (agora sempre formatado no DB). `'12345678900' = '123.456.789-00'` é sempre false → `cpf_exists` sempre false.

Email não é afetado — EF não formata email.

**Safety net atual:**
1. Constraint UNIQUE em `candidatos.cpf` dispara em INSERT-time.
2. A branch de unique-violation em `cadastrar-candidato/index.ts` faz `raw.toLowerCase().includes('cpf')` → emite `errorResponse('CPF_EXISTS', 'Este CPF já está cadastrado.', 'cpf')`.
3. Usuário ainda recebe um erro correto de form-level (via `cadastroService` routing para `CadastroError { code: 'CPF_EXISTS', field: 'cpf' }`), só não recebe o feedback em debounce-time como acontece com email.

**Fix proposto (Phase 3 — migration nova 0006 ou equivalente):**
Normalizar CPF dentro da RPC antes da comparação. Tanto o `p_cpf` de entrada quanto o valor da coluna devem ter formatação removida para comparação:

```sql
CREATE OR REPLACE FUNCTION public.check_candidato_duplicate(
  p_cpf text,
  p_email text,
  p_client_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf_clean text := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');
  v_email_lower text := lower(trim(COALESCE(p_email, '')));
  -- ... rate_limit logic preservada ...
BEGIN
  RETURN jsonb_build_object(
    'cpf_exists', EXISTS(
      SELECT 1 FROM public.candidatos
      WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = v_cpf_clean
    ),
    'email_exists', EXISTS(
      SELECT 1 FROM public.candidatos
      WHERE lower(email) = v_email_lower
    ),
    'rate_limited', false
  );
END;
$$;
```

Alternativa mais performática: criar um índice funcional em `regexp_replace(cpf, '[^0-9]', '', 'g')` para que o EXISTS escaneie via índice. Detalhamento fica para o plano de Phase 3 quando a migration for escrita.

**Adicionar ao plano de Phase 3:**
- "AUTH-RPC-01 — Migration para normalizar CPF dentro de check_candidato_duplicate (digits-only compare on both sides)"

**Referências:**
- Plan 02-03 SUMMARY: `.planning/phases/02-cadastro-candidato/02-03-SUMMARY.md` — seção "Known Issues / Carryovers Created by This Plan"
- Commit `9547d65`: `fix(02-03): align Edge Function inserts with actual candidatos/disponibilidade/autorizacoes schema`
- Migration 0004 (RPC original, pré-formatação): `supabase/migrations/0004_*.sql`
- Migration 0005 (RPC + rate_limit patch): `supabase/migrations/0005_*.sql`

---

## Impacto em Acceptance Criteria do Phase 1

| Critério FOUND-* | Status |
|---|---|
| FOUND-01: service_role removido | ✅ |
| FOUND-02: Auth unificado em 1 store | ✅ (estrutura), ⚠️ (extractRole quebrado) |
| FOUND-03: Role via JWT | ✅ (hook emite), ❌ (frontend não lê) |
| FOUND-04: RoleGuard | ✅ |
| FOUND-05: Redirect com `?redirect=` | ✅ |
| FOUND-06: Logout multi-tab | ✅ |
| FOUND-07: db:types automático | ✅ |
| FOUND-08: Husky pre-commit | ✅ |
| FOUND-09: Migrations consolidadas | ✅ |
| FOUND-10: RLS anon → RPC | ✅ |
| FOUND-11: Remember-me nativo | ✅ |
| FOUND-12: adminAuthStore deletado | ✅ (shim) |

**10/12 critérios ✅, 2/12 parciais** (FOUND-02, FOUND-03 — bugs 1 e 2 acima).

---

## Plano de Ação

1. **Agora:** Phase 1 estruturalmente fechada. UAT rodou (7/11 pass, 3 issues, 1 blocked) — ver `01-UAT.md`.
2. **Phase 2 (Cadastro):** tratar Bugs 4 e 5 primeiro (unblock do fluxo de cadastro), então implementar funcionalidades Phase 2:
   - Adicionar ao PLAN.md da Phase 2: "CAD-DEPLOY-01 — Redeploy Edge Function com `--no-verify-jwt`"
   - Adicionar ao PLAN.md da Phase 2: "CAD-DEPS-01 — Upgrade @supabase/supabase-js para >= 2.50.x (suporte sb_publishable_)"
   - Bug 2 (LoginRH forge) não bloqueia Phase 2 (cadastro usa signUp via Edge Function, não login).
3. **Phase 3 (Login + Recuperação):** tratar Bugs 1, 2 e 6 + AUTH-TABS via requirements explícitos:
   - Adicionar ao PLAN.md da Phase 3: "AUTH-JWT-01 — Substituir `extractRole` por decodificação direta do JWT (jwt-decode)"
   - Adicionar ao PLAN.md da Phase 3: "AUTH-JWT-02 — Quando JWT tem role claim, ele é autoritativo (DB fallback só quando claim ausente)"
   - Adicionar ao PLAN.md da Phase 3: "AUTH-LOGIN-01/02 — Rejeitar login quando JWT role diverge do formulário usado (LoginCandidato ↔ LoginRH)"
   - Adicionar ao PLAN.md da Phase 3: "AUTH-TABS-01/02 — Coexistência multi-tab + cross-tab logout via BroadcastChannel"
   - Adicionar ao PLAN.md da Phase 3: "AUTH-RPC-01 — Migration para normalizar CPF dentro de `check_candidato_duplicate` (digits-only compare on both sides; Bug 6)"
4. **Phase 4 (Vagas + Candidatura):** já aborda Bug 3 naturalmente.

---

## Referências

- Wave 2 Plan 01-03 summary: `.planning/phases/01-foundation-saneada/01-03-SUMMARY.md`
- Wave 2 Plan 01-04 summary: `.planning/phases/01-foundation-saneada/01-04-SUMMARY.md`
- Concerns original (brownfield): `.planning/codebase/CONCERNS.md` §1.1
- PRD-Mestre: `docs/prds/PRD-MASTER-sistema-recrutamento.md` §4.2 (RF-08..RF-12)

---

*Documento gerado após validação manual do checkpoint pós-Wave-2 — 2026-04-20.*
