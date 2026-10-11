---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-11T18:50:04Z
depth: deep
diff_base: bc0d27204ed4c2b5f8bc24d4889f3f0556411eb4
reviewed_head: 83dbe5d00c264687b6b4eab96d3bac2c1e103dd3
scope: review adversarial bloqueante nº 1 do bloco C da Phase 52 (52-18, Task 2). Escopo — o diff de código `bc0d2720..83dbe5d0 -- . ':!.planning'` (8 arquivos, +2212/−40); por IN-09 do 52-REVIEW-PORTAO-2, lidos INTEIROS, independentemente do diff, todos os arquivos de `scripts/geradores/` (inclusive o legado `gen-sjt-marketing.py`) e `supabase/tests/p52_banco_sjt_smoke.sql`; a migration `20261011000003_p52_banco_sjt_v2.sql` (regenerada pelo revisor duas vezes, byte a byte igual ao arquivo, md5 18141c60…); `scripts/p52_mutacoes.cjs`, `scripts/p52_ensaio.cjs` (as chaves de `capturar()`), o diff de `database.types.ts`; e o `52-18-PLAN.md`, lido como o programa que escreve em PROD, junto com `p46apply.cjs`, `p52_portao.cjs` (modo apply) e `p50_enumera.cjs`. Contexto, fora da lista revisada — 52-17-SUMMARY, 52-17-TEXTO-APROVADO, 52-18-DECISOES-PREVIAS (decidido, não reaberto), 52-REVIEW-PORTAO-2, CLAUDE.md, `SjtMultiplaEscolhaScreen.tsx`, `avaliacaoService.ts`, os gatilhos vivos de `candidaturas`/`historico_candidatura`/`vagas`. Varredura de forma `text[] || '<literal>'` em `supabase/tests/*.sql` e `supabase/migrations/*.sql`. PROD só leitura (`set transaction read only`) ou no ensaio que aborta. Re-executados pelo revisor — `test_gen_sjt_v2.py` (28 ok); `tabela-comprimento-sjt.py --md5` (1d441390… = aprovado); o ensaio de controle do arquivo exato (ENSAIO VERDE, 52b=14/14, a mesma evidência do tracer); 3 mutações do revisor depois da migration (P52B FAIL (k) duas vezes, (l)); 3 mutações DENTRO da migration antes do POS (POS-PORTAO remap, mapa, pontuar_sjt); 1 sonda do `pontuar_sjt` novo com `pergunta_id` repetido em caixa diferente. Depois de cada uma, ledger sem 20261011000003, mapa inexistente, `pontuar_sjt` = 7a892f7b…, fila e respostas do pg_net vazias. Nada foi aplicado, publicado ou empurrado. O único commit é este arquivo.
files_reviewed: 13
files_reviewed_list:
  - database.types.ts
  - docs/specs/BANCO-SJT-V2.md
  - scripts/geradores/gen-sjt-v2.py
  - scripts/geradores/gen-sjt-marketing.py
  - scripts/geradores/pontuar_sjt_vivo.plpgsql
  - scripts/geradores/sjt_texto.py
  - scripts/geradores/tabela-comprimento-sjt.py
  - scripts/geradores/test_gen_sjt_v2.py
  - scripts/p52_ensaio.cjs
  - scripts/p52_mutacoes.cjs
  - supabase/migrations/20261011000003_p52_banco_sjt_v2.sql
  - supabase/tests/p52_banco_sjt_smoke.sql
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-18-PLAN.md
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
---

# Phase 52: Code Review Report — bloco C, review nº 1 (52-18, Task 2)

**Reviewed:** 2026-10-11T18:50:04Z
**Depth:** deep
**Files Reviewed:** 13 — os 8 arquivos do diff, os 5 lidos inteiros por IN-09 e o `52-18-PLAN.md`
**Status:** issues_found, **0 crítico**. Nenhum achado torna inseguro o apply, o desfazer ou o push, se a Task 3 rodar
como está escrita. Os cinco warnings são lacunas de detecção, de premissa ou de processo. Nenhum deles corrompe dado no
caminho de escrita.

## Summary

Parti da hipótese de que a 0003 tinha um defeito que o tracer não pegava. Procurei em sete lugares: no PRE, na retirada,
no remapeamento, na troca do `pontuar_sjt`, no mapa, no smoke e no programa da Task 3. Nos seis primeiros a tese de que
«o caminho de escrita quebra» não se sustentou. Cada ponto abaixo foi medido, não presumido:

- **Arquivo = revisado = gerado.** Rodei o gerador duas vezes sobre `docs/specs/BANCO-SJT-V2.md` (md5 `03b2a0d5…` =
  `texto_md5_aprovado`). As duas saídas são byte a byte iguais entre si e iguais à migration (`cmp`; md5 `18141c60…` =
  `sql_md5_gerado`). O `p52_portao --modo apply` exige HEAD = pin, código do pin = código revisado e árvore limpa em
  `supabase/` e `scripts/`. O `p46apply migrate` lê o arquivo do disco no mesmo comando. Por isso não há caminho para
  aplicar outro texto.
- **PRE.** Faz `itens_ids` sem olhar `status`, recusa `content_hash` nulo, hash ocupado e caso mantido ausente (a B4
  morde), e mede a baseline na execução. A varredura do id velho roda como `postgres`, que tem `rolbypassrls = true`
  (medido); a RLS não esconde linha. A isenção do ledger segue sólida hoje (IN-05).
- **Retirada.** É só por `status`, só `active`, só nos cargos do texto, com `<> ALL` sobre um array sem NULL (o PRE
  recusa hash nulo). O POS confere contagem e ids.
- **`pontuar_sjt`.** O teste prova que o corpo novo = `pontuar_sjt_vivo.plpgsql` (md5 `7a892f7b…` = `prosrc` vivo,
  medido) + um bloco depois de uma âncora única. A UNIQUE `(pergunta_id, opcao_id)` existe em PROD
  (`perguntas_opcao_sjt_pergunta_id_opcao_id_key`, medido). O live já recusa elemento duplicado ou de fora da bateria.
  Por isso `jsonb_array_length(v_breakdown) <> v_answered` é exato em relação aos elementos do payload: um conjunto
  válido nunca levanta 22023. Também medi que nenhum `mc` ativo deixa de ter 4 alternativas e que não há `mc` de outro
  `tipo`. O cliente só envia com todas respondidas (`disabled={!allAnswered}`), sem `opcao_id` nulo. O que NÃO é exato é
  a completude da bateria (WR-04), e isso vem de antes.
- **Mapa.** `supabase_migrations` tem `nspacl` NULL e nenhum `pg_default_acl`, então só o dono o usa (medido). A tabela
  nasce com RLS, `REVOKE ALL` e nenhum GRANT. `pg_graphql` não está instalado. Das funções SECURITY DEFINER com SQL
  dinâmico, a única é `plano_exclusao_titular`: ela enumera FKs para `auth.users`, devolve booleano e não alcança o mapa.
- **POS morde.** Três mutações minhas, inseridas na migration antes do POS, foram recusadas DENTRO da transação:
  `POS-PORTAO (remap)`, `POS-PORTAO (mapa) 31 … PRE mediu 32` e `POS-PORTAO (pontuar_sjt): o comentario da funcao mudou`.
- **Smoke.** A (k) e a (l), que nenhuma mutação do harness cobre, mordem. Provei com mutações minhas: (k) por resposta
  redirecionada, (k) por id velho plantado em `public.perguntas`, e (l) por score alterado.
- **Tipos.** O diff de `database.types.ts` só acrescenta: +9 linhas, 3 RPCs de leitura do RH do bloco B, nenhuma remoção.
- **Push.** `origin/main` = `bc0d2720` (o pin do 52-15). Os 16 commits de `origin/main..HEAD` tocam só os 8 caminhos do
  `--caminhos` do comando de push e `.planning/`. O `chore(52-15): db:types…` (`fa6ab81b`) está entre eles.

**Os cinco warnings:**
- WR-01: a detecção pós-apply do resíduo de concorrência cobre um dos dois sabores. O outro (corpo velho + leitura
  depois do commit) grava nota parcial ou zero, sem id velho, e passa invisível.
- WR-02: a Passo 0b é comparação manual. O comando do apply não consome o token aprovado.
- WR-03: o `em_curso` não lista a candidatura em curso na bateria RETIRADA (`3a9254c3`, Consultor, criada em 09/10).
  O caminho de envio dela depois do apply mostra «Sua etapa avançou», que é falso.
- WR-04: a completude da bateria no `pontuar_sjt` não é exata. Um `pergunta_id` repetido em outra caixa conta duas
  vezes e omite outro item. É anterior à 0003, e a 0003 preserva.
- WR-05: `p49_12_pos_estado.sql:126,135`, o único resíduo da classe `text[] || '<literal>'` na varredura.

### Fechamento dos achados do 52-REVIEW-PORTAO-2

| Achado do -2 | Estado | Evidência |
|---|---|---|
| WR-01 — o 52-18 descrevia a 0003 como «aditivo e reversível», sem prova pós-apply e sem desfazer | **fechado** | `52-18-PLAN.md:119-133`: a Task 2 apresenta os quatro pontos destrutivos (remapeamento, respostas gravadas, `pontuar_sjt`, mapa) com os números do ensaio. `:76-82`: o «Desfazer» tem 4 partes e lê o mapa durável. `:247`: o 3º `<verify>` confere `opcao_id` fora de v4, md5 do `prosrc`, mapa = `remap=`, mapa vigente, resposta no id velho e alcance de API. `grep "aditivo e reversível"` acha só a nota da emenda (`:119`). Ressalva: a detecção de resíduo do `:26`/`:247` é incompleta (WR-01 abaixo). |
| WR-02 — remapear com prova SJT aberta dava nota parcial silenciosa | **fechado no caminho do corpo novo** | `gen-sjt-v2.py:93-103,119-135`: a recusa `22023 'opcao fora da pergunta'`. A (n) do smoke prova, como o candidato dono, que o válido = corpo velho (`valido=igual`), que o id velho e o forjado levam 22023, e que a entrada morde no corpo velho (`velho_silencioso=2/3`). A B5 morde. O resíduo que fica é o do corpo velho em execução no instante do commit (WR-01). |
| IN-09 — escopo do review do bloco C | **fechado** | `52-18-PLAN.md:144-148` instrui o revisor. Este review leu inteiros os 6 arquivos de `scripts/geradores/` e o smoke (j)–(n), e provou por mutação que (k) e (l) mordem. |

## Warnings

### WR-01: a prova pós-apply «0 resposta no id velho (pelo mapa)» não pega o resíduo-espelho: corpo VELHO em execução que lê as alternativas DEPOIS do commit grava nota parcial (ou zero) sem nenhum id velho

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-18-PLAN.md:26` (premissa) · `:247` (o 3º `<verify>`, `resp_velho`) · `scripts/geradores/pontuar_sjt_vivo.plpgsql:52-64` (o `JOIN` de `scored`, sem recusa no corpo velho)

**Defeito:** O operador decidiu «Não — detectar» (52-18-DECISOES-PREVIAS, P1) sob a premissa do `:26`: «um
`pontuar_sjt` que LEU as alternativas antes do commit grava a nota certa com ids que deixaram de existir; a prova
pós-apply o acusa». Esse é um dos dois sabores. O outro:
- `pontuar_sjt` é VOLATILE (`provolatile = 'v'`, medido). Uma chamada iniciada ANTES do commit usa o corpo VELHO até o
  fim, porque o `CREATE OR REPLACE` só fica visível no commit e a chamada já resolveu o `pg_proc`.
- Em READ COMMITTED, cada comando dessa chamada tira um snapshot novo. Se o commit cai entre o começo da chamada e o
  comando de `scored`, o corpo velho junta os ids VELHOS do cliente com as alternativas JÁ remapeadas.
- Nenhum par casa, e o corpo velho não tem a recusa 22023. O resultado é `v_breakdown = []`, `score 0/<max>`,
  `pendente_humano`, `metadata.respostas = []`, `answered = N`.
- Não há id velho gravado, então o `resp_velho` (junção pelo `opcao_id_velho` do mapa) dá 0 e a prova sai verde.

**Cenário:** um candidato de cargo remapeado (dentista, por exemplo) clica em «Enviar» no milissegundo do commit. Ele
recebe «ok» com nota zero, definitiva (a trava «avaliacao ja registrada»), e o RH vê o SJT «concluído» sem resposta.
É o defeito do WR-02 do -2, no único caminho que a recusa nova não alcança. A probabilidade é muito baixa: janela de
milissegundos, nenhum candidato real hoje e apply fora de UAT. Por isso é warning, não crítico. Mas a detecção
decidida diz cobrir o resíduo, e não cobre este sabor.

**Evidência:**
```
# o corpo velho grava SÓ os pares que casam — o id que não casa some sem deixar rastro:
$ node scripts/p52_ensaio.cjs --migracoes=supabase/migrations/20261011000003_p52_banco_sjt_v2.sql supabase/tests/p52_banco_sjt_smoke.sql
ENSAIO VERDE: … 52b.pontuar=bateria:3,valido=igual,22023=velho+forjado,velho_silencioso=2/3 · 2333 ms
# a forma que pega os DOIS sabores está limpa hoje (sem falso positivo):
$ node p46apply.cjs sql "set transaction read only; select (select count(*) from public.scores_candidato s where s.tipo='sjt' and s.subtipo='mc' and s.pergunta_id is null and jsonb_typeof(s.metadata->'respostas')='array' and s.metadata ? 'answered' and jsonb_array_length(s.metadata->'respostas') <> (s.metadata->>'answered')::int) parciais_hoje, (select count(*) from public.scores_candidato s where s.tipo='sjt' and s.subtipo='mc' and s.pergunta_id is null) mc_rows, (select provolatile from pg_proc where oid=to_regprocedure('public.pontuar_sjt(uuid,jsonb)')) vol"
[{ "parciais_hoje": 0, "mc_rows": 6, "vol": "v" }]
```

**Fix (dono 52-18; escolher um):**
- (a) Sem tocar o plano: depois do 3º `<verify>`, rodar a consulta acima (só leitura) e registrar `parciais=0` no
  SUMMARY. O resultado tem de ser 0. Diferente de 0 = PARAR e levar ao operador. Mudar o `52-18-PLAN.md` faria o
  `p52_portao` recusar por «PLANO MUDOU DEPOIS DA REVISAO» e exigiria um `-2`. Este caminho evita isso.
- (b) Emendar o 3º `<verify>` com a cláusula `parciais` e corrigir a premissa do `:26` («dois sabores»). Isso pede o
  review `-2`.
- (c) O operador aceita o resíduo-espelho explicitamente, com a premissa corrigida na frente.

### WR-02: a Passo 0b é «igual, byte a byte» por leitura humana — o comando do apply não consome o token aprovado, e o pós-apply só confere `<alternativas>/<itens>`

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-18-PLAN.md:221-225` (Passo 0b) · `:229` (Passo 1) · `:247` (`R=$(grep -oE ';remap=[0-9]+/[0-9]+' …)`)

**Defeito:** A comparação entre o `;remap=…` remedido e o aprovado na Task 2 é uma instrução em prosa. O comando do
Passo 1 (`p52_portao --modo apply && p46apply migrate …`) roda igual se a Passo 0b for pulada, se ficar vermelha ou se
der outro número. A única leitura do log da Passo 0b é o 3º `<verify>`, DEPOIS da escrita. Ele compara só
`<alternativas>/<itens>` com o mapa; `refs`, `linhas`, `em_curso` e `em_curso_ids` não são conferidos em lugar
nenhum. Uma candidatura nova em curso, ou uma resposta nova num item remapeado, entre a aprovação e o apply, passa sem
parar. É a memória «executor passa por cima de parada do plano».

**Cenário:** o executor roda a Passo 0b, vê `em_curso=2` em vez de `em_curso=1`, lê na diagonal e roda o Passo 1. A
0003 reescreve uma resposta que o operador não viu. O POS garante que ela resolve igual e que a nota não muda, então
não há corrupção. Mas a decisão do operador foi sobre outro conjunto.

**Evidência:**
```
$ sed -n 221p .planning/phases/52-hub-do-rh-dados-e-contato/52-18-PLAN.md
`E=…; node scripts/p52_ensaio.cjs --migracoes=… > "$E" 2>&1; rc=$?; tail -1 "$E" | cut -c1-900; test "$rc" -eq 0 && grep -oE ';remap=[^ ;]+' "$E"`
$ sed -n 229p …52-18-PLAN.md      # nenhuma referência a "$E" nem ao token aprovado
`A=…; node scripts/p52_portao.cjs … --modo apply && node p46apply.cjs migrate supabase/migrations/20261011000003_p52_banco_sjt_v2.sql > "$A" 2>&1; …`
```

**Fix (dono 52-18):** amarrar no MESMO comando do Passo 1:
`T='<token aprovado, literal do SUMMARY>'; test "$(grep -oE ';remap=[^ ;]+' "$E" | head -1)" = "$T" && node scripts/p52_portao.cjs … --modo apply && node p46apply.cjs migrate …`.
Como emenda de plano, isso pede o review `-2`. A alternativa sem emenda é o executor colar no SUMMARY a saída de
`test … = … && echo IGUAL` antes do Passo 1, com o checkpoint exigindo essa linha.

### WR-03: o `em_curso` não vê a candidatura em curso na bateria RETIRADA (`3a9254c3`, a vaga ativa de Consultor, criada em 09/10) — e o caminho de envio dela depois do apply diz «Sua etapa avançou», o que é falso

**File:** `scripts/geradores/gen-sjt-v2.py:385-403` (o `em_curso` olha só cargo/itens REMAPEADOS) · `.planning/phases/52-hub-do-rh-dados-e-contato/52-18-PLAN.md:26` («item RETIRADO → `42704` em `get_opcoes_sjt`») · `:135-137` · `src/features/avaliacao/services/avaliacaoService.ts:432-445` · `src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx:176`

**Defeito:** O `em_curso` (e os `em_curso_ids` que o operador vê) só conta vagas cuja bateria alcança item remapeado.
A candidatura `3a9254c3`:
- está em `avaliacao_assincrona`, sem SJT mc, na vaga ATIVA `fdbe1a4a` (`sdr-social-seller`), que a 0003 retira e
  troca;
- foi criada em 2026-10-09, com e-mail fora dos padrões de teste, e não tem `respostas_avaliacao`.

O plano diz «não há candidato real hoje: última candidatura real em 26/04» (`:26`). Para esta candidatura isso não
foi conferido, e ela não aparece na decisão.

Depois do apply, uma tela aberta com o item velho recebe `get_opcoes_sjt` 42704 (se ainda for buscar as alternativas).
Se já as tem em cache, o envio recebe `pontuar_sjt` `'pergunta fora da bateria'` 42501. O serviço mapeia 42501 para
`LOCKED`, e a tela mostra «Sua etapa avançou — esta avaliação não aceita mais respostas» e manda ao painel. Nada disso
é verdade. O plano só registra o primeiro caminho.

**Cenário:** se `3a9254c3` for uma pessoa real com o SJT aberto no apply, ela é mandada embora com uma mensagem falsa
e pode abandonar. Se não estiver com a tela aberta, recebe a bateria nova 6+1, que é o efeito pretendido (D-29).

**Evidência:**
```
$ node p46apply.cjs sql "set transaction read only; select c.id::text, v.id::text vaga, e->>'cargo' cargo from public.candidaturas c join public.vagas v on v.id=c.vaga_id cross join lateral jsonb_array_elements(…) e where c.etapa_atual='avaliacao_assincrona' and (e->>'tipo'='sjt' or …) and not exists (… sjt mc …)"
[ {"id":"3a9254c3-8086-42df-8d81-42889c3a1f8d","vaga":"fdbe1a4a-…","cargo":"sdr-social-seller"},
  {"id":"f73682b6-7827-4e89-b6c1-f25116a30083","vaga":"a32fe930-…","cargo":"dentista"} ]
$ … select c.created_at::date, (cd.email ~* '(teste|test|invalido|example|beautysmile|e2e|smoke)') email_de_teste, … v.titulo ~* 'teste' vaga_teste …
[ {"id":"f73682b6-…","created_at":"2026-06-26","email_de_teste":true,"vaga_teste":true},
  {"id":"3a9254c3-…","created_at":"2026-10-09","email_de_teste":false,"ultima_resposta":null,"vaga_teste":false} ]
# o ensaio publica só: em_curso=1,…,em_curso_ids=f73682b6-7827-4e89-b6c1-f25116a30083
```

**Fix (dono 52-18, só a apresentação da decisão; sem código):** na Task 2, o executor mostra também `3a9254c3`, pelo
id, sem dado pessoal, como «em curso numa bateria RETIRADA», e o operador confirma se é conta dele/de UAT. O item de
UAT do `:251` ganha o caminho «SJT de cargo do texto aberto durante o apply → 42501 → "Sua etapa avançou" (falso)». A
melhoria do gerador, de publicar também `em_curso_retirados=<ids>`, fica para quando o gerador for mexido, porque pede
o review `-2`.

### WR-04: o `pontuar_sjt` (vivo e novo) aceita `pergunta_id` repetido em CAIXA diferente — um item conta duas vezes e outro fica de fora, com `answered = expected`

**File:** `scripts/geradores/pontuar_sjt_vivo.plpgsql:33-35,42` (o `DISTINCT` é sobre o TEXTO de `pergunta_id`; o `::uuid` vem depois) · o mesmo trecho no corpo novo da migration

**Defeito:** O teste de duplicata (`count(*) <> count(DISTINCT r->>'pergunta_id')`) e o `v_answered` comparam o texto.
Com `"abc…"` e `"ABC…"`, o mesmo uuid passa como dois. O `::uuid` de «fora da bateria» e o `JOIN` de `scored` os veem
como o mesmo item: ele conta duas vezes no score e no breakdown, e um item da bateria fica sem resposta. A recusa
nova continua exata quanto aos elementos (cada um casa 1 linha), por isso não reage. É anterior à 0003, e a 0003
preserva o defeito por construção («vivo + um bloco»).

**Cenário:** um candidato que chama o RPC à mão (o `supabase.rpc` está no bundle) dobra o item em que tem certeza e
pula o que não sabe. A nota infla, e pode cruzar `mc_min_pct` (`sucesso` em vez de `pendente_humano`). A RNF-07a evita
a rejeição automática, mas o RH lê uma nota que não corresponde a uma bateria completa.

**Evidência (sonda do revisor no ensaio que aborta, o corpo NOVO, como o candidato dono):**
```
$ node scripts/p52_ensaio.cjs --migracoes=supabase/migrations/20261011000003_p52_banco_sjt_v2.sql <scratchpad>/rev/sonda_dup.sql
ENSAIO VERMELHO: P0001: REVISOR SONDA: payload=6 elementos; erro=-; gravado score=24/24 answered=6 respostas=6 perguntas_distintas=5 (1888 ms)
```
(social-media, 6 itens: o 1º enviado em minúsculas e em MAIÚSCULAS, o 6º omitido; aceito, com nota máxima.)

**Fix (dono: backlog ou rodada nova do gerador, decisão do operador; não bloqueia este apply, porque é anterior e
exige RPC forjado):** dentro do MESMO bloco depois da âncora (o contrato «vivo + um bloco» fica de pé), em
`BLOCO_RECUSA_PONTUAR`:
```sql
  IF (SELECT count(DISTINCT (r->>'pergunta_id')::uuid) FROM jsonb_array_elements(p_respostas) r) <> v_answered THEN
    RAISE EXCEPTION 'resposta duplicada' USING errcode = '22023';
  END IF;
```
Isso pede gerar de novo, ensaiar de novo, uma cláusula ou mutação no smoke (n) e o review `-2`.

### WR-05: a classe `text[] || '<literal>'` (22P02 que esconde o rótulo do FAIL) ainda está em `p49_12_pos_estado.sql:126,135`

**File:** `supabase/tests/p49_12_pos_estado.sql:67` (`v_falhas text[]`) · `:126` · `:135`

**Defeito:** `v_falhas := v_falhas || '<literal>'`. O literal sem tipo resolve para `text[]`, e o Postgres tenta lê-lo
como array: `22P02 malformed array literal`. Se a falha de proveniência (`:126`) ou a da D-30 (`:135`) acontecer, o
instrumento reprova com 22P02 em vez de `POS-ESTADO DIVERGE: …`. A reprovação não é vácua, mas o diagnóstico é
falso, e é a mesma classe que o 52-17 consertou no smoke do banco (`:743`). A varredura pela forma em
`supabase/tests/*.sql` e `supabase/migrations/*.sql` acha SÓ estes dois casos. `p47_historico_smoke.sql:627` e
`p45_motor_exclusao_smoke.sql:3853` casam o texto, mas a variável é `text`.

**Evidência:**
```
$ python3 -I <scratchpad>/rev/sweep_arr.py      # variáveis declaradas <tipo>[] + `var || '…'` sem `::`
supabase/tests/p49_12_pos_estado.sql | 126 | v_falhas | append | …
supabase/tests/p49_12_pos_estado.sql | 135 | v_falhas | append | …
TOTAL 2
$ node p46apply.cjs sql "set transaction read only; select '{}'::text[] || 'a analise 48f0351e NAO esta' as x"
ERROR:  22P02: malformed array literal: "a analise 48f0351e NAO esta"
```

**Fix (dono: orquestrador → backlog, ou o próximo plano que rodar o instrumento do 49-12; fora do caminho do
52-18):** `'…'::text` nas duas linhas, como no `p52_banco_sjt_smoke.sql:743`.

## Info

### IN-01: o cabeçalho do smoke diz que evita o gatilho de e-mail por não inserir em `candidaturas` — mas o `UPDATE` da (n) dispara a mesma classe de gatilho; quem protege é só o rollback

**File:** `supabase/tests/p52_banco_sjt_smoke.sql:70-73,789-809`

**Issue:** A (n) leva a candidatura REAL mais antiga (não encerrada, sem SJT mc) para `avaliacao_assincrona`, num
`UPDATE`. A cadeia é `avancar_etapa` (BEFORE UPDATE OF etapa_atual) → INSERT em `historico_candidatura` →
`trg_notif_transicao` → `evento = 'avanco'` → `net.http_post(…/notificar-candidato)`. É o e-mail de avanço para uma
pessoa real. O que o segura é o savepoint (`P52B1`) mais o aborto do ensaio: o pg_net enfileira por tabela, e a
fila revertida não é enviada. Medido depois de 9 ensaios hoje (os do tracer e os meus, inclusive a sonda do WR-04,
que faz o mesmo `UPDATE`): `net.http_request_queue` = 0 e `net._http_response` do último dia = 0. Correto hoje, mas a
justificativa escrita está errada, e uma edição futura que tire o savepoint achando que «UPDATE não manda e-mail»
reabre o caminho. **Fix:** corrigir o comentário para nomear a cadeia do UPDATE. Dono: backlog / 52-16.

### IN-02: o harness não tem mutação para (j)/(k)/(l) nem para o POS da 0003; o revisor provou que mordem

**File:** `scripts/p52_mutacoes.cjs:299-400` (B1..B6 cobrem PRE, (a), (f), (g), (m), (n))

**Issue:** Medido, ensaio que aborta:
- `mut_k` (resposta redirecionada para outra alternativa) → `P52B FAIL (k): … deixou de resolver`;
- `mut_k2` (id velho plantado num item retirado) → `P52B FAIL (k): id velho … em [public.perguntas=1]`;
- `mut_l` (score +1) → `P52B FAIL (l)`.

Dentro da migration, antes do POS: `P52B POS-PORTAO (remap)`, `(mapa): 31 … PRE mediu 32` e `(pontuar_sjt): o
comentario da funcao mudou`. Os arquivos estão em `<scratchpad>/rev/`. **Fix:** promover RK/RL a entradas do harness
na próxima rodada que mexer no `p52_mutacoes.cjs`. Dono: backlog.

### IN-03: o `p46apply migrate` vai imprimir o lembrete BD-14 no apply, e o plano não diz o que fazer com ele

**File:** `p46apply.cjs:122-131` · `52-18-PLAN.md:229-234`

**Issue:** O corpo da 0003 tem `CREATE TABLE` (o mapa), e o regex do BD-14 casa e imprime «rode
`p44_export_drift_smoke.sql`». O mapa mora em `supabase_migrations`, e o p44 vigia só `public` (`:651,661`), então não
há drift a medir. Se rodar, é inócuo (só leitura). Sem instrução, o executor pode tratar a linha como parada.
**Fix:** registrar no SUMMARY que o lembrete é esperado e que o p44 não se aplica, ou rodá-lo e registrar `pass`.
Dono: 52-18.

### IN-04: o ensaio roda em REPEATABLE READ; o apply roda em READ COMMITTED — o POS pode recusar por tráfego legítimo

**File:** `scripts/p52_ensaio.cjs:154-160` (`p52iso`) · `p46apply.cjs:114` (sem `SET TRANSACTION`) · `gen-sjt-v2.py:413-415,789-795`

**Issue:** No apply, `FP_RESPOSTAS` e `FP_SCORES` cobrem TODA linha SJT, medidas no PRE e de novo no POS, com snapshots
diferentes. Um `pontuar_sjt` legítimo de qualquer cargo, que commita nesse intervalo de ~1 s, faz o POS recusar. A
recusa é fechada: nada persiste. Mas o `:47` proíbe reaplicar depois de PRE/POS recusado, e a mensagem («uma resposta
SJT gravada deixou de resolver…») se lê como defeito. **Fix:** nota no SUMMARY. Recusa de FP no apply com tráfego
concorrente é checkpoint ao operador, com o diagnóstico «tráfego ou defeito?» (repetir a Passo 0b distingue). Dono:
52-18.

### IN-05: IN-06 do -2 (a varredura isenta o ledger inteiro e não olha `pg_catalog`) — remedido, sólido hoje

**File:** `scripts/geradores/gen-sjt-v2.py:366-383`

**Issue:** O código não mudou. Remedido só leitura:
- 36 ids fora de v4 em item ativo;
- 0 em `prosrc`, `pg_views`, `pg_policies`, defaults e `cron.job`;
- 1 linha do ledger (`20260611000002`).

A isenção da tabela inteira e a ausência de `pg_catalog` seguem equivalentes ao declarado, hoje. Dono: 52-16
(backlog).

### IN-06: a banda da rubrica do caso aberto é constante no parser e ignora a linha **Rubric** do texto

**File:** `scripts/geradores/sjt_texto.py:88`

**Issue:** `{'avanca': 18, 'entrevista': 13, 'score_max': 25}` é fixa. Um texto que mudasse a linha `**Rubric** —
score_max …` seria gerado com a banda velha, sem recusa. Hoje as 4 linhas do texto dizem 25/13/18 (`BANCO-SJT-V2.md:151,262,373,485`),
e o único caso inserido é o de pré-vendas. **Fix:** ler a linha e recusar se ausente ou diferente. Dono: backlog.

---

## Saída do portão (modo revisão)

Registrada depois do commit deste arquivo, na resposta ao orquestrador. O comando:

```
node scripts/p52_portao.cjs --revisao .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-BANCO --base refs/gsd/52-15/sha --plano .planning/phases/52-hub-do-rh-dados-e-contato/52-18-PLAN.md --modo revisao
```

---

_Reviewed: 2026-10-11T18:50:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
