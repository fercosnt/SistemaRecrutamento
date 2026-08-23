---
phase: 46-purga-automatica-dry-run-live
verified: 2026-08-23T04:45:00-03:00
verifier: gsd-verifier (goal-backward, postura adversarial FORCE)
status: gaps_found
veredito: >
  O CERCO ESTA ARMADO E O GATILHO NAO FOI PUXADO — mas o AGENDADOR nunca disparou,
  e a prova ponta a ponta do que foi aplicado hoje nao existe. As 15 migrations
  estao no ledger com md5 conferido por mim, `config_purga.modo = 'dry_run'`,
  UPDATE/INSERT/DELETE em `config_purga` REVOGADOS dos tres papeis, e ZERO linha de
  pessoa real tocada em toda a fase — 23 candidatos reais, 20 candidaturas, 37
  contas, 5 curriculos e 13 linhas de historico, medidos por mim agora e identicos
  ao inicio. O predicado do dry-run E a mesma chamada do delete real e produziu
  relato em 4 de 4 itens. Mas `cron.job_run_details` tem ZERO linhas para o jobid 6:
  a varredura noturna NUNCA RODOU, e as 4 execucoes do ledger sao manuais. E o smoke
  — a unica prova end-to-end das duas migrations aplicadas hoje — mudou 153 linhas
  EXECUTAVEIS desde a ultima vez que ficou verde, e nao rodou desde entao. O objetivo
  da fase ("a primeira coisa que a purga faz em producao e nao apagar nada") e
  verdadeiro da CONFIGURACAO e ainda nao e verdadeiro do AGENDADOR.
score: 3/5
behavior_unverified: 1
overrides_applied: 0

portao_fase_destrutiva:
  1_verification_md_com_veredito:
    status: satisfeito
    por: evidencia
    nota: "Este arquivo. `status: gaps_found`, nunca `draft`, nunca ausente."
  2_code_review_bloqueante_antes_do_apply:
    status: parcialmente_satisfeito
    por: evidencia
    satisfeito_para: "migrations 20260823000014 e 20260823000015 — a cadeia 46-REVIEW-2 (1 BLOCKER + 5 HIGH) -> 46-REVIEW-3 (2 BLOCKERS, ambos introduzidos pelo proprio conserto) -> 46-REVIEW-4 (0 blockers, seguro_aplicar SIM, commit b7d4a18) precede o apply (commit 7a9976d). Ordem confirmada no git."
    violado_para: "os applies dos planos 46-05, 46-06 e 46-07 (commits aa96052, bd30684, 0f44e53, 5351bde) foram TODOS anteriores a 13e5302, cujo proprio assunto diz `code review retroativo de 46-05/06/07`. O review daquelas tres migrations foi DEPOIS, e ele achou 1 BLOCKER real (BL-01) que so foi corrigido hoje pela 0014."
  3_assercoes_negativas:
    status: satisfeito
    por: evidencia
    nota: "Reproduzidas por mim hoje, contra PROD, sem confiar em nenhum SUMMARY — ver secao `Asseracoes Negativas`."
  4_zero_no_verify:
    status: satisfeito
    por: argumento
    nota: "`--no-verify` nao deixa rastro forense no git; e INFALSIFICAVEL a partir do repositorio. O que EU medi: `npm run -s lint | grep -c 'error TS'` = 96, exatamente a baseline congelada do hook. O hook esta instalado e a arvore passa por ele. Os sete SUMMARYs afirmam que ele rodou. Corroborado, nao provado."
  5_dry_run_pela_mesma_query:
    status: satisfeito_com_ressalva
    por: evidencia
    nota: "MECANISMO provado: a varredura chama `public.anonimizar_candidato(id, true)` — a MESMA funcao do delete real, cujo corpo COMPLETO executa e so entao e derrubado pelo terminador P45DR — e 4 itens em PROD carregam `relato_dry_run` produzido por esse caminho. O RETEN-05 e UM UNICO `DELETE`, contado por GET DIAGNOSTICS e revertido pelo ERRCODE P46RN fora de `live`: nao existe segunda definicao da regra. RESSALVA: os DADOS contra os quais isso foi exercitado sao 100% FIXTURE SINTETICA — os 4 titulares elegiveis sao todos `4601b000-…`, plantados pelo 46-01. Nenhuma pessoa real jamais entrou no conjunto elegivel."

gaps:
  - truth: "SC#1 — O cron de purga roda em PROD por um periodo documentado em dry_run antes de qualquer execucao real"
    status: partial
    reason: >
      A metade do PREDICADO esta verificada por evidencia. A metade do AGENDADOR nao
      existe ainda: `cron.job_run_details` tem 0 linhas para o jobid 6 — o job nunca
      disparou. `cron.timezone = GMT`, entao `0 3 * * *` e 00:00 America/Sao_Paulo, e
      a primeira varredura automatica e 2026-08-24 00:00-03. As 4 linhas de
      `purga_execucoes` vieram de chamadas MANUAIS. "O dry-run esta ligado em PROD"
      e verdadeiro da CONFIGURACAO e ainda nao e verdadeiro do SCHEDULER. Zero de 14
      noites decorridas.
    requirements: [PURGA-01, PURGA-03]
    artifacts:
      - path: "cron.job jobid 6 (`purga-retencao-sweep`)"
        issue: "active = true, schedule `0 3 * * *`, command ` SELECT public.varrer_purga_retencao(); ` — instalado e nunca executado"
    missing:
      - "Deixar a noite de 2026-08-24 00:00-03 passar e conferir por execucao, nao por leitura de config: `SELECT jobid, status, return_message, start_time, end_time FROM cron.job_run_details WHERE jobid = 6 ORDER BY start_time DESC;` — esperado >= 1 linha com status `succeeded`"
      - "Cruzar com o ledger: `SELECT id, modo_vigente, veredito, elegiveis, processados, notificacoes_expurgadas, iniciada_em FROM public.purga_execucoes ORDER BY iniciada_em DESC LIMIT 1;` — esperado `modo_vigente='dry_run'`, `veredito='dry_run'`, `elegiveis=4`, `processados=0`, `notificacoes_expurgadas=0`, e 4 itens com `relato_dry_run` NAO NULO"

  - truth: "RETEN-05 — Regra de retencao de `notificacoes_enviadas` definida E APLICADA"
    status: partial
    reason: >
      DEFINIDA: sim, e provado. `config_purga.janela_notificacoes_meses = 24`, o
      `COMMENT` vivo da tabela deixou de dizer "INDEFINITE" e agora diz "retention is
      NO LONGER open-ended", e o `DELETE` unico existe no corpo vivo da varredura
      (linhas 269-283 do `prosrc`). APLICADA: nao — e nao pode ser, por ARITMETICA.
      A notificacao mais velha em PROD tem 0,7 mes e a janela e 24 meses; as 4
      execucoes registraram `notificacoes_expurgadas = 0` e continuarao registrando
      zero por ~23 meses. E EXATAMENTE a mesma classe de nao-exercicio que a Phase 43
      registrou sobre `previa_retencao()`, e desta vez NAO foi neutralizada por
      fixture: a fixture do 46-01 planta candidatos, nao notificacoes retrodatadas.
      A unica prova de que a regra MORDE e a assercao `(m)` do smoke, que usa fixture
      retrodatada — e `(m)` teve conteudo EXECUTAVEL alterado depois da ultima vez que
      o smoke ficou verde (commit 21d7352, `HI-02 (m) ganha a unica condicao que mede
      o DISPATCH`), e nao rodou desde entao.
    requirements: [RETEN-05]
    artifacts:
      - path: "public.notificacoes_enviadas"
        issue: "12 linhas, a mais velha com 0,7 mes; janela de 24 meses. Conjunto alcancavel pela regra = 0, por aritmetica e nao por defeito."
      - path: "supabase/tests/p46_purga_smoke.sql — assercao (m)"
        issue: "unica prova de mordida; conteudo executavel alterado apos o ultimo run verde; nao executada"
    missing:
      - "Rodar o smoke e LER O CONTADOR: `node p46apply.cjs run supabase/tests/p46_purga_smoke.sql` — o gate e `smoke46p.pass = 27` no RESUMO (z), nunca 'nao levantou excecao'"

  - truth: "A prova ponta a ponta das migrations aplicadas HOJE (0014 e 0015) existe"
    status: failed
    reason: >
      Nao existe. O `seguro_aplicar` da 46-REVIEW-4 trazia tres precondicoes e a
      PRIMEIRA delas, com estas palavras, era: "rodar o passo 4 (o smoke) na MESMA
      sessao de trabalho do apply, e nao no dia seguinte — ele e a unica prova
      end-to-end de (d.3) e de (d.8)/(d.9). Adiar o smoke deixa o apply sem evidencia
      — que foi o que o BL-R3-02 custou." O operador aplicou e declinou o smoke. Medi
      o tamanho do buraco: `git diff 5351bde..HEAD -- supabase/tests/p46_purga_smoke.sql`
      = **+383/-44 linhas, das quais 153 sao EXECUTAVEIS** (nao-comentario). O ultimo
      27/27 verde e do commit 5351bde e correu contra um banco SEM a 0014 e SEM a 0015,
      com uma assercao `(d)` que foi depois REESCRITA por dois consertos de BLOCKER
      (dbdf1fe/BL-01 e afe4f45/BL-R3-02). O smoke atual nunca executou contra Postgres
      nenhum. A propria 46-REVIEW-4 classifica `(d.3)` como "CORRETO POR TRACADO, nao
      por execucao".
    requirements: [PURGA-04, RETEN-05]
    artifacts:
      - path: "supabase/tests/p46_purga_smoke.sql"
        issue: "153 linhas executaveis alteradas desde o ultimo run verde; contador esperado 27; nunca executado nesta forma"
    missing:
      - "`node p46apply.cjs run supabase/tests/p46_purga_smoke.sql` e ler `smoke46p.pass` = 27 no RESUMO (z). Casos que so este run prova: (d.3) recusa SO pela contagem com a evidencia replantada · (d.7)/(d.8)/(d.9) o recorte por VEREDITO (o BLOCKER-01) · (m) a condicao ⊕ que mede o dispatch"
      - "Rodar tambem os quatro portoes vizinhos que a fase mexeu, com contador lido: p42_invent05_cron (4/4 com 4 jobs) · p43_previa (9) · p43_matriz (11) · p45_motor (24)"

  - truth: "A fixture sintetica de PII nao e confundivel com dado real em PROD"
    status: partial
    reason: >
      8 dos 31 registros de `public.candidatos` em PRODUCAO sao sinteticos
      (`4601b000-…`), com 8 contas correspondentes em `auth.users`. Isso e
      DELIBERADO e esta escrito: a fixture do 46-01 e DURAVEL de proposito, porque
      sem ela o conjunto elegivel seria vazio e 18 das 21 assercoes passariam por
      vacuidade; e o runbook diz, em caixa alta, `NAO RODE O TEARDOWN ANTES DO FLIP`.
      Nao e defeito. Mas e um FATO OPERACIONAL que esta VERIFICACAO tem de nomear,
      porque tem duas consequencias que ainda nao foram fechadas: (1) os 4 titulares
      que a purga vai processar TODA NOITE pelos proximos 14 dias sao 100% fixture —
      nenhuma pessoa real jamais entrou no conjunto elegivel, entao o dry-run de 14
      noites nao produz nenhuma evidencia sobre o comportamento do motor contra dado
      real; (2) na PRIMEIRA noite em `live`, sao esses 8 sinteticos que serao
      destruidos primeiro — o runbook trata isso como a prova, e esta certo, mas
      quem ler um relatorio, KPI ou export nesses 14 dias vai contar 31 candidatos
      onde ha 23.
    requirements: [PURGA-03]
    artifacts:
      - path: "public.candidatos / auth.users"
        issue: "8 linhas sinteticas residentes em PROD; `candidaturas_alem_da_janela()` retorna 4, todas fixture"
    missing:
      - "Decisao explicita e datada do operador sobre o destino da fixture no dia do flip — o runbook §Teardown ja oferece as duas saidas ('a propria purga em live a consome' ou 'estender-dry-run indefinidamente => teardown nunca'). Enquanto nao houver escolha registrada, o dia do flip herda uma decisao nao tomada"
      - "Se algum painel/KPI/export for lido nestes 14 dias, conferir que ele exclui o namespace `fixture-p46+%@invalido.local`"

deferred: []

behavior_unverified_items:
  - truth: "SC#2 / PURGA-04 — O flip dry_run -> live e recusado pelo SERVIDOR quando falta qualquer criterio de D-46-14"
    test: >
      Com uma sessao de ADMINISTRADOR real (o guard resolve o ator de
      `auth.jwt() #>> '{app_metadata,role}'`, nunca de parametro — a Management API
      nao serve, ela recusa antes com 42501), chamar
      `SELECT public.salvar_config_purga(p_modo => 'live', p_confirmo_live => true);`
    expected: >
      SQLSTATE 22023, e a mensagem tem de NOMEAR EXATAMENTE TRES criterios faltantes,
      porque foi isso que EU medi contra o estado real de hoje reproduzindo o SELECT
      da propria migration 0014: dias desde a primeira execucao de ENSAIO = 0
      (exigido 14; primeira em 2026-08-22 20:03:14-03) · execucoes de ensaio = 2
      (exigido 14) · etapas da allowlist em `origem = 'seed'` = 2 [aprovado,
      decisao_final] (exigido nenhuma). E tem de NAO nomear o criterio 3: eu medi
      `com_eleg = 1` (exigido >= 1), que e precisamente o conserto do BL-01 pousando
      — o recorte ANTIGO contava 2 ensaios, o NOVO conta 1, porque a execucao
      e3115161 tem 6 elegiveis e ZERO itens com `relato_dry_run`. Depois da sonda:
      `modo` tem de seguir `dry_run` e `logs_auditoria` NAO pode ganhar linha nova —
      a recusa nao escreve.
    why_human: >
      Eu reproduzi o PREDICADO do portao contra PROD e ele calcula a recusa. O que
      NAO esta provado e a TRANSICAO: que o corpo novo de `salvar_config_purga`
      (md5 `e10786bd4e21bce3e9dd956f6a479db2`, trocado hoje pela 0014) liga aquele
      SELECT ao RAISE, recusa de fato, e nao deixa efeito colateral. Isso e um
      invariante de transicao de estado — presenca de simbolo e fiacao nao o
      enxergam. A recusa que ESTA provada ao vivo (commit 0f44e53) foi contra o corpo
      ANTIGO (0013, md5 `9e1a55bee81aaa7b42d45e5a5a8fee7b`) e nomeava criterios
      diferentes. E exige sessao autenticada de admin: nao ha caminho automatizavel.

coincidental_reliance_items:
  - truth: "SC#4 / PURGA-07 — a candidatura sem decisao registrada e classificada corretamente"
    reason: fixture-only
    harden: >
      O degrau de COALESCE (`decisao_final` -> `historico` -> `updated_at` ->
      `data_candidatura`) e as quatro excecoes de politica so tem sujeito porque a
      fixture do 46-01 planta um caso para cada ramo. Contra dado de producao real, o
      conjunto elegivel e VAZIO e todo o predicado passaria por vacuidade. A
      propriedade e boa e a fixture e a forma certa de resolver — mas ela e uma
      PRECONDICAO NAO DECLARADA de toda a evidencia desta fase, e desaparece no dia
      do teardown. Promover para precondicao explicita: enquanto o conjunto elegivel
      real for vazio, nenhuma afirmacao sobre o predicado sobrevive a remocao da
      fixture.

human_verification:
  - test: "Ver `behavior_unverified_items[0]` — a recusa do flip contra o corpo novo (0014), com sessao de administrador real"
    expected: "22023 nomeando exatamente tres criterios; `modo` intacto; zero linha nova em `logs_auditoria`"
    why_human: "Exige sessao autenticada de admin; e um invariante de transicao de estado"
  - test: "Fechar `aprovado` e `decisao_final` em `/admin/retencao`, confirmando a janela de cada uma"
    expected: "`config_retencao_etapa.origem` passa de `seed` para `admin` nas duas; medido por mim hoje: 2 das 3 etapas da allowlist ainda em `seed`"
    why_human: "E acao de operador na tela, e e a unica pendencia que o TEMPO nao resolve — o servidor recusa o `live` enquanto for assim, mesmo depois de 2026-09-06"
  - test: "Provar `cron.alter_job` por execucao, num momento controlado — desarmar e rearmar o jobid 6"
    expected: "a alavanca de emergencia do runbook funciona de verdade"
    why_human: "Muta o agendamento de PROD. Privilegio, assinatura, `prokind='c'` e `prosecdef=false` estao medidos; a EXECUCAO nao. Herdado de BL-R3-01 e da 46-EVIDENCIA-APPLY §Pendencias 1"
---

# Phase 46 · Purga Automatica (dry-run -> live) — Relatorio de Verificacao

**Objetivo da fase (ROADMAP):** *"O dado expira sozinho, dentro de um cerco — e a primeira coisa
que a purga faz em producao e **nao apagar nada**."*
**Verificado:** 2026-08-23T04:45-03 · **Status:** `gaps_found` · **Score:** 3/5 must-haves
**Metodo:** 12 consultas read-only a PROD pela Management API (`node p46apply.cjs sql`,
exclusivamente `SELECT`), md5 dos 15 arquivos de migration contra o ledger, `npm run lint`,
diff mecanico do smoke. **PROD nao foi mutada por esta verificacao:** nenhuma migration, nenhum
deploy, nenhum smoke, nenhum `salvar_config_purga`, nenhum `cron.alter_job`.

---

## ⚠ PRIMEIRO — O ESTADO DE PRODUCAO, MEDIDO E NAO LIDO DE SUMMARY

### O que esta ARMADO

| Fato | Valor medido agora | Como |
|---|---|---|
| `config_purga.modo` | **`dry_run`** | `SELECT` direto |
| `config_purga.atualizado_em` (T0) | **2026-08-23 02:06:37.866049-03** | idem — T0 intacto |
| `cap_titulares` / `janela_notificacoes_meses` | 50 / 24 | idem |
| `cron.job` jobid 6 | `active = true`, `0 3 * * *`, `SELECT public.varrer_purga_retencao();`, user `postgres` | `cron.job` |
| Migrations no ledger | **15/15**, `20260823000001`..`15` | `supabase_migrations.schema_migrations` |
| Fidelidade md5 disco x ledger | **15/15 batem** — as `…0001`..`…0005` batem sem o `\n` final (aplicadas pela via antiga), as `…0006`..`…0015` batem byte a byte | `md5 -q` x `md5(statements[1])` |
| `md5(prosrc)` de `salvar_config_purga` | `e10786bd4e21bce3e9dd956f6a479db2` | = valor "depois" da `46-EVIDENCIA` ✅ |
| `has_table_privilege(_, 'config_purga', 'UPDATE'\|'INSERT'\|'DELETE')` | **`false` para `anon`, `authenticated` E `service_role`** | o `REVOKE` da `…0015` pousou nos tres |
| RLS em `config_purga` | ligada, **1 unica policy e ela e de LEITURA** (`config_purga_admin_read`, `polcmd = r`) | `pg_policy` |
| Edge Function `purgar-retencao` | `ACTIVE`, version 1 | Management API `/functions` |
| Trilha do flip `off -> dry_run` | **exatamente 1 linha** em `logs_auditoria`, `acao=alterar_config_purga`, `severidade=aviso`, `usuario_id` NAO NULO, com `dados_antes`/`dados_depois` | `SELECT` |

### O que NAO esta armado

| Fato | Valor medido agora | Consequencia |
|---|---|---|
| `cron.job_run_details` para jobid 6 | **0 linhas** (a tabela tem 2 666 linhas no total — a extensao funciona, os vizinhos rodam) | **A varredura NUNCA disparou.** As 4 linhas de `purga_execucoes` sao chamadas manuais |
| Noites de dry-run automatico decorridas | **0 de 14** | O "periodo documentado" do SC#1 tem T0 anotado e zero noites |
| Smoke `p46_purga_smoke.sql` na forma atual | **nunca executado** — 153 linhas EXECUTAVEIS alteradas desde o ultimo 27/27 | As migrations aplicadas hoje estao sem prova ponta a ponta |
| Portao do flip: criterios que faltam | **3 de 5** (dias=0/14 · execucoes=2/14 · etapas em `seed`=2) | O `live` e recusado hoje — por calculo que eu reproduzi, nao por execucao da RPC |

### O que a noite de 2026-08-24 00:00-03 vai fazer, derivado do `prosrc` vivo

`cron.timezone = GMT`, entao `0 3 * * *` e **03:00 UTC = 00:00 America/Sao_Paulo** — nao 03:00
local. A primeira varredura automatica da historia deste sistema e daqui a ~19 h. Tracando o
corpo vivo de `varrer_purga_retencao` contra o estado que eu medi:

1. Le `modo = 'dry_run'`, `cap = 50`.
2. **RETEN-05:** roda o `DELETE FROM public.notificacoes_enviadas WHERE criado_em + interval
   '24 months' < now()`. A notificacao mais velha tem 0,7 mes -> alcance **0 linhas**. Como
   `modo <> 'live'`, levanta `P46RN` e a subtransacao reverte. `notificacoes_expurgadas = 0`.
3. Vault tem `project_url` e `edge_invoke_key` -> **nao** aborta com `segredo_ausente`.
4. Materializa o conjunto: **4 elegiveis**, todos fixture. 4 < 50 -> **nao** aborta com
   `cap_excedido`.
5. Abre 1 linha em `purga_execucoes` (`veredito='dry_run'`, `situacao='executando'`) e 4 itens.
6. Para cada um: `SELECT public.anonimizar_candidato(id, true)` — o corpo destrutivo COMPLETO
   executa e e derrubado pelo terminador `P45DR`; `SQLERRM` vira `relato_dry_run`. Se o
   terminador tivesse sumido do motor, a varredura seria **DERRUBADA** com `P46NT` sem gravar
   item e sem fechar a execucao (fail-closed, e eu li esse ramo no `prosrc`).
7. `net.http_post` **nao** e alcancado — o bloco (g.5) vive inteiro dentro de `IF v_modo = 'live'`.
8. Fecha: `veredito='dry_run'`, `processados=0`, `notificacoes_expurgadas=0`.

**Resultado esperado amanha: +1 linha de ledger, +4 itens, ZERO destruicao.** Que e, literalmente,
o objetivo da fase. **Amanha e o dia em que "a purga nao apaga nada" deixa de ser uma propriedade
da configuracao e vira uma propriedade observada do agendador.** Hoje ainda nao e.

---

## Verdades Observaveis (Success Criteria do ROADMAP)

| # | Verdade | Status | Evidencia |
|---|---|---|---|
| 1 | O cron roda em PROD por periodo documentado em `dry_run` antes de qualquer execucao real, e o relatorio do dry-run e gerado pela MESMA query do delete real, envolvida em rollback | ✗ **FAILED (parcial)** | **Metade B VERIFICADA:** `varrer_purga_retencao` chama `public.anonimizar_candidato(id, true)` — a mesma funcao do delete real — e 4 itens em PROD carregam `relato_dry_run` com as doze contagens por passo. RETEN-05 e UM `DELETE`, contado por `GET DIAGNOSTICS` **antes** do `RAISE`, revertido por `P46RN`: nao ha segunda definicao da regra. **Metade A FALHOU:** `cron.job_run_details` para jobid 6 = **0 linhas**; 0 de 14 noites |
| 2 | O flip `dry-run -> live` e checkpoint separado e evidenciado, nunca efeito colateral de um deploy | ⚠️ **PRESENT_BEHAVIOR_UNVERIFIED** | Portao aplicado (`…0014`, md5 conferido). Eu reproduzi o `SELECT` do portao contra PROD: falta **3 de 5**. RLS + `REVOKE` fecham toda outra porta de escrita (medido). Trilha atomica existe (1 linha, ator do servidor). **Mas a recusa end-to-end com o corpo NOVO nunca foi executada** — a que esta provada ao vivo foi contra o corpo `…0013` |
| 3 | Uma execucao nao passa do cap de blast-radius, e um kill switch sem deploy — provado desligando de verdade | ✓ **VERIFIED** | **Kill switch provado POR EXECUCAO:** 2 linhas de ledger com `modo_vigente='off'`, `veredito='desligado'`, `elegiveis` 6 e 4, `processados=0` — desligou de verdade sobre conjunto nao-vazio, nao por leitura de config. Cap: `ck_config_purga_cap` vivo, guard de 1..500 em `salvar_config_purga`, contrato de fronteira na assercao (g), verde em 27/27; `…0014`/`…0015` nao tocam o cap |
| 4 | Uma candidatura sem decisao registrada e classificada corretamente — `COALESCE` explicito e allowlist de estados terminais | ✓ **VERIFIED (coincidental-reliance)** | `candidaturas_alem_da_janela()` (md5 `b4fdb3a1…`, o 2º re-pin) devolve 4 com `ancora_origem` em `{historico, decisao_final, updated_at}` — o degrau de COALESCE visivel no dado. Allowlist = `config_retencao_etapa.elegivel_purga`, 3 de 8 verdadeiras, **jamais denylist**. PURGA-07 ja `Complete` no REQUIREMENTS.md. ⚠ Ver `coincidental_reliance_items`: so tem sujeito por causa da fixture |
| 5 | Cada execucao deixa linha no ledger com o que foi apagado, quando e sob qual politica — inclusive `notificacoes_enviadas` | ✓ **VERIFIED** | 4 execucoes -> 4 linhas com `modo_vigente`, `cap_vigente`, `elegiveis`, `processados`, `notificacoes_expurgadas`, `veredito`, `situacao`, `iniciada_em`, `concluida_em`. 10 itens com `etapa`, **`janela_meses_aplicada`** (24/24/18/24 — a politica), `ancora_origem`, `ancora_em`, tres `desfecho_*`, `relato_dry_run`. O `COMMENT` vivo de `notificacoes_enviadas` deixou de dizer *"Retention INDEFINITE, deferred to LGPD-OPS (M8+)"* e agora diz **"retention is NO LONGER open-ended"** — lido do catalogo, nao do disco |

**Score: 3/5 verdades verificadas** (1 presente-mas-com-comportamento-nao-exercitado, 1 falhou).

---

## O Portao de Fase Destrutiva, criterio por criterio

O ROADMAP §"Portao de fase destrutiva" trata os cinco itens como **exit criterion**, e diz com
todas as letras que eles "nao sao substituiveis por 'o smoke passou'". Grade abaixo, com a
distincao que o enunciado exige: **satisfeito por EVIDENCIA** x **satisfeito por ARGUMENTO**.

### 1 · `VERIFICATION.md` presente e com veredito — ✅ **por EVIDENCIA**

Este arquivo. `status: gaps_found`, nunca ausente, nunca `draft`. O precedente que justifica o
portao (a P39 fechou sem `VERIFICATION.md` e 2 defeitos CRITICOS chegaram a producao) esta
fechado nesta fase.

### 2 · Code review bloqueante ANTES do apply em PROD — ⚠️ **PARCIAL, por EVIDENCIA nos dois sentidos**

**Satisfeito para o que foi aplicado hoje.** A cadeia e real e a ordem esta no git:

| Commit | O que e | Achados |
|---|---|---|
| `13e5302` | `46-REVIEW-2` | 1 BLOCKER + 5 HIGH |
| `56485db` | `46-REVIEW-3` (re-revisao dos consertos) | **2 BLOCKERS, ambos introduzidos pelo proprio conserto** |
| `b7d4a18` | `46-REVIEW-4` (passe final) | **0 blockers, `seguro_aplicar: SIM`** |
| `7a9976d` | **APPLY** de `…0014` + `…0015` | — |

O review precede o apply. E o BL-01 que a `…0014` corrige era **real, nao hipotetico**: eu
reproduzi os dois recortes contra PROD e eles divergem — o ANTIGO conta **2** ensaios, o NOVO
conta **1**, porque a execucao `e3115161` tem 6 elegiveis e **zero** itens com `relato_dry_run`.
Catorze noites daquelas abririam o portao do flip sem uma linha de evidencia sobre o caminho do
delete.

**Violado para tres dos sete planos.** Os applies em PROD dos planos 46-05 (`aa96052`), 46-06
(`bd30684`) e 46-07 (`0f44e53`, `5351bde`) sao **todos anteriores** a `13e5302`, cujo proprio
assunto de commit diz *"code review retroativo de 46-05/06/07"*. Para aquelas migrations o review
foi **depois** — e achou um BLOCKER. Isto e um desvio do portao, ja consumado e ja mitigado (o
defeito foi corrigido pela `…0014` hoje, com review antes), mas **nao pode ser arredondado para
"satisfeito"**: era exatamente a forma do erro da P39.

### 3 · Asseracoes negativas obrigatorias — ✅ **por EVIDENCIA, reproduzidas por mim**

Nao aceitei nenhuma contagem de SUMMARY. Medidas agora, direto de PROD:

| Negativa | Medido |
|---|---|
| `public.candidatos` **reais** (fora do namespace da fixture) | **23** |
| `public.candidaturas` | **20** · `auth.users` **37** · `storage.objects/curriculos` **5** |
| `public.historico_candidatura` (trilha de decisao humana — RNF-07a) | **13** |
| `public.decisao_final` **3** · `public.retencao_hold` **1** | intactas |
| `processados` em TODAS as 4 execucoes | **0, 0, 0, 0** |
| `notificacoes_expurgadas` em TODAS as 4 | **0, 0, 0, 0** · `notificacoes_enviadas` **12** |
| `net.http_request_queue` (dispatch para `purgar-retencao`) | **0** |
| `net._http_response` nos ultimos 3 dias | 2, ambos 200, as 00:09-03 — vizinhos de notificacao, nao a purga |
| `logs_auditoria` com `acao ILIKE '%purga%'` | **exatamente 1** — o `off -> dry_run` do T0. **A recusa nao escreveu** |
| `config_purga.modo` | `dry_run` — o apply de hoje **nao mexeu no modo** |
| Escrita em `config_purga` por `anon`/`authenticated`/`service_role` | **impossivel**: `UPDATE`/`INSERT`/`DELETE` = `false` nos tres, RLS ligada com policy unica de LEITURA |

**Nenhuma linha de pessoa real foi tocada em toda a Phase 46.** Confirmado.

### 4 · Zero `--no-verify` — ✅ **por ARGUMENTO** (e digo isso de proposito)

`--no-verify` **nao deixa rastro forense no git**. Nenhuma consulta ao repositorio pode falsificar
esta afirmacao — ela e estruturalmente nao-verificavel a posteriori. O que eu consegui medir:

- `npm run -s lint 2>&1 | grep -c "error TS"` = **96**, exatamente a baseline congelada em
  `.husky/pre-commit`. O hook esta instalado, e a arvore de trabalho passa por ele hoje.
- Os sete SUMMARYs registram, cada um, "o hook rodou nos N commits e reportou 96 erros".
- A baseline nunca se moveu em 30+ commits desta fase, o que e consistente com o hook tendo
  rodado (e com o fato de que a fase quase nao tocou TypeScript).

Isto e **corroboracao forte, nao prova**. Registro como satisfeito por argumento.

### 5 · Dry-run/rollback exercitado pela MESMA query do delete real — ✅ **por EVIDENCIA, com uma ressalva que muda o significado**

O **mecanismo** esta provado e e o melhor artefato desta fase:

- A varredura nao reescreve o predicado: ela chama `public.anonimizar_candidato(r.candidato_id,
  true)`, a mesmissima funcao do delete real, cujo corpo **completo** executa e so entao e
  derrubado pelo terminador `P45DR`. O `SQLERRM` — as doze contagens por passo — vira
  `relato_dry_run`. **4 de 4 itens da execucao do T0 carregam esse relato**, e eu li o texto:
  *"o corpo COMPLETO da anonimizacao executou e esta sendo revertido agora"*.
- Se o terminador sumisse do motor, o retorno normal seria capturado e a varredura **derrubada**
  com `P46NT` sem gravar item nem fechar execucao — fail-closed, e a captura e **tipada**
  (`WHEN SQLSTATE 'P45DR'`), nunca generica.
- RETEN-05 e **um unico statement nos tres modos**: `DELETE`, `GET DIAGNOSTICS`, e fora de `live`
  um `RAISE ... USING ERRCODE = 'P46RN'` que reverte a subtransacao. A contagem sobrevive na
  variavel plpgsql porque rollback de subtransacao nao restaura variavel. **Nunca dois corpos,
  um para contar e outro para apagar** — que era o CR-02 da P39.

**A ressalva.** O portao diz "contra dados de forma viva". Os dados sao **forma viva** (schema,
constraints, FKs e triggers de producao) mas **nao sao dados vivos**: os 4 elegiveis sao
`4601b000-0000-4000-8000-00000000000{1..4}`, plantados pelo 46-01. **Nenhuma pessoa real jamais
entrou no conjunto elegivel**, e nem pode — a `previa_retencao()` devolve zero por ARITMETICA
(matriz de 24 meses, sistema mais novo que a janela). Os 14 dias de dry-run vao exercitar o motor
contra 4 sinteticos, 14 vezes.

**Isto e um limite do sistema, nao um defeito da fase** — e a fase o tratou corretamente, que e
a pergunta que o enunciado manda fazer (ver secao seguinte).

---

## A verificacao diferida da Phase 43: a contagem foi tratada como NAO-EXERCITADA?

**Sim, e de duas formas independentes.** Esta e a unica secao deste relatorio em que a fase sai
melhor do que a leitura ingenua sugeriria.

1. **Registrado antes de planejar.** `46-CONTEXT.md:391-392`, com estas palavras: *"`previa_retencao()`
   devolve ZERO por aritmetica. Qualquer plano que trate a contagem atual como sinal de correcao
   esta errado. O predicado e nao-exercitado; a Phase 46 e a primeira..."*
2. **Resolvido por construcao, nao por nota de rodape.** O plano 46-01 existe inteiro para isso:
   planta uma fixture **duravel** que torna o conjunto elegivel nao-vazio, *"sem ela 18 das 21
   assercoes passam por vacuidade"*. Medido hoje: `candidaturas_alem_da_janela()` = **4**, e o
   predicado foi visto ENCOLHENDO por politica (7 -> 6 pelo 46-02, 6 -> 4 pelo 46-03) — o que
   so e observavel sobre conjunto nao-vazio.
3. **E o portao do flip foi escrito para nao aceitar zero como prova.** O criterio 3 de D-46-14
   nao conta elegiveis: exige **EXISTS de um item com `relato_dry_run`**. O comentario da
   assercao `(d.4)` diz literalmente *"catorze noites de zeros nao provam NADA sobre o caminho do
   delete: a previa devolve zero por ARITMETICA, nao por defeito"*.

**O que a fase NAO cobriu pela mesma disciplina: `notificacoes_enviadas`.** A fixture planta
candidatos, nao notificacoes retrodatadas. A notificacao mais velha em PROD tem **0,7 mes** contra
uma janela de **24**. RETEN-05 esta na posicao exata em que `previa_retencao()` estava — regra
instalada, conjunto vazio por aritmetica, contagem que nao e sinal — e desta vez **sem** fixture
que a exercite em PROD. A unica prova de mordida vive na assercao `(m)`, que usa fixture
retrodatada dentro de envelope revertido, e que nao rodou na forma atual.

---

## Requisitos cujo UNICO comprovante e um teste NAO EXECUTADO

O enunciado pede estes por ID. Sao:

| Requisito | O que so o smoke prova | Assercao |
|---|---|---|
| **PURGA-04** | que o portao do flip recusa pelo recorte de **VEREDITO** — o BLOCKER-01, aplicado hoje pela `…0014` | `(d.7)`, `(d.8)`, `(d.9)` |
| **PURGA-04** | que a recusa por CONTAGEM e so por contagem, com a evidencia de ensaio replantada (BL-R3-02) | `(d.3)` |
| **RETEN-05** | que a regra de retencao de notificacoes **MORDE** sobre linha retrodatada | `(m)` |
| **PURGA-01** | que o ramo `live` **enfileira** o `net.http_post` — a unica condicao ⊕ que mede o dispatch (as quatro de ledger passariam com o bloco (g.5) apagado) | `(m)`, metade ⊕ |

O ultimo 27/27 verde e do commit `5351bde`, contra um banco **sem** a `…0014` e **sem** a
`…0015`, com `(d)` na forma que dois consertos de BLOCKER depois reescreveram. Diff medido:

```
git diff 5351bde..HEAD -- supabase/tests/p46_purga_smoke.sql
  427 linhas alteradas (+383 / -44)
  153 delas EXECUTAVEIS (excluidos comentarios e linhas em branco)
```

A propria `46-REVIEW-4.md` §"O que eu NAO consegui verificar" classifica `(d.3)` como
**"CORRETO POR TRACADO, nao por execucao"** e diz que "a prova definitiva e o passo 4".
E a precondicao nº 1 do seu `seguro_aplicar` era rodar o smoke **na mesma sessao do apply**.
Nao foi. Este e o gap central da fase.

---

## Cobertura de Requisitos

| Req | Descricao | Status | Evidencia |
|---|---|---|---|
| **PURGA-01** | Cron espelhando o padrao do `notif-retry-sweep` | ✗ **BLOQUEADO** | Job 6 existe, `active`, comando pinado — e **nunca disparou** (`job_run_details` = 0). Instalado ≠ provado |
| **PURGA-02** | Dry-run executa a MESMA query do delete real, em rollback | ✓ **SATISFEITO** | Mesma chamada de funcao, nao query equivalente. 4/4 itens com `relato_dry_run`. RETEN-05 em statement unico revertido por `P46RN` |
| **PURGA-03** | Primeira ativacao em PROD e dry-run, por periodo documentado | ⚠ **PARCIAL** | Primeira ativacao **e** `dry_run` (1 linha de auditoria `off -> dry_run`, T0 no servidor, minimo do flip 2026-09-06 no runbook). Periodo: **0 de 14 noites** |
| **PURGA-04** | Flip e checkpoint separado e evidenciado | ⚠ **PRECISA DE HUMANO** | Portao no SERVIDOR e nao em checklist; RLS + `REVOKE` fecham toda outra porta; recusa calculada por mim contra PROD (3 de 5 faltando). **Recusa end-to-end com o corpo novo: nao executada** |
| **PURGA-05** | Cap de blast-radius + kill switch | ✓ **SATISFEITO** | Kill switch provado **desligando de verdade** (2 execucoes `off`/`desligado` sobre conjunto nao-vazio, `processados=0`). Cap com `CHECK` vivo, guard 1..500, e assercao de fronteira verde |
| **PURGA-06** | Ledger: o que foi apagado, quando, sob qual politica | ✓ **SATISFEITO** | 4 execucoes + 10 itens, com `janela_meses_aplicada` e `ancora_origem` — a politica, e nao so a contagem |
| **PURGA-07** | Predicado nao engole linhas por NULL; allowlist, nunca denylist | ✓ **SATISFEITO** | Ja `Complete`. Degrau de COALESCE visivel no dado; allowlist por `elegivel_purga` |
| **RETEN-05** | Retencao de `notificacoes_enviadas` definida **e aplicada** | ✗ **BLOQUEADO** | Definida (janela 24, `DELETE` unico, `COMMENT` vivo corrigido). **Aplicada: nunca** — alcance 0 por aritmetica, e a prova de mordida `(m)` mudou e nao rodou |

Nenhum requisito ORFAO: os 8 IDs do ROADMAP aparecem nos plans e todos foram avaliados.

---

## Anti-padroes

Varredura sobre os arquivos que a fase tocou (migrations `20260823*`, smoke, EF `purgar-retencao`):

| Achado | Severidade | Nota |
|---|---|---|
| Nenhum `TBD`/`FIXME`/`XXX` sem referencia a trabalho formal | — | limpo |
| `md5` das `…0001`..`…0005` diverge do ledger em 1 octeto | ℹ️ **Info** | E o `\n` final; o corpo bate byte a byte sem ele. Residuo da via de apply antiga, ja documentado no CLAUDE.md. **Nao e perda de comentario** |
| `HI-01` da `46-REVIEW-4` continua aberto | ⚠️ **Warning** | O invariante da `…0015` foi medido **uma vez, no apply**, e nao tem guarda recorrente: nenhum smoke le `has_table_privilege`/`relacl`. Um `GRANT ALL ON ALL TABLES … TO service_role` reabriria o buraco com todos os portoes verdes |
| `HI-02` da `46-REVIEW-4` continua aberto | ⚠️ **Warning** | A tabela de vigilancia dos 14 dias do runbook nao nomeia o sinal do criterio 3 novo (`relato_dry_run`) — e PROD **ja contem hoje** a execucao que ela deixa passar (`e3115161`) |
| 8 linhas de PII sintetica residentes em `public.candidatos` de PROD | ⚠️ **Warning** | **Deliberado** (fixture duravel; o runbook proibe o teardown antes do flip) mas com decisao de destino em aberto — ver gaps |

---

## Spot-checks comportamentais executados

| Comportamento | Comando | Resultado | Status |
|---|---|---|---|
| Fidelidade das 15 migrations | `md5 -q` de cada arquivo x `md5(statements[1])` do ledger | 15/15 batem | ✓ PASS |
| O `REVOKE` da `…0015` pousou | `has_table_privilege` nos 3 papeis x 4 verbos | `UPDATE`/`INSERT`/`DELETE` = false; `SELECT` = true | ✓ PASS |
| O portao do flip recusaria hoje | reproducao literal do `SELECT` de `…0014:435-455` contra PROD | 3 de 5 criterios faltam | ✓ PASS |
| O conserto do BL-01 mudou o recorte | recorte antigo x novo sobre o mesmo ledger | 2 ensaios -> **1** | ✓ PASS |
| Baseline de tipos | `npm run -s lint \| grep -c "error TS"` | **96** = baseline congelada | ✓ PASS |
| EF `purgar-retencao` publicada | Management API `/v1/projects/{ref}/functions` | `ACTIVE`, v1 | ✓ PASS |
| Cron disparou alguma vez | `count(*) FROM cron.job_run_details WHERE jobid=6` | **0** | ✗ **FAIL** |
| Smoke `p46_purga_smoke.sql` = 27/27 | — | **NAO EXECUTADO** (decisao do operador) | ? SKIP -> gap |

---

## Ordem de fechamento sugerida

1. **Rodar o smoke** — `node p46apply.cjs run supabase/tests/p46_purga_smoke.sql`, **lendo o
   contador** `smoke46p.pass` = 27 no RESUMO (z). "Nao levantou excecao" nunca foi "as assercoes
   rodaram". Fecha o gap central e os quatro requisitos da tabela acima.
2. **Deixar a noite de 2026-08-24 00:00-03 passar** e conferir `cron.job_run_details` para o
   jobid 6 + a linha nova de ledger. Fecha a metade A do SC#1 e converte PURGA-01 de instalado
   em provado.
3. **`/admin/retencao`**: confirmar as janelas de `aprovado` e `decisao_final`. E a unica
   pendencia que o tempo **nao** resolve.
4. **Provar `cron.alter_job`** num momento controlado, antes de precisar dela.
5. **Decidir e datar o destino da fixture** no dia do flip.
6. Fechar `HI-01` (guarda recorrente do privilegio) e `HI-02` (o sinal do criterio 3 na tabela
   de vigilancia) — nenhum bloqueia, os dois envelhecem mal.

---

## Resumo dos gaps

A fase construiu, e isso esta provado, um cerco de qualidade incomum: o dry-run **e** a mesma
funcao do delete real e nao uma copia do `WHERE`; o kill switch foi provado **desligando de
verdade** e nao lendo config; o portao do flip vive numa migration e nao num checklist, e recusa
hoje por tres motivos que eu calculei contra o estado real; a unica porta de escrita da
configuracao esta fechada nos tres papeis e a RLS nao tem policy de escrita; e **nenhuma linha de
pessoa real foi tocada**, o que eu medi em oito tabelas.

O que falta nao e construcao — e **exercicio**. Tres coisas, e as tres tem a mesma forma:

1. **O agendador nunca rodou.** A propriedade "a purga roda toda noite e nao apaga nada" e hoje
   uma afirmacao sobre a `cron.job`, nao uma observacao em `cron.job_run_details`.
2. **O que foi aplicado hoje nao tem prova ponta a ponta.** O smoke mudou 153 linhas executaveis
   desde o ultimo verde e nao rodou — inclusive as tres assercoes escritas especificamente para
   provar o BLOCKER que a `…0014` conserta.
3. **RETEN-05 nunca mordeu**, e nao pode morder por ~23 meses; a fixture que resolveu esse mesmo
   problema para o predicado de titulares nao foi estendida a notificacoes.

Nenhum desses tres e um defeito do codigo. Os tres sao a diferenca entre **arranjado** e
**provado** — que e exatamente a distincao que o portao de fase destrutiva existe para nao deixar
arredondar.

---

_Verificado: 2026-08-23T04:45-03_
_Verificador: gsd-verifier (goal-backward, FORCE)_
_PROD nao foi mutada por esta verificacao: 12 consultas, todas `SELECT`/catalogo. `config_purga.modo` = `dry_run` e T0 = `2026-08-23 02:06:37.866049-03` intactos ao fim, `cron.job` jobid 6 `active` com 0 corridas, ledger com 15 migrations._
