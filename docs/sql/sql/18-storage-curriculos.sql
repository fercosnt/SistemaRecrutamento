-- ==============================================
-- 18 - Storage para Currículos
-- PRD-DB-002: Estrutura de Vagas e Candidaturas
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- CRIAR BUCKET: curriculos
-- ==============================================
-- Armazena currículos dos candidatos (PDF, DOCX, DOC)
-- Privado com RLS para controle de acesso
-- Máximo 5 MB por arquivo

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'curriculos',
    'curriculos',
    false, -- Bucket privado
    5242880, -- 5 MB em bytes (5 * 1024 * 1024)
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==============================================
-- ESTRUTURA DE PASTAS
-- ==============================================
/*
Estrutura de armazenamento:

curriculos/
  ├── {candidato_id}/
  │   ├── {vaga_id}/
  │   │   └── curriculo.{ext}

Exemplo:
curriculos/
  ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890/
  │   ├── vaga-123.../
  │   │   └── curriculo.pdf
  │   ├── vaga-456.../
  │       └── curriculo.pdf

Regras:
- Cada candidato tem sua pasta (candidato_id)
- Dentro dela, uma pasta por vaga (vaga_id)
- Nome do arquivo sempre: curriculo.{ext}
- Extensões permitidas: .pdf, .docx, .doc
*/

-- ==============================================
-- RLS POLICIES: storage.objects (curriculos)
-- ==============================================

-- Policy 1: Candidato pode fazer upload apenas na sua própria pasta
CREATE POLICY "Candidato faz upload de currículo"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'curriculos' AND
        -- Validar que o caminho começa com o candidato_id do usuário
        (storage.foldername(name))[1] = (
            SELECT id::text
            FROM candidatos
            WHERE user_id = (SELECT auth.uid())
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Policy 2: Candidato pode ler apenas seus próprios currículos
CREATE POLICY "Candidato lê próprios currículos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'curriculos' AND
        -- Validar que o caminho começa com o candidato_id do usuário
        (storage.foldername(name))[1] = (
            SELECT id::text
            FROM candidatos
            WHERE user_id = (SELECT auth.uid())
            AND deleted_at IS NULL
        )
    );

-- Policy 3: RH pode ler currículos de candidatos das vagas que tem acesso
CREATE POLICY "RH lê currículos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'curriculos' AND
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Policy 4: Candidato pode atualizar seus próprios currículos
CREATE POLICY "Candidato atualiza próprios currículos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'curriculos' AND
        (storage.foldername(name))[1] = (
            SELECT id::text
            FROM candidatos
            WHERE user_id = (SELECT auth.uid())
            AND deleted_at IS NULL
        )
    );

-- Policy 5: Apenas Admin pode deletar currículos
CREATE POLICY "Admin deleta currículos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'curriculos' AND
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = (SELECT auth.uid())
            AND role = 'administrador'
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- ==============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ==============================================

COMMENT ON TABLE storage.buckets IS
'Buckets de armazenamento do Supabase Storage. Bucket "curriculos" armazena currículos dos candidatos (PDF, DOCX, DOC) com limite de 5MB e RLS policies para controle de acesso.';

-- ==============================================
-- VALIDAÇÃO
-- ==============================================

-- Verificar se bucket foi criado corretamente
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'curriculos';

-- Contar policies do bucket
SELECT COUNT(*) AS total_policies
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%currículos%' OR policyname LIKE '%curriculo%';

-- Listar policies do storage
SELECT
    policyname,
    cmd AS command,
    roles,
    qual AS using_expression
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND (policyname LIKE '%currículos%' OR policyname LIKE '%curriculo%')
ORDER BY policyname;

-- ==============================================
-- INSTRUÇÕES DE USO
-- ==============================================

/*
## Como usar o bucket de currículos no frontend:

### 1. Upload de currículo (Candidato)
```typescript
import { supabase } from './supabaseClient';

async function uploadCurriculo(
  candidatoId: string,
  vagaId: string,
  file: File
) {
  const ext = file.name.split('.').pop();
  const filePath = `${candidatoId}/${vagaId}/curriculo.${ext}`;

  const { data, error } = await supabase.storage
    .from('curriculos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true // Permite substituir currículo existente
    });

  if (error) throw error;

  // Atualizar candidatura com URL do currículo
  const { data: publicUrl } = supabase.storage
    .from('curriculos')
    .getPublicUrl(filePath);

  await supabase
    .from('candidaturas')
    .update({
      curriculo_url: publicUrl.publicUrl,
      curriculo_nome_original: file.name,
      curriculo_tamanho_bytes: file.size
    })
    .eq('id', candidaturaId);
}
```

### 2. Download de currículo (Candidato ou RH)
```typescript
async function downloadCurriculo(curriculoUrl: string) {
  const path = curriculoUrl.split('/curriculos/')[1];

  const { data, error } = await supabase.storage
    .from('curriculos')
    .download(path);

  if (error) throw error;

  // Criar blob URL para download
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'curriculo.pdf';
  a.click();
}
```

### 3. Validações no Frontend
- Tamanho máximo: 5 MB
- Formatos: .pdf, .docx, .doc
- Validar antes de fazer upload

```typescript
function validarCurriculo(file: File): boolean {
  const maxSize = 5 * 1024 * 1024; // 5 MB
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (file.size > maxSize) {
    alert('Arquivo muito grande. Máximo 5 MB.');
    return false;
  }

  if (!allowedTypes.includes(file.type)) {
    alert('Formato inválido. Apenas PDF, DOC e DOCX.');
    return false;
  }

  return true;
}
```
*/

-- ==============================================
-- FIM DO SCRIPT 18-storage-curriculos.sql
-- ==============================================
