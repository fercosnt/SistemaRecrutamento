-- =============================================================================
-- Phase 48 / Plan 48-10 — JORN-15 · D-22
-- Liberar a avaliação cognitiva passa a AVISAR o candidato (evento `cognitivo_liberado`)
-- =============================================================================
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-21, só leitura)
--   `public.liberar_cognitivo` (20260826000008) grava em `public.cognitivo_liberacao` e
--   termina ali: o `prosrc` não tem `net.http`, e a tabela não tinha trigger nenhum
--   (`pg_trigger` vazio para `cognitivo_liberacao`). O candidato só descobria que havia uma
--   avaliação cognitiva liberada para ele se voltasse ao painel por conta própria.
--
-- POR QUE AGORA (D-09 + D-22, operador)
--   O e-mail de confirmação passa a prometer «avisaremos quando houver algo para você fazer»
--   (plano 48-16). A liberação cognitiva é uma ação pedida ao candidato; sem este aviso, a
--   promessa nova seria descumprida no dia em que fosse publicada. `em_espera` NÃO é decisão
--   comunicada ao candidato e continua sem aviso (D-22).
--
-- AS CINCO OBRIGAÇÕES DE UM EVENTO NOVO (48-RESEARCH §D.1), todas nesta entrega:
--   1. valor no CHECK `notificacoes_enviadas_evento_check` (BLOCO A), preservando os 8 vivos;
--   2. linha em `classe_evento_notificacao`, classe `transacional` (BLOCO B) — o guard
--      `guard_marketing_consentimento` é fail-closed (P0003) para evento sem classe;
--   3. vocabulário da EF `notificar-candidato` (`EventoLedger`, `EVENTO_MAP` →
--      `avaliacao_cognitiva_liberada`, e as três entradas de template) — commit e580a144;
--   4. é evento de CANDIDATO: continua ELEGÍVEL a `varrer_retry_notificacoes`. Esta migration
--      NÃO redefine a varredura (a denylist dela exclui só os dois eventos de RH);
--   5. os smokes de vocabulário convertidos no 48-06 (`p43_guard_marketing_smoke`,
--      `p42_notif_revisao_smoke`, `p37_fidelidade_schema_smoke`) iteram o CHECK vivo e passam
--      a vigiar este evento sem edição.
--
-- -----------------------------------------------------------------------------
-- ORDEM DE ENTREGA OBRIGATÓRIA — cumprida ANTES deste apply (horários UTC, 2026-09-21)
-- -----------------------------------------------------------------------------
--   14:42:05  `notificar-candidato` v13 — o evento no vocabulário; bundle lido de volta com
--             `cognitivo_liberado` 17× e `avaliacao_cognitiva_liberada` 10×; POST sem Bearer → 401
--   14:42:17  `notificar-rh` v6 · 14:42:19 `executar-direito-titular` v6 (importadoras de
--             `_shared/email-*`, redeployadas pela mudança do módulo compartilhado; o
--             `verify_jwt` vivo de cada uma — false, false, true — foi lido e preservado)
--   depois    ESTA migration: CHECK + classe (BLOCOS A e B) → trigger (BLOCOS C e D)
--
-- `net.http_post` é AT-MOST-ONCE: trigger no ar antes da EF conhecer o evento faria a EF
-- responder `400 VALIDATION`, e o e-mail sumiria sem erro em lugar nenhum. CHECK/classe no
-- mesmo arquivo do trigger: o apply é atômico, não há instante em que o trigger exista sem eles.
--
-- -----------------------------------------------------------------------------
-- LEITURA OBRIGATÓRIA ANTES DO APPLY — transcrição do vivo (2026-09-21, só leitura)
-- -----------------------------------------------------------------------------
-- >>> pg_get_constraintdef(notificacoes_enviadas_evento_check), ANTES:
-- >>>   CHECK ((evento = ANY (ARRAY['confirmacao'::text, 'avanco'::text, 'convite'::text, 'decisao'::text, 'revisao_solicitada'::text, 'revisao_respondida'::text, 'divulgacao_vagas'::text, 'candidatura_encerrada_a_pedido'::text])))
-- >>> Nenhuma cláusula além da lista de eventos: o DROP/ADD não perde nada. O pré-portão
-- >>> abaixo confere o texto EXATO e aborta se o vivo tiver mudado desde esta transcrição.
-- >>> `classe_evento_notificacao`: 8 linhas, nenhuma para `cognitivo_liberado`.
-- >>> `pg_trigger` em `cognitivo_liberacao`: nenhum. `trg_notif_cognitivo_liberado()`: não existe.
--
-- AUTHZ
--   A função de trigger é SECURITY DEFINER (lê o Vault) e só roda como trigger. REVOKE nominal
--   de PUBLIC e de `anon` (o `pg_default_acl` deste projeto concede EXECUTE a `anon` como grant
--   direto; `FROM PUBLIC` sozinho não o remove). O write-path continua sendo SÓ as RPCs
--   `liberar_cognitivo`/`revogar_cognitivo` (a tabela não tem policy de escrita).
--
-- IDEMPOTÊNCIA
--   DROP CONSTRAINT IF EXISTS/ADD, `ON CONFLICT (evento) DO NOTHING` (nunca upsert da classe),
--   CREATE OR REPLACE da função, DROP TRIGGER IF EXISTS/CREATE. Do lado do e-mail, duas
--   camadas: o guard de transição no corpo do trigger (clicar «Liberar» numa liberação vigente
--   não despacha) e a chave `{candidatura}:cognitivo_liberado:{ciclo}` na EF.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/COMMENT adjacentes é a forma exata do 42601, e o endpoint já roda tudo numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000010_p48_cognitivo_liberado_notifica.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação; a `version`
-- nasce correta, não há `UPDATE ... SET version` a fazer).
-- =============================================================================


-- =============================================================================
-- PRÉ-PORTÃO — o vivo é o que foi transcrito acima
-- =============================================================================
DO $pre$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_def
    FROM pg_constraint c
   WHERE c.conname = 'notificacoes_enviadas_evento_check'
     AND c.conrelid = 'public.notificacoes_enviadas'::regclass;

  IF v_def IS DISTINCT FROM
     'CHECK ((evento = ANY (ARRAY[''confirmacao''::text, ''avanco''::text, ''convite''::text, ''decisao''::text, ''revisao_solicitada''::text, ''revisao_respondida''::text, ''divulgacao_vagas''::text, ''candidatura_encerrada_a_pedido''::text])))'
  THEN
    RAISE EXCEPTION 'P48-10 PRE: o CHECK vivo de evento mudou desde a transcricao do cabecalho — reler e retranscrever antes do apply. Vivo: %', v_def;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger
              WHERE tgrelid = 'public.cognitivo_liberacao'::regclass AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'P48-10 PRE: cognitivo_liberacao ganhou trigger desde a medicao — reler antes do apply';
  END IF;
END
$pre$;


-- =============================================================================
-- BLOCO A — o CHECK do ledger ganha o 9º valor
-- =============================================================================
-- O nome da constraint é LOAD-BEARING (`20260721000001`). O vocabulário só CRESCE: os 8
-- vivos são preservados, e o DO abaixo aborta se algum sumir.
--
--   confirmacao · avanco · convite · decisao  → triggers de funil (P39)          → notificar-candidato
--   revisao_solicitada                         → trg_notif_revisao_solicitada     → notificar-rh
--   revisao_respondida                         → trg_notif_revisao_respondida     → notificar-candidato
--   divulgacao_vagas                           → RESERVADO (marketing), sem emissor
--   candidatura_encerrada_a_pedido             → trg_notif_candidatura_encerrada  → notificar-rh
--   cognitivo_liberado                         → trg_notif_cognitivo_liberado (ESTE arquivo) → notificar-candidato

ALTER TABLE public.notificacoes_enviadas
  DROP CONSTRAINT IF EXISTS notificacoes_enviadas_evento_check;

ALTER TABLE public.notificacoes_enviadas
  ADD CONSTRAINT notificacoes_enviadas_evento_check
  CHECK (evento IN (
    'confirmacao', 'avanco', 'convite', 'decisao',
    'revisao_solicitada', 'revisao_respondida',
    'divulgacao_vagas', 'candidatura_encerrada_a_pedido',
    'cognitivo_liberado'
  ));

DO $verifica_check$
DECLARE
  v_qtd  int;
  v_defs text;
  v_ev   text;
BEGIN
  SELECT count(*), string_agg(c.conname || ' => ' || pg_get_constraintdef(c.oid), ' | ')
    INTO v_qtd, v_defs
    FROM pg_constraint c
   WHERE c.conrelid = 'public.notificacoes_enviadas'::regclass
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) LIKE '%evento%';

  IF v_qtd <> 1 THEN
    RAISE EXCEPTION 'P48-10 BLOCO A: esperava 1 CHECK sobre evento, achei % — %', v_qtd, v_defs;
  END IF;

  -- Os 8 vivos + o novo. Lista deliberada: é o ESTADO que esta migration produz, não uma
  -- fotografia vigiada depois dela (os smokes iteram o CHECK vivo).
  FOREACH v_ev IN ARRAY ARRAY[
    'confirmacao', 'avanco', 'convite', 'decisao',
    'revisao_solicitada', 'revisao_respondida',
    'divulgacao_vagas', 'candidatura_encerrada_a_pedido',
    'cognitivo_liberado'
  ] LOOP
    IF position('''' || v_ev || '''::text' IN v_defs) = 0 THEN
      RAISE EXCEPTION 'P48-10 BLOCO A: o CHECK vivo NAO contem % — %', v_ev, v_defs;
    END IF;
  END LOOP;
END
$verifica_check$;

COMMENT ON CONSTRAINT notificacoes_enviadas_evento_check ON public.notificacoes_enviadas IS
  'Vocabulario de evento do ledger — 9 valores desde a Phase 48 / 48-10 (cognitivo_liberado, '
  'D-22). Eventos de candidato (EF notificar-candidato): confirmacao, avanco, convite, decisao, '
  'revisao_respondida, cognitivo_liberado. Eventos de RH (EF notificar-rh): revisao_solicitada, '
  'candidatura_encerrada_a_pedido. Reservado (marketing, sem emissor): divulgacao_vagas. '
  'Todo valor novo exige, na MESMA entrega: linha em classe_evento_notificacao (guard '
  'fail-closed P0003), o vocabulario da EF consumidora (400 VALIDATION sobre dispatch '
  'at-most-once sem ele), e — se for evento de RH — a exclusao em varrer_retry_notificacoes. '
  'O vocabulario apenas CRESCE: remover um valor quebra o evento correspondente em silencio.';


-- =============================================================================
-- BLOCO B — a classe do evento (o guard de marketing é fail-closed)
-- =============================================================================
-- `transacional`, e não `marketing`: a liberação é uma etapa do processo seletivo que a
-- própria pessoa iniciou ao se candidatar (Art. 7 V — procedimento preliminar ao contrato).
-- Não passa por consentimento de marketing e não tem opt-out, como `avanco` e `convite`.
-- `ON CONFLICT DO NOTHING`, nunca upsert: se a linha já existisse com outra classe, a
-- asserção final aborta em vez de reescrevê-la em silêncio.

INSERT INTO public.classe_evento_notificacao (evento, classe, descricao)
VALUES (
  'cognitivo_liberado',
  'transacional',
  'Aviso ao candidato de que o RH liberou a avaliacao cognitiva para a sua candidatura. '
  'Art. 7 V — procedimento preliminar ao contrato. Sem opt-out.'
)
ON CONFLICT (evento) DO NOTHING;


-- =============================================================================
-- BLOCO C — trg_notif_cognitivo_liberado() · o disparo ao candidato
-- =============================================================================
-- Molde: `trg_notif_revisao_respondida` (definição viva, 20260921000007). Invariantes
-- herdadas, todas load-bearing:
--   1. Bearer = `edge_invoke_key` do Vault, NUNCA a chave de servidor privilegiada (a
--      igualdade entre as duas está quebrada por rotação — um 401 at-most-once não volta).
--   2. Graceful-skip: segredo ausente ⇒ `RETURN NEW`. A liberação do RH nunca quebra por isso.
--   3. Fail-open: o dispatch inteiro dentro de `EXCEPTION WHEN OTHERS`, com WARNING sem PII.
--   4. Corpo ids-only: evento, candidatura_id e o `ciclo` — o instante da liberação
--      (`extract(epoch from liberado_em)::bigint`, em texto), que a EF usa como discriminador
--      da chave `{candidatura}:cognitivo_liberado:{ciclo}`.
--
-- GUARD DE TRANSIÇÃO — quando uma liberação é um AVISO NOVO
--   `liberar_cognitivo` faz `INSERT ... ON CONFLICT (candidatura_id) DO UPDATE SET
--   liberado_em = now(), revogado_em = NULL, ...` (20260826000008:72-79). Logo:
--     · INSERT (primeira liberação)                        → despacha;
--     · UPDATE de uma revogada (OLD.revogado_em NOT NULL,
--       NEW.revogado_em NULL — re-liberação)                → despacha, com ciclo novo;
--     · UPDATE de uma VIGENTE (clicar «Liberar» de novo)    → NÃO despacha: a pessoa já foi
--       avisada dessa liberação, e o recarimbo de `liberado_em` não é uma liberação nova;
--     · `revogar_cognitivo` (NULL → NOT NULL)               → NÃO despacha (revogar não é
--       algo para o candidato fazer; não se comunica).
--   Uma linha nascida já revogada (não há caminho de RPC que a produza) também não despacha.
--
-- ⚠ UNICO DESPACHANTE deste evento: `liberar_cognitivo` nunca chama `net.http_post`, e não
-- deve passar a chamar — dois despachantes produziriam e-mail duplo ou colisão de chave.
-- ⚠ Sem guard de knockout/encerramento aqui: `liberar_cognitivo` já recusa candidatura com
-- `status IN ('rejeitado','finalizado')` (P0001) antes de gravar.

CREATE OR REPLACE FUNCTION public.trg_notif_cognitivo_liberado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- Uma liberação revogada não é aviso (cobre também um INSERT que nascesse revogado).
  IF NEW.revogado_em IS NOT NULL THEN
    RETURN NEW;
  END IF;
  -- No UPDATE, só a RE-liberação (revogada → vigente) é aviso novo. Recarimbar uma
  -- liberação vigente (clicar «Liberar» de novo) não reenvia.
  IF TG_OP = 'UPDATE' AND NOT (OLD.revogado_em IS NOT NULL AND NEW.revogado_em IS NULL) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- segredos ausentes — dispatch adiado, liberação intacta
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-candidato',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', 'cognitivo_liberado',
        'candidatura_id', NEW.candidatura_id,
        'ciclo', extract(epoch from NEW.liberado_em)::bigint::text
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_cognitivo_liberado: dispatch falhou (%: %) — liberacao intacta', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_notif_cognitivo_liberado() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_notif_cognitivo_liberado() FROM anon;


-- =============================================================================
-- BLOCO D — o trigger em cognitivo_liberacao
-- =============================================================================
-- `UPDATE OF liberado_em, revogado_em`: as duas colunas que o upsert de `liberar_cognitivo` e
-- o UPDATE de `revogar_cognitivo` tocam. Um UPDATE só de `motivo` não chega à função.

DROP TRIGGER IF EXISTS trg_notif_cognitivo_liberado ON public.cognitivo_liberacao;
CREATE TRIGGER trg_notif_cognitivo_liberado
  AFTER INSERT OR UPDATE OF liberado_em, revogado_em ON public.cognitivo_liberacao
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notif_cognitivo_liberado();


-- =============================================================================
-- BLOCO E — COMMENTs
-- =============================================================================
COMMENT ON FUNCTION public.trg_notif_cognitivo_liberado() IS
  'Phase 48 / 48-10 (D-22, JORN-15): despacha o aviso ao CANDIDATO de que o RH liberou a '
  'avaliacao cognitiva. AFTER INSERT OR UPDATE OF liberado_em, revogado_em em '
  'cognitivo_liberacao. Despacha no INSERT e na RE-liberacao depois de uma revogacao '
  '(OLD.revogado_em NOT NULL -> NEW.revogado_em NULL); clicar Liberar numa liberacao VIGENTE '
  'recarimba liberado_em mas NAO reenvia (a pessoa ja foi avisada dessa liberacao); revogar '
  'nao comunica. Corpo ids-only (evento, candidatura_id, ciclo = epoch de liberado_em) via '
  'Bearer edge_invoke_key do Vault, graceful-skip sem segredo, fail-open com WARNING sem PII. '
  'UNICO despachante do evento (liberar_cognitivo nunca chama net.http_post). Evento de '
  'CANDIDATO: continua elegivel a varrer_retry_notificacoes. em_espera NAO e decisao '
  'comunicada ao candidato e segue sem aviso (D-22).';

COMMENT ON TRIGGER trg_notif_cognitivo_liberado ON public.cognitivo_liberacao IS
  'Phase 48 / 48-10 (D-22): aviso ao candidato na liberacao (e na re-liberacao apos revogacao) '
  'da avaliacao cognitiva. Ver o COMMENT da funcao trg_notif_cognitivo_liberado().';


-- =============================================================================
-- PÓS-PORTÃO — o estado que esta migration promete, conferido no catálogo instalado
-- =============================================================================
DO $pos$
DECLARE
  v_classe text;
  v_def    text;
  v_retry  text;
BEGIN
  SELECT classe INTO v_classe
    FROM public.classe_evento_notificacao WHERE evento = 'cognitivo_liberado';
  IF v_classe IS DISTINCT FROM 'transacional' THEN
    RAISE EXCEPTION 'P48-10 POS: classe de cognitivo_liberado = % (esperado transacional) — o guard P0003/marketing trataria o aviso errado', coalesce(v_classe, '<ausente>');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
     WHERE t.tgrelid = 'public.cognitivo_liberacao'::regclass
       AND t.tgname = 'trg_notif_cognitivo_liberado'
       AND t.tgfoid = 'public.trg_notif_cognitivo_liberado()'::regprocedure
       AND t.tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'P48-10 POS: trigger trg_notif_cognitivo_liberado ausente, desabilitado ou apontando para outra funcao';
  END IF;

  v_def := pg_get_functiondef('public.trg_notif_cognitivo_liberado()'::regprocedure);
  IF position('OLD.revogado_em IS NOT NULL AND NEW.revogado_em IS NULL' IN v_def) = 0
     OR position('''ciclo'', extract(epoch from NEW.liberado_em)::bigint::text' IN v_def) = 0
     OR position('edge_invoke_key' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P48-10 POS: a funcao instalada perdeu o guard de transicao, o ciclo ou o Bearer do Vault';
  END IF;

  IF has_function_privilege('anon', 'public.trg_notif_cognitivo_liberado()', 'EXECUTE') THEN
    RAISE EXCEPTION 'P48-10 POS: anon ainda tem EXECUTE na funcao de trigger';
  END IF;

  -- Evento de CANDIDATO: a varredura de retry NÃO pode excluí-lo.
  SELECT prosrc INTO v_retry FROM pg_proc
   WHERE oid = 'public.varrer_retry_notificacoes()'::regprocedure;
  IF position('cognitivo' IN v_retry) > 0 THEN
    RAISE EXCEPTION 'P48-10 POS: varrer_retry_notificacoes menciona cognitivo — evento de candidato nao pode ser excluido do retry';
  END IF;
END
$pos$;
