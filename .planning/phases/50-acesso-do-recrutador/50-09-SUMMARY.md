---
phase: 50-acesso-do-recrutador
plan: 09
subsystem: testing
tags: [postgres, rls, security-definer, smoke, legado, pares, token-velho, ensaio-que-aborta, varredura-por-forma, vitest-delta, d-01, d-02, d-03]

requires:
  - phase: 50-acesso-do-recrutador
    provides: "50-02: helper vivo + rh_le_candidaturas vivos; 50-03/04/05: migrations 0002/0003/0004 escritas e ensaiadas; 50-06: 5 EFs sem posse (não deployadas); 50-07: smoke v2 13/13; 50-08: 4 smokes de RLS em pares; scripts/p50_ensaio.cjs"
provides:
  - "oper31, funil34, p47_historico, p44 e p49_44 reescritos em PARES (rh ATIVO lido de usuarios_rh age/lê · token velho e sub sem linha recusados), provados pela matriz de 4 execuções e por 18 mordidas"
  - "p44 prova a metade «visível ao RH» do EXPORT-05 (D-03): o rh ativo recebe EXATAMENTE a fila do administrador e vê o órfão"
  - "scripts/p50_varredura.cjs: rede de regressão selecionada por forma (27 smokes), modos ensaio e rodada/--comparar para o apply do 50-10; sondas só-de-resultado embrulhadas"
  - "scripts/p50_vitest_delta.cjs: Vitest julgado por delta contra refs/gsd/50-01/base na mesma execução, com mordida plantada"
affects: [50-10, 50-11]

actuals:
  tokens: 18197
  tasks: 3
  commits: 4
plan_head_before: 7e12730e8b7adf1049edd7a774f008ec228adef3
plan_head_after: e296813ae3ea94db098cad5882a53ed2358bf9c3

tech-stack:
  added: []
  patterns:
    - "Sonda só-de-resultado (linha de booleanos, sem RAISE) é EMBRULHADA pela varredura: a consulta vira a fonte de set_config('p50.evidencia', 'RS:col:true,…') e o sentinela a carrega para fora; verde só com ≥ 1 linha e toda coluna true"
    - "Smoke de resultado (set_config PASS/FAIL + SELECT final) ganha GATE final que RAISE — o SELECT é invisível dentro do envelope que aborta"
    - "Negativa que captura só 42501 passa a reprovar QUALQUER outro SQLSTATE (passou da autorização e algo depois parou) — sem isso o FK do gatilho de auditoria mascarava a quebra do helper"
    - "Delta de Vitest por cópias git archive simétricas (mesmo node_modules, mesmas VITE falsas) e mordida plantada só em HEAD"

key-files:
  created:
    - scripts/p50_varredura.cjs
    - scripts/p50_vitest_delta.cjs
    - .planning/phases/50-acesso-do-recrutador/50-09-SUMMARY.md
  modified:
    - supabase/tests/oper31_rejeitar_candidatura_smokes.sql
    - supabase/tests/funil34_kpis_smokes.sql
    - supabase/tests/p47_historico_smoke.sql
    - supabase/tests/p44_pedidos_dados_smoke.sql
    - supabase/tests/p49_44_resposta_caso_aberto_smoke.sql

key-decisions:
  - "O texto antigo do funil34 saía VERDE no envelope em qualquer estado: o veredito dele vivia só num SELECT final de set_config. Com um gate visível colado, o texto antigo já estava VERMELHO antes da expansão, em (h) — o 0001 vivo já deixa o recrutador A ver a fila de B. O texto novo ganhou o GATE final"
  - "p44 (m): a sanidade «admin vê MAIS que o rh» era a própria regra que a D-03 inverte. Virou: fila do admin ≥ 2 semeados, rh ativo = admin, e o escopo DISTINTO é o token velho (fila 0 = contador 0). O esperado continua 14 e a cláusula continua (m)"
  - "p49_44: o rh ativo substitui o autor da vaga em TODA impersonação rh do arquivo, inclusive (e), (f) e (h). A forma «nenhum sub de vagas.created_by» vale no arquivo inteiro, não só nas letras citadas pelo plano. O esperado continua 9"
  - "p48/p49_prontidao_prod são sondas só-de-resultado: rodadas como estão, sairiam verdes vazias e não provariam o que o plano diz que a varredura prova. A varredura passou a embrulhá-las (25 colunas no p48), e a mordida b04 prova que o embrulho morde"
  - "requirements-completed vazio, como em 50-03..08: o EXPORT-05 é compartilhado com planos ainda abertos (50-10, 50-11)"

patterns-established:
  - "Mordidas fora do repositório por --mutacao= depois de 0002..4, com corpo de função lido da migration e uma substituição exata (exige ocorrência única)"

requirements-completed: []
requirements-addressed: [EXPORT-05]

coverage:
  - id: D1
    description: "oper31, funil34 e p47_historico em pares; matriz de 4 execuções; 9 mordidas na própria letra"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "<verify> da Task 1 → «matriz nova ok: oper31, funil34, p47_historico» — commit 471e57c7; node $SCRATCH/p50_09_mordidas.cjs oper31 funil34 p47 → todas mordem"
        status: pass
    human_judgment: false
  - id: D2
    description: "p44 (D-03: rh ativo = fila do admin, órfão visível) e p49_44 (sem posse, 9 cláusulas); matriz de 4 execuções; 9 mordidas"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "<verify> da Task 2 → «matriz nova ok: p44, p49_44 (9 clausulas)» — commit 88f5539b; git diff refs/gsd/50-expansao/base -- scripts/p49_44_mutacoes.cjs supabase/migrations/20261003000001_* vazio"
        status: pass
    human_judgment: false
  - id: D3
    description: "Varredura por forma: 27 smokes, sem e com a expansão, regressoes=0 investigar=0; mordida plantada sai REGRESSAO"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node scripts/p50_varredura.cjs --modo=ensaio → «varredura: 27 arquivos · ok=17 reescritos=9 pre-existentes=1 inconclusivos=0 · regressoes=0 investigar=0» — commit bd59679d"
        status: pass
    human_judgment: false
  - id: D4
    description: "Suítes locais sem falha nova: Deno das 5 EFs 102/0; Vitest delta novas=0 mordida=ok; tsc 89"
    requirement: EXPORT-05
    verification:
      - kind: unit
        ref: "deno test … 5 EFs → «102 passed | 0 failed»; node scripts/p50_vitest_delta.cjs → «vitest delta: base=81bfab8 2410/2 · head=e296813 2413/2 · pre-existentes=2 · corrigidas=0 · novas=0 · mordida=ok» — commit e296813a; npm run lint → exit 2, 89 error TS"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-10-06
status: complete
---

# Phase 50 Plan 09: Smokes legados das RPCs em pares, varredura por forma e delta das suítes locais — Summary

**Os cinco smokes legados que diziam «só o dono da vaga» foram reescritos em pares. O recrutador ATIVO (lido de `usuarios_rh`) rejeita, lê os KPIs, o histórico, a fila de pedidos e o caso aberto de qualquer vaga. O token de recrutador INATIVO e o sub sem linha são recusados. O p44 agora prova a metade «visível ao RH» do EXPORT-05: a fila do rh ativo é exatamente a do administrador, órfão incluído. Uma varredura por forma rodou os 27 smokes que nomeiam objetos reescritos, sem e com a expansão: `regressoes=0 investigar=0`. O Vitest, julgado contra a base da fase na mesma execução, não tem falha nova (`novas=0 · mordida=ok`). Não houve apply, push, deploy nem escrita persistida.**

## Performance

- **Duração:** ~25 min, de 2026-10-06T02:09:46Z a 2026-10-06T02:33Z.
- **Tarefas:** 3 de 3.
- **Arquivos:** 5 smokes modificados e 2 scripts criados (1117 inserções, 202 remoções).

## Matriz de 4 execuções (ensaio que aborta)

«Velho» é `git show refs/gsd/50-expansao/base:<arq>`; nenhum dos cinco tinha mudado desde a base. «Sem» é `--sem-migracoes` (objetos vivos, com o 0001 no ar). «Com» é o padrão, que prefixa `20261005000002..4`.

| arquivo | (1) velho sem | (2) velho com | (3) novo sem | (4) novo com |
|---|---|---|---|---|
| oper31 | VERDE | VERMELHO `42501: forbidden` em (a): o «dono» era o primeiro `usuarios_rh` por `created_at`, um administrador INATIVO | VERMELHO `OPER-31 FAIL (e): an ACTIVE rh that authors no vaga could NOT reject … (42501 forbidden)` | **VERDE** |
| funil34 | VERDE **vazio** (ver abaixo) | VERDE **vazio** | VERMELHO `SEG-34 FAIL (gate): f=FAIL: recruiter A (ativo, nao-autor) no_show de b04 difere do administrador` | **VERDE** |
| p47_historico | VERDE | VERDE: o (b) antigo usa um sub sorteado, que o helper também nega | VERMELHO `P47H FAIL (b): o rh ATIVO que NAO criou a vaga foi recusado (42501 …)` | **VERDE** |
| p44 | VERDE | VERMELHO `P44 FAIL (k): o recrutador DONO da vaga NAO ve o pedido …` (previsto) | VERMELHO `P44 FAIL (k): o rh ATIVO nao ve os pedidos semeados (com candidatura = f, orfao = f)` | **VERDE** |
| p49_44 | VERDE | VERMELHO `P49C FAIL (b): o RH dono da vaga (bbbbbbbb-…) leu A com estado «42501:forbidden»` (autor inativo) | VERMELHO `P49C FAIL (b): o RH ATIVO nao-autor da vaga (…) leu A com estado «42501:forbidden»` | **VERDE** |

Todas as (4) saíram com `prefixadas=[20261005000002,20261005000003,20261005000004] · aplicadas=[20261005000001]`.

**O verde vazio do funil34 velho.**
- **A causa:** o veredito dele vive em `set_config('smoke34.x', 'PASS'|'FAIL…')` e num `SELECT` final. Dentro do envelope que aborta, o `SELECT` nunca volta, então o arquivo sai VERDE em qualquer estado.
- **O diagnóstico:** colei um gate visível no texto antigo, fora do repositório (`$SCRATCH/old/funil34_com_gate.sql`).
  - Sem a expansão: `SEG-34 FAIL (gate): h=FAIL: recruiter A saw 1 vaga-B fila rows`. **Já estava vermelho antes da fase**, porque o 0001 vivo alargou `rh_le_candidaturas`, por onde passa `v_fila_trabalho`.
  - Com a expansão: `f=FAIL …`, mais (g) e (h).
- **O conserto:** o texto novo tem um GATE final que reprova se qualquer coluna não for `PASS` (um SKIP também reprova).

## Seleção dos atores (todos lidos de `usuarios_rh` na execução; nenhum sub vem de `vagas.created_by`)

- **oper31** `:69-80`:
  - `a_ativo` = `WHERE u.user_id IS NOT NULL AND u.ativo AND u.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id) ORDER BY (u.role = 'recrutador') DESC, u.created_at, u.user_id`;
  - `a_velho` = `WHERE u.user_id IS NOT NULL AND u.role = 'recrutador' AND NOT u.ativo`;
  - o «author» é só o `created_by` da vaga descartável. Nunca é impersonado.
- **funil34** `:57-64`:
  - `recA`/`recB` = `usuarios_rh … AND ativo AND NOT EXISTS (… v.created_by = u.user_id)`, o idioma que já existia;
  - `velho` = `u.role = 'recrutador' AND NOT u.ativo AND NOT EXISTS (… candidatos …)`.
- **p47** `:375-388`:
  - `v_ativo` = `u.ativo AND u.deleted_at IS NULL AND u.user_id IS DISTINCT FROM v_autor AND u.user_id IS DISTINCT FROM v_titular`;
  - `v_velho` = `u.role = 'recrutador' AND NOT u.ativo`;
  - `v_autor` é lido de `vagas.created_by` **só para ser excluído**.
- **p44** `:165-175`:
  - `v_rec_auth` = `u.ativo AND u.deleted_at IS NULL ORDER BY (u.role = 'recrutador') DESC, …`;
  - `v_velho_auth` = `u.role = 'recrutador' AND NOT u.ativo`.
- **p49_44** `:181-191`:
  - `v_ativo` = `u.ativo AND u.deleted_at IS NULL AND u.user_id IS DISTINCT FROM v_autor`;
  - `v_velho` = `u.role = 'recrutador' AND NOT u.ativo`.

## O que cada arquivo diz agora

### oper31_rejeitar_candidatura_smokes.sql (Task 1)

| cláusula | o que exige |
|---|---|
| (a) | rh ATIVO não-autor com justificativa < 50 → `check_violation`; um 42501 ali vira `FAIL (a)` |
| (e ⊖) | token velho e sub `…00fe` sem linha → 42501; **qualquer outro SQLSTATE reprova** («passou da autorização e algo depois parou») |
| (e ⊕) | rh ATIVO que não é autor de nenhuma vaga rejeita a candidatura do autor **com sucesso**; é o reject que (b/d) audita |
| (b/d) | exatamente 1 linha nova de histórico, `auto_rejeitado = false` (RNF-07a), `status = rejeitado` |
| (c), (f) | sem mudança (gatilho de regressão; guarda de papel antes da busca) |

Fixture ausente agora REPROVA (`OPER-31 FAIL (fixture)`); antes era SKIP-com-NOTICE, invisível pela Management API.

### funil34_kpis_smokes.sql (Task 1)

| cláusula | o que exige |
|---|---|
| (f) | B `no_show` total ≥ 1 e taxa não nula; `funil_kpis(vagaA)` (vazia) com taxa nula (guarda de 0 linhas); A `no_show(b04)` = o do administrador, total ≥ 1 |
| (g) | para b01..b04, `funil_kpis(A, b0x)` = `funil_kpis(admin, b0x)`, com a população do admin não vazia; `funil_kpis()` de A = do admin; sem chave de identidade em A nem em B; token velho → KPIs vazios com e sem `p_vaga_id` |
| (h) | A vê d04 em `v_fila_trabalho` com `entrou_etapa_em`; B também; token velho vê 0 |
| GATE | RAISE se a..h não forem todos `PASS` |

A fixture não foi expandida: só ganhou o ator `velho`. Os oito `set_config` e o SELECT final ficaram.

### p47_historico_smoke.sql (Task 1)

**(b) ⊕/⊖:**
- O rh ATIVO não-autor lê o histórico com contagem EXATA contra a população lida como postgres. Uma transição é semeada numa subtransação revertida (`P4704`), então a população é ≥ 1 em qualquer candidatura.
- O token velho e o sub sorteado recebem 42501 (`ok = 2/2`).
- O RESUMO continua 6. A nota de que um guard por `NOT IN` passaria (b) verde e só reprovaria em (c.2) ficou, no cabeçalho e em (c).

### p44_pedidos_dados_smoke.sql (Task 2)

| cláusula | o que exige |
|---|---|
| (k) | admin com ≥ 2 linhas (os semeados); o rh ATIVO vê os dois e recebe **a mesma lista na mesma ordem** (count e md5 de `to_jsonb` de cada linha, `WITH ORDINALITY`); o sub sorteado («rh sem linha ativa em usuarios_rh») e o token velho veem 0 |
| (l) | o órfão é VISÍVEL ao rh ativo e ao administrador (D-03) |
| (m) | fila ≡ contador para admin, rh ativo e token velho; a sanidade nova está na seção de desvios |
| (a)–(j), (n), (z) | sem mudança; esperado 14 |

**(l), citada:**

```sql
  IF v_ve_rec IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P44 FAIL (l): o rh ATIVO NAO ve o pedido de um candidato orfao — a D-03 exige as filas do administrador, orfaos inclusive; o pedido que queima o prazo do Art. 19, II ficaria fora da tela de quem trabalha a fila';
  END IF;
  IF v_ve_admin IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P44 FAIL (l): o ADMINISTRADOR NAO ve o pedido orfao — …';
  END IF;
```

O bullet de (l) no cabeçalho foi invertido com o motivo. A mensagem antiga de (k), «o predicado de escopo nao esta filtrando por created_by», foi reescrita: agora é o helper vivo (D-02).

### p49_44_resposta_caso_aberto_smoke.sql (Task 2)

| cláusula | o que exige |
|---|---|
| (b) | rh ATIVO não-autor lê A `disponivel` com o md5 da fixture |
| (d), fixture povoada | sub sorteado (sem linha ativa), **token velho** (novo), sem claims e candidato titular → 42501 |
| (d), sem papel | sub VÁLIDO (o do rh ativo) sem `app_metadata.role` → 42501 |
| (d), candidatura inexistente | rh ATIVO → **P0002**; rh sem linha ativa → 42501 (novo); administrador → P0002 |

- **9 cláusulas** («Hoje: 9» e o `<> 9` de (z) intactos).
- **No cabeçalho:**
  - a linha M1 da tabela de mutações ganhou a anotação da Phase 50: a posse deixou de existir, e o runner p49_44 é prova histórica PRÉ-apply do `20261003000001`, que não roda mais;
  - o «COMO RODAR» agora manda usar o envelope que aborta.
- `git diff refs/gsd/50-expansao/base -- scripts/p49_44_mutacoes.cjs supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql` → 0 octetos.

## Mordidas: cada negativa reescrita reprova na própria letra

Cada quebra foi injetada com `--mutacao=` depois de 0002..4, no envelope que aborta. O runner fica fora do repositório (`$SCRATCH/p50_09_mordidas.cjs` + `p50_09_mordidas_t2.cjs`). Os corpos mutados são lidos das migrations, com substituição exata que exige ocorrência única. **18 de 18 mordem. Nenhuma persistiu e nenhuma deu timeout.**

| id | quebra | reprova em |
|---|---|---|
| O1 | helper ignora `ativo` | `OPER-31 FAIL (e): token velho` |
| O2 | helper verdadeiro para quem não tem linha | `OPER-31 FAIL (e): rh sem linha … passed the authorization and was stopped later (23503 …)` |
| O3 | `rejeitar_candidatura` sem a linha do helper | `OPER-31 FAIL (e): token velho` |
| F1 | helper ignora `ativo` | `SEG-34 FAIL (gate): g=FAIL: token velho` |
| F2 | `funil_kpis` `v_ve_tudo` sem helper | `g=FAIL: token velho` |
| F3 | `rh_le_candidaturas` sem helper (`v_fila_trabalho`) | `h=FAIL: token velho … saw 1 fixture fila rows` |
| P1 | helper ignora `ativo` | `P47H FAIL (b): a funcao ACEITOU token velho` |
| P2 | helper verdadeiro sem linha | `P47H FAIL (b): a funcao ACEITOU rh sem linha` |
| P3 | `listar_historico_candidatura` sem a linha do helper | `P47H FAIL (b): a funcao ACEITOU token velho` |
| K1 | helper ignora `ativo` | `P44 FAIL (k): o TOKEN VELHO … viu 2` |
| K2 | helper verdadeiro sem linha | `P44 FAIL (k): um rh SEM LINHA ATIVA … viu 2` |
| K3 | `listar_pedidos_dados` sem helper | `P44 FAIL (k): um rh SEM LINHA ATIVA` |
| K4 | `contar_pedidos_dados_pendentes` sem helper | `P44 FAIL (m/token velho): a fila mostra 0 … o contador diz 2` |
| Q1 | helper ignora `ativo` | `P49C FAIL (d): … token velho=«ACEITO:disponivel»` |
| Q2 | helper verdadeiro sem linha | `P49C FAIL (d): … rh sem linha ativa=«ACEITO:disponivel»` |
| Q3 | `ler_resposta_caso_aberto_sjt` sem a linha do helper | `P49C FAIL (d): sobre a fixture POVOADA` |
| Q4 | guarda sem `coalesce` (a M9 de antes) | `P49C FAIL (d): sub VALIDO … ACEITO` |
| Q5 | helper DEPOIS da busca (oráculo de existência) | `P49C FAIL (d): candidatura inexistente — … rh sem linha ativa=«P0002…»` |

**Achado da primeira rodada:** a O2 **não mordeu** na primeira versão.
- **O que aconteceu:** o sub sintético sem linha passou da autorização, e o gatilho de auditoria parou o UPDATE com `23503` (FK de `ator` para `auth.users`).
- **Por que escondia a quebra:** a negativa só capturava `insufficient_privilege`, então o arquivo ficava vermelho por erro cru e não na letra.
- **O conserto:** a (e ⊖) passou a reprovar qualquer SQLSTATE que não seja 42501, e a O2 passou a morder na letra.

## Varredura de regressão por forma (Task 3)

**Nomes vigiados**, lidos por forma das 4 migrations da fase: 18 funções (as 17 RPCs reescritas mais o helper), 14 policies e 1 vista (`v_analises_presas`).
**Arquivos selecionados:** 27 dos 63 `supabase/tests/*.sql`.
**Excluídos por nome:** `p46_fixture_elegivel.sql`, `p48_retroativos_ensaio.sql`, `p49_retroativos_ensaio.sql`, `p50_acesso_recrutador_smoke.sql`, `p50_desfazer_tracer.sql`, `p50_vistas_externas.sql`.

A = sem a expansão (objetos vivos); B = com `20261005000002..4`. Ambas abortam, com `capturar()` antes e depois de cada execução.

| arquivo | A | B | primeira cláusula reprovada | veredito |
|---|---|---|---|---|
| funil34_kpis_smokes.sql | VERMELHO | VERDE | SEG-34 FAIL (gate) → — | esperado-reescrito |
| oper31_rejeitar_candidatura_smokes.sql | VERMELHO | VERDE | OPER-31 FAIL (e) → — | esperado-reescrito |
| p37_fidelidade_schema_smoke.sql | VERDE | VERDE | — | ok |
| p37_lacunas_rls_idempotencia_smokes.sql | VERMELHO | VERDE | P37-LAC FAIL (h) → — | esperado-reescrito |
| p42_revisao_art20_smoke.sql | VERDE | VERDE | — | **ok** |
| p44_pedidos_dados_smoke.sql | VERMELHO | VERDE | P44 FAIL (k) → — | esperado-reescrito |
| p45_motor_exclusao_smoke.sql | VERDE | VERDE | — | ok |
| p47_historico_smoke.sql | VERMELHO | VERDE | P47H FAIL (b) → — | esperado-reescrito |
| p48_candidatura_encerrada_smoke.sql | VERDE | VERDE | — | ok |
| p48_cognitivo_notifica_smoke.sql | VERDE | VERDE | — | ok |
| p48_dedupe_smoke.sql | VERDE | VERDE | — | ok |
| p48_local_ou_link_smoke.sql | VERDE | VERDE | — | ok |
| p48_prazo_reabertura_smoke.sql | VERDE | VERDE | — | ok |
| p48_prontidao_prod.sql (só-resultado, embrulhado) | VERDE | VERDE | — | ok |
| p48_reabertura_smoke.sql | VERDE | VERDE | — | ok |
| p48_rejeicao_triagem_smoke.sql | VERDE | VERDE | — | ok |
| p49_44_resposta_caso_aberto_smoke.sql | VERMELHO | VERDE | P49C FAIL (b) → — | esperado-reescrito |
| p49_analise_vigente_smoke.sql | VERDE | VERDE | — | ok |
| p49_prontidao_prod.sql (só-resultado, embrulhado) | VERDE | VERDE | — | ok |
| p49_prova_prod.sql (só-resultado, embrulhado) | VERMELHO | VERMELHO | ERRO `unrecognized configuration parameter` | pre-existente |
| p49_revisao_por_analise_smoke.sql | VERDE | VERDE | — | ok |
| p49_snapshot_smoke.sql | VERDE | VERDE | — | ok |
| p49_trilha_smoke.sql | VERDE | VERDE | — | ok |
| sec02_smokes.sql | VERDE | VERDE | — | ok |
| sec05_08_smokes.sql | VERMELHO | VERDE | SEC-05 FAIL (analise/ativo) → — | esperado-reescrito |
| seg32_smokes.sql | VERMELHO | VERDE | SEG-32 FAIL (b) → — | esperado-reescrito |
| seg33_agendamento_smokes.sql | VERMELHO | VERDE | SEG-33 FAIL (a) → — | esperado-reescrito |

```
varredura: 27 arquivos · ok=17 reescritos=9 pre-existentes=1 inconclusivos=0 · regressoes=0 investigar=0
```

- **Os 9 «esperado-reescrito»** são exatamente os 5 deste plano mais os 4 do 50-08 (sec05_08, seg32, seg33, p37_lacunas). O git confirma que cada um mudou desde `refs/gsd/50-expansao/base`.
- **p42_revisao_art20:** `ok`, verde sem e com. A asserção REVISAO-05/D-23 não foi tocada. A prova obrigatória continua sendo a cláusula (l) do smoke v2.
- **p49_revisao_por_analise:** `ok`. O 50-05 o tinha listado como possível vermelho, e ele não ficou vermelho.
- **p45_motor_exclusao:** `ok`, sem timeout (1,3 s). **Não é evidência da D-08.** A D-08 fica com os PÓS-PORTÕES dos 50-04/05 e com a conferência ao vivo do 50-10.
- **A varredura morde:**
  - um smoke plantado e removido (`zz_p50_09_mordida_varredura.sql`, VERDE sem e VERMELHO com, porque `anon` perde EXECUTE em `funil_kpis`) saiu `REGRESSAO` e `varredura-parcial: … regressoes=1`;
  - uma execução filtrada por `--so=` imprime `varredura-parcial:` e nunca satisfaz o portão.

### Para o 50-10 (repetir ao vivo; nunca ler como evidência)

- **p49_prova_prod.sql: `pre-existente`**, mesmo erro em A e em B: `unrecognized configuration parameter`.
  - **A causa:** o arquivo exige que quem o roda PREFIXE `SET TRANSACTION READ ONLY; SELECT set_config('p49.t0', '<T0>', false);`, com o T0 do `49-PROVA-PROD.md`, como diz o cabeçalho dele.
  - **O que ele é:** prova de sessão da Phase 49 sobre dados reais depois de T0, não portão de regressão de objeto.
  - **O que fazer:** se o 50-10 quiser lê-lo, rodar com o prefixo de T0, na rodada `antes` e na `depois`.
- **Nenhum `INCONCLUSIVO`.**
- O 50-10 roda `node scripts/p50_varredura.cjs --modo=rodada --rotulo=antes` antes do apply, `--rotulo=depois` depois, e `--comparar` no fim.

## Suítes locais (Task 3)

- **Deno, as 5 EFs:** `ok | 102 passed | 0 failed`. No planejamento eram 100; os 2 testes novos vieram do 50-06.
- **Vitest delta**, linha final do `p50_vitest_delta.cjs`:

```
vitest delta: base=81bfab8 2410/2 · head=e296813 2413/2 · pre-existentes=2 · corrigidas=0 · novas=0 · mordida=ok
```

- **pré-existentes**, falham na base e em HEAD. **Dono: a fila de fecho do M8.** As saídas honestas são construir o executor da purga do ledger de notificações ou retirar a promessa; isentar a entrada não é uma delas.
  - `src/__tests__/promessasComExecutor.test.ts > Deferimento com prazo: a fase dona é conferida contra o roadmap, nos dois sentidos fase inexistente e fase já concluída REPROVAM — medido contra roadmaps sintéticos`
  - `src/__tests__/promessasComExecutor.test.ts > Metade 1 — o registro curado: toda promessa nomeada tem executor provado no disco deferida · o comentário de catálogo do ledger de notificações declara retenção INDE…`
- **corrigidas:** nenhuma.
- **novas:** nenhuma.
- **mordida:** `src/__tests__/p50-mordida-delta.test.ts > p50 mordida do delta reprova por construcao …`, acusada como nova.
- **HEAD tem 3 testes a mais que a base:** são os 3 da sonda `ef-sem-posse-de-vaga` do 50-06.
- `git diff refs/gsd/50-01/base -- src/__tests__/promessasComExecutor.test.ts` → 0 octetos.
- **tsc:** `npm run lint` saiu com exit 2 e 89 `error TS`, igual ao baseline.

## Varredura de forma (CLAUDE.md), nos arquivos deste plano

**População:** 361 linhas na base do plano (`7e12730e`) e 363 depois. Toda diferença é escopo deliberado:

| arquivo | antes → depois | o que mudou |
|---|---|---|
| p44 | 12 → 14 | os `<> 0` das negativas de (k) e (m): token velho e sub sem linha |
| p47 | — | um `v_ok <> 1` virou `<> 2`: as duas recusas de (b) |
| funil34 | 2 → 2 | os `<> 0` antigos de «A não vê B» saíram; entraram o `knockout total <> 0` e o `v_v <> 0` do token velho |

O p49_44 continua com os mesmos 10 achados. O `<> 9` dele é o número de cláusulas do próprio arquivo, escopo.

## Commits das tarefas

1. **Task 1** — oper31, funil34 e p47_historico em pares: `471e57c7` (test)
2. **Task 2** — p44 com órfão visível ao rh ativo e p49_44 sem posse: `88f5539b` (test)
3. **Task 3** — varredura por forma: `bd59679d` (test); delta do Vitest: `e296813a` (test)

## Desvios do plano

1. **[Regra 1] funil34: GATE final visível.**
   - **Problema:** o veredito por `SELECT` final é invisível no envelope que aborta. O texto antigo saía verde vazio, e sem o gate o novo também sairia.
   - **Correção:** gate que reprova se a..h não forem todos PASS. O idioma da fixture e os 8 `set_config` ficaram.
   - **Commit:** 471e57c7.
2. **[Regra 1] p44 (m): sanidade «admin > rh» substituída.**
   - **Problema:** a premissa dela («o órfão deveria ser visível só ao admin») é a regra que a D-03 inverte. Com a expansão, ela reprovaria trabalho correto.
   - **Correção:** a não-trivialidade continua exigida: admin ≥ 2 semeados, rh ativo = admin, e um escopo comprovadamente distinto (token velho: fila 0 = contador 0). A K4 prova que (m) ainda morde. O esperado continua 14.
   - **Por que não parei num checkpoint:** é a mesma inversão que o plano manda fazer em (l), e não um vermelho por motivo imprevisto.
   - **Commit:** 88f5539b.
3. **[Regra 2] Ausência de ator REPROVA, nunca pula.**
   - oper31: SKIP-com-NOTICE virou FAIL.
   - p47, p44 e p49_44: o ator ativo e o velho são exigidos.
   - funil34: o SKIP já reprova pelo gate.
   - **Commits:** 471e57c7, 88f5539b.
4. **[Regra 1] oper31 (e ⊖) reprova qualquer SQLSTATE que não seja 42501.** Foi o achado da mordida O2, descrito acima. **Commit:** 471e57c7.
5. **[Regra 2] p49_44: o rh ativo substitui o autor da vaga também em (e), (f) e (h).** A regra de forma vale no arquivo inteiro. Com o autor inativo, essas letras reprovariam pelo motivo errado. **Commit:** 88f5539b.
6. **[Regra 2] p50_varredura embrulha as sondas só-de-resultado.**
   - **Problema:** p48/p49_prontidao saíam VERDES vazias, e o plano afirma que a varredura prova os literais protegidos delas.
   - **Correção:** o embrulho leva a linha de booleanos pelo sentinela.
   - **Prova:** controle VERDE com 25 colunas true; mutação «rejeitar sem `candidatura_encerrada(`» VERMELHA com `FALSO [b04_rejeitar_usa_predicado=false]`.
   - **Commit:** bd59679d.
7. **Endurecimentos além do plano:**
   - token velho também em p44 (k), p49_44 (d) e na metade «inexistente» com rh sem linha;
   - md5 da lista inteira, na ordem, em p44 (k);
   - os 4 B-vagas mais o `funil_kpis()` sem filtro em funil34 (g);
   - 18 mordidas, com o runner fora do repositório para não sair de `files_modified`.

**Total de desvios:** 6 consertos (3 de Regra 1, 3 de Regra 2) mais endurecimentos. Nenhum afrouxa um portão, nenhuma cláusula foi apagada e nenhum esperado foi baixado (p44 14, p47 6, p49_44 9).

## Problemas encontrados

- **Um script de edição Python abortou na própria asserção final**, antes de escrever (`v_dono` remanescente). O arquivo não foi tocado, como o `git diff` confirmou. Refeito com a asserção no fim.
- **Nenhum vermelho por motivo imprevisto em portão**, então não houve checkpoint. Os vermelhos de antes da fase (oper31 e p49_44 pelo autor inativo, funil34 (h) escondido) estão diagnosticados acima e foram resolvidos pela reescrita que o plano pede.

## Stubs conhecidos

Nenhum.

## Sinalizações de ameaça

Nenhuma superfície nova.
- **T-50-35:** mitigada pela varredura com exit 1 em REGRESSAO/INVESTIGAR e pela mordida plantada.
- **T-50-36:** mitigada pela matriz, pelas 18 mordidas e pelos esperados mantidos; p42 e p49_44 estão na varredura.
- **T-50-37:** teto do envelope (3 s / 5 s), uma repetição; nenhum timeout.
- **T-50-50 e T-50-51:** mitigadas pelo `p50_vitest_delta.cjs`:
  - sem lista literal;
  - VITE falsas, sem copiar, ligar nem ler o arquivo de ambiente real;
  - diretórios temporários removidos (conferido: nenhum `p50-vdelta-*` restante).
- **T-50-SC:** nenhuma instalação de pacote.

## Prontidão para a próxima etapa

- **50-10:**
  - os 9 arquivos reescritos (50-08 e 50-09) devem ficar verdes DEPOIS do apply, rodados com `--sem-migracoes`;
  - a varredura em modo rodada (`antes`/`depois`/`--comparar`) é o instrumento para o apply;
  - `p49_prova_prod` está listado acima;
  - os 2 pré-existentes do Vitest seguem com dono no M8.
- **Ledger p50**, lido só para leitura depois de todos os ensaios: `["20261005000001"]`. Não houve apply, push, deploy nem escrita persistida.

## Self-Check: PASSED

- FOUND: supabase/tests/{oper31_rejeitar_candidatura_smokes,funil34_kpis_smokes,p47_historico_smoke,p44_pedidos_dados_smoke,p49_44_resposta_caso_aberto_smoke}.sql, scripts/p50_varredura.cjs, scripts/p50_vitest_delta.cjs
- FOUND commits: 471e57c7, 88f5539b, bd59679d, e296813a. `git rev-list --count 7e12730e..e296813a` = 4
- Verifies: Task 1 «matriz nova ok: oper31, funil34, p47_historico»; Task 2 «matriz nova ok: p44, p49_44 (9 clausulas)»; Task 3 varredura `regressoes=0 investigar=0` (rc 0), Deno + delta (rc 0), lint (rc 0, 89)
