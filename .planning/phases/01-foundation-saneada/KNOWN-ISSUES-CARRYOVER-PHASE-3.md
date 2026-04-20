# Phase 1 — Known Issues (Carryover to Phase 3: Login + Recuperação de Senha)

**Data de identificação:** 2026-04-20
**Descoberto em:** Post-Wave-2 manual validation (Custom Access Token Hook + type regen)
**Status:** 3 bugs documentados, **não bloqueantes para fechar Phase 1**
**Resolução natural:** Phase 3 reescreve os fluxos de login (conforme roadmap).

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
3. **Phase 3 (Login + Recuperação):** tratar Bugs 1 e 2 + AUTH-TABS via requirements explícitos:
   - Adicionar ao PLAN.md da Phase 3: "AUTH-JWT-01 — Substituir `extractRole` por decodificação direta do JWT (jwt-decode)"
   - Adicionar ao PLAN.md da Phase 3: "AUTH-JWT-02 — Quando JWT tem role claim, ele é autoritativo (DB fallback só quando claim ausente)"
   - Adicionar ao PLAN.md da Phase 3: "AUTH-LOGIN-01/02 — Rejeitar login quando JWT role diverge do formulário usado (LoginCandidato ↔ LoginRH)"
   - Adicionar ao PLAN.md da Phase 3: "AUTH-TABS-01/02 — Coexistência multi-tab + cross-tab logout via BroadcastChannel"
4. **Phase 4 (Vagas + Candidatura):** já aborda Bug 3 naturalmente.

---

## Referências

- Wave 2 Plan 01-03 summary: `.planning/phases/01-foundation-saneada/01-03-SUMMARY.md`
- Wave 2 Plan 01-04 summary: `.planning/phases/01-foundation-saneada/01-04-SUMMARY.md`
- Concerns original (brownfield): `.planning/codebase/CONCERNS.md` §1.1
- PRD-Mestre: `docs/prds/PRD-MASTER-sistema-recrutamento.md` §4.2 (RF-08..RF-12)

---

*Documento gerado após validação manual do checkpoint pós-Wave-2 — 2026-04-20.*
