# Phase 2 — Wave 0 SQL Audit Results

**Captured:** 2026-04-20
**Project:** isljnozzlvckrgjjbjwp (prod)
**Operator:** Fernando Costa Neto
**Audit source:** Supabase SQL Editor (direct connection)

---

## Probe 1: `public.autorizacoes` columns

| column_name                    | data_type                | is_nullable | column_default    |
|--------------------------------|--------------------------|-------------|-------------------|
| id                             | uuid                     | NO          | gen_random_uuid() |
| candidato_id                   | uuid                     | NO          | null              |
| autorizacao_uso_dados          | boolean                  | NO          | false             |
| autorizacao_comunicacao        | boolean                  | NO          | false             |
| autorizacao_retencao_curriculo | boolean                  | NO          | false             |
| autorizacao_analise_video      | boolean                  | NO          | false             |
| created_at                     | timestamp with time zone | NO          | now()             |
| updated_at                     | timestamp with time zone | NO          | now()             |

### Analysis

✅ **Present (4 consent flags + audit metadata):** All 4 `autorizacao_*` boolean columns já existem com default `false`, confirmando o design "opt-in granular" decidido na Gray Area 4 (1 obrigatório + 3 opcionais). `candidato_id` FK para `candidatos` está presente. `created_at` cobre o timestamp do aceite.

❌ **Missing — Wave 1 migration MUST add (IF NOT EXISTS):**

- [x] **`policy_version text NOT NULL DEFAULT 'v1.0-2026-04'`** — D-16 da discuss-phase. Rastreia versão da política ativa no momento do aceite. Essencial para re-consent flow se política mudar.
- [x] **`ip_aceite inet NULL`** — IP do candidato no momento do aceite (capturado pela Edge Function via `x-forwarded-for` ou similar, não pelo DB). LGPD audit trail.
- [ ] **`data_aceite timestamptz NOT NULL DEFAULT now()`** — **REDUNDANTE** com `created_at`. `created_at` já é o momento do INSERT (= aceite), não há diferença semântica. **DECISÃO: não adicionar `data_aceite`, usar `created_at`.** Se auditoria pedir nomenclatura explícita no futuro, adicionar como view ou alias.
- [x] **`user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL`** — redundante com `candidato_id → candidatos.user_id`, mas **útil para queries diretas de audit** (evitar JOIN) e para resiliência se `candidatos` row for deletada (SET NULL preserva histórico de aceite). Adicionar.
- [ ] **`user_agent_aceite text NULL`** — NÃO estava no template, mas recomendo adicionar: user-agent string do browser no momento do aceite. Útil para forense LGPD (detectar abuso automatizado). **DECISÃO: adicionar, col opcional.**

### Colunas que Wave 1 vai adicionar (final):

```sql
ALTER TABLE public.autorizacoes
  ADD COLUMN IF NOT EXISTS policy_version text NOT NULL DEFAULT 'v1.0-2026-04',
  ADD COLUMN IF NOT EXISTS ip_aceite inet NULL,
  ADD COLUMN IF NOT EXISTS user_agent_aceite text NULL,
  ADD COLUMN IF NOT EXISTS user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_autorizacoes_user_id ON public.autorizacoes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_autorizacoes_policy_version ON public.autorizacoes(policy_version);
```

---

## Probe 2: `inet_client_addr()` + `request.headers`

- **client_ip:** `2600:1f18:2a66:6e00:971c:cfc4:d814:be86`
- **headers:** `null`

### Analysis

#### `client_ip = 2600:1f18:2a66:6e00:971c:cfc4:d814:be86`

**Isto é um IP IPv6 do AWS `2600:1f18::/32` (US-East region).** Não é o IP do operador (Fernando) nem de nenhum cliente real — é o IP do **proxy interno do Supabase** (PostgREST / Supavisor / pooler) que abriu a conexão com Postgres.

**Implicação:** `inet_client_addr()` **NÃO retorna o IP do usuário final**. Retorna sempre o IP interno do proxy do Supabase. **Rate limit por IP usando `inet_client_addr()` é inútil** — todas as chamadas da aplicação compartilham o mesmo IP interno.

#### `headers = null`

Esperado em SQL Editor direto. O SQL Editor não injeta `request.headers` (feature exclusiva do PostgREST quando chamado via API HTTP).

Em uma chamada real via `supabase.rpc()`, `current_setting('request.headers', true)` retorna um JSON com os headers HTTP originais, incluindo `x-forwarded-for` se o frontend/Supabase proxy propagar. **Precisa ser testado via chamada real** na Wave 2+.

---

## Decisões para Wave 1 — Rate Limit Strategy

### ❌ Rejeitada: rate limit por `inet_client_addr()` apenas

Confirma-se pelo probe que isso bloquearia TODA a aplicação após N calls globais (porque o IP é compartilhado), causando denial-of-service no próprio produto.

### ⚠️ Estratégia híbrida (Plan 02-02 deve incorporar):

1. **Tentar primeiro:** `current_setting('request.headers', true)::json->>'x-forwarded-for'` — retorna o IP real do cliente **se o Supabase proxy propagar** (não garantido; testar em Wave 2).
2. **Fallback seguro:** chave composta `(x_forwarded_for, candidato_id_hint)` onde `candidato_id_hint` = hash do CPF+email sendo testados (previne abuso por quem varia IP mas testa os mesmos candidatos).
3. **Upper bound hard:** limite global por janela (ex: 1000 req/min no total na função) como defesa em profundidade contra DDoS.

### 🚨 Flag para Plan 02-02 (Wave 1):

**Se `x-forwarded-for` retornar `null` em ambiente real de produção** (testar via `supabase.rpc('check_candidato_duplicate', {...})` autenticado ou anônimo), a rate limit por IP fica sem chave discriminante. Nesse caso, alternativas:

- Aceitar rate limit só por `candidato_id_hint` (permite múltiplos IPs, mas limita probe do mesmo candidato)
- Usar serviço externo (Cloudflare Turnstile, hCaptcha) como pré-requisito para chamar a RPC
- Implementar rate limit no layer Edge Function (Deno), onde `Deno.env.get('SUPABASE_FUNCTIONS_REQUEST_IP')` é mais confiável

### 🚨 Flag para Plan 02-03 (Wave 3 E2E):

**Pitfall 5 mitigation agora é REQUIRED, não optional.** Os testes E2E precisam OU:
- Rodar num IP whitelisted (CI/CD ambiente específico), OU
- Pre-popular `rpc_call_log` com rows "gastas" para não baterem no threshold normal durante o test run, OU
- Subir o threshold para > `número_de_checks_que_E2E_faz_numa_rodada` + margem

---

## Redaction Log (threat T-02-00-02)

- `client_ip` não é PII (é IP da infra AWS Supabase, público em documentação).
- `headers = null` — nada a redigir.
- Nenhum token / credencial apareceu nos resultados. Sem redaction necessária.

---

## Status

✅ **Audit complete, Wave 1 migration pode prosseguir.**

**Próximas ações do GSD:**
1. Plan 02-02 (Wave 1) consome este arquivo como input
2. Migration adiciona 4 colunas (policy_version, ip_aceite, user_agent_aceite, user_id) com `IF NOT EXISTS`
3. Rate limit na RPC usa estratégia híbrida (x-forwarded-for com fallback composto)
4. Plan 02-03 (Wave 3) trata E2E pitfall 5 como required

**Resume signal:** `approved — audit results captured`
