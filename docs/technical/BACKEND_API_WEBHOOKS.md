# Backend API & Webhooks Documentation

**Data:** 2025-11-04
**Projeto Supabase:** isljnozzlvckrgjjbjwp
**Status:** ✅ Backend 100% Pronto

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Webhooks Disponíveis](#webhooks-disponíveis)
3. [N8N Integration](#n8n-integration)
4. [Make (Integromat) Integration](#make-integromat-integration)
5. [Functions SQL Disponíveis](#functions-sql-disponíveis)
6. [Email Templates](#email-templates)
7. [Logs e Auditoria](#logs-e-auditoria)

---

## 🎯 Visão Geral

O sistema oferece 12 tipos de webhooks configuráveis para integração com plataformas de automação como N8N, Make (Integromat), Zapier, etc.

### Tipos de Webhook Disponíveis

| Tipo | Descrição | Quando Disparar |
|------|-----------|-----------------|
| `analise_formulario` | Análise IA das respostas do formulário | Após candidato responder formulário |
| `analise_bigfive` | Análise IA do teste Big Five | Após completar 100 questões |
| `analise_disc` | Análise IA do teste DISC | Após completar 28 questões |
| `analise_raven` | Análise cognitiva do teste Raven | Após completar 60 questões |
| `analise_cultura` | Análise IA das respostas de cultura | Após responder perguntas de cultura |
| `analise_entrevista` | Transcrição e análise de entrevista | Após upload de gravação |
| `envio_email` | Envio de emails usando templates | Vários gatilhos |
| `lembretes` | Sistema de lembretes automáticos | Agendamento diário |
| `notificacao_nova_candidatura` | Notificar RH de nova candidatura | Após INSERT em candidaturas |
| `notificacao_teste_concluido` | Notificar RH de teste finalizado | Após completar teste |
| `backup` | Backup automático de dados | Agendamento semanal |
| `outro` | Webhook customizado | Conforme necessidade |

---

## 🪝 Webhooks Disponíveis

### Configuração de Webhook

**Tabela:** `webhooks_config`

```typescript
interface WebhookConfig {
  id: string
  tipo: TipoWebhook
  nome: string
  url: string
  metodo_http: 'POST' | 'GET' | 'PUT' | 'PATCH'
  headers: Record<string, string> | null
  ativo: boolean

  // Retry logic
  max_tentativas: number // default: 3
  timeout_segundos: number // default: 30

  // Rate limiting
  delay_entre_tentativas_segundos: number // default: 5

  // Métricas
  total_chamadas: number
  total_sucessos: number
  total_falhas: number
  ultima_chamada: string | null
  ultimo_erro: string | null

  // Auditoria
  created_at: string
  updated_at: string
  deleted_at: string | null
}
```

### 1. Webhook: Análise de Formulário (IA)

**Tipo:** `analise_formulario`
**Gatilho:** Após candidato responder formulário de candidatura
**Payload:**

```json
{
  "tipo": "analise_formulario",
  "timestamp": "2025-11-04T10:30:00Z",
  "data": {
    "candidatura_id": "uuid-candidatura",
    "candidato": {
      "id": "uuid-candidato",
      "nome_completo": "João Silva",
      "email": "joao@example.com"
    },
    "vaga": {
      "id": "uuid-vaga",
      "titulo": "Desenvolvedor Full Stack",
      "departamento": "Engenharia"
    },
    "respostas_formulario": [
      {
        "bloco": "jornada",
        "pergunta": "Por que você quer trabalhar aqui?",
        "resposta_texto": "Texto da resposta..."
      },
      {
        "bloco": "tecnologia",
        "pergunta": "Quais tecnologias você domina?",
        "resposta_opcoes": ["JavaScript", "TypeScript", "React"]
      }
    ]
  }
}
```

**Resposta Esperada (IA):**

```json
{
  "score_formulario": 85.5,
  "analise_ia": {
    "pontos_fortes": ["Experiência sólida em React", "Boa comunicação"],
    "pontos_atencao": ["Falta experiência em Node.js"],
    "fit_cultural": 4,
    "fit_tecnico": 5,
    "resumo": "Candidato promissor com experiência relevante..."
  },
  "recomendacao": "avancar" // ou "rejeitar" ou "revisar_manual"
}
```

**Atualizar candidatura após webhook:**

```typescript
await supabase
  .from('candidaturas')
  .update({
    score_formulario: response.score_formulario,
    analise_ia_formulario: response.analise_ia,
  })
  .eq('id', candidatura_id)
```

### 2. Webhook: Análise Big Five

**Tipo:** `analise_bigfive`
**Gatilho:** Após candidato completar 100 questões Big Five
**Payload:**

```json
{
  "tipo": "analise_bigfive",
  "timestamp": "2025-11-04T11:00:00Z",
  "data": {
    "candidatura_id": "uuid-candidatura",
    "candidato": {
      "id": "uuid-candidato",
      "nome_completo": "Maria Santos",
      "email": "maria@example.com"
    },
    "scores": {
      "openness": 75.2,
      "conscientiousness": 82.5,
      "extraversion": 68.0,
      "agreeableness": 90.5,
      "neuroticism": 35.0
    },
    "perfil": {
      "dominante": "agreeableness",
      "secundario": "conscientiousness"
    }
  }
}
```

**Resposta Esperada (IA):**

```json
{
  "analise_ia": {
    "resumo_personalidade": "Pessoa empática e organizada, ideal para trabalho em equipe...",
    "fit_cargo": 4,
    "recomendacoes": [
      "Candidato demonstra alta complacência, ótimo para ambientes colaborativos",
      "Baixo neuroticismo indica estabilidade emocional"
    ]
  }
}
```

### 3. Webhook: Análise DISC

**Tipo:** `analise_disc`
**Gatilho:** Após candidato completar 28 questões DISC
**Payload:**

```json
{
  "tipo": "analise_disc",
  "timestamp": "2025-11-04T11:30:00Z",
  "data": {
    "candidatura_id": "uuid-candidatura",
    "scores": {
      "D": 28,
      "I": 12,
      "S": 8,
      "C": 16
    },
    "perfil_dominante": "D",
    "perfil_secundario": "C"
  }
}
```

**Resposta Esperada:**

```json
{
  "analise_ia": {
    "descricao_perfil": "Perfil DOMINADOR - Focado em resultados, decisivo...",
    "pontos_fortes": ["Liderança", "Tomada de decisão rápida"],
    "areas_desenvolvimento": ["Empatia", "Paciência"],
    "fit_cargo": 5
  }
}
```

### 4. Webhook: Análise Raven (Cognitivo)

**Tipo:** `analise_raven`
**Gatilho:** Após candidato completar 60 questões Raven
**Payload:**

```json
{
  "tipo": "analise_raven",
  "timestamp": "2025-11-04T12:00:00Z",
  "data": {
    "candidatura_id": "uuid-candidatura",
    "acertos": 52,
    "total_questoes": 60,
    "percentil": 85,
    "classificacao": "Superior",
    "acertos_por_serie": {
      "A": 10,
      "B": 11,
      "C": 9,
      "D": 11,
      "E": 11
    },
    "tempo_total_segundos": 1800
  }
}
```

**Resposta Esperada:**

```json
{
  "analise_ia": {
    "raciocinio_logico": "Excelente capacidade de raciocínio abstrato",
    "resolucao_problemas": "Superior à média",
    "fit_cargo": 5,
    "recomendacao": "avancar"
  }
}
```

### 5. Webhook: Análise de Cultura

**Tipo:** `analise_cultura`
**Gatilho:** Após candidato responder perguntas de cultura da vaga
**Payload:**

```json
{
  "tipo": "analise_cultura",
  "timestamp": "2025-11-04T12:30:00Z",
  "data": {
    "candidatura_id": "uuid-candidatura",
    "respostas_cultura": [
      {
        "pergunta": "Descreva uma situação onde você liderou um projeto...",
        "resposta": "No meu último emprego, liderei...",
        "tempo_resposta_segundos": 180
      }
    ]
  }
}
```

**Resposta Esperada:**

```json
{
  "score_cultura": 88.0,
  "analise_ia": {
    "valores_alinhados": ["Inovação", "Colaboração", "Excelência"],
    "valores_conflito": [],
    "fit_cultural": 5,
    "resumo": "Candidato demonstra forte alinhamento com valores da empresa..."
  }
}
```

### 6. Webhook: Transcrição de Entrevista

**Tipo:** `analise_entrevista`
**Gatilho:** Após upload de gravação de entrevista
**Payload:**

```json
{
  "tipo": "analise_entrevista",
  "timestamp": "2025-11-04T13:00:00Z",
  "data": {
    "entrevista_id": "uuid-entrevista",
    "candidatura_id": "uuid-candidatura",
    "tipo_entrevista": "online",
    "gravacao_url": "https://storage.supabase.co/...",
    "duracao_segundos": 3600,
    "formato": "webm"
  }
}
```

**Resposta Esperada (Speech-to-Text + IA):**

```json
{
  "transcricao": "Texto completo da entrevista...",
  "analise_ia": {
    "comunicacao": 4,
    "clareza": 5,
    "conhecimento_tecnico": 4,
    "fit_cultural": 5,
    "pontos_fortes": ["Ótima comunicação", "Sólido conhecimento técnico"],
    "pontos_atencao": ["Pouca experiência com metodologias ágeis"],
    "resumo": "Candidato demonstrou excelente fit..."
  }
}
```

### 7. Webhook: Envio de Email

**Tipo:** `envio_email`
**Gatilho:** Vários (nova candidatura, convite para teste, aprovação, rejeição)
**Payload:**

```json
{
  "tipo": "envio_email",
  "timestamp": "2025-11-04T14:00:00Z",
  "data": {
    "template": "convite_bigfive",
    "destinatario": {
      "email": "candidato@example.com",
      "nome": "João Silva"
    },
    "variaveis": {
      "nome_candidato": "João",
      "nome_vaga": "Desenvolvedor Full Stack",
      "link_teste": "https://app.sistema.com/testes/bigfive/uuid-teste",
      "prazo": "2025-11-10"
    }
  }
}
```

**Templates Disponíveis:**

- `boas_vindas_candidato`
- `confirmacao_candidatura`
- `convite_bigfive`
- `convite_disc`
- `convite_raven`
- `convite_cultura`
- `convite_entrevista_online`
- `convite_entrevista_presencial`
- `lembrete_teste`
- `lembrete_entrevista`
- `aprovado_proxima_etapa`
- `aprovado_final`
- `rejeitado`
- `feedback_positivo`
- `recuperacao_senha`

### 8. Webhook: Lembretes Automáticos

**Tipo:** `lembretes`
**Gatilho:** Cron job diário (verificar testes/entrevistas pendentes)
**Payload:**

```json
{
  "tipo": "lembretes",
  "timestamp": "2025-11-04T09:00:00Z",
  "data": {
    "lembretes_testes": [
      {
        "candidato_id": "uuid-candidato",
        "email": "candidato@example.com",
        "teste_pendente": "bigfive",
        "dias_desde_convite": 3
      }
    ],
    "lembretes_entrevistas": [
      {
        "candidato_id": "uuid-candidato",
        "email": "candidato@example.com",
        "entrevista_data": "2025-11-05T10:00:00Z",
        "tipo": "online",
        "link": "https://meet.google.com/..."
      }
    ]
  }
}
```

### 9. Webhook: Nova Candidatura (Notificação RH)

**Tipo:** `notificacao_nova_candidatura`
**Gatilho:** Após INSERT em tabela `candidaturas`
**Payload:**

```json
{
  "tipo": "notificacao_nova_candidatura",
  "timestamp": "2025-11-04T15:00:00Z",
  "data": {
    "candidatura_id": "uuid-candidatura",
    "vaga": {
      "id": "uuid-vaga",
      "titulo": "Desenvolvedor Full Stack",
      "departamento": "Engenharia"
    },
    "candidato": {
      "nome_completo": "João Silva",
      "email": "joao@example.com",
      "cidade": "São Paulo",
      "estado": "SP"
    },
    "origem_candidatura": "linkedin"
  }
}
```

**Resposta Esperada:** Enviar notificação por Slack/Email para recrutadores responsáveis pela vaga.

---

## 🔧 N8N Integration

### Setup N8N

**1. Criar Workflow no N8N**

```yaml
Workflow: Sistema de Recrutamento - Análise IA

Nodes:
1. Webhook (POST) → Receber payload do Supabase
2. Switch → Verificar tipo de webhook
3. OpenAI GPT-4 → Análise de respostas
4. HTTP Request → Atualizar candidatura no Supabase
5. Email/Slack → Notificar RH
```

**2. Configurar Webhook no N8N**

- URL: `https://n8n.yourdomain.com/webhook/supabase-recrutamento`
- Método: POST
- Authentication: Bearer Token (configurar no header)

**3. Configurar Webhook no Supabase**

```sql
INSERT INTO webhooks_config (tipo, nome, url, metodo_http, headers, ativo)
VALUES (
  'analise_formulario',
  'N8N - Análise Formulário IA',
  'https://n8n.yourdomain.com/webhook/supabase-recrutamento',
  'POST',
  '{"Authorization": "Bearer SEU_TOKEN_AQUI", "Content-Type": "application/json"}',
  TRUE
);
```

### Example N8N Workflow: Análise de Formulário

**Node 1: Webhook Trigger**
```json
{
  "method": "POST",
  "path": "/webhook/supabase-recrutamento"
}
```

**Node 2: Switch (Verificar tipo)**
```javascript
if (items[0].json.tipo === 'analise_formulario') {
  return 0; // Route to OpenAI analysis
} else if (items[0].json.tipo === 'analise_bigfive') {
  return 1; // Route to personality analysis
}
```

**Node 3: OpenAI GPT-4 (Análise)**
```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "Você é um especialista em recrutamento. Analise as respostas do candidato e forneça uma avaliação detalhada."
    },
    {
      "role": "user",
      "content": "Candidato: {{$json.data.candidato.nome_completo}}\nVaga: {{$json.data.vaga.titulo}}\n\nRespostas:\n{{JSON.stringify($json.data.respostas_formulario)}}\n\nForneça:\n1. Score de 0-100\n2. Pontos fortes (lista)\n3. Pontos de atenção (lista)\n4. Fit cultural (1-5)\n5. Fit técnico (1-5)\n6. Resumo (200 palavras)\n7. Recomendação: avancar, rejeitar ou revisar_manual\n\nResposta em JSON."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Node 4: HTTP Request (Atualizar Supabase)**
```json
{
  "method": "PATCH",
  "url": "https://isljnozzlvckrgjjbjwp.supabase.co/rest/v1/candidaturas",
  "queryParameters": {
    "id": "eq.{{$json.data.candidatura_id}}"
  },
  "headers": {
    "apikey": "SUPABASE_ANON_KEY",
    "Authorization": "Bearer SUPABASE_ANON_KEY",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  "body": {
    "score_formulario": "{{$json.score_formulario}}",
    "analise_ia_formulario": "{{JSON.stringify($json.analise_ia)}}"
  }
}
```

**Node 5: Send Email (Notificar RH)**
```json
{
  "toEmail": "rh@empresa.com",
  "subject": "Nova análise IA disponível - {{$json.data.candidato.nome_completo}}",
  "html": "<h2>Análise concluída</h2><p>Score: {{$json.score_formulario}}</p><p>Recomendação: {{$json.recomendacao}}</p>"
}
```

---

## 🔌 Make (Integromat) Integration

### Setup Make

**1. Criar Scenario no Make**

```yaml
Scenario: Sistema de Recrutamento - Webhook Handler

Modules:
1. Webhooks → Custom Webhook (trigger)
2. Router → Direcionar por tipo de webhook
3. OpenAI → Create Completion (GPT-4)
4. Supabase → Update Record
5. Gmail/Slack → Send Notification
```

**2. Configurar Webhook no Make**

- Copiar URL do webhook gerado pelo Make
- Exemplo: `https://hook.us1.make.com/abc123def456`

**3. Registrar no Supabase**

```sql
INSERT INTO webhooks_config (tipo, nome, url, metodo_http, ativo)
VALUES (
  'analise_bigfive',
  'Make - Análise Big Five IA',
  'https://hook.us1.make.com/abc123def456',
  'POST',
  TRUE
);
```

### Example Make Scenario: Análise Big Five

**Module 1: Custom Webhook**
- Listening URL: `https://hook.us1.make.com/abc123def456`
- Data structure: Auto-detect from first webhook

**Module 2: Router**
- Route 1: Filter `tipo = "analise_bigfive"`
- Route 2: Filter `tipo = "analise_disc"`
- Route 3: Filter `tipo = "analise_raven"`

**Module 3: OpenAI (GPT-4)**
- Model: GPT-4
- Role: System
  ```
  Você é um psicólogo especializado em avaliação de personalidade Big Five.
  ```
- Prompt:
  ```
  Analise o perfil Big Five do candidato:
  - Openness: {{data.scores.openness}}
  - Conscientiousness: {{data.scores.conscientiousness}}
  - Extraversion: {{data.scores.extraversion}}
  - Agreeableness: {{data.scores.agreeableness}}
  - Neuroticism: {{data.scores.neuroticism}}

  Forneça:
  1. Resumo da personalidade (150 palavras)
  2. Fit para o cargo (1-5)
  3. Recomendações (lista)

  Resposta em JSON.
  ```

**Module 4: Supabase Update**
- URL: `https://isljnozzlvckrgjjbjwp.supabase.co/rest/v1/candidaturas`
- Method: PATCH
- Query: `id=eq.{{data.candidatura_id}}`
- Headers:
  ```json
  {
    "apikey": "SUPABASE_ANON_KEY",
    "Authorization": "Bearer SUPABASE_ANON_KEY",
    "Content-Type": "application/json"
  }
  ```
- Body:
  ```json
  {
    "analise_ia_bigfive": "{{openai.analise_ia}}"
  }
  ```

**Module 5: Gmail (Notificar)**
- To: `rh@empresa.com`
- Subject: `Análise Big Five concluída - {{data.candidato.nome_completo}}`
- Body: HTML template com resumo

---

## 🛠️ Functions SQL Disponíveis

### 1. calcular_score_geral

**Descrição:** Calcula score consolidado da candidatura (média ponderada)

**Chamada:**
```typescript
const { data, error } = await supabase.rpc('calcular_score_geral', {
  candidatura_uuid: 'uuid-candidatura'
})
// Retorna: DECIMAL(5,2) - Exemplo: 85.50
```

**Pesos:**
- Formulário: 15%
- Big Five: 15%
- DISC: 10%
- Raven: 20%
- Cultura: 30%
- Entrevistas: 10%

### 2. avancar_etapa

**Descrição:** Avança candidato para próxima etapa do processo

**Chamada:**
```typescript
const { data, error } = await supabase.rpc('avancar_etapa', {
  candidatura_uuid: 'uuid-candidatura',
  usuario_rh_uuid: 'uuid-usuario-rh'
})
```

**Fluxo de Etapas:**
```
triagem → bigfive → disc → entrevista_online → raven → cultura → entrevista_presencial → aprovado
```

### 3. rejeitar_candidato

**Descrição:** Rejeita candidato e finaliza processo

**Chamada:**
```typescript
const { data, error } = await supabase.rpc('rejeitar_candidato', {
  candidatura_uuid: 'uuid-candidatura',
  usuario_rh_uuid: 'uuid-usuario-rh',
  motivo: 'Perfil não alinhado com requisitos da vaga'
})
```

### 4. agendar_entrevista_online

**Descrição:** Agenda entrevista online para candidato

**Chamada:**
```typescript
const { data, error } = await supabase.rpc('agendar_entrevista_online', {
  p_candidatura_id: 'uuid-candidatura',
  p_usuario_rh_id: 'uuid-usuario-rh',
  p_data_hora: '2025-11-10T14:00:00Z',
  p_link: 'https://meet.google.com/abc-defg-hij',
  p_observacoes: 'Entrevista técnica - 1h'
})
```

### Mais Functions

Veja documentação completa em: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

- `agendar_entrevista_presencial()`
- `reagendar_entrevista()`
- `cancelar_entrevista()`
- `avaliar_candidato()`
- `registrar_acao_historico()`
- `get_configuracoes()`
- `log_auditoria()`
- `testar_webhook()`

---

## 📧 Email Templates

### Estrutura de Template

**Tabela:** `templates_email`

```typescript
interface TemplateEmail {
  id: string
  tipo: TipoTemplateEmail
  versao: number
  assunto: string
  corpo_html: string
  corpo_texto: string
  variaveis: string[] // Ex: ["nome_candidato", "nome_vaga", "link_teste"]
  ativo: boolean
  created_at: string
  updated_at: string
}
```

### Variáveis Disponíveis

**Comuns a todos:**
- `{{nome_candidato}}` - Nome completo do candidato
- `{{email_candidato}}` - Email do candidato
- `{{nome_vaga}}` - Título da vaga
- `{{nome_empresa}}` - Nome da empresa
- `{{data_atual}}` - Data atual formatada

**Específicas:**
- `{{link_teste}}` - Link para teste psicométrico
- `{{data_entrevista}}` - Data/hora da entrevista
- `{{link_entrevista}}` - Link da videochamada
- `{{prazo}}` - Prazo para completar teste
- `{{motivo_rejeicao}}` - Motivo da rejeição (apenas rejeitado)

### Exemplo: Template Convite Big Five

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Convite para Teste de Personalidade</title>
</head>
<body>
  <h1>Olá, {{nome_candidato}}!</h1>

  <p>Sua candidatura para a vaga de <strong>{{nome_vaga}}</strong> avançou para a próxima etapa! 🎉</p>

  <p>Gostaríamos de conhecer melhor seu perfil de personalidade através do teste <strong>Big Five</strong>.</p>

  <h3>Sobre o Teste:</h3>
  <ul>
    <li>100 questões</li>
    <li>Tempo estimado: 15-20 minutos</li>
    <li>Sem respostas certas ou erradas</li>
  </ul>

  <p><a href="{{link_teste}}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Iniciar Teste</a></p>

  <p><strong>Prazo:</strong> {{prazo}}</p>

  <p>Em caso de dúvidas, responda este email.</p>

  <p>Boa sorte! 🚀</p>

  <p>Equipe de Recrutamento<br>{{nome_empresa}}</p>
</body>
</html>
```

---

## 📊 Logs e Auditoria

### Webhook Logs

**Tabela:** `webhooks_logs` (IMUTÁVEL - Apenas INSERT)

```typescript
interface WebhookLog {
  id: string
  webhook_config_id: string
  payload_enviado: Record<string, any>
  resposta_recebida: Record<string, any> | null
  sucesso: boolean
  tempo_resposta_ms: number | null
  erro: string | null
  created_at: string
}
```

**Query: Logs de um webhook específico**
```typescript
const { data, error } = await supabase
  .from('webhooks_logs')
  .select('*')
  .eq('webhook_config_id', 'uuid-webhook')
  .order('created_at', { ascending: false })
  .limit(100)
```

### Logs de Auditoria

**Tabela:** `logs_auditoria` (IMUTÁVEL - Compliance LGPD)

```typescript
interface LogAuditoria {
  id: string
  usuario_id: string | null
  acao: string
  categoria: CategoriaLogAuditoria
  recurso: string // Ex: "candidaturas", "vagas"
  recurso_id: string | null
  dados_antes: Record<string, any> | null
  dados_depois: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, any> | null
  severidade: SeveridadeLog
  mensagem: string | null
  created_at: string
}
```

**Criar Log de Auditoria:**
```typescript
const { data, error } = await supabase.rpc('log_auditoria', {
  p_usuario_id: 'uuid-usuario',
  p_acao: 'CRIAR_CANDIDATURA',
  p_categoria: 'candidatura',
  p_recurso: 'candidaturas',
  p_recurso_id: 'uuid-candidatura',
  p_dados_antes: null,
  p_dados_depois: candidaturaData,
  p_ip_address: '192.168.1.1',
  p_user_agent: 'Mozilla/5.0...',
  p_metadata: { origem: 'website' },
  p_severidade: 'info',
  p_mensagem: 'Nova candidatura criada para vaga X'
})
```

---

## 🔍 Monitoramento e Debugging

### View: Estatísticas de Webhooks

```sql
SELECT * FROM v_estatisticas_webhooks;
```

Retorna:
```typescript
interface WebhookStats {
  webhook_config_id: string
  nome: string
  tipo: string
  total_chamadas_24h: number
  total_sucessos_24h: number
  total_falhas_24h: number
  taxa_sucesso: number
  tempo_medio_resposta_ms: number
  ultima_chamada: string
  ultimo_erro: string | null
}
```

### Function: Testar Webhook

```typescript
const { data, error } = await supabase.rpc('testar_webhook', {
  p_webhook_config_id: 'uuid-webhook',
  p_payload_teste: {
    tipo: 'analise_formulario',
    data: { teste: true }
  }
})

// Retorna:
// {
//   "sucesso": true,
//   "status_code": 200,
//   "tempo_resposta_ms": 450,
//   "resposta": {...}
// }
```

---

## 📚 Próximos Passos

1. **Configurar Webhooks em Produção**
   - Criar workflow N8N ou Make scenario
   - Configurar URLs e authentication
   - Testar cada tipo de webhook

2. **Implementar Análise IA**
   - Integrar OpenAI GPT-4
   - Criar prompts específicos para cada tipo
   - Validar qualidade das análises

3. **Configurar Email Service**
   - SendGrid, Mailgun ou AWS SES
   - Popular templates de email
   - Testar envio de emails

4. **Monitoramento**
   - Configurar alertas para falhas de webhook
   - Dashboard de métricas
   - Rate limiting e retry logic

---

**Documentação Relacionada:**
- [Frontend Integration Guide](FRONTEND_INTEGRATION_GUIDE.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- [Test Report Consolidated](TEST_REPORT_CONSOLIDATED.md)
