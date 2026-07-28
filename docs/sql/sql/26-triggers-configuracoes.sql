-- =====================================================
-- PRD-DB-005: Configurações e Sistema
-- Migration: 26-triggers-configuracoes
-- Description: Triggers para biblioteca de perguntas
-- Tasks: 8.1 - 8.7
-- =====================================================

-- =====================================================
-- TRIGGER FUNCTION: trigger_incrementar_uso_biblioteca()
-- Description: Incrementa total_usos e atualiza ultima_utilizacao
-- Usage: Executado automaticamente após INSERT em perguntas_vaga_origem
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_incrementar_uso_biblioteca()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Incrementar total_usos e atualizar ultima_utilizacao
  UPDATE biblioteca_perguntas
  SET
    total_usos = total_usos + 1,
    ultima_utilizacao = NOW()
  WHERE id = NEW.biblioteca_pergunta_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_incrementar_uso_biblioteca() IS
  'Incrementa contador de uso quando pergunta da biblioteca é usada em formulário.
   Trigger executado após INSERT em perguntas_vaga_origem.';

-- =====================================================
-- TRIGGER: after_insert_pergunta_origem
-- Description: Trigger para incrementar uso de biblioteca
-- =====================================================

DROP TRIGGER IF EXISTS after_insert_pergunta_origem ON perguntas_vaga_origem;

CREATE TRIGGER after_insert_pergunta_origem
  AFTER INSERT ON perguntas_vaga_origem
  FOR EACH ROW
  EXECUTE FUNCTION trigger_incrementar_uso_biblioteca();

COMMENT ON TRIGGER after_insert_pergunta_origem ON perguntas_vaga_origem IS
  'Incrementa total_usos da biblioteca_perguntas quando pergunta é usada.';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'after_insert_pergunta_origem';

  IF trigger_count >= 1 THEN
    RAISE NOTICE '✅ Migration 26: Trigger after_insert_pergunta_origem criado';
  ELSE
    RAISE EXCEPTION '❌ Migration 26: Trigger não encontrado';
  END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ Function trigger_incrementar_uso_biblioteca() criada
-- ✅ Trigger after_insert_pergunta_origem criado
-- ✅ Analytics de biblioteca_perguntas automatizado
-- =====================================================
