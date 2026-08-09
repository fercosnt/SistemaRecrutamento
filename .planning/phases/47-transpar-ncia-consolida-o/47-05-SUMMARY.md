---
phase: 47-transpar-ncia-consolida-o
plan: 05
subsystem: testing
tags: [nyquist, validation, auditoria, m7, cobertura, ci, vitest, deno, smoke-sql]

requires:
  - phase: 36-41 (M7)
    provides: os artefatos auditados — PLANs, SUMMARYs, VERIFICATIONs, smokes SQL e testes versionados
  - phase: 45-motor-de-exclus-o-anonimiza-o
    provides: o molde canônico de VALIDATION.md com o comentário do ciclo de vida do status
provides:
  - Seis VALIDATION.md com veredito Nyquist real em .planning/milestones/v7.0-phases/
  - Índice de vereditos do M7 (6 parciais, 18 gaps nomeados) como insumo da auditoria de milestone v7.0
  - A constatação medida de que nenhum smoke SQL do repositório roda em portão algum
affects: [auditoria de milestone v7.0, planejamento de cobertura de banco em CI, gsd-validate-phase]

actuals:
  tokens: 33000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Veredito PARCIAL = status validated + nyquist_compliant false — vocabulário existente, campo novo nenhum"
    - "Divergência entre o registrado e o repositório vivo vira ACHADO no veredito, nunca correção silenciosa do documento"
    - "Gap acionável = comportamento + plano de origem + razão registrada + comando que o cobriria"

key-files:
  created:
    - .planning/milestones/v7.0-phases/37-camada-de-dados-de-notifica-o-notificacoes-enviadas-config-s/37-VALIDATION.md
    - .planning/milestones/v7.0-phases/40-timeline-de-prazo-no-painel-do-candidato/40-VALIDATION.md
  modified:
    - .planning/milestones/v7.0-phases/36-deliverability-sender-identity/36-VALIDATION.md
    - .planning/milestones/v7.0-phases/38-ef-notificar-candidato-comm/38-VALIDATION.md
    - .planning/milestones/v7.0-phases/39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03/39-VALIDATION.md
    - .planning/milestones/v7.0-phases/41-reconcilia-o-de-entrega-retry-testing/41-VALIDATION.md

key-decisions:
  - "As seis fases fecharam PARCIAIS. Zero verde forçado — nenhum requirement recebeu conformidade verdadeira sem comando automatizado citado por caminho rodando num portão."
  - "O texto original dos quatro rascunhos foi preservado verbatim; as divergências medidas (domínio de envio desatualizado na 36, vitest.config.ts inexistente na 41, comandos deno sem --config na 38 e na 41) viraram achados, não edições."
  - "O gap estrutural do M7 é um só, repetido em três fases: nenhum job de CI provisiona Postgres, então 1.765 linhas de smoke SQL versionado não rodam em portão nenhum."

patterns-established:
  - "Auditoria documental retroativa: auditar os artefatos que existem e emitir veredito citado, sem re-executar a fase"
  - "Proveniência do veredito é parte do veredito — cada arquivo registra data e método"

requirements-completed: [CONSOL-01]

coverage:
  - id: D1
    description: "Seis VALIDATION.md com veredito Nyquist real, no caminho .planning/milestones/v7.0-phases/, nenhum em rascunho"
    requirement: CONSOL-01
    verification:
      - kind: other
        ref: "guard node inline da Task 3 — 6/6 com veredito, 0 conformes, 6 parciais, zero diretório no caminho errado"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cada gap declarado é acionável — comportamento, plano de origem, razão registrada e comando que o cobriria"
    requirement: CONSOL-01
    verification: []
    human_judgment: true
    rationale: "Se um gap é acionável é juízo editorial sobre prosa; nenhum guard automatizado distingue 'cobertura parcial' (impressão) de um gap nomeado com comando (veredito). Só leitura humana confirma."
  - id: D3
    description: "Baselines preservadas — suíte 1781/1781 e tsc 97, este plano não tocou código"
    requirement: CONSOL-01
    verification:
      - kind: unit
        ref: "npm run test:run — 179 arquivos / 1781 testes"
        status: pass
      - kind: other
        ref: "npm run -s lint | grep -c 'error TS' — 97"
        status: pass
    human_judgment: false

duration: 38min
completed: 2026-08-09
status: complete
---

# Phase 47 Plan 05: Vereditos Nyquist do M7 Summary

**As seis fases do M7 que fecharam sem veredito passam a ter um — e os seis são PARCIAIS, com 18 gaps nomeados e nenhum verde forçado**

## Performance

- **Duration:** 38 min
- **Started:** 2026-08-09T19:12Z
- **Completed:** 2026-08-09T19:50Z
- **Tasks:** 3
- **Files modified:** 6 (2 criados, 4 editados)

## Índice de vereditos — o insumo da auditoria de milestone v7.0

| Fase | Requirements | Veredito | Gaps nomeados |
|------|--------------|----------|---------------|
| **36** deliverability & sender identity | DELIV-01/02/03 | `validated` + `nyquist_compliant: false` — **PARCIAL** | 3 (G-36-01/02/03) |
| **37** camada de dados de notificação | LEDGER-01/02/03, TIMELINE-01 | `validated` + `nyquist_compliant: false` — **PARCIAL** | 3 (G-37-01/02/03) |
| **38** EF notificar-candidato | COMM-01..06 | `validated` + `nyquist_compliant: false` — **PARCIAL** | 3 (G-38-01/02/03) |
| **39** rewire dos triggers | DISPATCH-01..04 | `validated` + `nyquist_compliant: false` — **PARCIAL** | 3 (G-39-01/02/03) |
| **40** timeline de prazo | TIMELINE-02 | `validated` + `nyquist_compliant: false` — **PARCIAL** | 3 (G-40-01/02/03) |
| **41** reconciliação de entrega | RECON-01/02/03 | `validated` + `nyquist_compliant: false` — **PARCIAL** | 3 (G-41-01/02/03) |

**6 de 6 parciais · 0 conformes · 18 gaps nomeados.**

O plano avisou que **seis verdes seriam sinal de alerta**. O desfecho foi o oposto e não precisa de
releitura defensiva por esse critério. Mas uma outra uniformidade merece a mesma desconfiança, e
por isso está escrita aqui: **exatamente 3 gaps por fase, nas seis.** Isso não foi cota. Reli os
dezoito antes de fechar e cada um é rastreável a um artefato ou plano distinto — a coincidência é
de contagem, não de conteúdo. Quem auditar o milestone deve ler os gaps, nunca a contagem.

## Accomplishments

- **Seis vereditos reais no caminho real.** Os arquivos vivem em
  `.planning/milestones/v7.0-phases/`; nenhum diretório de fase do M7 foi criado sob
  `.planning/phases/` — que era o modo de falha nº 1 deste plano e está guardado por asserção.
- **Nenhum dos seis ficou em rascunho.** Preencher seções sem mudar o status contaria como
  NÃO-VALIDADO na auditoria de milestone; os seis carregam `status: validated` com veredito de
  conformidade explícito.
- **Um gap estrutural do M7 ficou nomeado e é um só, repetido em três fases.** Nenhum job de
  `.github/workflows/ci.yml` lê `supabase/tests/`. São **1.765 linhas** de smoke SQL versionado —
  495 + 653 (P37), 358 (P39), 259 (P41) — de qualidade alta e execução manual. Um único job de CI
  com Postgres de serviço fecharia G-37-01, G-39-01 e G-41-02 de uma vez.
- **A cronologia da Phase 39 está registrada por escrito onde a auditoria vai procurar:** smoke
  escrito e PROD aplicado no mesmo dia (2026-07-26), verificação escrita dois dias depois, dois
  CRITICAL em produção no intervalo. A Phase 45 já reescreveu a regra citando esta fase.
- **A lição da Phase 38 saiu de anedota e virou veredito:** a suíte da fase deu verde sobre o
  defeito que mandou a cópia de rejeição a um candidato aprovado. A cobertura era de
  **renderização**, não de **ramificação**. O guard de regressão só nasceu depois do incidente.

## Task Commits

1. **Task 1: as duas fases sem arquivo (37 e 40)** — `5d58d1d` (docs)
2. **Task 2: as quatro fases com rascunho (36, 38, 39, 41)** — `563c0d9` (docs)
3. **Task 3: conferência dos seis + índice no SUMMARY** — este commit (docs). A Task 3 não produziu
   diff próprio nos seis arquivos: o guard passou de primeira, e seu entregável é o índice acima.

## Files Created/Modified

- `.../37-.../37-VALIDATION.md` — **novo.** PARCIAL: os 4 requirements têm prova comportamental real
  (impersonação de JWT de verdade, comparação catálogo-contra-catálogo) que **não roda em portão**
- `.../40-.../40-VALIDATION.md` — **novo.** PARCIAL: 7 testes Vitest verdes no CI cobrem serviço e
  componente; a montagem no dashboard, `rotuloDeEspera` e a degradação graciosa não têm cobertura
- `.../36-.../36-VALIDATION.md` — veredito acrescentado. PARCIAL: o guard de segredos roda em dois
  portões, mas nada prova que ele não é no-op
- `.../38-.../38-VALIDATION.md` — veredito acrescentado. PARCIAL: 6/6 requirements automatizados hoje,
  e o gap que importa é histórico e está nomeado
- `.../39-.../39-VALIDATION.md` — veredito acrescentado. **O mais duro dos seis.** 0 de 4 requirements
  com portão sobre o comportamento próprio da fase
- `.../41-.../41-VALIDATION.md` — veredito acrescentado. PARCIAL: mapa de verificação escrito
  retroativamente (a fase fechou com ele vazio); a varredura periódica é a peça mais autônoma e a
  menos observada

## Decisions Made

- **Conformidade verdadeira exigiu comando automatizado citado por caminho rodando num portão.**
  Nenhuma das seis passou nesse teste, e essa é a informação que o requirement existe para produzir.
- **Distinção preservada entre gap fechável e resíduo irredutível.** O DELIV-01 da Phase 36 (colocação
  em caixa de entrada) não é observável por API nenhuma — é da mesma família que a Phase 43 tratou
  como aceito-permanentemente. O G-36-01 (meta-teste do guard) fecha com um arquivo. Achatar os dois
  no mesmo "parcial" tornaria o veredito inútil.
- **Texto original preservado; divergência vira achado.** Quatro divergências medidas e registradas
  sem editar o documento original: domínio de envio desatualizado na 36 (`recruta.` no arquivo,
  `rh.` no código vivo), `vitest.config.ts` citado na 41 e inexistente, e os comandos `deno test` da
  38 e da 41 que falham hoje por faltar `--config`.

## Deviations from Plan

None — plano executado exatamente como escrito. Três tarefas, seis arquivos, nada mais tocado.

Nenhuma fase do M7 foi re-executada: zero migration, zero deploy, zero smoke contra banco, zero
envio de e-mail. Os testes executados (`npm run test:run`, corpus Deno, `npx vitest run src/features/timeline`)
são leitura de estado do repositório, não re-execução de fase.

## Issues Encountered

- **Os comandos registrados em dois dos rascunhos falham hoje.** Medido, não suposto: o
  `deno test supabase/functions/` sem `--config` aborta em `npm:svix@1.99.1`, dependência que a
  Phase 41 trouxe ao corpus depois de a Phase 38 escrever aquela linha. Resolvido como achado em
  ambos os arquivos, com o comando correto medido ao lado (34/34 verdes, 120 ms).
- **A Phase 39 tem `39-VERIFICATION.md`**, ao contrário do que o briefing desta execução supunha.
  Ele existe — foi escrito **retroativamente**, dois dias após o apply em PROD, e o próprio documento
  declara que os dois CRITICAL são consequência direta do portão pulado. O fato reforça o veredito
  em vez de amolecê-lo, e está citado no arquivo.

## User Setup Required

None — nenhuma configuração de serviço externo. Este plano escreveu apenas markdown.

## Next Phase Readiness

- **CONSOL-01 fechado.** O SC#4 do ROADMAP tem os seis arquivos com veredito real, no diretório real.
- **Para a auditoria de milestone v7.0:** o índice acima é o insumo. Seis parciais significam que o
  M7 fechou com cobertura declarada menor do que a suposta — que é exatamente o que o requirement
  existia para tornar visível.
- **Item de maior alavancagem que este plano deixa nomeado:** um job de CI com Postgres de serviço
  que rode `supabase/tests/*.sql`. Fecha três dos dezoito gaps de uma vez e converte 1.765 linhas de
  prova manual em portão. Não é escopo desta fase; é a recomendação que sai dela.
- **Baselines intactas:** suíte 1781/1781 (179 arquivos, 7,9 s) e `tsc` em 97. Zero `--no-verify`,
  zero dependência nova.

## Self-Check: PASSED

- 6/6 arquivos `VALIDATION.md` existem nos caminhos exatos sob `.planning/milestones/v7.0-phases/`
- 0 diretórios com prefixo de fase do M7 criados sob `.planning/phases/`
- 3/3 commits resolvem (`5d58d1d`, `563c0d9`, `81d7658`)
- Working tree limpa; nenhum arquivo gerado deixado sem rastreio

---
*Phase: 47-transpar-ncia-consolida-o · Plan 05*
*Completed: 2026-08-09*
