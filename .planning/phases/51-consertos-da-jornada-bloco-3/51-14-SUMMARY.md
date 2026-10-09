---
phase: 51-consertos-da-jornada-bloco-3
plan: 14
subsystem: ui
tags: [react, tanstack-query, vitest, revisao, lgpd-art20, jorn-42]

requires:
  - phase: 51-10
    provides: "listar_revisoes_decisao com origem/pedido_id; ler_contexto_knockout_revisao(uuid) (migration 20261008000003, NÃO aplicada)"
  - phase: 51-08
    provides: "responder_revisao_rejeicao(p_pedido_id, p_veredito, p_justificativa) (migration 20261008000002, NÃO aplicada)"
provides:
  - "Fila /rh/revisoes com selo de origem por linha (Decisão final / Rejeição pelo RH / Knockout) e linha identificada por pedido_id"
  - "responderRevisao roteado pela origem (decisão final -> responder_revisao_decisao; rejeição/knockout -> responder_revisao_rejeicao)"
  - "lerContextoKnockout + ContextoKnockoutRevisao: pergunta, resposta e opção que eliminou, lidas sob demanda no diálogo (D-11)"
affects: [51-16, 51-17]

actuals:
  tokens: 15477
  tasks: 2
  commits: 2

plan_head_before: 0c0733943e4a5e59986c71e25914ef71e5acc009
plan_head_after: b7a6fc2bc2342ca2e2a490fbeb67da4c5f66a247

tech-stack:
  added: []
  patterns:
    - "Selo de vocabulário fechado (molde VereditoBadge): valor fora do mapa = nada, nunca ecoado"
    - "Leitura sob demanda no diálogo (molde RespostaCasoAbertoSjt): useQuery staleTime 0 / gcTime 0 / retry false"
    - "RPC ainda fora do database.types.ts chamada por cast estreito confinado ao nome (sai no db:types do 51-17)"

key-files:
  created:
    - src/features/revisao/components/OrigemRevisaoBadge.tsx
    - src/features/revisao/components/ContextoKnockoutRevisao.tsx
  modified:
    - src/features/revisao/services/revisaoService.ts
    - src/features/revisao/services/__tests__/revisaoService.test.ts
    - src/features/revisao/components/FilaRevisoesTable.tsx
    - src/features/revisao/components/__tests__/FilaRevisoesTable.test.tsx
    - src/features/revisao/components/ResponderRevisaoDialog.tsx
    - src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx
    - src/features/revisao/hooks/__tests__/useResponderRevisao.test.ts

key-decisions:
  - "Selo de origem mora na célula «Decisão original» (não numa 8ª coluna): a fila mantém as 7 colunas travadas em D-P42-05 e o teste de contagem não precisou mudar"
  - "Roteamento da resposta: só origem explícita humana_triagem/automatica vai a responder_revisao_rejeicao; humana OU nulo segue em responder_revisao_decisao (nulo = fila de antes da 0003, que só tem decisão final)"
  - "Cópia de `removida` no contexto do knockout NÃO diz «a pedido do titular»: o motor de exclusão (anonimizar_candidato) também roda na purga de retenção; mesmo motivo já registrado em RespostaCasoAbertoSjt"
  - "Reversão das origens novas tem cópia própria (reabre na etapa: triagem no knockout, etapa da rejeição na rejeição pelo RH, D-02/D-30); a de «Decisão final» só vale para a decisão final"
  - "Reset do rascunho do diálogo passou a ser chaveado pelo pedido_id (C-12): dois pedidos da mesma candidatura não compartilham rascunho"

patterns-established:
  - "Linha da fila identificada pelo pedido (key={linha.pedido_id}), nunca pela candidatura"

requirements-completed: [JORN-42]

coverage:
  - id: D1
    description: "Fila mostra o selo de origem por linha («Decisão final», «Rejeição pelo RH», «Knockout»; nenhum diz «triagem»), com data-testid fila-origem-badge, chave por pedido_id e autor «Automático (knockout)» no knockout"
    requirement: "JORN-42"
    verification:
      - kind: unit
        ref: "src/features/revisao/components/__tests__/FilaRevisoesTable.test.tsx#FilaRevisoesTable — selo de origem, id do pedido e o autor do knockout (51-14)"
        status: pass
      - kind: unit
        ref: "src/features/revisao/components/__tests__/FilaRevisoesTable.test.tsx#OrigemRevisaoBadge — vocabulário fechado (D-33)"
        status: pass
    human_judgment: true
    rationale: "Nada publicado neste plano (vai ao ar no portão 51-16, depois do apply da 0003); a leitura visual do selo na fila real em PROD fica para o portão"
  - id: D2
    description: "Allowlist da fila ganha só origem e pedido_id; projeção descarta coluna estranha; resposta roteada pela origem (RPC certa), sem decisão de autorização no cliente"
    requirement: "JORN-42"
    verification:
      - kind: unit
        ref: "src/features/revisao/services/__tests__/revisaoService.test.ts#responderRevisao — roteia pela origem do pedido (51-14)"
        status: pass
      - kind: unit
        ref: "src/features/revisao/services/__tests__/revisaoService.test.ts#mantém `origem` e `pedido_id` e descarta uma coluna estranha (`justificativa`)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Diálogo de um knockout mostra pergunta, resposta e opção que eliminou (estados disponivel/removida/indisponivel/erro), texto do candidato como nó de texto; origens humanas não buscam"
    requirement: "JORN-42"
    verification:
      - kind: unit
        ref: "src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx#ResponderRevisaoDialog — pedido de knockout (D-11, D-12)"
        status: pass
      - kind: unit
        ref: "src/features/revisao/services/__tests__/revisaoService.test.ts#lerContextoKnockout — RPC do contexto do knockout, coerção estrita (51-14)"
        status: pass
    human_judgment: true
    rationale: "A cópia de `removida` diverge da frase literal do plano (desvio 3) — o operador deve confirmar a redação; e a RPC só existe em PROD depois do apply da 0003 no portão 51-16"

duration: 7min
completed: 2026-10-09
status: complete
---

# Phase 51 Plan 14: fila de revisões com três origens (cliente) Summary

**A fila `/rh/revisoes` mostra um selo de origem em cada linha, identifica a linha pelo `pedido_id` e responde cada pedido pela RPC da sua origem. No knockout, o diálogo mostra a pergunta eliminatória, a resposta do candidato e a opção que eliminou, lidas sob demanda por `ler_contexto_knockout_revisao`. Nada foi aplicado, publicado ou empurrado.**

## Performance

- **Duração:** ~7 min
- **Início:** 2026-10-09T06:50:23Z
- **Fim:** 2026-10-09T06:57:23Z
- **Tasks:** 2/2
- **Arquivos:** 9 (2 criados, 7 modificados)

## Accomplishments

- **Selo de origem (D-12/D-33):** `OrigemRevisaoBadge` usa um vocabulário fechado, «Decisão final» / «Rejeição pelo RH» / «Knockout», com `data-testid="fila-origem-badge"`. Um valor desconhecido ou nulo não renderiza nada. Nenhum texto renderizado na fila diz «triagem».
- **Linha identificada pelo pedido (C-12):** `key={linha.pedido_id}`. Com dois pedidos da mesma candidatura, a tabela mostra três linhas e o React não emite aviso de chave duplicada (há teste com spy em `console.error`).
- **Autor do knockout:** a fila e o diálogo dizem «Automático (knockout)». «Não identificado» continua valendo para os outros casos de nome nulo.
- **Allowlist:** `FILA_REVISAO_COLUNAS` passou de 11 para 13 chaves. As únicas novas são `origem` e `pedido_id`, e a projeção descarta `justificativa` (T-51-55).
- **Resposta pela RPC certa (D-10, T-51-57):** `humana_triagem`/`automatica` vão para `responder_revisao_rejeicao(p_pedido_id, …)`, por cast estreito. `humana`/nulo seguem em `responder_revisao_decisao(p_candidatura_id, …)`, sem mudança. O cliente não toma nenhuma decisão de autorização. O guarda «decisor» da RPC nova vira `GUARD_DECISOR`, e o P0002 vira `VALIDACAO`.
- **Contexto do knockout (D-11):** `lerContextoKnockout` faz coerção estrita do retorno. `ContextoKnockoutRevisao` busca com `useQuery` (`staleTime 0, gcTime 0, retry false`) e tem quatro estados: disponível, removida, indisponível e erro com «Tentar novamente». O texto do candidato entra só como nó de texto: HTML na resposta aparece literal (T-51-56).

## Task Commits

1. **Task 1 (tracer): selo de origem, id do pedido, resposta pela RPC da origem** — `a4a3874b` (feat)
2. **Task 2: contexto do knockout no diálogo (D-11) + mordida provada** — `b7a6fc2b` (feat)

## TDD: RED / GREEN / mordida

**Task 1 RED** (antes da implementação): `revisaoService.test.ts` reprovou em **4 asserções do comportamento planejado**: 13 chaves, projeção mantendo `origem`/`pedido_id` e o roteamento `automatica`/`humana_triagem` → `responder_revisao_rejeicao`. `FilaRevisoesTable.test.tsx` reprovou **por carga**, porque `../OrigemRevisaoBadge` ainda não existia. Avaliação semântica: o RED do serviço é válido, com o alvo falhando na asserção certa. O RED da tabela é falha de carga (módulo ausente), e por isso a mordida forte abaixo foi feita.
**Task 1 GREEN:** 206/206.

**Task 2 RED:** os 4 testes de `lerContextoKnockout` falharam com `lerContextoKnockout is not a function`, e `ResponderRevisaoDialog.test.tsx` falhou por carga (`../ContextoKnockoutRevisao` ausente). **GREEN:** revisao 222/222 e guards 129/129 (351/351).

**Mordida (D-56), worktree de `refs/gsd/51-14/base` = `0c073394`:**
- (a) **Os três testes desta fase copiados para a base:** `Test Files 3 failed | 7 passed`, `Tests 8 failed | 132 passed`. São 8 falhas de asserção em `revisaoService.test.ts` (13 chaves, projeção, os 2 roteamentos e os 4 de `lerContextoKnockout`). As suítes da tabela e do diálogo não carregam na base: `Failed to resolve import "../OrigemRevisaoBadge"` e `"../ContextoKnockoutRevisao"`.
- (b) **Mordida forte**, para não depender de falha de carga: na mesma base, entraram também o serviço e os dois componentes novos, mas ficaram a **tabela e o diálogo velhos**. Resultado: `Test Files 2 failed | 8 passed`, `Tests 14 failed | 208 passed`. Falharam por asserção: os três selos, «sem chave duplicada», «Automático (knockout)» na tabela, o `mutate` com origem/pedido, autor do knockout no diálogo, busca do contexto, `removida`, `indisponivel`, erro com «Tentar novamente», HTML literal, `origem`/`pedidoId` no envio, reversão do knockout sem «Decisão final», reversão da rejeição pelo RH e reset do rascunho ao trocar de pedido.
- Passam na base por desenho (guardas de regressão, não de comportamento novo): «nenhuma linha diz triagem», «SLA nas três», «rejeição pelo RH sem nome = Não identificado», «origens humanas não buscam contexto».
- Worktree removido (`git worktree remove --force` + `prune`). As saídas completas ficaram no scratchpad da sessão.

**HEAD:** `npx vitest run src/features/revisao src/__tests__/guards` → `Test Files 21 passed (21)`, `Tests 351 passed (351)`. `tsc`: **89** errors (baseline 89, teto D-53 = 90). O hook de pre-commit reportou `tsc errors: 89` nos dois commits.

## Files Created/Modified

- `src/features/revisao/components/OrigemRevisaoBadge.tsx` — selo de origem, vocabulário fechado (novo)
- `src/features/revisao/components/ContextoKnockoutRevisao.tsx` — contexto do knockout lido sob demanda, `COPY_CONTEXTO_KNOCKOUT` (novo)
- `src/features/revisao/services/revisaoService.ts` — allowlist + `origem`/`pedido_id`, `OrigemRevisao`, `ResponderRevisaoVars.origem/pedidoId`, roteamento em `responderRevisao`, `lerContextoKnockout` + `ContextoKnockout`
- `src/features/revisao/components/FilaRevisoesTable.tsx` — `key={linha.pedido_id}`, selo na célula da decisão, `rotularAutor` (knockout)
- `src/features/revisao/components/ResponderRevisaoDialog.tsx` — autor do knockout, `ContextoKnockoutRevisao` só para `automatica`, reset por pedido, cópia da reversão por origem, `origem`/`pedidoId` no submit
- Testes: `revisaoService.test.ts`, `FilaRevisoesTable.test.tsx`, `ResponderRevisaoDialog.test.tsx` (re-especificados e estendidos), `useResponderRevisao.test.ts` (fixture com os dois campos novos)

## Decisions Made

Ver `key-decisions` no frontmatter. Em resumo: o selo fica na célula «Decisão original», o que mantém as 7 colunas; origem nula conta como decisão final; `removida` tem frase neutra; a reversão tem cópia por origem; o reset do rascunho é feito pelo pedido.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] O tipo novo de `ResponderRevisaoVars` quebrava três call sites já na Task 1**
- **Encontrado em:** Task 1
- **Problema:** `origem`/`pedidoId` obrigatórios fizeram o `tsc` subir de 89 para **100** (acima do teto D-53). Os pontos quebrados eram o `mutate` do diálogo, o fixture do teste do diálogo e os 9 usos de `VARS` em `useResponderRevisao.test.ts`. O plano punha o diálogo só na Task 2, e o hook nem constava.
- **Correção:** na Task 1, o diálogo passou a enviar `origem: linha.origem, pedidoId: linha.pedido_id`, e os fixtures ganharam os dois campos. A asserção existente do `mutate` no teste do diálogo foi atualizada. A Task 2 manteve o teste que **morde** esse envio (mordida (b)).
- **Arquivos:** `ResponderRevisaoDialog.tsx`, `__tests__/ResponderRevisaoDialog.test.tsx`, `hooks/__tests__/useResponderRevisao.test.ts`, que entraram no commit da Task 1 (8 arquivos, não 5).
- **Verificação:** tsc 89; revisao 206/206.
- **Commit:** `a4a3874b`

**2. [Rule 1 - Bug] A confirmação da reversão prometia «Decisão final» para pedidos que reabrem em outra etapa**
- **Encontrado em:** Task 2
- **Problema:** com as origens novas entrando no mesmo diálogo, a ajuda da opção «Reverter» e a confirmação diziam «A candidatura volta para «Decisão final»…» e «Quem registrou a decisão original não poderá registrar a nova». Para o knockout e para a rejeição pelo RH isso é **falso**: `responder_revisao_rejeicao` reabre na `etapa_reabertura` (triagem no knockout, D-30; a etapa da rejeição na rejeição pelo RH, D-02). O RH leria isso logo antes de uma ação que dispara e-mail irreversível.
- **Correção:** `REVERSAO_POR_ORIGEM` troca, só para `automatica`/`humana_triagem`, a ajuda da opção e o destaque/corpo da confirmação: «…volta para a etapa de triagem…» / «…volta para a etapa em que foi rejeitada…», mantendo «nova decisão em até 10 dias corridos» (D-04, `prazo_nova_decisao_em` gravado pela RPC). Não afirma impedimento do autor da rejeição. A decisão final continua com a cópia de antes, intocada; os testes 48-15 seguem verdes.
- **Arquivos:** `ResponderRevisaoDialog.tsx` + 2 testes
- **Commit:** `b7a6fc2b`

**3. [Rule 1 - Bug, ⚠ a confirmar pelo operador] A frase de `removida` não é a literal do plano**
- **Encontrado em:** Task 2
- **Problema:** o plano pedia «a resposta foi apagada a pedido do titular». A RPC devolve `removida` quando `respostas_formulario` da candidatura sumiu. Quem apaga essa tabela é `anonimizar_candidato` (migrations `20260922000013`, `20261008000004`), e esse motor roda **no pedido do titular e na purga de retenção** (`purga-retencao-sweep`). «A pedido do titular» afirmaria ao RH um exercício de direito LGPD que pode não ter havido. O projeto já tomou essa decisão pelo mesmo motivo em `RespostaCasoAbertoSjt` (docblock).
- **Correção:** «A resposta do candidato foi apagada na exclusão de dados pessoais e não está mais disponível.» (`COPY_CONTEXTO_KNOCKOUT.removida`). Isso é verdade nos dois caminhos. O motivo ficou registrado no docblock do componente.
- **Commit:** `b7a6fc2b`

**4. [Rule 1 - Bug] O reset do rascunho do diálogo era chaveado pela candidatura**
- **Encontrado em:** Task 2
- **Problema:** com dois pedidos da mesma candidatura (C-12), trocar de um para o outro não limpava o texto, e o rascunho escrito para um pedido poderia ser enviado no outro.
- **Correção:** o `useEffect` agora reinicia pelo `pedido_id`. Há teste que troca de pedido com `rerender` e exige a área de texto vazia; ele morde na mordida (b).
- **Commit:** `b7a6fc2b`

**5. [Escopo] Testes de `lerContextoKnockout` em `revisaoService.test.ts`**: o arquivo não constava na lista de arquivos da Task 2, mas é o lugar do teste de contrato do serviço. Entraram no commit da Task 2.

---

**Total:** 5 desvios (1 Rule 3, 3 Rule 1, 1 de escopo). **Impacto:** todos ficam dentro dos arquivos da feature `revisao`. Nada no servidor e nenhum arquivo de outra sessão. O desvio 3 troca uma frase prescrita pelo plano e está marcado para o operador.

## Issues Encountered

- O primeiro `git commit` da Task 1 falhou sem efeito: o zsh não divide `$F` em palavras, então o pathspec virou um caminho só e nada foi staged nem commitado. Refeito com array (`"${F[@]}"`).

## Ordem obrigatória (para o portão 51-16)

**Este cliente não pode ir ao ar antes do apply da `20261008000003`** (e da `0002`, que cria `responder_revisao_rejeicao`). Com a fila velha (11 colunas), `origem` e `pedido_id` chegam **nulos**. A resposta continua correta, porque nulo vai para `responder_revisao_decisao` e a fila velha só tem decisão final. Mas `key={linha.pedido_id}` fica `null` em toda linha, o que gera aviso de chave duplicada e risco de reconciliação errada no React, e nenhuma linha mostra selo. A sequência migration → cliente já pertence ao 51-16 (D-55). Não há passo órfão.

## PROD

- **Nenhuma escrita.** Nenhum `migrate`, `run`, deploy de EF ou `git push`.
- Leitura única, só-leitura: `node p46apply.cjs sql "select max(version) …"` retornou **`max_version = 20261008000001`**, `p51_rows = 1`. O ledger está inalterado.
- `git log --oneline origin/main..HEAD`: **30** commits locais à frente (a fila da onda B, que é empurrada no portão 51-16). Este plano acrescentou 2 desses commits e não empurrou nada.

## Known Stubs

Nenhum.

## Next Phase Readiness

Cliente pronto para o portão 51-16 (apply `0002`/`0003` → EF → push). As RPCs `responder_revisao_rejeicao` e `ler_contexto_knockout_revisao` estão chamadas por cast estreito até o `db:types` do 51-17. Próximo: 51-15.

## Self-Check: PASSED

- FOUND: src/features/revisao/components/OrigemRevisaoBadge.tsx
- FOUND: src/features/revisao/components/ContextoKnockoutRevisao.tsx
- FOUND: a4a3874b (ancestral de HEAD)
- FOUND: b7a6fc2b (ancestral de HEAD)
- Critérios de aceitação re-rodados no HEAD: `'pedido_id'`=1, `responder_revisao_rejeicao`=2, «Rejeição pelo RH»=1, `key={linha.pedido_id}`=1, `ler_contexto_knockout_revisao`=2, `ContextoKnockoutRevisao` no diálogo=3; vitest 351/351; tsc 89
