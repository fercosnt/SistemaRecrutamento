-- =============================================================================
-- Migration: `gaps` estava virando checklist — requisito ATENDIDO como gap critico
-- Date: 2026-08-31
-- =============================================================================
-- SEGUNDA RODADA sobre a mesma rubrica, no mesmo dia, e o defeito desta vez foi
-- INTRODUZIDO PELO CONSERTO ANTERIOR (20260831000001).
--
-- Aquele conserto tirou o gap falso de divergencia entre CV e Etapa 1 — e
-- funcionou: o gap sumiu na reanalise. Mas no lugar apareceu isto, na candidata
-- ficticia "Camila":
--
--   "Experiencia em atendimento, vendas, recepcao ou relacionamento —
--    Experiencia valida na etapa 1 foi considerada 2 anos, ATENDENDO AO
--    REQUISITO. [critical]"
--
-- Um requisito ATENDIDO, registrado como gap CRITICO, com a propria nota dizendo
-- que esta em ordem. E foi ele que levou o score de 45 para 39 — abaixo do corte de
-- 40, por um item que se contradiz.
--
-- CAUSA: minha instrucao anterior dizia QUANDO registrar gap de experiencia ("so
-- quando as duas fontes ficarem abaixo de 1 ano"), mas nunca disse o que `gaps`
-- SIGNIFICA. O modelo passou a usar `gaps` como checklist dos eliminatorios,
-- marcando cada um — inclusive os satisfeitos.
--
-- CONSERTO: uma regra geral, antes de tudo, dizendo que `gaps` lista apenas o que
-- FALTA, e que requisito atendido nao entra em severidade nenhuma.
--
-- ⚠ E A SEGUNDA VEZ NESTA SESSAO que a rodada de conserto de prompt introduz
-- problema novo — o mesmo padrao de [[re-review-apos-conserto-pega-blocker-novo]].
-- Por isso este apply foi precedido de REANALISE REAL da candidata, e nao de
-- leitura do texto: a primeira correcao parecia certa lendo, e so a execucao
-- mostrou o efeito colateral.
--
-- A rubrica ENCOLHEU de 5783 para 5692 caracteres mesmo ganhando regra nova: as
-- duas clausulas que eu havia inflado no conserto anterior foram compactadas. O
-- validador avisa acima de 6000 (orcamento de tokens do cv_job_match), e a rubrica
-- vinha crescendo a cada rodada minha.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

UPDATE public.vagas
   SET rubrica_ia = $rub3$⚠ `gaps` LISTA SÓ O QUE FALTA. Requisito atendido não entra, em severidade
nenhuma. Se a nota diria "atende ao requisito", o item não é gap: vira `strengths`
ou não aparece.

## Requisitos eliminatórios
Se algum estiver AUSENTE, registre gap `critical` e mantenha o score abaixo de 40,
por melhor que seja o resto do perfil. Se estiver atendido, não registre nada.
- Ensino médio completo.
- Pelo menos 1 ano de experiência em atendimento, vendas, recepção ou relacionamento.
  A Etapa 1 coleta isso em faixas nomeadas ("Menos de 1 ano em atendimento, vendas,
  recepção ou relacionamento com cliente", "Entre 1 e 2 anos…").
  ⚠ DIVERGÊNCIA entre a faixa declarada e as datas do currículo: fique com a MAIOR
  das duas e comente em `reasoning` — nunca em `gaps`. Gap de experiência só quando
  AMBAS ficam abaixo de 1 ano. Resumo do candidato ("atuo há 2 anos") conflitando
  com as datas que ele mesmo lista é imprecisão de redação, não falta de experiência.
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

⚠ `critical` é SÓ para os três eliminatórios. Gap de competência é no máximo
`important`: `critical` segura o score abaixo de 40, e usá-lo numa competência impõe
uma penalidade que ninguém decidiu para aquele caso.

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
permite julgar uma competência, use `insufficient_evidence` — é melhor que chutar.$rub3$,
       updated_at = NOW()
 WHERE slug = 'consultor-relacionamento-pre-vendas' AND deleted_at IS NULL;

DO $gate$
DECLARE
  v_rub text;
BEGIN
  SELECT rubrica_ia INTO v_rub FROM public.vagas
   WHERE slug = 'consultor-relacionamento-pre-vendas' AND deleted_at IS NULL;

  IF v_rub NOT LIKE '%`gaps` LISTA SÓ O QUE FALTA%' THEN
    RAISE EXCEPTION 'a regra sobre o significado de `gaps` nao entrou — o modelo voltaria a marcar requisito atendido como gap';
  END IF;
  IF v_rub NOT LIKE '%Se estiver atendido, não registre nada%' THEN
    RAISE EXCEPTION 'falta a instrucao explicita para nao registrar eliminatorio atendido';
  END IF;
  -- As duas regras do conserto anterior tem de sobreviver a compactacao.
  IF v_rub NOT LIKE '%nunca em `gaps`%' THEN
    RAISE EXCEPTION 'a regra de divergencia se perdeu na compactacao';
  END IF;
  IF v_rub NOT LIKE '%`critical` é SÓ para os três eliminatórios%' THEN
    RAISE EXCEPTION 'a regra de severidade se perdeu na compactacao';
  END IF;
  IF length(v_rub) > 6000 THEN
    RAISE EXCEPTION 'rubrica com % caracteres — acima do limiar de 6000 do validador', length(v_rub);
  END IF;

  RAISE NOTICE 'ok: rubrica com % caracteres', length(v_rub);
END
$gate$;
