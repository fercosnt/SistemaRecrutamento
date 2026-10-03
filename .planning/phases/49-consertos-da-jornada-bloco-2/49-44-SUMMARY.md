---
phase: 49-consertos-da-jornada-bloco-2
plan: "44"
subsystem: database
tags: [rls, security-definer, restrictive-policy, rpc, smoke, mutation-runner, react-query, wr-07, jorn-41, d-21, d-48, d-52, d-53, d-56, d-58]
status: complete
gap_closure: true

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "43"
    provides: "aviso do sinal da etapa SJT na Decisão Final (`decisao-sjt-sinal-revisao`, CR-02) publicado; WR-07 registrado como pendência"
provides:
  - "migration 20261003000001 (NÃO aplicada): RPC `ler_resposta_caso_aberto_sjt(uuid)` SECURITY DEFINER com predicado WR-04 e guarda fail-closed; helper `caso_aberto_sjt_enviado(uuid)`; três políticas RESTRICTIVE `cand_congela_caso_aberto_{ins,upd,del}` TO authenticated; `SET LOCAL lock_timeout 3s / statement_timeout 5s` no topo; pré e pós-portão"
  - "smoke `p49_44_resposta_caso_aberto_smoke.sql` (envelope P49C1, cláusulas a..h + z, esperado 9, fixtures A..G povoadas), verde no ensaio em PROD que aborta"
  - "runner `scripts/p49_44_mutacoes.cjs`: controle verde; 8/8 mutações mordem na letra e no rótulo esperados; nada persistiu"
  - "front: `getRespostaCasoAbertoSjt` + `SITUACOES_RESPOSTA_CASO_ABERTO` (contrato validado), componente `RespostaCasoAbertoSjt` (marcador `decisao-sjt-resposta-caso-aberto`, chunk lazy DecisaoFinalPage) montado só no aviso da SJT"
  - "ref `refs/gsd/49-44/base` = 46f2a52d (diff_base da re-revisão do 49-45)"
affects: [49-45 (re-revisão bloqueante, checkpoint (a)/(c), apply + push), 49-VERIFICATION re-verificação do JORN-41, primeiro plano que rodar db:types depois do apply (retira o cast estreito)]

actuals:
  tokens: 28000
  tasks: 3
  commits: 3
  plan_head_before: 46f2a52d434f814a66667dc4c547a18acc0778c5
  plan_head_after: 25ee0f94622aca5b1f74284b4855ea3602772ee9

tech-stack:
  added: []
  patterns:
    - "Congelamento por política RESTRICTIVE aditiva (TO authenticated) com helper plpgsql SECURITY DEFINER que só responde ao próprio titular — sem tocar a policy viva do autosave"
    - "Sondas de RLS no smoke com a MESMA instrução para controle e sonda (constantes de texto + EXECUTE … USING), escrevendo T nos controles e T2 ≠ T nas sondas, para que o md5 prove sozinho"
    - "Runner de mutação que injeta a mutação ENTRE a migration intacta e o smoke, numa requisição com lock_timeout/statement_timeout, conferindo letra + rótulo e o vazio final em PROD"
    - "Leitura de texto pessoal sob demanda: nível de cima só com useState; filho com useQuery staleTime 0 / gcTime 0 / retry false"

key-files:
  created:
    - supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql
    - supabase/tests/p49_44_resposta_caso_aberto_smoke.sql
    - scripts/p49_44_mutacoes.cjs
    - src/features/decisao/components/RespostaCasoAbertoSjt.tsx
    - src/features/decisao/components/__tests__/RespostaCasoAbertoSjt.test.tsx
  modified:
    - src/features/avaliacao/services/scoresRhService.ts
    - src/features/avaliacao/services/__tests__/scoresRhService.test.ts
    - src/features/decisao/components/ConsolidacaoDashboard.tsx
    - src/features/decisao/components/__tests__/ConsolidacaoDashboard.test.tsx

key-decisions:
  - "Nenhuma decisão nova do executor: as escolhas 1–7 do planejador (RPC e não coluna/policy; predicado WR-04 copiado; só depois do envio; congelar por RESTRICTIVE; estados sem causa inventada; sem cache; sem updated_at) foram implementadas como escritas e seguem vetáveis pelo operador no checkpoint do 49-45"
  - "Medido (não decidido): sob M7 o upsert continua dando 42501 — a WITH CHECK da `_ins` intacta vale para a linha proposta também no caminho ON CONFLICT DO UPDATE; a sonda que pega a `_upd` é o UPDATE puro. Registrado no cabeçalho do smoke"
  - "R1, R2 e R3 (o texto gravado pode não ser o analisado) ficam nomeados e NÃO consertados; disposição do operador no 49-45 (c). Nenhum artefato afirma fidelidade"

patterns-established:
  - "RED de componente que importa constante ainda inexistente: ler a constante dentro do teste (não no escopo do describe/it.each), para reprovar na asserção e não na coleta (evita INVALID_RED fixture_or_load_failure)"

requirements-completed: []  # JORN-41 compartilhado com o 49-45; só o verificador marca (WR-05 do REVIEW-GAPS-8)

coverage:
  - id: D1
    description: "RPC ler_resposta_caso_aberto_sjt: dono e administrador leem o texto byte a byte; RH alheio, sem claims, candidato e candidatura inexistente (rh) recusados com 42501; anon sem EXECUTE (ACL distinguido da guarda pela mensagem); estados sem_resposta_enviada / indisponivel / removida_pelo_titular / encerrada"
    requirement: JORN-41
    verification:
      - kind: integration
        ref: "node scripts/p49_44_mutacoes.cjs (CONTROLE: migration + smoke p49_44 cláusulas a..e, numa requisição que aborta em PROD)"
        status: pass
      - kind: integration
        ref: "mutações M1 (d), M2 (d), M3 (e), M5 (a) — scripts/p49_44_mutacoes.cjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Congelamento do caso aberto enviado (três RESTRICTIVE + helper) com controles povoados, outro `teste` livre e o motor de exclusão ainda redigindo; nenhum caminho novo de leitura direta"
    requirement: JORN-41
    verification:
      - kind: integration
        ref: "smoke p49_44 cláusulas (f), (g), (h) no CONTROLE do runner"
        status: pass
      - kind: integration
        ref: "mutações M4 [upsert], M6 [g_ins], M7 [upd], M8 [del] — scripts/p49_44_mutacoes.cjs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Serviço getRespostaCasoAbertoSjt com contrato validado e componente RespostaCasoAbertoSjt (sob demanda, quatro estados, erro com nova tentativa, ocultar, nada desabilitado) montado só no aviso da SJT"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "src/features/avaliacao/services/__tests__/scoresRhService.test.ts; src/features/decisao/components/__tests__/RespostaCasoAbertoSjt.test.tsx; src/features/decisao/components/__tests__/ConsolidacaoDashboard.test.tsx"
        status: pass
      - kind: unit
        ref: "CI=true npx vitest run (219 arquivos, 2408 testes)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Marcador `decisao-sjt-resposta-caso-aberto` num chunk lazy (DecisaoFinalPage-*.js) e ausente no build da base — o portão de publicação do 49-45 morde"
    requirement: JORN-41
    verification:
      - kind: other
        ref: "verify 3 da Task 3 (git archive da base + vite build; npm run build)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Conferência visual do botão e do texto dentro do bloco âmbar, na Decisão Final em PROD"
    verification: []
    human_judgment: true
    rationale: "Só existe depois do apply e do push do 49-45; nenhum teste deste plano olha a tela publicada"

duration: 18min
completed: 2026-10-03
---

# Phase 49 Plan 44: o RH lê o texto do caso aberto da SJT na Decisão Final (WR-07) — Summary

**RPC SECURITY DEFINER com o predicado WR-04 de `rh_le_scores` dá ao RH dono da vaga (e ao administrador) o texto gravado da resposta do caso aberto, dentro do aviso âmbar da SJT, sob demanda e sem cache; três políticas RESTRICTIVE congelam o caso aberto depois que a nota nasce; tudo provado em PROD por ensaio que aborta (smoke 9/9, 8/8 mutações mordem) e nada aplicado nem publicado.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-10-03T13:53:36Z
- **Completed:** 2026-10-03T14:11:37Z
- **Tasks:** 3/3
- **Files:** 9 (5 criados, 4 modificados)

## Accomplishments

- Migration `20261003000001` escrita e ensaiada, NÃO aplicada: RPC de leitura do RH, helper do congelamento, três políticas RESTRICTIVE, ACL com `anon` nomeado, pré e pós-portão, `SET LOCAL lock_timeout = '3s'` / `statement_timeout = '5s'` antes do primeiro `CREATE POLICY`, e o cabeçalho com «POR QUE CONGELAR» e «O QUE O CONGELAMENTO NÃO FECHA» (R1, R2 com `AI_TOTAL_BUDGET_MS` ~140 s, R3, e as rotas (i)/(ii)/(iii) com «menos o intervalo entre as duas escritas»).
- Smoke de 9 cláusulas sobre 7 fixtures sintéticas povoadas; a última instrução é `SELECT json_build_object('smoke', 'p49_44_resposta_caso_aberto', 'pass', …, 'esperado', 9, …) AS resultado;`, que é o contrato que o 49-45 consome.
- Runner de mutações: controle verde e 8/8 mordem, duas rodadas completas e iguais; depois de cada uma, PROD sem as funções, sem as políticas e sem a linha do ledger.
- Front: botão «Ler a resposta do caso aberto» só dentro de `decisao-sjt-sinal-revisao`, com busca sob demanda, quatro estados, erro com «Tentar de novo», «Ocultar a resposta», `role="status"` e `aria-controls`; nada desabilitado.

## Medições em PROD (Task 1, Passo 1; só leitura, `set transaction read only`; só números e nomes)

| Medida | Valor | Premissa |
|---|---|---|
| policies de `respostas_avaliacao` | `cand_escreve_respostas_aval` (PERMISSIVE, ALL, {public}); `cand_le_respostas_aval` (PERMISSIVE, SELECT, {public}) | igual |
| `relrowsecurity` / `relforcerowsecurity` | true / **false** | igual |
| dono da tabela | postgres | — |
| `anonimizar_candidato` | 1 sobrecarga `(uuid,boolean)`, `prosecdef = true`, dono postgres | igual |
| triggers da tabela | só os dois internos de FK (`RI_ConstraintTrigger_c_197804/5`); nenhum de `updated_at` | escolha 7 confirmada |
| vagas com `created_by` | 6 de 15 (6 vivas) | — |
| `scores_candidato` `sjt`/`caso_aberto` | 1 linha; 0 com `instrucao_ao_modelo` em `motivos_revisao` | — |
| autosaves `sjt_caso_aberto` | 1 total: 1 com `texto` string, 0 com `redigido`, 0 sem texto | — |
| `pg_roles.rolconfig` | `authenticated` statement_timeout=8s; `authenticator` statement_timeout=8s, lock_timeout=8s; `anon` statement_timeout=3s | registrado no cabeçalho |
| RPC / helper / ledger `20261003000001` | ausentes / ausentes / 0 | precondição cumprida |
| `SET LOCAL` pela Management API | `lock_timeout` = 3s e `statement_timeout` = 5s tomam efeito na requisição (medido) | o limite no arquivo vale no apply byte a byte |
| `candidatura_encerrada` | `(etapa_processo, status_candidatura)`, chamado na fixture E | D-21 |

## Task Commits

1. **Task 1 (tracer): RPC, serviço e botão** — `fe9c4e2d` (feat). Ensaio: «ensaio verde e nada persistiu». Sanidade do instrumento: a mesma requisição com o gate trocado para 5 reprovou com `P49C FAIL (gate): pass = 4`, então as 4 cláusulas incrementaram de fato.
2. **Task 2: congelamento, smoke completo e runner** — `981445c2` (feat).
3. **Task 3 (tdd): tela completa e contrato do serviço** — `25ee0f94` (feat). RED sem commit, porque o plano o deixa opcional e um commit RED subiria o `tsc` acima de 89. A saída está registrada abaixo.

**Base:** `refs/gsd/49-44/base` = `46f2a52d434f814a66667dc4c547a18acc0778c5`.

## Mutações (runner, Task 2): letra, rótulos completos e duração de cada requisição

| Rodada | Inversão | Reprovou em | Rótulos (g) | Duração (rodada 1 / 2) |
|---|---|---|---|---|
| CONTROLE | — | sentinela, sem FAIL | — | 883 / 696 ms |
| M1 | RPC sem a posse do `rh` | (d) | — | 1201 / 658 ms |
| M2 | RPC sem a guarda de papel | (d) | — | 879 / 1030 ms |
| M3 | RPC sem a condição de envio | (e) | — | 721 / 887 ms |
| M4 | helper sempre falso | (g) | upsert,upd,del,md5,g_ins | 917 / 883 ms |
| M5 | `GRANT EXECUTE` da RPC a anon | (a) | — | 799 / 807 ms |
| M6 | `_ins` sem `AS RESTRICTIVE` | (g) | g_ins | 721 / 703 ms |
| M7 | `_upd` sem `AS RESTRICTIVE` | (g) | upd,md5 | 1335 / 654 ms |
| M8 | `_del` sem `AS RESTRICTIVE` | (g) | del,md5 | 735 / 832 ms |

Nenhum `LOCK TIMEOUT` e nenhum `STATEMENT TIMEOUT`. Cada requisição ficou bem abaixo dos 8 s de `authenticated`. A duração inclui a ida e a volta HTTP, então a posse real do lock é menor. Leitura final só-leitura: `{"sem_rpc":true,"sem_helper":true,"politicas":0,"ledger":0}`. Depois de tudo, PROD tem 2 policies em `respostas_avaliacao`, 0 `cand_congela_*`, e o ledger não tem `20261003000001`.

**Observação medida:** sob M7 o upsert segue dando 42501. A WITH CHECK da `_ins` intacta vale para a linha proposta também no caminho `ON CONFLICT DO UPDATE`, então a sonda que pega a `_upd` é o UPDATE puro. O plano previa que `upsert` poderia aparecer junto, e não apareceu. O runner exige só o rótulo esperado (`upd`), que apareceu.

## Varredura D-56 (forma)

`varredura D-56: 0 achados tocam os objetos, todos classificados; populacao da forma = 326 linhas`. Os dois smokes que citam `respostas_avaliacao` foram lidos à mão. `p45_motor_exclusao_smoke.sql` e `p49_motor_antes_depois.sql` escrevem e contam como `postgres` e não têm nenhum `SET ROLE`, então o congelamento (`TO authenticated`) não muda o que eles asseram. A classificação está no cabeçalho do smoke.

## TDD (Task 3)

- **RED:** 22 testes-alvo falharam por asserção, e os 17 que já existiam seguiram verdes (`Tests 22 failed | 17 passed (39)`, exit 1). Exemplos: `situacao fora da lista → DATABASE_ERROR` («expected { situacao: 'apagada', … } to match object { code: 'DATABASE_ERROR' }»); `as nove frases pt-BR` («expected undefined to deeply equal { …(9) }»); `disponivel sem texto string não vazio (null)` («promise resolved … instead of rejecting»). `gsd-tools check tdd-red-evidence` deu **RED_EVIDENCE_OK** (`target_test_failed`) para os dois alvos registrados (serviço e cópia do componente).
  - A primeira rodada RED era **INVALID_RED** nos dois arquivos de componente: o `COPY.*` era lido no escopo do `describe`/`it.each` e o arquivo quebrava na coleta. Corrigido com a leitura da constante dentro do teste, e a rodada seguinte reprovou nas asserções.
  - O reporter TAP do vitest não emite o trailer `# tests/# pass/# fail` que o verificador lê. O trailer foi acrescentado ao registro, contado mecanicamente das linhas `ok`/`not ok` da própria saída (39/17/22), com nota no registro.
- **GREEN:** `Tests 39 passed (39)` nos três arquivos, e a suíte inteira com 219 arquivos e 2408 testes, exit 0.
- **Mutação de front:** o filho com `useQuery` montado sem esperar o clique fez o vitest sair com **exit 1**: «fechado por padrão: o serviço NÃO é chamado», «expected "vi.fn()" to not be called at all, but actually been called 1 times». A mutação foi desfeita, o md5 antes e depois é `586829e8…` byte-igual, e o teste voltou a exit 0.
- **TDD Gate Compliance:** não há commit `test(49-44)` antes do `feat(49-44)` da Task 3. O plano deixa o RED commit opcional (o plano é `type: execute`, com a task `tdd="true"`), e a evidência RED está acima.

## Verificações finais

- Task 1: estático «estatico ok (tracer)»; ensaio «ensaio verde e nada persistiu»; vitest dos 2 arquivos verde; `ConsolidacaoDashboard.test.tsx` sem diff na Task 1.
- Task 2: «estatico ok (congelamento)»; «contrato de saida ok: resultado.{smoke,pass,esperado=9} na ultima instrucao»; «controle verde; 8/8 mutacoes mordem; nada persistiu»; varredura D-56 acima.
- Task 3: vitest inteiro exit 0, com `RespostaCasoAbertoSjt.test.tsx`, `scoresRhService.test.ts`, `ConsolidacaoDashboard.test.tsx` e `forbidden-strings.grep.test.ts` coletados (`vitest list`). **`tsc=89`**, que é ≤ 89. «marcador em chunk lazy: build/assets/DecisaoFinalPage-Dn0GkCL-.js; ausente na base 46f2a52d… (portao morde)». «invariantes ok: rotulo e tipos intactos, sem HTML cru, sem cache, allowlist e recibo verdes».
- `git diff refs/gsd/49-44/base -- …/ConsolidacaoDashboard.test.tsx`: 0 linhas removidas, só acrescentadas. O `within` entrou numa linha de import própria para não alterar a existente.
- `supabase/functions/_shared/sinal-revisao.ts` e `database.types.ts` estão byte-iguais à base.
- **Nenhum push.** `git log --oneline origin/main..HEAD` lista `25ee0f94`, `981445c2`, `fe9c4e2d` (e `46f2a52d`, o commit dos planos). A publicação (apply da migration, push do front) é do **49-45**.
- Nenhuma Edge Function invocada, nenhuma instalação de pacote, e a migration não foi aplicada.

## Decisions Made

Nenhuma decisão nova. As escolhas do planejador foram implementadas como escritas e vão ao operador no checkpoint do 49-45: (a) os resíduos aceitos (T-49-44-12) e (c) R1–R3 (T-49-44-13).

## Deviations from Plan

Nenhuma pelas Regras 1–4. Ajustes de execução, todos dentro do escopo:

1. **Cláusula (a) contada uma vez, com as duas metades.** A metade comportamental (chamada sob `anon`) e a metade de catálogo (`has_function_privilege` da RPC e do helper) são julgadas juntas, antes de (b), dentro do mesmo bloco. A ordem do julgamento é a..h, z, como o plano pede.
2. **O componente mostra o título «Resposta do candidato ao caso aberto» acima do texto** no estado `disponivel`. É uma das nove frases que a Task 3 exige exportar, e o teste asserta o render.
3. **RED reestruturado** (descrito em TDD): de INVALID_RED para RED_EVIDENCE_OK sem mudar o que cada teste asserta.
4. **Primeira tentativa de commit da Task 1 não fez stage de nada.** O zsh não divide uma variável com vários caminhos, e o `git add` falhou sem tocar o índice. Repetido com um array de caminhos explícitos, e nada de outra janela entrou em commit nenhum.

**Total deviations:** 0 auto-fixed (Regras 1–3); 0 arquiteturais. **Impact:** nenhum no escopo.

## Issues Encountered

Nenhum bloqueante. O desvio esperado de M7 (sem `upsert` na lista) está explicado acima e não muda o veredito.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície fora do `<threat_model>`. A RPC nova é a T-49-44-01/02/03, as políticas são a T-49-44-04/05/06, e o helper é a T-49-44-07.

## Pendências para o 49-45

- Re-revisão bloqueante com `diff_base` = `refs/gsd/49-44/base` (46f2a52d).
- Checkpoint (a): as escolhas 1–7 e o resíduo T-49-44-12. Checkpoint (c): R1, R2 e R3, que vão ao operador sem disposição presumida.
- Apply: `node p46apply.cjs migrate supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql` (md5 do arquivo hoje: `8cb2400f0d9df453301cc6ad5e0c0302`); depois `node p46apply.cjs run supabase/tests/p49_44_resposta_caso_aberto_smoke.sql`, esperando `resultado.pass === resultado.esperado === 9`; e então o push.
- Registrar no `STATE.md` que o cast estreito de `getRespostaCasoAbertoSjt` sai no primeiro `npm run db:types < /dev/null` depois do apply.
- O JORN-41 é declarado também pelo 49-45. A marcação de completo fica com quem fechar por último (shared-ID gate).

## Next Phase Readiness

Pronto para o 49-45: tudo o que ele publica existe, está testado e foi ensaiado em PROD sem deixar rastro.

## Self-Check: PASSED

- FOUND: os 5 arquivos criados e os 4 modificados; FOUND: commits `fe9c4e2d`, `981445c2`, `25ee0f94`; FOUND: `refs/gsd/49-44/base` = 46f2a52d.
- PROD (só leitura, depois de tudo): `sem_rpc=true`, `sem_helper=true`, `policies_total=2`, `congela=0`, `ledger=0`.

## Rodada de conserto (REVIEW-GAPS-8)

**Quando:** 2026-10-03, antes do apply do 49-45. **Fonte:** `49-REVIEW-GAPS-8.md` (0 crítico, 6 WARNING, 9 INFO).
**Disposição, de quem:** decisão do operador em 2026-10-03, verbatim «Aceito», à recomendação do orquestrador:
(a) as escolhas do planejador do 49-44 ficam aceitas; (c) publicar com os resíduos R1–R4 REGISTRADOS (rota (iii)), sem fechar
nenhum agora; consertar WR-01, WR-02, WR-03, WR-04 e WR-06 antes do apply. O WR-05 já estava consertado (`3a06c102`).
Esta seção registra o que foi feito. A disposição formal de cada achado no 49-45-SUMMARY continua sendo do executor do 49-45.

| Achado | Disposição | Commit(s) |
|---|---|---|
| WR-01 | Consertado. O estado passou a ser `removida`, neutro, com a mesma detecção (`respostas ? 'redigido'`). A cópia da tela agora é «O texto desta resposta não está mais disponível.». O cabeçalho (ESTADOS), o `COMMENT ON FUNCTION`, o docblock do serviço e o da tela dizem por que o estado é neutro: o motor grava o MESMO marcador no direito do titular e na purga de retenção (`v_ramo_purga`, `purgar-retencao/index.ts:520`). Dois testes novos: o serviço recusa o literal antigo como fora do contrato, e a frase de `removida` não pode atribuir causa | `756a951e` (código), `ea6a45e9` (PLAN) |
| WR-02 | Consertado. A sonda nova fica em (d): `sub` válido (o dono da vaga) com `app_metadata` vazio deve dar 42501. A mutação M9 troca `coalesce(v_role, '') NOT IN` por `v_role NOT IN`. A sonda ficou DENTRO de (d), e não numa cláusula nova, porque é mais uma negativa da guarda sobre a mesma fixture. Assim **o esperado segue 9**, e nenhum consumidor do `esperado === 9` (49-45 Task 2, `<verify>` 2 e must_haves) muda | `10e6ee18`, `ea6a45e9` |
| WR-03 | Consertado no texto. A rota (i) fecha R1 e a edição na mesma aba só ENQUANTO o envio está pendente. Ela NÃO fecha a edição na mesma aba depois que o cliente desiste da resposta da EF. Medido em `SjtCasoAbertoScreen.tsx`: o `catch` em `:146-152`, o `finally { setSubmitting(false) }` em `:153-155`, e o `Textarea` em `:233-241` sem `disabled`/`readOnly`. Corrigido no cabeçalho da migration, na escolha 4, no item (c) do 49-45 e na linha do STATE da Task 3 do 49-45 | `e43efa00`, `1cc8e5b9`, `ea6a45e9` |
| WR-04 | Consertado no texto. **R4** está nomeado no cabeçalho, na escolha 4, na T-49-44-13, no item (c) e na linha do STATE do 49-45: depois da linha de score, um cliente modificado chama a EF com outra pergunta de caso aberto, e nasce uma segunda nota sobre outro texto enquanto o RH lê o primeiro. «NENHUMA das rotas (i)–(iii) fecha R4». Não é alegado fechado. O `<verify>` da linha do STATE passou a exigir `R4` | `7e1db519`, `1cc8e5b9`, `ea6a45e9` |
| WR-05 | Já consertado antes desta rodada | `3a06c102` |
| WR-06 | Consertado. Há três comandos LITERAIS no 49-45: Task 2 Passo 0, Task 3 Passo 1 (enumeração + `git push origin "$S":refs/heads/main`) e Task 3 Passo 4. A enumeração julga pelos ARQUIVOS (`git diff-tree`). Commit só em `.planning/` passa. Código só passa se TODOS os arquivos forem da lista dos nove do 49-44 E o assunto for `feat\|test\|fix\|refactor(49-44)`. `docs(…)` não é passe para código, e merge no intervalo = PARAR | `c696e7e7` |
| IN-07 | Tocado só onde a edição do WR-01 passou: o parágrafo ESTADOS do cabeçalho agora diz «escolha 5 do planejador, vetável no 49-45 (a)». As outras marcas do IN-07 ficam como estavam | `756a951e` |
| IN-01..IN-06, IN-08, IN-09 | Não tocados, fora do pedido desta rodada. O IN-01 propunha chamar de «R4» a janela do flush antigo em voo. O operador fixou R4 = a janela do WR-04, então a do IN-01 segue sem nome | — |

**Migration nova:** `supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql`, 29851 octetos,
**md5 `7750c40767d99f7c8dc597ece70172be`**. O md5 antes desta rodada era `8cb2400f0d9df453301cc6ad5e0c0302`.

**Mutações** (`node scripts/p49_44_mutacoes.cjs`, 2026-10-03; cada requisição aborta, sem `LOCK TIMEOUT` nem `STATEMENT TIMEOUT`):

| Rodada | Inversão | Reprovou em | Rótulos (g) | ms |
|---|---|---|---|---|
| CONTROLE | — | sentinela, sem FAIL | — | 770 |
| M1 | RPC sem a posse do `rh` | (d) | — | 724 |
| M2 | RPC sem a guarda de papel inteira | (d) | — | 643 |
| M3 | RPC sem a condição de envio | (e) | — | 660 |
| M4 | helper sempre falso | (g) | upsert,upd,del,md5,g_ins | 1367 |
| M5 | `GRANT EXECUTE` da RPC a anon | (a) | — | 708 |
| M6 | `_ins` sem `AS RESTRICTIVE` | (g) | g_ins | 1029 |
| M7 | `_upd` sem `AS RESTRICTIVE` | (g) | upd,md5 | 785 |
| M8 | `_del` sem `AS RESTRICTIVE` | (g) | del,md5 | 2571 |
| **M9** | guarda sem o `coalesce` (papel nulo com `sub` válido) | **(d)** | — | 1206 |

Linha final: «controle verde; 9/9 mutacoes mordem; nada persistiu». (d) tem várias sondas, e o runner só confere a letra.
Por isso a M9 foi rodada mais uma vez, numa requisição que também aborta, para ler a mensagem. Ela reprova na sonda NOVA:
`P49C FAIL (d): sub VALIDO (o dono da vaga) SEM app_metadata.role devolveu «ACEITO:disponivel» (esperado 42501)`. Sem o
`coalesce`, o texto teria saído. O sentinela não foi alcançado.

**PROD limpo** (`node p46apply.cjs sql`, `set transaction read only`, depois das duas execuções):
`{"sem_rpc":true,"sem_helper":true,"politicas":0,"ledger":0,"policies_total":2}`. As duas funções estão ausentes, há 0 políticas
`cand_congela_caso_aberto%`, o ledger não tem `20261003000001`, e a tabela segue com as 2 policies do titular.

**Portões depois da rodada:**
- `CI=true npx vitest run`: 219 arquivos, **2410 testes** (eram 2408; +2 desta rodada), exit 0.
- `npx tsc --noEmit | grep -c "error TS"` = **89**.
- `npm run build`: exit 0. O marcador `decisao-sjt-resposta-caso-aberto` está só em `build/assets/DecisaoFinalPage-Zw-MAwxN.js`, o chunk lazy. A cópia nova está no mesmo chunk, e a antiga não aparece em nenhum.
- Os `<verify>` estáticos 0, 3, 4, 6 e 10 do 49-44-PLAN estão verdes sobre o código consertado: tracer, congelamento, contrato `esperado=9`, varredura D-56 (326 linhas, 0 achados) e invariantes.
- `supabase/functions/_shared/sinal-revisao.ts` e `database.types.ts` estão byte-iguais à base: o blob `196a4801…` do `sinal-revisao.ts` é o mesmo na base, em HEAD e na árvore. `supabase/functions/` não foi tocado.

**WR-06, prova dos comandos antes de escrevê-los no plano** (nada empurrado; o remoto real não foi contactado na simulação):
- Os três comandos passam pelo `~/.claude/hooks/guard-git.sh` real (exit 0). Os controles do hook são barrados (exit 2): `push … -f`, e `cut -f1` DEPOIS da palavra `push`. O hook casa ` -f` em qualquer ponto depois de `push`, no texto inteiro do comando Bash e não só em comandos que começam por `git`. Um `cut -f1` ANTES do `push` passa. Os comandos do plano não têm ` -f` em lugar nenhum.
- A simulação rodou num clone de rascunho com um `origin` bare de rascunho, com o push trocado por `echo`, em bash e em zsh. Os três comandos dão verde. O Passo 4 morde quando o commit do STATE carrega outro arquivo.
- Num repo de rascunho, a enumeração morde nos três casos: `docs(49-45)` com código, `fix(49-44)` com arquivo fora da lista, e merge no intervalo. Os três saem 1.
- No repo real, `refs/gsd/49-44/base..HEAD` deu 11 commits classificados, `enumeracao ok`. O ref `refs/gsd/49-45/sha` NÃO foi criado.

**Commits desta rodada:** `756a951e`, `10e6ee18`, `e43efa00`, `7e1db519` (fix(49-44)); `1cc8e5b9`, `c696e7e7` (docs(49-45));
`ea6a45e9` (docs(49-44), PLAN); e este SUMMARY. **Nenhum push. Nada persistido em PROD.** O `REQUIREMENTS.md` não foi tocado,
e o JORN-41 segue `[ ]`.

**Consequência para o 49-45:** código fora de `.planning/` e o `49-45-PLAN.md` mudaram depois do `reviewed_head`
(`e2f1f500`) do REVIEW-GAPS-8. Por isso o `<verify>` da Task 1 do 49-45 fica VERMELHO por construção até existir uma re-revisão
`49-REVIEW-GAPS-9.md`, que é o passo 3 da própria Task 1. Registrado e não reescrito: a linha de log do `STATE.md` (`[Phase 49]: 49-44: …`)
ainda diz «8/8 mutações» e «R1–R3». Ela é a entrada datada de quando o 49-44 fechou, e quem fechar o 49-45 acrescenta uma linha
nova.
