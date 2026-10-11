---
phase: 52-hub-do-rh-dados-e-contato
plan: 26
subsystem: database
tags: [postgres, plpgsql, supabase, pontuar_sjt, salvar_avaliacao_entrevista, migration-gerada, smoke, mutacoes, vitest]
status: halted
halted_reason: "Sessão A (Tasks 1–2) concluída; parada DESENHADA no checkpoint da Task 3 (checkpoint:decision, gate=blocking-human): review adversarial 52-REVIEW-GAP-1 pelo orquestrador + confirmação escrita de janela única pelo operador. Tasks 3–4 (decisão, apply, provas em PROD, push) ficam para a sessão B."

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
    description: "A 0005 em PROD, provada contra o vivo, e o push — Tasks 3–4 (sessão B), atrás do review e da janela única"
    verification: []
    human_judgment: true
    rationale: "Não executado nesta sessão por desenho: checkpoint blocking-human (review adversarial + confirmação escrita do operador) antes de qualquer escrita em PROD"

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

Nenhum: nenhum endpoint, caminho de auth ou ACL novo; as duas funções mantêm assinatura, propriedades, ACL e comentário (conferidos no POS). As mitigações T-52-82..T-52-88 do registro do plano estão implementadas no texto e provadas no ensaio; as provas em PROD são da Task 4.

## Estado ao parar (para a sessão B)

- HEAD `7de0b61f839f677b896b213ee79907e0b7de9e66` (+ o commit deste SUMMARY); `refs/gsd/52-18/sha` = `c3e04a717c9338387160a7dc03d2e74e2f4133c7`; `refs/gsd/52-26/sha` NÃO criado (é a Passo 0 da Task 4).
- PROD intocado: ledger p52 = 0001..0003; md5 vivos = os `ANTES_*`. Nenhum push; nenhum STATE/ROADMAP tocado.
- Próximo: Task 3 — o orquestrador roda o review adversarial (`52-REVIEW-GAP-1.md`, base `refs/gsd/52-18/sha`); o operador confirma POR ESCRITO a janela única (e decide os WR, se houver). Depois a Task 4 (apply pelo portão, `52-APLICACOES.json` da 0005 por máquina, provas em PROD, push que leva `8fa8193a`/`e9dfc369`).

## Self-Check: PASSED

- 8/8 arquivos criados presentes; 9/9 commits (os 8 de código + o do SUMMARY `278db72f`) ancestrais do HEAD.
- PROD intocado, lido depois do SUMMARY (só leitura): ledger p52 = `[20261011000001, 20261011000002, 20261011000003]`; `pontuar_sjt` = `66fe507f…`; primária `salvar_avaliacao_entrevista` = `070e0f1b…`.
- Sem push: `origin/main` = `c3e04a71`; local à frente por 18 commits (os só-`.planning/` do 52-18 e da replanificação + os desta sessão — sobem no push da Task 4).
- `STATE.md`/`ROADMAP.md`: 0 alterações desde `d1c06bca`.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Sessão A concluída: 2026-10-11*
