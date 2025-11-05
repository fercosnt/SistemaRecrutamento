-- ==============================================
-- 08 - Storage: Bucket de Avatares
-- PRD-DB-001: Estrutura de Autenticação e Usuários
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- NOTAS DE IMPLEMENTAÇÃO
-- ==============================================

-- O bucket 'avatars' deve ser criado via Supabase Dashboard ou SQL:
-- 1. Acesse: Supabase Dashboard → Storage
-- 2. Clique em "Create bucket"
-- 3. Configurações:
--    - Name: avatars
--    - Public bucket: FALSE (privado)
--    - File size limit: 2 MB
--    - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp

-- ==============================================
-- CRIAR BUCKET VIA SQL
-- ==============================================

-- Inserir bucket na tabela storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    FALSE,  -- Bucket privado
    2097152,  -- 2 MB em bytes (2 * 1024 * 1024)
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- RLS POLICIES PARA STORAGE
-- ==============================================

-- Policy 1: Usuários podem fazer upload do próprio avatar
CREATE POLICY "Usuarios podem fazer upload do proprio avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (
        -- Candidatos só podem fazer upload no caminho candidatos/{user_id}/*
        (
            auth.uid()::text = (storage.foldername(name))[1] AND
            (storage.foldername(name))[1] IN (
                SELECT user_id::text FROM candidatos WHERE user_id = auth.uid()
            )
        )
        OR
        -- Usuários RH podem fazer upload no caminho rh/{user_id}/*
        (
            auth.uid()::text = (storage.foldername(name))[1] AND
            (storage.foldername(name))[1] IN (
                SELECT user_id::text FROM usuarios_rh WHERE user_id = auth.uid()
            )
        )
    )
);

-- Policy 2: Usuários podem atualizar o próprio avatar
CREATE POLICY "Usuarios podem atualizar proprio avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Usuários podem deletar o próprio avatar
CREATE POLICY "Usuarios podem deletar proprio avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Usuários podem ver o próprio avatar
CREATE POLICY "Usuarios podem ver proprio avatar"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 5: RH pode ver avatares de todos os candidatos
CREATE POLICY "RH pode ver avatares de candidatos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'avatars' AND
    EXISTS (
        SELECT 1 FROM usuarios_rh
        WHERE usuarios_rh.user_id = auth.uid()
        AND usuarios_rh.ativo = TRUE
        AND usuarios_rh.deleted_at IS NULL
    )
);

-- ==============================================
-- ESTRUTURA DE PASTAS
-- ==============================================

-- A estrutura de pastas no bucket 'avatars' segue o padrão:
-- avatars/
-- ├── candidatos/
-- │   ├── {user_id}/
-- │   │   └── avatar.{ext}  (jpg, jpeg, png, webp)
-- └── rh/
--     ├── {user_id}/
--     │   └── avatar.{ext}  (jpg, jpeg, png, webp)

-- Exemplo de caminho:
-- avatars/candidatos/550e8400-e29b-41d4-a716-446655440000/avatar.jpg
-- avatars/rh/660e8400-e29b-41d4-a716-446655440000/avatar.png

-- ==============================================
-- FUNÇÕES AUXILIARES PARA AVATAR
-- ==============================================

-- Função para gerar URL pública do avatar (válida por 1 hora)
CREATE OR REPLACE FUNCTION get_avatar_url(user_type TEXT, user_uuid UUID, file_extension TEXT DEFAULT 'jpg')
RETURNS TEXT AS $
DECLARE
    file_path TEXT;
BEGIN
    -- Construir o caminho do arquivo
    file_path := user_type || '/' || user_uuid::text || '/avatar.' || file_extension;

    -- Retornar URL assinada (válida por 1 hora)
    -- Esta é uma URL de exemplo. Na prática, use a função storage.get_signed_url() do Supabase SDK
    RETURN format('https://isljnozzlvckrgjjbjwp.supabase.co/storage/v1/object/sign/avatars/%s', file_path);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_avatar_url(TEXT, UUID, TEXT) IS 'Gera URL assinada para avatar do usuário';

-- ==============================================
-- EXEMPLOS DE USO (Frontend)
-- ==============================================

/*

// Upload de avatar (JavaScript/TypeScript com Supabase SDK)

// 1. Upload de avatar para candidato
const uploadCandidatoAvatar = async (file: File) => {
    const { data: user } = await supabase.auth.getUser();
    const filePath = `candidatos/${user.id}/avatar.${file.name.split('.').pop()}`;

    const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true  // Sobrescrever se já existir
        });

    if (error) {
        console.error('Erro ao fazer upload:', error);
        return null;
    }

    // Atualizar URL do avatar na tabela candidatos
    await supabase
        .from('candidatos')
        .update({ avatar_url: data.path })
        .eq('user_id', user.id);

    return data.path;
};

// 2. Obter URL pública do avatar
const getAvatarUrl = (avatarPath: string) => {
    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(avatarPath);

    return data.publicUrl;
};

// 3. Download de avatar
const downloadAvatar = async (avatarPath: string) => {
    const { data, error } = await supabase.storage
        .from('avatars')
        .download(avatarPath);

    if (error) {
        console.error('Erro ao fazer download:', error);
        return null;
    }

    return URL.createObjectURL(data);
};

// 4. Deletar avatar
const deleteAvatar = async () => {
    const { data: user } = await supabase.auth.getUser();
    const filePath = `candidatos/${user.id}/avatar.jpg`;  // Ajustar extensão

    const { error } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

    if (error) {
        console.error('Erro ao deletar:', error);
        return false;
    }

    // Limpar URL do avatar na tabela
    await supabase
        .from('candidatos')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

    return true;
};

*/

-- ==============================================
-- VALIDAÇÕES E SEGURANÇA
-- ==============================================

-- IMPORTANTE:
-- 1. Validar tipo MIME no frontend antes do upload
-- 2. Validar tamanho do arquivo (max 2MB) no frontend
-- 3. Comprimir imagens grandes antes do upload
-- 4. Usar nomes de arquivo consistentes (ex: sempre 'avatar.jpg')
-- 5. Implementar rate limiting para uploads (evitar abuso)

-- FORMATOS ACEITOS:
-- - JPEG (.jpg, .jpeg) - Recomendado para fotos
-- - PNG (.png) - Recomendado para logos/imagens com transparência
-- - WebP (.webp) - Melhor compressão, suporte moderno

-- TAMANHO RECOMENDADO:
-- - Imagem original: max 2 MB
-- - Dimensões recomendadas: 500x500px (quadrado)
-- - Considere redimensionar/comprimir no frontend antes do upload

-- ==============================================
-- FIM DO SCRIPT 08-storage-avatars.sql
-- ==============================================
