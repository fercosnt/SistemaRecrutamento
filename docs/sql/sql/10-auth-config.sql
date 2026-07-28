-- ==============================================
-- 10 - Configurações de Autenticação Supabase
-- PRD-DB-001: Estrutura de Autenticação e Usuários
-- Data: 2025-11-02
-- ==============================================

-- ==============================================
-- IMPORTANTE
-- ==============================================
-- Este arquivo documenta as configurações de autenticação que devem ser
-- aplicadas MANUALMENTE via Supabase Dashboard.
--
-- A maioria dessas configurações NÃO pode ser aplicada via SQL, pois são
-- configurações do serviço Supabase Auth (GoTrue).
--
-- Acesse: https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/auth/settings
-- ==============================================

-- ==============================================
-- PASSO A PASSO: CONFIGURAÇÕES NO DASHBOARD
-- ==============================================

-- 1. SESSION TIMEOUT (Tempo de Expiração da Sessão)
-- ------------------------------------------------
-- Caminho: Dashboard → Authentication → Settings → Session → Session Timeout
-- Valor: 604800 segundos (7 dias)
-- Justificativa: Sessões permanecem ativas por 7 dias, alinhado com a
--                tabela sessoes_ativas e função update_expires_at()

-- 2. REFRESH TOKEN ROTATION (Rotação de Tokens)
-- ------------------------------------------------
-- Caminho: Dashboard → Authentication → Settings → Session → Refresh Token Rotation
-- Valor: ENABLED (Habilitado)
-- Reuse Interval: 10 segundos
-- Justificativa: Aumenta segurança ao invalidar tokens antigos após refresh

-- 3. PASSWORD POLICY (Política de Senhas)
-- ------------------------------------------------
-- Caminho: Dashboard → Authentication → Settings → Password → Password Policy
-- Configurações:
--   - Minimum characters: 8
--   - Require uppercase: YES (1 letra maiúscula)
--   - Require lowercase: YES (implícito)
--   - Require numbers: YES (1 número)
--   - Require special characters: NO (opcional para MVP)
-- Justificativa: Equilibra segurança com usabilidade

-- 4. EMAIL SETTINGS (Configurações de Email)
-- ------------------------------------------------
-- Caminho: Dashboard → Authentication → Settings → Email
-- Configurações:
--   - Confirm email: OPTIONAL (para MVP, pode ser habilitado depois)
--   - Enable email confirmations: NO (para facilitar testes no MVP)
--   - Double confirm email changes: YES (segurança ao alterar email)
--   - Secure email change: YES (requer confirmação do email antigo)
-- Justificativa: Facilita onboarding no MVP, mas mantém segurança em alterações

-- 5. SITE URL (URL do Site)
-- ------------------------------------------------
-- Caminho: Dashboard → Authentication → Settings → Site URL
-- Valor Development: http://localhost:5173
-- Valor Production: https://[seu-dominio].com
-- Justificativa: URL base para redirecionamentos após autenticação

-- 6. REDIRECT URLs (URLs de Redirecionamento)
-- ------------------------------------------------
-- Caminho: Dashboard → Authentication → Settings → Redirect URLs
-- Adicionar:
--   - http://localhost:5173/** (desenvolvimento)
--   - http://localhost:3000/** (se usar outra porta)
--   - https://[seu-dominio].com/** (produção)
-- Justificativa: URLs permitidas para redirecionamento após auth

-- 7. AUTH PROVIDERS (Provedores de Autenticação)
-- ------------------------------------------------
-- Caminho: Dashboard → Authentication → Settings → Auth Providers
-- Configurações:
--   - Email/Password: ENABLED (obrigatório)
--   - Google: DISABLED (pode habilitar no futuro)
--   - Facebook: DISABLED (pode habilitar no futuro)
--   - Outros: DISABLED
-- Justificativa: MVP usa apenas email/senha, social login pode ser adicionado depois

-- 8. RATE LIMITING (Limitação de Taxa)
-- ------------------------------------------------
-- Caminho: Dashboard → Authentication → Settings → Rate Limiting
-- Manter valores padrão do Supabase:
--   - Anonymous sign-ins: 30/hour
--   - Password recovery: 30/hour
--   - Verify: 360/hour
-- Justificativa: Proteção contra ataques de força bruta

-- ==============================================
-- CONFIGURAÇÕES AVANÇADAS (OPCIONAL)
-- ==============================================

-- SMTP PERSONALIZADO (Opcional - para produção)
-- ------------------------------------------------
-- Se quiser usar seu próprio servidor de email:
-- Caminho: Dashboard → Authentication → Settings → SMTP Settings
-- Configure:
--   - SMTP Host
--   - SMTP Port
--   - SMTP User
--   - SMTP Pass
--   - Sender Email
--   - Sender Name

-- TEMPLATES DE EMAIL (Opcional - personalização)
-- ------------------------------------------------
-- Caminho: Dashboard → Authentication → Email Templates
-- Personalize os templates de:
--   - Confirmation email (confirmação de cadastro)
--   - Magic Link (link mágico de login)
--   - Change Email (alteração de email)
--   - Reset Password (redefinição de senha)

-- ==============================================
-- VERIFICAÇÃO DAS CONFIGURAÇÕES
-- ==============================================

-- Após aplicar as configurações no Dashboard, execute estas queries
-- para verificar que tudo está funcionando:

-- 1. Verificar que a tabela auth.users existe
SELECT COUNT(*) as total_users FROM auth.users;

-- 2. Verificar configurações de RLS nas tabelas
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('candidatos', 'usuarios_rh', 'preferencias_notificacoes', 'sessoes_ativas', 'logs_acesso')
ORDER BY tablename;

-- 3. Verificar policies criadas
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Verificar bucket de storage
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'avatars';

-- 5. Verificar policies do storage
SELECT policyname, operation, check_expression
FROM storage.policies
WHERE bucket_id = 'avatars'
ORDER BY policyname;

-- ==============================================
-- TESTES MANUAIS RECOMENDADOS
-- ==============================================

/*
Após configurar o Dashboard, teste os seguintes cenários:

1. TESTE DE SIGNUP (Cadastro)
   - Tentar criar conta com senha fraca (deve falhar)
   - Criar conta com senha válida (mín 8 chars, 1 maiúscula, 1 número)
   - Verificar que registro é criado em auth.users

2. TESTE DE LOGIN
   - Login com credenciais corretas (deve suceder)
   - Login com credenciais incorretas (deve falhar)
   - Verificar que log é criado em logs_acesso

3. TESTE DE SESSÃO
   - Verificar que sessão é criada em sessoes_ativas
   - Verificar que expires_at é 7 dias no futuro
   - Fazer uma ação e verificar que last_activity é atualizado

4. TESTE DE REFRESH TOKEN
   - Esperar token expirar
   - Fazer refresh e verificar que novo token é emitido
   - Verificar que token antigo é invalidado

5. TESTE DE LOGOUT
   - Fazer logout
   - Verificar que sessão é marcada como inativa
   - Verificar que log de logout é criado

6. TESTE DE RESET DE SENHA
   - Solicitar reset de senha
   - Verificar que email é enviado
   - Trocar senha usando link do email
   - Verificar que log é criado

7. TESTE DE RLS
   - Tentar acessar dados de outro usuário (deve falhar)
   - Verificar que usuário só vê próprios dados
   - Criar usuário RH admin e verificar que vê todos os dados
*/

-- ==============================================
-- TROUBLESHOOTING
-- ==============================================

-- PROBLEMA: Não consigo fazer login
-- SOLUÇÃO: Verificar se:
--   1. Email está confirmado (se confirm email estiver habilitado)
--   2. Usuário não está bloqueado
--   3. Senha atende aos requisitos mínimos

-- PROBLEMA: Sessão expira muito rápido
-- SOLUÇÃO: Verificar Session Timeout no Dashboard (deve ser 604800)

-- PROBLEMA: Não recebo emails de reset de senha
-- SOLUÇÃO: Verificar:
--   1. SMTP configurado corretamente
--   2. Email não está na pasta de spam
--   3. Rate limiting não foi atingido

-- PROBLEMA: RLS bloqueia acesso legítimo
-- SOLUÇÃO: Verificar policies com:
--   SELECT * FROM pg_policies WHERE schemaname = 'public';

-- ==============================================
-- SEGURANÇA - CHECKLIST
-- ==============================================

-- [ ] Session Timeout configurado (7 dias)
-- [ ] Refresh Token Rotation habilitado
-- [ ] Password Policy ativa (min 8 chars, 1 upper, 1 number)
-- [ ] Redirect URLs configuradas corretamente
-- [ ] RLS habilitado em todas as tabelas
-- [ ] RLS policies testadas e funcionando
-- [ ] Storage policies configuradas
-- [ ] Rate limiting configurado
-- [ ] SMTP configurado (produção)
-- [ ] Templates de email personalizados (opcional)

-- ==============================================
-- FIM DO SCRIPT 10-auth-config.sql
-- ==============================================
