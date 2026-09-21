---
phase: 48-consertos-da-jornada-bloco-1
plan: 08
subsystem: notificacoes
status: complete
tags: [jorn-18, jorn-20, jorn-19, dedupe, notificar-candidato, notificar-rh, trigger, pg_net, smoke, prod]

requires:
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-01 — trava terminal de rejeitar_candidatura (candidatura_encerrada, D3), conferida VIVA por catálogo antes da chave nova"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-07 — exports aditivos de _shared/email-config.ts e o caminho de deploy `node efdeploy.cjs`"
provides:
  - "notificar-candidato v12 (PROD): chave {candidatura}:{decisao|avanco}:{historico_id} e {candidatura}:revisao_respondida:{ciclo}; desfecho pela linha de histórico da chave (L1); skip historico_inconsistente; 400 para historico_id/ciclo malformados; null = ausente"
  - "notificar-rh v5 (PROD): chave {candidatura}:revisao_solicitada:{ciclo}:{user_id}; encerramento intacto"
  - "trg_notif_transicao passa historico_id = NEW.id (migration 20260921000006, PROD)"
  - "trg_notif_revisao_solicitada / trg_notif_revisao_respondida passam ciclo = epoch de revisao_solicitada_em (migration 20260921000007, PROD)"
  - "supabase/tests/p48_dedupe_smoke.sql — 6 asserções, subtransações revertidas, prova o corpo do despacho no banco"
affects: [48-10, 48-11, 48-18]

tech-stack:
  added: []
  patterns:
    - "Discriminador de dedupe no corpo do trigger + EF tolerante deployada ANTES (campo ausente/null = chave legada)"
    - "Retry deriva o discriminador da própria dedupe_key da linha (extrairVersaoDaChave) — a varredura não precisa mudar"
    - "Pós-portão de 'mudança única': md5(replace(prosrc, fragmento_novo, '')) tem de voltar ao md5 vivo medido"
    - "Smoke de despacho: mede net.http_request_queue dentro de subtransação revertida, julga fora dela com variáveis PL/pgSQL; negativa escopada à fixture + global com diagnóstico de tráfego concorrente"

key-files:
  created:
    - supabase/migrations/20260921000006_p48_dedupe_decisao_por_historico.sql
    - supabase/migrations/20260921000007_p48_dedupe_revisao_por_ciclo.sql
    - supabase/tests/p48_dedupe_smoke.sql
  modified:
    - supabase/functions/notificar-candidato/helpers.ts
    - supabase/functions/notificar-candidato/index.ts
    - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
    - supabase/functions/notificar-rh/helpers.ts
    - supabase/functions/notificar-rh/index.ts
    - supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md

key-decisions:
  - "Fixture sintética (@invalido.local) em vez de candidatura real de conta +claude no smoke, como no 48-09: o operador pode estar exercitando essas contas (48-05), e o corpo que o trigger monta não distingue uma da outra"
  - "`ciclo`/`historico_id` = null valem como AUSENTES (chave legada), não 400: jsonb_build_object manda \"ciclo\": null quando revisao_solicitada_em é nulo, e recusar perderia o e-mail em silêncio (at-most-once)"
  - "No branch retry, o historico_id vem SÓ da dedupe_key da linha (a varredura não o manda); chave legada => comportamento legado (desfecho por etapa_atual)"
  - "O ciclo não versiona decisao/avanco nem o encerramento a pedido; o historico_id é ignorado fora de decisao/avanco"
  - "ACL vivo dos três triggers preservado (CREATE OR REPLACE); trg_notif_transicao segue com EXECUTE para anon/authenticated — função RETURNS trigger, não invocável fora de trigger"
  - "p42_revisao_art20 rodado em envelope que aborta e numa cópia de rascunho com RH ativos: o arquivo está vermelho na fixture desde 2026-09-05 e, verde, COMMITARIA um despacho real"

requirements-completed: [JORN-18, JORN-20]

coverage:
  - id: D1
    description: "notificar-candidato: chave versionada por historico_id (decisao/avanco) e por ciclo (revisao_respondida), desfecho pelo histórico, skip historico_inconsistente, validação de forma, null = ausente"
    requirement: JORN-18
    verification:
      - kind: unit
        ref: "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts (45/45)"
        status: pass
      - kind: other
        ref: "bundle vivo v12: historico_inconsistente 3x, RE_CICLO, 'raw.ciclo !== null'; POST sem Bearer 401"
        status: pass
    human_judgment: false
  - id: D2
    description: "notificar-rh: chave {c}:revisao_solicitada:{ciclo}:{user_id}, ciclo validado, encerramento intacto"
    requirement: JORN-18
    verification:
      - kind: unit
        ref: "supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts (43/43)"
        status: pass
    human_judgment: false
  - id: D3
    description: "trg_notif_transicao passa historico_id; a rejeição na triagem enfileira evento=decisao com o id da transição"
    requirement: JORN-20
    verification:
      - kind: integration
        ref: "node p46apply.cjs migrate supabase/migrations/20260921000006_p48_dedupe_decisao_por_historico.sql (md5 do ledger BATE)"
        status: pass
      - kind: integration
        ref: "supabase/tests/p48_dedupe_smoke.sql#(a)(b)(c)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Triggers do ciclo de revisão passam o MESMO ciclo no pedido e na resposta"
    requirement: JORN-18
    verification:
      - kind: integration
        ref: "node p46apply.cjs migrate supabase/migrations/20260921000007_p48_dedupe_revisao_por_ciclo.sql (md5 do ledger BATE)"
        status: pass
      - kind: integration
        ref: "supabase/tests/p48_dedupe_smoke.sql#(d)(e)(f); p42_notif_revisao_smoke 4/4"
        status: pass
    human_judgment: false
  - id: D5
    description: "Prova com conta real: 2 decisões => 2 linhas decisao com chaves distintas; rejeição na triagem de candidatura sem decisao anterior => 1 linha enviado/entregue, log sem skipped"
    requirement: JORN-20
    verification: []
    human_judgment: true
    rationale: "Exige commitar transições reais com e-mail real (NOTIFICACOES_MODO=producao) — é o plano 48-18, por desenho do plano e do D-18"

duration: 16min
completed: 2026-09-21

plan_head_before: 3f6bfe05947ccaec9eb4dec77f84d3d3e5253805
actuals:
  tokens: 22566
  tasks: 3
  commits: 8
---

# Phase 48 Plan 08: a chave de dedupe distingue decisões e ciclos de revisão · SUMMARY

**Cada decisão tem agora a sua própria chave de e-mail, `{candidatura}:decisao:{historico_id}`, com o id que o trigger AFTER INSERT recebe como `NEW.id`. Com isso a rejeição na triagem, que já era despachada e morria como `skipped:"duplicate"`, passa a chegar ao candidato. O retry antigo sai com a cópia da decisão que a chave anuncia, e não a do estado atual. O ciclo de revisão também ganhou chave própria (o epoch do pedido), que a reabertura do 48-11 vai precisar. Está tudo em PROD, na ordem certa: EF tolerante primeiro, trigger depois.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-21T14:16:56Z
- **Completed:** 2026-09-21T14:33:07Z
- **Tasks:** 3 (tracer + 2)
- **Files modified:** 10

## Ordem de entrega em PROD (horários medidos)

| Instante (UTC) | O quê | Prova |
|---|---|---|
| 14:16:56 | Precondição: a trava D3 de `rejeitar_candidatura` (48-01) está viva | `position('candidatura_encerrada(' …) > 0` = `true` |
| 14:20:21 | `notificar-candidato` **v10**, tolerante ao `historico_id` | bundle com `historico_inconsistente` 3×; POST sem Bearer → 401 |
| 14:23:39 | migration **20260921000006** (`trg_notif_transicao` + `historico_id`) | ledger md5 `291b6db5…` **BATE** (9419 octetos) |
| 14:26:20 | `notificar-candidato` **v11** e `notificar-rh` **v4**, tolerantes ao `ciclo` | bundle da rh com `ciclo` 12×; 401 nas duas |
| 14:27:44 | `notificar-candidato` **v12** e `notificar-rh` **v5**, com `null` tratado como ausente | `raw.ciclo !== null` no bundle das duas |
| 14:31:57 | migration **20260921000007** (os dois triggers de revisão + `ciclo`) | ledger md5 `377f9bb5…` **BATE** (14439 octetos) |

O `verify_jwt=false` das duas EFs foi lido antes de cada deploy e preservado. `git log origin/main..HEAD` ficou vazio depois de cada commit que acompanha um deploy. Nenhuma notificação nem transição real passou por elas entre 14:15 e 14:33. O log de borda só registra as minhas próprias sondas.

## Accomplishments

- **JORN-18 / JORN-20.** `montarDedupeKey` versiona `decisao` e `avanco` pelo `historico_id`. A mesma transição entregue duas vezes colapsa numa só chave. Duas decisões geram duas linhas de histórico, portanto duas chaves e dois e-mails. Quando o corpo não traz o campo, vale a chave legada.
- **L1.** O desfecho vem de `historico_candidatura.etapa_para`, lido da linha da chave (allowlist `etapa_para, candidatura_id`, `maybeSingle`). O teste de mutação confirma: se o desfecho voltar a vir de `etapa_atual`, três casos de 48-08 falham.
- **Retry.** `extrairVersaoDaChave` tira o `historico_id` da `dedupe_key` da linha. A varredura `varrer_retry_notificacoes` não mudou. O retry continua deduplicado: não há claim, e o `Idempotency-Key` é o `retry_id`.
- **T-48-08-02.** Um `historico_id` que não é uuid, ou um `ciclo` fora de `^\d{1,12}$`, recebe `400 VALIDATION` antes de qualquer leitura. Uma linha de histórico ausente, ou de outra candidatura, dá `200 {skipped:'historico_inconsistente'}` antes do claim, e nada é enviado.
- **Ciclo de revisão.** A chave passou a ser `{c}:revisao_respondida:{ciclo}` e `{c}:revisao_solicitada:{ciclo}:{user_id}`, com o `user_id` ainda no fim. O smoke (e) prova que o pedido e a resposta de um mesmo ciclo carregam o MESMO `ciclo`.
- **Migrations a partir do vivo.** Cada uma tem um pré-portão de md5 e um pós-portão que prova a mudança única: sem o fragmento novo, o corpo instalado volta ao md5 vivo. As duas mutações de teste foram recusadas.

## Task Commits

1. **Task 1 (tracer): decisão por transição, de ponta a ponta**
   - `a8984d12` test: RED (o import falha; a suíte não carrega)
   - `120557b1` feat: EF tolerante, v10
   - `9caf5b09` feat: migration 000006 e smoke (a)–(c)
   - Tracer gate, linha 3 (interativo, end-of-phase, só `<automated>`): re-rodei o verify de ponta a ponta. Deu 39/39 testes, marcador 3× no bundle, ledger conferido e smoke 3/3, então segui para a Task 2.
2. **Task 2: ciclo nas duas EFs**
   - `2de383b0` test: RED (6 falham; 3 casos de tolerância já passavam trivialmente)
   - `47d65eb5` feat: v11 e v4
3. **Task 3: os triggers de revisão passam o ciclo**
   - `c82b9c75` test: RED para `null`
   - `853ce0d4` fix: v12 e v5
   - `1956cadd` feat: migration 000007, smoke (d)–(f) e deferred

## Verificação

| Portão | Resultado |
|---|---|
| `deno test notificar-candidato/ notificar-rh/` | **88/88** |
| `p48_dedupe_smoke.sql` | **6/6** (reprovou em (a) e depois em (d) contra o vivo antes de cada apply; (b) e (e) sozinhas morderam contra os triggers antigos) |
| `p48_rejeicao_triagem_smoke` / `p48_candidatura_encerrada_smoke` | 6/6 · 8/8 (depois da 000006) |
| `p42_notif_revisao_smoke` | 4/4 antes e depois da 000007 (puro, e também em envelope para ler o contador) |
| `p42_revisao_art20_smoke` | o arquivo reprova na fixture antes E depois (pré-existente). Numa cópia com RH ativos, em envelope: **9/9 antes e depois** |
| `p39_rewire_triggers_smoke` | (a)–(e) passam e para na fotografia conhecida (f) `<> 3` (deferred da fase, não tocada) |
| Varredura de portões (D-17) | 252 achados no total. Nos 4 smokes que citam os triggers tocados, nenhum pina o corpo ou o md5 dessas funções: pinam a FORMA do CASE (p39 (a)) e a forma dos TRIGGERS (p42 (c)/(d)), que não mudaram. Não havia fotografia a converter |
| `tsc` | 90 (teto D-15: 90) |
| Resíduo | 0 candidatos `p48dsmoke-%`, fila do `pg_net` vazia |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — perda silenciosa] `ciclo`/`historico_id` = `null` passam a valer como ausentes**
- **Found during:** Task 3, ao ler o corpo vivo de `trg_notif_revisao_respondida`
- **Issue:** esse trigger só garante `revisao_respondida_em` NOT NULL. Que `revisao_solicitada_em` seja NOT NULL depende do guard do RPC, não do trigger. `jsonb_build_object` manda `"ciclo": null` em vez de omitir a chave. As EFs v11/v4 recusariam isso com 400, e o `net.http_post` é at-most-once: o e-mail sumiria sem rastro, que é o Pitfall 7.
- **Fix:** nas duas EFs, `null` passou a ser tratado como ausente (chave legada). O RED `c82b9c75` falhou nos 2 casos e ficou verde com `853ce0d4`. Deployei antes da migration.
- **Commit:** `c82b9c75`, `853ce0d4`

**2. [Desvio da letra, no idioma do 48-09] O smoke usa fixture sintética, e não uma candidatura real de conta de teste**
- **Issue:** o plano pedia «uma candidatura real de conta de teste em andamento» em (b) e (e). O orquestrador informou que o operador pode estar exercitando contas `+claude` agora (48-05). Um UPDATE nelas, mesmo revertido, disputa lock de linha com o fluxo vivo.
- **Fix:** usei titular `@invalido.local`, candidatura que nasce `rejeitado` e é levada a `em_analise`, tudo em subtransação revertida. O corpo que o trigger monta é o mesmo. Os ids de RH/admin são reais e ativos, lidos na execução (FK de `por_usuario`).

**3. [Rule 3 — portão que COMMITARIA] `p42_revisao_art20_smoke` não foi rodado com `p46apply run` puro, como o `<verify>` escreve**
- **Issue:** o arquivo reprova na fixture, porque `e2e.admin@…` e o recrutador `fba9bc0f-…` estão `ativo=false` desde 2026-09-05. Quando verde, ele commita um INSERT em `decisao_final` e um `revisao_respondida` enfileirado para `candidato.funil@teste.com` em modo produção.
- **Fix:** rodei em envelope que aborta e, para ter a regressão, numa cópia de rascunho não commitada com dois administradores ativos: 9/9 antes e depois. O arquivo do repositório não foi editado, e o achado foi registrado em `deferred-items.md`.

**4. [Anotação] O `migrate` do `<verify>` não é re-executável**
- O pré-portão de md5 recusa um segundo apply por desenho. No tracer gate, a re-verificação conferiu o ledger (`md5(statements[1])`) em vez de re-aplicar.

---

**Total deviations:** 1 auto-fixed (Rule 2), 1 desvio de fixture já com precedente, 1 portão rodado em envelope, 1 anotação.
**Impact:** o nº 1 fecha uma perda silenciosa que a letra do plano teria aberto. Os demais não mudam o que é provado.

## TDD Gate Compliance

- **Task 1:** RED `a8984d12` (falha de import, a suíte não carrega) → GREEN `120557b1`. O teste de mutação do L1 derruba 3 casos.
- **Task 2:** RED `2de383b0` (6 falhas; os 3 casos de tolerância/legado já passavam trivialmente) → GREEN `47d65eb5`.
- **Task 3 (auto):** RED `c82b9c75` (2 falhas) → GREEN `853ce0d4`.

## Threat Surface

Nenhuma superfície nova além do `<threat_model>`. T-48-08-01..05 foram mitigados e provados (chave por transição/ciclo, validação de forma, pertinência antes do claim, desfecho pela linha, EF antes da migration, trava D3 conferida). T-48-08-SC: nada instalado.

## Known Stubs

Nenhum.

## Next Phase Readiness

- **48-11 (reabertura):** a chave do 2º ciclo de revisão já existe nas duas EFs e nos dois triggers. Se o 48-11 zerar `revisao_solicitada_em`/`revisao_respondida_em` ao reabrir, o próximo pedido gera um `ciclo` novo naturalmente.
- **48-10:** o campo `ciclo` do `notificar-candidato` é genérico. Hoje só `revisao_respondida` o usa na chave; para a liberação cognitiva, basta incluir o evento em `EVENTOS_VERSIONADOS`.
- **48-18:** a prova com conta real. Consultas de conferência:
  - `dedupe_key ~ ':decisao:[0-9a-f-]{36}$'`: hoje 0 linhas, e a primeira decisão real cria uma;
  - para duas decisões, duas linhas `decisao` com chaves distintas;
  - log da EF sem `skipped` na rejeição da triagem.
- Ledger atual: as linhas antigas `{c}:decisao` continuam lá e não colidem com as novas.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260921000006_p48_dedupe_decisao_por_historico.sql
- FOUND: supabase/migrations/20260921000007_p48_dedupe_revisao_por_ciclo.sql
- FOUND: supabase/tests/p48_dedupe_smoke.sql
- FOUND commits: a8984d12, 120557b1, 9caf5b09, 2de383b0, 47d65eb5, c82b9c75, 853ce0d4, 1956cadd
