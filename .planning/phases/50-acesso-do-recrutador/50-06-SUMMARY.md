---
phase: 50-acesso-do-recrutador
plan: 06
subsystem: edge-functions
tags: [deno, edge-functions, authorization, vitest, portao, sc3, d-01, d-09]

requires:
  - phase: 50-acesso-do-recrutador
    provides: "50-02: tracer do helper is_active_rh_user() VIVO em PROD e o push dele. Este plano espera o 50-02 só para que commits de EF e de src/ não entrem antes daquele push (classificação ALHEIO)"
provides:
  - "5 EFs sem a autoria da vaga como autorização (comparativo-candidatos, get-curriculo-url, consolidar-decisao-final, gerar-guia-entrevista, avaliar-transcricao-entrevista), NÃO deployadas"
  - "sonda Vitest src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts: varre por FORMA todo .ts não-teste sob supabase/functions, piso calculado por readdir, mordida por fixture; RED provado no tree anterior (5 EFs, 12 linhas), VERDE depois"
  - "4 arquivos de teste Deno virados (rh ativo em vaga criada por outro → 200/sucesso) + 2 testes novos (consolidar: vaga inexistente → 404; avaliar: vaga sem linha → sucesso, título null-safe)"
  - "4 comentários do front reescritos (só comentário, sem mudança de comportamento)"
affects: [50-10]

actuals:
  tokens: 12646
  tasks: 3
  commits: 4
plan_head_before: b5617989ca632207e33083a1ca93f495fc404844
plan_head_after: 80d3bd40cd61173b8fe1cbbe8144bfa20303fdb2

tech-stack:
  added: []
  patterns:
    - "Sonda de EF por FORMA: readdirSync recursivo sobre supabase/functions (exclui *.test.ts e __tests__/), piso = conjunto de <slug>/index.ts achado por readdir comparado por igualdade, não por constante"
    - "Sonda NÃO comment-aware de propósito: um comentário que ainda descreve a posse como autorização é contrato desatualizado"

key-files:
  created:
    - src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts
    - .planning/phases/50-acesso-do-recrutador/deferred-items.md
  modified:
    - supabase/functions/comparativo-candidatos/index.ts
    - supabase/functions/comparativo-candidatos/__tests__/index.test.ts
    - supabase/functions/get-curriculo-url/index.ts
    - supabase/functions/get-curriculo-url/index.test.ts
    - supabase/functions/consolidar-decisao-final/index.ts
    - supabase/functions/consolidar-decisao-final/__tests__/index.test.ts
    - supabase/functions/gerar-guia-entrevista/index.ts
    - supabase/functions/avaliar-transcricao-entrevista/index.ts
    - supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts
    - src/features/vagas/services/vagasService.ts
    - src/features/vagas/services/cvUploadService.ts
    - src/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo.ts
    - src/features/triagem/services/triagemService.ts

key-decisions:
  - "get-curriculo-url: `vaga_id` saiu do select e da interface CandidaturaRow — depois da remoção do passo 5 nada mais o lia (condição do plano para tirá-lo)"
  - "O passo 5b do get-curriculo-url (currículo NULL → 404) virou o passo 5; a lista de passos do cabeçalho foi renumerada (1..6) e o WR-01 (ordem posse antes do 404, contra oráculo de CV entre recrutadores) saiu junto, porque só existia por causa da posse"
  - "Ao contrário do RED do plano, o comentário dentro do teste JORN-32 «O RH é dono de v1» FOI reescrito (o plano manda reescrevê-lo na ação e, no critério, pede o teste «sem mudança»). Resolvido como: assertions e código do teste intocados, uma linha de comentário trocada"
  - "Testes extras (não pedidos, baratos): consolidar «vaga inexistente → 404» (o plano diz «missing vaga → 404 unchanged», mas não havia teste) e avaliar-transcricao «vaga sem linha → sucesso» (prova o null-safe do título, que o ramo rh antes garantia)"
  - "consolidar-decisao-final não tem cross-check candidatura↔vaga (pré-existente). Não foi consertado: fora do escopo do D-01, e muda comportamento de EF. Registrado em deferred-items.md para decisão antes do 50-10"

patterns-established:
  - "Portão de EF por forma com piso por readdir (não constante) e mordida por fixture literal das linhas antigas, num arquivo fora da árvore varrida"

requirements-completed: [EXPORT-05]

coverage:
  - id: D1
    description: "Sonda SC3 (EF): RED no tree anterior (B falha listando as 5 EFs, A e C passam) e VERDE 3/3 depois"
    requirement: EXPORT-05
    verification:
      - kind: unit
        ref: "src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts (RED em 0e29d18b: Tests 1 failed | 2 passed; VERDE em 80d3bd40: Tests 3 passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "comparativo-candidatos e get-curriculo-url sem posse; 3c/JORN-32, soft-delete e 404s intactos; testes virados"
    requirement: EXPORT-05
    verification:
      - kind: unit
        ref: "deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/comparativo-candidatos/ supabase/functions/get-curriculo-url/ → ok | 30 passed | 0 failed"
        status: pass
    human_judgment: false
  - id: D3
    description: "consolidar-decisao-final, gerar-guia-entrevista e avaliar-transcricao-entrevista sem posse; cross-check do gerar-guia e 404 do consolidar intactos; testes virados"
    requirement: EXPORT-05
    verification:
      - kind: unit
        ref: "deno test … consolidar-decisao-final/ avaliar-transcricao-entrevista/ gerar-guia-entrevista/ → ok | 72 passed | 0 failed; deno check das 5 EFs exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Comentários do front só de comentário; tsc no baseline"
    verification:
      - kind: other
        ref: "git diff refs/gsd/50-expansao/base -- src/features (só linhas de comentário); npm run lint → exit 2, 89 erros TS (baseline 89)"
        status: pass
    human_judgment: false
  - id: D5
    description: "As 5 EFs em PROD com o código novo"
    verification: []
    human_judgment: true
    rationale: "Nada foi deployado neste plano (D-12). O deploy e a prova em sessão real são do 50-10, depois da revisão bloqueante"

duration: ~10min
completed: 2026-10-05
status: complete
---

# Phase 50 Plan 06: EFs sem posse de vaga Summary

**As cinco Edge Functions que exigiam que o recrutador fosse o autor da vaga agora aceitam qualquer recrutador ativo. A única autorização que fica é a linha viva de `usuarios_rh`. As checagens de integridade continuam, e uma sonda Vitest por forma, que comprovadamente morde, impede que a posse volte.**

## Performance

- **Duração:** ~10 min de execução (mais a leitura de contexto)
- **Início:** 2026-10-06T01:12:41Z
- **Fim:** 2026-10-06T01:20Z
- **Tasks:** 3
- **Arquivos modificados:** 14 (1 criado, 13 editados) + deferred-items.md

## Accomplishments

- **Sonda SC3 (metade EF)** em `src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts`. Antes das edições, o RED pegou **12 linhas em 5 EFs**, que é a prova de que a sonda não é vazia:
  - `avaliar-transcricao-entrevista/index.ts:13, 226, 242`
  - `comparativo-candidatos/index.ts:275, 286`
  - `consolidar-decisao-final/index.ts:337`
  - `gerar-guia-entrevista/index.ts:13, 235, 248`
  - `get-curriculo-url/index.ts:23, 176, 191`

  Depois das edições: 3/3 verde.
- **comparativo-candidatos:** o bloco `3b` saiu. O `3c` (JORN-32: toda candidatura tem de ser de `body.vaga_id`, e ausente ou de outra vaga recebe o mesmo 403) ficou byte-idêntico no código. O comentário passou a tratar `body.vaga_id` como âncora de integridade.
- **get-curriculo-url:** o passo 5 (posse) saiu. Ficaram `.is("deleted_at", null)`, o NOT_FOUND da candidatura e o 404 de currículo NULL. O rh ativo faz **0 leituras de `vagas`** (o teste confere isso).
- **consolidar-decisao-final:** o `if` de posse saiu e o select passou a `pesos_avaliacao`. A vaga inexistente continua dando 404 (teste novo).
- **gerar-guia-entrevista:** o `if` de posse saiu e a autoria deixou o select. `!vagaRow → 403` e o cross-check candidatura↔vaga ficaram.
- **avaliar-transcricao-entrevista:** o bloco de posse saiu e o select passou a `titulo`. A única leitura do título (`vagaTitulo`, :319) já era null-safe. O teste novo prova que uma vaga sem linha não derruba a análise.
- **Negativos mantidos e verdes:** «sem linha ativa em usuarios_rh ⇒ 403» (avaliar), «candidato sem linha RH ⇒ 403» (comparativo, curriculo, consolidar), JORN-32 com candidatura de outra vaga e com id inexistente (comparativo).

## Task Commits

1. **Task 1: sonda de forma (RED) + comentários do front**
   - `0e29d18b` (test): sonda sozinha, em RED
   - `89ffb670` (chore): 4 comentários
2. **Task 2: comparativo e get-curriculo-url sem posse** — `acc7b0c0` (feat)
3. **Task 3: consolidar, gerar-guia e avaliar-transcricao sem posse; sonda verde** — `80d3bd40` (feat)

**Plan metadata:** o commit docs deste SUMMARY.

## Files Created/Modified

- `src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts`: portão SC3 (EF) por forma, com piso e mordida
- `supabase/functions/{comparativo-candidatos,get-curriculo-url,consolidar-decisao-final,gerar-guia-entrevista,avaliar-transcricao-entrevista}/index.ts`: autorização só pela linha viva de `usuarios_rh`
- 4 arquivos de teste Deno: testes virados para 200/sucesso, mais 2 testes novos
- `vagasService.ts`, `cvUploadService.ts`, `useLiberacaoCognitivo.ts`, `triagemService.ts`: só comentários
- `.planning/phases/50-acesso-do-recrutador/deferred-items.md`: cross-check ausente no consolidar (pré-existente)

## Decisions Made

Ver `key-decisions` no frontmatter. A principal: o critério «teste JORN-32 sem mudança» e a ação «reescrever o comentário "O RH é dono de v1"» se contradiziam. Ficou assim: código e assertions intocados, uma linha de comentário trocada. O diff confere isso: dentro do teste, só o hunk `@@ -620 +627 @@`.

## Deviations from Plan

### Auto-fixed Issues

None — nenhum bug, bloqueio ou falta crítica precisou de conserto fora do plano.

### Adições pequenas, dentro dos arquivos do plano

**1. Dois testes Deno a mais**
- **consolidar:** «vaga inexistente → 404 NOT_FOUND». O plano diz «missing vaga → 404 unchanged», mas não havia teste para isso.
- **avaliar-transcricao:** «vaga sem linha → sucesso». Prova o null-safe que o plano pede, porque o ramo rh antes garantia a linha.
- **Commit:** `80d3bd40`

**2. Comentários além dos nomeados**
- **comparativo:** cabeçalho, passo 1b, interface `CandidaturaRow` e o comentário do SEM_ANALISE.
- **consolidar:** cabeçalho e passo 1b.
- Todos diziam que «a posse foi verificada acima», o que deixou de ser verdade. Só comentário.
- **Commits:** `acc7b0c0`, `80d3bd40`

---

**Total de desvios:** 0 consertos automáticos; 2 acréscimos pequenos de cobertura e redação.
**Impacto no plano:** nenhum fora do escopo; nenhum arquivo fora de `files_modified` além do `deferred-items.md`.

## Issues Encountered

- **O verificador de RED evidence (`gsd-tools check tdd-red-evidence`) não lê saída de Vitest.** O caminho TAP espera as linhas de resumo do node-test (`# tests/# pass/# fail`). O caminho junit pega `name=` de dentro de `classname=` (o regex `/name="…"/` casa primeiro o atributo `classname`), então o nome do teste vira o caminho do arquivo e o veredito é `no_target_test_failure`. A prova do RED usada foi o próprio `<verify>` do plano: `Tests 1 failed | 2 passed`, com `comparativo-candidatos/index.ts` no texto da falha. O teste que falhou foi o B, numa asserção sobre o comportamento planejado, e não por erro de carga. O plano é `type: execute`, não `type: tdd`, então o portão de nível de plano não se aplica. É defeito da ferramenta, fora do repositório.
- **Baseline preservado.** O lint (`tsc`) segue com 89 erros, igual ao baseline. A suíte Vitest completa dá `2 failed | 2411 passed`, e as 2 falhas são as pré-existentes de `src/__tests__/promessasComExecutor.test.ts`.

## User Setup Required

None.

## Next Phase Readiness

- **Para o 50-10:**
  - as 5 EFs vão por `node efdeploy.cjs <slug>`, todas `verify_jwt=true`, depois da revisão bloqueante (D-12);
  - o código está em `main` e local: **não houve push**. Depois do deploy, conferir `git log --oneline origin/main..HEAD` vazio.
- **Ordem:** com as EFs novas em PROD antes das migrations 0002..0004, o recrutador ativo passa a abrir CV, comparar, consolidar, gerar guia e avaliar transcrição, mas ainda não **vê** a candidatura pela RLS. A ordem segura é o 50-10 decidir junto.
- **Decisão pendente do operador:** cross-check candidatura↔vaga no consolidar (`deferred-items.md`).

---
*Phase: 50-acesso-do-recrutador*
*Completed: 2026-10-05*
