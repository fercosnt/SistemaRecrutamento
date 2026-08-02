-- =============================================================================
-- Phase 43 / CR-01 — As colunas de PROVA deixam de ser escrivíveis pelo titular
-- =============================================================================
--
-- RESTRITIVA · ZERO-DESTRUTIVA. Um `REVOKE` seguido de um `GRANT` estreito.
-- Nenhum `DELETE`, nenhum `DROP`, nenhum `UPDATE` sobre dado de titular, nenhuma
-- policy tocada. Totalmente reversível por um `GRANT UPDATE` de volta.
--
-- -----------------------------------------------------------------------------
-- (1) O DEFEITO, MEDIDO POR EXECUÇÃO EM 2026-08-02
-- -----------------------------------------------------------------------------
-- Achado pelo code review da Phase 43 (CR-01) e CONFIRMADO por execução real,
-- numa subtransação revertida, com o JWT de um candidato vivo e papel
-- `authenticated`:
--
--   | ataque                                                    | linhas afetadas |
--   |-----------------------------------------------------------|-----------------|
--   | FORJAR prova (hash/versão/timestamp inventados)            | 1               |
--   | APAGAR prova (as três colunas de volta a NULL)             | 1               |
--   | NEGAR `autorizacao_uso_dados` (gate de existência da conta)| 1               |
--
-- **Nenhum erro de privilégio.** As três passaram.
--
-- A causa: `public.autorizacoes` carrega uma policy de `UPDATE` own-row para o
-- candidato — legítima, e é ela que o CONSENT-04 usa para a revogação de
-- marketing. Mas **RLS é ROW-level: ela não restringe COLUNA.** Medido em
-- `information_schema.column_privileges` no mesmo dia: `anon` E `authenticated`
-- tinham UPDATE de nível de TABELA sobre as 16 colunas, incluindo as quatro que
-- a Phase 43 acabara de criar como PROVA.
--
-- ⚠ POR QUE ISSO DESTRUÍA O SC#1 INTEIRO, NOS DOIS SENTIDOS:
--   · uma linha histórica (NULL) podia ser feita PARECER que tem prova;
--   · uma linha com prova podia ser feita PARECER pré-enforcement.
-- O NULL era o discriminador da fase inteira, e ele era forjável em ambas as
-- direções pelo proprio titular — que e exatamente a parte interessada.
--
-- E o T-43-01 (`um hash controlado pelo titular nao prova nada`) estava fechado
-- na Edge Function, pelo `.strict()` do `cadastroCandidatoSchema`, e ABERTO no
-- PostgREST. Fechar uma porta e deixar a outra escancarada nao e meia protecao:
-- e nenhuma, porque o atacante escolhe a porta.
--
-- -----------------------------------------------------------------------------
-- (2) O QUE O TITULAR LEGITIMAMENTE ESCREVE — a allowlist, e so ela
-- -----------------------------------------------------------------------------
-- Lido do UNICO sitio de escrita do cliente, `privacidadeService.revogarMarketing`
-- (`src/features/privacidade/services/privacidadeService.ts:155-163`):
--
--   .update({ autorizacao_marketing_vagas: novoValor, updated_at: … })
--
-- Duas colunas. Mais nada.
--
-- `autorizacao_retencao_curriculo` NAO entra: na Phase 43 ele e BASE LEGAL CITADA
-- na superficie do candidato (RETEN-03), renderizado read-only, nunca um controle.
-- Se uma fase futura lhe der um toggle, ela acrescenta a coluna a este GRANT — e o
-- diff torna essa decisao VISIVEL, que e o ponto de a allowlist ser explicita.
--
-- `autorizacao_comunicacao` tambem NAO entra, e por razao mais forte: o canal
-- transacional nao tem opt-out (Art. 7º V), entao dar ao titular o privilegio de
-- escreve-lo seria contradizer, no banco, o que a UI-SPEC Invariante 3 afirma na
-- tela.
--
-- -----------------------------------------------------------------------------
-- (3) `anon` PERDE UPDATE POR COMPLETO
-- -----------------------------------------------------------------------------
-- Um chamador anonimo nao tem own-row, entao a RLS ja o barraria. O REVOKE aqui e
-- defesa em profundidade e custa zero: e a mesma licao ja catalogada em
-- `.planning/todos/pending/42-anon-execute-definer-sistemico.md` — neste projeto o
-- `pg_default_acl` concede a `anon` mais do que ninguem pediu, e o idioma que so
-- revoga de PUBLIC nao remove nada.
--
-- -----------------------------------------------------------------------------
-- (4) PROTOCOLO DE APPLY
-- -----------------------------------------------------------------------------
-- Por MCP `apply_migration`, pelo ORQUESTRADOR. Sem wrapper `BEGIN;/COMMIT;`
-- (CLAUDE.md §Migrations). Reparar a `version` do ledger para `20260802000001`
-- e conferir `md5(statements[1])` contra o md5 do arquivo.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · Fecha a porta: nenhum papel de cliente escreve coluna nenhuma
-- ---------------------------------------------------------------------------
REVOKE UPDATE ON public.autorizacoes FROM anon, authenticated;


-- ---------------------------------------------------------------------------
-- 2 · Reabre APENAS a allowlist, e apenas para quem esta autenticado
-- ---------------------------------------------------------------------------
-- `updated_at` entra porque o cliente o envia junto na mesma chamada. Ele nao e
-- prova de nada — e carimbo de modificacao.
GRANT UPDATE (autorizacao_marketing_vagas, updated_at)
  ON public.autorizacoes TO authenticated;


-- ---------------------------------------------------------------------------
-- 3 · Auto-verificacao: ABORTA o apply se a porta continuar aberta
-- ---------------------------------------------------------------------------
-- Um gate que nao morde nao e um gate. Esta migration existe por causa de um
-- privilegio que ninguem tinha medido; ela nao vai confiar que o proprio REVOKE
-- pegou — vai perguntar ao catalogo.
DO $verifica_privs$
DECLARE
  v_col       text;
  v_proibidas text[] := ARRAY[
    'consent_text_hash', 'consent_text_version', 'consent_registrado_em',
    'autorizacao_uso_dados', 'autorizacao_comunicacao', 'autorizacao_analise_video',
    'autorizacao_retencao_curriculo', 'candidato_id', 'user_id', 'id',
    'ip_aceite', 'policy_version', 'user_agent_aceite', 'created_at'
  ];
  v_papel     text;
  v_papeis    text[] := ARRAY['anon', 'authenticated'];
  v_tem       boolean;
BEGIN
  -- (a) NENHUM papel de cliente pode escrever NENHUMA coluna proibida.
  FOREACH v_papel IN ARRAY v_papeis LOOP
    FOREACH v_col IN ARRAY v_proibidas LOOP
      SELECT has_column_privilege(v_papel, 'public.autorizacoes', v_col, 'UPDATE')
        INTO v_tem;
      IF v_tem THEN
        RAISE EXCEPTION 'P43-CR01: o papel % AINDA pode escrever public.autorizacoes.% — o REVOKE nao pegou, e a prova de consentimento continua forjavel pelo proprio titular', v_papel, v_col;
      END IF;
    END LOOP;
  END LOOP;

  -- (b) `anon` nao escreve NEM a allowlist.
  IF has_column_privilege('anon', 'public.autorizacoes', 'autorizacao_marketing_vagas', 'UPDATE') THEN
    RAISE EXCEPTION 'P43-CR01: o papel anon ainda tem UPDATE em autorizacao_marketing_vagas';
  END IF;

  -- (c) METADE POSITIVA — a revogacao de marketing do CONSENT-04 tem de continuar
  -- funcionando. Um REVOKE que fechasse tudo passaria por (a) e (b) em verde e
  -- quebraria em silencio a feature que a Phase 43 acabou de entregar.
  IF NOT has_column_privilege('authenticated', 'public.autorizacoes', 'autorizacao_marketing_vagas', 'UPDATE') THEN
    RAISE EXCEPTION 'P43-CR01: authenticated PERDEU UPDATE em autorizacao_marketing_vagas — a revogacao own-row do CONSENT-04 acabou de morrer';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.autorizacoes', 'updated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'P43-CR01: authenticated PERDEU UPDATE em updated_at — o cliente envia essa coluna na mesma chamada e receberia 42501';
  END IF;

  -- (d) A leitura own-row NAO pode ter sido afetada: a tela le a propria linha.
  IF NOT has_table_privilege('authenticated', 'public.autorizacoes', 'SELECT') THEN
    RAISE EXCEPTION 'P43-CR01: authenticated perdeu SELECT — esta migration so podia mexer em UPDATE';
  END IF;

  RAISE NOTICE 'P43-CR01 OK: 14 colunas fechadas para anon e authenticated; a allowlist de 2 colunas segue escrivivel por authenticated; SELECT intacto';
END
$verifica_privs$;


COMMENT ON COLUMN public.autorizacoes.consent_text_hash IS
  'Phase 43 / CONSENT-02: SHA-256 hex (64 chars, minusculo) do texto lido. Calculado '
  'EXCLUSIVAMENTE NO SERVIDOR pela EF cadastrar-candidato, via '
  '_shared/consent-hash.ts, a partir do arquivo do servidor. Nenhum campo de hash '
  'existe no schema de entrada e o .strict() rejeita qualquer chave que tentasse '
  'injeta-lo (T-43-01): um hash controlado pelo titular nao prova nada, porque o '
  'atacante escolheria o texto ao qual a linha corresponde. A entrada do hash e '
  'SEMANTICA, nao os bytes crus do arquivo — pares (rotulo, descricao) na ordem de '
  'renderizacao, com trim + NFC, mais a versao. Recomputavel por qualquer pessoa que '
  'tenha o arquivo e a versao, e e isso que torna a linha VERIFICAVEL. NULL = linha '
  'pre-enforcement. Sem DEFAULT, pela mesma razao de consent_text_version. '
  '⚠ CR-01 (2026-08-02): o T-43-01 estava fechado na Edge Function e ABERTO no '
  'PostgREST — RLS e ROW-level e nao restringe COLUNA, entao a policy de UPDATE '
  'own-row do candidato o deixava escrever esta coluna com o proprio JWT. Medido por '
  'execucao: forjar, apagar e negar prova passaram, 1 linha cada. Fechado por '
  'privilegio de COLUNA em 20260802000001: o titular escreve apenas '
  'autorizacao_marketing_vagas e updated_at.';
