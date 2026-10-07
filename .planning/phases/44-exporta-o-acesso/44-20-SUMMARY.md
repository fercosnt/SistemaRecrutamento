---
phase: 44-exporta-o-acesso
plan: 20
subsystem: privacidade (copy dos arquivos entregues + portões de teste LGPD)
tags: [lgpd, export, copy, vitest, fail-closed, wr-02, wr-03, cr-01-bis]
status: complete

requires:
  - phase: 44-exporta-o-acesso (44-17, 44-18, 44-19)
    provides: "frase oQueNaoEsta do BD-18/BD-19; describe CR-01 com (cr1)..(cr3), (cr5), (cr5b); docs/compliance já com o trabalho legítimo do 44-18/44-19 em HEAD"
provides:
  - "COPY_ARQUIVO.naoEstaVersaoDivergente: frase neutra que manda ao canal, sem nomear categoria"
  - "fronteiraDaCopia(versao), exportada e no namespace: oQueNaoEsta só quando a versão da resposta = EXPORT_ALLOWLIST.meta.versao; qualquer outro valor => neutra; usada em gerarHtmlExport e gerarJsonExport"
  - "caso (cr6): a fronteira neutra nos dois arquivos em versão diferente, vazia ou ausente"
  - "PARENTESES_QUE_ENTRAM + parentesesDaFrase + lacunasDosParenteses; casos (cr4) e (cr4b)"
  - "linha «Fronteira quando a versão diverge» na 44-UI-SPEC (= código); BD-22 no 44-CONTEXT"
affects: [44-21, 44-22]

actuals:
  tokens: 5113        # chars/4 sobre as linhas +/- do diff 514b35ce..6b51335d (20453 chars)
  tasks: 2
  commits: 2          # git rev-list --count plan_head_before..HEAD, medido antes do commit de metadados
plan_head_before: 514b35ceefbed7fa61a81e33f2d4de51b8d3382b
plan_head_after: 6b51335d702011ee33fc46b432a7365c8e69b059

tech-stack:
  added: []
  patterns:
    - "Fronteira dos arquivos com falha FECHADA: a frase específica só sai quando a versão da EF é igual à do bundle; qualquer outro valor cai na neutra"
    - "Afirmações positivas da copy derivadas do próprio texto por regex e presas ao artefato por igualdade de conjuntos com um mapa de escopo deliberado"

key-files:
  created:
    - .planning/phases/44-exporta-o-acesso/44-20-SUMMARY.md
  modified:
    - src/features/privacidade/services/exportacaoService.ts
    - src/features/privacidade/services/__tests__/exportacaoService.test.ts
    - .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md
    - .planning/phases/44-exporta-o-acesso/44-CONTEXT.md
    - .planning/phases/44-exporta-o-acesso/deferred-items.md

key-decisions:
  - "BD-22 (planejador): a fronteira dos ARQUIVOS falha fechada para a frase neutra quando a versão da lista da resposta difere da do bundle; a TELA segue com oQueNaoEsta (residual T-44-109)"
  - "Alvos do (cr4b) escolhidos pela ordem do mapa (primeira e última entrada, na ordem da frase), não por nome; hoje nomeiam retencao_hold.motivo, (a decisão em si entra) e decisao_final, como o plano espera"
  - "Entrada cuja tabela saiu do artefato é nomeada só em tabelaAusente; as colunas dela não aparecem de novo em colunaNaoEntregue"

patterns-established:
  - "Nenhum pulo silencioso quando um trecho some da frase: o mapa e os trechos derivados são comparados nos dois sentidos (semEntrada / entradaOrfa)"

requirements-completed: [EXPORT-01, EXPORT-02]

coverage:
  - id: D1
    description: "O .html e o .json carregam a frase da tela só quando a versão da lista da EF é igual à do bundle; diferente, vazia ou ausente => frase neutra que manda ao canal; o carimbo continua com a versão recebida"
    requirement: EXPORT-02
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr6) WR-03 · versão da lista da resposta diferente da do site ⇒ fronteira neutra nos dois arquivos"
        status: pass
      - kind: other
        ref: "Task 1 verify 2 (mutação real da chave do .json; md5 + cmp contra o backup)"
        status: pass
    human_judgment: true
    rationale: "A redação da frase neutra é aprovada pelo operador no checkpoint do 44-22 (BD-22); o comportamento está provado por teste"
  - id: D2
    description: "Todo parêntese «(… entra)»/«(… entram)» da frase é derivado e preso a colunas exportadas e não vetadas do artefato 1.4.0"
    requirement: EXPORT-02
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr4) WR-02 · todo parêntese «… entra(m)» da frase está preso a colunas que o artefato exporta"
        status: pass
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr4b) WR-02 · o portão dos parênteses morde"
        status: pass
    human_judgment: false
  - id: D3
    description: "44-UI-SPEC = código (frase neutra) e linha «Seção de fronteira» diz quando a neutra vale; BD-22 no CONTEXT"
    requirement: EXPORT-01
    verification:
      - kind: other
        ref: "Task 1 verify 1 (node: ui-spec = codigo (frase neutra); html e json passam por fronteiraDaCopia)"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-10-07
---

# Phase 44 Plan 20: os arquivos não prometem o que não carregam (WR-03, WR-02) Summary

**O `.html` e o `.json` deixam de carregar a fronteira de uma versão com o carimbo de outra. `fronteiraDaCopia(resposta.versao_allowlist)` só devolve a frase da tela quando a versão da lista da EF é igual à do bundle. Em qualquer outro caso (versão diferente, vazia ou ausente), devolve uma frase neutra que diz que a cópia não consegue descrever o que ficou de fora e manda ao canal. Os três parênteses «… entra(m)» da frase são derivados dela e presos às colunas exportadas pelo (cr4). Os dois portões foram vistos vermelhos antes e mordendo depois.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-10-07T12:34:56Z
- **Completed:** 2026-10-07T12:41Z
- **Tasks:** 2 (1 tracer + 1 auto, ambos tdd)
- **Files modified:** 5 (4 do plano + `deferred-items.md`), mais este SUMMARY, STATE.md e ROADMAP.md

## Accomplishments

- **WR-03 (BD-22), a fronteira falha fechada.**
  - `COPY_ARQUIVO.naoEstaVersaoDivergente` é um template de uma linha com `${CANAL_PRIVACIDADE_EMAIL}`. O docblock dele explica por que existe: EF e bundle saem por canais independentes.
  - `fronteiraDaCopia` é pura e total. Ela é usada no parágrafo da seção de fronteira do `.html` (ainda passa por `escapeHtml`) e na chave `o_que_nao_esta_nesta_copia` do `.json`, e foi incluída no namespace.
  - O docblock de `oQueNaoEsta` agora diz que o (cr1)/(cr5) prendem a frase ao artefato **do repositório**. O docblock de `gerarHtmlExport` diz quando a neutra vale.
- **Fixture.** `resposta()` usa `versao_allowlist: EXPORT_ALLOWLIST.meta.versao` (derivado), e a (b) compara com o mesmo valor. A (o) continua passando `'1.1.0'` explícito e só olha o rodapé. (n), (cr2) e o `PedirCopiaBloco` continuam verdes sem mudança.
- **(cr6)** testa quatro situações:
  - versão igual: a frase da tela nos dois arquivos, sem a neutra;
  - `'9.9.9'`: a neutra no mesmo lugar, a da tela em lugar nenhum, e o rodapé e o `.json` dizendo `9.9.9`;
  - `''` e chave ausente: a neutra nos dois arquivos;
  - a própria neutra: passa no escape sem mudar, não tem token snake_case e contém o canal.
- **WR-02.** `PARENTESES_QUE_ENTRAM` é um mapa de escopo deliberado, na ordem da frase. `parentesesDaFrase` aplica a regex `/\([^()]* entram?\)/g`, sem repetição e ordenada. `lacunasDosParenteses` devolve `semEntrada`, `entradaOrfa`, `tabelaAusente` e `colunaNaoEntregue`, todas ordenadas. O (cr4) roda sobre a frase e o artefato reais, com sanidade de população. O (cr4b) tem quatro controles, e cada um assere «mudou algo» antes da mordida.
- **UI-SPEC e CONTEXT.**
  - A linha `| Fronteira quando a versão diverge |` é igual ao código caractere a caractere, com `rh@beautysmile.com.br` no lugar da interpolação.
  - A célula «Seção de fronteira» manteve o texto e ganhou a regra de quando a neutra a substitui.
  - O BD-22 registra a decisão, onde ela vale e o residual da tela (T-44-109).

## Evidências

### (cr6) VERMELHO com o serviço de HEAD (antes do passo 4 do Task 1)

Primeiro foi confirmado que `git diff --quiet HEAD -- exportacaoService.ts` imprimia `servico = HEAD`. Depois, `npx vitest run …/exportacaoService.test.ts`:

```
     × (cr6) WR-03 · versão da lista da resposta diferente da do site ⇒ fronteira neutra nos dois arquivos 3ms
AssertionError: versão divergente: o .json carrega a fronteira do bundle com o carimbo de outra versão — use fronteiraDaCopia(resposta.versao_allowlist): expected 'Não entram os registros técnicos de f…' not to be 'Não entram os registros técnicos de f…' // Object.is equality
      Tests  1 failed | 55 passed (56)
```

É um RED válido: a falha cai na asserção planejada do caso `'9.9.9'`, e não em erro de carga. Os outros 55 casos já passavam com a fixture nova, (b), (n), (o) e (cr2) inclusive.

### Mutação real (Task 1 verify 2): o (cr6) MORDE

A chave do `.json` voltou para `COPY_PEDIR_COPIA.oQueNaoEsta` por `perl` e o teste rodou só com o filtro `WR-03`. Depois o serviço foi restaurado do backup feito antes da mutação:

```
WR-03 mordeu: o .json com a frase fixa reprova o (cr6); md5 9b8b6af02f60e21329f467aeac5526d6 -> 860f1b97945bf946cb5feac5de47a082 -> 9b8b6af02f60e21329f467aeac5526d6
R=1
     × (cr6) WR-03 · versão da lista da resposta diferente da do site ⇒ fronteira neutra nos dois arquivos 13ms
AssertionError: versão divergente: o .json carrega a fronteira do bundle com o carimbo de outra versão — use fronteiraDaCopia(resposta.versao_allowlist): expected 'Não entram os registros técnicos de f…' not to be 'Não entram os registros técnicos de f…' // Object.is equality
      Tests  1 failed | 55 skipped (56)
```

O md5 depois da restauração é igual ao de antes e diferente do mutado. `cmp -s` contra o backup não acusou diferença.

### Vermelho invertido do (cr4b)

O controle 1 foi escrito primeiro com `colunaNaoEntregue` esperado `[]`:

```
     × (cr4b) WR-02 · o portão dos parênteses morde: coluna vetada, parêntese novo, entrada órfã e tabela que saiu do artefato reprovam 6ms
AssertionError: expected [ 'retencao_hold.motivo' ] to deeply equal []
 ❯ src/features/privacidade/services/__tests__/exportacaoService.test.ts:1530:67
      Tests  1 failed | 1 passed | 56 skipped (58)
```

Depois veio a expectativa certa, `` [`${primeira.tabela}.${coluna}`] `` (= `['retencao_hold.motivo']`). Os quatro controles ficaram verdes:

| Controle | Mutação | Lacuna esperada |
|---|---|---|
| 1 | `retencao_hold.motivo` sai de `colunas` e vai para `colunas_excluidas` com `decisoes_por_coluna: BD-99 — sonda` | `colunaNaoEntregue = [retencao_hold.motivo]` |
| 2 | frase + « (o texto entra)» | `semEntrada = [(o texto entra)]` |
| 3 | frase sem «(a decisão em si entra)» | `entradaOrfa = [(a decisão em si entra)]` |
| 4 | clone sem a tabela `decisao_final` | `tabelaAusente = [decisao_final]` |

### Parêntese → tabela → colunas, conferido contra o artefato 1.4.0

Lido de `docs/compliance/export-allowlist.json` (`meta.versao` = `1.4.0`):

| Parêntese (derivado da frase) | Tabela | Colunas prometidas | Em `colunas` | Em `colunas_excluidas` |
|---|---|---|---|---|
| `(o motivo e as datas entram)` | `retencao_hold` | `motivo`, `criado_em`, `liberado_em` | todas | nenhuma (excluídas: `criado_por`, `detalhe`, `liberado_por`) |
| `(o andamento e as datas do pedido entram)` | `solicitacoes_dados` | `situacao`, `solicitado_em`, `atendido_em` | todas | nenhuma (excluídas: `aviso_cancelamento_enviado_em`, `aviso_pedido_enviado_em`, `plano`, `recibo_enviado_em`) |
| `(a decisão em si entra)` | `decisao_final` | `decisao` | sim | não (excluídas: `alerta_prazo_enviado_em`, `justificativa`, `por_usuario`, `revisao_por_usuario`) |

A derivação sobre a frase real devolveu exatamente esses três trechos.

### Verifies e verificação do plano

- Task 1 verify 1:
  - `tsc rodou: rc=2 error_TS=89`;
  - `ui-spec = codigo (frase neutra); html e json passam por fronteiraDaCopia`;
  - `fronteira do task: nada mudou sob supabase/ nem docs/compliance/`.
- Task 2 verify:
  - `(cr1)..(cr6) verdes, 58 casos passados no arquivo`;
  - `grep -c PARENTESES_QUE_ENTRAM` = 6;
  - `fronteira do task: nada mudou sob supabase/ nem docs/compliance/`.
- `npx vitest run src/features/privacidade`: 11 arquivos, **168/168**. Com `docs/compliance/__tests__`: 16 arquivos, **265/265**.
- Critérios de aceite:
  - `grep -c fronteiraDaCopia exportacaoService.ts` = 7 (≥ 4);
  - `awk` da fixture conta `EXPORT_ALLOWLIST.meta.versao` = 1;
  - `toBe(EXPORT_ALLOWLIST.meta.versao)` = 1;
  - `^### BD-22 ` = 1;
  - `grep -cF "if (!frase.includes("` = 0.
- Invariantes:
  - `git diff --quiet dedca1fb -- docs/compliance/export-allowlist.json docs/compliance/pii-inventory.yaml docs/compliance/sql supabase` sai 0;
  - `44-20 não tocou docs/compliance nem supabase`;
  - `REQUIREMENTS.md intocado`;
  - `ROADMAP: só caixas desta rodada`.
- STATE.md:
  - a conferência sobre a árvore não imprimiu nada;
  - o laço por commit imprimiu `STATE.md: corpo preservado`, rodado antes deste commit sobre `514b35ce ca1fea47 e42dbcd3 3ed321b6` e de novo depois dele.
  - **Exclusão:** `dee65a6c` ficou fora do laço, por instrução do orquestrador. É o commit de início de fase, em que `state.begin-phase` reescreveu `Status:` e `Last activity:` do bloco da Phase 44. Todos os outros commits foram conferidos.

## Task Commits

1. **Task 1 (TRACER): WR-03, versão → fronteira → .html e .json, falhando fechado.** Commit `183dc181` (`feat(44-20)`), com exatamente os quatro arquivos do task. O tracer gate rodou em modo interativo `end-of-phase` com verify só automatizado; os dois verifies foram re-executados, ficaram verdes, e a execução expandiu sem checkpoint.
2. **Task 2: WR-02, parênteses presos às colunas, quatro controles.** Commit `6b51335d` (`test(44-20)`).

**Plan metadata:** commit `docs(44-20)` (SUMMARY + STATE + ROADMAP + deferred-items).

## Files Created/Modified

- `src/features/privacidade/services/exportacaoService.ts`: `naoEstaVersaoDivergente`, `fronteiraDaCopia`, os dois usos, o namespace e três docblocks (`oQueNaoEsta` ×2, `gerarHtmlExport`).
- `src/features/privacidade/services/__tests__/exportacaoService.test.ts`: fixture, (b), (cr6), `PARENTESES_QUE_ENTRAM`, `parentesesDaFrase`, `lacunasDosParenteses`, (cr4) e (cr4b).
- `.planning/phases/44-exporta-o-acesso/44-UI-SPEC.md`: linha nova e célula «Seção de fronteira» estendida.
- `.planning/phases/44-exporta-o-acesso/44-CONTEXT.md`: BD-22.
- `.planning/phases/44-exporta-o-acesso/deferred-items.md`: rodapé com versão ausente (ver Issues).

## Decisions Made

- **Alvos do (cr4b) pela ordem do mapa, não por nome.** Seguem o idioma do IN-01 e do (cr5b). O mapa está na ordem da frase: o controle 1 usa a primeira coluna da primeira entrada, e os controles 3 e 4 usam a última entrada. Hoje isso dá exatamente os alvos que o plano nomeia.
- **`tabelaAusente` não duplica em `colunaNaoEntregue`.** Uma entrada cuja tabela sumiu é nomeada uma vez só, pela tabela.
- **No (cr6), a primeira asserção do caso `'9.9.9'` é a que compara com a frase da tela.** Assim o vermelho com o código de HEAD cai no defeito real (a cópia carregava a frase do bundle). Ele não cai no fato secundário de `naoEstaVersaoDivergente` ainda não existir.

## Deviations from Plan

**Commit do tracer como `feat` único, sem um `test(...)` RED separado.** O plano manda commitar os quatro arquivos do Task 1 num só `feat(44-20)` depois dos dois verifies. O vermelho foi executado e registrado acima, mas não commitado à parte. É o mesmo registro do 44-17. `workflow.tdd_mode` não está ligado, e isto não é desvio de regra 1–4.

**Arquivo extra no commit de metadados:** `deferred-items.md`, com um achado fora do escopo (ver abaixo). Nenhum arquivo de código fora dos quatro do plano foi tocado.

Fora isso, o plano foi executado como escrito.

## Issues Encountered

**Fora do escopo, registrado em `deferred-items.md` e não consertado.** Com a chave `versao_allowlist` ausente (só alcançável por cast), a fronteira sai neutra, como deve. Mas o rodapé do `.html` imprime «…exportados: undefined.» e o `.json` omite a chave. O comportamento já existia, e mudar o rodapé seria copy nova sem linha na UI-SPEC. Fica para a revisão do 44-21 avaliar.

## Known Stubs

Nenhum.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

O 44-21 pode começar: a revisão adversarial independente do diff da rodada, num arquivo novo. As duas frases (a de BD-18/BD-19 e a neutra de BD-22) aguardam a aprovação do operador no checkpoint do 44-22. Nenhuma requisição a PROD e nenhum push neste plano.

---
*Phase: 44-exporta-o-acesso*
*Completed: 2026-10-07*

## Self-Check: PASSED

- FOUND: `exportacaoService.ts` (com `fronteiraDaCopia`), o arquivo de teste (com `PARENTESES_QUE_ENTRAM`), `44-UI-SPEC.md` (com «Fronteira quando a versão diverge»), `44-CONTEXT.md` (com `### BD-22 `).
- FOUND: commits `183dc181` e `6b51335d` no log.
