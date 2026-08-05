# Phase 45: Motor de Exclusão & Anonimização — Pattern Map

**Mapped:** 2026-08-04
**Files analyzed:** 22 (novos ou modificados)
**Analogs found:** 19 / 22 exatos-ou-role-match · **3 sem analog** (todos no mesmo lugar: a Storage Admin API)

> Este documento responde UMA pergunta: **de onde cada arquivo novo copia o padrão?**
> Ele não decide arquitetura (isso é a `45-RESEARCH.md`) e não decide copy (isso é a `45-UI-SPEC.md`).
> Onde a pesquisa já nomeou um molde, este mapa **verificou o arquivo vivo e extraiu o trecho**.

---

## File Classification

Lista derivada de `45-CONTEXT.md §Decisions`, `45-RESEARCH.md §Recommended Project Structure` e
`45-UI-SPEC.md §Escopo`.

### Migrations (`supabase/migrations/`)

| Novo arquivo | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `p45_janela_config.sql` | migration / config-table | batch (seed) | `20260804000001_p44_config_sla_dados.sql` | **exact** |
| `p45_pedido_exclusao.sql` | migration / schema aditivo + CHECK | CRUD | `20260804000002_p44_solicitacoes_dados.sql` | **exact** |
| `p45_sever_user_id.sql` | migration / **DDL destrutiva sobre tabela viva** | schema | **nenhum** — ver §No Analog Found | **none** |
| `p45_plano_e_dry_run.sql` | migration / RPC DEFINER read-only | request-response | `20260801000004_p43_previa_retencao.sql:174-320` | **exact** |
| `p45_anonimizar_candidato.sql` | migration / RPC DEFINER **de escrita** com `p_dry_run` | transform (uma transação) | `20260801000004` (forma) + `20260803000001` (auto-verificação) | role-match |
| `p45_bias_k5.sql` | migration / `CREATE OR REPLACE` corretiva | transform | `20260803000001_p43_fix_listar_matriz_cast.sql` | **exact** |
| `p45_evento_notificacao.sql` | migration / ALTER CHECK de vocabulário | schema | `20260804000002` (§CHECK `causa`/`tipo`) | role-match |
| `p45_encerrada_a_pedido.sql` (D-45-13) | migration / ADD COLUMN aditiva | schema | `20260804000001` §2 (ADD COLUMN + COMMENT, **sem `IF NOT EXISTS`**) | role-match |

### Smoke (`supabase/tests/`)

| Novo arquivo | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `p45_motor_exclusao_smoke.sql` | test / espec executável gate-GUC | batch | `supabase/tests/p43_previa_smoke.sql` | **exact** |

### Edge Functions (`supabase/functions/`)

| Novo/modificado | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `executar-direito-titular/index.ts` | EF privilegiada | request-response + orquestração cross-sistema | `exportar-meus-dados/index.ts` (que é clone de `get-curriculo-url`) | **exact** para o esqueleto · **none** para os passos Storage/Auth |
| `executar-direito-titular/helpers.ts` | helpers puros de e-mail/log | transform | `notificar-rh/helpers.ts` | **exact** |
| `executar-direito-titular/index.test.ts` | test | — | `get-curriculo-url/index.test.ts` · `gerenciar-usuario-rh/__tests__/index.test.ts` | **exact** |
| `notificar-rh/helpers.ts` (+1 evento) | helpers | transform | ele mesmo (edição in-place) | **exact** |
| `_shared/reciboExclusao.ts` | artefato **gerado** (espelho) | build-time | `_shared/exportAllowlist.ts` | **exact** |

### Gerador / compliance (`docs/compliance/`)

| Novo arquivo | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `sql/gen-recibo-exclusao.cjs` | build script + `--check` | file-I/O | `sql/gen-export-allowlist.cjs` | **exact** |
| `recibo-exclusao.json` | artefato gerado | file-I/O | `export-allowlist.json` | **exact** |
| `__tests__/genReciboExclusao.test.ts` | test | — | `docs/compliance/__tests__/genExportAllowlist.test.ts` | **exact** |

### Frontend (`src/features/`)

| Novo/modificado | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `privacidade/components/ExcluirDadosBloco.tsx` | component (seção 4) | request-response | `privacidade/components/PedirCopiaBloco.tsx` | **exact** |
| `privacidade/components/ConfirmarExclusaoDialog.tsx` | component (confirmação aninhada) | — | `admin/retencao/components/EditarJanelaDialog.tsx` | **exact** |
| `privacidade/components/ReciboExclusao.tsx` | component (apresentação derivada) | — | `PedirCopiaBloco` (container) + `_shared` artefato como fonte | role-match |
| `privacidade/services/exclusaoService.ts` | service + `ExclusaoError` | request-response | `privacidade/services/exportacaoService.ts` | **exact** |
| `privacidade/hooks/usePedidoExclusao.ts` | hook (leitura own-row) | CRUD | `privacidade/hooks/useUltimoPedidoDados.ts` | **exact** |
| `privacidade/hooks/useJanelaExclusao.ts` | hook (config) | CRUD | `pedidos-dados/hooks/useConfigSlaDados.ts` | **exact** |
| `privacidade/hooks/usePedirExclusao.ts` / `useCancelarExclusao.ts` | hook (mutation) | request-response | `privacidade/hooks/useExportarMeusDados.ts` | **exact** |
| `vagas/components/RetirarCandidaturaAcao.tsx` | component (ação no card) | request-response | `EditarJanelaDialog` (estrutura) + `DashboardCandidatoPage.tsx:283-426` (o card hospedeiro) | role-match |
| `privacidade/components/PrivacidadeCandidatoPage.tsx` (+seção 4) | page (edição) | — | ele mesmo, linhas 266-270 | **exact** |
| `privacidade/components/GuardaCurriculoBloco.tsx` (Emenda B, 1 string) | component (edição) | — | ele mesmo | **exact** |

---

## Pattern Assignments

### 1 · `p45_janela_config.sql` (migration, config singleton)

**Analog:** `supabase/migrations/20260804000001_p44_config_sla_dados.sql`

Cabeçalho obrigatório — os cinco blocos (`117-124` para o corpo, `1-105` para o cabeçalho):
escopo negativo em uma linha, protocolo de apply por MCP, **reparo do ledger**, conferência
`md5(statements[1])`, proveniência do molde.

**Tabela singleton + RLS + policy única de leitura** (`117-137`):

```sql
CREATE TABLE public.config_sla_dados (
  chave         text        PRIMARY KEY,
  dias_atencao  integer     NOT NULL CHECK (dias_atencao > 0),
  dias_atraso   integer     NOT NULL CHECK (dias_atraso > 0),
  descricao     text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_config_sla_dados_ordem CHECK (dias_atraso > dias_atencao)
);

ALTER TABLE public.config_sla_dados ENABLE ROW LEVEL SECURITY;

CREATE POLICY config_sla_dados_rh_read ON public.config_sla_dados
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
```

⚠ **Desvio obrigatório de RLS, e ele é o ponto.** No molde a policy é **RH-only**. A janela de
15 dias da Phase 45 é lida pelo **titular** (`{n}` da UI-SPEC vem do servidor). Logo esta tabela
precisa de policy de leitura para `authenticated` own-scope ou pública-de-leitura — o precedente
para leitura pelo candidato é `config_sla_etapa` (P37), **que o próprio molde manda não copiar
para a tabela do RH**. O plano tem de declarar qual das duas RLS herda, e por quê; herdar por
reflexo a do `config_sla_dados` deixa o `{n}` ilegível ao titular e a UI cai no fallback ("data
alvo sem contagem de dias").

**Seed idempotente** (`179-186`) — `ON CONFLICT DO NOTHING`, **jamais upsert**:

```sql
INSERT INTO public.config_sla_dados (chave, dias_atencao, dias_atraso, descricao)
VALUES ('acesso_dados', 7, 12, '...')
ON CONFLICT (chave) DO NOTHING;
```

**Trigger de carimbo — trabalho HERDADO** (`202-204`), não redefinir a função:

```sql
CREATE TRIGGER trg_config_sla_dados_atualizado_em
  BEFORE UPDATE ON public.config_sla_dados
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();
```

O COMMENT de `config_sla_dados.chave` (`153-155`) **já antecipa esta fase**:
*"A Phase 45 pode acrescentar uma chave propria para pedidos de exclusao sem tocar nesta linha."*
Se o plano optar por chave nova em `config_sla_dados` em vez de tabela nova, é este COMMENT que o
autoriza — mas note que ele foi escrito para uma tabela **RH-only**.

---

### 2 · `p45_pedido_exclusao.sql` (migration, colunas aditivas + CHECK)

**Analog:** `supabase/migrations/20260804000002_p44_solicitacoes_dados.sql`

**A tabela alvo, viva** (`90-110`) — é ela que ganha as 7 colunas do Pattern 1 da pesquisa:

```sql
CREATE TABLE public.solicitacoes_dados (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id  uuid        NOT NULL,
  tipo          text        NOT NULL DEFAULT 'acesso',
  situacao      text        NOT NULL DEFAULT 'pendente',
  causa         text,
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  atendido_em   timestamptz,
  CONSTRAINT fk_solicitacoes_dados_candidato
    FOREIGN KEY (candidato_id) REFERENCES public.candidatos(id),
  CONSTRAINT ck_solicitacoes_dados_tipo     CHECK (tipo IN ('acesso', 'exclusao')),
  CONSTRAINT ck_solicitacoes_dados_situacao CHECK (situacao IN ('atendido', 'pendente')),
  CONSTRAINT ck_solicitacoes_dados_causa
    CHECK (causa IS NULL OR causa IN ('falha_geracao', 'curriculo_ausente', 'permissao'))
);
```

⚠ **Três dívidas que esta migration herda, todas escritas no arquivo e endereçadas a esta fase:**

1. `COMMENT ON CONSTRAINT fk_solicitacoes_dados_candidato` (`126-131`) — *"SEM clausula ON DELETE,
   deliberadamente (= NO ACTION). A decisao de o pedido de acesso sobreviver ou nao ao tombstone
   do candidato pertence a **PHASE 45**."* É pergunta aberta que o plano fecha.
2. `COMMENT ON COLUMN tipo` (`133-139`) — *"Corolario obrigatorio: as duas RPCs desta fase filtram
   `tipo = 'acesso'` NO SERVIDOR."* O plano **verifica que continuam filtrando** (Invariante 9 da
   UI-SPEC). O filtro vivo está em `20260804000002:266` (`WHERE s.tipo = 'acesso'`).
3. A policy own-row (`183-187`) é a que a severação de `user_id` desliga:

```sql
CREATE POLICY solicitacoes_dados_candidato_own_read ON public.solicitacoes_dados
  FOR SELECT TO authenticated
  USING (
    candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = (select auth.uid()))
  );
```

**Padrão de COMMENT como documentação-in-loco:** cada CHECK novo (`situacao` ganhando
`agendado/cancelado/executando/concluido`) carrega COMMENT explicando o vocabulário fechado e o
que acontece quando cliente e banco divergem — molde verbatim de `COMMENT ON COLUMN causa`
(`147-153`).

---

### 3 · `p45_plano_e_dry_run.sql` (RPC DEFINER read-only)

**Analog:** `supabase/migrations/20260801000004_p43_previa_retencao.sql`

**Guard NULL-safe** — a forma obrigatória em TODA função nova desta fase
(`20260804000002:238-250`, a mais explícita das duas variantes vivas):

```sql
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  -- `IS DISTINCT FROM` e NUNCA `NOT IN`: com v_role NULL (chamador sem JWT) a
  -- expressão `NOT IN` avalia NULL, o `IF` não é tomado, e o guard FALHA ABERTO
  -- justamente para o chamador mais suspeito.
  IF v_role IS DISTINCT FROM 'administrador' AND v_role IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;
```

Variante de uma-role só (`20260801000004:286-288`):

```sql
IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
  RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode ler a previa de retencao'
    USING ERRCODE = '42501';
```

**REVOKE nominal + GRANT seletivo** — as duas posturas vivas, e a escolha entre elas é decisão de
plano por função:

```sql
-- (A) função que devolve LINHAS IDENTIFICÁVEIS: revogada, e NENHUM grant de volta
--     (20260801000004:215-217)
REVOKE ALL ON FUNCTION public.candidaturas_alem_da_janela() FROM PUBLIC, anon, authenticated;

-- (B) função chamada por papel de cliente: revoga tudo e SÓ ENTÃO concede
--     (20260804000002:295-296)
REVOKE ALL ON FUNCTION public.listar_pedidos_dados(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listar_pedidos_dados(boolean) TO authenticated;
```

`FROM PUBLIC` sozinho **não remove nada** — o `pg_default_acl` de `public` concede a `anon` e
`authenticated` como grants **diretos e nomeados** (`20260804000002:319-321`). Nomear os dois
papéis é obrigatório.

**Assinatura do dry-run por expressão única** — `LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''`, com o corpo entre delimitadores **nomeados** (`$candidaturas_alem_da_janela$`),
o que é o que torna o `md5(prosrc)` extraível pelo smoke.

---

### 4 · `p45_anonimizar_candidato.sql` (RPC DEFINER de escrita, `p_dry_run` no MESMO corpo)

**Analog de forma:** o item 3 acima. **Analog de auto-verificação:**
`supabase/migrations/20260803000001_p43_fix_listar_matriz_cast.sql:116-150`.

Esta é a migration que a pesquisa nomeia como "carrega a própria prova executável" — e o motivo
dela existir é exatamente a lição que esta fase não pode repetir (*"Um smoke que só exercita o
caminho de recusa não é cobertura do caminho feliz"*):

```sql
-- Um gate que nao morde nao e um gate — e esta migration existe justamente porque
-- o gate anterior media a recusa e chamava aquilo de cobertura.
DO $verifica_leitura$
DECLARE
  v_admin uuid;
  v_linhas int;
BEGIN
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL
   ORDER BY u.created_at LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P43-FIX: nenhum administrador vivo — o caminho feliz nao pode ser verificado, e verificar so a recusa foi exatamente o defeito que esta migration corrige';
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin::text,
                      'app_metadata', json_build_object('role','administrador'))::text, true);

  SELECT count(*) INTO v_linhas FROM public.listar_matriz_retencao();

  PERFORM set_config('request.jwt.claims', '', true);

  IF v_linhas <> 8 THEN
    RAISE EXCEPTION 'P43-FIX: listar_matriz_retencao devolveu % linhas, esperado 8 (...)', v_linhas;
  END IF;

  RAISE NOTICE 'P43-FIX OK: ...';
END
$verifica_leitura$;
```

**Transposição para o tombstone:** o `DO` block desta fase exercita o **caminho feliz em
`p_dry_run = true`** contra uma linha real, e assere que a função **completou** — não que ela não
lançou. É a resposta direta ao Pitfall 1 (as 6 CHECK constraints de `candidatos`): uma sentinela
que viola formato só se revela num apply que executa.

⚠ Nota de ordem herdada do molde: `REVOKE`/`GRANT` vêm **antes** do `DO` block, e o
`COMMENT ON FUNCTION` **depois** — é a ordem viva em `20260803000001:110-168`, e é a que sobreviveu
ao pooler.

---

### 5 · `p45_bias_k5.sql` (`CREATE OR REPLACE` corretiva sobre função "intocável")

**Analog:** `20260803000001_p43_fix_listar_matriz_cast.sql` — **inteiro**, como precedente de
processo.

O `45-CONTEXT §O que NÃO pode ser tocado` nomeia o **arquivo** `20260625100001`, não a **função**.
`20260803000001` é a prova de que o idioma vivo deste repositório é `CREATE OR REPLACE` numa
migration nova (`:5-7`):

> *"CORRETIVA · ZERO-DESTRUTIVA. Um `CREATE OR REPLACE FUNCTION` que acrescenta UM cast
> (`CREATE OR REPLACE` preserva o ACL; o REVOKE/GRANT ao final apenas reafirma o estado)."*

E o `COMMENT ON FUNCTION` final (`153-168`) é o molde de como registrar **o defeito corrigido e
por que o gate anterior não o pegou** — o plano do k=5 deve escrever o equivalente sobre a tensão
SC#5 × D-45-04 (Pitfall 6): *linhas históricas não mudam; a apresentação futura suprime células
pequenas*.

⚠ `ADD COLUMN faixa_etaria_materializada text` **sem `IF NOT EXISTS`** — o idioma
`ADD COLUMN IF NOT EXISTS` é a causa medida do drift de `candidatos.user_id`.

---

### 6 · `supabase/tests/p45_motor_exclusao_smoke.sql`

**Analog:** `supabase/tests/p43_previa_smoke.sql` — clonar **a estrutura do cabeçalho inteira**
(`1-120`), que é onde vive metade do valor do arquivo.

Os cinco blocos a herdar verbatim, com os números trocados:

1. **"ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO"** (`5-15`) — escrito RED, antes do apply.
   *"se a implementação divergir deste arquivo, **corrige-se a implementação**. Alterar o smoke
   para caber no que foi aplicado é ESCALAR o problema."*
2. **COMO RODAR** (`17-30`) — MCP `execute_sql`, **pelo orquestrador**, numa **ÚNICA chamada**,
   porque `set_config(..., false)` é escopado à sessão e chamadas separadas zeram o contador.
   Gate verde = contador bate o número **FIXO**.
3. **Escopo negativo** (`32-37`) — nesta fase o smoke **escreve** (o tombstone é `UPDATE`), então
   este bloco inverte: declarar explicitamente a subtransação e o `ROLLBACK`, e manter a asserção
   (i) — contagens de `candidatos`/`candidaturas` idênticas antes e depois.
4. **As asserções, com as NEGATIVAS nomeadas** (`39-70`) — as diretamente transponíveis:
   - `⊖ proacl` das funções novas **não** concede EXECUTE a `anon`/`authenticated`/PUBLIC;
   - `⊖ guard` recusa papel errado **e** chamador **sem claim nenhuma**, ambos com 42501 —
     *"a segunda metade é a que fecha o defeito sistêmico"*;
   - `md5(prosrc)` **pinado** + `pg_get_functiondef` dos chamadores **CONTÉM** a chamada
     (as duas metades do gate de não-divergência — é isso que impede um segundo dry-run);
   - `⊖` as 3 FKs `NO ACTION` continuam `NO ACTION` (ERASE-08);
   - `⊖` contagens idênticas antes/depois.
5. **Proveniência do md5** (`83-107`) — o valor, os octetos, a data, o comando `node -e` de
   recomputação, e a regra de que **re-pinar é ato consciente e revisável**. Mais a cláusula de
   divergência autorizada (só extração, nunca objeto vivo).

E a lição de `109-120`, que morde diretamente aqui: use **fronteira de palavra** (`\m...\M`), não
`strpos`, para banir verbos — `deleted_at`/`updated_at` contêm `delete`/`update` como substring, e
*"um teste que reprova o comportamento correto é pior que teste nenhum"*.

---

### 7 · `executar-direito-titular/index.ts` (EF privilegiada)

**Analog:** `supabase/functions/exportar-meus-dados/index.ts` — que é ele mesmo um clone declarado
de `get-curriculo-url`, com os desvios tabulados no docblock. **Repetir essa tabela de desvios** é
parte do padrão.

**Import estático + CORS + tipos de erro** (`57-94`):

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EXPORT_ALLOWLIST } from "../_shared/exportAllowlist.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "SERVER_ERROR" | "COOLDOWN";

function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status);
}
```

**Deps injetável — o que torna o handler testável sem `Deno.serve`** (`100-105`, `152-156`):

```ts
export interface Deps {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  // deno-lint-ignore no-explicit-any
  supabaseUser: any;
}

export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);
  const { supabaseAdmin, supabaseUser } = deps;
```

**AUTHENTICATE → AUTHORIZE, nesta ordem, e o erro de query NÃO vira 403** (`158-188`):

```ts
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;

const { data: cand, error: candErr } = await supabaseAdmin
  .from("candidatos").select("id").eq("user_id", user.id).maybeSingle();
// WR-04: NÃO engula o erro de query. Um erro transitório virando 403 é uma
// mentira sobre autorização — e é o tipo de mentira que ninguém investiga.
if (candErr)   return errorResponse("SERVER_ERROR", "Falha ao verificar o titular.", 500);
if (!cand?.id) return errorResponse("FORBIDDEN", "Acesso negado.", 403);
const candidatoId: string = cand.id;
```

⚠ **Este `.eq("user_id", user.id)` é exatamente o que o tombstone quebra** (D-45-11). Depois da
severação nenhuma sessão resolve o titular — comportamento desejado, mas o plano tem de dizer que
a EF então responde 403, e que isso é o certo.

**Guard que FECHA no ilegível** (`205-215`) — o molde literal do predicado de janela:

```ts
if (!Number.isFinite(solicitadoEm)) {
  return errorResponse("SERVER_ERROR", "Falha ao verificar pedidos anteriores.", 500);
}
```

*"um controle de segurança cujo ramo de entrada-ilegível é 'permitir'"* — a mesma classe do
`NOT IN`/NULL. Transposição direta: um `executar_em` ilegível **nunca** libera a execução.

**Registrar ANTES de mutar** (`228-238`) — é literalmente o ERASE-04:

```ts
const { data: pedido, error: insErr } = await supabaseAdmin
  .from("solicitacoes_dados")
  .insert({ candidato_id: candidatoId, tipo: "acesso", situacao: "pendente" })
  .select("id").single();
if (insErr || !pedido?.id) return errorResponse("SERVER_ERROR", "Falha ao registrar o pedido.", 500);
```

**Falha FECHADA quando a estrutura não bate** (`270-286`) — o padrão que o motor herda para
"o passo 0 não capturou nada mas deveria":

```ts
if (linhasDaPonte.length > 0 && ids.length === 0) {
  throw new Error(`ponte ${ponte} não produziu ids para ${tabela}`);
}
```

**Catch que registra causa + log REDIGIDO** (`348-366`):

```ts
} catch {
  const { error: causaErr } = await supabaseAdmin
    .from("solicitacoes_dados")
    .update({ situacao: "pendente", causa: "falha_geracao" })
    .eq("id", pedidoId);
  // Log REDIGIDO: só o id do pedido. Nunca o payload, nunca o corpo do request,
  // nunca uma URL.
  console.error("[exportar-meus-dados] erro", { pedido_id: pedidoId });
  if (causaErr) console.error("[...] registro da causa falhou", { pedido_id: pedidoId });
  return errorResponse("SERVER_ERROR", "Falha ao preparar a cópia.", 500);
}
```

⚠ Nesta fase o `catch` **não pode escrever "nada foi apagado"** (Invariante 5 da UI-SPEC): depois
do passo 1 essa afirmação é ingarantível.

**Wiring two-client no `Deno.serve`** (`373-403`) — preflight ANTES do guard de `Authorization`:

```ts
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) { /* 500 */ }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    const supabaseUser  = createClient(SUPABASE_URL, ANON_KEY,
      { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } });
    return await handler(req, { supabaseAdmin, supabaseUser });
  });
}
```

**Deploy:** `--no-verify-jwt` **nunca** (docblock `:51-52`).

---

### 8 · `executar-direito-titular/helpers.ts` + o evento novo em `notificar-rh`

**Analog:** `supabase/functions/notificar-rh/helpers.ts` (166 linhas — ler inteiro é barato).

**Constantes de vocabulário** (`27-34`) — o molde do "evento novo sem tocar
`Record<EventoNotificacao, …>`":

```ts
/** Rótulo do sink de teste desta EF. NÃO pertence à união `EventoNotificacao`. */
export const LABEL_SINK_RH = "revisao_solicitada_rh" as const;
/** Valor gravado em `notificacoes_enviadas.evento` para o nudge ao RH. */
export const EVENTO_LEDGER_RH = "revisao_solicitada" as const;
export const TEMPLATE_LEDGER_RH = "revisao_solicitada_rh" as const;
```

**`dedupe_key` POR DESTINATÁRIO** (`36-50`) — e o docblock explica por que a forma ingênua faz
4 de 5 pessoas nunca serem notificadas:

```ts
export function montarDedupeKeyRh(candidaturaId: string, userId: string): string {
  return `${candidaturaId}:${EVENTO_LEDGER_RH}:${userId}`;
}
```

**Assunto com CR/LF neutralizado** (`59-62`) — injeção de header de e-mail:

```ts
export function assuntoRevisaoSolicitada(tituloVaga: string): string {
  const titulo = tituloVaga.replace(/[\r\n]+/g, " ").trim();
  return `[Beauty Smile] Pedido de revisão de decisão — ${titulo}`;
}
```

**Corpo: `escapeHtml` + `layoutBase`, sem nome de pessoa** (`97-110`) — decisão T-42-24, que a
Invariante 10 da UI-SPEC herda verbatim:

```ts
export function corpoRevisaoSolicitada(args: { tituloVaga: string; urlFila: string }): string {
  const titulo = escapeHtml(args.tituloVaga);
  const url = escapeHtml(args.urlFila);
  return layoutBase({ preheader: "...", conteudoHtml: `...` });
}
```

**Allowlist de log POR EF, nunca importada da vizinha** (`137-166`):

```ts
const CHAVES_LOG_OK_RH = new Set(["evento","status","skipped","destinatarios",
  "candidatura_ref","resend_status","count"]);
export function logSeguroRh(obj: Record<string, unknown>): Record<string, unknown> { /* filtra */ }
export function refCurta(id: string): string { return id.slice(0, 8); }
```

⚠ Para o **recibo ao titular**, `dedupe_key` está **proibida em log** aqui porque embute ids —
e sob D-45-12/R1 o recibo nem chega a ter linha de ledger. A allowlist de log do recibo tem de
ser escrita do zero, **não importada**.

**Claim-before-send** (`notificar-rh/index.ts:279-342`) — o molde de idempotência de envio:

```ts
const { data: claim, error: claimErr } = await supabaseAdmin
  .from("notificacoes_enviadas")
  .upsert({ candidato_id, candidatura_id, dedupe_key, destinatario_email: dest.para,
            destinatario_original: dest.destinatario_original,
            evento: EVENTO_LEDGER_RH, template: TEMPLATE_LEDGER_RH, status: "pendente", modo },
          { onConflict: "dedupe_key", ignoreDuplicates: true })
  .select("id");
if (claimErr) { falhas++; continue; }            // claim falho NÃO aborta o laço
if (!claim || claim.length === 0) { duplicados++; continue; }  // no-op idempotente
// ... envio, com:
headers: { "Idempotency-Key": dedupe_key }        // cinto secundário no Resend
```

⚠ **Sob D-45-12 (saída R1) este bloco NÃO é clonado para o recibo do titular** — é o
`upsert` que gravaria o endereço duas vezes (`destinatario_email` + `destinatario_original`, ambos
`NOT NULL`). O recibo usa `solicitacoes_dados.recibo_enviado_em` como claim **e mantém só o
header `Idempotency-Key`** deste trecho. O bloco continua sendo o molde **para o aviso ao RH**
(D-45-06), onde a `candidatura_id` existe de verdade.

---

### 9 · `docs/compliance/sql/gen-recibo-exclusao.cjs` + os dois artefatos

**Analog:** `docs/compliance/sql/gen-export-allowlist.cjs` (728 linhas).

**Estrutura de caminhos — duas saídas, uma delas fora de `docs/`** (`49-57`):

```js
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(__dirname, '..', '..', '..');
const INVENTARIO = path.join(ROOT, 'pii-inventory.yaml');   // ← a FONTE (§C2 da pesquisa)
const OUT_JSON = path.join(ROOT, 'export-allowlist.json');
const OUT_TS   = path.join(REPO, 'supabase', 'functions', '_shared', 'exportAllowlist.ts');
```

**O bloco `--check`, verbatim na forma** (`675-708`) — inclusive o truque do carimbo:

```js
if (args.includes('--check')) {
  let discoJson = null;
  try { discoJson = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')); }
  catch { morrer(`DIVERGENTE: ${REL(OUT_JSON)} ausente ou ilegível.\n  Rode: node ...`); }
  const doc = construir();
  // Pina o carimbo de execução do disco: sem isso o `--check` divergiria pelo
  // relógio e nunca poderia sair 0 — um gate que nunca passa não é um gate.
  doc.meta.gerado_em = discoJson.meta && discoJson.meta.gerado_em;
  if (fs.readFileSync(OUT_JSON, 'utf8') !== serializarJson(doc)) morrer(`DIVERGENTE: ...`);
  const tsDisco = fs.existsSync(OUT_TS) ? fs.readFileSync(OUT_TS, 'utf8') : '';
  if (tsDisco !== serializarTs(doc)) morrer(`DIVERGENTE: ... o espelho .ts é gerado, não escrito à mão.`);
  console.log(`OK: ... em sincronia com as fontes.`);
  process.exit(0);
}
```

**Falhar ALTO** (`72-74`): `function morrer(msg) { console.error(...); process.exit(1); }`

**Cabeçalho do espelho `.ts` gerado** (`588-596`): *"NÃO EDITAR À MÃO — `--check` reprova qualquer
divergência, e reprova este arquivo separadamente do `.json`: um `--check` que olhasse só um…"*

**Registro no `package.json`** (`:103`):

```json
"check:export-allowlist": "node docs/compliance/sql/gen-export-allowlist.cjs --check",
```

**Testes do gerador:** `docs/compliance/__tests__/genExportAllowlist.test.ts` +
`exportAllowlist.test.ts` — dois arquivos, um para o gerador e outro para o artefato.
O backstop E4 da UI-SPEC (cada linha "sai" mapeia para um passo do motor) é asserção do
**primeiro**.

---

### 10 · `src/features/privacidade/components/ExcluirDadosBloco.tsx`

**Analog:** `src/features/privacidade/components/PedirCopiaBloco.tsx` (198 linhas — molde
estrutural E de docblock).

**Docblock com as três restrições da âncora visual e os estados enumerados** (`11-52`) — a Emenda A
da 45-UI-SPEC é palavra por palavra a mesma regra, com "terceira" → "quarta".

**Container verbatim** (`103-106`):

```tsx
<div data-bloco="pedir-copia" className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4">
```

**Prosa de carga em `text-base leading-relaxed`, rótulo em `text-sm font-semibold`** (`110-122`) —
nunca `text-sm` para a prosa de consequência.

**CTA glass-branco + `aria-busy` + `aria-describedby` + `min-h-[44px]`** (`136-153`):

```tsx
<GlassButton
  variant="white" hover
  disabled={desabilitado}
  aria-busy={emVoo}
  aria-describedby={motivo ? ID_MOTIVO : undefined}
  onClick={() => exportar.mutate()}
  className="min-h-[44px] text-white"
>
  {emVoo ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{COPY.ctaEmVoo}</>) : COPY.cta}
</GlassButton>
```

**O motivo IRMÃO do botão desabilitado** (`155-169`) — e o backstop que o exige:

```tsx
{motivo && (
  <p id={ID_MOTIVO} data-motivo className="text-sm font-semibold leading-relaxed text-white">
    {motivo}
  </p>
)}
```

*"O teste (z3) percorre `button[disabled]` e exige o irmão, de modo que um `disabled`
acrescentado no futuro sem motivo reprove."*

**Skeleton de SEÇÃO, não `AsyncState`** (`124-133`) — a UI-SPEC declara explicitamente que
`AsyncState` não é usado nesta fase:

```tsx
<div className="pt-2">
  <Glass variant="white" blur="md" className="h-16 animate-pulse p-6"><span /></Glass>
</div>
```

**Alerta inline destructive, persistente, `role="alert"`** (`187-195`) — o idioma exato dos três
erros da fase:

```tsx
<div role="alert" className="mt-3 space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
  <p className="text-sm font-semibold text-white">{COPY.erroTitulo}</p>
  <p className="text-base leading-relaxed text-white/90">{COPY.erroCorpo}</p>
</div>
```

**Sucesso PERSISTENTE, nunca toast** (`175-182`) — mesmo container neutro
(`rounded-lg border-white/15 bg-white/5 p-4`). Serve ao "Exclusão cancelada." do Estado B.

**A regra de autoridade** (`33-40`, `83-88`): *"`useUltimoPedidoDados` **informa** a apresentação;
o servidor **decide**."* O estado local é palpite; a recusa do servidor é fato; quando os dois
existem vence o do servidor.

**Composição na página** (`PrivacidadeCandidatoPage.tsx:266-270`):

```tsx
<section className="space-y-4 border-t border-white/15 pt-6">
  ...
  <PedirCopiaBloco />
</section>
```

---

### 11 · `ConfirmarExclusaoDialog.tsx` e `RetirarCandidaturaAcao.tsx`

**Analog:** `src/features/admin/retencao/components/EditarJanelaDialog.tsx` (306 linhas).

**As quatro regras do docblock** (`12-39`) — as duas primeiras são herdadas verbatim pela
Invariante 7 da 45-UI-SPEC:

> *"2. **OS DOIS RECUOS TÊM RÓTULOS DISTINTOS, E NENHUM É O VERBO GENÉRICO.** · 'Fechar sem salvar'
> (rodapé) → abandona a edição INTEIRA. · 'Voltar' (confirmação aninhada) → recua UM passo. …
> 'Cancelar' nos dois seria a mesma palavra para duas saídas diferentes."*

⚠ Nesta fase a colisão é **pior**, e o plano tem de dizer: "Cancelar" é também o nome da ação de
**cancelar a exclusão**. Nenhum dos quatro rótulos pode ser "Cancelar".

**Copy como constante exportada `as const`** (`75-104`) — nunca literal no JSX:

```tsx
/** Copy verbatim da 43-UI-SPEC (§Diálogo · §Confirmação, linhas 546-576). */
export const DIALOGO_JANELA_COPY = {
  titulo: 'Editar janela de retenção',
  ctaPrimario: 'Salvar janela de retenção',
  ctaSecundario: 'Fechar sem salvar',   // recuo LARGO
  confirmacao: { titulo: '…?', confirmar: '…', recuar: 'Voltar', escopo: '…' },
} as const
```

**Estrutura `Dialog` → `AlertDialogTrigger asChild` → `AlertDialogContent`** (`161-301`):

```tsx
<Dialog open={open} onOpenChange={(p) => { if (!p) onOpenChange(false) }}>
  <DialogContent className="border-white/25 bg-[#00109E]/95 text-white backdrop-blur-xl sm:max-w-lg">
    <DialogHeader>
      <DialogTitle className="text-xl font-semibold text-white">{COPY.titulo}</DialogTitle>
      <DialogDescription className="text-base text-white/70">{COPY.descricao}</DialogDescription>
    </DialogHeader>
    {/* bloco de contexto SOMENTE LEITURA: grid gap-4 rounded-lg border border-white/15 bg-white/5 p-4 */}
    <DialogFooter>
      <button type="button" onClick={() => onOpenChange(false)}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20">
        {COPY.ctaSecundario}
      </button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <GlassButton variant="white" hover disabled={!podeSalvar} className="min-h-[44px] text-white">
            {salvar.isPending ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{COPY.ctaEnviando}</span>) : COPY.ctaPrimario}
          </GlassButton>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{COPY.confirmacao.titulo}</AlertDialogTitle>
            <AlertDialogDescription>… {COPY.confirmacao.escopo}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">{COPY.confirmacao.recuar}</AlertDialogCancel>
            <AlertDialogAction className="min-h-[44px]" onClick={confirmar}>{COPY.confirmacao.confirmar}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**A armadilha WR-09** (`264-272`) — o `AlertDialogContent` renderizado condicionalmente com
condição **mais estrita** que a do CTA produziu um diálogo vazio: *"Sem confirmação, sem erro, sem
salvar: uma mudança válida sem caminho até o servidor."* Vale integralmente aqui.

**Foco:** *"O foco vai para o primeiro controle ao abrir e volta ao gatilho ao fechar — o Radix já
cuida disso; não sobrescrever."*

**O card hospedeiro da retirada:** `src/components/pages/DashboardCandidatoPage.tsx:269-426` —
`candidaturasData.data.map(...)` renderizando um `GlassCard` por candidatura. É `components/pages/`
(legado), e a ação nova vive em `src/features/vagas/components/` sendo **importada** por ele —
não abrir uma sexta responsabilidade dentro do map.

⚠ O `AlertDialogAction` do diálogo de **retirada** é glass-branco, **não** destructive
(UI-SPEC §Color) — a assimetria é o mecanismo do ERASE-05.

---

### 12 · `exclusaoService.ts` + os hooks

**Analog:** `src/features/privacidade/services/exportacaoService.ts` (1045 linhas) e os três hooks
irmãos.

**Ponte de tipos para tabela ausente do `database.types.ts`** (`766-792`) — Pitfall 10, e é o
**único** idioma autorizado:

```ts
interface ConsultaUltimoPedido {
  select(colunas: string): ConsultaUltimoPedido
  eq(coluna: string, valor: string): ConsultaUltimoPedido
  order(coluna: string, opcoes: { ascending: boolean }): ConsultaUltimoPedido
  limit(n: number): ConsultaUltimoPedido
  maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
}
interface ClienteSolicitacoesDados {
  from(tabela: 'solicitacoes_dados'): ConsultaUltimoPedido
}
const clienteSolicitacoes = supabase as unknown as ClienteSolicitacoesDados
```

*"O nome da tabela continua LITERAL no tipo — um erro de digitação nele ainda não compila. E a
conversão é do **objeto** cliente, nunca a extração do método: extrair perde o `this` e derruba o
`PostgrestClient` em runtime, defeito que os testes NÃO pegam porque mockam o método inteiro."*

**Allowlist de colunas nomeada, nunca `select('*')`**:

```ts
export const ULTIMO_PEDIDO_COLUNAS = 'id, situacao, causa, solicitado_em, atendido_em'
export const TIPO_PEDIDO_ACESSO = 'acesso'
```

**Leitura que NUNCA lança** — `null` é resultado válido:

```ts
export async function lerUltimoPedidoDados(candidatoId: string | undefined): Promise<UltimoPedidoDados | null> {
  if (!candidatoId) return null
  const { data, error } = await clienteSolicitacoes
    .from('solicitacoes_dados')
    .select(ULTIMO_PEDIDO_COLUNAS)
    .eq('candidato_id', candidatoId)
    .eq('tipo', TIPO_PEDIDO_ACESSO)
    .order('solicitado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as UltimoPedidoDados
}
```

⚠ O docblock desta função **já escreveu o corolário desta fase**: *"`solicitacoes_dados` nasce com
`tipo` para a Phase 45 (exclusão); sem o filtro, um futuro pedido de exclusão consumiria o cooldown
do direito de ACESSO em silêncio."* O `exclusaoService` filtra `tipo = 'exclusao'` pelo mesmo motivo,
simétrico.

**Classe de erro própria com vocabulário pequeno** (`564-579`) — `ExclusaoError` com `code`:

```ts
export class ExportacaoError extends Error {
  constructor(message: string, public code: CodigoExportacao, public liberadoEm?: string) {
    super(message)
    this.name = 'ExportacaoError'
  }
}
```

Mais: a recusa da EF é lida do corpo **uma única vez** (`597-604`), e nenhuma mensagem crua do
transporte cruza para a tela.

**Hook de leitura — retry OFF, degradar em vez de travar** (`useUltimoPedidoDados.ts:39-51`):

```ts
const STALE = 5 * 60 * 1000
export function useUltimoPedidoDados(candidatoId: string | undefined) {
  return useQuery<UltimoPedidoDados | null>({
    queryKey: privacidadeKeys.ultimoPedido(candidatoId),
    queryFn: () => lerUltimoPedidoDados(candidatoId),
    enabled: Boolean(candidatoId),   // ⚠ gate por candidato hidratado NÃO é opcional
    staleTime: STALE, gcTime: STALE,
    retry: false,
  })
}
```

*"Sem ele a query dispara antes de o candidato estar hidratado no store e devolve vazio — que a
tela leria como 'nunca pediu', liberando o CTA por um fato que ninguém mediu."* Nesta fase o CTA
em questão é o que apaga dados.

**Hook de config** (`useConfigSlaDados.ts`) — mesmo molde, sem `enabled`, com `null` = "config
ausente" resolvendo para a apresentação degradada. É o molde de `useJanelaExclusao` e do fallback
que a UI-SPEC exige (*"renderiza a data alvo sem a contagem de dias, nunca um número inventado,
nunca `NaN`"*).

**Hook de mutation** (`useExportarMeusDados.ts`) — **sem `onMutate`, sem toast, sem `onError`**:

```ts
export const exportacaoMutationKey = ['privacidade', 'exportar-meus-dados'] as const
export function useExportarMeusDados() {
  return useMutation<RespostaExport, Error, void>({
    mutationKey: [...exportacaoMutationKey],
    mutationFn: () => invocarExportMeusDados(),
    // Sem `onMutate`: nada é antecipado.
    onSuccess: (resposta) => { /* age sobre o que o SERVIDOR devolveu, nunca sobre o que foi pedido */ },
    // Sem `onError`: o bloco renderiza o alerta inline persistente.
  })
}
```

A proibição de UI otimista é ainda mais dura aqui (Invariante 5): a tela nunca declara conclusão
antes dos três sistemas confirmarem.

---

## Shared Patterns

### A · Guard NULL-safe (toda função DEFINER nova)
**Source:** `20260804000002_p44_solicitacoes_dados.sql:242-250` · `20260801000004:286-288`
**Apply to:** as 4 RPCs novas (`registrar_pedido_exclusao`, `cancelar_pedido_exclusao`,
`plano_exclusao_titular`, `anonimizar_candidato`) + `gerar_bias_snapshot` recriada.
`IS DISTINCT FROM`, nunca `NOT IN`. Rejeição explícita de `auth.uid() IS NULL`.

### B · REVOKE nominal
**Source:** `20260801000004:215-217` (sem grant de volta) · `20260804000002:295-296` (com grant)
**Apply to:** todas as funções novas. `FROM PUBLIC, anon, authenticated` — nomear `anon` é
obrigatório, `FROM PUBLIC` sozinho não remove nada.

### C · Cabeçalho de migration do M8
**Source:** `20260804000001:1-105`
**Apply to:** as 8 migrations. Blocos: escopo negativo em uma linha · apply por MCP
`apply_migration` pelo **orquestrador** · **sem** `BEGIN;/COMMIT;` · reparo do ledger
(`UPDATE supabase_migrations.schema_migrations SET version = ...`) · conferência
`md5(statements[1])` · proveniência (o que foi copiado e o que **deliberadamente não**).

### D · `COMMENT` como documentação viva
**Source:** `20260804000002:112-163` · `20260803000001:153-168`
**Apply to:** toda tabela, coluna, constraint, índice, policy e função nova. Neste repositório o
COMMENT é onde vive o *porquê* — e onde a fase seguinte lê a dívida que herdou. Perda de COMMENT
no apply **não é benigna**.

### E · Log redigido + allowlist por EF
**Source:** `notificar-rh/helpers.ts:137-166` · `exportar-meus-dados/index.ts:355-358`
**Apply to:** a EF nova. Nunca payload, nunca caminho de Storage, nunca URL, nunca `dedupe_key`.
`refCurta(id)` para ids. **Não importar a allowlist da EF vizinha.**

### F · Falhar FECHADO no ilegível
**Source:** `exportar-meus-dados/index.ts:205-215` e `:270-286`
**Apply to:** o predicado `executar_em`, a leitura do `plano`, a enumeração do Storage. Um valor que
não sabemos ler **nunca** libera a execução; uma estrutura que devia produzir itens e produziu zero
é defeito estrutural, não caso vazio.

### G · Copy como constante `as const`, importada pelo componente
**Source:** `EditarJanelaDialog.tsx:75-104` · `exportacaoService.ts` (`COPY_PEDIR_COPIA`,
`COPY_COOLDOWN`)
**Apply to:** toda a copy da §Copywriting Contract. Uma string por causa, de uma constante — é o
que torna os greps de escopo da UI-SPEC executáveis e o que impede duas verdades sobre um fato.

### H · `min-h-[44px]` + `aria-busy` + motivo irmão visível
**Source:** `PedirCopiaBloco.tsx:136-169`
**Apply to:** os 7 controles acionáveis da fase. Todo `button[disabled]` carrega irmão com o motivo
em texto visível — inclusive o "em voo".

---

## No Analog Found

Os três estão no mesmo lugar, e o plano precisa saber que escreve **net-new contra uma API que não
perdoa**, sem PITR e sem backup de Storage.

| Arquivo / capacidade | Role | Data Flow | Situação medida |
|---|---|---|---|
| `executar-direito-titular` — **passo 1, Storage `list()` paginado** | EF / enumeração | file-I/O | **Nenhuma chamada a `storage.list()` existe no repositório.** O único `list` encontrado em `supabase/functions/` é `.download()` em `analise-candidato-individual/index.ts:205`. Não há precedente de paginação, de `offset`, nem de conferência entre `list()` e `curriculo_url`. Molde a seguir: `45-RESEARCH.md §Code Examples · Storage`. |
| `executar-direito-titular` — **passo 1, Storage `remove()` a partir de EF com `service_role`** | EF / delete | file-I/O | **Nenhum.** O único `.remove()` do repositório é `src/features/vagas/services/cvUploadService.ts:224` — **client-side, cliente anon, sob RLS de Storage**, de UM caminho conhecido: `await supabase.storage.from('curriculos').remove([path])` com erro mapeado para `CVUploadServiceError('UPLOAD_FAILED')`. Ele dá a **forma da chamada**, mas não é analog do caso: não é `service_role`, não é em lote, não verifica o array de retorno (o `remove()` devolve os objetos efetivamente apagados — verificar esse retorno **é parte do passo**, e nada no repo faz isso hoje), e não é irreversível-sem-rede. |
| `executar-direito-titular` — **passo 3, `auth.admin.deleteUser` sobre usuário COM dados** | EF / delete | request-response | **Analog parcial, e a diferença é a substância.** `deleteUser` existe em dois lugares — `cadastrar-candidato/index.ts:268,390` e `gerenciar-usuario-rh/index.ts:366` — mas nos dois é **compensação de rollback sobre um usuário criado segundos antes, sem linha filha nenhuma**, e sempre com `.catch()` que engole o erro: `await supabaseAdmin.auth.admin.deleteUser(userId).catch((rollbackErr) => { console.error(...) })`. Engolir o erro é **correto lá** (o objetivo é não deixar órfão) e seria **catastrófico aqui**: é exatamente o `23503` do Pitfall 2 que ficaria invisível, depois de o currículo já ter sido apagado. Nenhum código deste projeto jamais chamou `deleteUser` sobre usuário com histórico — e `auth.users` tem **0 linhas soft-deletadas**: o caminho nunca foi exercitado. O segundo argumento (`shouldSoftDelete`) **nunca foi passado** em lugar nenhum. |
| `p45_sever_user_id.sql` — `ALTER COLUMN … DROP NOT NULL` + FK recriada | migration | schema | **Nenhuma migration deste repositório derruba `NOT NULL` nem recria FK sobre tabela viva com dados.** É DDL destrutiva sem precedente interno. Candidato nº 1 a code review bloqueante + dry-run (D-45-11). O único padrão herdável é o **cabeçalho** (§C) e a **auto-verificação por `DO` block** (§4) — o corpo é original. |

**Consequência de planejamento:** os três passos do motor têm molde para o **esqueleto** (a EF) e
**nenhum** para o **efeito**. O plano deve tratar cada um como código sem rede: dry-run pela mesma
expressão, verificação do valor de retorno, e a sonda de escrita da Open Question 1 da pesquisa
(hard delete de conta descartável com histórico) como checkpoint do orquestrador **antes** do
primeiro apply real.

---

## Metadata

**Analog search scope:** `supabase/migrations/`, `supabase/functions/`, `supabase/tests/`,
`docs/compliance/`, `src/features/privacidade/`, `src/features/pedidos-dados/`,
`src/features/admin/retencao/`, `src/features/vagas/services/`, `src/components/pages/`
**Files read in full or in targeted ranges:** 17
**Greps de confirmação:** `deleteUser`, `auth.admin.`, `storage…remove(`, `storage…list(`,
`check:` scripts do `package.json`
**Pattern extraction date:** 2026-08-04
