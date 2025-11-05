-- ==============================================
-- 13 - Tabela Candidaturas
-- PRD-DB-002: Estrutura de Vagas e Candidaturas
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- TABELA: candidaturas
-- ==============================================
-- Registra cada candidatura de um candidato a uma vaga
-- Controla etapas do processo seletivo e armazena análises IA
-- Suporta múltiplas candidaturas por candidato (vagas diferentes)

CREATE TABLE candidaturas (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidato_id UUID NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
    vaga_id UUID NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,

    -- Controle de Etapa
    etapa_atual etapa_processo NOT NULL DEFAULT 'triagem',
    status status_candidatura NOT NULL DEFAULT 'aguardando_resposta',

    -- Timestamps de Progresso (cada etapa)
    data_candidatura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_formulario_enviado TIMESTAMPTZ,
    data_bigfive_enviado TIMESTAMPTZ,
    data_disc_enviado TIMESTAMPTZ,
    data_raven_enviado TIMESTAMPTZ,
    data_cultura_enviado TIMESTAMPTZ,
    data_entrevista_online TIMESTAMPTZ,
    data_entrevista_presencial TIMESTAMPTZ,
    data_decisao_final TIMESTAMPTZ,

    -- Currículo
    curriculo_url TEXT,
    curriculo_nome_original TEXT,
    curriculo_tamanho_bytes INTEGER,

    -- Analytics
    tempo_preenchimento_segundos INTEGER,
    origem_candidatura TEXT,

    -- Análise IA (N8N) - Resultados em JSONB
    analise_ia_formulario JSONB,
    analise_ia_bigfive JSONB,
    analise_ia_disc JSONB,
    analise_ia_raven JSONB,
    analise_ia_cultura JSONB,
    analise_ia_entrevista_online JSONB,
    analise_ia_entrevista_presencial JSONB,

    -- Score Geral Consolidado
    score_geral DECIMAL(5,2),

    -- Feedback e Notas
    feedback_rejeicao TEXT,
    observacoes_rh TEXT,

    -- Flags
    is_rascunho BOOLEAN NOT NULL DEFAULT FALSE,
    is_favorito BOOLEAN NOT NULL DEFAULT FALSE,

    -- Campos de Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- ==============================================
    -- CONSTRAINTS
    -- ==============================================

    -- Candidato não pode se candidatar 2x para mesma vaga
    CONSTRAINT unique_candidato_vaga UNIQUE (candidato_id, vaga_id),

    -- Score deve estar entre 0 e 100
    CONSTRAINT score_range_check CHECK (
        score_geral IS NULL OR
        (score_geral >= 0 AND score_geral <= 100)
    )
);

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON TABLE candidaturas IS
'Registra candidaturas de candidatos a vagas. Controla progresso nas etapas do processo seletivo (triagem → bigfive → disc → entrevista_online → raven → cultura → entrevista_presencial → aprovado/rejeitado). Armazena análises IA de cada etapa e score consolidado.';

COMMENT ON COLUMN candidaturas.id IS 'Identificador único da candidatura (UUID v4)';
COMMENT ON COLUMN candidaturas.candidato_id IS 'FK para candidatos.id. Quem está se candidatando.';
COMMENT ON COLUMN candidaturas.vaga_id IS 'FK para vagas.id. Qual vaga o candidato está aplicando.';
COMMENT ON COLUMN candidaturas.etapa_atual IS 'Etapa atual do processo seletivo. Enum: triagem, bigfive, disc, entrevista_online, raven, cultura, entrevista_presencial, aprovado, rejeitado.';
COMMENT ON COLUMN candidaturas.status IS 'Status da candidatura na etapa atual. Enum: aguardando_resposta, em_analise, aprovado_proxima, rejeitado, finalizado.';
COMMENT ON COLUMN candidaturas.score_geral IS 'Score consolidado de 0-100 calculado pela function calcular_score_geral(). Média ponderada de todas as análises IA.';
COMMENT ON COLUMN candidaturas.is_rascunho IS 'Se TRUE, candidatura foi salva mas não enviada. Não aparece para RH até envio final.';
COMMENT ON COLUMN candidaturas.is_favorito IS 'Se TRUE, RH marcou candidato como favorito para facilitar busca.';
COMMENT ON COLUMN candidaturas.analise_ia_formulario IS 'Resultado análise IA do formulário de triagem. JSONB com score, feedback, match, etc.';
COMMENT ON COLUMN candidaturas.tempo_preenchimento_segundos IS 'Quanto tempo levou para preencher formulário (analytics oculto). Calculado do início ao envio.';
COMMENT ON COLUMN candidaturas.deleted_at IS 'Soft delete: se preenchido, candidatura foi deletada logicamente. Filtrar com WHERE deleted_at IS NULL.';

-- ==============================================
-- ÍNDICES
-- ==============================================

-- Index para buscar candidaturas de um candidato
CREATE INDEX idx_candidaturas_candidato_id ON candidaturas(candidato_id)
WHERE deleted_at IS NULL;

-- Index para buscar candidatos de uma vaga
CREATE INDEX idx_candidaturas_vaga_id ON candidaturas(vaga_id)
WHERE deleted_at IS NULL;

-- Index composto para filtros complexos (vaga + etapa + status)
CREATE INDEX idx_candidaturas_vaga_etapa_status ON candidaturas(vaga_id, etapa_atual, status)
WHERE deleted_at IS NULL AND is_rascunho = FALSE;

-- Index para ignorar rascunhos
CREATE INDEX idx_candidaturas_is_rascunho ON candidaturas(is_rascunho)
WHERE deleted_at IS NULL;

-- Index para soft delete
CREATE INDEX idx_candidaturas_deleted_at ON candidaturas(deleted_at);

-- Index para ordenar por score (performance em listagens)
CREATE INDEX idx_candidaturas_score_geral ON candidaturas(score_geral DESC NULLS LAST)
WHERE deleted_at IS NULL AND is_rascunho = FALSE;

-- Index para buscar favoritos
CREATE INDEX idx_candidaturas_favorito ON candidaturas(vaga_id, is_favorito)
WHERE deleted_at IS NULL AND is_favorito = TRUE;

-- Index composto para dashboard RH (vaga + status)
CREATE INDEX idx_candidaturas_vaga_status ON candidaturas(vaga_id, status)
WHERE deleted_at IS NULL AND is_rascunho = FALSE;

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger para atualizar automaticamente updated_at
-- Usa função update_updated_at_column() criada no PRD-DB-001
CREATE TRIGGER update_candidaturas_updated_at
    BEFORE UPDATE ON candidaturas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_candidaturas_updated_at ON candidaturas IS
'Atualiza automaticamente o campo updated_at sempre que a candidatura é modificada. Usa função do PRD-DB-001.';

-- ==============================================
-- VALIDAÇÃO
-- ==============================================

-- Verificar se tabela foi criada corretamente
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'candidaturas' AND table_schema = 'public') AS total_columns,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = 'candidaturas' AND table_schema = 'public') AS total_constraints
FROM information_schema.tables
WHERE table_name = 'candidaturas' AND table_schema = 'public';

-- Verificar foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'candidaturas'
ORDER BY tc.constraint_name;

-- Verificar índices
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'candidaturas' AND schemaname = 'public'
ORDER BY indexname;

-- Verificar trigger
SELECT
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'candidaturas'
ORDER BY trigger_name;

-- ==============================================
-- FIM DO SCRIPT 13-tabela-candidaturas.sql
-- ==============================================
