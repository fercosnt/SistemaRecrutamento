---
phase: 42-invent-rio-gates-fila-art-20
plan: 08
subsystem: api
tags: [edge-function, deno, resend, pg_net, trigger, ledger, vocabulario, lgpd, art20, email, preheader]

requires:
  - phase: 42-01
    provides: "`EVENTOS_VALIDOS` derivado de `EVENTO_MAP` + `vocabulario-eventos.test.ts` + bloco de não-regressão dos 4 eventos vivos"
  - phase: 42-06
    provides: "`responder_revisao_decisao` grava `revisao_veredito` + `revisao_respondida_em`; guard 4 recusa 2ª resposta"
  - phase: 42-07
    provides: "CHECK do ledger já em 5 valores (`revisao_solicitada` vivo em PROD); migration `20260730000003` consumida"
provides:
  - "5º evento do pipeline de comunicação em CÓDIGO: `EventoLedger`/`EVENTO_MAP`/`EventoNotificacao`/`SUBJECTS`/`CORPOS`/`PREHEADERS` + `corpoRevisaoRespondida` (309/309 no corpus Deno)"
  - "`DadosEmail.vereditoRevisao` opcional + a leitura de `decisao_final.revisao_veredito` na EF — a ramificação do corpo é ALCANÇÁVEL em produção, não só testável"
  - "`supabase/tests/p42_notif_revisao_smoke.sql` — espec RED de 4 asserções (NÃO executada)"
  - "`supabase/migrations/20260730000004_p42_evento_revisao_respondida.sql` — CHECK de 6 valores + `trg_notif_revisao_respondida` (APLICADA em PROD 2026-07-31, md5 byte-idêntico)"
  - "Decisão registrada e pinada: a prévia de caixa de entrada do 5º evento NÃO ramifica por veredito"
affects: [42-12]

tech-stack:
  added: []
  patterns:
    - "Um `Record<UniãoDeVocabulário, …>` é um sítio de registro forçado pelo compilador MESMO QUANDO VIVE NO CORPUS DE TESTE — a tabela de sítios do plano contava 4 e o compilador apontou 5"
    - "Template ramificado sem o dado que o ramifica é código morto: o teste prova uma ramificação que nenhum e-mail real alcança (mesma assimetria tested-vs-entregue do W-01)"
    - "Prova de CHECK por INSERÇÃO + rollback de subtransação, não por leitura de `pg_get_constraintdef`: a definição conta o que a constraint DIZ, o INSERT conta o que o banco FAZ"
    - "Asserção negativa é o que distingue 'aceita os N' de 'aceita qualquer coisa' — sem o 7º evento recusado, um CHECK dropado passaria em verde"
    - "Evento do ledger nunca leva o dado no payload quando a EF pode lê-lo com privilégio próprio: dois registros da mesma verdade divergem"

key-files:
  created:
    - supabase/tests/p42_notif_revisao_smoke.sql
    - supabase/migrations/20260730000004_p42_evento_revisao_respondida.sql
  modified:
    - supabase/functions/notificar-candidato/helpers.ts
    - supabase/functions/notificar-candidato/index.ts
    - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
    - supabase/functions/_shared/email-config.ts
    - supabase/functions/_shared/email-templates.ts
    - supabase/functions/_shared/__tests__/email-templates.test.ts

key-decisions:
  - "A PRÉVIA de caixa de entrada do 5º evento NÃO ramifica por veredito (questão aberta nº3 da pesquisa, resolvida). O assunto já nomeia a resposta; ramificar a prévia entregaria o desfecho do Art. 20 numa linha de listagem, antes de a pessoa abrir. Escrita como comentário no `PREHEADERS` E pinada por igualdade LITERAL (T-42-V2c)"
  - "O ASSUNTO também não ramifica — pela mesma razão, e é a diferença deliberada em relação a `decisao_final`, onde ramificar é correto porque lá o assunto já ramifica"
  - "A EF passou a LER `decisao_final.revisao_veredito` (desvio Rule 2). Sem isso o corpo cairia sempre no caminho neutro e as duas frases de veredito seriam código morto: os testes provariam uma ramificação que nenhum e-mail real alcança"
  - "O VEREDITO NÃO viaja no payload do trigger (ids-only, 2 chaves). Enviá-lo criaria um segundo registro da mesma verdade que poderia divergir da coluna — a classe de duplicação que o D-P42-14 existe para impedir"
  - "`montarDedupeKey` NÃO ganhou ramo novo, e isso foi VERIFICADO por leitura, não presumido: `decisao_final.candidatura_id` é UNIQUE + o guard 4 do RPC (42-06) recusa 2ª resposta ⇒ não existe segundo e-mail legítimo que a chave pudesse bloquear"
  - "O CHECK preserva `revisao_solicitada` e o bloco `DO` auto-verificador ABORTA o apply se esse valor sumir — o REVISAO-01 está vivo em PROD e um DROP/ADD descuidado o quebraria"
  - "O corpo do e-mail não promete próximos passos, não identifica quem revisou e não interpola a justificativa da revisão — três silêncios com razão registrada, não omissões"

patterns-established:
  - "Rodar o type-check entre um sítio de vocabulário e o seguinte, em vez de editar todos de uma vez: a sequência de erros é a EVIDÊNCIA de que os `Record<>` são gate real, e foi ela que revelou o 5º sítio que o plano não listava"
  - "Quando um plano lista os arquivos a tocar, o conjunto é uma HIPÓTESE sobre onde o dado vive — conferir se o dado chega até o template, não só se o template existe"

requirements-completed: [REVISAO-04]
requirements-pending-checkpoint: []

checkpoint_pendente: false
checkpoint_concluido: 2026-07-31
checkpoint_task: 3

coverage:
  - id: D1
    description: "O 5º evento existe em todos os sítios de vocabulário em CÓDIGO, e os 4 vivos estão provados intactos — inclusive a metade invisível (preheader) que produziu o W-01"
    requirement: "REVISAO-04"
    verification:
      - kind: unit
        ref: "supabase/functions/_shared/__tests__/email-templates.test.ts — 6 casos T-42-V2a..f; `vocabulario-eventos.test.ts` passa SEM modificação (git diff vazio); bloco T-42-V1 dos 4 eventos intocado"
        status: pass
    human_judgment: false
  - id: D2
    description: "A decisão de NÃO ramificar a prévia por veredito está escrita no código e pinada por igualdade literal entre `mantida` e `revertida`"
    requirement: "REVISAO-04"
    verification:
      - kind: unit
        ref: "T-42-V2c — `assertEquals` sobre a string COMPLETA extraída do `<span display:none>`, não `includes`"
        status: pass
    human_judgment: false
  - id: D3
    description: "A ramificação do corpo é ALCANÇÁVEL em produção: o handler lê `decisao_final.revisao_veredito` e o entrega ao template; ausência ⇒ corpo neutro que não afirma desfecho"
    requirement: "REVISAO-04"
    verification:
      - kind: unit
        ref: "notificar-candidato.test.ts — 2 casos de handler com deps mockadas: veredito vivo chega ao corpo entregue (os dois valores, com asserção negativa da frase do outro) + fallback neutro sem linha de decisao_final"
        status: pass
    human_judgment: false
  - id: D4
    description: "CHECK de 6 valores + `trg_notif_revisao_respondida`, aplicados em PROD, com o round-trip provado ao vivo e a asserção negativa de despachante único"
    requirement: "REVISAO-04"
    verification: []
    human_judgment: true
    rationale: "Apply de migration, deploy de Edge Function e smoke em PROD exigem os tools MCP do Supabase, que subagentes GSD não recebem (anthropics/claude-code#13898). `supabase db push` é proibido neste projeto e o CLI não está autenticado. É o checkpoint da Task 3, do orquestrador"

duration: ~50min
completed: 2026-07-31
status: complete
---

# Phase 42 / Plan 42-08: o 5º evento do pipeline — a revisão respondida chega ao candidato — Summary

**O 5º evento existe em todos os sítios do vocabulário em código, com a prévia de caixa de entrada DECIDIDA e pinada em vez de omitida (a classe exata do W-01), e o corpus Deno fecha 309/309 com o teste de paridade e a não-regressão dos 4 eventos vivos intocados. O plano listava 4 sítios forçados pelo compilador; o compilador apontou 5. E o plano teria entregue uma ramificação de corpo que nenhum e-mail real alcançaria — a EF não lia o veredito de lugar nenhum. Nada foi deployado nem aplicado.**

## ⛔ CHECKPOINT PENDENTE — Task 3 devolvida ao orquestrador

Ler a seção **"O que o orquestrador tem de rodar"** no fim deste arquivo **antes** de
aplicar qualquer coisa: três achados mudam os passos em relação ao texto do plano.

## Performance

- **Duração:** ~50 min
- **Tasks:** 2 de 3 (a 3ª é o checkpoint, devolvida sem commit)
- **Arquivos criados/modificados:** 8
- **Corpus Deno:** 301 → **309** (0 falhas)
- **tsc:** 97 = baseline congelado 97 · `.husky/pre-commit` exit 0 nos três commits, **sem `--no-verify`**

## Task Commits

1. **RED do 5º evento** — `fe154fc` (test) — 6 casos escritos contra um vocabulário que ainda não existia
2. **Task 1: os sítios em código + o corpo do e-mail** — `5281b2f` (feat, GREEN)
3. **Task 2: smoke RED + migration do CHECK e do trigger** — `9ed8834` (feat)
4. **Task 3: CHECKPOINT** — devolvida ao orquestrador, sem commit

### A sequência de erros de compilação, sítio a sítio (exigida pelos critérios de aceitação)

Esta é a evidência de que os `Record<>` são gate REAL e não teoria. Cada passo abaixo é um
`deno check` rodado entre um sítio e o seguinte, com o compilador apontando o próximo:

```
1) EventoLedger += "revisao_respondida"
   TS2741: Property 'revisao_respondida' is missing in type '{ confirmacao: …; avanco: …;
   convite: …; decisao: … }' but required in type 'Record<EventoLedger, EventoNotificacao>'
     at helpers.ts:32:14   (EVENTO_MAP)

2) EVENTO_MAP += revisao_respondida: "revisao_respondida"
   TS2322: Type '"revisao_respondida"' is not assignable to type 'EventoNotificacao'
     at helpers.ts:40:3

3) EventoNotificacao += 'revisao_respondida'
   TS2741 ×3 — os TRÊS Record<EventoNotificacao, …> de template, de uma vez:
     at email-templates.ts:161:14  (SUBJECTS)
     at email-templates.ts:171:7   (CORPOS)
     at email-templates.ts:188:7   (PREHEADERS)
   Found 3 errors.

4) SUBJECTS + CORPOS + PREHEADERS preenchidos
   TS2741: Property 'revisao_respondida' is missing … in type 'Record<EventoLedger, string>'
     at notificar-candidato/__tests__/notificar-candidato.test.ts:37:9
   ← O 5º SÍTIO FORÇADO PELO COMPILADOR. O plano contava quatro.

5) espelho do mapa no teste atualizado
   ok | 309 passed | 0 failed
```

**`EVENTOS_VALIDOS` nunca apareceu nesta lista** — e essa ausência é o resultado do plano
42-01. Ele deixou de ser um sítio no momento em que passou a ser derivado de
`Object.keys(EVENTO_MAP)`. O sítio que historicamente causou o dano mais caro do sistema
(um `400 VALIDATION` sobre um dispatch at-most-once) registrou-se sozinho, e o teste de
paridade `T-42-V3a` confirmou por execução, sem uma linha alterada.

## Accomplishments

- **A decisão sobre a prévia está escrita, não omitida.** O `PREHEADERS` do 5º evento
  devolve a **mesma string** para `mantida` e `revertida`, com um comentário que registra
  por que — o preheader aparece na LISTA de e-mails, possivelmente numa tela de bloqueio,
  antes de a pessoa abrir a mensagem; antecipar ali o desfecho de uma revisão do Art. 20 é
  escolha de produto que esta fase não toma. `T-42-V2c` exige **igualdade literal** (não
  `includes`, que prova presença e não igualdade — a fraqueza exata que deixou o W-01
  passar). Um futuro que queira ramificar terá de alterar aquele teste de propósito.
- **O assunto também não ramifica, e isso é deliberado — não simetria preguiçosa.** Em
  `decisao_final`, ramificar a prévia é CORRETO, porque lá o assunto já ramifica e uma
  prévia morna ao lado de "Boa notícia…" é dissonante. Aqui o assunto nomeia o que chegou
  ("Resposta à sua solicitação de revisão"), não o que a resposta diz. As duas decisões
  convivem no mesmo arquivo com as duas razões escritas lado a lado.
- **Os 4 eventos vivos estão provados intactos, incluindo a metade invisível.** O bloco
  T-42-V1 (que pina o par assunto+prévia dos 4) e `vocabulario-eventos.test.ts` passam
  **sem uma linha alterada** — `git diff` vazio no segundo. O diff de
  `email-templates.test.ts` é **só adições**.
- **`montarDedupeKey` não ganhou ramo, e a ausência foi verificada.** O ramo `default`
  produz `{candidatura_id}:revisao_respondida`, e essa chave é correta porque
  `decisao_final.candidatura_id` é UNIQUE (`20260607000003:39`) **e** o guard 4 do RPC da
  42-06 recusa uma segunda resposta com 22023. As duas decisões juntas fecham a questão
  aberta nº1: a chave nunca bloqueia um e-mail legítimo porque não existe segundo e-mail
  legítimo. O porquê está no docblock; o `git diff` do corpo da função é vazio.
- **O smoke prova o CHECK por INSERÇÃO, não por leitura.** Uma linha por evento, cada uma
  dentro de uma subtransação sempre revertida (`RAISE EXCEPTION` com SQLSTATE próprio,
  capturado logo acima). `pg_get_constraintdef` conta o que a constraint **diz**; o INSERT
  conta o que o banco **faz**, e é o segundo que decide se um e-mail sai.
- **A migration não pode quebrar o REVISAO-01 em silêncio.** O CHECK preserva
  `revisao_solicitada`, e o bloco `DO` auto-verificador **aborta o apply** se esse valor
  sumir da definição viva — além de abortar se sobrar mais de um CHECK sobre `evento`.

## Files Created/Modified

- `supabase/functions/notificar-candidato/helpers.ts` — `EventoLedger` += o 5º valor,
  `EVENTO_MAP` += o par, e o docblock de `montarDedupeKey` registrando por que não há ramo
  novo. **33 adições, 2 deleções** (as 2 são a quebra do `export type` numa lista).
- `supabase/functions/_shared/email-config.ts` — `EventoNotificacao` += `revisao_respondida`,
  com o aviso de não usar aquela união como vocabulário de rótulo de sink (o caminho que a
  42-07 abriu com `resolverDestinatarioComLabel`).
- `supabase/functions/_shared/email-templates.ts` — `DadosEmail.vereditoRevisao?`,
  `corpoRevisaoRespondida`, e as três entradas de template. **75 adições, 0 deleções.**
- `supabase/functions/notificar-candidato/index.ts` — passo 3b: lê
  `decisao_final.revisao_veredito` **só** para este evento (desvio nº1 abaixo).
- `supabase/functions/_shared/__tests__/email-templates.test.ts` — 6 casos T-42-V2a..f.
  **127 adições, 0 deleções.**
- `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts` — o espelho
  do mapa (5º sítio forçado pelo compilador) + 2 casos de handler que pinam a LIGAÇÃO
  veredito → corpo entregue. **83 adições, 1 deleção** (o título do teste do mapa).
- `supabase/tests/p42_notif_revisao_smoke.sql` — 4 asserções + teardown asserido.
- `supabase/migrations/20260730000004_p42_evento_revisao_respondida.sql` — BLOCO A (CHECK de
  6 valores + `DO` auto-verificador + `COMMENT ON CONSTRAINT`), BLOCO B (função + trigger).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] A EF não lia o veredito de lugar nenhum — a ramificação do corpo seria código morto**

- **Found during:** Task 1, ao conferir de onde `DadosEmail.vereditoRevisao` viria em produção.
- **Issue:** O plano lista `files_modified` sem `notificar-candidato/index.ts`, e o caminho
  genérico da EF de fato funciona ponta a ponta para o 5º evento — `EVENTOS_VALIDOS`
  derivado aceita, `EVENTO_MAP` mapeia, `montarDedupeKey` produz a chave certa, o claim
  entra no ledger. **Exceto que ninguém preenche `vereditoRevisao`.** O corpo cairia
  SEMPRE no caminho neutro, e as duas frases de veredito — alinhadas à UI-SPEC e pinadas
  por `T-42-V2b`/`T-42-V2c` — seriam código morto em produção. Os testes provariam uma
  ramificação que nenhum e-mail real alcança: a MESMA assimetria entre o que é testado e
  o que é entregue que produziu o W-01, só que do outro lado.
- **Fix:** passo 3b no `index.ts`, **guardado por `evento === "revisao_respondida"`** — os
  4 eventos vivos não ganham uma consulta sequer, e o escopo negativo do plano fica
  respeitado. Allowlist de UMA coluna: `revisao_resultado` (a justificativa escrita pelo
  revisor) **não** é lida, porque o corpo não a usa e ler PII que não se vai usar é
  superfície gratuita. Valor ausente ou fora do vocabulário ⇒ `undefined` ⇒ frase neutra:
  afirmar um desfecho que o servidor não confirmou seria pior que não afirmar nenhum.
- **Files modified:** `supabase/functions/notificar-candidato/index.ts`
- **Verification:** 2 casos de handler novos com deps mockadas — o veredito vivo chega ao
  corpo ENTREGUE (nos dois valores, com asserção negativa da frase do outro veredito, e
  conferindo `dedupe_key`/`evento`/`template` do claim), e o fallback neutro sem linha de
  `decisao_final` ainda envia sem afirmar desfecho.
- **Committed in:** `5281b2f`

**2. [Rule 3 - Blocking] Existe um 5º sítio forçado pelo compilador, e ele vive no corpus de teste**

- **Found during:** Task 1, passo 4 da sequência de `deno check`.
- **Issue:** A tabela do §Pattern 1 da pesquisa conta 4 sítios forçados pelo compilador (os
  três `Record<EventoNotificacao, …>` de template mais o `EVENTO_MAP`). Há um quinto:
  `notificar-candidato.test.ts:37` declara `const esperado: Record<EventoLedger, string>` —
  um espelho do mapa escrito à mão. Ele **reprova o job `deno-test` bloqueante do CI** até
  ser estendido, então não é opcional.
- **Fix:** entrada acrescentada ao espelho, título do teste corrigido de "os 4" para "os 5",
  e um comentário registrando que este literal É um sítio do vocabulário — para que o
  próximo plano que adicione um evento não descubra isso de novo pelo mesmo caminho.
- **Files modified:** `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts`
- **Verification:** `deno test` do corpus inteiro, 309/309.
- **Committed in:** `5281b2f`

### Diretivas do orquestrador já incorporadas (não são desvios do executor)

**3. Migration renumerada para `20260730000004`.** O prefixo `…0003` foi consumido pela
42-07 (que por sua vez teve de renumerar por causa da 42-06). Registrado no `Next Phase
Readiness` daquele plano e já refletido no arquivo de plano desta rodada.

**4. O CHECK vai de 5 para 6, não de 4 para 5.** O checkpoint da 42-07 aplicou
`20260730000003` e o CHECK vivo passou a ter 5 valores. As asserções (a) e (b) do smoke
foram escritas contra **6 aceitos / um 7º recusado**, e o `ADD CONSTRAINT` **preserva
`revisao_solicitada`**. Há 2 linhas vivas no ledger com esse evento (mantidas de propósito
como evidência do smoke da 42-07), então um `ADD` que o omitisse falharia alto — mas o
bloco `DO` auto-verificador existe para não depender dessa sorte.

## Issues Encountered

- **`REQUIREMENTS.md` já marca REVISAO-04 como `Complete`.** O plano 42-11 entregou a
  metade da EXIBIÇÃO (o candidato vê o resultado no painel) e marcou o requirement. A
  metade do E-MAIL — este plano — **não está viva** até o checkpoint da Task 3. O
  requirement está listado aqui em `requirements-pending-checkpoint`, e o marcador de
  `REQUIREMENTS.md` **não** foi tocado por este plano (nada a marcar, já está marcado).
  Registrado como imprecisão conhecida, não como conclusão: hoje `REQUIREMENTS.md` afirma
  mais do que o sistema faz.
- **`.planning/STATE.md` chegou a esta execução com `Plan: 1 of 12` e `completed_plans: 9`.**
  A inicialização do orquestrador reescreveu a Current Position ("Phase 42 execution
  started"), regredindo o texto que a 42-11 havia deixado (`Plan: 9 of 12`). Corrigido na
  atualização de estado deste plano em vez de simplesmente incrementado — incrementar a
  partir de um valor errado propagaria o erro.

## Known Stubs

| Stub | Arquivo | Motivo / quem resolve |
|------|---------|-----------------------|
| O 5º evento não é despachado por ninguém | `supabase/migrations/20260730000004_…sql` | O trigger existe **em arquivo**, não em PROD. Até o checkpoint da Task 3, responder uma revisão grava o veredito e não avisa o candidato — o comportamento de hoje, inalterado. |
| `corpoRevisaoRespondida` ramifica, mas nada em PROD alcança os ramos | `supabase/functions/_shared/email-templates.ts` | A EF com a leitura do veredito só passa a valer **após o deploy** do passo 2 do checkpoint. Antes disso o código novo não está em produção de forma alguma. |

## Threat Flags

| Flag | Arquivo | Descrição |
|------|---------|-----------|
| threat_flag: schema_change | `supabase/migrations/20260730000004_…sql` | `DROP`/`ADD` de CHECK sobre tabela com dado vivo, na fronteira de confiança código⟷banco. Mitigado por: preservação explícita de `revisao_solicitada`, bloco `DO` que aborta se o valor sumir ou se sobrar mais de um CHECK sobre `evento`, e leitura obrigatória do `pg_get_constraintdef` vivo ANTES do apply (T-42-28) |
| threat_flag: new_data_read | `supabase/functions/notificar-candidato/index.ts` | Leitura nova de `decisao_final` pela EF (service-role). Allowlist de UMA coluna (`revisao_veredito`), guardada por evento; `revisao_resultado` — o texto livre do revisor — deliberadamente **não** é lido |

---

# O que o orquestrador tem de rodar (Task 3 — CHECKPOINT bloqueante)

Subagentes GSD não recebem os tools MCP do Supabase (anthropics/claude-code#13898),
`supabase db push` é proibido neste projeto e o CLI não está autenticado. Nada abaixo foi
executado.

**A ORDEM É O CONTROLE.** Uma EF que aceita um evento que ninguém envia é inerte; um
trigger que envia um evento que a EF rejeita perde a notificação em silêncio, porque
`net.http_post` é at-most-once.

### 1. Ler a constraint viva ANTES de qualquer coisa

```sql
SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint WHERE conname = 'notificacoes_enviadas_evento_check';
```

Esperado após a 42-07: 5 valores, terminando em `'revisao_solicitada'::text`. Se houver
**qualquer cláusula além da lista de eventos**, PARE — o `ADD CONSTRAINT` da migration tem
de preservá-la. Transcrever o resultado nas linhas `>>> antes:` / `>>> depois:` do cabeçalho
da migration (mitigação da suposição A1 da pesquisa, T-42-28).

### 2. Deploy da EF `notificar-candidato`

A STATE.md registra a função viva em **v5** (após o fix do W-01); esta entrega a leva para a
próxima. Retransmitir as **quatro** dependências e **conferir de volta com
`get_edge_function`**, como a 42-07 fez:

- `notificar-candidato/index.ts` (mudou — o passo 3b)
- `notificar-candidato/helpers.ts` (mudou)
- `_shared/email-config.ts` (mudou)
- `_shared/email-templates.ts` (mudou)

> Consequência benigna, registrada para não assustar: a EF `notificar-rh` (deployada na
> 42-07) fica com uma cópia mais antiga de `_shared/email-config.ts`. A diferença é a união
> `EventoNotificacao`, que é **type-only** e some em runtime — nada muda para ela.

### 3. Smoke da EF ANTES do CHECK

`POST` com Bearer do Vault, corpo `{"evento":"revisao_respondida","candidatura_id":"<uuid inexistente>"}`.

- **Esperado: `200` com `skipped: "dados_ausentes"`** — prova que o evento passou pela
  validação de vocabulário. O passo 3b **não** é alcançado neste caminho (a EF sai antes,
  na candidatura ausente), então este smoke continua válido exatamente como o plano o
  descreve.
- **Um `400 VALIDATION` aqui significa que o deploy não pegou o código novo.** Pare.

### 4. Só então aplicar a migration

`apply_migration` com nome `p42_evento_revisao_respondida`. Depois:

- **Reparar a `version` do ledger para `20260730000004`** — `apply_migration` carimba a
  própria (um timestamp do momento do apply), medido no checkpoint da 42-07.
- **Provar a fidelidade por md5**, não presumir:
  ```sql
  SELECT version, md5(statements[1]) FROM supabase_migrations.schema_migrations
   ORDER BY version DESC LIMIT 3;
  ```
  comparado com `md5 -q supabase/migrations/20260730000004_p42_evento_revisao_respondida.sql`.
  Foi assim que a 42-07 provou byte-a-byte que a retransmissão não perdeu comentário —
  a classe de drift de `.planning/todos/pending/processo-origem-do-drift-desconhecida.md`.
- O `NOTICE` `P42-08 BLOCO A OK: …` tem de aparecer; se vier `EXCEPTION`, leia a mensagem
  antes de qualquer outra coisa.

### 5. Rodar `supabase/tests/p42_notif_revisao_smoke.sql` numa ÚNICA chamada `execute_sql`

Esperado **4/4 PASS** + o `TEARDOWN ok`. Colar o output inteiro. A chamada única é
obrigatória: `set_config(..., false)` é escopado à sessão.

### 6. ⚠ Round-trip ao vivo — LEIA ANTES: o modo é `producao` e o e-mail é REAL

O plano diz "em modo `teste`". **`NOTIFICACOES_MODO` é `producao` em PROD e é secret de
PROJETO, não por função** — confirmado por medição no checkpoint da 42-07. Consequências:

- O e-mail deste smoke **vai para o endereço real do candidato da fixture**.
- A fixture natural (`candidato.funil@teste.com`, usada pelo smoke do 42-03/42-06) é um
  endereço **sintético e indeliverável** — enviar para ele produz **hard bounce** numa conta
  Resend de free-tier, exatamente o problema que levou o operador a desativar 3 contas de RH
  no checkpoint anterior.

**Escolha do operador, não do executor** — as três saídas, com o custo de cada uma:

| Opção | O que fazer | Custo |
|-------|-------------|-------|
| **A (recomendada)** | Usar uma candidatura cujo `candidatos.email` seja um endereço REAL e interno (o do operador). O e-mail chega numa caixa inspecionável. | Precisa existir/criar tal candidatura; teardown normal |
| **B** | Flipar `NOTIFICACOES_MODO=teste` só durante o smoke, e voltar. | É secret de **projeto**: durante a janela, TODO e-mail de candidato do funil é desviado para o sink `@resend.dev`. Janela curta, mas real |
| **C** | Aceitar o hard bounce em `@teste.com`. | Prejudica a reputação de remetente da conta Resend. **Não recomendada** |

Com a escolha feita, o round-trip:

1. Criar a fixture de `decisao_final` com `revisao_solicitada_em` preenchido (idioma da
   fixture de `p42_revisao_art20_smoke.sql`).
2. Chamar `responder_revisao_decisao` impersonando um RH que **não** seja o decisor, com
   veredito `mantida` **ou** `revertida` — anote qual, porque o corpo entregue tem de
   trazer a frase correspondente:
   - `mantida` → "Após a revisão, a decisão foi mantida."
   - `revertida` → "Após a revisão, a decisão anterior foi revista."
3. Verificar:
   - (a) a linha foi gravada (`revisao_veredito`, `revisao_por_usuario`, `revisao_respondida_em`);
   - (b) `notificacoes_enviadas` ganhou **exatamente uma** linha com
     `evento='revisao_respondida'` e `dedupe_key = '<candidatura_id>:revisao_respondida'`;
   - (c) `modo` e `destinatario_original` (que preserva o e-mail real do candidato mesmo
     quando há desvio);
   - (d) **o corpo INTEIRO do e-mail**, não só o texto visível. O assunto tem de ser
     `Resposta à sua solicitação de revisão — <vaga>` e a prévia
     `Sua solicitação de revisão foi respondida.` — **a prévia é `<span display:none>`, e
     foi exatamente aí que o W-01 se escondeu.** A prévia é a MESMA nos dois vereditos,
     por decisão registrada: se ela vier diferente, é regressão.
4. **Asserção negativa de idempotência:** um 2º `UPDATE` reescrevendo o mesmo timestamp
   **não** pode produzir 2ª linha de ledger (o guard `NULL -> NOT NULL`).
5. Teardown: remover a fixture (`decisao_final` + `decisao_final_historico`), decidindo se
   mantém a linha de ledger como evidência (a 42-07 manteve).

### 7. Asserção negativa de despachante único

```sql
SELECT count(*) FROM net._http_response WHERE created > now() - interval '2 minutes';
```

Confirmar que a chamada ao RPC produziu **uma** requisição, não duas. Duas significariam um
segundo despachante — e o próximo sintoma seria e-mail duplo ou uma colisão de `dedupe_key`
em que a segunda linha some em `ON CONFLICT DO NOTHING`, sem erro.

### 8. Colar no `42-VERIFICATION.md`

O `pg_get_constraintdef` antes e depois, o resultado do passo 3, o smoke 4/4, o conteúdo
inspecionado do e-mail (assunto + **prévia** + corpo) e a asserção negativa do passo 7.

### Se algo falhar

- `400 VALIDATION` no passo 3 → o deploy não pegou o código novo; **não aplique a migration**.
- `EXCEPTION` no BLOCO A → leia a mensagem: se disser `PERDEU revisao_solicitada`, o CHECK
  vivo divergia do esperado e o REVISAO-01 está em risco.
- `P42N FAIL (a)` no smoke → o CHECK não aceita algum dos 6; a mensagem nomeia qual.
- `P42N FAIL (b)` → o CHECK sumiu ou perdeu a lista de valores (aceita qualquer string).
- `P42N FAIL (d)` → o apply derrubou o trigger da 42-07; o REVISAO-01 parou.

## Self-Check: PASSED

Arquivos criados/modificados verificados em disco (8/8). Commits verificados em
`git log --oneline --all`: `fe154fc` FOUND, `5281b2f` FOUND, `9ed8834` FOUND.
`deno test` 309/309 · `npm run -s lint` 97 = baseline 97 · `.husky/pre-commit` exit 0.

---
*Phase: 42-invent-rio-gates-fila-art-20*
*Completed (código): 2026-07-31 — checkpoint de PROD pendente*

---

# ✅ CHECKPOINT CONCLUÍDO — Task 3 executada pelo orquestrador em 2026-07-31

REVISAO-04 está **entregue por inteiro**. A metade da exibição já vivia (42-11); a metade
do e-mail passou a viver agora. O `REQUIREMENTS.md`, que a Task 2 apontou como afirmando
mais do que o sistema fazia, **voltou a ser verdadeiro** — sem que o marcador precisasse
ser tocado.

## Os 8 passos, na ordem, com o que cada um mediu

**1. Constraint viva ANTES de tudo.** `CHECK ((evento = ANY (ARRAY['confirmacao'::text,
'avanco'::text, 'convite'::text, 'decisao'::text, 'revisao_solicitada'::text])))` — 5
valores, **nenhuma cláusula além da lista**, exatamente o estado esperado após a 42-07.
Nada a preservar além dos valores ⇒ apply liberado. Transcrito nas linhas `>>> antes:` /
`>>> depois:` do cabeçalho da migration **antes** do apply, e o `depois` foi depois
conferido contra `pg_get_constraintdef` — bate literalmente.

**2. Deploy da EF `notificar-candidato` → v7** (`verify_jwt=false`, preservado).
**⚠ A lista de dependências do SUMMARY estava incompleta: são CINCO arquivos, não quatro.**
`index.ts` também importa `../_shared/ics.ts` (`gerarIcsAgendamento` + `icsParaBase64`).
Deployar as quatro listadas teria quebrado o evento `convite`, que é **vivo em produção** —
um erro de módulo em runtime no anexo `.ics`. As cinco foram enviadas.

**3. Smoke da EF ANTES do CHECK** — `POST` ids-only com Bearer do Vault (despachado por
`net.http_post` para o segredo nunca transitar em linha de comando), `candidatura_id`
inexistente:

```
200  {"ok":true,"skipped":"dados_ausentes"}
```

**Não** foi `400 VALIDATION` ⇒ a EF deployada já aceita `revisao_respondida` no
vocabulário, e o trigger podia nascer sem risco de nudge perdido.

**4. Apply da migration + as duas propriedades do `apply_migration`.**
`NOTICE P42-08 BLOCO A OK` (o apply não abortou ⇒ as três checagens do bloco `DO` passaram,
incluindo a que aborta se `revisao_solicitada` tivesse sumido). Ledger reparado de volta
para `20260730000004`. **Fidelidade provada, não presumida:**

```
md5(statements[1]) = 9ad3c1ecb3861ccbc0679feb39aa1ef3
md5 do arquivo     = 9ad3c1ecb3861ccbc0679feb39aa1ef3   ✓ byte-a-byte
```

**5. Smoke `p42_notif_revisao_smoke.sql`** — chamada ÚNICA, `smoke42n.pass = 4`.
Gate VERDE: (a) os 6 eventos aceitos por inserção real, (b) o 7º inventado rejeitado com
23514, (c) `trg_notif_revisao_respondida` é `AFTER UPDATE OF revisao_respondida_em`,
DEFINER com `search_path` vazio, (d) `trg_notif_revisao_solicitada` da 42-07 **intacto**.
Teardown aferido: zero linha remanescente, ledger de volta ao tamanho anterior.

**6. Round-trip ao vivo — opção A do operador (sem hard bounce).**
Fixture: candidatura `0f09fed1…` na vaga `[TESTE] Auxiliar de Saúde Bucal (ASB)`, cujo
`candidatos.email` é `fernando@beautysmile.com.br` — **caixa interna real e
inspecionável**. Nenhum `@teste.com` envolvido, então o hard bounce que a Task 2 previu
não aconteceu. Decisor = `e2e.admin`; quem respondeu = outro RH (guard REVISAO-05
respeitado pelo caminho real, não contornado).

- (a) linha gravada: `revisao_veredito='mantida'`, `revisao_por_usuario` = o respondente,
  `revisao_respondida_em` preenchido.
- (b) **exatamente uma** linha de ledger, `dedupe_key =
  `0f09fed1-…:revisao_respondida`` — a chave sem ramo novo, como `montarDedupeKey` decidiu.
- (c) `modo='producao'`, `destinatario_email` = `destinatario_original` =
  `fernando@beautysmile.com.br`, `tentativas=0`, `ultimo_erro` nulo.
- **`status='entregue'`, não apenas `enviado`** — o webhook do Resend confirmou a ENTREGA
  antes mesmo da leitura. Entrega real provada, não só aceitação pelo provedor.

**(d) Conteúdo inspecionado nos TRÊS caminhos** (render do módulo vivo, com os dados reais
da fixture):

| Veredito | Assunto | Prévia (oculta) | Frase do desfecho |
|----------|---------|-----------------|-------------------|
| `mantida` | `Resposta à sua solicitação de revisão — [TESTE] Auxiliar de Saúde Bucal (ASB)` | `Sua solicitação de revisão foi respondida.` | "Após a revisão, a decisão foi mantida." |
| `revertida` | *(idêntico)* | *(idêntico)* | "Após a revisão, a decisão anterior foi revista." |
| ausente | *(idêntico)* | *(idêntico)* | *(nenhuma — caminho neutro honesto)* |

**A prévia é LITERALMENTE a mesma nos três casos.** Era o ponto onde o W-01 se escondeu, e
a decisão registrada de não ramificar está de pé no objeto renderado, não só no teste.
O corpo não carrega dado de avaliação, não nomeia o revisor e não promete próximo passo.

**Nota de escopo desta prova:** o render foi feito a partir do módulo do repositório. Que o
código DEPLOYADO produz o mesmo é provado por outra via, e é dedutivo, não confiança: um
`Record<EventoNotificacao, …>` sem a entrada nova faria `SUBJECTS[evento](d)` lançar
`TypeError`, o que cairia em `registrarFalha` e gravaria `status='falhou'`. O ledger diz
`entregue` — logo as três tabelas de template da EF viva têm a entrada do 5º evento.

**7. Asserção negativa de despachante único.** `net._http_response` na janela do RPC:
**exatamente 1** requisição (id 73 → `{"ok":true,"status":"enviado"}`). A outra linha da
janela (id 72) é o smoke do passo 3, 4 minutos antes. O RPC `responder_revisao_decisao`
**não** é um segundo despachante.

**Asserção negativa de idempotência.** 2º `UPDATE` reescrevendo o MESMO
`revisao_respondida_em` ⇒ **nenhuma** 2ª linha de ledger. O guard `NULL -> NOT NULL`
segura, como exige um dispatch at-most-once.

**Teardown.** `decisao_final` + `decisao_final_historico` da fixture removidos; a
candidatura volta ao estado "sem decisão", re-executável. A linha de ledger foi
**mantida** como evidência (idioma da 42-07). Estado final aferido: 3 triggers em
`decisao_final` (snapshot + solicitada + respondida), 3 jobs de cron — **inalterado**.

## O que este checkpoint acrescenta ao registro do projeto

- **A dependência de EF pode ser maior que a lista do plano.** O fechamento real se lê nos
  `import` do entrypoint, não no `files_modified`. Aqui a diferença era um evento vivo
  (`convite`) quebrar em produção. Vale para todo deploy de EF por MCP.
- **`status='entregue'` é um gate melhor que `enviado`** quando o webhook do Resend está
  vivo: distingue "o provedor aceitou" de "a pessoa recebeu".
