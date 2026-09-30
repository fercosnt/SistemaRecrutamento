---
phase: 49-consertos-da-jornada-bloco-2
plan: "30"
subsystem: database
tags: [postgres, supabase, rpc, security-definer, idor, entrevista, analise-vigente, cr-03, jorn-12, d-39, p46apply, mutation-testing, tanstack-query, vercel]

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "10"
    provides: "a vigência por (candidatura, tipo) e o corpo vivo de salvar_avaliacao_entrevista (md5 2b567aaa…, pós-portão do 20260922000008) que esta migration transcreveu"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "06"
    provides: "o portão de avancar_etapa (EXISTS sobre TODAS as vigentes) que o smoke (b)/(c) exercita"
  - phase: 46-purga-e-guardas
    provides: "p46apply.cjs (SQL lido do arquivo, migration + ledger na mesma requisição, md5 conferido)"
provides:
  - "public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text): grava a nota humana SÓ na análise nomeada por id, que tem de ser DA candidatura (IDOR) e VIGENTE; md5(prosrc) 53393f15f0901703203bb315795e5e09 (4110 caracteres)"
  - "public.salvar_avaliacao_entrevista(uuid,jsonb,text) rebaixada a compatibilidade: guard fail-closed, posse, conta vigentes — 0 ⇒ P0002, >1 ⇒ 23514 pedindo a análise, 1 ⇒ delega; md5(prosrc) 874a3244acd9f1426ee1a42af7de7c4a (1797 caracteres)"
  - "supabase/tests/p49_revisao_por_analise_smoke.sql (P49A1, esperado 7) com a tabela M1..M5 no cabeçalho"
  - "entrevistaService.salvarAvaliacao(candidaturaId, SalvarAvaliacaoArgs) exige analiseId e manda p_analise_id"
  - "useEntrevistaScorecard.salvar invalida também entrevistaKeys.analise; EntrevistaWorkspace manda o id da vigente que o scorecard mostra"
affects: [49-31, 49-32, 49-VERIFICATION re-verificação do JORN-12]

actuals:
  tokens: 17381
  tasks: 3
  commits: 3
  plan_head_before: d32d201f1940e56dce34f65192ece829ee05aa6b
  plan_head_after: 28ff8ea37d1a501ed787cb62e03c96c439896082

tech-stack:
  added: []
  patterns:
    - "Sobrecarga primária + compatibilidade que RECUSA a ambiguidade em vez de escolher (promote, não add-alongside)"
    - "Smoke com cada RPC em bloco de exceção próprio: 42883 pré-migration vira estado medido, nunca aborto que esconda a 1a cláusula"

key-files:
  created:
    - supabase/migrations/20260929000003_p49_salvar_avaliacao_por_analise.sql
    - supabase/tests/p49_revisao_por_analise_smoke.sql
  modified:
    - database.types.ts
    - src/features/entrevista/services/entrevistaService.ts
    - src/features/entrevista/__tests__/entrevista-contract.test.ts
    - src/features/entrevista/hooks/useEntrevistaScorecard.ts
    - src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts
    - src/features/entrevista/components/EntrevistaWorkspace.tsx

key-decisions:
  - "A decisão do 49-10 de NÃO acrescentar p_analise_id valia para uma vigente por candidatura; o plural a tornou errada. A assinatura com p_analise_id vira a primária; a de três argumentos só age quando o singular é verdade"
  - "A forma de três argumentos checa posse ANTES de contar vigentes (RH de outra vaga recebe 42501 e não aprende a contagem); a de quatro seleciona FOR UPDATE OF ea (acréscimos ao plano, Rule 2)"
  - "JORN-12 NÃO vira Complete neste plano: a célula anotada fez o mark-complete real devolver not_found, como planejado"

patterns-established:
  - "Mutação por cláusula em requisição que aborta, com o marcador MUTACAO_TERMINOU ausente como prova de que o smoke reprovou antes"

requirements-completed: []

coverage:
  - id: D1
    description: "Com duas vigentes (online bandeirada mais antiga, presencial mais nova), a nota humana só vai para a análise nomeada; a forma de três argumentos recusa escolher"
    requirement: "JORN-12"
    verification:
      - kind: integration
        ref: "node p46apply.cjs run supabase/tests/p49_revisao_por_analise_smoke.sql (PROD, pass 7 de 7)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cada cláusula nova reprova quando desfeita (M1..M5)"
    requirement: "JORN-12"
    verification:
      - kind: integration
        ref: "scratchpad mut_M1..M5.sql via p46apply run — FAIL (a),(e),(e),(d),(f), nenhum MUTACAO_TERMINOU"
        status: pass
    human_judgment: false
  - id: D3
    description: "Os smokes que já vigiavam estas RPCs seguem verdes sem re-pin; b12 da prontidão cobre a sobrecarga"
    requirement: "JORN-12"
    verification:
      - kind: integration
        ref: "p49_analise_vigente_smoke 9/9; p49_trilha_smoke 13/13; p49_prontidao_prod b12_rpcs_revisao_pela_vigente = true"
        status: pass
    human_judgment: false
  - id: D4
    description: "O cliente no ar manda p_analise_id da análise que o scorecard mostra e o painel é invalidado ao salvar"
    requirement: "JORN-12"
    verification:
      - kind: unit
        ref: "CI=true npx vitest run src/features/entrevista (111/111); suíte inteira 2326/2326"
        status: pass
      - kind: other
        ref: "curl https://rh.beautysmile.com.br/assets/EntrevistaWorkspace-BYiuiNMC.js contém 'vigente para registrar a avalia'"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-09-29
status: complete
---

# Phase 49 Plan 30: revisão humana por análise (CR-03, metade de banco) Summary

**`salvar_avaliacao_entrevista` passa a gravar só na análise que o cliente nomeia por id (da candidatura e vigente). A forma de três argumentos recusa escolher entre duas vigentes. O scorecard no ar manda o id da análise que mostra. Tudo provado vermelho→verde em PROD, e cada cláusula nova tem uma mutação que a reprova.**

## Performance

- **Duration:** ~15 min (relógio: marcador de início 2026-09-30T01:30:27Z, fim ~01:45Z; leituras iniciais antes do marcador)
- **Tasks:** 3/3
- **Files modified:** 8 (2 criados, 6 editados)

## Accomplishments

- Migration `20260929000003` aplicada em PROD via `node p46apply.cjs migrate`: «✅ aplicada e escriturada — md5 do ledger BATE (23800 octetos)», md5 `621344efbe3b109977d3636f97d2c47e`, conferido de novo por leitura do ledger no `<verify>`.
- Smoke novo `p49_revisao_por_analise_smoke.sql`: **vermelho em (a)** antes da migration, **7/7** depois. `p49_analise_vigente_smoke` **9/9** e `p49_trilha_smoke` **13/13**, os dois sem re-pin.
- Cinco mutações, cada uma reprovando na letra esperada. Nenhuma vazou: os md5 vivos depois das cinco são iguais aos do apply.
- Tipos regenerados. O diff do `database.types.ts` contém só a sobrecarga nova (18+/8−, um hunk).
- O cliente foi publicado junto: 3 commits deste plano + 11 docs anteriores num push. `origin/main..HEAD` ficou vazio. O chunk lazy `EntrevistaWorkspace-BYiuiNMC.js` servido em `rh.beautysmile.com.br` contém o marcador.

## Evidência literal

### RED (antes da migration, Task 1)

```
p46apply: HTTP 400: {"message":"Failed to run sql query: ERROR:  P0001: P49A FAIL (a): a forma de TRES argumentos, com duas vigentes na candidatura, GRAVOU a nota humana na analise ae6c1f35-4e8d-4818-b68c-cac696b81532 (a PRESENCIAL, a mais recente) — escolheu SOZINHA, pela mais recente, sem o chamador dizer qual. A online (7065a280-d546-46c8-b123-b4f09f30e03e) e a que tem a bandeira pendente; a presencial (ae6c1f35-4e8d-4818-b68c-cac696b81532) e a mais nova. E o CR-03: a forma antiga tem de RECUSAR (23514) pedindo a analise\nCONTEXT:  PL/pgSQL function inline_code_block line 242 at RAISE\n"}
```

Ele reprovou em (a) e nomeou a gravação na PRESENCIAL. As cláusulas (d)/(e)/(f) chamam a assinatura de quatro argumentos, que ainda não existia (42883), e isso ficou registrado como estado medido, sem abortar a subtransação.

### ENSAIO (requisição que aborta)

A requisição levou migration + smoke novo + `p49_analise_vigente_smoke` + `p49_trilha_smoke` + `RAISE 'ENSAIO_OK'`:

```
p46apply: HTTP 400: {"message":"Failed to run sql query: ERROR:  P0001: ENSAIO_OK\nCONTEXT:  PL/pgSQL function inline_code_block line 1 at RAISE\n"}
```

### Apply e pós-apply

```
── 20260929000003_p49_salvar_avaliacao_por_analise.sql
   version : 20260929000003
   octetos : 23800
   md5     : 621344efbe3b109977d3636f97d2c47e
   ✅ aplicada e escriturada — md5 do ledger BATE (23800 octetos)
```

- md5(prosrc) novos (lidos do catálogo; o `RAISE NOTICE` do pós-portão não volta pelo endpoint):
  - `salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` = `53393f15f0901703203bb315795e5e09` (4110)
  - `salvar_avaliacao_entrevista(uuid,jsonb,text)` = `874a3244acd9f1426ee1a42af7de7c4a` (1797)
- ACL das duas: `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`, ou seja, `anon` fora.
- Premissa reconfirmada só leitura antes de escrever: md5 vivo `2b567aaa…` (3748), a assinatura nova ausente, o predicado `IMMUTABLE` e **0** candidaturas com mais de uma vigente (online 1, presencial 1, `tipo` nulo 3). Não havia nada retroativo a fazer.

### O portão morde (Task 2)

| Mutação | Inversão | Saída (primeiro FAIL) | `MUTACAO_TERMINOU` |
|---|---|---|---|
| M1 | 3 args com o corpo do 20260922000008 | `P49A FAIL (a): … GRAVOU a nota humana na analise 11635010-… (a PRESENCIAL, a mais recente)` | ausente |
| M2 | 4 args sem `ea.candidatura_id = p_candidatura_id` | `P49A FAIL (e): … id da vigente de OUTRA candidatura (B, de01b8d1-…) devolveu «ACEITO» (esperado P0002)` | ausente |
| M3 | 4 args sem a exigência de vigente | `P49A FAIL (e): quatro argumentos com o id da SUPERADA (8d7f2e59-…) devolveu «ACEITO» (esperado 23514)` | ausente |
| M4 | 4 args que ignoram o id e pegam a vigente mais recente | `P49A FAIL (d): pedida a ONLINE (45330cd8-…), a RPC devolveu analise_id 6bc0002e-… (a PRESENCIAL, a mais recente)` | ausente |
| M5 | 4 args com o guard de papel sem `coalesce` | `P49A FAIL (f): a forma de quatro argumentos SEM claims devolveu «ACEITO» (esperado 42501)` | ausente |

Depois das cinco, os md5 vivos eram `874a3244…` / `53393f15…`, iguais aos do apply, e o smoke voltou a 7/7. A tabela está no cabeçalho do smoke.

### Varredura pela forma (CLAUDE.md §Portões)

- Padrão do CLAUDE.md sobre `supabase/tests/*.sql`: **321 antes → 326 depois**. Os +5 são todos do smoke novo:
  - `:395` `a_sc_n IS DISTINCT FROM 0`, `:462` `e_sc_b IS DISTINCT FROM 0` e `:520` (resíduo `<> 0`) são **escopados às fixtures**.
  - `:440`/`:462` `IS DISTINCT FROM 4.50` é a média da nota que o próprio smoke escreveu (4 e 5), um **escopo** e não uma fotografia do banco.
  - `:555` `<> 7` é o contador do arquivo, **escopo deliberado**.
- Achados que citam as RPCs: só `p49_prontidao_prod.sql:142,144` (`proname IN ('salvar_avaliacao_entrevista','confirmar_revisao_entrevista')`). É **escopo por NOME**, então cobre a sobrecarga sozinho. O `bool_and` passa a exigir o predicado nas três linhas, e o `count(DISTINCT proname) = 2` segue verdadeiro. Rodado: **`b12_rpcs_revisao_pela_vigente = true`**, sem nenhum outro `b*` falso.
- Leitores da classe «uma só vigente entre tipos»:
  - Banco (`prosrc ILIKE '%entrevista_analises%'`):
    - `avancar_etapa` usa EXISTS sobre todas as vigentes.
    - `registrar_analise_entrevista` trabalha por tipo.
    - `confirmar_revisao_entrevista` trabalha por id.
    - `anonimizar_candidato` e `plano_exclusao_titular` (motor) olham todas as linhas.
    - Todos são escopo deliberado. As duas `salvar_*` agora trabalham por id ou recusam.
  - EF: `avaliar-transcricao-entrevista:267` lê por `(candidatura, tipo, texto_hash)`, que é escopo deliberado.
  - Front: `TranscricaoReviewPanel.tsx:489-494,654` ainda usa só `vigenteMaisRecente`, que é **o 49-31**. `EntrevistaWorkspace.tsx:89` segue lendo `vigenteMaisRecente`, mas agora manda o id dela, e a escolha entre vigentes também é do 49-31. `entrevistaService.getAnalise` (`:638`) mantém a forma singular e não tem chamador fora do serviço. Fica anotado para o 49-31, sem conserto aqui.

### Front (Task 3)

- RED do caso novo, falhando por asserção e não por carregamento: `× invalidates entrevistaKeys.analise(candidaturaId) on salvar success … AssertionError: expected "invalidateQueries" to be called with arguments: [ Array(1) ]` (1 failed | 6 passed). Depois do conserto: 7/7.
- RED do contrato do serviço (Task 1): 2 failed | 20 passed (as quatro chaves; análise vazia ⇒ `INVALID_INPUT`). Depois do conserto: 22/22.
- `CI=true npx vitest run src/features/entrevista`: 9 arquivos, 111/111. Suíte inteira: 217 arquivos, 2326/2326.
- `tsc`: **89** antes do plano, **90** entre a Task 1 e a Task 3 e **89** no fim. O conjunto de mensagens, diffado sem linha e coluna, é **idêntico** ao de antes do plano. O 90 intermediário era `useEntrevistaScorecard.ts: TS2345 'SalvarAvaliacaoPayload' não atribuível a 'SalvarAvaliacaoArgs'`. É esperado pela divisão de tasks do plano e foi fechado pela Task 3. O hook de pre-commit aceitou (teto 96).
- Marcador: `grep -rl 'vigente para registrar a avalia' build/assets/` devolveu `build/assets/EntrevistaWorkspace-BYiuiNMC.js`. Depois do push, o arquivo de mesmo nome servido em `https://rh.beautysmile.com.br/assets/` contém o marcador (4a tentativa do poll, ~1 min). O `<verify>` verbatim imprimiu `no ar: EntrevistaWorkspace-BYiuiNMC.js`.
- `git log --oneline origin/main..HEAD` → vazio, depois de `e276966a..28ff8ea3  main -> main`.

### JORN-12 continua sem Complete

- Simulação numa cópia descartável:
  - Célula anotada: `"updated": false`, `"not_found": ["JORN-12"]`, `"total": 1`, e a caixa não virou.
  - Mesma cópia com a célula devolvida a `Gaps Found` exato: `"updated": true`, `"marked_complete": ["JORN-12"]`, e a caixa virou `[x]`. A simulação morde: `JORN-12 resiste ao mark-complete; a simulação morde`.
- `mark-complete JORN-12` real, no fim do plano: `"updated": false`, `"not_found": ["JORN-12"]`. O `git diff .planning/REQUIREMENTS.md` ficou vazio, `grep -cE '^- \[x\] \*\*JORN-12\*\*'` = **0**, e a célula continua `Gaps Found — CR-03 em conserto (49-30 banco, 49-31 tela); aguarda re-verificação`. Por isso o `requirements-completed` do frontmatter está vazio, de propósito.

## Task Commits

1. **Task 1 (tracer): smoke vermelho, migration, apply, tipos e serviço**: `d66dd77f` (fix)
2. **Task 2: o portão morde (tabela M1..M5)**: `09484415` (test)
3. **Task 3: hook, workspace e publicação**: `28ff8ea3` (fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Posse da vaga checada na forma de três argumentos ANTES de contar as vigentes**
- **Found during:** Task 1 (desenho da migration)
- **Issue:** o plano pedia a ordem «guard de papel → contar vigentes → delegar». Com ela, um RH de OUTRA vaga que chamasse a forma antiga numa candidatura com duas vigentes receberia 23514 (e a contagem na mensagem), e não 42501. É um oráculo sobre candidatura alheia.
- **Fix:** entre o guard de papel e a contagem, a função lê o `created_by` da vaga e recusa com 42501 se o RH não for dono. A delegação continua checando posse de novo, no corpo único. O pós-portão confere `v_vaga_owner IS DISTINCT FROM` nas DUAS.
- **Files modified:** `supabase/migrations/20260929000003_p49_salvar_avaliacao_por_analise.sql`
- **Commit:** `d66dd77f`

**2. [Rule 2 - Correctness] `FOR UPDATE OF ea` na seleção da assinatura nova**
- **Found during:** Task 1
- **Issue:** entre «a análise é vigente» e o UPDATE, um `registrar_analise_entrevista` concorrente pode superá-la, e a nota cairia numa superada. O corpo anterior tinha a mesma janela.
- **Fix:** a seleção trava a linha da análise, e o escritor concorrente espera. Todo o resto do corpo é o transcrito.
- **Files modified:** a migration
- **Commit:** `d66dd77f`

**3. [Ordem] A tabela de mutações entrou no cabeçalho do smoke na Task 2, não na Task 1**
- O primeiro rascunho do smoke já a trazia. Tirei antes do commit da Task 1 para que o commit não afirmasse uma prova que ainda não tinha rodado. Ela entrou na Task 2, depois das cinco mutações.

**4. [Posição da recusa de não vigente na assinatura nova]**
- A recusa 23514 da análise não vigente ficou DEPOIS dos guards de papel e de posse. É a mesma posição do `confirmar_revisao_entrevista`, citado no plano como molde. Assim, quem não tem papel recebe 42501 e não aprende o estado de vigência da análise. O `no_data_found` continua antes do guard, como no corpo transcrito e no `confirmar_revisao_entrevista`.

Nenhum outro desvio. Nenhum pacote instalado. Nenhuma escrita retroativa em dado de PROD, só DDL de função.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>` do plano (T-49-30-01..06 mitigadas e provadas: (e)/M2, (f)/M5, ACL no pós-portão e no smoke, (a)/M1, (d), simulação do mark-complete).

## Next Phase Readiness

- **49-31 (painel):** o banco já aceita `p_analise_id`, e a confirmação da análise que bloqueia libera o avanço (smoke (b)/(c)). Falta a tela:
  - listar as pendentes (`vigentes.filter(bloqueio_avanco && !revisao_confirmada_em)`) com uma confirmação por item;
  - trocar `vigenteMaisRecente` por escolha explícita no `EntrevistaWorkspace` e rotular qual análise está sendo avaliada;
  - decidir o destino de `entrevistaService.getAnalise` (forma singular).
- **49-32:** roda depois, serializado. Não há arquivo em comum com este plano.
- **Verificador:** JORN-12 continua `Gaps Found — … aguarda re-verificação` até o 49-31 fechar a metade da tela.

## Self-Check: PASSED

- FOUND: `supabase/migrations/20260929000003_p49_salvar_avaliacao_por_analise.sql`, `supabase/tests/p49_revisao_por_analise_smoke.sql`, `.planning/phases/49-consertos-da-jornada-bloco-2/49-30-SUMMARY.md`
- FOUND: commits `d66dd77f`, `09484415`, `28ff8ea3` (`git rev-list --count d32d201f..HEAD` = 3)
- Ledger PROD `20260929000003`: md5(statements[1]) = md5 do arquivo = `621344efbe3b109977d3636f97d2c47e`
