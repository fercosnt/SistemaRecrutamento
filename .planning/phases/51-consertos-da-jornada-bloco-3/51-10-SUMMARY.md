---
phase: 51-consertos-da-jornada-bloco-3
plan: 10
subsystem: database
tags: [jorn-42, art-20, fila-revisao, knockout, funil-kpis, prazo-reabertura, acl, ensaio, mutacoes, onda-b, tracer, d-56]
status: complete

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-08: public.revisao_rejeicao + RPCs (migration 20261008000002, NAO aplicada), smoke51b 12 clausulas, MB1..MB14; 51-06: p51_ensaio.cjs / p51_mutacoes.cjs"
  - phase: 50
    provides: "escopo das filas (administrador OU rh ativo pelo helper is_active_rh_user), smoke p50_acesso_recrutador (k)/(i), p50_desfazer.cjs"
  - phase: 48
    provides: "varrer_prazos_reabertura (laco de decisao_final) e o job prazo-reabertura-sweep"
provides:
  - "supabase/migrations/20261008000003_p51_fila_tres_origens.sql (NAO aplicada): listar_revisoes_decisao (DROP + CREATE, +origem/+pedido_id), contar_revisoes_pendentes (duas fontes), ler_contexto_knockout_revisao (D-11), funil_kpis (D-35), varrer_prazos_reabertura (A3); PRE/POS-PORTAO P51-03"
  - "smoke51b v2: clausulas (l) fila, (m) contagem, (n) contexto do knockout, (o) KPI, (p) prazo; esperado 17"
  - "p50_acesso_recrutador_smoke.sql: (k) com desempate por pedido_id; (i) MAPA com responder_revisao_rejeicao/3 e ler_contexto_knockout_revisao/1"
  - "MC1a..MC8 em scripts/p51_mutacoes.cjs (29/29 mordem)"
  - "scripts/p50_desfazer.cjs: docblock OBSOLETO + recusa com 20261008000003 no ledger"
  - "ref local refs/gsd/51-10/base = 353996c1"
affects: [51-11, 51-12, 51-13, 51-14, 51-16]

actuals:
  tokens: 38700        # chars/4 sobre o diff realizado 353996c1..484c7166 (154768 octetos)
  tasks: 3
  commits: 3           # MEDIDO: git rev-list --count 353996c1..HEAD antes do commit deste SUMMARY
plan_head_before: 353996c14ac074f27ec7fecb2f77dbc8b50a6a38
plan_head_after: 484c7166c3a69a2e84fb437373248e77cc24caab

tech-stack:
  added: []
  patterns:
    - "Troca de RETURNS TABLE: DROP (sem cascata, dependentes contados no PRE) + CREATE + ACL recriada POR DIFERENCA contra o conjunto aclexplode capturado no PRE"
    - "Fila multi-fonte por UNION ALL dentro de subconsulta com colunas x_* (sem colisao com OUT params sob #variable_conflict use_column) e LIMIT sobre o conjunto"
    - "Reescrita com prova de minimalidade: POS compara md5(corpo novo) com md5(replace(corpo capturado, trecho velho, trecho novo)); laco preservado procurado byte a byte no corpo novo"
    - "Comentario de funcao estendido, nunca reescrito: POS exige o capturado no inicio do novo"
    - "Cada clausula v2 do smoke tem envelope P51B1 e fixture proprios (titular, vagas, rejeicoes e pedidos por RPC real), independente das outras e da tabela viva"
    - "Mutacao de funcao criada por CREATE FUNCTION: extrair e reescrever como CREATE OR REPLACE (vale antes e depois do apply)"

key-files:
  created:
    - supabase/migrations/20261008000003_p51_fila_tres_origens.sql
  modified:
    - supabase/tests/p51_revisao_rejeicao_smoke.sql
    - supabase/tests/p50_acesso_recrutador_smoke.sql
    - scripts/p51_mutacoes.cjs
    - scripts/p50_desfazer.cjs

key-decisions:
  - "origem da fila no vocabulario unico do sistema (humana / humana_triagem / automatica); os selos D-33 sao do cliente (51-14); colunas novas no FIM do RETURNS TABLE"
  - "contar_revisoes_pendentes passou a juntar candidatos e vagas tambem no ramo decisao_final, para que o predicado seja LITERALMENTE o da fila (equivalente pelas FKs NOT NULL)"
  - "ler_contexto_knockout_revisao: removida devolve TODO o resto nulo (a opcao que eliminou E a resposta); a opcao e resolvida dentro da vaga da candidatura (opcao_id so e unico por pergunta)"
  - "Token de recrutador INATIVO na fila/contagem: contrato do P50 mantido (42501 OU vazio, nunca >= 1) — o plano dizia 42501; o corpo da guarda nao foi alterado"
  - "Predicado do alerta A3 seguido literalmente (NOT EXISTS decisao_final com em > reaberta_em): um em_espera registrado depois da reabertura BLOQUEIA o alerta no laco novo, ao contrario do A5 do laco de decisao_final — levado ao 51-16"
  - "p50 (i): MAPA ganhou as duas RPCs do JORN-42 que chamam o helper (sem elas o smoke da P50 ja reprovava com a 0002); mordida provada por MC7/MC8"

requirements-completed: []

coverage:
  - id: D1
    description: "A fila do RH tem as tres origens com selo (origem) e id (pedido_id), igual para administrador e RH ativo; REVISAO-05 por chamador; nada de justificativa no RETURNS"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "supabase/tests/p51_revisao_rejeicao_smoke.sql#(l) — ensaio --vistas 0002+0003: 51b=17/17, 51b.l=fx3(tri,ko,dfr),papeis=a:rh/b:administrador; MC1b/MC3 mordem"
        status: pass
    human_judgment: false
  - id: D2
    description: "O contador e a fila nao divergem; sobe exatamente pelos pendentes; respondido fora"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "supabase/tests/p51_revisao_rejeicao_smoke.sql#(m) — 51b.m=pend2+resp1,contagem=2->4; MC2 morde"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-11: o RH abre o contexto do knockout sem acesso novo; inativo/candidato/anon fora, sem oraculo"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "supabase/tests/p51_revisao_rejeicao_smoke.sql#(n); MC5 (n), MC7 (p50 i)"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-35: o funil deixa de contar como knockout quem a revisao reabriu"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "supabase/tests/p51_revisao_rejeicao_smoke.sql#(o) — 51b.o=ko1:1->0; MC4 morde; funil34_kpis_smokes verde"
        status: pass
    human_judgment: false
  - id: D5
    description: "A3: reabertura esquecida fora da decisao final gera o mesmo alerta, uma vez"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "supabase/tests/p51_revisao_rejeicao_smoke.sql#(p) — 51b.p=reab3(ko,mov,dfd):alerta=ko,2a=0; MC6 morde; p48_prazo_reabertura_smoke verde"
        status: pass
    human_judgment: false
  - id: D6
    description: "O portao da P50 continua vigiando admin = recrutador, com desempate, e morde"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "p50_acesso_recrutador_smoke 50=13/13 com 0002+0003 e sem migracoes; MC1a -> P50C FAIL (k) [igual.listar_revisoes_decisao_true,igual.listar_revisoes_decisao_false]"
        status: pass
    human_judgment: false
  - id: D7
    description: "Nada aplicado nem empurrado; o desfazer gerado da P50 intocado"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "node p46apply.cjs sql (so leitura): cabeca=20261008000001, v0203=0, revisao_rejeicao=null, ler_contexto=null, md5 das 4 funcoes = medidos; git diff p50_desfazer_expansao.sql vazio"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-10-09
---

# Phase 51 Plan 10: a fila do RH com as três origens, o KPI e o prazo (JORN-42) Summary

**A migration `20261008000003` (não aplicada) põe na mesma fila e no mesmo contador do RH os pedidos de revisão das três origens. Cada linha traz selo e id próprios. O RH ganha o contexto do knockout sem acesso novo, o funil deixa de contar como knockout quem a revisão reabriu, e o alerta de prazo passa a cobrir as reaberturas novas. Tudo foi provado em ensaio contra PROD que aborta: smoke `51b=17/17`, `vistas=igual`, e `29/29` mutações mordem.**

## Performance

- **Duração:** ~22 min (05:39:52Z → 06:01:44Z)
- **Tarefas:** 3/3
- **Arquivos:** 1 criado, 4 modificados

## Passo 0 — medições (só leitura, PROD, 2026-10-09)

| Função | md5(prosrc) | md5(functiondef) | vol | ACL | comentário |
|---|---|---|---|---|---|
| `listar_revisoes_decisao(boolean)` | `85642fe45f6bb786fc7e965476b727a6` | `a3889a20…` | s | postgres, authenticated, service_role | sim |
| `contar_revisoes_pendentes()` | `63b7abffd3eee25a26810d9fc01fbadf` | `1c5f3ccb…` | s | postgres, authenticated, service_role | sim |
| `funil_kpis(uuid)` | `52583cd9fbe981cd92c307853a9604af` | `34181e8b…` | v | postgres, authenticated, service_role | sim |
| `varrer_prazos_reabertura()` | `8407510d618883efcf28b4af826e509f` | `7bc05cdd…` | v | postgres, service_role | sim |
| `anonimizar_candidato(uuid,boolean)` | `4624854408950110cbfebc971481145a` | `ecfec02c…` | v | (D-08, só impressão) | |
| `plano_exclusao_titular(uuid)` | `35d451416c22e150e48a583d879fe48d` | `6f50df0f…` | s | (D-08, só impressão) | |

- **Propriedades comuns:** todas são `SECURITY DEFINER`, `search_path=""` e têm dono postgres. Nenhuma tem PUBLIC nem anon no ACL.
- **Corpo de partida:** é o `pg_get_functiondef` VIVO, conferido igual ao do arquivo `20261005000003` (no `funil_kpis`, por `diff` do texto inteiro). A fila e o contador são o corpo do P50.
- **`ler_contexto_knockout_revisao`:** ausente.
- **Dependentes de `listar_revisoes_decisao` em `pg_depend`:** 0.

**Colunas do caminho do D-11 (medidas):**

| Tabela | Colunas usadas | Chave |
|---|---|---|
| `perguntas_formulario` | `id`, `vaga_id`, `ordem`, `texto_pergunta` | `id` |
| `pergunta_opcao_metadata` | `pergunta_id`, `opcao_id`, `opcao_texto` (o rótulo da opção), `tag` | UNIQUE `(pergunta_id, opcao_id)`, não por `opcao_id` |
| `respostas_formulario` | `candidatura_id`, `pergunta_id`, `resposta_opcoes` (jsonb), `resposta_texto`, `resposta_numerica` | UNIQUE `(candidatura_id, pergunta_id)` |

O `opcao_id` não é único sozinho, por isso a RPC resolve a opção dentro da vaga da candidatura.

`decisao_final.em` existe (`timestamptz NOT NULL`) e é usado no predicado do A3.

## Tarefas

1. **Tracer: fila, contagem e contexto do knockout**
   - Migration, primeira metade, com os blocos PRE, `$acl$` e POS (fila).
   - Cláusulas (l), (m) e (n) no smoke.
   - Ensaio com `0002`+`0003`: `51b=15/15` e `vistas=igual`. Só com a `0002`, a (l) reprova pelo motivo certo: o `RETURNS` não tem `origem`/`pedido_id`.
   - O tracer foi re-verificado antes de expandir.
2. **D-35 e A3**
   - `funil_kpis` = o corpo vivo com só a troca do D-35. O POS prova isso por md5 do `replace`.
   - `varrer_prazos_reabertura`: o laço de `decisao_final` ficou byte-igual (o POS o procura inteiro no corpo novo) e ganhou um laço irmão.
   - Cláusulas (o) e (p). Ensaio `51b=17/17`.
   - Regressão verde: `funil34_kpis_smokes`, `p48_prazo_reabertura_smoke` e `p42_revisao_art20_smoke`. Os três têm portão de contagem que levanta (SKIP conta como falha no funil34), então o verde não é vácuo.
3. **(k) da P50, mutações e desfazer**
   - (k) com desempate, (i) com o MAPA estendido, MC1a..MC8.
   - `p50_desfazer.cjs` recusa como `OBSOLETO`.

## Varredura por forma dos leitores de `knockout_automatico` (D-50)

| Onde | Leitor | Já exige `status = 'rejeitado'`? | Disposição |
|---|---|---|---|
| corpo vivo | `funil_kpis(uuid)`, CTE `ko` | **não** | **consertado nesta migration (D-35)** |
| corpo vivo | `explicacao_rejeicao_automatica(uuid)` | sim (`c.status = 'rejeitado' AND c.motivo_rejeicao = …`) | seguro com a reabertura |
| corpo vivo | `explicacao_rejeicao_origem(uuid)` | sim (os dois ramos começam por `c.status = 'rejeitado'`) | seguro |
| corpo vivo | `submit_candidatura_atomic(…)` | é a escritora (a (i) do 51-08 a fixa como a única) | nada a consertar |
| `src/`, `supabase/functions/` (`*.ts`, `*.tsx`) | — | `grep -rln knockout_automatico` não acha **nenhum arquivo** | nenhuma pendência de front/EF |
| `analise_candidato_vaga.descartada_motivo = 'knockout_automatico'` (P48, `20260921000004`) | só o espelho gerado da allowlist (`supabase/functions/_shared/exportAllowlist.ts:144,167`) | — | auditoria histórica, nada a consertar. Caso nomeado: as 3 candidaturas de teste do 51-08 (0f7b217c, 25a4231c, 92522073), que vão ao checkpoint do 51-16 |

## Mutações — `node scripts/p51_mutacoes.cjs` (0002+0003 prefixadas)

```
CONTROLE verde (p51_raven_status_smoke.sql): par 51a=7/7 — MA1..MA6 mordem
CONTROLE verde (p51_revisao_rejeicao_smoke.sql): par 51b=17/17 (978 ms) — MB1..MB14 mordem
MC1b -> P51B FAIL (l) (1212 ms)   MC2 -> (m) (837 ms)   MC3 -> (l) (851 ms)
MC4  -> P51B FAIL (o) (899 ms)    MC5 -> (n) (907 ms)   MC6 -> (p) (907 ms)
CONTROLE verde (p50_acesso_recrutador_smoke.sql): par 50=13/13 (1057 ms)
MC1a -> P50C FAIL (k) [igual.listar_revisoes_decisao_true,igual.listar_revisoes_decisao_false] (1176 ms)
MC7  -> P50C FAIL (i) [velho.ler_contexto_knockout_revisao/1,velho_mp.…] (972 ms)
MC8  -> P50C FAIL (i) [velho.responder_revisao_rejeicao/3,velho_mp.…] (935 ms)
controle verde; 29/29 mutacoes mordem; nada persistiu
```

Cada mutação mordeu sobre linhas que o mundo da cláusula contém. Os textos foram capturados um a um por `p51_ensaio.cjs --mutacao`:

| MC | Linhas mordidas | Texto da reprovação |
|---|---|---|
| MC1a | As revisões pendentes vivas de `decisao_final` do mundo do (k). O RH ativo deixa de vê-las, e o md5 admin × rh diverge. `igual.contar_revisoes_pendentes` não aparece. | — |
| MC1b | Fixture de (l). A (rh) vê 1 dos 3 pedidos (só `dfr`); somem `tri` e `ko`. | `a: ve 1 pedido(s) da fixture em listar(true) e 1 em listar(false)` |
| MC2 | Fixture de (m). O `resp` respondido passa a contar. | `a contagem foi de 2 para 5` e `contar_revisoes_pendentes()=5 mas listar_revisoes_decisao(false) tem 4 linha(s)` |
| MC3 | Fixture de (l). A vê `pode_responder=true` no pedido pendente de `tri`, que ele rejeitou. | `a: linha {…}` |
| MC4 | Fixture de (o). O `ko` revertido segue com `knockouts: 1`. | — |
| MC5 | Fixture de (n). O recrutador inativo recebe `ACEITO:{situacao: disponivel…}`. | — |
| MC6 | Fixture de (p). O `ko` fica sem marca de alerta depois da 1ª varredura, e a 2ª repetiria o despacho. | — |

## Varredura D-56 (padrão literal do CLAUDE.md, `supabase/tests/*.sql`)

População: 385 linhas. Achados que tocam as quatro funções reescritas:

| Achado | Classificação | Situação |
|---|---|---|
| `funil34_kpis_smokes.sql:216` (`knockout_rate.total <> 0` do token velho) | escopo; o D-35 não muda `total` | verde |
| `p48_prazo_reabertura_smoke.sql:303/306/322/328/337/346/391/421` | contagens da própria fixture e esperado 6; escopo | verde |
| `p48_prazo_reabertura_smoke.sql:77` (`v_real <> 0`) | premissa de escopo que conta **só `decisao_final`** | **pendência nomeada para o 51-16** |
| `p50_acesso_recrutador_smoke.sql` (k) | não casa o padrão (é md5), mas é o portão da C-12 | editado e provado (MC1a) |

Sobre a pendência da linha 77: depois do apply, uma reabertura viva de `revisao_rejeicao` vencida e sem alerta faria o `a_q_total = 1` (:306) ver 2 e reprovar com diagnóstico de fixture. Hoje é verde, porque a tabela viva é vazia. Foi registrada no WINDOWS #90.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] O smoke da P50 já reprovava com a `0002`: `P50C FAIL (i): [sem_sonda:responder_revisao_rejeicao/3]`**
- **Found during:** Passo 0 da Task 1. Medido antes de escrever qualquer linha, com o ensaio só da 0002.
- **Issue:** a (i) da P50 exige uma sonda no MAPA para toda função de `public` que chama `is_active_rh_user`. A `responder_revisao_rejeicao` (51-08) e a nova `ler_contexto_knockout_revisao` chamam o helper. O 51-08 não rodou esse smoke, porque nenhuma MB o tinha como alvo. O verify da Task 3 exige esse smoke verde.
- **Fix:** o MAPA da (i) ganhou duas entradas com pedido inexistente: o helper vem antes da busca, então o velho recebe 42501 e o ativo recebe P0002. Com isso o portão ficou mais estrito, não mais frouxo. A mordida foi provada por MC7 e MC8. O plano dizia «nenhuma outra linha muda» no p50; esta é a exceção, documentada no cabeçalho do smoke.
- **Files:** `supabase/tests/p50_acesso_recrutador_smoke.sql`, `scripts/p51_mutacoes.cjs`. **Commit:** `484c7166`.

**2. [Rule 1 - Bug de instrumento] (l)/(m) exigiam 42501 do recrutador INATIVO**
- **Issue:** a fila e o contador são o corpo do P50, e para o token velho devolvem VAZIO, não 42501. O contrato do P50 (k) é «42501 ou vazio, nunca ≥ 1». A primeira corrida reprovou com `RH inativo=«ACEITO»`.
- **Fix:** o julgamento aceita 42501 ou fila/contagem ZERO, e continua reprovando qualquer linha. A guarda da RPC não foi mexida. **Commit:** `11ac3ad9`.

**3. [Rule 1 - Bug de fixture] (p) lia `revisao_rejeicao` sob `authenticated`**
- **Issue:** `42501 permission denied for table revisao_rejeicao`, reportado como «erro INESPERADO» (nada foi julgado).
- **Fix:** os ids dos pedidos passaram a ser lidos como postgres antes de trocar o papel. **Commit:** `0de8a5de`.

**4. [Escopo ampliado, Rule 2] (k) com desempate também em `listar_revisoes_decisao_false`**
- O plano nomeava só o agregado `_true`. O `_false` tem a mesma exposição à C-12, e a mesma expressão vale antes e depois da 0003.

**5. [Rule 2] (p) cobre também `dfd`, a decisão final registrada depois da reabertura**
- Sem esse caso, o `NOT EXISTS (… d.em > rr.reaberta_em)` do A3 não tinha linha que o exercitasse.
- Dentro de uma requisição todo `now()` é igual, então a fixture envelhece `reaberta_em` só nas linhas dela.

**6. [Interpretação registrada] Comentários**
- O de `listar_revisoes_decisao` foi recriado com texto novo («13 colunas»). O antigo dizia «11 colunas», e repeti-lo deixaria o catálogo mentindo.
- O de `contar_revisoes_pendentes` foi reescrito, mantendo o invariante dos dois predicados.
- Os de `funil_kpis` e `varrer_prazos_reabertura` foram ESTENDIDOS. O POS exige o comentário capturado inteiro no começo do novo.
- O ACL das quatro é igual ao capturado. A comparação é por conjunto `aclexplode`, porque a ordem textual do `proacl` muda depois do DROP + CREATE.

**7. [Arquivo extra no commit da Task 3] cabeçalho do `p51_revisao_rejeicao_smoke.sql`**
- Recebeu a tabela «O PORTÃO MORDE» v2 (MC1b..MC6) e a re-varredura D-56. Só comentário.

**Total:** 3 auto-fixes de instrumento ou fixture (Rules 1/3), 2 ampliações de cobertura (Rule 2) e 2 registros. **Impacto:** nenhuma expectativa da especificação foi afrouxada, exceto o caso 2, que alinha o smoke com o contrato vivo do P50. A migration não foi alterada para caber no smoke.

## Para o portão 51-16 (pendências nomeadas)

- **A3 × A5:** no laço novo, um `em_espera` registrado depois da reabertura BLOQUEIA o alerta, porque o predicado do plano é «sem `decisao_final` depois». No laço de `decisao_final` (P48), o A5 diz que `em_espera` não conta como nova decisão. Decidir se o laço novo deve ignorar `decisao = 'em_espera'`.
- **`p48_prazo_reabertura_smoke.sql:77`:** a premissa conta só `decisao_final` (WINDOWS #90).
- **`p50_desfazer_expansao.sql`:** está obsoleto para listar, contar e funil. O gerador recusa depois do apply da 0003. A prova foi feita com uma cópia de scratch apontada para `20261008000001`: `--conferir` e `--gerar` saíram 1 com `OBSOLETO: …`, e o arquivo gerado continua no commit `6ff57636` da Phase 50.
- **Ordem obrigatória com o cliente (51-14):** a fila agora devolve 13 colunas (`origem`, `pedido_id`). O tipo `FilaRevisaoRow`/`FILA_REVISAO_COLUNAS` do cliente lê por nome, então a 0003 pode ir antes do cliente. A resposta de `revisao_rejeicao` pela tela é do 51-12/14.
- **PostgREST:** o DROP + CREATE troca o OID de `listar_revisoes_decisao`. Conferir o schema cache depois do apply.

## Nada aplicado, nada publicado

A leitura só-leitura de PROD no fim deu:

- Cabeça do ledger **`20261008000001`**, e `20261008000002`/`20261008000003` ausentes.
- `revisao_rejeicao` e `ler_contexto_knockout_revisao` ausentes.
- O md5 das quatro funções é igual ao medido no Passo 0.
- 0 funções `p51_mutacao_*`.

O `capturar()` deu igual à baseline em todas as corridas. Nenhum `git push` foi feito: `origin/main..HEAD` tem 14 commits locais, dos planos anteriores e deste, que sobem no 51-16.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície fora do `<threat_model>`. As ameaças T-51-37..T-51-42 foram mitigadas e provadas:

| Ameaça | Prova |
|---|---|
| T-51-37 | (l), RETURNS sem `justificativa`; p42 (d) verde |
| T-51-38 | (l)/(n) + MC5/MC7/MC8 |
| T-51-39 | (l) + MC3 |
| T-51-40 | (m) + MC2 |
| T-51-41 | (p) + MC6 |
| T-51-42 | cabeçalho da 0003, docblock e recusa provada do gerador |

## Task Commits

1. **Task 1 (tracer):** `11ac3ad9` (feat). A fila e a contagem com as três origens, o id do pedido e o detalhe do knockout, em ensaio.
2. **Task 2:** `0de8a5de` (feat). O KPI sem knockout revertido (D-35) e o alerta de prazo para reaberturas fora da decisão final (A3).
3. **Task 3:** `484c7166` (test). O (k) da P50 com desempate pelo pedido, MC1a..MC6 mordendo e o desfazer da P50 marcado obsoleto.

## Self-Check: PASSED

- **Arquivos:** `supabase/migrations/20261008000003_p51_fila_tres_origens.sql` existe, e os 4 arquivos modificados estão nos commits.
- **Commits:** `11ac3ad9`, `0de8a5de` e `484c7166` são ancestrais de HEAD. A contagem medida desde `353996c1` é 3.
- **Verifies, re-rodados no estado final:**
  - estático `OK migration estatica (fila)`;
  - `51b=17/17` com `vistas=igual`;
  - funil34, p48_prazo e p42 verdes;
  - p50 `50=13/13` com 0002+0003 e sem migrations;
  - runner `29/29`, nada persistiu;
  - desfazer: `obsolescencia registrada no gerador` e o arquivo gerado intocado.
- **PROD:** cabeça `20261008000001`, nada aplicado.
