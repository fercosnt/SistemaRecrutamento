---
phase: 48-consertos-da-jornada-bloco-1
plan: 11
subsystem: database
status: complete
tags: [jorn-19, art-20, reabertura, decisao-final, registrar-decisao, d-23, fail-closed, smoke, prod]

requires:
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-08 — chave de dedupe do ciclo de revisão ({c}:revisao_respondida:{ciclo}, {c}:revisao_solicitada:{ciclo}:{user}); sem ela a 2ª revisão de um caso reaberto seria engolida"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-01 — trava terminal / predicado de encerramento (conferido: nenhum objeto dele redefinido aqui)"
provides:
  - "decisao_final.reaberta_em / prazo_nova_decisao_em / alerta_prazo_enviado_em + CHECK decisao_final_reabertura_prazo_coerente_check (PROD)"
  - "decisao_final_historico: 9 colunas do ciclo, preenchidas por snapshot_decisao_final a partir de OLD (PROD)"
  - "responder_revisao_decisao: revertida REABRE (decisao_final/em_analise, data_decisao_final NULL, prazo = fim do 10º dia em SP, histórico com justificativa própria); 22023 «nada a reabrir» sem escrita (PROD)"
  - "registrar_decisao: texto vivo passa a existir em arquivo; fail-closed antes de qualquer leitura; D-23 (vigente + arquivo); zeragem do ciclo na nova decisão de linha reaberta (PROD)"
  - "supabase/tests/p48_reabertura_smoke.sql — 12 asserções, subtransações revertidas"
  - "supabase/tests/p42_revisao_art20_smoke.sql — verde de novo (10/10), sem escrita commitada"
affects: [48-13, 48-14, 48-15, 48-17, 48-18]

tech-stack:
  added: []
  patterns:
    - "Transcrição de corpo vivo a partir do prosrc lido (md5 da transcrição = md5 vivo) + pré-portão md5/length + pós-portão de trechos que não podiam sumir"
    - "Prova de mordida por MUTAÇÃO dentro de requisição que sempre aborta (migration mutada + smoke + RAISE final): nada commita mesmo se o smoke passar"
    - "Smoke com troca de papel DENTRO da subtransação (SET ROLE authenticated para a chamada, RESET ROLE para o readback) — a subtransação revertida devolve também o papel"

key-files:
  created:
    - supabase/migrations/20260921000011_p48_reabertura_colunas_e_resposta.sql
    - supabase/migrations/20260921000012_p48_registrar_decisao_reabertura.sql
    - supabase/tests/p48_reabertura_smoke.sql
  modified:
    - supabase/tests/p42_revisao_art20_smoke.sql
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md

key-decisions:
  - "A3 (prazo): data_limite = (now() em America/Sao_Paulo)::date + 10; prazo_nova_decisao_em = 00:00 de SP do dia data_limite + 1 (fim do 10º dia corrido). A data dita ao candidato é data_limite"
  - "A4: data_decisao_final = NULL na reabertura — o cartão «Entenda a decisão» some até a nova decisão; a data antiga fica em decisao_final.em, no arquivo e no histórico"
  - "A5: em_espera registrado durante a reabertura NÃO é nova decisão — não zera o ciclo nem o prazo"
  - "D-23 identifica a decisão revertida por revisao_veredito='revertida' E decisao='rejeitado' (além da letra do plano): sem o filtro, o em_espera de C herda 'revertida' na linha com por_usuario=C e trava C — provado por mutação, FAIL (h)"
  - "Guard de papel de registrar_decisao SOBE para antes da leitura da candidatura e exige sub: sem JWT não há oráculo P0002 × 42501"
  - "Fixtures sintéticas (@invalido.local) em vez de candidatura real de conta de teste, como no 48-08/48-09: o operador exercita as contas +claude (48-05)"
  - "oper31 rodado em envelope que aborta (nota 4 do orquestrador), cortado antes do CLEANUP para ler smoke.ready"

requirements-completed: [JORN-19]

coverage:
  - id: D1
    description: "revertida reabre a candidatura em decisao_final/em_analise com prazo de 10 dias corridos, justificativa própria no histórico, data_decisao_final NULL; nunca aprova"
    requirement: JORN-19
    verification:
      - kind: integration
        ref: "node p46apply.cjs migrate supabase/migrations/20260921000011_p48_reabertura_colunas_e_resposta.sql (md5 do ledger BATE a893d0c0…)"
        status: pass
      - kind: integration
        ref: "supabase/tests/p48_reabertura_smoke.sql#(a)(b)(c)(d)"
        status: pass
    human_judgment: false
  - id: D2
    description: "registrar_decisao: D-23 (vigente e arquivo), fail-closed sem JWT, zeragem do ciclo só na nova decisão de linha reaberta, em_espera preserva o ciclo"
    requirement: JORN-19
    verification:
      - kind: integration
        ref: "node p46apply.cjs migrate supabase/migrations/20260921000012_p48_registrar_decisao_reabertura.sql (md5 do ledger BATE 47b13878…)"
        status: pass
      - kind: integration
        ref: "supabase/tests/p48_reabertura_smoke.sql#(e)..(l) — 12/12; RED antes do apply em (e); mutações sem filtro decisao / sem zeragem → FAIL (h)"
        status: pass
    human_judgment: false
  - id: D3
    description: "p42_revisao_art20_smoke h.2 assere o efeito novo dentro de subtransação revertida, com atores do catálogo vivo e negativa de zero resíduo"
    requirement: JORN-19
    verification:
      - kind: integration
        ref: "node p46apply.cjs run supabase/tests/p42_revisao_art20_smoke.sql — 10/10; mutação (responder antigo) → FAIL (h); mutação (sem reverter) → FAIL (j)"
        status: pass
      - kind: integration
        ref: "p42_notif_revisao 4/4 · p48_dedupe 6/6 · oper31 ready=y (envelope)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Reabertura ponta a ponta com conta real: pedido de revisão → revertida por outro RH → candidatura reaberta no painel → nova decisão por um terceiro, com os e-mails"
    requirement: JORN-19
    verification: []
    human_judgment: true
    rationale: "Exige commitar transições reais com e-mail real (NOTIFICACOES_MODO=producao) e a cópia/tela dos planos 48-13..48-15 — é o 48-18, por desenho do plano e do D-18"

duration: 12min
completed: 2026-09-21

plan_head_before: 903076aaa8b7e9a60b5a20d210cfa1afc65ea55f
actuals:
  tokens: 29391
  tasks: 3
  commits: 3
---

# Phase 48 Plan 11: «revertida» reabre a candidatura · SUMMARY

**Até aqui, o veredito `revertida` gravava a revisão e a candidatura continuava `rejeitado`. Agora ele devolve a candidatura a `decisao_final/em_analise` na mesma transação. O prazo para a nova decisão é de 10 dias corridos, contados em São Paulo, e o histórico recebe uma justificativa própria. Ninguém é aprovado pelo sistema. A nova decisão continua sendo registrada pelo upsert que já existe, mas não pode ser de quem teve a decisão revertida (D-23). Ela nasce limpa do ciclo anterior, e esse ciclo fica arquivado em `decisao_final_historico`. As duas migrations estão em PROD, e o `p42_revisao_art20_smoke`, vermelho desde 2026-09-05, voltou a ficar verde sem escrever nada.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-21T14:54:20Z
- **Completed:** 2026-09-21T15:06:10Z
- **Tasks:** 3 (Task 1 tracer)
- **Files modified:** 5

## Linha do tempo em PROD

| Instante (UTC) | O quê | Prova |
|---|---|---|
| 14:56 | smoke parte 1 contra o vivo ANTIGO | RED: `42703 column d.reaberta_em does not exist` |
| 14:58:13 | migration **20260921000011** | ledger md5 `a893d0c0a3c3d3005a458fef8617703f` **BATE** (23105 octetos) |
| 14:58 | smoke parte 1 | 5/5 |
| 15:00 | smoke com a parte 2 contra o `registrar_decisao` ANTIGO | RED em (e): o decisor revertido foi «ACEITO» |
| 15:01 | mutações da 000012 em requisição que aborta | sem o filtro `decisao='rejeitado'` → FAIL (h); sem a zeragem → FAIL (h); o vivo não mudou (md5 `3007d45f…`) |
| 15:02:05 | migration **20260921000012** | ledger md5 `47b138787b5401a6b45300eebf065dda` **BATE** (18489 octetos) |
| 15:02 | smoke completo | **12/12** |
| 15:04 | `p42_revisao_art20` reescrito + duas mutações | 10/10; responder antigo → FAIL (h); sem reverter → FAIL (j) |
| 15:05 | push | `origin/main..HEAD` vazio |

## Definições vivas (só leitura, antes) e instaladas (depois)

| Objeto | md5(prosrc) antes | length | md5(prosrc) depois | length |
|---|---|---|---|---|
| `responder_revisao_decisao(uuid,text,text)` | `c7fef6254a09b33cbcdbb70966f526cf` | 1798 | `1938fbe30a0787a2d7a2d91b52dd222a` | 4506 |
| `snapshot_decisao_final()` | `6eefacbfc91eacfed5a1774150198aad` | 234 | `5d5c25f714bc07e7c242628afe19ac37` | 682 |
| `registrar_decisao(uuid,decisao_final_resultado,text)` | `3007d45f02f28ac0aeefbfc1eeeb847b` | 3011 | `36ab0be3ad7b8d8e8a910b2b99e4b2f9` | 7766 |
| `avancar_etapa()` (NÃO redefinida; lida para confirmar a regra) | `b1f9225f8b4556457d289519e3b1064d` | 1534 | — | — |

- A transcrição do `registrar_decisao` foi feita a partir do `prosrc` lido e hasheia exatamente `3007d45f…`. O corpo instalado hasheia igual ao corpo que está no arquivo (`36ab0be3…`).
- ACL depois do apply: o de `responder_revisao_decisao` continua `{postgres, authenticated, service_role}`, sem `anon`. O de `registrar_decisao` continua como era, com `anon=X`, que vem do `pg_default_acl` e foi registrado em deferred.
- Colunas antes: `decisao_final` tinha 12 colunas e `decisao_final_historico` tinha 7. Depois ficaram 15 e 16. O CHECK novo é `CHECK (((reaberta_em IS NULL) = (prazo_nova_decisao_em IS NULL)))`.
- Estado de PROD na abertura: 6 linhas em `decisao_final` (0 `revertida`, 1 `mantida`, **2 revisões pendentes**) e 7 em `decisao_final_historico`. Nenhuma linha existente foi tocada. As 2 revisões pendentes, se forem respondidas `revertida` daqui em diante, reabrem pelo caminho novo.

## Accomplishments

- **Reabrir, não reverter (D-01).** No ramo `revertida`, o veredito, `reaberta_em` e `prazo_nova_decisao_em` são gravados num único UPDATE, o que gera um snapshot só (o 3b não se agrava). Depois vem o UPDATE de `candidaturas` com `etapa_atual='decisao_final'`, `status='em_analise'`, `data_decisao_final=NULL` e a justificativa «Candidatura reaberta após revisão (Art. 20) — aguardando nova decisão até DD/MM/AAAA.». O histórico ganha 1 linha `rejeitado→decisao_final` com `ator` = revisor, e a fila recebe só o `revisao_respondida`. A regressão não despacha `decisao`.
- **Prazo (D-10 / A3).** O smoke (a) confere `prazo_nova_decisao_em` contra a fórmula de SP calculada de forma independente, e o `criterio_texto` com a data (hoje em SP + 10).
- **Nada a reabrir.** O guard roda depois de todos os guards vivos e antes de qualquer escrita. `revertida` sobre decisão `aprovado`, ou sobre candidatura fora de `rejeitado/rejeitado`, devolve 22023 e a linha, a candidatura, o arquivo e o histórico ficam idênticos (to_jsonb antes = depois).
- **D-23.** Quem teve a decisão revertida recebe 42501 em qualquer `p_decisao`. Isso vale na janela da reabertura (linha vigente) e depois dela (arquivo). Por isso esse decisor também não sobrescreve a decisão de outra pessoa ((e), (g), (i)).
- **Zeragem.** A nova decisão (`aprovado`/`rejeitado`) de uma linha reaberta zera as 9 colunas do ciclo no mesmo upsert, e o arquivo guarda a linha revertida com `reaberta_em` e o prazo ((h)). O `em_espera` preserva o ciclo ((f)). Uma redecisão fora de reabertura não zera nada ((k)).
- **Fail-closed.** Sem JWT, `registrar_decisao` devolve 42501 tanto para um id existente quanto para um inexistente ((j)). Antes, a chamada passava do guard e só falhava por acaso no NOT NULL.

## Task Commits

1. **Task 1 (tracer): reabrir de ponta a ponta** — `dd96b6eb` (feat)
   - Portão do tracer (linha 3: interativo, end-of-phase, só `<automated>`). Re-verifiquei ponta a ponta: o md5 do ledger (`a893d0c0…`) é igual ao md5 do arquivo e o smoke deu 5/5. O `migrate` recusa reaplicar por desenho. Segui para a expansão.
2. **Task 2: `registrar_decisao` a partir do corpo vivo** — `4a82f51f` (feat)
3. **Task 3: o smoke do Art. 20, a regressão e a publicação** — `8acebb1f` (test)

## Verificação

| Portão | Resultado |
|---|---|
| `p48_reabertura_smoke.sql` | **12/12**. RED antes de cada apply; duas mutações da 000012 reprovam em (h) |
| `p42_revisao_art20_smoke.sql` (puro) | **10/10**. As mutações reprovam: responder antigo → (h), sem reverter → (j) |
| `p42_notif_revisao_smoke.sql` | 4/4 (contador lido em envelope; o run puro termina sem erro) |
| `p48_dedupe_smoke.sql` | 6/6 |
| `oper31_rejeitar_candidatura_smokes.sql` | `ready=y` em envelope que aborta, cortado antes do CLEANUP; nenhuma asserção levantou |
| Varredura de portões (D-17) | 273 achados no total. Os 8 nos dois smokes tocados são escopo deliberado: zero resíduo (`<> 0`), efeito único esperado (`IS DISTINCT FROM 1`), zeragem (`IS DISTINCT FROM 0`), esperado fixo do próprio arquivo (`<> 12`) e `v_ok <> 3` sobre as 3 RPCs do bloco (i). Nenhum outro smoke pina o corpo, o md5 ou a contagem de colunas de `decisao_final`/`decisao_final_historico`, e os de `p46_purga` (`relname IN ('decisao_final', …)`) desligam triggers por forma, não por lista de funções |
| `tsc` (hook de commit) | 90 (teto D-15: 90) |
| Resíduo em PROD | 0 titulares `p48rsmoke-%`/`p42smoke-%`; `net.http_request_queue` = 0; contagens de `decisao_final` (6), arquivo (7), histórico (50), candidaturas (33) iguais às de antes |
| `git log origin/main..HEAD` | vazio |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — o critério literal do D-23 travava a pessoa errada] A decisão revertida é identificada por `revertida` + `decisao='rejeitado'`**
- **Found during:** Task 2, ao desenhar (f)→(h)
- **Issue:** o plano manda recusar quando existir linha com `revisao_veredito='revertida'` e `por_usuario = auth.uid()`. Só que o `em_espera` de C (A5) não zera o ciclo: a linha vigente passa a ter `revertida` com `por_usuario = C`. Com o critério literal, C recebe 42501 na nova decisão, e o passo (h) do próprio plano fica impossível.
- **Fix:** o guard exige também `decisao='rejeitado'`. O `revertida` só é aceito sobre `rejeitado`, e toda nova decisão `rejeitado` de linha reaberta zera o ciclo, então essa combinação só existe na decisão que foi revertida.
- **Verification:** a mutação sem o filtro, aplicada em requisição que aborta, reprovou em (h) com «C registrando a nova decisão devolveu 42501 … D-23».
- **Committed in:** `4a82f51f`

**2. [Rule 2 — oráculo e sub ausente] O guard de papel de `registrar_decisao` sobe para antes da leitura da candidatura e exige `auth.uid()`**
- **Issue:** no lugar antigo, um chamador sem JWT distinguia um id existente (42501) de um inexistente (P0002). É a classe que o p42 (i) documentou em `responder_revisao_decisao`. Com papel e sem `sub`, a chamada caía no NOT NULL de `por_usuario`.
- **Fix:** o bloco `coalesce` e a exigência de `sub` vão para o topo, com o mesmo SQLSTATE. O guard de dona-da-vaga fica onde estava.
- **Verification:** smoke (j), com id existente e id inexistente, dá 42501 nos dois.

**3. [Desvio da letra, no idioma do 48-08/48-09] Fixture sintética em vez de candidatura real de conta de teste**
- O plano pedia «uma candidatura real de conta de teste em andamento». O operador pode estar exercitando as contas `+claude` agora (48-05). Usei titulares `@invalido.local` e atores reais e ativos lidos na execução. O corpo que os triggers e as RPCs processam é o mesmo.

**4. [Escopo ampliado da Task 3, pela nota 3 do orquestrador] O `p42_revisao_art20` inteiro de (f) a (h) foi para a subtransação, não só o (h.2)**
- A fixture antiga (INSERT de topo commitado sobre a candidatura real de `candidato.funil@teste.com`, com RH fixos inativos) e a resposta de (f) commitavam um `revisao_respondida` real. Os atores agora vêm do catálogo, e a negativa (j) substitui o teardown. As asserções (a)–(e) e (i) ficaram byte a byte, e o gate subiu de 9 para 10.

**5. [Rule 3 — portão que COMMITA] `oper31` não foi rodado com `p46apply run` puro, como o `<verify>` da Task 3 escreve**
- Rodado puro, o arquivo commita uma fixture ligada a candidato real (deferred do 48-01). Rodei em envelope que aborta. Na primeira tentativa, o corte caiu na palavra CLEANUP do cabeçalho (linha 32) e leu `ready=<NULL>`. Refeito, cortado antes do CLEANUP real (linha 243), deu `ready=y`.

---

**Total deviations:** 2 auto-fixed (Rule 1, Rule 2), 2 desvios de fixture/escopo com precedente, 1 portão rodado em envelope.
**Impact:** o nº 1 corrige uma contradição interna do plano que teria travado a nova decisão legítima. O nº 2 fecha o oráculo que o guard antigo abria. Os demais não mudam o que é provado.

## Issues Encountered

- O run puro do `p42_notif_revisao_smoke` só devolve o último `set_config`. O contador (4) foi lido num segundo run em envelope.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: pii-copy | supabase/migrations/20260921000011_p48_reabertura_colunas_e_resposta.sql | `decisao_final_historico.revisao_resultado` passa a guardar a justificativa do revisor, e `anonimizar_candidato` (P45) não desidentifica esse campo, nem em `decisao_final` (pré-existente) nem no arquivo. Registrado em deferred; o mecanismo destrutivo fica fora deste plano |

## Known Stubs

Nenhum.

## Next Phase Readiness

- **48-13 (avisos):** a EF lê `decisao_final.prazo_nova_decisao_em` e diz ao candidato a data `(prazo em SP)::date - 1`, ou seja, `data_limite`, a mesma do `criterio_texto`. A varredura do vencimento seleciona `reaberta_em IS NOT NULL AND prazo_nova_decisao_em < now() AND alerta_prazo_enviado_em IS NULL` e grava `alerta_prazo_enviado_em`. Um `em_espera` não interrompe o prazo (A5). O `COPY_REVISAO_REVERTIDA` ainda diz «a decisão anterior foi revista».
- **48-14/48-15 (telas):** na reabertura, `decisao_final.decisao` continua `rejeitado` com `revisao_veredito='revertida'` até a nova decisão. A tela deve ler `reaberta_em`, e não `decisao`. `data_decisao_final` é NULL e o SLA «3 dias úteis» de `decisao_final` contradiz o prazo de 10 dias (RESEARCH §E.3 passo 8). O `RegistrarDecisaoForm` vai receber 42501 «(D-23)» para o decisor revertido e deve traduzir isso.
- **48-17:** veredito de export e inventário PII das 12 colunas novas.
- **48-18:** prova com conta real. Consultas de conferência:
  - `select reaberta_em, prazo_nova_decisao_em from decisao_final where candidatura_id = …`;
  - a linha `rejeitado→decisao_final` em `historico_candidatura`;
  - depois da nova decisão, as 9 colunas NULL e o arquivo com `revisao_veredito='revertida'`.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260921000011_p48_reabertura_colunas_e_resposta.sql
- FOUND: supabase/migrations/20260921000012_p48_registrar_decisao_reabertura.sql
- FOUND: supabase/tests/p48_reabertura_smoke.sql
- FOUND commits: dd96b6eb, 4a82f51f, 8acebb1f
- FOUND ledger: 20260921000011 (a893d0c0…), 20260921000012 (47b13878…)
