---
phase: 48-consertos-da-jornada-bloco-1
plan: 01
subsystem: database
tags: [jorn-26, candidatura-encerrada, predicado-canonico, knockout, fila-de-trabalho, funil, smoke, prod]

requires:
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-VARREDURA-ETAPA-ATUAL.md — as seis instâncias vivas da forma «acabou = etapa_atual», classificadas (D1..D6)"
  - phase: 45-motor-de-exclus-o-anonimiza-o
    provides: "registrar_pedido_exclusao / retirar_candidatura (corpos vivos) e o idioma de fixture do p45_motor_exclusao_smoke"
provides:
  - "public.candidatura_encerrada(etapa_processo, status_candidatura) — IMMUTABLE, allowlist de terminais NULL-safe, sem anon"
  - "D1 registrar_pedido_exclusao, D2 retirar_candidatura, D3 rejeitar_candidatura (trava de re-rejeição), D4 v_fila_trabalho, D6 funil_kpis — todos pelo predicado canônico, em PROD"
  - "supabase/tests/p48_candidatura_encerrada_smoke.sql — tabela-verdade lida do pg_enum + comportamento de D1–D6 + negativa de resíduo"
affects: [48-02, 48-08, 48-09]

actuals:
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Tabela-verdade sobre o vocabulário VIVO (pg_enum na execução) contra expressão independente; os valores terminais nomeados na especificação têm de existir no enum (rename reprova, não passa por vacuidade)"
    - "Prova de que o portão morde pela mesma requisição atômica: reinstalar o predicado antigo + rodar o smoke → reprova e a transação aborta; md5 vivo idêntico antes/depois"

key-files:
  created:
    - supabase/migrations/20260921000001_p48_candidatura_encerrada.sql
    - supabase/migrations/20260921000002_p48_encerrada_demais_instancias.sql
    - supabase/tests/p48_candidatura_encerrada_smoke.sql
  modified:
    - supabase/tests/p45_motor_exclusao_smoke.sql

key-decisions:
  - "funil34_kpis_smokes.sql NÃO foi editado: passou verde contra a regra nova depois do apply, logo não codificava o volume antigo por etapa (o plano o nomeava como suspeito)"
  - "ACL de rejeitar_candidatura e funil_kpis preservado (ambos concedem EXECUTE a anon hoje; os guards de corpo fecham) — registrado em deferred-items, fora do escopo"
  - "oper31/funil34/seg32 rodados em envelope que aborta, não com `p46apply run` puro: os três COMMITAM fixture ligada a candidato real (deferred-items)"

requirements-completed: [JORN-26]

duration: ~2 sessões (Tasks 1–2 na sessão anterior; Task 3 fechada nesta, 2026-09-21)
completed: 2026-09-21
---

# Plano 48-01 — predicado canônico `candidatura_encerrada` · SUMMARY

**Um único critério de «esta candidatura acabou» no banco, e as cinco instâncias vivas que
decidiam só por `etapa_atual` consertadas por ele — aplicado e provado por execução em PROD.**

## ⚠ Nota de continuidade

As Tasks 1 e 2 foram executadas e aplicadas por uma sessão anterior (commits `2ed92d5e`,
`bd8b5146`), que parou no meio da Task 3 com o smoke escrito e *staged*. Esta sessão
fechou o plano: conferiu o ledger contra os arquivos, rodou o smoke, provou que ele morde,
commitou (`1ae0169d`) e publicou. O portão de retomada do `execute-phase` (commits de
produção sem SUMMARY) é o motivo de este fechamento ter sido feito à mão.

## O que ficou em PROD

| Objeto | Mudança | Prova |
|---|---|---|
| `candidatura_encerrada(etapa, status)` | **nova** — etapa ∈ {aprovado, rejeitado} OU status ∈ {rejeitado, finalizado}, COALESCE para false | `provolatile='i'`, `anon` sem EXECUTE, `authenticated` com EXECUTE (medido pós-apply) |
| `registrar_pedido_exclusao` (D1) | UPDATE por `NOT candidatura_encerrada(...)` | smoke (c); p45 C6 + C6-neg |
| `retirar_candidatura` (D2) | guard e UPDATE pelo predicado; `22023 CANDIDATURA_NAO_RETIRAVEL` inalterado | smoke (d) |
| `rejeitar_candidatura` (D3) | guard terminal → `check_violation «já encerrada»`; UPDATE único byte a byte o mesmo (md5 do trecho conferido na migration) | smoke (e) |
| `v_fila_trabalho` (D4) | filtro pelo predicado; mesmas colunas, mesma ordem, `security_invoker` | fila **24 → 18**; encerradas na fila = **0**; smoke (f) |
| `funil_kpis` (D6) | CTE `volume` sem encerradas nas etapas de trabalho; baldes terminais preservados | smoke (g) — cada etapa do enum vivo contra contagem direta |

### Ledger (md5 de `statements[1]` lido de volta = md5 do arquivo local)

| version | nome | md5 |
|---|---|---|
| `20260921000001` | `p48_candidatura_encerrada` | `5f77188573d5e70fa68e39ec28f30773` |
| `20260921000002` | `p48_encerrada_demais_instancias` | `87fd698ff85578ffc08bcc9bfc522a59` |

### Linhas de base medidas antes do apply (pré-portões das migrations)

| Objeto | md5(prosrc / viewdef) vivo antes |
|---|---|
| `registrar_pedido_exclusao` | `a4bd1c2438d382da5d81bb764ee8aeb6` (4681 octetos) |
| `retirar_candidatura` | `c55efb56825bb31908a216855717f9d0` |
| `rejeitar_candidatura` | `04312b1054eabe5c9de0e7e33af925d2` |
| `funil_kpis` | `375d2fc7cbda3984db300d883fea9c65` |
| `v_fila_trabalho` | `598378aa29bb1c1003b4b19adb934197` |
| `candidaturas_alem_da_janela` (purga) | `b4fdb3a1243f9375cd15a61ef27189f1` |

Divergências do vivo contra os arquivos de origem: **só comentários** (o vivo de
`rejeitar_candidatura` e `funil_kpis` tem comentários resumidos — transcrição do
`apply_migration` do MCP) e uma linha em branco em `retirar_candidatura`. Nenhuma
divergência de código.

### ⊖ A purga não foi tocada (D-21)

`md5(prosrc)` de `candidaturas_alem_da_janela()` = `b4fdb3a1…` antes dos dois applies
**e** medido de novo em 2026-09-21 depois deles. D5 (o knockout nunca é purgável) segue
em Deferred.

## Smokes

| Smoke | Resultado | Como rodou |
|---|---|---|
| `p45_motor_exclusao_smoke.sql` | **25/25** (era 24; +C6-neg) | `p46apply run` |
| `oper31_rejeitar_candidatura_smokes.sql` | verde (`smoke.ready=y`) | envelope que aborta — ver deferred-items |
| `funil34_kpis_smokes.sql` | verde | envelope que aborta |
| `seg32_smokes.sql` | verde | envelope que aborta |
| **`p48_candidatura_encerrada_smoke.sql`** | **8/8** (a..h), zero resíduo em 6 tabelas | `p46apply run` |

**O portão morde (medido nesta sessão).** Com o predicado antigo — `COALESCE(p_etapa IN
('aprovado','rejeitado'), false)` — reinstalado na MESMA requisição atômica antes do smoke,
a asserção (a) reprova e lista os 14 pares que o predicado antigo erra (`(inscricao,
rejeitado)`, `(triagem, finalizado)`, …, `(NULL, rejeitado)`). A transação aborta; o
`md5(prosrc)` vivo da função é `7737ca3b9edadeb8a3597dd53d0be3aa` antes e depois.

## Varredura de portões (D-17)

Padrão do CLAUDE.md sobre `supabase/tests/*.sql`: **252** linhas (244 antes deste plano; as
8 novas são do próprio `p48_candidatura_encerrada_smoke.sql`). Achados que citam objeto
deste plano, classificados:

- `p48…smoke.sql:406/442/445/448/459/462` — **escopo deliberado**: contagens sobre a
  fixture sintética (1 em andamento; knockout e finalizado fora; deltas +1/+0) e o
  invariante «zero encerradas na fila», que não envelhece.
- `oper31…:224` — **escopo deliberado**: delta antes/depois de uma única rejeição.
- `p45_motor_exclusao_smoke.sql:1509` — **escopo deliberado**: a lista é o conjunto das
  RPCs SECURITY DEFINER do motor de exclusão com ACL decidido; `candidatura_encerrada`
  não é DEFINER nem do motor e corretamente fica fora.

## Deviations

Nenhuma de código. Registro de processo: o fechamento da Task 3 foi feito pelo orquestrador
(retomada), não pelo executor que começou o plano.

## Achados registrados (não consertados — fora de escopo)

Em `deferred-items.md`: smokes que commitam fixture de candidato real (oper31/funil34/seg32);
oper31/seg32 engolem falha de fixture como SKIP silencioso; `anon` com EXECUTE em
`rejeitar_candidatura` e `funil_kpis`; cabeçalho do p45 afirmando survivor-guard que não
existe em `trg_candidatura_analise` (é o JORN-24); COMMENT desatualizado de
`retirar_candidatura`.

## Publicação

A mudança da fila e do KPI é visível na tela do RH e não depende de front novo (é o banco).
Push de `main` feito nesta sessão; `git log --oneline origin/main..HEAD` vazio conferido
depois.

## Self-Check: PASSED

- Duas migrations no ledger com md5 = arquivo local ✓
- Função canônica IMMUTABLE, sem anon ✓ · fila sem encerradas (0 de 18) ✓ · purga intocada ✓
- p45 25/25, p48 8/8, regressões verdes ✓ · portão prova que morde ✓
