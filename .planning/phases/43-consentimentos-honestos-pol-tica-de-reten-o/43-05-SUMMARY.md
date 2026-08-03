---
phase: 43
plan: 05
subsystem: consentimento-lgpd
status: complete
tags: [lgpd, consentimento, marketing, opt-out, trigger, fail-closed, migration, zero-destrutivo]
requires:
  - public.autorizacoes.autorizacao_marketing_vagas (coluna criada por 20260801000001 — NÃO APLICADA)
  - public.notificacoes_enviadas + notificacoes_enviadas_evento_check (6 valores vivos em PROD)
  - supabase/migrations/20260730000004 (idioma do bloco DO auto-verificador do CHECK)
  - supabase/tests/p42_notif_revisao_smoke.sql (molde gate-GUC de prova por inserção)
provides:
  - public.pode_receber_marketing(uuid) — autoridade única do consentimento — NÃO APLICADA
  - public.classe_evento_notificacao (tabela + RLS sem policy + seed 7/7) — NÃO APLICADA
  - notificacoes_enviadas_evento_check estendido a 7 valores — NÃO APLICADO
  - public.guard_marketing_consentimento() + trg_guard_marketing_consentimento — NÃO APLICADO
  - supabase/tests/p43_guard_marketing_smoke.sql (9 asserções) — NÃO EXECUTADO
  - docs/compliance/marketing-consentimento-escopo.md
affects:
  - 43-06/43-08 (a superfície de revogação de marketing escreve na coluna que este guard lê)
  - 43-07 (checkpoint: apply ORDENADO + reparo do ledger + md5 + smoke)
  - 46 (RETEN-05: purgar linhas antigas de notificacoes_enviadas remove a "sorte" que hoje faria
    um DROP/ADD do CHECK falhar alto — a partir daí só o bloco DO segura)
tech-stack:
  added: []
  patterns:
    - "guard no PONTO DE ESTRANGULAMENTO (BEFORE INSERT no ledger) em vez de if na Edge Function — service_role bypassa RLS mas NÃO bypassa trigger"
    - "classificação de evento como TABELA consultável, não CASE enterrado em função"
    - "vocabulário RESERVADO com guard vivo: valor de CHECK sem emissor, para tornar a recusa provável por escrita real"
    - "fail-closed inclui o 'não sei' — evento sem classe registrada é RECUSADO"
    - "asserção de teardown sobre a tabela de CONSENTIMENTO, não só sobre o ledger: um `true` sobrevivente seria prova fabricada"
key-files:
  created:
    - supabase/migrations/20260801000003_p43_guard_marketing.sql
    - supabase/tests/p43_guard_marketing_smoke.sql
    - docs/compliance/marketing-consentimento-escopo.md
  modified: []
decisions:
  - "O guard é TRIGGER e não `if` na Edge Function: service_role bypassa RLS mas NÃO bypassa trigger, e um if na EF é contornável pelo próximo emissor — este repositório teve 3+ emissores simultâneos na P39. É isso que torna o SC#2 provável por escrita RECUSADA em vez de por leitura de flag."
  - "Classe DESCONHECIDA também recusa (fail-closed do 'não sei'): um evento no CHECK sem linha em classe_evento_notificacao é exatamente o caminho por onde um envio de marketing entraria sem ser visto."
  - "Semântica de multiplicidade travada: `autorizacoes` é 1:N por candidato, e pode_receber_marketing() adota 'linha mais recente vence' (created_at DESC, id DESC) — o id DESC é desempate determinístico, porque uma função de consentimento não-determinística não é auditável."
  - "SQLSTATE P0003 mantido por contrato com o plano e o smoke, COM a colisão declarada: P0003 é o too_many_rows interno do PL/pgSQL. Nenhuma função deste arquivo pode levantá-lo de verdade (LIMIT 1 + lookup por PK, sem INTO STRICT); quem precisar discriminar olha o prefixo `P43-GUARD:` da mensagem."
  - "md5 do arquivo da migration PINADO (forma printf, sem newline final): baaa48a359cd65d5796f47fabd82b128 · md5 do arquivo com newline: 18d65dffd761f9e21b0efa1bc3e0405d"
metrics:
  duration: ~25min
  completed: 2026-08-01
  tasks: 3
  commits: 3
  tsc_antes: 97
  tsc_depois: 97
---

# Phase 43 Plan 05: O opt-out de marketing ganha consequência Summary

O consentimento de marketing deixou de ser uma flag que ninguém lê: um guard `BEFORE INSERT`
no ledger de notificações — o ponto de estrangulamento por onde todo envio é registrado —
**RECUSA** a escrita quando a classe do evento é marketing e o titular não consentiu, com
fail-closed para ausência, `NULL` e evento não classificado; e o **limite honesto** do que
isso prova ficou escrito em vez de subentendido.

## O que foi entregue

**Task 1 (tracer) — a migration `20260801000003`, em quatro blocos.**

- **BLOCO A · `public.pode_receber_marketing(uuid)`** — `STABLE`, `SECURITY DEFINER`,
  `search_path` vazio. Lê a linha **mais recente** de `public.autorizacoes` do candidato
  (`ORDER BY created_at DESC, id DESC LIMIT 1`) e devolve
  `coalesce(autorizacao_marketing_vagas, false)`. **Fail-closed nos três caminhos**: sem
  linha, coluna `NULL`, candidato inexistente. `anon` e `authenticated` revogados
  **nominalmente**, sem `GRANT` de volta — só o trigger a usa.
- **BLOCO B · `public.classe_evento_notificacao`** — a classificação de evento como **DADO
  consultável**, com `CHECK (classe IN ('transacional','marketing','interno'))`, RLS ligada e
  **zero policy** (default-deny total). Seed dos 6 valores vivos + o 7º **reservado**,
  `divulgacao_vagas`, de classe `marketing`. `ON CONFLICT DO NOTHING`, jamais upsert.
- **BLOCO C · o CHECK do ledger de 6 → 7 valores**, com bloco `DO` auto-verificador que
  **ABORTA o apply** se qualquer um dos 6 vivos sumir da definição resultante, ou se sobrar
  mais de um CHECK sobre `evento`. Linhas `>>> antes:` / `>>> depois:` deixadas em branco no
  cabeçalho para o orquestrador transcrever o `pg_get_constraintdef` vivo.
- **BLOCO D · `public.guard_marketing_consentimento()` + o trigger `BEFORE INSERT`** em
  `public.notificacoes_enviadas`. Resolve a classe de `NEW.evento`; `marketing` sem
  consentimento ⇒ `P0003`; **classe desconhecida ⇒ `P0003` também**; `transacional` e
  `interno` retornam `NEW` **sem consulta adicional**.

**Task 2 — `p43_guard_marketing_smoke.sql`, nove asserções no idioma gate-GUC.**
Toda escrita dentro de subtransação sempre revertida; gate verde = **9 PASS** no RESUMO (z).

| # | Prova |
|---|---|
| (a) | a recusa `P0003` **por INSERT real** de `divulgacao_vagas` sem consentimento — o coração do SC#2 |
| (b) | fail-closed em **três formas**: sem linha em `autorizacoes`, coluna `NULL`, evento sem classe |
| (c) | **não-regressão**: os 5 transacionais + o interno continuam sendo aceitos, por inserção real |
| (d) | negativa de vocabulário: 8º evento inventado recusado (`23514` ou `P0003`) |
| (e) | **não-divergência** entre o `pg_get_constraintdef` vivo e `classe_evento_notificacao`, nos dois sentidos |
| (f) | **caminho positivo**: com consentimento gravado (e revertido), o MESMO INSERT é ACEITO |
| (g) | negativa de privilégio: `proacl` das duas funções sem `anon`; RLS ligada com zero policies |
| (h) | negativa de trigger vizinho: `trg_notificacoes_atualizado_em` intacto, tabela com exatamente 2 triggers |
| (i) | negativa de envio: **zero linha nova em `net._http_response`** |
| (y1)(y2) | teardown aferido em **duas** tabelas: o ledger E `autorizacoes` |

**Task 3 — `docs/compliance/marketing-consentimento-escopo.md`**, com o que existe medido, o
que o SC#2 prova, o que ele **não** prova, e BD-5 quantificado e datado.

## A decisão que estruturou o plano inteiro

O SC#2 exige *"envio real bloqueado, não leitura de flag"*, e a medição da pesquisa diz que
**não existe caminho de envio de marketing neste sistema** — estruturalmente, porque
`notificacoes_enviadas` exige `candidatura_id NOT NULL` e um aviso de nova vaga não tem
candidatura a que se prender.

Os dois fracassos disponíveis eram: construir um canal de marketing inteiro fora de escopo, ou
entregar um `if (!consent) return` que nada exercita — **a promessa órfã, de novo, na fase que
existe para matá-la**.

O que foi construído é a terceira saída: um guard que **RECUSA**. Ele executa exatamente o que
afirma, e o que afirma é um "não".

E ele vive no **banco**, não na Edge Function, por três razões mecânicas — todas escritas no
`COMMENT ON FUNCTION`, dentro do banco:

1. **`service_role` bypassa RLS mas NÃO bypassa trigger**, e o claim da EF roda com
   `service_role`. Uma policy não o alcançaria.
2. **Um `if` na EF é contornável pelo próximo emissor**, e múltiplos emissores é o estado
   *normal* deste sistema: a P39 precisou de DROP-and-CREATE de triggers no mesmo phase porque
   havia 3+ triggers dormentes e um disparo por env-var em outra função.
3. **O ledger é o ponto de estrangulamento**: toda notificação é reivindicada ali antes de
   existir, então um controle ali alcança todo caminho presente e futuro.

## O que este plano NÃO afirma — dito aqui, não só no artefato

**Nenhum e-mail de marketing deixou de sair, porque nenhum jamais saiu.** `divulgacao_vagas` é
**vocabulário reservado com guard vivo, NÃO suporte a marketing**: nenhum trigger o emite, e a
EF `notificar-candidato` o rejeitaria com `400 VALIDATION` (`EVENTOS_VALIDOS` é derivado de
`EVENTO_MAP`, que não o contém).

O precedente que autoriza isso foi **verificado, não presumido**: `revisao_solicitada` está no
CHECK vivo desde `20260730000004` e **não** está em `EventoLedger`/`EVENTO_MAP`. O vocabulário
do banco ser maior que o do código já é o estado vivo deste sistema.

## ⚠ BD-5 — declarado em voz alta, e dentro do banco

> **Depois desta fase, ZERO candidato já cadastrado está autorizado a receber divulgação de
> vagas. 21 candidatos vivos medidos em 2026-08-01, nenhum com consentimento de marketing.**

`autorizacao_marketing_vagas` nasce `NULL` para toda a base histórica e **NULL vale NÃO
AUTORIZADO** — e é `public.pode_receber_marketing()` que torna essa frase verdadeira em vez de
aspiracional.

**Isto não é regressão, é a correção.** Ninguém nunca consentiu marketing separadamente porque
o consentimento separado não existia; herdar de `autorizacao_comunicacao` seria reconstruir
consentimento por **inferência** — exatamente o que o `.default(true)` fazia. Reconquistar a
base exige campanha de re-opt-in, feature de outro milestone que depende de um canal que ainda
não existe.

A declaração vive em **três** lugares por desenho: no `COMMENT ON FUNCTION
public.pode_receber_marketing` (dentro do banco, onde quem investigar uma métrica caindo
tropeça nela), em `docs/compliance/marketing-consentimento-escopo.md` §4, e aqui.

## Zero ação destrutiva — declarado E medido

O único `DROP` do arquivo é o da **própria constraint de CHECK**, imediatamente readicionada com
**superconjunto** do vocabulário. Nenhum `DELETE`, nenhum `DROP TABLE`, nenhum `DROP COLUMN`,
nenhum `UPDATE` sobre dado de titular.

E a afirmação é **medida**, não declarada:

- o bloco `DO` do BLOCO C **aborta o apply** se qualquer um dos 6 valores vivos sumir — em vez
  de depender da sorte de existirem linhas com esses valores hoje (sorte que a **Phase 46**
  remove, quando a purga de `notificacoes_enviadas` executar);
- a asserção **(y1)** exige contagem idêntica do ledger antes e depois;
- a asserção **(y2)** exige contagem idêntica de `public.autorizacoes` **e** zero linha com
  `autorizacao_marketing_vagas IS TRUE` no candidato-fixture — porque as asserções (b) e (f)
  escrevem nessa tabela para montar cenário, e um `true` sobrevivente seria **consentimento
  fabricado**, o oposto exato do que esta fase entrega;
- `git diff --diff-filter=D HEAD~3 HEAD` = **vazio**: nenhum arquivo apagado.

## Verificação executada

| Gate | Resultado |
|------|-----------|
| Task 1 `<verify>` (arquivo, sem wrapper de transação, `BEFORE INSERT`, revoke nominal, `revisao_solicitada`) | **VERDE** |
| Dollar-quoting balanceado (3 pares nomeados) | 6 ocorrências / 3 tags |
| `IF NOT EXISTS` fora de comentário na migration | **nenhum** |
| Task 2 `<verify>` (`P0003`, `23514`, `net._http_response`) | **VERDE** |
| Blocos `DO` do smoke balanceados | **13 / 13** |
| Incrementos do contador (10 sítios, 9 executáveis — (d) tem 2 ramos mutuamente exclusivos) × esperado de (z) | **9 / 9** |
| Task 3 `<verify>` (`candidatura_id`, `BD-5`) | **VERDE** |
| `npm run -s lint` (`tsc`), nos 3 commits | **97** — baseline congelada intacta |
| Arquivos deletados pelos 3 commits | **0** |
| Zero `--no-verify` | confirmado — os 3 commits passaram pelo hook |

## Gate do tracer

A Task 1 é `type="tracer"`. Seu `<verify>` foi re-executado ponta a ponta **antes** de qualquer
task de expansão: arquivo presente, sem wrapper de transação, `BEFORE INSERT` na tabela certa,
`REVOKE … FROM PUBLIC, anon, authenticated` presente, `revisao_solicitada` preservado. A
fundação estava verde, então as Tasks 2 e 3 puderam ser empilhadas sobre ela.

O gate foi tratado como **re-execução do `<verify>`** e não como checkpoint humano, seguindo o
precedente das Tasks tracer de 43-01 e 43-04 nesta mesma fase e o `autonomous: true` do
frontmatter — e porque o `<verify>` é puramente sobre conteúdo de arquivo, sem nada aplicado
que um humano pudesse observar.

## Deviations from Plan

### 1. [Rule 2 — afirmação incorreta do plano, corrigida por documentação] `P0003` **não** é um SQLSTATE livre

- **Encontrado em:** Task 1, BLOCO D.
- **Problema:** o plano descreve `P0003` como *"SQLSTATE próprio"*. Ele não é: `P0003` é a
  condição interna **`too_many_rows`** do PL/pgSQL (a classe `P0` do Postgres define
  `P0000` `plpgsql_error`, `P0001` `raise_exception`, `P0002` `no_data_found`, `P0003`
  `too_many_rows`, `P0004` `assert_failure`). Um chamador que discriminasse "guard recusou" por
  SQLSTATE poderia confundi-lo com um `too_many_rows` genuíno vindo de outro lugar.
- **Decisão:** **manter `P0003`** — é o contrato que o plano fixa, é o que a asserção (a) do
  smoke captura, e é o que o `<verify>` da Task 2 grepa; trocá-lo em silêncio seria divergir do
  gate. Mas a colisão foi **declarada**, não engolida: o `COMMENT ON FUNCTION` e um bloco de
  comentário do BLOCO D registram (i) que `P0003` é `too_many_rows`, (ii) por que a ambiguidade
  é inócua **neste caminho** — `pode_receber_marketing` usa `LIMIT 1`, a resolução de classe é
  lookup por chave primária, e nenhuma das duas usa `SELECT … INTO STRICT`, então nenhuma pode
  levantar `too_many_rows` de verdade — e (iii) que quem precisar discriminar com certeza deve
  olhar o prefixo da **mensagem** (`P43-GUARD:`), não o SQLSTATE.
- **Arquivo:** `supabase/migrations/20260801000003_…sql` · **Commit:** `5733e86`

### 2. [Rule 1 — bug que abortaria o smoke inteiro] `ip_aceite` é `NOT NULL` em `autorizacoes`

- **Encontrado em:** Task 2, asserção (f), ramo BD-4.
- **Problema:** a asserção (f) precisa gravar consentimento; para um candidato **sem nenhuma
  linha** em `autorizacoes` (os 4 de 21 medidos em BD-4) o `UPDATE` afeta 0 linhas e é preciso
  `INSERT`. Um `INSERT` com apenas `(candidato_id, autorizacao_uso_dados,
  autorizacao_marketing_vagas)` levantaria **`23502`** — `ip_aceite` é `NOT NULL` na tabela viva
  (`database.types.ts`: sem `| null` no `Row`) — e `23502` **não é capturado** pelos handlers da
  asserção (que tratam `P4305` e `P0003`). O smoke inteiro abortaria com um erro que não diz
  nada sobre o guard, e o operador leria "smoke falhou" sem saber por quê.
- **Correção:** `ip_aceite` incluído com `'0.0.0.0'::inet` (marcador explícito de dado
  sintético, vivo só dentro da subtransação revertida), com a razão escrita no comentário
  adjacente.
- **Arquivo:** `supabase/tests/p43_guard_marketing_smoke.sql` · **Commit:** `85ec043`

### 3. [Além da letra do plano, dentro da intenção] a asserção (d) aceita **duas** recusas

O plano especifica que o 8º evento inventado seja recusado com `23514`. Mas o guard roda
`BEFORE INSERT`, **antes** de o CHECK opinar, e recusaria esse evento com `P0003` por classe
desconhecida. Escrever a asserção esperando **apenas** `23514` a tornaria um teste que reprova o
comportamento correto — a armadilha que a 43-01 já documentou em sua deviação 3, com a mesma
conclusão: *"um teste que reprova o comportamento correto é pior que teste nenhum: ele treina
quem executa a desligá-lo."* A asserção aceita as duas recusas e nomeia qual ocorreu no NOTICE;
o que ela **não** aceita é o INSERT passar.

### 4. [Além da letra do plano, dentro da intenção] o teardown virou **duas** asserções

O plano pede "teardown aferido: contagem de `notificacoes_enviadas` idêntica antes e depois".
Isso cobre metade do risco. As asserções (b) e (f) **escrevem em `public.autorizacoes`** —
apagam linhas, anulam a coluna e gravam `true` — para montar os cenários. Uma contagem só do
ledger deixaria passar exatamente a falha mais grave que este smoke pode causar: um
consentimento de marketing **fabricado** sobrevivendo numa tabela cuja natureza declarada é
prova probatória. **(y2)** mede a contagem de `autorizacoes`, a ausência de qualquer
`autorizacao_marketing_vagas IS TRUE` no candidato-fixture, e a integridade das 7 linhas de
`classe_evento_notificacao` (que a asserção (b3) deleta e reverte).

### 5. [Além da letra do plano] a medição de multiplicidade entrou no FIXTURE

A `<action>` da Task 1 diz que *"o checkpoint 43-07 mede quantos candidatos têm mais de uma
linha hoje e registra o número"*. Em vez de deixar isso como instrução em prosa que o
checkpoint pode esquecer, o **FIXTURE do smoke calcula o número e o emite em `NOTICE`**, com a
frase `REGISTRAR ESTE NÚMERO NO 43-07`. A regra "linha mais recente vence" de
`pode_receber_marketing()` só é observável se esse número for `> 0`; se for `0`, a regra existe
mas nunca foi exercida ao vivo — e isso é um fato que vale registrar.

## ⚠ NADA APLICADO EM PROD — e o que o 43-07 tem de fazer, nesta ordem

Este plano produziu **três arquivos**. Subagentes GSD não recebem os tools MCP do Supabase
(anthropics/claude-code#13898) e `supabase db push` é **proibido** neste projeto. **As duas
funções não existem em PROD, a tabela `classe_evento_notificacao` não existe, o CHECK ainda tem
6 valores, o trigger não existe, e o smoke está deliberadamente RED contra o banco atual.**

1. **⚠ ORDEM ENTRE MIGRATIONS É OBRIGATÓRIA.** Esta migration **lê**
   `autorizacoes.autorizacao_marketing_vagas`, criada por `20260801000001` (plano 43-01).
   Aplicá-la antes **falha alto no `CREATE FUNCTION`** — e isso é o comportamento desejado, não
   um acidente a contornar. Ordem: `…0001` → `…0002` → `…0003`.
2. **Transcrever `>>> antes:`** no cabeçalho da migration, do
   `pg_get_constraintdef` **vivo** de `notificacoes_enviadas_evento_check`, **antes** do apply.
   Se o vivo carregar qualquer cláusula além da lista de eventos, **PARAR**: o `ADD CONSTRAINT`
   tem de preservá-la. Lição do 42-07 — o arquivo não é o objeto vivo.
3. **`apply_migration` de `20260801000003_p43_guard_marketing.sql`** — sem wrapper de transação.
4. **Reparo obrigatório do ledger** — `apply_migration` carimba uma `version` própria:
   ```sql
   UPDATE supabase_migrations.schema_migrations
      SET version = '20260801000003'
    WHERE name LIKE '%p43_guard_marketing%';
   ```
5. **Prova de fidelidade — obrigatória, e aqui a perda de comentário NÃO é benigna.**
   ```sql
   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
    WHERE version = '20260801000003';
   ```
   **Esperado: `baaa48a359cd65d5796f47fabd82b128`** (md5 do arquivo commitado em `5733e86`, na
   forma `printf '%s' "$(cat …)" | md5` — **sem** o newline final; com newline o md5 é
   `18d65dffd761f9e21b0efa1bc3e0405d`). Divergência ⇒ o que foi aplicado **não é este arquivo**.
   Os `COMMENT` deste arquivo são o único lugar **dentro do banco** onde vivem a declaração
   BD-5, o aviso de que `divulgacao_vagas` é reservado, e a razão de o guard ser trigger.
6. **Rodar `supabase/tests/p43_guard_marketing_smoke.sql` numa ÚNICA chamada `execute_sql`.**
   Gate verde = **9 PASS** no RESUMO (z). Menos que 9 é run parcial e **não** deve ser tratado
   como verde.
7. **Registrar o número de multiplicidade** que o FIXTURE emite em NOTICE (candidatos com mais
   de uma linha em `autorizacoes`).
8. **Transcrever `>>> depois:`** com o `pg_get_constraintdef` resultante.

Este plano **não** tem dependência de deploy de Edge Function: nenhum código TypeScript foi
tocado, e `divulgacao_vagas` deliberadamente **não** entra em `EVENTO_MAP`.

## Requirements — deliberadamente NÃO marcados como completos

`CONSENT-03` e `CONSENT-04` constam no frontmatter do plano, e o fluxo GSD os marcaria `[x]`
automaticamente. **Isso seria falso**, pelo mesmo motivo registrado na deviação 5 do 43-01:
enquanto a migration não for aplicada, **o guard não existe** — o opt-out de marketing continua
sendo exatamente a promessa órfã que esta fase existe para eliminar. `requirements
mark-complete` **não foi executado** por este plano; os requirements devem ser fechados pelo
verificador da fase, depois do checkpoint 43-07.

## Known Stubs

Nenhum. Os três artefatos são deliberadamente **não-aplicados** — não são stubs, são entrada do
checkpoint 43-07, e este SUMMARY declara isso em seção própria. O smoke está deliberadamente RED
contra o banco atual: ele é a **especificação** da migration, não um relatório dela, e se a
implementação divergir corrige-se a implementação.

`divulgacao_vagas` **não é stub**: é vocabulário reservado com **guard vivo**, e a diferença é
substantiva. Um stub é código que finge funcionar; este é um valor cuja única função é ser
**recusado**, e a recusa é o comportamento entregue. O `COMMENT ON TABLE` e a §3 de
`docs/compliance/marketing-consentimento-escopo.md` dizem isso por extenso.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>` do plano. As sete mitigações previstas foram
implementadas:

| Threat | Como ficou |
|--------|-----------|
| T-43-21 (envio de marketing sem consentimento) | guard `BEFORE INSERT` fail-closed para ausência/NULL/classe desconhecida; asserções (a), (b) e (f) provam por escrita real |
| T-43-22 (guard contornado por emissor novo) | o guard vive no banco, no ponto de estrangulamento; `service_role` não bypassa trigger. Razão escrita no `COMMENT ON FUNCTION` |
| T-43-23 (CHECK perdendo valor vivo no DROP/ADD) | bloco `DO` que itera os **6** valores vivos e aborta o apply à primeira ausência, + exige exatamente 1 CHECK sobre `evento` |
| T-43-24 (PII na mensagem de exceção) | o `RAISE` nomeia evento e motivo; o guard não lê coluna de contato. Declarado no comentário do BLOCO D |
| T-43-25 (EXECUTE residual em função DEFINER) | `REVOKE ALL … FROM PUBLIC, anon, authenticated` nas **duas** funções, sem `GRANT` de volta; asserção (g) mede o `proacl` |
| T-43-26 (envio real disparado pelo smoke) | toda escrita em subtransação revertida + asserção (i) de zero linhas novas em `net._http_response`; a recusa é anterior ao `fetch` por construção |
| T-43-SC (instalação de pacotes) | zero pacote npm, zero extensão Postgres nova |

## Commits

| # | Hash | Tipo | Conteúdo |
|---|------|------|----------|
| 1 | `5733e86` | feat | Task 1 (tracer) — os 4 blocos: consentimento fail-closed, classe como dado, CHECK 6→7 com bloco DO, guard `BEFORE INSERT` |
| 2 | `85ec043` | test | Task 2 — smoke gate-GUC com 9 asserções, cinco negativas + o caminho positivo |
| 3 | `9ba5366` | docs | Task 3 — o escopo honesto do SC#2 e a declaração BD-5 quantificada |

## Self-Check: PASSED

Os três arquivos criados existem em disco; os três hashes de commit existem em `git log`.
Verificado após a escrita deste arquivo.
