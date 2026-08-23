---
fase: 46-purga-automatica-dry-run-live
planos_revisados: [46-05, 46-06, 46-07]
escopo_diff: 940021f..HEAD
revisado_em: 2026-08-23
profundidade: deep
tipo: revisao adversarial retroativa (portao de fase destrutiva)
arquivos_revisados: 12
status: issues_found
veredito: ACHADOS
exige_reverter_prod: false
achados:
  blocker: 1
  high: 5
  medium: 6
  low: 9
  total: 21
primeira_linha: >
  NAO existe caminho pelo qual a execucao noturna de hoje (modo = dry_run) destrua
  linha real ou enfileire net.http_post. Verificado por leitura de todos os ramos de
  varrer_purga_retencao() v3. Nada precisa ser desarmado agora.
---

# Phase 46 · Code review adversarial retroativo — planos 46-05, 46-06 e 46-07

**Escopo:** `940021f..HEAD` (21 commits).
**Metodo:** leitura da fonte. Sem tools MCP do Supabase — os fatos de PROD usados aqui
vieram do briefing do orquestrador e estao marcados como tal. As perguntas que exigem
medicao viva estao na secao final.
**Nao reaberto:** nada das rodadas 1–4 do `46-REVIEW.md` (aquelas cobrem o 46-04).

---

## ⚠ PRIMEIRO, A PERGUNTA QUE VEM ANTES DE TODAS

**A execucao noturna de hoje nao pode destruir dado real, e nao ha o que desarmar.**

Percorri todos os ramos de `varrer_purga_retencao()` v3
(`20260823000011_p46_sweep_dispatch_e_reten05.sql:192-960`) com `v_modo = 'dry_run'`:

| Ramo | O que toca | Comita? |
|---|---|---|
| (a) leitura do cerco | nada | — |
| (a.3) reconciliacao | `purga_execucao_itens` / `purga_execucoes` (ledger) | sim, e correto |
| (a.4) RETEN-05 | `DELETE FROM notificacoes_enviadas` | **NAO** — `RAISE … P46RN` em `v_modo <> 'live'` (`:472-475`) reverte a subtransacao inteira |
| (b)(c) | `pg_temp` + `SELECT` | — |
| (d) cap | INSERT de ledger + `RETURN` | sim, so ledger |
| (f) kill switch | INSERT de ledger + `RETURN` | inalcancavel em dry_run |
| (f.5) cofre | `SELECT` em `vault.decrypted_secrets` | — |
| (g) laco | `anonimizar_candidato(id, **true**)` — literal `true` em TODOS os modos (`:706`) | **NAO** — terminador `P45DR`, subtransacao revertida |
| (g.5) dispatch | `net.http_post` | **estruturalmente inalcancavel**: o bloco inteiro vive dentro de `IF v_modo = 'live'` (`:863-906`) |
| (h) fechamento | UPDATE de ledger | sim, so ledger |

Tres verificacoes adicionais:

1. **O terminador do dry-run de RETEN-05 cobre TODOS os ramos.** A condicao e
   `v_modo <> 'live'` — uma **negacao contra o unico valor seguro**, e nao uma lista de
   modos inseguros. Qualquer rotulo novo no `CHECK` de `config_purga.modo` cai
   automaticamente no lado que REVERTE. Esta e a direcao certa, e vale registrar porque
   e o oposto do que o resto desta fase costuma errar.
2. **O `DELETE` do RETEN-05 e revertido em `dry_run`, e nao so em `off`.** O `IF` e
   `<> 'live'`, nao `= 'off'`. Conferido em `:472`.
3. **Nao existe trigger em `public.notificacoes_enviadas`** (`grep -rn "CREATE TRIGGER"
   supabase/migrations/*.sql | grep notificacoes_enviadas` → vazio), entao o `DELETE`
   de (a.4) nao tem como disparar `net.http_post` por via indireta. O smoke desliga
   gatilhos por criterio de catalogo, e nao por nome — se um nascer amanha, ele o pega.

**Conclusao:** nenhum achado deste documento exige reverter o dry-run, desagendar o cron
ou remover a Edge Function. Todos sao consertaveis com o sistema como esta, e o unico
que tem prazo (BLOCKER-01) tem duas semanas de folga — ele so e consultado no flip.

---

## BLOCKER

### BL-01 · O portao do flip conta como ensaio execucoes que nao ensaiaram nada

**Arquivo:** `supabase/migrations/20260823000013_p46_salvar_config_purga.sql:443-449`
**Requisito atingido:** D-46-14, SC#1 ("dry-run decorativo"), PURGA-04.

```sql
SELECT min(iniciada_em), count(*), count(*) >= 14,
       count(*) FILTER (WHERE elegiveis > 0)
  INTO v_primeira, v_total, v_tem_14_exec, v_com_eleg
  FROM public.purga_execucoes
 WHERE modo_vigente IN ('dry_run', 'live');
```

O recorte e por **`modo_vigente`** e por mais nada. O comentario imediatamente acima
(`:424-442`) argumenta, com razao e por extenso, que execucoes em `off` nao podem contar
porque *"o kill switch retorna logo depois de contar os elegiveis, antes de qualquer
item"*. **Essa propriedade vale, palavra por palavra, para outros dois vereditos que o
recorte deixa passar:**

| veredito | Onde a funcao retorna | Chegou a abrir item? | Chamou o motor? | `elegiveis` pode ser > 0? | Conta no portao? |
|---|---|---|---|---|---|
| `desligado` | (f), `:607-613` | nao | nao | sim | **nao** (correto) |
| `cap_excedido` | (d), `:578-585` | nao | nao | **sim, por definicao** | **SIM** ⛔ |
| `segredo_ausente` | (f.5), `:645-653` | nao | nao | **sim** | **SIM** ⛔ |
| `dry_run` / `despachado` | (h) | sim | sim | sim | sim (correto) |

Consequencia concreta e nao hipotetica: **catorze noites com o Vault sem
`edge_invoke_key` produzem catorze linhas em `modo_vigente = 'dry_run'` com
`elegiveis = 4` e veredito `segredo_ausente`, e os TRES criterios de D-46-14 passam a
estar satisfeitos com ZERO evidencia sobre o caminho do delete.** Que e literalmente o
"dry-run decorativo" que o SC#1 proibe — na forma que o criterio escrito por extenso nao
pega, exatamente como o comentario diz sobre `off`.

O proprio `46-07-RUNBOOK-FLIP.md:231-232` marca os dois vereditos com **⛔** na tabela de
vigilancia dos 14 dias (`segredo_ausente` → *"em live o despacho nao aconteceria"*;
`cap_excedido` → *"a execucao ABORTOU inteira"*). O runbook sabe que sao estados ruins e
o servidor os aceita como prova.

E a assercao `(d)` do smoke nao pega isso: `(d.4)` monta *"14+ execucoes e NENHUMA sobre
conjunto nao-vazio"* zerando `elegiveis` — nunca constroi o caso "14 execucoes com
`elegiveis > 0` que nao ensaiaram".

**Conserto** (migration nova, antes de 2026-09-06 — nao ha o que reverter):

```sql
-- allowlist de VEREDITO, jamais negacao: um veredito novo no futuro fica de FORA,
-- que e a direcao segura num portao que autoriza destruicao irreversivel.
SELECT min(iniciada_em), count(*), count(*) >= 14,
       count(*) FILTER (WHERE elegiveis > 0)
  INTO v_primeira, v_total, v_tem_14_exec, v_com_eleg
  FROM public.purga_execucoes
 WHERE modo_vigente IN ('dry_run', 'live')
   AND veredito     IN ('dry_run', 'despachado');
```

E, para o criterio 3, medir a **evidencia** em vez do numero — uma execucao so ensaiou o
caminho do delete se algum item dela carrega `relato_dry_run`:

```sql
count(*) FILTER (WHERE EXISTS (
  SELECT 1 FROM public.purga_execucao_itens i
   WHERE i.execucao_id = purga_execucoes.id AND i.relato_dry_run IS NOT NULL))
```

E acrescentar em `p46_purga_smoke.sql` o caso `(d.8)`: 14 execucoes em `dry_run` com
`elegiveis = 4` e `veredito = 'segredo_ausente'` → a RPC tem de RECUSAR nomeando os
criterios. Sem esse caso o conserto nao fica vigiado.

---

## HIGH

### HI-01 · O kill switch PODE ser recusado — por uma falha na escrita da trilha

**Arquivo:** `20260823000013:508-553`
**Contradiz:** o `COMMENT` vivo da propria funcao (`:617-621`) e
`46-07-RUNBOOK-FLIP.md:289-306`.

A ordem do corpo e (7) mutacao → (8) `PERFORM public.log_auditoria(...)`, **na mesma
transacao**. Isso e correto e obrigatorio para o flip `→ live`: a mudanca e o registro
tem de comitar juntos.

Para `→ off` a prioridade **inverte**, e o arquivo nao percebeu. Qualquer falha do passo
(8) — um rotulo de enum removido depois do apply, uma constraint nova em
`logs_auditoria`, um trigger, disco cheio — **reverte a mutacao junto**, e o operador que
digitou o kill switch as tres da manha recebe um erro e a purga continua ligada. O
proprio arquivo escreve, tres secoes acima: *"Um kill switch que pode ser recusado nao e
um kill switch, e o momento em que ele mais importa e exatamente aquele em que algum
criterio estaria falhando."* A trilha e um estado a partir do qual o `off` e recusavel, e
o `COMMENT` diz **"DE ESTADO NENHUM"**.

O bloco de auto-verificacao do topo (`:176-196`) confere os rotulos de enum **no instante
do apply** — nao no instante da chamada, que e quando importa.

**Conserto:** manter a atomicidade para toda transicao **exceto** `→ off`, e nesse caso
degradar a falha da trilha para `WARNING`:

```sql
IF v_modo_novo = 'off' THEN
  BEGIN
    PERFORM public.log_auditoria(...);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'salvar_config_purga: a purga FOI DESLIGADA e a trilha NAO pode ser gravada (%: %). O desligamento vale; a trilha e o que falta', SQLSTATE, SQLERRM;
  END;
ELSE
  PERFORM public.log_auditoria(...);   -- atomico, como hoje
END IF;
```

E acrescentar ao runbook, na secao "Se algo der errado", que o ultimo recurso quando
**qualquer** chamada de RPC falhar e `UPDATE cron.job SET active = false WHERE jobname =
'purga-retencao-sweep';` — hoje o runbook so oferece `cron.unschedule`, que exige um
reagendamento por migration para desfazer.

---

### HI-02 · A "prova durável de que o dispatch rodou" nao mede o dispatch — e o numero que mediria esta numa variavel jogada fora

**Arquivos:** `supabase/tests/p46_purga_smoke.sql:2715-2726` e `:2574-2582`
**Escrituracao contradita:** `46-06-SUMMARY.md:260-266`

A assercao ⊕ de `(m)` afere quatro coisas:

```
v_m_itens = v_m_eleg  ·  v_m_abertos = v_m_itens  ·  v_m_falhas = 0  ·  v_m_sit = 'executando'
```

Todas as quatro sao produzidas pelo **laco (g)** e pelo **fechamento (h)**. O laco de
dispatch `(g.5)` (`20260823000011:863-906`) so tem efeito no ledger no **caminho de
falha** — no caminho feliz ele nao escreve nada. Portanto:

> **Apague o bloco `(g.5)` inteiro da migration e as quatro condicoes continuam
> verdadeiras.** A assercao passa verde com ZERO post enfileirado e sem uma linha de
> codigo de despacho.

O `46-06-SUMMARY.md:263-265` afirma o contrario, com todas as letras: *"Isso só é possível
se o laço de despacho percorreu todos e nenhum enfileiramento levantou"*. Nao e — e essa
frase e a forma exata que o `CLAUDE.md` §"varra pela FORMA" cataloga: **portao que parece
medir e nao mede**, agora numa quarta forma (a assercao cujo objeto vigiado nao tem
efeito observavel no caminho de sucesso).

O agravante: **o valor que fecharia o buraco ja foi calculado.** `v_fila_m`
(`:2576-2577`) le `net.http_request_queue` depois do run em `live`, com a tolerancia
declarada corretamente montada — e e usado **apenas no `RAISE NOTICE` de `:2742`**.
Nenhum `IF` o compara com nada.

**Conserto** (uma condicao, ao lado das quatro que ja existem):

```sql
IF v_fila_ok AND v_fila_m IS DISTINCT FROM v_fila_g + v_m_eleg THEN
  RAISE EXCEPTION 'P46P FAIL (m): ⊕ O DISPATCH NAO ENFILEIROU. A fila do pg_net para /functions/v1/purgar-retencao tinha % linha(s) antes do run em live e % depois (esperado % = uma por titular elegivel). ⚠ As quatro condicoes de ledger acima sao TODAS produzidas pelo laco (g) e pelo fechamento (h): elas continuariam verdadeiras com o bloco (g.5) APAGADO da migration. Esta e a unica condicao que prova que o hop existe', coalesce(v_fila_g,-1), coalesce(v_fila_m,-1), coalesce(v_fila_g,-1) + coalesce(v_m_eleg,0);
END IF;
```

E corrigir a frase do `46-06-SUMMARY.md`.

---

### HI-03 · A Edge Function grava `desfecho_storage = 'falha'` para falhas que nunca tocaram o Storage

**Arquivo:** `supabase/functions/purgar-retencao/index.ts:332` e `:346`

```ts
if (plano?.error) throw new ErroDePasso("storage", "rpc_plano");        // :332
if (!p || typeof p !== "object") throw new ErroDePasso("storage", "plano_vazio");  // :334
if (candErr) throw new ErroDePasso("storage", "leitura_do_user_id");    // :346
```

O `catch` de `:439-442` faz `desfechos[e.passo] = "falha"`, e o `finally` grava isso em
`purga_execucao_itens` via `concluir_item_purga`. Nos tres casos acima **nenhuma chamada
a Storage aconteceu** — o codigo esta antes do `enumerarObjetos` de `:364`.

`purga_execucao_itens` e, por D-46-16, registro de cumprimento de obrigacao legal com
retencao **INDEFINIDA**, sem PITR para desmentir. Escrever `falha` num passo que nao foi
tentado e exatamente o achado RD2-01 desta fase — *"a mentira simetrica custa o mesmo que
a otimista"* — reintroduzido do lado da Edge Function depois de ter sido consertado do
lado da reconciliacao (`20260823000011:332-357`). E o vocabulario ja tem a palavra certa:
`concluir_item_purga` aceita `nao_aplicavel` com o significado literal *"nem chegou a ser
tentado"* (`20260823000010:422-432`).

Efeito pratico: um operador lendo o ledger no dia seguinte conclui que o Storage falhou e
vai investigar o bucket, quando o defeito estava numa RPC do Postgres.

**Conserto:** um pseudo-passo de plano, ou atribuir ao Postgres deixando o Storage em
`nao_aplicavel`:

```ts
type Passo = "storage" | "postgres" | "auth";
// ...
if (plano?.error)   throw new ErroDePasso("postgres", "rpc_plano");
if (!p || typeof p !== "object") throw new ErroDePasso("postgres", "plano_vazio");
if (candErr)        throw new ErroDePasso("postgres", "leitura_do_user_id");
```

(`postgres = falha` e verdade literal nesses tres: o motor daquele titular nao rodou. E o
`desfecho_storage` fica em `nao_aplicavel`, que e o fato.)

---

### HI-04 · "Esta funcao e o UNICO caminho de escrita" e verificado pelo lado errado da porta

**Arquivo:** `20260823000013:198-222` (bloco (iii) da auto-verificacao)
**Escrituracao contradita:** `46-07-SUMMARY.md:172-177`

O bloco prova duas coisas sobre `public.config_purga`: RLS ligada, e zero policy cujo
`cmd <> 'SELECT'`. A pergunta pela FORMA e correta e bem justificada. **Mas policy nao e a
unica porta.**

- `20260823000001_p46_config.sql` cria a tabela e **nao contem um unico `REVOKE`** (`grep
  -n "GRANT\|REVOKE" 20260823000001*.sql` → vazio). Os privilegios de tabela sao os
  default do schema `public` deste projeto — o mesmo `pg_default_acl` que as proprias
  migrations desta fase descrevem como concedendo direto a `anon` e `authenticated`.
- No Supabase, **`service_role` carrega `BYPASSRLS`**. Para esse papel, RLS ligada e zero
  policy nao bloqueiam nada — so o privilegio de tabela bloquearia, e ele nao foi medido.
- **A prova empirica esta no mesmo commit:** `p46_purga_smoke.sql` escreve a coluna
  diretamente sete vezes (`:1914`, `:1944`, `:1951`, `:2415`, `:2539`, `:2917`, `:3172`),
  com `UPDATE public.config_purga SET modo = …`, e funciona. O caminho existe e esta
  exercitado.

O `46-07-SUMMARY.md:173-175` afirma que *"T-46-07-01 — «nenhum caminho de deploy altera o
modo» — só é verdade enquanto esta função for o único caminho de escrita"* e apresenta o
bloco como a verificacao disso. O bloco verifica uma condicao **mais fraca** que a
afirmada. Nao e um furo de privilegio novo (quem tem `service_role` ja possui o banco),
mas e um portao que parece medir o invariante e mede um vizinho dele.

**Conserto:** acrescentar a (iii) a medicao do privilegio, e fechar a porta:

```sql
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.config_purga
  FROM PUBLIC, anon, authenticated, service_role;

-- e, na auto-verificacao:
IF has_table_privilege('service_role',  'public.config_purga', 'UPDATE')
   OR has_table_privilege('authenticated', 'public.config_purga', 'UPDATE')
   OR has_table_privilege('anon',          'public.config_purga', 'UPDATE') THEN
  RAISE EXCEPTION 'P46-CFG: algum papel de aplicacao tem UPDATE de TABELA em public.config_purga. RLS nao alcanca service_role (BYPASSRLS), entao zero policy de escrita nao e o mesmo que zero caminho de escrita';
END IF;
```

⚠ Conferir antes que o smoke continue rodando como `postgres` (dono), e nao como
`service_role` — caso contrario o `REVOKE` derruba `(q)`, `(g)`, `(m)` e `(d)`.

---

### HI-05 · A margem de 150 s e calibrada contra uma constante de plataforma que nada neste repositorio pina nem faz cumprir

**Arquivos:** `20260823000010:186` e `supabase/functions/purgar-retencao/index.ts` (todo)

```sql
c_teto_parede constant interval := interval '150 seconds';
```

A cadeia de raciocinio esta correta **dado** o pressuposto: reivindicacao concedida em
`T_c` implica `iniciada_em > T_c − 3450s`, logo o guard (`> now() − 3600s`) honra ate
`T_c + 150s`; e a EF morre em `T_r + 150s` com `T_r ≤ T_c`. **A propriedade se sustenta
inteiramente sobre "a EF morre aos 150 s".**

Nada faz isso valer no codigo:

- `index.ts` nao tem `AbortController`, nao tem `AbortSignal.timeout`, nao tem `deadline`,
  e nao ha nenhum limite por chamada nas 3 RPCs, nas ate 100 chamadas de `list`, nas ate
  5 de `remove` e no `deleteUser`.
- `supabase/config.toml` so declara `verify_jwt = false` para a funcao — nenhum teto.
- `(q.2)` do smoke prova apenas que o **literal** `interval '150 seconds'` esta no corpo
  vivo da RPC (`p46_purga_smoke.sql:1873`). Um literal presente nao e um relogio.
- O numero vem da RESEARCH da fase — ou seja, e uma medicao da plataforma, do tipo que
  muda com plano, regiao ou versao do runtime, sem diff e sem aviso.

Se o teto real for maior que 150 s, **o cenario RD2-03 reabre exatamente como escrito**:
Storage apagado, motor recusa com 42501, curriculo orfao e irrecuperavel.

E ha um residuo que a margem **nao** fecha nem no melhor caso: se o worker morrer por
wall clock **entre** o `remove` e a chamada ao motor, o desfecho e o mesmo (Storage
apagado, Postgres intacto). O sistema converge — a reconciliacao fecha o item, a
varredura seguinte recolhe o titular e o Storage ja esta vazio — mas o cabecalho da
`20260823000010` (`:114-121`) e o `46-05-SUMMARY.md:118` descrevem a margem como se ela
fechasse o cenario inteiro, e ela fecha so a metade "o motor recusa".

**Conserto** (fazer o teto ser da funcao, e nao da plataforma):

```ts
// logo apos a reivindicacao
const PRAZO_MS = 120_000;                 // < 150 s, com folga para o finally
const prazo = Date.now() + PRAZO_MS;
// ...antes de ABRIR o passo de Storage (o primeiro ato irreversivel):
if (Date.now() > prazo) throw new ErroDePasso("postgres", "sem_orcamento_de_parede");
// ...e de novo antes do motor, e entre lotes de `remove`:
if (Date.now() > prazo) throw new ErroDePasso("storage", "orcamento_esgotado_pos_remove");
```

Com isso a garantia deixa de depender do runtime: o item fecha com desfechos honestos e o
titular volta na noite seguinte.

---

## MEDIUM

### ME-01 · `count(*) >= 14` conta EXECUCOES, nao NOITES

`20260823000013:444-445`. D-46-14 pede catorze **noites** de ensaio.
`varrer_purga_retencao()` e chamavel diretamente por `postgres`/`service_role`, e
qualquer sequencia de 14 chamadas numa tarde — somada a uma unica linha com
`iniciada_em` de 14 dias atras — satisfaz os criterios 1 e 2. Nao e ataque; e o modo de
falha de quem "quer destravar o flip".
**Conserto:** `count(DISTINCT (iniciada_em AT TIME ZONE 'UTC')::date) >= 14`.

### ME-02 · O comentario que delimita o raio do `DELETE` de `(d.3)` envelheceu no dia do flip para `dry_run`

`p46_purga_smoke.sql:2787-2789`:

> *"(1) a remoção é escopada aos modos que o critério conta (`dry_run` e `live`) — as
> linhas de heartbeat em `off`, que hoje são TODAS as reais, nunca são tocadas"*

Desde T0 = 2026-08-23 02:06:37-03 isso e **falso**: as linhas reais de PROD sao agora
`dry_run`, e o `DELETE` de `:3005-3010` apaga exatamente elas e os itens delas. A
restauracao **e** medida pela impressao digital (`:3199-3202`), entao o risco esta
contido — mas a frase que descreve o raio agora contradiz o estado, que e a classe BL-01
do 46-04, e o raio de explosao do smoke cresceu em silencio de "zero linhas reais" para
"todas as linhas de ensaio" na mesma noite em que o dry-run foi ligado.
**Conserto:** reescrever a frase e, de preferencia, escopar a remocao a um marcador que o
proprio bloco planta (por exemplo `cap_vigente = 50 AND veredito = 'dry_run' AND
concluida_em IS NOT NULL AND cap_vigente <> <valor real>` nao serve — use uma coluna
sentinela, ou reconstrua o caso com `iniciada_em` no futuro em vez de apagar).

### ME-03 · `plano_exclusao_titular` e chamado, atribuido e nunca lido

`purgar-retencao/index.ts:329-334`. O comentario de `:325-328` justifica a chamada como a
fonte de enumeracao (*"a RPC já enumera do catálogo as chaves estrangeiras"*), mas a
funcao enumera o **bucket** em `:364` e chama o motor em `:385` — o objeto `p` nao e lido
uma unica vez depois do `typeof`. A chamada e, de fato, uma **sonda do 3o ramo do guard
(B-02)**, e isso e legitimo e valioso; so que nada diz isso e a variavel fica morta.
**Conserto:** renomear o passo, remover o binding morto e escrever o motivo real — "esta
chamada existe para que o 3o ramo do guard morda ANTES do primeiro ato irreversivel".

### ME-04 · Tres modos de falha injetaveis estao cablados no harness e nenhum teste os usa

`purgar-retencao/index.test.ts`. `deleteErro` (`:100`, `:163`), `listErro` (`:98`,
`:142`) e `selectErro` (`:95`, `:122`) estao declarados e implementados; `grep` confirma
que nenhum `Deno.test` os passa (so `removeErro`, em `:487`). Ficam sem cobertura:

- **a falha de `auth.admin.deleteUser`** — o unico passo sem volta, e o unico cujo
  desfecho `auth = 'falha'` nunca foi observado por teste nenhum;
- a falha de `storage.list` (que decide entre `list` e `residuo_no_bucket`);
- a falha da leitura de `candidatos.user_id` — que e justamente o caminho de HI-03.

Tambem sem teste: o ramo `residuo_no_bucket` (`:378`), `subpasta_no_prefixo` (`:209`),
`excedeu_teto_de_paginas` (`:214`) e o `fim?.error` do `finally` (`:464-471`).
**Conserto:** tres testes, ou apagar o andaime morto — andaime que ninguem usa e uma
promessa de cobertura.

### ME-05 · A metade positiva de `(q.4)` passaria com o 4o ramo do guard REMOVIDO

`p46_purga_smoke.sql:1978-1983` e `:2100-2102`. A inferencia e: `anonimizar_candidato(
c_sint, false)` devolveu `P0002` ⟹ *"o guard AUTORIZOU e o motor parou por nao haver
titular"*. Isso vale se o guard existe. **Se o 4o ramo fosse apagado inteiro, a chamada
devolveria `P0002` do mesmo jeito** — o candidato sintetico nao existe. Ou seja: `(q.4)`
detecta "guard presente e recusando (42501)" e nao detecta "guard ausente".

O par nao esta cego, porque `(o)`, `(o.6)` e `(o.7)` do 46-04 provam a recusa. Mas a
mensagem de `:2101` afirma mais do que a medicao entrega (*"o guard destrutivo autoriza
NAQUELE MESMO INSTANTE"*).
**Conserto:** declarar o limite inline (como `(q.2)` faz, exemplarmente), ou acrescentar
um sexto controle que quebre uma precondicao da reivindicacao e exija `42501`.

### ME-06 · `docs/compliance/cron-inventory.md` continua declarando o 4o agendamento como NAO APLICADO

Secao "Re-coleta da Phase 46": `Estado em PROD` = ⏳ **NÃO APLICADA**, `Re-coleta viva` =
⏳, `jobid` = ⏳, `active` = ⏳, as quatro celulas "Medido no apply" = ⏳, e as duas
contagens de idempotencia = ⏳. O job esta vivo desde 2026-08-23 (`active = true`,
`md5 = 381a0edbc8a59b47b23b50dd1eba9a86`, 40 octetos, `cron.job` com 4 linhas).

O documento e honesto por construcao — §Limites item 1 diz que ⏳ *"é um campo a
preencher, nunca um valor medido"* — mas ele **e** o artefato de conformidade do
INVENT-03, e hoje o inventario de registro nao registra o estado vivo do job que ele
existe para registrar. E o proprio documento manda re-coletar antes de qualquer fase que
toque cron.
**Conserto:** preencher as oito celulas com a consulta que ja esta escrita ali, e trocar
"Estado em PROD" para aplicado com a data.

---

## LOW

| # | Arquivo:linha | Achado | Conserto |
|---|---|---|---|
| LO-01 | `20260823000011:465-480` | Em `live` o expurgo de RETEN-05 **sobrevive** a um aborto posterior por `cap_excedido` ou `segredo_ausente` (ele roda antes dos dois), mas e **revertido** por `P46NT`/`query_canceled` (mesma transacao). O comportamento e correto e fica registrado em `notificacoes_expurgadas`, mas nem o cabecalho nem o `46-06-SUMMARY.md` dizem isso — e e a diferenca entre "a varredura abortou" e "a varredura abortou depois de apagar trilha" | Uma linha na DIVERGENCIA 4 do cabecalho e no `COMMENT` da coluna |
| LO-02 | `index.ts:283` e `:460` | `await supabaseAdmin.rpc(...)` sem `try`. Se o client **rejeitar** (rede/DNS) em vez de devolver `{error}`, a rejeicao escapa do `handler`: resposta sem cabecalho CORS, sem `error_code`, e — no caso do `finally` — sem sequer a linha de log "O ITEM NAO FOI CONCLUIDO" | envolver os dois em `try/catch` e mapear para 500 |
| LO-03 | `index.ts:97-101` | `Access-Control-Allow-Origin: '*'` com `Access-Control-Allow-Headers: authorization` numa funcao `verify_jwt=false` que destroi tres sistemas e e chamada **so** por `pg_net`. Nenhum navegador a chama | remover o bloco CORS e o short-circuit de `OPTIONS`, ou fixar a origem num literal inalcancavel |
| LO-04 | `index.ts:231` | Metodo nao suportado devolve `error_code: "SERVER_ERROR"` com 405. O vocabulario tem `VALIDATION`; o codigo faz a triagem de log mentir | `errorResponse("VALIDATION", …, 405)` |
| LO-05 | `20260823000013:393` | `v_virando_live := (p_modo = 'live' AND …)` chaveia pelo **parametro** e nao por `v_modo_novo`. Hoje equivalente (um `p_modo` nulo nao muda o modo), mas sao duas expressoes de "o modo novo" e vao divergir no dia em que alguem der default ao parametro | `v_modo_novo = 'live' AND v_modo_antes IS DISTINCT FROM 'live'` |
| LO-06 | `20260823000013:327-337` | A validacao de dominio de `cap`/`janela` roda **antes** do ramo de modo: `salvar_config_purga('off', 0, NULL, NULL)` recusa o kill switch com `22023`. O runbook passa `NULL` nos dois, entao o caminho documentado esta seguro — mas "off nao passa pelo portao, de estado nenhum" tem esta excecao a mais do que o `COMMENT` admite | mover a validacao de `cap`/`janela` para depois do ramo, ou nomear a excecao no `COMMENT` |
| LO-07 | `20260823000011:723-729` | O ramo `ja_anonimizado` deixa a subtransacao interna **comitar**. Ele depende de `anonimizar_candidato` devolver ali *"sem mutar coluna alguma e sem criar linha de auditoria"* (WR-05). Nada neste arquivo nem no smoke mede isso; se aquele ramo ganhar uma escrita de auditoria, o dry-run passa a persistir linhas | acrescentar a `(idem)` do smoke uma contagem de `logs_auditoria` antes/depois de um dry-run sobre tombstone |
| LO-08 | `p46_purga_smoke.sql:2393-2407` | `ALTER TABLE … DISABLE TRIGGER` toma **ACCESS EXCLUSIVE** em `notificacoes_enviadas` e a segura ate o fim do envelope — atravessando cinco execucoes de `varrer_purga_retencao()` e um run em `live`. Enquanto isso, `notif-retry-sweep` (a cada 15 min) e a EF de notificacao bloqueiam. Hoje inofensivo porque nenhum trigger casa o criterio (`v_t_off = 0`), mas o dia em que um casar o smoke passa a travar uma tabela de producao | mover o `DISABLE`/`ENABLE` para o menor escopo possivel, ou trocar por `session_replication_role` |
| LO-09 | `p46_purga_smoke.sql:1911-1912` vs `:2061` | `(q.4)` chama o motor com `p_dry_run = false` em PROD; a nao-vacuidade do alvo sintetico (`v_alvo_ex = 0`) e **julgada depois** do envelope, ou seja depois da chamada destrutiva. O rollback salva de qualquer jeito, mas a cerca e post-mortem e nao pre-condicao | mover o `IF v_alvo_ex <> 0 THEN RAISE` para dentro do envelope, antes de `(q.3)` |

---

## As sete perguntas, respondidas

**1 · O que roda de madrugada.** Nao ha caminho em dry_run que destrua linha real ou
enfileire `net.http_post`. O terminador de RETEN-05 cobre todos os ramos pela forma
segura (`<> 'live'`), e o `DELETE` e revertido em `dry_run` tanto quanto em `off`. Ver a
tabela do topo. **Nada a desarmar.**

**2 · A Edge Function.** Nao autoriza pelo corpo em caminho nenhum — o unico identificador
do corpo que sobrevive a reivindicacao e o `item_id`, e ele so viaja para
`concluir_item_purga`, que so aceita o item que a reivindicacao ja validou. Um erro de
consulta **nao** vira 403: o mapeamento `P46FB → 403` e exclusivo do passo 0 (`:289-291`)
e qualquer outro codigo e 500 — inclusive o `P46FB` que `concluir_item_purga` levanta.
Segunda invocacao com o mesmo `item_id`: recusada por **ESTADO** (`concluido_em IS NULL`),
nao por credencial. Morrer no meio: o item fica aberto e a reconciliacao de 1 h o alcanca
(`20260823000011:358-411`) — verificado.
**Onde a resposta e "nao":** a ordem Storage → Postgres → Auth **nao** carimba cada
desfecho no ledger antes do proximo comecar. Os tres desfechos vivem em memoria
(`desfechos`, `:314-318`) e ha **uma unica** escrita, no `finally`. Um worker morto perde
os tres. A reconciliacao cobre (`storage/auth → desconhecido`, `postgres` inferido da
sentinela), e isso e o desenho declarado — mas nenhum SUMMARY deve descrever o carimbo
como incremental.

**3 · A janela de 150 s.** A aritmetica esta certa e o acoplamento fecha o RD2-03 no
sentido "o guard honra em todo passo posterior". O que **nao** esta fechado e o
pressuposto: nada no repositorio faz o teto de 150 s valer (HI-05). E resta um intervalo
em que o Storage foi apagado e o motor nunca e chamado — nao porque ele recuse, mas
porque o worker morre antes. O sistema converge na noite seguinte; a prosa nao diz isso.

**4 · O portao do flip.** `off` **nao** e irrecusavel de todo estado: alem das duas
excecoes que o runbook admite (autorizacao e nao-op), ha a falha da trilha na mesma
transacao (HI-01) e a validacao de dominio (LO-06). O `live` **pode** passar sem
evidencia real de ensaio (BL-01). O ator **nao** pode ser forjado por parametro — a
assinatura nao tem esse parametro e o ator sai de `usuarios_rh` contra `auth.uid()`. A
auditoria **vai** na mesma transacao, e `(e)` prova isso estruturalmente (a linha some com
o rollback), que e a forma correta.

**5 · Varredura pela FORMA.** `grep -nE "v_[a-z_]* (<>|!=) [0-9]+|= ANY \(ARRAY\['"` sobre
`supabase/tests/*.sql`: os achados NOVOS desta fase sao `p46_purga_smoke.sql:2307`
(`v_a_n <> 1`) e `p42_invent05_cron_smoke.sql:177` (`v_n_purga <> 1`). **Os dois sao
cardinalidade POR NOME, nao contagem de inventario** — nao mudam quando o sistema ganha
agendamentos. Julgo os dois **corretos** e bem justificados inline. A emenda de
`p42_invent05_cron_smoke.sql (a)` — de `count(*) <> 3` para tres verificacoes com
`NOT EXISTS` — e o conserto certo, feito no commit certo, com a razao escrita.
Os demais `<> N` do arquivo novo (`array_length(v_q3_st,1) <> 5`, `<> 6`, `<> 7`,
`v_m_ins <> 2`, `v_esperado := 27`) sao contagens de **chamadas de controle** e de
**fixture propria** — escopo deliberado, nao fotografia.
**Ramo de sucesso que nunca executou:** procurei especificamente o padrao `v_st := v_st ||
'OK'` sem tipo. **Nao ha nenhum** — todas as concatenacoes novas usam `::text` explicito
(`:1920`, `:1973`, `:1990`, `:2028`, `:2960`, `:3128`, `:3163`). A licao foi aplicada.
**Mas encontrei a forma NOVA, numa quarta variante:** HI-02 — a assercao cujo objeto
vigiado nao produz efeito observavel no caminho de sucesso, de modo que apagar o objeto
deixa o portao verde.

**6 · As assercoes novas mentem?**
`(q.1)` `(q.2)` `(q.3)` `(q.5)` — nao; solidas, com controle positivo executado.
`(q.4)` — a metade "o guard autoriza" e unilateral (ME-05).
`(a)` `(n)` — solidas (md5 pinado com proveniencia; comentario vivo com as duas metades).
`(g)` — solida, com os tres pontos da fronteira e os dois que RODAM; a nao-vacuidade
(`v_g_n BETWEEN 2 AND 498`) esta medida antes.
`(m)` — a metade RETEN-05 e solida e nao passa por vacuidade (fixture retrodatada,
negativa sobre dominio e trilha de decisao). **A metade ⊕ do dispatch passa por vacuidade
estrutural** (HI-02).
`(d)` `(e)` — solidas e independentes de calendario, com o caso positivo executado; o
buraco nao esta nelas, esta no que a RPC conta (BL-01), e por isso nenhuma delas o pega.

**7 · Escrituracao.** Tres divergencias entre documento e codigo:
`46-06-SUMMARY.md:263-265` afirma que a assercao ⊕ so e possivel se o dispatch rodou —
nao e (HI-02). `46-07-SUMMARY.md:173-175` apresenta a verificacao de policies como prova
de "unico caminho de escrita" — ela nao alcanca `service_role` (HI-04).
`docs/compliance/cron-inventory.md` declara o job como nao aplicado (ME-06).
E `p46_purga_smoke.sql:2787-2789` descreve um raio de `DELETE` que deixou de ser verdade
no dia do flip para dry_run (ME-02).
O `46-05-SUMMARY.md` e o `46-07-RUNBOOK-FLIP.md` conferem com o codigo em tudo que
verifiquei, com a ressalva de HI-05 (a margem descrita como fechando o cenario inteiro) e
HI-01 (o "NUNCA e recusada" do runbook).

---

## Perguntas ao orquestrador (exigem medicao viva)

1. `SELECT has_table_privilege('service_role','public.config_purga','UPDATE'),
   has_table_privilege('authenticated','public.config_purga','UPDATE'),
   has_table_privilege('anon','public.config_purga','UPDATE');` — HI-04 depende disto.
2. `SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role';`
3. `SELECT proowner::regrole, prosecdef FROM pg_proc WHERE oid =
   'public.varrer_purga_retencao()'::regprocedure;` — confirmar que o dono da funcao e o
   mesmo papel sob o qual o cron a executa (a leitura do Vault depende disso, e ate agora
   so foi exercitada por chamada manual — o cron ainda nao disparou em `dry_run`).
4. `SELECT modo_vigente, veredito, count(*), max(elegiveis) FROM public.purga_execucoes
   GROUP BY 1,2 ORDER BY 1,2;` — para dimensionar quantas das linhas de ensaio ja
   contadas pelo portao sao de fato ensaio (BL-01).
5. Qual e o teto de parede real do Edge Runtime deste projeto hoje, e ha alguma forma de
   pina-lo (config, header, metrica)? — HI-05.
6. `anonimizar_candidato`, no ramo `ja_anonimizado`, escreve alguma linha de auditoria? —
   LO-07.

---

## Ordem sugerida de conserto

1. **BL-01** — migration nova com a allowlist de `veredito` + o caso `(d.8)` no smoke.
   Prazo real: antes de 2026-09-06. Nao bloqueia a operacao de hoje.
2. **HI-01** e **HI-05** — os dois tocam o comportamento em incidente; consertar antes de
   qualquer ensaio em `live`.
3. **HI-02** e **ME-05** — uma condicao cada, nos smokes. Depois delas, **provar por
   execucao que o portao MORDE**: apagar temporariamente o bloco `(g.5)` num banco de
   ensaio e confirmar que `(m)` fica vermelho.
4. **HI-03** e **HI-04** — Edge Function e migration de hardening.
5. MEDIUM/LOW conforme couber no proximo plano.

---

_Revisado: 2026-08-23_
_Revisor: gsd-code-reviewer (adversarial, retroativo)_
_Profundidade: deep — leitura integral de 4 migrations, 1 Edge Function, 1 suite Deno, 2 smokes SQL, 3 SUMMARY, 1 runbook e o inventario de cron_
