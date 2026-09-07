-- =============================================================================
-- 20260907000001 — confirmar_janela_retencao : o estado que faltava ao sistema
-- =============================================================================
-- Duas regras corretas colidiam, e a colisão tornava o portão do flip da purga
-- IMPOSSÍVEL de satisfazer pelo caminho que o runbook manda usar. Medido em PROD
-- em 2026-09-06 (§7.32 do GUIA-VALIDACAO-FINAL).
--
-- A COLISÃO, exatamente:
--
--   RETEN-02 — `salvar_janela_retencao` RECUSA no-op (passo (5) daquela função):
--     «salvar sem mudança escreveria uma linha de auditoria que afirma uma
--      alteração que não houve». Correto: a trilha probatória não pode mentir.
--
--   D-46-22 — o portão de `salvar_config_purga` exige que NENHUMA etapa da
--     allowlist esteja em `origem = 'seed'`, porque «seed significa que ninguém
--     CONTESTOU aquele número — não que alguém o DECIDIU». Também correto.
--
-- E `origem` só vira 'admin' DENTRO de `salvar_janela_retencao`, depois do guard
-- de no-op. Como `decisao_final` e `aprovado` estão em 24 meses, que é também o
-- TETO consentido, não existe valor novo a salvar: para confirmar 24 seria preciso
-- primeiro mudar para outra coisa. O runbook 46-07 promete que «reconfirmar 24 é
-- uma escolha legítima» — e é, mas o produto não oferecia a ação.
--
-- ⚠ O CUSTO REAL, e por isso isto não é teoria: em 2026-09-06 o operador tentou
-- confirmar pelo caminho documentado, a tela recusou, e a saída encontrada foi
-- mexer no número — `rejeitado` foi de 18 para 24 meses. Uma decisão deliberada de
-- 03/08 desfeita, a guarda de dados de reprovados alongada em 6 meses, e por 4
-- minutos a página PÚBLICA de privacidade publicou 18 enquanto o sistema praticava
-- 24. Nada disso era necessário: `rejeitado` já estava em 'admin' e nunca barrou o
-- portão. **Um portão impossível de satisfazer não fica sem ser satisfeito: ele é
-- satisfeito por um contorno, e o contorno é que faz o estrago.**
--
-- O QUE FALTAVA. Um terceiro estado. `origem` tinha dois valores e três situações:
--
--   'seed'   — ninguém olhou
--   'admin'  — alguém MUDOU
--   (ausente) — alguém OLHOU E MANTEVE
--
-- Esta função é a terceira. Ela marca `origem = 'admin'` e NÃO TOCA em
-- `janela_meses` — e a linha de auditoria que ela escreve não afirma alteração
-- nenhuma: diz `confirmar_janela_retencao`, «confirmada em N meses, sem
-- alteração». O guard de no-op da irmã continua valendo e é correto, porque a
-- descrição DAQUELA função afirma uma mudança. Esta afirma uma conferência, que é
-- um ato que de fato aconteceu.
--
-- POR QUE RE-CONFIRMAR É PERMITIDO (não há guard de "já está em admin"). Confirmar
-- de novo é um ato novo: carimba `atualizado_em` e `alterado_por` com a atestação
-- mais recente, que é o que uma revisão periódica de política precisa registrar.
-- Nenhuma linha da trilha fica falsa por isso — ao contrário da irmã, aqui não há
-- "de X para Y" a mentir.
--
-- Aplicada pela via da Phase 46 (Management API, SQL lido do arquivo).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.confirmar_janela_retencao(p_etapa public.etapa_processo)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid;
  v_meses integer;
  antes   jsonb;
  depois  jsonb;
BEGIN
  -- (1) GUARD DE PAPEL, NULL-SAFE — `IS DISTINCT FROM`, nunca `NOT IN`. Idioma
  -- verbatim de `salvar_janela_retencao`: com claim AUSENTE, `NOT IN` avalia NULL,
  -- o `IF` não é tomado e o guard falha ABERTO. Em SECURITY DEFINER isso é grave,
  -- porque DEFINER bypassa RLS e o corpo é o único controle que existe.
  IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode confirmar a janela de retencao'
      USING ERRCODE = '42501';
  END IF;

  -- (2) O ATOR É RESOLVIDO NO SERVIDOR, nunca recebido por parâmetro — um actor
  -- vindo do cliente seria a autoria da trilha escolhida por quem está sendo
  -- auditado. Claim de administrador SEM linha viva de RH não é operador deste
  -- sistema (conta desativada que ainda carrega a claim até o refresh).
  SELECT u.id INTO v_actor
    FROM public.usuarios_rh u
   WHERE u.user_id = (select auth.uid())
     AND u.ativo
     AND u.deleted_at IS NULL;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: nenhuma conta de RH viva corresponde ao chamador'
      USING ERRCODE = '42501';
  END IF;

  -- (3) Estado anterior + LOCK da linha, para o snapshot da auditoria ser
  -- consistente com a mutação e para serializar confirmações concorrentes.
  SELECT to_jsonb(c), c.janela_meses INTO antes, v_meses
    FROM public.config_retencao_etapa c
   WHERE c.etapa = p_etapa
   FOR UPDATE;

  IF antes IS NULL THEN
    RAISE EXCEPTION 'VALIDATION: etapa % nao existe na matriz de retencao', p_etapa
      USING ERRCODE = '22023';
  END IF;

  -- (4) A MUTAÇÃO — e o que ela deliberadamente NÃO faz.
  --
  -- ⚠ `janela_meses` NÃO ENTRA NO `SET`. Não é economia de digitação: é a
  -- propriedade que separa esta função da irmã. Confirmar não pode mudar o número
  -- nem por acidente, e um `SET janela_meses = v_meses` — mesmo escrevendo o mesmo
  -- valor — abriria a porta para que uma refatoração futura passasse um parâmetro
  -- ali. A asserção (d) do smoke prova a imutabilidade por execução.
  UPDATE public.config_retencao_etapa c
     SET origem       = 'admin',
         alterado_por = v_actor
   WHERE c.etapa = p_etapa;

  SELECT to_jsonb(c) INTO depois
    FROM public.config_retencao_etapa c
   WHERE c.etapa = p_etapa;

  -- (5) A LINHA DE AUDITORIA, NA MESMA TRANSAÇÃO — e a descrição é o ponto inteiro
  -- desta migration. Ela NÃO diz «alterada de X para Y», porque não houve. Diz o
  -- que houve: uma confirmação. `log_auditoria` é SECURITY DEFINER com owner
  -- BYPASSRLS, então a linha sobrevive ao REVOKE de INSERT da P28. Os valores
  -- 'configuracao' e 'aviso' são os mesmos enums que a irmã já usa.
  PERFORM public.log_auditoria(
    p_usuario_id   := v_actor,
    p_usuario_tipo := 'admin',
    p_acao         := 'confirmar_janela_retencao',
    p_categoria    := 'configuracao',
    p_descricao    := format('Janela de retencao da etapa %s CONFIRMADA em %s meses, sem alteracao', p_etapa, v_meses),
    p_severidade   := 'aviso',
    p_recurso_tipo := 'config_retencao_etapa',
    p_recurso_id   := NULL::uuid,
    p_dados_antes  := antes,
    p_dados_depois := depois,
    p_sucesso      := true
  );
END;
$function$;

COMMENT ON FUNCTION public.confirmar_janela_retencao(public.etapa_processo) IS
  'RETEN-02 / D-46-22 — marca origem=admin SEM alterar janela_meses, e audita como '
  'confirmacao (nunca como alteracao). Existe porque salvar_janela_retencao recusa '
  'no-op por design correto, e o portao do flip exige origem=admin para etapas que '
  'ja estao no teto de 24 meses: sem esta funcao, confirmar 24 exigiria primeiro '
  'mudar para outro valor. Ver 20260907000001 e §7.32 do GUIA-VALIDACAO-FINAL.';

REVOKE ALL ON FUNCTION public.confirmar_janela_retencao(public.etapa_processo) FROM PUBLIC;

-- =============================================================================
-- AUTO-VERIFICAÇÃO — executa no apply, e reprova o apply se algo não bater.
-- =============================================================================
DO $verify$
DECLARE
  v_prokind    "char";
  v_secdef     boolean;
  v_rettype    text;
  v_searchpath text[];
BEGIN
  SELECT p.prokind, p.prosecdef, pg_catalog.pg_get_function_result(p.oid), p.proconfig
    INTO v_prokind, v_secdef, v_rettype, v_searchpath
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'confirmar_janela_retencao';

  IF v_prokind IS NULL THEN
    RAISE EXCEPTION 'P47 FAIL (a): confirmar_janela_retencao nao existe apos o apply';
  END IF;
  IF NOT v_secdef THEN
    RAISE EXCEPTION 'P47 FAIL (b): confirmar_janela_retencao nao e SECURITY DEFINER';
  END IF;
  IF v_rettype <> 'void' THEN
    RAISE EXCEPTION 'P47 FAIL (c): retorno esperado void, obtido %', v_rettype;
  END IF;
  -- ⚠ O valor REAL é `search_path=""` (com as aspas), não `search_path=`. Medido em
  -- PROD contra as irmãs `salvar_janela_retencao` e `explicacao_rejeicao_automatica`
  -- antes de escrever esta linha — a primeira versão comparava com `search_path=` e
  -- teria reprovado um apply correto.
  IF v_searchpath IS NULL OR NOT ('search_path=""' = ANY(v_searchpath)) THEN
    RAISE EXCEPTION 'P47 FAIL (d): search_path nao esta fixado em vazio (proconfig = %)', v_searchpath;
  END IF;

  -- (e) ⊖ NEGATIVA — o corpo NÃO pode escrever em janela_meses. É a propriedade que
  -- separa confirmar de alterar, e precisa ser FATO MEDIDO, não intenção declarada.
  --
  -- ⚠ OS COMENTÁRIOS SÃO REMOVIDOS ANTES DE CASAR. `prosrc` inclui os comentários do
  -- corpo, e o comentário do passo (4) desta própria função cita a forma proibida
  -- para explicar por que ela é proibida — sem o `regexp_replace` a asserção
  -- reprovaria a si mesma. É literalmente a WINDOWS 13 («o portão ficou VERDE por
  -- falso positivo: a sonda casa substring em comentário»), com o sinal trocado:
  -- aqui daria falso NEGATIVO. Uma sonda que lê texto tem de dizer QUAL texto lê.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
     JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'confirmar_janela_retencao'
      AND pg_catalog.regexp_replace(p.prosrc, '--[^' || chr(10) || ']*', '', 'g')
          ~* 'SET[[:space:]]+janela_meses|janela_meses[[:space:]]*='
  ) THEN
    RAISE EXCEPTION 'P47 FAIL (e): o corpo escreve em janela_meses — confirmar nao pode alterar o numero';
  END IF;

  RAISE NOTICE 'P47 OK — confirmar_janela_retencao aplicada: DEFINER, void, search_path vazio, sem escrita em janela_meses';
END;
$verify$;
