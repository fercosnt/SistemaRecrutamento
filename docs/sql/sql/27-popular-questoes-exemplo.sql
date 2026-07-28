-- ============================================================================
-- Migration: 27-popular-questoes-exemplo.sql
-- Description: Popular questões de exemplo para Big Five, DISC e Raven
-- Dependencies:
--   - 20-tabelas-bigfive.sql
--   - 21-tabelas-disc.sql
--   - 22-tabelas-raven.sql
-- Author: Sistema de Recrutamento
-- Created: 2025-11-03
-- Updated: 2025-11-03 - Questões corrigidas com base nos documentos científicos
-- ============================================================================

-- ============================================================================
-- IMPORTANTE: Este script popula questões VALIDADAS cientificamente
-- ============================================================================
-- - Big Five: 100 questões (20 por dimensão, baseado em "As 5 Grandes Traços e 10 Aspectos")
-- - DISC: 28 questões (baseado em "Test DISC")
-- - Raven: 60 questões (12 por série)
-- ============================================================================


-- ============================================================================
-- 1. POPULAR QUESTÕES BIG FIVE (100 questões)
-- ============================================================================
-- Baseado no documento: "As 5 Grandes Traços e 10 Aspectos"
-- Estrutura: 5 traços × 2 aspectos × 10 questões = 100 questões
-- (R) indica questão com pontuação invertida
-- ============================================================================

DO $$
DECLARE
    v_usuario_rh_id UUID;
BEGIN
    -- Obter um usuário RH ativo para created_by
    SELECT id INTO v_usuario_rh_id FROM usuarios_rh WHERE ativo = TRUE LIMIT 1;

    IF v_usuario_rh_id IS NULL THEN
        RAISE NOTICE 'AVISO: Nenhum usuário RH encontrado. Questões serão criadas sem created_by.';
    END IF;

    RAISE NOTICE 'Inserindo 100 questões Big Five (validadas cientificamente)...';

    -- ========================================================================
    -- EXTROVERSÃO (20 questões: 10 Entusiasmo + 10 Assertividade)
    -- ========================================================================

    -- Aspecto: Entusiasmo (10 questões)
    INSERT INTO questoes_bigfive (numero_questao, versao, texto_questao, dimensao, is_invertida, created_by)
    VALUES
        (1, 1, 'Faço amigos facilmente.', 'extraversion', FALSE, v_usuario_rh_id),
        (2, 1, 'É difícil me conhecer.', 'extraversion', TRUE, v_usuario_rh_id),
        (3, 1, 'Mantenho os outros à distância.', 'extraversion', TRUE, v_usuario_rh_id),
        (4, 1, 'Revelo pouco sobre mim mesmo.', 'extraversion', TRUE, v_usuario_rh_id),
        (5, 1, 'Sente-se rapidamente à vontade e confortável com pessoas que acabou de conhecer', 'extraversion', FALSE, v_usuario_rh_id),
        (6, 1, 'Raramente me deixo levar pela empolgação do momento.', 'extraversion', TRUE, v_usuario_rh_id),
        (7, 1, 'Não sou uma pessoa muito entusiasmada.', 'extraversion', TRUE, v_usuario_rh_id),
        (8, 1, 'Demonstro meus sentimentos quando estou feliz.', 'extraversion', FALSE, v_usuario_rh_id),
        (9, 1, 'Divirto-me muito.', 'extraversion', FALSE, v_usuario_rh_id),
        (10, 1, 'Rio bastante.', 'extraversion', FALSE, v_usuario_rh_id),

    -- Aspecto: Assertividade (10 questões)
        (11, 1, 'Tomo a dianteira e assumo o comando.', 'extraversion', FALSE, v_usuario_rh_id),
        (12, 1, 'Tenho uma personalidade forte.', 'extraversion', FALSE, v_usuario_rh_id),
        (13, 1, 'Falta-me talento para influenciar as pessoas.', 'extraversion', TRUE, v_usuario_rh_id),
        (14, 1, 'Sei como cativar as pessoas.', 'extraversion', FALSE, v_usuario_rh_id),
        (15, 1, 'Espero que outros liderem o caminho.', 'extraversion', TRUE, v_usuario_rh_id),
        (16, 1, 'Vejo-me como um bom líder.', 'extraversion', FALSE, v_usuario_rh_id),
        (17, 1, 'Consigo convencer os outros a fazer coisas.', 'extraversion', FALSE, v_usuario_rh_id),
        (18, 1, 'Evitar compartilhar minhas opiniões.', 'extraversion', TRUE, v_usuario_rh_id),
        (19, 1, 'Sou o primeiro a agir.', 'extraversion', FALSE, v_usuario_rh_id),
        (20, 1, 'Não tenho uma personalidade assertiva.', 'extraversion', TRUE, v_usuario_rh_id),

    -- ========================================================================
    -- NEUROTICISMO (20 questões: 10 Volatilidade + 10 Retraimento)
    -- ========================================================================

    -- Aspecto: Volatilidade (10 questões)
        (21, 1, 'Fico irritado com facilidade.', 'neuroticism', FALSE, v_usuario_rh_id),
        (22, 1, 'Raramente fico irritado.', 'neuroticism', TRUE, v_usuario_rh_id),
        (23, 1, 'Fico incomodado facilmente.', 'neuroticism', FALSE, v_usuario_rh_id),
        (24, 1, 'Mantenho minhas emoções sob controle.', 'neuroticism', TRUE, v_usuario_rh_id),
        (25, 1, 'Meu humor muda com frequência.', 'neuroticism', FALSE, v_usuario_rh_id),
        (26, 1, 'Raramente perco a calma.', 'neuroticism', TRUE, v_usuario_rh_id),
        (27, 1, 'Sou uma pessoa cujo humor oscila facilmente.', 'neuroticism', FALSE, v_usuario_rh_id),
        (28, 1, 'Não me irrito facilmente.', 'neuroticism', TRUE, v_usuario_rh_id),
        (29, 1, 'Me exalto com facilidade.', 'neuroticism', FALSE, v_usuario_rh_id),
        (30, 1, 'Posso ser provocado facilmente.', 'neuroticism', FALSE, v_usuario_rh_id),

    -- Aspecto: Retraimento (10 questões)
        (31, 1, 'Raramente me sinto triste.', 'neuroticism', TRUE, v_usuario_rh_id),
        (32, 1, 'Sinto-me inseguro sobre muitas coisas.', 'neuroticism', FALSE, v_usuario_rh_id),
        (33, 1, 'Sinto-me confortável comigo mesmo.', 'neuroticism', TRUE, v_usuario_rh_id),
        (34, 1, 'Sinto-me ameaçado facilmente.', 'neuroticism', FALSE, v_usuario_rh_id),
        (35, 1, 'Raramente me sinto deprimido.', 'neuroticism', TRUE, v_usuario_rh_id),
        (36, 1, 'Preocupo-me com as coisas.', 'neuroticism', FALSE, v_usuario_rh_id),
        (37, 1, 'Desanimo facilmente.', 'neuroticism', FALSE, v_usuario_rh_id),
        (38, 1, 'Não fico envergonhado com facilidade.', 'neuroticism', TRUE, v_usuario_rh_id),
        (39, 1, 'Sinto-me sobrecarregado pelos eventos.', 'neuroticism', FALSE, v_usuario_rh_id),
        (40, 1, 'Tenho medo de muitas coisas.', 'neuroticism', FALSE, v_usuario_rh_id),

    -- ========================================================================
    -- COMPLACÊNCIA/AGREEABLENESS (20 questões: 10 Compaixão + 10 Polidez)
    -- ========================================================================

    -- Aspecto: Compaixão (10 questões)
        (41, 1, 'Não me interesso pelos problemas dos outros.', 'agreeableness', TRUE, v_usuario_rh_id),
        (42, 1, 'Sinto as emoções dos outros.', 'agreeableness', FALSE, v_usuario_rh_id),
        (43, 1, 'Pergunto se os outros estão se sentindo bem.', 'agreeableness', FALSE, v_usuario_rh_id),
        (44, 1, 'Não me preocupo com as necessidades dos outros.', 'agreeableness', TRUE, v_usuario_rh_id),
        (45, 1, 'Simpatizo com os sentimentos dos outros.', 'agreeableness', FALSE, v_usuario_rh_id),
        (46, 1, 'Sou indiferente aos sentimentos dos outros.', 'agreeableness', TRUE, v_usuario_rh_id),
        (47, 1, 'Não dedico tempo aos outros.', 'agreeableness', TRUE, v_usuario_rh_id),
        (48, 1, 'Interesso-me pela vida de outras pessoas.', 'agreeableness', FALSE, v_usuario_rh_id),
        (49, 1, 'Não tenho um lado sensível.', 'agreeableness', TRUE, v_usuario_rh_id),
        (50, 1, 'Gosto de fazer coisas pelos outros.', 'agreeableness', FALSE, v_usuario_rh_id),

    -- Aspecto: Polidez (10 questões)
        (51, 1, 'Respeito a autoridade.', 'agreeableness', FALSE, v_usuario_rh_id),
        (52, 1, 'Insulto as pessoas.', 'agreeableness', TRUE, v_usuario_rh_id),
        (53, 1, 'Odeio parecer insistente.', 'agreeableness', FALSE, v_usuario_rh_id),
        (54, 1, 'Acredito que sou melhor que os outros.', 'agreeableness', TRUE, v_usuario_rh_id),
        (55, 1, 'Evito impor minha vontade aos outros.', 'agreeableness', FALSE, v_usuario_rh_id),
        (56, 1, 'Raramente coloco as pessoas sob pressão.', 'agreeableness', FALSE, v_usuario_rh_id),
        (57, 1, 'Aproveito-me dos outros.', 'agreeableness', TRUE, v_usuario_rh_id),
        (58, 1, 'Busco conflito.', 'agreeableness', TRUE, v_usuario_rh_id),
        (59, 1, 'Adoro uma boa briga.', 'agreeableness', TRUE, v_usuario_rh_id),
        (60, 1, 'Só busco meu próprio benefício.', 'agreeableness', TRUE, v_usuario_rh_id),

    -- ========================================================================
    -- CONSCIENCIOSIDADE (20 questões: 10 Industriosidade + 10 Ordem)
    -- ========================================================================

    -- Aspecto: Industriosidade (10 questões)
        (61, 1, 'Faço com que meus planos sejam realizados.', 'conscientiousness', FALSE, v_usuario_rh_id),
        (62, 1, 'Desperdiço meu tempo.', 'conscientiousness', TRUE, v_usuario_rh_id),
        (63, 1, 'Tenho dificuldade para começar a trabalhar.', 'conscientiousness', TRUE, v_usuario_rh_id),
        (64, 1, 'Cometo erros ao realizar tarefas.', 'conscientiousness', TRUE, v_usuario_rh_id),
        (65, 1, 'Termino o que começo.', 'conscientiousness', FALSE, v_usuario_rh_id),
        (66, 1, 'Não me concentro na tarefa em questão.', 'conscientiousness', TRUE, v_usuario_rh_id),
        (67, 1, 'Faço as coisas rapidamente.', 'conscientiousness', FALSE, v_usuario_rh_id),
        (68, 1, 'Sempre sei o que estou fazendo.', 'conscientiousness', FALSE, v_usuario_rh_id),
        (69, 1, 'Adio decisões.', 'conscientiousness', TRUE, v_usuario_rh_id),
        (70, 1, 'Distraio-me facilmente.', 'conscientiousness', TRUE, v_usuario_rh_id),

    -- Aspecto: Ordem (10 questões)
        (71, 1, 'Deixo meus pertences espalhados.', 'conscientiousness', TRUE, v_usuario_rh_id),
        (72, 1, 'Gosto de ordem.', 'conscientiousness', FALSE, v_usuario_rh_id),
        (73, 1, 'Mantenho as coisas arrumadas.', 'conscientiousness', FALSE, v_usuario_rh_id),
        (74, 1, 'Sigo um cronograma.', 'conscientiousness', FALSE, v_usuario_rh_id),
        (75, 1, 'Não me incomodo com pessoas bagunceiras.', 'conscientiousness', TRUE, v_usuario_rh_id),
        (76, 1, 'Quero que tudo esteja "no lugar certo".', 'conscientiousness', FALSE, v_usuario_rh_id),
        (77, 1, 'Não me incomodo com a desordem.', 'conscientiousness', TRUE, v_usuario_rh_id),
        (78, 1, 'Não gosto de rotina.', 'conscientiousness', TRUE, v_usuario_rh_id),
        (79, 1, 'Certifico-me de que as regras sejam seguidas.', 'conscientiousness', FALSE, v_usuario_rh_id),
        (80, 1, 'Quero que cada detalhe seja cuidado.', 'conscientiousness', FALSE, v_usuario_rh_id),

    -- ========================================================================
    -- ABERTURA À EXPERIÊNCIA (20 questões: 10 Intelecto + 10 Estética)
    -- ========================================================================

    -- Aspecto: Intelecto (10 questões)
        (81, 1, 'Compreendo as coisas rapidamente.', 'openness', FALSE, v_usuario_rh_id),
        (82, 1, 'Tenho dificuldade em entender ideias abstratas.', 'openness', TRUE, v_usuario_rh_id),
        (83, 1, 'Consigo lidar com muita informação.', 'openness', FALSE, v_usuario_rh_id),
        (84, 1, 'Gosto de resolver problemas complexos.', 'openness', FALSE, v_usuario_rh_id),
        (85, 1, 'Evito discussões filosóficas.', 'openness', TRUE, v_usuario_rh_id),
        (86, 1, 'Evito material de leitura difícil.', 'openness', TRUE, v_usuario_rh_id),
        (87, 1, 'Tenho um vocabulário rico.', 'openness', FALSE, v_usuario_rh_id),
        (88, 1, 'Penso rapidamente.', 'openness', FALSE, v_usuario_rh_id),
        (89, 1, 'Aprendo devagar.', 'openness', TRUE, v_usuario_rh_id),
        (90, 1, 'Formulo ideias claramente.', 'openness', FALSE, v_usuario_rh_id),

    -- Aspecto: Estética (10 questões)
        (91, 1, 'Aprecio contemplar a beleza da natureza.', 'openness', FALSE, v_usuario_rh_id),
        (92, 1, 'Acredito na importância da arte.', 'openness', FALSE, v_usuario_rh_id),
        (93, 1, 'Adoro refletir sobre as coisas.', 'openness', FALSE, v_usuario_rh_id),
        (94, 1, 'Fico profundamente imerso na música.', 'openness', FALSE, v_usuario_rh_id),
        (95, 1, 'Não gosto de poesia.', 'openness', TRUE, v_usuario_rh_id),
        (96, 1, 'Vejo beleza em coisas que outros talvez não notem.', 'openness', FALSE, v_usuario_rh_id),
        (97, 1, 'Preciso de um canal para expressar minha criatividade.', 'openness', FALSE, v_usuario_rh_id),
        (98, 1, 'Raramente me perco em pensamentos.', 'openness', TRUE, v_usuario_rh_id),
        (99, 1, 'Raramente sonho acordado.', 'openness', TRUE, v_usuario_rh_id),
        (100, 1, 'Raramente percebo os aspectos emocionais de pinturas e imagens.', 'openness', TRUE, v_usuario_rh_id);

    RAISE NOTICE '✓ 100 questões Big Five inseridas com sucesso!';
    RAISE NOTICE '  - Extroversão: 20 questões (10 Entusiasmo + 10 Assertividade)';
    RAISE NOTICE '  - Neuroticismo: 20 questões (10 Volatilidade + 10 Retraimento)';
    RAISE NOTICE '  - Complacência: 20 questões (10 Compaixão + 10 Polidez)';
    RAISE NOTICE '  - Conscienciosidade: 20 questões (10 Industriosidade + 10 Ordem)';
    RAISE NOTICE '  - Abertura: 20 questões (10 Intelecto + 10 Estética)';
END $$;


-- ============================================================================
-- 2. POPULAR QUESTÕES DISC (28 questões)
-- ============================================================================
-- Baseado no documento: "Test DISC"
-- Formato: Cada questão tem 4 afirmações (D, I, S, C)
-- Candidato escolhe a que MAIS se aplica (+2 pontos) e a que MENOS se aplica (-1 ponto)
-- ============================================================================

DO $$
DECLARE
    v_usuario_rh_id UUID;
BEGIN
    SELECT id INTO v_usuario_rh_id FROM usuarios_rh WHERE ativo = TRUE LIMIT 1;

    RAISE NOTICE 'Inserindo 28 questões DISC (validadas cientificamente)...';

    INSERT INTO questoes_disc (numero_questao, versao, opcoes, created_by)
    VALUES
        (1, 1, '[
            {"dimensao": "D", "texto": "Sou assertivo, decidido e direto"},
            {"dimensao": "I", "texto": "Sou persuasivo, entusiasta e sociável"},
            {"dimensao": "S", "texto": "Sou paciente, estável e relaxado"},
            {"dimensao": "C", "texto": "Sou consciente, preciso e disciplinado"}
        ]'::jsonb, v_usuario_rh_id),

        (2, 1, '[
            {"dimensao": "D", "texto": "Gosto de desafios e resultados rápidos"},
            {"dimensao": "I", "texto": "Gosto de interagir e motivar os outros"},
            {"dimensao": "S", "texto": "Gosto de ambientes estáveis e harmônicos"},
            {"dimensao": "C", "texto": "Gosto de analisar e garantir qualidade"}
        ]'::jsonb, v_usuario_rh_id),

        (3, 1, '[
            {"dimensao": "D", "texto": "Sou determinado e direto ao ponto"},
            {"dimensao": "I", "texto": "Sou otimista e expressivo"},
            {"dimensao": "S", "texto": "Sou calmo e prestativo"},
            {"dimensao": "C", "texto": "Sou meticuloso e analítico"}
        ]'::jsonb, v_usuario_rh_id),

        (4, 1, '[
            {"dimensao": "D", "texto": "Prefiro estar no controle das situações"},
            {"dimensao": "I", "texto": "Prefiro estar no centro das atenções"},
            {"dimensao": "S", "texto": "Prefiro manter a estabilidade e apoiar a equipe"},
            {"dimensao": "C", "texto": "Prefiro seguir processos e padrões estabelecidos"}
        ]'::jsonb, v_usuario_rh_id),

        (5, 1, '[
            {"dimensao": "D", "texto": "Sou orientado para resultados"},
            {"dimensao": "I", "texto": "Sou inspirador e animado"},
            {"dimensao": "S", "texto": "Sou paciente e colaborativo"},
            {"dimensao": "C", "texto": "Sou sistemático e detalhista"}
        ]'::jsonb, v_usuario_rh_id),

        (6, 1, '[
            {"dimensao": "D", "texto": "Enfrento conflitos diretamente"},
            {"dimensao": "I", "texto": "Uso o charme e otimismo para resolver conflitos"},
            {"dimensao": "S", "texto": "Busco conciliação e paz no grupo"},
            {"dimensao": "C", "texto": "Uso a lógica e análise para resolver conflitos"}
        ]'::jsonb, v_usuario_rh_id),

        (7, 1, '[
            {"dimensao": "D", "texto": "Tomo decisões rápidas baseadas em resultados"},
            {"dimensao": "I", "texto": "Tomo decisões baseadas em sentimentos e reações das pessoas"},
            {"dimensao": "S", "texto": "Tomo decisões após considerar o impacto nos outros"},
            {"dimensao": "C", "texto": "Tomo decisões após análise detalhada dos fatos"}
        ]'::jsonb, v_usuario_rh_id),

        (8, 1, '[
            {"dimensao": "D", "texto": "Sob pressão, torno-me autoritário"},
            {"dimensao": "I", "texto": "Sob pressão, torno-me emotivo"},
            {"dimensao": "S", "texto": "Sob pressão, torno-me passivo"},
            {"dimensao": "C", "texto": "Sob pressão, torno-me crítico"}
        ]'::jsonb, v_usuario_rh_id),

        (9, 1, '[
            {"dimensao": "D", "texto": "Motivo-me por desafios e poder"},
            {"dimensao": "I", "texto": "Motivo-me pelo reconhecimento e aprovação"},
            {"dimensao": "S", "texto": "Motivo-me pela segurança e cooperação"},
            {"dimensao": "C", "texto": "Motivo-me pela perfeição e exatidão"}
        ]'::jsonb, v_usuario_rh_id),

        (10, 1, '[
            {"dimensao": "D", "texto": "Meu maior medo é ser aproveitado ou perder o controle"},
            {"dimensao": "I", "texto": "Meu maior medo é ser rejeitado ou ignorado"},
            {"dimensao": "S", "texto": "Meu maior medo é enfrentar mudanças repentinas ou perder estabilidade"},
            {"dimensao": "C", "texto": "Meu maior medo é estar errado ou ser criticado"}
        ]'::jsonb, v_usuario_rh_id),

        (11, 1, '[
            {"dimensao": "D", "texto": "Na comunicação, sou direto e vou ao ponto"},
            {"dimensao": "I", "texto": "Na comunicação, sou expressivo e entusiasmado"},
            {"dimensao": "S", "texto": "Na comunicação, sou atencioso e bom ouvinte"},
            {"dimensao": "C", "texto": "Na comunicação, sou preciso e detalhista"}
        ]'::jsonb, v_usuario_rh_id),

        (12, 1, '[
            {"dimensao": "D", "texto": "Em equipe, assumo a liderança naturalmente"},
            {"dimensao": "I", "texto": "Em equipe, trago entusiasmo e ideias novas"},
            {"dimensao": "S", "texto": "Em equipe, promovo harmonia e cooperação"},
            {"dimensao": "C", "texto": "Em equipe, garanto qualidade e precisão"}
        ]'::jsonb, v_usuario_rh_id),

        (13, 1, '[
            {"dimensao": "D", "texto": "Valorizo autonomia e controle"},
            {"dimensao": "I", "texto": "Valorizo relacionamentos e interações sociais"},
            {"dimensao": "S", "texto": "Valorizo consistência e confiabilidade"},
            {"dimensao": "C", "texto": "Valorizo qualidade e correção"}
        ]'::jsonb, v_usuario_rh_id),

        (14, 1, '[
            {"dimensao": "D", "texto": "Acho difícil lidar com a indecisão dos outros"},
            {"dimensao": "I", "texto": "Acho difícil lidar com rejeição ou tédio"},
            {"dimensao": "S", "texto": "Acho difícil lidar com conflitos ou pressão"},
            {"dimensao": "C", "texto": "Acho difícil lidar com imprecisão ou desorganização"}
        ]'::jsonb, v_usuario_rh_id),

        (15, 1, '[
            {"dimensao": "D", "texto": "Minha abordagem para resolver problemas é agir rapidamente"},
            {"dimensao": "I", "texto": "Minha abordagem para resolver problemas é buscar soluções criativas em grupo"},
            {"dimensao": "S", "texto": "Minha abordagem para resolver problemas é encontrar soluções estáveis e seguras"},
            {"dimensao": "C", "texto": "Minha abordagem para resolver problemas é analisar todas as alternativas"}
        ]'::jsonb, v_usuario_rh_id),

        (16, 1, '[
            {"dimensao": "D", "texto": "Sou considerado por outros como determinado e competitivo"},
            {"dimensao": "I", "texto": "Sou considerado por outros como carismático e divertido"},
            {"dimensao": "S", "texto": "Sou considerado por outros como confiável e prestativo"},
            {"dimensao": "C", "texto": "Sou considerado por outros como organizado e perfeccionista"}
        ]'::jsonb, v_usuario_rh_id),

        (17, 1, '[
            {"dimensao": "D", "texto": "Perante regras, questiono-as ou crio minhas próprias"},
            {"dimensao": "I", "texto": "Perante regras, adapto-as de acordo com a situação"},
            {"dimensao": "S", "texto": "Perante regras, sigo-as para manter a ordem"},
            {"dimensao": "C", "texto": "Perante regras, sigo-as à risca e espero o mesmo dos outros"}
        ]'::jsonb, v_usuario_rh_id),

        (18, 1, '[
            {"dimensao": "D", "texto": "Ao trabalhar em projetos, foco no resultado final"},
            {"dimensao": "I", "texto": "Ao trabalhar em projetos, foco nas pessoas e na diversão"},
            {"dimensao": "S", "texto": "Ao trabalhar em projetos, foco na cooperação e compromisso"},
            {"dimensao": "C", "texto": "Ao trabalhar em projetos, foco nos processos e qualidade"}
        ]'::jsonb, v_usuario_rh_id),

        (19, 1, '[
            {"dimensao": "D", "texto": "Quando contrariado, torno-me autoritário"},
            {"dimensao": "I", "texto": "Quando contrariado, torno-me emocional"},
            {"dimensao": "S", "texto": "Quando contrariado, cedo para evitar confrontos"},
            {"dimensao": "C", "texto": "Quando contrariado, torno-me distante ou crítico"}
        ]'::jsonb, v_usuario_rh_id),

        (20, 1, '[
            {"dimensao": "D", "texto": "Em uma nova função, gosto de ter liberdade para definir como será feito"},
            {"dimensao": "I", "texto": "Em uma nova função, gosto de interagir com muitas pessoas"},
            {"dimensao": "S", "texto": "Em uma nova função, gosto de instruções claras e suporte"},
            {"dimensao": "C", "texto": "Em uma nova função, gosto de entender completamente as expectativas e padrões"}
        ]'::jsonb, v_usuario_rh_id),

        (21, 1, '[
            {"dimensao": "D", "texto": "Prefiro ambientes de trabalho que ofereçam desafios e autonomia"},
            {"dimensao": "I", "texto": "Prefiro ambientes de trabalho que sejam dinâmicos e estimulantes"},
            {"dimensao": "S", "texto": "Prefiro ambientes de trabalho que sejam harmoniosos e previsíveis"},
            {"dimensao": "C", "texto": "Prefiro ambientes de trabalho que sejam organizados e estruturados"}
        ]'::jsonb, v_usuario_rh_id),

        (22, 1, '[
            {"dimensao": "D", "texto": "Ao lidar com mudanças, adapto-me rapidamente e busco oportunidades"},
            {"dimensao": "I", "texto": "Ao lidar com mudanças, entusiasmo-me com novas possibilidades"},
            {"dimensao": "S", "texto": "Ao lidar com mudanças, preciso de tempo para me ajustar"},
            {"dimensao": "C", "texto": "Ao lidar com mudanças, quero entender os motivos e processos"}
        ]'::jsonb, v_usuario_rh_id),

        (23, 1, '[
            {"dimensao": "D", "texto": "Meu estilo de liderança é direcionador e focado em resultados"},
            {"dimensao": "I", "texto": "Meu estilo de liderança é inspirador e motivador"},
            {"dimensao": "S", "texto": "Meu estilo de liderança é participativo e apoiador"},
            {"dimensao": "C", "texto": "Meu estilo de liderança é organizado e orientado por padrões"}
        ]'::jsonb, v_usuario_rh_id),

        (24, 1, '[
            {"dimensao": "D", "texto": "Acredito que o sucesso vem da determinação e coragem"},
            {"dimensao": "I", "texto": "Acredito que o sucesso vem do entusiasmo e rede de contatos"},
            {"dimensao": "S", "texto": "Acredito que o sucesso vem da lealdade e persistência"},
            {"dimensao": "C", "texto": "Acredito que o sucesso vem da competência e conhecimento"}
        ]'::jsonb, v_usuario_rh_id),

        (25, 1, '[
            {"dimensao": "D", "texto": "Quando tenho uma ideia, gosto de implementá-la imediatamente"},
            {"dimensao": "I", "texto": "Quando tenho uma ideia, gosto de compartilhá-la com entusiasmo"},
            {"dimensao": "S", "texto": "Quando tenho uma ideia, gosto de considerá-la cuidadosamente antes de agir"},
            {"dimensao": "C", "texto": "Quando tenho uma ideia, gosto de analisar todos os aspectos dela"}
        ]'::jsonb, v_usuario_rh_id),

        (26, 1, '[
            {"dimensao": "D", "texto": "Em uma discussão, defendo meu ponto de vista firmemente"},
            {"dimensao": "I", "texto": "Em uma discussão, sou expressivo e uso gestos para comunicar"},
            {"dimensao": "S", "texto": "Em uma discussão, escuto mais do que falo"},
            {"dimensao": "C", "texto": "Em uma discussão, baseio meus argumentos em fatos e lógica"}
        ]'::jsonb, v_usuario_rh_id),

        (27, 1, '[
            {"dimensao": "D", "texto": "Quando estabeleço objetivos, foco em conquistas e resultados"},
            {"dimensao": "I", "texto": "Quando estabeleço objetivos, busco coisas divertidas e estimulantes"},
            {"dimensao": "S", "texto": "Quando estabeleço objetivos, prefiro metas realistas e alcançáveis"},
            {"dimensao": "C", "texto": "Quando estabeleço objetivos, planejo detalhadamente como alcançá-los"}
        ]'::jsonb, v_usuario_rh_id),

        (28, 1, '[
            {"dimensao": "D", "texto": "Considero-me uma pessoa competitiva e orientada para ação"},
            {"dimensao": "I", "texto": "Considero-me uma pessoa otimista e sociável"},
            {"dimensao": "S", "texto": "Considero-me uma pessoa paciente e confiável"},
            {"dimensao": "C", "texto": "Considero-me uma pessoa meticulosa e cautelosa"}
        ]'::jsonb, v_usuario_rh_id);

    RAISE NOTICE '✓ 28 questões DISC inseridas com sucesso!';
END $$;


-- ============================================================================
-- 3. POPULAR QUESTÕES RAVEN (60 questões)
-- ============================================================================
-- Matrizes Progressivas de Raven - Teste de inteligência não-verbal
-- 5 séries (A-E) com 12 questões cada
-- ============================================================================

DO $$
DECLARE
    v_usuario_rh_id UUID;
    v_base_url TEXT := 'https://isljnozzlvckrgjjbjwp.supabase.co/storage/v1/object/public/raven-imagens/versao-1';
BEGIN
    SELECT id INTO v_usuario_rh_id FROM usuarios_rh WHERE ativo = TRUE LIMIT 1;

    RAISE NOTICE 'Inserindo 60 questões Raven...';
    RAISE NOTICE 'NOTA: URLs apontam para %/', v_base_url;
    RAISE NOTICE 'As imagens devem ser carregadas no bucket "raven-imagens" seguindo a nomenclatura:';
    RAISE NOTICE '  - Matriz: {SÉRIE}{QUESTÃO}.webp (ex: A1.webp, B5.webp)';
    RAISE NOTICE '  - Opções: {SÉRIE}{QUESTÃO}.{OPÇÃO}.webp (ex: A1.1.webp, A1.2.webp)';

    -- ============================================================================
    -- SÉRIE A (Questões 1-12) - Continuidade e Completamento
    -- ============================================================================
    -- Série A: Progressão simples, geralmente 6 opções
    INSERT INTO questoes_raven (numero_questao, versao, serie, imagem_matriz_url, opcoes_imagens, resposta_correta, created_by)
    VALUES
        (1, 1, 'A', v_base_url || '/A1.webp',
         jsonb_build_array(v_base_url || '/A1.1.webp', v_base_url || '/A1.2.webp', v_base_url || '/A1.3.webp', v_base_url || '/A1.4.webp', v_base_url || '/A1.5.webp', v_base_url || '/A1.6.webp'),
         4, v_usuario_rh_id),
        (2, 1, 'A', v_base_url || '/A2.webp',
         jsonb_build_array(v_base_url || '/A2.1.webp', v_base_url || '/A2.2.webp', v_base_url || '/A2.3.webp', v_base_url || '/A2.4.webp', v_base_url || '/A2.5.webp', v_base_url || '/A2.6.webp'),
         5, v_usuario_rh_id),
        (3, 1, 'A', v_base_url || '/A3.webp',
         jsonb_build_array(v_base_url || '/A3.1.webp', v_base_url || '/A3.2.webp', v_base_url || '/A3.3.webp', v_base_url || '/A3.4.webp', v_base_url || '/A3.5.webp', v_base_url || '/A3.6.webp'),
         1, v_usuario_rh_id),
        (4, 1, 'A', v_base_url || '/A4.webp',
         jsonb_build_array(v_base_url || '/A4.1.webp', v_base_url || '/A4.2.webp', v_base_url || '/A4.3.webp', v_base_url || '/A4.4.webp', v_base_url || '/A4.5.webp', v_base_url || '/A4.6.webp'),
         2, v_usuario_rh_id),
        (5, 1, 'A', v_base_url || '/A5.webp',
         jsonb_build_array(v_base_url || '/A5.1.webp', v_base_url || '/A5.2.webp', v_base_url || '/A5.3.webp', v_base_url || '/A5.4.webp', v_base_url || '/A5.5.webp', v_base_url || '/A5.6.webp'),
         6, v_usuario_rh_id),
        (6, 1, 'A', v_base_url || '/A6.webp',
         jsonb_build_array(v_base_url || '/A6.1.webp', v_base_url || '/A6.2.webp', v_base_url || '/A6.3.webp', v_base_url || '/A6.4.webp', v_base_url || '/A6.5.webp', v_base_url || '/A6.6.webp'),
         3, v_usuario_rh_id),
        (7, 1, 'A', v_base_url || '/A7.webp',
         jsonb_build_array(v_base_url || '/A7.1.webp', v_base_url || '/A7.2.webp', v_base_url || '/A7.3.webp', v_base_url || '/A7.4.webp', v_base_url || '/A7.5.webp', v_base_url || '/A7.6.webp'),
         6, v_usuario_rh_id),
        (8, 1, 'A', v_base_url || '/A8.webp',
         jsonb_build_array(v_base_url || '/A8.1.webp', v_base_url || '/A8.2.webp', v_base_url || '/A8.3.webp', v_base_url || '/A8.4.webp', v_base_url || '/A8.5.webp', v_base_url || '/A8.6.webp'),
         2, v_usuario_rh_id),
        (9, 1, 'A', v_base_url || '/A9.webp',
         jsonb_build_array(v_base_url || '/A9.1.webp', v_base_url || '/A9.2.webp', v_base_url || '/A9.3.webp', v_base_url || '/A9.4.webp', v_base_url || '/A9.5.webp', v_base_url || '/A9.6.webp'),
         1, v_usuario_rh_id),
        (10, 1, 'A', v_base_url || '/A10.webp',
         jsonb_build_array(v_base_url || '/A10.1.webp', v_base_url || '/A10.2.webp', v_base_url || '/A10.3.webp', v_base_url || '/A10.4.webp', v_base_url || '/A10.5.webp', v_base_url || '/A10.6.webp'),
         5, v_usuario_rh_id),
        (11, 1, 'A', v_base_url || '/A11.webp',
         jsonb_build_array(v_base_url || '/A11.1.webp', v_base_url || '/A11.2.webp', v_base_url || '/A11.3.webp', v_base_url || '/A11.4.webp', v_base_url || '/A11.5.webp', v_base_url || '/A11.6.webp'),
         4, v_usuario_rh_id),
        (12, 1, 'A', v_base_url || '/A12.webp',
         jsonb_build_array(v_base_url || '/A12.1.webp', v_base_url || '/A12.2.webp', v_base_url || '/A12.3.webp', v_base_url || '/A12.4.webp', v_base_url || '/A12.5.webp', v_base_url || '/A12.6.webp'),
         3, v_usuario_rh_id);

    -- ============================================================================
    -- SÉRIE B (Questões 13-24) - Analogia
    -- ============================================================================
    -- Série B: Analogias simples, 6 opções
    INSERT INTO questoes_raven (numero_questao, versao, serie, imagem_matriz_url, opcoes_imagens, resposta_correta, created_by)
    VALUES
        (13, 1, 'B', v_base_url || '/B1.webp',
         jsonb_build_array(v_base_url || '/B1.1.webp', v_base_url || '/B1.2.webp', v_base_url || '/B1.3.webp', v_base_url || '/B1.4.webp', v_base_url || '/B1.5.webp', v_base_url || '/B1.6.webp'),
         2, v_usuario_rh_id),
        (14, 1, 'B', v_base_url || '/B2.webp',
         jsonb_build_array(v_base_url || '/B2.1.webp', v_base_url || '/B2.2.webp', v_base_url || '/B2.3.webp', v_base_url || '/B2.4.webp', v_base_url || '/B2.5.webp', v_base_url || '/B2.6.webp'),
         6, v_usuario_rh_id),
        (15, 1, 'B', v_base_url || '/B3.webp',
         jsonb_build_array(v_base_url || '/B3.1.webp', v_base_url || '/B3.2.webp', v_base_url || '/B3.3.webp', v_base_url || '/B3.4.webp', v_base_url || '/B3.5.webp', v_base_url || '/B3.6.webp'),
         1, v_usuario_rh_id),
        (16, 1, 'B', v_base_url || '/B4.webp',
         jsonb_build_array(v_base_url || '/B4.1.webp', v_base_url || '/B4.2.webp', v_base_url || '/B4.3.webp', v_base_url || '/B4.4.webp', v_base_url || '/B4.5.webp', v_base_url || '/B4.6.webp'),
         2, v_usuario_rh_id),
        (17, 1, 'B', v_base_url || '/B5.webp',
         jsonb_build_array(v_base_url || '/B5.1.webp', v_base_url || '/B5.2.webp', v_base_url || '/B5.3.webp', v_base_url || '/B5.4.webp', v_base_url || '/B5.5.webp', v_base_url || '/B5.6.webp'),
         1, v_usuario_rh_id),
        (18, 1, 'B', v_base_url || '/B6.webp',
         jsonb_build_array(v_base_url || '/B6.1.webp', v_base_url || '/B6.2.webp', v_base_url || '/B6.3.webp', v_base_url || '/B6.4.webp', v_base_url || '/B6.5.webp', v_base_url || '/B6.6.webp'),
         3, v_usuario_rh_id),
        (19, 1, 'B', v_base_url || '/B7.webp',
         jsonb_build_array(v_base_url || '/B7.1.webp', v_base_url || '/B7.2.webp', v_base_url || '/B7.3.webp', v_base_url || '/B7.4.webp', v_base_url || '/B7.5.webp', v_base_url || '/B7.6.webp'),
         5, v_usuario_rh_id),
        (20, 1, 'B', v_base_url || '/B8.webp',
         jsonb_build_array(v_base_url || '/B8.1.webp', v_base_url || '/B8.2.webp', v_base_url || '/B8.3.webp', v_base_url || '/B8.4.webp', v_base_url || '/B8.5.webp', v_base_url || '/B8.6.webp'),
         6, v_usuario_rh_id),
        (21, 1, 'B', v_base_url || '/B9.webp',
         jsonb_build_array(v_base_url || '/B9.1.webp', v_base_url || '/B9.2.webp', v_base_url || '/B9.3.webp', v_base_url || '/B9.4.webp', v_base_url || '/B9.5.webp', v_base_url || '/B9.6.webp'),
         3, v_usuario_rh_id),
        (22, 1, 'B', v_base_url || '/B10.webp',
         jsonb_build_array(v_base_url || '/B10.1.webp', v_base_url || '/B10.2.webp', v_base_url || '/B10.3.webp', v_base_url || '/B10.4.webp', v_base_url || '/B10.5.webp', v_base_url || '/B10.6.webp'),
         4, v_usuario_rh_id),
        (23, 1, 'B', v_base_url || '/B11.webp',
         jsonb_build_array(v_base_url || '/B11.1.webp', v_base_url || '/B11.2.webp', v_base_url || '/B11.3.webp', v_base_url || '/B11.4.webp', v_base_url || '/B11.5.webp', v_base_url || '/B11.6.webp'),
         4, v_usuario_rh_id),
        (24, 1, 'B', v_base_url || '/B12.webp',
         jsonb_build_array(v_base_url || '/B12.1.webp', v_base_url || '/B12.2.webp', v_base_url || '/B12.3.webp', v_base_url || '/B12.4.webp', v_base_url || '/B12.5.webp', v_base_url || '/B12.6.webp'),
         5, v_usuario_rh_id);

    -- ============================================================================
    -- SÉRIE C (Questões 25-36) - Progressão e Mudança
    -- ============================================================================
    -- Série C: Progressão e mudança, começam a aparecer 8 opções
    INSERT INTO questoes_raven (numero_questao, versao, serie, imagem_matriz_url, opcoes_imagens, resposta_correta, created_by)
    VALUES
        (25, 1, 'C', v_base_url || '/C1.webp',
         jsonb_build_array(v_base_url || '/C1.1.webp', v_base_url || '/C1.2.webp', v_base_url || '/C1.3.webp', v_base_url || '/C1.4.webp', v_base_url || '/C1.5.webp', v_base_url || '/C1.6.webp', v_base_url || '/C1.7.webp', v_base_url || '/C1.8.webp'),
         8, v_usuario_rh_id),
        (26, 1, 'C', v_base_url || '/C2.webp',
         jsonb_build_array(v_base_url || '/C2.1.webp', v_base_url || '/C2.2.webp', v_base_url || '/C2.3.webp', v_base_url || '/C2.4.webp', v_base_url || '/C2.5.webp', v_base_url || '/C2.6.webp', v_base_url || '/C2.7.webp', v_base_url || '/C2.8.webp'),
         2, v_usuario_rh_id),
        (27, 1, 'C', v_base_url || '/C3.webp',
         jsonb_build_array(v_base_url || '/C3.1.webp', v_base_url || '/C3.2.webp', v_base_url || '/C3.3.webp', v_base_url || '/C3.4.webp', v_base_url || '/C3.5.webp', v_base_url || '/C3.6.webp', v_base_url || '/C3.7.webp', v_base_url || '/C3.8.webp'),
         3, v_usuario_rh_id),
        (28, 1, 'C', v_base_url || '/C4.webp',
         jsonb_build_array(v_base_url || '/C4.1.webp', v_base_url || '/C4.2.webp', v_base_url || '/C4.3.webp', v_base_url || '/C4.4.webp', v_base_url || '/C4.5.webp', v_base_url || '/C4.6.webp', v_base_url || '/C4.7.webp', v_base_url || '/C4.8.webp'),
         8, v_usuario_rh_id),
        (29, 1, 'C', v_base_url || '/C5.webp',
         jsonb_build_array(v_base_url || '/C5.1.webp', v_base_url || '/C5.2.webp', v_base_url || '/C5.3.webp', v_base_url || '/C5.4.webp', v_base_url || '/C5.5.webp', v_base_url || '/C5.6.webp', v_base_url || '/C5.7.webp', v_base_url || '/C5.8.webp'),
         7, v_usuario_rh_id),
        (30, 1, 'C', v_base_url || '/C6.webp',
         jsonb_build_array(v_base_url || '/C6.1.webp', v_base_url || '/C6.2.webp', v_base_url || '/C6.3.webp', v_base_url || '/C6.4.webp', v_base_url || '/C6.5.webp', v_base_url || '/C6.6.webp', v_base_url || '/C6.7.webp', v_base_url || '/C6.8.webp'),
         4, v_usuario_rh_id),
        (31, 1, 'C', v_base_url || '/C7.webp',
         jsonb_build_array(v_base_url || '/C7.1.webp', v_base_url || '/C7.2.webp', v_base_url || '/C7.3.webp', v_base_url || '/C7.4.webp', v_base_url || '/C7.5.webp', v_base_url || '/C7.6.webp', v_base_url || '/C7.7.webp', v_base_url || '/C7.8.webp'),
         5, v_usuario_rh_id),
        (32, 1, 'C', v_base_url || '/C8.webp',
         jsonb_build_array(v_base_url || '/C8.1.webp', v_base_url || '/C8.2.webp', v_base_url || '/C8.3.webp', v_base_url || '/C8.4.webp', v_base_url || '/C8.5.webp', v_base_url || '/C8.6.webp', v_base_url || '/C8.7.webp', v_base_url || '/C8.8.webp'),
         1, v_usuario_rh_id),
        (33, 1, 'C', v_base_url || '/C9.webp',
         jsonb_build_array(v_base_url || '/C9.1.webp', v_base_url || '/C9.2.webp', v_base_url || '/C9.3.webp', v_base_url || '/C9.4.webp', v_base_url || '/C9.5.webp', v_base_url || '/C9.6.webp', v_base_url || '/C9.7.webp', v_base_url || '/C9.8.webp'),
         7, v_usuario_rh_id),
        (34, 1, 'C', v_base_url || '/C10.webp',
         jsonb_build_array(v_base_url || '/C10.1.webp', v_base_url || '/C10.2.webp', v_base_url || '/C10.3.webp', v_base_url || '/C10.4.webp', v_base_url || '/C10.5.webp', v_base_url || '/C10.6.webp', v_base_url || '/C10.7.webp', v_base_url || '/C10.8.webp'),
         6, v_usuario_rh_id),
        (35, 1, 'C', v_base_url || '/C11.webp',
         jsonb_build_array(v_base_url || '/C11.1.webp', v_base_url || '/C11.2.webp', v_base_url || '/C11.3.webp', v_base_url || '/C11.4.webp', v_base_url || '/C11.5.webp', v_base_url || '/C11.6.webp', v_base_url || '/C11.7.webp', v_base_url || '/C11.8.webp'),
         3, v_usuario_rh_id),
        (36, 1, 'C', v_base_url || '/C12.webp',
         jsonb_build_array(v_base_url || '/C12.1.webp', v_base_url || '/C12.2.webp', v_base_url || '/C12.3.webp', v_base_url || '/C12.4.webp', v_base_url || '/C12.5.webp', v_base_url || '/C12.6.webp', v_base_url || '/C12.7.webp', v_base_url || '/C12.8.webp'),
         8, v_usuario_rh_id);

    -- ============================================================================
    -- SÉRIE D (Questões 37-48) - Reorganização
    -- ============================================================================
    -- Série D: Reorganização e complexidade, 8 opções
    INSERT INTO questoes_raven (numero_questao, versao, serie, imagem_matriz_url, opcoes_imagens, resposta_correta, created_by)
    VALUES
        (37, 1, 'D', v_base_url || '/D1.webp',
         jsonb_build_array(v_base_url || '/D1.1.webp', v_base_url || '/D1.2.webp', v_base_url || '/D1.3.webp', v_base_url || '/D1.4.webp', v_base_url || '/D1.5.webp', v_base_url || '/D1.6.webp', v_base_url || '/D1.7.webp', v_base_url || '/D1.8.webp'),
         3, v_usuario_rh_id),
        (38, 1, 'D', v_base_url || '/D2.webp',
         jsonb_build_array(v_base_url || '/D2.1.webp', v_base_url || '/D2.2.webp', v_base_url || '/D2.3.webp', v_base_url || '/D2.4.webp', v_base_url || '/D2.5.webp', v_base_url || '/D2.6.webp', v_base_url || '/D2.7.webp', v_base_url || '/D2.8.webp'),
         4, v_usuario_rh_id),
        (39, 1, 'D', v_base_url || '/D3.webp',
         jsonb_build_array(v_base_url || '/D3.1.webp', v_base_url || '/D3.2.webp', v_base_url || '/D3.3.webp', v_base_url || '/D3.4.webp', v_base_url || '/D3.5.webp', v_base_url || '/D3.6.webp', v_base_url || '/D3.7.webp', v_base_url || '/D3.8.webp'),
         3, v_usuario_rh_id),
        (40, 1, 'D', v_base_url || '/D4.webp',
         jsonb_build_array(v_base_url || '/D4.1.webp', v_base_url || '/D4.2.webp', v_base_url || '/D4.3.webp', v_base_url || '/D4.4.webp', v_base_url || '/D4.5.webp', v_base_url || '/D4.6.webp', v_base_url || '/D4.7.webp', v_base_url || '/D4.8.webp'),
         7, v_usuario_rh_id),
        (41, 1, 'D', v_base_url || '/D5.webp',
         jsonb_build_array(v_base_url || '/D5.1.webp', v_base_url || '/D5.2.webp', v_base_url || '/D5.3.webp', v_base_url || '/D5.4.webp', v_base_url || '/D5.5.webp', v_base_url || '/D5.6.webp', v_base_url || '/D5.7.webp', v_base_url || '/D5.8.webp'),
         6, v_usuario_rh_id),
        (42, 1, 'D', v_base_url || '/D6.webp',
         jsonb_build_array(v_base_url || '/D6.1.webp', v_base_url || '/D6.2.webp', v_base_url || '/D6.3.webp', v_base_url || '/D6.4.webp', v_base_url || '/D6.5.webp', v_base_url || '/D6.6.webp', v_base_url || '/D6.7.webp', v_base_url || '/D6.8.webp'),
         6, v_usuario_rh_id),
        (43, 1, 'D', v_base_url || '/D7.webp',
         jsonb_build_array(v_base_url || '/D7.1.webp', v_base_url || '/D7.2.webp', v_base_url || '/D7.3.webp', v_base_url || '/D7.4.webp', v_base_url || '/D7.5.webp', v_base_url || '/D7.6.webp', v_base_url || '/D7.7.webp', v_base_url || '/D7.8.webp'),
         1, v_usuario_rh_id),
        (44, 1, 'D', v_base_url || '/D8.webp',
         jsonb_build_array(v_base_url || '/D8.1.webp', v_base_url || '/D8.2.webp', v_base_url || '/D8.3.webp', v_base_url || '/D8.4.webp', v_base_url || '/D8.5.webp', v_base_url || '/D8.6.webp', v_base_url || '/D8.7.webp', v_base_url || '/D8.8.webp'),
         2, v_usuario_rh_id),
        (45, 1, 'D', v_base_url || '/D9.webp',
         jsonb_build_array(v_base_url || '/D9.1.webp', v_base_url || '/D9.2.webp', v_base_url || '/D9.3.webp', v_base_url || '/D9.4.webp', v_base_url || '/D9.5.webp', v_base_url || '/D9.6.webp', v_base_url || '/D9.7.webp', v_base_url || '/D9.8.webp'),
         1, v_usuario_rh_id),
        (46, 1, 'D', v_base_url || '/D10.webp',
         jsonb_build_array(v_base_url || '/D10.1.webp', v_base_url || '/D10.2.webp', v_base_url || '/D10.3.webp', v_base_url || '/D10.4.webp', v_base_url || '/D10.5.webp', v_base_url || '/D10.6.webp', v_base_url || '/D10.7.webp', v_base_url || '/D10.8.webp'),
         3, v_usuario_rh_id),
        (47, 1, 'D', v_base_url || '/D11.webp',
         jsonb_build_array(v_base_url || '/D11.1.webp', v_base_url || '/D11.2.webp', v_base_url || '/D11.3.webp', v_base_url || '/D11.4.webp', v_base_url || '/D11.5.webp', v_base_url || '/D11.6.webp', v_base_url || '/D11.7.webp', v_base_url || '/D11.8.webp'),
         8, v_usuario_rh_id),
        (48, 1, 'D', v_base_url || '/D12.webp',
         jsonb_build_array(v_base_url || '/D12.1.webp', v_base_url || '/D12.2.webp', v_base_url || '/D12.3.webp', v_base_url || '/D12.4.webp', v_base_url || '/D12.5.webp', v_base_url || '/D12.6.webp', v_base_url || '/D12.7.webp', v_base_url || '/D12.8.webp'),
         5, v_usuario_rh_id);

    -- ============================================================================
    -- SÉRIE E (Questões 49-60) - Decomposição e Análise
    -- ============================================================================
    -- Série E: Mais complexas, 8 opções
    INSERT INTO questoes_raven (numero_questao, versao, serie, imagem_matriz_url, opcoes_imagens, resposta_correta, created_by)
    VALUES
        (49, 1, 'E', v_base_url || '/E1.webp',
         jsonb_build_array(v_base_url || '/E1.1.webp', v_base_url || '/E1.2.webp', v_base_url || '/E1.3.webp', v_base_url || '/E1.4.webp', v_base_url || '/E1.5.webp', v_base_url || '/E1.6.webp', v_base_url || '/E1.7.webp', v_base_url || '/E1.8.webp'),
         7, v_usuario_rh_id),
        (50, 1, 'E', v_base_url || '/E2.webp',
         jsonb_build_array(v_base_url || '/E2.1.webp', v_base_url || '/E2.2.webp', v_base_url || '/E2.3.webp', v_base_url || '/E2.4.webp', v_base_url || '/E2.5.webp', v_base_url || '/E2.6.webp', v_base_url || '/E2.7.webp', v_base_url || '/E2.8.webp'),
         6, v_usuario_rh_id),
        (51, 1, 'E', v_base_url || '/E3.webp',
         jsonb_build_array(v_base_url || '/E3.1.webp', v_base_url || '/E3.2.webp', v_base_url || '/E3.3.webp', v_base_url || '/E3.4.webp', v_base_url || '/E3.5.webp', v_base_url || '/E3.6.webp', v_base_url || '/E3.7.webp', v_base_url || '/E3.8.webp'),
         8, v_usuario_rh_id),
        (52, 1, 'E', v_base_url || '/E4.webp',
         jsonb_build_array(v_base_url || '/E4.1.webp', v_base_url || '/E4.2.webp', v_base_url || '/E4.3.webp', v_base_url || '/E4.4.webp', v_base_url || '/E4.5.webp', v_base_url || '/E4.6.webp', v_base_url || '/E4.7.webp', v_base_url || '/E4.8.webp'),
         2, v_usuario_rh_id),
        (53, 1, 'E', v_base_url || '/E5.webp',
         jsonb_build_array(v_base_url || '/E5.1.webp', v_base_url || '/E5.2.webp', v_base_url || '/E5.3.webp', v_base_url || '/E5.4.webp', v_base_url || '/E5.5.webp', v_base_url || '/E5.6.webp', v_base_url || '/E5.7.webp', v_base_url || '/E5.8.webp'),
         1, v_usuario_rh_id),
        (54, 1, 'E', v_base_url || '/E6.webp',
         jsonb_build_array(v_base_url || '/E6.1.webp', v_base_url || '/E6.2.webp', v_base_url || '/E6.3.webp', v_base_url || '/E6.4.webp', v_base_url || '/E6.5.webp', v_base_url || '/E6.6.webp', v_base_url || '/E6.7.webp', v_base_url || '/E6.8.webp'),
         5, v_usuario_rh_id),
        (55, 1, 'E', v_base_url || '/E7.webp',
         jsonb_build_array(v_base_url || '/E7.1.webp', v_base_url || '/E7.2.webp', v_base_url || '/E7.3.webp', v_base_url || '/E7.4.webp', v_base_url || '/E7.5.webp', v_base_url || '/E7.6.webp', v_base_url || '/E7.7.webp', v_base_url || '/E7.8.webp'),
         1, v_usuario_rh_id),
        (56, 1, 'E', v_base_url || '/E8.webp',
         jsonb_build_array(v_base_url || '/E8.1.webp', v_base_url || '/E8.2.webp', v_base_url || '/E8.3.webp', v_base_url || '/E8.4.webp', v_base_url || '/E8.5.webp', v_base_url || '/E8.6.webp', v_base_url || '/E8.7.webp', v_base_url || '/E8.8.webp'),
         6, v_usuario_rh_id),
        (57, 1, 'E', v_base_url || '/E9.webp',
         jsonb_build_array(v_base_url || '/E9.1.webp', v_base_url || '/E9.2.webp', v_base_url || '/E9.3.webp', v_base_url || '/E9.4.webp', v_base_url || '/E9.5.webp', v_base_url || '/E9.6.webp', v_base_url || '/E9.7.webp', v_base_url || '/E9.8.webp'),
         2, v_usuario_rh_id),
        (58, 1, 'E', v_base_url || '/E10.webp',
         jsonb_build_array(v_base_url || '/E10.1.webp', v_base_url || '/E10.2.webp', v_base_url || '/E10.3.webp', v_base_url || '/E10.4.webp', v_base_url || '/E10.5.webp', v_base_url || '/E10.6.webp', v_base_url || '/E10.7.webp', v_base_url || '/E10.8.webp'),
         5, v_usuario_rh_id),
        (59, 1, 'E', v_base_url || '/E11.webp',
         jsonb_build_array(v_base_url || '/E11.1.webp', v_base_url || '/E11.2.webp', v_base_url || '/E11.3.webp', v_base_url || '/E11.4.webp', v_base_url || '/E11.5.webp', v_base_url || '/E11.6.webp', v_base_url || '/E11.7.webp', v_base_url || '/E11.8.webp'),
         2, v_usuario_rh_id),
        (60, 1, 'E', v_base_url || '/E12.webp',
         jsonb_build_array(v_base_url || '/E12.1.webp', v_base_url || '/E12.2.webp', v_base_url || '/E12.3.webp', v_base_url || '/E12.4.webp', v_base_url || '/E12.5.webp', v_base_url || '/E12.6.webp', v_base_url || '/E12.7.webp', v_base_url || '/E12.8.webp'),
         1, v_usuario_rh_id);

    RAISE NOTICE '✓ 60 questões Raven inseridas com sucesso!';
    RAISE NOTICE 'Total de imagens necessárias:';
    RAISE NOTICE '  - Séries A e B: 12 × 2 séries × (1 matriz + 6 opções) = 168 imagens';
    RAISE NOTICE '  - Séries C, D e E: 12 × 3 séries × (1 matriz + 8 opções) = 324 imagens';
    RAISE NOTICE '  - TOTAL: 492 imagens WebP';
END $$;


-- ============================================================================
-- Migration Metadata
-- ============================================================================

DO $$
DECLARE
    v_count_bigfive INTEGER;
    v_count_disc INTEGER;
    v_count_raven INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count_bigfive FROM questoes_bigfive;
    SELECT COUNT(*) INTO v_count_disc FROM questoes_disc;
    SELECT COUNT(*) INTO v_count_raven FROM questoes_raven;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 27-popular-questoes-exemplo.sql executada com sucesso!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Resumo de questões inseridas:';
    RAISE NOTICE '  ✓ Big Five: % questões (validadas cientificamente)', v_count_bigfive;
    RAISE NOTICE '  ✓ DISC: % questões (validadas cientificamente)', v_count_disc;
    RAISE NOTICE '  ✓ Raven: % questões', v_count_raven;
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASSOS:';
    RAISE NOTICE '  1. Para Big Five e DISC: As questões estão prontas para uso';
    RAISE NOTICE '  2. Para Raven: Fazer upload das 492 imagens no bucket "raven-imagens"';
    RAISE NOTICE '     seguindo a nomenclatura: {SÉRIE}{QUESTÃO}.webp e {SÉRIE}{QUESTÃO}.{OPÇÃO}.webp';
    RAISE NOTICE '  3. Testar inserção de respostas para validar as questões';
    RAISE NOTICE '';
    RAISE NOTICE 'MUDANÇAS DESTA VERSÃO:';
    RAISE NOTICE '  - Big Five: Reduzido de 120 para 100 questões (conforme documento científico)';
    RAISE NOTICE '  - Big Five: Todos os textos foram atualizados para corresponder ao documento validado';
    RAISE NOTICE '  - DISC: Todas as 28 questões foram reescritas com os textos exatos do documento';
    RAISE NOTICE '  - Raven: Mantido sem alterações (nomenclatura já estava correta)';
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================
