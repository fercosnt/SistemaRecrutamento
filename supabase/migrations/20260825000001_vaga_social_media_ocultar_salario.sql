-- =============================================================================
-- Migration: ocultar a faixa salarial da vaga social-media-producao-captacao-conteudo
-- Date: 2026-08-25
-- =============================================================================
--
-- ⛔ O DEFEITO, e ele e de EXPECTATIVA, nao de codigo. A vaga tem
-- `exibir_salario = false`, e quem le essa flag conclui que o salario esta
-- oculto. Nao estava: a faixa tambem vinha escrita POR EXTENSO dentro de
-- `beneficios` — "Salario fixo: de R$ 3.500 a R$ 4.500" — e esse campo E
-- renderizado pelo TextoRico. Conferido na tela em 2026-08-25: o valor aparecia
-- para qualquer visitante da pagina publica.
--
-- A flag protege a COLUNA (faixa_salarial_min/max); nunca protegeu o TEXTO de
-- outro campo. Duas fontes para o mesmo fato, e so uma sob controle da flag.
--
-- Este arquivo remove a linha do valor. A faixa CONTINUA em
-- faixa_salarial_min/max (3500/4500) para uso interno — o que muda e o que o
-- candidato ve. A linha de "Evolucao" migra para a lista de Beneficios em vez de
-- ficar sozinha sob um "### Remuneracao" orfao.
--
-- ⚠ ESTE ARQUIVO E IDEMPOTENTE, E POR UM MOTIVO CONSTRANGEDOR. Ao provar se o
-- portao abaixo mordia, a versao mutada do arquivo foi executada com
-- `p46apply.cjs run` SEM o `SELECT 1/0` final — e `run` NAO e uma simulacao: ele
-- executa. O texto de teste ("Salario de R$ 9.999 por mes") chegou a producao e
-- ficou visivel por cerca de dois minutos, ate ser revertido por um UPDATE que
-- tambem nao deixou artefato. Esta migration REGULARIZA esse estado: ela grava o
-- texto correto seja qual for o conteudo atual, e por isso pode rodar sobre um
-- banco ja consertado sem efeito nenhum.
--
-- Duas licoes, e a segunda causou a primeira:
--   · `run` sem `SELECT 1/0` no fim ESCREVE. O que torna a sonda segura e a
--     divisao por zero, nao o subcomando;
--   · o portao original tinha o regex 'R\\$ *[0-9]', que em SQL com
--     standard_conforming_strings=on procura uma BARRA seguida de fim-de-linha —
--     nunca um cifrao. Ele nasceu incapaz de falhar, e foi por isso que nao
--     abortou a transacao mutada. Um portao que nao pode falhar e pior que um
--     quebrado: ele da a impressao de vigiar. O regex correto e 'R\$ *[0-9]', e
--     esta migration prova por execucao que ele morde antes de ser aplicada.
--
-- So marcas que o TextoRico conhece. Reversivel: o texto anterior esta no git.
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $sal$
DECLARE
  v_autor uuid;
  v_vaga  uuid;
  v_resto int;
BEGIN
  SELECT user_id INTO v_autor
    FROM public.usuarios_rh
   WHERE email = 'fernando@beautysmile.com.br' AND ativo IS TRUE AND deleted_at IS NULL;
  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido — o campo mudaria sem dono em updated_by';
  END IF;

  SELECT id INTO v_vaga FROM public.vagas
   WHERE slug = 'social-media-producao-captacao-conteudo' AND deleted_at IS NULL;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'vaga "%" nao encontrada', 'social-media-producao-captacao-conteudo';
  END IF;

  UPDATE public.vagas
     SET beneficios = $ben$### Benefícios

- Vale transporte, vale refeição e plano de saúde.
- Acesso ao Gympass.
- Tratamentos Beauty Smile e desconto em procedimentos para familiares, conforme política interna.
- Cursos e treinamentos internos, com aprendizado direto sobre laser, saúde integrativa e odontologia estética.
- **Evolução:** a progressão vem pela trilha de carreira — a etapa de Analista de Conteúdo abre com entrega constante comprovada.

*Benefícios válidos após o período de experiência (3 meses).*$ben$,
         updated_by = v_autor
   WHERE id = v_vaga;

  -- Portao: prova por EXECUCAO que nenhum campo RENDERIZADO ainda expoe o valor.
  -- Vale para os 9 campos que a pagina da vaga mostra — nao adianta limpar
  -- `beneficios` e o numero continuar em `sobre_cargo` ou `diferenciais`.
  -- O `\$` escapa o cifrao para o motor de regex; ver a nota do cabecalho.
  SELECT count(*) INTO v_resto FROM public.vagas
   WHERE id = v_vaga
     AND (coalesce(descricao_curta,'') || coalesce(sobre_cargo,'') ||
          coalesce(responsabilidades,'') || coalesce(requisitos_formacao,'') ||
          coalesce(requisitos_experiencia,'') || coalesce(requisitos_tecnicos,'') ||
          coalesce(requisitos_habilidades,'') || coalesce(diferenciais,'') ||
          coalesce(beneficios,'')) ~ 'R\$ *[0-9]';
  IF v_resto > 0 THEN
    RAISE EXCEPTION 'ainda ha valor em real num campo renderizado — ocultar o salario nao teve efeito';
  END IF;

  RAISE NOTICE 'faixa salarial removida do texto visivel da vaga %', v_vaga;
END
$sal$;
