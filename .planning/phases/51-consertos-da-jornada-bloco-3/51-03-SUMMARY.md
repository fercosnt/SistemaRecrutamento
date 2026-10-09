---
phase: 51-consertos-da-jornada-bloco-3
plan: 03
subsystem: ui
tags: [react, vitest, rh, hub, d-15, d-16, jorn-48, testes_aplicaveis]

requires:
  - phase: 51-02
    provides: "AvaliacoesRespondidasBloco («Ver respostas») no hub; origin/main == HEAD no mesmo checkout"
  - phase: 51-01
    provides: "telas do candidato renomeadas (Prova cognitiva / Raciocínio lógico (Matrizes)); p50_enumera.cjs no molde do push"
provides:
  - "HubSection com 4º estado `nao_se_aplica` («Não se aplica a esta vaga», marcador `hub-secao-nao-se-aplica`)"
  - "instrumentosDaVaga({aplica_cognitivo, testes_aplicaveis}) → {assincrona, redacao, cognitivo} em aplica | nao_aplica | desconhecido"
  - "EntrevistaContextoRow.testes_aplicaveis (cru; undefined = vaga não carregada)"
  - "Nomes D-15 nas superfícies do RH: «Prova cognitiva» (textual) e «Raciocínio lógico (Matrizes)» (Raven)"
affects: [51-04, 51-07, JORN-48, verify-work-51]

actuals:
  tokens: 12244
  tasks: 3
  commits: 5
plan_head_before: cca992432295e0502996788ab9828bd538957f4b
plan_head_after: d5e2e8b960117d28b4a96206d163fdc6788e4fd2

tech-stack:
  added: []
  patterns:
    - "Aplicabilidade em três valores (aplica | nao_aplica | desconhecido): a tela só afirma ausência com evidência positiva"
    - "Estado de seção de instrumento calculado uma vez e reusado na seção e na montagem do bloco irmão"
    - "RED de módulo novo por import dinâmico com especificador em variável + catch — falha de asserção, não de coleta"

key-files:
  created:
    - src/features/hub-candidato/lib/instrumentosDaVaga.ts
    - src/features/hub-candidato/lib/__tests__/instrumentosDaVaga.test.ts
  modified:
    - src/features/hub-candidato/components/HubSection.tsx
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
    - src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx
    - src/features/entrevista/services/entrevistaService.ts
    - src/features/entrevista/components/CognitivoBandCard.tsx
    - src/features/decisao/components/ConsolidacaoDashboard.tsx
    - src/features/config-vaga/components/PesosSliders.tsx
    - src/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock.tsx
    - src/components/ScoreCard.tsx

key-decisions:
  - "Entradas atuais que não são do candidato (triagem, entrevista, cognitivo) contam como RECONHECIDAS para o `nao_aplica`: são ids de TEMPLATE_TESTES e sabidamente não são nem assíncrona nem redação. Sem isso, toda vaga criada pelo seletor de template ficaria `desconhecido`"
  - "A presença da entrada decide `aplica`, não o `obrigatorio` dela: é a mesma regra do `deriveCards` do candidato (que mostra o card de redação para toda vaga de template, obrigatória ou não)"
  - "`nao_se_aplica` vai pelo slot de CONTEÚDO do AsyncState, e não pelo slot vazio, para levar o marcador e para carregando/erro continuarem com precedência"
  - "O «Ver respostas» só some quando a seção MOSTRA «Não se aplica»: com a leitura da avaliação carregando ou com erro, o bloco continua montado (uma leitura que falhou não apaga o caminho)"
  - "`EntrevistaContextoRow.testes_aplicaveis` é opcional (`?: unknown`) e cru: sem embed = undefined, com embed = valor da coluna (null incluído). Nunca `?? []`"

patterns-established:
  - "Import dinâmico com `/* @vite-ignore */` e especificador em variável para o RED de um módulo que ainda não existe"

requirements-completed: [JORN-48]

coverage:
  - id: D1
    description: "HubSection: 4º estado `nao_se_aplica` com «Não se aplica a esta vaga», marcador `hub-secao-nao-se-aplica`, sem filhos, sem «Concluído»/«Sem dados»; carregando/erro com precedência"
    requirement: JORN-48
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx#HubSection — 4º estado «Não se aplica a esta vaga» (51-03 / D-16)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Hub: seção textual se chama «Prova cognitiva» (não mais «Avaliação Cognitiva»); com_dados fala da prova cognitiva"
    requirement: JORN-48
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx#a seção do instrumento textual se chama «Prova cognitiva», não mais «Avaliação Cognitiva»"
        status: pass
    human_judgment: false
  - id: D3
    description: "instrumentosDaVaga: evidência positiva nas duas convenções; vaga não carregada = desconhecido; antiga não prova ausência; null/[]/objeto/não reconhecido = desconhecido"
    requirement: JORN-48
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/lib/__tests__/instrumentosDaVaga.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Hub: Avaliação Assíncrona / Prova cognitiva / Redação em «Não se aplica» só com nao_aplica E sem linha; o dado vence; «Ver respostas» não monta só sob «Não se aplica»; atalho IN-04 sempre"
    requirement: JORN-48
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx#HubCandidatoRH — «Não se aplica» só com evidência positiva, e nunca por cima de dado (51-03 / D-16)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Nomes D-15 nas superfícies do RH (CognitivoBandCard, ConsolidacaoDashboard, PesosSliders, LiberacaoCognitivoBlock, ScoreCard, mensagem do entrevistaService)"
    requirement: JORN-48
    verification:
      - kind: other
        ref: "grep das acceptance_criteria da Task 3 (Prova cognitiva ≥1 em 3 arquivos; Raciocínio lógico (Matrizes) ≥1 em 2 arquivos) + vitest das features tocadas (75 arquivos, 653 testes verdes)"
        status: pass
    human_judgment: true
    rationale: "Nenhum teste fixa os rótulos novos dessas cinco superfícies (nenhum fixava os antigos). O guarda por forma sobre `src/` inteiro é do 51-04; até lá a conferência é visual/grep"
  - id: D6
    description: "Publicação: marcador `hub-secao-nao-se-aplica` em chunk lazy no build e em PROD; origin/main == HEAD"
    requirement: JORN-48
    verification:
      - kind: other
        ref: "crawler PROD: hub-secao-nao-se-aplica em /assets/PerfilCandidatoRHPage-BbItGj5Z.js (chunk lazy) de https://rh.beautysmile.com.br"
        status: pass
    human_judgment: false
  - id: D7
    description: "Conferência no navegador (D-28): leitura das seções no hub real e da célula «Matrizes» no card da lista"
    requirement: JORN-48
    verification: []
    human_judgment: true
    rationale: "Layout e leitura em sessão de RH real não são assertáveis por teste unitário"

duration: 12min
completed: 2026-10-09
status: complete
---

# Phase 51 Plan 03: «Prova cognitiva» ≠ «Raciocínio lógico (Matrizes)» e «Não se aplica a esta vaga» no hub do RH (JORN-48) Summary

**No hub do RH, o instrumento textual agora se chama «Prova cognitiva» e o Raven «Raciocínio lógico (Matrizes)». Antes, o RH via dois nomes genéricos na mesma tela. A seção de um instrumento que a vaga não aplica diz «Não se aplica a esta vaga», mas só quando a configuração da vaga prova isso (`instrumentosDaVaga`, três valores) e a seção não tem dado. Banda, decisão, pesos, liberação do Raven e o card da lista usam os nomes novos. Publicado e servido em PROD no chunk lazy `PerfilCandidatoRHPage-BbItGj5Z.js`.**

## Performance

- **Duration:** ~12 min (2026-10-09T03:16Z → 03:28Z)
- **Tasks:** 3 (5 commits: RED + GREEN nas duas tasks TDD, 1 na Task 3)
- **Files modified:** 11 (2 criados, 9 editados)
- **tsc (D-53):** baseline medida = **89**; 89 ao fim de cada task (teto 90).

## Accomplishments

- **`HubSection`:** novo estado `nao_se_aplica`, com `COPY.nao_se_aplica` («Não se aplica a esta vaga» / «Esta vaga não inclui este instrumento.») e `data-testid="hub-secao-nao-se-aplica"`. Não mostra filhos e não contém «Concluído» nem «Sem dados». Carregando e erro continuam vencendo o estado.
- **`instrumentosDaVaga`** (novo, função pura): `nao_aplica` só sai com as três condições juntas:
  - o array não é vazio;
  - todas as entradas são da convenção atual (`teste` ∈ `TEMPLATE_TESTES`);
  - nenhuma entrada mapeia para o instrumento, segundo `CANDIDATE_FACING` + `templateTesteToContainerCards`.

  A convenção antiga (`{tipo:'sjt'}` / `{teste:'sjt'}`) prova presença, nunca ausência. O cognitivo segue `aplica_cognitivo`, mas só quando a vaga foi carregada (`testes_aplicaveis !== undefined`).
- **`getEntrevistaContexto`:** o embed de `vagas` agora inclui `testes_aplicaveis`, que chega cru. Sem embed, o valor é `undefined`.
- **Hub:** «Avaliação Assíncrona», «Prova cognitiva» e «Redação» usam `estadoDoInstrumento`. Ele devolve `nao_se_aplica` só quando o valor é `nao_aplica` E a seção não tem linha. Se houver dado, o dado vence.
  - O estado da assíncrona é calculado uma vez e serve tanto à seção quanto à condição do «Ver respostas».
  - O «Ver respostas» deixa de montar só quando a seção mostra «Não se aplica». O atalho IN-04 da Redação continua sempre.
- **Mensagem de rejeição** (`entrevistaService`): agora diz «… com base na prova cognitiva.».

### Tabela «sítio · antes · depois» (D-15)

| Sítio | Antes | Depois |
|---|---|---|
| `HubCandidatoRH.tsx`, título da seção textual | «Avaliação Cognitiva» | «Prova cognitiva» |
| `HubCandidatoRH.tsx`, texto de `com_dados` | «Banda cognitiva contextual registrada — …» | «Banda da prova cognitiva registrada — disponível no workspace de entrevista.» |
| `entrevistaService.ts` ~1026 | «… ao rejeitar com base no raciocínio lógico.» | «… ao rejeitar com base na prova cognitiva.» |
| `CognitivoBandCard.tsx`, título | «Raciocínio lógico» | «Prova cognitiva» |
| `CognitivoBandCard.tsx`, descrição | «Sinaliza raciocínio lógico — não decide a etapa. …» | «Sinaliza a prova cognitiva — não decide a etapa. …» |
| `CognitivoBandCard.tsx`, título do diálogo | «Registrar ressalva sobre o raciocínio lógico?» | «Registrar ressalva sobre a prova cognitiva?» |
| `CognitivoBandCard.tsx`, rótulo da justificativa | «(… sobre o raciocínio lógico)» | «(… sobre a prova cognitiva)» |
| `CognitivoBandCard.tsx`, placeholder | «Explique a ressalva sobre o raciocínio lógico. …» | «Explique a ressalva sobre a prova cognitiva. …» |
| `ConsolidacaoDashboard.tsx` `ETAPA_LABEL.cognitivo` | «Cognitivo» | «Prova cognitiva» |
| `PesosSliders.tsx` `CONTEXT_CHIPS` | «Cognitivo» | «Prova cognitiva» |
| `LiberacaoCognitivoBlock.tsx`, título do bloco | «Avaliação de raciocínio» | «Raciocínio lógico (Matrizes)» |
| `ScoreCard.tsx`, célula do Raven | «Intel» | «Matrizes», com `title="Raciocínio lógico (Matrizes)"` |

As chaves técnicas não mudaram: `cognitivo`, `tipo='cognitivo'`, `aplica_cognitivo`, eventos e testids.

## Task Commits

1. **Task 1 (tracer):** RED `20efbf4d` (test) · GREEN `0dd65683` (feat). Gate do tracer: modo interativo, `end-of-phase`, `<verify>` só automatizado. Depois do commit o verify rodou de novo (11 arquivos, 113 testes verdes; tsc 89) e a execução seguiu.
2. **Task 2:** RED `50808f1b` (test) · GREEN `4e5d4054` (feat)
3. **Task 3:** `d5e2e8b9` (fix)

### TDD — evidência RED

- **Task 1:** `RED_EVIDENCE_OK` (`target_test_failed`) no alvo «nao_se_aplica diz «Não se aplica a esta vaga»». Registro em `.red-51-03/task1.json`. Esperado: a cópia nova. Obtido: `textContent = 'Prova cognitiva'`, porque o estado desconhecido cai em children vazios.
  - No arquivo inteiro, 6 falharam por asserção e 5 passaram: os 3 do 17-01 e 2 de não-regressão do estado novo.
- **Task 2 (helper):** `RED_EVIDENCE_OK` no alvo «é exportada como função». Registro em `.red-51-03/task2-helper.json`. Os 16 casos falharam por asserção.
  - A 1ª versão importava `'../instrumentosDaVaga'` como literal, e o `vite:import-analysis` reprovou a **coleta** do arquivo. Isso seria INVALID_RED. Troquei por um especificador em variável com `/* @vite-ignore */` antes do commit RED.
- **Task 2 (hub):** `RED_EVIDENCE_OK` no alvo «assíncrona nao_aplica e SEM linha …». Registro em `.red-51-03/task2-hub.json`. 4 casos falharam por asserção:
  - assíncrona e redação sem «Não se aplica»;
  - vaga não carregada ainda virava «Não se aplica» pela regra direta da Task 1;
  - banda registrada ficava escondida pela regra direta.

  2 passaram já no RED por serem de não-regressão: com linha, o estado de hoje; erro de leitura vence.
- **Mordida:** os RED acima são a prova de que os testes novos reprovam a base. Eles rodaram contra o código anterior a cada GREEN (`refs/gsd/51-03/base` = `cca99243`). O caso de 17-01 que proíbe «Concluído» em vazio não foi tocado e continua verde.

## Publicação (D-52)

- `npm run build` ok e `assert-chunks PASSED`. O `hub-secao-nao-se-aplica` está em **`build/assets/PerfilCandidatoRHPage-BbItGj5Z.js`**, chunk lazy de `/rh/*`. «Raciocínio lógico (Matrizes)» aparece também em `CandidatosRHPage-*` (ScoreCard) e no `index-*`.
- Push por sha, num comando só, com a árvore limpa nos caminhos de código: `99ba6bf2..d5e2e8b9 -> main`, sem force. Enumeração do `scripts/p50_enumera.cjs`:

```
e567e589 planning docs(51-02): complete Ver respostas no hub plan — SUMMARY, evidencia RED, mordida, publicacao
cca99243 planning docs(51-02): STATE/ROADMAP — 51-02 concluido, 2/17 (...)
20efbf4d codigo test(51-03): RED — estado Nao se aplica a esta vaga no HubSection e secao Prova cognitiva no hub
0dd65683 codigo feat(51-03): tracer — secao Prova cognitiva no hub com estado Nao se aplica a esta vaga
50808f1b codigo test(51-03): RED — aplicabilidade por evidencia positiva (instrumentosDaVaga) e Nao se aplica no hub sem cobrir dado
4e5d4054 codigo feat(51-03): aplicabilidade do instrumento por evidencia positiva no hub (testes_aplicaveis + aplica_cognitivo)
d5e2e8b9 codigo fix(51-03): nomes do D-15 nas superficies do RH — Prova cognitiva e Raciocinio logico (Matrizes)
enumeracao ok: 7 commit(s) em 99ba6bf2..d5e2e8b9
```

- Depois do push, `git ls-remote origin refs/heads/main` == HEAD e `git log --oneline origin/main..HEAD` ficou **vazio**. O crawler deu AUSENTE na 1ª tentativa (Vercel ainda publicando). Na 2ª, 2 min depois: `PRESENTE em PROD, chunk lazy: hub-secao-nao-se-aplica ["/assets/PerfilCandidatoRHPage-BbItGj5Z.js"]`, o mesmo hash do build local.
- **Nenhuma escrita em banco, EF ou migration.** As únicas consultas a PROD foram leituras (`p46apply.cjs sql`, só SELECT):
  - `has_column_privilege('authenticated','public.vagas','testes_aplicaveis','SELECT') = true`. A coluna nova no select não derruba o contexto do hub. Um REVOKE de coluna faria o hub inteiro cair em «Candidatura não encontrada».
  - Censo das 15 vagas: todas com `aplica_cognitivo = false`. 11 têm `testes_aplicaveis = []` (assíncrona e redação ficam `desconhecido`, ou seja, o estado de hoje). 3 têm a forma completa de `baseTestes` (tudo `aplica`). 1 (`a32fe930…`, 3 candidaturas) tem só `[work_sample_sjt]`, então a redação vira «Não se aplica» quando não houver redação do candidato.
  - **Efeito visível:** como todas as vagas de PROD têm `aplica_cognitivo = false`, a seção «Prova cognitiva» passa a dizer «Não se aplica a esta vaga» em todo candidato sem banda registrada.

## Files Created/Modified

- `src/features/hub-candidato/lib/instrumentosDaVaga.ts`: helper novo (`Aplicabilidade`, `ConfiguracaoDaVaga`, `InstrumentosDaVaga`).
- `src/features/hub-candidato/lib/__tests__/instrumentosDaVaga.test.ts`: 16 casos.
- `src/features/hub-candidato/components/HubSection.tsx`: estado `nao_se_aplica`.
- `src/features/hub-candidato/components/HubCandidatoRH.tsx`: `estadoDoInstrumento`, `aplic`, título «Prova cognitiva», condição do «Ver respostas», comentários D-15/D-16.
- `src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx`: mocks do hub inteiro e 14 casos novos (4 do HubSection, 4 + 6 do hub). O caso que proíbe «Concluído» ficou.
- `src/features/entrevista/services/entrevistaService.ts`: `testes_aplicaveis` no select, no tipo e na montagem; mensagem D-15.
- `CognitivoBandCard.tsx`, `ConsolidacaoDashboard.tsx`, `PesosSliders.tsx`, `LiberacaoCognitivoBlock.tsx`, `ScoreCard.tsx`: trocas de texto da tabela acima.

## Decisions Made

As escolhas do planejador (1–3) foram seguidas. As decisões de execução estão em `key-decisions`. A que mais muda o que o RH vê é que uma entrada `triagem`/`entrevista`/`cognitivo` conta como reconhecida. Sem isso, nenhuma vaga de template jamais chegaria a `nao_aplica`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - teste] O RED do helper falhava na coleta, não na asserção**
- **Found during:** Task 2, no RED
- **Issue:** com `import('../instrumentosDaVaga')` literal, o Vite tenta resolver o módulo na transformação, e o arquivo de teste inteiro falhava com «Failed to resolve import» e zero testes. Seria INVALID_RED.
- **Fix:** especificador em variável com `/* @vite-ignore */` e `catch`. Os 16 casos passaram a falhar por asserção. Feito antes do commit RED.
- **Committed in:** `50808f1b`

**2. [Rule 2 - correção] O «Ver respostas» não some por uma leitura que falhou**
- **Found during:** Task 2
- **Issue:** a regra literal do plano («não monta quando a seção resolveu para `nao_se_aplica`») tirava o bloco da tela também com a leitura da avaliação carregando ou com erro. Nesses casos a seção mostra skeleton ou erro, e não sabemos se há linha.
- **Fix:** `assincronaNaoSeAplica = estadoAssincrona === 'nao_se_aplica' && !isLoading && !isError`. É o que a seção de fato mostra, pela precedência do AsyncState. O estado continua calculado uma vez só. Há caso de teste para o erro.
- **Committed in:** `4e5d4054` (teste em `50808f1b`)

**3. [Implementação] `nao_se_aplica` pelo slot de conteúdo do AsyncState**
- O plano dizia para tratar o estado novo «como vazio com a cópia própria» nas linhas da troca. Mas o slot vazio do AsyncState não aceita marcador. Renderizei a mensagem como conteúdo, com a mesma tipografia do `EstadoVazio`. Para o usuário, o efeito é o mesmo, com marcador e com carregando/erro na frente.

**4. [Escopo] Comentário do bloco do Raven no hub**
- O plano dizia que o comentário do `LiberacaoCognitivoBlock` «fica». O texto dele ficou. Só a primeira linha («Avaliação de raciocínio (Raven)») trocou de nome para «Raciocínio lógico (Matrizes) — o Raven», junto da Task 3, para o arquivo não citar o nome antigo. HubCandidatoRH está na allowlist do push.

---

**Total deviations:** 2 auto-fixed (1 Rule 1 de teste, 1 Rule 2) + 2 de implementação/escopo.
**Impact on plan:** nenhum fora do escopo. Nenhuma mudança de banco, policy, rota ou chave técnica.

## Issues Encountered

- O crawler pegou a Vercel ainda publicando na 1ª tentativa. Na 2ª, o marcador já estava no ar.
- O `happy-dom` imprime um stack de `DetachedBrowserFrame.abort` no teardown do vitest, com exit 0 e todos os testes verdes. É ruído pré-existente e não falha de teste.

## Known Stubs

Nenhum.

## Deferred / fora do escopo (registrado, não consertado)

- Nenhum teste fixa os rótulos novos de `CognitivoBandCard`, `ConsolidacaoDashboard`, `PesosSliders`, `LiberacaoCognitivoBlock` e `ScoreCard`. A suíte passou igual antes e depois da Task 3. O guarda por forma sobre `src/` inteiro (nenhuma superfície dá aos dois instrumentos o mesmo nome) é do **51-04**, e é ele que fecha a prova do EDGE-PROBE.
- Em PROD, a «Prova cognitiva» vai dizer «Não se aplica a esta vaga» para todo candidato, porque nenhuma das 15 vagas tem `aplica_cognitivo = true`. Isso é o D-16 funcionando, não um defeito. Vale confirmar na UAT que é a leitura desejada (coverage D7).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 51-04 (toast do RH, rótulos de exportação, guarda de `src/`): `origin/main` == HEAD (`d5e2e8b9`) nos caminhos de código. Só os commits de docs do 51-03 ficam à frente.
- A conferência no navegador (D-28) fica para a UAT da fase, coverage D7.

## Self-Check: PASSED

- FOUND: `instrumentosDaVaga.ts`, `instrumentosDaVaga.test.ts`, `.red-51-03/task1.json`, `.red-51-03/task2-helper.json`, `.red-51-03/task2-hub.json`.
- FOUND em HEAD **e** em `origin/main`: `20efbf4d`, `0dd65683`, `50808f1b`, `4e5d4054`, `d5e2e8b9`.
- `git rev-list --count cca99243..d5e2e8b9` = 5.
- Verificação do plano no HEAD: o vitest de `entrevista decisao config-vaga avaliacao-cognitiva components hub-candidato __tests__/guards` deu 75 arquivos e 653 testes verdes. tsc 89. Marcador no chunk lazy, no build e em PROD. `origin/main..HEAD` vazio antes do commit deste SUMMARY.

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-09*
