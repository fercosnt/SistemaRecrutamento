---
phase: 23-ressurrei-o-da-stack-de-ia
plan: 04
subsystem: ui
tags: [psychometrics, big-five, raven, consolidacao, react, deno, vitest, honesty]

# Dependency graph
requires:
  - phase: 12-big-five-devolutiva
    provides: DevolutivaBigFiveView + BANDA_LABEL (5 bandas neutras) + norma Johnson wired
  - phase: 11-avaliacao-assincrona
    provides: ScorecardAvaliacao + scoresRhService (allowlist) + BIGFIVE_BANDA_LABEL
  - phase: 15-decisao-final
    provides: consolidar-decisao-final EF + ConsolidacaoDashboard (breakdown/context rows)
provides:
  - "Devolutiva do candidato sem percentil cru — 5 bandas NEUTRAS (Big Five é não-avaliativo)"
  - "Telas RH sem percentil cru — Big Five banda neutra + cognitivo/Raven banda avaliativa 3-níveis provisória"
  - "triagem fora de WEIGHTED_KEYS na consolidação → vira contexto visível (não pondera)"
  - "gate ≥2 etapas concluídas antes de exibir o número consolidado (server-authoritative)"
  - "ConsolidacaoDashboard: mensagem de supressão distinta com <2 etapas (não o empty-state)"
affects: [phase-24-seguranca-pii-lgpd, phase-25-funil-rh, m5-psico-norma-cognitiva]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "2 famílias de banda: NEUTRA (Big Five, não-avaliativo) vs AVALIATIVA 3-níveis (cognitivo job-fit)"
    - "Indicador não-quantitativo de 5 segmentos keyed na banda (posição, sem value=percentil)"
    - "Gate de agregado server-authoritative (EF devolve consolidated=null; client só reflete)"
    - "Row de CONTEXTO com valor visível (triagem carrega score_match marcado 'não pondera')"

key-files:
  created:
    - src/features/avaliacao/components/__tests__/DevolutivaBigFiveView.test.tsx
    - src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx
    - src/components/__tests__/ScoreCard.test.tsx
    - src/features/decisao/components/__tests__/ConsolidacaoDashboard.test.tsx
  modified:
    - src/features/avaliacao/components/DevolutivaBigFiveView.tsx
    - src/features/avaliacao/components/ScorecardAvaliacao.tsx
    - src/components/ScoreCard.tsx
    - supabase/functions/consolidar-decisao-final/index.ts
    - supabase/functions/consolidar-decisao-final/__tests__/index.test.ts
    - src/features/decisao/components/ConsolidacaoDashboard.tsx

key-decisions:
  - "Big Five (candidato + RH) = 5 bandas NEUTRAS (muito baixo…muito alto); NUNCA 'abaixo/dentro/acima do esperado' (Pitfall 5 — traço alto não é 'pior')"
  - "Cognitivo/Raven (job-fit, avaliativo) = banda avaliativa 3-níveis provisória (<40 abaixo / 40-69 dentro / ≥70 acima do esperado); norma real diferida M5"
  - "Progress value={percentil} trocado por indicador de 5 segmentos keyed na banda (posição, sem dígito)"
  - "analogia() reescrita keyed na banda (frase auto-descritiva, sem 'grupo de 100'/ranking)"
  - "triagem vira row de CONTEXTO carregando score_match (visível, marcado 'não pondera'); pesos['triagem'] ignorado com segurança (rebalanceamento = Phase 25)"
  - "gate consolidação >0 → ≥2 etapas present; buildRecommendation ganha presentCount p/ mensagem de supressão distinta"
  - "RelatoriosRHPage NÃO tocado: percentil só bucketado em histograma AGREGADO de distribuição, não número por-candidato"

patterns-established:
  - "Honestidade psicométrica: nenhum dígito de percentil cru chega à tela renderizada (Vitest guarda queryByText(/Percentil \\d/) === null)"
  - "Agregado advisory sob gate server-authoritative — RNF-07a preservado (nunca auto-rejeita; devolve null/hold)"

requirements-completed: [UX-07, UX-09]

# Metrics
duration: 17min
completed: 2026-07-06
---

# Phase 23 Plan 04: Honestidade Psicométrica (UX-07 + UX-09) Summary

**Percentil cru removido da devolutiva do candidato e das telas RH (Big Five = 5 bandas neutras, cognitivo = banda avaliativa 3-níveis provisória) + triagem tirada da consolidação (vira contexto sem peso) com gate server-authoritative de ≥2 etapas antes de exibir um número consolidado.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-07-06T01:41:01Z
- **Completed:** 2026-07-06T01:58:02Z
- **Tasks:** 3
- **Files modified:** 10 (6 modified, 4 test files created)

## Accomplishments
- **UX-07 devolutiva (candidato):** `Percentil {n}` cru removido (dashboard + card); `<Progress value={percentil}>` → indicador de 5 segmentos keyed na banda; `analogia()` reescrita keyed na banda (sem dígito, sem "grupo de 100"); disclaimer LGPD/CRP preservado intacto.
- **UX-07 telas RH:** ScorecardAvaliacao Big Five → só banda NEUTRA (sem `Percentil {d.percentil}`); ScoreCard cognitivo/Raven `P${inteligencia}` → banda avaliativa 3-níveis (`cognitivoBanda()`), N/A quando null, cores preservadas.
- **UX-09 consolidação:** `triagem` fora de `WEIGHTED_KEYS` → row de CONTEXTO visível carregando `score_match` marcada "não pondera"; gate `presentRows.length > 0` → `>= 2` (server-authoritative → consolidated=null com <2); `buildRecommendation` com mensagem de supressão distinta; ConsolidacaoDashboard mostra "Agregado suprimido até ≥2 etapas concluídas" (não o empty-state), breakdown segue visível.
- **Rede de testes:** 4 arquivos Vitest novos + suíte Deno de consolidar estendida (14/14). Full Vitest 739/739, Deno corpus 157/0, tsc no baseline 133.

## Task Commits

Each task was committed atomically (husky bypass via `git -c core.hooksPath=/dev/null`, documented convention):

1. **Task 1: devolutiva do candidato sem percentil cru — bandas NEUTRAS (UX-07)** — `35a754e` (feat)
2. **Task 2: telas RH sem percentil cru — Big Five banda neutra + Raven banda avaliativa (UX-07)** — `8bcac83` (feat)
3. **Task 3: triagem fora da consolidação + ≥2 etapas (UX-09)** — `6d9d1c4` (feat)

## Files Created/Modified
- `src/features/avaliacao/components/DevolutivaBigFiveView.tsx` — devolutiva sem percentil; `BandaSegments` (indicador de posição não-quantitativo); `analogia()` keyed na banda.
- `src/features/avaliacao/components/ScorecardAvaliacao.tsx` — rows Big Five do RH sem `Percentil {n}`; só `BIGFIVE_BANDA_LABEL`.
- `src/components/ScoreCard.tsx` — `cognitivoBanda()` (3 níveis avaliativos provisórios) no lugar de `P{n}`.
- `supabase/functions/consolidar-decisao-final/index.ts` — triagem→contexto; gate ≥2; `buildRecommendation(presentCount)`.
- `src/features/decisao/components/ConsolidacaoDashboard.tsx` — mensagem de supressão distinta + triagem context com valor visível.
- `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` — testes 1/2 atualizados (triagem context) + 3 novos UX-09.
- `src/features/avaliacao/components/__tests__/DevolutivaBigFiveView.test.tsx` (novo) — sem percentil + bandas neutras + zero "esperado".
- `src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx` (novo) — Big Five banda neutra, sem percentil.
- `src/components/__tests__/ScoreCard.test.tsx` (novo) — cognitivo banda avaliativa, sem `P{n}`.
- `src/features/decisao/components/__tests__/ConsolidacaoDashboard.test.tsx` (novo) — supressão distinta com 1 etapa present.

## Decisions Made
- **RelatoriosRHPage NÃO alterado (decisão do plano, Task 2):** o único uso de `percentil` (`useDistribuicaoRaven`) bucketa em faixas 0-25/26-50/51-75/76-100 para um histograma AGREGADO de distribuição — não há número de percentil cru por-candidato exibido. Distribuição agregada permanece (não é informação enganosa por-indivíduo).
- **CandidatosRHPage NÃO alterado (Task 2):** o único uso (`scores_raven?.percentil`) alimenta `<ScoreCard>`, já corrigido — nenhuma exibição crua adicional.
- **Cognitivo é a única família avaliativa:** por ser score de job-fit (ao contrário do Big Five, não-avaliativo), a moldura "abaixo/dentro/acima do esperado" cabe aqui; cutoffs provisórios até a norma local de M5.

## Deviations from Plan

None - plan executed exactly as written. Todos os 3 tasks seguiram o `<action>` de cada task; nenhum auto-fix (Rules 1-3) foi necessário; nenhuma decisão arquitetural (Rule 4). Ambos os itens "confirmar" do Task 2 (RelatoriosRHPage / CandidatosRHPage) foram verificados e documentados acima sem mudança de código.

## Issues Encountered
- **Colisões de assertion no Vitest do ConsolidacaoDashboard (não-bug):** a mensagem de supressão aparece no hero E é ecoada na recomendação da EF; "Contextual · não pondera" aparece nas 3 rows de contexto; "80 / 100" colidia entre triagem-context e redacao-present. Resolvido tornando o valor de contexto único (90/100) e usando `getAllByText().length > 0` onde a duplicação é esperada e legítima. Nenhuma mudança de produto.

## Threat Register (do plano)
- **T-23-04-01 (Information Disclosure — honestidade psicométrica):** MITIGADO — bandas qualitativas substituem o dígito de percentil na devolutiva + telas RH (Task 1/2); zero `Percentil {n}` renderizado (Vitest guarda).
- **T-23-04-02 (Tampering — integridade da decisão):** MITIGADO — triagem fora de WEIGHTED_KEYS + gate ≥2 etapas server-authoritative (Task 3); agregado permanece advisory (RNF-07a — nunca auto-rejeita; devolve null/hold).
- **T-23-04-SC (supply-chain):** ACEITO — nenhum pacote instalado.

## Known Stubs
None. O cognitivoBanda() usa cutoffs PROVISÓRIOS (comentado inline + documentado): não é um stub de dado (o percentil real do Raven alimenta a função), é uma banda de apresentação cuja NORMA real fica diferida a M5/PSICO. Não bloqueia o objetivo (o número cru some da tela — que é o goal do UX-07).

## Verification
- Vitest full: **739/739** green (`npm run test:run`)
- Deno corpus full: **157/0** green (`deno test … supabase/functions`); consolidar isolado **14/14**
- tsc: **133** (baseline pinado — sem inflação)
- Acceptance greps: `Percentil {` = 0 (Devolutiva) · `Percentil {d.percentil}` = 0 (Scorecard) · `P${inteligencia}` = 0 (ScoreCard) · `triagem` fora de WEIGHTED_KEYS · `>= 2` presente (gate)

## Next Phase Readiness
- **EF consolidar precisa de REDEPLOY** (bundle-freeze): a mudança de código está commitada mas a EF em PROD só reflete após redeploy — programado para o **Plan 23-06** (redeploy das 7 EFs de IA + consolidar). Até lá o gate ≥2 / triagem-contexto NÃO está live.
- Frontend (devolutiva + telas RH + dashboard) sobe no próximo build normal — sem migration, sem estado de runtime.
- Nenhum bloqueio para a Phase 24 (Segurança/PII/LGPD).

## Self-Check: PASSED

All 4 test files created + SUMMARY.md exist on disk; all 3 task commits (35a754e, 8bcac83, 6d9d1c4) present in git log.

---
*Phase: 23-ressurrei-o-da-stack-de-ia*
*Completed: 2026-07-06*
