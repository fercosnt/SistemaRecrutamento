---
phase: 51-consertos-da-jornada-bloco-3
plan: 08
subsystem: database
tags: [jorn-42, art-20, revisao, rejeicao, knockout, rls, acl, ensaio, mutacoes, onda-b, tracer]
status: complete

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-06: scripts/p51_ensaio.cjs e scripts/p51_mutacoes.cjs (linha P51B ja fixada em SMOKES); 51-07 concluido"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "molde de reabertura sancionada (responder_revisao_decisao) e triggers de notificacao com Vault"
  - phase: 50
    provides: "helper vivo public.is_active_rh_user() (D-02) e regra D-12 (nada abre para anon)"
provides:
  - "supabase/migrations/20261008000002_p51_revisao_rejeicao.sql (NAO aplicada): tabela public.revisao_rejeicao (RLS sem policy, sem privilegio de tabela), RPCs solicitar/estado/responder_revisao_rejeicao, triggers trg_notif_revisao_rejeicao_solicitada/_respondida, PRE/POS-PORTAO P51-02"
  - "supabase/tests/p51_revisao_rejeicao_smoke.sql: smoke51b, 12 clausulas (a..k + z), envelope P51B1, so pelo ensaio"
  - "MB1..MB14 em scripts/p51_mutacoes.cjs (MB13/MB14 acrescentadas)"
  - "ref local refs/gsd/51-08/base = 24396d71"
affects: [51-09, 51-10, 51-11, 51-12, 51-13, 51-16]

actuals:
  tokens: 38600        # chars/4 sobre o diff realizado 24396d71..0ee3ef8f (154525 octetos)
  tasks: 2
  commits: 3           # MEDIDO: git rev-list --count 24396d71..HEAD antes do commit deste SUMMARY
plan_head_before: 24396d71852d168172e3e26cc23b196d700b1826
plan_head_after: 0ee3ef8fa9e9eaf18dbe9c2025b03b07f839ecd3

tech-stack:
  added: []
  patterns:
    - "Registro proprio do pedido (mecanismo b): tabela com RLS ligada, ZERO policy e REVOKE ALL de PUBLIC/anon/authenticated; acesso so por RPC DEFINER"
    - "Regra de rejeicao corrente + dono (decisao_final x registro novo) duplicada nas duas RPCs do titular, para que toda rejeicao tenha exatamente um caminho"
    - "Sonda de RPC que escreve dentro de sub-subtransacao (P51B2) que reverte mesmo quando aceita — o probe nao contamina as medicoes seguintes"
    - "Fila nova capturada por diferenca de q.id de net.http_request_queue em volta de cada chamada"
    - "Conjunto de (z) lido POR FORMA do catalogo (toda tabela base de public + auth.users + net.http_request_queue), nunca lista literal"

key-files:
  created:
    - supabase/migrations/20261008000002_p51_revisao_rejeicao.sql
    - supabase/tests/p51_revisao_rejeicao_smoke.sql
  modified:
    - scripts/p51_mutacoes.cjs

key-decisions:
  - "Mecanismo (b) executado como planejado: o md5(prosrc) das 8 funcoes do caminho decisao_final e o mesmo antes e depois da migration (PRE/POS-PORTAO P51-02, df=8/8 em todo ensaio)"
  - "O despacho da analise do knockout revertido usa a forma do trg_candidatura_analise (com timeout_milliseconds 120000), nao a de reprocessar_analise (sem timeout): o must_have D-36 pede o MESMO net.http_post que a inscricao teria disparado; url, headers e corpo sao identicos aos de reprocessar_analise"
  - "MB6 redeclarada de (f) para (b): a etapa de reabertura e gravada no pedido (escolha 3 do planejador) e (b) a assere; (f) segue exigindo triagem na candidatura reaberta e MB5 morde (f)"
  - "MB13 (guarda de titular desligada -> (c)) e MB14 (ja respondida desligada -> (g)) acrescentadas: sem elas (c) e (g) nao tinham mutacao propria (precedente MA6 do 51-06)"
  - "responder_revisao_rejeicao devolve public.revisao_rejeicao (espelho do RETURNS decisao_final de responder_revisao_decisao); e RPC de RH, a linha inteira pode sair"
  - "rejeitado_por/respondida_por sem FK para auth.users (decisao_final tem FK): o plano so pedia FK de candidatura e historico; registrado para a review do 51-16"

patterns-established:
  - "Em PL/pgSQL de smoke, variavel local com nome de tabela (vagas) da 42702 ambiguo dentro de SQL que cita a tabela — nomear com prefixo v_"
  - "concat_ws de booleanos produz t/f, nao true/false"
  - "jsonb_build_object('k', NULL::jsonb) guarda null JSON: (m -> 'k') IS NOT NULL e verdadeiro; julgar com jsonb_typeof"

requirements-completed: []

coverage:
  - id: D1
    description: "Toda rejeicao com status rejeitado tem exatamente um caminho de revisao: RH em qualquer etapa e knockout pedem pelo registro novo; a rejeicao da decisao final continua no ciclo dela (fixture e populacao viva de 9)"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "supabase/tests/p51_revisao_rejeicao_smoke.sql#(b) (d) (j) — node scripts/p51_ensaio.cjs --vistas --migracoes=…0002 → smokes=[51b=12/12], 51b.j=9(df=1,novo=8,sem_user=1,sem_ator=0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A procedente reabre na etapa certa (triagem, decisao_final; knockout em triagem; vaga arquivada tambem), com trilha, prazo 00:00 SP do 11o dia e aviso; knockout mantem a auditoria, nao e reaplicado e despacha uma analise"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "supabase/tests/p51_revisao_rejeicao_smoke.sql#(f) (h) (i) — ensaio verde 12/12"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nada abre para anon nem para candidato alheio: tabela sem policy e sem privilegio, RPCs sem EXECUTE de anon, allowlist do titular, vistas externas iguais"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "supabase/tests/p51_revisao_rejeicao_smoke.sql#(a) (c) (k) + --vistas → vistas=igual"
        status: pass
    human_judgment: false
  - id: D4
    description: "O portao morde: CONTROLE + MA1..MA6 + MB1..MB14, cada uma na letra declarada, nada persistiu"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "node scripts/p51_mutacoes.cjs → controle verde; 20/20 mutacoes mordem; nada persistiu"
        status: pass
    human_judgment: false
  - id: D5
    description: "O ciclo decisao_final fica intocado: 9 smokes de regressao verdes com a 0002 prefixada (oper31 e submit com fixture construida)"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "node scripts/p51_ensaio.cjs --migracoes=…0002 supabase/tests/{p42_revisao_art20,p48_reabertura,p48_rejeicao_triagem,p48_dedupe,p48_candidatura_encerrada,p49_snapshot,p49_trilha,oper31_rejeitar_candidatura,submit_candidatura_atomic}*.sql → 9/9 ENSAIO VERDE"
        status: pass
    human_judgment: false
  - id: D6
    description: "Nada aplicado nem publicado: o ledger de PROD nao tem 20261008000002 e a tabela nao existe em PROD"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "node p46apply.cjs sql (so leitura): v02=0, cabeca=20261008000001, to_regclass=null, funcoes=0"
        status: pass
    human_judgment: false

duration: 27min
completed: 2026-10-09
---

# Phase 51 Plan 08: pedido de revisão para toda rejeição (tracer do JORN-42) Summary

**O banco passa a aceitar, num ensaio em PROD que aborta, o pedido de revisão de toda rejeição. A rejeição pelo RH em qualquer etapa e o knockout ganham um registro próprio (`public.revisao_rejeicao`, só por RPC DEFINER). A procedente reabre na etapa certa com trilha, e o knockout revertido não é reaplicado e ganha a análise de IA. O ciclo de `decisao_final` ficou byte-idêntico. Nada foi aplicado.**

## Performance

- **Duration:** ~27 min (04:48:14Z → 05:15Z)
- **Tasks:** 2/2
- **Files:** 2 criados, 1 modificado

## Accomplishments

- Migration `20261008000002` (não aplicada): a tabela `revisao_rejeicao` (16 colunas, 11 CHECKs, 2 FKs sem ON DELETE, UNIQUE por rejeição, RLS sem policy, `REVOKE ALL` de `PUBLIC`/`anon`/`authenticated`), as três RPCs, os dois triggers de notificação e o PRE/POS-PORTAO `P51-02`.
- Smoke-especificação `smoke51b` com 12 cláusulas. Ficou vermelho em (a) sem a migration e verde 12/12 com ela, com `vistas=igual`.
- O runner de mutações deu `20/20`, nada persistiu.
- Os 9 smokes do ciclo `decisao_final` ficaram verdes com a 0002 prefixada.

## Passo 0 — medições (só leitura, PROD, 2026-10-09)

**md5 das funções.** O `md5(pg_get_functiondef)` bate com o do 51-RESEARCH em todas.

| Função | md5(prosrc), a forma do portão | md5(functiondef) |
|---|---|---|
| `avancar_etapa` | `78317b0734f876b69737c51c3158e502` | `b104f768…` |
| `explicacao_rejeicao_origem` | `b53400f55502167dbef166173390c9d2` | `29f63b16…` |
| `guard_rejeicao_auditada` | `dc695aa49a76c1dab31e9867703556ec` | `89d85b8b…` |
| `registrar_decisao` | `7da195353109938c8e572cb61800de06` | `f7c64906…` |
| `rejeitar_candidatura` | `75c0d3d0451a6f8c1e1a4425208daa4a` | `c4301082…` |
| `responder_revisao_decisao` | `301ca807c5a41b9bac417e16f6321682` | `d4b47f5b…` |
| `solicitar_revisao_decisao` | `c0209efc7ccdac82e83593eba0b24fcc` | `13957aa6…` |
| `submit_candidatura_atomic` | `c3e7302b93305883a0d58e7787a08dc3` | `7fddda4c…` |
| `varrer_prazos_reabertura` | `8407510d618883efcf28b4af826e509f` | `7bc05cdd…` |
| `funil_kpis(uuid)` | `52583cd9fbe981cd92c307853a9604af` | `34181e8b…` |
| `listar_revisoes_decisao(boolean)` | `85642fe45f6bb786fc7e965476b727a6` | `a3889a20…` |
| `contar_revisoes_pendentes()` | `63b7abffd3eee25a26810d9fc01fbadf` | `1c5f3ccb…` |
| `anonimizar_candidato(uuid,boolean)` | `4624854408950110cbfebc971481145a` | `ecfec02c…` |

**Outras medições.**

- **Moldes copiados do vivo:** `responder_revisao_decisao`, `reprocessar_analise` (`43491cc9…`), `explicacao_rejeicao_origem`, `trg_notif_revisao_solicitada` e `_respondida`. Também foram lidos `trg_candidatura_analise`, `trg_notif_transicao`, `avancar_etapa`, `guard_rejeicao_auditada`, `submit_candidatura_atomic`, `rejeitar_candidatura`, `registrar_decisao` e `retirar_candidatura`.
- **`historico_candidatura.id`:** `uuid`.
- **População `status = 'rejeitado'`:** 9 candidaturas, todas de contas de teste, como o RESEARCH mediu.
  - 4 `automatica`: 0f7b217c, 25a4231c, 92522073 e cb1dd5c0.
  - 4 `humana_triagem`: 38945a50 e bf26ee3c (`triagem → rejeitado`); af39f1ea e dae837f4 (`decisao_final → rejeitado`). dae837f4 é de titular sem `user_id`.
  - 1 com dono `decisao_final`: 6e5d8051, revisão respondida e não reaberta.
- **Rejeições pelo RH sem `ator`:** 0.
- **RH:**
  - Ativos: af4ebf97 (recrutador, é o A), 4fceff36 (administrador, é o B), 66412f96 e 023abcd6 (administradores).
  - Inativos: fba9bc0f e 608d094e (recrutadores) e três administradores. O I lido pelo smoke é fba9bc0f.
- **Vault:** `project_url` 1 e `edge_invoke_key` 1 (só a contagem).
- **`analise_candidato_vaga` com `descartada_em`:** 3 linhas, todas `status = 'sucesso'`, `descartada_motivo = 'knockout_automatico'`, candidatura `rejeitado/knockout_automatico`. São 0f7b217c (`+claude3`), 25a4231c (`+claude4`) e 92522073 (`+claude2`), os ids do cabeçalho de `20260921000004`, todos de contas de teste. É o caso nomeado do D-36 e vai ao operador no checkpoint do 51-16.
- **Ledger:** a cabeça é `20261008000001`, e `20261008000002` está ausente.

## Vermelho e verde (Task 1)

| Corrida | Saída | Duração |
|---|---|---|
| RED, `--sem-migracoes` (commit `eb454d31`) | `ENSAIO VERMELHO: P51B FAIL (a): tabela public.revisao_rejeicao AUSENTE …` | 661 ms (reconfirmado depois dos consertos de instrumento: 537 ms) |
| tracer, `--vistas --migracoes=…0002` | `prefixadas=[20261008000002] · vistas=igual · smokes=[51b=12/12] · evidencia=02:rr=0,rpcs=3,trg=2,df=8/8 51b.j=9(df=1,novo=8,sem_user=1,sem_ator=0,tabela=0) 51b.z=78` | 1018 ms (re-rodado no fim: 1019 ms) |
| estático | `OK migration estatica` | — |

- **Fixture do knockout:** foi usada a RPC REAL `submit_candidatura_atomic`, sem JWT, numa vaga sintética com uma pergunta `single_choice` cuja opção «Nao» tem `tag = 'knockout'`. A via de montar o estado à mão não foi necessária.
- **Populações da cláusula (j):**
  - Viva: 9 rejeitadas. 1 tem dono `decisao_final`; 8 vão ao registro novo (7 conferidas sob o JWT do titular, 1 sem `user_id`, conferida pela regra). Rejeições pelo RH sem ator: 0. A tabela nova tinha 0 linhas antes e depois.
  - Fixture: rejeição por `registrar_decisao` → estado NULL e pedido P0002. `em_espera` + `rejeitar_candidatura` → elegível. Ciclo revertido + `rejeitar_candidatura` → elegível.
- **Cláusula (z):** 78 tabelas medidas por forma (76 de `public`, `auth.users` e `net.http_request_queue`).

## Mutações (Task 2) — `20261008000002` prefixada

```
CONTROLE verde (supabase/tests/p51_raven_status_smoke.sql): par 51a=7/7 (571 ms)
MA1..MA6 mordem em (b),(d),(a),(c),(c),(e) (512–746 ms)
CONTROLE verde (supabase/tests/p51_revisao_rejeicao_smoke.sql): par 51b=12/12 (772 ms)
MB1  (e) 751 ms  — linha mordida: A responde o pedido de `tri` → ACEITO
MB2  (e) 735 ms  — recrutador inativo responde `tri` → ACEITO
MB3  (a) 738 ms  — solicitar_revisao_rejeicao: anon EXECUTE = t
MB4  (a) 811 ms  — revisao_rejeicao: privilegio anon:SELECT
MB5  (f) 716 ms  — `tri` reaberta fica com etapa rejeitado (sem trilha)
MB6  (b) 638 ms  — pedido de `ko`: etapa_reabertura = inscricao   [redeclarada f → b]
MB7  (d) 751 ms  — 2º pedido de `c400` grava 2ª linha
MB8  (b) 739 ms  — titular T pede `tri` → 42501 forbidden
MB9  (i) 762 ms  — conjunto por forma = {p51_mutacao_knockout, submit_candidatura_atomic}
MB10 (h) 790 ms  — revertida de `ko`: 0 POST a analise-candidato-individual
MB11 (k) 795 ms  — estado k1: pedido com rejeitado_por
MB12 (j) 657 ms  — `rd` (registrar_decisao) fica elegivel
MB13 (c) 798 ms  — intruso X pede `tri` → ACEITO          [acrescentada]
MB14 (g) 770 ms  — 2ª resposta ao pedido de `mant` aceita  [acrescentada]
controle verde; 20/20 mutacoes mordem; nada persistiu
```

Os textos das reprovações foram capturados um a um, e cada mutação mordeu sobre a linha da fixture nomeada acima. Nenhuma depende da `revisao_rejeicao` viva, que é vazia.

## Regressão do ciclo `decisao_final` (9/9 verdes, `--migracoes=…0002`)

| Smoke | Duração |
|---|---|
| p42_revisao_art20 | 630 ms |
| p48_reabertura | 639 ms |
| p48_rejeicao_triagem | 673 ms |
| p48_dedupe | 545 ms |
| p48_candidatura_encerrada | 579 ms |
| p49_snapshot | 704 ms |
| p49_trilha | 538 ms |
| oper31_rejeitar_candidatura | 556 ms |
| submit_candidatura_atomic | 560 ms |

**Não-vacuidade.** O `oper31` e o `submit_candidatura_atomic` têm caminho de SKIP silencioso (`smoke.ready`). Rodei cópias de scratch, não commitadas, que publicam `smoke.ready` em `p51.evidencia` antes do teardown. Resultado: `oper31.ready=y` e `submit.ready=y`. Os dois arquivos legados não foram tocados.

## Nada aplicado

A leitura só-leitura em PROD, no fim, deu:

- `supabase_migrations.schema_migrations`: `v02 = 0`, cabeça `20261008000001`.
- `to_regclass('public.revisao_rejeicao') = null`.
- 0 funções `*revisao_rejeicao*` ou `p51_mutacao_*`.

Nenhum push foi feito neste plano. O `capturar()` deu igual à baseline em todas as corridas.

## Task Commits

1. **Task 1 (tracer) RED:** `eb454d31` (test). Especificação RED.
2. **Task 1 (tracer) GREEN:** `737fad0b` (feat). Migration e três consertos de instrumento no smoke.
3. **Task 2:** `0ee3ef8f` (test). MB1..MB14, a tabela «O PORTÃO MORDE» e um conserto de fixture.

## Varredura D-56

Rodei o padrão literal do CLAUDE.md §«Portões» sobre `supabase/tests/*.sql`, antes do arquivo novo existir. Ele achou 369 linhas. Dessas, 29 tocam revisão, rejeição, knockout, decisão ou histórico, e todas foram lidas. Nenhuma muda com o mecanismo (b). A classificação está no cabeçalho do smoke.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug de instrumento] Variável `vagas` ambígua no smoke**
- **Found during:** Task 1, primeiro ensaio verde.
- **Issue:** `42702 column reference "vagas" is ambiguous`. A variável PL/pgSQL tinha o nome da tabela, e a fixture abortou com «erro INESPERADO».
- **Fix:** a variável passou a se chamar `v_vgs`. Commit `737fad0b`.

**2. [Rule 1 - Bug de instrumento] (a) comparava `true|…` com a saída de `concat_ws`**
- **Issue:** `concat_ws` de booleanos gera `t`/`f`. Por isso a (a) reprovava um contrato correto (`t|t|f|t`).
- **Fix:** as constantes passaram a ser `t|t|f|t` e `t|f|f`. Os mesmos valores são exigidos; só o formato mudou. Commit `737fad0b`.

**3. [Rule 1 - Bug de instrumento] (j) confundia null JSON com NULL SQL**
- **Issue:** `jsonb_build_object('ret', NULL)` grava null JSON. O `(m->'j_rd_est'->'ret') IS NOT NULL` era sempre verdadeiro.
- **Fix:** o julgamento passou a usar `coalesce(jsonb_typeof(…), 'null') <> 'null'`. A exigência continua a mesma: estado nulo. Commit `737fad0b`.

**4. [Rule 1 - Bug de fixture] Pedido de `arq` sem bloco de exceção próprio**
- **Found during:** Task 2, primeira corrida do runner. MB8 deu `NAO MORDE` por «erro INESPERADO» na fixture.
- **Fix:** o pedido ganhou bloco próprio, e a (f) passou a julgar `f_sol_arq` (D-04: o pedido sobre vaga arquivada é aceito). Foi a única edição do smoke na Task 2 além da tabela. Commit `0ee3ef8f`.

**5. [Rule 2 - Missing critical] MB13 e MB14**
- **Issue:** as cláusulas (c) e (g) não tinham mutação própria. MB8 reprova (b) antes de chegar à (c).
- **Fix:** MB13 desliga a guarda de titular e morde (c). MB14 desliga «já respondida» e morde (g). O total ficou em 20, acima do mínimo de 17 do plano.

**6. [Redeclaração permitida pelo plano] MB6: (f) → (b)**
- A etapa de reabertura é gravada no pedido, e a (b) a assere. Nenhuma cláusula foi enfraquecida.

**7. [Escolha registrada] Forma do `net.http_post` do D-36**
- Foi usada a forma do `trg_candidatura_analise`, com `timeout_milliseconds := 120000`. O plano dizia «copiado de `reprocessar_analise`». A URL, os headers e o corpo são idênticos aos de `reprocessar_analise`. O must_have D-36 pede o mesmo despacho que a inscrição teria feito, e a inscrição usa o timeout.

**Total deviations:** 4 auto-fixed de instrumento (Rule 1), 1 Rule 2, 1 redeclaração e 1 escolha registrada. **Impacto:** o portão ficou mais estrito, com duas cláusulas a mais vigiadas por mutação. Nenhuma expectativa foi afrouxada, e a migration não foi alterada para caber no smoke.

## Issues Encountered

- MB8 levou 4221 ms na primeira corrida e 739 ms na segunda. Foi variação isolada, abaixo do teto de 5 s.
- **Tie de `criado_em`:** dentro de uma requisição, todo `now()` é igual. Onde a ordem importa, a fixture envelhece as linhas de histórico da própria candidatura. Isso está documentado no cabeçalho. Em PROD cada passo é uma transação, e o desempate por `id DESC` só decide empate exato.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície fora do `<threat_model>`. T-51-28..T-51-36 foram mitigados e provados por cláusula e mutação:

| Ameaça | Prova |
|---|---|
| T-51-28 | (c) + MB8/MB13 |
| T-51-29 | (e) + MB1 |
| T-51-30 | (e) + MB2 |
| T-51-31 | (a) + MB3/MB4 + `vistas=igual` |
| T-51-32 | (k) + MB11 |
| T-51-33 | (f)/(i) + MB5/MB6/MB9 |
| T-51-34 | (d)/(j) + MB7/MB12 |
| T-51-35 | `capturar()` igual em toda corrida |

## Next Phase Readiness — para o portão 51-16

- **ASSUMPTION:** rejeição pelo RH sem ator → P0002. Hoje a população é 0.
- **Caso das 3 marcas `descartada_*`:** se um daqueles knockouts for revertido, a análise nova herdaria a marca antiga.
- **FK de usuário:** `rejeitado_por` e `respondida_por` não têm FK para `auth.users`, diferente de `decisao_final`. Isso vai à review.
- **Ordem obrigatória:** o trigger de resposta manda `pedido_id` ao `notificar-candidato`. A EF que o lê é do 51-11 e tem de subir antes de qualquer cliente que permita pedir.
- **Planos seguintes:**
  - 51-10: fila/KPI/prazo. `alerta_prazo_enviado_em` já existe na tabela, e `varrer_prazos_reabertura` não a lê.
  - 51-13: motor de exclusão. Tem de raspar `resultado`.
  - 51-11/51-12: EF e cliente. `estado_revisao_rejeicao` é a fonte do cliente.
- **JORN-42 segue aberto:** a ID é compartilhada com os planos seguintes. Rodei `requirements.mark-complete` só para IDs que o gate deixar prontas.

## Self-Check: PASSED

- **Arquivos:** os dois de `key-files.created` existem, e `scripts/p51_mutacoes.cjs` foi modificado.
- **Commits:** `eb454d31`, `737fad0b` e `0ee3ef8f` são ancestrais de HEAD, e a contagem medida é 3.
- **PROD:** ledger sem `20261008000002`, tabela ausente, nada persistiu.
- **Verifies:** estático OK; tracer `51b=12/12` com `vistas=igual`; runner `20/20`; regressão 9/9.
