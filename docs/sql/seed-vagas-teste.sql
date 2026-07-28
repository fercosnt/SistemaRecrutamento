-- ==============================================
-- SEED: Vagas de Teste para PRD-0005
-- Insere 6 vagas ativas para testes de QA
-- Data: 2025-11-22
-- ATUALIZADO: Com estrutura correta da tabela vagas
-- ==============================================

-- Limpar vagas de teste anteriores (opcional - comentar se quiser manter)
-- DELETE FROM vagas WHERE slug LIKE 'teste-%';

-- ==============================================
-- VAGA 1: Atendente de Clínica Odontológica
-- ==============================================
INSERT INTO vagas (
  slug,
  titulo,
  subtitulo,
  descricao_curta,
  departamento,
  tipo_contrato,
  modelo_trabalho,
  nivel_senioridade,
  cidade,
  estado,
  faixa_salarial_min,
  faixa_salarial_max,
  exibir_salario,
  status,
  sobre_cargo,
  responsabilidades,
  requisitos_formacao,
  requisitos_experiencia,
  requisitos_habilidades,
  diferenciais,
  beneficios,
  jornada_trabalho,
  data_abertura,
  created_at,
  updated_at
) VALUES (
  'teste-atendente-shopping-recife',
  '[TESTE] Atendente de Clínica Odontológica',
  'Shopping Recife',
  'Atendente para nossa clínica no Shopping Recife. Primeiro contato com pacientes, agendamentos e suporte administrativo.',
  'atendimento',
  'CLT',
  'Presencial',
  'Júnior',
  'Recife',
  'PE',
  1500.00,
  2000.00,
  TRUE,
  'ativa',
  'Estamos em busca de um(a) atendente para nossa clínica no Shopping Recife. Você será responsável pelo primeiro contato com nossos pacientes, agendamento de consultas e suporte administrativo.',
  '- Recepcionar pacientes com cordialidade e profissionalismo
- Realizar agendamento de consultas via telefone, WhatsApp e presencialmente
- Confirmar consultas agendadas
- Cadastrar e atualizar dados de pacientes no sistema
- Controlar entrada e saída de pacientes
- Dar suporte administrativo à equipe clínica
- Manter a organização da recepção',
  'Ensino médio completo',
  'Experiência mínima de 6 meses em atendimento ao cliente',
  '- Conhecimento em informática (pacote Office)
- Boa comunicação verbal e escrita
- Disponibilidade para trabalhar em escala (fins de semana e feriados)',
  '- Experiência anterior em clínicas odontológicas ou da área da saúde
- Conhecimento em sistemas de agendamento
- Cursos de atendimento ao cliente
- Inglês básico',
  '- Vale-transporte
- Vale-refeição R$ 25/dia
- Plano de saúde após 90 dias
- Plano odontológico gratuito
- Desconto em tratamentos para familiares',
  'Segunda a Sábado - Escala 6x1 - 8h/dia',
  CURRENT_DATE,
  NOW(),
  NOW()
);

-- ==============================================
-- VAGA 2: Auxiliar Administrativo
-- ==============================================
INSERT INTO vagas (
  slug,
  titulo,
  subtitulo,
  descricao_curta,
  departamento,
  tipo_contrato,
  modelo_trabalho,
  nivel_senioridade,
  cidade,
  estado,
  faixa_salarial_min,
  faixa_salarial_max,
  exibir_salario,
  status,
  sobre_cargo,
  responsabilidades,
  requisitos_formacao,
  requisitos_experiencia,
  requisitos_habilidades,
  diferenciais,
  beneficios,
  jornada_trabalho,
  data_abertura,
  created_at,
  updated_at
) VALUES (
  'teste-auxiliar-administrativo-sede',
  '[TESTE] Auxiliar Administrativo',
  'Sede Corporativa',
  'Profissional organizado e proativo para auxiliar nas rotinas administrativas da nossa sede corporativa.',
  'administrativo',
  'CLT',
  'Híbrido',
  'Júnior',
  'Recife',
  'PE',
  1800.00,
  2500.00,
  TRUE,
  'ativa',
  'Buscamos profissional organizado e proativo para auxiliar nas rotinas administrativas da nossa sede corporativa. Oportunidade de crescimento na empresa.',
  '- Organizar e arquivar documentos físicos e digitais
- Auxiliar no controle de correspondências
- Emitir relatórios administrativos
- Dar suporte às demais áreas da empresa
- Controlar material de expediente
- Auxiliar em processos de compras
- Manter atualizado o cadastro de fornecedores',
  'Ensino médio completo',
  'Experiência mínima de 1 ano em rotinas administrativas',
  '- Domínio do pacote Office (Excel intermediário)
- Conhecimento em arquivo de documentos
- Organização e atenção aos detalhes',
  '- Curso técnico em Administração
- Experiência com ERP
- Conhecimento em eSocial e rotinas de DP
- Superior cursando em Administração ou áreas afins',
  '- Vale-transporte
- Vale-refeição R$ 30/dia
- Plano de saúde
- Plano odontológico
- Day off no aniversário
- Programa de desenvolvimento profissional',
  'Segunda a Sexta - 8h às 18h (híbrido 3x presencial)',
  CURRENT_DATE,
  NOW(),
  NOW()
);

-- ==============================================
-- VAGA 3: Assistente Comercial
-- ==============================================
INSERT INTO vagas (
  slug,
  titulo,
  subtitulo,
  descricao_curta,
  departamento,
  tipo_contrato,
  modelo_trabalho,
  nivel_senioridade,
  cidade,
  estado,
  faixa_salarial_min,
  faixa_salarial_max,
  exibir_salario,
  status,
  sobre_cargo,
  responsabilidades,
  requisitos_formacao,
  requisitos_experiencia,
  requisitos_habilidades,
  diferenciais,
  beneficios,
  jornada_trabalho,
  data_abertura,
  created_at,
  updated_at
) VALUES (
  'teste-assistente-comercial-vendas',
  '[TESTE] Assistente Comercial',
  'Time de Vendas',
  'Profissional dinâmico e orientado a resultados para dar suporte às vendas de tratamentos odontológicos.',
  'comercial',
  'CLT',
  'Presencial',
  'Pleno',
  'Recife',
  'PE',
  2500.00,
  3500.00,
  TRUE,
  'ativa',
  'Estamos expandindo nosso time comercial e buscamos profissional com perfil dinâmico e orientado a resultados para dar suporte às vendas de tratamentos odontológicos.',
  '- Prospectar novos clientes
- Realizar atendimento comercial via telefone e WhatsApp
- Apresentar planos de tratamento e condições comerciais
- Acompanhar pipeline de vendas no CRM
- Bater metas mensais de vendas
- Criar propostas comerciais personalizadas
- Fidelizar clientes através de excelente atendimento',
  'Ensino médio completo (superior cursando será um diferencial)',
  'Experiência mínima de 2 anos em vendas ou atendimento comercial',
  '- Excelente comunicação e poder de negociação
- Conhecimento em CRM
- Proatividade e foco em resultados',
  '- Experiência em vendas de serviços de saúde
- Conhecimento em técnicas de vendas consultivas
- Formação em Marketing, Administração ou áreas correlatas
- Experiência com metas e KPIs comerciais',
  '- Vale-transporte
- Vale-refeição R$ 35/dia
- Plano de saúde
- Plano odontológico
- Comissão sobre vendas
- Bonificação por metas
- Treinamentos de vendas',
  'Segunda a Sexta - 8h às 18h + eventuais sábados',
  CURRENT_DATE,
  NOW(),
  NOW()
);

-- ==============================================
-- VAGA 4: Auxiliar de Saúde Bucal (ASB)
-- ==============================================
INSERT INTO vagas (
  slug,
  titulo,
  subtitulo,
  descricao_curta,
  departamento,
  tipo_contrato,
  modelo_trabalho,
  nivel_senioridade,
  cidade,
  estado,
  faixa_salarial_min,
  faixa_salarial_max,
  exibir_salario,
  status,
  sobre_cargo,
  responsabilidades,
  requisitos_formacao,
  requisitos_experiencia,
  requisitos_tecnicos,
  diferenciais,
  beneficios,
  jornada_trabalho,
  data_abertura,
  created_at,
  updated_at
) VALUES (
  'teste-asb-shopping-riomar',
  '[TESTE] Auxiliar de Saúde Bucal (ASB)',
  'Shopping RioMar',
  'ASB com registro no CRO para atuar em nossa clínica no Shopping RioMar. Ambiente moderno e equipamentos de última geração.',
  'clinico',
  'CLT',
  'Presencial',
  'Júnior',
  'Recife',
  'PE',
  2000.00,
  2800.00,
  TRUE,
  'ativa',
  'Vaga para ASB com registro no CRO para atuar em nossa clínica no Shopping RioMar. Ambiente moderno e equipamentos de última geração.',
  '- Auxiliar o dentista durante procedimentos clínicos
- Preparar e organizar instrumental
- Realizar esterilização de materiais
- Manter consultório organizado e higienizado
- Manipular materiais odontológicos
- Orientar pacientes sobre cuidados pós-procedimento
- Controlar estoque de materiais do consultório',
  'Curso de Auxiliar de Saúde Bucal completo',
  'Experiência mínima de 6 meses na função',
  '- Registro ativo no CRO
- Conhecimento em técnicas de instrumentação
- Noções de biossegurança',
  '- Experiência em clínicas de grande porte
- Conhecimento em procedimentos estéticos
- Curso de atualização em biossegurança
- Disponibilidade para escala 6x1',
  '- Vale-transporte
- Vale-refeição R$ 28/dia
- Plano de saúde após 3 meses
- Plano odontológico gratuito
- Uniformes fornecidos pela empresa
- Treinamentos técnicos periódicos',
  'Segunda a Sábado - Escala 6x1 - 8h/dia',
  CURRENT_DATE,
  NOW(),
  NOW()
);

-- ==============================================
-- VAGA 5: Analista de Marketing Digital
-- ==============================================
INSERT INTO vagas (
  slug,
  titulo,
  subtitulo,
  descricao_curta,
  departamento,
  tipo_contrato,
  modelo_trabalho,
  nivel_senioridade,
  cidade,
  estado,
  faixa_salarial_min,
  faixa_salarial_max,
  exibir_salario,
  status,
  sobre_cargo,
  responsabilidades,
  requisitos_formacao,
  requisitos_experiencia,
  requisitos_tecnicos,
  diferenciais,
  beneficios,
  jornada_trabalho,
  data_abertura,
  created_at,
  updated_at
) VALUES (
  'teste-analista-marketing-digital-remoto',
  '[TESTE] Analista de Marketing Digital',
  'Remoto',
  'Profissional criativo e analítico para gerenciar estratégias de marketing digital e fortalecer presença online.',
  'marketing',
  'PJ',
  'Remoto',
  'Pleno',
  'Recife',
  'PE',
  3500.00,
  5000.00,
  TRUE,
  'ativa',
  'Estamos buscando profissional criativo e analítico para gerenciar nossas estratégias de marketing digital e fortalecer nossa presença online.',
  '- Planejar e executar campanhas de tráfego pago
- Gerenciar redes sociais da empresa
- Criar conteúdo relevante para blog e redes sociais
- Analisar métricas e elaborar relatórios de performance
- Otimizar sites para SEO
- Gerenciar relacionamento com influenciadores
- Propor e implementar melhorias nas estratégias digitais',
  'Superior completo em Marketing, Publicidade ou áreas relacionadas',
  'Experiência mínima de 3 anos em marketing digital',
  '- Domínio de Google Ads e Facebook/Instagram Ads
- Conhecimento em Google Analytics e ferramentas de SEO
- Habilidade com criação de conteúdo para redes sociais',
  '- Certificações Google Ads e Facebook Blueprint
- Experiência no setor de saúde/odontologia
- Conhecimento em design (Canva, Photoshop)
- Experiência com automação de marketing (RD Station, HubSpot)
- Portfolio de campanhas bem-sucedidas',
  '- Trabalho 100% remoto
- Horário flexível
- Equipamentos fornecidos
- Verba para cursos e certificações
- Day off no aniversário',
  'Horário flexível - 40h semanais',
  CURRENT_DATE,
  NOW(),
  NOW()
);

-- ==============================================
-- VAGA 6: Coordenador de RH
-- ==============================================
INSERT INTO vagas (
  slug,
  titulo,
  subtitulo,
  descricao_curta,
  departamento,
  tipo_contrato,
  modelo_trabalho,
  nivel_senioridade,
  cidade,
  estado,
  faixa_salarial_min,
  faixa_salarial_max,
  exibir_salario,
  status,
  sobre_cargo,
  responsabilidades,
  requisitos_formacao,
  requisitos_experiencia,
  requisitos_habilidades,
  diferenciais,
  beneficios,
  jornada_trabalho,
  data_abertura,
  created_at,
  updated_at
) VALUES (
  'teste-coordenador-rh-sede',
  '[TESTE] Coordenador de Recursos Humanos',
  'Sede',
  'Oportunidade para liderar o RH de uma empresa em crescimento. Profissional estratégico para estruturar processos de gestão de pessoas.',
  'recursos_humanos',
  'CLT',
  'Híbrido',
  'Sênior',
  'Recife',
  'PE',
  5000.00,
  7000.00,
  TRUE,
  'ativa',
  'Oportunidade para liderar o RH de uma empresa em crescimento. Buscamos profissional estratégico para estruturar processos de gestão de pessoas.',
  '- Coordenar todas as atividades do departamento de RH
- Estruturar processos de recrutamento e seleção
- Implementar programas de treinamento e desenvolvimento
- Gerenciar indicadores de RH (turnover, absenteísmo, etc)
- Conduzir processos de avaliação de desempenho
- Desenvolver políticas de retenção de talentos
- Garantir conformidade trabalhista
- Atuar como business partner das lideranças',
  'Superior completo em Psicologia, Administração ou Recursos Humanos',
  'Experiência mínima de 5 anos em RH, sendo 2 anos em coordenação',
  '- Conhecimento em todas as subáreas de RH (R&S, T&D, DP, Clima)
- Experiência com gestão de equipe
- Domínio de KPIs de RH e People Analytics',
  '- Pós-graduação em Gestão de Pessoas ou MBA
- Experiência em empresas de saúde
- Certificação SHRM ou similar
- Conhecimento em metodologias ágeis aplicadas ao RH
- Inglês intermediário',
  '- Vale-transporte
- Vale-refeição R$ 40/dia
- Plano de saúde premium
- Plano odontológico
- Seguro de vida
- Participação nos lucros
- Verba para congressos e eventos
- Auxílio home office',
  'Segunda a Sexta - 8h às 18h (híbrido 3x presencial)',
  CURRENT_DATE,
  NOW(),
  NOW()
);

-- ==============================================
-- VALIDAÇÃO
-- ==============================================

-- Verificar vagas inseridas
SELECT
  id,
  slug,
  titulo,
  departamento,
  cidade,
  estado,
  status,
  created_at
FROM vagas
WHERE slug LIKE 'teste-%'
ORDER BY created_at DESC;

-- Contar vagas de teste
SELECT COUNT(*) as total_vagas_teste
FROM vagas
WHERE slug LIKE 'teste-%'
AND status = 'ativa'
AND deleted_at IS NULL;

-- ==============================================
-- INSTRUÇÕES DE USO
-- ==============================================
--
-- Para executar este script:
-- 1. Abra o Supabase Dashboard → SQL Editor
-- 2. Cole todo o conteúdo deste arquivo
-- 3. Clique em "Run" para executar
-- 4. Verifique as queries de validação ao final
--
-- Para limpar vagas de teste:
-- DELETE FROM vagas WHERE slug LIKE 'teste-%';
--
-- ==============================================
