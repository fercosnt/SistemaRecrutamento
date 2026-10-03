---
phase: 49-consertos-da-jornada-bloco-2
reviewed: 2026-10-03T19:38:43Z
depth: deep
diff_base: 46f2a52d434f814a66667dc4c547a18acc0778c5
reviewed_head: f039fa6ebd2532d09144ff8f6173c73c87973c58
scope: re-revisão adversarial (rodada 9) da rodada de conserto do REVIEW-GAPS-8 — delta `e2f1f500..f039fa6e` (fix(49-44) 756a951e, 10e6ee18, e43efa00, 7e1db519; docs 1cc8e5b9, c696e7e7, ea6a45e9, f039fa6e) — e releitura do ESTADO FINAL do código do 49-44 (`46f2a52d..f039fa6e -- . ':!.planning'`, 9 arquivos) e do `49-45-PLAN.md` como o programa que escreve em PROD, com o checklist do -8. Contexto lido, fora da lista revisada — `49-44-PLAN.md`, `49-44-SUMMARY.md`, `49-REVIEW-GAPS-8.md`, `SjtCasoAbertoScreen.tsx`, `useAutosaveAvaliacao.ts`, `avaliacaoService.ts`, `avaliar-redacao/index.ts`, `_shared/ai-client.ts`, `executar-direito-titular/index.ts`, `20260923000002` (motor) e `~/.claude/hooks/guard-git.sh`. PROD só leitura (`set transaction read only`) pelo `p46apply.cjs sql`. O runner de mutações NÃO foi re-executado (escreve em PROD numa transação que aborta, fora do que esta revisão pode fazer); M9 foi traçada estaticamente.
carried_from:
  resolved:
    - "WR-01 (-8): estado `removida_pelo_titular` alegava causa — RESOLVIDO (estado `removida`, cópia neutra, COMMENT, cabeçalho, testes)"
    - "WR-02 (-8): metade «papel nulo» da guarda sem prova — RESOLVIDO (sonda em (d) + M9)"
    - "WR-03 (-8): rota (i) prometia fechar R2 na mesma aba — RESOLVIDO no texto"
    - "WR-04 (-8): janela posterior à linha de score sem nome — RESOLVIDO no texto (R4)"
    - "WR-05 (-8): requirements-completed: [JORN-41] — RESOLVIDO em 3a06c102"
    - "WR-06 (-8): enumeração e push só em prosa — RESOLVIDO (comandos literais; executados em simulação)"
  carried:
    - "IN-01 (-8) → IN-05: janela do flush antigo em voo, sem nome; o cabeçalho conta «três caminhos» antes da linha de score"
    - "IN-02 (-8) → IN-06: helper como oráculo não vigiado"
    - "IN-03 (-8) → IN-07: mecanismo do motor descrito errado (cabeçalho e checklist do 49-45)"
    - "IN-04 (-8) → IN-08: (c) não exige administrador ≠ dono"
    - "IN-05 (-8) → IN-09: `btrim` no servidor × `trim()` no cliente"
    - "IN-06 (-8) → IN-10: justaposição título × «no texto analisado» (agravada por R4)"
    - "IN-07 (-8) → IN-11: marcas «do planejador» — PARCIAL (só ESTADOS foi marcado)"
    - "IN-08 (-8) → IN-12: smoke ao vivo sem «HEAD = S»; (z) por tráfego sem repetição"
    - "IN-09 (-8) → IN-13: desfazer pelo front deixa `origin/main = S`"
files_reviewed: 10
files_reviewed_list:
  - supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql
  - supabase/tests/p49_44_resposta_caso_aberto_smoke.sql
  - scripts/p49_44_mutacoes.cjs
  - src/features/avaliacao/services/scoresRhService.ts
  - src/features/avaliacao/services/__tests__/scoresRhService.test.ts
  - src/features/decisao/components/RespostaCasoAbertoSjt.tsx
  - src/features/decisao/components/__tests__/RespostaCasoAbertoSjt.test.tsx
  - src/features/decisao/components/ConsolidacaoDashboard.tsx
  - src/features/decisao/components/__tests__/ConsolidacaoDashboard.test.tsx
  - .planning/phases/49-consertos-da-jornada-bloco-2/49-45-PLAN.md
findings:
  critical: 0
  warning: 1
  info: 13
  total: 14
status: issues_found
---

# Phase 49: Code Review Report — Rodada 9: o conserto do REVIEW-GAPS-8

**Reviewed:** 2026-10-03T19:38:43Z
**Depth:** deep
**Files Reviewed:** 10. São os 9 arquivos de código do 49-44 no estado final e o `49-45-PLAN.md`.
**Status:** issues_found, com 0 crítico

## Summary

Parti da hipótese de que a rodada de conserto introduziu blocker, como nas duas rodadas anteriores. **Não achei nenhum.** Os
cinco WARNINGs pedidos (WR-01..04, WR-06) estão consertados de fato, e não só renomeados. O WR-05 também está. Medi cada um
contra o código e, onde dava, por execução:
- os `<verify>` estáticos 0, 3, 4, 6 e 10 do 49-44;
- os 3 arquivos de teste (41/41) e a suíte inteira (219 arquivos, 2410 testes), além de `tsc` = 89;
- os dois comandos literais de enumeração e o de push, em zsh e em bash, com o push trocado por `echo`;
- o hook `guard-git.sh` real, alimentado com os três comandos literais;
- o crawler do 49-45 contra o front de PROD.

Nenhum consumidor vivo de `removida_pelo_titular` sobrou. As únicas ocorrências fora de notas históricas estão em
`scoresRhService.test.ts:142-143`, e é um teste NEGATIVO: o literal antigo tem de ser recusado.

Sobra **um WARNING, de registro**. O frontmatter do `49-44-SUMMARY.md`, que ferramentas e o verificador leem, ainda
descreve o 49-44 de antes do conserto: `removida_pelo_titular`, «8/8», «R1, R2 e R3». Os INFOs novos são menores. O mais
relevante está fora do diff: o motor de exclusão grava «a pedido do titular» em colunas que o RH lê também no ramo da
purga de retenção (IN-04). É a mesma classe do WR-01, que o conserto fechou só na RPC nova. Hoje está latente, porque
`config_purga.modo = 'dry_run'`.

### -8: disposição dos WARNINGs

| -8 | Disposição | Evidência |
|---|---|---|
| WR-01 | **RESOLVIDO** | migration `:42-51` (ESTADOS: `removida`, neutro, com o porquê e os dois ramos do motor), `:274-285` (RPC devolve `'removida'`), `:299-300` (COMMENT). `scoresRhService.ts:164-176`; `RespostaCasoAbertoSjt.tsx:12-17, 33, 90-95` (cópia «O texto desta resposta não está mais disponível.», sem causa). Testes: `scoresRhService.test.ts:136-145` (contrato de 4 literais; o literal antigo dá `DATABASE_ERROR`), `RespostaCasoAbertoSjt.test.tsx:73-77` (a frase não pode atribuir causa). Smoke (e) `:599` e (h) `:646` esperam `removida`. `grep removida_pelo_titular` em `src supabase scripts`: só o teste negativo. As citações do porquê conferem: `v_ramo_purga` em `20260923000002:348,470,472`; `purgar-retencao/index.ts:520` chama o motor; o passo 8/13 (`:1011-1015`) grava `{"redigido":"anonimizacao_p49"}` sem depender do ramo |
| WR-02 | **RESOLVIDO** | Sonda em (d), `smoke:350-360`: `sub` = dono, `app_metadata` = `{}`. Julgamento em `:583-586`, `NOT LIKE '42501:%'`. Mutação M9 em `p49_44_mutacoes.cjs:107-115`, com âncora `coalesce(v_role, '') NOT IN`, que ocorre 1× em `fnLer` (`migration:245`). A âncora de M2 (`:83`) continua única. Traçado: `v_role := auth.jwt() #>> '{app_metadata,role}'` = NULL e `v_uid` = dono. Com o código intacto, `coalesce` → `'' NOT IN (…)` = verdadeiro → 42501. Sob M9, `false OR NULL` → o IF não dispara; `v_role = 'rh'` é NULL → a posse não dispara; A tem linha de score → `ACEITO:disponivel` → `P49C FAIL (d)`. As sondas anteriores de (d) seguem passando sob M9 (rh aleatório recusa pela posse; sem claims, por `v_uid`; candidato, pelo `NOT IN`), então a falha cai NA sonda nova. Isso confere com o SUMMARY (`:277-280`, mensagem lida). O esperado segue 9 (`:717`, `:728`) |
| WR-03 | **RESOLVIDO** (texto) | Cabeçalho `:106-112` (o caso da desistência acontece na MESMA aba) e `:128-132`: (i) fecha R1 e a edição COM O ENVIO PENDENTE; não fecha a edição depois da desistência nem a de outra aba. Também em `49-45-PLAN.md:169-171, 177-179`, na linha do STATE (`:329-330`) e na escolha 4/T-49-44-13 do `49-44-PLAN.md`. Confere com o código: `SjtCasoAbertoScreen.tsx:146-152` (catch), `:153-155` (`finally { setSubmitting(false) }`) e o `Textarea` sem `disabled`/`readOnly` |
| WR-04 | **RESOLVIDO** (texto) | R4 no cabeçalho, `:116-126` e `:137-143`: «NENHUMA das rotas (i)–(iii) fecha R4», e a frase final não afirma nota única. Também em `49-45-PLAN.md:173-175, 183-185`, na linha do STATE, e o `<verify>` 2 da Task 3 exige `R4` (`:355`). Confere com o código e com PROD: a EF só exige `formato = 'caso_aberto'` (`avaliar-redacao/index.ts:327-337`) e a etapa `avaliacao_assincrona` (`:318`); não recusa uma segunda linha; grava com `insert` (`:489`). A unique medida é `(candidatura_id, tipo, subtipo, pergunta_id) NULLS NOT DISTINCT`; há 4 perguntas `caso_aberto` e 0 candidaturas com mais de uma linha. Uma segunda chamada com a MESMA pergunta morre na unique, então «outra pergunta» é a descrição exata |
| WR-05 | **RESOLVIDO** | `49-44-SUMMARY.md:57`: `requirements-completed: []`, com a razão. `REQUIREMENTS.md` tem JORN-41 `[ ]` |
| WR-06 | **RESOLVIDO** | Comandos literais na Task 2 Passo 0 (`49-45-PLAN.md:219`), na Task 3 Passo 1 (`:301`) e no Passo 4 (`:344`). Os scripts `node -e` dos dois primeiros são byte-iguais (md5 igual). Julgam pelos ARQUIVOS (`diff-tree`): só `.planning/` = `planning`; código só se TODOS os arquivos estão na lista dos 9 E o assunto é `feat\|test\|fix\|refactor(49-44)`; `docs(…)` não é passe; merge = PARAR. Executados aqui com o ref trocado por HEAD e o push por `echo`: `46f2a52d..f039fa6e` = 15 commits, `67669214..f039fa6e` = 16, os dois `enumeracao ok`, verdes em zsh e em bash. O `git diff --name-only 46f2a52d..HEAD -- . ':!.planning'` dá exatamente os 9 da lista. O `guard-git.sh` real dá exit 0 nos três. Nenhum ` -f` depois de `push`. `"$S":refs/…` não sofre modificador do zsh (a aspa fecha antes do `:`) |

### Checklist do -8, reaplicado ao estado final

| Pedido | Resultado |
|---|---|
| IDOR / existência | Sem mudança desde o -8. `rh` com candidatura inexistente ou alheia dá o MESMO 42501 (`:257-259`); P0002 só para administrador (`:260-262`) |
| Guarda fail-open | Código certo (`:245`) e agora provado nas duas metades: `v_uid` nulo pela sonda sem claims; papel nulo com `sub` válido pela sonda nova + M9 |
| Rascunho | (iii) antes de (iv); B → `sem_resposta_enviada`, sem o rascunho nem o md5 dele; M3 |
| Restritiva × permissiva | Políticas intocadas pelo conserto (`:347-364`). INSERT, `ON CONFLICT DO UPDATE`, UPDATE e DELETE conferidos no -8 continuam valendo |
| Escritores de `respostas_avaliacao` / motor | Intocados. O motor escreve como `postgres` (SECURITY DEFINER, dono da tabela, BYPASSRLS), alcançado por `authenticated` (`executar-direito-titular/index.ts:1015`, client do titular) e por service_role (`purgar-retencao`). A explicação errada do cabeçalho segue (IN-07) |
| Helper como oráculo | Sem mudança; segue não vigiado (IN-06) |
| Busca antes do clique / cache / disabled / HTML | Sem mudança de estrutura (`RespostaCasoAbertoSjt.tsx:47-54, 99-118`). Nó de texto, nenhum `disabled`. `<verify>` 10 do 49-44 verde |
| `ROTULO_SINAL` | `git diff --stat 46f2a52d..HEAD -- supabase/functions` vazio |
| Fixtures / ACL × guarda / esperado 9 / runner | O esperado segue 9 como escopo declarado (a sonda nova é negativa de (d), não cláusula nova). A varredura D-56 dá 326 linhas e 0 achados. O runner exige a letra; M9 morde na letra (d), e a mensagem foi lida no SUMMARY |
| Números de R2 | Sem mudança, e conferem: `AI_TOTAL_BUDGET_MS = 140000` (`ai-client.ts:131`), `orcamentoRestanteMs` (`:134`, `:1169`), `timeoutMs: 110_000` (`avaliar-redacao/index.ts:380`) |
| `handleSubmit` | `SjtCasoAbertoScreen.tsx:134-156`; os números `:146-155` citados conferem. `:233-241` está deslocado (IN-01) |
| Ordem apply → push; conferência no mesmo comando | Task 2 Passo 2 (`:244`): `HEAD = S` + `git diff --quiet "$S" -- migration smoke` + `migrate`, num comando só. O push só na Task 3, com `HEAD = S` e enumeração no mesmo comando. O Passo 4 confere remoto = S, 1 commit, só `STATE.md`, `docs(49-45)` |
| Atribuição | Nenhuma escolha nova atribuída ao operador no código, no smoke, no runner nem no 49-45. O ESTADOS ganhou «escolha 5 do planejador». O SUMMARY atribui ao operador «R4 = a janela do WR-04» a partir de uma paráfrase da recomendação (IN-03) |

**Medido em PROD (só leitura, 2026-10-03 ~19:30Z):**
- ledger sem `20261003000001`; RPC e helper ausentes; policies `cand_escreve_respostas_aval:PERMISSIVE,cand_le_respostas_aval:PERMISSIVE`; FORCE RLS falso;
- `config_purga.modo = 'dry_run'`;
- linhas `sjt/caso_aberto` = 1, com sinal = 0, candidaturas com mais de uma = 0; perguntas `caso_aberto` = 4;
- md5 do arquivo da migration = `7750c40767d99f7c8dc597ece70172be` (29851 octetos), igual ao do SUMMARY;
- crawler de PROD: `decisao-sjt-resposta-caso-aberto` AUSENTE (51 assets visitados) e o controle `decisao-sjt-sinal-revisao` PRESENTE em `DecisaoFinalPage-BfpjJuaG.js`. O pré-push do 49-45 está no estado esperado.

## Warnings

### WR-01: o frontmatter do `49-44-SUMMARY.md` ainda descreve o 49-44 de antes do conserto: `removida_pelo_titular`, «8/8 mutações», «R1, R2 e R3», e D1 sem M9

**File:** `.planning/phases/49-consertos-da-jornada-bloco-2/49-44-SUMMARY.md:16` (`provides`: «8/8 mutações mordem»), `:52` (`key-decisions`: «R1, R2 e R3 … ficam nomeados»), `:61` (`coverage.D1.description`: «estados sem_resposta_enviada / indisponivel / removida_pelo_titular / encerrada»), `:68` (`coverage.D1.verification`: «mutações M1 (d), M2 (d), M3 (e), M5 (a)», sem M9 nem a sonda de papel nulo); no corpo, `:226` («Checkpoint (c): R1, R2 e R3, que vão ao operador»)

**Issue:** A rodada de conserto acrescentou uma seção no fim do corpo (`:240-307`) e deixou o frontmatter como estava. O
SUMMARY só registra isso para a linha do `STATE.md` (`:303-307`), não para o frontmatter. Mas são o frontmatter e a
seção de pendências que o fluxo GSD e o verificador do JORN-41 leem como verdade corrente: `coverage` → requisito →
verificação. O 49-45 manda ler o 49-44-SUMMARY primeiro (`<read_first>` da Task 1).

Cenário de falha, na forma que a memória «instrução de conserto pode estar uma rodada atrasada» registra:
1. O verificador lê em D1 que a RPC tem o estado `removida_pelo_titular`.
2. Ele procura o literal no código e encontra só um teste que o RECUSA.
3. Ele marca D1 como divergente. Ou alguém «conserta» o código de volta para o literal que alegava a causa LGPD falsa. Nos dois casos o `<verify>` do 49-45 não protege: `.planning/` não dispara re-revisão.

O mesmo vale para:
- «8/8» contra 9 mutações;
- a pendência «Checkpoint (c): R1, R2 e R3», contra os R1–R4 que o 49-45 mostra ao operador.

**Fix:** antes do Task 1 do 49-45 (só `.planning/`, então não invalida esta revisão):
- `provides` → «9/9 mutações mordem (M9 desde a rodada de conserto)»;
- `key-decisions` → «R1–R3 (antes da linha de score) e R4 (depois) …»;
- `coverage.D1.description` → «… / removida / encerrada; papel nulo com `sub` válido recusado»;
- `coverage.D1.verification` → acrescentar «M9 (d)»;
- `:226` → «Checkpoint (c): R1–R4».

Pode ficar uma nota de que o texto anterior era o do fechamento original.

## Info

### IN-01: a citação de linha `SjtCasoAbertoScreen.tsx:233-241` no cabeçalho imutável está deslocada

**File:** migration `:111`; `49-45-PLAN.md:171`; `49-44-PLAN.md:166`

**Issue:** O `Textarea` ocupa `:235-245` (`<Textarea` em `:235`, `onBlur` em `:241`, fechamento em `:245`). As linhas `:233-234` são `</div>` e `<div>`. O fato alegado está certo: não há `disabled` nem `readOnly`. Mas o cabeçalho vai para o ledger byte a byte e fica imutável depois do apply, com «medido em 2026-10-03».

**Fix:** `:235-245` nos três lugares, antes do apply. Isso muda a migration, então exige outra re-revisão pelo `<verify>` da Task 1. Se o custo de uma rodada `-10` não compensar, deixar como está: o fato está certo e a data está escrita.

### IN-02: o pino da publicação não é amarrado ao `reviewed_head`. A enumeração aceita um `fix(49-44)` posterior à revisão

**File:** `49-45-PLAN.md:214-219` (Passo 0), `:301` (Passo 1 da Task 3)

**Issue:** «Nada de código depois do `reviewed_head`» só é conferido no `<verify>` da Task 1. O Passo 0 fixa `S = HEAD` depois disso. A enumeração dos Passos 0 e 1 aprova qualquer commit de assunto `fix(49-44)` que toque só os 9 arquivos. Cenário: entre o verde da Task 1 e o `update-ref`, um conserto de última hora com `fix(49-44): …` em `RespostaCasoAbertoSjt.tsx` sai pelo push sem ter sido revisado. É exatamente a classe que a memória «re-revisar o conserto antes do apply» descreve. A janela é estreita, e a outra janela está pausada.

**Fix:** no comando literal do Passo 0, e repetido no Passo 1, acrescentar
`RH=$(sed -nE 's/^reviewed_head: *([0-9a-f]{7,40}) *$/\1/p' "$(ls .planning/phases/49-consertos-da-jornada-bloco-2/49-REVIEW-GAPS-*.md | sort -t- -k4 -n | tail -1)") && test -n "$RH" && test -z "$(git diff --name-only "$RH" "$S" -- . ':!.planning')"`.
A forma exata da escolha do maior N pode reutilizar a do `<verify>` da Task 1.

### IN-03: o `<decisions>` do 49-45 não registra o «Aceito» de 2026-10-03, e o SUMMARY atribui ao operador uma escolha que só uma paráfrase sustenta

**File:** `49-45-PLAN.md:81` («A única decisão do operador por trás desta rodada é o «B» de 2026-10-01»), `:129-130` (manda escrever `49-REVIEW-GAPS-8.md`); `49-44-SUMMARY.md:243-245, 257` («O operador fixou R4 = a janela do WR-04, então a do IN-01 segue sem nome»)

**Issue:**
- **O que ficou velho.** O plano foi editado nesta rodada (1cc8e5b9, c696e7e7), mas o `<decisions>` ainda diz que a única decisão do operador é o «B». O «Aceito» de 2026-10-03 já responde a (a) e (c) do checkpoint. O plano não diz se ele vale como resposta ou se as perguntas são refeitas nesta sessão. Refazer é o lado seguro, mas a ambiguidade é do registro.
- **O que só a paráfrase sustenta.** O único registro verbatim do operador é «Aceito». A recomendação a que ele respondeu está só parafraseada. O -8 deu o nome «R4» à janela do IN-01, e o WR-04 propôs «R3 vale também depois». Logo, «o operador fixou R4 = WR-04» é inferência da paráfrase. Nenhuma atribuição falsa está provada, mas o escopo do que o operador aceitou não é auditável.

**Fix:**
- No 49-45 `<decisions>`, uma linha: «2026-10-03, operador: «Aceito» à recomendação <texto verbatim ou caminho>. (a) e (c) são perguntadas de novo no Task 1 com o texto pós-conserto».
- No SUMMARY, colar a recomendação verbatim, ou marcar «R4 = janela do WR-04» como escolha do orquestrador aceita em bloco.

### IN-04 (fora do diff, pré-existente): o motor de exclusão grava «a pedido do titular» em colunas que o RH lê, também no ramo da purga de retenção. É a classe do WR-01, que o conserto fechou só na RPC nova

**File:** `supabase/migrations/20260923000002_p49_motor_desidentifica_analises.sql`:
- `:971` (`redacoes_candidato.texto = '[removido a pedido do titular — LGPD Art. 18]'`);
- `:1005` (`respostas_cultura`);
- `:812-814`, `:841-843` (`justificativa`, «… desidentificada a pedido do titular …»);
- `:1041`, `:1288`, `:1304`.

`v_ramo_purga` (`:348, 470, 472, 501`) só entra na guarda; nenhum sentinela muda de texto por ramo.

**Issue:** O cabeçalho novo do 49-44 (`:49-50`) diz, com razão, que afirmar «a pedido do titular» numa candidatura purgada
por retenção «afirmaria ao RH … um exercício de direito LGPD que ninguém fez». A própria pesquisa da Phase 46 diz que «a
purga é por política, não por pedido do titular» (`46-RESEARCH.md:371`). Mesmo assim, o mesmo motor carimba essa causa em
`redacoes_candidato.texto`, que o RH dono da vaga lê pela `rh_le_redacoes`, e nas justificativas. Ele faz isso nos dois
ramos.

Cenário: `config_purga.modo` vai a `live`, e o RH abre a redação ou a decisão de uma candidatura purgada. Lê
«[removido a pedido do titular — LGPD Art. 18]». Ninguém pediu. Hoje `modo = 'dry_run'` (medido), então é latente. Não é
introduzido nem agravado pelo 49-44, e não bloqueia o 49-45.

**Fix:** registrar como pendência com dono ANTES de a purga ir a `live`: sentinelas neutros («[removido — LGPD]»), ou um texto por ramo escolhido por `v_ramo_purga`. Mexer no motor exige a re-carimbagem do pin de `md5(prosrc)` do `p45_motor_exclusao_smoke.sql`. É decisão do operador.

### IN-05 (carregado do IN-01 do -8): o cabeçalho conta «três caminhos» antes da linha de score, e a janela do flush antigo em voo continua sem nome

**File:** migration `:89-91` («podem divergir por três caminhos (R1–R3)»); `useAutosaveAvaliacao.ts:88-105, 123-129`

**Issue:** É o mesmo do -8. O `flushNow` não espera um `upsert` em voo, e um X antigo que chegue depois de Y vence pelo `ON CONFLICT DO UPDATE`. O SUMMARY a deixou sem nome por escopo do operador (ver IN-03). O 49-45 (`:146-147`) declara que «resíduo da mesma classe que não esteja nomeado é achado». Ele é achado, de severidade baixa: exige reordenação de duas requisições separadas por segundos (digitar, abrir o diálogo, confirmar).

**Fix:** se houver a rodada do IN-01, trocar «por três caminhos» por «por pelo menos três caminhos» ou nomear a janela como R5. Senão, registrar no SUMMARY do 49-45 como resíduo conhecido e fora de R1–R4.

### IN-06 (carregado do IN-02 do -8): «o helper não é oráculo» segue não vigiado

**File:** smoke `:295-307` (só o ACL de `anon`); runner (nenhuma mutação tira `AND ca.user_id = v_uid`, migration `:331`)

**Fix:** como no -8: sonda `authenticated` não titular sobre A (enviada) exigindo `false`, mais uma mutação M10.

### IN-07 (carregado do IN-03 do -8): «POR QUE O MOTOR NÃO É ALCANÇADO» dá o mecanismo errado, e o checklist do 49-45 chama a EF do titular de service_role

**File:** migration `:77-80`; `49-45-PLAN.md:137`; confirmado em `executar-direito-titular/index.ts:1015` (`supabaseTitular.rpc("anonimizar_candidato", …)`)

**Fix:** como no -8: o motor é chamado por `authenticated` e por service_role, mas executa como `postgres`, dono da tabela, com BYPASSRLS.

### IN-08 (carregado do IN-04 do -8): (c) não exige administrador ≠ dono

**File:** smoke `:160-164`

**Fix:** `AND u.user_id IS DISTINCT FROM v_dono`, com `P49C FAIL (baseline)` se não houver nenhum.

### IN-09 (carregado do IN-05 do -8): `btrim` no servidor × `trim()` no cliente

**File:** migration `:288`; `scoresRhService.ts:234`

**Issue:** Texto gravado só com `\n`, `\t` ou NBSP sai do servidor como `disponivel`. O cliente lança `DATABASE_ERROR`, e o RH fica num «Tentar de novo» que nunca resolve.

**Fix:** o mesmo predicado nos dois lados (`~ '[^[:space:]]'` no servidor).

### IN-10 (carregado do IN-06 do -8, agravado por R4): o título e o rótulo âmbar sugerem que o texto mostrado é o analisado

**File:** `RespostaCasoAbertoSjt.tsx:31, 82-85`; `ConsolidacaoDashboard.tsx:135-147` (monta o componente logo abaixo do rótulo `ROTULO_SINAL`, `supabase/functions/_shared/sinal-revisao.ts:68`: «Possível instrução dirigida à IA no texto analisado — revise o texto …»)

**Issue:** Com R4 nomeado, o aviso pode vir de uma SEGUNDA nota, sobre um texto que o RH nunca vê, enquanto o bloco logo
abaixo mostra o primeiro texto sob «Resposta do candidato ao caso aberto». Nenhuma frase afirma fidelidade, e a escolha
foi informada ao operador (rota (iii)).

**Fix:** como no -8: o título «Último texto salvo pelo candidato no caso aberto».

### IN-11 (carregado do IN-07 do -8, PARCIAL): marcas «do planejador» que ainda faltam

**File:** migration `:145-153` (os dois SET LOCAL e os tetos 3 s / 5 s), `:155-165` (ERRO/AUTHZ); `RespostaCasoAbertoSjt.tsx:6-10` (escolha 6)

**Issue:** O ESTADOS foi marcado (`:42`). Os demais não. Nenhum deles é atribuído ao operador.

**Fix:** «(escolha N do planejador, vetável no 49-45 (a))», se houver nova rodada no cabeçalho.

### IN-12 (carregado do IN-08 do -8): o smoke ao vivo roda sem «HEAD = S», e um (z) por tráfego para a publicação sem caminho de repetição

**File:** `49-45-PLAN.md:273`; smoke `:180`, `:693-705`

**Fix:** como no -8: prefixar com `test HEAD = S && git diff --quiet "$S" -- <smoke> &&`, e permitir UMA repetição quando a única reprovação for (z) com resíduo zero.

### IN-13 (carregado do IN-09 do -8): o desfazer pelo front deixa `origin/main = S`

**File:** `49-45-PLAN.md:109-114`

**Issue:** O próximo push ao `main`, mesmo só de `.planning/`, republica o front novo.

**Fix:** como no -8: registrar no «Desfazer» um `git revert` dos commits de front, empurrado por sha, ou proibir push ao `main` até o banco e o front estarem consistentes.

---

_Reviewed: 2026-10-03T19:38:43Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
