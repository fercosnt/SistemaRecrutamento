# PRD-DB-002: Estrutura de Vagas e Candidaturas

**Versão:** 1.0  
**Data:** 02 de Novembro de 2025  
**Autor:** Equipe Beauty Smile  
**Status:** 🔄 Em Desenvolvimento  
**Prioridade:** 🔴 P0 - Crítica (MVP)  
**Categoria:** Banco de Dados  
**Ferramenta:** DB Expert  
**Dependências:** PRD-DB-001 (Autenticação e Usuários)

---

## 1. Introdução/Visão Geral

Este PRD define a estrutura completa de banco de dados para o módulo de **Vagas e Candidaturas** do sistema Beauty Smile. Este módulo é o coração do sistema de recrutamento, gerenciando:

- Criação e gestão de vagas pela equipe de RH
- Candidaturas de candidatos às vagas
- Formulário inicial customizável por vaga
- Respostas dos candidatos ao formulário
- Controle de etapas do processo seletivo
- Upload e armazenamento de currículos
- Landing pages públicas personalizadas por vaga

### Problema que Resolve

Atualmente, o frontend possui 100% das telas implementadas, mas sem backend funcional. Precisamos criar a infraestrutura de dados para:

- Armazenar vagas com informações completas e editáveis
- Registrar candidaturas de forma estruturada
- Gerenciar múltiplas candidaturas por candidato
- Armazenar respostas de formulários customizados
- Controlar etapas e status de cada candidatura
- Permitir que RH filtre e busque candidatos por vaga
- Gerar landing pages públicas únicas por vaga

### Contexto Técnico

- **Plataforma:** Supabase (PostgreSQL + Storage)
- **Frontend:** React 18 + Vite (já implementado)
- **Dependências:** Tabelas de candidatos e usuarios_rh (PRD-DB-001)
- **Storage:** Supabase Storage (currículos em PDF/DOCX)
- **Webhooks:** Integração com N8N para análise IA (PRD-N8N-001)

---

## 2. Objetivos

### Objetivos Principais

1. **Criar estrutura completa de vagas** com todas as informações necessárias (descrição, requisitos, benefícios, etc.)
2. **Implementar sistema de candidaturas** permitindo que candidatos se candidatem a múltiplas vagas
3. **Gerenciar formulários customizados** com perguntas específicas por vaga (blocos: Jornada, Tecnologia, Valores, Currículo)
4. **Controlar etapas do processo seletivo** (Triagem → Big Five → DISC → Entrevista Online → Raven + Cultura → Entrevista Presencial → Aprovação)
5. **Armazenar currículos de forma segura** no Supabase Storage com controle de acesso
6. **Permitir landing pages públicas personalizadas** com slug único por vaga

### Objetivos Secundários

7. Rastrear tempo de preenchimento do formulário (analytics)
8. Permitir rascunhos de candidatura (salvar progresso parcial)
9. Facilitar busca e filtro de candidatos por vaga para RH
10. Preparar estrutura para futuras análises IA via webhooks N8N

---

## 3. User Stories

### US-001: Como RH Admin/Gerente
**Como** gerente de RH  
**Eu quero** criar uma nova vaga com todas as informações necessárias  
**Para que** candidatos possam visualizar e se candidatar  
**Critério de Aceitação:**
- Consigo criar vaga com título, descrição, requisitos, benefícios
- Consigo definir perguntas customizadas do formulário de triagem
- Consigo definir perguntas de fit cultural
- Consigo criar landing page pública com slug único
- Sistema salva quem criou e quando (auditoria)

### US-002: Como RH Gerente
**Como** gerente de RH  
**Eu quero** associar recrutadores específicos a uma vaga  
**Para que** apenas esses recrutadores vejam candidatos dessa vaga  
**Critério de Aceitação:**
- Consigo associar um ou mais recrutadores à vaga
- Recrutadores associados veem todos candidatos da vaga
- Recrutadores não associados NÃO veem candidatos da vaga
- RLS valida permissões automaticamente

### US-003: Como Candidato
**Como** candidato  
**Eu quero** me candidatar a uma vaga preenchendo um formulário  
**Para que** o RH possa avaliar meu perfil  
**Critério de Aceitação:**
- Consigo acessar a landing page pública da vaga
- Consigo fazer login ou me cadastrar
- Consigo preencher formulário de triagem (4 blocos)
- Consigo fazer upload do meu currículo (PDF ou DOCX, max 5MB)
- Sistema registra tempo de preenchimento (oculto para mim)
- Recebo confirmação após envio

### US-004: Como Candidato
**Como** candidato  
**Eu quero** salvar meu progresso no formulário  
**Para que** eu possa continuar depois se precisar parar  
**Critério de Aceitação:**
- Consigo clicar em "Salvar Rascunho" a qualquer momento
- Meu progresso é salvo mesmo se fechar o navegador
- Consigo voltar e continuar de onde parei
- Rascunhos não são enviados para análise do RH

### US-005: Como Candidato
**Como** candidato  
**Eu quero** me candidatar a múltiplas vagas  
**Para que** eu tenha mais oportunidades na empresa  
**Critério de Aceitação:**
- Posso me candidatar a quantas vagas eu quiser
- Cada candidatura é independente (formulários diferentes)
- Consigo ver status de todas minhas candidaturas
- Sistema não me deixa candidatar 2x para mesma vaga

### US-006: Como RH
**Como** recrutador  
**Eu quero** visualizar todos os candidatos de uma vaga específica  
**Para que** eu possa avaliar e avançar no processo seletivo  
**Critério de Aceitação:**
- Consigo filtrar candidatos por vaga
- Consigo ver status e etapa de cada candidato
- Consigo ver respostas do formulário de triagem
- Consigo baixar currículo do candidato
- Sistema mostra score de análise IA (quando disponível)

### US-007: Como RH Admin
**Como** administrador  
**Eu quero** ativar/inativar vagas  
**Para que** candidatos não vejam vagas que não estão mais abertas  
**Critério de Aceitação:**
- Consigo marcar vaga como Ativa, Inativa, Rascunho, Arquivada
- Vagas inativas não aparecem na listagem pública
- Candidatos já inscritos em vaga inativa continuam no processo
- Sistema registra quem e quando mudou o status

### US-008: Como Sistema
**Como** sistema  
**Eu quero** enviar webhook após candidato enviar formulário  
**Para que** o N8N faça análise IA da candidatura  
**Critério de Aceitação:**
- Webhook é disparado assim que candidato clica "Enviar Candidatura"
- Webhook contém: candidato_id, vaga_id, respostas, currículo_url, tempo
- Sistema aguarda resposta do webhook (análise IA)
- Análise IA é salva na candidatura

---

## 4. Requisitos Funcionais

### 4.1 Tabelas Principais

#### RF-001: Tabela `vagas`

O sistema **DEVE** expandir a tabela `vagas` existente com os seguintes campos:

**Campos de Identificação:**
- `id` (UUID, PK) - Identificador único da vaga
- `slug` (TEXT, UNIQUE, NOT NULL) - URL amigável (ex: "assistente-odontologico")

**Informações Básicas:**
- `titulo` (TEXT, NOT NULL) - Título da vaga
- `subtitulo` (TEXT, NULL) - Subtítulo opcional
- `descricao_curta` (TEXT, NULL) - Descrição resumida (para cards de listagem)
- `departamento` (TEXT, NULL) - Departamento/Área (ex: "Odontologia", "Administrativo")
- `tipo_contrato` (TEXT, NULL) - CLT, PJ, Estágio, etc.
- `modelo_trabalho` (TEXT, NULL) - Presencial, Remoto, Híbrido
- `nivel_senioridade` (TEXT, NULL) - Júnior, Pleno, Sênior, etc.

**Localização:**
- `cidade` (TEXT, NULL) - Cidade da vaga
- `estado` (TEXT, NULL) - Estado (UF)
- `endereco_completo` (TEXT, NULL) - Endereço completo (será exibido na landing page)

**Remuneração e Benefícios:**
- `faixa_salarial_min` (DECIMAL, NULL) - Salário mínimo
- `faixa_salarial_max` (DECIMAL, NULL) - Salário máximo
- `exibir_salario` (BOOLEAN, DEFAULT FALSE) - Mostrar salário na landing page pública

**Status e Controle:**
- `status` (ENUM, NOT NULL) - 'rascunho', 'ativa', 'inativa', 'arquivada'
- `data_abertura` (DATE, NULL) - Data de abertura da vaga
- `data_fechamento` (DATE, NULL) - Data de encerramento prevista
- `total_vagas` (INTEGER, DEFAULT 1) - Número de posições disponíveis

**Landing Page Pública (Editável pelo RH):**
- `sobre_empresa` (TEXT, NULL) - Bloco "Sobre a Beauty Smile"
- `sobre_cargo` (TEXT, NULL) - Bloco "O Cargo"
- `responsabilidades` (TEXT, NULL) - Bloco "Suas Principais Responsabilidades"
- `requisitos_formacao` (TEXT, NULL) - Sub-bloco "Formação"
- `requisitos_experiencia` (TEXT, NULL) - Sub-bloco "Experiência"
- `requisitos_tecnicos` (TEXT, NULL) - Sub-bloco "Conhecimentos Técnicos"
- `requisitos_habilidades` (TEXT, NULL) - Sub-bloco "Habilidades Essenciais"
- `perfil_ideal` (TEXT, NULL) - Bloco "Você É a Pessoa Certa Se..."
- `diferenciais` (TEXT, NULL) - Bloco "Seria Incrível Se Você Também Tivesse"
- `beneficios` (TEXT, NULL) - Bloco "O Que Oferecemos"
- `jornada_trabalho` (TEXT, NULL) - Horário de trabalho

**Prompt para Análise IA (N8N):**
- `prompt_ia_descricao` (TEXT, NULL) - Descrição da vaga para IA usar nas análises

**Campos de Auditoria:**
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted_at` (TIMESTAMPTZ, NULL) - Soft delete
- `created_by` (UUID, FK → usuarios_rh.id)
- `updated_by` (UUID, FK → usuarios_rh.id)

**Constraints:**
- Slug deve ser único e conter apenas letras minúsculas, números e hífens
- Status deve ser um dos valores do enum
- Se exibir_salario = TRUE, faixa_salarial_min e max devem ser preenchidos
- data_fechamento deve ser maior que data_abertura

**Índices:**
- Index em `slug` (busca por URL)
- Index em `status` (filtrar vagas ativas)
- Index em `deleted_at` (ignorar deletadas)
- Index em `departamento` (filtrar por área)
- Full-text search em `titulo` e `descricao_curta`

---

#### RF-002: Tabela `candidaturas`

O sistema **DEVE** criar uma tabela `candidaturas` para registrar cada aplicação:

**Campos de Identificação:**
- `id` (UUID, PK) - Identificador único da candidatura
- `candidato_id` (UUID, FK → candidatos.id, NOT NULL) - Candidato
- `vaga_id` (UUID, FK → vagas.id, NOT NULL) - Vaga

**Controle de Etapa:**
- `etapa_atual` (ENUM, NOT NULL, DEFAULT 'triagem') - Etapa atual do processo
- `status` (ENUM, NOT NULL, DEFAULT 'aguardando_resposta') - Status da candidatura

**Timestamps de Progresso:**
- `data_candidatura` (TIMESTAMPTZ, DEFAULT NOW()) - Quando se candidatou
- `data_formulario_enviado` (TIMESTAMPTZ, NULL) - Quando enviou formulário
- `data_bigfive_enviado` (TIMESTAMPTZ, NULL) - Quando enviou Big Five
- `data_disc_enviado` (TIMESTAMPTZ, NULL) - Quando enviou DISC
- `data_raven_enviado` (TIMESTAMPTZ, NULL) - Quando enviou Raven
- `data_cultura_enviado` (TIMESTAMPTZ, NULL) - Quando enviou Cultura
- `data_entrevista_online` (TIMESTAMPTZ, NULL) - Data entrevista online
- `data_entrevista_presencial` (TIMESTAMPTZ, NULL) - Data entrevista presencial
- `data_decisao_final` (TIMESTAMPTZ, NULL) - Quando decisão foi tomada

**Currículo:**
- `curriculo_url` (TEXT, NULL) - URL do currículo no Supabase Storage
- `curriculo_nome_original` (TEXT, NULL) - Nome original do arquivo
- `curriculo_tamanho_bytes` (INTEGER, NULL) - Tamanho do arquivo

**Analytics:**
- `tempo_preenchimento_segundos` (INTEGER, NULL) - Tempo para preencher formulário (oculto)
- `origem_candidatura` (TEXT, NULL) - Como chegou na vaga (LinkedIn, Google, Indicação, etc.)

**Análise IA (N8N):**
- `analise_ia_formulario` (JSONB, NULL) - Resultado análise IA do formulário
- `analise_ia_bigfive` (JSONB, NULL) - Resultado análise IA Big Five
- `analise_ia_disc` (JSONB, NULL) - Resultado análise IA DISC
- `analise_ia_raven` (JSONB, NULL) - Resultado análise IA Raven
- `analise_ia_cultura` (JSONB, NULL) - Resultado análise IA Cultura
- `analise_ia_entrevista_online` (JSONB, NULL) - Resultado análise IA entrevista online
- `analise_ia_entrevista_presencial` (JSONB, NULL) - Resultado análise IA entrevista presencial
- `score_geral` (DECIMAL(5,2), NULL) - Score consolidado (0-100)

**Feedback e Notas:**
- `feedback_rejeicao` (TEXT, NULL) - Motivo da rejeição (se rejeitado)
- `observacoes_rh` (TEXT, NULL) - Notas gerais do RH sobre este candidato

**Flags:**
- `is_rascunho` (BOOLEAN, DEFAULT FALSE) - Candidatura salva mas não enviada
- `is_favorito` (BOOLEAN, DEFAULT FALSE) - RH marcou como favorito

**Campos de Auditoria:**
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted_at` (TIMESTAMPTZ, NULL)
- `created_by` (UUID, NULL) - Quem criou (pode ser o próprio candidato)
- `updated_by` (UUID, NULL)

**Constraints:**
- Combinação (candidato_id, vaga_id) deve ser UNIQUE (candidato não pode se candidatar 2x para mesma vaga)
- Etapa_atual deve ser um dos valores do enum
- Status deve ser um dos valores do enum
- Score_geral deve estar entre 0 e 100

**Índices:**
- Index em `candidato_id` (buscar candidaturas de um candidato)
- Index em `vaga_id` (buscar candidatos de uma vaga)
- Index composto em `(vaga_id, etapa_atual, status)` (filtros complexos)
- Index em `is_rascunho` (ignorar rascunhos)
- Index em `deleted_at`
- Index em `score_geral` (ordenar por score)

---

#### RF-003: Tabela `perguntas_formulario`

O sistema **DEVE** criar uma tabela `perguntas_formulario` para armazenar perguntas customizadas:

**Campos de Identificação:**
- `id` (UUID, PK) - Identificador único da pergunta
- `vaga_id` (UUID, FK → vagas.id, NOT NULL) - Vaga à qual pertence
- `bloco` (TEXT, NOT NULL) - Bloco da pergunta: 'jornada', 'tecnologia', 'valores', 'curriculo'

**Conteúdo da Pergunta:**
- `ordem` (INTEGER, NOT NULL) - Ordem de exibição (1, 2, 3...)
- `texto_pergunta` (TEXT, NOT NULL) - Texto da pergunta
- `texto_ajuda` (TEXT, NULL) - Texto de ajuda/instrução (opcional)
- `tipo_resposta` (ENUM, NOT NULL) - 'texto_curto', 'texto_longo', 'single_choice', 'multiple_choice', 'numerico'

**Opções de Resposta (para múltipla escolha):**
- `opcoes_resposta` (JSONB, NULL) - Array de opções: ["Opção 1", "Opção 2", "Outros"]
- `permite_outros` (BOOLEAN, DEFAULT FALSE) - Se TRUE, adiciona campo "Outros: ___"

**Validações:**
- `obrigatoria` (BOOLEAN, DEFAULT TRUE) - Campo obrigatório
- `limite_caracteres` (INTEGER, NULL) - Limite de caracteres (para texto)
- `valor_minimo` (DECIMAL, NULL) - Valor mínimo (para numérico)
- `valor_maximo` (DECIMAL, NULL) - Valor máximo (para numérico)

**Campos de Auditoria:**
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted_at` (TIMESTAMPTZ, NULL)
- `created_by` (UUID, FK → usuarios_rh.id)
- `updated_by` (UUID, FK → usuarios_rh.id)

**Constraints:**
- Bloco deve ser um dos valores: 'jornada', 'tecnologia', 'valores', 'curriculo'
- Tipo_resposta deve ser um dos valores do enum
- Ordem deve ser >= 1
- Se tipo_resposta é single/multiple_choice, opcoes_resposta deve ser preenchido

**Índices:**
- Index em `vaga_id` (buscar perguntas de uma vaga)
- Index composto em `(vaga_id, bloco, ordem)` (listar perguntas ordenadas)
- Index em `deleted_at`

---

#### RF-004: Tabela `respostas_formulario`

O sistema **DEVE** criar uma tabela `respostas_formulario` para armazenar respostas:

**Campos de Identificação:**
- `id` (UUID, PK) - Identificador único da resposta
- `candidatura_id` (UUID, FK → candidaturas.id, NOT NULL) - Candidatura
- `pergunta_id` (UUID, FK → perguntas_formulario.id, NOT NULL) - Pergunta

**Resposta:**
- `resposta_texto` (TEXT, NULL) - Resposta em texto (texto_curto, texto_longo, outros)
- `resposta_opcoes` (JSONB, NULL) - Array de opções selecionadas (múltipla escolha)
- `resposta_numerica` (DECIMAL, NULL) - Resposta numérica

**Campos de Auditoria:**
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- Combinação (candidatura_id, pergunta_id) deve ser UNIQUE
- Pelo menos um dos campos resposta_* deve ser preenchido

**Índices:**
- Index em `candidatura_id` (buscar respostas de uma candidatura)
- Index em `pergunta_id` (análise de respostas por pergunta)

---

#### RF-005: Tabela `perguntas_cultura`

O sistema **DEVE** criar uma tabela `perguntas_cultura` para fit cultural:

**Campos de Identificação:**
- `id` (UUID, PK) - Identificador único
- `vaga_id` (UUID, FK → vagas.id, NOT NULL) - Vaga

**Pergunta:**
- `ordem` (INTEGER, NOT NULL) - Ordem de exibição
- `texto_pergunta` (TEXT, NOT NULL) - Pergunta sobre fit cultural
- `texto_ajuda` (TEXT, NULL) - Instrução adicional

**Validações:**
- `obrigatoria` (BOOLEAN, DEFAULT TRUE)
- `limite_caracteres` (INTEGER, DEFAULT 1000) - Limite para resposta longa

**Campos de Auditoria:**
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted_at` (TIMESTAMPTZ, NULL)
- `created_by` (UUID, FK → usuarios_rh.id)
- `updated_by` (UUID, FK → usuarios_rh.id)

**Constraints:**
- Ordem deve ser >= 1 e <= 7 (máximo 7 perguntas de cultura)

**Índices:**
- Index em `vaga_id`
- Index composto em `(vaga_id, ordem)`

---

#### RF-006: Tabela `respostas_cultura`

O sistema **DEVE** criar uma tabela `respostas_cultura`:

**Campos:**
- `id` (UUID, PK)
- `candidatura_id` (UUID, FK → candidaturas.id, NOT NULL)
- `pergunta_id` (UUID, FK → perguntas_cultura.id, NOT NULL)
- `resposta_texto` (TEXT, NOT NULL) - Resposta longa
- `tempo_resposta_segundos` (INTEGER, NULL) - Quanto tempo levou para responder
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- Combinação (candidatura_id, pergunta_id) UNIQUE

**Índices:**
- Index em `candidatura_id`

---

### 4.2 Enums

#### RF-007: Enum `status_vaga`

```sql
CREATE TYPE status_vaga AS ENUM (
  'rascunho',    -- Vaga sendo criada, não visível publicamente
  'ativa',       -- Vaga aberta para candidaturas
  'inativa',     -- Vaga fechada, não aceita mais candidaturas
  'arquivada'    -- Vaga arquivada para histórico
);
```

---

#### RF-008: Enum `etapa_processo`

```sql
CREATE TYPE etapa_processo AS ENUM (
  'triagem',                  -- Formulário inicial
  'bigfive',                  -- Teste de personalidade Big Five
  'disc',                     -- Teste DISC
  'entrevista_online',        -- Entrevista online (vídeo)
  'raven',                    -- Teste de QI Raven
  'cultura',                  -- Questionário de fit cultural
  'entrevista_presencial',    -- Entrevista presencial
  'aprovado',                 -- Aprovado final
  'rejeitado'                 -- Rejeitado em qualquer etapa
);
```

---

#### RF-009: Enum `status_candidatura`

```sql
CREATE TYPE status_candidatura AS ENUM (
  'aguardando_resposta',  -- Candidato precisa responder teste
  'em_analise',           -- RH está analisando
  'aprovado_proxima',     -- Aprovado, aguardando próxima etapa
  'rejeitado',            -- Rejeitado
  'finalizado'            -- Processo concluído (aprovado ou rejeitado final)
);
```

---

#### RF-010: Enum `tipo_resposta_pergunta`

```sql
CREATE TYPE tipo_resposta_pergunta AS ENUM (
  'texto_curto',      -- Input de texto (até ~200 chars)
  'texto_longo',      -- Textarea (até ~1000 chars)
  'single_choice',    -- Radio buttons (uma opção)
  'multiple_choice',  -- Checkboxes (múltiplas opções)
  'numerico'          -- Input numérico
);
```

---

### 4.3 Supabase Storage

#### RF-011: Bucket para Currículos

O sistema **DEVE** criar um bucket `curriculos`:

**Configurações:**
- **Nome:** `curriculos`
- **Público:** NÃO (privado com RLS)
- **Tamanho máximo:** 5 MB por arquivo
- **Formatos aceitos:** PDF, DOCX, DOC
- **Estrutura:** `{candidato_id}/{vaga_id}/curriculo.{ext}`

**Exemplo:**
```
curriculos/
  ├── a1b2c3d4-e5f6.../
  │   ├── vaga-123.../
  │   │   └── curriculo.pdf
  │   ├── vaga-456.../
  │       └── curriculo.pdf
```

**RLS Policies:**
1. **Upload:** Candidato pode fazer upload apenas na sua pasta
2. **Leitura:** 
   - Candidato pode ler apenas seus próprios currículos
   - RH pode ler currículos de candidatos das vagas que tem acesso
3. **Atualização:** Candidato pode atualizar apenas seus currículos
4. **Deleção:** Apenas Admin pode deletar

---

### 4.4 Triggers e Functions

#### RF-012: Trigger para Atualizar `updated_at`

Usar a mesma function `update_updated_at_column()` criada no PRD-DB-001.

Aplicar trigger em:
- `vagas`
- `candidaturas`
- `perguntas_formulario`
- `respostas_formulario`
- `perguntas_cultura`
- `respostas_cultura`

---

#### RF-013: Function para Calcular Score Geral

O sistema **DEVE** criar uma function para calcular score consolidado:

```sql
CREATE OR REPLACE FUNCTION calcular_score_geral(candidatura_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  score_formulario DECIMAL(5,2);
  score_bigfive DECIMAL(5,2);
  score_disc DECIMAL(5,2);
  score_raven DECIMAL(5,2);
  score_cultura DECIMAL(5,2);
  score_entrevista_online DECIMAL(5,2);
  score_entrevista_presencial DECIMAL(5,2);
  score_final DECIMAL(5,2);
BEGIN
  -- Buscar scores das análises IA
  SELECT 
    (analise_ia_formulario->>'score')::DECIMAL,
    (analise_ia_bigfive->>'score')::DECIMAL,
    (analise_ia_disc->>'score')::DECIMAL,
    (analise_ia_raven->>'score')::DECIMAL,
    (analise_ia_cultura->>'score')::DECIMAL,
    (analise_ia_entrevista_online->>'score')::DECIMAL,
    (analise_ia_entrevista_presencial->>'score')::DECIMAL
  INTO 
    score_formulario, score_bigfive, score_disc, 
    score_raven, score_cultura, score_entrevista_online, 
    score_entrevista_presencial
  FROM candidaturas
  WHERE id = candidatura_uuid;
  
  -- Calcular média ponderada
  -- Pesos: Formulário 15%, BigFive 15%, DISC 10%, Raven 20%, Cultura 30%, Entrevistas 10% cada
  score_final := COALESCE(
    (COALESCE(score_formulario, 0) * 0.15) +
    (COALESCE(score_bigfive, 0) * 0.15) +
    (COALESCE(score_disc, 0) * 0.10) +
    (COALESCE(score_raven, 0) * 0.20) +
    (COALESCE(score_cultura, 0) * 0.30) +
    (COALESCE(score_entrevista_online, 0) * 0.05) +
    (COALESCE(score_entrevista_presencial, 0) * 0.05),
    0
  );
  
  -- Atualizar candidatura
  UPDATE candidaturas 
  SET score_geral = score_final
  WHERE id = candidatura_uuid;
  
  RETURN score_final;
END;
$$ LANGUAGE plpgsql;
```

**Uso:** Chamado automaticamente após cada análise IA ser salva.

---

#### RF-014: Function para Avançar Etapa

O sistema **DEVE** criar function para avançar candidato para próxima etapa:

```sql
CREATE OR REPLACE FUNCTION avancar_etapa(
  candidatura_uuid UUID,
  usuario_rh_uuid UUID
)
RETURNS VOID AS $$
DECLARE
  etapa_atual_valor etapa_processo;
  proxima_etapa etapa_processo;
BEGIN
  -- Buscar etapa atual
  SELECT etapa_atual INTO etapa_atual_valor
  FROM candidaturas
  WHERE id = candidatura_uuid;
  
  -- Determinar próxima etapa
  proxima_etapa := CASE etapa_atual_valor
    WHEN 'triagem' THEN 'bigfive'
    WHEN 'bigfive' THEN 'disc'
    WHEN 'disc' THEN 'entrevista_online'
    WHEN 'entrevista_online' THEN 'raven'
    WHEN 'raven' THEN 'cultura'
    WHEN 'cultura' THEN 'entrevista_presencial'
    WHEN 'entrevista_presencial' THEN 'aprovado'
    ELSE 'aprovado'
  END;
  
  -- Atualizar candidatura
  UPDATE candidaturas
  SET 
    etapa_atual = proxima_etapa,
    status = 'aguardando_resposta',
    updated_at = NOW(),
    updated_by = usuario_rh_uuid
  WHERE id = candidatura_uuid;
  
  -- TODO: Disparar webhook N8N para enviar email ao candidato
END;
$$ LANGUAGE plpgsql;
```

---

#### RF-015: Function para Rejeitar Candidato

```sql
CREATE OR REPLACE FUNCTION rejeitar_candidato(
  candidatura_uuid UUID,
  usuario_rh_uuid UUID,
  motivo TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE candidaturas
  SET 
    etapa_atual = 'rejeitado',
    status = 'finalizado',
    feedback_rejeicao = motivo,
    data_decisao_final = NOW(),
    updated_at = NOW(),
    updated_by = usuario_rh_uuid
  WHERE id = candidatura_uuid;
  
  -- TODO: Disparar webhook N8N para enviar email de rejeição
END;
$$ LANGUAGE plpgsql;
```

---

### 4.5 Row Level Security (RLS)

#### RF-016: RLS para Tabela `vagas`

**Habilitar RLS:**
```sql
ALTER TABLE vagas ENABLE ROW LEVEL SECURITY;
```

**Policy 1: Qualquer um pode ver vagas ativas (listagem pública)**
```sql
CREATE POLICY "Público vê vagas ativas"
ON vagas FOR SELECT
TO anon, authenticated
USING (status = 'ativa' AND deleted_at IS NULL);
```

**Policy 2: RH pode ver todas as vagas**
```sql
CREATE POLICY "RH vê todas vagas"
ON vagas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() 
      AND ativo = TRUE 
      AND deleted_at IS NULL
  )
);
```

**Policy 3: Apenas Admin e Gerente podem criar vagas**
```sql
CREATE POLICY "Admin/Gerente criam vagas"
ON vagas FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() 
      AND role IN ('administrador', 'gerente')
      AND ativo = TRUE
  )
);
```

**Policy 4: Admin/Gerente podem editar qualquer vaga**
```sql
CREATE POLICY "Admin/Gerente editam vagas"
ON vagas FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() 
      AND role IN ('administrador', 'gerente')
      AND ativo = TRUE
  )
);
```

---

#### RF-017: RLS para Tabela `candidaturas`

**Policy 1: Candidato vê apenas suas candidaturas**
```sql
CREATE POLICY "Candidato vê próprias candidaturas"
ON candidaturas FOR SELECT
TO authenticated
USING (
  candidato_id IN (
    SELECT id FROM candidatos WHERE user_id = auth.uid()
  )
);
```

**Policy 2: RH vê candidaturas das vagas que tem acesso**
```sql
CREATE POLICY "RH vê candidaturas de suas vagas"
ON candidaturas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh ur
    WHERE ur.user_id = auth.uid() 
      AND ur.ativo = TRUE
      AND (
        -- Admin e Gerente veem todas
        ur.role IN ('administrador', 'gerente')
        OR
        -- Recrutador vê apenas vagas associadas
        EXISTS (
          SELECT 1 FROM vagas_associadas_recrutadores var
          WHERE var.recrutador_id = ur.id 
            AND var.vaga_id = candidaturas.vaga_id
        )
      )
  )
);
```

**Policy 3: Candidato pode criar candidatura**
```sql
CREATE POLICY "Candidato cria candidatura"
ON candidaturas FOR INSERT
TO authenticated
WITH CHECK (
  candidato_id IN (
    SELECT id FROM candidatos WHERE user_id = auth.uid()
  )
);
```

**Policy 4: Candidato pode atualizar suas candidaturas (rascunhos)**
```sql
CREATE POLICY "Candidato atualiza próprias candidaturas"
ON candidaturas FOR UPDATE
TO authenticated
USING (
  candidato_id IN (
    SELECT id FROM candidatos WHERE user_id = auth.uid()
  )
  AND is_rascunho = TRUE -- Só pode editar rascunhos
);
```

**Policy 5: RH pode atualizar candidaturas**
```sql
CREATE POLICY "RH atualiza candidaturas"
ON candidaturas FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh ur
    WHERE ur.user_id = auth.uid() AND ur.ativo = TRUE
  )
);
```

---

#### RF-018: RLS para Tabelas de Perguntas e Respostas

**Perguntas são públicas (qualquer um pode ver):**
```sql
CREATE POLICY "Público vê perguntas de vagas ativas"
ON perguntas_formulario FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM vagas
    WHERE id = perguntas_formulario.vaga_id 
      AND status = 'ativa'
  )
);

-- Mesma lógica para perguntas_cultura
CREATE POLICY "Público vê perguntas cultura"
ON perguntas_cultura FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM vagas
    WHERE id = perguntas_cultura.vaga_id 
      AND status = 'ativa'
  )
);
```

**Respostas: candidato vê próprias, RH vê de candidatos das suas vagas:**
```sql
CREATE POLICY "Candidato vê próprias respostas"
ON respostas_formulario FOR SELECT
TO authenticated
USING (
  candidatura_id IN (
    SELECT id FROM candidaturas
    WHERE candidato_id IN (
      SELECT id FROM candidatos WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "RH vê respostas"
ON respostas_formulario FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM candidaturas c
    JOIN vagas v ON c.vaga_id = v.id
    WHERE c.id = respostas_formulario.candidatura_id
      AND EXISTS (
        SELECT 1 FROM usuarios_rh ur
        WHERE ur.user_id = auth.uid() AND ur.ativo = TRUE
      )
  )
);

-- Mesma lógica para respostas_cultura
```

---

### 4.6 Validações e Constraints

#### RF-019: Validação de Slug

```sql
ALTER TABLE vagas 
ADD CONSTRAINT slug_format_check 
CHECK (slug ~* '^[a-z0-9-]+$');
```

---

#### RF-020: Validação de Faixa Salarial

```sql
ALTER TABLE vagas 
ADD CONSTRAINT faixa_salarial_check 
CHECK (
  faixa_salarial_max IS NULL 
  OR faixa_salarial_min IS NULL 
  OR faixa_salarial_max >= faixa_salarial_min
);
```

---

#### RF-021: Validação de Datas

```sql
ALTER TABLE vagas 
ADD CONSTRAINT datas_vaga_check 
CHECK (
  data_fechamento IS NULL 
  OR data_abertura IS NULL 
  OR data_fechamento > data_abertura
);
```

---

#### RF-022: Validação de Score

```sql
ALTER TABLE candidaturas 
ADD CONSTRAINT score_range_check 
CHECK (score_geral IS NULL OR (score_geral >= 0 AND score_geral <= 100));
```

---

## 5. Non-Goals (Fora do Escopo)

### O que NÃO está incluído neste PRD:

❌ **Testes psicométricos** (Big Five, DISC, Raven) - PRD-DB-003  
❌ **Entrevistas** (Online e Presencial) - PRD-DB-004  
❌ **Análises IA** (Webhooks N8N) - PRD-N8N-001 a 006  
❌ **Templates de email** - PRD-DB-005  
❌ **Sistema de notificações** - Implementação backend/frontend  
❌ **Agendamento de entrevistas** - Funcionalidade futura (P2)  
❌ **Integração com LinkedIn** (puxar dados) - P3  
❌ **Videoconferência integrada** - Usar links externos (Meet, Zoom)  
❌ **Aplicação via redes sociais** - Apenas pela plataforma  
❌ **Sistema de pontuação customizável** - Pesos fixos no MVP  
❌ **Múltiplas empresas** - Sistema single-tenant  

---

## 6. Considerações de Design

### 6.1 Diagrama ER (Complemento ao PRD-DB-001)

```
┌────────────────────┐
│    candidatos      │ (PRD-DB-001)
└──────────┬─────────┘
           │
           │ 1:N
           ▼
┌──────────────────────────────────┐
│       candidaturas               │
│  ────────────────────────────    │
│  • id (PK)                       │
│  • candidato_id (FK)             │
│  • vaga_id (FK)                  │
│  • etapa_atual                   │
│  • status                        │
│  • curriculo_url                 │
│  • analise_ia_* (JSONB)          │
│  • score_geral                   │
└──────────┬───────────────────────┘
           │
           │ 1:N
           ▼
┌────────────────────────────┐
│   respostas_formulario     │
│  ──────────────────────    │
│  • id (PK)                 │
│  • candidatura_id (FK)     │
│  • pergunta_id (FK)        │
│  • resposta_texto          │
│  • resposta_opcoes (JSONB) │
└────────────┬───────────────┘
             │
             │ N:1
             ▼
┌───────────────────────────┐
│  perguntas_formulario     │
│  ─────────────────────    │
│  • id (PK)                │
│  • vaga_id (FK)           │
│  • bloco                  │
│  • ordem                  │
│  • texto_pergunta         │
│  • tipo_resposta          │
│  • opcoes_resposta (JSONB)│
└───────────┬───────────────┘
            │
            │ N:1
            ▼
┌─────────────────────────────────────────────┐
│                vagas                        │
│  ─────────────────────────────────────      │
│  • id (PK)                                  │
│  • slug (UNIQUE)                            │
│  • titulo, subtitulo, descricao_curta       │
│  • departamento, tipo_contrato, nivel       │
│  • cidade, estado, endereco_completo        │
│  • faixa_salarial_min/max                   │
│  • status (enum)                            │
│  • sobre_empresa, sobre_cargo               │
│  • responsabilidades, requisitos_*          │
│  • perfil_ideal, diferenciais, beneficios   │
│  • prompt_ia_descricao                      │
└──────────┬──────────────────────────────────┘
           │
           │ N:M
           ▼
┌────────────────────────────────┐
│ vagas_associadas_recrutadores  │ (PRD-DB-001)
│  ──────────────────────────    │
│  • vaga_id (FK)                │
│  • recrutador_id (FK)          │
└────────────────────────────────┘
           │
           │ N:1
           ▼
┌────────────────────┐
│   usuarios_rh      │ (PRD-DB-001)
└────────────────────┘
```

---

### 6.2 Fluxo de Candidatura

```
1. Candidato acessa landing page pública: /vaga/assistente-odontologico
   ↓
2. Clica "Quero me candidatar" → Redireciona para LoginCandidatoPage
   ↓
3. Login ou Cadastro → Cria sessão
   ↓
4. Redireciona para página "Meu Perfil" (hub centralizado)
   ↓
5. Página "Meu Perfil" detecta candidatura nova (etapa_atual = 'triagem'):
   - Mostra card "Próximo Passo: Preencher Formulário de Triagem"
   - Exibe vídeo de instruções (se configurado)
   - Botão "Iniciar Formulário" habilitado
   ↓
6. Clica "Iniciar Formulário" → FormularioCandidaturaPage
   ↓
7. Preenche 4 blocos de perguntas customizadas:
   - Bloco 1: Sua Jornada Profissional
   - Bloco 2: Tecnologia e Inovação
   - Bloco 3: Nossos Valores e Sua Essência
   - Bloco 4: Upload do Currículo (PDF/DOCX)
   ↓
8. (Opcional) Clica "Salvar Rascunho" → is_rascunho = TRUE
   ↓
9. Clica "Enviar Candidatura":
   - Valida todos campos obrigatórios
   - Upload currículo para Supabase Storage
   - Insere registro em candidaturas (is_rascunho = FALSE)
   - Insere respostas em respostas_formulario
   - Registra tempo_preenchimento_segundos
   - Dispara webhook N8N (PRD-N8N-001)
   ↓
10. Webhook N8N faz análise IA:
   - Envia prompt com descrição da vaga + respostas
   - Claude API analisa adequação
   - Retorna score e recomendação
   - Salva em candidaturas.analise_ia_formulario (JSONB)
   ↓
11. Redireciona para página "Meu Perfil"
   - Mostra etapa "Triagem" como completa (✅)
   - Próximo passo disponível conforme decisão do RH
```

---

### 6.3 Fluxo RH: Gerenciar Candidatos

```
1. RH acessa DashboardRHPage
   ↓
2. Clica em uma vaga no dashboard
   ↓
3. Redireciona para CandidatosRHPage (filtrado por vaga)
   ↓
4. Visualiza cards dos candidatos com:
   - Foto, nome, email
   - Etapa atual
   - Status
   - Score geral (se disponível)
   - Indicador "FALTA" se testes pendentes
   ↓
5. Clica em um candidato → PerfilCandidatoRHPage
   ↓
6. Visualiza 10 abas:
   - Visão Geral (scores consolidados)
   - Formulário (respostas + análise IA)
   - Big Five, DISC, Raven, Cultura
   - Entrevista Online, Entrevista Presencial
   - Notas RH, Histórico
   ↓
7. Decide:
   - Botão "Próxima Etapa" → Chama avancar_etapa()
   - Botão "Rejeitar" → Chama rejeitar_candidato()
   ↓
8. Sistema atualiza candidatura e dispara webhook N8N (email ao candidato)
```

---

## 7. Considerações Técnicas

### 7.1 Performance

**Otimizações:**
- Índice full-text em `vagas.titulo` e `descricao_curta`
- Índice composto em `(vaga_id, etapa_atual, status)` para filtros complexos
- JSONB para análises IA (flexível e indexável)
- Paginação em listagens (limit/offset ou cursor-based)

**Caching:**
- Listar vagas ativas pode ser cacheado (ttl: 5 minutos)
- Landing pages de vagas podem ser cacheadas (ttl: 1 hora)
- Candidaturas devem sempre estar atualizadas (sem cache)

---

### 7.2 Segurança

**Princípios:**
- RLS garante que recrutadores vejam apenas vagas associadas
- Currículos em bucket privado com RLS
- Soft delete para compliance LGPD
- Auditoria completa (created_by, updated_by)

**Upload de Currículos:**
- Validar tipo MIME no backend
- Escanear arquivos com antivírus (Supabase Functions)
- Limitar tamanho (5MB)
- Salvar hash do arquivo (detectar duplicatas)

---

### 7.3 Escalabilidade

**Limites Esperados (Ano 1):**
- Vagas: ~50 ativas, ~200 total (incluindo arquivadas)
- Candidaturas: ~5k no primeiro ano
- Perguntas: ~400 (8 perguntas/vaga * 50 vagas)
- Respostas: ~40k (8 respostas/candidatura * 5k candidaturas)
- Currículos: ~5k arquivos (~2.5GB total)

**Quando Escalar:**
- Se candidaturas > 100k, particionar por ano
- Se perguntas > 10k, considerar cache de perguntas por vaga
- Se currículos > 100GB, mover para cold storage após 2 anos

---

### 7.4 Webhooks N8N

**Integração:**
- URL do webhook configurada em `configuracoes` (PRD-DB-005)
- Payload enviado após candidato enviar formulário
- Timeout: 30 segundos
- Retry: 3 tentativas com backoff exponencial

**Payload Exemplo:**
```json
{
  "evento": "candidatura_enviada",
  "candidatura_id": "uuid",
  "candidato": {
    "id": "uuid",
    "nome": "João Silva",
    "email": "joao@email.com"
  },
  "vaga": {
    "id": "uuid",
    "titulo": "Assistente Odontológico",
    "prompt_ia_descricao": "Descrição da vaga para IA..."
  },
  "respostas": [
    {
      "pergunta": "Qual seu nível de experiência?",
      "resposta": "1 a 3 anos"
    }
  ],
  "curriculo_url": "https://supabase.co/storage/.../curriculo.pdf",
  "tempo_preenchimento": "00:15:32",
  "timestamp": "2025-11-02T14:30:00Z"
}
```

---

## 8. Métricas de Sucesso

### 8.1 Métricas Técnicas

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Tempo de criação de vaga** | < 10 minutos | Analytics frontend |
| **Tempo de candidatura** | < 20 minutos (média) | `tempo_preenchimento_segundos` |
| **Taxa de rascunhos abandonados** | < 30% | `COUNT(is_rascunho=TRUE) / COUNT(*)` |
| **Upload de currículo bem-sucedido** | > 95% | Logs de erro vs total uploads |
| **Webhook resposta N8N** | < 5 segundos | Monitoring N8N |

---

### 8.2 Métricas de Negócio

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Vagas ativas** | 10+ no primeiro mês | `COUNT(status='ativa')` |
| **Candidaturas por vaga** | 50+ (média) | `AVG(COUNT(*) GROUP BY vaga_id)` |
| **Taxa de conversão** (visualização → candidatura) | > 10% | Analytics de visualizações vs candidaturas |
| **Tempo médio processo** (triagem → decisão) | < 30 dias | Diferença entre `data_candidatura` e `data_decisao_final` |
| **Taxa de aprovação** | 10-15% | `COUNT(etapa='aprovado') / COUNT(*)` |

---

### 8.3 Queries para Análise

**Total de candidaturas por vaga:**
```sql
SELECT 
  v.titulo,
  COUNT(c.id) as total_candidaturas,
  COUNT(CASE WHEN c.etapa_atual = 'aprovado' THEN 1 END) as aprovados,
  ROUND(AVG(c.score_geral), 2) as score_medio
FROM vagas v
LEFT JOIN candidaturas c ON v.id = c.vaga_id AND c.deleted_at IS NULL
WHERE v.deleted_at IS NULL
GROUP BY v.id, v.titulo
ORDER BY total_candidaturas DESC;
```

**Funil de conversão por etapa:**
```sql
SELECT 
  etapa_atual,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM candidaturas
WHERE deleted_at IS NULL
GROUP BY etapa_atual
ORDER BY 
  CASE etapa_atual
    WHEN 'triagem' THEN 1
    WHEN 'bigfive' THEN 2
    WHEN 'disc' THEN 3
    WHEN 'entrevista_online' THEN 4
    WHEN 'raven' THEN 5
    WHEN 'cultura' THEN 6
    WHEN 'entrevista_presencial' THEN 7
    WHEN 'aprovado' THEN 8
    WHEN 'rejeitado' THEN 9
  END;
```

**Tempo médio de preenchimento:**
```sql
SELECT 
  v.titulo,
  AVG(c.tempo_preenchimento_segundos) / 60 as tempo_medio_minutos,
  MIN(c.tempo_preenchimento_segundos) / 60 as tempo_minimo_minutos,
  MAX(c.tempo_preenchimento_segundos) / 60 as tempo_maximo_minutos
FROM candidaturas c
JOIN vagas v ON c.vaga_id = v.id
WHERE c.tempo_preenchimento_segundos IS NOT NULL
GROUP BY v.id, v.titulo;
```

---

## 9. Questões Em Aberto

### 9.1 Decisões Pendentes

**Q1: Limite de Candidaturas por Candidato**
- Permitir candidaturas ilimitadas ou limitar?
- **Proposta:** Ilimitado no MVP, avaliar necessidade de limite depois

**Q2: Reedição de Candidatura**
- Candidato pode editar candidatura após enviar?
- **Proposta:** NÃO no MVP (complexidade alta)

**Q3: Replicar Perguntas entre Vagas**
- RH pode copiar perguntas de uma vaga para outra?
- **Proposta:** P2 (criar biblioteca de perguntas - PRD-DEV-031)

**Q4: Versionamento de Vagas**
- Salvar histórico de alterações na vaga?
- **Proposta:** Não no MVP, apenas auditoria básica

**Q5: Múltiplos Currículos**
- Candidato pode ter múltiplos currículos (um por vaga)?
- **Proposta:** SIM (estrutura já suporta: `{candidato_id}/{vaga_id}/curriculo.pdf`)

---

## 10. Checklist de Implementação

### Fase 1: Estrutura de Vagas
- [ ] Expandir tabela `vagas` com todos os campos do RF-001
- [ ] Criar enum `status_vaga`
- [ ] Criar índices necessários
- [ ] Criar constraints de validação
- [ ] Testar criação de vaga completa

### Fase 2: Perguntas Customizadas
- [ ] Criar tabela `perguntas_formulario`
- [ ] Criar tabela `perguntas_cultura`
- [ ] Criar enum `tipo_resposta_pergunta`
- [ ] Testar criação de perguntas por vaga
- [ ] Testar diferentes tipos de resposta

### Fase 3: Candidaturas
- [ ] Criar tabela `candidaturas`
- [ ] Criar enums `etapa_processo` e `status_candidatura`
- [ ] Criar tabela `respostas_formulario`
- [ ] Criar tabela `respostas_cultura`
- [ ] Testar criação de candidatura completa

### Fase 4: Storage de Currículos
- [ ] Criar bucket `curriculos` no Supabase Storage
- [ ] Configurar limites e formatos aceitos
- [ ] Criar RLS policies para Storage
- [ ] Testar upload de currículo
- [ ] Testar acesso de candidato e RH

### Fase 5: RLS e Segurança
- [ ] Criar todas as RLS policies para `vagas`
- [ ] Criar todas as RLS policies para `candidaturas`
- [ ] Criar RLS policies para perguntas e respostas
- [ ] Testar acesso de recrutador (apenas vagas associadas)
- [ ] Testar acesso de admin/gerente (todas vagas)

### Fase 6: Functions e Triggers
- [ ] Aplicar trigger `updated_at` em todas tabelas
- [ ] Criar function `calcular_score_geral()`
- [ ] Criar function `avancar_etapa()`
- [ ] Criar function `rejeitar_candidato()`
- [ ] Testar todas as functions

### Fase 7: Testes Integrados
- [ ] Testar fluxo completo: candidato cria conta → se candidata → preenche formulário → envia
- [ ] Testar RH visualiza candidato e avança etapa
- [ ] Testar RH rejeita candidato
- [ ] Testar múltiplas candidaturas do mesmo candidato
- [ ] Testar rascunhos de candidatura

### Fase 8: Seed Data
- [ ] Criar 3 vagas de exemplo (ativas)
- [ ] Criar perguntas para cada vaga
- [ ] Associar recrutadores às vagas
- [ ] Criar candidaturas de teste em diferentes etapas

---

## 11. Dependências

### Dependências Externas

| Dependência | Descrição | Status |
|-------------|-----------|--------|
| **PRD-DB-001** | Tabelas candidatos, usuarios_rh, vagas_associadas_recrutadores | ✅ Completo |
| **Supabase Storage** | Bucket para currículos | ⏳ A configurar |
| **N8N Webhook** | Para análise IA | ⏳ PRD-N8N-001 |

---

### Dependências Internas

| PRD Dependente | Razão |
|----------------|-------|
| **PRD-N8N-001** | Webhook análise formulário inicial | 
| **PRD-N8N-002** | Webhook análise Big Five |
| **PRD-N8N-003** | Webhook análise DISC |
| **PRD-DB-003** | Tabelas testes psicométricos |
| **PRD-DEV-005** | Frontend formulário candidatura |
| **PRD-DEV-017** | Frontend listagem vagas (RH) |
| **PRD-DEV-018** | Frontend criar/editar vaga |

---

## 12. Anexos

### Anexo A: Script SQL Completo de Migração

```sql
-- =====================================================
-- MIGRATION: Estrutura de Vagas e Candidaturas
-- PRD: PRD-DB-002
-- Data: 02/11/2025
-- Versão: 1.0
-- Dependências: PRD-DB-001 deve estar implementado
-- =====================================================

-- =====================================================
-- 1. CRIAR ENUMS
-- =====================================================

CREATE TYPE status_vaga AS ENUM (
  'rascunho',
  'ativa',
  'inativa',
  'arquivada'
);

CREATE TYPE etapa_processo AS ENUM (
  'triagem',
  'bigfive',
  'disc',
  'entrevista_online',
  'raven',
  'cultura',
  'entrevista_presencial',
  'aprovado',
  'rejeitado'
);

CREATE TYPE status_candidatura AS ENUM (
  'aguardando_resposta',
  'em_analise',
  'aprovado_proxima',
  'rejeitado',
  'finalizado'
);

CREATE TYPE tipo_resposta_pergunta AS ENUM (
  'texto_curto',
  'texto_longo',
  'single_choice',
  'multiple_choice',
  'numerico'
);

-- =====================================================
-- 2. EXPANDIR TABELA VAGAS
-- =====================================================

-- A tabela vagas já existe (criada no PRD-DB-001 ou DB Expert)
-- Adicionar campos necessários

ALTER TABLE vagas ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE NOT NULL DEFAULT '';
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS subtitulo TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS descricao_curta TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS departamento TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS tipo_contrato TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS modelo_trabalho TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS nivel_senioridade TEXT NULL;

-- Localização
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS cidade TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS estado TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS endereco_completo TEXT NULL;

-- Remuneração
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS faixa_salarial_min DECIMAL(10,2) NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS faixa_salarial_max DECIMAL(10,2) NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS exibir_salario BOOLEAN DEFAULT FALSE;

-- Status e controle
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS status status_vaga NOT NULL DEFAULT 'rascunho';
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS data_abertura DATE NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS data_fechamento DATE NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS total_vagas INTEGER DEFAULT 1;

-- Landing Page
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS sobre_empresa TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS sobre_cargo TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS responsabilidades TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS requisitos_formacao TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS requisitos_experiencia TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS requisitos_tecnicos TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS requisitos_habilidades TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS perfil_ideal TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS diferenciais TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS beneficios TEXT NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS jornada_trabalho TEXT NULL;

-- IA
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS prompt_ia_descricao TEXT NULL;

-- Auditoria (se não existirem do PRD-DB-001)
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES usuarios_rh(id) NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES usuarios_rh(id) NULL;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Constraints
ALTER TABLE vagas 
ADD CONSTRAINT slug_format_check 
CHECK (slug ~* '^[a-z0-9-]+$');

ALTER TABLE vagas 
ADD CONSTRAINT faixa_salarial_check 
CHECK (
  faixa_salarial_max IS NULL 
  OR faixa_salarial_min IS NULL 
  OR faixa_salarial_max >= faixa_salarial_min
);

ALTER TABLE vagas 
ADD CONSTRAINT datas_vaga_check 
CHECK (
  data_fechamento IS NULL 
  OR data_abertura IS NULL 
  OR data_fechamento > data_abertura
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vagas_slug ON vagas(slug);
CREATE INDEX IF NOT EXISTS idx_vagas_status ON vagas(status);
CREATE INDEX IF NOT EXISTS idx_vagas_departamento ON vagas(departamento);
CREATE INDEX IF NOT EXISTS idx_vagas_deleted_at ON vagas(deleted_at);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_vagas_titulo_fulltext ON vagas USING gin(to_tsvector('portuguese', titulo));
CREATE INDEX IF NOT EXISTS idx_vagas_descricao_fulltext ON vagas USING gin(to_tsvector('portuguese', COALESCE(descricao_curta, '')));

-- =====================================================
-- 3. CRIAR TABELA CANDIDATURAS
-- =====================================================

CREATE TABLE candidaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID REFERENCES candidatos(id) ON DELETE CASCADE NOT NULL,
  vaga_id UUID REFERENCES vagas(id) ON DELETE CASCADE NOT NULL,
  
  -- Controle de etapa
  etapa_atual etapa_processo NOT NULL DEFAULT 'triagem',
  status status_candidatura NOT NULL DEFAULT 'aguardando_resposta',
  
  -- Timestamps de progresso
  data_candidatura TIMESTAMPTZ DEFAULT NOW(),
  data_formulario_enviado TIMESTAMPTZ NULL,
  data_bigfive_enviado TIMESTAMPTZ NULL,
  data_disc_enviado TIMESTAMPTZ NULL,
  data_raven_enviado TIMESTAMPTZ NULL,
  data_cultura_enviado TIMESTAMPTZ NULL,
  data_entrevista_online TIMESTAMPTZ NULL,
  data_entrevista_presencial TIMESTAMPTZ NULL,
  data_decisao_final TIMESTAMPTZ NULL,
  
  -- Currículo
  curriculo_url TEXT NULL,
  curriculo_nome_original TEXT NULL,
  curriculo_tamanho_bytes INTEGER NULL,
  
  -- Analytics
  tempo_preenchimento_segundos INTEGER NULL,
  origem_candidatura TEXT NULL,
  
  -- Análise IA (JSONB permite estrutura flexível)
  analise_ia_formulario JSONB NULL,
  analise_ia_bigfive JSONB NULL,
  analise_ia_disc JSONB NULL,
  analise_ia_raven JSONB NULL,
  analise_ia_cultura JSONB NULL,
  analise_ia_entrevista_online JSONB NULL,
  analise_ia_entrevista_presencial JSONB NULL,
  score_geral DECIMAL(5,2) NULL,
  
  -- Feedback
  feedback_rejeicao TEXT NULL,
  observacoes_rh TEXT NULL,
  
  -- Flags
  is_rascunho BOOLEAN DEFAULT FALSE,
  is_favorito BOOLEAN DEFAULT FALSE,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  
  -- Constraints
  CONSTRAINT candidatura_unica UNIQUE (candidato_id, vaga_id),
  CONSTRAINT score_range_check CHECK (score_geral IS NULL OR (score_geral >= 0 AND score_geral <= 100))
);

-- Índices
CREATE INDEX idx_candidaturas_candidato ON candidaturas(candidato_id);
CREATE INDEX idx_candidaturas_vaga ON candidaturas(vaga_id);
CREATE INDEX idx_candidaturas_etapa_status ON candidaturas(vaga_id, etapa_atual, status);
CREATE INDEX idx_candidaturas_rascunho ON candidaturas(is_rascunho);
CREATE INDEX idx_candidaturas_deleted_at ON candidaturas(deleted_at);
CREATE INDEX idx_candidaturas_score ON candidaturas(score_geral DESC);

-- Comentários
COMMENT ON TABLE candidaturas IS 'Armazena cada aplicação de um candidato a uma vaga';
COMMENT ON COLUMN candidaturas.tempo_preenchimento_segundos IS 'Tempo em segundos para preencher formulário (oculto do candidato)';
COMMENT ON COLUMN candidaturas.is_rascunho IS 'TRUE = salvo mas não enviado, FALSE = candidatura completa';

-- =====================================================
-- 4. CRIAR TABELA PERGUNTAS_FORMULARIO
-- =====================================================

CREATE TABLE perguntas_formulario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID REFERENCES vagas(id) ON DELETE CASCADE NOT NULL,
  bloco TEXT NOT NULL CHECK (bloco IN ('jornada', 'tecnologia', 'valores', 'curriculo')),
  
  -- Conteúdo
  ordem INTEGER NOT NULL CHECK (ordem >= 1),
  texto_pergunta TEXT NOT NULL,
  texto_ajuda TEXT NULL,
  tipo_resposta tipo_resposta_pergunta NOT NULL,
  
  -- Opções (para múltipla escolha)
  opcoes_resposta JSONB NULL,
  permite_outros BOOLEAN DEFAULT FALSE,
  
  -- Validações
  obrigatoria BOOLEAN DEFAULT TRUE,
  limite_caracteres INTEGER NULL,
  valor_minimo DECIMAL NULL,
  valor_maximo DECIMAL NULL,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios_rh(id) NULL,
  updated_by UUID REFERENCES usuarios_rh(id) NULL
);

-- Índices
CREATE INDEX idx_perguntas_form_vaga ON perguntas_formulario(vaga_id);
CREATE INDEX idx_perguntas_form_vaga_bloco_ordem ON perguntas_formulario(vaga_id, bloco, ordem);
CREATE INDEX idx_perguntas_form_deleted_at ON perguntas_formulario(deleted_at);

-- Comentários
COMMENT ON TABLE perguntas_formulario IS 'Perguntas customizadas do formulário de triagem por vaga';
COMMENT ON COLUMN perguntas_formulario.bloco IS 'Agrupamento visual: jornada, tecnologia, valores, curriculo';
COMMENT ON COLUMN perguntas_formulario.opcoes_resposta IS 'Array JSON de opções para single/multiple choice';

-- =====================================================
-- 5. CRIAR TABELA RESPOSTAS_FORMULARIO
-- =====================================================

CREATE TABLE respostas_formulario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE NOT NULL,
  pergunta_id UUID REFERENCES perguntas_formulario(id) ON DELETE CASCADE NOT NULL,
  
  -- Resposta (apenas um dos campos será preenchido)
  resposta_texto TEXT NULL,
  resposta_opcoes JSONB NULL,
  resposta_numerica DECIMAL NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT resposta_unica UNIQUE (candidatura_id, pergunta_id),
  CONSTRAINT pelo_menos_uma_resposta CHECK (
    resposta_texto IS NOT NULL OR 
    resposta_opcoes IS NOT NULL OR 
    resposta_numerica IS NOT NULL
  )
);

-- Índices
CREATE INDEX idx_respostas_form_candidatura ON respostas_formulario(candidatura_id);
CREATE INDEX idx_respostas_form_pergunta ON respostas_formulario(pergunta_id);

-- Comentários
COMMENT ON TABLE respostas_formulario IS 'Respostas dos candidatos ao formulário de triagem';

-- =====================================================
-- 6. CRIAR TABELA PERGUNTAS_CULTURA
-- =====================================================

CREATE TABLE perguntas_cultura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID REFERENCES vagas(id) ON DELETE CASCADE NOT NULL,
  
  -- Pergunta
  ordem INTEGER NOT NULL CHECK (ordem >= 1 AND ordem <= 7),
  texto_pergunta TEXT NOT NULL,
  texto_ajuda TEXT NULL,
  
  -- Validações
  obrigatoria BOOLEAN DEFAULT TRUE,
  limite_caracteres INTEGER DEFAULT 1000,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios_rh(id) NULL,
  updated_by UUID REFERENCES usuarios_rh(id) NULL
);

-- Índices
CREATE INDEX idx_perguntas_cultura_vaga ON perguntas_cultura(vaga_id);
CREATE INDEX idx_perguntas_cultura_vaga_ordem ON perguntas_cultura(vaga_id, ordem);

-- Comentários
COMMENT ON TABLE perguntas_cultura IS 'Perguntas de fit cultural (máximo 7 por vaga)';

-- =====================================================
-- 7. CRIAR TABELA RESPOSTAS_CULTURA
-- =====================================================

CREATE TABLE respostas_cultura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE NOT NULL,
  pergunta_id UUID REFERENCES perguntas_cultura(id) ON DELETE CASCADE NOT NULL,
  
  -- Resposta
  resposta_texto TEXT NOT NULL,
  tempo_resposta_segundos INTEGER NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT resposta_cultura_unica UNIQUE (candidatura_id, pergunta_id)
);

-- Índices
CREATE INDEX idx_respostas_cultura_candidatura ON respostas_cultura(candidatura_id);

-- Comentários
COMMENT ON TABLE respostas_cultura IS 'Respostas longas sobre fit cultural';

-- =====================================================
-- 8. CRIAR TRIGGERS
-- =====================================================

-- Trigger updated_at (usar function do PRD-DB-001)
CREATE TRIGGER update_vagas_updated_at 
  BEFORE UPDATE ON vagas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidaturas_updated_at 
  BEFORE UPDATE ON candidaturas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perguntas_formulario_updated_at 
  BEFORE UPDATE ON perguntas_formulario
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_respostas_formulario_updated_at 
  BEFORE UPDATE ON respostas_formulario
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perguntas_cultura_updated_at 
  BEFORE UPDATE ON perguntas_cultura
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_respostas_cultura_updated_at 
  BEFORE UPDATE ON respostas_cultura
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. CRIAR FUNCTIONS
-- =====================================================

-- Function: Calcular Score Geral
CREATE OR REPLACE FUNCTION calcular_score_geral(candidatura_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  score_formulario DECIMAL(5,2);
  score_bigfive DECIMAL(5,2);
  score_disc DECIMAL(5,2);
  score_raven DECIMAL(5,2);
  score_cultura DECIMAL(5,2);
  score_entrevista_online DECIMAL(5,2);
  score_entrevista_presencial DECIMAL(5,2);
  score_final DECIMAL(5,2);
BEGIN
  -- Buscar scores das análises IA
  SELECT 
    (analise_ia_formulario->>'score')::DECIMAL,
    (analise_ia_bigfive->>'score')::DECIMAL,
    (analise_ia_disc->>'score')::DECIMAL,
    (analise_ia_raven->>'score')::DECIMAL,
    (analise_ia_cultura->>'score')::DECIMAL,
    (analise_ia_entrevista_online->>'score')::DECIMAL,
    (analise_ia_entrevista_presencial->>'score')::DECIMAL
  INTO 
    score_formulario, score_bigfive, score_disc, 
    score_raven, score_cultura, score_entrevista_online, 
    score_entrevista_presencial
  FROM candidaturas
  WHERE id = candidatura_uuid;
  
  -- Calcular média ponderada
  -- Pesos: Formulário 15%, BigFive 15%, DISC 10%, Raven 20%, Cultura 30%, Entrevistas 10%
  score_final := COALESCE(
    (COALESCE(score_formulario, 0) * 0.15) +
    (COALESCE(score_bigfive, 0) * 0.15) +
    (COALESCE(score_disc, 0) * 0.10) +
    (COALESCE(score_raven, 0) * 0.20) +
    (COALESCE(score_cultura, 0) * 0.30) +
    (COALESCE(score_entrevista_online, 0) * 0.05) +
    (COALESCE(score_entrevista_presencial, 0) * 0.05),
    0
  );
  
  -- Atualizar candidatura
  UPDATE candidaturas 
  SET score_geral = score_final
  WHERE id = candidatura_uuid;
  
  RETURN score_final;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_score_geral IS 'Calcula score geral consolidado com pesos definidos';

-- Function: Avançar Etapa
CREATE OR REPLACE FUNCTION avancar_etapa(
  candidatura_uuid UUID,
  usuario_rh_uuid UUID
)
RETURNS VOID AS $$
DECLARE
  etapa_atual_valor etapa_processo;
  proxima_etapa etapa_processo;
BEGIN
  -- Buscar etapa atual
  SELECT etapa_atual INTO etapa_atual_valor
  FROM candidaturas
  WHERE id = candidatura_uuid;
  
  -- Determinar próxima etapa
  proxima_etapa := CASE etapa_atual_valor
    WHEN 'triagem' THEN 'bigfive'
    WHEN 'bigfive' THEN 'disc'
    WHEN 'disc' THEN 'entrevista_online'
    WHEN 'entrevista_online' THEN 'raven'
    WHEN 'raven' THEN 'cultura'
    WHEN 'cultura' THEN 'entrevista_presencial'
    WHEN 'entrevista_presencial' THEN 'aprovado'
    ELSE 'aprovado'
  END;
  
  -- Atualizar candidatura
  UPDATE candidaturas
  SET 
    etapa_atual = proxima_etapa,
    status = 'aguardando_resposta',
    updated_at = NOW(),
    updated_by = usuario_rh_uuid
  WHERE id = candidatura_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION avancar_etapa IS 'Avança candidato para próxima etapa do processo seletivo';

-- Function: Rejeitar Candidato
CREATE OR REPLACE FUNCTION rejeitar_candidato(
  candidatura_uuid UUID,
  usuario_rh_uuid UUID,
  motivo TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE candidaturas
  SET 
    etapa_atual = 'rejeitado',
    status = 'finalizado',
    feedback_rejeicao = motivo,
    data_decisao_final = NOW(),
    updated_at = NOW(),
    updated_by = usuario_rh_uuid
  WHERE id = candidatura_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rejeitar_candidato IS 'Rejeita candidato e finaliza processo';

-- =====================================================
-- 10. HABILITAR RLS E CRIAR POLICIES
-- =====================================================

-- RLS: vagas
ALTER TABLE vagas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público vê vagas ativas"
ON vagas FOR SELECT
TO anon, authenticated
USING (status = 'ativa' AND deleted_at IS NULL);

CREATE POLICY "RH vê todas vagas"
ON vagas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() 
      AND ativo = TRUE 
      AND deleted_at IS NULL
  )
);

CREATE POLICY "Admin/Gerente criam vagas"
ON vagas FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() 
      AND role IN ('administrador', 'gerente')
      AND ativo = TRUE
  )
);

CREATE POLICY "Admin/Gerente editam vagas"
ON vagas FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() 
      AND role IN ('administrador', 'gerente')
      AND ativo = TRUE
  )
);

-- RLS: candidaturas
ALTER TABLE candidaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidato vê próprias candidaturas"
ON candidaturas FOR SELECT
TO authenticated
USING (
  candidato_id IN (
    SELECT id FROM candidatos WHERE user_id = auth.uid()
  )
);

CREATE POLICY "RH vê candidaturas de suas vagas"
ON candidaturas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh ur
    WHERE ur.user_id = auth.uid() 
      AND ur.ativo = TRUE
      AND (
        ur.role IN ('administrador', 'gerente')
        OR
        EXISTS (
          SELECT 1 FROM vagas_associadas_recrutadores var
          WHERE var.recrutador_id = ur.id 
            AND var.vaga_id = candidaturas.vaga_id
        )
      )
  )
);

CREATE POLICY "Candidato cria candidatura"
ON candidaturas FOR INSERT
TO authenticated
WITH CHECK (
  candidato_id IN (
    SELECT id FROM candidatos WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Candidato atualiza rascunhos"
ON candidaturas FOR UPDATE
TO authenticated
USING (
  candidato_id IN (
    SELECT id FROM candidatos WHERE user_id = auth.uid()
  )
  AND is_rascunho = TRUE
);

CREATE POLICY "RH atualiza candidaturas"
ON candidaturas FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh ur
    WHERE ur.user_id = auth.uid() AND ur.ativo = TRUE
  )
);

-- RLS: perguntas_formulario
ALTER TABLE perguntas_formulario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público vê perguntas de vagas ativas"
ON perguntas_formulario FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM vagas
    WHERE id = perguntas_formulario.vaga_id 
      AND status = 'ativa'
  )
);

-- RLS: respostas_formulario
ALTER TABLE respostas_formulario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidato vê próprias respostas"
ON respostas_formulario FOR SELECT
TO authenticated
USING (
  candidatura_id IN (
    SELECT id FROM candidaturas
    WHERE candidato_id IN (
      SELECT id FROM candidatos WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "RH vê respostas"
ON respostas_formulario FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM candidaturas c
    WHERE c.id = respostas_formulario.candidatura_id
      AND EXISTS (
        SELECT 1 FROM usuarios_rh ur
        WHERE ur.user_id = auth.uid() AND ur.ativo = TRUE
      )
  )
);

-- RLS: perguntas_cultura (mesma lógica de perguntas_formulario)
ALTER TABLE perguntas_cultura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público vê perguntas cultura"
ON perguntas_cultura FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM vagas
    WHERE id = perguntas_cultura.vaga_id 
      AND status = 'ativa'
  )
);

-- RLS: respostas_cultura (mesma lógica de respostas_formulario)
ALTER TABLE respostas_cultura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidato vê próprias respostas cultura"
ON respostas_cultura FOR SELECT
TO authenticated
USING (
  candidatura_id IN (
    SELECT id FROM candidaturas
    WHERE candidato_id IN (
      SELECT id FROM candidatos WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "RH vê respostas cultura"
ON respostas_cultura FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM candidaturas c
    WHERE c.id = respostas_cultura.candidatura_id
      AND EXISTS (
        SELECT 1 FROM usuarios_rh ur
        WHERE ur.user_id = auth.uid() AND ur.ativo = TRUE
      )
  )
);

-- =====================================================
-- 11. CONFIGURAR STORAGE (Bucket Currículos)
-- =====================================================

-- Criar bucket 'curriculos' (executar via Dashboard ou Storage API)
-- Configurações:
--   - Name: curriculos
--   - Public: false
--   - File size limit: 5 MB
--   - Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- NOTA: Policies de Storage são criadas no Supabase Dashboard:
-- 
-- Policy 1: Upload
--   - Operation: INSERT
--   - Policy: (storage.foldername(name))[1]::uuid IN (SELECT id FROM candidatos WHERE user_id = auth.uid())
--
-- Policy 2: Read - Candidato
--   - Operation: SELECT
--   - Policy: (storage.foldername(name))[1]::uuid IN (SELECT id FROM candidatos WHERE user_id = auth.uid())
--
-- Policy 3: Read - RH
--   - Operation: SELECT
--   - Policy: EXISTS (SELECT 1 FROM usuarios_rh WHERE user_id = auth.uid())
--
-- Policy 4: Update
--   - Operation: UPDATE
--   - Policy: (storage.foldername(name))[1]::uuid IN (SELECT id FROM candidatos WHERE user_id = auth.uid())
--
-- Policy 5: Delete - Apenas Admin
--   - Operation: DELETE
--   - Policy: EXISTS (SELECT 1 FROM usuarios_rh WHERE user_id = auth.uid() AND role = 'administrador')

-- =====================================================
-- 12. SEED DATA (Opcional - Para Testes)
-- =====================================================

-- Inserir vaga de exemplo (após ter usuário RH criado)
/*
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
  status,
  data_abertura,
  total_vagas,
  sobre_empresa,
  sobre_cargo,
  prompt_ia_descricao,
  created_by
) VALUES (
  'assistente-odontologico',
  'Assistente Odontológico',
  'Junte-se ao nosso time e transforme sorrisos!',
  'Estamos em busca de um(a) Assistente Odontológico(a) para integrar nossa equipe.',
  'Odontologia',
  'CLT',
  'Presencial',
  'Júnior',
  'São Paulo',
  'SP',
  'ativa',
  '2025-11-01',
  2,
  'A Beauty Smile é uma clínica odontológica moderna...',
  'Como Assistente Odontológico, você será responsável por...',
  'Vaga para assistente odontológico com experiência em atendimento ao paciente e auxílio em procedimentos.',
  '[UUID_DO_USUARIO_RH]'
);
*/

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

SELECT 'Migração PRD-DB-002 completa!' as status;
```

---

### Anexo B: Script de Rollback

```sql
-- =====================================================
-- ROLLBACK: Estrutura de Vagas e Candidaturas
-- PRD: PRD-DB-002
-- ATENÇÃO: Use apenas em ambientes de desenvolvimento!
-- =====================================================

-- 1. Remover Policies RLS
DROP POLICY IF EXISTS "Público vê vagas ativas" ON vagas;
DROP POLICY IF EXISTS "RH vê todas vagas" ON vagas;
DROP POLICY IF EXISTS "Admin/Gerente criam vagas" ON vagas;
DROP POLICY IF EXISTS "Admin/Gerente editam vagas" ON vagas;

DROP POLICY IF EXISTS "Candidato vê próprias candidaturas" ON candidaturas;
DROP POLICY IF EXISTS "RH vê candidaturas de suas vagas" ON candidaturas;
DROP POLICY IF EXISTS "Candidato cria candidatura" ON candidaturas;
DROP POLICY IF EXISTS "Candidato atualiza rascunhos" ON candidaturas;
DROP POLICY IF EXISTS "RH atualiza candidaturas" ON candidaturas;

DROP POLICY IF EXISTS "Público vê perguntas de vagas ativas" ON perguntas_formulario;
DROP POLICY IF EXISTS "Candidato vê próprias respostas" ON respostas_formulario;
DROP POLICY IF EXISTS "RH vê respostas" ON respostas_formulario;

DROP POLICY IF EXISTS "Público vê perguntas cultura" ON perguntas_cultura;
DROP POLICY IF EXISTS "Candidato vê próprias respostas cultura" ON respostas_cultura;
DROP POLICY IF EXISTS "RH vê respostas cultura" ON respostas_cultura;

-- 2. Desabilitar RLS
ALTER TABLE vagas DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidaturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE perguntas_formulario DISABLE ROW LEVEL SECURITY;
ALTER TABLE respostas_formulario DISABLE ROW LEVEL SECURITY;
ALTER TABLE perguntas_cultura DISABLE ROW LEVEL SECURITY;
ALTER TABLE respostas_cultura DISABLE ROW LEVEL SECURITY;

-- 3. Remover Triggers
DROP TRIGGER IF EXISTS update_vagas_updated_at ON vagas;
DROP TRIGGER IF EXISTS update_candidaturas_updated_at ON candidaturas;
DROP TRIGGER IF EXISTS update_perguntas_formulario_updated_at ON perguntas_formulario;
DROP TRIGGER IF EXISTS update_respostas_formulario_updated_at ON respostas_formulario;
DROP TRIGGER IF EXISTS update_perguntas_cultura_updated_at ON perguntas_cultura;
DROP TRIGGER IF EXISTS update_respostas_cultura_updated_at ON respostas_cultura;

-- 4. Remover Functions
DROP FUNCTION IF EXISTS calcular_score_geral CASCADE;
DROP FUNCTION IF EXISTS avancar_etapa CASCADE;
DROP FUNCTION IF EXISTS rejeitar_candidato CASCADE;

-- 5. Remover Tabelas
DROP TABLE IF EXISTS respostas_cultura CASCADE;
DROP TABLE IF EXISTS perguntas_cultura CASCADE;
DROP TABLE IF EXISTS respostas_formulario CASCADE;
DROP TABLE IF EXISTS perguntas_formulario CASCADE;
DROP TABLE IF EXISTS candidaturas CASCADE;

-- 6. Remover campos adicionados em vagas (se quiser manter tabela base)
-- CUIDADO: Isso remove dados!
/*
ALTER TABLE vagas DROP COLUMN IF EXISTS slug;
ALTER TABLE vagas DROP COLUMN IF EXISTS subtitulo;
-- ... (dropar todos os campos adicionados)
*/

-- 7. Remover ENUMs
DROP TYPE IF EXISTS tipo_resposta_pergunta CASCADE;
DROP TYPE IF EXISTS status_candidatura CASCADE;
DROP TYPE IF EXISTS etapa_processo CASCADE;
DROP TYPE IF EXISTS status_vaga CASCADE;

-- 8. Remover Storage Bucket (executar via Dashboard ou API)
-- DELETE FROM storage.buckets WHERE name = 'curriculos';

SELECT 'Rollback PRD-DB-002 completo!' as status;
```

---

**FIM DO PRD-DB-002**

**Versão:** 1.0  
**Status:** 📋 Pronto para Implementação  
**Próxima Revisão:** Após implementação

---

**Documento criado em:** 02 de Novembro de 2025  
**Última atualização:** 02 de Novembro de 2025  
**Autor:** Equipe Beauty Smile  
**Revisor:** Pendente
