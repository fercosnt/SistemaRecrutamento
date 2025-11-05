# PRD-DB-001: Estrutura de Autenticação e Usuários

**Versão:** 1.0  
**Data de Criação:** 02 de Novembro de 2025  
**Autor:** Equipe Beauty Smile  
**Status:** 📋 Aguardando Implementação  
**Prioridade:** 🔴 P0 - Crítica (MVP)  
**Ferramenta:** DB Expert (Supabase)

---

## 📋 Índice

1. [Introdução/Overview](#1-introduçãooverview)
2. [Objetivos (Goals)](#2-objetivos-goals)
3. [User Stories](#3-user-stories)
4. [Requisitos Funcionais](#4-requisitos-funcionais)
5. [Não-Objetivos (Out of Scope)](#5-não-objetivos-out-of-scope)
6. [Considerações de Design](#6-considerações-de-design)
7. [Considerações Técnicas](#7-considerações-técnicas)
8. [Métricas de Sucesso](#8-métricas-de-sucesso)
9. [Questões Em Aberto](#9-questões-em-aberto)

---

## 1. Introdução/Overview

### 1.1 Contexto

O sistema Beauty Smile é uma plataforma de recrutamento que possui dois tipos principais de usuários:
- **Candidatos:** Pessoas que se inscrevem para vagas
- **Usuários RH/Admin:** Funcionários da empresa que gerenciam o processo seletivo

Atualmente, a interface (UI) está 100% implementada em React + Vite, mas **não existe backend**. Este PRD define a estrutura completa do banco de dados para **autenticação, usuários e controle de acesso** utilizando **Supabase** como Backend as a Service (BaaS).

### 1.2 Problema

Sem um sistema de autenticação e gerenciamento de usuários funcional, o sistema não pode:
- Cadastrar candidatos reais
- Validar credenciais de login
- Controlar permissões de acesso (RH vs Candidato)
- Rastrear ações dos usuários (auditoria)
- Armazenar fotos de perfil de forma segura
- Gerenciar sessões e segurança

### 1.3 Objetivo

Criar a **estrutura completa de banco de dados no Supabase** para suportar:
- Cadastro e autenticação de candidatos
- Cadastro e autenticação de usuários RH com diferentes roles
- Controle de acesso baseado em permissões (RLS - Row Level Security)
- Armazenamento seguro de fotos de perfil
- Logs de auditoria e rastreabilidade
- Soft delete para recuperação de dados
- Gerenciamento de sessões ativas

---

## 2. Objetivos (Goals)

### 2.1 Objetivos Primários

1. **Autenticação Segura:** Implementar sistema de autenticação completo usando Supabase Auth
2. **Gestão de Usuários:** Criar estrutura para armazenar dados de candidatos e usuários RH
3. **Controle de Acesso:** Implementar roles e permissões com RLS policies
4. **Rastreabilidade:** Garantir auditoria completa de todas as ações (created_by, updated_by)
5. **Segurança de Dados:** Proteger informações sensíveis com RLS e soft delete

### 2.2 Objetivos Secundários

1. **Gestão de Sessões:** Permitir visualização e controle de dispositivos logados
2. **Armazenamento de Fotos:** Bucket seguro para avatares com políticas de acesso
3. **Preferências:** Permitir RH configurar preferências de notificações
4. **Escalabilidade:** Estrutura preparada para crescimento (UUID, índices, constraints)

---

## 3. User Stories

### 3.1 Como Candidato

**US-001:** Como candidato, eu quero criar uma conta com meus dados pessoais para me candidatar a vagas  
**Critério de Aceitação:**
- Posso cadastrar: nome completo, email, CPF, celular, data de nascimento, gênero, endereço completo, cidade, estado, LinkedIn, Instagram, como conheceu a vaga
- Meu email não pode estar duplicado no sistema
- Meu CPF não pode estar duplicado no sistema
- Senha deve ter no mínimo 8 caracteres, 1 letra maiúscula e 1 número

**US-002:** Como candidato, eu quero fazer login com email e senha para acessar minhas candidaturas  
**Critério de Aceitação:**
- Posso fazer login com credenciais válidas
- Recebo mensagem de erro se credenciais inválidas
- Minha sessão expira após 7 dias de inatividade

**US-003:** Como candidato, eu quero visualizar e editar meu perfil para manter meus dados atualizados  
**Critério de Aceitação:**
- Posso alterar todos os dados, incluindo email
- Posso fazer upload de foto de perfil (opcional)
- Posso ver histórico das minhas candidaturas

**US-004:** Como candidato, eu quero me candidatar a múltiplas vagas usando a mesma conta  
**Critério de Aceitação:**
- Um candidato pode ter várias candidaturas ativas simultaneamente

### 3.2 Como Usuário RH

**US-005:** Como usuário RH, eu quero fazer login com minhas credenciais para acessar o sistema  
**Critério de Aceitação:**
- Posso fazer login com email e senha
- Meu acesso é baseado no meu role (administrador, gerente, recrutador, visualizador)
- Minha sessão expira após 7 dias de inatividade

**US-006:** Como administrador, eu quero gerenciar usuários RH e suas permissões  
**Critério de Aceitação:**
- Posso criar, editar e desativar usuários RH
- Posso atribuir roles específicos
- Posso associar recrutadores a vagas específicas

**US-007:** Como gerente, eu quero ter acesso total a todas as vagas e candidatos  
**Critério de Aceitação:**
- Vejo todas as vagas, independente de quem criou
- Posso criar e editar vagas
- Posso aprovar/rejeitar candidatos

**US-008:** Como recrutador, eu quero ver apenas as vagas associadas a mim  
**Critério de Aceitação:**
- Vejo apenas vagas que foram atribuídas a mim
- Posso aprovar/rejeitar candidatos das minhas vagas
- Não posso criar ou editar vagas

**US-009:** Como visualizador, eu quero apenas visualizar informações sem fazer alterações  
**Critério de Aceitação:**
- Posso ver candidatos e vagas
- Posso adicionar notas privadas
- Não posso aprovar/rejeitar ou editar

**US-010:** Como usuário RH, eu quero configurar minhas preferências de notificações  
**Critério de Aceitação:**
- Posso escolher receber emails sobre novos candidatos
- Posso escolher receber emails quando candidatos completam testes
- Posso escolher receber resumo diário
- Posso ativar/desativar notificações por WhatsApp

### 3.3 Como Sistema

**US-011:** Como sistema, eu preciso registrar todas as ações dos usuários para auditoria  
**Critério de Aceitação:**
- Todas as tabelas têm campos created_at, updated_at, created_by, updated_by
- Logs de acesso são armazenados (IP, dispositivo, data/hora)
- Soft delete permite recuperação de dados

**US-012:** Como sistema, eu preciso controlar sessões ativas de usuários  
**Critério de Aceitação:**
- Registro de todos os dispositivos/browsers logados
- Possibilidade de revogar sessões remotamente
- Detecção de acessos suspeitos

---

## 4. Requisitos Funcionais

### 4.1 Estrutura Geral do Banco de Dados

#### RF-001: Utilizar UUID como Identificador Primário
- **Descrição:** Todas as tabelas devem usar UUID v4 como chave primária (id)
- **Justificativa:** Segurança (não expõe quantidade de registros), distribuição, padrão Supabase
- **Tipo de Dado:** UUID
- **Exemplo:** `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12`

#### RF-002: Configurar Timezone do Banco
- **Descrição:** Todos os timestamps devem usar timezone America/Sao_Paulo
- **Justificativa:** Sistema brasileiro, facilita queries e relatórios
- **Comando SQL:**
```sql
ALTER DATABASE postgres SET timezone TO 'America/Sao_Paulo';
```

#### RF-003: Implementar Campos de Auditoria em Todas as Tabelas
- **Descrição:** Toda tabela deve ter os seguintes campos padrão:
```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
deleted_at TIMESTAMPTZ NULL  -- Para soft delete
created_by UUID REFERENCES auth.users(id)
updated_by UUID REFERENCES auth.users(id)
```
- **Justificativa:** Rastreabilidade, debug, compliance (LGPD), auditoria

#### RF-004: Implementar Trigger para updated_at
- **Descrição:** Criar função e trigger que atualiza automaticamente o campo updated_at
- **Comando SQL:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em cada tabela:
CREATE TRIGGER update_[nome_tabela]_updated_at
    BEFORE UPDATE ON [nome_tabela]
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### RF-005: Implementar Soft Delete
- **Descrição:** Deletar registros usando flag deleted_at ao invés de DELETE físico
- **Justificativa:** Recuperação de dados, auditoria, compliance
- **Comportamento:**
  - Ao "deletar", setar `deleted_at = NOW()`
  - Queries padrão devem filtrar `WHERE deleted_at IS NULL`
  - Criar views para facilitar: `v_[tabela]_ativos`

---

### 4.2 Tabela: candidatos

#### RF-006: Criar Tabela candidatos
- **Descrição:** Armazena dados pessoais dos candidatos
- **Relacionamento:** 1:1 com auth.users (Supabase Auth)

**Estrutura da Tabela:**

```sql
CREATE TABLE candidatos (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Dados Pessoais Básicos
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf VARCHAR(14) NOT NULL UNIQUE, -- Formato: XXX.XXX.XXX-XX
    celular VARCHAR(20) NOT NULL, -- Formato: (XX) XXXXX-XXXX
    data_nascimento DATE NOT NULL,
    genero VARCHAR(50), -- Enum: masculino, feminino, outro, prefiro_nao_informar
    
    -- Endereço Completo
    cep VARCHAR(10),
    logradouro VARCHAR(255),
    numero VARCHAR(10),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL, -- Enum: AC, AL, AP, AM, BA, etc.
    
    -- Redes Sociais
    linkedin_url VARCHAR(500),
    instagram_url VARCHAR(500),
    
    -- Origem
    como_conheceu VARCHAR(100), -- Enum: linkedin, instagram, indicacao, site, google, outro
    como_conheceu_detalhes TEXT, -- Campo livre se escolher "outro"
    
    -- Foto
    avatar_url VARCHAR(500), -- URL do Supabase Storage
    
    -- Status e Flags
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
    bloqueado_motivo TEXT,
    data_ultimo_acesso TIMESTAMPTZ,
    
    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);
```

**Índices:**

```sql
CREATE INDEX idx_candidatos_email ON candidatos(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidatos_cpf ON candidatos(cpf) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidatos_user_id ON candidatos(user_id);
CREATE INDEX idx_candidatos_ativo ON candidatos(ativo) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidatos_cidade_estado ON candidatos(cidade, estado) WHERE deleted_at IS NULL;
```

**Constraints Adicionais:**

```sql
-- Validar formato de email
ALTER TABLE candidatos ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validar formato de CPF (apenas formato visual, não valida dígitos)
ALTER TABLE candidatos ADD CONSTRAINT check_cpf_format 
    CHECK (cpf ~* '^\d{3}\.\d{3}\.\d{3}-\d{2}$');

-- Validar formato de celular
ALTER TABLE candidatos ADD CONSTRAINT check_celular_format 
    CHECK (celular ~* '^\(\d{2}\) \d{5}-\d{4}$');

-- Data de nascimento deve ser no passado
ALTER TABLE candidatos ADD CONSTRAINT check_data_nascimento 
    CHECK (data_nascimento < CURRENT_DATE);

-- Gênero deve ser um dos valores válidos
ALTER TABLE candidatos ADD CONSTRAINT check_genero 
    CHECK (genero IN ('masculino', 'feminino', 'outro', 'prefiro_nao_informar'));

-- Estado deve ser UF válida
ALTER TABLE candidatos ADD CONSTRAINT check_estado 
    CHECK (estado IN (
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ));

-- Como conheceu deve ser um dos valores válidos
ALTER TABLE candidatos ADD CONSTRAINT check_como_conheceu 
    CHECK (como_conheceu IN (
        'linkedin', 'instagram', 'indicacao', 'site', 'google', 'facebook', 'outro'
    ));
```

**Trigger:**

```sql
CREATE TRIGGER update_candidatos_updated_at
    BEFORE UPDATE ON candidatos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**RLS Policies:**

```sql
-- Habilitar RLS
ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;

-- Candidato pode ler e atualizar apenas seu próprio perfil
CREATE POLICY "Candidatos podem ler seu próprio perfil"
    ON candidatos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Candidatos podem atualizar seu próprio perfil"
    ON candidatos FOR UPDATE
    USING (auth.uid() = user_id);

-- RH pode ler todos os candidatos
CREATE POLICY "RH pode ler todos os candidatos"
    ON candidatos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = auth.uid()
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );

-- Apenas sistema pode criar candidatos (via signup)
CREATE POLICY "Sistema pode criar candidatos"
    ON candidatos FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

---

### 4.3 Tabela: usuarios_rh

#### RF-007: Criar Tabela usuarios_rh
- **Descrição:** Armazena dados dos usuários RH/Admin
- **Relacionamento:** 1:1 com auth.users (Supabase Auth)

**Estrutura da Tabela:**

```sql
CREATE TABLE usuarios_rh (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Dados Pessoais
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    
    -- Dados Profissionais
    cargo VARCHAR(100) NOT NULL,
    telefone VARCHAR(20), -- Formato: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    
    -- Role e Permissões
    role VARCHAR(50) NOT NULL, -- Enum: administrador, gerente, recrutador, visualizador
    
    -- Foto
    avatar_url VARCHAR(500),
    
    -- Status e Flags
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    primeiro_acesso BOOLEAN NOT NULL DEFAULT TRUE, -- Forçar troca de senha no primeiro login
    data_ultimo_login TIMESTAMPTZ,
    
    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);
```

**Índices:**

```sql
CREATE INDEX idx_usuarios_rh_email ON usuarios_rh(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_usuarios_rh_user_id ON usuarios_rh(user_id);
CREATE INDEX idx_usuarios_rh_role ON usuarios_rh(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_usuarios_rh_ativo ON usuarios_rh(ativo) WHERE deleted_at IS NULL;
```

**Constraints:**

```sql
-- Validar formato de email
ALTER TABLE usuarios_rh ADD CONSTRAINT check_usuarios_rh_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Role deve ser um dos valores válidos
ALTER TABLE usuarios_rh ADD CONSTRAINT check_role 
    CHECK (role IN ('administrador', 'gerente', 'recrutador', 'visualizador'));

-- Validar formato de telefone
ALTER TABLE usuarios_rh ADD CONSTRAINT check_usuarios_rh_telefone_format 
    CHECK (telefone IS NULL OR telefone ~* '^\(\d{2}\) \d{4,5}-\d{4}$');
```

**Trigger:**

```sql
CREATE TRIGGER update_usuarios_rh_updated_at
    BEFORE UPDATE ON usuarios_rh
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**RLS Policies:**

```sql
-- Habilitar RLS
ALTER TABLE usuarios_rh ENABLE ROW LEVEL SECURITY;

-- RH pode ler seu próprio perfil
CREATE POLICY "RH pode ler seu próprio perfil"
    ON usuarios_rh FOR SELECT
    USING (auth.uid() = user_id);

-- RH pode atualizar seu próprio perfil (exceto role)
CREATE POLICY "RH pode atualizar seu próprio perfil"
    ON usuarios_rh FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND OLD.role = NEW.role -- Não pode alterar próprio role
    );

-- Apenas administradores podem ler todos os usuários RH
CREATE POLICY "Administradores podem ler todos os RH"
    ON usuarios_rh FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh AS u
            WHERE u.user_id = auth.uid()
            AND u.role = 'administrador'
            AND u.ativo = TRUE
            AND u.deleted_at IS NULL
        )
    );

-- Apenas administradores podem criar usuários RH
CREATE POLICY "Administradores podem criar usuários RH"
    ON usuarios_rh FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios_rh AS u
            WHERE u.user_id = auth.uid()
            AND u.role = 'administrador'
            AND u.ativo = TRUE
            AND u.deleted_at IS NULL
        )
    );

-- Apenas administradores podem atualizar outros usuários RH
CREATE POLICY "Administradores podem atualizar usuários RH"
    ON usuarios_rh FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh AS u
            WHERE u.user_id = auth.uid()
            AND u.role = 'administrador'
            AND u.ativo = TRUE
            AND u.deleted_at IS NULL
        )
    );
```

---

### 4.4 Tabela: vagas_associadas_recrutadores

#### RF-008: Criar Tabela vagas_associadas_recrutadores
- **Descrição:** Associação entre recrutadores e vagas específicas
- **Relacionamento:** N:N (um recrutador pode ter várias vagas, uma vaga pode ter vários recrutadores)

**Estrutura da Tabela:**

```sql
CREATE TABLE vagas_associadas_recrutadores (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamentos
    usuario_rh_id UUID NOT NULL REFERENCES usuarios_rh(id) ON DELETE CASCADE,
    vaga_id UUID NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,
    
    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Garantir que não haja duplicatas
    UNIQUE(usuario_rh_id, vaga_id)
);
```

**Índices:**

```sql
CREATE INDEX idx_vagas_recrutadores_usuario ON vagas_associadas_recrutadores(usuario_rh_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vagas_recrutadores_vaga ON vagas_associadas_recrutadores(vaga_id) WHERE deleted_at IS NULL;
```

**Trigger:**

```sql
CREATE TRIGGER update_vagas_associadas_recrutadores_updated_at
    BEFORE UPDATE ON vagas_associadas_recrutadores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**RLS Policies:**

```sql
-- Habilitar RLS
ALTER TABLE vagas_associadas_recrutadores ENABLE ROW LEVEL SECURITY;

-- Recrutadores podem ver suas próprias associações
CREATE POLICY "Recrutadores podem ver suas associações"
    ON vagas_associadas_recrutadores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE usuarios_rh.id = usuario_rh_id
            AND usuarios_rh.user_id = auth.uid()
        )
    );

-- Administradores e gerentes podem gerenciar todas as associações
CREATE POLICY "Admin/Gerente podem gerenciar associações"
    ON vagas_associadas_recrutadores FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = auth.uid()
            AND role IN ('administrador', 'gerente')
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );
```

---

### 4.5 Tabela: sessoes_ativas

#### RF-009: Criar Tabela sessoes_ativas
- **Descrição:** Registra todas as sessões ativas dos usuários para controle de acesso e segurança
- **Objetivo:** Permitir logout remoto, detectar acessos suspeitos, log de segurança

**Estrutura da Tabela:**

```sql
CREATE TABLE sessoes_ativas (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamento
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Dados da Sessão
    session_token VARCHAR(255) UNIQUE, -- Token do Supabase Auth (opcional)
    device_info TEXT, -- User-Agent completo
    device_type VARCHAR(50), -- Enum: desktop, mobile, tablet
    browser VARCHAR(100),
    operating_system VARCHAR(100),
    
    -- Localização
    ip_address INET NOT NULL,
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Timestamps
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, -- 7 dias após last_activity
    
    -- Status
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    revogado BOOLEAN NOT NULL DEFAULT FALSE,
    revogado_em TIMESTAMPTZ,
    revogado_por UUID REFERENCES auth.users(id),
    
    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**

```sql
CREATE INDEX idx_sessoes_user_id ON sessoes_ativas(user_id);
CREATE INDEX idx_sessoes_ativo ON sessoes_ativas(ativo);
CREATE INDEX idx_sessoes_last_activity ON sessoes_ativas(last_activity);
CREATE INDEX idx_sessoes_ip ON sessoes_ativas(ip_address);
```

**Constraints:**

```sql
-- Device type deve ser válido
ALTER TABLE sessoes_ativas ADD CONSTRAINT check_device_type 
    CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown'));

-- Expires_at deve ser no futuro
ALTER TABLE sessoes_ativas ADD CONSTRAINT check_expires_at 
    CHECK (expires_at > created_at);
```

**Trigger para Atualizar expires_at:**

```sql
CREATE OR REPLACE FUNCTION update_expires_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Sempre que last_activity é atualizado, extends expires_at para +7 dias
    IF NEW.last_activity IS DISTINCT FROM OLD.last_activity THEN
        NEW.expires_at = NEW.last_activity + INTERVAL '7 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessoes_expires_at
    BEFORE UPDATE ON sessoes_ativas
    FOR EACH ROW
    EXECUTE FUNCTION update_expires_at();
```

**RLS Policies:**

```sql
-- Habilitar RLS
ALTER TABLE sessoes_ativas ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias sessões
CREATE POLICY "Usuários podem ver suas sessões"
    ON sessoes_ativas FOR SELECT
    USING (auth.uid() = user_id);

-- Usuários podem revogar suas próprias sessões
CREATE POLICY "Usuários podem revogar suas sessões"
    ON sessoes_ativas FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND NEW.revogado = TRUE -- Só pode marcar como revogado
    );

-- Sistema pode criar sessões
CREATE POLICY "Sistema pode criar sessões"
    ON sessoes_ativas FOR INSERT
    WITH CHECK (TRUE);

-- Administradores podem ver todas as sessões
CREATE POLICY "Administradores podem ver todas as sessões"
    ON sessoes_ativas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = auth.uid()
            AND role = 'administrador'
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );
```

**Função para Limpar Sessões Expiradas (Cron Job):**

```sql
-- Desabilitar/revogar sessões expiradas automaticamente
CREATE OR REPLACE FUNCTION limpar_sessoes_expiradas()
RETURNS void AS $$
BEGIN
    UPDATE sessoes_ativas
    SET ativo = FALSE,
        revogado = TRUE,
        revogado_em = NOW()
    WHERE expires_at < NOW()
    AND ativo = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Executar diariamente via Supabase Cron ou pg_cron:
-- SELECT cron.schedule('limpar-sessoes', '0 3 * * *', 'SELECT limpar_sessoes_expiradas();');
```

---

### 4.6 Tabela: logs_acesso

#### RF-010: Criar Tabela logs_acesso
- **Descrição:** Registra todos os acessos ao sistema (logins, logouts, tentativas falhas)
- **Objetivo:** Auditoria, segurança, detecção de padrões suspeitos

**Estrutura da Tabela:**

```sql
CREATE TABLE logs_acesso (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamento (pode ser NULL se login falhou)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Dados do Acesso
    evento VARCHAR(50) NOT NULL, -- Enum: login_sucesso, login_falha, logout, senha_alterada
    email_tentativa VARCHAR(255), -- Email usado na tentativa (mesmo que falhe)
    
    -- Detalhes do Dispositivo
    ip_address INET NOT NULL,
    device_info TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    operating_system VARCHAR(100),
    
    -- Localização (opcional)
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Mensagem de Erro (se login_falha)
    erro_mensagem TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**

```sql
CREATE INDEX idx_logs_acesso_user_id ON logs_acesso(user_id);
CREATE INDEX idx_logs_acesso_evento ON logs_acesso(evento);
CREATE INDEX idx_logs_acesso_created_at ON logs_acesso(created_at DESC);
CREATE INDEX idx_logs_acesso_ip ON logs_acesso(ip_address);
CREATE INDEX idx_logs_acesso_email ON logs_acesso(email_tentativa);
```

**Constraints:**

```sql
-- Evento deve ser válido
ALTER TABLE logs_acesso ADD CONSTRAINT check_evento 
    CHECK (evento IN (
        'login_sucesso', 
        'login_falha', 
        'logout', 
        'senha_alterada',
        'senha_resetada',
        'email_alterado',
        'conta_bloqueada',
        'conta_desbloqueada'
    ));

-- Device type deve ser válido
ALTER TABLE logs_acesso ADD CONSTRAINT check_logs_device_type 
    CHECK (device_type IS NULL OR device_type IN ('desktop', 'mobile', 'tablet', 'unknown'));
```

**RLS Policies:**

```sql
-- Habilitar RLS
ALTER TABLE logs_acesso ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios logs
CREATE POLICY "Usuários podem ver seus logs"
    ON logs_acesso FOR SELECT
    USING (auth.uid() = user_id);

-- Sistema pode inserir logs
CREATE POLICY "Sistema pode criar logs"
    ON logs_acesso FOR INSERT
    WITH CHECK (TRUE);

-- Administradores podem ver todos os logs
CREATE POLICY "Administradores podem ver todos os logs"
    ON logs_acesso FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = auth.uid()
            AND role = 'administrador'
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );
```

**Função para Limpar Logs Antigos (> 1 ano):**

```sql
CREATE OR REPLACE FUNCTION limpar_logs_antigos()
RETURNS void AS $$
BEGIN
    DELETE FROM logs_acesso
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Executar mensalmente:
-- SELECT cron.schedule('limpar-logs', '0 2 1 * *', 'SELECT limpar_logs_antigos();');
```

---

### 4.7 Tabela: preferencias_notificacoes

#### RF-011: Criar Tabela preferencias_notificacoes
- **Descrição:** Armazena preferências de notificações **apenas para usuários RH**
- **Objetivo:** Permitir RH configurar quais notificações deseja receber

**Estrutura da Tabela:**

```sql
CREATE TABLE preferencias_notificacoes (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamento (apenas RH)
    usuario_rh_id UUID NOT NULL UNIQUE REFERENCES usuarios_rh(id) ON DELETE CASCADE,
    
    -- Notificações por E-mail
    email_novos_candidatos BOOLEAN NOT NULL DEFAULT TRUE,
    email_testes_completos BOOLEAN NOT NULL DEFAULT TRUE,
    email_entrevistas_agendadas BOOLEAN NOT NULL DEFAULT TRUE,
    email_resumo_diario BOOLEAN NOT NULL DEFAULT FALSE,
    email_resumo_semanal BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Notificações por WhatsApp (link)
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_numero VARCHAR(20), -- Formato: +55 (XX) XXXXX-XXXX
    whatsapp_entrevistas BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_urgentes BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Notificações In-App (futuro)
    notificacoes_app BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);
```

**Índices:**

```sql
CREATE INDEX idx_preferencias_usuario_rh ON preferencias_notificacoes(usuario_rh_id) WHERE deleted_at IS NULL;
```

**Constraints:**

```sql
-- Validar formato de WhatsApp
ALTER TABLE preferencias_notificacoes ADD CONSTRAINT check_whatsapp_format 
    CHECK (whatsapp_numero IS NULL OR whatsapp_numero ~* '^\+55 \(\d{2}\) \d{5}-\d{4}$');

-- Se WhatsApp enabled, número deve estar preenchido
ALTER TABLE preferencias_notificacoes ADD CONSTRAINT check_whatsapp_numero_required 
    CHECK (
        (whatsapp_enabled = FALSE) OR 
        (whatsapp_enabled = TRUE AND whatsapp_numero IS NOT NULL)
    );
```

**Trigger:**

```sql
CREATE TRIGGER update_preferencias_notificacoes_updated_at
    BEFORE UPDATE ON preferencias_notificacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Trigger para Criar Preferências Padrão ao Criar Usuário RH:**

```sql
CREATE OR REPLACE FUNCTION criar_preferencias_padrao()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO preferencias_notificacoes (usuario_rh_id, created_by)
    VALUES (NEW.id, NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_preferencias_padrao
    AFTER INSERT ON usuarios_rh
    FOR EACH ROW
    EXECUTE FUNCTION criar_preferencias_padrao();
```

**RLS Policies:**

```sql
-- Habilitar RLS
ALTER TABLE preferencias_notificacoes ENABLE ROW LEVEL SECURITY;

-- RH pode ler e atualizar apenas suas próprias preferências
CREATE POLICY "RH pode gerenciar suas preferências"
    ON preferencias_notificacoes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE usuarios_rh.id = usuario_rh_id
            AND usuarios_rh.user_id = auth.uid()
        )
    );

-- Sistema pode criar preferências
CREATE POLICY "Sistema pode criar preferências"
    ON preferencias_notificacoes FOR INSERT
    WITH CHECK (TRUE);
```

---

### 4.8 Supabase Storage: Bucket avatars

#### RF-012: Criar Bucket para Fotos de Perfil
- **Descrição:** Bucket privado para armazenar fotos de perfil de candidatos e RH
- **Configurações:**
  - **Nome:** `avatars`
  - **Público:** Não (privado com RLS)
  - **Tamanho máximo por arquivo:** 2 MB
  - **Formatos permitidos:** JPG, JPEG, PNG, WEBP
  - **Estrutura de pastas:** `{user_id}/profile.{ext}`

**Criar Bucket via SQL:**

```sql
-- Criar bucket (via Supabase Dashboard ou SQL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    FALSE, -- Privado
    2097152, -- 2 MB em bytes
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);
```

**RLS Policies para Storage:**

```sql
-- Usuários podem fazer upload de seu próprio avatar
CREATE POLICY "Usuários podem fazer upload de avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Usuários podem atualizar seu próprio avatar
CREATE POLICY "Usuários podem atualizar avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Usuários podem deletar seu próprio avatar
CREATE POLICY "Usuários podem deletar avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Usuários podem visualizar apenas seu próprio avatar
CREATE POLICY "Usuários podem ver seu avatar"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- RH pode visualizar avatares de candidatos
CREATE POLICY "RH pode ver avatares de candidatos"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'avatars'
        AND EXISTS (
            SELECT 1 FROM usuarios_rh
            WHERE user_id = auth.uid()
            AND ativo = TRUE
            AND deleted_at IS NULL
        )
    );
```

---

### 4.9 Configuração Supabase Auth

#### RF-013: Configurar Supabase Auth
- **Descrição:** Configurações de autenticação no Supabase Dashboard

**Configurações Necessárias:**

1. **Configuração de Sessão:**
   - **Session Timeout:** 604800 segundos (7 dias)
   - **Refresh Token Rotation:** Habilitado
   - **Reuse Interval:** 10 segundos

2. **Configuração de Senha:**
   - **Mínimo de caracteres:** 8
   - **Requer letra maiúscula:** Sim
   - **Requer número:** Sim
   - **Requer caractere especial:** Não

3. **Configuração de Email:**
   - **Confirmar email ao cadastrar:** Opcional (pode ser FALSE no MVP)
   - **Template de confirmação:** Customizar
   - **Template de reset de senha:** Customizar

4. **Providers Habilitados:**
   - **Email/Password:** Sim
   - **OAuth (Google, LinkedIn):** Não (futuro)

5. **Redirects:**
   - **Site URL:** `https://[dominio-producao].com`
   - **Redirect URLs permitidas:**
     - `http://localhost:5173` (dev)
     - `https://[dominio-producao].com`

**SQL para Customizar Auth:**

```sql
-- Habilitar apenas email/password
UPDATE auth.config
SET email_provider = 'sendgrid', -- ou outro provider
    email_from = 'noreply@beautysmile.com';
```

---

### 4.10 Views Auxiliares

#### RF-014: Criar Views para Facilitar Queries
- **Descrição:** Views que filtram automaticamente registros soft deleted

**View: v_candidatos_ativos**

```sql
CREATE VIEW v_candidatos_ativos AS
SELECT *
FROM candidatos
WHERE deleted_at IS NULL;
```

**View: v_usuarios_rh_ativos**

```sql
CREATE VIEW v_usuarios_rh_ativos AS
SELECT *
FROM usuarios_rh
WHERE deleted_at IS NULL;
```

**View: v_sessoes_ativas_validas**

```sql
CREATE VIEW v_sessoes_ativas_validas AS
SELECT *
FROM sessoes_ativas
WHERE ativo = TRUE
AND revogado = FALSE
AND expires_at > NOW();
```

**View: v_ultimos_acessos (últimos 30 dias)**

```sql
CREATE VIEW v_ultimos_acessos AS
SELECT *
FROM logs_acesso
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

---

## 5. Não-Objetivos (Out of Scope)

### O que NÃO está incluído neste PRD:

1. **Integração com OAuth/Social Login:** Google, LinkedIn, Facebook (futuro - P3)
2. **2FA (Autenticação de Dois Fatores):** SMS, Authenticator App (futuro - P3)
3. **Biometria:** Reconhecimento facial, impressão digital (não planejado)
4. **Sistema de Permissões Granular:** Permissões por funcionalidade específica (futuro - P2)
5. **Múltiplas Empresas:** Um usuário RH pertencer a várias empresas (não planejado)
6. **Federação de Identidade:** SSO, SAML (não planejado para MVP)
7. **Validação de CPF Real:** Apenas formato é validado, não valida dígitos verificadores
8. **Geolocalização Precisa:** Apenas país/cidade aproximado via IP (não GPS)
9. **Análise de Comportamento:** Detecção de bots, padrões suspeitos (futuro - P3)
10. **Histórico de Alterações de Perfil:** Log de mudanças campo a campo (futuro - P2)

---

## 6. Considerações de Design

### 6.1 Diagrama Entidade-Relacionamento (ER)

```
┌─────────────────────┐
│   auth.users        │ (Supabase Auth)
│  - id (UUID)        │
│  - email            │
│  - encrypted_pwd    │
└──────────┬──────────┘
           │
           │ 1:1
           │
    ┌──────┴──────────────────────┐
    │                             │
    │ 1:1                         │ 1:1
    │                             │
┌───▼────────────┐     ┌──────────▼─────────┐
│  candidatos    │     │   usuarios_rh      │
│  - id (PK)     │     │   - id (PK)        │
│  - user_id(FK) │     │   - user_id (FK)   │
│  - nome        │     │   - nome           │
│  - email       │     │   - role           │
│  - cpf         │     │   - cargo          │
│  - ...         │     │   - ...            │
└────────────────┘     └─────────┬──────────┘
                                 │
                                 │ 1:1
                                 │
                       ┌─────────▼───────────────────┐
                       │ preferencias_notificacoes   │
                       │ - id (PK)                   │
                       │ - usuario_rh_id (FK)        │
                       │ - email_novos_candidatos    │
                       │ - whatsapp_enabled          │
                       │ - ...                       │
                       └─────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   sessoes_ativas     │         │   logs_acesso        │
│   - id (PK)          │         │   - id (PK)          │
│   - user_id (FK)     │         │   - user_id (FK)     │
│   - device_info      │         │   - evento           │
│   - ip_address       │         │   - ip_address       │
│   - last_activity    │         │   - created_at       │
│   - expires_at       │         │   - ...              │
└──────────────────────┘         └──────────────────────┘
        │                                 │
        └──────────┬──────────────────────┘
                   │
                   │ N:1
                   │
           ┌───────▼────────┐
           │  auth.users    │
           └────────────────┘

┌─────────────────────────────────┐
│ vagas_associadas_recrutadores   │
│ - id (PK)                       │
│ - usuario_rh_id (FK) ───────────┼─→ usuarios_rh
│ - vaga_id (FK) ─────────────────┼─→ vagas (PRD-DB-002)
│ - created_at                    │
└─────────────────────────────────┘
```

### 6.2 Fluxo de Cadastro de Candidato

```
1. Frontend chama Supabase Auth signUp()
   ↓
2. Supabase Auth cria user em auth.users
   ↓
3. Frontend recebe user_id
   ↓
4. Frontend insere dados em candidatos (com user_id)
   ↓
5. Trigger cria sessao_ativa automaticamente
   ↓
6. Log de acesso registra "login_sucesso"
   ↓
7. Redirect para página "Meu Perfil" (hub centralizado)
   ↓
8. Página "Meu Perfil" mostra próximo passo disponível
```

### 6.3 Fluxo de Login

```
1. Frontend chama Supabase Auth signInWithPassword()
   ↓
2. Supabase valida credenciais
   ↓
3. Se válido: retorna session + user
   │  Se inválido: retorna erro
   ↓
4. Frontend cria/atualiza sessao_ativa
   ↓
5. Log de acesso registra "login_sucesso" ou "login_falha"
   ↓
6. Frontend busca role do usuário
   │  - Se candidato: redirect para "Meu Perfil" (hub centralizado)
   │  - Se RH: redirect para dashboard RH (baseado no role)
   ↓
7. Página "Meu Perfil" (apenas candidatos):
   - Consulta etapa_atual da candidatura ativa (tabela candidaturas)
   - Exibe próximo teste/ação habilitado
   - Botões de etapas futuras ficam bloqueados (🔒)
   - Etapas completas mostram checkmark (✅)
```

### 6.4 Fluxo de Logout

```
1. Frontend chama Supabase Auth signOut()
   ↓
2. Frontend marca sessao_ativa como revogado
   ↓
3. Log de acesso registra "logout"
   ↓
4. Redirect para landing page
```

### 6.5 Matriz de Permissões (RLS)

| Tabela | Candidato | RH (Visualizador) | RH (Recrutador) | RH (Gerente) | RH (Admin) |
|--------|-----------|-------------------|-----------------|--------------|------------|
| **candidatos** | Ler/Editar próprio | Ler todos | Ler todos | Ler todos | Ler/Editar todos |
| **usuarios_rh** | ❌ Sem acesso | Ler próprio | Ler próprio | Ler todos | CRUD completo |
| **sessoes_ativas** | Ler/Revogar próprias | Ler próprias | Ler próprias | Ler próprias | Ler todas |
| **logs_acesso** | Ler próprios | Ler próprios | Ler próprios | Ler próprios | Ler todos |
| **preferencias_notificacoes** | ❌ Sem acesso | CRUD próprias | CRUD próprias | CRUD próprias | CRUD próprias |
| **vagas_associadas** | ❌ Sem acesso | ❌ Sem acesso | Ler próprias | CRUD todas | CRUD todas |

---

## 7. Considerações Técnicas

### 7.1 Dependências

- **Supabase Account:** Conta ativa no Supabase
- **DB Expert:** Ferramenta para criar estrutura do banco
- **Supabase CLI:** Para migrations locais (opcional)

### 7.2 Ordem de Implementação

**Ordem Recomendada:**

1. ✅ Configurar timezone do banco
2. ✅ Criar função `update_updated_at_column()`
3. ✅ Criar tabela `candidatos`
4. ✅ Criar tabela `usuarios_rh`
5. ✅ Criar tabela `preferencias_notificacoes` (+ trigger automático)
6. ✅ Criar tabela `vagas_associadas_recrutadores` (depende de `vagas` do PRD-DB-002)
7. ✅ Criar tabela `sessoes_ativas`
8. ✅ Criar tabela `logs_acesso`
9. ✅ Criar bucket `avatars` no Storage
10. ✅ Criar RLS policies para todas as tabelas
11. ✅ Criar RLS policies para Storage
12. ✅ Criar views auxiliares
13. ✅ Configurar Supabase Auth (dashboard)
14. ✅ Testar autenticação e permissões

### 7.3 Comandos SQL Consolidados

Para facilitar, todos os comandos SQL estão disponíveis em arquivos separados na estrutura:

```
/tasks/
  └── sql/
      ├── 01-setup-inicial.sql         (timezone, functions)
      ├── 02-tabela-candidatos.sql     (tabela + índices + RLS)
      ├── 03-tabela-usuarios-rh.sql
      ├── 04-tabela-preferencias.sql
      ├── 05-tabela-vagas-assoc.sql
      ├── 06-tabela-sessoes.sql
      ├── 07-tabela-logs.sql
      ├── 08-storage-avatars.sql
      ├── 09-views.sql
      └── 10-auth-config.sql
```

**Nota:** Os arquivos SQL serão criados em outro PRD específico de implementação.

### 7.4 Variáveis de Ambiente

O frontend precisará das seguintes variáveis:

```env
# Supabase
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]

# Optional: Service Role (apenas backend/admin)
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

### 7.5 Estimativa de Tamanho de Dados

**Candidatos (100.000 registros):**
- Tamanho médio por registro: ~2 KB
- Espaço estimado: 200 MB

**Usuarios RH (50 registros):**
- Tamanho médio por registro: ~1 KB
- Espaço estimado: 50 KB

**Sessoes Ativas (500 registros simultâneos):**
- Tamanho médio por registro: ~1 KB
- Espaço estimado: 500 KB

**Logs Acesso (1.000.000 registros/ano):**
- Tamanho médio por registro: ~1 KB
- Espaço estimado: 1 GB/ano
- **Recomendação:** Limpar logs > 1 ano (RF-010)

**Avatares (10.000 fotos):**
- Tamanho médio: 500 KB
- Espaço estimado: 5 GB

**Total estimado (1 ano):** ~6.5 GB

### 7.6 Performance e Otimizações

1. **Índices:** Todos os campos de busca/filtro têm índices
2. **Particionamento:** Considerar particionar `logs_acesso` por data (futuro)
3. **Cache:** Views podem ser materializadas (futuro)
4. **CDN:** Avatares podem usar CDN do Supabase
5. **Connection Pooling:** Supabase já inclui (PgBouncer)

### 7.7 Segurança

1. **RLS Obrigatório:** Todas as tabelas têm RLS habilitado
2. **Soft Delete:** Nunca deletar fisicamente dados sensíveis
3. **Audit Trail:** Campos created_by/updated_by em tudo
4. **IP Logging:** Logs de acesso incluem IP para análise
5. **Session Management:** Controle de sessões ativas
6. **HTTPS Only:** Forçar HTTPS em produção
7. **CORS:** Configurar apenas domínios permitidos

### 7.8 Compliance (LGPD)

1. **Direito ao Esquecimento:** Soft delete permite "esquecer" dados
2. **Portabilidade:** Exports de dados via SQL
3. **Consentimento:** Preferências de notificações
4. **Minimização:** Apenas dados necessários
5. **Pseudonimização:** UUID ao invés de IDs sequenciais
6. **Logs de Acesso:** Rastreabilidade de quem acessou o quê

---

## 8. Métricas de Sucesso

### 8.1 Métricas Técnicas

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Tempo de Login** | < 2 segundos | Time to first byte |
| **Uptime Autenticação** | > 99.9% | Supabase monitoring |
| **Taxa de Erro Login** | < 1% | Logs de erro |
| **Tempo de Cadastro** | < 5 segundos | Frontend analytics |
| **RLS Performance** | < 100ms | Query analysis |

### 8.2 Métricas de Negócio

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Candidatos Cadastrados** | 1000+ no primeiro mês | COUNT em `candidatos` |
| **Taxa de Confirmação Email** | > 80% | `email_verificado = TRUE` |
| **Usuários RH Ativos** | 10+ | `usuarios_rh.ativo = TRUE` |
| **Sessões Ativas Simultâneas** | 100+ | COUNT em `sessoes_ativas` |
| **Tentativas de Login Falhas** | < 5% do total | `logs_acesso.evento = 'login_falha'` |

### 8.3 Queries para Análise

**Total de Candidatos Ativos:**

```sql
SELECT COUNT(*) 
FROM v_candidatos_ativos;
```

**Candidatos por Estado:**

```sql
SELECT estado, COUNT(*) as total
FROM v_candidatos_ativos
GROUP BY estado
ORDER BY total DESC;
```

**Usuários RH por Role:**

```sql
SELECT role, COUNT(*) as total
FROM v_usuarios_rh_ativos
GROUP BY role;
```

**Taxa de Sucesso de Login (últimos 7 dias):**

```sql
SELECT 
    evento,
    COUNT(*) as total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM logs_acesso
WHERE created_at > NOW() - INTERVAL '7 days'
AND evento IN ('login_sucesso', 'login_falha')
GROUP BY evento;
```

**Sessões Ativas por Device Type:**

```sql
SELECT 
    device_type,
    COUNT(*) as total
FROM v_sessoes_ativas_validas
GROUP BY device_type;
```

---

## 9. Questões Em Aberto

### 9.1 Questões Técnicas

1. **Validação de CPF Real:**
   - Implementar validação de dígitos verificadores?
   - Usar serviço externo (ReceitaWS)?
   - **Decisão:** ⏳ Pendente - Inicialmente apenas formato

2. **Geolocalização de IP:**
   - Usar serviço externo (IPInfo, MaxMind)?
   - Armazenar latitude/longitude?
   - **Decisão:** ⏳ Pendente - Apenas país/cidade aproximado

3. **Limpeza de Logs:**
   - Manter logs por quanto tempo? (atualmente 1 ano)
   - Arquivar em storage frio ao invés de deletar?
   - **Decisão:** ⏳ Pendente - Avaliar após 6 meses

4. **Upload de Avatar:**
   - Redimensionar imagem automaticamente (thumbnail)?
   - Usar Supabase Functions para processamento?
   - **Decisão:** ⏳ Pendente - P2

### 9.2 Questões de Negócio

1. **Múltiplas Contas:**
   - Permitir candidato ter múltiplas contas (emails diferentes)?
   - **Decisão Atual:** Não - Email e CPF únicos

2. **Reativação de Conta:**
   - Candidato bloqueado pode solicitar reativação?
   - Como funciona o fluxo?
   - **Decisão:** ⏳ Pendente - P2

3. **Expiração de Dados:**
   - Candidatos inativos > 2 anos são deletados?
   - **Decisão:** ⏳ Pendente - LGPD compliance

### 9.3 Integrações Futuras

1. **OAuth Social Login:**
   - Google, LinkedIn, Facebook
   - **Status:** P3 (futuro)

2. **2FA:**
   - SMS, Authenticator App
   - **Status:** P3 (futuro)

3. **SSO Corporativo:**
   - Para empresas parceiras
   - **Status:** Não planejado

---

## ✅ Checklist de Implementação

### Fase 1: Setup Inicial
- [ ] Criar projeto Supabase
- [ ] Configurar timezone
- [ ] Criar função `update_updated_at_column()`
- [ ] Configurar variáveis de ambiente

### Fase 2: Tabelas Core
- [ ] Criar tabela `candidatos`
- [ ] Criar índices e constraints
- [ ] Criar RLS policies para `candidatos`
- [ ] Testar insert/update/delete

### Fase 3: Tabelas RH
- [ ] Criar tabela `usuarios_rh`
- [ ] Criar tabela `preferencias_notificacoes`
- [ ] Criar trigger para preferências padrão
- [ ] Criar RLS policies
- [ ] Testar CRUD completo

### Fase 4: Segurança
- [ ] Criar tabela `sessoes_ativas`
- [ ] Criar tabela `logs_acesso`
- [ ] Criar funções de limpeza (cron)
- [ ] Criar RLS policies
- [ ] Testar logging automático

### Fase 5: Storage
- [ ] Criar bucket `avatars`
- [ ] Configurar limites e formatos
- [ ] Criar RLS policies para storage
- [ ] Testar upload/download

### Fase 6: Views e Otimizações
- [ ] Criar views auxiliares
- [ ] Testar performance de queries
- [ ] Criar índices adicionais se necessário

### Fase 7: Auth Config
- [ ] Configurar Supabase Auth (dashboard)
- [ ] Testar signup de candidato
- [ ] Testar signup de RH (manual)
- [ ] Testar login/logout
- [ ] Testar reset de senha

### Fase 8: Testes Finais
- [ ] Testar todas as RLS policies
- [ ] Testar soft delete
- [ ] Testar auditoria (created_by/updated_by)
- [ ] Teste de carga (opcional)
- [ ] Documentar credenciais de teste

---

## 📝 Notas Finais

### Dependências Externas

Este PRD **depende** de:
- ✅ Conta Supabase ativa
- ✅ DB Expert configurado
- ⏳ PRD-DB-002 (tabela `vagas`) para `vagas_associadas_recrutadores`

Este PRD **será usado por:**
- 🔄 PRD-DEV-001 (Cadastro de Candidatos)
- 🔄 PRD-DEV-002 (Login Candidatos)
- 🔄 PRD-DEV-003 (Login RH)
- 🔄 PRD-DEV-004 (Recuperação de Senha)

### Próximos Passos

Após implementar este PRD:
1. ✅ Atualizar checkpoint
2. 🔄 Criar PRD-DB-002 (Vagas e Candidaturas)
3. 🔄 Criar arquivos SQL individuais (opcional)
4. 🔄 Testar autenticação end-to-end

---

**FIM DO PRD-DB-001**

**Versão:** 1.0  
**Status:** 📋 Pronto para Implementação  
**Próxima Revisão:** Após implementação

---

## 📎 Anexos

### A.1 Glossário

- **RLS:** Row Level Security - Segurança a nível de linha no PostgreSQL
- **UUID:** Universally Unique Identifier - Identificador único universal
- **Soft Delete:** Exclusão lógica (flag deleted_at) ao invés de exclusão física
- **BaaS:** Backend as a Service
- **Auth:** Autenticação
- **LGPD:** Lei Geral de Proteção de Dados
- **Trigger:** Procedimento automático executado em eventos do banco

### A.2 Referências

- Supabase Docs: https://supabase.com/docs
- PostgreSQL RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- LGPD: http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

---

**Documento criado em:** 02 de Novembro de 2025  
**Última atualização:** 02 de Novembro de 2025  
**Autor:** Equipe Beauty Smile  
**Revisor:** Pendente
