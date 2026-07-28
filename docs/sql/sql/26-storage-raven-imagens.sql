-- ============================================================================
-- Migration: 26-storage-raven-imagens.sql
-- Description: Configuração do Supabase Storage para imagens do teste Raven
-- Dependencies: PRD-DB-001 (usuarios_rh com role='administrador')
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- ============================================================================

-- ============================================================================
-- IMPORTANTE: INSTRUÇÕES DE CONFIGURAÇÃO DO STORAGE
-- ============================================================================
-- Este arquivo documenta a configuração do bucket de Storage para as imagens
-- do teste de Matrizes Progressivas de Raven.
--
-- O bucket deve ser criado manualmente via:
-- 1. Supabase Dashboard: Storage → New Bucket
-- 2. Supabase CLI: `supabase storage create raven-imagens --public`
--
-- Após criar o bucket, execute as policies SQL abaixo.
-- ============================================================================


-- ============================================================================
-- 1. CONFIGURAÇÃO DO BUCKET 'raven-imagens'
-- ============================================================================

-- CRIAR BUCKET (via Dashboard ou CLI):
-- Nome: raven-imagens
-- Público: SIM (para permitir acesso sem autenticação)
-- File size limit: 500 KB (512000 bytes)
-- Allowed MIME types: image/png, image/webp
--
-- COMANDO CLI (alternativa):
-- supabase storage create raven-imagens --public


-- ============================================================================
-- 2. ESTRUTURA DE PASTAS RECOMENDADA
-- ============================================================================

-- Estrutura de organização dos arquivos no bucket:
--
-- NOMENCLATURA: {SÉRIE}{QUESTÃO}.webp para matriz, {SÉRIE}{QUESTÃO}.{OPÇÃO}.webp para opções
-- Séries: A (q1-12), B (q13-24), C (q25-36), D (q37-48), E (q49-60)
-- Opções: 6 ou 8 por questão (varia conforme a série)
--
-- raven-imagens/
-- ├── versao-1/
-- │   ├── A1.webp                (Matriz série A, questão 1)
-- │   ├── A1.1.webp              (Opção 1 da questão A1)
-- │   ├── A1.2.webp              (Opção 2 da questão A1)
-- │   ├── ...
-- │   ├── A1.6.webp              (Opção 6 da questão A1)
-- │   ├── A2.webp                (Matriz série A, questão 2)
-- │   ├── A2.1.webp
-- │   ├── ...
-- │   ├── A12.webp               (Última questão série A)
-- │   ├── B1.webp                (Primeira questão série B)
-- │   ├── ...
-- │   ├── E12.webp               (Última questão série E = questão 60)
-- │   └── E12.8.webp             (Última opção da última questão)
-- └── versao-2/
--     └── ...
--
-- URLs resultantes:
-- https://{project_ref}.supabase.co/storage/v1/object/public/raven-imagens/versao-1/A1.webp
-- https://{project_ref}.supabase.co/storage/v1/object/public/raven-imagens/versao-1/A1.1.webp


-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES PARA O BUCKET
-- ============================================================================

-- Policy 1: Público pode ler imagens (GET/HEAD)
-- Permite que qualquer usuário (autenticado ou não) visualize as imagens
CREATE POLICY "Público pode ler imagens Raven"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'raven-imagens');

COMMENT ON POLICY "Público pode ler imagens Raven" ON storage.objects IS 'Permite acesso público de leitura às imagens do teste Raven.';


-- Policy 2: Apenas Admin pode fazer upload (INSERT)
-- Apenas usuários com role='administrador' podem fazer upload de novas imagens
CREATE POLICY "Admin pode fazer upload imagens Raven"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'raven-imagens'
    AND EXISTS (
        SELECT 1
        FROM usuarios_rh u
        WHERE u.id = (SELECT auth.uid())
          AND u.role = 'administrador'
          AND u.ativo = TRUE
    )
);

COMMENT ON POLICY "Admin pode fazer upload imagens Raven" ON storage.objects IS 'Apenas administradores ativos podem fazer upload de imagens do teste Raven.';


-- Policy 3: Apenas Admin pode atualizar imagens (UPDATE)
-- Apenas usuários com role='administrador' podem atualizar imagens existentes
CREATE POLICY "Admin pode atualizar imagens Raven"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'raven-imagens'
    AND EXISTS (
        SELECT 1
        FROM usuarios_rh u
        WHERE u.id = (SELECT auth.uid())
          AND u.role = 'administrador'
          AND u.ativo = TRUE
    )
)
WITH CHECK (
    bucket_id = 'raven-imagens'
    AND EXISTS (
        SELECT 1
        FROM usuarios_rh u
        WHERE u.id = (SELECT auth.uid())
          AND u.role = 'administrador'
          AND u.ativo = TRUE
    )
);

COMMENT ON POLICY "Admin pode atualizar imagens Raven" ON storage.objects IS 'Apenas administradores ativos podem atualizar imagens existentes do teste Raven.';


-- Policy 4: Apenas Admin pode deletar imagens (DELETE)
-- Apenas usuários com role='administrador' podem deletar imagens
CREATE POLICY "Admin pode deletar imagens Raven"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'raven-imagens'
    AND EXISTS (
        SELECT 1
        FROM usuarios_rh u
        WHERE u.id = (SELECT auth.uid())
          AND u.role = 'administrador'
          AND u.ativo = TRUE
    )
);

COMMENT ON POLICY "Admin pode deletar imagens Raven" ON storage.objects IS 'Apenas administradores ativos podem deletar imagens do teste Raven.';


-- ============================================================================
-- 4. OTIMIZAÇÃO E CACHE
-- ============================================================================

-- IMPORTANTE: Configurar Cache-Control headers para otimização:
--
-- As imagens do teste Raven são estáticas e raramente mudam.
-- Configure Cache-Control para cache agressivo:
--
-- Cache-Control: public, max-age=31536000, immutable
--
-- Isso significa:
-- - public: pode ser cacheado por qualquer cache (CDN, browser)
-- - max-age=31536000: cache válido por 1 ano (365 dias)
-- - immutable: indica que o recurso nunca mudará (use versionamento na URL se precisar atualizar)
--
-- Para configurar via Supabase CLI ou código:
-- 1. No upload, especifique: { cacheControl: '31536000' }
-- 2. Via API: { headers: { 'Cache-Control': 'public, max-age=31536000' } }


-- ============================================================================
-- 5. COMPRESSÃO E OTIMIZAÇÃO DE IMAGENS
-- ============================================================================

-- RECOMENDAÇÕES PARA AS IMAGENS:
--
-- 1. Formato:
--    - Preferir WebP (melhor compressão, suporte moderno)
--    - Fallback para PNG (compatibilidade universal)
--
-- 2. Dimensões:
--    - Matrizes: 800x600px (ou proporção 4:3)
--    - Opções: 200x200px (quadradas)
--
-- 3. Compressão:
--    - WebP: qualidade 85-90
--    - PNG: usar pngquant ou similar para reduzir tamanho
--
-- 4. Tamanho máximo por arquivo: 500KB
--
-- 5. Otimização:
--    - Remover metadados EXIF
--    - Otimizar paleta de cores
--    - Usar ferramentas: ImageOptim, Squoosh, Sharp


-- ============================================================================
-- 6. EXEMPLO DE UPLOAD VIA JAVASCRIPT/TYPESCRIPT
-- ============================================================================

-- Exemplo de código para fazer upload de imagens:
--
-- import { createClient } from '@supabase/supabase-js';
--
-- const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
--
-- // Helper para converter numero_questao (1-60) em série e questão local
-- const getSerieQuestao = (numeroQuestao: number): { serie: string, questaoLocal: number } => {
--   const seriesMap = ['A', 'B', 'C', 'D', 'E'];
--   const serie = seriesMap[Math.floor((numeroQuestao - 1) / 12)];
--   const questaoLocal = ((numeroQuestao - 1) % 12) + 1;
--   return { serie, questaoLocal };
-- };
--
-- // Upload de imagem da matriz
-- const uploadRavenMatriz = async (file: File, versao: number, numeroQuestao: number) => {
--   const { serie, questaoLocal } = getSerieQuestao(numeroQuestao);
--   const filename = `${serie}${questaoLocal}.webp`;
--   const path = `versao-${versao}/${filename}`;
--
--   const { data, error } = await supabase.storage
--     .from('raven-imagens')
--     .upload(path, file, {
--       cacheControl: '31536000',
--       upsert: false,
--       contentType: 'image/webp'
--     });
--
--   if (error) throw error;
--
--   const { data: { publicUrl } } = supabase.storage
--     .from('raven-imagens')
--     .getPublicUrl(path);
--
--   return publicUrl;
-- };
--
-- // Upload de opções de resposta
-- const uploadRavenOpcao = async (file: File, versao: number, numeroQuestao: number, opcao: number) => {
--   const { serie, questaoLocal } = getSerieQuestao(numeroQuestao);
--   const filename = `${serie}${questaoLocal}.${opcao}.webp`;
--   const path = `versao-${versao}/${filename}`;
--
--   const { data, error } = await supabase.storage
--     .from('raven-imagens')
--     .upload(path, file, {
--       cacheControl: '31536000',
--       upsert: false,
--       contentType: 'image/webp'
--     });
--
--   if (error) throw error;
--
--   const { data: { publicUrl } } = supabase.storage
--     .from('raven-imagens')
--     .getPublicUrl(path);
--
--   return publicUrl;
-- };
--
-- // Exemplo de uso: fazer upload de uma questão completa
-- const imagemMatrizUrl = await uploadRavenMatriz(matrizFile, 1, 1); // A1.webp
-- const opcoesUrls = await Promise.all([
--   uploadRavenOpcao(opcao1File, 1, 1, 1), // A1.1.webp
--   uploadRavenOpcao(opcao2File, 1, 1, 2), // A1.2.webp
--   uploadRavenOpcao(opcao3File, 1, 1, 3), // A1.3.webp
--   uploadRavenOpcao(opcao4File, 1, 1, 4), // A1.4.webp
--   uploadRavenOpcao(opcao5File, 1, 1, 5), // A1.5.webp
--   uploadRavenOpcao(opcao6File, 1, 1, 6), // A1.6.webp
--   // ... até 8 opções se necessário
-- ]);
--
-- await supabase.from('questoes_raven').insert({
--   numero_questao: 1,
--   versao: 1,
--   serie: 'A',
--   imagem_matriz_url: imagemMatrizUrl,
--   opcoes_imagens: JSON.stringify(opcoesUrls),
--   resposta_correta: 3
-- });


-- ============================================================================
-- 7. VALIDAÇÃO E TESTES
-- ============================================================================

-- TESTES RECOMENDADOS:
--
-- 1. Verificar bucket existe:
--    SELECT * FROM storage.buckets WHERE name = 'raven-imagens';
--
-- 2. Testar acesso público (sem autenticação):
--    curl https://{project_ref}.supabase.co/storage/v1/object/public/raven-imagens/versao-1/A1.webp
--
-- 3. Testar upload como admin (deve funcionar):
--    - Fazer login como usuário com role='administrador'
--    - Fazer upload via código ou dashboard
--
-- 4. Testar upload como candidato (deve falhar):
--    - Fazer login como candidato
--    - Tentar upload - deve retornar erro de permissão
--
-- 5. Verificar RLS policies:
--    SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%Raven%';
--
-- 6. Validar nomenclatura dos arquivos:
--    -- Matrizes: A1.webp até A12.webp, B1.webp até B12.webp, ..., E1.webp até E12.webp
--    -- Opções: A1.1.webp até A1.6.webp (ou .8 dependendo da questão)
--    SELECT name FROM storage.objects WHERE bucket_id = 'raven-imagens' ORDER BY name;


-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Registra informações sobre a configuração
DO $$
BEGIN
    RAISE NOTICE 'Migration 26-storage-raven-imagens.sql - Documentação criada';
    RAISE NOTICE 'Configuração do bucket de Storage:';
    RAISE NOTICE '  - Bucket: raven-imagens (público)';
    RAISE NOTICE '  - Max size: 500KB por arquivo';
    RAISE NOTICE '  - MIME types: image/png, image/webp';
    RAISE NOTICE '  - RLS: 4 policies criadas (SELECT público, INSERT/UPDATE/DELETE admin)';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASSOS:';
    RAISE NOTICE '  1. Criar bucket via Dashboard ou CLI';
    RAISE NOTICE '  2. Executar policies SQL deste arquivo';
    RAISE NOTICE '  3. Fazer upload de imagens teste';
    RAISE NOTICE '  4. Validar acesso público e permissões';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
