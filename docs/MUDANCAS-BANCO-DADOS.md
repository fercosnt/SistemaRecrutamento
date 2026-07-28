# Mudanças Necessárias no Banco de Dados

## Resumo das Alterações

O formulário de cadastro foi simplificado de **5 para 4 etapas**, com as seguintes mudanças:

### Alterações Realizadas no Código:

1. **✅ Adicionados campos de redes sociais em Dados Pessoais:**
   - Instagram (opcional)
   - LinkedIn (opcional)

2. **✅ Removida etapa de Dados Profissionais:**
   - Todo o step 3 foi removido do formulário

3. **✅ Removidos campos de mobilidade da Disponibilidade:**
   - aceita_viajar
   - aceita_mudanca

---

## 📋 Alterações Necessárias no Banco de Dados

### 1. Tabela `candidatos` - ADICIONAR COLUNAS

**SQL para adicionar Instagram e LinkedIn:**

```sql
-- Adicionar coluna Instagram (opcional)
ALTER TABLE candidatos
ADD COLUMN instagram VARCHAR(255) NULL;

-- Adicionar coluna LinkedIn (opcional)
ALTER TABLE candidatos
ADD COLUMN linkedin VARCHAR(255) NULL;

-- Adicionar comentários nas colunas
COMMENT ON COLUMN candidatos.instagram IS 'Instagram do candidato (@usuario ou URL completa)';
COMMENT ON COLUMN candidatos.linkedin IS 'LinkedIn do candidato (linkedin.com/in/usuario ou URL completa)';
```

**Verificação:**
```sql
-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'candidatos'
AND column_name IN ('instagram', 'linkedin');
```

---

### 2. Considerações sobre Dados Profissionais

**❗ IMPORTANTE**: O formulário não coleta mais dados profissionais na etapa de cadastro, mas a tabela `dados_profissionais` **não deve ser removida** pois pode conter dados históricos.

**Opções:**

#### Opção A: Manter tabela e inserir valores default (RECOMENDADO)
Se o cadastroService ainda faz insert em `dados_profissionais`, ajustar para valores default:

```typescript
// No cadastroService.ts, comentar ou remover:
// - mapToDadosProfissionaisInsert()
// - Insert em dados_profissionais (linhas 384-414)
```

**OU criar dados profissionais vazios automaticamente:**

```sql
-- Trigger para criar registro default quando candidato for criado
CREATE OR REPLACE FUNCTION criar_dados_profissionais_default()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO dados_profissionais (
    candidato_id,
    possui_experiencia,
    anos_experiencia,
    possui_cnh,
    categoria_cnh
  ) VALUES (
    NEW.id,
    false,  -- Sem experiência por padrão
    0,      -- 0 anos
    false,  -- Sem CNH
    NULL    -- Sem categoria
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_dados_profissionais
AFTER INSERT ON candidatos
FOR EACH ROW
EXECUTE FUNCTION criar_dados_profissionais_default();
```

#### Opção B: Tornar dados_profissionais opcionais
- Permitir que `dados_profissionais` seja NULL ou não exista para novos cadastros
- Dados profissionais podem ser preenchidos posteriormente em um processo separado

---

### 3. Verificar Foreign Keys e Constraints

**Verificar se há constraints que impedem candidatos sem dados profissionais:**

```sql
-- Listar todas as foreign keys relacionadas
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('candidatos', 'dados_profissionais')
AND tc.constraint_type = 'FOREIGN KEY';
```

---

## 🔄 Mudanças no CadastroService

### Antes (5 etapas):
```
1. Criar usuário Auth
2. Inserir candidatos
3. Inserir enderecos
4. Inserir dados_profissionais ❌ REMOVIDO
5. Inserir disponibilidade
6. Inserir autorizacoes
7. Notificar N8N
```

### Depois (4 etapas):
```
1. Criar usuário Auth
2. Inserir candidatos (com instagram/linkedin)
3. Inserir enderecos
4. Inserir disponibilidade (sem mobilidade)
5. Inserir autorizacoes
6. Notificar N8N
```

---

## ⚠️ Ações Recomendadas

### Desenvolvimento/Staging:
1. ✅ Adicionar colunas `instagram` e `linkedin` na tabela `candidatos`
2. ✅ Testar formulário completo com dados reais
3. ⚠️ Decidir sobre dados profissionais:
   - Criar trigger para inserir valores default? OU
   - Comentar código que insere em dados_profissionais? OU
   - Tornar insert opcional no service?

### Produção:
1. Fazer backup completo do banco de dados
2. Executar migrations em horário de baixo tráfego
3. Testar rollback caso necessário

---

## 📝 Script de Migration Completo

```sql
-- ============================================
-- MIGRATION: Adicionar redes sociais aos candidatos
-- Data: 2025-01-09
-- Descrição: Adiciona Instagram e LinkedIn na tabela candidatos
-- ============================================

BEGIN;

-- 1. Adicionar colunas
ALTER TABLE candidatos
ADD COLUMN instagram VARCHAR(255) NULL,
ADD COLUMN linkedin VARCHAR(255) NULL;

-- 2. Comentários
COMMENT ON COLUMN candidatos.instagram IS 'Instagram do candidato (@usuario ou URL completa)';
COMMENT ON COLUMN candidatos.linkedin IS 'LinkedIn do candidato (linkedin.com/in/usuario ou URL completa)';

-- 3. Verificação
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidatos' AND column_name = 'instagram'
  ) THEN
    RAISE EXCEPTION 'Falha ao adicionar coluna instagram';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidatos' AND column_name = 'linkedin'
  ) THEN
    RAISE EXCEPTION 'Falha ao adicionar coluna linkedin';
  END IF;

  RAISE NOTICE 'Migration executada com sucesso!';
END $$;

COMMIT;
```

---

## 🧪 Testes Requeridos

Após aplicar as mudanças no banco de dados:

1. **Teste de cadastro completo:**
   - Preencher todos os campos incluindo Instagram e LinkedIn
   - Verificar se dados são salvos corretamente

2. **Teste sem redes sociais:**
   - Deixar Instagram e LinkedIn vazios
   - Verificar se NULL é aceito

3. **Teste de validação:**
   - Instagram inválido (ex: "teste" sem @)
   - LinkedIn inválido (ex: URL de outro site)

4. **Verificar logs:**
   - Console do browser sem erros
   - Logs do Supabase sem erros 500

---

## 📊 Campos do Formulário - Comparativo

### ANTES (5 etapas):
| Etapa | Campos |
|-------|--------|
| 1. Dados Pessoais | nome, cpf, email, telefone, data_nascimento, genero |
| 2. Endereço | cep, logradouro, numero, complemento, bairro, cidade, estado |
| 3. Dados Profissionais ❌ | experiência, escolaridade, instituição, curso, ano, cnh, categorias |
| 4. Disponibilidade | turno, modelo_trabalho, disponibilidade_imediata, data, ~~viajar~~, ~~mudança~~ |
| 5. Autorizações | uso_dados, comunicação, retenção, análise_vídeo |

### DEPOIS (4 etapas):
| Etapa | Campos |
|-------|--------|
| 1. Dados Pessoais | nome, cpf, email, telefone, data_nascimento, genero, **instagram ✨**, **linkedin ✨** |
| 2. Endereço | cep, logradouro, numero, complemento, bairro, cidade, estado |
| 3. Disponibilidade | turno, modelo_trabalho, disponibilidade_imediata, data |
| 4. Autorizações | uso_dados, comunicação, retenção, análise_vídeo |

---

## ✅ Checklist de Implementação

- [x] Código: Adicionar Instagram/LinkedIn aos schemas
- [x] Código: Remover step Dados Profissionais
- [x] Código: Remover campos de mobilidade
- [x] Código: Atualizar cadastroService
- [ ] **BANCO: Executar migration para adicionar colunas**
- [ ] **BANCO: Decidir sobre dados_profissionais (trigger/opcional/comentar)**
- [ ] Teste: Cadastro completo funciona
- [ ] Teste: Validações Instagram/LinkedIn
- [ ] Teste: Campos opcionais aceitam NULL

---

## 🆘 Rollback (caso necessário)

```sql
-- Remover colunas adicionadas (CUIDADO: perde dados!)
ALTER TABLE candidatos
DROP COLUMN instagram,
DROP COLUMN linkedin;
```

**⚠️ ATENÇÃO**: Isso apagará todos os dados de Instagram/LinkedIn já cadastrados!
