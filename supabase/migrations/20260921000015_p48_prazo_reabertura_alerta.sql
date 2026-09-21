-- =============================================================================
-- Phase 48 / Plan 48-13 — JORN-19 · D-10 · D-01
-- O prazo de 10 dias da reabertura passa a ter efeito: vencido sem nova decisão, o RH é
-- ALERTADO (evento `prazo_reabertura_vencido`) — e só alertado.
-- =============================================================================
--
-- O QUE FALTAVA (medido em PROD, 2026-09-21, só leitura)
--   O plano 48-11 fez o veredito `revertida` REABRIR a candidatura (decisao_final/em_analise)
--   e gravar `decisao_final.prazo_nova_decisao_em` = 00:00 de SP do dia seguinte ao 10º dia
--   corrido. Mas nada lia esse prazo: `alerta_prazo_enviado_em` nascia e ficava NULL para
--   sempre, e uma candidatura reaberta podia esperar indefinidamente sem ninguém ser cobrado.
--   Reabrir sem prazo é pior que rejeitar — o candidato passa a esperar.
--
-- O QUE ESTE ARQUIVO FAZ — e o que ele NUNCA faz (D-10, D-01, RNF-07a)
--   Uma varredura diária (`public.varrer_prazos_reabertura()`, job `prazo-reabertura-sweep`,
--   11:00 UTC = 08:00 em SP) seleciona as linhas de `decisao_final` reabertas cujo prazo
--   venceu sem alerta, posta ids-only para a EF `notificar-rh` e grava
--   `alerta_prazo_enviado_em`. NÃO escreve em `candidaturas`, NÃO chama a RPC de decisão, NÃO
--   aprova nem rejeita: o sistema nunca decide o que nenhum humano decidiu. `em_espera`
--   registrado durante a reabertura não é nova decisão (A5, 48-11) e não impede o alerta.
--
-- AS CINCO OBRIGAÇÕES DE UM EVENTO NOVO (48-RESEARCH §D.1), todas nesta entrega:
--   1. valor no CHECK `notificacoes_enviadas_evento_check` (BLOCO A), preservando os 9 vivos;
--   2. linha em `classe_evento_notificacao`, classe `interno` (BLOCO B);
--   3. vocabulário da EF `notificar-rh` (`EVENTOS_RH_VALIDOS` com 3 valores, rótulo de sink,
--      template, assunto, corpo, chave por destinatário e ciclo) — commit 8eb68ca1, v7;
--   4. EXCLUSÃO em `varrer_retry_notificacoes` (BLOCO C) — é evento de RH; sem a exclusão,
--      uma falha deste alerta seria re-postada à EF do CANDIDATO a cada 15 min, para sempre,
--      recusada com 400 antes do branch de retry e consumindo o LIMIT 20 (T-42-23);
--   5. smokes: os de vocabulário do 48-06 iteram o CHECK vivo (vigiam o evento sem edição);
--      `p42_invent05_cron_smoke` (a.iii) e `docs/compliance/cron-inventory.md` recebem o job
--      novo na mesma entrega (plano 48-13, Task 2).
--
-- -----------------------------------------------------------------------------
-- ORDEM DE ENTREGA OBRIGATÓRIA — cumprida ANTES deste apply (UTC, 2026-09-21)
-- -----------------------------------------------------------------------------
--   15:15:12  `notificar-rh` v7 (antes v6; `verify_jwt=false` lido e preservado) — o evento no
--             vocabulário; bundle lido de volta com `prazo_reabertura_vencido` e
--             `montarDedupeKeyRhPrazo`; POST sem Bearer → 401
--   depois    ESTA migration: CHECK + classe + exclusão do retry → função → cron
-- `net.http_post` é AT-MOST-ONCE: um emissor no ar antes da EF conhecer o evento faria a EF
-- responder 400, e o alerta sumiria sem erro. Aqui o emissor (cron) nasce por último, no mesmo
-- apply atômico que o CHECK e a classe.
--
-- -----------------------------------------------------------------------------
-- LEITURA OBRIGATÓRIA ANTES DO APPLY — transcrição do vivo (2026-09-21, só leitura)
-- -----------------------------------------------------------------------------
-- >>> pg_get_constraintdef(notificacoes_enviadas_evento_check), ANTES (9 valores, 48-10):
-- >>>   CHECK ((evento = ANY (ARRAY['confirmacao'::text, 'avanco'::text, 'convite'::text, 'decisao'::text, 'revisao_solicitada'::text, 'revisao_respondida'::text, 'divulgacao_vagas'::text, 'candidatura_encerrada_a_pedido'::text, 'cognitivo_liberado'::text])))
-- >>> `classe_evento_notificacao`: 9 linhas, nenhuma para `prazo_reabertura_vencido`.
-- >>> `varrer_retry_notificacoes()`: md5(prosrc) = 06fd990e6706451f46d7bf6625163bdf, length 3104
-- >>>   — IGUAL ao corpo entre os cifrões de `20260805000007` (P45-09): zero drift. O corpo do
-- >>>   BLOCO C é aquele, com UM fragmento contíguo a mais (a cláusula nova e o comentário
-- >>>   dela). DEPOIS: md5 = 14d8d5cb6613332c3d05176a8b82602d, length 3500.
-- >>> `varrer_prazos_reabertura()`: não existe. `cron.job`: 4 jobs, nenhum `prazo-reabertura-sweep`.
-- >>> Predicado da varredura contra PROD hoje: **0 linhas** (0 reaberturas em `decisao_final`).
-- >>>   Criar o cron NÃO alerta ninguém; e este arquivo não invoca a varredura.
--
-- AUTHZ
--   `varrer_prazos_reabertura` é SECURITY DEFINER (lê o Vault, escreve `decisao_final`) e só é
--   chamada pelo pg_cron (como o dono). EXECUTE revogado de PUBLIC, `anon` E `authenticated`,
--   sem GRANT — idêntico a `varrer_retry_notificacoes` (o `pg_default_acl` do projeto concede
--   EXECUTE a `anon`/`authenticated` como grant direto; `FROM PUBLIC` sozinho não remove).
--
-- IDEMPOTÊNCIA
--   DROP/ADD do CHECK; `ON CONFLICT (evento) DO NOTHING` na classe (nunca upsert: a asserção
--   final aborta se a classe for outra); CREATE OR REPLACE das duas funções; unschedule-guard
--   antes do schedule. Do lado do alerta: `alerta_prazo_enviado_em` (um alerta por ciclo — a
--   nova decisão de `registrar_decisao` zera o ciclo inteiro, 48-11) + a chave
--   `{candidatura}:prazo_reabertura_vencido:{ciclo}:{user_id}` na EF.
--
-- EFEITO COLATERAL CONHECIDO (Defeito 3b, fora de escopo): o UPDATE de
--   `alerta_prazo_enviado_em` dispara `trg_decisao_final_snapshot` e arquiva uma linha em
--   `decisao_final_historico`, como qualquer UPDATE da tabela. Registrado, não consertado.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/COMMENT adjacentes é a forma exata do 42601, e o endpoint já roda tudo numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000015_p48_prazo_reabertura_alerta.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação; a `version`
-- nasce correta, não há `UPDATE ... SET version` a fazer).
-- =============================================================================


-- =============================================================================
-- PRÉ-PORTÃO — o vivo é o que foi transcrito acima
-- =============================================================================
DO $pre$
DECLARE
  v_def text;
  v_md5 text;
  v_len int;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_def
    FROM pg_constraint c
   WHERE c.conname = 'notificacoes_enviadas_evento_check'
     AND c.conrelid = 'public.notificacoes_enviadas'::regclass;

  IF v_def IS DISTINCT FROM
     'CHECK ((evento = ANY (ARRAY[''confirmacao''::text, ''avanco''::text, ''convite''::text, ''decisao''::text, ''revisao_solicitada''::text, ''revisao_respondida''::text, ''divulgacao_vagas''::text, ''candidatura_encerrada_a_pedido''::text, ''cognitivo_liberado''::text])))'
  THEN
    RAISE EXCEPTION 'P48-13 PRE: o CHECK vivo de evento mudou desde a transcricao do cabecalho — reler e retranscrever antes do apply. Vivo: %', v_def;
  END IF;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_proc p
   WHERE p.oid = 'public.varrer_retry_notificacoes()'::regprocedure;

  IF v_md5 IS DISTINCT FROM '06fd990e6706451f46d7bf6625163bdf' THEN
    RAISE EXCEPTION 'P48-13 PRE: o corpo VIVO de varrer_retry_notificacoes tem md5 % (length %), esperado 06fd990e6706451f46d7bf6625163bdf (length 3104). O CREATE OR REPLACE do BLOCO C apagaria a divergencia em silencio numa funcao que roda a cada 15 min em PROD. Apply abortado.', v_md5, v_len;
  END IF;
END
$pre$;


-- =============================================================================
-- BLOCO A — o CHECK do ledger ganha o 10º valor
-- =============================================================================
-- O nome da constraint é LOAD-BEARING (`20260721000001`). O vocabulário só CRESCE: os 9
-- vivos são preservados, e o DO abaixo aborta se algum sumir.
--
--   confirmacao · avanco · convite · decisao  → triggers de funil (P39)          → notificar-candidato
--   revisao_solicitada                         → trg_notif_revisao_solicitada     → notificar-rh
--   revisao_respondida                         → trg_notif_revisao_respondida     → notificar-candidato
--   divulgacao_vagas                           → RESERVADO (marketing), sem emissor
--   candidatura_encerrada_a_pedido             → trg_notif_candidatura_encerrada  → notificar-rh
--   cognitivo_liberado                         → trg_notif_cognitivo_liberado     → notificar-candidato
--   prazo_reabertura_vencido                   → varrer_prazos_reabertura (ESTE arquivo, via cron) → notificar-rh

ALTER TABLE public.notificacoes_enviadas
  DROP CONSTRAINT IF EXISTS notificacoes_enviadas_evento_check;

ALTER TABLE public.notificacoes_enviadas
  ADD CONSTRAINT notificacoes_enviadas_evento_check
  CHECK (evento IN (
    'confirmacao', 'avanco', 'convite', 'decisao',
    'revisao_solicitada', 'revisao_respondida',
    'divulgacao_vagas', 'candidatura_encerrada_a_pedido',
    'cognitivo_liberado',
    'prazo_reabertura_vencido'
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
    RAISE EXCEPTION 'P48-13 BLOCO A: esperava 1 CHECK sobre evento, achei % — %', v_qtd, v_defs;
  END IF;

  -- Os 9 vivos + o novo. Lista deliberada: é o ESTADO que esta migration produz, não uma
  -- fotografia vigiada depois dela (os smokes iteram o CHECK vivo).
  FOREACH v_ev IN ARRAY ARRAY[
    'confirmacao', 'avanco', 'convite', 'decisao',
    'revisao_solicitada', 'revisao_respondida',
    'divulgacao_vagas', 'candidatura_encerrada_a_pedido',
    'cognitivo_liberado',
    'prazo_reabertura_vencido'
  ] LOOP
    IF position('''' || v_ev || '''::text' IN v_defs) = 0 THEN
      RAISE EXCEPTION 'P48-13 BLOCO A: o CHECK vivo NAO contem % — %', v_ev, v_defs;
    END IF;
  END LOOP;
END
$verifica_check$;

COMMENT ON CONSTRAINT notificacoes_enviadas_evento_check ON public.notificacoes_enviadas IS
  'Vocabulario de evento do ledger — 10 valores desde a Phase 48 / 48-13 (prazo_reabertura_vencido, '
  'JORN-19/D-10). Eventos de candidato (EF notificar-candidato): confirmacao, avanco, convite, '
  'decisao, revisao_respondida, cognitivo_liberado. Eventos de RH (EF notificar-rh): '
  'revisao_solicitada, candidatura_encerrada_a_pedido, prazo_reabertura_vencido. Reservado '
  '(marketing, sem emissor): divulgacao_vagas. Todo valor novo exige, na MESMA entrega: linha em '
  'classe_evento_notificacao (guard fail-closed P0003), o vocabulario da EF consumidora (400 '
  'VALIDATION sobre dispatch at-most-once sem ele), e — se for evento de RH — a exclusao em '
  'varrer_retry_notificacoes. O vocabulario apenas CRESCE: remover um valor quebra o evento '
  'correspondente em silencio.';


-- =============================================================================
-- BLOCO B — a classe do evento (o guard de marketing é fail-closed)
-- =============================================================================
-- `interno`, como os outros dois eventos de RH: o destinatário é a equipe, não o titular.
-- `ON CONFLICT DO NOTHING`, nunca upsert: se a linha já existisse com outra classe, a
-- asserção final aborta em vez de reescrevê-la em silêncio.

INSERT INTO public.classe_evento_notificacao (evento, classe, descricao)
VALUES (
  'prazo_reabertura_vencido',
  'interno',
  'Alerta a equipe de RH de que uma candidatura reaberta apos revisao (Art. 20) passou do prazo '
  'de 10 dias corridos sem nova decisao (JORN-19, D-10). So alerta: nenhuma decisao automatica. '
  'Destinatario interno; nao e comunicacao ao titular.'
)
ON CONFLICT (evento) DO NOTHING;


-- =============================================================================
-- BLOCO C — varrer_retry_notificacoes() · a TERCEIRA cláusula de exclusão
-- =============================================================================
-- Corpo = o de `20260805000007` (md5 06fd990e…, conferido pelo PRÉ-PORTÃO) com UM fragmento
-- contíguo a mais: o comentário e a cláusula `AND evento <> 'prazo_reabertura_vencido'`,
-- logo depois da cláusula do encerramento. O PÓS-PORTÃO prova que a mudança é SÓ essa:
-- `md5(replace(prosrc, <fragmento>, ''))` tem de voltar a 06fd990e….
--
-- ⚠ NÃO-REGRESSÃO do `p41_recon_retry_smoke` (d): as 7 substrings exigidas continuam no corpo,
-- e o comentário novo, como os antigos, NÃO nomeia o papel privilegiado — o smoke exige a
-- ausência dele no `pg_get_functiondef`, que devolve os comentários junto.

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
       -- 48-13 · a terceira clausula: prazo_reabertura_vencido e o TERCEIRO evento
       -- consumido pela EF do RH (o alerta de prazo de nova decisao vencido, JORN-19).
       -- Igualdade, pela mesma razao da segunda. Sem ela, uma falha desse alerta seria
       -- re-postada contra a EF do candidato a cada 15 minutos, para sempre (T-42-23).
       AND evento <> 'prazo_reabertura_vencido'
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

-- `CREATE OR REPLACE` PRESERVA a ACL existente; reafirmada por explicitude, no idioma da P45.
REVOKE ALL ON FUNCTION public.varrer_retry_notificacoes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.varrer_retry_notificacoes() FROM anon;
REVOKE ALL ON FUNCTION public.varrer_retry_notificacoes() FROM authenticated;


-- =============================================================================
-- BLOCO D — varrer_prazos_reabertura() · o alerta, e SÓ o alerta
-- =============================================================================
-- Molde: `varrer_retry_notificacoes` (Vault + graceful-skip, FOR … LIMIT … LOOP,
-- `net.http_post` dentro de `EXCEPTION WHEN OTHERS`). Invariantes, todas load-bearing:
--   1. Bearer = `edge_invoke_key` do Vault (a EF compara com NOTIFICAR_RH_SECRET/NOTIFICAR_SECRET).
--   2. Graceful-skip: segredo ausente ⇒ devolve 0 e NÃO marca nada — o alerta sai no dia seguinte.
--   3. Corpo ids-only: evento, candidatura_id e o `ciclo` = epoch de `prazo_nova_decisao_em`,
--      que a EF usa na chave `{candidatura}:prazo_reabertura_vencido:{ciclo}:{user_id}` (um
--      segundo prazo vencido, depois de nova decisão e nova reabertura, tem outro ciclo).
--   4. Idempotência POR ESTADO: `alerta_prazo_enviado_em` é gravado só depois de a postagem
--      ter sido enfileirada; um erro de enfileiramento deixa a linha NULL e ela volta amanhã.
--      A nova decisão (`registrar_decisao`, 48-11) zera o ciclo inteiro, inclusive esta coluna.
--   5. Seleção: reaberta, prazo vencido, sem alerta, candidatura não excluída e NÃO encerrada
--      (predicado canônico `public.candidatura_encerrada`, 48-01) — uma candidatura reaberta
--      que alguém encerrou por outro caminho não gera alerta.
--   6. `FOR UPDATE OF d SKIP LOCKED`: duas varreduras concorrentes (cron + chamada manual do
--      dono) não postam a mesma linha duas vezes.
--   7. NENHUMA escrita em `candidaturas`, nenhuma chamada à RPC de decisão: o vencimento do
--      prazo não decide nada (D-10). O PÓS-PORTÃO confere isso no corpo instalado.

CREATE OR REPLACE FUNCTION public.varrer_prazos_reabertura()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
  v_alertadas   integer := 0;
  r             record;
BEGIN
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN 0;  -- segredos ausentes: varredura adiada, nenhuma linha marcada (graceful-skip)
  END IF;

  FOR r IN
    SELECT d.candidatura_id, d.prazo_nova_decisao_em
      FROM public.decisao_final d
      JOIN public.candidaturas c ON c.id = d.candidatura_id
     WHERE d.reaberta_em IS NOT NULL
       AND d.prazo_nova_decisao_em < pg_catalog.now()
       AND d.alerta_prazo_enviado_em IS NULL
       AND c.deleted_at IS NULL
       AND NOT public.candidatura_encerrada(c.etapa_atual, c.status)
     ORDER BY d.prazo_nova_decisao_em
     LIMIT 50
     FOR UPDATE OF d SKIP LOCKED
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := v_project_url || '/functions/v1/notificar-rh',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_invoke_key
        ),
        body := jsonb_build_object(
          'evento', 'prazo_reabertura_vencido',
          'candidatura_id', r.candidatura_id,
          'ciclo', extract(epoch from r.prazo_nova_decisao_em)::bigint::text
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Sem id nem dado de pessoa no log. A linha fica sem marca e volta na proxima varredura.
      RAISE WARNING 'varrer_prazos_reabertura: dispatch falhou (%: %) — linha nao marcada', SQLSTATE, SQLERRM;
      CONTINUE;
    END;

    UPDATE public.decisao_final
       SET alerta_prazo_enviado_em = pg_catalog.now()
     WHERE candidatura_id = r.candidatura_id;

    v_alertadas := v_alertadas + 1;
  END LOOP;

  RETURN v_alertadas;
END;
$$;

REVOKE ALL ON FUNCTION public.varrer_prazos_reabertura() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.varrer_prazos_reabertura() IS
  'Phase 48 / 48-13 (JORN-19, D-10): varredura diaria (job pg_cron prazo-reabertura-sweep, '
  '11:00 UTC) das candidaturas REABERTAS apos revisao (Art. 20) cujo prazo de 10 dias corridos '
  'venceu sem nova decisao. SO ALERTA o RH: posta ids-only (evento prazo_reabertura_vencido, '
  'candidatura_id, ciclo = epoch de prazo_nova_decisao_em) para a EF notificar-rh e grava '
  'decisao_final.alerta_prazo_enviado_em — um alerta por ciclo (a nova decisao zera o ciclo). '
  'NUNCA decide: nao escreve em candidaturas, nao aprova nem rejeita (D-10, D-01, RNF-07a). '
  'em_espera registrado na reabertura nao conta como nova decisao (A5) e nao impede o alerta. '
  'Candidatura excluida ou encerrada (candidatura_encerrada) nao gera alerta. Devolve quantas '
  'alertou. SECURITY DEFINER, search_path vazio, EXECUTE revogado de PUBLIC/anon/authenticated '
  '(chamada so pelo pg_cron, como o dono).';


-- =============================================================================
-- BLOCO E — o job diário
-- =============================================================================
-- 11:00 UTC = 08:00 em America/Sao_Paulo (sem horário de verão desde 2019): o alerta chega no
-- começo do expediente do dia seguinte ao vencimento (o prazo vence às 00:00 de SP).
-- Unschedule-guard antes do schedule, no idioma de `20260823000012`: reaplicar não duplica.

SELECT cron.unschedule('prazo-reabertura-sweep')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prazo-reabertura-sweep');

SELECT cron.schedule(
  'prazo-reabertura-sweep',
  '0 11 * * *',
  $sweep$ SELECT public.varrer_prazos_reabertura(); $sweep$
);


-- =============================================================================
-- PÓS-PORTÃO — o estado que esta migration promete, conferido no catálogo instalado
-- =============================================================================
DO $pos$
DECLARE
  v_classe   text;
  v_retry    text;
  v_varre    text;
  v_secdef   boolean;
  v_n_job    int;
  v_sched    text;
  v_cmd      text;
  v_active   boolean;
  c_fragmento constant text := '       -- 48-13 · a terceira clausula: prazo_reabertura_vencido e o TERCEIRO evento
       -- consumido pela EF do RH (o alerta de prazo de nova decisao vencido, JORN-19).
       -- Igualdade, pela mesma razao da segunda. Sem ela, uma falha desse alerta seria
       -- re-postada contra a EF do candidato a cada 15 minutos, para sempre (T-42-23).
       AND evento <> ''prazo_reabertura_vencido''
';
BEGIN
  -- (1)+(2) o evento no CHECK já foi conferido no BLOCO A; a classe:
  SELECT classe INTO v_classe
    FROM public.classe_evento_notificacao WHERE evento = 'prazo_reabertura_vencido';
  IF v_classe IS DISTINCT FROM 'interno' THEN
    RAISE EXCEPTION 'P48-13 POS: classe de prazo_reabertura_vencido = % (esperado interno)', coalesce(v_classe, '<ausente>');
  END IF;

  -- (4) a exclusão nova E as antigas; e a mudança é SÓ o fragmento.
  SELECT prosrc INTO v_retry FROM pg_proc
   WHERE oid = 'public.varrer_retry_notificacoes()'::regprocedure;
  IF position('AND evento <> ''prazo_reabertura_vencido''' IN v_retry) = 0
     OR position('AND evento <> ''candidatura_encerrada_a_pedido''' IN v_retry) = 0
     OR position('AND evento NOT LIKE ''revisao\_solicitada%''' IN v_retry) = 0 THEN
    RAISE EXCEPTION 'P48-13 POS: varrer_retry_notificacoes perdeu uma das tres clausulas de exclusao de evento de RH';
  END IF;
  IF md5(replace(v_retry, c_fragmento, '')) IS DISTINCT FROM '06fd990e6706451f46d7bf6625163bdf' THEN
    RAISE EXCEPTION 'P48-13 POS: varrer_retry_notificacoes mudou ALEM do fragmento da clausula nova (md5 sem o fragmento = %)', md5(replace(v_retry, c_fragmento, ''));
  END IF;
  IF md5(v_retry) IS DISTINCT FROM '14d8d5cb6613332c3d05176a8b82602d' THEN
    RAISE EXCEPTION 'P48-13 POS: corpo instalado de varrer_retry_notificacoes tem md5 %, esperado 14d8d5cb6613332c3d05176a8b82602d', md5(v_retry);
  END IF;

  -- a varredura: DEFINER, sem EXECUTE para anon/authenticated, e sem decidir nada.
  SELECT prosrc, prosecdef INTO v_varre, v_secdef FROM pg_proc
   WHERE oid = 'public.varrer_prazos_reabertura()'::regprocedure;
  IF v_secdef IS NOT TRUE THEN
    RAISE EXCEPTION 'P48-13 POS: varrer_prazos_reabertura nao e SECURITY DEFINER';
  END IF;
  IF has_function_privilege('authenticated', 'public.varrer_prazos_reabertura()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.varrer_prazos_reabertura()', 'EXECUTE') THEN
    RAISE EXCEPTION 'P48-13 POS: anon/authenticated ainda tem EXECUTE em varrer_prazos_reabertura (T-48-13-01)';
  END IF;
  IF v_varre ~* 'update\s+public\.candidaturas' OR v_varre ~* 'registrar_decisao'
     OR v_varre ~* 'insert\s+into' OR v_varre ~* 'delete\s+from' THEN
    RAISE EXCEPTION 'P48-13 POS: varrer_prazos_reabertura escreve alem de alerta_prazo_enviado_em — o vencimento NAO pode decidir (D-10)';
  END IF;
  IF position('/functions/v1/notificar-rh' IN v_varre) = 0
     OR position('edge_invoke_key' IN v_varre) = 0
     OR position('alerta_prazo_enviado_em IS NULL' IN v_varre) = 0
     OR position('public.candidatura_encerrada(' IN v_varre) = 0 THEN
    RAISE EXCEPTION 'P48-13 POS: varrer_prazos_reabertura instalada sem destino, Bearer do Vault, idempotencia ou filtro de encerramento';
  END IF;

  -- o job.
  SELECT count(*), max(schedule), max(command), bool_and(active)
    INTO v_n_job, v_sched, v_cmd, v_active
    FROM cron.job WHERE jobname = 'prazo-reabertura-sweep';
  IF v_n_job <> 1 OR v_sched IS DISTINCT FROM '0 11 * * *' OR v_active IS NOT TRUE
     OR position('public.varrer_prazos_reabertura()' IN v_cmd) = 0 THEN
    RAISE EXCEPTION 'P48-13 POS: job prazo-reabertura-sweep ausente/duplicado/inativo ou com horario/comando errado (n=%, sched=%, ativo=%)', v_n_job, v_sched, v_active;
  END IF;
END
$pos$;
