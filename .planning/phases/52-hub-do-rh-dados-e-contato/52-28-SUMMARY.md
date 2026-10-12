---
phase: 52-hub-do-rh-dados-e-contato
plan: 28
subsystem: ui
tags: [wcag, contraste, glass, tailwind, vitest, painel-candidato, gap-closure]

requires:
  - phase: 52-04
    provides: "SELO_AGUARDANDO_EQUIPE e o estado «avaliações concluídas» do painel (D-27)"
  - phase: 52-06
    provides: "o conserto do «Agradecemos» no formulário — o painel tinha ficado de fora (52-RESEARCH:618)"
provides:
  - "scripts/p52_contraste.cjs — medidor WCAG: pior caso sobre cada pixel da imagem real, pilha real de vidros, controle que morde, cenários ancorados no fonte, --auto-teste 24/24"
  - "caixa painel-rejeicao com superfície local escura (bg-[#00109E]/70) e os dois parágrafos em 16 px branco 80%"
  - "todos os selos do painel (getStatusInfo e SELO_AGUARDANDO_EQUIPE) e o chip «Cancelada» com fundo opaco ≥ 4,5:1"
  - "DashboardCandidatoPage.selos.test.tsx — guarda pela forma, uma mordida por predicado"
  - "emendas na 52-UI-SPEC (linha do painel, «Contraste», bloco «Emendas do UAT da 52») e no 52-RESEARCH:618"
affects: [52-29, 52-30]

actuals:
  tokens: 16417
  tasks: 3
  commits: 7
plan_head_before: 0940aa39f5e42c797e8e547ca8af107654515fde
plan_head_after: fec1bb347d38dc3fb348ddcaed918d470c769f41

tech-stack:
  added: []
  patterns:
    - "Contraste sobre vidro é medido (pior caso sobre a imagem real, pilha real), nunca presumido pela classe do texto"
    - "Medidor com controle que tem de morder na mesma execução e cenários ancorados no fonte"
    - "Guarda de teste pela FORMA (objeto com icon: e label:), com uma mordida por predicado sobre cópias mutadas do fonte, pelo MESMO juiz"
    - "Teste e CLI usam a MESMA função (createRequire(import.meta.url) do .cjs)"

key-files:
  created:
    - scripts/p52_contraste.cjs
    - src/components/pages/__tests__/DashboardCandidatoPage.selos.test.tsx
  modified:
    - src/components/pages/DashboardCandidatoPage.tsx
    - src/features/agendamento/components/AgendamentoCandidatoCard.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx
    - src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-RESEARCH.md

key-decisions:
  - "Superfície da caixa da rejeição em bg-[#00109E]/70 (pior caso 5,73:1); não foi preciso subir a opacidade"
  - "Selos opacos: texto -100 sobre tom -800 da mesma família (cinza -700); significado de cada cor mantido"
  - "Só «Cancelada» mudou no STATUS_CONFIG (decisão do operador); os outros cinco chips e as duas notas ficam como residual medido"
  - "julgarSelos ganhou um quinto prefixo, CLASSE DESCONHECIDA, para um token que não resolve não se passar por contraste baixo"

patterns-established:
  - "p52_contraste.cjs: alvo / controle / informativo; informativo nunca muda a saída"

requirements-completed: [JORN-62, JORN-59]

coverage:
  - id: D1
    description: "Medidor de contraste sobre a imagem real, com controle que morde e cenários ancorados no fonte"
    requirement: JORN-62
    verification:
      - kind: other
        ref: "node scripts/p52_contraste.cjs --auto-teste (P52-CONTRASTE AUTO-TESTE OK: 24/24)"
        status: pass
      - kind: other
        ref: "node scripts/p52_contraste.cjs (ALVO painel-rejeicao OK; CONTROLE MORDE; CONTRASTE OK)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cartão rejeitado legível: caixa painel-rejeicao escura, os dois parágrafos em text-base text-white/80 com o texto inalterado, selo «Rejeitado» opaco"
    requirement: JORN-62
    verification:
      - kind: unit
        ref: "src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx#rejeitada: caixa da rejeição com superfície escura, texto inalterado, e selo «Rejeitado» opaco com contraste ≥ 4,5"
        status: pass
    human_judgment: false
  - id: D3
    description: "Todos os selos do painel e «Cancelada» com fundo opaco ≥ 4,5:1, guarda pela forma com uma mordida por predicado"
    requirement: JORN-59
    verification:
      - kind: unit
        ref: "src/components/pages/__tests__/DashboardCandidatoPage.selos.test.tsx"
        status: pass
      - kind: unit
        ref: "src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx#todas concluídas → a frase no «Próximo passo», nenhum botão, selo «Aguardando a equipe»; nada escrito"
        status: pass
      - kind: unit
        ref: "src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx#(a) cancelada + FUTURE data_hora"
        status: pass
    human_judgment: false
  - id: D4
    description: "Legibilidade percebida do cartão rejeitado e dos selos no painel real (celular e desktop, sobre o fundo fixo)"
    verification: []
    human_judgment: true
    rationale: "O medidor prova o pior caso numérico; a leitura no aparelho real (rolagem, fonte renderizada, aparência dos selos escuros sobre o vidro) é julgamento do operador — vai à reverificação do UAT depois da publicação do 52-30"
  - id: D5
    description: "52-UI-SPEC e 52-RESEARCH emendados (linha do painel, «Contraste», bloco de emendas, RESEARCH:618 superado)"
    verification:
      - kind: other
        ref: "node -e (verify do Task 3: emendas G-52-6: UI-SPEC e RESEARCH ok)"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-10-12
status: complete
---

# Phase 52 Plan 28: Cartão rejeitado legível e selos opacos no painel do candidato — Summary

**A caixa da rejeição agora tem superfície local escura `bg-[#00109E]/70`, com o «Agradecemos» em 16 px branco 80% (pior caso 5,73:1 sobre a imagem real; a caixa de antes media 1,38:1). Todos os selos do painel e o chip «Cancelada» ganharam fundo opaco (6,38–9,37:1). Um medidor versionado (`scripts/p52_contraste.cjs`) calcula o contraste sobre cada pixel da imagem real, inclui um controle que tem de morder e confere cada cenário contra o fonte.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-10-12T06:20:56Z
- **Completed:** 2026-10-12T06:34:06Z
- **Tasks:** 3 (tracer + 2)
- **Files modified:** 9 (2 criados, 7 alterados)

## Accomplishments

- **Medidor** `scripts/p52_contraste.cjs`. Lê o caminho da imagem `gradient` direto do import de `backgrounds.ts` e a amostra a 480×286 com o `sips`. Compõe a pilha real do painel: véu preto 15%, `GlassPanel` branco 15% e `GlassCard` branco 15%/25% no hover, com e sem a saturação 1,5. Imprime pior caso, mediana e melhor caso de cada cenário. Um controle tem de sair abaixo do alvo. Se o código mudar e o cenário não, a âncora acusa `CENARIO DESCOLADO DO FONTE`. O `--auto-teste` (24/24) chama as mesmas funções.
- **Cartão rejeitado** (G-52-6, JORN-62): `data-testid="painel-rejeicao"`, superfície `bg-[#00109E]/70`, os dois parágrafos em `text-base text-white/80` e o texto inalterado (D-15 da Phase 48). O selo «Rejeitado» passou a `text-red-100` sobre `bg-red-800`.
- **Todos os selos** (decisão do operador «Todos os selos»): blue/yellow/green `-100` sobre `-800`. Finalizado, o default e `SELO_AGUARDANDO_EQUIPE` passaram a `text-gray-100` sobre `bg-gray-700`. O markup do selo não mudou, só os valores do mapa.
- **«Cancelada»** (decisão «Entra junto»): mesmo par do «Rejeitado». O comando sobre o diff dos commits do 52-28 confirma que os outros cinco chips do `STATUS_CONFIG` ficaram intocados.
- **Guarda pela forma** `DashboardCandidatoPage.selos.test.tsx`. Cinco mordidas, cada uma reprovando sozinha pelo seu predicado: opacidade, contraste, falta de `bg`, falta de `color` e população.
- **Contrato** emendado: 52-UI-SPEC (linha do painel, linha da D-27, emenda do «Contraste», bloco «Emendas do UAT da 52») e 52-RESEARCH:618 marcado como SUPERADO.

## Task Commits

1. **Task 1 (tracer): cartão rejeitado legível de ponta a ponta**
   - `01436adf` test(52-28): RED, a caixa escura e o selo opaco no `encerrada.test`
   - `48a4ee40` feat(52-28): medidor de contraste sobre a imagem real, com controle que morde
   - `03f81a48` fix(52-28): caixa escura, «Agradecemos» em 16px, selo «Rejeitado» opaco
2. **Task 2: todos os selos e «Cancelada» opacos**
   - `f5d85b2b` test(52-28): RED, selos lidos pela forma, uma mordida por predicado
   - `0f5ac731` fix(52-28): todos os selos do painel e «Cancelada» com fundo opaco
   - `5c412621` chore(52-28): o medidor mede os chips e as notas fora da decisão, como informativo
3. **Task 3: contrato emendado; delta, lint, tipografia, build**
   - `fec1bb34` docs(52-28): UI-SPEC e RESEARCH

**Plan metadata:** commit deste SUMMARY (`docs(52-28): …`).

## Saída do medidor (verbatim, HEAD `fec1bb34`)

```
$ node scripts/p52_contraste.cjs --auto-teste | tail -1
P52-CONTRASTE AUTO-TESTE OK: 24/24

$ node scripts/p52_contraste.cjs
ALVO painel-rejeicao: min=5.73 mediana=6.72 max=7.96 alvo=4.50 OK
CONTROLE controle-painel-rejeicao-antes: min=1.38 mediana=2.04 max=3.37 alvo=4.50 MORDE
INFORMATIVO agendamento-chip-agendada: min=1.33 mediana=2.24 max=4.11
INFORMATIVO agendamento-chip-em_andamento: min=1.14 mediana=1.87 max=3.42
INFORMATIVO agendamento-chip-concluida: min=1.46 mediana=2.39 max=4.46
INFORMATIVO agendamento-chip-reagendada: min=1.44 mediana=2.28 max=4.22
INFORMATIVO agendamento-chip-nao_compareceu: min=1.46 mediana=2.39 max=4.46
INFORMATIVO agendamento-nota-reagendada: min=1.45 mediana=2.55 max=5.23
INFORMATIVO agendamento-nota-cancelada: min=1.18 mediana=2.09 max=4.26
CONTRASTE OK: 1 cenario(s) no alvo; 1 controle(s) mordem; amostras=480x286
```

Saída 0. As medidas reproduzem exatamente a planilha do planejamento: `/60` → 4,69, `/70` → 5,73, `/80` → 6,87 e a caixa antiga → 1,38. Como `/70` passou, a opacidade não precisou subir.

Pares opacos, pela mesma `contrasteDeClasses`: azul 7,15 · amarelo 6,38 · verde 6,49 · vermelho 6,80 · cinza 9,37.

## Residual para o 52-30 levar ao operador (fora da decisão «Cancelada» → «Entra junto»)

No `AgendamentoCandidatoCard`, o cartão é montado dentro do `GlassCard` do painel e usa a mesma pilha. O limiar para texto seria **4,5:1** (WCAG 1.4.3):

| Item | Classes | Pior caso medido | Mediana | Melhor caso |
|---|---|---|---|---|
| chip `agendada` | `text-green-300` sobre `bg-green-500/20` | **1,33** | 2,24 | 4,11 |
| chip `em_andamento` | `text-blue-300` sobre `bg-blue-500/20` | **1,14** | 1,87 | 3,42 |
| chip `concluida` | `text-gray-300` sobre `bg-gray-500/20` | **1,46** | 2,39 | 4,46 |
| chip `reagendada` | `text-yellow-300` sobre `bg-yellow-500/20` | **1,44** | 2,28 | 4,22 |
| chip `nao_compareceu` | `text-gray-300` sobre `bg-gray-500/20` | **1,46** | 2,39 | 4,46 |
| nota reagendada | `text-yellow-200/90` (sem superfície) | **1,45** | 2,55 | 5,23 |
| nota cancelada | `text-red-200/90` (sem superfície) | **1,18** | 2,09 | 4,26 |

Os sete ficam abaixo de 4,5 em todo o pior caso, e na maior parte das medianas também. Se o operador decidir estendê-los, a receita é a mesma desta rodada: par opaco para os chips e superfície local escura (ou texto branco 80% sobre ela) para as notas.

## Provas de que morde

**RED do Task 1.** O alvo falhou numa asserção de comportamento, antes de carregar o medidor:
`AssertionError: a caixa painel-rejeicao tem de existir: expected null not to be null`. O relatório TAP do classificador saiu `RED_EVIDENCE_OK (target_test_failed)`. Avaliação semântica: o alvo executou e falhou na primeira asserção planejada. O `require` do medidor fica dentro do caso, depois das asserções de DOM, então a falha é de comportamento, não de módulo ausente. Os outros 5 casos do arquivo ficaram verdes.

**RED do Task 2** (`RED_EVIDENCE_OK (target_test_failed)`). O alvo `fonte real: …` falhou com `expected 'FUNDO TRANSLUCIDO: COPY_PAINEL_AVALIA…' to be ''`: eram seis descritores translúcidos. O `concluidas.test` falhou em `toHaveClass("text-gray-100")` e o caso (a) do agendamento em `expected 'text-red-300' to be 'text-red-100'`. As mordidas m2..m5 falharam só porque o fonte ainda não estava limpo. Não houve falha de import, módulo ou ambiente.

**Mordida externa da guarda dos selos** sobre o fonte real, com o mesmo filtro, trap e restauração (`git diff --quiet` vazio):
```
=== SEM mutacao:
      Tests  1 passed | 6 skipped (7)
=== COM mutacao (Aguardando Resposta -> bg-blue-800/40):
AssertionError: expected 'FUNDO TRANSLUCIDO: \'Aguardando Respo…' to be '' // Object.is equality
+ FUNDO TRANSLUCIDO: 'Aguardando Resposta' bg-blue-800/40
      Tests  1 failed | 6 skipped (7)
```

**Âncoras do medidor**, também com trap e `git diff --quiet` vazio depois:
- `bg-[#00109E]/70` trocado por `/60` no `DashboardCandidatoPage.tsx`: sem a mutação, `CONTRASTE OK …` (rc=0). Com ela, `CENARIO DESCOLADO DO FONTE: painel-rejeicao src/components/pages/DashboardCandidatoPage.tsx /data-testid="painel-rejeica…` (rc=1).
- `text-yellow-200/90` trocado por `text-yellow-100/90` no `AgendamentoCandidatoCard.tsx`: `CENARIO DESCOLADO DO FONTE: agendamento-nota-reagendada …` (rc=1).

**As cinco mordidas internas** do `selos.test` estão verdes no HEAD. Cada uma confere que a cópia mudou e que só o prefixo visado aparece.

## Verificação (comandos do plano, no HEAD commitado)

- Task 1: auto-teste + CLI (3 linhas) → `VERIFY1=0`. `encerrada` + `funnel`: 15/15. Tipografia: `TIPOGRAFIA OK (43 linhas acrescentadas varridas)`.
- Task 2: painel + agendamento, 7 arquivos, 50/50. Tipografia nos dois arquivos de tela: `TIPOGRAFIA OK (62 linhas acrescentadas varridas)`. O comando sobre o diff do `STATUS_CONFIG` imprimiu `STATUS_CONFIG: so cancelada mudou nos commits do 52-28`. As sete linhas `INFORMATIVO agendamento-…` estão presentes e o resultado final é `CONTRASTE OK`.
- Task 3:
  - Emendas: `emendas G-52-6: UI-SPEC e RESEARCH ok`.
  - Delta do Vitest (linha final): `vitest delta: base=0d70ac7 2725/2 · head=fec1bb3 3112/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok`. As duas pré-existentes são do `promessasComExecutor.test.ts` e falham também na base.
  - Lint: `lint exit=2 tsc errors=89`, dentro do teto da fase, e nenhum erro nos arquivos deste plano.
  - Tipografia, contraste e `npm run build` verdes: `lint, tipografia, contraste e build verdes`.
  - O marcador `painel-rejeicao` está em `build/assets/index-CON4Ejdd.js` (chunk eager), para o enumerador do 52-30.

## Files Created/Modified

- `scripts/p52_contraste.cjs` — medidor WCAG: funções puras exportadas, cenários alvo, controle e informativo, âncoras de fonte e `--auto-teste`.
- `src/components/pages/__tests__/DashboardCandidatoPage.selos.test.tsx` — guarda pela forma e cinco mordidas.
- `src/components/pages/DashboardCandidatoPage.tsx` — caixa `painel-rejeicao`, `getStatusInfo` e `SELO_AGUARDANDO_EQUIPE` opacos, comentários.
- `src/features/agendamento/components/AgendamentoCandidatoCard.tsx` — `STATUS_CONFIG.cancelada` opaco; o docblock registra o residual.
- `…/DashboardCandidatoPage.encerrada.test.tsx`, `…/DashboardCandidatoPage.concluidas.test.tsx`, `…/AgendamentoCandidatoCard.test.tsx` — asserções novas, com o contraste calculado pela função do medidor sobre as classes lidas do DOM.
- `52-UI-SPEC.md`, `52-RESEARCH.md` — emendas datadas.

## Decisions Made

- `/70` atende com folga (5,73 ≥ 4,5); não foi preciso subir a opacidade.
- O `default` do `getStatusInfo` também é um descritor (tem `icon:` e `label:`), por isso entrou no par cinza opaco.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Asserções em uma linha para o relatório TAP do classificador de RED**
- **Found during:** Task 1 e Task 2 (RED)
- **Issue:** o reporter `tap-flat` do Vitest não escapa mensagens de várias linhas (o dump de DOM do `getByTestId`, o `actual` de arrays, o `toHaveClass` do jest-dom), e o `check tdd-red-evidence` rejeitava o relatório (`invalid_record`, «Malformed TAP»).
- **Fix:** no `encerrada.test`, `queryByTestId` com `expect(…, 'a caixa painel-rejeicao tem de existir').not.toBeNull()`. No `selos.test`, as listas comparadas como texto (`join(' | ')`, esperado `''`). O comportamento testado é o mesmo. Para o RED do Task 2, o relatório do arquivo alvo foi classificado isolado.
- **Verification:** `RED_EVIDENCE_OK (target_test_failed)` nas duas.
- **Committed in:** `01436adf`, `f5d85b2b`

**2. [Rule 2 - Missing Critical] Prefixo `CLASSE DESCONHECIDA` no `julgarSelos`**
- **Found during:** Task 2
- **Issue:** um token que não resolve (ex.: `color: 'text-red-100 x'`) faria o `contrasteDeClasses` lançar. Sem prefixo próprio, ou o teste quebrava sem diagnóstico, ou a falha virava «contraste baixo», que é falso.
- **Fix:** quinto prefixo, que entra no conjunto de «outros predicados» de cada mordida.
- **Committed in:** `f5d85b2b`

**3. [Rule 2 - Missing Critical] O juiz do medidor reprova quando não há controle**
- **Found during:** Task 1
- **Issue:** sem nenhum cenário de controle, o medidor não prova que morde e ainda diria `CONTRASTE OK`.
- **Fix:** `CONTRASTE ERRO: nenhum cenario de controle …` (saída 1), coberto no `--auto-teste`.
- **Committed in:** `48a4ee40`

**4. [Exatidão] Número da emenda do «Contraste» na UI-SPEC**
- **Found during:** Task 3
- **Issue:** o plano ditava «texto branco puro sobre o cartão vai de 2,17 a 6,23:1». Esse 2,17 é o da faixa turquesa do diagnóstico, sem hover nem saturação. O medidor dá pior caso **1,74** com essas variantes (caixa antiga, branco puro).
- **Fix:** a emenda diz «de 1,74 a 6,23:1» e explica de onde vêm o 1,74 e o 2,17.
- **Committed in:** `fec1bb34`

**5. [Aditivo] Coberturas a mais**
- O `selos.test` confere no fonte que o ícone e o rótulo do selo usam o mesmo `statusInfo.color` (ícone + palavra). O `--auto-teste` cobre também a saturação (ponto fixo do cinza, corte em 0–255) e a pilha num pixel sintético contra a composição manual. Nada disso muda o escopo.

---

**Total deviations:** 5 (1 bloqueio de ferramenta de evidência, 2 correções críticas, 1 de exatidão de número, 1 aditiva). **Impact:** nenhuma mudança de escopo. Nenhuma cópia de produto mudou, nem primitivo compartilhado (`glass.tsx`, `badge.tsx`), banco, Edge Function ou migration.

## TDD Gate Compliance

- Task 1: RED `01436adf` (test), GREEN `48a4ee40` (feat, medidor) e `03f81a48` (fix, cartão). A ordem é a do plano.
- Task 2: RED `f5d85b2b` (test), GREEN `0f5ac731` (fix). O plano prescreve `fix(52-28)` como commit verde, não `feat`. O `chore` `5c412621` só acrescenta os informativos ao medidor.
- Sem REFACTOR (nada a limpar).

## Issues Encountered

- O `zsh` não separa em palavras um `$CMD` com espaços (primeira tentativa de RED: `exit 127`, descartada). A partir dali os comandos de verificação rodaram em `bash -c`.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Só apresentação e um script de leitura local (sem rede, sem escrita no repositório; o temporário fica em `os.tmpdir()` e é apagado num `finally`).

## User Setup Required

Nenhum.

## Next Phase Readiness

- O 52-29 acrescenta ao mesmo bloco «Emendas do UAT da 52» os itens G-52-2, G-52-4 e G-52-4b.
- O 52-30 publica. Antes disso, deve levar ao operador o residual acima (sete itens, cada um com o pior caso medido).
- **STATE.md e ROADMAP.md não foram tocados por este executor:** o orquestrador escreve o tracking à mão depois da onda (convenção 1 do despacho). Este commit de SUMMARY contém só o SUMMARY.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-12*

## Self-Check: PASSED

- FOUND: scripts/p52_contraste.cjs
- FOUND: src/components/pages/__tests__/DashboardCandidatoPage.selos.test.tsx
- FOUND commits: 01436adf, 48a4ee40, 03f81a48, f5d85b2b, 0f5ac731, 5c412621, fec1bb34 (ancestrais de HEAD)
