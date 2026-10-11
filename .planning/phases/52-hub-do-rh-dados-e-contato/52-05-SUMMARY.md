---
phase: 52-hub-do-rh-dados-e-contato
plan: 05
subsystem: ui
tags: [react, vitest, proveniencia-ia, rh-sidebar, intl, guard]

requires:
  - phase: 52-hub-do-rh-dados-e-contato
    provides: "52-01: base da fase (refs/gsd/52/base) e harness scripts/p52_*.cjs"
  - phase: 49-consertos-da-jornada-bloco-2
    provides: "ProvenienciaIABadge / textoProveniencia (49-13) e a proveniencia no hub (49-16)"
provides:
  - "textoProveniencia com frase inteira para modelo nulo (semModelo / semModeloAntigo / contingenciaSemModelo) e geradoEm opcional"
  - "parentese «analise anterior a 22/09/2026» so com data <= 22/09/2026 no dia de America/Sao_Paulo"
  - "hub: created_at na allowlist da analise, devolvido como gerado_em; AnaliseIABlock passa geradoEm nos dois selos"
  - "guarda p52-ban-modelo-modelo.grep.test.ts sobre src/ inteiro, com piso medido na execucao"
  - "getActivePageFromPath exportada e pura; «Candidatos» aceso em /rh/candidato/:id/*"
affects: [52-hub-do-rh-dados-e-contato, triagem, hub-candidato, entrevista, decisao, rh-sidebar]

actuals:
  tokens: 13199
  tasks: 2
  commits: 5
plan_head_before: af9e3057a60f4f54483920bda0f86f8fc863d4f1
plan_head_after: 035cebbb2660f5d1e5db28429ac9892d675e219b

tech-stack:
  added: []
  patterns:
    - "Frase inteira por caso na copia canonica, em vez de substituicao de fragmento dentro de outra frase"
    - "Comparacao de dia civil por Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }) -> AAAA-MM-DD comparavel como texto"
    - "Guarda de varredura com piso CALCULADO na execucao: contagem independente (readdirSync recursivo) deve igualar a contagem da varredura"
    - "Andaime so de tipos num commit chore antes do RED quando os testes referenciam API tipada inexistente (hook tsc <= 96)"

key-files:
  created:
    - src/__tests__/guards/p52-ban-modelo-modelo.grep.test.ts
    - src/components/__tests__/RHSidebar.activePage.test.tsx
  modified:
    - src/features/triagem/components/ProvenienciaIABadge.tsx
    - src/features/hub-candidato/services/analiseCandidatoService.ts
    - src/features/hub-candidato/components/AnaliseIABlock.tsx
    - src/components/RHSidebar.tsx
    - src/features/triagem/components/__tests__/ProvenienciaIABadge.test.tsx
    - src/features/triagem/components/__tests__/ComparativoScreen.test.tsx
    - src/features/triagem/components/__tests__/RedacaoReviewPanel.test.tsx
    - src/features/triagem/pdf/__tests__/exportComparativo.test.ts
    - src/features/entrevista/components/__tests__/GuiaEntrevistaPanel.test.tsx
    - src/features/entrevista/components/__tests__/TranscricaoReviewPanel.test.tsx
    - src/features/hub-candidato/components/__tests__/AnaliseIABlock.test.tsx
    - src/features/hub-candidato/services/__tests__/analiseCandidatoService.test.ts

key-decisions:
  - "52-05: PROVENIENCIA_IA_COPY perdeu a chave do fragmento minusculo (removida, nao renomeada); modelo nulo e frase inteira por caso — semModelo, semModeloAntigo, contingenciaSemModelo"
  - "52-05: parentese de data so com geradoEm legivel e dia em America/Sao_Paulo <= 2026-09-22 (inclusive); data ausente ou ilegivel => «Modelo nao registrado»; contingencia sem modelo nunca leva a data"
  - "52-05: modelo vazio ('' ou so espacos) conta como nao registrado, para nao imprimir «Gerado pelo modelo » sem nome"
  - "52-05: so o hub passa a data; PDF, comparativo, redacao, guia, transcricao, decisao e ai-logs seguem sem data e dizem «Modelo nao registrado»"
  - "52-05: o guarda do «modelo» duplicado conta comentarios tambem (docblock que cita a frase errada ensina a frase errada)"
  - "52-05: andaime so de tipos em commit chore(52-05) antes do RED — o hook de pre-commit (tsc <= 96, real 89) reprovava o commit de testes vermelhos com +33 erros TS; nada foi contornado"

patterns-established:
  - "Teste de combinacoes exaustivo para cópia montada por ramos: produto cartesiano das entradas, contexto JSON na mensagem e contagem das combinacoes conferida"
  - "Item de menu ativo: funcao pura exportada + tabela de todos os ramos anteriores + teste de render pelo realce"

requirements-completed: [JORN-58, JORN-61]

coverage:
  - id: D1
    description: "textoProveniencia diz «Modelo não registrado» (frase inteira) para modelo nulo, e nenhuma combinação provedor × modelo × data × causa produz «modelo» duas vezes"
    requirement: JORN-58
    verification:
      - kind: unit
        ref: "src/features/triagem/components/__tests__/ProvenienciaIABadge.test.tsx#TODA combinação provedor × modelo × data × causa"
        status: pass
      - kind: unit
        ref: "src/__tests__/guards/p52-ban-modelo-modelo.grep.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Parêntese «(análise anterior a 22/09/2026)» só com data ≤ 22/09/2026 em São Paulo; sem data, data ilegível ou posterior, só «Modelo não registrado» (D-52-U17)"
    requirement: JORN-58
    verification:
      - kind: unit
        ref: "src/features/triagem/components/__tests__/ProvenienciaIABadge.test.tsx#a data da análise só quando é verdadeira (52-05 / D-52-U17)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Hub: created_at projetado e devolvido como gerado_em; os dois selos do AnaliseIABlock recebem geradoEm"
    requirement: JORN-58
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/services/__tests__/analiseCandidatoService.test.ts#devolve `created_at` como `gerado_em`"
        status: pass
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/AnaliseIABlock.test.tsx#selo de proveniência (49-16 / D-27b / JORN-28)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Consumidores sem data (comparativo, redação, guia, transcrição, PDF) mostram exatamente «Modelo não registrado»; PDF de contingência sem modelo contém contingenciaSemModelo e a causa"
    requirement: JORN-58
    verification:
      - kind: unit
        ref: "npx vitest run src/features/triagem src/features/hub-candidato src/features/entrevista src/features/decisao src/features/admin/ai-logs src/__tests__/guards"
        status: pass
    human_judgment: false
  - id: D5
    description: "Menu do RH acende «Candidatos» em /rh/candidato/:id/{entrevista,redacao,decisao}; todos os ramos anteriores de getActivePageFromPath inalterados"
    requirement: JORN-61
    verification:
      - kind: unit
        ref: "src/components/__tests__/RHSidebar.activePage.test.tsx"
        status: pass
    human_judgment: false
  - id: D6
    description: "Leitura da frase no hub em PROD (análise antiga com modelo nulo exibe «Modelo não registrado (análise anterior a 22/09/2026)»)"
    requirement: JORN-58
    verification: []
    human_judgment: true
    rationale: "Depende da coluna created_at real das linhas de PROD e do deploy do front (sem push neste plano); nenhum teste lê PROD"

duration: 10min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 05: Proveniência sem «modelo» duplicado e menu «Candidatos» nos workspaces Summary

**O selo de proveniência agora diz «Modelo não registrado» como frase inteira, na tela e no PDF. O parêntese «(análise anterior a 22/09/2026)» só aparece quando a data da análise (`created_at`, lida pelo hub como `gerado_em`) cai até 22/09/2026 no dia de São Paulo. Nos workspaces `/rh/candidato/:id/*` o menu do RH acende «Candidatos».**

## Performance

- **Duration:** 10 min
- **Started:** 2026-10-11T04:20:15Z
- **Completed:** 2026-10-11T04:29:32Z
- **Tasks:** 2
- **Files modified:** 14 (2 criados, 12 modificados)

## Accomplishments

- `textoProveniencia` tem um ramo próprio para modelo nulo (ou vazio). Ele devolve a frase inteira da cópia (`semModelo`, `semModeloAntigo` ou `contingenciaSemModelo`) e nunca substitui um fragmento em `{modelo}`, que era o que produzia «Gerado pelo modelo modelo…». A frase com modelo registrado não mudou.
- A data entra como parâmetro opcional, `geradoEm`. O dia é calculado por `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })` e comparado como texto com `'2026-09-22'`, com o dia incluído. Sem data, com data ilegível ou com data posterior, a frase não leva parêntese. A contingência sem modelo também não leva a data.
- A chave do fragmento minúsculo saiu de `PROVENIENCIA_IA_COPY`. `grep -rn` do nome antigo em `src/` sai vazio.
- No hub, `created_at` entrou na allowlist e volta como `gerado_em: string | null`. O `AnaliseIABlock` passa `geradoEm` nos dois selos, o de sucesso e o de falha. As análises antigas não foram preenchidas nem reprocessadas (D-23).
- As cinco asserções de fora do hub e do selo que pinavam o fragmento minúsculo (`ComparativoScreen`, `RedacaoReviewPanel`, `exportComparativo`, `GuiaEntrevistaPanel`, `TranscricaoReviewPanel`) agora pinam a frase inteira e afirmam `not.toMatch(/modelo\s+modelo/i)`. A asserção do selo que pinava o próprio defeito foi corrigida.
- Guarda novo, `p52-ban-modelo-modelo.grep.test.ts`. Ele varre `src/` inteiro fora de `__tests__`, comentários incluídos. O piso de arquivos é medido na execução: a contagem da varredura tem de igualar uma contagem independente feita com `readdirSync` recursivo.
- `getActivePageFromPath` virou função de topo, exportada e pura. Ganhou `startsWith('/rh/candidato/') → 'candidatos-rh'` antes do fallback.

## Task Commits

1. **Andaime de tipos (desvio, ver abaixo)**: `5a291fd2` (chore)
2. **Task 1 (tracer), RED**: `6e3f9b93` (test)
3. **Task 1 (tracer), GREEN**: `1131f478` (fix)
4. **Task 2, RED**: `0e6e9fd2` (test)
5. **Task 2, GREEN**: `035cebbb` (fix)

**Plan metadata:** commit `docs(52-05)` deste SUMMARY, e o de STATE/ROADMAP logo depois.

## TDD Gate Compliance

**RED, Task 1:** o alvo foi `ProvenienciaIABadge — a data da análise só quando é verdadeira (52-05 / D-52-U17) > TODA combinação provedor × modelo × data × causa…`. O classificador deu `RED_EVIDENCE_OK` (`target_test_failed`) sobre o relatório JUnit da execução (`NO_COLOR=1 DEBUG_PRINT_LIMIT=0 npx vitest run …ProvenienciaIABadge.test.tsx --reporter=junit`, 21 testes, 13 falhas). A captura foi refeita depois do andaime de tipos, com o mesmo veredito.

**Avaliação semântica, Task 1:** o alvo rodou e falhou na asserção planejada, com o próprio defeito como evidência: `{"provedorIa":null,"modeloIa":null,…,"t":"Gerado pelo modelo modelo não registrado"}: expected … not to match /modelo\s+modelo/i`. No RED do conjunto (8 arquivos, 26 falhas), todas as falhas foram de asserção: frase inteira esperada contra a duplicada, `created_at` ausente da allowlist, `gerado_em` null. Nenhuma foi de import, sintaxe ou fixture.

**RED, Task 2:** o alvo foi `RHSidebar — o item realçado dentro de um workspace (o que o RH vê) > em /rh/candidato/abc/entrevista o item «Candidatos» acende e «Dashboard» não`, com `RED_EVIDENCE_OK` via JUnit (21 testes, 20 falhas). **Avaliação semântica:** a sidebar montou e o alvo falhou na asserção planejada (o botão «Candidatos» sem `bg-[#35BFAD]`). Os 19 casos da tabela falharam na asserção explícita `expected 'undefined' to be 'function'` (a função ainda não era exportada), não num TypeError. O caso «/rh/dashboard continua Dashboard» passou já no RED, como esperado, porque ele prova o que já funcionava.

**Gate de commits:** os dois RED (`test(52-05)`) precedem os dois GREEN. Os GREEN usam `fix(52-05)`, como o plano manda, e não `feat(52-05)`. Quem verificar o gate pelo padrão `feat(` não vai achar o GREEN. Os commits existem como `fix(`.

## Files Created/Modified

- `src/features/triagem/components/ProvenienciaIABadge.tsx`: chaves novas da cópia; chave antiga removida; `geradoEm` em `textoProveniencia` e no selo; `analiseAnteriorAoRegistroDoModelo`; docblock com D-23/D-52-U17.
- `src/features/hub-candidato/services/analiseCandidatoService.ts`: `created_at` na allowlist; `gerado_em` em `AnaliseHubRow`.
- `src/features/hub-candidato/components/AnaliseIABlock.tsx`: `geradoEm={analise.gerado_em}` nos dois selos.
- `src/components/RHSidebar.tsx`: `getActivePageFromPath` exportada, com o ramo `/rh/candidato/`.
- `src/__tests__/guards/p52-ban-modelo-modelo.grep.test.ts` (novo): o guarda e três sub-testes de sanidade (morde, não morde a frase nova, piso medido).
- `src/components/__tests__/RHSidebar.activePage.test.tsx` (novo): a tabela de ramos e o teste de render.
- Seis testes de consumidor e de selo atualizados (lista no frontmatter).

## Decisions Made

- Chave antiga removida, não renomeada (decisão do plano). Os leitores passaram a usar as chaves de frase inteira.
- Modelo vazio ou só com espaços conta como não registrado. O plano falava só em `modeloIa == null`. Com `''`, o código antigo imprimia «Gerado pelo modelo » sem nome. Coberto por teste.
- O guarda conta comentários. O plano dizia «linhas de código»; esta regra é mais estrita e segue o precedente do `p52-ban-tempo-sugerido`. Hoje não há nenhuma ocorrência fora de `__tests__`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Andaime só de tipos antes do commit RED da Task 1**
- **Found during:** Task 1 (commit RED)
- **Issue:** o hook `.husky/pre-commit` reprova quando o `tsc` passa de 96 erros (o real é 89). Os testes vermelhos referenciam API tipada que ainda não existia (`PROVENIENCIA_IA_COPY.semModelo`, `geradoEm`, `gerado_em`), e o commit deu `tsc errors: 122 (frozen baseline: 96)`, com +33 erros. Contornar com `--no-verify` é proibido, e re-pinar a baseline seria ilegítimo.
- **Fix:** commit `chore(52-05)` só com a superfície de tipos: as três chaves novas da cópia, `geradoEm?` aceito e ainda ignorado, e `gerado_em` ainda `null`. Comportamento nenhum. Depois dele, os testes foram commitados vermelhos (26 falhas, todas de asserção) e o comportamento entrou no `fix(52-05)`.
- **Files modified:** `ProvenienciaIABadge.tsx`, `analiseCandidatoService.ts`
- **Verification:** `tsc errors: 89` em cada commit; o RED foi refeito depois do andaime, com `RED_EVIDENCE_OK`.
- **Committed in:** `5a291fd2`

**2. [Rule 2 - Missing Critical] Modelo vazio tratado como não registrado**
- **Found during:** Task 1
- **Issue:** `modeloIa = ''` produzia «Gerado pelo modelo » sem nome, uma afirmação vazia no selo.
- **Fix:** `semModelo = !modeloIa || modeloIa.trim() === ''`.
- **Files modified:** `ProvenienciaIABadge.tsx` (e um teste)
- **Verification:** teste «modelo vazio conta como não registrado».
- **Committed in:** `1131f478`

---

**Total deviations:** 2 auto-fixed (1 de bloqueio, 1 crítico pequeno)
**Impact on plan:** o andaime muda só a ordem e o conteúdo dos commits, sem mudar comportamento. O tratamento de vazio é uma linha. Nenhuma asserção foi afrouxada ou pulada.

## Mordidas provadas (plantadas à mão, não commitadas)

- **Guarda:** acrescentei a linha `// plantado: Gerado pelo modelo modelo nao registrado` em `ProvenienciaIABadge.tsx`. O sub-teste (i) reprovou, apontando `ProvenienciaIABadge.tsx:234`. Com o arquivo restaurado, 4/4 passaram.
- **Data sempre presente:** troquei a condição de data por `true`. Resultado: 9 falhas no selo e no hub, incluindo o teste de combinações (a prohibition de D-52-U17).
- **`<` em vez de `<=`:** 3 falhas, entre elas o caso de 22/09 às 23:30 em SP e o de 23/09 02:30Z.

## Verification

- Verify da Task 1, literal: `npx vitest run src/features/triagem src/features/hub-candidato src/features/entrevista src/features/decisao src/features/admin/ai-logs src/__tests__/guards && ! grep -rn "modeloDesconhecido" src && ! { …testes do selo fora desses diretórios… }` deu exit 0, com 57 arquivos e 703/703 testes. `decisao` e `ai-logs` também rodaram isolados: 8 arquivos, 91/91.
- Lint da Task 1: `lint exit=2 tsc errors=89`, portão OK (≤ 90).
- Verify da Task 2: `npx vitest run src/components/__tests__` deu exit 0, com 11 arquivos e 93/93 testes.
- Suíte inteira: 2885/2887. As 2 falhas são os vermelhos de base conhecidos de `promessasComExecutor.test.ts`, mais nenhuma.
- Tipografia: `node scripts/p52_tipografia.cjs --base af9e3057 …` deu `TIPOGRAFIA OK (125 linhas acrescentadas varridas)`.
- Tracer, Task 1 (modo interativo, `end-of-phase`, verify só `<automated>`): o verify foi refeito sobre o GREEN e passou. Tracer verificado de ponta a ponta antes da Task 2.

## Issues Encountered

O hook de `tsc` contra commits RED tipados está descrito no desvio 1. Fora isso, nada.

## User Setup Required

None. Não há configuração externa. Não houve escrita em PROD nem push. O efeito na tela só chega ao ar depois de um push no `main` (Vercel).

## Next Phase Readiness

- A frase do hub depende do `created_at` real das linhas de PROD. É conferência de UAT (coverage D6) e só vale depois do push.
- Os outros consumidores (PDF, comparativo, redação, guia, transcrição, decisão, ai-logs) não passam data e dizem «Modelo não registrado». Passar a data neles é aditivo, se a fase quiser.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*

## Self-Check: PASSED

- FOUND: src/__tests__/guards/p52-ban-modelo-modelo.grep.test.ts
- FOUND: src/components/__tests__/RHSidebar.activePage.test.tsx
- FOUND: 5a291fd2, 6e3f9b93, 1131f478, 0e6e9fd2, 035cebbb (ancestrais de HEAD)
