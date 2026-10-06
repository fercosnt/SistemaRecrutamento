---
phase: 50-acesso-do-recrutador
plan: 10
subsystem: database
tags: [postgres, rls, security-definer, prod-apply, p46apply, efdeploy, edge-functions, review-gate, d-04, d-08, d-12, export-05]

requires:
  - phase: 50-acesso-do-recrutador
    provides: "50-02: helper is_active_rh_user + rh_le_candidaturas vivos (20261005000001); 50-03/04/05: migrations 0002/0003/0004 escritas e ensaiadas; 50-06: 5 EFs sem posse; 50-07: smoke v2 + runner v2; 50-08/09: legados em pares + varredura; 50-REVIEW-ACESSO-1/2 + rodada de conserto"
provides:
  - "20261005000002 (13 policies + v_analises_presas security_invoker), 20261005000003 (7 RPCs de leitura/filas), 20261005000004 (11 RPCs de escrita, D-04) aplicadas em PROD pela via do projeto, ledger md5 = arquivo"
  - "5 EFs sem posse de vaga publicadas (comparativo-candidatos v33, get-curriculo-url v6, consolidar-decisao-final v11, gerar-guia-entrevista v25, avaliar-transcricao-entrevista v22), ACTIVE, verify_jwt=true"
  - "SC1 (metade impersonação), SC2, SC3, SC4, SC5 provados contra os objetos VIVOS (smoke 13/13, D-23 comportamental), vistas externas sem abertura, varredura 0/0, runner 25/25"
  - "origin/main = 743c4fca (push enumerado, 52 commits); todo 42 com a linha D-04"
affects: [50-11]

actuals:
  tokens: 82455
  tasks: 3
  commits: 16
plan_head_before: 884a41d124f94ca778827f933006f1b69c2545ec
plan_head_after: 743c4fcad34d3ce33d03af36d446681f9cf078c4

tech-stack:
  added: []
  patterns:
    - "Cada escrita em PROD (3 applies, 5 deploys, push) no MESMO comando que a cadeia revisão/pin/árvore limpa — nenhuma conferência separada da escrita"
    - "Antes do apply: ensaio de ida (3 migrations + vistas numa requisição que aborta) e ida+volta do desfazer; depois do apply: desfazer ensaiado contra o estado vivo"

key-files:
  created:
    - .planning/phases/50-acesso-do-recrutador/50-10-SUMMARY.md
    - refs/gsd/50-10/sha (ref local, 703613e8)
  modified:
    - .planning/todos/pending/42-anon-execute-definer-sistemico.md

key-decisions:
  - "Pin refs/gsd/50-10/sha = 703613e8 (HEAD no momento do apply; código = reviewed_head 0e671953 do 50-REVIEW-ACESSO-2)"
  - "deno test das 5 EFs rodado imediatamente antes da cadeia de deploy (IN-08, disposição do orquestrador): 146 passed, 0 failed"
  - "Linha do todo 42 lista as 6 funções que perderam EXECUTE de anon (medidas no 50-04/50-05) e foi conferida ao vivo depois do apply"
  - "Commits de metadados (SUMMARY, STATE, ROADMAP) caem depois do push: ficam só locais, como no 50-02"

patterns-established:
  - "Disposição de achado de revisão registrada com autor (operador × orquestrador) e data, nunca atribuída por inferência"

requirements-completed: []
requirements-addressed: [EXPORT-05]

coverage:
  - id: D1
    description: "Revisão bloqueante: 50-REVIEW-ACESSO-2 com critical 0, diff_base = base da expansão, nada de código nem do plano depois do reviewed_head"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "<verify> da Task 1 → «revisao da expansao sem critico cobrindo a base e o 50-10: .planning/phases/50-acesso-do-recrutador/50-REVIEW-ACESSO-2.md»"
        status: pass
    human_judgment: true
  - id: D2
    description: "3 migrations aplicadas por p46apply migrate, ledger md5 = arquivo; D-08 intocado"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "«3 migrations no ledger com md5 = arquivo»; «D-08: anonimizar_candidato e plano_exclusao_titular intocados (impressao digital antes = depois, n=2)»"
        status: pass
    human_judgment: false
  - id: D3
    description: "SC1–SC5 ao vivo: smoke v2 13/13 pelo ensaio que aborta, 07:d23=comportamental>e:42501; vistas externas iguais (+fechou dos 4 anon); varredura 0/0; desfazer vivo 32/32; runner 25/25"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "«smoke ao vivo: 13/13, D-23 comportamental …»; «vistas externas: … iguais+fechou[…]»; «varredura: 27 arquivos · ok=17 reescritos=9 pre-existentes=1 inconclusivos=0 · regressoes=0 investigar=0»; «desfazer ensaiado contra o estado VIVO aplicado …»; «portao morde contra os objetos vivos: 25/25»"
        status: pass
    human_judgment: false
  - id: D4
    description: "5 EFs publicadas ACTIVE verify_jwt=true; push enumerado; origin/main..HEAD vazio; todo 42 anotado"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "«5 EFs publicadas (ACTIVE, verify_jwt=true)»; «remoto = HEAD, expansao publicada, todo 42 anotado»"
        status: pass
    human_judgment: false

duration: ~7min (continuação, 04:13:17Z–04:20Z); plano inteiro desde o 50-REVIEW-ACESSO-1 (2026-10-06T02:48Z) ~1h32
completed: 2026-10-06
status: complete
---

# Phase 50 Plan 10: Expansão do acesso do recrutador em PROD — Summary

**As três migrations da expansão (`20261005000002..4`) estão no ar pela via do projeto, com o md5 do ledger igual ao do arquivo. As 5 EFs sem posse de vaga foram publicadas a partir do commit fixado, e o repositório foi enviado (`origin/main` = `743c4fca`). Contra os objetos vivos: o smoke v2 deu 13/13 com D-23 comportamental, as vistas externas não abriram nada (só os 4 fechamentos conhecidos de `anon`), a varredura deu 0 regressão e 0 inconclusivo, o runner deu 25/25 mutações mordendo, e o motor de exclusão (D-08) ficou com a mesma impressão digital. Fica só a prova de sessão real (50-11).**

## Performance

- **Continuação:** 2026-10-06T04:13:17Z → ~04:20Z (~7 min). Nenhuma recusa, nenhum STOP.
- **Plano inteiro:** do `50-REVIEW-ACESSO-1` (02:48Z) ao push (04:19:39Z).
- **Tarefas:** 3 de 3. **Arquivos neste plano:** 21 (3811 inserções, 107 remoções em `884a41d1..743c4fca`).

## Task 1 — revisão bloqueante (checkpoint resolvido)

| revisão | commit | reviewed_head | diff_base | achados |
|---|---|---|---|---|
| `.planning/phases/50-acesso-do-recrutador/50-REVIEW-ACESSO-1.md` | 33ef6ccd | 884a41d1 | 9271ba43 (= `refs/gsd/50-expansao/base`) | 0 critical / 10 warning / 8 info |
| `.planning/phases/50-acesso-do-recrutador/50-REVIEW-ACESSO-2.md` | 703613e8 | 0e671953 | 9271ba43 | 0 critical / 3 warning / 4 info |

Rodada de conserto entre as duas (13 commits): 7eba33ec, e176bf1c, 419927a6, 6ecf0454, 9038e04a, 6ff57636, c5bd3614, bbba7996, f6d8f559, 7812eda4, c99c8c32, 524f8ca0, 0e671953.

**Verify da Task 1, rodado ao retomar:** `revisao da expansao sem critico cobrindo a base e o 50-10: .planning/phases/50-acesso-do-recrutador/50-REVIEW-ACESSO-2.md`.

### Respostas do operador (verbatim)

- **2026-10-05, Task 1 (a)/(b)/(c):** «a aceito, b sim, c ciente»
- **2026-10-05, depois do ACESSO-1:** «1»
- **2026-10-06, escopo do WR-06:** «1»

Leitura, pelo orquestrador que repassou as respostas:
- (a) aceita as escolhas do planejador da expansão. Inclui a consequência da conta híbrida e o IN-01 do ACESSO-1: um token rh continua válido por até 1 h depois de rebaixado a visualizador, agora também nas 11 RPCs de escrita.
- (b) confirma que nenhuma outra janela vai trabalhar neste projeto.
- (c) está ciente de que o apply troca todas as telas do RH de uma vez e de que as EFs sobem logo depois.
- O «1» depois do ACESSO-1 manda consertar WR-01..WR-09, incluindo as mudanças de comportamento das EFs (WR-06/WR-07).
- O «1» de 2026-10-06 manda o filtro de candidatura viva das 5 EFs valer para todos, administrador incluído. Isso é deliberadamente mais estrito que o ramo do administrador no banco.

### Disposição dos achados do 50-REVIEW-ACESSO-2

| achado | disposição | autor |
|---|---|---|
| WR-01 (a saída (i), «revert com commit novo», trava o push) | Não usar a saída (i). Se a cadeia de deploy recusar por qualquer motivo, parar com checkpoint, sem revert, re-pin nem reset. **Não ocorreu:** os 5 deploys passaram na cadeia | orquestrador |
| WR-02 (INCONCLUSIVO num smoke reescrito passa no portão) | Depois do apply, qualquer `inconclusivos>0` ou INCONCLUSIVO num arquivo alterado desde `refs/gsd/50-expansao/base` é STOP. **Medido:** `inconclusivos=0` nas duas rodadas e no `--comparar` | orquestrador |
| WR-03 (`capturar()` cega a corpos, ACL e opção da vista) | Resíduo aceito: o PRE/POS das 32 impressões do próprio desfazer cobre esses objetos. **Medido:** `--conferir` 32/32 antes; ida+volta `pre_diferentes=32/32,pos=iguais:32`; desfazer contra o vivo `pre_diferentes=32/32,pos=iguais:32` | orquestrador |
| IN-01..IN-04 | Resíduo registrado | orquestrador |
| IN-08 (o `deno test` fica fora da cadeia de deploy) | Rodar o `deno test` das 5 EFs logo antes da cadeia de deploy, e qualquer falha é STOP. **Medido:** `ok \| 146 passed \| 0 failed` | orquestrador |
| INFOs herdadas do ACESSO-1 (IN-01..IN-07, conforme a tabela do ACESSO-2) | Resíduo registrado | orquestrador |

## Task 2 — apply em PROD

**Pin:** `refs/gsd/50-10/sha` = `703613e870cd16599cc3f1473c9b3842cf0b676a`. Era HEAD no momento dos três applies. O código nele é igual ao do `reviewed_head` 0e671953.

**Pré-condições:** ledger p50 = `["20261005000001"]`; `git status --porcelain -- supabase src scripts p46apply.cjs efdeploy.cjs` vazio; `origin/main` = 9271ba43.

### Step 1 — ANTES (leitura ou requisição que aborta)

- **a) vistas «antes»** (04:13:28Z): `vistas-antes-ok`; `ledger_p50=["20261005000001"]`; 17 relações; atores anon, candidato, rh_inativo, sem_claims; `admin_ve_tudo` todo true.
- **b) varredura `--rotulo=antes`** (04:13:32–04:14:31Z): `rodada antes: 27 arquivos … ledger=["20261005000001"]`. 17 VERDE; 10 VERMELHO, dos quais 9 são os legados reescritos que exigem a expansão e o décimo é `p49_prova_prod.sql` (`ERRO <n>: unrecognized configuration parameter`, pré-existente).
- **c) captura D-08:** `plano_exclusao_titular(uuid)` = `3ecb2df4e60ae1d2e285a0876da9e2b1` e `anonimizar_candidato(uuid,boolean)` = `41b609f35f7c7e36ec96eec59b73d055` (as mesmas do 50-04/50-05).
- **d) ensaio de ida** (04:14:40Z):
  - Veredito: `ENSAIO VERDE: - · prefixadas=[20261005000002,20261005000003,20261005000004] · aplicadas=[20261005000001] · ausentes=[] · vistas=igual+fechou[anon.public.decisao_final_historico,anon.public.entrevista_analises,anon.public.entrevista_guias,anon.public.scores_candidato] · smoke50=n/a`.
  - Evidência: `04:anon=false;04:d08=igual:n=2;05:anon=false;05:d08=igual:n=2`.
  - Linha do verify: `ensaio de ida: vistas externas iguais antes x depois das tres migrations, na mesma transacao (abortada)`.
- **e) desfazer** (04:14:49Z):
  - `desfazer confere com PROD: 32/32 impressoes iguais (funcoes=18 politicas=13 vistas=1) · ledger=[]`.
  - `ENSAIO VERDE: - · prefixadas=[…0002,…0003,…0004] · aplicadas=[20261005000001] · ausentes=[] · vistas=igual · smoke50=n/a · evidencia=…desfazer:pre_diferentes=32/32,pos=iguais:32`.
  - Linha do verify: `desfazer: confere com PROD e devolve o catalogo e as vistas externas ao estado de antes (ida+volta, requisicao abortada)`.

### Step 2 — os três applies (cada um no mesmo comando que a cadeia revisão/pin/árvore limpa)

| migration | início | fim | octetos | md5 | saída |
|---|---|---|---|---|---|
| `20261005000002_p50_policies_rh_ativo.sql` | 04:15:03Z | 04:15:04Z | 36968 | 503f12035110f4bf9559d5c742c4eb0a | `✅ aplicada e escriturada — md5 do ledger BATE (36968 octetos)` |
| `20261005000003_p50_rpcs_leitura_filas.sql` | 04:15:14Z | 04:15:15Z | 57924 | 7372ac4e4b082971156fb5434b31c25b | `✅ aplicada e escriturada — md5 do ledger BATE (57924 octetos)` |
| `20261005000004_p50_rpcs_escrita.sql` | 04:15:25Z | 04:15:26Z | 79283 | 114ea102e29a4cee44623dc52bf75533 | `✅ aplicada e escriturada — md5 do ledger BATE (79283 octetos)` |

Nenhuma recusa da cadeia, nenhum `55P03`/`57014`. Nenhum commit entre os três, então HEAD ficou igual ao pin.

### Step 3 — DEPOIS (verifies na ordem do plano)

1. **Ledger:** `3 migrations no ledger com md5 = arquivo`.
2. **D-08:** `D-08: anonimizar_candidato e plano_exclusao_titular intocados (impressao digital antes = depois, n=2)`.
3. **Smoke ao vivo** (04:15:40Z), só pelo ensaio que aborta:
   - Veredito: `ENSAIO VERDE: supabase/tests/p50_acesso_recrutador_smoke.sql · prefixadas=[] · aplicadas=[20261005000001,20261005000002,20261005000003,20261005000004] · ausentes=[] · smoke50=13/13`. Linha do verify: `smoke ao vivo: 13/13, D-23 comportamental (objetos vivos; requisicao abortada; nada persistiu)`.
   - Recortes da evidência:
     - `07:vacuos=-`;
     - `07:d23=comportamental>e:42501,outro>ok,literal=true`;
     - `07:sc5=decisor>e:42501,outro>ok,proprias_pode=2/0,decisor_semeado=sim`;
     - `07:cobertura=183/183,antiga=155/183,mordida=real`;
     - `07:pol_por_schema=cron:2,public:155,storage:26`;
     - `07:formas=pol_rh:14,fn_rh:18`;
     - `07:mordida_pg_temp=exata`;
     - `07:rpcs=18`;
     - `07:sc4_semeados=2(orfao=1),revisao_semeada=nao,revisoes_pendentes=2`.
   - SC4: admin e rh ativo têm filas idênticas (`listar_pedidos_dados>n:5:70fc632f4e74`, `listar_revisoes_decisao_true>n:3:b8603d134007`, `listar_revisoes_decisao_false>n:2:2cd47009c1ce`, contadores `i:2`/`i:2`). O token velho fica em 0, e o candidato recebe `e:42501`.
   - Populações (`07:pop`): agendamentos 2, analise_candidato_vaga 26, candidaturas vivas 40, comparativo 6, decisao_final 7, historico_decisao 11, entrevista_analises 14, entrevista_guias 6, historico_candidatura 79, notificacoes 73, redacoes 3, scores 19, v_analises_presas 0→1 (semeada).
4. **Vistas externas** (04:15:53Z): `vistas externas: antes sem e depois com 20261005000002..4; 17 relacoes; admin ve tudo; iguais+fechou[anon.public.entrevista_guias,anon.public.scores_candidato,anon.public.entrevista_analises,anon.public.decisao_final_historico]`.
   - Nenhuma relação saiu como AMBIGUO POR TRAFEGO, nenhuma como MUDOU SEM TRAFEGO.
   - O `+fechou` são exatamente os 4 fechamentos de `anon` esperados do `…0002` (de recusa para vazio). O ensaio de ida do Step 1 d mostrou os mesmos 4.
5. **Varredura antes × depois** (04:15:58–04:16:54Z): `varredura: 27 arquivos · ok=17 reescritos=9 pre-existentes=1 inconclusivos=0 · regressoes=0 investigar=0`. Linha do verify: `varredura antes x depois: sem regressao (rodadas carimbadas: antes sem e depois com 20261005000002..4)`.
   - Carimbos: o «antes» tem `ledger=["20261005000001"]`; o «depois» tem `ledger=["20261005000001","20261005000002","20261005000003","20261005000004"]`.

   | arquivo | antes | depois | veredito |
   |---|---|---|---|
   | funil34_kpis_smokes.sql | VERMELHO `SEG-34 FAIL (gate)` | VERDE | esperado-reescrito |
   | oper31_rejeitar_candidatura_smokes.sql | VERMELHO `OPER-31 FAIL (e)` | VERDE | esperado-reescrito |
   | p37_lacunas_rls_idempotencia_smokes.sql | VERMELHO `P37-LAC FAIL (h)` | VERDE | esperado-reescrito |
   | p44_pedidos_dados_smoke.sql | VERMELHO `P44 FAIL (k)` | VERDE | esperado-reescrito |
   | p47_historico_smoke.sql | VERMELHO `P47H FAIL (b)` | VERDE | esperado-reescrito |
   | p49_44_resposta_caso_aberto_smoke.sql | VERMELHO `P49C FAIL (b)` | VERDE | esperado-reescrito |
   | sec05_08_smokes.sql | VERMELHO `SEC-05 FAIL (analise/ativo)` | VERDE | esperado-reescrito |
   | seg32_smokes.sql | VERMELHO `SEG-32 FAIL (b)` | VERDE | esperado-reescrito |
   | seg33_agendamento_smokes.sql | VERMELHO `SEG-33 FAIL (a)` | VERDE | esperado-reescrito |
   | p49_prova_prod.sql | VERMELHO | VERMELHO `ERRO <n>: unrecognized configuration parameter` | **pre-existente** (arquivo que a fase não tocou) |
   | os outros 17, incluindo p45_motor_exclusao, p42_revisao_art20, p48_*, p49_* | VERDE | VERDE | ok |

   O p45 (motor de exclusão) saiu VERDE nas duas rodadas. Não houve INCONCLUSIVO, então a regra de STOP do WR-02 não disparou.
6. **Desfazer contra o estado vivo** (04:17:00Z): `ENSAIO VERDE: - · prefixadas=[] · aplicadas=[20261005000001,20261005000002,20261005000003,20261005000004] · ausentes=[] · smoke50=n/a · evidencia=desfazer:pre_diferentes=32/32,pos=iguais:32`. Linha do verify: `desfazer ensaiado contra o estado VIVO aplicado: catalogo volta as impressoes capturadas antes do apply (requisicao abortada; nada desfeito)`.
7. **Runner de mutações** (04:17:06–04:17:33Z):
   - `CONTROLE verde — sentinela alcancado, smoke50=13/13, nenhum P50C FAIL`.
   - M1..M25 mordem todas, cada uma na letra declarada; M24 em `(i) [ativo.save_entrevista_guia_edits/3]` e M25 em `(l) [d23]`.
   - `leitura so-leitura igual a baseline: helper=presente ledger=[…0001 e7383d5d…, …0002 503f1203…, …0003 7372ac4e…, …0004 114ea102…] politicas(public)=155 usuarios_rh=7 borda=0`.
   - `controle verde; 25/25 mutacoes mordem; nada persistiu`. Linha do verify: `portao morde contra os objetos vivos: 25/25 (todas as definidas no runner); nada persistiu`.

**Ledger depois:** `20261005000001`, `20261005000002` (md5 503f1203…), `20261005000003` (7372ac4e…), `20261005000004` (114ea102…).

## Task 3 — EFs, todo 42, push

**IN-08** (04:17:43Z): `deno test --allow-env --allow-read --config supabase/functions/deno.json` nas 5 EFs → `ok | 146 passed | 0 failed`. A árvore continuou limpa.

| EF | início | fim | saída |
|---|---|---|---|
| comparativo-candidatos | 04:17:56Z | 04:17:59Z | `efdeploy: OK · version=33 · status=ACTIVE · verify_jwt=true` (14 arquivos) |
| get-curriculo-url | 04:18:10Z | 04:18:11Z | `efdeploy: OK · version=6 · status=ACTIVE · verify_jwt=true` (1 arquivo) |
| consolidar-decisao-final | 04:18:19Z | 04:18:20Z | `efdeploy: OK · version=11 · status=ACTIVE · verify_jwt=true` (3 arquivos) |
| gerar-guia-entrevista | 04:18:31Z | 04:18:36Z | `efdeploy: OK · version=25 · status=ACTIVE · verify_jwt=true` (14 arquivos) |
| avaliar-transcricao-entrevista | 04:18:46Z | 04:18:49Z | `efdeploy: OK · version=22 · status=ACTIVE · verify_jwt=true` (15 arquivos) |

Verify: `5 EFs publicadas (ACTIVE, verify_jwt=true)`.

**Todo 42:** uma linha datada, acrescentada no fim (diff de 1 inserção, commit 743c4fca). A linha lista as 6 funções que perderam EXECUTE de `anon`: `funil_kpis`, `rejeitar_candidatura`, `reprocessar_analise`, `salvar_revisao_redacao`, `save_entrevista_guia_edits`, `upsert_pergunta_opcoes_metadata`. Antes de escrever, conferi ao vivo (somente leitura) que `has_function_privilege('anon', …, 'EXECUTE')` dá false nas 6.

**Push** (04:19:31–04:19:39Z): `9271ba43..743c4fca  743c4fcad34d3ce33d03af36d446681f9cf078c4 -> main`. O push foi por sha, sem força.
- Enumeração: `enumeracao ok: 52 commit(s) em 9271ba43..743c4fca · codigo coberto por 50-REVIEW-ACESSO-2.md (reviewed_head 0e671953) · codigo contido no apply 703613e8`.
  - Classes: `codigo`, que são os `feat/test/fix/chore(50-NN)` do 50-01 ao 50-10 (inclusive a rodada de conserto pré-onda-3 do tracer, `fix(50-01)` depois de 9271ba43), e `planning`. Nenhum ALHEIO.
  - A lista completa dos 52 está no log `$TMPDIR/p50_10_enumera.log`.
- Verify: `remoto = HEAD, expansao publicada, todo 42 anotado`. `git log --oneline origin/main..HEAD` saiu vazio.
- O front mudou só em comentários, então não há marcador servido para conferir.

## Task Commits

1. **Task 1** (checkpoint): commits da revisão e da rodada de conserto, de agentes anteriores: 33ef6ccd, 7eba33ec, bbba7996, f6d8f559, 7812eda4, c99c8c32, 524f8ca0, 6ff57636, 419927a6, e176bf1c, 6ecf0454, 9038e04a, c5bd3614, 0e671953, 703613e8.
2. **Task 2:** nenhum arquivo do repositório. As escritas em PROD foram por `p46apply.cjs migrate`, e a evidência ficou nos logs `p50_10_*` em `$TMPDIR`.
3. **Task 3:** `743c4fca` — `docs(50-10): registra no todo 42 o que a Phase 50 fechou (D-04)`.

## Deviations from Plan

**1. [Rule 3 - Blocking] Ledger do plano reconstruído.** Não existia `.git/gsd-plan-head-before-50-10`. Gravei nele `884a41d1`, o pai do primeiro commit do plano (33ef6ccd). Com isso `commits: 16` é medido por `git rev-list --count 884a41d1..743c4fca`.

**2. [Processo] Dois deploys rodaram em paralelo.** Os de `get-curriculo-url` e `consolidar-decisao-final` saíram em chamadas paralelas, e não estritamente um depois do outro com «parar na primeira falha». Cada um rodou com a cadeia completa no próprio comando, e os dois deram OK. Não houve efeito, mas fica registrado.

**3. [Adição autorizada] `deno test` antes da cadeia de deploy.** O orquestrador dispôs assim para o IN-08. Não está no texto do plano.

**4. [Redação] A linha do todo 42 tem um parêntese a mais em relação ao modelo do plano.** Ele diz que a lista foi medida no 50-04/50-05 e conferida ao vivo. Continua uma linha só, acrescentada no fim.

## Issues Encountered

Nenhum. Nenhuma cadeia recusou, nenhum verify ficou vermelho, nenhum INCONCLUSIVO, nenhum PERSISTIU.

## Residuals (registrados, não consertados)

- WR-03 do ACESSO-2 (`capturar()` cega a corpos e ACL); IN-01..IN-04 do ACESSO-2; IN-01..IN-07 do ACESSO-1. Disposições na tabela acima.
- O «Undo» do plano segue válido: artefato `supabase/tests/p50_desfazer_expansao.sql`, ensaiado contra o vivo (32/32). Executá-lo exige checkpoint do operador. O IN-03 do ACESSO-2 lembra que o redeploy das EFs da base não tem procedimento escrito, e que as versões da base não têm os consertos WR-06/WR-07.

## Next Phase Readiness

- 50-11 (prova de sessão real com o RH2 ativo) pode começar: banco, EFs e repositório estão iguais e no ar.
- Os commits de metadados deste plano (SUMMARY, STATE, ROADMAP) caem depois do push e ficam **só locais**, como no 50-02.

## Self-Check: PASSED

- FOUND: `50-10-SUMMARY.md`, `42-anon-execute-definer-sistemico.md` (1 linha `Phase 50 (D-04)`), `supabase/tests/p50_desfazer_expansao.sql`
- FOUND: commits 743c4fca, 703613e8, 33ef6ccd, 0e671953; ref `refs/gsd/50-10/sha` = 703613e8
