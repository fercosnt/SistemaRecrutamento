-- =============================================================================
-- Migration: DELIV-02 — leitora minimamente privilegiada da chave Resend no Vault
-- Date: 2026-07-22
-- Milestone: M7 (v7.0 — Comunicação com o Candidato)
-- Phase: 36 (deliverability-sender-identity) / Plano 36-04
-- Requirement: DELIV-02
-- =============================================================================
--
-- PURPOSE
--   O DELIV-02 trava que a chave Resend de NOTIFICAÇÕES vive apenas no Supabase
--   Vault (segredo `resend_api_key`) — nunca no bundle, nunca em `VITE_`. Só que
--   o schema `vault` NÃO é exposto ao PostgREST: de dentro de uma Edge Function
--   um `.schema('vault').from('decrypted_secrets')` falha. Sem uma wrapper
--   `SECURITY DEFINER` em `public`, o DELIV-02 vira "um cofre que ninguém abre".
--
--   Esta migration define esse único caminho legítimo de leitura: a EF
--   `notificar-candidato` (Phase 38) chama `public.ler_resend_api_key()` com um
--   client `service_role` e obtém a chave em runtime.
--
-- DECISÃO DE SEGURANÇA — FUNÇÃO SEM ARGUMENTO
--   O exemplo público difundido é uma RPC genérica parametrizada pelo nome do
--   segredo. Rejeitado aqui de propósito: com ela, um comprometimento de
--   `service_role` lê TODOS os segredos do Vault (`project_url`,
--   `edge_invoke_key`, …). Esta função não recebe parâmetro e está escopada ao
--   literal `resend_api_key` — blast radius de UM segredo, não de todos.
--
-- PRIVILÉGIOS
--   `SECURITY DEFINER` + `SET search_path = ''` (referência totalmente
--   qualificada a `vault.decrypted_secrets`, imune a sequestro de resolução de
--   nome por objeto homônimo em schema de atacante — idioma já padrão do repo:
--   20260706110005_sec03_n8n_serverside.sql, 20260610000003_reprocessar_rpc.sql).
--   Toda função em `public` é potencialmente chamável via PostgREST, então os
--   privilégios são revogados de PUBLIC, `anon` e `authenticated`, e apenas
--   `service_role` recebe execução. Nenhum outro papel.
--
-- GRACEFUL SKIP (espelha reprocessar_analise e os triggers do SEC-03)
--   Enquanto o segredo não estiver provisionado, o `SELECT ... INTO` deixa a
--   variável em NULL e a função devolve NULL. Isso é o comportamento desejado:
--   o chamador faz skip legível em vez de receber erro opaco. A função nunca
--   levanta exceção — em particular, nunca coloca o valor do segredo numa
--   mensagem de erro.
--
-- FILE-ONLY QUANTO AO VALOR
--   Esta migration apenas LÊ o segredo. Quem o provisiona em PROD é o operador,
--   com a chave real, no Plano 36-05 — nunca um placeholder, nunca daqui.
--
-- NOTE: sem wrapper transacional externo (BEGIN/COMMIT) — CLAUDE.md D-22. O
--   driver do Supabase já envolve cada migration em sua própria transação, e o
--   wrapper externo é justamente o gatilho do SQLSTATE 42601 em corpo PL/pgSQL
--   `$$` adjacente a REVOKE/COMMENT. Apply em PROD via Supabase MCP
--   `apply_migration` (não `supabase db push --linked`) + reconcile do ledger.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ler_resend_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_chave text;
BEGIN
  SELECT decrypted_secret INTO v_chave
    FROM vault.decrypted_secrets WHERE name = 'resend_api_key';

  -- NULL = segredo ainda não provisionado (Plano 36-05). O chamador trata como
  -- skip; nenhuma exceção é levantada e o valor nunca é logado aqui.
  RETURN v_chave;
END;
$$;

REVOKE ALL ON FUNCTION public.ler_resend_api_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_resend_api_key() FROM anon;
REVOKE ALL ON FUNCTION public.ler_resend_api_key() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ler_resend_api_key() TO service_role;

COMMENT ON FUNCTION public.ler_resend_api_key() IS
  'M7/P36 DELIV-02: leitora do UNICO segredo Vault `resend_api_key` (chave Resend '
  'de notificacoes). Sem argumento por decisao de seguranca — um comprometimento '
  'de service_role expoe UM segredo, nao todos os do Vault. Consumida pela Edge '
  'Function notificar-candidato (Phase 38) via client service_role; execucao '
  'revogada de PUBLIC/anon/authenticated. Retorna NULL enquanto o segredo nao '
  'estiver provisionado (graceful skip, sem excecao).';
