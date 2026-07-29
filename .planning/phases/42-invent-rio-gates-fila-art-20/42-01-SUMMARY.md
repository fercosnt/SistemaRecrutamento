---
phase: 42-invent-rio-gates-fila-art-20
plan: 01
subsystem: gates-e-vocabulario-de-evento
tags: [pre-commit, tsc-baseline, edge-function, notificar-candidato, email-templates, nao-regressao]
status: complete
requires: []
provides:
  - "gate de nao-regressao tsc no .husky/pre-commit (baseline 97) — commit sem --no-verify passa"
  - "EVENTOS_VALIDOS derivado de EVENTO_MAP e exportado de helpers.ts"
  - "teste de paridade bidirecional do vocabulario de evento (T-42-V3a/b/c, T-42-V4)"
  - "pin por string literal de subject+preheader dos 4 eventos vivos (T-42-V1)"
affects:
  - "42-08 (5o evento revisao_respondida): a rede de paridade e o pin W-01 ja existem antes da edicao"
  - "42-12 (INVENT-05, unica escrita destrutiva): pode commitar com o hook rodando e passando"
tech-stack:
  added: []
  patterns:
    - "gate de contagem com baseline congelada (copiado de .github/workflows/ci.yml:61-67)"
    - "vocabulario derivado (Object.keys) em vez de literal paralelo"
    - "extracao do preheader oculto para asercao por igualdade completa"
key-files:
  created:
    - supabase/functions/notificar-candidato/__tests__/vocabulario-eventos.test.ts
  modified:
    - .husky/pre-commit
    - supabase/functions/notificar-candidato/helpers.ts
    - supabase/functions/notificar-candidato/index.ts
    - supabase/functions/_shared/__tests__/email-templates.test.ts
decisions:
  - "Baseline local do hook pinada em 97 (contagem real medida), deliberadamente mais estrita que a do CI (104, folga herdada para PR de terceiro)"
  - "EVENTOS_VALIDOS mantem o tipo declarado ReadonlySet<string> — estreitar quebraria o call site que testa raw.evento cru do JSON; o que mudou e o VALOR, que virou derivado"
  - "O 3o desfecho de decisao_final pinado e o AUSENTE (fail-safe), nao 'em_espera' — este ultimo nao existe no tipo nem e produzivel pela EF"
metrics:
  duration: ~35min
  completed: 2026-07-29
  tasks: 3
  files: 5
  commits: 4
---

# Phase 42 Plan 01: Gates de Não-Regressão e Paridade do Vocabulário de Evento — Summary

Converteu o `.husky/pre-commit` num gate de não-regressão `tsc` pinado em 97 (tornando o portão
de fase destrutiva do M8 satisfazível sem bypass), eliminou por derivação o pior dos sítios de
registro do vocabulário de evento da EF `notificar-candidato`, e pinou por string literal o par
(subject, preheader) dos 4 eventos vivos — tudo **antes** de o 5º evento ser adicionado no 42-08.

## O que foi entregue

### Task 1 — `.husky/pre-commit` como gate de não-regressão (baseline 97)

O hook rodava `npm run lint` cru: checagem binária de exit code contra uma baseline
**pré-existente** de 97 erros `tsc` em `src/**`. Um gate que nunca passa não barra nada — ele só
ensina todo mundo a digitar `--no-verify`, o que deixa passar também os erros **novos**. Todo
commit de P36 a P41 usou bypass.

Convertido no mesmo mecanismo que `.github/workflows/ci.yml:61-67` roda desde a Phase 5, com a
baseline em **97** (a contagem real) em vez de 104 (o teto do CI, folga herdada e deliberada para
PR de terceiro). O hook local passa a ser a versão **mais estrita** do gate que o CI já tinha.

Medição de precondição: `npm run -s lint 2>&1 | grep -c "error TS"` → **97**, conferindo com
`.planning/M7-HANDOFF.md:86`.

**Prova de que o gate morde** (sonda `src/__gate_probe.ts`, deliberadamente não commitada):

| Estado | Saída do hook | Exit |
|--------|---------------|------|
| com erro de tipo novo | `tsc errors: 98 (frozen baseline: 97)` | **1** |
| após remover a sonda | `tsc errors: 97 (frozen baseline: 97)` | **0** |

A instrução de escape reflexivo do docblock antigo ("se bloquear, use `--no-verify`") foi
**removida**. Um bloqueio deste hook agora significa erro de tipo novo — sinal, não obstáculo.

A proveniência da medição e a prova acima ficaram gravadas **no próprio docblock do hook**, não só
no histórico de commit: quem for re-pinar a baseline no futuro lê o arquivo, não o git log.

### Task 2 — `EVENTOS_VALIDOS` derivado + paridade do vocabulário pinada (TDD)

`EVENTOS_VALIDOS` era um `new Set([...])` escrito à mão em `index.ts:65-70`. Sendo
`ReadonlySet<string>`, o compilador **nunca** conferiu que a lista batia com `EVENTO_MAP`. Um
evento esquecido ali não dá erro de build nem erro visível em runtime: a EF responde
`400 VALIDATION` a um `net.http_post`, que é **at-most-once** — a rejeição não volta ao banco, não
vira exceção, não vira linha no ledger. O e-mail simplesmente nunca sai. Era o pior dos sítios.

Agora é `new Set(Object.keys(EVENTO_MAP))` em `helpers.ts`. **Os sítios de registro caem de 10
para 9**, e o eliminado é justamente o de falha silenciosa.

- `helpers.ts`: `EVENTO_MAP` exportado; `EVENTOS_VALIDOS` derivado e exportado. O tipo declarado
  segue `ReadonlySet<string>` de propósito — o call site testa `raw.evento` cru do corpo JSON, e
  estreitar para `ReadonlySet<EventoLedger>` quebraria a compilação lá. Mudou o **valor**, não o tipo.
- `index.ts`: declaração local removida, import adicionado. Diff = **1 linha adicionada / 7
  removidas**; o consumo `!EVENTOS_VALIDOS.has(raw.evento)` ficou byte a byte inalterado.
- `__tests__/vocabulario-eventos.test.ts` (novo): T-42-V3a (set ⟷ mapa, bidirecional), T-42-V3b
  (valores do mapa ⟷ chaves de `SUBJECTS`, bidirecional), T-42-V3c (render real de subject +
  preheader por evento, inclusive sem os campos opcionais), T-42-V4 (dedupe_key por evento e
  ausência de colisão), mais uma guarda de forma que reprova se `index.ts` voltar a declarar um
  `Set` literal paralelo.

**RED observado antes do GREEN:** `TS2459 EVENTO_MAP declares locally but is not exported` +
`TS2305 no exported member 'EVENTOS_VALIDOS'` → `Type checking failed`.

### Task 3 — Não-regressão W-01: subject **e** preheader pinados por literal

O W-01 (UAT ao vivo, 2026-07-28) foi um preheader que ficou literal quando `subject` e `corpo`
passaram a ramificar por desfecho: o aprovado via "Boa notícia…" ao lado da prévia "Atualização
sobre a sua candidatura.". A metade errada era invisível a **toda** asserção que olha o texto
visível — o preheader é `<span display:none>`, existe só para o cliente de e-mail renderizar na
listagem. Escapou dos testes de corpo **e** do UAT de leitura do e-mail aberto.

Acrescentados 6 pares (subject, preheader) pinados contra a string **completa** de hoje, lida do
código-fonte vivo. Nenhuma asserção usa `.includes(`, `.startsWith(` ou regex parcial.
`extrairPreheader` promovido ao topo do arquivo; os 3 testes W-01 da P39 ficaram intocados (cobrem
outra propriedade: a **ausência** da prévia do outro desfecho). `Deno.test(` no arquivo: 13 → 19.

## Prova de que as redes mordem

Todas as mutações abaixo foram aplicadas, medidas e **revertidas**. `git diff` de
`email-templates.ts` e `helpers.ts` ficou vazio ao final.

| # | Mutação | Resultado observado |
|---|---------|---------------------|
| 1 | `revisao_respondida: "decisao_final"` em `EVENTO_MAP`, nada mais | `TS2353: 'revisao_respondida' does not exist in type 'Record<EventoLedger, EventoNotificacao>'` → `Type checking failed` |
| 2 | `EVENTOS_VALIDOS` de volta a literal à mão, sem `"decisao"` | `FAILED \| 21 passed \| 4 failed`. T-42-V3a acusa: *"'decisao' está em EVENTO_MAP mas NÃO em EVENTOS_VALIDOS: a EF rejeitaria esse disparo com 400 VALIDATION e o e-mail sumiria sem rastro"*. **Dois testes CR-01 pré-existentes caem junto** — confirmação independente de que a consequência real é o e-mail de decisão nunca sair. |
| 3 | `PREHEADERS.decisao_final` → literal neutro fixo (a forma **histórica** exata do W-01) | `FAILED \| 125 passed \| 2 failed`. Cai o desfecho `aprovado` (T-42-V1) + o teste W-01 correspondente. |
| 4 | `PREHEADERS.decisao_final` → literal `"Boa notícia"` fixo (direção inversa) | `FAILED \| 123 passed \| 4 failed`. Caem **2 dos 3 desfechos** (`rejeitado` e AUSENTE) + 2 testes W-01. É a mutação mais perigosa: anunciaria "Boa notícia" na prévia de um candidato **rejeitado**. |

## Verificação

| Item | Resultado |
|------|-----------|
| `sh .husky/pre-commit` | `tsc errors: 97 (frozen baseline: 97)`, exit **0** |
| `sh .husky/pre-commit` com erro de tipo novo | `tsc errors: 98`, exit **1** |
| `npm run -s lint 2>&1 \| grep -c "error TS"` | **97** (inalterado — nenhuma edição do plano é TypeScript de `src/**`) |
| `deno test … supabase/functions` (corpus inteiro) | **276 passed / 0 failed** |
| `npm run test:run` (Vitest, regressão) | **130 arquivos / 1074 testes**, todos passando |
| `grep -c 'EVENTOS_VALIDOS' index.ts` | **2** (import + consumo) |
| `grep -c 'new Set(' index.ts` | **0** |
| `grep -c 'Object.keys(EVENTO_MAP)' helpers.ts` | **1** |
| `grep -c 'revisao_respondida' email-templates.test.ts` | **0** |
| diff de `index.ts` | 1 adicionada / 7 removidas (limite: ≤8 removidas, 1 adicionada) |

## Desvios do plano

### 1. [Rule 1 — Bug no plano] `em_espera` não é um desfecho existente

- **Encontrado em:** Task 3
- **Problema:** o PLAN pede os 3 desfechos de `decisao_final` como `(aprovado, rejeitado,
  em_espera)`. `em_espera` **não existe**: `DadosEmail.desfecho` é `"aprovado" | "rejeitado"`
  opcional (`email-templates.ts:76`), e a EF o deriva por ternário de `etapa_atual`
  (`notificar-candidato/index.ts:336`), então nunca produz um terceiro valor. Passar `"em_espera"`
  seria erro de compilação — `deno check` reprovaria.
- **Correção:** o 3º desfecho pinado é o **AUSENTE** — o fail-safe documentado em
  `email-templates.ts:74` e `:149`, que é o terceiro ramo real do código e o mesmo que o teste W-01
  de `:133` já cobria. A contagem de 6 pares exigida pelo critério de aceitação foi mantida.
- **Registrado também** no comentário de bloco do próprio teste, para quem ler o arquivo depois.
- **Commit:** `fcec205`

### 2. [Rule 3 — Bloqueio] `CORPOS` e `PREHEADERS` são privados do módulo

- **Encontrado em:** Task 2
- **Problema:** o bloco `<behavior>` pede comparar as chaves de `SUBJECTS`/`CORPOS`/`PREHEADERS`
  entre si, mas `CORPOS` e `PREHEADERS` são `const` privados de `email-templates.ts`. Exportá-los
  exigiria modificar `email-templates.ts`, que **não** está em `files_modified` do plano.
- **Correção:** a paridade dos dois é verificada por **execução** em T-42-V3c — `renderarEmail`
  indexa os três mapas, então uma chave ausente estoura no teste. Na direção oposta (chave a mais),
  os três são `Record<EventoNotificacao, …>`, logo o compilador já a torna impossível. Nenhuma
  linha de `email-templates.ts` foi tocada.
- **Commit:** `9c4e03a`

### 3. [Rule 3 — Bloqueio] Contaminação por execução concorrente na árvore compartilhada

- **Encontrado em:** Task 1 (com impacto em todo o plano)
- **Problema:** executores irmãos da Phase 42 rodam **em paralelo sobre a mesma working tree**, sem
  isolamento por worktree. Três efeitos observados:
  1. **Varredura de staging.** O commit de conversão do hook foi varrido para dentro de
     `a990e99 feat(42-03)` por um irmão que rodou `git add -A` enquanto este agente tinha o arquivo
     staged. O **conteúdo chegou correto**, mas o commit atômico do 42-01 e o registro da medição
     se perderam.
  2. **Baseline `tsc` oscilando.** A contagem alternou 97 ⇄ 98 conforme irmãos entravam em janelas
     de TDD RED (ex.: `src/features/revisao/constants/__tests__/slaRevisao.test.ts` importando um
     `../slaRevisao` que só nasceu 1 minuto depois). O hook reprovou commits por erro que **não era
     deste plano**.
  3. **Corrida de ref.** `fatal: cannot lock ref 'HEAD'` num commit, com HEAD movido por um irmão
     no meio da operação.
- **Correção:** (a) medição isolada provando contribuição **zero** deste plano para a contagem — o
  escopo de `tsc` é `["src","e2e","scripts","playwright.config.ts"]` (`tsconfig.json:73`), e os
  arquivos deste plano são shell (`.husky/*`) e `supabase/functions/**`, ambos fora dele; o único
  erro extra vinha sempre de `src/features/revisao/**`, de um irmão. (b) Todos os commits seguintes
  passaram a usar **pathspec explícito** (`git commit -- <arquivos>`) em vez de `git add` +
  `git commit`, para não varrer trabalho em progresso alheio. (c) A proveniência perdida foi
  devolvida ao docblock do hook em `a083cbc`.
- **Nenhum bypass foi usado.** Todos os 3 commits deste plano rodaram o hook e passaram.

## Nota de atenção para o orquestrador

**A paralelização desta fase não está isolada.** Os 12 planos compartilham uma única working tree e
um único índice git. O que foi observado aqui (varredura de staging entre agentes, gate flapping
por janela de TDD RED alheia, corrida de lock em HEAD) é sistêmico, não incidental:

- Um agente que rode `git add -A` / `git add .` **sequestra o trabalho não commitado de todos os
  irmãos** e o atribui ao próprio commit. Isso já aconteceu uma vez (`a990e99`) e quebra tanto a
  atomicidade por task quanto a rastreabilidade por requirement.
- A partir de agora o `.husky/pre-commit` é um gate real. Enquanto um irmão estiver em RED, **todo
  commit de todo agente** reprova — inclusive commits corretos. Um agente menos cuidadoso vai
  concluir "o hook está quebrado" e voltar a usar `--no-verify`, desfazendo na prática o que este
  plano entregou e o portão do 42-12 exige.

**Recomendação:** ou isolar os planos restantes em git worktrees, ou instruir todos os executores a
(1) commitar sempre com pathspec explícito e (2) tratar reprovação do hook como sinal a
**diagnosticar** (medir de qual caminho vem o erro extra) antes de qualquer bypass.

## Known Stubs

Nenhum. Nenhum valor vazio, placeholder ou TODO foi introduzido.

## Threat Flags

Nenhuma superfície de segurança nova. As mitigações do `<threat_model>` do plano foram todas
aplicadas: T-42-01 (sítio eliminado por derivação + teste bidirecional), T-42-06 (gate de contagem
com prova de que morde), T-42-07 (subject e preheader pinados por literal completo). T-42-SC
mantido: **zero pacote novo** — nenhum `npm install` foi executado.

## Escopo negativo respeitado

Este plano **não** adicionou o 5º evento `revisao_respondida`. Apenas tornou sua adição detectável.
`grep -c 'revisao_respondida'` em `email-templates.test.ts` = **0**.

## Commits

| Commit | Tipo | Descrição |
|--------|------|-----------|
| `a990e99` | — | Conteúdo da conversão do hook (varrido para um commit irmão — ver Desvio 3) |
| `a083cbc` | chore | Proveniência da baseline 97 no gate de pre-commit (Task 1) |
| `9c4e03a` | feat | `EVENTOS_VALIDOS` derivado de `EVENTO_MAP` + paridade do vocabulário (Task 2) |
| `fcec205` | test | Subject e preheader dos 4 eventos vivos pinados (Task 3) |

## Self-Check: PASSED

Todos os 5 arquivos declarados existem em disco; todos os 4 commits existem no histórico; working
tree limpa ao fim do plano.
