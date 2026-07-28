-- Migration: Add 'avaliacao_final' to etapa_processo ENUM
-- Data: 2025-01-23
-- Descrição: Adiciona nova etapa "Avaliação Final" ao fluxo do processo seletivo
--
-- ORDEM DO PROCESSO SELETIVO (atualizada):
-- 1. triagem
-- 2. bigfive
-- 3. disc
-- 4. entrevista_online
-- 5. raven (Teste Cognitivo)
-- 6. entrevista_presencial
-- 7. cultura
-- 8. avaliacao_final ← NOVO
-- 9. aprovado OU rejeitado

-- Adicionar 'avaliacao_final' ao ENUM etapa_processo
ALTER TYPE etapa_processo ADD VALUE IF NOT EXISTS 'avaliacao_final';

-- Comentário descritivo
COMMENT ON TYPE etapa_processo IS 'Etapas do processo seletivo: triagem → bigfive → disc → entrevista_online → raven (cognitivo) → entrevista_presencial → cultura → avaliacao_final → aprovado/rejeitado';
