-- ============================================================================
-- Tira do ar duas vagas que nao deviam estar recebendo candidato
-- ============================================================================
--
-- Medido em 2026-08-27, na propria pagina publica /vagas:
--
-- 1. `teste-e2e-social-media` — "[TESTE E2E] Social Media" aparecia NO TOPO da
--    lista publica de carreiras, acima das duas vagas reais, com "Publicada ha
--    1 dia · 1 candidato". Fui eu que a criei (migration 20260825000002) para
--    exercitar o funil de ponta a ponta, e ela nasceu `ativa` — o que significa
--    publica. Uma vaga de teste visivel para candidato real e um convite a que
--    alguem se inscreva num processo que nao existe.
--
-- 2. `consultor-relacionamento-pre-vendas` — no ar desde 2026-08-23 com ZERO
--    perguntas na Etapa 1 e os quatro pesos de avaliacao em zero
--    (triagem/entrevista/work_sample_sjt/redacao_cultural). Quem se inscrevesse
--    responderia nada na triagem e sairia com score zero em todas as dimensoes:
--    o funil aceitaria a pessoa e nao teria como avaliá-la. Nenhuma inscricao
--    ocorreu ate aqui, entao ninguem foi prejudicado. Volta ao ar depois que as
--    perguntas e os pesos forem escritos.
--
-- `inativa`, nao `arquivada` nem soft-delete: as duas devem voltar. A de teste
-- quando eu precisar de cenario, e a de consultor quando estiver configurada. O
-- historico e a candidatura de teste (com o Raven ja respondido) permanecem.
-- ============================================================================

UPDATE public.vagas
SET status = 'inativa', updated_at = NOW()
WHERE deleted_at IS NULL
  AND status = 'ativa'
  AND slug IN ('teste-e2e-social-media', 'consultor-relacionamento-pre-vendas');

-- ── Portao ─────────────────────────────────────────────────────────────────
-- Exige o estado final EXATO: as duas fora do ar, a de Social Media real ainda
-- no ar, e nenhuma outra vaga ativa que nao seja ela.
--
-- ⚠ Deliberadamente NAO conta "quantas vagas ativas restaram" contra uma
-- constante: no dia em que uma vaga nova e publicada, uma contagem dessas
-- reprovaria trabalho correto acusando um problema que nao existe. O portao
-- pergunta pelo estado das vagas que ESTA migration toca, e mais nada.
DO $gate$
DECLARE
    v_status_teste TEXT;
    v_status_consultor TEXT;
    v_status_social TEXT;
BEGIN
    SELECT status::text INTO v_status_teste
    FROM public.vagas WHERE slug = 'teste-e2e-social-media' AND deleted_at IS NULL;

    SELECT status::text INTO v_status_consultor
    FROM public.vagas WHERE slug = 'consultor-relacionamento-pre-vendas' AND deleted_at IS NULL;

    SELECT status::text INTO v_status_social
    FROM public.vagas WHERE slug = 'social-media-producao-captacao-conteudo' AND deleted_at IS NULL;

    IF v_status_teste IS DISTINCT FROM 'inativa' THEN
        RAISE EXCEPTION 'teste-e2e-social-media ficou com status %, esperado inativa', v_status_teste;
    END IF;

    IF v_status_consultor IS DISTINCT FROM 'inativa' THEN
        RAISE EXCEPTION 'consultor-relacionamento-pre-vendas ficou com status %, esperado inativa', v_status_consultor;
    END IF;

    -- A vaga real de Social Media NAO era alvo. Se ela sair do ar, o UPDATE pegou
    -- mais do que devia — e o candidato que estiver no meio da inscricao perde a vaga.
    IF v_status_social IS DISTINCT FROM 'ativa' THEN
        RAISE EXCEPTION 'social-media-producao-captacao-conteudo ficou com status %, esperado ativa (nao era alvo)', v_status_social;
    END IF;
END;
$gate$;
