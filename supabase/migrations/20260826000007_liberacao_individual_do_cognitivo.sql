-- =============================================================================
-- Migration: liberação INDIVIDUAL da avaliação cognitiva (Raven)
-- Date: 2026-08-26
-- =============================================================================
--
-- POR QUE INDIVIDUAL, e não por vaga como os demais testes.
--
-- SJT e Big Five são aplicados a TODOS os candidatos da vaga que chegam em
-- `avaliacao_assincrona` — e devem continuar assim: scores só se comparam quando
-- todo mundo passou pela mesma régua, e `pesos_avaliacao` pressupõe exatamente isso.
--
-- O cognitivo é outra coisa. Decisão do operador em 2026-08-26: aplicação
-- PRESENCIAL, a poucos finalistas. Isso muda o instrumento de lugar no processo —
-- deixa de ser filtro (que precisa ser igual para todos) e vira aprofundamento sobre
-- quem já passou pela comparação. Por isso ele NÃO entra em `testes_aplicaveis` da
-- vaga: entra por liberação nominal, com quem liberou e quando registrados.
--
-- ⚠ E ELE FICA FORA DO AGREGADO DE SCORE, deliberadamente. Um instrumento aplicado a
-- alguns não pode pesar num número que compara todos — seria comparar quem fez com
-- quem nunca teve a chance. O `pesos_avaliacao` não ganha entrada para o cognitivo;
-- ele já é `contextual · não pondera` na tela de consolidação.
--
-- ⚠ SOBRE O INSTRUMENTO. As Matrizes Progressivas de Raven são instrumento
-- psicométrico de uso restrito no Brasil (SATEPSI/CFP) — este repositório inclusive
-- guarda a Resolução CFP 31/2022 em docs/conhecimento. A aplicação presencial e
-- seletiva que o operador definiu é o que mantém o uso sob controle humano direto,
-- e a linguagem de produto continua sendo "avaliação cognitiva", nunca "teste
-- psicológico" (CLAUDE.md). Esta migration cria o CONTROLE de acesso; ela não
-- decide sobre a adequação do instrumento, que é responsabilidade humana.
--
-- ⚠ A TELA NÃO EXISTE NO ATS. Medido em 2026-08-26: não há rota nem componente que
-- leia `questoes_raven` — `src/INSTRUCOES-RAVEN.md` diz "Implementado e Pronto para
-- Uso" mas veio do import "Update files from Figma Make" e descreve um protótipo. As
-- 60 questões e as imagens ESTÃO no banco (o app Teste_Inteligencia compartilha este
-- Supabase). Esta tabela é a fundação: serve tanto para a tela interna, quando ela
-- existir, quanto para liberar o acesso ao app externo.
--
-- Aditivo. Sem BEGIN/COMMIT (D-22).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cognitivo_liberacao (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  liberado_por   uuid NOT NULL,
  liberado_em    timestamptz NOT NULL DEFAULT now(),
  -- Revogar em vez de apagar: a liberação é um ato sobre uma pessoa e precisa
  -- sobreviver ao arrependimento. `revogado_em` fecha o acesso sem apagar o rastro.
  revogado_em    timestamptz,
  revogado_por   uuid,
  motivo         text,
  CONSTRAINT cognitivo_liberacao_candidatura_key UNIQUE (candidatura_id)
);

COMMENT ON TABLE public.cognitivo_liberacao IS
  'Liberacao NOMINAL da avaliacao cognitiva (Raven). Diferente de SJT/Big Five, que '
  'sao por vaga: o cognitivo e presencial e seletivo, aplicado a poucos finalistas. '
  'Fica FORA do agregado de score — instrumento aplicado a alguns nao pode pesar num '
  'numero que compara todos. Ver migration 20260826000007.';

COMMENT ON COLUMN public.cognitivo_liberacao.revogado_em IS
  'Fecha o acesso sem apagar o registro. A liberacao e ato sobre uma pessoa: o rastro '
  'de quem liberou e quando precisa sobreviver a revogacao.';

ALTER TABLE public.cognitivo_liberacao ENABLE ROW LEVEL SECURITY;

-- RH/admin enxerga tudo (a fila de liberacoes e trabalho deles).
DROP POLICY IF EXISTS "RH ve liberacoes cognitivas" ON public.cognitivo_liberacao;
CREATE POLICY "RH ve liberacoes cognitivas" ON public.cognitivo_liberacao
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_rh u
     WHERE u.user_id = (SELECT auth.uid()) AND u.ativo IS TRUE AND u.deleted_at IS NULL
  ));

-- O candidato ve APENAS a propria liberacao — e so a existencia dela, que e o que
-- destrava a tela para ele. Sem isso ele nao teria como saber que foi liberado.
DROP POLICY IF EXISTS "Candidato ve a propria liberacao" ON public.cognitivo_liberacao;
CREATE POLICY "Candidato ve a propria liberacao" ON public.cognitivo_liberacao
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos cd ON cd.id = c.candidato_id
     WHERE c.id = cognitivo_liberacao.candidatura_id
       AND cd.user_id = (SELECT auth.uid())
  ));

-- ⚠ NENHUMA policy de INSERT/UPDATE/DELETE. A escrita passa OBRIGATORIAMENTE pelas
-- RPCs abaixo, que checam papel e registram o autor. Uma policy de INSERT permitiria
-- liberar sem deixar quem.
REVOKE ALL ON public.cognitivo_liberacao FROM PUBLIC, anon;
GRANT SELECT ON public.cognitivo_liberacao TO authenticated;
