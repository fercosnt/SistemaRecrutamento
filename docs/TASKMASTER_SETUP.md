# Task Master AI - Configuração e Uso no Projeto

**Data de Configuração:** 2025-11-05  
**Versão Task Master:** 0.31.2  
**Status:** ✅ Configurado e Operacional

---

## 📋 Visão Geral

Este documento descreve a configuração completa do Task Master AI MCP no projeto Sistema de Recrutamento Beauty Smile. O Task Master foi configurado para gerenciar todas as tarefas de desenvolvimento baseadas nos 21 PRDs de funcionalidades do projeto.

---

## 🎯 Objetivo da Configuração

O Task Master foi configurado para:
- Gerenciar tarefas de desenvolvimento de forma estruturada
- Organizar tarefas por PRD usando tags
- Facilitar o acompanhamento do progresso do projeto
- Integrar com o fluxo de trabalho existente

---

## ⚙️ Configurações Realizadas

### 1. Inicialização do Projeto

**Comando Executado:**
```bash
task-master init --projectRoot="/Users/fernando/Cursor Repo/DB Sistema de recrutamento"
```

**Configurações Aplicadas:**
- ✅ Estrutura de pastas `.taskmaster/` criada
- ✅ Integração com Git habilitada (`storeTasksInGit: true`)
- ✅ Aliases shell configurados (`tm`, `taskmaster`)
- ✅ Regras para Cursor configuradas

**Estrutura Criada:**
```
.taskmaster/
├── config.json          # Configurações do Task Master
├── state.json           # Estado atual (tag ativa, etc)
├── tasks/
│   └── tasks.json       # Arquivo principal de tarefas
├── docs/                # Documentação adicional
└── reports/             # Relatórios de análise
```

### 2. Configuração de Modelos de AI

**Modelos Configurados:**

#### Modelo Principal
- **Provider:** Anthropic
- **Model:** Claude Sonnet 4.5 (`claude-sonnet-4-20250514`)
- **Max Tokens:** 64,000
- **Temperature:** 0.2
- **Uso:** Geração e atualização de tarefas

#### Modelo de Pesquisa
- **Provider:** Perplexity
- **Model:** Sonar Pro (`sonar-pro`)
- **Max Tokens:** 8,700
- **Temperature:** 0.1
- **Uso:** Pesquisa técnica e análise de complexidade (quando `research: true`)

#### Modelo Fallback
- **Provider:** Google (Gemini CLI)
- **Model:** Gemini 2.5 Pro (`gemini-2.5-pro`)
- **Max Tokens:** 65,536
- **Temperature:** 0.2
- **Uso:** Backup caso o modelo principal falhe

**Arquivo de Configuração:** `.taskmaster/config.json`

### 3. Configuração de Idioma

**Idioma Configurado:** Português

Todas as respostas, tarefas e documentação geradas pelo Task Master serão em português, alinhado com o projeto.

### 4. Estratégia de Tags por PRD

**Tags Criadas:** 21 tags (prd-0001 até prd-0021)

Cada PRD de funcionalidade possui sua própria tag para organização:

| Tag | PRD | Descrição | Tarefas |
|-----|-----|-----------|---------|
| prd-0001 | PRD-0001 | Sistema de Cadastro de Candidatos | 9 |
| prd-0002 | PRD-0002 | Sistema de Login Candidatos | 14 |
| prd-0003 | PRD-0003 | Sistema de Login RH/Admin | 10 |
| prd-0004 | PRD-0004 | Sistema de Recuperação de Senha | 10 |
| prd-0005 | PRD-0005 | Fluxo de Aplicação de Vagas | 14 |
| prd-0006 | PRD-0006 | Dashboard Candidato | 13 |
| prd-0007 | PRD-0007 | Teste Big Five | 16 |
| prd-0008 | PRD-0008 | Teste DISC | 13 |
| prd-0009 | PRD-0009 | Teste Raven | 12 |
| prd-0010 | PRD-0010 | Visualização de Resultados de Testes | 27 |
| prd-0011 | PRD-0011 | Integração N8N - Análise de Testes | 10 |
| prd-0012 | PRD-0012 | Dashboard RH/Admin | 12 |
| prd-0013 | PRD-0013 | Gestão de Candidatos | 14 |
| prd-0014 | PRD-0014 | Aprovação/Rejeição de Candidatos | 14 |
| prd-0015 | PRD-0015 | Sistema de Comunicação com Candidatos | 13 |
| prd-0016 | PRD-0016 | CRUD de Vagas | 18 |
| prd-0017 | PRD-0017 | Gestão de Candidaturas por Vaga | 13 |
| prd-0018 | PRD-0018 | Pipeline de Recrutamento | 15 |
| prd-0019 | PRD-0019 | Edição de Perfil Candidato | 13 |
| prd-0020 | PRD-0020 | Configurações do Sistema | 15 |
| prd-0021 | PRD-0021 | Gestão de Documentos RH | 15 |

**Total de Tarefas Geradas:** ~300+ tarefas

### 5. Processamento dos PRDs

**PRDs Processados:** Todos os 21 PRDs de funcionalidades

Cada PRD foi processado individualmente usando o comando `parse_prd` com:
- **NumTasks:** 0 (deixar Task Master decidir automaticamente)
- **Research:** false (pesquisa apenas quando necessário)
- **Append:** true (adicionar tarefas ao arquivo existente)
- **Tag:** Tag específica do PRD

**Ordem de Processamento:**
1. PRD-0001 (Cadastro de Candidatos)
2. PRD-0002 (Login Candidatos)
3. PRD-0003 (Login RH/Admin)
4. PRD-0004 (Recuperação de Senha)
5. PRD-0005 (Aplicação de Vagas)
6. PRD-0006 (Dashboard Candidato)
7. PRD-0007 (Teste Big Five)
8. PRD-0008 (Teste DISC)
9. PRD-0009 (Teste Raven)
10. PRD-0010 (Visualização Resultados)
11. PRD-0011 (Integração N8N)
12. PRD-0012 (Dashboard RH/Admin)
13. PRD-0013 (Gestão de Candidatos)
14. PRD-0014 (Aprovação/Rejeição)
15. PRD-0015 (Comunicação)
16. PRD-0016 (CRUD Vagas)
17. PRD-0017 (Gestão Candidaturas)
18. PRD-0018 (Pipeline Recrutamento)
19. PRD-0019 (Edição Perfil)
20. PRD-0020 (Configurações Sistema)
21. PRD-0021 (Gestão Documentos RH)

---

## 📊 Estatísticas do Projeto

### Validação de Dependências
✅ **Status:** Todas as dependências validadas com sucesso  
✅ **Erros:** Nenhum erro encontrado  
✅ **Ciclos:** Nenhum ciclo de dependência detectado

### Distribuição de Tarefas
- **Total de Tarefas:** ~300+ tarefas
- **Status Atual:** Todas como "pending"
- **Subtarefas:** 0 (serão criadas conforme necessário)
- **Dependências:** Configuradas entre tarefas relacionadas

---

## 🚀 Como Usar o Task Master

### Comandos Básicos

#### Listar Todas as Tarefas
```bash
task-master list
# ou
tm list
```

#### Listar Tarefas por Tag
```bash
task-master list --tag prd-0001
```

#### Ver Próxima Tarefa
```bash
task-master next
```

#### Ver Detalhes de uma Tarefa
```bash
task-master show <id>
# Exemplo: task-master show 1
```

#### Listar Todas as Tags
```bash
task-master tags
```

#### Alternar entre Tags
```bash
task-master use-tag prd-0001
```

#### Marcar Tarefa como Concluída
```bash
task-master set-status --id 1 --status done
```

#### Expandir Tarefa em Subtarefas
```bash
task-master expand --id 1
```

#### Adicionar Nota/Progresso a uma Subtarefa
```bash
task-master update-subtask --id 1.1 --prompt "Implementação concluída: criado componente de validação"
```

### Usando via MCP (Cursor)

O Task Master também está disponível via MCP no Cursor. Use os comandos diretamente no chat:

- `get_tasks` - Listar tarefas
- `next_task` - Próxima tarefa
- `get_task` - Detalhes de tarefa
- `set_task_status` - Atualizar status
- `expand_task` - Expandir tarefa
- `update_subtask` - Atualizar subtarefa

---

## 📁 Estrutura de Arquivos

### Arquivos Criados pelo Task Master

```
.taskmaster/
├── config.json              # Configurações (modelos, idioma, etc)
├── state.json               # Estado atual (tag ativa)
├── tasks/
│   └── tasks.json           # Todas as tarefas organizadas por tags
├── docs/                    # Documentação adicional (se necessário)
└── reports/                 # Relatórios de análise de complexidade
```

### Arquivo Principal: tasks.json

O arquivo `.taskmaster/tasks/tasks.json` contém:
- Todas as tarefas organizadas por tags
- Dependências entre tarefas
- Status de cada tarefa
- Detalhes de implementação
- Estratégias de teste

**⚠️ Importante:** Este arquivo é versionado no Git. Faça commits regulares após atualizar tarefas.

---

## 🔧 Configurações do Ambiente

### Variáveis de Ambiente Necessárias

Para o Task Master funcionar corretamente, certifique-se de ter as seguintes APIs configuradas no `.cursor/mcp.json`:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "sua-chave-anthropic",
    "PERPLEXITY_API_KEY": "sua-chave-perplexity",
    "GOOGLE_API_KEY": "sua-chave-google",
    "OPENAI_API_KEY": "sua-chave-openai"
  }
}
```

### Configuração Atual

O arquivo `.taskmaster/config.json` já está configurado com:
- ✅ Modelos de AI definidos
- ✅ Idioma: Português
- ✅ Tag padrão: master
- ✅ Parâmetros otimizados para o projeto

---

## 📝 Próximos Passos Recomendados

### 1. Começar pelo PRD-0001
O primeiro PRD (Cadastro de Candidatos) é fundamental e deve ser implementado primeiro:

```bash
task-master use-tag prd-0001
task-master next
```

### 2. Expandir Tarefas Complexas
Para tarefas complexas, expanda em subtarefas:

```bash
task-master expand --id 1 --research
```

### 3. Análise de Complexidade
Analise a complexidade das tarefas antes de começar:

```bash
task-master analyze-complexity --tag prd-0001
task-master complexity-report
```

### 4. Atualizar Progresso
Conforme você trabalha, atualize o progresso:

```bash
task-master update-subtask --id 1.1 --prompt "Implementação concluída: validação de CPF funcionando"
task-master set-status --id 1 --status done
```

### 5. Validar Dependências
Periodicamente, valide as dependências:

```bash
task-master validate-dependencies
```

---

## 🎯 Fluxo de Trabalho Recomendado

1. **Selecionar Tag do PRD**
   ```bash
   task-master use-tag prd-0001
   ```

2. **Ver Próxima Tarefa**
   ```bash
   task-master next
   ```

3. **Expandir Tarefa (se necessário)**
   ```bash
   task-master expand --id 1
   ```

4. **Trabalhar na Implementação**
   - Implementar código
   - Testar funcionalidade
   - Documentar progresso

5. **Atualizar Progresso**
   ```bash
   task-master update-subtask --id 1.1 --prompt "Progresso: componente criado"
   ```

6. **Marcar como Concluída**
   ```bash
   task-master set-status --id 1 --status done
   ```

7. **Repetir para Próxima Tarefa**
   ```bash
   task-master next
   ```

---

## 📚 Recursos Adicionais

### Documentação Oficial
- Task Master AI: [Documentação Completa](https://github.com/taskmaster-ai/docs)
- Guia de Workflow: Ver `.cursor/rules/taskmaster/dev_workflow.mdc`

### Comandos Úteis

```bash
# Ver todas as tarefas pendentes
task-master list --status pending

# Ver tarefas concluídas
task-master list --status done

# Ver tarefas com subtarefas
task-master list --with-subtasks

# Pesquisar tarefas
task-master research "melhores práticas para validação de formulários React"

# Gerar arquivos markdown individuais
task-master generate
```

---

## ✅ Checklist de Configuração

- [x] Task Master inicializado
- [x] Modelos de AI configurados
- [x] Idioma configurado (Português)
- [x] Tags criadas para todos os PRDs
- [x] PRDs processados e tarefas geradas
- [x] Dependências validadas
- [x] Estrutura de arquivos criada
- [x] Documentação criada

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte a documentação em `.cursor/rules/taskmaster/`
2. Verifique os logs em `.taskmaster/logs/` (se habilitado)
3. Use `task-master --help` para ajuda com comandos específicos

---

## 📌 Notas Importantes

1. **Backup:** O arquivo `tasks.json` é versionado no Git. Faça commits regulares.

2. **Dependências:** As dependências entre tarefas são importantes. Sempre valide antes de marcar tarefas como concluídas.

3. **Tags:** Use tags para organizar trabalho por PRD. Isso facilita o acompanhamento e evita conflitos.

4. **Research:** Use `--research` apenas quando necessário, pois consome tokens do Perplexity.

5. **Status:** Use os status adequados:
   - `pending` - Aguardando
   - `in-progress` - Em andamento
   - `done` - Concluído
   - `blocked` - Bloqueado
   - `deferred` - Adiado

---

**Última Atualização:** 2025-11-05  
**Versão do Documento:** 1.0.0

