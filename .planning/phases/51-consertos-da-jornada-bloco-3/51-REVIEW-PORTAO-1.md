---
phase: 51-consertos-da-jornada-bloco-3
reviewed: 2026-10-09T07:32:46Z
depth: deep
diff_base: bb629816edb031c324b4140ad6899b00065c8b80
reviewed_head: 1c9a127682ca13d8a78313871fc0e17de5fa532a
scope: review adversarial bloqueante nº 1 do portão da Onda B do JORN-42 (51-16, Task 1). Escopo — o diff de código inteiro `bb629816..1c9a1276 -- . ':!.planning'` (63 arquivos — migrations 20261008000001..4, smokes, p51_ensaio/p51_mutacoes/p51_portao, EF notificar-candidato e _shared, cliente, docs/compliance) e o `51-16-PLAN.md`, lido como o programa que escreve em PROD. Lidos como contexto, fora da lista revisada — 51-CONTEXT, SUMMARYs 51-06..51-15, 50-REVIEW-TRACER-3, CLAUDE.md, p46apply.cjs, efdeploy.cjs, p50_enumera.cjs, e os corpos VIVOS (só leitura) de registrar_decisao, rejeitar_candidatura, solicitar_revisao_decisao, explicacao_rejeicao_origem, guard_rejeicao_auditada, avancar_etapa, trg_notif_transicao, trg_candidatura_analise, is_active_rh_user e a EF analise-candidato-individual. PROD só leitura (`set transaction read only`) ou em requisições que abortam. Re-executados — ensaio `--vistas` com 0002..0004 + p51_revisao_rejeicao_smoke (ENSAIO VERDE, vistas=igual, 51b=17/17, pins 04:anon=a68e4a6a…/plano=0a4996fe…); `p51_mutacoes.cjs` (controle verde; 31/31 mordem; nada persistiu); `p51_portao.cjs --auto-teste` (58 casos ok) e `--modo revisao` (RECUSADO por SEM REVISAO, como esperado); a enumeração do push do plano em modo seco (`enumeracao ok: 39 commit(s)`). Medido — ledger na 20261008000001; config_purga.modo = dry_run; A5 = 0; população rejeitada = 9; anon sem EXECUTE nas funções tocadas. Nada foi aplicado, publicado, empurrado ou commitado.
files_reviewed: 64
files_reviewed_list:
  - docs/compliance/__tests__/exportAllowlist.test.ts
  - docs/compliance/catalogo-vivo-44.json
  - docs/compliance/export-allowlist.json
  - docs/compliance/export-scope-rules.yaml
  - docs/compliance/pii-inventory.md
  - docs/compliance/pii-inventory.yaml
  - docs/compliance/recibo-exclusao.json
  - docs/compliance/sql/05-export-allowlist-drift.sql
  - docs/compliance/sql/gen-recibo-exclusao.cjs
  - e2e/explicacao-flow.spec.ts
  - scripts/p50_desfazer.cjs
  - scripts/p51_ensaio.cjs
  - scripts/p51_mutacoes.cjs
  - scripts/p51_portao.cjs
  - src/__tests__/guards/nomes-instrumentos.grep.test.ts
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.reaberta.test.tsx
  - src/features/avaliacao-cognitiva/__tests__/ravenService.status.test.ts
  - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
  - src/features/avaliacao-cognitiva/components/RavenCandidatoCard.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.conclusao.test.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/RavenCandidatoCard.test.tsx
  - src/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato.ts
  - src/features/avaliacao-cognitiva/services/ravenService.ts
  - src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts
  - src/features/avaliacao/components/AvaliacaoContainer.tsx
  - src/features/avaliacao/services/avaliacaoService.ts
  - src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
  - src/features/explicacao/components/SolicitarRevisaoCTA.tsx
  - src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx
  - src/features/explicacao/components/__tests__/SolicitarRevisaoCTA.test.tsx
  - src/features/explicacao/hooks/useExplicacao.ts
  - src/features/explicacao/services/__tests__/explicacaoService.test.ts
  - src/features/explicacao/services/explicacaoService.ts
  - src/features/privacidade/constants/reciboExclusao.generated.ts
  - src/features/privacidade/services/exportacaoService.ts
  - src/features/revisao/components/ContextoKnockoutRevisao.tsx
  - src/features/revisao/components/FilaRevisoesTable.tsx
  - src/features/revisao/components/OrigemRevisaoBadge.tsx
  - src/features/revisao/components/ResponderRevisaoDialog.tsx
  - src/features/revisao/components/__tests__/FilaRevisoesTable.test.tsx
  - src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx
  - src/features/revisao/hooks/__tests__/useResponderRevisao.test.ts
  - src/features/revisao/services/__tests__/revisaoService.test.ts
  - src/features/revisao/services/revisaoService.ts
  - supabase/functions/_shared/__tests__/email-templates.test.ts
  - supabase/functions/_shared/email-templates.ts
  - supabase/functions/_shared/exportAllowlist.ts
  - supabase/functions/_shared/reciboExclusao.ts
  - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
  - supabase/functions/notificar-candidato/index.ts
  - supabase/migrations/20261008000001_p51_raven_em_avaliacao_status.sql
  - supabase/migrations/20261008000002_p51_revisao_rejeicao.sql
  - supabase/migrations/20261008000003_p51_fila_tres_origens.sql
  - supabase/migrations/20261008000004_p51_motor_revisao_rejeicao.sql
  - supabase/tests/p44_export_drift_smoke.sql
  - supabase/tests/p45_motor_exclusao_smoke.sql
  - supabase/tests/p50_acesso_recrutador_smoke.sql
  - supabase/tests/p51_catalogo_revisao_rejeicao.sql
  - supabase/tests/p51_raven_status_smoke.sql
  - supabase/tests/p51_revisao_rejeicao_smoke.sql
  - .planning/phases/51-consertos-da-jornada-bloco-3/51-16-PLAN.md
findings:
  critical: 0
  warning: 9
  info: 16
  total: 25
status: issues_found
---

# Phase 51: Code Review Report — portão nº 1 da Onda B (JORN-42) e do programa de apply (51-16)

**Reviewed:** 2026-10-09T07:32:46Z
**Depth:** deep
**Files Reviewed:** 64 — os 63 arquivos de código do diff e o `51-16-PLAN.md`
**Status:** issues_found, com 0 crítico

## Summary

Parti da hipótese de que havia defeito e procurei, em especial, caminhos de escrita em PROD sem o portão e
portões incapazes de falhar. A memória do projeto registra que duas rodadas de conserto já trouxeram blocker
novo. **Não achei crítico.** Achei 9 warnings e 16 infos. O mais sério (WR-01) não é defeito de banco: as
travas de **ordem** do D-55 (migration → EF → cliente) existem só em prosa no plano, e o portão não as
verifica por máquina.

Conferi por execução ou leitura viva:

- **Prova D-12 no estado de agora.** O ensaio `--vistas` com 0002..0004 e o smoke p51b sai
  `ENSAIO VERDE … vistas=igual · smokes=[51b=17/17]` em 1431 ms. A evidência traz os pins do motor
  `04:anon=a68e4a6a47d9482f75d3326a8bf2b3e4,plano=0a4996feea738f7cfd25feda0ecd7904`, iguais aos do (C3/i) do
  `p45_motor_exclusao_smoke.sql:3276-3277`. A (j) roda contra a população viva:
  `9 (df=1, novo=8, sem_user=1, sem_ator=0, tabela=0)` — exatamente um caminho por rejeição.
- **Runner de mutações.** Resultado: `controle verde; 31/31 mutacoes mordem; nada persistiu`. A leitura
  final é igual à baseline (`ledger=["20261008000001"]`, `revisao_rejeicao=ausente`, `fixtures 0/0`).
- **Portão.** O `--auto-teste` passa nos 58 casos. O `--modo revisao` hoje recusa com
  `SEM REVISAO`, vermelho por construção.
- **Enumeração do push do plano (seca).** Com os `--caminhos`/`--assunto` exatos do plano, o resultado é
  `enumeracao ok: 39 commit(s) em ad2790a3..1c9a1276`. Nenhum ALHEIO.
- **Tabela nova.**
  - RLS ligada, zero policy, `REVOKE ALL` de PUBLIC, anon e authenticated.
  - `service_role` mantém o privilégio do `pg_default_acl` (medido). A EF lê.
  - O POS-PORTAO da 0002 fixa colunas, tipos, nulidade e constraints por nome.
- **ACL nominal de `anon`.** As cinco funções novas da 0002 e a nova da 0003 recebem `REVOKE … FROM anon`.
  A `listar_revisoes_decisao` é recriada (DROP + CREATE) e volta ao conjunto capturado por diferença.
  Medido em PROD: `anon=false` em todas as funções tocadas.
  - **Sobre o aperto do 51-06 em `get_avaliacao_status`, nenhum chamador `anon` vivo quebra.** O corpo
    anterior (`51-06-CORPO-ANTES.sql:34-37`) já levantava 42501 para quem não tinha `auth.uid()`, então
    `anon` nunca teve caminho de sucesso. Os únicos chamadores são telas autenticadas do candidato
    (`AvaliacaoContainer`, `useStatusRavenCandidato`); nenhuma EF a chama. O REVOKE só troca a origem do
    mesmo 42501.
- **Regra de dono.** É «existe `decisao_final` rejeitado e não revertido». Em todos os caminhos medidos
  (registrar/rejeitar, em_espera, revertida e re-rejeição), o predicado dá exatamente um caminho.
  - A **REVISAO-05** vale nos dois lados: a guarda da escrita (MB1) e o `pode_responder` da fila (MC3)
    mordem.
  - O `rejeitado_por` é o `ator` da linha de histórico. Esse ator vem de `auth.uid()` em `avancar_etapa`,
    nunca do chamador.
- **Reabertura sancionada.** A rota é `guard_rejeicao_auditada` → `transicao_sancionada = 'reabertura'` →
  `avancar_etapa` (trava do encerrado + justificativa de regressão; `rejeitado` é o último do enum, então
  toda reabertura da rejeição pelo RH é regressão com justificativa). Grava UMA linha de trilha com o
  revisor como ator.
- **D-36.** O despacho é idêntico ao de `trg_candidatura_analise`. A guarda da EF de análise
  (`status === 'rejeitado' && opcao_knockout_id != null`) não pula o knockout reaberto: o pg_net só entrega
  depois do COMMIT, com `em_analise`.
- **EF `notificar-candidato`.**
  - `Math.round` é coerente com `::bigint`: o truncamento do `Date.parse` em milissegundos preserva o lado
    do arredondamento.
  - O `pedido_id` é validado antes de qualquer leitura.
  - O link do D-09 passa por `montarUrlLogin`, que barra `//`, `\`, espaço e controle; o caminho é montado
    no servidor com um UUID já validado. Não há open-redirect.
- **PostgREST.** `pgrst_ddl_watch` e `pgrst_drop_watch` estão ativos em PROD. O OID novo de
  `listar_revisoes_decisao` recarrega o cache no COMMIT.

## Warnings

### WR-01: as travas de ordem do D-55 só existem em prosa — `--modo deploy` e `--modo push` passam com as migrations fora do ledger

**File:** `scripts/p51_portao.cjs:186-206` · `.planning/phases/51-consertos-da-jornada-bloco-3/51-16-PLAN.md:184,212,220-222`

**Issue:** Nos modos `deploy` e `push`, o portão confere a revisão, o pin, o código e a árvore. Não confere
que 0002..0004 estão no ledger, nem que as EFs já subiram antes do push. O `--aplicado "$PIN"` do
enumerador também não confere isso: ele só exige que os commits estejam contidos no pin. E o pin nasce
**antes** do apply (Passo 2, `git update-ref … HEAD ""`, com «ref existente = retomada»).

Cenário concreto: o Task 2 para no meio (por exemplo, 0003 recusada por `55P03` depois de 0002 no ar), ou
uma sessão retomada pula para o Task 3. Os três comandos do Task 3 passam todos os portões. O efeito:
- `exportar-meus-dados` com a allowlist 1.5.0, sem `revisao_rejeicao` viva, lança
  `leitura de revisao_rejeicao` (`exportar-meus-dados/index.ts:258-262`). A exportação LGPD quebra para todo
  titular.
- Com 0002 ausente, o push publica um `getExplicacao` que lança `DATABASE_ERROR`
  (`explicacaoService.ts:398-404, 451`). A página de explicação cai para todo rejeitado, inclusive os do
  ciclo `decisao_final`.

As duas travas («Task 2 verde», «MUST NOT push before the EF is live») estão marcadas
`verification: judgment`.

**Fix:** pôr no MESMO comando de cada deploy e do push uma leitura só-leitura do ledger, que recuse se faltar
versão ou se o md5 divergir. Por exemplo, um `--modo deploy|push` do `p51_portao.cjs` que chame
`node p46apply.cjs sql "set transaction read only; select json_object_agg(version, md5(statements[1])) …
where version in ('20261008000002','20261008000003','20261008000004')"` e compare com o md5 dos arquivos.
No push, exigir também os três logs `efdeploy: OK … status=ACTIVE`, cada um com horário posterior ao do
último `migrate`.

### WR-02: o e-mail do D-09 vai ao ar antes do push, sem a pré-validação do push

**File:** `.planning/phases/51-consertos-da-jornada-bloco-3/51-16-PLAN.md:220-222` · `supabase/functions/notificar-candidato/index.ts:688-690`

**Issue:** O redeploy de `notificar-candidato` passa a mandar, em toda rejeição, «Você pode pedir que uma
pessoa da nossa equipe revise esta decisão», com o botão «Ver a explicação e pedir revisão». O cliente vivo
(`origin/main = ad2790a3`) ainda é o de antes do 51-12. Para knockout e rejeição pelo RH, ele diz «não há uma
revisão a pedir por aqui» e não tem CTA.

O plano só valida o push (portão `--modo push` + enumerador) **depois** dos três deploys. Se o push for
recusado — por um ALHEIO, um `origin/main` que se mexeu, ou qualquer `PORTAO RECUSADO` —, o plano manda
PARAR. A contradição fica no ar por tempo indeterminado, sem passo de reversão da EF.

**Fix:**
- Rodar a cadeia de pré-condições do push em modo seco **antes** do primeiro `efdeploy` e só seguir se ela
  passar: `p51_portao --modo push`, `git fetch`, `ls-remote = origin/main`, `merge-base` e `p50_enumera`, sem
  o `git push`.
- Encadear o deploy de `notificar-candidato` e o push no mínimo de tempo.
- Escrever no «Desfazer» o redeploy da v18 de `notificar-candidato` para o caso de o push não sair.

### WR-03: `getExplicacao` lança em qualquer erro da RPC nova e derruba também o caminho `decisao_final`

**File:** `src/features/explicacao/services/explicacaoService.ts:380-404, 451`

**Issue:** `getEstadoRevisaoRejeicao` é a primeira chamada de toda página de explicação e lança
`DATABASE_ERROR` em qualquer erro, inclusive função inexistente (`PGRST202`/`42883`). Isso amarra o cliente
inteiro do Art. 20 à existência da 0002: um push fora de ordem (WR-01), um desfazer (WR-04) ou uma falha
transitória dessa RPC tiram do ar também a explicação das rejeições por `decisao_final`, que não dependem
dela.

O docblock justifica a escolha («engolir a falha poderia esconder do titular um pedido que ele fez»). Mas
o efeito colateral sobre a origem `humana` não é necessário.

**Fix:**
- Distinguir «RPC ausente» (`PGRST202`/`42883`) de erro de banco. Na ausência, cair no fluxo anterior
  (`decisao_final` → `explicacao_rejeicao_origem`).
- Ou ler `decisao_final` em paralelo e só propagar o erro quando não houver linha `rejeitado` dona.

O comportamento na rejeição fora da decisão final continua fail-closed.

### WR-04: o «Desfazer» do plano não fixa a ordem inversa (cliente → EF → banco)

**File:** `.planning/phases/51-consertos-da-jornada-bloco-3/51-16-PLAN.md:102-107`

**Issue:** O desfazer descrito restaura `listar_revisoes_decisao` com o tipo de retorno antigo e, com a tabela
vazia, faz `DROP` das RPCs, triggers e tabela. Não diz que o cliente e as EFs têm de voltar ANTES.

Depois do Task 3, uma corretiva aplicada primeiro causa duas quebras:
- O `DROP` de `estado_revisao_rejeicao` derruba a página de explicação de todo rejeitado (WR-03).
- Sem `revisao_rejeicao`, `exportar-meus-dados` 1.5.0 lança para todo titular (WR-01).
- A fila sem `origem`/`pedido_id` deixa a `key` React indefinida e manda toda resposta para
  `responder_revisao_decisao`.

**Fix:** escrever no «Desfazer» a sequência inversa do D-55, com checkpoint:
1. push do cliente anterior, por sha, com o marcador ausente conferido;
2. redeploy das três EFs na versão anterior;
3. só então a migration corretiva.

E capturar em `51-16-CORPOS-ANTES.sql` também as versões vivas das três EFs.

### WR-05: o `knockout_rate` volta a contar o knockout revertido que depois é rejeitado na decisão final

**File:** `supabase/migrations/20261008000003_p51_fila_tres_origens.sql:780-788` (CTE `ko`)

**Issue:** O D-35 manteve `motivo_rejeicao = 'knockout_automatico'` e `opcao_knockout_id` na reabertura. O
filtro novo é `motivo = 'knockout_automatico' AND status = 'rejeitado'`.

Medido no corpo vivo de `registrar_decisao`: ele **não** escreve `motivo_rejeicao`. O caminho é
knockout → pedido → revertida → `triagem` → … → `registrar_decisao(rejeitado)`. Ele termina com status
`rejeitado` e motivo `knockout_automatico`, e a candidatura volta a contar como knockout no funil, embora
quem a rejeitou tenha sido uma pessoa na decisão final.

O mesmo estado faz `explicacao_rejeicao_origem` e `explicacao_rejeicao_automatica` (vivas) classificarem a
candidatura como `automatica`. O cliente novo não é afetado, porque lê `decisao_final` antes. Também faz a
guarda da EF de análise tratá-la como knockout. A cláusula (o) só exercita a reabertura, não a rejeição
posterior.

**Fix:** no CTE `ko`, contar só quando a rejeição CORRENTE é o knockout. Por exemplo,
`… AND c.status = 'rejeitado' AND NOT EXISTS (SELECT 1 FROM public.revisao_rejeicao rr WHERE
rr.candidatura_id = c.id AND rr.origem = 'automatica' AND rr.veredito = 'revertida')`. Ou usar a linha de
rejeição mais recente com `auto_rejeitado`. Acrescentar à (o) a fixture «revertida → registrar_decisao
rejeitado», com uma mutação que morda.

### WR-06: o alerta de prazo novo trata `em_espera` como nova decisão — o contrário do A5 do laço irmão

**File:** `supabase/migrations/20261008000003_p51_fila_tres_origens.sql:922-925`

**Issue:** `NOT EXISTS (… decisao_final d WHERE d.em > rr.reaberta_em)` bloqueia o alerta com QUALQUER upsert
em `decisao_final` depois da reabertura, inclusive `em_espera`. No laço de `decisao_final`, o A5 da 48 diz
que `em_espera` não é nova decisão e não impede o alerta.

Cenário: rejeição pelo RH em `decisao_final` → revertida → o RH registra `em_espera` e esquece. O prazo
vence sem alerta nenhum. O 51-10 levou isso ao 51-16, mas o plano não traz a pergunta entre as (a)–(f).

**Fix:**
- Acrescentar `AND d.decisao IN ('aprovado','rejeitado')` ao `NOT EXISTS`, alinhando ao A5, com cláusula e
  mutação na (p).
- Ou registrar a assimetria como decisão do operador, explícita no SUMMARY.

### WR-07: `p48_prazo_reabertura_smoke` vai reprovar com diagnóstico falso depois do apply (WINDOWS #90, aberta)

**File:** `supabase/tests/p48_prazo_reabertura_smoke.sql:68-79, 225-226, 306-307`

**Issue:** Este é o modo de falha que o CLAUDE.md chama de «contagem contra constante → reprova trabalho
correto com diagnóstico falso».
- A baseline conta só `decisao_final` vencido sem alerta (`v_real <> 0`).
- A (a) exige `a_q_total = 1` sobre TODA a `net.http_request_queue`.

Depois do apply, entre o vencimento de um `revisao_rejeicao` revertido e o próximo cron das 11:00 UTC, a
varredura do smoke enfileira 2. A falha sai como `P48P FAIL (a): 1 … e 2 no total (esperado 1 e 1)`: ela
acusa a fixture e não diz que há um alerta real pendente.

O Task 2 roda esse smoke logo após o apply, com a tabela vazia, e passa. A armadilha fica para todo rodar
posterior (51-17, regressões).

**Fix:**
- Estender a baseline `$baseline$` com o MESMO predicado do segundo laço (`revisao_rejeicao` reaberta,
  vencida, sem alerta, não encerrada, na `etapa_reabertura`, sem `decisao_final` posterior), com a mesma
  mensagem «trabalho do cron».
- Ou filtrar `a_q_total` pelos ids da fixture, como a (p) do p51 já faz.

Provar que a (a) ainda morde.

### WR-08: o «catálogo vivo = acréscimo» do Task 2 é um teste de substring sobre o arquivo inteiro

**File:** `.planning/phases/51-consertos-da-jornada-bloco-3/51-16-PLAN.md:197` (segundo `node -e` do verify 4)

**Issue:** O verify lê tipo, nulidade e ordinal de cada coluna viva, mas só testa
`JSON.stringify(catalogo).includes(nome)`. Medido no `catalogo-vivo-44.json`:
- `id` aparece 926 vezes;
- `candidatura_id`, 42;
- `veredito`, `resultado`, `reaberta_em`, `prazo_nova_decisao_em` e `alerta_prazo_enviado_em` existem em
  outras tabelas.

O teste não pega:
- tipo ou nulidade divergentes;
- coluna do acréscimo que não foi ao ar (só confere vivo ⊆ arquivo).

O `fails_when` promete «the column measured inside the rehearsal is not what went live», mais do que ele
mede. O risco real é baixo — o POS-PORTAO da 0002 fixa `c_cols` e o drift roda antes —, mas é um portão que
se apresenta como prova de igualdade sem medir igualdade.

**Fix:** comparar com o bloco do acréscimo «51-15» por igualdade de conjunto, nas duas direções, de
`(tabela='revisao_rejeicao', coluna, tipo, nulidade, ordinal)`. Provar a mordida renomeando uma coluna
dentro de um ensaio.

### WR-09: a reabertura do registro novo não tem o D-23 — quem teve a rejeição revertida a refaz na hora

**File:** `supabase/migrations/20261008000002_p51_revisao_rejeicao.sql:532-607` · `rejeitar_candidatura` e `registrar_decisao` vivos

**Issue:** No ciclo `decisao_final`, o D-23 da 48 trava o decisor revertido: ele não registra a nova decisão
(«no mesmo espírito do revisor ≠ decisor»). No caminho novo não há trava equivalente.

Cenário: A rejeita na triagem → o candidato pede → B reverte → `triagem` → A chama `rejeitar_candidatura`
de novo, minutos depois. Nada recusa: `rejeitar_candidatura` não consulta `revisao_rejeicao`, e o D-23 de
`registrar_decisao` só olha `decisao_final`/`decisao_final_historico`. A revertida do Art. 20 fica oca, e o
ciclo pode se repetir.

Esta é a porta de mão única do D-01: a escolha precisa ser do operador antes do apply, não descoberta
depois.

**Fix:**
- Levar ao checkpoint como pergunta nomeada.
- Se a resposta for estender o D-23, a guarda mora em `rejeitar_candidatura` (recusar
  `auth.uid() = rr.rejeitado_por` de um `revisao_rejeicao` revertido da mesma candidatura). Isso mexe no
  caminho que o POS da 0002 exige byte-idêntico, então é migration própria com PRE-PORTAO.

## Info

### IN-01: o recibo omite o pedido não respondido sem `decisao_final` (WINDOWS 93)

**File:** `supabase/functions/executar-direito-titular/index.ts:1369`

**Issue:** `tem_decisao_registrada` soma só RESPOSTAS (`revisao_rejeicao_resultado`). Um knockout com pedido
pendente que pede exclusão não ganha a linha de decisão, e a linha do pedido (origem, etapas, datas) fica.
A linha `sempre` «Ficou guardado como registro do processo» cobre isso de forma frouxa.

**Fix:** decidir no portão. Para ser exato, contar pedidos em `tombstone_decisao_final` só para o booleano,
não para a raspagem.

### IN-02: a exceção do `p46_purga_smoke` por `run` sem portão é ramo morto

**File:** `51-16-PLAN.md:55,196`

**Issue:** O 51-13 mediu o purga verde no ensaio (1349 ms, sem timeout), então a condição da exceção não
existe. Mesmo assim, o plano carrega uma escrita em PROD por `run` (COMMITA) sem portão no mesmo comando.

**Fix:** remover a exceção do plano.

### IN-03: `p44_export_drift_smoke` roda por `run` (COMMITA) sem guarda de só-leitura

**File:** `51-16-PLAN.md:197`

**Issue:** O arquivo é só-leitura hoje, conferido, mas nada impede que uma edição futura escreva.

**Fix:** pôr `SET TRANSACTION READ ONLY;` como primeira instrução do arquivo, ou rodá-lo pela via `sql`.

### IN-04: no pós-apply, MB4/MB6/MD2 seguram AccessExclusiveLock na `revisao_rejeicao` viva

**File:** `scripts/p51_mutacoes.cjs:567-588`

**Issue:** As mutações fazem GRANT, CHECK e `ALTER TABLE … DROP CONSTRAINT` na tabela viva, dentro de
requisições que abortam. O lock dura a requisição. É aceitável porque roda antes do push (sem tráfego), mas
não pode ser repetido depois do Task 3.

**Fix:** anotar isso no plano.

### IN-05: guardas da RPC de resposta sem cláusula nem mutação

**File:** `20261008000002…:546-551,575`

**Issue:** Sem cláusula de smoke nem mutação:
- a guarda de vigência da revertida («nada a reabrir», 22023, `v_cur`/etapa);
- o reset de `app.transicao_sancionada` depois da reabertura (vazamento da sanção).

**Fix:** acrescentar cláusulas e mutações para os dois.

### IN-06: a página do caminho novo fica presa no estado «reaberta»

**File:** `20261008000002…:423` · `ExplicacaoCandidatoPage.tsx:212`

**Issue:** Depois de reaberta e de uma nova decisão (aprovado/finalizado), `estado_revisao_rejeicao` segue
devolvendo o pedido antigo, porque a rejeição corrente não mudou. A página mostra «reaberta» com prazo
vencido para sempre. No ciclo `decisao_final`, `registrar_decisao` zera o ciclo.

**Fix:** devolver o pedido só enquanto a candidatura não tiver nova decisão terminal depois de
`reaberta_em`.

### IN-07: as marcas `descartada_*` herdadas pelos 3 knockouts de teste não têm leitor vivo

**File:** `20261008000002…:60-65`

**Issue:** Medido: nenhum leitor em `src/`, em `supabase/functions` (fora da allowlist do export), em funções
ou em views. Se um dos 3 for revertido, a análise nova herda a marca. O efeito é só de rótulo na cópia do
titular.

**Fix:** levar ao operador como está.

### IN-08: alerta de prazo duplicado ou suprimido em casos raros

**File:** `20261008000003…:869-906, 913-953`

**Issue:** Dois casos:
- `decisao_final` revertida → re-rejeição pelo RH → revertida no caminho novo: o laço 1 alerta pelo prazo
  ANTIGO do ciclo `decisao_final`.
- Duas reaberturas da mesma candidatura com prazo no mesmo dia colidem na chave
  `montarDedupeKeyRhPrazo(candidatura, ciclo, user)`.

**Fix:** registrar os dois casos.

### IN-09: a fila manda origem nula ou desconhecida para a RPC da decisão final

**File:** `revisaoService.ts:358`

**Issue:** `origem` nula ou fora do vocabulário vai para `responder_revisao_decisao` pelo `candidaturaId`.
Isso é fail-open para o caminho legado.

**Fix:** recusar no cliente a origem fora das três.

### IN-10: forma desconhecida do estado cai no fluxo antigo e reabre o CTA

**File:** `explicacaoService.ts:351-371, 451-452`

**Issue:** Uma forma desconhecida em `coagirEstadoRevisaoRejeicao` vira `null`, e `getExplicacao` cai no
fluxo antigo. Para knockout ou RH, esse fluxo mostra o CTA como se não houvesse pedido, escondendo a
resposta existente. É o contrário do que o docblock promete.

**Fix:** tratar forma inválida como erro, e não como «não se aplica».

### IN-11: A5 e os logs do Task 3 podem estar velhos

**File:** `51-16-PLAN.md:212,225`

**Issue:**
- O A5 é medido só no Task 1 e não é remedido imediatamente antes do deploy de `notificar-candidato`.
- O verify 1 do Task 3 lê `${TMPDIR}/p51_16_ef_*.log` e passa com um log de tentativa anterior.

**Fix:** remedir o A5 antes do deploy e apagar os logs antes de cada deploy.

### IN-12: `51-16-CORPOS-ANTES.sql` não guarda os comentários

**File:** `51-16-PLAN.md:182`

**Issue:** O arquivo não captura `obj_description`. Uma corretiva que restaure os corpos perde os
comentários, e os PRE-PORTÕES futuros (P51-03 e afins) recusam função sem comentário.

**Fix:** capturar os comentários junto com os corpos.

### IN-13: a cópia do titular exporta ids e etapas que a allowlist da página diz «nunca» (WINDOWS 91)

**File:** `export-scope-rules.yaml` (bloco PHASE 51)

**Issue:** A cópia exporta `etapa_rejeitada`, `etapa_reabertura` e `historico_rejeicao_id`. A allowlist de
`estado_revisao_rejeicao` diz «nunca … ids ou etapas» ao titular. A divergência está registrada, mas a
decisão está pendente.

**Fix:** levar ao operador.

### IN-14: a revertida não olha a exclusão do titular

**File:** `20261008000002…:532-606`

**Issue:** Não há guarda para `candidaturas.deleted_at` nem para titular já anonimizado. Uma revertida
reabre a candidatura e despacha a análise de IA (D-36) sobre quem já foi excluído.

**Fix:** recusar a revertida quando o titular já foi excluído.

### IN-15: a regra de timeout contradiz a proibição de re-apply

**File:** `51-16-PLAN.md:55,186`

**Issue:** O plano diz «`55P03`/`57014` = fila, repetir depois», mas também diz «MUST NOT re-apply after a
refused apply». Com 0002 no ar e 0003 em timeout, o executor não sabe se pode repetir.

**Fix:** dizer que o timeout repete o MESMO arquivo, pela mesma via.

### IN-16: `solicitar_revisao_decisao` ainda tem EXECUTE para `anon`

**File:** `solicitar_revisao_decisao` (vivo, fora do diff)

**Issue:** É herança do `pg_default_acl`. A guarda de titular torna isso inofensivo, mas destoa da regra
nominal das RPCs novas.

**Fix:** fazer o REVOKE numa migration futura.

---

_Reviewed: 2026-10-09T07:32:46Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
