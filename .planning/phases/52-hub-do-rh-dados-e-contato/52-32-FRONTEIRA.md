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
