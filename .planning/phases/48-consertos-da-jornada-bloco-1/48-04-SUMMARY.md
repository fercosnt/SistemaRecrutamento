---
phase: 48-consertos-da-jornada-bloco-1
plan: 04
subsystem: api
tags: [jorn-24, d-02, knockout, analise-ia, edge-function, lgpd, migration, prod]

requires:
  - phase: 10-triagem-rh-com-ia-comparativo-etapa-2
    provides: "EF analise-candidato-individual + trg_candidaturas_analise (AFTER INSERT → pg_net)"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-RESEARCH §F — predicado D-02 e as 3 linhas medidas"
provides:
  - "EF analise-candidato-individual v29 em PROD: guarda de knockout antes da marca `pendente` e de qualquer callAi (200 {ok:true, skipped:\"knockout\"})"
  - "analise_candidato_vaga.descartada_em + descartada_motivo, com CHECK de vocabulário e CHECK de coerência, em PROD"
  - "as 3 análises pós-knockout marcadas `knockout_automatico` — nenhuma apagada"
affects: [48-17, 48-18, defeito-25]

actuals:
  tokens: 4694
  tasks: 2
  commits: 3
plan_head_before: 946c0ee2736be785281442cbc665afbfe956a51b

tech-stack:
  added: []
  patterns:
    - "Guarda de estado pós-COMMIT na EF (não no trigger AFTER INSERT) — mesmo idioma do survivor-guard de notificar-candidato"
    - "Escrita retroativa autorizada com portão de escopo EXATO dentro do DO: conjunto do predicado = lista autorizada, ROW_COUNT = n, total inalterado; ensaio em envelope que aborta (caminho feliz + lista adulterada) antes do apply"

key-files:
  created:
    - supabase/migrations/20260921000004_p48_analise_descartada_knockout.sql
  modified:
    - supabase/functions/analise-candidato-individual/index.ts
    - supabase/functions/analise-candidato-individual/__tests__/index.test.ts

key-decisions:
  - "JORN-24: erro na leitura da candidatura deixou de ser descartado — falha FECHADA (linha falhou, nenhum dado ao provedor de IA), porque sem o estado não dá para saber se o knockout já eliminou"
  - "JORN-24: log do skip só com candidatura_id + skipped (console.log direto; a EF não tem logSeguro)"
  - "D-02: marca por coluna (descartada_em/descartada_motivo), não valor novo em status — status é lido por v_triagem_panel, v_analises_presas, fila e hub"

requirements-completed: [JORN-24]

coverage:
  - id: D1
    description: "A EF não analisa quem o knockout eliminou: 200 skipped:'knockout', sem linha e sem chamada de IA; rejeição humana sem opcao_knockout_id e candidatura em andamento seguem analisadas"
    requirement: JORN-24
    verification:
      - kind: unit
        ref: "supabase/functions/analise-candidato-individual/__tests__/index.test.ts#JORN-24 — knockout (rejeitado + opcao_knockout_id) → 200 skipped:'knockout', nenhuma escrita, nenhuma IA"
        status: pass
      - kind: unit
        ref: "supabase/functions/analise-candidato-individual/__tests__/index.test.ts#JORN-24 — candidatura em andamento / rejeição humana / leitura com erro (3 testes)"
        status: pass
      - kind: other
        ref: "node efdeploy.cjs analise-candidato-individual (v29) + GET /functions/analise-candidato-individual/body | grep -c knockout → 14"
        status: pass
    human_judgment: false
  - id: D2
    description: "Colunas de descarte + CHECKs em PROD e as 3 análises pós-knockout marcadas, total da tabela inalterado (20 → 20)"
    requirement: JORN-24
    verification:
      - kind: integration
        ref: "node p46apply.cjs migrate supabase/migrations/20260921000004_p48_analise_descartada_knockout.sql → md5 do ledger BATE"
        status: pass
      - kind: integration
        ref: "p46apply sql READ ONLY: marcadas=3, total=20, 2 colunas, 2 CHECKs; CHECKs recusam em envelope que aborta"
        status: pass
    human_judgment: false
  - id: D3
    description: "Prova em PROD com inscrição real eliminada por knockout (nenhuma linha nova em analise_candidato_vaga, nenhum ai_call_logs)"
    requirement: JORN-24
    verification: []
    human_judgment: true
    rationale: "Exige uma inscrição real com knockout em PROD — é do plano 48-18 por desenho do plano; este plano provou no handler e no bundle deployado"

duration: 5min
completed: 2026-09-21
status: complete
---

# Phase 48 Plan 04: IA para de analisar quem o knockout eliminou Summary

**`analise-candidato-individual` v29 lê a candidatura antes de marcar `pendente` e devolve `skipped:"knockout"` sem tocar a IA; as 3 análises que já existiam nessa condição foram marcadas `descartada_motivo='knockout_automatico'` em PROD, com portão de escopo exato e nenhuma linha apagada.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-21T13:07:07Z
- **Completed:** 2026-09-21T13:12:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- **Parte (a), o conserto principal:** a guarda de knockout mora na EF, antes da marca `pendente` e de qualquer `callAi`. Predicado: `status === 'rejeitado' && opcao_knockout_id != null` (as duas condições). A leitura da candidatura subiu para o topo do `try` e passou a ser a única (sem ler duas vezes); `opcao_knockout_id` entrou na allowlist (nunca `*`). Deployada como **v29** (`verify_jwt=false`, pela tabela do `efdeploy.cjs`); o bundle deployado contém `skipped: "knockout"` (2×) e `status, opcao_knockout_id`.
- **Parte (b), o passivo (D-02):** `analise_candidato_vaga` ganhou `descartada_em timestamptz` + `descartada_motivo text`, com `analise_candidato_vaga_descartada_motivo_check` (vocabulário `knockout_automatico`) e `analise_candidato_vaga_descartada_coerente_check` (os dois nulos ou os dois preenchidos), e `COMMENT ON COLUMN` nas duas.
- **Escrita retroativa com portão**, aplicada com `md5 do ledger BATE` (10052 octetos).

### Medição ANTES (2026-09-21, só leitura)

| Medida | Valor |
|---|---|
| `count(*)` de `analise_candidato_vaga` | **20** |
| Conjunto do predicado D-02 (RESEARCH §F) | **3**, sem marca — exatamente os ids autorizados |
| `92522073-484c-46a3-9e9d-8e80afa3c062` | análise `2ffde09f…`, `sucesso`, +0,54 s após o knockout, conta `+claude` |
| `0f7b217c-dcb0-44cd-939b-72b7f2c36856` | análise `ebce58b6…`, `sucesso`, +0,52 s, conta `+claude` |
| `25a4231c-612b-4f86-9c5a-904ca09f18f4` | análise `508bdc30…`, `sucesso`, +0,56 s, conta `+claude` |
| Candidaturas com knockout automático (total) | 3 (nenhuma sem análise) |

### Medição DEPOIS

| Medida | Valor |
|---|---|
| `count(*)` de `analise_candidato_vaga` | **20** (inalterado — nenhuma linha apagada) |
| `descartada_motivo='knockout_automatico'` | **3** — os mesmos 3 ids, `descartada_em = 2026-09-21 10:11:14-03`, `status` segue `sucesso` |
| `information_schema.columns` | `descartada_em: timestamptz`, `descartada_motivo: text` |
| `pg_constraint` | os dois CHECKs, com as definições acima |
| Ledger | `20260921000004 / p48_analise_descartada_knockout` |

## Task Commits

1. **Task 1 (tracer, TDD): guarda de knockout na EF**
   - RED: `044608fd` (test) — 12 testes, 2 alvos falhando por asserção; `check tdd-red-evidence` → `RED_EVIDENCE_OK`
   - GREEN: `92ab740c` (feat) — 12/12; deploy v29
2. **Task 2: colunas de descarte + marcação das 3** — `4a46e307` (feat) — aplicada em PROD

## Files Created/Modified

- `supabase/functions/analise-candidato-individual/index.ts` — leitura da candidatura antes da marca `pendente`; guarda `skipped:"knockout"`; erro de leitura vira falha fechada
- `supabase/functions/analise-candidato-individual/__tests__/index.test.ts` — 4 testes novos (knockout, em andamento, rejeição humana, leitura com erro); o mock registra as colunas do `select` e aceita `candidaturaError`
- `supabase/migrations/20260921000004_p48_analise_descartada_knockout.sql` — colunas, CHECKs, COMMENTs, `DO` de escrita retroativa com portão, auto-verificação

## Decisions Made

- **Falha fechada na leitura da candidatura.** Antes, o `error` da leitura era descartado e a análise seguia com `cand = null` (sem CV, mas com as respostas). Com a guarda dependendo dessa leitura, seguir sem ela seria mandar ao provedor de IA os dados de quem pode ter sido eliminado. Agora vira `throw` → linha `falhou` (never-absent preservado), e a marca `pendente` nem nasce.
- **Log do skip:** a EF não tem um `logSeguro` próprio (a «via redigida» aqui é o padrão do arquivo: só ids). O log é `{ candidatura_id, skipped: "knockout" }` — sem PII.
- **Lista literal de 3 ids e `cardinality` no `DO`** são escopo deliberado (a autorização do operador), não fotografia: a migration roda uma vez, e um conjunto diferente é exatamente o caso em que ela tem de recusar. Registrado no cabeçalho.

## Varredura de portões (D-17)

`grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql` → **254** linhas (246 na pesquisa; a diferença é de planos anteriores desta fase). **Nenhum** achado cita `analise_candidato_vaga` nem `descartada*`. O único smoke que lê a tabela é `sec05_08_smokes.sql` — `n <> 0` para RH de outra vaga é **escopo deliberado** (vazamento horizontal) e não é afetado por colunas novas. A tabela não tem trigger; as views dependentes (`v_triagem_panel`, `v_analises_presas`) não mudam com coluna nova.

## Prova de que os portões mordem

- **Portão da migration:** antes do apply, o arquivo foi ensaiado em PROD dentro de um envelope que aborta — (1) inteiro + `RAISE` final com o resultado: `total=20 marcadas=3 ids=0f7b217c…,25a4231c…,92522073…`; (2) com um dos 3 ids autorizados trocado por `00000000-…-0001`: recusado com `D-02: candidatura(s) fora do escopo autorizado no conjunto: {25a4231c-…} — nada foi marcado`. Depois dos dois ensaios, PROD tinha 0 colunas novas.
- **CHECKs:** em envelope que aborta, `descartada_motivo='outro_motivo'` → `analise_candidato_vaga_descartada_motivo_check`; `descartada_em=NULL` numa linha marcada → `analise_candidato_vaga_descartada_coerente_check`. Estado depois: 3 marcadas, total 20.

## TDD Gate Compliance

RED (`044608fd`, `test(48-04)`) precede GREEN (`92ab740c`, `feat(48-04)`). REFACTOR não houve. O Deno TAP não emite o rodapé `# tests / # pass / # fail` do `node --test` que o `check tdd-red-evidence` lê — o rodapé foi **derivado contando as linhas `ok`/`not ok` da saída real** (12 / 10 / 2) e anexado rotulado como derivado; o veredito foi `RED_EVIDENCE_OK / target_test_failed`. Os dois testes de borda (em andamento; rejeição humana sem `opcao_knockout_id`) passaram já no RED, **como devem**: pinam que o caminho atual não muda.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Erro de leitura da candidatura passou a falhar fechado**
- **Found during:** Task 1
- **Issue:** a leitura descartava o `error`; com a guarda dependendo dela, um erro transitório faria a EF analisar (e enviar ao provedor de IA) uma candidatura cujo estado não se conhece — o T-48-04-01 do threat model.
- **Fix:** `error` capturado → `throw` → linha `falhou`, nenhuma IA.
- **Files modified:** `supabase/functions/analise-candidato-individual/index.ts`
- **Verification:** teste `JORN-24 — leitura da candidatura com erro → falha FECHADA` (explode se a IA for tocada; espera só `falhou`)
- **Committed in:** `92ab740c`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** fecha o caminho de erro da própria guarda; os caminhos felizes seguem idênticos.

## Issues Encountered

- `check tdd-red-evidence` é calibrado para `node --test` (ver TDD Gate Compliance).
- `$CMD` sem `eval` no zsh não faz word-splitting (exit 127 na primeira tentativa do registro RED) — refeito com `eval`.

## Não resolvido aqui (de propósito)

- **Defeito 25 NÃO está resolvido.** Parar a análise pós-knockout reduz o 25 daqui para frente, mas o comparativo segue sem filtrar por `status` (Bloco 2).
- **Veredito de export das colunas novas** (entram na cópia LGPD? — premissa A6) é do **48-17**; até lá `docs/compliance/sql/05-export-allowlist-drift.sql` as acusa como sem veredito (soma 2 às 9 já acusadas).
- **`database.types.ts`** não foi regenerado: nenhum código do front lê as colunas novas; a regeneração acompanha o 48-17 / quem as ler.
- **Prova em PROD com inscrição real** eliminada por knockout (nenhuma linha nova, nenhum `ai_call_logs`) é do **48-18**.
- **Publicação:** o plano não manda publicar e nada aqui é visível na interface (EF deployada por `efdeploy`, migration por `p46apply`). Os 3 commits deste plano estão à frente do `origin/main`.
- `deferred-items.md`: o item do cabeçalho do `p45_motor_exclusao_smoke.sql` foi atualizado — o trigger segue sem guard **por desenho** (a guarda mora na EF); a frase do cabeçalho continua falsa, fora do escopo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- A próxima inscrição eliminada por knockout não gera análise nem custo — provado no handler e no bundle v29; a prova ao vivo é do 48-18.
- 48-17 tem as duas colunas novas para classificar no export.

---
*Phase: 48-consertos-da-jornada-bloco-1*
*Completed: 2026-09-21*

## Self-Check: PASSED

- arquivos: migration, index.ts, index.test.ts — FOUND
- commits: 044608fd, 92ab740c, 4a46e307 — FOUND
- PROD: marcadas=3, total=20, md5 do ledger BATE, bundle v29 com a guarda
