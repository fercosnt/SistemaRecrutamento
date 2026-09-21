---
phase: 48-consertos-da-jornada-bloco-1
plan: 09
subsystem: database
status: complete
tags: [jorn-22, art-20, explicacao, rejeitar-candidatura, feedback-rejeicao, rpc, smoke, prod, publicacao]

requires:
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-01 — corpo vivo de rejeitar_candidatura com a trava candidatura_encerrada( (md5 327f3137…), ponto de partida da 000009"
provides:
  - "public.explicacao_rejeicao_origem(uuid) → text — 'automatica' | 'humana_triagem' | NULL, STABLE SECURITY DEFINER, own-row, sem anon (PROD)"
  - "rejeitar_candidatura grava feedback_rejeicao NEUTRO no UPDATE único (PROD) — o cartão «Entenda a decisão» passa a existir para a rejeição humana na triagem"
  - "Explicação com origem 'humana_triagem' (REASON_HUMANA_TRIAGEM) e página com data-testid explicacao-humana-triagem — publicada"
  - "supabase/tests/p48_rejeicao_triagem_smoke.sql — 6 asserções, subtransação revertida, leituras reais sem escrita"
  - "candidaturasService.updateCandidaturaStatus sem o ramo que copiava texto livre do RH para feedback_rejeicao"
affects: [48-12, 48-17, 48-18]

tech-stack:
  added: []
  patterns:
    - "Troca de tipo de retorno de RPC sem janela: função NOVA com nome próprio, a antiga fica sem DROP até nenhum bundle a chamar"
    - "Ordem obrigatória consumidor-antes-do-dado: front publicado e marcador provado em PROD pelo crawler ANTES do apply que faz o cartão aparecer (horários registrados)"
    - "Smoke com leituras reais sem contagem esperada: cada linha real com a forma é conferida contra a regra, qualquer que seja o número delas"
    - "Prova de que morde por mutação na mesma requisição atômica: corpo antigo → FAIL (a); função sem a exclusão de decisao_final → FAIL (e)"

key-files:
  created:
    - supabase/migrations/20260921000008_p48_explicacao_rejeicao_origem.sql
    - supabase/migrations/20260921000009_p48_rejeicao_triagem_feedback.sql
    - supabase/tests/p48_rejeicao_triagem_smoke.sql
  modified:
    - database.types.ts
    - src/features/explicacao/services/explicacaoService.ts
    - src/features/explicacao/services/__tests__/explicacaoService.test.ts
    - src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
    - src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx
    - src/features/vagas/services/candidaturasService.ts
    - src/features/vagas/services/__tests__/candidaturasService.test.ts
    - src/features/vagas/types/vagasTypes.ts
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md

key-decisions:
  - "REASON_HUMANA_TRIAGEM sem «logo no início do processo seletivo»: a rejeição pelo RH é alcançável em qualquer etapa não terminal (motivo reprovado_entrevista existe), e a oração seria falsa para parte dos casos"
  - "humana_triagem exige motivo_rejeicao IS DISTINCT FROM 'knockout_automatico': uma linha com o motivo do knockout sem opção cairia em «uma pessoa decidiu» — na dúvida sobre quem decidiu, a RPC cala (0 linhas assim em PROD)"
  - "oper31 rodado em envelope que aborta (nota 5 do orquestrador), não com p46apply run puro como o verify do plano escreve — rodado puro ele COMMITA fixture ligada a candidato real"
  - "Fixtures do smoke sintéticas (idioma do 48-01) em vez de candidatura real de conta de teste; (d)/(e) também conferem TODAS as candidaturas reais com a forma, só por leitura — nenhuma linha +claude tocada enquanto o operador exercita o fluxo do 48-05"

requirements-completed: [JORN-22]

coverage:
  - id: D1
    description: "RPC tri-estado explicacao_rejeicao_origem em PROD (STABLE, SECURITY DEFINER, own-row, anon sem EXECUTE, booleana antiga preservada)"
    requirement: JORN-22
    verification:
      - kind: integration
        ref: "node p46apply.cjs migrate supabase/migrations/20260921000008_p48_explicacao_rejeicao_origem.sql (md5 do ledger BATE; DO de auto-verificação)"
        status: pass
      - kind: integration
        ref: "supabase/tests/p48_rejeicao_triagem_smoke.sql#(c)(d)(e)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Serviço e página servem origem humana_triagem com texto próprio, canal importado e sem CTA de revisão"
    requirement: JORN-22
    verification:
      - kind: unit
        ref: "src/features/explicacao/services/__tests__/explicacaoService.test.ts#a rejeição humana na triagem (JORN-22 / D-20)"
        status: pass
      - kind: unit
        ref: "src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx#a rejeição humana na triagem (JORN-22 / D-20)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Front publicado com o marcador explicacao-humana-triagem em PROD antes da gravação do feedback"
    requirement: JORN-22
    verification:
      - kind: other
        ref: "crawler do verify contra https://rh.beautysmile.com.br — PRESENTE em PROD às 14:08:20Z; migration 000009 aplicada às 14:11:00Z"
        status: pass
    human_judgment: false
  - id: D4
    description: "rejeitar_candidatura grava feedback_rejeicao neutro no UPDATE único, trava do 48-01 preservada"
    requirement: JORN-22
    verification:
      - kind: integration
        ref: "supabase/tests/p48_rejeicao_triagem_smoke.sql#(a)(b)(f)"
        status: pass
      - kind: integration
        ref: "oper31_rejeitar_candidatura_smokes.sql (envelope que aborta) ready=y; p48_candidatura_encerrada_smoke 8/8"
        status: pass
    human_judgment: false
  - id: D5
    description: "Cartão aparece e leva à página renderizada, para uma rejeição real na triagem com conta de teste"
    requirement: JORN-22
    verification: []
    human_judgment: true
    rationale: "Prova ponta a ponta com conta real (rejeitar → feedback_rejeicao → cartão → página) é do plano 48-18; o backfill da rejeição já feita (1 linha) é checkpoint do 48-12"

duration: 14min
completed: 2026-09-21

plan_head_before: 1b803afad009134c6ab2a005ce9ce0a6839eac17
actuals:
  tokens: 17275
  tasks: 2
  commits: 4
---

# Phase 48 Plan 09: a explicação da rejeição humana na triagem · SUMMARY

**Quem é rejeitado por uma pessoa do RH antes da decisão final passa a ter o cartão «Entenda a
decisão» (feedback_rejeicao neutro gravado no UPDATE único de `rejeitar_candidatura`) e o cartão
leva a uma explicação que existe: a RPC tri-estado `explicacao_rejeicao_origem` e o ramo
`humana_triagem` da página dizem que uma pessoa decidiu, dão o canal e não oferecem revisão. Tudo
em PROD, na ordem certa: página no ar antes do dado.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-21T14:00:37Z
- **Completed:** 2026-09-21T14:13:54Z
- **Tasks:** 2 (Task 1 tracer, TDD)
- **Files modified:** 11 (+ deferred-items.md)

## Linha do tempo em PROD (a ordem é o critério)

| Instante (UTC) | Evento |
|---|---|
| 14:04:31 | migration `20260921000008` aplicada — `explicacao_rejeicao_origem`, ledger md5 `d19c8e406173dd94cc3ae955d606d32d` BATE |
| 14:07:32 | `git push origin main` do front com o ramo `humana_triagem` |
| **14:08:20** | **crawler: `explicacao-humana-triagem` PRESENTE em PROD** (chunk eager `index-*.js` — a rota do candidato não é lazy) |
| **14:11:00** | migration `20260921000009` aplicada — `rejeitar_candidatura` grava o feedback; ledger md5 `a8262af52b448c294a0558c4c07ea650` BATE |
| 14:12 | commit + push do smoke; `origin/main..HEAD` vazio |

Nenhum momento em que o cartão pudesse levar a «Esta página não está disponível» (T-48-09-04).

## O que ficou em PROD

| Objeto | Estado | md5(prosrc) vivo = arquivo |
|---|---|---|
| `explicacao_rejeicao_origem(uuid) → text` | **nova**; ACL `{postgres, authenticated, service_role}`; `anon` sem EXECUTE | `b53400f55502167dbef166173390c9d2` |
| `rejeitar_candidatura(…)` | corpo vivo do 48-01 (`327f3137…`) + `feedback_rejeicao` constante no UPDATE único; trava `candidatura_encerrada(` presente; ACL preservado | `10498a0bef7c8381d58f7634019778b1` |
| `explicacao_rejeicao_automatica(uuid)` | **inalterada** (sem DROP) — código morto a partir deste front | `46a9efda27fe0a66270290735e6a32ae` |

Texto gravado: «Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste
momento.» (o do knockout fala de «requisitos da vaga»; este diz que foi a equipe).

## Accomplishments

- RPC tri-estado: `'automatica'` (knockout), `'humana_triagem'` (rejeição humana sem `decisao_final`,
  motivo ≠ knockout), NULL para todo o resto — lê `motivo_rejeicao` sem devolvê-lo; NULL cobre «não é
  sua» e «não se aplica».
- `explicacaoService`: `origem` com três valores, `REASON_HUMANA_TRIAGEM`, fallback por comparação
  ESTRITA (inclusive o `true` da booleana antiga fecha a página); a chamada à booleana saiu.
- `ExplicacaoCandidatoPage`: linha de resultado e bloco sem-revisão por origem; `humana_triagem` com
  `data-testid="explicacao-humana-triagem"`, texto próprio (não reusa os que afirmam «sem avaliação
  de uma pessoa»), canal por `CANAL_PRIVACIDADE_EMAIL` importado, sem CTA. `grep -c "lgpd@"` na
  página = 0; nenhuma linha nova com o endereço literal (D-07).
- Ramo morto `feedback_rejeicao: motivo_rejeicao` removido de `updateCandidaturaStatus` (e o campo
  do tipo de request); teste de regressão garante que o payload nunca carrega o texto do RH.

## Smokes

| Smoke | Resultado | Como rodou |
|---|---|---|
| **`p48_rejeicao_triagem_smoke.sql`** | **6/6** (a..f); leituras reais: 3 knockouts → `automatica`, 1 rejeição humana → `humana_triagem`, 1 com decisão final → NULL, 0 titulares anonimizados | `p46apply run` (escrita só em subtransação revertida) |
| `oper31_rejeitar_candidatura_smokes.sql` | verde (`ready=y`); a rejeição da fixture dele já grava o texto neutro | envelope que aborta (nota 5) — cortado antes do CLEANUP, resíduo 0 conferido |
| `p48_candidatura_encerrada_smoke.sql` | 8/8 (regressão da trava D3) | `p46apply run` |

**O portão morde (medido).** Na mesma requisição atômica: (1) corpo de `rejeitar_candidatura` do
48-01 reinstalado → `P48R FAIL (a): feedback_rejeicao gravado = <NULL>`; (2)
`explicacao_rejeicao_origem` sem a exclusão de `decisao_final` → `P48R FAIL (e): … devolveu
humana_triagem`. As duas transações abortaram; md5 vivos idênticos aos dos arquivos depois.

## Task Commits

1. **Task 1 (tracer, TDD) — RED:** `491b2614` test(48-09) — `RED_EVIDENCE_OK` (8 falhas no serviço + 4 na página, todas asserções do comportamento)
2. **Task 1 — GREEN:** `2db9eb6e` feat(48-09) — migration 000008 aplicada, tipos, serviço, página
3. **Task 2 (1)(2):** `fc4f4b6f` fix(48-09) — ramo morto removido; build + push + marcador em PROD
4. **Task 2 (3)(4):** `318a0848` feat(48-09) — migration 000009 + smoke

Portão do tracer: interativo, `end-of-phase`, verify só `<automated>` → verify re-rodado (md5 do
ledger lido de volta, tipos, vitest 87/87) sem re-aplicar a migration já escriturada; verde →
expansão.

## Varredura de portões (D-17)

Padrão do `CLAUDE.md` sobre `supabase/tests/*.sql`: **250** linhas antes deste plano. Nenhuma lista
`proname IN (…)` vigia as funções de explicação nem `rejeitar_candidatura` (as 7 existentes são da
retenção, pedidos e motor de exclusão — escopo deliberado); nenhum smoke fotografa o corpo de
`rejeitar_candidatura`. Achados novos do `p48_rejeicao_triagem_smoke.sql`: `v_pass <> 6` e o `<> 0`
do titular sintético — **escopo deliberado** (número de asserções do próprio arquivo; invariante de
resíduo que não envelhece).

## Decisions Made

Ver `key-decisions` no frontmatter. Nenhuma decisão do operador (D-01..D-23) foi reaberta; D-12 e
D-20 executadas como escritas.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `REASON_HUMANA_TRIAGEM` sem a afirmação de etapa**
- **Found during:** Task 1
- **Issue:** o texto prescrito dizia «analisada … logo no início do processo seletivo». O Rejeitar do
  hub é oferecido em qualquer etapa não terminal e o enum de motivo tem `reprovado_entrevista` e
  `nao_compareceu` — a frase seria falsa para parte das rejeições.
- **Fix:** «A sua candidatura foi analisada por uma pessoa da nossa equipe, que decidiu não seguir
  com ela neste momento. Esta decisão vale para esta vaga nesta seleção e não impede que você se
  candidate a outras.» — D-20 («analisada por uma pessoa da nossa equipe», sem motivo nem critério)
  preservada; teste assere a ausência de «início|triagem».
- **Files modified:** `explicacaoService.ts`, `explicacaoService.test.ts`
- **Committed in:** `491b2614`, `2db9eb6e`

**2. [Rule 2 - Correção] `humana_triagem` exige motivo diferente do do knockout**
- **Found during:** Task 1
- **Issue:** «status rejeitado sem knockout» lido só como «não satisfaz o knockout completo» daria
  «uma pessoa decidiu» a uma linha com motivo `knockout_automatico` e sem opção.
- **Fix:** cláusula `motivo_rejeicao IS DISTINCT FROM 'knockout_automatico'`; essa forma cai em NULL.
  0 linhas assim em PROD hoje.
- **Committed in:** `2db9eb6e`

**3. [Restrição do orquestrador] `oper31` em envelope que aborta; fixtures sintéticas no smoke novo**
- **Issue:** o `<verify>` do plano roda `oper31` com `p46apply run` puro, que COMMITA fixture ligada a
  candidato real; e a ação (4) pede «candidatura real de conta de teste» enquanto o operador está
  exercitando o fluxo do 48-05 com uma conta `+claude`.
- **Fix:** `oper31` em envelope que aborta (resultado lido do texto do erro); smoke novo com titular
  sintético (idioma do 48-01) + conferência de TODAS as linhas reais com a forma, só por leitura.
  Nenhuma candidatura real escrita, nem em subtransação.

**4. [Rule 3] Campo `motivo_rejeicao` removido de `UpdateCandidaturaStatusRequest` (`vagasTypes.ts`)**
- Arquivo fora da lista `files_modified`; é o «parâmetro correspondente» da ação (1), sem nenhum outro
  uso. `tsc` segue em 90.
- **Committed in:** `fc4f4b6f`

**Nota — `database.types.ts`:** o regen trouxe também objetos já em PROD de planos anteriores que
ainda não estavam no arquivo (`candidatura_encerrada`, `analise_candidato_vaga.descartada_*`,
`solicitacoes_dados.aviso_*`). É o arquivo gerado refletindo o banco; nada escrito à mão.

---

**Total deviations:** 4 (1 Rule 1, 1 Rule 2, 1 Rule 3, 1 restrição do orquestrador)
**Impact on plan:** todas preservam D-12/D-20 e o texto de produto; nenhuma amplia escopo.

## Issues Encountered

- `tsc` foi a 91 no commit RED (o import de `REASON_HUMANA_TRIAGEM` ainda inexistente — esperado no
  RED; o hook aceita até a baseline 96). Voltou a 90 no GREEN e ficou em 90 até o fim.
- Primeiro envelope do `oper31` cortou no cabeçalho (a primeira ocorrência de «-- CLEANUP» é a linha
  32) e não rodou asserção nenhuma (`ready=` vazio) — refeito cortando na seção da linha 243.

## Known Stubs

Nenhum.

## Achados registrados (deferred-items.md)

- `explicacao_rejeicao_automatica` virou código morto e segue com EXECUTE para `anon`.
- `UpdateStatusModal` afirma ao RH que o motivo «será enviado ao candidato» — é falso.
- Motivo `desistencia` recebe o mesmo texto «não seguiremos com ela» (para a revisão da premissa A8
  no 48-18).

## Next Phase Readiness

- A prova com conta real (rejeitar na triagem → `feedback_rejeicao` → cartão → página) é do 48-18.
- O backfill da única rejeição humana já feita sem `feedback_rejeicao` (conta de teste) é checkpoint
  do 48-12 — **não** foi feito aqui (D-18).

## Self-Check: PASSED

- Arquivos criados existem: as duas migrations e o smoke ✓
- Commits `491b2614`, `2db9eb6e`, `fc4f4b6f`, `318a0848` no histórico e em `origin/main` ✓
- Ledger: 000008 md5 `d19c8e40…` e 000009 md5 `a8262af5…` BATEM ✓
- PROD: `rejeitar_candidatura` com o texto neutro e a trava; `explicacao_rejeicao_origem` sem anon ✓
- `npm run test:run` 2032/2032; `tsc` 90; marcador em PROD antes do apply ✓

---
*Phase: 48-consertos-da-jornada-bloco-1*
*Completed: 2026-09-21*
