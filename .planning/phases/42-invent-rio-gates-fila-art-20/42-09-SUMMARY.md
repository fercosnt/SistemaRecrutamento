---
phase: 42-invent-rio-gates-fila-art-20
plan: 09
subsystem: rh-ui
tags: [lgpd, art20, fila, revisao, tanstack-query, rpc, sla, rls, rota-rh]

requires:
  - phase: 42-03
    provides: "classifyRevisaoSla + FILA_REVISAO_COLUNAS + contrato de erro (constants/slaRevisao.ts)"
  - phase: 42-06
    provides: "RPCs listar_revisoes_decisao / contar_revisoes_pendentes / config_sla_revisao vivos em PROD"
provides:
  - "Rota /rh/revisoes viva sob RoleGuard ['rh','administrador'] — o pedido de revisão do candidato deixa de cair no vazio"
  - "revisaoService.listarFilaRevisoes / contarPendentes / lerConfigSla — leitura exclusivamente por RPC"
  - "3 hooks de query com chaves hierárquicas (useFilaRevisoes, useRevisoesPendentesCount, useConfigSlaRevisao)"
  - "FilaRevisoesTable com 7 colunas, cap 200 + aviso de corte, cabeçalho fixo e scroll interno"
  - "RevisaoSlaBadge e VereditoBadge — vocabulário fechado, sem texto livre"
affects: [42-10, 42-11, 47-consolidacao]

tech-stack:
  added: []
  patterns:
    - "Leitura de fila por RPC SECURITY DEFINER e nunca por PostgREST — usuarios_rh é admin-only, então um recrutador lendo por PostgREST veria 100% das linhas como 'Não identificado'"
    - "42501 mapeado como caso ÚNICO de 'sem permissão' — a correção de authz da 42-06 tornou os sub-casos indistinguíveis de propósito, e a UI não pode reintroduzir a distinção"

key-files:
  created:
    - src/features/revisao/services/revisaoService.ts
    - src/features/revisao/hooks/useFilaRevisoes.ts
    - src/features/revisao/hooks/useRevisoesPendentesCount.ts
    - src/features/revisao/hooks/useConfigSlaRevisao.ts
    - src/features/revisao/components/FilaRevisoesTable.tsx
    - src/features/revisao/components/RevisaoSlaBadge.tsx
    - src/features/revisao/components/VereditoBadge.tsx
    - src/features/revisao/components/RevisoesRHPage.tsx
  modified:
    - src/router/routes.tsx

key-decisions:
  - "RoleGuard ['rh','administrador'], não admin-only — o recrutador é a persona primária desta tela e um gate admin-only o excluiria"
  - "Config de limiar ilegível resolve para a faixa degenerada, nunca para erro de tela"
  - "Nenhum valor de acompanhamento/faixa/dias vaza para superfície de candidato — o limiar é interno (D-P42-03)"

patterns-established:
  - "Plano de UI que encontra regressão fora do seu files_modified registra em deferred-items.md e atribui ao plano dono, em vez de corrigir de passagem"

requirements-completed: [REVISAO-02]

coverage:
  - id: D1
    description: "O RH abre /rh/revisoes e vê os pedidos pendentes ordenados do mais antigo para o mais recente, com badge de acompanhamento por linha"
    requirement: "REVISAO-02"
    verification:
      - kind: automated_test
        ref: "src/features/revisao/components/__tests__/RevisoesRHPage.test.tsx + FilaRevisoesTable.test.tsx — ordem vinda do servidor, 7 colunas, badge por linha"
        status: pass
    human_judgment: false
  - id: D2
    description: "Os 4 estados da fila (vazio por toggle, carregando, erro com retry, preenchida) e os casos zero/um/muitos"
    requirement: "REVISAO-02"
    verification:
      - kind: automated_test
        ref: "FilaRevisoesTable.test.tsx — dois vazios distintos por toggle, esqueleto do AsyncState, erro com copy própria sem eco de transporte, 60 linhas sintéticas + caso exatamente no cap 200 com aviso de corte"
        status: pass
    human_judgment: false
  - id: D3
    description: "Leitura por RPC, nunca por PostgREST; decisor sem correspondência em usuarios_rh resolve para 'Não identificado' e o UUID nunca chega à tela"
    requirement: "REVISAO-02"
    verification:
      - kind: automated_test
        ref: "revisaoService.test.ts — chamada via rpc('listar_revisoes_decisao'); asserção negativa de que nenhum UUID aparece na projeção renderizada"
        status: pass
    human_judgment: false
  - id: D4
    description: "Config de limiar ausente/ilegível resolve para faixa degenerada sem erro de tela; classificador puro e total"
    requirement: "REVISAO-02"
    verification:
      - kind: automated_test
        ref: "RevisaoSlaBadge.test.tsx + useConfigSlaRevisao — faixa degenerada mostra contagem neutra sem badge"
        status: pass
    human_judgment: false
  - id: D5
    description: "A tela renderizada de verdade num navegador, com dados vivos de PROD e login real de RH"
    requirement: "REVISAO-02"
    verification:
      - kind: manual_ui
        ref: "não executado — exige login real; a fila tem exatamente 1 pedido pendente vivo em PROD (conta de teste) para exercitar o caso 'um'"
        status: fail
    human_judgment: true
    rationale: "Cobertura automatizada é de comportamento e estado, não de renderização real em navegador com sessão RH. Fica para a sessão de UAT vivo da fase."

duration: interrompido por erro 529 após a Task 3; fechado pelo orquestrador
completed: 2026-07-30
status: complete
---

# Phase 42 / Plan 09: Fila `/rh/revisoes` — Summary

**O pedido de revisão do Art. 20 deixa de cair no vazio: existe uma tela onde ele aparece, ordenado por antiguidade, com o limiar de acompanhamento vindo de configuração e sem nenhum vazamento do limiar para o lado do candidato.**

## Accomplishments

3 tasks, 3 commits, 1765 inserções, **123 testes** na feature (7 arquivos), suíte inteira em
**135 arquivos / 1148 testes / exit 0**.

| Task | Commit | O que entregou |
|------|--------|----------------|
| 1 | `a0ff7cd` | `revisaoService` (3 leitores por RPC) + os 3 hooks de query com chaves hierárquicas |
| 2 | `887d9b1` | `RevisaoSlaBadge`, `VereditoBadge`, `FilaRevisoesTable` (7 colunas, cap 200, cabeçalho fixo) |
| 3 | `8455a9c` | `RevisoesRHPage` + a rota `/rh/revisoes` no grafo de chunk lazy |

A leitura é **exclusivamente por RPC**. Isso não é preferência de estilo: `usuarios_rh` é admin-only,
então um recrutador lendo a fila por PostgREST veria 100% das linhas com o decisor como
"Não identificado". O `SECURITY DEFINER` de `listar_revisoes_decisao` é o que torna a coluna legível
para a persona primária da tela.

## Interrupção e como foi fechado

O agente executor morreu com **API Error 529 (Overloaded)** — falha de infraestrutura, não do
plano — imediatamente após commitar a Task 3. O plano tem **3 tasks** (não 4), então nenhuma tarefa
de implementação ficou pendente; faltavam apenas os metadados. O orquestrador verificou o estado em
disco (3 commits presentes, árvore limpa, rota registrada, 123 testes verdes) e fechou SUMMARY,
STATE e ROADMAP. Nenhum trabalho foi refeito e nenhum commit foi reescrito.

## Achado fora de escopo, registrado em vez de corrigido de passagem

Ao rodar `npm run test:run` completo, o plano descobriu que **a suíte inteira do repositório saía
não-zero desde o commit `f240a16` do plano 42-07**:
`supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts` é um teste **Deno** (importa
`https://deno.land/std`) e o Vitest tentava carregá-lo, falhando em
`Only URLs with a scheme in: file and data are supported`. Todos os ~20 irmãos do mesmo tipo já
estão no `exclude` do `vite.config.ts`; o do `notificar-rh` não foi acrescentado quando a EF nasceu.

O plano **não corrigiu** — `vite.config.ts` está fora do seu `files_modified`, e mexer na
configuração global de teste a partir de um plano de UI esconderia a regressão de quem a introduziu.
Registrou em `deferred-items.md` como `D-42-09-01`. O orquestrador aplicou a correção de uma linha
**atribuída ao 42-07** (commit `03fbba5`), e a suíte voltou a exit 0.

Vale como sinal: a falha era de **carga de módulo**, não de asserção — nenhum teste passou a
reprovar. É o tipo de sintoma que se confunde com "os testes quebraram" e portanto tende a ser
normalizado em vez de investigado.

## Deviations from Plan

- **Contrato dos RPCs consumidos mudou depois de o plano ser escrito.** A 42-06 corrigiu um defeito
  real de autorização (migration `20260730000002`): guards passaram a falhar fechado e os 3 RPCs
  foram revogados de `anon`. Consequência para esta tela: `42501` é agora o caso **único** de
  "sem permissão", e a UI foi escrita para não distinguir sub-casos — a indistinguibilidade é
  deliberada (era o oráculo de estado que a correção fechou).
- **`database.types.ts` não tocado** — já vinha regenerado da 42-06, e `npm run db:types` não roda
  neste ambiente (CLI sem `supabase login`).

## O que fica aberto

- **UAT vivo da tela** (D5): exige login real de RH em navegador. Há exatamente 1 pedido pendente em
  PROD (conta de teste) para exercitar o caso "um".
- A rota existe, mas o **link do e-mail que aponta para ela** só passa a ser disparado quando o
  checkpoint da 42-07 for fechado — que era exatamente a razão de o operador ter invertido a Wave 3
  para que `/rh/revisoes` existisse antes de qualquer e-mail real sair.
