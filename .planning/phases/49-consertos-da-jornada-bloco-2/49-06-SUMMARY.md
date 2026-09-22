---
phase: 49-consertos-da-jornada-bloco-2
plan: 06
subsystem: database
tags: [postgres, supabase, triggers, guc, rls-adjacent, lgpd, trilha, migrations, p46apply]

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "`public.entrevista_analise_vigente(timestamptz,text,jsonb)` — o predicado ÚNICO de «vigente», CHAMADO pelo portão de avanço (D-39/JORN-12), nunca copiado"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "o molde de migration do M8 (pré-portão md5 por função + pós-portão por catálogo), o predicado canônico `candidatura_encerrada`, o idioma de GUC sancionada (`app.rejeicao_sancionada`) e o molde de smoke que escreve e reverte (`p48_reabertura_smoke.sql`)"
  - phase: 46-purga-e-guardas
    provides: "`p46apply.cjs` — SQL lido do ARQUIVO, migration + ledger na mesma transação, md5 conferido por leitura de volta"
provides:
  - "GUC de transação `app.transicao_sancionada` (`reabertura` | `decisao`) — a forma de declarar que uma transição sobre candidatura ENCERRADA é sancionada, por quem a executa e nunca pelo destino"
  - "trava D-35 em `public.avancar_etapa()`: recusa (`check_violation`) mover candidatura cujo ESTADO ANTERIOR é encerrado pelo predicado canônico, exceto nas duas transições sancionadas"
  - "`public.avancar_etapa()` limpa `NEW.etapa_justificativa` depois de gravar o histórico (JORN-17) — a justificativa deixa de grudar de uma transição para a outra e o portão de regressão volta a exigir motivo NOVO"
  - "`public.avancar_etapa()` consulta a bandeira de entrevista SÓ sobre análises vigentes, pela função única do 49-01 (D-39)"
  - "`public.registrar_decisao` grava a constante sem PII `'Decisão final registrada.'` em `etapa_justificativa` — a justificativa da decisão final deixa de chegar ao titular pela trilha (D-47/JORN-37/BD-9), e continua em `decisao_final.justificativa`"
  - "ramo JORN-34 em `public.guard_rejeicao_auditada()`: reabrir candidatura encerrada mexendo só no `status` é recusado, escopado a `auth.uid() IS NOT NULL` e excetuando a GUC `reabertura`"
  - "`anon` sem EXECUTE nas quatro funções (era `true` em `avancar_etapa`, `registrar_decisao` e `guard_rejeicao_auditada`)"
  - "`supabase/tests/p49_trilha_smoke.sql` — 13 asserções sobre a trilha, provadas por execução em PROD e provadas MORDENTES por cinco mutações"
affects: [49-07, 49-10, 49-12, 49-14, 49-18, 49-19, 49-22]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 34020
  tasks: 3
  commits: 2
  plan_head_before: 4eb9512d6514f8e0e2e4c6b2f3c560c85846843e
  # `commits: 2` = os commits de PRODUÇÃO, MEDIDOS por
  # `git rev-list --count 4eb9512d..HEAD` no instante em que este SUMMARY foi escrito
  # (be798d66, efa2f44c), não narrados. Re-medir DEPOIS deste ponto dá um número MAIOR e
  # isso não é divergência: o commit de metadado do próprio plano entra no mesmo intervalo
  # por construção, porque o `plan_head_before` é anterior a ele.
  # A Task 3 é execução (regressão + mutação) e não alterou nenhum arquivo — por isso 2
  # commits para 3 tasks, e a prova dela vive neste SUMMARY.
  # ⚠ Estimativa era 135000 tokens; o realizado é 34020 (0,25×). Registrado como medido,
  # não ajustado para parecer perto: o plano tem `confidence: low` e `sample_count 0`.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GUC de transição sancionada: a RPC que executa a transição a DECLARA (`set_config('app.transicao_sancionada', …, true)`) e a ZERA logo depois — a trava no trigger nunca decide por destino"
    - "reset de GUC DEPOIS do `GET DIAGNOSTICS … ROW_COUNT` — um `PERFORM` entre o UPDATE e o `GET DIAGNOSTICS` zera o contador e reprova a escrita correta"
    - "coluna de EVENTO é zerada pelo próprio trigger que a consome (`NEW.<col> := NULL` depois do INSERT de auditoria, em trigger BEFORE) — deixá-la viva a transforma em ESTADO e desarma o portão que a lê"
    - "constante sem PII na trilha do titular + texto integral na tabela-fonte: o dado é MOVIDO, e o pós-portão prova as duas metades (a constante presente E a cópia antiga ausente)"
    - "guarda de banco escopada a `auth.uid() IS NOT NULL` quando o caminho a fechar é o do CLIENTE — preserva o idioma de fixture de smokes que rodam como `postgres`, e o escopo é CONFERIDO sítio a sítio antes do apply, nunca presumido"
    - "asserção de AUSÊNCIA escrita por concatenação (`position('a = ' || 'b' IN def)`) quando o portão estático do plano varre o próprio arquivo pelo literal que a asserção procuraria"
    - "prova de mordida por INVERSÃO EXATA do conserto sobre o corpo VIVO (`pg_get_functiondef` + replace do trecho), uma inversão por asserção — fail-fast num smoke esconde as demais se a mutação desfizer tudo de uma vez"

key-files:
  created:
    - supabase/migrations/20260922000003_p49_trava_encerrada.sql
    - supabase/migrations/20260922000004_p49_trilha_justificativa_e_vigente.sql
    - supabase/tests/p49_trilha_smoke.sql
  modified:
    - supabase/tests/p48_reabertura_smoke.sql
    - supabase/tests/p48_rejeicao_triagem_smoke.sql

key-decisions:
  - "Acrescentada a asserção (c2) que o plano não pedia — `registrar_decisao` sobre candidatura JÁ ENCERRADA (`triagem/finalizado → aprovado`). Sem ela a sanção `decisao` ficaria SEM PROVA: a (c) do plano roda sobre fixture não encerrada, onde a trava nunca é alcançada, e passaria idêntica com e sem a GUC"
  - "Acrescentada a asserção (a3) — o PATCH `etapa_atual='aprovado'` sobre o knockout também é recusado. É a prova executada de que a sanção é por GUC e não por «destino terminal», que o `must_haves.truths` do plano afirma e que nenhuma outra asserção cobria"
  - "Cinco mutações em vez das três do plano: um smoke é fail-fast, então uma mutação que desfaz trava + limpeza + vigente de uma vez só prova a PRIMEIRA. Cada conserto ganhou a sua inversão exata (M1 trava, M2 limpeza, M3 vigente, M4 D-47, M5 JORN-34), e cada uma reprovou na asserção dela"
  - "A asserção de AUSÊNCIA do pós-portão da …000004 é montada por concatenação de propósito: o portão estático do plano reprova o ARQUIVO se o literal `etapa_justificativa = p_justificativa` aparecer no trecho de `registrar_decisao`, e a própria asserção de ausência o faria aparecer. O que é asserido é idêntico; o comentário inline registra o porquê"
  - "O instrumento do verify do `oper31` (`ENVELOPE ready=%` lendo `smoke.ready`) é ZERADO pelo próprio arquivo na seção de limpeza — lido depois do arquivo ele sempre sai vazio, e o verify como escrito nunca poderia passar. Trocado pelo sobrevivente equivalente `smoke.cand`, gravado na mesma linha lógica em que `smoke.ready` vira `'y'`"
  - "A limpeza do JORN-17 vem DEPOIS do INSERT no histórico, e o pós-portão assere a ORDEM por `position()`: invertida, o `criterio_texto` sairia NULL em TODA transição e a trilha do titular perderia o motivo de tudo — um conserto de privacidade que virava apagamento de transparência"
  - "`responder_revisao_decisao` é pinada no pré-portão da …000004 sem ser modificada por ela: o contrato da GUC de sanção é compartilhado pelas quatro funções, e uma divergência nela invalidaria as asserções da migration"
  - "`main` mantida como branch de trabalho (autorização explícita do orquestrador: `git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main` como base). Não registrado como desvio"

patterns-established:
  - "Sanção por GUC, nunca por destino: quando um trigger central precisa recusar uma classe de escrita mas algumas RPCs legitimamente a fazem, quem conhece a legitimidade é a RPC — e ela a declara. A regra por «destino» parece equivalente e não é: aqui ela aceitaria um PATCH que deixa `status='rejeitado'` com etapa `aprovado`"
  - "Uma inversão por asserção: prova de mordida num smoke fail-fast exige uma mutação POR conserto. Três consertos desfeitos de uma vez produzem um único FAIL e deixam duas asserções sem prova — parecendo provadas"
  - "Escopo de guarda conferido sítio a sítio: `auth.uid() IS NOT NULL` só é escopo defensável se os sítios que ele poupa forem ENUMERADOS e MEDIDOS. Foram 11 UPDATEs em 8 arquivos, cada um com o estado de `request.jwt.claims` lido na linha"

requirements-completed: [JORN-25, JORN-17, JORN-37, JORN-34, JORN-12]

coverage:
  - id: D1
    description: "A trava D-35 está em PROD: mover candidatura ENCERRADA é recusado com `check_violation`, com e sem JWT, e também quando o destino é terminal — o knockout `inscricao/rejeitado` deixa de ser avançável, e por isso deixa de gerar histórico e o despacho `avanco`"
    requirement: JORN-25
    verification:
      - kind: integration
        ref: "supabase/tests/p49_trilha_smoke.sql#(a) knockout + claims de RH → avaliacao_assincrona ⇒ 23514 «candidatura encerrada»; 0 linhas de histórico depois das 3 tentativas"
        status: pass
      - kind: integration
        ref: "supabase/tests/p49_trilha_smoke.sql#(a2) o mesmo UPDATE SEM claims ⇒ também recusado (a trava não é escopada por JWT)"
        status: pass
      - kind: integration
        ref: "supabase/tests/p49_trilha_smoke.sql#(a3) PATCH `etapa_atual='aprovado'` sobre o knockout ⇒ recusado (a sanção é por GUC, não por destino terminal — RESEARCH §H.1)"
        status: pass
      - kind: integration
        ref: "mutação M1 (corpo de `avancar_etapa` anterior à Task 1, em requisição que aborta) ⇒ FAIL (a) «devolveu ACEITO»"
        status: pass
      - kind: other
        ref: "pg_get_functiondef em PROD contém `candidatura_encerrada(OLD.etapa_atual, OLD.status)`; md5(prosrc)=78317b0734f876b69737c51c3158e502"
        status: pass
    human_judgment: false
  - id: D2
    description: "As duas transições sancionadas continuam passando, e a sanção não vaza: a reabertura do Art. 20 (D-01) reabre em `decisao_final/em_analise` com UMA linha de histórico, a decisão registra sobre candidatura já encerrada, e depois das três a GUC está vazia e um UPDATE cru sobre encerrada é recusado"
    requirement: JORN-25
    verification:
      - kind: integration
        ref: "supabase/tests/p49_trilha_smoke.sql#(b) `responder_revisao_decisao('revertida')` sobre `rejeitado/rejeitado` ⇒ aceito, `decisao_final/em_analise`, `data_decisao_final` NULL, 1 linha nova de histórico"
        status: pass
      - kind: integration
        ref: "supabase/tests/p49_trilha_smoke.sql#(c2) `registrar_decisao('aprovado')` sobre `triagem/finalizado` ⇒ aceito pela GUC `decisao`, `aprovado/finalizado`, 1 linha `triagem→aprovado`"
        status: pass
      - kind: integration
        ref: "supabase/tests/p49_trilha_smoke.sql#(g) `current_setting('app.transicao_sancionada', true)` vazio + UPDATE cru sobre encerrada recusado, na MESMA transação"
        status: pass
      - kind: integration
        ref: "supabase/tests/p48_reabertura_smoke.sql 13/13, com a fixture F4 entrando pela GUC e a asserção (m) provando que sem ela o MESMO UPDATE é recusado"
        status: pass
    human_judgment: false
  - id: D3
    description: "A justificativa não gruda (JORN-17): `candidaturas.etapa_justificativa` fica NULL depois da reabertura, da decisão e de um avanço comum, com o texto inteiro no `criterio_texto` da SUA linha de histórico — e o portão de regressão volta a exigir motivo NOVO"
    requirement: JORN-17
    verification:
      - kind: integration
        ref: "supabase/tests/p49_trilha_smoke.sql#(e) coluna NULL nas três transições; `criterio_texto` da reabertura com o texto próprio e o do avanço com o token mandado"
        status: pass
      - kind: integration
        ref: "supabase/tests/p49_trilha_smoke.sql#(f) avançar com X e regredir SEM mandar justificativa ⇒ «Regressão de etapa exige justificativa» (antes, X residual desarmava o portão)"
        status: pass
      - kind: integration
        ref: "supabase/tests/p48_rejeicao_triagem_smoke.sql 6/6 — `a_just` lido do histórico + asserção nova de que a coluna ficou NULL"
        status: pass
      - kind: integration
        ref: "supabase/tests/oper31_rejeitar_candidatura_smokes.sql em envelope que aborta (`ENVELOPE ready=y`) — a regressão (c) com justificativa vazia segue recusada"
        status: pass
      - kind: integration
        ref: "mutação M2 (vivo SEM `NEW.etapa_justificativa := NULL`) ⇒ FAIL (e), citando os três textos sobreviventes"
        status: pass
      - kind: other
        ref: "pós-portão da migration assere que a limpeza vem DEPOIS do INSERT no histórico (`position()`), senão o `criterio_texto` sairia NULL em toda transição"
        status: pass
    human_judgment: false
  - id: D4
    description: "A justificativa da decisão final não chega ao titular pela trilha (D-47/JORN-37/BD-9): o histórico guarda a constante `'Decisão final registrada.'` e não o token; o texto continua em `decisao_final.justificativa` — o dado é MOVIDO, não apagado"
    requirement: JORN-37
    verification:
      - kind: integration
        ref: "supabase/tests/p49_trilha_smoke.sql#(d) `criterio_texto` = a constante, sem o token; `decisao_final.justificativa` com o texto inteiro"
        status: pass
      - kind: integration
        ref: "mutação M4 (`'Decisão final registrada.'` → `p_justificativa`) ⇒ FAIL (d), com o texto da deliberação aparecendo no `criterio_texto`"
        status: pass
      - kind: other
        ref: "pós-portão: constante PRESENTE, atribuição de `p_justificativa` a `etapa_justificativa` AUSENTE, e o INSERT em `decisao_final` com `p_justificativa` ainda presente (o D-47 move, não apaga)"
        status: pass
    human_judgment: false
  - id: D5
    description: "O portão de avanço olha só a análise VIGENTE (D-39/JORN-12), pela função única do 49-01: bandeira já superada deixa de bloquear; bandeira vigente e sem revisão continua bloqueando (ENTREV-03/RF-24 intacto)"
    requirement: JORN-12
    verification:
      - kind: integration
        ref: "supabase/tests/p49_trilha_smoke.sql#(i) fixture com análise `superada_em` preenchida ⇒ avanço para `entrevista_presencial` ACEITO; fixture com análise vigente bloqueada ⇒ 23514 «revise a bandeira», etapa intacta"
        status: pass
      - kind: integration
        ref: "mutação M3 (vivo SEM o filtro de vigente) ⇒ FAIL (i) «a bandeira já SUPERADA … devolveu 23514»"
        status: pass
      - kind: integration
        ref: "tabela-verdade EXECUTADA de `entrevista_analise_vigente` dentro do pós-portão da migration (4 casos: vigente / superada / falhou / sem competências)"
        status: pass
      - kind: other
        ref: "pg_get_functiondef contém `entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias)` — a função é CHAMADA, o texto do predicado não foi copiado"
        status: pass
    human_judgment: false
  - id: D6
    description: "Reabrir candidatura encerrada só pelo `status` é recusado (JORN-34), escopado ao cliente: com JWT de RH ⇒ `check_violation`; sem JWT ⇒ aceito, preservando o idioma de fixture de 8 smokes"
    requirement: JORN-34
    verification:
      - kind: integration
        ref: "supabase/tests/p49_trilha_smoke.sql#(h) com claims de RH, `UPDATE SET status='em_analise'` sobre `triagem/rejeitado` ⇒ 23514 «não pode ser reaberta pelo status»; sem claims ⇒ aceito"
        status: pass
      - kind: integration
        ref: "mutação M5 (corpo de `guard_rejeicao_auditada` anterior) ⇒ FAIL (h) «devolveu ACEITO»"
        status: pass
      - kind: other
        ref: "premissa A4 conferida sítio a sítio antes do apply: 11 UPDATEs de `status` em 8 smokes, todos com `request.jwt.claims` vazio ou não definido (`auth.uid()` NULL, medido) e nenhum mudando `etapa_atual`"
        status: pass
      - kind: integration
        ref: "6 smokes de regressão por `run` puro (p45_motor_exclusao, p42_revisao_art20, p48_candidatura_encerrada, p48_dedupe, p48_cognitivo_notifica, p48_prazo_reabertura) — todos verdes, nenhuma fixture ajustada"
        status: pass
    human_judgment: false
  - id: D7
    description: "As duas migrations estão aplicadas E escrituradas, com `md5(statements[1])` do ledger conferido contra o md5 do arquivo em disco, e cada uma foi ENSAIADA em requisição que aborta ANTES do apply"
    verification:
      - kind: integration
        ref: "ledger: 20260922000003 = ba36d19cce179d103964b463cd5bb36c (33659 octetos) · 20260922000004 = 68d5f2969e207c7d960039ac346c9851 (42123 octetos) — idênticos ao md5 do disco"
        status: pass
      - kind: other
        ref: "ensaio 1 (migration + p49_trilha + p48_reabertura + RAISE) e ensaio 2 (migration + 3 smokes + RAISE): abortaram em `ENSAIO_OK`, sem `FAIL`, antes de cada apply"
        status: pass
      - kind: other
        ref: "`anon` sem EXECUTE nas quatro funções; `authenticated` preservado nas duas RPCs do RH (asserido pelo pós-portão)"
        status: pass
      - kind: other
        ref: "md5 vivo das 4 funções depois das mutações = md5 do pós-portão (nenhuma mutação vazou); `npm run -s lint` = 89 erros (teto D-53 = 90)"
        status: pass
    human_judgment: false

# Metrics
duration: 37 min
completed: 2026-09-22
status: complete
---

# Phase 49 Plano 06: A trilha da candidatura registra só o que aconteceu Summary

**O banco passa a recusar mover quem já saiu do funil (trava D-35 em `avancar_etapa` com sanção por GUC de transação, nunca por destino terminal), a justificativa deixa de grudar de uma transição para a outra, a justificativa da decisão final deixa de chegar ao titular pela trilha, o portão de avanço passa a olhar só a análise vigente, e reabrir encerrada só pelo status é recusado — duas migrations aplicadas em PROD com md5 do ledger conferido, 13 asserções novas, e cinco mutações provando que cada conserto reprova quando desfeito.**

## Performance

- **Duration:** 37 min
- **Started:** 2026-09-22T23:01:00Z
- **Completed:** 2026-09-22T23:38:00Z
- **Tasks:** 3 / 3
- **Files:** 5 (3 criados, 2 modificados)

## Accomplishments

- **O knockout deixa de ser avançável — e o e-mail «você avançou» deixa de ter origem.** Medido na
  varredura desta sessão: `avancar_etapa()` não tinha NENHUMA trava de estado anterior, então
  `inscricao/rejeitado → avaliacao_assincrona` era um AVANÇO aceito, gravava linha em
  `historico_candidatura`, e o `trg_notif_transicao` despachava o evento `avanco` para quem já
  havia sido eliminado. A trava agora recusa com `check_violation`, **com e sem JWT**, e também
  quando o destino é terminal.
- **A sanção é da TRANSIÇÃO, não do DESTINO — e isso foi provado por execução, não argumentado.**
  A alternativa aparentemente equivalente («mover encerrada é aceito quando o destino é terminal»)
  aceitaria um PATCH `etapa_atual='aprovado'` num knockout pela policy `rh_avanca_etapa`, deixando
  `status='rejeitado'` com etapa `aprovado`. A asserção (a3) — que o plano não pedia — executa
  exatamente esse PATCH e o vê recusado.
- **A GUC não vaza.** `set_config(…, true)` vale até o fim da TRANSAÇÃO, não do statement. As duas
  RPCs ZERAM a sanção logo depois do UPDATE que a usa, e em `responder_revisao_decisao` o reset vem
  DEPOIS do `GET DIAGNOSTICS … ROW_COUNT` (um `PERFORM` entre os dois zeraria o contador e o guard
  «reabertura nao moveu a candidatura (0 linhas)» passaria a reprovar a reabertura CORRETA). A
  asserção (g) faz reabertura + duas decisões na MESMA transação e depois verifica que a GUC está
  vazia e que um UPDATE cru sobre encerrada é recusado.
- **A justificativa era de ESTADO e passa a ser de EVENTO.** `avancar_etapa` lia
  `NEW.etapa_justificativa` em dois lugares e nunca a limpava. Duas consequências, ambas medidas:
  o histórico da transição N+1 recebia o motivo da transição N (e o histórico ENTRA na cópia do
  titular), e **o portão de regressão ficava desarmado** — um PATCH que regride sem mandar
  justificativa encontrava o valor residual e passava. A asserção (f) avança com um texto e depois
  regride sem mandar nada: recusado.
- **A ordem da limpeza é load-bearing, e o pós-portão a assere.** Se `NEW.etapa_justificativa := NULL`
  viesse ANTES do INSERT no histórico, o `criterio_texto` sairia NULL em TODA transição — um
  conserto de privacidade que virava apagamento de transparência. O pós-portão compara as posições
  por `position()` e aborta o apply se estiverem invertidas.
- **A justificativa da decisão final sai da trilha do titular sem sair do sistema.** Os dois UPDATEs
  de `registrar_decisao` copiavam `p_justificativa` para `etapa_justificativa`, e de lá ela ia para
  `historico_candidatura.criterio_texto`. Agora a trilha registra a constante
  `'Decisão final registrada.'` e o texto continua em `decisao_final.justificativa`. O pós-portão
  exige as DUAS metades: a constante presente, a cópia antiga ausente, **e o INSERT em
  `decisao_final` ainda gravando `p_justificativa`** — porque o D-47 move o dado, não o apaga.
- **Uma análise superada deixa de bloquear o avanço para sempre.** O `EXISTS` da bandeira não
  filtrava nada além de `bloqueio_avanco`/`revisao_confirmada_em`. Passa a chamar
  `public.entrevista_analise_vigente(...)` — a função ÚNICA do 49-01, **chamada e não copiada**.
  A bandeira vigente e sem revisão continua bloqueando (ENTREV-03/RF-24 intacto).
- **Reabrir por status é recusado, e o escopo da guarda foi conferido em vez de presumido.**
  `guard_rejeicao_auditada` ganhou um ramo irmão no sentido inverso. Este caminho não passa por
  `candidaturas_avancar_etapa_trg` (que é `... OF etapa_atual`), então a trava D-35 não o vê: a
  guarda é a única defesa. O escopo `auth.uid() IS NOT NULL` foi validado sítio a sítio antes do
  apply — 11 UPDATEs em 8 smokes.
- **O portão morde, e cada conserto tem a sua própria prova.** Cinco mutações por inversão exata
  do conserto sobre o corpo vivo, cada uma em requisição atômica que aborta. Todas reprovaram na
  asserção delas; nenhuma vazou para PROD (md5 vivo idêntico ao do pós-portão depois das cinco).

## Task Commits

1. **Task 1 (tracer): a trava D-35 com as duas sanções** — `be798d66` (feat)
2. **Task 2: justificativa que não gruda, decisão fora da trilha, portão pela vigente, guarda de reabrir por status** — `efa2f44c` (feat)
3. **Task 3: regressão e prova de mordida** — sem commit próprio: é execução em PROD e não alterou
   nenhum arquivo (nenhuma fixture precisou de ajuste). A prova está nas seções abaixo.

**Ledger de PROD:**

| version | name | md5 do arquivo | md5 do ledger | octetos |
|---|---|---|---|---|
| 20260922000003 | p49_trava_encerrada | `ba36d19cce179d103964b463cd5bb36c` | `ba36d19cce179d103964b463cd5bb36c` | 33659 |
| 20260922000004 | p49_trilha_justificativa_e_vigente | `68d5f2969e207c7d960039ac346c9851` | `68d5f2969e207c7d960039ac346c9851` | 42123 |

A `version` nasceu correta nas duas (nenhum reparo de ledger). As duas foram ENSAIADAS em
requisição que aborta ANTES do apply.

## md5 das quatro funções — antes, no meio e depois

| Função | antes do plano | depois da …000003 | depois da …000004 (vivo) |
|---|---|---|---|
| `avancar_etapa()` | `b1f9225f8b4556457d289519e3b1064d` (1534) | `f329b540f9144e7d53a731f30bf45bdb` (2811) | **`78317b0734f876b69737c51c3158e502`** (4693) |
| `responder_revisao_decisao` | `1938fbe30a0787a2d7a2d91b52dd222a` (4506) | `301ca807c5a41b9bac417e16f6321682` (5326) | **`301ca807c5a41b9bac417e16f6321682`** (5326) |
| `registrar_decisao` | `36ab0be3ad7b8d8e8a910b2b99e4b2f9` (7766) | `a9fa9adb4fa37fff811cff480cabec77` (8440) | **`5042fa9331f21ad873cb462208490dcc`** (9194) |
| `guard_rejeicao_auditada` | `9836d3f9ded1762b7f5989803130244d` (708) | `9836d3f9ded1762b7f5989803130244d` (708) | **`dc695aa49a76c1dab31e9867703556ec`** (2476) |

Cada migration pinou no pré-portão o md5 da coluna à sua esquerda. `responder_revisao_decisao` é
pinada pela …000004 **sem ser modificada por ela**: o contrato da GUC é compartilhado, e uma
divergência nela invalidaria as asserções da migration.

## Varredura C1-P4 — os escritores VIVOS de `etapa_atual`, um por um

Padrão do `49-VARREDURA-KICKOFF.md` (C1-P4), executado em PROD antes de escrever:

| Escritor vivo | Pode mover ENCERRADA? | Sanção que o cobre |
|---|---|---|
| `avancar_etapa()` | é o trigger — passa a SER a trava | n/a (acerto do regex: `current_setting` casa `set…etapa_atual =`) |
| `registrar_decisao(uuid,decisao_final_resultado,text)` | **sim** — o legado `triagem/finalizado → aprovado` | GUC `decisao` |
| `responder_revisao_decisao(uuid,text,text)` | **sim** — `rejeitado/rejeitado → decisao_final/em_analise` (D-01) | GUC `reabertura` |
| `rejeitar_candidatura(uuid,motivo_rejeicao_rh,text)` | **não** — já recusa encerrada pelo predicado («candidatura já encerrada … não pode ser rejeitada novamente», `check_violation`) | nenhuma necessária |
| `submit_candidatura_atomic(uuid,uuid,text,text,integer,jsonb)` | **não** — knockout grava `etapa_atual='inscricao'` sobre `inscricao/aguardando_resposta` (etapa igual ⇒ early-return) e o caminho feliz é `inscricao → triagem` sobre estado não encerrado | nenhuma necessária |

**Nenhum escritor não previsto** (o D-14 não foi acionado). Varredura C2 confirmou o kickoff:
`etapa_justificativa` é citada por 5 funções (só `avancar_etapa` LÊ `NEW.`; as outras 4 escrevem),
e as GUCs `app.*` vivas eram duas (`app.rejeicao_sancionada` em `registrar_decisao` e
`submit_candidatura_atomic`) — a `app.transicao_sancionada` é a terceira, e a única com reset.

Complemento (varredura própria, para o ramo JORN-34): **todos** os escritores vivos de
`candidaturas.status` são os mesmos 5 UPDATEs acima. Nenhum é recusado pelo ramo novo —
`registrar_decisao` leva a estado ENCERRADO (o ramo exige `NOT candidatura_encerrada(NEW…)`),
`rejeitar_candidatura` e `submit_candidatura_atomic` partem de estado NÃO encerrado, e
`responder_revisao_decisao` declara a sanção.

## Premissa A4 — conferida sítio a sítio, não presumida

O escopo `auth.uid() IS NOT NULL` do ramo JORN-34 só é defensável se os sítios que ele poupa
forem enumerados. Para cada UPDATE de `status` nos 8 smokes do idioma, foi lido o último
`set_config('request.jwt.claims', …)` **anterior** à linha:

| Smoke | linha | claims na linha do UPDATE | muda `etapa_atual`? |
|---|---|---|---|
| `p42_revisao_art20_smoke.sql` | 508 | `''` (L119) | não |
| `p45_motor_exclusao_smoke.sql` | 880 | **nunca definidas no arquivo** → `current_setting(…, true)` NULL | não |
| `p45_motor_exclusao_smoke.sql` | 2284 | `''` (L2168) | não |
| `p48_candidatura_encerrada_smoke.sql` | 264, 273 | `''` (L242) | não |
| `p48_dedupe_smoke.sql` | 187, 320 | `''` (L70, L214) | não |
| `p48_cognitivo_notifica_smoke.sql` | 137 | `''` (L60) | não |
| `p48_reabertura_smoke.sql` | 200, 520 | `''` (L79, L362) | não |
| `p48_prazo_reabertura_smoke.sql` | 183 | `''` (L53) | não |
| `p48_rejeicao_triagem_smoke.sql` | 161 | `''` (L58) | não |

Medido em PROD que `auth.uid()` devolve NULL com `request.jwt.claims` **vazio E não definido**
(o corpo de `auth.uid()` usa `current_setting(…, true)` com `nullif`, então não levanta). Logo o
ramo JORN-34 não morde nenhum desses 11 sítios, e **nenhuma fixture precisou de ajuste por causa
dele**.

A ÚNICA fixture consertada na fase é a **F4 de `p48_reabertura_smoke.sql`** — e foi pela TRAVA
(ela muda `etapa_atual` sobre `rejeitado/rejeitado`), não pela guarda. Ela passa a declarar
`app.transicao_sancionada='reabertura'`, e a asserção **(m)** nova prova, numa subtransação que
reverte, que sem a GUC o MESMO UPDATE é recusado: sem ela o `set_config` seria um afrouxamento
invisível, e o smoke ficaria verde com e sem a trava. Esperado 12 → **13**, bump registrado no
cabeçalho do arquivo.

## Varredura de portões pela FORMA (D-56 / CLAUDE.md §«Portões»)

```bash
grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql
```

**Abertura: 282 linhas** (idêntico ao que o 49-01 mediu). Achados que citam as quatro funções ou
`candidaturas`, classificados:

| Achado | Forma | Classificação |
|---|---|---|
| `p43_previa_smoke.sql:667` — `proname IN ('candidaturas_alem_da_janela', …)` | lista literal (o ponto cego que o CLAUDE.md nomeia) | **fotografia em potencial**, mas de escopo alheio: vigia as funções de retenção, nenhuma das quatro desta fase. Não tocado |
| `p46_teardown_fixture.sql:293` — `r_cand <> 0` | contagem contra constante | escopo deliberado (resíduo tem de ser ZERO) |
| `sec05_08_smokes.sql:189,196` — `n <> 0`, `v_upd <> 0` | idem | escopo deliberado (vazamento de RLS tem de ser ZERO) |

**Nenhum smoke pina o corpo das quatro funções por md5** (`grep` por `md5`/`pin` nas linhas que as
citam: zero acertos). Ou seja: as quatro funções que este plano reescreve **não estavam sob
vigilância de nenhum portão**, e a vigilância nasceu aqui — é o `p49_trilha_smoke.sql`.

**Fecho: 288 linhas** (+6, todas no `p49_trilha_smoke.sql` novo). Classificadas:

| Linha | Forma | Classificação |
|---|---|---|
| `:320 IF v_i <> 2` | índice de laço | não é portão — escolhe qual fixture pula o UPDATE de status |
| `:512 a_hist_n IS DISTINCT FROM 0` | contagem contra constante | escopo deliberado: uma recusa que ESCREVE é pior que nenhuma recusa; 0 é invariante |
| `:536 b_hist_n IS DISTINCT FROM 1` | idem | escopo deliberado: a reabertura grava EXATAMENTE uma linha (duas = despacho duplicado) |
| `:560 c2_hist_n IS DISTINCT FROM 1` | idem | escopo deliberado (mesma razão) |
| `:651 l_cand <> 0 OR …` | idem | escopo deliberado (resíduo ZERO) |
| `:681 pass <> 13` | contador do gate | escopo deliberado, com o bump 8 → 13 registrado no cabeçalho |

As contagens **globais** da negativa (j) **não** são fotografia: são comparadas contra baseline
capturada na PRÓPRIA execução (`smoke49t.n_cand`, `n_hist`, `n_df`, `n_notif`, `n_netq`), que é a
forma que o CLAUDE.md prescreve. A asserção que decide é a de resíduo escopada às fixtures; a
global é o cinto, e a mensagem dela diz que uma divergência com resíduo zero é tráfego
concorrente.

## Ensaios ANTES dos applies

| Ensaio | Conteúdo (uma requisição, que aborta) | Resultado |
|---|---|---|
| 1 | `…000003` + `p49_trilha_smoke` + `p48_reabertura_smoke` + `RAISE 'ENSAIO_OK'` | abortou em **`ENSAIO_OK`**, sem `FAIL` |
| 2 | `…000004` + `p49_trilha_smoke` + `p48_rejeicao_triagem_smoke` + `p48_reabertura_smoke` + `RAISE 'ENSAIO_OK'` | abortou em **`ENSAIO_OK`**, sem `FAIL` |

## Regressão em PROD (Task 3)

| Smoke | Como | Resultado |
|---|---|---|
| `p49_trilha_smoke.sql` | `run` | **13 / 13** |
| `p48_reabertura_smoke.sql` | `run` | **13 / 13** (era 12; a (m) é nova) |
| `p48_rejeicao_triagem_smoke.sql` | `run` | **6 / 6** |
| `p45_motor_exclusao_smoke.sql` | `run` | verde (gate por `RAISE` interno; sem `FAIL`, saída 0) |
| `p42_revisao_art20_smoke.sql` | `run` | **10 / 10** |
| `p48_candidatura_encerrada_smoke.sql` | `run` | **8 / 8** |
| `p48_dedupe_smoke.sql` | `run` | **6 / 6** |
| `p48_cognitivo_notifica_smoke.sql` | `run` | **5 / 5** |
| `p48_prazo_reabertura_smoke.sql` | `run` | **6 / 6** |
| `oper31_rejeitar_candidatura_smokes.sql` | envelope que aborta | **`ENVELOPE ready=y`**, sem `FAIL` |

Nenhuma fixture dos 6 de regressão precisou de ajuste.

## O portão morde (medido nesta sessão) — cinco inversões, não três

O plano pedia três mutações. **Um smoke é fail-fast:** uma mutação que desfaz trava + limpeza +
vigente de uma vez só produz UM `FAIL`, e deixaria duas asserções sem prova **parecendo provadas**.
Cada conserto ganhou a sua inversão exata, aplicada sobre o corpo VIVO (ou sobre o corpo anterior
capturado antes da Task 1), em requisição atômica que aborta:

| Mutação | Inversão | Esperado | Saída |
|---|---|---|---|
| **M1** | `avancar_etapa` = corpo anterior à Task 1 (sem trava, sem limpeza, sem vigente) | `FAIL (a)` | `P49T FAIL (a): avançar um knockout (inscricao/rejeitado → avaliacao_assincrona) com claims de RH devolveu «ACEITO»` |
| **M2** | vivo **sem** a linha `NEW.etapa_justificativa := NULL;` | `FAIL (e)` | `P49T FAIL (e): candidaturas.etapa_justificativa sobreviveu à transição — reabertura=«Candidatura reaberta após revisão (Art. 20) …» decisão=«Decisão final registrada.» avanço=«… TOKEN_AVANCO_P49T»` |
| **M3** | vivo **sem** a linha `AND public.entrevista_analise_vigente(…)` | `FAIL (i)` | `P49T FAIL (i): com a bandeira já SUPERADA (superada_em preenchida) o avanço devolveu «23514:bloqueio: revise a bandeira …» e a etapa ficou entrevista_online` |
| **M4** | `registrar_decisao`: `'Decisão final registrada.'` → `p_justificativa` | `FAIL (d)` | `P49T FAIL (d): criterio_texto da decisão = «Decisao final sintetica … TOKEN_DECISAO_P49T …», esperado a constante «Decisão final registrada.»` |
| **M5** | `guard_rejeicao_auditada` = corpo anterior à Task 2 (sem o ramo JORN-34) | `FAIL (h)` | `P49T FAIL (h): com claims de RH, UPDATE só de status «rejeitado → em_analise» numa candidatura encerrada devolveu «ACEITO»` |

Em nenhuma delas a saída chegou a `MUTACAO_TERMINOU` — que é o marcador que apareceria se o portão
NÃO mordesse. **Nenhuma mutação vazou:** depois das cinco, o `md5(prosrc)` vivo das quatro funções
é exatamente o do pós-portão (`78317b07…`, `301ca807…`, `5042fa93…`, `dc695aa4…`), e o
`p49_trilha_smoke` volta a 13/13.

## Decisions Made

- **(c2) e (a3) foram acrescentadas ao smoke, e não são zelo.** A (c) que o plano pede roda
  `registrar_decisao` sobre fixture NÃO encerrada — onde a trava nunca é alcançada. Ela passaria
  idêntica com e sem a GUC `decisao`, e a exceção do D-35 ficaria **sem prova**. A (c2) roda sobre
  `triagem/finalizado`, o caso legado, e é ela que exercita a sanção. A (a3) executa o PATCH
  `etapa_atual='aprovado'` que a regra por «destino terminal» aceitaria — é a prova executada da
  afirmação que o `must_haves.truths` do plano faz e que nenhuma outra asserção cobria.
- **Cinco mutações, uma por conserto.** Ver a seção acima. Três mutações como o plano escreve
  provariam a trava, o D-47 e o JORN-34; a limpeza e a vigente ficariam sem prova própria porque a
  M1 aborta em (a) antes de chegar a (e) e (i).
- **A asserção de AUSÊNCIA do pós-portão é montada por concatenação.** O portão estático do plano
  (`node -e` sobre o arquivo da migration) reprova o arquivo se o literal
  `etapa_justificativa = p_justificativa` aparecer no trecho de `registrar_decisao` — e a própria
  asserção de ausência o faria aparecer. Escrita como `position('etapa_justificativa = ' ||
  'p_justificativa' IN v_rd)`, o que é asserido é idêntico, e um comentário inline registra o
  porquê. (Também por isso `registrar_decisao` não é a última função do arquivo: o `split` do
  portão termina no `CREATE OR REPLACE FUNCTION` seguinte.)
- **O pós-portão assere a ORDEM da limpeza, não só a presença dela.** Com `NEW.etapa_justificativa
  := NULL` antes do INSERT no histórico, o `criterio_texto` sairia NULL em toda transição: o
  conserto de privacidade viraria apagamento de transparência, e nenhuma asserção de PRESENÇA
  perceberia. O pós-portão compara `position()` e aborta o apply.
- **O pós-portão exige que `p_justificativa` CONTINUE indo para `decisao_final`.** O D-47 move o
  texto; uma implementação que o apagasse satisfaria as asserções de ausência e deixaria o RH sem
  a própria deliberação.
- **`main` mantida como branch de trabalho** — autorização explícita do orquestrador
  (`git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main`
  como base). Não registrado como desvio, ao contrário do 49-01.

## Deviations from Plan

### Registradas

**1. [Rule 1 — Bug no verify] O instrumento do envelope do `oper31` é zerado pelo próprio arquivo**
- **Found during:** Task 3
- **Issue:** o `<verify>` #2 da Task 3 anexa `RAISE EXCEPTION 'ENVELOPE ready=%',
  current_setting('smoke.ready', true)` e exige `ENVELOPE ready=y`. Mas a seção de CLEANUP do
  `oper31_rejeitar_candidatura_smokes.sql` (`:253`) termina com
  `SELECT set_config('smoke.ready', '', false)`. Lido DEPOIS do arquivo, o GUC está sempre vazio:
  medido, a primeira execução devolveu `ENVELOPE ready=` e o verify reprovaria um run que passou.
- **Fix:** trocado pelo sobrevivente equivalente `smoke.cand`, gravado na mesma linha lógica em que
  `smoke.ready` vira `'y'` (`:88-90`) e **não** zerado pela limpeza:
  `CASE WHEN coalesce(current_setting('smoke.cand', true), '') = '' THEN 'n' ELSE 'y' END`.
  A afirmação é idêntica («a fixture foi construída, logo as asserções rodaram em vez de SKIPar»).
- **Files modified:** nenhum (o envelope é montado em arquivo temporário; o smoke não foi tocado)
- **Verification:** `ENVELOPE ready=y`, sem `FAIL`
- **Committed in:** n/a (não alterou artefato)

**2. [Escopo — ampliação deliberada] Duas asserções e duas mutações além do plano**
- **Found during:** Tasks 1 e 3
- **Issue:** as asserções que o plano lista deixariam a sanção `decisao`, a regra «GUC e não
  destino», a limpeza JORN-17 e o filtro de vigente sem prova PRÓPRIA (a primeira por rodar sobre
  fixture não encerrada; as outras por fail-fast na mutação única).
- **Fix:** acrescentadas (c2) e (a3) ao smoke (13 asserções em vez de 11) e duas mutações (M2, M3).
- **Files modified:** `supabase/tests/p49_trilha_smoke.sql`
- **Verification:** 13/13 em PROD; M2 reprova em (e), M3 em (i)
- **Committed in:** `be798d66`, `efa2f44c`

**3. [Processo] Portão do tracer re-executou os verifies 2 e 3 por EQUIVALÊNCIA**
- **Found during:** portão de realimentação do tracer, depois da Task 1
- **Issue:** o `<verify>` #2 (ensaio) contém a migration, cujo pré-portão pina os md5 de ANTES —
  re-rodá-lo depois do apply aborta no pré-portão e produz falso negativo. O #3 começa por
  `p46apply migrate`, que por desenho recusa reaplicar uma `version` já no ledger.
- **Fix:** o portão re-executou o #1 literalmente, os dois smokes do #3 literalmente (8/8 e 13/13),
  e a asserção que o `migrate` faz — md5 do ledger lido de volta = md5 do arquivo em disco
  (`ba36d19c…`, 33659 octetos).
- **Files modified:** nenhum
- **Verification:** V1 OK; md5 batendo; smokes verdes
- **Committed in:** n/a

---

**Total deviations:** 3 (1 bug no verify do plano, 1 ampliação deliberada de escopo, 1 de processo).
Nenhuma correção das Regras 2–4 foi necessária: o estado vivo medido bateu integralmente com o que o
plano assume — os 5 escritores de `etapa_atual` são os previstos, a premissa A4 vale nos 11 sítios,
e a varredura de portões abriu em 282 como o plano registra.
**Impact on plan:** o artefato é MAIS forte que o pedido (13 asserções em vez de 11, 5 mutações em
vez de 3). Nenhuma mudança no que foi aplicado em PROD além do que o plano especifica.

## Medições vivas (D-49 / D-51) — o plano não foi ajustado para caber

| O que o plano assume | Medido em PROD (2026-09-22, só leitura) | Bate? |
|---|---|---|
| `entrevista_analise_vigente(timestamptz,text,jsonb)` existe (pré-condição) | `true` | sim |
| `avancar_etapa` sem trava de encerrada | confirmado (md5 `b1f9225f…`, 1534 octetos, corpo lido inteiro) | sim |
| escritores vivos de `etapa_atual` = 5, e só 2 movem encerrada | 5 exatos; `rejeitar_candidatura` já recusa; knockout não muda etapa | sim |
| GUCs `app.*` vivas = 2 (`rejeicao_sancionada` em 2 funções) | exatamente essas | sim |
| varredura de portões = 282 linhas na abertura | 282 | sim |
| a F4 do `p48_reabertura_smoke` é o único UPDATE de teste que move encerrada | sim — os outros 19 `UPDATE public.candidaturas` em `supabase/tests/` não mudam etapa sobre encerrada | sim |
| premissa A4: os 8 smokes rodam o UPDATE de status sem JWT | 11 sítios, todos `''` ou não definido | sim |
| `anon` com EXECUTE indevido nas funções de trigger | `true` em `avancar_etapa`, `guard_rejeicao_auditada` e `registrar_decisao`; `false` em `responder_revisao_decisao` | sim (fechados) |
| `status_analise` é `text` (a função de vigente recebe `text`) | `text NOT NULL` | sim |
| `tsc` ≤ 90 (D-53) | **89** (baseline congelada do hook = 96) | sim |

## Registrado, não consertado

- **Uma escrita de `etapa_justificativa` SEM mudança de etapa ainda seria consumida pela transição
  seguinte.** O trigger é `BEFORE UPDATE OF etapa_atual` e nem dispara. Medido no kickoff que a UI
  sempre manda a justificativa JUNTO com a etapa (`triagemService.ts:446-458`, que nunca omite a
  coluna do SET), então não há caminho de produto que produza esse estado hoje. Registrado como
  premissa no cabeçalho da migration, e o **D-46 (plano 49-12)** é o dono da limpeza do resíduo.
- **9 linhas vivas com `etapa_justificativa` não nula** (as 9 casando md5 com o `criterio_texto`
  mais recente) e **5 cópias da justificativa da decisão final no histórico, em 4 candidaturas**.
  Este plano fecha a TORNEIRA; a limpeza retroativa das 9 (D-46) e das 5 (D-47) é do **49-12**, com
  checkpoint do operador (D-54).
- **`candidaturas.etapa_justificativa` está na allowlist de exportação**
  (`exportAllowlist.ts:415`, `inventario:preservar_com_ressalva`) e no recibo de exclusão. Com o
  JORN-17 ela passa a ser tipicamente NULL — **e isso não retira nada do titular**: conferido que
  `historico_candidatura.criterio_texto` está na MESMA allowlist com a MESMA disposição
  (`:792`, `:806`), e é lá que o texto agora vive. O dado é movido, e as duas pontas do caminho
  estão na cópia dele.
- **`p43_previa_smoke.sql:667`** usa a forma de lista literal (`proname IN (...)`) que o CLAUDE.md
  nomeia como ponto cego. Fora do escopo desta fase (vigia funções de retenção). Não tocado.
- **`resend-webhook.test.ts`** continua abortando ao resolver `npm:svix@1.99.1`. Pré-existente, já
  em `WINDOWS.md`, e fora de escopo deste plano — que não roda nenhum teste Deno (é SQL puro).

## Known Stubs

Nenhum. O plano produz DDL aplicado em PROD e SQL de teste: não há componente, valor vazio
codificado, texto de placeholder nem fonte de dados não ligada. A constante
`'Decisão final registrada.'` **não é** placeholder — é o conteúdo deliberado da trilha
(D-47/BD-9), com o texto integral preservado na tabela-fonte, e o pós-portão assere as duas metades.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. O plano **remove**
superfície. As 6 mitigações declaradas ficaram provadas por execução:

| Threat | Disposição | Prova em PROD |
|---|---|---|
| T-49-06-01 (encerrada movida por PATCH ou tela) | mitigate | smoke (a), (a2), (a3); mutação M1 reprova |
| T-49-06-02 (GUC de sanção vazando na mesma transação) | mitigate | smoke (g): GUC vazia e UPDATE cru recusado depois de 3 transições sancionadas |
| T-49-06-03 (justificativa da decisão chegando ao titular, BD-9) | mitigate | smoke (d); mutação M4 reprova; pós-portão exige presença da constante E ausência da cópia |
| T-49-06-04 (reabrir encerrada só por status) | mitigate | smoke (h); mutação M5 reprova |
| T-49-06-05 (a trava recusando a própria reabertura, D-01) | mitigate | smoke (b) aceito; `p48_reabertura_smoke` 13/13 com a (m) provando a recusa sem GUC |
| T-49-06-06 (`CREATE OR REPLACE` apagando divergência viva) | mitigate | pré-portão md5 por função nas duas migrations (4 na segunda, incluindo a não modificada); pós-portão com presença E ausência |
| T-49-06-SC (supply chain) | mitigate | zero instalação de pacote; só SQL |

Adicional não previsto no `<threat_model>`, e fechado: `anon` tinha `EXECUTE` em `avancar_etapa`,
`registrar_decisao` e `guard_rejeicao_auditada` (grant direto do `pg_default_acl`, que
`REVOKE … FROM PUBLIC` sozinho não alcança). Revogado nas três, com o `anon` nomeado, e asserido
pelos dois pós-portões.

## Issues Encountered

- O verify do envelope do `oper31` era inexecutável como escrito (desvio 1). Sem a troca de
  instrumento, um run que passou seria reportado como reprovado.
- `tsc` segue em **89**, com teto 90 (D-53). Este plano não acrescentou nenhum erro — não toca
  `src/` nem `supabase/functions/`. A margem de 1 continua valendo para os planos seguintes.

## User Setup Required

None — nenhuma configuração de serviço externo. O token do Supabase já está no Keychain (serviço
"Supabase CLI", conta "supabase") e a pré-condição da Task 1 o confirmou por
`SET TRANSACTION READ ONLY`.

## Next Phase Readiness

**Pronto.** O que este plano entrega e quem o consome:

- **`49-07`, `49-10`, `49-14`, `49-22`** dependiam da trava e da GUC estarem no ar antes de mexer
  no funil: estão, e a GUC `app.transicao_sancionada` é a forma a reusar para qualquer transição
  nova sobre encerrada (declarar na RPC, zerar depois — nunca decidir por destino).
- **`49-10`** (as 3 RPCs de entrevista) tem o precedente da CHAMADA a
  `entrevista_analise_vigente` — o `avancar_etapa` é o primeiro dos 4 leitores a convergir para o
  predicado único; os outros 3 são dele.
- **`49-12`** herda as duas limpezas retroativas com a torneira JÁ fechada: D-46 (as 9 linhas de
  `etapa_justificativa`) e D-47 (as 5 cópias no histórico). A consulta de seleção do D-47 tem de
  casar **corrente E arquivo** (Correção 11).
- **`49-18`** (`p49_prova_prod.sql`) tem o que vigiar: o `p49_trilha_smoke.sql` é a especificação
  da trilha, com 13 asserções e prova de mordida; e as quatro funções, que antes deste plano não
  eram pinadas por NENHUM smoke, agora têm md5 registrados aqui para quem quiser pinar.
- **`49-19`** (a EF de notificação / o resíduo do `avanco`): a Observação do `49-03-SUMMARY`
  endereçada a este plano está **resolvida na origem** — a trava impede que um `avanco` sobre
  encerrada chegue ao histórico, então a linha de ledger `pendente` que a guarda da EF
  re-recusava sem convergir deixa de poder NASCER. Uma linha anterior ao deploy da EF v17 que
  ainda esteja `pendente` continua sendo re-lida e re-recusada (desfecho correto e barato, zero
  Resend); quem quiser fazê-la convergir mexe no branch de retry, não aqui.

**Atenção para os planos seguintes:** `tsc` em 89, teto 90 (D-53) — margem de um.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-22*

## Self-Check: PASSED

- `supabase/migrations/20260922000003_p49_trava_encerrada.sql` — FOUND
- `supabase/migrations/20260922000004_p49_trilha_justificativa_e_vigente.sql` — FOUND
- `supabase/tests/p49_trilha_smoke.sql` — FOUND
- `supabase/tests/p48_reabertura_smoke.sql` — FOUND · `supabase/tests/p48_rejeicao_triagem_smoke.sql` — FOUND
- commit `be798d66` — FOUND · commit `efa2f44c` — FOUND
- `commits: 2` MEDIDO por `git rev-list --count 4eb9512d..HEAD`, não narrado
- `<acceptance_criteria>` das 3 tasks re-executados: verdes (incluindo `pg_get_functiondef` das 4
  funções em PROD, a classificação dos escritores vivos e a dos 8 smokes)
- `<verification>` de plano re-executada: 2 migrations com md5 do ledger batendo, 10 smokes verdes
  (`p49_trilha` 13, `p48_reabertura` 13, `p48_rejeicao_triagem` 6, 6 de regressão, `oper31` em
  envelope), 5 mutações reprovando na asserção esperada, md5 vivo = pós-portão, `tsc` 89
