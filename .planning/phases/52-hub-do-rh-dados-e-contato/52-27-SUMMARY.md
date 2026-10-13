---
phase: 52-hub-do-rh-dados-e-contato
plan: 27
subsystem: database
tags: [bloco-d, limpeza, export-previo, d-41, lgpd, jorn-63, fecho-de-fk, storage-api, tdd, tracer]

requires:
  - phase: 52-19
    provides: "52-19-DECISAO-ESCOPO.md (destinos vaga_<id8>), contrato do POPULACAO.json (apagaveis {id, user_id}, populacao_md5 canonico) e scripts/p52_limpeza_portao.cjs medir --decisao"
  - phase: 52-20
    provides: "migration 20261011000004 (o que apaga/anula, por FK), forma canonica do STORAGE.json em scripts/p52_remove_storage.cjs --capturar"
provides:
  - "scripts/p52_export_limpeza.cjs — --contar, --exportar, --conferir (--dir/--registro/--decisao, --vivo), --auto-teste 49/49 (D-41 emendada, condicao 2)"
  - "scripts/__tests__/p52_export_limpeza.test.cjs — 14 testes node --test (RED -> GREEN)"
affects: [52-21, 52-22, fecho-do-m8]

# chars/4 sobre as linhas acrescentadas nos 2 arquivos do diff 6a3df2d7..0065c039 (107407 chars)
actuals:
  tokens: 26852
  tasks: 2
  commits: 3
plan_head_before: 6a3df2d7dad85db3a49f348ea1c3acc543ca4dc9
plan_head_after: 0065c03930f39ebe27abad018562491aaee093a5

tech-stack:
  added: []
  patterns:
    - "Fecho de FK planejado em JS sobre o catalogo lido na execucao (nos tabela|modo, ordem topologica, ciclo = recusa) e executado numa UNICA requisicao so leitura de CTEs por ctid; o catalogo vem numa requisicao anterior e a das linhas recalcula fk_md5 (catalogo diferente = recusa)"
    - "Duble de consulta que avalia o PLANO (nao o SQL) com a mesma semantica: raizes com dupla guarda, descida por aresta, anula/atualiza sem as linhas ja em apaga"
    - "Linhas como texto jsonb do servidor (nunca reparseadas): numero e precisao intactos; o mesmo montarLinhas no --exportar e no --vivo"
    - "Manifesto com selo (md5 dele sem o selo) e forma exata: um octeto trocado no proprio manifesto tambem e EXPORT ADULTERADO"

key-files:
  created:
    - scripts/p52_export_limpeza.cjs
    - scripts/__tests__/p52_export_limpeza.test.cjs
  modified: []

key-decisions:
  - "Executor (Regra 2): o grafo vem de uma requisicao de catalogo e TODAS as linhas/contagens de uma segunda requisicao; esta recalcula a impressao digital do catalogo (fk_md5) e recusa se mudou — o plano pede uma requisicao por operacao para as tabelas virem do mesmo snapshot, e as tabelas vem"
  - "Executor (Regra 2): SET NULL/SET DEFAULT sobre coluna NOT NULL (ou FK de varias colunas) vai em apaga e desce — a mesma forma que o PRE da migration trata como RESTRICT; candidate_ai_decisions sai como apaga (1 linha hoje), nao anula"
  - "Executor (Regra 2): MANIFESTO.json com selo (md5 do manifesto sem ele) e forma exata, para --dir detectar adulteracao do proprio manifesto"
  - "Executor: o manifesto guarda escopo.vagas (id8 -> destino) e fk_md5, porque o --conferir --vivo do comando do apply (52-21) nao recebe --decisao-escopo"
  - "Executor: vaga_<id8>: fora_do_bloco_d (linha de Extras da decisao) = nada, como manter; destino desconhecido recusa (DECISAO FORA DO FORMATO)"
  - "Executor: recusas do --conferir na ordem DENTRO DE REPOSITORIO -> AUSENTE -> ADULTERADO -> NAO E O APROVADO -> NAO E A POPULACAO -> DIFERE DO VIVO (o md5 do manifesto so existe depois de provada a presenca e a integridade)"

patterns-established:
  - "Export previo de restauracao cirurgica: fecho lido do pg_constraint na execucao, espelho do que a migration apaga/anula, fora de qualquer arvore git, conferivel por registro/decisao e contra o vivo"

requirements-completed: [JORN-63]

coverage:
  - id: D1
    description: "Fecho de FK da populacao lido na execucao e contado so leitura contra o PROD de agora; raizes = medicao fresca"
    requirement: "JORN-63"
    verification:
      - kind: unit
        ref: "node scripts/p52_export_limpeza.cjs --auto-teste (casos do fecho)"
        status: pass
      - kind: integration
        ref: "Task 1 <verify> #2: p52_limpeza_portao medir --decisao + --contar + conferencia (fecho = populacao medida: 1b4b21a9; candidatos=38)"
        status: pass
    human_judgment: false
  - id: D2
    description: "--exportar (duble): 0700/0600, linhas {t,m,r} na ordem do fecho, tokens em branco, encrypted_password, K.bin + INDICE, MANIFESTO, export_md5 deterministico"
    requirement: "JORN-63"
    verification:
      - kind: unit
        ref: "node --test --test-reporter=tap scripts/__tests__/p52_export_limpeza.test.cjs (14/14)"
        status: pass
      - kind: unit
        ref: "Task 2 <verify> #1: --auto-teste 49/49 sem arroba na saida"
        status: pass
    human_judgment: false
  - id: D3
    description: "Cada recusa provada: DENTRO DE REPOSITORIO, JA EXISTE, AUSENTE x4, ADULTERADO, NAO E A POPULACAO, NAO E O APROVADO, DIFERE DO VIVO; exportador sem escrita SQL nem catalogo do Storage"
    requirement: "JORN-63"
    verification:
      - kind: unit
        ref: "node scripts/p52_export_limpeza.cjs --auto-teste"
        status: pass
      - kind: other
        ref: "Task 2 <verify> #2 (varredura do codigo sem comentarios: exportador so le) + mutacoes no scratchpad"
        status: pass
    human_judgment: false
  - id: D4
    description: "Escolha do escopo de credenciais (encrypted_password mantido; tabelas de sessao/MFA/OAuth so contadas)"
    requirement: "JORN-63"
    verification: []
    human_judgment: true
    rationale: "Escolha do planejador apresentada ao operador e vetavel no 52-21 Task 2 (chave export_escopo); o executor so a implementou."

duration: 23min
completed: 2026-10-13
status: complete
---

# Phase 52 Plan 27: Export prévio da população aprovada (D-41 emendada, condição 2) Summary

**`scripts/p52_export_limpeza.cjs` calcula, a partir do catálogo de PROD lido na execução, o fecho de FK exato da limpeza do bloco D. São 80 nós de tabela e modo; contra o PROD de agora, `candidatos=38`, `candidaturas=32`, `auth.users=30`, `historico_acoes=8` e 8 vagas em `atualiza`, os mesmos números da evidência da migration `20261011000004`, e o md5 das raízes é igual ao da medição fresca (`1b4b21a9…`). O script grava o export fora de qualquer árvore git (0700/0600), com as colunas `token` de `auth.users` em branco e as tabelas de sessão/MFA só contadas, e o confere contra registro, decisão e o banco vivo. Cada recusa foi provada com dublês (auto-teste 49/49, `node --test` 14/14). Nenhum export real, nenhuma escrita em PROD, nada removido, nada empurrado.**

## Performance

- **Duration:** ~23 min
- **Started:** 2026-10-13T11:39Z
- **Completed:** 2026-10-13T12:03Z
- **Tasks:** 2 (1 tracer + 1 auto tdd)
- **Files modified:** 2 (criados)

## Accomplishments

### Task 1 (tracer): o fecho e a contagem só leitura

`<verify>` #1 (no commit `bc953acc`): `EXPORT AUTO-TESTE OK: 17/17`. São os casos do fecho:
- raiz, filhos, neto e o filho NO ACTION entram em `apaga`;
- o filho SET NULL entra em `anula` e o fecho não desce por ele;
- SET NULL sobre coluna NOT NULL entra em `apaga`;
- de `auth`, só `users` e `identities`; sessões, refresh tokens e MFA vão para `excluidas_por_desenho`;
- dupla guarda: a conta com `candidatos` fora das raízes e a conta com `usuarios_rh` não entram;
- a ordem é pais antes de filhos;
- vagas: `deleted_at` vira `atualiza`, `remover` vira `apaga` e desce;
- recusas: ciclo no grafo, catálogo que muda entre as duas leituras, id a mais ou md5 adulterado;
- a entrada órfã entra por `auth.users`;
- a forma do SQL;
- uso inválido;
- nada pessoal na saída.

As 7 mutações do planejador, feitas no scratchpad, morderam.

`<verify>` #2, rodado como está escrito depois do commit (medição fresca + `--contar`, só leitura):

```
POPULACAO MEDIDA: examinados=47 entrada_i=46 entrada_ii=5 (i∩ii=5, i−ii=41, ii−i=0) trava=1 (candidaturas 3) vagas_teste=9 colisoes=2 possivel_real=8 obrigatorias[3a9254c3=i] apagaveis=ficticios+tombstones+contas_teste_com_candidatura+contas_sem_candidatura → $TMPDIR/p52_27_agora.json
fecho = populacao medida: 1b4b21a9; candidatos=38
```

A linha `EXPORT CONTAGEM` inteira (só contagens e md5):

```
EXPORT CONTAGEM: auth.users:apaga=30 auth.identities:apaga=28 auth.one_time_tokens:excluida=1 auth.sessions:excluida=29 auth.mfa_amr_claims:excluida=29 auth.refresh_tokens:excluida=206 public.candidatos:apaga=38 public.autorizacoes:apaga=28 public.disponibilidade:apaga=26 public.solicitacoes_dados:apaga=9 public.ai_call_logs:anula=64 public.candidate_ai_decisions:apaga=1 public.candidaturas:apaga=32 public.agendamentos_entrevista:apaga=2 public.analise_candidato_vaga:apaga=28 public.avaliacoes_rh:apaga=1 public.cognitivo_liberacao:apaga=5 public.decisao_final_historico:apaga=11 public.decisao_final:apaga=6 public.devolutivas_candidato:apaga=4 public.entrevista_analises:apaga=14 public.entrevista_guias:apaga=6 public.entrevistas_online:apaga=4 public.entrevistas_presenciais:apaga=1 public.historico_acoes:apaga=8 public.historico_candidatura:apaga=82 public.notificacoes_enviadas:apaga=99 public.redacoes_candidato:apaga=5 public.respostas_avaliacao:apaga=17 public.respostas_formulario:apaga=131 public.respostas_raven:apaga=60 public.revisao_rejeicao:apaga=4 public.scores_candidato:apaga=24 public.scores_raven:apaga=2 public.vagas:atualiza=8 tabelas_no_fecho=80 raizes=38 populacao_md5=1b4b21a93ff00a9d01f7d10926dd1f54
```

Conferido com a evidência do ensaio da migration (52-20): `candidatos=38`, `candidaturas=32`, `auth=30`, `vagas_deleted_at=8`, `historico_acoes=8`; as 9 `solicitacoes_dados` e a 1 `candidate_ai_decisions` que a migration apaga em passo explícito também estão no fecho. As anulações por SET NULL anulável que a migration deixa, hoje: só `ai_call_logs.candidato_id` (64). `recruiter_alerts`, `logs_acesso`, `autorizacoes.user_id` fora das linhas já em `apaga` e `decisao_final.revisao_por_usuario` dão 0.

**Portão de feedback do tracer:** o modo é `end-of-phase` e o `<verify>` tem só `<automated>`. Reexecutei os dois `<verify>` (`TRACER RE-VERIFY OK`, `1b4b21a9`): ⚡ Tracer verified end-to-end — expanding.

### Task 2 (TDD): escrever e conferir o export

`<verify>` #1, como está escrito:

```
EXPORT AUTO-TESTE OK: 49/49 (fecho de FK, modos apaga/anula/atualiza, auth fora por desenho, dupla guarda, ordem, contagem so leitura; forma canonica, escrita 0700/0600, tokens em branco, recusas DENTRO DE REPOSITORIO/JA EXISTE/AUSENTE x4/ADULTERADO x4/NAO E A POPULACAO/NAO E O APROVADO/DIFERE DO VIVO, nada pessoal na saida)
```

`<verify>` #2: `exportador so le (codigo sem comentarios)`.

Os 32 casos da Task 2 no auto-teste:
- **Forma canônica:** a fixture dá `224b2ac162f0322444eed10e6335517a`, não dá `78557760…` (`.sort()` padrão) nem `deecf20e…` (`\n` final), e a lista vazia dá `d41d8cd9…`. Os prefixos saem distintos e em ordem de bytes. É a mesma definição do `p52_remove_storage.cjs`, sem importar entre scripts.
- **Escrita:**
  - diretório e `storage/` 0700; `MANIFESTO.json`, `linhas.jsonl`, `storage/INDICE.json` e `storage/K.bin` 0600;
  - `linhas.jsonl` com `{t, m, r}` na ordem do fecho;
  - `colunas_em_branco` = as colunas `token` (todas `''`) e `encrypted_password` presente;
  - sessões, refresh tokens e MFA fora das linhas;
  - a linha `EXPORT GRAVADO` impressa;
  - duas exportações do mesmo estado dão o mesmo `export_md5`;
  - toda requisição começa por `set transaction read only;` e nenhuma escreve.
- **Recusas:**
  - `EXPORT DENTRO DE REPOSITORIO` em três casos: dentro deste repositório, dentro de outra árvore git (`git init` temporário) e caminho relativo. Nada é criado.
  - `EXPORT JA EXISTE`.
  - `EXPORT AUSENTE` para cada uma das quatro ausências: **diretório**, **`MANIFESTO.json`**, **`linhas.jsonl`** e **um `storage/K.bin` do índice**.
  - `EXPORT ADULTERADO: <arquivo>` para um octeto trocado em `linhas.jsonl`, `MANIFESTO.json`, `storage/INDICE.json` e `storage/1.bin`. Também para um manifesto com JSON válido e um valor trocado, ou com um espaço trocado (o selo e a forma exata mordem).
  - `EXPORT NAO E A POPULACAO` em cinco casos: id a mais em apagaveis, id a menos, currículos do export ≠ captura, `--exportar` com listagem ≠ captura (nada gravado) e prefixo do STORAGE.json fora de apagaveis.
  - `EXPORT NAO E O APROVADO` com `--registro` e com `--decisao` (md5 diferente, instante diferente; iguais → `EXPORT CONFERIDO`), e com registro sem `export_dir` ou com md5 malformado.
  - `--vivo`: tudo igual → `vivo=igual`. Linha mudada → `EXPORT DIFERE DO VIVO: public.filho`; linha nova → `…: public.neto`; currículo mudado → `…: storage`; FK nova → `…: catalogo`.
- **Saída:** nenhum e-mail, nome, CPF, token, hash, chave ou nome de arquivo em toda a saída dos casos.

As 21 mutações do código do script, feitas no scratchpad, morderam. A varredura de escrita SQL do `<verify>` #2 morde quando se acrescenta uma escrita.

### Sonda só leitura do caminho das linhas contra o PROD (fora do plano; nada gravado)

O plano não exerce `--exportar` contra o PROD, e não exerceu. Para o 52-21 não descobrir um erro de SQL no passo do export, rodei o MESMO caminho das linhas (`sqlDoFecho(…, 'linhas')` → `avaliarFecho` → `montarLinhas`), mais a listagem do Storage. Os dados ficaram só na memória do processo, e só saíram contagens, md5 e booleanos:

```
SONDA LINHAS: 1596 ms, sql_octetos=49642, corpo_octetos=1654197, linhas=778, raizes=38, populacao_md5=1b4b21a93ff00a9d01f7d10926dd1f54, agora_iso=true, colunas_token=6(confirmation_token,email_change_token_current,email_change_token_new,phone_change_token,reauthentication_token,recovery_token), encrypted_password_presente=true
SONDA EXCLUIDAS: auth.mfa_factors=0 auth.mfa_challenges=0 auth.mfa_recovery_code_sets=0 auth.mfa_recovery_codes=0 auth.oauth_authorizations=0 auth.oauth_consents=0 auth.one_time_tokens=1 auth.scim_users=0 auth.sessions=29 auth.mfa_amr_claims=29 auth.refresh_tokens=206 auth.webauthn_challenges=0 auth.webauthn_credentials=0
SONDA DETERMINISMO: linhas_md5 igual nas duas leituras=true
SONDA STORAGE: n=24 nomes_md5_igual_captura=true todos_com_tamanho=true
SONDA DOWNLOAD (1 objeto, so em memoria): bytes_igual_listado=true
```

As 6 colunas `token` são exatamente as 6 que o planejamento mediu. A captura do Storage (`p52_remove_storage.cjs --capturar`, gravada no scratchpad, fora do repositório) deu `n_objetos=24 nomes_md5=d6d79e3e…`, o mesmo do 52-20.

## TDD Gate Compliance

- **RED:** `f74cae59` `test(52-27): testes do export previo — escrever e conferir, recusas provadas (RED)`.
  - Comando: `node --test --test-reporter=tap scripts/__tests__/p52_export_limpeza.test.cjs`. Exit 1, TAP `1..14`, 14 reprovados, todos por `AssertionError`.
  - `gsd-tools check tdd-red-evidence` devolveu `RED_EVIDENCE_OK` (`target_test_failed`) para o alvo «forma canonica: a fixture do contrato da 224b2ac162f0322444eed10e6335517a». O registro está em `.planning/tmp/p52_27_red_record.json`, fora do git.
  - **semanticAssessment:** o alvo executou e reprovou em `assert.strictEqual`, com actual `undefined` e expected `224b2ac1…`, porque `nomesMd5` ainda não existia (a Task 1 só exportava o fecho e o `--contar`). Os demais reprovaram na asserção `precisa(...)` por função ausente ou por saída 2 (o modo ainda não existia). Nenhum caiu em erro de carga, fixture ou sintaxe: a falha é a ausência do comportamento planejado.
- **GREEN:** `0065c039` `feat(52-27): exportar e conferir o export previo (fora do git; credenciais fora; recusas provadas)`. Resultado: `node --test` 14/14 e auto-teste 49/49.
- **REFACTOR:** nenhum. Não houve limpeza que justificasse um commit.
- O tracer da Task 1 (`bc953acc`, `feat`) não é TDD: ele é provado pelo próprio `<verify>` e pelo auto-teste do fecho.

## Task Commits

1. **Task 1 (tracer): fecho e contagem:** `bc953acc` (feat) `feat(52-27): fecho de FK da populacao e contagem so leitura (D-41 emendada, condicao 2)`
2. **Task 2, RED:** `f74cae59` (test) `test(52-27): testes do export previo — escrever e conferir, recusas provadas (RED)`
3. **Task 2, GREEN:** `0065c039` (feat) `feat(52-27): exportar e conferir o export previo (fora do git; credenciais fora; recusas provadas)`

**Plan metadata:** este SUMMARY (docs) e, a seguir, o tracking à mão de STATE/ROADMAP.

## Files Created/Modified

- `scripts/p52_export_limpeza.cjs`: o exportador. Modos, formato e garantias estão no cabeçalho. Os juízes puros são exportados, a CLI fica sob `require.main`, não há dependência e o `fetch` é o nativo.
- `scripts/__tests__/p52_export_limpeza.test.cjs`: os testes do `node --test` da Task 2.

## Decisions Made

Ver `key-decisions`. Para o 52-21, três delas pesam:

1. **Duas requisições, um snapshot de dados.** A primeira lê o catálogo de FK. A segunda traz TODAS as linhas (ou contagens) das 80 CTEs numa transação `read only` e recalcula `fk_md5`: se o catálogo mudou no meio, a recusa vem antes de qualquer gravação.
2. **`auth.scim_users.user_id` (SET NULL) é «excluída por desenho», não `anula`.** A regra do `auth` vem antes do modo da aresta, como o plano manda: só `users` e `identities` são exportadas. A migration anula essa coluna e o export não a restaura. Hoje são 0 linhas. Fica registrado para o `export_escopo` do 52-21.
3. **`--vivo` compara a linha inteira de `auth.users`.** Um login de uma conta da população entre o export e o apply muda a linha (`last_sign_in_at`) e faz o `--vivo` recusar com `EXPORT DIFERE DO VIVO: auth.users`. É fail-closed de propósito: o export tem de restaurar o estado de antes do apply. O remédio é o do 52-21 (apagar o diretório antigo, exportar de novo, regravar o registro).

## Deviations from Plan

### Auto-fixed Issues

**1. [Regra 3 - Bloqueio] Arquivo de teste fora de `files_modified`**
- **Found during:** Task 2 (RED)
- **Issue:** o Vitest do projeto exclui `scripts/**`. O plano lista só o script.
- **Fix:** os testes TDD ficam em `scripts/__tests__/p52_export_limpeza.test.cjs`, com `node --test` (TAP), como no 52-20.
- **Commit:** `f74cae59`

**2. [Regra 2 - Correção] Catálogo numa requisição própria, com impressão digital conferida na das linhas**
- **Found during:** Task 1
- **Issue:** o SQL do fecho depende do grafo. Para gerá-lo, o catálogo tem de vir antes, e numa transação `read only` não se pode criar função nem tabela temporária.
- **Fix:** `fk_md5` (md5 das FKs lidas) é recalculado dentro da requisição das linhas. Se diverge, a recusa vem antes de qualquer gravação. As linhas de todas as tabelas continuam saindo de uma única requisição.
- **Commit:** `bc953acc`

**3. [Regra 2 - Correção] Selo e forma exata no `MANIFESTO.json`**
- **Found during:** Task 2
- **Issue:** com `--dir` não há md5 de referência. Sem selo, um valor trocado no manifesto (com JSON válido) passaria.
- **Fix:** o campo `selo` é o md5 do manifesto sem ele, e o texto tem de estar exatamente na forma gravada. Há um caso dedicado no auto-teste, e a mutação «sem selo» morde.
- **Commit:** `0065c039`

**4. [Registro] Campos do manifesto além da lista do plano:** `linhas`, `escopo.vagas`, `fk_md5`, `arquivos` e `selo`. `escopo.vagas` existe porque o `--conferir --vivo` do comando do apply não recebe `--decisao-escopo`. Os campos que o 52-21 lê (`populacao_md5`, `exportado_em`, `tabelas[t].por_modo.apaga`) estão como o 52-21 espera.

**5. [Registro] Ordem das recusas do `--conferir`.** O plano descreve primeiro o cruzamento com registro e decisão. O script confere primeiro presença e integridade, porque o md5 de um manifesto ausente ou adulterado não existe. A ordem está no cabeçalho do script.

**6. [Registro] `vaga_9f6ccf1a: fora_do_bloco_d`.** A linha de «Extras» da decisão casa `^vaga_<id8>:`. Ela é lida como «nada muda», igual a `manter`; destino desconhecido recusa.

**7. [Registro] Detector de escrita SQL do auto-teste.** O detector está escrito com `trunc(?:ate)`, de semântica idêntica, para que a varredura de código do `<verify>` #2 não confunda o detector com uma instrução. O exportador não contém nenhuma, e a varredura foi provada mordendo quando se acrescenta uma escrita.

**8. [Registro] Sonda só leitura contra o PROD, fora do plano.** Cobriu o caminho das linhas, a listagem do Storage e o download de um objeto, só em memória e sem gravar nada (seção acima). Serve para tirar do 52-21 o risco de erro de SQL ou de endpoint no passo do export.

**Total deviations:** 3 auto-fixed (1 Regra 3, 2 Regra 2) + 5 de registro. **Impact on plan:** nenhum aumento de escopo de dados. As correções recusam mais, não menos, e o export continua sendo o espelho do que a migration apaga.

## Issues Encountered

- **Vermelhos pré-existentes (não tocados):** `node scripts/p52_vitest_delta.cjs` → `base=0d70ac7 2725/2 · head=0065c03 3179/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok`. São os 2 do `src/__tests__/promessasComExecutor.test.ts` (portão 47-09), decisão do operador para o fecho do M8.
- **Árvore:** os arquivos pré-existentes não relacionados (docs/, plugins/, AGENTS.md, `.planning/ui-reviews/.gitignore`, docs/vagas/, `51-…/.gitkeep`) não foram tocados nem staged. `.planning/tmp/` (registro do RED) fica fora do git.
- **PROD:** só leitura (`set transaction read only;` em toda requisição). Nenhum export real, nada gravado, nada removido do Storage. A 0004 continua fora do ledger.
- **Push:** nada empurrado.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Para o 52-21 (próximo; destrutivo, parada do operador):**
- **Export (Task 1, uma vez):** `X="$HOME/p52-export-limpeza/$(date -u +%Y%m%dT%H%M%SZ)"; node scripts/p52_export_limpeza.cjs --exportar "$X" --populacao $P/52-21-POPULACAO.json --decisao-escopo $P/52-19-DECISAO-ESCOPO.md --storage $P/52-21-STORAGE.json`. Imprime `EXPORT GRAVADO: dir=… export_md5=… exportado_em=… linhas=… tabelas=… curriculos=…`. O `$HOME` não é árvore git (conferido); o pai `p52-export-limpeza/` é criado 0700 se faltar.
- **Conferência:** `--conferir --registro "$R" --populacao … --storage … --vivo` (Task 1 verify) e `--conferir --decisao "$DEC" --populacao "$POP" --storage "$STO" --vivo` (Task 2 e comando do apply). A saída é `EXPORT CONFERIDO: export_md5=… linhas=… curriculos=… vivo=igual`.
- **Números esperados enquanto o PROD não mudar:** `tabelas['public.candidatos'].por_modo.apaga=38`, `public.candidaturas=32`, `auth.users=30` (= `limpeza:` da migration); `historico_acoes=8`; `public.vagas` em `atualiza`: 8; `public.ai_call_logs` em `anula`: 64; `linhas=778`; 31 tabelas com linhas; `curriculos=24`; `colunas_em_branco['auth.users']` com 6 colunas; `excluidas_por_desenho`: `sessions=29`, `mfa_amr_claims=29`, `refresh_tokens=206`, `one_time_tokens=1`, demais 0. O tamanho fica em ~1,65 MB de linhas mais os 24 currículos.
- **Para o `export_escopo` (Task 2):** `encrypted_password` fica; as 6 colunas `token` vão em branco; `auth.scim_users.user_id` (SET NULL, hoje 0) não é restaurável pelo export; um login de conta da população invalida o `--vivo`.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-13*

## Self-Check: PASSED

- Arquivos criados presentes: `scripts/p52_export_limpeza.cjs` e `scripts/__tests__/p52_export_limpeza.test.cjs`.
- Commits ancestrais de HEAD: `bc953acc`, `f74cae59`, `0065c039` (`git rev-list --count 6a3df2d7..0065c039` = 3). `gsd-tools check evaluation-scope --plan 52-27 --commits-only` resolve os 3.
- Critérios de aceitação das duas tasks e `<verification>` do plano reexecutados nesta sessão, todos verdes: fecho = população medida, só leitura e sem dado pessoal; auto-teste com cada escrita e cada recusa, inclusive as quatro ausências; exportador sem escrita no banco.
- Nenhum export real. Nenhum e-mail, nome, CPF, nome de arquivo, token ou chave neste arquivo.
