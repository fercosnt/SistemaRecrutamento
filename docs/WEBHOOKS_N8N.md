# Webhooks N8N - Beauty Smile Recruitment System
**Last Updated:** 2025-11-13
**Integration:** N8N Automation Platform

---

## Overview

This system uses **N8N webhooks** for asynchronous processing and automation workflows. The frontend/backend sends events to N8N, which triggers automated workflows for:
- Candidate analysis (AI-powered resume screening)
- Email notifications
- Test score calculations (backup/validation)
- Interview scheduling
- Report generation

---

## Webhook Configuration

### Base Configuration

**Service File:** `src/features/cadastro/services/n8nService.ts`

**Environment Variables:**
```env
# Production
VITE_N8N_WEBHOOK_BASE_URL=https://n8n.yourdomain.com/webhook

# Development/Test
VITE_N8N_WEBHOOK_TEST_BASE_URL=https://n8n.yourdomain.com/webhook-test
```

**Webhook Modes:**
- `production`: Triggers real workflows
- `test`: Triggers test workflows (doesn't send emails, logs only)

---

## Available Webhooks

### 1. Candidato Criado (Candidate Created)

**Event:** `candidato.created`
**Trigger:** After candidate completes signup + initial form
**Workflow ID:** `analise-formulario`

#### Payload

```typescript
{
  event: 'candidato.created',
  timestamp: '2025-01-15T10:30:00.000Z',
  data: {
    candidato: {
      id: 'uuid',
      nome_completo: 'João Silva',
      email: 'joao@email.com',
      telefone: '11987654321',
      cpf: '12345678900'
    },
    vaga_id: 'uuid',  // Optional - if applying to specific job
    metadata: {
      created_at: '2025-01-15T10:30:00.000Z',
      has_all_data: true
    }
  }
}
```

#### Expected Response

```typescript
{
  success: true,
  message: 'Webhook received successfully',
  workflow_id: 'analise-formulario-123',
  estimated_completion: '2025-01-15T10:35:00.000Z'
}
```

#### N8N Workflow Actions
1. **Validate Data:** Check candidate data completeness
2. **AI Analysis:** Analyze candidate profile using GPT
3. **Score Calculation:** Calculate initial fit score
4. **Email:** Send welcome email to candidate
5. **Notify RH:** Send new candidate notification to RH team
6. **Update Database:** Store analysis results

#### Frontend Implementation

```typescript
import { notifyCandidatoCriado } from '@/features/cadastro/services/n8nService'

// After form submission
const result = await notifyCandidatoCriado(
  candidatoId,
  {
    nome_completo: 'João Silva',
    email: 'joao@email.com',
    telefone: '11987654321',
    cpf: '12345678900',
  },
  'production', // or 'test'
  vagaId // Optional
)
```

---

### 2. Teste BigFive Concluído

**Event:** `teste.bigfive.concluido`
**Trigger:** After candidate completes BigFive personality test
**Workflow ID:** `analise-bigfive`

#### Payload

```typescript
{
  event: 'teste.bigfive.concluido',
  timestamp: '2025-01-15T11:00:00.000Z',
  data: {
    candidatura_id: 'uuid',
    candidato_id: 'uuid',
    scores: {
      abertura: 75,
      conscienciosidade: 82,
      extroversao: 68,
      amabilidade: 90,
      neuroticismo: 45
    },
    metadata: {
      total_questoes: 50,
      tempo_conclusao_minutos: 15,
      completed_at: '2025-01-15T11:00:00.000Z'
    }
  }
}
```

#### N8N Workflow Actions
1. Validate scores (must sum correctly)
2. Generate personality report (PDF)
3. Compare with job requirements
4. Update candidate compatibility score
5. Send results email to candidate

---

### 3. Teste DISC Concluído

**Event:** `teste.disc.concluido`
**Workflow ID:** `analise-disc`

#### Payload

```typescript
{
  event: 'teste.disc.concluido',
  timestamp: '2025-01-15T11:30:00.000Z',
  data: {
    candidatura_id: 'uuid',
    candidato_id: 'uuid',
    scores: {
      dominancia: 65,
      influencia: 78,
      estabilidade: 55,
      conformidade: 70
    },
    perfil_dominante: 'I', // D, I, S, or C
    metadata: {
      total_questoes: 28,
      tempo_conclusao_minutos: 8,
      completed_at: '2025-01-15T11:30:00.000Z'
    }
  }
}
```

---

### 4. Teste Raven Concluído

**Event:** `teste.raven.concluido`
**Workflow ID:** `analise-raven`

#### Payload

```typescript
{
  event: 'teste.raven.concluido',
  timestamp: '2025-01-15T12:00:00.000Z',
  data: {
    candidatura_id: 'uuid',
    candidato_id: 'uuid',
    score: {
      acertos: 45,
      total_questoes: 60,
      percentual: 75,
      classificacao: 'superior'
    },
    metadata: {
      tempo_conclusao_minutos: 40,
      completed_at: '2025-01-15T12:00:00.000Z'
    }
  }
}
```

---

### 5. Entrevista Agendada

**Event:** `entrevista.agendada`
**Workflow ID:** `notificacao-entrevista`

#### Payload

```typescript
{
  event: 'entrevista.agendada',
  timestamp: '2025-01-15T14:00:00.000Z',
  data: {
    entrevista_id: 'uuid',
    tipo: 'online', // or 'presencial'
    candidato: {
      id: 'uuid',
      nome: 'João Silva',
      email: 'joao@email.com'
    },
    detalhes: {
      data_agendada: '2025-01-20T10:00:00.000Z',
      duracao_minutos: 60,
      link_videochamada: 'https://meet.google.com/xxx',
      plataforma: 'Google Meet'
    },
    recrutador: {
      id: 'uuid',
      nome: 'Maria Santos',
      email: 'maria@beautysmile.com'
    }
  }
}
```

#### N8N Workflow Actions
1. Send confirmation email to candidate
2. Send calendar invite (ICS file)
3. Add to RH calendar
4. Set up reminder (24h before)
5. Create meeting link (if not provided)

---

### 6. Status Candidatura Alterado

**Event:** `candidatura.status.alterado`
**Workflow ID:** `notificacao-status`

#### Payload

```typescript
{
  event: 'candidatura.status.alterado',
  timestamp: '2025-01-15T15:00:00.000Z',
  data: {
    candidatura_id: 'uuid',
    candidato: {
      id: 'uuid',
      nome: 'João Silva',
      email: 'joao@email.com'
    },
    vaga: {
      id: 'uuid',
      titulo: 'Assistente Odontológico'
    },
    status_anterior: 'em_analise',
    status_novo: 'aprovado',
    etapa_anterior: 'triagem',
    etapa_nova: 'entrevista',
    observacoes: 'Candidato aprovado na primeira etapa'
  }
}
```

#### N8N Workflow Actions
1. Send status update email to candidate
2. Log in CRM/Analytics
3. Trigger next workflow step (e.g., schedule interview)

---

## Webhook Service Implementation

### Current Implementation (Already Exists ✅)

**File:** `src/features/cadastro/services/n8nService.ts`

Key functions:
- `sendToN8N()`: Core webhook sender with retry logic
- `notifyCandidatoCriado()`: Specific for candidate created event
- Automatic retry on failure (3 attempts with exponential backoff)
- Timeout: 10 seconds
- Error logging

### Adding New Webhooks

To add a new webhook event:

```typescript
// 1. Define payload type
export interface NovoEventoPayload {
  event: 'novo.evento'
  timestamp: string
  data: {
    // Your data structure
  }
}

// 2. Create sender function
export async function notifyNovoEvento(
  data: NovoEventoPayload['data'],
  mode: N8NMode = 'production'
): Promise<N8NWebhookResponse> {
  const payload: NovoEventoPayload = {
    event: 'novo.evento',
    timestamp: new Date().toISOString(),
    data,
  }

  return await sendToN8N('workflow-name', payload, mode)
}

// 3. Use in your code
await notifyNovoEvento(
  { /* your data */ },
  'production'
)
```

---

## Testing Webhooks

### 1. Test Mode

Always use `test` mode during development:

```typescript
await notifyCandidatoCriado(
  candidatoId,
  candidatoData,
  'test' // <-- Test mode
)
```

**Test mode characteristics:**
- Uses `VITE_N8N_WEBHOOK_TEST_BASE_URL`
- Doesn't send real emails
- Logs events only
- Returns mocked responses

### 2. Manual Testing with Database Function

```sql
-- Test webhook from database
SELECT testar_webhook('analise-formulario');
```

### 3. Webhook Testing Tool

Use Postman or curl:

```bash
curl -X POST \
  https://n8n.yourdomain.com/webhook/analise-formulario \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "candidato.created",
    "timestamp": "2025-01-15T10:00:00.000Z",
    "data": {
      "candidato": {
        "id": "test-uuid",
        "nome_completo": "Test User",
        "email": "test@example.com",
        "telefone": "11999999999",
        "cpf": "12345678900"
      }
    }
  }'
```

---

## Error Handling

### Retry Logic

The webhook service automatically retries failed requests:

```typescript
export async function sendToN8N(
  workflowName: string,
  payload: any,
  mode: N8NMode = 'production'
): Promise<N8NWebhookResponse> {
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 1000

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(url, payload, { timeout: 10000 })
      return response.data
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
    }
  }
}
```

### Frontend Error Handling

```typescript
try {
  await notifyCandidatoCriado(candidatoId, data, 'production')
  toast.success('Dados enviados para análise!')
} catch (error) {
  // Don't block user flow on webhook failure
  console.error('Webhook failed:', error)
  toast.warning('Análise automática indisponível. Prosseguindo...')

  // Continue with application flow
  navigate('/next-step')
}
```

**Important:** Webhook failures should NOT block the user experience. Log errors but allow the user to continue.

---

## N8N Workflow Setup

### Recommended Workflow Structure

Each webhook should trigger an N8N workflow with these nodes:

1. **Webhook Trigger** - Receives POST request
2. **Validate Payload** - Check required fields
3. **Set Variables** - Extract data for workflow
4. **Main Logic** - Your business logic
5. **Error Handler** - Catch and log errors
6. **Response** - Return success/failure

### Example N8N Workflow (JSON)

```json
{
  "name": "Candidato Criado - Análise",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "analise-formulario",
        "responseMode": "lastNode"
      }
    },
    {
      "name": "Validate Data",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Validate required fields\\nif (!$json.data.candidato.email) {\\n  throw new Error('Missing email')\\n}\\nreturn $json"
      }
    },
    {
      "name": "Send Welcome Email",
      "type": "n8n-nodes-base.sendEmail",
      "parameters": {
        "to": "={{$json.data.candidato.email}}",
        "subject": "Bem-vindo à Beauty Smile!",
        "text": "Olá {{$json.data.candidato.nome_completo}}..."
      }
    }
  ]
}
```

---

## Monitoring & Logging

### Database Logging

All webhook attempts are logged in `webhooks_logs` table:

```sql
SELECT
  id,
  webhook_id,
  evento,
  payload,
  resposta,
  status_code,
  sucesso,
  tempo_resposta_ms,
  created_at
FROM webhooks_logs
WHERE evento = 'candidato.created'
ORDER BY created_at DESC
LIMIT 10;
```

### Webhook Statistics

Use the `v_estatisticas_webhooks` view:

```sql
SELECT * FROM v_estatisticas_webhooks;

-- Returns:
-- total_webhooks: 150
-- webhooks_sucesso: 145
-- webhooks_falha: 5
-- taxa_sucesso: 96.67%
-- tempo_medio_resposta_ms: 850
```

---

## Security

### 1. Webhook Authentication (Recommended)

Add signature verification to N8N workflows:

```typescript
// Backend generates signature
import crypto from 'crypto'

const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex')

// Send in headers
headers: {
  'X-Webhook-Signature': signature
}
```

```javascript
// N8N validates signature
const receivedSignature = $headers['x-webhook-signature']
const calculatedSignature = crypto
  .createHmac('sha256', '{{$env.WEBHOOK_SECRET}}')
  .update(JSON.stringify($json))
  .digest('hex')

if (receivedSignature !== calculatedSignature) {
  throw new Error('Invalid signature')
}
```

### 2. IP Whitelisting

Configure N8N to only accept webhooks from your backend IP.

### 3. HTTPS Only

Always use HTTPS for webhook URLs in production.

---

## Best Practices

1. **Always use test mode during development**
   ```typescript
   const mode = process.env.NODE_ENV === 'production' ? 'production' : 'test'
   ```

2. **Don't block user flow on webhook failures**
   - Log errors but continue execution
   - Show user-friendly messages

3. **Include metadata in payloads**
   - Timestamps
   - Version numbers
   - Source identifiers

4. **Monitor webhook success rates**
   - Alert if success rate drops below 95%
   - Check `v_estatisticas_webhooks` regularly

5. **Implement idempotency**
   - Include unique `request_id` in payload
   - N8N should deduplicate based on `request_id`

6. **Set reasonable timeouts**
   - Current: 10 seconds
   - N8N workflows should respond quickly

---

## Troubleshooting

### Webhook Not Triggering

1. Check environment variables:
   ```bash
   echo $VITE_N8N_WEBHOOK_BASE_URL
   ```

2. Verify N8N workflow is active

3. Check webhook logs:
   ```sql
   SELECT * FROM webhooks_logs WHERE sucesso = false ORDER BY created_at DESC LIMIT 5;
   ```

4. Test manually with curl (see Testing section)

### Slow Response Times

1. Check `tempo_resposta_ms` in logs:
   ```sql
   SELECT AVG(tempo_resposta_ms) FROM webhooks_logs WHERE created_at > NOW() - INTERVAL '1 hour';
   ```

2. Optimize N8N workflow (remove unnecessary nodes)

3. Consider async processing (return 202 Accepted immediately)

### High Failure Rate

1. Check error messages in `webhooks_logs.resposta`

2. Verify N8N server is reachable

3. Check for rate limiting issues

4. Review retry logic configuration

---

## Next Steps

1. Set up N8N server and configure workflows
2. Test each webhook endpoint individually
3. Enable monitoring/alerting for webhook failures
4. Document custom workflows specific to your instance
5. Implement webhook signature verification

For integration help, see:
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- [API_ENDPOINTS.md](./API_ENDPOINTS.md)

---

**Happy Automating!** 🤖
