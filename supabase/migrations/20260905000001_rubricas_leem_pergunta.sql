-- =============================================================================
-- Migration: as duas rubricas vivas deixam de ensinar o modelo a ADIVINHAR a pergunta
-- Date: 2026-09-05
-- =============================================================================
-- ATE HOJE a Edge Function `analise-candidato-individual` mandava ao modelo so o
-- TEXTO de cada resposta da Etapa 1 — selecionava `pergunta_id` e nunca o usava.
-- As duas rubricas (…0019) compensaram isso com um paragrafo inteiro ("chegam como
-- lista solta, SEM o enunciado… identifique cada uma pelo proprio conteudo").
--
-- A EF passou a embutir `perguntas_formulario(texto_pergunta, ordem)` e a escrever
-- cada item como `Pergunta: …` / `Resposta: …`, na ordem do formulario. O paragrafo
-- virou instrucao FALSA: diz ao modelo que nao ha enunciado quando ha, e o manda
-- inferir o que agora esta escrito. Instrucao falsa no prompt nao falha — escorre.
--
-- ORDEM OBRIGATORIA: esta migration so pode ser aplicada DEPOIS do deploy da EF
-- nova. Ao contrario, a rubrica prometeria um formato que a EF ainda nao produz.
--
-- Dois portoes: o paragrafo antigo TEM de existir em cada vaga antes (senao esta
-- migration esta apontando para o texto errado) e NAO pode sobrar depois.
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $rub$
DECLARE
  v_novo constant text :=
    E'⚠ COMO LER AS RESPOSTAS DA ETAPA 1: cada item chega como «Pergunta: …» seguido de\n'
    E'«Resposta: …», na ordem do formulário. Julgue cada resposta À LUZ DA PERGUNTA que a\n'
    E'gerou, e trate-a como evidência de MESMO PESO que o currículo — uma disponibilidade\n'
    E'declarada na Etapa 1 conta tanto quanto se estivesse no CV. Se algum item vier sem a\n'
    E'linha «Pergunta:», identifique-o pelo próprio conteúdo.\n\n';
  v_old_sm constant text :=
    E'⚠ COMO LER AS RESPOSTAS DA ETAPA 1: elas chegam a você como uma lista solta, SEM o\n'
    E'enunciado de cada pergunta e em ordem arbitrária. Não conte com a posição. Identifique\n'
    E'cada uma pelo próprio conteúdo: links e @ de perfil são o portfólio; frases sobre\n'
    E'segunda a sexta são disponibilidade; faixas de anos são tempo de experiência.\n\n';
  v_old_cons constant text :=
    E'⚠ COMO LER AS RESPOSTAS DA ETAPA 1: elas chegam a você como uma lista solta, SEM o\n'
    E'enunciado de cada pergunta e em ordem arbitrária. Não conte com a posição — identifique\n'
    E'cada resposta pelo próprio conteúdo:\n'
    E'- frases sobre segunda a sexta, horário comercial ou trabalho remoto → disponibilidade;\n'
    E'- faixas de anos "em atendimento, vendas, recepção ou relacionamento" → tempo de experiência;\n'
    E'- a lista de atividades de rotina (WhatsApp, cadência de follow-up, CRM, agenda,\n'
    E'  Direct do Instagram, indicadores) → ferramentas e processo;\n'
    E'- frases sobre atender quem decide valor alto e sente insegurança → contexto de decisão;\n'
    E'- a frase sobre o que atrai na vaga → motivação.\n\n';
  v_n int;
BEGIN
  -- Portao 1: o texto antigo existe, byte a byte, em cada vaga.
  SELECT count(*) INTO v_n FROM public.vagas
   WHERE (slug = 'social-media-producao-captacao-conteudo' AND position(v_old_sm   in rubrica_ia) > 0)
      OR (slug = 'consultor-relacionamento-pre-vendas'     AND position(v_old_cons in rubrica_ia) > 0);
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'esperava o paragrafo antigo nas 2 vagas, achei em % — a rubrica viva nao e a que esta migration conhece', v_n;
  END IF;

  UPDATE public.vagas SET rubrica_ia = replace(rubrica_ia, v_old_sm,   v_novo), updated_at = now()
   WHERE slug = 'social-media-producao-captacao-conteudo';
  UPDATE public.vagas SET rubrica_ia = replace(rubrica_ia, v_old_cons, v_novo), updated_at = now()
   WHERE slug = 'consultor-relacionamento-pre-vendas';

  -- Portao 2: nada do antigo sobrou; o novo esta exatamente uma vez em cada.
  SELECT count(*) INTO v_n FROM public.vagas
   WHERE slug IN ('social-media-producao-captacao-conteudo','consultor-relacionamento-pre-vendas')
     AND position('lista solta' in rubrica_ia) = 0
     AND (length(rubrica_ia) - length(replace(rubrica_ia, v_novo, ''))) / length(v_novo) = 1;
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'pos-condicao falhou: % vaga(s) com o paragrafo novo exatamente uma vez e sem o antigo', v_n;
  END IF;
  RAISE NOTICE 'rubricas atualizadas: 2 vagas leem Pergunta/Resposta';
END
$rub$;
