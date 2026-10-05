---
phase: 50-acesso-do-recrutador
plan: 01
subsystem: database
tags: [postgres, rls, security-definer, supabase, smoke, mutation-testing, management-api]

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    provides: "idioma 49-44 (migration com PRE/POS-PORTAO + SET LOCAL, smoke com envelope de SQLSTATE próprio, runner de mutações) e p46apply.cjs"
provides:
  - "migration 20261005000001 (NÃO aplicada): helper vivo public.is_active_rh_user() + ALTER POLICY rh_le_candidaturas TO authenticated"
  - "smoke p50 v1 (cláusulas a,b,c,d,e,f,z; esperado 7; envelope P50C1; prefixo P50C FAIL)"
  - "sonda de vistas externas (17 relações por forma × anon, sem claims, candidato, recrutador inativo)"
  - "scripts/p50_ensaio.cjs (compor/rodar/MIGS; modos padrão, --migracoes=, --sem-migracoes, --vistas)"
  - "scripts/p50_mutacoes.cjs (CONTROLE + M1..M6, requer por mutação, persistência por baseline na execução)"
  - "scripts/p50_enumera.cjs (enumeração literal pré-push: planning | codigo | ALHEIO)"
  - "ref refs/gsd/50-01/base = 81bfab81 (base da review do 50-02)"
affects: [50-02, 50-03, 50-04, 50-05, 50-07, 50-08, 50-09, 50-10, 50-11]

actuals:
  tokens: 24183
  tasks: 3
  commits: 3
plan_head_before: 81bfab810306c05b1e503ca4a8929d6fb674b466
plan_head_after: 7b5c91b6df068245970e203c1add7346890ad2ac

tech-stack:
  added: []
  patterns:
    - "Ensaio com composição prefixo + migrations fora do ledger + [mutação] + smokes + sentinela que aborta; veredito numa linha; leitura de persistência antes/depois"
    - "Evidência do PÓS-PORTÃO anexada à GUC de sessão p50.evidencia e carregada para fora pela mensagem do sentinela (a Management API não devolve NOTICE)"
    - "Fotografia de vistas externas antes × depois na MESMA transação (P50V FAIL (vistas))"
    - "Disjunto do administrador extraído do qual desparseado por varredura de profundidade de parênteses (primeiro ` OR ` de nível 1 fora de literal)"

key-files:
  created:
    - supabase/migrations/20261005000001_p50_helper_candidaturas.sql
    - supabase/tests/p50_acesso_recrutador_smoke.sql
    - supabase/tests/p50_vistas_externas.sql
    - scripts/p50_ensaio.cjs
    - scripts/p50_mutacoes.cjs
    - scripts/p50_enumera.cjs
  modified:
    - .planning/WINDOWS.md

key-decisions:
  - "Helper plpgsql role-agnóstico (escolhas 1 e 2 do planejador, vetáveis no 50-02): qualquer linha usuarios_rh ativa e não excluída; todo chamador já exige o claim rh"
  - "Atores a_ativo e a_inativo escolhidos SEM linha em candidatos, para que o que veem seja obra de rh_le_candidaturas e não da policy de candidato"
  - "PREFIXO do ensaio zera smoke50.*/p50.* antes de compor: conexão do pool pode trazer GUC de sessão de um smoke que commitou"
  - "Mutações que reescrevem objetos da migration são extraídas dela por âncora literal única — não divergem do texto que vai ao apply"
  - "requirements-completed fica vazio: o plano declara que nenhum plano da fase edita a linha EXPORT-05 (quem decide é o verificador)"

patterns-established:
  - "p50_ensaio.cjs é o único compositor de ensaio da fase; p50_mutacoes.cjs o reusa por require"
  - "Linha de veredito: ENSAIO VERDE: <arquivos> · prefixadas=[…] · aplicadas=[…] · ausentes=[…] · [vistas=igual|vacua ·] smoke50=p/e · evidencia=<…> · <ms> ms"

requirements-completed: []
requirements-addressed: [EXPORT-05]

coverage:
  - id: D1
    description: "Tracer em PROD por ensaio que aborta: rh ativo sem vaga própria vê as candidaturas vivas das vagas ativa/inativa/arquivada (SC1, impersonação); token antigo, candidato, sem claims e anon não veem nada novo; administrador vê todas"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node scripts/p50_ensaio.cjs --migracoes=supabase/migrations/20261005000001_p50_helper_candidaturas.sql supabase/tests/p50_acesso_recrutador_smoke.sql"
        status: pass
    human_judgment: false
  - id: D2
    description: "Nada abriu para anon/candidato/sem claims/recrutador inativo, views inclusive: fotografia antes = depois na mesma transação"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node scripts/p50_ensaio.cjs --vistas --migracoes=supabase/migrations/20261005000001_p50_helper_candidaturas.sql supabase/tests/p50_acesso_recrutador_smoke.sql"
        status: pass
      - kind: integration
        ref: "node p46apply.cjs run supabase/tests/p50_vistas_externas.sql (sonda avulsa: 17 relacoes, 4 atores, admin ve tudo)"
        status: pass
    human_judgment: false
  - id: D3
    description: "O portão morde: CONTROLE verde e M1..M6 reprovam cada um na letra declarada; nada persistiu"
    verification:
      - kind: integration
        ref: "node scripts/p50_mutacoes.cjs"
        status: pass
    human_judgment: false
  - id: D4
    description: "Enumerador literal pré-push para 50-02/50-10/50-11"
    verification:
      - kind: other
        ref: "node scripts/p50_enumera.cjs --de origin/main --ate HEAD --caminhos <allowlist 50-01> --assunto '^(feat|test|fix|refactor|chore)\\(50-0[12]\\): '"
        status: pass
    human_judgment: false
  - id: D5
    description: "Escolhas do planejador (helper role-agnóstico, plpgsql, TO authenticated) e a BORDA vácua (0 candidaturas mortas/rascunho em PROD) para a review bloqueante do 50-02"
    verification: []
    human_judgment: true
    rationale: "D-12 exige review bloqueante antes do apply; a BORDA não tem população em PROD, então não está provada por execução"

duration: 13min
completed: 2026-10-05
status: complete
---

# Phase 50 Plan 01: Tracer do acesso do recrutador Summary

**Um helper vivo (`public.is_active_rh_user()`, plpgsql DEFINER, `anon` revogado por nome) e `rh_le_candidaturas` reescrita `TO authenticated` sem posse da vaga, provados em PROD num ensaio que aborta: o rh ativo sem vaga própria passa de 0 para 40 candidaturas (11 + 1 + 7 nas três vagas por status), e token antigo, candidato, sem claims e anon continuam vendo o mesmo. A sonda de vistas confirmou isso nas 17 relações, e as 6 mutações mordem. Nada foi aplicado e nada foi enviado ao remoto.**

## Performance

- **Duração:** 13 min (781 s)
- **Início:** 2026-10-05T17:57:05Z
- **Fim:** 2026-10-05T18:10:06Z
- **Tarefas:** 3/3
- **Arquivos:** 6 criados (+ `.planning/WINDOWS.md` com 1 entrada)

## Medições do Step 0 (PROD, só leitura, 2026-10-05)

| O quê | Medido |
|---|---|
| `rh_le_candidaturas` md5(qual‖'\|'‖with_check) | `34060c39f6f61e65613e15a093222691`, igual ao da pesquisa |
| roles / cmd / with_check | `{public}` / SELECT / nulo |
| `to_regprocedure('public.is_active_rh_user()')` | nulo (ausente) |
| topo do ledger | `20261003000001`; nenhuma versão `20261005*` |
| `usuarios_rh` (7) | ativos: `4fceff36` admin (3 vagas, tem linha de candidato), `66412f96` admin (0 vagas), `023abcd6` admin (0 vagas). Inativos: `aaaaaaaa…` admin, `bbbbbbbb…` admin (3 vagas), `4a1fa998` admin, `fba9bc0f` **recrutador** (0 vagas). Nenhum recrutador ativo |
| candidaturas | 40 no total, 40 vivas, **0 mortas/rascunho** |
| Vaga por status com mais candidaturas vivas | ativa `e897f709-d4e7-4f6c-a25b-a433d2eda525` (11) · inativa `629a5f31-aee1-4034-9071-240ae2937250` (1) · arquivada `4601d000-0000-4000-8000-000000000001` (7, a fixture-p46 sintética: dado de teste entra como qualquer outro, D-07) |

**Atores lidos na execução** (com a mesma seleção do smoke): a_ativo `66412f96-1ee9-4621-853e-a79cd7f1b235` (admin ativo sem vaga e sem linha de candidato; não existe recrutador ativo) · a_inativo `fba9bc0f-4053-4eff-bc71-9cc8d1cddbe7` · a_admin `4fceff36-8c42-40a5-ad11-48bf0fc6cc81` · a_cand `4601a000-0000-4000-8000-000000000001` (titular sintético da fixture-p46).

**Varredura de forma** (padrão do CLAUDE.md sobre `supabase/tests/*.sql`): **336 linhas**, igual à do planejamento. Os achados nos objetos da fase são todos escopo: `oper31…:224`, `p44…:357`, `p49_prontidao_prod.sql:142,144`. Nos objetos deste plano, `sec05_08_smokes.sql:189,196` também é escopo, mas o D-01 inverte a premissa dele: depois do apply ele reprova trabalho correto. Já está na tabela «Legacy test disposition» e fica para plano posterior.

## Accomplishments

- **Ensaio tracer (Task 1):** `ENSAIO VERDE … prefixadas=[20261005000001] … smoke50=7/7 · evidencia=01:md5=771ddbeae44a92ad9d4c8b1483d1b9d8,anon=f,auth=t`. A primeira execução levou 789 ms e a re-execução do portão do tracer, 514 ms. `771ddbea…` é o md5 da policy reescrita, medido pelo PÓS-PORTÃO. Sem a migration (`--sem-migracoes`), o smoke reprova em `P50C FAIL (a): … nao existe`, então ele não é vácuo.
- **Vistas (Task 2):** a sonda avulsa deu `sonda ok: 17 relacoes, 4 atores, admin ve tudo`. O ensaio `--vistas` deu `vistas=igual · smoke50=7/7` em 963 ms. Uma mordida ad hoc (`USING (true)`, abortada) reprovou com `P50V FAIL (vistas): candidato/rh_inativo/sem_claims × candidaturas, v_fila_trabalho, v_triagem_panel`, ou seja, a comparação pega exposição também pelas views. Nada persistiu.
- **Mordida (Task 3):** CONTROLE verde (`smoke50=7/7`, 641 ms). Todas as mutações reprovaram na letra declarada: M1 (b) `[inativo,aleatorio,sem_claims,candidato]` em 517 ms; M2 (d) `[inativo]` em 684 ms; M3 (a) em 503 ms; M4 (c) em 522 ms; M5 (f) em 577 ms; M6 (e) em 623 ms. Saída final: `controle verde; 6/6 mutacoes mordem; nada persistiu`. A baseline de persistência cobriu o helper (ausente), o ledger (vazio) e as 14 policies que casam a forma, e saiu idêntica depois.
- **Enumerador:** `enumeracao ok: 7 commit(s) em 587683fc..7b5c91b6` (4 `planning` + 3 `codigo`). As mordidas também foram conferidas: uma allowlist estreita dá `COMMIT ALHEIO: PARAR`, um assunto fora do padrão dá ALHEIO, e um intervalo vazio é recusado.

### Relações da sonda (população como postgres → o que cada ator externo vê)

| relação | pop | anon | sem claims | candidato | rh inativo |
|---|---|---|---|---|---|
| vagas | 15 | 2 | 2 | 2 | 2 |
| usuarios_rh | 7 | 0 | 0 | 0 | 1 |
| candidaturas | 40 | 42501 | 0 | 1 | 0 |
| decisao_final | 7 | 42501 | 0 | 0 | 0 |
| decisao_final_historico | 11 | 42501 | 0 | 0 | 0 |
| historico_candidatura | 79 | 42501 | 0 | 1 | 0 |
| notificacoes_enviadas | 73 | 42501 | 0 | 0 | 0 |
| scores_candidato | 19 | 42501 | 0 | 0 | 0 |
| entrevista_guias | 6 | 42501 | 0 | 0 | 0 |
| entrevista_analises | 14 | 42501 | 0 | 0 | 0 |
| redacoes_candidato | 3 | 0 | 0 | 0 | 0 |
| analise_candidato_vaga | 26 | 0 | 0 | 0 | 0 |
| comparativo_solicitado | 6 | 0 | 0 | 0 | 0 |
| agendamentos_entrevista | 2 | 0 | 0 | 0 | 0 |
| v_fila_trabalho (view) | 20 | 42501 | 0 | 0 | 0 |
| v_triagem_panel (view) | 40 | 42501 | 0 | 1 | 0 |
| v_analises_presas (view, sem invoker) | **0** | 42501 | 0 | 0 | 0 |

`v_analises_presas` tem população 0, então a igualdade dela é vácua hoje, como a pesquisa já havia apontado. O 50-03 passa a view para `security_invoker` (D-05).

## Task Commits

1. **Task 1: TRACER (helper + rh_le_candidaturas + smoke v1, ensaio)** — `358c0090` (feat)
2. **Task 2: sonda de vistas externas + modo --vistas** — `7f4b495b` (feat)
3. **Task 3: runner de mutações M1..M6 + enumerador** — `7b5c91b6` (test)

## Files Created/Modified

- `supabase/migrations/20261005000001_p50_helper_candidaturas.sql`: helper e ALTER POLICY, com PRÉ-PORTÃO (md5 e roles re-medidos, helper ausente, disjunto do admin guardado) e PÓS-PORTÃO (DEFINER/STABLE/search_path, ACL, roles `{authenticated}`, helper no qual, sem `created_by`, admin byte-idêntico, evidência em `p50.evidencia`). **Não aplicada.**
- `supabase/tests/p50_acesso_recrutador_smoke.sql`: smoke v1, 7 cláusulas, com a tabela «O PORTÃO MORDE» preenchida com o medido.
- `supabase/tests/p50_vistas_externas.sql`: sonda só-leitura; resultado na GUC `p50.vistas` e `AS resultado`.
- `scripts/p50_ensaio.cjs`: compositor e runner do ensaio, checagem de persistência e linha de veredito.
- `scripts/p50_mutacoes.cjs`: CONTROLE + M1..M6.
- `scripts/p50_enumera.cjs`: enumerador de commits pré-push.
- `.planning/WINDOWS.md`: 1 entrada `unmet-truth` (BORDA vácua).

## Decisions Made

As escolhas do planejador foram seguidas como escritas (plpgsql, role-agnóstico, `TO authenticated`, versões fixas). Duas decisões do executor ficam visíveis para a review do 50-02:
- **Atores sem linha em `candidatos`.** a_ativo e a_inativo são escolhidos sem linha em `candidatos`. Sem isso, um recrutador inativo que também fosse candidato veria as próprias candidaturas pela policy de candidato, e a negativa (d) reprovaria um trabalho correto. Com a exigência, o que eles veem é obra só de `rh_le_candidaturas`. Se o ator faltar, o smoke falha alto.
- **Reset de GUCs no PREFIXO do ensaio.** O prefixo zera `smoke50.pass`, `smoke50.esperado`, `p50.evidencia`, `p50.vistas` e `p50.vistas_antes`. Uma conexão do pool pode ter guardado esses valores de sessão de um smoke que commitou depois do apply, e o veredito herdaria um número alheio.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correção] Atores do smoke e da sonda isolados da policy de candidato**
- **Found during:** Task 1, ao ler as policies de `candidaturas` (`candidato_le_propria_candidatura` é `{public}` e vale para qualquer claim).
- **Issue:** a seleção do plano para a_ativo e a_inativo não excluía usuários com linha em `candidatos`. Hoje não muda nada, porque os dois escolhidos não têm essa linha. Mas a negativa do token antigo poderia reprovar trabalho correto se o recrutador inativo também fosse candidato.
- **Fix:** a seleção ganhou `AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.user_id)`, nos dois atores do smoke e no a_inativo da sonda.
- **Commit:** `358c0090`, `7f4b495b`

**2. [Rule 2 - Correção] PREFIXO do ensaio zera as GUCs que o veredito lê**
- **Found during:** Task 1
- **Issue:** `set_config(…, false)` de um smoke que commita fica na sessão. Se a conexão do pool for reaproveitada, um ensaio de smoke legado (sem `smoke50.*`) mostraria `smoke50=7/7` de outra execução.
- **Fix:** o PREFIXO ganhou uma linha que zera `smoke50.pass`, `smoke50.esperado`, `p50.evidencia`, `p50.vistas` e `p50.vistas_antes`.
- **Commit:** `358c0090`

**3. [Rule 2 - Correção] Persistência das mutações cobre o corpo e o ACL do helper**
- **Found during:** Task 3
- **Issue:** depois do apply, um M1 (corpo) ou M3 (ACL) que persistisse não mudaria a «existência do helper», que era o que o plano lia.
- **Fix:** a baseline passou a capturar `md5(prosrc)`, `proacl`, `prosecdef` e `proconfig` do helper, além do md5 de cada corpo no ledger.
- **Commit:** `7b5c91b6`

**4. [Escrituração] `requirements-completed: []`**
- O workflow manda copiar `requirements` para `requirements-completed`. O plano diz que nenhum plano da fase edita a linha EXPORT-05 e que quem decide o status é o verificador. Por isso EXPORT-05 está em `requirements-addressed`, e `requirements.mark-complete` não foi rodado.

---

**Total deviations:** 3 auto-fixed (Rule 2) + 1 de escrituração. **Impact:** nenhuma muda o comportamento verificado nem o contrato que os planos seguintes consomem: a linha de veredito, `smoke50.esperado` = '7', os modos do ensaio e a saída das mutações continuam como especificados.

## Issues Encountered

- **BORDA vácua.** A cláusula (f) só julga mortas e rascunhos quando `n_borda > 0`, e em PROD hoje esse número é 0. Por isso a afirmação «rh ativo não vê candidatura morta ou rascunho; o administrador vê» **não está provada por execução**: o smoke publica `n_borda` e segue verde. O plano autorizou isso explicitamente («if > 0»). A lacuna foi registrada em `.planning/WINDOWS.md` como `unmet-truth`. Para fechá-la, seria preciso semear uma candidatura morta numa subtransação revertida (idioma p44), e essa decisão fica para a review do 50-02.
- **Booleanos na evidência saem como `f`/`t`** (`anon=f,auth=t`), porque é a saída padrão de boolean no `format`. É cosmético e não muda o contrato `evidencia=`.

## Next Phase Readiness

- O 50-02 já tem a base da review (`refs/gsd/50-01/base` = `81bfab81`), o runner de mutações e o enumerador. Pontos para a review bloqueante (D-12): as escolhas 1–3 do planejador; a BORDA vácua; o fato de a_cand ser um titular sintético da fixture-p46 e de a vaga arquivada escolhida ser a fixture-p46 (D-07); e o `sec05_08` que vai reprovar depois do apply.
- **Nada aplicado:** o ledger não tem `20261005000001`, o helper está ausente e `rh_le_candidaturas` segue com `34060c39…`/`{public}` (relido depois da Task 3). **Nada enviado:** `origin/main` = `587683fc`, igual ao início. Os commits locais `81bfab81..7b5c91b6` estão à frente do remoto e saem pelo 50-02.

## Self-Check: PASSED

- Os 6 arquivos criados existem: FOUND.
- Os commits `358c0090`, `7f4b495b` e `7b5c91b6` existem: FOUND.
- Critérios de aceite re-executados: estático `OK migration estatica`; tracer `ENSAIO VERDE … smoke50=7/7`; `--vistas` `vistas=igual`; mutações `controle verde; 6/6 mutacoes mordem; nada persistiu`; `enumeracao ok`; `git show --stat` de cada commit lista só os arquivos da sua tarefa.

---
*Phase: 50-acesso-do-recrutador*
*Completed: 2026-10-05*
