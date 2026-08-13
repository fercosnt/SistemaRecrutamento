---
schema_version: 1
open_count: 32
waived_count: 0
fixed_count: 1
total_count: 33
last_updated: 2026-08-12T01:30:33.120Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 42 | stub | supabase/functions/notificar-rh/helpers.ts |  | Link do e-mail ao RH aponta para /rh/revisoes, rota que so existe a partir do plano 42-09 (pagina) / 42-10 (sidebar) — se o trigger for aplicado antes, um pedido de revisao real produz e-mail com link 404 | open |  | 2026-07-30T05:14:14.765Z |  |
| 2 | 42 | unrun-verify | supabase/migrations/20260730000003_p42_trg_revisao_solicitada.sql |  | 42-07: apply da migration, deploy da EF notificar-rh, diff de pg_get_functiondef contra a transcricao, smoke do round-trip e assercao negativa da varredura — nenhum executado (MCP Supabase indisponivel ao subagente); checkpoint do orquestrador | open |  | 2026-07-30T05:14:14.820Z |  |
| 3 | 43 | unrun-verify | supabase/tests/p43_matriz_retencao_smoke.sql |  | smoke de 10 asserções da matriz de retenção escrito mas NÃO executado — sem MCP Supabase no executor; apply + run são o checkpoint 43-07 | open |  | 2026-08-01T22:23:04.988Z |  |
| 4 | 43 | unrun-verify | supabase/tests/p43_previa_smoke.sql |  | Smoke da previa de retencao NAO executado — deliberadamente RED contra o banco atual; vai verde no checkpoint 43-07 com 9/9 PASS | open |  | 2026-08-02T16:54:32.146Z |  |
| 5 | 45 | deviation | docs/compliance/sql/gen-recibo-exclusao.cjs |  | 45-02: o <verify> do plano varria o JSON inteiro procurando 'tombstone', string que o proprio <action> manda existir em PASSOS_MOTOR; varredura de banidos escopada ao texto de titular (meta.campos_de_texto_de_titular) | open |  | 2026-08-05T04:13:18.606Z |  |
| 6 | 45 | deviation | .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-02-SUMMARY.md |  | 45-02: 6 das 9 bases legais do recibo foram escritas pela engenharia, nao ditadas pela UI-SPEC — revisao pelo Encarregado de Dados pendente antes do e-mail de recibo sair em PROD | open |  | 2026-08-05T04:13:18.664Z |  |
| 7 | 45 | unrun-verify | supabase/tests/p45_bias_k5_smoke.sql |  | p45_bias_k5_smoke.sql e o DO de auto-verificacao da 20260805000003 nunca foram executados contra banco nenhum — o apply e 45-11 | open |  | 2026-08-05T07:10:20.368Z |  |
| 8 | 45 | deviation | src/features/admin/bias-audit/biasMath.ts |  | A tela de auditoria de vies ainda le o payload v1; o snapshot passa a emitir celulas suprimidas sem applicants/selected e sem n_total | open |  | 2026-08-05T07:10:20.426Z |  |
| 9 | 45 | unrun-verify | supabase/tests/p45_motor_exclusao_smoke.sql |  | Smoke do motor de exclusao NAO executado — deliberadamente RED (as 5 funcoes nascem em 45-03/45-05/45-07); os pins md5(prosrc) seguem com marcador PENDENTE-45-07 e C3 reprova enquanto assim for. Fecha no 45-11 com 21/21 PASS | open |  | 2026-08-05T07:14:13.436Z |  |
| 10 | 45 | deviation | supabase/migrations/20260805000006_p45_anonimizar_candidato.sql |  | Obrigacoes que o smoke 45-04 impoe ao 45-07: (M1) trg_decisao_final_snapshot e AFTER UPDATE sem WHEN e reinsere OLD.justificativa — o scrub de decisao_final_historico tem de ser o ULTIMO statement do par; (M2) candidate_ai_decisions.candidato_id E vaga_id sao NOT NULL com ON DELETE SET NULL (clausulas inexequiveis) — decidir entre afrouxar as duas colunas e desidentificar o conteudo | open |  | 2026-08-05T07:14:13.496Z |  |
| 11 | 45 | unrun-verify | supabase/migrations/20260805000001_p45_pedido_exclusao.sql |  | As duas migrations do 45-03 foram escritas mas NAO aplicadas — o DO block de auto-verificacao so executa no apply (45-06) | open |  | 2026-08-05T07:23:32.301Z |  |
| 12 | 45 | stub | src/features/privacidade/components/ExcluirDadosBloco.tsx |  | Estado B sem botao Cancelar a exclusao — por desenho, entra no 45-08 | open |  | 2026-08-05T07:23:32.364Z |  |
| 13 | 45 | deviation | src/__tests__/copyPortoesLgpd.test.ts |  | O portao do CONSOL-04 ficou VERDE por falso positivo: a sonda casa substring em comentario. Promessa continua orfa; exige decisao do operador | open |  | 2026-08-05T07:23:32.425Z |  |
| 14 | 45 | deviation | supabase/functions/executar-direito-titular/index.ts | 377 | DI-45-07-01: a EF chama as RPCs com service_role sem repassar o Authorization do titular; auth.uid() e NULL e o guard das RPCs ja aplicadas em PROD recusa com 42501 — nenhum pedido de exclusao seria registrado. Fecha no 45-10. | open |  | 2026-08-05T23:11:21.892Z |  |
| 15 | 45 | unrun-verify | supabase/migrations/20260805000006_p45_anonimizar_candidato.sql |  | Os DO blocks de auto-verificacao das 3 migrations do 45-07 so EXECUTAM no apply, que e do 45-11 atras do portao destrutivo. Ate la a verificacao e estatica (forma), nao por execucao. | open |  | 2026-08-05T23:11:21.947Z |  |
| 16 | 45 | deviation | src/features/privacidade/components/ConfirmarExclusaoDialog.tsx |  | 45-08: portao RED do TDD verificado por execucao, nao por commit isolado — o gate tsc (baseline 97) reprova um teste que importa modulo ainda inexistente, e --no-verify e proibido | open |  | 2026-08-05T23:44:28.940Z |  |
| 17 | 45 | stub | src/features/vagas/hooks/useRetirarCandidatura.ts |  | O hook invoca a EF executar-direito-titular com acao 'retirar_candidatura', mas o vocabulario FECHADO dela e ACOES={pedir,cancelar} (index.ts:137). O caminho do candidato NAO funciona ate o 45-10 acrescentar a acao e repassar as claims do titular (DI-45-07-01). | open |  | 2026-08-06T05:00:05.428Z |  |
| 18 | 45 | todo | src/features/triagem/services/triagemService.ts |  | Ponte de tipos (Pitfall 10) porque v_triagem_panel em database.types.ts ainda nao expoe encerrada_a_pedido_em. REMOVER apos o apply da migration 20260805000008 pelo 45-11 e npm run db:types. | open |  | 2026-08-06T05:00:05.483Z |  |
| 19 | 45 | unrun-verify | supabase/migrations/20260805000007_p45_retirada_e_evento.sql |  | As duas migrations do plano foram AUTORADAS e nao aplicadas (por desenho: quem aplica e o 45-11). Os blocos DO de auto-verificacao, o gate de md5 do BLOCO G e o caminho ponta a ponta so sao exercitados no apply. | open |  | 2026-08-06T05:00:05.540Z |  |
| 20 | 45 | deviation | supabase/functions/executar-direito-titular/index.ts |  | DI-45-10-01: as 4 chamadas de RPC usam supabaseAdmin sem repassar o Authorization do titular; auth.uid() e NULL e as RPCs recusam com 42501 — o motor nao roda ponta a ponta | open |  | 2026-08-06T15:22:17.025Z |  |
| 21 | 45 | deviation | supabase/functions/executar-direito-titular/index.ts |  | DI-45-10-02: ACOES nao conhece 'retirar_candidatura' e o hook do 45-09 invoca a EF com essa acao — 400 VALIDATION traduzido para SERVER_ERROR na tela | open |  | 2026-08-06T15:22:17.081Z |  |
| 22 | 45 | deviation | supabase/tests/p45_motor_exclusao_smoke.sql |  | C1 exige que gerar_bias_snapshot nao conceda EXECUTE a authenticated, mas 20260805000003 o concede deliberadamente (chamador vivo: biasAuditService.ts:98) — DI-45-12-01, decisao do code review bloqueante do 45-11 | open |  | 2026-08-06T17:15:24.030Z |  |
| 23 | 45 | deviation | src/features/vagas/components/RetirarCandidaturaAcao.tsx |  | copy generica para a recusa NAO_RETIRAVEL: o hook traduz, o componente nao ramifica — DI-45-12-02 | open |  | 2026-08-06T17:15:24.086Z |  |
| 24 | 47 | unrun-verify | supabase/tests/p47_historico_smoke.sql |  | smoke do CONSOL-02 escrito e NAO executado: exige o apply da migration 20260809000001, que e checkpoint do orquestrador | fixed | FECHADO por EXECUCAO em 2026-08-13: o operador rodou p47_historico_smoke.sql em PROD e ele passou. O sinal de sucesso e sutil e vale registrar — a ultima instrucao do arquivo e SELECT set_config('request.jwt.claims','',false), entao receber uma coluna set_config vazia (em vez de erro) significa que nenhum RAISE anterior abortou o batch, inclusive o gate (z) que exige contador = 6. Os NOTICE nao aparecem no editor do Supabase, entao o RESUMO nao e visivel. A migration 20260809000001 ja estava aplicada e conferida byte a byte (47-EVIDENCIA-APPLY-CONSOL-02.md). | 2026-08-09T21:55:43.981Z | 2026-08-13T00:00:00.000Z |
| 25 | 47 | unmet-truth | src/features/transparencia/constants/subprocessadores.ts |  | As seis entradas carregam a sentinela PAIS_POR_MEDIR: a regiao onde o dado deste projeto e tratado nao e medivel deste ambiente. A pagina /subprocessadores LANCA ao renderizar e nao pode ser publicada ate o operador informar os seis paises medidos (47-04 Task 3, checkpoint bloqueante). | fixed | FECHADO por MEDICAO em 2026-08-11: o operador mediu os seis paises nos paineis e documentos dos fornecedores (47-04 Task 3). Cinco tratam os dados nos Estados Unidos, o ViaCEP declara jurisdicao brasileira com a ressalva de hospedagem nao divulgada no campo visivel. Sentinela e validador preservados como rede da proxima entrada. Commit eeed0e5. | 2026-08-09T22:12:40.305Z | 2026-08-11T00:39:00.000Z |
| 26 | 47 | unmet-truth | src/features/transparencia/constants/matrizRetencao.generated.ts |  | As oito citações de base legal publicadas em /privacidade seguem pendentes da revisão do Encarregado — gate de PUBLICAÇÃO herdado de 47-01 (D5) | fixed | FECHADO por DECISAO DO OPERADOR em 2026-08-13: a Beauty Smile NAO designa Encarregado (.planning/DECISAO-ENCARREGADO.md). Os quatro itens do portao de publicacao passam a ser decisao do operador, e a aprovacao de 2026-08-11 vira final. Consequencia obrigatoria ja aplicada em f8e76e2: as 9 strings que diziam «nosso Encarregado de Dados» — inclusive a pagina PUBLICA — eram afirmacao falsa a partir da decisao, e viraram «nosso canal de privacidade». O canal em si NAO saiu: designar Encarregado e dispensavel para agente de pequeno porte, oferecer canal ao titular nao e. | 2026-08-09T23:11:20.359Z | 2026-08-13T00:00:00.000Z |
| 27 | 47 | todo | src/features/hub-candidato/services/historicoCandidaturaService.ts |  | as never pre-regen na chamada de listar_historico_candidatura — remover apos npm run db:types | open |  | 2026-08-10T12:55:37.934Z |  |
| 28 | 47 | unrun-verify | .planning/phases/47-transpar-ncia-consolida-o/47-08-PLAN.md |  | 47-08 Task 3 (montagem do RodapePublico nas cinco superficies) nao executada: bloqueada pelo portao de PUBLICACAO do Encarregado, que segue aberto | fixed | FECHADO — o registro estava STALE. Conferido por grep em 2026-08-12: RodapePublico ESTA montado nas cinco superficies (LandingPage.tsx:103, VagasPublicasPage.tsx:535, VagaDetalhePage.tsx:493, SubprocessadoresPage.tsx:96, PrivacidadePublicaPage.tsx:175). A Task 3 do 47-08 FOI executada; o portao de publicacao que a bloqueava fechou em 2026-08-13 por decisao do operador (.planning/DECISAO-ENCARREGADO.md). As duas paginas publicas sao alcancaveis da navegacao de producao. | 2026-08-11T03:53:04.434Z | 2026-08-13T00:00:00.000Z |
| 29 | 47 | deviation | src/__tests__/destinosDeRedeComFicha.test.ts |  | api.ipify.org e www.youtube.com: destinos vivos fora da lista publicada de empresas contratadas, registrados como pendente-de-decisao com fato medido e rota — a classificacao e ato do Encarregado, no portao de publicacao aberto do 47-08 | fixed | FECHADO por ELIMINACAO em 2026-08-13 (03909dd). Sem Encarregado, a classificacao era do operador — e a decisao foi eliminar as duas transferencias em vez de declara-las. api.ipify.org SUMIU do codigo (o IP passa a vir do servidor pelo trigger da migration 20260813000001, NAO APLICADA); www.youtube.com virou www.youtube-nocookie.com sob clique explicito, registrado como nao-trata-dado-de-candidato pelo mesmo criterio do endereco de compartilhamento. A trava do proprio teste («pendencia cujo destino SUMIU reprova») foi o que forcou a edicao. | 2026-08-11T04:17:17.358Z | 2026-08-13T00:00:00.000Z |
| 30 | 47 | unmet-truth | src/features/transparencia/components/PrivacidadePublicaPage.tsx |  | Revisao formal do Encarregado NAO exercida: as duas paginas publicas foram liberadas por decisao do operador em 2026-08-11 | fixed | FECHADO por DECISAO DO OPERADOR em 2026-08-13 (.planning/DECISAO-ENCARREGADO.md). A revisao formal do Encarregado NAO vai acontecer porque nao havera Encarregado; a liberacao do operador em 2026-08-11 deixa de ser provisoria e passa a ser a decisao final, com decisor nomeado e data. O 47-08-SUMMARY.md estava certo em nao conflar as duas coisas — agora elas sao a mesma por decisao explicita, nao por omissao. | 2026-08-11T04:28:51.767Z | 2026-08-13T00:00:00.000Z |
| 31 | 47 | unmet-truth | src/services/logAccessService.ts | 110 | api.ipify.org pendente-de-decisao: destino de rede sem ficha publicada nem classificacao do Encarregado, com a lista ja publicada | fixed | FECHADO por ELIMINACAO em 2026-08-13 (03909dd). api.ipify.org nao existe mais no repositorio: o navegador pedia a um terceiro o proprio IP para o sistema grava-lo, sendo que o servidor ja o ve. De quebra morreram dois defeitos com a MESMA raiz — o fallback que gravava 127.0.0.1 (IP falso em log de auditoria) e o NOT NULL de logs_acesso.ip_address, que o pii-inventory.yaml:190 ja registrava como bloqueio do ERASE-09. | 2026-08-11T04:28:51.827Z | 2026-08-13T00:00:00.000Z |
| 32 | 47 | unmet-truth | src/components/pages/InstrucoesFormularioPage.tsx | 77 | www.youtube.com pendente-de-decisao: iframe de terceiro sem ficha publicada nem classificacao do Encarregado, com a lista ja publicada | fixed | FECHADO por ELIMINACAO em 2026-08-13 (03909dd). O iframe carregava no RENDER — abrir a pagina ja entregava IP, referer e cookies ao terceiro, sem clique e sem escolha. Virou facade sob clique explicito para www.youtube-nocookie.com, com o aviso ao lado do botao. Duas armadilhas evitadas de proposito: a miniatura de i.ytimg.com (mesma transferencia, outro host do mesmo grupo) e a ideia de que -nocookie basta (ele adia os COOKIES, nao a CONEXAO). Registrado como nao-trata-dado-de-candidato pelo criterio do endereco de compartilhamento. | 2026-08-11T04:28:51.886Z | 2026-08-13T00:00:00.000Z |
| 33 | 45 | deviation | supabase/functions/executar-direito-titular/index.ts |  | NW-03 alargou: causa='falha_storage' cobre 10 classes nomeadas mais carimbo e excecao (DI-45-16-01) | open |  | 2026-08-12T01:30:33.120Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "42",
    "file": "supabase/functions/notificar-rh/helpers.ts",
    "line": null,
    "description": "Link do e-mail ao RH aponta para /rh/revisoes, rota que so existe a partir do plano 42-09 (pagina) / 42-10 (sidebar) — se o trigger for aplicado antes, um pedido de revisao real produz e-mail com link 404",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-30T05:14:14.765Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "42",
    "file": "supabase/migrations/20260730000003_p42_trg_revisao_solicitada.sql",
    "line": null,
    "description": "42-07: apply da migration, deploy da EF notificar-rh, diff de pg_get_functiondef contra a transcricao, smoke do round-trip e assercao negativa da varredura — nenhum executado (MCP Supabase indisponivel ao subagente); checkpoint do orquestrador",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-30T05:14:14.820Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "43",
    "file": "supabase/tests/p43_matriz_retencao_smoke.sql",
    "line": null,
    "description": "smoke de 10 asserções da matriz de retenção escrito mas NÃO executado — sem MCP Supabase no executor; apply + run são o checkpoint 43-07",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-01T22:23:04.988Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "43",
    "file": "supabase/tests/p43_previa_smoke.sql",
    "line": null,
    "description": "Smoke da previa de retencao NAO executado — deliberadamente RED contra o banco atual; vai verde no checkpoint 43-07 com 9/9 PASS",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-02T16:54:32.146Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "deviation",
    "phase": "45",
    "file": "docs/compliance/sql/gen-recibo-exclusao.cjs",
    "line": null,
    "description": "45-02: o <verify> do plano varria o JSON inteiro procurando 'tombstone', string que o proprio <action> manda existir em PASSOS_MOTOR; varredura de banidos escopada ao texto de titular (meta.campos_de_texto_de_titular)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T04:13:18.606Z",
    "resolved_at": null
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "45",
    "file": ".planning/phases/45-motor-de-exclus-o-anonimiza-o/45-02-SUMMARY.md",
    "line": null,
    "description": "45-02: 6 das 9 bases legais do recibo foram escritas pela engenharia, nao ditadas pela UI-SPEC — revisao pelo Encarregado de Dados pendente antes do e-mail de recibo sair em PROD",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T04:13:18.664Z",
    "resolved_at": null
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/tests/p45_bias_k5_smoke.sql",
    "line": null,
    "description": "p45_bias_k5_smoke.sql e o DO de auto-verificacao da 20260805000003 nunca foram executados contra banco nenhum — o apply e 45-11",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:10:20.368Z",
    "resolved_at": null
  },
  {
    "id": 8,
    "kind": "deviation",
    "phase": "45",
    "file": "src/features/admin/bias-audit/biasMath.ts",
    "line": null,
    "description": "A tela de auditoria de vies ainda le o payload v1; o snapshot passa a emitir celulas suprimidas sem applicants/selected e sem n_total",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:10:20.426Z",
    "resolved_at": null
  },
  {
    "id": 9,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/tests/p45_motor_exclusao_smoke.sql",
    "line": null,
    "description": "Smoke do motor de exclusao NAO executado — deliberadamente RED (as 5 funcoes nascem em 45-03/45-05/45-07); os pins md5(prosrc) seguem com marcador PENDENTE-45-07 e C3 reprova enquanto assim for. Fecha no 45-11 com 21/21 PASS",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:14:13.436Z",
    "resolved_at": null
  },
  {
    "id": 10,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/migrations/20260805000006_p45_anonimizar_candidato.sql",
    "line": null,
    "description": "Obrigacoes que o smoke 45-04 impoe ao 45-07: (M1) trg_decisao_final_snapshot e AFTER UPDATE sem WHEN e reinsere OLD.justificativa — o scrub de decisao_final_historico tem de ser o ULTIMO statement do par; (M2) candidate_ai_decisions.candidato_id E vaga_id sao NOT NULL com ON DELETE SET NULL (clausulas inexequiveis) — decidir entre afrouxar as duas colunas e desidentificar o conteudo",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:14:13.496Z",
    "resolved_at": null
  },
  {
    "id": 11,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/migrations/20260805000001_p45_pedido_exclusao.sql",
    "line": null,
    "description": "As duas migrations do 45-03 foram escritas mas NAO aplicadas — o DO block de auto-verificacao so executa no apply (45-06)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:23:32.301Z",
    "resolved_at": null
  },
  {
    "id": 12,
    "kind": "stub",
    "phase": "45",
    "file": "src/features/privacidade/components/ExcluirDadosBloco.tsx",
    "line": null,
    "description": "Estado B sem botao Cancelar a exclusao — por desenho, entra no 45-08",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:23:32.364Z",
    "resolved_at": null
  },
  {
    "id": 13,
    "kind": "deviation",
    "phase": "45",
    "file": "src/__tests__/copyPortoesLgpd.test.ts",
    "line": null,
    "description": "O portao do CONSOL-04 ficou VERDE por falso positivo: a sonda casa substring em comentario. Promessa continua orfa; exige decisao do operador",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T07:23:32.425Z",
    "resolved_at": null
  },
  {
    "id": 14,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/functions/executar-direito-titular/index.ts",
    "line": 377,
    "description": "DI-45-07-01: a EF chama as RPCs com service_role sem repassar o Authorization do titular; auth.uid() e NULL e o guard das RPCs ja aplicadas em PROD recusa com 42501 — nenhum pedido de exclusao seria registrado. Fecha no 45-10.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T23:11:21.892Z",
    "resolved_at": null
  },
  {
    "id": 15,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/migrations/20260805000006_p45_anonimizar_candidato.sql",
    "line": null,
    "description": "Os DO blocks de auto-verificacao das 3 migrations do 45-07 so EXECUTAM no apply, que e do 45-11 atras do portao destrutivo. Ate la a verificacao e estatica (forma), nao por execucao.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T23:11:21.947Z",
    "resolved_at": null
  },
  {
    "id": 16,
    "kind": "deviation",
    "phase": "45",
    "file": "src/features/privacidade/components/ConfirmarExclusaoDialog.tsx",
    "line": null,
    "description": "45-08: portao RED do TDD verificado por execucao, nao por commit isolado — o gate tsc (baseline 97) reprova um teste que importa modulo ainda inexistente, e --no-verify e proibido",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T23:44:28.940Z",
    "resolved_at": null
  },
  {
    "id": 17,
    "kind": "stub",
    "phase": "45",
    "file": "src/features/vagas/hooks/useRetirarCandidatura.ts",
    "line": null,
    "description": "O hook invoca a EF executar-direito-titular com acao 'retirar_candidatura', mas o vocabulario FECHADO dela e ACOES={pedir,cancelar} (index.ts:137). O caminho do candidato NAO funciona ate o 45-10 acrescentar a acao e repassar as claims do titular (DI-45-07-01).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-06T05:00:05.428Z",
    "resolved_at": null
  },
  {
    "id": 18,
    "kind": "todo",
    "phase": "45",
    "file": "src/features/triagem/services/triagemService.ts",
    "line": null,
    "description": "Ponte de tipos (Pitfall 10) porque v_triagem_panel em database.types.ts ainda nao expoe encerrada_a_pedido_em. REMOVER apos o apply da migration 20260805000008 pelo 45-11 e npm run db:types.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-06T05:00:05.483Z",
    "resolved_at": null
  },
  {
    "id": 19,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/migrations/20260805000007_p45_retirada_e_evento.sql",
    "line": null,
    "description": "As duas migrations do plano foram AUTORADAS e nao aplicadas (por desenho: quem aplica e o 45-11). Os blocos DO de auto-verificacao, o gate de md5 do BLOCO G e o caminho ponta a ponta so sao exercitados no apply.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-06T05:00:05.540Z",
    "resolved_at": null
  },
  {
    "id": 20,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/functions/executar-direito-titular/index.ts",
    "line": null,
    "description": "DI-45-10-01: as 4 chamadas de RPC usam supabaseAdmin sem repassar o Authorization do titular; auth.uid() e NULL e as RPCs recusam com 42501 — o motor nao roda ponta a ponta",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-06T15:22:17.025Z",
    "resolved_at": null
  },
  {
    "id": 21,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/functions/executar-direito-titular/index.ts",
    "line": null,
    "description": "DI-45-10-02: ACOES nao conhece 'retirar_candidatura' e o hook do 45-09 invoca a EF com essa acao — 400 VALIDATION traduzido para SERVER_ERROR na tela",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-06T15:22:17.081Z",
    "resolved_at": null
  },
  {
    "id": 22,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/tests/p45_motor_exclusao_smoke.sql",
    "line": null,
    "description": "C1 exige que gerar_bias_snapshot nao conceda EXECUTE a authenticated, mas 20260805000003 o concede deliberadamente (chamador vivo: biasAuditService.ts:98) — DI-45-12-01, decisao do code review bloqueante do 45-11",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-06T17:15:24.030Z",
    "resolved_at": null
  },
  {
    "id": 23,
    "kind": "deviation",
    "phase": "45",
    "file": "src/features/vagas/components/RetirarCandidaturaAcao.tsx",
    "line": null,
    "description": "copy generica para a recusa NAO_RETIRAVEL: o hook traduz, o componente nao ramifica — DI-45-12-02",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-06T17:15:24.086Z",
    "resolved_at": null
  },
  {
    "id": 24,
    "kind": "unrun-verify",
    "phase": "47",
    "file": "supabase/tests/p47_historico_smoke.sql",
    "line": null,
    "description": "smoke do CONSOL-02 escrito e NAO executado: exige o apply da migration 20260809000001, que e checkpoint do orquestrador",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-09T21:55:43.981Z",
    "resolved_at": null
  },
  {
    "id": 25,
    "kind": "unmet-truth",
    "phase": "47",
    "file": "src/features/transparencia/constants/subprocessadores.ts",
    "line": null,
    "description": "As seis entradas carregam a sentinela PAIS_POR_MEDIR: a regiao onde o dado deste projeto e tratado nao e medivel deste ambiente. A pagina /subprocessadores LANCA ao renderizar e nao pode ser publicada ate o operador informar os seis paises medidos (47-04 Task 3, checkpoint bloqueante).",
    "status": "fixed",
    "reason": "FECHADO por MEDICAO em 2026-08-11: o operador mediu os seis paises nos paineis e documentos dos fornecedores (47-04 Task 3). Cinco tratam os dados nos Estados Unidos, o ViaCEP declara jurisdicao brasileira com a ressalva de hospedagem nao divulgada no campo visivel. Sentinela e validador preservados como rede da proxima entrada. Commit eeed0e5.",
    "recorded_at": "2026-08-09T22:12:40.305Z",
    "resolved_at": "2026-08-11T00:39:00.000Z"
  },
  {
    "id": 26,
    "kind": "unmet-truth",
    "phase": "47",
    "file": "src/features/transparencia/constants/matrizRetencao.generated.ts",
    "line": null,
    "description": "As oito citações de base legal publicadas em /privacidade seguem pendentes da revisão do Encarregado — gate de PUBLICAÇÃO herdado de 47-01 (D5)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-09T23:11:20.359Z",
    "resolved_at": null
  },
  {
    "id": 27,
    "kind": "todo",
    "phase": "47",
    "file": "src/features/hub-candidato/services/historicoCandidaturaService.ts",
    "line": null,
    "description": "as never pre-regen na chamada de listar_historico_candidatura — remover apos npm run db:types",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-10T12:55:37.934Z",
    "resolved_at": null
  },
  {
    "id": 28,
    "kind": "unrun-verify",
    "phase": "47",
    "file": ".planning/phases/47-transpar-ncia-consolida-o/47-08-PLAN.md",
    "line": null,
    "description": "47-08 Task 3 (montagem do RodapePublico nas cinco superficies) nao executada: bloqueada pelo portao de PUBLICACAO do Encarregado, que segue aberto",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T03:53:04.434Z",
    "resolved_at": null
  },
  {
    "id": 29,
    "kind": "deviation",
    "phase": "47",
    "file": "src/__tests__/destinosDeRedeComFicha.test.ts",
    "line": null,
    "description": "api.ipify.org e www.youtube.com: destinos vivos fora da lista publicada de empresas contratadas, registrados como pendente-de-decisao com fato medido e rota — a classificacao e ato do Encarregado, no portao de publicacao aberto do 47-08",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T04:17:17.358Z",
    "resolved_at": null
  },
  {
    "id": 30,
    "kind": "unmet-truth",
    "phase": "47",
    "file": "src/features/transparencia/components/PrivacidadePublicaPage.tsx",
    "line": null,
    "description": "Revisao formal do Encarregado NAO exercida: as duas paginas publicas foram liberadas por decisao do operador em 2026-08-11",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T04:28:51.767Z",
    "resolved_at": null
  },
  {
    "id": 31,
    "kind": "unmet-truth",
    "phase": "47",
    "file": "src/services/logAccessService.ts",
    "line": 110,
    "description": "api.ipify.org pendente-de-decisao: destino de rede sem ficha publicada nem classificacao do Encarregado, com a lista ja publicada",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T04:28:51.827Z",
    "resolved_at": null
  },
  {
    "id": 32,
    "kind": "unmet-truth",
    "phase": "47",
    "file": "src/components/pages/InstrucoesFormularioPage.tsx",
    "line": 77,
    "description": "www.youtube.com pendente-de-decisao: iframe de terceiro sem ficha publicada nem classificacao do Encarregado, com a lista ja publicada",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T04:28:51.886Z",
    "resolved_at": null
  },
  {
    "id": 33,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/functions/executar-direito-titular/index.ts",
    "line": null,
    "description": "NW-03 alargou: causa='falha_storage' cobre 10 classes nomeadas mais carimbo e excecao (DI-45-16-01)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-12T01:30:33.120Z",
    "resolved_at": null
  }
]
````
