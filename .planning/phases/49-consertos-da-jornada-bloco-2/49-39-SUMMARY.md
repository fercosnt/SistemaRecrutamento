---
phase: 49-consertos-da-jornada-bloco-2
plan: "39"
subsystem: api
tags: [jorn-41, prompt-injection, injection-flag, sinal-revisao, triagem, sjt, redacao-cultural, rnf-07a, mutacao, deno]
status: complete

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "38"
    provides: "CallAiResult.injection_flag, a linha-evento none prompt_injection_flagged e _shared/sinal-revisao.ts (SINAL_INSTRUCAO_AO_MODELO, comSinal, a tabela das formas persistidas)"
provides:
  - "analise-candidato-individual: com injection_flag, SINAL_INSTRUCAO_AO_MODELO entra em analise_candidato_vaga.flags (via comSinal); status 'sucesso' e score_match do modelo inalterados; log com sinal: true|false"
  - "avaliar-redacao: com injection_flag, a linha vai a pendente_humano COM a nota composta e metadata.motivos_revisao ganha instrucao_ao_modelo (quinta causa)"
  - "avaliar-redacao-cultural: com injection_flag, redacoes_candidato.flags ganha instrucao_ao_modelo; scores, cor, status_analise e bloqueio_avanco inalterados; log com sinal: true|false"
  - "6 testes Deno novos (3 alvos + 3 controles), todos pelo callAi REAL com SDK mockado"
affects: [49-40 (outras EFs), 49-41 telas do RH leem estas formas com rotuloDoSinal, 49-43 deploy das EFs depois da migration, JORN-41]

actuals:
  tokens: 5982
  tasks: 3
  commits: 6
  plan_head_before: f9ab3f453ebd4f52d2ce3c2cb2f21a291ceee086
  plan_head_after: 7a958313202c9d765b7564d1abf58c3996128f77

tech-stack:
  added: []
  patterns:
    - "O sinal vai ao campo que a tabela JÁ usa para sinais/motivos de revisão (flags, motivos_revisao), sem coluna nova e sem reuso de flagged_for_human_review"
    - "Teste de «o sinal não muda nada» por COMPARAÇÃO com a execução sem a frase (nota, scores, cor, bloqueio, flags fora o código), não por constante"
    - "Mutações de proibição (X1..X3): além de tirar o sinal, provar que o sinal ZERANDO a nota ou ARMANDO o bloqueio também reprova"

key-files:
  created: []
  modified:
    - supabase/functions/analise-candidato-individual/index.ts
    - supabase/functions/analise-candidato-individual/__tests__/index.test.ts
    - supabase/functions/avaliar-redacao/index.ts
    - supabase/functions/avaliar-redacao/__tests__/index.test.ts
    - supabase/functions/avaliar-redacao-cultural/index.ts
    - supabase/functions/avaliar-redacao-cultural/index.test.ts

key-decisions:
  - "Triagem: o acréscimo usa uma lista nova (flagsFinais = comSinal(flags, …)) em vez de mutar flags, para o código entrar uma vez só mesmo se a lista já o trouxesse"
  - "SJT: `sinalizada` é calculado antes do status e entra nos DOIS lugares (status e motivos_revisao); o código do sinal é empurrado por último, depois das quatro causas de hoje, e a lista segue COMPLETA (nenhuma causa escolhida por precedência)"
  - "Redação cultural: o push acontece depois do anti-plágio e antes do upsert; a deduplicação é a do `new Set` que já existia"
  - "Nenhum deploy, nenhum apply, nenhum push; nenhuma escrita em PROD (nem leitura: o plano não pediu)"
  - "requirements-completed fica []: JORN-41 não é marcado neste plano (instrução do orquestrador; restam 49-40..49-43)"

requirements-completed: []

coverage:
  - id: D1
    description: "Triagem: resposta com imperativo nu (flag) gera análise 'sucesso' com score_match 78 do modelo e instrucao_ao_modelo em flags (uma vez), com a linha-evento em ai_call_logs; sem a frase, nada disso; o caso block em inglês segue em 'falhou'"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "supabase/functions/analise-candidato-individual/__tests__/index.test.ts#JORN-41 / 49-39 (2 testes) + #W4"
        status: pass
      - kind: other
        ref: "arnês mut39.cjs (scratchpad): M1 exit 1 no teste-alvo; X1 (sinal zerando score_match) exit 1; sha256 restaurado"
        status: pass
    human_judgment: false
  - id: D2
    description: "SJT caso aberto: resposta sinalizada gravada com score = composto (≥ 13), status pendente_humano e motivos_revisao = [instrucao_ao_modelo]; sem a frase, sucesso e sem a chave motivos_revisao; candidaturas intocada"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "supabase/functions/avaliar-redacao/__tests__/index.test.ts#JORN-41 / 49-39 (2 testes)"
        status: pass
      - kind: other
        ref: "arnês mut39.cjs: M2a (tirar de motivos_revisao) e M2b (tirar do status) exit 1 cada; X2 (sinal zerando a nota) exit 1; sha256 restaurado"
        status: pass
    human_judgment: false
  - id: D3
    description: "Redação cultural: redação sinalizada, em verde e em vermelho, com nota, scores, cor e bloqueio_avanco IGUAIS aos da execução sem a frase; status_analise pendente_humano; flags = as mesmas + instrucao_ao_modelo"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "supabase/functions/avaliar-redacao-cultural/index.test.ts#JORN-41 / 49-39 (2 testes)"
        status: pass
      - kind: other
        ref: "arnês mut39.cjs: M3 (remover o push) exit 1; X3 (sinal armando bloqueio_avanco) exit 1; sha256 restaurado"
        status: pass
    human_judgment: false
  - id: D4
    description: "Regressão: _shared (sem strict-schema) + as 7 EFs de IA"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "deno test --allow-all _shared/__tests__ (sem strict-schema) + 7 diretórios de EF → ok | 656 passed | 0 failed"
        status: pass
    human_judgment: false
  - id: D5
    description: "O RH vê o sinal com o rótulo pt-BR nas telas (triagem, hub, revisão da redação, card da SJT)"
    requirement: JORN-41
    verification: []
    human_judgment: true
    rationale: "Este plano só grava. Até o 49-41, as telas mostram o CÓDIGO cru (instrucao_ao_modelo) em «Sinais de atenção» e nos badges da triagem; o painel da redação nem renderiza flags. A leitura é do 49-41, e a conferência visual é do checkpoint do 49-43"

duration: 7min
completed: 2026-09-30
---

# Phase 49 Plan 39: O sinal (`flag`) chega ao resultado que o RH revisa, nas três EFs de texto do candidato Summary

**Na triagem, na SJT caso aberto e na redação cultural, uma entrada com imperativo nu é avaliada normalmente. O código `instrucao_ao_modelo` é gravado no campo que cada tabela já usa para sinais de revisão: `analise_candidato_vaga.flags`, `scores_candidato.metadata.motivos_revisao` (com a linha em `pendente_humano` e a nota composta gravada) e `redacoes_candidato.flags`. Nenhuma nota, cor, recomendação ou `bloqueio_avanco` muda por causa do sinal. As quatro mutações do plano e as três extras de proibição mordem.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-09-30T06:47:23Z
- **Completed:** 2026-09-30T06:54:19Z
- **Tasks:** 3 de 3
- **Files modified:** 6 (0 criados, 6 editados)

## Accomplishments

- **Triagem (`analise-candidato-individual`).** As duas guardas de hoje ficaram intactas: sem resultado, e `block`/`flagged_for_human_review`, que lançam e vão a `falhou`. Depois delas, `result.injection_flag` não nulo acrescenta `SINAL_INSTRUCAO_AO_MODELO` por `comSinal`. O upsert grava `flags: flagsFinais`, e `status: 'sucesso'` e `score_match` continuam sendo os do modelo. O log redigido ganhou `sinal: true|false`.
- **SJT (`avaliar-redacao`).** `sinalizada` entra no cálculo de `status`, que vira `pendente_humano`, e empurra o código em `motivosRevisao`. Essa é a quinta causa. O comentário da lista agora explica que ela pede outro conserto: «a nota VALE, mas o texto precisa ser lido». `score: composite` continua gravado. O caminho `block`/sem resultado não mudou.
- **Redação cultural (`avaliar-redacao-cultural`).** O `flags.push(SINAL_INSTRUCAO_AO_MODELO)` vem depois do anti-plágio e antes do upsert, e o `new Set` que já existia deduplica. `gravarParaRevisaoHumana`, scores, cor, `status_analise` e `bloqueio_avanco` ficaram como estavam. O log ganhou `sinal: true|false`.
- **Testes.** Os seis testes novos passam a entrada pelo `callAi` REAL, com mock só do SDK. Cada um confere que o modelo FOI chamado e que a linha-evento `prompt_injection_flagged` chegou a `ai_call_logs`. As três frases do plano foram classificadas antes como `flag`, e a inglesa do W4 como `block`, com o `classifyPromptInjection` real.

## Task Commits

1. **Task 1 (tracer, TDD):**
   - RED `307e759b`: test(49-39).
   - GREEN `87b40234`: feat(49-39).
   - Portão do tracer: modo interativo, `human_verify_mode` ausente, logo `end-of-phase`, e verify só com `<automated>`. O verify rodou de novo e deu exit 0, `ok | 20 passed | 0 failed`. ⚡ Tracer verificado de ponta a ponta, e a expansão seguiu.
2. **Task 2 (TDD):** RED `6c70cb69` test(49-39), depois GREEN `9890ad9f` feat(49-39).
3. **Task 3 (TDD):** RED `dbb94ea3` test(49-39), depois GREEN `7a958313` feat(49-39).

## RED de cada task (saída real, antes do `feat`)

Registro no scratchpad (`red39.cjs`): `deno test --allow-all --reporter=tap <dir>`, com o trailer TAP derivado das linhas ok/not ok. `check tdd-red-evidence` deu **RED_EVIDENCE_OK** (`target_test_failed`) nas três tasks.

| Task | Resultado | Teste-alvo (o único que reprovou) | Mensagem |
|---|---|---|---|
| 1 | exit 1, 19 ok / 1 not ok | `JORN-41 / 49-39 — resposta com imperativo nu (flag) → análise 'sucesso' com a nota do modelo e o sinal em flags` | `flags tem de conter 'instrucao_ao_modelo' …; veio ["cv_nao_extraido","vaga_sem_rubrica_deliberada"]`. As asserções anteriores já passavam: modelo chamado, nenhuma `falhou`, `sucesso` e 78 |
| 2 | exit 1, 26 ok / 1 not ok | `JORN-41 / 49-39 — SJT com imperativo nu (flag): nota composta gravada, pendente_humano e o sinal em motivos_revisao` | `resposta sinalizada vai para a revisão humana`: veio `sucesso`, esperado `pendente_humano`. O score já era numérico e ≥ 13 |
| 3 | exit 1, 36 ok / 1 not ok | `JORN-41 / 49-39 — redação com imperativo nu (flag): scores e cor da IA, o sinal em flags, bloqueio só pela cor` | `verde: flags tem de conter 'instrucao_ao_modelo'; veio ["tempo_anormalmente_curto"]`. Nota, scores, cor e bloqueio já batiam com a execução sem a frase |

Os três controles («a mesma entrada SEM a frase») já passavam no RED, e é o esperado: eles descrevem o comportamento de hoje, que não pode mudar.

## Mordida por mutação

O arnês `mut39.cjs` fica no scratchpad e não é commitado. Ele segue o idioma do mut38:
1. lê o arquivo em Buffer e aplica UMA inversão, com âncora única;
2. roda `deno check`;
3. roda o diretório da EF com TAP;
4. restaura byte a byte e confere o sha256 a cada rodada.

Todas as rodadas passaram no `deno check` (exit 0) e terminaram com `restaurado: true`.

| Mutação | Inversão | Exit | Passa/Reprova | Reprovou | sha256 depois |
|---|---|---|---|---|---|
| M1 (plano) | triagem: `flagsFinais = flags` (sem o acréscimo) | 1 | 19/1 | teste-alvo da Task 1 | `4795b598…` = antes |
| M2a (plano) | SJT: remover o push em `motivosRevisao` | 1 | 26/1 | teste-alvo da Task 2 | `3cf95b0e…` = antes |
| M2b (plano) | SJT: tirar `sinalizada` do cálculo de `status` | 1 | 26/1 | teste-alvo da Task 2 | `3cf95b0e…` = antes |
| M3 (plano) | cultural: remover o `flags.push` | 1 | 36/1 | teste-alvo da Task 3 | `cec1e682…` = antes |
| X1 (extra) | triagem: `score_match: sinalizada ? null : …` | 1 | 19/1 | teste-alvo da Task 1 | restaurado |
| X2 (extra) | SJT: `score: sinalizada ? null : composite` | 1 | 26/1 | teste-alvo da Task 2 | restaurado |
| X3 (extra) | cultural: `bloqueio_avanco: … \|\| sinalizada` | 1 | 36/1 | teste-alvo da Task 3 | restaurado |

As extras X1..X3 não estavam no plano. Elas provam a proibição RNF-07a do frontmatter («MUST NOT mudar nota, cor, recomendação ou `bloqueio_avanco` por causa do sinal»): se o sinal virar decisão, os testes reprovam. As asserções de «nada muda» também mordem, e não só as de «o código está lá».

## Regressão

- Os três verifies do plano, cada um com exit 0: triagem 20/20, SJT 27/27, cultural 37/37.
- `deno test --allow-all $(find _shared/__tests__ -name '*.test.ts' | grep -v strict-schema)` mais os 7 diretórios de EF de IA deram **`ok | 656 passed | 0 failed`**. São os 650 do 49-38 mais os 6 novos.
- A árvore limpa, com escopo no `files_modified`, imprimiu **«arquivos do plano commitados e restaurados»**.
- O pre-commit (`tsc errors: 89 (frozen baseline: 96)`) passou nos 6 commits. Nenhum `--no-verify`.

## Verificações feitas fora do plano (só leitura)

- **CHECK no banco sobre os valores de `flags`.** Não existe. `redacoes_candidato.flags` é `text[] NOT NULL DEFAULT ARRAY[]::text[]`, e a varredura de `supabase/migrations` não achou constraint sobre o vocabulário. O upsert com o código novo não seria recusado.
- **Motor de exclusão.** A migration `20260923000002_p49_motor_desidentifica_analises` deixa `flags` intacto porque o mediu como «vocabulário fechado de dois valores» de dado de SISTEMA. `instrucao_ao_modelo` é um código do servidor, não texto do titular, então a premissa que justificava preservar a coluna continua valendo. A contagem «dois valores» daquela nota é uma fotografia, e passa a ter três valores quando o 49-43 deployar. Nenhum portão lê essa contagem: `p45_motor_exclusao_smoke.sql` compara `ARRAY['cv_nao_extraido']` com a linha sintética que ELE MESMO insere, o que é baseline da própria execução, não vocabulário vivo.
- **Consumidores no front.** `AnaliseIABlock` («Sinais de atenção») e `TriagemTable` mostram `flags` cru, e estão no escopo do 49-41. O `RedacaoReviewPanel` hoje não mostra `flags` e também está no 49-41. O `ComparativoScreen` também tem uma linha «Flags», mas as duas páginas que o usam passam `flags: []` fixo (`ComparativoCandidatosPage.tsx:111`, `DecisaoFinalPage.tsx:100`), então ele não lê este campo. O sinal do comparativo é `ranking.sinais_revisao`, do 49-40.

## Decisions Made

Ver `key-decisions` no frontmatter. Nenhuma decisão do operador foi criada ou atribuída neste plano. A escolha de mandar a SJT sinalizada para `pendente_humano` é do PLANEJADOR, e está registrada no `<decisions>` do plano.

## Deviations from Plan

None - plan executed exactly as written.

### Notas de execução (não são desvios)

- As mutações X1..X3 e as três verificações só-leitura acima foram ALÉM do plano. Não mudaram código nem escopo.
- Os textos de fixture seguem o plano. Na triagem, a frase vai numa resposta (`respostas_formulario`), e não no CV, porque o mock de storage devolve um PDF falso sem texto extraível. O `rawInput` é o mesmo bloco (`## CV` + `## Respostas Etapa 1`), e o `callAi` classifica o texto inteiro.
- Arquivos de outra janela (`.planning/ui-reviews/.gitignore`, `docs/specs/DRAFT-banco-sjt-marketing.md`, `docs/vagas/`) não foram tocados nem incluídos em commit.

---

**Total deviations:** 0. **Impact on plan:** nenhum.

## TDD Gate Compliance

- Task 1: RED `307e759b`, test(49-39), com RED_EVIDENCE_OK. Depois, GREEN `87b40234`, feat(49-39).
- Task 2: RED `6c70cb69`, test(49-39), com RED_EVIDENCE_OK. Depois, GREEN `9890ad9f`, feat(49-39).
- Task 3: RED `dbb94ea3`, test(49-39), com RED_EVIDENCE_OK. Depois, GREEN `7a958313`, feat(49-39).
- REFACTOR: nenhum.

## Issues Encountered

Nenhum.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`. Mitigações cumpridas:
- **T-49-39-01:** o sinal é gravado no campo de sinais/motivos de cada tabela, a SJT vai a `pendente_humano`, e há mutação por EF (M1, M2a/M2b, M3).
- **T-49-39-02:** proibição RNF-07a. Os testes comparam nota, scores, cor e `bloqueio_avanco` com a execução sem a frase e conferem que `candidaturas` não é tocada. X1..X3 provam a mordida.
- **T-49-39-03 (accept):** `flags` entra na exportação do titular, com o mesmo precedente de `possivel_plagio_intercandidato`. Nada mudou aqui.
- **T-49-39-SC:** nenhum pacote instalado.

## User Setup Required

Nenhum.

## Next Phase Readiness

- **49-40:** as outras EFs (entrevista, comparativo e as duas de texto do sistema), nas formas de `_shared/sinal-revisao.ts`.
- **49-41:** as telas leem estas três formas com `sinaisDe` e `rotuloDoSinal`:
  - `AnaliseIABlock` e `TriagemTable` leem `analise_candidato_vaga.flags`;
  - `RedacaoReviewPanel` lê `redacoes_candidato.flags`, que hoje ele nem renderiza;
  - `ScorecardAvaliacao` lê `metadata.motivos_revisao`.
  Até lá, o RH veria o código cru. Isso não acontece antes do 49-43, porque nada foi deployado.
- **49-43:** **nenhuma EF deve ser deployada antes da migration `20260930000001`**. Estas três EFs gravam o sinal, e o `callAi` do disco já grava a linha-evento, que sem a migration conta como erro no cron.
- JORN-41 segue «Gaps Found». Quem marca é o verificador.

## Self-Check: PASSED

- FOUND (modificados): os 6 arquivos de `files_modified`.
- FOUND commits: `307e759b`, `87b40234`, `6c70cb69`, `9890ad9f`, `dbb94ea3`, `7a958313`.
- `commits: 6` foi medido por `git rev-list --count f9ab3f45..HEAD` antes do commit deste SUMMARY. `plan_head_after` = `7a958313202c9d765b7564d1abf58c3996128f77`.
- Critérios de aceitação: `grep -c 'SINAL_INSTRUCAO_AO_MODELO'` dá 2 em cada um dos três `index.ts` (import e uso), ou seja, ≥ 1 em todos. RED → GREEN nas três tasks. M1, M2a, M2b e M3 com exit ≠ 0 e sha256 restaurado. Porcelain do escopo vazio.
