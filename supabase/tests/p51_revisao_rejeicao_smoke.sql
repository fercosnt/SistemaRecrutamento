-- =============================================================================
-- Phase 51 / Plano 51-08 — ESPECIFICAÇÃO EXECUTÁVEL do pedido de revisão para TODA rejeição
--                          (JORN-42 · D-01..D-12, D-30, D-33, D-35, D-36 · C-1..C-3, C-9, C-12)
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Ele foi escrito **ANTES** da migration 20261008000002, deliberadamente RED: a tabela
-- `public.revisao_rejeicao` e as três RPCs ainda NÃO existem. Ele descreve o comportamento que a
-- migration tem de produzir.
--
-- Consequência de processo, dita aqui para não ser negociada depois (o parágrafo é o do
-- `p42_revisao_art20_smoke.sql`): se a implementação divergir deste arquivo, **corrige-se a
-- implementação**. Alterar o smoke para caber no que foi implementado é ESCALAR o problema, não
-- resolvê-lo — é exatamente o movimento que transforma um gate em decoração.
--
-- O QUE ELE VIGIA (migration 20261008000002, mecanismo (b) do 51-RESEARCH — registro PRÓPRIO do
-- pedido; o ciclo de `decisao_final` fica byte-idêntico).
--   · Toda rejeição tem UM caminho de revisão (D-01). A REJEIÇÃO CORRENTE de uma candidatura é a
--     linha MAIS RECENTE de `historico_candidatura` dela com `etapa_para = 'rejeitado'` ou
--     `auto_rejeitado = true`. O caminho de `decisao_final` é DONO dela quando existe linha de
--     `decisao_final` com `decisao = 'rejeitado'` e (`revisao_respondida_em IS NULL` ou
--     `reaberta_em IS NULL`); em todo outro caso de `status = 'rejeitado'` o pedido vai ao
--     registro novo, `origem = 'automatica'` se a linha corrente tem `auto_rejeitado`, e
--     `'humana_triagem'` senão (D-33: «Rejeição pelo RH», qualquer etapa fora da decisão final).
--   · `solicitar_revisao_rejeicao(uuid)` (titular), `estado_revisao_rejeicao(uuid)` (titular,
--     leitura com allowlist) e `responder_revisao_rejeicao(uuid,text,text)` (RH ativo ou
--     administrador; REVISAO-05: quem rejeitou não responde; no knockout qualquer RH ativo).
--   · A procedente REABRE sob `app.transicao_sancionada = 'reabertura'`: rejeição pelo RH volta à
--     etapa em que foi rejeitada (inclusive `decisao_final`, C-2), knockout vai a `triagem` (D-30),
--     `status = 'em_analise'`, +1 linha de histórico com o revisor como ator, prazo = 00:00 de SP
--     do 11º dia (D-04, mesma fórmula de `responder_revisao_decisao`), vaga em qualquer estado.
--   · O knockout revertido mantém `motivo_rejeicao`/`opcao_knockout_id` (D-35), não é reaplicado
--     (D-03, por forma) e despacha UMA análise de IA (D-36).
--   · Notificação: o pedido enfileira `notificar-rh` com exatamente `{evento, candidatura_id,
--     ciclo}`; a resposta enfileira `notificar-candidato` com `{evento, candidatura_id, ciclo,
--     pedido_id}`.
--   · Nada abre para `anon` nem para candidato alheio (D-12 da 50): tabela com RLS e ZERO policy e
--     ZERO privilégio de tabela para `anon`/`authenticated`; acesso só pelas RPCs DEFINER.
--   · D-08: nenhuma escrita retroativa — o direito é calculado na hora sobre a população VIVA.
--
-- ATORES — lidos NA EXECUÇÃO em `public.usuarios_rh` (nunca contas fixas: o p42 ficou vermelho na
-- fixture contra código correto quando as contas fixas foram desativadas). Ausência de qualquer
-- um REPROVA na baseline, nunca pula:
--   A  — RH ATIVO, `ORDER BY (role = 'recrutador') DESC, created_at, user_id`: o que rejeita;
--   B  — RH ATIVO ≠ A, mesma ordem: o revisor das rejeições de A;
--   I  — recrutador INATIVO (`ativo = false`, token velho): o helper `is_active_rh_user()` o barra;
--   ADM — administrador ATIVO (lido e exigido; registrado na evidência).
--   Papel do JWT: `usuarios_rh.role = 'administrador'` → `administrador`; senão → `rh`.
--
-- FIXTURES — NÃO SÃO CANDIDATURAS REAIS (idioma do `p49_44`): dois titulares sintéticos
-- `p51b-smoke-<hex>@invalido.local` (auth.users + candidatos) — T, dono de todas as candidaturas
-- da fixture, e X, intruso sem candidatura —; uma VAGA SINTÉTICA por candidatura (UNIQUE
-- candidato×vaga), uma delas depois `arquivada` (D-04). Rejeições pelo RH criadas pela RPC REAL
-- `rejeitar_candidatura` sob o JWT de A; decisões finais pela RPC REAL `registrar_decisao`; o
-- ciclo de `decisao_final` revertido pelas RPCs REAIS `solicitar_revisao_decisao` /
-- `responder_revisao_decisao`; a retirada pela RPC REAL `retirar_candidatura`.
-- KNOCKOUT — VIA USADA: a RPC REAL `submit_candidatura_atomic` (sem JWT, o contexto da EF), numa
-- vaga sintética com UMA pergunta `single_choice` cuja opção «Nao» tem `tag = 'knockout'` em
-- `pergunta_opcao_metadata`, respondida com «Nao». Coube no orçamento de 5 s por instrução; a via
-- alternativa (montar o estado à mão) NÃO foi usada.
-- ⚠ TEMPO. Dentro de uma requisição, `now()` é o MESMO para toda linha de histórico. Em PROD cada
-- passo é uma transação. Onde a ordem importa (rejeição depois de reabertura, 400 dias), a fixture
-- ENVELHECE as linhas de histórico anteriores da própria candidatura (`criado_em - 1 hour` /
-- `- 400 days`) — nunca linha real.
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL encerrada
-- por `RAISE EXCEPTION` com SQLSTATE próprio (`P51B1`), capturado logo acima: ROLLBACK de tudo,
-- inclusive do que os triggers enfileiram em `net.http_request_queue`. Nenhum e-mail sai. As
-- SONDAS de resposta que não podem deixar efeito (REVISAO-05, helper, «A e B podem responder o
-- knockout», vereditos inválidos) rodam numa sub-subtransação que reverte por `P51B2` mesmo quando
-- a chamada é ACEITA. E o arquivo inteiro só roda dentro do ensaio que ABORTA (bloco
-- `$p51_so_ensaio$` abaixo): fora dele, nada roda.
--
-- ⚠ CADA chamada vai no SEU PRÓPRIO bloco `BEGIN … EXCEPTION WHEN OTHERS` que guarda
-- `SQLSTATE:SQLERRM`. As medições ficam numa GUC de sessão (`smoke51b.m`); o julgamento roda FORA
-- da subtransação, UMA cláusula por bloco `DO`, na ordem a, b, c, d, e, f, g, h, i, j, k, l, m, n, z — a
-- primeira que reprova encerra a requisição, e as letras seguintes não aparecem nessa corrida.
-- Passos da fixture que usam só código vivo (criar titular, `rejeitar_candidatura`,
-- `submit_candidatura_atomic`) propagam erro: isso é `P51B FAIL (fixture)` com «erro INESPERADO»
-- — defeito da fixture, nunca mordida.
--
-- CLÁUSULAS.
--   (a) catálogo/ACL: a tabela existe, `relrowsecurity`, ZERO policies, `has_table_privilege`
--       falso para `anon` e `authenticated` em SELECT/INSERT/UPDATE/DELETE; `SET LOCAL ROLE anon`
--       e `SET LOCAL ROLE authenticated` (claims de candidato) lendo a tabela → 42501 `permission
--       denied for table`; as três RPCs DEFINER com `search_path=""`, `anon` sem EXECUTE e a
--       chamada sob `anon` falha com `permission denied for function`; `authenticated` com
--       EXECUTE; as duas funções de trigger sem EXECUTE para `anon`/`authenticated`.
--   (b) D-01: o titular pede as três (RH em triagem, RH em decisão final, knockout) → uma linha
--       cada, com `historico_rejeicao_id` = a rejeição corrente, `origem`, `etapa_rejeitada`,
--       `etapa_reabertura` (`triagem` no knockout — D-30), `rejeitado_por` (= A; NULL no knockout),
--       `opcao_knockout_id` só no knockout (= o da candidatura); a RPC devolve só
--       `{solicitada_em}`; cada pedido enfileira EXATAMENTE UM `net.http_post` — para
--       `notificar-rh`, com exatamente as chaves `evento`, `candidatura_id`, `ciclo`.
--   (c) titular alheio → 42501 no pedido e `NULL` no estado; claims de RH → 42501 no pedido e
--       `NULL` no estado.
--   (d) D-06/D-05/D-07: rejeição com histórico de 400 dias → elegível; primeiro pedido aceito;
--       segundo pedido da MESMA rejeição → nenhuma linha nova, devolve o existente; candidatura
--       `em_analise`, `finalizado` e retirada pelo candidato → P0002.
--   (e) REVISAO-05 e helper: A responde a revisão da própria rejeição → 42501 com «decisor» na
--       mensagem; RH inativo (token velho) → 42501; claims de candidato → 42501; no knockout, A e
--       B podem responder (sondas que revertem).
--   (f) revertida (D-02/D-30/D-04): RH-em-triagem → `triagem`; RH-em-decisão-final →
--       `decisao_final`; knockout → `triagem`; vaga arquivada também reabre; em cada uma:
--       `status = 'em_analise'`, +1 linha de histórico com `ator` = revisor e `etapa_para` =
--       destino, `feedback_rejeicao` e `data_decisao_final` nulos, `reaberta_em` preenchido, prazo
--       = 00:00 SP do 11º dia; enfileira UM `notificar-candidato` `revisao_respondida` com
--       `pedido_id` e `ciclo`. D-06: uma rejeição NOVA depois da reabertura gera direito novo.
--   (g) mantida: pedido respondido, candidatura intocada (status, etapa e contagem de histórico);
--       resultado < 50 → 22023; veredito fora do vocabulário → 22023; segunda resposta → 22023;
--       pedir de novo depois da improcedente devolve o existente (D-06: improcedente encerra).
--   (h) D-36: a revertida do knockout enfileira exatamente UM POST para
--       `/functions/v1/analise-candidato-individual` com `candidatura_id` e `vaga_id` da fixture; a
--       revertida de rejeição pelo RH não enfileira nenhum para essa EF.
--   (i) D-03/D-35: depois da revertida do knockout, `motivo_rejeicao = 'knockout_automatico'` e
--       `opcao_knockout_id` mantidos, `status = 'em_analise'`; por FORMA, o conjunto das funções de
--       `public` cujo corpo sem comentários contém `knockout_automatico` E um
--       `UPDATE public.candidaturas`/`INSERT INTO public.candidaturas` é exatamente
--       `{submit_candidatura_atomic}` (ESCOPO deliberado: a única escritora do knockout).
--   (j) D-01 sem buraco / D-08: rejeição por `registrar_decisao` → estado `NULL` e pedido P0002
--       (dono = `decisao_final`); `decisao_final` em espera + `rejeitar_candidatura` → elegível
--       `humana_triagem`; ciclo de `decisao_final` revertido + `rejeitar_candidatura` → elegível;
--       sobre a população VIVA de `status = 'rejeitado'`: cada uma tem EXATAMENTE um caminho, as
--       rejeições pelo RH sem ator são zero, e para cada titular com `user_id` o estado sob o JWT
--       dele é coerente (`elegivel` ou `pedido`, origem certa), sem nenhuma escrita (contagem da
--       tabela nova igual antes e depois das sondas). População impressa; vazia = FALHA.
--   (k) allowlist do titular: o jsonb de `estado_revisao_rejeicao` tem só `origem`, `elegivel` e
--       `pedido` com as seis chaves permitidas, e nenhuma folha com cara de UUID — julgado sobre um
--       estado cujo `pedido` NÃO é nulo (pedido criado pela própria fixture de (k); `pedido` nulo =
--       FALHA, nunca vacuidade); depois da revertida (status `em_analise`), o estado continua
--       devolvendo o pedido respondido.
--   v2 (51-10, migration 20261008000003 — a FILA do RH). Cada cláusula abaixo monta NO PRÓPRIO
--   envelope `P51B1` (titular sintético, vagas, candidaturas, rejeições e pedidos pelas RPCs REAIS)
--   as linhas que julga, nunca depende do que outra cláusula deixou nem da `revisao_rejeicao` viva
--   (vazia, D-08), e imprime a população julgada em `p51.evidencia` (vazia = FALHA):
--   (l) a fila: `RETURNS` com `origem text`/`pedido_id uuid` e sem `justificativa`; fixture com três
--       pedidos PENDENTES — `tri` (rejeição de A pelo RH em triagem), `ko` (knockout por
--       `submit_candidatura_atomic`) e `dfr` (`registrar_decisao` rejeitando, por A, +
--       `solicitar_revisao_decisao`); sob o administrador, A e B, `listar_revisoes_decisao(true)` e
--       `(false)` trazem os três, com origem `humana_triagem`/`automatica`/`humana`, `pedido_id` =
--       id do registro (distintos), `decisao = rejeitado` e `decidido_por_nome` nulo SÓ no knockout;
--       `pode_responder` falso para A em `tri` e `dfr` (REVISAO-05) e verdadeiro no `ko`; verdadeiro
--       para B nos três; md5 da fila inteira sem `pode_responder` igual para administrador, A e B
--       (exige ao menos um ator com claim `rh`, senão FALHA); recrutador INATIVO → 42501 ou fila VAZIA
--       (contrato do P50, «nunca >= 1»); candidato → 42501; `anon` → ACL.
--   (m) a contagem: fixture com `p1` e `ko` PENDENTES e `resp` RESPONDIDO (`mantida`, por B, RPC
--       real); para administrador, A e B, `contar_revisoes_pendentes()` sobe EXATAMENTE +2 em
--       relação à medida antes dos pedidos (baseline desta execução) e é igual ao `count(*)` de
--       `listar_revisoes_decisao(false)`; o respondido está fora da pendente e dentro da completa
--       (veredito `mantida`); inativo 42501 ou zero; candidato 42501; `anon` → ACL.
--   (n) D-11: fixture com um knockout e uma rejeição pelo RH, os dois pedidos feitos; sob B e sob A
--       `ler_contexto_knockout_revisao(<pedido do ko>)` = exatamente {situacao: disponivel, pergunta:
--       a da fixture, resposta: Nao, opcao_eliminatoria: Nao}; depois de apagar as respostas da
--       fixture (o que o motor faz) → {situacao: removida} e o resto nulo; pedido de rejeição pelo RH
--       e pedido inexistente → P0002; RH inativo (pedido real E inexistente) e candidato → 42501 (sem
--       oráculo de existência); `anon` → ACL.
--   (z) resíduo: nenhum id da fixture sobrevive; contagens globais = baseline DESTA execução,
--       sobre um conjunto lido POR FORMA do catálogo — toda tabela base de `public` mais
--       `auth.users` e a fila `net.http_request_queue` —, com o número de tabelas impresso (zero
--       = FALHA).
--
-- O PORTÃO MORDE — mutações MB1..MB14 por `scripts/p51_mutacoes.cjs` (Task 2 do 51-08), cada uma
-- numa requisição que aborta: prefixo do ensaio + migration intacta + MUTAÇÃO + este smoke +
-- sentinela. Cada uma tem de reprovar na letra abaixo e NÃO chegar ao sentinela; toda mordida é
-- sobre linhas que a FIXTURE cria (a `revisao_rejeicao` viva nasce vazia, D-08). Medido em
-- 2026-10-09, ANTES do apply (20261008000002 prefixada; CONTROLE verde `51b=12/12` em 772 ms;
-- `20/20 mutacoes mordem; nada persistiu`, MA1..MA6 do 51-06 incluídas):
--   | Mutação | Inversão                                                         | Reprova | Linha mordida (fixture)              | Duração |
--   |---------|------------------------------------------------------------------|---------|--------------------------------------|---------|
--   | MB1     | REVISAO-05 desligada (IF do decisor → IF false)                  | (e)     | A responde o pedido de `tri`: ACEITO | 751 ms  |
--   | MB2     | `is_active_rh_user()` fora do ramo rh (→ IF false)               | (e)     | recrutador inativo responde `tri`    | 735 ms  |
--   | MB3     | `GRANT EXECUTE solicitar_revisao_rejeicao TO anon`               | (a)     | ACL da RPC: anon EXECUTE = t         | 738 ms  |
--   | MB4     | `GRANT SELECT ON revisao_rejeicao TO anon`                       | (a)     | privilégio de tabela anon:SELECT     | 811 ms  |
--   | MB5     | reabertura só pelo status (sem `etapa_atual` no SET)             | (f)     | `tri` reaberta fica etapa rejeitado  | 716 ms  |
--   | MB6     | knockout reabre em `inscricao` (+ CHECK derrubado)               | (b) *   | pedido de `ko`: etapa_reabertura     | 638 ms  |
--   | MB7     | UNIQUE removida + INSERT sem ON CONFLICT                         | (d)     | 2º pedido de `c400` grava 2ª linha   | 751 ms  |
--   | MB8     | guarda de titular por `candidatos.id` (forma do C-4)             | (b)     | titular T pede `tri`: 42501          | 739 ms  |
--   | MB9     | `public.p51_mutacao_knockout()` faz UPDATE … knockout_automatico | (i)     | conjunto por forma ganha a função    | 762 ms  |
--   | MB10    | despacho da análise removido da revertida do knockout            | (h)     | revertida de `ko`: 0 POST à EF       | 790 ms  |
--   | MB11    | `estado` expõe `rejeitado_por` dentro de `pedido`                | (k)     | estado k1 do pedido de `k`           | 795 ms  |
--   | MB12    | predicado de dono `decisao_final` desligado (nas duas RPCs)      | (j)     | `rd` (registrar_decisao) elegível    | 657 ms  |
--   | MB13    | guarda de titular do pedido desligada (→ IF false)               | (c)     | intruso X pede `tri`: ACEITO         | 798 ms  |
--   | MB14    | guarda «já respondida» desligada (→ IF false)                    | (g)     | 2ª resposta ao pedido de `mant`      | 770 ms  |
--   * MB6 REDECLARADA de (f) para (b): a etapa de reabertura é GRAVADA NO PEDIDO (escolha 3 do
--     planejador), e (b) assere `etapa_reabertura = triagem` no pedido do knockout (D-30) — a
--     mutação aparece ali, antes da reabertura. Nenhuma cláusula foi afrouxada: (f) segue exigindo
--     `triagem` na candidatura reaberta do knockout, e MB5 morde (f).
--   MB13 e MB14 foram acrescentadas na execução (precedente MA6 do 51-06): sem elas (c) e (g) não
--   tinham mutação própria — MB8 reprova (b) antes de (c). (z) é a negativa de resíduo, vigiada
--   também pelo `capturar()` do ensaio. A próxima redefinição destas funções re-prova esta tabela.
--
-- Varredura D-56 (forma) — 2026-10-09, padrão LITERAL do CLAUDE.md §«Portões» sobre
-- `supabase/tests/*.sql` (antes deste arquivo existir):
--   População da forma: 369 linhas. Achados cujo texto toca revisão/rejeição/knockout/decisão/
--   histórico: 29, todos lidos. Nenhum muda com a 0002, porque o mecanismo (b) não reescreve
--   nenhuma função do ciclo `decisao_final` nem da fila:
--   · `funil34_kpis_smokes.sql:216` (`knockout_rate.total <> 0`) — vaga sem knockout; é do
--     `funil_kpis`, que o 51-10 reescreve (D-35), não daqui.
--   · `oper31_rejeitar_candidatura_smokes.sql:280` (`v_after - v_before <> 1`, delta de histórico
--     de UMA chamada) — escopo: `rejeitar_candidatura` não muda.
--   · `p42_revisao_art20_smoke.sql:695/725`, `p42_notif_revisao_smoke.sql:428/440`,
--     `p49_revisao_por_analise_smoke.sql:*`, `p45_motor_exclusao_smoke.sql:4062`,
--     `p46_teardown_fixture.sql:290-292` — contagens de resíduo e de escopo da PRÓPRIA fixture;
--     não enxergam a tabela nova e não precisam (a revisão nova só nasce por RPC nova).
--   · `p46_purga_smoke.sql:827/964` (`relname IN ('decisao_final','vagas','retencao_hold')`) —
--     escopo deliberado: as três tabelas que AQUELE bloco muta.
--   · `p50_acesso_recrutador_smoke.sql:1830/1985` (`v_rc <> 1`) — escritas de semeadura de uma
--     linha; a fila (k) dele é do 51-10 (C-12), não deste plano.
--   Este arquivo tem constantes DELIBERADAS, todas escopo: o esperado 12 (o número de cláusulas
--   DESTE arquivo), os destinos de reabertura (D-02/D-30) e as contagens 1 de escrita da fixture.
--   Toda contagem global é baseline capturada na execução, sobre conjunto lido do catálogo.
--
-- COMO RODAR: SÓ pelo envelope que aborta — `node scripts/p51_ensaio.cjs [--vistas]
-- --migracoes=supabase/migrations/20261008000002_p51_revisao_rejeicao.sql
-- supabase/tests/p51_revisao_rejeicao_smoke.sql` (depois do apply do 51-16, `--sem-migracoes`).
-- VERMELHO sem a migration (primeiro em (a): a tabela não existe), VERDE com ela. Desde o 51-10 o
-- ensaio prefixa também `20261008000003` (`--migracoes=…0002…,…0003…`); só com a 0002, (l) reprova
-- (o `RETURNS` da fila não tem `origem`/`pedido_id`). ⚠ PROIBIDO:
-- `node p46apply.cjs run` deste arquivo — o `run` COMMITA; o bloco `$p51_so_ensaio$` recusa antes
-- de qualquer escrita.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), não uma fotografia do banco. Vive num ÚNICO literal (`smoke51b.esperado`, abaixo);
-- o gate e o JSON final LEEM a GUC. Hoje: 15 — a, b, c, d, e, f, g, h, i, j, k, l, m, n, z.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- GUARDA ESTRUTURAL — PRIMEIRA instrução do arquivo. Este smoke ESCREVE (envelope P51B1) e só
-- pode rodar dentro de `scripts/p51_ensaio.cjs` (ou de `p51_mutacoes.cjs`, que compõe pelo mesmo
-- `compor`): o PREFIXO do ensaio grava o txid da requisição na GUC LOCAL `p51.tx` e aborta tudo
-- no sentinela. Fora dele a marca não existe e o arquivo para AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
DO $p51_so_ensaio$
DECLARE
  v_tx text := coalesce(current_setting('p51.tx', true), '');
BEGIN
  IF v_tx = '' THEN
    RAISE EXCEPTION 'P51B RECUSADO (fora do ensaio): este smoke ESCREVE (envelope P51B1) e so roda dentro de scripts/p51_ensaio.cjs, que marca a requisicao (p51.tx) e a aborta no sentinela; p46apply.cjs run COMMITA e e proibido. Nada rodou. Use: node scripts/p51_ensaio.cjs [--sem-migracoes] supabase/tests/p51_revisao_rejeicao_smoke.sql';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P51B RECUSADO (fora do ensaio): a marca p51.tx (%) nao e desta transacao (%): a requisicao nao e a que o ensaio abriu. Nada rodou', v_tx, txid_current();
  END IF;
END
$p51_so_ensaio$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('app.rejeicao_sancionada', '', false);
SELECT set_config('app.transicao_sancionada', '', false);
SELECT set_config('smoke51b.pass', '0', false);
SELECT set_config('smoke51b.esperado', '15', false);
SELECT set_config('smoke51b.fixtures', '', false);
SELECT set_config('smoke51b.m', '', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores vivos (leitura, como postgres) e as contagens globais para (z), sobre o
-- conjunto lido POR FORMA do catálogo.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_a    uuid;  r_a  text;
  v_b    uuid;  r_b  text;
  v_ina  uuid;
  v_adm  uuid;
  v_cnt  jsonb := '{}'::jsonb;
  v_n    bigint;
  r      record;
BEGIN
  SELECT u.user_id, CASE WHEN u.role = 'administrador' THEN 'administrador' ELSE 'rh' END INTO v_a, r_a
    FROM public.usuarios_rh u
   WHERE u.user_id IS NOT NULL AND u.ativo AND u.deleted_at IS NULL
   ORDER BY (u.role = 'recrutador') DESC, u.created_at, u.user_id
   LIMIT 1;
  SELECT u.user_id, CASE WHEN u.role = 'administrador' THEN 'administrador' ELSE 'rh' END INTO v_b, r_b
    FROM public.usuarios_rh u
   WHERE u.user_id IS NOT NULL AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS DISTINCT FROM v_a
   ORDER BY (u.role = 'recrutador') DESC, u.created_at, u.user_id
   LIMIT 1;
  SELECT u.user_id INTO v_ina
    FROM public.usuarios_rh u
   WHERE u.user_id IS NOT NULL AND u.role = 'recrutador' AND NOT u.ativo AND u.deleted_at IS NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  SELECT u.user_id INTO v_adm
    FROM public.usuarios_rh u
   WHERE u.user_id IS NOT NULL AND u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_a IS NULL OR v_b IS NULL OR v_ina IS NULL OR v_adm IS NULL THEN
    RAISE EXCEPTION 'P51B FAIL (baseline): falta ator (rh ativo A = %, rh ativo B = %, recrutador inativo = %, administrador ativo = %) — ausencia de ator REPROVA, nunca pula',
      v_a IS NOT NULL, v_b IS NOT NULL, v_ina IS NOT NULL, v_adm IS NOT NULL;
  END IF;

  PERFORM set_config('smoke51b.a',   v_a::text,   false);
  PERFORM set_config('smoke51b.ra',  r_a,         false);
  PERFORM set_config('smoke51b.b',   v_b::text,   false);
  PERFORM set_config('smoke51b.rb',  r_b,         false);
  PERFORM set_config('smoke51b.ina', v_ina::text, false);
  PERFORM set_config('smoke51b.adm', v_adm::text, false);

  -- (z) conjunto lido POR FORMA: toda tabela base (ou particionada) de `public`, mais auth.users e
  -- a fila do pg_net — nunca lista literal (CLAUDE.md §Portões).
  FOR r IN
    SELECT n.nspname AS s, c.relname AS t
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE (n.nspname = 'public' AND c.relkind IN ('r', 'p'))
        OR (n.nspname = 'auth' AND c.relname = 'users' AND c.relkind = 'r')
        OR (n.nspname = 'net' AND c.relname = 'http_request_queue' AND c.relkind = 'r')
     ORDER BY 1, 2
  LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I', r.s, r.t) INTO v_n;
    v_cnt := v_cnt || jsonb_build_object(r.s || '.' || r.t, v_n);
  END LOOP;
  PERFORM set_config('smoke51b.base', v_cnt::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1 — fixture + medições de todas as cláusulas numa subtransação que reverte (`P51B1`).
-- O que foi medido vai para a GUC de sessão `smoke51b.m`; o julgamento roda nos blocos seguintes.
-- Sem a tabela nova (RED), nada é medido e (a) reprova pelo motivo certo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p1$
DECLARE
  v_a     uuid := current_setting('smoke51b.a')::uuid;
  v_b     uuid := current_setting('smoke51b.b')::uuid;
  v_ina   uuid := current_setting('smoke51b.ina')::uuid;
  v_adm   uuid := current_setting('smoke51b.adm')::uuid;
  c_just  constant text := 'Justificativa sintetica do smoke P51B: rejeicao registrada pela fixture, com mais de cinquenta caracteres.';
  c_resp  constant text := 'Resposta sintetica do revisor no smoke P51B: texto ao titular, com mais de cinquenta caracteres no total.';
  j_tit   text;  j_int text;  j_a text;  j_b text;  j_ina text;  j_adm text;  j_x text;
  v_ran   boolean := false;
  v_err   text;
  v_user  uuid;  v_email text;
  v_tit   uuid;  v_int uuid;  v_ctit uuid;  v_cand uuid;
  ids     jsonb := '{}'::jsonb;
  v_vgs   jsonb := '{}'::jsonb;
  fx      jsonb := '{}'::jsonb;
  c_tri uuid; c_df uuid; c_ko uuid; c_arq uuid; c_mant uuid; c_400 uuid; c_ema uuid; c_fin uuid;
  c_ret uuid; c_rd uuid; c_esp uuid; c_rev uuid; c_k uuid;
  p_tri uuid; p_ko uuid; p_mant uuid; p_k uuid; p_x uuid;
  v_vko   uuid;  v_pko uuid;  v_opn uuid;  v_vaga uuid;  v_cid uuid;  v_rev uuid;
  lbl     text;  parts text[];  dest text;
  v_ret   jsonb;
  v_fila  jsonb;
  v_q     bigint[];
  v_h     uuid[];
  v_n     bigint;  v_n2 bigint;
  st      text;
  m       jsonb := '{}'::jsonb;
BEGIN
  IF to_regclass('public.revisao_rejeicao') IS NULL THEN
    PERFORM set_config('smoke51b.m', '{"ausente": true}', false);
    RETURN;
  END IF;

  BEGIN
    -- ── fixture · titular T e intruso X ───────────────────────────────────────
    FOR i IN 1 .. 2 LOOP
      v_user  := gen_random_uuid();
      v_email := 'p51b-smoke-' || replace(v_user::text, '-', '') || '@invalido.local';
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                              created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
      VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              v_email, '', now(), now(),
              '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
      INSERT INTO public.candidatos
        (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
      VALUES
        (v_user, 'SMOKE P51B Titular ' || i, v_email, '(11) 95108-51' || lpad(i::text, 2, '0'),
         DATE '1991-04-12', 'Santos', 'SP', 'site')
      RETURNING id INTO v_cand;
      IF i = 1 THEN v_tit := v_user; v_ctit := v_cand; ELSE v_int := v_user; END IF;
    END LOOP;

    j_tit := json_build_object('sub', v_tit::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'candidato'))::text;
    j_int := json_build_object('sub', v_int::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'candidato'))::text;
    j_a   := json_build_object('sub', v_a::text,   'role', 'authenticated', 'app_metadata', json_build_object('role', current_setting('smoke51b.ra')))::text;
    j_b   := json_build_object('sub', v_b::text,   'role', 'authenticated', 'app_metadata', json_build_object('role', current_setting('smoke51b.rb')))::text;
    j_ina := json_build_object('sub', v_ina::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'rh'))::text;
    j_adm := json_build_object('sub', v_adm::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'administrador'))::text;

    -- ── fixture · uma vaga sintética por candidatura (rótulo:etapa:status) ────
    -- Idioma do 51-06: nasce `rejeitado` (desarma `trg_notif_confirmacao`) e vai ao status alvo
    -- por UPDATE só de status, como postgres SEM JWT (a guarda de reabertura só vale com JWT).
    FOREACH lbl IN ARRAY ARRAY['tri:triagem:em_analise', 'df:decisao_final:em_analise', 'arq:triagem:em_analise',
                               'mant:triagem:em_analise', 'c400:triagem:em_analise', 'ema:triagem:em_analise',
                               'fin:aprovado:finalizado', 'ret:triagem:aguardando_resposta',
                               'rd:decisao_final:em_analise', 'esp:decisao_final:em_analise',
                               'rev:decisao_final:em_analise', 'k:triagem:em_analise'] LOOP
      parts  := string_to_array(lbl, ':');
      v_vaga := gen_random_uuid();
      INSERT INTO public.vagas (id, titulo, slug, status)
      VALUES (v_vaga, '[SMOKE P51B] ' || parts[1], 'p51b-smoke-' || replace(v_vaga::text, '-', ''), 'ativa');
      INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
      VALUES (v_ctit, v_vaga, parts[2]::public.etapa_processo, 'rejeitado', false, now() - interval '20 days')
      RETURNING id INTO v_cid;
      UPDATE public.candidaturas SET status = parts[3]::public.status_candidatura WHERE id = v_cid;
      ids   := ids   || jsonb_build_object(parts[1], v_cid);
      v_vgs := v_vgs || jsonb_build_object(parts[1], v_vaga);
    END LOOP;
    c_tri := (ids ->> 'tri')::uuid;  c_df  := (ids ->> 'df')::uuid;   c_arq := (ids ->> 'arq')::uuid;
    c_mant := (ids ->> 'mant')::uuid; c_400 := (ids ->> 'c400')::uuid; c_ema := (ids ->> 'ema')::uuid;
    c_fin := (ids ->> 'fin')::uuid;  c_ret := (ids ->> 'ret')::uuid;  c_rd  := (ids ->> 'rd')::uuid;
    c_esp := (ids ->> 'esp')::uuid;  c_rev := (ids ->> 'rev')::uuid;  c_k   := (ids ->> 'k')::uuid;

    -- ── fixture · rejeições pelo RH pela RPC REAL, sob o JWT de A ─────────────
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_a, true);
    FOREACH lbl IN ARRAY ARRAY['tri', 'df', 'arq', 'mant', 'c400', 'k'] LOOP
      PERFORM public.rejeitar_candidatura((ids ->> lbl)::uuid, 'perfil_desalinhado'::public.motivo_rejeicao_rh, c_just);
    END LOOP;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);

    -- D-04: a vaga da candidatura `arq` é arquivada DEPOIS da rejeição.
    UPDATE public.vagas SET status = 'arquivada' WHERE id = (v_vgs ->> 'arq')::uuid;
    m := m || jsonb_build_object('arq_vaga', (SELECT v.status::text FROM public.vagas v WHERE v.id = (v_vgs ->> 'arq')::uuid));

    -- D-05: a rejeição de `c400` tem 400 dias (envelhece SÓ as linhas desta candidatura).
    UPDATE public.historico_candidatura SET criado_em = now() - interval '400 days' WHERE candidatura_id = c_400;
    UPDATE public.candidaturas SET data_candidatura = now() - interval '410 days' WHERE id = c_400;

    -- ── fixture · knockout pela RPC REAL submit_candidatura_atomic (sem JWT) ──
    v_vko := gen_random_uuid();  v_pko := gen_random_uuid();  v_opn := gen_random_uuid();
    INSERT INTO public.vagas (id, titulo, slug, status)
    VALUES (v_vko, '[SMOKE P51B] ko', 'p51b-smoke-' || replace(v_vko::text, '-', ''), 'ativa');
    v_vgs := v_vgs || jsonb_build_object('ko', v_vko);
    INSERT INTO public.perguntas_formulario (id, vaga_id, bloco, ordem, texto_pergunta, tipo_resposta, opcoes_resposta)
    VALUES (v_pko, v_vko, 'valores', 1, '[SMOKE P51B] Pergunta eliminatoria', 'single_choice',
            jsonb_build_array(jsonb_build_object('id', v_opn, 'texto', 'Nao'),
                              jsonb_build_object('id', gen_random_uuid(), 'texto', 'Sim')));
    INSERT INTO public.pergunta_opcao_metadata (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
    VALUES (v_pko, v_opn, 'Nao', 'knockout', 0, 1);
    v_ret := public.submit_candidatura_atomic(v_ctit, v_vko, 'smoke://cv', 'smoke.pdf', 0,
               jsonb_build_array(jsonb_build_object('pergunta_id', v_pko, 'resposta_opcoes', jsonb_build_array('Nao'))));
    -- submit grava a sanção de rejeição com is_local=true: vale até o fim da TRANSAÇÃO. Zerada aqui
    -- para não vazar para as escritas seguintes da fixture.
    PERFORM set_config('app.rejeicao_sancionada', '', true);
    c_ko := (v_ret ->> 'candidatura_id')::uuid;
    ids  := ids || jsonb_build_object('ko', c_ko);
    m := m || jsonb_build_object('ko_fixture', (SELECT jsonb_build_object('status', c.status, 'etapa', c.etapa_atual,
                'motivo', c.motivo_rejeicao, 'opcao', c.opcao_knockout_id, 'opcao_esperada', v_opn)
              FROM public.candidaturas c WHERE c.id = c_ko));

    -- ── fixture · retirada pelo candidato (RPC REAL) ──────────────────────────
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_tit, true);
    PERFORM public.retirar_candidatura(c_ret);
    RESET ROLE;

    -- ── fixture (j) · decisões finais pelas RPCs REAIS ────────────────────────
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_a, true);
    PERFORM public.registrar_decisao(c_rd, 'rejeitado'::public.decisao_final_resultado, c_just);
    PERFORM set_config('app.rejeicao_sancionada', '', true);
    PERFORM public.registrar_decisao(c_esp, 'em_espera'::public.decisao_final_resultado, c_just);
    PERFORM public.rejeitar_candidatura(c_esp, 'outro'::public.motivo_rejeicao_rh, c_just);
    PERFORM public.registrar_decisao(c_rev, 'rejeitado'::public.decisao_final_resultado, c_just);
    PERFORM set_config('app.rejeicao_sancionada', '', true);
    PERFORM set_config('request.jwt.claims', j_tit, true);
    PERFORM public.solicitar_revisao_decisao(c_rev);
    PERFORM set_config('request.jwt.claims', j_b, true);
    PERFORM public.responder_revisao_decisao(c_rev, 'revertida', c_resp);
    RESET ROLE;
    UPDATE public.historico_candidatura SET criado_em = criado_em - interval '1 hour' WHERE candidatura_id = c_rev;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_a, true);
    PERFORM public.rejeitar_candidatura(c_rev, 'outro'::public.motivo_rejeicao_rh, c_just);
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    m := m || jsonb_build_object('j_fixture', (SELECT jsonb_object_agg(x.l, x.v) FROM (
               SELECT l, jsonb_build_object('status', c.status, 'etapa', c.etapa_atual,
                        'decisao', d.decisao, 'veredito', d.revisao_veredito, 'reaberta', d.reaberta_em IS NOT NULL) AS v
                 FROM unnest(ARRAY['rd', 'esp', 'rev']) l
                 JOIN public.candidaturas c ON c.id = (ids ->> l)::uuid
                 LEFT JOIN public.decisao_final d ON d.candidatura_id = c.id) x));

    -- ════════════════════════════ MEDIÇÕES ═══════════════════════════════════

    -- ── (a) · sob anon e sob authenticated, a tabela e as RPCs morrem no ACL ──
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN SELECT count(*) INTO v_n FROM public.revisao_rejeicao; st := 'ACEITO:' || v_n;
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    m := m || jsonb_build_object('a_anon_tab', st);
    BEGIN v_ret := public.solicitar_revisao_rejeicao(c_tri); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    m := m || jsonb_build_object('a_anon_sol', st);
    BEGIN v_ret := public.estado_revisao_rejeicao(c_tri); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    m := m || jsonb_build_object('a_anon_est', st);
    BEGIN PERFORM public.responder_revisao_rejeicao(gen_random_uuid(), 'mantida', c_resp); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    m := m || jsonb_build_object('a_anon_resp', st);
    RESET ROLE;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_tit, true);
    BEGIN SELECT count(*) INTO v_n FROM public.revisao_rejeicao; st := 'ACEITO:' || v_n;
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    m := m || jsonb_build_object('a_auth_tab', st);
    RESET ROLE;

    -- ── (b) · o titular pede as três origens ──────────────────────────────────
    FOREACH lbl IN ARRAY ARRAY['tri', 'df', 'ko'] LOOP
      v_cid := (ids ->> lbl)::uuid;
      v_q := ARRAY(SELECT q.id FROM net.http_request_queue q);
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', j_tit, true);
      BEGIN v_ret := public.solicitar_revisao_rejeicao(v_cid); st := 'ACEITO';
      EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_ret := NULL; END;
      RESET ROLE;
      SELECT coalesce(jsonb_agg(jsonb_build_object('fn', regexp_replace(q.url, '^.*/functions/v1/', ''),
                                                   'b', convert_from(q.body, 'UTF8')::jsonb) ORDER BY q.id), '[]'::jsonb)
        INTO v_fila FROM net.http_request_queue q WHERE NOT (q.id = ANY (v_q));
      m := m || jsonb_build_object('b_' || lbl, jsonb_build_object(
        'st', st, 'ret', v_ret, 'fila', v_fila,
        'n', (SELECT count(*) FROM public.revisao_rejeicao r WHERE r.candidatura_id = v_cid),
        'row', (SELECT to_jsonb(r) FROM public.revisao_rejeicao r WHERE r.candidatura_id = v_cid ORDER BY r.solicitada_em, r.id LIMIT 1),
        'cur', (SELECT h.id FROM public.historico_candidatura h
                 WHERE h.candidatura_id = v_cid AND (h.etapa_para = 'rejeitado' OR h.auto_rejeitado)
                 ORDER BY h.criado_em DESC, h.id DESC LIMIT 1),
        'opcao', (SELECT c.opcao_knockout_id FROM public.candidaturas c WHERE c.id = v_cid)));
    END LOOP;
    p_tri := (SELECT r.id FROM public.revisao_rejeicao r WHERE r.candidatura_id = c_tri ORDER BY r.solicitada_em, r.id LIMIT 1);
    p_ko  := (SELECT r.id FROM public.revisao_rejeicao r WHERE r.candidatura_id = c_ko  ORDER BY r.solicitada_em, r.id LIMIT 1);

    -- ── (c) · titular alheio e claims de RH ───────────────────────────────────
    SET LOCAL ROLE authenticated;
    FOREACH lbl IN ARRAY ARRAY['int', 'rh'] LOOP
      PERFORM set_config('request.jwt.claims', CASE lbl WHEN 'int' THEN j_int ELSE j_a END, true);
      BEGIN v_ret := public.solicitar_revisao_rejeicao(c_tri); st := 'ACEITO:' || coalesce(v_ret::text, '<null>');
      EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
      m := m || jsonb_build_object('c_' || lbl || '_sol', st);
      BEGIN v_ret := public.estado_revisao_rejeicao(c_tri); st := 'ACEITO:' || coalesce(v_ret::text, '<null>');
      EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
      m := m || jsonb_build_object('c_' || lbl || '_est', st);
    END LOOP;
    RESET ROLE;

    -- ── (d) · 400 dias, idempotência, fora de `rejeitado` ─────────────────────
    m := m || jsonb_build_object('d_idade_dias', (SELECT extract(day FROM now() - max(h.criado_em))::int
                                                    FROM public.historico_candidatura h WHERE h.candidatura_id = c_400));
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_tit, true);
    BEGIN v_ret := public.estado_revisao_rejeicao(c_400); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_ret := NULL; END;
    m := m || jsonb_build_object('d_est', jsonb_build_object('st', st, 'ret', v_ret));
    BEGIN v_ret := public.solicitar_revisao_rejeicao(c_400); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_ret := NULL; END;
    m := m || jsonb_build_object('d_s1', jsonb_build_object('st', st, 'ret', v_ret));
    BEGIN v_ret := public.solicitar_revisao_rejeicao(c_400); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_ret := NULL; END;
    m := m || jsonb_build_object('d_s2', jsonb_build_object('st', st, 'ret', v_ret));
    FOREACH lbl IN ARRAY ARRAY['ema', 'fin', 'ret'] LOOP
      BEGIN v_ret := public.solicitar_revisao_rejeicao((ids ->> lbl)::uuid); st := 'ACEITO';
      EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
      m := m || jsonb_build_object('d_' || lbl, st);
    END LOOP;
    RESET ROLE;
    m := m || jsonb_build_object('d_n', (SELECT count(*) FROM public.revisao_rejeicao r WHERE r.candidatura_id = c_400),
                                 'd_estado_fora', (SELECT jsonb_object_agg(l, jsonb_build_object('status', c.status, 'etapa', c.etapa_atual,
                                                            'retirada', c.encerrada_a_pedido_em IS NOT NULL))
                                                     FROM unnest(ARRAY['ema', 'fin', 'ret']) l
                                                     JOIN public.candidaturas c ON c.id = (ids ->> l)::uuid));

    -- ── (e) · REVISAO-05 e helper — SONDAS que revertem mesmo quando aceitas ──
    m := m || jsonb_build_object('e_pedidos', jsonb_build_object('tri', p_tri IS NOT NULL, 'ko', p_ko IS NOT NULL));
    SET LOCAL ROLE authenticated;
    FOREACH lbl IN ARRAY ARRAY['a:tri', 'ina:tri', 'tit:tri', 'a:ko', 'b:ko'] LOOP
      parts := string_to_array(lbl, ':');
      PERFORM set_config('request.jwt.claims',
        CASE parts[1] WHEN 'a' THEN j_a WHEN 'b' THEN j_b WHEN 'ina' THEN j_ina ELSE j_tit END, true);
      BEGIN
        PERFORM public.responder_revisao_rejeicao(CASE parts[2] WHEN 'tri' THEN p_tri ELSE p_ko END, 'mantida', c_resp);
        RAISE EXCEPTION 'sonda revertida' USING ERRCODE = 'P51B2';
      EXCEPTION
        WHEN SQLSTATE 'P51B2' THEN st := 'ACEITO';
        WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM;
      END;
      m := m || jsonb_build_object('e_' || parts[1] || '_' || parts[2], st);
    END LOOP;
    RESET ROLE;

    -- ── (f)/(h)/(i) · revertida: tri, df, arq por B; ko por A ─────────────────
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_tit, true);
    BEGIN v_ret := public.solicitar_revisao_rejeicao(c_arq); st := 'ACEITO';   -- o pedido de arq (julgado em (f))
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    m := m || jsonb_build_object('f_sol_arq', st);
    RESET ROLE;
    m := m || jsonb_build_object('prazo_esp',
               (((now() AT TIME ZONE 'America/Sao_Paulo')::date + 11)::timestamp AT TIME ZONE 'America/Sao_Paulo'));
    FOREACH lbl IN ARRAY ARRAY['tri:b:triagem', 'df:b:decisao_final', 'arq:b:triagem', 'ko:a:triagem'] LOOP
      parts := string_to_array(lbl, ':');
      v_cid := (ids ->> parts[1])::uuid;
      v_rev := CASE parts[2] WHEN 'a' THEN v_a ELSE v_b END;
      dest  := parts[3];
      p_x   := (SELECT r.id FROM public.revisao_rejeicao r WHERE r.candidatura_id = v_cid ORDER BY r.solicitada_em, r.id LIMIT 1);
      v_q   := ARRAY(SELECT q.id FROM net.http_request_queue q);
      v_h   := ARRAY(SELECT h.id FROM public.historico_candidatura h WHERE h.candidatura_id = v_cid);
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', CASE parts[2] WHEN 'a' THEN j_a ELSE j_b END, true);
      BEGIN PERFORM public.responder_revisao_rejeicao(p_x, 'revertida', c_resp); st := 'ACEITO';
      EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
      RESET ROLE;
      SELECT coalesce(jsonb_agg(jsonb_build_object('fn', regexp_replace(q.url, '^.*/functions/v1/', ''),
                                                   'b', convert_from(q.body, 'UTF8')::jsonb) ORDER BY q.id), '[]'::jsonb)
        INTO v_fila FROM net.http_request_queue q WHERE NOT (q.id = ANY (v_q));
      m := m || jsonb_build_object('f_' || parts[1], jsonb_build_object(
        'st', st, 'dest', dest, 'revisor', v_rev, 'pedido_id', p_x, 'fila', v_fila,
        'cand', (SELECT jsonb_build_object('status', c.status, 'etapa', c.etapa_atual, 'feedback', c.feedback_rejeicao,
                                           'data_decisao_final', c.data_decisao_final, 'motivo', c.motivo_rejeicao,
                                           'opcao', c.opcao_knockout_id, 'vaga_id', c.vaga_id)
                   FROM public.candidaturas c WHERE c.id = v_cid),
        'hist_novas', (SELECT coalesce(jsonb_agg(jsonb_build_object('de', h.etapa_de, 'para', h.etapa_para, 'ator', h.ator)), '[]'::jsonb)
                         FROM public.historico_candidatura h WHERE h.candidatura_id = v_cid AND NOT (h.id = ANY (v_h))),
        'pedido', (SELECT to_jsonb(r) FROM public.revisao_rejeicao r WHERE r.id = p_x)));
    END LOOP;
    -- D-06: uma rejeição NOVA depois da reabertura gera direito novo (envelhece as linhas de tri).
    UPDATE public.historico_candidatura SET criado_em = criado_em - interval '1 hour' WHERE candidatura_id = c_tri;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_a, true);
    BEGIN PERFORM public.rejeitar_candidatura(c_tri, 'outro'::public.motivo_rejeicao_rh, c_just); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    m := m || jsonb_build_object('f_rerej', st);
    PERFORM set_config('request.jwt.claims', j_tit, true);
    BEGIN v_ret := public.estado_revisao_rejeicao(c_tri); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_ret := NULL; END;
    m := m || jsonb_build_object('f_novo', jsonb_build_object('st', st, 'ret', v_ret));
    RESET ROLE;

    -- ── (g) · mantida ─────────────────────────────────────────────────────────
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_tit, true);
    BEGIN v_ret := public.solicitar_revisao_rejeicao(c_mant); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_ret := NULL; END;
    m := m || jsonb_build_object('g_sol', jsonb_build_object('st', st, 'ret', v_ret));
    RESET ROLE;
    p_mant := (SELECT r.id FROM public.revisao_rejeicao r WHERE r.candidatura_id = c_mant ORDER BY r.solicitada_em, r.id LIMIT 1);
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_b, true);
    FOREACH lbl IN ARRAY ARRAY['curto', 'ver'] LOOP
      BEGIN
        IF lbl = 'curto' THEN
          PERFORM public.responder_revisao_rejeicao(p_mant, 'mantida', 'Resposta curta demais.');
        ELSE
          PERFORM public.responder_revisao_rejeicao(p_mant, 'talvez', c_resp);
        END IF;
        RAISE EXCEPTION 'sonda revertida' USING ERRCODE = 'P51B2';
      EXCEPTION
        WHEN SQLSTATE 'P51B2' THEN st := 'ACEITO';
        WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM;
      END;
      m := m || jsonb_build_object('g_' || lbl, st);
    END LOOP;
    RESET ROLE;
    v_q := ARRAY(SELECT q.id FROM net.http_request_queue q);
    v_n := (SELECT count(*) FROM public.historico_candidatura h WHERE h.candidatura_id = c_mant);
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_b, true);
    BEGIN PERFORM public.responder_revisao_rejeicao(p_mant, 'mantida', c_resp); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    m := m || jsonb_build_object('g_mant', st);
    BEGIN
      PERFORM public.responder_revisao_rejeicao(p_mant, 'revertida', c_resp);
      RAISE EXCEPTION 'sonda revertida' USING ERRCODE = 'P51B2';
    EXCEPTION
      WHEN SQLSTATE 'P51B2' THEN st := 'ACEITO';
      WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM;
    END;
    m := m || jsonb_build_object('g_seg', st);
    RESET ROLE;
    SELECT coalesce(jsonb_agg(jsonb_build_object('fn', regexp_replace(q.url, '^.*/functions/v1/', ''),
                                                 'b', convert_from(q.body, 'UTF8')::jsonb) ORDER BY q.id), '[]'::jsonb)
      INTO v_fila FROM net.http_request_queue q WHERE NOT (q.id = ANY (v_q));
    v_n2 := (SELECT count(*) FROM public.historico_candidatura h WHERE h.candidatura_id = c_mant);
    m := m || jsonb_build_object('g_depois', jsonb_build_object(
      'hist_delta', v_n2 - v_n, 'fila', v_fila, 'revisor', v_b, 'pedido_id', p_mant,
      'cand', (SELECT jsonb_build_object('status', c.status, 'etapa', c.etapa_atual) FROM public.candidaturas c WHERE c.id = c_mant),
      'pedido', (SELECT to_jsonb(r) FROM public.revisao_rejeicao r WHERE r.id = p_mant)));
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_tit, true);
    BEGIN v_ret := public.solicitar_revisao_rejeicao(c_mant); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_ret := NULL; END;
    RESET ROLE;
    m := m || jsonb_build_object('g_sol2', jsonb_build_object('st', st, 'ret', v_ret),
                                 'g_n', (SELECT count(*) FROM public.revisao_rejeicao r WHERE r.candidatura_id = c_mant));

    -- ── (j) · as três formas de `decisao_final` ───────────────────────────────
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_tit, true);
    FOREACH lbl IN ARRAY ARRAY['rd', 'esp', 'rev'] LOOP
      BEGIN v_ret := public.estado_revisao_rejeicao((ids ->> lbl)::uuid); st := 'ACEITO';
      EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_ret := NULL; END;
      m := m || jsonb_build_object('j_' || lbl || '_est', jsonb_build_object('st', st, 'ret', v_ret));
    END LOOP;
    BEGIN v_ret := public.solicitar_revisao_rejeicao(c_rd); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    m := m || jsonb_build_object('j_rd_sol', st);
    RESET ROLE;

    -- ── (k) · allowlist do titular, com pedido NÃO nulo ───────────────────────
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_tit, true);
    BEGIN v_ret := public.solicitar_revisao_rejeicao(c_k); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    m := m || jsonb_build_object('k_sol', st);
    BEGIN v_ret := public.estado_revisao_rejeicao(c_k); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_ret := NULL; END;
    m := m || jsonb_build_object('k1', jsonb_build_object('st', st, 'ret', v_ret));
    RESET ROLE;
    p_k := (SELECT r.id FROM public.revisao_rejeicao r WHERE r.candidatura_id = c_k ORDER BY r.solicitada_em, r.id LIMIT 1);
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_b, true);
    BEGIN PERFORM public.responder_revisao_rejeicao(p_k, 'revertida', c_resp); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    m := m || jsonb_build_object('k_resp', st);
    PERFORM set_config('request.jwt.claims', j_tit, true);
    BEGIN v_ret := public.estado_revisao_rejeicao(c_k); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_ret := NULL; END;
    RESET ROLE;
    m := m || jsonb_build_object('k2', jsonb_build_object('st', st, 'ret', v_ret),
                                 'k_status', (SELECT c.status FROM public.candidaturas c WHERE c.id = c_k));

    m := m || jsonb_build_object('a_ids', jsonb_build_object('a', v_a, 'b', v_b, 'adm', v_adm), 'resp_texto', c_resp,
                                 'n_pedidos', (SELECT count(*) FROM public.revisao_rejeicao));
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P51B1';
  EXCEPTION
    WHEN SQLSTATE 'P51B1' THEN
      NULL;  -- ROLLBACK da subtransação. Os valores medidos estão em `m`.
    WHEN OTHERS THEN
      v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  -- FORA da subtransação: um set_config dentro dela volta junto com o ROLLBACK (até o de sessão).
  fx := jsonb_build_object('candidaturas', coalesce((SELECT jsonb_agg(v) FROM jsonb_each_text(ids) e(k, v)), '[]'::jsonb),
                           'vagas', coalesce((SELECT jsonb_agg(v) FROM jsonb_each_text(v_vgs) e(k, v)), '[]'::jsonb));
  PERFORM set_config('smoke51b.fixtures', fx::text, false);

  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION 'P51B FAIL (fixture): a subtransacao abortou por erro INESPERADO (%) — nenhuma clausula foi julgada; o defeito e da FIXTURE, nao do objeto vigiado (cada chamada sob prova tem bloco de excecao proprio)', v_err;
  END IF;
  IF NOT v_ran THEN
    RAISE EXCEPTION 'P51B FAIL (fixture): a subtransacao nao chegou ao fim e nao houve erro capturado — estado impossivel';
  END IF;
  PERFORM set_config('smoke51b.m', m::text, false);
END
$p1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) CATÁLOGO / ACL — tabela sem policy e sem privilégio; RPCs DEFINER; anon fora.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a$
DECLARE
  m      jsonb := current_setting('smoke51b.m')::jsonb;
  v_rls  boolean;
  v_pol  bigint;
  v_priv text;
  v_fn   text;
  v_def  text;
  v_bad  text := '';
  k      text;
BEGIN
  IF pg_catalog.to_regclass('public.revisao_rejeicao') IS NULL OR coalesce((m ->> 'ausente')::boolean, false) THEN
    RAISE EXCEPTION 'P51B FAIL (a): tabela public.revisao_rejeicao AUSENTE — o registro proprio do pedido de revisao (JORN-42) nao existe; nenhuma rejeicao fora da decisao final tem caminho de revisao';
  END IF;
  SELECT c.relrowsecurity INTO v_rls FROM pg_catalog.pg_class c WHERE c.oid = 'public.revisao_rejeicao'::regclass;
  SELECT count(*) INTO v_pol FROM pg_catalog.pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'revisao_rejeicao';
  SELECT string_agg(r || ':' || pv, ',' ORDER BY r, pv) INTO v_priv
    FROM unnest(ARRAY['anon', 'authenticated']) r, unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) pv
   WHERE has_table_privilege(r, 'public.revisao_rejeicao', pv);
  IF NOT coalesce(v_rls, false) OR v_pol <> 0 OR v_priv IS NOT NULL THEN
    RAISE EXCEPTION 'P51B FAIL (a): revisao_rejeicao com rls=% policies=% privilegios de tabela=[%] (esperado rls=true, ZERO policy e NENHUM privilegio para anon/authenticated — acesso so por RPC DEFINER)',
      v_rls, v_pol, coalesce(v_priv, '');
  END IF;
  IF coalesce(m ->> 'a_anon_tab', '<nao rodou>') NOT LIKE '42501:permission denied for table revisao_rejeicao%'
     OR coalesce(m ->> 'a_auth_tab', '<nao rodou>') NOT LIKE '42501:permission denied for table revisao_rejeicao%' THEN
    RAISE EXCEPTION 'P51B FAIL (a): leitura direta da tabela sob anon=«%» e sob authenticated (claims de candidato)=«%» (esperado 42501 permission denied for table nos dois — «ACEITO:0» quer dizer que so a RLS segurou)',
      coalesce(m ->> 'a_anon_tab', '<nao rodou>'), coalesce(m ->> 'a_auth_tab', '<nao rodou>');
  END IF;
  FOREACH v_fn IN ARRAY ARRAY['public.solicitar_revisao_rejeicao(uuid)', 'public.estado_revisao_rejeicao(uuid)',
                              'public.responder_revisao_rejeicao(uuid,text,text)'] LOOP
    SELECT concat_ws('|', p.prosecdef, p.proconfig = ARRAY['search_path=""'],
                     has_function_privilege('anon', p.oid, 'EXECUTE'), has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      INTO v_def
      FROM pg_catalog.pg_proc p WHERE p.oid = pg_catalog.to_regprocedure(v_fn);
    IF v_def IS DISTINCT FROM 't|t|f|t' THEN
      v_bad := v_bad || format('%s=%s; ', v_fn, coalesce(v_def, '<ausente>'));
    END IF;
  END LOOP;
  FOREACH v_fn IN ARRAY ARRAY['public.trg_notif_revisao_rejeicao_solicitada()', 'public.trg_notif_revisao_rejeicao_respondida()'] LOOP
    SELECT concat_ws('|', p.prosecdef, has_function_privilege('anon', p.oid, 'EXECUTE'), has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      INTO v_def
      FROM pg_catalog.pg_proc p WHERE p.oid = pg_catalog.to_regprocedure(v_fn);
    IF v_def IS DISTINCT FROM 't|f|f' THEN
      v_bad := v_bad || format('%s=%s; ', v_fn, coalesce(v_def, '<ausente>'));
    END IF;
  END LOOP;
  IF v_bad <> '' THEN
    RAISE EXCEPTION 'P51B FAIL (a): funcoes fora do contrato (definer|search_path vazio|anon EXECUTE|authenticated EXECUTE; triggers: definer|anon|authenticated): %', v_bad;
  END IF;
  FOREACH k IN ARRAY ARRAY['a_anon_sol:solicitar_revisao_rejeicao', 'a_anon_est:estado_revisao_rejeicao', 'a_anon_resp:responder_revisao_rejeicao'] LOOP
    IF coalesce(m ->> split_part(k, ':', 1), '<nao rodou>') NOT LIKE '42501:permission denied for function ' || split_part(k, ':', 2) || '%' THEN
      RAISE EXCEPTION 'P51B FAIL (a): sob SET LOCAL ROLE anon, % deu «%» (esperado 42501 permission denied for function — o ACL, nao a guarda)',
        split_part(k, ':', 2), coalesce(m ->> split_part(k, ':', 1), '<nao rodou>');
    END IF;
  END LOOP;
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) D-01 — o titular pede as três origens; uma linha cada; um despacho para notificar-rh.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $b$
DECLARE
  m     jsonb := current_setting('smoke51b.m')::jsonb;
  v_a   text  := current_setting('smoke51b.a');
  lbl   text;
  v     jsonb;
  r     jsonb;
  f     jsonb;
  e_or  text;  e_rej text;  e_reab text;  e_por text;
  v_k   text[];
BEGIN
  FOREACH lbl IN ARRAY ARRAY['tri', 'df', 'ko'] LOOP
    v := m -> ('b_' || lbl);
    r := v -> 'row';
    e_or   := CASE lbl WHEN 'ko' THEN 'automatica' ELSE 'humana_triagem' END;
    e_rej  := CASE lbl WHEN 'tri' THEN 'triagem' WHEN 'df' THEN 'decisao_final' ELSE 'inscricao' END;
    e_reab := CASE lbl WHEN 'df' THEN 'decisao_final' ELSE 'triagem' END;
    e_por  := CASE lbl WHEN 'ko' THEN NULL ELSE v_a END;
    IF coalesce(v ->> 'st', '<nao rodou>') <> 'ACEITO' THEN
      RAISE EXCEPTION 'P51B FAIL (b): o TITULAR pediu revisao da rejeicao % e recebeu «%» (esperado aceito — D-01: toda rejeicao tem pedido)', lbl, coalesce(v ->> 'st', '<nao rodou>');
    END IF;
    SELECT array_agg(x ORDER BY x) INTO v_k FROM jsonb_object_keys(CASE WHEN jsonb_typeof(v -> 'ret') = 'object' THEN v -> 'ret' ELSE '{}'::jsonb END) x;
    IF v_k IS DISTINCT FROM ARRAY['solicitada_em'] THEN
      RAISE EXCEPTION 'P51B FAIL (b): solicitar_revisao_rejeicao (%) devolveu % (esperado exatamente {solicitada_em})', lbl, coalesce((v -> 'ret')::text, '<null>');
    END IF;
    IF (v ->> 'n')::int IS DISTINCT FROM 1 OR r IS NULL THEN
      RAISE EXCEPTION 'P51B FAIL (b): % pedido(s) gravado(s) para a rejeicao % (esperado 1)', v ->> 'n', lbl;
    END IF;
    IF r ->> 'historico_rejeicao_id' IS DISTINCT FROM v ->> 'cur'
       OR r ->> 'origem' IS DISTINCT FROM e_or
       OR r ->> 'etapa_rejeitada' IS DISTINCT FROM e_rej
       OR r ->> 'etapa_reabertura' IS DISTINCT FROM e_reab
       OR r ->> 'rejeitado_por' IS DISTINCT FROM e_por
       OR (r ->> 'solicitada_em')::timestamptz IS DISTINCT FROM (v -> 'ret' ->> 'solicitada_em')::timestamptz
       OR (lbl = 'ko' AND (r ->> 'opcao_knockout_id' IS NULL OR r ->> 'opcao_knockout_id' IS DISTINCT FROM v ->> 'opcao'))
       OR (lbl <> 'ko' AND r ->> 'opcao_knockout_id' IS NOT NULL) THEN
      RAISE EXCEPTION 'P51B FAIL (b): pedido de % = {historico=%, origem=%, etapa_rejeitada=%, etapa_reabertura=%, rejeitado_por=%, opcao=%} (esperado {historico=% (rejeicao corrente), origem=%, etapa_rejeitada=%, etapa_reabertura=% (D-30 no knockout), rejeitado_por=%, opcao=%})',
        lbl, r ->> 'historico_rejeicao_id', r ->> 'origem', r ->> 'etapa_rejeitada', r ->> 'etapa_reabertura', r ->> 'rejeitado_por', r ->> 'opcao_knockout_id',
        v ->> 'cur', e_or, e_rej, e_reab, coalesce(e_por, 'NULL'), CASE lbl WHEN 'ko' THEN v ->> 'opcao' ELSE 'NULL' END;
    END IF;
    IF jsonb_array_length(v -> 'fila') <> 1 OR (v -> 'fila' -> 0 ->> 'fn') IS DISTINCT FROM 'notificar-rh' THEN
      RAISE EXCEPTION 'P51B FAIL (b): o pedido de % enfileirou % (esperado exatamente UM net.http_post, para notificar-rh)', lbl, v -> 'fila';
    END IF;
    f := v -> 'fila' -> 0 -> 'b';
    SELECT array_agg(x ORDER BY x) INTO v_k FROM jsonb_object_keys(f) x;
    IF v_k IS DISTINCT FROM ARRAY['candidatura_id', 'ciclo', 'evento']
       OR f ->> 'evento' IS DISTINCT FROM 'revisao_solicitada'
       OR f ->> 'candidatura_id' IS DISTINCT FROM r ->> 'candidatura_id'
       OR f ->> 'ciclo' IS DISTINCT FROM extract(epoch FROM (r ->> 'solicitada_em')::timestamptz)::bigint::text THEN
      RAISE EXCEPTION 'P51B FAIL (b): corpo do despacho de % = % (esperado exatamente {evento:revisao_solicitada, candidatura_id, ciclo = epoch de solicitada_em} — a EF notificar-rh de hoje so aceita essas tres chaves)', lbl, f;
    END IF;
  END LOOP;
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) GUARDA DE TITULAR — alheio e RH não pedem nem leem.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c$
DECLARE
  m jsonb := current_setting('smoke51b.m')::jsonb;
BEGIN
  IF coalesce(m ->> 'c_int_sol', '<nao rodou>') NOT LIKE '42501:%'
     OR coalesce(m ->> 'c_rh_sol', '<nao rodou>') NOT LIKE '42501:%'
     OR coalesce(m ->> 'c_int_est', '<nao rodou>') IS DISTINCT FROM 'ACEITO:<null>'
     OR coalesce(m ->> 'c_rh_est', '<nao rodou>') IS DISTINCT FROM 'ACEITO:<null>' THEN
    RAISE EXCEPTION 'P51B FAIL (c): titular alheio pedido=«%» estado=«%»; claims rh pedido=«%» estado=«%» (esperado 42501 no pedido e NULL no estado — quem nao e o titular nao pede nem le)',
      coalesce(m ->> 'c_int_sol', '<nao rodou>'), coalesce(m ->> 'c_int_est', '<nao rodou>'),
      coalesce(m ->> 'c_rh_sol', '<nao rodou>'), coalesce(m ->> 'c_rh_est', '<nao rodou>');
  END IF;
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$c$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) D-05 / D-06 / D-07 — sem prazo, um pedido por rejeição, só `rejeitado`.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $d$
DECLARE
  m  jsonb := current_setting('smoke51b.m')::jsonb;
  fo jsonb := m -> 'd_estado_fora';
BEGIN
  IF coalesce((m ->> 'd_idade_dias')::int, 0) < 399 THEN
    RAISE EXCEPTION 'P51B FAIL (d): a rejeicao de 400 dias da fixture tem % dia(s) — a clausula seria vacua', m ->> 'd_idade_dias';
  END IF;
  IF coalesce(m -> 'd_est' ->> 'st', '<nao rodou>') <> 'ACEITO'
     OR (m -> 'd_est' -> 'ret') IS DISTINCT FROM '{"origem": "humana_triagem", "elegivel": true, "pedido": null}'::jsonb THEN
    RAISE EXCEPTION 'P51B FAIL (d): rejeicao de 400 dias -> estado «%» % (esperado {origem:humana_triagem, elegivel:true, pedido:null} — D-05: sem prazo para pedir)',
      m -> 'd_est' ->> 'st', coalesce((m -> 'd_est' -> 'ret')::text, '<null>');
  END IF;
  IF coalesce(m -> 'd_s1' ->> 'st', '<nao rodou>') <> 'ACEITO' OR coalesce(m -> 'd_s2' ->> 'st', '<nao rodou>') <> 'ACEITO'
     OR (m -> 'd_s1' -> 'ret' ->> 'solicitada_em') IS NULL
     OR (m -> 'd_s1' -> 'ret') IS DISTINCT FROM (m -> 'd_s2' -> 'ret')
     OR (m ->> 'd_n')::int IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P51B FAIL (d): dois pedidos da MESMA rejeicao -> 1o «%» %, 2o «%» %, % linha(s) (esperado os dois aceitos, o 2o devolvendo o existente, e 1 linha — D-06: um pedido por rejeicao)',
      m -> 'd_s1' ->> 'st', m -> 'd_s1' -> 'ret', m -> 'd_s2' ->> 'st', m -> 'd_s2' -> 'ret', m ->> 'd_n';
  END IF;
  IF fo -> 'ema' ->> 'status' IS DISTINCT FROM 'em_analise' OR fo -> 'fin' ->> 'status' IS DISTINCT FROM 'finalizado'
     OR (fo -> 'ret' ->> 'retirada')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P51B FAIL (d): a fixture fora de rejeitado nao tem a forma pretendida (%) — a clausula seria vacua', fo;
  END IF;
  IF coalesce(m ->> 'd_ema', '<nao rodou>') NOT LIKE 'P0002:%' OR coalesce(m ->> 'd_fin', '<nao rodou>') NOT LIKE 'P0002:%'
     OR coalesce(m ->> 'd_ret', '<nao rodou>') NOT LIKE 'P0002:%' THEN
    RAISE EXCEPTION 'P51B FAIL (d): pedido sobre em_analise=«%», finalizado=«%», retirada=«%» (esperado P0002 nos tres — D-07: so status rejeitado entra)',
      m ->> 'd_ema', m ->> 'd_fin', m ->> 'd_ret';
  END IF;
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$d$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) REVISAO-05 E HELPER — quem rejeitou não responde; inativo e candidato não respondem;
--     no knockout A e B respondem.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $e$
DECLARE
  m jsonb := current_setting('smoke51b.m')::jsonb;
BEGIN
  IF (m -> 'e_pedidos') IS DISTINCT FROM '{"tri": true, "ko": true}'::jsonb THEN
    RAISE EXCEPTION 'P51B FAIL (e): pedidos da fixture ausentes (%) — as sondas seriam vacuas', m -> 'e_pedidos';
  END IF;
  IF coalesce(m ->> 'e_a_tri', '<nao rodou>') NOT LIKE '42501:%decisor%' THEN
    RAISE EXCEPTION 'P51B FAIL (e): A respondeu a revisao da PROPRIA rejeicao com «%» (esperado 42501 com «decisor» — REVISAO-05)', coalesce(m ->> 'e_a_tri', '<nao rodou>');
  END IF;
  IF coalesce(m ->> 'e_ina_tri', '<nao rodou>') NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P51B FAIL (e): recrutador INATIVO (token velho) respondeu com «%» (esperado 42501 — is_active_rh_user no ramo rh, D-02 da 50)', coalesce(m ->> 'e_ina_tri', '<nao rodou>');
  END IF;
  IF coalesce(m ->> 'e_tit_tri', '<nao rodou>') NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P51B FAIL (e): claims de CANDIDATO responderam com «%» (esperado 42501)', coalesce(m ->> 'e_tit_tri', '<nao rodou>');
  END IF;
  IF coalesce(m ->> 'e_a_ko', '<nao rodou>') <> 'ACEITO' OR coalesce(m ->> 'e_b_ko', '<nao rodou>') <> 'ACEITO' THEN
    RAISE EXCEPTION 'P51B FAIL (e): no knockout A respondeu «%» e B «%» (esperado os dois aceitos — sem decisor, qualquer RH ativo responde, D-10)',
      coalesce(m ->> 'e_a_ko', '<nao rodou>'), coalesce(m ->> 'e_b_ko', '<nao rodou>');
  END IF;
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$e$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) REVERTIDA — reabre na etapa certa, com trilha, prazo e aviso; D-06 direito novo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $f$
DECLARE
  m     jsonb := current_setting('smoke51b.m')::jsonb;
  lbl   text;
  v     jsonb;  c jsonb;  p jsonb;  h jsonb;  f jsonb;
  v_k   text[];
  v_n   int;
BEGIN
  IF m ->> 'arq_vaga' IS DISTINCT FROM 'arquivada' THEN
    RAISE EXCEPTION 'P51B FAIL (f): a vaga da fixture arq nao esta arquivada (%) — D-04 seria vacuo', m ->> 'arq_vaga';
  END IF;
  IF coalesce(m ->> 'f_sol_arq', '<nao rodou>') <> 'ACEITO' THEN
    RAISE EXCEPTION 'P51B FAIL (f): o titular pediu revisao da rejeicao na vaga ARQUIVADA e recebeu «%» (esperado aceito — D-04: o direito nao depende da vaga)', coalesce(m ->> 'f_sol_arq', '<nao rodou>');
  END IF;
  FOREACH lbl IN ARRAY ARRAY['tri', 'df', 'arq', 'ko'] LOOP
    v := m -> ('f_' || lbl);  c := v -> 'cand';  p := v -> 'pedido';  h := v -> 'hist_novas';
    IF coalesce(v ->> 'st', '<nao rodou>') <> 'ACEITO' THEN
      RAISE EXCEPTION 'P51B FAIL (f): revertida de % deu «%» (esperado aceita)', lbl, coalesce(v ->> 'st', '<nao rodou>');
    END IF;
    IF c ->> 'status' IS DISTINCT FROM 'em_analise' OR c ->> 'etapa' IS DISTINCT FROM v ->> 'dest'
       OR c ->> 'feedback' IS NOT NULL OR c ->> 'data_decisao_final' IS NOT NULL THEN
      RAISE EXCEPTION 'P51B FAIL (f): depois da revertida, % esta % (esperado {status:em_analise, etapa:% (D-02/D-30), feedback:null, data_decisao_final:null})',
        lbl, c, v ->> 'dest';
    END IF;
    IF jsonb_array_length(h) <> 1 OR h -> 0 ->> 'para' IS DISTINCT FROM v ->> 'dest' OR h -> 0 ->> 'ator' IS DISTINCT FROM v ->> 'revisor' THEN
      RAISE EXCEPTION 'P51B FAIL (f): a reabertura de % gravou % linha(s) de historico: % (esperado UMA, etapa_para=% e ator=% — a trilha da reabertura)',
        lbl, jsonb_array_length(h), h, v ->> 'dest', v ->> 'revisor';
    END IF;
    IF p ->> 'veredito' IS DISTINCT FROM 'revertida' OR p ->> 'reaberta_em' IS NULL
       OR (p ->> 'prazo_nova_decisao_em')::timestamptz IS DISTINCT FROM (m ->> 'prazo_esp')::timestamptz
       OR p ->> 'respondida_por' IS DISTINCT FROM v ->> 'revisor' OR p ->> 'respondida_em' IS NULL
       OR p ->> 'resultado' IS DISTINCT FROM m ->> 'resp_texto' THEN
      RAISE EXCEPTION 'P51B FAIL (f): pedido de % depois da revertida = {veredito=%, reaberta_em=%, prazo=%, respondida_por=%} (esperado revertida, reaberta preenchida, prazo=% (00:00 SP do 11o dia), respondida_por=%, resultado = a resposta)',
        lbl, p ->> 'veredito', p ->> 'reaberta_em', p ->> 'prazo_nova_decisao_em', p ->> 'respondida_por', m ->> 'prazo_esp', v ->> 'revisor';
    END IF;
    SELECT count(*) INTO v_n FROM jsonb_array_elements(v -> 'fila') e
     WHERE e ->> 'fn' = 'notificar-candidato' AND e -> 'b' ->> 'evento' = 'revisao_respondida';
    SELECT e -> 'b' INTO f FROM jsonb_array_elements(v -> 'fila') e
     WHERE e ->> 'fn' = 'notificar-candidato' AND e -> 'b' ->> 'evento' = 'revisao_respondida' LIMIT 1;
    SELECT array_agg(x ORDER BY x) INTO v_k FROM jsonb_object_keys(coalesce(f, '{}'::jsonb)) x;
    IF v_n <> 1 OR v_k IS DISTINCT FROM ARRAY['candidatura_id', 'ciclo', 'evento', 'pedido_id']
       OR f ->> 'pedido_id' IS DISTINCT FROM v ->> 'pedido_id'
       OR f ->> 'candidatura_id' IS DISTINCT FROM p ->> 'candidatura_id'
       OR f ->> 'ciclo' IS DISTINCT FROM extract(epoch FROM (p ->> 'solicitada_em')::timestamptz)::bigint::text THEN
      RAISE EXCEPTION 'P51B FAIL (f): a resposta de % enfileirou % despacho(s) revisao_respondida; corpo % (esperado UM, com exatamente {evento, candidatura_id, ciclo, pedido_id})',
        lbl, v_n, coalesce(f::text, '<nenhum>');
    END IF;
  END LOOP;
  IF coalesce(m ->> 'f_rerej', '<nao rodou>') <> 'ACEITO'
     OR coalesce(m -> 'f_novo' ->> 'st', '<nao rodou>') <> 'ACEITO'
     OR (m -> 'f_novo' -> 'ret') IS DISTINCT FROM '{"origem": "humana_triagem", "elegivel": true, "pedido": null}'::jsonb THEN
    RAISE EXCEPTION 'P51B FAIL (f): rejeicao NOVA depois da reabertura -> rejeitar «%», estado «%» % (esperado aceita e {origem:humana_triagem, elegivel:true, pedido:null} — D-06: nova rejeicao gera direito novo)',
      m ->> 'f_rerej', m -> 'f_novo' ->> 'st', coalesce((m -> 'f_novo' -> 'ret')::text, '<null>');
  END IF;
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$f$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (g) MANTIDA — encerra o pedido sem tocar a candidatura; vereditos inválidos recusados.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $g$
DECLARE
  m  jsonb := current_setting('smoke51b.m')::jsonb;
  g  jsonb := m -> 'g_depois';
  p  jsonb := m -> 'g_depois' -> 'pedido';
  v_n int;
BEGIN
  IF coalesce(m -> 'g_sol' ->> 'st', '<nao rodou>') <> 'ACEITO' THEN
    RAISE EXCEPTION 'P51B FAIL (g): o pedido da fixture mantida deu «%» (esperado aceito)', m -> 'g_sol' ->> 'st';
  END IF;
  IF coalesce(m ->> 'g_curto', '<nao rodou>') NOT LIKE '22023:%' OR coalesce(m ->> 'g_ver', '<nao rodou>') NOT LIKE '22023:%' THEN
    RAISE EXCEPTION 'P51B FAIL (g): resposta com resultado curto=«%», veredito fora do vocabulario=«%» (esperado 22023 nos dois)',
      coalesce(m ->> 'g_curto', '<nao rodou>'), coalesce(m ->> 'g_ver', '<nao rodou>');
  END IF;
  IF coalesce(m ->> 'g_mant', '<nao rodou>') <> 'ACEITO' THEN
    RAISE EXCEPTION 'P51B FAIL (g): a resposta mantida de B deu «%» (esperado aceita)', m ->> 'g_mant';
  END IF;
  IF g -> 'cand' IS DISTINCT FROM '{"status": "rejeitado", "etapa": "rejeitado"}'::jsonb OR (g ->> 'hist_delta')::int IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P51B FAIL (g): depois da mantida a candidatura esta % com % linha(s) nova(s) de historico (esperado intocada: rejeitado/rejeitado, 0)', g -> 'cand', g ->> 'hist_delta';
  END IF;
  IF p ->> 'veredito' IS DISTINCT FROM 'mantida' OR p ->> 'reaberta_em' IS NOT NULL OR p ->> 'prazo_nova_decisao_em' IS NOT NULL
     OR p ->> 'respondida_por' IS DISTINCT FROM g ->> 'revisor' OR p ->> 'resultado' IS DISTINCT FROM m ->> 'resp_texto' THEN
    RAISE EXCEPTION 'P51B FAIL (g): pedido depois da mantida = % (esperado veredito mantida, sem reabertura nem prazo, respondida_por = B, resultado = a resposta)', p;
  END IF;
  SELECT count(*) INTO v_n FROM jsonb_array_elements(g -> 'fila') e
   WHERE e ->> 'fn' = 'notificar-candidato' AND e -> 'b' ->> 'evento' = 'revisao_respondida' AND e -> 'b' ->> 'pedido_id' = g ->> 'pedido_id';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'P51B FAIL (g): a mantida enfileirou % aviso(s) revisao_respondida com o pedido_id (esperado 1): %', v_n, g -> 'fila';
  END IF;
  IF coalesce(m ->> 'g_seg', '<nao rodou>') NOT LIKE '22023:%' THEN
    RAISE EXCEPTION 'P51B FAIL (g): segunda resposta ao mesmo pedido deu «%» (esperado 22023 — ja respondida)', coalesce(m ->> 'g_seg', '<nao rodou>');
  END IF;
  IF coalesce(m -> 'g_sol2' ->> 'st', '<nao rodou>') <> 'ACEITO' OR (m -> 'g_sol2' -> 'ret') IS DISTINCT FROM (m -> 'g_sol' -> 'ret')
     OR (m ->> 'g_n')::int IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P51B FAIL (g): pedir de novo depois da improcedente -> «%» %, % linha(s) (esperado o pedido existente e 1 linha — D-06: improcedente encerra)',
      m -> 'g_sol2' ->> 'st', m -> 'g_sol2' -> 'ret', m ->> 'g_n';
  END IF;
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$g$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (h) D-36 — a revertida do knockout despacha UMA análise; a do RH, nenhuma.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $h$
DECLARE
  m    jsonb := current_setting('smoke51b.m')::jsonb;
  lbl  text;
  v_n  int;
  f    jsonb;
BEGIN
  SELECT count(*) INTO v_n FROM jsonb_array_elements(m -> 'f_ko' -> 'fila') e WHERE e ->> 'fn' = 'analise-candidato-individual';
  SELECT e -> 'b' INTO f FROM jsonb_array_elements(m -> 'f_ko' -> 'fila') e WHERE e ->> 'fn' = 'analise-candidato-individual' LIMIT 1;
  IF v_n <> 1 OR f ->> 'candidatura_id' IS DISTINCT FROM m -> 'f_ko' -> 'pedido' ->> 'candidatura_id'
     OR f ->> 'vaga_id' IS DISTINCT FROM m -> 'f_ko' -> 'cand' ->> 'vaga_id' THEN
    RAISE EXCEPTION 'P51B FAIL (h): a revertida do knockout enfileirou % despacho(s) para analise-candidato-individual; corpo % (esperado UM, com a candidatura e a vaga da fixture — D-36)',
      v_n, coalesce(f::text, '<nenhum>');
  END IF;
  FOREACH lbl IN ARRAY ARRAY['tri', 'df', 'arq'] LOOP
    SELECT count(*) INTO v_n FROM jsonb_array_elements(m -> ('f_' || lbl) -> 'fila') e WHERE e ->> 'fn' = 'analise-candidato-individual';
    IF v_n <> 0 THEN
      RAISE EXCEPTION 'P51B FAIL (h): a revertida da rejeicao pelo RH (%) enfileirou % analise(s) (esperado 0 — so o knockout nunca teve analise)', lbl, v_n;
    END IF;
  END LOOP;
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$h$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (i) D-03 / D-35 — knockout revertido mantém a auditoria e não é reaplicado (por forma).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $i$
DECLARE
  m     jsonb := current_setting('smoke51b.m')::jsonb;
  kf    jsonb := m -> 'ko_fixture';
  c     jsonb := m -> 'f_ko' -> 'cand';
  v_esc text[];
BEGIN
  IF kf ->> 'status' IS DISTINCT FROM 'rejeitado' OR kf ->> 'etapa' IS DISTINCT FROM 'inscricao'
     OR kf ->> 'motivo' IS DISTINCT FROM 'knockout_automatico' OR kf ->> 'opcao' IS DISTINCT FROM kf ->> 'opcao_esperada' THEN
    RAISE EXCEPTION 'P51B FAIL (i): submit_candidatura_atomic nao produziu o knockout na fixture (%) — a clausula seria vacua', kf;
  END IF;
  IF c ->> 'motivo' IS DISTINCT FROM 'knockout_automatico' OR c ->> 'opcao' IS DISTINCT FROM kf ->> 'opcao'
     OR c ->> 'status' IS DISTINCT FROM 'em_analise' THEN
    RAISE EXCEPTION 'P51B FAIL (i): knockout revertido = {motivo=%, opcao=%, status=%} (esperado motivo knockout_automatico e opcao mantidos — auditoria, D-35 — e status em_analise)',
      c ->> 'motivo', c ->> 'opcao', c ->> 'status';
  END IF;
  -- ESCOPO DELIBERADO (não fotografia): a ÚNICA escritora do knockout é submit_candidatura_atomic.
  SELECT array_agg(s.proname::text ORDER BY s.proname) INTO v_esc
    FROM (SELECT p.proname,
                 lower(regexp_replace(regexp_replace(p.prosrc, '/\*.*?\*/', '', 'g'), '--[^\n]*', '', 'g')) AS src
            FROM pg_catalog.pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace) s
   WHERE position('knockout_automatico' IN s.src) > 0
     AND s.src ~ '(update\s+public\.candidaturas|insert\s+into\s+public\.candidaturas)';
  IF v_esc IS DISTINCT FROM ARRAY['submit_candidatura_atomic'] THEN
    RAISE EXCEPTION 'P51B FAIL (i): funcoes de public que escrevem candidaturas E citam knockout_automatico = % (esperado exatamente {submit_candidatura_atomic} — nada pode reaplicar o knockout, D-03)',
      coalesce(v_esc::text, '{}');
  END IF;
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$i$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (j) D-01 SEM BURACO / D-08 — o dono de cada rejeição; a população VIVA, sem escrita.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $j$
DECLARE
  m       jsonb := current_setting('smoke51b.m')::jsonb;
  jf      jsonb := m -> 'j_fixture';
  r       record;
  v_est   jsonb;
  v_st    text;
  v_novo  boolean;
  v_n     int := 0;  v_df int := 0;  v_nv int := 0;  v_su int := 0;  v_sa int := 0;
  v_div   text := '';
  v_t0    bigint;  v_t1 bigint;
BEGIN
  -- fixture: as três formas de decisao_final.
  IF jf -> 'rd' ->> 'status' IS DISTINCT FROM 'rejeitado' OR jf -> 'rd' ->> 'decisao' IS DISTINCT FROM 'rejeitado'
     OR jf -> 'esp' ->> 'status' IS DISTINCT FROM 'rejeitado' OR jf -> 'esp' ->> 'decisao' IS DISTINCT FROM 'em_espera'
     OR jf -> 'rev' ->> 'status' IS DISTINCT FROM 'rejeitado' OR jf -> 'rev' ->> 'veredito' IS DISTINCT FROM 'revertida' THEN
    RAISE EXCEPTION 'P51B FAIL (j): a fixture de decisao_final nao tem a forma pretendida (%) — a clausula seria vacua', jf;
  END IF;
  IF coalesce(m -> 'j_rd_est' ->> 'st', '<nao rodou>') <> 'ACEITO' OR coalesce(jsonb_typeof(m -> 'j_rd_est' -> 'ret'), 'null') <> 'null'
     OR coalesce(m ->> 'j_rd_sol', '<nao rodou>') NOT LIKE 'P0002:%' THEN
    RAISE EXCEPTION 'P51B FAIL (j): rejeicao por registrar_decisao -> estado «%» %, pedido «%» (esperado NULL e P0002 — o dono e o ciclo de decisao_final; dois caminhos para a mesma rejeicao)',
      m -> 'j_rd_est' ->> 'st', coalesce((m -> 'j_rd_est' -> 'ret')::text, '<null>'), m ->> 'j_rd_sol';
  END IF;
  IF (m -> 'j_esp_est' -> 'ret') IS DISTINCT FROM '{"origem": "humana_triagem", "elegivel": true, "pedido": null}'::jsonb
     OR (m -> 'j_rev_est' -> 'ret') IS DISTINCT FROM '{"origem": "humana_triagem", "elegivel": true, "pedido": null}'::jsonb THEN
    RAISE EXCEPTION 'P51B FAIL (j): decisao_final em espera + rejeitar_candidatura -> %; ciclo revertido + rejeitar_candidatura -> % (esperado elegivel humana_triagem nos dois — senao a rejeicao fica SEM caminho)',
      coalesce((m -> 'j_esp_est' -> 'ret')::text, '<null>'), coalesce((m -> 'j_rev_est' -> 'ret')::text, '<null>');
  END IF;

  -- população VIVA, sem escrita.
  SELECT count(*) INTO v_t0 FROM public.revisao_rejeicao;
  FOR r IN
    SELECT c.id, ca.user_id,
           EXISTS (SELECT 1 FROM public.decisao_final d
                    WHERE d.candidatura_id = c.id AND d.decisao = 'rejeitado'
                      AND (d.revisao_respondida_em IS NULL OR d.reaberta_em IS NULL)) AS dono_df,
           cur.id AS cur_id, cur.auto_rejeitado, cur.ator
      FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
      LEFT JOIN LATERAL (SELECT h.id, h.auto_rejeitado, h.ator
                           FROM public.historico_candidatura h
                          WHERE h.candidatura_id = c.id AND (h.etapa_para = 'rejeitado' OR h.auto_rejeitado)
                          ORDER BY h.criado_em DESC, h.id DESC LIMIT 1) cur ON true
     WHERE c.status = 'rejeitado'
     ORDER BY c.id
  LOOP
    v_n := v_n + 1;
    IF r.dono_df THEN v_df := v_df + 1; END IF;
    IF NOT r.dono_df AND r.cur_id IS NOT NULL AND NOT r.auto_rejeitado AND r.ator IS NULL THEN v_sa := v_sa + 1; END IF;
    IF r.user_id IS NULL THEN
      v_su := v_su + 1;
      v_est := NULL;  v_st := 'SEM_USER';
      v_novo := (NOT r.dono_df AND r.cur_id IS NOT NULL AND (r.auto_rejeitado OR r.ator IS NOT NULL));
    ELSE
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', r.user_id::text, 'role', 'authenticated',
                'app_metadata', json_build_object('role', 'candidato'))::text, true);
      BEGIN
        v_est := public.estado_revisao_rejeicao(r.id);
        v_st := 'ACEITO';
      EXCEPTION WHEN OTHERS THEN v_st := SQLSTATE || ':' || SQLERRM;  v_est := NULL;
      END;
      RESET ROLE;
      PERFORM set_config('request.jwt.claims', '', true);
      v_novo := v_est IS NOT NULL;
      IF v_st <> 'ACEITO'
         OR (v_novo AND ((v_est ->> 'origem') IS DISTINCT FROM CASE WHEN r.auto_rejeitado THEN 'automatica' ELSE 'humana_triagem' END
                         OR NOT ((v_est ->> 'elegivel')::boolean IS TRUE OR jsonb_typeof(v_est -> 'pedido') = 'object'))) THEN
        v_div := v_div || format('%s: estado=%s %s; ', r.id, v_st, coalesce(v_est::text, '<null>'));
      END IF;
    END IF;
    IF v_novo THEN v_nv := v_nv + 1; END IF;
    IF r.dono_df = v_novo THEN
      v_div := v_div || format('%s: dono_decisao_final=%s registro_novo=%s (esperado EXATAMENTE um caminho); ', r.id, r.dono_df, v_novo);
    END IF;
  END LOOP;
  SELECT count(*) INTO v_t1 FROM public.revisao_rejeicao;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'P51B FAIL (j): populacao VIVA de status rejeitado VAZIA — a clausula nao provaria nada (populacao vazia mente nas duas direcoes)';
  END IF;
  IF v_sa <> 0 THEN
    RAISE EXCEPTION 'P51B FAIL (j): % rejeicao(oes) pelo RH sem ator no historico (esperado 0 — ASSUMPTION do 51-08: o pedido falharia com P0002 em vez de abrir revisao sem dono; levar ao operador)', v_sa;
  END IF;
  IF v_div <> '' THEN
    RAISE EXCEPTION 'P51B FAIL (j): na populacao viva (% rejeitadas: % dono decisao_final, % registro novo, % sem user_id): %', v_n, v_df, v_nv, v_su, v_div;
  END IF;
  IF v_t0 IS DISTINCT FROM v_t1 THEN
    RAISE EXCEPTION 'P51B FAIL (j): a sonda da populacao viva ESCREVEU em revisao_rejeicao (% -> % linhas) — D-08: o direito e calculado, nunca gravado retroativamente', v_t0, v_t1;
  END IF;
  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') || format(' 51b.j=%s(df=%s,novo=%s,sem_user=%s,sem_ator=%s,tabela=%s)', v_n, v_df, v_nv, v_su, v_sa, v_t1)), false);
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$j$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (k) ALLOWLIST DO TITULAR — só origem, elegivel e as seis chaves do pedido; nenhum UUID.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $k$
DECLARE
  m    jsonb := current_setting('smoke51b.m')::jsonb;
  lbl  text;
  r    jsonb;
  v_k  text[];
  v_pk text[];
  v_uu text;
BEGIN
  IF coalesce(m ->> 'k_sol', '<nao rodou>') <> 'ACEITO' OR coalesce(m ->> 'k_resp', '<nao rodou>') <> 'ACEITO' THEN
    RAISE EXCEPTION 'P51B FAIL (k): fixture de (k): pedido «%», revertida «%» (esperado aceitos)', m ->> 'k_sol', m ->> 'k_resp';
  END IF;
  FOREACH lbl IN ARRAY ARRAY['k1', 'k2'] LOOP
    IF coalesce(m -> lbl ->> 'st', '<nao rodou>') <> 'ACEITO' THEN
      RAISE EXCEPTION 'P51B FAIL (k): estado % do titular deu «%» (esperado aceito)', lbl, m -> lbl ->> 'st';
    END IF;
    r := m -> lbl -> 'ret';
    IF jsonb_typeof(r -> 'pedido') IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'P51B FAIL (k): estado % com pedido %, sobre uma rejeicao que TEM pedido (esperado objeto — pedido nulo aqui e falha, nunca vacuidade)', lbl, coalesce(r::text, '<null>');
    END IF;
    SELECT array_agg(x ORDER BY x) INTO v_k  FROM jsonb_object_keys(r) x;
    SELECT array_agg(x ORDER BY x) INTO v_pk FROM jsonb_object_keys(r -> 'pedido') x;
    IF v_k IS DISTINCT FROM ARRAY['elegivel', 'origem', 'pedido']
       OR v_pk IS DISTINCT FROM ARRAY['prazo_nova_decisao_em', 'reaberta_em', 'respondida_em', 'resultado', 'solicitada_em', 'veredito'] THEN
      RAISE EXCEPTION 'P51B FAIL (k): estado % expoe chaves % / pedido % (esperado exatamente {elegivel, origem, pedido} e pedido {solicitada_em, veredito, resultado, respondida_em, reaberta_em, prazo_nova_decisao_em} — nunca rejeitado_por, respondida_por, opcao_knockout_id, ids nem etapas)',
        lbl, v_k, v_pk;
    END IF;
    SELECT string_agg(x #>> '{}', ',') INTO v_uu FROM jsonb_path_query(r, 'strict $.**') x
     WHERE jsonb_typeof(x) = 'string' AND (x #>> '{}') ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
    IF v_uu IS NOT NULL OR (r ->> 'elegivel')::boolean IS DISTINCT FROM false OR r ->> 'origem' IS DISTINCT FROM 'humana_triagem' THEN
      RAISE EXCEPTION 'P51B FAIL (k): estado % = % (esperado origem humana_triagem, elegivel false com pedido, e nenhuma folha com cara de UUID: [%])', lbl, r, coalesce(v_uu, '');
    END IF;
  END LOOP;
  IF m -> 'k1' -> 'ret' -> 'pedido' ->> 'veredito' IS NOT NULL
     OR m -> 'k2' -> 'ret' -> 'pedido' ->> 'veredito' IS DISTINCT FROM 'revertida'
     OR m -> 'k2' -> 'ret' -> 'pedido' ->> 'reaberta_em' IS NULL OR m ->> 'k_status' IS DISTINCT FROM 'em_analise' THEN
    RAISE EXCEPTION 'P51B FAIL (k): antes da resposta veredito=%; depois da revertida veredito=%, reaberta_em=%, status=% (esperado nulo; revertida, preenchida, em_analise — a pagina do titular nao some depois da reabertura)',
      m -> 'k1' -> 'ret' -> 'pedido' ->> 'veredito', m -> 'k2' -> 'ret' -> 'pedido' ->> 'veredito', m -> 'k2' -> 'ret' -> 'pedido' ->> 'reaberta_em', m ->> 'k_status';
  END IF;
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$k$;


-- ═════════════════════════════════════════════════════════════════════════════
-- v2 (Plano 51-10, migration 20261008000003) — a FILA DO RH com as três origens. Cada cláusula
-- monta NO PRÓPRIO envelope (`P51B1`, reverte tudo) as linhas que julga: titular sintético, vagas
-- e candidaturas próprias, rejeições e pedidos pelas RPCs REAIS. Nunca depende do que outra
-- cláusula deixou nem da `revisao_rejeicao` viva (que nasce vazia, D-08); imprime a população
-- julgada em `p51.evidencia`; população vazia = FALHA, nunca vacuidade.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- (l) A FILA — as três origens, com selo e id próprios, iguais para o administrador e o RH ativo;
--     REVISAO-05 por chamador; RH inativo, candidato e anon fora.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $l$
DECLARE
  v_a    uuid := current_setting('smoke51b.a')::uuid;
  v_b    uuid := current_setting('smoke51b.b')::uuid;
  v_ina  uuid := current_setting('smoke51b.ina')::uuid;
  v_adm  uuid := current_setting('smoke51b.adm')::uuid;
  r_a    text := current_setting('smoke51b.ra');
  r_b    text := current_setting('smoke51b.rb');
  c_just constant text := 'Justificativa sintetica do smoke P51B (l): rejeicao registrada pela fixture, com mais de cinquenta caracteres.';
  j_tit  text;  j_a text;  j_b text;  j_ina text;  j_adm text;
  v_user uuid;  v_email text;  v_ctit uuid;  v_vaga uuid;  v_cid uuid;
  c_tri  uuid;  c_dfr uuid;  c_ko uuid;
  p_tri  uuid;  p_dfr uuid;  p_ko uuid;
  v_vko  uuid;  v_pko uuid;  v_opn uuid;  v_ret jsonb;
  lbl    text;  a text;  st text;
  v_md5  text;  v_fx jsonb;  v_n bigint;  v_nf bigint;
  v_res  text;
  m      jsonb := '{}'::jsonb;
  v_err  text;
  v_ran  boolean := false;
  v_bad  text := '';
  x      jsonb;
  e_or   text;  e_ped text;  e_pr boolean;
BEGIN
  IF pg_catalog.to_regprocedure('public.listar_revisoes_decisao(boolean)') IS NULL THEN
    RAISE EXCEPTION 'P51B FAIL (l): listar_revisoes_decisao(boolean) AUSENTE';
  END IF;
  v_res := pg_catalog.pg_get_function_result('public.listar_revisoes_decisao(boolean)'::regprocedure);
  IF position('origem text' IN v_res) = 0 OR position('pedido_id uuid' IN v_res) = 0 OR position('justificativa' IN v_res) > 0 THEN
    RAISE EXCEPTION 'P51B FAIL (l): RETURNS de listar_revisoes_decisao = «%» (esperado com origem text e pedido_id uuid, e SEM justificativa — D-12, C-12, p42 (d))', v_res;
  END IF;
  IF r_a IS DISTINCT FROM 'rh' AND r_b IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'P51B FAIL (l): nenhum ator ativo com claim rh (A=%, B=%) — a igualdade administrador x RH ativo seria vacua', r_a, r_b;
  END IF;

  BEGIN
    -- titular sintético T
    v_user  := gen_random_uuid();
    v_email := 'p51b-smoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES (v_user, 'SMOKE P51B Titular L', v_email, '(11) 95108-5121', DATE '1991-04-12', 'Santos', 'SP', 'site')
    RETURNING id INTO v_ctit;
    j_tit := json_build_object('sub', v_user::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'candidato'))::text;
    j_a   := json_build_object('sub', v_a::text,   'role', 'authenticated', 'app_metadata', json_build_object('role', r_a))::text;
    j_b   := json_build_object('sub', v_b::text,   'role', 'authenticated', 'app_metadata', json_build_object('role', r_b))::text;
    j_ina := json_build_object('sub', v_ina::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'rh'))::text;
    j_adm := json_build_object('sub', v_adm::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'administrador'))::text;

    -- candidaturas `tri` (rejeição pelo RH em triagem) e `dfr` (rejeição na decisão final)
    FOREACH lbl IN ARRAY ARRAY['tri:triagem', 'dfr:decisao_final'] LOOP
      v_vaga := gen_random_uuid();
      INSERT INTO public.vagas (id, titulo, slug, status)
      VALUES (v_vaga, '[SMOKE P51B] l-' || split_part(lbl, ':', 1), 'p51b-smoke-' || replace(v_vaga::text, '-', ''), 'ativa');
      INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
      VALUES (v_ctit, v_vaga, split_part(lbl, ':', 2)::public.etapa_processo, 'rejeitado', false, now() - interval '20 days')
      RETURNING id INTO v_cid;
      UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_cid;
      IF split_part(lbl, ':', 1) = 'tri' THEN c_tri := v_cid; ELSE c_dfr := v_cid; END IF;
    END LOOP;

    -- `ko`: knockout pela RPC REAL submit_candidatura_atomic (sem JWT)
    v_vko := gen_random_uuid();  v_pko := gen_random_uuid();  v_opn := gen_random_uuid();
    INSERT INTO public.vagas (id, titulo, slug, status)
    VALUES (v_vko, '[SMOKE P51B] l-ko', 'p51b-smoke-' || replace(v_vko::text, '-', ''), 'ativa');
    INSERT INTO public.perguntas_formulario (id, vaga_id, bloco, ordem, texto_pergunta, tipo_resposta, opcoes_resposta)
    VALUES (v_pko, v_vko, 'valores', 1, '[SMOKE P51B] Pergunta eliminatoria (l)', 'single_choice',
            jsonb_build_array(jsonb_build_object('id', v_opn, 'texto', 'Nao'), jsonb_build_object('id', gen_random_uuid(), 'texto', 'Sim')));
    INSERT INTO public.pergunta_opcao_metadata (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
    VALUES (v_pko, v_opn, 'Nao', 'knockout', 0, 1);
    v_ret := public.submit_candidatura_atomic(v_ctit, v_vko, 'smoke://cv', 'smoke.pdf', 0,
               jsonb_build_array(jsonb_build_object('pergunta_id', v_pko, 'resposta_opcoes', jsonb_build_array('Nao'))));
    PERFORM set_config('app.rejeicao_sancionada', '', true);
    c_ko := (v_ret ->> 'candidatura_id')::uuid;

    -- A rejeita `tri` (RPC real) e registra a decisão final `rejeitado` de `dfr` (RPC real)
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_a, true);
    PERFORM public.rejeitar_candidatura(c_tri, 'perfil_desalinhado'::public.motivo_rejeicao_rh, c_just);
    PERFORM public.registrar_decisao(c_dfr, 'rejeitado'::public.decisao_final_resultado, c_just);
    PERFORM set_config('app.rejeicao_sancionada', '', true);
    -- o titular pede as três revisões (RPCs reais) — TODAS ficam PENDENTES
    PERFORM set_config('request.jwt.claims', j_tit, true);
    PERFORM public.solicitar_revisao_decisao(c_dfr);
    PERFORM public.solicitar_revisao_rejeicao(c_tri);
    PERFORM public.solicitar_revisao_rejeicao(c_ko);
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    p_tri := (SELECT r.id FROM public.revisao_rejeicao r WHERE r.candidatura_id = c_tri);
    p_ko  := (SELECT r.id FROM public.revisao_rejeicao r WHERE r.candidatura_id = c_ko);
    p_dfr := (SELECT d.id FROM public.decisao_final d WHERE d.candidatura_id = c_dfr AND d.revisao_solicitada_em IS NOT NULL);
    m := m || jsonb_build_object('ids', jsonb_build_object('tri', c_tri, 'ko', c_ko, 'dfr', c_dfr, 'p_tri', p_tri, 'p_ko', p_ko, 'p_dfr', p_dfr),
                                 'ko_status', (SELECT c.status::text || '/' || c.motivo_rejeicao::text FROM public.candidaturas c WHERE c.id = c_ko));

    -- a fila sob cada ator, na MESMA transação
    FOREACH a IN ARRAY ARRAY['adm', 'a', 'b', 'ina', 'tit'] LOOP
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims',
        CASE a WHEN 'adm' THEN j_adm WHEN 'a' THEN j_a WHEN 'b' THEN j_b WHEN 'ina' THEN j_ina ELSE j_tit END, true);
      BEGIN
        SELECT md5(coalesce(jsonb_agg(to_jsonb(t) - 'pode_responder' ORDER BY t.candidatura_id, t.pedido_id)::text, '[]')),
               coalesce(jsonb_agg(jsonb_build_object('c', t.candidatura_id, 'o', t.origem, 'p', t.pedido_id, 'pr', t.pode_responder,
                                                     'dn_nulo', t.decidido_por_nome IS NULL, 'dec', t.decisao)
                                  ORDER BY t.candidatura_id) FILTER (WHERE t.candidatura_id IN (c_tri, c_ko, c_dfr)), '[]'::jsonb),
               count(*)
          INTO v_md5, v_fx, v_n
          FROM public.listar_revisoes_decisao(true) t;
        SELECT count(*) INTO v_nf FROM public.listar_revisoes_decisao(false) t WHERE t.candidatura_id IN (c_tri, c_ko, c_dfr);
        st := 'ACEITO';
      EXCEPTION WHEN OTHERS THEN
        st := SQLSTATE || ':' || SQLERRM;  v_md5 := NULL;  v_fx := NULL;  v_n := NULL;  v_nf := NULL;
      END;
      RESET ROLE;
      m := m || jsonb_build_object(a, jsonb_build_object('st', st, 'md5', v_md5, 'fx', v_fx, 'n', v_n, 'nf', v_nf));
    END LOOP;
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN PERFORM count(*) FROM public.listar_revisoes_decisao(true); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;
    m := m || jsonb_build_object('anon', st);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P51B1';
  EXCEPTION
    WHEN SQLSTATE 'P51B1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P51B FAIL (l): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e da FIXTURE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF m ->> 'ko_status' IS DISTINCT FROM 'rejeitado/knockout_automatico' OR (m -> 'ids' ->> 'p_tri') IS NULL
     OR (m -> 'ids' ->> 'p_ko') IS NULL OR (m -> 'ids' ->> 'p_dfr') IS NULL THEN
    RAISE EXCEPTION 'P51B FAIL (l): a fixture nao tem a forma pretendida (ko=%, ids=%) — a clausula seria vacua', m ->> 'ko_status', m -> 'ids';
  END IF;
  -- adm, A e B: os três pedidos da fixture, com origem e pedido_id certos; REVISAO-05 por chamador.
  FOREACH a IN ARRAY ARRAY['adm', 'a', 'b'] LOOP
    IF coalesce(m -> a ->> 'st', '<nao rodou>') <> 'ACEITO' THEN
      v_bad := v_bad || format('%s: fila deu «%s»; ', a, m -> a ->> 'st');
      CONTINUE;
    END IF;
    IF jsonb_array_length(m -> a -> 'fx') <> 3 OR (m -> a ->> 'nf')::int IS DISTINCT FROM 3 THEN
      v_bad := v_bad || format('%s: ve %s pedido(s) da fixture em listar(true) e %s em listar(false) (esperado 3 e 3 — tri, ko, dfr pendentes); ',
                               a, jsonb_array_length(m -> a -> 'fx'), m -> a ->> 'nf');
      CONTINUE;
    END IF;
    IF (SELECT count(DISTINCT e ->> 'p') FROM jsonb_array_elements(m -> a -> 'fx') e WHERE e ->> 'p' IS NOT NULL) <> 3 THEN
      v_bad := v_bad || format('%s: pedido_id nulo ou repetido: %s; ', a, m -> a -> 'fx');
    END IF;
    FOR x IN SELECT * FROM jsonb_array_elements(m -> a -> 'fx') LOOP
      e_or  := CASE x ->> 'c' WHEN m -> 'ids' ->> 'tri' THEN 'humana_triagem' WHEN m -> 'ids' ->> 'ko' THEN 'automatica' ELSE 'humana' END;
      e_ped := CASE x ->> 'c' WHEN m -> 'ids' ->> 'tri' THEN m -> 'ids' ->> 'p_tri' WHEN m -> 'ids' ->> 'ko' THEN m -> 'ids' ->> 'p_ko' ELSE m -> 'ids' ->> 'p_dfr' END;
      -- A rejeitou `tri` e decidiu `dfr`: não responde nenhum dos dois; o knockout (sem autor), sim.
      e_pr  := CASE WHEN a = 'a' THEN (x ->> 'c') = (m -> 'ids' ->> 'ko') ELSE true END;
      IF x ->> 'o' IS DISTINCT FROM e_or OR x ->> 'p' IS DISTINCT FROM e_ped OR x ->> 'dec' IS DISTINCT FROM 'rejeitado'
         OR (x ->> 'dn_nulo')::boolean IS DISTINCT FROM ((x ->> 'c') = (m -> 'ids' ->> 'ko'))
         OR (a <> 'adm' AND (x ->> 'pr')::boolean IS DISTINCT FROM e_pr) THEN
        v_bad := v_bad || format('%s: linha %s (esperado origem=%s, pedido_id=%s, decisao=rejeitado, decidido_por_nome nulo so no knockout, pode_responder=%s); ',
                                 a, x, e_or, e_ped, CASE WHEN a = 'adm' THEN '-' ELSE e_pr::text END);
      END IF;
    END LOOP;
  END LOOP;
  IF v_bad = '' AND (m -> 'adm' ->> 'md5' IS DISTINCT FROM m -> 'a' ->> 'md5' OR m -> 'adm' ->> 'md5' IS DISTINCT FROM m -> 'b' ->> 'md5') THEN
    v_bad := v_bad || format('md5 da fila (sem pode_responder) adm=%s A(%s)=%s B(%s)=%s — o RH ativo nao ve a fila do administrador (SC4 da 50); ',
                             m -> 'adm' ->> 'md5', r_a, m -> 'a' ->> 'md5', r_b, m -> 'b' ->> 'md5');
  END IF;
  -- Token velho (recrutador INATIVO): o contrato do P50 é «42501 ou VAZIO, nunca >= 1» — o ramo rh
  -- sem o helper não vê linha nenhuma (p50 (k)). Candidato: 42501 pela guarda de papel.
  IF NOT (coalesce(m -> 'ina' ->> 'st', '<nao rodou>') LIKE '42501:%'
          OR (m -> 'ina' ->> 'st' = 'ACEITO' AND (m -> 'ina' ->> 'n')::int = 0 AND (m -> 'ina' ->> 'nf')::int = 0))
     OR coalesce(m -> 'tit' ->> 'st', '<nao rodou>') NOT LIKE '42501:%' THEN
    v_bad := v_bad || format('RH inativo=«%s» (%s linha(s)), candidato=«%s» (esperado: inativo 42501 ou fila VAZIA; candidato 42501); ',
                             m -> 'ina' ->> 'st', m -> 'ina' ->> 'n', m -> 'tit' ->> 'st');
  END IF;
  IF coalesce(m ->> 'anon', '<nao rodou>') NOT LIKE '42501:permission denied for function listar_revisoes_decisao%' THEN
    v_bad := v_bad || format('anon=«%s» (esperado 42501 permission denied for function — o ACL); ', m ->> 'anon');
  END IF;
  IF v_bad <> '' THEN
    RAISE EXCEPTION 'P51B FAIL (l): %', v_bad;
  END IF;
  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') || format(' 51b.l=fx3(tri,ko,dfr),fila=%s,papeis=a:%s/b:%s', m -> 'adm' ->> 'n', r_a, r_b)), false);
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$l$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (m) A CONTAGEM — `contar_revisoes_pendentes()` = linhas pendentes da fila, nas duas fontes;
--     sobe exatamente pelos pedidos pendentes da fixture; o respondido não entra.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $m$
DECLARE
  v_a    uuid := current_setting('smoke51b.a')::uuid;
  v_b    uuid := current_setting('smoke51b.b')::uuid;
  v_ina  uuid := current_setting('smoke51b.ina')::uuid;
  v_adm  uuid := current_setting('smoke51b.adm')::uuid;
  r_a    text := current_setting('smoke51b.ra');
  r_b    text := current_setting('smoke51b.rb');
  c_just constant text := 'Justificativa sintetica do smoke P51B (m): rejeicao registrada pela fixture, com mais de cinquenta caracteres.';
  c_resp constant text := 'Resposta sintetica do revisor no smoke P51B (m): texto ao titular, com mais de cinquenta caracteres no total.';
  j_tit  text;  j_a text;  j_b text;  j_ina text;  j_adm text;
  v_user uuid;  v_email text;  v_ctit uuid;  v_vaga uuid;  v_cid uuid;
  c_p1   uuid;  c_rsp uuid;  c_ko uuid;  p_resp uuid;
  v_vko  uuid;  v_pko uuid;  v_opn uuid;  v_ret jsonb;
  lbl    text;  a text;  st text;
  v_c    bigint;  v_l bigint;  v_rf boolean;  v_rt jsonb;
  m      jsonb := '{}'::jsonb;
  v_err  text;
  v_ran  boolean := false;
  v_bad  text := '';
BEGIN
  BEGIN
    v_user  := gen_random_uuid();
    v_email := 'p51b-smoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES (v_user, 'SMOKE P51B Titular M', v_email, '(11) 95108-5122', DATE '1991-04-12', 'Santos', 'SP', 'site')
    RETURNING id INTO v_ctit;
    j_tit := json_build_object('sub', v_user::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'candidato'))::text;
    j_a   := json_build_object('sub', v_a::text,   'role', 'authenticated', 'app_metadata', json_build_object('role', r_a))::text;
    j_b   := json_build_object('sub', v_b::text,   'role', 'authenticated', 'app_metadata', json_build_object('role', r_b))::text;
    j_ina := json_build_object('sub', v_ina::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'rh'))::text;
    j_adm := json_build_object('sub', v_adm::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'administrador'))::text;

    FOREACH lbl IN ARRAY ARRAY['p1', 'resp'] LOOP
      v_vaga := gen_random_uuid();
      INSERT INTO public.vagas (id, titulo, slug, status)
      VALUES (v_vaga, '[SMOKE P51B] m-' || lbl, 'p51b-smoke-' || replace(v_vaga::text, '-', ''), 'ativa');
      INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
      VALUES (v_ctit, v_vaga, 'triagem', 'rejeitado', false, now() - interval '20 days')
      RETURNING id INTO v_cid;
      UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_cid;
      IF lbl = 'p1' THEN c_p1 := v_cid; ELSE c_rsp := v_cid; END IF;
    END LOOP;
    v_vko := gen_random_uuid();  v_pko := gen_random_uuid();  v_opn := gen_random_uuid();
    INSERT INTO public.vagas (id, titulo, slug, status)
    VALUES (v_vko, '[SMOKE P51B] m-ko', 'p51b-smoke-' || replace(v_vko::text, '-', ''), 'ativa');
    INSERT INTO public.perguntas_formulario (id, vaga_id, bloco, ordem, texto_pergunta, tipo_resposta, opcoes_resposta)
    VALUES (v_pko, v_vko, 'valores', 1, '[SMOKE P51B] Pergunta eliminatoria (m)', 'single_choice',
            jsonb_build_array(jsonb_build_object('id', v_opn, 'texto', 'Nao'), jsonb_build_object('id', gen_random_uuid(), 'texto', 'Sim')));
    INSERT INTO public.pergunta_opcao_metadata (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
    VALUES (v_pko, v_opn, 'Nao', 'knockout', 0, 1);
    v_ret := public.submit_candidatura_atomic(v_ctit, v_vko, 'smoke://cv', 'smoke.pdf', 0,
               jsonb_build_array(jsonb_build_object('pergunta_id', v_pko, 'resposta_opcoes', jsonb_build_array('Nao'))));
    PERFORM set_config('app.rejeicao_sancionada', '', true);
    c_ko := (v_ret ->> 'candidatura_id')::uuid;

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_a, true);
    PERFORM public.rejeitar_candidatura(c_p1, 'perfil_desalinhado'::public.motivo_rejeicao_rh, c_just);
    PERFORM public.rejeitar_candidatura(c_rsp, 'perfil_desalinhado'::public.motivo_rejeicao_rh, c_just);
    RESET ROLE;

    -- ANTES dos pedidos: a contagem de cada ator (baseline desta execução).
    FOREACH a IN ARRAY ARRAY['adm', 'a', 'b'] LOOP
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', CASE a WHEN 'adm' THEN j_adm WHEN 'a' THEN j_a ELSE j_b END, true);
      BEGIN v_c := public.contar_revisoes_pendentes(); st := 'ACEITO';
      EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_c := NULL; END;
      RESET ROLE;
      m := m || jsonb_build_object('antes_' || a, jsonb_build_object('st', st, 'c', v_c));
    END LOOP;

    -- os pedidos (RPCs reais) e a resposta MANTIDA de `resp` por B — o pedido respondido.
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_tit, true);
    PERFORM public.solicitar_revisao_rejeicao(c_p1);
    PERFORM public.solicitar_revisao_rejeicao(c_ko);
    PERFORM public.solicitar_revisao_rejeicao(c_rsp);
    RESET ROLE;
    p_resp := (SELECT r.id FROM public.revisao_rejeicao r WHERE r.candidatura_id = c_rsp);
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_b, true);
    BEGIN PERFORM public.responder_revisao_rejeicao(p_resp, 'mantida', c_resp); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;
    m := m || jsonb_build_object('resp_st', st, 'p_resp', p_resp,
                                 'pedidos', (SELECT jsonb_object_agg(CASE r.candidatura_id WHEN c_p1 THEN 'p1' WHEN c_ko THEN 'ko' ELSE 'resp' END,
                                                                     r.respondida_em IS NOT NULL)
                                               FROM public.revisao_rejeicao r WHERE r.candidatura_id IN (c_p1, c_ko, c_rsp)));

    -- DEPOIS: contagem × linhas pendentes da fila, por ator; o respondido fora da pendente e dentro da completa.
    FOREACH a IN ARRAY ARRAY['adm', 'a', 'b', 'ina', 'tit'] LOOP
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims',
        CASE a WHEN 'adm' THEN j_adm WHEN 'a' THEN j_a WHEN 'b' THEN j_b WHEN 'ina' THEN j_ina ELSE j_tit END, true);
      BEGIN
        v_c := public.contar_revisoes_pendentes();
        SELECT count(*), coalesce(bool_or(t.pedido_id = p_resp), false) INTO v_l, v_rf FROM public.listar_revisoes_decisao(false) t;
        SELECT to_jsonb(t) - 'candidato_nome' - 'vaga_titulo' INTO v_rt FROM public.listar_revisoes_decisao(true) t WHERE t.pedido_id = p_resp;
        st := 'ACEITO';
      EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; v_c := NULL; v_l := NULL; v_rf := NULL; v_rt := NULL; END;
      RESET ROLE;
      m := m || jsonb_build_object(a, jsonb_build_object('st', st, 'c', v_c, 'l', v_l, 'resp_na_pendente', v_rf, 'resp_na_completa', v_rt));
    END LOOP;
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN v_c := public.contar_revisoes_pendentes(); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;
    m := m || jsonb_build_object('anon', st);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P51B1';
  EXCEPTION
    WHEN SQLSTATE 'P51B1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P51B FAIL (m): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e da FIXTURE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF coalesce(m ->> 'resp_st', '<nao rodou>') <> 'ACEITO'
     OR (m -> 'pedidos') IS DISTINCT FROM '{"p1": false, "ko": false, "resp": true}'::jsonb THEN
    RAISE EXCEPTION 'P51B FAIL (m): a fixture nao tem a forma pretendida (resposta de resp=«%», pedidos respondidos=%) — esperado p1 e ko pendentes e resp respondido; a clausula seria vacua',
      m ->> 'resp_st', m -> 'pedidos';
  END IF;
  FOREACH a IN ARRAY ARRAY['adm', 'a', 'b'] LOOP
    IF coalesce(m -> ('antes_' || a) ->> 'st', '<nao rodou>') <> 'ACEITO' OR coalesce(m -> a ->> 'st', '<nao rodou>') <> 'ACEITO' THEN
      v_bad := v_bad || format('%s: contagem antes=«%s», depois=«%s»; ', a, m -> ('antes_' || a) ->> 'st', m -> a ->> 'st');
      CONTINUE;
    END IF;
    IF (m -> a ->> 'l')::int >= 200 THEN
      v_bad := v_bad || format('%s: listar(false) bateu no LIMIT 200 — a igualdade com a contagem nao e mensuravel aqui; ', a);
    END IF;
    IF (m -> a ->> 'c')::bigint - (m -> ('antes_' || a) ->> 'c')::bigint IS DISTINCT FROM 2 THEN
      v_bad := v_bad || format('%s: a contagem foi de %s para %s (esperado +2: p1 e ko pendentes; o respondido resp nao conta); ',
                               a, m -> ('antes_' || a) ->> 'c', m -> a ->> 'c');
    END IF;
    IF (m -> a ->> 'c')::bigint IS DISTINCT FROM (m -> a ->> 'l')::bigint THEN
      v_bad := v_bad || format('%s: contar_revisoes_pendentes()=%s mas listar_revisoes_decisao(false) tem %s linha(s) — o badge conta o que a fila nao mostra; ',
                               a, m -> a ->> 'c', m -> a ->> 'l');
    END IF;
    IF (m -> a ->> 'resp_na_pendente')::boolean IS DISTINCT FROM false
       OR jsonb_typeof(m -> a -> 'resp_na_completa') IS DISTINCT FROM 'object'
       OR (m -> a -> 'resp_na_completa' ->> 'revisao_veredito') IS DISTINCT FROM 'mantida'
       OR (m -> a -> 'resp_na_completa' ->> 'revisao_respondida_em') IS NULL THEN
      v_bad := v_bad || format('%s: o pedido respondido esta na pendente=%s; na completa=%s (esperado fora da pendente, dentro da completa com veredito mantida); ',
                               a, m -> a ->> 'resp_na_pendente', m -> a -> 'resp_na_completa');
    END IF;
  END LOOP;
  -- Token velho: «42501 ou ZERO, nunca >= 1» (contrato do P50); candidato: 42501.
  IF NOT (coalesce(m -> 'ina' ->> 'st', '<nao rodou>') LIKE '42501:%'
          OR (m -> 'ina' ->> 'st' = 'ACEITO' AND (m -> 'ina' ->> 'c')::int = 0 AND (m -> 'ina' ->> 'l')::int = 0))
     OR coalesce(m -> 'tit' ->> 'st', '<nao rodou>') NOT LIKE '42501:%' THEN
    v_bad := v_bad || format('RH inativo=«%s» (contagem %s, fila %s), candidato=«%s» (esperado: inativo 42501 ou zero; candidato 42501); ',
                             m -> 'ina' ->> 'st', m -> 'ina' ->> 'c', m -> 'ina' ->> 'l', m -> 'tit' ->> 'st');
  END IF;
  IF coalesce(m ->> 'anon', '<nao rodou>') NOT LIKE '42501:permission denied for function contar_revisoes_pendentes%' THEN
    v_bad := v_bad || format('anon=«%s» (esperado 42501 permission denied for function — o ACL); ', m ->> 'anon');
  END IF;
  IF v_bad <> '' THEN
    RAISE EXCEPTION 'P51B FAIL (m): %', v_bad;
  END IF;
  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') || format(' 51b.m=pend2+resp1,contagem=%s->%s', m -> 'antes_adm' ->> 'c', m -> 'adm' ->> 'c')), false);
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$m$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (n) D-11 — o contexto do knockout: pergunta, resposta e opção que eliminou; `removida` depois do
--     motor; P0002 para pedido que não é de knockout; RH inativo, candidato e anon fora, sem oráculo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $n$
DECLARE
  v_a    uuid := current_setting('smoke51b.a')::uuid;
  v_b    uuid := current_setting('smoke51b.b')::uuid;
  v_ina  uuid := current_setting('smoke51b.ina')::uuid;
  r_a    text := current_setting('smoke51b.ra');
  r_b    text := current_setting('smoke51b.rb');
  c_just constant text := 'Justificativa sintetica do smoke P51B (n): rejeicao registrada pela fixture, com mais de cinquenta caracteres.';
  c_perg constant text := '[SMOKE P51B] Pergunta eliminatoria (n)';
  j_tit  text;  j_a text;  j_b text;  j_ina text;
  v_user uuid;  v_email text;  v_ctit uuid;  v_vaga uuid;  v_cid uuid;
  c_ko   uuid;  c_tri uuid;  p_ko uuid;  p_tri uuid;  v_rnd uuid := gen_random_uuid();
  v_vko  uuid;  v_pko uuid;  v_opn uuid;  v_ret jsonb;
  lbl    text;  st text;  v_rc int;
  m      jsonb := '{}'::jsonb;
  v_err  text;
  v_ran  boolean := false;
  v_bad  text := '';
  v_k    text[];
  d      jsonb;
BEGIN
  IF pg_catalog.to_regprocedure('public.ler_contexto_knockout_revisao(uuid)') IS NULL THEN
    RAISE EXCEPTION 'P51B FAIL (n): ler_contexto_knockout_revisao(uuid) AUSENTE — o RH nao ve o contexto do knockout (D-11)';
  END IF;
  BEGIN
    v_user  := gen_random_uuid();
    v_email := 'p51b-smoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES (v_user, 'SMOKE P51B Titular N', v_email, '(11) 95108-5123', DATE '1991-04-12', 'Santos', 'SP', 'site')
    RETURNING id INTO v_ctit;
    j_tit := json_build_object('sub', v_user::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'candidato'))::text;
    j_a   := json_build_object('sub', v_a::text,   'role', 'authenticated', 'app_metadata', json_build_object('role', r_a))::text;
    j_b   := json_build_object('sub', v_b::text,   'role', 'authenticated', 'app_metadata', json_build_object('role', r_b))::text;
    j_ina := json_build_object('sub', v_ina::text, 'role', 'authenticated', 'app_metadata', json_build_object('role', 'rh'))::text;

    v_vaga := gen_random_uuid();
    INSERT INTO public.vagas (id, titulo, slug, status)
    VALUES (v_vaga, '[SMOKE P51B] n-tri', 'p51b-smoke-' || replace(v_vaga::text, '-', ''), 'ativa');
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_ctit, v_vaga, 'triagem', 'rejeitado', false, now() - interval '20 days')
    RETURNING id INTO c_tri;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = c_tri;

    v_vko := gen_random_uuid();  v_pko := gen_random_uuid();  v_opn := gen_random_uuid();
    INSERT INTO public.vagas (id, titulo, slug, status)
    VALUES (v_vko, '[SMOKE P51B] n-ko', 'p51b-smoke-' || replace(v_vko::text, '-', ''), 'ativa');
    INSERT INTO public.perguntas_formulario (id, vaga_id, bloco, ordem, texto_pergunta, tipo_resposta, opcoes_resposta)
    VALUES (v_pko, v_vko, 'valores', 1, c_perg, 'single_choice',
            jsonb_build_array(jsonb_build_object('id', v_opn, 'texto', 'Nao'), jsonb_build_object('id', gen_random_uuid(), 'texto', 'Sim')));
    INSERT INTO public.pergunta_opcao_metadata (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
    VALUES (v_pko, v_opn, 'Nao', 'knockout', 0, 1);
    v_ret := public.submit_candidatura_atomic(v_ctit, v_vko, 'smoke://cv', 'smoke.pdf', 0,
               jsonb_build_array(jsonb_build_object('pergunta_id', v_pko, 'resposta_opcoes', jsonb_build_array('Nao'))));
    PERFORM set_config('app.rejeicao_sancionada', '', true);
    c_ko := (v_ret ->> 'candidatura_id')::uuid;

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_a, true);
    PERFORM public.rejeitar_candidatura(c_tri, 'perfil_desalinhado'::public.motivo_rejeicao_rh, c_just);
    PERFORM set_config('request.jwt.claims', j_tit, true);
    PERFORM public.solicitar_revisao_rejeicao(c_ko);
    PERFORM public.solicitar_revisao_rejeicao(c_tri);
    RESET ROLE;
    p_ko  := (SELECT r.id FROM public.revisao_rejeicao r WHERE r.candidatura_id = c_ko);
    p_tri := (SELECT r.id FROM public.revisao_rejeicao r WHERE r.candidatura_id = c_tri);
    m := m || jsonb_build_object('pedidos', jsonb_build_object('ko', p_ko IS NOT NULL, 'tri', p_tri IS NOT NULL),
                                 'resp_fx', (SELECT count(*) FROM public.respostas_formulario rf WHERE rf.candidatura_id = c_ko));

    -- sondas (leitura): cada uma no SEU bloco
    SET LOCAL ROLE authenticated;
    FOREACH lbl IN ARRAY ARRAY['b:ko', 'a:ko', 'b:tri', 'b:rnd', 'ina:ko', 'ina:rnd', 'tit:ko'] LOOP
      PERFORM set_config('request.jwt.claims',
        CASE split_part(lbl, ':', 1) WHEN 'b' THEN j_b WHEN 'a' THEN j_a WHEN 'ina' THEN j_ina ELSE j_tit END, true);
      BEGIN
        d := public.ler_contexto_knockout_revisao(CASE split_part(lbl, ':', 2) WHEN 'ko' THEN p_ko WHEN 'tri' THEN p_tri ELSE v_rnd END);
        st := 'ACEITO:' || coalesce(d::text, '<null>');
      EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
      m := m || jsonb_build_object(replace(lbl, ':', '_'), st);
    END LOOP;
    RESET ROLE;
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN d := public.ler_contexto_knockout_revisao(p_ko); st := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;
    m := m || jsonb_build_object('anon', st);

    -- o motor de exclusão apaga as respostas do titular: simulado DENTRO do envelope, só na fixture.
    DELETE FROM public.respostas_formulario rf WHERE rf.candidatura_id = c_ko;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    m := m || jsonb_build_object('apagadas', v_rc);
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', j_b, true);
    BEGIN d := public.ler_contexto_knockout_revisao(p_ko); st := 'ACEITO:' || coalesce(d::text, '<null>');
    EXCEPTION WHEN OTHERS THEN st := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;
    m := m || jsonb_build_object('b_ko_removida', st);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P51B1';
  EXCEPTION
    WHEN SQLSTATE 'P51B1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P51B FAIL (n): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e da FIXTURE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF (m -> 'pedidos') IS DISTINCT FROM '{"ko": true, "tri": true}'::jsonb OR (m ->> 'resp_fx')::int < 1 OR (m ->> 'apagadas')::int < 1 THEN
    RAISE EXCEPTION 'P51B FAIL (n): a fixture nao tem a forma pretendida (pedidos=%, respostas do knockout=%, apagadas=%) — a clausula seria vacua',
      m -> 'pedidos', m ->> 'resp_fx', m ->> 'apagadas';
  END IF;
  FOREACH lbl IN ARRAY ARRAY['b_ko', 'a_ko'] LOOP
    IF coalesce(m ->> lbl, '<nao rodou>') NOT LIKE 'ACEITO:{%' THEN
      v_bad := v_bad || format('%s=«%s» (esperado o contexto); ', lbl, m ->> lbl);
      CONTINUE;
    END IF;
    d := substr(m ->> lbl, 8)::jsonb;
    SELECT array_agg(x ORDER BY x) INTO v_k FROM jsonb_object_keys(d) x;
    IF v_k IS DISTINCT FROM ARRAY['opcao_eliminatoria', 'pergunta', 'resposta', 'situacao']
       OR d ->> 'situacao' IS DISTINCT FROM 'disponivel' OR d ->> 'pergunta' IS DISTINCT FROM c_perg
       OR d ->> 'resposta' IS DISTINCT FROM 'Nao' OR d ->> 'opcao_eliminatoria' IS DISTINCT FROM 'Nao' THEN
      v_bad := v_bad || format('%s=%s (esperado exatamente {situacao:disponivel, pergunta:«%s», resposta:Nao, opcao_eliminatoria:Nao}); ', lbl, d, c_perg);
    END IF;
  END LOOP;
  IF coalesce(m ->> 'b_ko_removida', '<nao rodou>') NOT LIKE 'ACEITO:{%'
     OR substr(m ->> 'b_ko_removida', 8)::jsonb IS DISTINCT FROM '{"situacao": "removida", "pergunta": null, "resposta": null, "opcao_eliminatoria": null}'::jsonb THEN
    v_bad := v_bad || format('depois de apagar as respostas: «%s» (esperado {situacao:removida} e o resto nulo); ', m ->> 'b_ko_removida');
  END IF;
  IF coalesce(m ->> 'b_tri', '<nao rodou>') NOT LIKE 'P0002:%' OR coalesce(m ->> 'b_rnd', '<nao rodou>') NOT LIKE 'P0002:%' THEN
    v_bad := v_bad || format('pedido de rejeicao pelo RH=«%s», pedido inexistente=«%s» (esperado P0002 nos dois); ', m ->> 'b_tri', m ->> 'b_rnd');
  END IF;
  IF coalesce(m ->> 'ina_ko', '<nao rodou>') NOT LIKE '42501:%' OR coalesce(m ->> 'ina_rnd', '<nao rodou>') NOT LIKE '42501:%'
     OR coalesce(m ->> 'tit_ko', '<nao rodou>') NOT LIKE '42501:%' THEN
    v_bad := v_bad || format('RH inativo (pedido real)=«%s», RH inativo (inexistente)=«%s», candidato=«%s» (esperado 42501 nos tres — sem oraculo de existencia); ',
                             m ->> 'ina_ko', m ->> 'ina_rnd', m ->> 'tit_ko');
  END IF;
  IF coalesce(m ->> 'anon', '<nao rodou>') NOT LIKE '42501:permission denied for function ler_contexto_knockout_revisao%' THEN
    v_bad := v_bad || format('anon=«%s» (esperado 42501 permission denied for function — o ACL); ', m ->> 'anon');
  END IF;
  IF v_bad <> '' THEN
    RAISE EXCEPTION 'P51B FAIL (n): %', v_bad;
  END IF;
  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') || format(' 51b.n=ko1(resp=%s)+tri1', m ->> 'resp_fx')), false);
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$n$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) NEGATIVA — nada da fixture sobreviveu; contagens globais iguais às da baseline.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  fx     jsonb := nullif(current_setting('smoke51b.fixtures'), '')::jsonb;
  base   jsonb := current_setting('smoke51b.base')::jsonb;
  v_res  text;
  v_n    bigint;
  v_div  text := '';
  k      text;
  v_t    int := 0;
BEGIN
  IF fx IS NULL OR jsonb_array_length(fx -> 'candidaturas') = 0 THEN
    RAISE EXCEPTION 'P51B FAIL (z): nenhuma fixture registrada — a negativa nao teria o que conferir';
  END IF;
  SELECT concat_ws(' ',
           'candidaturas=' || (SELECT count(*) FROM public.candidaturas c WHERE c.id::text IN (SELECT jsonb_array_elements_text(fx -> 'candidaturas'))),
           'vagas=' || (SELECT count(*) FROM public.vagas v WHERE v.id::text IN (SELECT jsonb_array_elements_text(fx -> 'vagas'))),
           'pedidos=' || (SELECT count(*) FROM public.revisao_rejeicao r WHERE r.candidatura_id::text IN (SELECT jsonb_array_elements_text(fx -> 'candidaturas'))),
           'titulares=' || (SELECT count(*) FROM public.candidatos c WHERE c.email LIKE 'p51b-smoke-%@invalido.local'),
           'usuarios=' || (SELECT count(*) FROM auth.users u WHERE u.email LIKE 'p51b-smoke-%@invalido.local'))
    INTO v_res;
  IF v_res <> 'candidaturas=0 vagas=0 pedidos=0 titulares=0 usuarios=0' THEN
    RAISE EXCEPTION 'P51B FAIL (z): RESIDUO da fixture — % (a subtransacao nao reverteu)', v_res;
  END IF;
  FOR k IN SELECT jsonb_object_keys(base) LOOP
    v_t := v_t + 1;
    EXECUTE format('SELECT count(*) FROM %I.%I', split_part(k, '.', 1), split_part(k, '.', 2)) INTO v_n;
    IF v_n IS DISTINCT FROM (base ->> k)::bigint THEN
      v_div := v_div || format('%s: %s -> %s; ', k, base ->> k, v_n);
    END IF;
  END LOOP;
  IF v_t = 0 THEN
    RAISE EXCEPTION 'P51B FAIL (z): ZERO tabelas medidas — o conjunto lido do catalogo veio vazio; a negativa seria vacua';
  END IF;
  IF v_div <> '' THEN
    RAISE EXCEPTION 'P51B FAIL (z): contagem global mudou com residuo ZERO da fixture (% tabelas medidas): % — sob REPEATABLE READ isso nao e trafego: algo escapou do envelope', v_t, v_div;
  END IF;
  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') || format(' 51b.z=%s', v_t)), false);
  PERFORM set_config('smoke51b.pass', (current_setting('smoke51b.pass')::int + 1)::text, false);
END
$z$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado — o esperado vive SÓ em `smoke51b.esperado` (topo do arquivo).
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke51b.pass')::int IS DISTINCT FROM current_setting('smoke51b.esperado')::int THEN
    RAISE EXCEPTION 'P51B FAIL (gate): pass = % de % — alguma clausula nao incrementou o contador',
      current_setting('smoke51b.pass'), current_setting('smoke51b.esperado');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',    'p51_revisao_rejeicao',
  'pass',     current_setting('smoke51b.pass')::int,
  'esperado', current_setting('smoke51b.esperado')::int
) AS resultado;
