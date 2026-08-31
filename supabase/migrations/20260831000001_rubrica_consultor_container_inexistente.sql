-- =============================================================================
-- Migration: a rubrica mandava guardar algo num container que NAO EXISTE
-- Date: 2026-08-31
-- =============================================================================
-- MEDIDO NA PRIMEIRA EXECUCAO REAL DA IA sobre esta vaga, 2026-08-31.
--
-- A rubrica dizia, sobre divergencia entre o curriculo e a faixa declarada na
-- Etapa 1:
--
--     "...registre a divergencia como observacao — nunca como gap."
--
-- O schema de saida da analise (`CvJobMatchSchema`, em
-- `_shared/analise-schemas.ts`) tem DOIS conteineres para achados: `strengths` e
-- `gaps`. NAO EXISTE "observacao". Eu escrevi a instrucao contra um formato
-- imaginado, sem ler o schema.
--
-- Diante disso o modelo fez a unica coisa possivel: registrou a divergencia em
-- `gaps`, com severidade `critical`. Resultado medido na candidata ficticia
-- "Camila": gap `critical` por "2 anos no CV, 2-5 anos na Etapa 1" — exatamente o
-- que a clausula existia para IMPEDIR. A instrucao nao foi ignorada; ela era
-- inexequivel.
--
-- ⚠ E A MESMA LICAO de [[prompt-sem-ordem-nem-rotulo]], por outra face: ler o
-- codigo que monta a ENTRADA do modelo, e tambem o schema que restringe a SAIDA,
-- antes de escrever a instrucao. Instrucao que aponta para um campo inexistente
-- nao falha — ela vaza para o campo mais proximo, em silencio.
--
-- Dois consertos:
--
-- 1. A regra de divergencia passa a usar `reasoning`, que EXISTE no schema, e diz
--    explicitamente que divergencia nao entra em `gaps` nem como `nice_to_have`.
--    Acrescenta o caso concreto observado: resumo do proprio candidato ("atuo ha 2
--    anos") conflitando com as datas que ele mesmo lista e imprecisao de redacao,
--    nao falta de experiencia.
--
-- 2. `severity: critical` passa a ser reservado aos tres eliminatorios. O modelo
--    usou `critical` numa competencia, e `critical` carrega a consequencia de
--    segurar o score abaixo de 40 — aplicar isso a uma competencia impoe ao
--    candidato uma penalidade que ninguem decidiu para aquele caso.
--
-- A vaga de Social Media foi conferida e NAO tem clausula equivalente: o defeito
-- nasceu comigo, aqui, em 2026-08-30.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

UPDATE public.vagas
   SET rubrica_ia = $rub2$## Requisitos eliminatórios
Se qualquer um estiver AUSENTE no currículo, registre como gap de severidade `critical`
e mantenha o score composto abaixo de 40, por melhor que seja o resto do perfil.
- Ensino médio completo.
- Pelo menos 1 ano de experiência em atendimento, vendas, recepção ou relacionamento.
  A Etapa 1 coleta isso em faixas nomeadas ("Menos de 1 ano em atendimento, vendas,
  recepção ou relacionamento com cliente", "Entre 1 e 2 anos…").
  ⚠ REGRA DE DIVERGÊNCIA. Quando a faixa declarada e as datas do currículo não
  batem, fique com a MAIOR das duas e comente isso em `reasoning`. Divergência
  entre as fontes NÃO É GAP e não entra em `gaps` — nem como `nice_to_have`.
  Só registre gap de experiência quando as DUAS fontes ficarem abaixo de 1 ano.
  Resumo do próprio candidato ("atuo há 2 anos") que conflite com as datas que ele
  mesmo lista é imprecisão de redação de currículo, não falta de experiência.
- Disponibilidade integral e presencial, de segunda a sexta.
  ⚠ ISTO NÃO SE JULGA PELO CURRÍCULO, e desde 2026-08-27 não precisa: a Etapa 1 tem
  pergunta obrigatória sobre disponibilidade, e a resposta chega em texto que se explica
  sozinho.
  · "…integral e presencial, de segunda a sexta, no horário comercial" → atendido.
  · "…integral e presencial, mas precisaria ajustar o horário de entrada ou de saída"
    → atendido, com observação sobre o ajuste. Querer negociar horário não é
    indisponibilidade, e tratar como se fosse cortaria gente por um pedido legítimo.
  · "…apenas parcial, em alguns dias da semana" → gap `critical`.
  · nenhuma frase sobre disponibilidade nas respostas → `insufficient_evidence`, nunca
    ausência: seria descontar do candidato uma falha do sistema.
  O silêncio do CURRÍCULO sobre disponibilidade continua não sendo evidência de nada.

⚠ COMO LER AS RESPOSTAS DA ETAPA 1: elas chegam a você como uma lista solta, SEM o
enunciado de cada pergunta e em ordem arbitrária. Não conte com a posição — identifique
cada resposta pelo próprio conteúdo:
- frases sobre segunda a sexta, horário comercial ou trabalho remoto → disponibilidade;
- faixas de anos "em atendimento, vendas, recepção ou relacionamento" → tempo de experiência;
- a lista de atividades de rotina (WhatsApp, cadência de follow-up, CRM, agenda,
  Direct do Instagram, indicadores) → ferramentas e processo;
- frases sobre atender quem decide valor alto e sente insegurança → contexto de decisão;
- a frase sobre o que atrai na vaga → motivação.

⚠ `severity` DOS GAPS. Use `critical` APENAS para os três requisitos
eliminatórios listados acima. Gap de competência, por pior que seja, é no máximo
`important` — `critical` carrega a consequência de segurar o score abaixo de 40, e
usá-lo numa competência aplica a um candidato uma penalidade que não foi decidida
para aquele caso.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

1. Comunicação escrita profissional
   Peso ALTO. A função é atender e vender por escrito.
   5 = atendimento ou venda por escrito como atividade central, com volume.
   3 = escreveu no trabalho, mas de forma acessória.
   1 = nenhuma evidência de escrita profissional.
   Considere também a clareza e a ortografia do próprio currículo como evidência.

2. Venda consultiva e follow-up
   Peso ALTO.
   5 = responsável por prospecção, cadência e retomada de contato, com meta (SDR,
       pré-vendas, inside sales, social seller).
   3 = vendeu de forma reativa, balcão ou atendimento passivo.
   1 = nenhuma experiência comercial.

3. Disciplina de processo e CRM
   Peso MÉDIO.
   5 = operou CRM diariamente (GoHighLevel, Clinicorp, RD, HubSpot, Pipedrive ou similar).
   3 = organizou agenda ou follow-up por planilha ou sistema próprio.
   1 = nenhuma evidência de registro ou processo.
   A Etapa 1 pergunta isto de frente: marcar "Registro de todo contato em CRM (…)" na
   lista de rotina é evidência forte. Não ter marcado, tendo marcado OUTRAS opções da
   mesma lista, é evidência de ausência — a pessoa teve onde dizer e não disse. Mas
   marcar apenas "Nenhuma destas ainda é rotina do meu trabalho" não anula o que o
   currículo comprovar: some as duas fontes, não substitua uma pela outra.

4. Contexto de decisão que envolve dinheiro e insegurança
   Peso MÉDIO. Conta ponto, não elimina.
   5 = saúde, odontologia ou estética, OU venda de ticket médio/alto com negociação
       de orçamento.
   3 = varejo ou serviço de ticket baixo.
   1 = nenhum contato com cliente final.
   A Etapa 1 coleta isto diretamente, e as respostas mapeiam na régua acima:
   "…em clínica odontológica, estética ou de saúde" e "…em outro setor (imóveis,
   veículos, educação, serviços financeiros)" → faixa 5; "…mas em produto ou serviço de
   ticket baixo" → faixa 3; "Ainda não atendi cliente final nesse tipo de decisão" →
   faixa 1. Isto é ponto, não corte: a faixa 1 aqui NUNCA vira gap `critical`.

5. Consistência
   Peso BAIXO.
   Avalie permanência e histórico de cumprir meta ou prazo, quando houver evidência.
   NÃO penalize número de empregos, troca de área ou intervalo entre empregos —
   isso não é evidência de desempenho.

## O que NÃO pode pesar em nenhuma hipótese
- Nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro ou regionalismo.
- Ter ou não ter curso superior além do ensino médio exigido; prestígio da instituição.
- Tempo em desemprego.
- "Perfil jovem", "boa energia", "boa aparência", "proatividade" sem evidência citável.
- Os adjetivos do anúncio da vaga — "operação enxuta", "ambição saudável", "trilha de
  carreira". Descrevem a EMPRESA e não são critério sobre o candidato.

Todo ponto forte e todo gap deve citar trecho literal do currículo. Se o currículo não
permite julgar uma competência, use `insufficient_evidence` — é melhor que chutar.$rub2$,
       updated_at = NOW()
 WHERE slug = 'consultor-relacionamento-pre-vendas' AND deleted_at IS NULL;

DO $gate$
DECLARE
  v_rub text;
BEGIN
  SELECT rubrica_ia INTO v_rub FROM public.vagas
   WHERE slug = 'consultor-relacionamento-pre-vendas' AND deleted_at IS NULL;

  -- A clausula inexequivel tem de ter SUMIDO. Conferir so que a nova chegou
  -- passaria com as duas convivendo, e a antiga continuaria mandando o modelo
  -- escrever num campo que nao existe.
  IF v_rub LIKE '%registre a divergência como observação%' THEN
    RAISE EXCEPTION 'a clausula que manda registrar "como observacao" continua na rubrica — o schema nao tem esse container e o modelo voltaria a jogar em gaps';
  END IF;
  IF v_rub NOT LIKE '%comente isso em `reasoning`%' THEN
    RAISE EXCEPTION 'a nova regra de divergencia nao entrou';
  END IF;
  IF v_rub NOT LIKE '%NÃO É GAP e não entra em `gaps`%' THEN
    RAISE EXCEPTION 'falta a proibicao explicita de registrar divergencia como gap';
  END IF;
  IF v_rub NOT LIKE '%Use `critical` APENAS para os três requisitos%' THEN
    RAISE EXCEPTION 'falta a regra que reserva `critical` aos eliminatorios';
  END IF;

  RAISE NOTICE 'ok: rubrica com % caracteres, sem instrucao para container inexistente', length(v_rub);
END
$gate$;
