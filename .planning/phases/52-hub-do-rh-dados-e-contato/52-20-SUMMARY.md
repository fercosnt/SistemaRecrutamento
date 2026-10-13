---
phase: 52-hub-do-rh-dados-e-contato
plan: 20
subsystem: database
tags: [bloco-d, limpeza, dados-de-teste, lgpd, d-30, d-41, f10, f11, migration-destrutiva, ensaio, mutacoes, storage-api, tdd, jorn-63]

requires:
  - phase: 52-19
    provides: "52-19-DECISAO-ESCOPO.md (4 categorias, 8 vagas deleted_at, nenhuma remover, storage_via script_local) e scripts/p52_limpeza_portao.cjs (SQL_VARREDURA, medir --decisao)"
  - phase: 52-32
    provides: "p52_ensaio.cjs com vagas_estado em capturar() e a 0004 no MIGS"
  - phase: 52-26
    provides: "p52_mutacoes.cjs com aposentadoria (exigePrefixadas)"
provides:
  - "supabase/migrations/20261011000004_p52_limpeza_dados_teste.sql — teardown destrutivo da populacao decidida (PRE/LIMPA/POS, grafo de FK lido na execucao), ensaiado contra PROD, NAO aplicado"
  - "supabase/tests/p52_limpeza_pos_smoke.sql — smoke52d pos-limpeza (a)-(e), 5/5 no ensaio"
  - "scripts/p52_mutacoes.cjs — D1-D4 (entradas de recusa) e prefixoDoSmoke; rodada completa 43/43"
  - "scripts/p52_remove_storage.cjs — --capturar, --aprovado, --dry-run, --esperar-vazio, --auto-teste 16/16; forma canonica do STORAGE.json do contrato com o 52-27"
  - "scripts/__tests__/p52_remove_storage.test.cjs — 12 testes node --test (RED->GREEN)"
affects: [52-21, 52-27, 52-22, fecho-do-m8]

# chars/4 sobre as linhas acrescentadas nos 5 arquivos do diff de713e76..b36a0004 (106929 chars)
actuals:
  tokens: 26732
  tasks: 2
  commits: 5
plan_head_before: de713e76aadd77af7c2a6afddcf98f573b3fcb65
plan_head_after: b36a0004c96285c003823d1b58b50c37a0e6380b

tech-stack:
  added: []
  patterns:
    - "Migration destrutiva com a populacao recomputada no PRE pela mesma varredura do portao (nunca lista de ids), guardada em GUCs LOCAIS para o LIMPA, o POS e o smoke"
    - "Grafo de FK lido na execucao: catalogo iterado, conjunto TRATADO literal; FK fora dele recusa no PRE; SET NULL sobre coluna NOT NULL tratado como RESTRICT"
    - "(filhos): antes do DELETE de cada linha-mae, um passo de DELETE registrado para CADA filho NO ACTION do catalogo — o passo esquecido para com ou sem linhas"
    - "Trigger de imutabilidade desligado SO em volta de um DELETE explicito e religado na instrucao seguinte, com PRE (trigger conhecido e ligado) e POS (religado)"
    - "Mutacoes de migration destrutiva como entradas de RECUSA: a mordida e o rotulo da clausula exata (trava, filhos, remover, apagadas)"
    - "Prefixo de ensaio POR SMOKE no runner de mutacoes (a migration destrutiva so sob o smoke dela)"

key-files:
  created:
    - supabase/migrations/20261011000004_p52_limpeza_dados_teste.sql
    - supabase/tests/p52_limpeza_pos_smoke.sql
    - scripts/p52_remove_storage.cjs
    - scripts/__tests__/p52_remove_storage.test.cjs
  modified:
    - scripts/p52_mutacoes.cjs

key-decisions:
  - "Executor (Regra 3, PARA O REVIEW BLOQUEANTE): historico_acoes e imutavel por trigger BEFORE DELETE e a CASCADE de candidaturas chega a 8 linhas de auditoria de UMA candidatura-alvo (f8318f39, possivel dado real que o operador mandou apagar); a migration desliga SO prevent_delete_historico_acoes em volta de um DELETE explicito dessas linhas e o religa na instrucao seguinte, dentro da transacao"
  - "Executor (Regra 1): candidate_ai_decisions.candidato_id e ON DELETE SET NULL sobre coluna NOT NULL (na pratica RESTRICT; 23502 no ensaio) — DELETE explicito; o p47 dizia que a linha sobrevivia"
  - "Executor (Regra 1/2): FKs NO ACTION para auth.users alem da lista 'hoje' do plano (redacoes_candidato.revisada_por, sessoes_ativas.revogado_por) entram no conjunto tratado por conferencia (auth_ref), como decisao_final.por_usuario"
  - "Executor: vagas do deleted_at por regra (vaga de teste sem deleted_at), nao por lista de ids; vagas_md5 na evidencia = md5 dos 8 id8 da decisao (22cc6263...)"
  - "Executor: impressao digital de auth.users so por existencia do id (login muda a linha); usuarios_rh, candidatos, candidaturas, historico_acoes e vagas pela linha inteira"
  - "Executor (Regra 3): prefixoDoSmoke no p52_mutacoes — sem ele a 0004 iria prefixada sob os controles L/G/P/A"
  - "Executor (Regra 3): o teste TDD do removedor roda em node --test, porque o vite.config.ts exclui scripts/** do Vitest"

patterns-established:
  - "Evidencia da limpeza: limpeza:populacao_md5=<md5>,candidatos=<n>,candidaturas=<n>,auth=<n>,vagas_deleted_at=<n>,vagas_removidas=<n>,<categoria>=<n>...,historico_acoes=<n>,vagas_md5=<md5>,trava=igual,fixtures=igual,nao_alvo=igual (os quatro primeiros campos em ordem fixa — o 52-21 os le por regex)"

requirements-completed: [JORN-63]

coverage:
  - id: D1
    description: "Migration 20261011000004 escrita para o escopo decidido, ensaiada contra PROD (aborta), evidencia = medicao fresca = md5 de apagaveis"
    requirement: "JORN-63"
    verification:
      - kind: integration
        ref: "Task 1 <verify> #1 (p52_limpeza_portao medir --decisao + p52_ensaio --migracoes=...0004 p52_limpeza_pos_smoke.sql + conferencia)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Suite Vitest inteira sem vermelho novo com a 0004 commitada (delta contra refs/gsd/52/base)"
    requirement: "JORN-63"
    verification:
      - kind: unit
        ref: "node scripts/p52_vitest_delta.cjs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Mutacoes D1-D4 mordem na clausula exata; rodada completa L/G/P/A/D com controle verde"
    requirement: "JORN-63"
    verification:
      - kind: integration
        ref: "node scripts/p52_mutacoes.cjs"
        status: pass
    human_judgment: false
  - id: D4
    description: "Removedor de curriculos pela Storage API (so a lista aprovada; chave em memoria; nenhum nome de arquivo na saida)"
    requirement: "JORN-63"
    verification:
      - kind: unit
        ref: "node scripts/p52_remove_storage.cjs --auto-teste"
        status: pass
      - kind: unit
        ref: "node --test scripts/__tests__/p52_remove_storage.test.cjs"
        status: pass
      - kind: integration
        ref: "--capturar + --aprovado --dry-run contra o Storage real (so leitura, saida fora do repositorio) + md5 por SQL so leitura"
        status: pass
    human_judgment: false
  - id: D5
    description: "Desligar o trigger de imutabilidade de historico_acoes dentro da transacao do apply (apaga 8 linhas de auditoria de teste)"
    requirement: "JORN-63"
    verification: []
    human_judgment: true
    rationale: "Escolha de mecanismo que toca uma guarda de auditoria; consequencia do escopo decidido (FK CASCADE), mas confirmada pelo revisor do 52-REVIEW-LIMPEZA e pelo operador no 52-21 antes do apply."

duration: 28min
completed: 2026-10-13
status: complete
---

# Phase 52 Plan 20: Bloco D parte 2 — a migration destrutiva do escopo decidido, provada sem apagar Summary

**Migration `20261011000004` escrita exatamente para `52-19-DECISAO-ESCOPO.md` e ensaiada contra o PROD de agora, numa requisição que aborta: `ENSAIO VERDE`, smoke52d 5/5. A população que a migration apagaria tem o mesmo md5 da medição fresca e do md5 recomputado de `apagaveis` (`1b4b21a9…`: 38 candidatos, 32 candidaturas, 30 logins, 8 vagas com `deleted_at`, nenhuma removida). Trava do RH, fixtures e não-alvo saem com impressões digitais iguais. Mutações D1–D4 mordem na cláusula exata (rodada completa 43/43). O removedor de currículos pela Storage API foi construído por TDD (`RED_EVIDENCE_OK` → 12/12; auto-teste 16/16) e conferido contra o Storage real só em `--dry-run`. Nada aplicado, nada removido, nada empurrado.**

## Performance

- **Duration:** ~28 min
- **Started:** 2026-10-13T11:05Z
- **Completed:** 2026-10-13T11:33Z
- **Tasks:** 2 (1 tracer + 1 auto tdd)
- **Files modified:** 5 (4 criados, 1 editado)

## Accomplishments

### Task 1 (tracer) — a migration e a prova pós

`<verify>` #1, rodado como escrito sobre o HEAD `933c7803` (depois dos dois commits):

```
POPULACAO MEDIDA: examinados=47 entrada_i=46 entrada_ii=5 (i∩ii=5, i−ii=41, ii−i=0) trava=1 (candidaturas 3) vagas_teste=9 colisoes=2 possivel_real=8 obrigatorias[3a9254c3=i] apagaveis=ficticios+tombstones+contas_teste_com_candidatura+contas_sem_candidatura → $TMPDIR/p52_20_agora.json
ENSAIO VERDE: supabase/tests/p52_limpeza_pos_smoke.sql · prefixadas=[20261011000004] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005,20261011000006,20261011000007] · ausentes=[] · smokes=[52d=5/5] · evidencia=limpeza:populacao_md5=1b4b21a93ff00a9d01f7d10926dd1f54,candidatos=38,candidaturas=32,auth=30,vagas_deleted_at=8,vagas_removidas=0,ficticios=6,tombstones=2,contas_teste_com_candidatura=14,contas_sem_candidatura=16,historico_acoes=8,vagas_md5=22cc6263eedd2ef195561b539db9a152,trava=igual,fixtures=igual,nao_alvo=igual 52d.pos=residuo:0,trava_candidaturas:3,fixtures:20,nao_alvo:48 · 687 ms
ensaio da limpeza = medicao = md5 de apagaveis: 1b4b21a93ff00a9d01f7d10926dd1f54
```

- `populacao_md5` da migration = `medir --decisao` de agora = md5 recomputado de `apagaveis` = o valor que o 52-19 anotou (`1b4b21a9…`). A população não mudou desde 07:29Z.
- `vagas_md5` (`22cc6263…`) = md5 dos 8 `vaga_<id8>: deleted_at` da decisão, ordenados e unidos por vírgula. Conferido à parte, porque a migration escolhe as vagas por regra («vaga de teste sem `deleted_at`») e não por lista de ids.
- **Tempo:** a requisição inteira do ensaio (PREFIXO + migration + smoke) levou 687–786 ms nas três rodadas verdes. `lock_timeout = 3s` e `statement_timeout = 5s` ficam como estão (cada `DO` é uma instrução, e o `DO $limpa$` é uma fração disso).

`<verify>` #2 — delta da suíte Vitest inteira contra `refs/gsd/52/base`, com a 0004 commitada em `supabase/migrations/` (sem exclusão nos guardas que varrem as migrations):

```
vitest delta: base=0d70ac7 2725/2 · head=933c780 3179/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok
```

Vermelhos pré-existentes (falham na base e no HEAD, motivo igual; não tocados — decisão do operador para o fecho do M8, portão 47-09 de promessa com executor):
- `src/__tests__/promessasComExecutor.test.ts > Deferimento com prazo: … fase inexistente e fase já concluída REPROVAM — medido contra roadmaps sintéticos`
- `src/__tests__/promessasComExecutor.test.ts > Metade 1 — … deferida · o comentário de catálogo do ledger de notificações declara retenção INDE…`

**Portão de feedback do tracer:** modo `end-of-phase` e `<verify>` só `<automated>`. Reexecutei o `<verify>` #1 (`TRACER RE-VERIFY OK 1b4b21a93ff00a9d01f7d10926dd1f54`) e só então segui para a expansão: ⚡ Tracer verified end-to-end — expanding.

### Task 2 (TDD) — mutações e removedor

`<verify>` da Task 2, como escrito:

```
MUTACOES: 43/43 mordem; controle verde; nada persistiu (aposentadas: B1,B2,B3,B4,B5,B6,A13,A14)
REMOVE AUTO-TESTE OK: 16/16 (forma canonica do STORAGE.json, capturar, aprovado, recusas, dry-run, esperar-vazio, chave e nomes fora da saida)
```

As D, cada uma na cláusula exata (com o controle verde `52d=5/5 prefixadas=[20261011000004]`):

```
D1 morde: migration 0004 sem a trava do RH na varredura (CTE rh vazia): a conta de RH entra no alvo -> P52D POS-PORTAO (trava)
D2 morde: migration 0004 sem o DELETE de revisao_rejeicao no LIMPA -> P52D LIMPA-PORTAO (filhos)
D3 morde: migration 0004 com uma vaga de teste com candidatura da trava marcada para remover -> P52D PRE-PORTAO (remover): vaga marcada para remover tem candidatura fora da populacao
D4 morde: migration 0004 com um candidato fixture-p46 a mais no conjunto que o LIMPA apaga -> P52D POS-PORTAO (apagadas): o apagamento contou
```

Os controles dos outros smokes rodaram com `prefixadas=[]`, como antes do plano: `52l=20/20`, `52g=14/14`, `52p=10/10`, `52a=10/10`. As B seguem aposentadas (a 0003 está no ledger desde o 52-18), e a A13/A14 também (a 0007 está no ledger desde o 52-32).

**Removedor contra o Storage real (só leitura; saída gravada no scratchpad, fora do repositório; nada removido):**

```
STORAGE CAPTURADO: prefixos_da_populacao=38 prefixos_com_objeto=16 n_objetos=24 nomes_md5=d6d79e3e7d985c226511a7c8232b90fe total_bucket=28
DRY-RUN: n_objetos=24 nomes_md5=d6d79e3e7d985c226511a7c8232b90fe = aprovado (prefixos=16); nada removido
```

Uma conferência independente por SQL só leitura (`md5(string_agg(name, E'\n' ORDER BY name COLLATE "C"))` sob os mesmos prefixos) deu os mesmos `n=24`, `d6d79e3e…` e `total=28`. Bate com o 52-19: população 18 + fictícios 6 = 24, mais os 4 da trava = 28. A chave `service_role` veio da Management API e ficou só em memória.

## TDD Gate Compliance

- **RED** — `a6df24a8` `test(52-20): testes do removedor de curriculos pela Storage API (RED)`. O comando foi `node --test --test-reporter=tap scripts/__tests__/p52_remove_storage.test.cjs` (exit 1, TAP `1..12`, 12 reprovados). O classificador `gsd-tools check tdd-red-evidence` devolveu `RED_EVIDENCE_OK` (`target_test_failed`) para o alvo «forma canonica: a fixture do contrato da 224b2ac162f0322444eed10e6335517a». O registro está em `.planning/tmp/p52_20_red_record.json`, fora do git.
  - **semanticAssessment:** o alvo executou (12 testes descobertos) e reprovou em `assert.strictEqual` — actual `undefined`, expected `224b2ac1…` —, porque `nomesMd5` ainda não existia. O teste carrega `{}` de propósito quando o script falta, para nunca cair em erro de carga. A falha é a ausência do comportamento planejado (a forma canônica), não fixture, import ou sintaxe.
- **GREEN** — `b36a0004` `feat(52-20): remocao de curriculos pela Storage API so da lista aprovada`: 12/12 e auto-teste 16/16.
- **REFACTOR** — nenhum (nada a limpar que justificasse um commit).
- **Mordida do auto-teste** (cópias mutadas no scratchpad, não commitadas): com `.sort()` padrão no lugar de `Buffer.compare`, o auto-teste FALHOU nos dois casos da forma canônica; sem a comparação de `nomes_md5` no `--aprovado`, FALHOU em «mesma contagem e nome trocado».
- As D1–D4 vieram antes, em `bb5ce916` `test(52-20): mutacoes D1-D4 da limpeza`: são teste do portão da migration, provado por execução.

## Task Commits

1. **Task 1: migration** — `79a3f13c` (feat) `feat(52-20): limpeza destrutiva dos dados de teste — migration do escopo decidido (ensaio)`
2. **Task 1: smoke** — `933c7803` (test) `test(52-20): prova pos-limpeza`
3. **Task 2: mutações** — `bb5ce916` (test) `test(52-20): mutacoes D1-D4 da limpeza`
4. **Task 2: RED** — `a6df24a8` (test) `test(52-20): testes do removedor de curriculos pela Storage API (RED)`
5. **Task 2: GREEN** — `b36a0004` (feat) `feat(52-20): remocao de curriculos pela Storage API so da lista aprovada`

**Plan metadata:** este SUMMARY (docs) e o tracking à mão (STATE/ROADMAP) a seguir.

## Files Created/Modified

- `supabase/migrations/20261011000004_p52_limpeza_dados_teste.sql` — o teardown destrutivo. Traz o cabeçalho «⛔ DESTRUTIVA E IRREVERSIVEL» (o que apaga por categoria, o que nunca toca, o PITR recusado e o caminho de volta pelo export ou pelo backup diário, o Storage como passo separado pela API, «APLICAR SÓ PELO 52-21-COMANDO-APPLY.sh», «NUNCA `supabase db push`»). O `DO $pre$` cobre população, (fk), (imutavel), (triggers), (remover), vagas e impressões digitais. O `DO $limpa$` faz os DELETE na ordem do grafo, com `GET DIAGNOSTICS` em cada passo e (filhos)/(auth_ref). O `DO $pos$` cobre (residuo), (apagadas), (trava), (fixtures), (nao_alvo), (auth), (imutavel) e (vagas), e publica a evidência. Nenhuma constante de contagem, nenhuma lista de ids, nenhum `BEGIN/COMMIT`.
- `supabase/tests/p52_limpeza_pos_smoke.sql` — smoke52d (a)–(e): só no ensaio, depois da 0004. Refaz a varredura com cópia própria e confere as impressões digitais pelas mesmas expressões.
- `scripts/p52_mutacoes.cjs` — linha SMOKES do smoke52d (`exigePrefixadas: ['20261011000004']`), D1–D4 e `prefixoDoSmoke` (puro, exportado).
- `scripts/p52_remove_storage.cjs` — o removedor (modos e garantias no cabeçalho dele).
- `scripts/__tests__/p52_remove_storage.test.cjs` — os testes do removedor (`node --test`).

## Decisions Made

Ver `key-decisions`. As duas que pedem olho humano antes do apply:

1. **`historico_acoes` (D5, `human_judgment: true`).** A tabela inteira tem 8 linhas, todas da candidatura `f8318f39` (conta `6fcdd6bf`, vaga `9f6ccf1a`). É um «possível dado real» que o operador mandou apagar como semente de teste. A FK é `ON DELETE CASCADE`, então a linha não sobrevive à candidatura. Mas o trigger `prevent_delete_historico_acoes` recusa todo DELETE, inclusive o da cascata. A migration desliga só esse trigger (o de UPDATE fica), só em volta de um `DELETE FROM public.historico_acoes WHERE candidatura_id = ANY (v_kids)`, e o religa na instrução seguinte, antes do DELETE de candidaturas. A mudança de catálogo é transacional: nenhuma outra sessão vê o trigger desligado. O PRE recusa se o trigger não for exatamente esse e estiver ligado; o POS exige `tgenabled = 'O'` e apagadas = alvo. O revisor do 52-REVIEW-LIMPEZA e o operador confirmam a escolha. A alternativa seria tirar `f8318f39` do escopo, o que exige nova decisão do operador.
2. **`candidate_ai_decisions`.** `candidato_id` é `ON DELETE SET NULL` sobre coluna `NOT NULL`, então a linha não pode ficar com a referência nula (23502 no ensaio) e sai com o candidato. O PRE passou a tratar essa forma (SET NULL/SET DEFAULT sobre NOT NULL) como RESTRICT e recusa a que não estiver tratada.

## Deviations from Plan

### Auto-fixed Issues

**1. [Regra 3 - Bloqueio] `historico_acoes` imutável bloqueava a CASCADE de candidaturas**
- **Found during:** Task 1 (ensaio de desenvolvimento, antes do commit)
- **Issue:** `ENSAIO VERMELHO: P0001: Operação não permitida: historico_acoes é uma tabela IMUTÁVEL`.
- **Fix:** `DISABLE TRIGGER` estreito em volta do DELETE explícito, mais (imutavel)/(triggers) no PRE e (imutavel) no POS. As linhas de `historico_acoes` fora das candidaturas-alvo entram na impressão do não-alvo (migration e smoke).
- **Files modified:** a migration e o smoke
- **Commit:** `79a3f13c` / `933c7803`. Vai ao review como decisão (D5).

**2. [Regra 1 - Bug] `candidate_ai_decisions.candidato_id` SET NULL sobre NOT NULL**
- **Found during:** Task 1 (ensaio de desenvolvimento) — `23502: null value in column "candidato_id" of relation "candidate_ai_decisions"`.
- **Fix:** DELETE explícito no passo de `solicitacoes_dados`, mais a forma no (fk) do PRE, no (filhos) e no (remover).
- **Commit:** `79a3f13c`

**3. [Regra 1 - Bug] variável `r record` sombreava o alias `r` de `usuarios_rh`** (`55000: record "r" is not assigned yet`) — renomeada para `v_fk`. Commit `79a3f13c`.

**4. [Regra 2 - Correção] Conjunto de FKs para `auth.users` maior que a lista «hoje» do plano.** Entraram `redacoes_candidato.revisada_por` e `sessoes_ativas.revogado_por`, colunas de ator do RH tratadas por conferência como `decisao_final.por_usuario`. Sem isso, o PRE recusaria o PROD de hoje. Commit `79a3f13c`.

**5. [Regra 3 - Bloqueio] `prefixoDoSmoke` no `p52_mutacoes.cjs`.** O prefixo do modo padrão era global: com as D na rodada, a 0004 destrutiva iria prefixada sob os controles e as mutações de L/G/P/A, que foram medidos contra o vivo sem ela. Agora cada smoke recebe só o que as entradas dele requerem; o contrato (6a) está escrito no cabeçalho. Commit `bb5ce916`.

**6. [Regra 3 - Bloqueio] Teste do TDD em `node --test`.** O Vitest do projeto exclui `scripts/**` (`vite.config.ts`), e a primeira tentativa deu `1..0`. O arquivo `scripts/__tests__/p52_remove_storage.test.cjs` não estava na lista `files_modified` do plano. Commit `a6df24a8`.

**7. [Registro] Três ensaios de desenvolvimento antes do primeiro commit da migration** (os vermelhos 1–3 acima), pelo mesmo envelope que aborta. Os `<verify>` oficiais rodaram depois dos commits, como o plano manda.

**8. [Registro] Evidência com campos a mais** — categorias, `historico_acoes`, `vagas_md5` — entre os quatro primeiros campos (ordem fixa, lidos pelo 52-21: `populacao_md5,candidatos,candidaturas,auth`) e o fim `trava=igual,fixtures=igual,nao_alvo=igual`. As duas regex (52-20 e 52-21) casam.

**Total deviations:** 6 auto-fixed (2 Regra 1, 1 Regra 2, 3 Regra 3) + 2 de registro. **Impact on plan:** nenhum aumento de escopo de dados. As correções tornam a migration aplicável ao grafo real e recusam mais, não menos. A D5 fica para julgamento humano no 52-21.

## Issues Encountered

- **Árvore:** os arquivos pré-existentes não relacionados (docs/, plugins/, AGENTS.md, .planning/ui-reviews/.gitignore, docs/vagas/, `51-…/.gitkeep`) não foram tocados nem staged. `.planning/tmp/` (registro do RED) fica fora do git.
- **Push:** nada empurrado; `origin/main..HEAD` já tinha commits anteriores a este plano.
- **Ledger:** `20261011000004` fora de `supabase_migrations.schema_migrations` (conferido só leitura: `n=0`).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: audit-guard-bypass | supabase/migrations/20261011000004_p52_limpeza_dados_teste.sql | `ALTER TABLE public.historico_acoes DISABLE/ENABLE TRIGGER prevent_delete_historico_acoes` dentro da transação do apply, em volta de um DELETE escopado às candidaturas-alvo (8 linhas hoje). Não estava no `<threat_model>`; mitigado por PRE (trigger conhecido e ligado), POS (religado, apagadas = alvo) e transacionalidade. Vai ao review bloqueante. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Para o 52-27 (próximo, sequencial no mesmo checkout):**
- A forma canônica do `STORAGE.json` está implementada exatamente como no parágrafo do contrato. `nomesMd5` dá `224b2ac1…` para a fixture e não `78557760…` nem `deecf20e…`. `prefixos` são os prefixos DISTINTOS DOS CAMINHOS capturados (16 hoje), não os 38 prefixos da população; chaves do JSON: exatamente `bucket, prefixos, n_objetos, nomes_md5, total_bucket, capturado_em`. Captura real de hoje: `n_objetos=24`, `nomes_md5=d6d79e3e…`, `total_bucket=28`.
- **`candidate_ai_decisions` é APAGADA pela 0004, não anulada.** A FK é SET NULL, mas a coluna é NOT NULL. O fecho do export a classificaria como `anula` pela regra do tipo da FK; o modo correto é `apaga`.
- **`historico_acoes` entra no fecho por CASCADE** (8 linhas, candidatura `f8318f39`). A restauração é por INSERT, que o trigger permite (ele só barra UPDATE/DELETE).
- Os demais SET NULL que a 0004 deixa anulados: `ai_call_logs.candidato_id`, `recruiter_alerts.candidato_id`, `logs_acesso.user_id`, `autorizacoes.user_id`, `decisao_final.revisao_por_usuario`, `auth.scim_users.user_id`.

**Para o 52-21:**
- Números esperados enquanto a população não mudar: `populacao_md5=1b4b21a9…`, `candidatos=38`, `candidaturas=32`, `auth=30`, `vagas_deleted_at=8` (`vagas_md5=22cc6263…`), `vagas_removidas=0`, `historico_acoes=8`. Storage: 24 objetos, `--esperar-vazio` depois espera `restantes=0` e `total_bucket=4`.
- A migration contém DDL de trigger (D5): o 52-REVIEW-LIMPEZA tem de julgá-lo explicitamente.
- O runner de mutações aposenta D1–D4 sozinho depois do apply (`exigePrefixadas`).

**Backlog do fecho do M8 (inalterado):** 3 `auth.users` órfãos, `deleted_at` na `9f6ccf1a`, teardown das fixtures `fixture-p46-*`, os 2 vermelhos do `promessasComExecutor`.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-13*

## Self-Check: PASSED

- Arquivos criados presentes: a migration, o smoke, `scripts/p52_remove_storage.cjs` e `scripts/__tests__/p52_remove_storage.test.cjs`; `scripts/p52_mutacoes.cjs` editado.
- Commits ancestrais de HEAD: `79a3f13c`, `933c7803`, `bb5ce916`, `a6df24a8`, `b36a0004` (`git rev-list --count de713e76..b36a0004` = 5).
- Critérios de aceitação das duas tasks e `<verification>` do plano reexecutados nesta sessão: verdes. Nada aplicado (ledger sem a 0004), nada removido do Storage (só `--dry-run`), nenhum e-mail, nome, CPF, nome de arquivo, token ou chave neste arquivo.
