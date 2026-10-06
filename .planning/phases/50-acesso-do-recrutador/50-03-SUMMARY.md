---
phase: 50-acesso-do-recrutador
plan: 03
subsystem: database
tags: [postgres, rls, alter-policy, security-invoker, supabase, ensaio-que-aborta, portao, vistas-externas]

requires:
  - phase: 50-acesso-do-recrutador
    provides: "50-02: helper public.is_active_rh_user() VIVO em PROD (ledger 20261005000001); p50_ensaio.cjs com --vistas, sonda p50_vistas_externas.sql, smoke p50 v1, runner p50_mutacoes.cjs (M1..M11)"
provides:
  - "migration 20261005000002 (NÃO aplicada): 13 ALTER POLICY TO authenticated (Forma A/B a partir de um texto) + v_analises_presas security_invoker, PRE/POS-PORTAO; ensaiada em PROD numa requisição que aborta"
  - "COMPARA do --vistas aceita UMA diferença — fechamento erro -> exatamente vazio em relação populada — e a imprime: vistas=igual+fechou[<ator>.<rel>,…] (decisão «A» do operador)"
  - "verifies de vistas dos planos 50-03/04/05/07/10 aceitam vistas=igual seguido opcionalmente de +fechou[…], e nada mais; a comparação através do apply do 50-10 porta a mesma regra"
affects: [50-04, 50-05, 50-07, 50-10]

actuals:
  tokens: 20097
  tasks: 2
  commits: 3
plan_head_before: 7846375d473a66c49b3a95542bf55ee2faaf7283
plan_head_after: 6980af3d4d768c59006d57541ded23f5241e337d

tech-stack:
  added: []
  patterns:
    - "Fechamento na sonda de vistas: só e:<SQLSTATE> -> n:0:<md5 de ''> com população > 0 nas duas fotografias; toda outra diferença reprova"
    - "Classificador de portão provado com fotografias SINTÉTICAS numa requisição read-only que aborta (sem ler tabela) + mordidas vivas por --mutacao avulsa"

key-files:
  created:
    - supabase/migrations/20261005000002_p50_policies_rh_ativo.sql
    - .planning/phases/50-acesso-do-recrutador/50-03-SUMMARY.md
  modified:
    - scripts/p50_ensaio.cjs
    - supabase/tests/p50_vistas_externas.sql
    - .planning/phases/50-acesso-do-recrutador/50-03-PLAN.md
    - .planning/phases/50-acesso-do-recrutador/50-04-PLAN.md
    - .planning/phases/50-acesso-do-recrutador/50-05-PLAN.md
    - .planning/phases/50-acesso-do-recrutador/50-07-PLAN.md
    - .planning/phases/50-acesso-do-recrutador/50-10-PLAN.md

key-decisions:
  - "Decisão do operador «A» (2026-10-05): refinar o COMPARA para que e:<sqlstate> -> n:0:<md5 do vazio> seja FECHAMENTO, impresso no veredito (vistas=igual+fechou[…]); toda outra diferença continua reprovando"
  - "O executor estreitou A: o fechamento exige população > 0 (como postgres) nas DUAS fotografias — em relação vazia n:0 não distingue fechado de aberto-sem-linhas, e a transição segue vermelha"
  - "A prova «anon ganha linha» ficou como ensaio avulso (scratch), não como mutação do runner: o runner prova cláusulas do smoke por letra (P50C FAIL), não roda --vistas, e M12..M23 já são do 50-07"
  - "O COMPARA é um portão já revisado (TRACER-1..3) que mudou aqui: está OBRIGATORIAMENTE no escopo da revisão bloqueante do 50-10 (50-REVIEW-ACESSO)"

patterns-established:
  - "Linha de veredito do --vistas: vistas=igual | vistas=igual+fechou[<ator>.<rel>,…] | vistas=vacua; conferência por grep -qE ' · vistas=igual(\\+fechou\\[[^]]*\\])? · '"

requirements-completed: []

coverage:
  - id: D1
    description: "Migration 20261005000002: 13 ALTER POLICY + v_analises_presas security_invoker, estática verde"
    requirement: "EXPORT-05"
    verification:
      - kind: other
        ref: "Task 1 <verify> (OK migration estatica: 13 ALTER POLICY + view) — commit fab97387"
        status: pass
    human_judgment: false
  - id: D2
    description: "Ensaio em PROD que aborta: PRE/POS-PORTAO, vistas externas sem exposição (4 fechamentos de anon), smoke v1 7/7, ledger inalterado"
    requirement: "EXPORT-05"
    verification:
      - kind: integration
        ref: "node scripts/p50_ensaio.cjs --vistas --migracoes=supabase/migrations/20261005000002_p50_policies_rh_ativo.sql supabase/tests/p50_acesso_recrutador_smoke.sql"
        status: pass
    human_judgment: true
    rationale: "A regra de fechamento mudou um portão revisado; o 50-10 (50-REVIEW-ACESSO) tem de revisá-la antes do apply"
  - id: D3
    description: "Portão de vistas refinado (decisão A) e provado que ainda morde"
    verification:
      - kind: integration
        ref: "classificador sintético 17/17; mordidas vivas (i)(ii)(iv) P50V FAIL; controle (iii) vistas=igual+fechou[4]; p50_mutacoes.cjs 11/11"
        status: pass
    human_judgment: false

duration: ~35min (continuação, depois do checkpoint de decisão)
completed: 2026-10-05
status: complete
---

# Phase 50 Plan 03: Policies para rh ativo + v_analises_presas invoker — Summary

**13 policies de tabelas-filhas de candidatura reescritas para «rh ativo (helper vivo) vê todas», TO authenticated, e `v_analises_presas` com `security_invoker`, numa migration que se autoconfere. Ensaiada em PROD numa requisição que aborta: smoke 7/7. O alargamento não abre nada a ator externo; o efeito visível fora do RH é que `anon` deixou de receber um ERRO em 4 tabelas e passou a receber vazio. Isso é aceito como fechamento pela decisão «A» do operador.**

## Performance

- **Duração:** Task 1 na execução anterior; esta continuação levou ~35 min.
- **Concluído:** 2026-10-05
- **Tarefas:** 2/2
- **Arquivos:** 1 migration criada; 2 de código e 5 planos modificados.

## Decisão do operador (registrada literalmente)

> **«A»**: o operador decidiu em 2026-10-05 refinar a comparação da sonda em `scripts/p50_ensaio.cjs` (COMPARA). A mudança de `e:<sqlstate>` para `n:0:<md5 of empty>` passa a ser classificada como FECHAMENTO, e não como exposição, e é impressa na linha de veredito (ex.: `vistas=igual+fechou[anon.public.x,…]`). Qualquer outra diferença continua REPROVANDO.

Contexto: o primeiro ensaio `--vistas` da Task 2 deu VERMELHO, com `P50V FAIL (vistas): anon.public.{decisao_final_historico,entrevista_analises,entrevista_guias,scores_candidato}` (884 ms). Nas quatro tabelas a vista de anon foi de `e:42501` para `n:0`. Antes, anon avaliava a policy `{public}` e o `(SELECT …)` dela recusava. Com `TO authenticated` nenhuma policy se aplica a anon, o default-deny devolve vazio e nenhuma linha fica exposta. É o mesmo resultado que anon já tinha em `redacoes_candidato`, `analise_candidato_vaga`, `comparativo_solicitado` e `agendamentos_entrevista`. O mesmo ensaio sem `--vistas` deu VERDE (7/7).

**Os 4 fechamentos** (população como postgres medida só em leitura em 2026-10-05, todas > 0):

| ator.relação | antes → depois | população |
|---|---|---|
| `anon.public.decisao_final_historico` | `e:42501` → `n:0:d41d8cd9…` | 11 |
| `anon.public.entrevista_analises` | `e:42501` → `n:0:d41d8cd9…` | 14 |
| `anon.public.entrevista_guias` | `e:42501` → `n:0:d41d8cd9…` | 6 |
| `anon.public.scores_candidato` | `e:42501` → `n:0:d41d8cd9…` | 19 |

**⚠ Portão revisado mudou.** O COMPARA do `--vistas` passou pelas revisões TRACER-1, 2 e 3 e foi alterado aqui (commit `10ca729a`). Por isso ele é **escopo obrigatório da revisão bloqueante do 50-10 (`50-REVIEW-ACESSO`)**, assim como a porta da regra para a verificação de vistas através do apply, no `50-10-PLAN.md` (commit `6980af3d`).

## Realizações

- **Task 1 (fab97387):** migration `20261005000002_p50_policies_rh_ativo.sql`, com 13 `ALTER POLICY … TO authenticated` (3 na Forma A, 10 na Forma B). O USING de notificações e o de agendamento saem de um mesmo texto. Inclui `ALTER VIEW public.v_analises_presas SET (security_invoker = true)`, um PRE-PORTAO com os md5 medidos e um POS-PORTAO que varre o catálogo pela forma. A conferência estática imprimiu `OK migration estatica: 13 ALTER POLICY + view`.
- **Conserto do portão (10ca729a, `fix(50-01)`):**
  - o COMPARA classifica cada par (ator, relação) diferente;
  - só é fechamento `e:[0-9A-Z]{5}` → `n:0:d41d8cd98f00b204e9800998ecf8427e` com `populacao` > 0 nas duas fotografias;
  - o `P50V FAIL` agora traz `antes->depois` de cada par reprovado e lista só as exposições;
  - a GUC `p50.vistas_fechou` é zerada no PREFIXO e o sentinela a leva para fora (`fechou=`);
  - o veredito imprime `vistas=igual+fechou[…]`;
  - o cabeçalho da sonda documenta a exceção.
- **Planos (6980af3d, `docs(50-03)`):**
  - nos planos 50-03, 50-04, 50-05 e 50-07, o `grep -q '….*vistas=igual.*smoke50=N/N'` virou `grep -qE ' · vistas=igual(\+fechou\[[^]]*\])? · smoke50=N/N · '`. O `.*` antigo aceitava qualquer sufixo;
  - no 50-10, o Step 1 d ganhou o mesmo sufixo opcional;
  - também no 50-10, a verificação de vistas através do apply porta a regra (`fecha(va,vd,rel)` com população > 0 → `+fechou[…]`). Isso está explicado em `fails_when`;
  - 50-01 e 50-02, já executados, ficaram como registro histórico.

## Prova de que o portão ainda morde

**Classificador, com fotografias sintéticas**, numa requisição `set transaction read only` que aborta e não lê tabela nenhuma. Resultado: **17/17**.

- Fecham: o igual (sem fechamento); anon erro→vazio; candidato erro→vazio; dois fechamentos juntos.
- **Reprovam:**
  - erro→1 linha;
  - vazio→1 linha;
  - vazio→erro;
  - erro→vazio numa relação com **população 0**;
  - erro→outro erro;
  - `n:2:x`→`n:2:y`;
  - candidato erro→linhas;
  - `n:0` com md5 não vazio;
  - chave presente só antes, ou só depois;
  - ator que sumiu;
  - fechamento junto com exposição: reprova e lista **só** a exposição;
  - fechamento sem população no «antes».

**Mordidas vivas em PROD**, em ensaios que abortam, com `--vistas --migracoes=…0002 --mutacao=<scratch>`:

| caso | mutação | resultado |
|---|---|---|
| (i) anon ganha UMA linha | `CREATE POLICY … ON scores_candidato TO anon USING (id = <1º id>)` | `ENSAIO VERMELHO: P50V FAIL (vistas): anon.public.scores_candidato (antes->depois: …=e:42501->n:1:75df8362…)`. As outras 3 transições, que são fechamentos, não aparecem na lista (812 ms) |
| (ii) erro → não-vazio | `CREATE POLICY … ON decisao_final_historico TO anon USING (true)` | `P50V FAIL (vistas): anon.public.decisao_final_historico (…=e:42501->n:11:e7ce8ea8…)` (1016 ms) |
| (iv) ator autenticado ganha linhas | `CREATE POLICY … ON entrevista_guias TO authenticated USING (true)` | `P50V FAIL (vistas): candidato.…entrevista_guias,rh_inativo.…,sem_claims.… (n:0:d41d8…->n:6:1d9f03a5…)` (902 ms) |
| (iii) controle, só com o 0002 | — | `ENSAIO VERDE: - · prefixadas=[20261005000002] · … · vistas=igual+fechou[anon.public.decisao_final_historico,anon.public.entrevista_analises,anon.public.entrevista_guias,anon.public.scores_candidato] · smoke50=n/a · …` |

As mutações ficaram fora do runner porque o `p50_mutacoes.cjs` julga cláusulas do smoke por letra (`P50C FAIL (x)`) e não roda `--vistas`. Além disso, os ids M12..M23 são do 50-07 (WR-05). Os arquivos de mutação estão no scratchpad da sessão (`mut_i_anon_ganha_uma.sql`, `mut_ii_anon_ganha_todas.sql`, `mut_iv_autenticado_ganha.sql`).

**Porta para o 50-10, validada contra logs forjados** (o JS do `<automated>` extraído byte a byte do plano):

| caso | saída |
|---|---|
| igual | `iguais` |
| fechamento | `iguais+fechou[anon.public.t]` |
| erro→linha | `VISTA EXTERNA MUDOU SEM TRAFEGO`, exit 1 |
| vazio→erro | `VISTA EXTERNA MUDOU SEM TRAFEGO`, exit 1 |
| fechamento em relação vazia | `VISTA EXTERNA MUDOU SEM TRAFEGO`, exit 1 |
| ambíguo + fechamento | `AMBIGUO POR TRAFEGO …: candidato.public.u+fechou[anon.public.t]` |

**Runner:** `node scripts/p50_mutacoes.cjs` com prefixadas=[20261005000002] deu `CONTROLE verde … smoke50=7/7`, M1..M11 mordendo e `controle verde; 11/11 mutacoes mordem; nada persistiu`. A leitura só-leitura saiu igual à baseline: ledger=[20261005000001], 155 policies de `public`, 7 linhas de usuarios_rh e borda=0.

## Verificação da Task 2 (como escrita no plano, já com o sufixo aceito)

Execução às 00:39:06Z, sem nenhuma repetição: nenhum LOCK/STATEMENT TIMEOUT e nenhum 40001.

```
ENSAIO VERDE: supabase/tests/p50_acesso_recrutador_smoke.sql · prefixadas=[20261005000002] · aplicadas=[20261005000001] · ausentes=[20261005000003,20261005000004] · vistas=igual+fechou[anon.public.decisao_final_historico,anon.public.entrevista_analises,anon.public.entrevista_guias,anon.public.scores_candidato] · smoke50=7/7 · evidencia=03:rh_gerencia_agendamento=f339f17e0cf0bda4fc4aed87e033b4d9,rh_le_analise=e91c8499df0268c9704afd4cdbef045d,rh_avanca_etapa=7c9462e1cc8ca483bb91e6f63e6499a8,rh_le_comparativo=e91c8499df0268c9704afd4cdbef045d,rh_le_decisao_final=6029439eea5914cac113f8f601830b74,rh_le_decisao_final_historico=6029439eea5914cac113f8f601830b74,rh_le_entrevista_analises=6029439eea5914cac113f8f601830b74,rh_le_entrevista_guias=6029439eea5914cac113f8f601830b74,rh_le_historico=6029439eea5914cac113f8f601830b74,rh_le_notificacoes=6029439eea5914cac113f8f601830b74,redacao_rh_select=6029439eea5914cac113f8f601830b74,redacao_rh_update=f339f17e0cf0bda4fc4aed87e033b4d9,rh_le_scores=6029439eea5914cac113f8f601830b74;03:view_invoker=true · 1091 ms
verify rc=0
```

- **Duração do ensaio verde:** 1091 ms. É o tempo em que os 12 `AccessExclusiveLock` ficam seguros.
- **Tentativas:**
  1. execução anterior: VERMELHO `P50V FAIL (vistas)` (884 ms) → checkpoint de decisão;
  2. a mesma execução, sem `--vistas`: VERDE 7/7;
  3. esta continuação: VERDE, sem repetição.
- **Sem `PERSISTIU`.** O ledger, lido só para leitura depois do ensaio, saiu `["20261005000001"]`: `20261005000002` não está lá.
- A igualdade dos md5 novos confere: os pares Shape-B com WITH CHECK (`rh_gerencia_agendamento`, `redacao_rh_update`) dão `f339f17e…`; os 8 SELECT da Forma B e `rh_le_notificacoes` dão `6029439e…`, o que confirma `rh_le_notificacoes.qual = rh_gerencia_agendamento.qual` pelo POS-PORTAO; a Forma A dá `e91c8499…` / `7c9462e1…`.

## Medição anterior à mudança (Task 1, re-medida em 2026-10-05, igual ao RESEARCH §A)

| policy | md5(qual\|with_check) | cmd | roles |
|---|---|---|---|
| agendamentos_entrevista.rh_gerencia_agendamento | c754871ab4282a43970ac4ff7adcc2a3 | ALL | {authenticated} |
| analise_candidato_vaga.rh_le_analise | d4e7e94c496cb493efc9c31e923f6cbd | SELECT | {public} |
| candidaturas.rh_avanca_etapa | 7cbcf97ad0b1da27c508eaacba5ab0aa | UPDATE | {public} |
| comparativo_solicitado.rh_le_comparativo | d4e7e94c496cb493efc9c31e923f6cbd | SELECT | {public} |
| decisao_final.rh_le_decisao_final | b6abcc34e20e42c3d08fbe81251d381c | SELECT | {public} |
| decisao_final_historico.rh_le_decisao_final_historico | b6abcc34e20e42c3d08fbe81251d381c | SELECT | {public} |
| entrevista_analises.rh_le_entrevista_analises | b6abcc34e20e42c3d08fbe81251d381c | SELECT | {public} |
| entrevista_guias.rh_le_entrevista_guias | b6abcc34e20e42c3d08fbe81251d381c | SELECT | {public} |
| historico_candidatura.rh_le_historico | b6abcc34e20e42c3d08fbe81251d381c | SELECT | {authenticated} |
| notificacoes_enviadas.rh_le_notificacoes | b6abcc34e20e42c3d08fbe81251d381c | SELECT | {authenticated} |
| redacoes_candidato.redacao_rh_select | b6abcc34e20e42c3d08fbe81251d381c | SELECT | {authenticated} |
| redacoes_candidato.redacao_rh_update | c754871ab4282a43970ac4ff7adcc2a3 | UPDATE | {authenticated} |
| scores_candidato.rh_le_scores | b6abcc34e20e42c3d08fbe81251d381c | SELECT | {public} |

Todas são PERMISSIVE. `public.v_analises_presas` tem dono postgres e `reloptions` NULL, ou seja, está sem security_invoker. A ACL é `{postgres=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}`: anon não tem SELECT, authenticated tem. Hoje a view tem 0 linhas. A medição está no cabeçalho da migration.

## Commits deste plano

| hash | tipo | o quê |
|---|---|---|
| fab97387 | feat(50-03) | migration 20261005000002 (Task 1) |
| 10ca729a | fix(50-01) | COMPARA com fechamento erro→vazio (decisão A) + veredito `+fechou[…]` + nota na sonda |
| 6980af3d | docs(50-03) | verifies de vistas de 50-03/04/05/07/10 aceitam `+fechou[…]` e nada mais; porta da regra no 50-10 |

## Desvios do plano

1. **[Decisão do operador, checkpoint] Portão de vistas refinado (A).**
   - **Encontrado na:** Task 2.
   - **Problema:** o `--vistas` tratava `e:42501`→`n:0` como exposição.
   - **Conserto:** no COMPARA, a transição erro→exatamente-vazio vira fechamento e é impressa no veredito.
   - **Arquivos:** `scripts/p50_ensaio.cjs`, `supabase/tests/p50_vistas_externas.sql` (só comentário) e os planos 50-03/04/05/07/10.
   - **Commits:** 10ca729a, 6980af3d.
2. **[Regra 2, estreitamento] População > 0 exigida para o fechamento.** Não estava no texto da decisão. Sem essa condição, um `n:0` numa relação vazia seria aceito como fechamento sem provar nada (memória «População vazia mente nas duas direções»). É mais estrito que A e nunca mais permissivo. As 4 relações do 0002 estão populadas (11, 14, 6 e 19 linhas).
3. **[Regra 2] `P50V FAIL` agora mostra `antes->depois`** de cada par reprovado. Só diagnóstico: o prefixo `P50V FAIL (vistas): <ator>.<rel>,…` não mudou, e os `fails_when` que o citam continuam valendo.
4. **Mordida «anon ganha linha» fora do runner.** O motivo está em key-decisions: o runner não roda `--vistas` e julga por letra do smoke; os ids M12..M23 pertencem ao 50-07. A prova ficou em ensaio avulso, documentado acima.
5. **Grep do verify da Task 2 trocado de `grep -q` para `grep -qE`**, com âncora `· vistas=igual(…)? · smoke50=7/7 · `. É a «adjusting only for the accepted suffix» da instrução; o padrão antigo `.*` aceitaria `vistas=igualQUALQUERCOISA`.

## Itens adiados

Nenhum. Uma observação fora do escopo: `anon` tem GRANT SELECT de tabela em `scores_candidato`, `entrevista_guias`, `entrevista_analises` e `decisao_final_historico`. Isso já existia, é a classe do todo 42 (anon systemic). Depois do 0002, só o default-deny da RLS protege essas tabelas, que é exatamente o que a sonda mede.

## Sinalizações de ameaça

Nenhuma superfície nova. O conserto do portão está no escopo de T-50-13 (anon/candidato): ele **estreita** o que a sonda aceita, já que antes o `.*` dos greps aceitava qualquer sufixo, e a única transição nova aceita não termina com linha visível.

## Stubs conhecidos

Nenhum.

## Prontidão para a próxima etapa

- O 0002 está pronto para a revisão do 50-10. O revisor tem de cobrir: o COMPARA novo (`10ca729a`), a porta no `50-10-PLAN.md` (`6980af3d`) e os 4 fechamentos esperados.
- Os ensaios de 50-04 e 50-05 prefixam só a própria migration, então não devem ver fechamentos. O 50-07, que prefixa as três, verá os 4 fechamentos `+fechou[…]` acima, e o grep atualizado os aceita.
- Não houve apply, nem push, nem escrita persistida em PROD.

## Self-Check: PASSED

- FOUND: supabase/migrations/20261005000002_p50_policies_rh_ativo.sql
- FOUND: scripts/p50_ensaio.cjs (fechou / VAZIO_MD5 / p50.vistas_fechou)
- FOUND commits: fab97387, 10ca729a, 6980af3d
- Ledger p50 = ["20261005000001"] (só leitura, depois do ensaio)
