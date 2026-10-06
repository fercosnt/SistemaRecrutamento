---
phase: 50-acesso-do-recrutador
reviewed: 2026-10-06T04:15:00Z
depth: deep
diff_base: 9271ba4325dd5f9095c10980b2e1ce349a0067ba
reviewed_head: 0e6719539cc57c6ba52619a7bad8fef4dac393d3
scope: re-revisão adversarial da expansão depois da rodada de conserto do 50-REVIEW-ACESSO-1 (50-10 Task 1). Escopo — `git diff refs/gsd/50-expansao/base..HEAD -- . ':!.planning'` (38 arquivos) mais o `50-10-PLAN.md`, lido como o programa que escreve em PROD. Foco — `git diff 884a41d1..HEAD` (13 commits de conserto, 7eba33ec..0e671953). PROD só em leitura (`set transaction read only`) ou em requisições que abortam. Nada aplicado, nada deployado, nada enviado.
files_reviewed: 39
files_reviewed_list:
  - scripts/p50_desfazer.cjs
  - scripts/p50_ensaio.cjs
  - scripts/p50_enumera.cjs
  - scripts/p50_mutacoes.cjs
  - scripts/p50_varredura.cjs
  - scripts/p50_vitest_delta.cjs
  - src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts
  - src/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo.ts
  - src/features/triagem/services/triagemService.ts
  - src/features/vagas/services/cvUploadService.ts
  - src/features/vagas/services/vagasService.ts
  - supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts
  - supabase/functions/avaliar-transcricao-entrevista/index.ts
  - supabase/functions/comparativo-candidatos/__tests__/index.test.ts
  - supabase/functions/comparativo-candidatos/index.ts
  - supabase/functions/consolidar-decisao-final/__tests__/index.test.ts
  - supabase/functions/consolidar-decisao-final/index.ts
  - supabase/functions/gerar-guia-entrevista/__tests__/index.test.ts
  - supabase/functions/gerar-guia-entrevista/index.ts
  - supabase/functions/get-curriculo-url/index.test.ts
  - supabase/functions/get-curriculo-url/index.ts
  - supabase/migrations/20261005000002_p50_policies_rh_ativo.sql
  - supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql
  - supabase/migrations/20261005000004_p50_rpcs_escrita.sql
  - supabase/tests/funil34_kpis_smokes.sql
  - supabase/tests/oper31_rejeitar_candidatura_smokes.sql
  - supabase/tests/p37_fidelidade_schema_smoke.sql
  - supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql
  - supabase/tests/p44_pedidos_dados_smoke.sql
  - supabase/tests/p46_fixture_elegivel.sql
  - supabase/tests/p47_historico_smoke.sql
  - supabase/tests/p49_44_resposta_caso_aberto_smoke.sql
  - supabase/tests/p50_acesso_recrutador_smoke.sql
  - supabase/tests/p50_desfazer_expansao.sql
  - supabase/tests/p50_vistas_externas.sql
  - supabase/tests/sec05_08_smokes.sql
  - supabase/tests/seg32_smokes.sql
  - supabase/tests/seg33_agendamento_smokes.sql
  - .planning/phases/50-acesso-do-recrutador/50-10-PLAN.md
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 50: Code Review Report — re-revisão depois dos consertos (50-REVIEW-ACESSO-2)

**Reviewed:** 2026-10-06T04:15:00Z
**Depth:** deep
**Files Reviewed:** 39 (38 arquivos de código desde `9271ba43` + `50-10-PLAN.md`)
**Status:** issues_found, com 0 crítico

## Summary

Parti da hipótese de que a rodada de conserto tinha introduzido um blocker novo (memória «Re-revisar o conserto antes do
apply»). Li os 13 commits linha a linha e conferi cada conserto por execução sempre que dava. **Não achei blocker.** As
mudanças de comportamento das EFs (f6d8f559, 7812eda4) estão corretas, não abrem oráculo novo e preservam as conferências
de integridade. O artefato de desfazer confere com PROD e devolve o catálogo. As cadeias do 50-10 ficam verdes no caminho
esperado do ACESSO-2 e vermelhas nos casos de WR-02.

Os 3 warnings novos são de portão e de programa:
- a saída (i) que o WR-03 escreveu para o deploy leva o push a um beco sem saída (provado num clone);
- o WR-01 fechou o vermelho→vermelho, mas um INCONCLUSIVO num smoke reescrito ainda passa no portão automático;
- o WR-10 do ACESSO-1 continua aberto, e agora alcança também o ensaio do desfazer.

**Decisão do operador registrada, não é defeito (WR-06, 2026-10-06, «1»):** o filtro de candidatura viva nas 5 EFs vale
para TODOS os papéis, administrador incluído. Isso é mais estrito que o ramo do administrador no banco, e é intencional.
Consequência visível: um administrador recebe 404 (CV) ou 403 (as outras quatro EFs) para candidatura excluída ou em
rascunho.

### O que foi provado por execução (HEAD `0e671953`; ledger p50 continua `["20261005000001"]`)

| prova | resultado |
|---|---|
| `deno test --allow-env --allow-read --config supabase/functions/deno.json` nas 5 EFs | `ok \| 146 passed \| 0 failed`; `deno check` das 5 `index.ts` com exit 0 |
| **Mutações nas EFs** (cópia em scratchpad, fonte intacto): tirar `is_rascunho`, tirar o `deleted_at` da candidatura, tirar `ativo`, tirar o `deleted_at` de `usuarios_rh`, tirar `user_id` (×5 EFs), e tirar o cross-check `vaga_id` (consolidar, gerar-guia) | **27/27 MORDEM**: a suíte da EF reprova em cada uma. Os mocks aplicam `.eq/.is/.in` (`consultaQueFiltra`), um método desconhecido lança, e nenhuma negativa é vácua |
| Sonda `ef-sem-posse-de-vaga` (Vitest) | 5/5 (A..E). O D tem piso por arquivo, e o E morde. O teste Deno novo do gerar-guia fica fora do Vitest pela forma `supabase/functions/**/!(strict-schema).test.ts` |
| Predicado das EFs × `rh_le_candidaturas` (0001, linha 202) | `deleted_at IS NULL AND is_rascunho = false` ⇔ `.is("deleted_at", null).eq("is_rascunho", false)`. O helper equivale a `usuarios_rh` viva (`ativo`, `deleted_at IS NULL`) lida ao vivo. Respostas: CV 404 (a mesma da ausente); comparativo, consolidar, gerar-guia e avaliar 403 genérico (o mesmo da ausente e da forasteira). Nenhum oráculo novo. 3c, MIXED_VAGA, cross-check do gerar-guia e soft-delete do CV estão intactos |
| `node scripts/p50_mutacoes.cjs` | `controle verde; 25/25 mutacoes mordem; nada persistiu` (rc 0). M24 → `(i) [ativo.save_entrevista_guia_edits/3]`; M25 → `(l) [d23]` |
| Ensaio empilhado `--vistas --migracoes=0002,0003,0004` + smoke | `ENSAIO VERDE … vistas=igual+fechou[anon.public.{decisao_final_historico,entrevista_analises,entrevista_guias,scores_candidato}] · smoke50=13/13`; `07:d23=comportamental>e:42501,outro>ok,literal=true`; `07:vacuos=-`; `07:cobertura=183/183`; `ativo.save_entrevista_guia_edits/3>ok` (agora pelo caminho do recrutador) |
| `node scripts/p50_desfazer.cjs --conferir` | `desfazer confere com PROD: 32/32 impressoes iguais (funcoes=18 politicas=13 vistas=1)` |
| 50-10 Step 1 e) ida+volta (`--vistas … --mutacao=p50_desfazer_expansao.sql`) | `ENSAIO VERDE: - · prefixadas=[…0002,…0003,…0004] · … · vistas=igual · smoke50=n/a · evidencia=…desfazer:pre_diferentes=32/32,pos=iguais:32`. A regex do Step 1 e) casa no log |
| `node scripts/p50_varredura.cjs --modo=ensaio` | `varredura: 27 arquivos · ok=17 reescritos=9 pre-existentes=1 inconclusivos=0 · regressoes=0 investigar=0` (rc 0). O pré-existente é `p49_prova_prod.sql`, arquivo que a fase não tocou |
| Guarda do desfazer, só o bloco `$desfazer_guarda$` em `set transaction read only` | sem GUC, `P50D RECUSADO`; `p50.tx='12345'`, RECUSADO; `p50.desfazer_corretivo='SIM'`, RECUSADO; `'sim'` LOCAL, passa. Três requisições seguidas da Management API caíram em backends diferentes (pids 1128213/15/17) com `p50.*` não definidas. Um `'sim'` de sessão não sobrevive entre requisições, então a saída de emergência não arma por acidente |
| Desfazer: DROP/CASCADE; formas de 0002..0004 | Nenhum DROP nem CASCADE (o único hit é um comentário). Tokenizei 0002..0004 tirando comentários, strings e `$…$`. Toda instrução de topo é `SET LOCAL`, `DO`, `ALTER POLICY`/`COMMENT ON POLICY` (13), `ALTER VIEW`/`COMMENT ON VIEW`, `CREATE OR REPLACE FUNCTION`/`COMMENT ON FUNCTION` (18), ou `REVOKE`/`GRANT` sobre as mesmas 6 funções. O desfazer cobre tudo, ACL de `anon` inclusive (a ACL é comparada como conjunto com o grantor; `pos=iguais:32`) |
| Cadeias do 50-10 num **clone** (pin e revisão simulados só lá; `p46apply`/`efdeploy`/`push` trocados por `echo`) | Caminho esperado: Task 1 verify verde; apply com HEAD = pin sai `WOULD_APPLY`; commit de planning depois do pin faz o apply sair `HEAD != PIN` e o deploy sair `WOULD_DEPLOY` (WR-03 ok); push sai `enumeracao ok: 52 commit(s) … codigo coberto por 50-REVIEW-ACESSO-2.md … contido no apply`. Sem falso vermelho. Negativos: ACESSO-3 não rastreado é recusado (`REVISAO NAO COMMITADA OU REESCRITA`); ACESSO-2 modificado na árvore é recusado no deploy e no enumerador (`REVISAO MODIFICADA NA ARVORE`) |
| `conferirCarimbos`/`veredito` da varredura (unidade) | antes carimbado com a expansão: recusa; sem carimbo: recusa; depois parcial: recusa; vermelho/vermelho em arquivo reescrito: `INVESTIGAR`; em arquivo intocado: `pre-existente`. **Verde→TIMEOUT dá `INCONCLUSIVO`**, que é o WR-02 abaixo |
| Migrations 0002..0004 desde `884a41d1` | `git diff --quiet 884a41d1 HEAD -- supabase/migrations`: inalteradas |
| WR-03, «código por outro canal» | Não há symlink no índice (nenhum modo 120000). O fechamento de imports das 5 EFs (`efdeploy --dry-run`) é todo rastreado e fica sob `supabase/` ou `src/`, dentro do clean-tree. `deno.json` é rastreado. Nenhum script lê código de `.planning/` (só o enumerador lê a revisão). `supabase/functions/_shared` está coberto pelo `-- . ':!.planning'` |

## Warnings

### WR-01: a saída (i) do WR-03, «revert com commit novo», destrava o deploy e trava o push para sempre

**File:** `.planning/phases/50-acesso-do-recrutador/50-10-PLAN.md:224`; `scripts/p50_enumera.cjs:176-185`
**Issue:** Na recusa `CODIGO MUDOU DEPOIS DO PIN`, a saída (i) do plano diz: «revert that commit with a NEW commit, so the
code at HEAD equals the pin again, and re-run the same deploy command». O deploy passa, porque compara só código. O push,
porém, roda o enumerador com `--revisoes` e `--aplicado`, que julgam **por commit**. O commit intruso fica fora do
`reviewed_head`, e o revert também (com assunto `Revert "…"`, fora do padrão). Os dois saem `ALHEIO`, e o push dá
`COMMIT ALHEIO: PARAR`. É a mesma classe de defeito que o WR-03 consertou («recusa sem caminho de saída escrito»), só que
mudou de lugar: as migrations e as EFs já estão no ar, e o repositório não alcança PROD (`origin/main..HEAD` não esvazia;
memória «Esta via NÃO passa pelo git»).
**Prova (clone em scratchpad):** commit `fix(50-10): stray` em `scripts/p50_enumera.cjs` → deploy
`CODIGO MUDOU DEPOIS DO PIN`; `git revert` → deploy `WOULD_DEPLOY`; push →
`ALHEIO[codigo depois do reviewed_head 0e671953 …] fix(50-10): stray` /
`ALHEIO[codigo com assunto fora do padrao] Revert "fix(50-10): stray"` / `COMMIT ALHEIO: PARAR`.
**Fix:** Escolher uma das duas e escrever no plano:
- tirar a (i) e deixar só a (ii): nova rodada de revisão e decisão do operador;
- ou dar ao enumerador uma regra explícita para o par anulado. Um commit `codigo` fora do pin só passa se o código no
  `--ate` for igual ao do pin, e se o intervalo de commits depois do pin tiver diff de código vazio
  (`git diff --quiet "$PIN" "$S" -- . ':!.planning'`, que o comando do push já roda), com uma linha
  `anulado-depois-do-pin` na enumeração.

Em qualquer das duas, o texto da (i) tem de dizer o que acontece no push.

### WR-02: um INCONCLUSIVO num smoke REESCRITO ainda passa no portão da varredura depois do apply (WR-01 do ACESSO-1 fechado em parte)

**File:** `scripts/p50_varredura.cjs:240-241`; `.planning/phases/50-acesso-do-recrutador/50-10-PLAN.md:185`, `:196-197`
**Issue:** O WR-01 fez vermelho→vermelho num arquivo alterado desde a base virar `INVESTIGAR`, porque o smoke reescrito
**tem** de ficar verde com a expansão. Só que `veredito()` responde `INCONCLUSIVO` antes de olhar se o arquivo é
reescrito, sempre que uma das duas rodadas deu TIMEOUT (55P03/57014/40001, já repetido uma vez em `executar`).
`INCONCLUSIVO` não reprova (`relatorio()` só sai com 1 para REGRESSAO/INVESTIGAR). A regex do verify
(`regressoes=0 investigar=0$`) passa, e a linha impressa é «varredura antes x depois: sem regressao». O «re-run once and
reported» do Step 3 está só na prosa. Um dos 9 reescritos (p44, p47, sec05_08…) que dê TIMEOUT duas vezes depois do apply
sai «sem regressão» sem nunca ter provado o efeito esperado. Um timeout causado pelas policies novas seria justamente a
regressão (`statement_timeout` de 8 s em `authenticated`).
**Fix:** Em `veredito()`, quando houver TIMEOUT num arquivo `alteradoDesdeBase(f)`, devolver `INVESTIGAR` (ou uma classe
que reprove). `INCONCLUSIVO` não-reprovador fica só para arquivo intocado (o p45 do must_have). No verify, imprimir a lista
de inconclusivos na linha verde.

### WR-03: `capturar()` segue cega aos corpos e ACL das 18 funções e à opção da vista, e agora o ensaio do DESFAZER também as reescreve (WR-10 do ACESSO-1, alcance maior)

**File:** `scripts/p50_ensaio.cjs:301-311`
**Issue:** Sem mudança desde o ACESSO-1. A checagem de persistência compara ledger, helper, policies de `public`,
`usuarios_rh` e borda. Não compara corpos/ACL das 18 funções nem `reloptions` de `v_analises_presas`. Desde 6ff57636, mais
dois ensaios reescrevem esses objetos: o ida+volta do Step 1 e) e o reverso ao vivo do Step 3. O reverso ao vivo roda o
DESFAZER contra o estado aplicado (18 `CREATE OR REPLACE` + `REVOKE`/`GRANT` + `ALTER VIEW`). Se um commit no meio
escapasse da guarda `p50.tx`, as policies seriam acusadas, mas as funções e a ACL de `anon` voltariam ao corpo antigo sem
nenhum `PERSISTIU`. A guarda `p50.tx` e a atomicidade da via tornam isso improvável. Mesmo assim, o detector não olha para
o objeto mais reescrito.
**Fix:** Acrescentar a `capturar()` a impressão digital do próprio `p50_desfazer.cjs`: `sqlImpressoes(alvosPorForma())`,
a mesma expressão e o mesmo escopo por forma. Uma linha, sem lista literal. Com isso, PERSISTIU cobre as 32.

## Info

### IN-01: o PRÉ-PORTÃO do desfazer só exige «≥ 1 impressão diferente»; um desfazer corretivo por cima de um estado alterado depois apaga a alteração e sai verde

**File:** `supabase/tests/p50_desfazer_expansao.sql:61-68`; `scripts/p50_desfazer.cjs` (`blocoFp('pre', …)`); `50-10-PLAN.md:178`
**Issue:** O pré-portão recusa só quando o estado já é igual ao capturado. Nada confere que o estado vivo é o
**expandido**. Se um conserto posterior redefinir uma das 18 funções, a migration corretiva passa no pré, restaura o corpo
pré-expansão por cima do conserto e passa no pós (que compara com a captura). É a mesma classe de risco que o WR-04
corrigiu (restaurar texto velho por cima de consertos), em escala menor e só sob checkpoint do operador. A regex do
Step 1 e) também aceita `pre_diferentes=1/32`, embora o ida+volta tenha de dar 32/32 por construção.
**Fix:** Embutir também as impressões esperadas DEPOIS da expansão (capturadas no ensaio de ida) e exigir no pré que o vivo
as iguale, objeto a objeto, com a lista dos divergentes. No Step 1 e), exigir `pre_diferentes=(\d+)/\1`.

### IN-02: com a troca de papel do WR-08, o ramo do ADMINISTRADOR de `save_entrevista_guia_edits` deixou de ser exercitado por qualquer portão recorrente

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:1490`
**Issue:** Antes, por acidente, o positivo de (i) rodava o ramo do administrador nessa RPC, que lê o papel de `usuarios_rh`.
Agora roda o do recrutador, e (i) não tem ator administrador. Uma regressão que recuse o administrador ali (sem tocar no
helper) passa no smoke e nas 25 mutações. O byte-a-byte da cauda nos pós-portões cobre o apply de hoje, não o portão
recorrente.
**Fix:** Repetir a sonda `ativo` desta RPC com a linha de `a_ativo` como `administrador` (rótulo
`admin.save_entrevista_guia_edits/3`), mais uma mutação que recuse `v_role = 'administrador'` e tenha de morder.

### IN-03: o «Undo» manda redeployar as EFs «from `refs/gsd/50-expansao/base`», mas o `efdeploy.cjs` lê do disco e o plano não diz como pôr esses arquivos no disco

**File:** `.planning/phases/50-acesso-do-recrutador/50-10-PLAN.md:118-119`
**Issue:** Pôr a versão da base no disco exige sujar a árvore (o mesmo `git status` que as cadeias proíbem) ou destacar
HEAD. Não há cadeia escrita (revisão, pin, árvore limpa) para esse deploy. As versões da base também não têm os consertos
WR-06/WR-07 (voltam a aceitar candidatura morta para dono e administrador, que é o estado de antes da fase). Toda ordem
intermediária é monótona (nenhum estado fica mais largo que o expandido), por isso é Info.
**Fix:** Escrever o procedimento, por exemplo `git worktree add "$TMPDIR/p50_base" refs/gsd/50-expansao/base` e
`node "$TMPDIR/p50_base/efdeploy.cjs" <slug>` (o `efdeploy` resolve `ROOT` por `__dirname`), e registrar que as versões
da base não têm WR-06/WR-07.

### IN-04: o leitor de forma do desfazer (`alvosPorForma`) só enxerga instrução em coluna 0 e em MAIÚSCULAS

**File:** `scripts/p50_desfazer.cjs:68-76`, `:96`
**Issue:** `alter policy …` em minúsculas, ou uma instrução de topo indentada, escapa tanto de `FORMAS_COBERTAS` quanto da
extração de alvos. O desfazer sairia incompleto sem recusar, e o pós-portão só compara os alvos que achou. A conferência
`creates === funcoes.size` cobre só funções. Medido hoje com um tokenizador (comentários, strings e `$…$` removidos): toda
instrução de topo de 0002..0004 está em coluna 0 e em maiúsculas. Sem ofensor; o portão é estreito (CLAUDE.md §Portões:
«padrão que não enxerga o idioma»).
**Fix:** Usar `/^\s*(alter|comment|…)\b/i` nas duas varreduras, ou o tokenizador (tirar comentários, strings e `$…$` e
dividir em `;`) e recusar toda instrução fora das formas.

## Itens do 50-REVIEW-ACESSO-1 (estado; os abertos não são recontados acima, salvo o WR-10, re-levantado como WR-03)

| id ACESSO-1 | estado | evidência |
|---|---|---|
| WR-01 varredura verde pelo motivo errado | **fechado em parte** (7eba33ec, e176bf1c): vermelho/vermelho em arquivo reescrito vira INVESTIGAR; carimbo `ledger_inicio/fim` e recusa no `--comparar`; JSON apagado antes da rodada; `&&` no verify. Resíduo: TIMEOUT em reescrito → WR-02 | unidade de `conferirCarimbos`/`veredito`; ensaio 27/9/1/0 |
| WR-02 revisão não commitada nas cadeias | **fechado** (6ecf0454, 419927a6) | clone: -3 não rastreado e -2 modificado recusados; caminho esperado verde |
| WR-03 deploy exigia HEAD = pin | **fechado** (9038e04a). Resíduo: a saída (i) → WR-01 | clone: commit de planning depois do pin faz o deploy sair `WOULD_DEPLOY` |
| WR-04 sem artefato de desfazer | **fechado** (6ff57636, c5bd3614). Resíduos → IN-01, IN-03, IN-04 | `--conferir` 32/32; ida+volta `pre_diferentes=32/32,pos=iguais:32`, `vistas=igual`; guarda testada |
| WR-05 filtro de `usuarios_rh` sem teste | **fechado** (bbba7996) | 15/15 mutações (3 predicados × 5 EFs) mordem; sonda D/E |
| WR-06 EFs alcançavam candidatura morta | **fechado** (f6d8f559), escopo «todos os papéis» por decisão do operador (2026-10-06, «1») | 10/10 mutações mordem; predicado = ramo rh de `rh_le_candidaturas` |
| WR-07 consolidar sem cross-check `vaga_id` | **fechado** (7812eda4) | mutação morde (consolidar e gerar-guia) |
| WR-08 positivo de (i) no ramo do administrador | **fechado** (c99c8c32). Resíduo → IN-02 | M24 morde; `ativo.save_entrevista_guia_edits/3>ok` |
| WR-09 D-23 podia cair para estrutural | **fechado** (524f8ca0, 0e671953). O verify exige `07:d23=comportamental>e:42501`; M25 morde e, por isso, o controle do runner também exige o comportamental | ensaio: `07:d23=comportamental>e:42501` |
| WR-10 `capturar()` sem corpos | **aberto**, com alcance maior → WR-03 | `p50_ensaio.cjs` sem mudança desde 884a41d1 |
| IN-01 helper ignora o papel (resíduo de 1 h nas 11 de escrita) | **aberto**, para disposição do operador no (a) | — |
| IN-02 sonda de posse com um só idioma | **aberto** (o D novo cobre `usuarios_rh`, não `created_by`) | — |
| IN-03 (j) sem `pg_views`; 9 policies só-de-papel | **aberto** | — |
| IN-04 runners de mordida dos legados fora do repo | **aberto** | — |
| IN-05 filas e Forma A mostram candidatura morta | **aberto**. Agora as EFs recusam a morta: um item da fila de revisão de candidatura morta abre e o consolidar responde 403. População 0 hoje | — |
| IN-06 `p50.evidencia` em nível de sessão | **aberto, sem efeito medido**: cada requisição da Management API pega backend novo (3 pids distintos, `p50.*` não definidas) | sonda só-leitura |
| IN-07 `v_uid` morto; leitura antes da guarda | **aberto** (migrations inalteradas) | — |
| IN-08 delta do Vitest por nome; `deno test` fora da cadeia do deploy | **aberto**. Mais relevante agora que as EFs mudaram: o `deno test` das 5 (146/0) rodou nesta revisão, mas não está no 50-10 | — |

## Disposição sugerida

Nenhum crítico: o portão `critical: 0` do Task 1 fica satisfeito. Antes do Task 2, recomendo:
- **WR-01:** decidir e escrever o que acontece no push depois da saída (i), ou retirá-la. Muda só o plano/enumerador.
- **WR-02:** o reescrito com TIMEOUT tem de reprovar. Muda o script.
- **WR-03:** uma linha em `capturar()`.

Qualquer um dos três consertos muda código ou o plano depois deste `reviewed_head` e exige `50-REVIEW-ACESSO-3`. Se o
operador preferir seguir sem eles, a aceitação vai para o SUMMARY, com autor e data, junto com os IN.

---

_Reviewed: 2026-10-06T04:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
