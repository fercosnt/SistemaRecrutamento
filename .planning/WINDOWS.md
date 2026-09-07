---
schema_version: 1
open_count: 3
waived_count: 7
fixed_count: 33
total_count: 43
last_updated: 2026-09-06T21:10:00.000Z
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
  }
]
````
