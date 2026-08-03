---
phase: 42-invent-rio-gates-fila-art-20
plan: 02
subsystem: compliance
tags: [lgpd, art20, inventario, postgres, read-only, fato-datado]

requires:
  - phase: 15-decis-o-final-audit-vel-lgpd-art-20
    provides: "`decisao_final.revisao_solicitada_em` e a RPC `solicitar_revisao_decisao` — o produtor dos pedidos que este plano mede"
provides:
  - "`docs/compliance/` criada e indexada — a pasta que as Phases 44 e 45 consomem"
  - "A resposta datada para 'quantos pedidos de revisão Art. 20 estão pendentes em PROD'"
  - "A query read-only versionada que reproduz esse número"
  - "O fundamento medido para o `LIMIT 200` dos planos 42-06 e 42-09"
affects: [42-06, 42-09, 44-exportacao, 45-motor-exclusao]

tech-stack:
  added: []
  patterns:
    - "Artefato de compliance = número + data de coleta + query reprodutora, versionados juntos"

key-files:
  created:
    - docs/compliance/README.md
    - docs/compliance/sql/03-art20-backlog.sql
    - docs/compliance/art20-backlog.md
  modified: []

key-decisions:
  - "Semântica canônica de 'dias de espera' é a de CALENDÁRIO (33), não a de intervalo (32) — alinha o artefato ao que a fila exibirá"
  - "A consulta carrega ambos os predicados de 'pendente' (pré e pós migration 42-06) escritos no arquivo, para que a re-medição não dependa de memória"
  - "O detalhamento foi executado com projeção sem identificadores — mesma verificação, menos PII atravessando para o contexto"

patterns-established:
  - "docs/compliance/ como fonte de fato datado fora de .planning/, porque os consumidores (Phases 44/45) chegam depois de a fase virar arquivo morto"
  - "Asserção negativa de PII por regex de UUID como critério de aceitação de artefato versionado"

requirements-completed: [REVISAO-06]

coverage:
  - id: D1
    description: "Existe no repositório uma resposta datada e reproduzível para 'quantos pedidos de revisão Art. 20 estão pendentes em PROD', entregue antes de qualquer tela da fase"
    requirement: "REVISAO-06"
    verification:
      - kind: other
        ref: "mcp supabase execute_sql contra isljnozzlvckrgjjbjwp — agregado retornou pendentes=1, coletado_em_utc=2026-07-29 13:48:23"
        status: pass
      - kind: other
        ref: "test -f docs/compliance/art20-backlog.md && grep -c 'sql/03-art20-backlog.sql' == 2"
        status: pass
    human_judgment: false
  - id: D2
    description: "A query do passivo é comprovadamente read-only e segura em PROD"
    requirement: "REVISAO-06"
    verification:
      - kind: other
        ref: "grep -vE '^\\s*--' docs/compliance/sql/03-art20-backlog.sql | grep -icE '\\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\\b' == 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nenhum identificador de pessoa atravessou de PROD para o artefato versionado"
    requirement: "REVISAO-06"
    verification:
      - kind: other
        ref: "grep -cE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' docs/compliance/art20-backlog.md == 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "docs/compliance/ existe com índice antecipado dos 7 artefatos da fase e das 3 queries reprodutoras"
    requirement: "REVISAO-06"
    verification:
      - kind: other
        ref: "test -f docs/compliance/README.md; grep -c 'docs/sql/sql' == 1 (fonte de schema fora do ledger nomeada)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-29
status: complete
---

# Phase 42 / Plan 02: Passivo Art. 20 — Summary

**Há uma pessoa real esperando 33 dias por uma revisão que ninguém podia ver — agora isso é um fato datado no repositório, medido antes de a primeira tela da fase existir.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-29
- **Tasks:** 3/3 (Task 2 foi checkpoint de orquestrador — execução ao vivo em PROD)
- **Files created:** 3

## Accomplishments

- **REVISAO-06 satisfeito e datado.** `pendentes = 1`, esperando **33 dias de calendário** desde
  `2026-06-26 21:01:33-03`. Coleta em `2026-07-29 13:48:23 UTC`.
- **A ordem normativa do critério de sucesso #4 é observável no histórico do Git** — este commit
  (`50738c1`) antecede qualquer plano de UI da fase.
- **`docs/compliance/` criada e indexada antecipadamente** com os 7 artefatos previstos e as 3
  queries reprodutoras, mais as regras da pasta (fato datado, reprodutível, zero identificador,
  inventário do catálogo vivo e não de migrations).
- **O `LIMIT 200` deixou de ser chute:** passivo 1 contra cap 200 — folga de 199 (99,5 %). Sem
  achado bloqueante.
- **Primeiro commit sob o gate de não-regressão** convertido pelo plano 42-01, sem `--no-verify`:
  o hook rodou e imprimiu `tsc errors: 97 (frozen baseline: 97)`.

## Task Commits

1. **Task 1: pasta + índice + query versionada** — incluído em `50738c1`
2. **Task 2 (CHECKPOINT): execução ao vivo em PROD** — sem commit (leitura)
3. **Task 3: artefato datado** — incluído em `50738c1`

_Os três artefatos foram commitados juntos porque a Task 3 depende do output ao vivo da Task 2; um
commit intermediário teria registrado um artefato sem o número que é a razão de ele existir._

## Files Created

- `docs/compliance/README.md` — índice da coleta, regras da pasta, consumidores (Phases 44/45)
- `docs/compliance/sql/03-art20-backlog.sql` — a consulta read-only, com os dois predicados e as duas semânticas de dias
- `docs/compliance/art20-backlog.md` — o resultado datado, o dimensionamento e os limites do artefato

## Decisions Made

- **Semântica de "dias de espera" canonizada como calendário.** Ver Achados.
- **Detalhamento executado com projeção sem identificadores.** A consulta (b) do plano devolve
  `candidatura_id` e `por_usuario`. Como o único uso desses valores era contar linhas e obter a
  distribuição de `dias_em_espera`, rodei uma projeção agregada equivalente — mesma verificação,
  sem trazer PII para o contexto. A consulta (b) permanece no arquivo `.sql` na forma completa,
  para inspeção ao vivo quando alguém precisar dela.

## Achado — duas semânticas de "dias de espera" divergindo em 1

A consulta proposta em `42-RESEARCH.md` §E9 mede a maior espera com
`EXTRACT(day FROM now() - ts)` — que **trunca o intervalo** e devolve **32**. O `42-CONTEXT.md`
trava a fila em *"dias corridos inteiros"* via `date-fns differenceInCalendarDays` — que **conta
fronteiras de calendário** e devolve **33**. Mesma linha, mesmo instante, dois números.

Nenhuma das duas está errada; são definições distintas. Mas um artefato dizendo "32" enquanto o
badge da fila diz "33" é exatamente a classe de inconsistência silenciosa que este milestone existe
para eliminar. **Canonizei a semântica de calendário** (a que o CONTEXT trava e a que o RH verá) e
registrei as duas formas lado a lado, com a origem da divergência, tanto no `.sql` quanto no
artefato.

A divergência só apareceu porque as duas foram executadas contra PROD lado a lado — não era
detectável por leitura.

## Deviations from Plan

1. **Critério de aceitação `grep -c == 1` por coluna do agregado → medido 2.** O `<action>` da
   Task 1 exige escrever também a forma pós-migration do predicado no arquivo; isso necessariamente
   duplica os nomes de coluna. O critério foi escrito sem contar com a exigência do próprio action.
   Cumpri o `<action>` (a intenção: os 4 nomes presentes e a segunda forma registrada) e registro
   aqui a tensão. **Não é lacuna de cobertura.**
2. **A verificação de "write verbs == 0" precisou excluir comentários.** O `grep` do critério, como
   escrito, casa as palavras dentro do cabeçalho explicativo (que fala em `INSERT`/`UPDATE`/… para
   declarar que não os contém). Rodei a asserção sobre linhas não-comentário — que é o que a
   asserção quer dizer. Resultado: **0**.
3. **Um commit em vez de três.** Justificado acima.

## Notas para as fases seguintes

- **A fila não nascerá vazia.** Quem validar a Phase 42 deve encontrar exatamente 1 item, no pior
  patamar do badge (33+ dias). Uma fila vazia na primeira abertura é sinal de defeito de leitura,
  não de ausência de passivo.
- **Toda re-medição pós-migration 42-06 tem de usar `revisao_respondida_em IS NULL`.** A forma está
  escrita e comentada no `.sql`.
- **`docs/compliance/README.md` já indexa os artefatos dos planos 42-04 e 42-05.** Eles não devem
  editá-lo; se um artefato mudar de nome, quem muda edita o índice na própria wave.
