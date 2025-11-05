-- ============================================================================
-- Migration: 35-storage-gravacoes-entrevistas.sql
-- Description: Configuração do bucket Storage para transcrições de entrevistas (presencial e online)
-- Dependencies:
--   - PRD-DB-001 (usuarios_rh)
--   - PRD-DB-004 (entrevistas_online, entrevistas_presenciais)
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- Updated: 2025-11-03 (ajustado para transcrições)
-- ============================================================================


-- ============================================================================
-- 1. BUCKET: gravacoes-entrevistas
-- Description: Armazena transcrições de entrevistas (presencial e online)
-- USO: RH pode colar texto OU fazer upload de arquivo com transcrição
-- ============================================================================

-- Atualizar bucket privado com configuração para transcrições
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'gravacoes-entrevistas',
    'gravacoes-entrevistas',
    false,  -- Privado: apenas RH pode acessar
    10485760,  -- 10 MB em bytes (10 * 1024 * 1024) - suficiente para transcrições
    ARRAY['text/plain', 'application/json', 'application/pdf', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['text/plain', 'application/json', 'application/pdf', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];


-- ============================================================================
-- 2. RLS POLICIES: gravacoes-entrevistas
-- Description: Políticas de acesso ao storage de transcrições
-- ============================================================================

-- ✅ POLICIES JÁ CRIADAS: As 4 RLS policies abaixo foram criadas manualmente no Dashboard
-- e estão funcionando corretamente. Mantidas aqui para referência.
--
-- 📋 Instruções de uso: tasks/STORAGE_GRAVACOES_USAGE_GUIDE.md
-- 🔗 Dashboard: https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/storage/policies
--
-- Policies criadas (nomes no Dashboard):
-- 1. RH pode fazer upload de gravações 1vgveb6_0
-- 2. RH pode ler gravações 1vgveb6_0
-- 3. Apenas Admin pode atualizar gravações 1vgveb6_0
-- 4. Apenas Admin pode deletar gravações 1vgveb6_0

/*
-- Policy 1: RH pode fazer upload de transcrições (INSERT)
CREATE POLICY "RH pode fazer upload de gravações"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'gravacoes-entrevistas'
    AND EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = (SELECT auth.uid())
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- Policy 2: RH pode ler todas as transcrições (SELECT)
CREATE POLICY "RH pode ler gravações"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'gravacoes-entrevistas'
    AND EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = (SELECT auth.uid())
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- Policy 3: Apenas Administrador pode atualizar transcrições (UPDATE)
CREATE POLICY "Apenas Admin pode atualizar gravações"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'gravacoes-entrevistas'
    AND EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = (SELECT auth.uid())
        AND usuarios_rh.role = 'administrador'
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- Policy 4: Apenas Administrador pode deletar transcrições (DELETE)
CREATE POLICY "Apenas Admin pode deletar gravações"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'gravacoes-entrevistas'
    AND EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = (SELECT auth.uid())
        AND usuarios_rh.role = 'administrador'
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- IMPORTANTE: Candidato NÃO tem nenhuma policy aqui
-- Isso garante que candidatos não podem ver, fazer upload ou deletar transcrições
*/


-- ============================================================================
-- 3. DOCUMENTAÇÃO: ESTRUTURA DE PASTAS E USO
-- ============================================================================

/*
ESTRUTURA DE PASTAS RECOMENDADA:
gravacoes-entrevistas/
└── {candidato_id}/
    └── {entrevista_id}/
        └── transcricao.{ext}

EXEMPLOS:
gravacoes-entrevistas/
└── 550e8400-e29b-41d4-a716-446655440000/
    └── 7c9e6679-7425-40de-944b-e07fc1f90ae7/
        ├── transcricao.txt         (texto puro)
        ├── transcricao.json        (com timestamps/metadados)
        ├── transcricao.pdf         (formatado)
        └── transcricao.docx        (Word)

FORMATOS SUPORTADOS:
1. .txt  - Texto puro (text/plain)
2. .json - JSON com timestamps/estrutura (application/json)
3. .pdf  - PDF formatado (application/pdf)
4. .md   - Markdown (text/markdown)
5. .docx - Word (application/vnd.openxmlformats-officedocument.wordprocessingml.document)

NOTAS IMPORTANTES:
1. TAMANHO: Máximo 10 MB por arquivo (suficiente para transcrições longas)
2. USO DUPLO:
   - Campo 'transcricao' TEXT na tabela = texto colado pelo RH (preview/curto)
   - Campo 'gravacao_url' TEXT = referência ao arquivo no Storage (completo/formatado)
3. BACKEND: Validar tamanho e formato ANTES de enviar ao Storage
4. SEGURANÇA: Apenas RH pode acessar (candidato NÃO vê)
5. CLEANUP: Implementar política de retenção (ex: 1 ano após processo finalizado)
6. LGPD: Dados sensíveis - garantir compliance com retenção e exclusão

FLUXO DE USO - OPÇÃO 1 (Colar Texto):
1. RH visualiza página do candidato → aba Entrevista (presencial ou online)
2. RH cola texto da transcrição no campo de texto
3. Sistema salva em 'entrevistas_online.transcricao' ou 'entrevistas_presenciais.transcricao'
4. Nenhum upload para Storage necessário

FLUXO DE USO - OPÇÃO 2 (Upload de Arquivo):
1. RH visualiza página do candidato → aba Entrevista (presencial ou online)
2. RH clica em "Upload de Transcrição"
3. Sistema gera nome único: {candidato_id}/{entrevista_id}/transcricao.{ext}
4. Backend valida:
   - Tamanho < 10 MB
   - Formato válido (txt, json, pdf, md, docx)
   - Usuário é RH ativo
5. Upload para Storage
6. Atualizar campo 'gravacao_url' em entrevistas_online/entrevistas_presenciais
7. (Opcional) Extrair preview e salvar em campo 'transcricao' TEXT

USO RECOMENDADO:
- Transcrições curtas (< 5000 chars): colar direto no campo TEXT
- Transcrições longas/formatadas: fazer upload de arquivo (PDF, DOCX, JSON)
- Transcrições com timestamps: usar JSON e fazer upload
*/


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 35-storage-gravacoes-entrevistas.sql executada com sucesso';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Bucket atualizado para TRANSCRIÇÕES:';
    RAISE NOTICE '  - ID: gravacoes-entrevistas';
    RAISE NOTICE '  - Tipo: Privado';
    RAISE NOTICE '  - Tamanho máximo: 10 MB (suficiente para transcrições)';
    RAISE NOTICE '  - Formatos: TXT, JSON, PDF, Markdown, DOCX';
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS Policies (já configuradas no Dashboard):';
    RAISE NOTICE '  ✅ RH pode fazer upload de gravações 1vgveb6_0';
    RAISE NOTICE '  ✅ RH pode ler gravações 1vgveb6_0';
    RAISE NOTICE '  ✅ Admin pode atualizar gravações 1vgveb6_0';
    RAISE NOTICE '  ✅ Admin pode deletar gravações 1vgveb6_0';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Documentação: tasks/STORAGE_GRAVACOES_USAGE_GUIDE.md';
    RAISE NOTICE '🔗 Dashboard: https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/storage/buckets';
    RAISE NOTICE '';
    RAISE NOTICE 'Uso (2 opções):';
    RAISE NOTICE '  📝 OPÇÃO 1: RH cola texto → campo transcricao TEXT (curto)';
    RAISE NOTICE '  📤 OPÇÃO 2: RH faz upload → Storage + campo gravacao_url (completo)';
    RAISE NOTICE '';
    RAISE NOTICE 'Segurança:';
    RAISE NOTICE '  🔒 Candidato NÃO tem acesso (nenhuma policy para candidatos)';
    RAISE NOTICE '  🔒 Apenas Admin pode deletar (compliance/auditoria)';
    RAISE NOTICE '  🔒 Upload limitado a 10 MB (performance)';
    RAISE NOTICE '  🔒 Formatos validados no backend';
    RAISE NOTICE '';
    RAISE NOTICE 'Estrutura de pastas:';
    RAISE NOTICE '  {candidato_id}/{entrevista_id}/transcricao.{ext}';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '  1. ✅ 4 RLS policies já configuradas';
    RAISE NOTICE '  2. Implementar upload no frontend (página candidato → aba entrevistas)';
    RAISE NOTICE '  3. Implementar validação de tamanho/formato no backend';
    RAISE NOTICE '  4. Testar upload de TXT, JSON, PDF';
    RAISE NOTICE '  5. Testar que candidato NÃO consegue acessar';
    RAISE NOTICE '  6. Configurar política de retenção (LGPD)';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
