---
phase: 50-acesso-do-recrutador
plan: 07
subsystem: database
tags: [postgres, rls, security-definer, smoke, portao, mutacoes, ensaio-que-aborta, sc1, sc2, sc3, sc4, sc5]

requires:
  - phase: 50-acesso-do-recrutador
    provides: "50-02: helper VIVO + smoke v1 7/7 + runner M1..M11; 50-03/04/05: migrations 0002/0003/0004 escritas e ensaiadas (não aplicadas); COMPARA do --vistas com fechamento (decisão «A»)"
provides:
  - "smoke p50 v2 — o PORTÃO DA FASE: 13 cláusulas (a–l, z), SC1..SC5 por forma, populações visíveis, evidência 07:* em evidencia="
  - "runner p50_mutacoes.cjs v2 — M12..M23 (depois de M1..M11 intocadas), 23/23 mordem com rótulos, CONTROLE 13/13, nada persistiu"
affects: [50-08, 50-09, 50-10, 50-11]

actuals:
  tokens: 23365
  tasks: 3
  commits: 3
plan_head_before: f0868738474b137e8d90b33aca8958bf6ab634ae
plan_head_after: e753d2d3b20fdd2c6ddc5e44936793c42c9141a7

tech-stack:
  added: []
  patterns:
    - "Conjunto de relações/RPCs POR FORMA (helper OU forma do ramo rh) unido a um mapa deliberado — o mapa nunca restringe; função do conjunto sem entrada = [sem_sonda]"
    - "Cada chamada de RPC num bloco que SEMPRE desfaz (P50C2 carrega o resultado na mensagem): o controle positivo que grava não contamina a sonda seguinte"
    - "Mordida de detector por catálogo: fase 2 (plantado em pg_temp) MENOS fase 1 = exatamente o plantado, em subtransação P5099"
    - "Cobertura de varredura provada na execução: linhas lidas pelo detector = count(pg_policy)"

key-files:
  created:
    - .planning/phases/50-acesso-do-recrutador/50-07-SUMMARY.md
  modified:
    - supabase/tests/p50_acesso_recrutador_smoke.sql
    - scripts/p50_mutacoes.cjs

key-decisions:
  - "«sem_papel» de (i) usa o sub de a_cand (usuário real fora de usuarios_rh) sem app_metadata.role: save_entrevista_guia_edits lê o papel de usuarios_rh (ENTREV-08), então um RH ativo sem claim passaria ali com razão. As 17 funções com guarda continuam exigindo 42501, sem exceção por função"
  - "O conjunto por forma de (g) inclui também policies com `= 'rh'::text` (não só as que chamam o helper), e o de (i) inclui `v_role = 'rh'` mais as entradas do mapa: uma policy/função que perde o helper (M12, M15, M22) continua medida"
  - "Forma A_viva para candidaturas (o ramo rh filtra deleted_at/is_rascunho da própria linha): sem ela, a população «todas as linhas» seria fotografia de PROD sem borda"
  - "M20 sem `v_role = 'rh'`: com ele, (i) reprovaria antes como [sem_sonda]; a forma indireta e a metade positiva das funções são mordidas em pg_temp pela própria (j)"
  - "requirements-completed vazio, como em 50-03..06: EXPORT-05 é compartilhado por planos ainda abertos (50-08..50-11)"

patterns-established:
  - "Rótulos de RPC como <proname>/<nargs> — vírgula de assinatura quebraria a lista de rótulos do runner"
  - "Corpo vivo de objeto que a fase não reescreve, lido de forma preguiçosa (require do runner não toca a rede)"

requirements-completed: []
requirements-addressed: [EXPORT-05]

coverage:
  - id: D1
    description: "Smoke v2 parcial (a–i, z): SC1/SC2 sobre relações e RPCs por forma — 10/10"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node scripts/p50_ensaio.cjs $TMPDIR/p50_07_parcial.sql (esperado 10) → ENSAIO VERDE prefixadas=[0002,0003,0004] smoke50=10/10 — commit c43f48d5"
        status: pass
    human_judgment: false
  - id: D2
    description: "Smoke v2 completo 13/13 com vistas externas: SC3 por forma com mordida em pg_temp, SC4 semeado, SC5 decisor e D-23"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node scripts/p50_ensaio.cjs --vistas supabase/tests/p50_acesso_recrutador_smoke.sql → ENSAIO VERDE … vistas=igual+fechou[4 de anon] · smoke50=13/13 — commits b6059dd3, e753d2d3"
        status: pass
    human_judgment: false
  - id: D3
    description: "Toda cláusula morde: CONTROLE 13/13 + M1..M23 na letra e nos rótulos declarados, nada persistiu"
    requirement: EXPORT-05
    verification:
      - kind: integration
        ref: "node scripts/p50_mutacoes.cjs → «controle verde; 23/23 mutacoes mordem; nada persistiu» + conferência do verify «portao morde: 23/23» — commit e753d2d3"
        status: pass
    human_judgment: false

duration: ~45min
completed: 2026-10-05
status: complete
---

# Phase 50 Plan 07: Smoke-portão v2 e runner de mutações — Summary

**O smoke p50 virou o portão da fase: 13 cláusulas que provam SC1..SC5 por forma. A única parte fora dele é a sessão real do SC1, que fica com o 50-11. O ensaio em PROD, que aborta e prefixa 0002+0003+0004, deu verde com `smoke50=13/13` e `vistas=igual+fechou[os 4 fechamentos de anon já conhecidos]`. O runner prova que todas as 23 mutações mordem, cada uma na letra e com os rótulos que declara. Nada persistiu e não houve apply nem push.**

## Performance

- **Duração:** cerca de 45 min no total. A primeira escrita foi às 01:31Z e o último commit de task às 01:46Z (UTC de 2026-10-06).
- **Tarefas:** 3 de 3.
- **Arquivos:** 2 modificados. O smoke passou de 943 para 2154 linhas e o runner de 355 para 535.

## Realizações

### Task 1 — (g), (h), (i) — commit c43f48d5

**Conjunto de relações, achado por forma**, com população real e população depois de semear:

| relação | forma | população |
|---|---|---|
| agendamentos_entrevista | B | 2 |
| analise_candidato_vaga | A | 26 |
| candidaturas | A_viva | 40 |
| comparativo_solicitado | A | 6 |
| decisao_final | B | 7 |
| decisao_final_historico | B | 11 |
| entrevista_analises | B | 14 |
| entrevista_guias | B | 6 |
| historico_candidatura | B | 79 |
| notificacoes_enviadas | B | 73 |
| redacoes_candidato | B | 3 |
| scores_candidato | B | 19 |
| v_analises_presas | B | **0 → 1, semeada** |

- **Semeada:** só `v_analises_presas`. A semente transforma uma análise `sucesso` antiga de um candidato que não é a_cand em `pendente`. A tabela não tem trigger.
- **`vacuos`:** nenhum (`07:vacuos=-`).

**(g)** O rh ativo vê, em cada relação, exatamente a população.

**(h)** Atores e o que cada um vê:

| ator | resultado |
|---|---|
| velho (a_inativo) | 0 em cada relação |
| velho_mp (a_inativo_mp) | 0 em cada relação |
| visualizador (claim `visualizador` + a linha ativa) | 0 em cada relação |
| candidato | 0 linhas alheias |
| c_ativo (controle) | = população |

**Conjunto de RPCs, achado por forma: 18.** Cada RPC é rotulada `<proname>/<nargs>`. A coluna «ativo» é o controle positivo (rh + a_ativo). A coluna «candidato» usa ids de uma candidatura ALHEIA. Todas as chamadas são desfeitas.

| RPC | tipo | ativo (controle) | candidato |
|---|---|---|---|
| listar_pedidos_dados/1 | leitura | n:3 | 42501 |
| contar_pedidos_dados_pendentes/0 | leitura | i:0 | 42501 |
| listar_revisoes_decisao/1 | leitura | n:3 | 42501 |
| contar_revisoes_pendentes/0 | leitura | i:2 | 42501 |
| funil_kpis/1 | leitura, sem guarda de papel | kpis:cheio | kpis:vazio |
| listar_historico_candidatura/1 | leitura | n:4 | 42501 |
| ler_resposta_caso_aberto_sjt/1 | leitura | j:sem_resposta_enviada | 42501 |
| registrar_decisao/3 | escrita | ok | 42501 |
| rejeitar_candidatura/3 | escrita | ok | 42501 |
| liberar_cognitivo/2 | escrita | ok | 42501 |
| revogar_cognitivo/2 | escrita | ok | 42501 |
| reprocessar_analise/1 | escrita | ok | 42501 |
| confirmar_revisao_entrevista/1 | escrita | 23514 (negócio) | 42501 |
| salvar_avaliacao_entrevista/3 | escrita | 23514 | 42501 |
| salvar_avaliacao_entrevista/4 | escrita | 23514 | 42501 |
| save_entrevista_guia_edits/3 | escrita | ok | 42501 |
| salvar_revisao_redacao/4 | escrita | 23514 | 42501 |
| upsert_pergunta_opcoes_metadata/2 | escrita | 23514 (depois da linha do helper; vaga semeada em rascunho) | 42501 |

As outras sondas também passaram em todas as 18:

| ator | regra exigida |
|---|---|
| velho, velho_mp | 42501. Nas leituras admite resultado vazio, nunca ≥ 1 |
| sem_papel | 42501 nas 17 com guarda de papel; no funil, KPIs vazios |
| anon | sem EXECUTE no ACL **e** a chamada recusada com `permission denied for function` |

Verificação parcial: `ENSAIO VERDE: …p50_07_parcial.sql · prefixadas=[20261005000002,20261005000003,20261005000004] · aplicadas=[20261005000001] · ausentes=[] · smoke50=10/10`. O verify deu rc=0.

### Task 2 — (j), (k), (l) e (e) estendida — commit b6059dd3

**(j) Cobertura de policies:**
- `lidas = total = 183`. Por schema: `cron:2`, `public:155`, `storage:26`.
- A lista de exclusão antiga leria só 155 das 183: `cobertura_antiga=155/183` e `cobertura_mordida=real`.
- Formas encontradas: 14 policies na forma de igualdade e 18 funções com `v_role = 'rh'`.
- Ofensores: 0 nos cinco detectores. As 14 policies de escopo estão todas na forma.
- Mordida em pg_temp **exata**: `p50_bite_pol` no detector de policy; `p50_bite_fn` nos detectores de função, de forma indireta e de rh-sem-helper. A cobertura também vale na fase da mordida.

**(k) SC4.** Foram semeados 2 pedidos pendentes: um com candidatura viva e um órfão. As revisões pendentes vivas já eram 2, então não houve semente de revisão.

| chamada | admin | rh ativo | md5 (12 primeiros) |
|---|---|---|---|
| listar_pedidos_dados(true) | 5 | 5 | igual dentro da execução (muda entre execuções porque os ids semeados são novos) |
| contar_pedidos_dados_pendentes() | 2 | 2 | — |
| listar_revisoes_decisao(true), sem `pode_responder` | 3 | 3 | `b8603d134007` |
| listar_revisoes_decisao(false), sem `pode_responder` | 2 | 2 | `2cd47009c1ce` |
| contar_revisoes_pendentes() | 2 | 2 | — |

- O rh vê os dois semeados, o órfão incluído (`ativo.ve=true/true`).
- **Token antigo:** `n:0` / `i:0` nas cinco chamadas (md5 da lista vazia).
- **Candidato:** 42501 nas cinco.

**(l) SC5:**
- **REVISAO-05:** o decisor D é a_ativo, semeado como decisor da 1ª revisão pendente viva. Ele recebe `42501` com «decisor». Outro rh ativo (F) recebe `ok`. Na fila de D, há 2 linhas dele, todas com `pode_responder` falso (`2/0`).
- **D-23 = `comportamental`:** a decisão de outra candidatura viva foi semeada como `rejeitado` de D `revertida`. `registrar_decisao(…,'rejeitado',…)` sob D dá `42501` com «D-23»; sob F, `em_espera` dá `ok`. O literal `d.por_usuario = v_uid` está presente.

**(e)** O disjunto do administrador agora é conferido nas 14 policies da forma de igualdade, no USING e no WITH CHECK. O julgamento passou a ser por rótulos.

Verificação completa (o verify da Task 2, repetido depois do último commit, rc=0, 1552 ms):

```
ENSAIO VERDE: supabase/tests/p50_acesso_recrutador_smoke.sql · prefixadas=[20261005000002,20261005000003,20261005000004] · aplicadas=[20261005000001] · ausentes=[] · vistas=igual+fechou[anon.public.decisao_final_historico,anon.public.entrevista_analises,anon.public.entrevista_guias,anon.public.scores_candidato] · smoke50=13/13 · evidencia=03:…;04:…;05:…;07:pop=…;07:semeadas=v_analises_presas;07:vacuos=-;07:rpcs=18;07:i_ativo=…;07:i_cand=…;07:cobertura=183/183,antiga=155/183,mordida=real;07:pol_por_schema=cron:2,public:155,storage:26;07:formas=pol_rh:14,fn_rh:18;07:mordida_pg_temp=exata;07:sc4=…;07:sc4_semeados=2(orfao=1),revisao_semeada=nao,revisoes_pendentes=2;07:sc5=decisor>e:42501,outro>ok,proprias_pode=2/0,decisor_semeado=sim;07:d23=comportamental>e:42501,outro>ok,literal=true · 1552 ms
```

Os 4 fechamentos `+fechou[…]` são exatamente os do 0002, previstos pelo 50-03. A evidência `07:*` é o que o 50-10 lê em `evidencia=`.

### Task 3 — runner v2 — commit e753d2d3

CONTROLE: `smoke50=13/13`, 1847 ms.

| Mutação | Reprova em | Duração |
|---|---|---|
| M12 | (g) [scores_candidato] | 1135 ms |
| M13 | (h) [velho_mp.decisao_final,velho.decisao_final] | 961 ms |
| M14 | (h) [candidato.,velho_mp.,velho.,visualizador.v_analises_presas] | 1506 ms |
| M15 | (i) [ativo.liberar_cognitivo/2] | 1344 ms |
| M16 | (i) [sem_papel.reprocessar_analise/1] | 1177 ms |
| M17 | (i) [anon.rejeitar_candidatura/3] | 1059 ms |
| M18 | (k) [igual.listar_pedidos_dados,rh_ve_orfao] | 1320 ms |
| M19 | (l) [decisor] | 1278 ms |
| M20 | (j) [fn:public.p50_mut_dono/0] | 1281 ms |
| M21 | (j) [pol:public.vagas_associadas_recrutadores.p50_mut_dono_pol] | 1272 ms |
| M22 | (i) [velho.,velho_mp.,sem_papel.,candidato.funil_kpis/1] | 1294 ms |
| M23 | (e) [admin_disjunto:historico_candidatura.rh_le_historico] | 1137 ms |

- M1..M11 continuam mordendo nas mesmas letras. A M6 agora traz `[admin_disjunto:candidaturas.rh_le_candidaturas]`.
- Resultado: `controle verde; 23/23 mutacoes mordem; nada persistiu`. A conferência do verify imprimiu `portao morde: 23/23 (todas as definidas no runner, M1..M23); nada persistiu`.
- Nenhuma rodada foi PULADA, nenhuma deu 40001 e nenhuma deu TIMEOUT.
- A tabela «O PORTÃO MORDE» do cabeçalho do smoke lista M12..M23 com estas medidas.

## Varredura de forma (CLAUDE.md)

- A varredura achou 346 linhas na base do plano e 354 depois. As 8 a mais são deste arquivo e todas são escopo deliberado:
  - 6 `v_rc <> 1`, das sementes;
  - `v_ran <> 2`, das duas fases de (j);
  - `<> 0` de `pode_responder`.
- Achados que tocam os objetos vigiados agora:
  - `funil34_kpis_smokes.sql:160,177`: premissa de posse, a ser tratada no 50-09;
  - `p44:357` e `p42:695,725`: escopo deliberado.
- Está tudo registrado no cabeçalho do smoke.

## Desvios do plano

1. **[Regra 1, sem fotografia] Forma A_viva para candidaturas.** A regra A/B do plano daria a candidaturas a população «todas as linhas». O ramo rh de `rh_le_candidaturas` filtra `deleted_at`/`is_rascunho` da própria linha, então essa igualdade só vale enquanto PROD não tem borda. A população passou a ser a das linhas vivas. Arquivo: o smoke. Commit c43f48d5.
2. **[Regra 2] O conjunto por forma de (g) inclui `= 'rh'::text`, e o de (i) inclui `v_role = 'rh'` mais o mapa.**
   - Com «chama o helper» apenas, as mutações que tiram o helper (M12, M15, M22) tirariam o objeto da vigilância. É o modo de falha «lista que não reprova nada» do CLAUDE.md.
   - O mapa é uma união: nunca restringe o conjunto. Uma função do conjunto que não esteja no mapa reprova com [sem_sonda].
3. **«sem_papel» de (i) usa o sub de a_cand, não o de a_ativo.**
   - `save_entrevista_guia_edits` lê o papel de `usuarios_rh` (ENTREV-08). Com o sub de um RH ativo sem claim, ela passa, e passa com razão.
   - O plano não fixou de quem é o sub. Escolher um usuário real fora de `usuarios_rh` mantém a exigência de 42501 nas 17 funções com guarda, sem abrir exceção para nenhuma delas. Não é afrouxamento.
   - As guardas por JWT recusam pelo `coalesce` antes de olhar o sub, e a M16 morde por esta sonda.
4. **Sondas extras, que só endurecem:**
   - token antigo com o mesmo papel (`velho_mp`) em (h) e (i);
   - controle `c_ativo` dentro de (h);
   - controle de outro rh no D-23 (`c_d23_outro`) e `c_proprias` em (l);
   - em (j), o detector de rh-sem-helper também precisa achar a função plantada;
   - (z) também cobre `solicitacoes_dados` e `decisao_final`.
5. **[Regra 3] Em (i), a vaga da pergunta usada por `upsert_pergunta_opcoes_metadata` vira `rascunho` dentro do envelope.** A função recusa vaga fora de rascunho com P0001 ANTES da linha do helper. Sem isso, o token antigo seria barrado pelo motivo errado. PROD não tem vaga em rascunho.
6. **M20 sem `v_role = 'rh'`.** Com essa forma, (i) reprovaria antes, como [sem_sonda]. A M20 prova o detector `fn:` de (j). O detector indireto e o de rh-sem-helper são mordidos pela própria (j), em pg_temp.
7. **(e) passou a julgar por rótulos.** É exigência do plano: a M23 declara rótulos. A M6, que não declara rótulo, continua mordendo.
8. **M19 com leitura preguiçosa do corpo vivo.** O `require()` do runner, usado pela conferência do verify, não toca a rede.

**Total:** 8 desvios, todos de correção ou endurecimento. Nenhum afrouxa um portão, e nenhum ponto chegou a ficar vermelho por motivo que o plano não previa.

## Problemas encontrados

- **Erros no smoke antes do primeiro verde:**
  - ambiguidade de coluna `s` contra uma variável PL/pgSQL (42702);
  - `IF CASE … THEN … END THEN`: o PL/pgSQL corta a condição no primeiro THEN, e o conserto foi pôr parênteses.

  Os dois foram corrigidos antes dos commits.
- **Arquivo de trabalho corrompido durante a edição.** O `String.replace` do JS interpreta `$'` no texto de substituição, e a inserção de (j)–(l) duplicou trechos do arquivo de trabalho. Foi detectado pela contagem de tags `$…$`. O smoke foi restaurado do commit da Task 1, e a inserção refeita com split/join. Conferi que o texto de (g)–(i) commitado na Task 1 bate com o original, com as únicas diferenças sendo as intencionais. Nenhum artefato commitado foi afetado.

## Itens adiados

Nenhum.

## Sinalizações de ameaça

Nenhuma superfície nova.
- T-50-28, T-50-29, T-50-30, T-50-31, T-50-55 e T-50-56 estão mitigadas como o plano descreve.
- O smoke escreve só dentro dos envelopes P50C1, P50C2 e P5099, e de uma requisição que aborta. A guarda `p50.tx` continua sendo a primeira instrução.
- A saída tem só ids, contagens, md5 e SQLSTATE.

## Stubs conhecidos

Nenhum.

## Prontidão para a próxima etapa

- O 50-08 e o 50-09 podem rodar os seus ensaios. O acoplamento declarado está no `coupling_justified`: 55P03, 57014 e 40001 são inconclusivos e se repetem, nunca são concluídos.
- O 50-10 lê `evidencia=07:*` e exige `smoke50=13/13` com `vistas=igual(+fechou[…])?`. O escopo da revisão bloqueante passa a incluir este smoke v2 e o runner v2.
- Ledger p50, lido só para leitura depois de todos os ensaios: `["20261005000001"]`. Não houve apply, push, deploy nem escrita persistida.

## Self-Check: PASSED

- FOUND: supabase/tests/p50_acesso_recrutador_smoke.sql (esperado 13; `P50C FAIL (j)` presente)
- FOUND: scripts/p50_mutacoes.cjs (`id: 'M12'`..`'M23'`, `trocar(`)
- FOUND commits: c43f48d5, b6059dd3, e753d2d3. `git rev-list --count f0868738..e753d2d3` = 3
- Ledger p50 = ["20261005000001"], lido só para leitura
