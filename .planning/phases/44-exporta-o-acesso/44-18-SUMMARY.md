---
phase: 44-exporta-o-acesso
plan: 18
subsystem: privacidade (portões de teste LGPD + catálogo vivo)
tags: [lgpd, export, vitest, portao-de-classe, cr-01-bis, catalogo-vivo, fail-closed]
status: complete

requires:
  - phase: 44-exporta-o-acesso (44-17)
    provides: "VEREDITO_POR_TABELA, familiasGenericas, colunasDeVinculo, lacunasPorTabela (naoMedidas/semRazaoNoYaml declarados vazios) e o caso (cr5)"
provides:
  - "bloco `colunas_fora_do_escopo` no catálogo vivo: 43 tabelas excluídas, 534 colunas, medido só leitura em PROD (o gerador não o lê)"
  - "cobertura FAIL-CLOSED do portão de classe (`naoMedidas`) e razão por tabela no YAML (`semRazaoNoYaml`, parâmetro `yamlTexto`)"
  - "comentário de vocabulário de `configuracao_do_produto` honesto + razão de `entrevista_guias` citando BD-18 (só comentário)"
  - "caso (cr5b) com sete controles negativos permanentes"
affects: [44-19, 44-20, 44-21, 44-22]

actuals:
  tokens: 26569       # chars/4 sobre as linhas +/- do diff e42dbcd3..fde8b4eb (106276 chars; o bloco medido do catálogo domina)
  tasks: 2
  commits: 2          # git rev-list --count plan_head_before..HEAD, medido antes do commit de metadados
plan_head_before: e42dbcd396899b39cacf9e4908a66f5e29102684
plan_head_after: fde8b4eb7930b23cabb930069f7bc85ba180d050

tech-stack:
  added: []
  patterns:
    - "Cobertura fail-closed: a classe do portão é medida contra o banco vivo e versionada; tabela da classe sem coluna medida reprova pelo nome (ausência de coluna não é ausência de vínculo)"
    - "Razão por tabela conferida no COMENTÁRIO do YAML imediatamente acima da entrada (o artefato não muda, o gerador lê com safeLoad)"
    - "Controles de mordida com alvo escolhido pelos dados (primeira chave ordenada de VEREDITO_POR_TABELA), nunca por nome"

key-files:
  created:
    - .planning/phases/44-exporta-o-acesso/44-18-SUMMARY.md
  modified:
    - docs/compliance/catalogo-vivo-44.json
    - docs/compliance/export-scope-rules.yaml
    - src/features/privacidade/services/__tests__/exportacaoService.test.ts

key-decisions:
  - "naoMedidas cobre toda a classe genérica (famílias que dividem o marcador de configuracao_do_produto), não só as com vínculo: a cobertura é pré-condição do vínculo"
  - "Alvo dos controles 2, 3, 4, 6 e 7 do (cr5b) derivado de VEREDITO_POR_TABELA (hoje = entrevista_guias), não escrito — IN-01"
  - "citaDecisao casa o id como token (BD-18 não casa BD-181)"

patterns-established:
  - "Bloco medido acrescentado como ÚLTIMA chave de topo do catálogo, serializado em JSON.stringify(obj, null, 2) sem quebra final — as chaves anteriores não se movem"

requirements-completed: [EXPORT-02, EXPORT-06]

coverage:
  - id: D1
    description: "Toda tabela excluída da classe genérica tem colunas medidas (catálogo ∪ colunas_fora_do_escopo); tabela não medida reprova pelo nome"
    requirement: EXPORT-06
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr5) CR-01-bis · toda tabela retida com vínculo ao titular numa família da configuração do sistema tem veredito próprio na frase"
        status: pass
      - kind: other
        ref: "Task 1 verify 1 (vitest -t CR-01-bis + check:export-allowlist + git diff --quiet dedca1fb + YAML igual por js-yaml + catálogo = anterior + bloco)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A razão de cada veredito está no comentário do YAML acima da entrada (entrevista_guias cita BD-18); o artefato 1.4.0 e o espelho da EF não mudaram"
    requirement: EXPORT-02
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr5)"
        status: pass
      - kind: other
        ref: "npm run -s check:export-allowlist (OK, em sincronia com as três fontes)"
        status: pass
    human_judgment: false
  - id: D3
    description: "O portão de classe morde em sete direções, cada uma nomeando a tabela"
    requirement: EXPORT-02
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr5b) CR-01-bis · o portão de classe morde"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-10-07
---

# Phase 44 Plan 18: CR-01-bis · a classe inteira é vista — Summary

**As 43 tabelas excluídas do export foram medidas só leitura em PROD (534 colunas) e versionadas no catálogo. O (cr5) agora reprova, pelo nome, toda tabela genérica sem coluna medida. A razão de `entrevista_guias` (BD-18) mora no comentário do YAML e é conferida. O (cr5b) prova a mordida em sete direções. O artefato 1.4.0 não mudou um byte.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-10-07T12:17:03Z
- **Completed:** 2026-10-07T12:22Z
- **Tasks:** 2 (1 tracer + 1 auto)
- **Files modified:** 3

## Accomplishments

- Catálogo: bloco `colunas_fora_do_escopo` com `medido_em`, `projeto`, `fonte`, `query`, `finalidade`, `tabelas` e `colunas`, como última chave de topo. A forma canônica foi preservada e o gerador não o lê.
- `lacunasPorTabela(frase, artefato, catalogo, yamlTexto, vereditos?, mapa?)` passou a preencher dois campos:
  - `naoMedidas`: toda tabela de família genérica sem coluna em `colunas` ∪ bloco;
  - `semRazaoNoYaml`: comentário contíguo acima de `  <tabela>:` em `fora_do_escopo:` que não cita a `decisao`.
- O (cr5) ganhou essas duas asserções e a sanidade do bloco medido. Nenhuma asserção anterior foi afrouxada.
- YAML, só comentário:
  - a linha de vocabulário de `configuracao_do_produto` agora exige razão POR TABELA para tabela com vínculo;
  - `entrevista_guias` ganhou um bloco que cita BD-18 e BD-21.
- (cr5b): sete controles permanentes. Cada um parte de dado real e asserta «mudou algo» antes da mordida exata.

## Evidências

### Vermelho do (cr5) estendido, antes da medição (catálogo e YAML de HEAD)

```
AssertionError: tabela excluída numa família da configuração do sistema sem NENHUMA coluna medida …
+ [ "biblioteca_perguntas", "bigfive_itens", "classe_evento_notificacao", "cognitivo_itens",
+   "config_janela_exclusao", "config_purga", "config_retencao_etapa", "config_sla_dados",
+   "config_sla_etapa", "config_sla_revisao", "pergunta_opcao_metadata", "perguntas",
+   "perguntas_cultura", "perguntas_formulario", "perguntas_opcao_sjt", "perguntas_redacao",
+   "perguntas_vaga_origem", "questoes_bigfive", "questoes_disc", "questoes_raven" ]
AssertionError: veredito sem razão no YAML … expected [ 'entrevista_guias' ] to deeply equal []
AssertionError: `colunas_fora_do_escopo.tabelas` ausente ou vazio no catálogo … expected 0 to be greater than 0
```

O `naoMedidas` nomeou as 20 tabelas genéricas sem coluna no catálogo, que bate com a medição do planejador. O `semRazaoNoYaml` deu `[entrevista_guias]`.

### Medição (PROD, só leitura)

- Scratch fora do repositório: `…/scratchpad/medicao-44-18.sql`.
- Primeira linha: `SET TRANSACTION READ ONLY;`. A segunda é uma única consulta a `information_schema.columns ⨝ information_schema.tables` (`BASE TABLE`, `public`, `table_name IN (<43 chaves ordenadas de excluidas>)`).
- Executada com `node p46apply.cjs run`, em 2026-10-07T12:18:09Z.
- **Populações, lidas antes do booleano:**
  - 534 linhas;
  - 43 tabelas distintas, igual às 43 chaves de `excluidas`;
  - nenhuma tabela faltando, então o smoke de drift não foi necessário.
- **Tabelas com `candidatura_id`/`candidato_id`:**

  | Tabela | Família |
  |---|---|
  | `ai_call_logs` | telemetria_interna |
  | `entrevista_guias` | **configuracao_do_produto** |
  | `historico_acoes` | telemetria_interna |
  | `notificacoes_enviadas` | telemetria_interna |
  | `purga_execucao_itens` | telemetria_interna |

  Na classe genérica, **só `entrevista_guias`**. Não há categoria nova, então não houve checkpoint.
- Depois da medição, o (cr5) também ficou verde com o conjunto completo de colunas de vínculo derivado de `chave_titular`: `semVeredito` = `[]`.

### Vermelho invertido do (cr5b)

O controle 5 foi escrito primeiro com `naoMedidas` esperado `[]`:

```
AssertionError: expected [ 'sonda_sem_medida' ] to deeply equal []
+ [ "sonda_sem_medida" ]
 ❯ exportacaoService.test.ts:1290:84
```

Depois veio a expectativa certa, `['sonda_sem_medida']`, e os sete controles ficaram verdes.

## Task Commits

1. **Task 1 (TRACER): a classe inteira é vista.** Commit `09f9d60d` (`test(44-18)`), com exatamente os três arquivos do task. O tracer gate rodou em modo interativo `end-of-phase` com verify só automatizado; o verify foi re-executado, ficou verde, e a execução expandiu.
2. **Task 2: (cr5b), sete controles.** Commit `fde8b4eb` (`test(44-18)`).

**Plan metadata:** commit `docs(44-18)` (SUMMARY + STATE + ROADMAP).

## Files Created/Modified

- `docs/compliance/catalogo-vivo-44.json`: bloco `colunas_fora_do_escopo`. As chaves e bytes anteriores ficaram intactos (o verify confere `catálogo − bloco == dedca1fb`).
- `docs/compliance/export-scope-rules.yaml`: só comentário (`js-yaml` lê igual ao de `dedca1fb`).
- `src/features/privacidade/services/__tests__/exportacaoService.test.ts`:
  - funções novas `comentarioAcimaNoYaml` e `citaDecisao`;
  - `lacunasPorTabela` estendida;
  - (cr5) estendido;
  - caso (cr5b) novo.

## Decisions Made

- **`naoMedidas` cobre toda a classe genérica, não só a parte com vínculo.** A cobertura é pré-condição para afirmar vínculo ou ausência dele.
- **O alvo dos controles vem dos dados.** No (cr5b), o alvo é `Object.keys(VEREDITO_POR_TABELA).sort()[0]`, e o controle 2 espera a lista inteira de chaves. Hoje isso nomeia `entrevista_guias`, que é a expectativa do plano. Um veredito novo não quebra o controle por fotografia (IN-01).
- **A sanidade do bloco medido fica no FIM do (cr5).** Ela usa `expect` duro, mas fica depois dos `expect.soft`, para o vermelho mostrar antes as listas que nomeiam as tabelas.
- **BD-18 aparece duas vezes no comentário do YAML:** no cabeçalho e na linha «NOMEIA (BD-18: …)». Assim fica dentro das 4 linhas acima da entrada que o critério `grep -B4` exige.

## Deviations from Plan

**[Rule 1 - Bug] Data da decisão no comentário do YAML.** Encontrado no Task 1. O primeiro rascunho datava BD-18 de 2026-10-07. O 44-CONTEXT §BD-18 registra 2026-10-06, e o comentário foi corrigido antes do commit. Nenhum outro arquivo foi afetado.

Fora isso, o plano foi executado como escrito.

**Total deviations:** 1 auto-fixed (Rule 1). **Impact:** nenhum no escopo.

## Issues Encountered

Nenhum.

## Known Stubs

Nenhum.

## Invariantes da rodada (conferidos)

- `git diff --quiet dedca1fb -- docs/compliance/export-allowlist.json docs/compliance/pii-inventory.yaml docs/compliance/sql supabase` sai 0. `check:export-allowlist` deu OK.
- `tsc` deu `error TS = 89` depois de cada task (rc=2), igual ao baseline.
- `npx vitest run src/features/privacidade`: 11 arquivos, 164 testes verdes, com (cr1), (cr2), (cr3), (cr5) e (cr5b).
- Requisições a PROD: só a leitura descrita acima. Nenhuma escrita, nenhum redeploy, nenhum push.
- STATE.md e ROADMAP.md foram editados à mão, sem gsd-tools. Saídas dos portões de escrituração:
  - `REQUIREMENTS.md intocado`;
  - `ROADMAP: só caixas desta rodada`;
  - a conferência sobre a árvore não imprimiu nada;
  - o laço por commit imprimiu `STATE.md: corpo preservado`.
- **Exclusão no laço por commit:** `dee65a6c` (commit de início de fase do orquestrador, em que `state.begin-phase` reescreveu `Status:` e `Last activity:` do bloco da Phase 44) ficou fora do laço, por instrução do orquestrador. Todos os outros commits foram conferidos.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

O 44-19 pode começar: portões do smoke e do canal (WR-04, WR-05, WR-06, IN-02). A frase segue aguardando a aprovação do operador no checkpoint do 44-22.

---
*Phase: 44-exporta-o-acesso*
*Completed: 2026-10-07*

## Self-Check: PASSED

- FOUND: `docs/compliance/catalogo-vivo-44.json` (com `colunas_fora_do_escopo`), `docs/compliance/export-scope-rules.yaml` (BD-18 acima de `entrevista_guias`), o arquivo de teste com o (cr5b).
- FOUND: commits `09f9d60d` e `fde8b4eb` no log.
