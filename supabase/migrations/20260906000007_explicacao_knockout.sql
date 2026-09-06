-- =============================================================================
-- 20260906000007 — explicacao_rejeicao_automatica : o knockout ganha explicação
-- =============================================================================
-- Decisão do responsável sobre §7.18 do GUIA-VALIDACAO-FINAL, caminho (2):
-- a página `/candidato/explicacao/:id` passa a aceitar a rejeição automática, com
-- texto próprio. NÃO abre pedido de revisão (caminho (3) foi recusado).
--
-- O QUE ESTAVA ERRADO. Medido em §7.18: quem é reprovado POR UM HUMANO na decisão
-- final tem e-mail, página de explicação e direito de revisão. Quem é reprovado
-- SEM NENHUM HUMANO OLHAR, pelo knockout automático, não tinha nenhum dos três —
-- o inverso do que o Art. 20 protege. O e-mail foi resolvido em `…0006`; esta
-- migration resolve a explicação.
--
-- POR QUE UMA RPC, E NÃO UMA LEITURA DIRETA. A página precisa distinguir três
-- rejeições que, do lado do cliente, são indistinguíveis:
--
--   (a) decisão final humana  → JÁ tem `decisao_final`, e a página já funciona;
--   (b) rejeição humana na triagem (`rejeitar_candidatura`) → status='rejeitado',
--       SEM linha em `decisao_final`;
--   (c) knockout automático   → status='rejeitado', SEM linha em `decisao_final`.
--
-- (b) e (c) são idênticas nas colunas que o candidato pode ler: a allowlist de
-- `candidaturasService` exclui `motivo_rejeicao` e `opcao_knockout_id` de propósito
-- (o critério do knockout nunca é revelado — D-15). Inferir «sem decisao_final e
-- rejeitado ⇒ knockout» daria a (b) o texto de (c): uma rejeição escrita por uma
-- pessoa apresentada ao candidato como automática. Plausível, silencioso e falso —
-- exatamente a família de defeito que esta sessão inteira encontrou.
--
-- A RPC é o único lugar onde o `motivo_rejeicao` pode ser LIDO sem ser DEVOLVIDO.
--
-- O QUE ELA DEVOLVE, E O QUE NÃO DEVOLVE. Devolve um `boolean`. Não devolve o
-- `opcao_knockout_id`, nem o texto da opção, nem a pergunta — o candidato recebe o
-- MECANISMO («uma resposta eliminatória»), que é o que o Art. 20 pede, e não o
-- CRITÉRIO, que D-15 mantém fora da superfície do candidato.
--
-- `false` cobre DOIS casos de propósito: «não é sua» e «é sua, mas não foi
-- knockout». Uma exceção no primeiro caso transformaria a função num oráculo de
-- existência de candidatura alheia.
--
-- AUTHZ: guard own-row idêntico ao de `stamp_explicacao_acessada`
-- (20260625100001:250-256) — `candidatos.user_id = auth.uid()`, que sobrevive ao
-- SECURITY DEFINER pela GUC request.jwt. `SET search_path = ''` como todas as
-- DEFINER deste repositório.
--
-- IDEMPOTÊNCIA: CREATE OR REPLACE. Sem efeito colateral — é uma leitura.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL
-- `$$` com REVOKE/GRANT adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260906000007_explicacao_knockout.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.explicacao_rejeicao_automatica(
  p_candidatura_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_automatica boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()
       AND c.status = 'rejeitado'
       AND c.motivo_rejeicao = 'knockout_automatico'
       AND c.opcao_knockout_id IS NOT NULL
  ) INTO v_automatica;

  RETURN COALESCE(v_automatica, false);
END;
$$;

REVOKE ALL ON FUNCTION public.explicacao_rejeicao_automatica(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.explicacao_rejeicao_automatica(uuid) TO authenticated;

COMMENT ON FUNCTION public.explicacao_rejeicao_automatica(uuid) IS
  'Phase 46 / §7.18 caminho (2): responde SE esta candidatura do proprio titular foi '
  'rejeitada pelo knockout automatico. Existe porque a rejeicao humana na triagem e a '
  'automatica sao indistinguiveis nas colunas que o candidato pode ler — a allowlist do '
  'cliente exclui motivo_rejeicao e opcao_knockout_id (D-15, o criterio nunca vaza). Sem '
  'esta funcao a pagina de explicacao daria a uma rejeicao ESCRITA POR UMA PESSOA o texto '
  'da automatica. Devolve boolean e nada mais: o candidato recebe o MECANISMO (Art. 20), '
  'nunca o CRITERIO (D-15). false cobre «nao e sua» e «sua, mas nao foi knockout» — uma '
  'excecao no primeiro caso faria dela um oraculo de existencia de candidatura alheia. '
  'Own-row por candidatos.user_id=auth.uid(), espelhando stamp_explicacao_acessada. '
  'NAO abre pedido de revisao: o caminho (3) do §7.18 foi recusado pelo responsavel.';
