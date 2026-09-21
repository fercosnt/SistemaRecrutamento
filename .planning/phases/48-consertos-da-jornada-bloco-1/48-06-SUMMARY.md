---
phase: 48-consertos-da-jornada-bloco-1
plan: 06
subsystem: testing
tags: [smoke, postgres, portoes, d-17, notificacoes, sonda]
status: complete

requires:
  - phase: 43
    provides: "p43_guard_marketing_smoke.sql, classe_evento_notificacao, trg_guard_marketing_consentimento"
  - phase: 42
    provides: "p42_notif_revisao_smoke.sql"
  - phase: 37
    provides: "p37_fidelidade_schema_smoke.sql"
provides:
  - "p43 (y2) por impressão digital to_jsonb capturada na execução; p43 (c) e p42 (a) iterando o vocabulário vivo do CHECK"
  - "p37 por pertinência (colunas, CHECK de evento, trigger do P37-03)"
  - "ganchos de sonda por GUC: smoke43g.sonda (y2, c), smoke42n.sonda (a), smoke37f.sonda (check, colunas, triggers)"
  - "48-VARREDURA-PORTOES.md — padrão, contagem, classificação, resultado das sondas"
affects: [48-10, 48-11, 48-13]

actuals:
  tokens: 16262
  tasks: 2
  commits: 2
plan_head_before: f734c31e96897807d144ccc0f542f292010b2fbb

tech-stack:
  added: []
  patterns:
    - "Sonda de mordida por GUC: perturba em subtransação, roda a MESMA comparação, termina SEMPRE em exceção (SONDA OK / SONDA FALHOU); valor desconhecido reprova alto"
    - "Vocabulário do ledger extraído do pg_get_constraintdef vivo em vez de lista literal"

key-files:
  created:
    - .planning/phases/48-consertos-da-jornada-bloco-1/48-VARREDURA-PORTOES.md
  modified:
    - supabase/tests/p43_guard_marketing_smoke.sql
    - supabase/tests/p42_notif_revisao_smoke.sql
    - supabase/tests/p37_fidelidade_schema_smoke.sql
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md

key-decisions:
  - "p42 (b) continua provando o CHECK, não o guard: o evento inventado é classificado dentro da mesma subtransação revertida, em vez de aceitar P0003 como o p43 (d) faz"
  - "p37: toggle v_pos_aditiva passou a true (a aditiva está em PROD desde a P37-03). É o modo previsto pelo próprio arquivo, não uma constante nova"
  - "p37 (f) também convertido para pertinência por nome, com sonda 'triggers', embora o plano não o citasse: estava vermelho (2 triggers desde a P43) e o plano exige o p37 verde"
  - "Contagens do p37 que estão verdes e que nenhum plano da fase altera (constraints, índices, colunas de config_sla_etapa) foram registradas, não tocadas"

patterns-established:
  - "Portão convertido = baseline da execução + sonda que prova a mordida por execução, com todo caminho terminando em exceção"

requirements-completed: [JORN-15, JORN-19]

coverage:
  - id: D1
    description: "p43_guard_marketing_smoke.sql verde em PROD (9/9): y2 por impressão digital, (c) pelo vocabulário vivo"
    requirement: JORN-15
    verification:
      - kind: integration
        ref: "node p46apply.cjs run supabase/tests/p43_guard_marketing_smoke.sql"
        status: pass
      - kind: integration
        ref: "sondas smoke43g.sonda=y2 e =c → SONDA OK: y2 mordeu / SONDA OK: c mordeu"
        status: pass
    human_judgment: false
  - id: D2
    description: "p42_notif_revisao_smoke.sql verde em PROD (4/4): (a) pelo vocabulário vivo, (b) volta a provar o CHECK"
    requirement: JORN-15
    verification:
      - kind: integration
        ref: "node p46apply.cjs run supabase/tests/p42_notif_revisao_smoke.sql"
        status: pass
      - kind: integration
        ref: "sonda smoke42n.sonda=a → SONDA OK: a mordeu"
        status: pass
    human_judgment: false
  - id: D3
    description: "p37_fidelidade_schema_smoke.sql verde em PROD (12/12) por pertinência"
    requirement: JORN-19
    verification:
      - kind: integration
        ref: "node p46apply.cjs run supabase/tests/p37_fidelidade_schema_smoke.sql"
        status: pass
      - kind: integration
        ref: "sondas smoke37f.sonda=check, =colunas, =triggers → SONDA OK"
        status: pass
    human_judgment: false
  - id: D4
    description: "48-VARREDURA-PORTOES.md com padrão, contagem, achados classificados e resultado das sondas"
    requirement: JORN-19
    verification:
      - kind: other
        ref: "node -e verificador do plano (Task 2, terceiro <automated>) → OK"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-09-21
---

# Phase 48 Plan 06: portões do vocabulário de notificação convertidos antes do primeiro evento novo, e vistos mordendo — Summary

**Três smokes que vigiam o vocabulário de notificações passaram a olhar o banco vivo em vez do instantâneo de julho/agosto. Em PROD, os três estavam vermelhos e agora estão verdes. O `p43` (y2) mede a impressão digital `to_jsonb` capturada na própria execução. `p43` (c) e `p42` (a) iteram o que o `pg_get_constraintdef` diz hoje, e hoje o `candidatura_encerrada_a_pedido` passou a ser vigiado. O `p37` virou pertinência por nome. As seis sondas saíram com `SONDA OK`, e nenhuma perturbação comitou.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-21T13:15:36Z
- **Completed:** 2026-09-21T13:24:35Z
- **Tasks:** 2
- **Files modified:** 5 (3 smokes, 1 artefato novo, deferred-items)

## Accomplishments

- **`p43` (y2):** comparava a contagem com a constante 7 e estava vermelho em PROD (8 classes), com um diagnóstico FALSO («o DELETE de (b3) não foi revertido»). Agora compara o md5 do `to_jsonb` de todas as linhas, capturado na FIXTURE da mesma execução.
- **`p43` (c) e `p42` (a):** as listas literais de 6 eventos não reprovavam nada. O 7º evento não-marketing já estava fora da vigilância. Agora as duas iteram o vocabulário extraído do CHECK vivo, sem os eventos de classe `marketing`, e exigem aceite de todos contra o total extraído. Os 6 históricos continuam exigidos, por pertinência. Hoje são 7 eventos; serão 8 depois do 48-10 e 9 depois do 48-13, sem editar os smokes.
- **`p37`:** passou de «fidelidade ao instantâneo do P37» para «o P37 continua garantido»:
  - (a): colunas por nome (PROD tem 20);
  - (c): o CHECK de evento CONTÉM os 4 eventos do P37;
  - (f): o trigger do P37-03 existe, por nome;
  - o toggle `v_pos_aditiva` passou a `true`.
- **Sondas por execução (todas `SONDA OK`):** `y2`, `c` (p43) · `a` (p42) · `check`, `colunas`, `triggers` (p37). Valor de sonda desconhecido reprova alto.
- **`classe_evento_notificacao` antes e depois das sondas:** 8 linhas / `8e9e90791305b1a8bfcf3beb7d8c15a5` nas duas medições. Nenhuma perturbação comitou.
- **`48-VARREDURA-PORTOES.md`:** padrão exato, contagem (254 na base → 250), 17 achados classificados com o plano de cada um e a instrução para o 48-10/48-13. Também mede o ponto cego do próprio padrão: 36 listas declaradas e 3 `<> (CASE …)`.

## Task Commits

1. **Task 1 (tracer): p43 convertido de ponta a ponta:** `d15a1648` (test)
2. **Task 2: p42 e p37 convertidos + artefato da varredura:** `3ed43660` (test)

O portão do tracer passou: interativo, `end-of-phase`, verify só `<automated>`. O verify foi re-executado (verde + as duas sondas `SONDA OK`) antes da Task 2.

## Files Created/Modified

- `supabase/tests/p43_guard_marketing_smoke.sql`: y2 por impressão digital, (c) pelo vocabulário vivo, ganchos `smoke43g.sonda`, emenda no cabeçalho.
- `supabase/tests/p42_notif_revisao_smoke.sql`: (a) pelo vocabulário vivo; (b) classifica o evento inventado na subtransação; (y) confere que a classe efêmera sumiu; gancho `smoke42n.sonda`.
- `supabase/tests/p37_fidelidade_schema_smoke.sql`: (a)/(c)/(f) por pertinência, toggle `true`, ganchos `smoke37f.sonda`.
- `.planning/phases/48-consertos-da-jornada-bloco-1/48-VARREDURA-PORTOES.md`: artefato da varredura (novo).
- `.planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md`: dois itens novos (ponto cego do padrão; `p42` (y) nos dois sentidos).

## Decisions Made

- **`p42` (b) continua provando o CHECK, e não o guard.** O evento inventado é classificado como `transacional` dentro da mesma subtransação: o guard deixa passar, o CHECK tem de recusar com `23514`, e o erro reverte a classe junto. Aceitar `P0003` (como o `p43` (d) faz) teria deixado passar um CHECK dropado.
- **`v_pos_aditiva = true` no `p37`.** É o modo que o arquivo já previa para depois do apply da aditiva, e ela está em PROD desde a P37-03. Não é constante nova.
- **Contagens verdes e fora do alcance da fase ficaram como estão:** constraints `(CASE … 6 ELSE 5)`, índices `<> 5`, colunas/constraints/índices de `config_sla_etapa`. Estão registradas na varredura como fotografia verde. Converter o que não está vermelho nem vai mudar seria ampliar escopo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `p42` (b) estava vermelha em PROD por motivo alheio ao plano**
- **Found during:** Task 2 (run do p42 como estava)
- **Issue:** desde a P43, o guard BEFORE INSERT recusa o evento inventado com `P0003` antes de o CHECK opinar, e (b) só tratava `23514`. O run abortava com o erro cru do guard, e o plano exige o p42 verde.
- **Fix:** o evento inventado é inserido em `classe_evento_notificacao` dentro da mesma subtransação, e (b) volta a exercitar o CHECK. (y) ganhou a checagem de que a classe efêmera não sobreviveu.
- **Files modified:** `supabase/tests/p42_notif_revisao_smoke.sql`
- **Verification:** p42 4/4 verde; `classe_evento_notificacao` segue com 8 linhas depois.
- **Committed in:** `3ed43660`

**2. [Rule 3 - Blocking] `p37` tinha mais fotografias vermelhas do que as duas citadas**
- **Found during:** Task 2 (sonda do catálogo vivo, só leitura)
- **Issue:** além do CHECK de 4 valores e da contagem de colunas, havia outras duas. O toggle `v_pos_aditiva=false` descrevia o banco de antes da P37-03. E (f) exigia 0/1 trigger, mas PROD tem 2 desde a P43. Sem converter isso, o p37 não fica verde.
- **Fix:** toggle → `true`; (f) → pertinência por nome de `trg_notificacoes_atualizado_em`, com sonda própria `triggers` (orientação 11: portão convertido tem de ser visto mordendo). O plano pedia a mesma regra para «alguma outra que também envelheceu».
- **Files modified:** `supabase/tests/p37_fidelidade_schema_smoke.sql`
- **Verification:** p37 12/12 verde; sonda `triggers` → `SONDA OK: triggers mordeu`.
- **Committed in:** `3ed43660`

**3. [Rule 2 - Missing critical] Ganchos de sonda recusam valor desconhecido**
- **Found during:** Task 1
- **Issue:** uma sonda com erro de digitação rodaria o smoke inteiro VERDE e seria lida como «o portão não morde».
- **Fix:** os três smokes reprovam alto se o GUC tiver valor fora do conjunto conhecido. No fim do run normal, o gancho é zerado.
- **Verification:** `smoke43g.sonda='zz'` e `smoke37f.sonda='xx'` → `… é desconhecida`.
- **Committed in:** `d15a1648`, `3ed43660`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing critical)
**Impact on plan:** foram necessários para cumprir o critério «os três smokes verdes em PROD». Nenhuma constante nova e nenhum portão enfraquecido.

## Issues Encountered

- **O padrão de varredura do `CLAUDE.md` não viu as duas listas literais que este plano converteu.** Elas eram declaradas como `v_eventos text[] := ARRAY[...]`, e o padrão só as pegou pelo `v_aceitos <> 6` da linha ao lado. Também não viu as contagens do `p37` escritas como `<> (CASE …)`. O ponto cego foi medido (36 + 3) e registrado em `deferred-items.md`, com a sugestão de estender o padrão. Não editei o `CLAUDE.md` nem classifiquei as 36: fica fora do escopo.
- Nenhum dos três smokes comita fixture nem enfileira `net.http_post`: toda escrita do p43/p42 vive em subtransação revertida, e `notificacoes_enviadas` não tem trigger de despacho. Por isso rodaram com `p46apply run` puro, sem envelope.

## Known Stubs

Nenhum.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **48-10 e 48-13:** depois do apply, rodar os três smokes. Eles já incluem o evento novo sozinhos. O evento precisa de linha em `classe_evento_notificacao` **na mesma migration**; sem ela, `p43` (e) e `p42` (a) reprovam, com o motivo certo.
- **48-13:** atualizar `p42_invent05_cron_smoke.sql` (a.iii) e `docs/compliance/cron-inventory.md` no mesmo commit do cron.
- **`p39_rewire_triggers_smoke.sql:189`** segue vermelho (6 → 7 com o 48-10) e não é portão, por instrução do operador.

## Self-Check: PASSED

- FOUND: `.planning/phases/48-consertos-da-jornada-bloco-1/48-VARREDURA-PORTOES.md`
- FOUND: `supabase/tests/p43_guard_marketing_smoke.sql`, `p42_notif_revisao_smoke.sql`, `p37_fidelidade_schema_smoke.sql`
- FOUND commits: `d15a1648`, `3ed43660`

---
*Phase: 48-consertos-da-jornada-bloco-1*
*Completed: 2026-09-21*
