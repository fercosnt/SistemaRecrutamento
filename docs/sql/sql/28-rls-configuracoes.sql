-- =====================================================
-- PRD-DB-005: Configurações e Sistema
-- Migration: 28-rls-configuracoes
-- Description: Row Level Security policies para configurações
-- Tasks: 9.1 - 9.22
-- =====================================================

-- =====================================================
-- RLS: configuracoes_empresa (SINGLETON)
-- Permissions: Admin apenas (READ/WRITE)
-- =====================================================

ALTER TABLE configuracoes_empresa ENABLE ROW LEVEL SECURITY;

-- Policy: Admin lê configurações
CREATE POLICY "Admin lê configurações"
  ON configuracoes_empresa
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND role = 'administrador'
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
  );

-- Policy: Admin edita configurações
CREATE POLICY "Admin edita configurações"
  ON configuracoes_empresa
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND role = 'administrador'
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND role = 'administrador'
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
  );

-- =====================================================
-- RLS: templates_email
-- Permissions: Admin/Recrutador READ, Admin WRITE
-- =====================================================

ALTER TABLE templates_email ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Recrutador veem templates
CREATE POLICY "Admin/Recrutador veem templates"
  ON templates_email
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND role IN ('administrador', 'recrutador')
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
  );

-- Policy: Admin edita templates
CREATE POLICY "Admin edita templates"
  ON templates_email
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND role = 'administrador'
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND role = 'administrador'
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
  );

-- =====================================================
-- RLS: webhooks_config
-- Permissions: Admin/Recrutador READ, Admin WRITE
-- =====================================================

ALTER TABLE webhooks_config ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Recrutador veem webhooks
CREATE POLICY "Admin/Recrutador veem webhooks"
  ON webhooks_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND role IN ('administrador', 'recrutador')
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
  );

-- Policy: Admin edita webhooks
CREATE POLICY "Admin edita webhooks"
  ON webhooks_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND role = 'administrador'
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND role = 'administrador'
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
  );

-- =====================================================
-- RLS: webhooks_logs (IMUTÁVEL)
-- Permissions: Admin READ apenas
-- =====================================================

ALTER TABLE webhooks_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin vê logs de webhooks
CREATE POLICY "Admin vê logs de webhooks"
  ON webhooks_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND role = 'administrador'
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
  );

-- =====================================================
-- RLS: biblioteca_perguntas
-- Permissions: RH READ (public or own), RH INSERT, RH UPDATE (own)
-- =====================================================

ALTER TABLE biblioteca_perguntas ENABLE ROW LEVEL SECURITY;

-- Policy: RH vê biblioteca (pública ou própria)
CREATE POLICY "RH vê biblioteca"
  ON biblioteca_perguntas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
    AND (
      is_publica = TRUE
      OR criado_por_usuario = (SELECT auth.uid())
    )
  );

-- Policy: RH cria perguntas
CREATE POLICY "RH cria perguntas"
  ON biblioteca_perguntas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
    AND criado_por_usuario = (SELECT auth.uid())
  );

-- Policy: RH edita próprias perguntas
CREATE POLICY "RH edita próprias perguntas"
  ON biblioteca_perguntas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
    AND criado_por_usuario = (SELECT auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
    AND criado_por_usuario = (SELECT auth.uid())
  );

-- =====================================================
-- RLS: logs_auditoria (IMUTÁVEL)
-- Permissions: Admin READ, System INSERT
-- =====================================================

ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Policy: Admin vê logs
CREATE POLICY "Admin vê logs"
  ON logs_auditoria
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_rh
      WHERE id = (SELECT auth.uid())
        AND role = 'administrador'
        AND ativo = TRUE
        AND deleted_at IS NULL
    )
  );

-- Policy: Sistema insere logs (via function log_auditoria)
CREATE POLICY "Sistema insere logs"
  ON logs_auditoria
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);  -- Function log_auditoria() usa SECURITY DEFINER

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  rls_enabled_count INTEGER;
  policies_count INTEGER;
BEGIN
  -- Verificar que RLS está habilitado nas 6 tabelas
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'configuracoes_empresa',
      'templates_email',
      'webhooks_config',
      'webhooks_logs',
      'biblioteca_perguntas',
      'logs_auditoria'
    )
    AND rowsecurity = TRUE;

  IF rls_enabled_count < 6 THEN
    RAISE WARNING '⚠️ Migration 28: RLS habilitado em % de 6 tabelas', rls_enabled_count;
  END IF;

  -- Verificar número de policies criadas
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'configuracoes_empresa',
      'templates_email',
      'webhooks_config',
      'webhooks_logs',
      'biblioteca_perguntas',
      'logs_auditoria'
    );

  IF policies_count >= 12 THEN
    RAISE NOTICE '✅ Migration 28: RLS habilitado em % tabelas com % policies', rls_enabled_count, policies_count;
  ELSE
    RAISE WARNING '⚠️ Migration 28: Esperado pelo menos 12 policies, encontrado %', policies_count;
  END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ RLS habilitado em 6 tabelas
-- ✅ configuracoes_empresa: 2 policies (Admin READ/WRITE)
-- ✅ templates_email: 2 policies (Admin/Gerente READ, Admin WRITE)
-- ✅ webhooks_config: 2 policies (Admin/Gerente READ, Admin WRITE)
-- ✅ webhooks_logs: 1 policy (Admin READ)
-- ✅ biblioteca_perguntas: 3 policies (RH READ public/own, INSERT, UPDATE own)
-- ✅ logs_auditoria: 2 policies (Admin READ, System INSERT)
-- TOTAL: 12 policies
-- =====================================================
