---
phase: 50-acesso-do-recrutador
plan: 04
subsystem: database
tags: [postgres, security-definer, rpc, supabase, ensaio-que-aborta, portao, sc4, d-08]

requires:
  - phase: 50-acesso-do-recrutador
    provides: "50-02: helper public.is_active_rh_user() VIVO em PROD (ledger 20261005000001); p50_ensaio.cjs (--migracoes, --vistas, evidencia=), smoke p50 v1; 50-03: COMPARA do --vistas com fechamento (decisão «A»)"
provides:
  - "migration 20261005000003 (NÃO aplicada): 7 CREATE OR REPLACE a partir do corpo VIVO — 4 filas (SC4 por construção), funil_kpis (v_ve_tudo, anon sem EXECUTE), listar_historico_candidatura, ler_resposta_caso_aberto_sjt; PRE-PORTAO md5(prosrc) + captura de propriedades/ACL; POS-PORTAO por forma; D-08 por impressão digital da linha inteira de pg_proc"
  - "ensaiada em PROD numa requisição que aborta: vistas=igual, smoke50=7/7, 04:d08=igual:n=2; spot-check SC4 admin = rh ativo em 5 valores, órfão incluído"
affects: [50-07, 50-08, 50-09, 50-10]

actuals:
  tokens: 14481
  tasks: 2
  commits: 1
plan_head_before: 097c9cc947c39435bf73cef932ac957e48d51933
plan_head_after: 46a854ad49b8c5ae5fd33a3cd5b46db9ddde39f3

tech-stack:
  added: []
  patterns:
    - "Corpo DEFINER reescrito por PROGRAMA a partir do dump vivo (pg_get_functiondef), com substituições exatas que exigem 1 ocorrência do trecho antigo — nenhuma transcrição manual do corpo"
    - "Pós-portão: PRESENÇA se prova no código sem comentários `--` (regexp_replace); AUSÊNCIA no corpo inteiro (mais estrito)"
    - "D-08 dentro da transação: md5(to_jsonb(p)::text) de cada sobrecarga, antes × depois, com piso de nomes"

key-files:
  created:
    - supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql
    - .planning/phases/50-acesso-do-recrutador/50-04-SUMMARY.md
  modified: []

key-decisions:
  - "funil_kpis: v_ve_tudo = coalesce(v_role = 'administrador' OR (v_role = 'rh' AND public.is_active_rh_user()), false) — o coalesce faz do escopo um booleano estrito (claim nula → false, não NULL); o efeito em WHERE é o mesmo, mas um futuro `NOT v_ve_tudo` não falharia aberto"
  - "listar_historico_candidatura: a mensagem do 42501 do ramo rh virou 'FORBIDDEN: apenas rh ativo ou administrador podem ler o historico da candidatura' (a antiga falava de vaga criada pelo recrutador, falsa depois do D-01); errcode e prefixo FORBIDDEN mantidos; nenhum teste/código casa o texto antigo (grep)"
  - "Task 2 não produz arquivo: nenhum commit de task (precedente do 50-02); o spot-check SC4 é temporário por desenho do plano"

patterns-established:
  - "Mordida do pós-portão por cópia mutada da migration no scratchpad, passada por --migracoes=<caminho> (o ensaio aceita caminho fora do repositório, pela versão do nome)"

requirements-completed: []
requirements-addressed: [EXPORT-05]

coverage:
  - id: D1
    description: "Migration 20261005000003 com os 7 corpos vivos e só a linha de escopo trocada; estática verde"
    requirement: EXPORT-05
    verification:
      - kind: other
        ref: "Task 1 <verify> → 'OK migration estatica: 7 funcoes de leitura/fila' — commit 46a854ad"
        status: pass
    human_judgment: false
  - id: D2
    description: "Ensaio em PROD que aborta: PRE/POS-PORTAO, vistas=igual, smoke v1 7/7, D-08 igual (n=2), ledger inalterado"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node scripts/p50_ensaio.cjs --vistas --migracoes=supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql supabase/tests/p50_acesso_recrutador_smoke.sql"
        status: pass
    human_judgment: false
  - id: D3
    description: "SC4: as 4 filas dão ao rh ativo sem vaga própria exatamente o que dão ao administrador, órfão incluído; controle negativo vermelho sem o 0003"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node scripts/p50_ensaio.cjs --migracoes=…0003 $TMPDIR/p50_04_sc4.sql (verde) ; --sem-migracoes (P50S FAIL)"
        status: pass
    human_judgment: false
  - id: D4
    description: "O pós-portão morde: 5 mutações (WHERE true no funil, filtro próprio na fila, GRANT no motor D-08, anon numa fila, histórico sem helper) → 5 vermelhos na checagem certa"
    verification:
      - kind: integration
        ref: "bites04/b1..b5 por --migracoes=<cópia mutada>"
        status: pass
    human_judgment: false

duration: ~60min
completed: 2026-10-05
status: complete
---

# Phase 50 Plan 04: RPCs de leitura e filas para rh ativo — Summary

**As 4 filas do SC4, os KPIs do funil, o histórico da candidatura e a resposta do caso aberto passam a responder ao recrutador ativo exatamente como ao administrador. É uma migration (`20261005000003`) que reescreve os 7 corpos SECURITY DEFINER a partir do `pg_get_functiondef` vivo, troca só a linha de escopo, tira o EXECUTE de `anon` em `funil_kpis` e prova dentro da própria transação que o motor de exclusão (D-08) não mudou. Ensaiada em PROD numa requisição que aborta: `vistas=igual`, `smoke50=7/7`, `04:d08=igual:n=2`; no spot-check, admin = rh ativo nas 5 medidas, órfão incluído. Não aplicada.**

## Performance

- **Duração:** ~60 min
- **Concluído:** 2026-10-05 (UTC 2026-10-06T00:53Z)
- **Tarefas:** 2/2
- **Arquivos:** 1 migration criada (885 linhas, 57 924 octetos)

## Medição em PROD (re-medida nesta execução, só leitura — igual ao RESEARCH §B)

| função | md5(prosrc) | proconfig | vol | DEFINER | anon EXECUTE | ACL |
|---|---|---|---|---|---|---|
| `listar_pedidos_dados(boolean)` | a161e8ca5a30cacdf2b33b770752f601 | `search_path=""` | s | sim | não | postgres, service_role, authenticated |
| `contar_pedidos_dados_pendentes()` | fea910fd19a23a219307d1068024c06f | `search_path=""` | s | sim | não | postgres, service_role, authenticated |
| `listar_revisoes_decisao(boolean)` | d3d4c3a3b956af0f84f41b5c048c4ad9 | `search_path=""` | s | sim | não | postgres, authenticated, service_role |
| `contar_revisoes_pendentes()` | 14ef44037db54fa70304743ae8ef0010 | `search_path=""` | s | sim | não | postgres, authenticated, service_role |
| `funil_kpis(uuid)` | c4eb15744881377baac7c0e246d1a538 | `search_path=""` | **v** | sim | **SIM** | postgres, **anon**, authenticated, service_role |
| `listar_historico_candidatura(uuid)` | 770e20574cd086d05db796939f8e9298 | `search_path=""` | s | sim | não | postgres, authenticated, service_role |
| `ler_resposta_caso_aberto_sjt(uuid)` | 6d15c5cc05edfc370eb48253541cbecd | `search_path=""` | s | sim | não | postgres, authenticated, service_role |

As 7 são plpgsql com dono postgres, e nenhuma dá EXECUTE a PUBLIC. Nenhuma tem guard na forma `v_role NOT IN (` sem `coalesce`: as filas de pedidos e o histórico usam `IS DISTINCT FROM`, e as revisões e o caso aberto usam `coalesce(v_role, '') NOT IN`. Por isso não houve guard a trocar.

**D-08**, medido: `plano_exclusao_titular(uuid)` e `anonimizar_candidato(uuid,boolean)`, 2 sobrecargas no total. A impressão digital `md5(to_jsonb(p)::text)` vale `3ecb2df4…` e `41b609f3…`, e o md5(prosrc) bate com o RESEARCH (`35d45141…` e `46248544…`).

**Ledger p50**, lido antes e depois de todos os ensaios: `["20261005000001"]`.

## Linhas trocadas, por função (antigo → novo, do diff do dump)

Os corpos foram gerados por programa: o dump vivo mais substituições exatas, cada uma exigindo exatamente 1 ocorrência do trecho antigo. O diff abaixo saiu da comparação entre o dump e o corpo novo.

1. **`listar_pedidos_dados`** e **`contar_pedidos_dados_pendentes`** (o mesmo trecho nas duas):
   ```
   -          OR (v_role = 'rh'
   -              AND EXISTS (
   -                    SELECT 1
   -                      FROM public.candidaturas cd
   -                     WHERE cd.candidato_id = s.candidato_id
   -                       AND cd.deleted_at IS NULL
   -                       AND cd.is_rascunho = false
   -                       AND cd.vaga_id IN (SELECT vg.id
   -                                            FROM public.vagas vg
   -                                           WHERE vg.created_by = v_uid)))
   +          OR (v_role = 'rh' AND public.is_active_rh_user())
   ```
   Além disso, entram 4 linhas de comentário P50 / D-03 antes de `AND (`, com o mesmo texto nas 4 filas. `v_uid` continua declarado e fica sem uso: o DECLARE ficou byte-idêntico.
2. **`listar_revisoes_decisao`** e **`contar_revisoes_pendentes`**:
   ```
   -          OR (v_role = 'rh'
   -              AND c.deleted_at IS NULL
   -              AND c.is_rascunho = false
   -              AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))
   +          OR (v_role = 'rh' AND public.is_active_rh_user())
   ```
   Mais o mesmo comentário. Ficaram byte-idênticos:
   - `pode_responder` = `(d.revisao_respondida_em IS NULL AND d.por_usuario IS DISTINCT FROM v_uid)`;
   - o guard com `coalesce`, o `IF v_uid IS NULL`, `#variable_conflict use_column`, `ORDER BY` e `LIMIT 200`.
3. **`funil_kpis`**:
   ```
   -  v_is_admin boolean := (auth.jwt() #>> '{app_metadata,role}') = 'administrador';
   -  v_uid      uuid    := auth.uid();
   +  v_role     text    := (select auth.jwt() #>> '{app_metadata,role}');
   +  v_ve_tudo  boolean := coalesce(v_role = 'administrador' OR (v_role = 'rh' AND public.is_active_rh_user()), false);
   -     WHERE (v_is_admin OR v.created_by = v_uid)        (x4: scoped_hist, volume, ko, ns)
   +     WHERE v_ve_tudo                                   (x4)
   ```
   - Entram 4 linhas de comentário.
   - `p_vaga_id IS NULL OR v.id = p_vaga_id` e `candidatura_encerrada(` ficaram. Os joins em `vagas` também ficaram, porque o estreitamento por `p_vaga_id` usa `v.id`.
   - ACL: `REVOKE ALL … FROM PUBLIC; REVOKE ALL … FROM anon; GRANT EXECUTE … TO authenticated, service_role`.
4. **`listar_historico_candidatura`**: o bloco (2) foi trocado. O comentário mudou, e o IF ficou assim:
   ```
   -  IF v_role = 'rh' AND NOT EXISTS (
   -    SELECT 1
   -      FROM public.candidaturas c
   -      JOIN public.vagas v
   -        ON v.id = c.vaga_id
   -       AND c.id = p_candidatura_id
   -       AND v.created_by = (select auth.uid())
   -  ) THEN
   -    RAISE EXCEPTION 'FORBIDDEN: a candidatura pedida nao pertence a uma vaga criada por este recrutador'
   +  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
   +    RAISE EXCEPTION 'FORBIDDEN: apenas rh ativo ou administrador podem ler o historico da candidatura'
          USING ERRCODE = '42501';
   ```
   O join em `vagas` saiu. O guard (1) NULL-safe e a projeção (3) ficaram byte-idênticos.
5. **`ler_resposta_caso_aberto_sjt`**: saem `v_dono uuid;` e `v_achou boolean;`. O bloco (ii) ficou assim:
   ```
   -  SELECT v.created_by INTO v_dono
   -    FROM public.candidaturas c
   -    JOIN public.vagas v ON v.id = c.vaga_id
   -   WHERE c.id = p_candidatura_id;
   -  v_achou := FOUND;
   -
   -  IF v_role = 'rh' AND (NOT v_achou OR v_dono IS DISTINCT FROM v_uid) THEN
   +  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
      END IF;
   -  IF NOT v_achou THEN
   +  IF NOT EXISTS (SELECT 1 FROM public.candidaturas c WHERE c.id = p_candidatura_id) THEN
        RAISE EXCEPTION 'candidatura % nao encontrada', p_candidatura_id USING ERRCODE = 'no_data_found';
   ```
   Ficaram byte-idênticos o guard (i) fail-closed e os blocos (iii) e (iv) (`sem_resposta_enviada`, `indisponivel`, `removida`, `disponivel`). O `COMMENT ON FUNCTION` foi reescrito com a regra nova.

Os 7 `COMMENT ON FUNCTION` trocaram só as frases de escopo (posse da vaga → «rh ATIVO pelo helper vivo», com P50 / D-0x). O resto do texto de contrato ficou.

## Portões da migration

- **PRE-PORTAO:**
  - exige o helper;
  - confere os 7 md5(prosrc) medidos, numa lista `VALUES` comentada como escopo deliberado;
  - exige ACL explícita;
  - captura em GUCs locais, por função, as propriedades: config, volatilidade, DEFINER, linguagem, dono, kind, strict, leakproof, parallel, cost, rows, retset, result, args com defaults e identity args;
  - captura a ACL;
  - captura a impressão digital D-08, com piso dos 2 nomes.
- **POS-PORTAO, por função:**
  - `is_active_rh_user` aparece no código, com os comentários retirados;
  - sem `created_by` no corpo inteiro;
  - sem `v_role NOT IN (`;
  - propriedades iguais às capturadas;
  - sem EXECUTE para PUBLIC e para anon; com EXECUTE para authenticated e service_role;
  - fora de `funil_kpis`, ACL byte-igual à capturada.
- **POS-PORTAO, específicos:**
  - filas: `OR (v_role = 'rh' AND public.is_active_rh_user())` e `v_role = 'administrador'` presentes; sem `is_rascunho` e sem `c.deleted_at`/`cd.deleted_at` (filtro próprio do ramo rh);
  - filas de pedidos: guard NULL-safe e `s.tipo = 'acesso'`;
  - filas de revisões: guard com `coalesce` e `IF v_uid IS NULL`;
  - listas: `#variable_conflict use_column` e `LIMIT 200`;
  - pedidos: o `ORDER BY` composto;
  - revisões: `pode_responder boolean` no RETURNS e a expressão literal de REVISAO-05;
  - funil: sem `WHERE true`, ≥ 4 `WHERE v_ve_tudo`, a definição de `v_ve_tudo`, `candidatura_encerrada(` e `p_vaga_id`;
  - histórico: os dois guards;
  - caso aberto: o guard fail-closed, `no_data_found` e o helper ANTES de `FROM public.candidaturas`.
- **D-08 recalculado:** se diferir, `P50-04 POS-PORTAO: D-08 — …`.
- **Evidência:**
  - `04:<sig>=<md5 novo>,…`;
  - `04:anon=false`;
  - `04:d08=igual:n=2`.

**md5(prosrc) novos** (de `evidencia=`):

| função | md5 novo |
|---|---|
| `listar_pedidos_dados(boolean)` | 572d8bb1bc08f95648de82c5cd047295 |
| `contar_pedidos_dados_pendentes()` | b648c4ec7e62901e4ee19aa6d586ae2c |
| `listar_revisoes_decisao(boolean)` | 85642fe45f6bb786fc7e965476b727a6 |
| `contar_revisoes_pendentes()` | 63b7abffd3eee25a26810d9fc01fbadf |
| `funil_kpis(uuid)` | 52583cd9fbe981cd92c307853a9604af |
| `listar_historico_candidatura(uuid)` | e6af984218ae56d50ea836c0fdc1ea7b |
| `ler_resposta_caso_aberto_sjt(uuid)` | f8a69d726562947c31dcfcc50a2ebd92 |

## O portão morde (ensaios que abortam, cópia mutada da migration via `--migracoes=<scratch>`)

| mutação | resultado |
|---|---|
| b1: primeiro `WHERE v_ve_tudo` do funil → `WHERE true` | `P50-04 POS-PORTAO: funil_kpis tem predicado incondicional …` |
| b2: fila de revisões com `AND c.is_rascunho = false` no ramo rh | `P50-04 POS-PORTAO: a fila public.listar_revisoes_decisao(boolean) nao tem o escopo «administrador OR (rh AND helper)» (D-03)` |
| b3: `GRANT EXECUTE ON FUNCTION public.plano_exclusao_titular(uuid) TO anon` antes do pós-portão | `P50-04 POS-PORTAO: D-08 — anonimizar_candidato/plano_exclusao_titular mudaram dentro desta migration (antes «…3ecb2df4…», depois «…0835242b…»)` |
| b4: `GRANT EXECUTE … listar_pedidos_dados(boolean) TO anon` | `P50-04 POS-PORTAO: anon tem EXECUTE em public.listar_pedidos_dados(boolean) (D-04)` |
| b5: no histórico, `AND NOT public.is_active_rh_user()` → `AND false` | `P50-04 POS-PORTAO: public.listar_historico_candidatura(uuid) nao chama is_active_rh_user …`. Na 1ª rodada, a checagem (a) foi satisfeita por um COMENTÁRIO; daí veio o endurecimento, descrito nos Desvios |

## Verificação da Task 2 (comandos extraídos byte a byte do plano)

**Verify 1** (rc=0, 1101 ms, sem repetição, nenhum 40001/TIMEOUT/PERSISTIU):

```
ENSAIO VERDE: supabase/tests/p50_acesso_recrutador_smoke.sql · prefixadas=[20261005000003] · aplicadas=[20261005000001] · ausentes=[20261005000002,20261005000004] · vistas=igual · smoke50=7/7 · evidencia=04:listar_pedidos_dados(boolean)=572d8bb1bc08f95648de82c5cd047295,contar_pedidos_dados_pendentes()=b648c4ec7e62901e4ee19aa6d586ae2c,listar_revisoes_decisao(boolean)=85642fe45f6bb786fc7e965476b727a6,contar_revisoes_pendentes()=63b7abffd3eee25a26810d9fc01fbadf,funil_kpis(uuid)=52583cd9fbe981cd92c307853a9604af,listar_historico_candidatura(uuid)=e6af984218ae56d50ea836c0fdc1ea7b,ler_resposta_caso_aberto_sjt(uuid)=f8a69d726562947c31dcfcc50a2ebd92;04:anon=false;04:d08=igual:n=2 · 1101 ms
```

`vistas=igual`, sem fechamento: o 0003 sozinho não muda nenhuma vista de relação.

**Verify 2 — spot-check SC4** (rc=0, 653 ms). O arquivo é `$TMPDIR/p50_04_sc4.sql`, temporário e NÃO commitado. A cláusula permanente é do 50-07.

```
… · evidencia=…;04:d08=igual:n=2;sc4:rh=66412f96(administrador),admin=4fceff36,semeados=2(orfao=1),ped=5/5:87872d827b70,ped_pend=2/2,rev_todas=3/3:b8603d134007,rev_pend_lista=2/2:2cd47009c1ce,rev_pend=2/2 · 653 ms
```

- **Atores, lidos em tempo de execução:**
  - rh = `66412f96-1ee9-4621-853e-a79cd7f1b235`. É a mesma linha que o SC1 do 50-02 usou: `usuarios_rh` ativa, sem vaga própria e sem linha de candidato. O papel da linha é `administrador`, mas a claim usada é `rh`.
  - Não existe recrutador ativo sem vaga própria. O RH2 real é o checkpoint do D-10.
  - O helper não depende de papel, então o ramo exercitado é o do rh.
  - admin = `4fceff36…`, outra linha.
- **População semeada** numa subtransação desfeita por `P50S1`: 2 pedidos pendentes. Um é de candidato COM candidatura viva; o outro é de candidato SEM candidatura nenhuma (o órfão). O spot-check confirma que nenhum dos dois sobreviveu ao rollback.
- **Iguais, admin = rh ativo:**

  | RPC | admin | rh ativo | md5 |
  |---|---|---|---|
  | `listar_pedidos_dados(true)` | 5 | 5 | `87872d82…` |
  | `contar_pedidos_dados_pendentes()` | 2 | 2 | — |
  | `listar_revisoes_decisao(true)`, sem `pode_responder` | 3 | 3 | `b8603d13…` |
  | `listar_revisoes_decisao(false)`, sem `pode_responder` | 2 | 2 | `2cd47009…` |
  | `contar_revisoes_pendentes()` | 2 | 2 | — |

  O rh vê os dois semeados, o órfão incluído.
- **Controle negativo**, o mesmo arquivo com `--sem-migracoes`, contra os corpos vivos de hoje: VERMELHO. O rh vê 0 em tudo, e o admin vê 5/2/3/2/2.
  ```
  P50S FAIL (sc4): listar_pedidos_dados(true) admin=…/5 rh=…/0 | contar_pedidos_dados_pendentes admin=2 rh=0 | listar_revisoes_decisao(true) admin=…/3 rh=…/0 | listar_revisoes_decisao(false) admin=…/2 rh=…/0 | contar_revisoes_pendentes admin=2 rh=0 | rh nao ve os semeados: com_candidatura=f orfao=f | populacao vazia: …
  ```

**Extra, compatibilidade com o 50-07:** um ensaio empilhado `--vistas --migracoes=…0002,…0003` com o smoke e o spot-check deu VERDE, com:
- `vistas=igual+fechou[anon.public.decisao_final_historico,anon.public.entrevista_analises,anon.public.entrevista_guias,anon.public.scores_candidato]`, exatamente os 4 fechamentos conhecidos do 0002;
- `smoke50=7/7`.

**Ledger depois de todos os ensaios** (só leitura): `["20261005000001"]`. `20261005000003` não está lá.

## Commits deste plano

| hash | tipo | o quê |
|---|---|---|
| 46a854ad | feat(50-04) | migration 20261005000003 (Task 1). O `git show --stat` lista só o arquivo da migration |

A Task 2 não altera arquivo do repositório: ela roda ensaios que abortam e um spot-check temporário. Por isso não tem commit, como no precedente do 50-02.

## Desvios do plano

1. **[Regra 2] `v_ve_tudo` com `coalesce(…, false)`.**
   - O plano escrevia `v_ve_tudo boolean := v_role = 'administrador' OR (v_role = 'rh' AND public.is_active_rh_user())`.
   - Com claim nula, isso dá NULL. Em `WHERE` o efeito é o mesmo, mas um uso futuro como `NOT v_ve_tudo` falharia ABERTO.
   - O padrão do key_link (`v_role = 'rh' AND public.is_active_rh_user\(\)`) segue casando.
2. **Mensagem do 42501 do histórico.**
   - O plano pedia «the function's existing message». A mensagem antiga do bloco 2 («a candidatura pedida nao pertence a uma vaga criada por este recrutador») descreve a regra que deixou de existir.
   - Mantive o prefixo `FORBIDDEN:` e o `ERRCODE = '42501'`, com o texto novo «apenas rh ativo ou administrador podem ler o historico da candidatura».
   - O grep em `src/`, `supabase/tests/`, `supabase/functions/` e `scripts/` não acha nenhum consumidor do texto antigo.
3. **Busca do caso aberto como `IF NOT EXISTS (SELECT 1 …)`.** O plano escrevia «the lookup `SELECT 1 FROM public.candidaturas c WHERE c.id = p_candidatura_id`, NOT FOUND → P0002». Em plpgsql, um `SELECT` sem `INTO` é erro. A forma `IF NOT EXISTS` tem a mesma semântica.
4. **[Regra 2] Pós-portão mais estrito que o plano.**
   - **Propriedades:** além de config, volatilidade, DEFINER, result e identity args, compara também linguagem, dono, kind, strict, leakproof, parallel, cost, rows, retset e args com defaults.
   - **ACL:** byte-igual à capturada nas 6 que não são o funil; PUBLIC sem EXECUTE; service_role com EXECUTE.
   - **`pode_responder`:** o plano dizia que `listar_revisoes_decisao` «still contains `pode_responder`», mas `prosrc` não contém o nome da coluna, que só está no RETURNS TABLE. A checagem lê `pg_get_function_result` e a expressão literal no corpo.
   - **Presença:** as checagens de presença leem o código sem comentários. A mordida b5 mostrou que um comentário que cita o helper satisfazia a checagem (a). Isso foi corrigido antes do commit, e a b5 agora reprova em (a).
5. **[Regra 1, antes do commit] Cast `::text` nas colunas `"char"`** (`provolatile`, `prokind`, `proparallel`). O primeiro ensaio deu `42725: operator is not unique: unknown || …`. Corrigido no gerador e re-ensaiado. Não gerou commit separado, porque nada tinha sido commitado ainda.
6. **Prova de mordida e controle negativo além do plano.** As 5 mutações do pós-portão e o spot-check sem o 0003 foram acrescentados por causa da regra do CLAUDE.md «prove por execução que o portão ainda MORDE».

## Itens adiados / impacto conhecido depois do apply (50-10)

Estes smokes legados codificam a regra de posse. Eles vão reprovar trabalho correto contra o 0003 até serem reescritos, e todos já têm dono no plano:

| smoke | cláusulas | plano |
|---|---|---|
| `p44_pedidos_dados_smoke.sql` | (k)/(l) | 50-09 |
| `p47_historico_smoke.sql` | (b) | 50-09 |
| `p49_44_resposta_caso_aberto_smoke.sql` | (b)/(d) | 50-09 |
| `funil34_kpis_smokes.sql` | (f)/(g) | 50-09 |
| `seg32_smokes.sql` | (b)/(d)/(e) | 50-08 |

Os arquivos de prontidão p48/p49 (`candidatura_encerrada(` no funil) continuam satisfeitos.

## Sinalizações de ameaça

Nenhuma superfície nova. O EXECUTE de `anon` sai de `funil_kpis` (T-50-15). O oráculo de existência P0002 × 42501 do caso aberto ficou como aceito em T-50-17: o rh inativo e quem não tem papel recebem 42501 ANTES da busca, o que o pós-portão confere.

## Stubs conhecidos

Nenhum.

## Prontidão para a próxima etapa

- O 0003 está pronto para a revisão bloqueante do 50-10. Ele não depende do 0002: as 7 funções são DEFINER e não leem a RLS que o 0002 muda. O empilhamento 0002+0003 foi ensaiado verde.
- O 50-07 pode ancorar a cláusula SC4 permanente nas formas deste arquivo: `OR (v_role = 'rh' AND public.is_active_rh_user())` e a definição de `v_ve_tudo`. A M22 «`v_ve_tudo := true`» tem de mirar a linha `v_ve_tudo  boolean := coalesce(…, false);`.
- Não houve apply, push nem escrita persistida em PROD.

## Self-Check: PASSED

- FOUND: supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql
- FOUND commit: 46a854ad
- Ledger p50 = ["20261005000001"] (só leitura, depois dos ensaios)
- Spot-check temporário fora do repositório: $TMPDIR/p50_04_sc4.sql (não rastreado)
