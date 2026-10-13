# 52-32 — registro entre sessões (FRONTEIRA)

> Registro BRUTO das Tasks 1–7 do 52-32, uma seção por task, commitado sozinho em cada parada
> (`<context>` § «O registro entre sessões é `52-32-FRONTEIRA.md`, nunca o SUMMARY»). NÃO é
> completion record: o `52-32-SUMMARY.md` só nasce depois da resposta do operador na Task 8 e dobra
> estas seções sem reescrever as linhas de saída. A última linha `fronteira_retomada` diz de onde a
> próxima sessão parte.

---

## §Task 1 (tracer) — sessão A, 2026-10-12

Executor: sessão A (só a Task 1). Início 2026-10-12T23:22Z. Nada foi aplicado em PROD: a 0007 rodou
só dentro de `node scripts/p52_ensaio.cjs` (requisição que aborta). Nada empurrado, nenhum deploy.
STATE.md e ROADMAP.md não foram tocados; nenhum `52-32-SUMMARY.md` existe. Base da task (HEAD antes
do primeiro commit): `f360bee7a1a95183b588513c69476a99c62bb008`.

### Precondition (medida 2026-10-12T23:22Z, só leitura) — satisfeita

- `refs/gsd/52-31/sha` = `954b3e4b33a6cd290241793bf1df000083a49d81`, ancestral de `origin/main` (`git merge-base --is-ancestor` = 0; `origin/main` = `b0945868`).
- `git diff --quiet refs/gsd/52-31/sha HEAD -- . ':!.planning'` → rc=0 (nenhum código depois do último pin publicado).
- `node p46apply.cjs sql "set transaction read only; …"` → `{"no_ledger": 0, "ausente": true, "agora": "2026-10-12 20:22:40.917205-03"}` (`20261011000007` fora do ledger; `to_regprocedure('public.ler_testes_das_minhas_candidaturas()')` nulo).
- `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` → vazio.
- Nenhum `52-32-SUMMARY.md` nem `52-32-FRONTEIRA.md` no diretório da fase.

### Passo 0 — medição só leitura (fotografia de 2026-10-12, ~23:23Z)

**Policies de SELECT de `public.vagas`** (`polcmd in ('r','*')`) — iguais às do 52-31:

| polname | papéis | `pg_get_expr(polqual)` |
|---|---|---|
| Público vê vagas ativas | `{authenticated,anon}` | `((status = 'ativa'::status_vaga) AND (deleted_at IS NULL))` |
| RH vê todas vagas | `{authenticated}` | `(EXISTS ( SELECT 1 FROM usuarios_rh WHERE ((usuarios_rh.user_id = ( SELECT auth.uid() AS uid)) AND (usuarios_rh.ativo = true) AND (usuarios_rh.deleted_at IS NULL))))` |

**Policies que citam `vagas`** (em `polqual` ou `polwithcheck`, toda tabela): só `perguntas_cultura`
«Público vê perguntas cultura» (SELECT) e `perguntas_formulario` «Público vê perguntas de vagas
ativas» (SELECT) — fora do fluxo de avaliação, como o `<context>` mediu.

**Triggers não internos** (`pg_get_triggerdef`) — os mesmos nove do 52-31:

| tabela | trigger | definição resumida | função |
|---|---|---|---|
| vagas | `update_vagas_updated_at` | BEFORE UPDATE | `update_updated_at_column` (`NEW.updated_at = NOW()`) |
| vagas | `vagas_set_slug_trigger` | BEFORE INSERT | `vagas_set_slug` (slug se vazio) |
| vagas | `vagas_status_soft_delete_sync_trg` | BEFORE INSERT OR UPDATE | `vagas_enforce_status_soft_delete_sync` (`deleted_at` preenchido + `ativa` → `arquivada`) |
| candidaturas | `candidaturas_avancar_etapa_trg` | BEFORE UPDATE OF `etapa_atual` | `avancar_etapa` |
| candidaturas | `trg_candidatura_encerrada_a_pedido` | AFTER UPDATE OF `encerrada_a_pedido_em` WHEN old nulo e new não nulo | `trg_notif_candidatura_encerrada` |
| candidaturas | `trg_candidaturas_analise` | AFTER INSERT | `trg_candidatura_analise` |
| candidaturas | `trg_candidaturas_guard_rejeicao` | BEFORE UPDATE OF `status` | `guard_rejeicao_auditada` |
| candidaturas | `trg_notif_confirmacao` | AFTER INSERT | `trg_notif_confirmacao` |
| candidaturas | `update_candidaturas_updated_at` | BEFORE UPDATE | `update_updated_at_column` |

Os corpos das três funções de trigger de `vagas` foram lidos (`prosrc`): só atribuições a `NEW`
(`updated_at`, `status`, `slug` via `generate_unique_vaga_slug` só no INSERT) — nenhuma chama rede
nem escreve em outra tabela. Sem motivo de PARAR.

**Constraints de `public.vagas`:** `datas_vaga_check`, `estado_brasil_check`, `faixa_salarial_check`,
`salario_exibicao_check`, `slug_format_check`, `vagas_created_by_fkey`, `vagas_pkey`,
`vagas_secoes_extras_forma_check`, `vagas_slug_key`, `vagas_updated_by_fkey` — nenhuma sobre
`testes_aplicaveis`/`aplica_cognitivo`/`titulo`. Colunas: `testes_aplicaveis jsonb NOT NULL default
'[]'::jsonb`; `aplica_cognitivo boolean NOT NULL default false`. Sem motivo de PARAR.

**Enum `status_vaga`:** `{rascunho,ativa,inativa,arquivada}` — três valores diferentes de `ativa` (≥ 2).

**Privilégios de coluna** (`information_schema.column_privileges`, SELECT): `anon` e `authenticated`
com SELECT em `vagas.testes_aplicaveis`, `vagas.aplica_cognitivo` e `vagas.titulo` (as seis linhas).

**População (fotografia; a janela de cadastro de vagas pode mudá-la hoje):** `vagas` = 15 linhas; 12
com `status <> 'ativa' AND deleted_at IS NULL` (o predicado da sonda do WR-02); 2 ativas vivas; 1
apagada; 0 com `aplica_cognitivo`; `max(vagas.updated_at)` = 2026-09-29 (nenhuma vaga escrita hoje
até esta medição); 0 vagas e 0 candidaturas criadas desde o backup de 2026-10-12T06:31:59Z.
Candidaturas: 0 excluídas, 0 rascunhos; de vaga não pública em `avaliacao_assincrona`, só
`f73682b6` (vaga `a32fe930` arquivada, `aplica_cognitivo` falso). A população pela regra do smoke
(candidatos com `user_id`, fora de `usuarios_rh`) saiu no ensaio: `52a.pop=cand:22,naturais:16`
(a contagem crua sem esse filtro dá 31 candidatos e 21 candidaturas — a diferença são contas de RH
e candidatos sem `user_id`, que o smoke exclui por regra).

**Lint de partida (o comando dos `<verify>` de lint das Tasks 3 e 5, `npm run -s lint`):** `lint exit=2 tsc errors=89`.

tsc_base=89

**`PostgrestVersion` no tsc** — cópia descartável `<scratchpad>/p52_32_tsc` (clone do HEAD
`f360bee7` + link de `node_modules`; o tsc não lê env), `npm run -s lint` com o `database.types.ts`
versionado e de novo com `PostgrestVersion: "14.5"` trocado por `"13.0.5"` (troca literal de âncora
única, conferida: 1 ocorrência antes, 1 depois), restaurado por `trap … EXIT INT TERM`;
`git -C <cópia> diff --quiet HEAD -- database.types.ts` rc=0 e, na árvore real, `git diff --quiet
HEAD -- database.types.ts` rc=0:

tsc_postgrest: 14.5=89 13.0.5=89

(igual ao que o checker do plano mediu em 2026-10-12: a deriva do `PostgrestVersion` não muda o tsc.)

**Casts estreitos de RPC em `refs/gsd/52-31/sha`** (a base que o terceiro `<verify>` da Task 5
compara): `src/features/vagas/services/candidaturasService.ts` = 1; `src/features/avaliacao/services/avaliacaoService.ts` = 1.
Depois do GREEN desta task: `avaliacaoService.ts` = 2 (o de `lerTestesDaMinhaCandidatura`, que a Task 5
retira) e `candidaturasService.ts` = 1 (intocado).

### Passo 0 — varredura «varra pela FORMA» (CLAUDE.md §Portões), ANTES de acrescentar o objeto

Comando, verbatim:

```
grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql
```

Total: **443 achados** em 60 arquivos (antes do smoke novo; o 52-31 mediu 441 depois do smoke52p).
Achados que LISTAM ou CONTAM funções, classificados (os mesmos do 52-31, nenhum novo):

| achado | o que vigia | classe |
|---|---|---|
| `p43_matriz_retencao_smoke.sql:572` `proname IN ('listar_matriz_retencao', 'salvar_janela_retencao')` | as 2 funções do próprio smoke | ESCOPO deliberado |
| `p43_previa_smoke.sql:294`, `:396`, `:610`, `:667` `proname IN (…previa_retencao…, titulares/candidaturas_alem_da_janela)` | funções da prévia de retenção que o smoke vigia | ESCOPO deliberado |
| `p44_pedidos_dados_smoke.sql:388` `proname IN ('listar_pedidos_dados', 'contar_pedidos_dados_pendentes')` | as 2 funções do próprio smoke | ESCOPO deliberado |
| `p45_motor_exclusao_smoke.sql:3217` `proname IN ('registrar_pedido_exclusao', 'cancelar_pedido_exclusao', …` | funções do motor de exclusão | ESCOPO deliberado |
| `p49_prontidao_prod.sql:142` e `:144` (`count(DISTINCT proname) … = 2` sobre a MESMA lista literal de 2) | as 2 RPCs de revisão de entrevista | ESCOPO deliberado |
| `p50_desfazer_expansao.sql:51` e `:1554` (impressões digitais `fn:` / `= ANY (ARRAY[…])`) | os objetos da expansão da 50 que o desfazer devolve | ESCOPO deliberado |

Nenhum achado conta funções de `public` contra constante, e nenhum é uma vigilância que devesse
cobrir `ler_testes_das_minhas_candidaturas` — sem motivo de PARAR. Fora dos `.sql`, a vigilância de
funções do próprio ensaio (`funcoesP52()` em `scripts/p52_ensaio.cjs`, chave `funcoes` de
`capturar()`) é por FORMA — toda `CREATE FUNCTION public.<nome>(` das migrations de `MIGS` no disco —,
então a função nova entra nela por existir na 0007, que agora está em `MIGS`. Depois do smoke novo a
varredura não muda de classe: os `<>`/`IS DISTINCT FROM` numéricos do `p52_testes_candidato_smoke.sql`
são `v_rc <> 1` sobre o `ROW_COUNT` do UPDATE de UMA vaga por id (escopo: a linha alvo).

### Passo 1 — a migration `20261011000007_p52_testes_das_minhas_candidaturas.sql` (commit `f5822c88`)

Escrita à mão no molde da `20261011000006`, sem BEGIN/COMMIT. Cabeçalho na ordem do plano: título
e linha Phase/Plano; POR QUE EXISTE (a policy pública anterior ao ledger; os três leitores do embed
`avaliacaoService.ts:118`, `redacaoService.ts:150`, `cognitivoService.ts:124`; o efeito medido em
`f73682b6`; a decisão do operador verbatim — a frase do R1); O QUE CRIA (assinatura, retorno, ordem,
`[]` sem nenhuma; D-52-G7B-2 com a frase da D-52-G7-1 verbatim; o título do currículo vem da 0006);
GUARDA (igual à 0006); O QUE NÃO FAZ; ACL; PRE-PORTAO; POS-PORTAO (a varredura do WR-01 e a
IGUALDADE de conjunto); LOCK; PROVA (smoke52a e A1–A14); O NÚMERO (D-52-G7B-7); SEM BEGIN/COMMIT;
«APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261011000007_p52_testes_das_minhas_candidaturas.sql
— só pelo 52-32 Task 5, atrás do `p52_portao.cjs --modo apply`; NUNCA `supabase db push`».

Corpo: os dois `SET LOCAL` como as duas primeiras instruções; `DO $pre$` (`P52-07 PRE-PORTAO`: as três
tabelas presentes, a função ausente, `p52.p07.pre = ok` LOCAL); a função (`plpgsql`, `STABLE
SECURITY DEFINER`, `SET search_path = ''`, `$function$`); ACL (REVOKE PUBLIC, REVOKE `anon` nominal,
GRANT `authenticated`); COMMENT (sem função `public.<nome>(` em forma de chamada; sem termo da guarda
LGPD-04); `DO $pos$` (`P52-07 POS-PORTAO`): a cópia do POS da 0006 com `c_sig` e a GUC `p52.p07.pre`,
e a única diferença de lógica:

```sql
  SELECT coalesce(array_agg(DISTINCT m[2] ORDER BY m[2]), '{}') INTO v_cols FROM regexp_matches(lower(v_cod), '\mv\.("?)([a-z_]+)\1', 'g') AS m;
  IF v_cols IS DISTINCT FROM ARRAY['aplica_cognitivo', 'id', 'testes_aplicaveis'] THEN
    RAISE EXCEPTION 'P52-07 POS-PORTAO: % le coluna de vagas fora da allowlist {aplica_cognitivo, id, testes_aplicaveis}: %', c_sig, v_cols;
  END IF;
```

anexando ` avaliacao:testes_candidato=ok` a `p52.evidencia`. Âncoras únicas no arquivo inteiro
(conferido por `grep -cF`): `'testes_aplicaveis', v.testes_aplicaveis,` = 1 e
`'aplica_cognitivo', v.aplica_cognitivo)` = 1.

**Diff das duas funções** (`CREATE FUNCTION … $function$;` da 0006 contra a da 0007) — só o nome, o
comentário da projeção e a projeção diferem; `v_uid`, `v_role`, a guarda e o comentário dela, a posse,
a junção e o filtro de viva são byte a byte os da 0006 (D-52-G7B-3):

```diff
1c1
< CREATE FUNCTION public.ler_vagas_das_minhas_candidaturas()
---
> CREATE FUNCTION public.ler_testes_das_minhas_candidaturas()
19c19,20
<   -- só titulo e departamento (allowlist), em qualquer status e com ou sem deleted_at (D-52-G7-1).
---
>   -- só a bateria e o opt-in cognitivo (allowlist), em qualquer status e com ou sem deleted_at
>   -- (D-52-G7B-2).
21,22c22,23
<                                                'titulo', v.titulo,
<                                                'departamento', v.departamento)
---
>                                                'testes_aplicaveis', v.testes_aplicaveis,
>                                                'aplica_cognitivo', v.aplica_cognitivo)
```

### Passo 2 — `scripts/p52_ensaio.cjs` (commit `9079765a`) — só isto

```diff
@@ -8,6 +8,7 @@
- * 0/1/3. Mudou SÓ o que é da fase (52-01): o sentinela (`ENSAIO_P52_TERMINOU`), as seis versões
- * fixadas `20261011000001..6_p52_*` em MIGS (a 0005 é do 52-26 — gap WR-04 + F13 — e a 0006 é do
- * 52-31 — G-52-7, a RPC do painel do candidato; as duas entram na lista ANTES da 0004, na ordem de
- * APLICAÇÃO), os pares de smoke `smoke52l` (leituras do RH, bloco B), `smoke52b` (banco SJT v2,
- * bloco C), `smoke52g` (gap de servidor, 52-26), `smoke52p` (painel do candidato, 52-31) e
- * `smoke52d` (limpeza, bloco D) somados aos legados, a marca
+ * 0/1/3. Mudou SÓ o que é da fase (52-01): o sentinela (`ENSAIO_P52_TERMINOU`), as sete versões
+ * fixadas `20261011000001..7_p52_*` em MIGS (a 0005 é do 52-26 — gap WR-04 + F13 —, a 0006 é do
+ * 52-31 — G-52-7, a RPC do painel do candidato — e a 0007 é do 52-32 — R1 do G-52-7, a RPC dos
+ * testes da vaga do candidato; as três entram na lista ANTES da 0004, na ordem de APLICAÇÃO), os
+ * pares de smoke `smoke52l` (leituras do RH, bloco B), `smoke52b` (banco SJT v2, bloco C),
+ * `smoke52g` (gap de servidor, 52-26), `smoke52p` (painel do candidato, 52-31), `smoke52a` (testes
+ * da vaga do candidato, 52-32) e `smoke52d` (limpeza, bloco D) somados aos legados, a marca
@@ -24,2 +25,4 @@
- * competências — dono: 52-26) e ao G-52-7 do 52-31 (0006: `ler_vagas_das_minhas_candidaturas`, título e
- * departamento da vaga das próprias candidaturas — dono: 52-31).
+ * competências — dono: 52-26), ao G-52-7 do 52-31 (0006: `ler_vagas_das_minhas_candidaturas`, título e
+ * departamento da vaga das próprias candidaturas — dono: 52-31) e ao R1 do G-52-7 do 52-32 (0007:
+ * `ler_testes_das_minhas_candidaturas`, testes aplicáveis e opt-in cognitivo da vaga das próprias
+ * candidaturas — dono: 52-32).
@@ -66 +69 @@
- * das duas GUCs foi definida (k ∈ 50, 51a, 51b, 52l, 52b, 52g, 52p, 52d). Verde exige todo par reportado com
+ * das duas GUCs foi definida (k ∈ 50, 51a, 51b, 52l, 52b, 52g, 52p, 52a, 52d). Verde exige todo par reportado com
@@ -116,3 +119,5 @@ const SENTINELA = 'ENSAIO_P52_TERMINOU';
- * próprias candidaturas (52-31: G-52-7, D-52-G7-7), 0004 limpeza dos dados de teste (bloco D, 52-20 —
- * DESTRUTIVA, portão próprio, D-41). A 0005 e a 0006 vêm ANTES da 0004 porque a lista é a ordem de
- * APLICAÇÃO, não a numérica (a 0006 é aplicada pelo 52-31, antes do bloco D — o 52-19 depende dele): a 0004 está fixada por nome em planos já verificados e ainda não existe;
+ * próprias candidaturas (52-31: G-52-7, D-52-G7-7), 0007 testes aplicáveis e opt-in cognitivo da vaga das
+ * próprias candidaturas (52-32: R1 do G-52-7, D-52-G7B-7), 0004 limpeza dos dados de teste (bloco D, 52-20 —
+ * DESTRUTIVA, portão próprio, D-41). A 0005, a 0006 e a 0007 vêm ANTES da 0004 porque a lista é a ordem de
+ * APLICAÇÃO, não a numérica (a 0006 é aplicada pelo 52-31 e a 0007 pelo 52-32, antes do bloco D — o 52-19
+ * depende dos dois; a 0007 DEPOIS da 0006, na ordem em que vão ao ar): a 0004 está fixada por nome em planos já verificados e ainda não existe;
@@ -129,0 +135 @@ const MIGS = [
+  'supabase/migrations/20261011000007_p52_testes_das_minhas_candidaturas.sql',
@@ -135 +141,2 @@ const MIGS = [
- * 52b (banco SJT v2), 52g (gap de servidor, 52-26), 52p (painel do candidato, 52-31), 52d (limpeza). */
+ * 52b (banco SJT v2), 52g (gap de servidor, 52-26), 52p (painel do candidato, 52-31), 52a (testes da
+ * vaga do candidato, 52-32), 52d (limpeza). */
@@ -143,0 +151 @@ const PARES = [
+  ['52a', 'smoke52a'],
@@ -164,0 +173 @@ const PREFIXO =
+  "       set_config('smoke52a.pass', '', false), set_config('smoke52a.esperado', '', false),\n" +
```

Conferido por leitura do arquivo: `MIGS` = 0001, 0002, 0003, 0005, 0006, **0007**, 0004; `PARES` =
50, 51a, 51b, 52l, 52b, 52g, 52p, **52a**, 52d; `PREFIXO` contém `smoke52a.esperado`. `module.exports`
inalterado. Nenhuma outra mudança de comportamento (a chave `vagas_estado` do WR-02 é da Task 2).

### Passo 3 — `supabase/tests/p52_testes_candidato_smoke.sql` (`smoke52a`, commit `63b011bc`)

Cópia de FORMA do `p52_painel_vaga_smoke.sql`: prefixo `P52A`, envelope `P52A1`, guarda
`$p52_so_ensaio$` como primeira instrução, nenhuma GUC do PRE/POS lida (roda com a 0007 prefixada e
contra o vivo). `pg_temp.p52a_chamar(p_papel, p_sub)` (chamada por `EXECUTE`, para compilar sem a
função), `pg_temp.p52a_vaga_visivel(p_sub, p_vaga)` (NULL = sonda falhou, nunca lido como invisível),
`pg_temp.p52a_resumo(jsonb)` (só erro, tipo ou contagem). Baseline com atores lidos na execução
(nenhum uuid no arquivo; regras do smoke52p), população publicada em `p52.evidencia`
(`52a.pop=…`, `52a.alvo=…`) e recusa `P52A FAIL (baseline)` sem dono/alvo/outro/admin/rec OU com
menos de dois status não ativos no enum. Literal único `smoke52a.esperado` = 3. Cabeçalho com o que
vigia, atores, o que escreve e como reverte, como rodar, «PROIBIDO `p46apply.cjs run`», o esperado e
a tabela de mutações A1–A14 (as entradas do runner são da Task 2).

- (a) para cada status não ativo do enum, na ordem do enum, com índice i, num envelope: `status`,
  `aplica_cognitivo = (i % 2 = 0)` e `testes_aplicaveis = [{teste: 'p52a_sentinela', status: <s>}]`;
  premissa `p52a_vaga_visivel` falso (`c_premissa_rls`); a RPC do dono contém o alvo com
  `testes_aplicaveis` e `aplica_cognitivo` IGUAIS aos lidos como postgres dentro do envelope
  (pertencimento). Com o enum de hoje: rascunho (opt-in falso), inativa (verdadeiro), arquivada (falso).
- (b) a RPC do outro: não vazia, só dele, nenhuma do dono; `sub` sem candidato → `[]`.
- (c) dono e outro vivos e o dono com a vaga do alvo em `inativa`: topo array, cada elemento com
  chaves ordenadas = {aplica_cognitivo, candidatura_id, testes_aplicaveis}, `candidatura_id` string,
  `aplica_cognitivo` booleano, `testes_aplicaveis` presente; nenhum elemento checado = reprova.

**Controle negativo (não pedido pelo plano; mostra que o smoke não é verde vácuo)** — o mesmo smoke
contra o vivo, sem a 0007:

```
node scripts/p52_ensaio.cjs --sem-migracoes supabase/tests/p52_testes_candidato_smoke.sql
ENSAIO VERMELHO: P52A FAIL (a): [rascunho_retorno:err:42883:function public.ler_testes_das_minhas_candidaturas() does not exist,inativa_retorno:err:42883:function public.ler_testes_das_minhas_candidaturas() does not exist,arquivada_retorno:err:42883:function public.ler_testes_das_minhas_candidaturas() does not exist] — o dono nao le a bateria e o opt-in cognitivo da vaga inativada da propria candidatura (ou a fixture nao reproduz o gap) (715 ms)
```

Sem `c_premissa_rls` nos três status: a vaga do alvo fica invisível sob a RLS do dono em `rascunho`,
`inativa` e `arquivada` — o R1 do G-52-7 reproduzido pela fixture.

### `<verify>` 1 — o ensaio (rodado como escrito, sobre o HEAD final `8dd06272`, 2026-10-12T23:33Z) — VERDE

Linha `ENSAIO VERDE` inteira:

```
ENSAIO VERDE: supabase/tests/p52_testes_candidato_smoke.sql · prefixadas=[20261011000007] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005,20261011000006] · ausentes=[20261011000004] · smokes=[52a=3/3] · evidencia=avaliacao:testes_candidato=ok 52a.pop=cand:22,naturais:16 52a.alvo=publica · 514 ms
```

(A primeira rodada, antes dos commits, deu a mesma linha com `537 ms`. `naturais:16` confere com as
16 candidaturas vivas de vaga não pública do planejamento e do `52p.pop` do 52-31.)

### Passo 4 — RED do cliente (commit `1c64a704`, antes do conserto)

`src/components/pages/__tests__/DashboardCandidatoPage.concluidasVagaNaoPublica.test.tsx` — harness do
`.concluidas.test.tsx` (hook `useIdsAvaliacoesConcluidas` e `avaliacaoService` REAIS sobre o cliente
espião; mocks só de HOOK), linha de `candidaturas` com `vaga: null`, `rpcImpl` por nome
(`get_avaliacao_status` → as quatro concluídas; a RPC dos testes → o caso), `PRAZO` real extraído da
migration do `config_sla_etapa`. Quatro casos: (1) entrada com a bateria da fixture de hoje e
`aplica_cognitivo: false` → frase, selo, nenhum botão, sem prazo, RPC pelo nome, nada escrito, toda
RPC ∈ {get_avaliacao_status, ler_testes_das_minhas_candidaturas}; (2) `[]`; (3) erro (texto do erro
ausente da tela); (4) em voo — os três com CTA de hoje e linha de prazo PRESENTE.

`src/features/avaliacao/components/__tests__/AvaliacaoContainer.vagaNaoPublica.test.tsx` — container
CONECTADO na rota `/candidato/avaliacao/:candidaturaId`, `avaliacaoService` real, cliente espião com a
cadeia registrando filtros; (1) entrada `[{teste: 'work_sample_sjt', cargo}]` → os rótulos de
`CONTAINER_TESTE_CONFIG.sjt_mc` e `.sjt_caso_aberto`, nunca «Nenhuma avaliação pendente», `perguntas`
filtradas por `eq('cargo', <cargo>)`; (2) erro → «Nenhuma avaliação pendente», texto do erro ausente.

Todas as asserções do caso que morde em UMA linha de mensagem (`waitFor(() => expect(…,
'<rótulo>').not.toBeNull(), { onTimeout: (e) => e })` e `toBe` sobre booleano/`join`).

Sobre o código de hoje, os SEIS casos ficaram vermelhos por asserção (os casos (2)–(4) do painel e o
(2) da página exigem que a RPC dos testes seja chamada pelo nome — sem isso seriam verdes vácuos):
`AssertionError: a RPC dos testes foi chamada pelo nome: expected false to be true`.

**Vermelho e verde pareados** (a «Disciplina do vermelho e da mordida no Vitest», itens 1–3; a mesma
seleção dos dois lados, `-t` com o nome EXATO do caso, parênteses escapados para o regex do Vitest):

Caso (1) do painel:
- Seleção: `npx vitest run src/components/pages/__tests__/DashboardCandidatoPage.concluidasVagaNaoPublica.test.tsx -t '\(1\) embed nulo e a RPC traz a bateria, todas concluídas → a frase, o selo, nenhum botão, sem prazo; nada escrito'`
- Sobre `1c64a704` (commit do teste): `Tests  1 failed | 3 skipped (4)` (exit 1); primeira linha da falha: `AssertionError: a frase do JORN-59 para a vaga nao publica: expected null not to be null`
- Sobre `8dd06272` (commit do conserto): `Tests  1 passed | 3 skipped (4)`

Caso (1) da página de avaliações:
- Seleção: `npx vitest run src/features/avaliacao/components/__tests__/AvaliacaoContainer.vagaNaoPublica.test.tsx -t '\(1\) embed nulo e a RPC traz a bateria → os cards do SJT, nunca «Nenhuma avaliação pendente»; perguntas filtradas pelo cargo'`
- Sobre `1c64a704`: `Tests  1 failed | 1 skipped (2)` (exit 1); primeira linha da falha: `AssertionError: o card de multipla escolha do SJT da vaga nao publica: expected null not to be null`
- Sobre `8dd06272`: `Tests  1 passed | 1 skipped (2)`

**Classificador** (`gsd-tools check tdd-red-evidence <record> --raw`, a mesma seleção com
`NO_COLOR=1 DEBUG_PRINT_LIMIT=0 … --reporter=tap-flat` sobre `1c64a704`; registros em
`node_modules/.cache/p52-32-red/{P,A}.json`, dentro do projeto e ignorados pelo git):
- painel (1) → `RED_EVIDENCE_OK` (`target_test_failed`; tests 4, fail 1, os outros três filtrados).
- página (1) → `RED_EVIDENCE_OK` (`target_test_failed`; tests 2, fail 1, o (2) filtrado).

**Avaliação semântica:** nos dois, o alvo executou e falhou na asserção planejada (a frase do JORN-59
/ o card do SJT, que só existem com a bateria vinda da RPC, não aparecem); nenhum erro de coleta,
import, env ou fixture. No painel o «Próximo passo» renderizou com o CTA de hoje; na página o
container caiu no estado vazio «Nenhuma avaliação pendente» — o R1 do G-52-7 reproduzido no cliente.

### Passo 5 — GREEN mínimo (commit `8dd06272`)

`avaliacaoService.ts` muda só por `RPC_TESTES_DAS_MINHAS_CANDIDATURAS`, `TestesDaMinhaCandidatura`, o
typeguard `ehTestesDaMinhaCandidatura`, `lerTestesDaMinhaCandidatura` e o preenchimento em
`getAvaliacaoContext` (com o bloco de comentário «52-32 (R1 do G-52-7 · D-52-G7B-1..4)» junto do embed):

```diff
@@ -98,0 +99,61 @@ export interface NeutralAck {
+// 52-32 (R1 do G-52-7 · D-52-G7B-1..4) — os testes da vaga das PRÓPRIAS candidaturas
+export const RPC_TESTES_DAS_MINHAS_CANDIDATURAS = 'ler_testes_das_minhas_candidaturas'
+export interface TestesDaMinhaCandidatura { candidatura_id: string; testes_aplicaveis: unknown; aplica_cognitivo: boolean }
+function ehTestesDaMinhaCandidatura(x: unknown): x is TestesDaMinhaCandidatura { … objeto, candidatura_id string,
+  aplica_cognitivo booleano, chave própria testes_aplicaveis … }
+export async function lerTestesDaMinhaCandidatura(candidaturaId: string):
+  Promise<{ testes_aplicaveis: unknown; aplica_cognitivo: boolean } | null> {
+  try {
+    // NARROW confined cast: … quem o retira é a Task 5 do 52-32, no commit do `database.types.ts` …
+    const { data, error } = await (supabase.rpc as unknown as (
+      fn: string,
+    ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>)(
+      RPC_TESTES_DAS_MINHAS_CANDIDATURAS,
+    )
+    if (error || !Array.isArray(data)) return null
+    const entrada = data.find((e: unknown) => ehTestesDaMinhaCandidatura(e) && e.candidatura_id === candidaturaId)
+    if (!entrada) return null
+    return { testes_aplicaveis: entrada.testes_aplicaveis, aplica_cognitivo: entrada.aplica_cognitivo }
+  } catch {
+    return null
+  }
+}
@@ -113,0 +175,8 @@ export async function getAvaliacaoContext(
+  // 52-32 (R1 do G-52-7 · D-52-G7B-1..4): … o embed FICA (vaga pública: nenhuma chamada a mais); só
+  // quando ele vem nulo os dois campos vêm da RPC … Sem a entrada (erro, ausência), o desfecho é o de hoje.
@@ -143,2 +212,11 @@ export async function getAvaliacaoContext(
-  const testesAplicaveis = candRow.vaga?.testes_aplicaveis ?? null
-  const aplicaCognitivo = candRow.vaga?.aplica_cognitivo ?? false
+  let testesAplicaveis = candRow.vaga?.testes_aplicaveis ?? null
+  let aplicaCognitivo = candRow.vaga?.aplica_cognitivo ?? false
+  // 52-32: embed nulo (vaga fora do ar) → os dois campos pela RPC, ANTES do filtro de perguntas
+  if (candRow.vaga == null) {
+    const daRpc = await lerTestesDaMinhaCandidatura(candRow.id)
+    if (daRpc) {
+      testesAplicaveis = daRpc.testes_aplicaveis ?? null
+      aplicaCognitivo = daRpc.aplica_cognitivo
+    }
+  }
```

(Hunks resumidos nos comentários e na assinatura da função por legibilidade; o diff inteiro é
`git diff 1c64a704 8dd06272 -- src/features/avaliacao/services/avaliacaoService.ts`, +80/−2 linhas de
código e comentário, `git diff --numstat`.) Nenhuma outra função muda; o embed, `getAvaliacaoStatus` e o cast de
`get_avaliacao_status` (R7) intactos.

### `<verify>` 2 — escopo da migration e nada aplicado (rodado como escrito, HEAD `8dd06272`) — VERDE

```
escopo da migration: proibidas=0 funcoes=1 varredura_wr01=1
0007 fora do ledger e funcao ausente em PROD: nada aplicado
```

### `<verify>` 3 — os cinco arquivos de teste (rodado como escrito, HEAD `8dd06272`) — VERDE

`npx vitest run …concluidasVagaNaoPublica.test.tsx …AvaliacaoContainer.vagaNaoPublica.test.tsx
…concluidas.test.tsx …avaliacaoService.test.ts …AvaliacaoContainer.test.tsx` →
`Test Files 5 passed (5) · Tests 35 passed (35)`.

Lint depois do GREEN: `lint exit=2 tsc errors=89` (= `tsc_base`); o pre-commit imprimiu
`tsc errors: 89 (frozen baseline: 96)` nos cinco commits de código.

Sanidade extra (fora do `<verify>`): `npx vitest run src/features/avaliacao src/features/avaliacao-cognitiva
src/components/pages/__tests__ src/__tests__/promessasComExecutor.test.ts src/__tests__/guards/` →
`Tests 2 failed | 562 passed (564)`; os 2 vermelhos são a BASELINE conhecida de
`promessasComExecutor.test.ts` (o deferimento contra o ROADMAP e o comentário de catálogo do ledger de
notificações — os mesmos que o 52-31 registrou), nada desta task. O delta formal da suíte é da Task 3.

### Commits da Task 1 (cada um com os caminhos nomeados; nenhum `-A`/`-a`/`--no-verify`)

| # | sha | assunto | caminho |
|---|---|---|---|
| 1 | `f5822c88` | `feat(52-32): ler_testes_das_minhas_candidaturas — o candidato le os testes e o opt-in cognitivo da vaga das proprias candidaturas em qualquer status (R1 do G-52-7)` | `supabase/migrations/20261011000007_p52_testes_das_minhas_candidaturas.sql` |
| 2 | `9079765a` | `chore(52-32): p52_ensaio conhece a 20261011000007 (MIGS na ordem de aplicacao, par 52a)` | `scripts/p52_ensaio.cjs` |
| 3 | `63b011bc` | `test(52-32): smoke52a (tracer — dono le os testes da vaga fora do ar, outro candidato nao, allowlist exata)` | `supabase/tests/p52_testes_candidato_smoke.sql` |
| 4 | `1c64a704` | `test(52-32): painel e pagina de avaliacoes com vaga nao publica (vermelho antes do conserto)` | `src/components/pages/__tests__/DashboardCandidatoPage.concluidasVagaNaoPublica.test.tsx`, `src/features/avaliacao/components/__tests__/AvaliacaoContainer.vagaNaoPublica.test.tsx` |
| 5 | `8dd06272` | `fix(52-32): getAvaliacaoContext le os testes da vaga pela RPC quando o embed vem nulo (JORN-59)` | `src/features/avaliacao/services/avaliacaoService.ts` |

Arquivos sujos de outras janelas (`.planning/ui-reviews/.gitignore`, `docs/specs/DRAFT-banco-sjt-marketing.md`,
`plugins/cadastro-de-vaga/**`, `AGENTS.md`, `docs/vagas/`, `.planning/phases/51-*/.gitkeep`) fora de
todo commit. Nenhuma deleção nos commits.

### Desvios e observações

1. **Nenhum desvio de Regra 1–4.** O plano foi executado como escrito.
2. **Seleção `-t` com parênteses escapados.** O `-t` do Vitest é regex: o nome exato com `(1)` cru não
   casaria o próprio caso (o grupo `(1)` casa só `1`). A seleção usada nas duas polaridades é o nome
   exato com `\(1\)` — a mesma dos dois lados, com `1 failed`/`1 passed` e os outros casos `skipped`.
3. **Os casos (2)–(4) do painel e o (2) da página nasceram VERMELHOS** sobre o código de hoje (a
   asserção «a RPC dos testes foi chamada pelo nome»), não verdes: sem ela seriam verdes vácuos (o
   desfecho de hoje já é o CTA/«Nenhuma avaliação pendente»). Consequência para a Task 3: estes não
   precisam de mordida por mutação na cópia descartável — o vermelho deles é o do código de hoje.
4. **A tabela de mutações A1–A14 já está no cabeçalho do smoke** (o Passo 3 pede «a tabela de
   mutações»); as entradas do runner `p52_mutacoes.cjs` são da Task 2 — o texto do cabeçalho segue o
   `<behavior>` da Task 2 (`52-32-PLAN.md:726`).
5. **População de `vagas` muda hoje** (operador, § «Correção de ordem»): as contagens do Passo 0 são
   fotografia de ~23:23Z; o smoke lê atores e população na execução.
6. Nenhuma task de expansão rodou; a Task 2 começa numa sessão NOVA, com a resposta do operador
   verbatim, e confere esta fronteira pela precondition dela.

### Perguntas ao operador na parada da tracer (`gate="blocking-human"`), cada uma com o número que a sustenta

1. **D-52-G7B-1** — «uma função nova para os três leitores de avaliação (testes aplicáveis + opt-in
   cognitivo; cada leitor copia só o seu campo) e a 0006 reusada para o título do currículo —
   confirma?» Sustenta: a migration com UMA função (`<verify>` 2: `funcoes=1 proibidas=0
   varredura_wr01=1`); o diff contra a 0006 só na projeção; o smoke (c) verde com as três chaves
   exatas {aplica_cognitivo, candidatura_id, testes_aplicaveis} (`smokes=[52a=3/3]`).
2. **D-52-G7B-2** — «o candidato ainda no funil continua vendo e fazendo as avaliações da vaga que o
   RH tirou do ar (como na D-52-G7-1 para o título) — confirma?» Sustenta: o smoke (a) verde nos TRÊS
   status não ativos do enum (rascunho, inativa, arquivada) com sentinela e opt-in alternado, e a
   vaga invisível sob a RLS do dono nos três (controle negativo sem `c_premissa_rls`); as seis RPCs
   DEFINER do fluxo medidas no `<context>` (nenhuma cita o status público da vaga).
3. **D-52-G7B-5** — «o quarto leitor (prova cognitiva, `cognitivoService.ts:124`) entra na Task 3,
   para o card cognitivo que a página passa a mostrar não levar a «indisponível» — confirma?»
   Sustenta: 0 vagas com `aplica_cognitivo` hoje (0 de 15; 0 casos naturais); nenhuma mudança de
   servidor (o campo já está na allowlist da 0007).

Resume-signal: «continuar + D-52-G7B-1/-2/-5: confirmo». Veto: -5 → emenda datada do planejador
ANTES da sessão B (tira o leitor cognitivo da Task 3, de `files_modified`, do `--caminhos` do
«Comando de push», da truth D-52-G7B-5 e da T-52-127 — nenhum código a desfazer); -1 ou -2 → volta ao
planejador com esta §Task 1 (commits locais, nada em PROD, nenhum review gasto).

fronteira_retomada: sessao_a_encerrada 2026-10-12T23:33Z head=8dd062720849d9adcf8c456dbe7416362160f7c3

---

## §Task 2 — sessão B, 2026-10-13 (UTC)

Executor: sessão B (Tasks 2–3), início 2026-10-13T00:24Z (2026-10-12 21:24 -03). Continuação da
`fronteira_retomada: sessao_a_encerrada … head=8dd06272` acima; as linhas da §Task 1 não foram reescritas.

### Precondition (medida 2026-10-13T00:26Z, só leitura) — satisfeita

- `git merge-base --is-ancestor 8dd062720849d9adcf8c456dbe7416362160f7c3 HEAD` → 0; os seis commits da sessão A existem (`f5822c88`, `9079765a`, `63b011bc`, `1c64a704`, `8dd06272`, `27e1271d`); HEAD no despacho = `27e1271d`.
- Resposta do operador VERBATIM no despacho, confirmando D-52-G7B-1, -2 e -5 (bloco abaixo) — nenhum veto.
- Nenhum `52-32-SUMMARY.md` no diretório da fase.
- `node p46apply.cjs sql "set transaction read only; …"` → `{"no_ledger": 0, "ausente": true, "agora": "2026-10-12 21:26:48.849292-03", "vagas": 15, "pred": 12, "ativas_vivas": 2, "apagadas": 1}` (`20261011000007` fora do ledger; função ausente em PROD; contagens de `vagas` iguais às da revisão do plano: a janela de cadastro não gravou vaga nova até aqui).
- `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` → vazio.

### Resposta do operador — parada da tracer

Recebida 2026-10-12 ~20:40 -03 (≈2026-10-12T23:40Z), repassada pelo orquestrador (`/gsd-execute-phase`) no despacho da sessão B, como bloco `<operator_response verbatim="true">`. Copiada byte a byte, sem paráfrase:

```text
continuar + D-52-G7B-1/-2/-5: confirmo.
Nota do operador sobre a -2: ciente de que o candidato ainda no funil segue fazendo as avaliações de vaga pausada/fechada/apagada (o servidor já permitia; o conserto é de leitura). Encerrar o funil de uma vaga é decisão do RH sobre as candidaturas, não efeito do status da vaga.
```

### Passo 1 — WR-02 (commit `0b4736b4`)

`FP_VAGAS_ESTADO` = a linha `52-REVIEW-G7-1.md:165` VERBATIM (conferido por `grep -nxF` da linha do review no arquivo: linha 371, `VERBATIM_OK`); a chave `vagas_estado` é a última coluna de `capturar()`; `provaVagasEstado(fp = FP_VAGAS_ESTADO)` pura, exportada com a constante. Advisory (a) do checker APLICADO: a premissa de coluna única é marcada numa variável DENTRO do envelope `P52W1` e o `P52W FAIL (premissa)` é levantado FORA dele (idem `(inesperado)`, que guarda só o SQLSTATE do passo), para não ser engolido pelo `WHEN OTHERS`. Acréscimo (Regra 2, registrado): a prova recusa rodar fora do ensaio (`P52W RECUSADO (fora do ensaio)` se `p52.tx` ≠ `txid_current()`) — o mesmo idioma da guarda `$p52_so_ensaio$` dos smokes; além da premissa «as outras duas colunas iguais», cada passo exige que a SUA coluna tenha mudado (sem isso o passo seria vácuo).

**Vaga que a sonda usou** (lida só leitura logo depois, pelo MESMO predicado; nenhum valor impresso pela sonda): id `4601d000…`, status `arquivada` (status-alvo do passo de status = `rascunho`, o primeiro do enum diferente de `ativa` e do atual), título sem `[TESTE` e slug sem `teste-` — é uma vaga NÃO marcada como teste/fixture, escrita SÓ dentro dos três envelopes que revertem, numa requisição que aborta; `vagas` no instante: 15 linhas, 12 no predicado, 2 ativas vivas, 1 apagada (iguais às da revisão do plano e às do Passo 0 da sessão A — a janela de cadastro não gravou vaga nesta janela de tempo). Enum `status_vaga` = `rascunho,ativa,inativa,arquivada`.

`<verify>` 1 (rodado como escrito, HEAD `0b4736b4`, ≈2026-10-13T00:28Z) — VERDE:

```text
wr02 real: ENSAIO VERDE: - · prefixadas=[] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005,20261011000006] · ausentes=[20261011000007,20261011000004] · smokes=[] · evidencia=vagas_estado:morde=ok · 363 ms
wr02 status: ENSAIO VERMELHO: P52W FAIL (status): a impressao nao viu a mudanca de status (569 ms)
wr02 deleted_at: ENSAIO VERMELHO: P52W FAIL (deleted_at): a impressao nao viu o deleted_at preenchido (501 ms)
wr02 estreita: ENSAIO VERMELHO: P52W FAIL (estreita): a impressao mudou com uma edicao de titulo (1048 ms)
WR-02: capturar fotografa vagas (15:dd770c981970a01c99bc8df78e364b91) e o PERSISTIU nomeia a chave
```

(rc: real=0; status/deleted_at/estreita=1, cada uma com o rótulo exato e sem `PERSISTIU`.)

Diff de `scripts/p52_ensaio.cjs` nesta task (`git diff 27e1271d 0b4736b4 -- scripts/p52_ensaio.cjs`) — só a constante, a chave, a prova, os exports e os comentários:

```diff
diff --git a/scripts/p52_ensaio.cjs b/scripts/p52_ensaio.cjs
index 0eac4e50..d0dd386d 100644
--- a/scripts/p52_ensaio.cjs
+++ b/scripts/p52_ensaio.cjs
@@ -20,6 +20,8 @@
  * Exceção revisada: a rodada 1 do portão do bloco B (WR-02 do 52-REVIEW-PORTAO-1) acrescentou a
  * chave `usuarios_rh` a `capturar()` — ver o comentário dela; vai ao 52-REVIEW-PORTAO-2. Na mesma
  * rodada, o WR-03 acrescentou a chave `opcoes_sjt` (o remapeamento do bloco C) — idem.
+ * 52-32: WR-02 do 52-REVIEW-G7-1 — chave `vagas_estado` e `provaVagasEstado()`; vai ao
+ * 52-REVIEW-G7B-1.
  * Serve aos blocos B (52-08, leituras do RH), C (52-17, banco SJT v2) e D (52-20/52-21, limpeza), e ao
  * gap de servidor do 52-26 (0005: `pontuar_sjt` por uuid e `salvar_avaliacao_entrevista` com todas as
  * competências — dono: 52-26), ao G-52-7 do 52-31 (0006: `ler_vagas_das_minhas_candidaturas`, título e
@@ -349,6 +351,15 @@ const MD5_SET = (expr, from) => `(SELECT md5(coalesce(string_agg(x, E'\\n' ORDER
  *                  os ids trocados em PROD com saída VERDE. A tabela não tem tráfego de candidato
  *                  (só o RH a edita, pela policy `rh_gerencia_opcoes_sjt`). `scores_candidato` fica
  *                  de fora pelo motivo de `candidaturas`; a escrita nela é atômica com esta.
+ *   vagas_estado   (WR-02 do 52-REVIEW-G7-1, 52-32) `public.vagas` ESTREITA: `<contagem>:<md5>` de
+ *                  `id|status|deleted_at` ordenado por `id` (`FP_VAGAS_ESTADO`, o texto do revisor
+ *                  verbatim). Só essas três colunas: são as que os smokes p52 escrevem em `vagas`
+ *                  (smoke52p e smoke52a, `status` e `deleted_at` dentro de envelopes); texto e
+ *                  `updated_at` têm tráfego do RH e envelheceriam o critério (uma edição de título
+ *                  entre as duas capturas NÃO acusa `PERSISTIU`). Uma mudança de status pelo RH
+ *                  DURANTE um ensaio acusaria — rara, e em REPEATABLE READ o ensaio já sairia 40001.
+ *                  A mordida da chave é provada por execução, dentro do ensaio que aborta, por
+ *                  `provaVagasEstado()` (abaixo) — nunca por escrita fora de um envelope que reverte.
  */
 const FP_USUARIOS_RH =
   "(select count(*)::text || ':' || md5(coalesce(string_agg(to_jsonb(u)::text, E'\\n' ORDER BY to_jsonb(u)::text), '')) from public.usuarios_rh u)";
@@ -356,6 +367,129 @@ const FP_USUARIOS_RH =
 const FP_OPCOES_SJT =
   "(select count(*)::text || ':' || md5(coalesce(string_agg(to_jsonb(o)::text, E'\\n' ORDER BY to_jsonb(o)::text), '')) from public.perguntas_opcao_sjt o)";
 
+const FP_VAGAS_ESTADO =
+  "(select count(*)::text || ':' || md5(coalesce(string_agg(v.id::text || '|' || v.status::text || '|' || coalesce(v.deleted_at::text, ''), E'\\n' order by v.id), '')) from public.vagas v)";
+
+/*
+ * provaVagasEstado(fp = FP_VAGAS_ESTADO) — PURA: devolve o texto de um bloco `DO $p52w$ … $p52w$;`
+ * que prova, DENTRO do ensaio que aborta (`--mutacao=`), que a impressão `fp` morde onde deve e só
+ * onde deve (D-52-G7B-8). O padrão é a fonte única; o parâmetro existe só para a polaridade
+ * vermelha (impressão degradada numa coluna). Passos:
+ *   (i)   a impressão base;
+ *   (ii)  a vaga por PREDICADO — a de menor `id` com `status <> 'ativa' AND deleted_at IS NULL`
+ *         (nenhuma = `P52W FAIL (baseline)`), porque o trigger `vagas_status_soft_delete_sync_trg`
+ *         (20260606000001_vaga_status_sync.sql) coage `status` para `arquivada` quando `deleted_at`
+ *         é preenchido numa vaga `ativa`: com ela, o passo do `deleted_at` mudaria DUAS colunas; o
+ *         status-alvo é o primeiro valor do enum diferente de `ativa` e do atual (nenhum literal de
+ *         status além de `ativa`);
+ *   (iii) TRÊS passos, cada um no SEU envelope `P52W1` que reverte (o idioma do `P52P1`), partindo
+ *         do estado base e escrevendo UMA coluna (`titulo`, `status`, `deleted_at`); dentro de cada
+ *         um: ROW_COUNT = 1, a coluna escrita mudou e as outras duas do trio ficaram iguais (a
+ *         PREMISSA — marcada numa variável e julgada FORA do envelope, para não ser engolida pelo
+ *         `WHEN OTHERS`, advisory (a) do checker), e a impressão do passo guardada;
+ *   (iv)  depois dos envelopes, a impressão de novo = a base (senão `P52W FAIL (envelope)`);
+ *   (v)   julgamento: título = base (senão `(estreita)`), status ≠ base (senão `(status)`),
+ *         `deleted_at` ≠ base (senão `(deleted_at)`);
+ *   (vi)  anexa ` vagas_estado:morde=ok` a `p52.evidencia`.
+ * Nenhuma escrita fora dos envelopes; nenhuma mensagem imprime título, id ou valor — só rótulos e
+ * SQLSTATE. Recusa rodar fora do ensaio (`p52.tx` = txid desta transação).
+ */
+function provaVagasEstado(fp = FP_VAGAS_ESTADO) {
+  return `DO $p52w$
+DECLARE
+  v_base text; v_id uuid; v_titulo text; v_status text; v_del timestamptz; v_alvo text;
+  t_titulo text; t_status text; t_del timestamptz; v_n int;
+  v_imp_titulo text; v_imp_status text; v_imp_del text; v_imp_fim text;
+  v_premissa text := ''; v_inesperado text := '';
+BEGIN
+  IF coalesce(current_setting('p52.tx', true), '') IS DISTINCT FROM txid_current()::text THEN
+    RAISE EXCEPTION 'P52W RECUSADO (fora do ensaio): a prova do WR-02 so roda dentro de scripts/p52_ensaio.cjs --mutacao=';
+  END IF;
+  -- (i) a impressão base
+  v_base := ${fp};
+  -- (ii) a vaga por predicado e o status-alvo pelo enum
+  SELECT v.id, v.titulo, v.status::text, v.deleted_at INTO v_id, v_titulo, v_status, v_del
+    FROM public.vagas v WHERE v.status <> 'ativa' AND v.deleted_at IS NULL ORDER BY v.id LIMIT 1;
+  IF v_id IS NULL THEN
+    RAISE EXCEPTION 'P52W FAIL (baseline): nenhuma vaga com status nao ativo e deleted_at nulo';
+  END IF;
+  SELECT t.e::text INTO v_alvo
+    FROM unnest(pg_catalog.enum_range(NULL::public.status_vaga)) WITH ORDINALITY AS t(e, i)
+   WHERE t.e::text <> 'ativa' AND t.e::text <> v_status ORDER BY t.i LIMIT 1;
+  IF v_alvo IS NULL THEN
+    RAISE EXCEPTION 'P52W FAIL (baseline): o enum status_vaga nao tem um segundo status nao ativo';
+  END IF;
+  -- (iii) passo 1: só titulo
+  BEGIN
+    UPDATE public.vagas SET titulo = coalesce(titulo, '') || ' ' WHERE id = v_id;
+    GET DIAGNOSTICS v_n = ROW_COUNT;
+    SELECT v.titulo, v.status::text, v.deleted_at INTO t_titulo, t_status, t_del FROM public.vagas v WHERE v.id = v_id;
+    IF v_n <> 1 OR t_titulo IS NOT DISTINCT FROM v_titulo OR t_status IS DISTINCT FROM v_status OR t_del IS DISTINCT FROM v_del THEN
+      v_premissa := v_premissa || 'titulo,';
+    END IF;
+    v_imp_titulo := ${fp};
+    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52W1';
+  EXCEPTION
+    WHEN SQLSTATE 'P52W1' THEN NULL;
+    WHEN OTHERS THEN v_inesperado := v_inesperado || 'titulo:' || SQLSTATE || ',';
+  END;
+  -- (iii) passo 2: só status
+  BEGIN
+    UPDATE public.vagas SET status = v_alvo::public.status_vaga WHERE id = v_id;
+    GET DIAGNOSTICS v_n = ROW_COUNT;
+    SELECT v.titulo, v.status::text, v.deleted_at INTO t_titulo, t_status, t_del FROM public.vagas v WHERE v.id = v_id;
+    IF v_n <> 1 OR t_status IS NOT DISTINCT FROM v_status OR t_titulo IS DISTINCT FROM v_titulo OR t_del IS DISTINCT FROM v_del THEN
+      v_premissa := v_premissa || 'status,';
+    END IF;
+    v_imp_status := ${fp};
+    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52W1';
+  EXCEPTION
+    WHEN SQLSTATE 'P52W1' THEN NULL;
+    WHEN OTHERS THEN v_inesperado := v_inesperado || 'status:' || SQLSTATE || ',';
+  END;
+  -- (iii) passo 3: só deleted_at
+  BEGIN
+    UPDATE public.vagas SET deleted_at = now() WHERE id = v_id;
+    GET DIAGNOSTICS v_n = ROW_COUNT;
+    SELECT v.titulo, v.status::text, v.deleted_at INTO t_titulo, t_status, t_del FROM public.vagas v WHERE v.id = v_id;
+    IF v_n <> 1 OR t_del IS NOT DISTINCT FROM v_del OR t_titulo IS DISTINCT FROM v_titulo OR t_status IS DISTINCT FROM v_status THEN
+      v_premissa := v_premissa || 'deleted_at,';
+    END IF;
+    v_imp_del := ${fp};
+    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52W1';
+  EXCEPTION
+    WHEN SQLSTATE 'P52W1' THEN NULL;
+    WHEN OTHERS THEN v_inesperado := v_inesperado || 'deleted_at:' || SQLSTATE || ',';
+  END;
+  IF v_inesperado <> '' THEN
+    RAISE EXCEPTION 'P52W FAIL (inesperado): [%]', rtrim(v_inesperado, ',');
+  END IF;
+  IF v_premissa <> '' THEN
+    RAISE EXCEPTION 'P52W FAIL (premissa): [%] — o passo nao mudou exatamente a sua coluna do trio', rtrim(v_premissa, ',');
+  END IF;
+  -- (iv) nada escapou dos envelopes
+  v_imp_fim := ${fp};
+  IF v_imp_fim IS DISTINCT FROM v_base THEN
+    RAISE EXCEPTION 'P52W FAIL (envelope): a impressao depois dos envelopes difere da base';
+  END IF;
+  -- (v) o julgamento
+  IF v_imp_titulo IS DISTINCT FROM v_base THEN
+    RAISE EXCEPTION 'P52W FAIL (estreita): a impressao mudou com uma edicao de titulo';
+  END IF;
+  IF v_imp_status IS NOT DISTINCT FROM v_base THEN
+    RAISE EXCEPTION 'P52W FAIL (status): a impressao nao viu a mudanca de status';
+  END IF;
+  IF v_imp_del IS NOT DISTINCT FROM v_base THEN
+    RAISE EXCEPTION 'P52W FAIL (deleted_at): a impressao nao viu o deleted_at preenchido';
+  END IF;
+  -- (vi) a evidência
+  PERFORM set_config('p52.evidencia',
+    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' vagas_estado:morde=ok'), false);
+END
+$p52w$;
+`;
+}
+
 function capturar() {
   const vs = MIGS.map(versao).map(lit).join(',');
   const RR = "pg_catalog.to_regclass('public.revisao_rejeicao')";
@@ -380,7 +514,8 @@ function capturar() {
     "(with anon as (select c.id from public.candidatos c where c.email = 'anonimizado+' || c.id::text || '@invalido.local' and c.user_id is null and c.data_nascimento = date '1900-01-01') " +
     "select json_build_object('titulares', (select count(*) from anon), 'linhas', (select count(*) from public.disponibilidade d where d.candidato_id in (select a.id from anon a)))) as disp_anonimizados, " +
     `${FP_USUARIOS_RH} as usuarios_rh, ` +
-    `${FP_OPCOES_SJT} as opcoes_sjt`;
+    `${FP_OPCOES_SJT} as opcoes_sjt, ` +
+    `${FP_VAGAS_ESTADO} as vagas_estado`;
   return sqlLeitura(q)[0];
 }
 
@@ -606,6 +741,8 @@ module.exports = {
   ponto,
   FP_USUARIOS_RH,
   FP_OPCOES_SJT,
+  FP_VAGAS_ESTADO,
+  provaVagasEstado,
   MIGS,
   PARES,
   SENTINELA,
```

### Passo 2 — smoke52a (d)–(j) (commit `2237d8c8`)

As sete cláusulas copiadas por FORMA das (d)–(j) do `p52_painel_vaga_smoke.sql` (linhas 536–871), com troca mecânica `p52p_`→`p52a_`, `smoke52p.`→`smoke52a.`, `P52P`→`P52A`, o nome da função, e as comparações de campo de (d) e (i) reescritas para `testes_aplicaveis` (igualdade de jsonb) e `aplica_cognitivo` (`to_jsonb` do booleano); o script de geração recusava sobra de `p52p`/`52p`/`P52P`/`'titulo'`/`departamento`. Literal único `smoke52a.esperado` = 10; o cabeçalho lista (a)–(j), as escritas de (h)/(i), diz que (j) é premissa sem mutação (DDL em `candidaturas` = lock exclusivo) e a razão da completude de (d). Medido antes (só leitura): 0 candidaturas vivas em vaga apagada, 0 rascunhos, 0 excluídas — A7 não pode reprovar antes em (d).

`<verify>` 2 (rodado como escrito, HEAD com o smoke ainda no disco e depois commitado sem mudança; 2026-10-13T00:32Z) — VERDE:

```text
ENSAIO VERDE: supabase/tests/p52_testes_candidato_smoke.sql · prefixadas=[20261011000007] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005,20261011000006] · ausentes=[20261011000004] · vistas=igual · smokes=[52a=10/10] · evidencia=avaliacao:testes_candidato=ok 52a.pop=cand:22,naturais:16 52a.alvo=publica · 892 ms
```

Duas tentativas anteriores do mesmo comando (00:30Z e 00:31Z) saíram com exit ≠ 0 por `p46apply: HTTP 502` (Cloudflare, `api.supabase.com`) na PRIMEIRA leitura (`lerEstado` → `sqlLeitura`), antes de compor ou enviar o ensaio — instrumento indisponível, não vermelho; `select 1` também dava 502. Sondado em segundo plano até `API OK 00:31:35Z`; a terceira execução é a acima. Nada foi enviado nas duas falhas.

### Passo 3 — runner `scripts/p52_mutacoes.cjs` (commit `2237d8c8`)

`SMOKES` + `smoke52a` (`P52A`, par `52a`, sem `exigePrefixadas`); `V07`, `S52A`, `fnTestes`, `A_PROJ_TESTES`, `A_PROJ_FIM` e `A_RECUSA_POS` (o literal da recusa do `<behavior>`); A1–A12 com `trocar(fnTestes(), …)` (A5 = o texto do GRANT) e A13–A14 no molde da B4 (`migracao: { versao: V07, transformar }` sobre o texto INTEIRO da migration, `trocar` em `A_PROJ_FIM`). Guarda, posse, junção e viva REUSAM `P_GUARDA`, `P_GUARDA_BLOCO`, `P_POSSE`, `P_JUNCAO`, `P_VIVA` (D-52-G7B-3). Ameaças em comentário (T-52-113..118). `julgarMutacao`/`julgarControle`/`aposentar` sem mudança (o diff abaixo só acrescenta). Conferência offline antes de rodar: as 14 entradas derivam sem `ANCORA AUSENTE/AMBIGUA`.

```diff
diff --git a/scripts/p52_mutacoes.cjs b/scripts/p52_mutacoes.cjs
index 7875a842..d4c3cca6 100644
--- a/scripts/p52_mutacoes.cjs
+++ b/scripts/p52_mutacoes.cjs
@@ -90,6 +90,7 @@ const SMOKES = {
   'supabase/tests/p52_banco_sjt_smoke.sql': { prefixo: 'P52B', par: '52b', exigePrefixadas: ['20261011000003'] },
   'supabase/tests/p52_gap_servidor_smoke.sql': { prefixo: 'P52G', par: '52g' },
   'supabase/tests/p52_painel_vaga_smoke.sql': { prefixo: 'P52P', par: '52p' },
+  'supabase/tests/p52_testes_candidato_smoke.sql': { prefixo: 'P52A', par: '52a' },
 };
 
 /* Baseline de persistência; null até ser lida. */
@@ -294,6 +295,17 @@ const P_GUARDA = "  IF v_uid IS NULL OR coalesce(v_role, '') <> 'candidato' THEN
 const P_GUARDA_BLOCO = P_GUARDA + "    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';\n" + '  END IF;\n';
 const P_JUNCAO = '    JOIN public.vagas v ON v.id = c.vaga_id\n';
 
+// ── 52-32: os testes da vaga das próprias candidaturas (migration 20261011000007) ──────────────
+// A 0007 copia BYTE A BYTE as linhas de guarda, posse, junção e viva da 0006 (D-52-G7B-3): as
+// âncoras `P_*` acima valem nas duas. Só a projeção é nova — `A_PROJ_TESTES` e `A_PROJ_FIM`, como
+// escritas na migration (únicas no arquivo inteiro: A13/A14 trocam sobre o texto COMPLETO).
+const V07 = '20261011000007';
+const S52A = 'supabase/tests/p52_testes_candidato_smoke.sql';
+const fnTestes = () => fnNova(V07, 'ler_testes_das_minhas_candidaturas');
+const A_PROJ_TESTES = "'testes_aplicaveis', v.testes_aplicaveis,";
+const A_PROJ_FIM = "'aplica_cognitivo', v.aplica_cognitivo)";
+const A_RECUSA_POS = 'P52-07 POS-PORTAO: public.ler_testes_das_minhas_candidaturas() le coluna de vagas fora da allowlist';
+
 const MUTACOES = [
   {
     // T-52-14: sem o helper vivo, o recrutador desativado (JWT ainda válido) lê a devolutiva.
@@ -675,6 +687,145 @@ const MUTACOES = [
     requer: [V06],
     sql: () => trocar(fnVagas(), P_JUNCAO, P_JUNCAO + '    CROSS JOIN (VALUES (1), (2)) AS p10_dup(n)\n', 'P10'),
   },
+  {
+    // T-52-113: posse aberta — o predicado de candidato_le_propria_candidatura vira `true`.
+    id: 'A1',
+    desc: 'ler_testes_das_minhas_candidaturas: o predicado de posse vira true (toda candidatura viva de todos)',
+    smoke: S52A,
+    letra: 'b',
+    requer: [V07],
+    sql: () => trocar(fnTestes(), P_POSSE, 'true', 'A1'),
+  },
+  {
+    // R1 do G-52-7 / D-52-G7B-2 (a truth): o filtro da vaga PÚBLICA volta ao WHERE — a bateria da vaga inativada some.
+    id: 'A2',
+    desc: "ler_testes_das_minhas_candidaturas: filtro de vaga publica (status = 'ativa' AND deleted_at IS NULL) no WHERE",
+    smoke: S52A,
+    letra: 'a',
+    requer: [V07],
+    sql: () =>
+      trocar(
+        fnTestes(),
+        P_VIVA,
+        "     AND c.deleted_at IS NULL AND c.is_rascunho = false\n     AND v.status = 'ativa' AND v.deleted_at IS NULL;\n",
+        'A2'
+      ),
+  },
+  {
+    // T-52-114 (D-52-G7B-1): sobre-projeção — 'titulo', v.titulo entra como quarta chave.
+    id: 'A3',
+    desc: "ler_testes_das_minhas_candidaturas: 'titulo', v.titulo como quarta chave da projecao",
+    smoke: S52A,
+    letra: 'c',
+    requer: [V07],
+    sql: () => trocar(fnTestes(), A_PROJ_FIM, "'aplica_cognitivo', v.aplica_cognitivo,\n                                               'titulo', v.titulo)", 'A3'),
+  },
+  {
+    // T-52-116 (D-52-G7B-3): a guarda passa a aceitar rh e administrador.
+    id: 'A4',
+    desc: 'ler_testes_das_minhas_candidaturas: a guarda aceita rh e administrador',
+    smoke: S52A,
+    letra: 'g',
+    requer: [V07],
+    sql: () =>
+      trocar(
+        fnTestes(),
+        P_GUARDA,
+        "  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('candidato', 'rh', 'administrador') THEN\n",
+        'A4'
+      ),
+  },
+  {
+    // T-52-115: EXECUTE de volta a anon depois da migration (o pg_default_acl de public).
+    id: 'A5',
+    desc: 'GRANT EXECUTE de ler_testes_das_minhas_candidaturas a anon depois da migration',
+    smoke: S52A,
+    letra: 'f',
+    requer: [V07],
+    sql: 'GRANT EXECUTE ON FUNCTION public.ler_testes_das_minhas_candidaturas() TO anon;',
+  },
+  {
+    // T-52-113: sem o filtro de rascunho — a candidatura rascunho volta a responder (oráculo).
+    id: 'A6',
+    desc: 'ler_testes_das_minhas_candidaturas: sem AND c.is_rascunho = false',
+    smoke: S52A,
+    letra: 'h',
+    requer: [V07],
+    sql: () => trocar(fnTestes(), ' AND c.is_rascunho = false', '', 'A6'),
+  },
+  {
+    // D-52-G7B-2: a vaga apagada por deleted_at some do retorno (contra a decisão confirmada pelo operador).
+    id: 'A7',
+    desc: 'ler_testes_das_minhas_candidaturas: AND v.deleted_at IS NULL no WHERE',
+    smoke: S52A,
+    letra: 'i',
+    requer: [V07],
+    sql: () =>
+      trocar(fnTestes(), P_VIVA, '     AND c.deleted_at IS NULL AND c.is_rascunho = false\n     AND v.deleted_at IS NULL;\n', 'A7'),
+  },
+  {
+    // T-52-116: a guarda deixa de exigir o sub — papel candidato sem sub passa.
+    id: 'A8',
+    desc: 'ler_testes_das_minhas_candidaturas: a guarda sem v_uid IS NULL OR',
+    smoke: S52A,
+    letra: 'e',
+    requer: [V07],
+    sql: () => trocar(fnTestes(), 'IF v_uid IS NULL OR ', 'IF ', 'A8'),
+  },
+  {
+    // T-52-116: sem a guarda inteira — token sem claims chega à busca.
+    id: 'A9',
+    desc: 'ler_testes_das_minhas_candidaturas: sem a guarda de papel',
+    smoke: S52A,
+    letra: 'e',
+    requer: [V07],
+    sql: () => trocar(fnTestes(), P_GUARDA_BLOCO, '', 'A9'),
+  },
+  {
+    // T-52-113: o conjunto vira multiconjunto — uma junção 1:N acrescentada por engano depois da de vagas.
+    id: 'A10',
+    desc: 'ler_testes_das_minhas_candidaturas: CROSS JOIN (VALUES (1), (2)) logo depois da juncao de vagas (cada candidatura duas vezes)',
+    smoke: S52A,
+    letra: 'd',
+    requer: [V07],
+    sql: () => trocar(fnTestes(), P_JUNCAO, P_JUNCAO + '    CROSS JOIN (VALUES (1), (2)) AS a10_dup(n)\n', 'A10'),
+  },
+  {
+    // T-52-117: o opt-in cognitivo vira constante — o sentinela alternado de (a) erra um dos status.
+    id: 'A11',
+    desc: "ler_testes_das_minhas_candidaturas: 'aplica_cognitivo', false no lugar do valor da vaga",
+    smoke: S52A,
+    letra: 'a',
+    requer: [V07],
+    sql: () => trocar(fnTestes(), A_PROJ_FIM, "'aplica_cognitivo', false)", 'A11'),
+  },
+  {
+    // T-52-117: a bateria vira constante — o sentinela de (a) não volta.
+    id: 'A12',
+    desc: "ler_testes_das_minhas_candidaturas: 'testes_aplicaveis', '[]'::jsonb no lugar do valor da vaga",
+    smoke: S52A,
+    letra: 'a',
+    requer: [V07],
+    sql: () => trocar(fnTestes(), A_PROJ_TESTES, "'testes_aplicaveis', '[]'::jsonb,", 'A12'),
+  },
+  {
+    // T-52-118 (WR-01 do 52-REVIEW-G7-1, não copiado): coluna de vagas com CAIXA mista — o POS da 0007 recusa.
+    id: 'A13',
+    desc: "migration 0007 com , 'titulo', v.Titulo acrescentado a ultima chave da projecao (RECUSA do POS)",
+    smoke: S52A,
+    recusa: A_RECUSA_POS,
+    requer: [V07],
+    migracao: { versao: V07, transformar: (t) => trocar(t, A_PROJ_FIM, "'aplica_cognitivo', v.aplica_cognitivo, 'titulo', v.Titulo)", 'A13') },
+  },
+  {
+    // T-52-118 (WR-01 do 52-REVIEW-G7-1, não copiado): coluna de vagas ENTRE ASPAS — o POS da 0007 recusa.
+    id: 'A14',
+    desc: "migration 0007 com , 'titulo', v.\"titulo\" acrescentado a ultima chave da projecao (RECUSA do POS)",
+    smoke: S52A,
+    recusa: A_RECUSA_POS,
+    requer: [V07],
+    migracao: { versao: V07, transformar: (t) => trocar(t, A_PROJ_FIM, "'aplica_cognitivo', v.aplica_cognitivo, 'titulo', v.\"titulo\")", 'A14') },
+  },
 ];
 
 /* Primeira reprovação da saída, com QUALQUER prefixo. */
```

### Passo 4 — provas

`<verify>` 3, parte 1 (`--so=A1..A14`, HEAD `2237d8c8`, entre 00:32Z e 00:42Z) — VERDE:

```text
A1 morde: ler_testes_das_minhas_candidaturas: o predicado de posse vira true (toda candidatura viva de todos) -> P52A FAIL (b) [outro_elementos_que_nao_sao_dele:42,outro_ve_candidaturas_do_dono:2,sub_sem_candidato:ok:n=44] (502 ms)
A2 morde: ler_testes_das_minhas_candidaturas: filtro de vaga publica (status = 'ativa' AND deleted_at IS NULL) no WHERE -> P52A FAIL (a) [rascunho_alvo_sem_testes_e_opt_in_da_vaga:ok:n=0,inativa_alvo_sem_testes_e_opt_in_da_vaga:ok:n=0,arquivada_alvo_sem_testes_e_opt_in_da_vaga:ok:n=0] (513 ms)
A3 morde: ler_testes_das_minhas_candidaturas: 'titulo', v.titulo como quarta chave da projecao -> P52A FAIL (c) [dono_vivo_chaves:aplica_cognitivo|candidatura_id|testes_aplicaveis|titulo,dono_vivo_elementos_tortos:2,outro_vivo_chaves:aplica_cognitivo|candidatura_id|testes_aplicaveis|titulo,outro_vivo_elementos_tortos:2,dono_vaga_inativa_chaves:aplica_cognitivo|candidatura_id|testes_aplicaveis|titulo,dono_vaga_inativa_elementos_tortos:2] (1130 ms)
A4 morde: ler_testes_das_minhas_candidaturas: a guarda aceita rh e administrador -> P52A FAIL (g) [administrador_sub_do_admin:ok:n=3,rh_sub_do_recrutador:ok:n=0,administrador_sub_do_dono:ok:n=2] (572 ms)
A5 morde: GRANT EXECUTE de ler_testes_das_minhas_candidaturas a anon depois da migration -> P52A FAIL (f) [anon_com_execute:true,anon_chamada:err:42501:forbidden] (560 ms)
A6 morde: ler_testes_das_minhas_candidaturas: sem AND c.is_rascunho = false -> P52A FAIL (h) [rascunho_diferente_do_vivo_menos_o_alvo:n=2/esperado=1] (544 ms)
A7 morde: ler_testes_das_minhas_candidaturas: AND v.deleted_at IS NULL no WHERE -> P52A FAIL (i) [alvo_sem_testes_e_opt_in_da_vaga_apagada:ok:n=1] (585 ms)
A8 morde: ler_testes_das_minhas_candidaturas: a guarda sem v_uid IS NULL OR -> P52A FAIL (e) [candidato_sem_sub:ok:n=0] (526 ms)
A9 morde: ler_testes_das_minhas_candidaturas: sem a guarda de papel -> P52A FAIL (e) [sem_claims:ok:n=0,sem_papel:ok:n=2,candidato_sem_sub:ok:n=0] (544 ms)
A10 morde: ler_testes_das_minhas_candidaturas: CROSS JOIN (VALUES (1), (2)) logo depois da juncao de vagas (cada candidatura duas vezes) -> P52A FAIL (d) [repetidas:32_linhas_em_22/22_candidatos] (1108 ms)
A11 morde: ler_testes_das_minhas_candidaturas: 'aplica_cognitivo', false no lugar do valor da vaga -> P52A FAIL (a) [inativa_alvo_sem_testes_e_opt_in_da_vaga:ok:n=2] (545 ms)
A12 morde: ler_testes_das_minhas_candidaturas: 'testes_aplicaveis', '[]'::jsonb no lugar do valor da vaga -> P52A FAIL (a) [rascunho_alvo_sem_testes_e_opt_in_da_vaga:ok:n=2,inativa_alvo_sem_testes_e_opt_in_da_vaga:ok:n=2,arquivada_alvo_sem_testes_e_opt_in_da_vaga:ok:n=2] (1051 ms)
A13 morde: migration 0007 com , 'titulo', v.Titulo acrescentado a ultima chave da projecao (RECUSA do POS) -> P52-07 POS-PORTAO: public.ler_testes_das_minhas_candidaturas() le coluna de vagas fora da allowlist (532 ms)
A14 morde: migration 0007 com , 'titulo', v."titulo" acrescentado a ultima chave da projecao (RECUSA do POS) -> P52-07 POS-PORTAO: public.ler_testes_das_minhas_candidaturas() le coluna de vagas fora da allowlist (530 ms)
leitura so-leitura igual a baseline: ledger=["20261011000001","20261011000002","20261011000003","20261011000005","20261011000006"] funcoes=8 mutacoes_p52=0 fixtures_p52={"users":0,"candidatos":0}
MUTACOES: 14/14 mordem; controle verde; nada persistiu (so=A1,A2,A3,A4,A5,A6,A7,A8,A9,A10,A11,A12,A13,A14) (aposentadas: B1,B2,B3,B4,B5,B6)
```

`<verify>` 3, parte 2 (rodada COMPLETA, mesmo HEAD) — VERDE; toda `An`/`Pn morde` presente:

```text
MUTACOES: 41/41 mordem; controle verde; nada persistiu (aposentadas: B1,B2,B3,B4,B5,B6)
mordem: L1 L2 L3 L4 L5 L6 L7 L8 G1 G2 G3 G4 G5 G6 G7 G8 G9 P1 P2 P3 P4 P5 P6 P7 P8 P9 P10 A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 A11 A12 A13 A14 
```

`<verify>` 4 — regressões com controle (mesmo HEAD, entre 00:32Z e 00:42Z) — as quatro VERDES:

```text
p52_leituras_rh_smoke controle: ENSAIO VERDE: supabase/tests/p52_leituras_rh_smoke.sql · prefixadas=[] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005,20261011000006] · ausentes=[20261011000007,20261011000004] · smokes=[52l=20/20] · evidencia=52l.pop=dev:4,sjt:7,tri:1 · 591 ms
p52_leituras_rh_smoke tratamento: ENSAIO VERDE: supabase/tests/p52_leituras_rh_smoke.sql · prefixadas=[20261011000007] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005,20261011000006] · ausentes=[20261011000004] · smokes=[52l=20/20] · evidencia=avaliacao:testes_candidato=ok 52l.pop=dev:4,sjt:7,tri:1 · 602 ms
p52_painel_vaga_smoke controle: ENSAIO VERDE: supabase/tests/p52_painel_vaga_smoke.sql · prefixadas=[] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005,20261011000006] · ausentes=[20261011000007,20261011000004] · smokes=[52p=10/10] · evidencia=52p.pop=cand:22,naturais:16 52p.alvo=publica · 560 ms
p52_painel_vaga_smoke tratamento: ENSAIO VERDE: supabase/tests/p52_painel_vaga_smoke.sql · prefixadas=[20261011000007] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005,20261011000006] · ausentes=[20261011000004] · smokes=[52p=10/10] · evidencia=avaliacao:testes_candidato=ok 52p.pop=cand:22,naturais:16 52p.alvo=publica · 518 ms
```

### Commits da Task 2 (caminhos nomeados; nenhum `-A`/`-a`/`--no-verify`)

- `c91a64a3` docs(52-32): resposta do operador na parada da tracer — D-52-G7B-1/-2/-5 (só a FRONTEIRA, ANTES de qualquer código)
- `0b4736b4` fix(52-32): capturar() fotografa vagas (id, status, deleted_at) e provaVagasEstado prova a mordida no ensaio que aborta (WR-02 do 52-REVIEW-G7-1)
- `2237d8c8` test(52-32): smoke52a completo (10 clausulas) e mutacoes A1-A14 (A13-A14 provam a varredura do WR-01 na 0007)

### Desvios e observações da Task 2

1. **Advisory (a) do checker aplicado** (ver Passo 1): `P52W FAIL (premissa)` e `(inesperado)` saem FORA do envelope `P52W1`.
2. **[Regra 2] guarda de ensaio na prova do WR-02**: `P52W RECUSADO (fora do ensaio)` quando `p52.tx` ≠ `txid_current()` — mesma forma do `$p52_so_ensaio$`; cada passo exige também que a SUA coluna tenha mudado (premissa não vácua).
3. **HTTP 502 da Management API** (Cloudflare) em duas execuções do `<verify>` 2, na leitura do ledger, antes de qualquer envio — instrumento indisponível; repetido depois de `API OK 00:31:35Z`. Não é vermelho de cláusula; nada foi enviado.
4. Nenhum `P52V FAIL (vistas)`; a contagem de `vagas` (15/12/2/1) não mudou durante a sessão — a janela de cadastro não gravou vaga durante a sessão (leitura de fechamento ao fim da §Task 3).

---

## §Task 3 — sessão B, 2026-10-13 (UTC)

Precondition: os quatro `<verify>` da Task 2 verdes e registrados acima; `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` vazio.

### Testes novos (commit `94c96eee`, ANTES do conserto)

- `src/features/avaliacao/services/__tests__/avaliacaoService.vagaNaoPublica.test.ts` — 11 casos (6 de `lerTestesDaMinhaCandidatura`, 5 de `getAvaliacaoContext`).
- `src/features/avaliacao/services/__tests__/redacaoService.vagaNaoPublica.test.ts` — 6 casos.
- `src/features/avaliacao-cognitiva/__tests__/cognitivoService.vagaNaoPublica.test.ts` — 4 casos.
- `src/features/privacidade/services/__tests__/exportacaoService.vagaNaoPublica.test.ts` — 8 casos (4 da mescla, começando por `typeof mesclarTitulosDasVagas`; 4 de `listarMeusCurriculos`).

Cliente espião com `from` e `rpc`; asserções de UMA linha. Antes do commit, um caso meu estava errado: «contexto com erro da RPC» afirmava «nenhuma consulta de `perguntas`», mas o serviço MONTA a consulta sempre (o `eq('status','active')` é registrado) e só não a aguarda sem bateria — a asserção virou «nenhum filtro de bateria em `perguntas`» + «nenhuma pergunta». Defeito do teste, corrigido antes do commit; o código não mudou por isso.

### Vermelho TDD pareado («Disciplina do vermelho e da mordida no Vitest», itens 1–3)

Seleção de cada linha: `npx vitest run <arquivo do caso> -t '<nome exato do caso>'` (os nomes não têm metacaractere de regex), a MESMA nos dois lados. Vermelho sobre `94c96eee` (commit dos testes), verde sobre `6e9fa444` (commit do conserto):

| caso (`-t`) | `94c96eee` | primeira linha da falha | `6e9fa444` |
|---|---|---|---|
| redacao projeta o embed simples da vaga, sem inner | `Tests  1 failed | 5 skipped (6)` | `AssertionError: a projecao de candidaturas: expected 'id, vaga:vagas!inner(testes_aplicavei…' to be 'id, vaga:vagas(testes_aplicaveis)'` | `Tests  1 passed | 5 skipped (6)` |
| redacao com vaga nula usa os codigos da RPC | `Tests  1 failed | 5 skipped (6)` | `AssertionError: uma chamada a RPC dos testes: expected +0 to be 1` | `Tests  1 passed | 5 skipped (6)` |
| redacao com a chave vaga ausente usa os codigos da RPC, como o nulo | `Tests  1 failed | 5 skipped (6)` | `AssertionError: uma chamada a RPC dos testes: expected +0 to be 1` | `Tests  1 passed | 5 skipped (6)` |
| redacao com vaga nula e erro da RPC segue Candidatura nao encontrada sem a pergunta padrao | `Tests  1 failed | 5 skipped (6)` | `AssertionError: a RPC foi tentada uma vez: expected +0 to be 1` | `Tests  1 passed | 5 skipped (6)` |
| redacao com vaga nula e sem a entrada da candidatura segue Candidatura nao encontrada | `Tests  1 failed | 5 skipped (6)` | `AssertionError: a RPC foi tentada uma vez: expected +0 to be 1` | `Tests  1 passed | 5 skipped (6)` |
| cognitivo com vagas nula e a entrada da RPC com opt-in abre a prova | `Tests  1 failed | 3 skipped (4)` | `AssertionError: uma chamada a RPC dos testes: expected +0 to be 1` | `Tests  1 passed | 3 skipped (4)` |
| cognitivo com a chave vagas ausente usa a entrada da RPC, como o nulo | `Tests  1 failed | 3 skipped (4)` | `AssertionError: uma chamada a RPC dos testes: expected +0 to be 1` | `Tests  1 passed | 3 skipped (4)` |
| cognitivo com vagas nula e erro da RPC fica fechado sem lancar | `Tests  1 failed | 3 skipped (4)` | `AssertionError: a RPC foi tentada uma vez: expected +0 to be 1` | `Tests  1 passed | 3 skipped (4)` |
| mescla preenche so o titulo nulo com o titulo da mesma candidatura | `Tests  1 failed | 7 skipped (8)` | `AssertionError: mesclarTitulosDasVagas exportado: expected 'undefined' to be 'function'` | `Tests  1 passed | 7 skipped (8)` |
| mescla nunca sobrescreve titulo presente | `Tests  1 failed | 7 skipped (8)` | `AssertionError: mesclarTitulosDasVagas exportado: expected 'undefined' to be 'function'` | `Tests  1 passed | 7 skipped (8)` |
| mescla ignora entrada malformada, titulo vazio e entradas que nao sao array | `Tests  1 failed | 7 skipped (8)` | `AssertionError: mesclarTitulosDasVagas exportado: expected 'undefined' to be 'function'` | `Tests  1 passed | 7 skipped (8)` |
| mescla mantem exatamente as chaves id caminho enviadoEm vagaTitulo | `Tests  1 failed | 7 skipped (8)` | `AssertionError: mesclarTitulosDasVagas exportado: expected 'undefined' to be 'function'` | `Tests  1 passed | 7 skipped (8)` |
| curriculos com vaga nula chamam a RPC da 0006 uma vez e mostram o titulo | `Tests  1 failed | 7 skipped (8)` | `AssertionError: uma chamada a RPC da 0006: expected +0 to be 1` | `Tests  1 passed | 7 skipped (8)` |
| curriculos com a chave vaga ausente chamam a RPC uma vez e mostram o titulo | `Tests  1 failed | 7 skipped (8)` | `AssertionError: uma chamada a RPC da 0006: expected +0 to be 1` | `Tests  1 passed | 7 skipped (8)` |
| curriculos com erro da RPC ficam com titulo nulo sem lancar e sem o texto do erro | `Tests  1 failed | 7 skipped (8)` | `AssertionError: a RPC foi tentada uma vez: expected +0 to be 1` | `Tests  1 passed | 7 skipped (8)` |

Casos que nasceram VERDES sobre `94c96eee` (14): os 11 de `avaliacaoService` (o GREEN deles é a Task 1, `8dd06272`), «redacao com o objeto vaga presente nao chama a RPC», «cognitivo com o objeto vagas presente nao chama a RPC e usa o embed» e «curriculos com todas as linhas tituladas nao chamam a RPC». TODOS têm mordida abaixo (advisory (b) do checker: nenhum fica «nasce verde, sem mordida»).

### Mordidas por mutação («Disciplina…», item 4)

Cópia descartável `W=<scratchpad>/p52_32_mut` montada pelos três comandos do item 4 (`rm -rf "$W" && git clone -q "$PWD" "$W"` · `git -C "$W" fetch -q origin 'refs/gsd/*:refs/gsd/*'` · `ln -s "$PWD/node_modules" "$W/node_modules"`), HEAD da cópia = `6e9fa444` (testes E conserto commitados); só `.env*.example` versionados na cópia, nenhum `.env.local`; env FALSO em cada execução (`VITE_SUPABASE_URL=http://127.0.0.1:9 VITE_SUPABASE_ANON_KEY=fake-anon-key`); `trap 'git -C "$W" checkout -- <arquivo>' EXIT INT TERM` armado antes da mutação; troca literal de âncora ÚNICA (o script recusava `ANCORA AUSENTE/AMBIGUA`); verde-base e vermelho com a MESMA seleção; depois da restauração, `git -C "$W" diff --quiet HEAD -- <arquivo>` e, na árvore real, `git diff --quiet HEAD -- <arquivo>`.

| id | alvo | mutação (âncora → troca) | caso (`-t`) | verde-base | vermelho | primeira linha da falha | diff cópia / real |
|---|---|---|---|---|---|---|---|
| B1 | `avaliacaoService.ts` | `return {⏎      testes_aplicaveis: entrada.testes_aplicaveis,` → `return {⏎      ...(entrada as object),⏎      testes_aplicaveis: entrada.testes_aplicaveis,` | lerTestes devolve so as duas chaves mesmo com titulo e salario na entrada | `Tests  1 passed | 10 skipped (11)` | `Tests  1 failed | 10 skipped (11)` | `AssertionError: so testes_aplicaveis e aplica_cognitivo atravessam: expected 'aplica_cognitivo,candidatura_id,salar…' to be 'aplica_cognitivo,testes_aplicaveis'` | 0 / 0 |
| B2 | `avaliacaoService.ts` | `ehTestesDaMinhaCandidatura(e) && e.candidatura_id === candidaturaId,` → `ehTestesDaMinhaCandidatura(e),` | lerTestes ignora a entrada de outra candidatura | `Tests  1 passed | 10 skipped (11)` | `Tests  1 failed | 10 skipped (11)` | `AssertionError: entrada de outra candidatura nunca vale para a pedida: expected { …(2) } to be null` | 0 / 0 |
| B3 | `avaliacaoService.ts` | `typeof o.aplica_cognitivo === 'boolean' &&` → `true &&` | lerTestes ignora entrada malformada | `Tests  1 passed | 10 skipped (11)` | `Tests  1 failed | 10 skipped (11)` | `AssertionError: aplica_cognitivo que nao e booleano invalida a entrada: expected { …(2) } to be null` | 0 / 0 |
| B4 | `avaliacaoService.ts` | `if (error \|\| !Array.isArray(data)) return null` → `if (!Array.isArray(data)) return null` | lerTestes devolve null quando a RPC responde erro, mesmo com dados junto | `Tests  1 passed | 10 skipped (11)` | `Tests  1 failed | 10 skipped (11)` | `AssertionError: resposta com erro nunca e confiada: expected { …(2) } to be null` | 0 / 0 |
| B5 | `avaliacaoService.ts` | `aplica_cognitivo: entrada.aplica_cognitivo,⏎    }⏎  } catch {⏎    return null⏎  }` → `aplica_cognitivo: entrada.aplica_cognitivo,⏎    }⏎  } catch (e) {⏎    throw e⏎  }` | lerTestes devolve null quando a promessa da RPC rejeita, sem lancar | `Tests  1 passed | 10 skipped (11)` | `Tests  1 failed | 10 skipped (11)` | `AssertionError: falha de transporte nao lanca: expected true to be false` | 0 / 0 |
| B6 | `avaliacaoService.ts` | `if (error \|\| !Array.isArray(data)) return null` → `if (error) return null⏎    if (!Array.isArray(data)) return data as never` | lerTestes devolve null quando o retorno nao e array | `Tests  1 passed | 10 skipped (11)` | `Tests  1 failed | 10 skipped (11)` | `AssertionError: objeto solto no lugar da lista vira null: expected { candidatura_id: 'cand-0001', …(2) } to be null` | 0 / 0 |
| B7 | `avaliacaoService.ts` | `if (candRow.vaga == null) {` → `if (candRow.vaga?.testes_aplicaveis == null) {` | contexto com o objeto vaga presente nao chama a RPC mesmo com testes nulos dentro dele | `Tests  1 passed | 10 skipped (11)` | `Tests  1 failed | 10 skipped (11)` | `AssertionError: embed presente: nenhuma chamada a RPC dos testes: expected 1 to be +0` | 0 / 0 |
| B8 | `avaliacaoService.ts` | `const daRpc = await lerTestesDaMinhaCandidatura(candRow.id)` → `await lerTestesDaMinhaCandidatura(candRow.id)⏎    const daRpc = await lerTestesDaMinhaCandidatura(candRow.id)` | contexto com vaga nula chama a RPC uma vez e usa a bateria e o opt-in dela | `Tests  1 passed | 10 skipped (11)` | `Tests  1 failed | 10 skipped (11)` | `AssertionError: vaga nula: exatamente uma chamada: expected 2 to be 1` | 0 / 0 |
| B9 | `avaliacaoService.ts` | `if (candRow.vaga == null) {` → `if (candRow.vaga === null) {` | contexto com a chave vaga ausente chama a RPC uma vez, como o nulo | `Tests  1 passed | 10 skipped (11)` | `Tests  1 failed | 10 skipped (11)` | `AssertionError: vaga ausente: exatamente uma chamada: expected +0 to be 1` | 0 / 0 |
| B10 | `avaliacaoService.ts` | `testesAplicaveis = daRpc.testes_aplicaveis ?? null` → `testesAplicaveis = null` | contexto filtra perguntas pelos itens_ids da bateria vinda da RPC | `Tests  1 passed | 10 skipped (11)` | `Tests  1 failed | 10 skipped (11)` | `AssertionError: in id com os itens_ids da RPC: expected 'null' to be '["p-1","p-2"]'` | 0 / 0 |
| B11 | `avaliacaoService.ts` | `candRow.vaga?.aplica_cognitivo ?? false` → `candRow.vaga?.aplica_cognitivo ?? true` | contexto com erro da RPC fica sem testes e com opt-in falso, sem lancar | `Tests  1 passed | 10 skipped (11)` | `Tests  1 failed | 10 skipped (11)` | `AssertionError: opt-in falso no erro: expected true to be false` | 0 / 0 |
| B12 | `redacaoService.ts` | `let testes = linhaCand.vaga?.testes_aplicaveis` → `let testes = linhaCand.vaga?.testes_aplicaveis⏎  await lerTestesDaMinhaCandidatura(candidaturaId)` | redacao com o objeto vaga presente nao chama a RPC | `Tests  1 passed | 5 skipped (6)` | `Tests  1 failed | 5 skipped (6)` | `AssertionError: embed presente: nenhuma chamada: expected 1 to be +0` | 0 / 0 |
| B13 | `cognitivoService.ts` | `let aplicaCognitivo = raw.vagas?.aplica_cognitivo ?? false` → `let aplicaCognitivo = raw.vagas?.aplica_cognitivo ?? false⏎  await lerTestesDaMinhaCandidatura(raw.id)` | cognitivo com o objeto vagas presente nao chama a RPC e usa o embed | `Tests  1 passed | 3 skipped (4)` | `Tests  1 failed | 3 skipped (4)` | `AssertionError: embed presente: nenhuma chamada: expected 1 to be +0` | 0 / 0 |
| B14 | `exportacaoService.ts` | `if (!resultado.some((linha) => linha.vagaTitulo === null)) return resultado` → `(removida)` | curriculos com todas as linhas tituladas nao chamam a RPC | `Tests  1 passed | 7 skipped (8)` | `Tests  1 failed | 7 skipped (8)` | `AssertionError: todas com titulo: nenhuma chamada: expected 1 to be +0` | 0 / 0 |

Escolha das mutações: B12/B13 INSEREM uma chamada à RPC em vez de trocar a condição por `true` — com `true`, a RPC sem entrada levaria a redação a `NOT_FOUND` lançado (falha que não é de asserção, instrumento que não conta como mordida); B11 troca o default do opt-in (`?? false` → `?? true`), porque forçar o ramo com `daRpc` nulo daria `TypeError`. Todas as 14 primeiras linhas de falha são `AssertionError` com o rótulo do caso.

### GREEN (commit `6e9fa444`) — diff de produção desta task

```diff
diff --git a/src/features/avaliacao-cognitiva/services/cognitivoService.ts b/src/features/avaliacao-cognitiva/services/cognitivoService.ts
index 2d574852..3081f151 100644
--- a/src/features/avaliacao-cognitiva/services/cognitivoService.ts
+++ b/src/features/avaliacao-cognitiva/services/cognitivoService.ts
@@ -28,6 +28,7 @@
  * @see supabase/functions/_shared/cognitivo-schemas.ts (SubmitCognitivoBodySchema — the body contract)
  */
 import { supabase } from '@/lib/supabase/client'
+import { lerTestesDaMinhaCandidatura } from '@/features/avaliacao/services/avaliacaoService'
 
 /** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
 export class CognitivoServiceError extends Error {
@@ -140,11 +141,21 @@ export async function getContexto(
     etapa_atual: string
     vagas?: { aplica_cognitivo?: boolean } | null
   }
+  // 52-32 (D-52-G7B-5 — o quarto leitor): sob a RLS do candidato o embed `vagas` volta NULO quando a
+  // vaga saiu do ar (só a policy pública a alcança). Sem isto, a página de avaliações — que passa a
+  // mostrar o card cognitivo da vaga não pública com opt-in — levaria a uma prova «indisponível».
+  // Só nesse caso, UMA chamada à RPC `ler_testes_das_minhas_candidaturas`, e só `aplica_cognitivo` é
+  // usado; sem a entrada (erro, ausência), falso — a prova segue fechada, nunca aberta por acidente.
+  let aplicaCognitivo = raw.vagas?.aplica_cognitivo ?? false
+  if (raw.vagas == null) {
+    const daRpc = await lerTestesDaMinhaCandidatura(raw.id)
+    aplicaCognitivo = daRpc?.aplica_cognitivo ?? false
+  }
   return {
     candidatura_id: raw.id,
     vaga_id: raw.vaga_id,
     etapa_atual: raw.etapa_atual,
-    aplica_cognitivo: raw.vagas?.aplica_cognitivo ?? false,
+    aplica_cognitivo: aplicaCognitivo,
   }
 }
 
diff --git a/src/features/avaliacao/services/redacaoService.ts b/src/features/avaliacao/services/redacaoService.ts
index 97c920dd..19828762 100644
--- a/src/features/avaliacao/services/redacaoService.ts
+++ b/src/features/avaliacao/services/redacaoService.ts
@@ -41,6 +41,7 @@
  */
 import { supabase } from '@/lib/supabase/client'
 import { respostaRedacaoSchema, type RespostaRedacao } from '../schemas/redacaoSchema'
+import { lerTestesDaMinhaCandidatura } from './avaliacaoService'
 
 /** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
 export class RedacaoServiceError extends Error {
@@ -145,9 +146,18 @@ export async function getRedacaoContext(
   }
 
   // A vaga da candidatura decide o escopo. Own-row RLS cobre esta leitura.
+  //
+  // 52-32 (R1 do G-52-7 · D-52-G7B-4): o embed era `vagas!inner(...)`. Sob a RLS do candidato a única
+  // policy de SELECT de `vagas` que o alcança é a pública («Público vê vagas ativas»): com a vaga
+  // pausada, fechada, arquivada ou apagada, o `!inner` fazia a LINHA da candidatura sumir e a tela
+  // dizia «Candidatura não encontrada» a um candidato ainda no funil. Agora o embed é simples (a
+  // linha fica, com `vaga` nula) e, só nesse caso, os `codigos` vêm da RPC
+  // `ler_testes_das_minhas_candidaturas` (UMA chamada, só `testes_aplicaveis` é usado). Sem a
+  // entrada (erro, ausência), o desfecho é o de HOJE — `NOT_FOUND` —, nunca o default `is_padrao`:
+  // ele serviria a pergunta errada por acidente a quem a vaga declarou outros `codigos`.
   const { data: candRow, error: candErr } = await supabase
     .from('candidaturas')
-    .select('id, vaga:vagas!inner(testes_aplicaveis)')
+    .select('id, vaga:vagas(testes_aplicaveis)')
     .eq('id', candidaturaId)
     .is('deleted_at', null)
     .maybeSingle()
@@ -163,8 +173,15 @@ export async function getRedacaoContext(
     throw new RedacaoServiceError('Candidatura não encontrada', 'NOT_FOUND')
   }
 
-  const testes = (candRow as unknown as { vaga: { testes_aplicaveis: unknown } | null })
-    .vaga?.testes_aplicaveis
+  const linhaCand = candRow as unknown as { id: string; vaga?: { testes_aplicaveis: unknown } | null }
+  let testes = linhaCand.vaga?.testes_aplicaveis
+  if (linhaCand.vaga == null) {
+    const daRpc = await lerTestesDaMinhaCandidatura(candidaturaId)
+    if (!daRpc) {
+      throw new RedacaoServiceError('Candidatura não encontrada', 'NOT_FOUND')
+    }
+    testes = daRpc.testes_aplicaveis
+  }
   const elem = Array.isArray(testes)
     ? (testes as Array<Record<string, unknown>>).find(
         (e) => e.teste === 'redacao_cultural' || e.tipo === 'redacao_cultural',
diff --git a/src/features/privacidade/services/exportacaoService.ts b/src/features/privacidade/services/exportacaoService.ts
index f85c6557..752cb15a 100644
--- a/src/features/privacidade/services/exportacaoService.ts
+++ b/src/features/privacidade/services/exportacaoService.ts
@@ -44,6 +44,7 @@
  * @see src/features/agendamento/services/agendamentoCandidatoService.ts (o molde do disparo por Blob/anchor)
  */
 import { supabase } from '@/lib/supabase/client'
+import { lerVagasDasMinhasCandidaturas } from '@/features/vagas/services/candidaturasService'
 // O endereço do canal de privacidade tem UMA fonte no projeto. Duplicá-lo aqui criaria duas
 // verdades sobre o mesmo canal humano — e é o canal que a copy de erro oferece
 // quando o caminho automático falha.
@@ -1038,6 +1039,31 @@ function tituloDaVaga(vaga: unknown): string | null {
   return typeof titulo === 'string' && titulo.trim() !== '' ? titulo : null
 }
 
+/**
+ * 52-32 (R1 do G-52-7 · D-52-G7B-1: a 0006 reusada) — preenche `vagaTitulo` NULO com o `titulo` da
+ * entrada de `ler_vagas_das_minhas_candidaturas` da MESMA candidatura.
+ *
+ * Pura e defensiva: `entradas` que não é array devolve as linhas como vieram; entrada sem
+ * `candidatura_id` string ou sem `titulo` string não vazia é ignorada; nunca sobrescreve um título
+ * presente; só `titulo` atravessa (nenhuma outra chave da entrada entra na `LinhaCurriculo`).
+ */
+export function mesclarTitulosDasVagas(linhas: LinhaCurriculo[], entradas: unknown): LinhaCurriculo[] {
+  if (!Array.isArray(entradas)) return linhas
+  const porCandidatura = new Map<string, string>()
+  for (const e of entradas) {
+    if (typeof e !== 'object' || e === null || Array.isArray(e)) continue
+    const o = e as Record<string, unknown>
+    if (typeof o.candidatura_id !== 'string' || typeof o.titulo !== 'string' || o.titulo.trim() === '') continue
+    if (!porCandidatura.has(o.candidatura_id)) porCandidatura.set(o.candidatura_id, o.titulo)
+  }
+  if (porCandidatura.size === 0) return linhas
+  return linhas.map((linha) => {
+    if (linha.vagaTitulo !== null) return linha
+    const titulo = porCandidatura.get(linha.id)
+    return titulo === undefined ? linha : { ...linha, vagaTitulo: titulo }
+  })
+}
+
 /**
  * Lista as candidaturas do titular **que têm currículo** — own-row, por allowlist.
  *
@@ -1074,7 +1100,7 @@ export async function listarMeusCurriculos(
   }
 
   const linhas = (data ?? []) as unknown as LinhaCurriculoBruta[]
-  return linhas
+  const resultado = linhas
     .filter((linha) => typeof linha?.curriculo_url === 'string' && linha.curriculo_url !== '')
     .map((linha) => ({
       id: String(linha.id),
@@ -1082,6 +1108,15 @@ export async function listarMeusCurriculos(
       enviadoEm: typeof linha.created_at === 'string' ? linha.created_at : '',
       vagaTitulo: tituloDaVaga(linha.vaga),
     }))
+
+  // 52-32 (R1 do G-52-7 · D-52-G7B-1: a 0006 reusada; candidatura excluída segue sem título —
+  // residual R1): sob a RLS do candidato o embed `vaga` volta NULO quando a vaga saiu do ar. Só
+  // quando alguma linha veio sem título, UMA chamada a `ler_vagas_das_minhas_candidaturas` (que já
+  // está no ar, revisada) e a mescla do título; erro = as linhas como vieram (`vagaTitulo` nulo,
+  // «Vaga não identificada»), sem lançar e sem ecoar a mensagem.
+  if (!resultado.some((linha) => linha.vagaTitulo === null)) return resultado
+  const entradas = await lerVagasDasMinhasCandidaturas()
+  return mesclarTitulosDasVagas(resultado, entradas)
 }
 
 /**
diff --git a/src/features/vagas/services/candidaturasService.ts b/src/features/vagas/services/candidaturasService.ts
index 4cb57867..39e07082 100644
--- a/src/features/vagas/services/candidaturasService.ts
+++ b/src/features/vagas/services/candidaturasService.ts
@@ -336,7 +336,7 @@ export function mesclarVagasDasCandidaturas(linhas: Candidatura[], entradas: unk
  * Erro (inclusive de transporte) devolve `null` — sem lançar e sem ecoar a mensagem: as linhas
  * ficam como vieram (o fallback do cartão), e a lista nunca cai por causa desta leitura.
  */
-async function lerVagasDasMinhasCandidaturas(): Promise<unknown> {
+export async function lerVagasDasMinhasCandidaturas(): Promise<unknown> {
   try {
     // NARROW confined cast: `ler_vagas_das_minhas_candidaturas` não está em `database.types.ts`
     // (D-52-G7-5); quem o retira: o primeiro plano que rodar `npm run db:types < /dev/null` E
```

`CURRICULOS_ALLOWLIST`, `SELECT_LISTA_RH`, `VAGA_ALLOWLIST`, `listAllCandidaturas`, `listCandidaturasByVaga`: `git diff refs/gsd/52-31/sha HEAD -- src | grep -E '^[+-]' | grep -cE '<os cinco nomes>'` → `0`. Todos os caminhos de código desde `refs/gsd/52-31/sha` estão em `files_modified` (15 arquivos, `git diff --stat`).

### Portões da suíte (HEAD `6e9fa444`, entre 00:32Z e 00:42Z)

`<verify>` 1 — as quatro features e as páginas: `Test Files  77 passed (77)` · `Tests  728 passed (728)`; e o delta:

```text
vitest delta: base=0d70ac7 2725/2 · head=6e9fa44 3179/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok
```

(pré-existentes = os 2 de `src/__tests__/promessasComExecutor.test.ts`, iguais na base e em HEAD.)

`<verify>` 2 — lint, lido contra `tsc_base` da §Task 1 por máquina:

```text
lint exit=2 tsc errors=89 (base 89)
```

Tipografia (pedida no despacho; `node scripts/p52_tipografia.cjs --base refs/gsd/52-31/sha -- <os cinco serviços>`): `TIPOGRAFIA OK (149 linhas acrescentadas varridas)`.

`<verify>` 3 — build:

```text
marcadores do 52-32 no chunk eager; embed antigo da redacao ausente
ler_testes_das_minhas_candidaturas -> build/assets/index-B9DljfU9.js · id, vaga:vagas(testes_aplicaveis) -> build/assets/index-B9DljfU9.js · vagas!inner(testes_aplicaveis): ausente de build/assets/
```

### Commits da Task 3 (caminhos nomeados; nenhum `-A`/`-a`/`--no-verify`; o pre-commit imprimiu `tsc errors: 89` em cada um)

- `94c96eee` test(52-32): redacao, prova cognitiva e curriculos com vaga nao publica (vermelho antes do conserto) e a leitura dos testes no servico
- `6e9fa444` fix(52-32): redacao, prova cognitiva e curriculos leem a vaga das proprias candidaturas pela RPC quando o embed vem nulo (R1 do G-52-7, D-52-G7B-5)

### Estado na parada

Nada aplicado em PROD (a 0007 só rodou dentro de `p52_ensaio.cjs`/`p52_mutacoes.cjs`, requisições que abortam; a leitura de fechamento abaixo confirma), nada empurrado, nenhum deploy, nenhum review, nenhum pin, `database.types.ts` intocado, nenhum `52-32-SUMMARY.md`, STATE.md e ROADMAP.md não tocados. Próxima: **Task 4** — review adversarial `52-REVIEW-G7B-1.md` pelo orquestrador (`diff_base` = `refs/gsd/52-31/sha`), depois a decisão escrita do operador, numa sessão nova.

Leitura de fechamento (só leitura, `node p46apply.cjs sql "set transaction read only; …"`, 2026-10-13T00:43Z): `[ { "no_ledger": 0, "ausente": true, "vagas": 15, "pred": 12, "agora": "2026-10-12 21:43:07.278567-03" }]` — 0007 fora do ledger, função ausente em PROD, `vagas` com as mesmas contagens do início da sessão (15 linhas, 12 no predicado da sonda).

fronteira_retomada: sessao_b_encerrada 2026-10-13T00:43Z head=6e9fa4440c568f382647ada9c2c329aa137f13b1
