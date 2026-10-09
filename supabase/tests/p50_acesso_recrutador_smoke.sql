-- =============================================================================
-- Phase 50 — smoke do ACESSO DO RECRUTADOR (EXPORT-05, metade «visível ao RH», gap G4-b)
-- v1 (Plano 50-01, TRACER): helper `public.is_active_rh_user()` + `candidaturas.rh_le_candidaturas`
-- v2 (Plano 50-07, PORTÃO DA FASE): SC1..SC5 sobre as 12 tabelas-filhas + a view, as 18 RPCs, a
--     varredura por FORMA com mordida em pg_temp, as filas semeadas e as regras do decisor — 13
--     cláusulas (a–l, z). Só a metade «sessão real» do SC1 fica fora (50-11).
-- =============================================================================
-- O QUE ELE VIGIA — 20261005000001 (helper + rh_le_candidaturas) e, prefixadas pelo ensaio até o
-- apply do 50-10, 20261005000002 (13 policies + v_analises_presas invoker), …0003 (7 RPCs de
-- leitura/fila) e …0004 (11 RPCs de escrita). O que segue descreve o 0001; o resto está em (g)–(l).
--   · `public.is_active_rh_user()`: plpgsql SECURITY DEFINER STABLE, `search_path=''`;
--     verdadeiro sse o chamador tem linha ATIVA e não excluída em `usuarios_rh` (lida ao vivo);
--     `anon` sem EXECUTE, `authenticated` com.
--   · `rh_le_candidaturas` (`TO authenticated`): o RH ATIVO que não criou vaga nenhuma vê as
--     candidaturas VIVAS de todas as vagas, de qualquer status (D-01); o recrutador DESATIVADO
--     com token antigo (claim `rh` ainda válido) não vê nada (D-02, D-11); candidato só as
--     próprias; sem claims e `anon` nada; o administrador tudo, com o disjunto de hoje (D-02).
--
-- ATORES — lidos NA EXECUÇÃO, nunca por UUID escrito aqui; falha alta se faltar algum.
--   a_ativo    linha `usuarios_rh` ativa e não excluída que NÃO criou vaga nenhuma, preferindo
--              `role = 'recrutador'` (hoje não há recrutador ativo em PROD: cai num administrador
--              ativo sem vaga — o helper é role-agnóstico e a impersonação usa o claim `rh`).
--   a_inativo  `role = 'recrutador' AND NOT ativo` — o token antigo de um recrutador desativado.
--   a_inativo_mp  linha INATIVA, não excluída, sem vaga e sem candidato, com o MESMO `role` de
--              a_ativo: difere do positivo SÓ em `ativo` (WR-02 do 50-REVIEW-TRACER-1 — com o
--              par a_ativo administrador × a_inativo recrutador, um helper que filtrasse papel em
--              vez de `ativo` passava 7/7).
--   a_admin    administrador ativo.
--   a_cand     `candidatos.user_id` com ≥ 1 candidatura viva e sem linha em `usuarios_rh`.
--   a_ativo e a_inativo são escolhidos SEM linha em `candidatos`: assim nenhuma policy de
--   candidato lhes mostra candidatura, e o que eles veem é obra de `rh_le_candidaturas`.
--   Vagas: por status (`ativa`, `inativa`, `arquivada`, `deleted_at IS NULL`), a de MAIS
--   candidaturas vivas; cada uma com ≥ 1. Dado de teste (`fixture-p46`, `[TESTE]`) entra como
--   qualquer outro (D-07).
--   v2 — a_visualizador = a MESMA linha de a_ativo com claim `visualizador` ((h)); «sem_papel» de
--   (i) = o `sub` de a_cand SEM `app_metadata.role` (usuário real fora de `usuarios_rh`: a guarda de
--   papel tem de recusar pelo `coalesce`; o sub de a_ativo não serve porque
--   `save_entrevista_guia_edits` lê o papel de `usuarios_rh`, não do JWT — ENTREV-08 — e um RH
--   ativo sem claim passaria ali COM RAZÃO); D = o decisor da revisão pendente de (l) (ativo; hoje
--   a_ativo, semeado), F = OUTRO rh ativo (controle de (l)). Nenhum é recrutador de verdade: PROD
--   não tem recrutador ativo (o RH2 real é o D-10 / 50-11); todos usam o claim `rh`.
--
-- ⚠ ESTE SMOKE ESCREVE — só dentro da subtransação PL/pgSQL encerrada por `RAISE EXCEPTION` com
-- SQLSTATE próprio (`P50C1`), capturado logo acima: ROLLBACK de tudo (um erro no meio também
-- desfaz a subtransação — não há caminho em que o bloco interno termine normalmente). Escritas,
-- todas como postgres e todas revertidas:
--   (b)/(c) `UPDATE usuarios_rh SET role = 'recrutador'` na linha de a_ativo (o caminho REAL
--           recrutador + claim `rh`, que o PROD não tem: 0 recrutadores ativos, e o D-10 proíbe
--           reativar a conta que existe); (b) depois `SET deleted_at = now()` na mesma linha.
--           Triggers de `usuarios_rh` conferidos em 2026-10-05: `update_usuarios_rh_updated_at`
--           e `trg_usuarios_rh_anti_lockout` (recusa rebaixar o ÚLTIMO administrador ativo — a
--           baseline falha alto antes, com o motivo); nenhum chama rede.
--   (f)     `UPDATE candidaturas` em duas linhas vivas: uma vira rascunho, outra excluída (a
--           população da BORDA, que o PROD não tem). Triggers de UPDATE de `candidaturas`
--           conferidos: os que chamam `net.*` são AFTER INSERT ou `UPDATE OF
--           encerrada_a_pedido_em`; `UPDATE OF status`/`etapa_atual` não disparam; sobra
--           `update_candidaturas_updated_at`.
--   (g)/(h) `UPDATE analise_candidato_vaga SET status = 'pendente'` numa análise antiga de
--           candidato que não é a_cand — a semente de `v_analises_presas` (população 0 em PROD);
--           sem trigger na tabela (medido 2026-10-05).
--   (i)     `UPDATE vagas SET status = 'rascunho'` na vaga de UMA pergunta (outra vaga que não a
--           da candidatura sondada), `UPDATE usuarios_rh SET role = 'recrutador'` na linha de
--           a_ativo (WR-08 do 50-REVIEW-ACESSO-1: o caminho real do recrutador nas RPCs que leem
--           o papel do banco) e as 18 RPCs chamadas por 6 atores — cada chamada no SEU bloco,
--           desfeito por `P50C2` mesmo quando aceita (registrar/rejeitar/liberar/revogar/
--           reprocessar/salvar… gravam e enfileiram `net.http_post`, tudo transacional).
--   (j)     TEMP TABLE + policy + função em `pg_temp` (a mordida), desfeitas por `P5099`.
--   (k)     2 `INSERT solicitacoes_dados` (pedido com candidatura viva + ÓRFÃO); se não houver
--           revisão pendente viva, `UPDATE decisao_final SET revisao_solicitada_em`.
--   (l)     `UPDATE decisao_final` — o decisor da revisão pendente vira D; a linha do D-23 vira a
--           decisão `rejeitado` de D REVERTIDA (dispara `trg_decisao_final_snapshot` e
--           `trg_notif_revisao_respondida`: histórico + `net.http_post` enfileirado, transacional);
--           `responder_revisao_decisao`/`registrar_decisao` chamados, cada um desfeito por `P50C2`.
--   Os runners (`p50_ensaio.cjs`, `p50_mutacoes.cjs`) conferem depois, por leitura só-leitura,
--   que `role|ativo|deleted_at` de `usuarios_rh` e a borda de `candidaturas` ficaram iguais —
--   por isso este arquivo SÓ roda por eles, antes E depois do apply (ver «COMO RODAR»).
--
-- ⚠ CADA sonda vai no SEU PRÓPRIO bloco `BEGIN … EXCEPTION WHEN OTHERS` que guarda
-- `SQLSTATE:SQLERRM` (ou a contagem). O julgamento roda FORA da subtransação. Uma cláusula por
-- bloco `DO` (cada instrução fica sob o teto de 5 s do ensaio), na ordem a, b, c, d, e, f, g, h,
-- i, j, k, l, z: a PRIMEIRA cláusula quebrada reprova a requisição inteira. Toda cláusula nova
-- (g)–(l) é julgamento por LISTA DE RÓTULOS (`P50C FAIL (<letra>): [<rótulo>,…]`; rótulo `c_*` =
-- controle vácuo, nunca portão aberto), e (e) passou a ser também.
--
-- CLÁUSULAS.
--   (a) forma e ACL do helper: existe, `prosecdef`, STABLE, `search_path=""`; `anon` sem EXECUTE
--       E a chamada sob `SET LOCAL ROLE anon` falha com `permission denied for function
--       is_active_rh_user` (ACL e guarda dividem o SQLSTATE 42501; só a mensagem os distingue);
--       `authenticated` com EXECUTE.
--   (b) semântica do helper: verdadeiro para a_ativo e a_admin [c_ativo, c_admin] e para a
--       linha de a_ativo trocada para `recrutador` [rec_ativo]; falso para a_inativo,
--       a_inativo_mp [inativo_mesmo_papel], a linha `recrutador` ativa porém excluída
--       [ativo_excluido], `sub` aleatório, sem claims e a_cand. Cada par positivo/negativo
--       difere num atributo só (`ativo`; `deleted_at`). Rótulos: `P50C FAIL (b): [<rótulo>,…]`.
--   (c) SC1 por impersonação: claim `rh` + `sub` a_ativo ⇒ por vaga escolhida, `count(*)` de
--       `candidaturas` = contagem viva como postgres, cada uma > 0; total visível = total vivo;
--       e o mesmo total com a linha de a_ativo trocada para `recrutador` (o caminho real).
--   (d) SC2, cada negativa PAREADA com o positivo de (c) na mesma execução: claim `rh` + `sub`
--       a_inativo ⇒ 0, e a_inativo_mp ⇒ 0 [inativo_mesmo_papel]; `sub` a_ativo (a MESMA linha ativa do positivo) com claim `visualizador`,
--       `gerente` e sem `role` ⇒ 0 cada [ativo_visualizador, ativo_gerente, ativo_sem_role] —
--       o conjunto do claim `rh` é o único filtro de papel do ramo (o helper é role-agnóstico);
--       claims `candidato` + `sub` a_cand ⇒ ≥ 1 linha própria [c_cand = controle]
--       E 0 alheias; `authenticated` sem claims ⇒ 0; `anon` ⇒ 0 linhas ou 42501, nunca ≥ 1
--       (o JSON registra qual dos dois).
--   (e) administrador: claim `administrador` + `sub` a_admin ⇒ `count(*)` = total de TODAS as
--       candidaturas como postgres (mortas e rascunhos inclusive); e o disjunto do administrador
--       do qual vivo de `rh_le_candidaturas` é EXATAMENTE
--       `(( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text)`.
--       Esse literal é ESCOPO deliberado (D-02: «o ramo do administrador fica byte-idêntico»),
--       não fotografia: mudar o disjunto É o defeito que a cláusula existe para pegar.
--       v2: o mesmo literal em TODA policy da forma de igualdade `= 'rh'::text` (qualquer schema;
--       14 no ensaio), no USING e no WITH CHECK. Rótulos: [admin_total],
--       [admin_disjunto:<tabela>.<policy>], [admin_disjunto_check:…], [c_forma] (forma vazia).
--   (f) forma da policy (escopo do tracer, nome literal deliberado): roles `{authenticated}`; o
--       qual chama `is_active_rh_user` e não casa `created_by`. BORDA SEMEADA (WR-03): dentro do
--       envelope P50C1, as duas primeiras candidaturas vivas (por id) viram uma rascunho e uma
--       excluída; então o rh ativo vê 0 de cada [rh_ve_rascunho, rh_ve_excluida], 0 da borda
--       inteira [rh_ve_borda] e total = vivas como postgres depois de semear [rh_total]; o
--       administrador vê as 2 semeadas e a borda inteira [c_admin_semeadas, c_admin_borda]; a
--       semente pegou [c_populacao]. A população publicada no JSON é `f_borda_semeada`;
--       `n_borda` segue sendo a borda REAL (0 em 2026-10-05).
--   (g) SC1 nas relações-filhas (D-01). CONJUNTO POR FORMA, sem lista: toda tabela com policy cujo
--       qual/with_check chama `is_active_rh_user` OU traz `= 'rh'::text` (a forma antiga de posse
--       também a tem: uma policy revertida continua no conjunto), mais `v_analises_presas`
--       (escopo deliberado, D-05). Forma por relação (qual das policies SELECT/ALL): B = cita
--       `candidatura_id` → população = linhas de candidatura VIVA; A_viva = cita `deleted_at`/
--       `is_rascunho` da própria linha (candidaturas) → linhas vivas; A = nenhum → todas. Medido
--       no ensaio de 2026-10-05 (real>depois de semear): agendamentos_entrevista B 2, analise_
--       candidato_vaga A 26, candidaturas A_viva 40, comparativo_solicitado A 6, decisao_final B 7,
--       decisao_final_historico B 11, entrevista_analises B 14, entrevista_guias B 6,
--       historico_candidatura B 79, notificacoes_enviadas B 73, redacoes_candidato B 3,
--       scores_candidato B 19, v_analises_presas B 0>1 (SEMEADA). rh + a_ativo vê, em cada uma,
--       exatamente a população. População 0 sem receita de semente → `vacuos` (com motivo, no JSON
--       e na evidência), e a igualdade continua exigida. Rótulos: [<relação>].
--   (h) SC2 nas mesmas relações e sementes (D-02, D-11): claim `rh` + a_inativo [velho.<rel>] e
--       + a_inativo_mp [velho_mp.<rel>] ⇒ 0; claim `visualizador` + a linha ATIVA
--       [visualizador.<rel>] ⇒ 0; candidato + a_cand ⇒ 0 linhas cuja candidatura NÃO é dele
--       [candidato.<rel>]; controle na mesma execução: rh ativo = população [c_ativo.<rel>].
--       Erro numa negativa também reprova (passar por erro é passar pelo motivo errado).
--   (i) SC2 e D-04 em cada RPC (D-02, D-04). CONJUNTO POR FORMA: funções de `public` cujo prosrc
--       chama o helper ou traz `v_role = 'rh'` (18 no ensaio), mais as entradas do MAPA de
--       argumentos que existam (o mapa é escopo deliberado: chamada com ids reais lidos na
--       execução + tipo `leitura`/`escrita` + se tem guarda de papel; uma função do conjunto sem
--       entrada ⇒ [sem_sonda:<f>]; uma entrada que saiu do conjunto — perdeu o helper — continua
--       sondada). Por função (rótulo `<proname>/<nargs>`), 6 atores, cada chamada desfeita:
--       ativo (rh + a_ativo, com a linha de a_ativo como `recrutador` dentro do envelope — WR-08:
--       `save_entrevista_guia_edits` lê o papel de usuarios_rh, e sem a troca o controle rodava o
--       ramo do administrador) ≠ 42501, e no funil KPIs cheios [ativo.<f>] — o CONTROLE;
--       velho/velho_mp ⇒ 42501, leitura admite vazio (n:0, i:0, KPIs vazios), nunca ≥ 1;
--       sem_papel ⇒ 42501 onde há guarda de papel, KPIs vazios no funil (sem guarda);
--       candidato (args de candidatura ALHEIA) ⇒ escrita só 42501, leitura 42501 ou vazio;
--       anon ⇒ sem EXECUTE no ACL E a chamada recusada com `permission denied for function`.
--       Um 40001 numa sonda reprova como INESPERADO (40001: …) — tráfego, nunca veredito.
--   (j) SC3 POR FORMA, sem allowlist. POLICIES: TODA linha de `pg_policies`, SEM filtro de schema
--       (desvio deliberado do RESEARCH Pattern 5, que excluía `storage` & cia. das duas
--       varreduras): policies de usuário vivem também em `storage` (26, em `storage.objects` —
--       o bucket de CVs; o cabeçalho do `get-curriculo-url` registra uma policy RH antiga ali),
--       `cron` tem 2 gerenciadas e `pg_temp` recebe a mordida. Cobertura provada na execução:
--       lidas = `count(*)` de `pg_catalog.pg_policy` [cobertura:<lidas>/<total>]; a lista antiga
--       leria só `cobertura_antiga` (155 de 183 — por isso a igualdade existe). Uma mordida DDL em
--       `storage.objects` NÃO é possível (dono `supabase_storage_admin`; postgres não é membro nem
--       age como ele) — a metade storage se prova pela cobertura. Ofensoras: qual/with_check casa
--       `created_by` [pol:<s.t.p>]; metade positiva: toda policy com `= 'rh'::text` chama o helper
--       [pol_rh_sem_helper:…]. FUNÇÕES (a exclusão de schemas de sistema do Pattern 5 FICA — só
--       aqui; pg_temp DENTRO): `created_by` E `\mvagas\M` [fn:<s.f/n>]; forma indireta
--       `v_role = 'rh' AND v_(vaga_)?(owner|dono)` [fn_indireta:…]; toda função com
--       `v_role = 'rh'` chama o helper [fn_rh_sem_helper:…]. Escopo: as 14 policies reescritas
--       (lista deliberada) estão na forma de igualdade [escopo:<t.p>]. MORDIDA em pg_temp,
--       desfeita por P5099: temp table + `p50_bite_pol` (posse) + `pg_temp.p50_bite_fn()` (posse
--       indireta) — fase 2 MENOS fase 1 tem de ser EXATAMENTE o plantado em cada detector
--       [mordida_pol, mordida_fn, mordida_ind, mordida_fnrh]. Populações da forma (ensaio
--       2026-10-05): 183 policies (cron 2, public 155, storage 26), 14 na forma de igualdade,
--       18 funções com `v_role = 'rh'` — [c_pol_rh]/[c_fn_rh] se zerarem.
--   (k) SC4 (D-03), semeado no envelope: pedido pendente de candidato COM candidatura viva + de
--       candidato SEM candidatura (órfão; nenhum dos dois é a_cand) e as revisões pendentes vivas
--       (2; semeia uma se 0). administrador × rh ativo: md5 de `listar_pedidos_dados(true)`,
--       `contar_pedidos_dados_pendentes()`, md5 sem `pode_responder` de
--       `listar_revisoes_decisao(true|false)`, `contar_revisoes_pendentes()` iguais
--       [igual.<f>], contagens > 0 [c_pop.<f>], o rh vê os dois semeados [rh_ve_com,
--       rh_ve_orfao]; token antigo e candidato ⇒ 42501 ou vazio, nunca ≥ 1 [velho.<f>,
--       candidato.<f>].
--   (l) SC5 (D-08), semeado: o decisor D da revisão pendente (sob `rh` + D) recebe 42501 com
--       «decisor» de `responder_revisao_decisao` [decisor]; OUTRO rh ativo passa [c_outro]; na
--       fila sob D, `pode_responder` é falso nas linhas dele [pode_responder] e ele vê ≥ 1
--       [c_proprias]. D-23 COMPORTAMENTAL: uma decisão vira `rejeitado` de D `revertida`
--       (o predicado 2b de `registrar_decisao`, espelhado) e `registrar_decisao(…,'rejeitado',…)`
--       sob D dá 42501 «D-23» [d23]; outro rh não é travado [c_d23_outro]; e o literal
--       `d.por_usuario = v_uid` está no corpo [d23_literal]. Se a semente for impossível,
--       `d23=estrutural` (só o literal) — o ÚNICO rebaixamento permitido, e reportado.
--   EVIDÊNCIA: a requisição aborta e não devolve linha; por isso (g), (i), (j), (k) e (l) ANEXAM
--   à GUC `p50.evidencia` (nunca sobrescrevem — os PÓS-PORTÃO das migrations escrevem lá também)
--   `07:pop=…`, `07:semeadas=…`, `07:vacuos=…`, `07:rpcs=…`, `07:i_ativo=…`, `07:i_cand=…`,
--   `07:cobertura=…`, `07:pol_por_schema=…`, `07:formas=…`, `07:mordida_pg_temp=…`, `07:sc4=…`,
--   `07:sc5=…`, `07:d23=…` — ids/contagens/md5/SQLSTATE, nada pessoal —, que o sentinela leva
--   para fora como `evidencia=`.
--   (z) resíduo: contagens globais de `candidaturas`, `vagas`, `usuarios_rh` (v2: e de
--       `solicitacoes_dados` e `decisao_final`, onde (k)/(l) escrevem) = baseline
--       capturada no início DESTA execução. Como o smoke só roda dentro do ensaio, que abre a
--       requisição em REPEATABLE READ (um snapshot para tudo), commits de fora NÃO aparecem
--       aqui: um delta em (z) é RESÍDUO DA PRÓPRIA requisição — uma escrita que escapou de um
--       envelope P50C1 —, nunca tráfego (WR-02 do 50-REVIEW-TRACER-3). O mesmo vale para as
--       comparações postgres × ator de (c), (e) e (f): diferença é da policy, não de tráfego.
--       O único erro movido por tráfego sob RR é o `40001` de uma escrita do envelope numa linha
--       commitada por outro depois do snapshot; os runners o classificam como INCONCLUSIVO.
--
-- O PORTÃO MORDE — mutações provadas por `scripts/p50_mutacoes.cjs` (Plano 50-01, Task 3,
-- 2026-10-05), cada uma numa requisição que aborta: `SET LOCAL lock_timeout/statement_timeout` +
-- migration 20261005000001 (enquanto não aplicada) + MUTAÇÃO (DDL avulsa) + este smoke +
-- `RAISE 'ENSAIO_P50_TERMINOU'`. Cada uma tem de reprovar na letra abaixo e NÃO chegar ao
-- sentinela. A próxima redefinição destes objetos tem de re-provar esta tabela — uma cláusula
-- nova sem mutação que a reprove é cláusula não vigiada:
--   | Mutação | Inversão                                                          | Reprova | Medido (2026-10-05)            |
--   |---------|-------------------------------------------------------------------|---------|--------------------------------|
--   | M1      | helper sempre verdadeiro (mesmo ACL)                              | (b)     | (b) [inativo,aleatorio,sem_claims,candidato], 517 ms |
--   | M2      | ramo `rh` só pelo JWT (sem o helper)                              | (d)     | (d) [inativo], 684 ms          |
--   | M3      | `GRANT EXECUTE` do helper a `anon`                                | (a)     | (a), 503 ms                    |
--   | M4      | ramo `rh` de volta à posse (`vagas.created_by = auth.uid()`)      | (c)     | (c), 522 ms                    |
--   | M5      | policy de volta a `TO public`                                     | (f)     | (f), 577 ms                    |
--   | M6      | disjunto do administrador alterado (`= ANY (ARRAY[…])`)           | (e)     | (e), 623 ms                    |
--   CONTROLE (migration intacta + smoke) chegou ao sentinela com smoke50=7/7 em 641 ms; depois do
--   laço, a leitura só-leitura (ledger das 4 versões p50, helper, md5|roles das 14 policies que
--   casam a forma) foi idêntica à de antes: nada persistiu. Sob M5 a cláusula (d) segue verde —
--   `anon` continua recusado (42501) também com a policy `{public}`; quem pega é (f).
--
--   Rodada de conserto do 50-REVIEW-TRACER-1 (2026-10-05) — cada mutação nova declara também os
--   RÓTULOS que têm de aparecer (morde PELA sonda que existe para ela):
--   | Mutação | Inversão                                                     | Reprova (rótulos exigidos)                          | Medido (2026-10-05)                                   |
--   |---------|--------------------------------------------------------------|-----------------------------------------------------|-------------------------------------------------------|
--   | M7      | ramo `rh` sem o conjunto do claim `rh` (WR-01)               | (d) ativo_visualizador, ativo_gerente, ativo_sem_role | (d) [ativo_visualizador,ativo_gerente,ativo_sem_role], 527 ms |
--   | M8      | helper com `role = 'administrador'` no lugar de `ativo` (WR-02) | (b) inativo_mesmo_papel, rec_ativo               | (b) [rec_ativo,inativo_mesmo_papel], 542 ms           |
--   | M9      | ramo `rh` sem `deleted_at IS NULL` (WR-03)                   | (f) rh_ve_excluida                                  | (f) [rh_ve_excluida,rh_ve_borda,rh_total], 756 ms     |
--   | M10     | ramo `rh` sem `is_rascunho = false` (WR-03)                  | (f) rh_ve_rascunho                                  | (f) [rh_ve_rascunho,rh_ve_borda,rh_total], 830 ms     |
--   | M11     | helper sem `deleted_at IS NULL` (IN-06)                      | (b) ativo_excluido                                  | (b) [ativo_excluido], 545 ms                          |
--   CONTROLE 7/7 (985 ms); M1..M6 seguem mordendo nas mesmas letras; «controle verde; 11/11
--   mutacoes mordem; nada persistiu» — a leitura de persistência agora cobre TODAS as 155
--   policies de `public`, `role|ativo|deleted_at` das 7 linhas de `usuarios_rh` e a borda de
--   `candidaturas` (0), iguais antes e depois.
--
--   v2 (Plano 50-07, 2026-10-05) — uma mutação por cláusula nova e pela extensão de (e), com
--   0002..0004 PREFIXADAS (modo padrão do ensaio); cada uma extraída por âncora única das
--   migrations ou, para objeto que a fase não reescreve (M19), do `pg_get_functiondef` vivo lido
--   só-leitura no início do runner:
--   | Mutação | Inversão                                                        | Reprova (rótulos exigidos)                    | Medido (2026-10-05)                                     |
--   |---------|-----------------------------------------------------------------|-----------------------------------------------|---------------------------------------------------------|
--   | M12     | `rh_le_scores` de volta à subconsulta de posse, TO authenticated | (g) scores_candidato                          | (g) [scores_candidato], 1135 ms                         |
--   | M13     | `rh_le_decisao_final`: ramo rh só pelo JWT (sem helper/posse)   | (h) velho.decisao_final, velho_mp.decisao_final | (h) [velho_mp.decisao_final,velho.decisao_final], 961 ms |
--   | M14     | `v_analises_presas` RESET (security_invoker)                    | (h) candidato/velho/visualizador.v_analises_presas | (h) [candidato.…,velho_mp.…,velho.…,visualizador.v_analises_presas], 1506 ms |
--   | M15     | `liberar_cognitivo` com a comparação de posse de volta          | (i) ativo.liberar_cognitivo/2                 | (i) [ativo.liberar_cognitivo/2], 1344 ms                |
--   | M16     | `reprocessar_analise`: guarda sem `coalesce`                    | (i) sem_papel.reprocessar_analise/1           | (i) [sem_papel.reprocessar_analise/1], 1177 ms          |
--   | M17     | `GRANT EXECUTE … rejeitar_candidatura … TO anon`                | (i) anon.rejeitar_candidatura/3               | (i) [anon.rejeitar_candidatura/3], 1059 ms              |
--   | M18     | `listar_pedidos_dados` exige candidatura viva no ramo rh        | (k) rh_ve_orfao, igual.listar_pedidos_dados   | (k) [igual.listar_pedidos_dados,rh_ve_orfao], 1320 ms   |
--   | M19     | `responder_revisao_decisao` (vivo): trava do decisor `IF false` | (l) decisor                                   | (l) [decisor], 1278 ms                                  |
--   | M20     | função NOVA `public.p50_mut_dono()` com created_by + vagas      | (j) fn:public.p50_mut_dono/0                  | (j) [fn:public.p50_mut_dono/0], 1281 ms                 |
--   | M21     | policy RESTRICTIVE NOVA em `vagas_associadas_recrutadores` (autor da vaga) | (j) pol:public.vagas_associadas_recrutadores.p50_mut_dono_pol | (j) [pol:…p50_mut_dono_pol], 1272 ms |
--   | M22     | `funil_kpis` com `v_ve_tudo := true`                            | (i) velho/sem_papel/candidato.funil_kpis/1    | (i) [velho.…,velho_mp.…,sem_papel.…,candidato.funil_kpis/1], 1294 ms |
--   | M23     | disjunto do administrador de `rh_le_historico` (helper mantido) | (e) admin_disjunto:historico_candidatura.rh_le_historico | (e) [admin_disjunto:historico_candidatura.rh_le_historico], 1137 ms |
--   CONTROLE 13/13 (1847 ms); M1..M11 seguem mordendo nas mesmas letras e rótulos (M6 agora com
--   [admin_disjunto:candidaturas.rh_le_candidaturas]); «controle verde; 23/23 mutacoes mordem;
--   nada persistiu». M20 não traz `v_role = 'rh'` de propósito: com ele, (i) pegaria antes como
--   [sem_sonda:p50_mut_dono/0] (também um portão — mas o de (j) é o que M20 prova); a forma
--   indireta e a metade positiva das funções são mordidas pela própria (j), em pg_temp. A
--   cobertura de policies não tem mutação DDL possível em `storage.objects` (ver (j)) — o lado
--   storage se prova pela igualdade lidas = total na execução, e `cobertura_antiga` mostra os 28
--   que a lista antiga deixaria de ler.
--
--   Rodada de conserto do 50-REVIEW-ACESSO-1 (2026-10-06), com 0002..0004 PREFIXADAS:
--   | Mutação | Inversão                                                        | Reprova (rótulos exigidos)                    | Medido (2026-10-06)                                     |
--   |---------|-----------------------------------------------------------------|-----------------------------------------------|---------------------------------------------------------|
--   | M24     | `save_entrevista_guia_edits` recusa todo rh (`IF v_role = 'rh' THEN`), WR-08 | (i) ativo.save_entrevista_guia_edits/3 | (i) [ativo.save_entrevista_guia_edits/3], 1210 ms |
--   | M25     | `registrar_decisao`: bloco D-23 `IF false AND (…)`, literal `d.por_usuario = v_uid` mantido, WR-09 | (l) d23 | (l) [d23], 2307 ms |
--   M24 contra o smoke de ANTES do WR-08 (a_ativo administrador rodando o ramo do administrador
--   nessa RPC) saiu `ENSAIO VERDE … smoke50=13/13`: era o buraco que a troca de papel em (i) fecha.
--   M25 é a forma que a prova SÓ ESTRUTURAL do D-23 deixaria passar (o literal fica): ela morde pela
--   sonda comportamental. Por isso `07:d23=estrutural` é PARADA no 50-10 (o verify exige
--   `07:d23=comportamental>e:42501`). CONTROLE 13/13 (1564 ms); «controle verde; 25/25 mutacoes
--   mordem; nada persistiu».
--
--   Phase 51 / 51-10 (2026-10-09) — edição de portão D-56, provada por `scripts/p51_mutacoes.cjs` com
--   20261008000002 + 20261008000003 PREFIXADAS (CONTROLE `50=13/13` em 1057 ms; «29/29 mutacoes
--   mordem; nada persistiu»). Duas mudanças, e só estas: (k) — o agregado de
--   `listar_revisoes_decisao(true|false)` ordena por `candidatura_id` e DEPOIS por
--   `to_jsonb(t) ->> 'pedido_id'` (C-12: a fila tem as três origens e uma candidatura pode ter duas
--   linhas; funciona antes e depois da 0003); (i) — o MAPA ganhou as duas RPCs do JORN-42 que chamam o
--   helper (`responder_revisao_rejeicao/3`, `ler_contexto_knockout_revisao/1`), sem as quais o conjunto
--   por forma reprova `[sem_sonda:…]` — medido: com a 0002 prefixada e o MAPA antigo, este smoke dava
--   `P50C FAIL (i): [sem_sonda:responder_revisao_rejeicao/3]`.
--   | Mutação | Inversão                                                        | Reprova (rótulos exigidos)                    | Medido (2026-10-09)                                     |
--   |---------|-----------------------------------------------------------------|-----------------------------------------------|---------------------------------------------------------|
--   | MC1a    | ramo `decisao_final` da fila exige `v_role = administrador` (o único ramo que o mundo do (k) popula: as revisões pendentes vivas ou a semeada) | (k) igual.listar_revisoes_decisao_true, igual.listar_revisoes_decisao_false | (k) [igual.listar_revisoes_decisao_true,igual.listar_revisoes_decisao_false], 1176 ms |
--   | MC7     | `ler_contexto_knockout_revisao` sem o helper                    | (i) velho.ler_contexto_knockout_revisao/1     | (i) [velho.…/1,velho_mp.ler_contexto_knockout_revisao/1], 972 ms |
--   | MC8     | `responder_revisao_rejeicao` sem o helper                       | (i) velho.responder_revisao_rejeicao/3        | (i) [velho.…/3,velho_mp.responder_revisao_rejeicao/3], 935 ms |
--   `contar_revisoes_pendentes` não é mutada por MC1a: `igual.contar_revisoes_pendentes` NÃO aparece.
--
-- Varredura (forma) — 2026-10-05, padrão do CLAUDE.md §«Portões» sobre `supabase/tests/*.sql`
-- (`grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.'`).
--   População da forma: 336 linhas (re-medida na execução do 50-01; igual à do planejamento);
--   345 depois da rodada de conserto do 50-REVIEW-TRACER-1 — as 4 que a revisão atribuiu aos
--   próprios arquivos p50 (comentários deste cabeçalho e o `relname IN` da sonda) e 5 `v_rc <> 1`
--   deste arquivo, ESCOPO: cada escrita do envelope tem de atingir exatamente UMA linha.
--   Achados que tocam objetos da fase (as 18 funções / 14 policies), todos ESCOPO e não
--   fotografia: `oper31_rejeitar_candidatura_smokes.sql:224` (`v_after - v_before <> 1`, delta
--   da própria fixture); `p44_pedidos_dados_smoke.sql:357` (as duas RPCs que o p44 especifica);
--   `p49_prontidao_prod.sql:142,144` (as duas RPCs nomeadas daquela prontidão).
--   Achados que tocam o objeto DESTE plano (`candidaturas` sob claim `rh`): `sec05_08_smokes.sql:189,196`
--   (`n <> 0` / `v_upd <> 0` — «rh não-dono lê/atualiza 0 candidaturas da vaga alheia»). É
--   ESCOPO, não fotografia, mas a PREMISSA dele é exatamente o que o D-01 inverte: depois do
--   apply ele reprova trabalho correto. Está na tabela «Legacy test disposition» do 50-RESEARCH
--   (par positivo/negativo), reescrito em plano posterior — não aqui.
--   Fora dos objetos da fase: `p46_teardown_fixture.sql:293` (resíduo da fixture, escopo) e
--   `p43_previa_smoke.sql:667` (RPCs da P43).
--   Este arquivo tem constantes deliberadas: o esperado 7 (número de cláusulas DESTE arquivo), o
--   0 das negativas, o 1 de cada escrita do envelope, o 2 das semeadas de (f) e o literal do
--   disjunto do administrador em (e) — escopo; as contagens de (c), (e), (f) e (z) são baseline
--   capturada na execução.
--   Re-varredura do 50-07 (2026-10-05): 346 linhas na base do plano (f0868738), 354 depois —
--   as +8 são DESTE arquivo, todas ESCOPO: 6 `v_rc <> 1` (cada escrita das sementes de (g), (h),
--   (i), (k), (l) atinge exatamente UMA linha), `v_ran <> 2` de (j) (as duas fases, base e
--   mordida, têm de ter rodado) e o `<> 0` de (l) (nenhuma linha do próprio decisor com
--   `pode_responder`). Achados que tocam os objetos que v2 passou a vigiar: `funil34_kpis_smokes.sql:160,177`
--   (KPIs vazios / `v_a <> 0` do recrutador não-dono — a PREMISSA de posse que o 0003 inverte;
--   disposição no 50-09), `p44_pedidos_dados_smoke.sql:357` (escopo: as duas RPCs do p44) e
--   `p42_revisao_art20_smoke.sql:695,725` (deltas da própria fixture — escopo). Formas que o
--   padrão NÃO vê e que este arquivo usa, todas escopo deliberado e comentadas no lugar: a lista
--   das 14 policies de (j) (`c_escopo`), as chaves do MAPA de (i) (união com o conjunto por forma —
--   nunca o restringe) e o esperado 13.
--
-- COMO RODAR:
--   · antes do apply (50-01/50-02): só dentro do ensaio que aborta —
--     `node scripts/p50_ensaio.cjs supabase/tests/p50_acesso_recrutador_smoke.sql`
--     (prefixa a migration que falta no ledger, roda este arquivo e aborta no sentinela).
--   · depois do apply: TAMBÉM só dentro do ensaio que aborta, contra os objetos VIVOS —
--     `node scripts/p50_ensaio.cjs --sem-migracoes supabase/tests/p50_acesso_recrutador_smoke.sql`
--     (aborta no sentinela, `lock_timeout`/`statement_timeout` do prefixo, leitura de
--     persistência antes e depois). Veredito: `ENSAIO VERDE: … smoke50=13/13 …`.
--   · v2 (50-07, antes do apply do 50-10): `node scripts/p50_ensaio.cjs --vistas
--     supabase/tests/p50_acesso_recrutador_smoke.sql` — modo padrão: prefixa 20261005000002,
--     …0003 e …0004 (as que estão no disco e fora do ledger); `vistas=igual` seguido OPCIONALMENTE
--     de `+fechou[…]` (decisão «A» do operador, 50-03) e nada mais.
--   · ⚠ PROIBIDO: `node p46apply.cjs run` DESTE arquivo (WR-01 do 50-REVIEW-TRACER-2). O `run`
--     COMMITA: o que segura as escritas acima é só o envelope P50C1, escrito à mão em cada
--     cláusula; uma escrita fora dele (ou um bloco que termine normalmente) gravaria em PROD —
--     candidatura real excluída, administrador rebaixado — sem teto de lock e sem nenhuma
--     leitura de persistência, com o smoke verde (ele julga ANTES do commit).
--     Desde o WR-03 do 50-REVIEW-TRACER-3 a proibição é ESTRUTURAL: a primeira instrução deste
--     arquivo (bloco `$p50_so_ensaio$`, logo abaixo do cabeçalho) exige a marca `p50.tx` que só o
--     PREFIXO do ensaio grava, e recusa com `P50C RECUSADO (fora do ensaio)` antes de qualquer
--     escrita. Uma cópia temporária do arquivo (p.ex. a parcial do 50-07) roda igual — pelo ensaio.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), não uma fotografia do banco. Vive num ÚNICO literal (`smoke50.esperado`, abaixo);
-- o bloco do gate e o JSON final LEEM a GUC. Hoje: 13 — a, b, c, d, e, f, g, h, i, j, k, l, z.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- GUARDA ESTRUTURAL — PRIMEIRA instrução do arquivo (WR-03 do 50-REVIEW-TRACER-3). Este smoke
-- ESCREVE (envelopes P50C1) e só pode rodar dentro de `scripts/p50_ensaio.cjs` (ou de
-- `p50_mutacoes.cjs`, que compõe pelo mesmo `compor`): o PREFIXO do ensaio grava o txid da
-- requisição na GUC LOCAL `p50.tx`, e aborta tudo no sentinela. Fora dele — `node p46apply.cjs run`
-- deste arquivo, o SQL Editor, o `execute_sql` do MCP, qualquer via que COMMITA — a marca não existe
-- e o arquivo para AQUI, antes de qualquer escrita, para todo plano e executor (a proibição deixou
-- de depender de cada documento repeti-la). A marca é LOCAL: um valor velho de outra transação no
-- pool é outro txid e também é recusado. Não chama `txid_current()` quando a marca falta (nada a
-- comparar; e assim a recusa vale também numa transação READ ONLY).
-- ─────────────────────────────────────────────────────────────────────────────
DO $p50_so_ensaio$
DECLARE
  v_tx text := coalesce(current_setting('p50.tx', true), '');
BEGIN
  IF v_tx = '' THEN
    RAISE EXCEPTION 'P50C RECUSADO (fora do ensaio): este smoke ESCREVE (envelopes P50C1 em linhas reais de usuarios_rh e candidaturas) e so roda dentro de scripts/p50_ensaio.cjs, que marca a requisicao (p50.tx) e a aborta no sentinela; p46apply.cjs run COMMITA e e proibido. Nada rodou. Use: node scripts/p50_ensaio.cjs [--sem-migracoes] supabase/tests/p50_acesso_recrutador_smoke.sql';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P50C RECUSADO (fora do ensaio): a marca p50.tx (%) nao e desta transacao (%): a requisicao nao e a que o ensaio abriu. Nada rodou', v_tx, txid_current();
  END IF;
END
$p50_so_ensaio$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('smoke50.pass', '0', false);
SELECT set_config('smoke50.esperado', '13', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores vivos (leitura, como postgres), vagas por status e populações.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_ativo    uuid;
  v_inativo  uuid;
  v_inat_mp  uuid;
  v_admin    uuid;
  v_cand     uuid;
  v_cand_ids text;
  v_vaga     uuid;
  v_n        bigint;
  s          text;
BEGIN
  SELECT u.user_id INTO v_ativo
    FROM public.usuarios_rh u
   WHERE u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id)
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.user_id)
   ORDER BY (u.role = 'recrutador') DESC, u.created_at, u.user_id
   LIMIT 1;
  IF v_ativo IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (baseline): nenhuma linha usuarios_rh ATIVA sem vaga propria e sem linha de candidato — sem ela (c) nao teria ator';
  END IF;

  SELECT u.user_id INTO v_inativo
    FROM public.usuarios_rh u
   WHERE u.role = 'recrutador' AND NOT u.ativo AND u.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.user_id)
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_inativo IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (baseline): nenhum recrutador INATIVO (sem linha de candidato) — a negativa do token antigo (d) nao teria ator';
  END IF;

  -- WR-02: a negativa do token antigo com o MESMO papel do positivo a_ativo, não excluída, sem
  -- vaga e sem linha de candidato — difere de a_ativo SÓ em `ativo`. Sem ela, um helper que
  -- filtrasse papel em vez de `ativo` passaria (a_inativo é recrutador, a_ativo administrador).
  SELECT u.user_id INTO v_inat_mp
    FROM public.usuarios_rh u
   WHERE u.role = (SELECT a.role FROM public.usuarios_rh a WHERE a.user_id = v_ativo)
     AND NOT u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id)
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.user_id)
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_inat_mp IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (baseline): nenhuma linha INATIVA, nao excluida, sem vaga e sem candidato com o MESMO papel de a_ativo — a negativa (b)/(d) inativo_mesmo_papel nao teria ator';
  END IF;

  -- (b)/(c) trocam o papel de a_ativo para `recrutador` dentro do envelope P50C1. Se a_ativo é
  -- o ÚNICO administrador ativo, o trigger `trg_usuarios_rh_anti_lockout` recusa a troca: falhar
  -- aqui, com o motivo, em vez de lá como «erro inesperado».
  IF EXISTS (SELECT 1 FROM public.usuarios_rh a WHERE a.user_id = v_ativo AND a.role = 'administrador')
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh o
                      WHERE o.role = 'administrador' AND o.ativo AND o.deleted_at IS NULL AND o.user_id IS DISTINCT FROM v_ativo) THEN
    RAISE EXCEPTION 'P50C FAIL (baseline): a_ativo (%) e o unico administrador ativo — o anti_lockout recusaria a troca de papel de (b)/(c)', v_ativo;
  END IF;

  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (baseline): nenhum administrador ATIVO — a clausula (e) nao teria ator';
  END IF;

  SELECT ca.user_id INTO v_cand
    FROM public.candidatos ca
   WHERE ca.user_id IS NOT NULL AND ca.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = ca.user_id)
     AND EXISTS (SELECT 1 FROM public.candidaturas c
                  WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false)
   ORDER BY ca.created_at, ca.user_id
   LIMIT 1;
  IF v_cand IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (baseline): nenhum candidato com candidatura viva e sem linha usuarios_rh — a negativa do candidato (d) nao teria ator';
  END IF;
  SELECT string_agg(ca.id::text, ',' ORDER BY ca.id) INTO v_cand_ids
    FROM public.candidatos ca WHERE ca.user_id = v_cand;

  FOREACH s IN ARRAY ARRAY['ativa', 'inativa', 'arquivada'] LOOP
    v_vaga := NULL;
    SELECT v.id, count(*) INTO v_vaga, v_n
      FROM public.vagas v
      JOIN public.candidaturas c ON c.vaga_id = v.id AND c.deleted_at IS NULL AND c.is_rascunho = false
     WHERE v.status::text = s AND v.deleted_at IS NULL
     GROUP BY v.id
     ORDER BY count(*) DESC, v.id
     LIMIT 1;
    IF v_vaga IS NULL THEN
      RAISE EXCEPTION 'P50C FAIL (baseline): nenhuma vaga % (viva) com candidatura viva — SC1 exige uma por status', s;
    END IF;
    PERFORM set_config('smoke50.vaga_' || s, v_vaga::text, false);
    PERFORM set_config('smoke50.n_' || s, v_n::text, false);
  END LOOP;

  PERFORM set_config('smoke50.a_ativo',   v_ativo::text,   false);
  PERFORM set_config('smoke50.a_inativo', v_inativo::text, false);
  PERFORM set_config('smoke50.a_inativo_mp', v_inat_mp::text, false);
  PERFORM set_config('smoke50.a_admin',   v_admin::text,   false);
  PERFORM set_config('smoke50.a_cand',    v_cand::text,    false);
  PERFORM set_config('smoke50.cand_ids',  v_cand_ids,      false);

  PERFORM set_config('smoke50.n_total', (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke50.n_vivas', (SELECT count(*) FROM public.candidaturas c
                                          WHERE c.deleted_at IS NULL AND c.is_rascunho = false)::text, false);
  PERFORM set_config('smoke50.n_borda', (SELECT count(*) FROM public.candidaturas c
                                          WHERE c.deleted_at IS NOT NULL OR c.is_rascunho)::text, false);
  PERFORM set_config('smoke50.n_cand_proprias', (SELECT count(*) FROM public.candidaturas c
                                          WHERE c.candidato_id = ANY (string_to_array(v_cand_ids, ',')::uuid[]))::text, false);

  -- (z) baseline
  PERFORM set_config('smoke50.z_cand',  (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke50.z_vagas', (SELECT count(*) FROM public.vagas)::text, false);
  PERFORM set_config('smoke50.z_urh',   (SELECT count(*) FROM public.usuarios_rh)::text, false);
  PERFORM set_config('smoke50.z_solic', (SELECT count(*) FROM public.solicitacoes_dados)::text, false);
  PERFORM set_config('smoke50.z_df',    (SELECT count(*) FROM public.decisao_final)::text, false);

  -- (h) claim `visualizador` com a MESMA linha ativa de a_ativo (difere do positivo só no claim).
  PERFORM set_config('smoke50.a_visualizador', v_ativo::text, false);
  -- as candidaturas de a_cand (para «0 linhas cuja candidatura não é dele» em (h)).
  PERFORM set_config('smoke50.cand_cids', coalesce((SELECT string_agg(c.id::text, ',' ORDER BY c.id)
                                            FROM public.candidaturas c
                                           WHERE c.candidato_id = ANY (string_to_array(v_cand_ids, ',')::uuid[])), ''), false);

  -- (g)/(h) CONJUNTO DE RELAÇÕES POR FORMA — sem lista literal. Toda tabela (qualquer schema) com
  -- policy cujo qual/with_check chama `is_active_rh_user` OU traz a forma de igualdade
  -- `= 'rh'::text` (a forma antiga, de posse, também a tem: uma policy revertida à posse continua
  -- no conjunto e é medida), mais `public.v_analises_presas` (escopo deliberado: a view que o
  -- D-05 pôs em security_invoker). Forma por relação, lida do qual das policies SELECT/ALL do
  -- conjunto: B = o ramo cita `candidatura_id` (filhas de candidatura VIVA); A_viva = cita
  -- `deleted_at`/`is_rascunho` da própria linha (candidaturas); A = nenhum dos dois (todas as
  -- linhas). População como postgres: B = linhas cuja candidatura é viva; A_viva = linhas vivas;
  -- A = todas. A view entra como B (ela expõe `candidatura_id`).
  PERFORM set_config('smoke50.rels', coalesce((
    WITH pol AS (
      SELECT p.schemaname AS sch, p.tablename AS tab, p.cmd AS cmd, coalesce(p.qual, '') AS q
        FROM pg_catalog.pg_policies p
       WHERE (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~ 'is_active_rh_user|= ''rh''::text'
    ), rel AS (
      SELECT sch, tab,
             CASE WHEN coalesce(bool_or(q ~ 'candidatura_id') FILTER (WHERE cmd IN ('SELECT', 'ALL')), false) THEN 'B'
                  WHEN coalesce(bool_or(q ~ 'deleted_at|is_rascunho') FILTER (WHERE cmd IN ('SELECT', 'ALL')), false) THEN 'A_viva'
                  ELSE 'A' END AS forma
        FROM pol GROUP BY sch, tab
      UNION
      SELECT 'public', 'v_analises_presas', 'B'
    )
    SELECT jsonb_agg(jsonb_build_object('s', sch, 't', tab, 'forma', forma) ORDER BY sch, tab)::text FROM rel), '[]'), false);
END
$baseline$;

-- População REAL (antes de qualquer semente) de cada relação do conjunto — impressa no JSON e
-- na evidência; a de (g)/(h) é re-medida depois de semear.
RESET ROLE;
DO $baseline_pop$
DECLARE
  r     jsonb;
  v_n   bigint;
  v_out jsonb := '[]';
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(current_setting('smoke50.rels')::jsonb) LOOP
    EXECUTE format(
      CASE r ->> 'forma'
        WHEN 'B'      THEN 'SELECT count(*) FROM %I.%I t WHERE t.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)'
        WHEN 'A_viva' THEN 'SELECT count(*) FROM %I.%I t WHERE t.deleted_at IS NULL AND t.is_rascunho = false'
        ELSE               'SELECT count(*) FROM %I.%I t'
      END, r ->> 's', r ->> 't') INTO v_n;
    v_out := v_out || jsonb_build_array(r || jsonb_build_object('pop', v_n));
  END LOOP;
  IF jsonb_array_length(v_out) < 2 THEN
    RAISE EXCEPTION 'P50C FAIL (baseline): o conjunto de relacoes por forma tem % relacao(oes) — sem as policies do rh no catalogo (g)/(h) seriam vacuas', jsonb_array_length(v_out);
  END IF;
  PERFORM set_config('smoke50.rels', v_out::text, false);
END
$baseline_pop$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) forma e ACL do helper.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a$
DECLARE
  v_err       text;
  v_ran       boolean := false;
  v_b         boolean;
  a_oid       regprocedure := to_regprocedure('public.is_active_rh_user()');
  a_secdef    boolean;
  a_vol       "char";
  a_conf      text[];
  a_anon_priv boolean;
  a_auth_priv boolean;
  a_anon_call text := '<nao rodou>';
BEGIN
  IF a_oid IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (a): public.is_active_rh_user() nao existe — a migration 20261005000001 nao foi aplicada nem prefixada';
  END IF;
  SELECT p.prosecdef, p.provolatile, p.proconfig INTO a_secdef, a_vol, a_conf
    FROM pg_catalog.pg_proc p WHERE p.oid = a_oid;
  a_anon_priv := coalesce(has_function_privilege('anon',          a_oid, 'EXECUTE'), true);
  a_auth_priv := coalesce(has_function_privilege('authenticated', a_oid, 'EXECUTE'), false);

  BEGIN
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN
      v_b := public.is_active_rh_user();
      a_anon_call := 'ACEITO:' || coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN a_anon_call := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (a): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF a_secdef IS DISTINCT FROM true OR a_vol IS DISTINCT FROM 's'
     OR a_conf IS NULL OR NOT ('search_path=""' = ANY (a_conf)) THEN
    RAISE EXCEPTION 'P50C FAIL (a): forma do helper — prosecdef=% provolatile=% proconfig=% (esperado true, s, search_path="")',
      a_secdef, a_vol, a_conf;
  END IF;
  IF a_anon_priv OR NOT a_auth_priv THEN
    RAISE EXCEPTION 'P50C FAIL (a): ACL do helper — anon=% authenticated=% (esperado false/true: o grant do pg_default_acl a anon e DIRETO; a policy roda com o papel de quem consulta)',
      a_anon_priv, a_auth_priv;
  END IF;
  IF a_anon_call NOT LIKE '42501:%permission denied for function is_active_rh_user%' THEN
    RAISE EXCEPTION 'P50C FAIL (a): sob SET LOCAL ROLE anon a chamada deu «%» (esperado 42501 permission denied for function is_active_rh_user — o ACL, nao a guarda)',
      a_anon_call;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) semântica do helper — verdadeiro só para linha usuarios_rh ATIVA.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $b$
DECLARE
  v_ativo   uuid := current_setting('smoke50.a_ativo')::uuid;
  v_inativo uuid := current_setting('smoke50.a_inativo')::uuid;
  v_inat_mp uuid := current_setting('smoke50.a_inativo_mp')::uuid;
  v_admin   uuid := current_setting('smoke50.a_admin')::uuid;
  v_cand    uuid := current_setting('smoke50.a_cand')::uuid;
  v_err     text;
  v_ran     boolean := false;
  v_b       boolean;
  v_rc      int;
  b_ativo   text := '<nao rodou>';  b_admin text := '<nao rodou>';  b_inativo text := '<nao rodou>';
  b_rand    text := '<nao rodou>';  b_sem   text := '<nao rodou>';  b_cand    text := '<nao rodou>';
  b_inat_mp text := '<nao rodou>';  b_rec   text := '<nao rodou>';  b_excl    text := '<nao rodou>';
  b_rot     text[] := '{}';
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_ativo := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_ativo := SQLSTATE || ':' || SQLERRM; END;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'administrador'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_admin := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_admin := SQLSTATE || ':' || SQLERRM; END;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_inativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_inativo := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_inativo := SQLSTATE || ':' || SQLERRM; END;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_rand := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_rand := SQLSTATE || ':' || SQLERRM; END;

    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN v_b := public.is_active_rh_user(); b_sem := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_sem := SQLSTATE || ':' || SQLERRM; END;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cand::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_cand := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_cand := SQLSTATE || ':' || SQLERRM; END;

    -- WR-02: inativa com o MESMO papel de a_ativo (difere dele só em `ativo`).
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_inat_mp::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_inat_mp := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_inat_mp := SQLSTATE || ':' || SQLERRM; END;

    -- WR-02: o caminho REAL — linha `recrutador` ativa + claim `rh` (o par que o hook emite).
    -- Não há recrutador ativo em PROD e o D-10 proíbe reativar a conta que existe: a MESMA linha
    -- de a_ativo vira `recrutador` aqui, como postgres, e o RAISE P50C1 abaixo a reverte.
    RESET ROLE;
    UPDATE public.usuarios_rh SET role = 'recrutador' WHERE user_id = v_ativo;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'troca de papel de a_ativo atingiu % linha(s), esperado 1', v_rc; END IF;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_rec := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_rec := SQLSTATE || ':' || SQLERRM; END;

    -- IN-06: a MESMA linha recrutador ativa, agora EXCLUÍDA (`deleted_at`) e ainda `ativo`:
    -- difere do positivo acima só em `deleted_at`. Revertida pelo mesmo RAISE P50C1.
    RESET ROLE;
    UPDATE public.usuarios_rh SET deleted_at = now() WHERE user_id = v_ativo;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'exclusao de a_ativo atingiu % linha(s), esperado 1', v_rc; END IF;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_excl := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_excl := SQLSTATE || ':' || SQLERRM; END;

    RESET ROLE;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (b): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  -- positivos (controles) primeiro: um falso aqui torna os falsos abaixo VACUOS.
  IF b_ativo  IS DISTINCT FROM 'true'  THEN b_rot := b_rot || 'c_ativo'::text; END IF;
  IF b_admin  IS DISTINCT FROM 'true'  THEN b_rot := b_rot || 'c_admin'::text; END IF;
  -- `rec_ativo` NÃO é c_*: um recrutador ativo recusado é o D-01 quebrado, não instrumento vácuo.
  IF b_rec    IS DISTINCT FROM 'true'  THEN b_rot := b_rot || 'rec_ativo'::text; END IF;
  IF b_inativo IS DISTINCT FROM 'false' THEN b_rot := b_rot || 'inativo'::text; END IF;
  IF b_inat_mp IS DISTINCT FROM 'false' THEN b_rot := b_rot || 'inativo_mesmo_papel'::text; END IF;
  IF b_excl   IS DISTINCT FROM 'false' THEN b_rot := b_rot || 'ativo_excluido'::text; END IF;
  IF b_rand   IS DISTINCT FROM 'false' THEN b_rot := b_rot || 'aleatorio'::text; END IF;
  IF b_sem    IS DISTINCT FROM 'false' THEN b_rot := b_rot || 'sem_claims'::text; END IF;
  IF b_cand   IS DISTINCT FROM 'false' THEN b_rot := b_rot || 'candidato'::text; END IF;
  IF cardinality(b_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (b): [%]: ativo=% admin=% recrutador_ativo=% inativo=% inativo_mesmo_papel=% ativo_excluido=% aleatorio=% sem_claims=% candidato=% (esperado true,true,true,false,false,false,false,false,false; rotulo c_* = controle, nao portao aberto)',
      array_to_string(b_rot, ','), b_ativo, b_admin, b_rec, b_inativo, b_inat_mp, b_excl, b_rand, b_sem, b_cand;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) SC1 por impersonação — rh ativo SEM vaga própria vê as candidaturas das três vagas.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c$
DECLARE
  v_ativo uuid   := current_setting('smoke50.a_ativo')::uuid;
  v_va    uuid   := current_setting('smoke50.vaga_ativa')::uuid;
  v_vi    uuid   := current_setting('smoke50.vaga_inativa')::uuid;
  v_vq    uuid   := current_setting('smoke50.vaga_arquivada')::uuid;
  n_va    bigint := current_setting('smoke50.n_ativa')::bigint;
  n_vi    bigint := current_setting('smoke50.n_inativa')::bigint;
  n_vq    bigint := current_setting('smoke50.n_arquivada')::bigint;
  n_vivas bigint := current_setting('smoke50.n_vivas')::bigint;
  v_err   text;
  v_ran   boolean := false;
  v_n     bigint;
  v_rc    int;
  c_va    text := '<nao rodou>';  c_vi text := '<nao rodou>';  c_vq text := '<nao rodou>';  c_tot text := '<nao rodou>';
  c_rec   text := '<nao rodou>';
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.vaga_id = v_va; c_va := v_n::text;
    EXCEPTION WHEN OTHERS THEN c_va := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.vaga_id = v_vi; c_vi := v_n::text;
    EXCEPTION WHEN OTHERS THEN c_vi := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.vaga_id = v_vq; c_vq := v_n::text;
    EXCEPTION WHEN OTHERS THEN c_vq := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; c_tot := v_n::text;
    EXCEPTION WHEN OTHERS THEN c_tot := SQLSTATE || ':' || SQLERRM; END;

    -- WR-02: o caminho REAL pela policy — a mesma linha como `recrutador` (revertida pelo P50C1).
    RESET ROLE;
    UPDATE public.usuarios_rh SET role = 'recrutador' WHERE user_id = v_ativo;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'troca de papel de a_ativo atingiu % linha(s), esperado 1', v_rc; END IF;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; c_rec := v_n::text;
    EXCEPTION WHEN OTHERS THEN c_rec := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (c): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF n_va < 1 OR n_vi < 1 OR n_vq < 1 THEN
    RAISE EXCEPTION 'P50C FAIL (c): populacao vazia — vivas por vaga ativa=% inativa=% arquivada=% (cada uma >= 1; senao a igualdade e vacua)', n_va, n_vi, n_vq;
  END IF;
  IF c_va IS DISTINCT FROM n_va::text OR c_vi IS DISTINCT FROM n_vi::text OR c_vq IS DISTINCT FROM n_vq::text
     OR c_tot IS DISTINCT FROM n_vivas::text OR c_rec IS DISTINCT FROM n_vivas::text THEN
    RAISE EXCEPTION 'P50C FAIL (c): rh ativo sem vaga propria (%) viu ativa=«%» inativa=«%» arquivada=«%» total=«%» ; a mesma linha como recrutador total=«%» (esperado %, %, %, %, % — as vivas como postgres; D-01: todas as vagas, qualquer status). Sob o snapshot unico do ensaio (REPEATABLE READ) baseline e (c) leem o MESMO banco: uma diferenca, mesmo pequena, e da POLICY, nao de trafego — repetir da o mesmo vermelho',
      v_ativo, c_va, c_vi, c_vq, c_tot, c_rec, n_va, n_vi, n_vq, n_vivas, n_vivas;
  END IF;
  PERFORM set_config('smoke50.c_visto', c_tot, false);
  PERFORM set_config('smoke50.c_visto_rec', c_rec, false);
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$c$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) SC2 — token antigo, candidato, sem claims e anon não veem o que não é deles.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $d$
DECLARE
  v_ativo   uuid   := current_setting('smoke50.a_ativo')::uuid;
  v_inativo uuid   := current_setting('smoke50.a_inativo')::uuid;
  v_inat_mp uuid   := current_setting('smoke50.a_inativo_mp')::uuid;
  v_cand    uuid   := current_setting('smoke50.a_cand')::uuid;
  v_ids     uuid[] := string_to_array(current_setting('smoke50.cand_ids'), ',')::uuid[];
  v_err     text;
  v_ran     boolean := false;
  v_n       bigint;
  d_inativo text := '<nao rodou>';
  d_inat_mp text := '<nao rodou>';
  d_proprias text := '<nao rodou>';
  d_alheias text := '<nao rodou>';
  d_sem     text := '<nao rodou>';
  d_anon    text := '<nao rodou>';
  d_visual  text := '<nao rodou>';
  d_gerente text := '<nao rodou>';
  d_semrole text := '<nao rodou>';
  d_rot     text[] := '{}';
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    -- recrutador DESATIVADO com token ainda válido (claim rh) — D-02 / D-11
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_inativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_inativo := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_inativo := SQLSTATE || ':' || SQLERRM; END;
    -- WR-02: token antigo com o MESMO papel do positivo de (c)
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_inat_mp::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_inat_mp := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_inat_mp := SQLSTATE || ':' || SQLERRM; END;

    -- WR-01: a MESMA linha ATIVA do positivo de (c), com claim DIFERENTE de `rh`. O helper é
    -- role-agnóstico de propósito; o único filtro de papel do ramo é o conjunto do claim `rh`.
    -- `visualizador`/`gerente` passam no `check_role` e o hook os emite; sem `role` = token sem
    -- papel. a_ativo não tem linha em `candidatos`: o esperado é 0 exato.
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'visualizador'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_visual := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_visual := SQLSTATE || ':' || SQLERRM; END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'gerente'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_gerente := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_gerente := SQLSTATE || ':' || SQLERRM; END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object())::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_semrole := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_semrole := SQLSTATE || ':' || SQLERRM; END;

    -- candidato: as próprias (controle) e nenhuma alheia
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cand::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.candidato_id = ANY (v_ids); d_proprias := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_proprias := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE NOT (c.candidato_id = ANY (v_ids)); d_alheias := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_alheias := SQLSTATE || ':' || SQLERRM; END;

    -- authenticated sem claims
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_sem := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_sem := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;

    -- anon
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_anon := 'contagem=' || v_n::text;
    EXCEPTION WHEN OTHERS THEN d_anon := 'recusada=' || SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (d): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF d_proprias !~ '^[0-9]+$' OR d_proprias::bigint < 1 THEN d_rot := d_rot || 'c_cand'::text; END IF;
  IF d_inativo  IS DISTINCT FROM '0' THEN d_rot := d_rot || 'inativo'::text; END IF;
  IF d_inat_mp  IS DISTINCT FROM '0' THEN d_rot := d_rot || 'inativo_mesmo_papel'::text; END IF;
  IF d_visual   IS DISTINCT FROM '0' THEN d_rot := d_rot || 'ativo_visualizador'::text; END IF;
  IF d_gerente  IS DISTINCT FROM '0' THEN d_rot := d_rot || 'ativo_gerente'::text; END IF;
  IF d_semrole  IS DISTINCT FROM '0' THEN d_rot := d_rot || 'ativo_sem_role'::text; END IF;
  IF d_alheias  IS DISTINCT FROM '0' THEN d_rot := d_rot || 'cand_alheias'::text; END IF;
  IF d_sem      IS DISTINCT FROM '0' THEN d_rot := d_rot || 'sem_claims'::text; END IF;
  IF d_anon IS DISTINCT FROM 'contagem=0' AND d_anon NOT LIKE 'recusada=42501:%' THEN d_rot := d_rot || 'anon'::text; END IF;
  IF cardinality(d_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (d): [%]: rh inativo (token antigo)=«%» mesmo papel=«%» ; ativo com claim visualizador=«%» gerente=«%» sem role=«%» ; candidato proprias=«%» alheias=«%» ; sem claims=«%» ; anon=«%» (esperado 0, 0, 0, 0, 0, >=1, 0, 0, contagem=0 ou recusada 42501; rotulo c_* = controle vacuo)',
      array_to_string(d_rot, ','), d_inativo, d_inat_mp, d_visual, d_gerente, d_semrole, d_proprias, d_alheias, d_sem, d_anon;
  END IF;
  PERFORM set_config('smoke50.d_anon', d_anon, false);
  PERFORM set_config('smoke50.d_proprias', d_proprias, false);
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$d$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) administrador — vê TODAS; disjunto dele = o de hoje (D-02).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $e$
DECLARE
  -- ESCOPO deliberado (D-02), não fotografia: o texto desparseado do ramo do administrador.
  c_admin constant text := '(( SELECT (auth.jwt() #>> ''{app_metadata,role}''::text[])) = ''administrador''::text)';
  v_admin  uuid   := current_setting('smoke50.a_admin')::uuid;
  n_total  bigint := current_setting('smoke50.n_total')::bigint;
  v_err    text;
  v_ran    boolean := false;
  v_n      bigint;
  e_count  text := '<nao rodou>';
  v_qual   text;
  v_disj   text;
  v_depth  int := 0;
  v_inq    boolean := false;
  v_cut    int;
  v_ch     text;
  i        int;
  r        record;
  v_parte  text;
  e_npol   int := 0;
  e_rot    text[] := '{}';
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'administrador'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; e_count := v_n::text;
    EXCEPTION WHEN OTHERS THEN e_count := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (e): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF n_total < 1 OR e_count IS DISTINCT FROM n_total::text THEN
    e_rot := e_rot || 'admin_total'::text;
  END IF;

  -- O disjunto do administrador em TODA policy da forma de igualdade `= 'rh'::text` (qualquer
  -- schema; hoje as 14 que a fase reescreveu), no USING e no WITH CHECK: o primeiro termo de nível
  -- superior do OR tem de ser EXATAMENTE c_admin (D-02: byte-idêntico ao de antes).
  FOR r IN SELECT p.schemaname, p.tablename, p.policyname, p.qual, p.with_check
             FROM pg_catalog.pg_policies p
            WHERE (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~ '= ''rh''::text'
            ORDER BY p.schemaname, p.tablename, p.policyname LOOP
    e_npol := e_npol + 1;
    FOREACH v_parte IN ARRAY ARRAY['q', 'c'] LOOP
      v_qual := CASE v_parte WHEN 'q' THEN r.qual ELSE r.with_check END;
      CONTINUE WHEN v_parte = 'c' AND v_qual IS NULL;
      v_depth := 0;  v_inq := false;  v_cut := NULL;
      FOR i IN 1 .. coalesce(length(v_qual), 0) LOOP
        v_ch := substr(v_qual, i, 1);
        IF v_ch = '''' THEN
          v_inq := NOT v_inq;
        ELSIF NOT v_inq AND v_ch = '(' THEN
          v_depth := v_depth + 1;
        ELSIF NOT v_inq AND v_ch = ')' THEN
          v_depth := v_depth - 1;
        ELSIF NOT v_inq AND v_depth = 1 AND substr(v_qual, i, 4) = ' OR ' THEN
          v_cut := i;
          EXIT;
        END IF;
      END LOOP;
      v_disj := CASE WHEN v_cut IS NULL OR left(v_qual, 1) <> '(' THEN NULL ELSE substr(v_qual, 2, v_cut - 2) END;
      IF v_disj IS DISTINCT FROM c_admin THEN
        e_rot := e_rot || ('admin_disjunto' || CASE v_parte WHEN 'c' THEN '_check' ELSE '' END || ':'
                           || CASE WHEN r.schemaname = 'public' THEN '' ELSE r.schemaname || '.' END || r.tablename || '.' || r.policyname);
      END IF;
    END LOOP;
  END LOOP;
  IF e_npol < 1 THEN e_rot := e_rot || 'c_forma'::text; END IF;

  IF cardinality(e_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (e): [%]: o administrador ativo (%) viu «%» candidaturas (esperado o total como postgres = %, > 0) ; % policy(ies) da forma de igualdade, disjunto do administrador esperado «%» (D-02: byte-identico ao de antes; rotulo c_* = populacao da forma vazia). Sob o snapshot unico do ensaio (REPEATABLE READ) baseline e (e) leem o MESMO banco: uma diferenca e da POLICY, nao de trafego',
      array_to_string(e_rot, ','), v_admin, e_count, n_total, e_npol, c_admin;
  END IF;
  PERFORM set_config('smoke50.e_npol', e_npol::text, false);
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$e$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) forma da policy + BORDA SEMEADA (mortas e rascunhos fora do alcance do rh).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $f$
DECLARE
  v_ativo  uuid   := current_setting('smoke50.a_ativo')::uuid;
  v_admin  uuid   := current_setting('smoke50.a_admin')::uuid;
  v_err    text;
  v_ran    boolean := false;
  v_n      bigint;
  v_rc     int;
  v_sem    uuid[];
  v_rasc   uuid;
  v_excl   uuid;
  p_borda  text := '<nao rodou>';
  p_vivas  text := '<nao rodou>';
  f_rh     text := '<nao rodou>';
  f_rh_r   text := '<nao rodou>';
  f_rh_e   text := '<nao rodou>';
  f_rh_tot text := '<nao rodou>';
  f_adm    text := '<nao rodou>';
  f_adm_s  text := '<nao rodou>';
  f_rot    text[] := '{}';
  v_roles  text;
  v_qual   text;
  v_wc     text;
BEGIN
  SELECT p.roles::text, p.qual, p.with_check INTO v_roles, v_qual, v_wc
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'candidaturas' AND p.policyname = 'rh_le_candidaturas';

  -- WR-03: duas candidaturas VIVAS, lidas na execução, viram a população da BORDA (uma rascunho,
  -- outra excluída) só dentro do envelope P50C1. PROD não tem candidatura morta/rascunho
  -- (medido 2026-10-05: 40 de 40 vivas) — sem semear, a borda ficava vácua.
  SELECT array_agg(x.id ORDER BY x.id) INTO v_sem
    FROM (SELECT c.id FROM public.candidaturas c
           WHERE c.deleted_at IS NULL AND c.is_rascunho = false
           ORDER BY c.id LIMIT 2) x;
  IF coalesce(cardinality(v_sem), 0) < 2 THEN
    RAISE EXCEPTION 'P50C FAIL (f): menos de 2 candidaturas vivas para semear a BORDA — a clausula seria vacua';
  END IF;
  v_rasc := v_sem[1];
  v_excl := v_sem[2];

  BEGIN
    UPDATE public.candidaturas SET is_rascunho = true WHERE id = v_rasc;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'semear rascunho atingiu % linha(s), esperado 1', v_rc; END IF;
    UPDATE public.candidaturas SET deleted_at = now() WHERE id = v_excl;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'semear exclusao atingiu % linha(s), esperado 1', v_rc; END IF;
    -- a população, como postgres, DEPOIS de semear
    SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.deleted_at IS NOT NULL OR c.is_rascunho; p_borda := v_n::text;
    SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false; p_vivas := v_n::text;

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.deleted_at IS NOT NULL OR c.is_rascunho; f_rh := v_n::text;
    EXCEPTION WHEN OTHERS THEN f_rh := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.id = v_rasc; f_rh_r := v_n::text;
    EXCEPTION WHEN OTHERS THEN f_rh_r := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.id = v_excl; f_rh_e := v_n::text;
    EXCEPTION WHEN OTHERS THEN f_rh_e := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; f_rh_tot := v_n::text;
    EXCEPTION WHEN OTHERS THEN f_rh_tot := SQLSTATE || ':' || SQLERRM; END;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'administrador'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.deleted_at IS NOT NULL OR c.is_rascunho; f_adm := v_n::text;
    EXCEPTION WHEN OTHERS THEN f_adm := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.id = ANY (v_sem); f_adm_s := v_n::text;
    EXCEPTION WHEN OTHERS THEN f_adm_s := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (f): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF v_roles IS DISTINCT FROM '{authenticated}' THEN
    RAISE EXCEPTION 'P50C FAIL (f): roles de rh_le_candidaturas = % (esperado {authenticated} — anon nao pode avaliar a policy que chama o helper)', v_roles;
  END IF;
  -- Desparse mostra o helper sem schema: casar o nome solto.
  IF position('is_active_rh_user' IN coalesce(v_qual, '')) = 0 THEN
    RAISE EXCEPTION 'P50C FAIL (f): o qual de rh_le_candidaturas nao chama is_active_rh_user: %', v_qual;
  END IF;
  IF coalesce(v_qual, '') || coalesce(v_wc, '') ~* 'created_by' THEN
    RAISE EXCEPTION 'P50C FAIL (f): rh_le_candidaturas ainda casa created_by (posse como autorizacao): %', v_qual;
  END IF;

  -- BORDA semeada. Controles primeiro (c_*): a semente pegou e o administrador vê as semeadas;
  -- sem eles, um «rh viu 0» seria vácuo.
  IF p_borda !~ '^[0-9]+$' OR p_borda::bigint < 2 THEN f_rot := f_rot || 'c_populacao'::text; END IF;
  IF f_adm_s IS DISTINCT FROM '2'    THEN f_rot := f_rot || 'c_admin_semeadas'::text; END IF;
  IF f_adm   IS DISTINCT FROM p_borda THEN f_rot := f_rot || 'c_admin_borda'::text; END IF;
  IF f_rh_r  IS DISTINCT FROM '0'    THEN f_rot := f_rot || 'rh_ve_rascunho'::text; END IF;
  IF f_rh_e  IS DISTINCT FROM '0'    THEN f_rot := f_rot || 'rh_ve_excluida'::text; END IF;
  IF f_rh    IS DISTINCT FROM '0'    THEN f_rot := f_rot || 'rh_ve_borda'::text; END IF;
  IF f_rh_tot IS DISTINCT FROM p_vivas THEN f_rot := f_rot || 'rh_total'::text; END IF;
  IF cardinality(f_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (f): [%]: BORDA semeada (rascunho %, excluida %) — populacao como postgres=«%» ; rh ativo viu rascunho=«%» excluida=«%» borda=«%» total=«%» (esperado 0, 0, 0, vivas=%) ; administrador semeadas=«%» borda=«%» (esperado 2, %). rotulo c_* = controle vacuo; sob o snapshot unico do ensaio (REPEATABLE READ) a populacao como postgres e as vistas do rh/administrador leem o MESMO banco: um total que difere, mesmo por pouco, e da POLICY, nao de trafego',
      array_to_string(f_rot, ','), v_rasc, v_excl, p_borda, f_rh_r, f_rh_e, f_rh, f_rh_tot, p_vivas, f_adm_s, f_adm, p_borda;
  END IF;
  PERFORM set_config('smoke50.f_borda_rh', f_rh, false);
  PERFORM set_config('smoke50.f_borda_semeada', p_borda, false);
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$f$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (g) SC1 nas relações-filhas — rh ativo vê, em CADA relação do conjunto por forma, exatamente
--     a população como postgres. População 0 é SEMEADA dentro do envelope (ou listada em
--     `vacuos`, com o motivo) — nunca contada calada como prova.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $g$
DECLARE
  v_ativo  uuid   := current_setting('smoke50.a_ativo')::uuid;
  v_candid uuid[] := string_to_array(current_setting('smoke50.cand_ids'), ',')::uuid[];
  v_rels   jsonb  := current_setting('smoke50.rels')::jsonb;
  r        jsonb;
  v_nome   text;
  v_err    text;
  v_ran    boolean := false;
  v_n      bigint;
  v_rc     int;
  v_seed   uuid;
  v_pop    jsonb  := '{}';
  v_vis    jsonb  := '{}';
  v_sem    text[] := '{}';
  v_vac    text[] := '{}';
  v_ev     text;
  g_rot    text[] := '{}';
BEGIN
  BEGIN
    -- Semente, como postgres, para cada relação de população 0. Receita só para a view
    -- `v_analises_presas` (a definição dela, lida de `pg_get_viewdef`: candidatura viva de vaga
    -- ativa/rascunho, fora de finalizado/rejeitado, com análise `pendente` parada há > 10 min):
    -- uma análise `sucesso` antiga de um candidato que NÃO é a_cand vira `pendente` (sem trigger
    -- em analise_candidato_vaga — medido em 2026-10-05). As outras relações sem receita entram em
    -- `vacuos` com o motivo.
    FOR r IN SELECT * FROM jsonb_array_elements(v_rels) LOOP
      v_nome := CASE WHEN r ->> 's' = 'public' THEN r ->> 't' ELSE (r ->> 's') || '.' || (r ->> 't') END;
      CONTINUE WHEN (r ->> 'pop')::bigint > 0;
      IF v_nome = 'v_analises_presas' THEN
        v_seed := NULL;
        SELECT a.id INTO v_seed
          FROM public.analise_candidato_vaga a
          JOIN public.candidaturas c ON c.id = a.candidatura_id
          JOIN public.vagas v ON v.id = c.vaga_id
         WHERE c.deleted_at IS NULL AND c.is_rascunho = false AND v.deleted_at IS NULL
           AND v.status IN ('ativa', 'rascunho') AND c.status NOT IN ('finalizado', 'rejeitado')
           AND a.updated_at < now() - interval '1 hour'
           AND NOT (c.candidato_id = ANY (v_candid))
         ORDER BY a.id LIMIT 1;
        IF v_seed IS NULL THEN
          v_vac := v_vac || (v_nome || ':nenhuma analise elegivel para semear');
        ELSE
          UPDATE public.analise_candidato_vaga SET status = 'pendente' WHERE id = v_seed;
          GET DIAGNOSTICS v_rc = ROW_COUNT;
          IF v_rc <> 1 THEN RAISE EXCEPTION 'semear v_analises_presas atingiu % linha(s), esperado 1', v_rc; END IF;
          v_sem := v_sem || v_nome;
        END IF;
      ELSE
        v_vac := v_vac || (v_nome || ':sem receita de semeadura');
      END IF;
    END LOOP;

    -- População DEPOIS de semear, como postgres.
    FOR r IN SELECT * FROM jsonb_array_elements(v_rels) LOOP
      v_nome := CASE WHEN r ->> 's' = 'public' THEN r ->> 't' ELSE (r ->> 's') || '.' || (r ->> 't') END;
      EXECUTE format(
        CASE r ->> 'forma'
          WHEN 'B'      THEN 'SELECT count(*) FROM %I.%I t WHERE t.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)'
          WHEN 'A_viva' THEN 'SELECT count(*) FROM %I.%I t WHERE t.deleted_at IS NULL AND t.is_rascunho = false'
          ELSE               'SELECT count(*) FROM %I.%I t'
        END, r ->> 's', r ->> 't') INTO v_n;
      v_pop := v_pop || jsonb_build_object(v_nome, v_n::text);
      IF v_n = 0 AND NOT (v_nome = ANY (v_sem)) AND NOT EXISTS (SELECT 1 FROM unnest(v_vac) x WHERE x LIKE v_nome || ':%') THEN
        v_vac := v_vac || (v_nome || ':semente nao pegou');
      END IF;
    END LOOP;

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    FOR r IN SELECT * FROM jsonb_array_elements(v_rels) LOOP
      v_nome := CASE WHEN r ->> 's' = 'public' THEN r ->> 't' ELSE (r ->> 's') || '.' || (r ->> 't') END;
      BEGIN
        EXECUTE format('SELECT count(*) FROM %I.%I', r ->> 's', r ->> 't') INTO v_n;
        v_vis := v_vis || jsonb_build_object(v_nome, v_n::text);
      EXCEPTION WHEN OTHERS THEN v_vis := v_vis || jsonb_build_object(v_nome, SQLSTATE || ':' || left(SQLERRM, 80));
      END;
    END LOOP;
    RESET ROLE;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (g): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  SELECT array_agg(k ORDER BY k) INTO g_rot
    FROM jsonb_object_keys(v_pop) k
   WHERE (v_vis ->> k) IS DISTINCT FROM (v_pop ->> k);
  g_rot := coalesce(g_rot, '{}');

  -- Evidência (a requisição aborta: só sai pela GUC que o sentinela carrega). Sem dado pessoal.
  SELECT string_agg(
           (CASE WHEN x ->> 's' = 'public' THEN x ->> 't' ELSE (x ->> 's') || '.' || (x ->> 't') END)
           || ':' || (x ->> 'forma') || ':' || (x ->> 'pop') || '>'
           || (v_pop ->> (CASE WHEN x ->> 's' = 'public' THEN x ->> 't' ELSE (x ->> 's') || '.' || (x ->> 't') END)),
           ',' ORDER BY x ->> 's', x ->> 't')
    INTO v_ev FROM jsonb_array_elements(v_rels) x;
  PERFORM set_config('p50.evidencia', concat_ws(';', nullif(current_setting('p50.evidencia', true), ''),
            '07:pop=' || coalesce(v_ev, '-'),
            '07:semeadas=' || coalesce(nullif(array_to_string(v_sem, ','), ''), '-'),
            '07:vacuos=' || coalesce(nullif(array_to_string(v_vac, ','), ''), '-')), false);
  PERFORM set_config('smoke50.g_pop', v_pop::text, false);
  PERFORM set_config('smoke50.g_vis', v_vis::text, false);
  PERFORM set_config('smoke50.semeadas', to_jsonb(v_sem)::text, false);
  PERFORM set_config('smoke50.vacuos', to_jsonb(v_vac)::text, false);

  IF cardinality(g_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (g): [%]: rh ativo sem vaga propria (%) viu %, populacao como postgres (depois de semear) % ; vacuos=% (D-01: cada relacao do conjunto por forma, igual a populacao; sob o snapshot unico do ensaio a diferenca e da POLICY, nao de trafego)',
      array_to_string(g_rot, ','), v_ativo, v_vis, v_pop, v_vac;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$g$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (h) SC2 nas relações — token antigo (das duas linhas inativas), claim `visualizador` com a linha
--     ativa e candidato: nada que não seja dele, com o rh ativo da MESMA execução como controle.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $h$
DECLARE
  v_ativo   uuid   := current_setting('smoke50.a_ativo')::uuid;
  v_inativo uuid   := current_setting('smoke50.a_inativo')::uuid;
  v_inat_mp uuid   := current_setting('smoke50.a_inativo_mp')::uuid;
  v_visual  uuid   := current_setting('smoke50.a_visualizador')::uuid;
  v_cand    uuid   := current_setting('smoke50.a_cand')::uuid;
  v_candid  uuid[] := string_to_array(current_setting('smoke50.cand_ids'), ',')::uuid[];
  v_cids    uuid[] := coalesce(string_to_array(nullif(current_setting('smoke50.cand_cids'), ''), ',')::uuid[], '{}');
  v_rels    jsonb  := current_setting('smoke50.rels')::jsonb;
  r         jsonb;
  a         text;
  v_nome    text;
  v_sql     text;
  v_err     text;
  v_ran     boolean := false;
  v_n       bigint;
  v_rc      int;
  v_seed    uuid;
  v_pop     jsonb  := '{}';
  v_res     jsonb  := '{}';
  h_rot     text[] := '{}';
BEGIN
  BEGIN
    -- MESMA semente de (g) (cada cláusula é seu próprio envelope).
    FOR r IN SELECT * FROM jsonb_array_elements(v_rels) LOOP
      v_nome := CASE WHEN r ->> 's' = 'public' THEN r ->> 't' ELSE (r ->> 's') || '.' || (r ->> 't') END;
      CONTINUE WHEN (r ->> 'pop')::bigint > 0 OR v_nome <> 'v_analises_presas';
      v_seed := NULL;
      SELECT a2.id INTO v_seed
        FROM public.analise_candidato_vaga a2
        JOIN public.candidaturas c ON c.id = a2.candidatura_id
        JOIN public.vagas v ON v.id = c.vaga_id
       WHERE c.deleted_at IS NULL AND c.is_rascunho = false AND v.deleted_at IS NULL
         AND v.status IN ('ativa', 'rascunho') AND c.status NOT IN ('finalizado', 'rejeitado')
         AND a2.updated_at < now() - interval '1 hour'
         AND NOT (c.candidato_id = ANY (v_candid))
       ORDER BY a2.id LIMIT 1;
      IF v_seed IS NOT NULL THEN
        UPDATE public.analise_candidato_vaga SET status = 'pendente' WHERE id = v_seed;
        GET DIAGNOSTICS v_rc = ROW_COUNT;
        IF v_rc <> 1 THEN RAISE EXCEPTION 'semear v_analises_presas atingiu % linha(s), esperado 1', v_rc; END IF;
      END IF;
    END LOOP;
    FOR r IN SELECT * FROM jsonb_array_elements(v_rels) LOOP
      v_nome := CASE WHEN r ->> 's' = 'public' THEN r ->> 't' ELSE (r ->> 's') || '.' || (r ->> 't') END;
      EXECUTE format(
        CASE r ->> 'forma'
          WHEN 'B'      THEN 'SELECT count(*) FROM %I.%I t WHERE t.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false)'
          WHEN 'A_viva' THEN 'SELECT count(*) FROM %I.%I t WHERE t.deleted_at IS NULL AND t.is_rascunho = false'
          ELSE               'SELECT count(*) FROM %I.%I t'
        END, r ->> 's', r ->> 't') INTO v_n;
      v_pop := v_pop || jsonb_build_object(v_nome, v_n::text);
    END LOOP;

    FOREACH a IN ARRAY ARRAY['c_ativo', 'velho', 'velho_mp', 'visualizador', 'candidato'] LOOP
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object(
                'sub', (CASE a WHEN 'c_ativo' THEN v_ativo WHEN 'velho' THEN v_inativo WHEN 'velho_mp' THEN v_inat_mp
                               WHEN 'visualizador' THEN v_visual ELSE v_cand END)::text,
                'role', 'authenticated',
                'app_metadata', json_build_object('role', CASE a WHEN 'visualizador' THEN 'visualizador'
                                                               WHEN 'candidato' THEN 'candidato' ELSE 'rh' END))::text, true);
      FOR r IN SELECT * FROM jsonb_array_elements(v_rels) LOOP
        v_nome := CASE WHEN r ->> 's' = 'public' THEN r ->> 't' ELSE (r ->> 's') || '.' || (r ->> 't') END;
        -- candidato: só as linhas cuja candidatura NÃO é dele (as próprias são direito dele).
        v_sql := CASE
          WHEN a <> 'candidato' THEN format('SELECT count(*) FROM %I.%I t', r ->> 's', r ->> 't')
          WHEN r ->> 's' = 'public' AND r ->> 't' = 'candidaturas'
            THEN 'SELECT count(*) FROM public.candidaturas t WHERE NOT (t.id = ANY ($1))'
          WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_attribute pa
                        WHERE pa.attrelid = format('%I.%I', r ->> 's', r ->> 't')::regclass
                          AND pa.attname = 'candidatura_id' AND pa.attnum > 0 AND NOT pa.attisdropped)
            THEN format('SELECT count(*) FROM %I.%I t WHERE t.candidatura_id IS NULL OR NOT (t.candidatura_id = ANY ($1))', r ->> 's', r ->> 't')
          ELSE format('SELECT count(*) FROM %I.%I t', r ->> 's', r ->> 't')
        END;
        BEGIN
          EXECUTE v_sql INTO v_n USING v_cids;
          v_res := v_res || jsonb_build_object(a || '.' || v_nome, v_n::text);
        EXCEPTION WHEN OTHERS THEN v_res := v_res || jsonb_build_object(a || '.' || v_nome, SQLSTATE || ':' || left(SQLERRM, 80));
        END;
      END LOOP;
      RESET ROLE;
    END LOOP;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (h): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  -- Controle (c_ativo = população, como em (g)) e negativas (0 exato; erro também reprova —
  -- uma negativa que «passa» por erro passa pelo motivo errado).
  SELECT array_agg(x.k ORDER BY x.k) INTO h_rot
    FROM (SELECT key AS k, value #>> '{}' AS v FROM jsonb_each(v_res)) x
   WHERE (x.k LIKE 'c_ativo.%' AND x.v IS DISTINCT FROM (v_pop ->> substr(x.k, length('c_ativo.') + 1)))
      OR (x.k NOT LIKE 'c_ativo.%' AND x.v IS DISTINCT FROM '0');
  h_rot := coalesce(h_rot, '{}');
  IF cardinality(h_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (h): [%]: vistas por ator.relacao % ; populacao %. (esperado: c_ativo = populacao; velho, velho_mp, visualizador = 0; candidato = 0 linhas cuja candidatura nao e dele. rotulo c_* = controle vacuo)',
      array_to_string(h_rot, ','), v_res, v_pop;
  END IF;
  PERFORM set_config('smoke50.h_res', v_res::text, false);
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$h$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (i) SC2 e D-04 em CADA RPC do conjunto por forma — token antigo, sem papel, candidato e anon
--     recusados; o rh ativo da MESMA execução passa da autorização (controle).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $i$
DECLARE
  v_ativo   uuid   := current_setting('smoke50.a_ativo')::uuid;
  v_inativo uuid   := current_setting('smoke50.a_inativo')::uuid;
  v_inat_mp uuid   := current_setting('smoke50.a_inativo_mp')::uuid;
  v_cand    uuid   := current_setting('smoke50.a_cand')::uuid;
  v_candid  uuid[] := string_to_array(current_setting('smoke50.cand_ids'), ',')::uuid[];
  c_just    constant text := 'Sonda de autorizacao do smoke p50 (ensaio que aborta): nada aqui persiste nem e decisao real.';
  v_cid     uuid;
  v_ea      uuid;
  v_red     uuid;
  v_perg    uuid;
  v_vperg   uuid;
  v_map     jsonb;
  v_set     jsonb  := '[]';
  r         record;
  e         jsonb;
  a         text;
  v_sub     uuid;
  v_papel   text;
  v_res     text;
  v_out     jsonb  := '{}';
  v_anonp   jsonb  := '{}';
  v_err     text;
  v_ran     boolean := false;
  v_rc      int;
  v_tok     text;
  v_ev_a    text;
  v_ev_c    text;
  i_rot     text[] := '{}';
BEGIN
  -- Ids reais, lidos na execução (como postgres): uma candidatura VIVA cujo candidato NÃO é a_cand,
  -- com análise de entrevista (o id dela serve às assinaturas que pedem `p_analise_id`) e sem
  -- decisão revertida do próprio a_ativo (D-23 faria o controle positivo reprovar por OUTRA regra);
  -- uma redação de candidato que não é a_cand; uma pergunta de OUTRA vaga, que vira rascunho
  -- dentro do envelope (upsert_pergunta_opcoes_metadata recusa vaga fora de rascunho com P0001
  -- ANTES da linha do helper — sem isso o token antigo «passaria» pelo motivo errado).
  SELECT ea.candidatura_id, ea.id INTO v_cid, v_ea
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
   WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     AND NOT (c.candidato_id = ANY (v_candid))
     AND NOT EXISTS (SELECT 1 FROM public.decisao_final d
                      WHERE d.candidatura_id = c.id AND d.revisao_veredito = 'revertida' AND d.por_usuario = v_ativo)
     AND NOT EXISTS (SELECT 1 FROM public.decisao_final_historico h
                      WHERE h.candidatura_id = c.id AND h.revisao_veredito = 'revertida' AND h.por_usuario = v_ativo)
   ORDER BY ea.id LIMIT 1;
  SELECT rc.id INTO v_red
    FROM public.redacoes_candidato rc
    JOIN public.candidaturas c ON c.id = rc.candidatura_id
   WHERE NOT (c.candidato_id = ANY (v_candid))
   ORDER BY rc.id LIMIT 1;
  SELECT p.id, p.vaga_id INTO v_perg, v_vperg
    FROM public.perguntas_formulario p
    JOIN public.vagas v ON v.id = p.vaga_id
   WHERE p.deleted_at IS NULL AND v.deleted_at IS NULL
     AND v.id IS DISTINCT FROM (SELECT c.vaga_id FROM public.candidaturas c WHERE c.id = v_cid)
   ORDER BY p.id LIMIT 1;
  IF v_cid IS NULL OR v_ea IS NULL OR v_red IS NULL OR v_perg IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (i): sem fixture para as sondas — candidatura com analise de entrevista=% redacao=% pergunta=% (cada uma tem de existir; sem elas a clausula seria vacua)',
      v_cid IS NOT NULL, v_red IS NOT NULL, v_perg IS NOT NULL;
  END IF;

  -- MAPA DE ARGUMENTOS — escopo DELIBERADO, uma entrada por função (`proname/nargs`), com o TIPO
  -- (`leitura` devolve linhas, contagem, KPIs, histórico ou texto; `escrita` grava) e se a função
  -- tem GUARDA DE PAPEL. Tem de cobrir o conjunto por forma (senão `sem_sonda:<f>`); uma entrada
  -- do mapa que saiu do conjunto (perdeu o helper) continua sondada.
  v_map := jsonb_build_object(
    'listar_pedidos_dados/1',          jsonb_build_object('tipo', 'leitura', 'guarda', true,  'sql', 'SELECT ''n:'' || count(*) FROM public.listar_pedidos_dados(true)'),
    'contar_pedidos_dados_pendentes/0',jsonb_build_object('tipo', 'leitura', 'guarda', true,  'sql', 'SELECT ''i:'' || public.contar_pedidos_dados_pendentes()'),
    'listar_revisoes_decisao/1',       jsonb_build_object('tipo', 'leitura', 'guarda', true,  'sql', 'SELECT ''n:'' || count(*) FROM public.listar_revisoes_decisao(true)'),
    'contar_revisoes_pendentes/0',     jsonb_build_object('tipo', 'leitura', 'guarda', true,  'sql', 'SELECT ''i:'' || public.contar_revisoes_pendentes()'),
    'funil_kpis/1',                    jsonb_build_object('tipo', 'leitura', 'guarda', false, 'sql',
        'SELECT CASE WHEN coalesce((k -> ''knockout_rate'' ->> ''total'')::int, 0) = 0 AND k -> ''volume_by_stage'' = ''{}''::jsonb'
        || ' AND k -> ''conversion_stage_to_stage'' = ''[]''::jsonb AND k -> ''median_time_per_stage'' = ''{}''::jsonb'
        || ' THEN ''kpis:vazio'' ELSE ''kpis:cheio'' END FROM (SELECT public.funil_kpis(NULL::uuid) AS k) x'),
    'listar_historico_candidatura/1',  jsonb_build_object('tipo', 'leitura', 'guarda', true,  'sql', format('SELECT ''n:'' || count(*) FROM public.listar_historico_candidatura(%L::uuid)', v_cid)),
    'ler_resposta_caso_aberto_sjt/1',  jsonb_build_object('tipo', 'leitura', 'guarda', true,  'sql', format('SELECT ''j:'' || coalesce(public.ler_resposta_caso_aberto_sjt(%L::uuid) ->> ''situacao'', ''?'')', v_cid)),
    'registrar_decisao/3',             jsonb_build_object('tipo', 'escrita', 'guarda', true,  'sql', format('SELECT ''ok'' FROM public.registrar_decisao(%L::uuid, ''em_espera''::public.decisao_final_resultado, %L)', v_cid, c_just)),
    'rejeitar_candidatura/3',          jsonb_build_object('tipo', 'escrita', 'guarda', true,  'sql', format('SELECT ''ok'' FROM (SELECT public.rejeitar_candidatura(%L::uuid, ''outro''::public.motivo_rejeicao_rh, %L)) x', v_cid, c_just)),
    'liberar_cognitivo/2',             jsonb_build_object('tipo', 'escrita', 'guarda', true,  'sql', format('SELECT ''ok'' FROM (SELECT public.liberar_cognitivo(%L::uuid, NULL)) x', v_cid)),
    'revogar_cognitivo/2',             jsonb_build_object('tipo', 'escrita', 'guarda', true,  'sql', format('SELECT ''ok'' FROM (SELECT public.revogar_cognitivo(%L::uuid, NULL)) x', v_cid)),
    'reprocessar_analise/1',           jsonb_build_object('tipo', 'escrita', 'guarda', true,  'sql', format('SELECT ''ok'' FROM (SELECT public.reprocessar_analise(%L::uuid)) x', v_cid)),
    'confirmar_revisao_entrevista/1',  jsonb_build_object('tipo', 'escrita', 'guarda', true,  'sql', format('SELECT ''ok'' FROM (SELECT public.confirmar_revisao_entrevista(%L::uuid)) x', v_ea)),
    'salvar_avaliacao_entrevista/3',   jsonb_build_object('tipo', 'escrita', 'guarda', true,  'sql', format('SELECT ''ok'' FROM (SELECT public.salvar_avaliacao_entrevista(%L::uuid, ''{}''::jsonb, %L)) x', v_cid, c_just)),
    'salvar_avaliacao_entrevista/4',   jsonb_build_object('tipo', 'escrita', 'guarda', true,  'sql', format('SELECT ''ok'' FROM (SELECT public.salvar_avaliacao_entrevista(%L::uuid, %L::uuid, ''{}''::jsonb, %L)) x', v_cid, v_ea, c_just)),
    'save_entrevista_guia_edits/3',    jsonb_build_object('tipo', 'escrita', 'guarda', true,  'sql', format('SELECT ''ok'' FROM (SELECT public.save_entrevista_guia_edits(%L::uuid, ''online'', ''{}''::jsonb)) x', v_cid)),
    'salvar_revisao_redacao/4',        jsonb_build_object('tipo', 'escrita', 'guarda', true,  'sql', format('SELECT ''ok'' FROM (SELECT public.salvar_revisao_redacao(%L::uuid, ''aprovada'', %L, ''{}''::jsonb)) x', v_red, c_just)),
    'upsert_pergunta_opcoes_metadata/2', jsonb_build_object('tipo', 'escrita', 'guarda', true, 'sql', format('SELECT ''ok'' FROM (SELECT public.upsert_pergunta_opcoes_metadata(%L::uuid, ''[]''::jsonb)) x', v_perg)),
    -- Phase 51 (51-10): as duas RPCs do JORN-42 que chamam o helper (migrations 20261008000002/3) — sem
    -- estas entradas o conjunto por forma as acusa [sem_sonda:…]. Pedido INEXISTENTE de propósito: o
    -- helper vem ANTES da busca, então o token velho recebe 42501 e o rh ativo passa da autorização
    -- (P0002, erro de negócio). Mordida: MC7/MC8 de scripts/p51_mutacoes.cjs (helper fora → velho.*).
    'responder_revisao_rejeicao/3',    jsonb_build_object('tipo', 'escrita', 'guarda', true,  'sql', format('SELECT ''ok'' FROM (SELECT public.responder_revisao_rejeicao(gen_random_uuid(), ''mantida'', %L)) x', c_just)),
    'ler_contexto_knockout_revisao/1', jsonb_build_object('tipo', 'leitura', 'guarda', true,  'sql', 'SELECT ''j:'' || coalesce(public.ler_contexto_knockout_revisao(gen_random_uuid()) ->> ''situacao'', ''?'')')
  );

  -- CONJUNTO POR FORMA: funções de `public` que chamam o helper ou trazem a forma do ramo rh
  -- (`v_role = 'rh'`), sem o próprio helper; mais as entradas do mapa que existem.
  SELECT coalesce(jsonb_agg(jsonb_build_object('k', x.k, 'oid', x.oid::bigint, 'forma', x.forma) ORDER BY x.k), '[]')
    INTO v_set
    FROM (SELECT p.proname || '/' || p.pronargs AS k, p.oid,
                 (p.prosrc ~ 'is_active_rh_user' OR p.prosrc ~ 'v_role\s*=\s*''rh''') AS forma
            FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname <> 'is_active_rh_user'
             AND (p.prosrc ~ 'is_active_rh_user' OR p.prosrc ~ 'v_role\s*=\s*''rh'''
                  OR (p.proname || '/' || p.pronargs) IN (SELECT jsonb_object_keys(v_map)))) x;
  FOR e IN SELECT * FROM jsonb_array_elements(v_set) LOOP
    IF NOT v_map ? (e ->> 'k') THEN i_rot := i_rot || ('sem_sonda:' || (e ->> 'k')); END IF;
    v_anonp := v_anonp || jsonb_build_object(e ->> 'k', has_function_privilege('anon', (e ->> 'oid')::oid, 'EXECUTE'));
  END LOOP;

  BEGIN
    UPDATE public.vagas SET status = 'rascunho' WHERE id = v_vperg;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'vaga da pergunta para rascunho atingiu % linha(s), esperado 1', v_rc; END IF;
    -- WR-08 (50-REVIEW-ACESSO-1): o positivo `ativo` tem de rodar o caminho REAL do recrutador
    -- também nas RPCs que leem o PAPEL de usuarios_rh, não do claim (`save_entrevista_guia_edits`,
    -- ENTREV-08). PROD não tem recrutador ativo e a_ativo é administrador: sem esta troca, ali o
    -- controle exercitava o ramo do ADMINISTRADOR e a linha `IF v_role = 'rh' AND NOT
    -- public.is_active_rh_user()` nunca era alcançada pelo positivo. Como em (b)/(c): a linha de
    -- a_ativo vira `recrutador` como postgres, revertida pelo P50C1 abaixo (e a baseline já
    -- recusou a_ativo como ÚNICO administrador ativo — o `trg_usuarios_rh_anti_lockout` não
    -- dispara aqui). Nas 17 RPCs que leem o papel do claim forjado `rh`, nada muda.
    UPDATE public.usuarios_rh SET role = 'recrutador' WHERE user_id = v_ativo;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'troca de papel de a_ativo para recrutador atingiu % linha(s), esperado 1', v_rc; END IF;

    FOR e IN SELECT * FROM jsonb_array_elements(v_set) LOOP
      CONTINUE WHEN NOT v_map ? (e ->> 'k');
      FOREACH a IN ARRAY ARRAY['ativo', 'velho', 'velho_mp', 'sem_papel', 'candidato', 'anon'] LOOP
        -- sem_papel: `sub` VÁLIDO (o de a_cand, usuário real sem linha usuarios_rh) e SEM
        -- `app_metadata.role` — a guarda de papel tem de recusar pelo `coalesce`, não pelo sub.
        v_sub := CASE a WHEN 'ativo' THEN v_ativo WHEN 'velho' THEN v_inativo WHEN 'velho_mp' THEN v_inat_mp ELSE v_cand END;
        v_papel := CASE a WHEN 'candidato' THEN 'candidato' WHEN 'sem_papel' THEN NULL ELSE 'rh' END;
        -- Cada chamada no SEU bloco, que SEMPRE desfaz (P50C2 carrega o resultado): a escrita de
        -- um controle positivo não contamina a sonda seguinte. SET LOCAL/claims locais também voltam.
        BEGIN
          IF a = 'anon' THEN
            SET LOCAL ROLE anon;
            PERFORM set_config('request.jwt.claims', '', true);
          ELSE
            SET LOCAL ROLE authenticated;
            PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sub::text, 'role', 'authenticated',
                      'app_metadata', CASE WHEN v_papel IS NULL THEN json_build_object()
                                           ELSE json_build_object('role', v_papel) END)::text, true);
          END IF;
          EXECUTE v_map -> (e ->> 'k') ->> 'sql' INTO v_res;
          RAISE EXCEPTION '%', coalesce(v_res, 'null') USING ERRCODE = 'P50C2';
        EXCEPTION
          WHEN SQLSTATE 'P50C2' THEN v_res := SQLERRM;
          WHEN OTHERS THEN v_res := 'e:' || SQLSTATE || ':' || left(SQLERRM, 60);
        END;
        RESET ROLE;
        v_out := v_out || jsonb_build_object(a || '.' || (e ->> 'k'), v_res);
      END LOOP;
    END LOOP;
    PERFORM set_config('request.jwt.claims', '', true);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (i): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  -- Um 40001 numa sonda é tráfego (escrita concorrente depois do snapshot), não autorização:
  -- reprovar como INESPERADO (40001: …) para os runners o classificarem como INCONCLUSIVO.
  SELECT string_agg(key, ',') INTO v_tok FROM jsonb_each_text(v_out) WHERE value LIKE 'e:40001:%';
  IF v_tok IS NOT NULL THEN
    RAISE EXCEPTION 'P50C FAIL (i): a subtransacao abortou por erro INESPERADO (40001: could not serialize access em %) — nada foi julgado', v_tok;
  END IF;

  FOR e IN SELECT * FROM jsonb_array_elements(v_set) LOOP
    CONTINUE WHEN NOT v_map ? (e ->> 'k');
    DECLARE
      k      text    := e ->> 'k';
      leit   boolean := (v_map -> k ->> 'tipo') = 'leitura';
      guarda boolean := (v_map -> k ->> 'guarda')::boolean;
      vazio  text[]  := ARRAY['n:0', 'i:0', 'kpis:vazio'];
      x      text;
    BEGIN
      -- controle: o rh ativo passa da autorização (sucesso ou erro de negócio, nunca 42501); nos
      -- KPIs, vê o funil (não vazio — 40 candidaturas vivas).
      x := coalesce(v_out ->> ('ativo.' || k), '<ausente>');
      IF x LIKE 'e:42501:%' OR (k = 'funil_kpis/1' AND x IS DISTINCT FROM 'kpis:cheio') THEN i_rot := i_rot || ('ativo.' || k); END IF;
      -- token antigo (as duas linhas inativas): 42501; leitura admite vazio, nunca >= 1.
      FOREACH a IN ARRAY ARRAY['velho', 'velho_mp'] LOOP
        x := coalesce(v_out ->> (a || '.' || k), '<ausente>');
        IF NOT (x LIKE 'e:42501:%' OR (leit AND x = ANY (vazio))) THEN i_rot := i_rot || (a || '.' || k); END IF;
      END LOOP;
      -- sem papel: 42501 onde há guarda de papel; sem guarda (funil), KPIs vazios.
      x := coalesce(v_out ->> ('sem_papel.' || k), '<ausente>');
      IF (guarda AND x NOT LIKE 'e:42501:%') OR (NOT guarda AND NOT x = ANY (vazio)) THEN
        i_rot := i_rot || ('sem_papel.' || k);
      END IF;
      -- candidato apontando para candidatura ALHEIA: escrita só 42501; leitura 42501 ou vazio.
      x := coalesce(v_out ->> ('candidato.' || k), '<ausente>');
      IF NOT (x LIKE 'e:42501:%' OR (leit AND x = ANY (vazio))) THEN i_rot := i_rot || ('candidato.' || k); END IF;
      -- anon: sem EXECUTE (ACL) e a chamada recusada PELO ACL, não pela guarda.
      x := coalesce(v_out ->> ('anon.' || k), '<ausente>');
      IF coalesce((v_anonp ->> k)::boolean, true) OR x NOT LIKE 'e:42501:permission denied for function%' THEN i_rot := i_rot || ('anon.' || k); END IF;
    END;
  END LOOP;

  -- Evidência: desfecho do controle positivo e do candidato por função (SQLSTATE ou forma vazia).
  SELECT string_agg(split_part(key, '.', 2) || '>' || CASE WHEN value LIKE 'e:%' THEN split_part(value, ':', 1) || ':' || split_part(value, ':', 2) ELSE value END, ',' ORDER BY key)
    INTO v_ev_a FROM jsonb_each_text(v_out) WHERE key LIKE 'ativo.%';
  SELECT string_agg(split_part(key, '.', 2) || '>' || CASE WHEN value LIKE 'e:%' THEN split_part(value, ':', 1) || ':' || split_part(value, ':', 2) ELSE value END, ',' ORDER BY key)
    INTO v_ev_c FROM jsonb_each_text(v_out) WHERE key LIKE 'candidato.%';
  PERFORM set_config('p50.evidencia', concat_ws(';', nullif(current_setting('p50.evidencia', true), ''),
            '07:rpcs=' || jsonb_array_length(v_set),
            '07:i_ativo=' || coalesce(v_ev_a, '-'),
            '07:i_cand=' || coalesce(v_ev_c, '-')), false);
  PERFORM set_config('smoke50.i_rpcs', jsonb_array_length(v_set)::text, false);
  PERFORM set_config('smoke50.i_res', v_out::text, false);

  IF jsonb_array_length(v_set) < 1 THEN
    i_rot := i_rot || 'c_conjunto'::text;
  END IF;
  IF cardinality(i_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (i): [%]: % funcao(oes) no conjunto por forma; desfechos %',
      array_to_string(i_rot, ','), jsonb_array_length(v_set), v_out;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$i$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (j) SC3 POR FORMA — nenhuma policy (de QUALQUER schema) nem função carrega a posse da vaga como
--     autorização; o portão MORDE em `pg_temp` (policy e função plantadas, desfeitas em P5099).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $j$
DECLARE
  -- ESCOPO deliberado (não fotografia): as 14 policies que a fase reescreveu (0001 + 0002). Cada uma
  -- tem de estar no conjunto da forma de igualdade `= 'rh'::text` — que a metade positiva obriga
  -- a chamar o helper.
  c_escopo  constant text[] := ARRAY[
    'candidaturas.rh_le_candidaturas', 'candidaturas.rh_avanca_etapa',
    'analise_candidato_vaga.rh_le_analise', 'comparativo_solicitado.rh_le_comparativo',
    'agendamentos_entrevista.rh_gerencia_agendamento', 'notificacoes_enviadas.rh_le_notificacoes',
    'decisao_final.rh_le_decisao_final', 'decisao_final_historico.rh_le_decisao_final_historico',
    'entrevista_analises.rh_le_entrevista_analises', 'entrevista_guias.rh_le_entrevista_guias',
    'historico_candidatura.rh_le_historico', 'redacoes_candidato.redacao_rh_select',
    'redacoes_candidato.redacao_rh_update', 'scores_candidato.rh_le_scores'];
  -- Exclusão de schemas de sistema/gerenciados — SÓ na varredura de FUNÇÕES (RESEARCH Pattern 5;
  -- pg_temp fica DENTRO). A de policies não tem filtro de schema (ver cabeçalho).
  c_excl_fn constant text[] := ARRAY['pg_catalog', 'information_schema', 'storage', 'auth', 'realtime', 'cron', 'net',
                                     'vault', 'extensions', 'graphql', 'graphql_public', 'pgsodium', 'supabase_functions', 'pgbouncer'];
  -- A lista ANTIGA do Pattern 5 para policies — usada só para MEDIR o que ela deixaria de ler.
  c_excl_pol_antiga constant text[] := ARRAY['pg_catalog', 'information_schema', 'storage', 'auth', 'realtime', 'cron', 'net', 'vault', 'extensions'];
  v_fase    int;
  v_det     jsonb := '{}';
  d         jsonb;
  v_lidas   bigint;
  v_total   bigint;
  v_antiga  bigint;
  v_eqpol   bigint;
  v_rhfn    bigint;
  v_pol     jsonb;
  v_polrh   jsonb;
  v_fn      jsonb;
  v_ind     jsonb;
  v_fnrh    jsonb;
  v_eqset   text[];
  v_schemas text;
  v_err     text;
  v_ran     int := 0;
  x         text;
  b         jsonb;
  j_rot     text[] := '{}';
BEGIN
  FOR v_fase IN 1 .. 2 LOOP
    BEGIN
      IF v_fase = 2 THEN
        -- MORDIDA: o ofensor plantado em pg_temp (nada em tabela de PROD; desfeito pelo P5099).
        CREATE TEMP TABLE p50_bite (vaga_id uuid);
        ALTER TABLE p50_bite ENABLE ROW LEVEL SECURITY;
        CREATE POLICY p50_bite_pol ON p50_bite
          USING (vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid())));
        EXECUTE $bite$
          CREATE FUNCTION pg_temp.p50_bite_fn() RETURNS boolean LANGUAGE plpgsql AS $bfn$
          DECLARE
            v_role       text := (select auth.jwt() #>> '{app_metadata,role}');
            v_vaga_owner uuid;
          BEGIN
            SELECT v.created_by INTO v_vaga_owner FROM public.vagas v LIMIT 1;
            IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
              RETURN false;
            END IF;
            RETURN true;
          END
          $bfn$
        $bite$;
      END IF;

      -- POLICIES: TODA linha de pg_policies — SEM predicado de schema (public, storage, cron, pg_temp…).
      WITH pol AS (
        SELECT p.schemaname || '.' || p.tablename || '.' || p.policyname AS nome,
               p.schemaname AS sch, p.tablename || '.' || p.policyname AS tp,
               coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') AS txt
          FROM pg_catalog.pg_policies p
      )
      SELECT count(*),
             count(*) FILTER (WHERE sch <> ALL (c_excl_pol_antiga)),
             count(*) FILTER (WHERE txt ~ '= ''rh''::text'),
             coalesce(jsonb_agg(nome ORDER BY nome) FILTER (WHERE txt ~* 'created_by'), '[]'),
             coalesce(jsonb_agg(nome ORDER BY nome) FILTER (WHERE txt ~ '= ''rh''::text' AND txt !~ 'is_active_rh_user'), '[]'),
             coalesce(array_agg(tp ORDER BY tp) FILTER (WHERE txt ~ '= ''rh''::text' AND sch = 'public'), '{}')
        INTO v_lidas, v_antiga, v_eqpol, v_pol, v_polrh, v_eqset
        FROM pol;
      SELECT count(*) INTO v_total FROM pg_catalog.pg_policy;
      SELECT string_agg(s || ':' || n, ',' ORDER BY s) INTO v_schemas
        FROM (SELECT p.schemaname AS s, count(*) AS n FROM pg_catalog.pg_policies p GROUP BY p.schemaname) z;

      -- FUNÇÕES: todo schema fora da exclusão (pg_temp DENTRO).
      WITH fn AS (
        SELECT n.nspname || '.' || p.proname || '/' || p.pronargs AS nome, p.prosrc AS src
          FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname <> ALL (c_excl_fn)
      )
      SELECT count(*) FILTER (WHERE src ~ 'v_role\s*=\s*''rh'''),
             coalesce(jsonb_agg(nome ORDER BY nome) FILTER (WHERE src ~* 'created_by' AND src ~* '\mvagas\M'), '[]'),
             coalesce(jsonb_agg(nome ORDER BY nome) FILTER (WHERE src ~* 'v_role\s*=\s*''rh''\s+AND\s+v_(vaga_)?(owner|dono)'), '[]'),
             coalesce(jsonb_agg(nome ORDER BY nome) FILTER (WHERE src ~ 'v_role\s*=\s*''rh''' AND src !~ 'is_active_rh_user'), '[]')
        INTO v_rhfn, v_fn, v_ind, v_fnrh
        FROM fn;

      v_det := v_det || jsonb_build_object(v_fase::text, jsonb_build_object(
        'lidas', v_lidas, 'total', v_total, 'antiga', v_antiga, 'eqpol', v_eqpol, 'rhfn', v_rhfn,
        'schemas', v_schemas, 'pol', v_pol, 'polrh', v_polrh, 'fn', v_fn, 'ind', v_ind, 'fnrh', v_fnrh,
        'eqset', to_jsonb(v_eqset)));
      v_ran := v_ran + 1;
      RAISE EXCEPTION 'desfazer a fase %', v_fase USING ERRCODE = 'P5099';
    EXCEPTION
      WHEN SQLSTATE 'P5099' THEN NULL;
      WHEN OTHERS THEN v_err := format('fase %s — %s: %s', v_fase, SQLSTATE, SQLERRM);
    END;
    EXIT WHEN v_err IS NOT NULL;
  END LOOP;
  IF v_err IS NOT NULL OR v_ran <> 2 THEN
    RAISE EXCEPTION 'P50C FAIL (j): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  -- Base (fase 1): zero ofensor em cada detector; cobertura = tudo; escopo dentro da forma.
  d := v_det -> '1';
  IF (d ->> 'lidas')::bigint IS DISTINCT FROM (d ->> 'total')::bigint THEN
    j_rot := j_rot || ('cobertura:' || (d ->> 'lidas') || '/' || (d ->> 'total'));
  END IF;
  FOR x IN SELECT jsonb_array_elements_text(d -> 'pol')   LOOP j_rot := j_rot || ('pol:' || x); END LOOP;
  FOR x IN SELECT jsonb_array_elements_text(d -> 'polrh') LOOP j_rot := j_rot || ('pol_rh_sem_helper:' || x); END LOOP;
  FOR x IN SELECT jsonb_array_elements_text(d -> 'fn')    LOOP j_rot := j_rot || ('fn:' || x); END LOOP;
  FOR x IN SELECT jsonb_array_elements_text(d -> 'ind')   LOOP j_rot := j_rot || ('fn_indireta:' || x); END LOOP;
  FOR x IN SELECT jsonb_array_elements_text(d -> 'fnrh')  LOOP j_rot := j_rot || ('fn_rh_sem_helper:' || x); END LOOP;
  FOREACH x IN ARRAY c_escopo LOOP
    IF NOT (d -> 'eqset') ? x THEN j_rot := j_rot || ('escopo:' || x); END IF;
  END LOOP;

  -- Mordida (fase 2 MENOS fase 1): cada detector acha EXATAMENTE o que foi plantado em pg_temp.
  b := v_det -> '2';
  IF (SELECT coalesce(jsonb_agg(e ORDER BY e), '[]') FROM jsonb_array_elements_text(b -> 'pol') e WHERE NOT (d -> 'pol') ? e)::text
     !~ '^\["pg_temp_[0-9]+\.p50_bite\.p50_bite_pol"\]$' THEN j_rot := j_rot || 'mordida_pol'::text; END IF;
  IF (SELECT coalesce(jsonb_agg(e ORDER BY e), '[]') FROM jsonb_array_elements_text(b -> 'fn') e WHERE NOT (d -> 'fn') ? e)::text
     !~ '^\["pg_temp_[0-9]+\.p50_bite_fn/0"\]$' THEN j_rot := j_rot || 'mordida_fn'::text; END IF;
  IF (SELECT coalesce(jsonb_agg(e ORDER BY e), '[]') FROM jsonb_array_elements_text(b -> 'ind') e WHERE NOT (d -> 'ind') ? e)::text
     !~ '^\["pg_temp_[0-9]+\.p50_bite_fn/0"\]$' THEN j_rot := j_rot || 'mordida_ind'::text; END IF;
  IF (SELECT coalesce(jsonb_agg(e ORDER BY e), '[]') FROM jsonb_array_elements_text(b -> 'fnrh') e WHERE NOT (d -> 'fnrh') ? e)::text
     !~ '^\["pg_temp_[0-9]+\.p50_bite_fn/0"\]$' THEN j_rot := j_rot || 'mordida_fnrh'::text; END IF;
  IF (b ->> 'lidas')::bigint IS DISTINCT FROM (b ->> 'total')::bigint THEN
    j_rot := j_rot || ('mordida_cobertura:' || (b ->> 'lidas') || '/' || (b ->> 'total'));
  END IF;
  -- Populações das duas formas (controle: sem elas as metades positivas seriam vácuas).
  IF (d ->> 'eqpol')::bigint < 1 THEN j_rot := j_rot || 'c_pol_rh'::text; END IF;
  IF (d ->> 'rhfn')::bigint  < 1 THEN j_rot := j_rot || 'c_fn_rh'::text;  END IF;

  PERFORM set_config('p50.evidencia', concat_ws(';', nullif(current_setting('p50.evidencia', true), ''),
            '07:cobertura=' || (d ->> 'lidas') || '/' || (d ->> 'total') || ',antiga=' || (d ->> 'antiga') || '/' || (d ->> 'total')
              || ',mordida=' || CASE WHEN (d ->> 'antiga')::bigint < (d ->> 'total')::bigint THEN 'real' ELSE 'vacua' END,
            '07:pol_por_schema=' || coalesce(d ->> 'schemas', '-'),
            '07:formas=pol_rh:' || (d ->> 'eqpol') || ',fn_rh:' || (d ->> 'rhfn'),
            '07:mordida_pg_temp=' || CASE WHEN j_rot && ARRAY['mordida_pol', 'mordida_fn', 'mordida_ind', 'mordida_fnrh'] THEN 'FALHOU' ELSE 'exata' END), false);
  PERFORM set_config('smoke50.j_det', v_det::text, false);
  PERFORM set_config('smoke50.cobertura_policies', jsonb_build_object(
            'lidas', (d ->> 'lidas')::bigint, 'total', (d ->> 'total')::bigint, 'por_schema', d ->> 'schemas',
            'cobertura_antiga', (d ->> 'antiga')::bigint,
            'cobertura_mordida', CASE WHEN (d ->> 'antiga')::bigint < (d ->> 'total')::bigint THEN 'real' ELSE 'vacua' END)::text, false);

  IF cardinality(j_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (j): [%]: base % ; com a mordida plantada em pg_temp % (rotulo c_* = populacao da forma vazia)',
      array_to_string(j_rot, ','), d, b;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$j$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (k) SC4 — as filas SEMEADAS (pedido com candidatura viva + pedido ÓRFÃO) são md5-iguais para o
--     administrador e o rh ativo; token antigo e candidato não veem nada.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $k$
DECLARE
  v_admin   uuid   := current_setting('smoke50.a_admin')::uuid;
  v_ativo   uuid   := current_setting('smoke50.a_ativo')::uuid;
  v_inativo uuid   := current_setting('smoke50.a_inativo')::uuid;
  v_cand    uuid   := current_setting('smoke50.a_cand')::uuid;
  v_candid  uuid[] := string_to_array(current_setting('smoke50.cand_ids'), ',')::uuid[];
  v_com     uuid;
  v_orf     uuid;
  v_id_com  uuid;
  v_id_orf  uuid;
  v_pend    bigint;
  v_rev_sem text := 'nao';
  v_rc      int;
  a         text;
  f         text;
  v_tok     text;
  v_ve      text;
  v_res     jsonb  := '{}';
  v_err     text;
  v_ran     boolean := false;
  k_rot     text[] := '{}';
  v_vazio   text[] := ARRAY['n:0', 'i:0'];
  x         text;
BEGIN
  -- Fixture lida na execução (idioma p44): um candidato COM candidatura viva e um SEM candidatura
  -- nenhuma (o órfão) — nenhum dos dois é a_cand.
  SELECT ca.id INTO v_com
    FROM public.candidatos ca
   WHERE NOT (ca.id = ANY (v_candid))
     AND EXISTS (SELECT 1 FROM public.candidaturas c WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false)
   ORDER BY ca.id LIMIT 1;
  SELECT ca.id INTO v_orf
    FROM public.candidatos ca
   WHERE NOT (ca.id = ANY (v_candid))
     AND NOT EXISTS (SELECT 1 FROM public.candidaturas c WHERE c.candidato_id = ca.id)
   ORDER BY ca.id LIMIT 1;
  IF v_com IS NULL OR v_orf IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (k): sem fixture — candidato com candidatura viva=% orfao=% (cada um tem de existir; semear um orfao exigiria escrever em auth.users)', v_com IS NOT NULL, v_orf IS NOT NULL;
  END IF;

  BEGIN
    INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao)
    VALUES (v_com, 'acesso', 'pendente') RETURNING id INTO v_id_com;
    INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao)
    VALUES (v_orf, 'acesso', 'pendente') RETURNING id INTO v_id_orf;

    -- revisões pendentes vivas (lidas; semeia UMA se não houver).
    SELECT count(*) INTO v_pend
      FROM public.decisao_final d JOIN public.candidaturas c ON c.id = d.candidatura_id
     WHERE d.revisao_solicitada_em IS NOT NULL AND d.revisao_respondida_em IS NULL
       AND c.deleted_at IS NULL AND c.is_rascunho = false;
    IF v_pend = 0 THEN
      UPDATE public.decisao_final d SET revisao_solicitada_em = now()
       WHERE d.id = (SELECT d2.id FROM public.decisao_final d2 JOIN public.candidaturas c ON c.id = d2.candidatura_id
                      WHERE c.deleted_at IS NULL AND c.is_rascunho = false AND d2.revisao_solicitada_em IS NULL
                      ORDER BY d2.id LIMIT 1);
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      IF v_rc <> 1 THEN RAISE EXCEPTION 'semear revisao pendente atingiu % linha(s), esperado 1', v_rc; END IF;
      v_rev_sem := 'sim';
      v_pend := 1;
    END IF;

    FOREACH a IN ARRAY ARRAY['admin', 'ativo', 'velho', 'candidato'] LOOP
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object(
                'sub', (CASE a WHEN 'admin' THEN v_admin WHEN 'ativo' THEN v_ativo WHEN 'velho' THEN v_inativo ELSE v_cand END)::text,
                'role', 'authenticated',
                'app_metadata', json_build_object('role', CASE a WHEN 'admin' THEN 'administrador' WHEN 'candidato' THEN 'candidato' ELSE 'rh' END))::text, true);
      FOREACH f IN ARRAY ARRAY['listar_pedidos_dados', 'contar_pedidos_dados_pendentes', 'listar_revisoes_decisao_true',
                               'listar_revisoes_decisao_false', 'contar_revisoes_pendentes'] LOOP
        BEGIN
          CASE f
            WHEN 'listar_pedidos_dados' THEN
              SELECT 'n:' || count(*) || ':' || md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')),
                     coalesce(bool_or(t.id = v_id_com), false)::text || '/' || coalesce(bool_or(t.id = v_id_orf), false)::text
                INTO v_tok, v_ve FROM public.listar_pedidos_dados(true) t;
              IF a = 'ativo' THEN v_res := v_res || jsonb_build_object('ativo.ve', v_ve); END IF;
            WHEN 'contar_pedidos_dados_pendentes' THEN
              v_tok := 'i:' || public.contar_pedidos_dados_pendentes();
            -- Phase 51 / C-12 (51-10, migration 20261008000003): a fila passou a ter as três origens e
            -- uma candidatura pode ter DUAS linhas (revisão de uma rejeição pelo RH e, depois da
            -- reabertura, a da decisão final) — ordenar só por candidatura_id deixaria o empate
            -- indeterminado e o md5 admin × rh ativo deixaria de ser determinístico. Desempate pelo
            -- pedido_id lido por to_jsonb (vale ANTES da 0003, quando a coluna não existe: NULL, e
            -- DEPOIS). A mordida do (k) editado é a MC1a de scripts/p51_mutacoes.cjs (o ramo
            -- decisao_final da fila exige administrador — o único ramo que o mundo deste (k) popula).
            WHEN 'listar_revisoes_decisao_true' THEN
              SELECT 'n:' || count(*) || ':' || md5(coalesce(jsonb_agg(to_jsonb(t) - 'pode_responder' ORDER BY t.candidatura_id, (to_jsonb(t) ->> 'pedido_id'))::text, '[]'))
                INTO v_tok FROM public.listar_revisoes_decisao(true) t;
            WHEN 'listar_revisoes_decisao_false' THEN
              SELECT 'n:' || count(*) || ':' || md5(coalesce(jsonb_agg(to_jsonb(t) - 'pode_responder' ORDER BY t.candidatura_id, (to_jsonb(t) ->> 'pedido_id'))::text, '[]'))
                INTO v_tok FROM public.listar_revisoes_decisao(false) t;
            ELSE
              v_tok := 'i:' || public.contar_revisoes_pendentes();
          END CASE;
        EXCEPTION WHEN OTHERS THEN v_tok := 'e:' || SQLSTATE || ':' || left(SQLERRM, 60);
        END;
        v_res := v_res || jsonb_build_object(a || '.' || f, v_tok);
      END LOOP;
      RESET ROLE;
    END LOOP;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (k): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  FOREACH f IN ARRAY ARRAY['listar_pedidos_dados', 'contar_pedidos_dados_pendentes', 'listar_revisoes_decisao_true',
                           'listar_revisoes_decisao_false', 'contar_revisoes_pendentes'] LOOP
    x := coalesce(v_res ->> ('admin.' || f), '<ausente>');
    -- população: o administrador vê > 0 (senão a igualdade é vácua) — controle.
    IF (CASE WHEN x ~ '^[ni]:[0-9]+' THEN split_part(x, ':', 2)::bigint < 1 ELSE true END) THEN k_rot := k_rot || ('c_pop.' || f); END IF;
    IF (v_res ->> ('ativo.' || f)) IS DISTINCT FROM x THEN k_rot := k_rot || ('igual.' || f); END IF;
    FOREACH a IN ARRAY ARRAY['velho', 'candidato'] LOOP
      x := coalesce(v_res ->> (a || '.' || f), '<ausente>');
      IF NOT (x LIKE 'e:42501:%' OR split_part(x, ':', 1) || ':' || split_part(x, ':', 2) = ANY (v_vazio)) THEN
        k_rot := k_rot || (a || '.' || f);
      END IF;
    END LOOP;
  END LOOP;
  IF split_part(coalesce(v_res ->> 'ativo.ve', ''), '/', 1) IS DISTINCT FROM 'true' THEN k_rot := k_rot || 'rh_ve_com'::text; END IF;
  IF split_part(coalesce(v_res ->> 'ativo.ve', ''), '/', 2) IS DISTINCT FROM 'true' THEN k_rot := k_rot || 'rh_ve_orfao'::text; END IF;

  PERFORM set_config('p50.evidencia', concat_ws(';', nullif(current_setting('p50.evidencia', true), ''),
            '07:sc4=' || (SELECT string_agg(key || '>' || CASE WHEN value LIKE 'e:%' THEN split_part(value, ':', 1) || ':' || split_part(value, ':', 2)
                                                             WHEN value ~ '^n:' THEN split_part(value, ':', 1) || ':' || split_part(value, ':', 2) || ':' || left(split_part(value, ':', 3), 12)
                                                             ELSE value END, ',' ORDER BY key)
                            FROM jsonb_each_text(v_res)),
            '07:sc4_semeados=2(orfao=1),revisao_semeada=' || v_rev_sem || ',revisoes_pendentes=' || v_pend), false);
  PERFORM set_config('smoke50.k_res', v_res::text, false);
  IF cardinality(k_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (k): [%]: filas por ator %. (esperado: admin = rh ativo em md5/contagem, contagens > 0, o rh ve os dois semeados — o orfao inclusive; velho e candidato: 42501 ou vazio. rotulo c_* = populacao vazia)',
      array_to_string(k_rot, ','), v_res;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$k$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (l) SC5 — REVISAO-05 (o decisor não responde à própria revisão) e D-23 (quem teve a decisão
--     revertida não registra a nova), comportamentais e semeados, com controle na mesma execução.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $l$
DECLARE
  v_ativo  uuid := current_setting('smoke50.a_ativo')::uuid;
  c_just   constant text := 'Sonda de autorizacao do smoke p50 (ensaio que aborta): nada aqui persiste nem e decisao real.';
  v_d      uuid;
  v_f      uuid;
  v_rev    uuid;
  v_x      uuid;
  v_rc     int;
  v_semrev text := 'nao';
  v_own    uuid[];
  v_tok    text;
  l_dec    text := '<nao rodou>';
  l_outro  text := '<nao rodou>';
  l_prop   text := '<nao rodou>';
  l_d23    text := '<nao rodou>';
  l_d23c   text := '<nao rodou>';
  v_d23    text := 'comportamental';
  v_d23why text;
  v_lit    boolean;
  v_err    text;
  v_ran    boolean := false;
  l_rot    text[] := '{}';
BEGIN
  -- D: o decisor; F: OUTRO rh ativo (controle). Ambos linhas usuarios_rh ATIVAS, impersonadas com o claim `rh`.
  -- A revisão pendente viva: prefere uma cujo decisor já é ativo; senão a primeira pendente, cujo
  -- decisor vira D DENTRO do envelope (hoje: as 2 pendentes têm decisor fora de usuarios_rh ou inativo).
  SELECT d.candidatura_id, d.por_usuario INTO v_rev, v_d
    FROM public.decisao_final d JOIN public.candidaturas c ON c.id = d.candidatura_id
   WHERE d.revisao_solicitada_em IS NOT NULL AND d.revisao_respondida_em IS NULL
     AND c.deleted_at IS NULL AND c.is_rascunho = false
   ORDER BY EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = d.por_usuario AND u.ativo AND u.deleted_at IS NULL) DESC,
            d.candidatura_id
   LIMIT 1;
  IF v_rev IS NULL THEN
    SELECT d.candidatura_id INTO v_rev
      FROM public.decisao_final d JOIN public.candidaturas c ON c.id = d.candidatura_id
     WHERE d.revisao_solicitada_em IS NULL AND d.revisao_veredito IS NULL AND c.deleted_at IS NULL AND c.is_rascunho = false
     ORDER BY d.candidatura_id LIMIT 1;
  END IF;
  IF v_rev IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (l): nenhuma decisao_final em candidatura viva — nem revisao pendente nem decisao para semear uma';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = v_d AND u.ativo AND u.deleted_at IS NULL) THEN
    v_d := v_ativo;
  END IF;
  SELECT u.user_id INTO v_f
    FROM public.usuarios_rh u
   WHERE u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL AND u.user_id IS DISTINCT FROM v_d
   ORDER BY u.created_at, u.user_id LIMIT 1;
  -- D-23: uma OUTRA candidatura viva com decisão (a linha vira «revertida» de E = D dentro do envelope).
  SELECT d.candidatura_id INTO v_x
    FROM public.decisao_final d JOIN public.candidaturas c ON c.id = d.candidatura_id
   WHERE c.deleted_at IS NULL AND c.is_rascunho = false AND d.candidatura_id <> v_rev
   ORDER BY d.candidatura_id LIMIT 1;
  IF v_f IS NULL OR v_x IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (l): sem fixture — outro rh ativo=% candidatura para o D-23=%', v_f IS NOT NULL, v_x IS NOT NULL;
  END IF;
  SELECT position('d.por_usuario = v_uid' IN p.prosrc) > 0 INTO v_lit
    FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.registrar_decisao(uuid, public.decisao_final_resultado, text)');

  BEGIN
    -- REVISAO-05: a revisão pendente passa a ter D como decisor (se já não tinha).
    IF NOT EXISTS (SELECT 1 FROM public.decisao_final d WHERE d.candidatura_id = v_rev AND d.por_usuario = v_d
                      AND d.revisao_solicitada_em IS NOT NULL AND d.revisao_respondida_em IS NULL) THEN
      UPDATE public.decisao_final
         SET por_usuario = v_d, revisao_solicitada_em = coalesce(revisao_solicitada_em, now())
       WHERE candidatura_id = v_rev;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      IF v_rc <> 1 THEN RAISE EXCEPTION 'semear decisor da revisao atingiu % linha(s), esperado 1', v_rc; END IF;
      v_semrev := 'sim';
    END IF;
    SELECT coalesce(array_agg(d.candidatura_id), '{}') INTO v_own FROM public.decisao_final d WHERE d.por_usuario = v_d;

    SET LOCAL ROLE authenticated;
    -- o decisor tenta responder a própria revisão
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_d::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      PERFORM public.responder_revisao_decisao(v_rev, 'mantida', c_just);
      RAISE EXCEPTION 'ok' USING ERRCODE = 'P50C2';
    EXCEPTION WHEN SQLSTATE 'P50C2' THEN l_dec := 'ok';
              WHEN OTHERS THEN l_dec := 'e:' || SQLSTATE || ':' || left(SQLERRM, 90);
    END;
    -- a fila sob D: pode_responder falso nas linhas dele (e ele vê >= 1 linha dele)
    BEGIN
      SELECT count(*) FILTER (WHERE t.candidatura_id = ANY (v_own)) || '/' ||
             count(*) FILTER (WHERE t.candidatura_id = ANY (v_own) AND t.pode_responder)
        INTO l_prop FROM public.listar_revisoes_decisao(true) t;
    EXCEPTION WHEN OTHERS THEN l_prop := 'e:' || SQLSTATE || ':' || left(SQLERRM, 60);
    END;
    -- controle: OUTRO rh ativo passa da trava do decisor (a resposta é desfeita)
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_f::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      PERFORM public.responder_revisao_decisao(v_rev, 'mantida', c_just);
      RAISE EXCEPTION 'ok' USING ERRCODE = 'P50C2';
    EXCEPTION WHEN SQLSTATE 'P50C2' THEN l_outro := 'ok';
              WHEN OTHERS THEN l_outro := 'e:' || SQLSTATE || ':' || left(SQLERRM, 90);
    END;
    RESET ROLE;

    -- D-23: a linha de v_x vira a decisão `rejeitado` de E (= D) REVERTIDA (o predicado 2b de
    -- registrar_decisao, espelhado). Se a semente não for possível, d23=estrutural (só o literal).
    BEGIN
      UPDATE public.decisao_final
         SET decisao = 'rejeitado', por_usuario = v_d,
             revisao_solicitada_em = coalesce(revisao_solicitada_em, now()),
             revisao_veredito = 'revertida', revisao_resultado = c_just,
             revisao_por_usuario = v_f, revisao_respondida_em = now()
       WHERE candidatura_id = v_x;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      IF v_rc <> 1 THEN RAISE EXCEPTION 'semear D-23 atingiu % linha(s), esperado 1', v_rc; END IF;
    EXCEPTION WHEN OTHERS THEN
      v_d23 := 'estrutural';
      v_d23why := SQLSTATE || ':' || left(SQLERRM, 80);
    END;
    IF v_d23 = 'comportamental' THEN
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_d::text, 'role', 'authenticated',
                'app_metadata', json_build_object('role', 'rh'))::text, true);
      BEGIN
        PERFORM public.registrar_decisao(v_x, 'rejeitado', c_just);
        RAISE EXCEPTION 'ok' USING ERRCODE = 'P50C2';
      EXCEPTION WHEN SQLSTATE 'P50C2' THEN l_d23 := 'ok';
                WHEN OTHERS THEN l_d23 := 'e:' || SQLSTATE || ':' || left(SQLERRM, 90);
      END;
      -- controle: OUTRO rh ativo não é travado pelo D-23 (em_espera; desfeito)
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_f::text, 'role', 'authenticated',
                'app_metadata', json_build_object('role', 'rh'))::text, true);
      BEGIN
        PERFORM public.registrar_decisao(v_x, 'em_espera', c_just);
        RAISE EXCEPTION 'ok' USING ERRCODE = 'P50C2';
      EXCEPTION WHEN SQLSTATE 'P50C2' THEN l_d23c := 'ok';
                WHEN OTHERS THEN l_d23c := 'e:' || SQLSTATE || ':' || left(SQLERRM, 90);
      END;
      RESET ROLE;
    END IF;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (l): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF concat_ws(' ', l_dec, l_outro, l_prop, l_d23, l_d23c) ~ '\me:40001:' THEN
    RAISE EXCEPTION 'P50C FAIL (l): a subtransacao abortou por erro INESPERADO (40001: could not serialize access numa sonda) — nada foi julgado';
  END IF;

  IF l_dec NOT LIKE 'e:42501:%decisor%' THEN l_rot := l_rot || 'decisor'::text; END IF;
  IF l_outro IS DISTINCT FROM 'ok' THEN l_rot := l_rot || 'c_outro'::text; END IF;
  IF (CASE WHEN l_prop ~ '^[0-9]+/[0-9]+$' THEN split_part(l_prop, '/', 1)::int < 1 ELSE true END) THEN l_rot := l_rot || 'c_proprias'::text;
  ELSIF split_part(l_prop, '/', 2)::int <> 0 THEN l_rot := l_rot || 'pode_responder'::text;
  END IF;
  IF v_lit IS DISTINCT FROM true THEN l_rot := l_rot || 'd23_literal'::text; END IF;
  IF v_d23 = 'comportamental' THEN
    IF l_d23 NOT LIKE 'e:42501:%D-23%' THEN l_rot := l_rot || 'd23'::text; END IF;
    IF l_d23c LIKE '%D-23%' OR l_d23c LIKE 'e:42501:%' THEN l_rot := l_rot || 'c_d23_outro'::text; END IF;
  END IF;

  PERFORM set_config('p50.evidencia', concat_ws(';', nullif(current_setting('p50.evidencia', true), ''),
            '07:sc5=decisor>' || split_part(l_dec, ':', 1) || ':' || split_part(l_dec, ':', 2)
              || ',outro>' || split_part(l_outro, ':', 1) || CASE WHEN l_outro LIKE 'e:%' THEN ':' || split_part(l_outro, ':', 2) ELSE '' END
              || ',proprias_pode=' || l_prop || ',decisor_semeado=' || v_semrev,
            '07:d23=' || v_d23 || CASE WHEN v_d23 = 'estrutural' THEN '(' || replace(coalesce(v_d23why, '?'), ';', ',') || ')'
                                       ELSE '>' || split_part(l_d23, ':', 1) || ':' || split_part(l_d23, ':', 2)
                                            || ',outro>' || split_part(l_d23c, ':', 1) || CASE WHEN l_d23c LIKE 'e:%' THEN ':' || split_part(l_d23c, ':', 2) ELSE '' END END
              || ',literal=' || coalesce(v_lit::text, 'null')), false);
  PERFORM set_config('smoke50.d23', v_d23, false);
  PERFORM set_config('smoke50.l_res', json_build_object('decisor', l_dec, 'outro', l_outro, 'proprias_pode', l_prop,
            'd23', l_d23, 'd23_outro', l_d23c, 'd23_modo', v_d23, 'literal', v_lit)::text, false);
  IF cardinality(l_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (l): [%]: decisor=«%» outro_rh=«%» proprias/pode_responder=«%» ; D-23 (%): decisor_revertido=«%» outro_rh=«%» literal=% (esperado: 42501 decisor; ok; >=1/0; 42501 D-23; nao D-23; true. rotulo c_* = controle)',
      array_to_string(l_rot, ','), l_dec, l_outro, l_prop, v_d23, l_d23, l_d23c, v_lit;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$l$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) resíduo — contagens globais iguais à baseline DESTA execução.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  g_cand  bigint;
  g_vagas bigint;
  g_urh   bigint;
  g_solic bigint;
  g_df    bigint;
BEGIN
  SELECT count(*) INTO g_cand  FROM public.candidaturas;
  SELECT count(*) INTO g_vagas FROM public.vagas;
  SELECT count(*) INTO g_urh   FROM public.usuarios_rh;
  SELECT count(*) INTO g_solic FROM public.solicitacoes_dados;
  SELECT count(*) INTO g_df    FROM public.decisao_final;
  IF g_cand     IS DISTINCT FROM current_setting('smoke50.z_cand')::bigint
     OR g_vagas IS DISTINCT FROM current_setting('smoke50.z_vagas')::bigint
     OR g_urh   IS DISTINCT FROM current_setting('smoke50.z_urh')::bigint
     OR g_solic IS DISTINCT FROM current_setting('smoke50.z_solic')::bigint
     OR g_df    IS DISTINCT FROM current_setting('smoke50.z_df')::bigint THEN
    RAISE EXCEPTION 'P50C FAIL (z): contagem global mudou (candidaturas % -> %, vagas % -> %, usuarios_rh % -> %, solicitacoes_dados % -> %, decisao_final % -> %) — sob o snapshot unico do ensaio (REPEATABLE READ) o trafego de fora nao aparece aqui: o delta e RESIDUO DESTA requisicao, uma escrita que escapou de um envelope P50C1 (este smoke ESCREVE dentro deles) — NAO repetir: achar a escrita',
      current_setting('smoke50.z_cand'), g_cand, current_setting('smoke50.z_vagas'), g_vagas,
      current_setting('smoke50.z_urh'), g_urh, current_setting('smoke50.z_solic'), g_solic,
      current_setting('smoke50.z_df'), g_df;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$z$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado (contrato: `JSON.parse(...)[0].resultado`).
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke50.pass')::int <> current_setting('smoke50.esperado')::int THEN
    RAISE EXCEPTION 'P50C FAIL (gate): pass = % de % — alguma clausula nao incrementou o contador',
      current_setting('smoke50.pass'), current_setting('smoke50.esperado');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',          'p50_acesso_recrutador',
  'pass',           current_setting('smoke50.pass')::int,
  'esperado',       current_setting('smoke50.esperado')::int,
  'a_ativo',        current_setting('smoke50.a_ativo'),
  'a_inativo',      current_setting('smoke50.a_inativo'),
  'a_inativo_mp',   current_setting('smoke50.a_inativo_mp'),
  'a_admin',        current_setting('smoke50.a_admin'),
  'a_cand',         current_setting('smoke50.a_cand'),
  'vaga_ativa',     current_setting('smoke50.vaga_ativa'),
  'n_ativa',        current_setting('smoke50.n_ativa')::int,
  'vaga_inativa',   current_setting('smoke50.vaga_inativa'),
  'n_inativa',      current_setting('smoke50.n_inativa')::int,
  'vaga_arquivada', current_setting('smoke50.vaga_arquivada'),
  'n_arquivada',    current_setting('smoke50.n_arquivada')::int,
  'n_total',        current_setting('smoke50.n_total')::int,
  'n_vivas',        current_setting('smoke50.n_vivas')::int,
  'c_visto_rh',     current_setting('smoke50.c_visto')::int,
  'c_visto_rh_recrutador', current_setting('smoke50.c_visto_rec')::int,
  'n_cand_proprias', current_setting('smoke50.n_cand_proprias')::int,
  'd_cand_proprias', current_setting('smoke50.d_proprias'),
  'd_anon',         current_setting('smoke50.d_anon'),
  'n_borda',        current_setting('smoke50.n_borda')::int,
  'f_borda_rh',     current_setting('smoke50.f_borda_rh'),
  'f_borda_semeada', current_setting('smoke50.f_borda_semeada')::int,
  'e_policies_igualdade', current_setting('smoke50.e_npol')::int,
  'populacoes',     current_setting('smoke50.g_pop')::jsonb,
  'relacoes',       current_setting('smoke50.rels')::jsonb,
  'semeadas',       current_setting('smoke50.semeadas')::jsonb,
  'vacuos',         current_setting('smoke50.vacuos')::jsonb,
  'rpcs_por_forma', current_setting('smoke50.i_rpcs')::int,
  'cobertura_policies', current_setting('smoke50.cobertura_policies')::jsonb,
  'sc4',            current_setting('smoke50.k_res')::jsonb,
  'sc5',            current_setting('smoke50.l_res')::jsonb,
  'd23',            current_setting('smoke50.d23')
) AS resultado;
