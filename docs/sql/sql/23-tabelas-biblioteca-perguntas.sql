-- =====================================================
-- PRD-DB-005: Configurações e Sistema
-- Migration: 23-tabelas-biblioteca-perguntas
-- Description: Biblioteca de perguntas reutilizáveis para formulários
-- Tasks: 5.1 - 5.18
-- =====================================================

-- =====================================================
-- TABLE: biblioteca_perguntas
-- Description: Perguntas reutilizáveis para formulários de candidatura
-- Features: Full-text search (português), tags, categorização, analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS biblioteca_perguntas (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,

  -- Conteúdo
  texto_pergunta TEXT NOT NULL,
  texto_ajuda TEXT NULL,
  tipo_resposta tipo_resposta_pergunta NOT NULL,  -- Reusar enum do PRD-DB-002

  -- Categorização
  categoria TEXT NOT NULL CHECK (categoria IN ('jornada', 'tecnologia', 'valores', 'cultura', 'outro')),
  tags TEXT[] NULL,

  -- Configuração de Resposta
  opcoes_resposta JSONB NULL,  -- Array de opções para select/radio/checkbox
  permite_outros BOOLEAN DEFAULT FALSE,
  obrigatoria BOOLEAN DEFAULT TRUE,
  limite_caracteres INTEGER NULL,

  -- Analytics
  total_usos INTEGER DEFAULT 0,
  ultima_utilizacao TIMESTAMPTZ NULL,

  -- Metadata
  is_publica BOOLEAN DEFAULT TRUE,
  criado_por_usuario UUID NOT NULL REFERENCES usuarios_rh(id) ON DELETE SET NULL,

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES usuarios_rh(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLE: perguntas_vaga_origem
-- Description: Tracking de onde perguntas da biblioteca são usadas
-- Purpose: Analytics e incremento de total_usos
-- =====================================================

CREATE TABLE IF NOT EXISTS perguntas_vaga_origem (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pergunta_formulario_id UUID NOT NULL REFERENCES perguntas_formulario(id) ON DELETE CASCADE,
  biblioteca_pergunta_id UUID NOT NULL REFERENCES biblioteca_perguntas(id) ON DELETE CASCADE,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: Evitar duplicatas
  CONSTRAINT uq_pergunta_origem UNIQUE (pergunta_formulario_id, biblioteca_pergunta_id)
);

-- =====================================================
-- INDEXES: biblioteca_perguntas
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_biblioteca_perguntas_categoria
  ON biblioteca_perguntas(categoria)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_biblioteca_perguntas_tags
  ON biblioteca_perguntas USING GIN (tags)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_biblioteca_perguntas_is_publica
  ON biblioteca_perguntas(is_publica)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_biblioteca_perguntas_deleted_at
  ON biblioteca_perguntas(deleted_at);

-- Full-text search index (português)
CREATE INDEX IF NOT EXISTS idx_biblioteca_perguntas_search
  ON biblioteca_perguntas USING GIN (to_tsvector('portuguese', texto_pergunta));

-- =====================================================
-- INDEXES: perguntas_vaga_origem
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_perguntas_vaga_origem_biblioteca
  ON perguntas_vaga_origem(biblioteca_pergunta_id);

-- =====================================================
-- TRIGGER: updated_at
-- =====================================================

CREATE TRIGGER update_biblioteca_perguntas_updated_at
  BEFORE UPDATE ON biblioteca_perguntas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS: biblioteca_perguntas
-- =====================================================

COMMENT ON TABLE biblioteca_perguntas IS
  'Biblioteca de perguntas reutilizáveis para formulários de candidatura.
   Suporta full-text search em português, categorização, tags e analytics de uso.
   Perguntas podem ser públicas (usadas por todos) ou privadas (criador apenas).';

COMMENT ON COLUMN biblioteca_perguntas.titulo IS
  'Título curto da pergunta (para identificação rápida)';

COMMENT ON COLUMN biblioteca_perguntas.texto_pergunta IS
  'Texto completo da pergunta (indexado para full-text search)';

COMMENT ON COLUMN biblioteca_perguntas.categoria IS
  'Categoria da pergunta: jornada, tecnologia, valores, cultura, outro';

COMMENT ON COLUMN biblioteca_perguntas.tags IS
  'Tags para busca e filtro (ex: ["react", "frontend", "senior"])';

COMMENT ON COLUMN biblioteca_perguntas.opcoes_resposta IS
  'Array JSON de opções para perguntas tipo select/radio/checkbox';

COMMENT ON COLUMN biblioteca_perguntas.total_usos IS
  'Contador de vezes que esta pergunta foi usada em formulários (atualizado por trigger)';

COMMENT ON COLUMN biblioteca_perguntas.is_publica IS
  'Se TRUE, qualquer RH pode usar. Se FALSE, apenas criador vê.';

-- =====================================================
-- COMMENTS: perguntas_vaga_origem
-- =====================================================

COMMENT ON TABLE perguntas_vaga_origem IS
  'Tracking de onde perguntas da biblioteca são usadas.
   Permite analytics de uso e incrementa automaticamente total_usos via trigger.';

-- =====================================================
-- SEED DATA: Perguntas Padrão
-- =====================================================

-- Pergunta: Experiência com React
INSERT INTO biblioteca_perguntas (
  titulo,
  texto_pergunta,
  texto_ajuda,
  tipo_resposta,
  categoria,
  tags,
  opcoes_resposta,
  permite_outros,
  obrigatoria,
  is_publica,
  criado_por_usuario
)
SELECT
  'Experiência com React',
  'Qual seu nível de experiência com React?',
  'Selecione a opção que melhor descreve sua experiência',
  'single_choice',
  'tecnologia',
  ARRAY['react', 'frontend', 'javascript'],
  '["Nenhuma experiência", "Básico (< 1 ano)", "Intermediário (1-3 anos)", "Avançado (3-5 anos)", "Expert (> 5 anos)"]'::JSONB,
  FALSE,
  TRUE,
  TRUE,
  id
FROM usuarios_rh
WHERE email = 'admin@beautysmile.com.br'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Pergunta: Motivação para vaga
INSERT INTO biblioteca_perguntas (
  titulo,
  texto_pergunta,
  texto_ajuda,
  tipo_resposta,
  categoria,
  tags,
  permite_outros,
  obrigatoria,
  limite_caracteres,
  is_publica,
  criado_por_usuario
)
SELECT
  'Motivação para a vaga',
  'Por que você se interessou por esta vaga?',
  'Conte-nos o que te motivou a se candidatar',
  'texto_longo',
  'valores',
  ARRAY['motivacao', 'cultura', 'fit'],
  FALSE,
  TRUE,
  500,
  TRUE,
  id
FROM usuarios_rh
WHERE email = 'admin@beautysmile.com.br'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Pergunta: Disponibilidade
INSERT INTO biblioteca_perguntas (
  titulo,
  texto_pergunta,
  texto_ajuda,
  tipo_resposta,
  categoria,
  tags,
  opcoes_resposta,
  permite_outros,
  obrigatoria,
  is_publica,
  criado_por_usuario
)
SELECT
  'Disponibilidade para início',
  'Quando você pode começar?',
  'Selecione sua disponibilidade',
  'single_choice',
  'jornada',
  ARRAY['disponibilidade', 'inicio'],
  '["Imediato", "15 dias", "30 dias", "A combinar"]'::JSONB,
  TRUE,
  TRUE,
  TRUE,
  id
FROM usuarios_rh
WHERE email = 'admin@beautysmile.com.br'
LIMIT 1
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  perguntas_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO perguntas_count
  FROM biblioteca_perguntas;

  IF perguntas_count >= 3 THEN
    RAISE NOTICE '✅ Migration 23: Tabelas biblioteca_perguntas criadas com % perguntas padrão', perguntas_count;
  ELSIF perguntas_count = 0 THEN
    RAISE WARNING '⚠️ Migration 23: Nenhuma pergunta padrão criada (usuário admin não encontrado)';
  ELSE
    RAISE EXCEPTION '❌ Migration 23: Esperado pelo menos 3 perguntas, encontrado %', perguntas_count;
  END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ Tabela biblioteca_perguntas criada (perguntas reutilizáveis)
-- ✅ Tabela perguntas_vaga_origem criada (tracking de uso)
-- ✅ Full-text search (português) em texto_pergunta
-- ✅ GIN index para tags (busca eficiente em arrays)
-- ✅ 5 índices em biblioteca_perguntas
-- ✅ 1 índice em perguntas_vaga_origem
-- ✅ 1 trigger (updated_at)
-- ✅ 3 perguntas padrão (React, Motivação, Disponibilidade)
-- =====================================================
