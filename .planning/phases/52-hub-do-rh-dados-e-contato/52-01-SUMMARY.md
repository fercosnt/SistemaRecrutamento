---
phase: 52-hub-do-rh-dados-e-contato
plan: 01
subsystem: testing
tags: [harness, prod-rehearsal, gate, vitest, typography, management-api]

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "scripts/p51_ensaio.cjs e scripts/p51_portao.cjs (revisados 3x), molde copiado"
  - phase: 50
    provides: "scripts/p50_vitest_delta.cjs (precedente do portão por delta) e p50_ensaio.cjs (terminadores, classificarSaida)"
provides:
  - "scripts/p52_ensaio.cjs — ensaio em PROD que aborta (ENSAIO_P52_TERMINOU), MIGS 20261011000001..4_p52_*, pares smoke52l/52b/52d + legados, marcas p52.tx/p51.tx/p50.tx"
  - "scripts/p52_portao.cjs — portão review→apply→deploy→push com regra (8) por forma sobre _p52_ (68 casos de auto-teste)"
  - "scripts/p52_tipografia.cjs — varredura do contrato tipográfico (14/16/24/48, 400/600) nas linhas acrescentadas desde a base"
  - "scripts/p52_vitest_delta.cjs — suíte Vitest julgada por delta contra refs/gsd/52/base na mesma execução (julgar() exportado, BASE NAO MEDIDA fail-closed)"
  - "ref refs/gsd/52/base = 0d70ac7d433db9a9a644987dcf442cc50022aaae"
affects: [52-08, 52-14, 52-15, 52-17, 52-18, 52-19, 52-20, 52-21, blocos B/C/D da Phase 52]

actuals:
  tokens: 28184
  tasks: 3
  commits: 4
plan_head_before: ff6878c2b5d97803c01af54014944ab42b901498
plan_head_after: 70c323ff2570107045397403037e2b9c71343300

tech-stack:
  added: []
  patterns:
    - "Harness por cópia adaptada do arnês revisado, mudando só o que é da fase (diff de código contra o p51 conferido por normalização pXX)"
    - "Juiz puro exportado (julgar/julgarDiff/acusa) chamado pelo uso normal E pelo auto-teste; mordida provada contra um juiz vácuo"

key-files:
  created:
    - scripts/p52_ensaio.cjs
    - scripts/p52_portao.cjs
    - scripts/p52_tipografia.cjs
    - scripts/p52_vitest_delta.cjs
  modified: []

key-decisions:
  - "refs/gsd/52/base = 0d70ac7d (o comando literal do plano: último commit que tocou 52-01-PLAN.md); os 3 commits posteriores (bfeec1bc, b080f5c8, ff6878c2) só tocam .planning/ — nenhum código entre a base e o início da execução"
  - "O sentinela do p52_ensaio carrega p52.evidencia E p51.evidencia (nessa ordem, só as não vazias): os pós-portões da 52 anexam à primeira (52-08/52-16/52-20), e os smokes p51 que a fase re-roda à segunda — com uma só, uma das duas evidências sumiria"
  - "capturar() do p52_ensaio mantém as chaves do p51 e acrescenta mutacoes_p52 (p52_mutacao_%) e fixtures_p52 (p52%smoke-%@invalido.local); funcoesP52 lê por forma as migrations p52 do disco e herda a semente get_avaliacao_status"
  - "Fixtures do auto-teste do p52_portao usam versões 20261011… (fase 52); os 68 casos do p51 estão todos lá"
  - "Delta: pre-existentes = interseção com assinatura igual; alteradas = interseção com assinatura diferente (fora de pre); código 0 exige alteradas=0"

patterns-established:
  - "Portão de suíte por delta: base medida PRIMEIRO, recusa BASE NAO MEDIDA antes de rodar o HEAD; nenhum nome de teste no script (conferido por forma)"
  - "Arquivos sintéticos de auto-teste não imitam sufixo de teste (o julgamento não olha sufixo; o script não cita arquivo de teste além da mordida)"

requirements-completed: [JORN-52, JORN-58, JORN-63]

coverage:
  - id: D1
    description: "p52_ensaio.cjs roda smoke vivo contra PROD numa transação que aborta (tracer)"
    requirement: JORN-63
    verification:
      - kind: integration
        ref: "node scripts/p52_ensaio.cjs --sem-migracoes --vistas supabase/tests/p51_raven_status_smoke.sql"
        status: pass
    human_judgment: false
  - id: D2
    description: "p52_portao.cjs com regra (8) por forma sobre _p52_, auto-teste 68/68"
    requirement: JORN-52
    verification:
      - kind: unit
        ref: "node scripts/p52_portao.cjs --auto-teste"
        status: pass
    human_judgment: false
  - id: D3
    description: "p52_tipografia.cjs acusa/aceita as 11 amostras da UI-SPEC e recusa varredura vazia"
    requirement: JORN-58
    verification:
      - kind: unit
        ref: "node scripts/p52_tipografia.cjs --auto-teste"
        status: pass
    human_judgment: false
  - id: D4
    description: "p52_vitest_delta.cjs: auto-teste 9/9, BASE NAO MEDIDA no CLI, uso normal alteradas=0 · novas=0 · mordida=ok"
    requirement: JORN-52
    verification:
      - kind: unit
        ref: "node scripts/p52_vitest_delta.cjs --auto-teste"
        status: pass
      - kind: integration
        ref: "node scripts/p52_vitest_delta.cjs --base refs/gsd/52/nao-existe ; --base HEAD (exit 1, BASE NAO MEDIDA)"
        status: pass
      - kind: integration
        ref: "node scripts/p52_vitest_delta.cjs"
        status: pass
    human_judgment: false
  - id: D5
    description: "Base da fase refs/gsd/52/base fixada"
    verification:
      - kind: other
        ref: "git rev-parse --verify -q refs/gsd/52/base"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 01: Arnês da Wave 0 Summary

**Ensaio em PROD que aborta (`p52_ensaio.cjs`, verde contra PROD com `vistas=vacua`), portão com regra (8) por forma sobre `_p52_` (68/68), varredura tipográfica 14/16/24/48 · 400/600 sobre linhas acrescentadas (16/16), e portão da suíte Vitest por delta contra `refs/gsd/52/base` medido na mesma execução (9/9; uso normal `pre-existentes=2 · alteradas=0 · novas=0 · mordida=ok`).**

## Performance

- **Duration:** 10 min
- **Started:** 2026-10-11T02:47:26Z
- **Completed:** 2026-10-11T02:57:39Z
- **Tasks:** 3 (1 tracer + 2 auto)
- **Files modified:** 4 (todos novos, em `scripts/`)

## Accomplishments

- **Base da fase:** `refs/gsd/52/base` = `0d70ac7d433db9a9a644987dcf442cc50022aaae` (criada de forma idempotente pelo comando literal do plano).
- **Tracer (Task 1):** `p52_ensaio.cjs` rodou contra PROD duas vezes (antes do commit e de novo no portão do tracer), as duas vezes VERDE:
  `ENSAIO VERDE: supabase/tests/p51_raven_status_smoke.sql · prefixadas=[] · aplicadas=[] · ausentes=[20261011000001,20261011000002,20261011000003,20261011000004] · vistas=vacua · smokes=[51a=7/7] · evidencia=51a.f=4(lib=4,reg=1) · 1006 ms` (2ª: 801 ms). `capturar()` antes × depois sem diferença: nada persistiu.
- **Portão (Task 2):** `p52_portao.cjs --auto-teste` → `auto-teste ok: 68 casos` (o p51 tem 68; nenhum caso removido). Os casos «nenhuma migration p52 no pin» e «migration p52 fora da forma» (`20261011000006_p52_D23-fix.sql`) recusam com as mensagens novas.
- **Tipografia (Task 3a):** `--auto-teste` → `auto-teste ok: 16 casos (6 acusadas + 5 aceitas + 5 de julgamento)`; paridade com o `grep -E` da UI-SPEC conferida amostra a amostra (11/11 iguais); `TIPOGRAFIA VACUA` sem `--permitir-vazio` provado no auto-teste e no CLI real.
- **Delta (Task 3b):** `--auto-teste` → `AUTO-TESTE OK: 9/9`; `--base refs/gsd/52/nao-existe` e `--base HEAD` → exit 1 com `BASE NAO MEDIDA`; uso normal exit 0.

### Linha final do delta (uso normal) e pré-existentes impressos — medidos, não escritos no script

```
vitest delta: base=0d70ac7 2725/2 · head=70c323f 2725/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok
```

```
pre-existentes (falham na base e em HEAD) (2):
  - src/__tests__/promessasComExecutor.test.ts > Deferimento com prazo: a fase dona é conferida contra o roadmap, nos dois sentidos fase inexistente e fase já concluída REPROVAM — medido contra roadmaps sintéticos
  - src/__tests__/promessasComExecutor.test.ts > Metade 1 — o registro curado: toda promessa nomeada tem executor provado no disco deferida · o comentário de catálogo do ledger de notificações declara retenção INDE…
mordida: src/__tests__/p52-mordida-delta.test.ts > p52 mordida do delta reprova por construcao (…) → acusada como nova
```

São os mesmos dois vermelhos registrados em STATE.md:1404 e 51-VERIFICATION.md:120/165 — saíram por medição, não por lista.

### Mordida provada contra juiz vácuo (RED, sem commit separado)

- Tipografia: cópia em scratchpad com `acusa()` → `return false` → `auto-teste FALHOU: 7/16`, exit 1.
- Delta: cópia em scratchpad com `const codigo = 0;` no `julgar()` → `AUTO-TESTE FALHOU: 4/9`, exit 1.

## Task Commits

1. **Task 1 (tracer): ensaio p52 + base da fase** — `7c323281` (feat)
2. **Task 2: portão p52, regra (8) sobre `_p52_`** — `9aab0e3c` (feat)
3. **Task 3a: varredura tipográfica** — `878f8821` (feat)
4. **Task 3b: delta do Vitest contra `refs/gsd/52/base`** — `70c323ff` (feat)

## Files Created/Modified

- `scripts/p52_ensaio.cjs` — ensaio que aborta; cópia do p51 com sentinela, MIGS, pares, marcas, evidência, prefixo P52E/P52V e capturar() da fase
- `scripts/p52_portao.cjs` — portão do p51 com `RE_MIG_P52`/`RE_CITA_P52`; cabeçalho com os três usos (52-REVIEW-PORTAO, 52-REVIEW-BANCO, 52-REVIEW-LIMPEZA)
- `scripts/p52_tipografia.cjs` — `acusa()`/`julgarDiff()` exportados; `--base <ref> [--permitir-vazio] -- <caminhos…>`; `--auto-teste`
- `scripts/p52_vitest_delta.cjs` — `julgar()`/`relatorio()`/`baseNaoMedida()` exportados; `[--base <ref>]`; `--auto-teste`

## Decisions Made

Ver `key-decisions` no frontmatter. Em resumo: a base é a do comando literal (0d70ac7d); a evidência do ensaio carrega `p52.evidencia` + `p51.evidencia`; `capturar()` ganha só chaves aditivas; `alteradas` fica fora de `pre`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Sentinela do ensaio carrega também `p51.evidencia`**
- **Found during:** Task 1
- **Issue:** O plano manda zerar `p52.evidencia` no PREFIXO, e os planos 52-08/52-16/52-20 anexam evidência a ela; o sentinela do p51 só carregava `p51.evidencia`. Trocar por `p52.evidencia` apagaria a evidência dos smokes p51 que a fase re-roda (o próprio tracer: `51a.f=4(lib=4,reg=1)`); manter `p51.evidencia` perderia a da fase.
- **Fix:** `concat_ws(' ', p52.evidencia, p51.evidencia)` só das não vazias, `-` se nenhuma. Comportamento idêntico ao do p51 quando só a `p51.evidencia` existe (o tracer mostra a mesma string).
- **Files modified:** scripts/p52_ensaio.cjs
- **Verification:** tracer verde com `evidencia=51a.f=4(lib=4,reg=1)`
- **Committed in:** 7c323281

**2. [Rule 2 - Missing Critical] `capturar()` vigia também os titulares sintéticos `p52%smoke-%`**
- **Found during:** Task 1
- **Issue:** O plano pede só a contagem de `p52_mutacao_%`; os smokes p52 (52l/52b/52d) vão criar fixtures com o prefixo da fase, e um envelope que não revertesse ficaria fora do PERSISTIU.
- **Fix:** chave aditiva `fixtures_p52` (só leitura), mesma forma da `fixtures` do p51. Nenhuma chave do p51 removida.
- **Files modified:** scripts/p52_ensaio.cjs
- **Verification:** tracer verde (antes = depois)
- **Committed in:** 7c323281

---

**Total deviations:** 2 auto-fixed (2 missing critical, ambos aditivos e só no ensaio)
**Impact on plan:** Nenhuma mudança de comportamento do arnês fora das chaves/evidência da fase; diff de código contra o p51 conferido por normalização (só as linhas da fase diferem).

## Issues Encountered

- Nenhum. Observação: `requirements-completed` copia o frontmatter do plano; os três ids (JORN-52/58/63) são compartilhados por outros planos da fase e NÃO foram marcados em REQUIREMENTS.md (regra do operador: tracking só à mão em STATE/ROADMAP; e o gate de id compartilhado os seguraria de qualquer forma).

## Threat Model

T-52-01 (ensaio que persiste): cópia sem mudança de comportamento, `recusarTerminadores`, `ponto()` sobre `p52.tx`, PERSISTIU como parada — provado verde contra PROD. T-52-02 (forma que a regra 8 não vê): `RE_CITA_P52` + caso `_p52_D23-fix` no auto-teste. T-52-03: base registrada acima. T-52-77: BASE NAO MEDIDA provado no CLI e no auto-teste; `alteradas`; nenhum nome de teste no script (portão de forma do verify verde). T-52-SC: nenhuma instalação.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Os quatro instrumentos que os portões dos blocos B, C e D usam existem e mordem; nada foi escrito em PROD (as duas execuções do ensaio abortaram no sentinela, captura antes = depois).
- Pronto para a Wave 2 (planos que dependem do 52-01).

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*

## Self-Check: PASSED

- FOUND: scripts/p52_ensaio.cjs, scripts/p52_portao.cjs, scripts/p52_tipografia.cjs, scripts/p52_vitest_delta.cjs
- FOUND commits (ancestrais de HEAD): 7c323281, 9aab0e3c, 878f8821, 70c323ff
- FOUND: refs/gsd/52/base → 0d70ac7d433db9a9a644987dcf442cc50022aaae
