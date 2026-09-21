-- =============================================================================
-- 20260921000009 — rejeitar_candidatura grava `feedback_rejeicao` NEUTRO
--                  (JORN-22 / D-12)
-- =============================================================================
-- Phase 48 / plano 48-09, Task 2. Decisão do operador D-12 (48-CONTEXT.md), NÃO
-- redecidida aqui: «`rejeitar_candidatura` passa a gravar `feedback_rejeicao` com
-- texto neutro, que é o que o knockout já faz. O front
-- (`DashboardCandidatoPage.tsx:148-159`, condição `data_decisao_final OR
-- feedback_rejeicao`) NÃO muda.»
--
-- O QUE ESTAVA ERRADO. Quem era rejeitado pelo RH antes da decisão final
-- (`rejeitar_candidatura`) ficava sem `data_decisao_final` (não há decisão final)
-- e sem `feedback_rejeicao` (a RPC nunca o escreveu) — as duas condições do cartão
-- «Entenda a decisão» do painel. O Art. 20 era inalcançável para o caso mais comum
-- de rejeição do funil. O knockout não tinha o problema porque
-- `submit_candidatura_atomic` (definição viva: 20260709000014:143) grava
-- `feedback_rejeicao` no mesmo UPDATE que rejeita.
--
-- O EXPERIMENTO DA ETAPA 10 (JORNADA-GUIADA.md, validação em PROD 2026-09-19..21).
-- A previsão registrada antes da Etapa 10 era: «o cartão DEVE aparecer para o
-- knockout, porque ele grava `feedback_rejeicao`; se não aparecer, a condição está
-- mais quebrada do que o diagnóstico indica». Apareceu. Logo a condição do front
-- está certa e o conserto é o dado: esta migration. Alternativa rejeitada pelo
-- operador: mexer na condição do front (deixaria o cartão sem texto de feedback).
--
-- ⚠ ORDEM (T-48-09-04). Com o `feedback_rejeicao` gravado, o cartão aparece — e
-- leva a `/candidato/explicacao/:id`. Até o 48-09 aquela página respondia «Esta
-- página não está disponível» para este caso. Por isso esta migration só foi
-- aplicada DEPOIS de: (1) `explicacao_rejeicao_origem` em PROD (20260921000008);
-- (2) o front com o ramo `humana_triagem` publicado e o marcador
-- `explicacao-humana-triagem` provado em PROD pelo crawler (horários no
-- 48-09-SUMMARY).
--
-- O TEXTO, E POR QUE ELE NÃO É O DO KNOCKOUT. O do knockout é
-- «Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste
-- momento.» — fala de REQUISITOS, porque ali quem decidiu foi uma regra. Aqui quem
-- decidiu foi uma PESSOA, e o texto diz isso:
--   «Após análise da sua candidatura pela nossa equipe, não seguiremos com ela
--    neste momento.»
-- É uma CONSTANTE. Nunca a `etapa_justificativa` que o RH escreveu, nunca o
-- `p_motivo`, nunca critério ou nota — o texto chega ao candidato (painel e cópia
-- LGPD) e o motivo não pode chegar (D-12, D-15). Nenhuma palavra do grep-guard dos
-- e-mails de decisão (`/score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio/i`)
-- — conferido pelo `p48_rejeicao_triagem_smoke.sql` (b) sobre o valor GRAVADO.
-- (Premissa A8 do plano: o texto exato é discrição do Claude, revisável pelo
-- operador no 48-18.)
--
-- UMA MUDANÇA, NO MESMO UPDATE. O UPDATE único é o que dispara `avancar_etapa`
-- (a ÚNICA linha de auditoria em `historico_candidatura`) e satisfaz
-- `guard_rejeicao_auditada` (status → rejeitado COM movimento de etapa). Um
-- segundo UPDATE só para o feedback seria uma segunda passagem pelos triggers.
-- Todo o resto do corpo é BYTE A BYTE o vivo — incluindo a trava terminal do
-- 48-01 (`candidatura_encerrada(v_etapa, v_status)`, D3/JORN-26), que o `DO` do
-- fim exige que continue lá.
--
-- BASE: o corpo VIVO, lido por `pg_get_functiondef` em 2026-09-21 —
--   rejeitar_candidatura  md5(prosrc) = 327f3137b1a808e60080c3b82f144e23 (2346 octetos)
-- idêntico ao corpo de 20260921000002 (48-01), conferido por md5 do trecho do
-- arquivo. O PRÉ-PORTÃO abaixo recusa o apply se o vivo tiver mudado desde então.
--
-- ACL: CREATE OR REPLACE preserva o ACL vivo (inclui `anon=X` — registrado no
-- deferred-items pelo 48-01; os guards de corpo fecham; fora do escopo deste plano).
--
-- IDEMPOTÊNCIA: o pré-portão aceita o md5 de ANTES (primeiro apply) e recusa
-- qualquer outro — re-aplicar sobre o corpo novo falharia de propósito, com
-- mensagem, em vez de reinstalar às cegas.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL com `DO`
-- adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000009_p48_rejeicao_triagem_feedback.sql
-- (SQL lido do ARQUIVO; migration + ledger na mesma transação; a `version` nasce correta).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PRÉ-PORTÃO — o vivo é o corpo medido. Guarda o md5 do trecho que NÃO pode mudar
-- (tudo antes do UPDATE único) para a auto-verificação do fim.
-- ---------------------------------------------------------------------------
DO $pre_p48_09$
DECLARE
  v_md5  text;
  v_src  text;
  v_pre  text;
BEGIN
  SELECT md5(p.prosrc), p.prosrc INTO v_md5, v_src
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text)'::regprocedure;
  IF v_md5 IS DISTINCT FROM '327f3137b1a808e60080c3b82f144e23' THEN
    RAISE EXCEPTION 'P48-09 PRE-PORTAO: rejeitar_candidatura vivo md5 = %, medido = 327f3137b1a808e60080c3b82f144e23 — reler o vivo (pg_get_functiondef) e refazer esta migration', v_md5;
  END IF;

  v_pre := substring(v_src FROM '^(.*?)  -- \(4\) ONE UPDATE');
  IF v_pre IS NULL THEN
    RAISE EXCEPTION 'P48-09 PRE-PORTAO: nao achei o marcador do UPDATE unico (4) no corpo vivo — a prova de que o resto nao mudou nao teria base';
  END IF;
  PERFORM set_config('p48_09.pre_md5', md5(v_pre), true);
END
$pre_p48_09$;

-- ---------------------------------------------------------------------------
-- rejeitar_candidatura — corpo vivo + `feedback_rejeicao` neutro no UPDATE único.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rejeitar_candidatura(
  p_candidatura_id uuid,
  p_motivo         public.motivo_rejeicao_rh,
  p_justificativa  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $rejeitar_candidatura$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_etapa      public.etapa_processo;
  v_status     public.status_candidatura;
  v_just       text := btrim(coalesce(p_justificativa, ''));
BEGIN
  -- (0) Role membership guard FIRST (WR-02): candidato/anon rejected before any lookup -> no existence oracle
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (1) Server-authoritative >=50 gate
  IF char_length(v_just) < 50 THEN
    RAISE EXCEPTION 'A justificativa da rejeição precisa de pelo menos 50 caracteres'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (2) Resolve candidatura -> vaga owner + etapa + status
  SELECT v.created_by, c.etapa_atual, c.status
    INTO v_vaga_owner, v_etapa, v_status
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2b) Own-vaga guard (WR-04): rh must own; administrador bypasses
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (3) Early terminal guard — Phase 48 / JORN-26 (D3 da varredura): «encerrada» e o
  --     predicado canonico, etapa E status. O guard antigo so olhava a etapa e aceitava
  --     re-rejeitar um knockout (`inscricao`, `rejeitado`): reescrevia `motivo_rejeicao`,
  --     gravava historico `inscricao -> rejeitado` e, com a chave de dedupe por
  --     transicao do JORN-18, mandaria um SEGUNDO e-mail de rejeicao.
  IF public.candidatura_encerrada(v_etapa, v_status) THEN
    RAISE EXCEPTION 'candidatura já encerrada (etapa %, status %) — não pode ser rejeitada novamente', v_etapa, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- (4) ONE UPDATE -> trigger writes the single audit row + guard_rejeicao_auditada satisfied
  --     Phase 48 / JORN-22 / D-12: `feedback_rejeicao` NEUTRO, no MESMO UPDATE — e o que
  --     faz o cartao «Entenda a decisao» aparecer no painel do candidato. E uma
  --     CONSTANTE: nunca v_just, nunca p_motivo (o texto chega ao candidato).
  UPDATE public.candidaturas
     SET etapa_atual         = 'rejeitado',
         status              = 'rejeitado',
         motivo_rejeicao     = p_motivo::text,
         etapa_justificativa = v_just,
         feedback_rejeicao   = 'Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.'
   WHERE id = p_candidatura_id;
END;
$rejeitar_candidatura$;

-- ---------------------------------------------------------------------------
-- AUTO-VERIFICAÇÃO — sobre a definição INSTALADA.
-- ---------------------------------------------------------------------------
DO $verifica_p48_09$
DECLARE
  v_def  text := pg_get_functiondef('public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text)'::regprocedure);
  v_src  text;
  v_pre  text;
  v_n    int;
BEGIN
  SELECT p.prosrc INTO v_src FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text)'::regprocedure;

  -- O feedback neutro está no corpo, com o texto exato.
  IF position('feedback_rejeicao   = ''Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P48-09 VERIFICA: rejeitar_candidatura instalada SEM o feedback_rejeicao neutro';
  END IF;

  -- Nunca o texto do RH nem o motivo no feedback.
  IF v_def ~* 'feedback_rejeicao\s*=\s*(v_just|p_justificativa|p_motivo)' THEN
    RAISE EXCEPTION 'P48-09 VERIFICA: feedback_rejeicao recebendo justificativa/motivo — o texto chegaria ao candidato';
  END IF;

  -- A trava terminal do 48-01 (D3 / JORN-26) continua lá.
  IF position('candidatura_encerrada(' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P48-09 VERIFICA: a trava candidatura_encerrada( do 48-01 SUMIU de rejeitar_candidatura';
  END IF;

  -- Um UPDATE só.
  SELECT count(*) INTO v_n FROM regexp_matches(v_src, 'UPDATE public\.candidaturas', 'g');
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'P48-09 VERIFICA: rejeitar_candidatura tem % UPDATEs em candidaturas (esperado exatamente 1 — o que dispara avancar_etapa)', v_n;
  END IF;

  -- Tudo antes do UPDATE único é byte a byte o vivo de antes.
  v_pre := substring(v_src FROM '^(.*?)  -- \(4\) ONE UPDATE');
  IF md5(coalesce(v_pre, '')) IS DISTINCT FROM current_setting('p48_09.pre_md5', true) THEN
    RAISE EXCEPTION 'P48-09 VERIFICA: o corpo ANTES do UPDATE unico mudou — este plano so toca o UPDATE';
  END IF;

  -- Continua SECURITY DEFINER com search_path vazio.
  IF position('SECURITY DEFINER' IN v_def) = 0 OR position('SET search_path TO ''''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P48-09 VERIFICA: rejeitar_candidatura perdeu SECURITY DEFINER / search_path vazio';
  END IF;
END
$verifica_p48_09$;
