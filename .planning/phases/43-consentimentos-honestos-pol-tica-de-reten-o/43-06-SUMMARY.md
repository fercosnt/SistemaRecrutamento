---
phase: 43
plan: 06
subsystem: retencao-lgpd
tags: [lgpd, retencao, predicado-unico, previa-read-only, security-definer, md5-gate, migration, zero-destrutivo]
status: complete
requires:
  - public.config_retencao_etapa (43-04 — a matriz que o predicado junta) — NÃO APLICADA
  - public.candidaturas / public.historico_candidatura / public.decisao_final (vivas em PROD)
  - docs/compliance/sql/04-invent05-blast-radius.sql (a regra da CONSULTA ÚNICA)
  - 20260730000005_p42_invent05_not_exists.sql (o idioma NULL-safe de exceção)
provides:
  - public.candidaturas_alem_da_janela() — A ÚNICA DEFINIÇÃO do predicado de retenção — NÃO APLICADA
  - public.previa_retencao() — agregado por estado — NÃO APLICADA
  - public.previa_retencao_total() — total + carimbo de data — NÃO APLICADA
  - supabase/tests/p43_previa_smoke.sql (9 asserções, 5 negativas) — NÃO EXECUTADO
  - 43-UI-SPEC.md §Prévia read-only — emenda registrada do rótulo da contagem
affects:
  - 43-07 (checkpoint: apply da 4ª migration + reparo do ledger + md5 + smoke)
  - 43-08 (a tela /admin/retencao consome os dois wrappers agregados)
  - 46 (PURGA-02: o `DELETE` CHAMA este predicado — requirement herdado por construção)
tech-stack:
  added: []
  patterns:
    - "predicado de purga definido UMA vez e consumido pelo dry-run e pelo delete — com gate automatizado (md5 do corpo + asserção de que o wrapper CHAMA) contra a segunda cópia"
    - "COALESCE de data-âncora terminando deliberadamente numa coluna NOT NULL: torna INEXPRIMÍVEL o modo de falha em que o registro sai da contagem em silêncio"
    - "REVOKE sem GRANT de volta como controle ESTRUTURAL de exfiltração de PII — a função que devolve linhas identificáveis não é chamável por papel de cliente"
    - "asserção de PII sobre a ASSINATURA (pg_get_function_result), não sobre uma execução — a proibição vale antes de qualquer render"
    - "banlist de verbo de escrita por FRONTEIRA DE PALAVRA (\\m…\\M) e não por substring nua: updated_at/deleted_at são colunas legítimas do predicado"
key-files:
  created:
    - supabase/migrations/20260801000004_p43_previa_retencao.sql
    - supabase/tests/p43_previa_smoke.sql
  modified:
    - .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
decisions:
  - "A definição do predicado nasce na Phase 43, não na 46: se o dry-run e o DELETE saírem da mesma função, a 46 herda PURGA-02 satisfeito POR CONSTRUÇÃO em vez de reproduzi-lo — e o gate de md5 reprova quem criar a segunda cópia."
  - "Data-âncora com COALESCE de 4 degraus (entrada no estado atual → data_decisao_final → updated_at → data_candidatura NOT NULL). O 4º degrau ser NOT NULL é load-bearing: sem ele, NULL + interval < now() avalia NULL, o WHERE não é satisfeito e a candidatura sai da contagem SEM SINAL."
  - "candidaturas_alem_da_janela REVOGADA de PUBLIC/anon/authenticated e SEM GRANT de volta: é a única função da fase que devolve linhas identificáveis, e a proibição de enumerar candidatos prestes a serem apagados tem de ser estrutural."
  - "BD-1 estendido e registrado no COMMENT: autorizacao_retencao_curriculo NÃO entra no predicado. Encurtar a janela de quem não autorizou é decisão de POLÍTICA da Phase 46, com parecer jurídico — e faria a prévia mostrar números alarmantes numa fase declaradamente zero-destrutiva."
  - "previa_retencao_total NÃO é a soma das linhas de previa_retencao: conta só candidatos cujas candidaturas vivas estão TODAS fora da janela. Logo total <= soma, e o smoke assere a desigualdade."
  - "md5(prosrc) do predicado PINADO: ddfa6542921d241323c0124fc1bd1f99 (775 octetos)."
  - "md5 do ARQUIVO da migration PINADO para a prova de fidelidade do apply: ce9d8d5565912f33fb6d8aaf8385ed74"
  - "43-UI-SPEC emendada: linha por estado conta CANDIDATURAS, total conta CANDIDATOS. O rótulo aprovado contaria uma coisa e nomearia outra."
metrics:
  duration: ~25min
  completed: 2026-08-02
  tasks: 3
  commits: 3
  tsc_antes: 97
  tsc_depois: 97
actuals:
  tokens: 15149
  tasks: 3
  commits: 3
---

# Phase 43 Plan 06: O predicado único e a prévia read-only Summary

O predicado de retenção passou a existir como **uma** definição — a que a prévia
desta fase consome e a que o `DELETE` da Phase 46 vai chamar — e a prévia devolve
apenas **contagens agregadas por estado, carimbadas com a data do servidor**, sem
que exista caminho por onde ela possa nomear uma pessoa.

## O que foi entregue

**Task 1 (tracer) — a única definição, e os dois wrappers.**
`public.candidaturas_alem_da_janela()` (`STABLE`, `SECURITY DEFINER`,
`search_path` vazio) junta `public.candidaturas` à matriz `config_retencao_etapa`
do 43-04 e devolve as candidaturas cuja data-âncora somada à janela do próprio
estado já passou de `now()`. `public.previa_retencao()` agrega por estado
(`count(*)` e `count(DISTINCT candidato_id)`); `public.previa_retencao_total()`
devolve o total mais `calculada_em := now()`. Os dois wrappers carregam o guard
NULL-safe do 43-04 e só então `GRANT EXECUTE … TO authenticated`.

**Task 2 — o smoke com gate de não-divergência.** Nove asserções no idioma
gate-GUC, cinco delas negativas, **zero escrita — nem dentro de subtransação**.

**Task 3 — a emenda da UI-SPEC.** A linha por estado passou a dizer
`{n} candidaturas`; o total continua em `{n} candidatos`, agora com o contrato
das duas contagens escrito por extenso e a emenda datada logo abaixo.

## A decisão que estruturou o plano inteiro

O dry-run da purga tem de ser **gerado pela mesma query do `DELETE` real**. Um
dry-run que diverge do predicado é decoração — e este projeto já embarcou essa
classe de falha uma vez (P39 CR-02: uma guarda que era dead code). Havia duas
formas de honrar isso: escrever no plano da Phase 46 que ela deve reusar, ou
**fazer com que reusar seja o caminho mais barato e divergir reprovar um gate**.

O arquivo escolheu a segunda. Três mecanismos, e os três precisam existir juntos:

1. A definição nasce **agora**, meses antes da purga, num arquivo cujo cabeçalho
   diz em voz alta *"se você veio da Phase 46 para escrever o `DELETE`: chame esta
   função"*.
2. A asserção **(e)** pina o `md5(prosrc)` do corpo. Editar o predicado sem
   re-pinar conscientemente reprova.
3. A asserção **(f)** exige que `pg_get_functiondef` dos wrappers **contenha a
   chamada** — e que eles **não** releiam `config_retencao_etapa` por conta
   própria. Sem esta terceira, alguém poderia deixar o predicado intacto (md5
   verde) e reescrever a prévia com uma consulta própria "mais rápida": o gate
   ficaria verde e o dry-run voltaria a mentir. As duas metades cobrem sentidos
   opostos do mesmo defeito.

## O degrau NOT NULL é a asserção mais silenciosa do arquivo

A data-âncora é um `COALESCE` de quatro degraus: (1) o `criado_em` mais recente de
`historico_candidatura` cuja `etapa_para` é a `etapa_atual` — o instante em que a
candidatura **entrou** no estado em que está, que é a única leitura que responde
"há quanto tempo ela está parada aqui", e é por estado que a matriz é chaveada;
(2) `data_decisao_final`; (3) `updated_at`; (4) `data_candidatura`, **NOT NULL**.

O quarto degrau não é zelo. Se a ladeira pudesse render NULL,
`NULL + interval < now()` avalia NULL, o `WHERE` não é satisfeito, e a candidatura
sai **silenciosamente** da contagem. O sistema acreditaria ter uma política de
retenção funcionando enquanto classificava errado sem sinal nenhum — que é
literalmente o modo de falha que o INVENT-05 corrigiu do outro lado deste mesmo
tipo de predicado. Terminar numa coluna NOT NULL torna esse modo de falha
**inexprimível**, não apenas improvável. Pela mesma razão, as duas exceções são
`NOT EXISTS` e nunca `id NOT IN (…)`.

E a exceção que existe por razão de direito, não de engenharia: candidatura com
**pedido de revisão do Art. 20 em aberto** fica fora do predicado. Apagar a
evidência de um direito *em exercício* é o defeito que o Art. 20 existe para
impedir — o titular pediu que uma pessoa revisasse a decisão, a resposta ainda não
saiu, e a base probatória da revisão é justamente a candidatura.

## A proibição de enumerar PII vive no REVOKE, não na tela

`candidaturas_alem_da_janela` é a única função da fase que devolve linhas
identificáveis (`candidatura_id`, `candidato_id`). Ela é revogada de
`PUBLIC, anon, authenticated` e **não recebe `GRANT` de volta**: quem a chama são
os wrappers (que são `DEFINER` e rodam como o owner) e, na Phase 46, o `DELETE` do
cron. Não existe caminho PostgREST para ela.

Uma tela capaz de enumerar as pessoas prestes a serem apagadas é superfície de
exfiltração construída sem necessidade — e a asserção **(a)** afere isso sobre a
**assinatura** dos wrappers (`pg_get_function_result`), não sobre uma execução,
porque a proibição tem de valer antes de qualquer render. A banlist é de
**identificadores** e não de radicais: `candidatos_afetados` é uma contagem e
passa; `candidato_id` reprova.

## BD-1 estendido, dito dentro do banco

O `COMMENT ON FUNCTION` do predicado carrega a decisão travada:

> **`autorizacao_retencao_curriculo` NÃO ENTRA NESTE PREDICADO.** Nesta fase ele é
> base legal **citada** na superfície do candidato (RETEN-03), nunca encurtador de
> janela.

Duas razões, e a segunda é a que decide: encurtar a janela de quem não autorizou
faria a prévia mostrar números altos e alarmantes numa fase declaradamente
zero-destrutiva; e a regra "não autorizou ⇒ retenção = duração do processo" é
**decisão de política**, não de implementação. Escrevê-la aqui seria tomá-la por
acidente de implementação, antes do parecer jurídico que a Phase 46 exige.

No mesmo `COMMENT`, a lista de exceções é declarada **extensível e incompleta por
desenho**, com a dependência nomeada: **candidaturas em rascunho hoje entram na
contagem**, e confirmar o tratamento delas (além de obrigação legal concorrente,
litígio em curso e vaga ainda aberta) é dependência explícita da Phase 46. Está
escrito dentro do banco porque é lá que quem for armar a purga vai tropeçar nele.

## Zero ação destrutiva — declarado E medido, nas duas metades

A migration abre com o escopo negativo em uma linha e não contém `DELETE`,
`INSERT`, `UPDATE`, cron ou gatilho. Mas "por desenho" só vale se for medido, e a
medição tem duas metades que se complementam:

- **(g), estática:** o `prosrc` das três funções não contém verbo de escrita, e as
  três são `STABLE`.
- **(i), dinâmica:** as contagens de `public.candidaturas` e `public.candidatos`
  são idênticas antes e depois — e a asserção **(h) executou as três funções**
  antes dela, então se alguma apagasse algo, apareceria aqui.

## O gate de md5 e o pin, com o comando de recomputação

| Item | Valor |
|------|-------|
| `md5(prosrc)` do predicado (asserção (e)) | `ddfa6542921d241323c0124fc1bd1f99` (775 octetos) |
| `md5` do **arquivo** da migration (fidelidade do apply, 43-07) | `ce9d8d5565912f33fb6d8aaf8385ed74` |

Recomputação do pin do corpo (o mesmo comando está no bloco de proveniência do
smoke, ao lado do valor):

```bash
node -e 'const f=require("fs").readFileSync(process.argv[1],"utf8"),
  D="$candidaturas_alem_da_janela"+"$", a=f.indexOf(D),
  b=f.indexOf(D,a+D.length);
  console.log(require("crypto").createHash("md5")
    .update(f.slice(a+D.length,b),"utf8").digest("hex"))' \
  supabase/migrations/20260801000004_p43_previa_retencao.sql
```

Recomputação do md5 do arquivo:

```bash
printf '%s' "$(cat supabase/migrations/20260801000004_p43_previa_retencao.sql)" | md5
```

> ⚠ A **única** divergência autorizada, e o seu teste de discriminação: se no
> checkpoint o pin de (e) não bater **e** o `md5(statements[1])` do apply tiver
> batido o md5 do arquivo, a divergência é da **extração do corpo**, não do objeto
> vivo. Só nesse caso o orquestrador atualiza o pin uma vez com o valor medido e
> registra a discrepância. Nunca o contrário — nunca afrouxar a asserção, nunca
> trocar o md5 por `strpos`, nunca marcar (e) como opcional.

## Verificação executada

| Gate | Resultado |
|------|-----------|
| Task 1 `<verify>` (arquivo, sem `BEGIN;/COMMIT;`, sem verbo de escrita sobre tabela de candidato, `NOT EXISTS`, `IS DISTINCT FROM`) | **PASS** |
| Dollar-quoting balanceado (2/2/2 delimitadores nas três funções) | ok |
| `NOT IN` em predicado (lição INVENT-05) | **nenhum** — as 3 ocorrências são `COMMENT` que o condenam |
| Task 2 `<verify>` (`pg_get_functiondef`, `md5`, `42501`) | **PASS** |
| Blocos `DO $$` do smoke balanceados | **11 / 11** |
| Asserções rotuladas × incrementos do contador × esperado de (z) | **9 / 9 / 9** |
| Verbo de escrita real no smoke | **0** |
| Pin do corpo × valor no smoke | `ddfa…1f99` = `ddfa…1f99` |
| Task 3 `<verify>` (`candidaturas**`, `Emenda registrada`) | **PASS** |
| Escopo do diff da UI-SPEC | **3 hunks, todos dentro da §Prévia read-only** (linhas 584–609) |
| `npm run -s lint` (`tsc`), nos 3 commits | **97** — baseline congelada intacta |
| Zero `--no-verify` | confirmado — os 3 commits passaram pelo hook |

## Gate do tracer

Sendo a Task 1 do tipo `tracer`, seu `<verify>` foi re-executado ponta a ponta
**antes** de qualquer task de expansão, e passou. O `<verify>` da Task 1 é
integralmente `<automated>` — não há fatia funcional verificável por humano nesta
fase, porque **nada é aplicado**; a verificação humana real é o checkpoint 43-07,
que a própria estrutura da fase reserva para isso. O plano é `autonomous: true`,
que é a declaração de que nenhum portão humano vive **dentro** dele. Com a
fundação verde, as Tasks 2 e 3 foram empilhadas sobre ela.

## Deviations from Plan

### 1. [Rule 1 — bug no critério] A asserção (g) usa fronteira de palavra, não substring nua

- **Encontrado em:** Task 2, ao escrever a asserção de negativa de escrita.
- **Problema:** a `<action>` pede que o `prosrc` "não contenha `delete`, `insert`
  nem `update` (comparação case-insensitive sobre o corpo)". Lido ao pé da letra,
  isso é `strpos(lower(prosrc), 'update') = 0` — e **reprovaria a implementação
  correta**: o degrau (3) da data-âncora é `c.updated_at` e a exceção de
  soft-delete é `c.deleted_at`. As duas colunas contêm `update` e `delete` como
  substring, e as duas são exigidas pela `<action>` da Task 1 no mesmo plano. O
  critério, como escrito, é auto-contraditório.
- **Correção:** regex com fronteira de palavra (`\mupdate\M`, `\mdelete\M`,
  `\minsert\M`, mais `\mtruncate\M` e `\mdrop\M`). `_` conta como caractere de
  palavra no regex do Postgres, então o padrão **não** casa dentro de
  `updated_at`, mas casa no verbo isolado. É o verbo que está banido, não a letra.
- **Por que não afrouxamento:** a versão com fronteira é **mais estrita** no que
  importa (pega `DROP` e `TRUNCATE`, que a lista original não pegava) e deixa de
  produzir o falso positivo. A razão está escrita por extenso no cabeçalho do
  smoke, com o precedente nomeado — é a mesma lição que a 43-UI-SPEC já havia
  registrado sobre o escopo do grep de `automaticamente`: *um teste que reprova o
  comportamento correto é pior que teste nenhum, porque treina quem executa a
  desligá-lo.*
- **Arquivo:** `supabase/tests/p43_previa_smoke.sql` · **Commit:** `fe317ae`

### 2. [Rule 2 — funcionalidade crítica ausente] A asserção (f) também proíbe o wrapper de reler a matriz

- **Encontrado em:** Task 2.
- **Problema:** a `<action>` pede que `pg_get_functiondef` dos wrappers **contenha**
  a chamada ao predicado. Isso é necessário e insuficiente: um wrapper pode chamar
  o predicado **e**, ao lado, começar a reimplementar o `JOIN` com
  `config_retencao_etapa` — o md5 continuaria verde, a chamada continuaria
  presente, e a segunda cópia nasceria no mesmo arquivo.
- **Correção:** (f) ganhou a metade negativa — os wrappers **não podem**
  referenciar `config_retencao_etapa` diretamente. Eles consomem o predicado e
  nada mais.
- **Arquivo:** `supabase/tests/p43_previa_smoke.sql` · **Commit:** `fe317ae`

### 3. [Rule 2] A metade POSITIVA da asserção (a)

A `<action>` descreve (a) como uma banlist sobre o tipo de retorno. Uma banlist
sozinha passa **por vacuidade**: uma função que não devolvesse coluna nenhuma
ficaria verde. Foi acrescentada a metade positiva — `previa_retencao` tem de
devolver `etapa` + as duas contagens, e `previa_retencao_total` tem de devolver
`candidatos_afetados` **e** `calculada_em`. Sem esta última, o carimbo de data
poderia sumir sem que asserção alguma percebesse.

### 4. [Rule 2] (h) mede o carimbo, não só os números

A `<action>` de (h) pede a coerência aritmética. Foi acrescentada a verificação de
que `calculada_em` não é nulo e está a menos de 5 minutos de `now()` — a prova de
que ele é computado **pela mesma função que computa o número**, que é o must-have
"a prévia carimba a própria data no servidor". Sem isso, um `calculada_em` fixo ou
vindo do cliente passaria em verde.

### 5. [Rule 2] (g) também exige `provolatile = 's'`

Volatilidade não prova ausência de escrita, mas `STABLE` é a declaração em que o
planejador acredita — uma prévia que deixasse de ser `STABLE` seria o primeiro
sinal de que ela passou a fazer outra coisa. Barato, e fecha o sinal antes de o
verbo aparecer.

### 6. [Diferença literal em relação ao texto do plano, registrada] `data_candidatura::timestamptz`

O plano descreve o 4º degrau como `c.data_candidatura`. O `COALESCE` foi escrito
com cast explícito para `timestamptz`. Se a coluna já é `timestamptz` o cast é
no-op; se não for, ele torna a resolução de tipo da ladeira explícita em vez de
implícita. Trivial, mas é diferença literal e por isso está aqui.

### 7. [Fora do plano, corrigido] `STATE.md` teve o contador de plano revertido pelo `init`

A chamada `gsd-tools query init.execute-phase 43` do arranque reescreveu
`Plan: 6 of 9` para `Plan: 1 of 9`. Detectado no `git status` antes do commit
final, revertido por `git checkout .planning/STATE.md`, e só então
`state.advance-plan` foi rodado — resultando no valor correto, `Plan: 7 of 9`. Sem
a reversão, o contador teria ido para 2 e a posição da fase ficaria errada.

## ⚠ NADA APLICADO EM PROD — e o que o 43-07 tem de fazer com ESTA migration

Este plano produziu **dois arquivos SQL e uma emenda de contrato**. As três funções
**não existem em PROD** e o smoke está **deliberadamente RED** contra o banco
atual: ele é a **especificação** da migration, não um relatório dela.

Pendente do checkpoint 43-07, e **depois** das três migrations anteriores:

1. **`apply_migration` de `20260801000004_p43_previa_retencao.sql`** — sem wrapper
   `BEGIN;/COMMIT;`. ⚠ **Ordem obrigatória:** esta migration **lê
   `public.config_retencao_etapa`**, criada por `20260801000002` (43-04). Aplicar
   antes falha alto no `CREATE FUNCTION`, e falhar no apply é a forma barata.
2. **Reparo obrigatório do ledger:**
   ```sql
   UPDATE supabase_migrations.schema_migrations
      SET version = '20260801000004'
    WHERE name LIKE '%p43_previa_retencao%';
   ```
3. **Prova de fidelidade:**
   ```sql
   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
    WHERE version = '20260801000004';
   ```
   **Esperado: `ce9d8d5565912f33fb6d8aaf8385ed74`.** Divergência ⇒ o que foi
   aplicado **não é este arquivo** — e a perda de comentário aqui **não é
   benigna**: os `COMMENT ON FUNCTION` são o único lugar dentro do banco onde
   vivem a ordem da data-âncora com sua razão, a declaração de que a lista de
   exceções é incompleta por desenho, e a decisão BD-1 sobre
   `autorizacao_retencao_curriculo`.
4. **Rodar `supabase/tests/p43_previa_smoke.sql` numa ÚNICA chamada `execute_sql`.**
   Gate verde = **9 PASS** no RESUMO (z). Menos que 9 é run parcial e **não** deve
   ser tratado como verde.

Ordem completa da fase, para não se perder: `20260801000001` (colunas, 43-01) →
`20260801000002` (matriz, 43-04) → `20260801000003` (guard, 43-05) → **`20260801000004`
(este)**. E, dentro do 43-07, **colunas antes da Edge Function**.

## ⚠ O que a Phase 46 herda deste plano, dito em voz alta

> **O `DELETE` da purga CHAMA `public.candidaturas_alem_da_janela()`. Não copia o
> corpo, não reescreve "só a parte que interessa", não inline o `JOIN`.**

Se a 46 chamar, o PURGA-02 ("o dry-run é gerado pela mesma query do delete real")
está satisfeito **por construção**, sem uma linha de teste nova. Se ela reescrever,
a asserção (f) do smoke reprova e a divergência aparece **antes** de o `DELETE`
existir, não depois.

E as duas dependências que **não** foram resolvidas aqui, de propósito:

- **Candidaturas em rascunho hoje entram na contagem.** A lista de exceções é
  extensível e incompleta **por desenho**; confirmá-la é trabalho da 46, com o
  parecer jurídico trabalhista.
- **A matriz continua no seed genérico** (`origem='seed'` em todas as 8 linhas,
  43-04). A 46 tem de consultar essa coluna antes de armar qualquer `DELETE`:
  `origem='seed'` significa que **ninguém escolheu** esses números.

## Requirements

`RETEN-04` **permanece `In Progress` de propósito.** Numa fase cuja premissa é não
afirmar o que nenhum código executa, marcar `[x]` enquanto a migration não está
aplicada seria o mesmo defeito um diretório acima. Ele fecha no 43-07, com o smoke
em 9/9. É a quarta vez consecutiva que um executor desta fase recusa a marcação
antecipada, e a consistência é deliberada.

## Known Stubs

Nenhum. Os dois artefatos SQL são deliberadamente **não-aplicados** — não são
stubs, são entrada do checkpoint 43-07, e esta seção declara isso. O smoke está
deliberadamente RED contra o banco atual; se a implementação divergir dele,
**corrige-se a implementação**.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>` do plano. As cinco mitigações
previstas foram implementadas:

| Threat | Como ficou |
|--------|-----------|
| T-43-27 (enumeração de PII pela prévia) | `candidaturas_alem_da_janela` revogada de PUBLIC/anon/authenticated **sem GRANT de volta**; wrappers devolvem só contagens; asserções (a), (b) e (c) — e (a) é sobre a **assinatura**, antes de qualquer render |
| T-43-28 (EoP nos wrappers `DEFINER`) | guard `IS DISTINCT FROM` NULL-safe nos dois + `REVOKE … FROM PUBLIC, anon, authenticated` antes do `GRANT`; asserções (c) e (d), esta última com os **4** casos (2 funções × papel `rh` / sem claim) |
| T-43-29 (prévia reescrita com predicado próprio) | `md5(prosrc)` pinado (e) + `pg_get_functiondef` contém a chamada **e não relê a matriz** (f) |
| T-43-30 (número de prévia sem data) | `calculada_em := now()` devolvido pela mesma função que computa o número; asserção (h) mede a deriva contra `now()` |
| T-43-31 (escrita acidental) | (g) sobre `prosrc` com fronteira de palavra + `provolatile='s'`, (i) de contagens inalteradas **após** (h) executar as três funções, e o gate de `grep` do `<verify>` da Task 1 |
| T-43-SC (pacotes) | zero pacote npm, zero extensão Postgres nova |

## Commits

| # | Hash | Tipo | Conteúdo |
|---|------|------|----------|
| 1 | `69d56d6` | feat | Task 1 (tracer) — o predicado único, data-âncora NOT NULL-terminada, exceções por `NOT EXISTS`, revogação sem GRANT, os dois wrappers agregados com carimbo de servidor |
| 2 | `fe317ae` | test | Task 2 — smoke gate-GUC com 9 asserções, cinco negativas, pin de md5 com bloco de proveniência |
| 3 | `c971b02` | docs | Task 3 — a emenda registrada da UI-SPEC, 3 hunks dentro da §Prévia read-only |

## Self-Check: PASSED

Os dois arquivos SQL criados e a UI-SPEC modificada existem em disco; os três
hashes de commit existem em `git log`. Verificado após a escrita deste arquivo.
