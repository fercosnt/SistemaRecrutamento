---
phase: 46-purga-autom-tica-dry-run-live
plan: 02
subsystem: database
tags: [postgres, plpgsql, lgpd, retencao, purga, ledger, tracer, supabase, prod-write]
status: complete

requires:
  - phase: 43-previa-retencao
    provides: "public.candidaturas_alem_da_janela() — a UNICA definicao do predicado — e a matriz public.config_retencao_etapa"
  - phase: 45-motor-exclusao
    provides: "a disciplina de proveniencia de md5 e o envelope de subtransacao revertida por RAISE"
  - phase: 46-purga-autom-tica-dry-run-live
    plan: 01
    provides: "o conjunto elegivel NAO-VAZIO vivo em PROD (7 candidaturas / 6 titulares apos a allowlist)"
provides:
  - "public.config_purga — o cerco (modo · cap · janela do RETEN-05), singleton por construcao, semeado em modo 'off'"
  - "public.config_retencao_etapa.elegivel_purga — a allowlist de D-46-19 como DADO"
  - "public.purga_execucoes + public.purga_execucao_itens — o ledger de duas tabelas, sem PII por construcao"
  - "public.candidaturas_alem_da_janela() estendida — 6 colunas, escada em LATERAL calculada uma vez, clausula elegivel_purga"
  - "public.titulares_alem_da_janela() — o alvo REAL da purga (D-46-11)"
  - "public.varrer_purga_retencao() — a varredura completa, sem capacidade destrutiva"
  - "supabase/tests/p46_purga_smoke.sql — 5 assercoes + resumo, todas nao-vacuas, VERDE em PROD"
  - "p43_previa_smoke.sql re-pinado (e) e emendado (f) 2->3 e (g) 3->4 — VERDE em PROD"
  - "As QUATRO migrations APLICADAS em PROD em 2026-08-23, com md5 conferido dos dois lados"
  - "Via de apply NOVA: Management API do Supabase, com o SQL lido do arquivo byte a byte — a version nasce correta e nao ha reparo de schema_migrations a fazer"
  - "p43_matriz_retencao_smoke.sql (j) consertado: comparacao por impressao digital capturada na fixture, em vez de valores de seed literais"
affects: [46-03, 46-04, 46-05, 46-06, 46-07]

actuals:
  tokens: 48916
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - "Singleton por construcao: id boolean PRIMARY KEY DEFAULT true + CHECK (id) — a segunda linha e INEXPRIMIVEL, nao improvavel"
    - "Escada de COALESCE num CROSS JOIN LATERAL que devolve o par (origem, em): o WHERE filtra pelo MESMO instante que a saida relata"
    - "Ledger cujo identificador NAO tem FK, com o silencio da FK justificado por escrito"
    - "Claim anti-sobreposicao por item ABERTO (concluido_em IS NULL), exercitado por fixture plantada em vez de deixado como dead code"
    - "Smoke que MEDE dentro do envelope e JULGA fora dele, porque set_config e transacional"

key-files:
  created:
    - supabase/migrations/20260823000001_p46_config_purga.sql
    - supabase/migrations/20260823000002_p46_ledger.sql
    - supabase/migrations/20260823000003_p46_predicado_titular.sql
    - supabase/migrations/20260823000004_p46_sweep_tracer.sql
    - supabase/tests/p46_purga_smoke.sql
  modified:
    - supabase/tests/p43_previa_smoke.sql
    - supabase/tests/p43_matriz_retencao_smoke.sql
    - database.types.ts

key-decisions:
  - "O apply deixou de ser por MCP e passou a ser pela Management API do Supabase com o SQL lido do arquivo byte a byte — foi o transporte por transcricao que fez 2 das 5 migrations do M8 chegarem a PROD sem comentarios"
  - "O cap e avaliado ANTES do kill switch: um conjunto grande demais e sinal de predicado quebrado, e o operador precisa dele mesmo com a purga desligada. Nada fica mascarado porque modo_vigente vai na mesma linha"
  - "Config ausente e fail-closed com cabecalho 'abortada', e nao 'seguir com o padrao'"
  - "A falha de um titular vira LINHA DE LEDGER e nao apenas RAISE WARNING — WARNING nao marca o job como failed nem chega ao return_message"
  - "O smoke MEDE dentro do envelope e JULGA fora: set_config(...,false) e TRANSACIONAL e seria revertido pelo rollback"
  - "O envelope do smoke existe tambem para impedir o teste de fabricar as >= 14 execucoes de ledger que D-46-14 exige como evidencia real"
  - "Item ABERTO plantado deliberadamente para exercitar o NOT EXISTS anti-sobreposicao — sem isso ele seria dead code, a classe do P39/CR-02"

requirements-completed: []  # nenhum fecha aqui — ver §Requirements

metrics:
  duration: ~95min
  completed: 2026-08-23
---

# Phase 46 Plan 02: A espinha da purga — Summary

A espinha inteira da purga existe e foi exercitada em PROD — config → ledger → predicado por
titular → varredura — **sobre um conjunto NÃO-VAZIO, sem apagar nada**. Nenhuma capacidade
destrutiva foi criada: a varredura não chama o motor, não lê o Vault e não despacha.

**O contrato de não-vacuidade foi CUMPRIDO: `candidaturas_alem_da_janela()` caiu de 7 para 6**, e
caiu pelo motivo certo.

## Task Commits

| Task | Nome | Commit |
|------|------|--------|
| 1a | `config_purga` + `elegivel_purga` + ledger de duas tabelas | `ab102fc` |
| 1b | Predicado estendido + `titulares_alem_da_janela`, **com as 3 emendas do smoke da 43** | `48d76f0` |
| 1c | `varrer_purga_retencao` — a varredura que não apaga nada | `1fccec5` |
| 2 | `p46_purga_smoke.sql` — a espinha aferida sobre conjunto não-vazio | `b6200fd` |
| — | SUMMARY + STATE + ROADMAP (checkpoint) | `5bcc416` |
| 3a | Emenda a `p43_matriz_retencao_smoke.sql` (j) — achado do checkpoint, ver §Achado herdado | `c0e90f3` |
| 3b | Apply em PROD + `database.types.ts` + escrituração | `<este commit>` |

Zero `--no-verify` nos sete commits: o hook de type-check rodou em todos e reportou 96 erros, que é
o baseline congelado registrado no `46-01-SUMMARY.md`.

## ⚠ A VIA DE APPLY MUDOU, e a mudança fecha um defeito medido

Os planos anteriores aplicavam por MCP `apply_migration`. **Aquele transporte exige que o agente
TRANSCREVA o SQL como string na chamada da ferramenta** — e foi exatamente por aí que **duas das
cinco migrations do M8 chegaram a PROD com os comentários descartados**, defeito registrado no
cabeçalho de toda migration desde a Phase 42.

A partir deste plano o apply é pela **Management API do Supabase**
(`POST /v1/projects/{ref}/database/query`, token no Keychain sob serviço `Supabase CLI` / conta
`supabase`), com o SQL **lido do arquivo byte a byte**. Três propriedades novas, todas medidas:

1. **A `version` nasce correta.** ⚠ **Não há mais `UPDATE supabase_migrations.schema_migrations SET
   version = …` a fazer** — a instrução de reparo que o cabeçalho das quatro migrations deste plano
   carrega ficou **obsoleta no instante em que foi escrita**, e não deve ser propagada aos planos
   46-03 a 46-07.
2. **`statements[1]` recebe o conteúdo exato**, então o md5 bate **por construção** — e ainda assim
   foi conferido por leitura de volta, porque "bate por construção" é uma afirmação sobre o
   mecanismo e não uma medição.
3. **O endpoint roda o corpo inteiro numa transação só** (medido): migration e linha de ledger caem
   juntas ou não caem. Não existe o estado meio-aplicado.

### Os quatro applies — md5 dos DOIS lados, medidos independentemente

| Migration | `version` | md5 do ARQUIVO (shell, ANTES do apply) | md5 de `statements[1]` (lido DEPOIS) | bytes |
|---|---|---|---|---|
| `p46_config_purga` | `20260823000001` | `888e7e5b93579bc81240658f438e6c6c` | **idem** | 22 344 |
| `p46_ledger` | `20260823000002` | `a54e9c2652750c3519fa1e97a6a69f85` | **idem** | 27 316 |
| `p46_predicado_titular` | `20260823000003` | `98ec813660e8ec5f44822a6cd3234443` | **idem** | 23 742 |
| `p46_sweep_tracer` | `20260823000004` | `fb64ea752189a145f6e6bc1c2f56eb79` | **idem** | 27 773 |

Os quatro batem. Nenhum comentário se perdeu — e como os `COMMENT ON` destas migrations são o único
lugar DENTRO DO BANCO onde estão escritas a lacuna nomeada de D-46-19 e a justificativa de retenção
indefinida de D-46-16, essa fidelidade não é cosmética.

### O re-pin de (e) — FECHADO, com os dois lados medidos por partes independentes

| Lado | Valor | Octetos | Quem mediu |
|---|---|---|---|
| **ARQUIVO** | `6df3564414519abc56379d9b8924fad0` | 1 357 | executor, por execução do comando de recomputação, ANTES do apply |
| **VIVO** (`md5(prosrc)` de `pg_proc`) | `6df3564414519abc56379d9b8924fad0` | 1 357 | orquestrador, DEPOIS do apply |

Idênticos. Valor anterior `ddfa6542921d241323c0124fc1bd1f99` (775 octetos, vigente de 2026-08-01 a
2026-08-23), preservado no bloco de PROVENIÊNCIA como histórico. **A rede estrutural cresceu de 3
para 5 checagens e não perdeu nenhuma.**

## O contrato de não-vacuidade — CUMPRIDO, e pelo motivo certo

**`candidaturas_alem_da_janela()`: 7 → 6.** **`titulares_alem_da_janela()`: 6.**

| `slug#sufixo` | Antes do 46-02 | Depois | O que isso prova |
|---|---|---|---|
| `pos1#01` | ✓ | ✓ | degrau (1) da âncora, etapa `aprovado` na allowlist |
| `pos2#02` | ✓ | ✓ | degrau (2), etapa `decisao_final` na allowlist |
| `pos3#03` | ✓ | ✓ | degrau (3), etapa `rejeitado` na allowlist |
| `cap2#04` | ✓ | ✓ | há 2+ elegíveis — a prova do cap (D-46-08) é fazível reduzindo o cap por RPC |
| `neg-hold#05` | ✓ | ✓ | correto AGORA, **errado depois do 46-03** |
| `neg-vaga#06` | ✓ | ✓ | correto AGORA, **errado depois do 46-03** |
| **`neg-etapa#08`** | **✓** | **✗** | ⊖ **a cláusula `m.elegivel_purga` MORDEU**: `entrevista_online` está fora da allowlist |
| `neg-art20#07` | ✗ | ✗ | a exceção do Art. 20 continua valendo depois do `DROP`+`CREATE` |
| `neg-etapa#09` | ✗ | ✗ | dentro da janela — e é por ela que o titular `…-008` não aparece em `titulares_alem_da_janela()` |

**Exatamente uma linha caiu, e foi a nomeada.** Não foi "o número baixou" — foi `neg-etapa#08`, pela
etapa, com as outras seis intactas. Um número que caísse por outro motivo teria passado por um
critério de contagem e reprovado neste.

**Allowlist gravada em PROD:** `aprovado`/`rejeitado`/`decisao_final` = `true`; os outros cinco =
`false`. **`config_purga`:** linha única, `modo = 'off'`, `cap_titulares = 50`,
`janela_notificacoes_meses = 24`.

## A prova do tracer — não-vacuosa, e sem apagar nada

| Execução | `modo_vigente` | `elegiveis` | `processados` | `veredito` | itens no ledger |
|---|---|---|---|---|---|
| 1ª | `dry_run` | **6** | **0** | `dry_run` | **6** |
| 2ª | `off` | **6** | **0** | `desligado` | 0 |

⊖ **As negativas, antes × depois:** `candidatos` 31→31 · `candidaturas` 20→20 ·
`historico_candidatura` 13→13 · `decisao_final` 3→3 · `auth.users` 37→37 · `net._http_response`
0→0. **Modo final: `off`.**

O kill switch foi provado **desligando de verdade**, sobre 6 elegíveis — não por leitura de config e
não sobre conjunto vazio (D-46-09 / SC#3). As **2 execuções** ficaram commitadas e contam para o
critério de ≥ 14 de D-46-14.

⚠ **Ressalva de método, registrada porque a alternativa é silêncio:** as duas execuções têm o mesmo
`iniciada_em`, porque rodaram na mesma transação e `now()` é escopado a ela. **É artefato do teste,
não do código** — sob cron cada execução é sua própria transação. É a mesma propriedade que o smoke
já contorna identificando a linha nova por diferença de conjunto de ids, e nunca por `ORDER BY
iniciada_em`.

## Os cinco smokes

| Smoke | Resultado |
|---|---|
| `p46_purga_smoke.sql` (novo) | ✅ |
| `p43_previa_smoke.sql` (re-pinado + 2 emendas) | ✅ — **as três emendas seguram** |
| `p45_motor_exclusao_smoke.sql` | ✅ |
| `p42_invent05_cron_smoke.sql` | ✅ — ainda 3 jobs, o 4º só nasce no 46-06 |
| `p43_matriz_retencao_smoke.sql` | ❌ **REPROVOU** → consertado em `c0e90f3`, ver abaixo |

## Achado herdado — a asserção (j) do smoke da matriz reprovava o RETEN-02 FUNCIONANDO

**Não é defeito deste plano nem da Phase 46**, e é por isso que fica escrito aqui.

A asserção (j) de `p43_matriz_retencao_smoke.sql` media a matriz contra os **valores de seed
literais** (`origem = 'seed' AND janela_meses = 24 AND alterado_por IS NULL`) e acusava *"a política
de retenção de PROD ficou com valor de teste"*. **A acusação era falsa.** A linha `rejeitado` está
em 18 meses, `origem = 'admin'`, com ator preenchido, porque **um administrador editou a janela pela
tela** — ou seja, porque o RETEN-02 funciona.

⚠ **O portão já estava vermelho antes de qualquer apply desta fase**: `46-01-MEDICOES.md` §M5 mediu
esse estado às 18:45 de 2026-08-22. Ele ficou vermelho no instante exato em que o primeiro
administrador usou a funcionalidade que a Phase 43 entregou — e com uma mensagem de falha que dava
**diagnóstico falso**.

O conserto trocou a comparação por **impressão digital** (`to_jsonb` da linha inteira) capturada na
FIXTURE, que é o mesmo idioma que as duas comparações de contagem do próprio (j) já usavam e que não
envelhece. Provado por execução que ainda **morde**: uma mutação dentro da subtransação muda a
digital e a asserção reprova; o rollback a reverte.

## Lessons

**Instantâneo travestido de invariante é a forma de defeito recorrente desta fase, e esta foi a
TERCEIRA ocorrência.** As três, em ordem de descoberta:

| # | Portão | Instantâneo travado | Quem o quebraria |
|---|---|---|---|
| 1 | `p42_invent05_cron_smoke.sql` (a) | `cron.job` tem exatamente **3** | o 4º job legítimo do 46-06 (D-46-23) |
| 2 | `p43_previa_smoke.sql` (f) e (g) | lista LITERAL de 2 e de 3 `proname` | o wrapper novo — que **não reprovaria**, só ficaria fora da vigilância |
| 3 | `p43_matriz_retencao_smoke.sql` (j) | valores de **seed** literais | um administrador usando a tela do RETEN-02 |

A forma é sempre a mesma: **um valor medido num dia vira uma asserção de igualdade, e a asserção
passa a proibir a evolução legítima do sistema.** Os três consertos também são a mesma coisa —
trocar a igualdade contra um literal por uma comparação contra algo **capturado no próprio run**
(digital da fixture, baseline da sessão) ou por um invariante nomeado (`existe exatamente 1 job de
purga E os 3 herdados continuam lá`), em vez de uma contagem nua.

E os dois modos de falha são assimétricos, o que torna o nº 2 o mais perigoso:
- (1) e (3) **reprovam trabalho correto com diagnóstico falso** — visível, mas treina quem executa a
  desligar o portão.
- (2) **não reprova nada**: o objeto novo simplesmente fica de fora e o portão continua verde. **Um
  portão que não enxerga o objeto novo é pior que um portão vermelho, porque parece verde.**

## Tipos

`npm run db:types` regenerado: **+188 linhas**, com `config_purga`, `purga_execucoes`,
`purga_execucao_itens` e `elegivel_purga` presentes. `npm run lint` = **96 erros — igual ao baseline
congelado**, não subiu.

## Accomplishments

### As quatro migrations, uma por camada

**`20260823000001_p46_config_purga.sql`** — `elegivel_purga` entra na matriz em forma PURA (sem a
variante condicional que é a causa medida do drift de `candidatos.user_id`), com `UPDATE` nominal
nas três etapas da allowlist. O `COMMENT ON COLUMN` escreve DENTRO DO BANCO a **lacuna nomeada** de
D-46-19: rascunho e candidatura parada em funil ativo ficam em estados fora da allowlist, logo
retenção indefinida DECLARADA. `config_purga` nasce singleton por construção — `id boolean PRIMARY
KEY DEFAULT true` mais `CHECK (id)` tornam a segunda linha *inexprimível*, não meramente improvável
— com RLS ligada, uma policy de SELECT admin-only, zero policy de escrita, e seed em `modo = 'off'`.

**`20260823000002_p46_ledger.sql`** — as duas tabelas, 23 colunas somadas, nenhuma de PII.
`candidato_id` sem FK, com o silêncio justificado por escrito: CASCADE apagaria a prova junto com o
fato, RESTRICT impediria a purga de concluir, SET NULL destruiria a única coluna que responde
"quem". Três índices, dos quais um é o caminho quente do claim anti-sobreposição
(`WHERE concluido_em IS NULL`). A retenção indefinida do próprio ledger (D-46-16) tem a
justificativa escrita no `COMMENT ON TABLE`, porque "retenção sem prazo e sem razão escrita" é
literalmente o que o RETEN-05 existe para eliminar.

**`20260823000003_p46_predicado_titular.sql`** — `DROP`+`CREATE` (o `RETURNS TABLE` não é
substituível em lugar), assinatura de 3 para 6 colunas, e a escada da data-âncora movida para um
`CROSS JOIN LATERAL` que a calcula **uma vez**: o `WHERE` compara o MESMO `a.em` que a lista de saída
devolve. O `max(criado_em)` do histórico é avaliado num primeiro `LATERAL`, e tanto o `CASE` que
nomeia a origem quanto o `COALESCE` que resolve o instante leem esse mesmo valor —
`grep -c 'COALESCE'` fora de comentário retorna **1**, aferido. `titulares_alem_da_janela()` copia
verbatim a forma de agrupamento que `previa_retencao_total()` já implementava, e **não referencia
`config_retencao_etapa`** (aferido pelo `awk` sobre o corpo entre os delimitadores).

**`20260823000004_p46_sweep_tracer.sql`** — a varredura em oito passos, com o cap abortando integral
e sem `LIMIT` no corpo, o heartbeat gravado em toda execução, e o kill switch contando os elegíveis
ANTES de retornar (porque D-46-09/SC#3 proíbem prova por leitura de config).

### O smoke da fase, e a assunção que ele derruba

`p46_purga_smoke.sql`, 5 asserções mais o resumo. **Toda asserção reprova explicitamente quando
`elegiveis = 0`**, com a mensagem nomeando esse caso.

A asserção **(claim)** não estava no plano e é o acréscimo mais valioso do arquivo: ela **planta um
item ABERTO** para `pos1` e mede que a passada seguinte cai de N para N−1 e não re-seleciona `pos1`.
Sem ela o `NOT EXISTS` anti-sobreposição da varredura seria **dead code** — no caminho feliz nunca há
item aberto —, que é a mesma classe do P39/CR-02 e a mesma lição que `neg-art20` acabou de dar no
plano 46-01.

### As três emendas obrigatórias em `p43_previa_smoke.sql`

No **mesmo commit** da migration que as obriga (`48d76f0`):

| Emenda | Antes | Depois |
|---|---|---|
| (e) pin de `md5(prosrc)` | `ddfa6542921d241323c0124fc1bd1f99` (775 octetos) | `6df3564414519abc56379d9b8924fad0` (1357 octetos) |
| (e) rede estrutural | 3 checagens | **5** — entraram `elegivel_purga` e `ancora_origem` |
| (f) wrappers vigiados | 2, `v_checadas <> 2` | **3**, `v_checadas <> 3` |
| (g) funções na negativa de escrita | 3 | **4** |

O valor antigo continua citado no bloco de PROVENIÊNCIA como histórico — é o que torna o re-pin
auditável. **A rede só cresceu.**

⚠ **Por que (f) e (g) não são cosmética, e o plano-checker estava certo:** as duas iteram sobre
listas LITERAIS de `proname` e exigem contagem exata. Um objeto novo **não as faz reprovar** — ele
simplesmente fica de fora, e o portão continua verde enquanto o único wrapper que a purga realmente
consome fica sem vigilância. Um portão que não enxerga o objeto novo é pior que um portão vermelho:
ele parece verde.

## O achado do plano — o re-pin quase foi extraído do lugar errado

O comando de recomputação do md5 (`p45_motor_exclusao_smoke.sql:852-858`) localiza o corpo por
`indexOf` do delimitador. A primeira versão da `20260823000003` **mencionava
`$` + `candidaturas_alem_da_janela` + `$` num comentário de cabeçalho**, 140 linhas acima do
`CREATE FUNCTION`. O `indexOf` teria casado o comentário e extraído como "corpo" um trecho de prosa
— produzindo um pin que não bateria com o objeto vivo, e cuja divergência seria diagnosticada como
"o objeto divergiu" em vez de "a extração está errada".

Foi encontrado ANTES de computar o pin, o comentário foi reescrito, e a armadilha ficou registrada
no bloco de PROVENIÊNCIA do smoke. É exatamente a "divergência de EXTRAÇÃO" que aquele bloco já
descrevia em abstrato — agora ela tem um caso concreto e uma defesa.

## Deviations from Plan

### [Rule 1 - Bug] O critério de ordenação do envelope produziria um smoke quebrado

O plano pedia, como critério de aceite, que *"o número da linha do `RAISE … 'P46B0'` seja **maior**
que o do último `set_config('smoke46p.pass'` de asserção"* — ou seja, que os incrementos do contador
ficassem DENTRO do envelope.

**Isso produziria um smoke que reprova em toda execução com o motor certo.** `set_config(name,
value, false)` é **transacional**: um incremento feito dentro da subtransação é desfeito pelo
rollback do `P46B0`, e o RESUMO (z) leria **0** num run perfeito — reproduzindo com precisão a
patologia que o próprio plano cita como lição nº 6 da Phase 45.

O precedente vivo confirma: `p45_motor_exclusao_smoke.sql` levanta `P45B0` na linha **1061** e
incrementa o contador a partir da **1081**, com o comentário de `:957-964` explicando por quê. A
lição correta é *"nenhuma asserção é **MEDIDA** depois do rollback"*, e a separação é entre **medir**
(dentro, para variáveis plpgsql, que o rollback não reverte) e **julgar** (fora, sobre variáveis).

**O que foi feito:** adotada a forma do p45. Verificado mecanicamente que, das linhas 507 a 682, não
há **uma única consulta viva** — o único casamento de `FROM public.` é dentro de uma string de
mensagem de erro. A asserção (h) é catalogal e fica inteiramente fora do envelope.
**Commit:** `b6200fd`.

### [Rule 3 - Bloqueio] Dois portões estáticos reprovavam a própria prosa do cabeçalho

`grep -c 'BEGIN;'` e `grep -ci 'ADD COLUMN IF NOT EXISTS'` casavam os **comentários** que explicam
por que essas formas não são usadas — a frase herdada do analog *"Sem wrapper `BEGIN;/COMMIT;`"* e o
item de proveniência *"NÃO foi copiado o `ADD COLUMN IF NOT EXISTS`"*. Os portões teriam reprovado
migrations corretas por causa da documentação que as torna revisáveis. Prosa reescrita nas quatro
migrations, sem perder o conteúdo. **Commits:** `ab102fc`, `48d76f0`, `1fccec5`.

### [Rule 2 - Funcionalidade crítica ausente] Guarda contra a temporária pré-existente

O smoke chama `varrer_purga_retencao()` **três vezes dentro da mesma transação**, e `ON COMMIT DROP`
só dispara no commit — a segunda chamada falharia com "relation already exists". Acrescentado
`IF pg_catalog.to_regclass('pg_temp.tmp_purga_alvos') IS NOT NULL THEN DROP TABLE …`, e todas as
referências à temporária qualificadas com `pg_temp.` (com `search_path = ''` a resolução implícita do
schema temporário é sutil demais para um corpo que decide quem é apagado). **Commit:** `1fccec5`.

### [Rule 2] Fail-closed quando `config_purga` está vazia

O plano não previa o caso. Um `SELECT … INTO` sobre tabela vazia deixaria `v_modo` NULL e a execução
seguiria por um caminho indefinido. Agora grava cabeçalho com `modo_vigente = 'ausente'`,
`situacao = 'abortada'`, e retorna. **Commit:** `1fccec5`.

### [Rule 2] A falha de um titular vira linha de ledger, não só `RAISE WARNING`

Divergência já prevista na `46-RESEARCH.md` §Code Examples e implementada: o handler grava um item
com `desfecho_postgres = 'falha'`, dentro de um envelope próprio para que não conseguir registrar
também não derrube a varredura. **Commit:** `1fccec5`.

### [Rule 2] A asserção `(claim)` — um guard que seria dead code

Ver §"O smoke da fase". O plano marcava essa propriedade como `verification: backstop`; foi
convertida em asserção executada porque o custo eram 12 linhas e o benefício é exercitar, pela
primeira vez, o `NOT EXISTS` que impede a purga de processar alguém duas vezes. **Commit:** `b6200fd`.

### [Rule 1] Três critérios de aceite do plano eram mutuamente inconsistentes com o texto

- `grep -c "'previa_retencao', 'previa_retencao_total', 'titulares_alem_da_janela'"` exigia **1**,
  mas a emenda (g) listaria os mesmos três nomes na mesma ordem, produzindo 2. A lista de (g) foi
  reordenada (`candidaturas_alem_da_janela`, `titulares_alem_da_janela`, `previa_retencao`,
  `previa_retencao_total`) — nenhum rigor perdido, e o portão volta a discriminar.
- `grep -ci 'conferencia'` retornava 0 porque a palavra estava acentuada. O rótulo do bloco de
  PROVENIÊNCIA foi escrito sem acento, como no molde do p45.
**Commit:** `48d76f0`.

### [Desvio de estrutura] Quatro commits para duas tasks

A Task 1 foi partida em três commits porque a Task 2 exige que as emendas do `p43_previa_smoke.sql`
estejam **no mesmo commit** da migration que as obriga. `48d76f0` carrega a migration do predicado e
as três emendas juntas; as outras três migrations ficaram em commits próprios, na ordem de
dependência.

## Known Stubs

| Stub | Arquivo | Razão | Resolvido por |
|---|---|---|---|
| `varrer_purga_retencao()` não chama `anonimizar_candidato` | `20260823000004:…` (bloco `(g)`) | Deliberado e declarado no escopo negativo: a metade (a) do guard daquele motor recusa chamador sem sessão, e um cron não tem sessão (medido em PROD 2026-08-22). O laço, a subtransação, o carimbo de `concluido_em` e `relato_dry_run` já nascem no formato final | **46-04** (D-46-18 / D-46-24) — acrescenta uma CHAMADA dentro de um `BEGIN … EXCEPTION` que já existe |
| `relato_dry_run` nasce sempre NULL | idem | Só há o que relatar quando o motor for chamado | **46-04** |
| `notificacoes_expurgadas` nasce sempre 0 | `20260823000002` | A regra independente de RETEN-05 ainda não existe | **46-07** |
| `config_purga.janela_notificacoes_meses` sem leitor | `20260823000001` | Coluna nasce agora para não exigir retrofit sobre tabela viva na fase de maior risco | **46-07** |
| Vocabulários `despachado` e `segredo_ausente` no `CHECK` sem escritor | `20260823000002` | Mesmo motivo | **46-05**/**46-06** |
| `neg-hold#05` continua elegível | herdado do 46-01 | `public.retencao_hold` ainda não existe | **46-03**, que TEM de inserir a linha de hold para `4601c000-0000-4000-8000-000000000005` |

## Requirements

**`requirements-completed` fica VAZIO de propósito.** O frontmatter do plano declara
`[PURGA-02, PURGA-03, PURGA-05, PURGA-06]`, e **nenhum dos quatro fecha aqui** — marcá-los seria a
promessa-sem-código que o CONSOL-04 audita:

- **PURGA-02** ("o dry-run sai da MESMA expressão do delete real") está satisfeito **por
  construção** para os wrappers, e a asserção (f) do smoke da 43 agora vigia os TRÊS. Mas o `DELETE`
  real ainda não existe — o requirement só é observável quando houver um caminho destrutivo para
  comparar, e ele nasce no **46-04**.
- **PURGA-03** ("primeira ativação em dry-run por período documentado") exige os **14 dias corridos**
  com ledger não-vazio. Este plano entregou 2 execuções das ≥ 14. Fecha no **46-07**.
- **PURGA-05** tem as duas metades: o kill switch foi provado desligando de verdade sobre conjunto
  não-vazio ✅, mas o **cap ainda não foi exercitado** — a asserção (g) do smoke, que reduz o cap por
  RPC e prova o aborto integral, depende da RPC do **46-07**.
- **PURGA-06** ("o que foi apagado, sob qual política") tem o ledger e as asserções (h) e (i) verdes,
  mas nada foi apagado ainda — a coluna `relato_dry_run` nasce nula e os três desfechos ficam em
  `nao_aplicavel`. Fecha quando o motor for chamado, no **46-04**.
- **PURGA-07** ganhou a allowlist como DADO e **ela mordeu por execução** (7 → 6), mas as outras três
  exceções chegam no **46-03**.

⚠ A tentação aqui era marcar PURGA-05 e PURGA-06 como completos: as duas asserções que os
representam estão verdes. Mas "a asserção passou" e "o requirement fechou" são coisas diferentes
quando a asserção cobre metade do requirement — e é essa diferença que o CONSOL-04 audita.

## Verification

| Critério | Estado |
|---|---|
| Os 4 arquivos existem com os nomes exatos | ✅ |
| Nenhum abre transação explícita (`grep -c 'BEGIN;'`) | ✅ 0/0/0/0 |
| Nenhum usa delimitador de cifrão anônimo | ✅ 0 nas quatro |
| Nenhuma coluna acrescentada de forma condicional | ✅ 0 |
| Nenhuma negação por pertencimento a conjunto fora de comentário | ✅ 0 nas quatro |
| `REVOKE` nomeia `anon` nas funções novas/recriadas (m3 `>= 2`) | ✅ 2 |
| `COALESCE` aparece **uma** vez no código executável de m3 | ✅ 1 |
| `titulares_alem_da_janela` não relê a matriz (`awk` sobre o corpo) | ✅ 0 |
| m4 não recorta pelo cap (`LIMIT v_cap`) | ✅ 0 |
| m4 lê a config com bloqueio de linha (`FOR UPDATE`) | ✅ 3 |
| m4 não despacha (`net.http_post` fora de comentário) | ✅ 0 |
| Os 5 vereditos e as 3 situações no `CHECK`, verbatim | ✅ 1 |
| `p46_purga_smoke.sql` inicializa o contador | ✅ 1 |
| Letras (c)(f)(h)(i) rotuladas em coluna 0 | ✅ 4 |
| Envelope termina em `ERRCODE = 'P46B0'` | ✅ 1 |
| ⊖ Nenhuma asserção **medida** depois do rollback | ✅ zero consulta viva após a linha 506 |
| Banlist de PII por fronteira/igualdade, zero `strpos` nu | ✅ 0 `strpos` |
| (e) re-pinado, valor antigo fora da atribuição e presente na PROVENIÊNCIA | ✅ 0 / 1 |
| (e) não afrouxado (`v_tem_*` `>= 5`) | ✅ 13 casamentos |
| (f) exige 3 wrappers | ✅ 1 / 1 |
| (g) exige 4 funções | ✅ 1 |
| `npm run lint` | ✅ 96 erros — baseline congelado inalterado, antes E depois do `db:types` |
| `npm run test:run` | ✅ 188 arquivos, 1895 testes |
| Zero `--no-verify` | ✅ hook rodou nos 7 commits |
| As 4 migrations aplicadas, `version` correta, sem buracos | ✅ `20260823000001`–`04` |
| Os 4 pares de md5 (arquivo × `statements[1]`) | ✅ os 4 batem, **os dois lados registrados** |
| Re-pin de (e) com os dois lados medidos | ✅ `6df35644…`, 1357 octetos, vivo == arquivo |
| `database.types.ts` contém as 3 tabelas e a coluna novas | ✅ +188 linhas |
| Os 5 smokes verdes | ✅ 4 de primeira; o 5º (`p43_matriz_retencao`) consertado em `c0e90f3` |
| ⊖ `dry_run`: `elegiveis >= 3`, `processados = 0`, `veredito='dry_run'` | ✅ **6 / 0 / dry_run**, 6 itens |
| ⊖ `off`: `elegiveis >= 3`, `processados = 0`, `veredito='desligado'` | ✅ **6 / 0 / desligado**, 0 itens |
| ⊖ As 5 contagens de domínio idênticas antes e depois | ✅ 31/20/13/3/37 → idem |
| ⊖ `net._http_response` sem linha nova | ✅ 0 → 0 |
| **⊖ `candidaturas_alem_da_janela()` 7 → 6, e cai `neg-etapa#08`** | ✅ **cumprido, e pelo motivo certo** |
| `config_purga.modo` fica em `'off'` ao final | ✅ |

## Self-Check: PASSED

- `supabase/migrations/20260823000001_p46_config_purga.sql` — FOUND
- `supabase/migrations/20260823000002_p46_ledger.sql` — FOUND
- `supabase/migrations/20260823000003_p46_predicado_titular.sql` — FOUND
- `supabase/migrations/20260823000004_p46_sweep_tracer.sql` — FOUND
- `supabase/tests/p46_purga_smoke.sql` — FOUND
- `supabase/tests/p43_previa_smoke.sql` — FOUND (modificado)
- `supabase/tests/p43_matriz_retencao_smoke.sql` — FOUND (modificado em `c0e90f3`)
- `database.types.ts` — FOUND (+188 linhas, com `config_purga` / `purga_execucoes` /
  `purga_execucao_itens` / `elegivel_purga`)

Commits `ab102fc`, `48d76f0`, `1fccec5`, `b6200fd`, `5bcc416`, `c0e90f3` — todos FOUND em `git log`.

## Consequências medidas para os próximos planos

- **Todos (46-03 a 46-07):** ⚠ **NÃO propagar a instrução de reparo de
  `supabase_migrations.schema_migrations`.** Ela consta do cabeçalho das quatro migrations deste
  plano e ficou obsoleta no mesmo dia: pela Management API a `version` nasce correta. O cross-check
  de md5 CONTINUA valendo — ele é medição, não conserto.
- **46-03:** o número a derrubar é **6 → 4**, saindo `neg-hold#05` e `neg-vaga#06`. ⚠ E ele TEM de
  inserir a linha de `retencao_hold` para a candidatura `4601c000-0000-4000-8000-000000000005`:
  enquanto ela faltar, `neg-hold` é só mais uma candidatura elegível e a asserção (j.1) passaria por
  vacuidade. O predicado que ele edita é o do `20260823000003`, e **o pin `6df35644…` vai mudar de
  novo** — mesmo protocolo de conferência cruzada, e a rede estrutural de (e) só cresce.
- **46-04:** a lacuna está num lugar só, marcada no corpo de `varrer_purga_retencao` entre o `INSERT`
  do item e o `UPDATE` que o fecha. O `BEGIN … EXCEPTION` já existe; o plano acrescenta uma CHAMADA,
  não uma estrutura. E o bloco de auto-verificação daquele plano tem de abortar o apply se
  `authenticated` puder escrever em `purga_execucoes`/`purga_execucao_itens` — a partir de D-46-18, a
  segurança do guard destrutivo **é** a segurança dessas duas tabelas.
- **46-06:** `cron.job` continua com **3** jobs. A emenda de D-46-23 ao `p42_invent05_cron_smoke.sql`
  segue pendente e é a **primeira** das três ocorrências de "instantâneo travestido de invariante"
  desta fase — as outras duas já foram consertadas (ver §Lessons).
- **46-07:** das três linhas da allowlist, **duas seguem em `origem = 'seed'`** (`aprovado` e
  `decisao_final`). Marcar uma etapa como elegível **não é** um humano ter escolhido a janela dela, e
  confirmá-las continua sendo pré-condição do flip (D-46-22). O contador de D-46-14 está em **2**
  execuções.
