---
phase: 46-purga-automatica-dry-run-live
verified: 2026-08-23T11:35:00-03:00
verifier: gsd-verifier (goal-backward, postura adversarial FORCE, RE-VERIFICACAO)
status: gaps_found
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  previous_portao: 3.5/5
  gaps_closed:
    - "A prova ponta a ponta das migrations aplicadas hoje (0014 e 0015) — o smoke rodou e ficou 27/27, e eu CONFIRMEI o run pelo catalogo, nao pelo documento"
    - "RETEN-05 — a assercao (m) exercitou a regra sobre linha retrodatada em PROD: a de fora da janela morreu, a de dentro sobreviveu, o ledger registrou, e nenhuma outra tabela foi tocada"
    - "PURGA-04 / SC#2 — a recusa do flip contra o corpo NOVO (md5 e10786bd) executou: sete recusas 22023, uma aceitacao, o kill switch irrecusavel, e exatamente uma linha de trilha"
  gaps_remaining:
    - "cron.job_run_details para o jobid 6 continua em ZERO linhas — 0 de 14 noites"
    - "Criterio 2 do portao destrutivo continua VIOLADO para os applies de 46-05/06/07"
    - "HI-01 e HI-02 da 46-REVIEW-4 continuam abertos (conferidos por mim, nao lidos do review)"
    - "Fixture sintetica de PII residente em PROD sem decisao datada de destino"
  regressions: []
overrides:
  - item: "Criterio 2 do portao de fase destrutiva — review bloqueante ANTES do apply em PROD"
    aplica_a: "os applies dos planos 46-05, 46-06 e 46-07 (commits aa96052, bd30684, 0f44e53, 5351bde), todos anteriores ao 13e5302, que e o review retroativo"
    decisao: aceito
    decidido_por: "Fernando (operador), que delegou explicitamente a decisao ao agente em 2026-08-23; registrado pelo agente na mesma sessao"
    data: 2026-08-23
    razao: >
      Desvio CONSUMADO: nenhum trabalho futuro o desfaz, porque o que o criterio exige e
      uma ORDEM entre dois eventos que ja aconteceram. Mantê-lo aberto indefinidamente
      transformaria a fase num estado impossivel de fechar, sem tornar o sistema mais
      seguro em nenhum grau.
      Tres fatos sustentam a aceitacao, e nenhum deles e "o smoke passou" — o ROADMAP
      antecipa e proibe esse argumento: (1) o review retroativo FOI feito e ACHOU o
      defeito real (BL-01), entao o resultado de seguranca que o criterio existe para
      produzir foi produzido, apenas tarde; (2) o BL-01 so seria consultado no flip de
      2026-09-06, que ainda nao ocorreu — o desvio nao teve janela de dano; (3) para os
      applies de HOJE (migrations 0014 e 0015) o criterio foi SATISFEITO, com o review
      b7d4a18 precedendo o apply 7a9976d, o que demonstra a pratica corrigida e nao
      apenas prometida.
    o_que_esta_aceitacao_NAO_cobre: >
      Nao cobre o flip para live, que continua exigindo os cinco criterios integralmente e
      continua sendo checkpoint do operador. Nao cobre nenhum apply futuro desta fase. E
      nao converte a fase em `passed`: o gap do agendador (0 de 14 noites) segue aberto e
      e independente deste item.
mudou_desde_a_verificacao_anterior: >
  Uma coisa so: o smoke rodou em PROD as 11:26:40-03 e ficou 27/27 — confirmado por mim
  no catalogo (pg_stat_statements nao registra statement que levanta excecao, e o bloco
  (z) esperado=27 tem calls=3 contra calls=3 dos blocos (d)/(e), identidade que so vale
  se todo run que chegou ao (d) tambem passou pelo (z)) — o que fecha PURGA-04, RETEN-05
  e a metade de despacho de PURGA-01, movendo o score de 3/5 para 4/5. O agendador
  continua com ZERO disparos e o portao destrutivo continua em 3.5/5.
veredito: >
  O CERCO ESTA ARMADO, O GATILHO NAO FOI PUXADO, E AGORA O CERCO FOI EXERCITADO — mas o
  AGENDADOR AINDA NUNCA DISPAROU. O smoke que faltava rodou contra PROD as 11:26:40-03 e
  ficou 27/27, e eu nao aceitei o documento: reproduzi o run pelo catalogo do Postgres.
  Com ele, as tres coisas que so um teste executado podia provar passaram a estar
  provadas — o portao do flip recusa pelos criterios certos com o corpo NOVO da 0014
  (sete recusas 22023, uma aceitacao, kill switch irrecusavel, exatamente uma linha de
  trilha), RETEN-05 MORDE sobre linha retrodatada sem tocar em mais nada, e o ramo `live`
  ENFILEIRA o despacho. O envelope devolveu tudo: medi 18 grandezas depois do run e as 18
  estao identicas — `config_purga` inteira por `to_jsonb`, T0 = 2026-08-22 20:03:14.148963-03,
  4 execucoes / 10 itens / 1 linha de trilha / 31 candidatos / 20 candidaturas / 37 contas /
  12 notificacoes / 5 curriculos / 13 linhas de historico, fila do pg_net em 0, ZERO resposta
  HTTP em 18 h, os 8 titulares de fixture com PII intacta e nenhum gatilho deixado desligado.
  O QUE NAO MUDOU: `cron.job_run_details` para o jobid 6 tem ZERO linhas — a varredura
  noturna nunca rodou, as 4 execucoes do ledger sao manuais, e 0 de 14 noites decorreram.
  E o criterio 2 do portao destrutivo segue violado para os applies de 46-05/06/07, o que
  um smoke verde de hoje nao retro-conserta. "O dado expira sozinho" continua sendo uma
  propriedade da CONFIGURACAO e ainda nao e uma observacao do AGENDADOR. Isso muda amanha
  as 00:00-03, sem trabalho nenhum — ou nao muda, e ai e defeito.
score: 4/5
behavior_unverified: 0
overrides_applied: 0

portao_fase_destrutiva:
  total: 3.5/5
  delta_desde_a_verificacao_anterior: "nenhum — o smoke fechou must-haves, nao criterios do portao"
  1_verification_md_com_veredito:
    status: satisfeito
    peso: 1.0
    por: evidencia
    nota: "Este arquivo. `status: gaps_found`, nunca `draft`, nunca ausente."
  2_code_review_bloqueante_antes_do_apply:
    status: parcialmente_satisfeito
    peso: 0.5
    por: evidencia
    satisfeito_para: >
      migrations 20260823000014 e 20260823000015. Ordem conferida por mim hoje em
      `git show -s --format=%cI`: 46-REVIEW-2 (13e5302, 02:23:42) -> 46-REVIEW-3
      (56485db, 03:31:24, 2 BLOCKERS introduzidos pelo proprio conserto) -> 46-REVIEW-4
      (b7d4a18, 04:23:14, 0 blockers) -> APPLY (7a9976d, 04:29:09). O review precede o
      apply por 6 minutos.
    violado_para: >
      os applies dos planos 46-05 (aa96052, 00:50:55), 46-06 (bd30684, 01:30:39) e 46-07
      (0f44e53, 02:05:24 e 5351bde, 02:07:45) sao TODOS anteriores a 13e5302 (02:23:42),
      cujo assunto de commit diz `code review retroativo de 46-05/06/07`. O review daquelas
      migrations foi DEPOIS, e ele achou 1 BLOCKER real (BL-01) que so foi corrigido pela
      0014. Rodar o smoke hoje nao move um review para antes de um apply de ontem.
    fechavel_por: "nada. E um desvio CONSUMADO. So pode ser aceito explicitamente pelo operador (override datado) ou registrado como divida de processo do M8."
  3_assercoes_negativas:
    status: satisfeito
    peso: 1.0
    por: evidencia
    nota: "Reproduzidas por mim HOJE, depois do smoke, contra PROD — 18 grandezas, todas identicas. Ver secao `Asseracoes Negativas`."
  4_zero_no_verify:
    status: satisfeito
    peso: 0.5
    por: argumento
    nota: "`--no-verify` nao deixa rastro forense no git; e INFALSIFICAVEL a partir do repositorio. Medi de novo hoje: `npm run -s lint | grep -c 'error TS'` = 96, exatamente a baseline congelada do hook. Corroborado, nao provado."
  5_dry_run_pela_mesma_query:
    status: satisfeito_com_ressalva
    peso: 0.5
    por: evidencia
    nota: >
      MECANISMO provado e agora EXERCITADO end-to-end: a varredura chama
      `public.anonimizar_candidato(id, true)` — a MESMA funcao do delete real, cujo corpo
      COMPLETO executa e so entao e derrubado pelo terminador P45DR — e 4 itens em PROD
      carregam `relato_dry_run` produzido por esse caminho. RETEN-05 e UM UNICO `DELETE`,
      contado por GET DIAGNOSTICS e revertido pelo ERRCODE P46RN fora de `live`, e a
      assercao (m) provou HOJE que ele morde. RESSALVA INALTERADA: os DADOS contra os quais
      isso e exercitado sao 100% FIXTURE SINTETICA — os 4 titulares elegiveis sao todos
      `4601b000-…`, e as linhas retrodatadas de (m) sao plantadas pelo proprio bloco.
      Nenhuma pessoa real jamais entrou no conjunto elegivel, e nao pode: a notificacao mais
      velha de PROD tem 0,77 mes contra uma janela de 24.

gaps:
  - truth: "SC#1 — O cron de purga roda em PROD por um periodo documentado em dry_run antes de qualquer execucao real"
    status: partial
    reason: >
      A metade do PREDICADO esta verificada por evidencia E AGORA POR EXECUCAO (a assercao
      (m) rodou a varredura em `live` dentro do envelope e mediu o despacho). A metade do
      AGENDADOR nao existe: medi hoje `count(*) FROM cron.job_run_details WHERE jobid = 6`
      = **0**, com 2 693 linhas na tabela no total — a extensao funciona, os tres vizinhos
      rodam, este job nunca disparou. `cron.timezone = GMT`, entao `0 3 * * *` e 00:00
      America/Sao_Paulo; o job foi armado as ~01:30-03 de hoje, DEPOIS do horario de hoje,
      logo a primeira varredura automatica da historia deste sistema e 2026-08-24 00:00-03.
      As 4 linhas de `purga_execucoes` vieram de chamadas MANUAIS. Zero de 14 noites.
    requirements: [PURGA-01, PURGA-03]
    artifacts:
      - path: "cron.job jobid 6 (`purga-retencao-sweep`)"
        issue: "active = true, schedule `0 3 * * *`, command ` SELECT public.varrer_purga_retencao(); `, user postgres — instalado, pinado por md5 na assercao (a), e NUNCA executado"
    fecha_por: "passagem do tempo — nao ha trabalho a fazer"
    missing:
      - "Deixar a noite de 2026-08-24 00:00-03 passar (~12,5 h a partir desta verificacao) e conferir POR EXECUCAO: `SELECT jobid, status, return_message, start_time, end_time FROM cron.job_run_details WHERE jobid = 6 ORDER BY start_time DESC;` — esperado >= 1 linha com status `succeeded`"
      - "Cruzar com o ledger: esperado `modo_vigente='dry_run'`, `veredito='dry_run'`, `elegiveis=4`, `processados=0`, `notificacoes_expurgadas=0`, e 4 itens novos com `relato_dry_run` NAO NULO"
      - "Repetir por 14 noites. O periodo so fecha em ~2026-09-06, e o proprio portao do flip (criterio 1: dias >= 14) recusa `live` ate la — medido por mim hoje: dias = 0"

  - truth: "Portao de fase destrutiva, criterio 2 — code review bloqueante ANTES do apply em PROD"
    status: failed
    reason: >
      O ROADMAP §"Portao de fase destrutiva" trata os cinco itens como EXIT CRITERION de
      roadmap, com as palavras "nao sao opcionais e nao sao substituiveis por 'o smoke
      passou'". Quatro applies em PROD desta fase (aa96052 00:50, bd30684 01:30, 0f44e53
      02:05, 5351bde 02:07) precederam o review que os cobria (13e5302, 02:23). Isso e
      exatamente a forma do erro da P39 que originou o portao — e desta vez o review
      retroativo ACHOU um BLOCKER real (BL-01: o recorte do portao do flip contava como
      ensaio uma execucao que nao ensaiou). O smoke verde de hoje prova que o CONSERTO
      funciona; ele nao move o review para antes do apply.
    requirements: []
    artifacts:
      - path: "git log (ordem de commits da Phase 46)"
        issue: "4 applies em PROD anteriores ao review que os cobre, por 16 a 93 minutos"
    fecha_por: "nada — desvio consumado"
    missing:
      - "Decisao explicita do operador: aceitar o desvio via `overrides:` datado neste arquivo, OU registra-lo como divida de processo do M8. Enquanto nao houver escolha registrada, a fase nao satisfaz os 5 itens do exit criterion e nao pode fechar como `passed`"

  - truth: "HI-02 da 46-REVIEW-4 — a tabela de vigilancia dos 14 dias nomeia o sinal de evidencia do criterio 3"
    status: failed
    reason: >
      Conferido por mim, nao lido do review: `grep -n "relato_dry_run"` em
      `46-07-RUNBOOK-FLIP.md` devolve ZERO linhas. A tabela que o operador vai consultar
      pelas proximas 14 noites nao nomeia o sinal que o criterio 3 do portao passou a
      exigir depois do conserto de BL-01. E isso nao e hipotetico: PROD ja contem hoje a
      execucao que a tabela deixaria passar — `e3115161`, com `elegiveis = 6` e ZERO itens
      com `relato_dry_run`. Medi os criterios contra o estado real agora: execucoes de
      ensaio = 2, mas com evidencia = 1.
    requirements: [PURGA-03, PURGA-04]
    artifacts:
      - path: ".planning/phases/46-purga-autom-tica-dry-run-live/46-07-RUNBOOK-FLIP.md"
        issue: "tabela de vigilancia de 14 dias sem a coluna/consulta do `relato_dry_run`"
    missing:
      - "Acrescentar a vigilancia diaria: `SELECT count(*) FROM purga_execucoes e WHERE e.modo_vigente IN ('dry_run','live') AND EXISTS (SELECT 1 FROM purga_execucao_itens i WHERE i.execucao_id = e.id AND i.relato_dry_run IS NOT NULL);` — se este numero nao subir junto com a contagem de noites, as noites nao estao ensaiando"

  - truth: "HI-01 da 46-REVIEW-4 — o invariante de privilegio da 0015 tem guarda recorrente"
    status: failed
    reason: >
      Conferido por mim: `grep -rn "has_table_privilege\|relacl" supabase/tests/` devolve
      ZERO linhas. O `REVOKE` da 0015 foi medido UMA VEZ, no apply, e eu o remedi hoje
      (`UPDATE`/`INSERT`/`DELETE` = false para `anon`, `authenticated` e `service_role`;
      RLS ligada com uma unica policy, de LEITURA). Mas nenhum portao le esse estado: um
      `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role` — que e uma linha comum em
      migration de conveniencia — reabriria a unica porta de escrita da configuracao da
      purga com os 27 contadores do smoke ainda verdes.
    requirements: [PURGA-04, PURGA-05]
    artifacts:
      - path: "supabase/tests/p46_purga_smoke.sql"
        issue: "27 assercoes, nenhuma mede privilegio de tabela nem `relacl`"
    missing:
      - "Uma assercao no smoke que afirme `has_table_privilege(r, 'public.config_purga', v) = false` para o produto {anon, authenticated, service_role} x {INSERT, UPDATE, DELETE}, gerada por `unnest` e nao por lista literal de verbos (CLAUDE.md §Portoes: varra pela FORMA)"

  - truth: "A fixture sintetica de PII nao e confundivel com dado real em PROD, e tem destino decidido"
    status: partial
    reason: >
      8 dos 31 registros de `public.candidatos` em PRODUCAO sao sinteticos (`4601b000-…`),
      com 8 contas correspondentes em `auth.users` — medido hoje, e com a PII INTACTA
      (nenhum tombstone; o smoke nao anonimizou ninguem). Isso e DELIBERADO e esta escrito:
      sem a fixture o conjunto elegivel seria vazio e 18 das 21 assercoes originais
      passariam por vacuidade; o runbook diz em caixa alta `NAO RODE O TEARDOWN ANTES DO
      FLIP`. Nao e defeito. E um FATO OPERACIONAL com duas consequencias ainda abertas:
      (1) os 4 titulares que a purga vai processar TODA NOITE pelos proximos 14 dias sao
      100% fixture — as 14 noites nao produzem nenhuma evidencia sobre o motor contra dado
      real; (2) na PRIMEIRA noite em `live` sao esses 8 sinteticos que serao destruidos
      primeiro, e quem ler um relatorio/KPI/export nesses 14 dias vai contar 31 candidatos
      onde ha 23.
    requirements: [PURGA-03]
    artifacts:
      - path: "public.candidatos / auth.users"
        issue: "8 linhas sinteticas residentes em PROD; `candidaturas_alem_da_janela()` = 4, todas fixture"
    missing:
      - "Decisao explicita e datada do operador sobre o destino da fixture no dia do flip — o runbook §Teardown ja oferece as duas saidas ('a propria purga em live a consome' ou 'estender-dry-run indefinidamente => teardown nunca'). Enquanto nao houver escolha registrada, o dia do flip herda uma decisao nao tomada"
      - "Se algum painel/KPI/export for lido nestes 14 dias, conferir que ele exclui o namespace `fixture-p46+%@invalido.local`"

deferred: []

behavior_unverified_items: []

coincidental_reliance_items:
  - truth: "SC#4 / PURGA-07 — a candidatura sem decisao registrada e classificada corretamente"
    reason: fixture-only
    harden: >
      O degrau de COALESCE (`decisao_final` -> `historico` -> `updated_at` ->
      `data_candidatura`) e as quatro excecoes de politica so tem sujeito porque a fixture
      do 46-01 planta um caso para cada ramo. Contra dado de producao real, o conjunto
      elegivel e VAZIO e todo o predicado passaria por vacuidade. A propriedade e boa e a
      fixture e a forma certa de resolver — mas ela e uma PRECONDICAO NAO DECLARADA de toda
      a evidencia desta fase, e desaparece no dia do teardown. Promover para precondicao
      explicita: enquanto o conjunto elegivel real for vazio, nenhuma afirmacao sobre o
      predicado sobrevive a remocao da fixture.
  - truth: "SC#5 / RETEN-05 — a regra de retencao de notificacoes morde"
    reason: fixture-only
    harden: >
      A mordida so tem sujeito porque a assercao (m) planta a linha retrodatada que ela
      mesma apaga. As 12 notificacoes reais de PROD tem entre 0,02 e 0,77 mes contra uma
      janela de 24: o alcance real da regra e ZERO por ARITMETICA, e continuara zero por
      ~23 meses. Declarar como precondicao: qualquer relatorio de conformidade que cite
      `notificacoes_expurgadas` nos proximos 23 meses esta citando um zero que nao e sinal.

human_verification:
  - test: >
      Confirmar `aprovado` e `decisao_final` em `/admin/retencao`, escolhendo a janela de
      cada uma (hoje ambas em 24 meses, procedencia `seed`)
    expected: "`config_retencao_etapa.origem` passa de `seed` para `admin` nas duas. Medido por mim hoje: 2 das 3 etapas da allowlist ainda em `seed` (`rejeitado` ja esta em `admin`, 18 meses)"
    why_human: "E acao de operador na tela, e e a UNICA pendencia do portao do flip que o TEMPO nao resolve — o servidor recusa `live` enquanto for assim, mesmo depois de 2026-09-06"
  - test: "Provar `cron.alter_job` por execucao, num momento controlado — desarmar e rearmar o jobid 6"
    expected: "a alavanca de emergencia do runbook funciona de verdade, e o job volta com `active = true` e o mesmo `md5(command)` que a assercao (a) pina"
    why_human: "Muta o agendamento de PROD. Privilegio, assinatura, `prokind='c'` e `prosecdef=false` estao medidos; a EXECUCAO nao. Herdado de BL-R3-01 e da 46-EVIDENCIA-APPLY §Pendencias 1"
  - test: >
      RESIDUAL (escopo reduzido pelo smoke): repetir a recusa do flip por uma sessao de
      administrador REAL atravessando o PostgREST — login no app como admin e chamada da
      RPC `salvar_config_purga` com `p_modo => 'live'`
    expected: "22023 nomeando exatamente TRES criterios faltantes (dias=0/14 · execucoes=2/14 · 2 etapas em `seed`), `modo` seguindo `dry_run`, zero linha nova em `logs_auditoria`"
    why_human: >
      A TRANSICAO ja esta provada no banco: o bloco (d) rodou hoje contra o corpo NOVO
      (md5 e10786bd), carimbando `request.jwt.claims` — a mesma GUC que `auth.jwt()` le —
      com uma assercao de NAO-VACUIDADE que exige `auth.uid()` nao-nulo, e produziu sete
      recusas 22023, uma aceitacao e um kill switch irrecusavel, com a impressao digital do
      ledger conferida no fim. O que resta e so a camada de gateway (verificacao de
      assinatura do JWT e `SET ROLE authenticated` pelo PostgREST), que nao tem caminho
      automatizavel a partir da Management API — ela recusa antes, com 42501
  - test: "Decidir e DATAR o destino dos 8 registros de fixture no dia do flip"
    expected: "uma linha escrita no runbook dizendo qual das duas saidas do §Teardown foi escolhida, e por quem"
    why_human: "E decisao de operador sobre PII em producao, nao inferencia"
---

# Phase 46 · Purga Automatica (dry-run -> live) — Relatorio de Verificacao (RE-VERIFICACAO)

**Objetivo da fase (ROADMAP):** *"O dado expira sozinho, dentro de um cerco — e a primeira coisa
que a purga faz em producao e **nao apagar nada**."*
**Verificado:** 2026-08-23T11:35-03 · **Status:** `gaps_found` · **Score:** 4/5 (era 3/5)
**Portao de fase destrutiva:** 3.5/5 (inalterado)
**Metodo:** 8 consultas read-only a PROD pela Management API (`node p46apply.cjs sql`,
exclusivamente `SELECT`/catalogo), 1 sonda deliberadamente falha e NAO-MUTANTE para calibrar o
`pg_stat_statements`, `npm run lint`, `md5 -q` do smoke, `git show -s --format=%cI` de 13 commits.
**PROD nao foi mutada por esta verificacao:** nenhuma migration, nenhum deploy, nenhum smoke,
nenhum `salvar_config_purga`, nenhum `cron.alter_job`.

---

## ⚠ PRIMEIRO — O ESTADO DE PRODUCAO AGORA, MEDIDO E NAO LIDO DE NENHUM DOCUMENTO

### O que esta ARMADO

| Fato | Valor medido agora | Como |
|---|---|---|
| `config_purga.modo` | **`dry_run`** | `to_jsonb` da linha inteira |
| `config_purga.atualizado_em` (T0 do flip `off -> dry_run`) | **2026-08-23 02:06:37.866049-03** | idem — intacto |
| T0 do ledger de ensaio (`min(iniciada_em)`) | **2026-08-22 20:03:14.148963-03** | idem — intacto |
| `cap_titulares` / `janela_notificacoes_meses` | 50 / 24 | idem |
| Migrations no ledger | **15/15**, `20260823000001`..`15`; md5 de `…0014` = `1937a39c…` e `…0015` = `61dbd3f2…` | `supabase_migrations.schema_migrations` |
| `md5(prosrc)` de `salvar_config_purga` | `e10786bd4e21bce3e9dd956f6a479db2` — o corpo NOVO da 0014 | `pg_proc` |
| Escrita em `config_purga` por `anon` / `authenticated` / `service_role` | **`false` nos tres papeis para `INSERT`, `UPDATE` e `DELETE`** | `has_table_privilege` |
| RLS em `config_purga` | ligada, **1 policy e ela e de LEITURA** (`config_purga_admin_read`, `polcmd = r`) | `pg_policy` |
| `cron.job` jobid 6 | `active = true`, `0 3 * * *`, ` SELECT public.varrer_purga_retencao(); `, user `postgres` | `cron.job` |
| Vault | `project_url` **e** `edge_invoke_key` presentes — a varredura nao vai abortar com `segredo_ausente` | `vault.secrets` |
| Trilha do flip `off -> dry_run` | **exatamente 1 linha** em `logs_auditoria` | `SELECT` |
| **O smoke `p46_purga_smoke.sql` na forma atual** | **RODOU e ficou 27/27** — 2026-08-23 **11:26:40-03** | ver §"Eu nao acreditei no documento" |

### O que NAO esta armado

| Fato | Valor medido agora | Consequencia |
|---|---|---|
| `cron.job_run_details` para jobid 6 | **0 linhas** (2 693 linhas na tabela no total — os tres vizinhos rodam) | **A varredura NUNCA disparou.** As 4 linhas de `purga_execucoes` sao chamadas manuais |
| Noites de dry-run automatico decorridas | **0 de 14** | O "periodo documentado" do SC#1 tem T0 anotado e zero noites |
| Portao do flip: criterios que faltam | **3 de 5**: dias = **0**/14 · execucoes de ensaio = **2**/14 · etapas da allowlist em `seed` = **2** (exigido 0) | O `live` e recusado hoje. O criterio 3 (>=1 execucao COM evidencia) ja passa: medi **1** |
| Criterio 2 do portao destrutivo | **violado** para 46-05/06/07 | Exit criterion de ROADMAP nao satisfeito |
| HI-01 / HI-02 da `46-REVIEW-4` | **abertos** — conferidos por `grep`, nao lidos do review | Ver gaps |

### O que a noite de 2026-08-24 00:00-03 vai fazer, derivado do estado que eu acabei de medir

`cron.timezone = GMT`, entao `0 3 * * *` e **03:00 UTC = 00:00 America/Sao_Paulo**. O job foi
armado as ~01:30-03 de hoje — depois do horario de hoje — e por isso a primeira varredura
automatica da historia deste sistema e daqui a **~12,5 horas**. Tracando o corpo vivo de
`varrer_purga_retencao` (md5 `72178564…`) contra as grandezas que medi agora:

1. Le `modo = 'dry_run'`, `cap = 50`.
2. **RETEN-05:** roda o `DELETE FROM public.notificacoes_enviadas WHERE criado_em + interval
   '24 months' < now()`. As 12 notificacoes vivas tem entre **0,02 e 0,77 mes** -> alcance
   **0 linhas**. Como `modo <> 'live'`, levanta `P46RN` e a subtransacao reverte.
   `notificacoes_expurgadas = 0`.
3. Vault tem os dois segredos -> **nao** aborta com `segredo_ausente`.
4. Materializa o conjunto: **4 elegiveis**, todos fixture. 4 < 50 -> **nao** aborta com
   `cap_excedido`.
5. Abre 1 linha em `purga_execucoes` (`veredito='dry_run'`, `situacao='executando'`) e 4 itens.
6. Para cada um: `SELECT public.anonimizar_candidato(id, true)` — o corpo destrutivo COMPLETO
   executa e e derrubado pelo terminador `P45DR`; o `SQLERRM` vira `relato_dry_run`.
7. `net.http_post` **nao** e alcancado — o bloco (g.5) vive inteiro dentro de `IF v_modo = 'live'`.
8. Fecha: `veredito='dry_run'`, `processados=0`, `notificacoes_expurgadas=0`.

**Resultado esperado: +1 linha de ledger, +4 itens, ZERO destruicao** — e, pela primeira vez,
uma linha em `cron.job_run_details`. **Amanha e o dia em que "a purga nao apaga nada" deixa de
ser uma propriedade da configuracao e vira uma propriedade observada do agendador.**

---

## Eu nao acreditei no documento: como confirmei o smoke pelo catalogo

A `46-EVIDENCIA-SMOKE-VERDE.md` afirma 27/27. Um relatorio de verificacao que aceita isso nao
verificou nada — e o smoke roda dentro de um envelope revertido, entao ele **por desenho nao
deixa rastro nas tabelas**. Fui buscar o rastro onde ele existe: no `pg_stat_statements`.

**Passo 1 — calibrar o instrumento.** Rodei uma sonda deliberadamente falha e nao-mutante
(`DO $probe46v$ BEGIN RAISE EXCEPTION …; END $probe46v$;`) e conferi em seguida:

```
SELECT … FROM pg_stat_statements WHERE query LIKE '%probe46v%'   ->   [] (vazio)
```

**O `pg_stat_statements` NAO registra statement que levanta excecao.** Isso transforma `calls`
numa contagem de EXECUCOES BEM-SUCEDIDAS, que e exatamente o que eu precisava.

**Passo 2 — a aritmetica que fecha.** Os blocos executaveis do smoke mudaram de texto com os
consertos de BLOCKER, entao o `queryid` deles e NOVO:

| Bloco do arquivo | `stats_since` (1ª execucao) | `calls` |
|---|---|---|
| `DO $r$` — (a)(g)(m)(n), forma ANTIGA | 2026-08-23 01:29:26 | 3 |
| `DO $r$` — forma ATUAL | **2026-08-23 11:26:40.081-03** | **1** |
| `DO $de$` — (d)(e), forma ANTIGA | 2026-08-23 02:03:22 | 2 |
| `DO $de$` — forma ATUAL | **2026-08-23 11:26:40.107-03** | **1** |
| `DO $z$` RESUMO com `v_esperado := 27` | 2026-08-23 02:03:22 | **3** |

O `(z)` vem **depois** do `$de$` no arquivo, entao `calls(z) <= calls(de_antigo) + calls(de_novo)`
sempre. Medido: **3 <= 2 + 1 = 3**. A igualdade so e possivel se **TODO** run que completou um
bloco `$de$` tambem completou o `(z)` — e `(z)` so completa quando `smoke46p.pass = 27`, porque
qualquer outro valor levanta `P46P FAIL (z)` e o statement nao seria contado.

**Portanto o run das 11:26:40 chegou ao RESUMO com o contador em 27.** Confirmado por mim, a
partir do catalogo, sem depender de uma unica linha do documento do operador.

**Passo 3 — o envelope.** Duas consultas de retrato (`SELECT modo, to_jsonb(c.*) FROM
config_purga …`) aparecem no `pg_stat_statements` as **11:26:13** e **11:26:49**, cercando o run
— e sao entradas distintas das assercoes, isto e, medicao **por fora**, como o documento afirma.

**Passo 4 — o que rodou e o arquivo do repositorio.** `md5 -q supabase/tests/p46_purga_smoke.sql`
= `b9a1140fcf6f692bf502d1239e8fb10d`, 252 163 octetos — identico ao md5 do prefixo enviado que a
evidencia publica. E `git log -- supabase/tests/p46_purga_smoke.sql` mostra que o ultimo commit a
tocar o arquivo e `4b591fe` (03:50), **anterior** a `b7d4a18` (review final, 04:23) e ao apply
(`7a9976d`, 04:29). A arvore esta limpa. O arquivo que rodou e o arquivo revisado.

### ⚠ Um erro de fato no documento de evidencia (nao muda o veredito, mas nao pode passar)

`46-EVIDENCIA-SMOKE-VERDE.md` diz **"Rodado em: 2026-08-23, ~04:50-03"**. O catalogo diz
**11:26:40-03** — quase sete horas depois, e um minuto antes do commit `a4f9977` (11:27:33). O
horario escrito e um erro de transcricao. Registro porque este relatorio existe para nao
arredondar: uma evidencia com carimbo de tempo errado e uma evidencia mais dificil de auditar
depois, e o arquivo e commitado.

---

## O envelope devolveu tudo — 18 grandezas, medidas por mim DEPOIS do run

| Grandeza | Esperado (pre-run) | Medido agora |
|---|---|---|
| `config_purga` (linha inteira, `to_jsonb`) | `dry_run` / 50 / 24 / `2026-08-23T02:06:37.866049-03` | **identica** |
| `purga_execucoes` · `purga_execucao_itens` | 4 · 10 | **4 · 10** |
| T0 do ledger (`min(iniciada_em)`) | `2026-08-22T20:03:14.148963-03` | **identico** |
| Itens com `relato_dry_run` | 4 | **4** |
| `processados` nas 4 execucoes | 0,0,0,0 | **0,0,0,0** |
| `notificacoes_expurgadas` nas 4 | 0,0,0,0 | **0,0,0,0** |
| `logs_auditoria` com `acao ILIKE '%purga%'` | 1 | **1** |
| `candidatos` (total · fixture) | 31 · 8 | **31 · 8** |
| **PII dos 8 titulares de fixture** | intacta | **intacta** — nenhum e-mail nulo/tombstone, `nome_completo` com 47-52 caracteres |
| `candidaturas` · `auth.users` | 20 · 37 | **20 · 37** |
| `notificacoes_enviadas` | 12 | **12** (a mais velha com 0,77 mes) |
| `historico_candidatura` (trilha humana — RNF-07a) | 13 | **13** |
| `decisao_final` · `retencao_hold` | 3 · 1 | **3 · 1** |
| `storage.objects` em `curriculos` | 5 | **5** |
| `candidaturas_alem_da_janela()` | 4 | **4** |
| `net.http_request_queue` | 0 | **0** |
| **`net._http_response` nas ultimas 18 h** | vazio | **VAZIO** — a assercao (m) rodou a varredura em `live` e **nada saiu do predio** |
| Gatilhos DESLIGADOS em `notificacoes_enviadas` | 0 | **0** — a higiene de (m) religou todos |

**Nenhuma linha de pessoa real foi tocada em toda a Phase 46, nem pelo smoke.** Confirmado.

O rastro que o rollback **nao** apaga corrobora que o trabalho de fato aconteceu:
`pg_stat_user_tables` mostra `purga_execucoes` com **231 tuplas inseridas** para **4 vivas**,
`purga_execucao_itens` com **403 para 10**, e `notificacoes_enviadas` com **76 inseridas e 19
apagadas** para **12 vivas** — a assinatura estatistica de centenas de mutacoes revertidas.

---

## Verdades Observaveis (Success Criteria do ROADMAP)

| # | Verdade | Status | Evidencia |
|---|---|---|---|
| 1 | O cron roda em PROD por periodo documentado em `dry_run` antes de qualquer execucao real, e o relatorio do dry-run e gerado pela MESMA query do delete real, envolvida em rollback | ✗ **FAILED (parcial)** | **Metade B VERIFICADA E AGORA EXERCITADA:** a varredura chama `public.anonimizar_candidato(id, true)` — a mesma funcao do delete real — e 4 itens carregam `relato_dry_run`; a assercao (m) rodou a varredura em `live` dentro do envelope e mediu o despacho. **Metade A FALHOU:** `cron.job_run_details` para jobid 6 = **0 linhas**; 0 de 14 noites |
| 2 | O flip `dry-run -> live` e checkpoint separado e evidenciado, nunca efeito colateral de um deploy | ✓ **VERIFIED** *(era ⚠️ PRESENT_BEHAVIOR_UNVERIFIED)* | **A TRANSICAO foi executada contra o corpo NOVO** (md5 `e10786bd…`, aplicado hoje pela 0014): o bloco (d) registrou **9 chamadas de controle — SETE recusas com SQLSTATE `22023`, UMA aceitacao e o kill switch irrecusavel**, com assercao de NAO-VACUIDADE exigindo `auth.uid()` nao-nulo (sem sessao a RPC recusaria 42501 em todas e as negativas ficariam verdes medindo o guard errado). O bloco (e) mediu **exatamente uma** linha de `logs_auditoria` em volta da aceitacao, com ator resolvido no servidor e estados antes/depois diferentes. A impressao digital das duas tabelas do ledger foi conferida no fim e voltou identica. RLS + `REVOKE` fecham toda outra porta de escrita (medido hoje nos 3 papeis x 3 verbos) |
| 3 | Uma execucao nao passa do cap de blast-radius, e um kill switch sem deploy — provado desligando de verdade | ✓ **VERIFIED** | **Kill switch provado POR EXECUCAO** em dois lugares: 2 linhas de ledger vivas com `modo_vigente='off'`, `veredito='desligado'`, `elegiveis` 6 e 4, `processados=0` (desligou de verdade sobre conjunto nao-vazio); e o caso (d.7), que provou hoje que o `off` e aceito **com os tres criterios falhando de proposito** — um kill switch recusavel nao e kill switch. Cap: contrato de fronteira de tres pontos na assercao (g), `ck_config_purga_cap` vivo, guard de 1..500 |
| 4 | Uma candidatura sem decisao registrada e classificada corretamente — `COALESCE` explicito e allowlist de estados terminais | ✓ **VERIFIED (coincidental-reliance)** | `candidaturas_alem_da_janela()` (md5 `b4fdb3a1…`) devolve 4 com `ancora_origem` em `{historico, decisao_final, updated_at}` — o degrau de COALESCE visivel no dado. Allowlist = `config_retencao_etapa.elegivel_purga`, 3 de 8 verdadeiras, **jamais denylist**. ⚠ Ver `coincidental_reliance_items`: so tem sujeito por causa da fixture |
| 5 | Cada execucao deixa linha no ledger com o que foi apagado, quando e sob qual politica — inclusive `notificacoes_enviadas` | ✓ **VERIFIED** | 4 execucoes -> 4 linhas com `modo_vigente`, `cap_vigente`, `elegiveis`, `processados`, `notificacoes_expurgadas`, `veredito`, `situacao`; 10 itens com `etapa`, **`janela_meses_aplicada`** (24/24/18/24 — a politica, nao so a contagem), `ancora_origem`, `ancora_em`, tres `desfecho_*`, `relato_dry_run`. E a assercao (m) provou hoje que quando a regra MORDE o ledger registra: exigiu `notificacoes_expurgadas >= 1` num run em que uma linha retrodatada foi de fato apagada |

**Score: 4/5 verdades verificadas** (era 3/5). **0 presentes-mas-com-comportamento-nao-exercitado**
(era 1). A unica FAILED e o agendador.

---

## O que exatamente o smoke fechou — assercao por assercao

O relatorio anterior nomeou quatro coisas cuja unica prova era um arquivo nao executado. As
quatro rodaram:

| Requisito | O que so o smoke provava | Assercao | Estado |
|---|---|---|---|
| **PURGA-04** | o portao do flip recusa pelo recorte de **VEREDITO** — o BLOCKER-01 corrigido pela `…0014` | `(d.7)`, `(d.8)`, `(d.9)` | ✅ **rodou** |
| **PURGA-04** | a recusa por CONTAGEM e **so** por contagem, com a evidencia de ensaio replantada (BL-R3-02) | `(d.3)` | ✅ **rodou** — e o proprio bloco carrega a assercao que distingue "a FIXTURE envelheceu" de "a RPC mentiu" |
| **RETEN-05** | que a regra **MORDE** sobre linha retrodatada, que a de dentro da janela **sobrevive**, e que **nada mais** foi apagado | `(m)` | ✅ **rodou** — 7 condicoes, incluindo ⊖ `historico_candidatura` e `decisao_final` intactos |
| **PURGA-01** | que o ramo `live` **enfileira** o `net.http_post` — a unica condicao ⊕ que mede o dispatch | `(m)`, metade ⊕ | ✅ **rodou** — e `net._http_response` continua vazio, entao a fila reverteu com o envelope |

E o caso positivo `(d.6)` merece nome proprio: sem ele, `(d)` provaria apenas que a funcao
recusa, e **uma funcao que recusa tudo passaria nas sete negativas**, com a descoberta chegando
no dia do flip. Esse e o modo de falha nº 3 dos sete portoes da Phase 45, e e literalmente o que
aconteceu com a `(p.3)` deste mesmo arquivo. Aqui o ramo de sucesso RODOU.

---

## O Portao de Fase Destrutiva, criterio por criterio — **3.5/5, inalterado**

O ROADMAP §"Portao de fase destrutiva" trata os cinco itens como **exit criterion**, e diz com
todas as letras que eles *"nao sao substituiveis por 'o smoke passou'"*. **Essa frase e a razao
de este placar nao ter se movido hoje:** o smoke fechou *must-haves*, nao criterios do portao.

### 1 · `VERIFICATION.md` presente e com veredito — ✅ **1.0, por EVIDENCIA**

Este arquivo. `status: gaps_found`, nunca ausente, nunca `draft`.

### 2 · Code review bloqueante ANTES do apply em PROD — ⚠️ **0.5, VIOLADO em 4 de 8 applies**

Ordem conferida por mim hoje, em `git show -s --format=%cI`:

| Commit | Horario | O que e |
|---|---|---|
| `aa96052` | **00:50:55** | APPLY 46-05 em PROD |
| `bd30684` | **01:30:39** | APPLY 46-06 + **o cron armado** em PROD |
| `0f44e53` | **02:05:24** | APPLY 46-07 (portao do flip) |
| `5351bde` | **02:07:45** | **O dry-run ligado em PROD** |
| `13e5302` | 02:23:42 | `46-REVIEW-2` — *"code review **retroativo** de 46-05/06/07"*, **1 BLOCKER + 5 HIGH** |
| `56485db` | 03:31:24 | `46-REVIEW-3` — **2 BLOCKERS, ambos introduzidos pelo proprio conserto** |
| `b7d4a18` | 04:23:14 | `46-REVIEW-4` — 0 blockers, `seguro_aplicar: SIM` |
| `7a9976d` | 04:29:09 | APPLY `…0014` + `…0015` |

**Para o que foi aplicado as 04:29, o portao foi cumprido** — e o BL-01 que a `…0014` corrige era
real: reproduzi os dois recortes contra PROD e eles divergem hoje (o ANTIGO conta **2** ensaios,
o NOVO conta **1**, porque a execucao `e3115161` tem 6 elegiveis e zero itens com
`relato_dry_run`). Catorze noites daquelas abririam o flip sem uma linha de evidencia sobre o
caminho do delete.

**Para os quatro applies da madrugada, foi violado.** O review foi 16 a 93 minutos DEPOIS, e
achou um BLOCKER. **Um smoke verde as 11:26 nao move um review das 02:23 para antes de um apply
das 00:50.** Este achado do relatorio anterior fica de pe, sem atenuacao. E como o ROADMAP trata
os cinco itens como exit criterion, isto sozinho impede o `passed` — a saida nao e trabalho, e
uma aceitacao explicita e datada do operador (`overrides:`).

### 3 · Asseracoes negativas obrigatorias — ✅ **1.0, por EVIDENCIA, remedidas HOJE**

18 grandezas, todas na tabela §"O envelope devolveu tudo". Nao aceitei nenhuma contagem de
SUMMARY nem da propria `46-EVIDENCIA-SMOKE-VERDE.md`. Duas negativas que so esta verificacao
acrescenta: **a PII dos 8 titulares de fixture esta intacta** (o smoke exercita
`anonimizar_candidato`, entao "nao anonimizou ninguem" precisava ser medido, nao presumido) e
**`net._http_response` esta vazio nas ultimas 18 h** (a assercao (m) roda a varredura em modo
`live`, entao "nada saiu do predio" tambem precisava ser medido).

### 4 · Zero `--no-verify` — ✅ **0.5, por ARGUMENTO** (e digo isso de proposito)

`--no-verify` **nao deixa rastro forense no git**; e estruturalmente nao-falsificavel a
posteriori. O que medi hoje: `npm run -s lint | grep -c "error TS"` = **96**, exatamente a
baseline congelada em `.husky/pre-commit`, inalterada em 30+ commits desta fase. Corroboracao
forte, nao prova.

### 5 · Dry-run/rollback exercitado pela MESMA query do delete real — ✅ **0.5, com a ressalva que muda o significado**

O **mecanismo** esta provado, e agora **exercitado ponta a ponta**: a varredura nao reescreve o
predicado, ela chama `public.anonimizar_candidato(r.candidato_id, true)`, cujo corpo **completo**
executa e so entao e derrubado pelo terminador tipado `P45DR`; se o terminador sumisse, a
varredura seria derrubada com `P46NT` sem gravar item (fail-closed). RETEN-05 e **um unico
statement nos tres modos** — `DELETE`, `GET DIAGNOSTICS`, e fora de `live` um `RAISE … P46RN` que
reverte a subtransacao. **Nunca dois corpos, um para contar e outro para apagar** — que era o
CR-02 da P39.

**A ressalva, inalterada.** O portao diz "contra dados de forma viva". Os dados sao **forma viva**
(schema, constraints, FKs e gatilhos de producao) mas **nao sao dados vivos**: os 4 elegiveis sao
`4601b000-0000-4000-8000-00000000000{1..4}`, e as duas notificacoes de `(m)` sao plantadas pelo
proprio bloco. **Nenhuma pessoa real jamais entrou no conjunto elegivel**, e nem pode — a
notificacao mais velha de PROD tem 0,77 mes contra 24. Os 14 dias de dry-run vao exercitar o
motor contra 4 sinteticos, 14 vezes. **E limite do sistema, nao defeito da fase** — e a fase o
tratou corretamente (ver secao seguinte).

---

## A verificacao diferida da Phase 43: a contagem foi tratada como NAO-EXERCITADA?

**Sim, e agora de tres formas.**

1. **Registrado antes de planejar.** `46-CONTEXT.md:391-392`: *"`previa_retencao()` devolve ZERO
   por aritmetica. Qualquer plano que trate a contagem atual como sinal de correcao esta errado."*
2. **Resolvido por construcao.** O plano 46-01 planta uma fixture **duravel** que torna o conjunto
   elegivel nao-vazio; sem ela 18 das 21 assercoes passariam por vacuidade. E o predicado foi
   visto **ENCOLHENDO por politica** (7 -> 6 pelo 46-02, 6 -> 4 pelo 46-03), o que so e
   observavel sobre conjunto nao-vazio.
3. **O portao do flip nao aceita zero como prova.** O criterio 3 de D-46-14 nao conta elegiveis:
   exige **EXISTS de item com `relato_dry_run`**. Medi hoje o que isso custa na pratica: das 2
   execucoes de ensaio do ledger, **so 1** tem evidencia.

**E o buraco que o relatorio anterior apontou em `notificacoes_enviadas` foi fechado — pela
metade que dependia de codigo.** A fixture do 46-01 planta candidatos, nao notificacoes
retrodatadas; a regra continua com alcance real ZERO por aritmetica (0,77 mes contra 24) e vai
registrar `notificacoes_expurgadas = 0` por ~23 meses. **Mas a prova de que ela MORDE deixou de
ser um arquivo nao executado:** `(m)` rodou hoje em PROD, plantou a linha retrodatada, viu ela
morrer, viu a de dentro da janela sobreviver, exigiu o registro no ledger e conferiu que
`historico_candidatura` e `decisao_final` nao foram tocados. Registro isso como
`coincidental_reliance_items[1]`, e nao como gap: **o que falta e tempo e dado, nao trabalho.**

---

## Cobertura de Requisitos

| Req | Descricao | Status | Evidencia · o que mudou |
|---|---|---|---|
| **PURGA-01** | Cron espelhando o padrao do `notif-retry-sweep` | ⚠ **PARCIAL** *(era BLOQUEADO)* | **Despacho: PROVADO** — `(m)` mediu a fila do `pg_net` crescer uma linha por titular elegivel no ramo `live`, e `(a)` pina o `md5(command)` do job contra a migration `…0012`. **Agendamento: NAO PROVADO** — `job_run_details` = 0. Instalado ≠ disparado |
| **PURGA-02** | Dry-run executa a MESMA query do delete real, em rollback | ✓ **SATISFEITO** | Mesma chamada de funcao, nao query equivalente. 4/4 itens com `relato_dry_run` |
| **PURGA-03** | Primeira ativacao em PROD e dry-run, por periodo documentado | ⚠ **PARCIAL** | Primeira ativacao **e** `dry_run` (1 linha de auditoria, T0 no servidor, minimo do flip 2026-09-06). Periodo: **0 de 14 noites** |
| **PURGA-04** | Flip e checkpoint separado e evidenciado | ✓ **SATISFEITO** *(era PRECISA DE HUMANO)* | Portao no SERVIDOR, nao em checklist; RLS + `REVOKE` fecham toda outra porta (3 papeis x 3 verbos = false); e a **transicao executou** contra o corpo novo: 7 recusas 22023 + 1 aceitacao + kill switch, com nao-vacuidade de sessao asserida e uma unica linha de trilha medida |
| **PURGA-05** | Cap de blast-radius + kill switch | ✓ **SATISFEITO** | Kill switch provado **desligando de verdade** em ledger vivo, **e** provado irrecusavel em `(d.7)` com os tres criterios falhando de proposito. Cap com contrato de fronteira de tres pontos |
| **PURGA-06** | Ledger: o que foi apagado, quando, sob qual politica | ✓ **SATISFEITO** | 4 execucoes + 10 itens, com `janela_meses_aplicada` e `ancora_origem` |
| **PURGA-07** | Predicado nao engole linhas por NULL; allowlist, nunca denylist | ✓ **SATISFEITO** | Ja `Complete` no REQUIREMENTS.md. Degrau de COALESCE visivel no dado |
| **RETEN-05** | Retencao de `notificacoes_enviadas` definida **e aplicada** | ✓ **SATISFEITO com ressalva aritmetica** *(era BLOQUEADO)* | **Definida:** janela 24 meses em `config_purga`, `DELETE` unico no corpo vivo, `COMMENT` de PROD deixou de dizer *"Retention INDEFINITE"*. **Aplicada:** a regra esta ligada na varredura que roda toda noite e **foi provada mordendo** por `(m)`. ⚠ Alcance real = 0 por ARITMETICA ate ~2028-07, e o sweep automatico ainda nao disparou nenhuma vez (ver PURGA-01) |

Nenhum requisito ORFAO: os 8 IDs do ROADMAP aparecem nos plans e todos foram avaliados.
⚠ `REQUIREMENTS.md` ainda marca 7 dos 8 como `Pending` — a atualizacao do checklist e trabalho de
fechamento de fase, nao evidencia, e nao entra no score.

---

## Anti-padroes

| Achado | Severidade | Nota |
|---|---|---|
| Nenhum `TBD`/`FIXME`/`XXX` sem referencia a trabalho formal nos arquivos da fase | — | limpo |
| `md5` das `…0001`..`…0005` diverge do ledger em 1 octeto | ℹ️ **Info** | E o `\n` final; residuo da via de apply antiga, ja documentado no CLAUDE.md. **Nao e perda de comentario** |
| **`46-EVIDENCIA-SMOKE-VERDE.md` carimba o run as "~04:50-03"; o catalogo diz 11:26:40-03** | ⚠️ **Warning** | Erro de transcricao num arquivo de evidencia commitado. Nao muda o veredito — o run e real e o md5 do arquivo bate — mas dificulta auditoria futura. **Nao corrigi: e evidencia commitada** |
| `HI-01` da `46-REVIEW-4` continua aberto | ⚠️ **Warning -> gap** | Conferido por `grep -rn "has_table_privilege\|relacl" supabase/tests/` = **0 linhas**. Um `GRANT ALL … TO service_role` reabriria a unica porta de escrita com os 27 contadores verdes |
| `HI-02` da `46-REVIEW-4` continua aberto | ⚠️ **Warning -> gap** | Conferido por `grep -n "relato_dry_run" 46-07-RUNBOOK-FLIP.md` = **0 linhas**. E PROD **ja contem hoje** a execucao que a tabela deixa passar (`e3115161`) |
| 8 linhas de PII sintetica residentes em `public.candidatos` de PROD, com PII intacta | ⚠️ **Warning** | **Deliberado** (fixture duravel; o runbook proibe o teardown antes do flip) mas com destino em aberto — ver gaps |

---

## Spot-checks comportamentais executados

| Comportamento | Comando | Resultado | Status |
|---|---|---|---|
| Calibrar `pg_stat_statements` (registra falha?) | `DO $probe46v$ … RAISE EXCEPTION …` + consulta | **nao registra** — sonda ausente do catalogo | ✓ PASS |
| **O smoke completou o RESUMO (z) com 27** | aritmetica de `calls`: `(z)`=3 vs `$de$` antigo 2 + novo 1 = 3 | **igualdade** ⇒ todo run que chegou ao (d) passou pelo (z) | ✓ **PASS** |
| Os blocos `(d)/(e)` e `(a)(g)(m)(n)` na forma ATUAL executaram | `stats_since` das entradas novas | **11:26:40.081** e **11:26:40.107-03**, `calls=1` cada | ✓ PASS |
| O arquivo que rodou e o do repositorio | `md5 -q` + `git log -- <smoke>` + `git status` | `b9a1140f…`, ultimo commit `4b591fe` (anterior ao review final), arvore limpa | ✓ PASS |
| Envelope revertido | 18 grandezas medidas depois do run | **18/18 identicas** | ✓ PASS |
| Nada saiu do predio | `net._http_response` nas ultimas 18 h · `net.http_request_queue` | **vazio** · **0** | ✓ PASS |
| PII da fixture intacta apos o smoke | `email IS NULL OR LIKE '%anonimizado%'` nos 8 sinteticos | **false nos 8**, `nome_completo` 47-52 chars | ✓ PASS |
| Higiene de gatilhos | `pg_trigger.tgenabled='D'` em `notificacoes_enviadas` | **0 desligados** | ✓ PASS |
| Fidelidade das 15 migrations | md5 do ledger para `…0014`/`…0015` | `1937a39c…` / `61dbd3f2…` — batem com a evidencia do apply | ✓ PASS |
| O `REVOKE` da `…0015` continua de pe | `has_table_privilege`, 3 papeis x 4 verbos | `INSERT`/`UPDATE`/`DELETE` = false nos 3; `SELECT` = true | ✓ PASS |
| Portao do flip recusaria agora | reproducao do `SELECT` de `…0014` contra PROD | **3 de 5 criterios faltam** (dias 0, execucoes 2, 2 etapas em `seed`); criterio 3 ja passa (1) | ✓ PASS |
| Baseline de tipos | `npm run -s lint \| grep -c "error TS"` | **96** = baseline congelada | ✓ PASS |
| Ordem review x apply | `git show -s --format=%cI` em 13 commits | 4 applies ANTES do review que os cobre | ✗ **FAIL** (criterio 2) |
| **Cron disparou alguma vez** | `count(*) FROM cron.job_run_details WHERE jobid=6` | **0** (de 2 693 linhas na tabela) | ✗ **FAIL** |

---

## Ordem de fechamento sugerida

1. **Deixar a noite de 2026-08-24 00:00-03 passar** (~12,5 h) e conferir `cron.job_run_details`
   para o jobid 6 + a linha nova de ledger com 4 itens carregando `relato_dry_run`. Fecha a
   metade A do SC#1 e converte PURGA-01 de *instalado* em *provado*. **Custo: zero trabalho.**
2. **`/admin/retencao`**: confirmar as janelas de `aprovado` e `decisao_final`. E a unica
   pendencia do portao do flip que o tempo **nao** resolve.
3. **Decidir sobre o criterio 2 do portao destrutivo** — aceitar por `overrides:` datado ou
   registrar como divida de processo do M8. Sem isso a fase nao tem como fechar como `passed`.
4. **Fechar HI-02** (o sinal do criterio 3 na tabela de vigilancia) — e o mais urgente dos dois,
   porque a vigilancia comeca amanha e ele so tem valor durante os 14 dias.
5. **Fechar HI-01** (guarda recorrente do privilegio da `…0015`).
6. **Provar `cron.alter_job`** por execucao, num momento controlado, antes de precisar dela.
7. **Decidir e datar o destino da fixture** no dia do flip.

---

## Resumo dos gaps

O relatorio anterior disse que o que faltava nao era construcao, era **exercicio**, e nomeou tres
coisas. **Uma delas foi feita hoje, e feita direito:** o smoke rodou na forma atual, com o
contador LIDO e nao inferido, e eu confirmei o run pelo catalogo do Postgres em vez de aceitar o
documento. Com ele, o portao do flip deixou de ser um `SELECT` que eu calculei e virou uma funcao
que eu vi recusar sete vezes e aceitar uma; RETEN-05 deixou de ser uma promessa no `COMMENT` e
virou uma regra que eu vi apagar a linha certa e poupar a errada; e o despacho do ramo `live`
deixou de ser uma inspecao de `prosrc` e virou uma fila que cresceu. **Score 3/5 -> 4/5.**

**As outras duas nao se moveram, e as duas sao diferentes entre si:**

1. **O agendador nunca rodou.** `cron.job_run_details` para o jobid 6 tem zero linhas, contra
   2 693 na tabela. "A purga roda toda noite e nao apaga nada" continua sendo uma afirmacao sobre
   a `cron.job` e nao uma observacao em `cron.job_run_details`. **Isto fecha sozinho amanha as
   00:00-03**, e o periodo de 14 noites so termina em ~2026-09-06. Nao ha trabalho a fazer — ha
   tempo a deixar passar, e depois uma leitura a fazer.
2. **O criterio 2 do portao destrutivo esta violado, e nao ha como fecha-lo.** Quatro applies em
   PROD precederam o review que os cobria, e esse review achou um BLOCKER real. Isto e um desvio
   **consumado**: nenhum trabalho futuro o desfaz, e um smoke verde de hoje muito menos — o
   proprio ROADMAP antecipa a tentativa quando escreve que os cinco itens *"nao sao substituiveis
   por 'o smoke passou'"*. A unica saida honesta e uma aceitacao explicita e datada do operador.

E dois HIGH que eu reconferi por `grep` em vez de acreditar no review: **nenhum smoke le
privilegio de tabela** (HI-01) e **a tabela de vigilancia dos 14 dias nao nomeia o
`relato_dry_run`** (HI-02). O segundo tem prazo: a vigilancia comeca amanha.

**Portao de fase destrutiva: 3.5/5 — inalterado.** O smoke fechou must-haves; nao fechou
criterios do portao. Nao arredondo.

---

_Verificado: 2026-08-23T11:35-03 · re-verificacao apos a acao de fechamento de gap_
_Verificador: gsd-verifier (goal-backward, FORCE)_
_PROD nao foi mutada por esta verificacao: 8 consultas `SELECT`/catalogo e 1 sonda nao-mutante que levanta excecao de proposito. Ao fim: `config_purga.modo` = `dry_run`, T0 = `2026-08-23 02:06:37.866049-03`, ledger com 4 execucoes / 10 itens, `cron.job` jobid 6 `active` com **0** corridas, 15 migrations escrituradas._
