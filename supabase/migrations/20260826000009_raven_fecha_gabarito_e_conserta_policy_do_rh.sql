-- =============================================================================
-- Migration: Raven — fecha o gabarito e conserta a policy do RH
-- Date: 2026-08-26
-- =============================================================================
--
-- Medido em 2026-08-26, ao preparar a tela da avaliação cognitiva. TRÊS defeitos,
-- e os dois primeiros são de segurança.
--
-- ⛔ (1) O GABARITO ESTAVA ABERTO — INCLUSIVE PARA `anon`.
--
-- `questoes_raven.resposta_correta` guarda a resposta certa das 60 questões, e os
-- privilégios de coluna davam SELECT a `authenticated` E a `anon`. Somado à policy
-- «Autenticados veem questões Raven» (USING `deleted_at IS NULL`, sem mais nada), o
-- candidato podia ler o gabarito inteiro antes de responder. Um teste cujo gabarito
-- é público não mede nada.
--
-- ⛔ (2) `anon` TINHA INSERT E UPDATE na tabela de questões. Qualquer visitante não
-- autenticado podia ALTERAR o gabarito ou inserir questões. Isso é pior que o
-- vazamento: contamina o instrumento para todo mundo, não só para quem olhou.
--
-- ⛔ (3) A POLICY DO RH NUNCA CASOU. «RH vê respostas Raven» e «RH vê scores Raven»
-- comparam `u.id = auth.uid()`, quando o vínculo com `auth.users` é `u.user_id`.
-- Medido: dos 5 usuários de `usuarios_rh`, ZERO têm `id = user_id`. As duas policies
-- eram inertes — o RH nunca veria resultado nenhum de Raven.
--
-- ⚠ ESTE É O MESMO ERRO QUE O `STATE.md` JÁ REGISTRA nesta base: «eu errei duas
-- vezes juntando por usuarios_rh.id em vez de user_id». Ele produz consulta que
-- RODA, não levanta erro, e devolve vazio — o fato falso com autoridade de query. A
-- terceira ocorrência estava aqui, dormente, esperando alguém usar a tela.
--
-- O QUE MUDA:
--  · REVOKE do gabarito para anon/authenticated (e das escritas de anon);
--  · uma RPC `get_questoes_raven()` SECURITY DEFINER que devolve as questões SEM a
--    coluna de gabarito — é por ela que a tela do candidato lê;
--  · as duas policies do RH passam a comparar `user_id`.
--
-- ⚠ A PONTUAÇÃO CONTINUA NO SERVIDOR. `calcular_scores_raven` já existe e roda por
-- trigger sobre `respostas_raven`. O cliente nunca vê nem envia acerto/erro — manda
-- a alternativa escolhida, e o banco decide. Fechar o gabarito não quebra isso.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

-- ── 1. O gabarito deixa de ser legível por quem responde ────────────────────
REVOKE ALL ON public.questoes_raven FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.questoes_raven FROM authenticated;
REVOKE SELECT (resposta_correta) ON public.questoes_raven FROM authenticated;

-- ── 2. A via legítima: questões sem gabarito ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_questoes_raven()
RETURNS TABLE (
  id uuid,
  numero_questao int,
  serie text,
  imagem_matriz_url text,
  opcoes_imagens jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
  SELECT q.id, q.numero_questao, q.serie::text, q.imagem_matriz_url, q.opcoes_imagens
    FROM public.questoes_raven q
   WHERE q.deleted_at IS NULL
   ORDER BY q.serie, q.numero_questao;
$fn$;

COMMENT ON FUNCTION public.get_questoes_raven() IS
  'As 60 questoes de Raven SEM `resposta_correta`. Existe porque o gabarito estava '
  'legivel por authenticated E anon ate 2026-08-26 — um teste com gabarito publico '
  'nao mede nada. A pontuacao segue no servidor (calcular_scores_raven).';

REVOKE ALL ON FUNCTION public.get_questoes_raven() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_questoes_raven() TO authenticated;

-- ── 3. As policies do RH voltam a casar ─────────────────────────────────────
DROP POLICY IF EXISTS "RH vê respostas Raven" ON public.respostas_raven;
CREATE POLICY "RH vê respostas Raven" ON public.respostas_raven
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_rh u
     WHERE u.user_id = (SELECT auth.uid())  -- era u.id — nunca casava
       AND u.ativo IS TRUE AND u.deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "RH vê scores Raven" ON public.scores_raven;
CREATE POLICY "RH vê scores Raven" ON public.scores_raven
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_rh u
     WHERE u.user_id = (SELECT auth.uid())  -- era u.id — nunca casava
       AND u.ativo IS TRUE AND u.deleted_at IS NULL
  ));

-- ── 4. Inserir resposta exige ser o dono da candidatura E estar liberado ────
-- A policy anterior de INSERT tinha WITH CHECK nulo: qualquer autenticado podia
-- gravar resposta em QUALQUER candidatura.
DROP POLICY IF EXISTS "Candidato insere respostas Raven" ON public.respostas_raven;
CREATE POLICY "Candidato insere respostas Raven" ON public.respostas_raven
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidaturas c
        JOIN public.candidatos cd ON cd.id = c.candidato_id
       WHERE c.id = respostas_raven.candidatura_id
         AND cd.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.cognitivo_liberacao l
       WHERE l.candidatura_id = respostas_raven.candidatura_id
         AND l.revogado_em IS NULL
    )
  );
