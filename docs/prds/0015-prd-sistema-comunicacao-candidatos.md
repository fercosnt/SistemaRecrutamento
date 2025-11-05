# PRD-DEV-015: Sistema de Comunicação com Candidatos

## 1. Introduction/Overview

The Sistema de Comunicação com Candidatos provides HR professionals with tools to send individual and bulk emails, manage email templates, track communication history, schedule automated messages, and maintain professional, consistent communication throughout the recruitment process.

**Problem it solves:** HR teams use personal emails, scattered message threads, and inconsistent communication styles, resulting in missed follow-ups, unprofessional messaging, no audit trail, and poor candidate experience. This feature centralizes all candidate communication with templates, tracking, and automation.

**Goal:** Implement a comprehensive email communication system that allows HR to compose and send emails from the platform, use pre-built templates, personalize messages with variables, track all sent emails, schedule future communications, and maintain complete email history per candidate—ensuring professional, timely, and trackable communication.

## 2. Goals

1. Enable sending emails to individual candidates directly from their profile
2. Support bulk email sending to multiple candidates with personalization
3. Provide library of pre-built email templates for common scenarios
4. Allow custom template creation with variable placeholders
5. Track all sent emails with delivery status and open/click rates
6. Display complete email history in candidate timeline
7. Support email scheduling for future delivery
8. Enable rich text formatting with attachments
9. Provide email preview before sending
10. Generate communication analytics (emails sent, response rates, common templates)

## 3. User Stories

### Primary Flow - Individual Communication
**As an** HR professional viewing a candidate profile
**I want to** compose and send an email directly from the platform
**So that** all communication is centralized and tracked

**As a** recruiter
**I want to** select a pre-written template for common messages
**So that** I don't have to write the same email repeatedly

**As an** HR professional
**I want to** personalize template emails with candidate-specific details
**So that** messages feel personal despite being templated

### Secondary Flow - Bulk Communication
**As an** HR manager
**I want to** send the same message to 20 candidates at once
**So that** I can efficiently communicate schedule changes or updates

**As a** recruiter
**I want to** schedule an email to be sent tomorrow
**So that** I can prepare communications in advance

### Tracking & History
**As an** HR professional
**I want to** see all emails I've sent to a candidate
**So that** I can avoid duplicate messages and track conversation

**As an** HR manager
**I want to** view email open rates and click tracking
**So that** I can assess candidate engagement

**As a** compliance officer
**I want** all candidate communications logged and searchable
**So that** we can demonstrate fair, consistent communication

## 4. Functional Requirements

### FR-001: Email Composition Interface
**Access Points:**

1. **Candidate Profile:** "Enviar Email" button in header
2. **Candidate List:** Email icon in actions column
3. **Bulk Toolbar:** "Enviar Email" for selected candidates
4. **Dashboard:** Quick action button

**Compose Modal:**
```
┌─────────────────────────────────────────────────────────┐
│ Enviar Email para João Silva                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ De:       rh@beautysmile.com.br                         │
│ Para:     joao.silva@email.com                          │
│ CC:       [________________________] (opcional)         │
│ Assunto:  [_____________________________________]       │
│                                                         │
│ Template: [Selecione um template ▼] ou escreva livre   │
│                                                         │
│ Mensagem:                                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [B] [I] [U] [Link] [Variáveis ▼]                   │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ Olá {{nome}},                                       │ │
│ │                                                     │ │
│ │ Escreva sua mensagem aqui...                        │ │
│ │                                                     │ │
│ │                                                     │ │
│ │                                                     │ │
│ │ Atenciosamente,                                     │ │
│ │ Equipe Beauty Smile                                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 📎 Anexos: [Adicionar arquivo]                          │
│                                                         │
│ Opções:                                                 │
│ ☐ Agendar envio para: [___/___/___] [__:__]            │
│ ☑ Salvar cópia no histórico do candidato               │
│ ☐ Enviar cópia para mim                                │
│                                                         │
│ [Salvar como Rascunho] [Pré-visualizar] [Enviar]       │
└─────────────────────────────────────────────────────────┘
```

**Rich Text Editor:**
- Bold, Italic, Underline
- Bullet/Numbered lists
- Links
- Text alignment
- Font size (limited options for consistency)
- Text color (brand colors only)

**Variable Placeholders:**
Available via dropdown menu:
- `{{nome}}` → Nome completo do candidato
- `{{primeiro_nome}}` → Primeiro nome apenas
- `{{email}}` → Email do candidato
- `{{vaga}}` → Título da vaga aplicada
- `{{etapa_atual}}` → Etapa atual no processo
- `{{match_score}}` → Percentual de match
- `{{data_cadastro}}` → Data de registro
- `{{proxima_etapa}}` → Nome da próxima etapa
- `{{link_dashboard}}` → URL do dashboard do candidato
- `{{link_teste}}` → Link para teste pendente

**Variable Rendering:**
```typescript
function renderEmailTemplate(template: string, candidato: Candidato, vaga?: Vaga) {
  return template
    .replace(/{{nome}}/g, candidato.nome_completo)
    .replace(/{{primeiro_nome}}/g, candidato.nome_completo.split(' ')[0])
    .replace(/{{email}}/g, candidato.email)
    .replace(/{{vaga}}/g, vaga?.titulo || 'N/A')
    .replace(/{{etapa_atual}}/g, candidato.etapa_atual)
    .replace(/{{match_score}}/g, String(candidato.match_score || 0))
    .replace(/{{data_cadastro}}/g, formatDate(candidato.created_at))
    .replace(/{{proxima_etapa}}/g, getNextStage(candidato.etapa_atual))
    .replace(/{{link_dashboard}}/g, `${APP_URL}/dashboard-candidato`)
    .replace(/{{link_teste}}/g, getTestLink(candidato.etapa_atual))
}
```

### FR-002: Email Template Library
**Pre-built Templates:**

**1. Convite para Teste Big Five**
```
Assunto: Próximo passo - Teste de Personalidade

Olá {{primeiro_nome}},

Parabéns! Você foi aprovado para a próxima etapa do processo seletivo para a vaga de {{vaga}}.

Solicitamos que você complete o Teste de Personalidade (Big Five) através do link abaixo:

{{link_teste}}

O teste leva aproximadamente 20-30 minutos e avalia suas características de personalidade. Não há respostas certas ou erradas - responda com sinceridade.

Prazo: 48 horas

Qualquer dúvida, responda este email.

Atenciosamente,
Equipe de Recrutamento Beauty Smile
```

**2. Agendamento de Entrevista**
```
Assunto: Agendamento - Entrevista Online - {{vaga}}

Olá {{primeiro_nome}},

Gostaríamos de convidá-lo(a) para uma entrevista online!

📅 Data: [A DEFINIR]
🕐 Horário: [A DEFINIR]
⏱️ Duração: 30-40 minutos
📹 Plataforma: Google Meet / Zoom

Por favor, confirme sua disponibilidade para as seguintes opções:
• Opção 1: [DATA/HORA]
• Opção 2: [DATA/HORA]
• Opção 3: [DATA/HORA]

Aguardamos sua confirmação.

Atenciosamente,
{{nome_recrutador}}
Equipe Beauty Smile
```

**3. Solicitação de Documentos**
```
Assunto: Documentos Necessários - {{vaga}}

Olá {{primeiro_nome}},

Para darmos continuidade ao seu processo, solicitamos o envio dos seguintes documentos:

✓ RG (frente e verso)
✓ CPF
✓ Comprovante de residência atualizado
✓ Certificados/diplomas mencionados no currículo

Por favor, envie os documentos digitalizados através do link:
{{link_dashboard}}

Prazo: 5 dias úteis

Atenciosamente,
Equipe de Recrutamento Beauty Smile
```

**4. Follow-up - Teste Pendente**
```
Assunto: Lembrete - Teste Pendente - {{vaga}}

Olá {{primeiro_nome}},

Notamos que você ainda não completou o teste {{etapa_atual}}.

Para continuar no processo seletivo, é necessário concluir o teste em até 48 horas.

Acesse aqui: {{link_teste}}

Caso tenha alguma dificuldade, entre em contato.

Atenciosamente,
Equipe Beauty Smile
```

**5. Agradecimento pela Participação (Genérico)**
```
Assunto: Obrigado pela Participação

Olá {{primeiro_nome}},

Agradecemos sinceramente seu tempo e interesse em fazer parte da equipe Beauty Smile.

Seu perfil foi cuidadosamente analisado. Manteremos seu currículo em nosso banco de talentos para futuras oportunidades.

Desejamos muito sucesso em sua jornada profissional!

Atenciosamente,
Equipe de Recrutamento Beauty Smile
```

**Template Management:**
```
┌─────────────────────────────────────────────┐
│ Biblioteca de Templates                     │
├─────────────────────────────────────────────┤
│ 🔍 Buscar templates: [_________________]    │
│                                             │
│ Categoria: [Todas ▼]                        │
│                                             │
│ Templates Padrão (5)                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│ ✉️ Convite - Teste Big Five                │
│    Usado: 45 vezes | [Usar] [Editar]       │
│                                             │
│ ✉️ Convite - Teste DISC                    │
│    Usado: 42 vezes | [Usar] [Editar]       │
│                                             │
│ ✉️ Agendamento de Entrevista               │
│    Usado: 28 vezes | [Usar] [Editar]       │
│                                             │
│ Meus Templates (3)                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│ ✉️ Follow-up Personalizado                 │
│    Criado por @carla_rh | [Usar] [Editar]  │
│                                             │
│ [+ Criar Novo Template]                     │
└─────────────────────────────────────────────┘
```

**Create Template Modal:**
```
┌─────────────────────────────────────────────┐
│ Criar Novo Template                         │
├─────────────────────────────────────────────┤
│ Nome do template: *                         │
│ [_____________________________________]     │
│                                             │
│ Categoria:                                  │
│ [Convites ▼]                                │
│                                             │
│ Assunto: *                                  │
│ [_____________________________________]     │
│                                             │
│ Corpo do email: *                           │
│ ┌─────────────────────────────────────────┐ │
│ │ [Rich text editor]                      │ │
│ │                                         │ │
│ │ Variáveis: [Inserir ▼]                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ☐ Compartilhar com toda equipe RH          │
│                                             │
│ [Cancelar] [Salvar Template]                │
└─────────────────────────────────────────────┘
```

### FR-003: Bulk Email Sending
**Bulk Email Workflow:**

1. Select candidates in table (10 selected)
2. Click "Enviar Email" in bulk toolbar
3. Compose modal shows:
   ```
   Enviar Email para 10 Candidatos

   Destinatários: (10 candidatos)
   [Ver lista completa ▼]

   Template: [Selecione ▼] ou escreva livre

   Assunto: [_____________________________]

   Mensagem:
   ┌─────────────────────────────────────┐
   │ Olá {{nome}},                       │
   │                                     │
   │ Mensagem personalizada para cada    │
   │ candidato usando variáveis...       │
   └─────────────────────────────────────┘

   ⚠️ Cada candidato receberá uma versão
   personalizada com seus próprios dados.

   Envio:
   ○ Imediato
   ○ Agendar para: [___/___] [__:__]

   [Cancelar] [Pré-visualizar] [Enviar para 10]
   ```

4. Preview shows sample rendering for 3 candidates:
   ```
   Pré-visualização (3 exemplos)

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Para: João Silva
   Assunto: Próximo passo - Teste Big Five

   Olá João,

   Parabéns! Você foi aprovado para a
   próxima etapa...
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Para: Maria Santos
   Assunto: Próximo passo - Teste Big Five

   Olá Maria,

   Parabéns! Você foi aprovado...
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   [Voltar] [Confirmar Envio]
   ```

5. Send with progress bar:
   ```
   Enviando emails...
   [████████░░] 8 de 10 enviados

   ✅ João Silva - Enviado
   ✅ Maria Santos - Enviado
   ...
   ⏳ Pedro Costa - Enviando...
   ```

6. Show results:
   ```
   ✅ 9 emails enviados com sucesso
   ⚠️ 1 falha: Ana Lima (email inválido)

   [Tentar Novamente] [Fechar]
   ```

**Bulk Limits:**
- Max 100 recipients per bulk email (prevent spam)
- Rate limiting: 50 emails/minute (prevent blacklist)
- Queue large batches (>50) for background processing

### FR-004: Email Tracking & History
**Email History Database:**
```sql
CREATE TABLE emails_enviados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidato_id UUID REFERENCES candidatos(id) NOT NULL,
  remetente_usuario_rh_id UUID REFERENCES usuarios_rh(id) NOT NULL,
  remetente_email TEXT NOT NULL, -- rh@beautysmile.com.br
  destinatario_email TEXT NOT NULL,
  cc_emails TEXT[],
  assunto TEXT NOT NULL,
  corpo_html TEXT NOT NULL,
  corpo_texto TEXT, -- Plain text version
  template_usado TEXT, -- Template name if used
  variavel_substituicoes JSONB, -- Variables used
  anexos JSONB, -- Array of attachment metadata
  status TEXT NOT NULL, -- 'enviado' | 'falhou' | 'agendado' | 'cancelado'
  erro_mensagem TEXT,
  agendado_para TIMESTAMP,
  enviado_em TIMESTAMP,
  aberto_em TIMESTAMP, -- First open
  clicado_em TIMESTAMP, -- First click
  total_aberturas INTEGER DEFAULT 0,
  total_cliques INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_emails_candidato ON emails_enviados(candidato_id);
CREATE INDEX idx_emails_remetente ON emails_enviados(remetente_usuario_rh_id);
CREATE INDEX idx_emails_status ON emails_enviados(status);
CREATE INDEX idx_emails_enviado ON emails_enviados(enviado_em DESC);
```

**Tracking Implementation:**
Use email service with tracking (e.g., Resend, SendGrid):
```typescript
const { data, error } = await resend.emails.send({
  from: 'RH Beauty Smile <rh@beautysmile.com.br>',
  to: candidato.email,
  subject: renderedSubject,
  html: renderedBody,
  tags: [
    { name: 'campaign', value: 'recruitment' },
    { name: 'candidato_id', value: candidatoId }
  ],
  // Enable tracking
  headers: {
    'X-Entity-Ref-ID': emailLogId
  }
})

// Store in database
await supabase.from('emails_enviados').insert({
  id: emailLogId,
  candidato_id: candidatoId,
  remetente_usuario_rh_id: currentUser.id,
  assunto: renderedSubject,
  corpo_html: renderedBody,
  status: error ? 'falhou' : 'enviado',
  erro_mensagem: error?.message,
  enviado_em: new Date()
})

// Webhook from Resend for open/click tracking
// POST /api/webhooks/email-tracking
app.post('/api/webhooks/email-tracking', async (req, res) => {
  const { type, data } = req.body

  if (type === 'email.opened') {
    await supabase
      .from('emails_enviados')
      .update({
        aberto_em: data.opened_at,
        total_aberturas: supabase.raw('total_aberturas + 1')
      })
      .eq('id', data.email_id)
      .is('aberto_em', null) // Only first open
  }

  if (type === 'email.clicked') {
    await supabase
      .from('emails_enviados')
      .update({
        clicado_em: data.clicked_at,
        total_cliques: supabase.raw('total_cliques + 1')
      })
      .eq('id', data.email_id)
      .is('clicado_em', null) // Only first click
  }

  res.json({ received: true })
})
```

**Email History View (in Candidate Profile):**
```
┌─────────────────────────────────────────────────┐
│ Histórico de Comunicação                        │
├─────────────────────────────────────────────────┤
│ ✉️ Convite - Teste DISC                        │
│    Enviado: 15/01/2025 14:32 por @carla_rh     │
│    Status: ✅ Aberto (2x) 🔗 Clicado (1x)       │
│    [Ver email] [Reenviar]                       │
├─────────────────────────────────────────────────┤
│ ✉️ Aprovação - Próxima Etapa                   │
│    Enviado: 12/01/2025 10:15 por @paulo_rh     │
│    Status: ✅ Aberto (1x)                       │
│    [Ver email]                                  │
├─────────────────────────────────────────────────┤
│ ✉️ Confirmação de Cadastro                     │
│    Enviado: 10/01/2025 08:45 (Automático)      │
│    Status: ✅ Aberto (3x)                       │
│    [Ver email]                                  │
└─────────────────────────────────────────────────┘

[+ Enviar Novo Email]
```

### FR-005: Scheduled Emails
**Schedule Email Workflow:**

1. Compose email normally
2. Check "Agendar envio para:"
3. Select date/time (future only)
4. Click "Agendar Email"
5. Email saved with `status = 'agendado'`

**Background Job:**
```typescript
// Run every minute via cron (Supabase Edge Function)
export async function processScheduledEmails() {
  const { data: scheduled } = await supabase
    .from('emails_enviados')
    .select('*')
    .eq('status', 'agendado')
    .lte('agendado_para', new Date())
    .limit(50)

  for (const email of scheduled) {
    try {
      await sendEmail(email)

      await supabase
        .from('emails_enviados')
        .update({
          status: 'enviado',
          enviado_em: new Date()
        })
        .eq('id', email.id)
    } catch (error) {
      await supabase
        .from('emails_enviados')
        .update({
          status: 'falhou',
          erro_mensagem: error.message
        })
        .eq('id', email.id)
    }
  }
}
```

**Scheduled Emails Manager:**
```
┌─────────────────────────────────────────────────┐
│ Emails Agendados (8)                            │
├─────────────────────────────────────────────────┤
│ 📅 18/01/2025 10:00                             │
│    Para: João Silva + 4 outros                  │
│    Assunto: Lembrete - Teste Pendente           │
│    [Editar] [Cancelar] [Enviar Agora]           │
├─────────────────────────────────────────────────┤
│ 📅 20/01/2025 09:00                             │
│    Para: Maria Santos                           │
│    Assunto: Agendamento Entrevista              │
│    [Editar] [Cancelar] [Enviar Agora]           │
└─────────────────────────────────────────────────┘
```

### FR-006: Attachments
**File Upload:**
- Max 5 files per email
- Max 10MB per file
- Allowed types: PDF, DOC, DOCX, JPG, PNG
- Store in Supabase Storage

**Storage Structure:**
```
email-attachments/
  {email_id}/
    {filename}
```

**Attachment Display:**
```
📎 Anexos:
[documento.pdf (2.3 MB)] [×]
[imagem.jpg (800 KB)] [×]

[+ Adicionar arquivo]
```

### FR-007: Email Analytics Dashboard
**URL:** `/admin/comunicacoes/analytics`

**Metrics:**
```
Análise de Comunicação - Últimos 30 dias

Emails Enviados: 387
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Por Status:
✅ Enviados com sucesso: 375 (97%)
⚠️ Falhas:                 12 (3%)
📅 Agendados:              15

Taxa de Abertura: 68% (256/375)
Taxa de Clique: 34% (128/375)

Templates Mais Usados:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Convite - Teste Big Five:   98 usos (78% abertos)
2. Convite - Teste DISC:        87 usos (72% abertos)
3. Agendamento Entrevista:      65 usos (85% abertos)

Por Recrutador:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@carla_rh:   142 emails (71% taxa abertura)
@paulo_rh:   128 emails (65% taxa abertura)
@ana_rh:     117 emails (70% taxa abertura)

Horários com Maior Taxa de Abertura:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
09:00-12:00:  82% abertos
14:00-17:00:  68% abertos
18:00-21:00:  45% abertos

[Exportar Relatório]
```

### FR-008: Automated Email Triggers
**Trigger Configuration (Admin):**
```
Emails Automáticos

☑ Cadastro realizado → Enviar "Boas-vindas"
☑ Aprovado para Big Five → Enviar "Convite Teste Big Five"
☑ Aprovado para DISC → Enviar "Convite Teste DISC"
☐ Teste não completado em 24h → Enviar "Lembrete"
☑ Aprovado final → Enviar "Parabéns Aprovação"
☑ Rejeitado → Enviar template de rejeição selecionado

[Salvar Configurações]
```

**Trigger Implementation:**
- Use Supabase triggers or N8N workflows
- Webhooks call email sending function
- Template auto-selected based on trigger type

### FR-009: Email Drafts
**Save Draft:**
- Click "Salvar como Rascunho" during composition
- Draft saved to `emails_rascunhos` table
- Accessible from "Rascunhos" tab

**Drafts List:**
```
┌─────────────────────────────────────────────────┐
│ Rascunhos (3)                                   │
├─────────────────────────────────────────────────┤
│ 📝 Para: João Silva                             │
│    Assunto: Follow-up Personalizado             │
│    Salvo: há 2 horas                            │
│    [Continuar] [Excluir]                        │
├─────────────────────────────────────────────────┤
│ 📝 Para: 10 candidatos                          │
│    Assunto: Atualização Processo                │
│    Salvo: há 1 dia                              │
│    [Continuar] [Excluir]                        │
└─────────────────────────────────────────────────┘
```

### FR-010: Mobile Responsiveness
**Tablet:**
- Full compose modal functionality
- Simplified rich text editor
- Template selection works

**Mobile:**
- Read-only email history
- Cannot compose (too complex)
- Show message: "Use desktop para enviar emails"

## 5. Non-Goals (Out of Scope)

1. **SMS communication** - Email only for MVP
2. **WhatsApp integration** - External messaging not included
3. **Calendar invites** - Manual scheduling only
4. **Email campaigns** - Recruitment focus, not marketing
5. **A/B testing emails** - No split testing
6. **Auto-responder** - No automatic replies
7. **Email threads** - One-way communication (no reply tracking)
8. **Email signature customization** - Fixed signature per user
9. **CC to hiring managers** - Manual CC only
10. **Email translation** - Portuguese only

## 6. Design Considerations

**Rich Text Editor:**
- Use TipTap or Quill for WYSIWYG
- Limit formatting options (prevent over-styling)
- Ensure mobile-friendly HTML output

**Variable Highlighting:**
- Show variables in different color during composition
- Preview renders actual values

**Accessibility:**
- Screen reader support for compose modal
- Keyboard shortcuts (Ctrl+Enter to send)

## 7. Technical Considerations

### Email Service
**Recommended:** Resend (modern, great DX, tracking built-in)

**Configuration:**
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'RH Beauty Smile <rh@beautysmile.com.br>',
  to: candidato.email,
  subject: subject,
  html: htmlBody,
  text: textBody, // Fallback
  attachments: files.map(f => ({
    filename: f.name,
    content: f.buffer
  }))
})
```

**Domain Setup:**
- Add DNS records for `beautysmile.com.br`
- SPF, DKIM, DMARC configured
- Verify domain in Resend dashboard

### Performance
- Queue bulk emails (don't block UI)
- Show progress bar for >10 recipients
- Cache templates for fast loading

### Security
- Validate email addresses before sending
- Sanitize HTML to prevent XSS
- Rate limit per user (prevent spam)

## 8. Success Metrics

**Primary:**
1. Email delivery rate: ≥97%
2. Open rate: ≥60%
3. Template usage: ≥75% of emails

**Secondary:**
1. Avg composition time: ≤3 minutes
2. Scheduled email accuracy: 100% sent on time
3. Attachment usage: ≥20% of emails

**Business:**
1. Candidate response time: ↓50%
2. Missed follow-ups: ↓80%
3. Professional communication: ≥4.5/5 candidate feedback

## 9. Open Questions

1. **Reply Handling:** Track candidate replies?
   - **Recommendation:** Forward to recruiter email, log in system

2. **Email Limit:** Daily sending limit per user?
   - **Recommendation:** 200 emails/day/user (prevent spam)

3. **Unsubscribe:** Allow candidates to unsubscribe?
   - **Recommendation:** No for recruitment emails (transactional), but include contact info

---

## Acceptance Criteria Summary

✅ Compose email modal with rich text editor
✅ Email templates library with pre-built options
✅ Variable placeholders render correctly
✅ Individual email sends successfully
✅ Bulk email sends to multiple candidates
✅ Email tracking logs opens and clicks
✅ Email history displays in candidate profile
✅ Scheduled emails sent at correct time
✅ Attachments upload and send correctly
✅ Analytics dashboard shows email metrics
✅ Drafts save and can be resumed
✅ Template creation and editing works
✅ Role permissions enforce who can send emails
✅ Manual QA passes
✅ E2E tests cover compose, send, bulk, schedule

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 5-6 days
**Dependencies:**
- ✅ Email service (Resend) configured
- ✅ Domain verified with SPF/DKIM
- ⏳ emails_enviados table
- ⏳ TipTap/Quill rich text editor library
**Blocker Status:** 🟡 HIGH PRIORITY - Essential for candidate engagement and communication
