-- =============================================================================
-- Migration: pontuar_sjt passa a reconhecer as DUAS convenções de testes_aplicaveis
-- Date: 2026-08-26
-- =============================================================================
--
-- ⛔ O DEFEITO. Duas convenções convivem em `vagas.testes_aplicaveis` e os leitores
-- só conheciam a antiga:
--
--   antiga (vagas de teste do M2)   { "tipo": "sjt", "cargo": …, "itens_ids": [...] }
--   atual  (cargoTemplates.ts)      { "teste": "work_sample_sjt", "obrigatorio": … }
--
-- Medido em 2026-08-26: `teste-dentista-funil-e2e` traz `tipo:'sjt'` e casa;
-- `social-media-producao-captacao-conteudo` e `teste-e2e-social-media` trazem
-- `teste:'work_sample_sjt'` e NÃO casam. A segunda forma é a que o seletor de
-- template gera — ou seja, a que TODA vaga nova recebe hoje.
--
-- Esta função monta a bateria do SJT com:
--
--   WHERE v.id = v_vaga AND elem->>'tipo' = 'sjt'
--
-- Para as vagas atuais isso não encontra elemento nenhum: `v_cargo` e `v_itens_ids`
-- ficam NULL, a bateria sai vazia e a RPC aborta com «bateria SJT nao configurada».
-- O SJT estava inacessível em toda vaga criada pelo caminho de hoje.
--
-- ⚠ O LADO CLIENTE FALHAVA NA DIREÇÃO OPOSTA, e isso é o que torna o par perigoso:
-- `avaliacaoService` usava o MESMO `tipo='sjt'` para FILTRAR o que exibir, e sem
-- match não aplicava filtro nenhum — mostrava o banco inteiro. O candidato de Social
-- Media veria questões de dentista e de recepcionista, responderia as dez, e só ao
-- enviar descobriria que a bateria não existe. Um lado abria demais, o outro fechava
-- de todo.
--
-- Esta migration só amplia o reconhecimento. Não reescreve dado, não altera a
-- semântica de quem já casava, e a vaga antiga continua funcionando igual.
--
-- ⚠ O QUE ISTO **NÃO** RESOLVE, e precisa de decisão de produto: o template atual
-- não grava `cargo` nem `itens_ids` no elemento do SJT. Reconhecer o elemento passa
-- a encontrá-lo, mas ele segue sem dizer QUAL bateria aplicar — então a RPC continua
-- (corretamente) recusando com «bateria SJT nao configurada», agora pelo motivo
-- verdadeiro. Configurar a bateria por vaga é o próximo passo.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $sjt$
DECLARE
  v_def text;
  v_novo text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'pontuar_sjt';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'pontuar_sjt nao existe';
  END IF;

  IF position('work_sample_sjt' in v_def) > 0 THEN
    RAISE NOTICE 'pontuar_sjt ja reconhece as duas convencoes — nada a fazer';
    RETURN;
  END IF;

  v_novo := replace(
    v_def,
    'WHERE v.id = v_vaga AND elem->>''tipo'' = ''sjt'' LIMIT 1',
    'WHERE v.id = v_vaga
     AND (elem->>''tipo'' = ''sjt''
          OR elem->>''teste'' IN (''sjt'', ''work_sample_sjt''))
   LIMIT 1'
  );

  IF v_novo = v_def THEN
    RAISE EXCEPTION 'a substituicao nao pegou — o corpo de pontuar_sjt mudou desde 2026-08-26; revise a mao';
  END IF;

  EXECUTE v_novo;
  RAISE NOTICE 'pontuar_sjt reconhece tipo=sjt E teste=work_sample_sjt';
END
$sjt$;
