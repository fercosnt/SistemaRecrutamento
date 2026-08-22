# Phase 46: Purga Automática (dry-run → live) — Pattern Map

**Mapped:** 2026-08-22
**Files analyzed:** 14 (7 migrations novas · 1 EF nova · 1 smoke novo · 3 smokes emendados · 2 arquivos de config)
**Analogs found:** 14 / 14 — **zero arquivo desta fase nasce sem gêmeo vivo no repositório**

> Este documento é CONCRETO por desenho. Cada excerto abaixo foi lido do arquivo vivo
> nesta sessão e vem com `arquivo:linhas`. O executor **copia a forma**; não inventa.
> Onde o excerto é longo, a instrução é "abra o analog nas linhas X-Y e siga o idioma",
> nunca "faça parecido".

---

## Invariantes de projeto (aplicam-se a TODOS os arquivos desta fase)

Estes quatro não são estilo. Cada um tem um defeito medido atrás dele, e todos os quatro
já reprovaram (ou deixaram passar) trabalho real neste repositório.

### INV-1 · Cabeçalho de migration: protocolo de apply + proveniência + escopo negativo

**Fonte canônica:** `supabase/migrations/20260801000002_p43_config_retencao.sql:1-107`
(o cabeçalho mais completo do repo — 107 linhas antes do primeiro `CREATE`).

Estrutura obrigatória, na ordem em que aquele arquivo a escreve:

1. **Título + requirement IDs** (`:1-5`)
2. **⚠ ESCOPO NEGATIVO, EM UMA LINHA** (`:7-15`) — o que esta migration NÃO faz.
   Para a Phase 46 isto é load-bearing: quatro das sete migrations são zero-destrutivas
   e uma (`_p46_guard_purga`) edita função destrutiva viva. Dizer qual é qual no topo
   do arquivo é o que permite ao code review saber onde olhar.
3. **(1) PROTOCOLO DE APPLY** (`:17-57`) — copiar verbatim, trocando só a `version`:

```sql
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- Sem wrapper `BEGIN;/COMMIT;`: o driver já envolve cada migration na sua própria
-- transação implícita, e o BEGIN/COMMIT externo é o gatilho do SQLSTATE 42601
-- ("cannot insert multiple commands into a prepared statement") — CLAUDE.md §Migrations.
--
--   1. **Ele carimba a PRÓPRIA `version` no ledger** — um timestamp do instante do
--      apply, não o do nome deste arquivo. A linha PRECISA ser reparada à mão:
--        UPDATE supabase_migrations.schema_migrations
--           SET version = '20260801000002'
--         WHERE name LIKE '%p43_config_retencao%';
--
--   2. **O ledger guarda o SQL LITERALMENTE aplicado** [...] Asserção
--      obrigatória logo após o apply:
--        SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--         WHERE version = '20260801000002';
--        -- comparar com:
--        --   printf '%s' "$(cat supabase/migrations/20260801000002_*.sql)" | md5
```

4. **(2) PROVENIÊNCIA** (`:59-78`) — o que foi copiado, de onde, **e o que foi
   deliberadamente NÃO copiado**. O item negativo (`:68-74`, "`config_sla_etapa` NÃO é
   o molde") é o que impede a próxima pessoa de copiar o analog errado.
5. **(3) ONDE DIVERGE DO PRECEDENTE, E POR QUÊ** (`:80-96`)
6. **(4) ORDEM DE ENTREGA + qual smoke é o contrato** (`:98-106`)

### INV-2 · `SECURITY DEFINER SET search_path = ''` + tudo totalmente qualificado

Idioma em três lugares medidos:

```sql
-- 20260801000004_p43_previa_retencao.sql:174-180
CREATE OR REPLACE FUNCTION public.candidaturas_alem_da_janela()
RETURNS TABLE (candidatura_id uuid, candidato_id uuid, etapa public.etapa_processo)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $candidaturas_alem_da_janela$
```

Consequências obrigatórias:
- **Delimitador de cifrão NOMEADO** (`$candidaturas_alem_da_janela$`, `$sweep$`, `$CRON$`),
  nunca `$$`, em qualquer arquivo que tenha `COMMENT`/`REVOKE`/`GRANT`/`cron.schedule`
  adjacente. Ver `20260727000001:226` (`$sweep$`) e `20260730000005:126` (`$CRON$`).
- **`pg_catalog.now()`**, não `now()`, dentro de corpo com `search_path=''` que roda sob
  cron — o idioma vivo está em `20260727000001:172`.
  ⚠ Note a assimetria real e deliberada: `candidaturas_alem_da_janela` usa `now()` nu
  (`20260801000004:200`) porque `now()` é resolvida do `pg_catalog` implícito. Manter
  o predicado como está; **usar `pg_catalog.now()` no código NOVO**, seguindo o sweep.
- ⚠ **Pitfall 10 da RESEARCH:** o catálogo grava `proconfig` como `search_path=""`, não
  `search_path=`. Qualquer asserção de smoke compara contra a forma **medida**.

### INV-3 · `REVOKE` que NOMEIA `anon` e `authenticated`

**Fonte:** `20260801000002:458-478` (a explicação) e `20260805000006:826-836` (a forma
mais curta).

```sql
-- ⚠ `REVOKE ALL ON FUNCTION … FROM PUBLIC` SOZINHO **NÃO BASTA** [...] O `pg_default_acl`
-- do schema `public` concede EXECUTE a `anon` em TODO `CREATE FUNCTION`, como grant
-- DIRETO e NOMEADO. [...] Medição de 2026-07-30: **61** funções DEFINER em `public`
-- com EXECUTE para `anon`, **39** delas chamáveis via PostgREST.
REVOKE ALL ON FUNCTION public.salvar_janela_retencao(public.etapa_processo, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_janela_retencao(public.etapa_processo, integer) TO authenticated;
```

Duas variantes vivas, ambas aceitáveis, e a escolha é pelo consumidor:
- **GRANT a `authenticated`** — funções chamadas pela tela do admin (`20260801000002:477-478`).
- **GRANT a `service_role` só** — funções destrutivas ou de Vault
  (`20260805000006:836`, `20260727000001:123`).
- **ZERO GRANT de volta** — funções que devolvem linhas identificáveis
  (`20260801000004:215-216`, com a razão escrita em `:203-214`).

### INV-4 · Sem `BEGIN;/COMMIT;` na migration

`20260727000001:57-63` e CLAUDE.md §Migrations. **Todas as sete migrations desta fase
têm a combinação de gatilho** (corpo `$$` adjacente a `COMMENT`/`REVOKE`/`GRANT`/
`cron.schedule`). O wrapper externo produz `42601` no transaction pooler.

---

## File Classification

| Arquivo novo/modificado | Papel | Data Flow | Analog mais próximo | Qualidade |
|---|---|---|---|---|
| `migrations/2026082x_p46_config_purga.sql` | config table + RPC auditada | CRUD (singleton) | `20260801000002_p43_config_retencao.sql` | **exata** |
| `migrations/2026082x_p46_retencao_hold.sql` | tabela-guarda aditiva | CRUD (append-only) | `20260804000002_p44_solicitacoes_dados.sql:90-200` | role-match |
| `migrations/2026082x_p46_predicado_excecoes.sql` | função-predicado (edit) | transform/read | `20260801000004:174-251` + `20260730000005:120-136` | **exata** |
| `migrations/2026082x_p46_ledger.sql` | ledger 2-tabelas | append-only + state machine | `20260721000001` (shape/RLS/COMMENT) + `20260804000002` (situação+CHECK) | **exata** |
| `migrations/2026082x_p46_guard_purga.sql` | ⛔ edit de função destrutiva | guard/authz | `20260805000006:340-449` + `:1000-1028` | **exata** |
| `migrations/2026082x_p46_sweep_e_cron.sql` | sweep + cron + hop pg_net | event-driven / dispatch | `20260727000001:144-227` | **exata** |
| `migrations/2026082x_p46_reten05_notificacoes.sql` | DELETE de retenção + COMMENT | batch delete | `20260730000005:123-136` + `20260721000001:143-144` | **exata** |
| `functions/purgar-retencao/index.ts` | Edge Function (service_role) | request-response → 3 sistemas | `functions/executar-direito-titular/index.ts` (estrutura) + `cost-alerter/index.ts:90-113` (auth) | role-match híbrido |
| `functions/purgar-retencao/index.test.ts` | teste Deno | unit | `functions/executar-direito-titular/index.test.ts` | **exata** |
| `tests/p46_purga_smoke.sql` | smoke SQL | assertion suite | `p45_motor_exclusao_smoke.sql` + `p43_previa_smoke.sql` | **exata** |
| `tests/p42_invent05_cron_smoke.sql` (emenda) | smoke SQL | assertion | ele próprio `:83-103` + `p43_matriz_retencao_smoke.sql:220-252` | **exata** |
| `tests/p43_previa_smoke.sql` (re-pin) | smoke SQL | assertion | ele próprio `:384-429` | **exata** |
| `supabase/config.toml` (+1 entrada) | config | — | `config.toml:26-38` | **exata** |
| `vite.config.ts` (+1 linha de exclude) | config | — | `vite.config.ts:87-93` | **exata** |

---

## Pattern Assignments

### 1 · `config_purga` — tabela singleton + RPC auditada (D-46-05/06/07/20)

**Analog:** `supabase/migrations/20260801000002_p43_config_retencao.sql` — **copiar o
arquivo inteiro como esqueleto**, seção por seção.

**Tabela + RLS + zero policy de escrita** (`:133-165`):

```sql
CREATE TABLE public.config_retencao_etapa (
  etapa         public.etapa_processo NOT NULL PRIMARY KEY,
  janela_meses  integer     NOT NULL CHECK (janela_meses BETWEEN 1 AND 24),
  origem        text        NOT NULL DEFAULT 'seed' CHECK (origem IN ('seed', 'admin')),
  alterado_por  uuid        NULL REFERENCES public.usuarios_rh(id),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_retencao_etapa ENABLE ROW LEVEL SECURITY;

-- UMA única policy, de SELECT, restrita a administrador. **NENHUMA policy de
-- escrita** — default-deny. A escrita passa EXCLUSIVAMENTE pela RPC da seção 6, que
-- audita. [...] A asserção (b) do smoke existe para que esse acréscimo reprove alto.
CREATE POLICY config_retencao_etapa_admin_read ON public.config_retencao_etapa
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') = 'administrador');
```

Adaptações desta fase (D-46-05/06/07/20), **na mesma forma**:
- `id boolean PRIMARY KEY DEFAULT true CHECK (id)` — singleton *inexprimivelmente*
  duplicável. É o análogo estrutural do `PRIMARY KEY` sobre enum do analog.
- `modo text NOT NULL CHECK (modo IN ('off','dry_run','live'))` — mesma dupla camada
  `CHECK`-na-tabela + guard-na-RPC que `janela_meses` tem (`:135` e `:377-380`).
- `cap_titulares integer NOT NULL CHECK (cap_titulares BETWEEN 1 AND ...)`.
- `janela_notificacoes_meses integer NOT NULL DEFAULT 24` (D-46-20 — escalar próprio,
  **não** derivado de `max(janela_meses)`).

**Trigger de `atualizado_em` — REUSAR, nunca redefinir** (`:193-206`):

```sql
-- A função de carimbo já existe desde a P37 (`20260722000002:144`) [...] Ela **NÃO é
-- redefinida aqui** — redefini-la criaria divergência com a versão viva sem ganho nenhum.
-- `CREATE TRIGGER` PURO, sem `DROP` prévio: é o idioma deliberado, que prefere
-- FALHAR ALTO contra um trigger inesperado a substituí-lo em silêncio.
CREATE TRIGGER trg_config_retencao_atualizado_em
  BEFORE UPDATE ON public.config_retencao_etapa
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();
```

**Seed idempotente** (`:222-232`): `ON CONFLICT (…) DO NOTHING`, **JAMAIS upsert** — a
razão está em `:212-217` ("um `DO UPDATE` aqui transformaria um reapply acidental numa
REVOGAÇÃO SILENCIOSA de política escolhida por um humano").

**A RPC auditada — `salvar_config_purga(...)`** — molde é `salvar_janela_retencao`
(`:322-438`). Os SEIS passos do corpo, na ordem, com o SQLSTATE de cada recusa:

```sql
CREATE OR REPLACE FUNCTION public.salvar_janela_retencao(
  p_etapa public.etapa_processo,
  p_meses integer
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid; v_antes integer; antes jsonb; depois jsonb;
BEGIN
  -- (1) GUARD DE PAPEL, NULL-SAFE. `IS DISTINCT FROM`, NUNCA `NOT IN`.
  --     [o idioma NOT IN é NULL-CEGO e FALHA ABERTO — defeito REAL medido na 42-06,
  --      61 funções DEFINER com EXECUTE para anon]
  IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode alterar a janela de retencao'
      USING ERRCODE = '42501';
  END IF;

  -- (2) O ATOR É RESOLVIDO NO SERVIDOR, nunca recebido por parâmetro.
  SELECT u.id INTO v_actor
    FROM public.usuarios_rh u
   WHERE u.user_id = (select auth.uid()) AND u.ativo AND u.deleted_at IS NULL;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: nenhuma conta de RH viva corresponde ao chamador'
      USING ERRCODE = '42501';
  END IF;

  -- (3) O TETO É IMPOSTO NO SERVIDOR. `p_meses IS NULL` entra no mesmo ramo de
  --     propósito: a comparação `NULL < 1` avaliaria NULL e cairia para o CHECK.
  IF p_meses IS NULL OR p_meses < 1 OR p_meses > 24 THEN
    RAISE EXCEPTION 'VALIDATION: janela de % meses fora do intervalo permitido (1 a 24); …', coalesce(p_meses::text, 'NULL')
      USING ERRCODE = '22023';
  END IF;

  -- (4) Estado anterior + LOCK da linha (serializa alterações concorrentes).
  SELECT to_jsonb(c), c.janela_meses INTO antes, v_antes
    FROM public.config_retencao_etapa c
   WHERE c.etapa = p_etapa
   FOR UPDATE;

  -- (5) NO-OP É RECUSA, não sucesso silencioso.
  IF v_antes = p_meses THEN
    RAISE EXCEPTION 'VALIDATION: a janela de % ja e de % meses — nada a alterar', p_etapa, p_meses
      USING ERRCODE = '22023';
  END IF;

  -- (6) A mutação + (7) A LINHA DE AUDITORIA, NA MESMA TRANSAÇÃO.
  UPDATE public.config_retencao_etapa c
     SET janela_meses = p_meses, origem = 'admin', alterado_por = v_actor
   WHERE c.etapa = p_etapa;

  SELECT to_jsonb(c) INTO depois FROM public.config_retencao_etapa c WHERE c.etapa = p_etapa;

  PERFORM public.log_auditoria(
    p_usuario_id   := v_actor,
    p_usuario_tipo := 'admin',
    p_acao         := 'alterar_janela_retencao',
    p_categoria    := 'configuracao',
    p_descricao    := format('Janela de retencao da etapa %s alterada de %s para %s meses', p_etapa, v_antes, p_meses),
    p_severidade   := 'aviso',
    p_recurso_tipo := 'config_retencao_etapa',
    p_recurso_id   := NULL::uuid,
    p_dados_antes  := antes,
    p_dados_depois := depois,
    p_sucesso      := true
  );
END;
$$;
```

⚠ **`categoria='configuracao'` e `severidade='aviso'` são valores MEDIDOS dos enums
vivos** (`:421-423`) — não inventar valor novo para `log_auditoria` nesta fase.

⚠ **O acréscimo desta fase (PURGA-04 / D-46-14):** a transição `dry_run → live` é
**recusável no servidor**, no passo (3), com os critérios consultados em
`purga_execucoes` (≥14 dias, ≥14 execuções com ledger, ≥1 com `elegiveis > 0`) mais a
pré-condição de D-46-22 (as 3 linhas da allowlist com `origem <> 'seed'`). O molde é
exatamente o guard de teto do passo (3): *"uma regra que só vive na tela é uma regra que
não existe"* (`:396-398`).

**COMMENT ON FUNCTION** — o molde é `:440-455`: ele **enumera a ordem do corpo e o
SQLSTATE de cada recusa**. O `COMMENT` desta fase tem de fazer o mesmo, e mais: registrar
a lacuna nomeada de D-46-19 (rascunho/funil ativo nunca purgado) no `COMMENT` da coluna
`elegivel_purga`, no idioma de `20260801000002:167-179`, que é onde a dependência
Phase 43 → Phase 46 foi escrita **dentro do banco**.

---

### 2 · `retencao_hold` — tabela-guarda aditiva, vazia por padrão (D-46-04)

**Analog:** `supabase/migrations/20260804000002_p44_solicitacoes_dados.sql:90-200`.

**Tabela com CHECKs nomeados** (`:90-110`) — note que as constraints são **nomeadas
explicitamente**, não deixadas ao default, quando o nome é load-bearing:

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
  CONSTRAINT ck_solicitacoes_dados_tipo      CHECK (tipo IN ('acesso', 'exclusao')),
  CONSTRAINT ck_solicitacoes_dados_situacao  CHECK (situacao IN ('atendido', 'pendente')),
  CONSTRAINT ck_solicitacoes_dados_causa
    CHECK (causa IS NULL OR causa IN ('falha_geracao', 'curriculo_ausente', 'permissao'))
);
```

**RLS com UMA policy de leitura e ZERO de escrita** (`:179-200`) — e o `COMMENT ON POLICY`
que explica **por que a ausência de escrita não é esquecimento**:

```sql
ALTER TABLE public.solicitacoes_dados ENABLE ROW LEVEL SECURITY;

CREATE POLICY solicitacoes_dados_candidato_own_read ON public.solicitacoes_dados
  FOR SELECT TO authenticated
  USING (candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = (select auth.uid())));

COMMENT ON POLICY solicitacoes_dados_candidato_own_read ON public.solicitacoes_dados IS
  '… ⚠ ZERO POLICY DE ESCRITA PARA O CANDIDATO, E A RAZAO NAO E OBVIA: se ele pudesse inserir, ele '
  'poderia tambem NAO inserir … O registro e AFIRMACAO DO SERVIDOR SOBRE UM FATO DO SERVIDOR.';
```

**FK sem `ON DELETE`, com o silêncio JUSTIFICADO** (`:126-131`) — o idioma para quando a
decisão pertence a outra fase. Vale para `retencao_hold.candidatura_id`.

**Consumo por `NOT EXISTS`** — ver §3. `retencao_hold` nasce vazia e **a asserção do smoke
tem de responder "isto passaria se o conjunto fosse vazio?"** antes de contar como prova.

---

### 3 · Edições em `candidaturas_alem_da_janela()` (D-46-01..04 · D-46-19 · PURGA-07)

**Analog 1 — o corpo vivo a editar:** `20260801000004_p43_previa_retencao.sql:174-201`
(citado integralmente na §Code Examples da RESEARCH; **não reescrever, ADICIONAR
cláusulas ao `WHERE`**).

**Analog 2 — o idioma NULL-safe, e a razão dele:** `20260730000005_p42_invent05_not_exists.sql:40-91`.
Ler as três premissas encadeadas (`:42-56`) e a tese em `:71-91`:

```
-- A forma nova pergunta pela **inexistência de uma linha correspondente** em vez
-- de negar pertencimento a um conjunto de valores. [...] A forma adotada aqui é imune
-- **por construção**, não por vigilância. Numa fase cujo tema é "toda promessa
-- precisa de código que a execute", trocar uma garantia estrutural por uma
-- garantia de atenção humana seria contradizer a própria tese.
```

E a forma executada (`20260730000005:123-136`):

```sql
SELECT cron.schedule(
  'ai-logs-retention-cleanup', '0 2 * * *',
  $CRON$
    DELETE FROM public.ai_call_logs l
     WHERE l.retain_until < now()
       AND NOT EXISTS (
         SELECT 1 FROM public.candidate_ai_decisions d
          WHERE d.status IN ('candidate_review_requested', 'human_reviewing')
            AND l.id = ANY(d.ai_call_log_ids)
       );
  $CRON$
);
```

**Analog 3 — o `COMMENT ON FUNCTION` que já endereça esta fase por nome:**
`20260801000004:218-251`. Ele contém, verbatim, `'SE VOCE VEIO DA PHASE 46 PARA ESCREVER
O DELETE (PURGA-02): CHAME ESTA FUNCAO, nao copie o corpo'` e a lista de exceções
declarada **extensível e incompleta por desenho** (`:239-242`). **Esse `COMMENT` tem de
ser reescrito nesta fase**, fechando as exceções que a 43 deixou abertas e declarando
D-46-01/D-46-02 como **satisfeitas por ausência** — porque "uma decisão registrada como
ausência é indistinguível de um esquecimento quando o próximo leitor chega".

**Analog 4 — agrupamento por titular (D-46-11), a expressão a CONSUMIR e não duplicar:**
`20260801000004:357-376` — `previa_retencao_total()` já implementa exatamente a forma
"titular cujas candidaturas estão TODAS fora da janela":

```sql
  RETURN QUERY
    WITH fora AS (
      SELECT * FROM public.candidaturas_alem_da_janela()
    ),
    vivas AS (
      SELECT c.id, c.candidato_id FROM public.candidaturas c WHERE c.deleted_at IS NULL
    )
    SELECT count(DISTINCT f.candidato_id)::bigint, now()
      FROM fora f
     WHERE NOT EXISTS (
             SELECT 1 FROM vivas v
              WHERE v.candidato_id = f.candidato_id
                AND NOT EXISTS (SELECT 1 FROM fora f2 WHERE f2.candidatura_id = v.id)
           );
```

⚠ `titulares_alem_da_janela()` **é a mesma expressão sem o `count`**. Se ela nascer,
o smoke da 43 asserção (f) (`p43_previa_smoke.sql:440-471`) tem de ser revisto: ele
conta exatamente 2 wrappers (`:465-467`) e proíbe qualquer wrapper de referenciar
`config_retencao_etapa` diretamente (`:460-462`).

---

### 4 · Ledger `purga_execucoes` + `purga_execucao_itens` (D-46-15/16 · PURGA-06)

**Analog A — shape de ledger, RLS de leitura vaga-scoped, COMMENT ON TABLE:**
`20260721000001_notificacoes_enviadas.sql:66-158`.

```sql
-- ---------------------------------------------------------------------------
-- 2 · Tabela (16 colunas, na ordem de `ordinal_position` do catálogo)
-- ---------------------------------------------------------------------------
-- Os nomes das constraints auto-geradas pelo Postgres são LOAD-BEARING [...]
-- `uq_notif_dedupe` NÃO é um nome default — por isso é declarado explicitamente.
CREATE TABLE public.notificacoes_enviadas (
  id                   uuid                      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento               text                      NOT NULL CHECK (evento IN ('confirmacao','avanco','convite','decisao')),
  candidatura_id       uuid                      NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  …
  criado_em            timestamptz               NOT NULL DEFAULT now(),
  CONSTRAINT uq_notif_dedupe UNIQUE (dedupe_key)
);

-- 4 · RLS
-- EXATAMENTE UMA policy, `SELECT`, `{authenticated}` [...]
-- Não existe policy de INSERT/UPDATE/DELETE → só `service_role` escreve.
-- [...] a AUSÊNCIA de policy nunca abre.
ALTER TABLE public.notificacoes_enviadas ENABLE ROW LEVEL SECURITY;
```

⚠ **`COMMENT ON TABLE` a reescrever nesta fase** (`:143-144`) — o texto vivo termina em
`'Retention INDEFINITE in v1 (LGPD-OPS purge deferred to M8).'`, e essa frase é
literalmente a promessa-sem-código que RETEN-05 fecha (D-46-17).

**Analog B — vocabulário fechado por CHECK + COMMENT por coluna que explica o
vocabulário:** `20260804000002:133-163`. O padrão de `causa` (`:147-153`) é o molde
direto para `veredito` e `ancora_origem`:

```
-- COMMENT ON COLUMN … causa IS
--  'Vocabulario FECHADO, verbatim da 44-UI-SPEC …: falha_geracao, curriculo_ausente,
--   permissao. NULL quando a situacao e atendido. […] ⚠ Divergencia entre os dois lados
--   produz celula em branco na fila do RH — que e pior que um token cru, porque parece
--   dado ausente em vez de vocabulario dessincronizado. NUNCA guarda a mensagem crua do
--   transporte, codigo HTTP, stack ou caminho de Storage.'
```

⚠ Essa última frase — *"NUNCA guarda a mensagem crua do transporte, código HTTP, stack ou
caminho de Storage"* — é exatamente a disciplina de **zero PII** que D-46-15 exige do
ledger, já escrita neste repositório. Copiar a forma para
`purga_execucao_itens.relato_dry_run`.

**Analog C — a justificativa de retenção indefinida em `COMMENT ON TABLE` (D-46-16):**
o molde de "COMMENT que declara a razão, não a estrutura" é `20260801000002:153-165`.

---

### 5 · ⛔ O 4º ramo autorizado em `anonimizar_candidato` (D-46-18 / Blocker B-01)

**Analog:** `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql`.
**Este é o plano que edita uma função destrutiva provada em produção.** As três metades
existentes têm de ser excertadas verbatim no plano, para que o ramo novo case o idioma.

**Normalização da intenção, UM lugar só** (`:307-311`):

```sql
  -- ⚠ UM LUGAR SÓ, E É ESTE. Três `coalesce` espalhados pelos três sítios é como um
  -- quarto sítio nasce sem ele. A partir daqui o corpo NÃO consulta `p_dry_run` em
  -- lugar nenhum […] uma leitura nova do parâmetro cru é a regressão a procurar em
  -- qualquer diff futuro deste arquivo.
  v_dry_run    boolean := coalesce(p_dry_run, true);
  v_uid        uuid := auth.uid();
  v_role       text := (select auth.jwt() #>> '{app_metadata,role}');
```

**Metade (a) — sessão** (`:341-349`):

```sql
  -- ── GUARD, TRÊS METADES: (a) sessão · (b) papel · (c) INTENÇÃO ────────────
  -- (a) chamador SEM claim nenhuma é recusado EXPLICITAMENTE. […] um guard confiado
  --     só ao ACL é um controle confiado a uma configuração de schema que ninguém relê.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao nao anonimiza ninguem'
      USING ERRCODE = '42501';
  END IF;
```

**Metade (b) — papel, com as DUAS formas desde o 45-13** (`:362-403`):

```sql
  IF v_dry_run THEN
    IF v_role IS DISTINCT FROM 'rh'
       AND v_role IS DISTINCT FROM 'administrador'
       AND v_dono IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'FORBIDDEN: o dry-run da anonimizacao so pode ser lido por rh, por administrador ou pelo proprio titular daquele candidato'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF v_role IS DISTINCT FROM 'administrador'
       AND v_dono IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'FORBIDDEN: a anonimizacao REAL so pode ser executada por administrador ou pelo proprio titular daquele candidato. …'
        USING ERRCODE = '42501';
    END IF;
  END IF;
```

⚠ `:372-375` declara, dentro do arquivo, que **a metade (a) NÃO é tocada** e que aceitar
`auth.uid() IS NULL` sob `service_role` é a saída **recusada** (DI-45-07-01 + decisão do
operador de 2026-08-05). O ramo novo de D-46-18 **não pode** ser escrito relaxando (a).

**Metade (c) — intenção, e o modelo EXATO do ramo novo** (`:405-449`):

```sql
  IF NOT v_dry_run THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.solicitacoes_dados s
       WHERE s.candidato_id = p_candidato_id
         AND s.tipo         = 'exclusao'
         AND s.situacao     = 'executando'
         AND s.executar_em <= now()
         AND s.storage_concluido_em IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN: anonimizar_candidato so executa DENTRO do motor. As QUATRO condicoes exigidas sao: …'
        USING ERRCODE = '42501';
    END IF;
  END IF;
```

⚠ **A propriedade que o ramo novo tem de replicar**, escrita em `:418-423`:

```
--     ⚠ NULL-SAFE POR CONSTRUÇÃO, e é por isso que não há `IS NOT NULL` sobre
--     `executar_em`: com a coluna nula o predicado `s.executar_em <= now()` avalia
--     NULL, a linha NÃO é selecionada, o `NOT EXISTS` é TRUE e a função RECUSA. Falha
--     FECHADA sem cláusula extra — o oposto do `NOT IN`, que avalia NULL e falha ABERTO.
```

E `:425-429` nomeia a dependência de segurança que agora passa a valer também para
`purga_execucoes`/`purga_execucao_itens`: *"DE QUE ESTE GUARD DEPENDE: da segurança de
`public.solicitacoes_dados`. Quem escrever `situacao` e `storage_concluido_em` naquela
tabela autoriza o tombstone."*

**O bloco de auto-verificação que ABORTA o apply** (`:1000-1028`) — espelho verbatim, com
as tabelas trocadas:

```sql
  -- […] o apply aborta quando o papel PODE DE FATO ESCREVER: tem o
  -- privilégio E (a RLS está desligada OU existe policy de UPDATE que o alcance).
  SELECT has_table_privilege('authenticated', 'public.solicitacoes_dados', 'UPDATE')
      OR has_column_privilege('authenticated', 'public.solicitacoes_dados', 'situacao', 'UPDATE')
      OR has_column_privilege('authenticated', 'public.solicitacoes_dados', 'storage_concluido_em', 'UPDATE')
    INTO v_priv_upd;

  SELECT c.relrowsecurity INTO v_rls_on
    FROM pg_class c WHERE c.oid = 'public.solicitacoes_dados'::regclass;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = 'solicitacoes_dados'
       AND p.cmd IN ('UPDATE', 'ALL')
       AND ('authenticated' = ANY (p.roles) OR 'public' = ANY (p.roles))
  ) INTO v_pol_upd;

  IF coalesce(v_priv_upd, false)
     AND (coalesce(v_rls_on, false) = false OR coalesce(v_pol_upd, false)) THEN
    RAISE EXCEPTION 'P45-TOMBSTONE: o papel authenticated PODE ESCREVER em public.solicitacoes_dados (privilegio=%, rls_ligada=%, policy_de_update=%). O guard de INTENCAO da metade (c) acaba de perder o valor […] O apply para AQUI, antes de criar essa porta. Saidas honestas: …',
      v_priv_upd, v_rls_on, v_pol_upd;
  END IF;

  IF coalesce(v_priv_upd, false) THEN
    RAISE NOTICE 'P45-TOMBSTONE: authenticated tem o GRANT de UPDATE …, mas a RLS esta LIGADA […] ⚠ ISSO TORNA A RLS DAQUELA TABELA PARTE DO GUARD DE INTENCAO desta funcao …';
  END IF;
```

⚠ Note o segundo `IF` (`:1026-1028`): quando a condição é apenas *parcialmente*
alarmante, ele **avisa em vez de abortar**, e declara que a RLS daquela tabela virou parte
do guard. O bloco de D-46-18 tem de ter as duas metades.

**ACL** (`:826-836`) — `REVOKE … FROM PUBLIC, anon, authenticated` + `GRANT … TO service_role`.

---

### 6 · O dry-run pela MESMA expressão, terminado por `RAISE ... USING ERRCODE` (PURGA-02)

**Analog:** `20260805000006:758-777`.

```sql
  GET DIAGNOSTICS v_n_notif = ROW_COUNT;

  -- ══ DRY-RUN — AO FIM DO MESMO CORPO, NUNCA UM SEGUNDO CORPO ═══════════════
  -- Tudo acima já executou de verdade; o `RAISE` reverte a transação inteira. É
  -- essa forma — e não `IF p_dry_run THEN <query A> ELSE <query B>` — que garante
  -- que o que o dry-run mostra é literalmente o que o delete real faz. A forma de
  -- dois corpos é o parente direto do CR-02 da P39, uma guarda que era dead code.
  -- O `ERRCODE` é PRÓPRIO para que o chamador distinga "dry-run concluído" de "erro
  -- real": um erro real disfarçado de sucesso de dry-run seria o pior falso verde
  -- desta fase, e no sentido inverso um P45DR chegando no caminho real passaria por
  -- sucesso quando nada foi apagado.
  IF v_dry_run THEN
    RAISE EXCEPTION 'P45 DRY-RUN concluido: o corpo COMPLETO da anonimizacao executou e esta sendo revertido agora. Nada foi persistido. candidatos=% … Para executar de verdade, chame com p_dry_run := false — o modo seguro e o DEFAULT, e apagar exige dize-lo',
      v_n_cand, … USING ERRCODE = 'P45DR';
  END IF;
```

**Envelope de subtransação para fixture/teardown** (`:839-849`):

```sql
-- ⚠ ESTE É O BLOCO MAIS IMPORTANTE DESTE ARQUIVO […]: uma sentinela que viola formato
-- só se revela num apply que EXECUTA. "Não lançou" não é "completou" — o gate anterior
-- deste projeto media a recusa e chamava aquilo de cobertura, e o 42804 da P43
-- sobreviveu a um smoke 10/10 verde.
--
-- Envelope: subtransação encerrada por `RAISE EXCEPTION`, que o Postgres reverte
-- inteira. Método exercitado em PROD pela SONDA 6 (§6d), com verificação de
-- integridade provando zero resíduo — inclusive de DDL, porque Postgres reverte DDL.
```

⚠ Regra herdada da lição nº 6 dos sete portões (RESEARCH §Validation Architecture):
**nenhuma asserção pode ser posicionada DEPOIS do rollback da própria fixture.**

**Lado do chamador — como distinguir P45DR de erro real:**
`supabase/functions/executar-direito-titular/index.ts:975-999` mostra o tratamento em
TypeScript (o SQLSTATE de dry-run chegando no caminho real vira `ErroDePasso`, **jamais**
sucesso). No loop plpgsql, o equivalente é `WHEN SQLSTATE 'P45DR'` e **nunca** `WHEN OTHERS`.

---

### 7 · Sweep + hop `net.http_post` + cron idempotente (PURGA-01 · D-46-10/13)

**Analog:** `supabase/migrations/20260727000001_p41_recon_retry.sql:134-227`. Copiar a
seção (C) inteira como esqueleto.

**Leitura de Vault + graceful-skip + loop com dispatch isolado** (`:144-199`):

```sql
CREATE OR REPLACE FUNCTION public.varrer_retry_notificacoes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text; v_invoke_key text; r record;
BEGIN
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN;  -- segredos ausentes — varredura adiada, ledger intacto (graceful-skip)
  END IF;

  FOR r IN
    SELECT id, evento, candidatura_id, dedupe_key
      FROM public.notificacoes_enviadas
     WHERE status IN ('pendente','falhou')
       AND tentativas < 5
       AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= pg_catalog.now())
     ORDER BY proxima_tentativa_em NULLS FIRST
     LIMIT 20
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := v_project_url || '/functions/v1/notificar-candidato',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_invoke_key
        ),
        body := jsonb_build_object('retry_id', r.id, 'evento', r.evento, …)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'varrer_retry: dispatch falhou id=% (%: %)', r.id, SQLSTATE, SQLERRM;
    END;
  END LOOP;
END;
$$;
```

⚠ **Duas divergências OBRIGATÓRIAS para a purga** (RESEARCH §Code Examples):
1. `RAISE WARNING` vira **linha de ledger** — `WARNING` não marca o job como `failed` nem
   chega ao `return_message`.
2. O graceful-skip do Vault grava `veredito='segredo_ausente'` **antes** do `RETURN`.

**Leitora de Vault escopada a UM segredo** (`:101-132`) — se a fase precisar de leitora
própria, o molde é `ler_resend_webhook_secret()`, com a razão de segurança em `:96-99`
("uma RPC genérica `ler_segredo(text)` faria um comprometimento de service_role ler TODOS
os segredos do Vault; escopar ao literal limita o blast-radius a UM"). ACL em `:120-123`:
`REVOKE` de PUBLIC/anon/authenticated em três linhas + `GRANT EXECUTE … TO service_role`.

**Cron idempotente** (`:215-227`) — verbatim, e o mesmo par existe em `20260730000005:120-123`:

```sql
-- unschedule guard ANTES do schedule: re-aplicar a migration NÃO duplica o job
-- (anti-pattern RESEARCH). O corpo do job é o $sweep$ que só chama a função.
SELECT cron.unschedule('notif-retry-sweep')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notif-retry-sweep');

SELECT cron.schedule(
  'notif-retry-sweep',
  '*/15 * * * *',
  $sweep$ SELECT public.varrer_retry_notificacoes(); $sweep$
);
```

⚠ **O corpo do job é SÓ a chamada da função** — isso mantém `md5(command)` estável e
comparável, e põe toda a lógica onde `md5(prosrc)` a pina.

**Escopo negativo do arquivo de cron** — copiar de `20260730000005:93-116`:

```
-- ESCOPO NEGATIVO — o que esta migration deliberadamente NÃO faz
--   · Não cria nem remove nenhum agendamento além do alvo nomeado abaixo. Os
--     outros dois agendamentos vivos do sistema não são sequer mencionados neste
--     arquivo — a ausência dos nomes deles aqui é asserida por grep […]
--   · Não executa a purga. Substituir um agendamento não o dispara.
```

---

### 8 · RETEN-05 — `DELETE` de retenção de `notificacoes_enviadas` (D-46-17/20)

**Analog A (a forma do DELETE em cron):** `20260730000005:123-136` (acima).
**Analog B (a tabela e a âncora NOT NULL):** `20260721000001:75-93` — `criado_em
timestamptz NOT NULL DEFAULT now()` (`:88`) é a **única** coluna temporal NOT NULL;
`enviado_em`/`entregue_em` (`:90-91`) e `bounce_em`/`reclamado_em` (`20260727000001:73-77`)
são todas nulas. Ancorar em coluna NOT NULL é a mesma propriedade load-bearing do quarto
degrau do predicado (`20260801000004:230-234`).

**Analog C (o COMMENT a reescrever):** `20260721000001:143-144`, verbatim:

```sql
COMMENT ON TABLE public.notificacoes_enviadas IS
  'Phase 37 / LEDGER-01/02/03: audit trail of every notification dispatch. RH vaga-scoped via rh_le_notificacoes join-through; candidato-DENY. Writes ONLY via P38 EF service_role. UNIQUE(dedupe_key) durable idempotency. Retention INDEFINITE in v1 (LGPD-OPS purge deferred to M8).';
```

⚠ O `COMMENT` reescrito tem de conter a janela e o nome da âncora — e a asserção (n) do
smoke novo assere que `'INDEFINITE'` **desapareceu**. Note também que as FKs
`ON DELETE CASCADE` (`:78-79`) já levam as notificações junto na purga do titular; a regra
independente é o **acréscimo** que RETEN-05 pede.

---

### 9 · EF `supabase/functions/purgar-retencao/`

⚠ **Esta EF é um HÍBRIDO de dois analogs**, e a divisão é deliberada:

**Analog de ESTRUTURA/MOTOR:** `supabase/functions/executar-direito-titular/index.ts` (1575 linhas).

- **Docblock de topo** (`:1-40`): declara a fase/planos/requirements, avisa em caixa alta
  o que a função destrói, enumera o vocabulário fechado de ações, e mantém uma **tabela
  de DESVIOS nomeados** contra o molde (`:36-40`). O docblock desta EF nova tem de
  nomear o desvio central: *ela não tem sessão de titular de onde derivar o alvo*.
- **Handler testável com deps injetadas** (`:401-405`):
  ```ts
  /**
   * Handler testável: recebe `deps` injetados. O `Deno.serve` (no fim do arquivo) monta
   * o two-client real a partir do env + do header Authorization e delega aqui.
   */
  export async function handler(req: Request, deps: Deps): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);
  ```
- **⚠⚠ A DIVISÃO DOS CLIENTS — o docblock que a RESEARCH nomeou** (`:409-419`), verbatim:
  ```ts
  // ── ⚠ A DIVISÃO DOS CLIENTS, E A RAZÃO MEDIDA (45-12 / `DI-45-10-01`) ──────
  //    `supabaseTitular` leva as claims; `supabaseAdmin` NÃO. O `Authorization` é o
  //    MESMO header para PostgREST, para a Storage API e para a Auth Admin API —
  //    acrescentá-lo ao client de serviço não "melhora as RPCs": troca o papel de
  //    TODAS as chamadas dele para `authenticated` de uma vez. `deleteUser` passa a
  //    403, `ler_resend_api_key` está REVOGADA de `authenticated` desde a P36 […]
  //    Os dois últimos falhariam DEPOIS da mutação irreversível, quando já não há
  //    conta a quem responder. Cada chamada fica no papel de que ela precisa.
  const { supabaseAdmin, supabaseUser, supabaseTitular } = deps;
  ```
  ⚠ **Aqui está o Blocker B-01 do lado do TypeScript:** a EF nova **não tem
  `supabaseTitular`**, porque não existe titular. É por isso que o guard do banco precisa
  do 4º ramo (§5) — e é a razão pela qual esta EF **não pode** simplesmente injetar um
  `Authorization` de operador.
- **Classe de erro atribuída a passo** (`:384-394`):
  ```ts
  /**
   * Falha ATRIBUÍDA a um passo. O tipo existe porque o `catch` genérico não consegue
   * saber em qual dos três sistemas a mutação parou — e essa é a única pergunta que
   * importa às 3 da manhã sobre um arquivo que não tem cópia de reserva.
   */
  class ErroDePasso extends Error {
    constructor(readonly passo: PassoMotor, readonly classe: string) { … }
  }
  ```
- **Ordem Storage → Postgres → Auth, com carimbo por passo** (`:841-1000`). Ler
  `:841-850` (nunca `DELETE FROM storage.objects`) e `:960-999` (a chamada da RPC + o
  tratamento de `SQLSTATE_DRY_RUN` + *"Não lançou NÃO é a mesma coisa que completou"*).
- **Erro de query NUNCA vira 403** (`:480-484`): *"Um erro transitório virando 403 é uma
  mentira sobre autorização — e é o tipo de mentira que ninguém investiga."*
- **O payload SELECIONA, o banco AUTORIZA** (`:437-445`) — a "emenda de um único campo",
  que é exatamente o molde para o `item_id`/`candidato_id` do POST desta EF (Pitfall 11):
  ```ts
  //      ⚠ **A EMENDA DE UM ÚNICO CAMPO (45-12).** `candidatura_id` é lido do corpo, e
  //      SÓ na ação `retirar_candidatura`. Ele **seleciona** qual das candidaturas do
  //      titular, e **não autoriza** nada: quem autoriza é o guard da RPC […] Nenhum
  //      outro identificador do corpo é lido em lugar nenhum desta função, e dizer isso
  //      nominalmente é o que obriga a PRÓXIMA emenda a se justificar sozinha.
  ```

**Analog de AUTENTICAÇÃO (`verify_jwt = false` + Bearer do Vault):**
`supabase/functions/cost-alerter/index.ts:90-113` e `notificar-candidato/index.ts:106-112`:

```ts
// ---- 1) Self-authenticate the Vault Bearer (T-09-22) ----------------------
const authHeader = req.headers.get('Authorization') ?? ''
const bearer = authHeader.startsWith('Bearer ')
  ? authHeader.slice('Bearer '.length).trim()
  : ''
// … compara contra o segredo esperado …
console.warn('[cost-alerter] Rejected request: invalid/absent Bearer')
return errorResponse('UNAUTHORIZED', 'Não autorizado.', 401)
```

E o docblock de `cost-alerter/index.ts:9-13` declara a razão: *"fires `net.http_post` to
this EF with a Vault Bearer […] the handler MUST authenticate itself; 401 on
absent/mismatch."*

**Teste Deno:** `supabase/functions/executar-direito-titular/index.test.ts:1-30`.
⚠ **Nota de layout medida:** esta EF põe o teste em `index.test.ts` **na raiz da pasta**,
não em `__tests__/`. Ambos os layouts existem no repo; o que importa é a linha de
`exclude` (§11). O cabeçalho do teste (`:17-30`) enumera os comportamentos por letra, com
o que cada um protege — copiar essa forma, incluindo o caso (i): *"`candidato_id` alheio
NO CORPO → IGNORADO; opera sobre o de `auth.uid()` (classe T-32-03)"*, que aqui vira
"item forjado no corpo → 403, porque o banco reverifica o encontro".

---

### 10 · `supabase/tests/p46_purga_smoke.sql`

**Analog A — estrutura e disciplina de pin:** `supabase/tests/p45_motor_exclusao_smoke.sql`.

**O bloco de PROVENIÊNCIA dos md5** (`:217-265`) — **copiar integralmente, com os valores
re-medidos**. É o que torna um re-pin auditável:

```
-- PROVENIENCIA DOS RESUMOS md5 (nao apagar — e o que torna um re-pin auditavel)
--   valor  : 8c86e0f040219e7eade47eb587dbf5de   (anonimizar_candidato — octetos: 34488)
--   origem : corpo entre os dois delimitadores NOMEADOS de cifrao […]
--   medido : 2026-08-13, POR EXECUCAO contra PROD (nao transcrito, nao inventado).
--            ⚠ E a medicao que autoriza o pin nao e "li o valor vivo e copiei" — isso
--            pinaria o que esta aplicado, seja la o que for, e o gate deixaria de
--            comparar. A conferencia feita foi a CRUZADA, nos dois lados:
--              md5(prosrc) VIVO (pg_proc, via MCP somente-leitura)  ==
--              md5(corpo)  do ARQUIVO commitado (extracao pelo comando abaixo)
--   recomputar (se e somente se a migration mudar):
--     node -e 'const f=require("fs").readFileSync(process.argv[1],"utf8"),
--       D="$"+process.argv[2]+"$", a=f.indexOf(D), b=f.indexOf(D,a+D.length);
--       console.log(require("crypto").createHash("md5")
--         .update(f.slice(a+D.length,b),"utf8").digest("hex"))' \
--       supabase/migrations/20260805000006_p45_anonimizar_candidato.sql \
--       anonimizar_candidato
--   ⚠ Se um resumo for re-pinado sem que a migration tenha mudado, (C3) deixa de
--     provar qualquer coisa. Re-pinar e ATO CONSCIENTE E REVISAVEL.
```

E a **única divergência autorizada** (`:257-264`): se um pin não bater **E** o
`md5(statements[1])` do apply tiver batido o md5 do arquivo, a divergência é de EXTRAÇÃO.
*"NUNCA o contrario — nunca afrouxar a assercao, nunca trocar o md5 por `strpos`, nunca
marcar (C3) como opcional."*

**A asserção de pin em si** (`p45_motor_exclusao_smoke.sql:1584-1614`):

```sql
RESET ROLE;
DO $c3$
DECLARE
  -- ⚠ PINADOS em 2026-08-13 por EXECUCAO, com conferencia CRUZADA vivo × arquivo
  v_pin_anon  text := '8c86e0f040219e7eade47eb587dbf5de';
  …
BEGIN
  SELECT p.prosrc, pg_get_functiondef(p.oid) INTO v_src_anon, v_def_anon
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'anonimizar_candidato';

  IF v_src_plano IS NULL OR v_src_anon IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C3): … nao existe — nao ha expressao unica, e o dry-run que o portao destrutivo exige nao teria o que comparar';
  END IF;
  …
```

**Analog B — a rede estrutural EMBAIXO do md5, e o contador GUC:**
`supabase/tests/p43_previa_smoke.sql:384-429`:

```sql
RESET ROLE;
DO $$
DECLARE
  v_src text; v_md5 text;
  v_esperado   text := 'ddfa6542921d241323c0124fc1bd1f99';
  v_tem_ancora boolean; v_tem_notex boolean; v_tem_notin boolean;
BEGIN
  SELECT p.prosrc INTO v_src
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'candidaturas_alem_da_janela';

  v_md5        := md5(v_src);
  v_tem_ancora := strpos(v_src, 'data_candidatura') > 0;
  v_tem_notex  := strpos(v_src, 'NOT EXISTS') > 0;
  v_tem_notin  := v_src ~ '\mNOT\s+IN\M';          -- FRONTEIRA DE PALAVRA, nunca strpos nu

  IF v_md5 IS DISTINCT FROM v_esperado THEN
    RAISE EXCEPTION 'P43P FAIL (e): o corpo VIVO do predicado NAO casa byte a byte com a migration. md5 vivo=% (esperado %), octetos=%, data-ancora presente=%, NOT EXISTS presente=%, NOT IN (forma banida) presente=% …',
      v_md5, v_esperado, octet_length(v_src), v_tem_ancora, v_tem_notex, v_tem_notin;
  END IF;

  -- ⚠ O md5 casou mas a FORMA está errada ⇒ alguém re-pinou sem a migration ter mudado.
  IF v_tem_notin OR NOT v_tem_notex OR NOT v_tem_ancora THEN
    RAISE EXCEPTION 'P43P FAIL (e): o md5 casou mas a FORMA esta errada (…) — o resumo esperado foi re-pinado sem a migration ter mudado';
  END IF;

  PERFORM set_config('smoke43p.pass', (coalesce(nullif(current_setting('smoke43p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P43P PASS (e): o corpo vivo do predicado casa byte a byte com a migration (md5 %, % octetos)', v_md5, octet_length(v_src);
END $$;
```

⚠ **Este `(e)` é o arquivo a RE-PINAR nesta fase** (pin atual `ddfa6542…`, linha 400), e a
rede estrutural (`v_tem_ancora`/`v_tem_notex`/`v_tem_notin`) tem de **ganhar checagens
novas** para `retencao_hold`, `vagas` e `elegivel_purga` — nunca ser afrouxada.

**Analog C — asserção que prova a expressão ÚNICA** (`p43_previa_smoke.sql:440-471`):
itera sobre `pg_get_functiondef` dos wrappers e reprova quem **não** chame o predicado
(`:454-456`) **e** quem referencie `config_retencao_etapa` diretamente (`:458-462`).
Esta é a asserção que satisfaz PURGA-02 **por construção** para os wrappers novos.

**Analog D — o contador de sessão (GUC)** (`p42_invent05_cron_smoke.sql:79-81`):
```sql
RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke42i.pass', '0', false);
```
⚠ Por isso o smoke roda numa **ÚNICA chamada** `execute_sql`: o contador é escopado à
sessão (`20260730000005:113-114`).

**Analog E — asserção negativa aferida sobre o CATÁLOGO, não sobre uma execução:**
`p43_previa_smoke.sql:153-157` e `:473-479`, e a nota sobre **fronteira de palavra vs
`strpos` nu** em `p45_motor_exclusao_smoke.sql:266-269`: `strpos(lower(prosrc),'update')`
REPROVARIA a implementação correta, porque `updated_at`/`deleted_at` contêm as palavras
como substring. Para PURGA-06 o equivalente é uma **banlist de nomes de coluna sobre
`information_schema.columns`** das duas tabelas do ledger.

---

### 11 · Emenda a `supabase/tests/p42_invent05_cron_smoke.sql` (D-46-23)

**A asserção atual, verbatim** (`:83-103`) — é ela que vai reprovar trabalho correto **com
diagnóstico falso**:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- (a) ESCOPO — continuam existindo EXATAMENTE 3 agendamentos. Nenhum foi criado,
--     nenhum foi removido. Um 4º significa guard de remoção condicional falho
--     (agendamento duplicado ⇒ a purga rodaria duas vezes por noite); um 2º
--     significa que algo além do alvo desapareceu.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_n int; v_nomes text;
BEGIN
  SELECT count(*), string_agg(jobname, ', ' ORDER BY jobname)
    INTO v_n, v_nomes
    FROM cron.job;

  IF v_n <> 3 THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (a): cron.job tem % agendamento(s) (esperado 3) — [%]. Um a mais = guard de remoção condicional falhou e o alvo ficou duplicado; um a menos = algo além do alvo sumiu', v_n, v_nomes;
  END IF;

  PERFORM set_config('smoke42i.pass', (coalesce(nullif(current_setting('smoke42i.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): exatamente 3 agendamentos em cron.job — nenhum criado, nenhum removido [%]', v_nomes;
END $$;
```

**A forma-alvo (invariante, não instantâneo)** — o padrão a copiar está em
`supabase/tests/p43_matriz_retencao_smoke.sql:220-252`, onde a mesma classe de defeito já
foi corrigida em 2026-08-03 **com o motivo escrito por extenso**. O invariante desta fase:
*os 3 jobs herdados (`ai-cost-aggregation`, `notif-retry-sweep`, `ai-logs-retention-cleanup`)
continuam existindo, intocados, E existe exatamente 1 job de purga* — asserido por
`jobname`, nunca por `count(*)` nu.

⚠ **NB sobre igualdade de nome** (`:71-73`): as asserções contam por igualdade exata de
`jobname`, sem `LIKE` — manter.

**A asserção (b) — fidelidade do corpo por md5** (`:105-129`) é o molde direto da asserção
equivalente para o job novo:

```sql
  SELECT command INTO v_cmd FROM cron.job WHERE jobname = 'ai-logs-retention-cleanup';
  IF v_cmd IS NULL THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (b): o agendamento … NÃO existe — a substituição em lugar removeu sem recriar';
  END IF;
  v_md5       := md5(v_cmd);
  v_tem_novo  := strpos(v_cmd, 'NOT EXISTS') > 0;
  v_tem_velho := v_cmd ~ '\mNOT\s+IN\M';
```

E o bloco de proveniência do resumo em `:57-69` (mesma disciplina do §10).

---

### 12 · `supabase/config.toml` — entrada da EF

**Analog:** `supabase/config.toml:26-38` (o bloco `verify_jwt = false`, com o comentário
que declara a postura):

```toml
[functions.cost-alerter]
verify_jwt = false

# EF server-interna self-auth (Bearer via Vault) — despachante das notificações M7 (Phase 38)
[functions.notificar-candidato]
verify_jwt = false

# EF pública chamada pelo Resend — self-auth pela assinatura Svix (não JWT de usuário) — Phase 41
[functions.resend-webhook]
verify_jwt = false
```

O cabeçalho do arquivo (`:7-9`) declara: *"`verify_jwt` derived from each EF's
grep-verified live deploy posture: false (3): the Vault Bearer self-auth EFs
(server-to-server / cron). Flipping one to `true` breaks the server-to-server
invocation; SEC-04 load-bearing."*

⚠ **Medição da RESEARCH confirmada nesta sessão:** `executar-direito-titular` **não tem
entrada** em `config.toml`. Portanto o analog do bloco é `cost-alerter`/`notificar-candidato`
(a família correta para uma EF disparada por cron), e não a EF de Phase 45.
A entrada nova: `[functions.purgar-retencao]` / `verify_jwt = false`, com comentário de
uma linha nomeando a fase e a postura.

---

### 13 · `vite.config.ts` — a linha de `exclude` que nasce ANTES do teste (Pitfall 12)

**Analog:** `vite.config.ts:87-93`, verbatim — o precedente é explícito sobre a ordem:

```ts
        // Phase 44 (exportação & acesso): a EF `exportar-meus-dados` importa
        // `createClient` de `https://esm.sh` e seu teste importa
        // `https://deno.land/std` assert → roda sob `deno test`, não Vitest.
        // O teste dela mora em `__tests__/`, que é EXATAMENTE o que o `include`
        // acima coleta. Caminho LITERAL, nunca glob de diretório.
        // ⚠ A linha nasce ANTES do teste de propósito (plano 44-01, Task 1):
        // uma entrada de `exclude` apontando para caminho inexistente é no-op
        // inofensivo; uma entrada que chega DEPOIS do teste deixa
        // `npm run test:run` vermelho no intervalo entre dois commits.
        'supabase/functions/exportar-meus-dados/**/*.test.ts',
```

E o precedente negativo, também escrito no arquivo (`:73-79`, Phase 42 / `notificar-rh`):
*"A ausência desta linha deixou `npm run test:run` não-zero em todo o repositório desde o
42-07: a falha é de CARGA do módulo ESM […], não de asserção — nenhum teste passou a
reprovar."*

**A linha a acrescentar:** `'supabase/functions/purgar-retencao/**/*.test.ts',` — caminho
literal, **no mesmo commit que cria a pasta e ANTES do teste**.

---

## Shared Patterns

### S-1 · Guard NULL-safe por `IS DISTINCT FROM`
**Fonte:** `20260801000002:338-354` (a explicação completa, 17 linhas) · aplicações em
`20260801000004:352-355`, `20260805000006:362-403`.
**Aplicar a:** toda função `SECURITY DEFINER` nova desta fase.
⚠ **Nunca `NOT IN`.** Com claim NULL, `NOT IN` avalia NULL, o `IF` não é tomado, o guard
**falha ABERTO**. Defeito real medido na 42-06 (61 funções DEFINER com EXECUTE para `anon`).

### S-2 · Exceção por `NOT EXISTS` correlacionado
**Fonte:** `20260730000005:40-91` (a razão) · `20260801000004:185-191` (a aplicação).
**Aplicar a:** as 4 exceções novas do predicado, o claim anti-sobreposição do Pitfall 6,
e o 4º ramo do guard de D-46-18.

### S-3 · Mutação + `log_auditoria` no MESMO corpo
**Fonte:** `20260801000002:417-436`.
**Aplicar a:** `salvar_config_purga` (toda escrita em `config_purga`).
`log_auditoria` é DEFINER com owner BYPASSRLS, então a linha sobrevive ao `REVOKE` de
INSERT que a P28 aplicou sobre `logs_auditoria`.

### S-4 · "Não lançou" ≠ "completou"
**Fonte:** `20260805000006:842-845` (SQL) · `index.ts:560-566` e `:993-998` (TS).
**Aplicar a:** todo consumo de RPC nesta fase — a RPC tem de devolver um dos resultados
nomeados, e a ausência é falha FECHADA. Precedente: *"o 42804 da P43 sobreviveu a um smoke
10/10 verde."*

### S-5 · Vocabulário fechado por `CHECK` + `COMMENT` que o enumera
**Fonte:** `20260804000002:102-110` e `:147-153`.
**Aplicar a:** `modo`, `veredito`, `ancora_origem`, `elegivel_purga` — todos em pt-BR
snake_case (CLAUDE.md §Key Conventions).

### S-6 · Zero policy de escrita; a escrita é RPC ou service_role
**Fonte:** `20260801000002:143-148` · `20260721000001:113-121` · `20260804000002:193-200`.
**Aplicar a:** `config_purga`, `retencao_hold`, `purga_execucoes`, `purga_execucao_itens`
— todas com RLS ligada e **zero policy de escrita**.
⚠ Isto não é higiene: com D-46-18, a segurança do guard destrutivo **passa a ser** a
segurança de `purga_execucoes`/`purga_execucao_itens`, e o bloco de auto-verificação da §5
aborta o apply se `authenticated` puder escrever nelas.

---

## No Analog Found

Nenhum. Os 14 artefatos têm analog. Três, porém, exigem **composição** de dois analogs e
merecem atenção do planejador:

| Artefato | Por quê |
|---|---|
| `functions/purgar-retencao/index.ts` | Estrutura de `executar-direito-titular` + auth de `cost-alerter`. **Nenhuma EF viva combina "disparada por cron" com "destrói três sistemas"** — esta é a primeira. |
| O 4º ramo do guard (D-46-18) | O molde da metade (c) existe, mas a tabela de que ele depende **ainda não existe** — ordenação obrigatória: ledger ANTES do guard. |
| Fixture de conjunto não-vazio | O método (subtransação + `RAISE`) existe (`20260805000006:847-849`); a fixture **durável de 14 dias** não tem precedente e precisa de plano de teardown escrito ANTES da criação (D-46-21). |

---

## Metadata

**Escopo de busca:** `supabase/migrations/`, `supabase/functions/`, `supabase/tests/`,
`supabase/config.toml`, `vite.config.ts`
**Arquivos lidos nesta sessão (integral ou por faixa):** 13
**Data de extração:** 2026-08-22
