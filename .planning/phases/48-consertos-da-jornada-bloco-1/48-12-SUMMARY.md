---
phase: 48-consertos-da-jornada-bloco-1
plan: 12
subsystem: dados-retroativos
status: complete
tags: [jorn-26, jorn-22, d-18, d-14, retroativo, ensaio, prod, lgpd-art-20]

requires:
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-01 — conserto do Defeito 26 (registrar_pedido_exclusao não carimba mais knockout)"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-09 — rejeitar_candidatura grava o feedback_rejeicao neutro (migration 000009) e a explicação humana_triagem"
provides:
  - "supabase/tests/p48_retroativos_ensaio.sql — ensaio revertido das duas escritas, com controle positivo da fila"
  - "migration 20260921000013 — desfaz as 2 marcas de encerrada_a_pedido_em em knockout (PROD, md5 e5186b22…)"
  - "migration 20260921000014 — feedback_rejeicao neutro na rejeição de triagem anterior ao conserto (PROD, md5 536d6198…)"
affects: [48-17, 48-18]

actuals:
  tokens: 5000
  tasks: 3
  commits: 2
plan_head_before: bf7ba9db708228a43e9a6df429e383e1e1dfef31

tech-stack:
  added: []
  patterns:
    - "Escrita retroativa com portão por conjunto exato de ids (IS DISTINCT FROM array autorizado), ROW_COUNT exato e deltas zero de fila pg_net / histórico / notificações"
    - "Ensaio da PRÓPRIA migration antes do apply: cópia com DO final que sempre lança exceção (REVERTE_OK) + cópia com id trocado provando que o portão morde"

key-files:
  created:
    - supabase/tests/p48_retroativos_ensaio.sql
    - supabase/migrations/20260921000013_p48_retro_desfaz_encerrada_knockout.sql
    - supabase/migrations/20260921000014_p48_retro_feedback_rejeicao_triagem.sql
  modified: []

key-decisions:
  - "Operador escolheu «ambos» no checkpoint:decision do 48-12 (2026-09-21, depois do ensaio das 12:09): aplicar (A) e (B)"
  - "Lista literal de ids nas migrations é escopo deliberado (a autorização), não fotografia — conjunto diferente aborta (D-14)"

requirements-completed: [JORN-26, JORN-22]

duration: ~60min (incluindo a espera do checkpoint)
completed: 2026-09-21
---

# Phase 48 Plan 12: Escritas retroativas (JORN-26 · JORN-22) Summary

**As 2 marcas falsas de «encerrada a pedido» em knockout foram desfeitas e a rejeição de triagem anterior ao conserto recebeu o feedback neutro da RPC. Ambas as escritas foram aplicadas em PROD por migrations com portão por id, `ROW_COUNT` exato e fila do pg_net inalterada. Nenhum e-mail foi disparado.**

## Decisão do operador

- **Escolha literal:** `ambos`, aplicar (A) e (B). Foi dada na retomada do checkpoint:decision (`gate="blocking-human"`) de 2026-09-21, depois do relatório do ensaio das 12:09 (-03).
- Nenhuma opção foi recusada. Por isso os dois arquivos existem e os dois foram aplicados.

## Ensaio (Task 1, commit `d7cfa560`)

Relatório gerado em PROD às 12:09 (-03) pela mesma query que faz a escrita:

```
ENSAIO OK: desfazer=2 (25a4231c-612b-4f86-9c5a-904ca09f18f4, 92522073-484c-46a3-9e9d-8e80afa3c062)
           backfill=1 (bf26ee3c-0ae3-4e92-a99b-6e05efc2a662)
           fila_delta=0 historico_delta=0 notif_delta=0 controle_fila=1
```

`controle_fila=1` prova que a medida da fila funciona: ao re-marcar NULL→NOT NULL, o aviso ao RH entraria na fila. Com isso, `fila_delta=0` vale como evidência.

## Contagens antes e depois

| Medida (só leitura, via `p46apply sql`, `SET TRANSACTION READ ONLY`) | Antes (re-medido 13:0x, antes do apply) | Depois |
|---|---|---|
| (A) knockouts com `encerrada_a_pedido_em` não nulo | 2: `25a4231c…` (2026-09-20 20:38:25-03), `92522073…` (2026-09-06 12:35:07-03) | **0** |
| (B) rejeições humanas sem feedback, sem `decisao_final` e fora do knockout | 1: `bf26ee3c…` (NULL) | **0** |
| `bf26ee3c…`.`feedback_rejeicao` | NULL | «Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.» |
| `net.http_request_queue` | 0 | 0 |

A nova medição antes do apply devolveu os mesmos 3 ids do ensaio, então não houve divergência (D-14). O `feedback_rejeicao` dos dois knockouts continua com o texto do knockout, que não foi tocado. `updated_at` das 3 linhas passou a 2026-09-21 13:04:31/32-03 pelo `update_candidaturas_updated_at`. Esse efeito colateral era conhecido.

## Apply

| Migration | octetos | md5 (arquivo = ledger) |
|---|---|---|
| `20260921000013_p48_retro_desfaz_encerrada_knockout.sql` | 4882 | `e5186b22b2a8181e5fe456bf5b4556d4`: «md5 do ledger BATE» |
| `20260921000014_p48_retro_feedback_rejeicao_triagem.sql` | 4887 | `536d61981084ca7341950ac4b020573a`: «md5 do ledger BATE» |

Antes do apply, cada migration passou por dois testes com `p46apply run` sobre cópias no scratchpad:
1. **Ensaio da própria migration:** a cópia termina com um `DO` que sempre lança exceção. Resultado: `REVERTE_OK` nas duas, ou seja, o portão aceita o escopo real e a escrita é revertida.
2. **Prova de que o portão morde:** na cópia, um id autorizado foi trocado por `0f7b217c…`. Resultado: `JORN-26 (A): o predicado devolveu {…} — a autorizacao e para exatamente {…}` e `JORN-22 (B): …` equivalente. As duas abortaram antes de escrever.

## Task Commits

1. **Task 1 (tracer): ensaio revertido**: `d7cfa560` (test)
2. **Task 2: checkpoint:decision**: sem commit (decisão `ambos`)
3. **Task 3: as duas migrations aplicadas**: `e4acb976` (fix)

Contagem de commits: `plan_head_before` (`bf7ba9db`, ledger gravado antes do tracer) `..HEAD` dá 10 commits. Oito deles são do 48-13, que rodou enquanto este plano esperava o checkpoint. Filtrados por `(48-12)`, sobram **2**, e esse é o número em `actuals.commits`.

## Deviations from Plan

**1. [Rule 2 - Conferência a mais] O portão também verifica `historico_candidatura` e `notificacoes_enviadas`**, além da fila do pg_net. O ensaio media esses dois deltas, e a migration aborta se algum deles mudar. Isso não muda o escopo da escrita.

**2. [Rule 2 - Prova de portão] A própria migration foi ensaiada antes do apply e foi provado que o portão morde.** O plano não pedia isso. Segue a orientação do CLAUDE.md: um portão só vale se falhar quando deve.

Fora isso, o plano foi executado como escrito.

## Issues Encountered

Nenhum. `tsc` = 90 (dentro do teto de 90).

## Next Phase Readiness

- A candidata `bf26ee3c…` (+claude4) volta a alcançar o cartão «Entenda a decisão» e a explicação `humana_triagem`. Isso serve de material de prova para o 48-18.
- O veredito de export LGPD não muda aqui: nenhuma coluna nova.

## Self-Check: PASSED

- FOUND: supabase/tests/p48_retroativos_ensaio.sql
- FOUND: supabase/migrations/20260921000013_p48_retro_desfaz_encerrada_knockout.sql
- FOUND: supabase/migrations/20260921000014_p48_retro_feedback_rejeicao_triagem.sql
- FOUND: d7cfa560, e4acb976
- Ledger: 000013 e 000014 com md5 igual ao do arquivo
