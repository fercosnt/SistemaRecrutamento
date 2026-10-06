---
phase: 50-acesso-do-recrutador
plan: 08
subsystem: database
tags: [postgres, rls, smoke, legado, pares, token-velho, ensaio-que-aborta, matriz-4-execucoes, mordidas, d-09]

requires:
  - phase: 50-acesso-do-recrutador
    provides: "50-02: helper vivo + rh_le_candidaturas vivos; 50-03/04/05: migrations 0002/0003/0004 escritas e ensaiadas; 50-07: smoke-portão v2 13/13; scripts/p50_ensaio.cjs (envelope que aborta, --mutacao=)"
provides:
  - "sec05_08, seg32, seg33, p37_lacunas reescritos em PARES (rh ativo não-autor lê/age · token velho lê 0), provados pela matriz de 4 execuções"
  - "seg33 (c) prova integridade (D-09): vaga_id forjado é reescrito para o da candidatura e agendado_por = ator"
  - "p37_lacunas (n)/(k)/(l) por baseline capturada na execução (eram fotografias)"
  - "p37_fidelidade (e) com a narrativa da Phase 50; p46_fixture_elegivel com o comentário corrigido (só comentário)"
  - "22 mordidas: cada negativa reescrita REPROVA na própria letra com uma quebra deliberada"
affects: [50-09, 50-10, 50-11]

actuals:
  tokens: 22500
  tasks: 2
  commits: 2
plan_head_before: babb2b2bca6605fb12f3082b84f63779c68f8687
plan_head_after: ad09c7c8cfe143cc3727cfbfb32a9d07ec56e495

tech-stack:
  added: []
  patterns:
    - "Par legado: positivo = rh ATIVO não-autor com contagem EXATA contra a população lida como postgres na mesma execução; negativo = claim rh + recrutador INATIVO lido em execução (e o sub sem linha, onde já existia)"
    - "Nenhum sub de impersonação tirado de vagas.created_by; a vaga-alvo é escolhida com autor IS DISTINCT FROM o ator ativo"
    - "Mordida por --mutacao= no envelope que aborta, esperando a letra exata da cláusula"

key-files:
  created:
    - .planning/phases/50-acesso-do-recrutador/50-08-SUMMARY.md
  modified:
    - supabase/tests/sec05_08_smokes.sql
    - supabase/tests/seg32_smokes.sql
    - supabase/tests/p46_fixture_elegivel.sql
    - supabase/tests/seg33_agendamento_smokes.sql
    - supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql
    - supabase/tests/p37_fidelidade_schema_smoke.sql

key-decisions:
  - "O texto antigo do sec05_08 NÃO quebraria pela regra nova. As negativas dele usam o sub sintético …00ff, sem linha em usuarios_rh, e o helper também o nega. O vermelho vinha só da escolha do «dono» por vagas.created_by, que pegava um autor INATIVO (bbbbbbbb), e esse vermelho já existia ANTES da expansão. A dependência da regra nova está nas positivas novas (rh ativo não-autor)"
  - "Falta de população ou de ator = FAIL, nunca SKIP. No sec05_08 o SKIP virou FAIL. No seg32 entrou um GATE FINAL no idioma do seg33 48-03, porque NOTICE não volta pela Management API e um run todo SKIP sairia verde"
  - "As negativas do UPDATE vêm ANTES das do SELECT no sec05_08. O WHERE do UPDATE exige que a linha também passe na policy de SELECT; na ordem antiga, a quebra só da policy de UPDATE ficaria escondida"
  - "seg33: o e02 que a (c) agora CRIA é removido logo depois dela, para manter o contrato de fixture de (f) («o titular recebe exatamente 1 linha»)"
  - "requirements-completed vazio, como em 50-03..07: o EXPORT-05 é compartilhado com planos ainda abertos (50-09..50-11)"

patterns-established:
  - "Tirar só o helper de uma policy de forma B não expõe nada: a subconsulta em candidaturas roda sob a RLS de candidaturas do chamador. A mordida que expõe é tirar o ramo rh inteiro"

requirements-completed: []
requirements-addressed: [EXPORT-05]

coverage:
  - id: D1
    description: "sec05_08 e seg32 reescritos em pares; matriz de 4 execuções; p46 só comentário"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "<verify> da Task 1 → «matriz nova ok: sec05_08, seg32; p46 so comentario» — commit 6706f8d1"
        status: pass
    human_judgment: false
  - id: D2
    description: "seg33 (a) em par, (c) integridade D-09; p37_lacunas (h)/(h2) e baselines; p37_fidelidade só narrativa; matriz de 4 execuções"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "<verify> da Task 2 → «matriz nova ok: seg33, p37_lacunas, p37_fidelidade» — commit ad09c7c8"
        status: pass
    human_judgment: false
  - id: D3
    description: "Toda negativa reescrita (e cada baseline nova) morde na própria letra"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node $SCRATCH/p50_08_mordidas.cjs sec05 seg32 seg33 p37 → «mordidas: todas mordem na propria letra» (22/22), depois do último commit"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-10-06
status: complete
---

# Phase 50 Plan 08: Smokes legados de RLS/escopo em pares — Summary

**Os quatro smokes legados que diziam «rh não-dono não vê nada» foram reescritos em pares: o recrutador ATIVO que não é autor lê a vaga alheia, e o token de um recrutador INATIVO lê 0. A integridade do agendamento continua asserida: o `vaga_id` forjado é reescrito para o da candidatura (D-09). Cada arquivo está VERMELHO sem `20261005000002..4` e VERDE com elas, e as 22 quebras deliberadas reprovam, cada uma, na própria letra. Não houve apply, push nem escrita persistida.**

## Performance

- **Duração:** ~15 min, de 2026-10-06T01:51:22Z a 2026-10-06T02:06Z.
- **Tarefas:** 2 de 2.
- **Arquivos:** 6 modificados, com 535 inserções e 230 remoções.

## Varredura de forma (CLAUDE.md), refeita antes de editar

- **População:** 358 linhas na base do plano (`babb2b2b`) e 361 depois.
- **Classificação dos achados que nomeiam um dos 14 policies ou 18 funções:**

| achado | classe | dono |
|---|---|---|
| `oper31_rejeitar_candidatura_smokes.sql:224` (`v_after - v_before <> 1`, delta da fixture) | escopo | 50-09 |
| `p44_pedidos_dados_smoke.sql:357` (`proname IN` com as duas RPCs que o p44 especifica) | escopo | — |
| `p49_prontidao_prod.sql:142,144` (duas RPCs nomeadas, `= 2` nomes distintos) | escopo | — |
| `p50_acesso_recrutador_smoke.sql:269` (comentário que cita o oper31) | — | — |

- **Achados nos arquivos DESTE plano:**

| arquivo | achados | classe | o que mudou |
|---|---|---|---|
| sec05_08 | `<> 0` de não-dono | escopo | viraram as negativas dos pares |
| seg32 | `(a) <> 0/<> 1` de storage | escopo, fica | — |
| seg32 | `(c) <> 0` | escopo | virou par |
| seg33 | `<> 1/<> 0` da fixture | escopo | `(a) <> 0` virou par |
| p37_fidelidade | `<> 5/1/4/8` | escopo deliberado | nada: é fidelidade a literal transcrito, a (e) não mudou |
| p46_fixture_elegivel | contagens da fixture | escopo | nada: só comentário |
| **p37_lacunas `:633`** `(n) v_n <> 0` | **FOTOGRAFIA** | 50-08 | **consertado** |
| p37_lacunas `:501,:572` `(k)/(l) <> 8` | FOTOGRAFIA | 50-08 | **consertados** |
| p37_lacunas `(o) <> 14` | escopo (cláusulas do próprio arquivo) | 50-08 | virou `<> 15` |

- **Sobre o `(n) v_n <> 0`:** dizia «o ledger termina com 0 linhas, como começou». Era verdade em 2026-07-22; hoje PROD tem 73 linhas, e o texto antigo **já estava vermelho** em (n) antes da fase.
- **Sobre o `(k)/(l) <> 8`:** o seed tem uma linha por label de `etapa_processo`.
- **Os 3 achados a mais na contagem final** são todos negativas `<> 0` dos pares e o `<> 15` das próprias cláusulas, ou seja, escopo.

## Matriz de 4 execuções (ensaio que aborta)

«Velho» é `git show refs/gsd/50-expansao/base:<arq>`. «Sem» é `--sem-migracoes`, contra os objetos vivos, com o 0001 no ar. «Com» é o padrão, que prefixa `20261005000002..4`.

| arquivo | (1) velho sem | (2) velho com | (3) novo sem | (4) novo com |
|---|---|---|---|---|
| sec05_08 | **VERMELHO preexistente** `SEC-05 FAIL (analise/owner): owner-rh read 0 rows on its OWN vaga` | VERMELHO na mesma cláusula | VERMELHO `SEC-05 FAIL (analise/ativo): rh ativo nao-autor leu 0/3` | **VERDE** |
| seg32 | VERDE | VERMELHO `SEG-32 FAIL (b): recruiter A funil_kpis leaked vaga-B aggregates` (previsto) | VERMELHO `SEG-32 FAIL (b): recruiter A (ativo, nao-autor) nao ve a vagaB em funil_kpis(vagaB)` | **VERDE** |
| seg33 | VERDE | VERMELHO `SEG-33 FAIL (a): recruiter A read 1 vaga-B agendamento row(s)` (previsto) | VERMELHO `SEG-33 FAIL (a): recruiter A (ativo, nao-autor) leu 0/1` | **VERDE** |
| p37_lacunas | **VERMELHO preexistente** `P37-LAC FAIL (n): … terminou com 73 linha(s) (esperado 0)` | VERMELHO `P37-LAC FAIL (h): recrutador NÃO-dono leu 3 linha(s)` (previsto) | VERMELHO `P37-LAC FAIL (h): recrutador ATIVO não-dono leu 0/3` | **VERDE** |
| p37_fidelidade | VERDE | VERDE | VERDE | **VERDE** (só narrativa, como previsto) |

Todas as (4) saíram com `prefixadas=[20261005000002,20261005000003,20261005000004] · aplicadas=[20261005000001]`.

**Diagnóstico do vermelho preexistente do sec05_08.**
- **A causa:** o «dono» era `SELECT v.created_by … LIMIT 1` sem ORDER BY, e caiu numa vaga de `bbbbbbbb` (administrador, `ativo = false`). A policy antiga tinha uma subconsulta em `vagas` sob a RLS de `vagas`, e um autor inativo não vê a própria vaga não ativa.
- **A prova:** uma variante diagnóstica fora do repositório fixou o dono num autor ativo. O texto antigo deu VERDE **sem e com** a expansão.
- **O que isso mostra:** as negativas antigas, com o sub sintético …00ff sem linha em `usuarios_rh`, continuam verdadeiras depois da fase, porque o helper também nega esse sub. O texto antigo nunca dependeu da regra nova. Quem passa a depender dela são as positivas novas, e a matriz (3)/(4) prova essa dependência.

## O que cada arquivo diz agora

### sec05_08_smokes.sql (Task 1)

**Atores, todos lidos na execução.** Ator ausente reprova, nunca pula.

| ator | escolha |
|---|---|
| `a_ativo` | `usuarios_rh` ativo, não excluído, sem linha em `candidatos`, recrutador primeiro |
| `a_velho` | `role = 'recrutador' AND NOT ativo`, sem linha em `candidatos` |
| `…00ff` | sub sintético sem linha em `usuarios_rh`, mantido |
| `…00aa` | sub sintético com claim administrador |

**Vaga-alvo** escolhida com `v.created_by IS DISTINCT FROM a_ativo`.

**Pares:**

| objeto | rh ativo | velho e …00ff | administrador |
|---|---|---|---|
| analise_candidato_vaga | todas (exato) | 0 | todas |
| comparativo_solicitado | todas (exato) | 0 | todas |
| candidaturas, SELECT | as **vivas** (exato; o ramo rh filtra `deleted_at`/`is_rascunho`) | 0 | todas |
| candidaturas, UPDATE no-op | as vivas | 0 (vem antes do SELECT) | — |
| redacoes_candidato | todas (exato) | 0 | todas |

**`reprocessar_analise`:** velho, **sem papel** (o sub de a_ativo sem `app_metadata.role`, D-04) e …00ff recebem `42501`. As três guardas disparam antes do Vault e do `net.http_post`. O positivo continua no smoke-portão (i).

**RNF-07a:** intacto.

### seg32_smokes.sql (Task 1)

- **(a) storage:** fica como estava.
- **(b) funil_kpis:**
  - A (ativo, dono só da vagaA vazia): `funil_kpis(vagaB)` = o do administrador, com `avaliacao_assincrona = 1`, e `funil_kpis()` = o do administrador.
  - Token velho: KPIs vazios nas duas chamadas.
- **(c) rh_le_historico:** A lê o histórico da vagaB com contagem exata contra a lida como postgres; o token velho lê 0 (ou recebe 42501).
- **(d) sem PII:** vale agora para B **e** para A.
- **(e):** como estava.
- **Gate final:** reprova se a fixture não montou.

### seg33_agendamento_smokes.sql (Task 2)

**(a):** A (ativo, não-autor) lê o agendamento da vagaB (= população); o token velho lê 0; o candidato não-titular lê 0.

**(c), a asserção de integridade (D-09)**, citada:

```sql
  SELECT a.vaga_id, a.agendado_por INTO v_vaga, v_author
    FROM public.agendamentos_entrevista a WHERE a.id = '33010033-0000-4000-8000-000000000e02';
  SELECT c.vaga_id INTO v_cand_vaga FROM public.candidaturas c WHERE c.id = current_setting('smoke.cand')::uuid;
  IF v_cand_vaga IS DISTINCT FROM '33010033-0000-4000-8000-000000000b01'::uuid THEN
    RAISE EXCEPTION 'SEG-33 FAIL (c): a candidatura d01 nao esta na vagaB para A (lida: %) — premissa da integridade', v_cand_vaga; END IF;
  IF v_vaga IS DISTINCT FROM v_cand_vaga THEN
    RAISE EXCEPTION 'SEG-33 FAIL (c): vaga_id gravado (%) NAO e o da candidatura (%) — o vaga_id forjado passou; integridade D-09 perdida', v_vaga, v_cand_vaga; END IF;
  IF v_author IS DISTINCT FROM current_setting('smoke.recruiterA')::uuid THEN
    RAISE EXCEPTION 'SEG-33 FAIL (c): agendado_por gravado (%) nao e o ator A — autor forjavel pelo cliente', v_author; END IF;
```

- **O INSERT** é de A, com `vaga_id` = vagaA (forjado) e `agendado_por` forjado.
- **Token velho:** o mesmo INSERT recebe `42501`, pelo WITH CHECK de `rh_gerencia_agendamento`.
- **Contrato do arquivo:** as nove PASS (a..i) e o `AS resultado` final não mudaram.

### p37_lacunas_rls_idempotencia_smokes.sql (Task 2)

| cláusula | o que exige agora |
|---|---|
| (h) | A (ativo, não-dono) lê as notificações da vagaB: 3 = população, exato |
| (h2), nova | o token velho lê 0 |
| (i), (j) | ficam como controles |
| (n) | baseline capturada na fixture, antes de qualquer linha dela (73 nesta execução) |
| (k)/(l) | comparam com `count(pg_enum)` de `etapa_processo` |
| (o) | 15 |

O bloco «POR QUE (h) SEM (i) SERIA UM GATE VAZIO» virou «POR QUE (h2) SEM (h)».

### p37_fidelidade_schema_smoke.sql e p46_fixture_elegivel.sql

- **p37_fidelidade (e):** o diff tem só comentários e o texto de três mensagens. A instrução «ESCALAR (não ajustar este smoke)» ficou.
- **p46_fixture_elegivel:** o diff contra a base tem só linhas de comentário; o verify conferiu isso. O texto novo diz:
  - `created_by` continua NULO;
  - desde a Phase 50 o recrutador ativo VÊ as três vagas (D-07);
  - `fixture-p46` continua sendo a única marca do teardown.

## Mordidas: cada negativa reescrita reprova na própria letra

**Como foram feitas.** Cada quebra foi injetada com `--mutacao=` DEPOIS de 0002..4, no envelope que aborta. O runner e as mutações ficam fora do repositório, em `$SCRATCH/p50_08_mordidas.cjs`. A rodada final foi depois do último commit.

**Resultado:** 22 de 22 mordem, nenhuma persistiu e nenhuma deu timeout.

**sec05_08**

| id | quebra | reprova em |
|---|---|---|
| S1 | helper ignora `ativo` | `SEC-05 (analise/velho)` |
| S2 | helper verdadeiro para quem não tem linha | `SEC-05 (analise/sem-linha)` |
| S3 | `rh_le_comparativo` só com o claim | `SEC-05 (comparativo/velho)` |
| S4 | `rh_le_candidaturas` + `rh_avanca_etapa` sem helper | `SEC-08 (candidaturas/velho UPDATE)` |
| S5 | só `rh_le_candidaturas` sem helper | `SEC-08 (candidaturas/velho SELECT)` |
| S6 | `redacao_rh_select` só com o claim | `SEC-06 (redacoes/velho)` |
| S7 | `reprocessar` sem a guarda do helper | `SEC-06 (reprocessar/velho)` |
| S8 | `reprocessar` com a guarda fail-open de antes da D-04 | `SEC-06 (reprocessar/sem-papel)` |

**seg32**

| id | quebra | reprova em |
|---|---|---|
| G1 | helper ignora `ativo` | `(b) token velho` |
| G2 | `funil_kpis` com `v_ve_tudo` sem helper (corpo lido do 0003 e transformado) | `(b) token velho` |
| G3 | `rh_le_historico` só com o claim | `(c) token velho` |

**seg33**

| id | quebra | reprova em |
|---|---|---|
| T1 | helper ignora `ativo` | `(a) token velho` |
| T2 | `rh_gerencia_agendamento` só com o claim, no USING e no CHECK | `(a) token velho` |
| T3 | só o WITH CHECK com o claim | `(c) token velho INSERIU` |
| T4 | o trigger não normaliza `vaga_id` | `(c) vaga_id gravado … NAO e o da candidatura` |
| T5 | o trigger não carimba `agendado_por` | `(c) agendado_por gravado` |
| T6 | policy que deixa candidato ler a tabela base | `(a) candidato nao-titular` |

**p37_lacunas**

| id | quebra | reprova em |
|---|---|---|
| L1 | helper ignora `ativo` | `(h2)` |
| L2 | `rh_le_notificacoes` só com o claim | `(h2)` |
| L3 | seed sem uma etapa | `(k)` |
| L4 | `sla_public_read` esconde uma linha de anon | `(l)` |
| L5 | trigger pg_temp que deixa resíduo fora do prefixo `smoke37:` | `(n) terminou com 74 (no começo: 73)` |

**Achado da primeira rodada.** Na primeira versão, a S6 tirava **só o helper** de `redacao_rh_select` e **não mordeu**. A forma B tem a subconsulta `candidatura_id IN (SELECT … FROM candidaturas …)`, que roda sob a RLS de `candidaturas` do chamador, e `rh_le_candidaturas` (com helper) já nega o token velho.
- **O que é:** defesa em profundidade, não buraco do smoke. A mordida certa é tirar o ramo rh inteiro.
- **Onde vale também:** a G3, a T2 e a L2 usam a mesma forma.
- **Para o 50-10:** vale saber disto ao ler qualquer mutação de forma B.

## Commits das tarefas

1. **Task 1** — sec05_08 e seg32 em pares; comentário da fixture p46: `6706f8d1` (test)
2. **Task 2** — seg33 e p37_lacunas em pares; narrativa do p37_fidelidade: `ad09c7c8` (test)

## Desvios do plano

### Problemas consertados automaticamente

1. **[Regra 1] p37_lacunas (n), (k) e (l): de fotografia para baseline da execução.**
   - **Achado na:** Task 2 (velho sem = vermelho em (n)).
   - **Problema:** sem isso o arquivo nunca ficaria verde; o plano só previa mexer em (h).
   - **Correção:** o próprio plano manda consertar a fotografia no arquivo que ele possui. O `(o)` passou a 15 por causa de (h2).
   - **Commit:** ad09c7c8.
2. **[Regra 1] seg33: e02 removido depois de (c).**
   - **Achado na:** primeira execução da reescrita, que deu `SEG-33 FAIL (f): owning candidate got 2 RPC row(s)`.
   - **Problema:** a (c) nova cria de fato o agendamento, coisa que a antiga não fazia, e a (f) exige exatamente 1 linha.
   - **Correção:** um DELETE privilegiado logo depois de (c) mantém o contrato da fixture. Nenhuma asserção foi afrouxada.
   - **Commit:** ad09c7c8.
3. **[Regra 2] Falta de população ou de ator agora REPROVA.**
   - sec05_08: o SKIP virou FAIL.
   - seg32: entrou um GATE FINAL, no mesmo idioma do seg33 48-03.
   - O seg33 e o p37_lacunas já tinham gate (o final e o RESUMO); só ganharam o ator velho na condição de fixture pronta.
   - **Commits:** 6706f8d1, ad09c7c8.
4. **[Regra 2] sec05_08: negativas de UPDATE antes das de SELECT.** É o que torna a S4 observável na própria letra.
5. **Endurecimentos além do plano:**
   - comparações de igualdade exata contra a população em lugar de `> 0`;
   - `funil_kpis()` sem filtro também igual ao do administrador em seg32 (b);
   - A também sem PII em (d);
   - o `…00ff` com claim rh mantido nas negativas do sec05_08;
   - mensagem de (e) do p37_fidelidade sobre «escopo por vaga» também atualizada. É só narrativa; o plano citava duas mensagens e uma terceira estava igualmente velha.
6. **Mordidas (22) além da matriz.** Atendem à instrução do orquestrador de provar que cada negativa reescrita ainda reprova numa quebra deliberada. O runner ficou fora do repositório para não sair da lista `files_modified`; as mutações estão descritas acima.

**Total de desvios:** 4 consertos (2 de Regra 1, 2 de Regra 2) mais endurecimentos. Nenhum afrouxa um portão e nenhuma cláusula foi apagada.

## Problemas encontrados

- **O heredoc do bash converteu `\\n` em quebra de linha real** dentro de strings JS do runner de mordidas, que fica fora do repositório. Corrigi trocando por template literals, antes de qualquer execução daquele grupo.
- **Nenhum vermelho por motivo não previsto em portão** (não houve checkpoint). Os dois vermelhos preexistentes (sec05_08 por autor inativo, p37_lacunas (n)) estão diagnosticados acima e foram resolvidos pela reescrita que o plano pede, não por afrouxamento.

## Stubs conhecidos

Nenhum.

## Sinalizações de ameaça

Nenhuma superfície nova.
- **T-50-32 mitigada:** pela matriz e pelas mordidas.
- **T-50-33 mitigada:** cada arquivo reescrito diz no topo «rodar só pelo envelope que aborta», e toda execução deste plano passou por `scripts/p50_ensaio.cjs`. O `capturar()` não acusou `PERSISTIU`.
- **T-50-34 mitigada:** pela (c) do seg33, com as mordidas T4 e T5.

## Prontidão para a próxima etapa

- **50-09:** pode reescrever os smokes do lado das RPCs (oper31, funil34, p44, p47, p49_44) com o mesmo idioma de par. A varredura confirma o dono do `oper31:224` e do `funil34`.
- **50-10:**
  - os cinco arquivos deste plano devem ficar verdes **depois** do apply, rodados pelo envelope em modo `--sem-migracoes`;
  - o p37_fidelidade (e) continua sendo a prova da igualdade byte a byte dos dois quals.
- **Ledger p50, lido só para leitura depois de todos os ensaios:** `["20261005000001"]`. Não houve apply, push, deploy nem escrita persistida.

## Self-Check: PASSED

- FOUND: supabase/tests/sec05_08_smokes.sql, seg32_smokes.sql, p46_fixture_elegivel.sql, seg33_agendamento_smokes.sql, p37_lacunas_rls_idempotencia_smokes.sql, p37_fidelidade_schema_smoke.sql
- FOUND commits: 6706f8d1, ad09c7c8. `git rev-list --count babb2b2b..ad09c7c8` = 2
- Verify da Task 1: «matriz nova ok: sec05_08, seg32; p46 so comentario». Verify da Task 2: «matriz nova ok: seg33, p37_lacunas, p37_fidelidade»
- Mordidas: «mordidas: todas mordem na propria letra» (22/22)
