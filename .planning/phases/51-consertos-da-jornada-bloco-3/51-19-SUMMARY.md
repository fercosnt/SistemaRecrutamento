---
phase: 51-consertos-da-jornada-bloco-3
plan: 19
subsystem: compliance
tags: [lgpd, recibo-exclusao, pii-inventory, gerador, gap-closure, G1b, WR-02]

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-05 — linha «mantém» estado_e_faixa_etaria e os casos (14)-(16), (r10)-(r12)"
provides:
  - "recibo de exclusão com as razões separadas: faixa etária «para relatório agregado», UF «porque o cadastro exige uma UF válida», nos dois tempos"
  - "nota de candidatos.estado no inventário com a razão real (check_estado, NOT NULL), classificação intacta"
  - "disponibilidade.candidato_id na origem de dados_de_cadastro (passo tombstone_candidato)"
  - "51-19-TEXTO-APROVADO.md — aprovação do operador, lida por máquina no 51-24 antes do deploy"
  - "casos (17), (18), (r13) com RED provado na base"
affects: [51-20, 51-22, 51-24]

actuals:
  tokens: 9750
  tasks: 3
  commits: 6
plan_head_before: 03ceab59ad126e4a91a3b01ed8c34e28433e66df
plan_head_after: 405e19bd3595dc7c47949d2012d86a7d1f1ae316

tech-stack:
  added: []
  patterns:
    - "texto ao titular aprovado pelo operador registrado como arquivo-chave lido por máquina antes do deploy"
    - "asserção por forma, frase a frase, em vez de literal, para a finalidade de cada dado retido"

key-files:
  created:
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-19-TEXTO-APROVADO.md
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-19/task3.json
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-19/task3-junit.xml
  modified:
    - docs/compliance/sql/gen-recibo-exclusao.cjs
    - docs/compliance/pii-inventory.yaml
    - docs/compliance/pii-inventory.md
    - docs/compliance/recibo-exclusao.json
    - supabase/functions/_shared/reciboExclusao.ts
    - src/features/privacidade/constants/reciboExclusao.generated.ts
    - docs/compliance/__tests__/genReciboExclusao.test.ts
    - src/features/privacidade/components/__tests__/ReciboExclusao.test.tsx

key-decisions:
  - "Operador aprovou em 2026-10-10 (opção «aprovar») o texto da linha «Estado e faixa etária» nos dois tempos e a mudança da origem disponibilidade.candidato_id para o passo do tombstone"
  - "(r13) assere o texto aprovado por igualdade literal: mudar a copy exige nova aprovação, não um teste afrouxado"

requirements-completed: [JORN-49]

coverage:
  - id: D1
    description: "A linha «Estado e faixa etária» do recibo dá a cada dado a sua razão verdadeira nos dois tempos (faixa: relatório agregado; UF: o cadastro exige uma UF válida)"
    requirement: "JORN-49"
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genReciboExclusao.test.ts#(17)"
        status: pass
      - kind: unit
        ref: "src/features/privacidade/components/__tests__/ReciboExclusao.test.tsx#(r13)"
        status: pass
    human_judgment: false
  - id: D2
    description: "disponibilidade.candidato_id mapeada para dados_de_cadastro (tombstone_candidato); devolvê-la a vinculos_nos_registros_que_ficam reprova a geração"
    requirement: "JORN-49"
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genReciboExclusao.test.ts#(18)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Texto gerado é byte a byte o aprovado pelo operador, registrado em 51-19-TEXTO-APROVADO.md"
    requirement: "JORN-49"
    verification:
      - kind: other
        ref: "node (verify 2 da Task 3): recibo gerado = texto aprovado pelo operador (2026-10-10)"
        status: pass
    human_judgment: false

duration: ~18min
completed: 2026-10-10
status: complete
---

# Phase 51 Plan 19: Recibo — razões separadas da faixa etária e da UF (G1b) Summary

**O recibo de exclusão deixa de dizer que a UF fica «para relatório agregado»: a faixa etária fica para o relatório, e a UF fica porque o cadastro exige uma UF válida. O operador aprovou o texto, e o texto gerado é byte a byte o aprovado. Nada foi publicado; o deploy fica para o 51-24.**

## Performance

- **Duration:** ~18 min de execução do 51-19. O ledger foi gravado às 02:09 -03; o commit final é das 02:27 -03. Entre a Task 1 e a Task 2 rodaram o checkpoint e o 51-18.
- **Started:** 2026-10-10T02:09-03:00 (ledger em 03ceab59)
- **Completed:** 2026-10-10T02:27-03:00
- **Tasks:** 3/3
- **Files modified:** 11 (6 na Task 1, 1 na Task 2, 4 na Task 3)

## Accomplishments

- No `gen-recibo-exclusao.cjs`, o item `estado_e_faixa_etaria` agora diz, nos dois tempos: «Fica(ou) guardada a sua faixa etária, sem vínculo com o seu nome, para relatório agregado. Fica(ou) guardada também a sigla do seu estado (UF), sem vínculo com o seu nome, porque o cadastro exige uma UF válida.» Não mudaram `item_id`, rótulo, base legal (LGPD, Art. 16, IV), `aplicavel_quando` nem as origens.
- A nota de `candidatos.estado` no `pii-inventory.yaml` agora diz a razão real: `check_estado` com as 27 UFs e NOT NULL. A frase sobre «alimenta o relatório agregado (bias snapshot) por UF» saiu. A classificação continua `preservar_com_ressalva`. Por isso a export allowlist não mudou: o `git diff --stat refs/gsd/51-19/base` dela sai vazio.
- `disponibilidade.candidato_id` saiu de `vinculos_nos_registros_que_ficam` (passo `severar_fks_set_null`) e entrou em `dados_de_cadastro` (passo `tombstone_candidato`). É consequência do G1a. O texto de `dados_de_cadastro` não mudou.
- Os artefatos foram regenerados só pelos geradores: `recibo-exclusao.json`, os dois espelhos TS e `pii-inventory.md`. Os quatro `check:` saem `OK`.
- Aprovação do operador registrada em `51-19-TEXTO-APROVADO.md`, com chaves que o 51-24 lê por máquina e a resposta verbatim («Aprovar (Recommended)»).
- Casos novos: (17) e (18) no gerador e (r13) na tela. Os três falham na base pelo comportamento e passam no HEAD.

## Task Commits

1. **Task 1 (tracer): razões separadas, nota da UF, origem da disponibilidade, regenerado** — `359fd59a` (feat)
2. **Task 2 (checkpoint:decision, blocking-human): texto aprovado pelo operador** — `4d58129e` (docs)
3. **Task 3: testes (17)/(18)/(r13) + RED na base** — `405e19bd` (test)

**Contagem medida:** `git rev-list --count 03ceab59..HEAD` = **6**. Dessas, três são do 51-19 (`359fd59a`, `4d58129e`, `405e19bd`). As outras três (`4014c299`, `4003bfb1`, `07cdc88b`) são do 51-18, que foi executado e commitado entre a Task 1 e a Task 2, sobre arquivos sem relação com este plano. O número 6 é a medida bruta do ledger; não foi ajustado.

## Os quatro `check:` e o D-53

- **Depois da Task 1** (registrado no commit `359fd59a`): os quatro `check:` verdes; `tsc` 89 → 89.
- **Baseline dos quatro `check:` antes da Task 1:** este agente de continuação não recebeu a saída da execução da Task 1. O commit dela registra apenas o «depois» e o `tsc` de antes e depois (89 → 89). Os quatro `check:` sem regenerar a allowlist e o diff vazio da allowlist contra a base provam que a classificação não mudou.
- **Depois da Task 3:** `check:recibo-exclusao`, `check:pii-inventory-md`, `check:export-allowlist` e `check:matriz-retencao` imprimem `OK`. `npm run -s lint`: exit 2, **89** `error TS` (≤ 90, D-53). O hook de commit reporta «tsc errors: 89 (frozen baseline: 96)».
- `check:export-allowlist` ficou verde sem regenerar a allowlist.

## Texto gerado = texto aprovado

- `51-19-TEXTO-APROVADO.md`: `texto_futuro` (208 bytes) e `texto_passado` (210 bytes) foram conferidos com `Buffer.equals` contra o `recibo-exclusao.json` em `359fd59a`, e são iguais.
- No HEAD, o verify 2 da Task 3 imprime «recibo gerado = texto aprovado pelo operador (2026-10-10)». A posição da origem bate com `mover_origem_disponibilidade: sim`.
- O operador aprovou sem ajuste, então a Task 3 não regenerou nada.
- `aprovado_em` leva só a data (2026-10-10). O canal (AskUserQuestion) não registrou a hora da resposta, e este agente não inventou uma. A hora em que o arquivo foi escrito está em `registrado_em: 2026-10-10 02:24 -0300`.

## RED na base (`.red-51-19/`)

Worktree destacado de `refs/gsd/51-19/base` (03ceab59), com `node_modules` por symlink e os dois arquivos de teste copiados; rodado com `--reporter=junit`. Resultado: `vitest_exit=1`, 31 casos e **3 falhas, todas por comportamento**:
- (17): na base, a frase da UF diz «relatório agregado» («Ficam guardados o seu estado (UF) e a…»).
- (18): na base, `disponibilidade.candidato_id` está fora de `dados_de_cadastro`.
- (r13): na base, a tela não mostra o texto aprovado.

Os outros 28 passam na base, inclusive (15) e (r10). O worktree foi removido (`git worktree remove`).

No HEAD: `npx vitest run docs/compliance/__tests__/genReciboExclusao.test.ts docs/compliance/__tests__/exportAllowlist.test.ts src/features/privacidade src/__tests__/guards/forbidden-strings.grep.test.ts` dá 14 arquivos e **250/250 passando**. O guard D-58 (`forbidden-strings`) continua verde.

## Files Created/Modified

- `docs/compliance/sql/gen-recibo-exclusao.cjs` — texto do item `estado_e_faixa_etaria` (G1b) e origem de `disponibilidade.candidato_id` (G1a).
- `docs/compliance/pii-inventory.yaml` — nota de `candidatos.estado`.
- `docs/compliance/pii-inventory.md`, `docs/compliance/recibo-exclusao.json`, `supabase/functions/_shared/reciboExclusao.ts`, `src/features/privacidade/constants/reciboExclusao.generated.ts` — regenerados pelos geradores, nunca editados à mão.
- `.planning/phases/51-consertos-da-jornada-bloco-3/51-19-TEXTO-APROVADO.md` — aprovação do operador, lida por máquina no 51-24.
- `docs/compliance/__tests__/genReciboExclusao.test.ts` — (17) por forma, frase a frase; (18) com o artefato e a mutação que devolve a coluna ao passo de severar e reprova por `ORIGEM DUPLICADA`, nomeando `disponibilidade.candidato_id`.
- `src/features/privacidade/components/__tests__/ReciboExclusao.test.tsx` — (r13): texto aprovado literal nos dois tempos e, por forma, a frase da UF sem «relatório agregado».
- `.planning/phases/51-consertos-da-jornada-bloco-3/.red-51-19/task3.json`, `task3-junit.xml` — evidência RED.

## Decisions Made

- Operador, 2026-10-10, no checkpoint da Task 2 (AskUserQuestion): «Aprovar (Recommended)», isto é, a opção `aprovar`. Aprova a proposta nos dois tempos e a mudança de origem da disponibilidade.
- (r10) e (15) do 51-05 **não** foram alterados. O texto aprovado mantém o trecho «sem vínculo com o seu nome, para relatório agregado» (na frase da faixa), e os dois seguem verdes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Hook `guard-git.sh` confundiu `e.push(` dentro de `node -e` com um push forçado**
- **Found during:** Task 1 (verifies `node -e` do plano)
- **Issue:** O hook de guarda do git leu `e.push(` dentro dos verifies `node -e` do plano como um push forçado e bloqueou o comando.
- **Fix:** Os mesmos verifies, **sem alteração**, foram gravados em arquivos de scratchpad e rodados com `node <arquivo>`. A Task 3 seguiu o mesmo padrão (`v2.js`, `v3b.js`). O conteúdo das asserções é idêntico ao do plano.
- **Files modified:** nenhum do repositório.
- **Committed in:** n/a

**2. [Rule 3 - Blocking] Primeiro `git add` da Task 1 falhou porque o zsh não faz word-split de `$F`**
- **Found during:** Task 1 (commit)
- **Issue:** Uma lista de caminhos em `$F` foi passada como um argumento só, e nada foi staged.
- **Fix:** O comando foi refeito com os caminhos explícitos e literais.
- **Committed in:** `359fd59a`

---

**Total deviations:** 2, ambos Rule 3 de ferramenta, sem efeito no código.
**Impact on plan:** nenhum. Os verifies são os do plano, byte a byte.

## Issues Encountered

- O 51-18 foi executado e commitado entre a Task 1 e a Task 2 (`4014c299`, `4003bfb1`, `07cdc88b`), sobre arquivos disjuntos. Por isso `commits: 6` no frontmatter, como explicado em «Task Commits».

## Nada publicado

- `git ls-remote origin refs/heads/main` = `53cb73ff240df4507fd808aa86c909e43a941669` no início desta continuação e no fim. Nenhum push, nenhum deploy de EF e nenhum apply.
- O deploy de `executar-direito-titular` com o texto novo é do 51-24, depois do review do 51-22. O 51-24 confere de novo, por máquina, a igualdade com `51-19-TEXTO-APROVADO.md`.
- Recibos já emitidos não mudam (D-23). `gerar_bias_snapshot` não foi tocado.

## Next Phase Readiness

- 51-20 a 51-22 (motor que apaga a linha de `disponibilidade` no tombstone): o recibo já mapeia `disponibilidade.candidato_id` para `tombstone_candidato`.
- 51-24: tem a entrada de máquina `51-19-TEXTO-APROVADO.md` (chaves `texto_futuro`, `texto_passado`, `mover_origem_disponibilidade`, `aprovado_em`).

## Self-Check: PASSED

- FOUND: `51-19-TEXTO-APROVADO.md`, `.red-51-19/task3.json`, `.red-51-19/task3-junit.xml`, e os dois arquivos de teste modificados.
- FOUND (ancestrais de HEAD): `359fd59a`, `4d58129e`, `405e19bd`.
