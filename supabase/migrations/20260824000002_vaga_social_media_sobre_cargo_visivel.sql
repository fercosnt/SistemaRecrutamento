-- =============================================================================
-- Migration: sobre_cargo visivel — vaga social-media-producao-captacao-conteudo
-- Date: 2026-08-24
-- =============================================================================
--
-- O descritivo de cargo tem quatro informacoes que o candidato NUNCA via, porque
-- moravam em colunas que a pagina da vaga nao renderiza:
--
--   endereco_completo  → a clinica fica no Paraiso, e isso nao aparecia em lugar
--                        nenhum. cidade/estado so saem na LISTAGEM, nao na pagina.
--   jornada_trabalho   → dizia apenas "44h/semana". O horario real (9h as 19h, com
--                        1h12 de intervalo) nao estava em campo nenhum do sistema.
--   tipo_contrato      → "CLT", igualmente invisivel.
--   perfil_ideal       → guardava o TESTE PRATICO do processo seletivo e os seis
--                        indicadores de desempenho. A pessoa se inscrevia sem saber
--                        que havia teste pratico.
--
-- Uma vaga presencial anunciada sem endereco e sem horario faz o candidato decidir
-- no escuro. Este arquivo move esse conteudo para sobre_cargo, que E renderizado
-- pelo TextoRico, sem alterar as colunas de origem — elas seguem la, intactas, para
-- quando a renderizacao delas entrar na fila.
--
-- So marcas que o TextoRico conhece: ##/###/####, listas com -, **negrito**,
-- *italico*. Sem links, tabelas, crases ou reguas — o que ele nao reconhece vira
-- texto LITERAL na tela, e foi assim que "**Contam pontos:**" ja apareceu com os
-- asteriscos a mostra nesta base. O gerador conferiu marca a marca e o pareamento
-- dos asteriscos antes de emitir este arquivo.
--
-- Aditivo e reversivel: o texto anterior esta no historico do git. Sem BEGIN/COMMIT
-- (D-22). Nao toca em rubrica_ia, perguntas nem status.
-- =============================================================================

DO $sobrecargo$
DECLARE
  v_autor uuid;
  v_vaga  uuid;
BEGIN
  SELECT user_id INTO v_autor
    FROM public.usuarios_rh
   WHERE email = 'fernando@beautysmile.com.br' AND ativo IS TRUE AND deleted_at IS NULL;
  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido — o campo mudaria sem dono registrado em updated_by';
  END IF;

  SELECT id INTO v_vaga FROM public.vagas
   WHERE slug = 'social-media-producao-captacao-conteudo' AND deleted_at IS NULL;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'vaga "%" nao encontrada — nada a fazer', 'social-media-producao-captacao-conteudo';
  END IF;

  UPDATE public.vagas
     SET sobre_cargo = $sc$O tratamento da Beauty Smile é referência. A comunicação ainda não é. A clínica tem tecnologia que pouquíssimos lugares no país têm, um profissional reconhecido à frente e uma base de pacientes que confia. O que falta é constância: alguém que capte, produza e publique todos os dias, com padrão e no prazo.

Essa vaga existe para trazer a produção de conteúdo para dentro de casa. Perto do consultório, perto do Dr. Fernando Costa Jr. e perto do paciente real — que é onde o conteúdo bom acontece. São dois perfis sob a mesma responsabilidade: o perfil institucional da clínica e o perfil pessoal do Dr. Fernando Costa Jr., que hoje é o que mais engaja e precisa puxar audiência para a marca. O centro é o Instagram dos dois perfis, com extensão para TikTok, YouTube — onde você conta com apoio de equipe para gravação e edição —, blog, LinkedIn e e-mail.

O que essa vaga NÃO é: a linha editorial, a definição de temas e a leitura de dados ficam com a gestão de Marketing & Comercial. O tráfego pago fica com o gestor de mídia. A produção audiovisual pesada fica com a equipe de vídeo. Nesta cadeira: captar, editar, desenhar, publicar e disparar — no volume combinado, no padrão da marca, na data marcada.

Objetivo do cargo: garantir que os dois perfis publiquem com constância, padrão visual e no prazo — transformando a rotina da clínica em conteúdo que alcança quem ainda não conhece a Beauty Smile. O sucesso é medido por entrega constante e alcance fora da base. Um dos grandes objetivos do dia a dia é a presença diária nos stories: no mínimo 5 por dia, em cada perfil.

### Onde e em que horário

Presencial, na clínica: Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP, a poucos minutos dos metrôs Paraíso e Brigadeiro.

Segunda a sexta, das 9h às 19h, com 1h12 de intervalo — 44h semanais, em regime CLT, com compensação do sábado por acordo escrito. Sem trabalho aos finais de semana; eventos pontuais são alinhados com antecedência. O dia de captação com o Dr. Fernando é fixo, definido semanalmente.

### O processo seletivo inclui teste prático

Um Reel e um carrossel, produzidos a partir de material bruto da clínica. O portfólio de conteúdo publicado é pedido já na inscrição.

### Como o desempenho é medido

Referências iniciais, a serem calibradas com dados reais depois dos dois primeiros meses. Adaptações entre canais contam para a meta — o mesmo Reel publicado no Instagram e no TikTok conta em cada perfil onde entrou.

- **Publicações entregues no prazo** — 100%
- **Volume mensal por perfil** — mínimo de 30 publicações em cada perfil
- **Publicações colaborativas entre os perfis** — 1 por semana
- **Stories diários** — mínimo de 5 por dia em cada perfil
- **Alcance de não seguidores** — crescimento mês a mês
- **Salvamentos e compartilhamentos** — principal métrica de conteúdo

**Curtidas e número bruto de seguidores não são critério de avaliação.**$sc$,
         updated_by  = v_autor
   WHERE id = v_vaga;

  RAISE NOTICE 'sobre_cargo da vaga % atualizado (% caracteres)', v_vaga, length($sc$O tratamento da Beauty Smile é referência. A comunicação ainda não é. A clínica tem tecnologia que pouquíssimos lugares no país têm, um profissional reconhecido à frente e uma base de pacientes que confia. O que falta é constância: alguém que capte, produza e publique todos os dias, com padrão e no prazo.

Essa vaga existe para trazer a produção de conteúdo para dentro de casa. Perto do consultório, perto do Dr. Fernando Costa Jr. e perto do paciente real — que é onde o conteúdo bom acontece. São dois perfis sob a mesma responsabilidade: o perfil institucional da clínica e o perfil pessoal do Dr. Fernando Costa Jr., que hoje é o que mais engaja e precisa puxar audiência para a marca. O centro é o Instagram dos dois perfis, com extensão para TikTok, YouTube — onde você conta com apoio de equipe para gravação e edição —, blog, LinkedIn e e-mail.

O que essa vaga NÃO é: a linha editorial, a definição de temas e a leitura de dados ficam com a gestão de Marketing & Comercial. O tráfego pago fica com o gestor de mídia. A produção audiovisual pesada fica com a equipe de vídeo. Nesta cadeira: captar, editar, desenhar, publicar e disparar — no volume combinado, no padrão da marca, na data marcada.

Objetivo do cargo: garantir que os dois perfis publiquem com constância, padrão visual e no prazo — transformando a rotina da clínica em conteúdo que alcança quem ainda não conhece a Beauty Smile. O sucesso é medido por entrega constante e alcance fora da base. Um dos grandes objetivos do dia a dia é a presença diária nos stories: no mínimo 5 por dia, em cada perfil.

### Onde e em que horário

Presencial, na clínica: Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP, a poucos minutos dos metrôs Paraíso e Brigadeiro.

Segunda a sexta, das 9h às 19h, com 1h12 de intervalo — 44h semanais, em regime CLT, com compensação do sábado por acordo escrito. Sem trabalho aos finais de semana; eventos pontuais são alinhados com antecedência. O dia de captação com o Dr. Fernando é fixo, definido semanalmente.

### O processo seletivo inclui teste prático

Um Reel e um carrossel, produzidos a partir de material bruto da clínica. O portfólio de conteúdo publicado é pedido já na inscrição.

### Como o desempenho é medido

Referências iniciais, a serem calibradas com dados reais depois dos dois primeiros meses. Adaptações entre canais contam para a meta — o mesmo Reel publicado no Instagram e no TikTok conta em cada perfil onde entrou.

- **Publicações entregues no prazo** — 100%
- **Volume mensal por perfil** — mínimo de 30 publicações em cada perfil
- **Publicações colaborativas entre os perfis** — 1 por semana
- **Stories diários** — mínimo de 5 por dia em cada perfil
- **Alcance de não seguidores** — crescimento mês a mês
- **Salvamentos e compartilhamentos** — principal métrica de conteúdo

**Curtidas e número bruto de seguidores não são critério de avaliação.**$sc$);
END
$sobrecargo$;
