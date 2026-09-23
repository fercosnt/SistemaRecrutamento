---
schema_version: 1
open_count: 30
waived_count: 8
fixed_count: 39
total_count: 77
last_updated: 2026-09-23T15:42:18.821Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 42 | stub | supabase/functions/notificar-rh/helpers.ts |  | Link do e-mail ao RH aponta para /rh/revisoes, rota que so existe a partir do plano 42-09 (pagina) / 42-10 (sidebar) — se o trigger for aplicado antes, um pedido de revisao real produz e-mail com link 404 | fixed | Rota /rh/revisoes existe (routes.tsx:497) e foi percorrida AO VIVO em 2026-09-06 (§7.28): a fila carrega e responde. O link do e-mail ao RH resolve. | 2026-07-30T05:14:14.765Z | 2026-09-06T21:10:00.000Z |
| 2 | 42 | unrun-verify | supabase/migrations/20260730000003_p42_trg_revisao_solicitada.sql |  | 42-07: apply da migration, deploy da EF notificar-rh, diff de pg_get_functiondef contra a transcricao, smoke do round-trip e assercao negativa da varredura — nenhum executado (MCP Supabase indisponivel ao subagente); checkpoint do orquestrador | fixed | Migration 20260730000003 presente em supabase_migrations.schema_migrations, e a EF notificar-rh entregou os DOIS e-mails `revisao_solicitada` (status=entregue) no round-trip real do §7.21/§7.28 — apply e deploy provados por efeito. | 2026-07-30T05:14:14.820Z | 2026-09-06T21:10:00.000Z |
| 3 | 43 | unrun-verify | supabase/tests/p43_matriz_retencao_smoke.sql |  | smoke de 10 asserções da matriz de retenção escrito mas NÃO executado — sem MCP Supabase no executor; apply + run são o checkpoint 43-07 | fixed | Smoke EXECUTADO: a Phase 46 achou e consertou o diagnostico FALSO da assercao (j) (CLAUDE.md §Portoes). Um smoke so produz diagnostico falso rodando. | 2026-08-01T22:23:04.988Z | 2026-09-06T21:10:00.000Z |
| 4 | 43 | unrun-verify | supabase/tests/p43_previa_smoke.sql |  | Smoke da previa de retencao NAO executado — deliberadamente RED contra o banco atual; vai verde no checkpoint 43-07 com 9/9 PASS | open |  | 2026-08-02T16:54:32.146Z |  |
| 5 | 45 | deviation | docs/compliance/sql/gen-recibo-exclusao.cjs |  | 45-02: o <verify> do plano varria o JSON inteiro procurando 'tombstone', string que o proprio <action> manda existir em PASSOS_MOTOR; varredura de banidos escopada ao texto de titular (meta.campos_de_texto_de_titular) | fixed | Desvio ja implementado: a varredura de banidos esta escopada a meta.campos_de_texto_de_titular, como o proprio registro descreve. 45-VERIFICATION: PASSA. | 2026-08-05T04:13:18.606Z | 2026-09-06T21:10:00.000Z |
| 6 | 45 | deviation | .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-02-SUMMARY.md |  | 45-02: 6 das 9 bases legais do recibo foram escritas pela engenharia, nao ditadas pela UI-SPEC — revisao pelo Encarregado de Dados pendente antes do e-mail de recibo sair em PROD | waived | DECISAO-ENCARREGADO.md (2026-08-13): a Beauty Smile NAO designa Encarregado de Dados, e a revisao formal nao vira. O documento discute exatamente este caso (as 6 bases legais que a engenharia escreveu no 45-02) e transfere a decisao ao operador, que ja a tomou. Waived em 2026-09-06. | 2026-08-05T04:13:18.664Z | 2026-09-06T21:10:00.000Z |
| 7 | 45 | unrun-verify | supabase/tests/p45_bias_k5_smoke.sql |  | p45_bias_k5_smoke.sql e o DO de auto-verificacao da 20260805000003 nunca foram executados contra banco nenhum — o apply e 45-11 | fixed | 45-VERIFICATION: smoke verde 24/24 em PROD e criterio 3 do portao destrutivo com 7 assercoes negativas + CR-04 + re-identificacao, transcritas. | 2026-08-05T07:10:20.368Z | 2026-09-06T21:10:00.000Z |
| 8 | 45 | deviation | src/features/admin/bias-audit/biasMath.ts |  | A tela de auditoria de vies ainda le o payload v1; o snapshot passa a emitir celulas suprimidas sem applicants/selected e sem n_total | fixed | biasMath.ts hoje carrega o tipo-uniao BandSuprimida com `suprimida: true` e o switch que FORCA o chamador a decidir o que a supressao significa — le o payload v2, nao o v1. | 2026-08-05T07:10:20.426Z | 2026-09-06T21:10:00.000Z |
| 9 | 45 | unrun-verify | supabase/tests/p45_motor_exclusao_smoke.sql |  | Smoke do motor de exclusao NAO executado — deliberadamente RED (as 5 funcoes nascem em 45-03/45-05/45-07); os pins md5(prosrc) seguem com marcador PENDENTE-45-07 e C3 reprova enquanto assim for. Fecha no 45-11 com 21/21 PASS | fixed | p45_motor_exclusao_smoke rodou em PROD: 45-VERIFICATION criterio 5, «(C3) do smoke, verde 24/24 em PROD». | 2026-08-05T07:14:13.436Z | 2026-09-06T21:10:00.000Z |
| 10 | 45 | deviation | supabase/migrations/20260805000006_p45_anonimizar_candidato.sql |  | Obrigacoes que o smoke 45-04 impoe ao 45-07: (M1) trg_decisao_final_snapshot e AFTER UPDATE sem WHEN e reinsere OLD.justificativa — o scrub de decisao_final_historico tem de ser o ULTIMO statement do par; (M2) candidate_ai_decisions.candidato_id E vaga_id sao NOT NULL com ON DELETE SET NULL (clausulas inexequiveis) — decidir entre afrouxar as duas colunas e desidentificar o conteudo | fixed | As duas obrigacoes M1/M2 foram cumpridas no 45-07. 45-VERIFICATION SC#4: as 3 FKs NO ACTION seguem `a, a, a` e historico_candidatura 7=7 — medido, nao declarado. | 2026-08-05T07:14:13.496Z | 2026-09-06T21:10:00.000Z |
| 11 | 45 | unrun-verify | supabase/migrations/20260805000001_p45_pedido_exclusao.sql |  | As duas migrations do 45-03 foram escritas mas NAO aplicadas — o DO block de auto-verificacao so executa no apply (45-06) | fixed | Migrations 20260805000001 e ...0002 presentes em schema_migrations; os DO blocks de auto-verificacao executaram no apply. | 2026-08-05T07:23:32.301Z | 2026-09-06T21:10:00.000Z |
| 12 | 45 | stub | src/features/privacidade/components/ExcluirDadosBloco.tsx |  | Estado B sem botao Cancelar a exclusao — por desenho, entra no 45-08 | fixed | AlertDialog de confirmacao e cancelamento existem (useCancelarExclusao, ExcluirDadosBloco.tsx:44/72); caminho exercitado ponta a ponta em PROD com a T2 (§7.23 — pedida e cancelada na janela). O comentario obsoleto que dizia «entram no 45-08» tambem foi corrigido. | 2026-08-05T07:23:32.364Z | 2026-09-07T00:08:07.464Z |
| 13 | 45 | deviation | src/__tests__/copyPortoesLgpd.test.ts |  | O portao do CONSOL-04 ficou VERDE por falso positivo: a sonda casa substring em comentario. Promessa continua orfa; exige decisao do operador | fixed | O portao do CONSOL-04 foi REESCRITO para medir o disco de verdade («MENCAO nao conta como execucao»); o motor existe (45-07/45-10 pousaram) e a suite esta verde — o falso positivo por substring em comentario nao existe mais. | 2026-08-05T07:23:32.425Z | 2026-09-06T21:10:00.000Z |
| 14 | 45 | deviation | supabase/functions/executar-direito-titular/index.ts | 377 | DI-45-07-01: a EF chama as RPCs com service_role sem repassar o Authorization do titular; auth.uid() e NULL e o guard das RPCs ja aplicadas em PROD recusa com 42501 — nenhum pedido de exclusao seria registrado. Fecha no 45-10. | fixed | A EF tem hoje o client `supabaseTitular` (service key + Authorization do titular) para as QUATRO chamadas de RPC; auth.uid() deixa de ser NULL. 45-VERIFICATION: motor exercitado em PROD ponta a ponta pela EF com o JWT do titular. | 2026-08-05T23:11:21.892Z | 2026-09-06T21:10:00.000Z |
| 15 | 45 | unrun-verify | supabase/migrations/20260805000006_p45_anonimizar_candidato.sql |  | Os DO blocks de auto-verificacao das 3 migrations do 45-07 so EXECUTAM no apply, que e do 45-11 atras do portao destrutivo. Ate la a verificacao e estatica (forma), nao por execucao. | fixed | As 3 migrations do 45-07 estao aplicadas (20260805000006/7/8 em schema_migrations) — a verificacao deixou de ser estatica e passou a ser por execucao. | 2026-08-05T23:11:21.947Z | 2026-09-06T21:10:00.000Z |
| 16 | 45 | deviation | src/features/privacidade/components/ConfirmarExclusaoDialog.tsx |  | 45-08: portao RED do TDD verificado por execucao, nao por commit isolado — o gate tsc (baseline 97) reprova um teste que importa modulo ainda inexistente, e --no-verify e proibido | fixed | Janela de PROCESSO do TDD; a fase fechou com VERIFICATION PASSA e criterio 4 «zero --no-verify em toda a fase». | 2026-08-05T23:44:28.940Z | 2026-09-06T21:10:00.000Z |
| 17 | 45 | stub | src/features/vagas/hooks/useRetirarCandidatura.ts |  | O hook invoca a EF executar-direito-titular com acao 'retirar_candidatura', mas o vocabulario FECHADO dela e ACOES={pedir,cancelar} (index.ts:137). O caminho do candidato NAO funciona ate o 45-10 acrescentar a acao e repassar as claims do titular (DI-45-07-01). | fixed | ACOES da EF inclui 'retirar_candidatura' (executar-direito-titular/index.ts:263) — o vocabulario fechado foi ampliado no 45-10. | 2026-08-06T05:00:05.428Z | 2026-09-06T21:10:00.000Z |
| 18 | 45 | todo | src/features/triagem/services/triagemService.ts |  | Ponte de tipos (Pitfall 10) porque v_triagem_panel em database.types.ts ainda nao expoe encerrada_a_pedido_em. REMOVER apos o apply da migration 20260805000008 pelo 45-11 e npm run db:types. | fixed | db:types confirmou listar_historico_candidatura e v_triagem_panel.encerrada_a_pedido_em nos tipos; `as never` removido e o compilador agora CHECA a chamada. tsc 90 (baseline 96), zero erro no arquivo. Commit desta sessao. | 2026-08-06T05:00:05.483Z | 2026-09-07T00:08:07.122Z |
| 19 | 45 | unrun-verify | supabase/migrations/20260805000007_p45_retirada_e_evento.sql |  | As duas migrations do plano foram AUTORADAS e nao aplicadas (por desenho: quem aplica e o 45-11). Os blocos DO de auto-verificacao, o gate de md5 do BLOCO G e o caminho ponta a ponta so sao exercitados no apply. | fixed | Migrations 20260805000007 e ...0008 presentes em schema_migrations; o caminho ponta a ponta foi exercitado (45-VERIFICATION). | 2026-08-06T05:00:05.540Z | 2026-09-06T21:10:00.000Z |
| 20 | 45 | deviation | supabase/functions/executar-direito-titular/index.ts |  | DI-45-10-01: as 4 chamadas de RPC usam supabaseAdmin sem repassar o Authorization do titular; auth.uid() e NULL e as RPCs recusam com 42501 — o motor nao roda ponta a ponta | fixed | Idem 14 — as chamadas passaram para supabaseTitular, com o Authorization do titular repassado. | 2026-08-06T15:22:17.025Z | 2026-09-06T21:10:00.000Z |
| 21 | 45 | deviation | supabase/functions/executar-direito-titular/index.ts |  | DI-45-10-02: ACOES nao conhece 'retirar_candidatura' e o hook do 45-09 invoca a EF com essa acao — 400 VALIDATION traduzido para SERVER_ERROR na tela | fixed | Idem 17 — 'retirar_candidatura' entrou no vocabulario da EF. | 2026-08-06T15:22:17.081Z | 2026-09-06T21:10:00.000Z |
| 22 | 45 | deviation | supabase/tests/p45_motor_exclusao_smoke.sql |  | C1 exige que gerar_bias_snapshot nao conceda EXECUTE a authenticated, mas 20260805000003 o concede deliberadamente (chamador vivo: biasAuditService.ts:98) — DI-45-12-01, decisao do code review bloqueante do 45-11 | waived | O GRANT de EXECUTE a `authenticated` em gerar_bias_snapshot e DELIBERADO — chamador vivo em biasAuditService.ts:98, e o CLAUDE.md registra que os grants deste projeto foram raciocinados caso a caso («o GRANT do CR-02 nao deve ser revogado»). Medido em PROD em 2026-09-06: authenticated=X/postgres. Quem esta desalinhado com a decisao e a assercao C1 do smoke, nao o banco. Waived em 2026-09-06. | 2026-08-06T17:15:24.030Z | 2026-09-06T21:10:00.000Z |
| 23 | 45 | deviation | src/features/vagas/components/RetirarCandidaturaAcao.tsx |  | copy generica para a recusa NAO_RETIRAVEL: o hook traduz, o componente nao ramifica — DI-45-12-02 | fixed | Componente passa a ramificar NAO_RETIRAVEL com copy nao-retryable (o hook ja traduzia desde DI-45-12-01; era so a tela). Portao (h) com 3 sondas, PROVADO QUE MORDE: revertido o conserto, (h1) reprova. | 2026-08-06T17:15:24.086Z | 2026-09-07T00:08:07.292Z |
| 24 | 47 | unrun-verify | supabase/tests/p47_historico_smoke.sql |  | smoke do CONSOL-02 escrito e NAO executado: exige o apply da migration 20260809000001, que e checkpoint do orquestrador | fixed | smoke rodou 6/6 em PROD em 2026-08-13 e de novo em 2026-08-23 (47-VERIFICATION, confirmado pelo catalogo) | 2026-08-09T21:55:43.981Z | 2026-09-05T23:30:00.000Z |
| 25 | 47 | unmet-truth | src/features/transparencia/constants/subprocessadores.ts |  | As seis entradas carregam a sentinela PAIS_POR_MEDIR: a regiao onde o dado deste projeto e tratado nao e medivel deste ambiente. A pagina /subprocessadores LANCA ao renderizar e nao pode ser publicada ate o operador informar os seis paises medidos (47-04 Task 3, checkpoint bloqueante). | fixed | FECHADO por MEDICAO em 2026-08-11: o operador mediu os seis paises nos paineis e documentos dos fornecedores (47-04 Task 3). Cinco tratam os dados nos Estados Unidos, o ViaCEP declara jurisdicao brasileira com a ressalva de hospedagem nao divulgada no campo visivel. Sentinela e validador preservados como rede da proxima entrada. Commit eeed0e5. | 2026-08-09T22:12:40.305Z | 2026-08-11T00:39:00.000Z |
| 26 | 47 | unmet-truth | src/features/transparencia/constants/matrizRetencao.generated.ts |  | As oito citações de base legal publicadas em /privacidade seguem pendentes da revisão do Encarregado — gate de PUBLICAÇÃO herdado de 47-01 (D5) | waived | DECISAO-ENCARREGADO.md (2026-08-13) nomeia esta janela no proprio frontmatter («fecha: WINDOWS.md 26, 29, 30, 31»). Nao havera parecer de Encarregado; a aprovacao do operador de 2026-08-11 e a decisao FINAL. Waived em 2026-09-06. | 2026-08-09T23:11:20.359Z | 2026-09-06T21:10:00.000Z |
| 27 | 47 | todo | src/features/hub-candidato/services/historicoCandidaturaService.ts |  | as never pre-regen na chamada de listar_historico_candidatura — remover apos npm run db:types | fixed | Idem 18 — a chamada de listar_historico_candidatura ficou totalmente tipada, sem cast. | 2026-08-10T12:55:37.934Z | 2026-09-07T00:08:07.209Z |
| 28 | 47 | unrun-verify | .planning/phases/47-transpar-ncia-consolida-o/47-08-PLAN.md |  | 47-08 Task 3 (montagem do RodapePublico nas cinco superficies) nao executada: bloqueada pelo portao de PUBLICACAO do Encarregado, que segue aberto | fixed | RodapePublico montado nas 5 superficies (codigo) e o portao do Encarregado fechou por DECISAO-ENCARREGADO.md (2026-08-13) | 2026-08-11T03:53:04.434Z | 2026-09-05T23:30:00.000Z |
| 29 | 47 | deviation | src/__tests__/destinosDeRedeComFicha.test.ts |  | api.ipify.org e www.youtube.com: destinos vivos fora da lista publicada de empresas contratadas, registrados como pendente-de-decisao com fato medido e rota — a classificacao e ato do Encarregado, no portao de publicacao aberto do 47-08 | fixed | api.ipify.org e youtube ELIMINADOS em vez de declarados (03909dd, 2026-08-13); zero pendente-de-decisao restam | 2026-08-11T04:17:17.358Z | 2026-09-05T23:30:00.000Z |
| 30 | 47 | unmet-truth | src/features/transparencia/components/PrivacidadePublicaPage.tsx |  | Revisao formal do Encarregado NAO exercida: as duas paginas publicas foram liberadas por decisao do operador em 2026-08-11 | waived | DECISAO-ENCARREGADO.md (2026-08-13), idem — a janela pedia uma revisao formal que a decisao registrada eliminou. «Uma decisao registrada fecha; uma decisao nao tomada apodrece.» Waived em 2026-09-06. | 2026-08-11T04:28:51.767Z | 2026-09-06T21:10:00.000Z |
| 31 | 47 | unmet-truth | src/services/logAccessService.ts | 110 | api.ipify.org pendente-de-decisao: destino de rede sem ficha publicada nem classificacao do Encarregado, com a lista ja publicada | fixed | api.ipify.org eliminado; IP passa a ser preenchido pelo trigger trg_preencher_ip_logs_acesso (migration 20260813000001 aplicada) | 2026-08-11T04:28:51.827Z | 2026-09-05T23:30:00.000Z |
| 32 | 47 | unmet-truth | src/components/pages/InstrucoesFormularioPage.tsx | 77 | www.youtube.com pendente-de-decisao: iframe de terceiro sem ficha publicada nem classificacao do Encarregado, com a lista ja publicada | fixed | iframe do YouTube eliminado da InstrucoesFormularioPage (03909dd) | 2026-08-11T04:28:51.886Z | 2026-09-05T23:30:00.000Z |
| 33 | 45 | deviation | supabase/functions/executar-direito-titular/index.ts |  | NW-03 alargou: causa='falha_storage' cobre 10 classes nomeadas mais carimbo e excecao (DI-45-16-01) | waived | Desvio DECLARADO POR ESCRITO no docblock da EF (NW-03 / DI-45-16-01): causa='falha_storage' cobre 10 classes nomeadas mais carimbo e excecao. Comportamento conhecido, documentado e aceito. Waived em 2026-09-06. | 2026-08-12T01:30:33.120Z | 2026-09-06T21:10:00.000Z |
| 34 | 46 | stub | supabase/migrations/20260823000004_p46_sweep_tracer.sql |  | varrer_purga_retencao nao chama anonimizar_candidato: laco e subtransacao no formato final, chamada ausente ate o 46-04 (D-46-18/D-46-24) | fixed | MEDIDO NO VIVO em 2026-09-06: pg_get_functiondef(public.varrer_purga_retencao) em PROD contem `anonimizar_candidato` — a chamada ausente foi acrescentada pelo 46-04. | 2026-08-22T23:07:37.543Z | 2026-09-06T21:10:00.000Z |
| 35 | 46 | stub | supabase/tests/p42_invent05_cron_smoke.sql |  | assercao (a) fixa cron.job em 3 com mensagem de diagnostico falso para o 4o job legitimo — emenda de D-46-23 pendente no 46-06 | fixed | Assercao (a) reescrita: inventario por PERTENCIMENTO A CONJUNTO (array c_herdados + contagem propria do job de purga) em vez de `count(*) <> 3`. O diagnostico falso para o 4o job legitimo nao existe mais. | 2026-08-22T23:07:37.606Z | 2026-09-06T21:10:00.000Z |
| 36 | 46 | unrun-verify | supabase/tests/p46_purga_smoke.sql |  | 46-03: as 5 assercoes (j.1)(j.2)(j.3)(k)(l) foram escritas mas NAO executadas — apply e execucao dependem do checkpoint bloqueante da Task 3 | fixed | Fechada em 2026-08-22 pelo checkpoint da Task 3 do 46-03 sem razao escrita; preenchida em 2026-09-06 por evidencia: o 46-VERIFICATION lista as assercoes (j.1)(j.2)(j.3)(k)(l) como «rodou», e a (m) rodou a varredura em `live` dentro do envelope, medindo o despacho. | 2026-08-22T23:35:12.424Z | 2026-08-22T23:41:17.172Z |
| 37 | 46 | unrun-verify | supabase/migrations/20260823000005_p46_retencao_hold_e_excecoes.sql |  | 46-03: migration commitada mas NAO aplicada em PROD — retencao_hold, a linha de hold da fixture e as duas excecoes do predicado nao existem no banco ate o checkpoint da Task 3 | fixed | Idem: fechada em 2026-08-22 sem razao escrita. Preenchida em 2026-09-06 por evidencia direta — a migration 20260823000005 esta em supabase_migrations.schema_migrations, logo retencao_hold, a linha de hold da fixture e as duas excecoes do predicado existem no banco. | 2026-08-22T23:35:17.092Z | 2026-08-22T23:41:17.237Z |
| 38 | 46 | unrun-verify | supabase/tests/p46_purga_smoke.sql |  | Assercoes (b) e (o) escritas e commitadas mas NAO EXECUTADAS: nada foi aplicado em PROD e o Blocker B-02 (guard proprio de plano_exclusao_titular) as faria reprovar | open |  | 2026-08-23T00:13:52.635Z |  |
| 39 | 46 | deviation | supabase/migrations/20260805000005_p45_plano_e_dry_run.sql | 208 | B-02: guard de plano_exclusao_titular recusa chamador sem sessao; D-46-18 e incompleto e PURGA-02 nao fecha ate a decisao do operador | fixed | Blocker B-02 fechado pela migration 20260823000008 (3o ramo de plano_exclusao_titular, «nas DUAS metades» — 46-04-SUMMARY), aplicada em PROD. | 2026-08-23T00:13:52.699Z | 2026-09-06T21:10:00.000Z |
| 40 | 46 | deviation | supabase/migrations/20260823000006_p46_guard_purga.sql |  | BL-01/BL-02 do code review: dois defeitos que teriam ido a PROD (revogacao do EXECUTE do titular; ramo nao correlacionado com o chamador). Consertados, mas exigem NOVA rodada de review antes do apply | waived | O que a janela pede JA PASSOU: os consertos BL-01/BL-02 foram aplicados e a nova rodada de review antes do apply nao ocorreu. Isso esta registrado com honestidade no 46-VERIFICATION como criterio 2 = 0,5, «VIOLADO em 4 de 8 applies» — o custo esta contabilizado no portao de fase destrutiva, que fechou 3,5/5. A janela nao tem conserto pendente; fica como registro, nao como pendencia. Waived em 2026-09-06. | 2026-08-23T01:05:41.126Z | 2026-09-06T21:10:00.000Z |
| 41 | 46 | deviation | supabase/functions/purgar-retencao/index.ts |  | Titular sem candidatos.user_id: Storage e Auth ficam nao_aplicavel e objetos sob o antigo prefixo, se existirem, permanecem — nao ha caminho relacional do candidato ate os objetos dele (SONDA 2). Propriedade pre-existente do sistema, declarada por escrito no docblock | waived | Propriedade PRE-EXISTENTE do sistema, nao introduzida pela fase: sem candidatos.user_id nao ha caminho relacional do titular ate os objetos dele no Storage (SONDA 2). Declarada por escrito no docblock da EF. Fechar exigiria um modelo de dados diferente, que nao esta no escopo do M8. Waived em 2026-09-06. | 2026-08-23T03:46:13.782Z | 2026-09-06T21:10:00.000Z |
| 42 | 46 | unrun-verify | supabase/tests/p46_purga_smoke.sql |  | As cinco assercoes (q.1)-(q.5) do 46-05 nunca foram executadas contra Postgres: esta maquina nao tem instancia local. Rodar no checkpoint da Task 4; se reprovarem, medir o portao antes de acreditar na explicacao | open |  | 2026-08-23T03:46:13.859Z |  |
| 43 | 46 | deviation | CLAUDE.md |  | A varredura por FORMA da secao Portoes nao cobre 'IS DISTINCT FROM <n>', que e o idioma dominante do p46_purga_smoke.sql — um padrao de varredura que nao enxerga o idioma do arquivo que ele vigia tem ponto cego | fixed | Padrao de varredura do CLAUDE.md estendido para `IS DISTINCT FROM <n>` e listas literais proname/jobname/relname IN. Medido: 244 achados contra 164 do padrao antigo, sem perder NENHUMA das 164. | 2026-08-23T03:46:13.935Z | 2026-09-07T00:08:07.379Z |
| 44 | 49 | deviation | supabase/migrations/20260922000002_p49_colunas_proveniencia_e_analise.sql |  | As 16 colunas novas ficam SEM veredito de export até o plano 49-17 (o drift 05-export-allowlist-drift.sql as acusa); não saem na cópia porque ela é allowlist, mas o checklist D-57 itens 3-9 está aberto | open |  | 2026-09-22T20:26:36.921Z |  |
| 45 | 49 | unrun-verify | supabase/tests |  | O enum llm_provider e as 16 colunas novas nascem sem nenhum smoke vigiando; entrevista_guias e entrevista_analises não são citadas por NENHUM arquivo de supabase/tests/. Vigilância entra no p49_prova_prod.sql (plano 49-18) | open |  | 2026-09-22T20:26:37.024Z |  |
| 46 | 49 | unrun-verify | supabase/functions/resend-webhook/__tests__/resend-webhook.test.ts |  | O verify #2 do 49-02 (find supabase/functions -name '*.test.ts' \| grep -v strict-schema \| xargs deno test) NAO roda como escrito: resend-webhook.test.ts falha na resolucao de npm:svix@1.99.1 (ausente no node_modules). Pre-existente, sem relacao com a Phase 49. Medido excluindo tambem resend-webhook: 609 passed / 0 failed. | open |  | 2026-09-22T21:17:37.115Z |  |
| 47 | 49 | deviation | supabase/functions/_shared/ai-client.ts |  | interview_guide a 89% do timeout: maior latencia medida 98363 ms contra teto de 110 s; a 45 tok/s o teto por TEMPO e ~4950 tokens, mas max_tokens esta em 8000. Risco P1 de 'demorou' registrado, NAO consertado (Deferred do 49-02). | open |  | 2026-09-22T21:17:37.198Z |  |
| 48 | 49 | deviation | supabase/functions/_shared/ai-client.ts |  | OPENAI_FALLBACK_MODEL segue hardcoded ('gpt-4o-mini') e o parametro fallback_model_id do ResolvedPrompt continua ignorado pelas EFs. P1 registrado no 49-02, fora do escopo dele. | open |  | 2026-09-22T21:17:37.287Z |  |
| 49 | 49 | deviation | src/components/__tests__/KanbanBoard.test.tsx |  | 49-05: menu Radix não abre no happy-dom; exigiu 3 mocks (dropdown-menu + os 2 diálogos que ele passaria a montar sem QueryClientProvider) | open |  | 2026-09-22T23:00:36.248Z |  |
| 50 | 49 | deviation | supabase/functions/_shared/comparativo-config.ts |  | O teto COMPARATIVO_MAX_CANDIDATOS=4 repousa em aritmética (80 s x 45 tok/s = 3600 tok; n=4 = 3140 tok estimados), nao em medicao: a premissa A3 (P ~ 280-410 tok/candidato) e MEDIDA pela prova n=4 do plano 49-18. Se a saida real passar de 3140 tok, o teto volta ao operador antes de fechar a fase (D-59). | open |  | 2026-09-23T00:11:20.528Z |  |
| 51 | 49 | deviation | .planning/phases/49-consertos-da-jornada-bloco-2/49-08-PLAN.md |  | Dois <verify> do 49-08 embutem uma ESCRITA no comando de verificacao (p46apply.cjs migrate; efdeploy.cjs sem --dry-run). Nao sao re-rodaveis: o primeiro sai nao-zero por desenho (version ja no ledger), o segundo criaria uma version de EF identica. Um portao que nao se pode re-rodar so morde uma vez. | open |  | 2026-09-23T00:11:20.613Z |  |
| 52 | 49 | deviation | src/features/triagem/components/RedacaoReviewPanel.tsx | 47 | 49-09 deployou a EF v15 avaliando a redacao pela BARS (D1 Especificidade, D2 Acao, D3 Aprendizado, D4 Alinhamento), mas a tela do RH (RedacaoReviewPanel.tsx:47 e RedacaoOverrideForm.tsx:45) rotula D1-D4 como os 4 valores BS (Experiencia UAU, Inovacao, Atitude de Dono, Sede de Crescimento). Toda redacao avaliada entre este deploy e o plano 49-15 aparece com o rotulo ERRADO: o numero e da especificidade da situacao e a tela diz Experiencia UAU. O 49-15 importa a mesma constante e fecha (D-25). | fixed | 49-15: as duas telas passaram a importar DIMENSOES_REDACAO de _shared/bars-redacao.ts — a MESMA constante que a EF v15 envia ao modelo — e resolvem o rotulo PELA CHAVE devolvida, nunca por posicao; os mapas proprios (DIM_LABEL :47 e DIMENSOES :45, com os 4 valores BS) sairam. Provado por assercoes que ITERAM sobre a constante (sem lista literal de rotulos — a forma que nao envelhece) e por 8 mutacoes que mordem, entre elas o retorno do mapa proprio (25 reprovados) e a leitura por POSICAO do dimension_scores (4 reprovados, exatamente os 4 de ordem trocada). Marcador redacao-rubrica-versao-antiga lido de volta de rh.beautysmile.com.br, no chunk lazy RedacaoReviewPanel-D4O1GT-q.js. ACHADO EXTRA do mesmo conserto, medido em PROD: analise_ia.reasoning e analise_ia.citacoes, que a tela lia, NAO EXISTEM no JSONB (false nas 2 linhas vivas), enquanto dimension_scores[].reasoning e .cited_evidence existem (true nas duas) — o raciocinio da IA nunca chegou ao RH, e agora chega, por dimensao. | 2026-09-23T00:40:21.953Z | 2026-09-23T13:01:33.905Z |
| 53 | 49 | unrun-verify | .planning/phases/49-consertos-da-jornada-bloco-2/49-09-PLAN.md |  | O <verify> #3 do 49-09 embute uma ESCRITA no comando de verificacao (node efdeploy.cjs sem --dry-run). Nao e re-rodavel: repeti-lo criaria uma version 16 identica a 15, poluindo o historico de deploy para nao provar nada novo. Re-verificado pelo RESULTADO (version=15/ACTIVE/verify_jwt=true lida de volta da Management API + os marcadores lidos do bundle vivo). Mesma familia da WINDOWS 51 (49-08); e a segunda ocorrencia da fase. | open |  | 2026-09-23T00:40:22.050Z |  |
| 54 | 49 | deviation | supabase/functions/_shared/bars-redacao.ts |  | A rubrica BARS entra no input com 8476 octetos (~2037 tok, medido) de ancoras, em bloco cacheado (cache_control ephemeral). O culture_fit_essay tem max_tokens 2500 e a maior saida medida foi 1253 tok (50%). O bloco novo alonga o PEDIDO, nao necessariamente a saida, mas a saida real sob a rubrica nova nao foi medida: nenhuma redacao foi avaliada pela v15 ainda. A prova de saida real e do plano 49-18 (premissa C9). Registrado, nao consertado: mexer no max_tokens sem medir e consertar o parametro errado. | open |  | 2026-09-23T00:40:22.138Z |  |
| 55 | 49 | unrun-verify | .planning/phases/49-consertos-da-jornada-bloco-2/49-23-PLAN.md |  | O <verify> #3 do 49-23 embute duas ESCRITAS no comando de verificacao (node efdeploy.cjs sem --dry-run, e um segundo deploy no encadeamento). Nao e re-rodavel: repeti-lo criaria uma version 22 identica a 21. Re-verificado pelo RESULTADO (version=21/ACTIVE/verify_jwt=true relidos da Management API + o marcador dimensao_desconhecida=3 lido do bundle vivo + origin/main..HEAD vazio) e pelas partes re-rodaveis (--dry-run com sjt-rubrica.ts no fechamento). TERCEIRA ocorrencia da fase (WINDOWS 51 do 49-08, 53 do 49-09). | open |  | 2026-09-23T01:16:21.597Z |  |
| 56 | 49 | deviation | src/features/avaliacao/components/ScorecardAvaliacao.tsx |  | A EF avaliar-redacao (v21) passou a gravar em scores_candidato.metadata o motivo da revisao humana (motivos_revisao) e os nomes que a IA inventou (dimensoes_desconhecidas), mas NENHUMA tela le esses campos: CasoAbertoMetadata em scoresRhService.ts:62-66 declara somente dimension_scores e composite_0_25. Consequencia: uma SJT que foi para revisao porque a IA inventou o nome da dimensao aparece ao RH como qualquer outra pendente_humano. E o irmao SJT do D-25/WINDOWS 52 (a tela da redacao). Nao consertado aqui: o front e de quem o toca (D-55). | open |  | 2026-09-23T01:16:21.687Z |  |
| 57 | 49 | deviation | supabase/functions/_shared/sjt-rubrica.ts |  | O bloco da rubrica SJT tem 5330 octetos (~1281 tok, 59 linhas) contra os 42 octetos do bloco antigo (Vaga: <uuid>) — 127x. O work_sample_sjt tem max_tokens 3000 e NUNCA teve chamada Sonnet logada (C9: 0 linhas em ai_call_logs), entao nao existe saida medida para comparar. max_tokens e teto de SAIDA e o bloco alonga o PEDIDO, mas o efeito de uma rubrica rica sobre o tamanho do campo reasoning por dimensao nao esta medido nesta EF. Irmao da WINDOWS 54 (redacao). A prova e do 49-18; mexer no teto sem medir e consertar o parametro errado. | open |  | 2026-09-23T01:16:21.778Z |  |
| 58 | 49 | deviation | supabase/functions/avaliar-redacao/index.ts |  | A unica SJT de caso aberto ja avaliada em PROD (scores_candidato 8acf3c98) segue com score 7,00 — media UNIFORME sobre 5 dimensoes que a IA inventou —, sem provedor_ia/modelo_ia e sem motivos_revisao. Sem reescrita retroativa (D-30/D-26): a rubrica que a avaliou nao existia no input, entao nao ha nota correta a recalcular, e inventar uma seria pior que registrar que ela nao e confiavel. Fica como marco historico, igual as 2 redacoes do 49-09. | open |  | 2026-09-23T01:16:21.871Z |  |
| 59 | 49 | unrun-verify | .planning/phases/49-consertos-da-jornada-bloco-2/49-24-PLAN.md |  | O <verify> #2 do 49-24 encadeia `node efdeploy.cjs` SEM --dry-run: re-rodá-lo cria uma version 19 idêntica à 18 para não provar nada novo. Re-verificado pelo RESULTADO (version/status/verify_jwt/import_map relidos da Management API + marcadores do bundle vivo + --dry-run re-rodável). QUARTA ocorrência da fase (51, 53, 55). | open |  | 2026-09-23T01:40:02.218Z |  |
| 60 | 49 | stub | supabase/functions/gerar-guia-entrevista/index.ts | 340 | Teto de custo diário estourado: callAi devolve parsed={recommendation:'hold'} (não-null), então persistFlags fica VAZIO e a EF persiste um guia com 0 perguntas e nenhuma flag, devolvendo {ok:true}. Um roteiro barrado por gasto é indistinguível de um roteiro vazio bem-sucedido. MEDIDO pelo teste novo do 49-24 (needs_human=false no log). Proveniência NULL/NULL é honesta mas conflate com os 5 guias legados. Fora do escopo do 49-24 (proveniência); o conserto é a flag. | fixed |  | 2026-09-23T01:40:15.497Z | 2026-09-23T04:41:36.084Z |
| 61 | 49 | unmet-truth | src/features/entrevista/components/GuiaEntrevistaPanel.tsx |  | entrevista_guias.provedor_ia/.modelo_ia estão GRAVADOS (49-24, EF v18 em PROD) e NENHUMA tela os lê. O selo de proveniência do guia é o 49-16 (D-55). Irmão do WINDOWS 56 (o mesmo para scores_candidato.metadata do SJT): melhor que não estar gravado, e ainda não é o conserto. | fixed | 49-16: o selo de proveniencia (ProvenienciaIABadge, 49-13) passa a ser renderizado ao lado do titulo do Guia STAR/PEI, lendo provedor_ia/modelo_ia da linha — e a ENTREVISTA_GUIA_ALLOWLIST ganhou as duas colunas, porque sem projeta-las o componente nao tinha de onde ler (o dado estava gravado e a leitura do front nao o pedia). Renderizado SO quando existe roteiro: um resultado que nao existe nao tem proveniencia. modelo_ia NULL vira «modelo nao registrado» (D-30), nunca silencio — e esse e o estado das 5 linhas vivas de entrevista_guias medidas em 2026-09-23, que omitir o selo faria parecer identicas a um roteiro com proveniencia confirmada. Provado por 4 testes novos em GuiaEntrevistaPanel.test.tsx (openai = contingencia; anthropic = neutro; NULL = modelo nao registrado; sem guia = sem selo), medidos em RED antes (3 reprovados por «Unable to find [data-testid=proveniencia-ia-badge]») e verdes depois. Publicado: proveniencia-ia-badge conferido no chunk lazy ProvenienciaIABadge-DUdFjuJR.js e LIDO DE VOLTA do site vivo. O irmao WINDOWS 56 (motivos_revisao/dimensoes_desconhecidas do SJT) NAO e deste plano — o operador o roteou para o 49-17 — e segue aberto. | 2026-09-23T01:40:15.620Z | 2026-09-23T13:34:06.380Z |
| 62 | 49 | unrun-verify | supabase/migrations/20260922000008_p49_revisao_entrevista_vigente.sql |  | 49-10: a migration nao e re-executavel — o PRE-PORTAO pina os md5 ANTIGOS de salvar_avaliacao_entrevista/confirmar_revisao_entrevista e os vivos agora sao os novos (2b567aaa..., 43df21b8...). O <verify> do ensaio foi re-executado por EQUIVALENCIA (md5 do ledger + pos-portao lido do catalogo). E o portao funcionando, nao defeito; registrado para quem redefinir estas funcoes depois. | waived | Nao e defeito, e uma PROPRIEDADE do pre-portao por md5: ele recusa sobrescrever um corpo que nao mediu, entao a 20260922000008 deixa de ser re-executavel no instante em que e aplicada com sucesso. O <verify> foi re-executado por EQUIVALENCIA (md5 do ledger conferido por leitura de volta + as 8 assercoes do pos-portao lidas do catalogo), e os md5 NOVOS estao tabelados no 49-10-SUMMARY para quem redefinir estas funcoes depois. O irmao 49-01 atravessou a mesma situacao (Deviation 2). Mantido no ledger como registro, dispensado do portao de ship; reverter para open e decisao do operador. | 2026-09-23T03:19:19.971Z | 2026-09-23T03:23:16.705Z |
| 63 | 49 | deviation | .planning/phases/49-consertos-da-jornada-bloco-2/49-10-SUMMARY.md |  | 49-10: git push origin main NEGADO pelo ambiente. 2 migrations em PROD + EF v17 no ar com os commits NAO ENVIADOS (modo de falha do CLAUDE.md sobre os dois canais). Acao do operador: push + conferir origin/main..HEAD vazio. | fixed |  | 2026-09-23T03:19:20.062Z | 2026-09-23T03:22:32.029Z |
| 64 | 49 | stub | supabase/functions/gerar-guia-entrevista/index.ts | 385 | 49-25: persistFlags (inclusive weak_dim_uncovered, do Pitfall 4 / ENTREV-01) e COMPUTADO e depois DESCARTADO quando existe roteiro: o upsert grava flags apenas no ramo { incompleto: true, ... }. Logo um roteiro que, DEPOIS do re-prompt, ainda deixa uma dimensao fraca descoberta e persistido SEM nenhuma flag, enquanto o docblock da EF afirma que ele 'persiste o roteiro com flag para humano'. O rastro de runtime diz needs_human: true e a linha nao diz nada. Conserto: acrescentar flags ao ramo do roteiro existente. Fora de escopo do 49-25 (defeito PRE-EXISTENTE, requisito ENTREV-01 e nao JORN-39, e muda a forma do guia no caminho de sucesso, que o 49-16 le). O 49-16 PRECISA disto: sem ele o selo nunca vera weak_dim_uncovered. | fixed | 49-26: flags passa a chegar ao upsert TAMBEM no caminho de sucesso (spread flagsDoRoteiro no ramo do roteiro), com a chave AUSENTE quando nao ha nada a sinalizar — um array vazio explicito sob onConflict apagaria a flag da execucao anterior. O docblock da EF passou a descrever o comportamento real. Provado por 2 testes novos (roteiro com dimensao fraca descoberta grava weak_dim_uncovered; sem flag a chave nao nasce) e por 2 mutacoes que mordem (M1 remove o spread = 1 reprovado; M2 grava array vazio sempre = 1 reprovado). EF gerar-guia-entrevista version=21 ACTIVE em PROD, marcadores conferidos no bundle VIVO. PROD medido: 0 linhas de entrevista_guias no estado defeituoso — defeito latente, nada retroativo. | 2026-09-23T04:40:06.094Z | 2026-09-23T05:56:52.179Z |
| 65 | 49 | stub | supabase/functions/avaliar-transcricao-entrevista/index.ts | 377 | 49-25: MESMA FORMA do defeito que o 49-25 consertou em gerar-guia-entrevista (WINDOWS 60), medida pela varredura do <measure_first> item 4. A guarda e 'parsed == null \|\| error_code === <codigo de injecao>' e NAO olha o provedor nem flagged_for_human_review. Com o teto diario de custo (AI-06) estourado, callAi devolve parsed NAO nulo com error_code cost_cap_exceeded: a guarda da falso, a EF cai no caminho de sucesso e grava a analise como status_analise pendente_humano com competencias vazias — indistinguivel de uma analise real esperando revisao humana. As outras tres irmas (analise-candidato-individual, avaliar-redacao, avaliar-redacao-cultural) estao cobertas porque tambem testam flagged_for_human_review === true; esta e a unica que nao. NAO consertado aqui (Scope Boundary: EF de outro plano; as sete EFs compartilham _shared e um segundo sitio pede plano proprio). Conserto: a mesma pergunta pelo PROVEDOR. | fixed | 49-26: a guarda de never-absent passa a fazer as DUAS perguntas — algumProvedorRespondeu(result), do predicado unico de _shared/resultado-de-provedor.ts, e parsed == null. Saiu a comparacao do codigo de erro contra um unico codigo literal. O teto de custo passa a cair no ramo falhou do 49-10: nao supera a vigente, nao entra na fila de revisao, competencias/citacoes/bias/metadata NULL. A medicao do RED revelou MAIS do que esta entrada registrava: a linha defeituosa tambem marcava a analise boa anterior como SUPERADA (superadas: 1 no rastro de runtime), entao a tela ficava com a vazia — nao era so indistinguivel de uma analise real, ela SUBSTITUIA a boa. Provado por 1 teste novo e 3 mutacoes (M6 defeito original = 1 reprovado; M7 a forma PROIBIDA reintroduzida = 1; M8 pendente_humano no ramo de falha = 2). EF avaliar-transcricao-entrevista version=18 ACTIVE em PROD, marcadores no bundle VIVO. PROD medido: 0 linhas no estado defeituoso — defeito latente. | 2026-09-23T04:40:17.604Z | 2026-09-23T05:57:42.852Z |
| 66 | 49 | unrun-verify | .planning/phases/49-consertos-da-jornada-bloco-2/49-25-PLAN.md |  | 49-25: o <verify> #2 do plano embute uma ESCRITA (node efdeploy.cjs sem --dry-run) e nao e re-rodavel — re-rodar criaria uma version nova identica, poluindo o historico de deploy para nao provar nada. Re-verificado pelo RESULTADO: version/status/verify_jwt/import_map relidos da Management API, marcadores conferidos no bundle VIVO, --dry-run re-rodavel, origin/main..HEAD vazio. QUINTA ocorrencia da fase (as quatro anteriores estao no WINDOWS 59). | open |  | 2026-09-23T04:41:05.237Z |  |
| 67 | 49 | unrun-verify | supabase/tests/p46_purga_smoke.sql | 1532 | p46_purga_smoke (j.2) reprova por estado de fixture-seed que derivou: a vaga 4601d000-...-0003 ('fixture-p46 vaga ativa (sintetica)') esta 'arquivada' desde 2026-08-23 17:47, e a assercao de NAO-VACUIDADE exige 'ativa'. Medido pre-existente: identico com os corpos ANTERIORES ao apply do 49-14. Bloqueia as assercoes (o)/(o.6)/(o.7)/(p) que exercitam o 4o ramo do guard do motor; com a vaga devolvida a 'ativa' dentro de requisicao que aborta, o gate fecha 27/27. | open |  | 2026-09-23T05:25:53.300Z |  |
| 68 | 49 | stub | supabase/functions/comparativo-candidatos/index.ts | 434 | 49-26: SEXTO sitio da mesma familia, achado pela re-varredura das SETE consumidoras de callAi (o 49-25 varreu cinco e nao alcancou esta). `const ranking = result.parsed ?? null` — NAO ha nenhuma guarda de bloqueio pre-provedor nesta EF: zero ocorrencias de flagged_for_human_review e nenhuma leitura de error_code. Com o teto diario de custo (AI-06) estourado, callAi devolve parsed={recommendation:'hold',flagged_for_human_review:true}, logo `ranking` fica NAO nulo e o stub e (a) inserido em comparativo_solicitado.ranking (jsonb NOT NULL) como se fosse o ranking auditado, e (b) DEVOLVIDO ao RH no payload (`return jsonResponse({ok:true, ranking, ...})`) — um comparativo que nenhum modelo produziu chega a tela como comparativo. provedor_ia/modelo_ia ja saem NULL corretamente, entao a linha de auditoria fica auto-contraditoria: ranking presente, autor ausente. NAO consertado (Scope Boundary: o <measure_first> do 49-26 mandou reportar e nao consertar; EF de outro plano, exige deploy proprio). Conserto: a mesma pergunta estrutural — `!algumProvedorRespondeu(result)` de _shared/resultado-de-provedor.ts, que este plano criou e que esta EF ainda nao importa. | open |  | 2026-09-23T05:59:25.800Z |  |
| 69 | 49 | deviation | .planning/WINDOWS.md |  | 49-26: `gsd-tools windows fixed <id> <reason>` ACEITA o segundo posicional e o DESCARTA — a entrada vira status=fixed com reason vazio, nos dois lugares (tabela e bloco JSON). Medido duas vezes nesta sessao (64 e 65) e confirmado retroativamente: a entrada 60, marcada fixed pelo 49-25, tambem esta com reason vazio. Contornado escrevendo o motivo a mao nos dois lugares. Um ledger que registra QUE foi consertado mas nao COMO e meio registro: quem reabrir a janela no futuro nao tem a prova. Nao consertado no gsd-core (fora do repositorio do projeto). | open |  | 2026-09-23T05:59:44.768Z |  |
| 70 | 49 | deviation | supabase/functions/_shared/resultado-de-provedor.ts |  | 49-26: o normalizador `provedorDeResultado(provider)` (devolve 'anthropic'\|'openai'\|NULL, gatilhado pelos CHECKs das tabelas) existe em SEIS copias — avaliar-transcricao-entrevista:157, analise-candidato-individual:166, avaliar-redacao-cultural:139, avaliar-redacao:254 (como `proveniencia`), gerar-guia-entrevista:442 e comparativo-candidatos:443 (as duas ultimas inline, sem funcao). NAO e o mesmo predicado que este plano extraiu: aquele pergunta 'algum provedor respondeu?' e e deliberadamente SEM allowlist; este NORMALIZA contra a allowlist de um CHECK de banco. Fundi-los seria errado. Mas as seis copias do normalizador entre si sao a mesma duplicacao que o D-21 proibe, e agora ha um modulo em _shared onde ele caberia. Nao consertado: seis EFs, seis deploys, escopo de plano proprio. | open |  | 2026-09-23T05:59:44.862Z |  |
| 71 | 49 | deviation | src/features/avaliacao/components/DevolutivaBigFiveView.tsx | 38 | 49-15 (delta da varredura por FORMA, nao pedido pelo plano): o padrao 'DIM_LABEL\|DIMENSOES = [' acha DOIS mapas de rotulo de dimensao Big Five que a tabela C7 do kickoff nao lista — DevolutivaBigFiveView.tsx:38 (DIM_LABEL) e ScorecardAvaliacao.tsx:223 (BIGFIVE_DIM_LABEL). Os dois estao IDENTICOS hoje (5/5 iguais), entao NAO ha defeito vivo; o que ha e a precondicao exata do WINDOWS 52: dois mapas locais, nenhuma constante compartilhada, e um _shared/bigfive-scoring.ts que poderia hospedar a fonte unica e nao hospeda rotulo nenhum. A divergencia da redacao tambem comecou com duas tabelas iguais e apareceu quando UM lado mudou. Agravante: o rotulo N='Sensibilidade Emocional' e exigencia LGPD-04 (nunca o termo clinico) em AMBOS — uma divergencia ali nao seria cosmetica, seria de conformidade, e o guard forbidden-strings NAO pega o termo clinico do N (nao esta entre os 7 termos). Nao consertado: fora dos IDs do 49-15 (JORN-07/JORN-28), e o Big Five e outra rubrica. | open |  | 2026-09-23T13:02:34.783Z |  |
| 72 | 49 | deviation | src/features/entrevista/components/EntrevistaScorecardInline.tsx | 30 | 49-15: depois do conserto do D-25, EntrevistaScorecardInline.tsx:29-34 (DEFAULT_COMPETENCIAS) e o UNICO lugar do front onde os 4 valores Beauty Smile aparecem como rotulos de eixo de avaliacao — e ali eles sao COMPETENCIAS DE ENTREVISTA, nao dimensoes da rubrica da redacao: escopo deliberado, o plano 49-15 manda nao tocar. Registrado porque o portao estatico do 49-15 procura os 4 valores apenas nos dois arquivos da redacao; quem varrer o front inteiro por 'Experiencia UAU' vai achar este e precisa saber que o achado e legitimo. Se algum dia a entrevista tambem ganhar rubrica versionada em _shared, este e o sitio. | open |  | 2026-09-23T13:02:48.332Z |  |
| 73 | 49 | unmet-truth | src/features/entrevista/services/entrevistaService.ts |  | 49-16 (§Deferred do plano, achado NAO perguntado ao operador): getGuia le entrevista_guias SEM filtro de tipo — order('created_at' desc).limit(1) — entao a aba do guia mostra sempre o roteiro MAIS RECENTE, seja ele da online ou da presencial, e nao ha nada na tela dizendo de qual entrevista aquele roteiro e. Medido em PROD 2026-09-23: das 3 candidaturas com guia, DUAS (a1dd4c42, 0b1c887b) tem os DOIS tipos gravados, entao o roteiro da online e inalcancavel pela tela nessas duas. O selo de proveniencia que este plano acrescentou herda o problema: ele diz corretamente qual modelo escreveu o roteiro EXIBIDO, e o roteiro exibido pode nao ser o da entrevista que o RH esta conduzindo. E a mesma classe do defeito D-41/D-39 que este plano consertou na aba da transcricao (a tela escolhendo por recencia em vez de por tipo/vigencia), um nivel ao lado. Conserto: getGuia(candidaturaId, tipo) com o mesmo seletor da aba da transcricao, ou a aba do guia mostrando os dois roteiros rotulados. Fora de escopo: o plano fixou explicitamente que getGuia segue sem filtro. | open |  | 2026-09-23T13:35:27.952Z |  |
| 74 | 49 | unmet-truth | supabase/migrations/20260922000010_p49_retro_trilha_bd9.sql |  | BD-9 meio-fechada: D-47 RECUSADA pelo operador em 2026-09-23 (editaria a trilha de auditoria sem a trilha registrar a edicao). A justificativa da decisao final segue em 5 linhas de historico_candidatura.criterio_texto. Tem de aparecer no 49-17 (inventario LGPD) e no fecho do M8. | open |  | 2026-09-23T14:45:13.264Z |  |
| 75 | 49 | unrun-verify | supabase/tests/p46_purga_smoke.sql |  | Asseroes (j.2), (o), (o.6), (o.7) e (p) bloqueadas: o operador RECUSOU abrir a vaga seed 4601d000-...-0003 (fica arquivada). O 4o ramo do guard do motor segue NAO exercitado entrando no 49-19. Conserto e do plano 49-28 (fixture que abre e restaura dentro do proprio envelope). | open |  | 2026-09-23T14:45:13.350Z |  |
| 76 | 49 | unmet-truth | supabase/migrations/20260922000013_p49_motor_respostas_e_producoes.sql |  | 49-20: as escolhas de multipla escolha da SJT sobrevivem dentro de scores_candidato.metadata->'respostas' (medido: 4 de 5 linhas sjt, com opcao_id/pergunta_id/peso). O recibo promete no item respostas_e_producoes que «as suas respostas das avaliacoes foram apagadas», e a Correcao 14 REJEITOU a opcao (c) («as alternativas que voce marcou ficam»). Nao foi consertado aqui: a migration ja esta aplicada e escriturada, e alargar o escopo do passo de mao unica alem do que o operador enumerou nao e conserto de agente. Conserto cirurgico possivel (metadata - 'respostas', a linha fica), decisao do operador via 49-21. | open |  | 2026-09-23T15:42:18.742Z |  |
| 77 | 49 | unmet-truth | supabase/migrations/20260922000013_p49_motor_respostas_e_producoes.sql |  | 49-20: resumos do texto removido sobrevivem — redacoes_candidato.texto_hash (NOT NULL, 2 linhas) e input_hash, e entrevista_analises.texto_hash (5 linhas). Nao sao o texto e nao estao entre as 14 origens do recibo, mas permitem CONFIRMAR um texto adivinhado depois de o original ter sido apagado (Art. 12 §1o, meios razoaveis). Registrado, nao consertado: fora do que o operador enumerou no D-48. Avaliar no 49-21. | open |  | 2026-09-23T15:42:18.821Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "42",
    "file": "supabase/functions/notificar-rh/helpers.ts",
    "line": null,
    "description": "Link do e-mail ao RH aponta para /rh/revisoes, rota que so existe a partir do plano 42-09 (pagina) / 42-10 (sidebar) — se o trigger for aplicado antes, um pedido de revisao real produz e-mail com link 404",
    "status": "fixed",
    "reason": "Rota /rh/revisoes existe (routes.tsx:497) e foi percorrida AO VIVO em 2026-09-06 (§7.28): a fila carrega e responde. O link do e-mail ao RH resolve.",
    "recorded_at": "2026-07-30T05:14:14.765Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "42",
    "file": "supabase/migrations/20260730000003_p42_trg_revisao_solicitada.sql",
    "line": null,
    "description": "42-07: apply da migration, deploy da EF notificar-rh, diff de pg_get_functiondef contra a transcricao, smoke do round-trip e assercao negativa da varredura — nenhum executado (MCP Supabase indisponivel ao subagente); checkpoint do orquestrador",
    "status": "fixed",
    "reason": "Migration 20260730000003 presente em supabase_migrations.schema_migrations, e a EF notificar-rh entregou os DOIS e-mails `revisao_solicitada` (status=entregue) no round-trip real do §7.21/§7.28 — apply e deploy provados por efeito.",
    "recorded_at": "2026-07-30T05:14:14.820Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "43",
    "file": "supabase/tests/p43_matriz_retencao_smoke.sql",
    "line": null,
    "description": "smoke de 10 asserções da matriz de retenção escrito mas NÃO executado — sem MCP Supabase no executor; apply + run são o checkpoint 43-07",
    "status": "fixed",
    "reason": "Smoke EXECUTADO: a Phase 46 achou e consertou o diagnostico FALSO da assercao (j) (CLAUDE.md §Portoes). Um smoke so produz diagnostico falso rodando.",
    "recorded_at": "2026-08-01T22:23:04.988Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
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
    "status": "fixed",
    "reason": "Desvio ja implementado: a varredura de banidos esta escopada a meta.campos_de_texto_de_titular, como o proprio registro descreve. 45-VERIFICATION: PASSA.",
    "recorded_at": "2026-08-05T04:13:18.606Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "45",
    "file": ".planning/phases/45-motor-de-exclus-o-anonimiza-o/45-02-SUMMARY.md",
    "line": null,
    "description": "45-02: 6 das 9 bases legais do recibo foram escritas pela engenharia, nao ditadas pela UI-SPEC — revisao pelo Encarregado de Dados pendente antes do e-mail de recibo sair em PROD",
    "status": "waived",
    "reason": "DECISAO-ENCARREGADO.md (2026-08-13): a Beauty Smile NAO designa Encarregado de Dados, e a revisao formal nao vira. O documento discute exatamente este caso (as 6 bases legais que a engenharia escreveu no 45-02) e transfere a decisao ao operador, que ja a tomou. Waived em 2026-09-06.",
    "recorded_at": "2026-08-05T04:13:18.664Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/tests/p45_bias_k5_smoke.sql",
    "line": null,
    "description": "p45_bias_k5_smoke.sql e o DO de auto-verificacao da 20260805000003 nunca foram executados contra banco nenhum — o apply e 45-11",
    "status": "fixed",
    "reason": "45-VERIFICATION: smoke verde 24/24 em PROD e criterio 3 do portao destrutivo com 7 assercoes negativas + CR-04 + re-identificacao, transcritas.",
    "recorded_at": "2026-08-05T07:10:20.368Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 8,
    "kind": "deviation",
    "phase": "45",
    "file": "src/features/admin/bias-audit/biasMath.ts",
    "line": null,
    "description": "A tela de auditoria de vies ainda le o payload v1; o snapshot passa a emitir celulas suprimidas sem applicants/selected e sem n_total",
    "status": "fixed",
    "reason": "biasMath.ts hoje carrega o tipo-uniao BandSuprimida com `suprimida: true` e o switch que FORCA o chamador a decidir o que a supressao significa — le o payload v2, nao o v1.",
    "recorded_at": "2026-08-05T07:10:20.426Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 9,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/tests/p45_motor_exclusao_smoke.sql",
    "line": null,
    "description": "Smoke do motor de exclusao NAO executado — deliberadamente RED (as 5 funcoes nascem em 45-03/45-05/45-07); os pins md5(prosrc) seguem com marcador PENDENTE-45-07 e C3 reprova enquanto assim for. Fecha no 45-11 com 21/21 PASS",
    "status": "fixed",
    "reason": "p45_motor_exclusao_smoke rodou em PROD: 45-VERIFICATION criterio 5, «(C3) do smoke, verde 24/24 em PROD».",
    "recorded_at": "2026-08-05T07:14:13.436Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 10,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/migrations/20260805000006_p45_anonimizar_candidato.sql",
    "line": null,
    "description": "Obrigacoes que o smoke 45-04 impoe ao 45-07: (M1) trg_decisao_final_snapshot e AFTER UPDATE sem WHEN e reinsere OLD.justificativa — o scrub de decisao_final_historico tem de ser o ULTIMO statement do par; (M2) candidate_ai_decisions.candidato_id E vaga_id sao NOT NULL com ON DELETE SET NULL (clausulas inexequiveis) — decidir entre afrouxar as duas colunas e desidentificar o conteudo",
    "status": "fixed",
    "reason": "As duas obrigacoes M1/M2 foram cumpridas no 45-07. 45-VERIFICATION SC#4: as 3 FKs NO ACTION seguem `a, a, a` e historico_candidatura 7=7 — medido, nao declarado.",
    "recorded_at": "2026-08-05T07:14:13.496Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 11,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/migrations/20260805000001_p45_pedido_exclusao.sql",
    "line": null,
    "description": "As duas migrations do 45-03 foram escritas mas NAO aplicadas — o DO block de auto-verificacao so executa no apply (45-06)",
    "status": "fixed",
    "reason": "Migrations 20260805000001 e ...0002 presentes em schema_migrations; os DO blocks de auto-verificacao executaram no apply.",
    "recorded_at": "2026-08-05T07:23:32.301Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 12,
    "kind": "stub",
    "phase": "45",
    "file": "src/features/privacidade/components/ExcluirDadosBloco.tsx",
    "line": null,
    "description": "Estado B sem botao Cancelar a exclusao — por desenho, entra no 45-08",
    "status": "fixed",
    "reason": "AlertDialog de confirmacao e cancelamento existem (useCancelarExclusao, ExcluirDadosBloco.tsx:44/72); caminho exercitado ponta a ponta em PROD com a T2 (§7.23 — pedida e cancelada na janela). O comentario obsoleto que dizia «entram no 45-08» tambem foi corrigido.",
    "recorded_at": "2026-08-05T07:23:32.364Z",
    "resolved_at": "2026-09-07T00:08:07.464Z"
  },
  {
    "id": 13,
    "kind": "deviation",
    "phase": "45",
    "file": "src/__tests__/copyPortoesLgpd.test.ts",
    "line": null,
    "description": "O portao do CONSOL-04 ficou VERDE por falso positivo: a sonda casa substring em comentario. Promessa continua orfa; exige decisao do operador",
    "status": "fixed",
    "reason": "O portao do CONSOL-04 foi REESCRITO para medir o disco de verdade («MENCAO nao conta como execucao»); o motor existe (45-07/45-10 pousaram) e a suite esta verde — o falso positivo por substring em comentario nao existe mais.",
    "recorded_at": "2026-08-05T07:23:32.425Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 14,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/functions/executar-direito-titular/index.ts",
    "line": 377,
    "description": "DI-45-07-01: a EF chama as RPCs com service_role sem repassar o Authorization do titular; auth.uid() e NULL e o guard das RPCs ja aplicadas em PROD recusa com 42501 — nenhum pedido de exclusao seria registrado. Fecha no 45-10.",
    "status": "fixed",
    "reason": "A EF tem hoje o client `supabaseTitular` (service key + Authorization do titular) para as QUATRO chamadas de RPC; auth.uid() deixa de ser NULL. 45-VERIFICATION: motor exercitado em PROD ponta a ponta pela EF com o JWT do titular.",
    "recorded_at": "2026-08-05T23:11:21.892Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 15,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/migrations/20260805000006_p45_anonimizar_candidato.sql",
    "line": null,
    "description": "Os DO blocks de auto-verificacao das 3 migrations do 45-07 so EXECUTAM no apply, que e do 45-11 atras do portao destrutivo. Ate la a verificacao e estatica (forma), nao por execucao.",
    "status": "fixed",
    "reason": "As 3 migrations do 45-07 estao aplicadas (20260805000006/7/8 em schema_migrations) — a verificacao deixou de ser estatica e passou a ser por execucao.",
    "recorded_at": "2026-08-05T23:11:21.947Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 16,
    "kind": "deviation",
    "phase": "45",
    "file": "src/features/privacidade/components/ConfirmarExclusaoDialog.tsx",
    "line": null,
    "description": "45-08: portao RED do TDD verificado por execucao, nao por commit isolado — o gate tsc (baseline 97) reprova um teste que importa modulo ainda inexistente, e --no-verify e proibido",
    "status": "fixed",
    "reason": "Janela de PROCESSO do TDD; a fase fechou com VERIFICATION PASSA e criterio 4 «zero --no-verify em toda a fase».",
    "recorded_at": "2026-08-05T23:44:28.940Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 17,
    "kind": "stub",
    "phase": "45",
    "file": "src/features/vagas/hooks/useRetirarCandidatura.ts",
    "line": null,
    "description": "O hook invoca a EF executar-direito-titular com acao 'retirar_candidatura', mas o vocabulario FECHADO dela e ACOES={pedir,cancelar} (index.ts:137). O caminho do candidato NAO funciona ate o 45-10 acrescentar a acao e repassar as claims do titular (DI-45-07-01).",
    "status": "fixed",
    "reason": "ACOES da EF inclui 'retirar_candidatura' (executar-direito-titular/index.ts:263) — o vocabulario fechado foi ampliado no 45-10.",
    "recorded_at": "2026-08-06T05:00:05.428Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 18,
    "kind": "todo",
    "phase": "45",
    "file": "src/features/triagem/services/triagemService.ts",
    "line": null,
    "description": "Ponte de tipos (Pitfall 10) porque v_triagem_panel em database.types.ts ainda nao expoe encerrada_a_pedido_em. REMOVER apos o apply da migration 20260805000008 pelo 45-11 e npm run db:types.",
    "status": "fixed",
    "reason": "db:types confirmou listar_historico_candidatura e v_triagem_panel.encerrada_a_pedido_em nos tipos; `as never` removido e o compilador agora CHECA a chamada. tsc 90 (baseline 96), zero erro no arquivo. Commit desta sessao.",
    "recorded_at": "2026-08-06T05:00:05.483Z",
    "resolved_at": "2026-09-07T00:08:07.122Z"
  },
  {
    "id": 19,
    "kind": "unrun-verify",
    "phase": "45",
    "file": "supabase/migrations/20260805000007_p45_retirada_e_evento.sql",
    "line": null,
    "description": "As duas migrations do plano foram AUTORADAS e nao aplicadas (por desenho: quem aplica e o 45-11). Os blocos DO de auto-verificacao, o gate de md5 do BLOCO G e o caminho ponta a ponta so sao exercitados no apply.",
    "status": "fixed",
    "reason": "Migrations 20260805000007 e ...0008 presentes em schema_migrations; o caminho ponta a ponta foi exercitado (45-VERIFICATION).",
    "recorded_at": "2026-08-06T05:00:05.540Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 20,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/functions/executar-direito-titular/index.ts",
    "line": null,
    "description": "DI-45-10-01: as 4 chamadas de RPC usam supabaseAdmin sem repassar o Authorization do titular; auth.uid() e NULL e as RPCs recusam com 42501 — o motor nao roda ponta a ponta",
    "status": "fixed",
    "reason": "Idem 14 — as chamadas passaram para supabaseTitular, com o Authorization do titular repassado.",
    "recorded_at": "2026-08-06T15:22:17.025Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 21,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/functions/executar-direito-titular/index.ts",
    "line": null,
    "description": "DI-45-10-02: ACOES nao conhece 'retirar_candidatura' e o hook do 45-09 invoca a EF com essa acao — 400 VALIDATION traduzido para SERVER_ERROR na tela",
    "status": "fixed",
    "reason": "Idem 17 — 'retirar_candidatura' entrou no vocabulario da EF.",
    "recorded_at": "2026-08-06T15:22:17.081Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 22,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/tests/p45_motor_exclusao_smoke.sql",
    "line": null,
    "description": "C1 exige que gerar_bias_snapshot nao conceda EXECUTE a authenticated, mas 20260805000003 o concede deliberadamente (chamador vivo: biasAuditService.ts:98) — DI-45-12-01, decisao do code review bloqueante do 45-11",
    "status": "waived",
    "reason": "O GRANT de EXECUTE a `authenticated` em gerar_bias_snapshot e DELIBERADO — chamador vivo em biasAuditService.ts:98, e o CLAUDE.md registra que os grants deste projeto foram raciocinados caso a caso («o GRANT do CR-02 nao deve ser revogado»). Medido em PROD em 2026-09-06: authenticated=X/postgres. Quem esta desalinhado com a decisao e a assercao C1 do smoke, nao o banco. Waived em 2026-09-06.",
    "recorded_at": "2026-08-06T17:15:24.030Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 23,
    "kind": "deviation",
    "phase": "45",
    "file": "src/features/vagas/components/RetirarCandidaturaAcao.tsx",
    "line": null,
    "description": "copy generica para a recusa NAO_RETIRAVEL: o hook traduz, o componente nao ramifica — DI-45-12-02",
    "status": "fixed",
    "reason": "Componente passa a ramificar NAO_RETIRAVEL com copy nao-retryable (o hook ja traduzia desde DI-45-12-01; era so a tela). Portao (h) com 3 sondas, PROVADO QUE MORDE: revertido o conserto, (h1) reprova.",
    "recorded_at": "2026-08-06T17:15:24.086Z",
    "resolved_at": "2026-09-07T00:08:07.292Z"
  },
  {
    "id": 24,
    "kind": "unrun-verify",
    "phase": "47",
    "file": "supabase/tests/p47_historico_smoke.sql",
    "line": null,
    "description": "smoke do CONSOL-02 escrito e NAO executado: exige o apply da migration 20260809000001, que e checkpoint do orquestrador",
    "status": "fixed",
    "reason": "smoke rodou 6/6 em PROD em 2026-08-13 e de novo em 2026-08-23 (47-VERIFICATION, confirmado pelo catalogo)",
    "recorded_at": "2026-08-09T21:55:43.981Z",
    "resolved_at": "2026-09-05T23:30:00.000Z"
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
    "status": "waived",
    "reason": "DECISAO-ENCARREGADO.md (2026-08-13) nomeia esta janela no proprio frontmatter («fecha: WINDOWS.md 26, 29, 30, 31»). Nao havera parecer de Encarregado; a aprovacao do operador de 2026-08-11 e a decisao FINAL. Waived em 2026-09-06.",
    "recorded_at": "2026-08-09T23:11:20.359Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 27,
    "kind": "todo",
    "phase": "47",
    "file": "src/features/hub-candidato/services/historicoCandidaturaService.ts",
    "line": null,
    "description": "as never pre-regen na chamada de listar_historico_candidatura — remover apos npm run db:types",
    "status": "fixed",
    "reason": "Idem 18 — a chamada de listar_historico_candidatura ficou totalmente tipada, sem cast.",
    "recorded_at": "2026-08-10T12:55:37.934Z",
    "resolved_at": "2026-09-07T00:08:07.209Z"
  },
  {
    "id": 28,
    "kind": "unrun-verify",
    "phase": "47",
    "file": ".planning/phases/47-transpar-ncia-consolida-o/47-08-PLAN.md",
    "line": null,
    "description": "47-08 Task 3 (montagem do RodapePublico nas cinco superficies) nao executada: bloqueada pelo portao de PUBLICACAO do Encarregado, que segue aberto",
    "status": "fixed",
    "reason": "RodapePublico montado nas 5 superficies (codigo) e o portao do Encarregado fechou por DECISAO-ENCARREGADO.md (2026-08-13)",
    "recorded_at": "2026-08-11T03:53:04.434Z",
    "resolved_at": "2026-09-05T23:30:00.000Z"
  },
  {
    "id": 29,
    "kind": "deviation",
    "phase": "47",
    "file": "src/__tests__/destinosDeRedeComFicha.test.ts",
    "line": null,
    "description": "api.ipify.org e www.youtube.com: destinos vivos fora da lista publicada de empresas contratadas, registrados como pendente-de-decisao com fato medido e rota — a classificacao e ato do Encarregado, no portao de publicacao aberto do 47-08",
    "status": "fixed",
    "reason": "api.ipify.org e youtube ELIMINADOS em vez de declarados (03909dd, 2026-08-13); zero pendente-de-decisao restam",
    "recorded_at": "2026-08-11T04:17:17.358Z",
    "resolved_at": "2026-09-05T23:30:00.000Z"
  },
  {
    "id": 30,
    "kind": "unmet-truth",
    "phase": "47",
    "file": "src/features/transparencia/components/PrivacidadePublicaPage.tsx",
    "line": null,
    "description": "Revisao formal do Encarregado NAO exercida: as duas paginas publicas foram liberadas por decisao do operador em 2026-08-11",
    "status": "waived",
    "reason": "DECISAO-ENCARREGADO.md (2026-08-13), idem — a janela pedia uma revisao formal que a decisao registrada eliminou. «Uma decisao registrada fecha; uma decisao nao tomada apodrece.» Waived em 2026-09-06.",
    "recorded_at": "2026-08-11T04:28:51.767Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 31,
    "kind": "unmet-truth",
    "phase": "47",
    "file": "src/services/logAccessService.ts",
    "line": 110,
    "description": "api.ipify.org pendente-de-decisao: destino de rede sem ficha publicada nem classificacao do Encarregado, com a lista ja publicada",
    "status": "fixed",
    "reason": "api.ipify.org eliminado; IP passa a ser preenchido pelo trigger trg_preencher_ip_logs_acesso (migration 20260813000001 aplicada)",
    "recorded_at": "2026-08-11T04:28:51.827Z",
    "resolved_at": "2026-09-05T23:30:00.000Z"
  },
  {
    "id": 32,
    "kind": "unmet-truth",
    "phase": "47",
    "file": "src/components/pages/InstrucoesFormularioPage.tsx",
    "line": 77,
    "description": "www.youtube.com pendente-de-decisao: iframe de terceiro sem ficha publicada nem classificacao do Encarregado, com a lista ja publicada",
    "status": "fixed",
    "reason": "iframe do YouTube eliminado da InstrucoesFormularioPage (03909dd)",
    "recorded_at": "2026-08-11T04:28:51.886Z",
    "resolved_at": "2026-09-05T23:30:00.000Z"
  },
  {
    "id": 33,
    "kind": "deviation",
    "phase": "45",
    "file": "supabase/functions/executar-direito-titular/index.ts",
    "line": null,
    "description": "NW-03 alargou: causa='falha_storage' cobre 10 classes nomeadas mais carimbo e excecao (DI-45-16-01)",
    "status": "waived",
    "reason": "Desvio DECLARADO POR ESCRITO no docblock da EF (NW-03 / DI-45-16-01): causa='falha_storage' cobre 10 classes nomeadas mais carimbo e excecao. Comportamento conhecido, documentado e aceito. Waived em 2026-09-06.",
    "recorded_at": "2026-08-12T01:30:33.120Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 34,
    "kind": "stub",
    "phase": "46",
    "file": "supabase/migrations/20260823000004_p46_sweep_tracer.sql",
    "line": null,
    "description": "varrer_purga_retencao nao chama anonimizar_candidato: laco e subtransacao no formato final, chamada ausente ate o 46-04 (D-46-18/D-46-24)",
    "status": "fixed",
    "reason": "MEDIDO NO VIVO em 2026-09-06: pg_get_functiondef(public.varrer_purga_retencao) em PROD contem `anonimizar_candidato` — a chamada ausente foi acrescentada pelo 46-04.",
    "recorded_at": "2026-08-22T23:07:37.543Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 35,
    "kind": "stub",
    "phase": "46",
    "file": "supabase/tests/p42_invent05_cron_smoke.sql",
    "line": null,
    "description": "assercao (a) fixa cron.job em 3 com mensagem de diagnostico falso para o 4o job legitimo — emenda de D-46-23 pendente no 46-06",
    "status": "fixed",
    "reason": "Assercao (a) reescrita: inventario por PERTENCIMENTO A CONJUNTO (array c_herdados + contagem propria do job de purga) em vez de `count(*) <> 3`. O diagnostico falso para o 4o job legitimo nao existe mais.",
    "recorded_at": "2026-08-22T23:07:37.606Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 36,
    "kind": "unrun-verify",
    "phase": "46",
    "file": "supabase/tests/p46_purga_smoke.sql",
    "line": null,
    "description": "46-03: as 5 assercoes (j.1)(j.2)(j.3)(k)(l) foram escritas mas NAO executadas — apply e execucao dependem do checkpoint bloqueante da Task 3",
    "status": "fixed",
    "reason": "Fechada em 2026-08-22 pelo checkpoint da Task 3 do 46-03 sem razao escrita; preenchida em 2026-09-06 por evidencia: o 46-VERIFICATION lista as assercoes (j.1)(j.2)(j.3)(k)(l) como «rodou», e a (m) rodou a varredura em `live` dentro do envelope, medindo o despacho.",
    "recorded_at": "2026-08-22T23:35:12.424Z",
    "resolved_at": "2026-08-22T23:41:17.172Z"
  },
  {
    "id": 37,
    "kind": "unrun-verify",
    "phase": "46",
    "file": "supabase/migrations/20260823000005_p46_retencao_hold_e_excecoes.sql",
    "line": null,
    "description": "46-03: migration commitada mas NAO aplicada em PROD — retencao_hold, a linha de hold da fixture e as duas excecoes do predicado nao existem no banco ate o checkpoint da Task 3",
    "status": "fixed",
    "reason": "Idem: fechada em 2026-08-22 sem razao escrita. Preenchida em 2026-09-06 por evidencia direta — a migration 20260823000005 esta em supabase_migrations.schema_migrations, logo retencao_hold, a linha de hold da fixture e as duas excecoes do predicado existem no banco.",
    "recorded_at": "2026-08-22T23:35:17.092Z",
    "resolved_at": "2026-08-22T23:41:17.237Z"
  },
  {
    "id": 38,
    "kind": "unrun-verify",
    "phase": "46",
    "file": "supabase/tests/p46_purga_smoke.sql",
    "line": null,
    "description": "Assercoes (b) e (o) escritas e commitadas mas NAO EXECUTADAS: nada foi aplicado em PROD e o Blocker B-02 (guard proprio de plano_exclusao_titular) as faria reprovar",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-23T00:13:52.635Z",
    "resolved_at": null
  },
  {
    "id": 39,
    "kind": "deviation",
    "phase": "46",
    "file": "supabase/migrations/20260805000005_p45_plano_e_dry_run.sql",
    "line": 208,
    "description": "B-02: guard de plano_exclusao_titular recusa chamador sem sessao; D-46-18 e incompleto e PURGA-02 nao fecha ate a decisao do operador",
    "status": "fixed",
    "reason": "Blocker B-02 fechado pela migration 20260823000008 (3o ramo de plano_exclusao_titular, «nas DUAS metades» — 46-04-SUMMARY), aplicada em PROD.",
    "recorded_at": "2026-08-23T00:13:52.699Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 40,
    "kind": "deviation",
    "phase": "46",
    "file": "supabase/migrations/20260823000006_p46_guard_purga.sql",
    "line": null,
    "description": "BL-01/BL-02 do code review: dois defeitos que teriam ido a PROD (revogacao do EXECUTE do titular; ramo nao correlacionado com o chamador). Consertados, mas exigem NOVA rodada de review antes do apply",
    "status": "waived",
    "reason": "O que a janela pede JA PASSOU: os consertos BL-01/BL-02 foram aplicados e a nova rodada de review antes do apply nao ocorreu. Isso esta registrado com honestidade no 46-VERIFICATION como criterio 2 = 0,5, «VIOLADO em 4 de 8 applies» — o custo esta contabilizado no portao de fase destrutiva, que fechou 3,5/5. A janela nao tem conserto pendente; fica como registro, nao como pendencia. Waived em 2026-09-06.",
    "recorded_at": "2026-08-23T01:05:41.126Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 41,
    "kind": "deviation",
    "phase": "46",
    "file": "supabase/functions/purgar-retencao/index.ts",
    "line": null,
    "description": "Titular sem candidatos.user_id: Storage e Auth ficam nao_aplicavel e objetos sob o antigo prefixo, se existirem, permanecem — nao ha caminho relacional do candidato ate os objetos dele (SONDA 2). Propriedade pre-existente do sistema, declarada por escrito no docblock",
    "status": "waived",
    "reason": "Propriedade PRE-EXISTENTE do sistema, nao introduzida pela fase: sem candidatos.user_id nao ha caminho relacional do titular ate os objetos dele no Storage (SONDA 2). Declarada por escrito no docblock da EF. Fechar exigiria um modelo de dados diferente, que nao esta no escopo do M8. Waived em 2026-09-06.",
    "recorded_at": "2026-08-23T03:46:13.782Z",
    "resolved_at": "2026-09-06T21:10:00.000Z"
  },
  {
    "id": 42,
    "kind": "unrun-verify",
    "phase": "46",
    "file": "supabase/tests/p46_purga_smoke.sql",
    "line": null,
    "description": "As cinco assercoes (q.1)-(q.5) do 46-05 nunca foram executadas contra Postgres: esta maquina nao tem instancia local. Rodar no checkpoint da Task 4; se reprovarem, medir o portao antes de acreditar na explicacao",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-23T03:46:13.859Z",
    "resolved_at": null
  },
  {
    "id": 43,
    "kind": "deviation",
    "phase": "46",
    "file": "CLAUDE.md",
    "line": null,
    "description": "A varredura por FORMA da secao Portoes nao cobre 'IS DISTINCT FROM <n>', que e o idioma dominante do p46_purga_smoke.sql — um padrao de varredura que nao enxerga o idioma do arquivo que ele vigia tem ponto cego",
    "status": "fixed",
    "reason": "Padrao de varredura do CLAUDE.md estendido para `IS DISTINCT FROM <n>` e listas literais proname/jobname/relname IN. Medido: 244 achados contra 164 do padrao antigo, sem perder NENHUMA das 164.",
    "recorded_at": "2026-08-23T03:46:13.935Z",
    "resolved_at": "2026-09-07T00:08:07.379Z"
  },
  {
    "id": 44,
    "kind": "deviation",
    "phase": "49",
    "file": "supabase/migrations/20260922000002_p49_colunas_proveniencia_e_analise.sql",
    "line": null,
    "description": "As 16 colunas novas ficam SEM veredito de export até o plano 49-17 (o drift 05-export-allowlist-drift.sql as acusa); não saem na cópia porque ela é allowlist, mas o checklist D-57 itens 3-9 está aberto",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T20:26:36.921Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 45,
    "kind": "unrun-verify",
    "phase": "49",
    "file": "supabase/tests",
    "line": null,
    "description": "O enum llm_provider e as 16 colunas novas nascem sem nenhum smoke vigiando; entrevista_guias e entrevista_analises não são citadas por NENHUM arquivo de supabase/tests/. Vigilância entra no p49_prova_prod.sql (plano 49-18)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T20:26:37.024Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 46,
    "kind": "unrun-verify",
    "phase": "49",
    "file": "supabase/functions/resend-webhook/__tests__/resend-webhook.test.ts",
    "line": null,
    "description": "O verify #2 do 49-02 (find supabase/functions -name '*.test.ts' | grep -v strict-schema | xargs deno test) NAO roda como escrito: resend-webhook.test.ts falha na resolucao de npm:svix@1.99.1 (ausente no node_modules). Pre-existente, sem relacao com a Phase 49. Medido excluindo tambem resend-webhook: 609 passed / 0 failed.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T21:17:37.115Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 47,
    "kind": "deviation",
    "phase": "49",
    "file": "supabase/functions/_shared/ai-client.ts",
    "line": null,
    "description": "interview_guide a 89% do timeout: maior latencia medida 98363 ms contra teto de 110 s; a 45 tok/s o teto por TEMPO e ~4950 tokens, mas max_tokens esta em 8000. Risco P1 de 'demorou' registrado, NAO consertado (Deferred do 49-02).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T21:17:37.198Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 48,
    "kind": "deviation",
    "phase": "49",
    "file": "supabase/functions/_shared/ai-client.ts",
    "line": null,
    "description": "OPENAI_FALLBACK_MODEL segue hardcoded ('gpt-4o-mini') e o parametro fallback_model_id do ResolvedPrompt continua ignorado pelas EFs. P1 registrado no 49-02, fora do escopo dele.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T21:17:37.287Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 49,
    "kind": "deviation",
    "phase": "49",
    "file": "src/components/__tests__/KanbanBoard.test.tsx",
    "line": null,
    "description": "49-05: menu Radix não abre no happy-dom; exigiu 3 mocks (dropdown-menu + os 2 diálogos que ele passaria a montar sem QueryClientProvider)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T23:00:36.248Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 50,
    "kind": "deviation",
    "phase": "49",
    "file": "supabase/functions/_shared/comparativo-config.ts",
    "line": null,
    "description": "O teto COMPARATIVO_MAX_CANDIDATOS=4 repousa em aritmética (80 s x 45 tok/s = 3600 tok; n=4 = 3140 tok estimados), nao em medicao: a premissa A3 (P ~ 280-410 tok/candidato) e MEDIDA pela prova n=4 do plano 49-18. Se a saida real passar de 3140 tok, o teto volta ao operador antes de fechar a fase (D-59).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T00:11:20.528Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 51,
    "kind": "deviation",
    "phase": "49",
    "file": ".planning/phases/49-consertos-da-jornada-bloco-2/49-08-PLAN.md",
    "line": null,
    "description": "Dois <verify> do 49-08 embutem uma ESCRITA no comando de verificacao (p46apply.cjs migrate; efdeploy.cjs sem --dry-run). Nao sao re-rodaveis: o primeiro sai nao-zero por desenho (version ja no ledger), o segundo criaria uma version de EF identica. Um portao que nao se pode re-rodar so morde uma vez.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T00:11:20.613Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 52,
    "kind": "deviation",
    "phase": "49",
    "file": "src/features/triagem/components/RedacaoReviewPanel.tsx",
    "line": 47,
    "description": "49-09 deployou a EF v15 avaliando a redacao pela BARS (D1 Especificidade, D2 Acao, D3 Aprendizado, D4 Alinhamento), mas a tela do RH (RedacaoReviewPanel.tsx:47 e RedacaoOverrideForm.tsx:45) rotula D1-D4 como os 4 valores BS (Experiencia UAU, Inovacao, Atitude de Dono, Sede de Crescimento). Toda redacao avaliada entre este deploy e o plano 49-15 aparece com o rotulo ERRADO: o numero e da especificidade da situacao e a tela diz Experiencia UAU. O 49-15 importa a mesma constante e fecha (D-25).",
    "status": "fixed",
    "reason": "49-15: as duas telas passaram a importar DIMENSOES_REDACAO de _shared/bars-redacao.ts — a MESMA constante que a EF v15 envia ao modelo — e resolvem o rotulo PELA CHAVE devolvida, nunca por posicao; os mapas proprios (DIM_LABEL :47 e DIMENSOES :45, com os 4 valores BS) sairam. Provado por assercoes que ITERAM sobre a constante (sem lista literal de rotulos — a forma que nao envelhece) e por 8 mutacoes que mordem, entre elas o retorno do mapa proprio (25 reprovados) e a leitura por POSICAO do dimension_scores (4 reprovados, exatamente os 4 de ordem trocada). Marcador redacao-rubrica-versao-antiga lido de volta de rh.beautysmile.com.br, no chunk lazy RedacaoReviewPanel-D4O1GT-q.js. ACHADO EXTRA do mesmo conserto, medido em PROD: analise_ia.reasoning e analise_ia.citacoes, que a tela lia, NAO EXISTEM no JSONB (false nas 2 linhas vivas), enquanto dimension_scores[].reasoning e .cited_evidence existem (true nas duas) — o raciocinio da IA nunca chegou ao RH, e agora chega, por dimensao.",
    "recorded_at": "2026-09-23T00:40:21.953Z",
    "resolved_at": "2026-09-23T13:01:33.905Z",
    "milestone": "v8.0"
  },
  {
    "id": 53,
    "kind": "unrun-verify",
    "phase": "49",
    "file": ".planning/phases/49-consertos-da-jornada-bloco-2/49-09-PLAN.md",
    "line": null,
    "description": "O <verify> #3 do 49-09 embute uma ESCRITA no comando de verificacao (node efdeploy.cjs sem --dry-run). Nao e re-rodavel: repeti-lo criaria uma version 16 identica a 15, poluindo o historico de deploy para nao provar nada novo. Re-verificado pelo RESULTADO (version=15/ACTIVE/verify_jwt=true lida de volta da Management API + os marcadores lidos do bundle vivo). Mesma familia da WINDOWS 51 (49-08); e a segunda ocorrencia da fase.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T00:40:22.050Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 54,
    "kind": "deviation",
    "phase": "49",
    "file": "supabase/functions/_shared/bars-redacao.ts",
    "line": null,
    "description": "A rubrica BARS entra no input com 8476 octetos (~2037 tok, medido) de ancoras, em bloco cacheado (cache_control ephemeral). O culture_fit_essay tem max_tokens 2500 e a maior saida medida foi 1253 tok (50%). O bloco novo alonga o PEDIDO, nao necessariamente a saida, mas a saida real sob a rubrica nova nao foi medida: nenhuma redacao foi avaliada pela v15 ainda. A prova de saida real e do plano 49-18 (premissa C9). Registrado, nao consertado: mexer no max_tokens sem medir e consertar o parametro errado.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T00:40:22.138Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 55,
    "kind": "unrun-verify",
    "phase": "49",
    "file": ".planning/phases/49-consertos-da-jornada-bloco-2/49-23-PLAN.md",
    "line": null,
    "description": "O <verify> #3 do 49-23 embute duas ESCRITAS no comando de verificacao (node efdeploy.cjs sem --dry-run, e um segundo deploy no encadeamento). Nao e re-rodavel: repeti-lo criaria uma version 22 identica a 21. Re-verificado pelo RESULTADO (version=21/ACTIVE/verify_jwt=true relidos da Management API + o marcador dimensao_desconhecida=3 lido do bundle vivo + origin/main..HEAD vazio) e pelas partes re-rodaveis (--dry-run com sjt-rubrica.ts no fechamento). TERCEIRA ocorrencia da fase (WINDOWS 51 do 49-08, 53 do 49-09).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T01:16:21.597Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 56,
    "kind": "deviation",
    "phase": "49",
    "file": "src/features/avaliacao/components/ScorecardAvaliacao.tsx",
    "line": null,
    "description": "A EF avaliar-redacao (v21) passou a gravar em scores_candidato.metadata o motivo da revisao humana (motivos_revisao) e os nomes que a IA inventou (dimensoes_desconhecidas), mas NENHUMA tela le esses campos: CasoAbertoMetadata em scoresRhService.ts:62-66 declara somente dimension_scores e composite_0_25. Consequencia: uma SJT que foi para revisao porque a IA inventou o nome da dimensao aparece ao RH como qualquer outra pendente_humano. E o irmao SJT do D-25/WINDOWS 52 (a tela da redacao). Nao consertado aqui: o front e de quem o toca (D-55).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T01:16:21.687Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 57,
    "kind": "deviation",
    "phase": "49",
    "file": "supabase/functions/_shared/sjt-rubrica.ts",
    "line": null,
    "description": "O bloco da rubrica SJT tem 5330 octetos (~1281 tok, 59 linhas) contra os 42 octetos do bloco antigo (Vaga: <uuid>) — 127x. O work_sample_sjt tem max_tokens 3000 e NUNCA teve chamada Sonnet logada (C9: 0 linhas em ai_call_logs), entao nao existe saida medida para comparar. max_tokens e teto de SAIDA e o bloco alonga o PEDIDO, mas o efeito de uma rubrica rica sobre o tamanho do campo reasoning por dimensao nao esta medido nesta EF. Irmao da WINDOWS 54 (redacao). A prova e do 49-18; mexer no teto sem medir e consertar o parametro errado.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T01:16:21.778Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 58,
    "kind": "deviation",
    "phase": "49",
    "file": "supabase/functions/avaliar-redacao/index.ts",
    "line": null,
    "description": "A unica SJT de caso aberto ja avaliada em PROD (scores_candidato 8acf3c98) segue com score 7,00 — media UNIFORME sobre 5 dimensoes que a IA inventou —, sem provedor_ia/modelo_ia e sem motivos_revisao. Sem reescrita retroativa (D-30/D-26): a rubrica que a avaliou nao existia no input, entao nao ha nota correta a recalcular, e inventar uma seria pior que registrar que ela nao e confiavel. Fica como marco historico, igual as 2 redacoes do 49-09.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T01:16:21.871Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 59,
    "kind": "unrun-verify",
    "phase": "49",
    "file": ".planning/phases/49-consertos-da-jornada-bloco-2/49-24-PLAN.md",
    "line": null,
    "description": "O <verify> #2 do 49-24 encadeia `node efdeploy.cjs` SEM --dry-run: re-rodá-lo cria uma version 19 idêntica à 18 para não provar nada novo. Re-verificado pelo RESULTADO (version/status/verify_jwt/import_map relidos da Management API + marcadores do bundle vivo + --dry-run re-rodável). QUARTA ocorrência da fase (51, 53, 55).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T01:40:02.218Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 60,
    "kind": "stub",
    "phase": "49",
    "file": "supabase/functions/gerar-guia-entrevista/index.ts",
    "line": 340,
    "description": "Teto de custo diário estourado: callAi devolve parsed={recommendation:'hold'} (não-null), então persistFlags fica VAZIO e a EF persiste um guia com 0 perguntas e nenhuma flag, devolvendo {ok:true}. Um roteiro barrado por gasto é indistinguível de um roteiro vazio bem-sucedido. MEDIDO pelo teste novo do 49-24 (needs_human=false no log). Proveniência NULL/NULL é honesta mas conflate com os 5 guias legados. Fora do escopo do 49-24 (proveniência); o conserto é a flag.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-23T01:40:15.497Z",
    "resolved_at": "2026-09-23T04:41:36.084Z",
    "milestone": "v8.0"
  },
  {
    "id": 61,
    "kind": "unmet-truth",
    "phase": "49",
    "file": "src/features/entrevista/components/GuiaEntrevistaPanel.tsx",
    "line": null,
    "description": "entrevista_guias.provedor_ia/.modelo_ia estão GRAVADOS (49-24, EF v18 em PROD) e NENHUMA tela os lê. O selo de proveniência do guia é o 49-16 (D-55). Irmão do WINDOWS 56 (o mesmo para scores_candidato.metadata do SJT): melhor que não estar gravado, e ainda não é o conserto.",
    "status": "fixed",
    "reason": "49-16: o selo de proveniencia (ProvenienciaIABadge, 49-13) passa a ser renderizado ao lado do titulo do Guia STAR/PEI, lendo provedor_ia/modelo_ia da linha — e a ENTREVISTA_GUIA_ALLOWLIST ganhou as duas colunas, porque sem projeta-las o componente nao tinha de onde ler (o dado estava gravado e a leitura do front nao o pedia). Renderizado SO quando existe roteiro: um resultado que nao existe nao tem proveniencia. modelo_ia NULL vira «modelo nao registrado» (D-30), nunca silencio — e esse e o estado das 5 linhas vivas de entrevista_guias medidas em 2026-09-23, que omitir o selo faria parecer identicas a um roteiro com proveniencia confirmada. Provado por 4 testes novos em GuiaEntrevistaPanel.test.tsx (openai = contingencia; anthropic = neutro; NULL = modelo nao registrado; sem guia = sem selo), medidos em RED antes (3 reprovados por «Unable to find [data-testid=proveniencia-ia-badge]») e verdes depois. Publicado: proveniencia-ia-badge conferido no chunk lazy ProvenienciaIABadge-DUdFjuJR.js e LIDO DE VOLTA do site vivo. O irmao WINDOWS 56 (motivos_revisao/dimensoes_desconhecidas do SJT) NAO e deste plano — o operador o roteou para o 49-17 — e segue aberto.",
    "recorded_at": "2026-09-23T01:40:15.620Z",
    "resolved_at": "2026-09-23T13:34:06.380Z",
    "milestone": "v8.0"
  },
  {
    "id": 62,
    "kind": "unrun-verify",
    "phase": "49",
    "file": "supabase/migrations/20260922000008_p49_revisao_entrevista_vigente.sql",
    "line": null,
    "description": "49-10: a migration nao e re-executavel — o PRE-PORTAO pina os md5 ANTIGOS de salvar_avaliacao_entrevista/confirmar_revisao_entrevista e os vivos agora sao os novos (2b567aaa..., 43df21b8...). O <verify> do ensaio foi re-executado por EQUIVALENCIA (md5 do ledger + pos-portao lido do catalogo). E o portao funcionando, nao defeito; registrado para quem redefinir estas funcoes depois.",
    "status": "waived",
    "reason": "Nao e defeito, e uma PROPRIEDADE do pre-portao por md5: ele recusa sobrescrever um corpo que nao mediu, entao a 20260922000008 deixa de ser re-executavel no instante em que e aplicada com sucesso. O <verify> foi re-executado por EQUIVALENCIA (md5 do ledger conferido por leitura de volta + as 8 assercoes do pos-portao lidas do catalogo), e os md5 NOVOS estao tabelados no 49-10-SUMMARY para quem redefinir estas funcoes depois. O irmao 49-01 atravessou a mesma situacao (Deviation 2). Mantido no ledger como registro, dispensado do portao de ship; reverter para open e decisao do operador.",
    "recorded_at": "2026-09-23T03:19:19.971Z",
    "resolved_at": "2026-09-23T03:23:16.705Z",
    "milestone": "v8.0"
  },
  {
    "id": 63,
    "kind": "deviation",
    "phase": "49",
    "file": ".planning/phases/49-consertos-da-jornada-bloco-2/49-10-SUMMARY.md",
    "line": null,
    "description": "49-10: git push origin main NEGADO pelo ambiente. 2 migrations em PROD + EF v17 no ar com os commits NAO ENVIADOS (modo de falha do CLAUDE.md sobre os dois canais). Acao do operador: push + conferir origin/main..HEAD vazio.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-23T03:19:20.062Z",
    "resolved_at": "2026-09-23T03:22:32.029Z",
    "milestone": "v8.0"
  },
  {
    "id": 64,
    "kind": "stub",
    "phase": "49",
    "file": "supabase/functions/gerar-guia-entrevista/index.ts",
    "line": 385,
    "description": "49-25: persistFlags (inclusive weak_dim_uncovered, do Pitfall 4 / ENTREV-01) e COMPUTADO e depois DESCARTADO quando existe roteiro: o upsert grava flags apenas no ramo { incompleto: true, ... }. Logo um roteiro que, DEPOIS do re-prompt, ainda deixa uma dimensao fraca descoberta e persistido SEM nenhuma flag, enquanto o docblock da EF afirma que ele 'persiste o roteiro com flag para humano'. O rastro de runtime diz needs_human: true e a linha nao diz nada. Conserto: acrescentar flags ao ramo do roteiro existente. Fora de escopo do 49-25 (defeito PRE-EXISTENTE, requisito ENTREV-01 e nao JORN-39, e muda a forma do guia no caminho de sucesso, que o 49-16 le). O 49-16 PRECISA disto: sem ele o selo nunca vera weak_dim_uncovered.",
    "status": "fixed",
    "reason": "49-26: flags passa a chegar ao upsert TAMBEM no caminho de sucesso (spread flagsDoRoteiro no ramo do roteiro), com a chave AUSENTE quando nao ha nada a sinalizar — um array vazio explicito sob onConflict apagaria a flag da execucao anterior. O docblock da EF passou a descrever o comportamento real. Provado por 2 testes novos (roteiro com dimensao fraca descoberta grava weak_dim_uncovered; sem flag a chave nao nasce) e por 2 mutacoes que mordem (M1 remove o spread = 1 reprovado; M2 grava array vazio sempre = 1 reprovado). EF gerar-guia-entrevista version=21 ACTIVE em PROD, marcadores conferidos no bundle VIVO. PROD medido: 0 linhas de entrevista_guias no estado defeituoso — defeito latente, nada retroativo.",
    "recorded_at": "2026-09-23T04:40:06.094Z",
    "resolved_at": "2026-09-23T05:56:52.179Z",
    "milestone": "v8.0"
  },
  {
    "id": 65,
    "kind": "stub",
    "phase": "49",
    "file": "supabase/functions/avaliar-transcricao-entrevista/index.ts",
    "line": 377,
    "description": "49-25: MESMA FORMA do defeito que o 49-25 consertou em gerar-guia-entrevista (WINDOWS 60), medida pela varredura do <measure_first> item 4. A guarda e 'parsed == null || error_code === <codigo de injecao>' e NAO olha o provedor nem flagged_for_human_review. Com o teto diario de custo (AI-06) estourado, callAi devolve parsed NAO nulo com error_code cost_cap_exceeded: a guarda da falso, a EF cai no caminho de sucesso e grava a analise como status_analise pendente_humano com competencias vazias — indistinguivel de uma analise real esperando revisao humana. As outras tres irmas (analise-candidato-individual, avaliar-redacao, avaliar-redacao-cultural) estao cobertas porque tambem testam flagged_for_human_review === true; esta e a unica que nao. NAO consertado aqui (Scope Boundary: EF de outro plano; as sete EFs compartilham _shared e um segundo sitio pede plano proprio). Conserto: a mesma pergunta pelo PROVEDOR.",
    "status": "fixed",
    "reason": "49-26: a guarda de never-absent passa a fazer as DUAS perguntas — algumProvedorRespondeu(result), do predicado unico de _shared/resultado-de-provedor.ts, e parsed == null. Saiu a comparacao do codigo de erro contra um unico codigo literal. O teto de custo passa a cair no ramo falhou do 49-10: nao supera a vigente, nao entra na fila de revisao, competencias/citacoes/bias/metadata NULL. A medicao do RED revelou MAIS do que esta entrada registrava: a linha defeituosa tambem marcava a analise boa anterior como SUPERADA (superadas: 1 no rastro de runtime), entao a tela ficava com a vazia — nao era so indistinguivel de uma analise real, ela SUBSTITUIA a boa. Provado por 1 teste novo e 3 mutacoes (M6 defeito original = 1 reprovado; M7 a forma PROIBIDA reintroduzida = 1; M8 pendente_humano no ramo de falha = 2). EF avaliar-transcricao-entrevista version=18 ACTIVE em PROD, marcadores no bundle VIVO. PROD medido: 0 linhas no estado defeituoso — defeito latente.",
    "recorded_at": "2026-09-23T04:40:17.604Z",
    "resolved_at": "2026-09-23T05:57:42.852Z",
    "milestone": "v8.0"
  },
  {
    "id": 66,
    "kind": "unrun-verify",
    "phase": "49",
    "file": ".planning/phases/49-consertos-da-jornada-bloco-2/49-25-PLAN.md",
    "line": null,
    "description": "49-25: o <verify> #2 do plano embute uma ESCRITA (node efdeploy.cjs sem --dry-run) e nao e re-rodavel — re-rodar criaria uma version nova identica, poluindo o historico de deploy para nao provar nada. Re-verificado pelo RESULTADO: version/status/verify_jwt/import_map relidos da Management API, marcadores conferidos no bundle VIVO, --dry-run re-rodavel, origin/main..HEAD vazio. QUINTA ocorrencia da fase (as quatro anteriores estao no WINDOWS 59).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T04:41:05.237Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 67,
    "kind": "unrun-verify",
    "phase": "49",
    "file": "supabase/tests/p46_purga_smoke.sql",
    "line": 1532,
    "description": "p46_purga_smoke (j.2) reprova por estado de fixture-seed que derivou: a vaga 4601d000-...-0003 ('fixture-p46 vaga ativa (sintetica)') esta 'arquivada' desde 2026-08-23 17:47, e a assercao de NAO-VACUIDADE exige 'ativa'. Medido pre-existente: identico com os corpos ANTERIORES ao apply do 49-14. Bloqueia as assercoes (o)/(o.6)/(o.7)/(p) que exercitam o 4o ramo do guard do motor; com a vaga devolvida a 'ativa' dentro de requisicao que aborta, o gate fecha 27/27.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T05:25:53.300Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 68,
    "kind": "stub",
    "phase": "49",
    "file": "supabase/functions/comparativo-candidatos/index.ts",
    "line": 434,
    "description": "49-26: SEXTO sitio da mesma familia, achado pela re-varredura das SETE consumidoras de callAi (o 49-25 varreu cinco e nao alcancou esta). `const ranking = result.parsed ?? null` — NAO ha nenhuma guarda de bloqueio pre-provedor nesta EF: zero ocorrencias de flagged_for_human_review e nenhuma leitura de error_code. Com o teto diario de custo (AI-06) estourado, callAi devolve parsed={recommendation:'hold',flagged_for_human_review:true}, logo `ranking` fica NAO nulo e o stub e (a) inserido em comparativo_solicitado.ranking (jsonb NOT NULL) como se fosse o ranking auditado, e (b) DEVOLVIDO ao RH no payload (`return jsonResponse({ok:true, ranking, ...})`) — um comparativo que nenhum modelo produziu chega a tela como comparativo. provedor_ia/modelo_ia ja saem NULL corretamente, entao a linha de auditoria fica auto-contraditoria: ranking presente, autor ausente. NAO consertado (Scope Boundary: o <measure_first> do 49-26 mandou reportar e nao consertar; EF de outro plano, exige deploy proprio). Conserto: a mesma pergunta estrutural — `!algumProvedorRespondeu(result)` de _shared/resultado-de-provedor.ts, que este plano criou e que esta EF ainda nao importa.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T05:59:25.800Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 69,
    "kind": "deviation",
    "phase": "49",
    "file": ".planning/WINDOWS.md",
    "line": null,
    "description": "49-26: `gsd-tools windows fixed <id> <reason>` ACEITA o segundo posicional e o DESCARTA — a entrada vira status=fixed com reason vazio, nos dois lugares (tabela e bloco JSON). Medido duas vezes nesta sessao (64 e 65) e confirmado retroativamente: a entrada 60, marcada fixed pelo 49-25, tambem esta com reason vazio. Contornado escrevendo o motivo a mao nos dois lugares. Um ledger que registra QUE foi consertado mas nao COMO e meio registro: quem reabrir a janela no futuro nao tem a prova. Nao consertado no gsd-core (fora do repositorio do projeto).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T05:59:44.768Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 70,
    "kind": "deviation",
    "phase": "49",
    "file": "supabase/functions/_shared/resultado-de-provedor.ts",
    "line": null,
    "description": "49-26: o normalizador `provedorDeResultado(provider)` (devolve 'anthropic'|'openai'|NULL, gatilhado pelos CHECKs das tabelas) existe em SEIS copias — avaliar-transcricao-entrevista:157, analise-candidato-individual:166, avaliar-redacao-cultural:139, avaliar-redacao:254 (como `proveniencia`), gerar-guia-entrevista:442 e comparativo-candidatos:443 (as duas ultimas inline, sem funcao). NAO e o mesmo predicado que este plano extraiu: aquele pergunta 'algum provedor respondeu?' e e deliberadamente SEM allowlist; este NORMALIZA contra a allowlist de um CHECK de banco. Fundi-los seria errado. Mas as seis copias do normalizador entre si sao a mesma duplicacao que o D-21 proibe, e agora ha um modulo em _shared onde ele caberia. Nao consertado: seis EFs, seis deploys, escopo de plano proprio.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T05:59:44.862Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 71,
    "kind": "deviation",
    "phase": "49",
    "file": "src/features/avaliacao/components/DevolutivaBigFiveView.tsx",
    "line": 38,
    "description": "49-15 (delta da varredura por FORMA, nao pedido pelo plano): o padrao 'DIM_LABEL|DIMENSOES = [' acha DOIS mapas de rotulo de dimensao Big Five que a tabela C7 do kickoff nao lista — DevolutivaBigFiveView.tsx:38 (DIM_LABEL) e ScorecardAvaliacao.tsx:223 (BIGFIVE_DIM_LABEL). Os dois estao IDENTICOS hoje (5/5 iguais), entao NAO ha defeito vivo; o que ha e a precondicao exata do WINDOWS 52: dois mapas locais, nenhuma constante compartilhada, e um _shared/bigfive-scoring.ts que poderia hospedar a fonte unica e nao hospeda rotulo nenhum. A divergencia da redacao tambem comecou com duas tabelas iguais e apareceu quando UM lado mudou. Agravante: o rotulo N='Sensibilidade Emocional' e exigencia LGPD-04 (nunca o termo clinico) em AMBOS — uma divergencia ali nao seria cosmetica, seria de conformidade, e o guard forbidden-strings NAO pega o termo clinico do N (nao esta entre os 7 termos). Nao consertado: fora dos IDs do 49-15 (JORN-07/JORN-28), e o Big Five e outra rubrica.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T13:02:34.783Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 72,
    "kind": "deviation",
    "phase": "49",
    "file": "src/features/entrevista/components/EntrevistaScorecardInline.tsx",
    "line": 30,
    "description": "49-15: depois do conserto do D-25, EntrevistaScorecardInline.tsx:29-34 (DEFAULT_COMPETENCIAS) e o UNICO lugar do front onde os 4 valores Beauty Smile aparecem como rotulos de eixo de avaliacao — e ali eles sao COMPETENCIAS DE ENTREVISTA, nao dimensoes da rubrica da redacao: escopo deliberado, o plano 49-15 manda nao tocar. Registrado porque o portao estatico do 49-15 procura os 4 valores apenas nos dois arquivos da redacao; quem varrer o front inteiro por 'Experiencia UAU' vai achar este e precisa saber que o achado e legitimo. Se algum dia a entrevista tambem ganhar rubrica versionada em _shared, este e o sitio.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T13:02:48.332Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 73,
    "kind": "unmet-truth",
    "phase": "49",
    "file": "src/features/entrevista/services/entrevistaService.ts",
    "line": null,
    "description": "49-16 (§Deferred do plano, achado NAO perguntado ao operador): getGuia le entrevista_guias SEM filtro de tipo — order('created_at' desc).limit(1) — entao a aba do guia mostra sempre o roteiro MAIS RECENTE, seja ele da online ou da presencial, e nao ha nada na tela dizendo de qual entrevista aquele roteiro e. Medido em PROD 2026-09-23: das 3 candidaturas com guia, DUAS (a1dd4c42, 0b1c887b) tem os DOIS tipos gravados, entao o roteiro da online e inalcancavel pela tela nessas duas. O selo de proveniencia que este plano acrescentou herda o problema: ele diz corretamente qual modelo escreveu o roteiro EXIBIDO, e o roteiro exibido pode nao ser o da entrevista que o RH esta conduzindo. E a mesma classe do defeito D-41/D-39 que este plano consertou na aba da transcricao (a tela escolhendo por recencia em vez de por tipo/vigencia), um nivel ao lado. Conserto: getGuia(candidaturaId, tipo) com o mesmo seletor da aba da transcricao, ou a aba do guia mostrando os dois roteiros rotulados. Fora de escopo: o plano fixou explicitamente que getGuia segue sem filtro.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T13:35:27.952Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 74,
    "kind": "unmet-truth",
    "phase": "49",
    "file": "supabase/migrations/20260922000010_p49_retro_trilha_bd9.sql",
    "line": null,
    "description": "BD-9 meio-fechada: D-47 RECUSADA pelo operador em 2026-09-23 (editaria a trilha de auditoria sem a trilha registrar a edicao). A justificativa da decisao final segue em 5 linhas de historico_candidatura.criterio_texto. Tem de aparecer no 49-17 (inventario LGPD) e no fecho do M8.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T14:45:13.264Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 75,
    "kind": "unrun-verify",
    "phase": "49",
    "file": "supabase/tests/p46_purga_smoke.sql",
    "line": null,
    "description": "Asseroes (j.2), (o), (o.6), (o.7) e (p) bloqueadas: o operador RECUSOU abrir a vaga seed 4601d000-...-0003 (fica arquivada). O 4o ramo do guard do motor segue NAO exercitado entrando no 49-19. Conserto e do plano 49-28 (fixture que abre e restaura dentro do proprio envelope).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T14:45:13.350Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 76,
    "kind": "unmet-truth",
    "phase": "49",
    "file": "supabase/migrations/20260922000013_p49_motor_respostas_e_producoes.sql",
    "line": null,
    "description": "49-20: as escolhas de multipla escolha da SJT sobrevivem dentro de scores_candidato.metadata->'respostas' (medido: 4 de 5 linhas sjt, com opcao_id/pergunta_id/peso). O recibo promete no item respostas_e_producoes que «as suas respostas das avaliacoes foram apagadas», e a Correcao 14 REJEITOU a opcao (c) («as alternativas que voce marcou ficam»). Nao foi consertado aqui: a migration ja esta aplicada e escriturada, e alargar o escopo do passo de mao unica alem do que o operador enumerou nao e conserto de agente. Conserto cirurgico possivel (metadata - 'respostas', a linha fica), decisao do operador via 49-21.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T15:42:18.742Z",
    "resolved_at": null,
    "milestone": "v8.0"
  },
  {
    "id": 77,
    "kind": "unmet-truth",
    "phase": "49",
    "file": "supabase/migrations/20260922000013_p49_motor_respostas_e_producoes.sql",
    "line": null,
    "description": "49-20: resumos do texto removido sobrevivem — redacoes_candidato.texto_hash (NOT NULL, 2 linhas) e input_hash, e entrevista_analises.texto_hash (5 linhas). Nao sao o texto e nao estao entre as 14 origens do recibo, mas permitem CONFIRMAR um texto adivinhado depois de o original ter sido apagado (Art. 12 §1o, meios razoaveis). Registrado, nao consertado: fora do que o operador enumerou no D-48. Avaliar no 49-21.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T15:42:18.821Z",
    "resolved_at": null,
    "milestone": "v8.0"
  }
]
````
