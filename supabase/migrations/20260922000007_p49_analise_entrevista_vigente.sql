-- =============================================================================
-- 20260922000007 — public.registrar_analise_entrevista :
--                  a análise de entrevista passa a ter DONO e a SUPERAR a anterior
-- =============================================================================
-- Phase 49 / Plano 49-10 · JORN-12 / JORN-28 · D-37..D-42 · D-65
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-22, só leitura).
--   `entrevista_analises` tinha 6 linhas em 3 candidaturas:
--     · 0b1c887b… → 1 (`concluida`)   · a1dd4c42… → 1 (`pendente_humano`)
--     · bf26ee3c… → 4 (`pendente_humano`)
--   Nas SEIS: `tipo` NULL, `texto_hash` NULL, `ai_call_log_id` NULL, `solicitado_por`
--   NULL, `provedor_ia`/`modelo_ia` NULL, `superada_em` NULL. Isto é, a análise não sabia
--   de QUAL entrevista era (online ou presencial), de QUAL texto veio, QUEM a pediu nem
--   QUAL modelo a produziu — e NENHUMA estava marcada como superada, então as 4 de
--   `bf26ee3c…` eram todas «vigentes» ao mesmo tempo.
--   Consequência medida: os leitores DISCORDAM sobre qual análise vale. A tela e a revisão
--   humana pegam `ORDER BY created_at DESC LIMIT 1` (a mais nova de QUALQUER estado — uma
--   que FALHOU vira «a atual»); o portão de avanço olhava TODAS até o 49-06. E reanalisar
--   depois de uma revisão humana criava linha nova, zerando a nota consolidada e fazendo a
--   revisão anterior desaparecer da tela.
--
-- O QUE ESTA MIGRATION FAZ, E SÓ ISSO.
--   Cria `public.registrar_analise_entrevista(...)` — o ÚNICO escritor de
--   `entrevista_analises` a partir da EF de transcrição. Uma transação:
--     (1) lock por `(candidatura, tipo)`;
--     (2) D-40 — reaproveita a análise de SUCESSO com o mesmo `texto_hash` (sem escrever);
--     (3) marca `superada_em = now()` nas VIGENTES do mesmo `(candidatura_id, tipo)`;
--     (4) insere a nova com tipo/autor/hash/vínculo/provedor/modelo;
--     (5) upsert de `scores_candidato` `tipo='entrevista'` com `score` NULL e
--         `status='pendente_humano'` (D-42 — a nota volta a AGUARDAR revisão humana).
--   As duas RPCs de REVISÃO humana (`salvar_avaliacao_entrevista`,
--   `confirmar_revisao_entrevista`) NÃO são tocadas aqui — são da migration irmã
--   `20260922000008` (dono único por migration, §Shared A do 49-PATTERNS).
--
-- POR QUE MARCAR, E NÃO APAGAR (D-02, precedente `20260921000004`).
--   Superar é marcar `superada_em`. A análise superada CONSERVA `scores_humanos`,
--   `notas_humanas`, `revisada_por` e `revisao_confirmada_em`: a revisão que o RH já fez
--   continua legível (a tela é do 49-16). Apagar destruiria trilha de decisão automatizada
--   que o titular tem direito de consultar (LGPD Art. 20).
--
-- POR QUE `entrevista_analise_vigente(...)`, E NÃO O PREDICADO COPIADO.
--   `public.entrevista_analise_vigente(superada_em, status_analise, competencias)` nasceu
--   IMMUTABLE no 49-01 justamente porque a lacuna do JORN-12 é quatro leitores com quatro
--   cópias do mesmo predicado divergindo em silêncio. Esta RPC CHAMA a função; não
--   reescreve a regra. `avancar_etapa` (49-06) já a chama.
--
-- POR QUE UM `pg_advisory_xact_lock`, E NÃO UM ÍNDICE ÚNICO PARCIAL.
--   «uma vigente por (candidatura, tipo)» como índice único parcial seria defesa mais
--   forte — e as 6 linhas antigas o VIOLAM (todas com `tipo` NULL e `superada_em` NULL),
--   então ele não pode nascer antes da marcação retroativa do 49-12. Até lá a garantia é o
--   lock por `(candidatura, tipo)`: duas requisições concorrentes serializam, e a segunda
--   vê a primeira já inserida. A prova do invariante fica no `p12_uma_vigente_por_tipo`
--   (49-18).
--
-- POR QUE `tipo` NULL É UM GRUPO PRÓPRIO (Correção 10).
--   As 6 antigas têm `tipo` NULL = «entrevista desconhecida». A comparação usa
--   `tipo IS NOT DISTINCT FROM p_tipo`, então uma análise nova `online` NÃO supera uma
--   antiga de tipo desconhecido — o que seria inventar um fato sobre ela.
--
-- POR QUE NENHUMA COLUNA DE CONTEÚDO NOVA (D-38 / JORN-12).
--   A transcrição mascarada JÁ mora em `ai_call_logs` (só admin, purga em 180 d). A análise
--   guarda `texto_hash` (= `ai_call_logs.input_hash`, pelo `inputHashDe` do 49-02) e
--   `ai_call_log_id`. Duplicar o texto numa tabela de resultado ampliaria a superfície de
--   PII sem acrescentar informação.
--
-- POR QUE `score` NULL E `status='pendente_humano'` NO UPSERT (D-42 / RNF-07a).
--   `status='sucesso'` com `score` preenchido nasce SÓ da mão humana, em
--   `salvar_avaliacao_entrevista`. Uma análise de IA nova não pode pesar na decisão final
--   antes de alguém a revisar — e uma análise nova INVALIDA a revisão anterior por
--   construção: ela é sobre outro texto.
--
-- POR QUE UMA LINHA DE NOTA PARA OS DOIS TIPOS (D-65).
--   `scores_candidato` tem `UNIQUE NULLS NOT DISTINCT (candidatura_id, tipo, subtipo,
--   pergunta_id)` e o consolidador lê UMA linha `tipo='entrevista'`. Online e presencial
--   compartilham essa linha de propósito: a nota da «entrevista» é uma só.
--
-- ERRO: `invalid_parameter_value` (22023) para `p_status_analise`/`p_tipo` fora do
--   vocabulário. A EF nunca deve chegar aqui — o enum do body já filtra —, mas a RPC é
--   `service_role` e não confia no chamador.
--
-- AUTHZ: `SECURITY DEFINER`, `SET search_path = ''`. `REVOKE ALL FROM PUBLIC, anon,
--   authenticated` + `GRANT EXECUTE TO service_role`. É a EF (service_role) que grava; um
--   RH com JWT não pode inserir análise de IA por chamada direta — seria uma nota de
--   máquina fabricada à mão. ⚠ `anon` e `authenticated` são NOMEADOS no REVOKE: o
--   `pg_default_acl` deste schema concede EXECUTE por grant DIRETO (medido em 2026-09-22 em
--   `salvar_avaliacao_entrevista` e `confirmar_revisao_entrevista`, `anon`=true nas duas), e
--   `REVOKE … FROM PUBLIC` sozinho não alcança um grant direto.
--
-- IDEMPOTÊNCIA: `CREATE OR REPLACE`. A RPC em si é idempotente por `texto_hash` (D-40):
--   reenviar o mesmo texto na mesma `(candidatura, tipo)` não cria linha nem supera nada.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/COMMENT adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260922000007_p49_analise_entrevista_vigente.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.registrar_analise_entrevista(
  p_candidatura_id  uuid,
  p_tipo            text,
  p_solicitado_por  uuid,
  p_texto_hash      text,
  p_ai_call_log_id  uuid,
  p_provedor_ia     text,
  p_modelo_ia       text,
  p_prompt_version  text,
  p_status_analise  text,
  p_competencias    jsonb,
  p_citacoes        jsonb,
  p_bias_flags      jsonb,
  p_bloqueio_avanco boolean,
  p_score_metadata  jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existente  uuid;
  v_ex_vigente boolean;
  v_analise_id uuid;
  v_superadas  int := 0;
  v_vigente    boolean;
  v_falhou     boolean;
BEGIN
  -- ── Vocabulário (a RPC é service_role e não confia no chamador) ───────────────
  IF p_status_analise IS NULL OR p_status_analise NOT IN ('pendente_humano', 'falhou') THEN
    RAISE EXCEPTION 'p_status_analise invalido (%) — esperado pendente_humano ou falhou. status=sucesso da nota nasce SO da mao humana em salvar_avaliacao_entrevista (RNF-07a)', p_status_analise
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_tipo IS NOT NULL AND p_tipo NOT IN ('online', 'presencial') THEN
    RAISE EXCEPTION 'p_tipo invalido (%) — esperado online, presencial ou NULL', p_tipo
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_candidatura_id IS NULL THEN
    RAISE EXCEPTION 'p_candidatura_id obrigatorio' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_falhou := (p_status_analise = 'falhou');

  -- ── Lock por (candidatura, tipo) — T-49-10-03 ────────────────────────────────
  -- Duas requisições concorrentes para a MESMA entrevista serializam aqui. Sem isto,
  -- ambas leem «nenhuma vigente a superar», ambas inserem, e a candidatura fica com
  -- DUAS vigentes — que é exatamente o estado que esta migration existe para impedir.
  -- `tipo` NULL entra no lock como '' (grupo próprio, igual à comparação abaixo).
  PERFORM pg_advisory_xact_lock(
    hashtext('p49_analise:' || p_candidatura_id::text || ':' || coalesce(p_tipo, '')));

  -- ── D-40 · reaproveitar o mesmo texto, sem escrever nada ─────────────────────
  -- Reaproveita QUALQUER análise de SUCESSO com o mesmo hash na mesma
  -- `(candidatura, tipo)` — não só a vigente. É a decisão do operador (CONTEXT
  -- §specifics): A, B, A ⇒ 2 análises, e a vigente continua sendo a B. Reenviar o texto A
  -- devolve a análise A que já existe e NÃO a torna vigente de novo: o RH não pediu para
  -- voltar atrás, pediu para analisar um texto — e esse texto já foi analisado.
  -- A EF confere o hash ANTES de chamar a IA; esta conferência é a que fecha a corrida.
  -- ⚠ NÃO usa o `cache_hit` do `CallAiResult` (RESEARCH Correção 8): aquele sinaliza
  -- leitura de prompt-cache efêmero do provedor, não «este texto já tem análise».
  IF NOT v_falhou AND p_texto_hash IS NOT NULL THEN
    SELECT ea.id,
           public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias)
      INTO v_existente, v_ex_vigente
      FROM public.entrevista_analises ea
     WHERE ea.candidatura_id = p_candidatura_id
       AND ea.tipo IS NOT DISTINCT FROM p_tipo
       AND ea.texto_hash = p_texto_hash
       AND ea.status_analise IS DISTINCT FROM 'falhou'
       AND ea.competencias IS NOT NULL
     ORDER BY ea.created_at DESC
     LIMIT 1;

    IF v_existente IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok',           true,
        'analise_id',   v_existente,
        'reaproveitada', true,
        'vigente',      coalesce(v_ex_vigente, false),
        'superadas',    0);
    END IF;
  END IF;

  -- ── Superar as vigentes do mesmo (candidatura, tipo) — MARCAR, não apagar ────
  -- Uma análise que FALHOU não supera ninguém: a boa anterior continua vigente. Era o
  -- defeito — a linha de falha virava «a mais nova» para quem lia por `created_at`.
  IF NOT v_falhou THEN
    UPDATE public.entrevista_analises ea
       SET superada_em = now()
     WHERE ea.candidatura_id = p_candidatura_id
       AND ea.tipo IS NOT DISTINCT FROM p_tipo
       AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias);
    GET DIAGNOSTICS v_superadas = ROW_COUNT;
  END IF;

  -- ── A análise nova, com dono ─────────────────────────────────────────────────
  INSERT INTO public.entrevista_analises
    (candidatura_id, tipo, solicitado_por, texto_hash, ai_call_log_id,
     provedor_ia, modelo_ia, prompt_version, status_analise,
     competencias, citacoes, bias_flags, bloqueio_avanco)
  VALUES
    (p_candidatura_id, p_tipo, p_solicitado_por, p_texto_hash, p_ai_call_log_id,
     p_provedor_ia, p_modelo_ia, p_prompt_version, p_status_analise,
     p_competencias, p_citacoes, p_bias_flags, coalesce(p_bloqueio_avanco, false))
  RETURNING id INTO v_analise_id;

  -- ── D-42 · a nota consolidada volta a AGUARDAR revisão humana ────────────────
  -- Só no caminho de sucesso: uma falha não tem análise para consolidar e não pode
  -- rebaixar a nota que a revisão humana já confirmou.
  IF NOT v_falhou THEN
    INSERT INTO public.scores_candidato
      (candidatura_id, tipo, subtipo, pergunta_id, score, score_max, status, metadata)
    VALUES
      (p_candidatura_id, 'entrevista', NULL, NULL, NULL, NULL, 'pendente_humano',
       coalesce(p_score_metadata, '{}'::jsonb))
    ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id) DO UPDATE
      SET score      = NULL,
          score_max  = NULL,
          status     = 'pendente_humano',
          metadata   = public.scores_candidato.metadata || EXCLUDED.metadata,
          updated_at = now();
  END IF;

  -- Readback pelo MESMO predicado — nunca inferido do parâmetro.
  SELECT public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias)
    INTO v_vigente
    FROM public.entrevista_analises ea
   WHERE ea.id = v_analise_id;

  RETURN jsonb_build_object(
    'ok',            true,
    'analise_id',    v_analise_id,
    'reaproveitada', false,
    'vigente',       coalesce(v_vigente, false),
    'superadas',     v_superadas);
END;
$function$;

REVOKE ALL ON FUNCTION public.registrar_analise_entrevista(
  uuid, text, uuid, text, uuid, text, text, text, text, jsonb, jsonb, jsonb, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_analise_entrevista(
  uuid, text, uuid, text, uuid, text, text, text, text, jsonb, jsonb, jsonb, boolean, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.registrar_analise_entrevista(
  uuid, text, uuid, text, uuid, text, text, text, text, jsonb, jsonb, jsonb, boolean, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_analise_entrevista(
  uuid, text, uuid, text, uuid, text, text, text, text, jsonb, jsonb, jsonb, boolean, jsonb) TO service_role;

COMMENT ON FUNCTION public.registrar_analise_entrevista(
  uuid, text, uuid, text, uuid, text, text, text, text, jsonb, jsonb, jsonb, boolean, jsonb) IS
  'Phase 49 / 49-10 / JORN-12 / D-39..D-42. UNICO escritor de entrevista_analises a partir da EF '
  'avaliar-transcricao-entrevista (service_role). Numa transacao: lock por (candidatura, tipo), '
  'reaproveitamento por texto_hash (D-40 — reenviar o mesmo texto nao cria linha nem muda a vigente), '
  'superacao por MARCA (superada_em = now(), D-02 — a superada conserva scores_humanos/revisada_por/'
  'revisao_confirmada_em), INSERT da nova com tipo/solicitado_por/texto_hash/ai_call_log_id/provedor_ia/'
  'modelo_ia, e upsert de scores_candidato tipo=entrevista com score NULL e status=pendente_humano '
  '(D-42/D-65 — uma linha so para online e presencial; a nota volta a aguardar revisao humana). '
  'Analise com status_analise=falhou entra na tabela mas NAO supera ninguem e NAO e vigente (pelo '
  'predicado unico entrevista_analise_vigente do 49-01). Devolve {ok, analise_id, reaproveitada, '
  'vigente, superadas}. authenticated NAO executa: nota de maquina nao se fabrica a mao.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PORTÃO DE AUTO-VERIFICAÇÃO — o que entrou e o que não podia faltar.
-- Existência não é comportamento: o portão lê a definição INSTALADA no catálogo, não
-- o arquivo. Se a função não subiu inteira, ou subiu sem o lock / sem o predicado
-- único / sem a marca de superação, esta migration ABORTA e nada persiste.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_portao$
DECLARE
  c_sig constant text :=
    'public.registrar_analise_entrevista(uuid,text,uuid,text,uuid,text,text,text,text,jsonb,jsonb,jsonb,boolean,jsonb)';
  v_def       text;
  v_norm      text;
  v_md5       text;
  v_len       int;
  v_anon      boolean;
  v_auth      boolean;
  v_svc       boolean;
  v_ea_antes  bigint;
BEGIN
  SELECT pg_get_functiondef(p.oid), md5(p.prosrc), length(p.prosrc)
    INTO v_def, v_md5, v_len
    FROM pg_catalog.pg_proc p
   WHERE p.oid = c_sig::regprocedure;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: registrar_analise_entrevista nao esta no catalogo com a assinatura esperada';
  END IF;

  -- Espaço normalizado: as asserções abaixo são sobre a FORMA do comando instalado, e
  -- alinhamento de colunas no fonte não é parte dessa forma.
  v_norm := regexp_replace(v_def, '\s+', ' ', 'g');

  -- (i) O predicado ÚNICO é CHAMADO, não recopiado (JORN-12 — a lacuna É a divergência).
  IF position('entrevista_analise_vigente(' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: o corpo instalado nao chama entrevista_analise_vigente( — uma 5a copia do predicado de vigente divergiria em silencio das outras quatro, que e exatamente a lacuna do JORN-12';
  END IF;

  -- (ii) O lock existe (T-49-10-03 — duas vigentes por corrida).
  IF position('pg_advisory_xact_lock' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: o corpo instalado nao toma pg_advisory_xact_lock — duas requisicoes concorrentes para a mesma entrevista deixariam DUAS vigentes';
  END IF;

  -- (iii) Superar é MARCAR (D-02). E nunca apagar.
  IF position('superada_em = now()' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: o corpo instalado nao marca superada_em = now() — sem a marca, todas as analises continuam vigentes ao mesmo tempo';
  END IF;
  -- Nenhum comando de remoção de linha em NENHUM ponto do corpo — asserção mais forte
  -- que «não remove desta tabela», e deliberadamente sem escrever a forma proibida, que
  -- o portão estático do próprio plano procura no disco deste arquivo (§K do PATTERNS).
  IF position('DELETE' IN upper(v_norm)) > 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: o corpo instalado contem um comando de remocao de linha — superar e MARCAR (D-02): a analise superada conserva scores_humanos/revisada_por/revisao_confirmada_em porque a revisao humana anterior e trilha de decisao automatizada que o titular pode consultar (LGPD Art. 20)';
  END IF;

  -- (iv) O upsert da nota usa a unique de 4 colunas (D-65 — uma linha para os dois tipos).
  IF position('ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)' IN v_norm) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: o corpo instalado nao faz o upsert de scores_candidato pela unique (candidatura_id, tipo, subtipo, pergunta_id) — sem ele a analise nova nao devolveria a nota a pendente_humano (D-42)';
  END IF;

  -- (v) A nota volta a AGUARDAR revisão humana, e sem veredito (D-42 / RNF-07a): o ramo
  --     DO UPDATE tem de rebaixar o status E zerar o score. Só um dos dois deixaria a nota
  --     antiga pesando na decisao final com o rotulo de pendente, ou zerada com rotulo de
  --     sucesso — as duas metades sao a assercao.
  IF position('status = ''pendente_humano''' IN v_norm) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: o ramo DO UPDATE do upsert nao rebaixa status para pendente_humano — a nota confirmada por uma revisao humana ANTERIOR continuaria valendo para uma analise que ela nunca viu (D-42)';
  END IF;
  IF position('score = NULL' IN v_norm) = 0 THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: o ramo DO UPDATE do upsert nao zera o score — a media BARS da revisao anterior sobreviveria a uma analise de outro texto (D-42)';
  END IF;

  -- (vi) ACL: só `service_role`. T-49-10-01.
  v_anon := has_function_privilege('anon',          c_sig::regprocedure, 'EXECUTE');
  v_auth := has_function_privilege('authenticated', c_sig::regprocedure, 'EXECUTE');
  v_svc  := has_function_privilege('service_role',  c_sig::regprocedure, 'EXECUTE');
  IF v_anon OR v_auth THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: anon=% authenticated=% ainda executam a RPC — o grant do pg_default_acl e DIRETO e REVOKE FROM PUBLIC sozinho nao o alcanca; um RH gravaria analise de IA a mao', v_anon, v_auth;
  END IF;
  IF NOT v_svc THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: service_role NAO executa a RPC — a EF de transcricao nao teria como gravar nada';
  END IF;

  -- (vii) Nenhuma linha existente foi tocada por esta migration (a marcação
  --       retroativa das 6 é do 49-12, com checkpoint do operador — D-54).
  --     A contagem viva vai para o NOTICE, NUNCA comparada com uma constante: o número de
  --     análises cresce por tráfego legítimo, e um `<> 6` aqui reprovaria trabalho correto
  --     amanhã (CLAUDE.md §«Portões»). O que é invariante é o ZERO de superadas.
  SELECT count(*) INTO v_ea_antes FROM public.entrevista_analises;
  IF EXISTS (SELECT 1 FROM public.entrevista_analises WHERE superada_em IS NOT NULL) THEN
    RAISE EXCEPTION 'P49-10 POS-PORTAO: ja existe linha com superada_em preenchida — esta migration SO cria a RPC, nao marca nada; a marcacao retroativa das 6 antigas e do plano 49-12 (checkpoint do operador, D-54)';
  END IF;

  RAISE NOTICE 'P49-10 POS-PORTAO OK — md5(prosrc) de registrar_analise_entrevista = % (% octetos) ; ACL anon=% authenticated=% service_role=% ; entrevista_analises = % linha(s), 0 superada(s)',
    v_md5, v_len, v_anon, v_auth, v_svc, v_ea_antes;
END
$pos_portao$;
