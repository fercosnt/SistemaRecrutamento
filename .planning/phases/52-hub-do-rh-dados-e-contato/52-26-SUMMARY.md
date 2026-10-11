---
phase: 52-hub-do-rh-dados-e-contato
plan: 26
subsystem: database
tags: [postgres, plpgsql, supabase, pontuar_sjt, salvar_avaliacao_entrevista, migration-gerada, smoke, mutacoes, vitest]
status: complete
completed_note: "Sessão B: a parada da Passo 3 (COMMIT ALHEIO — lista literal do --caminhos sem os dois arquivos da rodada WR-01) foi resolvida pelo operador (52-26-DECISAO-PUSH.md, opção B): o comando do plano rodou UMA vez com os dois caminhos acrescentados só na linha de comando. Push c3e04a71..29f34756; origin/main = HEAD; 8fa8193a e e9dfc369 no remoto."
halted_reason_historico: "Sessão B: Task 3 concluída (87cfe0ea); Task 4 Passos 0–2 VERDES — a 0005 está em PROD (ledger BATE, md5 vivos = _novo, smoke52g 14/14 contra o vivo, MUTACOES 9/9 em --pos-apply, instante 2026-10-11T22:51:48Z registrado em ef5d9b07). PARADA na Passo 3: a enumeração do comando de push saiu `COMMIT ALHEIO: PARAR` — 8f625cde e 5f091c8d (rodada WR-01, revisados no 52-REVIEW-GAP-2, ancestrais do pin) tocam caminhos fora do `--caminhos` literal do plano. NADA foi empurrado (origin/main = c3e04a71). Decisão do operador pedida."

requires:
  - phase: 52-18
    provides: "0003 no ar (pontuar_sjt md5 66fe507f… = corpo vivo de partida), refs/gsd/52-18/sha = c3e04a71"
provides:
  - "scripts/geradores/gen-p52-gap.cjs — gerador da 0005 por troca ancorada (--capturar, geração, --conferir, --auto-teste)"
  - "corpos vivos capturados byte a byte: pontuar_sjt_vivo_v2.plpgsql (66fe507f…), salvar_avaliacao_entrevista4_vivo.plpgsql (070e0f1b…) — o desfazer"
  - "supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql (GERADA, NÃO aplicada)"
  - "supabase/tests/p52_gap_servidor_smoke.sql — smoke52g, 13 cláusulas (a)–(m)"
  - "p52_ensaio conhece a 0005 (MIGS na ordem de aplicação, par 52g)"
  - "p52_mutacoes: G1–G7 e a APOSENTADORIA explícita das B1–B6"
  - "DEFAULT_COMPETENCIAS exportado + guarda do espelho cliente × migration"
  - ".planning/phases/52-hub-do-rh-dados-e-contato/52-APLICACOES.json (0001..0003)"
affects: [52-26 sessão B (Tasks 3–4), UAT da 52, 52-19, 52-20, 52-21, 52-SECURITY]

actuals:
  tokens: 47000      # chars/4 do diff realizado d1c06bca..7de0b61f (165124 chars) + este SUMMARY
  tasks: 2           # de 4 (sessão A)
  commits: 8         # MEDIDO: git rev-list --count d1c06bca..7de0b61f
plan_head_before: d1c06bca3fac1ca3088ea6388128f01c03cdb311
plan_head_after: 7de0b61f839f677b896b213ee79907e0b7de9e66

tech-stack:
  added: []
  patterns:
    - "Migration que substitui função viva GERADA de prosrc capturado + trocas ancoradas (cada âncora exatamente 1 vez), com --conferir byte a byte"
    - "Aposentadoria explícita de entrada de mutação por versão no ledger (impressa, erro se pedida, vacuidade é erro)"

key-files:
  created:
    - scripts/geradores/gen-p52-gap.cjs
    - scripts/geradores/pontuar_sjt_vivo_v2.plpgsql
    - scripts/geradores/salvar_avaliacao_entrevista4_vivo.plpgsql
    - supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql
    - supabase/tests/p52_gap_servidor_smoke.sql
    - src/features/entrevista/__tests__/competencias-padrao-servidor.test.ts
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-APLICACOES.json
  modified:
    - scripts/p52_ensaio.cjs
    - scripts/p52_mutacoes.cjs
    - src/features/entrevista/components/EntrevistaScorecardInline.tsx
    - src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts
    - src/features/entrevista/__tests__/entrevista-contract.test.ts

key-decisions:
  - "Predicado numérico da nota (F13) em CASE (`CASE WHEN kv.v ~ '^[0-9]+(\\.[0-9]+)?$' THEN kv.v::numeric BETWEEN 1 AND 5 ELSE false END`) em vez do `AND` do corpo vivo: o Postgres não garante a ordem de um AND, e o cast de 'x' levantaria 22P02 em vez da recusa rotulada — mesma aceitação"
  - "Cláusulas de entrevista do smoke52g não movem a candidatura (a salvar_avaliacao_entrevista só exige a análise ser DELA); só as SJT a levam à vaga descartável — menos gatilhos disparados dentro do envelope"
  - "Task 2 em RED → GREEN: o commit único do plano («guarda do espelho … com o export») virou test(RED) + feat(GREEN)"

requirements-completed: []   # JORN-52/JORN-61 só fecham com o apply e as provas em PROD (Task 4, sessão B)

coverage:
  - id: D1
    description: "Gerador da 0005 (captura só leitura, troca ancorada, --conferir, --auto-teste) e a migration gerada = arquivo"
    requirement: JORN-52
    verification:
      - kind: other
        ref: "node scripts/geradores/gen-p52-gap.cjs --auto-teste → GEN-P52-GAP AUTO-TESTE OK: 11/11"
        status: pass
      - kind: other
        ref: "node scripts/geradores/gen-p52-gap.cjs --conferir → GERADO = ARQUIVO: 036d9d454c91042d51313c3184e73019"
        status: pass
    human_judgment: false
  - id: D2
    description: "WR-04 + F13 provados no ensaio que ABORTA sobre o PROD de agora (smoke52g 13/13, G1–G7 mordem)"
    requirement: JORN-52
    verification:
      - kind: integration
        ref: "node scripts/p52_ensaio.cjs --migracoes=<0005> supabase/tests/p52_gap_servidor_smoke.sql → smokes=[52g=13/13]"
        status: pass
      - kind: integration
        ref: "node scripts/p52_mutacoes.cjs → MUTACOES: 15/15 mordem; controle verde; nada persistiu (aposentadas: B1,B2,B3,B4,B5,B6)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nada antigo quebrou: p49 revisão/vigente verdes com e sem a 0005; delta Vitest alteradas=0 novas=0; lint 89; tipografia; build"
    requirement: JORN-61
    verification:
      - kind: integration
        ref: "p49_revisao_por_analise_smoke + p49_analise_vigente_smoke, controle e tratamento → ENSAIO VERDE x4"
        status: pass
      - kind: unit
        ref: "node scripts/p52_vitest_delta.cjs → vitest delta: base=0d70ac7 2725/2 · head=7de0b61 3100/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok"
        status: pass
    human_judgment: false
  - id: D4
    description: "A 0005 em PROD, provada contra o vivo (sessão B, Task 4 Passos 0–2)"
    requirement: JORN-52
    verification:
      - kind: integration
        ref: "p52_portao --modo apply && p46apply migrate <0005> → md5 do ledger BATE (036d9d45…, 30946 octetos); registro: 20261011000005 aplicado_ate 2026-10-11T22:51:48Z"
        status: pass
      - kind: integration
        ref: "verify 1 da Task 4 → gap em PROD: ledger = arquivo; pontuar_sjt=a63375bd salvar4=d2d3bc1d salvar3 intocada; ACL de anon igual; registro cobre 4 versoes p52"
        status: pass
      - kind: integration
        ref: "verify 2 da Task 4 → ENSAIO VERDE --sem-migracoes prefixadas=[] smokes=[52g=14/14]; MUTACOES: 9/9 mordem (pos-apply)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Push por sha que leva o gap e os commits só-.planning do 52-18 (Task 4 Passos 3–4)"
    verification:
      - kind: other
        ref: "comando de push do <context> → p50_enumera: COMMIT ALHEIO: PARAR (8f625cde, 5f091c8d fora do --caminhos literal)"
        status: fail
    human_judgment: true
    rationale: "Parada do plano (ALHEIO = PARAR); a lista --caminhos do comando de push é texto do plano sob o portão (6) — mudá-la é decisão do operador"

duration: 23min
completed: 2026-10-11
---

# Phase 52 Plan 26: gap de servidor (WR-04 + F13) — Summary PARCIAL (sessão A: Tasks 1–2)

**`pontuar_sjt` passa a comparar `pergunta_id` como uuid (duplicata e completude) e a recusar payload malformado com 22023 'resposta malformada'; `salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` passa a exigir nota 1–5 em toda competência da análise (regra de `normalizeCompetencia`, fallback DEFAULT_COMPETENCIAS) e nenhuma chave fora — migration 20261011000005 GERADA dos corpos vivos por troca ancorada, provada no ensaio que aborta (smoke52g 13/13, G1–G7 mordem). NADA foi escrito em PROD.**

## Performance

- **Duration:** ~23 min
- **Started:** 2026-10-11T21:27:27Z
- **Completed (sessão A):** 2026-10-11T21:49:52Z
- **Tasks:** 2 de 4 (Task 3 = checkpoint:decision blocking-human; Task 4 = apply/push, sessão B)
- **Files:** 12 (7 criados, 5 modificados)

## Accomplishments

- Gerador `gen-p52-gap.cjs` com captura só leitura (recusa se qualquer md5 vivo ≠ `ANTES_*`), geração por troca ancorada, `--conferir` e `--auto-teste` (11/11).
- Migration `20261011000005` gerada: PRE (`P52G PRE-PORTAO`) confere o md5 das TRÊS funções e guarda propriedades/ACL/comentário/EXECUTE de anon e authenticated + a impressão digital inteira da sobrecarga de 3 argumentos; POS (`P52G POS-PORTAO`) confere tudo e anexa `gap:pontuar_sjt=…,salvar4=…,salvar3=igual`. Sem BEGIN/COMMIT, sem GRANT/REVOKE/COMMENT.
- smoke52g com 13 cláusulas, escopo lido na execução, fixture em subtransações que revertem; mutações G1–G7 mordendo; as B1–B6 aposentadas explicitamente (a rodada completa do runner volta a ser verde).
- Espelho DEFAULT_COMPETENCIAS cliente × servidor vigiado por teste que morde.
- Registro `52-APLICACOES.json` com os instantes dos applies 0001..0003 conferidos contra os SUMMARYs.

## Task Commits

1. **Task 1 (tracer): WR-04 e F13 de ponta a ponta no ensaio**
   - `170f7da4` feat(52-26): gerador e migration do gap — pontuar_sjt compara pergunta_id como uuid (WR-04) e salvar_avaliacao_entrevista exige todas as competencias (F13)
   - `e7d82bd0` chore(52-26): p52_ensaio conhece a 20261011000005 (MIGS na ordem de aplicacao, par 52g)
   - `2950c061` test(52-26): smoke52g (tracer) e o mapeamento das recusas novas no cliente
   - `1291cc71` docs(52-26): registro do instante dos applies p52 (D-41 emendada, condicao 1)
2. **Task 2 (tdd): nove cláusulas, G1–G7, aposentadoria, espelho, suíte por delta**
   - `77ac8a67` test(52-26): smoke52g completo (13 clausulas) e mutacoes G1-G7
   - `09289b05` fix(52-26): p52_mutacoes aposenta, explicitamente, as entradas cujo smoke exige migration ja no ledger
   - `a9a0127b` test(52-26): guarda do espelho DEFAULT_COMPETENCIAS servidor x cliente (RED)
   - `7de0b61f` feat(52-26): DEFAULT_COMPETENCIAS exportado e o comentario do F13 (GREEN)

**Plan metadata (este SUMMARY):** commit `docs(52-26): …` logo a seguir.

## Medições de partida (só leitura, 2026-10-11 ~21:30Z — conferidas de novo na execução)

```
version: PostgreSQL 17.6 on aarch64-unknown-linux-gnu
md5(prosrc) pontuar_sjt(uuid,jsonb)                          = 66fe507fbf5bf6a98bd7e5eecd84f310   (= ANTES_PONTUAR)
md5(prosrc) salvar_avaliacao_entrevista(uuid,uuid,jsonb,text) = 070e0f1b523bc4879204d5c23da1a2dd   (= ANTES_SALVAR4)
md5(prosrc) salvar_avaliacao_entrevista(uuid,jsonb,text)      = 924dfb99c5c4f8be77bcb990c1b8e742   (= ANTES_SALVAR3, intocada)
ACL pontuar_sjt: {postgres=X,anon=X,authenticated=X,service_role=X}; comentário nulo
ACL das duas salvar_*: {postgres=X,authenticated=X,service_role=X} (sem anon); comentários NÃO nulos (preservados pelo CREATE OR REPLACE, conferidos no POS)
entrevista_analise_vigente = superada_em IS NULL AND status <> 'falhou' AND competencias IS NOT NULL  ([] é vigente → cláusula (m) possível)
ledger p52 = [20261011000001, 20261011000002, 20261011000003]
população do fixture: 3 administradores ativos; 9 candidaturas no critério; cargo SJT = editor-video (6 mc; empate com 3 cargos, desempate por nome)
```

## Task 1 — provas

**Captura e geração**
```
$ node scripts/geradores/gen-p52-gap.cjs --capturar
CAPTURADO: scripts/geradores/pontuar_sjt_vivo_v2.plpgsql md5 66fe507fbf5bf6a98bd7e5eecd84f310 · scripts/geradores/salvar_avaliacao_entrevista4_vivo.plpgsql md5 070e0f1b523bc4879204d5c23da1a2dd · salvar3 924dfb99c5c4f8be77bcb990c1b8e742 (intocada)
$ node scripts/geradores/gen-p52-gap.cjs
GERADO: supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql md5 036d9d454c91042d51313c3184e73019 · pontuar_sjt_novo=a63375bdb58b0bd01343081562b43a85 · salvar4_novo=d2d3bc1ddebf59b7896de59608daf45a
$ node scripts/geradores/gen-p52-gap.cjs --auto-teste
GEN-P52-GAP AUTO-TESTE OK: 11/11
$ node scripts/geradores/gen-p52-gap.cjs --conferir
GERADO = ARQUIVO: 036d9d454c91042d51313c3184e73019
```
Conferência extra: `pontuar_sjt_vivo_v2.plpgsql` é byte a byte o corpo novo da 0003 (o que a 0003 deixou no ar).

**Linha ENSAIO VERDE do tracer (verify 1, `52g=4/4`)**
```
ENSAIO VERDE: supabase/tests/p52_gap_servidor_smoke.sql · prefixadas=[20261011000005] · aplicadas=[20261011000001,20261011000002,20261011000003] · ausentes=[20261011000004] · smokes=[52g=4/4] · evidencia=gap:pontuar_sjt=a63375bdb58b0bd01343081562b43a85,salvar4=d2d3bc1ddebf59b7896de59608daf45a,salvar3=igual 52g.escopo=cargo:editor-video,bateria:6 52g.a=22023:dup 52g.b=11/24 52g.c=23514:incompleto 52g.d=4.00 · 598 ms
```
Mordida do próprio smoke contra o corpo VIVO (sem a 0005): `ENSAIO VERMELHO: P52G FAIL (a): a mesma pergunta em caixa diferente devolveu [ACEITO] e gravou 1 linha(s) SJT mc — esperado 22023 resposta duplicada e nada gravado` — o WR-04 reproduzido em PROD de agora, dentro do envelope que aborta (nada persistiu).

**Verify 2:** `Tests 36 passed (36)` (funil + entrevista-contract) e `registro de aplicacoes: 3 entradas (0001..0003 dos SUMMARYs)`. Horários conferidos: 52-15-SUMMARY `17:11:59 → 17:12:01` e `17:12:05 → 17:12:06`; 52-18-SUMMARY `Apply: 2026-10-11T18:59:09Z (fim do comando)`.

**Tracer feedback gate:** interativo, `end-of-phase`, `<verify>` só automatizado → verify 1 re-rodado depois dos commits: verde (mesma linha, 576 ms). Expansão liberada.

### Diff das trocas ancoradas (âncora → texto novo)

`pontuar_sjt` (corpo vivo 66fe507f → novo a63375bd):
- **P1** — âncora `  IF (SELECT count(*) FROM jsonb_array_elements(p_respostas))\n` (1×) → inserido ANTES dela:
  ```sql
  IF p_respostas IS NULL OR jsonb_typeof(p_respostas) <> 'array' THEN
    RAISE EXCEPTION 'resposta malformada' USING errcode = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_respostas) r
              WHERE jsonb_typeof(r) <> 'object'
                 OR NOT coalesce(pg_input_is_valid(r->>'pergunta_id', 'uuid'), false)
                 OR NOT coalesce(pg_input_is_valid(r->>'opcao_id', 'uuid'), false)) THEN
    RAISE EXCEPTION 'resposta malformada' USING errcode = '22023';
  END IF;
  ```
  (mais comentários WR-04)
- **P2** — `     <> (SELECT count(DISTINCT r->>'pergunta_id') FROM jsonb_array_elements(p_respostas) r) THEN` → `… count(DISTINCT (r->>'pergunta_id')::uuid) …`
- **P3** — `  SELECT count(DISTINCT r->>'pergunta_id') INTO v_answered …` → `  SELECT count(DISTINCT (r->>'pergunta_id')::uuid) INTO v_answered …`

`salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` (vivo 070e0f1b → novo d2d3bc1d):
- **S1** — âncora `  v_n          integer;\n` → + `v_conj text[]`, `v_falta integer`, `v_fora integer`.
- **S2** — âncora = o bloco inteiro do comentário «Média das notas humanas (BARS 1–5)» até o `END IF;` de `'scores_humanos sem notas numericas entre 1 e 5'` → (i) não-objeto/nulo → 23514 `'scores_humanos tem de ser um objeto {competencia: nota}'`; (ii) `v_conj` = nomes DISTINTOS de `v_comp` (array, senão nenhum) por `competencia` string não vazia → `competency` string → `''`; vazio → `ARRAY['Experiência UAU', 'Inovação', 'Atitude de Dono', 'Sede de Crescimento']; -- F13: espelho de DEFAULT_COMPETENCIAS (EntrevistaScorecardInline.tsx)` (1×); (iii) `v_falta` > 0 → 23514 `'scores_humanos incompleto: % de % competencia(s) da analise sem nota de 1 a 5'`; (iv) `v_fora` > 0 → 23514 `'scores_humanos com % chave(s) fora das competencias da analise'`; (v) `avg`/`count` só sobre `v_conj`. UPDATE / INSERT / RETURN intocados; recusas anteriores na mesma ordem, antes.

## Task 2 — provas

**Verify 1 — smoke 13/13 e a rodada COMPLETA do runner**
```
ENSAIO VERDE: supabase/tests/p52_gap_servidor_smoke.sql · prefixadas=[20261011000005] · aplicadas=[20261011000001,20261011000002,20261011000003] · ausentes=[20261011000004] · smokes=[52g=13/13] · evidencia=gap:pontuar_sjt=a63375bdb58b0bd01343081562b43a85,salvar4=d2d3bc1ddebf59b7896de59608daf45a,salvar3=igual 52g.escopo=cargo:editor-video,bateria:6 52g.a=22023:dup 52g.b=11/24 52g.c=23514:incompleto 52g.d=4.00 52g.e=22023:malformada 52g.f=22023:malformada 52g.g=22023:malformadax3 52g.h=maiusculas:11/24 52g.i=23514:fora 52g.j=23514:incompletox3 52g.k=23514:objetox2 52g.l=salvar3:23514+4.00 52g.m=padrao:23514+4.00 · 606 ms
```
```
APOSENTADA: B1 — supabase/tests/p52_banco_sjt_smoke.sql so roda com 20261011000003 prefixada, e 20261011000003 esta no ledger desde o apply
APOSENTADA: B2 — … (idem)
APOSENTADA: B3 — … (idem)
APOSENTADA: B4 — … (idem)
APOSENTADA: B5 — … (idem)
APOSENTADA: B6 — … (idem)
modo: padrao prefixadas=[20261011000005]
CONTROLE verde (supabase/tests/p52_leituras_rh_smoke.sql): par 52l=20/20 (758 ms)
L1 morde … P52L FAIL (c) · L2 morde … (g) · L3 morde … (n) · L4 morde … (o) · L5 morde … (q) · L6 morde … (f) · L7 morde … (r) · L8 morde … (t)
CONTROLE verde (supabase/tests/p52_gap_servidor_smoke.sql): par 52g=13/13 (546 ms)
G1 morde: pontuar_sjt: a checagem de duplicata volta a comparar pergunta_id como texto -> P52G FAIL (a) (621 ms)
G2 morde: pontuar_sjt: duplicata e completude voltam a comparar pergunta_id como texto -> P52G FAIL (a) (519 ms)
G3 morde: pontuar_sjt: sem as duas recusas 'resposta malformada' (P1) -> P52G FAIL (e) (633 ms)
G4 morde: salvar_avaliacao_entrevista: o bloco F13 volta a regra de pelo menos uma nota (corpo vivo) -> P52G FAIL (c) (600 ms)
G5 morde: salvar_avaliacao_entrevista: sem a recusa de chave fora das competencias da analise -> P52G FAIL (i) (635 ms)
G6 morde: salvar_avaliacao_entrevista: sem o fallback dos 4 nomes de DEFAULT_COMPETENCIAS -> P52G FAIL (m) (581 ms)
G7 morde: salvar_avaliacao_entrevista: a normalizacao ignora a chave competencia (so competency) -> P52G FAIL (d) (541 ms)
leitura so-leitura igual a baseline: ledger=["20261011000001","20261011000002","20261011000003"] funcoes=7 mutacoes_p52=0 fixtures_p52={"users":0,"candidatos":0}
MUTACOES: 15/15 mordem; controle verde; nada persistiu (aposentadas: B1,B2,B3,B4,B5,B6)
```
Os textos da mordida que o plano cita, medidos com `p52_ensaio --mutacao=`: G1 → `P52G FAIL (a): … devolveu [22023:bateria incompleta (5 de 6)]` (a recusa muda de rótulo, por isso o smoke confere o rótulo); G3 → `P52G FAIL (e): devolveu [22P02:invalid input syntax for type uuid: …`. `julgarMutacao`/`julgarControle`: 0 linhas alteradas. `--so=B5` → `ERRO DO HARNESS: B5 aposentada (…) — nao roda mais; retire-a do --so`.

**Verify 2 — regressões com controle na mesma execução**
```
p49_revisao_por_analise_smoke controle rc=0: ENSAIO VERDE: … prefixadas=[] … ausentes=[20261011000005,20261011000004] · smokes=[] · evidencia=- · 850 ms
p49_revisao_por_analise_smoke tratamento rc=0: ENSAIO VERDE: … prefixadas=[20261011000005] … evidencia=gap:pontuar_sjt=…
p49_analise_vigente_smoke controle rc=0: ENSAIO VERDE: … prefixadas=[] … · 507 ms
p49_analise_vigente_smoke tratamento rc=0: ENSAIO VERDE: … prefixadas=[20261011000005] … evidencia=gap:pontuar_sjt=a633…
```

**Verify 3 — Vitest (entrevista + funil: 13 arquivos, 154 testes verdes) e o delta**
```
pre-existentes (falham na base e em HEAD) (2):
  - src/__tests__/promessasComExecutor.test.ts > Deferimento com prazo: a fase dona é conferida contra o roadmap, …
  - src/__tests__/promessasComExecutor.test.ts > Metade 1 — o registro curado: toda promessa nomeada tem executor provado no disco …
vitest delta: base=0d70ac7 2725/2 · head=7de0b61 3100/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok
```

**Verify 4:** `lint exit=2 tsc errors=89` (≤ 89) · `TIPOGRAFIA OK (113 linhas acrescentadas varridas)` · build verde.

## TDD Gate Compliance (Task 2, tdd="true")

- **RED** `a9a0127b` — `competencias-padrao-servidor.test.ts` antes do `export`. Rodado com `NO_COLOR=1 npx vitest run … --reporter=tap-flat` (exit 1); alvo «a lista da linha marcadora da migration é DEFAULT_COMPETENCIAS (mesmos nomes, mesma ordem)» falhou com `AssertionError: expected 'Experiência UAU | Inovação | Atitude …' to be undefined`. `gsd-tools check tdd-red-evidence` → `RED_EVIDENCE_OK` (`target_test_failed`, `report_errors: []`). **semanticAssessment:** o alvo executou e falhou na asserção planejada (a lista exportada = o espelho da migration) pelo motivo planejado (a constante ainda não era exportada → `undefined`); a falha secundária do caso 3 (TypeError ao indexar `undefined`) decorre da mesma ausência.
- **GREEN** `7de0b61f` — `export const DEFAULT_COMPETENCIAS` + comentário; 3/3 verdes.
- **REFACTOR:** nenhum.
- As cláusulas (e)–(m) do smoke testam a migration escrita no tracer, então nascem verdes; a prova de que mordem é a das mutações G1–G7 (cada uma remove a regra e a cláusula reprova).

## Files Created/Modified

- `scripts/geradores/gen-p52-gap.cjs` — gerador (captura, troca ancorada, conferir, auto-teste)
- `scripts/geradores/pontuar_sjt_vivo_v2.plpgsql`, `scripts/geradores/salvar_avaliacao_entrevista4_vivo.plpgsql` — corpos vivos (o desfazer)
- `supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql` — migration GERADA (não aplicada)
- `supabase/tests/p52_gap_servidor_smoke.sql` — smoke52g (a)–(m)
- `scripts/p52_ensaio.cjs` — MIGS (0005 antes da 0004), par 52g, reset no PREFIXO, comentário
- `scripts/p52_mutacoes.cjs` — linha SMOKES do 52g, G1–G7, `exigePrefixadas` no 52b, `aposentar()`
- `src/features/entrevista/components/EntrevistaScorecardInline.tsx` — `export` + comentário
- `src/features/entrevista/__tests__/competencias-padrao-servidor.test.ts` — guarda do espelho
- `src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts`, `src/features/entrevista/__tests__/entrevista-contract.test.ts` — recusas novas sem eco
- `.planning/phases/52-hub-do-rh-dados-e-contato/52-APLICACOES.json` — instantes dos applies 0001..0003

## Residuais (marcados para o `52-SECURITY.md`)

1. **`supabase/tests/p50_desfazer_expansao.sql`** (decidido no `<context>` do plano; o arquivo FICA): as duas constantes `c_fp` (:50 e :1553) fixam `fn:public.salvar_avaliacao_entrevista(uuid,jsonb,text)` = `ce0641415cb7746f1906d20717828901` e `fn:public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` = `83aa5e19d933daa802b1d4b348df7be7` (conferido nesta execução). Depois da 0005 o desfazer da Phase 50 RECUSA (a impressão da primária muda) — comportamento certo para um desfazer que só roda sobre o estado que conhece —, e o corpo que ele recriaria é anterior ao F13 (é também o único arquivo fora do gerador que ainda cita `'scores_humanos sem notas numericas entre 1 e 5'`). **Rodar o `p50_desfazer_expansao.sql` depois da 52 exige reescrever a impressão e reaplicar o F13.**
2. **`supabase/tests/p50_acesso_recrutador_smoke.sql`** — VERMELHO por motivo anterior, fora deste portão; medido agora: `ENSAIO VERMELHO: P50C FAIL (i): [sem_sonda:ler_contexto_rejeicao_triagem_revisao/1,sem_sonda:ler_devolutiva_bigfive_rh/1,sem_sonda:ler_sjt_mc_rh/1]: 23 funcao(oes) no conjunto por forma …` (as 3 RPCs do bloco B sem sonda). Backlog.

## Para o revisor (52-REVIEW-GAP-1) — pontos que a sessão A deixou à vista

- **Nome vazio `''`** entra no conjunto (elemento sem `competencia`/`competency` string), como na tela (`normalizeCompetencia` devolve `''`, e o filtro `typeof c.competencia === 'string'` o mantém). **Elemento JSON `null`** em `competencias`: o servidor o conta como `''`; o cliente quebraria em `normalizeCompetencia(null)` — a EF nunca grava `null`, mas é uma assimetria. **Nomes repetidos**: DISTINCT no servidor; na tela, uma nota cobre as duas linhas homônimas (estado chaveado pelo nome).
- `competencias` não-array (objeto): servidor → conjunto vazio → os 4 nomes padrão. O cliente passa só array pelo `normalizeCompetencia`; com objeto, a tela não chegaria a renderizar a lista.
- (P3) é equivalente ao texto depois de (P2) — fica por pedido do operador; nenhuma mutação a isola (registrado no cabeçalho).
- O número 0005 antes da 0004 está no cabeçalho, no comentário do `MIGS` e no `<context>` do plano.

## Decisions Made

Ver `key-decisions` no frontmatter. Em resumo: CASE no predicado da nota (ordem de avaliação garantida); fixture de entrevista sem mover a candidatura; RED/GREEN separados na Task 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Predicado numérico da nota em CASE, não em AND**
- **Found during:** Task 1 (S2)
- **Issue:** o plano pedia o predicado do corpo vivo (`kv.v ~ … AND kv.v::numeric BETWEEN 1 AND 5`). O Postgres não garante a ordem de avaliação de um AND; para o valor `"x"` da cláusula (j) o cast poderia rodar primeiro e levantar 22P02 sem rótulo em vez do 23514 'scores_humanos incompleto'.
- **Fix:** `CASE WHEN kv.v ~ '^[0-9]+(\.[0-9]+)?$' THEN kv.v::numeric BETWEEN 1 AND 5 ELSE false END` (mesma aceitação), nas duas leituras (falta e média). Documentado no gerador.
- **Verification:** smoke52g (j) com `"x"` → 23514 incompleto.
- **Committed in:** `170f7da4`

**2. [Plano ambíguo → leitura conservadora] As cláusulas de entrevista não movem a candidatura**
- **Found during:** Task 1 (smoke)
- **Issue:** o texto do Passo 2 descreve a candidatura levada à vaga descartável e as análises inseridas «na mesma subtransação»; a `salvar_avaliacao_entrevista` só exige a análise ser DA candidatura (JOIN com `candidaturas` e `vagas` reais).
- **Fix:** só as cláusulas SJT ((a),(b),(e)–(h)) movem a candidatura; as de entrevista ((c),(d),(i)–(m)) só inserem a análise de fixture. Menos gatilhos dentro do envelope; todas revertem por `P52G1` e o smoke confere depois de cada uma que nada ficou (`p52g_reverteu`).
- **Committed in:** `2950c061`, `77ac8a67`

**3. [TDD] Commit da guarda do espelho partido em RED + GREEN**
- O plano tinha um commit `test(52-26): guarda do espelho … (com o export e o comentário)`; virou `a9a0127b` test (RED) + `7de0b61f` feat (GREEN) para a disciplina RED antes de GREEN.

**4. [Harness de evidência] A primeira asserção da guarda compara uma string sem aspas**
- O reporter TAP do Vitest emite YAML inválido quando o valor afirmado contém aspas duplas (`\\"` fecha a string), e o classificador de RED recusou (`Malformed TAP`). A guarda compara primeiro `nomes.join(' | ')` e depois `toEqual` estrutural — mesma semântica.

**5. [Forma] Cabeçalho da migration em ASCII**, como o da 0003 (`gen-sjt-v2.py`): «GERADO, NAO TRANSCRITO», «SUBSTITUI DUAS FUNCOES VIVAS». Nenhum portão casa o texto acentuado.

**6. [Robustez] (a) e (h) recusam entrada que não exercita a caixa** (`P52G FAIL (a|h): … nao tem letra`) — um uuid só de dígitos tornaria a cláusula uma duplicata comum.

---

**Total deviations:** 6 (1 Rule 1; 5 de forma/leitura, sem mudança de escopo). **Impact:** nenhuma promessa do plano mudou; a 1 fecha um 22P02 alcançável.

## Issues Encountered

- O classificador de RED recusou o TAP do Vitest duas vezes (YAML com aspas escapadas); resolvido mudando a forma da primeira asserção (desvio 4).

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova: nenhum endpoint, caminho de auth ou ACL novo; as duas funções mantêm assinatura, propriedades, ACL e comentário (conferidos no POS e de novo, só leitura, no verify 1 da Task 4: `anon` EXECUTE em `pontuar_sjt` = true, em `salvar4` = false, como antes). As mitigações T-52-82..T-52-88 do registro do plano estão implementadas e provadas em PROD (Task 4, Passos 1–2).

**Residuais para o futuro `52-SECURITY.md`** (IN-05 dos reviews 52-REVIEW-GAP-1/-2; IDs de ameaça: os antigos T-52-77/78 do 52-18 são hoje T-52-93/94, commit `d1c06bca`; o maior ID em uso é **T-52-94**. Um ID novo para estes residuais, se o `52-SECURITY.md` os registrar como ameaça, começa em T-52-95):

| Flag | File | Description | Dono |
|------|------|-------------|------|
| residual: impressão digital constante | `supabase/tests/p50_desfazer_expansao.sql` (:50 e :1553, constantes `c_fp`) | Fixa `fn:public.salvar_avaliacao_entrevista(uuid,jsonb,text)` = `ce0641415cb7746f1906d20717828901` e `fn:public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` = `83aa5e19d933daa802b1d4b348df7be7`. Depois da 0005 (no ar desde 2026-10-11T22:51:48Z) o desfazer da Phase 50 RECUSA (falha fechado), e o corpo que ele recriaria é anterior ao F13. **Rodar o `p50_desfazer_expansao.sql` depois da 52 exige reescrever a impressão e reaplicar o F13.** | operador |
| residual aceito (52-REVIEW-GAP-2 WR-01, `52-26-DECISAO.md`) | `src/features/entrevista/services/entrevistaService.ts` (`normalizeCompetencia`), `src/features/entrevista/components/EntrevistaScorecardInline.tsx` (`competenciasDoScorecard`), `supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql` (CASE do F13) | A guarda cliente × servidor da normalização fixa os ramos de tipo, vazio e precedência, mas não o tratamento de espaços (um `trim` de um lado só passa verde). Regra: **«mudar `normalizeCompetencia`/`competenciasDoScorecard` ou o CASE da 0005 exige mudar os dois e regenerar»** (o servidor por migration NOVA, pelo gerador). | operador (Fernando) |
| residual (backlog) | `supabase/tests/p50_acesso_recrutador_smoke.sql` | Vermelho por motivo anterior (`P50C FAIL (i)`, as 3 RPCs do bloco B sem sonda); fora deste portão. | backlog |

## Estado ao parar (para a sessão B)

- HEAD `7de0b61f839f677b896b213ee79907e0b7de9e66` (+ o commit deste SUMMARY); `refs/gsd/52-18/sha` = `c3e04a717c9338387160a7dc03d2e74e2f4133c7`; `refs/gsd/52-26/sha` NÃO criado (é a Passo 0 da Task 4).
- PROD intocado: ledger p52 = 0001..0003; md5 vivos = os `ANTES_*`. Nenhum push; nenhum STATE/ROADMAP tocado.
- Próximo: Task 3 — o orquestrador roda o review adversarial (`52-REVIEW-GAP-1.md`, base `refs/gsd/52-18/sha`); o operador confirma POR ESCRITO a janela única (e decide os WR, se houver). Depois a Task 4 (apply pelo portão, `52-APLICACOES.json` da 0005 por máquina, provas em PROD, push que leva `8fa8193a`/`e9dfc369`).

## Self-Check: PASSED

- 8/8 arquivos criados presentes; 9/9 commits (os 8 de código + o do SUMMARY `278db72f`) ancestrais do HEAD.
- PROD intocado, lido depois do SUMMARY (só leitura): ledger p52 = `[20261011000001, 20261011000002, 20261011000003]`; `pontuar_sjt` = `66fe507f…`; primária `salvar_avaliacao_entrevista` = `070e0f1b…`.
- Sem push: `origin/main` = `c3e04a71`; local à frente por 18 commits (os só-`.planning/` do 52-18 e da replanificação + os desta sessão — sobem no push da Task 4).
- `STATE.md`/`ROADMAP.md`: 0 alterações desde `d1c06bca`.

## Rodada de conserto — WR-01 (52-REVIEW-GAP-1)

Decisão: `52-26-DECISAO-RODADA-1.md` (`9492b661`), «consertar agora». O defeito: a regra de
`normalizeCompetencia` (cliente) estava copiada no CASE da 0005 (servidor) sem guarda em nenhum dos
lados, e a mutação do revisor em dois ramos do CASE deixava o smoke52g 13/13. **O corpo da 0005 não
mudou**: `GERADO = ARQUIVO: 036d9d454c91042d51313c3184e73019` (o mesmo md5 de antes).

**Contagem nova: smoke52g = 14 cláusulas (a)–(n), `esperado` 14 num único literal; mutações G1–G9.**

### Commits (medido: `git rev-list --count 9492b661..1b839a73` = 5, mais o deste SUMMARY)

| Commit | O quê |
|---|---|
| `0187b7af` | `test(52-26)`: cláusula (n) do smoke52g. Fixture `[{"competencia":"","competency":"A"},{"competencia":7,"competency":"B"},{"competencia":"C","competency":"X"},{"competency":9},{}]`, conjunto esperado `{A, B, C, ''}`. Sem a chave `''` a recusa é `23514` com o rótulo `scores_humanos incompleto: 1 de 4 competencia(s)`; o SQLSTATE, o rótulo E a cardinalidade são conferidos. `{"A":4,"B":4,"C":4,"":4}` grava 4.00, `concluida`, linha `entrevista` 4.00. Mesma disciplina de fixture: subtransação revertida por `P52G1`, `p52g_reverteu('n')`, nenhum uuid literal, a candidatura fica onde está. Também `esperado` 13 → 14 e o cabeçalho (lista de cláusulas, «Hoje: 14 — a … n», «G8/G9 → (n)») |
| `23161ca0` | `test(52-26)`: as mutações G8 (`AND length(e->>'competencia') > 0` retirado) e G9 (`WHEN jsonb_typeof(e->'competency') = 'string'` → `WHEN e ? 'competency'`). São duas entradas, para cada ramo provar a mordida sozinho. As duas usam a letra `n` e trocam um alvo literal único no texto GERADO |
| `8f625cde` | `test(52-26)` (RED): `src/features/entrevista/__tests__/competencias-normalizacao-servidor.test.ts`. Mesmo fixture, mesmo conjunto `{A, B, C, ''}`, passando por `normalizeCompetencia` e pelo filtro do scorecard. Confere que o smoke52g traz o MESMO fixture e a MESMA avaliação completa, uma vez cada. Mordida: os ramos G8/G9, mutados no cliente, mudam o conjunto |
| `5f091c8d` | `feat(52-26)` (GREEN): `normalizeCompetencia` exportado, sem mudar comportamento, com o aviso do espelho. O filtro do `useMemo` do scorecard foi extraído para `competenciasDoScorecard`, com a mesma regra, e o `useMemo` passou a chamá-lo |
| `1b839a73` | `docs(52-26)`: o contrato vivo do `52-26-PLAN.md` acompanha a contagem (ver «Desvio» abaixo) |

### TDD

- **RED** (`8f625cde`): `NO_COLOR=1 npx vitest run src/features/entrevista/__tests__/competencias-normalizacao-servidor.test.ts --reporter=tap-flat`, exit 1, `1..4`, 3 `not ok` e 1 `ok`. O teste-alvo («o fixture da cláusula (n) vira exatamente o conjunto {A, B, C, ''}») falha na ASSERÇÃO `normalizeCompetencia exportado pelo service: expected undefined to be type of 'function'`. O classificador `check tdd-red-evidence` deu `RED_EVIDENCE_OK` (`target_test_failed`, tests 4, pass 1, fail 3). Avaliação semântica: o alvo rodou e falhou pelo motivo planejado, a regra não exportada. Não foi erro de import nem de coleta. O teste que passou no RED é o de amarração ao smoke, que já trazia o fixture desde `0187b7af`.
- **GREEN** (`5f091c8d`): o arquivo novo passa 4/4; `src/features/entrevista` + funil dão `Test Files 14 passed (14) · Tests 158 passed (158)`.

### Evidência (linhas inteiras)

- `node scripts/geradores/gen-p52-gap.cjs --conferir` → `GERADO = ARQUIVO: 036d9d454c91042d51313c3184e73019` (rc 0)
- `node scripts/geradores/gen-p52-gap.cjs --auto-teste` → `GEN-P52-GAP AUTO-TESTE OK: 11/11` (rc 0)
- Ensaio com a 0005 prefixada (verify da Task 2, já com 14/14), rc 0:
  `ENSAIO VERDE: supabase/tests/p52_gap_servidor_smoke.sql · prefixadas=[20261011000005] · aplicadas=[20261011000001,20261011000002,20261011000003] · ausentes=[20261011000004] · smokes=[52g=14/14] · evidencia=gap:pontuar_sjt=a63375bdb58b0bd01343081562b43a85,salvar4=d2d3bc1ddebf59b7896de59608daf45a,salvar3=igual 52g.escopo=cargo:editor-video,bateria:6 52g.a=22023:dup 52g.b=11/24 52g.c=23514:incompleto 52g.d=4.00 52g.e=22023:malformada 52g.f=22023:malformada 52g.g=22023:malformadax3 52g.h=maiusculas:11/24 52g.i=23514:fora 52g.j=23514:incompletox3 52g.k=23514:objetox2 52g.l=salvar3:23514+4.00 52g.m=padrao:23514+4.00 52g.n=normalizacao:23514(1/4)+4.00 · 916 ms`
- Smoke contra o vivo SEM a 0005. Continua mordendo o WR-04 na (a), como antes (rc 1):
  `ENSAIO VERMELHO: P52G FAIL (a): a mesma pergunta em caixa diferente devolveu [ACEITO] e gravou 1 linha(s) SJT mc — esperado 22023 resposta duplicada e nada gravado (882 ms)`
- A mutação do revisor (`…/scratchpad/rev/mut_norm.sql`, via `--mutacao=`), que antes saía `52g=13/13` VERDE, agora sai VERMELHA (rc 1):
  `ENSAIO VERMELHO: P52G FAIL (n): o conjunto {A, B, C, vazio} sem a chave vazia devolveu [23514:scores_humanos incompleto: 2 de 4 competencia(s) da analise sem nota de 1 a 5] e com as 4 chaves [23514:scores_humanos incompleto: 1 de 4 competencia(s) da analise sem nota de 1 a 5] (status pendente_humano, score nenhum) — esperado 23514 scores_humanos incompleto: 1 de 4, depois 4.00 concluida (553 ms)`
- `node scripts/p52_mutacoes.cjs` (rodada completa, rc 0). Saem impressas `APOSENTADA: B1` … `APOSENTADA: B6` (`… so roda com 20261011000003 prefixada, e 20261011000003 esta no ledger desde o apply`); `CONTROLE verde (…p52_leituras_rh_smoke.sql): par 52l=20/20`; `CONTROLE verde (…p52_gap_servidor_smoke.sql): par 52g=14/14`; L1–L8 e G1–G7 mordem nas mesmas letras de antes. As linhas novas:
  `G8 morde: salvar_avaliacao_entrevista: a normalizacao aceita competencia string vazia (sem o length > 0) -> P52G FAIL (n) (607 ms)`
  `G9 morde: salvar_avaliacao_entrevista: a normalizacao aceita competency de qualquer tipo (e ? 'competency') -> P52G FAIL (n) (856 ms)`
  `leitura so-leitura igual a baseline: ledger=["20261011000001","20261011000002","20261011000003"] funcoes=7 mutacoes_p52=0 fixtures_p52={"users":0,"candidatos":0}`
  `MUTACOES: 17/17 mordem; controle verde; nada persistiu (aposentadas: B1,B2,B3,B4,B5,B6)`
  O verify da Task 2, com o laço `G1 … G9`, saiu rc 0.
- Regressões p49, com e sem a 0005 (verify da Task 2), rc 0:
  `p49_revisao_por_analise_smoke controle rc=0: ENSAIO VERDE: … prefixadas=[] · aplicadas=[20261011000001,20261011000002,20261011000003] · ausentes=[20261011000005,20261011000004] · smokes=[] · evidencia=- · 560 ms`
  `p49_revisao_por_analise_smoke tratamento rc=0: ENSAIO VERDE: … prefixadas=[20261011000005] · …`
  `p49_analise_vigente_smoke controle rc=0: ENSAIO VERDE: … prefixadas=[] · … · 926 ms`
  `p49_analise_vigente_smoke tratamento rc=0: ENSAIO VERDE: … prefixadas=[20261011000005] · …`
- `node scripts/p52_vitest_delta.cjs` (rc 0; o regex do verify da Task 2 casa):
  `vitest delta: base=0d70ac7 2725/2 · head=1b839a7 3104/2 · pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok`
  O HEAD foi de 3100 (sessão A, `7de0b61`) para **3104 testes**. Os +4 são os testes de `competencias-normalizacao-servidor.test.ts`:
  - «o fixture da cláusula (n) vira exatamente o conjunto {A, B, C, ''}»;
  - «a avaliação completa da cláusula (n) tem exatamente as chaves do conjunto»;
  - «o smoke52g traz o MESMO fixture e a MESMA avaliação completa (uma vez cada)»;
  - «a guarda morde: …».

  `novas=0` conta falhas novas, não testes novos. As 2 pré-existentes são as mesmas da sessão A (`promessasComExecutor.test.ts`).
- `lint exit=2 tsc errors=89` (≤ 89) · `TIPOGRAFIA OK (129 linhas acrescentadas varridas)` (scorecard) · `npm run build` verde → `lint, tipografia e build verdes`. A tipografia do service e do teste novo também saiu OK (8 linhas).

### Desvio

**1. [Escopo dirigido pelo orquestrador] O contrato vivo do `52-26-PLAN.md` passou para 14/14 e G1–G9** (`1b839a73`)
- **Motivo:** o despacho manda atualizar a contagem «everywhere it is declared/checked». Sem isso, o verify pós-apply da Task 4 (`grep 'smokes=\[52g=13/13\]'`, `--so=G1..G7`, `MUTACOES: 7/7`) reprovaria trabalho correto depois da escrita em PROD. É a forma «contagem contra constante» do CLAUDE.md.
- **O que mudou:** as truths das linhas 38 e 40, o `provides` da linha 51, os verify das Tasks 2 e 4, o `fails_when`, os critérios, a Passo 0b, os itens da UAT, a lista de saída e o resumo das linhas 428 e 430.
- **O que ficou como está:** os nomes de commit, a descrição histórica da Task 2 (o `<name>`, o «Runner … G1–G7», a linha 99, a 296 e a 451) e o frontmatter deste SUMMARY. Registram o que a sessão A fez.
- O plano está sob o portão (6) do `p52_portao.cjs`, que exige que ele não mude depois do `reviewed_head`. O review novo `52-REVIEW-GAP-2` cobre esta mudança.
- **Varredura pela forma:** `grep -rnE "52g=13|13/13|G1[–-]G7|G1,G2,…,G7|7/7 mordem|13 cl[aá]usula|Hoje: 13|'13'"` em `scripts`, `supabase/tests`, `src` e no plano. O `p52_ensaio.cjs` não fixa contagem, porque lê `smoke52g.esperado` na execução. Os `13` de `p50_acesso_recrutador_smoke.sql` e `p49_trilha_smoke.sql` são de outros smokes. Nada mais fixava 13 nem G1–G7.

### Estado

- PROD intocado. A leitura só-leitura do runner, depois do laço, deu ledger p52 = `0001..0003` e `mutacoes_p52=0`.
- Não houve push (`origin/main` = `c3e04a71`), nem apply, nem deploy. `STATE.md`/`ROADMAP.md` não foram tocados.
- Próximo: o orquestrador roda o review `52-REVIEW-GAP-2`; depois, a Task 3 de novo e a Task 4.

## Sessão B — Task 3 e Task 4 (apply feito; PARADA no push)

### Task 3 (re-medida no início da sessão B, 2026-10-11T22:51:20Z)

```
PORTAO OK: revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-GAP-2.md reviewed_head=c1daf9b8b9430539e55d239b92bce15f9d1346ae pin=- modo=revisao
decisao do gap: aplicar sobre 52-REVIEW-GAP-2.md (warnings=1)
```
Caminho que valeu para o conteúdo: a autorização de 2026-10-11 mais a resposta do operador a cada WR (`52-26-DECISAO.md`, `87cfe0ea`): GAP-1 WR-01 «Consertar agora»; GAP-2 WR-01 «Aceitar como residual» (em «Threat Flags»). Janela única: «Janela única: confirmo». INFOs IN-01..IN-08 do -2 registradas no review, sem disposição exigida. **IN-08:** as linhas 255, 265 e 449 do `52-26-PLAN.md` (o `fails_when` e o critério da Task 2, a tabela de artefatos: «(a)–(m)», «G1 … G7») ficaram como texto HISTÓRICO, como as já listadas no «Desvio» da rodada WR-01. Nenhum `<automated>` as lê, e o plano não foi tocado (portão (6)).

Pré-condições (só leitura): `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` vazio; ledger p52 = `[0001, 0002, 0003]` (sem a 0005); md5 vivos = `ANTES_*` (`66fe507f…`, `070e0f1b…`, `924dfb99…`).

### Passo 0 — pin

`refs/gsd/52-26/sha` = `87cfe0ea503f5b7e3c16f91ff53cff5c5f680342` (= HEAD no instante). Nenhum commit entre o pin e o apply.

### Passo 0b — re-medição (22:51:33Z → 22:51:35Z)

```
GERADO = ARQUIVO: 036d9d454c91042d51313c3184e73019
ENSAIO VERDE: supabase/tests/p52_gap_servidor_smoke.sql · prefixadas=[20261011000005] · aplicadas=[20261011000001,20261011000002,20261011000003] · ausentes=[20261011000004] · smokes=[52g=14/14] · evidencia=gap:pontuar_sjt=a63375bdb58b0bd01343081562b43a85,salvar4=d2d3bc1ddebf59b7896de59608daf45a,salvar3=igual 52g.escopo=cargo:editor-video,bateria:6 52g.a=22023:dup 52g.b=11/24 52g.c=23514:incompleto 52g.d=4.00 52g.e=22023:malformada 52g.f=22023:malformada 52g.g=22023:malformadax3 52g.h=maiusculas:11/24 52g.i=23514:fora 52g.j=23514:incompletox3 52g.k=23514:objetox2 52g.l=salvar3:23514+4.00 52g.m=padrao:23514+4.00 52g.n=normalizacao:23514(1/4)+4.00 · 560 ms
```

### Passo 1 — apply e o instante, um comando só (22:51:45Z → 22:51:47Z no relógio local, rc 0)

```
PORTAO OK: revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-GAP-2.md reviewed_head=c1daf9b8b9430539e55d239b92bce15f9d1346ae pin=87cfe0ea503f5b7e3c16f91ff53cff5c5f680342 modo=apply
registro: 20261011000005 aplicado_ate 2026-10-11T22:51:48Z

── 20261011000005_p52_sjt_uuid_e_nota_completa.sql
   version : 20261011000005
   name    : p52_sjt_uuid_e_nota_completa
   octetos : 30946
   md5     : 036d9d454c91042d51313c3184e73019
   ✅ aplicada e escriturada — md5 do ledger BATE (30946 octetos)
```
O `aplicado_ate` (22:51:48Z, o `now()` do servidor arredondado para cima) fica 1 s depois do fim do comando no relógio local (22:51:47Z). A diferença é o arredondamento e o relógio, e fica do lado seguro, posterior ao COMMIT (IN-07, as duas fontes de relógio). Registro commitado: `ef5d9b07` `docs(52-26): instante do apply da 20261011000005 (D-41 emendada, condicao 1)`.

### Passo 2 — provas em PROD

Verify 1 (só leitura), rc 0:
```
gap em PROD: ledger = arquivo; pontuar_sjt=a63375bd salvar4=d2d3bc1d salvar3 intocada; ACL de anon igual; registro cobre 4 versoes p52
```
Verify 2 (ensaio que aborta, contra o VIVO), rc 0:
```
ENSAIO VERDE: supabase/tests/p52_gap_servidor_smoke.sql · prefixadas=[] · aplicadas=[20261011000001,20261011000002,20261011000003,20261011000005] · ausentes=[20261011000004] · smokes=[52g=14/14] · evidencia=52g.escopo=cargo:editor-video,bateria:6 52g.a=22023:dup 52g.b=11/24 52g.c=23514:incompleto 52g.d=4.00 52g.e=22023:malformada 52g.f=22023:malformada 52g.g=22023:malformadax3 52g.h=maiusculas:11/24 52g.i=23514:fora 52g.j=23514:incompletox3 52g.k=23514:objetox2 52g.l=salvar3:23514+4.00 52g.m=padrao:23514+4.00 52g.n=normalizacao:23514(1/4)+4.00 · 767 ms
APOSENTADA: B1 … B6 — supabase/tests/p52_banco_sjt_smoke.sql so roda com 20261011000003 prefixada, e 20261011000003 esta no ledger desde o apply
modo: pos-apply (sem migracoes) prefixadas=[]
CONTROLE verde (supabase/tests/p52_gap_servidor_smoke.sql): par 52g=14/14 (1185 ms)
G1 morde … -> P52G FAIL (a) · G2 morde … (a) · G3 morde … (e) · G4 morde … (c) · G5 morde … (i) · G6 morde … (m) · G7 morde … (d) · G8 morde … (n) · G9 morde … (n)
leitura so-leitura igual a baseline: ledger=["20261011000001","20261011000002","20261011000003","20261011000005"] funcoes=7 mutacoes_p52=0 fixtures_p52={"users":0,"candidatos":0}
MUTACOES: 9/9 mordem; controle verde; nada persistiu (so=G1,G2,G3,G4,G5,G6,G7,G8,G9) (pos-apply) (aposentadas: B1,B2,B3,B4,B5,B6)
```
Antes do apply, o smoke contra o vivo saía `P52G FAIL (a)` (sessão A). Agora sai 14/14 com `prefixadas=[]`, e essa virada é a prova de que o vivo é o corpo novo.

### Passo 3 — PARADA: `COMMIT ALHEIO: PARAR` (22:52:44Z → 22:52:49Z, rc 1, NADA empurrado)

`S=ef5d9b07d0e2febf29abfbddcccd76ce15f17811` · `R=c3e04a717c9338387160a7dc03d2e74e2f4133c7`. O `p52_portao --modo push` saiu `PORTAO OK: … pin=87cfe0ea… modo=push ledger=[20261011000001,20261011000002,20261011000003,20261011000005]`, e `R = origin/main` e `R` é ancestral de `S`. A enumeração deu 30 commits: 8fa8193a, e9dfc369 e todos os só-`.planning/` como `planning`, e os código 170f7da4…7de0b61f, 0187b7af e 23161ca0 como `codigo`. Dois saíram ALHEIO:

```
8f625cdefb9854b4d164655a25b6dacc8643d61d ALHEIO[fora da lista: src/features/entrevista/__tests__/competencias-normalizacao-servidor.test.ts] test(52-26): guarda da normalizacao das competencias cliente x servidor — mesmo fixture, mesmo conjunto {A, B, C, ''} (RED, WR-01)
5f091c8df6c3659f4fe448e3783cbdd7f033f2c0 ALHEIO[fora da lista: src/features/entrevista/services/entrevistaService.ts] feat(52-26): normalizeCompetencia exportado e o filtro do scorecard em competenciasDoScorecard, com o aviso do espelho no servidor (GREEN, WR-01)
COMMIT ALHEIO: PARAR
```
Depois da parada: `git ls-remote origin refs/heads/main` = `c3e04a71`; local à frente por 30.

**Causa (medida, sem nenhuma sonda reescrita):** o `--caminhos` do «Comando de push» é uma lista LITERAL escrita no planejamento, antes da rodada WR-01. Os dois caminhos nasceram nessa rodada, decidida pelo operador («consertar agora»). Os dois estão no `files_reviewed_list` do `52-REVIEW-GAP-2`, e os dois commits são ancestrais do pin `87cfe0ea` e posteriores à base `c3e04a71`. O `1b839a73` atualizou as contagens (14/14, G1–G9), mas não essa lista, e o review -2 (ponto 10) não pegou isso. É a forma «iteração sobre lista literal» do CLAUDE.md. Aqui ela falha FECHADA: recusa, em vez de deixar passar.

**PROD × front:** não há sintoma de dois canais. O código de produção que falta subir é neutro de comportamento: o `export` de `normalizeCompetencia` e de `DEFAULT_COMPETENCIAS`, comentários, e o filtro do `useMemo` extraído para `competenciasDoScorecard` com a mesma regra. Por isso o front no ar (`c3e04a71`) já renderiza e exige notado exatamente o conjunto que a 0005 exige. Sem `db:types`, sem EF, sem marcador de tela.

**Passo 4 (terceiro verify) NÃO rodado**, porque depende do push.

### Passo 3 — retomado pelo orquestrador (decisão do operador, `52-26-DECISAO-PUSH.md`, commit 29f34756)

Opção «A — corrigir o plano + review -3» escolhida primeiro e RETIRADA antes de qualquer commit: o portão no modo
push exige `reviewed_head` ancestral do pin (regra 5) e o plano igual entre o `reviewed_head` e o HEAD (regra 6);
plano editado depois do pin não passa nas duas sem mover o pin. Escolhida então a «B — rodar uma vez com
autorização escrita»: o comando do plano byte a byte, com o regex de `--caminhos` acrescido de
`competencias-normalizacao-servidor` (no grupo dos testes de entrevista) e de
`src/features/entrevista/services/entrevistaService\.ts$`; o plano NÃO mudou. O comando exato está no
`52-26-DECISAO-PUSH.md`.

`S=29f34756903cd61eb6579086c724b47ca8a8843b` · `R=c3e04a717c9338387160a7dc03d2e74e2f4133c7` · rc 0:

```
PORTAO OK: revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-GAP-2.md reviewed_head=c1daf9b8b9430539e55d239b92bce15f9d1346ae pin=87cfe0ea503f5b7e3c16f91ff53cff5c5f680342 modo=push ledger=[20261011000001,20261011000002,20261011000003,20261011000005]
enumeracao ok: 32 commit(s) em c3e04a71..29f34756 · codigo coberto por 52-REVIEW-GAP-2.md (reviewed_head c1daf9b8) · codigo contido no apply 87cfe0ea
   c3e04a71..29f34756  29f34756903cd61eb6579086c724b47ca8a8843b -> main
```

Na enumeração: `8fa8193a` e `e9dfc369` = `planning`; `8f625cde` e `5f091c8d` = `codigo`; 0 commit `ALHEIO[` (a
única ocorrência da palavra é o assunto do commit 2a0e66b2).

### Passo 4 — terceiro verify

```
origin/main = HEAD; 8fa8193a e e9dfc369 no remoto; nada local
```

O commit deste trecho do SUMMARY (e o do STATE/ROADMAP) é só `.planning/` e reabre `origin/main..HEAD`; sobe no
próximo push, como o plano prevê.

### Para a UAT da 52 (vale assim que o push sair; a UAT testa a `pontuar_sjt` FINAL, já no ar)

1. Antes de começar, a conferência só leitura `node p46apply.cjs sql "set transaction read only; select md5(prosrc) from pg_proc where oid = to_regprocedure('public.pontuar_sjt(uuid,jsonb)')"` tem de dar `a63375bdb58b0bd01343081562b43a85` (`pontuar_sjt_prosrc_md5_novo` do cabeçalho da 0005).
2. A conta de teste conclui o SJT de múltipla escolha na Consultor `fdbe1a4a` (pré-vendas, 6 itens) e na Social Media `e897f709`, até «Tudo concluído». O hub do RH mostra a situação, as alternativas em ordem neutra e a escolhida (JORN-57).
3. Na avaliação da entrevista, «Salvar avaliação» só habilita com todas as competências notadas, e salva («Avaliação salva.»).
4. O que a UAT NÃO precisa provar: o payload forjado (duplicata em outra caixa, uuid malformado) e o scorecard incompleto por RPC à mão. Isso está provado pelo smoke52g contra o vivo e pelas mutações G1–G9 em `--pos-apply` (acima).
5. O item herdado do 52-18 («SJT aberto durante um apply → recarregar a página») não se aplica a esta 0005, que não muda ids.

Próximo passo: UAT da Phase 52 (`/gsd-verify-work 52`). Depois vem o 52-19, que só começa com um backup diário COMPLETED posterior a **2026-10-11T22:51:48Z** (D-41 emendada, condição 1). Na prática, o backup da manhã seguinte.

O commit deste SUMMARY é só `.planning/`. Ele entra no intervalo `origin/main..HEAD` e sobe no mesmo push quando a parada for resolvida (a enumeração o classifica como `planning`).

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Sessão A concluída: 2026-10-11 · Sessão B: apply 2026-10-11T22:51:48Z; push 29f34756 (decisão do operador, opção B)*
