---
phase: 49-consertos-da-jornada-bloco-2
plan: "45"
subsystem: database
tags: [deploy, management-api, migration, rls, restrictive-policy, security-definer, vercel, lazy-chunk, wr-07, jorn-41, d-52, d-54, d-55]
status: complete
gap_closure: true

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "44"
    provides: "migration 20261003000001 (RPC ler_resposta_caso_aberto_sjt, helper caso_aberto_sjt_enviado, três RESTRICTIVE cand_congela_caso_aberto_*), smoke p49_44 de 9 cláusulas, front RespostaCasoAbertoSjt; revisado no 49-REVIEW-GAPS-9 (0 críticos)"
provides:
  - "migration 20261003000001 aplicada em PROD (2026-10-03T19:49:16Z–19:49:17Z) ANTES do push; md5 do ledger = md5 do arquivo = 7750c40767d99f7c8dc597ece70172be (29851 octetos)"
  - "exposição ao vivo: anon sem EXECUTE (catálogo E «permission denied for function»), 3 RESTRICTIVE TO {authenticated}, 0 PERMISSIVE nova, FORCE RLS falso; smoke p49_44 9/9; motor de exclusão verde antes e depois"
  - "front 8581e98d172046df7cea0379b8e8b0b366f1090e publicado pelo sha (Vercel success); marcador decisao-sjt-resposta-caso-aberto AUSENTE antes, PRESENTE depois em /assets/DecisaoFinalPage-Zw-MAwxN.js"
  - "STATE.md: linha «WR-07 — ENTREGUE» logo abaixo da pendência do WR-07 (byte-igual), com R1–R4, a disposição do operador e o IN-04 do -9 como pendência sem dono"
  - "ref refs/gsd/49-45/sha = 8581e98d (local, não publicado como ref)"
affects: [49-VERIFICATION re-verificação do JORN-41, primeiro plano que rodar db:types (retira o cast estreito de getRespostaCasoAbertoSjt), quem levar config_purga.modo a live (IN-04 do -9)]

actuals:
  tokens: 600
  tasks: 3
  commits: 1
  plan_head_before: 8581e98d172046df7cea0379b8e8b0b366f1090e
  plan_head_after: 05fb6fd8094a8fa133c78641303bef67a6012815

tech-stack:
  added: []
  patterns:
    - "Pino da publicação amarrado ao reviewed_head no MESMO comando que cria o ref (git diff --name-only <reviewed_head> <sha> -- . ':!.planning' vazio), fechando a janela do IN-02 do -9"
    - "Crawler com até 5 tentativas a ~40 s num único processo node (setTimeout), cada tentativa registrada com horário; o primeiro AUSENTE pós-push é inconclusivo"

key-files:
  created:
    - .planning/phases/49-consertos-da-jornada-bloco-2/49-45-SUMMARY.md
  modified:
    - .planning/STATE.md

key-decisions:
  - "Nenhuma decisão nova do executor. A publicação seguiu os comandos literais do plano; o único acréscimo (conferência do IN-02 no comando do pino) foi instrução do orquestrador"
  - "Os commits de metadados do GSD (SUMMARY, STATE, ROADMAP) também são publicados, por instrução do orquestrador (no fim, origin/main..HEAD vazio), pela mesma enumeração que julga pelos arquivos. O plano dizia que ficariam locais, como no 49-43"

patterns-established: []

requirements-completed: []  # JORN-41 fica [ ]: só o verificador marca (proibição do plano; WR-05 do REVIEW-GAPS-8)

coverage:
  - id: D1
    description: "migration 20261003000001 aplicada pela via do projeto antes do push, escriturada, com ACL, políticas e FORCE RLS conferidos ao vivo"
    requirement: JORN-41
    verification:
      - kind: integration
        ref: "Task 2 <verify> 1 (catálogo/ledger) e 3 (anon sob SET LOCAL ROLE anon)"
        status: pass
    human_judgment: false
  - id: D2
    description: "comportamento ao vivo: smoke p49_44 9/9 sobre fixture povoada; motor de exclusão sem regressão"
    requirement: JORN-41
    verification:
      - kind: integration
        ref: "Task 2 <verify> 2 (smoke ao vivo: 9/9) e 4 (motor: verde antes e depois)"
        status: pass
    human_judgment: false
  - id: D3
    description: "front publicado pelo sha fixado, marcador servido num chunk lazy"
    requirement: JORN-41
    verification:
      - kind: integration
        ref: "Task 3 <verify> 1 (remoto = HEAD) e 3 (crawler: PRESENTE em DecisaoFinalPage-Zw-MAwxN.js)"
        status: pass
    human_judgment: false
  - id: D4
    description: "conferência visual do botão e do texto dentro do bloco âmbar, em PROD"
    verification: []
    human_judgment: true
    rationale: "População com sinal em PROD = 0: hoje nenhum RH vê o botão. Recomendação do planejador: juntar ao item 2 do 49-UAT.md"

duration: 6min
completed: 2026-10-03
---

# Phase 49 Plan 45: publicação do WR-07 (RH lê o caso aberto da SJT) — Summary

**A migration `20261003000001` foi aplicada em PROD pela Management API, com md5 do ledger igual ao do arquivo (`7750c407…`). Depois, catálogo, ACL do anon, smoke 9/9 e motor de exclusão foram provados ao vivo. Só então o front `8581e98d` foi publicado pelo sha exato: o marcador `decisao-sjt-resposta-caso-aberto` estava AUSENTE antes e passou a ser servido em `DecisaoFinalPage-Zw-MAwxN.js`. R1–R4 foram publicados registrados, não fechados. O JORN-41 fica `[ ]` à espera do verificador.**

## Performance

- **Duração da continuação:** ~6 min (2026-10-03T19:48:21Z → ~19:54Z)
- **Tasks:** 3/3 (Task 1 atravessada no checkpoint e conferida aqui; Task 2 apply e provas; Task 3 push, crawler e STATE)
- **Commits do plano:** `05fb6fd8` (STATE), mais o commit deste SUMMARY

## Linha do tempo (UTC)

| Passo | Horário | Resultado |
|---|---|---|
| Task 1 `<verify>` | 19:48 | `re-revisao sem critico cobrindo o 49-44 e o 49-45: …/49-REVIEW-GAPS-9.md` |
| Remoto no início | 19:48:21 | `67669214a86ba78b60d4f45e390a5b822917f370 refs/heads/main` |
| Pino `refs/gsd/49-45/sha` + conferência IN-02 | 19:48 | `8581e98d…`; `diff f039fa6e..8581e98d fora de .planning vazio` |
| Enumeração do Passo 0 | 19:48 | `enumeracao ok: 17 commit(s) em 46f2a52d..8581e98d` |
| Crawler ANTES | 19:48:43 | AUSENTE (51 visitados); controle `decisao-sjt-sinal-revisao` PRESENTE em `DecisaoFinalPage-BfpjJuaG.js` |
| Smoke do motor ANTES | ~19:49 | `exit=0`, 0 `P45M FAIL` |
| **Apply** | **19:49:16–19:49:17** | aplicada e escriturada, md5 do ledger BATE |
| `<verify>` 1–4 da Task 2 + população DEPOIS | 19:49–19:50 | os quatro verdes; população igual |
| **Push do sha `8581e98d`** | **19:50:07–19:50:13** | `67669214..8581e98d -> main` |
| Vercel (status GitHub do sha) | 19:50:39 | `success` |
| Crawler DEPOIS, tentativa 1 | 19:50:26 | AUSENTE (inconclusivo) |
| Crawler DEPOIS, tentativa 2 | 19:51:17 | PRESENTE em `/assets/DecisaoFinalPage-Zw-MAwxN.js` |
| Commit `05fb6fd8` (STATE) e push | 19:52:15–19:52:20 | `8581e98d..05fb6fd8 -> main` |

A ordem exigida se cumpriu: apply < quatro provas verdes < push do front < marcador servido < STATE.

## Task 1: re-revisão e respostas do operador (checkpoint atravessado; só conferido)

**`<verify>` rodado literalmente na retomada:** `re-revisao sem critico cobrindo o 49-44 e o 49-45: .planning/phases/49-consertos-da-jornada-bloco-2/49-REVIEW-GAPS-9.md`.

**Reviews:**
- O mais recente é `49-REVIEW-GAPS-9.md` (commit `9193198d`): critical 0, warning 1, info 13. `reviewed_head` = `f039fa6ebd2532d09144ff8f6173c73c87973c58`, `diff_base` = `46f2a52d…` (= `refs/gsd/49-44/base`).
- O anterior é `49-REVIEW-GAPS-8.md` (commit `675ea863`): critical 0, warning 6, info 9.

### Respostas do operador (VERBATIM, 2026-10-03)

O orquestrador perguntou ao operador, apresentando:
- (a) as escolhas 1–7 do planejador do 49-44;
- (c) os resíduos R1–R3, mais o WR-04 como R4, com as rotas (i)/(ii)/(iii);
- os warnings do -8.

O operador perguntou primeiro: **«O q vc indica?»**

O orquestrador recomendou, conforme repassado a este executor:
- (a) aceitar todas as escolhas do planejador;
- (b) pausar a outra janela;
- (c) publicar com R1–R4 registrados (rota (iii));
- consertar WR-01, 02, 03, 04 e 06 antes do apply.

Propôs como resposta: «(a) aceito; (b) outra janela parada; (c) publicar com R1–R4 registrados; consertar WR-01..06 antes».

O operador respondeu: **«Aceito»**.

- **«Aceito»** respondeu a (a), a (c) e à lista de consertos.
- **(b)** foi perguntada à parte, no momento do apply. O operador respondeu **«Outra janela parada»**.

Nenhuma outra frase deste SUMMARY atribui decisão ao operador. O nome «R4» para a janela do WR-04 do -8 vem da recomendação do orquestrador e do 49-44. Este SUMMARY não o atribui ao operador (IN-03 do -9).

### Disposição dos achados (e de quem)

| Achado | Disposição | Quem |
|---|---|---|
| -8 WR-01, WR-02, WR-03, WR-04, WR-06 | consertados na rodada de conserto (`756a951e`, `10e6ee18`, `e43efa00`, `7e1db519`, `1cc8e5b9`, `c696e7e7`, `ea6a45e9`, `f039fa6e`); o -9 confere cada um como RESOLVIDO | operador («Aceito», acima) |
| -8 WR-05 | consertado em `3a06c102` (só `.planning/`) | orquestrador |
| -9 WR-01 (frontmatter do 49-44-SUMMARY desatualizado) | consertado em `8581e98d` (só `.planning/`; não invalida a revisão, e o `<verify>` da Task 1 segue verde) | orquestrador |
| -8 IN-01..IN-09 | registrados, não consertados (carregados no -9 como IN-05..IN-13). O IN-07 foi tocado só no parágrafo ESTADOS (`756a951e`, ver 49-44-SUMMARY) | orquestrador |
| -9 IN-01, IN-03, IN-05..IN-11, IN-13 | registrados, não consertados | orquestrador |
| -9 IN-02 (pino não amarrado ao `reviewed_head`) | mitigado na execução: no MESMO comando que criou `refs/gsd/49-45/sha`, `git diff --name-only f039fa6e… <sha> -- . ':!.planning'` deu vazio (abaixo) | orquestrador (instrução); executado aqui |
| -9 IN-04 (motor antigo `20260923000002` grava «removido a pedido do titular» também no ramo da purga de retenção; mesma classe de causa falsa do WR-01; latente com `config_purga.modo = 'dry_run'`) | **PENDENTE, precisa de dono antes de a purga ir a `live`**. Registrado também na linha do STATE. `config_purga.modo = 'dry_run'` foi medido de novo nesta execução | orquestrador |
| -9 IN-12 (smoke ao vivo sem «HEAD = S») | registrado, não consertado. Medido: entre o pino (19:48) e o commit do STATE (19:52:15) não houve commit, então o smoke das 19:49–19:50 rodou com HEAD = S; e passou sem (z) | orquestrador; o fato medido é do executor |

**Resíduo conhecido fora de R1–R4 (IN-05 do -9 / IN-01 do -8), registrado e não nomeado:** um flush antigo e bem-sucedido do autosave ainda em voo pode chegar depois do flush do envio e vencer pelo `ON CONFLICT DO UPDATE`. É uma janela de baixa probabilidade antes da linha de score. O cabeçalho da migration, agora imutável no ledger, conta «três caminhos».

## Task 2: apply e provas ao vivo

### Passo 0: sha fixado e enumeração

O comando que criou o pino conferiu também o IN-02:
`pinned refs/gsd/49-45/sha=8581e98d172046df7cea0379b8e8b0b366f1090e; IN-02: diff f039fa6e..8581e98d172046df7cea0379b8e8b0b366f1090e fora de .planning vazio`

Enumeração pelo comando LITERAL do Passo 0 (`refs/gsd/49-44/base..S`):

```
fe9c4e2d391010b2cad231609731b07b1a848550 codigo feat(49-44): RH dono da vaga lê o texto do caso aberto da SJT na Decisão Final (tracer)
981445c2cefea469e79234d73dd832e6a75f0aaf codigo feat(49-44): congela o caso aberto enviado, smoke de 9 cláusulas e runner de 8 mutações
25ee0f94622aca5b1f74284b4855ea3602772ee9 codigo feat(49-44): tela completa da resposta do caso aberto — estados, erro, contrato do serviço
79a58e5bf77cd2fcef51b84de961b8472454d613 planning docs(49-44): SUMMARY — RH lê o texto do caso aberto da SJT (WR-07), ensaiado em PROD sem persistir
e2f1f50069480bb5b00e2ce7cd137193967fff7e planning docs(49-44): STATE e ROADMAP — 49-44 concluído (construído e ensaiado; publicação no 49-45)
675ea863d0e3a8a91407559d041e569c1ccc76cb planning docs(49): re-revisão adversarial rodada 8 do 49-44 e do 49-45 (REVIEW-GAPS-8)
3a06c102d47a749d9c6e5395ccde60138de6c7cb planning docs(49-44): SUMMARY — requirements-completed vazio; JORN-41 só o verificador marca (WR-05 do REVIEW-GAPS-8)
756a951e52e9ce58b31b1b85f6ace51563c41f98 codigo fix(49-44): WR-01 estado neutro `removida` no lugar de `removida_pelo_titular`
10e6ee189c334680c4e8a4745656db84e999a83e codigo fix(49-44): WR-02 sonda de papel nulo com sub válido em (d) e mutação M9
e43efa004668eabc57f7f9e239da09a15de9504f codigo fix(49-44): WR-03 a rota (i) fecha R1, não a parte de R2 na mesma aba
7e1db519590ffbac163caa0ebed4f67b720732ff codigo fix(49-44): WR-04 nomeia R4 — segunda nota sobre outro texto depois do congelamento
1cc8e5b9f8696ddae71ee4ea1eb06301d6fc73da planning docs(49-45): WR-03 e WR-04 — rota (i) não fecha R2 na mesma aba; R4 nomeado
c696e7e775f2469d60f62eb62c420cf6bcaf89a0 planning docs(49-45): WR-06 enumeração e push por comando literal, julgando por arquivos
ea6a45e940d0d6c3bd003e5afa4e786fd36a12e3 planning docs(49-44): PLAN alinhado à rodada de conserto do REVIEW-GAPS-8 (WR-01..WR-04)
f039fa6ebd2532d09144ff8f6173c73c87973c58 planning docs(49-44): SUMMARY — rodada de conserto do REVIEW-GAPS-8
9193198d77d7bc290124518340cb63ac18708ff1 planning docs(49): re-revisão adversarial rodada 9 — conserto do REVIEW-GAPS-8 (REVIEW-GAPS-9)
8581e98d172046df7cea0379b8e8b0b366f1090e planning docs(49-44): SUMMARY — frontmatter alinhado à rodada de conserto (WR-01 do REVIEW-GAPS-9)
enumeracao ok: 17 commit(s) em 46f2a52d..8581e98d
```

Nenhum commit alheio e nenhum merge. Código só dos 9 arquivos do 49-44, com assunto `feat|fix(49-44)`.

### Passo 1: antes do apply (só leitura)

- **Crawler:**
  - `AUSENTE em chunk lazy de PROD: decisao-sjt-resposta-caso-aberto (visitados=51; achados=[])`.
  - Controle: `PRESENTE em PROD, chunk lazy: decisao-sjt-sinal-revisao ["/assets/DecisaoFinalPage-BfpjJuaG.js"]`. O crawler alcança o chunk lazy.
- **Catálogo** (`set transaction read only`):
  - ledger `20261003000001` = 0; RPC e helper inexistentes;
  - policies `cand_escreve_respostas_aval:PERMISSIVE:ALL:{public}, cand_le_respostas_aval:PERMISSIVE:SELECT:{public}`, iguais às medidas no 49-44;
  - FORCE RLS `false`; `config_purga.modo = dry_run`.
- **md5 do arquivo:** `7750c40767d99f7c8dc597ece70172be`, 29851 octetos.
- **Smoke do motor ANTES:** `exit=0`, 0 linhas `P45M FAIL`.

### População (só contagens), ANTES e DEPOIS

| Medida | Antes | Depois |
|---|---|---|
| `scores_candidato` `sjt`/`caso_aberto` | 1 | 1 |
| com `instrucao_ao_modelo` em `metadata->'motivos_revisao'` (sinal) | **0** | **0** |
| candidaturas com mais de uma linha `sjt`/`caso_aberto` | 0 | 0 |
| autosaves `sjt_caso_aberto` | 1 | 1 |
| com `texto` string | 1 | 1 |
| com `redigido` | 0 | 0 |
| sem `texto` | 0 | 0 |

`populacao igual antes e depois`. A migration não escreve dado, e o smoke não deixou resíduo.

**Hoje nenhum RH vê o botão em PROD; a prova ao vivo é o smoke.** O planejador recomenda juntar a conferência visual do botão ao item 2 do `49-UAT.md`. O `49-UAT.md` não foi editado.

### Passo 2: o apply (`HEAD = S` e arquivo limpo contra S no MESMO comando)

```
inicio=2026-10-03T19:49:16
── 20261003000001_p49_44_resposta_caso_aberto_rh.sql
   version : 20261003000001
   name    : p49_44_resposta_caso_aberto_rh
   octetos : 29851
   md5     : 7750c40767d99f7c8dc597ece70172be
   ✅ aplicada e escriturada — md5 do ledger BATE (29851 octetos)
exit=0
fim=2026-10-03T19:49:17Z
```

Não houve `55P03` nem `57014`. O apply segurou o lock de `respostas_avaliacao` por cerca de 1 s.

### Passo 3: os quatro `<verify>`, na ordem

1. `migration no ar: ledger = arquivo, ACL, politicas e FORCE RLS conferidos`
2. `smoke ao vivo: 9/9` (`{"smoke":"p49_44_resposta_caso_aberto","pass":9,"esperado":9,"n_cand":40,"n_sc":19,"n_ra":12,"n_netq":0}`)
3. `anon recusado pelo ACL em PROD` (`permission denied for function ler_resposta_caso_aberto_sjt`)
4. Smoke do motor DEPOIS, pelo comando literal: `exit=0`. Comparação: **`motor: verde antes e depois`**

O remoto ficou inalterado durante a Task 2: `67669214…` no início e no fim. Nenhum push.

## Task 3: publicação do front e registro

### Passo 1: enumeração + push (comando LITERAL), 19:50:07–19:50:13Z

```
46f2a52d434f814a66667dc4c547a18acc0778c5 planning docs(49): planos de lacuna 49-44/49-45 — WR-07, RH lê o texto do caso aberto da SJT na Decisão Final
fe9c4e2d… codigo feat(49-44): … (tracer)
981445c2… codigo feat(49-44): congela o caso aberto enviado, …
25ee0f94… codigo feat(49-44): tela completa da resposta do caso aberto — …
79a58e5b… planning · e2f1f500… planning · 675ea863… planning · 3a06c102… planning
756a951e… codigo fix(49-44): WR-01 · 10e6ee18… codigo fix(49-44): WR-02 · e43efa00… codigo fix(49-44): WR-03 · 7e1db519… codigo fix(49-44): WR-04
1cc8e5b9… planning · c696e7e7… planning · ea6a45e9… planning · f039fa6e… planning · 9193198d… planning · 8581e98d… planning
enumeracao ok: 18 commit(s) em 67669214..8581e98d
To github.com:fercosnt/SistemaRecrutamento.git
   67669214..8581e98d  8581e98d172046df7cea0379b8e8b0b366f1090e -> main
exit=0
```

As linhas com `…` estão abreviadas aqui. A saída inteira, com os 18 sha completos, é a mesma do Passo 0 mais `46f2a52d`.

Pós-push, em comando separado:
- `git ls-remote origin refs/heads/main` = `8581e98d…` = `refs/gsd/49-45/sha`;
- `git log --oneline origin/main..HEAD` vazio.

### Passo 2: o marcador servido

- Tentativa 1, 19:50:26Z: `AUSENTE … (visitados=51; achados=[])`. Inconclusiva, porque o deploy ainda estava em curso.
- Tentativa 2, 19:51:17Z: **`PRESENTE em PROD, chunk lazy: decisao-sjt-resposta-caso-aberto ["/assets/DecisaoFinalPage-Zw-MAwxN.js"]`**.
- O `<verify>` 3 literal, rodado em seguida, deu a mesma linha.

O nome do chunk é o mesmo que o 49-44 mediu no build local depois da rodada de conserto (`build/assets/DecisaoFinalPage-Zw-MAwxN.js`). O marcador não está no `index-*`.

Vercel, lido só por leitura no status GitHub do sha `8581e98d`: `success` às 19:50:39Z.

### Passo 3: o STATE

- Antes do Edit: `STATE limpo contra HEAD`.
- O Edit inseriu UMA linha logo depois da pendência do WR-07, que ficou byte-igual: `git diff --numstat` = `1 0`.
- A linha nova é «WR-07 — ENTREGUE (2026-10-03, 49-44/49-45)». Ela contém:
  - a migration, o md5 do ledger e o horário do apply;
  - o sha e o chunk;
  - R1–R3 e R4, com as rotas;
  - a disposição do operador («Aceito», em resposta à recomendação do orquestrador de publicar com R1–R4 registrados);
  - o dono da retirada do cast estreito;
  - a população com sinal (0);
  - a recomendação do planejador de conferência visual;
  - o IN-04 do -9 como pendência sem dono.
- `<verify>` 2: `STATE: pendencia WR-07 intacta, entrega logo abaixo; JORN-41 segue [ ]`.

### Passo 4: commit e push do registro, 19:52:15–19:52:20Z

```
05fb6fd8094a8fa133c78641303bef67a6012815 docs(49-45): WR-07 entregue — migration 20261003000001 no ar, front 8581e98d servido
To github.com:fercosnt/SistemaRecrutamento.git
   8581e98d..05fb6fd8  05fb6fd8094a8fa133c78641303bef67a6012815 -> main
```

O hook Husky rodou (`tsc errors: 89 (frozen baseline: 96)`), sem `--no-verify`.

- `<verify>` 1: `remoto = HEAD, sha fixado publicado`.
- `grep -cE '^- \[x\] \*\*JORN-41\*\*' .planning/REQUIREMENTS.md` = 0.
- `git diff refs/gsd/49-45/sha -- .planning/REQUIREMENTS.md …/49-UAT.md` está vazio.

## Task Commits

1. **Task 1:** sem commit. O checkpoint foi atravessado e o `<verify>` conferido.
2. **Task 2:** sem commit no repositório. A escrita foi em PROD (migration `20261003000001`), e o único ref criado foi `refs/gsd/49-45/sha`.
3. **Task 3:** `05fb6fd8` (docs(49-45): STATE), publicado pelo sha.

Commit de metadados: este SUMMARY, com STATE e ROADMAP do fluxo GSD. Também é publicado, ver «Deviations».

## Decisions Made

Nenhuma decisão nova do executor. As escolhas de forma de acesso e de congelamento são do planejador do 49-44. As respostas do operador são só as transcritas acima.

## Deviations from Plan

Nenhuma pelas Regras 1–4. Ajustes de execução:

1. **Conferência do IN-02 no comando do pino** (instrução do orquestrador): `git update-ref refs/gsd/49-45/sha HEAD ""` rodou condicionado a `git diff --name-only f039fa6e… <HEAD> -- . ':!.planning'` vazio. O plano só trazia o `update-ref`.
2. **Metadados GSD publicados** (instrução do orquestrador): o plano diz que o SUMMARY e o STATE do fluxo GSD «ficam locais». O orquestrador exige `origin/main..HEAD` vazio no fim. Por isso o commit de metadados é empurrado pelo sha, depois da mesma enumeração por arquivos (só `.planning/`).
3. **Separador `=====` no zsh:** a primeira chamada do `<verify>` 4 juntou o smoke do motor DEPOIS a um `echo =====`, que o zsh tenta expandir (`==== not found`). O log do smoke já tinha sido gravado (`exit=0`). O comparador foi rodado de novo sozinho, sem rodar o smoke outra vez, e deu `motor: verde antes e depois`.
4. **Ledger de commits do plano** (`gsd-plan-head-before-49-45`): criado depois do primeiro commit, com o valor de antes dele (`8581e98d` = o pino). O valor é o mesmo que teria sido gravado antes.

## Issues Encountered

Nenhum bloqueante. A primeira tentativa do crawler depois do push deu AUSENTE, e a segunda deu PRESENTE (PATTERNS §N).

## Known Stubs

Nenhum.

## Known Residuals (registrados, não consertados)

- **R1–R3** (antes da linha de score) **e R4** (depois): o texto que o RH lê pode não ser o analisado. Nenhum artefato desta publicação afirma fidelidade.
  - A rota (i) fecharia só R1 e a edição na mesma aba com o envio pendente.
  - Nenhuma das rotas (i)–(iii) fecha R4.
  - Foram publicados registrados, em resposta ao «Aceito».
- **Janela do flush antigo em voo** (IN-05 do -9): conhecida, fora de R1–R4, sem nome.
- **IN-04 do -9:** pendência sem dono antes de a purga ir a `live`.
- `database.types.ts` sem a RPC: o cast estreito de `getRespostaCasoAbertoSjt` sai no primeiro plano que rodar `npm run db:types < /dev/null`.

## Threat Flags

Nenhuma superfície fora do `<threat_model>` do plano.

## Next Phase Readiness

O WR-07 está no ar. O JORN-41 espera a re-verificação (`49-VERIFICATION`), e a conferência visual depende de existir uma candidatura com o sinal.

## Self-Check: PASSED

- FOUND: `49-45-SUMMARY.md`, `.planning/STATE.md`; FOUND: commits `05fb6fd8`, `8581e98d`; `refs/gsd/49-45/sha` = `8581e98d…`.
- PROD (só leitura, depois de tudo): ledger `20261003000001` = 1, RPC presente.
