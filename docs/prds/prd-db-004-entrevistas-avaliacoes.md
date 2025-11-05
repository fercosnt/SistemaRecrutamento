# PRD-DB-004: Entrevistas e Avaliações

**Versão:** 1.0  
**Data:** 02 de Novembro de 2025  
**Autor:** Equipe Beauty Smile  
**Status:** 🔄 Em Desenvolvimento  
**Prioridade:** 🔴 P0 - Crítica (MVP)  
**Categoria:** Banco de Dados  
**Ferramenta:** DB Expert  
**Dependências:** PRD-DB-001, PRD-DB-002, PRD-DB-003

---

## 1. Introdução/Visão Geral

Este PRD define a estrutura completa de banco de dados para o módulo de **Entrevistas e Avaliações** do sistema Beauty Smile. Este módulo gerencia as etapas finais do processo seletivo:

### Componentes Principais

1. **Entrevistas Online** (Videoconferência)
   - Agendamento com data/hora
   - Links de videochamada (Google Meet, Zoom, Teams)
   - Gravação da entrevista (URL)
   - Transcrição automática (integração N8N + IA)
   - Análise de sentimento e competências
   - Notas do RH durante a entrevista

2. **Entrevistas Presenciais**
   - Agendamento com data/hora/local
   - Checklist de preparação
   - Formulário de avaliação estruturado
   - Notas do RH pós-entrevista
   - Avaliação de múltiplos entrevistadores

3. **Sistema de Avaliações RH**
   - Avaliações estruturadas por competência
   - Escala padronizada (1-5)
   - Comentários obrigatórios
   - Múltiplos avaliadores por candidato
   - Consenso da equipe

4. **Histórico de Ações**
   - Registro completo de todas ações do RH
   - Auditoria de decisões
   - Timeline do candidato
   - Justificativas de aprovação/rejeição

### Problema que Resolve

As entrevistas são etapas críticas do processo seletivo que precisam de:

- Registro estruturado de todas entrevistas (online e presenciais)
- Agendamento com lembretes automáticos
- Armazenamento seguro de gravações
- Transcrições para análise posterior
- Avaliações padronizadas por competência
- Histórico completo de ações para compliance
- Múltiplos avaliadores com consenso
- Análise IA de comunicação e competências

### Contexto Técnico

- **Plataforma:** Supabase (PostgreSQL + Storage)
- **Frontend:** React 18 + Vite (já implementado)
- **Dependências:** Tabelas de candidaturas (PRD-DB-002)
- **Storage:** Gravações de entrevista (MP4/WEBM)
- **Webhooks:** Integração N8N para transcrição e análise IA (PRD-N8N-006)

---

## 2. Objetivos

### Objetivos Principais

1. **Gerenciar entrevistas online** com agendamento, links e gravações
2. **Gerenciar entrevistas presenciais** com local, checklist e avaliações
3. **Armazenar transcrições** de entrevistas online para análise IA
4. **Padronizar avaliações** com competências e escala definida
5. **Registrar histórico completo** de todas ações do RH sobre candidatos
6. **Permitir múltiplos avaliadores** com consenso da equipe
7. **Integrar com N8N** para análise IA de transcrições

### Objetivos Secundários

8. Permitir reagendamento de entrevistas
9. Enviar lembretes automáticos (integração N8N)
10. Calcular score consolidado de todas avaliações
11. Gerar relatório de consenso entre avaliadores
12. Rastrear tempo de resposta do RH em cada etapa

---

## 3. User Stories

### US-001: Como RH
**Como** recrutador  
**Eu quero** agendar uma entrevista online com um candidato  
**Para que** possamos avaliar suas competências em conversa  
**Critério de Aceitação:**
- Consigo escolher data e hora
- Consigo gerar link de videochamada (Google Meet, Zoom, Teams)
- Sistema envia email automático ao candidato (via N8N)
- Consigo adicionar notas/observações sobre o que avaliar
- Sistema registra quem agendou e quando

### US-002: Como RH
**Como** recrutador  
**Eu quero** gravar a entrevista online  
**Para que** eu possa revisar depois e fazer análise IA  
**Critério de Aceitação:**
- Consigo fazer upload da gravação (MP4/WEBM, max 500MB)
- Sistema armazena no Supabase Storage com segurança
- Apenas RH autorizado pode acessar gravações
- Consigo solicitar transcrição automática (webhook N8N)
- Sistema salva transcrição em texto

### US-003: Como RH
**Como** recrutador  
**Eu quero** avaliar o candidato após entrevista online  
**Para que** a decisão seja baseada em critérios objetivos  
**Critério de Aceitação:**
- Vejo formulário de avaliação estruturado
- Avalio competências em escala 1-5
- Adiciono comentários sobre cada competência
- Sistema calcula score médio automaticamente
- Análise IA complementa minha avaliação

### US-004: Como RH
**Como** recrutador  
**Eu quero** agendar entrevista presencial  
**Para que** eu possa conhecer o candidato pessoalmente  
**Critério de Aceitação:**
- Consigo escolher data, hora e local
- Sistema envia email com endereço completo
- Consigo definir checklist de documentos necessários
- Sistema envia lembrete 24h antes (N8N)
- Consigo registrar se candidato compareceu

### US-005: Como RH
**Como** gerente  
**Eu quero** que múltiplos recrutadores avaliem o mesmo candidato  
**Para que** a decisão seja mais precisa  
**Critério de Aceitação:**
- Vários recrutadores podem avaliar
- Cada avaliador preenche formulário independente
- Sistema calcula consenso (média e desvio padrão)
- Consigo ver avaliações de todos
- Sistema identifica divergências (desvio > 1.0)

### US-006: Como RH Admin
**Como** administrador  
**Eu quero** ver histórico completo de ações sobre um candidato  
**Para que** eu possa auditar decisões e processos  
**Critério de Aceitação:**
- Vejo timeline de todas ações (aprovações, rejeições, avanços)
- Cada ação mostra: quem fez, quando, justificativa
- Não posso deletar histórico (imutável)
- Posso filtrar por tipo de ação
- Posso exportar histórico em PDF

### US-007: Como Sistema
**Como** sistema  
**Eu quero** enviar webhook após entrevista online ser concluída  
**Para que** N8N faça transcrição e análise IA  
**Critério de Aceitação:**
- Webhook dispara quando RH marca entrevista como "Concluída"
- Webhook contém: candidato_id, entrevista_id, gravacao_url
- N8N faz transcrição (Whisper API ou similar)
- N8N analisa transcrição com Claude (competências, sentimento)
- Análise IA é salva na tabela entrevistas_online

### US-008: Como Candidato
**Como** candidato  
**Eu quero** receber lembrete da entrevista  
**Para que** eu não esqueça data e hora  
**Critério de Aceitação:**
- Recebo email 24h antes com data, hora e link
- Email contém instruções claras
- Consigo clicar no link e entrar diretamente

---

## 4. Requisitos Funcionais

### 4.1 Tabelas Principais - Entrevistas Online

#### RF-001: Tabela `entrevistas_online`

O sistema **DEVE** criar uma tabela para entrevistas online:

**Campos de Identificação:**
- `id` (UUID, PK) - Identificador único da entrevista
- `candidatura_id` (UUID, FK → candidaturas.id, NOT NULL) - Candidatura

**Agendamento:**
- `data_agendada` (TIMESTAMPTZ, NOT NULL) - Data e hora agendadas
- `duracao_estimada_minutos` (INTEGER, DEFAULT 60) - Duração prevista
- `link_videochamada` (TEXT, NOT NULL) - URL da videochamada (Meet, Zoom, Teams)
- `plataforma` (TEXT, NULL) - 'google_meet', 'zoom', 'teams', 'outro'

**Status:**
- `status` (ENUM, NOT NULL, DEFAULT 'agendada') - Status da entrevista
- `data_inicio_real` (TIMESTAMPTZ, NULL) - Quando realmente começou
- `data_fim_real` (TIMESTAMPTZ, NULL) - Quando realmente terminou
- `duracao_real_minutos` (INTEGER, NULL) - Duração real calculada

**Gravação e Transcrição:**
- `gravacao_url` (TEXT, NULL) - URL da gravação no Supabase Storage
- `gravacao_tamanho_mb` (DECIMAL(10,2), NULL) - Tamanho do arquivo
- `transcricao` (TEXT, NULL) - Transcrição completa (gerada por IA)
- `resumo_ia` (TEXT, NULL) - Resumo gerado por IA
- `analise_ia` (JSONB, NULL) - Análise completa da IA

**Estrutura JSONB `analise_ia`:**
```json
{
  "competencias": {
    "comunicacao": {
      "score": 4.5,
      "observacoes": "Candidato se expressa claramente..."
    },
    "conhecimento_tecnico": {
      "score": 4.0,
      "observacoes": "Demonstrou conhecimento sólido em..."
    },
    "resolucao_problemas": {
      "score": 4.2,
      "observacoes": "Abordou problemas de forma estruturada..."
    }
  },
  "sentimento_geral": "positivo",
  "palavras_chave": ["proativo", "analítico", "colaborativo"],
  "red_flags": [],
  "recomendacao": "aprovar",
  "confianca": 0.85
}
```

**Notas e Observações:**
- `notas_preparacao` (TEXT, NULL) - Notas ANTES da entrevista (o que avaliar)
- `notas_durante` (TEXT, NULL) - Notas DURANTE a entrevista
- `observacoes_gerais` (TEXT, NULL) - Observações finais do RH

**Feedback:**
- `feedback_candidato` (TEXT, NULL) - Feedback do candidato sobre a entrevista (opcional)
- `avaliacao_candidato_score` (INTEGER, NULL) - Candidato avalia experiência (1-5)

**Campos de Auditoria:**
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted_at` (TIMESTAMPTZ, NULL)
- `agendado_por` (UUID, FK → usuarios_rh.id, NOT NULL) - Quem agendou
- `realizado_por` (UUID, FK → usuarios_rh.id, NULL) - Quem conduziu

**Constraints:**
- data_agendada deve ser futura (no momento do agendamento)
- duracao_estimada_minutos >= 15 e <= 180 (3 horas)
- Se status = 'concluida', data_fim_real deve ser preenchida
- plataforma IN ('google_meet', 'zoom', 'teams', 'outro')

**Índices:**
- Index em `candidatura_id`
- Index em `status`
- Index em `data_agendada` (ordenar por data)
- Index em `agendado_por`
- Index em `deleted_at`

---

#### RF-002: Enum `status_entrevista`

```sql
CREATE TYPE status_entrevista AS ENUM (
  'agendada',        -- Entrevista agendada, aguardando
  'em_andamento',    -- Entrevista acontecendo agora
  'concluida',       -- Entrevista finalizada
  'cancelada',       -- Entrevista cancelada
  'reagendada',      -- Entrevista foi reagendada
  'nao_compareceu'   -- Candidato não compareceu
);
```

---

### 4.2 Tabelas Principais - Entrevistas Presenciais

#### RF-003: Tabela `entrevistas_presenciais`

O sistema **DEVE** criar uma tabela para entrevistas presenciais:

**Campos de Identificação:**
- `id` (UUID, PK)
- `candidatura_id` (UUID, FK → candidaturas.id, NOT NULL)

**Agendamento:**
- `data_agendada` (TIMESTAMPTZ, NOT NULL)
- `duracao_estimada_minutos` (INTEGER, DEFAULT 60)
- `local_entrevista` (TEXT, NOT NULL) - Endereço completo
- `sala_numero` (TEXT, NULL) - Número da sala, se aplicável
- `instrucoes_acesso` (TEXT, NULL) - Como chegar, onde estacionar, etc.

**Status:**
- `status` (ENUM, NOT NULL, DEFAULT 'agendada') - Usa mesmo enum status_entrevista
- `data_inicio_real` (TIMESTAMPTZ, NULL)
- `data_fim_real` (TIMESTAMPTZ, NULL)
- `duracao_real_minutos` (INTEGER, NULL)

**Checklist:**
- `documentos_necessarios` (JSONB, NULL) - Lista de documentos
- `documentos_apresentados` (JSONB, NULL) - Quais foram apresentados

**Estrutura JSONB `documentos_necessarios`:**
```json
[
  {
    "nome": "RG",
    "obrigatorio": true,
    "apresentado": true
  },
  {
    "nome": "CPF",
    "obrigatorio": true,
    "apresentado": true
  },
  {
    "nome": "Comprovante de Residência",
    "obrigatorio": false,
    "apresentado": false
  }
]
```

**Notas e Observações:**
- `notas_preparacao` (TEXT, NULL)
- `notas_durante` (TEXT, NULL)
- `observacoes_gerais` (TEXT, NULL)
- `primeira_impressao` (TEXT, NULL) - Impressão inicial sobre apresentação, pontualidade

**Campos de Auditoria:**
- `created_at`, `updated_at`, `deleted_at`
- `agendado_por` (UUID, FK → usuarios_rh.id, NOT NULL)
- `realizado_por` (UUID, FK → usuarios_rh.id, NULL)

**Constraints:**
- Similar a entrevistas_online
- local_entrevista NOT NULL

**Índices:**
- Similar a entrevistas_online

---

### 4.3 Tabelas Principais - Avaliações

#### RF-004: Tabela `avaliacoes_rh`

O sistema **DEVE** criar uma tabela para avaliações estruturadas:

**Campos de Identificação:**
- `id` (UUID, PK)
- `candidatura_id` (UUID, FK → candidaturas.id, NOT NULL)
- `tipo_entrevista` (ENUM, NOT NULL) - 'online' ou 'presencial'
- `entrevista_id` (UUID, NOT NULL) - ID da entrevista (online ou presencial)
- `avaliador_id` (UUID, FK → usuarios_rh.id, NOT NULL) - Quem avaliou

**Avaliações por Competência:**
- `competencias` (JSONB, NOT NULL) - Avaliações estruturadas

**Estrutura JSONB `competencias`:**
```json
{
  "comunicacao": {
    "score": 4,
    "comentario": "Excelente comunicação verbal e escrita"
  },
  "conhecimento_tecnico": {
    "score": 3,
    "comentario": "Conhecimento adequado, precisa aprofundar em X"
  },
  "trabalho_equipe": {
    "score": 5,
    "comentario": "Muito colaborativo, ótima energia"
  },
  "resolucao_problemas": {
    "score": 4,
    "comentario": "Abordagem estruturada e lógica"
  },
  "fit_cultural": {
    "score": 5,
    "comentario": "Alinhado com nossos valores"
  },
  "motivacao": {
    "score": 4,
    "comentario": "Demonstrou interesse genuíno na vaga"
  },
  "potencial_crescimento": {
    "score": 4,
    "comentario": "Alto potencial de desenvolvimento"
  }
}
```

**Escala:**
- 1 = Muito Abaixo do Esperado
- 2 = Abaixo do Esperado
- 3 = Atende o Esperado
- 4 = Acima do Esperado
- 5 = Muito Acima do Esperado

**Score Consolidado:**
- `score_geral` (DECIMAL(3,2), NOT NULL) - Média de todas competências (1-5)
- `recomendacao` (ENUM, NOT NULL) - 'aprovar', 'rejeitar', 'indeciso'
- `justificativa` (TEXT, NOT NULL) - Justificativa da recomendação (obrigatório)

**Pontos Fortes e Fracos:**
- `pontos_fortes` (TEXT[], NULL) - Array de pontos fortes
- `pontos_fracos` (TEXT[], NULL) - Array de pontos de melhoria

**Campos de Auditoria:**
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted_at` (TIMESTAMPTZ, NULL)

**Constraints:**
- Combinação (candidatura_id, tipo_entrevista, entrevista_id, avaliador_id) UNIQUE
  - Garante que cada avaliador avalia apenas 1x por entrevista
- score_geral >= 1.0 e <= 5.0
- tipo_entrevista IN ('online', 'presencial')
- recomendacao IN ('aprovar', 'rejeitar', 'indeciso')

**Índices:**
- Index em `candidatura_id`
- Index em `avaliador_id`
- Index em `recomendacao`
- Index em `deleted_at`

---

#### RF-005: Enum `tipo_entrevista_avaliacao`

```sql
CREATE TYPE tipo_entrevista_avaliacao AS ENUM (
  'online',
  'presencial'
);
```

---

#### RF-006: Enum `recomendacao_avaliacao`

```sql
CREATE TYPE recomendacao_avaliacao AS ENUM (
  'aprovar',
  'rejeitar',
  'indeciso'
);
```

---

### 4.4 Tabelas Principais - Histórico de Ações

#### RF-007: Tabela `historico_acoes`

O sistema **DEVE** criar uma tabela para histórico completo:

**Campos de Identificação:**
- `id` (UUID, PK)
- `candidatura_id` (UUID, FK → candidaturas.id, NOT NULL)
- `usuario_rh_id` (UUID, FK → usuarios_rh.id, NOT NULL) - Quem fez a ação

**Ação:**
- `tipo_acao` (ENUM, NOT NULL) - Tipo da ação
- `descricao` (TEXT, NOT NULL) - Descrição detalhada da ação
- `justificativa` (TEXT, NULL) - Justificativa (obrigatória para algumas ações)

**Contexto:**
- `etapa_anterior` (etapa_processo, NULL) - Etapa antes da ação
- `etapa_nova` (etapa_processo, NULL) - Etapa depois da ação
- `dados_adicionais` (JSONB, NULL) - Dados contextuais

**Exemplo JSONB `dados_adicionais`:**
```json
{
  "score_antigo": 75.5,
  "score_novo": 82.0,
  "motivo": "Atualização após entrevista presencial",
  "entrevista_id": "uuid-da-entrevista"
}
```

**Timestamps:**
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Quando a ação foi feita

**Constraints:**
- Registro é IMUTÁVEL (sem updated_at, sem deleted_at)
- tipo_acao deve ser um dos valores do enum
- Para ações críticas (aprovar_final, rejeitar), justificativa é obrigatória

**Índices:**
- Index em `candidatura_id` (buscar timeline de um candidato)
- Index em `usuario_rh_id` (auditoria por usuário)
- Index em `tipo_acao` (filtrar por tipo)
- Index em `created_at` (ordenar timeline)

---

#### RF-008: Enum `tipo_acao_historico`

```sql
CREATE TYPE tipo_acao_historico AS ENUM (
  'candidatura_criada',
  'formulario_enviado',
  'bigfive_concluido',
  'disc_concluido',
  'raven_concluido',
  'cultura_concluido',
  'entrevista_online_agendada',
  'entrevista_online_realizada',
  'entrevista_online_cancelada',
  'entrevista_presencial_agendada',
  'entrevista_presencial_realizada',
  'entrevista_presencial_cancelada',
  'avaliacao_adicionada',
  'avancou_etapa',
  'rejeitado',
  'aprovado_final',
  'nota_adicionada',
  'score_atualizado',
  'observacao_adicionada',
  'candidatura_arquivada',
  'candidatura_reativada'
);
```

---

### 4.5 Supabase Storage

#### RF-009: Bucket para Gravações de Entrevista

O sistema **DEVE** criar um bucket `gravacoes-entrevistas`:

**Configurações:**
- **Nome:** `gravacoes-entrevistas`
- **Público:** NÃO (privado com RLS)
- **Tamanho máximo:** 500 MB por arquivo
- **Formatos aceitos:** MP4, WEBM, MOV
- **Estrutura:** `{candidato_id}/{entrevista_id}/gravacao.{ext}`

**Exemplo:**
```
gravacoes-entrevistas/
  ├── candidato-uuid-123/
  │   ├── entrevista-uuid-456/
  │   │   └── gravacao.mp4
  │   ├── entrevista-uuid-789/
  │       └── gravacao.webm
```

**RLS Policies:**
1. **Upload:** Apenas RH pode fazer upload
2. **Leitura:** 
   - RH pode ler todas gravações
   - Candidato NÃO pode acessar gravações (privacidade)
3. **Atualização:** Apenas Admin pode sobrescrever
4. **Deleção:** Apenas Admin pode deletar

---

### 4.6 Functions

#### RF-010: Function `agendar_entrevista_online()`

```sql
CREATE OR REPLACE FUNCTION agendar_entrevista_online(
  candidatura_uuid UUID,
  data_hora TIMESTAMPTZ,
  duracao_minutos INTEGER,
  link_video TEXT,
  plataforma_video TEXT,
  notas TEXT,
  usuario_rh_uuid UUID
)
RETURNS UUID AS $$
DECLARE
  entrevista_id UUID;
BEGIN
  -- Validar que data é futura
  IF data_hora <= NOW() THEN
    RAISE EXCEPTION 'Data da entrevista deve ser futura';
  END IF;
  
  -- Inserir entrevista
  INSERT INTO entrevistas_online (
    candidatura_id,
    data_agendada,
    duracao_estimada_minutos,
    link_videochamada,
    plataforma,
    notas_preparacao,
    status,
    agendado_por
  ) VALUES (
    candidatura_uuid,
    data_hora,
    duracao_minutos,
    link_video,
    plataforma_video,
    notas,
    'agendada',
    usuario_rh_uuid
  )
  RETURNING id INTO entrevista_id;
  
  -- Registrar no histórico
  INSERT INTO historico_acoes (
    candidatura_id,
    usuario_rh_id,
    tipo_acao,
    descricao,
    dados_adicionais
  ) VALUES (
    candidatura_uuid,
    usuario_rh_uuid,
    'entrevista_online_agendada',
    format('Entrevista online agendada para %s', data_hora::DATE),
    jsonb_build_object(
      'entrevista_id', entrevista_id,
      'data_agendada', data_hora,
      'plataforma', plataforma_video
    )
  );
  
  -- TODO: Disparar webhook N8N para enviar email ao candidato
  
  RETURN entrevista_id;
END;
$$ LANGUAGE plpgsql;
```

---

#### RF-011: Function `agendar_entrevista_presencial()`

Similar à função acima, mas para entrevistas presenciais:

```sql
CREATE OR REPLACE FUNCTION agendar_entrevista_presencial(
  candidatura_uuid UUID,
  data_hora TIMESTAMPTZ,
  duracao_minutos INTEGER,
  local TEXT,
  sala TEXT,
  instrucoes TEXT,
  docs_necessarios JSONB,
  usuario_rh_uuid UUID
)
RETURNS UUID AS $$
DECLARE
  entrevista_id UUID;
BEGIN
  -- Validar que data é futura
  IF data_hora <= NOW() THEN
    RAISE EXCEPTION 'Data da entrevista deve ser futura';
  END IF;
  
  -- Inserir entrevista
  INSERT INTO entrevistas_presenciais (
    candidatura_id,
    data_agendada,
    duracao_estimada_minutos,
    local_entrevista,
    sala_numero,
    instrucoes_acesso,
    documentos_necessarios,
    status,
    agendado_por
  ) VALUES (
    candidatura_uuid,
    data_hora,
    duracao_minutos,
    local,
    sala,
    instrucoes,
    docs_necessarios,
    'agendada',
    usuario_rh_uuid
  )
  RETURNING id INTO entrevista_id;
  
  -- Registrar no histórico
  INSERT INTO historico_acoes (
    candidatura_id,
    usuario_rh_id,
    tipo_acao,
    descricao,
    dados_adicionais
  ) VALUES (
    candidatura_uuid,
    usuario_rh_uuid,
    'entrevista_presencial_agendada',
    format('Entrevista presencial agendada para %s em %s', data_hora::DATE, local),
    jsonb_build_object(
      'entrevista_id', entrevista_id,
      'data_agendada', data_hora,
      'local', local
    )
  );
  
  -- TODO: Disparar webhook N8N para enviar email ao candidato
  
  RETURN entrevista_id;
END;
$$ LANGUAGE plpgsql;
```

---

#### RF-012: Function `calcular_consenso_avaliacoes()`

```sql
CREATE OR REPLACE FUNCTION calcular_consenso_avaliacoes(candidatura_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  avaliacoes_array JSONB;
  score_medio DECIMAL(3,2);
  desvio_padrao DECIMAL(3,2);
  total_avaliacoes INTEGER;
  aprovam INTEGER;
  rejeitam INTEGER;
  indecisos INTEGER;
  consenso TEXT;
  resultado JSONB;
BEGIN
  -- Contar avaliações
  SELECT COUNT(*) INTO total_avaliacoes
  FROM avaliacoes_rh
  WHERE candidatura_id = candidatura_uuid
    AND deleted_at IS NULL;
  
  -- Se não há avaliações, retornar null
  IF total_avaliacoes = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Calcular score médio
  SELECT AVG(score_geral) INTO score_medio
  FROM avaliacoes_rh
  WHERE candidatura_id = candidatura_uuid
    AND deleted_at IS NULL;
  
  -- Calcular desvio padrão
  SELECT STDDEV(score_geral) INTO desvio_padrao
  FROM avaliacoes_rh
  WHERE candidatura_id = candidatura_uuid
    AND deleted_at IS NULL;
  
  -- Contar recomendações
  SELECT 
    COUNT(*) FILTER (WHERE recomendacao = 'aprovar'),
    COUNT(*) FILTER (WHERE recomendacao = 'rejeitar'),
    COUNT(*) FILTER (WHERE recomendacao = 'indeciso')
  INTO aprovam, rejeitam, indecisos
  FROM avaliacoes_rh
  WHERE candidatura_id = candidatura_uuid
    AND deleted_at IS NULL;
  
  -- Determinar consenso
  IF aprovam >= (total_avaliacoes * 0.7) THEN
    consenso := 'forte_aprovacao';
  ELSIF rejeitam >= (total_avaliacoes * 0.7) THEN
    consenso := 'forte_rejeicao';
  ELSIF aprovam > rejeitam THEN
    consenso := 'aprovacao_moderada';
  ELSIF rejeitam > aprovam THEN
    consenso := 'rejeicao_moderada';
  ELSE
    consenso := 'sem_consenso';
  END IF;
  
  -- Construir resultado
  resultado := jsonb_build_object(
    'total_avaliacoes', total_avaliacoes,
    'score_medio', score_medio,
    'desvio_padrao', COALESCE(desvio_padrao, 0),
    'aprovam', aprovam,
    'rejeitam', rejeitam,
    'indecisos', indecisos,
    'consenso', consenso,
    'divergencia_alta', (COALESCE(desvio_padrao, 0) > 1.0)
  );
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql;
```

---

#### RF-013: Function `concluir_entrevista_online()`

```sql
CREATE OR REPLACE FUNCTION concluir_entrevista_online(
  entrevista_uuid UUID,
  usuario_rh_uuid UUID,
  observacoes_finais TEXT
)
RETURNS VOID AS $$
DECLARE
  candidatura_uuid UUID;
  data_inicio TIMESTAMPTZ;
  data_fim TIMESTAMPTZ;
  duracao INTEGER;
BEGIN
  -- Buscar dados da entrevista
  SELECT 
    candidatura_id,
    data_inicio_real,
    NOW()
  INTO 
    candidatura_uuid,
    data_inicio,
    data_fim
  FROM entrevistas_online
  WHERE id = entrevista_uuid;
  
  -- Calcular duração real
  IF data_inicio IS NOT NULL THEN
    duracao := EXTRACT(EPOCH FROM (data_fim - data_inicio)) / 60;
  END IF;
  
  -- Atualizar entrevista
  UPDATE entrevistas_online
  SET 
    status = 'concluida',
    data_fim_real = data_fim,
    duracao_real_minutos = duracao,
    observacoes_gerais = observacoes_finais,
    realizado_por = usuario_rh_uuid,
    updated_at = NOW()
  WHERE id = entrevista_uuid;
  
  -- Registrar no histórico
  INSERT INTO historico_acoes (
    candidatura_id,
    usuario_rh_id,
    tipo_acao,
    descricao,
    dados_adicionais
  ) VALUES (
    candidatura_uuid,
    usuario_rh_uuid,
    'entrevista_online_realizada',
    'Entrevista online concluída',
    jsonb_build_object(
      'entrevista_id', entrevista_uuid,
      'duracao_minutos', duracao
    )
  );
  
  -- TODO: Disparar webhook N8N para transcrição e análise IA
END;
$$ LANGUAGE plpgsql;
```

---

### 4.7 Triggers

#### RF-014: Trigger para Atualizar `updated_at`

Usar a mesma function `update_updated_at_column()` criada no PRD-DB-001.

Aplicar trigger em:
- `entrevistas_online`
- `entrevistas_presenciais`
- `avaliacoes_rh`

**Nota:** `historico_acoes` NÃO tem updated_at (é imutável).

---

#### RF-015: Trigger para Registrar Ação de Avaliação

```sql
CREATE OR REPLACE FUNCTION trigger_registrar_avaliacao()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar no histórico quando avaliação é criada
  INSERT INTO historico_acoes (
    candidatura_id,
    usuario_rh_id,
    tipo_acao,
    descricao,
    dados_adicionais
  ) VALUES (
    NEW.candidatura_id,
    NEW.avaliador_id,
    'avaliacao_adicionada',
    format('Avaliação adicionada: %s', NEW.recomendacao),
    jsonb_build_object(
      'avaliacao_id', NEW.id,
      'score_geral', NEW.score_geral,
      'recomendacao', NEW.recomendacao,
      'tipo_entrevista', NEW.tipo_entrevista
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_insert_avaliacao
  AFTER INSERT ON avaliacoes_rh
  FOR EACH ROW
  EXECUTE FUNCTION trigger_registrar_avaliacao();
```

---

### 4.8 Row Level Security (RLS)

#### RF-016: RLS para Tabela `entrevistas_online`

```sql
ALTER TABLE entrevistas_online ENABLE ROW LEVEL SECURITY;

-- RH vê todas entrevistas
CREATE POLICY "RH vê entrevistas online"
ON entrevistas_online FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() AND ativo = TRUE
  )
);

-- Apenas RH pode criar entrevistas
CREATE POLICY "RH cria entrevistas online"
ON entrevistas_online FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() AND ativo = TRUE
  )
);

-- RH pode atualizar entrevistas
CREATE POLICY "RH atualiza entrevistas online"
ON entrevistas_online FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() AND ativo = TRUE
  )
);

-- Candidato pode ver apenas suas entrevistas (sem gravação/transcrição)
CREATE POLICY "Candidato vê próprias entrevistas"
ON entrevistas_online FOR SELECT
TO authenticated
USING (
  candidatura_id IN (
    SELECT id FROM candidaturas
    WHERE candidato_id IN (
      SELECT id FROM candidatos WHERE user_id = auth.uid()
    )
  )
);
```

---

#### RF-017: RLS para Tabela `entrevistas_presenciais`

Similar a entrevistas_online.

---

#### RF-018: RLS para Tabela `avaliacoes_rh`

```sql
ALTER TABLE avaliacoes_rh ENABLE ROW LEVEL SECURITY;

-- RH vê todas avaliações
CREATE POLICY "RH vê avaliações"
ON avaliacoes_rh FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() AND ativo = TRUE
  )
);

-- RH pode criar avaliações
CREATE POLICY "RH cria avaliações"
ON avaliacoes_rh FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() AND ativo = TRUE
  )
);

-- RH pode atualizar apenas próprias avaliações
CREATE POLICY "RH atualiza próprias avaliações"
ON avaliacoes_rh FOR UPDATE
TO authenticated
USING (
  avaliador_id IN (
    SELECT id FROM usuarios_rh WHERE user_id = auth.uid()
  )
);

-- Candidato NÃO pode ver avaliações (confidencial)
```

---

#### RF-019: RLS para Tabela `historico_acoes`

```sql
ALTER TABLE historico_acoes ENABLE ROW LEVEL SECURITY;

-- RH vê todo histórico
CREATE POLICY "RH vê histórico"
ON historico_acoes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() AND ativo = TRUE
  )
);

-- Sistema pode inserir (via functions)
CREATE POLICY "Sistema insere histórico"
ON historico_acoes FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ninguém pode atualizar ou deletar (imutável)
```

---

### 4.9 Validações e Constraints

#### RF-020: Validação de Data Futura

```sql
ALTER TABLE entrevistas_online
ADD CONSTRAINT data_entrevista_futura_check
CHECK (data_agendada > created_at);

ALTER TABLE entrevistas_presenciais
ADD CONSTRAINT data_entrevista_futura_check
CHECK (data_agendada > created_at);
```

---

#### RF-021: Validação de Duração

```sql
ALTER TABLE entrevistas_online
ADD CONSTRAINT duracao_valida_check
CHECK (duracao_estimada_minutos >= 15 AND duracao_estimada_minutos <= 180);

ALTER TABLE entrevistas_presenciais
ADD CONSTRAINT duracao_valida_check
CHECK (duracao_estimada_minutos >= 15 AND duracao_estimada_minutos <= 180);
```

---

#### RF-022: Validação de Score de Avaliação

```sql
ALTER TABLE avaliacoes_rh
ADD CONSTRAINT score_geral_range_check
CHECK (score_geral >= 1.0 AND score_geral <= 5.0);
```

---

## 5. Non-Goals (Fora do Escopo)

### O que NÃO está incluído neste PRD:

❌ **Integração direta com Google Calendar/Outlook** - Apenas agendamento manual  
❌ **Sistema de videoconferência embutido** - Usar links externos (Meet, Zoom)  
❌ **Transcrição em tempo real** - Apenas pós-processamento via N8N  
❌ **Tradução de transcrições** - Apenas português  
❌ **Assinatura digital de documentos** - P3  
❌ **Sistema de feedback 360°** - MVP tem feedback apenas de RH  
❌ **Avaliações de competências customizáveis por vaga** - Competências fixas no MVP  
❌ **Comparação entre candidatos** (ranking) - P2  
❌ **Integração com ATS externos** - Sistema independente  
❌ **Gravação automática de tela/câmera** - Upload manual  
❌ **Detecção de emoções por vídeo** - Apenas análise de texto  

---

## 6. Considerações de Design

### 6.1 Diagrama ER

```
┌────────────────────┐
│   candidaturas     │ (PRD-DB-002)
└──────────┬─────────┘
           │
           │ 1:N
           ├──────────────────────────────┐
           │                              │
           ▼                              ▼
┌──────────────────────────┐   ┌─────────────────────────┐
│  entrevistas_online      │   │ entrevistas_presenciais │
│  ──────────────────────  │   │ ─────────────────────   │
│  • candidatura_id        │   │ • candidatura_id        │
│  • data_agendada         │   │ • data_agendada         │
│  • link_videochamada     │   │ • local_entrevista      │
│  • status                │   │ • status                │
│  • gravacao_url          │   │ • documentos_necessarios│
│  • transcricao           │   │ • notas_preparacao      │
│  • analise_ia (JSONB)    │   └─────────────────────────┘
│  • agendado_por (FK)     │
└────────┬─────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────────┐
│    avaliacoes_rh         │
│  ──────────────────────  │
│  • candidatura_id        │
│  • tipo_entrevista       │
│  • entrevista_id         │
│  • avaliador_id (FK)     │
│  • competencias (JSONB)  │
│  • score_geral           │
│  • recomendacao          │
│  • justificativa         │
│  • pontos_fortes []      │
│  • pontos_fracos []      │
└──────────────────────────┘

┌──────────────────────────┐
│   historico_acoes        │
│  ──────────────────────  │
│  • candidatura_id        │
│  • usuario_rh_id (FK)    │
│  • tipo_acao (ENUM)      │
│  • descricao             │
│  • justificativa         │
│  • etapa_anterior        │
│  • etapa_nova            │
│  • dados_adicionais      │
│  • created_at (IMUTÁVEL) │
└──────────────────────────┘
```

---

### 6.2 Fluxo de Entrevista Online

```
1. RH chama function agendar_entrevista_online()
   - Insere registro em entrevistas_online (status: agendada)
   - Insere registro em historico_acoes
   - Dispara webhook N8N (email ao candidato)
   ↓
2. Candidato recebe email com link e data/hora
   ↓
3. No dia da entrevista:
   - RH marca status como "em_andamento"
   - RH conduz entrevista
   - RH faz anotações no campo "notas_durante"
   ↓
4. Após entrevista:
   - RH faz upload da gravação → Supabase Storage
   - RH chama function concluir_entrevista_online()
   - Status muda para "concluida"
   - Webhook N8N é disparado (transcrição + análise IA)
   ↓
5. N8N processa:
   - Faz download da gravação
   - Envia para Whisper API (transcrição)
   - Salva transcrição no campo "transcricao"
   - Envia transcrição + descrição vaga para Claude API
   - Claude analisa: competências, sentimento, red flags
   - Salva análise no campo "analise_ia" (JSONB)
   ↓
6. RH preenche avaliação estruturada:
   - Acessa formulário de avaliação
   - Avalia competências (1-5)
   - Adiciona comentários
   - Define recomendação (aprovar/rejeitar/indeciso)
   - Sistema registra em avaliacoes_rh
   - Trigger adiciona registro em historico_acoes
   ↓
7. Se múltiplos avaliadores:
   - Cada um preenche avaliação independente
   - Sistema calcula consenso via function
   - RH vê análise de consenso
   ↓
8. RH toma decisão final:
   - Aprova → Avança para próxima etapa
   - Rejeita → Marca candidato como rejeitado
```

---

### 6.3 Fluxo de Entrevista Presencial

Similar ao online, mas:
- Sem gravação/transcrição
- Com checklist de documentos
- Com campo "primeira_impressao"
- Email contém endereço completo + instruções de acesso

---

## 7. Considerações Técnicas

### 7.1 Performance

**Otimizações:**
- Índices em `candidatura_id` (queries frequentes)
- Índices em `data_agendada` (filtrar por data)
- Índices em `status` (filtrar entrevistas ativas)
- JSONB para estruturas flexíveis (análise IA, competências)

**Caching:**
- Entrevistas agendadas podem ser cacheadas (ttl: 5 minutos)
- Histórico é imutável, pode ter cache agressivo
- Avaliações devem sempre estar atualizadas (sem cache)

---

### 7.2 Segurança

**Princípios:**
- Gravações em bucket privado com RLS
- Transcrições visíveis apenas para RH
- Avaliações confidenciais (candidato não vê)
- Histórico é imutável (compliance)
- Soft delete para auditoria

**Upload de Gravações:**
- Validar tipo MIME no backend
- Limitar tamanho (500MB)
- Escanear arquivos com antivírus
- Armazenar hash do arquivo

---

### 7.3 Escalabilidade

**Limites Esperados (Ano 1):**
- Entrevistas online: ~1k (5k candidatos x 20% chegam nessa etapa)
- Entrevistas presenciais: ~500 (10% chegam nessa etapa)
- Avaliações: ~2k (2 avaliadores por entrevista)
- Histórico: ~50k ações (10 ações por candidato)
- Gravações: ~200GB total (200MB x 1k entrevistas)

**Quando Escalar:**
- Se gravações > 1TB, mover para cold storage após 90 dias
- Se histórico > 1M registros, particionar por ano
- Se avaliações > 100k, considerar índices adicionais

---

### 7.4 Webhooks N8N

**Integração para Transcrição e Análise:**

**Payload Exemplo:**
```json
{
  "evento": "entrevista_online_concluida",
  "entrevista_id": "uuid",
  "candidatura_id": "uuid",
  "candidato": {
    "id": "uuid",
    "nome": "João Silva"
  },
  "vaga": {
    "id": "uuid",
    "titulo": "Assistente Odontológico",
    "prompt_ia_descricao": "..."
  },
  "gravacao_url": "https://supabase.co/storage/.../gravacao.mp4",
  "duracao_minutos": 45,
  "notas_rh": "Candidato demonstrou...",
  "timestamp": "2025-11-02T16:30:00Z"
}
```

**N8N Workflow:**
1. Recebe webhook
2. Baixa gravação do Supabase Storage
3. Envia para Whisper API (transcrição)
4. Envia transcrição para Claude API com prompt:
   ```
   Analise esta transcrição de entrevista para a vaga de [titulo].
   
   Descrição da vaga: [prompt_ia_descricao]
   
   Transcrição:
   [transcricao]
   
   Avalie as seguintes competências (1-5):
   - Comunicação
   - Conhecimento técnico
   - Trabalho em equipe
   - Resolução de problemas
   - Fit cultural
   - Motivação
   
   Identifique:
   - Palavras-chave principais
   - Red flags (se houver)
   - Sentimento geral
   - Recomendação (aprovar/rejeitar)
   
   Retorne em JSON.
   ```
5. Atualiza `entrevistas_online` com transcrição e análise_ia

---

## 8. Métricas de Sucesso

### 8.1 Métricas Técnicas

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Tempo de agendamento** | < 2 minutos | Analytics frontend |
| **Taxa de upload gravações** | > 90% | Logs de erro vs total |
| **Tempo de transcrição** | < 10 minutos | Monitoring N8N |
| **Acurácia da transcrição** | > 85% | Revisão manual sample |
| **Taxa de conclusão avaliações** | > 95% | Avaliações preenchidas / Entrevistas |

---

### 8.2 Métricas de Negócio

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Taxa de comparecimento** | > 80% | Concluídas / Agendadas |
| **Tempo médio entrevista online** | 45-60 min | AVG(duracao_real_minutos) |
| **Consenso entre avaliadores** | > 70% | Avaliações com consenso / Total |
| **Tempo de decisão pós-entrevista** | < 3 dias | Diferença entre entrevista e decisão |

---

### 8.3 Queries para Análise

**Taxa de comparecimento:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'concluida') * 100.0 / COUNT(*) as taxa_comparecimento
FROM entrevistas_online
WHERE data_agendada < NOW();
```

**Consenso entre avaliadores:**
```sql
SELECT 
  candidatura_id,
  calcular_consenso_avaliacoes(candidatura_id) as consenso
FROM candidaturas
WHERE id IN (
  SELECT DISTINCT candidatura_id FROM avaliacoes_rh
);
```

**Timeline de um candidato:**
```sql
SELECT 
  tipo_acao,
  descricao,
  usuario_rh_id,
  created_at
FROM historico_acoes
WHERE candidatura_id = 'uuid-do-candidato'
ORDER BY created_at;
```

---

## 9. Questões Em Aberto

### 9.1 Decisões Pendentes

**Q1: Plataforma de Videoconferência Padrão**
- Usar Google Meet (integrado), Zoom, ou livre escolha?
- **Proposta:** Livre escolha no MVP, avaliar integração Google Meet em P2

**Q2: Limites de Reagendamento**
- Quantas vezes candidato pode reagendar?
- **Proposta:** Máximo 2 reagendamentos

**Q3: Retenção de Gravações**
- Por quanto tempo manter gravações?
- **Proposta:** 90 dias após decisão final, depois mover para cold storage ou deletar

**Q4: Múltiplas Entrevistas Online**
- Permitir mais de uma entrevista online por candidato?
- **Proposta:** SIM (pode ter entrevista técnica + entrevista gerencial)

**Q5: Competências Customizáveis**
- RH pode definir competências por vaga?
- **Proposta:** NÃO no MVP (competências fixas), P2 tem biblioteca customizável

---

## 10. Checklist de Implementação

### Fase 1: Estrutura Entrevistas Online
- [ ] Criar enum `status_entrevista`
- [ ] Criar tabela `entrevistas_online`
- [ ] Criar índices necessários
- [ ] Criar constraints de validação
- [ ] Testar agendamento completo

### Fase 2: Estrutura Entrevistas Presenciais
- [ ] Criar tabela `entrevistas_presenciais`
- [ ] Criar índices e constraints
- [ ] Testar agendamento presencial

### Fase 3: Sistema de Avaliações
- [ ] Criar enums `tipo_entrevista_avaliacao`, `recomendacao_avaliacao`
- [ ] Criar tabela `avaliacoes_rh`
- [ ] Criar function `calcular_consenso_avaliacoes()`
- [ ] Criar trigger para registrar avaliação
- [ ] Testar múltiplos avaliadores

### Fase 4: Histórico de Ações
- [ ] Criar enum `tipo_acao_historico`
- [ ] Criar tabela `historico_acoes`
- [ ] Validar imutabilidade (sem update/delete)
- [ ] Testar registro automático via triggers

### Fase 5: Storage de Gravações
- [ ] Criar bucket `gravacoes-entrevistas` no Supabase Storage
- [ ] Configurar limites e formatos aceitos
- [ ] Criar RLS policies para Storage
- [ ] Testar upload de gravação
- [ ] Testar acesso apenas RH

### Fase 6: Functions
- [ ] Criar function `agendar_entrevista_online()`
- [ ] Criar function `agendar_entrevista_presencial()`
- [ ] Criar function `concluir_entrevista_online()`
- [ ] Criar function `calcular_consenso_avaliacoes()`
- [ ] Testar todas functions

### Fase 7: RLS e Segurança
- [ ] Habilitar RLS em todas tabelas
- [ ] Criar policies para entrevistas (online + presencial)
- [ ] Criar policies para avaliações
- [ ] Criar policies para histórico
- [ ] Testar acesso de RH vs candidato

### Fase 8: Triggers
- [ ] Aplicar trigger `updated_at` em tabelas necessárias
- [ ] Criar trigger para registrar avaliação em histórico
- [ ] Testar todos triggers

### Fase 9: Testes Integrados
- [ ] Testar fluxo completo: agendar → realizar → avaliar
- [ ] Testar múltiplos avaliadores
- [ ] Testar consenso
- [ ] Testar histórico de ações
- [ ] Testar upload de gravação

### Fase 10: Seed Data
- [ ] Criar entrevistas de exemplo (online + presencial)
- [ ] Criar avaliações de exemplo
- [ ] Criar histórico de exemplo
- [ ] Validar estrutura completa

---

## 11. Dependências

### Dependências Externas

| Dependência | Descrição | Status |
|-------------|-----------|--------|
| **PRD-DB-001** | Tabelas candidatos, usuarios_rh | ✅ Completo |
| **PRD-DB-002** | Tabela candidaturas | ✅ Completo |
| **Supabase Storage** | Bucket gravações | ⏳ A configurar |
| **N8N Webhook** | Transcrição + Análise IA | ⏳ PRD-N8N-006 |
| **Whisper API** | Transcrição de áudio | ⏳ A configurar |

---

### Dependências Internas

| PRD Dependente | Razão |
|----------------|-------|
| **PRD-N8N-006** | Webhook análise de entrevistas |
| **PRD-N8N-007** | E-mails automáticos (lembretes) |
| **PRD-DEV-023** | Frontend entrevista online |
| **PRD-DEV-024** | Frontend entrevista presencial |

---

## 12. Anexos

### Anexo A: Script SQL Completo de Migração

```sql
-- =====================================================
-- MIGRATION: Estrutura de Entrevistas e Avaliações
-- PRD: PRD-DB-004
-- Data: 02/11/2025
-- Versão: 1.0
-- Dependências: PRD-DB-001, PRD-DB-002, PRD-DB-003
-- =====================================================

-- =====================================================
-- 1. CRIAR ENUMS
-- =====================================================

CREATE TYPE status_entrevista AS ENUM (
  'agendada',
  'em_andamento',
  'concluida',
  'cancelada',
  'reagendada',
  'nao_compareceu'
);

CREATE TYPE tipo_entrevista_avaliacao AS ENUM (
  'online',
  'presencial'
);

CREATE TYPE recomendacao_avaliacao AS ENUM (
  'aprovar',
  'rejeitar',
  'indeciso'
);

CREATE TYPE tipo_acao_historico AS ENUM (
  'candidatura_criada',
  'formulario_enviado',
  'bigfive_concluido',
  'disc_concluido',
  'raven_concluido',
  'cultura_concluido',
  'entrevista_online_agendada',
  'entrevista_online_realizada',
  'entrevista_online_cancelada',
  'entrevista_presencial_agendada',
  'entrevista_presencial_realizada',
  'entrevista_presencial_cancelada',
  'avaliacao_adicionada',
  'avancou_etapa',
  'rejeitado',
  'aprovado_final',
  'nota_adicionada',
  'score_atualizado',
  'observacao_adicionada',
  'candidatura_arquivada',
  'candidatura_reativada'
);

-- =====================================================
-- 2. CRIAR TABELAS - ENTREVISTAS ONLINE
-- =====================================================

CREATE TABLE entrevistas_online (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE NOT NULL,
  
  -- Agendamento
  data_agendada TIMESTAMPTZ NOT NULL,
  duracao_estimada_minutos INTEGER DEFAULT 60 CHECK (duracao_estimada_minutos >= 15 AND duracao_estimada_minutos <= 180),
  link_videochamada TEXT NOT NULL,
  plataforma TEXT NULL CHECK (plataforma IN ('google_meet', 'zoom', 'teams', 'outro')),
  
  -- Status
  status status_entrevista NOT NULL DEFAULT 'agendada',
  data_inicio_real TIMESTAMPTZ NULL,
  data_fim_real TIMESTAMPTZ NULL,
  duracao_real_minutos INTEGER NULL,
  
  -- Gravação e Transcrição
  gravacao_url TEXT NULL,
  gravacao_tamanho_mb DECIMAL(10,2) NULL,
  transcricao TEXT NULL,
  resumo_ia TEXT NULL,
  analise_ia JSONB NULL,
  
  -- Notas
  notas_preparacao TEXT NULL,
  notas_durante TEXT NULL,
  observacoes_gerais TEXT NULL,
  
  -- Feedback
  feedback_candidato TEXT NULL,
  avaliacao_candidato_score INTEGER NULL CHECK (avaliacao_candidato_score >= 1 AND avaliacao_candidato_score <= 5),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  agendado_por UUID REFERENCES usuarios_rh(id) NOT NULL,
  realizado_por UUID REFERENCES usuarios_rh(id) NULL
);

CREATE INDEX idx_entrevistas_online_candidatura ON entrevistas_online(candidatura_id);
CREATE INDEX idx_entrevistas_online_status ON entrevistas_online(status);
CREATE INDEX idx_entrevistas_online_data_agendada ON entrevistas_online(data_agendada);
CREATE INDEX idx_entrevistas_online_agendado_por ON entrevistas_online(agendado_por);
CREATE INDEX idx_entrevistas_online_deleted_at ON entrevistas_online(deleted_at);

COMMENT ON TABLE entrevistas_online IS 'Entrevistas online (videoconferência)';

-- =====================================================
-- 3. CRIAR TABELAS - ENTREVISTAS PRESENCIAIS
-- =====================================================

CREATE TABLE entrevistas_presenciais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE NOT NULL,
  
  -- Agendamento
  data_agendada TIMESTAMPTZ NOT NULL,
  duracao_estimada_minutos INTEGER DEFAULT 60 CHECK (duracao_estimada_minutos >= 15 AND duracao_estimada_minutos <= 180),
  local_entrevista TEXT NOT NULL,
  sala_numero TEXT NULL,
  instrucoes_acesso TEXT NULL,
  
  -- Status
  status status_entrevista NOT NULL DEFAULT 'agendada',
  data_inicio_real TIMESTAMPTZ NULL,
  data_fim_real TIMESTAMPTZ NULL,
  duracao_real_minutos INTEGER NULL,
  
  -- Checklist
  documentos_necessarios JSONB NULL,
  documentos_apresentados JSONB NULL,
  
  -- Notas
  notas_preparacao TEXT NULL,
  notas_durante TEXT NULL,
  observacoes_gerais TEXT NULL,
  primeira_impressao TEXT NULL,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  agendado_por UUID REFERENCES usuarios_rh(id) NOT NULL,
  realizado_por UUID REFERENCES usuarios_rh(id) NULL
);

CREATE INDEX idx_entrevistas_presenciais_candidatura ON entrevistas_presenciais(candidatura_id);
CREATE INDEX idx_entrevistas_presenciais_status ON entrevistas_presenciais(status);
CREATE INDEX idx_entrevistas_presenciais_data_agendada ON entrevistas_presenciais(data_agendada);
CREATE INDEX idx_entrevistas_presenciais_deleted_at ON entrevistas_presenciais(deleted_at);

COMMENT ON TABLE entrevistas_presenciais IS 'Entrevistas presenciais';

-- =====================================================
-- 4. CRIAR TABELAS - AVALIAÇÕES
-- =====================================================

CREATE TABLE avaliacoes_rh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE NOT NULL,
  tipo_entrevista tipo_entrevista_avaliacao NOT NULL,
  entrevista_id UUID NOT NULL,
  avaliador_id UUID REFERENCES usuarios_rh(id) NOT NULL,
  
  -- Avaliações
  competencias JSONB NOT NULL,
  score_geral DECIMAL(3,2) NOT NULL CHECK (score_geral >= 1.0 AND score_geral <= 5.0),
  recomendacao recomendacao_avaliacao NOT NULL,
  justificativa TEXT NOT NULL,
  
  -- Pontos
  pontos_fortes TEXT[] NULL,
  pontos_fracos TEXT[] NULL,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  CONSTRAINT avaliacao_unica UNIQUE (candidatura_id, tipo_entrevista, entrevista_id, avaliador_id)
);

CREATE INDEX idx_avaliacoes_rh_candidatura ON avaliacoes_rh(candidatura_id);
CREATE INDEX idx_avaliacoes_rh_avaliador ON avaliacoes_rh(avaliador_id);
CREATE INDEX idx_avaliacoes_rh_recomendacao ON avaliacoes_rh(recomendacao);
CREATE INDEX idx_avaliacoes_rh_deleted_at ON avaliacoes_rh(deleted_at);

COMMENT ON TABLE avaliacoes_rh IS 'Avaliações estruturadas do RH após entrevistas';

-- =====================================================
-- 5. CRIAR TABELAS - HISTÓRICO DE AÇÕES
-- =====================================================

CREATE TABLE historico_acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE NOT NULL,
  usuario_rh_id UUID REFERENCES usuarios_rh(id) NOT NULL,
  
  -- Ação
  tipo_acao tipo_acao_historico NOT NULL,
  descricao TEXT NOT NULL,
  justificativa TEXT NULL,
  
  -- Contexto
  etapa_anterior etapa_processo NULL,
  etapa_nova etapa_processo NULL,
  dados_adicionais JSONB NULL,
  
  -- Timestamp (IMUTÁVEL - sem updated_at, sem deleted_at)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historico_acoes_candidatura ON historico_acoes(candidatura_id);
CREATE INDEX idx_historico_acoes_usuario ON historico_acoes(usuario_rh_id);
CREATE INDEX idx_historico_acoes_tipo ON historico_acoes(tipo_acao);
CREATE INDEX idx_historico_acoes_created_at ON historico_acoes(created_at);

COMMENT ON TABLE historico_acoes IS 'Histórico imutável de todas ações do RH sobre candidatos';

-- =====================================================
-- 6. CRIAR FUNCTIONS
-- =====================================================

-- Function: Agendar Entrevista Online
-- (Código completo fornecido no RF-010)

-- Function: Agendar Entrevista Presencial
-- (Código completo fornecido no RF-011)

-- Function: Calcular Consenso Avaliações
-- (Código completo fornecido no RF-012)

-- Function: Concluir Entrevista Online
-- (Código completo fornecido no RF-013)

-- =====================================================
-- 7. CRIAR TRIGGERS
-- =====================================================

-- Triggers updated_at
CREATE TRIGGER update_entrevistas_online_updated_at 
  BEFORE UPDATE ON entrevistas_online
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entrevistas_presenciais_updated_at 
  BEFORE UPDATE ON entrevistas_presenciais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_avaliacoes_rh_updated_at 
  BEFORE UPDATE ON avaliacoes_rh
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para registrar avaliação em histórico
-- (Código completo fornecido no RF-015)

-- =====================================================
-- 8. HABILITAR RLS E CRIAR POLICIES
-- =====================================================

-- RLS: entrevistas_online
-- (Código completo fornecido no RF-016)

-- RLS: entrevistas_presenciais
-- (Código completo fornecido no RF-017)

-- RLS: avaliacoes_rh
-- (Código completo fornecido no RF-018)

-- RLS: historico_acoes
-- (Código completo fornecido no RF-019)

-- =====================================================
-- 9. CONFIGURAR STORAGE (Bucket Gravações)
-- =====================================================

-- Criar bucket 'gravacoes-entrevistas' (executar via Dashboard ou Storage API)
-- Configurações:
--   - Name: gravacoes-entrevistas
--   - Public: false
--   - File size limit: 500 MB
--   - Allowed MIME types: video/mp4, video/webm, video/quicktime

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

SELECT 'Migração PRD-DB-004 completa!' as status;
```

---

**FIM DO PRD-DB-004**

**Versão:** 1.0  
**Status:** 📋 Pronto para Implementação  
**Próxima Revisão:** Após implementação

---

**Documento criado em:** 02 de Novembro de 2025  
**Última atualização:** 02 de Novembro de 2025  
**Autor:** Equipe Beauty Smile  
**Revisor:** Pendente
