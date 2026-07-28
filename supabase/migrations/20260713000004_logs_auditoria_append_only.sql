-- =============================================================================
-- Phase 28 / Plan 28-04 / USR-06 — logs_auditoria append-only + purge-exempt
-- =============================================================================
-- Trust boundaries:
--   * authenticated user -> logs_auditoria INSERT: the live "Sistema insere logs"
--     policy (INSERT TO authenticated WITH CHECK (true), per 28-LIVE-STATE A1b)
--     lets ANY authenticated user forge audit rows. Repudiation/tampering vector.
--   * retention purge -> logs_auditoria DELETE: limpar_logs_antigos() (DEFINER)
--     purges info/aviso rows older than the 730-day retention window — which would
--     eventually delete user-management/security audit rows.
--
-- Hardening (leak/vector REMOVAL, not new policy):
--   (1) DROP "Sistema insere logs" — the forgeable authenticated INSERT policy.
--       The DEFINER audit path (log_auditoria(), owner postgres/BYPASSRLS per
--       28-LIVE-STATE A4) still inserts, so dropping this does NOT break audit
--       writes. No client code inserts logs_auditoria directly (grep src/ -> 0).
--   (2) REVOKE INSERT, UPDATE, DELETE ON logs_auditoria FROM authenticated, anon
--       (defense in depth). NO UPDATE/DELETE policy is added -> append-only.
--   (3) Redefine limpar_logs_antigos() as a VERIFIED byte-preserved DIFF of the
--       28-01 Wave-0 capture (RETURNS INTEGER, LANGUAGE plpgsql SECURITY DEFINER,
--       SET search_path = public, 730-day retention from
--       configuracoes_empresa.dias_retencao_logs, severidade IN ('info','aviso')),
--       changing ONLY the DELETE WHERE clause to also require
--       categoria NOT IN ('usuario','seguranca') so user-management/security audit
--       rows are NEVER purged (RESEARCH Q2 retention hardening). Every other line
--       is byte-preserved — this is a verified diff, NOT a blind CREATE OR REPLACE
--       (M4/DBMIG-02 discipline).
--
-- PRESERVED UNTOUCHED:
--   * "Admin vê logs" SELECT policy — out of phase scope. (28-LIVE-STATE A1b notes
--     its predicate uses usuarios_rh.id = auth.uid() where the auth linkage is
--     user_id, a PRE-EXISTING quirk fixed by USR-10, NOT here.)
--
-- FORCE RLS is intentionally NOT enabled: it would subject the DEFINER audit
-- INSERT (owner postgres) to RLS and break the audit write (28-LIVE-STATE A4).
--
-- Applied via Supabase MCP apply_migration in 28-07 (bypasses 42601); the
-- denied-INSERT + categoria='usuario'-survives-purge behavioral proofs run against
-- PROD in 28-08. NO outer BEGIN/COMMIT wrapper (the driver wraps each migration in
-- its own tx — an outer BEGIN/COMMIT triggers 42601). RNF-07a: nothing here writes
-- candidaturas or auto-rejects.
-- =============================================================================

-- (1) Drop the forgeable authenticated INSERT policy (append-only, USR-06).
DROP POLICY IF EXISTS "Sistema insere logs" ON public.logs_auditoria;

-- (2) Defense in depth: no client role may write the audit trail at all.
--     The DEFINER path (log_auditoria(), owner BYPASSRLS) is unaffected.
REVOKE INSERT, UPDATE, DELETE ON public.logs_auditoria FROM authenticated, anon;

-- (3) Retention hardening — byte-preserved DIFF of the Wave-0 limpar_logs_antigos()
--     body; the ONLY change is the added categoria exclusion in the DELETE WHERE.
CREATE OR REPLACE FUNCTION public.limpar_logs_antigos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias_retencao INTEGER;
  v_data_limite TIMESTAMPTZ;
  v_logs_deletados INTEGER;
BEGIN
  -- Buscar dias de retenção das configurações (padrão: 730 dias = 2 anos)
  SELECT COALESCE(dias_retencao_logs, 730) INTO v_dias_retencao
  FROM configuracoes_empresa
  WHERE empresa_id = 'beauty-smile'
  LIMIT 1;

  -- Calcular data limite
  v_data_limite := NOW() - (v_dias_retencao || ' days')::INTERVAL;

  -- Deletar apenas logs de severidade 'info' e 'aviso' mais antigos que a data limite
  -- Logs de 'erro' e 'critico' NUNCA são deletados
  -- 28-04 (USR-06 / RESEARCH Q2): auditoria de gestão de usuários e segurança
  -- (categoria 'usuario'/'seguranca') NUNCA é purgada — append-only imutável.
  DELETE FROM logs_auditoria
  WHERE created_at < v_data_limite
    AND severidade IN ('info', 'aviso')
    AND categoria NOT IN ('usuario', 'seguranca');

  GET DIAGNOSTICS v_logs_deletados = ROW_COUNT;

  -- Registrar limpeza
  INSERT INTO logs_auditoria (
    usuario_tipo,
    acao,
    categoria,
    descricao,
    severidade,
    sucesso
  )
  VALUES (
    'sistema',
    'limpeza_logs',
    'sistema',
    format('Limpeza automática de logs: %s logs deletados (> %s dias)', v_logs_deletados, v_dias_retencao),
    'info',
    TRUE
  );

  RETURN v_logs_deletados;
END;
$$;

COMMENT ON FUNCTION public.limpar_logs_antigos() IS
  'Deleta logs de auditoria antigos (apenas info/aviso).
   Logs de erro e crítico NUNCA são deletados.
   28-04 (USR-06 / RESEARCH Q2): categoria usuario/seguranca também NUNCA é deletada
   (trilha de gestão de usuários é append-only imutável).
   Usa dias_retencao_logs das configurações (padrão: 730 dias = 2 anos).
   Executar via cron job diário.
   Retorna número de logs deletados.';
