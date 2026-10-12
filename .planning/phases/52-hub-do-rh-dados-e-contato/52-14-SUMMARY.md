---
phase: 52-hub-do-rh-dados-e-contato
plan: 14
subsystem: portao
tags: [portao, review-adversarial, prod-safety, bloco-b, decisao-operador, jorn-54]
status: complete

requires:
  - phase: 52-02..52-13, 52-16, 52-23, 52-24, 52-25
    provides: "blocos A e B escritos, ensaiados e NAO aplicados; arnes p52_* (ensaio, mutacoes, portao, tipografia, vitest_delta); 52-15-PLAN (o programa que escreve em PROD)"
provides:
  - "52-REVIEW-PORTAO-2.md (commit efe55372, reviewed_head 040c6b4d, critical: 0): a chave do apply/deploy/push do 52-15"
  - "PORTAO OK no modo revisao, medido no fecho (HEAD 355f1249; nada fora de .planning mudou desde 040c6b4d)"
  - "Decisao escrita e datada do operador (2026-10-11): (a) «aplicar», (b) «Confirmo» — 52-15 liberado"
  - "Registros da fase (UI-SPEC, VALIDATION, CONTEXT, 02-SUMMARY, RESEARCH, PATTERNS) emendados: Big Five e Caso pratico confirmam a saida; so a Redacao sai direto (WR-03 do -2)"
  - "Carry-forwards obrigatorios para o bloco C (antes do 52-17/52-18): WR-01 e WR-02 do -2, IN-09 do -2"
affects: [52-15, 52-16, 52-17, 52-18, 52-SECURITY, 52-UAT]

actuals:
  tokens: 39000
  tasks: 2
  commits: 10
plan_head_before: 77d2ae2b42cc9c1a6bbe6eb97a3423ca4016293d
plan_head_after: 355f1249762b11455eb2513109232b6a7fe56e03
errata_plan_head_after: "2026-10-12 (UAT da 52): o valor gravado era 355f124924b2d7dc0d2ad1ab3d2cfa1a7dbf4d5b — prefixo certo, cauda inventada, objeto inexistente no repo; corrigido para o sha real de 355f1249 (git rev-parse). Com ele, git rev-list --count 77d2ae2b..355f1249 = 10, igual ao «commits: 10 medido» do corpo."

tech-stack:
  added: []
  patterns:
    - "Portao com review em arquivo NOVO por rodada (-1 recusado com 1 critico; rodada de conserto nos planos donos; -2 sem critico) — memoria «re-revisar o conserto antes do apply»"
    - "Decisao que muda premissa de decisao anterior vira EMENDA datada nos registros, nunca reescrita do texto original"

key-files:
  created:
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-PORTAO-1.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-PORTAO-2.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-14-DECISAO-RODADA-1.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-14-SUMMARY.md
  modified:
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-VALIDATION.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-CONTEXT.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-02-SUMMARY.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-RESEARCH.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-PATTERNS.md

key-decisions:
  - "Operador (2026-10-11, P1 da rodada 1): CR-01 consertado como «Confirm like memory screens (Recommended)» — Big Five e Caso pratico passam ao ramo memoria → confirma; emenda da D-36: «com rascunho» = so a Redacao"
  - "Operador (2026-10-11, P2 da rodada 1): WR-01, WR-02 e WR-03 do -1 entram na mesma rodada, antes do -2; WR-03 so escrito e ensaiado, apply destrutivo volta como checkpoint"
  - "Operador (2026-10-11, portao): (a) «aplicar»; (b) «Confirmo» (nenhuma outra janela publica ate o fim do 52-15)"
  - "Operador (2026-10-11, warnings do -2): «WR-03 now: fix the records, WR-01 before block C, WR-02 before block C»"
  - "JORN-53..62 NAO marcados completos em REQUIREMENTS.md: nada foi aplicado; o 52-15 aplica, publica e prova"

requirements-completed: []

coverage:
  - id: D1
    description: "Tracer: ensaio do bloco B sobre o estado vivo de PROD (VERDE, vistas=igual, 52l=20/20), mutacoes 8/8, deno 40/0, delta do vitest alteradas=0 novas=0 mordida=ok, lint 89, marcadores nos chunks certos, tipografia OK"
    requirement: JORN-54
    verification:
      - kind: other
        ref: "scratchpad p52_14_evidencia/ (ensaio, mutacoes, deno, vitest_delta, build) — linhas de veredito transcritas abaixo"
        status: pass
    human_judgment: false
  - id: D2
    description: "Review adversarial bloqueante sem critico, cobrindo o diff inteiro desde refs/gsd/52/base e o 52-15-PLAN, com nada fora de .planning mudado depois do reviewed_head"
    requirement: JORN-54
    verification:
      - kind: other
        ref: "node scripts/p52_portao.cjs --revisao …/52-REVIEW-PORTAO --base refs/gsd/52/base --plano …/52-15-PLAN.md --modo revisao → PORTAO OK (rc=0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Decisao escrita do operador (a) aplicar e (b) janela unica, verbatim e datada"
    requirement: JORN-54
    verification:
      - kind: other
        ref: ".planning/phases/52-hub-do-rh-dados-e-contato/52-14-DECISAO-RODADA-1.md (commits 1eb87612, 5d834bee)"
        status: pass
    human_judgment: true

duration: ~11h de relogio (06:10Z → 17:10Z), quase tudo espera pelo revisor e pelo operador
completed: 2026-10-11
---

# Phase 52 Plan 14: Portão do bloco B — prova sobre o estado vivo, review adversarial e decisão do operador Summary

**O bloco B foi provado sobre o estado vivo de PROD sem nenhuma escrita (ensaio VERDE com `vistas=igual`,
8/8 mutações mordendo, delta do Vitest limpo). O review nº 1 recusou o portão com 1 crítico: Big Five e Caso
prático saíam sem aviso e perdiam as respostas. A rodada de conserto, feita nos planos donos, fechou o crítico e
os 3 warnings. O review nº 2 saiu com `critical: 0` e o `p52_portao` respondeu `PORTAO OK`. O operador decidiu
por escrito «aplicar» e «Confirmo». Nada foi aplicado, publicado ou empurrado neste plano: o 52-15 está liberado,
e o bloco C carrega três pendências obrigatórias.**

## Performance

- **Início:** 2026-10-11T06:10:57Z (Task 1)
- **Fim:** 2026-10-11T17:10Z
- **Tasks:** 2 de 2 (Task 1 tracer; Task 2 checkpoint de decisão, com uma rodada de conserto)
- **Duração:** ~11 h de relógio. O tempo de execução própria é pequeno; o resto foi espera pelo revisor
  (outro contexto) e pelo operador.

## Task 1 (tracer): a prova antes do portão, no HEAD 77d2ae2b

Medido pelo executor anterior; os logs estão em `scratchpad/p52_14_evidencia/`. Abaixo vão só contagens, md5 e
vereditos, nenhum dado de candidato. Não houve commit de código (é o que o plano manda).

| Prova | Resultado |
|---|---|
| Ledger de PROD sem `20261011…` | O ensaio leu o ledger e devolveu `aplicadas=[]` para as quatro versões `20261011000001..4`. O revisor do -1 mediu, só leitura, cabeça `20261010000002` e nenhuma `20261011…`. O review -2 e a rodada repetiram o ensaio com `aplicadas=[]`. ⚠ A saída literal do `p46apply.cjs sql "…like '20261011%'"` do tracer não ficou em arquivo no scratchpad; a evidência é a leitura do ensaio, a do revisor e as repetições. |
| Ensaio | `ENSAIO VERDE: supabase/tests/p52_leituras_rh_smoke.sql · prefixadas=[20261011000001,20261011000002] · aplicadas=[] · ausentes=[20261011000003,20261011000004] · vistas=igual · smokes=[52l=20/20] · evidencia=leituras:devolutiva=ok,sjt=ok,triagem=ok nomes:recrutador_por_papel=true,admin_por_papel=true 52l.pop=dev:3,sjt:6,tri:1 · 958 ms` |
| Mutações | `MUTACOES: 8/8 mordem; controle verde; nada persistiu`. L1..L8: L1 (c), L2 (g), L3 (n), L4 (o), L5 (q), L6 (f), L7 (r), L8 (t). Baseline igual depois: `ledger=[] funcoes=1 mutacoes_p52=0 fixtures_p52={"users":0,"candidatos":0}` |
| Deno (EF `ler-cadastro-candidato-rh`) | `ok \| 40 passed \| 0 failed` |
| Delta do Vitest | `vitest delta: base=0d70ac7 2725/2 · head=77d2ae2 3087/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok` |
| Pré-existentes impressos pelo delta | (1) `src/__tests__/promessasComExecutor.test.ts > Deferimento com prazo: a fase dona é conferida contra o roadmap, nos dois sentidos fase inexistente e fase já concluída REPROVAM — medido contra roadmaps sintéticos`; (2) `src/__tests__/promessasComExecutor.test.ts > Metade 1 — o registro curado: toda promessa nomeada tem executor provado no disco deferida · o comentário de catálogo do ledger de notificações declara retenção INDE…` |
| Lint | 89 `error TS` (teto 90; baseline congelada 96) |
| Build | `assert-chunks PASSED`; `sair-da-prova` no chunk `index-*`; `hub-abas` num chunk lazy |
| Tipografia | `TIPOGRAFIA OK` sobre todo o `src/` acrescentado desde `refs/gsd/52/base` |

**Remedido no fecho (HEAD 355f1249).** Medi de novo porque o código mudou na rodada de conserto. Entre `040c6b4d`
(o `reviewed_head`) e o HEAD, o código fora de `.planning/` é idêntico: `git diff --stat 040c6b4d HEAD -- . ':!.planning'`
sai vazio.
- `npm run build` rc=0.
- `sair-da-prova` está em `build/assets/index-CfSo-z5g.js` (eager).
- `hub-abas` está em `build/assets/PerfilCandidatoRHPage-CqFjwW7k.js` (lazy).
- `TIPOGRAFIA OK (4319 linhas acrescentadas varridas)`.

## Task 2: review adversarial e decisão do operador

### Rodada 1: `52-REVIEW-PORTAO-1.md` (commit 26a74d93; diff_base 0d70ac7d; reviewed_head 77d2ae2b)

`critical: 1 · warning: 3 · info: 11`. Portão RECUSADO. No núcleo que escreve em PROD (EF, RPCs, 0002, 52-15) o
revisor não achou crítico. O crítico estava na saída das provas do candidato (bloco A, 52-02).

### Rodada de conserto (nos planos donos; RED antes de cada conserto de código)

| Commit | Plano dono | Achado | O que mudou |
|---|---|---|---|
| `aacef0a6` | 52-02 | CR-01 | Big Five (`temRespostaNaoSalva={answeredCount > 0}`) e Caso prático (`{texto.trim() !== ''}`) confirmam a saída; testes em `navegacao-provas.test.tsx` |
| `0b4d486b` | 52-02 | WR-01 | Redação: `editouRef` + `flushSeEditou`. Sair (ou dar blur) antes da releitura não grava `{}` por cima do rascunho. Teste novo `RedacaoEditorScreen.saida-rascunho.test.tsx` com o hook real |
| `794aaf26` | 52-01 | WR-02 | `capturar()` do ensaio cobre `usuarios_rh` inteira (`to_jsonb`). Mordida provada: `PERSISTIU (1041 ms): usuarios_rh: "9:3891…c3" -> "9:7db9…2a"`; sem a chave, `diferencas=[]` |
| `1f688f52` | 52-16 | WR-03 | O gerador do banco SJT v2 remapeia os `opcao_id` artesanais junto com as respostas gravadas. Ensaio: `remap=32/8,refs=3,linhas=1,em_curso=1`, `52b=12/12`. **Escrito e ensaiado, NÃO aplicado** |
| `040c6b4d` | 52-16 | WR-03 | `capturar()` cobre `perguntas_opcao_sjt` inteira (`to_jsonb`) |

Provas da rodada, nos logs `r1-*` do scratchpad:
- ensaio do bloco B VERDE, `vistas=igual`, 52l=20/20;
- mutações 8/8;
- delta `head=794aaf2 3094/2 · pre-existentes=2 · alteradas=0 · novas=0 · mordida=ok`;
- vitest no escopo 52 arquivos / 435 testes verdes;
- lint 89.

### Rodada 2: `52-REVIEW-PORTAO-2.md` (commit efe55372; diff_base 0d70ac7d; reviewed_head 040c6b4d)

`critical: 0 · warning: 3 · info: 9`. O revisor confirmou que o CR-01 e os WR-01/WR-02 do -1 estão fechados, e que o
WR-03 do -1 está escrito e ensaiado, com o apply pendente (bloco C). A rodada não tocou migration, EF,
`p52_portao`, `p50_enumera`, `p46apply` nem `efdeploy`.

### `<verify>` da Task 2: saída literal, re-executada no fecho

```
$ node scripts/p52_portao.cjs --revisao .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-PORTAO --base refs/gsd/52/base --plano .planning/phases/52-hub-do-rh-dados-e-contato/52-15-PLAN.md --modo revisao
PORTAO OK: revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-PORTAO-2.md reviewed_head=040c6b4d6d2e1c6b839c59a14394d1bdf0b138c4 pin=- modo=revisao
rc=0
```

Rodou com HEAD 5d834bee, antes do commit das emendas. Rodou de novo com HEAD 355f1249, depois do commit, e deu a
mesma linha com rc=0.

## Respostas do operador: VERBATIM, 2026-10-11

Registro de origem: `52-14-DECISAO-RODADA-1.md` (commits `1eb87612` e `5d834bee`). As respostas vieram pelo
`/gsd-execute-phase 52` (AskUserQuestion).

**Rodada 1, sobre o `52-REVIEW-PORTAO-1` (2026-10-11):**
- **Pergunta 1** (como consertar o CR-01; opções: confirmar como as telas de memória / reler o rascunho / tirar o
  botão): **«Confirm like memory screens (Recommended)»**
- **Pergunta 2** (quais warnings entram na mesma rodada, antes do -2): **«WR-01 Redação {} overwrite, WR-02 rehearsal snapshot, WR-03 answer key in option ids»**

**Portão, sobre o `52-REVIEW-PORTAO-2` (2026-10-11):**
- **(a)** aplicar ou vetar o bloco B pelo 52-15: **«aplicar»**
- **(b)** nenhuma outra janela publica (push, apply ou deploy) neste repositório até o fim do 52-15: **«Confirmo»**
- **Disposição dos warnings do -2:** **«WR-03 now: fix the records, WR-01 before block C, WR-02 before block C»**

## Disposição de cada achado

Legenda de «quem decidiu»:
- **operador**: resposta verbatim acima.
- **orquestrador**: «registrado, sem ação nesta fase», por instrução do despacho. Quando o review nomeia um dono,
  ele aparece ao lado.

### `52-REVIEW-PORTAO-1`

| Achado | Disposição | Quem decidiu | Onde ficou |
|---|---|---|---|
| CR-01: Big Five e Caso prático saíam direto e perdiam as respostas | Consertado: confirmam como as telas de memória | operador (P1) | `aacef0a6` (52-02); fechado pelo -2 |
| WR-01: a Redação gravava `{}` por cima do rascunho | Consertado na rodada | operador (P2) | `0b4d486b` (52-02); fechado pelo -2 |
| WR-02: o `capturar()` não via `usuarios_rh` | Consertado na rodada | operador (P2) | `794aaf26` (52-01); fechado pelo -2 |
| WR-03: o `opcao_id` artesanal entrega o gabarito (9 itens ativos, 7 cargos) | Escrito e ensaiado na rodada. O apply é escrita destrutiva sobre resposta gravada e volta como checkpoint do operador | operador (P2) | `1f688f52` + `040c6b4d` (52-16); apply no 52-18 (ver carry-forwards) |
| IN-01: admin desativado com JWT válido passa nas 3 RPCs (janela ≤ 1 TTL) | registrado, sem ação nesta fase | orquestrador | dono nomeado: 52-08 |
| IN-02: F4, o log registra o acesso pelo hub e não todo acesso | Residual declarado (ver «Residuais») | orquestrador | dono nomeado: este SUMMARY → `52-SECURITY.md` |
| IN-03: F13, o servidor aceita notas parciais; notas atravessam a troca de análise | Residual declarado | orquestrador | dono nomeado: 52-07 (cliente) / backlog (servidor) |
| IN-04: O5/F15, `percentil` na rede de `getScores`; o guarda varre lista literal | Residual declarado | orquestrador | dono nomeado: 52-11 |
| IN-05: vaga sem o instrumento + leitura falha → erro em vez de «Não se aplica» | registrado, sem ação nesta fase | orquestrador | dono nomeado: 52-25 |
| IN-06: o POS da 0002 nunca foi provado por mutação | registrado, sem ação nesta fase (segue aberto como IN-05 do -2) | orquestrador | dono nomeado: 52-08 |
| IN-07: o modo `apply` exige HEAD = pin; um commit entre os dois `migrate` faz a 0002 recusar | registrado, sem ação nesta fase. **Atenção do 52-15:** nenhum commit entre o `migrate` da 0001 e o da 0002 | orquestrador | dono nomeado: 52-15 |
| IN-08: o «Desfazer» do cliente no 52-15 não remove os arquivos acrescentados | registrado, sem ação nesta fase. Só se aplica num desfazer, que já exige checkpoint | orquestrador | dono nomeado: 52-15 |
| IN-09: comentários prometem que o 52-15 remove casts que ele mantém | registrado, sem ação nesta fase | orquestrador | dono nomeado: 52-11 / 52-13 |
| IN-10: miúdos da EF/hook (`candidatos.deleted_at`, `retry: 2` em 4xx, cache no logout) | registrado, sem ação nesta fase | orquestrador | dono nomeado: 52-09 |
| IN-11: F18, fora deste diff | Residual declarado; tratado no portão do bloco D | orquestrador | dono nomeado: bloco D |

### `52-REVIEW-PORTAO-2`

| Achado | Disposição | Quem decidiu | Onde ficou |
|---|---|---|---|
| WR-01: o 52-18 descreve o remapeamento como «aditivo e reversível», sem prova pós-apply e sem desfazer | **Antes do bloco C** (carry-forward 1) | operador («WR-01 before block C») | dono: 52-18 (emenda de plano) |
| WR-02: remapear com uma prova SJT aberta dá nota parcial silenciosa (`pontuar_sjt`) | **Antes do bloco C** (carry-forward 2) | operador («WR-02 before block C») | dono: 52-16 (gerador) / 52-17 (migration) / 52-18 (apply) |
| WR-03: a emenda da D-36 não tinha chegado aos registros | **Feito agora** (commit `355f1249`) | operador («WR-03 now: fix the records») | ver «Emendas dos registros» abaixo |
| IN-01: Redação, digitar antes da releitura diverge buffer e caixa; timer órfão | registrado, sem ação nesta fase | orquestrador | dono nomeado: 52-02 |
| IN-02: uma linha de rascunho por `teste` | registrado, sem ação nesta fase | orquestrador | dono nomeado: backlog |
| IN-03: o diálogo diz «não serão salvas», mas o flush de desmontagem grava; no Caso o RH lê a tabela | registrado, sem ação nesta fase | orquestrador | dono nomeado: 52-02 |
| IN-04: `candidaturas` fora do `capturar()` | registrado, sem ação nesta fase (as escritas do smoke ficam em savepoint que reverte) | orquestrador | dono nomeado: 52-01 |
| IN-05: IN-06 do -1 (POS da 0002 sem mutação) segue aberto | registrado, sem ação nesta fase. O review oferece «52-08, ou disposição no 52-14-SUMMARY»; esta é a disposição. O POS roda no apply do 52-15 de qualquer forma | orquestrador | dono nomeado: 52-08 |
| IN-06: a varredura do PRE isenta a tabela do ledger inteira e não olha `pg_catalog` | registrado, sem ação nesta fase (sólido hoje, medido) | orquestrador | dono nomeado: 52-16 |
| IN-07: as chaves novas do `capturar()` podem dar `PERSISTIU` falso com edição humana concorrente | registrado, sem ação nesta fase (falha fechada) | orquestrador | dono nomeado: 52-01 |
| IN-08: o 52-16-SUMMARY tem números velhos (14 testes, 52b 9/9, md5) | registrado, sem ação nesta fase. O 52-18 cita esse SUMMARY: ler com os números do -2 (20 testes, 52b 12/12) | orquestrador | dono nomeado: 52-16 |
| IN-09: o review do bloco C começa no pin do 52-15 e não verá o gerador do remap | **Carry-forward 3** (antes do 52-17) | orquestrador (por instrução do despacho) | dono nomeado pelo review: 52-18 |

## Emendas dos registros (WR-03 do -2): commit `355f1249`

Só `.planning/`. Nenhum texto histórico foi apagado. Onde havia decisão, a emenda é uma nota datada que cita o
`52-14-DECISAO-RODADA-1.md` P1 e o CR-01 do -1.

- **`52-UI-SPEC.md`**:
  - Big Five e Caso aberto passam para a linha «Confirmação de perda» (no Caso: texto não vazio). A Prova cognitiva
    também vai para essa linha, como a D-36 já mandava; a linha antiga a deixava em «Saída direta».
  - «Saída direta» fica só com a Redação (`flushSeEditou`).
  - Backstop E8: (iv) e (v) reescritos, com o texto antigo citado na nota. E8 error passa a dizer «Na Redação».
  - Nota datada depois da tabela.
- **`52-VALIDATION.md`**: linha JORN-60, com o texto antigo citado. O comando ganhou
  `RedacaoEditorScreen.saida-rascunho.test.tsx`. Rodado agora: 3 arquivos, 29 testes verdes.
- **`52-CONTEXT.md`**: emenda datada sob a D-24 e emenda datada sob a D-36. O texto original das duas fica intacto.
- **`52-02-SUMMARY.md`**:
  - seção «Emenda (2026-10-11)» logo abaixo da abertura;
  - em `provides` e `patterns-established`, uma linha nova marcada SUPERSEDE, ao lado da antiga;
  - no D3, uma chave `amendment:` que nomeia os `describe` vigentes. A `ref` antiga fica.
  - O YAML foi validado com `js-yaml`.
- **`52-RESEARCH.md` / `52-PATTERNS.md`**: marcadores datados no achado F1, no Pitfall 1, na tabela JORN-60 e nas
  duas linhas do pattern map. São os pontos que um re-executor copiaria.

**Varredura final.** Comando: `grep -rnE "sai(r|em)? direto|saída direta|saem sem diálogo|sem diálogo|com rascunho|têm rascunho|rascunho automático"` sobre `.planning/phases/52-*`, mais uma segunda varredura `(Big Five|Caso …)…(flushNow|direto|sem diálogo|antesDeSair)`. Nenhuma linha diz que Big Five ou Caso aberto/prático
saem direto sem confirmação, a não ser registro histórico ao lado da sua emenda:
- `52-CONTEXT.md:116`: D-24 original; emenda logo abaixo, em :125-132.
- `52-CONTEXT.md:298`: D-36 original; emenda logo abaixo, em :299-303.
- `52-02-SUMMARY.md`: :13, :53 e o D3 (:79, :83) têm a emenda adjacente. Abertura, Accomplishments, Task Commits,
  RED, Files e Known Risks (:115, :129, :137-149, :172-178, :194, :226) ficam como registro do que o 52-02
  entregou, cobertos pela seção «Emenda» no topo.
- `52-RESEARCH.md:94`: cópia **byte a byte** da CONTEXT (o bloco declara isso; emendar quebraria a declaração).
  A emenda está na CONTEXT de origem. :358 tem a emenda em :360-361; :789 tem a emenda no próprio Pitfall 1.
- `52-PATTERNS.md:636`: a emenda vem logo abaixo.
- `52-02-PLAN.md` (:30, :135, :146, :160): plano executado em 2026-10-11, registro histórico. A emenda vive no
  52-02-SUMMARY e na CONTEXT.
- `52-REVIEW-PORTAO-*` e `52-14-DECISAO-RODADA-1.md`: citam a regra antiga para descrever o defeito.

## Residuais declarados para o `52-SECURITY.md` (não consertados)

- **F4** (IN-02 do -1): a policy viva «RH pode ler todos os candidatos» já abre `candidatos` ao RH ativo por
  PostgREST, sem log. A lista do RH já embute `email` e `celular` (`candidaturasService.ts:54`,
  `CANDIDATO_ALLOWLIST = 'id, nome_completo, email, celular'`). A linha de log da EF registra o acesso **pelo hub**,
  não todo acesso possível. Não fechar policies nesta fase (raio de impacto nas listas).
- **F13** (IN-03 do -1): «todas as competências notadas» é regra só do cliente. O `prosrc` vivo de
  `salvar_avaliacao_entrevista` aceita qualquer objeto com ≥ 1 nota 1–5 e ignora em silêncio as outras. No cliente,
  as notas atravessam a troca de análise vigente (estado chaveado pelo nome da competência).
- **F15 / O5** (IN-04 do -1): `getScores` (`scoresRhService.ts:80,133-134`) leva o `metadata` inteiro, com
  `dimensoes[].percentil`, ao navegador do RH. O guarda `p52-ban-percentil-bigfive-hub` varre uma lista literal de
  3 arquivos que não inclui `ScorecardAvaliacao.tsx` nem `scoresRhService.ts`. É o padrão «iteração sobre lista
  literal» do CLAUDE.md.
- **F18** (IN-11 do -1): o toggle «Ativar» não passa por `publish_vaga`. Fora do diff do bloco B; vai ao portão do
  bloco D.

## Carry-forwards para o bloco C: OBRIGATÓRIOS antes de o 52-17 e o 52-18 rodarem

1. **WR-01 do -2 (dono: 52-18; operador: «WR-01 before block C»).** Emendar o `52-18-PLAN.md` antes do bloco C.
   É emenda de plano, sem código:
   - **Premissa (`:103`, o texto da decisão):** a 0003 é **DESTRUTIVA sobre respostas gravadas**, não «aditiva e
     reversível». O remapeamento reescreve `scores_candidato.metadata.respostas[].opcao_id` e alcança itens de 6
     cargos fora do texto aprovado no 52-17 (dentista, asb-tsb, assistente-financeiro, consultor-vendas,
     recepcionista, vaga-generica).
   - O texto do checkpoint diz «aditivo nos itens do texto; DESTRUTIVO no remapeamento: reescreve `opcao_id` de N
     alternativas em M itens e R respostas gravadas em L linhas de `scores_candidato`; `em_curso=E`». Os números
     vêm do ensaio; hoje são `remap=32/8,refs=3,linhas=1,em_curso=1`.
   - **Registrar o mapa id velho→novo.** Hoje ele nasce de `gen_random_uuid()` dentro da transação e não é gravado.
     Sem o mapa, o «Desfazer» (`:74`) não desfaz o remapeamento. O «Desfazer» passa a nomear a reconstrução pela
     semeadora (`pergunta_id`, `ordem`) e uma nova passada pelas respostas.
   - O Passo 1 da Task 3 registra a linha `remap=…` do apply.
   - **Prova pós-apply nova (só leitura), no `<verify>`:** zero `opcao_id` fora da forma uuid v4 em item SJT ativo:
     `select count(*) from perguntas_opcao_sjt o join perguntas p on p.id = o.pergunta_id where p.tipo = 'sjt' and p.status = 'active' and o.opcao_id::text !~ '<RE_V4>'` = 0.
   - Corrigir `:24`: «retirado → erro» é diferente de «remapeado → nota parcial silenciosa».
2. **WR-02 do -2 (dono: 52-16 gerador / 52-17 migration / 52-18 apply; operador: «WR-02 before block C»).**
   `pontuar_sjt` precisa **recusar alto** um `opcao_id` sem correspondência, em vez de pontuar 0 em silêncio. Por
   exemplo, `IF (SELECT count(*) FROM scored) <> v_answered THEN RAISE … 22023`. A recusa entra **dentro da
   migration do bloco C** (a 0003, gerada pelo `gen-sjt-v2.py`), tem novo ensaio e uma mutação que morde. Isso
   também fecha a janela de concorrência entre um `pontuar_sjt` em voo e o commit do remapeamento. Tem de estar
   pronto antes de o remapeamento ser aplicado.
3. **IN-09 do -2 (registrado para o 52-17 por instrução do despacho; dono nomeado pelo review: 52-18).** O
   `52-REVIEW-BANCO` revisa `refs/gsd/52-15/sha..HEAD`, que começa no pin do 52-15. O gerador do remapeamento
   (`scripts/geradores/gen-sjt-v2.py`), o `test_gen_sjt_v2.py` e o smoke `p52_banco_sjt_smoke.sql` (j)–(l) foram
   commitados **antes** desse pin. O review do bloco C só os verá se forem tocados de novo; o SQL gerado entra, o
   smoke não. A instrução ao revisor (52-18 Task 2) tem de incluir **`scripts/geradores/` e
   `supabase/tests/p52_banco_sjt_smoke.sql` inteiros**, e isso tem de estar decidido antes de o 52-17 gerar a 0003.

Lembretes para o **52-15**, que não são carry-forward do bloco C:
- IN-07 do -1: nenhum commit entre os dois `migrate`.
- (b) confirmada: janela única até o fim do 52-15.

## Task Commits

| Commit | Autor | O quê |
|---|---|---|
| `26a74d93` | revisor | `52-REVIEW-PORTAO-1.md` (critical 1) |
| `1eb87612` | orquestrador | decisões do operador sobre o -1 (P1, P2) |
| `aacef0a6` | rodada (52-02) | CR-01 |
| `0b4d486b` | rodada (52-02) | WR-01 |
| `794aaf26` | rodada (52-01) | WR-02 |
| `1f688f52` | rodada (52-16) | WR-03, remapeamento no gerador |
| `040c6b4d` | rodada (52-16) | WR-03, `capturar()` com `perguntas_opcao_sjt` |
| `efe55372` | revisor | `52-REVIEW-PORTAO-2.md` (critical 0) |
| `5d834bee` | orquestrador | decisão do portão (a)/(b) e disposição dos warnings do -2 |
| `355f1249` | executor | `docs(52-14): registros emendados — Big Five e Caso pratico confirmam a saida (WR-03 do portao 2)` |

`commits: 10` medido: `git rev-list --count 77d2ae2b..355f1249`. Inclui os commits do revisor, do orquestrador e
da rodada nos planos donos. Os commits deste SUMMARY e do tracking vêm depois.

## Deviations from Plan

### Adjustments

**1. [Rule 2 - registros] A emenda do WR-03 do -2 foi além dos quatro arquivos que o review nomeou**
- **Found during:** fecho (passo 2 do despacho)
- **Issue:** a varredura pedida pelo despacho («nenhuma linha em `.planning/phases/52-*` diz que Big Five/Caso saem
  direto, fora o histórico datado») achou o mesmo erro no `52-RESEARCH.md` (achado F1, Pitfall 1, tabela JORN-60) e
  no `52-PATTERNS.md` (:59, :636). Esses são os pontos que uma rodada de conserto futura copiaria. O Pitfall 1 é
  justamente a armadilha: ele manda «derivar do código pelo `useAutosaveAvaliacao(`», que só mostra quem GRAVA.
- **Fix:** marcadores datados nesses pontos, sem apagar texto. O bloco `<user_constraints>` da RESEARCH, cópia byte
  a byte da CONTEXT, ficou intocado.
- **Commit:** `355f1249`

**2. [Registro] Evidência do ledger do tracer**
- A saída literal do `p46apply.cjs sql` da Task 1 não ficou no scratchpad. O SUMMARY registra a leitura de ledger do
  próprio ensaio (`aplicadas=[]`), a medição só leitura do revisor e as repetições. PROD não foi acessado neste fecho,
  porque o despacho não pede acesso.

Nenhuma escrita em PROD, nenhum push, nenhum `gsd-tools` sobre STATE/ROADMAP.

## Threat Flags

Nenhuma superfície nova: este plano só mexe em `.planning/`. Situação das ameaças do plano:
- T-52-38: mitigada (`PORTAO OK`).
- T-52-39: mitigada (respostas verbatim e datadas).
- T-52-40: mitigada (confirmação (b)).
- T-52-SC: nenhuma instalação.

## Next Phase Readiness

- **52-15 liberado:** review `-2` sem crítico, `PORTAO OK`, (a) «aplicar», (b) «Confirmo».
- **Bloco C (52-16/17/18) bloqueado** até os três carry-forwards acima.
