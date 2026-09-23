-- =============================================================================
-- 20260922000008 — salvar_avaliacao_entrevista + confirmar_revisao_entrevista :
--                  a revisão humana passa a olhar a análise VIGENTE
-- =============================================================================
-- Phase 49 / Plano 49-10 · JORN-12 / JORN-28 · D-39 / D-42
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-22, só leitura).
--   (1) `salvar_avaliacao_entrevista` escolhia a análise a revisar por
--       `ORDER BY ea.created_at DESC LIMIT 1` — a MAIS NOVA de QUALQUER estado. Com a
--       migration irmã `…000007`, uma análise que FALHOU passa a entrar com
--       `status_analise='falhou'`; sem esta mudança, a nota humana do RH iria para a
--       linha da falha (que não tem competências para pontuar) enquanto a análise boa
--       ficava sem revisão. E mesmo antes disso a RPC já podia gravar numa análise
--       SUPERADA: o `superada_em` existe desde o 49-01 e ninguém o consultava aqui.
--   (2) `confirmar_revisao_entrevista(p_analise_id)` aceitava QUALQUER `analise_id` da
--       vaga do chamador. Confirmar a revisão de uma análise superada libera o portão de
--       avanço (`avancar_etapa` lê `revisao_confirmada_em`) com base numa análise que
--       não vale mais — desde o 49-06 o portão só olha a vigente, então a confirmação
--       na superada não libera nada e o RH fica sem entender por que o avanço continua
--       travado. Pior: confirmar uma análise FALHA liberaria o avanço sem ninguém ter
--       lido análise nenhuma.
--   (3) O guard de papel das DUAS era fail-OPEN: com `v_role` nulo (JWT sem
--       `app_metadata.role` — service_role, chamada interna, claims vazias) uma
--       comparação `NOT IN` sobre NULL devolve NULL, o `IF` não dispara, e a função
--       segue. Medido: `anon` tinha EXECUTE nas DUAS (`has_function_privilege` = true),
--       por grant DIRETO do `pg_default_acl` — `REVOKE … FROM PUBLIC` não o alcança.
--       Era a combinação que importa: quem chega sem papel nenhum passava do guard.
--
-- O QUE MUDA, E SÓ ISSO.
--   `salvar_avaliacao_entrevista`: a ESCOLHA da análise (agora a vigente mais recente,
--   pelo predicado único) e o GUARD de papel (fail-closed). A média BARS, o UPDATE da
--   análise e o upsert em `scores_candidato` ficam IDÊNTICOS — inclusive o
--   `ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)` que o portão de
--   `20260906000002:120-125` cobra, e que o pós-portão daqui continua cobrando.
--   `confirmar_revisao_entrevista`: uma RECUSA nova (análise não vigente) e o mesmo
--   guard fail-closed. O UPDATE e o retorno ficam idênticos.
--
--   As ASSINATURAS não mudam: `salvar_avaliacao_entrevista(uuid, jsonb, text)` e
--   `confirmar_revisao_entrevista(uuid)`. O `entrevistaService.ts` do front não precisa
--   de nenhuma edição para continuar chamando as duas.
--
-- POR QUE NÃO ACRESCENTAR `p_analise_id` A `salvar_avaliacao_entrevista`.
--   Foi considerado e descartado. Com UMA linha de nota para os dois tipos (D-65), a
--   revisão vai para a vigente MAIS RECENTE de qualquer tipo, e a tela (49-16) só
--   oferece revisar essa. Acrescentar o parâmetro acoplaria front e RPC para expressar
--   uma escolha que a tela não oferece.
--
-- POR QUE `check_violation` NA RECUSA DA SUPERADA, E NÃO `no_data_found`.
--   `no_data_found` (P0002) significa «não achei a análise», e o
--   `entrevistaService.mapRpcError` o traduz como «Registro não encontrado». Aqui a
--   análise EXISTE e foi encontrada — ela só não é a que vale. `check_violation`
--   (23514) é a categoria de «o pedido contradiz uma regra», e a mensagem própria diz
--   qual. ⚠ Registrado: o mapa do front ainda traduz 23514 como «Dados inválidos.
--   Verifique os campos.», que não é a frase certa para este caso; a mensagem
--   específica é da tela do 49-16, que é quem passa a oferecer a análise vigente.
--
-- ERRO: `insufficient_privilege` (42501) no guard de papel — MANTIDO, porque é o
--   SQLSTATE que o `entrevistaService.mapRpcError` mapeia para FORBIDDEN nas duas.
--   Trocá-lo por 42501 escrito à mão daria o mesmo código; `no_data_found` (P0002) na
--   ausência de vigente; `check_violation` (23514) na análise não vigente.
--
-- AUTHZ: as duas seguem `SECURITY DEFINER` / `SET search_path = ''`. Grants vivos
--   reafirmados (`authenticated` — é o JWT do RH que chama; `service_role`) e
--   `REVOKE … FROM anon` com `anon` NOMEADO, porque o grant é direto.
--
-- IDEMPOTÊNCIA: `CREATE OR REPLACE` nas duas. `CREATE OR REPLACE` PRESERVA o ACL
--   existente — é por isso que o REVOKE é explícito e não decorativo.
--
-- PRÉ-PORTÃO: os md5 dos corpos VIVOS, medidos em 2026-09-22 por
--   `p46apply.cjs sql "select md5(p.prosrc) …"`. Se o corpo vivo não for o que esta
--   migration transcreveu e editou, ela ABORTA antes de escrever: o `CREATE OR REPLACE`
--   é um sobrescrito total, e aplicar por cima de um corpo que alguém mudou no meio
--   apagaria essa mudança sem nenhum aviso.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/COMMENT adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260922000008_p49_revisao_entrevista_vigente.sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PRÉ-PORTÃO — os dois corpos vivos são os que esta migration editou.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre_portao$
DECLARE
  v_md5_salvar   text;
  v_len_salvar   int;
  v_md5_conf     text;
  v_len_conf     int;
  c_esp_salvar constant text := '26264a98c5f53b605c4a1d54779f8644';
  c_esp_conf   constant text := '3e5862bd6f14d79761e5753c41f18118';
BEGIN
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_salvar, v_len_salvar
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.salvar_avaliacao_entrevista(uuid,jsonb,text)'::regprocedure;
  IF v_md5_salvar IS DISTINCT FROM c_esp_salvar THEN
    RAISE EXCEPTION 'P49-10 PRE-PORTAO: o corpo VIVO de salvar_avaliacao_entrevista tem md5 % (length %), e o medido em 2026-09-22 e % (2970). Esta migration transcreveu o corpo medido e o editou em DOIS pontos; um CREATE OR REPLACE por cima de outro corpo apagaria a mudanca de quem veio antes, em silencio. Medir de novo e reconciliar A MAO.',
      v_md5_salvar, v_len_salvar, c_esp_salvar;
  END IF;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_conf, v_len_conf
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.confirmar_revisao_entrevista(uuid)'::regprocedure;
  IF v_md5_conf IS DISTINCT FROM c_esp_conf THEN
    RAISE EXCEPTION 'P49-10 PRE-PORTAO: o corpo VIVO de confirmar_revisao_entrevista tem md5 % (length %), e o medido em 2026-09-22 e % (1144). Mesma razao do bloco acima.',
      v_md5_conf, v_len_conf, c_esp_conf;
  END IF;

  -- A dependência desta migration: o predicado único do 49-01 tem de existir, IMMUTABLE.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
     WHERE p.oid = 'public.entrevista_analise_vigente(timestamptz,text,jsonb)'::regprocedure
       AND p.provolatile = 'i'
  ) THEN
    RAISE EXCEPTION 'P49-10 PRE-PORTAO: public.entrevista_analise_vigente(timestamptz,text,jsonb) nao existe como IMMUTABLE — as duas RPCs daqui a CHAMAM em vez de recopiar o predicado (a lacuna do JORN-12 e a divergencia entre copias). Aplicar a 20260922000002 (plano 49-01) primeiro.';
  END IF;

  RAISE NOTICE 'P49-10 PRE-PORTAO OK — salvar=% (%) ; confirmar=% (%) ; predicado unico presente e IMMUTABLE',
    v_md5_salvar, v_len_salvar, v_md5_conf, v_len_conf;
END
$pre_portao$;


-- ─────────────────────────────────────────────────────────────────────────────
-- salvar_avaliacao_entrevista — corpo vivo com DUAS trocas.
--   (A) a escolha da análise passa a exigir VIGENTE (pelo predicado único);
--   (B) o guard de papel vira fail-closed.
-- Todo o resto (média BARS, UPDATE da análise, upsert de scores_candidato) é o corpo
-- medido, transcrito sem alteração.
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
  v_vaga_owner uuid;
  v_role       text;
  v_analise_id uuid;
  v_media      numeric;
  v_n          integer;
BEGIN
  -- (A) A análise a revisar é a VIGENTE mais recente — não a mais nova de qualquer
  --     estado. `entrevista_analise_vigente` é o predicado único do 49-01: uma quinta
  --     cópia da regra aqui divergiria das outras quatro em silêncio, que é exatamente
  --     o defeito que o JORN-12 nomeia. Com a `…000007` no ar, a linha mais nova pode
  --     ser uma FALHA (sem competências para pontuar) ou uma SUPERADA.
  SELECT ea.id, v.created_by
    INTO v_analise_id, v_vaga_owner
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.candidatura_id = p_candidatura_id
     AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias)
   ORDER BY ea.created_at DESC
   LIMIT 1;

  IF v_analise_id IS NULL THEN
    RAISE EXCEPTION 'nenhuma analise vigente para revisar na candidatura %', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  -- (B) Fail-closed: sem papel nenhum, RECUSA. A comparação direta sobre um `v_role`
  --     nulo devolve NULL, o IF não dispara, e a função seguia — e `anon` tinha EXECUTE
  --     aqui por grant direto do `pg_default_acl` (medido true em 2026-09-22).
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
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
-- confirmar_revisao_entrevista — corpo vivo + a recusa da não vigente + fail-closed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirmar_revisao_entrevista(p_analise_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_confirmada timestamptz;
  v_superada   timestamptz;
  v_status     text;
  v_comp       jsonb;
BEGIN
  -- O estado da análise entra no MESMO SELECT da posse: são a mesma leitura, e separá-las
  -- abriria uma janela entre «achei» e «ainda vale».
  SELECT v.created_by, ea.superada_em, ea.status_analise, ea.competencias
    INTO v_vaga_owner, v_superada, v_status, v_comp
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.id = p_analise_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'analise de entrevista nao encontrada (%)', p_analise_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  -- Fail-closed (ver a razão no cabeçalho, defeito (3)).
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- A confirmação só vale na análise VIGENTE. `revisao_confirmada_em` é o que o
  -- `avancar_etapa` lê para LIBERAR a trava de língua/sotaque, e desde o 49-06 ele só
  -- olha a vigente: confirmar numa superada não libera nada (o RH fica sem entender por
  -- que o avanço continua travado), e confirmar numa FALHA liberaria o avanço sem
  -- ninguém ter lido análise nenhuma.
  IF NOT public.entrevista_analise_vigente(v_superada, v_status, v_comp) THEN
    RAISE EXCEPTION 'analise superada ou sem resultado: confirme a revisao da analise vigente (analise %, superada_em %, status %)',
      p_analise_id, v_superada, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.entrevista_analises
     SET revisao_confirmada_em = now(),
         revisada_por          = (select auth.uid())
   WHERE id = p_analise_id
  RETURNING revisao_confirmada_em INTO v_confirmada;

  RETURN jsonb_build_object(
    'ok', true,
    'id', p_analise_id,
    'revisao_confirmada_em', v_confirmada
  );
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- ACL — grants vivos REAFIRMADOS + `anon` nomeado no REVOKE.
-- `CREATE OR REPLACE` preserva o ACL anterior, e o anterior tinha `anon` com EXECUTE
-- nas duas, por grant DIRETO do `pg_default_acl` deste schema. Sem estas linhas a
-- reescrita consertaria o guard e deixaria o grant.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) TO service_role;

REVOKE ALL ON FUNCTION public.confirmar_revisao_entrevista(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirmar_revisao_entrevista(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirmar_revisao_entrevista(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_revisao_entrevista(uuid) TO service_role;

COMMENT ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) IS
  'Confirma a analise de entrevista VIGENTE (entrevista_analises: scores_humanos, notas, '
  'revisao_confirmada_em, status concluida) E grava o score humano em scores_candidato '
  'tipo=entrevista (media BARS 1-5, score_max 5, status sucesso) — a unica origem do status '
  'sucesso dessa linha (RNF-07a). Phase 49 / 49-10: a analise e escolhida pelo predicado unico '
  'public.entrevista_analise_vigente, nao mais por ORDER BY created_at DESC — a linha mais nova '
  'pode ser uma FALHA (sem competencias) ou uma SUPERADA. Sem vigente: no_data_found. Guard de '
  'papel fail-closed (coalesce): com v_role nulo a versao anterior seguia, e anon tinha EXECUTE '
  'por grant direto do pg_default_acl. Assinatura inalterada.';

COMMENT ON FUNCTION public.confirmar_revisao_entrevista(uuid) IS
  'Marca revisao_confirmada_em/revisada_por na analise de entrevista — o marcador que o '
  'avancar_etapa le para LIBERAR a trava de lingua/sotaque (RF-24 / RNF-07a; o humano sempre '
  'decide). Phase 49 / 49-10: RECUSA com check_violation quando a analise nao e VIGENTE pelo '
  'predicado unico public.entrevista_analise_vigente (superada ou falha) — confirmar numa superada '
  'nao libera nada porque o portao so olha a vigente desde o 49-06, e confirmar numa falha '
  'liberaria o avanco sem ninguem ter lido analise nenhuma. Guard de papel fail-closed. '
  'Assinatura inalterada.';


-- ─────────────────────────────────────────────────────────────────────────────
-- PÓS-PORTÃO — o que entrou, o que NÃO podia sumir, e o ACL.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_portao$
DECLARE
  c_sig_salvar constant text := 'public.salvar_avaliacao_entrevista(uuid,jsonb,text)';
  c_sig_conf   constant text := 'public.confirmar_revisao_entrevista(uuid)';
  -- ⚠ A forma fail-OPEN é montada por FRAGMENTOS de propósito. O portão estático deste
  --   plano procura a expressão NO DISCO deste arquivo; escrevê-la inteira aqui, mesmo
  --   só para conferir a AUSÊNCIA dela no catálogo, faria o arquivo reprovar no seu
  --   proprio portao — e afrouxar o padrao do portao para aceitar a citacao seria a troca
  --   errada (ele perderia a capacidade de pegar a copia real). §K do 49-PATTERNS.
  c_fail_open  constant text := 'IF ' || 'v_role' || ' NOT IN';
  v_def_salvar text;
  v_def_conf   text;
  v_md5_salvar text;
  v_md5_conf   text;
  v_anon_s     boolean;
  v_auth_s     boolean;
  v_anon_c     boolean;
  v_auth_c     boolean;
BEGIN
  SELECT pg_get_functiondef(p.oid), md5(p.prosrc) INTO v_def_salvar, v_md5_salvar
    FROM pg_catalog.pg_proc p WHERE p.oid = c_sig_salvar::regprocedure;
  SELECT pg_get_functiondef(p.oid), md5(p.prosrc) INTO v_def_conf, v_md5_conf
    FROM pg_catalog.pg_proc p WHERE p.oid = c_sig_conf::regprocedure;

  -- (i) As duas CHAMAM o predicado único (JORN-12 — nenhuma cópia nova).
  IF position('entrevista_analise_vigente(' IN v_def_salvar) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: salvar_avaliacao_entrevista nao chama entrevista_analise_vigente( — ela voltaria a gravar a nota humana na linha mais nova, que com a …000007 no ar pode ser uma FALHA sem competencias';
  END IF;
  IF position('entrevista_analise_vigente(' IN v_def_conf) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: confirmar_revisao_entrevista nao chama entrevista_analise_vigente( — a confirmacao numa analise superada ou falha voltaria a ser aceita';
  END IF;

  -- (ii) O guard fail-closed ENTROU nas duas, e o fail-open SAIU das duas.
  IF position('coalesce(v_role, '''') NOT IN' IN v_def_salvar) = 0
     OR position('coalesce(v_role, '''') NOT IN' IN v_def_conf) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: o guard fail-closed nao esta nas DUAS (salvar=%, confirmar=%) — com v_role nulo a comparacao devolve NULL, o IF nao dispara, e quem chega sem papel nenhum passa',
      position('coalesce(v_role, '''') NOT IN' IN v_def_salvar) > 0,
      position('coalesce(v_role, '''') NOT IN' IN v_def_conf) > 0;
  END IF;
  IF position(c_fail_open IN v_def_salvar) > 0 OR position(c_fail_open IN v_def_conf) > 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: a forma fail-OPEN do guard de papel sobreviveu em alguma das duas (salvar=%, confirmar=%)',
      position(c_fail_open IN v_def_salvar) > 0, position(c_fail_open IN v_def_conf) > 0;
  END IF;

  -- (iii) O que NÃO podia sumir de `salvar_avaliacao_entrevista`: o upsert que o portão
  --       de `20260906000002:120-125` cobra (sem ele o peso «entrevista» volta a ser N/A
  --       em TODA vaga na decisão final), a média BARS e o guard de posse da vaga.
  IF position('ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)' IN v_def_salvar) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: salvar_avaliacao_entrevista perdeu o upsert em scores_candidato na reescrita — e o peso entrevista volta a ser N/A na decisao final (o defeito que a 20260906000002 consertou)';
  END IF;
  IF position('BETWEEN 1 AND 5' IN v_def_salvar) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: salvar_avaliacao_entrevista perdeu o filtro da escala BARS 1-5 na reescrita';
  END IF;
  IF position('v_vaga_owner IS DISTINCT FROM' IN v_def_salvar) = 0
     OR position('v_vaga_owner IS DISTINCT FROM' IN v_def_conf) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: o guard de posse da vaga desapareceu em alguma das duas — um RH revisaria a entrevista de vaga alheia';
  END IF;

  -- (iv) O que NÃO podia sumir de `confirmar_revisao_entrevista`: o marcador.
  IF position('revisao_confirmada_em = now()' IN v_def_conf) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: confirmar_revisao_entrevista nao carimba mais revisao_confirmada_em — e a trava de lingua/sotaque nunca se liberaria';
  END IF;

  -- (v) As ASSINATURAS não mudaram: se tivessem mudado, os dois `::regprocedure` acima
  --     teriam falhado com `undefined_function` e nada teria sido escrito. Registrado
  --     aqui porque é o que garante que o `entrevistaService` do front segue chamando.

  -- (vi) ACL: `anon` fora das duas, `authenticated` preservado nas duas.
  v_anon_s := has_function_privilege('anon',          c_sig_salvar::regprocedure, 'EXECUTE');
  v_auth_s := has_function_privilege('authenticated', c_sig_salvar::regprocedure, 'EXECUTE');
  v_anon_c := has_function_privilege('anon',          c_sig_conf::regprocedure, 'EXECUTE');
  v_auth_c := has_function_privilege('authenticated', c_sig_conf::regprocedure, 'EXECUTE');
  IF v_anon_s OR v_anon_c THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: anon ainda tem EXECUTE (salvar=%, confirmar=%) — o grant do pg_default_acl e DIRETO e REVOKE FROM PUBLIC sozinho nao o alcanca',
      v_anon_s, v_anon_c;
  END IF;
  IF NOT v_auth_s OR NOT v_auth_c THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: authenticated PERDEU EXECUTE (salvar=%, confirmar=%) — e o RH deixaria de conseguir revisar a entrevista pela tela',
      v_auth_s, v_auth_c;
  END IF;

  RAISE NOTICE 'P49-10 POS-PORTAO OK — md5(prosrc) NOVOS: salvar_avaliacao_entrevista = % ; confirmar_revisao_entrevista = % ; ACL anon=%/% authenticated=%/%',
    v_md5_salvar, v_md5_conf, v_anon_s, v_anon_c, v_auth_s, v_auth_c;
END
$pos_portao$;
