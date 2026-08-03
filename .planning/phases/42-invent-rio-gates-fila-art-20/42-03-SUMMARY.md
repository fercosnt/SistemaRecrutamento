---
phase: 42-invent-rio-gates-fila-art-20
plan: 03
subsystem: testing
tags: [vitest, tdd, postgres, plpgsql, smoke-test, lgpd, rls, security-definer, date-fns]

# Dependency graph
requires:
  - phase: 34-fila-trabalho-kpis
    provides: "`classifySla` / `diasNaEtapa` (`slaThresholds.ts:45-61`) — o molde de classificador puro e total, incluindo o clamp de desvio de relógio em 0"
  - phase: 15-explicacao-candidato
    provides: "`explicacaoService.ts` — o molde de allowlist nomeada (`DECISAO_EXPLICACAO_ALLOWLIST`) + classe de erro de serviço + mapeamento de SQLSTATE"
  - phase: 41-reconciliacao-retry
    provides: "`p41_recon_retry_smoke.sql` — o idioma gate-GUC com esperado FIXO e reprovação de run parcial"
provides:
  - "`classifyRevisaoSla` — classificador de faixa PURO e TOTAL (9 entradas degeneradas asseridas não-lançantes)"
  - "`diasEmEspera` — contagem de dias corridos clampada em 0 (desvio de relógio + data inválida)"
  - "`RevisaoError` + `classificarErroRevisao` — o `42501` do guard discriminado por MENSAGEM, não por SQLSTATE"
  - "`FILA_REVISAO_COLUNAS` — allowlist de 11 colunas com 3 asserções negativas de chave proibida"
  - "`formatarBadgePendentes` — contador da sidebar que devolve `undefined` (nunca `0`)"
  - "`p42_revisao_art20_smoke.sql` — espec executável RED de 8 asserções para a migration do 42-06"
affects: [42-06, 42-09, 42-10, 42-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Classificador total sobre configuração de servidor: quando o limiar é editável sem deploy, config mal preenchida é estado ALCANÇÁVEL — degradar para faixa degenerada, nunca lançar"
    - "Discriminação de SQLSTATE ambíguo por mensagem (`/decisor/i`) quando o servidor usa o mesmo código para duas recusas semanticamente distintas"
    - "Smoke escrito RED antes da migration, com gate-GUC de esperado FIXO e fixture criada+removida"

key-files:
  created:
    - src/features/revisao/constants/slaRevisao.ts
    - src/features/revisao/constants/__tests__/slaRevisao.test.ts
    - src/features/revisao/services/revisaoService.ts
    - src/features/revisao/services/__tests__/revisaoService.test.ts
    - supabase/tests/p42_revisao_art20_smoke.sql
  modified: []

key-decisions:
  - "Commit por tarefa combina teste + implementação em vez de commits RED e GREEN separados: o plano irmão 42-01 converteu `.husky/pre-commit` num gate de NÃO-REGRESSÃO contra a baseline 97, e um commit RED isolado registra 98 erros `tsc` (o import do módulo inexistente) — quebraria o gate para todo mundo a jusante. O output do run RED está registrado abaixo, que é o que o plano exige."
  - "`FILA_REVISAO_COLUNAS` inclui `revisao_resultado` (a resposta escrita PARA o candidato) e exclui `decisao_final.justificativa` (o texto interno do recrutador). São colunas diferentes e confundi-las é exatamente o Pitfall 8."
  - "A impersonação do smoke resolve o `app_metadata.role` de cada RH pelo mapeamento real do `custom_access_token_hook` (`administrador` → `administrador`, resto → `rh`) em vez de fixar `administrador` para os dois como no exemplo E4 — `usuarios_rh.role` NUNCA vale `'rh'` (Pattern 5), e fixar o papel esconderia essa assimetria."
  - "O teardown do smoke também apaga `decisao_final_historico`: o trigger vivo `trg_decisao_final_snapshot` arquiva OLD.* a cada UPDATE, então as escritas das asserções (f)/(h) deixariam linhas órfãs em PROD."

patterns-established:
  - "Prova de mutação como critério de aceitação: afrouxar o predicado sob teste (`/decisor/i.test(message)` → `true`) tem de reprovar um caso nomeado; se não reprovar, o teste não morde"
  - "Contador gate-GUC incrementado UMA vez por asserção, mesmo quando a asserção tem sub-casos ((f.1)/(f), (h.1)/(h.3)/(h)) — o esperado fixo continua sendo o número de asserções, não o de NOTICEs"

requirements-completed: [REVISAO-02, REVISAO-03, REVISAO-05]

coverage:
  - id: D1
    description: "Classificador de faixa do badge de acompanhamento, puro e total — config ausente, limiar não-positivo, ordem invertida/igual e contagem não finita resolvem para a apresentação degenerada, nunca exceção"
    requirement: "REVISAO-02"
    verification:
      - kind: unit
        ref: "src/features/revisao/constants/__tests__/slaRevisao.test.ts#classifyRevisaoSla — totalidade: toda entrada degenerada vira faixa degenerada"
        status: pass
      - kind: unit
        ref: "src/features/revisao/constants/__tests__/slaRevisao.test.ts#classifyRevisaoSla — as 3 faixas nominais e suas fronteiras"
        status: pass
    human_judgment: false
  - id: D2
    description: "Contagem de dias em espera clampada em 0 — desvio de relógio e data inválida nunca produzem número negativo nem NaN na tela"
    requirement: "REVISAO-02"
    verification:
      - kind: unit
        ref: "src/features/revisao/constants/__tests__/slaRevisao.test.ts#diasEmEspera — dias corridos inteiros, clampados em 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Contrato de erro: a recusa do guard reviewer≠decider é distinguível de qualquer outro 42501 pelo código que a UI recebe, sem a UI adivinhar"
    requirement: "REVISAO-05"
    verification:
      - kind: unit
        ref: "src/features/revisao/services/__tests__/revisaoService.test.ts#classificarErroRevisao — o 42501 do guard é discriminado por MENSAGEM"
        status: pass
      - kind: other
        ref: "prova de mutação: /decisor/i.test(message) → true reprova o caso 42501 'forbidden' (1 failed | 24 passed); revertido → 25/25"
        status: pass
    human_judgment: false
  - id: D4
    description: "Contrato de colunas da fila declarado como constante nomeada, sem a justificativa original do recrutador"
    requirement: "REVISAO-02"
    verification:
      - kind: unit
        ref: "src/features/revisao/services/__tests__/revisaoService.test.ts#FILA_REVISAO_COLUNAS — allowlist explícita do RETURNS TABLE da fila"
        status: pass
    human_judgment: false
  - id: D5
    description: "Formatador do contador da sidebar — devolve undefined (nunca 0) porque RHSidebar.tsx:241 avalia `item.badge && item.badge > 0` e o React renderiza 0 como texto"
    requirement: "REVISAO-02"
    verification:
      - kind: unit
        ref: "src/features/revisao/services/__tests__/revisaoService.test.ts#formatarBadgePendentes — o contador da sidebar"
        status: pass
    human_judgment: false
  - id: D6
    description: "Especificação executável do write-path — 8 asserções com contador acumulado que falha alto em run parcial, escrita ANTES da migration do 42-06"
    requirement: "REVISAO-03"
    verification:
      - kind: other
        ref: "estrutural: 8 incrementos de smoke42.pass, `v_esperado int := 8` (1 ocorrência), 12 blocos DO balanceados, formatos RAISE consistentes"
        status: pass
    human_judgment: true
    rationale: "O arquivo é RED por desenho — os objetos que ele assere (colunas novas, os 2 RPCs, config_sla_revisao) só nascem na migration do 42-06. A execução real contra PROD é do orquestrador via MCP `execute_sql` numa única chamada, no plano 42-06; aqui só a estrutura pôde ser verificada."

# Metrics
duration: 15 min
completed: 2026-07-29
status: complete
---

# Phase 42 Plan 03: Especificações executáveis da fila de revisão Art. 20 — Summary

**Os três módulos puros da feature `revisao` (classificador de SLA total, contrato de erro com allowlist de colunas, formatador do contador) mais o smoke SQL RED de 8 asserções que serve de espec para a migration do 42-06 — nenhuma chamada de rede, nenhum componente React.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-29T13:45:00Z
- **Completed:** 2026-07-29T14:00:00Z
- **Tasks:** 3 de 3
- **Files created:** 5

## Accomplishments

- **O classificador de faixa é puro e TOTAL.** `classifyRevisaoSla` guarda em ordem: config ausente/nula → limiar não finito ou `<= 0` → ordem invertida/igual → contagem não finita → faixas nominais. As nove entradas degenerativas estão asseridas explicitamente como não-lançantes. O motivo é mecânico e está escrito no módulo: diferente do molde da Phase 34, aqui os limiares **não** são constantes compiladas — vêm de uma tabela de configuração editável sem deploy (D-P42-02), então uma linha apagada ou mal preenchida é estado alcançável em produção, e não pode virar tela de erro para o RH.
- **`diasEmEspera` clampa em 0** para data futura (desvio de relógio) e para data inválida — mesmo idioma de `diasNaEtapa`, sem `NaN` chegando à tela.
- **A recusa do guard ficou distinguível sem a UI adivinhar.** O servidor levanta `42501` para **duas** recusas distintas ("não é RH" e "é o decisor"); só a mensagem separa. `classificarErroRevisao` discrimina por `/decisor/i` e devolve `GUARD_DECISOR` — o único código para o qual a UI-SPEC exige copy própria e **sem retry oferecido**.
- **`FILA_REVISAO_COLUNAS` trava o contrato de projeção** com 11 chaves e três asserções negativas separadas (`justificativa`, `motivo_rejeicao`, `revisao_por_usuario`).
- **O smoke SQL nasceu RED**, com esperado fixo 8, impersonação real de dois RHs distintos e fixture criada+removida.

## Task-by-Task

| # | Tarefa | Commit | Arquivos |
|---|--------|--------|----------|
| 1 | Classificador de faixa total + dias clampados | `a990e99` | `slaRevisao.ts` + teste (24 asserções) |
| 2 | Contrato de erro, allowlist de colunas, contador | `e3f837e` | `revisaoService.ts` + teste (25 asserções) |
| 3 | Espec executável RED do write-path | `25fea1b` | `p42_revisao_art20_smoke.sql` (606 linhas) |

## TDD — os runs RED e GREEN

**Task 1 — RED** (antes de `slaRevisao.ts` existir):
```
Error: Failed to resolve import "../slaRevisao" from
"src/features/revisao/constants/__tests__/slaRevisao.test.ts". Does the file exist?
 Test Files  1 failed (1)
      Tests  no tests
```
**Task 1 — GREEN:** `Test Files 1 passed (1) · Tests 24 passed (24)`

**Task 2 — RED** (antes de `revisaoService.ts` existir):
```
Failed to resolve import "../revisaoService" from
"src/features/revisao/services/__tests__/revisaoService.test.ts"
 Test Files  1 failed (1)
      Tests  no tests
```
**Task 2 — GREEN:** `Test Files 1 passed (1) · Tests 25 passed (25)`

**Task 2 — prova de que o teste morde** (exigida pelo critério de aceitação). Trocando
`if (/decisor/i.test(message))` por `if (true)`:
```
× 42501 + mensagem genérica ("forbidden") → DESCONHECIDO, NÃO GUARD_DECISOR
AssertionError: expected 'GUARD_DECISOR' to be 'DESCONHECIDO'
 Tests  1 failed | 24 passed (25)
```
Revertido o predicado: `Tests 25 passed (25)`. Falha **exatamente** o caso pretendido — o
teste discrimina de fato, não passa por acidente.

## Verification Results

| Verificação | Esperado | Resultado |
|---|---|---|
| `npm run test:run` (suíte inteira) | verde | ✅ 130 arquivos / **1074 testes** passando |
| `npm run -s lint \| grep -c "error TS"` | ≤ 97 | ✅ **97** (baseline inalterada) |
| `p42_revisao_art20_smoke.sql` esperado fixo | `v_esperado int := 8` ×1 | ✅ 1 |
| Etiquetas (a)…(h) no cabeçalho e no corpo | 8 + 8 | ✅ 8 e 8 |
| `SET ROLE authenticated` / `request.jwt.claims` | ≥ 2 / ≥ 2 | ✅ 3 / 4 |
| `SQLERRM LIKE '%decisor%'` | ≥ 1 | ✅ 2 |
| `RESET ROLE` | ≥ 3 | ✅ 13 |
| Incrementos de `smoke42.pass` | exatamente 8 | ✅ 8 |
| `grep -rc "lib/supabase/client" src/features/revisao/` | 0 | ✅ 0 |
| `grep -rc "select('\*')" src/features/revisao/` | 0 | ✅ 0 |
| `grep -c 'export default'` (ambos módulos) | 0 | ✅ 0 |
| `grep -rciE 'prazo legal\|prazo da lei\|prazo LGPD'` | 0 | ✅ 0 |
| `grep -c 'SLA_POR_ETAPA' slaRevisao.ts` | 0 | ✅ 0 |

## Deviations from Plan

### 1. [Rule 3 — Blocker] Commits por tarefa combinam RED e GREEN em vez de dois commits

- **Encontrado em:** Task 1, antes do primeiro commit.
- **Problema:** o plano marca as tarefas 1 e 2 como `tdd="true"`, cujo protocolo padrão cria um commit `test(...)` vermelho e depois um `feat(...)` verde. Medido: com o teste presente e o módulo ainda não, `npm run -s lint | grep -c "error TS"` devolve **98** (o `TS2307` do import inexistente). O plano irmão 42-01, na mesma wave, converteu `.husky/pre-commit` num gate de **não-regressão** contra a baseline 97 — um commit RED isolado registraria 98 e passaria a reprovar o gate para todo mundo a jusante.
- **Correção:** um commit atômico por tarefa (teste + implementação), com o output do run RED registrado neste SUMMARY, que é o que o critério de aceitação do plano de fato exige ("O SUMMARY registra o output do run RED e do run GREEN"). O ciclo RED→GREEN foi executado na ordem correta; só a granularidade do commit mudou.
- **Verificação:** os três commits registram 97; o hook rodou de verdade nos commits 2 e 3 e imprimiu `tsc errors: 97 (frozen baseline: 97)`.

### 2. [Rule 1 — Bug] `.husky/pre-commit` do plano irmão 42-01 entrou no commit `a990e99`

- **Encontrado em:** logo após o commit da Task 1.
- **Problema:** os planos desta wave rodam **no mesmo working tree**, sem isolamento por worktree. O executor do 42-01 tinha `.husky/pre-commit` já **staged** no índice compartilhado quando rodei `git commit`; como o `git commit` consome o índice inteiro, o arquivo do irmão foi arrastado para o meu commit (3 arquivos em vez de 2).
- **Correção tentada e por que foi abandonada:** preparei um `git checkout HEAD~1 -- .husky/pre-commit` + `--amend` para devolver o arquivo ao irmão, protegido por uma assertiva de que `HEAD` ainda era o meu commit. A assertiva **disparou**: o plano 42-02 já havia commitado por cima (`50738c1`). Reescrever histórico atravessando o commit de um irmão, com agentes concorrentes ativos, é destrutivo — abortei em vez de forçar.
- **Estado final:** **nenhum conteúdo foi perdido.** Verifiquei por `diff` que a versão do hook no working tree é byte-idêntica à que o 42-01 escreveu. O defeito é só de *atribuição*: a mudança está no commit `a990e99` (meu) em vez de num commit do 42-01. O hook está funcional — rodou e passou nos meus dois commits seguintes.
- **Prevenção aplicada:** antes dos commits das Tasks 2 e 3 inspecionei `git status --short` e fiz staging explícito por caminho. Ambos saíram limpos (2 e 1 arquivos).

### 3. [Rule 2 — Missing critical] Teardown do smoke também limpa `decisao_final_historico`

- **Encontrado em:** Task 3, ao ler o schema vivo para escrever a fixture.
- **Problema:** o plano especifica remover "a linha da fixture". Mas existe o trigger vivo `trg_decisao_final_snapshot` (`20260709000011:113`), `AFTER UPDATE ON decisao_final`, que arquiva `OLD.*` em `decisao_final_historico` a **cada** UPDATE. As asserções (f) e (h) fazem 4 UPDATEs reais, então o teardown do plano deixaria linhas órfãs de teste numa tabela append-only de PROD.
- **Correção:** o teardown apaga `decisao_final_historico` da candidatura de fixture antes de apagar a linha de `decisao_final`, com verificação final de resto zero.

### 4. [Rule 2 — Missing critical] `P0002` aceito junto de `no_data_found`

- **Problema:** o bloco `<behavior>` só nomeia `no_data_found`, mas o PostgREST pode devolver o SQLSTATE numérico `P0002` para a mesma condição — par já tratado no precedente vivo `explicacaoService.ts:283`.
- **Correção:** `classificarErroRevisao` mapeia `22023`, `no_data_found` **e** `P0002` para `VALIDACAO`.

### 5. [Rule 2 — Missing critical] Papel JWT resolvido pelo mapeamento real em vez de fixado

- **Problema:** o exemplo E4 da RESEARCH fixa `app_metadata.role = 'administrador'` para os dois RHs impersonados. Mas `usuarios_rh.role` **nunca** vale `'rh'` (Pattern 5): o `custom_access_token_hook` mapeia `recrutador → 'rh'`. Fixar `administrador` para o recrutador esconderia essa assimetria e provaria o guard sob um papel que aquele usuário não tem.
- **Correção:** a fixture resolve o papel de cada RH pelo mesmo `CASE` do hook e guarda em `smoke42.decisor_role` / `smoke42.outro_role`.

**Total:** 5 desvios — 1 de granularidade de commit (Rule 3), 1 defeito de concorrência entre agentes (Rule 1), 3 acréscimos de correção (Rule 2). **Impacto:** nenhum sobre o contrato do plano; os desvios 3–5 tornam o smoke mais fiel ao schema e às taxonomias vivas.

## Known Stubs

Nenhum. Os cinco artefatos estão completos para o escopo desta wave. O que **não** existe aqui é escopo negativo declarado pelo plano, não stub: `revisaoService.ts` nasce sem leitores e sem mutation (entram em 42-09 e 42-10), e nenhum componente React foi criado.

## Threat Flags

Nenhuma superfície nova além da já registrada no `<threat_model>` do plano. Este plano não cria endpoint, rota, caminho de auth nem alteração de schema — cria módulos puros e um arquivo `.sql` que **não é executado** nesta wave.

## Issues Encountered

- **Os planos da wave 1 compartilham um único working tree.** Isto produziu o desvio 2 (arquivo de um irmão arrastado para o meu commit pelo índice compartilhado) e é uma armadilha estrutural, não um erro pontual: qualquer `git commit` de qualquer executor consome o índice inteiro, incluindo o que os irmãos deixaram staged. Mitigação usada daqui em diante: `git status --short` antes de commitar e staging explícito por caminho. Vale considerar `use_worktrees` para as waves seguintes desta fase.

## Next Phase Readiness

Pronto para a wave 2. O plano **42-06** é o consumidor direto: `p42_revisao_art20_smoke.sql` é a espec que a migration tem de satisfazer, e deve ser executada pelo **orquestrador** via MCP `execute_sql` numa **única chamada** (o `set_config(..., false)` é escopado à sessão; chamadas separadas zerariam `smoke42.pass` e o RESUMO reprovaria um run que passou).

Antes de rodar, confirmar a pré-condição da fixture: precisa existir uma candidatura de `candidato.funil@teste.com` **sem** linha em `decisao_final` — o smoke levanta exceção alto (nunca SKIP silencioso) se não houver, por desenho.

Os planos **42-09** (leitores da fila) e **42-10** (mutation) estendem `revisaoService.ts` com o cliente Supabase; `FILA_REVISAO_COLUNAS` já é o espelho cliente que o `RETURNS TABLE` do servidor tem de honrar.

## Self-Check: PASSED

- Todos os 5 artefatos declarados existem em disco (verificado com `[ -f ]`).
- Todos os 3 commits existem em `git log` (`a990e99`, `e3f837e`, `25fea1b`).
- Suíte inteira verde (1074 testes) e baseline `tsc` em 97, inalterada.
- Todos os critérios de aceitação das 3 tarefas re-executados e aprovados (tabela acima).
