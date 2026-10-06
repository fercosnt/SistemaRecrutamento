---
phase: 50-acesso-do-recrutador
plan: 05
subsystem: database
tags: [postgres, security-definer, rpc, supabase, ensaio-que-aborta, portao, d-04, d-08, d-23]

requires:
  - phase: 50-acesso-do-recrutador
    provides: "50-02: helper public.is_active_rh_user() VIVO em PROD (ledger 20261005000001); p50_ensaio.cjs (--migracoes, --vistas, evidencia=), smoke p50 v1; 50-03/50-04: padrão do corpo vivo transformado por programa e do pós-portão por forma"
provides:
  - "migration 20261005000004 (NÃO aplicada): 11 CREATE OR REPLACE das RPCs de escrita a partir do pg_get_functiondef VIVO — linha de posse → `IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN`; D-04 (as 2 guardas fail-open fechadas, anon sem EXECUTE nas 5 que o tinham); BORDA de save_entrevista_guia_edits (IF NOT FOUND)"
  - "PRE/POS-PORTAO com cauda do corpo byte-idêntica (md5 do texto depois da linha de autorização), literais protegidos, ordem guarda×busca, ACL = capturada menos anon, D-23, D-08 e REVISAO-05 por impressão digital da linha inteira de pg_proc"
  - "ensaiada em PROD numa requisição que aborta: vistas=igual, smoke50=7/7, 05:d08=igual:n=2; spot-check D-04 verde (11 sondas); controle negativo vermelho; 7 mutações mordidas; BORDA provada; empilhado 0002+0003+0004 verde"
affects: [50-07, 50-08, 50-09, 50-10]

actuals:
  tokens: 19213
  tasks: 3
  commits: 1
plan_head_before: c6aa48a99b36a2f8cf285de161f47861bf10c531
plan_head_after: 3bf104338237092d510cc5589a87759df3c48dce

tech-stack:
  added: []
  patterns:
    - "CAUDA byte-idêntica: o pré-portão guarda md5 do corpo VIVO a partir do THEN da linha de posse; o pós-portão recalcula a partir do THEN da linha nova. Prova, para todo o resto do corpo (RAISE, D-23, mínimos, RNF-07a, transições, escritas), que nada mudou — sem lista de literais a manter"
    - "Ordem guarda×busca capturada como booleano (posição de `NOT IN ('rh', 'administrador')` < posição de `FROM public.`) e exigida igual depois"
    - "GUCs por ordinal (`p50.p05.f<n>.*`) — duas sobrecargas com o mesmo proname colidiriam numa chave por nome"

key-files:
  created:
    - supabase/migrations/20261005000004_p50_rpcs_escrita.sql
    - .planning/phases/50-acesso-do-recrutador/50-05-SUMMARY.md
  modified: []

key-decisions:
  - "A forma fail-closed `v_role IS NULL OR v_role NOT IN (…)` (rejeitar_candidatura, liberar_cognitivo, revogar_cognitivo, save_entrevista_guia_edits, upsert_pergunta_opcoes_metadata) virou `coalesce(v_role, '') NOT IN (…)`. Mesma recusa para todo valor e mesma mensagem. Sem isso, o must-have «no `v_role NOT IN (` without coalesce» não se cumpria nessas 5"
  - "Quando a coluna de autoria era a única do SELECT, ele virou `PERFORM 1` com o MESMO FROM/JOIN/WHERE, e o IF NOT FOUND seguinte ficou byte-idêntico. Os joins em vagas ficaram em todas as 11 (nenhuma linha muda de existir)"
  - "save_entrevista_guia_edits: além de apagar a posse, ganhou a linha do helper. O must-have exige is_active_rh_user nas 11. É redundante, porque o papel dela já vem de usuarios_rh ativo, mas é inofensivo"
  - "Tipos qualificados com public. no cabeçalho (registrar_decisao, rejeitar_candidatura) e nas assinaturas de REVOKE/GRANT/COMMENT; não muda prosrc nem propriedades"
  - "Task 3 sem commit próprio: o primeiro ensaio deu verde já antes do commit da Task 2, então não houve `fix(50-05)`. Os arquivos de spot-check são temporários por desenho do plano"

patterns-established:
  - "Mordida do pós-portão por cópia mutada no scratchpad, passada por --migracoes=<caminho>; agora com mutação de CAUDA (errcode trocado depois da linha de autorização) e de helper só em comentário"

requirements-completed: []
requirements-addressed: [EXPORT-05]

coverage:
  - id: D1
    description: "Migration 20261005000004 com os 11 corpos vivos e só a autorização trocada; parcial e estática verdes"
    requirement: EXPORT-05
    verification:
      - kind: other
        ref: "Task 1 <verify> → 'OK parcial: 6 funcoes + PRE-PORTAO'; Task 2 <verify> → 'OK migration estatica: 11 funcoes de escrita' — commit 3bf10433"
        status: pass
    human_judgment: false
  - id: D2
    description: "Ensaio em PROD que aborta: PRE/POS-PORTAO, vistas=igual, smoke v1 7/7, 05:d08=igual:n=2, ledger inalterado"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node scripts/p50_ensaio.cjs --vistas --migracoes=supabase/migrations/20261005000004_p50_rpcs_escrita.sql supabase/tests/p50_acesso_recrutador_smoke.sql"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-04/D-01/D-02: anon recusado sem chegar ao corpo; papel nulo com sub válido e claim rh sem sub → 42501; token de recrutador inativo → 42501; rh ativo não-dono passa pela autorização (aceito / P0001 / 23514); controle negativo sem o 0004 vermelho em 8 rótulos"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node scripts/p50_ensaio.cjs --migracoes=…0004 $TMPDIR/p50_05_d04.sql (verde) ; --sem-migracoes (P50S FAIL)"
        status: pass
    human_judgment: false
  - id: D4
    description: "O pós-portão morde: 7 mutações (guarda fail-open, D-23 enfraquecido, REVOKE anon removido, GRANT no motor D-08, cauda alterada, helper só em comentário, BORDA revertida) → 7 vermelhos na checagem certa"
    verification:
      - kind: integration
        ref: "bites/b1..b7 por --migracoes=<cópia mutada>"
        status: pass
    human_judgment: false
  - id: D5
    description: "BORDA: save_entrevista_guia_edits numa candidatura de vaga sem autor — vivo P0002 «nao encontrada» até para administrador; com o 0004, aceito"
    verification:
      - kind: integration
        ref: "$TMPDIR/p50_05_borda.sql com --migracoes=…0004 (verde) e --sem-migracoes (P50S FAIL (borda): [orfa] P0002)"
        status: pass
    human_judgment: false

duration: ~55min
completed: 2026-10-05
status: complete
---

# Phase 50 Plan 05: RPCs de escrita para rh ativo — Summary

**Com esta migration, o recrutador ativo passa a agir em qualquer candidatura: decidir, rejeitar, liberar e revogar o cognitivo, salvar a avaliação da entrevista e o guia, revisar a redação, reprocessar a análise e configurar os metadados das opções.**

- **Como:** a migration `20261005000004` reescreve as 11 RPCs SECURITY DEFINER a partir do `pg_get_functiondef` vivo. Troca só a linha de autorização.
- **D-04:** fecha as duas guardas que falhavam ABERTO e tira o EXECUTE de `anon` das 5 que o tinham.
- **Prova na própria transação:** o resto de cada corpo ficou byte a byte o mesmo, e o D-23, o REVISAO-05 e o motor de exclusão (D-08) não mudaram.
- **Ensaio em PROD, numa requisição que aborta:** `vistas=igual`, `smoke50=7/7`, `05:d08=igual:n=2`.
- **Não aplicada.**

## Performance

- **Duração:** ~55 min
- **Concluído:** 2026-10-05 (UTC 2026-10-06T01:08Z)
- **Tarefas:** 3/3
- **Arquivos:** 1 migration criada (1360 linhas, 79 283 octetos, md5 `114ea102e29a4cee44623dc52bf75533`)

## Medição em PROD (re-medida nesta execução, só leitura)

Os 11 md5 batem com os do contexto do plano. As 11 têm a mesma configuração:
- plpgsql e SECURITY DEFINER, `search_path=""`, volatilidade `v`, dono postgres;
- sem EXECUTE para PUBLIC;
- authenticated e service_role com EXECUTE.

| função | md5(prosrc) | anon EXECUTE | ACL viva |
|---|---|---|---|
| `confirmar_revisao_entrevista(uuid)` | 43df21b884807c2f9ee57d45bdd70065 | não | postgres, authenticated, service_role |
| `liberar_cognitivo(uuid,text)` | 5d72a3d5137c82d29e49ef8e9f61e13d | não | postgres, authenticated, service_role |
| `registrar_decisao(uuid,decisao_final_resultado,text)` | 5042fa9331f21ad873cb462208490dcc | não | postgres, authenticated, service_role |
| `rejeitar_candidatura(uuid,motivo_rejeicao_rh,text)` | 10498a0bef7c8381d58f7634019778b1 | **SIM** | postgres, **anon**, authenticated, service_role |
| `reprocessar_analise(uuid)` | e0c0f259bff9a9b3b404ef8b26255f17 | **SIM** | postgres, **anon**, authenticated, service_role |
| `revogar_cognitivo(uuid,text)` | 7bf59ed2770a48463b0bdce1ab582393 | não | postgres, authenticated, service_role |
| `salvar_avaliacao_entrevista(uuid,jsonb,text)` | 874a3244acd9f1426ee1a42af7de7c4a | não | postgres, authenticated, service_role |
| `salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` | 53393f15f0901703203bb315795e5e09 | não | postgres, authenticated, service_role |
| `salvar_revisao_redacao(uuid,text,text,jsonb)` | 765e2beca39b7479f960986dcee3f1cb | **SIM** | postgres, **anon**, authenticated, service_role |
| `save_entrevista_guia_edits(uuid,text,jsonb)` | bfb84079af12449d9563f0ea7af75be7 | **SIM** | postgres, **anon**, authenticated, service_role |
| `upsert_pergunta_opcoes_metadata(uuid,jsonb)` | c6f8728f78a550d92c1af473343a6797 | **SIM** | postgres, **anon**, authenticated, service_role |

**Lista de REVOKE de anon, re-medida:** `rejeitar_candidatura`, `reprocessar_analise`, `salvar_revisao_redacao`, `save_entrevista_guia_edits`, `upsert_pergunta_opcoes_metadata`. É a mesma do plano.

**D-08:** as 2 sobrecargas (`plano_exclusao_titular(uuid)` e `anonimizar_candidato(uuid,boolean)`) têm md5(prosrc) `35d45141…` e `46248544…`. As impressões digitais `3ecb2df4…` e `41b609f3…` são as mesmas do 50-04.

**Ledger p50**, lido antes e depois de todos os ensaios: `["20261005000001"]`.

**Fixtures disponíveis em PROD**, contagem só de leitura:
- `usuarios_rh`: 0 recrutadores ativos, 1 recrutador inativo, 3 administradores ativos e 3 inativos;
- 3 redações, 9 candidaturas rejeitadas vivas, 17 candidaturas vivas sem decisão;
- 9 vagas órfãs.

## Linhas trocadas, por função (antigo → novo, do `diff -U0` dump × corpo novo)

Os corpos foram gerados por programa: o dump mais substituições exatas, cada uma exigindo 1 ocorrência do trecho antigo. Há três formas de linha nova.

- **[H] a linha nova da autorização:** `IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN`. Vem precedida de 2 a 3 linhas de comentário P50 / D-0x. O RAISE da linha seguinte NÃO mudou, nem na mensagem nem na grafia do errcode.
- **[G1]** `IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN` → `IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN`.
- **[G2]** `IF v_role NOT IN ('rh', 'administrador') THEN` → `IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN`, com 2 linhas de comentário P50 / D-04.

### Task 1 (6)

1. **`registrar_decisao`**
   - cabeçalho: `p_decisao decisao_final_resultado` → `p_decisao public.decisao_final_resultado`, e `RETURNS decisao_final` → `RETURNS public.decisao_final`;
   - DECLARE: sai `v_vaga_owner uuid;`;
   - `SELECT v.created_by\n    INTO v_vaga_owner\n    FROM public.candidaturas c` → `PERFORM 1\n    FROM public.candidaturas c`. O JOIN, o WHERE e o `IF NOT FOUND` ficaram iguais;
   - `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` → [H];
   - comentários (1)/(2) reescritos;
   - **D-23 (2b) byte-idêntico** (está na cauda).
2. **`rejeitar_candidatura`**
   - cabeçalho: `p_motivo motivo_rejeicao_rh` → `p_motivo public.motivo_rejeicao_rh`;
   - sai `v_vaga_owner uuid;`;
   - [G1];
   - `SELECT v.created_by, c.etapa_atual, c.status\n    INTO v_vaga_owner, v_etapa, v_status` → `SELECT c.etapa_atual, c.status\n    INTO v_etapa, v_status`;
   - `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` → [H];
   - a guarda de papel continua ANTES da busca (oper31 (f)).
3. **`liberar_cognitivo`**
   - sai `v_owner  uuid;`;
   - [G1];
   - `SELECT v.created_by, c.status INTO v_owner, v_status` → `SELECT c.status INTO v_status`;
   - `IF v_role = 'rh' AND v_owner IS DISTINCT FROM v_uid THEN` → [H];
   - o comentário «rh so libera na propria vaga…» foi trocado.
4. **`revogar_cognitivo`**
   - sai `v_owner uuid;`;
   - [G1];
   - `SELECT v.created_by INTO v_owner` → `PERFORM 1` (mesmo FROM/JOIN/WHERE e mesmo `IF NOT FOUND`);
   - `IF v_role = 'rh' AND v_owner IS DISTINCT FROM v_uid THEN` → [H].
5. **`reprocessar_analise`**
   - `v_vaga_owner    uuid;` → `v_uid           uuid := (select auth.uid());`;
   - `SELECT c.vaga_id, v.created_by\n    INTO v_vaga_id, v_vaga_owner` → `SELECT c.vaga_id\n    INTO v_vaga_id`. O `c.vaga_id` e o join ficam, porque o payload do `net.http_post` usa `v_vaga_id`;
   - **[G2] (D-04)**;
   - `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` → [H].
6. **`confirmar_revisao_entrevista`**
   - sai `v_vaga_owner uuid;`;
   - `SELECT v.created_by, ea.superada_em, ea.status_analise, ea.competencias\n    INTO v_vaga_owner, v_superada, v_status, v_comp` → `SELECT ea.superada_em, ea.status_analise, ea.competencias\n    INTO v_superada, v_status, v_comp`;
   - no comentário, «MESMO SELECT da posse» passou a «… da busca»;
   - `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` → [H].

### Task 2 (5)

7. **`salvar_avaliacao_entrevista(uuid,jsonb,text)`**
   - sai `v_vaga_owner uuid;`;
   - saem o comentário «Posse ANTES da contagem…», o `SELECT v.created_by INTO v_vaga_owner FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id WHERE c.id = p_candidatura_id;` (servia só à posse e não tinha teste de inexistência) e a linha de posse. Entra [H], ANTES da contagem de vigentes;
   - `entrevista_analise_vigente` e a delegação ficam byte-idênticos (cauda).
8. **`salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)`**
   - sai `v_vaga_owner uuid;`;
   - `SELECT ea.id, v.created_by, ea.superada_em, …\n    INTO v_analise_id, v_vaga_owner, v_superada, …` → `SELECT ea.id, ea.superada_em, …\n    INTO v_analise_id, v_superada, …`. `FOR UPDATE OF ea` e a condição IDOR ficam;
   - `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` → [H].
9. **`save_entrevista_guia_edits`**
   - sai `v_vaga_owner uuid;`;
   - [G1];
   - `-- Ownership: rh must OWN the vaga…\n  SELECT v.created_by INTO v_vaga_owner\n    FROM public.candidaturas c` → comentário BORDA + `PERFORM 1\n    FROM public.candidaturas c`;
   - **`IF v_vaga_owner IS NULL THEN` → `IF NOT FOUND THEN`** (BORDA);
   - `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` → [H].
10. **`salvar_revisao_redacao`**
    - `v_vaga_owner uuid;` → `v_uid        uuid := (select auth.uid());`;
    - `SELECT v.created_by, true, r.candidatura_id\n    INTO v_vaga_owner, v_found, v_candidatura_id` → `SELECT true, r.candidatura_id\n    INTO v_found, v_candidatura_id`;
    - **[G2] (D-04)**;
    - `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` → [H].
11. **`upsert_pergunta_opcoes_metadata`** (D-06)
    - sai `v_owner        uuid;`;
    - [G1];
    - `SELECT v.status, v.created_by\n    INTO v_status, v_owner` → `SELECT v.status\n    INTO v_status`;
    - `IF v_role = 'rh' AND v_owner IS DISTINCT FROM (select auth.uid()) THEN` → [H]. Fica depois do bloqueio por `rascunho`, como antes.

**ACL (D-04).** Para as 5 com anon: `REVOKE ALL … FROM PUBLIC; REVOKE ALL … FROM anon; GRANT EXECUTE … TO authenticated, service_role;`. As outras 6 ficam com a ACL intocada.

**COMMENT ON FUNCTION.** Os 11 trocaram só as frases de posse pela regra P50 / D-0x. `revogar_cognitivo` não tinha comentário e ganhou um.

## Portões da migration

- **PRE-PORTAO:**
  - exige o helper e os 11 md5(prosrc), numa lista `VALUES` comentada como escopo deliberado;
  - recusa ACL com PUBLIC;
  - exige exatamente 1 linha de posse numa das 3 formas medidas.
- **PRE-PORTAO, capturas por ordinal:**
  - propriedades: config, volatilidade, DEFINER, linguagem, dono, kind, strict, leakproof, parallel, cost, rows, retset, result, args e idargs;
  - ACL;
  - literais protegidos presentes no código vivo (18 candidatos: os 7 do plano, mais os textos das prontidões p48/p49 e os mínimos de justificativa);
  - md5 da cauda;
  - a ordem guarda×busca;
  - impressões digitais D-08 (piso de 2 nomes) e REVISAO-05 (`responder_revisao_decisao`; piso: existe).
- **POS-PORTAO, por função:**
  - (a) [H] no código, exatamente 1 vez;
  - (b) sem `created_by` no corpo inteiro e sem `v_owner`/`v_vaga_owner` no código;
  - (c) sem `v_role NOT IN (` no código, e com `coalesce(v_role, '') NOT IN ('rh', 'administrador')` presente;
  - (d) propriedades iguais às capturadas;
  - (e) sem EXECUTE para PUBLIC e para anon; com EXECUTE para authenticated e service_role; conjunto (beneficiário, privilégio) = o capturado MENOS anon;
  - (f) cada literal capturado continua presente;
  - (g) md5 da cauda igual;
  - (h) ordem guarda×busca igual;
  - (i) [H] antes da primeira escrita ou despacho;
  - (j) específicos: [G2] e `v_uid := (select auth.uid())` nas duas do D-04; `PERFORM 1 … IF NOT FOUND` na do guia; `d.por_usuario = v_uid`, `h.por_usuario = v_uid` e `(D-23)` em `registrar_decisao`.
- **POS-PORTAO, depois do laço:** D-08 e REVISAO-05 recalculados. Se o D-08 diferir, `P50-05 POS-PORTAO: D-08 — anonimizar_candidato/plano_exclusao_titular mudaram dentro desta migration`.
- **Evidência:** `05:<sig>=<md5 novo>,…`, `05:anon=false` e `05:d08=igual:n=2`.

**md5(prosrc) novos** (de `evidencia=`):

| função | md5 novo |
|---|---|
| `registrar_decisao(uuid,decisao_final_resultado,text)` | 7da195353109938c8e572cb61800de06 |
| `rejeitar_candidatura(uuid,motivo_rejeicao_rh,text)` | 75c0d3d0451a6f8c1e1a4425208daa4a |
| `liberar_cognitivo(uuid,text)` | 72f291801318f26a4e3e2ec7067ee246 |
| `revogar_cognitivo(uuid,text)` | 25c167866ecf37135bd58af52a6ccc1c |
| `reprocessar_analise(uuid)` | 43491cc94c126b487fe2f56e53bc0a5d |
| `confirmar_revisao_entrevista(uuid)` | 58268774d0bc4f802353db2012f461be |
| `salvar_avaliacao_entrevista(uuid,jsonb,text)` | 924dfb99c5c4f8be77bcb990c1b8e742 |
| `salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` | 070e0f1b523bc4879204d5c23da1a2dd |
| `save_entrevista_guia_edits(uuid,text,jsonb)` | 92b029eda2f0e16d1e2162732fdd1bf8 |
| `salvar_revisao_redacao(uuid,text,text,jsonb)` | 04b116b3b68f8fba10b10e8a6ae16614 |
| `upsert_pergunta_opcoes_metadata(uuid,jsonb)` | 63464a3630f62ff5678a4645eb5cc03a |

## Verificação da Task 3 (comandos byte a byte do plano)

**Verify 1** (rc=0, 1125 ms, sem repetição, nenhum 40001/TIMEOUT/PERSISTIU):

```
ENSAIO VERDE: supabase/tests/p50_acesso_recrutador_smoke.sql · prefixadas=[20261005000004] · aplicadas=[20261005000001] · ausentes=[20261005000002,20261005000003] · vistas=igual · smoke50=7/7 · evidencia=05:registrar_decisao(uuid,decisao_final_resultado,text)=7da195353109938c8e572cb61800de06,rejeitar_candidatura(uuid,motivo_rejeicao_rh,text)=75c0d3d0451a6f8c1e1a4425208daa4a,liberar_cognitivo(uuid,text)=72f291801318f26a4e3e2ec7067ee246,revogar_cognitivo(uuid,text)=25c167866ecf37135bd58af52a6ccc1c,reprocessar_analise(uuid)=43491cc94c126b487fe2f56e53bc0a5d,confirmar_revisao_entrevista(uuid)=58268774d0bc4f802353db2012f461be,salvar_avaliacao_entrevista(uuid,jsonb,text)=924dfb99c5c4f8be77bcb990c1b8e742,salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)=070e0f1b523bc4879204d5c23da1a2dd,save_entrevista_guia_edits(uuid,text,jsonb)=92b029eda2f0e16d1e2162732fdd1bf8,salvar_revisao_redacao(uuid,text,text,jsonb)=04b116b3b68f8fba10b10e8a6ae16614,upsert_pergunta_opcoes_metadata(uuid,jsonb)=63464a3630f62ff5678a4645eb5cc03a;05:anon=false;05:d08=igual:n=2 · 1125 ms
```

O resultado foi `vistas=igual`, sem fechamento: o 0004 sozinho não muda nenhuma vista de relação.

**Verify 2: spot-check D-04** (rc=0, 642 ms). O arquivo é `$TMPDIR/p50_05_d04.sql`, temporário e NÃO commitado; a cláusula permanente é a (i) do 50-07. Atores e ids foram lidos em tempo de execução:
- **ativo:** linha `usuarios_rh` ativa sem vaga própria. Hoje é um administrador ativo, impersonado com o claim `rh`, a mesma escolha do smoke p50.
- **inativo:** o único recrutador inativo.
- **ids:** uma candidatura viva sem decisão, uma rejeitada viva e uma redação.

| sonda | chamada | resultado (SQLSTATE: prefixo) |
|---|---|---|
| (1) anon | `reprocessar_analise` | `42501: permission denied for function reprocessar_analise` |
| (1) anon | `salvar_revisao_redacao` | `42501: permission denied for function salvar_revisao_redacao` |
| (2) sub válido, sem `app_metadata.role` | `reprocessar_analise` | `42501: forbidden` |
| (2) sub válido, sem `app_metadata.role` | `salvar_revisao_redacao` | `42501: forbidden` |
| (2b) claim `rh`, sem sub | `reprocessar_analise` | `42501: forbidden` |
| (2b) claim `rh`, sem sub | `salvar_revisao_redacao` | `42501: forbidden` |
| (3) claim `rh` + recrutador INATIVO | `liberar_cognitivo` | `42501: forbidden` |
| (3) claim `rh` + recrutador INATIVO | `registrar_decisao` (justificativa válida) | `42501: forbidden` |
| (4) controle positivo, rh ativo não-dono | `registrar_decisao` em_espera | **ACEITO** (`por_usuario` = o ativo; desfeito pelo aborto) |
| (4) controle positivo | `liberar_cognitivo` numa rejeitada | `P0001: candidatura rejeitado — nao se libera avaliacao…` (depois da autorização) |
| (4) controle positivo | `rejeitar_candidatura` numa encerrada | `23514: candidatura já encerrada (etapa inscricao, …` (depois da autorização) |

**Controle negativo:** o mesmo spot-check com `--sem-migracoes`, contra os corpos vivos, deu VERMELHO.

```
P50S FAIL (d04): [anon_reprocessar,anon_redacao,semrole_reprocessar,semrole_redacao,semsub_reprocessar,ativo_decisao,ativo_liberar_rejeitada,ativo_rejeitar_encerrada]
```

O fail-open é real em PROD hoje:
- anon e um chamador sem papel CHEGAM ao corpo de `reprocessar_analise` (ACEITO) e de `salvar_revisao_redacao` (ACEITO);
- o rh ativo não-dono recebe 42501 nas 3 chamadas do controle positivo.

Tudo isso rodou dentro do aborto. O `net.http_post` só enfileira numa tabela transacional e não foi despachado.

## O portão morde (cópias mutadas via `--migracoes=<scratch>`, ensaios que abortam)

| mutação | resultado |
|---|---|
| b1: `reprocessar_analise` volta a `IF v_role NOT IN (…)` | `P50-05 POS-PORTAO: public.reprocessar_analise(uuid) tem guard \`v_role NOT IN (\` sem coalesce — falha ABERTO com v_role nulo (D-04)` |
| b2: D-23 `d.por_usuario = v_uid` → `d.por_usuario IS NOT NULL` | `… registrar_decisao(…) perdeu o literal protegido «d.por_usuario = v_uid» (presente no corpo vivo)` |
| b3: sem o `REVOKE … save_entrevista_guia_edits … FROM anon` | `… anon tem EXECUTE em public.save_entrevista_guia_edits(uuid,text,jsonb) (D-04)` |
| b4: `GRANT EXECUTE … plano_exclusao_titular(uuid) TO anon` antes do pós-portão | `… D-08 — anonimizar_candidato/plano_exclusao_titular mudaram dentro desta migration (antes «…3ecb2df4…», depois «…0835242b…»)` |
| b5: `liberar_cognitivo` com errcode `P0001` → `P0002` DEPOIS da autorização | `… liberar_cognitivo(uuid,text) mudou DEPOIS da linha de autorizacao — o corpo a partir dali tinha de ser o vivo, byte a byte` |
| b6: `salvar_revisao_redacao` com `AND false` e o helper só num comentário | `… nao tem exatamente uma «IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN» no codigo …` |
| b7: guia com `IF p_guia IS NULL AND NOT FOUND` | `… save_entrevista_guia_edits sem «PERFORM 1 … IF NOT FOUND» — a candidatura de vaga sem autor voltaria a ser «nao encontrada»` |

## Além do plano (ensaios que abortam)

- **BORDA:** `$TMPDIR/p50_05_borda.sql` chama, como administrador ativo, `save_entrevista_guia_edits` numa candidatura de vaga órfã.
  - Com o 0004: `borda:orfa=ACEITO`.
  - Sem o 0004: `P0002: candidatura 04864650-… nao encontrada`, até para o administrador.
- **Empilhado** `--vistas --migracoes=0002,0003,0004`, com o smoke e o spot-check D-04: VERDE.
  - `vistas=igual+fechou[anon.public.decisao_final_historico,anon.public.entrevista_analises,anon.public.entrevista_guias,anon.public.scores_candidato]`: exatamente os 4 fechamentos conhecidos do 0002;
  - `smoke50=7/7`, `04:d08=igual:n=2`, `05:d08=igual:n=2`;
  - as 11 sondas d04 iguais às do ensaio isolado.

## Commits deste plano

| hash | tipo | o quê |
|---|---|---|
| 3bf10433 | feat(50-05) | migration 20261005000004 (Tasks 1+2). O `git show --stat` lista só o arquivo da migration |

**Tasks 1 e 3 sem commit próprio:**
- **Task 1:** o plano manda não commitar; a Task 2 completa e commita o arquivo.
- **Task 3:** o primeiro ensaio deu verde. Não houve `fix(50-05)`, e os spot-checks são temporários.

## Desvios do plano

1. **Guarda «IS NULL OR» → `coalesce`, em 5 funções.**
   - **O problema:** o must-have exige «no `v_role NOT IN (` without `coalesce`» entre as 11. Em PROD, 5 delas usavam a forma fail-closed `v_role IS NULL OR v_role NOT IN (…)`, que casa o padrão. O texto da ação não as previa.
   - **O que fiz:** troquei pela forma `coalesce(v_role, '') NOT IN (…)`. A semântica é a mesma (nulo → recusa; não nulo → idêntico), com a mesma mensagem e o mesmo errcode. É linha de autorização, não regra de negócio.
   - **Por que não mudei o portão:** a alternativa seria abrir uma exceção na checagem (c). Isso é mudar portão sozinho, e afrouxaria a varredura por forma.
2. **[Regra 2] Pós-portão mais estrito que o plano.**
   - **Cauda byte-idêntica (g):** prova que tudo depois da autorização é o corpo vivo. Cobre, por construção, «MUST NOT change any business rule … other than the authorization line».
   - **Outras checagens:** ordem guarda×busca (h); autorização antes da primeira escrita (i); ACL = capturada menos anon; propriedades estendidas (linguagem, dono, kind…); REVISAO-05 por impressão digital de `responder_revisao_decisao`.
   - **Literais protegidos:** além dos 7 do plano, entram os 2 textos das prontidões p48/p49 (`Decisão final registrada.` e o feedback neutro), os mínimos de justificativa, `net.http_post(`, `sincronizar_score_redacao(`, `FOR UPDATE OF ea` e `no_data_found`.
3. **(c) lê o código sem comentários, não o corpo inteiro.** O comentário P48-11 de `registrar_decisao` CITA a forma antiga, `v_role NOT IN (...)`. Ele é byte-idêntico ao vivo, e mantê-lo assim foi preferível a editar prosa histórica. `created_by` continua sendo checado no corpo inteiro.
4. **save_entrevista_guia_edits ganhou a linha [H].** A ação dizia «delete only the ownership check», mas o must-have (e a checagem (a)) exige `is_active_rh_user` nas 11. Ela é redundante (o papel dela já vem de `usuarios_rh` ativo) e inofensiva.
5. **Controle positivo (4) com aceitação, e não só com rejeição.** Em `registrar_decisao`, entre a linha de autorização e o INSERT só existe o D-23, que é 42501. Por isso nenhuma rejeição «não-42501 depois da autorização» é possível ali sem escrever.
   - **Como ficou:** a sonda registra uma decisão `em_espera`. Ela é aceita, com `por_usuario` = o ativo, e é desfeita pelo aborto.
   - **Rejeições depois da autorização:** vieram de `liberar_cognitivo` (P0001) e de `rejeitar_candidatura` (23514), sem escrever.
6. **Ensaio antes do commit da Task 2.** O plano ensaia na Task 3 e conserta com `fix(50-05)`. Rodei o verify 1 antes do commit para não commitar um portão com erro de execução (precedente do 50-04). Deu verde de primeira, e o arquivo commitado é o ensaiado (md5 `114ea102…`).
7. **Prova de mordida, controle negativo, BORDA e empilhado:** acrescentados além do plano, pela regra do CLAUDE.md «prove por execução que o portão ainda MORDE».

## Itens adiados / impacto conhecido depois do apply (50-10)

Os smokes legados que exercitam estas funções com expectativa de posse da vaga vão reprovar trabalho correto contra o 0004 até a varredura do 50-09 reescrevê-los. O grep por «outra vaga / não-dono / IDOR / sem posse» achou:

| smoke | ocorrências |
|---|---|
| `sec05_08_smokes.sql` | 25 |
| `oper31_rejeitar_candidatura_smokes.sql` | 3 |
| `p49_revisao_por_analise_smoke.sql` | 3 |
| `p42_revisao_art20_smoke.sql` | 2 |

As prontidões p48/p49 continuam satisfeitas:
- `candidatura_encerrada(`, `coalesce(v_role` e `D-23` em rejeitar/registrar;
- `app.transicao_sancionada` e `Decisão final registrada.`;
- `entrevista_analise_vigente` nas RPCs de revisão.

O pós-portão (f) as exige.

## Sinalizações de ameaça

Nenhuma superfície nova:
- **T-50-19:** fechado (as 2 guardas fail-open).
- **T-50-20:** fechado (anon nas 5).
- **T-50-21:** coberto (token velho → 42501).
- **T-50-22 e T-50-53:** provados dentro da transação (D-23; D-08).

**Oráculo de existência:** a ordem «busca antes da guarda» de `confirmar_revisao_entrevista`, `reprocessar_analise`, `salvar_avaliacao_entrevista(4)` e `salvar_revisao_redacao` foi mantida como estava, por instrução do plano. Nessas 4, um chamador sem papel ainda distingue P0002 de 42501. O caso é preexistente e não foi agravado; fica registrado para a revisão do 50-10.

## Stubs conhecidos

Nenhum.

## Prontidão para a próxima etapa

- O 0004 está pronto para a revisão bloqueante do 50-10 e não depende do 0002 nem do 0003. O empilhamento 0002+0003+0004 foi ensaiado verde.
- O 50-07 pode ancorar as suas cláusulas e mutações nestas formas:
  - [H] `IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN`;
  - [G2] `IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN`;
  - `PERFORM 1 … IF NOT FOUND THEN` no guia.
- Não houve apply, push nem escrita persistida em PROD.

## Self-Check: PASSED

- FOUND: supabase/migrations/20261005000004_p50_rpcs_escrita.sql (md5 114ea102e29a4cee44623dc52bf75533)
- FOUND commit: 3bf10433
- Ledger p50 = ["20261005000001"] (só leitura, depois de todos os ensaios)
- Spot-checks temporários fora do repositório: $TMPDIR/p50_05_d04.sql, $TMPDIR/p50_05_borda.sql (não rastreados)
