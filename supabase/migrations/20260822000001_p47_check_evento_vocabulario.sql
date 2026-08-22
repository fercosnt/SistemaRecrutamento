-- =============================================================================
-- 20260822000001 — `logs_acesso.check_evento` passa a conhecer o vocabulário que
--                  a aplicação realmente emite
-- =============================================================================
-- ⚠ NÃO APLICAR POR AGENTE sem o ok do operador. Escrita e commitada; o apply é
--   checkpoint. Ela vem em PAR com a mudança de `src/services/logAccessService.ts`
--   — ver §ORDEM no fim, e a direção segura é a mesma de sempre: banco primeiro.
--
-- ⚠ Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Migrations).
--
-- -----------------------------------------------------------------------------
-- O DEFEITO: O LOG DE ACESSO ESTÁ MORTO, E ESTÁ MORTO HÁ MESES
-- -----------------------------------------------------------------------------
-- O tipo `EventoAcesso` (TS) declara OITO valores. O CHECK `check_evento` aceita
-- OITO OUTROS. A interseção é de TRÊS: `login_sucesso`, `login_falha`, `logout`.
--
-- Os cinco que o TS emite e o banco recusa: `sessao_expirada`, `acesso_negado`,
-- `password_reset_request`, `password_reset_completed`, `password_reset_failed`.
--
-- ⚠ E `sessao_expirada` é EXATAMENTE o que o único chamador vivo manda
--   (`useSessionTimeout.ts:76`). Aquele INSERT bate `23514` em TODA execução — e
--   `logAccessEvent` ENGOLE o erro de propósito (`console.error`, sem `throw`,
--   porque «logging é secundário ao processo de autenticação»). Falha calada.
--
-- MEDIDO em PROD (2026-08-22): a tabela só tem `login_sucesso` (21) e
-- `login_falha` (2), e a última linha é de **2026-04-20**. Quatro meses sem um
-- único registro novo, sem ninguém notar. Um log de segurança que não grava é
-- pior que ausência de log: ele dá a impressão de cobertura que não existe.
--
-- ⚠ COMO O DEFEITO APARECEU, porque isso vale mais que o defeito: por ACIDENTE.
--   A auto-verificação da migration `20260813000001` usou um `evento` inventado
--   na sonda, o apply ABORTOU com `23514`, e o gate — pegando o próprio autor —
--   expôs o CHECK. Nenhum teste, nenhum review e nenhuma tela tinham pegado isso
--   em quatro meses, porque o erro é engolido e ninguém lê `logs_acesso`.
--
-- -----------------------------------------------------------------------------
-- A DIREÇÃO DO CONSERTO NÃO É SIMÉTRICA, E É ISSO QUE A DECIDE
-- -----------------------------------------------------------------------------
-- «Alinhar o TS ao banco» é impossível para metade dos casos: o banco NÃO TEM
-- conceito para «a sessão expirou» nem «acesso negado». Não dá para alinhar a
-- algo que não existe. Já `password_reset_completed` TEM equivalente pt-BR vivo
-- (`senha_resetada`), e para esse a direção certa é o TS ceder.
--
-- Então: ALARGAR o CHECK com os conceitos que faltam, em pt-BR (CLAUDE.md
-- §Key Conventions: enums de domínio em pt-BR), e renomear no TS o que já tinha
-- correspondente. **Nada é removido** — estreitar um CHECK de domínio pode
-- invalidar linha existente, e alargar nunca pode.
-- =============================================================================

ALTER TABLE public.logs_acesso DROP CONSTRAINT IF EXISTS check_evento;

ALTER TABLE public.logs_acesso ADD CONSTRAINT check_evento CHECK (
  (evento)::text = ANY (ARRAY[
    -- os OITO que já existiam — preservados na íntegra, nenhum removido
    'login_sucesso', 'login_falha', 'logout',
    'senha_alterada', 'senha_resetada', 'email_alterado',
    'conta_bloqueada', 'conta_desbloqueada',
    -- os QUATRO novos: conceitos que a aplicação emite e o banco não conhecia
    'sessao_expirada',          -- useSessionTimeout.ts:76 — o caso que estava morto
    'acesso_negado',            -- logAccessDenied()
    'senha_reset_solicitada',   -- logPasswordResetRequest()
    'senha_reset_falhou'        -- logPasswordResetFailed()
  ]::text[])
);

COMMENT ON CONSTRAINT check_evento ON public.logs_acesso IS
  'Vocabulario de eventos de acesso, em pt-BR. Alargado em 2026-08-22 com sessao_expirada, '
  'acesso_negado, senha_reset_solicitada e senha_reset_falhou — quatro conceitos que a '
  'aplicacao ja emitia e que este CHECK recusava, deixando o log MORTO desde 2026-04-20 '
  '(o erro do INSERT e engolido por logAccessEvent, entao a falha era calada). '
  '⚠ Este conjunto tem de ficar em sincronia com EVENTOS_ACESSO em '
  'src/services/logAccessService.ts; o teste logAccessVocabulario.test.ts compara os dois '
  'lendo ESTE arquivo de migration, e reprova se divergirem.';

-- -----------------------------------------------------------------------------
-- AUTO-VERIFICAÇÃO — mede o catálogo E exercita os caminhos, em rollback.
-- -----------------------------------------------------------------------------
DO $verifica_vocabulario$
DECLARE
  v_def       text;
  v_esperados text[] := ARRAY[
    'login_sucesso','login_falha','logout','senha_alterada','senha_resetada',
    'email_alterado','conta_bloqueada','conta_desbloqueada','sessao_expirada',
    'acesso_negado','senha_reset_solicitada','senha_reset_falhou'];
  v_faltando  text;
  v_id        uuid;
  v_recusou   boolean := false;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND t.relname = 'logs_acesso' AND c.conname = 'check_evento';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P47-VOCAB FAIL (a): o CHECK check_evento nao existe apos o ALTER — a tabela ficou SEM restricao de vocabulario, que e pior que o defeito que esta migration conserta';
  END IF;

  -- (b) os DOZE estao presentes na definicao viva
  SELECT string_agg(e, ', ') INTO v_faltando
    FROM unnest(v_esperados) AS e
   WHERE position('''' || e || '''' IN v_def) = 0;
  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'P47-VOCAB FAIL (b): ausentes do CHECK vivo: %. Definicao: %', v_faltando, v_def;
  END IF;

  BEGIN
    -- (c) CAMINHO EXERCITADO: os quatro novos passam a ser aceitos de verdade.
    --     Estrutura sozinha seria a licao do 42804 da P43 outra vez.
    INSERT INTO public.logs_acesso (evento) VALUES ('sessao_expirada')        RETURNING id INTO v_id;
    INSERT INTO public.logs_acesso (evento) VALUES ('acesso_negado')          RETURNING id INTO v_id;
    INSERT INTO public.logs_acesso (evento) VALUES ('senha_reset_solicitada') RETURNING id INTO v_id;
    INSERT INTO public.logs_acesso (evento) VALUES ('senha_reset_falhou')     RETURNING id INTO v_id;

    -- (d) NENHUM dos oito antigos foi perdido — alargar nunca estreita
    INSERT INTO public.logs_acesso (evento) VALUES ('senha_alterada')     RETURNING id INTO v_id;
    INSERT INTO public.logs_acesso (evento) VALUES ('conta_desbloqueada') RETURNING id INTO v_id;

    -- (e) ⊖ NEGATIVA — o CHECK CONTINUA MORDENDO. Sem esta, «consertar» soltando
    --     a restricao passaria por conserto, e o gate viraria decoracao.
    BEGIN
      INSERT INTO public.logs_acesso (evento) VALUES ('evento_que_nao_existe');
    EXCEPTION WHEN check_violation THEN
      v_recusou := true;
    END;
    IF NOT v_recusou THEN
      RAISE EXCEPTION 'P47-VOCAB FAIL (e): o CHECK aceitou um valor inventado — a restricao foi AFROUXADA em vez de alargada, e o vocabulario deixou de ser vocabulario';
    END IF;

    RAISE EXCEPTION 'rollback_p47_vocab' USING ERRCODE = 'P47VC';
  EXCEPTION
    WHEN sqlstate 'P47VC' THEN
      NULL;  -- reversao ESPERADA
  END;

  -- (f) ⊖ NEGATIVA: as sondas nao sobreviveram
  IF EXISTS (
    SELECT 1 FROM public.logs_acesso
     WHERE evento IN ('sessao_expirada','acesso_negado','senha_reset_solicitada',
                      'senha_reset_falhou','senha_alterada','conta_desbloqueada')
  ) THEN
    RAISE EXCEPTION 'P47-VOCAB FAIL (f): sobrou linha de sonda em logs_acesso — o rollback nao funcionou e esta migration sujou um log de auditoria';
  END IF;

  RAISE NOTICE 'P47-VOCAB OK: 12 valores no CHECK vivo, os 4 novos aceitos por execucao, os 8 antigos preservados, valor inventado ainda RECUSADO e zero residuo';
END
$verifica_vocabulario$;

-- =============================================================================
-- ⚠ ORDEM — banco primeiro, como sempre
-- =============================================================================
--   1º  APLICAR ESTA MIGRATION.
--   2º  SÓ ENTÃO subir o frontend com `logAccessService.ts` renomeado.
--
-- A inversão é MENOS grave que a da `20260813000001` (o log já está quebrado há
-- meses, então o pior caso é continuar quebrado), mas a direção segura é a mesma:
-- com o banco alargado e o TS antigo, os três `password_reset_*` continuam
-- falhando exatamente como hoje — nada piora. Com o TS novo e o banco antigo,
-- `senha_reset_solicitada` e `senha_reset_falhou` passariam a falhar TAMBÉM.
--
-- ⚠ Depois do apply, `sessao_expirada` volta a gravar. Espere ver linhas novas em
-- `logs_acesso` pela primeira vez desde 2026-04-20 — isso é o conserto
-- funcionando, não um incidente.
-- =============================================================================
