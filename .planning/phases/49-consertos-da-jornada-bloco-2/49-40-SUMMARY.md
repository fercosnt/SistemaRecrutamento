---
phase: 49-consertos-da-jornada-bloco-2
plan: "40"
subsystem: api
tags: [jorn-41, prompt-injection, injection-flag, sinal-revisao, entrevista, comparativo, texto-do-sistema, rnf-07a, rf-24, mutacao, deno]
status: complete

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "38"
    provides: "CallAiResult.injection_flag, a linha-evento none prompt_injection_flagged e _shared/sinal-revisao.ts (SINAL_INSTRUCAO_AO_MODELO e a tabela das formas persistidas)"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "39"
    provides: "o idioma dos testes pelo callAi REAL com comparação contra a execução sem a frase, e o arnês de mutação mut39.cjs"
provides:
  - "avaliar-transcricao-entrevista: com injection_flag, p_bias_flags ganha { sinal: 'instrucao_ao_modelo' } (elemento do servidor); p_bloqueio_avanco e p_score_metadata inalterados; caminho falhou sem sinal; log com sinal: true|false"
  - "comparativo-candidatos: com injection_flag (não bloqueado, parsed não nulo), ranking = parsed + sinais_revisao: ['instrucao_ao_modelo'], gravado em comparativo_solicitado e devolvido na resposta 200; sem sinal a chave fica AUSENTE; log com sinal: true|false"
  - "prova por teste de que o rawInput do guia (online, presencial, re-prompt) e os 25 blocos oficiais do Big Five são none no detector: as duas EFs ficam só com a linha-evento"
  - "8 testes Deno novos (3 transcrição, 3 comparativo, 1 Big Five, 1 guia)"
affects: [49-41 telas do RH leem bias_flags e ranking.sinais_revisao com sinaisDe/rotuloDoSinal, 49-43 deploy das EFs depois da migration 20260930000001, JORN-41]

actuals:
  tokens: 7612
  tasks: 3
  commits: 5
  plan_head_before: 8abfb980edeb6b779714013ca32af324372c8a4d
  plan_head_after: ee24d1da326b5614904d326d4d37e8b819ba48d2

tech-stack:
  added: []
  patterns:
    - "O sinal vai ao jsonb de sinais que a tabela já tem (bias_flags, ranking), como elemento/chave do SERVIDOR, nunca ao portão de avanço"
    - "Independência de duas marcas provada com as duas presentes: a bandeira do RF-24 dispara, o sinal também, e o bloqueio continua vindo SÓ da bandeira"
    - "Ausência de marca como PROPRIEDADE: texto do sistema passado pelo detector real, com rótulos e rawInput capturados do próprio handler (não de cópias), iteração sobre as chaves da fonte e contagem contra a fonte"

key-files:
  created: []
  modified:
    - supabase/functions/avaliar-transcricao-entrevista/index.ts
    - supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts
    - supabase/functions/comparativo-candidatos/index.ts
    - supabase/functions/comparativo-candidatos/__tests__/index.test.ts
    - supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts
    - supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts

key-decisions:
  - "Transcrição: `biasFlags` passou a ser tipado `Array<Record<string, unknown>>` para aceitar o elemento `{ sinal }` sem cast; o push acontece depois de montar os elementos do modelo e antes da RPC. Nenhuma outra linha da RPC mudou"
  - "Comparativo: `sinalizada = !bloqueado && parsed != null && injection_flag != null`. O bloqueio vence (teste «block vence flag» com as duas frases em candidatos diferentes); `parsed` nulo segue o caminho do 49-08 (INSERT 23502 → 500)"
  - "Big Five: `DIM_LABEL` não é exportado. Os rótulos são capturados do próprio handler pelo caminho da personalização (personalizar: true, IA mockada), em vez de copiados para o teste; o mesmo laço confere que o rawInput entregue é o template oficial"
  - "Guia: a captura é do `content` da mensagem user no SDK (o rawInput mascarado). O teste exige 2 capturas por tipo (1ª passada + re-prompt), não só ≥ 3 no total, para que a prova cubra o extraInstruction nos dois tipos"
  - "Nenhum deploy, nenhum apply, nenhum push; nenhuma escrita nem leitura em PROD (o plano não pediu)"
  - "requirements-completed fica []: JORN-41 não é marcado neste plano (restam 49-41..49-43; quem marca é o verificador)"

requirements-completed: []

coverage:
  - id: D1
    description: "Transcrição com imperativo nu (flag): análise pendente_humano com competências, citações e bias_flags do modelo iguais aos da execução sem a frase, mais { sinal: 'instrucao_ao_modelo' }; p_bloqueio_avanco false e p_score_metadata igual; linha-evento em ai_call_logs"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts#JORN-41 / 49-40 (3 testes)"
        status: pass
      - kind: other
        ref: "arnês mut39.cjs com mut40-t1.json (scratchpad): T1a (sem o acréscimo) e T1b (p_bloqueio_avanco: derived.flag || !!result.injection_flag) exit 1; T1c extra exit 1; sha256 restaurado"
        status: pass
    human_judgment: false
  - id: D2
    description: "Bandeira de língua (RF-24) e sinal independentes: com as duas, p_bloqueio_avanco true, o sinal presente e score_metadata igual ao da execução sem a frase"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts#JORN-41 / 49-40 — bandeira de língua (RF-24) e sinal são independentes"
        status: pass
    human_judgment: false
  - id: D3
    description: "Comparativo sinalizado: ranking do modelo intacto + sinais_revisao no INSERT e na resposta 200; sem sinal a chave fica ausente; block vence flag com o marcador {bloqueado, motivo}"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "supabase/functions/comparativo-candidatos/__tests__/index.test.ts#JORN-41 / 49-40 (3 testes)"
        status: pass
      - kind: other
        ref: "mut40-t2.json: T2a (sem acréscimo), T2b (sinais_revisao: [] sem sinal), T2c e T2d extras, todos exit 1; sha256 restaurado"
        status: pass
    human_judgment: false
  - id: D4
    description: "Texto do sistema é none: 25 blocos oficiais do Big Five e 4 rawInput capturados do guia (online, presencial e os dois re-prompts)"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "deno test --allow-all supabase/functions/gerar-devolutiva-bigfive/ supabase/functions/gerar-guia-entrevista/ → ok | 37 passed | 0 failed"
        status: pass
      - kind: other
        ref: "mut40-t3.json: B1 (template sintético na cópia em memória), B2, B3, G1, G2 exit 1; G1b (frase flag no re-prompt) exit 1 pela classificação; sha256 restaurado"
        status: pass
    human_judgment: false
  - id: D5
    description: "Regressão: _shared (sem strict-schema) + as 7 EFs de IA"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "deno test --allow-all _shared/__tests__ (sem strict-schema) + 7 diretórios de EF → ok | 664 passed | 0 failed"
        status: pass
    human_judgment: false
  - id: D6
    description: "O RH vê a marca da transcrição e do comparativo com o rótulo pt-BR"
    requirement: JORN-41
    verification: []
    human_judgment: true
    rationale: "Este plano só grava. Hoje nenhuma tela renderiza entrevista_analises.bias_flags (o service só o busca) e o ComparativoScreen lê ranking como unknown. A leitura é do 49-41, e a conferência visual é do checkpoint do 49-43"

duration: 7min
completed: 2026-09-30
---

# Phase 49 Plan 40: O sinal (`flag`) chega à análise da entrevista e ao comparativo, e fica provado que guia e devolutiva não precisam dele Summary

**A transcrição com imperativo nu gera a análise normal e grava `{ sinal: 'instrucao_ao_modelo' }` em `bias_flags`, sem tocar `bloqueio_avanco`: a bandeira do RF-24 continua sendo só de língua e sotaque, e as duas marcas são independentes. O comparativo sinalizado grava e devolve o ranking do modelo intacto, acrescido de `sinais_revisao`, e a chave fica ausente quando não há sinal. Para o guia e a devolutiva, o teste prova que a ausência de marca é uma propriedade: os 25 blocos oficiais do Big Five e os 4 `rawInput` capturados do guia classificam como `none`. Todas as mutações do plano e as extras mordem.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-09-30T06:57:16Z
- **Completed:** 2026-09-30T07:04:01Z
- **Tasks:** 3 de 3
- **Files modified:** 6 (0 criados, 6 editados)

## Accomplishments

- **Entrevista (`avaliar-transcricao-entrevista`).** Depois de montar os `bias_flags` do modelo, `result.injection_flag` não nulo acrescenta `{ sinal: SINAL_INSTRUCAO_AO_MODELO }`. `p_status_analise` segue `pendente_humano`, e `p_bloqueio_avanco: derived.flag` e `p_score_metadata` não mudaram. O comentário registra três pontos: por que `bias_flags` e não `bloqueio_avanco`, que o elemento vem do servidor, e que o caminho `falhou` não recebe o sinal. O log redigido ganhou `sinal: true|false`.
- **Comparativo (`comparativo-candidatos`).** `ranking` passa a ser `{ ...parsed, sinais_revisao: [SINAL_INSTRUCAO_AO_MODELO] }` quando o comparativo não foi bloqueado, `parsed` não é nulo e o `callAi` sinalizou. Sem sinal, `parsed` segue como está, sem a chave. O bloqueio mantém o marcador do 49-27. O log ganhou `sinal: true|false`.
- **Guia e devolutiva.** Só testes; nenhuma linha de produção mudou (`git diff 8abfb980..HEAD` não toca nenhum dos dois `index.ts`). Elas ficam só com a linha-evento do 49-38.
- **Testes.** Os seis testes novos de transcrição e comparativo passam pelo `callAi` REAL, com mock só do SDK. Cada um confere que o modelo FOI chamado e que a linha-evento `prompt_injection_flagged` chegou a `ai_call_logs`. Para isso, o mock da transcrição passou a registrar as linhas de log (`logRows`). As duas frases do plano foram classificadas antes como `flag` com o detector real.

## Task Commits

1. **Task 1 (tracer, TDD):**
   - RED `72358096`: test(49-40).
   - GREEN `042c7df3`: feat(49-40).
   - Portão do tracer: modo interativo, `human_verify_mode` ausente (logo `end-of-phase`), verify só com `<automated>`. O verify rodou de novo e deu exit 0, `ok | 31 passed | 0 failed`. Tracer verificado de ponta a ponta, e a expansão seguiu.
2. **Task 2 (TDD):** RED `69c0a8c4` test(49-40), depois GREEN `58a86215` feat(49-40).
3. **Task 3:** `ee24d1da`, test(49-40). Só testes de propriedade, que passam na primeira execução porque descrevem o comportamento de hoje. A mordida deles vem das mutações B1..B3 e G1/G1b/G2.

## RED de cada task (saída real, antes do `feat`)

Os registros foram feitos no scratchpad com `red39.cjs`: `deno test --allow-all --reporter=tap <dir>`, com o trailer TAP derivado das linhas ok/not ok. `check tdd-red-evidence` deu **RED_EVIDENCE_OK** (`target_test_failed`) nas duas tasks de código.

| Task | Resultado | Reprovaram | Mensagem do alvo |
|---|---|---|---|
| 1 | exit 1, 29 ok / 2 not ok | alvo («transcrição com imperativo nu (flag) → análise normal…») e «bandeira de língua (RF-24) e sinal são independentes» | `p_bias_flags tem de conter { sinal: 'instrucao_ao_modelo' }; veio [{competency: "Resolução de conflitos", bias_flags: {...}}, …]`. As asserções anteriores já passavam: modelo chamado, linha-evento gravada, `pendente_humano` |
| 2 | exit 1, 23 ok / 1 not ok | alvo («comparativo com imperativo nu (flag) → ranking do modelo gravado e devolvido com sinais_revisao») | `ranking gravado tem de levar sinais_revisao; veio ["reasoning","ranked_candidates","recommendation","ties_or_concerns","bias_audit"]` |

Os controles («sem a frase», «block vence flag») já passavam no RED, como esperado: eles descrevem o comportamento de hoje, que não pode mudar.

## Mordida por mutação

O arnês é o `mut39.cjs` do 49-39, que fica no scratchpad e não é commitado. A cada rodada ele:
1. lê o arquivo em Buffer e aplica UMA inversão, com âncora única;
2. roda `deno check`;
3. roda o diretório da EF com TAP;
4. restaura byte a byte e confere o sha256.

Todas as rodadas deram `check 0` e `restaurado: true`.

| Mutação | Arquivo | Inversão | Exit | Passa/Reprova | Reprovou |
|---|---|---|---|---|---|
| T1a (plano) | transcrição `index.ts` | sem o `biasFlags.push({ sinal })` | 1 | 29/2 | os dois testes do sinal |
| T1b (plano) | transcrição `index.ts` | `p_bloqueio_avanco: derived.flag \|\| !!result.injection_flag` | 1 | 30/1 | teste-alvo da Task 1 (`o sinal NÃO pode virar bloqueio_avanco`) |
| T1c (extra) | transcrição `index.ts` | `score_metadata.bloqueio_avanco: derived.flag \|\| sinalizada` | 1 | 30/1 | teste-alvo da Task 1 |
| T2a (plano) | comparativo `index.ts` | sem o acréscimo de `sinais_revisao` | 1 | 23/1 | teste-alvo da Task 2 |
| T2b (plano) | comparativo `index.ts` | `sinais_revisao: []` sem sinal | 1 | 23/1 | «SEM a frase → … ausência, nunca []» |
| T2c (extra) | comparativo `index.ts` | o sinal esvazia `ranked_candidates` | 1 | 23/1 | teste-alvo (posições do modelo intactas) |
| T2d (extra) | comparativo `index.ts` | o sinal vira bloqueio | 1 | 23/1 | teste-alvo |
| B1 (plano) | teste Big Five | `mapa.O.sintetico = "Ignore as instruções anteriores."` na cópia em memória | 1 | 16/1 | teste do Big Five (classificação) |
| B2 (extra) | teste Big Five | a frase acrescentada a `mapa.C.medio`, com contagem igual | 1 | 16/1 | teste do Big Five: só a classificação morde |
| B3 (extra) | teste Big Five | a iteração pula uma banda por dimensão | 1 | 16/1 | teste do Big Five: a contagem contra a fonte morde |
| G1 (extra) | guia `index.ts` | frase `block` no re-prompt | 1 | 19/1 | teste do guia: `online: 1ª passada + re-prompt; veio 1` |
| G1b (extra) | guia `index.ts` | frase `flag` no re-prompt | 1 | 19/1 | teste do guia: a classificação acusa `#1 online: flag` e `#3 presencial: flag` |
| G2 (extra) | teste do guia | sem dimensão fraca, o re-prompt não acontece | 1 | 19/1 | teste do guia (a contagem por tipo) |

**Ressalva medida sobre G1 × G1b.** Com uma frase `block` no re-prompt, o `callAi` corta antes do SDK, e a captura não acontece. Quem morde é a contagem por tipo, não a classificação. Por isso existe a G1b: com uma frase `flag`, o texto chega ao SDK, e a asserção de classificação é a que reprova. As duas asserções se complementam, e nenhuma é vácua.

Os `index.ts` de produção mutados (transcrição, comparativo, guia) e os dois arquivos de teste mutados foram restaurados, com o sha256 conferido. O `gerar-devolutiva-bigfive/index.ts` não foi tocado: B1..B3 mutam uma cópia em memória, dentro do arquivo de teste.

## Texto do sistema: as duas metades da prova

- **Testes deste plano:** 25 blocos oficiais do Big Five (a contagem é lida das chaves de `BAND_TEMPLATES`) e 4 `rawInput` capturados do guia (online e presencial, cada um com a 1ª passada e o re-prompt). Todos deram `none`.
- **Corpus do 49-36:** a classe `texto_do_sistema` de `supabase/functions/_shared/__tests__/fixtures/corpus-injecao-prod.json` tem **7 frases** reais de `interview_guide` e `bigfive_devolutiva` em PROD, com teto `none`. Contagem: `"fonte": "texto_do_sistema"` aparece 7 vezes.
- **Nenhum falso positivo encontrado.** Nada foi levado ao 49-37.

## Regressão

- Os verifies do plano deram exit 0: transcrição 31/31, comparativo 24/24, devolutiva + guia 37/37.
- `deno test --allow-all $(find _shared/__tests__ -name '*.test.ts' | grep -v strict-schema)` mais os 7 diretórios de EF de IA deram **`ok | 664 passed | 0 failed`**. São os 656 do 49-39 mais os 8 testes novos.
- A árvore limpa, com escopo nos 6 arquivos de `files_modified` e nos dois `index.ts` que o plano não pode editar, imprimiu **«arquivos do plano commitados e restaurados»**.
- O pre-commit (`tsc errors: 89 (frozen baseline: 96)`) passou nos 5 commits. Nenhum `--no-verify`.

## Verificações feitas fora do plano (só leitura, no repositório)

- **Consumidores de `bias_flags`.** No front, `entrevistaService` busca a coluna (`bias_flags: Record<string, unknown> | null`), e nenhum componente a renderiza. No banco, nenhuma migration nem smoke percorre os elementos: não há `jsonb_array_elements` nem `->>'competency'` sobre `bias_flags`. O elemento `{ sinal }` sem `competency` não quebra nenhum leitor atual.
- **Consumidores de `ranking`.** O `triagemService` tipa `ranking: unknown`, e nenhuma migration ou smoke lê chaves de `ranking`. `sinais_revisao` é uma chave a mais que nenhum leitor atual rejeita.

## Decisions Made

Ver `key-decisions` no frontmatter. Nenhuma decisão do operador foi criada ou atribuída neste plano. A escolha de `bias_flags` em vez de `bloqueio_avanco` é do PLANEJADOR (`<decisions>` do plano).

## Deviations from Plan

None - plan executed exactly as written.

### Notas de execução (não são desvios)

- As mutações T1c, T2c, T2d, B2, B3, G1, G1b e G2, o teste «block vence flag» e as verificações só-leitura acima foram ALÉM do plano. Não mudaram código de produção nem escopo.
- O mock da transcrição ganhou `logRows` para registrar insert e upsert em `ai_call_logs`. É uma mudança só de teste, necessária para asseverar a linha-evento.
- Arquivos de outra janela (`.planning/ui-reviews/.gitignore`, `docs/specs/DRAFT-banco-sjt-marketing.md`, `docs/vagas/`) não foram tocados nem incluídos em commit.

---

**Total deviations:** 0. **Impact on plan:** nenhum.

## TDD Gate Compliance

- Task 1: RED `72358096`, test(49-40), com RED_EVIDENCE_OK. Depois, GREEN `042c7df3`, feat(49-40).
- Task 2: RED `69c0a8c4`, test(49-40), com RED_EVIDENCE_OK. Depois, GREEN `58a86215`, feat(49-40).
- Task 3: `ee24d1da`, test(49-40). São testes de propriedade sobre código que não muda, então não há GREEN. A mordida é provada por B1 (a do plano) e pelas extras.
- REFACTOR: nenhum.

## Issues Encountered

Nenhum.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`. Mitigações cumpridas:
- **T-49-40-01:** `{ sinal }` em `bias_flags`, com a análise sempre `pendente_humano`. Morde com T1a.
- **T-49-40-02:** `bloqueio_avanco` vem só de `derived.flag`. T1b prova que o teste pega o sinal virando trava, e T1c faz o mesmo no `score_metadata`.
- **T-49-40-03:** `ranking.sinais_revisao` gravado e devolvido. Morde com T2a, T2b e T2c.
- **T-49-40-04:** testes das 25 bandas e dos 4 `rawInput` do guia, mais as 7 frases `texto_do_sistema` do corpus.
- **T-49-40-SC:** nenhum pacote instalado.

## User Setup Required

Nenhum.

## Next Phase Readiness

- **49-41:** as telas passam a ler as duas formas novas com `sinaisDe` e `rotuloDoSinal`:
  - `entrevista_analises.bias_flags`, na aba da transcrição (`TranscricaoReviewPanel`, que hoje não renderiza `bias_flags`);
  - `ranking.sinais_revisao`, no `ComparativoScreen` (comparativo e decisão final), que hoje lê `ranking` como `unknown`.
- **49-43:** **nenhuma EF deve ser deployada antes da migration `20260930000001`**. As duas EFs deste plano gravam o sinal, e o `callAi` do disco já grava a linha-evento, que sem a migration conta como erro no cron. A lista de EFs a deployar agora inclui `avaliar-transcricao-entrevista` e `comparativo-candidatos`. O guia e a devolutiva também precisam do deploy para ganhar a linha-evento, porque importam o `ai-client.ts` novo.
- JORN-41 segue «Gaps Found». Quem marca é o verificador.

## Self-Check: PASSED

- FOUND (modificados): os 6 arquivos de `files_modified`.
- FOUND commits: `72358096`, `042c7df3`, `69c0a8c4`, `58a86215`, `ee24d1da`.
- `commits: 5` foi medido por `git rev-list --count 8abfb980..HEAD` antes do commit deste SUMMARY. `plan_head_after` = `ee24d1da326b5614904d326d4d37e8b819ba48d2`.
- Critérios de aceitação:
  - `grep -c 'SINAL_INSTRUCAO_AO_MODELO'` dá ≥ 1 em `avaliar-transcricao-entrevista/index.ts`, e `grep -c 'sinais_revisao'` dá ≥ 1 em `comparativo-candidatos/index.ts`;
  - RED → GREEN nas Tasks 1 e 2;
  - as mutações do plano (T1a, T1b, T2a, T2b, B1) têm exit ≠ 0, com sha256 restaurado;
  - o diff do plano não toca os dois `index.ts` proibidos;
  - o porcelain do escopo está vazio.
