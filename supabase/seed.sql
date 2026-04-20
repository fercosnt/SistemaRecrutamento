-- =============================================================================
-- Dev seed data (local development only)
-- Date: 2026-04-20
-- Decision: D-02c
-- =============================================================================
--
-- WARNING: This file is for LOCAL dev only. Do not run against staging or prod.
-- Executed automatically by `supabase db reset` after migrations apply.
--
-- Contains:
--   - 1 fake RH user (administrador)
--   - 3 fake candidatos
--   - 2 fake vagas (ativa)
--
-- The user_ids reference auth.users rows which must exist first. For local
-- dev, Supabase Studio seeds auth.users via its local Auth emulator when
-- the Dashboard is used to create users. When seeding via `supabase db
-- reset`, the placeholder UUIDs below are NOT backed by real auth rows and
-- will fail the FK to auth.users. To make this seed fully runnable locally:
--
--   1. After `supabase start`, create users via the Studio Auth UI, then
--      replace the UUIDs below with the real auth.users.id values.
--   -- OR --
--   2. Insert placeholder auth.users rows first via:
--        INSERT INTO auth.users (id, email, ...) VALUES (...);
--      This requires service_role access and is non-trivial; prefer approach 1.
--
-- For production, leave this file empty and manage users through the
-- cadastrar-candidato Edge Function + manual RH user creation.
-- =============================================================================

-- -------------------------------------------------------------------------
-- 1 fake RH user (administrador)
-- -------------------------------------------------------------------------
INSERT INTO public.usuarios_rh (
  id, user_id, nome_completo, email, cargo, role, ativo, primeiro_acesso
) VALUES (
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Admin Teste',
  'admin@beautysmile.test',
  'Gerente RH',
  'administrador',
  true,
  false
) ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- 3 fake candidatos
-- -------------------------------------------------------------------------
INSERT INTO public.candidatos (
  id, user_id, nome_completo, email, celular, cpf,
  data_nascimento, cidade, estado, genero,
  ativo, email_verificado
) VALUES
  (
    '00000000-0000-0000-0000-0000000000c1'::uuid,
    '00000000-0000-0000-0000-000000000010'::uuid,
    'Maria Silva',
    'maria@test.com',
    '11999990001',
    '12345678901',
    '1995-03-15',
    'Sao Paulo',
    'SP',
    'feminino',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-0000000000c2'::uuid,
    '00000000-0000-0000-0000-000000000011'::uuid,
    'Joao Santos',
    'joao@test.com',
    '11999990002',
    '98765432100',
    '1990-07-22',
    'Sao Paulo',
    'SP',
    'masculino',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-0000000000c3'::uuid,
    '00000000-0000-0000-0000-000000000012'::uuid,
    'Ana Oliveira',
    'ana@test.com',
    '11999990003',
    '45678912300',
    '1998-11-08',
    'Sao Paulo',
    'SP',
    'feminino',
    true,
    true
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- 2 fake vagas (status = 'ativa')
-- -------------------------------------------------------------------------
INSERT INTO public.vagas (
  id, titulo, slug, descricao_curta, sobre_cargo,
  requisitos_formacao, requisitos_experiencia,
  cidade, estado, tipo_contrato, status
) VALUES
  (
    '00000000-0000-0000-0000-0000000000b1'::uuid,
    'Assistente de Atendimento',
    'assistente-atendimento',
    'Vaga para assistente de atendimento na Beauty Smile.',
    'Atendimento ao cliente, agendamentos, suporte presencial.',
    'Ensino medio completo',
    'Minimo 6 meses em atendimento',
    'Sao Paulo',
    'SP',
    'CLT',
    'ativa'
  ),
  (
    '00000000-0000-0000-0000-0000000000b2'::uuid,
    'Auxiliar Administrativo',
    'auxiliar-administrativo',
    'Vaga para auxiliar administrativo.',
    'Rotinas administrativas, organizacao de documentos, atendimento telefonico.',
    'Ensino medio completo',
    'Conhecimento em informatica basica',
    'Sao Paulo',
    'SP',
    'CLT',
    'ativa'
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- END OF SEED
-- =============================================================================
