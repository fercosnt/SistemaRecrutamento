# PRD-DB-003: Estrutura de Testes Psicométricos

**Versão:** 1.0  
**Data:** 02 de Novembro de 2025  
**Autor:** Equipe Beauty Smile  
**Status:** 🔄 Em Desenvolvimento  
**Prioridade:** 🔴 P0 - Crítica (MVP)  
**Categoria:** Banco de Dados  
**Ferramenta:** DB Expert  
**Dependências:** PRD-DB-001, PRD-DB-002

---

## 1. Introdução/Visão Geral

Este PRD define a estrutura completa de banco de dados para os **Testes Psicométricos** do sistema Beauty Smile. O sistema implementa três testes científicos validados:

### Testes Incluídos

1. **Big Five (OCEAN)** - Teste de Personalidade (120 questões)
   - Avalia 5 dimensões: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
   - Escala Likert de 1 a 5
   - Tempo estimado: 15-20 minutos

2. **DISC** - Perfil Comportamental (28 questões)
   - Avalia 4 perfis: Dominância, Influência, Estabilidade, Conformidade
   - Escolha forçada: "Mais" e "Menos" característico
   - Tempo estimado: 8-10 minutos

3. **Raven (Matrizes Progressivas)** - Teste de QI (60 questões)
   - Avalia raciocínio lógico e inteligência fluida
   - Questões visuais de múltipla escolha (8 opções)
   - Tempo estimado: 40 minutos
   - Percentil calculado baseado em gabarito

### Problema que Resolve

Os testes psicométricos são etapas críticas do processo seletivo. Precisamos:

- Armazenar questões e gabaritos dos testes de forma estruturada
- Registrar respostas dos candidatos com timestamp
- Calcular scores automaticamente (Big Five, DISC, Raven)
- Integrar com N8N para análise IA dos resultados
- Controlar tempo de execução de cada teste
- Garantir que candidatos não refaçam testes
- Permitir que RH visualize resultados de forma clara

### Contexto Técnico

- **Plataforma:** Supabase (PostgreSQL + Storage)
- **Frontend:** React 18 + Vite (já implementado)
- **Dependências:** Tabelas de candidaturas (PRD-DB-002)
- **Storage:** Imagens das questões Raven (PNG)
- **Webhooks:** Integração N8N para análise IA (PRD-N8N-002, 003, 004)

---

## 2. Objetivos

### Objetivos Principais

1. **Armazenar questões dos três testes** de forma estruturada e reutilizável
2. **Registrar respostas dos candidatos** com rastreamento de tempo
3. **Calcular scores automaticamente** usando fórmulas científicas validadas
4. **Integrar com análise IA** através de webhooks N8N
5. **Garantir integridade dos testes** (anti-trapaça, questões embaralhadas)
6. **Fornecer dados para visualização** clara dos resultados pelo RH

### Objetivos Secundários

7. Permitir versionamento de testes (atualizar questões sem perder histórico)
8. Rastrear tempo por questão (analytics de comportamento)
9. Armazenar imagens do Raven de forma otimizada
10. Preparar estrutura para futuros testes adicionais

---

## 3. User Stories

### US-001: Como Candidato
**Como** candidato aprovado na triagem  
**Eu quero** fazer o teste Big Five  
**Para que** o RH possa avaliar minha personalidade  
**Critério de Aceitação:**
- Recebo link para instruções do teste
- Vejo 120 questões em ordem aleatória
- Respondo em escala de 1 a 5
- Sistema registra tempo total
- Ao terminar, sou redirecionado para próxima etapa
- Não consigo refazer o teste

### US-002: Como Candidato
**Como** candidato aprovado no Big Five  
**Eu quero** fazer o teste DISC  
**Para que** o RH conheça meu perfil comportamental  
**Critério de Aceitação:**
- Vejo 28 questões
- Para cada questão, escolho "Mais característico" E "Menos característico"
- Sistema valida que escolhi ambos antes de avançar
- Sistema calcula meu perfil DISC automaticamente
- Vejo página de conclusão

### US-003: Como Candidato
**Como** candidato na etapa de inteligência  
**Eu quero** fazer o teste Raven  
**Para que** o RH avalie meu raciocínio lógico  
**Critério de Aceitação:**
- Vejo 60 questões com imagens de matrizes
- Para cada questão, vejo 8 opções de resposta (também imagens)
- Consigo navegar entre questões
- Sistema registra minhas respostas
- Sistema calcula percentil baseado em gabarito
- Análise IA avalia meu desempenho

### US-004: Como RH
**Como** recrutador  
**Eu quero** visualizar os resultados dos testes psicométricos  
**Para que** eu possa avaliar adequação do candidato à vaga  
**Critério de Aceitação:**
- Acesso perfil do candidato
- Vejo aba "Big Five" com gráfico radar das 5 dimensões
- Vejo aba "DISC" com perfil predominante e gráfico
- Vejo aba "Inteligência (Raven)" com percentil e acertos
- Vejo análise IA de cada teste
- Posso exportar resultados em PDF

### US-005: Como Sistema
**Como** sistema  
**Eu quero** enviar webhook após candidato completar teste  
**Para que** N8N faça análise IA dos resultados  
**Critério de Aceitação:**
- Webhook dispara assim que candidato clica "Finalizar Teste"
- Webhook contém: candidato_id, tipo_teste, respostas, scores, tempo
- N8N processa e retorna análise IA
- Análise IA é salva na candidatura
- Score geral da candidatura é recalculado

### US-006: Como Administrador do Sistema
**Como** admin  
**Eu quero** cadastrar e versionar questões dos testes  
**Para que** eu possa atualizar testes sem perder dados históricos  
**Critério de Aceitação:**
- Consigo criar nova versão de teste
- Questões antigas não são deletadas
- Respostas antigas continuam vinculadas à versão correta
- Novos candidatos usam versão mais recente

---

## 4. Requisitos Funcionais

### 4.1 Tabelas Principais - Big Five

#### RF-001: Tabela `questoes_bigfive`

O sistema **DEVE** criar uma tabela para armazenar questões do Big Five:

**Campos de Identificação:**
- `id` (UUID, PK) - Identificador único da questão
- `numero_questao` (INTEGER, NOT NULL) - Número da questão (1 a 120)
- `versao` (INTEGER, NOT NULL, DEFAULT 1) - Versão do teste

**Conteúdo:**
- `texto_questao` (TEXT, NOT NULL) - Texto da afirmação
- `dimensao` (ENUM, NOT NULL) - 'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'
- `is_invertida` (BOOLEAN, DEFAULT FALSE) - Se TRUE, inverte pontuação (5→1, 4→2, etc.)

**Explicação:**
- Texto: "Sou alguém que gosta de conversar com muitas pessoas"
- Dimensão: extraversion
- is_invertida: FALSE (concordar aumenta extraversion)

- Texto: "Sou alguém que prefere trabalhar sozinho"
- Dimensão: extraversion  
- is_invertida: TRUE (concordar DIMINUI extraversion)

**Campos de Auditoria:**
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted_at` (TIMESTAMPTZ, NULL)
- `created_by` (UUID, FK → usuarios_rh.id)

**Constraints:**
- Combinação (numero_questao, versao) deve ser UNIQUE
- Dimensao deve ser um dos valores do enum
- Numero_questao entre 1 e 120

**Índices:**
- Index em `versao`
- Index em `dimensao`
- Index em `deleted_at`

---

#### RF-002: Tabela `respostas_bigfive`

O sistema **DEVE** criar uma tabela para armazenar respostas:

**Campos:**
- `id` (UUID, PK)
- `candidatura_id` (UUID, FK → candidaturas.id, NOT NULL)
- `questao_id` (UUID, FK → questoes_bigfive.id, NOT NULL)
- `resposta` (INTEGER, NOT NULL) - Escala 1 a 5
- `tempo_resposta_segundos` (INTEGER, NULL) - Tempo para responder esta questão
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Escala de Resposta:**
- 1 = Discordo Totalmente
- 2 = Discordo
- 3 = Neutro
- 4 = Concordo
- 5 = Concordo Totalmente

**Constraints:**
- Combinação (candidatura_id, questao_id) UNIQUE (não pode responder 2x)
- Resposta deve estar entre 1 e 5

**Índices:**
- Index em `candidatura_id`
- Index em `questao_id`

---

#### RF-003: Tabela `scores_bigfive`

O sistema **DEVE** criar uma tabela para armazenar scores calculados:

**Campos:**
- `id` (UUID, PK)
- `candidatura_id` (UUID, FK → candidaturas.id, UNIQUE, NOT NULL)
- `score_openness` (DECIMAL(5,2), NOT NULL) - Score 0-100
- `score_conscientiousness` (DECIMAL(5,2), NOT NULL)
- `score_extraversion` (DECIMAL(5,2), NOT NULL)
- `score_agreeableness` (DECIMAL(5,2), NOT NULL)
- `score_neuroticism` (DECIMAL(5,2), NOT NULL)
- `tempo_total_segundos` (INTEGER, NOT NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- Todos scores entre 0 e 100
- Tempo_total >= 0

**Índices:**
- Index em `candidatura_id`

---

### 4.2 Tabelas Principais - DISC

#### RF-004: Tabela `questoes_disc`

O sistema **DEVE** criar uma tabela para questões DISC:

**Campos de Identificação:**
- `id` (UUID, PK)
- `numero_questao` (INTEGER, NOT NULL) - 1 a 28
- `versao` (INTEGER, NOT NULL, DEFAULT 1)

**Conteúdo:**
- `opcoes` (JSONB, NOT NULL) - Array de 4 opções, cada uma com dimensão

**Estrutura do JSONB `opcoes`:**
```json
[
  {
    "texto": "Sou assertivo e direto",
    "dimensao": "D"
  },
  {
    "texto": "Sou entusiasta e sociável",
    "dimensao": "I"
  },
  {
    "texto": "Sou calmo e paciente",
    "dimensao": "S"
  },
  {
    "texto": "Sou preciso e analítico",
    "dimensao": "C"
  }
]
```

**Dimensões DISC:**
- D = Dominância (orientado a resultados, decidido)
- I = Influência (sociável, comunicativo)
- S = Estabilidade (paciente, colaborativo)
- C = Conformidade (analítico, detalhista)

**Campos de Auditoria:**
- `created_at`, `updated_at`, `deleted_at`, `created_by`

**Constraints:**
- Combinação (numero_questao, versao) UNIQUE
- Numero_questao entre 1 e 28

**Índices:**
- Index em `versao`
- Index em `deleted_at`

---

#### RF-005: Tabela `respostas_disc`

O sistema **DEVE** criar uma tabela para respostas DISC:

**Campos:**
- `id` (UUID, PK)
- `candidatura_id` (UUID, FK → candidaturas.id, NOT NULL)
- `questao_id` (UUID, FK → questoes_disc.id, NOT NULL)
- `mais_caracteristico` (TEXT, NOT NULL) - Dimensão escolhida (D, I, S ou C)
- `menos_caracteristico` (TEXT, NOT NULL) - Dimensão escolhida (D, I, S ou C)
- `tempo_resposta_segundos` (INTEGER, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- Combinação (candidatura_id, questao_id) UNIQUE
- mais_caracteristico IN ('D', 'I', 'S', 'C')
- menos_caracteristico IN ('D', 'I', 'S', 'C')
- mais_caracteristico ≠ menos_caracteristico

**Índices:**
- Index em `candidatura_id`

---

#### RF-006: Tabela `scores_disc`

O sistema **DEVE** criar uma tabela para scores DISC:

**Campos:**
- `id` (UUID, PK)
- `candidatura_id` (UUID, FK → candidaturas.id, UNIQUE, NOT NULL)
- `score_d` (INTEGER, NOT NULL) - Contagem de D
- `score_i` (INTEGER, NOT NULL) - Contagem de I
- `score_s` (INTEGER, NOT NULL) - Contagem de S
- `score_c` (INTEGER, NOT NULL) - Contagem de C
- `perfil_primario` (TEXT, NOT NULL) - Perfil predominante (D, I, S ou C)
- `perfil_secundario` (TEXT, NULL) - Segundo perfil mais alto
- `tempo_total_segundos` (INTEGER, NOT NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Cálculo dos Scores:**
```
Para cada questão:
  mais_caracteristico → +2 pontos
  menos_caracteristico → -1 ponto

Perfil predominante = maior score
```

**Constraints:**
- Scores D, I, S, C entre -28 e 56
- perfil_primario IN ('D', 'I', 'S', 'C')

**Índices:**
- Index em `candidatura_id`

---

### 4.3 Tabelas Principais - Raven

#### RF-007: Tabela `questoes_raven`

O sistema **DEVE** criar uma tabela para questões Raven:

**Campos de Identificação:**
- `id` (UUID, PK)
- `numero_questao` (INTEGER, NOT NULL) - 1 a 60
- `versao` (INTEGER, NOT NULL, DEFAULT 1)
- `serie` (TEXT, NOT NULL) - 'A', 'B', 'C', 'D', 'E' (12 questões cada)

**Conteúdo:**
- `imagem_matriz_url` (TEXT, NOT NULL) - URL da imagem da matriz com peça faltando
- `opcoes_imagens` (JSONB, NOT NULL) - Array de 8 URLs das opções

**Estrutura do JSONB `opcoes_imagens`:**
```json
[
  {
    "numero": 1,
    "imagem_url": "https://.../raven/q1_opcao1.png"
  },
  {
    "numero": 2,
    "imagem_url": "https://.../raven/q1_opcao2.png"
  },
  // ... até 8
]
```

**Gabarito:**
- `resposta_correta` (INTEGER, NOT NULL) - Número da opção correta (1 a 8)

**Campos de Auditoria:**
- `created_at`, `updated_at`, `deleted_at`, `created_by`

**Constraints:**
- Combinação (numero_questao, versao) UNIQUE
- Numero_questao entre 1 e 60
- Serie IN ('A', 'B', 'C', 'D', 'E')
- resposta_correta entre 1 e 8

**Índices:**
- Index em `versao`
- Index em `serie`
- Index em `deleted_at`

---

#### RF-008: Tabela `respostas_raven`

O sistema **DEVE** criar uma tabela para respostas Raven:

**Campos:**
- `id` (UUID, PK)
- `candidatura_id` (UUID, FK → candidaturas.id, NOT NULL)
- `questao_id` (UUID, FK → questoes_raven.id, NOT NULL)
- `resposta` (INTEGER, NOT NULL) - Opção escolhida (1 a 8)
- `tempo_resposta_segundos` (INTEGER, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- Combinação (candidatura_id, questao_id) UNIQUE
- Resposta entre 1 e 8

**Índices:**
- Index em `candidatura_id`
- Index em `questao_id`

---

#### RF-009: Tabela `scores_raven`

O sistema **DEVE** criar uma tabela para scores Raven:

**Campos:**
- `id` (UUID, PK)
- `candidatura_id` (UUID, FK → candidaturas.id, UNIQUE, NOT NULL)
- `total_acertos` (INTEGER, NOT NULL) - Número de respostas corretas (0-60)
- `percentual_acerto` (DECIMAL(5,2), NOT NULL) - % de acerto
- `percentil` (INTEGER, NOT NULL) - Percentil baseado em tabela normativa (0-100)
- `classificacao` (TEXT, NOT NULL) - 'Inferior', 'Médio Inferior', 'Médio', 'Médio Superior', 'Superior'
- `acertos_por_serie` (JSONB, NOT NULL) - Acertos em cada série

**Estrutura JSONB `acertos_por_serie`:**
```json
{
  "A": 10,
  "B": 9,
  "C": 7,
  "D": 6,
  "E": 5
}
```

**Tabela de Classificação (Percentil):**
- 90-100: Superior
- 75-89: Médio Superior
- 25-74: Médio
- 10-24: Médio Inferior
- 0-9: Inferior

**Campos:**
- `tempo_total_segundos` (INTEGER, NOT NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints:**
- total_acertos entre 0 e 60
- percentual_acerto entre 0 e 100
- percentil entre 0 e 100

**Índices:**
- Index em `candidatura_id`

---

### 4.4 Enums

#### RF-010: Enum `dimensao_bigfive`

```sql
CREATE TYPE dimensao_bigfive AS ENUM (
  'openness',           -- Abertura a experiências
  'conscientiousness',  -- Conscienciosidade
  'extraversion',       -- Extroversão
  'agreeableness',      -- Amabilidade
  'neuroticism'         -- Neuroticismo
);
```

---

#### RF-011: Enum `dimensao_disc`

```sql
CREATE TYPE dimensao_disc AS ENUM (
  'D',  -- Dominância
  'I',  -- Influência
  'S',  -- Estabilidade
  'C'   -- Conformidade
);
```

---

#### RF-012: Enum `serie_raven`

```sql
CREATE TYPE serie_raven AS ENUM (
  'A',  -- Série A: Completar padrões
  'B',  -- Série B: Analogias
  'C',  -- Série C: Desenvolvimento progressivo
  'D',  -- Série D: Reorganização
  'E'   -- Série E: Análise e síntese
);
```

---

### 4.5 Supabase Storage

#### RF-013: Bucket para Imagens Raven

O sistema **DEVE** criar um bucket `raven-imagens`:

**Configurações:**
- **Nome:** `raven-imagens`
- **Público:** SIM (imagens são públicas)
- **Tamanho máximo:** 500 KB por imagem
- **Formatos:** PNG, WEBP
- **Estrutura:** `versao-{v}/q{numero}/matriz.png` e `versao-{v}/q{numero}/opcao-{n}.png`

**Exemplo:**
```
raven-imagens/
  ├── versao-1/
  │   ├── q1/
  │   │   ├── matriz.png
  │   │   ├── opcao-1.png
  │   │   ├── opcao-2.png
  │   │   └── ... (até opcao-8.png)
  │   ├── q2/
  │   └── ... (até q60)
```

**Otimizações:**
- Imagens otimizadas para web (compressão)
- CDN do Supabase para carregamento rápido
- Cache-Control: max-age=31536000 (1 ano)

---

### 4.6 Functions para Cálculo de Scores

#### RF-014: Function `calcular_scores_bigfive()`

O sistema **DEVE** criar function para calcular Big Five:

```sql
CREATE OR REPLACE FUNCTION calcular_scores_bigfive(candidatura_uuid UUID)
RETURNS VOID AS $$
DECLARE
  dimensoes TEXT[] := ARRAY['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  dimensao TEXT;
  total_questoes INTEGER;
  soma_pontos DECIMAL;
  score_normalizado DECIMAL;
  scores_calc RECORD;
BEGIN
  -- Para cada dimensão, calcular score
  FOR dimensao IN SELECT unnest(dimensoes) LOOP
    
    -- Contar questões desta dimensão
    SELECT COUNT(*) INTO total_questoes
    FROM respostas_bigfive rb
    JOIN questoes_bigfive qb ON rb.questao_id = qb.id
    WHERE rb.candidatura_id = candidatura_uuid
      AND qb.dimensao = dimensao::dimensao_bigfive;
    
    -- Calcular soma de pontos (considerando inversão)
    SELECT SUM(
      CASE 
        WHEN qb.is_invertida THEN (6 - rb.resposta)  -- Inverte: 5→1, 4→2, 3→3, 2→4, 1→5
        ELSE rb.resposta
      END
    ) INTO soma_pontos
    FROM respostas_bigfive rb
    JOIN questoes_bigfive qb ON rb.questao_id = qb.id
    WHERE rb.candidatura_id = candidatura_uuid
      AND qb.dimensao = dimensao::dimensao_bigfive;
    
    -- Normalizar para escala 0-100
    -- Fórmula: ((soma - min_possivel) / (max_possivel - min_possivel)) * 100
    -- Min possível = total_questoes * 1
    -- Max possível = total_questoes * 5
    score_normalizado := ((soma_pontos - total_questoes) / (total_questoes * 4.0)) * 100;
    
    -- Inserir ou atualizar score desta dimensão
    EXECUTE format(
      'INSERT INTO scores_bigfive (candidatura_id, score_%s, tempo_total_segundos, created_at)
       VALUES ($1, $2, 0, NOW())
       ON CONFLICT (candidatura_id) 
       DO UPDATE SET score_%s = $2',
      dimensao, dimensao
    ) USING candidatura_uuid, score_normalizado;
    
  END LOOP;
  
  -- Atualizar tempo total
  UPDATE scores_bigfive
  SET tempo_total_segundos = (
    SELECT EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))
    FROM respostas_bigfive
    WHERE candidatura_id = candidatura_uuid
  )
  WHERE candidatura_id = candidatura_uuid;
  
END;
$$ LANGUAGE plpgsql;
```

---

#### RF-015: Function `calcular_scores_disc()`

```sql
CREATE OR REPLACE FUNCTION calcular_scores_disc(candidatura_uuid UUID)
RETURNS VOID AS $$
DECLARE
  score_d_calc INTEGER := 0;
  score_i_calc INTEGER := 0;
  score_s_calc INTEGER := 0;
  score_c_calc INTEGER := 0;
  perfil_prim TEXT;
  perfil_sec TEXT;
  max_score INTEGER;
  second_max INTEGER;
BEGIN
  -- Calcular scores baseado em "mais característico" (+2) e "menos característico" (-1)
  
  -- Contar D
  SELECT 
    (COUNT(*) FILTER (WHERE mais_caracteristico = 'D') * 2) - 
    (COUNT(*) FILTER (WHERE menos_caracteristico = 'D'))
  INTO score_d_calc
  FROM respostas_disc
  WHERE candidatura_id = candidatura_uuid;
  
  -- Contar I
  SELECT 
    (COUNT(*) FILTER (WHERE mais_caracteristico = 'I') * 2) - 
    (COUNT(*) FILTER (WHERE menos_caracteristico = 'I'))
  INTO score_i_calc
  FROM respostas_disc
  WHERE candidatura_id = candidatura_uuid;
  
  -- Contar S
  SELECT 
    (COUNT(*) FILTER (WHERE mais_caracteristico = 'S') * 2) - 
    (COUNT(*) FILTER (WHERE menos_caracteristico = 'S'))
  INTO score_s_calc
  FROM respostas_disc
  WHERE candidatura_id = candidatura_uuid;
  
  -- Contar C
  SELECT 
    (COUNT(*) FILTER (WHERE mais_caracteristico = 'C') * 2) - 
    (COUNT(*) FILTER (WHERE menos_caracteristico = 'C'))
  INTO score_c_calc
  FROM respostas_disc
  WHERE candidatura_id = candidatura_uuid;
  
  -- Determinar perfil primário (maior score)
  SELECT dimensao INTO perfil_prim
  FROM (
    SELECT 'D' as dimensao, score_d_calc as score
    UNION ALL SELECT 'I', score_i_calc
    UNION ALL SELECT 'S', score_s_calc
    UNION ALL SELECT 'C', score_c_calc
  ) scores
  ORDER BY score DESC
  LIMIT 1;
  
  -- Determinar perfil secundário (segundo maior)
  SELECT dimensao INTO perfil_sec
  FROM (
    SELECT 'D' as dimensao, score_d_calc as score
    UNION ALL SELECT 'I', score_i_calc
    UNION ALL SELECT 'S', score_s_calc
    UNION ALL SELECT 'C', score_c_calc
  ) scores
  WHERE dimensao != perfil_prim
  ORDER BY score DESC
  LIMIT 1;
  
  -- Calcular tempo total
  DECLARE
    tempo_total INTEGER;
  BEGIN
    SELECT EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))
    INTO tempo_total
    FROM respostas_disc
    WHERE candidatura_id = candidatura_uuid;
    
    -- Inserir scores
    INSERT INTO scores_disc (
      candidatura_id,
      score_d,
      score_i,
      score_s,
      score_c,
      perfil_primario,
      perfil_secundario,
      tempo_total_segundos,
      created_at
    ) VALUES (
      candidatura_uuid,
      score_d_calc,
      score_i_calc,
      score_s_calc,
      score_c_calc,
      perfil_prim,
      perfil_sec,
      tempo_total,
      NOW()
    )
    ON CONFLICT (candidatura_id) 
    DO UPDATE SET
      score_d = score_d_calc,
      score_i = score_i_calc,
      score_s = score_s_calc,
      score_c = score_c_calc,
      perfil_primario = perfil_prim,
      perfil_secundario = perfil_sec,
      tempo_total_segundos = tempo_total;
  END;
END;
$$ LANGUAGE plpgsql;
```

---

#### RF-016: Function `calcular_scores_raven()`

```sql
CREATE OR REPLACE FUNCTION calcular_scores_raven(candidatura_uuid UUID)
RETURNS VOID AS $$
DECLARE
  total_acertos_calc INTEGER;
  percentual_calc DECIMAL(5,2);
  percentil_calc INTEGER;
  classificacao_calc TEXT;
  acertos_series JSONB;
BEGIN
  -- Contar acertos totais
  SELECT COUNT(*)
  INTO total_acertos_calc
  FROM respostas_raven rr
  JOIN questoes_raven qr ON rr.questao_id = qr.id
  WHERE rr.candidatura_id = candidatura_uuid
    AND rr.resposta = qr.resposta_correta;
  
  -- Calcular percentual
  percentual_calc := (total_acertos_calc::DECIMAL / 60.0) * 100;
  
  -- Calcular acertos por série
  SELECT jsonb_object_agg(serie, acertos)
  INTO acertos_series
  FROM (
    SELECT 
      qr.serie,
      COUNT(*) FILTER (WHERE rr.resposta = qr.resposta_correta) as acertos
    FROM respostas_raven rr
    JOIN questoes_raven qr ON rr.questao_id = qr.id
    WHERE rr.candidatura_id = candidatura_uuid
    GROUP BY qr.serie
  ) series_scores;
  
  -- Calcular percentil baseado em tabela normativa
  -- Tabela simplificada (em produção, usar tabela completa por idade)
  percentil_calc := CASE
    WHEN total_acertos_calc >= 55 THEN 95
    WHEN total_acertos_calc >= 50 THEN 85
    WHEN total_acertos_calc >= 45 THEN 75
    WHEN total_acertos_calc >= 40 THEN 65
    WHEN total_acertos_calc >= 35 THEN 50
    WHEN total_acertos_calc >= 30 THEN 35
    WHEN total_acertos_calc >= 25 THEN 25
    WHEN total_acertos_calc >= 20 THEN 15
    WHEN total_acertos_calc >= 15 THEN 10
    WHEN total_acertos_calc >= 10 THEN 5
    ELSE 1
  END;
  
  -- Determinar classificação
  classificacao_calc := CASE
    WHEN percentil_calc >= 90 THEN 'Superior'
    WHEN percentil_calc >= 75 THEN 'Médio Superior'
    WHEN percentil_calc >= 25 THEN 'Médio'
    WHEN percentil_calc >= 10 THEN 'Médio Inferior'
    ELSE 'Inferior'
  END;
  
  -- Calcular tempo total
  DECLARE
    tempo_total INTEGER;
  BEGIN
    SELECT EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))
    INTO tempo_total
    FROM respostas_raven
    WHERE candidatura_id = candidatura_uuid;
    
    -- Inserir scores
    INSERT INTO scores_raven (
      candidatura_id,
      total_acertos,
      percentual_acerto,
      percentil,
      classificacao,
      acertos_por_serie,
      tempo_total_segundos,
      created_at
    ) VALUES (
      candidatura_uuid,
      total_acertos_calc,
      percentual_calc,
      percentil_calc,
      classificacao_calc,
      acertos_series,
      tempo_total,
      NOW()
    )
    ON CONFLICT (candidatura_id)
    DO UPDATE SET
      total_acertos = total_acertos_calc,
      percentual_acerto = percentual_calc,
      percentil = percentil_calc,
      classificacao = classificacao_calc,
      acertos_por_serie = acertos_series,
      tempo_total_segundos = tempo_total;
  END;
END;
$$ LANGUAGE plpgsql;
```

---

### 4.7 Triggers

#### RF-017: Trigger para Calcular Scores Automaticamente

O sistema **DEVE** criar triggers que calculam scores após candidato finalizar teste:

```sql
-- Trigger para Big Five
CREATE OR REPLACE FUNCTION trigger_calcular_bigfive()
RETURNS TRIGGER AS $$
DECLARE
  total_respostas INTEGER;
BEGIN
  -- Contar quantas respostas o candidato já deu
  SELECT COUNT(*) INTO total_respostas
  FROM respostas_bigfive
  WHERE candidatura_id = NEW.candidatura_id;
  
  -- Se respondeu todas 120 questões, calcular scores
  IF total_respostas = 120 THEN
    PERFORM calcular_scores_bigfive(NEW.candidatura_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_insert_resposta_bigfive
  AFTER INSERT ON respostas_bigfive
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_bigfive();

-- Trigger para DISC
CREATE OR REPLACE FUNCTION trigger_calcular_disc()
RETURNS TRIGGER AS $$
DECLARE
  total_respostas INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_respostas
  FROM respostas_disc
  WHERE candidatura_id = NEW.candidatura_id;
  
  IF total_respostas = 28 THEN
    PERFORM calcular_scores_disc(NEW.candidatura_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_insert_resposta_disc
  AFTER INSERT ON respostas_disc
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_disc();

-- Trigger para Raven
CREATE OR REPLACE FUNCTION trigger_calcular_raven()
RETURNS TRIGGER AS $$
DECLARE
  total_respostas INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_respostas
  FROM respostas_raven
  WHERE candidatura_id = NEW.candidatura_id;
  
  IF total_respostas = 60 THEN
    PERFORM calcular_scores_raven(NEW.candidatura_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_insert_resposta_raven
  AFTER INSERT ON respostas_raven
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_raven();
```

---

### 4.8 Row Level Security (RLS)

#### RF-018: RLS para Questões (Público)

Questões são visíveis para qualquer usuário autenticado:

```sql
-- Big Five
ALTER TABLE questoes_bigfive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem questões BigFive"
ON questoes_bigfive FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- DISC
ALTER TABLE questoes_disc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem questões DISC"
ON questoes_disc FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- Raven
ALTER TABLE questoes_raven ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem questões Raven"
ON questoes_raven FOR SELECT
TO authenticated
USING (deleted_at IS NULL);
```

---

#### RF-019: RLS para Respostas

Candidato vê apenas suas respostas, RH vê de todos:

```sql
-- Respostas Big Five
ALTER TABLE respostas_bigfive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidato vê próprias respostas BigFive"
ON respostas_bigfive FOR SELECT
TO authenticated
USING (
  candidatura_id IN (
    SELECT id FROM candidaturas
    WHERE candidato_id IN (
      SELECT id FROM candidatos WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "RH vê respostas BigFive"
ON respostas_bigfive FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() AND ativo = TRUE
  )
);

CREATE POLICY "Candidato insere respostas BigFive"
ON respostas_bigfive FOR INSERT
TO authenticated
WITH CHECK (
  candidatura_id IN (
    SELECT id FROM candidaturas
    WHERE candidato_id IN (
      SELECT id FROM candidatos WHERE user_id = auth.uid()
    )
  )
);

-- Mesma lógica para DISC e Raven
-- (omitido por brevidade, mas deve ser implementado)
```

---

#### RF-020: RLS para Scores

Candidato vê seus scores, RH vê de todos:

```sql
-- Scores Big Five
ALTER TABLE scores_bigfive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidato vê próprios scores BigFive"
ON scores_bigfive FOR SELECT
TO authenticated
USING (
  candidatura_id IN (
    SELECT id FROM candidaturas
    WHERE candidato_id IN (
      SELECT id FROM candidatos WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "RH vê scores BigFive"
ON scores_bigfive FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE user_id = auth.uid() AND ativo = TRUE
  )
);

-- Mesma lógica para DISC e Raven
```

---

### 4.9 Validações e Constraints

#### RF-021: Validação de Respostas Big Five

```sql
ALTER TABLE respostas_bigfive
ADD CONSTRAINT resposta_bigfive_range_check
CHECK (resposta >= 1 AND resposta <= 5);
```

---

#### RF-022: Validação de Respostas DISC

```sql
ALTER TABLE respostas_disc
ADD CONSTRAINT resposta_disc_diferentes_check
CHECK (mais_caracteristico != menos_caracteristico);

ALTER TABLE respostas_disc
ADD CONSTRAINT mais_caracteristico_valido_check
CHECK (mais_caracteristico IN ('D', 'I', 'S', 'C'));

ALTER TABLE respostas_disc
ADD CONSTRAINT menos_caracteristico_valido_check
CHECK (menos_caracteristico IN ('D', 'I', 'S', 'C'));
```

---

#### RF-023: Validação de Respostas Raven

```sql
ALTER TABLE respostas_raven
ADD CONSTRAINT resposta_raven_range_check
CHECK (resposta >= 1 AND resposta <= 8);
```

---

## 5. Non-Goals (Fora do Escopo)

### O que NÃO está incluído neste PRD:

❌ **Testes adicionais** (16PF, MBTI, etc.) - Futuro (P3)  
❌ **Testes adaptativos** (dificuldade ajusta baseada em respostas) - Futuro (P3)  
❌ **Banco de questões rotativo** (embaralhar entre candidatos) - MVP usa mesmo conjunto  
❌ **Limite de tempo por questão** - Apenas tempo total é rastreado  
❌ **Replay/Revisão de respostas** - Candidato não pode voltar e alterar  
❌ **Comparação com grupo normativo** - Raven usa tabela estática  
❌ **Geração automática de relatórios PDF** - RH faz manualmente  
❌ **Acessibilidade avançada** (leitores de tela para Raven) - Complexo devido às imagens  
❌ **Modo escuro** - UI padrão  
❌ **Integração com plataformas externas** (Psicologia Viva, etc.)  

---

## 6. Considerações de Design

### 6.1 Diagrama ER

```
┌──────────────────────┐
│   candidaturas       │ (PRD-DB-002)
└──────────┬───────────┘
           │
           │ 1:N
           ├─────────────────────────────┐
           │                             │
           │                             │
    ┌──────▼────────────┐         ┌─────▼────────────┐
    │ respostas_bigfive │         │ scores_bigfive   │
    │ ────────────────  │         │ ───────────────  │
    │ • candidatura_id  │         │ • candidatura_id │
    │ • questao_id      │  ───→   │ • score_O        │
    │ • resposta (1-5)  │  calc   │ • score_C        │
    │ • tempo_resposta  │         │ • score_E        │
    └─────────┬─────────┘         │ • score_A        │
              │                   │ • score_N        │
              │ N:1               └──────────────────┘
              ▼
    ┌───────────────────┐
    │ questoes_bigfive  │
    │ ─────────────────  │
    │ • numero (1-120)  │
    │ • texto_questao   │
    │ • dimensao (OCEAN)│
    │ • is_invertida    │
    │ • versao          │
    └───────────────────┘

    ┌──────────────────┐         ┌────────────────┐
    │ respostas_disc   │         │ scores_disc    │
    │ ────────────────  │         │ ──────────────  │
    │ • candidatura_id │         │ • candidatura_id│
    │ • questao_id     │  ───→   │ • score_D       │
    │ • mais_carac (D) │  calc   │ • score_I       │
    │ • menos_carac (I)│         │ • score_S       │
    └────────┬─────────┘         │ • score_C       │
             │                   │ • perfil_primario│
             │ N:1               └─────────────────┘
             ▼
    ┌──────────────────┐
    │  questoes_disc   │
    │  ──────────────  │
    │  • numero (1-28) │
    │  • opcoes (JSONB)│
    │  • versao        │
    └──────────────────┘

    ┌──────────────────┐         ┌───────────────────┐
    │ respostas_raven  │         │  scores_raven     │
    │ ────────────────  │         │  ───────────────   │
    │ • candidatura_id │         │  • candidatura_id │
    │ • questao_id     │  ───→   │  • total_acertos  │
    │ • resposta (1-8) │  calc   │  • percentil      │
    │ • tempo_resposta │         │  • classificacao  │
    └────────┬─────────┘         │  • acertos_serie  │
             │                   └───────────────────┘
             │ N:1
             ▼
    ┌───────────────────────┐
    │   questoes_raven      │
    │   ─────────────────   │
    │   • numero (1-60)     │
    │   • serie (A-E)       │
    │   • imagem_matriz_url │
    │   • opcoes_imagens    │
    │   • resposta_correta  │
    │   • versao            │
    └───────────────────────┘
```

---

### 6.2 Fluxo de Teste Big Five

```
1. Candidato aprovado em Triagem → etapa_atual = 'bigfive'
   ↓
2. RH clica "Próxima Etapa" → Webhook envia email ao candidato
   ↓
3. Candidato acessa link → InstrucoesBigFivePage
   ↓
4. Clica "Iniciar Teste" → TesteBigFivePage
   ↓
5. Sistema busca 120 questões (versão mais recente)
   ↓
6. Sistema embaralha questões aleatoriamente
   ↓
7. Candidato responde cada questão (escala 1-5)
   - Sistema registra resposta imediatamente
   - Sistema registra tempo_resposta_segundos
   ↓
8. Após responder questão 120:
   - Trigger dispara calcular_scores_bigfive()
   - Scores são calculados e salvos em scores_bigfive
   - Sistema atualiza candidaturas.data_bigfive_enviado
   - Webhook N8N é disparado (PRD-N8N-002)
   ↓
9. N8N recebe webhook:
   - Busca scores calculados
   - Envia para Claude API com prompt específico
   - Claude analisa personalidade vs vaga
   - Retorna análise IA + recomendação
   - Salva em candidaturas.analise_ia_bigfive (JSONB)
   ↓
10. Sistema recalcula score_geral da candidatura
   ↓
11. Candidato redirecionado para ConclusaoTestesPage
```

---

### 6.3 Fluxo de Teste DISC

```
1. Similar ao Big Five, mas:
   - 28 questões
   - Para cada questão, escolhe "Mais" E "Menos" característico
   - Validação: não pode submeter sem escolher ambos
   - Cálculo: mais_caracteristico = +2, menos_caracteristico = -1
   - Perfil predominante = maior score entre D, I, S, C
```

---

### 6.4 Fluxo de Teste Raven

```
1. Similar aos anteriores, mas:
   - 60 questões com imagens
   - Candidato vê matriz com peça faltando
   - Candidato vê 8 opções de resposta (também imagens)
   - Candidato escolhe opção (1 a 8)
   - Sistema compara com gabarito
   - Trigger calcula:
     - Total de acertos
     - Percentual
     - Percentil (baseado em tabela normativa)
     - Classificação (Superior, Médio Superior, etc.)
   - Webhook N8N para análise IA
```

---

## 7. Considerações Técnicas

### 7.1 Performance

**Otimizações:**
- Índices em `candidatura_id` (queries frequentes)
- Índices em `versao` (filtrar questões atuais)
- JSONB para estruturas flexíveis (opcoes_resposta, acertos_por_serie)
- Imagens Raven otimizadas e com CDN

**Caching:**
- Questões podem ser cacheadas (raramente mudam)
- Imagens Raven com cache agressivo (1 ano)
- Scores recalculados apenas quando necessário

**Carregamento de Imagens Raven:**
- Lazy loading (carregar apenas questão atual)
- Prefetch da próxima questão (otimizar UX)
- Fallback se imagem não carregar

---

### 7.2 Segurança

**Anti-Trapaça:**
- ✅ Questões embaralhadas aleatoriamente
- ✅ Candidato não pode refazer teste
- ✅ Constraint UNIQUE impede respostas duplicadas
- ❌ Não detecta múltiplas abas (complexo)
- ❌ Não detecta copy/paste (testes não têm texto pesquisável)

**Privacidade:**
- Respostas individuais visíveis apenas para RH
- Scores visíveis para candidato (transparência)
- Gabaritos do Raven NÃO expostos ao frontend

---

### 7.3 Escalabilidade

**Limites Esperados (Ano 1):**
- Questões Big Five: 120 (fixo)
- Questões DISC: 28 (fixo)
- Questões Raven: 60 (fixo)
- Respostas Big Five: ~600k (5k candidatos)
- Respostas DISC: ~140k (5k candidatos)
- Respostas Raven: ~300k (5k candidatos)
- Imagens Raven: 540 arquivos (~50MB total)

**Quando Escalar:**
- Se respostas > 10M, particionar por ano
- Se imagens > 10GB, considerar CDN externo

---

### 7.4 Webhooks N8N (Integração)

**Payload Big Five Exemplo:**
```json
{
  "evento": "bigfive_completo",
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
  "scores": {
    "openness": 75.5,
    "conscientiousness": 82.0,
    "extraversion": 65.5,
    "agreeableness": 88.0,
    "neuroticism": 45.0
  },
  "tempo_total_segundos": 1020,
  "timestamp": "2025-11-02T15:30:00Z"
}
```

**N8N retorna:**
```json
{
  "score": 85,
  "recomendacao": "aprovar",
  "analise": "Candidato apresenta alta conscienciosidade...",
  "pontos_fortes": ["Organizado", "Responsável"],
  "pontos_atencao": ["Pode ser reservado em situações sociais"]
}
```

---

## 8. Métricas de Sucesso

### 8.1 Métricas Técnicas

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Tempo médio Big Five** | 15-20 min | `AVG(tempo_total_segundos) / 60` |
| **Tempo médio DISC** | 8-10 min | `AVG(tempo_total_segundos) / 60` |
| **Tempo médio Raven** | 35-45 min | `AVG(tempo_total_segundos) / 60` |
| **Taxa de conclusão Big Five** | > 90% | Iniciados vs concluídos |
| **Taxa de conclusão DISC** | > 95% | Iniciados vs concluídos |
| **Taxa de conclusão Raven** | > 85% | Iniciados vs concluídos (mais difícil) |
| **Tempo carregamento imagem Raven** | < 500ms | Monitoring frontend |

---

### 8.2 Métricas de Negócio

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Score médio Big Five** | 50-70 | `AVG((O+C+E+A+N)/5)` |
| **Perfil DISC predominante** | Distribuição equilibrada | `COUNT(*) GROUP BY perfil_primario` |
| **Percentil médio Raven** | 40-60 | `AVG(percentil)` |
| **Correlação scores vs aprovação** | Análise preditiva | Regressão estatística |

---

### 8.3 Queries para Análise

**Distribuição de Scores Big Five:**
```sql
SELECT 
  'Openness' as dimensao,
  AVG(score_openness) as media,
  STDDEV(score_openness) as desvio_padrao,
  MIN(score_openness) as minimo,
  MAX(score_openness) as maximo
FROM scores_bigfive
UNION ALL
SELECT 'Conscientiousness', AVG(score_conscientiousness), STDDEV(score_conscientiousness), MIN(score_conscientiousness), MAX(score_conscientiousness) FROM scores_bigfive
UNION ALL
SELECT 'Extraversion', AVG(score_extraversion), STDDEV(score_extraversion), MIN(score_extraversion), MAX(score_extraversion) FROM scores_bigfive
UNION ALL
SELECT 'Agreeableness', AVG(score_agreeableness), STDDEV(score_agreeableness), MIN(score_agreeableness), MAX(score_agreeableness) FROM scores_bigfive
UNION ALL
SELECT 'Neuroticism', AVG(score_neuroticism), STDDEV(score_neuroticism), MIN(score_neuroticism), MAX(score_neuroticism) FROM scores_bigfive;
```

**Distribuição de Perfis DISC:**
```sql
SELECT 
  perfil_primario,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM scores_disc
GROUP BY perfil_primario
ORDER BY total DESC;
```

**Distribuição de Classificações Raven:**
```sql
SELECT 
  classificacao,
  COUNT(*) as total,
  AVG(percentil) as percentil_medio,
  AVG(tempo_total_segundos / 60.0) as tempo_medio_minutos
FROM scores_raven
GROUP BY classificacao
ORDER BY 
  CASE classificacao
    WHEN 'Superior' THEN 1
    WHEN 'Médio Superior' THEN 2
    WHEN 'Médio' THEN 3
    WHEN 'Médio Inferior' THEN 4
    WHEN 'Inferior' THEN 5
  END;
```

---

## 9. Questões Em Aberto

### 9.1 Decisões Pendentes

**Q1: Ordem das Questões**
- Sempre embaralhar ou manter ordem fixa?
- **Proposta:** Embaralhar Big Five e DISC, manter ordem Raven (dificuldade crescente)

**Q2: Refazer Testes**
- Permitir refazer em caso de problema técnico?
- **Proposta:** Apenas admin pode resetar teste (via function manual)

**Q3: Timeout de Teste**
- Implementar limite de tempo máximo?
- **Proposta:** Não no MVP (apenas rastrear tempo)

**Q4: Versões de Testes**
- Quando criar nova versão (atualizar questões)?
- **Proposta:** Anualmente, ou quando necessário (revisão científica)

**Q5: Imagens Raven - Fonte**
- Usar imagens do teste oficial (licença) ou criar alternativas?
- **Proposta:** Verificar licenciamento antes de produção

---

## 10. Checklist de Implementação

### Fase 1: Estrutura Big Five
- [ ] Criar enum `dimensao_bigfive`
- [ ] Criar tabela `questoes_bigfive`
- [ ] Criar tabela `respostas_bigfive`
- [ ] Criar tabela `scores_bigfive`
- [ ] Criar function `calcular_scores_bigfive()`
- [ ] Criar trigger para cálculo automático
- [ ] Inserir 120 questões (seed data)
- [ ] Testar fluxo completo

### Fase 2: Estrutura DISC
- [ ] Criar enum `dimensao_disc`
- [ ] Criar tabela `questoes_disc`
- [ ] Criar tabela `respostas_disc`
- [ ] Criar tabela `scores_disc`
- [ ] Criar function `calcular_scores_disc()`
- [ ] Criar trigger para cálculo automático
- [ ] Inserir 28 questões (seed data)
- [ ] Testar fluxo completo

### Fase 3: Estrutura Raven
- [ ] Criar enum `serie_raven`
- [ ] Criar tabela `questoes_raven`
- [ ] Criar tabela `respostas_raven`
- [ ] Criar tabela `scores_raven`
- [ ] Criar function `calcular_scores_raven()`
- [ ] Criar trigger para cálculo automático
- [ ] Criar bucket Storage `raven-imagens`
- [ ] Upload de 540 imagens (60 matrizes + 480 opções)
- [ ] Inserir 60 questões com gabarito
- [ ] Testar fluxo completo

### Fase 4: RLS e Segurança
- [ ] Habilitar RLS em todas tabelas
- [ ] Criar policies para questões (público)
- [ ] Criar policies para respostas (candidato + RH)
- [ ] Criar policies para scores (candidato + RH)
- [ ] Testar acesso de candidato
- [ ] Testar acesso de RH

### Fase 5: Validações e Constraints
- [ ] Adicionar constraints de range (respostas válidas)
- [ ] Adicionar constraints UNIQUE (não responder 2x)
- [ ] Adicionar validações DISC (mais ≠ menos)
- [ ] Testar todas validações

### Fase 6: Triggers e Aplicar updated_at
- [ ] Aplicar trigger `updated_at` em tabelas de questões
- [ ] Testar triggers de cálculo automático
- [ ] Validar que scores são calculados corretamente

### Fase 7: Testes Integrados
- [ ] Testar candidato faz Big Five completo
- [ ] Testar candidato faz DISC completo
- [ ] Testar candidato faz Raven completo
- [ ] Testar cálculos de scores
- [ ] Testar webhooks N8N (simulação)
- [ ] Testar RH visualiza resultados

### Fase 8: Seed Data Completo
- [ ] Inserir questões Big Five (120)
- [ ] Inserir questões DISC (28)
- [ ] Inserir questões Raven (60) + gabarito
- [ ] Upload de imagens Raven
- [ ] Criar candidaturas de teste
- [ ] Simular respostas e validar scores

---

## 11. Dependências

### Dependências Externas

| Dependência | Descrição | Status |
|-------------|-----------|--------|
| **PRD-DB-001** | Tabelas candidatos, usuarios_rh | ✅ Completo |
| **PRD-DB-002** | Tabela candidaturas | ✅ Completo |
| **Supabase Storage** | Bucket raven-imagens | ⏳ A configurar |
| **N8N Webhooks** | Análise IA | ⏳ PRD-N8N-002, 003, 004 |
| **Questões Científicas** | 120 Big Five + 28 DISC + 60 Raven | ⏳ A obter |
| **Imagens Raven** | 540 imagens otimizadas | ⏳ A criar/licenciar |

---

### Dependências Internas

| PRD Dependente | Razão |
|----------------|-------|
| **PRD-N8N-002** | Webhook análise Big Five |
| **PRD-N8N-003** | Webhook análise DISC |
| **PRD-N8N-004** | Webhook análise Raven |
| **PRD-DEV-006** | Frontend Big Five |
| **PRD-DEV-007** | Frontend DISC |
| **PRD-DEV-008** | Frontend Raven |

---

## 12. Anexos

### Anexo A: Script SQL Completo de Migração

```sql
-- =====================================================
-- MIGRATION: Estrutura de Testes Psicométricos
-- PRD: PRD-DB-003
-- Data: 02/11/2025
-- Versão: 1.0
-- Dependências: PRD-DB-001, PRD-DB-002
-- =====================================================

-- =====================================================
-- 1. CRIAR ENUMS
-- =====================================================

CREATE TYPE dimensao_bigfive AS ENUM (
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'neuroticism'
);

CREATE TYPE dimensao_disc AS ENUM (
  'D',
  'I',
  'S',
  'C'
);

CREATE TYPE serie_raven AS ENUM (
  'A',
  'B',
  'C',
  'D',
  'E'
);

-- =====================================================
-- 2. CRIAR TABELAS - BIG FIVE
-- =====================================================

CREATE TABLE questoes_bigfive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_questao INTEGER NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  texto_questao TEXT NOT NULL,
  dimensao dimensao_bigfive NOT NULL,
  is_invertida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios_rh(id) NULL,
  
  CONSTRAINT questao_bigfive_unica UNIQUE (numero_questao, versao),
  CONSTRAINT numero_questao_bigfive_valido CHECK (numero_questao >= 1 AND numero_questao <= 120)
);

CREATE INDEX idx_questoes_bigfive_versao ON questoes_bigfive(versao);
CREATE INDEX idx_questoes_bigfive_dimensao ON questoes_bigfive(dimensao);
CREATE INDEX idx_questoes_bigfive_deleted_at ON questoes_bigfive(deleted_at);

COMMENT ON TABLE questoes_bigfive IS 'Questões do teste Big Five (OCEAN) - 120 questões total';
COMMENT ON COLUMN questoes_bigfive.is_invertida IS 'Se TRUE, inverte pontuação (5→1, 4→2, etc.)';

-- ---

CREATE TABLE respostas_bigfive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE NOT NULL,
  questao_id UUID REFERENCES questoes_bigfive(id) ON DELETE CASCADE NOT NULL,
  resposta INTEGER NOT NULL CHECK (resposta >= 1 AND resposta <= 5),
  tempo_resposta_segundos INTEGER NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT resposta_bigfive_unica UNIQUE (candidatura_id, questao_id)
);

CREATE INDEX idx_respostas_bigfive_candidatura ON respostas_bigfive(candidatura_id);
CREATE INDEX idx_respostas_bigfive_questao ON respostas_bigfive(questao_id);

COMMENT ON TABLE respostas_bigfive IS 'Respostas dos candidatos ao Big Five';
COMMENT ON COLUMN respostas_bigfive.resposta IS '1=Discordo Totalmente, 2=Discordo, 3=Neutro, 4=Concordo, 5=Concordo Totalmente';

-- ---

CREATE TABLE scores_bigfive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE UNIQUE NOT NULL,
  score_openness DECIMAL(5,2) NOT NULL CHECK (score_openness >= 0 AND score_openness <= 100),
  score_conscientiousness DECIMAL(5,2) NOT NULL CHECK (score_conscientiousness >= 0 AND score_conscientiousness <= 100),
  score_extraversion DECIMAL(5,2) NOT NULL CHECK (score_extraversion >= 0 AND score_extraversion <= 100),
  score_agreeableness DECIMAL(5,2) NOT NULL CHECK (score_agreeableness >= 0 AND score_agreeableness <= 100),
  score_neuroticism DECIMAL(5,2) NOT NULL CHECK (score_neuroticism >= 0 AND score_neuroticism <= 100),
  tempo_total_segundos INTEGER NOT NULL CHECK (tempo_total_segundos >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scores_bigfive_candidatura ON scores_bigfive(candidatura_id);

COMMENT ON TABLE scores_bigfive IS 'Scores calculados do Big Five (escala 0-100 para cada dimensão)';

-- =====================================================
-- 3. CRIAR TABELAS - DISC
-- =====================================================

CREATE TABLE questoes_disc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_questao INTEGER NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  opcoes JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios_rh(id) NULL,
  
  CONSTRAINT questao_disc_unica UNIQUE (numero_questao, versao),
  CONSTRAINT numero_questao_disc_valido CHECK (numero_questao >= 1 AND numero_questao <= 28)
);

CREATE INDEX idx_questoes_disc_versao ON questoes_disc(versao);
CREATE INDEX idx_questoes_disc_deleted_at ON questoes_disc(deleted_at);

COMMENT ON TABLE questoes_disc IS 'Questões do teste DISC - 28 questões total';
COMMENT ON COLUMN questoes_disc.opcoes IS 'Array JSON com 4 opções (D, I, S, C)';

-- ---

CREATE TABLE respostas_disc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE NOT NULL,
  questao_id UUID REFERENCES questoes_disc(id) ON DELETE CASCADE NOT NULL,
  mais_caracteristico TEXT NOT NULL CHECK (mais_caracteristico IN ('D', 'I', 'S', 'C')),
  menos_caracteristico TEXT NOT NULL CHECK (menos_caracteristico IN ('D', 'I', 'S', 'C')),
  tempo_resposta_segundos INTEGER NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT resposta_disc_unica UNIQUE (candidatura_id, questao_id),
  CONSTRAINT resposta_disc_diferentes CHECK (mais_caracteristico != menos_caracteristico)
);

CREATE INDEX idx_respostas_disc_candidatura ON respostas_disc(candidatura_id);

COMMENT ON TABLE respostas_disc IS 'Respostas do teste DISC (escolha forçada: mais e menos característico)';

-- ---

CREATE TABLE scores_disc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE UNIQUE NOT NULL,
  score_d INTEGER NOT NULL CHECK (score_d >= -28 AND score_d <= 56),
  score_i INTEGER NOT NULL CHECK (score_i >= -28 AND score_i <= 56),
  score_s INTEGER NOT NULL CHECK (score_s >= -28 AND score_s <= 56),
  score_c INTEGER NOT NULL CHECK (score_c >= -28 AND score_c <= 56),
  perfil_primario TEXT NOT NULL CHECK (perfil_primario IN ('D', 'I', 'S', 'C')),
  perfil_secundario TEXT NULL CHECK (perfil_secundario IS NULL OR perfil_secundario IN ('D', 'I', 'S', 'C')),
  tempo_total_segundos INTEGER NOT NULL CHECK (tempo_total_segundos >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scores_disc_candidatura ON scores_disc(candidatura_id);

COMMENT ON TABLE scores_disc IS 'Scores calculados do DISC';
COMMENT ON COLUMN scores_disc.perfil_primario IS 'Perfil predominante (maior score)';

-- =====================================================
-- 4. CRIAR TABELAS - RAVEN
-- =====================================================

CREATE TABLE questoes_raven (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_questao INTEGER NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  serie serie_raven NOT NULL,
  imagem_matriz_url TEXT NOT NULL,
  opcoes_imagens JSONB NOT NULL,
  resposta_correta INTEGER NOT NULL CHECK (resposta_correta >= 1 AND resposta_correta <= 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios_rh(id) NULL,
  
  CONSTRAINT questao_raven_unica UNIQUE (numero_questao, versao),
  CONSTRAINT numero_questao_raven_valido CHECK (numero_questao >= 1 AND numero_questao <= 60)
);

CREATE INDEX idx_questoes_raven_versao ON questoes_raven(versao);
CREATE INDEX idx_questoes_raven_serie ON questoes_raven(serie);
CREATE INDEX idx_questoes_raven_deleted_at ON questoes_raven(deleted_at);

COMMENT ON TABLE questoes_raven IS 'Questões do teste Raven (Matrizes Progressivas) - 60 questões total';
COMMENT ON COLUMN questoes_raven.serie IS 'Série A-E (12 questões cada)';

-- ---

CREATE TABLE respostas_raven (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE NOT NULL,
  questao_id UUID REFERENCES questoes_raven(id) ON DELETE CASCADE NOT NULL,
  resposta INTEGER NOT NULL CHECK (resposta >= 1 AND resposta <= 8),
  tempo_resposta_segundos INTEGER NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT resposta_raven_unica UNIQUE (candidatura_id, questao_id)
);

CREATE INDEX idx_respostas_raven_candidatura ON respostas_raven(candidatura_id);
CREATE INDEX idx_respostas_raven_questao ON respostas_raven(questao_id);

COMMENT ON TABLE respostas_raven IS 'Respostas do teste Raven';

-- ---

CREATE TABLE scores_raven (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES candidaturas(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_acertos INTEGER NOT NULL CHECK (total_acertos >= 0 AND total_acertos <= 60),
  percentual_acerto DECIMAL(5,2) NOT NULL CHECK (percentual_acerto >= 0 AND percentual_acerto <= 100),
  percentil INTEGER NOT NULL CHECK (percentil >= 0 AND percentil <= 100),
  classificacao TEXT NOT NULL CHECK (classificacao IN ('Inferior', 'Médio Inferior', 'Médio', 'Médio Superior', 'Superior')),
  acertos_por_serie JSONB NOT NULL,
  tempo_total_segundos INTEGER NOT NULL CHECK (tempo_total_segundos >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scores_raven_candidatura ON scores_raven(candidatura_id);

COMMENT ON TABLE scores_raven IS 'Scores calculados do Raven';
COMMENT ON COLUMN scores_raven.percentil IS 'Percentil baseado em tabela normativa (0-100)';

-- =====================================================
-- 5. CRIAR FUNCTIONS PARA CÁLCULO DE SCORES
-- =====================================================

-- Function: Calcular Scores Big Five
-- (Código completo fornecido no RF-014)
-- [Inserir function calcular_scores_bigfive() aqui]

-- Function: Calcular Scores DISC
-- (Código completo fornecido no RF-015)
-- [Inserir function calcular_scores_disc() aqui]

-- Function: Calcular Scores Raven
-- (Código completo fornecido no RF-016)
-- [Inserir function calcular_scores_raven() aqui]

-- =====================================================
-- 6. CRIAR TRIGGERS
-- =====================================================

-- Triggers updated_at
CREATE TRIGGER update_questoes_bigfive_updated_at 
  BEFORE UPDATE ON questoes_bigfive
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questoes_disc_updated_at 
  BEFORE UPDATE ON questoes_disc
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questoes_raven_updated_at 
  BEFORE UPDATE ON questoes_raven
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para cálculo automático de scores
-- (Código completo fornecido no RF-017)
-- [Inserir triggers de cálculo aqui]

-- =====================================================
-- 7. HABILITAR RLS E CRIAR POLICIES
-- =====================================================

-- RLS: Questões (público)
ALTER TABLE questoes_bigfive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem questões BigFive"
ON questoes_bigfive FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

ALTER TABLE questoes_disc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem questões DISC"
ON questoes_disc FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

ALTER TABLE questoes_raven ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem questões Raven"
ON questoes_raven FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- RLS: Respostas e Scores
-- (Código completo fornecido no RF-019 e RF-020)
-- [Inserir policies de respostas e scores aqui]

-- =====================================================
-- 8. CONFIGURAR STORAGE (Bucket Raven Imagens)
-- =====================================================

-- Criar bucket 'raven-imagens' (executar via Dashboard ou Storage API)
-- Configurações:
--   - Name: raven-imagens
--   - Public: true
--   - File size limit: 500 KB
--   - Allowed MIME types: image/png, image/webp

-- =====================================================
-- 9. SEED DATA (Opcional - Para Testes)
-- =====================================================

-- Inserir questões de exemplo (em produção, inserir todas 120+28+60)
-- [Seed data será fornecido separadamente]

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

SELECT 'Migração PRD-DB-003 completa!' as status;
```

---

### Anexo B: Exemplo de Seed Data

**Big Five (exemplo de 3 questões):**
```sql
INSERT INTO questoes_bigfive (numero_questao, versao, texto_questao, dimensao, is_invertida) VALUES
(1, 1, 'Sou alguém que gosta de conversar com muitas pessoas', 'extraversion', FALSE),
(2, 1, 'Sou alguém que prefere trabalhar sozinho', 'extraversion', TRUE),
(3, 1, 'Sou alguém que é curioso sobre muitas coisas diferentes', 'openness', FALSE);
-- ... (117 questões restantes)
```

**DISC (exemplo de 1 questão):**
```sql
INSERT INTO questoes_disc (numero_questao, versao, opcoes) VALUES
(1, 1, '[
  {"texto": "Sou assertivo e direto", "dimensao": "D"},
  {"texto": "Sou entusiasta e sociável", "dimensao": "I"},
  {"texto": "Sou calmo e paciente", "dimensao": "S"},
  {"texto": "Sou preciso e analítico", "dimensao": "C"}
]');
-- ... (27 questões restantes)
```

**Raven (exemplo de 1 questão):**
```sql
INSERT INTO questoes_raven (numero_questao, versao, serie, imagem_matriz_url, opcoes_imagens, resposta_correta) VALUES
(1, 1, 'A', 'https://.../raven-imagens/versao-1/q1/matriz.png', 
'[
  {"numero": 1, "imagem_url": "https://.../versao-1/q1/opcao-1.png"},
  {"numero": 2, "imagem_url": "https://.../versao-1/q1/opcao-2.png"},
  {"numero": 3, "imagem_url": "https://.../versao-1/q1/opcao-3.png"},
  {"numero": 4, "imagem_url": "https://.../versao-1/q1/opcao-4.png"},
  {"numero": 5, "imagem_url": "https://.../versao-1/q1/opcao-5.png"},
  {"numero": 6, "imagem_url": "https://.../versao-1/q1/opcao-6.png"},
  {"numero": 7, "imagem_url": "https://.../versao-1/q1/opcao-7.png"},
  {"numero": 8, "imagem_url": "https://.../versao-1/q1/opcao-8.png"}
]', 
3);
-- ... (59 questões restantes)
```

---

**FIM DO PRD-DB-003**

**Versão:** 1.0  
**Status:** 📋 Pronto para Implementação  
**Próxima Revisão:** Após implementação

---

**Documento criado em:** 02 de Novembro de 2025  
**Última atualização:** 02 de Novembro de 2025  
**Autor:** Equipe Beauty Smile  
**Revisor:** Pendente
