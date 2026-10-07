---
phase: 44-exporta-o-acesso
plan: 21
subsystem: revisão (adversarial, independente) da rodada CR-01-bis
tags: [lgpd, export, code-review, adversarial, sondas, mutation, fail-closed, cr-01-bis]
status: complete

requires:
  - phase: 44-exporta-o-acesso (44-17..44-20)
    provides: "o diff dedca1fb..09168e22 — frase BD-18/BD-19, fronteiraDaCopia (BD-22), portões (cr4) (cr5) (cr6) problemasDosValues BLOCO_GATE_CANONICO (cp3) (cp4)"
provides:
  - "44-REVIEW-pos-CR01bis.md: revisão nova (o 44-REVIEW.md canônico intocado), frontmatter que o 44-22 lê — critical 0, warning 6, info 4, diff_head 09168e228ac413087f185e93dcd0911a4a21cba0"
  - "quatro eixos com conclusão; sondas próprias contra os sete portões novos (todas morderam) + três extras que provam WR-03/04/05 por execução"
  - "classificação do item do 44-20 em deferred-items.md (rodapé «undefined»): WR-02"
affects: [44-22]

actuals:
  tokens: 9546        # chars/4 sobre o único arquivo de entrega (44-REVIEW-pos-CR01bis.md, 38182 octetos)
  tasks: 2
  commits: 2          # git rev-list --count plan_head_before..HEAD, medido antes do commit de metadados
plan_head_before: 09168e228ac413087f185e93dcd0911a4a21cba0
plan_head_after: 8501d8c3

tech-stack:
  added: []
  patterns:
    - "Revisão em arquivo NOVO a cada rodada; escopo = git diff derivado, igualdade de conjuntos no frontmatter"
    - "Sonda do revisor: mutação própria em arquivo real (nunca no teste), backup fora do repo, md5 antes/mutado/depois + cmp, filtro -t escapado com contagem de testes conferida"
    - "Narrativa dos autores lida só depois dos achados commitados; cada afirmação conferida no git, no artefato ou por execução"

key-files:
  created:
    - .planning/phases/44-exporta-o-acesso/44-REVIEW-pos-CR01bis.md
    - .planning/phases/44-exporta-o-acesso/44-21-SUMMARY.md
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "critical = 0: nenhuma afirmação da copy publicada é falsa sob o artefato 1.4.0, e nenhum portão que guarda a copy é incapaz de falhar (os sete morderam). A porta do 44-22 não está suspensa por esta revisão"
  - "WR-02 (rodapé «undefined»/«null» no ramo versão ausente/vazia) classificado warning, e não critical, com a dúvida escrita: o ramo é inalcançável com a EF de hoje (index.ts:342 sempre devolve versao_allowlist)"
  - "Nenhuma medição em PROD: nenhum achado dependia dela; a afirmação do 44-19 sobre templates_email fica registrada como não conferida"

patterns-established:
  - "Sonda extra que NÃO morde vira evidência por execução de um warning já escrito, não uma linha de 'falha' da sonda"

requirements-completed: [EXPORT-01, EXPORT-02, EXPORT-04]

coverage:
  - id: D1
    description: "Revisão adversarial independente do diff inteiro da rodada (7 arquivos), quatro eixos com conclusão, num arquivo novo com frontmatter que o 44-22 lê"
    requirement: EXPORT-02
    verification:
      - kind: other
        ref: "Task 1 verify (node): revisao: 7 arquivos, critical=0 warning=6 info=4, diff_head=09168e228ac413087f185e93dcd0911a4a21cba0"
        status: pass
    human_judgment: true
    rationale: "Os seis warnings pedem decisão do operador no checkpoint do 44-22 (consertar antes da porta, ou publicar e abrir rodada --gaps); a revisão não decide isso"
  - id: D2
    description: "Sondas do revisor contra os sete portões novos, todas restauradas byte a byte, sem resíduo"
    requirement: EXPORT-04
    verification:
      - kind: other
        ref: "Task 2 verify (node): sondas=10 fora=[] · contagem final {critical:0,warning:6,info:4} · nenhuma mutacao residual"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-10-07
---

# Phase 44 Plan 21: Revisão adversarial independente da rodada CR-01-bis Summary

**A rodada 44-17..44-20 foi revisada a partir da especificação e do artefato 1.4.0, sem ler as narrativas
dos autores antes dos achados. Resultado em `44-REVIEW-pos-CR01bis.md`: `critical: 0`, `warning: 6`,
`info: 4`. A copy publicada é verdadeira e é igual à UI-SPEC caractere a caractere. Os sete portões
novos morderam uma mutação própria do revisor. Seis fraquezas ficam para o operador decidir no
checkpoint do 44-22.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-10-07T12:43:13Z
- **Completed:** 2026-10-07T13:03:04Z
- **Tasks:** 2 (Task 1 tracer + Task 2 auto)
- **Files modified:** 1 entregável novo (`44-REVIEW-pos-CR01bis.md`) + este SUMMARY, STATE.md e ROADMAP.md

## Escopo derivado

- `RH = git rev-parse HEAD` no começo do Task 1: `09168e228ac413087f185e93dcd0911a4a21cba0`.
- `git diff --name-only dedca1fb "$RH" -- . ':(exclude).planning'` lista 7 arquivos, todos revisados.
  O verify confere a igualdade de conjuntos.
  - `docs/compliance/__tests__/exportAllowlist.test.ts`
  - `docs/compliance/catalogo-vivo-44.json`
  - `docs/compliance/export-scope-rules.yaml`
  - `src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts`
  - `src/features/privacidade/constants/canalPrivacidade.ts`
  - `src/features/privacidade/services/__tests__/exportacaoService.test.ts`
  - `src/features/privacidade/services/exportacaoService.ts`
- Nenhum arquivo além dos esperados pelo planejador. Nada sob `supabase/` nem `docs/compliance/sql/`.

## Contagens finais

| critical | warning | info | total | status |
|---|---|---|---|---|
| 0 | 6 | 4 | 10 | issues_found |

| Achado | Resumo |
|---|---|
| WR-01 | `fronteiraDaCopia` compara a STRING de versão. A versão não identifica o conteúdo: no histórico, a 1.1.0 teve 4 conteúdos e a 1.2.0 teve 2, e nenhum portão obriga a subir `meta.versao` |
| WR-02 | No ramo «ausente/vazia/null», o rodapé do `.html` imprime `undefined`/`null`/vazio cru (viola a E4 da UI-SPEC) e o `.json` perde a chave. Classifica o item do 44-20 em `deferred-items.md`. É inalcançável com a EF de hoje, e a dúvida entre warning e critical está escrita |
| WR-03 | O smoke se cala por um segundo `set_config('smoke44.r', …n_drift:0…)` antes do `DO $gate$`. `exportAllowlist.test.ts` fica 40/40 verde (provado) |
| WR-04 | O (cr4) prende «as datas» a um subconjunto escolhido à mão. Vetar `cancelado_em` deixa o (cr4) verde (provado). O docblock de `6b51335d` promete mais que isso |
| WR-05 | O (cr5) só reconhece vínculo por nome igual a um `chave_titular`. `agendamento_id` numa tabela genérica fica invisível (provado) |
| WR-06 | O 44-20-SUMMARY afirma «os arquivos deixam de carregar a fronteira de uma versão com o carimbo de outra» sem a ressalva do WR-01 |
| IN-01 | `vitest -t` que não casa nada sai 0 («N skipped»), e `-t "(cr4)"` é regex que casa «(cr4b)» |
| IN-02 | O (cp3) não lê `supabase/migrations/*.sql`, embora o docblock diga «arquivo nenhum de onde pode chegar ao titular» |
| IN-03 | O bloco `colunas_fora_do_escopo` mostra colunas de PROD que o `colunas` versionado não tem (`ai_call_logs.input_hash`, `vagas.secoes_extras`, `vagas.rubrica_ia`) |
| IN-04 | «o roteiro que a equipe monta» é uma aproximação (o roteiro é gerado pela EF a pedido do RH). Fica para o operador ver no checkpoint |

## Sondas do revisor (md5 e linha do filtro)

Método: backup em scratch fora do repositório, uma sonda por vez, e restauração do backup. Em todas,
`cmp` saiu sem diferença e `git status --porcelain -- src supabase docs/compliance index.html` ficou
vazio.

| Portão | Arquivo mutado | md5 antes / mutado / depois | Linha do filtro | Mordeu |
|---|---|---|---|---|
| (cr4) | `exportacaoService.ts` | `8f66ff75…` / `2793a6e0…` / `8f66ff75…` | `-t '\(cr4\) WR-02'`: `Tests 1 failed \| 57 skipped (58)`, `entradaOrfa = ['(o motivo e as datas entram)']` | sim |
| (cr5) | `_shared/exportAllowlist.ts` | `89d9f663…` / `48a11a80…` / `89d9f663…` | `-t '\(cr5\) CR-01-bis'`: `1 failed \| 57 skipped`, `semVeredito = ['historico_acoes']` | sim |
| (cr6) | `exportacaoService.ts` | `8f66ff75…` / `27bec362…` / `8f66ff75…` | `-t '\(cr6\) WR-03'`: `1 failed \| 57 skipped`, «versão ausente: o .json tem de carregar a frase neutra» | sim |
| problemasDosValues | `p44_export_drift_smoke.sql` | `53fbfd45…` / `f639ed95…` / `53fbfd45…` | `-t '\(k\) os três'`: `1 failed \| 39 skipped`, `excluidas: … diverge da saída do gerador (--sql-values-excluidas) a partir do caractere 8` | sim |
| BLOCO_GATE_CANONICO | `p44_export_drift_smoke.sql` | `53fbfd45…` / `0c969863…` / `53fbfd45…` | `-t '\(k3\) o smoke falha alto'`: `1 failed \| 39 skipped`, único problema `DO $gate$: o corpo do bloco difere do canônico (WR-05) — … caractere 449` | sim |
| (cp3) | `index.html` | `1b310556…` / `e7976ba0…` / `1b310556…` | `-t '\(cp3\)'`: `1 failed \| 4 skipped`, `['index.html']` | sim |
| (cp4) | `PedirCopiaBloco.tsx` | `bd65848e…` / `ba26e53d…` / `bd65848e…` | `-t '\(cp4\)'`: `1 failed \| 4 skipped`, lista com `PedirCopiaBloco.tsx` | sim |
| extra WR-04 | `_shared/exportAllowlist.ts` | `89d9f663…` / `29e5dab0…` / `89d9f663…` | `-t '\(cr4\) WR-02'`: `1 passed \| 57 skipped` | não (é o WR-04) |
| extra WR-05 | `catalogo-vivo-44.json` | `e1ca9b67…` / `271ede2d…` / `e1ca9b67…` | `-t '\(cr5\) CR-01-bis'`: `1 passed \| 57 skipped` | não (é o WR-05) |
| extra WR-03 | `p44_export_drift_smoke.sql` | `53fbfd45…` / `1cee7c73…` / `53fbfd45…` | arquivo inteiro: `40 passed (40)` | não (é o WR-03) |

Os md5 completos estão na seção «Sondas do revisor · md5» da revisão.

## Confronto com os SUMMARY dos autores

Lidos só depois do commit `eacf659e`. Detalhe linha a linha na seção «Confronto» da revisão.

- **Confirmadas** no git, no artefato ou por execução:
  - os md5 de mutação do 44-17 (`5290f90e…` = serviço em `6562031e`) e do 44-20 (`9b8b6af0…` = serviço em `183dc181`);
  - sete marcadores na frase; `comVinculo = {entrevista_guias}`;
  - 534 colunas / 43 tabelas; 20 genéricas sem coluna; a lista das 5 tabelas com vínculo;
  - catálogo antigo como prefixo byte a byte do novo;
  - `BLOCO_GATE_CANONICO` com 712 caracteres; 97/97 em `docs/compliance/__tests__`;
  - 265/265 em `src/features/privacidade` + `docs/compliance/__tests__`; `grep -c fronteiraDaCopia` = 7;
  - o (o) com `'1.1.0'`;
  - nas provas de mordida dos autores, toda saída citada traz `N failed` ≥ 1, então nenhuma foi falso verde por filtro vazio.
- **Contraditas:**
  - a manchete do 44-20 sobre a fronteira dos arquivos (WR-06, por causa do WR-01);
  - o alcance do docblock do (cr4) de `6b51335d` (WR-04).
- **Não conferida:** a medição de `templates_email` em PROD (44-19). O plano só permite PROD quando
  um achado depende da medição, e nenhum dependia desta.

## Task Commits

1. **Task 1 (TRACER): escopo derivado, quatro eixos, arquivo novo com frontmatter.** Commit `eacf659e`
   (`docs(44-21)`), só `44-REVIEW-pos-CR01bis.md`. Verify: `revisao: 7 arquivos, critical=0 warning=5 info=4, diff_head=09168e22…`.
   O tracer gate rodou em modo interativo `end-of-phase` com verify só `<automated>`. O verify foi
   reexecutado depois do Task 2, saiu verde (`warning=6`), e não houve checkpoint.
2. **Task 2: sondas do revisor e confronto.** Commit `8501d8c3` (`docs(44-21)`), só o arquivo da
   revisão. Verify: `sondas=10 fora=[]`, `contagem final: {"critical":0,"warning":6,"info":4}`,
   `sondas registradas; nenhuma mutacao residual`.

**Plan metadata:** commit `docs(44-21)` com este SUMMARY, STATE.md e ROADMAP.md.

## Files Created/Modified

- `.planning/phases/44-exporta-o-acesso/44-REVIEW-pos-CR01bis.md`: a revisão. Inexistente em
  `dedca1fb`. O `44-REVIEW.md` e o `44-REVIEW-DISPOSITION.md` estão byte a byte iguais aos de
  `dedca1fb`.
- `.planning/STATE.md`: posição, progresso 144/147, duas decisões e a sessão, editados à mão.
- `.planning/ROADMAP.md`: caixa do 44-21 e linha de progresso da Phase 44 (`21/22`), editadas à mão.

## Decisions Made

- **`critical: 0`.** Pelo critério do plano, `critical` exige uma copy publicada falsa ou um portão da
  copy incapaz de falhar. Nem um nem outro foi visto: o Eixo 1 conferiu cada afirmação contra a 1.4.0,
  e os três portões da copy morderam as sondas.
- **WR-02 ficou em warning, com a dúvida escrita.** O ramo não é alcançável pela EF de hoje. Se uma EF
  futura quebrar, uma EF nova é ela mesma uma atualização do sistema, e a frase neutra não afirma nada
  falso sobre o que ficou de fora.
- **WR-06 é um achado separado do WR-01.** O plano manda transformar em achado toda afirmação dos
  autores que a revisão contradiz. O 44-22 mostra essa afirmação ao operador, e a porta é de mão única.

## Deviations from Plan

**1. [Rule 3 - Blocking] Vitest em scratch fora do repositório para as conferências do Eixo 1**
- **Found during:** Task 1.
- **Issue:** para executar os geradores reais com versões `undefined`/`null`/`''`/espaços e comparar
  as células da UI-SPEC com as constantes, foi preciso importar o serviço. O `vitest` recusou um teste
  fora da raiz (`Cannot find module '/@fs/private/tmp/…'`, por causa do `server.fs`).
- **Fix:** um `vitest.scratch.config.ts` em scratch, que funde o `vite.config.ts` do repositório com
  `server.fs.allow: ['/']`, rodado por `--config … --dir <scratch>`. Nenhum arquivo do repositório foi
  criado.
- **Verification:** `git status --porcelain -- src supabase docs/compliance` ficou vazio em todo o plano.

**2. [Rule 1 - Bug] Primeira tentativa de vitest com `--root /`**
- **Found during:** Task 1.
- **Issue:** ela varreu o sistema de arquivos e estourou o timeout de 120 s.
- **Fix:** o processo foi morto e a configuração de scratch acima foi usada no lugar. Nenhum efeito no
  repositório.

**3. [Correção de forma no Task 2] Tabela de md5 fora da seção «Sondas do revisor»**
- **Issue:** a tabela de md5, dentro da seção parseada pelo verify, repetia os rótulos dos portões na
  primeira célula e daria `linhas=2`.
- **Fix:** ela foi movida para a seção própria «Sondas do revisor · md5» antes de rodar o verify. O
  verify passou na primeira execução.

**Total deviations:** 3, todas de ferramenta ou de forma. **Impact:** nenhuma no conteúdo da revisão
nem no repositório.

## Issues Encountered

- **Exclusão na conferência por commit do STATE.md:** `dee65a6c` ficou fora do laço `for B in …`, por
  instrução do orquestrador. É o commit de início de fase, em que o `state.begin-phase` do gsd-tools
  reescreveu `Status:` e `Last activity:` no bloco da Phase 44. Todos os outros commits foram
  conferidos. Antes do commit de metadados, foram conferidos `09168e22 514b35ce ca1fea47 e42dbcd3 3ed321b6`,
  com resultado `STATE.md: corpo preservado`. A conferência sobre a árvore não imprimiu nada.

## Verificação do plano

- `44-21 só escreveu em .planning/`.
- `REQUIREMENTS.md intocado` (diff contra `dedca1fb`).
- `ROADMAP: só caixas desta rodada` (contra o último commit que gravou o `44-22-PLAN.md`).
- `tsc`: 89 `error TS` (baseline). As três suítes do escopo: 103/103 na árvore revisada.
- Nada publicado, nenhuma escrita nem leitura em PROD. `origin/main..HEAD` segue crescendo até o 44-22.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**O 44-22 pode abrir a porta pelo critério do frontmatter:** `critical: 0` e
`diff_head = 09168e228ac413087f185e93dcd0911a4a21cba0`. A árvore de código de HEAD é igual à revisada,
porque este plano só escreveu em `.planning/`.

Recomendação ao checkpoint do operador:
- Mostrar o WR-06. A manchete do 44-20 superestima o fechamento do WR-03 antigo.
- Decidir sobre o WR-01 e o WR-03 antes ou depois da publicação. Nenhum torna a cópia de hoje falsa,
  mas o WR-01 reabre o defeito que a rodada diz fechar no primeiro veto regerado sem subir a versão.
- O conserto do WR-02 sugerido não pede copy nova (`invocarExportMeusDados` recusa resposta sem
  versão).
- Ver o IN-04 junto com a aprovação da frase.

---
*Phase: 44-exporta-o-acesso*
*Completed: 2026-10-07*

## Self-Check: PASSED

- FOUND: `.planning/phases/44-exporta-o-acesso/44-REVIEW-pos-CR01bis.md`
- FOUND: commits `eacf659e` e `8501d8c3` no log
- Verifies dos dois tasks reexecutados verdes sobre o arquivo final
