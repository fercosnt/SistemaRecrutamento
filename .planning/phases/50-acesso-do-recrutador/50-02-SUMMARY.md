---
phase: 50-acesso-do-recrutador
plan: 02
subsystem: database
tags: [postgres, rls, security-definer, supabase, management-api, prod-apply, review-gate, push]

requires:
  - phase: 50-acesso-do-recrutador
    provides: "50-01: migration 20261005000001 (não aplicada), smoke p50 v1, sonda de vistas externas, p50_ensaio.cjs, p50_mutacoes.cjs, p50_enumera.cjs, refs/gsd/50-01/base"
provides:
  - "migration 20261005000001 VIVA em PROD e escriturada (ledger md5 = arquivo = e7383d5d736a75f2b9fe7d862ea4308a)"
  - "public.is_active_rh_user() vivo (DEFINER, search_path=\"\", anon sem EXECUTE); rh_le_candidaturas TO authenticated, sem posse da vaga"
  - "origin/main = 9271ba43 (24 commits enumerados e enviados por sha)"
  - "ref refs/gsd/50-02/sha = 9271ba43 (pin do apply)"
  - "ref refs/gsd/50-expansao/base = 9271ba43 (base de revisão do portão do 50-10)"
affects: [50-03, 50-04, 50-05, 50-06, 50-07, 50-08, 50-09, 50-10, 50-11]

actuals:
  tokens: 5433
  tasks: 3
  commits: 0
plan_head_before: 9271ba4325dd5f9095c10980b2e1ce349a0067ba
plan_head_after: 9271ba4325dd5f9095c10980b2e1ce349a0067ba

tech-stack:
  added: []
  patterns:
    - "Comandos do plano extraídos byte a byte do PLAN.md (blocos <automated> e ```sh) para arquivos e executados com bash — nenhuma transcrição manual das cadeias de guarda"

key-files:
  created:
    - .planning/phases/50-acesso-do-recrutador/50-02-SUMMARY.md
  modified: []

key-decisions:
  - "O commit de metadados deste plano (SUMMARY/STATE/ROADMAP) fica LOCAL, sem push: é só .planning/, não muda o que a Vercel serve, e empurrá-lo moveria origin/main para longe de refs/gsd/50-expansao/base (o verify do Task 3 exige base = origin/main)"

patterns-established:
  - "Apply com todas as amarrações no mesmo comando (revisão com critical 0 → HEAD = pin → código do pin = código revisado → plano inalterado → árvore limpa → p46apply migrate)"

requirements-completed: []
requirements-addressed: [EXPORT-05]

coverage:
  - id: D1
    description: "Revisão adversarial bloqueante do tracer e deste plano, sem crítico aberto, cobrindo 50-01 e 50-02 (D-12)"
    requirement: EXPORT-05
    verification:
      - kind: other
        ref: "Task 1 <verify> do 50-02-PLAN.md → 'revisao do tracer sem critico cobrindo o 50-01 e o 50-02: .../50-REVIEW-TRACER-3.md'"
        status: pass
    human_judgment: false
  - id: D2
    description: "Migration 20261005000001 viva em PROD, ledger md5 = arquivo, helper DEFINER com search_path vazio, anon sem EXECUTE, policy {authenticated} com o helper e sem posse"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "Task 2 verify #1 → 'tracer no ar: ledger = arquivo, helper, ACL e policy conferidos'"
        status: pass
    human_judgment: false
  - id: D3
    description: "Smoke contra os objetos vivos, pela via que aborta: 7/7, nada persistiu; rh ativo sem vaga própria passa de 0 para 40 candidaturas"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node scripts/p50_ensaio.cjs --sem-migracoes supabase/tests/p50_acesso_recrutador_smoke.sql"
        status: pass
    human_judgment: false
  - id: D4
    description: "Nada abriu para anon, sem claims, candidato e token antigo: vistas externas iguais através do apply e no ensaio reverso (estado vivo × desfeito na mesma transação RR)"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "Task 2 verify #3 (antes × depois) e verify #4 (node scripts/p50_ensaio.cjs --vistas --sem-migracoes --mutacao=supabase/tests/p50_desfazer_tracer.sql)"
        status: pass
    human_judgment: false
  - id: D5
    description: "O portão morde contra os objetos vivos: controle verde, 11/11 mutações definidas mordem, nada persistiu"
    verification:
      - kind: integration
        ref: "node scripts/p50_mutacoes.cjs"
        status: pass
    human_judgment: false
  - id: D6
    description: "Repositório = PROD: push por sha enumerado, origin/main..HEAD vazio, base da expansão fixada"
    verification:
      - kind: other
        ref: "Task 3 <verify> → 'remoto = HEAD, tracer publicado, base da expansao fixada'"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-10-05
status: complete
---

# Phase 50 Plan 02: Tracer do acesso do recrutador em PROD — Summary

**A migration `20261005000001` está viva em PROD desde 2026-10-05T19:54:38Z. Foi aplicada por `p46apply.cjs migrate` a partir do pin `9271ba43`, depois de três revisões adversariais; a última, `50-REVIEW-TRACER-3`, fechou com 0 crítico. O rh ativo sem vaga própria passou de 0 para 40 candidaturas, que é o total vivo. As vistas de anon, sem claims, candidato e token antigo ficaram iguais tanto através do apply quanto no ensaio reverso, e as 11 mutações mordem contra os objetos vivos. O código foi enviado por sha enumerado: `origin/main` = `9271ba43`.**

## Performance

- **Duração:** ~3 min de execução nesta continuação (início 2026-10-05T19:53:39Z, fim da verificação do push 19:55:55Z)
- **Apply:** 2026-10-05T19:54:36Z → 19:54:38Z
- **Push:** 2026-10-05T19:55:27Z → 19:55:33Z
- **Tarefas:** 3/3
- **Arquivos do repositório alterados pelas tarefas:** 0 (escrita em PROD + push + refs locais)

## Task 1 — revisão bloqueante e respostas do operador

### Revisões

| Arquivo | Commit | diff_base | reviewed_head | critical | warning | info | total |
|---|---|---|---|---|---|---|---|
| `.planning/phases/50-acesso-do-recrutador/50-REVIEW-TRACER-1.md` | `c0338f8b` | `81bfab81` | `e80d9bb6` | 0 | 8 | 9 | 17 |
| `.planning/phases/50-acesso-do-recrutador/50-REVIEW-TRACER-2.md` | `164e8524` | `81bfab81` | `5d93e378` | 0 | 8 | 9 | 17 |
| `.planning/phases/50-acesso-do-recrutador/50-REVIEW-TRACER-3.md` | `9271ba43` | `81bfab81` | `30047027` | 0 | 8 | 11 | 19 |

Rodadas de conserto:
- **depois do TRACER-1:** `c56f3605`, `e29f281a`, `6209d672`, `91ba85c1`, `781dd3b5`, `d1f5324a`, `5d93e378`;
- **depois do TRACER-2:** `2f9429d9`, `a3f44d13`, `939247f2`, `b38cb66e`, `30047027`.

**Verify do Task 1 (rodado nesta continuação, extraído byte a byte do plano):**
`revisao do tracer sem critico cobrindo o 50-01 e o 50-02: .planning/phases/50-acesso-do-recrutador/50-REVIEW-TRACER-3.md` (exit 0).

### Respostas do operador (verbatim, 2026-10-05, repassadas pelo orquestrador)

- (a) escolhas do planejador do 50-01 (helper plpgsql; helper SEM filtro de papel, com resíduo de até 1 h; `TO authenticated`; versões fixas): **«a aceito»**
- (b) nenhuma outra janela publicando até o fim do Task 3: **«nenhuma outra janela vai trabalhar nesse projeto»**
- Depois do TRACER-1: **«1»**, que significa consertar antes do apply. Foram consertados WR-01/02/03/05/06/07.
- Depois do TRACER-2: **«1»**, que significa consertar WR-01/02/03 e re-revisar. Foram consertados.

O orquestrador relata que o aviso (c) foi mostrado ao operador em 2026-10-05 e que não houve objeção. O aviso diz que, depois do apply, quem tiver papel `recrutador` ativo vê as candidaturas de TODAS as vagas, inclusive `fixture-p46` e `[TESTE]`.

### Status dos achados das revisões anteriores

Fonte: as tabelas de status do TRACER-2 e do TRACER-3.

- **TRACER-1, segundo o TRACER-2:**
  - fechados: WR-01, WR-02, WR-03, WR-05, IN-02, IN-03, IN-05, IN-06, IN-07, IN-09;
  - WR-06: fechado no 50-02;
  - WR-07: fechado para verde falso;
  - WR-04: parcial;
  - carregados ao TRACER-2: WR-08, IN-01, IN-04, IN-08.
- **TRACER-2, segundo o TRACER-3:**
  - WR-01: fechado no 50-02;
  - WR-02 e WR-03: fechados;
  - carregados ao TRACER-3: WR-04..WR-08 e IN-01..IN-09.

### Disposição de cada achado do TRACER-3

**Todas as disposições abaixo foram dadas pelo ORQUESTRADOR, não pelo operador.**

| Achado | Disposição | Quem |
|---|---|---|
| WR-01: `40001` sob REPEATABLE READ contado como mordida (M1/M4/M5) ou como controle vermelho | **Adiado** para uma rodada de conserto do runner/smoke antes da onda 3, antes de o 50-07 rodar. Neste plano, um `40001` em qualquer checagem valeria como INCONCLUSIVO, com uma repetição, e nunca como mordida nem como verde. **Medido:** nenhum `40001` em nenhum log `p50_02_*` | orquestrador |
| WR-02: mensagens do smoke que culpam «tráfego concorrente»; o (z) diz «não escreve» | **Adiado** para a mesma rodada antes do 50-07 | orquestrador |
| WR-03: o 50-10:164 e o `50-VALIDATION.md` rodam o smoke que escreve via `p46apply.cjs run` | **Fora do escopo do 50-02**, a consertar no texto do 50-07/50-10 antes da onda 3. Neste plano o smoke NUNCA rodou por `p46apply.cjs run`, só por `p50_ensaio.cjs --sem-migracoes` | orquestrador |
| WR-04: «MUDOU SEM TRAFEGO» sem conferir atores, dependência nem snapshot da captura | **Resíduo aceito**: só produz STOP falso, nunca passe falso. **Medido:** o verify #3 deu «iguais», sem ambíguo | orquestrador |
| WR-05: o 50-07 numera M7..M18 e `18/18`, em colisão com M7..M11 | **Fora do escopo do 50-02**, a consertar no 50-07 antes da onda 3 | orquestrador |
| WR-06: o 50-10 sem as amarrações de apply/push e com `18/18` fixo | **Fora do escopo do 50-02**, a consertar no 50-10 antes da onda 3 | orquestrador |
| WR-07: `capturar()` não lê os corpos das funções que 0002–0004 reescrevem | Resíduo aceito, registrado | orquestrador |
| WR-08: `anon` cego (`e:42501`) na sonda | Resíduo aceito, registrado | orquestrador |
| IN-01: `BEGIN ATOMIC END;` vazio engole o resto em `terminadores()` | Resíduo aceito, registrado | orquestrador |
| IN-02: a mensagem da marca afirma «PERSISTIU» mesmo com `ROLLBACK` | Resíduo aceito, registrado | orquestrador |
| IN-03: Step 2 e enumerador leem a revisão da árvore | Resíduo aceito, registrado. Na execução, a árvore de `.planning/` estava limpa para os arquivos de revisão: o verify do Task 1 confirma 1 commit por arquivo | orquestrador |
| IN-04: `capturar()` acusa `PERSISTIU` por tráfego legítimo | Resíduo aceito, registrado. Não ocorreu | orquestrador |
| IN-05: `capturar()` pós-envio sem `try` no CLI | Resíduo aceito, registrado | orquestrador |
| IN-06: população da varredura registrada 345 × 346 | Resíduo aceito, registrado | orquestrador |
| IN-07: advisory lock do `anti_lockout` e linhas-semente não registrados | Resíduo aceito, registrado | orquestrador |
| IN-08: push do 50-11 sem `--revisoes`/`--aplicado` | Resíduo aceito, registrado | orquestrador |
| IN-09: orçamento de lock por instrução; `anon` com 3 s fora do cabeçalho | Resíduo aceito, registrado | orquestrador |
| IN-10: o aviso (c) não diz que as filhas e o avanço de etapa seguem por posse até a expansão | Resíduo aceito, registrado. **Fato:** depois deste apply, o recrutador ativo vê as linhas de `candidaturas`, mas as tabelas filhas, as RPCs e as Edge Functions seguem por posse até 50-03..50-10 | orquestrador |
| IN-11: `sec05_08_smokes.sql` fica vermelho contra o apply correto até o 50-08 | Resíduo aceito, **registrado aqui** (é o conserto pedido): `supabase/tests/sec05_08_smokes.sql:189,196` parte da premissa de posse, que o D-01 inverte. Depois deste apply, ele reprova trabalho correto até o 50-08 | orquestrador |

## Task 2 — apply com evidência antes/depois

**Pin:** `refs/gsd/50-02/sha` = `9271ba4325dd5f9095c10980b2e1ce349a0067ba`, que era o HEAD no início. É posterior a `reviewed_head` `30047027`, e entre os dois só há `.planning/`. `origin/main` no início do task: `587683fc52550319669dac3255b8dc996ba3ff39`, igual no fim do Task 2.

### Step 1 — ANTES (só leitura ou abortando)

| Passo | Saída |
|---|---|
| a) vistas externas «antes» (`p46apply run p50_vistas_externas.sql`, 19:54:14Z) | `vistas-antes-ok`: `ledger_p50=[]`, 17 relações, 4 atores (`anon`, `candidato`, `rh_inativo`, `sem_claims`), `admin_ve_tudo` todo true. ids: admin `4fceff36…`, candidato `4601a000…0001`, rh_inativo `fba9bc0f…`. Captura feita UMA vez |
| b) catálogo + ledger | `ledger_0001 = 0`, `helper_ausente = true`, `roles = {public}`, `md5 = 34060c39f6f61e65613e15a093222691`. Os quatro valores são os esperados |
| c) SC1 «antes» (impersonação, só leitura) | `sc1_visto = 0`, ator `66412f96-1ee9-4621-853e-a79cd7f1b235` |
| d) desfazer contra o estado vivo (ensaio que aborta) | `ENSAIO VERDE: - · prefixadas=[20261005000001] · aplicadas=[] · … · vistas=igual · smoke50=n/a · evidencia=01:md5=771ddbeae44a92ad9d4c8b1483d1b9d8,anon=f,auth=t · 1073 ms` |

**Qual ANTIGO verbatim** (Step 1 b, IN-03 do TRACER-1; md5 `34060c39f6f61e65613e15a093222691`, roles `{public}`). É o texto que `supabase/tests/p50_desfazer_tracer.sql` restaura:

```
((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (deleted_at IS NULL) AND (is_rascunho = false) AND (vaga_id IN ( SELECT vagas.id
   FROM vagas
  WHERE (vagas.created_by = ( SELECT auth.uid() AS uid))))))
```

### Step 2 — apply

O comando do Step 2 foi extraído byte a byte do plano. No mesmo comando ele confere a revisão com critical 0, o `reviewed_head`, HEAD = pin, o código do pin igual ao revisado, o plano inalterado e a árvore limpa; só então chama `node p46apply.cjs migrate supabase/migrations/20261005000001_p50_helper_candidaturas.sql`. Início 2026-10-05T19:54:36Z, fim 19:54:38Z, exit 0:

```
── 20261005000001_p50_helper_candidaturas.sql
   version : 20261005000001
   name    : p50_helper_candidaturas
   octetos : 17403
   md5     : e7383d5d736a75f2b9fe7d862ea4308a
   ✅ aplicada e escriturada — md5 do ledger BATE (17403 octetos)
```

O md5 é o mesmo que o TRACER-3 registrou para o arquivo revisado.

### Step 3 — DEPOIS (os cinco verifies, em ordem, todos exit 0)

1. **Catálogo + ledger:** `tracer no ar: ledger = arquivo, helper, ACL e policy conferidos`.
2. **Smoke ao vivo**, pelo ensaio que aborta e nunca por `p46apply run`:
   - `ENSAIO VERDE: supabase/tests/p50_acesso_recrutador_smoke.sql · prefixadas=[] · aplicadas=[20261005000001] · ausentes=[20261005000002,20261005000003,20261005000004] · smoke50=7/7 · evidencia=- · 405 ms`
   - `smoke ao vivo: 7/7 (objetos vivos; requisicao abortada; nada persistiu)`
3. **Vistas externas através do apply:** `vistas externas: antes sem e depois com 20261005000001; 17 relacoes; admin ve tudo; iguais`. Nenhuma relação «AMBIGUO POR TRAFEGO».
4. **Ensaio reverso**, estado vivo × desfeito na mesma transação RR, abortada:
   - `ENSAIO VERDE: - · prefixadas=[] · aplicadas=[20261005000001] · … · vistas=igual · smoke50=n/a · evidencia=- · 997 ms`
   - `ensaio reverso: estado vivo x desfeito iguais para anon, sem claims, candidato e token antigo, na mesma transacao (abortada)`
5. **Runner de mutações pós-apply:**
   ```
   modo: prefixadas=[] aplicadas=[20261005000001] ausentes=[20261005000002,20261005000003,20261005000004]
   baseline: helper=presente ledger=1 politicas(public)=155 usuarios_rh=7 borda=0
   CONTROLE verde — sentinela alcancado, smoke50=7/7, nenhum P50C FAIL (991 ms)
   M1 morde: helper sempre verdadeiro … -> P50C FAIL (b) [inativo,inativo_mesmo_papel,ativo_excluido,aleatorio,sem_claims,candidato] (713 ms)
   M2 morde: ramo rh so pelo JWT … -> P50C FAIL (d) [inativo,inativo_mesmo_papel] (726 ms)
   M3 morde: GRANT EXECUTE do helper a anon -> P50C FAIL (a) (793 ms)
   M4 morde: ramo rh de volta a posse … -> P50C FAIL (c) (919 ms)
   M5 morde: policy de volta a TO public -> P50C FAIL (f) (585 ms)
   M6 morde: disjunto do administrador alterado … -> P50C FAIL (e) (548 ms)
   M7 morde: ramo rh sem o conjunto do claim … -> P50C FAIL (d) [ativo_visualizador,ativo_gerente,ativo_sem_role] (518 ms)
   M8 morde: helper com role = 'administrador' … -> P50C FAIL (b) [rec_ativo,inativo_mesmo_papel] (504 ms)
   M9 morde: ramo rh sem deleted_at IS NULL … -> P50C FAIL (f) [rh_ve_excluida,rh_ve_borda,rh_total] (845 ms)
   M10 morde: ramo rh sem is_rascunho = false … -> P50C FAIL (f) [rh_ve_rascunho,rh_ve_borda,rh_total] (595 ms)
   M11 morde: helper sem deleted_at IS NULL … -> P50C FAIL (b) [ativo_excluido] (639 ms)
   leitura so-leitura igual a baseline: helper=presente ledger=[{"v":"20261005000001","md5":"e7383d5d736a75f2b9fe7d862ea4308a"}] politicas(public)=155 usuarios_rh=7 borda=0
   controle verde; 11/11 mutacoes mordem; nada persistiu
   portao morde contra os objetos vivos: 11/11 (todas as definidas no runner); nada persistiu
   ```
   Pela disposição do WR-01, conferi os logs: `grep -E '40001|could not serialize'` sobre todos os `p50_02_*.log` não acha nada. As mordidas de M1/M4/M5 vêm da sonda, não de um `40001`.

**SC1 antes/depois** (mesma consulta só leitura do Step 1 c, ator `66412f96-1ee9-4621-853e-a79cd7f1b235`): **0 → 40**. O total vivo, medido como postgres, é `total = 40`, `vivas = 40`.

## Task 3 — push por sha enumerado

O comando do Task 3 foi extraído byte a byte do plano. Ele roda pin × HEAD, `git fetch` e `ls-remote` = `origin/main`, confere a ancestralidade, roda `p50_enumera.cjs` com `--revisoes` e `--aplicado` e faz `git push origin <sha>:refs/heads/main`, tudo num comando só. Início 19:55:27Z, fim 19:55:33Z, exit 0. A enumeração completa:

```
c6e920c8 planning docs(50): research — inventário vivo do predicado created_by (14 policies, 18 RPCs, 5 EFs)
c4707ce4 planning docs(50): validation strategy e decisões do operador (CONTEXT)
20197818 planning docs(50): pattern map
81bfab81 planning docs(50): create phase plan — 11 plans em 7 ondas (checker: 0 blockers)
358c0090 codigo   feat(50-01): tracer — helper is_active_rh_user + rh_le_candidaturas + smoke v1 (ensaio)
7f4b495b codigo   feat(50-01): sonda de vistas externas + modo --vistas do ensaio
7b5c91b6 codigo   test(50-01): runner de mutacoes M1..M6 + enumerador de commits
8781ec13 planning docs(50-01): complete tracer do acesso do recrutador plan
e80d9bb6 planning docs(50-01): STATE e ROADMAP — 50-01 concluido (1/11)
c0338f8b planning docs(50-02): review adversarial do tracer (50-REVIEW-TRACER-1)
c56f3605 codigo   fix(50-01): WR-05 runner mede persistencia em toda saida; baseline compartilhada
e29f281a codigo   fix(50-01): WR-01 smoke vigia o conjunto do claim rh; mutacao M7
6209d672 codigo   fix(50-01): WR-02 + IN-06 pares que diferem num atributo so; mutacoes M8 e M11
91ba85c1 codigo   fix(50-01): WR-03 borda semeada no envelope P50C1; mutacoes M9 e M10
781dd3b5 codigo   fix(50-01): WR-07 sonda marca quando foi tirada + desfazer verbatim para o ensaio reverso
d1f5324a codigo   fix(50-01): WR-06 enumerador recusa codigo nao coberto pela revisao nem pelo apply
5d93e378 planning docs(50-02): WR-06/WR-07 amarracoes no mesmo comando da escrita; desfazer verbatim
164e8524 planning docs(50-02): re-review do tracer apos consertos (50-REVIEW-TRACER-2)
2f9429d9 codigo   fix(50-01): WR-01 smoke depois do apply so pelo ensaio que aborta; p46apply run proibido
a3f44d13 planning docs(50-02): WR-01 verify #2 roda o smoke pelo ensaio que aborta, nao por p46apply run
939247f2 codigo   fix(50-01): WR-02 guarda de transacao no ensaio: recusa terminador no topo e marca p50.tx
b38cb66e codigo   fix(50-01): WR-03 ensaio em REPEATABLE READ: um snapshot para a requisicao inteira
30047027 planning docs(50-02): WR-03 ensaio reverso sem janela por REPEATABLE READ; 40001 e inconclusivo
9271ba43 planning docs(50-02): re-review do tracer apos consertos (50-REVIEW-TRACER-3)
enumeracao ok: 24 commit(s) em 587683fc..9271ba43 · codigo coberto por 50-REVIEW-TRACER-3.md (reviewed_head 30047027) · codigo contido no apply 9271ba43
To github.com:fercosnt/SistemaRecrutamento.git
   587683fc..9271ba43  9271ba4325dd5f9095c10980b2e1ce349a0067ba -> main
```

`refs/gsd/50-expansao/base` = `9271ba4325dd5f9095c10980b2e1ce349a0067ba`. O ref foi criado agora; não existia antes.

**Verify do Task 3:** `remoto = HEAD, tracer publicado, base da expansao fixada` (exit 0). `git log --oneline origin/main..HEAD` dá 0 linha.

O 50-01 não mudou nenhum arquivo de front-end, então não há marcador servido a conferir na Vercel.

## Task Commits

Nenhum dos três tasks produz arquivo no repositório: o Task 1 é o checkpoint de revisão, o Task 2 escreve em PROD e o Task 3 faz push e fixa refs. Por isso não houve commit por task. As revisões e as rodadas de conserto foram commitadas antes desta continuação (hashes acima). O único commit deste plano é o de metadados (SUMMARY, STATE, ROADMAP).

## Decisions Made

- O commit de metadados deste plano fica **local, sem push**. É só `.planning/` e não muda o que a Vercel serve. Se fosse enviado, `origin/main` deixaria de ser igual a `refs/gsd/50-expansao/base`, que o verify do Task 3 e o portão do 50-10 tomam como base. Quem decide quando enviá-lo é o orquestrador; o enumerador o classifica como `planning`.

## Deviations from Plan

None - plan executed exactly as written. Os comandos de guarda, apply, verify e push foram extraídos do PLAN.md por script e executados sem transcrição manual.

## Issues Encountered

- Nenhum `40001`, timeout ou `PERSISTIU` em nenhuma execução.
- **Residual conhecido, IN-11:** `supabase/tests/sec05_08_smokes.sql:189,196` passa a reprovar trabalho correto até o 50-08.
- **Pendências antes da onda 3**, todas de disposição do orquestrador: WR-01/WR-02 (runner e smoke), WR-03/WR-05/WR-06 (texto do 50-07, do 50-10 e do `50-VALIDATION.md`). Até lá, **ninguém deve rodar o smoke por `p46apply.cjs run`**: ele escreve dentro do envelope P50C1 e esse caminho commita.

## User Setup Required

None.

## Next Phase Readiness

- O tracer está vivo, e o recrutador ativo vê as candidaturas de todas as vagas. As filhas, as RPCs e as EFs seguem por posse até 50-03..50-10.
- `refs/gsd/50-expansao/base` = `9271ba43` é a base de revisão do portão do 50-10.
- **Desfazer:** só por migration corretiva com o texto de `supabase/tests/p50_desfazer_tracer.sql`, pela mesma via e com checkpoint do operador. O ensaio reverso desta execução comprovou que esse texto ainda restaura `34060c39…`/`{public}` contra o estado vivo.

## Self-Check: PASSED

- `.planning/phases/50-acesso-do-recrutador/50-02-SUMMARY.md`: FOUND.
- Commits citados `c0338f8b`, `164e8524`, `9271ba43`, `30047027`, `5d93e378`, `e80d9bb6`: FOUND.
- `refs/gsd/50-02/sha` = `refs/gsd/50-expansao/base` = `origin/main` = `9271ba43`: conferido.
- Ledger de PROD com a linha `20261005000001`: conferido (releitura só leitura).
