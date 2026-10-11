---
phase: 52-hub-do-rh-dados-e-contato
plan: 18
subsystem: database
tags: [sjt, banco-de-itens, apply-prod, management-api, pontuar_sjt, remap, push, portao]

requires:
  - phase: 52-15
    provides: "bloco B no ar (pin refs/gsd/52-15/sha = bc0d2720); commit local fa6ab81b (database.types.ts) à espera deste push"
  - phase: 52-16
    provides: "recusa 22023 do pontuar_sjt e mapa velho->novo durável (29469c08)"
  - phase: 52-17
    provides: "texto aprovado (md5 03b2a0d5…, tabela 1d441390…); migration 20261011000003 gerada (md5 18141c60…); mutações B1–B6"
provides:
  - "20261011000003_p52_banco_sjt_v2 no ledger de PROD, md5(statements[1]) = arquivo (18141c60e27c7d6c8bea2ebc1267dc57)"
  - "PROD: 6 mc + 1 caso_aberto ativos em sdr-social-seller, social-media, videomaker-storymaker e editor-video; tabela por char_length = aprovada"
  - "PROD: public.pontuar_sjt com a recusa 22023 (md5 prosrc 66fe507fbf5bf6a98bd7e5eecd84f310); 0 opcao_id fora de uuid v4 em item SJT ativo"
  - "PROD: supabase_migrations.p52_remap_opcao_sjt = 32/8, vigente, fora do alcance de anon/authenticated/service_role"
  - "origin/main = c3e04a71: bloco C + database.types.ts do 52-15 empurrados por sha, enumerados (19 commits, 0 alheio)"
  - "ref refs/gsd/52-18/sha = c3e04a717c9338387160a7dc03d2e74e2f4133c7"
affects: [UAT da Phase 52, 52-19, WR-04 (migration própria antes de candidatos reais)]

actuals:
  tokens: 13600
  tasks: 3
  commits: 4
plan_head_before: 98d0106258400876bda44f2030725bcb224c2ff2
plan_head_after: c3e04a717c9338387160a7dc03d2e74e2f4133c7

tech-stack:
  added: []
  patterns:
    - "Passo 0b por máquina: o token ;remap=… remedido é comparado com o aprovado por `test \"$N\" = \"$T\"`, e a saída IGUAL/DIFERENTE é registrada antes do apply (WR-02 do REVIEW-BANCO-1)"
    - "Checagem de forma antes e depois do apply (WR-01 do REVIEW-BANCO-1): uma linha de base medida antes torna o número de depois interpretável"

key-files:
  created:
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-BANCO-1.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-18-DECISOES-PREVIAS.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-18-DECISAO-OPERADOR.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-18-SUMMARY.md
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "Operador (2026-10-11, prévia): sem LOCK TABLE, «Não — detectar (Recommended)»; cliente depois do 22023 vira «Item de UAT (Recommended)»"
  - "Operador (2026-10-11, Task 2): «aplicar», «Confirmo» a janela única; 3a9254c3 = «É conta de teste minha» (+claude6)"
  - "Operador (2026-10-11): WR-04 «consertar ANTES de abrir para candidatos reais», numa migration própria depois do bloco C, sem tocar a 0003; WR-05 vai para o backlog comum"
  - "Executor: o lembrete BD-14 do p46apply é esperado (IN-03); o p44 vigia só public, e o mapa mora em supabase_migrations. Não foi rodado porque a autorização do operador não o inclui"

patterns-established:
  - "Precondition que pede registro no SUMMARY é cumprida com um SUMMARY parcial commitado ANTES do pin; commit só de .planning/ passa no portão"

requirements-completed: [JORN-52]

coverage:
  - id: D1
    description: "Migration exata do banco v2 ensaiada sobre o estado vivo (Task 1, e de novo na Passo 0b, minutos antes do apply); mutações mordem"
    requirement: JORN-52
    verification:
      - kind: integration
        ref: "node scripts/p52_ensaio.cjs --migracoes=supabase/migrations/20261011000003_p52_banco_sjt_v2.sql supabase/tests/p52_banco_sjt_smoke.sql → ENSAIO VERDE smokes=[52b=14/14]"
        status: pass
      - kind: integration
        ref: "node scripts/p52_mutacoes.cjs → MUTACOES: 14/14 mordem"
        status: pass
    human_judgment: false
  - id: D2
    description: "Banco SJT v2 aplicado em PROD pela via do projeto (portão + p46apply migrate no mesmo comando): ledger = arquivo, 6+1 nos quatro cargos, tabela = aprovada"
    requirement: JORN-52
    verification:
      - kind: integration
        ref: "Task 3 <verify> 1 → «banco v2 em PROD: 6+1 nos quatro cargos; tabela = aprovada; ledger = arquivo»"
        status: pass
    human_judgment: false
  - id: D3
    description: "Remap provado em PROD: 0 opcao_id fora de v4, pontuar_sjt = md5 do cabeçalho, mapa 32/8 vigente e fora do alcance de API, 0 resposta no id velho; checagem de forma WR-01 = 0"
    requirement: JORN-52
    verification:
      - kind: integration
        ref: "Task 3 <verify> 3 → «remap em PROD: … mapa=32/8 vigente; 0 resposta no id velho; mapa fora do alcance de API»"
        status: pass
      - kind: integration
        ref: "consulta WR-01 do 52-REVIEW-BANCO-1 (só leitura) → parciais_hoje=0, mc_rows=6 (igual à linha de base de antes)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Push do bloco C com o database.types.ts do 52-15, por sha, enumerado; origin/main = HEAD logo após o push"
    requirement: JORN-52
    verification:
      - kind: other
        ref: "Comando de push do plano → enumeracao ok: 19 commit(s) em bc0d2720..c3e04a71; Task 3 <verify> 2 → «origin/main = HEAD»"
        status: pass
    human_judgment: false
  - id: D5
    description: "Candidato responde o banco novo: Consultor fdbe1a4a chega ao «Tudo concluído» e ao painel F7; envio com prova aberta durante o apply"
    requirement: JORN-52
    verification: []
    human_judgment: true
    rationale: "Jornada de tela com conta de teste. É a UAT da Phase 52, que precede o 52-19"

duration: "Task 3: 3 min (18:58:17Z → 19:01Z); Tasks 1–2 nas sessões anteriores do mesmo dia"
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 18: bloco C no ar — banco SJT v2 aplicado em PROD, provado e empurrado

**A migration `20261011000003_p52_banco_sjt_v2` está em PROD, com o md5 do ledger igual ao do arquivo (`18141c60…`).**
**Cada um dos quatro cargos do texto tem 6+1. O `pontuar_sjt` recusa id fora da pergunta com 22023, e o mapa velho→novo tem 32/8 e não é alcançável pela API.**
**O apply rodou pelo portão, depois de uma remedição igual byte a byte ao token aprovado. O bloco C, com os tipos do 52-15, foi empurrado por sha: `bc0d2720..c3e04a71`.**

## Performance

- **Duration:** Task 3: ~3 min. Tasks 1 e 2 foram feitas nas sessões anteriores de 2026-10-11 (tracer em 83dbe5d0; review fc22cb98; decisão a9964d5e).
- **Started (Task 3):** 2026-10-11T18:58:17Z
- **Apply:** 2026-10-11T18:59:09Z (fim do comando)
- **Push / verify 2:** ~2026-10-11T19:00Z
- **Tasks:** 3/3
- **Files modified:** 6 (só `.planning/`; nenhum código neste plano)

## Task 1 (tracer): evidência literal

Executada em 83dbe5d0. Ledger antes do apply: `20261011000001`, `20261011000002`, **sem** `20261011000003`. Relido só
leitura às 18:58Z, sem mudança.

```
ENSAIO VERDE: supabase/tests/p52_banco_sjt_smoke.sql · prefixadas=[20261011000003] · aplicadas=[20261011000001,20261011000002] · ausentes=[20261011000004] · smokes=[52b=14/14] · evidencia=pontuar_sjt=66fe507fbf5bf6a98bd7e5eecd84f310 banco:sdr-social-seller=6+1,social-media=6+1,videomaker-storymaker=6+1,editor-video=6+1;retirados=19;tabela_md5=1d441390e9951839d2249966947addc2;mantidos=3;remap=32/8,refs=3,linhas=1,em_curso=1,mapa=32,em_curso_ids=f73682b6-7827-4e89-b6c1-f25116a30083 52b.retirados=19 52b.refs=14,em_retirados=9 52b.mantidos=3 52b.remap=32 52b.refs_remap=3 52b.scores_sjt=8 52b.mapa=32 52b.pontuar=bateria:3,valido=igual,22023=velho+forjado,velho_silencioso=2/3 · 2505 ms
MUTACOES: 14/14 mordem; controle verde; nada persistiu
```

- token `pontuar_sjt=66fe507fbf5bf6a98bd7e5eecd84f310`
- token `;remap=32/8,refs=3,linhas=1,em_curso=1,mapa=32,em_curso_ids=f73682b6-7827-4e89-b6c1-f25116a30083`
- `52b.pontuar=bateria:3,valido=igual,22023=velho+forjado,velho_silencioso=2/3`

## Task 2: review e decisão do operador

**Review:** `52-REVIEW-BANCO-1.md` (fc22cb98): `critical: 0`, 5 warnings, 6 infos, `reviewed_head` 83dbe5d0.
Portão no modo revisão:
`PORTAO OK: revisao=…52-REVIEW-BANCO-1.md reviewed_head=83dbe5d00c264687b6b4eab96d3bac2c1e103dd3 pin=- modo=revisao`.

**Decisões prévias (2026-10-11, `52-18-DECISOES-PREVIAS.md`, 83dbe5d0), verbatim:**
1. LOCK TABLE: **«Não — detectar (Recommended)»**
2. Cliente depois de 22023: **«Item de UAT (Recommended)»**

**Decisão da Task 2 (2026-10-11, `52-18-DECISAO-OPERADOR.md`, a9964d5e), verbatim:**
- Quem é a 3a9254c3: **«É conta de teste minha»**
- Bloco C: **«aplicar»**. Vale com o token da Passo 0b, comparado por máquina; se o token mudar, o apply PARA. Depois
  do apply, a checagem de forma do WR-01 (só leitura) fica registrada aqui.
- Janela única: **«Confirmo»**. Nenhuma outra janela publica até o fim do 52-18.
- WR-04 / WR-05:
  > «Backlog, com uma condição: o WR-04 é explorável. A checagem de duplicata compara pergunta_id como TEXTO, então um
  > payload montado à mão com 5 ids + 1 repetido em maiúsculas soma 6 distintos, passa no «v_answered = v_expected» e conta
  > a pergunta repetida duas vezes no lugar da omitida. Registrar como «consertar ANTES de abrir para candidatos reais»,
  > numa migration própria depois do bloco C (comparar como uuid: count(DISTINCT (r->>'pergunta_id')::uuid)), sem mexer no
  > 0003. WR-05 vai para o backlog comum.Sobre a WR-03: a 3a9254c3 é da conta +claude6 (teste, aceite do 51-17). O review
  > não a reconheceu como teste, então os padrões que ele usou não incluem +claudeN. A varredura do 52-19 tem que usar a
  > lista da D-30 (+claudeN, +cand1, @teste.com, @invalido.local) MAIS a entrada por vaga de teste, e a 3a9254c3 tem que
  > aparecer na população. Registre isso como verificação do 52-19.»

**Token aprovado pelo operador:** `;remap=32/8,refs=3,linhas=1,em_curso=1,mapa=32,em_curso_ids=f73682b6-7827-4e89-b6c1-f25116a30083`

## Task 3: apply, provas e push

### Passo 0: pin
`refs/gsd/52-18/sha` = **c3e04a717c9338387160a7dc03d2e74e2f4133c7**, igual ao HEAD. É o commit do SUMMARY parcial, só
`.planning/`. `git diff --quiet 83dbe5d0 refs/gsd/52-18/sha -- . ':!.planning'`: o código do pin é o código revisado.
Nenhum commit entre o pin e o apply.

### Passo 0b: remedição, comparada por máquina (WR-02)
Ensaio novo: `rc=0`. Tail:
```
ENSAIO VERDE: supabase/tests/p52_banco_sjt_smoke.sql · prefixadas=[20261011000003] · aplicadas=[20261011000001,20261011000002] · ausentes=[20261011000004] · smokes=[52b=14/14] · evidencia=pontuar_sjt=66fe507fbf5bf6a98bd7e5eecd84f310 banco:sdr-social-seller=6+1,social-media=6+1,videomaker-storymaker=6+1,editor-video=6+1;retirados=19;tabela_md5=1d441390e9951839d2249966947addc2;mantidos=3;remap=32/8,refs=3,linhas=1,em_curso=1,mapa=32,em_curso_ids=f73682b6-7827-4e89-b6c1-f25116a30083 52b.retirados=19 52b.refs=14,em_retirados=9 52b.mantidos=3 52b.remap=32 52b.refs_remap=3 52b.scores_sjt=8 52b.mapa=32 52b.pontuar=bateria:3,valido=igual,22023=velho+forjado,velho_silencioso=2/3 · 2312 ms
```
Comparação (`test "$N" = "$T"`):
```
aprovado: ;remap=32/8,refs=3,linhas=1,em_curso=1,mapa=32,em_curso_ids=f73682b6-7827-4e89-b6c1-f25116a30083
remedido: ;remap=32/8,refs=3,linhas=1,em_curso=1,mapa=32,em_curso_ids=f73682b6-7827-4e89-b6c1-f25116a30083
IGUAL
```
`retirados=19`: é a baseline que o POS garante dentro da transação do apply. O número publicado é o desta Passo 0b.

### Linha de base antes do apply, checagem de forma WR-01 (só leitura)
```
[{ "parciais_hoje": 0, "mc_rows": 6, "vol": "v" }]
```

### Passo 1: portão e apply, no mesmo comando
```
PORTAO OK: revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-BANCO-1.md reviewed_head=83dbe5d00c264687b6b4eab96d3bac2c1e103dd3 pin=c3e04a717c9338387160a7dc03d2e74e2f4133c7 modo=apply
rc=0

── 20261011000003_p52_banco_sjt_v2.sql
   version : 20261011000003
   name    : p52_banco_sjt_v2
   octetos : 99499
   md5     : 18141c60e27c7d6c8bea2ebc1267dc57
   ⚠ BD-14: esta migration mexe em tabela — depois do apply, rode `node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql` (cadência manual aceita em 2026-10-06; ver 44-CONTEXT)
   ✅ aplicada e escriturada — md5 do ledger BATE (99499 octetos)
```
O PRE e o POS passaram na primeira tentativa: sem recusa, sem 55P03/57014, sem segunda execução (IN-04 não ocorreu).
O lembrete BD-14 é o que o IN-03 previa: o `CREATE TABLE` é o do mapa, em `supabase_migrations`, e o p44 vigia só
`public`. O p44 não foi rodado porque a autorização do operador cobre só o que a Task 3 especifica.

### Passo 2: provas em PROD (só leitura)
1º `<verify>` (`H=18141c60e27c7d6c8bea2ebc1267dc57`, `A=1d441390e9951839d2249966947addc2`):
```
banco v2 em PROD: 6+1 nos quatro cargos; tabela = aprovada; ledger = arquivo
```
3º `<verify>` (`R=32/8` da Passo 0b, `H=66fe507fbf5bf6a98bd7e5eecd84f310` do cabeçalho):
```
remap em PROD: 0 opcao_id fora de v4 em item ativo; pontuar_sjt=66fe507fbf5bf6a98bd7e5eecd84f310; mapa=32/8 vigente; 0 resposta no id velho; mapa fora do alcance de API
```
- `remap=` da Passo 0b: `32/8`. `mapa=` do 3º `<verify>`: `32/8`. Iguais.
- A prova «zero resposta no id velho (pelo mapa)» deu 0: nenhum resíduo de concorrência do primeiro sabor.

**Checagem de forma WR-01 depois do apply** (consulta literal do 52-REVIEW-BANCO-1, só leitura, 18:59:37Z):
```
[{ "parciais_hoje": 0, "mc_rows": 6, "vol": "v" }]
```
Deu zero, igual à linha de base. Nenhuma linha SJT mc tem `answered` diferente do número de respostas gravadas, então o
segundo sabor também não deixou resíduo.

### Passo 3: push por sha, com a enumeração do plano
- `S=c3e04a717c9338387160a7dc03d2e74e2f4133c7`
- `R=bc0d27204ed4c2b5f8bc24d4889f3f0556411eb4`
- Portão no modo push:
  `PORTAO OK: … pin=c3e04a717c9338387160a7dc03d2e74e2f4133c7 modo=push ledger=[20261011000001,20261011000002,20261011000003]`

Enumeração (`p50_enumera`):
```
fa6ab81b codigo   chore(52-15): db:types com as RPCs de leitura do RH
2c86f4fb planning docs(52-15): complete bloco B no ar plan — SUMMARY
f4d0f1ef planning docs(52-15): STATE frontmatter e ROADMAP — 52-15 concluido (escrito a mao, sem gsd-tools)
29469c08 codigo   fix(52-16): pontuar_sjt recusa 22023 a resposta sem alternativa; mapa velho->novo duravel (WR-02/WR-01 do portao 2)
d73338f8 planning docs(52-18): 0003 destrutiva (remap + respostas gravadas + pontuar_sjt + mapa), desfazer real, provas pos-apply, escopo do review (WR-01 e IN-09 do portao 2)
ff008f81 planning docs(52-17): operador pede mudancas no texto do bloco C (rodada 1), verbatim
4b84b815 codigo   docs(52-17): texto do bloco C — mudancas do operador, rodada 1
4f0ac16b planning docs(52-17): operador aprova o texto do bloco C com dois polimentos (rodada 2), verbatim
c66c6222 codigo   docs(52-17): texto do bloco C — polimentos aprovados pelo operador (rodada 2)
1016784d planning docs(52-17): texto do bloco C aprovado pelo operador — md5 03b2a0d5 (pos-polimento), tabela 1d441390, criterio proposto
86457fbc codigo   feat(52-17): banco SJT v2 gerado do texto aprovado (20261011000003)
f98e9c3b codigo   test(52-17): mutacoes do banco SJT v2
5f06e100 codigo   fix(52-17): smoke do banco — rotulo do (n) como text (22P02 escondia o P52B FAIL)
2f5fa7ee planning docs(52-17): SUMMARY — texto aprovado (03b2a0d5), 0003 gerada (18141c60) e ensaiada 52b=14/14, mutacoes 14/14
98d01062 planning docs(52-17): STATE frontmatter e ROADMAP — 52-17 concluido (escrito a mao, sem gsd-tools)
83dbe5d0 planning docs(52-18): decisoes previas do operador — sem LOCK (detectar); retry do 22023 como item de UAT
fc22cb98 planning docs(52-18): review adversarial bloqueante do bloco C (banco 1)
a9964d5e planning docs(52-18): operador decide aplicar o bloco C; WR-04 bloqueia abertura a candidatos reais; verificacao +claudeN no 52-19
c3e04a71 planning docs(52-18): SUMMARY parcial — evidencia do tracer e token aprovado registrados antes do pin
enumeracao ok: 19 commit(s) em bc0d2720..c3e04a71 · codigo coberto por 52-REVIEW-BANCO-1.md (reviewed_head 83dbe5d0) · codigo contido no apply c3e04a71
To github.com:fercosnt/SistemaRecrutamento.git
   bc0d2720..c3e04a71  c3e04a717c9338387160a7dc03d2e74e2f4133c7 -> main
```
O `chore(52-15): db:types…` (`fa6ab81b`) está entre os commits `codigo`.

### Passo 4: 2º `<verify>`
```
origin/main = HEAD
```
`git log --oneline origin/main..HEAD` estava vazio logo depois do push.

**Marcadores no ar:** não se aplicam. O intervalo `bc0d2720..c3e04a71` não toca `src/`
(`git diff --name-only bc0d2720 c3e04a71 -- src` = 0 arquivos). O `database.types.ts` só tem tipos e não chega ao
bundle. O plano não pede conferência de chunk.

**O que fica local depois deste SUMMARY:** este commit do SUMMARY e o commit do STATE/ROADMAP, só `.planning/`.
Seguem o precedente do 52-15 (`2c86f4fb` e `f4d0f1ef` ficaram locais e subiram neste push) e sobem no próximo push com
portão. Não houve segundo push: a autorização cobre um só.

## Disposição dos achados do 52-REVIEW-BANCO-1

| Achado | Disposição |
|---|---|
| WR-01 (resíduo-espelho: o corpo velho lê depois do commit) | Fix (a): a checagem de forma rodou só leitura antes e depois do apply. Deu `parciais_hoje=0`, `mc_rows=6` nas duas vezes. A premissa do plano `:26` segue incompleta no texto; não foi emendada porque emendar pediria o review `-2` |
| WR-02 (a Passo 0b era comparação manual) | Comparação por máquina antes do Passo 1. Resultado `IGUAL`, com os dois tokens registrados acima |
| WR-03 (3a9254c3 fora do `em_curso`) | O operador disse «É conta de teste minha» (+claude6, aceite do 51-17). Não bloqueia. O item de UAT ganha o caminho 42501 → «Sua etapa avançou» (falso) |
| WR-04 (pergunta_id repetido em caixa diferente) | **ABERTO**, bloqueia a abertura para candidatos reais (ver Itens abertos) |
| WR-05 (`p49_12_pos_estado.sql:126,135`) | Backlog comum (ver Itens abertos) |
| IN-01 (o comentário do smoke não nomeia a cadeia do UPDATE) | Backlog / 52-16. Sem ação aqui |
| IN-02 (RK/RL fora do harness) | Backlog: promover na próxima rodada que mexer no `p52_mutacoes.cjs` |
| IN-03 (lembrete BD-14) | Apareceu como o review previu. É esperado e o p44 não se aplica, porque vigia só `public`. Não foi rodado: fora da autorização |
| IN-04 (READ COMMITTED: o POS pode recusar por tráfego) | Não ocorreu: o POS passou na primeira tentativa. Se ocorrer, a regra fica: recusa = PARAR e checkpoint, sem reaplicar por outra via |
| IN-05 (a varredura isenta o ledger) | Remedido no review e sólido hoje. Backlog 52-16 |
| IN-06 (banda da rubrica constante no parser) | Backlog |

## Itens abertos (registrados, NÃO consertados neste plano)

1. **WR-04: «consertar ANTES de abrir para candidatos reais».**
   - O que fazer: uma migration própria, DEPOIS do bloco C e sem tocar a 0003. O `pontuar_sjt` passa a contar
     `pergunta_id` como uuid: `count(DISTINCT (r->>'pergunta_id')::uuid)`, recusando o payload com pergunta repetida em
     caixa diferente.
   - Dono: a definir pelo orquestrador/planejador antes do fecho da Phase 52.
2. **WR-05: backlog comum.** `supabase/tests/p49_12_pos_estado.sql:126,135` (`text[] || 'literal'` → 22P02). Conserto:
   `'…'::text`, como na `:743` do smoke do banco.
3. **Verificação do 52-19.**
   - A varredura da população de teste usa a lista da D-30 (`+claudeN`, `+cand1`, `@teste.com`, `@invalido.local`)
     MAIS a entrada por vaga de teste.
   - A candidatura `3a9254c3-8086-42df-8d81-42889c3a1f8d` (conta +claude6, aceite do 51-17) TEM de aparecer na
     população medida.
4. **Disposições IN-01..IN-06:** na tabela acima.
5. **Item de UAT (decisão do operador).** O retry do cliente depois de um `22023` não funciona: as alternativas ficam em
   cache (`staleTime: Infinity`) e «Tente novamente» reenvia o id velho. Só recarregar resolve.

## Próximo passo

**UAT da Phase 52 (`/gsd-verify-work 52`), ANTES do bloco D (52-19).** Usar contas de teste que respondam o banco novo.
A vaga Consultor `fdbe1a4a` tem de chegar ao «Tudo concluído» e ao painel «Avaliações concluídas — aguardando a equipe»
(F7).

Itens de UAT que este plano deixa:
- SJT de cargo remapeado aberto durante o apply: o envio recusado com 22023 só volta a funcionar depois de recarregar a
  página.
- SJT de cargo do texto (bateria retirada) aberto durante o apply (WR-03):
  - se a tela ainda for buscar as alternativas, `get_opcoes_sjt` dá 42704;
  - se as alternativas já estiverem em cache, `pontuar_sjt` dá 42501, que o cliente mostra como «Sua etapa avançou —
    esta avaliação não aceita mais respostas». A mensagem é falsa.

## Deviations from Plan

**1. [Rule 3 - Blocking] SUMMARY parcial commitado antes do pin, para cumprir a `<precondition>` da Task 3**
- **Found during:** Task 3, avaliação da precondition.
- **Issue:** a precondition pede «o token `;remap=…` que o operador viu registrado no SUMMARY». O token estava só no
  `52-18-DECISAO-OPERADOR.md` (commitado), e o `52-18-SUMMARY.md` não existia.
- **Fix:** escrevi um SUMMARY parcial (Task 1 + Task 2 + token, literais) e commitei em c3e04a71, só `.planning/`,
  ANTES do pin. O pin é esse commit (HEAD = pin no modo apply). Nenhum commit entre o pin e o apply. Este arquivo
  substitui o parcial.
- **Verification:** `PORTAO OK … modo=apply` e `… modo=push`; `git diff --quiet 83dbe5d0 refs/gsd/52-18/sha -- . ':!.planning'`.
- **Committed in:** c3e04a71

**2. [Operador] Duas checagens a mais, pedidas pelo operador como condição do «aplicar»**
- Comparação do token por máquina (WR-02).
- Checagem de forma WR-01, rodada antes e depois do apply.
- As duas foram só leitura e estão registradas acima.

**Total deviations:** 1 auto-fixed (Rule 3) + 2 condições do operador cumpridas.
**Impact on plan:** nenhuma mudança de código, do plano ou da via de apply.

## Issues Encountered

Nenhum. Ensaio verde, token igual, PRE/POS verdes na primeira execução, as três provas pós-apply verdes, enumeração ok
e push aceito.

## Known Stubs

Nenhum. O plano não tem código.

## Threat Flags

Nenhum. A superfície nova (mapa em `supabase_migrations`, troca do `pontuar_sjt`) está no `<threat_model>` do plano
(T-52-93/94/79 — os dois primeiros renumerados de T-52-77/78, que colidiam com o 52-01 e o 52-23) e foi provada em PROD.

## User Setup Required

None.

## Self-Check: PASSED

- FOUND: `52-18-SUMMARY.md`, `52-REVIEW-BANCO-1.md`
- FOUND (ancestrais de HEAD): 83dbe5d0, fc22cb98, a9964d5e, c3e04a71, fa6ab81b
- `commits: 4` medido por `git rev-list --count 98d01062..HEAD` no momento da escrita. Este SUMMARY e o STATE/ROADMAP
  vêm depois, em dois commits.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*
