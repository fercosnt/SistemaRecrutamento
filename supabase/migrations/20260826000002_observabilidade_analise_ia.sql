-- =============================================================================
-- Migration: observabilidade da análise de IA — a presa deixa de ser invisível
-- Date: 2026-08-26
-- =============================================================================
--
-- ⛔ O DEFEITO. Nada distinguia uma análise BEM-SUCEDIDA de uma que MORREU no meio.
--
-- Medido em 2026-08-25: o trigger dispara `net.http_post` com o default de 5s, e a
-- análise leva ~93s. Então `net._http_response` registra
-- "Timeout of 5000 ms reached" em TODA execução, inclusive nas que terminam bem —
-- a Edge Function continua rodando depois de o pg_net desistir de esperar.
--
-- Consequência: o dispatch nunca serviu de sinal. E se a EF fosse MORTA (timeout de
-- runtime, OOM, processo derrubado), nem linha de `falhou` existia — o try/catch
-- dela só cobre THROW. Sobrava a ausência de linha, que é igual a "ainda rodando".
--
-- ⚠ ESTE ARQUIVO NÃO "CONSERTA A ANÁLISE" — ela nunca esteve quebrada. Eu mesmo
-- concluí que estava, a partir do `error_msg` de timeout somado a uma leitura feita
-- cedo demais. Era falso: a análise gravou sozinha 93s depois. O que se conserta
-- aqui é a IMPOSSIBILIDADE DE SABER, que é um defeito de verdade.
--
-- DUAS MUDANÇAS:
--
--  1. `timeout_milliseconds := 120000` nos dois dispatches (trigger e reprocessar).
--     Não muda o que a EF faz — ela já rodava até o fim. Faz o log parar de mentir:
--     um timeout registrado volta a significar algo anormal. 120s dá folga sobre os
--     93s medidos com um CV de 4 KB.
--
--  2. `v_analises_presas` — candidaturas cuja análise começou (`pendente`) e não
--     terminou, ou que nunca chegou a começar. A EF passa a marcar `pendente` ANTES
--     do trabalho caro (mesmo commit), então o estado sempre existe.
--
-- ⚠ A VIEW COBRE OS DOIS CASOS DE PROPÓSITO: `pendente` velha (morreu no meio) E
-- candidatura sem linha nenhuma passados 10 minutos (o dispatch nunca chegou à EF —
-- vault sem segredo, EF fora do ar, trigger desabilitado). O segundo é o mais
-- silencioso dos dois e some de qualquer consulta que parta da tabela de análises.
--
-- Aditivo e reversível. Sem BEGIN/COMMIT (D-22).
-- =============================================================================

-- ── 1. Os dois dispatches ganham timeout coerente ───────────────────────────
CREATE OR REPLACE FUNCTION public.trg_candidatura_analise()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';

  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- secrets ausentes — dispatch adiado, nenhuma linha bloqueada
  END IF;

  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/analise-candidato-individual',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_invoke_key
    ),
    body := jsonb_build_object('candidatura_id', NEW.id, 'vaga_id', NEW.vaga_id),
    -- 120s: a analise levou ~93s numa medicao real (2026-08-25). Sem isto o
    -- pg_net desiste em 5s e registra timeout em TODA execucao, o que torna o
    -- log inutil como sinal.
    timeout_milliseconds := 120000
  );

  RETURN NEW;
END;
$fn$;

-- ── 2. A view das presas ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_analises_presas AS
SELECT
  c.id                AS candidatura_id,
  c.vaga_id,
  v.slug              AS vaga_slug,
  c.data_candidatura,
  COALESCE(a.status, 'sem_linha') AS situacao,
  a.erro,
  a.updated_at        AS analise_atualizada_em,
  now() - COALESCE(a.updated_at, c.data_candidatura) AS parada_ha
FROM public.candidaturas c
JOIN public.vagas v ON v.id = c.vaga_id
LEFT JOIN public.analise_candidato_vaga a ON a.candidatura_id = c.id
WHERE c.deleted_at IS NULL
  AND (
    -- comecou e nao terminou
    (a.status = 'pendente' AND a.updated_at < now() - interval '10 minutes')
    -- ou o dispatch nunca chegou a criar linha nenhuma
    OR (a.id IS NULL AND c.data_candidatura < now() - interval '10 minutes')
  );

COMMENT ON VIEW public.v_analises_presas IS
  'Candidaturas cuja analise de IA comecou e nao terminou (status pendente ha mais '
  'de 10 min) ou que nunca chegou a comecar (sem linha em analise_candidato_vaga). '
  'Existe porque o dispatch NAO serve de sinal: net.http_post registra timeout em '
  'toda execucao, inclusive nas bem-sucedidas — a EF roda ~93s e o pg_net desistia '
  'em 5s. Ver migration 20260826000002.';

REVOKE ALL ON public.v_analises_presas FROM PUBLIC, anon;
GRANT SELECT ON public.v_analises_presas TO authenticated;
