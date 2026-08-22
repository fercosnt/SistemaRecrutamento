---
phase: 46-purga-autom-tica-dry-run-live
plan: 02
subsystem: database
tags: [postgres, plpgsql, lgpd, retencao, purga, ledger, tracer, supabase, prod-write-pendente]
status: checkpoint

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
  - "supabase/tests/p46_purga_smoke.sql — 5 assercoes + resumo, todas nao-vacuas"
  - "p43_previa_smoke.sql re-pinado (e) e emendado (f) 2->3 e (g) 3->4"
affects: [46-03, 46-04, 46-05, 46-06, 46-07]

actuals:
  tokens: 47406
  tasks: 2
  commits: 4

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

key-decisions:
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

A espinha inteira da purga existe em ARQUIVO — config → ledger → predicado por titular →
varredura — e nenhuma capacidade destrutiva foi criada. **Nada foi aplicado em PROD**: o plano
para num checkpoint bloqueante porque subagentes GSD não recebem os tools MCP do Supabase
(`anthropics/claude-code#13898`) e `supabase db push` é proibido neste projeto.

## Task Commits

| Task | Nome | Commit |
|------|------|--------|
| 1a | `config_purga` + `elegivel_purga` + ledger de duas tabelas | `ab102fc` |
| 1b | Predicado estendido + `titulares_alem_da_janela`, **com as 3 emendas do smoke da 43** | `48d76f0` |
| 1c | `varrer_purga_retencao` — a varredura que não apaga nada | `1fccec5` |
| 2 | `p46_purga_smoke.sql` — a espinha aferida sobre conjunto não-vazio | `b6200fd` |
| 3 | ⏸ **BLOQUEADO** — apply pelo orquestrador, re-pin cruzado, execução dos smokes | — |

Zero `--no-verify`: o hook de type-check rodou nos quatro commits e reportou 96 erros nos quatro,
que é o baseline congelado registrado no `46-01-SUMMARY.md`.

## O contrato de não-vacuidade deste plano, em uma linha

**`candidaturas_alem_da_janela()` tem de cair de 7 para 6**, e quem sai é `neg-etapa#08`, que está
em `entrevista_online` — estado fora da allowlist de D-46-19. Um número que não cai é a cláusula
`m.elegivel_purga` falhando em silêncio, e nenhuma outra evidência substitui essa medição.

`titulares_alem_da_janela()` tem de devolver **6**: `pos1`, `pos2`, `pos3`, `cap2`, `neg-hold`,
`neg-vaga`. `neg-art20` sai pelo Art. 20; o titular de `neg-etapa` (`…-008`) tem uma segunda
candidatura DENTRO da janela (`neg-etapa#09`), que é exatamente o caso em que o agrupamento por
titular de D-46-11 morde.

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

- **PURGA-02/03/05/06** dependem de asserções que só rodam **depois do apply**, e o apply é a Task 3.
  Enquanto o checkpoint estiver aberto, o repositório compila e os testes passam **sem que uma linha
  do banco tenha mudado** — que é exatamente o falso verde que aquele portão existe para impedir.
- **PURGA-07** ganhou a allowlist como DADO, mas as outras três exceções chegam no **46-03**.

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
| `npm run lint` | ✅ 96 erros — baseline congelado inalterado |
| `npm run test:run` | ✅ 188 arquivos, 1895 testes |
| Zero `--no-verify` | ✅ hook rodou nos 4 commits |
| ⏸ Apply, re-pin cruzado, smokes, 7→6 | **PENDENTE — Task 3 / checkpoint** |

## Self-Check: PASSED

- `supabase/migrations/20260823000001_p46_config_purga.sql` — FOUND
- `supabase/migrations/20260823000002_p46_ledger.sql` — FOUND
- `supabase/migrations/20260823000003_p46_predicado_titular.sql` — FOUND
- `supabase/migrations/20260823000004_p46_sweep_tracer.sql` — FOUND
- `supabase/tests/p46_purga_smoke.sql` — FOUND
- `supabase/tests/p43_previa_smoke.sql` — FOUND (modificado)

Commits `ab102fc`, `48d76f0`, `1fccec5`, `b6200fd` — todos FOUND em `git log`.
