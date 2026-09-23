---
phase: 49-consertos-da-jornada-bloco-2
plan: "07"
subsystem: database
tags: [postgres, supabase, triggers, trigger-when, to_jsonb, lgpd, auditoria, migrations, p46apply]

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "06"
    provides: "os md5 vivos de `registrar_decisao`/`responder_revisao_decisao` (que este plano CHAMA no smoke sem redefinir), a GUC `app.transicao_sancionada` (sem a qual a redecisão sobre candidatura encerrada da asserção (e) seria recusada) e o molde de smoke que escreve e reverte"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "o molde de trigger com `WHEN` + portão de catálogo (`20260921000003:110-142`), `snapshot_decisao_final` com a lista explícita de 14 colunas (`20260921000011:167-185`) e o ciclo de revisão do Art. 20"
  - phase: 46-purga-e-guardas
    provides: "`p46apply.cjs` — SQL lido do ARQUIVO, migration + ledger na mesma transação, md5 conferido por leitura de volta"
provides:
  - "`trg_decisao_final_snapshot` com `WHEN` por `to_jsonb` da LINHA INTEIRA menos `explicacao_solicitada_em` e `alerta_prazo_enviado_em` — arquiva mudança real e só ela; coluna nova entra na vigilância por construção, sem ninguém editar o trigger"
  - "`public.stamp_explicacao_acessada(uuid)` IDEMPOTENTE (`UPDATE … AND explicacao_solicitada_em IS NULL` + re-SELECT da linha): abrir a página da explicação deixa de ESCREVER, e a 2ª chamada continua devolvendo a linha em vez de NULL"
  - "`anon` sem EXECUTE em `stamp_explicacao_acessada` e em `snapshot_decisao_final` (era `true` nas duas, por grant direto do `pg_default_acl`)"
  - "`supabase/tests/p49_snapshot_smoke.sql` — 11 asserções, provadas por execução em PROD e provadas MORDENTES por SETE mutações, uma por conserto/cláusula"
  - "asserção de PARIDADE de colunas lida na execução de três fontes (catálogo de `decisao_final`, catálogo do arquivo, lista do INSERT no corpo VIVO de `snapshot_decisao_final`) — a forma que não envelhece: zero lista literal de colunas no smoke"
  - "asserção (y): `decisao_final` sem trigger BEFORE UPDATE — a premissa que torna a lista de exclusão do D-44 completa, mantida sob vigilância depois do apply"
affects: [49-10, 49-12, 49-14, 49-18]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 16674
  tasks: 2
  commits: 2
  plan_head_before: c2a55e5fbcd7640c7f6238c5edadb50b6c9f3de5
  # `commits: 2` = MEDIDO por `git rev-list --count c2a55e5f..HEAD` no instante em que este
  # SUMMARY foi escrito (9a83da53, 18f28f74), não narrado. Re-medir DEPOIS deste ponto dá um
  # número MAIOR e isso não é divergência: o commit de metadado do próprio plano entra no
  # mesmo intervalo por construção, porque o `plan_head_before` é anterior a ele.
  # `tokens: 16674` = 66697 octetos dos dois arquivos novos ÷ 4. A estimativa era 70000; o
  # realizado é 0,24×. Registrado como medido, não ajustado para parecer perto — o plano tem
  # `confidence: low`, e a mesma razão do 49-06 (0,25×) vale aqui: a migration é pequena
  # porque a decisão difícil (comparar por `to_jsonb` em vez de por lista) cabe numa linha.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "`WHEN` de trigger por `to_jsonb(OLD) - 'col' - 'col' IS DISTINCT FROM to_jsonb(NEW) - as mesmas`: a comparação é da LINHA INTEIRA menos exclusões nomeadas, e não de uma lista de colunas incluídas. Coluna nova nasce DENTRO da vigilância — a forma da lista é fotografia do schema"
    - "contagem de exclusões no pós-portão (`(length(def) - length(replace(def, ' - ''', ''))) / 4`), e não só presença das duas esperadas: uma asserção de PRESENÇA passa com uma terceira exclusão ao lado das duas certas"
    - "`ctid` como instrumento de «o UPDATE aconteceu?» quando a coluna escrita está fora do portão que se está medindo — a contagem do arquivo ficaria em 0 nos dois mundos e a asserção seria vácua"
    - "asserção de não-vacuidade embutida na própria asserção negativa: o no-op tem de MUDAR o `ctid` (o Postgres grava versão nova mesmo com valores idênticos), senão o que foi provado é que ninguém escreveu, não que o trigger não disparou"
    - "paridade de conjuntos lida de TRÊS fontes independentes na execução (catálogo da tabela viva, catálogo da tabela de arquivo, e o corpo VIVO da função que copia uma na outra) — reprova nomeando a coluna que falta de qual lado"
    - "premissa de forma promovida de pré-condição a asserção viva: «esta tabela não tem trigger BEFORE UPDATE» é o que torna uma lista de exclusão completa, e uma pré-condição lida uma vez não sobrevive ao trigger que nasce depois"

key-files:
  created:
    - supabase/migrations/20260922000006_p49_snapshot_so_com_mudanca.sql
    - supabase/tests/p49_snapshot_smoke.sql
  modified: []

key-decisions:
  - "O `WHEN` compara a linha INTEIRA por `to_jsonb` menos as duas exclusões do D-44, e não uma tupla de colunas incluídas. A forma da tupla (que o analog `20260921000003:316` usa, corretamente, para DUAS colunas) é fotografia do schema quando o conjunto é «tudo»: a coluna acrescentada depois fica fora da comparação e passa a mudar sem arquivar, em silêncio"
  - "O instrumento das chamadas 2..5 de `stamp_explicacao_acessada` é o `ctid`, não o valor da coluna nem a contagem do arquivo. Medido: com o corpo ANTERIOR o arquivo fica em 0 (a coluna está fora do WHEN) e a linha é reescrita 4 vezes — `(0,21)` → `(0,27)`. Sem o `ctid` a asserção de idempotência seria vácua"
  - "A asserção (b) exige que o no-op MUDE o `ctid`. Sem essa metade, «no-op não arquiva» poderia estar provando que o Postgres não escreveu nada, e não que o trigger não disparou"
  - "A ausência de trigger BEFORE UPDATE em `decisao_final` entrou no pós-portão E no smoke, como asserção (y) contada. O plano a pedia como pré-condição (Passo 1) — uma pré-condição lida uma vez não sobrevive ao carimbador de `updated_at` que alguém crie depois, e é ele que reabre o defeito"
  - "`REVOKE … FROM anon` também em `snapshot_decisao_final()`, que o plano não pedia: medido `anon` com EXECUTE por grant direto do `pg_default_acl`, e é o padrão de ACL de função de trigger desta fase (§1 do PATTERNS, aplicado às outras três pelo 49-06). O CORPO não foi tocado — o pós-portão confere o md5 idêntico"
  - "Uma exclusão a mais no `WHEN` seria indetectável por presença, então o pós-portão CONTA as exclusões (4 = duas por lado). Foi essa contagem que virou a mutação M4"
  - "Sete mutações, não uma: um smoke é fail-fast, e a lição do 49-06 é que uma mutação que desfaz vários consertos de uma vez deixa os demais parecendo provados. Cada cláusula ganhou a sua inversão exata — e uma delas (M2) só é distinguível pelo `ctid`"
  - "`main` mantida como branch de trabalho (autorização explícita do orquestrador: `git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main` como base). Não registrado como desvio"

patterns-established:
  - "Comparar a linha inteira menos exclusões, nunca a lista de incluídas: quando a intenção é «qualquer mudança exceto estas N», escrever as N e comparar o resto é a única forma que não envelhece. A lista de incluídas parece igual e é o oposto — ela congela o schema do dia em que foi escrita"
  - "Quando a coluna que se está medindo está FORA do portão em teste, a contagem do portão não distingue nada: é preciso um instrumento independente (aqui, `ctid`). Uma asserção que passaria nos dois mundos não é asserção"
  - "Asserção negativa carrega a prova da própria não-vacuidade: «X não aconteceu» só vale acompanhada de «e o gatilho de X foi de fato disparado»"

requirements-completed: []

coverage:
  - id: D1
    description: "Abrir a página da explicação deixa de criar versão da decisão: 5 chamadas de `stamp_explicacao_acessada` com o JWT do titular ⇒ ZERO linha em `decisao_final_historico`, a 1ª carimba, e as 4 seguintes não ESCREVEM (a RPC ficou idempotente, não só silenciosa)"
    requirement: JORN-3b
    verification:
      - kind: integration
        ref: "supabase/tests/p49_snapshot_smoke.sql#(a) 5 chamadas ⇒ delta 0 no arquivo; `ctid` imutável nas chamadas 2..5; carimbo preservado no valor distintivo (2020-03-04)"
        status: pass
      - kind: integration
        ref: "mutação M1 (trigger SEM `WHEN`, a definição anterior ao apply, em requisição que aborta) ⇒ FAIL (a) «5 leituras da explicação criaram 2 linha(s)»"
        status: pass
      - kind: integration
        ref: "mutação M2 (corpo ANTERIOR de `stamp_explicacao_acessada`, com `COALESCE` e sem filtro) ⇒ FAIL (a) «as chamadas 2..5 ESCREVERAM na linha (ctid (0,21) -> (0,27))» — e o arquivo ficou em 0, que é por que o `ctid` é o instrumento"
        status: pass
      - kind: other
        ref: "PROD: `pg_get_triggerdef` = `… WHEN ((((to_jsonb(old.*) - 'explicacao_solicitada_em'::text) - 'alerta_prazo_enviado_em'::text) IS DISTINCT FROM ((to_jsonb(new.*) - …))))`; `md5(prosrc)` de `stamp_explicacao_acessada` = 01b87885746b38ad725575ba40542f2b (633 octetos)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A 2ª chamada da RPC continua devolvendo A LINHA, não NULL (Correção 30): com o filtro `IS NULL` o `RETURNING * INTO` sai vazio, e sem o re-SELECT o front perderia a explicação em toda recarga"
    requirement: JORN-3b
    verification:
      - kind: integration
        ref: "supabase/tests/p49_snapshot_smoke.sql#(a2) a 2ª chamada devolve a linha da candidatura"
        status: pass
      - kind: integration
        ref: "mutação M3 (filtro `IS NULL` presente, re-SELECT REMOVIDO) ⇒ FAIL (a2) «devolveu <NULL>»"
        status: pass
    human_judgment: false
  - id: D3
    description: "UPDATE que não muda nada, e UPDATE só das duas colunas do D-44 (carimbo de leitura + telemetria do alerta de prazo), não arquivam — e as asserções não são vácuas: o `ctid` MUDA nas duas, provando que a escrita aconteceu e que foi o trigger que não disparou"
    requirement: JORN-3b
    verification:
      - kind: integration
        ref: "supabase/tests/p49_snapshot_smoke.sql#(b) `SET justificativa = justificativa` ⇒ delta 0 e `ctid` diferente"
        status: pass
      - kind: integration
        ref: "supabase/tests/p49_snapshot_smoke.sql#(c) UPDATE de `alerta_prazo_enviado_em` + `explicacao_solicitada_em` ⇒ delta 0 e `ctid` diferente"
        status: pass
      - kind: integration
        ref: "mutação M5 (`WHEN` excluindo SÓ `explicacao_solicitada_em` — a telemetria volta à comparação) ⇒ FAIL (c) «criou 1 linha(s)»"
        status: pass
    human_judgment: false
  - id: D4
    description: "Tudo o que é mudança REAL continua arquivando, com o valor ANTIGO: `justificativa` (a forma do tombstone do motor de exclusão), a redecisão pelo upsert de `registrar_decisao`, o pedido de revisão do titular, a resposta `mantida` e a reabertura `revertida` — uma linha por evento, nem mais nem menos"
    requirement: JORN-3b
    verification:
      - kind: integration
        ref: "supabase/tests/p49_snapshot_smoke.sql#(d) mudança de `justificativa` ⇒ 1 linha, com o valor ANTIGO no arquivo e o novo na linha viva"
        status: pass
      - kind: integration
        ref: "supabase/tests/p49_snapshot_smoke.sql#(e) `registrar_decisao` sobre linha existente ⇒ 1 linha, com `decisao='rejeitado'` e a 1ª justificativa (a ANTERIOR); a viva fica `aprovado`"
        status: pass
      - kind: integration
        ref: "supabase/tests/p49_snapshot_smoke.sql#(f) `solicitar_revisao_decisao` ⇒ 1 (com `revisao_solicitada_em` NULL no arquivo — o snapshot lê OLD) · `responder_revisao_decisao('mantida')`, revisor B ≠ decisor A ⇒ 1"
        status: pass
      - kind: integration
        ref: "supabase/tests/p49_snapshot_smoke.sql#(f2) `responder_revisao_decisao('revertida')` ⇒ 1, `reaberta_em` preenchido na viva e NULL no arquivo, candidatura em `decisao_final/em_analise`"
        status: pass
      - kind: integration
        ref: "mutação M4 (`WHEN` excluindo TAMBÉM `justificativa`) ⇒ FAIL (d) «criou 0 linha(s)» — Pitfall 5 com nome e endereço"
        status: pass
      - kind: integration
        ref: "`supabase/tests/p45_motor_exclusao_smoke.sql` re-rodado em PROD depois do apply: verde (exit 0, nenhum FAIL) — o tombstone REAL segue arquivando, e a ordem snapshot → raspagem do arquivo continua valendo"
        status: pass
    human_judgment: false
  - id: D5
    description: "Uma coluna nova em `decisao_final` que não entre no arquivo passa a REPROVAR em vez de sumir em silêncio — paridade lida na execução de três fontes independentes, sem nenhuma lista literal de colunas no smoke"
    requirement: JORN-3b
    verification:
      - kind: integration
        ref: "supabase/tests/p49_snapshot_smoke.sql#(g) A = colunas(decisao_final) − {id, em} ∪ {decidido_em} = B = colunas(decisao_final_historico) − {id, arquivado_em} = C = a lista do INSERT no `prosrc` VIVO de `snapshot_decisao_final` — 14 colunas nas três"
        status: pass
      - kind: integration
        ref: "mutação M7 (`ALTER TABLE public.decisao_final ADD COLUMN p49_sonda text` em requisição que aborta) ⇒ FAIL (g) «Em decisao_final e NÃO no arquivo: {p49_sonda}», sem chegar a `MUTACAO_TERMINOU`; conferido depois, só leitura, que `p49_sonda` não existe em PROD"
        status: pass
    human_judgment: false
  - id: D6
    description: "A premissa que torna a lista de exclusão do D-44 COMPLETA fica sob vigilância: `decisao_final` não tem nenhum trigger BEFORE UPDATE, e o dia em que um nascer o smoke reprova e manda a decisão ao operador (D-14) em vez de alguém acrescentar a coluna à exclusão"
    requirement: JORN-3b
    verification:
      - kind: integration
        ref: "supabase/tests/p49_snapshot_smoke.sql#(y) 0 triggers BEFORE UPDATE em `public.decisao_final` (medido; os 3 da tabela são AFTER)"
        status: pass
      - kind: integration
        ref: "mutação M6 (`CREATE TRIGGER … BEFORE UPDATE ON public.decisao_final` em requisição que aborta) ⇒ FAIL (y) nomeando `trg_p49_mut_before_upd`"
        status: pass
      - kind: other
        ref: "pós-portão da migration assere a mesma ausência no instante do apply"
        status: pass
    human_judgment: false
  - id: D7
    description: "A migration está aplicada E escriturada, com `md5(statements[1])` do ledger conferido contra o md5 do arquivo em disco, e foi ENSAIADA em requisição que aborta ANTES do apply; nenhuma linha do arquivo foi apagada (D-45) e nenhuma mutação vazou para PROD"
    verification:
      - kind: integration
        ref: "ledger: 20260922000006 = bd1ffd1e3a783ae261dabc92b0c7dfb9 (20246 octetos) — idêntico ao md5 do disco; `version` nasceu correta (nenhum reparo)"
        status: pass
      - kind: other
        ref: "ensaio (migration + smoke + `RAISE 'ENSAIO_OK'`, uma requisição que aborta) ANTES do apply: abortou em `ENSAIO_OK`, sem `FAIL`"
        status: pass
      - kind: other
        ref: "`decisao_final_historico` = 11 antes e 11 depois; `snapshot_decisao_final` com md5 5d5c25f714bc07e7c242628afe19ac37 antes e depois; `anon` sem EXECUTE nas duas funções; `authenticated` preservado na RPC do titular"
        status: pass
      - kind: other
        ref: "depois das 7 mutações: `md5(prosrc)` vivo de `stamp_explicacao_acessada` = 01b87885… (o do pós-portão), 3 triggers na tabela, 0 BEFORE UPDATE, `p49_sonda` inexistente, e `p49_snapshot_smoke` volta a 11/11"
        status: pass
      - kind: other
        ref: "`npm run -s lint` = 89 erros (teto D-53 = 90); `p48_reabertura_smoke` 13/13; prova da 48 re-rodada só leitura com o T0 dela mantém `p2_ciclo_zerado_e_arquivado` e `p2_d23` = true"
        status: pass
    human_judgment: false

# Metrics
duration: 48 min
completed: 2026-09-22
status: complete
---

# Phase 49 Plano 07: O arquivo da decisão tem uma versão por mudança real Summary

**Ler a explicação deixa de versionar a decisão — e nenhuma mudança real deixou de ser arquivada: o trigger passa a comparar a LINHA INTEIRA por `to_jsonb` menos as duas colunas do D-44 (em vez de uma lista de colunas, que congelaria o schema de hoje), a RPC de leitura ficou idempotente, e a paridade de colunas é lida na execução de três fontes — uma migration aplicada em PROD com md5 do ledger conferido, 11 asserções novas e SETE mutações provando que cada cláusula reprova quando desfeita.**

## Performance

- **Duration:** 48 min
- **Started:** 2026-09-23T02:05:00Z
- **Completed:** 2026-09-23T02:53:00Z
- **Tasks:** 2 / 2
- **Files:** 2 (2 criados, 0 modificados)

## Medições vivas (D-49 / D-51) — o plano não foi ajustado para caber

Tudo abaixo foi medido em PROD, só leitura, ANTES de escrever uma linha.

| O que o plano assume | Medido em PROD (2026-09-22) | Bate? |
|---|---|---|
| `decisao_final_historico` com 11 linhas | **11**, em 3 candidaturas | sim |
| 5 snapshots «sem mudança» | **5** idênticos ao anterior em TODAS as colunas (comparação por `to_jsonb` da linha menos `id`/`arquivado_em`) | sim |
| 1 snapshot só de carimbo de leitura | **6** seriam suprimidos pelo `WHEN` novo — os 5 acima + 1 cujo único delta é `explicacao_solicitada_em` (candidatura `2ce20fbf…`, arquivada 2026-09-22 00:22:13) | sim |
| `trg_decisao_final_snapshot` sem `WHEN` | confirmado: `CREATE TRIGGER … AFTER UPDATE ON public.decisao_final FOR EACH ROW EXECUTE FUNCTION snapshot_decisao_final()` | sim |
| `stamp_explicacao_acessada` com UPDATE sem filtro | confirmado (`SET explicacao_solicitada_em = COALESCE(explicacao_solicitada_em, now())`, md5 `8d4aa9e3…`, 555 octetos) | sim |
| **nenhum trigger BEFORE UPDATE em `decisao_final`** | **0** — os 3 da tabela são AFTER (`trg_decisao_final_snapshot`, `trg_notif_revisao_solicitada`, `trg_notif_revisao_respondida`). **O D-14 não foi acionado** | sim |
| `snapshot_decisao_final` com 14 colunas explícitas | 14, md5 `5d5c25f7…` (682 octetos) | sim |
| paridade `decisao_final` × arquivo | 14 = 14 = 14 (as três fontes) | sim |
| varredura de portões = 288 linhas na abertura | **288** (o fecho que o 49-06 registrou) | sim |
| `tsc` ≤ 90 (D-53) | **89** (baseline congelada do hook = 96) | sim |
| `anon` com EXECUTE indevido | **`true`** em `stamp_explicacao_acessada` E em `snapshot_decisao_final` (grant direto do `pg_default_acl`) | sim (fechados) |

## Accomplishments

- **Eram DOIS defeitos somados, e consertar um só não resolveria.** O trigger arquivava
  qualquer UPDATE (sem `WHEN`), e a RPC de leitura fazia um UPDATE a cada abertura da página
  (o `COALESCE` preservava o VALOR, não o EVENTO). Com só o `WHEN`, a RPC continuaria
  reescrevendo a linha a cada leitura — quieta hoje, e de volta ao defeito no dia em que
  qualquer coluna nova entrasse na comparação. Com só o filtro `IS NULL`, um UPDATE sem
  mudança de qualquer outra origem seguiria versionando a decisão. **Medido: a mutação M2
  deixa o arquivo em 0 e reescreve a linha 4 vezes.**
- **O `WHEN` compara a linha INTEIRA menos duas exclusões, e não uma lista de colunas.** É a
  decisão de forma do plano, e a razão é o ponto cego que o `CLAUDE.md` §«Portões» nomeia:
  uma tupla `(OLD.a, OLD.b, …) IS DISTINCT FROM (NEW.a, NEW.b, …)` é uma FOTOGRAFIA do
  schema. A coluna que alguém acrescentar a `decisao_final` depois ficaria fora da comparação
  e passaria a mudar **sem arquivar, em silêncio**. Pela forma escolhida, ela nasce DENTRO da
  vigilância.
- **A exclusão é de DUAS colunas, e o pós-portão CONTA em vez de só conferir presença.** Uma
  asserção de presença das duas certas passaria com uma terceira ao lado delas. O pós-portão
  conta as exclusões do `pg_get_triggerdef` (4 = duas por lado da comparação) — e foi essa
  contagem que virou a mutação M4, que exclui `justificativa` e reprova em (d). `justificativa`
  é a coluna que o tombstone do motor de exclusão muda, e lá **a ordem é o mecanismo**
  (arquiva a linha viva ANTES de raspar o arquivo): um `WHEN` largo demais desligaria o
  arquivamento do tombstone sem nenhum erro.
- **O instrumento da idempotência é o `ctid`, porque a contagem do arquivo não distingue nada
  aqui.** `explicacao_solicitada_em` está FORA do `WHEN`, então o arquivo fica em 0 com a RPC
  idempotente E com a RPC anterior. A asserção seria vácua. `ctid` muda a cada versão de
  linha, inclusive dentro da mesma transação — `ctid` imutável nas chamadas 2..5 é a prova de
  que o UPDATE não aconteceu. A mutação M2 é a única que só é distinguível por ele.
- **E o valor do carimbo é posto num instante DISTINTIVO (2020-03-04) entre a 1ª e a 2ª
  chamada, de propósito.** Dentro de uma transação `now()` é constante: «o valor da 1ª
  chamada» e «o valor da 5ª» seriam iguais por acidente, e a asserção de preservação não
  afirmaria nada. Esta é a mesma classe do defeito que o 49-06 encontrou no verify do
  `oper31` — um instrumento que não pode discriminar.
- **As asserções NEGATIVAS carregam a prova da própria não-vacuidade.** «O no-op não
  arquivou» só vale acompanhado de «e o UPDATE aconteceu de verdade»: (b) e (c) exigem que o
  `ctid` MUDE. Sem essa metade, elas poderiam estar provando que o Postgres não escreveu
  nada — e passariam com o trigger desligado, com a tabela vazia, ou com o `WHEN` em `false`.
- **A metade que mantém o conserto honesto: cinco eventos que têm de CONTINUAR arquivando.**
  Suprimir o snapshot de uma mudança real é repúdio (T-49-07-01), e nenhuma asserção da
  Parte 1 o perceberia. (d) a `justificativa` (a forma do tombstone), (e) a redecisão pelo
  upsert, (f) o pedido de revisão do titular e a resposta `mantida`, (f2) a reabertura
  `revertida` — esta última é a mais cara de perder, porque veredito, reabertura e prazo vão
  no MESMO UPDATE e um snapshot suprimido apagaria os três de uma vez. Em cada uma, o
  conteúdo da linha arquivada é conferido como o estado **ANTES** (o snapshot lê `OLD`):
  o arquivo do pedido vem com `revisao_solicitada_em` NULL, o da reabertura com
  `reaberta_em` NULL.
- **A coluna nova que sumiria em silêncio passa a reprovar — e sem nenhuma lista literal de
  colunas no smoke.** A paridade (g) lê TRÊS fontes na execução: o catálogo de
  `decisao_final` (menos `{id, em}`, mais `decidido_em`), o catálogo de
  `decisao_final_historico` (menos `{id, arquivado_em}`), e a lista do INSERT extraída do
  `prosrc` VIVO de `snapshot_decisao_final`. As três dão 14, e a reprovação **nomeia** a
  coluna que falta de qual lado. A terceira fonte é o que impede o caso sutil: a tabela pode
  até ter a coluna — se o trigger não a copia, o arquivo guarda NULL e ninguém erra.
- **A premissa virou asserção viva (y).** O plano pedia, no Passo 1, conferir que nenhum
  trigger BEFORE UPDATE carimba um timestamp em `decisao_final` — é essa ausência que torna
  a lista de exclusão de duas colunas COMPLETA. Uma pré-condição lida uma vez não sobrevive
  ao carimbador de `updated_at` que alguém crie em 2027. A asserção (y) está no smoke e no
  pós-portão, e a mensagem dela manda a decisão ao operador (D-14) em vez de convidar a
  acrescentar a coluna à exclusão.
- **As 11 linhas do arquivo ficam (D-45 / ERASE-08).** Nenhuma escrita retroativa: as 5 sem
  mudança são todas de teste, e apagá-las seria mexer em trilha de auditoria para melhorar
  uma estatística. Medido 11 antes e 11 depois, e o pós-portão aborta o apply se o número
  cair.

## Task Commits

1. **Task 1 (tracer): o trigger com `WHEN` e o stamp idempotente** — `9a83da53` (feat)
2. **Task 2: o que tem de continuar arquivando + a paridade de colunas** — `18f28f74` (test)

**Ledger de PROD:**

| version | name | md5 do arquivo | md5 do ledger | octetos |
|---|---|---|---|---|
| 20260922000006 | p49_snapshot_so_com_mudanca | `bd1ffd1e3a783ae261dabc92b0c7dfb9` | `bd1ffd1e3a783ae261dabc92b0c7dfb9` | 20246 |

A `version` nasceu correta (nenhum reparo de ledger). A migration foi ENSAIADA em requisição
que aborta ANTES do apply.

## md5 e catálogo — antes e depois

| Objeto | Antes do apply | Depois (vivo) |
|---|---|---|
| `stamp_explicacao_acessada(uuid)` | `8d4aa9e3e9f163b055374c3d419b35fa` (555) | **`01b87885746b38ad725575ba40542f2b`** (633) |
| `snapshot_decisao_final()` | `5d5c25f714bc07e7c242628afe19ac37` (682) | **`5d5c25f714bc07e7c242628afe19ac37`** (682) — intacta de propósito |
| `trg_decisao_final_snapshot` | `AFTER UPDATE … FOR EACH ROW` (sem `WHEN`) | `… FOR EACH ROW WHEN ((((to_jsonb(old.*) - 'explicacao_solicitada_em'::text) - 'alerta_prazo_enviado_em'::text) IS DISTINCT FROM ((to_jsonb(new.*) - …))))` |
| `anon` com EXECUTE (stamp / snapshot) | `true` / `true` | **`false` / `false`** |
| `authenticated` com EXECUTE (stamp) | `true` | `true` |
| `decisao_final_historico` | 11 | **11** |

⚠ **O catálogo normaliza `to_jsonb(OLD)` para `to_jsonb(old.*)` e acrescenta `::text` aos
literais de chave** — sondado em requisição que aborta ANTES de escrever o pós-portão, porque
uma asserção que procurasse `to_jsonb(OLD)` maiúsculo reprovaria o apply correto. É a mesma
classe do `search_path=""` da Phase 45: o portão tem de falar o idioma do catálogo, não o do
arquivo.

## Varredura C3 e varredura de portões

**C3 (auditoria que dispara sem mudança, JORN-3b), re-executada em PROD:** 7 triggers AFTER
que escrevem/despacham. A classificação do kickoff bateu integralmente — `#1`
(`trg_decisao_final_snapshot`, `has_when = false`, copia `OLD` sem comparar) e `#7`
(`stamp_explicacao_acessada`, UPDATE sem filtro) eram os dois defeitos, e são os dois deste
plano. Os outros 5 são escopo deliberado (`trg_notif_*` comparam `OLD`/`NEW` no corpo ou já
têm `WHEN`; `trg_ai_cost_daily_anomaly` é 1 upsert/dia/linha pelo cron de agregação).

**Varredura de portões pela FORMA (`CLAUDE.md` §«Portões»):** abertura **288** linhas — o
mesmo fecho que o 49-06 registrou. Um único achado cita `decisao_final_historico`:

| Achado | Forma | Classificação |
|---|---|---|
| `p46_teardown_fixture.sql:291` — `r_dec_hist <> 0` | contagem contra constante | **escopo deliberado** (resíduo tem de ser ZERO); mesma classificação do 49-06 |

**Nenhum smoke pinava o corpo de `snapshot_decisao_final` nem de `stamp_explicacao_acessada`,
e nenhum vigiava o `WHEN` do trigger** (`grep` por `md5`/`pin`/`triggerdef` nas linhas que os
citam: zero acertos nos 9 arquivos que mencionam os três objetos). A vigilância nasceu aqui.

**Fecho: 299** linhas (+11, todas no `p49_snapshot_smoke.sql` novo). Classificadas:

| Linha | Forma | Classificação |
|---|---|---|
| `:181 v_n IS DISTINCT FROM 0` | contagem contra constante | escopo deliberado: 0 trigger BEFORE UPDATE é o invariante que sustenta a lista de exclusão do D-44 |
| `:330 / :353 / :362` `x_hfim - x_h0 IS DISTINCT FROM 0` | **delta contra baseline da própria execução** | não é fotografia: leitura, no-op e telemetria têm de arquivar NADA; 0 é invariante |
| `:368 / :521 / :534 / :540 / :550` `… IS DISTINCT FROM 1` | idem | escopo deliberado: uma versão por mudança real. 0 = arquivo suprimido; 2 = dois triggers na mesma função |
| `:651 l_cand <> 0 OR …` | idem | escopo deliberado (resíduo ZERO — um despacho commitado sai como e-mail) |
| `:683 pass <> 11` | contador do gate | escopo deliberado, com o bump 7 → 11 registrado no cabeçalho |

⚠ **A asserção (g) não aparece nesta varredura de propósito:** ela não compara contra
constante nem itera lista literal. Os três conjuntos são lidos do catálogo e do corpo vivo NA
EXECUÇÃO, e o que é comparado é um conjunto com o outro. As contagens globais de (z) também
não são fotografia — a baseline é capturada na própria execução (`smoke49s.n_cand`, `n_hist`,
`n_df`, `n_dfh`, `n_notif`, `n_netq`).

## Ensaio ANTES do apply

| Ensaio | Conteúdo (uma requisição, que aborta) | Resultado |
|---|---|---|
| 1 | `…000006` + `p49_snapshot_smoke` + `RAISE 'ENSAIO_OK'` | abortou em **`ENSAIO_OK`**, sem `FAIL` |

Além dele, uma **sonda de forma** anterior ao pós-portão: `DROP/CREATE` de um trigger
descartável com o mesmo `WHEN`, `pg_get_triggerdef` lido, e `RAISE` para abortar — é dela que
saiu a normalização `to_jsonb(old.*)` / `::text`.

## O portão morde (medido nesta sessão) — SETE inversões, uma por cláusula

Um smoke é fail-fast, e a lição do 49-06 é que uma mutação que desfaz vários consertos de uma
vez produz UM `FAIL` e deixa os demais **parecendo provados**. Cada cláusula ganhou a sua
inversão exata, aplicada em requisição atômica que aborta:

| Mutação | Inversão | Esperado | Saída |
|---|---|---|---|
| **M1** | trigger SEM `WHEN` (a definição anterior ao apply) | `FAIL (a)` | `P49S FAIL (a): 5 leituras da explicação criaram 2 linha(s) em decisao_final_historico (esperado 0)` |
| **M2** | `stamp_explicacao_acessada` com o corpo ANTERIOR (`COALESCE`, sem filtro, `RETURNING`) | `FAIL (a)` na cláusula do `ctid` | `P49S FAIL (a): as chamadas 2..5 ESCREVERAM na linha (ctid (0,21) -> (0,27))` — **e o arquivo ficou em 0**, que é a razão de o `ctid` existir |
| **M3** | filtro `IS NULL` presente, **re-SELECT removido** | `FAIL (a2)` | `P49S FAIL (a2): a 2ª chamada … devolveu <NULL>` |
| **M4** | `WHEN` excluindo TAMBÉM `justificativa` | `FAIL (d)` | `P49S FAIL (d): mudar justificativa criou 0 linha(s) no arquivo (esperado EXATAMENTE 1)` |
| **M5** | `WHEN` excluindo SÓ `explicacao_solicitada_em` (telemetria volta à comparação) | `FAIL (c)` | `P49S FAIL (c): mexer só em alerta_prazo_enviado_em + explicacao_solicitada_em criou 1 linha(s)` |
| **M6** | `CREATE TRIGGER … BEFORE UPDATE ON public.decisao_final` | `FAIL (y)` | `P49S FAIL (y): decisao_final ganhou 1 trigger(s) BEFORE UPDATE (trg_p49_mut_before_upd)` |
| **M7** | `ALTER TABLE public.decisao_final ADD COLUMN p49_sonda text` | `FAIL (g)` | `P49S FAIL (g): … Em decisao_final e NÃO no arquivo: {p49_sonda}. No arquivo e NÃO em decisao_final: {}` |

Em nenhuma delas a saída chegou a `MUTACAO_TERMINOU` — o marcador que apareceria se o portão
NÃO mordesse. **Nenhuma mutação vazou:** depois das sete, `md5(prosrc)` de
`stamp_explicacao_acessada` é `01b87885…` (o do pós-portão), a tabela tem 3 triggers e **0**
BEFORE UPDATE, `p49_sonda` não existe (conferido só leitura), e o `p49_snapshot_smoke` volta
a **11/11**.

**Honestidade sobre a (b).** Ela não tem inversão PRÓPRIA: a única mutação que a faria
reprovar é remover o `WHEN`, e nessa requisição o fail-fast para em (a) antes. (b) e a
cláusula de arquivo de (a) medem o MESMO conserto em formas de UPDATE diferentes, e o que ela
acrescenta é a forma «no-op puro» — registrado aqui em vez de apresentado como provado
separadamente.

## Regressão em PROD (Task 2)

| Smoke / prova | Como | Resultado |
|---|---|---|
| `p49_snapshot_smoke.sql` | `run` | **11 / 11** (paridade = 14 colunas) |
| `p48_reabertura_smoke.sql` | `run` | **13 / 13** — os casos (a)(g)(h) do ciclo dependem do snapshot |
| `p45_motor_exclusao_smoke.sql` | `run` | verde (gate por `RAISE` interno; exit 0, nenhum `FAIL`) — o tombstone REAL segue arquivando |
| `p48_prova_prod.sql` | `run` com `SET TRANSACTION READ ONLY` + o T0 da 48 (`2026-09-21T23:00:36Z`) | `p2_ciclo_zerado_e_arquivado` e `p2_d23` = **true** |

Nenhuma fixture precisou de ajuste. O `p48_prova_prod` continua verdadeiro porque os
snapshots que o sustentam foram gravados ANTES e ficam (D-45) — o conserto muda o futuro do
arquivo, não o passado dele.

## Deviations from Plan

### Registradas

**1. [Escopo — ampliação deliberada] A asserção (y) e o `REVOKE` de `snapshot_decisao_final`**
- **Found during:** Task 1, Passo 1
- **Issue:** o plano pede, no Passo 1, CONFERIR que nenhum trigger BEFORE UPDATE carimba um
  timestamp em `decisao_final` (e PARAR se houver — D-14). Medido 0, a pré-condição passou. Mas
  ela é a premissa que torna a lista de exclusão de duas colunas COMPLETA, e uma pré-condição
  lida uma vez não sobrevive ao trigger que nasce depois. Separadamente, medido que `anon`
  tinha `EXECUTE` em `snapshot_decisao_final` por grant direto do `pg_default_acl` — o mesmo
  achado que o 49-06 fechou nas outras três funções de trigger.
- **Fix:** a premissa virou a asserção (y), contada no gate e asserida também no pós-portão; e
  a migration acrescentou `REVOKE ALL … FROM PUBLIC, anon` em `snapshot_decisao_final()`. O
  CORPO dela **não** foi tocado (o pós-portão exige md5 idêntico, e ele bateu: `5d5c25f7…`).
- **Files modified:** os dois arquivos do plano
- **Verification:** mutação M6 reprova em (y); `has_function_privilege('anon', …)` = `false` nas
  duas; md5 de `snapshot_decisao_final` inalterado
- **Committed in:** `9a83da53`

**2. [Escopo — ampliação deliberada] Sete mutações em vez de uma, e (f2) separada de (f)**
- **Found during:** Tasks 1 e 3 do portão de mordida
- **Issue:** o plano pede explicitamente UMA prova de mordida (a do (g), por `ADD COLUMN`).
  Com um smoke fail-fast, as outras dez asserções ficariam sem prova PRÓPRIA. E a lista de
  `must_haves.truths` exige que «a reabertura» continue arquivando — o plano só pedia
  `responder_revisao_decisao('mantida')`, que não reabre.
- **Fix:** sete inversões exatas (M1..M7), uma por cláusula, e a asserção (f2) com
  `responder_revisao_decisao('revertida')`, que cobre a reabertura. Gate 11 em vez dos 9 que
  a leitura literal do plano daria.
- **Files modified:** `supabase/tests/p49_snapshot_smoke.sql`
- **Verification:** ver a tabela «O portão morde» — cada mutação reprovou na asserção dela
- **Committed in:** `9a83da53`, `18f28f74`

**3. [Processo] Portão de realimentação do tracer re-executou os verifies 2 e 3 por EQUIVALÊNCIA**
- **Found during:** portão de realimentação do tracer, depois da Task 1
- **Issue:** o `<verify>` #2 (ensaio) contém a migration, cujo pré-portão pina os md5 de
  ANTES — re-rodá-lo depois do apply aborta no pré-portão e produz falso negativo. O #3 começa
  por `p46apply migrate`, que por desenho recusa reaplicar uma `version` já no ledger. É a
  mesma forma do desvio 3 do 49-06.
- **Fix:** o portão re-executou o #1 literalmente, o smoke do #3 literalmente (7/7 na altura),
  e a asserção que o `migrate` faz — md5 do ledger lido de volta = md5 do arquivo em disco
  (`bd1ffd1e…`, 20246 octetos).
- **Files modified:** nenhum
- **Verification:** V1 OK; md5 batendo; smoke verde
- **Committed in:** n/a

**4. [Registro] `decisao_final_historico` com 11 linhas não aborta o apply — só avisa**
- **Found during:** Task 1, Passo 2
- **Issue:** o número 11 é uma MEDIÇÃO de 2026-09-22, não um invariante: o arquivo só aceita
  acréscimo (D-45), e uma decisão real registrada entre a medição e o apply o aumentaria
  legitimamente. Um pré-portão que abortasse em `<> 11` reprovaria trabalho correto — a
  classe de defeito que o `CLAUDE.md` §«Portões» descreve.
- **Fix:** o pré-portão emite `RAISE NOTICE` na divergência e guarda o valor lido; o
  pós-portão aborta só se o número **CAIU** (que é o que o D-45 proíbe).
- **Files modified:** `supabase/migrations/20260922000006_p49_snapshot_so_com_mudanca.sql`
- **Verification:** 11 antes, 11 depois; a asserção de queda não disparou
- **Committed in:** `9a83da53`

---

**Total deviations:** 4 (2 ampliações deliberadas de escopo, 1 de processo, 1 de forma de
portão). **Nenhuma correção das Regras 1–4 foi necessária:** o estado vivo medido bateu
integralmente com o que o plano assume — 11 linhas no arquivo, 5 sem mudança, o trigger sem
`WHEN`, a RPC sem filtro, zero trigger BEFORE UPDATE (o D-14 não foi acionado) e a varredura
de portões abrindo em 288.
**Impact on plan:** o artefato é MAIS forte que o pedido (11 asserções em vez de 9, 7
mutações em vez de 1). Nada aplicado em PROD além do que o plano especifica, mais o `REVOKE`
de `anon` na função de trigger.

## Registrado, não consertado

- **`JORN-3b` NÃO foi marcado como completo.** Ele é declarado também pelo **49-18**
  (`p49_prova_prod.sql`), que ainda não tem SUMMARY. `requirements.ready-ids` devolveu
  `blocked: [JORN-3b]`, e é o comportamento correto: o requisito só lê `Complete` quando o
  ÚLTIMO plano que o declara terminar. O 49-18 tem o que vigiar — as colunas `p3b_*` da prova
  podem se apoiar no `p49_snapshot_smoke.sql` como especificação.
- **Os 6 snapshots que o `WHEN` novo teria suprimido FICAM** (5 sem mudança alguma + 1 só de
  carimbo de leitura), todos de teste. D-45 / ERASE-08: o arquivo só aceita acréscimo, e
  apagá-los seria mexer em trilha de auditoria para melhorar uma estatística. O pós-portão
  aborta o apply se a contagem cair.
- **`useExplicacao.ts` não foi tocado.** A guarda por `useRef` zera a cada recarga — era o
  que transformava N recargas em N UPDATEs. Com o banco idempotente, a recarga deixa de ter
  efeito, e o conserto no front seria redundante por desenho (o servidor decide).
- **`p43_previa_smoke.sql:667`** segue usando a forma de lista literal (`proname IN (...)`)
  que o `CLAUDE.md` nomeia como ponto cego. Fora do escopo desta fase (vigia funções de
  retenção). Não tocado — mesma classificação do 49-06.
- **`resend-webhook.test.ts`** continua abortando ao resolver `npm:svix@1.99.1`.
  Pré-existente, já em `WINDOWS.md`, e fora de escopo deste plano — que não roda nenhum teste
  Deno (é SQL puro). **Não foi «consertado».**
- **A asserção (b) não tem inversão própria** (ver «Honestidade sobre a (b)», acima).

## Known Stubs

Nenhum. O plano produz DDL aplicado em PROD e SQL de teste: não há componente, valor vazio
codificado, texto de placeholder nem fonte de dados não ligada. O instante `2020-03-04` do
smoke **não é** placeholder — é um valor deliberadamente distintivo, e a razão dele está
escrita no cabeçalho e no comentário inline: dentro de uma transação `now()` é constante e a
asserção de preservação do carimbo seria vácua sem ele.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. O plano **remove**
superfície (dois `EXECUTE` de `anon`). As 4 mitigações declaradas ficaram provadas por
execução:

| Threat | Disposição | Prova em PROD |
|---|---|---|
| T-49-07-01 (mudança real sem snapshot — `WHEN` largo demais) | mitigate | smoke (d)(e)(f)(f2); mutações M4 e M5 reprovam; pós-portão CONTA as exclusões (4) em vez de conferir presença |
| T-49-07-02 (coluna nova em `decisao_final` sumindo do arquivo) | mitigate | smoke (g) de três fontes lidas na execução; mutação M7 (`ADD COLUMN`) reprova nomeando a coluna |
| T-49-07-03 (tombstone deixando de arquivar e quebrando a ordem snapshot → raspagem) | mitigate | `p45_motor_exclusao_smoke` re-rodado verde depois do apply; smoke (d) cobre a FORMA do tombstone |
| T-49-07-SC (supply chain) | mitigate | zero instalação de pacote; só SQL |

Adicional não previsto no `<threat_model>`, e fechado: `anon` tinha `EXECUTE` em
`stamp_explicacao_acessada` **e** em `snapshot_decisao_final` (grant direto do
`pg_default_acl`, que `REVOKE … FROM PUBLIC` sozinho não alcança). Revogado nas duas, com o
`anon` nomeado, e asserido pelo pós-portão — que também exige que `authenticated` NÃO perca o
`EXECUTE` da RPC do titular (uma revogação ampla demais tiraria dele a própria explicação).

## Issues Encountered

- **A sonda de normalização do catálogo foi necessária, e não opcional.** Um pós-portão que
  procurasse `to_jsonb(OLD)` maiúsculo reprovaria o apply CORRETO: o catálogo emite
  `to_jsonb(old.*)` e acrescenta `::text` aos literais de chave. Sondado em requisição que
  aborta antes de escrever o portão. É a mesma classe do `search_path=""` da Phase 45.
- `tsc` segue em **89**, com teto 90 (D-53). Este plano não acrescentou nenhum erro — não
  toca `src/` nem `supabase/functions/`. A margem de 1 continua valendo para os planos
  seguintes.

## User Setup Required

None — nenhuma configuração de serviço externo. O token do Supabase já está no Keychain
(serviço "Supabase CLI", conta "supabase").

## Next Phase Readiness

**Pronto.** O que este plano entrega e quem o consome:

- **`49-14`** (o motor que apaga o que o recibo promete) herda a garantia de que o passo
  `tombstone_decisao_final` continua arquivando: `justificativa` está DENTRO da comparação, o
  smoke (d) vigia a forma, e o `p45_motor_exclusao_smoke` a instância real. ⚠ **O plano 49-14
  acrescenta sentinelas a `revisao_resultado` no MESMO UPDATE do tombstone (D-60)** — essa
  coluna também está dentro da comparação, então o arquivamento continua; e se ele
  acrescentar COLUNA nova a `decisao_final`, a asserção (g) vai reprovar até que a coluna
  entre no arquivo e no INSERT de `snapshot_decisao_final`. Isso é o portão funcionando.
- **`49-10` / `49-12`** podem redefinir `registrar_decisao`/`responder_revisao_decisao` sem
  medo de perder o arquivo: (e), (f) e (f2) são a especificação executável do que cada uma
  tem de arquivar, com o conteúdo da linha conferido como o estado ANTES.
- **`49-18`** (`p49_prova_prod.sql`) tem o que vigiar nas colunas `p3b_*`: o par «nenhum
  snapshot cujo único delta seja `explicacao_solicitada_em` depois do T0» e «uma linha de
  arquivo por mudança real». E fecha o `JORN-3b`, que este plano deixou `blocked` de propósito.
- **Quem acrescentar coluna a `decisao_final` em qualquer plano**: a asserção (g) reprova até
  que ela entre em `decisao_final_historico` **e** no INSERT de `snapshot_decisao_final`. As
  duas metades, porque a tabela ter a coluna sem o trigger copiá-la guarda NULL em silêncio.

**Atenção para os planos seguintes:** `tsc` em 89, teto 90 (D-53) — margem de um.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-22*

## Self-Check: PASSED

- `supabase/migrations/20260922000006_p49_snapshot_so_com_mudanca.sql` — FOUND
- `supabase/tests/p49_snapshot_smoke.sql` — FOUND
- commit `9a83da53` — FOUND · commit `18f28f74` — FOUND
- `commits: 2` MEDIDO por `git rev-list --count c2a55e5f..HEAD`, não narrado
- `<acceptance_criteria>` das 2 tasks re-executados: verdes (`pg_get_triggerdef` e
  `md5(prosrc)` lidos de PROD; `decisao_final_historico` = 11 antes e depois; (g) passa E
  morde)
- `<verification>` de plano re-executada: migration com md5 do ledger batendo
  (`bd1ffd1e…`, 20246 octetos), `p49_snapshot` 11/11, `p48_reabertura` 13/13,
  `p45_motor_exclusao` verde, mutação de coluna reprovando em (g), prova da 48 intacta,
  `tsc` 89
