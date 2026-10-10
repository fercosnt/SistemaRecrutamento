---
phase: 51-consertos-da-jornada-bloco-3
plan: 22
subsystem: database
tags: [postgres, supabase, lgpd, motor-de-exclusao, anonimizar_candidato, disponibilidade, p46apply, portao]

requires:
  - phase: 51-20
    provides: "migration 20261010000001 (motor G1a apaga public.disponibilidade), p45 com v_pin_anon 9b87e5ee…, runner MD1/MF1/MF2"
  - phase: 51-21
    provides: "limpeza 20261010000002 em disco (fora do ledger), ensaio padrão com ela prefixada"
  - phase: 51-18
    provides: "G2 (avaliacaoStatusCache) — coberto pelo review"
  - phase: 51-19
    provides: "G1b (recibo) e 51-19-TEXTO-APROVADO.md — publicação confirmada pelo operador (d)"
provides:
  - "20261010000001 aplicada em PROD pela via do projeto; motor de exclusão apaga a disponibilidade do titular em toda exclusão nova"
  - "51-22-DECISAO.md commitado (OK do operador lido por máquina no comando do apply)"
  - "51-22-CORPO-ANTES.sql (base de desfazer corretivo)"
  - "ref refs/gsd/51-22/sha = 6365a803 (pin do apply)"
affects: [51-23, 51-24]

actuals:
  tokens: 5300
  tasks: 3
  commits: 3
plan_head_before: 60ab103f64bb5d56107962b8bb37f228b40e2493
plan_head_after: 6365a803ccda3899343551b49aee3ba7ad891634

tech-stack:
  added: []
  patterns:
    - "decisão do operador como artefato commitado, conferido por máquina no MESMO comando do apply (&&)"

key-files:
  created:
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-22-CORPO-ANTES.sql
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-22-DECISAO.md
  modified: []

key-decisions:
  - "Operador (2026-10-10 03:15 -0300): aplicar a 20261010000001 sobre 51-REVIEW-GAPS-1.md (critical 0); pausa das outras janelas confirmada; publicação do texto do 51-19 no 51-24 confirmada"
  - "Disposição do review aceita pelo operador: WR-01 e WR-04 backlog; WR-02 e WR-03 mitigar na execução do 51-23; IN-01/IN-02 registrar; IN-03 decidir no checkpoint do 51-23 se ocorrer"

patterns-established: []

requirements-completed: [JORN-49, JORN-46]

coverage:
  - id: D1
    description: "20261010000001 no ar: ledger = arquivo (md5 7e88599631e1d22666615935ef19477c), md5 vivo = pin do p45, corpo vivo apaga public.disponibilidade, anon sem EXECUTE, 0002 fora do ledger"
    requirement: JORN-49
    verification:
      - kind: integration
        ref: "51-22-PLAN.md Task 3 verify 1 (NO AR DIVERGE) — 'motor G1a no ar: …'"
        status: pass
    human_judgment: false
  - id: D2
    description: "p45_motor_exclusao_smoke e p46_purga_smoke verdes contra o motor vivo (ensaio --sem-migracoes, requisições abortadas)"
    requirement: JORN-49
    verification:
      - kind: integration
        ref: "node scripts/p51_ensaio.cjs --sem-migracoes supabase/tests/{p45_motor_exclusao_smoke,p46_purga_smoke}.sql"
        status: pass
    human_judgment: false
  - id: D3
    description: "portão do motor morde contra o vivo: MD1 (B25/respondido), MF1 (B26/apagou), MF2 (B26/outros), 3/3, nada persistiu"
    requirement: JORN-49
    verification:
      - kind: integration
        ref: "node scripts/p51_mutacoes.cjs --so=MD1,MF1,MF2"
        status: pass
    human_judgment: false
  - id: D4
    description: "decisão do operador commitada e conferida por máquina antes do apply"
    requirement: JORN-46
    verification:
      - kind: other
        ref: "51-22-PLAN.md Task 2 verify 3 — 'OK do operador para o motor: 2026-10-10 03:15 -0300 sobre 51-REVIEW-GAPS-1.md'"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-10-10
status: complete
---

# Phase 51 Plan 22: apply do motor G1a (20261010000001) Summary

**`anonimizar_candidato` em PROD passou a apagar `public.disponibilidade` (escopo `candidato_id = p_candidato_id`) em toda exclusão nova — aplicada pela via do projeto, com o OK escrito do operador e o portão no mesmo comando, e provada contra o motor vivo (ledger = arquivo, md5 vivo = pin `9b87e5ee…`, p45/p46 verdes, MD1/MF1/MF2 mordem). A limpeza destrutiva `20261010000002` continua fora do ledger (51-23).**

## Performance

- **Duration:** ~22 min (Task 1 02:55; apply 03:17:00–03:17:02 -0300; última prova 03:17:31 -0300)
- **Started:** 2026-10-10T05:55Z (Task 1, agente anterior)
- **Completed:** 2026-10-10T06:17:31Z
- **Tasks:** 3/3
- **Files created:** 2 (+ este SUMMARY)

## Accomplishments

- `20261010000001` aplicada em PROD por `node p46apply.cjs migrate`, encadeada por `&&` atrás da conferência de `51-22-DECISAO.md` e do `p51_portao.cjs --modo apply` (HEAD = pin).
- Prova viva lida de volta: ledger `md5(statements[1])` = md5 do arquivo; `md5(prosrc)` vivo = `9b87e5ee3d072df5f9bf6e99ee1ae7c1` (= `v_pin_anon` do p45); corpo vivo sem comentários contém `DELETE FROM public.disponibilidade`; ACL e comentário iguais aos de antes; `anon` sem EXECUTE.
- Decisão escrita do operador registrada em artefato commitado e lido por máquina.

## Task Commits

1. **Task 1 (tracer): corpo vivo e prova D-12 antes** — `c35cd524` (docs) — agente anterior
2. **Task 2: decisão do operador** — `6365a803` (docs: `51-22-DECISAO.md`). O review `51-REVIEW-GAPS-1.md` foi commitado pelo orquestrador em `d9553a17` (não é commit do executor).
3. **Task 3: apply em PROD** — sem arquivo no repositório (escrita em PROD por `p46apply.cjs migrate`); evidência neste SUMMARY.

`commits: 3` medido por `git rev-list --count 60ab103f..HEAD` antes do commit deste SUMMARY (inclui o `d9553a17` do orquestrador).

## Task 1 — medições (agente anterior, só leitura, 2026-10-10 02:55–02:56 -0300)

- `md5(prosrc)` vivo de `anonimizar_candidato(uuid,boolean)` = `a68e4a6a47d9482f75d3326a8bf2b3e4` (= pin do 51-13 = PRE da 0001)
- md5 do COMMENT = `48440858e8f15f4db08ae4e4b0463007`; md5 do `pg_get_functiondef` = `414a981a2cb2e5d3b770880897186841`
- `proacl` = `{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}`; `anon` sem EXECUTE
- `config_purga.modo` = `dry_run`; cabeça do ledger `20261008000005`; 0 linhas `20261010%`
- `disp_anonimizados` = `{titulares:2, linhas:2}`
- Ensaios p45 e p46 com a 0001 prefixada: ENSAIO VERDE, `g1a:anon=9b87e5ee3d072df5f9bf6e99ee1ae7c1`, abortados
- `origin/main` = `53cb73ff240df4507fd808aa86c909e43a941669`

## Task 2 — review e decisão

Verifies (re-rodados pelo executor, verbatim do plano, a partir de arquivos no scratchpad):

1. `PORTAO OK: revisao=.planning/phases/51-consertos-da-jornada-bloco-3/51-REVIEW-GAPS-1.md reviewed_head=c35cd52408040a0258730641fead1612fcffe2a8 pin=- modo=revisao` (rc=0)
2. `diff_base ef7fa24c de 51-REVIEW-GAPS-1.md cobre os 3 commits test(51-validacao) nunca revisados` (rc=0)
3. Antes do arquivo: `SEM OK DO OPERADOR PARA O MOTOR: 51-22-DECISAO.md ausente, nao commitado ou modificado depois do commit` (vermelho por construção). Depois do commit `6365a803`: `OK do operador para o motor: 2026-10-10 03:15 -0300 sobre 51-REVIEW-GAPS-1.md` (rc=0)

Review: `51-REVIEW-GAPS-1.md` (d9553a17) — `critical: 0`, `warning: 4`, `info: 3`, `diff_base: ef7fa24c…`, `reviewed_head: c35cd524…`.

### Decisão (conteúdo de `51-22-DECISAO.md`)

```
decisao: aplicar
migration: 20261010000001
pausa_outras_janelas: confirmada
config_purga_modo: dry_run
publicar_texto_51_19: confirmado
review_aprovado: 51-REVIEW-GAPS-1.md
aprovado_em: 2026-10-10 03:15 -0300
```

### Resposta do operador (VERBATIM, AskUserQuestion, 2026-10-10 03:15 -0300)

(a) «Aplicar em PROD a migration 20261010000001 (o motor de exclusão passa a apagar a disponibilidade do titular em toda exclusão futura), sobre o review 51-REVIEW-GAPS-1.md (critical 0)?» → «Aplicar»

(b) «Você confirma que nenhuma outra janela do Claude publica ou aplica neste repositório até o fim do 51-24? (A janela de cadastro de vagas pode continuar editando docs/vagas e docs/specs, desde que não faça push nem apply.)» → «Confirmo»

(c) apresentada como medição: `config_purga.modo` = `dry_run` (medido na Task 1; remedido imediatamente antes do apply — `dry_run` às 03:16:42 -0300)

(d) «A frase aprovada no 51-19-TEXTO-APROVADO.md vai ao ar no redeploy da EF executar-direito-titular do 51-24?» → «Confirmo a publicação»

(e) «A disposição dos achados WR-01..04 e IN-01..03 do review: aceita a proposta da tabela?» → «Aceito a proposta (Recommended)»

| Achado | Disposição (dada pelo operador, proposta pelo orquestrador) |
|---|---|
| WR-01 — comentário do motor no catálogo diz «não remove linha de tabela alguma»; o POS-PORTAO exige que fique igual | backlog — migration só de comentário depois do 51-24, com review próprio |
| WR-02 — 51-23: vínculo do apply à população aprovada só em prosa | mitigar na execução do 51-23 — o comando exato fica num arquivo commitado e é mostrado ao operador no checkpoint, antes de rodar |
| WR-03 — 51-23-DECISAO.md não conferido como commitado e igual a HEAD | mitigar na execução do 51-23 — conferência por máquina no despacho |
| WR-04 — a invariante do ensaio não vigia as 26 linhas dos candidatos vivos | backlog; no apply real o POS `(outros)` da 0002 cobre |
| IN-01 — Redação: servidor marca concluída no primeiro envio, cliente no último; anterior à fase | registrar, sem ação |
| IN-02 — comentário «fábrica única» vs usos literais da chave | registrar, sem ação |
| IN-03 — se a limpeza for vetada, a regra (8) do portão trava a publicação do G1b/G2 | decidir no checkpoint do 51-23 se ocorrer |

## Task 3 — apply e prova viva

**Passo 0:** `refs/gsd/51-22/sha` não existia → criada = `6365a803ccda3899343551b49aee3ba7ad891634` (= HEAD). `R0` = `53cb73ff240df4507fd808aa86c909e43a941669`.

**Precondição (só leitura, 03:16:42 -0300):** `config_purga.modo = dry_run`; cabeça do ledger `20261008000005`, 0 linhas `20261010%`; md5 vivo `a68e4a6a…` (igual à Task 1); COMMENT md5 `48440858…`; ACL igual; `anon` sem EXECUTE; `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` vazio.

**Passo 1 — prova D-12 de novo (03:16:47–03:16:53):**
- `ENSAIO VERDE: supabase/tests/p45_motor_exclusao_smoke.sql · prefixadas=[20261010000001] · aplicadas=[20261008000001,…,20261008000005] · ausentes=[20261010000002] · vistas=igual · smokes=[] · evidencia=g1a:anon=9b87e5ee3d072df5f9bf6e99ee1ae7c1 · 1245 ms`
- `ENSAIO VERDE: supabase/tests/p46_purga_smoke.sql · prefixadas=[20261010000001] · … · evidencia=g1a:anon=9b87e5ee3d072df5f9bf6e99ee1ae7c1 · 2700 ms`
- `prova D-12 no estado vivo de agora: motor G1a verde com p45 e p46, vistas iguais (abortado)`

**Passo 2 — apply (início 2026-10-10 03:17:00 -0300, fim 03:17:02 -0300), um comando, encadeado por `&&`:**

```
OK do operador para o motor: 2026-10-10 03:15 -0300 sobre 51-REVIEW-GAPS-1.md
PORTAO OK: revisao=.planning/phases/51-consertos-da-jornada-bloco-3/51-REVIEW-GAPS-1.md reviewed_head=c35cd52408040a0258730641fead1612fcffe2a8 pin=6365a803ccda3899343551b49aee3ba7ad891634 modo=apply

── 20261010000001_p51_motor_apaga_disponibilidade.sql
   version : 20261010000001
   name    : p51_motor_apaga_disponibilidade
   octetos : 115518
   md5     : 7e88599631e1d22666615935ef19477c
   ✅ aplicada e escriturada — md5 do ledger BATE (115518 octetos)
```

**Passo 3 — verifies (verbatim do plano):**

1. `motor G1a no ar: ledger = arquivo, md5 vivo = pin, corpo vivo apaga a disponibilidade, anon sem EXECUTE, limpeza fora do ledger` (rc=0). A consulta: `md5(statements[1])` do ledger para `20261010000001` vs `md5 -q` do arquivo (`7e8859…`); `md5(prosrc)` vivo vs `v_pin_anon` do p45; `regexp_replace(pg_get_functiondef(...), '--[^\n]*', '', 'g') ~ 'DELETE[[:space:]]+FROM[[:space:]]+public[.]disponibilidade'` = true; `has_function_privilege('anon', …, 'EXECUTE')` = false; count de `20261010000002` no ledger = 0.
   Lido de volta em seguida: COMMENT md5 `48440858e8f15f4db08ae4e4b0463007` (igual ao de antes); ACL `{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}` (igual); cabeça do ledger `20261010000001`; `config_purga.modo = dry_run`.
2. (03:17:11–03:17:15) `p45 e p46 verdes contra o motor vivo (requisicoes abortadas)`:
   - `ENSAIO VERDE: supabase/tests/p45_motor_exclusao_smoke.sql · prefixadas=[] · aplicadas=[20261008000001,20261008000002,20261008000003,20261008000004,20261008000005,20261010000001] · ausentes=[20261010000002] · smokes=[] · evidencia=- · 853 ms`
   - `ENSAIO VERDE: supabase/tests/p46_purga_smoke.sql · prefixadas=[] · aplicadas=[…,20261010000001] · ausentes=[20261010000002] · smokes=[] · evidencia=- · 1299 ms`
3. (03:17:19–03:17:24) `portao do motor morde contra o vivo: MD1, MF1, MF2`:
   - `modo: prefixadas=[20261010000002] aplicadas=[20261008000001,20261008000002,20261008000003,20261008000004,20261008000005,20261010000001] ausentes=[]` — DECLARADO no plano: só a limpeza prefixada, dentro da requisição que aborta; o motor G1a entre as aplicadas.
   - `CONTROLE verde (supabase/tests/p45_motor_exclusao_smoke.sql): gate 45m=40 de 40`
   - `MD1 morde: … -> P45M FAIL (B25/respondido)`; `MF1 morde: … -> P45M FAIL (B26/apagou)`; `MF2 morde: … -> P45M FAIL (B26/outros)`
   - `leitura so-leitura igual a baseline: ledger=[…,20261010000001] funcoes=15 … mutacoes=0 fixtures={"users":0,"candidatos":0}`
   - `controle verde; 3/3 mutacoes mordem; nada persistiu (so=MD1,MF1,MF2)`

**Depois (03:17:31 -0300):** `disp_anonimizados` = `{titulares:2, linhas:2}` (igual à Task 1 — a população do 51-23 está intacta; o apply é aditivo e não tocou titular algum). `git ls-remote origin refs/heads/main` = `53cb73ff…` = `R0` (nenhum push). `20261010000002` fora do ledger.

## Files Created/Modified

- `.planning/phases/51-consertos-da-jornada-bloco-3/51-22-CORPO-ANTES.sql` — corpo vivo, ACL e comentário de antes (Task 1, c35cd524)
- `.planning/phases/51-consertos-da-jornada-bloco-3/51-22-DECISAO.md` — OK do operador, lido por máquina no apply (6365a803)
- PROD: `public.anonimizar_candidato(uuid,boolean)` (corpo G1a) e a linha `20261010000001` do ledger

## Decisions Made

As do operador (acima). O executor não revisou nem decidiu.

## Backlog

O plano não lista `deferred-items.md` em `files_modified`; por isso os dois itens de backlog dispostos pelo operador ficam registrados aqui:

- **WR-01** — o comentário de `anonimizar_candidato` no catálogo ainda diz «não remove linha de tabela alguma», o que agora é falso para `public.disponibilidade`; o POS-PORTAO da 0001 exigiu que o comentário ficasse igual. Disposição: migration só de comentário depois do 51-24, com review próprio.
- **WR-04** — a invariante `disp_anonimizados` do ensaio não vigia as linhas de disponibilidade dos candidatos vivos. Disposição: backlog; no apply real da 0002 (51-23) o POS `(outros)` cobre.

## Deviations from Plan

None — plan executed exactly as written. Nota operacional: os `<verify>` foram extraídos byte a byte do PLAN.md para arquivos no scratchpad e executados de lá (evita transcrição e o falso positivo do hook `guard-git.sh`); nenhum foi alterado.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- 51-23 (limpeza destrutiva `20261010000002`) pode começar: motor G1a no ar (o PRE `(motor)` da 0002 o exige), população medida `{titulares:2, linhas:2}`. Mitigações WR-02/WR-03 a aplicar no despacho do 51-23; IN-03 decidir no checkpoint dele se a limpeza for vetada.
- 51-24 (push e redeploy da EF `executar-direito-titular` com o texto do 51-19): a publicação está confirmada pelo operador (d). O HEAD local está 34 commits à frente de `origin/main` — esperado, o push é do 51-24.
- Pausa das outras janelas confirmada pelo operador até o fim do 51-24.
- Desfazer (só com checkpoint): corretiva pela mesma via com o corpo de `51-22-CORPO-ANTES.sql`.

## Self-Check: PASSED

- FOUND: `.planning/phases/51-consertos-da-jornada-bloco-3/51-22-CORPO-ANTES.sql`
- FOUND: `.planning/phases/51-consertos-da-jornada-bloco-3/51-22-DECISAO.md`
- FOUND: commits `c35cd524`, `d9553a17`, `6365a803` (ancestrais de HEAD)
- FOUND: `refs/gsd/51-22/sha` = `6365a803`
- PROD: ledger `20261010000001` com md5 = arquivo; `20261010000002` ausente

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-10*
