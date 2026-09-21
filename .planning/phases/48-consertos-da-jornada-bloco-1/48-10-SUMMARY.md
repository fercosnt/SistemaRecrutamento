---
phase: 48-consertos-da-jornada-bloco-1
plan: 10
subsystem: notificacoes
status: complete
tags: [jorn-15, d-22, cognitivo, notificar-candidato, trigger, pg_net, email-templates, smoke, prod]

requires:
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-06 — p43/p42/p37 iterando o CHECK vivo (vigiam o evento novo sem edição)"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-07 — caminho de deploy `node efdeploy.cjs`; exports aditivos de _shared/email-config.ts"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-08 — notificar-candidato v12 com o campo `ciclo` genérico e null = ausente"
provides:
  - "evento `cognitivo_liberado` no CHECK de notificacoes_enviadas (9 valores) + classe `transacional` (PROD)"
  - "public.trg_notif_cognitivo_liberado() + trigger em cognitivo_liberacao (AFTER INSERT OR UPDATE OF liberado_em, revogado_em) — PROD"
  - "notificar-candidato v13: EventoLedger/EVENTO_MAP cognitivo_liberado → avaliacao_cognitiva_liberada; chave {candidatura}:cognitivo_liberado:{ciclo}"
  - "template avaliacao_cognitiva_liberada (assunto, prévia, corpo) em _shared/email-templates.ts; notificar-rh v6 e executar-direito-titular v6 redeployadas"
  - "supabase/tests/p48_cognitivo_notifica_smoke.sql — 5 asserções, subtransação revertida, mordida provada"
affects: [48-16, 48-18]

tech-stack:
  added: []
  patterns:
    - "eventoPorCiclo(): conjunto único dos eventos versionados pelo `ciclo` do corpo (revisao_respondida, cognitivo_liberado)"
    - "Guard de transição para upsert que recarimba: despacha no INSERT e em revogada→vigente; vigente→vigente e revogar não despacham"
    - "Migration com pré-portão sobre o texto EXATO do pg_get_constraintdef transcrito no cabeçalho, e pós-portão no catálogo instalado"
    - "Leitura de NOTICE inacessível pela Management API: cópia de rascunho que grava o valor num GUC e termina em RAISE (envelope que aborta)"

key-files:
  created:
    - supabase/migrations/20260921000010_p48_cognitivo_liberado_notifica.sql
    - supabase/tests/p48_cognitivo_notifica_smoke.sql
  modified:
    - supabase/functions/notificar-candidato/helpers.ts
    - supabase/functions/notificar-candidato/index.ts
    - supabase/functions/_shared/email-config.ts
    - supabase/functions/_shared/email-templates.ts
    - supabase/functions/_shared/__tests__/email-templates.test.ts
    - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
    - supabase/functions/notificar-candidato/__tests__/vocabulario-eventos.test.ts
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md

key-decisions:
  - "Fixture sintética (@invalido.local) em vez de candidatura real de conta +claude no smoke, como no 48-08/48-09 — o operador pode estar exercitando essas contas (48-05), e o corpo que o trigger monta não distingue uma da outra"
  - "Uma linha nascida já revogada também não despacha (guard `NEW.revogado_em IS NOT NULL` antes do guard de UPDATE) — nenhuma RPC a produz, mas o trigger não depende disso"
  - "Assunto literal do plano sem o título da vaga («Uma avaliação cognitiva foi liberada para você»); a vaga vai no corpo. Prévia: «Uma avaliação cognitiva está disponível no seu painel.»"
  - "O e-mail não nomeia o instrumento (grep-guard também veta raven/matrizes) nem cita endereço @beautysmile.com.br (D-07)"
  - "Os testes do <behavior> da Task 2 foram escritos e commitados como RED ANTES do GREEN da Task 1 (ordem TDD real, em vez de testes que já nasceriam verdes)"

requirements-completed: [JORN-15]

coverage:
  - id: D1
    description: "notificar-candidato conhece cognitivo_liberado: EVENTO_MAP → avaliacao_cognitiva_liberada, chave por ciclo, ciclo malformado → 400, sem ciclo/null → chave legada, retry por id"
    requirement: JORN-15
    verification:
      - kind: unit
        ref: "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts (bloco 48-10) + vocabulario-eventos.test.ts (T-48-10) — suíte 222/222"
        status: pass
      - kind: other
        ref: "bundle vivo v13: cognitivo_liberado 17×, avaliacao_cognitiva_liberada 10×, eventoPorCiclo 7×, 'raw.ciclo !== null' 2×; POST sem Bearer → 401"
        status: pass
    human_judgment: false
  - id: D2
    description: "Template avaliacao_cognitiva_liberada: «avaliação cognitiva», vaga e painel no corpo; sem nota/score/instrumento/critério/motivo/«teste psicológico»; escapado; sem endereço do domínio"
    requirement: JORN-15
    verification:
      - kind: unit
        ref: "supabase/functions/_shared/__tests__/email-templates.test.ts#T-48-10a..d"
        status: pass
    human_judgment: false
  - id: D3
    description: "CHECK com 9 valores, classe transacional e trg_notif_cognitivo_liberado em cognitivo_liberacao, aplicados DEPOIS das EFs"
    requirement: JORN-15
    verification:
      - kind: integration
        ref: "node p46apply.cjs migrate supabase/migrations/20260921000010_p48_cognitivo_liberado_notifica.sql (md5 do ledger BATE, 37de23d2…)"
        status: pass
      - kind: integration
        ref: "supabase/tests/p48_cognitivo_notifica_smoke.sql (5/5) + sondas sem-trigger/sem-guard/sem-classe → FAIL (a)/(b)/(d)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Portões de vocabulário do 48-06 verdes com o 9º evento, que passam a exercitar"
    requirement: JORN-15
    verification:
      - kind: integration
        ref: "p43_guard_marketing_smoke 9/9 ((c) 8/8 com cognitivo_liberado) · p42_notif_revisao_smoke 4/4 ((a) 8 eventos) · p37_fidelidade_schema_smoke verde"
        status: pass
    human_judgment: false
  - id: D5
    description: "Prova com conta real: o RH libera → linha cognitivo_liberado enviado/entregue no ledger e e-mail na caixa"
    requirement: JORN-15
    verification: []
    human_judgment: true
    rationale: "Exige commitar uma liberação real com e-mail real (NOTIFICACOES_MODO=producao) — é o plano 48-18, por desenho do plano e do D-18"

duration: 12min
completed: 2026-09-21

plan_head_before: 5e542efd1293c468eb611a1bff9027d241a836b6
actuals:
  tokens: 16851
  tasks: 2
  commits: 4
---

# Phase 48 Plan 10: liberar a avaliação cognitiva passa a avisar o candidato · SUMMARY

**Quando o RH libera a avaliação cognitiva, `trg_notif_cognitivo_liberado` agora despacha o evento `cognitivo_liberado` para `notificar-candidato`. A EF manda o e-mail «Uma avaliação cognitiva foi liberada para você», com a chave `{candidatura}:cognitivo_liberado:{ciclo}`. O evento chegou a PROD registrado nos cinco lugares em que um esquecimento o faria sumir: EF, CHECK, classe, retry e portões. A ordem foi EF antes do trigger. Se o RH clicar «Liberar» de novo numa liberação vigente, não sai um segundo e-mail. Uma re-liberação depois de revogar gera aviso novo.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-21T14:36:03Z
- **Completed:** 2026-09-21T14:47:49Z
- **Tasks:** 2 (tracer + 1)
- **Files modified:** 10

## Ordem de entrega em PROD (horários medidos, UTC)

| Instante | O quê | Prova |
|---|---|---|
| 14:42:05 | `notificar-candidato` **v13** (antes: v12, `verify_jwt=false` lido e preservado) | bundle com `cognitivo_liberado` 17×, `avaliacao_cognitiva_liberada` 10×; a tolerância a `null` do v12 continua lá; POST sem Bearer → 401 |
| 14:42:17 | `notificar-rh` **v6** (antes: v5, `verify_jwt=false`) | importadora de `_shared/email-*`; POST sem Bearer → 401; `lgpd@` 0× |
| 14:42:19 | `executar-direito-titular` **v6** (antes: v5, `verify_jwt=true`) | OPTIONS → 200; `lgpd@` 0× |
| 14:43 | ensaio da migration num envelope que aborta | todos os portões passaram; depois: função inexistente, classes = 8 (nada persistiu) |
| 14:44:09 | migration **20260921000010** | `md5 37de23d2…`, ledger **BATE** (19088 octetos) |

`git log origin/main..HEAD` ficou vazio depois de cada commit que acompanha um deploy.

## Accomplishments

- **As cinco obrigações do evento novo (RESEARCH §D.1), todas na mesma entrega:**
  1. o CHECK foi de 8 para 9 valores. Um pré-portão confere o texto exato transcrito no cabeçalho, e o `DO` aborta se algum dos 9 faltar;
  2. a classe é `transacional`, inserida com `ON CONFLICT (evento) DO NOTHING`;
  3. o vocabulário da EF e as três entradas de template estão pinados por teste;
  4. a varredura de retry não foi redefinida. O pós-portão e o smoke (d) provam que ela não menciona `cognitivo`, e o teste do branch retry prova que a EF re-tenta a linha por id sem precisar do `ciclo`;
  5. os portões do 48-06 veem o evento sem nenhuma edição.
- **Guard de transição.** O upsert de `liberar_cognitivo` sempre recarimba `liberado_em`. Por isso o trigger só despacha em dois casos: no INSERT, e quando a liberação volta de revogada para vigente. Clicar «Liberar» numa liberação vigente não despacha, e revogar também não. As duas negativas foram provadas pelo smoke (b) e (c).
- **E-mail.** Diz «avaliação cognitiva», traz a vaga e manda a pessoa ao painel. Não traz nota, score, instrumento, critério nem motivo, e não cita endereço do domínio (D-07). O botão para o painel é do 48-16 e não foi duplicado aqui.
- **`em_espera` continua sem aviso (D-22).** Nada foi tocado ali.

## Task Commits

1. **RED dos testes do `<behavior>`:** `91411d77` test. 11 falhas por asserção (400 VALIDATION, template ausente) e 211 verdes. `gsd check tdd-red-evidence` → `RED_EVIDENCE_OK`.
2. **Task 1 (tracer):**
   - `e580a144` feat: vocabulário e template na EF (GREEN, 222/222), seguido do deploy das três EFs;
   - `d359be40` feat: migration aplicada em PROD.
   - Tracer gate (interativo, `end-of-phase`, verify só `<automated>`): re-executei o verify de ponta a ponta. Deu 222/222, o marcador aparece no bundle e o md5 do ledger bate, então segui para a Task 2.
3. **Task 2:** `82193d84` test: smoke (a)–(e), as sondas de mordida, os três portões e o deferred.

## Verificação

| Portão | Resultado |
|---|---|
| `deno test` (arquivos de `notificar-candidato/` e `_shared/`, sem o `strict-schema.test.ts` vitest pré-existente) | **222/222** com type-check (baseline: 211) |
| `deno check` das três importadoras + `deno test notificar-rh/ executar-direito-titular/` | ok · **146/146** |
| `p48_cognitivo_notifica_smoke.sql` | **5/5** |
| Mordida (cópias em envelope que aborta) | sem trigger → `FAIL (a)`; sem guard de vigente → `FAIL (b)`; sem classe → `FAIL (d)`. Depois disso: trigger, classe e guard intactos, fila vazia |
| `p43_guard_marketing_smoke` | **9/9**; (c) aceitou **8/8** eventos não-marketing por inserção real revertida, `cognitivo_liberado` entre eles (eram 7) |
| `p42_notif_revisao_smoke` | **4/4**; (a) iterou os 8, com `cognitivo_liberado` |
| `p37_fidelidade_schema_smoke` | verde (gate (k) interno) |
| `p48_dedupe_smoke` (48-08, regressão) | **6/6** |
| Varredura de portões (D-17) | 259 achados (250 depois do 48-06, mais 9 de `p48_dedupe`/`p48_rejeicao_triagem`); pontos cegos 36 e 3, iguais. Nenhum achado vigia `cognitivo_liberacao`; os que vigiam o vocabulário já iteram o vivo. Não havia fotografia a converter |
| `p39_rewire_triggers_smoke.sql:189` | `trg_notif_*` = **7** (era 6), como previsto. Vermelho, registrado e não tocado |
| `tsc` | 90 (teto D-15: 90) |
| PROD depois | ledger 48 linhas (não mudou), nenhuma linha `cognitivo_liberado`, `cognitivo_liberacao` = 1 (não mudou), classes = 9, resíduo de fixture 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Desvio da letra, no idioma do 48-08/48-09] O smoke usa fixture sintética, e não uma candidatura real de conta de teste**
- **Found during:** Task 2
- **Issue:** o plano pedia «uma candidatura real de conta de teste EM ANDAMENTO». O orquestrador avisou que o operador pode estar exercitando contas `+claude` em PROD agora (48-05). Uma liberação nelas, mesmo revertida, disputa lock de linha com o fluxo vivo.
- **Fix:** usei titular `@invalido.local`, com uma candidatura que nasce `rejeitado` (isso desarma a confirmação) e passa para `em_analise`. Tudo roda numa subtransação revertida. O corpo que o trigger monta é o mesmo.
- **Commit:** `82193d84`

**2. [Rule 3 — verify herdaria falha pré-existente] `deno test ... supabase/functions/_shared/` reprova pelo `strict-schema.test.ts` (vitest)**
- **Issue:** esse arquivo já falhava antes (item do 48-07 em `deferred-items.md`), e o `<verify>` literal sai com código ≠ 0 por causa dele.
- **Fix:** rodei os mesmos arquivos dos dois diretórios, excluindo só esse, com type-check: 222/222. Registrei em `deferred-items.md`.

**3. [Ordem TDD] Os testes do `<behavior>` da Task 2 foram o RED da Task 1**
- **Issue:** pela ordem do plano, a implementação vinha na Task 1 e os testes na Task 2, então os testes nasceriam verdes.
- **Fix:** escrevi e commitei os testes primeiro (`91411d77`, 11 falhas por asserção). A Task 1 é o GREEN deles.

**4. [Rule 2] Guard adicional para linha nascida revogada; grep-guard mais estrito que o do plano**
- O trigger também não despacha quando `NEW.revogado_em IS NOT NULL` num INSERT. Nenhuma RPC produz esse caso hoje, mas o trigger não depende disso.
- O teste também veta que o instrumento seja nomeado (`raven`/`matrizes`) e que apareça endereço `@beautysmile.com.br` (D-07).

**5. [Anotação] O `migrate` do `<verify>` não é re-executável**
- No tracer gate, conferi o `md5(statements[1])` do ledger em vez de reaplicar. O `ensaio` antes do apply rodou a migration inteira num envelope que aborta.

---

**Total deviations:** 1 desvio de fixture com precedente, 1 portão herdado registrado, 1 reordenação TDD, 1 endurecimento Rule 2, 1 anotação.
**Impact:** nenhum muda o que o plano prova. O nº 3 fortalece a prova, porque os testes foram vistos falhando.

## TDD Gate Compliance

- **RED:** `91411d77`. O teste-alvo «48-10 — cognitivo_liberado com ciclo válido…» falhou por asserção (400 VALIDATION). Rodei com `--no-check`: o espelho `Record<EventoLedger,…>` do teste só compila depois do GREEN. O TAP do Deno ganhou o sumário `# tests/# pass/# fail`, derivado da contagem de `ok`/`not ok`, e o registro deu `RED_EVIDENCE_OK`.
- **GREEN:** `e580a144`, 222/222 com type-check.
- **REFACTOR:** nenhum.

## Threat Surface

Não há superfície nova além do `<threat_model>`:
- **T-48-10-01:** CHECK e classe na mesma migration, com asserção no `DO`. A sonda sem classe morde.
- **T-48-10-02:** as EFs foram deployadas e o marcador foi conferido no bundle antes do apply.
- **T-48-10-03:** o corpo não traz avaliação, e o grep-guard está em teste.
- **T-48-10-04:** o guard de transição cobre o risco, provado pelo smoke (b) e pela sonda sem guard.
- **T-48-10-SC:** nada foi instalado.

## Known Stubs

Nenhum.

## Next Phase Readiness

- **48-16:** o botão de acesso ao painel entra em todos os corpos de candidato. `corpoCognitivoLiberado` já diz «Acesse o seu painel para ver as instruções» e espera o botão. Com este plano, a promessa de D-09 («avisaremos quando houver algo para você fazer») cobre `avaliacao_liberada`, `convite` e a liberação cognitiva.
- **48-18 (prova com conta real):** o RH libera a avaliação cognitiva para uma candidatura de conta de teste em andamento. Confira:
  - `SELECT status, dedupe_key FROM notificacoes_enviadas WHERE evento='cognitivo_liberado'` → 1 linha `enviado`/`entregue`, com chave `{c}:cognitivo_liberado:{epoch}`;
  - clicar «Liberar» de novo → nenhuma linha nova;
  - revogar e liberar → uma segunda linha, com outra chave;
  - o e-mail na caixa.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260921000010_p48_cognitivo_liberado_notifica.sql
- FOUND: supabase/tests/p48_cognitivo_notifica_smoke.sql
- FOUND commits: 91411d77, e580a144, d359be40, 82193d84
