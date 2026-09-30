-- =============================================================================
-- 20260929000003 — salvar_avaliacao_entrevista : a revisão humana grava na análise
--                  que o CLIENTE nomeia por id, não na «vigente mais recente»
-- =============================================================================
-- Phase 49 / Plano 49-30 · JORN-12 · D-39 · gap CR-03 (49-VERIFICATION, verdade 6)
--
-- O QUE ESTAVA ERRADO.
--   O 49-10 tornou a vigência de `entrevista_analises` POR `(candidatura, tipo)`: online e
--   presencial podem ter UMA vigente CADA. `salvar_avaliacao_entrevista(uuid, jsonb, text)`
--   (20260922000008:153-161) continuou no singular — escolhia a análise a revisar por
--   `ORDER BY ea.created_at DESC LIMIT 1` sobre as vigentes dos DOIS tipos. Com a online
--   bandeirada (mais antiga) e a presencial mais nova, a nota humana do RH ia para a
--   presencial em silêncio, e a tela não dizia qual (CR-03 do 49-REVIEW).
--
--   O cabeçalho do 20260922000008 registra a decisão de NÃO acrescentar `p_analise_id`:
--   «a revisão vai para a vigente MAIS RECENTE de qualquer tipo, e a tela só oferece revisar
--   essa». Aquela decisão valia para UMA vigente por candidatura; o próprio 49-10 tornou a
--   vigente PLURAL, e o plural a tornou errada — é ela que esta migration reverte.
--
--   Medido em 2026-09-29 (só leitura): ZERO candidaturas com mais de uma vigente. O defeito
--   é latente; nenhuma nota foi gravada na análise errada; não há escrita retroativa.
--
-- O QUE MUDA, E SÓ ISSO.
--   (1) Assinatura NOVA `salvar_avaliacao_entrevista(p_candidatura_id uuid, p_analise_id uuid,
--       p_scores_humanos jsonb, p_notas text)` — a PRIMÁRIA. Corpo = o corpo vivo
--       (md5 2b567aaa…, 3748 caracteres) transcrito com a ESCOLHA da análise trocada:
--         `ea.id = p_analise_id AND ea.candidatura_id = p_candidatura_id`
--       — sem a segunda condição, um RH dono da vaga de A gravaria nota numa análise de B
--       (IDOR: SECURITY DEFINER ignora RLS, o corpo é o único controle). Não achou ⇒
--       `no_data_found`; achou e não é vigente pelo predicado único ⇒ `check_violation`, no
--       molde da recusa do `confirmar_revisao_entrevista` e na MESMA posição (depois dos
--       guards de papel e de posse). A seleção leva `FOR UPDATE OF ea`: entre «é vigente» e
--       o UPDATE, um `registrar_analise_entrevista` concorrente poderia superá-la; com o lock
--       ele espera. Guard fail-closed, posse da vaga, `notas_humanas obrigatorias`, média
--       BARS `BETWEEN 1 AND 5`, UPDATE da análise e upsert `ON CONFLICT (candidatura_id,
--       tipo, subtipo, pergunta_id)` IDÊNTICOS — D-65: continua UMA linha de nota para os
--       dois tipos, e `metadata.analise_id` diz de qual análise ela veio.
--       ⚠ A obrigatoriedade das notas NÃO muda aqui: a divergência cliente/servidor dela é
--       o JORN-47, do Bloco 3.
--       SEM DEFAULT em parâmetro nenhum: um DEFAULT faria a chamada de três chaves do
--       PostgREST casar com as DUAS sobrecargas.
--   (2) Assinatura ANTIGA `(uuid, jsonb, text)`, por `CREATE OR REPLACE`: fica (um cliente
--       com bundle antigo em cache continua funcionando no caso comum), mas DEIXA DE
--       ESCOLHER. Ordem: guard de papel fail-closed PRIMEIRO (a (h) do
--       `p49_analise_vigente_smoke` chama sem claims com duas vigentes e espera 42501);
--       posse da vaga; depois conta as vigentes da candidatura pelo predicado único —
--       0 ⇒ `no_data_found`; mais de 1 ⇒ `check_violation` pedindo que se informe a análise;
--       exatamente 1 ⇒ DELEGA à assinatura nova com o id dela (um corpo só — D-21 «reusar,
--       não recriar»). A posse vem ANTES da contagem para que um RH de outra vaga receba
--       42501 e não aprenda quantas vigentes a candidatura alheia tem.
--
-- ERRO: `insufficient_privilege` (42501) nos guards (→ FORBIDDEN no `mapRpcError` do front);
--   `no_data_found` (P0002) na análise inexistente ou de outra candidatura, e na ausência de
--   vigente; `check_violation` (23514) na análise não vigente e na ambiguidade.
--
-- AUTHZ: as duas `SECURITY DEFINER` / `SET search_path = ''`. ACL das DUAS: `REVOKE ALL …
--   FROM PUBLIC`, `REVOKE ALL … FROM anon` com `anon` NOMEADO (a função nova nasce com EXECUTE
--   direto para `anon` pelo `pg_default_acl`; `REVOKE FROM PUBLIC` não o alcança), `GRANT
--   EXECUTE` a `authenticated` (é o JWT do RH que chama) e a `service_role`.
--
-- IDEMPOTÊNCIA: `CREATE OR REPLACE` nas duas; o pré-portão exige que a nova NÃO exista, então
--   reaplicar por cima de si mesma aborta em vez de sobrescrever em silêncio.
--
-- PRÉ-PORTÃO: md5(prosrc) vivo da antiga = `2b567aaa530fc32da4b074c7776d62ec` (medido em
--   2026-09-29 — o do pós-portão do 49-10); a nova ainda não existe; o predicado único existe
--   `IMMUTABLE`. Qualquer divergência aborta antes de escrever.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/COMMENT adjacentes é a forma exata do 42601, e o endpoint já roda a requisição
-- inteira numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260929000003_p49_salvar_avaliacao_por_analise.sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PRÉ-PORTÃO — o corpo vivo é o que esta migration transcreveu; a nova não existe.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre_portao$
DECLARE
  v_md5 text;
  v_len int;
  c_esp constant text := '2b567aaa530fc32da4b074c7776d62ec';
BEGIN
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.salvar_avaliacao_entrevista(uuid,jsonb,text)'::regprocedure;
  IF v_md5 IS DISTINCT FROM c_esp THEN
    RAISE EXCEPTION 'P49-30 PRE-PORTAO: o corpo VIVO de salvar_avaliacao_entrevista(uuid,jsonb,text) tem md5 % (length %), e o medido em 2026-09-29 e % (3748). Esta migration transcreveu o corpo medido para a assinatura nova; um corpo diferente significa uma mudanca que ela apagaria em silencio. Medir de novo e reconciliar A MAO.',
      v_md5, v_len, c_esp;
  END IF;

  IF to_regprocedure('public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'P49-30 PRE-PORTAO: public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text) JA existe — esta migration a cria; reaplicar por cima sobrescreveria um corpo que ninguem mediu.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
     WHERE p.oid = 'public.entrevista_analise_vigente(timestamptz,text,jsonb)'::regprocedure
       AND p.provolatile = 'i'
  ) THEN
    RAISE EXCEPTION 'P49-30 PRE-PORTAO: public.entrevista_analise_vigente(timestamptz,text,jsonb) nao existe como IMMUTABLE — as duas assinaturas daqui a CHAMAM em vez de recopiar o predicado.';
  END IF;

  RAISE NOTICE 'P49-30 PRE-PORTAO OK — salvar(uuid,jsonb,text) = % (%) ; assinatura nova ausente ; predicado unico IMMUTABLE',
    v_md5, v_len;
END
$pre_portao$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (1) salvar_avaliacao_entrevista(uuid, uuid, jsonb, text) — a PRIMÁRIA.
--     Corpo vivo transcrito; a troca é a ESCOLHA da análise (por id, da candidatura,
--     vigente). Todo o resto é o corpo medido.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(
  p_candidatura_id uuid,
  p_analise_id uuid,
  p_scores_humanos jsonb,
  p_notas text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_analise_id uuid;
  v_superada   timestamptz;
  v_status     text;
  v_comp       jsonb;
  v_media      numeric;
  v_n          integer;
BEGIN
  -- A análise a revisar é a que o CLIENTE nomeia — a que a tela mostra (D-39). A condição
  -- de candidatura fecha o IDOR: SECURITY DEFINER ignora RLS, e sem ela um RH dono da vaga
  -- de A gravaria nota numa análise de B. O estado entra no MESMO SELECT (e sob lock) para
  -- não abrir janela entre «é vigente» e o UPDATE.
  SELECT ea.id, v.created_by, ea.superada_em, ea.status_analise, ea.competencias
    INTO v_analise_id, v_vaga_owner, v_superada, v_status, v_comp
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.id = p_analise_id
     AND ea.candidatura_id = p_candidatura_id
     FOR UPDATE OF ea;

  IF v_analise_id IS NULL THEN
    RAISE EXCEPTION 'analise de entrevista % nao encontrada na candidatura %', p_analise_id, p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  -- Fail-closed: sem papel nenhum, RECUSA (a comparação direta sobre um v_role nulo
  -- devolve NULL e o IF não dispara).
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- A nota humana só vale na análise VIGENTE (predicado único do 49-01): numa SUPERADA ela
  -- revisaria um texto que não vale mais; numa FALHA não há competências para pontuar.
  IF NOT public.entrevista_analise_vigente(v_superada, v_status, v_comp) THEN
    RAISE EXCEPTION 'analise superada ou sem resultado: a avaliacao so pode ser registrada na analise vigente (analise %, superada_em %, status %)',
      p_analise_id, v_superada, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_notas IS NULL OR length(btrim(p_notas)) = 0 THEN
    RAISE EXCEPTION 'notas_humanas obrigatorias' USING ERRCODE = 'check_violation';
  END IF;

  -- Média das notas humanas (BARS 1–5). Só valores numéricos contam; um objeto sem
  -- nenhuma nota numérica é erro de contrato do cliente, não um score zero.
  SELECT avg(kv.v::numeric), count(*)
    INTO v_media, v_n
    FROM jsonb_each_text(coalesce(p_scores_humanos, '{}'::jsonb)) AS kv(k, v)
   WHERE kv.v ~ '^[0-9]+(\.[0-9]+)?$'
     AND kv.v::numeric BETWEEN 1 AND 5;

  IF coalesce(v_n, 0) = 0 THEN
    RAISE EXCEPTION 'scores_humanos sem notas numericas entre 1 e 5' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.entrevista_analises
     SET scores_humanos        = p_scores_humanos,
         notas_humanas         = p_notas,
         revisao_confirmada_em = now(),
         revisada_por          = (select auth.uid()),
         status_analise        = 'concluida'
   WHERE id = v_analise_id;

  -- A linha que o consolidador pondera. status='sucesso' SÓ nasce aqui, pela mão humana
  -- (RNF-07a): a EF de IA deixa pendente_humano e score NULL.
  INSERT INTO public.scores_candidato
    (candidatura_id, tipo, subtipo, pergunta_id, score, score_max, status, metadata)
  VALUES
    (p_candidatura_id, 'entrevista', NULL, NULL, round(v_media, 2), 5, 'sucesso',
     jsonb_build_object(
       'scores_humanos', p_scores_humanos,
       'analise_id', v_analise_id,
       'confirmado_por', (select auth.uid()),
       'fonte', 'salvar_avaliacao_entrevista'))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id) DO UPDATE
    SET score      = EXCLUDED.score,
        score_max  = EXCLUDED.score_max,
        status     = 'sucesso',
        metadata   = public.scores_candidato.metadata || EXCLUDED.metadata,
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'analise_id', v_analise_id,
    'candidatura_id', p_candidatura_id,
    'score_entrevista', round(v_media, 2),
    'score_max', 5);
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (2) salvar_avaliacao_entrevista(uuid, jsonb, text) — compatibilidade que NÃO escolhe.
--     Só age quando o singular é verdade (exatamente uma vigente) e delega à primária.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(
  p_candidatura_id uuid,
  p_scores_humanos jsonb,
  p_notas text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_role       text;
  v_vaga_owner uuid;
  v_n          integer;
  v_analise_id uuid;
BEGIN
  -- Guard de papel PRIMEIRO, fail-closed: quem chega sem papel recebe 42501 antes de
  -- qualquer leitura (inclusive com duas vigentes — p49_analise_vigente_smoke (h)).
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Posse ANTES da contagem: um RH de outra vaga não aprende quantas vigentes há.
  SELECT v.created_by INTO v_vaga_owner
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Quantas vigentes, pelo predicado único. Uma POR TIPO desde o 49-10.
  SELECT count(*), (array_agg(ea.id))[1]
    INTO v_n, v_analise_id
    FROM public.entrevista_analises ea
   WHERE ea.candidatura_id = p_candidatura_id
     AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias);

  IF coalesce(v_n, 0) = 0 THEN
    RAISE EXCEPTION 'nenhuma analise vigente para revisar na candidatura %', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_n > 1 THEN
    RAISE EXCEPTION 'a candidatura % tem % analises de entrevista vigentes: informe a analise que esta sendo avaliada (p_analise_id)',
      p_candidatura_id, v_n
      USING ERRCODE = 'check_violation';
  END IF;

  -- Exatamente uma: o singular é verdade, e a primária faz o resto (um corpo só).
  RETURN public.salvar_avaliacao_entrevista(p_candidatura_id, v_analise_id, p_scores_humanos, p_notas);
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- ACL — as DUAS. `anon` NOMEADO: a nova nasce com EXECUTE direto do `pg_default_acl`;
-- `CREATE OR REPLACE` preserva o ACL da antiga, que é reafirmado.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.salvar_avaliacao_entrevista(uuid, uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.salvar_avaliacao_entrevista(uuid, uuid, jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.salvar_avaliacao_entrevista(uuid, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_avaliacao_entrevista(uuid, uuid, jsonb, text) TO service_role;

REVOKE ALL ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) TO service_role;

COMMENT ON FUNCTION public.salvar_avaliacao_entrevista(uuid, uuid, jsonb, text) IS
  'Registra a avaliacao humana da entrevista NA ANALISE QUE O CLIENTE NOMEIA (p_analise_id): '
  'scores_humanos, notas, revisao_confirmada_em, status concluida; e grava o score humano em '
  'scores_candidato tipo=entrevista (media BARS 1-5, score_max 5, status sucesso, '
  'metadata.analise_id) — a unica origem do status sucesso dessa linha (RNF-07a). Phase 49 / '
  '49-30 (CR-03, D-39): a analise tem de ser DA candidatura (IDOR) e VIGENTE pelo predicado unico '
  'public.entrevista_analise_vigente. Nao achou: no_data_found; nao vigente: check_violation. '
  'Guard de papel fail-closed + posse da vaga. Sem DEFAULT (nao pode casar com a sobrecarga de 3).';

COMMENT ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) IS
  'COMPATIBILIDADE (bundle antigo em cache) — Phase 49 / 49-30: NAO escolhe mais a analise. '
  'Guard de papel fail-closed e posse da vaga primeiro; depois conta as vigentes da candidatura '
  '(uma por tipo desde o 49-10): 0 => no_data_found; mais de 1 => check_violation pedindo '
  'p_analise_id; exatamente 1 => delega a salvar_avaliacao_entrevista(uuid,uuid,jsonb,text). '
  'Antes (20260922000008) escolhia a vigente mais recente entre os dois tipos em silencio (CR-03).';


-- ─────────────────────────────────────────────────────────────────────────────
-- PÓS-PORTÃO — o que entrou, o que NÃO podia sumir, e o ACL das duas.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_portao$
DECLARE
  c_sig_nova   constant text := 'public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)';
  c_sig_antiga constant text := 'public.salvar_avaliacao_entrevista(uuid,jsonb,text)';
  -- ⚠ A forma fail-OPEN é montada por FRAGMENTOS de propósito (PATTERNS §K): o portão
  --   estático deste plano procura a expressão NO DISCO deste arquivo; escrevê-la inteira
  --   aqui, mesmo só para conferir a AUSÊNCIA dela no catálogo, faria o arquivo reprovar no
  --   próprio portão.
  c_fail_open  constant text := 'IF ' || 'v_role' || ' NOT IN';
  c_fail_close constant text := 'coalesce(v_role, '''') NOT IN';
  v_src_n  text;  v_src_a  text;
  v_md5_n  text;  v_md5_a  text;
  v_def_n  int;   v_def_a  int;
  v_anon_n boolean;  v_auth_n boolean;  v_anon_a boolean;  v_auth_a boolean;
BEGIN
  SELECT p.prosrc, md5(p.prosrc), p.pronargdefaults INTO v_src_n, v_md5_n, v_def_n
    FROM pg_catalog.pg_proc p WHERE p.oid = c_sig_nova::regprocedure;
  SELECT p.prosrc, md5(p.prosrc), p.pronargdefaults INTO v_src_a, v_md5_a, v_def_a
    FROM pg_catalog.pg_proc p WHERE p.oid = c_sig_antiga::regprocedure;

  -- (i) As duas CHAMAM o predicado único.
  IF position('entrevista_analise_vigente(' IN v_src_n) = 0
     OR position('entrevista_analise_vigente(' IN v_src_a) = 0 THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: alguma das duas nao chama entrevista_analise_vigente( (nova=%, antiga=%)',
      position('entrevista_analise_vigente(' IN v_src_n) > 0, position('entrevista_analise_vigente(' IN v_src_a) > 0;
  END IF;

  -- (ii) A nova escolhe POR ID e DA CANDIDATURA (IDOR).
  IF position('ea.id = p_analise_id' IN v_src_n) = 0
     OR position('ea.candidatura_id = p_candidatura_id' IN v_src_n) = 0 THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: a assinatura nova nao filtra por ea.id = p_analise_id E ea.candidatura_id = p_candidatura_id — sem a segunda, um RH dono da vaga de A grava nota numa analise de B';
  END IF;

  -- (iii) A antiga NÃO escolhe mais pela mais recente, e DELEGA.
  IF position('ORDER BY ea.created_at DESC' IN v_src_a) > 0 THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: a assinatura antiga ainda ordena por created_at DESC — a escolha silenciosa do CR-03 continua viva';
  END IF;
  IF position('public.salvar_avaliacao_entrevista(p_candidatura_id, v_analise_id' IN v_src_a) = 0 THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: a assinatura antiga nao delega a nova — dois corpos que gravam divergiriam (D-21)';
  END IF;

  -- (iv) Guard fail-closed nas DUAS; fail-open em NENHUMA.
  IF position(c_fail_close IN v_src_n) = 0 OR position(c_fail_close IN v_src_a) = 0 THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: o guard fail-closed nao esta nas DUAS (nova=%, antiga=%)',
      position(c_fail_close IN v_src_n) > 0, position(c_fail_close IN v_src_a) > 0;
  END IF;
  IF position(c_fail_open IN v_src_n) > 0 OR position(c_fail_open IN v_src_a) > 0 THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: a forma fail-OPEN do guard de papel apareceu (nova=%, antiga=%)',
      position(c_fail_open IN v_src_n) > 0, position(c_fail_open IN v_src_a) > 0;
  END IF;

  -- (v) O que NÃO podia sumir da nova: upsert (20260906000002:120-125), BARS, posse.
  IF position('ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)' IN v_src_n) = 0 THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: a assinatura nova perdeu o upsert em scores_candidato — o peso entrevista volta a ser N/A na decisao final';
  END IF;
  IF position('BETWEEN 1 AND 5' IN v_src_n) = 0 THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: a assinatura nova perdeu o filtro da escala BARS 1-5';
  END IF;
  IF position('v_vaga_owner IS DISTINCT FROM' IN v_src_n) = 0
     OR position('v_vaga_owner IS DISTINCT FROM' IN v_src_a) = 0 THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: o guard de posse da vaga falta em alguma das duas — um RH revisaria entrevista de vaga alheia';
  END IF;

  -- (vi) Sem DEFAULT: a chamada de três chaves do PostgREST tem de casar com UMA sobrecarga.
  IF v_def_n IS DISTINCT FROM 0 OR v_def_a IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: parametro com DEFAULT (nova=%, antiga=%) — as duas sobrecargas ficariam ambiguas para o PostgREST', v_def_n, v_def_a;
  END IF;

  -- (vii) ACL das duas.
  v_anon_n := has_function_privilege('anon',          c_sig_nova::regprocedure,   'EXECUTE');
  v_auth_n := has_function_privilege('authenticated', c_sig_nova::regprocedure,   'EXECUTE');
  v_anon_a := has_function_privilege('anon',          c_sig_antiga::regprocedure, 'EXECUTE');
  v_auth_a := has_function_privilege('authenticated', c_sig_antiga::regprocedure, 'EXECUTE');
  IF v_anon_n OR v_anon_a THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: anon tem EXECUTE (nova=%, antiga=%) — o grant do pg_default_acl e DIRETO', v_anon_n, v_anon_a;
  END IF;
  IF NOT v_auth_n OR NOT v_auth_a THEN
    RAISE EXCEPTION 'P49-30 POS-PORTAO: authenticated sem EXECUTE (nova=%, antiga=%) — o RH deixaria de conseguir avaliar pela tela', v_auth_n, v_auth_a;
  END IF;

  RAISE NOTICE 'P49-30 POS-PORTAO OK — md5(prosrc) NOVOS: salvar(uuid,uuid,jsonb,text) = % ; salvar(uuid,jsonb,text) = % ; ACL anon=%/% authenticated=%/%',
    v_md5_n, v_md5_a, v_anon_n, v_anon_a, v_auth_n, v_auth_a;
END
$pos_portao$;
