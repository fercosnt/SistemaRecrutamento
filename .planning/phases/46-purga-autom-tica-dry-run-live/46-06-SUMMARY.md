---
phase: 46-purga-autom-tica-dry-run-live
plan: 06
subsystem: database
tags: [postgres, plpgsql, pg_cron, pg_net, vault, lgpd, purga, retencao, smoke, portao, checkpoint]
status: checkpoint

requires:
  - phase: 46-purga-autom-tica-dry-run-live
    plan: 04
    provides: "o 4o ramo do guard (20260823000006), o 3o ramo de plano_exclusao_titular (20260823000008), a janela de 1 h de HI-03 e a RECONCILIACAO de execucoes vencidas — que este plano transforma na outra ponta do despacho assincrono"
  - phase: 46-purga-autom-tica-dry-run-live
    plan: 05
    provides: "reivindicar_item_purga / concluir_item_purga (20260823000010, APLICADA) e a EF purgar-retencao (v1 ACTIVE, verify_jwt=false) — o alvo do hop, e as duas exigencias que obrigam o item a ficar ABERTO e a execucao em executando"
  - phase: 41-notificacoes-retry
    provides: "20260727000001 — a leitora de Vault escopada a UM segredo, o par desagendar-guardado-por-existencia, e o molde do laco com dispatch isolado"
provides:
  - "supabase/migrations/20260823000011_p46_sweep_dispatch_e_reten05.sql — varrer_purga_retencao() v3: cofre + dispatch por titular no ramo live + RETEN-05 + a reescrita do COMMENT vivo de notificacoes_enviadas"
  - "supabase/migrations/20260823000012_p46_cron.sql — o 4o job, purga-retencao-sweep, 0 3 * * * UTC, corpo minimo"
  - "supabase/tests/p42_invent05_cron_smoke.sql (a) — INSTANTANEO -> INVARIANTE (D-46-23), no MESMO commit que cria o job"
  - "supabase/tests/p46_purga_smoke.sql — assercoes (a), (g), (m), (n); RESUMO (z) 21 -> 25"
  - "docs/compliance/cron-inventory.md — re-coleta da Phase 46, com o lado VIVO marcado ⏳"
  - "ERRCODE proprio P46RN — a reversao do expurgo de RETEN-05 fora de live"
affects: [46-07]

actuals:
  tokens: 39000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Portao convertido de INSTANTANEO em INVARIANTE no MESMO commit que o obrigaria a reprovar: a lista literal deixa de ser fotografia quando ela e o ESCOPO DECLARADO e a assercao complementar reprova nomeando o intruso — a contagem nua nao tem como dizer o nome, e e por isso que ela mentia"
    - "Negacao correlacionada por NOT EXISTS dentro do gate do INVENT-05: `jobname` e anulavel, e `jobname <> ALL (lista)` deixaria o agendamento sem nome ESCAPAR — a forma banida renascendo dentro do arquivo que existe para bani-la"
    - "UM statement nos tres modos, revertido por ERRCODE proprio fora de live: a contagem sobrevive em variavel plpgsql porque o rollback de subtransacao nao restaura memoria. Dois statements (um para contar, outro para apagar) e o parente direto do P39/CR-02"
    - "Coluna de ledger recebe o que ACONTECEU, nunca o que teria acontecido: notificacoes_expurgadas vale ZERO fora de live, mesma doutrina de processados na coluna vizinha. Duas colunas adjacentes com convencoes opostas seriam armadilha, e um ledger que diz que a purga DESLIGADA apagou trilha de auditoria e lido como incidente"
    - "Skip que DEIXA RASTRO: segredo ausente grava linha de ledger com o elegiveis VERDADEIRO em vez de retornar em silencio — um retorno mudo e indistinguivel de 'nada elegivel', e a politica de retencao deixaria de existir sem sinal"
    - "Prova DURAVEL de um efeito PERECIVEL: o dispatch e provado pelo estado do ledger (todos os itens ABERTOS, zero falha, execucao em executando) e nao pelas tabelas do pg_net, que sao UNLOGGED com TTL de ~6 h"
    - "Fronteira de contrato exercitada nos TRES pontos, e dois deles RODAM: sem o lado que roda, um portao de cap prova apenas que a funcao recusa — o modo de falha no 3 dos sete portoes da Phase 45"

key-files:
  created:
    - supabase/migrations/20260823000011_p46_sweep_dispatch_e_reten05.sql
    - supabase/migrations/20260823000012_p46_cron.sql
  modified:
    - supabase/tests/p42_invent05_cron_smoke.sql
    - supabase/tests/p46_purga_smoke.sql
    - docs/compliance/cron-inventory.md

key-decisions:
  - "RETEN-05 roda em (a.4) e nao no fim do corpo: no fim ela NUNCA rodaria em off (o kill switch retorna em (f)) nem sob cap_excedido (o aborto retorna em (d)) — e o proprio plano exige que o mesmo statement rode nos tres modos e que o checkpoint prove que em off nada e apagado"
  - "O cofre e lido DEPOIS da contagem: lido antes, a linha segredo_ausente teria de gravar elegiveis = 0, um numero que a funcao ainda nao mediu, dentro de um registro de cumprimento de obrigacao legal (a mentira simetrica do RD2-01)"
  - "Segredo ausente aborta TAMBEM em dry_run: um ensaio que pulasse em silencio a unica perna que faltaria em live produziria 14 noites de evidencia autorizando o flip para um live incapaz de despachar — o dry-run DECORATIVO que o SC#1 proibe"
  - "Em off o cofre NAO e lido: off significa 'esta execucao so escreve o heartbeat' (RD2-05), e um veredito segredo_ausente ali apagaria a prova do kill switch que D-46-09/SC#3 exigem por execucao real"
  - "processados NAO recebe o numero de posts: quem incrementa e concluir_item_purga (46-05), uma vez por item cujo motor rodou — somar os posts daria contagem DUPLA (2N) e faria a coluna significar outra coisa"
  - "notificacoes_expurgadas vale ZERO fora de live, divergindo da letra do plano, e o COMMENT da coluna foi reescrito para declarar a doutrina (o texto vivo ainda dizia que ela so seria escrita no 46-07)"
  - "Em live o laco NAO fecha o item e a execucao fica em executando: reivindicar_item_purga exige concluido_em nulo E situacao executando, entao o fechamento aqui recusaria todo o despacho com P46FB e o ledger diria despachado sobre um 403"
  - "Em live o motor continua sendo chamado com o literal true: o ensaio produz a PRE-IMAGEM do titular imediatamente antes da destruicao real. Um false aqui destruiria N titulares dentro de UMA transacao de cron, sem teto de parede e sem retomada"
  - "RETEN-05 NAO e bloqueada pelo cap: o cap governa o predicado de TITULARES, RETEN-05 tem predicado proprio sobre outra tabela, e suspende-la sob uma condicao que dura ate intervencao humana e o defeito RD3-02 outra vez"
  - "A assercao (m) roda em live com o dispatch REAL (rolled back), e nao com o truque do cap: rodar live sem exercitar o ramo live provaria menos do que parece"

requirements-completed: []  # PURGA-01 e RETEN-05 NAO fecham aqui — ver §Requirements

metrics:
  duration: ~70min
  completed: 2026-08-23
---

# Phase 46 Plano 06: O gatilho — Summary

A purga ganhou o gatilho que faltava, e o portão que esse gatilho obrigaria a reprovar foi
consertado **no mesmo commit**. A varredura passou a ter as três metades — o ensaio, o hop por
titular para a Edge Function no ramo `live`, e a regra independente de retenção de notificações que
vivia como promessa num comentário de produção desde 2026-07-21.

⚠ **NADA FOI APLICADO E NENHUM JOB EXISTE.** Duas migrations, duas emendas de smoke e uma
re-coleta de inventário — tudo no disco. O apply, o agendamento efetivo, a execução dos smokes e o
`db:types` são a Task 4 e pertencem ao orquestrador.

⚠ **`status: checkpoint`, e não `complete`, DE PROPÓSITO** — mesma razão do 46-05. **Condição exata
para virar `complete`:** as duas migrations no ledger com `md5(statements[1])` conferido dos dois
lados, `cron.job` com quatro linhas, `p42_invent05_cron_smoke` **verde com quatro jobs vivos**, e
`p46_purga_smoke` em **25/25**.

## Task Commits

| Task | Nome | Commit |
|------|------|--------|
| 1 | A varredura completa — cofre, dispatch por titular, RETEN-05 e o `COMMENT` reescrito | `5fb6083` |
| 2 | O 4º job de cron **E** a emenda do portão herdado (D-46-23) | `ca313a2` |
| 3 | As quatro asserções — `(a)`, `(g)`, `(m)`, `(n)`; RESUMO 21 → 25 | `07244a7` |
| 4 | ⏸ **APPLY + CRON + SMOKES — do orquestrador** | — |

Zero `--no-verify`: o hook de type-check rodou nos três commits e reportou **96 erros — o baseline
congelado**, inalterado. Nenhum arquivo TypeScript foi tocado.

## ⭐ D-46-23 cumprido: o portão foi consertado ANTES de ele poder reprovar

A asserção `(a)` do `p42_invent05_cron_smoke.sql` comparava `count(*) FROM cron.job` contra a
**constante 3**. O `CLAUDE.md` registra essa exata linha como o exemplo canônico da família
*"contagem contra constante reprova trabalho correto com diagnóstico FALSO"* — e a mensagem dela
culparia *"guard de remoção condicional falhou e o alvo ficou duplicado"*, uma causa que não teria
acontecido.

**O conserto não foi trocar 3 por 4.** Isso seria trocar uma fotografia por outra, e a próxima fase
pagaria de novo. A asserção passou a medir a propriedade que sempre quis medir — *o inventário vivo
é exatamente o que o repositório declara* —, em três verificações:

| | Antes | Depois |
|---|---|---|
| forma | `IF v_n <> 3` | (i) três `jobname` herdados por igualdade exata · (ii) exatamente um `purga-retencao-sweep` · (iii) nenhum outro `jobname` · nenhum duplicado |
| em 2026-08-23 | **VERMELHO** sobre trabalho correto | **VERDE** com quatro jobs |
| diante de um 5º job futuro | *"tem 5, esperado 3"* | **o nome dele**, apontando para o `cron-inventory.md` e para a lista |

⚠ **E a lista de quatro nomes não é uma fotografia disfarçada** — a pergunta que o `CLAUDE.md` manda
fazer foi feita e a resposta está escrita no arquivo: este é o gate do **INVENT-03**, cujo requisito
**é** que todo agendamento vivo seja rastreável ao repositório. Acrescentar um nome passa a ser
parte de criar um job, em dois artefatos, no mesmo commit — que é exatamente o que este plano fez.

⚠ **(a.iii) é correlacionada por `NOT EXISTS`, e isso não é preciosismo:** `cron.job.jobname` é
**anulável** (a forma de dois argumentos de `cron.schedule` agenda sem nome), e
`jobname <> ALL (lista)` avaliaria DESCONHECIDO para o intruso sem nome, deixando-o **escapar**.
Seria o INVENT-05 renascendo dentro do arquivo que existe para corrigir o INVENT-05.

## O que foi construído

### `20260823000011` — a varredura v3

Corpo inteiro herdado de `20260823000007`, com quatro acréscimos e uma reordenação:

| Seção | O que faz |
|---|---|
| **(a.4) RETEN-05** | UM `DELETE` sobre `notificacoes_enviadas`, ancorado em `criado_em` (a **única** coluna temporal `NOT NULL` da tabela), com a janela do escalar próprio `config_purga.janela_notificacoes_meses`. Fora de `live`, revertido por `P46RN` com captura **tipada** |
| **(f.5) cofre** | `project_url` e `edge_invoke_key` por referência totalmente qualificada, um a um pelo nome. Ausência → linha de ledger `segredo_ausente` **com o `elegiveis` verdadeiro**, e retorno |
| **(g) laço** | fechamento do item **condicional ao modo** — em `live` o item fica ABERTO |
| **(g.5) dispatch** | **um post por titular**, só no ramo `live`. Falha vira LINHA DE LEDGER, nunca só aviso |
| **(h) fechamento** | em `live`, `veredito = 'despachado'` e `situacao = 'executando'` — quem fecha o cabeçalho é a conclusão do ÚLTIMO item |

E, na mesma migration, a reescrita do `COMMENT ON TABLE public.notificacoes_enviadas`: tudo o que o
texto vivo dizia foi **preservado** (trilha de auditoria, escopo vaga-scoped do RH, negação ao
candidato, escrita só por `service_role`, idempotência durável), e só a última frase mudou — a que
declarava *"Retention INDEFINITE in v1 (LGPD-OPS purge deferred to M8)"*, que é **literalmente** a
promessa-sem-código que RETEN-05 existe para fechar.

### `20260823000012` — o 4º job

Quatro linhas de SQL e noventa de razão. `purga-retencao-sweep`, `0 3 * * *` **UTC**, corpo = **só a
chamada da função** — `md5(command)` = `381a0edbc8a59b47b23b50dd1eba9a86`, **40 octetos**, computado
**por execução** sobre o arquivo. SQL solto no corpo de um job é lógica que vive fora do repositório
e fora de todo pin, e este projeto mantém aberta a hipótese `processo-origem-do-drift-desconhecida`.

## Deviations from Plan

### [Rule 1 - Bug] RETEN-05 no fim do corpo NUNCA rodaria em `off` nem sob `cap_excedido`

O plano manda o expurgo "ao fim do corpo". Ali ele é **inalcançável** nos dois modos que o próprio
plano exige que ele cubra: o kill switch retorna em `(f)` e o aborto por cap retorna em `(d)`, os
dois antes do fim. O `must_have` diz *"o mesmo statement roda nos três modos"* e o checkpoint manda
**provar** que em `off` a contagem de notificações fica inalterada — uma regra que não roda não pode
ser provada inocente. Movido para `(a.4)`, antes da materialização. **Bônus mecânico:** a contagem
passa a existir antes do `INSERT` de heartbeat, que é quem grava a coluna do ledger.

### [Rule 1 - Bug] O cofre lido antes da contagem gravaria `elegiveis = 0` inventado

O plano pede a leitura do cofre "antes de qualquer seleção". Ali, a linha `segredo_ausente` teria de
gravar `elegiveis = 0` — um número que a função ainda não mediu — dentro de um registro de
cumprimento de obrigação legal com retenção indefinida (D-46-16) e sem PITR para desmentir. **É a
mesma classe do RD2-01: a mentira simétrica custa o mesmo que a otimista.** Movido para `(f.5)`,
depois de `(c)`. A propriedade que o plano queria — *a ausência é detectada e REGISTRADA ainda
durante o dry-run* — está preservada.

⚠ E a decisão que veio junto: **a ausência aborta também em `dry_run`**, não só em `live`. Um ensaio
que pulasse em silêncio a única perna que faltaria em `live` produziria 14 noites de evidência que
**autorizam o flip** para um `live` incapaz de despachar. Em `off` o cofre não é lido — `off`
significa "esta execução só escreve o heartbeat" (RD2-05), e um `segredo_ausente` ali apagaria a
prova do kill switch.

### [Rule 1 - Bug] `processados` = número de posts daria contagem DUPLA

O plano pede `processados` = posts enfileirados. Isso quebra a coluna em dois sentidos: o `COMMENT`
vivo dela diz que ela conta *"quantos titulares tiveram o motor destrutivo efetivamente executado"*,
e no instante do despacho **zero** teve; e quem a incrementa é `concluir_item_purga` (46-05), uma
vez por item cujo motor rodou — somar aqui terminaria em **2N**. Ela fica em 0 no fim da varredura,
em todos os modos, e sobe pelas conclusões. Asserido por `(m)`.

### [Rule 1 - Bug] `notificacoes_expurgadas` com o número do ENSAIO seria uma mentira no ledger

O plano manda a contagem do `GET DIAGNOSTICS` para a coluna nos três modos. Fora de `live` o expurgo
é **revertido** — a coluna passaria a afirmar que N linhas de trilha de auditoria foram apagadas
quando **nenhuma** foi, e uma linha com `modo_vigente = 'off'` e `notificacoes_expurgadas = 3` seria
lida, com razão, como *"a purga desligada apagou trilha de auditoria"*. Adotada a **mesma doutrina
que `processados` já declara na coluna vizinha**: zero fora de `live`. O número do ensaio vai para um
`WARNING`, e só quando há o que dizer.

⚠ E o `COMMENT` da coluna foi reescrito na mesma migration, porque o texto vivo terminava com *"Nasce
em 0 e só passa a ser escrita no plano 46-07"* — que deixou de ser verdade neste arquivo. Um
comentário que declara inerte uma coluna escrita toda noite é a forma exata do **BL-01**.

### [Rule 3 - Bloqueio] Em `live`, o item fechado pelo laço tornaria o dispatch inteiro um 403

O plano descreve o laço de dry-run rodando em todos os modos exceto `off` **e** o dispatch
percorrendo "os itens abertos da execução". As duas coisas são incompatíveis com o fechamento
incondicional: `reivindicar_item_purga` exige `concluido_em IS NULL` **e** `situacao = 'executando'`.
Fechado o item — ou fechado o cabeçalho — a Edge Function receberia `P46FB` em 100% das invocações, e
o ledger diria `despachado` sobre um 403 diário. Em `live` o `UPDATE` grava só o `relato_dry_run`, e
a execução termina em `executando`.

⚠ **Com uma exceção que o plano não previa e que evita um ledger errado:** se não restou item aberto
— conjunto vazio, ou **todos** os despachos falhados —, ninguém chamará `concluir_item_purga`, e a
execução ficaria em `executando` até a reconciliação marcá-la como **`abortada`** uma hora depois.
Ela seria descrita como morta quando na verdade terminou. Nesse caso, e só nesse, o fechamento
acontece na própria varredura.

### [Rule 1] Dois critérios de aceite do plano reprovariam o arquivo CORRETO — pela QUARTA vez nesta fase

| Critério do plano | Medido | Por que não pode ser "consertado" |
|---|---|---|
| `grep -c 'WHEN OTHERS'` (fora de comentário) = **1** | **4** | Duas são os handlers **pré-existentes** do tracer (o envelope por titular e o do registro da falha); a terceira é a do despacho, que o **próprio plano** exige genérica; a quarta é o registro da falha de despacho — sem ela, um `UPDATE` que falhasse dentro do handler derrubaria a varredura inteira e reverteria os posts já enfileirados |
| `grep -c 'vault.decrypted_secrets'` = **2** | **2** ✅ | Satisfeito — mas **só depois de eu tirar do cabeçalho a consulta de pré-condição**, que era uma terceira ocorrência em prosa. Registrado porque a alternativa (relatar 3 e explicar) teria sido pior: aqui havia um lugar melhor para a consulta, e ele é o checkpoint |

**Medição honesta**, fora de comentário **e** fora de literal de string:

| Propriedade | Valor | Esperado |
|---|---|---|
| captura genérica no arquivo | 4 | 4 |
| captura genérica **dentro do envelope da chamada ao motor** | **0** | 0 |
| terminador tipado do dry-run (`P45DR`) | 1 | 1 |
| terminador tipado do expurgo (`P46RN`) | 1 | 1 |
| verbo de exclusão sobre notificações | 1 | 1 |
| hop do `pg_net` | 1 | 1 |
| leituras do cofre | 2 | 2 |
| negação por conjunto de valores em SQL puro | 0 | 0 |
| menção aos outros três agendamentos na migration do cron | 0 | 0 |

## As quatro asserções novas — e o que cada uma NÃO prova

| # | Mede | Executa? |
|---|---|---|
| `(a)` | o job existe UMA vez, `0 3 * * *`, ativo, `md5(command)` **pinado byte a byte**; e os três herdados por igualdade exata de `jobname` | catálogo |
| `(g)` | ⊖⊕ os **três** pontos da fronteira do cap — `= cap` roda, `= cap - 1` roda, `= cap + 1` aborta — mais `cap = 1` com aborto integral (zero item, zero requisição) | ✅ 5 varreduras |
| `(m)` | RETEN-05 sobre fixture **retrodatada**; ⊖ independência e trilha do Art. 7º, VI intactas; ⊕ o dispatch do ramo `live` rodou | ✅ em `live` |
| `(n)` | ⊖ o `COMMENT` **vivo** perdeu `INDEFINITE` **e** ganhou a janela, a âncora e a função | catálogo |

⚠ **`(g)` não escreve o número de elegíveis em lugar nenhum** — ele é **descoberto** pela própria
função, com o cap no teto do domínio, e lido do ledger. Uma constante envelheceria com a fixture;
uma reimplementação do predicado seria a segunda definição que o P39/CR-02 nomeia.

⚠ **`(m)` planta a própria linha vencida, e isso é obrigatório.** Medido em 2026-08-23, a linha mais
antiga viva de `notificacoes_enviadas` é de 2026-07-31 e a janela é de 24 meses: **o alcance real de
RETEN-05 hoje é ZERO, e continuará zero por ~23 meses.** Uma asserção sobre as linhas vivas passaria
por vacuidade — e passaria **igual com o `DELETE` removido do corpo da função**.

⚠ **A metade que prova "independente" é a NEGATIVA.** As FKs `ON DELETE CASCADE` levariam as
notificações junto se a candidatura sumisse. Sem medir que nenhuma candidatura e nenhum candidato
foram apagados, um expurgo por **cascata** passaria por cumprimento da regra independente. E,
separadamente, `historico_candidatura` e `decisao_final` mantiveram a contagem — a trilha que prova
não-discriminação (Art. 7º, VI) nunca é tocada.

⚠ **A prova ⊕ do dispatch é DURÁVEL, e essa escolha é deliberada.** As tabelas do `pg_net` são
`UNLOGGED` com TTL de ~6 h — uma asserção sobre elas é perecível. O que `(m)` afere é o **ledger**:
todos os itens ABERTOS, zero com `desfecho_postgres = 'falha'`, execução em `executando` e
`veredito = 'despachado'`. Isso só é possível se o laço de despacho percorreu todos e nenhum
enfileiramento levantou — porque um post que falhasse **fecharia aquele item com `falha`**. A leitura
da fila do `pg_net` continua no arquivo, com **tolerância declarada**: quando não puder ser medida, o
`NOTICE` diz isso, em vez de fingir ter olhado.

## Varredura por FORMA — feita, e o ponto cego do próprio padrão continua aberto

Rodada conforme o `CLAUDE.md`: `grep -nE "v_[a-z_]* (<>|!=) [0-9]+|= ANY \(ARRAY\['"`. Os achados nos
arquivos que este plano tocou:

| Achado | Veredito |
|---|---|
| `v_a_n <> 1` (p46, nova) e `v_n_purga <> 1` (p42, nova) | **cardinalidade POR NOME**, não contagem de inventário: não muda quando o sistema ganha agendamentos, só quando *aquele* agendamento é duplicado ou some. Justificado inline nos dois arquivos |
| `v_m_ins <> 2`, `v_m_fora_a <> 1`, `v_m_dentro_a <> 1`, `v_m_fora_z <> 0`, `v_m_dentro_z <> 1` | comparam contra o que o **próprio bloco criou na mesma execução** — baseline capturada, não fotografia |
| `v_t_back <> v_t_off OR v_t_rest <> 0` | baseline capturada na própria execução |
| `c_herdados text[]` (lista literal, nos dois smokes) | **escopo declarado do INVENT-03**, e a assertiva complementar reprova nomeando o intruso — a distinção está escrita por extenso nos dois arquivos |

⚠ **E o ponto cego que o 46-05 registrou continua aberto:** o regex do `CLAUDE.md` **não cobre
`IS DISTINCT FROM <n>`**, que é o idioma dominante do `p46_purga_smoke.sql`. Eu introduzi mais
ocorrências dessa forma (`v_g1_novas IS DISTINCT FROM 1`, `v_g3_proc IS DISTINCT FROM 0`, …) e
nenhuma delas é fotografia — mas **um padrão de varredura que não enxerga o idioma do arquivo que ele
vigia é um portão com ponto cego**, e ele segue sem conserto. Continua no `WINDOWS.md`.

## Requirements

**PURGA-01 e RETEN-05 NÃO fecham aqui**, e por isso `requirements-completed` está vazio. O job não
existe em `cron.job` e o `DELETE` de RETEN-05 não existe no corpo vivo da função. Fechá-los agora
seria declarar cumprido um requisito cujo caminho vivo não existe — a mesma disciplina do 46-05.

⚠ **PURGA-01 fecha no checkpoint desta Task 4** (o job aplicado, ativo e com `md5` conferido).
**RETEN-05 fecha junto**, porque a regra passa a existir no corpo vivo — mesmo com alcance zero hoje,
o que ela deixa de ser é uma promessa. O flip `off → dry_run` é o 46-07.

## O que a Task 4 tem de fazer, na ordem — e o que ela pode reprovar

Está no `<checkpoint>` devolvido ao orquestrador. Quatro pontos que não são óbvios:

1. **Conferir os dois segredos do cofre ANTES do apply de `20260823000011`.** Se `project_url` ou
   `edge_invoke_key` não estiverem lá, a nova varredura aborta com `veredito = 'segredo_ausente'`
   **inclusive em `dry_run`** — e as asserções `(b)`, `(c)`, `(i)`, `(idem)` e `(claim)` do smoke
   ficam vermelhas com esse diagnóstico. **Isso é a asserção funcionando, não um defeito do plano**,
   mas é caro descobrir depois do apply.
2. **A ordem `…011` antes de `…012` é dura.** Agendar um job que chama uma função sem o corpo novo
   cria uma janela em que o cron dispara a versão anterior — sem RETEN-05 e sem dispatch —, e a
   janela é **silenciosa**: o ledger registraria `dry_run` e ninguém saberia.
3. **A idempotência é provada por SEGUNDO APPLY**, não por leitura do código. É a única forma de
   provar que reaplicar não duplica o job.
4. **O `p42_invent05_cron_smoke.sql` verde COM QUATRO JOBS é a prova de D-46-23**, e é a única coisa
   deste plano que não pode ser inferida do repositório.

⚠ **`config_purga.modo` fica em `'off'`.** Ao fim do apply o cron roda toda noite às 03:00 UTC e a
única coisa que faz é gravar heartbeat. Ligar o dry-run é ato do 46-07.

## Self-Check: PASSED

| Item | Verificado |
|---|---|
| `supabase/migrations/20260823000011_p46_sweep_dispatch_e_reten05.sql` | ✅ existe (1 108 linhas) |
| `supabase/migrations/20260823000012_p46_cron.sql` | ✅ existe |
| `supabase/tests/p42_invent05_cron_smoke.sql` — `(a)` sem `v_n <> 3` | ✅ 0 ocorrências |
| `supabase/tests/p46_purga_smoke.sql` — `(z)` em 25 | ✅ |
| Commits `5fb6083` `ca313a2` `07244a7` | ✅ os três em `git log` |
| Balanço de aspas e cifrões nos três arquivos SQL | ✅ conferido por tokenizador |
| Variáveis usadas × declaradas no bloco novo do smoke | ✅ nenhuma indefinida |
| Portões estáticos das duas migrations | ✅ todos, exceto o de `WHEN OTHERS` (medido honestamente em 4) |
| `md5` do corpo do job | ✅ `381a0edbc8a59b47b23b50dd1eba9a86`, 40 octetos, **por execução** |
| `npm run lint` (hook, três commits) | ✅ **96 erros = baseline congelado** |
| Zero `--no-verify` | ✅ |

⚠ **O que este Self-Check NÃO cobre, dito por extenso:** nenhuma linha destes arquivos foi executada
contra Postgres nenhum. Esta máquina não tem instância local, e os subagentes não recebem os tools do
Supabase. As quatro asserções novas — e as duas migrations — são **RED até a Task 4**. Se `(g)` ou
`(m)` reprovarem, **medir o portão antes de acreditar na explicação**: um diagnóstico plausível
escrito num documento não é evidência.
