---
phase: 51-consertos-da-jornada-bloco-3
plan: 06
subsystem: database
tags: [jorn-43, raven, get_avaliacao_status, rnf-07a, acl, ensaio, mutacoes, onda-b]
status: complete

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-05 publicado (fim da Onda A, D-27; serializa o push)"
  - phase: 26-correcao-do-funil
    provides: "get_avaliacao_status (FUNIL-12): DEFINER, guarda de titular, so booleanos"
provides:
  - "public.get_avaliacao_status(uuid) com a chave raven {liberado, registrado}, so booleanos, aplicada em PROD (20261008000001)"
  - "aperto nomeado A4: anon sem EXECUTE em get_avaliacao_status (antes tinha, por pg_default_acl)"
  - "scripts/p51_ensaio.cjs: ensaio que aborta da Onda B (marcas p51.tx e p50.tx, smokes=[k=p/e], P51V, capturar() p51)"
  - "scripts/p51_mutacoes.cjs: runner de mutacoes da Onda B (SMOKES com P51A/P51B/P50C/P45M, parser por smoke, CONTROLE par/gate)"
  - "supabase/tests/p51_raven_status_smoke.sql: smoke51a, 7 clausulas, so pelo ensaio"
  - ".planning/phases/51-consertos-da-jornada-bloco-3/51-06-CORPO-ANTES.sql: corpo e ACL vivos de antes, para desfazer corretivo"
affects: [51-07, 51-08, 51-10, 51-13, 51-16]

actuals:
  tokens: 28800        # chars/4 sobre o diff realizado bb629816..98bd0ba3 (115199 octetos; so codigo: 110439 → 27610)
  tasks: 3
  commits: 4           # MEDIDO: git rev-list --count bb629816..HEAD no momento da escrita
plan_head_before: bb629816edb031c324b4140ad6899b00065c8b80
plan_head_after: 98bd0ba3f66f0f0da39301446845f6d6b7d9ff6a

tech-stack:
  added: []
  patterns:
    - "Ensaio da Onda B reusa o p50 por require (terminadores, classificarSaida, diferencas, COMPARA com o rotulo trocado para P51V), sem copiar o analisador"
    - "Smoke com medicao numa subtransacao (P51A1) gravada numa GUC jsonb FORA dela, e uma clausula por bloco DO no julgamento"
    - "Runner de mutacoes com tabela SMOKES por prefixo e parser da PRIMEIRA reprovacao de qualquer prefixo"

key-files:
  created:
    - scripts/p51_ensaio.cjs
    - scripts/p51_mutacoes.cjs
    - supabase/tests/p51_raven_status_smoke.sql
    - supabase/migrations/20261008000001_p51_raven_em_avaliacao_status.sql
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-06-CORPO-ANTES.sql
  modified: []

key-decisions:
  - "A4 aplicado como aperto nomeado: REVOKE ALL FROM anon em get_avaliacao_status. O unico chamador publicado (avaliacaoService.getAvaliacaoStatus) roda sob RoleGuard role=candidato (sessao authenticated), e anon ja recebia 42501 forbidden da guarda. O operador confirma ou veta na pergunta (f) do checkpoint do 51-16; o desfazer e GRANT EXECUTE TO anon pela mesma via"
  - "Portao do PRE-PORTAO na forma md5(prosrc), remedido no Passo 0: 0ad235f334b552ddcf00b65dbe7413be (o md5(pg_get_functiondef) 2b9a8908... fica so como conferencia cruzada)"
  - "Mutacao MA6 acrescentada: (e) precisava de mutacao propria, porque MA1 reprova em (b) antes de chegar a ela. (f) segue sem mutacao propria, e a justificativa esta no cabecalho do smoke"
  - "capturar() do ensaio ganhou a chave fixtures (titulares p51%smoke-%@invalido.local em auth.users e candidatos), alem da lista do plano. Assim um envelope de smoke que nao revertesse aparece como PERSISTIU"

patterns-established:
  - "set_config dentro de subtransacao que reverte VOLTA junto, ate o de sessao: o registro do id da fixture para a negativa (z) tem de ser gravado fora do bloco P51A1"

requirements-completed: []

coverage:
  - id: D1
    description: "get_avaliacao_status devolve raven {liberado, registrado} so booleanos, com a mesma guarda de titular e as mesmas propriedades; a ACL e a de antes menos anon. Esta no ar, com ledger = arquivo"
    requirement: JORN-43
    verification:
      - kind: other
        ref: "node p46apply.cjs sql (verify 1 da Task 3: ledger md5 = md5 do arquivo bb008988..., anon_x=false, auth_x=true, DEFINER, corpo com raven)"
        status: pass
      - kind: other
        ref: "node scripts/p51_ensaio.cjs --sem-migracoes supabase/tests/p51_raven_status_smoke.sql → smokes=[51a=7/7]"
        status: pass
    human_judgment: false
  - id: D2
    description: "RNF-07a e o contrato legado: nenhuma folha numerica, o corpo nao le percentil/classificacao/total_acertos, e o FUNIL-12 continua verde (com fixture construida)"
    requirement: JORN-43
    verification:
      - kind: other
        ref: "supabase/tests/p51_raven_status_smoke.sql#(b) (e)"
        status: pass
      - kind: other
        ref: "node scripts/p51_ensaio.cjs [--sem-migracoes] supabase/tests/funil12_status_rpc_smoke.sql (antes e depois do apply; smoke.ready=y medido)"
        status: pass
    human_judgment: false
  - id: D3
    description: "O portao morde: CONTROLE mais MA1..MA6, cada uma na letra declarada, antes e depois do apply, e nada persistiu"
    requirement: JORN-43
    verification:
      - kind: other
        ref: "node scripts/p51_mutacoes.cjs → controle verde; 6/6 mutacoes mordem; nada persistiu (pre e pos-apply)"
        status: pass
      - kind: other
        ref: "prova offline do contrato do runner (7 casos de mutacao, 8 de controle)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Ferramental da Onda B (p51_ensaio.cjs, p51_mutacoes.cjs) com o contrato que os planos 51-08, 51-10 e 51-13 consomem"
    requirement: JORN-43
    verification:
      - kind: other
        ref: "ensaios desta execucao (vistas=igual, PERSISTIU ausente em toda corrida)"
        status: pass
    human_judgment: true
    rationale: "As linhas P51B, P50C e P45M de SMOKES e a instrucao de gate interno so foram exercitadas offline. Rodam de verdade a partir do 51-08, 51-10 e 51-13"
  - id: D5
    description: "Publicado: push por sha com enumeracao; origin/main..HEAD vazio"
    requirement: JORN-43
    verification:
      - kind: other
        ref: "verify 4 da Task 3: remoto = HEAD, sha aplicado publicado"
        status: pass
    human_judgment: false

duration: 16min
completed: 2026-10-09
---

# Phase 51 Plan 06: chave `raven` em `get_avaliacao_status` Summary

**O candidato passa a ler do servidor, só como dois booleanos, se o Raven está liberado e se ele já o concluiu. A fonte é a chave `raven {liberado, registrado}` em `get_avaliacao_status` (DEFINER com guarda de titular), aplicada em PROD. No mesmo apply, o EXECUTE de `anon` foi retirado (aperto nomeado A4). Saíram também o ensaio e o runner de mutações de toda a Onda B.**

## Performance

- **Duration:** ~16 min (04:07:31Z → 04:23:34Z)
- **Tasks:** 3/3
- **Files:** 5 criados (4 de código + 1 registro em `.planning/`)

## Accomplishments

- A migration `20261008000001` foi aplicada pela via do projeto, com ledger = arquivo. O corpo é o vivo, byte a byte, mais a chave `raven`. Nenhuma policy mudou (D-38).
- A ACL agora é a de antes menos `anon`. `anon` recebe `permission denied for function`, e não mais `forbidden`.
- O smoke `p51_raven_status_smoke.sql` tem 7 cláusulas. Ficou vermelho pelo motivo certo nos dois vermelhos e verde com a migration, antes e depois do apply.
- O runner de mutações deu 6/6 antes e depois do apply, e nada persistiu.
- O FUNIL-12 legado continua verde. O fixture dele foi de fato construído (`smoke.ready=y`).

## Passo 0 — medição (só leitura, PROD, 2026-10-09)

| Medida | Valor |
|---|---|
| `md5(p.prosrc)` (forma do portão) | `0ad235f334b552ddcf00b65dbe7413be` |
| `md5(pg_get_functiondef)` (só conferência) | `2b9a8908c13f612a54fe829af21bd2af` |
| `pg_get_function_result` | `jsonb` |
| `prosecdef` / `provolatile` / `proconfig` | `true` / `v` / `{search_path=""}` |
| propriedades (string do portão) | `t\|v\|u\|f\|f\|f\|f\|{"search_path=\"\""}\|plpgsql\|postgres\|p_candidatura_id uuid\|jsonb` |
| `proacl` | `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` |
| `has_function_privilege('anon', …, 'EXECUTE')` | **`true`** (esperado; o aperto existe) |
| cabeça do ledger / `20261008000001` | `20261005000004` / ausente |
| `pg_get_functiondef` | guardado em `51-06-CORPO-ANTES.sql` (o md5 do corpo gravado é `0ad235f3…`, conferido) |

O COMMENT vivo difere do arquivo de 2026-07-12 porque foi encurtado no apply antigo pelo MCP. Por isso a migration reescreve o COMMENT inteiro.

## Os dois vermelhos sem a migration (Task 1, Passo 2)

| Corrida | Saída | Duração |
|---|---|---|
| `--sem-migracoes` | `ENSAIO VERMELHO: P51A FAIL (a): ACL = «anon:EXECUTE:…,authenticated:…,postgres:…,service_role:…» (esperado … MENOS anon) , anon EXECUTE=t` | 573 ms |
| `--sem-migracoes --mutacao=$TMPDIR/p51_06_red_sem_anon.sql` (só o `REVOKE … FROM anon`; scratch apagado depois) | `ENSAIO VERMELHO: P51A FAIL (b): leitura s0 — chave raven = <ausente> com chaves {}` | 498 ms |

## Ensaios verdes (requisição que aborta)

| Ensaio | Linha de veredito (resumida) | Duração |
|---|---|---|
| tracer, `--vistas --migracoes=…0001` | `prefixadas=[20261008000001] · vistas=igual · smokes=[51a=7/7] · evidencia=01:md5=91109b66c38babe34e8bd27556c9f03c 51a.f=3(lib=3,reg=1)` | 878 ms |
| FUNIL-12, `--migracoes=…0001` | `ENSAIO VERDE: supabase/tests/funil12_status_rpc_smoke.sql · prefixadas=[20261008000001] · smokes=[] · evidencia=01:md5=91109b66…` | 662 ms |
| FUNIL-12, prova de não-vacuidade (cópia de scratch que publica `smoke.ready`) | `evidencia=funil12.ready=y` | 498 ms |

**População da cláusula (f):** 3 candidaturas com liberação cujo titular tem `user_id` (3 vigentes, 1 com score: d31c78bb). A quarta liberação (dae837f4) é de um titular sem `user_id` e fica fora por definição. O RESEARCH mediu 4 liberações, 0 revogadas e 2 concluídas. A segunda concluída é justamente a do titular sem `user_id`.

## Mutações (Task 2) — antes do apply (`20261008000001` prefixada)

```
CONTROLE verde (supabase/tests/p51_raven_status_smoke.sql): par 51a=7/7 (519 ms)
MA1 morde: raven ganha um terceiro campo numerico lido de scores_raven.percentil -> P51A FAIL (b) (506 ms)
MA2 morde: guarda de titular desligada (IF NOT v_owns vira IF false) -> P51A FAIL (d) (517 ms)
MA3 morde: GRANT EXECUTE de get_avaliacao_status a anon depois da migration -> P51A FAIL (a) (564 ms)
MA4 morde: registrado passa a ler cognitivo_liberacao em vez de scores_raven -> P51A FAIL (c) (3823 ms)
MA5 morde: liberado ignora revogado_em -> P51A FAIL (c) (513 ms)
MA6 morde: corpo le scores_raven.percentil sem devolve-lo (saida segue booleana) -> P51A FAIL (e) (516 ms)
controle verde; 6/6 mutacoes mordem; nada persistiu
```

A prova offline do contrato do runner também passou: `parser por smoke, rotulos e guardas conferidos offline: 7 casos de mutacao, 8 de controle`.

## Apply (Task 3)

- **Sha fixado:** `refs/gsd/51-06/sha` = `66d8fea4af9e0d9f105fac4c5e8f16dc3621b1f6`. A base do review retroativo é `refs/gsd/51-06/base` = `bb629816…`.
- **Corpo de antes commitado antes do apply:** `98bd0ba3`, às 04:22:21Z. O apply começou às 04:22:42Z.
- **`node p46apply.cjs migrate`** (04:22:42Z → 04:22:43Z), no mesmo comando de: pin, `git diff --quiet pin HEAD -- . ':!.planning'` e árvore limpa.
  ```
  version : 20261008000001
  name    : p51_raven_em_avaliacao_status
  octetos : 16194
  md5     : bb0089882edabc1f8301b33cc1c09694
  ✅ aplicada e escriturada — md5 do ledger BATE (16194 octetos)
  ```
- **Os quatro verifies, em ordem:**
  1. `chave raven no ar: ledger = arquivo, DEFINER, ACL conferida`. O `proacl` vivo é `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` e o `md5(prosrc)` vivo é `91109b66c38babe34e8bd27556c9f03c` (= a evidência do POS-PORTAO no ensaio).
  2. `smoke ao vivo 7/7 (objetos vivos; requisicao abortada)`. Veredito: `prefixadas=[] · aplicadas=[20261008000001] · smokes=[51a=7/7] · evidencia=51a.f=3(lib=3,reg=1)` (496 ms). O FUNIL-12 também ficou verde contra os objetos vivos (395 ms).
  3. `portao morde contra os objetos vivos: 6/6`. O CONTROLE deu 503 ms. As mutações: MA1 (b) 505, MA2 (d) 674, MA3 (a) 615, MA4 (c) 513, MA5 (c) 511 e MA6 (e) 506 ms. Nada persistiu.
  4. `remoto = HEAD, sha aplicado publicado`.

**Enumeração do push** (`scripts/p50_enumera.cjs`, `da815714..98bd0ba3`, `--aplicado 66d8fea4`):

```
b694199c planning docs(51-05): complete recibo de exclusao diz o que sai e o que fica plan — SUMMARY, publicacao, WINDOWS 89
bb629816 planning docs(51-05): STATE/ROADMAP — 51-05 concluido, 5/17 (…)
040270f2 codigo   test(51-06): envelope de ensaio p51 + especificacao RED da chave raven
cb99c279 codigo   feat(51-06): tracer — chave raven so com booleanos em get_avaliacao_status (ensaio)
66d8fea4 codigo   test(51-06): runner de mutacoes da Onda B — MA1..MA5 mordem
98bd0ba3 planning docs(51-06): corpo vivo de get_avaliacao_status antes do apply
enumeracao ok: 6 commit(s) em da815714..98bd0ba3 · codigo contido no apply 66d8fea4
   da815714..98bd0ba3  98bd0ba3 -> main
```

Nenhuma tela muda neste plano. O card do painel é o 51-07, que consome esta chave.

## Task Commits

1. **Task 1 (tracer) RED:** `040270f2` (test). Envelope de ensaio p51 e especificação RED.
2. **Task 1 (tracer) GREEN:** `cb99c279` (feat). Migration e conserto da (z) no smoke.
3. **Task 2:** `66d8fea4` (test). Runner de mutações e a tabela «O PORTÃO MORDE».
4. **Task 3:** `98bd0ba3` (docs). Corpo vivo antes do apply. Depois disso, apply em PROD e push.

## Varredura D-56

Rodei o padrão literal do CLAUDE.md §«Portões» sobre `supabase/tests/*.sql`, antes do arquivo novo existir. Ele achou **368 linhas** e **0 achados** que tocam `get_avaliacao_status`, `cognitivo_liberacao` ou `scores_raven`. Os smokes que citam esses objetos foram lidos à mão (funil12, p44_export_drift, p45_motor, p48_cognitivo_notifica) e nenhum muda. Os detalhes estão no cabeçalho do smoke.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A negativa (z) reprovava «nenhuma fixture registrada» com a migration**
- **Found during:** Task 1, primeiro ensaio do tracer.
- **Issue:** `set_config('smoke51a.fixtures', …, false)` era chamado dentro da subtransação `P51A1`. O ROLLBACK dela também desfaz GUC de sessão, então a (z) via o registro vazio. As cláusulas (a)..(f) já passavam nessa corrida.
- **Fix:** o id da fixture passou a ser gravado fora da subtransação, a partir da variável PL/pgSQL.
- **Files modified:** `supabase/tests/p51_raven_status_smoke.sql`. O conserto foi junto no commit `feat` (`cb99c279`). Os dois commits da Task 1 continuam tocando só os três arquivos dela.
- **Verification:** o ensaio do tracer ficou verde, 7/7. Os dois vermelhos registrados acima reprovam antes da (z), então seguem válidos.

**2. [Rule 2 - Missing critical] Mutação MA6 para a cláusula (e)**
- **Found during:** Task 2, ao preencher «O PORTÃO MORDE».
- **Issue:** nenhuma das cinco mutações do plano chegava à (e), a cláusula de RNF-07a por forma. MA1 reprova em (b) antes. Sem mutação própria, a (e) era uma cláusula não vigiada.
- **Fix:** MA6 faz o corpo ler `scores_raven.percentil` sem devolvê-lo. A saída segue booleana, e só a (e) pega. Ela morde em (e), antes e depois do apply. O verify do plano aceita N/N com N ≥ 5.
- **Files modified:** `scripts/p51_mutacoes.cjs` e o cabeçalho do smoke. Commit `66d8fea4`. O assunto ficou o do plano («MA1..MA5 mordem»), mas o corpo do commit diz 6/6.

**3. [Rule 2 - Missing critical] `capturar()` também mede os titulares sintéticos**
- **Issue:** a lista do plano não cobre linhas de smoke que escapassem do envelope (`auth.users`/`candidatos` com e-mail `p51%smoke-%@invalido.local`).
- **Fix:** a chave `fixtures` em `capturar()`. Ela vale para todos os smokes p51 que seguirem esse idioma de e-mail.
- **Commit:** `040270f2`.

**4. [Verificação extra] Não-vacuidade do FUNIL-12**
- **Issue:** quando o fixture do `funil12_status_rpc_smoke.sql` não é construído, ele dá SKIP com NOTICE. A Management API não devolve NOTICE, então «verde» podia ser vácuo.
- **Fix:** rodei uma cópia de scratch, não commitada, que publica `smoke.ready` em `p51.evidencia`. Resultado: `funil12.ready=y`. O arquivo legado não foi tocado.

**Total deviations:** 3 auto-fixed (1 Rule 1, 2 Rule 2) e 1 verificação extra. **Impacto:** o portão ficou mais estrito (uma cláusula a mais vigiada, um resíduo a mais medido). Nenhuma expectativa foi afrouxada.

## Issues Encountered

- MA4 levou 3823 ms antes do apply, contra ~500 ms das outras. Depois do apply, rodou em 513 ms. Foi uma variação isolada, abaixo do teto de 5 s por instrução, e não se repetiu.
- A sonda de vistas (`--vistas`) não cobre ACL de **função**. O aperto de `anon` em `get_avaliacao_status` é vigiado pela cláusula (a) e pela MA3, não por `vistas=igual`.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`. T-51-18..T-51-23 mitigados como planejado. O T-51-20 (anon) foi fechado pelo aperto, e o operador o confirma na pergunta (f) do 51-16.

## Next Phase Readiness

- O 51-07 pode consumir `get_avaliacao_status(...)->'raven'`. O `avaliacaoService` ainda não lê a chave. O card do painel é desse plano.
- Os planos 51-08, 51-10 e 51-13 acrescentam entradas a `MUTACOES` com as linhas já fixadas em `SMOKES`. A versão é `20261008000002..4` em `MIGS`.
- O 51-16 revisa este código retroativamente a partir de `refs/gsd/51-06/base`. Na pergunta (f), o operador confirma ou veta o aperto A4.
- O JORN-43 segue aberto. Ele também é declarado pelo 51-07 (card do painel) e pelo 51-17, e o gate de ID compartilhado deu `requirements.ready-ids` 0/1.

## Self-Check: PASSED

- Arquivos: os 5 de `key-files.created` existem no disco.
- Commits: `040270f2`, `cb99c279`, `66d8fea4` e `98bd0ba3` são ancestrais de HEAD e estão em `origin/main`.
- PROD: o ledger `20261008000001` tem md5 = md5 do arquivo (`bb0089882edabc1f8301b33cc1c09694`); `anon` está sem EXECUTE; o smoke vivo deu 7/7; mutações 6/6 ao vivo.
