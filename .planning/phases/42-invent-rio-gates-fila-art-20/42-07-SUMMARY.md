---
phase: 42-invent-rio-gates-fila-art-20
plan: 07
subsystem: api
tags: [edge-function, deno, resend, pg_net, trigger, ledger, idempotencia, lgpd, art20, privacidade, authz]

requires:
  - phase: 42-06
    provides: "write-path do Art. 20 — `solicitar_revisao_decisao` grava `revisao_solicitada_em`; guards fail-closed dos 3 RPCs"
  - phase: 42-01
    provides: "hook de não-regressão de tsc (baseline 97) e `vocabulario-eventos.test.ts`"
provides:
  - "EF `notificar-rh` (código completo, 22 casos Deno, corpus 301/301) — DEPLOYADA em PROD 2026-07-31 (v1, `verify_jwt=false`)"
  - "`20260730000003_p42_trg_revisao_solicitada.sql` — APLICADA em PROD 2026-07-31, md5 byte-idêntico ao arquivo"
  - "`resolverDestinatarioComLabel` em `_shared/email-config.ts` — rótulo de sink desacoplado do vocabulário de evento de candidato"
  - "Predicado de exclusão de eventos de RH em `varrer_retry_notificacoes` (fecha T-42-23)"
  - "Extensão do CHECK `notificacoes_enviadas_evento_check` para 5 valores (pré-requisito não previsto pelo plano)"
affects: [42-08, 42-09, 42-10, 42-11, 42-12]

tech-stack:
  added: []
  patterns:
    - "Rótulo do sink de teste é conceito de DESTINO, não de vocabulário de evento — generalizar `resolverDestinatarioComLabel` em vez de inflar a união `EventoNotificacao` e seus 3 `Record<>` de template"
    - "`dedupe_key` por DESTINATÁRIO quando o mesmo evento tem N recipientes — uma chave por entidade faria o 1º consumir o claim e os demais receberem `duplicate` em silêncio"
    - "Falha de um evento SEM sweep de retry grava `proxima_tentativa_em` NULO — agendar uma tentativa que nada consumirá é escrever afirmação falsa no ledger"
    - "Allowlist de log POR Edge Function, nunca importada da EF vizinha: `dedupe_key` é logável numa e proibida na outra porque embute ids que ali não são compostos"
    - "Adicionar valor ao ledger `notificacoes_enviadas` exige o CHECK na MESMA entrega — o código sem o CHECK produz 23514 no claim, e o CHECK sem o código produz 400 VALIDATION sobre um dispatch at-most-once"

key-files:
  created:
    - supabase/functions/notificar-rh/index.ts
    - supabase/functions/notificar-rh/helpers.ts
    - supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts
    - supabase/migrations/20260730000003_p42_trg_revisao_solicitada.sql
  modified:
    - supabase/functions/_shared/email-config.ts
    - supabase/functions/_shared/__tests__/email-config.test.ts

key-decisions:
  - "O CHECK `notificacoes_enviadas_evento_check` FOI ESTENDIDO neste plano, que não o previa: sem `revisao_solicitada` no CHECK todo claim da EF falharia com 23514 e o REVISAO-01 seria um no-op silencioso. O plano atribuiu a extensão só ao 42-08 e não viu que o evento DESTE plano precisa da mesma coisa"
  - "Escopo mínimo no CHECK: apenas `revisao_solicitada`. `revisao_respondida` NÃO foi adicionado 'de graça' porque o CHECK é um dos sítios que fecham aquele vocabulário e registrá-lo sem os sítios de código é o drift que o D-P42-14 existe para impedir"
  - "Migration numerada `20260730000003` por diretiva do orquestrador — a versão `20260730000002` já está aplicada em PROD pela 42-06. Isso COLIDE com o nome que o plano 42-08 reservou; a 42-08 tem de renumerar"
  - "`proxima_tentativa_em` NULO na falha do RH, nunca um timestamp: a varredura exclui os eventos de RH, então agendar seria a mesma classe de truque opaco que o plano rejeitou para `tentativas = 5`"
  - "`logSeguroRh` tem allowlist PRÓPRIA em vez de importar `logSeguro` da EF vizinha: `dedupe_key` é permitida lá e proibida aqui (embute o `candidatura_id` completo E o `user_id`), e um import cruzado faria mudança na allowlist do candidato alterar em silêncio o log do RH"
  - "`nome_completo` NÃO é lido do roster: o corpo do e-mail não o usa e `usuarios_rh` é admin-only desde a SEG-02 — ler dado pessoal que não se vai usar é superfície gratuita"
  - "Chave do Resend ausente ⇒ claim + `falhou`, nunca skip antes do claim: T-42-26 exige que toda tentativa deixe trilha, e o trigger dispara uma única vez (não há 2º dispatch a proteger)"

patterns-established:
  - "Um plano que adiciona evento ao ledger compartilhado deve ser lido contra o CHECK VIVO da coluna, não contra a lista de sítios que o plano enumera — o CHECK é o sítio que o planner mais esquece"
  - "Antes de substituir função viva, diffar a transcrição contra o arquivo de origem E contra `pg_get_functiondef` do catálogo: o diff contra o arquivo é barato e feito pelo executor; o diff contra o catálogo é o único que prova, e é do orquestrador"

requirements-completed: [REVISAO-01]
requirements-pending-checkpoint: []

checkpoint_pendente: false
checkpoint_concluido: 2026-07-31

coverage:
  - id: D1
    description: "Helpers puros da EF do RH: dedupe_key por destinatário (não-colisão asserida), assunto sem nome de candidato e com CR/LF neutralizado, corpo sem nome nem candidatura_id e com HTML escapado"
    requirement: "REVISAO-01"
    verification:
      - kind: unit
        ref: "supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts — 12 casos de helpers (T-42-24 privacidade, T-42-24 XSS, não-colisão, header injection)"
        status: pass
    human_judgment: false
  - id: D2
    description: "`resolverDestinatarioComLabel` generalizado com `resolverDestinatario` delegando — zero mudança de comportamento para os 4 eventos vivos"
    verification:
      - kind: unit
        ref: "supabase/functions/_shared/__tests__/email-config.test.ts — 3 casos novos (10-12); casos 1-9 pré-existentes passam sem alteração (git diff: 40 adições, 0 deleções)"
        status: pass
    human_judgment: false
  - id: D3
    description: "EF `notificar-rh`: 401 sem Bearer e com Bearer divergente; 400 VALIDATION para todo evento fora do vocabulário; roster filtrado pelo vocabulário da COLUNA (administrador/recrutador, nunca 'rh' do JWT) com `ativo = true AND deleted_at IS NULL`; 3 destinatários ⇒ 3 linhas de ledger com dedupe_key distintas; falha de um não interrompe os demais"
    requirement: "REVISAO-01"
    verification:
      - kind: unit
        ref: "supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts — 10 casos de handler com deps mockadas (T-42-25, T-42-04, T-42-26), sem --allow-net"
        status: pass
    human_judgment: false
  - id: D4
    description: "Predicado de exclusão dos eventos de RH em `varrer_retry_notificacoes` — fecha o laço infinito contra a Edge Function errada (T-42-23)"
    requirement: "REVISAO-01"
    verification:
      - kind: other
        ref: "diff da transcrição contra 20260727000001: a ÚNICA diferença é a cláusula de exclusão + o comentário adjacente (colado abaixo). A asserção negativa AO VIVO é o passo 7 do checkpoint, NÃO executada"
        status: unknown
    human_judgment: true
    rationale: "O predicado só está provado contra o arquivo de origem. Provar contra o objeto vivo exige `pg_get_functiondef` e uma execução real da varredura em PROD — MCP Supabase indisponível ao subagente"
  - id: D5
    description: "Trigger `trg_notif_revisao_solicitada` + extensão do CHECK do ledger, aplicados em PROD, com o round-trip provado ao vivo (uma linha de ledger por destinatário RH ativo)"
    requirement: "REVISAO-01"
    verification: []
    human_judgment: true
    rationale: "Apply de migration, deploy de Edge Function e smoke em PROD exigem os tools MCP do Supabase, que subagentes GSD não recebem (anthropics/claude-code#13898). `supabase db push` é proibido neste projeto e o CLI não está autenticado. É o checkpoint da Task 3, do orquestrador"

duration: ~55min
completed: 2026-07-30
status: complete
---

# Phase 42 / Plan 42-07: EF `notificar-rh` + trigger da revisão Art. 20 — Summary

**A EF que notifica o RH e o trigger que a aciona estão escritos e provados sem rede (301/301 no corpus), com a colisão do ledger compartilhado fechada — mas o plano omitia um pré-requisito bloqueante: o CHECK `notificacoes_enviadas_evento_check` recusaria toda linha de RH com `23514`, e o REVISAO-01 seria um no-op silencioso. Nada foi aplicado nem deployado.**

## ✅ CHECKPOINT CONCLUÍDO — 2026-07-31, pelo orquestrador

REVISAO-01 está **entregue e provado ao vivo**. O round-trip do Art. 20 fecha: o pedido
do titular chega ao RH por e-mail. Ordem executada, a canônica: **EF primeiro, migration
depois** (`net.http_post` é at-most-once).

**Gate do passo 1 — a função viva contra a transcrição.** `pg_get_functiondef` de
`varrer_retry_notificacoes` diffado contra o BLOCO C **antes** do apply. Única
divergência: o bloco de comentário `-- Seleção coberta por idx_notif_retry …`, que é
exatamente o drift já medido e documentado em
`.planning/todos/pending/processo-origem-do-drift-desconhecida.md` (P41). Corpo funcional
byte-idêntico ⇒ apply liberado. **O apply reparou o drift** — o comentário voltou.

**Deploy da EF.** `notificar-rh` v1, `verify_jwt=false` (self-auth Bearer, espelho de
`notificar-candidato`). Fechamento das 4 dependências (`index.ts`, `helpers.ts`,
`_shared/email-config.ts`, `_shared/email-templates.ts`) retransmitido e **conferido de
volta** por `get_edge_function`: os blocos longos de comentário voltaram íntegros — a
classe de perda do drift P41 está descartada nesta EF.

**Apply da migration.** `md5(statements[1])` do ledger == md5 do arquivo
(`2cfce511251814b227db22d7f0ff2d56`): **fidelidade byte-a-byte provada, não presumida**.
Duas descobertas de processo saíram daqui e estão no todo do drift: `apply_migration`
carimba a própria `version` (reparada à mão para `20260730000003`), e
`schema_migrations.statements[]` registra o SQL aplicado — o que torna o drift mensurável
por md5 daqui em diante.

**Asserções pós-apply, incluindo as negativas:**

| # | Asserção | Resultado |
|---|----------|-----------|
| a | CHECK de `evento`: exatamente **1** constraint, 5 valores | ✅ `confirmacao, avanco, convite, decisao, revisao_solicitada` |
| b | **Negativa** — triggers de `decisao_final` após o apply | ✅ 2: `trg_decisao_final_snapshot` **intacto** + o novo, com a cláusula exata `AFTER UPDATE OF revisao_solicitada_em` |
| c | Exclusão de RH presente **e** as 8 substrings de não-regressão da P41 preservadas | ✅ todas; **sem** chave de servidor privilegiada |
| d | **Negativa** — `anon` sem EXECUTE nas duas funções | ✅ `trg_notif_…`: postgres/authenticated/service_role · `varrer_retry_…`: postgres/service_role. Fecha o `threat_flag: information_disclosure` deste plano |
| e | **Negativa** — total de jobs de cron | ✅ 3, inalterado |

**Smoke ao vivo (`modo=producao`, envio real).** Fixture `a802bc05-…` recebeu
`decisao_final` com `revisao_solicitada_em` NULO; o `UPDATE` para `now()` disparou o
trigger.

- **2 linhas de ledger, uma por destinatário ativo**, `status=enviado` com
  `provider_message_id` do Resend, `tentativas=0`, `ultimo_erro` nulo.
- **`dedupe_key` bate o `user_id` de cada destinatário** nos dois casos — a chave
  por-destinatário funciona, o claim do 1º RH **não** consumiu o do 2º. Era o defeito que
  faria 4 de 5 pessoas nunca serem notificadas.
- **Asserção negativa de idempotência:** 2º `UPDATE` reescrevendo o mesmo timestamp
  **não** produziu 3ª linha — o guard `NULL -> NOT NULL` segura, como exige um dispatch
  at-most-once.
- Teardown: `decisao_final` + `decisao_final_historico` da fixture removidos; a
  candidatura volta ao estado "sem decisão", re-executável. **As 2 linhas de ledger foram
  mantidas** como evidência do REVISAO-01.

**`NOTIFICACOES_MODO` é de PROJETO, não por função — confirmado, não suposto.** A EF
nova nasceu em `producao` (o ledger registra `modo=producao`). O risco previsto na seção
"Risco de envio real" era real.

**Decisão do operador sobre o roster (perguntada, não presumida).** Dos 5 destinatários,
3 eram endereços sintéticos `@teste.com` que dariam **hard bounce** numa conta Resend de
free-tier — e dariam em **todo nudge real futuro**, não só no smoke. O operador escolheu
desativá-los antes do smoke. Executado, com uma ressalva aplicada pelo orquestrador:

- `admin.rh@teste.com` e `recruiter@teste.com` (seeds óbvios, `user_id` `aaaa…`/`bbbb…`)
  **permanecem `ativo=false`**.
- `recrutador.rh@teste.com` foi **reativado**: é o **único** `recrutador` vivo — a persona
  primária da fila. Mantê-lo desativado o removeria de todos os nudges futuros **e**
  bloquearia o login usado para exercitar o papel nos planos 42-10/42-11. **Fica um
  problema aberto: o endereço dele é indeliverável e precisa de um real** — enquanto não
  for, todo pedido de revisão real gera 1 hard bounce.

**Três achados que mudam o checkpoint em relação ao texto do plano — ler antes de aplicar:**

1. **A ordem do plano ganha um passo zero: aplicar o BLOCO A do CHECK.** Sem ele a EF
   deployada aceita o evento, reivindica e falha com `23514` em todo destinatário. O
   BLOCO A vive na mesma migration, então a ordem canônica (EF primeiro, migration
   depois) continua valendo — mas o smoke do passo 6 **não pode** ser tentado antes do
   apply da migration, ao contrário do que a leitura ingênua do passo 4 sugere.

2. **`NOTIFICACOES_MODO` é `producao` em PROD, não `teste`.** O passo 6 do plano diz
   "em modo `teste`". Se os secrets do Supabase forem de projeto (e não por função,
   como o plano afirma), a EF nova nasce em `producao` e o smoke manda **e-mail real
   para os 4 administradores + 1 recrutador reais**. Ver "Risco de envio real" abaixo.

3. **A rota `/rh/revisoes` do link do e-mail só existe a partir do plano 42-09.**
   Aplicar o trigger agora significa que um pedido de revisão real produz um e-mail com
   link para um 404. Decisão de sequenciamento, do orquestrador — ver "Risco de link
   morto" abaixo.

## Performance

- **Duração:** ~55 min
- **Iniciado:** 2026-07-30T01:15 (-03:00, aprox.)
- **Concluído:** 2026-07-30T02:10 (-03:00)
- **Tasks:** 2 de 3 (a 3ª é o checkpoint, devolvida)
- **Arquivos criados/modificados:** 6

## Accomplishments

- **A EF `notificar-rh` resolve destinatários pelo vocabulário certo.** O filtro usa
  `("administrador","recrutador")` — os valores da **coluna** `usuarios_rh.role`. Um
  `'rh'` ali (o valor do **JWT**, produzido pelo hook que mapeia `recrutador → rh`)
  devolveria só administradores e descartaria em silêncio o único recrutador vivo, que é
  a persona primária da fila. Há teste que reprova a regressão pelos dois lados: exige
  `recrutador` presente **e** `rh` ausente.
- **Uma linha de ledger por destinatário, provada não-colidente.** `dedupe_key` =
  `{candidatura}:revisao_solicitada:{user_id}`. Com chave só por candidatura, o 1º RH
  consumiria o claim e 4 de 5 pessoas receberiam `skipped:duplicate` sem erro em lugar
  nenhum.
- **A colisão do ledger compartilhado está fechada e o diff é auditável.** A varredura
  de retry viva passou a excluir o prefixo do evento de RH; o diff da transcrição contra
  `20260727000001` é **exatamente** a cláusula nova mais o comentário (colado abaixo).
- **O corpo do e-mail ao RH não carrega nome de candidato nem `candidatura_id`**, e a
  asserção é estrutural: a assinatura não aceita esses campos, e um teste injeta um
  objeto com campos extras e falha se qualquer um deles aparecer no HTML. Em modo
  `teste` esse corpo viaja inteiro para `resend.dev`, domínio de terceiro.
- **O rótulo do sink de teste foi desacoplado do vocabulário de evento de candidato**
  sem alterar um único teste existente (`git diff` de `email-config.test.ts`: 40
  adições, 0 deleções).

## Task Commits

1. **Task 1: helpers puros + rótulo de sink generalizado** — `265aa0e` (feat, TDD)
2. **Task 2: `index.ts` + migration do trigger e do predicado** — `f240a16` (feat)
3. **Task 3: CHECKPOINT** — devolvida ao orquestrador, sem commit

**Metadados do plano:** ver commit `docs(42-07)` desta rodada.

### RED → GREEN da Task 1 (exigido pelos critérios de aceitação)

**RED** — testes escritos antes da implementação, contra módulos inexistentes:

```
TS2307 [ERROR]: Cannot find module '.../supabase/functions/notificar-rh/helpers.ts'
    at .../notificar-rh/__tests__/notificar-rh.test.ts:34:8
TS2724 [ERROR]: '.../email-config.ts' has no exported member named
  'resolverDestinatarioComLabel'. Did you mean 'resolverDestinatario'?
Found 2 errors.
error: Type checking failed.
```

**GREEN** — após implementar `resolverDestinatarioComLabel` e `notificar-rh/helpers.ts`:

```
running 12 tests from ./supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts
... (12 ok)
ok | 142 passed | 0 failed (4s)      # _shared + notificar-rh
ok | 291 passed | 0 failed (5s)      # corpus inteiro após a Task 1
ok | 301 passed | 0 failed (5s)      # corpus inteiro após a Task 2
```

## Files Created/Modified

- `supabase/functions/notificar-rh/helpers.ts` — funções puras: `montarDedupeKeyRh`,
  `assuntoRevisaoSolicitada`, `corpoRevisaoSolicitada`, `construirCorpoResendRh`,
  `montarUrlFila`, `logSeguroRh`, `refCurta`, e as constantes de vocabulário
  (`EVENTO_LEDGER_RH`, `TEMPLATE_LEDGER_RH`, `LABEL_SINK_RH`, `APP_BASE_URL_PADRAO`).
- `supabase/functions/notificar-rh/index.ts` — `handler(req, deps)` injetável,
  `Deno.serve` atrás do guard de entrypoint; self-auth Bearer, payload ids-only,
  allowlist de colunas, roster no momento do envio, laço claim-before-send por
  destinatário, fire-and-forget.
- `supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts` — 22 casos (12 de
  helpers + 10 de handler), zero rede.
- `supabase/migrations/20260730000003_p42_trg_revisao_solicitada.sql` — BLOCO A (CHECK do
  ledger + bloco `DO` auto-verificador), BLOCO B (função + trigger), BLOCO C
  (`varrer_retry_notificacoes` substituída).
- `supabase/functions/_shared/email-config.ts` — `resolverDestinatarioComLabel` novo;
  `resolverDestinatario` delega.
- `supabase/functions/_shared/__tests__/email-config.test.ts` — 3 casos novos (10-12).
  **40 adições, 0 deleções.**

## Diff da varredura viva (evidência do passo 1 do checkpoint, lado do repositório)

Transcrição em `20260730000003` versus a fonte `20260727000001`:

```diff
@@ -21,11 +21,22 @@
   -- T-41-10/T-41-13).
+  --
+  -- P42-07 · a cláusula de exclusão abaixo: [comentário de 9 linhas nomeando as 4
+  -- etapas da colisão: URL fixa · 400 VALIDATION · tentativas não incrementa ·
+  -- laço consumindo o LIMIT 20]
   FOR r IN
     SELECT id, evento, candidatura_id, dedupe_key
       FROM public.notificacoes_enviadas
      WHERE status IN ('pendente','falhou')
        AND tentativas < 5
+       AND evento NOT LIKE 'revisao\_solicitada%'
        AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= pg_catalog.now())
      ORDER BY proxima_tentativa_em NULLS FIRST
      LIMIT 20
```

Nenhuma outra linha difere. **Isto NÃO substitui o passo 1 do checkpoint:** o diff que
prova é contra `pg_get_functiondef('public.varrer_retry_notificacoes()')` do catálogo
vivo, e esse é o único que detecta um estado acumulado divergente do arquivo (a classe do
achado A1 da pesquisa). As 7 substrings que
`supabase/tests/p41_recon_retry_smoke.sql:187-220` exige estão todas preservadas, e a
chave de servidor privilegiada continua ausente do corpo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] O CHECK do ledger recusaria toda linha de RH — extensão adicionada**

- **Found during:** Task 2
- **Issue:** D-P42-15 manda o nudge ao RH entrar no ledger `notificacoes_enviadas`, mas a
  coluna `evento` carrega o CHECK `notificacoes_enviadas_evento_check`, fechado nos 4
  eventos do M7 (`20260721000001:77`). O plano descreve claim-before-send e `dedupe_key`
  e **nunca menciona o CHECK**. Sem estendê-lo, todo `upsert` da EF falharia com `23514`,
  nenhuma linha entraria no ledger, nenhum e-mail sairia — REVISAO-01 seria um no-op
  silencioso. O planner atribuiu a extensão do CHECK apenas ao plano 42-08 (o 5º evento
  de **candidato**) e não percebeu que o evento **deste** plano precisa da mesma coisa.
  A própria pesquisa da fase nomeia o mecanismo ("um sem o outro = 500 em runtime ou
  linha rejeitada pelo CHECK").
- **Fix:** BLOCO A da migration: `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` com o
  **mesmo nome** (auto-gerado e declarado LOAD-BEARING pelo cabeçalho de
  `20260721000001`), aceitando 5 valores. Escopo mínimo: só `revisao_solicitada`.
  Acrescentado um bloco `DO` auto-verificador que **falha alto** se sobrar qualquer outro
  CHECK sobre `evento` — nesse cenário o novo conviveria com o antigo, a reivindicação
  continuaria recusada, e a migration teria "passado".
- **Files modified:** `supabase/migrations/20260730000003_p42_trg_revisao_solicitada.sql`
- **Verification:** estático (o apply é do checkpoint). O `ADD CONSTRAINT` não pode falhar
  por dado vivo porque o vocabulário apenas cresce.
- **Committed in:** `f240a16`

**2. [Rule 3 - Blocking] Nome da migration mudado para `20260730000003` — colide com o que o 42-08 reservou**

- **Found during:** Task 2
- **Issue:** O plano nomeia `20260730000002_p42_trg_revisao_solicitada.sql`. Esse prefixo
  já está tomado: a 42-06 criou e aplicou `20260730000002_p42_revisao_art20_authz_fail_closed.sql`
  em PROD e o ledger está reconciliado nele (diretiva do orquestrador). Ao renumerar para
  `20260730000003` descobriu-se que **o plano 42-08 reservou exatamente esse nome** para
  `20260730000003_p42_evento_revisao_respondida.sql`.
- **Fix:** usado `20260730000003` conforme a diretiva. **A 42-08 tem de renumerar para
  `20260730000004`** — ela ainda não foi executada, então é o lado barato de mover.
- **Files modified:** o nome do arquivo de migration
- **Verification:** `ls supabase/migrations/2026073*` mostra `…0001`, `…0002`, `…0003` sem
  duplicata de prefixo
- **Committed in:** `f240a16`

**3. [Rule 3 - Blocking] `candidato_id` lido da candidatura (o plano dizia "apenas o `vaga_id`")**

- **Found during:** Task 2
- **Issue:** `notificacoes_enviadas.candidato_id` é `NOT NULL` com FK para `candidatos`.
  A allowlist prescrita pelo plano (só `vaga_id`) tornaria o claim impossível.
- **Fix:** allowlist `("candidato_id, vaga_id")`, com comentário registrando que é
  requisito de **forma do ledger**, não dado do e-mail — nada do candidato é interpolado
  em nenhum lugar.
- **Files modified:** `supabase/functions/notificar-rh/index.ts`
- **Verification:** teste `T-42-26` assere `row.candidato_id` no upsert capturado
- **Committed in:** `f240a16`

**4. [Rule 2 - Missing Critical] `REVOKE … FROM anon` — `FROM PUBLIC` não remove anon**

- **Found during:** Task 2
- **Issue:** Medido na 42-06: o `pg_default_acl` do schema `public` neste projeto concede
  EXECUTE a `anon`/`authenticated`/`service_role` como grants **diretos e nomeados** em
  todo `CREATE FUNCTION`, então `REVOKE … FROM PUBLIC` remove um grant que nunca existiu.
  Pior: `varrer_retry_notificacoes` é uma função `SECURITY DEFINER` **diretamente
  invocável que dispara e-mail**, e a P41 só revogou de PUBLIC — um chamador com a chave
  pública do projeto poderia acionar uma varredura de envio. `CREATE OR REPLACE` preserva
  a ACL, então a substituição por si só não fecharia nada.
- **Fix:** `REVOKE … FROM anon` na função de trigger nova; `REVOKE … FROM anon` **e**
  `FROM authenticated` em `varrer_retry_notificacoes`. Nada a chama fora do cron, que roda
  como o papel que o agendou (superusuário, sem checagem de privilégio). Em
  `trg_notif_revisao_solicitada` o `authenticated` foi deixado de fora do revoke: o
  write-path é um RPC `SECURITY DEFINER` cujo dono é o usuário efetivo quando o trigger
  dispara, e revogar além do necessário numa função de fire-path é mudança sem requirement.
- **Files modified:** `supabase/migrations/20260730000003_p42_trg_revisao_solicitada.sql`
- **Verification:** `grep -c 'FROM anon;'` == 2 (estático; o `proacl` vivo é do checkpoint)
- **Committed in:** `f240a16`

**5. [Rule 2 - Missing Critical] CR/LF neutralizado no assunto (injeção de header)**

- **Found during:** Task 1
- **Issue:** `tituloVaga` é texto digitado por humano no CRUD de vagas e ia direto para o
  campo `subject`. Um `\r\n` num assunto é a forma clássica de injeção de header de e-mail.
- **Fix:** `assuntoRevisaoSolicitada` faz `.replace(/[\r\n]+/g, " ").trim()`, com teste
  que passa `"Vaga X\r\nBcc: intruso@exemplo.com"` e reprova qualquer CR/LF na saída.
- **Files modified:** `supabase/functions/notificar-rh/helpers.ts`
- **Committed in:** `265aa0e`

**6. [Rule 2 - Missing Critical] `montarUrlFila` valida a base e cai no default**

- **Found during:** Task 1
- **Issue:** O plano especifica `corpoRevisaoSolicitada({ tituloVaga, urlFila })` mas não
  diz de onde vem `urlFila`, e não existia padrão de URL de app em nenhuma EF. Um valor
  vindo de env sem validação produziria link quebrado — ou `javascript:` — num e-mail interno.
- **Fix:** `montarUrlFila` aceita só `https:` e cai no default canônico
  `https://recruta.beautysmile.com.br` (o host vivo, o mesmo do `LOGO_URL` dos templates em
  produção) para base vazia, malformada, não-URL ou com outro esquema. Override por env
  `APP_BASE_URL`. Mesma doutrina fail-safe de `resolverModo`.
- **Files modified:** `supabase/functions/notificar-rh/helpers.ts`, `index.ts`
- **Committed in:** `265aa0e`, `f240a16`

**7. [Rule 2 - Missing Critical] `nome_completo` removido da allowlist do roster**

- **Found during:** Task 2
- **Issue:** O plano prescreve `.select("user_id, nome_completo, email")`, mas
  `nome_completo` não é usado em lugar nenhum — nem no corpo do e-mail (decisão de
  privacidade da Task 1), nem no ledger, nem no log (a allowlist o barra).
  `usuarios_rh` é admin-only desde a SEG-02.
- **Fix:** allowlist reduzida a `("user_id, email")`, com o motivo no comentário.
- **Files modified:** `supabase/functions/notificar-rh/index.ts`
- **Committed in:** `f240a16`

### Decisões de implementação registradas (não são correções)

**8. `proxima_tentativa_em` NULO na falha.** A varredura exclui os eventos de RH, então
agendar uma próxima tentativa que nada consumirá é escrever afirmação falsa no ledger —
a mesma classe de truque opaco que o plano rejeitou explicitamente para `tentativas = 5`.
Pinado por teste.

**9. `logSeguroRh` com allowlist própria, não `logSeguro` importado.** O plano manda
"decidir por leitura e registrar a escolha". A allowlist vizinha não tem as chaves que
esta EF precisa (`destinatarios`, `candidatura_ref`) e **permite `dedupe_key`**, que aqui
embute o `candidatura_id` completo e o `user_id` — logá-la reintroduziria exatamente o que
a allowlist existe para barrar. Um import cruzado também faria uma mudança na allowlist do
candidato alterar em silêncio o log do RH.

**10. Chave do Resend ausente ⇒ claim + `falhou`, não skip antes do claim.** T-42-26 exige
trilha para toda tentativa, e o trigger dispara uma única vez (`NULL → NOT NULL`), então
não há 2º dispatch que um `falhou` pudesse bloquear.

**11. Desvio de Wave 0 (instruído pelo próprio plano):** `42-VALIDATION.md` lista
`notificar-rh/__tests__/notificar-rh.test.ts` como item de Wave 0. Um teste Deno que
importa módulo inexistente **reprova o job `deno-test` bloqueante do CI** para todos os
planos paralelos, então o arquivo foi autorado aqui — ainda assim RED-antes-de-GREEN
dentro do plano, com os dois outputs colados acima.

**12. 10 casos de handler além do escopo literal da Task 1.** O plano deixa o `401` sem
Bearer e o `400 VALIDATION` como asserções **do checkpoint ao vivo**. Como as deps já são
injetáveis, prová-los em CI é de graça e sobrevive ao checkpoint. Cobre T-42-25, T-42-04
(o gate de vocabulário de papel pelos dois lados) e T-42-26.

---

**Total deviations:** 7 auto-fixed (3 blocking, 4 missing-critical) + 5 decisões registradas
**Impact on plan:** O desvio nº 1 é a diferença entre um plano que funciona e um que
entrega um no-op silencioso — e só apareceu porque a forma viva da tabela foi lida em vez
de presumida da lista de sítios do plano. Nenhum scope creep: zero pacote novo, zero
arquivo fora de `files_modified` exceto a renumeração da migration.

## Issues Encountered

- **`/rh/revisoes` ainda não existe.** O link do e-mail aponta para a rota que os planos
  **42-09** (página) e **42-10** (sidebar) constroem. Registrado em "Known Stubs".
- **Não há padrão de URL de app em nenhuma EF do projeto** — nenhuma delas monta link para
  o frontend. Resolvido introduzindo `APP_BASE_URL_PADRAO` + `montarUrlFila` no módulo puro,
  com validação, em vez de um literal solto no `index.ts`.

## Known Stubs

| Stub | Arquivo | Motivo / quem resolve |
|------|---------|-----------------------|
| Link do e-mail aponta para rota inexistente | `supabase/functions/notificar-rh/helpers.ts` (`montarUrlFila` → `/rh/revisoes`) | A rota é construída pelo plano **42-09**; o item de sidebar pelo **42-10**. Intencional: o e-mail é um nudge para a superfície durável, e a superfície chega depois na ordem de waves da fase. **Consequência se o trigger for aplicado antes da 42-09: e-mail com link 404.** Decisão de sequenciamento do orquestrador. |

## Risco de envio real (contradiz o texto do checkpoint)

A 42-06 mediu `modo='producao'` no ledger e envio ao endereço real —
`NOTIFICACOES_MODO` foi flipado em PROD. O passo 6 do checkpoint assume modo `teste`.

- **O plano afirma que `NOTIFICACOES_MODO` é env por Edge Function.** Se for de **projeto**
  (o comportamento usual de `supabase secrets set`), a EF `notificar-rh` nasce em
  `producao` e o smoke envia **e-mail real aos 4 administradores + 1 recrutador reais**.
- O fail-safe protege o caso oposto: **ausência** da env resolve para `teste`, e aí
  `resolverDestinatarioComLabel` desvia para `delivered+revisao_solicitada_rh@resend.dev` e
  `exigirSinkTeste` aborta qualquer destinatário fora de `@resend.dev`. Nenhum guard
  non-prod foi enfraquecido.
- **Recomendação:** antes do passo 6, ler o valor efetivo de `NOTIFICACOES_MODO` **na
  função nova** e registrá-lo. Se for `producao`, ou fixá-la em `teste` só para o smoke, ou
  aceitar consciente que o smoke manda e-mail interno de verdade (o que é benigno — são
  endereços internos e o conteúdo não tem PII de candidato — mas tem de ser escolha, não
  surpresa).

## Threat Flags

| Flag | Arquivo | Descrição |
|------|---------|-----------|
| threat_flag: information_disclosure | `supabase/migrations/20260730000003_…sql` | Superfície **pré-existente** descoberta, não criada: `varrer_retry_notificacoes` é `SECURITY DEFINER` invocável que dispara e-mail e tinha apenas `REVOKE … FROM PUBLIC` desde a P41 — logo `anon` provavelmente retém EXECUTE em PROD. Mitigado nesta migration (revoke nominal de `anon` e `authenticated`); **confirmar no `proacl` vivo durante o checkpoint** |
| threat_flag: new_network_endpoint | `supabase/functions/notificar-rh/index.ts` | Edge Function nova, no threat model como T-42-25 (self-auth Bearer). Sem `--no-verify-jwt` o deploy não seria alcançável pelo trigger — confirmar a flag de deploy |

## User Setup Required

Nenhuma configuração de serviço externo nova. **Mas o deploy da EF exige atenção a duas
envs:** `NOTIFICACOES_MODO` (ver "Risco de envio real") e, opcionalmente, `APP_BASE_URL`
(ausente ⇒ default `https://recruta.beautysmile.com.br`, que é o host vivo).

## Next Phase Readiness

**Bloqueia:**
- **42-08 tem de renumerar** sua migration para `20260730000004` e **reescrever as
  asserções (a) e (b) do seu smoke**: com o BLOCO A deste plano o CHECK vivo passa a ter 5
  valores, e depois da 42-08 terá 6 — o smoke daquele plano espera 5 aceitos e um 6º
  recusado. Vai reprovar como está escrito.

**Pronto, condicionado ao checkpoint:**
- `notificar-candidato` intacto (escopo negativo respeitado). O 5º evento é da 42-08.
- Zero UI tocada. `npm run -s lint` em **97 = baseline 97**; `.husky/pre-commit` exit 0 nos
  dois commits, **sem `--no-verify`**.
- A fixture de PROD `a802bc05-…` (`origem_candidatura='p42-06-smoke-slot'`) **não foi
  tocada** — o smoke da 42-06 segue re-executável.

## Self-Check: PASSED

Arquivos criados/modificados verificados em disco (6/6) e commits verificados em
`git log --oneline --all`: `265aa0e` FOUND, `f240a16` FOUND.

---
*Phase: 42-invent-rio-gates-fila-art-20*
*Completed: 2026-07-30*
