-- =============================================================================
-- Phase 45 / Plano 45-09 — ERASE-05
-- Retirar UMA candidatura a pedido do titular: o caminho proprio no banco, o 8o
-- valor do vocabulario fechado de evento, e o aviso ao RH.
-- =============================================================================
--
-- Requirement:          ERASE-05
-- Decisao de origem:    45-CONTEXT D-45-06 (o RH e avisado) · D-45-08 (o vocabulario
--                       de evento e fechado e cresce em PAR com o codigo) ·
--                       D-45-13 (o encerramento e coluna ADITIVA)
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 45-09, Task 1 (a fatia TRACER)
--
-- -----------------------------------------------------------------------------
-- (1) ESCOPO NEGATIVO, EM UMA LINHA
-- -----------------------------------------------------------------------------
-- **ESTA MIGRATION NAO APAGA, NAO ANONIMIZA E NAO SEVERA COISA ALGUMA.** A unica
-- escrita sobre dado vivo e `UPDATE candidaturas SET encerrada_a_pedido_em = now()`
-- — a MESMA coluna aditiva que `registrar_pedido_exclusao` (20260805000002) ja
-- escreve, nascida NULA na 20260805000001. Zero DELETE, zero DROP de dado, zero
-- escrita em `etapa_atual`, zero linha nova em `historico_candidatura`, zero
-- `deleted_at`. O motor destrutivo e 45-07/45-10 e NAO esta aqui.
--
-- -----------------------------------------------------------------------------
-- (2) ⚠ ORDEM DE ENTREGA OBRIGATORIA — E O CONTROLE, NAO UMA PREFERENCIA
-- -----------------------------------------------------------------------------
--   1o  EDGE FUNCTION `notificar-rh` DEPLOYADA com o evento novo no vocabulario
--   2o  BLOCO B (o CHECK do ledger) + BLOCO C (a classe do evento)
--   3o  BLOCO F (a funcao de trigger + o trigger)
--
-- O motivo e mecanico e o precedente e literal (20260730000003 e 20260730000004):
-- `net.http_post` e AT-MOST-ONCE — a resposta da Edge Function nao volta para o
-- banco, nao vira excecao e nao vira linha em lugar nenhum. Logo:
--
--   · trigger ANTES da EF  ⇒ a EF responde `400 VALIDATION` a um evento que ainda
--     nao conhece, e o aviso some SEM ERRO EM LUGAR NENHUM. E a falha mais cara de
--     detectar do sistema, porque nao ha artefato que a registre.
--   · CHECK ANTES do codigo ⇒ o mesmo `400 VALIDATION` sobre um dispatch
--     at-most-once.
--   · codigo ANTES do CHECK ⇒ a EF aceita, tenta reivindicar o ledger e leva
--     `23514`; nenhuma linha entra, nenhum e-mail sai. Ao menos ha log da EF.
--   · EF ANTES de tudo ⇒ uma funcao que aceita um evento que ninguem envia e
--     INERTE.
--
-- So o ultimo cenario e benigno. Como os blocos vivem no mesmo arquivo (um apply
-- so), o gate real e do plano 45-11: provar que a EF deployada aceita o evento
-- novo ANTES de aplicar este arquivo.
--
-- -----------------------------------------------------------------------------
-- (3) PROTOCOLO DE APPLY — `supabase db push` E PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply e EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD nao recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- E o plano **45-11** que aplica; o plano 45-09 apenas AUTORA este arquivo.
--
-- ⚠ ESTE ARQUIVO TEM TRES CORPOS DELIMITADOS POR CIFROES (duas funcoes
-- `LANGUAGE plpgsql` novas + a substituicao de `varrer_retry_notificacoes`) e mais
-- dois blocos anonimos, todos cercados de `REVOKE`/`GRANT`/`COMMENT` — exatamente a
-- combinacao que o transaction pooler recusa com SQLSTATE 42601 ("cannot insert
-- multiple commands into a prepared statement"), CLAUDE.md §Migrations. Se o
-- `apply_migration` reprovar, o caminho e o workaround do CLAUDE.md (SQL Editor +
-- `migration repair --status applied`), NUNCA reescrever as funcoes para caber no
-- transporte.
--
-- **Sem wrapper `BEGIN;`/`COMMIT;`**: o driver ja envolve cada migration na sua
-- propria transacao implicita, e o BEGIN/COMMIT externo e o gatilho do 42601.
--
-- ⚠ REPARO OBRIGATORIO DO LEDGER. Logo apos o apply:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260805000007'
--    WHERE name LIKE '%p45_retirada_e_evento%';
--
-- ⚠ FIDELIDADE DO CONTEUDO. O ledger guarda o SQL literalmente aplicado em
-- `supabase_migrations.schema_migrations.statements text[]`. Conferir apos o apply:
--
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260805000007';
--
-- -----------------------------------------------------------------------------
-- (4) PROVENIENCIA — o que foi copiado, e o que foi DELIBERADAMENTE NAO
-- -----------------------------------------------------------------------------
--   · `20260805000002_p45_rpc_pedido_exclusao.sql:215-220` — o `UPDATE` de
--     `encerrada_a_pedido_em`. A retirada avulsa escreve A MESMA COLUNA pelo MESMO
--     predicado, e nao pode divergir dele: um so estado no banco para os dois
--     caminhos, e por isso um so evento de notificacao.
--
--   · `20260730000004_p42_evento_revisao_respondida.sql` — o precedente exato de
--     acrescentar valor ao CHECK vivo `notificacoes_enviadas_evento_check`, e a
--     ordem obrigatoria EF -> CHECK -> trigger.
--
--   · `20260801000003_p43_guard_marketing.sql:328-389` — o molde do DROP/ADD que
--     PRESERVA os valores vivos e o bloco `DO` que aborta se algum sumiu.
--
--   · `20260730000003_p42_trg_revisao_solicitada.sql:142-215` — o trigger que
--     dispara `net.http_post` para a EF `notificar-rh`: Bearer do Vault,
--     graceful-skip, fail-open. Molde verbatim.
--
--   · `20260804000002_p44_solicitacoes_dados.sql:242-250` — o guard NULL-safe por
--     `IS DISTINCT FROM`; `:295-296` — o `REVOKE` que NOMEIA `anon`.
--
--   · ⚠ **NENHUM CAMINHO DE REJEICAO E REUSADO, e a recusa e medida.** As duas
--     modelagens intuitivas do encerramento estao erradas por razoes DIFERENTES e
--     ambas graves. Passar por `etapa_atual` com o JWT do titular faz
--     `trg_notif_transicao` (20260726000001:76-78) disparar o evento `decisao` —
--     **e-mail de rejeicao para quem acabou de pedir para sair**. Passar por ele
--     com privilegio de servidor grava `auto_rejeitado := (v_ator IS NULL)` = TRUE
--     (20260607000005:27) — **fabricando, na tabela que existe para provar que
--     ninguem e rejeitado por maquina (RNF-07a), o registro de uma rejeicao
--     automatica**. Por isso o encerramento aqui e `UPDATE` de UMA coluna aditiva,
--     e a palavra `rejeitado` aparece neste arquivo apenas como filtro de EXCLUSAO
--     do conjunto, jamais como valor escrito.
--
-- -----------------------------------------------------------------------------
-- (5) ⚠ TRES DESVIOS REGISTRADOS EM RELACAO AO PLANO 45-09 — todos MEDIDOS
-- -----------------------------------------------------------------------------
-- D-45-09-01 (BLOCO B) · O plano manda recriar o CHECK com "os cinco valores vivos
--   mais o novo", totalizando 6. **O CHECK vivo tem SETE valores, nao cinco.** A
--   20260730000004 acrescentou `revisao_respondida` (6o) e a 20260801000003:333
--   acrescentou `divulgacao_vagas` (7o). Seguir o plano ao pe da letra DERRUBARIA
--   dois valores vivos: quebraria o REVISAO-04 (que tem linhas reais em PROD) e o
--   guard de marketing da P43, e reprovaria a assercao (e) do smoke
--   `p43_guard_marketing_smoke.sql`. O CHECK aqui tem **OITO** valores.
--
-- D-45-09-02 (BLOCO C) · O vocabulario de evento e fechado em **TRES** sitios, nao
--   dois. Alem do CHECK e da constante da EF, existe `classe_evento_notificacao`
--   (20260801000003 BLOCO B) com um trigger BEFORE INSERT **fail-closed para classe
--   desconhecida**: um evento no CHECK sem linha de classe e RECUSADO com `P0003`
--   em toda reivindicacao. Sem o BLOCO C, o aviso ao RH seria um NO-OP SILENCIOSO —
--   o defeito exato que a ordem obrigatoria acima existe para impedir.
--
-- D-45-09-03 (BLOCO G) · `varrer_retry_notificacoes` exclui os eventos de RH da
--   varredura por `evento NOT LIKE 'revisao\_solicitada%'` — prefixo que **NAO
--   casa** o evento novo. Sem o BLOCO G, uma falha de envio deste evento deixaria a
--   linha em `falhou` com `tentativas = 1`, ela seria re-postada por URL FIXA
--   contra a EF ERRADA (`notificar-candidato`), recusada com `400 VALIDATION` antes
--   do branch de retry, JAMAIS teria `tentativas` incrementado, e voltaria a ser
--   selecionada a cada 15 minutos PARA SEMPRE, consumindo o `LIMIT 20` dos retries
--   legitimos de candidato. E o T-42-23 ressuscitado pelo evento novo.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- BLOCO A · public.retirar_candidatura(uuid) — sair de UMA vaga, sem apagar nada
-- ---------------------------------------------------------------------------
-- `SECURITY DEFINER` porque a escrita e privilegiada e chega por Edge Function;
-- `VOLATILE` porque ela escreve. `SET search_path = ''` endurece o DEFINER
-- (convencao do projeto), e por isso TODA referencia e qualificada. Delimitador
-- NOMEADO para que `md5(prosrc)` seja extraivel pelo smoke.
--
-- ⚠ O `UPDATE` abaixo e o MESMO da `registrar_pedido_exclusao`, coluna a coluna e
-- filtro a filtro. A unica diferenca e o escopo: la o predicado e `candidato_id`
-- (todas as candidaturas do titular, encerradas em lote pelo pedido de exclusao);
-- aqui e `id` (UMA candidatura, retirada avulsa). Mesmo estado no banco para os
-- dois caminhos — e e por isso que um SO evento de notificacao cobre os dois.
CREATE OR REPLACE FUNCTION public.retirar_candidatura(p_candidatura_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $retirar_candidatura$
DECLARE
  v_uid     uuid := auth.uid();
  v_dono    uuid;
  v_ja      timestamptz;
  v_deleted timestamptz;
  v_etapa   text;
  v_out     timestamptz;
BEGIN
  -- ── GUARD, DUAS METADES ────────────────────────────────────────────────────
  -- (a) chamador SEM claim nenhuma e recusado EXPLICITAMENTE. Toda funcao DEFINER
  --     nova neste projeto nasce executavel por `anon` (`pg_default_acl` de
  --     `public` concede EXECUTE como grant DIRETO), e o REVOKE do BLOCO D e a
  --     outra metade — mas um guard que dependesse so do ACL seria um guard
  --     confiado a uma configuracao de schema.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao nao retira candidatura'
      USING ERRCODE = '42501';
  END IF;

  SELECT cd.user_id, c.encerrada_a_pedido_em, c.deleted_at, c.etapa_atual::text
    INTO v_dono, v_ja, v_deleted, v_etapa
    FROM public.candidaturas c
    JOIN public.candidatos cd ON cd.id = c.candidato_id
   WHERE c.id = p_candidatura_id;

  -- (b) titularidade por `IS DISTINCT FROM`, NUNCA por `NOT IN`: com um dos lados
  --     NULL o `NOT IN` avalia NULL, o `IF` nao e tomado, e o guard FALHA ABERTO
  --     justamente para o chamador mais suspeito (defeito REAL medido na 42-06).
  --     A forma NULL-safe tambem cobre "candidatura inexistente": `v_dono` fica
  --     NULL, `NULL IS DISTINCT FROM <uid>` e TRUE, e a funcao recusa. Falha
  --     FECHADA por construcao, nao por lembranca.
  IF v_dono IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN: a candidatura so pode ser retirada pelo proprio titular'
      USING ERRCODE = '42501';
  END IF;

  -- ── IDEMPOTENCIA POR ESTADO, NUNCA POR try/catch ───────────────────────────
  -- Ja retirada devolve A MESMA data, sem mutar nada e sem empurrar o fato para
  -- frente. Um segundo toque no mesmo card nao pode reescrever a data que a tela
  -- ja mostrou ao titular ("Voce retirou sua candidatura em {dd/mm/aaaa}").
  IF v_ja IS NOT NULL THEN
    RETURN v_ja;
  END IF;

  -- ⚠ FECHA NO JA DECIDIDO E NO JA REMOVIDO. Recusa com 22023
  -- (invalid_parameter_value) para que a Edge Function traduza para 400 VALIDATION
  -- com codigo proprio — NUNCA 500: uma candidatura ja decidida e fato do dominio,
  -- nao falha de servidor. A UI ja nao renderiza a acao nesse estado (UI-SPEC
  -- §Retirar minha candidatura); este ramo e a rede para o caminho nao-UI.
  IF v_deleted IS NOT NULL OR v_etapa IN ('aprovado', 'rejeitado') THEN
    RAISE EXCEPTION 'CANDIDATURA_NAO_RETIRAVEL: so uma candidatura em andamento pode ser retirada a pedido'
      USING ERRCODE = '22023';
  END IF;

  -- ── O ENCERRAMENTO: UMA COLUNA ADITIVA, E NADA MAIS ────────────────────────
  -- ⚠ NAO toca `etapa_atual` (esse e o caminho da REJEICAO — ver a PROVENIENCIA no
  -- cabecalho, item 4). ⚠ NAO escreve em `historico_candidatura`, que tem UM unico
  -- escritor desde o M2/Phase 6, e portanto NAO dispara notificacao de transicao.
  -- ⚠ NAO toca `deleted_at`, para que as cinco leituras de RH que filtram
  -- `.is('deleted_at', null)` continuem vendo a linha (Invariante 9 da 45-UI-SPEC:
  -- o silencio tambem e proibido — uma candidatura que hoje soma na etapa e amanha
  -- nao esta la e um recrutador agendando entrevista com quem saiu).
  UPDATE public.candidaturas c
     SET encerrada_a_pedido_em = now()
   WHERE c.id = p_candidatura_id
     AND c.encerrada_a_pedido_em IS NULL
     AND c.deleted_at IS NULL
     AND c.etapa_atual NOT IN ('aprovado', 'rejeitado')
  RETURNING c.encerrada_a_pedido_em INTO v_out;

  RETURN v_out;
END;
$retirar_candidatura$;


-- ---------------------------------------------------------------------------
-- BLOCO B · O vocabulario do ledger, de 7 para 8 valores
-- ---------------------------------------------------------------------------
-- ⚠ O VOCABULARIO SO CRESCE — 4 (M7) -> 5 (42-07) -> 6 (42-08) -> 7 (43-05) -> 8
-- (aqui). A lista abaixo PRESERVA os SETE vivos. `revisao_solicitada` e
-- `revisao_respondida` tem LINHAS REAIS no ledger em PROD; um DROP/ADD que
-- omitisse um deles falharia alto hoje, porque o `ADD CONSTRAINT` valida a tabela
-- inteira — mas contar com isso seria contar com SORTE, e o bloco `DO` abaixo
-- existe para nao depender dela.
--
-- ⚠ VER O DESVIO D-45-09-01 NO CABECALHO. O plano 45-09 dizia "cinco valores
-- vivos"; o medido sao sete. A 45-UI-SPEC:101 carrega a mesma desatualizacao.
--
-- ⚠ O NOME DA CONSTRAINT E LOAD-BEARING. `notificacoes_enviadas_evento_check` e o
-- nome auto-gerado que a declaracao inline de `20260721000001:77` produz
-- deterministicamente, e o cabecalho daquele arquivo o declara load-bearing.
--
-- Os 8 valores e quem os produz/consome:
--   confirmacao · avanco · convite · decisao   -> triggers de funil (P39) -> EF notificar-candidato
--   revisao_solicitada                          -> trg_notif_revisao_solicitada (42-07) -> EF notificar-rh
--   revisao_respondida                          -> trg_notif_revisao_respondida (42-08) -> EF notificar-candidato
--   divulgacao_vagas                            -> NINGUEM. Reservado, com guard vivo (43-05).
--   candidatura_encerrada_a_pedido              -> trg_notif_candidatura_encerrada (ESTE arquivo) -> EF notificar-rh
--
-- ⚠ UM SO EVENTO COBRE OS DOIS CAMINHOS — retirada avulsa (BLOCO A) e encerramento
-- em lote disparado pelo pedido de exclusao (`registrar_pedido_exclusao`) —, porque
-- os dois escrevem A MESMA COLUNA e produzem O MESMO EFEITO no funil. Dois eventos
-- para o mesmo efeito seriam duas entradas de vocabulario fechado, dois templates e
-- duas oportunidades de o preheader nao ramificar, que e literalmente o defeito
-- W-01 que a Phase 42 encontrou.

ALTER TABLE public.notificacoes_enviadas
  DROP CONSTRAINT IF EXISTS notificacoes_enviadas_evento_check;

ALTER TABLE public.notificacoes_enviadas
  ADD CONSTRAINT notificacoes_enviadas_evento_check
  CHECK (evento IN ('confirmacao', 'avanco', 'convite', 'decisao',
                    'revisao_solicitada', 'revisao_respondida', 'divulgacao_vagas',
                    'candidatura_encerrada_a_pedido'));

-- Auto-verificacao: ABORTA o apply se (a) restou algum OUTRO CHECK sobre `evento`
-- (nome divergente em PROD ⇒ o novo conviveria com o antigo, a reivindicacao
-- continuaria recusada, e a migration teria "passado"), ou (b) qualquer um dos SETE
-- valores vivos sumiu da definicao resultante. Um gate que nao morde nao e um gate.
-- Idioma verbatim do BLOCO C de `20260801000003`.
DO $verifica_check_evento$
DECLARE
  v_qtd   int;
  v_defs  text;
  v_vivos text[] := ARRAY[
    'confirmacao', 'avanco', 'convite', 'decisao',
    'revisao_solicitada', 'revisao_respondida', 'divulgacao_vagas'
  ];
  v_ev    text;
BEGIN
  SELECT count(*), string_agg(c.conname || ' => ' || pg_get_constraintdef(c.oid), ' | ')
    INTO v_qtd, v_defs
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'notificacoes_enviadas'
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) LIKE '%evento%';

  IF v_qtd <> 1 THEN
    RAISE EXCEPTION 'P45-09 BLOCO B: esperava 1 CHECK sobre evento, achei % — %', v_qtd, v_defs;
  END IF;

  FOREACH v_ev IN ARRAY v_vivos LOOP
    IF v_defs NOT LIKE '%' || v_ev || '%' THEN
      RAISE EXCEPTION 'P45-09 BLOCO B: o CHECK vivo PERDEU o evento ''%'' — esta migration acabou de quebrar um evento JA ENTREGUE em PROD. Apply abortado: %', v_ev, v_defs;
    END IF;
  END LOOP;

  IF v_defs NOT LIKE '%candidatura_encerrada_a_pedido%' THEN
    RAISE EXCEPTION 'P45-09 BLOCO B: o CHECK vivo nao aceita candidatura_encerrada_a_pedido — a EF notificar-rh levaria 23514 no claim e o aviso ao RH seria um no-op silencioso: %', v_defs;
  END IF;

  RAISE NOTICE 'P45-09 BLOCO B OK (8 valores, os 7 vivos preservados): %', v_defs;
END
$verifica_check_evento$;

COMMENT ON CONSTRAINT notificacoes_enviadas_evento_check ON public.notificacoes_enviadas IS
  'Phase 45 / 45-09 ERASE-05: vocabulario de evento do ledger, agora com 8 valores. '
  'O 8o, candidatura_encerrada_a_pedido, e produzido por trg_notif_candidatura_encerrada '
  'e consumido pela EF notificar-rh. '
  '⚠ ELE COBRE OS DOIS CAMINHOS: a retirada avulsa de UMA candidatura '
  '(retirar_candidatura) e o encerramento em lote disparado pelo pedido de exclusao '
  '(registrar_pedido_exclusao). Os dois escrevem a MESMA coluna aditiva '
  'candidaturas.encerrada_a_pedido_em e produzem o MESMO efeito no funil, entao um so '
  'evento, um so template e uma so edicao do CHECK. Dois eventos para o mesmo efeito '
  'seriam duas entradas de vocabulario, dois templates e duas oportunidades de o '
  'preheader nao ramificar — o defeito W-01 da Phase 42. '
  '⚠ ESTE VOCABULARIO E FECHADO EM TRES SITIOS, NAO DOIS, e os tres andam na MESMA '
  'entrega: (1) este CHECK; (2) a constante EVENTO_LEDGER_RH_ENCERRAMENTO da EF '
  'notificar-rh; (3) a tabela classe_evento_notificacao, cujo trigger BEFORE INSERT e '
  'FAIL-CLOSED para classe desconhecida — um evento aqui sem linha de classe la e '
  'RECUSADO com P0003 em toda reivindicacao, e o envio vira no-op silencioso. '
  'Valor aqui sem os sitios de codigo produz 400 VALIDATION sobre um dispatch '
  'at-most-once; valor em codigo sem este CHECK produz 23514 no claim (D-P42-14). '
  'O vocabulario apenas CRESCE: remover um valor quebra o evento correspondente em '
  'silencio.';


-- ---------------------------------------------------------------------------
-- BLOCO C · A classe do evento novo — o TERCEIRO sitio do vocabulario fechado
-- ---------------------------------------------------------------------------
-- ⚠ SEM ESTE BLOCO A FASE INTEIRA E UM NO-OP SILENCIOSO. O trigger
-- `trg_guard_marketing_consentimento` (20260801000003 BLOCO D) e BEFORE INSERT em
-- `notificacoes_enviadas` e e FAIL-CLOSED PARA O "NAO SEI": evento presente no
-- CHECK mas ausente de `classe_evento_notificacao` e RECUSADO com `P0003`. Como o
-- INSERT no ledger e o CLAIM da EF, toda tentativa de avisar o RH seria recusada,
-- nenhuma linha entraria e nenhum e-mail sairia. Ver o desvio D-45-09-02.
--
-- A assercao (e) de `supabase/tests/p43_guard_marketing_smoke.sql` afere a
-- coincidencia dos dois vocabularios NOS DOIS SENTIDOS e reprovaria este apply sem
-- este bloco.
--
-- ⚠ A CLASSE E `interno`, e o precedente e EXATO: `revisao_solicitada` — o outro
-- evento cujo destinatario e a EQUIPE e nao o titular — ja e `interno`. Nao e
-- `transacional` porque nao e comunicacao AO titular, e nao e `marketing` porque
-- nao passa por consentimento dele. Classificar errado aqui nao e cosmetico:
-- `marketing` submeteria o aviso ao guard de consentimento e o RH deixaria de ser
-- avisado sempre que o titular nao tivesse autorizado divulgacao — que e a maioria
-- da base (BD-5).
--
-- `ON CONFLICT DO NOTHING`, jamais upsert: um seed que sobrescrevesse uma
-- reclassificacao feita pelo operador transformaria o re-apply desta migration numa
-- regressao silenciosa de base legal.
INSERT INTO public.classe_evento_notificacao (evento, classe, descricao) VALUES
  ('candidatura_encerrada_a_pedido', 'interno',
   'Aviso ao RH de que uma candidatura foi encerrada a pedido do candidato (retirada avulsa ou encerramento disparado por pedido de exclusao, Art. 18). Destinatario e a equipe, NAO o titular — nao e comunicacao ao titular e nao passa por consentimento dele. O corpo NAO carrega identificador do candidato nem o motivo especifico.')
ON CONFLICT (evento) DO NOTHING;

-- Auto-verificacao dos DOIS SENTIDOS, no idioma da assercao (e) do smoke da P43.
-- Falha ALTO se o CHECK e a tabela de classes divergirem — porque a divergencia nao
-- e visivel ate a primeira reivindicacao real ser recusada em producao.
DO $verifica_classe_evento$
DECLARE
  v_classe text;
BEGIN
  SELECT c.classe INTO v_classe
    FROM public.classe_evento_notificacao c
   WHERE c.evento = 'candidatura_encerrada_a_pedido';

  IF v_classe IS NULL THEN
    RAISE EXCEPTION 'P45-09 BLOCO C: candidatura_encerrada_a_pedido esta no CHECK mas NAO tem linha em classe_evento_notificacao — o guard fail-closed recusaria TODA reivindicacao com P0003 e o aviso ao RH seria um no-op silencioso';
  END IF;

  IF v_classe <> 'interno' THEN
    RAISE EXCEPTION 'P45-09 BLOCO C: candidatura_encerrada_a_pedido classificado como ''%'' — o destinatario e a EQUIPE, nao o titular, e a classe tem de ser interno (precedente exato: revisao_solicitada)', v_classe;
  END IF;

  RAISE NOTICE 'P45-09 BLOCO C OK: candidatura_encerrada_a_pedido classificado como interno';
END
$verifica_classe_evento$;


-- ---------------------------------------------------------------------------
-- BLOCO D · ACL — REVOKE nominal e so entao o GRANT minimo
-- ---------------------------------------------------------------------------
-- ⚠ NOMEAR `anon` E OBRIGATORIO. `FROM PUBLIC` sozinho NAO remove nada: medido na
-- P42-06, o `pg_default_acl` do schema `public` neste projeto concede EXECUTE a
-- `anon` e `authenticated` como grants DIRETOS E NOMEADOS em todo `CREATE FUNCTION`.
-- Revogar so de PUBLIC removeria um grant que nunca existiu.
--
-- ⚠ O UNICO GRANT segue a politica das RPCs irmas de 20260805000002: esta funcao
-- ESCREVE, e a unica porta legitima ate ela e a Edge Function, que resolve o titular
-- de `auth.uid()` no servidor. Conceder ao papel do navegador daria a ele um caminho
-- direto para retirar candidatura passando o id de outra pessoa, e o guard do corpo
-- passaria a ser o unico controle — exatamente a classe T-32-03 que a EF elimina.
REVOKE ALL ON FUNCTION public.retirar_candidatura(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retirar_candidatura(uuid) TO service_role;


-- ---------------------------------------------------------------------------
-- BLOCO E · Auto-verificacao: EXECUTA o caminho feliz e assere que ele COMPLETOU
-- ---------------------------------------------------------------------------
-- Molde de `20260805000002:340-442`, com o envelope de SUBTRANSACAO que termina em
-- `RAISE EXCEPTION`: o Postgres reverte tudo. Metodo exercitado em PROD pela SONDA 6
-- (`45-SONDAS-PROD.md §6`) com verificacao de integridade: zero residuo.
--
-- ⚠ "NAO LANCOU" NAO E "COMPLETOU". O gate anterior deste projeto media a recusa e
-- chamava aquilo de cobertura, e o defeito real sobreviveu a um smoke 10/10 verde.
-- As quatro assercoes abaixo sao sobre o CAMINHO FELIZ.
--
-- ⚠ ESTE BLOCO E SEGURO POR CONSTRUCAO, EM DUAS CAMADAS INDEPENDENTES — e nao pela
-- esperanca de que a transacao reverta um `net.http_post`:
--
--   1. ELE RODA ANTES DO BLOCO F. O trigger que despacha o aviso ao RH ainda NAO
--      EXISTE neste ponto do arquivo, entao ele nao pode disparar. `NOTIFICACOES_MODO`
--      e secret de PROJETO e o ultimo valor registrado e `producao` (45-SONDAS-PROD
--      §Sonda 5): um disparo aqui seria e-mail REAL para a equipe de RH.
--   2. ELE SO FAZ `UPDATE`, NUNCA `INSERT`. Uma candidatura sintetica exigiria
--      `INSERT INTO public.candidaturas`, e ha um `AFTER INSERT` vivo naquela tabela
--      (`trg_notif_confirmacao`, 20260726000001:174) que despacha e-mail de
--      confirmacao ao CANDIDATO. O survivor-guard dele so poupa `status = 'rejeitado'`
--      ou knockout — condicoes que a fixture teria de vestir por acidente.
--
-- ⚠ DIVERGENCIA REGISTRADA EM RELACAO AO PLANO: ele pedia "candidatura sintetica".
-- A camada 2 acima e a razao medida para usar uma candidatura REAL e apenas
-- atualiza-la dentro da subtransacao — o mesmo metodo da RPC irma e da SONDA 6, que
-- tambem mede sobre forma de dado real em vez de sintetica.
DO $verifica_retirar_candidatura$
DECLARE
  v_titular    uuid;
  v_cand       uuid;
  v_etapa_pre  text;
  v_etapa_pos  text;
  v_hist_antes integer;
  v_hist_pos   integer;
  v_out        timestamptz;
  v_out2       timestamptz;
  v_del        timestamptz;
BEGIN
  -- Uma candidatura REAL em andamento, de um titular com sessao possivel. A escrita
  -- que ela vai sofrer e revertida pela subtransacao abaixo.
  SELECT c.id, cd.user_id, c.etapa_atual::text
    INTO v_cand, v_titular, v_etapa_pre
    FROM public.candidaturas c
    JOIN public.candidatos cd ON cd.id = c.candidato_id
   WHERE cd.user_id IS NOT NULL
     AND c.encerrada_a_pedido_em IS NULL
     AND c.deleted_at IS NULL
     AND c.etapa_atual NOT IN ('aprovado', 'rejeitado')
   ORDER BY c.created_at
   LIMIT 1;

  IF v_cand IS NULL THEN
    RAISE EXCEPTION 'P45-VERIFICA: nenhuma candidatura em andamento disponivel para exercitar o CAMINHO FELIZ de retirar_candidatura — e verificar so a recusa foi EXATAMENTE o defeito que a 20260803000001 corrigiu (o gate media a recusa e chamava aquilo de cobertura)';
  END IF;

  SELECT count(*) INTO v_hist_antes
    FROM public.historico_candidatura h
   WHERE h.candidatura_id = v_cand;

  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_titular::text,
                        'app_metadata', json_build_object('role', 'candidato'))::text, true);

    v_out := public.retirar_candidatura(v_cand);

    -- Segunda invocacao: idempotencia POR ESTADO. Mesma data, sem mutar nada.
    v_out2 := public.retirar_candidatura(v_cand);

    PERFORM set_config('request.jwt.claims', '', true);

    -- (i) `encerrada_a_pedido_em` ficou NAO-NULA
    IF v_out IS NULL THEN
      RAISE EXCEPTION 'P45-VERIFICA: retirar_candidatura nao devolveu data — a funcao NAO COMPLETOU, e "nao lancou" nao e a mesma coisa que "completou"';
    END IF;

    IF v_out2 IS DISTINCT FROM v_out THEN
      RAISE EXCEPTION 'P45-VERIFICA: a segunda invocacao devolveu data diferente (% vs %) — uma candidatura ja retirada tem de devolver A MESMA data sem mutar nada, senao um segundo toque no card reescreve a data que a tela ja mostrou ao titular', v_out2, v_out;
    END IF;

    -- (ii) `etapa_atual` NAO mudou
    SELECT c.etapa_atual::text, c.deleted_at INTO v_etapa_pos, v_del
      FROM public.candidaturas c WHERE c.id = v_cand;

    IF v_etapa_pos IS DISTINCT FROM v_etapa_pre THEN
      RAISE EXCEPTION 'P45-VERIFICA: etapa_atual mudou de % para % — a retirada NAO pode passar pelo caminho de transicao de etapa, que dispararia notificacao de decisao e marcaria auto_rejeitado', v_etapa_pre, v_etapa_pos;
    END IF;

    -- (iii) `historico_candidatura` NAO ganhou linha
    SELECT count(*) INTO v_hist_pos
      FROM public.historico_candidatura h
     WHERE h.candidatura_id = v_cand;

    IF v_hist_pos <> v_hist_antes THEN
      RAISE EXCEPTION 'P45-VERIFICA: a retirada produziu % linha(s) nova(s) em historico_candidatura — isso dispararia trg_notif_transicao, e o titular que pediu para sair receberia e-mail de DECISAO', v_hist_pos - v_hist_antes;
    END IF;

    -- (iv) `deleted_at` continua NULL
    IF v_del IS NOT NULL THEN
      RAISE EXCEPTION 'P45-VERIFICA: candidatura retirada com deleted_at preenchido — o encerramento e ADITIVO, e um soft delete a faria sumir das 5 leituras de RH em silencio (Invariante 9)';
    END IF;

    -- Sinaliza sucesso E reverte a subtransacao inteira. Nada persiste.
    RAISE EXCEPTION 'P45-VERIFICA-OK';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('request.jwt.claims', '', true);
      IF SQLERRM <> 'P45-VERIFICA-OK' THEN
        RAISE;
      END IF;
      RAISE NOTICE 'P45 OK: retirar_candidatura COMPLETOU o caminho feliz (data devolvida, segunda invocacao no-op), etapa_atual intacta, nenhuma linha de trilha nasceu, deleted_at continua NULL — e a subtransacao foi revertida, nada persistiu';
  END;
END
$verifica_retirar_candidatura$;


-- ---------------------------------------------------------------------------
-- BLOCO F · O disparo do aviso ao RH
-- ---------------------------------------------------------------------------
-- Molde verbatim de `trg_notif_revisao_solicitada` (20260730000003:142-215). Tres
-- invariantes herdadas, todas load-bearing:
--
--   1. BEARER = `edge_invoke_key` DO VAULT, nunca a chave de servidor privilegiada.
--      A igualdade entre as duas esta QUEBRADA POR ROTACAO (Pitfall 5 da P41), entao
--      usar a segunda produziria 401 na EF — e um 401 numa chamada at-most-once nao
--      volta para o banco.
--   2. GRACEFUL-SKIP: segredo ausente ⇒ `RETURN NEW`. Um segredo nao provisionado
--      nunca pode quebrar a retirada pedida pelo titular.
--   3. FAIL-OPEN: todo o dispatch dentro de EXCEPTION WHEN OTHERS. O exercicio de um
--      direito do titular NUNCA quebra por falha de despacho, e a mensagem do WARNING
--      nao interpola dado pessoal.
--
-- Corpo do POST IDS-ONLY: duas chaves, e nada mais. Nem identificacao do titular,
-- nem endereco, nem documento — a EF resolve o que precisa com privilegio proprio, e
-- o corpo do e-mail ao RH nao usa nada disso (Invariante 10 da 45-UI-SPEC / T-42-24).
--
-- ⚠ DISPARA PARA OS DOIS CAMINHOS, e essa e a razao de o guard ser sobre a COLUNA e
-- nao sobre a funcao que a escreveu: `retirar_candidatura` (retirada avulsa) e
-- `registrar_pedido_exclusao` (encerramento em lote) escrevem a mesma coluna, entao
-- um unico `AFTER UPDATE OF` cobre os dois sem que nenhuma das duas funcoes precise
-- saber que existe notificacao.

CREATE OR REPLACE FUNCTION public.trg_notif_candidatura_encerrada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $trg_notif_candidatura_encerrada$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- Guard de transicao: dispara SO quando a candidatura e encerrada pela PRIMEIRA
  -- vez (NULL -> NOT NULL). Um UPDATE que apenas toque outras colunas nao chega aqui
  -- (a clausula AFTER UPDATE OF ja filtra), e um UPDATE que reescreva o mesmo
  -- timestamp nao passa deste IF — o que casa com a idempotencia por estado das duas
  -- funcoes escritoras, nenhuma das quais reescreve uma data ja gravada.
  IF NOT (OLD.encerrada_a_pedido_em IS NULL AND NEW.encerrada_a_pedido_em IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- segredos ausentes — dispatch adiado, retirada do titular intacta
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-rh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', 'candidatura_encerrada_a_pedido',
        'candidatura_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_candidatura_encerrada: dispatch falhou (%: %) — retirada intacta', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$trg_notif_candidatura_encerrada$;

-- `REVOKE … FROM PUBLIC` NAO remove `anon`: medido na P42-06, o `pg_default_acl` do
-- schema `public` concede EXECUTE a anon/authenticated como grants DIRETOS E
-- NOMEADOS em todo CREATE FUNCTION. O revoke nominal de `anon` e obrigatorio.
-- `authenticated` fica, pela mesma razao registrada nos triggers irmaos: o write-path
-- e uma funcao DEFINER cujo dono e o usuario efetivo quando o trigger dispara, e
-- revogar alem do necessario numa funcao de fire-path e mudanca sem requirement.
REVOKE ALL ON FUNCTION public.trg_notif_candidatura_encerrada() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_notif_candidatura_encerrada() FROM anon;

-- `DROP TRIGGER IF EXISTS` antes do `CREATE` torna a migration re-aplicavel.
-- ⚠ O nome dropado e EXATAMENTE `trg_candidatura_encerrada_a_pedido`. Os triggers
-- pre-existentes de `candidaturas` (`trg_avancar_etapa`, `trg_candidaturas_analise`,
-- `trg_notif_confirmacao`) vivem na MESMA tabela e NAO podem ser tocados.
--
-- ⚠ O GUARD DE TRANSICAO APARECE DUAS VEZES, E A REDUNDANCIA E DELIBERADA. A
-- clausula `WHEN` e o gate PRIMARIO: avaliada pelo executor, ela impede que a funcao
-- seja sequer chamada num UPDATE que nao seja a transicao NULL -> NOT NULL. O `IF` no
-- corpo (molde verbatim de 20260730000003) e o SOBREVIVENTE: se alguem recriar este
-- trigger sem a clausula — o que um `CREATE TRIGGER` copiado de outro arquivo faz com
-- facilidade —, o corpo continua recusando o disparo indevido. Um dispatch
-- at-most-once nao tem segunda chance de ser filtrado.
DROP TRIGGER IF EXISTS trg_candidatura_encerrada_a_pedido ON public.candidaturas;
CREATE TRIGGER trg_candidatura_encerrada_a_pedido
  AFTER UPDATE OF encerrada_a_pedido_em ON public.candidaturas
  FOR EACH ROW
  WHEN (OLD.encerrada_a_pedido_em IS NULL AND NEW.encerrada_a_pedido_em IS NOT NULL)
  EXECUTE FUNCTION public.trg_notif_candidatura_encerrada();


-- ---------------------------------------------------------------------------
-- BLOCO G · varrer_retry_notificacoes — o evento novo sai da varredura
-- ---------------------------------------------------------------------------
-- ⚠ DESVIO D-45-09-03, e ele e bloqueante. A clausula viva de exclusao dos eventos
-- de RH e `evento NOT LIKE 'revisao\_solicitada%'`, um prefixo que NAO CASA o evento
-- deste plano. Sem esta substituicao, uma falha de envio do aviso ao RH deixaria a
-- linha em `falhou` com `tentativas = 1` e `proxima_tentativa_em` NULA — e ela seria
-- seleccionada pela varredura a cada 15 minutos, PARA SEMPRE, nas quatro etapas que
-- a 42-07 ja documentou: re-postada por URL FIXA contra a EF errada, recusada com
-- 400 VALIDATION antes do branch de retry, `tentativas` jamais incrementado (quem
-- incrementa e a EF, e ela nem chega la), consumindo o `LIMIT 20` que existe para os
-- retries LEGITIMOS de candidato (T-42-23).
--
-- ⚠ LEITURA OBRIGATORIA ANTES DO APPLY (mesmo controle que a 42-07 impos a si
-- mesma). O corpo abaixo e a transcricao da versao de `20260730000003:280-346` com
-- UMA alteracao funcional. O plano 45-11 tem de ler
-- `pg_get_functiondef('public.varrer_retry_notificacoes()'::regprocedure)` do
-- CATALOGO VIVO e diffar contra esta transcricao ANTES de aplicar: a unica diferenca
-- admissivel e a clausula de exclusao nova e o comentario adjacente. Qualquer outra
-- divergencia significa que a funcao viva nao e a do arquivo, e o apply deve PARAR.
--
-- NAO-REGRESSAO: `supabase/tests/p41_recon_retry_smoke.sql:185-220` afere este corpo
-- por `pg_get_functiondef` e exige 7 substrings (`status IN`, `pendente`, `falhou`,
-- `tentativas < 5`, `edge_invoke_key`, `/functions/v1/notificar-candidato`,
-- `retry_id`, `split_part`) e a AUSENCIA da chave de servidor privilegiada no corpo.
-- Todas preservadas — inclusive a ausencia, motivo pelo qual os comentarios DENTRO
-- deste corpo nao nomeiam aquele papel (o `pg_get_functiondef` os devolve junto).
--
-- REJEITADA: gravar `tentativas = 5` na primeira falha para que o cap a exclua.
-- Funciona, nao toca esta funcao, e e exatamente o tipo de truque opaco que produz um
-- CR-01: um leitor futuro ve `tentativas = 5` e conclui que houve cinco tentativas.

CREATE OR REPLACE FUNCTION public.varrer_retry_notificacoes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
  r             record;
BEGIN
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN;  -- segredos ausentes — varredura adiada, ledger intacto (graceful-skip)
  END IF;

  -- Selecao coberta por idx_notif_retry (btree proxima_tentativa_em WHERE status
  -- IN ('pendente','falhou')). tentativas < 5 = cap; NULLS FIRST prioriza as que
  -- nunca foram agendadas; LIMIT 20 e o cinto anti-rajada (free-tier Resend,
  -- T-41-10/T-41-13).
  --
  -- P42-07 · a primeira clausula de exclusao: esta varredura despacha por URL FIXA
  -- para notificar-candidato, entao uma linha de evento de RH seria re-postada
  -- contra a EF errada, recusada com 400 VALIDATION antes do branch de retry,
  -- jamais teria tentativas incrementado e voltaria a ser selecionada a cada 15
  -- minutos para sempre, consumindo o LIMIT 20 dos retries legitimos de candidato
  -- (T-42-23). O `\_` escapa o underscore para que ele seja literal e nao um
  -- curinga de um caractere.
  --
  -- P45-09 · a segunda clausula: candidatura_encerrada_a_pedido e o SEGUNDO evento
  -- consumido pela EF do RH e NAO casa o prefixo acima. Igualdade em vez de prefixo
  -- porque o valor e fechado por CHECK — nao ha variante a cobrir, e um prefixo
  -- generoso poderia capturar um evento de candidato futuro cujo nome comecasse
  -- igual. Nota: o evento de candidato revisao_respondida NAO casa nenhuma das duas
  -- e continua elegivel a retry, o que e o correto — o candidato nao tem fila onde
  -- recuperar um aviso perdido.
  FOR r IN
    SELECT id, evento, candidatura_id, dedupe_key
      FROM public.notificacoes_enviadas
     WHERE status IN ('pendente','falhou')
       AND tentativas < 5
       AND evento NOT LIKE 'revisao\_solicitada%'
       AND evento <> 'candidatura_encerrada_a_pedido'
       AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= pg_catalog.now())
     ORDER BY proxima_tentativa_em NULLS FIRST
     LIMIT 20
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := v_project_url || '/functions/v1/notificar-candidato',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_invoke_key
        ),
        body := jsonb_build_object(
          'retry_id', r.id,               -- sinaliza o branch de retry na EF (P41-01)
          'evento', r.evento,
          'candidatura_id', r.candidatura_id,
          -- convite: dedupe_key = '{agendamento_id}:convite' (helpers.ts:38),
          -- entao o agendamento_id e o 1o campo. Demais eventos: NULL.
          'agendamento_id',
            CASE WHEN r.evento = 'convite'
                 THEN split_part(r.dedupe_key, ':', 1) END
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'varrer_retry: dispatch falhou id=% (%: %)', r.id, SQLSTATE, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- `CREATE OR REPLACE` PRESERVA a ACL existente, entao os revokes da P41/P42-07
-- continuam de pe. Reafirmados aqui por explicitude, no idioma daquele arquivo.
REVOKE ALL ON FUNCTION public.varrer_retry_notificacoes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.varrer_retry_notificacoes() FROM anon;
REVOKE ALL ON FUNCTION public.varrer_retry_notificacoes() FROM authenticated;


-- ---------------------------------------------------------------------------
-- BLOCO H · COMMENT — depois dos blocos anonimos, ordem herdada do molde
-- ---------------------------------------------------------------------------
COMMENT ON FUNCTION public.retirar_candidatura(uuid) IS
  'Phase 45 / ERASE-05: o titular sai de UMA vaga sem apagar nada. Grava '
  'candidaturas.encerrada_a_pedido_em = now() e devolve a data. SECURITY DEFINER + '
  'VOLATILE com search_path vazio; delimitador NOMEADO para que md5(prosrc) seja '
  'extraivel pelo smoke. '
  '⚠ ESCREVE A MESMA COLUNA E O MESMO PREDICADO de registrar_pedido_exclusao, mudando '
  'apenas o escopo (id de UMA candidatura, em vez de candidato_id de todas). Um so '
  'estado no banco para os dois caminhos — e por isso um so evento de notificacao os '
  'cobre. '
  '⚠ IDEMPOTENCIA POR ESTADO, nunca por try/catch: candidatura ja retirada devolve A '
  'MESMA data, sem mutar nada. Um segundo toque no card nao pode reescrever a data que '
  'a tela ja mostrou ao titular. '
  '⚠ O QUE ESTA FUNCAO NUNCA FAZ, e cada recusa tem razao medida: nao escreve em '
  'etapa_atual (esse e o caminho da REJEICAO — com JWT de titular ele dispara '
  'trg_notif_transicao com evento decisao, mandando e-mail de rejeicao para quem '
  'acabou de pedir para sair; com privilegio de servidor ele grava auto_rejeitado = '
  'true, fabricando na tabela que existe para provar que ninguem e rejeitado por '
  'maquina exatamente a evidencia do contrario, RNF-07a); nao insere em '
  'historico_candidatura (UM unico escritor desde o M2/Phase 6); nao toca deleted_at '
  '(5 leituras de RH filtram por ele, e um soft delete faria a candidatura sumir de '
  'todas em silencio — Invariante 9 da 45-UI-SPEC); e nao apaga NADA. '
  'GUARD em duas metades: rejeicao explicita de auth.uid() NULL, e titularidade por IS '
  'DISTINCT FROM (nunca NOT IN, que falha ABERTO para chamador sem claim). Candidatura '
  'inexistente cai no mesmo ramo, porque NULL IS DISTINCT FROM <uid> e TRUE. Recusa '
  '42501. Candidatura ja decidida ou removida recusa 22023 — fato do dominio, nao '
  'falha de servidor, para a EF traduzir em 400 e nunca 500. '
  'REVOKE ALL de PUBLIC, anon e authenticated NOMINALMENTE (pg_default_acl concede a '
  'anon como grant direto), e o UNICO GRANT e para o papel de servidor: a porta '
  'legitima e a Edge Function, que resolve o titular de auth.uid() no servidor e '
  'IGNORA qualquer id vindo do corpo do request (classe T-32-03).';

COMMENT ON FUNCTION public.trg_notif_candidatura_encerrada() IS
  'Phase 45 / 45-09 ERASE-05 (D-45-06): despacha o aviso ao RH de que uma candidatura '
  'foi encerrada a pedido do candidato. AFTER UPDATE OF encerrada_a_pedido_em em '
  'candidaturas, guard de transicao NULL -> NOT NULL. '
  '⚠ COBRE OS DOIS CAMINHOS porque o guard e sobre a COLUNA e nao sobre quem a '
  'escreveu: retirar_candidatura (retirada avulsa) e registrar_pedido_exclusao '
  '(encerramento em lote pelo pedido de exclusao) gravam a mesma coluna, entao um '
  'unico trigger os cobre sem que nenhuma das duas precise saber que existe '
  'notificacao. '
  'Corpo ids-only (evento + candidatura_id) via Bearer self-auth do Vault (project_url '
  '+ edge_invoke_key, NUNCA a chave de servidor privilegiada — a igualdade esta '
  'quebrada por rotacao), graceful-skip se algum segredo faltar, fail-open num '
  'EXCEPTION WHEN OTHERS: o exercicio de um direito do titular nunca quebra por falha '
  'de despacho. '
  'AT-MOST-ONCE: a EF notificar-rh tem de aceitar o evento candidatura_encerrada_a_pedido '
  'ANTES deste trigger existir, senao o aviso se perde sem erro em lugar nenhum. '
  'NAO existe retry automatico deste evento — ver o COMMENT de '
  'varrer_retry_notificacoes; a lista de candidatos da vaga e a superficie duravel. '
  'O aviso NAO carrega identificador do candidato nem o motivo especifico do '
  'encerramento (Invariante 10 da 45-UI-SPEC / T-42-24): em modo teste o corpo inteiro '
  'viaja para um dominio de terceiro sem contrato de tratamento, e POR QUE uma pessoa '
  'exerceu um direito e dado sobre ela.';

COMMENT ON FUNCTION public.varrer_retry_notificacoes() IS
  'M7/P41 RECON-03: varredura de retry acionada pelo cron notif-retry-sweep a '
  'cada 15 min. Re-invoca a EF notificar-candidato (branch retry via retry_id no '
  'body) para cada notificacao nao-terminal (status pendente/falhou) dentro do '
  'cap (tentativas < 5) e com o backoff vencido (proxima_tentativa_em). Bearer = '
  'edge_invoke_key do Vault (== NOTIFICAR_SECRET da EF), NUNCA a chave de '
  'servidor privilegiada — a invariante esta quebrada por rotacao (Pitfall 5). A varredura '
  'NAO incrementa tentativas: o net.http_post e at-most-once e ela nao sabe o '
  'resultado; quem incrementa e a EF, so ao tentar. LIMIT 20 por sweep = cinto '
  'anti-rajada do free-tier Resend. SECURITY DEFINER + search_path vazio; cada '
  'dispatch isolado em EXCEPTION WHEN OTHERS (uma falha nao aborta as demais). '
  'Phase 42 / 42-07 (T-42-23): EXCLUI os eventos de RH do SELECT. O despacho e por URL '
  'FIXA para notificar-candidato, entao uma linha de RH seria re-postada contra a EF '
  'errada, recusada com 400 VALIDATION antes do branch de retry, jamais teria '
  'tentativas incrementado e voltaria a ser selecionada a cada 15 minutos para sempre, '
  'consumindo o LIMIT 20 dos retries legitimos de candidato. O '
  'retry automatico do e-mail ao RH fica fora do v1 por decisao registrada: a fila '
  '/rh/revisoes e a superficie duravel e um nudge perdido e recuperavel por ela, ao '
  'passo que um e-mail de candidato perdido nao e recuperavel por caminho nenhum. '
  'Reavaliar em M8+. '
  'Phase 45 / 45-09: a exclusao ganhou uma SEGUNDA clausula. O evento '
  'candidatura_encerrada_a_pedido e o 2o consumido pela EF do RH e NAO casa o prefixo '
  'revisao_solicitada, entao sem ela o mesmo laco de 15 em 15 minutos voltaria pela '
  'porta do evento novo. Igualdade em vez de prefixo porque o valor e fechado por '
  'CHECK. Todo evento novo consumido pela EF do RH tem de ser acrescentado AQUI na '
  'mesma entrega em que entra no CHECK.';
