---
phase: 52-hub-do-rh-dados-e-contato
plan: 29
subsystem: ui
tags: [wcag, contraste, raven, painel-candidato, vitest, tailwind, gap-closure]

requires:
  - phase: 52-28
    provides: "scripts/p52_contraste.cjs (corDeClasse, contraste, cenários com âncoras, tipo informativo) e o bloco «Emendas do UAT da 52» da 52-UI-SPEC"
  - phase: 52-03
    provides: "Raven na shell da marca e o AvaliacaoRavenScreen.shell.test.tsx"
provides:
  - "painel do candidato: a linha de prazo some com todas as avaliações concluídas (G-52-4, «Esconder»); o «Próximo passo» sem ação em texto simples painel-proximo-passo-texto (G-52-4b)"
  - "Raven: alternativa marcada com borda navy entre dois brancos, anel branco, selo raven-alternativa-check e foco tracejado interno (G-52-2)"
  - "p52_contraste.cjs: cinco cenários INFORMATIVO para o texto do cartão do painel (o residual do 52-29), cada um ancorado no fonte"
  - "ContextoRejeicaoTriagemRevisao.test.tsx: caso do código de motivo desconhecido cru, com mordida provada (ressalva do teste 15)"
  - "emendas datadas na 52-UI-SPEC, 52-PATTERNS e 52-CONTEXT"
affects: [52-30]

actuals:
  tokens: 6897
  tasks: 4
  commits: 8
plan_head_before: 5d53b998498894e3946685026cf09526a7cff8e6
plan_head_after: 02924e2e91bdcfa0caa94c04b71e488d3b4d9e77

tech-stack:
  added: []
  patterns:
    - "Mock com o dado REAL da migration (lido num beforeAll, com guarda de população): o rótulo nulo do mock escondia o G-52-4"
    - "Indicador não-textual independente do fundo: borda escura ENTRE dois brancos (ladrilho e anel), medida contra as duas vizinhas"
    - "Foco distinto da seleção por mecanismo: borda sólida + anel × contorno tracejado interno"

key-files:
  created: []
  modified:
    - src/components/pages/DashboardCandidatoPage.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx
    - scripts/p52_contraste.cjs
    - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
    - src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx
    - src/features/revisao/components/__tests__/ContextoRejeicaoTriagemRevisao.test.tsx
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-PATTERNS.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-CONTEXT.md

key-decisions:
  - "O predicado do prazo é o `concluidas` que já existia (D-27); só o ramo sem reabertura muda; carregando/erro mantêm a linha (D-52-U16)"
  - "A raiz do repositório nos testes vem de process.cwd() (o fileURLToPath de import.meta.url falha sob o URL do jsdom)"
  - "Contagem das linhas E da 52-UI-SPEC atualizada por emenda (54 → 55), em vez de deixar o número envelhecido"

patterns-established:
  - "Cenário informativo novo do medidor só entra com âncora provada por mutação (CENARIO DESCOLADO DO FONTE)"

requirements-completed: [JORN-59, JORN-60, JORN-62]

coverage:
  - id: D1
    description: "Painel: com todas as avaliações concluídas a linha de prazo (texto real do config_sla_etapa) não aparece; com uma pendente, carregando ou erro, aparece"
    requirement: JORN-59
    verification:
      - kind: unit
        ref: "src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx (4 casos)"
        status: pass
    human_judgment: false
  - id: D2
    description: "«Próximo passo» sem ação como texto simples painel-proximo-passo-texto (text-base text-white/90, sem moldura, sem truncar)"
    requirement: JORN-59
    verification:
      - kind: unit
        ref: "src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx#todas concluídas → a frase no «Próximo passo», nenhum botão, selo «Aguardando a equipe»; nada escrito"
        status: pass
    human_judgment: false
  - id: D3
    description: "Raven: alternativa marcada com borda navy + anel branco + check aria-hidden; foco tracejado interno; contraste ≥ 3:1 pela função do medidor; classes por extenso"
    requirement: JORN-60
    verification:
      - kind: unit
        ref: "src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx#alternativa marcada visível no gradiente (52-29 / G-52-2) (6 casos)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Legibilidade percebida da seleção do Raven e do painel concluído no aparelho real (desktop e 360px, 6 e 8 alternativas)"
    verification: []
    human_judgment: true
    rationale: "Os testes provam classes, DOM e contraste numérico; a leitura no celular sobre o gradiente é do operador, na conferência visual do 52-30 (T-52-97)"
  - id: D5
    description: "Residual medido: cinco linhas INFORMATIVO do texto do cartão do painel"
    requirement: JORN-62
    verification:
      - kind: other
        ref: "node scripts/p52_contraste.cjs (CONTRASTE OK; 5 linhas INFORMATIVO painel-…)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Código de motivo desconhecido aparece cru no contexto da revisão (ressalva do teste 15), com mordida provada"
    requirement: JORN-62
    verification:
      - kind: unit
        ref: "src/features/revisao/components/__tests__/ContextoRejeicaoTriagemRevisao.test.tsx#código de motivo fora do MOTIVO_OPTIONS aparece cru, sem reformatação (ressalva do teste 15 do UAT da 52)"
        status: pass
    human_judgment: false
  - id: D7
    description: "52-UI-SPEC, 52-PATTERNS e 52-CONTEXT emendados (dez emendas datadas)"
    verification:
      - kind: other
        ref: "node -e (verify do Task 3: emendas G-52-2/4/4b: UI-SPEC, PATTERNS e CONTEXT ok)"
        status: pass
    human_judgment: false

duration: 11min
completed: 2026-10-12
status: complete
---

# Phase 52 Plan 29: Painel concluído sem prazo contraditório, «Próximo passo» em texto e seleção do Raven inequívoca — Summary

**Com todas as avaliações concluídas, o painel não mostra mais «conclua em até 7 dias» ao lado de «aguardando a equipe» (`|| concluidas` só no ramo sem reabertura). A frase do «Próximo passo» virou texto simples `text-base text-white/90`. No Raven, a alternativa marcada tem borda navy `#00109E` entre o ladrilho branco e um anel branco (13,39:1 contra as duas vizinhas), selo de check e foco tracejado interno. O medidor ganhou cinco linhas INFORMATIVO para o texto do cartão (pior caso de 1,39 a 1,78). Um teste novo prova, com mordida, que um código de motivo desconhecido aparece cru.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-10-12T06:39:45Z
- **Completed:** 2026-10-12T06:50:20Z (antes deste SUMMARY)
- **Tasks:** 4 (tracer + 3)
- **Files modified:** 9 (nenhum criado)

## Accomplishments

- **G-52-4** (decisão do operador «Esconder»): no `.map` do painel, o `rotulo` da `PrazoEstimadoLinha` passa a nulo também com `concluidas`. A condição é `candidaturaEncerrada(…) || concluidas ? null : rotuloDeEspera(…)`. O ramo da reabertura, o eyebrow e o botão turquesa não mudaram, como mostra o diff abaixo.
- **G-52-4b:** o `span` sem destino agora é `<span data-testid="painel-proximo-passo-texto" className="text-base text-white/90">`, sem borda, fundo, padding, arredondamento ou `inline-flex`. O peso herdado saiu junto.
- **Teste com o prazo REAL:** o `concluidas.test` lê `'Avaliação liberada — conclua em até 7 dias corridos.'` da migration `20260721000002_config_sla_etapa.sql` num `beforeAll`. A extração tolera os espaços de alinhamento e tem guarda de população (não vazia, contém «conclua em até»). Com tudo concluído, a linha e o «Estimativa» estão ausentes. Com uma pendente, carregando ou erro, a linha aparece, e é isso que prova que a ausência no primeiro caso não é vácua.
- **G-52-2 (Raven):** o ladrilho é `relative rounded-lg border-4 bg-white p-2` com o foco `focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-offset-[-10px] focus-visible:outline-[#00109E]`. A marcada leva `border-[#00109E] ring-4 ring-white` e a livre `border-white hover:border-slate-300`. O selo `raven-alternativa-check` (`aria-hidden`, `Check` com traço 3) aparece só na marcada. Todas as classes estão por extenso no fonte. `type`, `aria-pressed` e `aria-label` estão intocados.
- **Medidor:** cinco cenários `informativo` com a pilha do cartão do 52-28, sem superfície local, ancorados na pilha e na classe de cor do fonte. O do título também verifica que o `h3` não tem cor própria. Cada âncora foi provada por mutação.
- **Ressalva do teste 15:** caso «código de motivo fora do MOTIVO_OPTIONS aparece cru, sem reformatação (ressalva do teste 15 do UAT da 52)». O teste afirma antes que o código está fora do mapa, e a saída da mordida foi `MORDE`. O componente ficou igual ao pin `refs/gsd/52-26/sha`.
- **Contrato:** as dez emendas datadas estão na 52-UI-SPEC, 52-PATTERNS e 52-CONTEXT.

## Task Commits

1. **Task 1 (tracer): painel concluído sem prazo e «Próximo passo» em texto**
   - `3810ae7e` test(52-29): RED, estado concluído com o prazo real no mock e o «Próximo passo» em texto simples
   - `c45e9136` fix(52-29): o prazo some com todas as avaliações concluídas e o «Próximo passo» vira texto simples (G-52-4, G-52-4b)
   - `7669a3b2` chore(52-29): o `p52_contraste` mede como informativo cada estilo de texto do cartão do painel
2. **Task 2: seleção do Raven**
   - `a2af65ca` test(52-29): RED, seleção do Raven visível (check só no marcado, foco distinto, classes por extenso)
   - `c3517ee6` fix(52-29): alternativa marcada com borda navy, anel branco e check; foco tracejado (G-52-2)
3. **Task 3: contrato emendado; delta, lint, tipografia, contraste, build**
   - `4bb2b66b` docs(52-29): UI-SPEC, PATTERNS e CONTEXT
4. **Task 4: código desconhecido cru**
   - `5dc5dcf9` test(52-29): o motivo de rejeição com código desconhecido aparece cru no contexto da revisão (ressalva do teste 15)
   - `02924e2e` test(52-29): o código desconhecido tipado como `string` no mesmo caso (o tsc volta a 89)

**Plan metadata:** o commit deste SUMMARY (`docs(52-29): …`).

## Saída do medidor (verbatim, HEAD `02924e2e`, mesma saída desde `7669a3b2`)

```
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
INFORMATIVO painel-cartao-titulo: min=1.78 mediana=3.25 max=7.03
INFORMATIVO painel-cartao-departamento-data: min=1.57 mediana=2.66 max=5.18
INFORMATIVO painel-cartao-etapa: min=1.48 mediana=2.39 max=4.38
INFORMATIVO painel-proximo-passo-eyebrow: min=1.39 mediana=2.14 max=3.67
INFORMATIVO painel-proximo-passo-texto: min=1.67 mediana=2.95 max=6.06
CONTRASTE OK: 1 cenario(s) no alvo; 1 controle(s) mordem; amostras=480x286

$ node scripts/p52_contraste.cjs --auto-teste | tail -1
P52-CONTRASTE AUTO-TESTE OK: 24/24
```

**Contra a referência da checagem do plano** (título 1,78 · departamento/data 1,57 · etapa 1,48 · eyebrow 1,39 · frase 1,67): a divergência é **0,00** nos cinco, e o medidor não foi ajustado para bater.

**Âncoras novas mordem.** Cada mutação foi feita no fonte com `trap` e restaurada; depois, `git diff --quiet HEAD` saiu vazio. Sem mutação, `rc=0`. Com cada mutação, `rc=1`, com `CENARIO DESCOLADO DO FONTE: <id>` para:

| Cenário | Mutação |
|---|---|
| `painel-proximo-passo-texto` | `/90` → `/80` |
| `painel-cartao-titulo` | `h3` ganha `text-white/90` |
| `painel-cartao-etapa` | `/70` → `/60` |
| `painel-proximo-passo-eyebrow` | `/60` → `/50` |
| `painel-cartao-departamento-data` | `/80` → `/70` |

## Residuais para o 52-30 levar ao operador

**(a) Do 52-28, inalterado:** cinco chips do `STATUS_CONFIG` e duas notas coloridas do `AgendamentoCandidatoCard`, sobre a mesma pilha. O limiar seria 4,5:1.

| Item | Pior caso |
|---|---|
| chip `agendada` | **1,33** |
| chip `em_andamento` | **1,14** |
| chip `concluida` | **1,46** |
| chip `reagendada` | **1,44** |
| chip `nao_compareceu` | **1,46** |
| nota reagendada | **1,45** |
| nota cancelada | **1,18** |

**(b) Texto do cartão de vidro branco do painel, sem superfície local** (este plano). É uma **amostra**: a linha de prazo da `PrazoEstimadoLinha`, o rótulo do «Retirar minha candidatura» e o eyebrow «Sua entrevista» usam a mesma pilha e não foram medidos.

| Estilo | Classe de cor | Pior caso | Mediana | Limiar que valeria |
|---|---|---|---|---|
| Título (24 px, peso 600) | `text-white` (herdada do `GlassCard`) | **1,78** | 3,25 | 3:1 (texto grande) |
| Departamento / data | `text-white/80` | **1,57** | 2,66 | 4,5:1 |
| Etapa atual | `text-white/70` | **1,48** | 2,39 | 4,5:1 |
| Eyebrow «Próximo passo» | `text-white/60` | **1,39** | 2,14 | 4,5:1 |
| Frase do «Próximo passo» | `text-white/90` | **1,67** | 2,95 | 4,5:1 |

O medidor não modela a sombra projetada do título (`drop-shadow-md`), então o número do título é conservador. Os cinco ficam abaixo do limiar no pior caso, e todos menos o título também na mediana. A receita, se o operador decidir estender, é a do 52-28: superfície local escura.

## Provas de que morde

**RED do Task 1:** `RED_EVIDENCE_OK (target_test_failed)`, TAP com 4 testes, 3 ok e 1 not ok. O alvo, «todas concluídas → …», falhou na primeira asserção planejada: `a linha de prazo nao pode aparecer com todas as avaliacoes concluidas: expected false to be true`. Avaliação semântica: o alvo executou e falhou pelo comportamento (prazo presente com tudo concluído). Os três casos verdes provam que o mock produz a linha. Não houve falha de import ou de ambiente.

**RED do Task 2:** `RED_EVIDENCE_OK (target_test_failed)`, 18 testes, 12 ok e 6 not ok. O alvo, «clique na «Alternativa 3»: …», falhou com `exatamente um check: expected +0 to be 1`. Os outros cinco casos novos falharam pelas suas asserções de DOM e de fonte (por exemplo `marcada por extenso: expected false to be true`). Os 12 antigos ficaram verdes.

**Mordida do Task 4** (comando do plano, com o mesmo filtro `-t "aparece cru"`, `trap` e restauração):
```
=== SEM mutacao:
      Tests  1 passed | 9 skipped (10)
59:  return MOTIVO_OPTIONS.find((o) => o.value === motivo)?.label ?? motivo.replace(/_/g, " ")
=== COM mutacao:
AssertionError: o par «Motivo da rejeição» mostra o codigo exato: expected 'motivo fora do mapa X9' to be 'motivo_fora_do_mapa_X9' // Object.is equality
      Tests  1 failed | 9 skipped (10)
MORDE: com o fallback reformatando, exatamente o caso novo falha (e passava sem a mutacao)
```
Depois da mordida, `git diff --quiet HEAD -- src/features/revisao/components/ContextoRejeicaoTriagemRevisao.tsx` saiu vazio. O verify 1 do Task 4 imprimiu `componente igual ao pin 52-26 (commitado e arvore); teste commitado`. Nenhum commit deste plano toca o componente (`git diff --quiet 5d53b998..HEAD` vazio).

## Diff do plano no `DashboardCandidatoPage.tsx`

Saída de `git log -p --grep='(52-29)' -- src/components/pages/DashboardCandidatoPage.tsx`. Um único commit, `c45e9136`. O ramo da reabertura, o eyebrow e o botão turquesa não aparecem no diff.

```
-                              substitui (rotuloReabertura). */}
+                              substitui (rotuloReabertura).
+                              2026-10-12 (UAT da 52, G-52-4): … Nenhum prazo novo é inventado. */}
-                                candidaturaEncerrada(candidatura.etapa_atual, candidatura.status)
+                                candidaturaEncerrada(candidatura.etapa_atual, candidatura.status) || concluidas
-                              morto. */}
+                              morto.
+                              Em 2026-08-26 o botão morto virou `span`, … Desde
+                              2026-10-12 é texto simples, sem moldura. */}
-                            <span className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
-                              {stepCTA.label}
-                            </span>
+                            <span data-testid="painel-proximo-passo-texto" className="text-base text-white/90">{stepCTA.label}</span>
```

## Verificação (comandos do plano, no HEAD commitado)

- **Task 1:** painel com 6 arquivos e 40/40 testes. `TIPOGRAFIA OK (69 linhas acrescentadas varridas)`. As cinco linhas `INFORMATIVO painel-…`, `ALVO painel-rejeicao … OK` e `CONTRASTE OK` saíram com `VERIFY1=0`. Tracer: modo interativo, `end-of-phase`, verify só automatizado. Reexecutado verde → `⚡ Tracer verified end-to-end — expanding`.
- **Task 2:** `src/features/avaliacao-cognitiva` com 10 arquivos e 71/71 testes. `TIPOGRAFIA OK (144 linhas acrescentadas varridas)`.
- **Task 3:**
  - Emendas: `emendas G-52-2/4/4b: UI-SPEC, PATTERNS e CONTEXT ok`.
  - Delta: `vitest delta: base=0d70ac7 2725/2 · head=4bb2b66 3118/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok`.
  - `lint exit=2 tsc errors=89`, nenhum erro nos arquivos deste plano.
  - `TIPOGRAFIA OK (237 linhas acrescentadas varridas)` nos três arquivos de tela, e `lint, tipografia, contraste e build verdes`.
- **Task 4:** verify 1 e mordida como acima. HEAD final:
  - `vitest delta: base=0d70ac7 2725/2 · head=02924e2 3119/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok`
  - `lint exit=2 tsc errors=89`
  - `HEAD final (com a Task 4) medido: delta e lint`

  As duas pré-existentes são do `promessasComExecutor.test.ts` e falham também na base (convenção 4).
- **Marcadores no build:** `painel-proximo-passo-texto` e `raven-alternativa-check` estão em `build/assets/index-CfRY-hJs.js` (chunk eager), para o enumerador do 52-30.
- **Forma do push do 52-30:** os seis caminhos de `src/` e `scripts/` tocados estão todos na forma da nota 8: `DashboardCandidatoPage.tsx` e o `.concluidas.test.tsx`, `AvaliacaoRavenScreen.tsx` e o `.shell.test.tsx`, `ContextoRejeicaoTriagemRevisao.test.tsx` (literal) e `scripts/p52_contraste.cjs`. Os outros três são `.planning/**`.

## Files Created/Modified

- `src/components/pages/DashboardCandidatoPage.tsx`: condição do prazo com `concluidas`, `painel-proximo-passo-texto` e comentários datados.
- `src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx`: prazo real da migration no mock, ausência com tudo concluído, presença nos outros três casos, texto sem moldura.
- `scripts/p52_contraste.cjs`: `TEXTOS_DO_CARTAO`, os cinco cenários informativos com âncoras.
- `src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx`: ladrilho, seleção, check e foco.
- `src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx`: `describe` novo com 6 casos e contraste pela função do medidor.
- `src/features/revisao/components/__tests__/ContextoRejeicaoTriagemRevisao.test.tsx`: caso do código cru.
- `52-UI-SPEC.md`, `52-PATTERNS.md`, `52-CONTEXT.md`: as dez emendas datadas.

## Decisions Made

- O `concluidas` decide a linha de prazo (é a mesma variável do selo e do «Próximo passo»). Nenhum prazo novo foi criado, e a reabertura ficou intacta.
- A 52-UI-SPEC ganhou, por emenda, a contagem das linhas E (54 → 55). A linha E10 «concluído × prazo» é autorada fora das categorias do motor, e deixar o 54 seria uma fotografia envelhecida.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Raiz do repositório nos testes por `process.cwd()`**
- **Found during:** Task 1 (RED)
- **Issue:** `fileURLToPath(new URL('.', import.meta.url))` lança `The URL must be of scheme file` sob o ambiente jsdom do Vitest. A suíte não carregava.
- **Fix:** `const RAIZ = process.cwd()` (a raiz do Vitest, como o plano pede: «caminho a partir da raiz do repositório»). No Raven, `resolve(__dirname, '../../../../..')`, como o arquivo já fazia com `__dirname`.
- **Verification:** RED válido logo em seguida e GREEN 40/40.
- **Committed in:** `3810ae7e`

**2. [Rule 3 - Blocking] Asserções em uma linha para o relatório TAP do classificador de RED**
- **Found during:** Task 1 e Task 2 (RED)
- **Issue:** o `tap-flat` não escapa mensagens de várias linhas (dumps de DOM do `getBy*` e do jest-dom). É o mesmo problema que o 52-28 registrou.
- **Fix:** asserções novas como booleano ou lista unida com mensagem, e `queryByTestId` com asserção de existência no caso de contraste. O comportamento testado é o mesmo.
- **Verification:** `RED_EVIDENCE_OK (target_test_failed)` nas duas, `report_errors: []`.
- **Committed in:** `3810ae7e`, `a2af65ca`

**3. [Rule 1 - Bug] TS2367 introduzido pelo caso do Task 4**
- **Found during:** Task 4 (o pre-commit acusou `tsc errors: 90`)
- **Issue:** o literal `'motivo_fora_do_mapa_X9'` comparado com `o.value: MotivoRejeicaoRh` não tem sobreposição de tipos.
- **Fix:** `const CODIGO: string = …`, com um comentário explicando o porquê.
- **Verification:** `tsc errors: 89`, suíte 10/10 e mordida válida no HEAD corrigido.
- **Committed in:** `02924e2e` (commit à parte, sem amend)

**4. [Aditivo] Âncoras novas do medidor provadas por mutação**
- Não era pedido pelo plano, mas segue a regra do CLAUDE.md («prove por execução que o portão ainda MORDE»). Está na tabela das mutações acima.

**5. [Execução] Comandos de verificação em `bash -c`, com `TMPDIR` no scratchpad**
- O `zsh` não separa `$CMD` em palavras, como o 52-28 já tinha registrado. A partir do Task 2, `TMPDIR` aponta para o scratchpad (convenção 6). O primeiro verify do Task 1 escreveu o log no `TMPDIR` do sistema (`/var/folders/…`), que foi apagado em seguida.
- O verify da mordida do Task 4 rodou verbatim, com duas linhas `echo`/`grep` a mais só para imprimir as linhas `Tests` acima. A lógica não mudou.

---

**Total deviations:** 5 (2 bloqueios de ferramenta e ambiente, 1 bug de tipo corrigido, 1 aditivo, 1 de execução). **Impact:** nenhuma mudança de escopo. Nenhuma cópia de produto mudou além do que o plano especifica. Nenhum primitivo compartilhado, banco, Edge Function, migration ou publicação foi tocado.

## TDD Gate Compliance

- **Task 1:** RED `3810ae7e` (test), GREEN `c45e9136` (fix). O plano prescreve `fix(52-29)` como commit verde, não `feat`. O `chore` `7669a3b2` é o medidor.
- **Task 2:** RED `a2af65ca` (test), GREEN `c3517ee6` (fix, como prescrito).
- **Task 4:** `tdd="false"`. É caracterização, e a mordida substitui o RED.
- Não houve REFACTOR.

## Issues Encountered

Nenhum além dos desvios acima.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Só apresentação, testes e um cenário a mais num script de leitura local. T-52-97 foi mitigado como o plano prevê; a conferência visual humana fica no 52-30.

## User Setup Required

Nenhum.

## Next Phase Readiness

- O 52-30 publica (push por sha) e leva ao operador os residuais (a) e (b) acima, cada um com o pior caso medido. Também faz a conferência visual do Raven (desktop e 360px, 6 e 8 alternativas) e do painel concluído.
- **STATE.md, ROADMAP.md e REQUIREMENTS.md não foram tocados por este executor.** O orquestrador escreve o tracking à mão depois da onda (convenção 1 do despacho). Os passos «update STATE/ROADMAP» do execute-plan ficam satisfeitos por essa delegação. Este commit de SUMMARY contém só o SUMMARY.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-12*
