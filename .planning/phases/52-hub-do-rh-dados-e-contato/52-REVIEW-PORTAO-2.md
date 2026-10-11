---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-11T16:58:00Z
depth: deep
diff_base: 0d70ac7d433db9a9a644987dcf442cc50022aaae
reviewed_head: 040c6b4d6d2e1c6b839c59a14394d1bdf0b138c4
scope: review adversarial bloqueante nº 2 do portão do bloco B da Phase 52 (52-14, Task 2), rodada de conserto do 52-REVIEW-PORTAO-1. Escopo — o diff de código inteiro `0d70ac7d..040c6b4d -- . ':!.planning'` (113 arquivos, 107 commits) e o `52-15-PLAN.md`, lido como o programa que escreve em PROD; foco na rodada `77d2ae2b..040c6b4d` (5 commits — 1A aacef0a6 CR-01, 0b4d486b WR-01, 794aaf26 WR-02; 1B 1f688f52 remapeamento WR-03, 040c6b4d chave `opcoes_sjt`). Nesta rodada o gerador do bloco C (`gen-sjt-v2.py`), o `test_gen_sjt_v2.py` e o `p52_banco_sjt_smoke.sql` (j)–(l) foram lidos em profundidade total (o -1 os leu com profundidade menor). Lidos como contexto, fora da lista revisada — 52-REVIEW-PORTAO-1, 52-14-DECISAO-RODADA-1 (vinculante), 52-14-PLAN Task 2, 52-CONTEXT (D-24, D-36), 52-UI-SPEC, 52-VALIDATION, 52-02-SUMMARY, 52-16-SUMMARY, 52-17/52-18-PLAN, CLAUDE.md, `useAutosaveAvaliacao.ts`, a migration 20261003000001 (leitura do caso aberto pelo RH), a semeadora 20260611000002 e os corpos VIVOS (só leitura) de `pontuar_sjt` e `get_opcoes_sjt`. PROD só leitura (`set transaction read only`) ou no ensaio que aborta. Re-executados pelo revisor — `p52_ensaio.cjs --vistas supabase/tests/p52_leituras_rh_smoke.sql` (ENSAIO VERDE, prefixadas=[20261011000001,20261011000002], vistas=igual, 52l=20/20); `p52_mutacoes.cjs` (8/8 mordem, controle verde, nada persistiu); `p52_portao.cjs --auto-teste` (68 ok); o gerador do bloco C num arquivo do scratchpad + `p52_ensaio.cjs --migracoes=<esse arquivo> supabase/tests/p52_banco_sjt_smoke.sql` (ENSAIO VERDE, 52b=12/12, `remap=32/8,refs=3,linhas=1,em_curso=1`); uma mutação do revisor (remap e POS-remap retirados) → `P52B FAIL (j)`; `test_gen_sjt_v2.py` (20 ok); vitest de avaliacao + avaliacao-cognitiva (37 arquivos, 289 verdes) e guards (15 arquivos, 146 verdes); `tsc` (89 erros, nenhum em arquivo do diff); `capturar()` duas vezes (diferencas=[]) e `diferencas()` sobre uma cópia alterada das chaves novas (as duas aparecem). Medido em PROD (só leitura; só contagens, ids de item e ids de candidatura) — 36 `opcao_id` fora da forma v4 em 9 itens SJT ativos; o id velho aparece em UMA linha do ledger (20260611000002) e em zero `prosrc`/views/policies/defaults/checks; 18 itens com ids v4 sem prefixo comum; nenhuma trigger em `scores_candidato`/`perguntas_opcao_sjt`; escritores vivos de `usuarios_rh` = `atualizar_meu_perfil_rh` e `gerir_usuario_rh_mutacao` (`data_ultimo_login` sem escritor, último valor 2026-04-20); `realtime.messages` é a única tabela particionada (sem partições); 123 tabelas, 18 MB; o `em_curso=1` é a candidatura f73682b6 da vaga «[TESTE] Dentista — Funil E2E». Nada foi aplicado, publicado ou empurrado. O único commit é este arquivo.
files_reviewed: 114
files_reviewed_list:
  - docs/specs/BANCO-SJT-V2.md
  - efdeploy.cjs
  - scripts/geradores/gen-sjt-v2.py
  - scripts/geradores/sjt_texto.py
  - scripts/geradores/tabela-comprimento-sjt.py
  - scripts/geradores/test_gen_sjt_v2.py
  - scripts/p52_ensaio.cjs
  - scripts/p52_mutacoes.cjs
  - scripts/p52_portao.cjs
  - scripts/p52_tipografia.cjs
  - scripts/p52_vitest_delta.cjs
  - src/__tests__/guards/p52-ban-jargao-entrevista.grep.test.ts
  - src/__tests__/guards/p52-ban-modelo-modelo.grep.test.ts
  - src/__tests__/guards/p52-ban-percentil-bigfive-hub.grep.test.ts
  - src/__tests__/guards/p52-ban-tempo-sugerido.grep.test.ts
  - src/components/RHSidebar.tsx
  - src/components/__tests__/RHSidebar.activePage.test.tsx
  - src/components/layouts/CandidatoNavbar.tsx
  - src/components/layouts/__tests__/CandidatoNavbar.test.tsx
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/components/pages/FormularioCandidaturaPage.tsx
  - src/components/pages/LoginCandidatoPage.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.navbar.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.reaberta.test.tsx
  - src/components/pages/__tests__/FormularioCandidaturaPage.agradecemos.test.tsx
  - src/components/pages/__tests__/LoginCandidatoPage.test.tsx
  - src/components/ui/__tests__/select.test.tsx
  - src/components/ui/select.tsx
  - src/features/agendamento/components/AgendamentoBlock.tsx
  - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
  - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/navegacao-cognitiva.test.tsx
  - src/features/avaliacao/components/AvaliacaoContainer.tsx
  - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx
  - src/features/avaliacao/components/BigFiveResultadoHub.tsx
  - src/features/avaliacao/components/DevolutivaBigFiveView.tsx
  - src/features/avaliacao/components/RedacaoEditorScreen.tsx
  - src/features/avaliacao/components/SairDaProvaButton.tsx
  - src/features/avaliacao/components/ScorecardAvaliacao.tsx
  - src/features/avaliacao/components/SjtCasoAbertoScreen.tsx
  - src/features/avaliacao/components/SjtMcDetalhe.tsx
  - src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx
  - src/features/avaliacao/components/TextoComCitacoes.tsx
  - src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx
  - src/features/avaliacao/components/__tests__/BigFiveResultadoHub.test.tsx
  - src/features/avaliacao/components/__tests__/RedacaoEditorScreen.saida-rascunho.test.tsx
  - src/features/avaliacao/components/__tests__/SairDaProvaButton.test.tsx
  - src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx
  - src/features/avaliacao/components/__tests__/SjtMcDetalhe.test.tsx
  - src/features/avaliacao/components/__tests__/TextoComCitacoes.test.tsx
  - src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx
  - src/features/avaliacao/hooks/useIdsAvaliacoesConcluidas.ts
  - src/features/avaliacao/lib/bigFiveRotulos.tsx
  - src/features/avaliacao/services/__tests__/avaliacoesRhService.test.ts
  - src/features/avaliacao/services/avaliacoesRhService.ts
  - src/features/decisao/components/RespostaCasoAbertoSjt.tsx
  - src/features/decisao/components/__tests__/RespostaCasoAbertoSjt.test.tsx
  - src/features/entrevista/components/EntrevistaScorecardInline.tsx
  - src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx
  - src/features/entrevista/components/__tests__/GuiaEntrevistaPanel.test.tsx
  - src/features/entrevista/components/__tests__/TranscricaoReviewPanel.test.tsx
  - src/features/hub-candidato/components/AnaliseIABlock.tsx
  - src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx
  - src/features/hub-candidato/components/ContatoCandidatoHeader.tsx
  - src/features/hub-candidato/components/DadosCadastroBloco.tsx
  - src/features/hub-candidato/components/HubCandidatoRH.tsx
  - src/features/hub-candidato/components/HubSection.tsx
  - src/features/hub-candidato/components/RespostasInscricaoBloco.tsx
  - src/features/hub-candidato/components/TextoComLinks.tsx
  - src/features/hub-candidato/components/__tests__/AnaliseIABlock.test.tsx
  - src/features/hub-candidato/components/__tests__/contatoCandidatoHeader.test.tsx
  - src/features/hub-candidato/components/__tests__/dadosCadastroBloco.test.tsx
  - src/features/hub-candidato/components/__tests__/hubAbas.test.tsx
  - src/features/hub-candidato/components/__tests__/hubAcoesEmTriagem.test.tsx
  - src/features/hub-candidato/components/__tests__/hubAcoesEncerrada.test.tsx
  - src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx
  - src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx
  - src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx
  - src/features/hub-candidato/components/__tests__/respostasInscricaoBloco.test.tsx
  - src/features/hub-candidato/hooks/useCadastroCandidatoRh.ts
  - src/features/hub-candidato/lib/__tests__/contato.test.ts
  - src/features/hub-candidato/lib/__tests__/formatos.test.ts
  - src/features/hub-candidato/lib/__tests__/linkify.test.ts
  - src/features/hub-candidato/lib/contato.ts
  - src/features/hub-candidato/lib/formatos.ts
  - src/features/hub-candidato/lib/linkify.ts
  - src/features/hub-candidato/services/__tests__/analiseCandidatoService.test.ts
  - src/features/hub-candidato/services/__tests__/cadastroCandidatoRhService.test.ts
  - src/features/hub-candidato/services/analiseCandidatoService.ts
  - src/features/hub-candidato/services/cadastroCandidatoRhService.ts
  - src/features/revisao/components/ContextoRejeicaoTriagemRevisao.tsx
  - src/features/revisao/components/ResponderRevisaoDialog.tsx
  - src/features/revisao/components/__tests__/ContextoRejeicaoTriagemRevisao.test.tsx
  - src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx
  - src/features/revisao/services/__tests__/revisaoService.test.ts
  - src/features/revisao/services/revisaoService.ts
  - src/features/triagem/components/ProvenienciaIABadge.tsx
  - src/features/triagem/components/RejeitarCandidaturaDialog.tsx
  - src/features/triagem/components/__tests__/ComparativoScreen.test.tsx
  - src/features/triagem/components/__tests__/ProvenienciaIABadge.test.tsx
  - src/features/triagem/components/__tests__/RedacaoReviewPanel.test.tsx
  - src/features/triagem/pdf/__tests__/exportComparativo.test.ts
  - src/features/vagas/lib/blocosFormulario.ts
  - supabase/functions/ler-cadastro-candidato-rh/index.test.ts
  - supabase/functions/ler-cadastro-candidato-rh/index.ts
  - supabase/migrations/20261011000001_p52_leituras_rh.sql
  - supabase/migrations/20261011000002_p52_nomes_rh_por_papel.sql
  - supabase/tests/p52_banco_sjt_smoke.sql
  - supabase/tests/p52_leituras_rh_smoke.sql
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-15-PLAN.md
findings:
  critical: 0
  warning: 3
  info: 9
  total: 12
status: issues_found
---

# Phase 52: Code Review Report — portão nº 2 do bloco B (52-14, Task 2)

**Reviewed:** 2026-10-11T16:58:00Z
**Depth:** deep
**Files Reviewed:** 114 — os 113 arquivos de código do diff e o `52-15-PLAN.md`
**Status:** issues_found, **0 crítico** — nada aqui bloqueia o apply/deploy/push do 52-15. Os três warnings têm
dono fora do caminho de escrita do bloco B (52-18 e os registros do 52-14).

## Summary

Parti da hipótese de que a rodada de conserto tinha introduzido defeito novo (memória «re-revisar o conserto
antes do apply»). Procurei em três lugares: nas telas do candidato que a 1A mexeu, no arnês que a 52-15 usa para
provar o apply, e no remapeamento da 1B, que reescreve resposta gravada de candidato.

**No caminho de escrita do bloco B não achei regressão.** A rodada não tocou migration, EF, `p52_portao.cjs`,
`p50_enumera.cjs`, `p46apply.cjs` nem `efdeploy.cjs` (`git diff --stat 77d2ae2b..HEAD` sobre esses caminhos: vazio).
O ensaio do bloco B segue verde com as duas chaves novas, as 8 mutações mordem e o auto-teste do portão segue com 68
casos. O 52-15 não aplica a 0003: o `supabase/migrations/` só tem `…0001` e `…0002`. A regra (8) do portão lê por
forma as `_p52_` da árvore do pin, então nada do bloco B depende da 0003. O código do remapeamento sobe no push do
52-15 como arquivo inerte; o `--caminhos` do enumerador cobre `scripts/geradores/` e `supabase/tests/p52_`.

**Os três warnings estão fora desse caminho:**
- WR-01: o 52-18, que vai aplicar o remapeamento, ainda o descreve como aditivo e reversível.
- WR-02: o remapeamento, somado a `pontuar_sjt`, dá nota parcial silenciosa a quem estiver no meio do SJT na hora
  do apply.
- WR-03: a emenda da D-36 não chegou aos documentos que a UAT e o verificador leem.

### Fechamento dos achados do 52-REVIEW-PORTAO-1

| Achado do -1 | Estado | Evidência |
|---|---|---|
| CR-01 — Big Five e Caso prático saíam direto e perdiam as respostas | **fechado** | `BigFiveQuestionnaireScreen.tsx:383-389`: `temRespostaNaoSalva={answeredCount > 0}`, sem `antesDeSair`. `SjtCasoAbertoScreen.tsx:247-251`: `temRespostaNaoSalva={texto.trim() !== ''}`. `navegacao-provas.test.tsx` cobre «sem resposta → direto, sem flush», «1 resposta → diálogo; Continuar mantém; Sair navega» e «só espaços → direto». O RED do commit falhou em `alertdialog` ausente. Vitest: 289/289. Decisão vinculante (P1) cumprida. |
| WR-01 — Redação gravava `{}` por cima do rascunho | **fechado** (na Redação) | `RedacaoEditorScreen.tsx:210-214,228,378,407`: `editouRef` + `flushSeEditou` na saída e no blur; o Enviar segue com `flushNow`. O teste novo usa o hook REAL e cobre «sair antes da releitura», «blur + saída», «rascunho de outra pergunta» e os dois controles. Resíduos anteriores à rodada: IN-01, IN-02. O `onBlur` do Caso prático (`SjtCasoAbertoScreen.tsx:276`) ainda chama `flushNow` sem condição, mas essa tela nunca relê o rascunho, e o envio grava o buffer da sessão: não há perda (ver IN-03). |
| WR-02 — o `capturar()` não via `usuarios_rh` | **fechado** | `p52_ensaio.cjs:327-328,357`: `FP_USUARIOS_RH`, `<contagem>:<md5>` de `to_jsonb` da linha inteira. Medido: duas capturas seguidas → `[]`. Uma cópia com o md5 trocado → `usuarios_rh: "9:3891…c3" -> "9:3891…c0"`. `candidaturas` ficou de fora: item A, aceito, IN-04. |
| WR-03 — `opcao_id` artesanal = gabarito | **escrito e ensaiado; apply pendente (bloco C)** | O `DO $remap$` (`gen-sjt-v2.py:394-462`) fica entre a retirada e o POS. Reproduzido: `remap=32/8,refs=3,linhas=1,em_curso=1`, 52b=12/12. Uma mutação do revisor (sem remap) dá `P52B FAIL (j): 32 … fora da forma uuid v4`. O apply é do 52-18, sob checkpoint (decisão P2). Ver WR-01 e WR-02. |
| IN-01..IN-05, IN-07..IN-11 | **abertos, sem regressão** | Nenhum arquivo deles mudou na rodada. A disposição vai ao 52-14-SUMMARY (decisão do operador). |
| IN-06 — POS da 0002 nunca provado por mutação | **aberto** | `p52_mutacoes.cjs` só tem L1..L8. Nenhuma mutação mira o `P52N POS-PORTAO (outros\|colunas)`. Item F, IN-05 abaixo. |

### Disposição dos pontos A–L levantados pelos executores

| # | Ponto | Veredito | Evidência / dono |
|---|---|---|---|
| A | `candidaturas` fora do `capturar()`; as escritas (h)/(t) do smoke ficam sem a rede «PERSISTIU» | **aceito, info (IN-04)** | As escritas (h)/(t) (`p52_leituras_rh_smoke.sql:655,665,1288,1299`) estão dentro de blocos `BEGIN … RAISE 'reverter' … EXCEPTION WHEN SQLSTATE 'P52L1'`. O savepoint desfaz a escrita antes do aborto da requisição: são duas guardas independentes, mais o txid por `ponto()`. Elas atingem candidaturas reais (`smoke52l.sjt_cand` sai de `scores_candidato`), então uma impressão digital estreita seria melhor que nenhuma. Dono: 52-01. |
| B | Digitar antes de a releitura responder: o buffer recebe o texto salvo velho e a caixa mostra o digitado | **real, anterior à rodada, info (IN-01)** | `RedacaoEditorScreen.tsx:191,196`: `setTexto(atual ? atual : salvo)` com `update({…, texto: salvo})` incondicional. Sem outra tecla, a saída grava o salvo e perde o que foi digitado antes da releitura. O Enviar manda a caixa à EF, então o envio sai certo. Antes da rodada era igual. Dono: 52-02. |
| C | Uma linha por `teste`: digitar na pergunta 0 sobrescreve o rascunho de outra pergunta | **real, desenho anterior, info (IN-02)** | Sair sem editar já não apaga (teste «rascunho de OUTRA pergunta»). Editar a pergunta 0, já enviada (o `idx` sempre começa em 0), troca o `pergunta_id` do buffer e apaga o rascunho da 1. Dono: backlog. |
| D | «Sair» ainda persiste respostas pelo flush de desmontagem enquanto o diálogo diz «não serão salvas» | **real, info (IN-03)** | `useAutosaveAvaliacao.ts:132-140`: com o timer armado, o unmount grava. Para o candidato a frase é verdadeira: nada relê. Mas o caso aberto é LIDO pelo RH em `respostas_avaliacao` (`20261003000001…sql:277`). O `flush` engole erro (`useAutosaveAvaliacao.ts:92-103`) e o `handleSubmit` do Caso segue para a EF (`SjtCasoAbertoScreen.tsx:158-163`). Se o flush do envio falhar, o RH lê o texto «descartado» da sessão anterior ao lado da nota do texto enviado. A parte do envio é anterior à rodada. Dono: 52-02. |
| E | Os registros da D-36 seguem com a regra antiga | **real, warning (WR-03)** | `52-UI-SPEC.md:568,720`, `52-VALIDATION.md:43`, `52-CONTEXT.md:116,290` e a `ref` de `52-02-SUMMARY.md:81` (o `describe` foi renomeado). Dono: 52-14. |
| F | IN-06 aberto | **confirmado, info (IN-05)** | Ver a tabela acima. Dono: 52-08. |
| G | A varredura do PRE (`to_jsonb` de toda tabela, ledger isento) | **sólida hoje; isenção mais larga que o declarado, info (IN-06)** | O código isenta a TABELA `supabase_migrations.schema_migrations` inteira (`gen-sjt-v2.py:292`), não a linha da semeadora. Medido: o id velho aparece em exatamente 1 linha do ledger (20260611000002). `pg_catalog` não é varrido (`:289`), e há 0 `prosrc`, view, policy, default ou check com o id velho. Locks de leitura (`AccessShare`) só conflitam com `AccessExclusive`. Com o `lock_timeout` de 3 s, uma fila resulta em recusa, nunca em escrita parcial. São 123 tabelas e 18 MB, e o ensaio inteiro leva 2,3 s. Só imprime `tabela=contagem`, nenhum conteúdo de `auth`/`vault`. A tabela particionada (`realtime.messages`) não tem partições, então não há contagem dupla. |
| H | `pontuar_sjt` zera em silêncio um `opcao_id` desconhecido | **real, warning (WR-02)** | `prosrc` vivo: o `JOIN` em `scored` descarta o par sem casar, `v_answered` conta por `pergunta_id` do payload, e a trava `avaliacao ja registrada` impede refazer. O `em_curso=1` de hoje é a candidatura f73682b6 da vaga «[TESTE] Dentista — Funil E2E». Dono: 52-16 (gerador) / 52-18 (apply). |
| I | A prova pós-apply do 52-18 não olha o remapeamento | **real, dentro do WR-01** | `52-18-PLAN.md:22`: a prova depois é 6+1, retirados, `tabela_md5` e vagas, nada sobre o `opcao_id`. Dono: 52-18. |
| J | A chave `opcoes_sjt` pode acusar `PERSISTIU` falso se o RH editar opções entre as capturas | **real, improvável, info (IN-07)** | Nenhuma tela escreve `perguntas_opcao_sjt` (o único `src` que cita a tabela é `reciboExclusao.generated.ts`), e nenhuma função viva a escreve. O mesmo vale para `usuarios_rh`: os escritores são humanos e `data_ultimo_login` não tem escritor. Falha fechada, mas o diagnóstico enganaria. |
| K | Números do 52-16-SUMMARY desatualizados | **confirmado, info (IN-08)** | `52-16-SUMMARY.md:61` («14 testes»; hoje são 20), `:68,109` («52b 9/9»; hoje 12/12), `:107` (md5 do SQL; hoje o gerado tem o bloco remap). Dono: 52-16. |
| L | O item retirado de `sdr-social-seller` mantém os ids artesanais e 3 referências; `ordem` dos itens mantidos | **correto, info (IN-09)** | `get_opcoes_sjt` e `pontuar_sjt` vivos filtram `p.status = 'active'`: o item retirado nunca chega ao candidato, e as 3 respostas gravadas seguem resolvendo (FP_RESPOSTAS igual). O candidato não recebe `ordem` (`get_opcoes_sjt` devolve só `opcao_id, opcao_texto ORDER BY random()`). |

## Warnings

### WR-01: o 52-18 aplica o remapeamento descrevendo-o como «aditivo e reversível», sem prova pós-apply e sem desfazer

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-18-PLAN.md:103` · `:24` · `:22` · `:74` · (gerador) `scripts/geradores/gen-sjt-v2.py:394-462`

**Defeito:** A decisão vinculante (52-14-DECISAO-RODADA-1, P2) diz que o apply do WR-03 «é escrita destrutiva sobre
dado vivo: volta como checkpoint do operador antes de rodar». O commit 1f688f52 pôs o remapeamento DENTRO da 0003,
que o 52-18 aplica. O plano que roda não foi ajustado:
- `:103`, o texto que o operador lê na decisão: «O apply é aditivo e reversível por migration corretiva (status), e
  o texto já foi aprovado no 52-17». O remapeamento reescreve `scores_candidato.metadata.respostas[].opcao_id`. Ele
  alcança itens de 6 cargos FORA do texto aprovado (dentista, asb-tsb, assistente-financeiro, consultor-vendas,
  recepcionista, vaga-generica), que o 52-17 nunca mostrou ao operador.
- `:74` «Desfazer»: voltar o `status` não desfaz o remapeamento. O mapa velho→novo nasce de `gen_random_uuid()`
  dentro da transação e não é gravado em lugar nenhum. A evidência só publica contagens. Desfazer exige reconstruir
  pela semeadora (`pergunta_id`, `ordem`) e passar de novo pelas respostas, e o plano não diz isso.
- `:24`: «um candidato com prova SJT aberta … recebe **erro** em `get_opcoes_sjt`/`pontuar_sjt`». Isso vale para
  item retirado. Para item remapeado não há erro: há nota parcial silenciosa (WR-02).
- `:22`, a prova depois: nada confere o remapeamento (item I).

**Cenário:** o 52-18 chega ao checkpoint da Task 2. O operador lê «aditivo e reversível» e «o texto já foi aprovado»,
responde «aplicar», e autoriza sem saber uma escrita sobre resposta gravada de candidato, em cargos fora do texto.
É o mesmo modo de falha da memória «instrução para campo inexistente vaza»: o checkpoint existe, mas a premissa
apresentada é falsa.

**Evidência:**
```
$ grep -n "aditivo e reversível\|recebe erro" .planning/phases/52-hub-do-rh-dados-e-contato/52-18-PLAN.md
24: … recebe erro em `get_opcoes_sjt`/`pontuar_sjt` para os itens retirados …
103:O apply é aditivo e reversível por migration corretiva (status), …
$ node scripts/p52_ensaio.cjs --migracoes=<scratchpad>/20261011000003_p52_banco_sjt_v2.sql supabase/tests/p52_banco_sjt_smoke.sql
ENSAIO VERDE: … retirados=19;tabela_md5=d3d955d5…;mantidos=3;remap=32/8,refs=3,linhas=1,em_curso=1 … 52b=12/12 · 2286 ms
```

**Fix (dono 52-18; emenda de plano antes do bloco C, sem tocar código):**
- O texto da decisão em `:103` passa a dizer: «aditivo nos itens do texto; DESTRUTIVO no remapeamento (WR-03).
  Reescreve `opcao_id` de N alternativas em M itens de 6 cargos fora do texto, e R respostas gravadas em L linhas de
  `scores_candidato`; `em_curso=E`». Os números vêm da evidência do ensaio da Task 1.
- O Passo 1 da Task 3 registra a linha `remap=…` do apply.
- O `<verify>` pós-apply ganha uma linha (só leitura): `select count(*) from perguntas_opcao_sjt o join perguntas p
  on p.id = o.pergunta_id where p.tipo = 'sjt' and p.status = 'active' and o.opcao_id::text !~ '<RE_V4>'` = 0.
- O «Desfazer» nomeia a reconstrução pela semeadora.
- A linha `:24` distingue «retirado → erro» de «remapeado → nota parcial silenciosa».

### WR-02: remapear com uma prova SJT aberta dá nota parcial silenciosa e definitiva

**File:** `scripts/geradores/gen-sjt-v2.py:305-324` (o `em_curso` só é contado) · `pontuar_sjt` viva (`scored AS (… JOIN public.perguntas_opcao_sjt pos ON pos.pergunta_id = m.pergunta_id AND pos.opcao_id = m.opcao_id)`)

**Defeito:** O SJT MC busca as alternativas uma vez (`get_opcoes_sjt`) e guarda os `opcao_id` na memória da tela.
Depois do remapeamento, um envio com o id velho não falha:
- o `JOIN` de `scored` descarta o par;
- `v_answered` conta por `pergunta_id` do payload, então a bateria «completa» passa;
- a nota sai menor. Abaixo de `mc_min_pct`, o status vira `pendente_humano`;
- `metadata.respostas` grava o breakdown sem o item, e o hub mostra o item como não respondido;
- a trava `avaliacao ja registrada` (status ≠ `falhou`) impede refazer.

O PRE só CONTA (`em_curso`) e segue. Há ainda uma janela de concorrência estreita: um `pontuar_sjt` que lê as
alternativas antes do commit do apply (READ COMMITTED) e insere depois do `UPDATE` do remapeamento grava ids que
somem no commit, e o POS não vê a linha não commitada.

**Cenário:** uma candidata está na tela do SJT de um cargo remapeado (dentista, por exemplo) quando o 52-18 aplica.
Ela envia, recebe «ok», e fica com, por exemplo, 2 de 3 itens pontuados, para sempre, sem que ninguém saiba que um
item foi descartado. A RNF-07a (nada rejeita por nota) segura o efeito no funil, mas o RH lê uma nota errada.

**Evidência:** `prosrc` vivo de `pontuar_sjt` (lido só leitura): `v_answered` sai de `count(DISTINCT r->>'pergunta_id')
FROM jsonb_array_elements(p_respostas)`, e `scored` é um `JOIN` interno. Ensaio: `em_curso=1`. Hoje é a candidatura
f73682b6, da vaga «[TESTE] Dentista — Funil E2E» (sem escrita SJT; `respostas_avaliacao` = 2 linhas). O risco hoje é
de teste. A outra candidatura em `avaliacao_assincrona` sem SJT (3a9254c3, Consultor `fdbe1a4a`) é de
`sdr-social-seller`, que é retirado e não remapeado.

**Fix (dono 52-16, no gerador, com novo ensaio):** escolher uma das duas.
- (a) O PRE recusa com `em_curso > 0`, a menos que uma GUC explícita de reconhecimento esteja na mesma requisição.
  O operador decide no checkpoint, com o número na frente.
- (b) Melhor: a própria 0003 passa a recusar em `pontuar_sjt` o envio cujo par não casa
  (`IF (SELECT count(*) FROM scored) <> v_answered THEN RAISE … 22023`). Erro alto, a tela recarrega e busca os ids
  novos. Isso também fecha a janela de concorrência.

Em qualquer caso, o WR-01 corrige o texto do plano.

### WR-03: a emenda da D-36 só existe no 52-14-DECISAO-RODADA-1 — UI-SPEC, VALIDATION e CONTEXT seguem mandando o Big Five e o Caso «sair direto»

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md:568` («Redação, Caso aberto, Big Five, Prova cognitiva | Saída direta | Sem diálogo — o rascunho já está salvo») · `:720` (backstop E8 «(iv) as 4 telas com rascunho saem sem diálogo») · `52-VALIDATION.md:43` («direto nas 3 com rascunho após `flushNow`») · `52-CONTEXT.md:116,290` («Só Big Five, Redação e Caso aberto saem direto») · `52-02-SUMMARY.md:81` (`ref` para o `describe` «Telas com rascunho — saída direta depois do flush», que não existe mais)

**Defeito:** O código e os testes seguem a decisão nova: Big Five e Caso confirmam. Os documentos que a UAT da 52,
o `gsd-ui-review` e o verificador leem como contrato dizem o contrário. A UI-SPEC já estava duplamente velha: a linha
`:568` inclui a Prova cognitiva, que a D-36 tinha passado para a confirmação.

**Cenário:** na UAT (ou numa auditoria de UI contra a UI-SPEC), o diálogo «Sair da avaliação?» do Big Five aparece
como «desvio do contrato: Big Five deveria sair direto». Uma rodada de conserto «corrige» e reintroduz o CR-01: o
candidato volta a perder 80 itens sem aviso. É a memória «instrução de conserto pode estar uma rodada atrasada»,
agora escrita nos documentos de verificação.

**Evidência:**
```
$ grep -n "sai direto\|saem direto\|com rascunho" 52-UI-SPEC.md 52-VALIDATION.md 52-CONTEXT.md
52-VALIDATION.md:43:| JORN-60 | … direto nas 3 com rascunho após `flushNow` …
52-CONTEXT.md:116:  rascunho automático (redação, caso aberto, Big Five, prova cognitiva) o botão sai direto. …
52-CONTEXT.md:290:  só a lista estava errada. Só Big Five, Redação e Caso aberto saem direto.
$ sed -n 568p 52-UI-SPEC.md
| Redação, Caso aberto, Big Five, Prova cognitiva | Saída direta | Sem diálogo — o rascunho já está salvo (`useAutosaveAvaliacao`) |
```

**Fix (dono 52-14, só `.planning/`; não trava o portão):**
- Anotar a emenda (não reescrever a decisão) na D-36 do `52-CONTEXT.md` e na linha `:116`, apontando para o
  52-14-DECISAO-RODADA-1 P1.
- Mover Big Five e Caso aberto para a linha «Confirmação de perda» da UI-SPEC (`:567`), deixar só a Redação em
  «Saída direta» e corrigir o backstop `:720`.
- Corrigir a linha JORN-60 do VALIDATION.
- Anotar no 52-02-SUMMARY que a `ref` foi substituída pelos dois `describe` novos de `navegacao-provas.test.tsx`.

## Info

### IN-01: Redação — digitar antes da releitura deixa buffer e caixa divergentes; e a releitura tardia arma um timer órfão (anterior à rodada; item B)

**File:** `src/features/avaliacao/components/RedacaoEditorScreen.tsx:183-202` · `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts:131-140`

**Issue:**
- (i) Com texto já digitado, a releitura mantém a caixa (`atual ? atual : salvo`) mas grava `salvo` no buffer
  (`:196`). Sem outra tecla, a saída e o timer gravam o texto velho, e as letras digitadas antes se perdem.
- (ii) O efeito não tem limpeza. Se a releitura responde DEPOIS da desmontagem, o `update` arma um timer de 30 s
  numa instância morta, que nenhum cleanup cancela. Quem reentra, edita e sai em menos de 30 s tem a edição
  sobrescrita pelo texto velho quando o timer órfão dispara.

O comentário novo (`:204-209`) conta com esse timer («segue o seu próprio timer do autosave»). Nenhum dos dois é
regressão: antes, a saída gravava `{}` e depois o órfão regravava.

**Fix:** no efeito, `let vivo = true; … return () => { vivo = false }` e `if (!vivo) return` no `.then`; com `atual`
não vazio, não chamar `update` com `salvo`. Dono: 52-02.

### IN-02: uma linha de rascunho por `teste` (item C)

**File:** `src/features/avaliacao/components/RedacaoEditorScreen.tsx:146,160,405` · `respostas_avaliacao` (`candidatura_id`, `teste`)

**Issue:** O `idx` sempre começa em 0. Editar a pergunta 0, já enviada, troca o `pergunta_id` do buffer e apaga o
rascunho da pergunta 1. Sair sem editar já não apaga (WR-01 do -1 fechado). É desenho de dado anterior à fase. Dono:
backlog.

### IN-03: o diálogo diz «não serão salvas», mas o flush de desmontagem grava; no Caso prático o RH lê essa tabela (item D)

**File:** `src/features/avaliacao/components/SairDaProvaButton.tsx:48` · `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts:88-103,132-140` · `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx:154-163,276` · `supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql:277`

**Issue:** Com o timer de 30 s armado, «Sair» persiste o que o diálogo diz que não será salvo. No Big Five ninguém lê.
No Caso prático, o RH lê `respostas_avaliacao` depois do envio (`ler_resposta_caso_aberto_sjt`). O `flush` não lança
erro, então o `handleSubmit` segue para a EF mesmo com o `flushNow` falhando. O RH pode ver o texto de uma sessão
abandonada ao lado da nota do texto enviado. O `onBlur` sem condição do Caso (`:276`) também grava `{}` numa sessão
sem digitação; hoje é inócuo, porque o envio regrava. A parte do envio é anterior à rodada.

**Fix:** o hook expõe `descartar()` (limpa timer e buffer) para o «Sair» confirmado; no `handleSubmit` do Caso,
conferir `status !== 'error'` depois do `flushNow`, ou mandar à EF o mesmo texto que vai à tabela. Dono: 52-02.

### IN-04: `candidaturas` fora do `capturar()` (item A)

**File:** `scripts/p52_ensaio.cjs:317-318` · `supabase/tests/p52_leituras_rh_smoke.sql:655,665,1288,1299`

**Issue:** Aceito. As escritas do smoke ficam em savepoint que levanta `reverter`, e por isso voltam antes do aborto
da requisição. Mas elas tocam candidaturas REAIS. Uma impressão digital estreita (`id, is_rascunho, deleted_at` só
das candidaturas que os GUCs `smoke52l.*` escolhem, recalculadas fora) poria a rede de volta sem o falso positivo do
tráfego. Dono: 52-01.

### IN-05: IN-06 do -1 segue aberto (item F)

**File:** `scripts/p52_mutacoes.cjs:142-217` (L1..L8)

**Issue:** O POS da 0002 (literais / outros / colunas) nunca foi visto morder. O risco é baixo (`UPDATE` por `user_id`
com `ROW_COUNT = 1`). Dono: 52-08, ou disposição no 52-14-SUMMARY.

### IN-06: a varredura do PRE isenta a tabela do ledger inteira e não olha `pg_catalog` (item G)

**File:** `scripts/geradores/gen-sjt-v2.py:286-301` · `supabase/tests/p52_banco_sjt_smoke.sql` (k)

**Issue:** O header e o commit dizem «o ledger, que guarda o texto da migration semeadora»; o código isenta a
`supabase_migrations.schema_migrations` toda. Hoje é equivalente: 1 linha, a 20260611000002. Corpos de função,
views, policies, defaults e checks não são varridos; hoje há 0 com o id velho. Ambos medidos. Sólido hoje. Para não
envelhecer, isentar por `version = '20260611000002'` (forma: `WHERE x.version <> …` no `EXECUTE` do ledger) e somar
`pg_proc.prosrc`/`pg_get_viewdef` à varredura. Dono: 52-16.

### IN-07: as chaves novas do `capturar()` podem dar `PERSISTIU` falso por edição humana concorrente (item J)

**File:** `scripts/p52_ensaio.cjs:327-331,357-358`

**Issue:** `atualizar_meu_perfil_rh`/`gerir_usuario_rh_mutacao` (vivos) e um PATCH direto em `perguntas_opcao_sjt`
pela policy do RH mudariam as impressões digitais durante o ensaio de ~1–2 s. A falha é fechada, mas a mensagem
(«usuarios_rh: … -> …») se lê como «a escrita escapou do aborto». Sugestão: no `PERSISTIU` dessas duas chaves,
imprimir também `max(updated_at)` para separar tráfego de vazamento. Dono: 52-01.

### IN-08: 52-16-SUMMARY com números velhos (item K)

**File:** `.planning/phases/52-hub-do-rh-dados-e-contato/52-16-SUMMARY.md:61,68,107,109`

**Issue:** «14 testes» (hoje 20), «smoke52b 9/9» (hoje 12/12), md5 do SQL gerado anterior ao bloco remap. O 52-18
cita esse SUMMARY. Dono: 52-16.

### IN-09: item retirado com ids artesanais e o lado do RH (item L) e escopo do review do bloco C

**File:** `scripts/geradores/gen-sjt-v2.py:256-268` · `.planning/phases/52-hub-do-rh-dados-e-contato/52-18-PLAN.md` (Task 2, escopo `refs/gsd/52-15/sha..HEAD`)

**Issue:**
- (i) Correto: o item retirado de `sdr-social-seller` nunca é servido, porque `get_opcoes_sjt` e `pontuar_sjt`
  filtram `status = 'active'`.
- (ii) Lacuna de escopo. O gerador do remapeamento, o `test_gen_sjt_v2.py` e o smoke (j)–(l) foram commitados ANTES
  do pin do 52-15. O `52-REVIEW-BANCO` revisa `refs/gsd/52-15/sha..HEAD` e só os verá se forem tocados de novo; o
  SQL gerado entra, o smoke não. Este review os leu em profundidade, e o (j) foi visto morder. Para o bloco C não
  depender disso, a instrução do 52-18 ao revisor deve incluir `scripts/geradores/` e
  `supabase/tests/p52_banco_sjt_smoke.sql` inteiros.

Dono: 52-18.

---

## Saída do portão (modo revisão)

Registrada depois do commit deste arquivo, na resposta ao orquestrador. O comando:

```
node scripts/p52_portao.cjs --revisao .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-PORTAO --base refs/gsd/52/base --plano .planning/phases/52-hub-do-rh-dados-e-contato/52-15-PLAN.md --modo revisao
```

---

_Reviewed: 2026-10-11T16:58:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
