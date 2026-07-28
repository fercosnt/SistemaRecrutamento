# PRD-DEV-014: Aprovação/Rejeição de Candidatos

## 1. Introduction/Overview

The Aprovação/Rejeição de Candidatos system enables HR professionals to make final hiring decisions, advance candidates to the next recruitment stage, reject applications with documented reasons, and communicate decisions to candidates via automated emails—ensuring transparent, consistent, and auditable hiring outcomes.

**Problem it solves:** HR teams make hiring decisions in emails, spreadsheets, or undocumented phone calls, leading to inconsistent communication, lack of audit trails, and candidates left without feedback. This feature centralizes decision-making with structured workflows, automatic notifications, and compliance tracking.

**Goal:** Implement a comprehensive approval/rejection workflow that allows HR to approve or reject candidates at any stage, document reasons, trigger automated emails with personalized feedback, track all decisions for compliance, and move approved candidates seamlessly through the recruitment pipeline.

## 2. Goals

1. Provide clear approve/reject buttons at every recruitment stage
2. Require documented reasons for all rejections (compliance requirement)
3. Allow custom rejection reasons with templates for common scenarios
4. Trigger automated email notifications to candidates on decision
5. Support bulk approval/rejection for efficient processing
6. Track decision history with auditing (who approved/rejected, when, why)
7. Enable conditional approvals (approve with notes/requirements)
8. Allow reversing decisions with proper authorization
9. Provide approval workflows for multi-level sign-off (optional)
10. Generate rejection analytics (most common reasons, stage with highest rejection rate)

## 3. User Stories

### Primary Flow - Individual Decisions
**As an** HR professional reviewing a candidate
**I want to** approve them to move to the next stage
**So that** they continue in the recruitment process

**As an** HR manager rejecting a candidate
**I want to** select a rejection reason from templates
**So that** I can provide consistent, professional feedback

**As an** HR professional making a decision
**I want** the candidate to receive an automated email
**So that** they are immediately informed without manual follow-up

### Secondary Flow - Bulk Decisions
**As an** HR professional reviewing 20 triagem candidates
**I want to** approve all qualified candidates at once
**So that** I can process batches efficiently

**As a** recruiter
**I want to** reject multiple underqualified candidates with the same reason
**So that** I don't have to repeat the same action 10 times

### Auditing & Compliance
**As an** HR director
**I want** to see who approved or rejected each candidate and why
**So that** I can ensure hiring decisions are fair and defensible

**As a** compliance officer
**I want** to generate reports of all rejections with documented reasons
**So that** we can demonstrate non-discriminatory practices

### Edge Cases
**As an** HR manager
**I want to** reverse an accidental rejection
**So that** I can fix mistakes without manual database changes

**As an** admin
**I want** to require manager approval for final hiring decisions
**So that** junior recruiters cannot make unilateral offers

## 4. Functional Requirements

### FR-001: Approve/Reject Button Placement
**Locations:**

1. **Candidate Detail Page:** Primary CTA buttons in header
2. **Candidate List Table:** Quick action icons per row
3. **Dashboard Kanban:** Action buttons on candidate cards
4. **Bulk Selection Toolbar:** Bulk approve/reject buttons

**Visual Design:**
```
Candidate Detail Header:
┌─────────────────────────────────────────────────┐
│ [← Voltar]  João Silva - Match: 87%            │
│                                                 │
│ [📧 Enviar Email] [✅ Aprovar] [❌ Rejeitar]   │
└─────────────────────────────────────────────────┘
```

**Button States:**
- ✅ Aprovar: Green, icon checkmark
- ❌ Rejeitar: Red, icon X
- Disabled if: Already approved/rejected (show status instead)
- Loading state: Spinner during processing

### FR-002: Approval Flow
**Single Candidate Approval:**

**Step 1: Click "Aprovar" button**

**Step 2: Approval Confirmation Modal**
```
┌─────────────────────────────────────────────────┐
│ Aprovar Candidato                               │
├─────────────────────────────────────────────────┤
│                                                 │
│ Você está aprovando:                            │
│ João Silva                                      │
│ Vaga: Assistente de Vendas                     │
│ Etapa atual: DISC                               │
│                                                 │
│ Próxima etapa: Entrevista Online                │
│                                                 │
│ ☑ Enviar email de aprovação para candidato     │
│ ☐ Agendar entrevista automaticamente           │
│                                                 │
│ Notas internas (opcional):                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ Ex: Excelente perfil para vendas...         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Cancelar]           [Confirmar Aprovação]      │
└─────────────────────────────────────────────────┘
```

**Step 3: Execute Approval**
```typescript
async function approveCandidate(candidatoId: string, notes?: string) {
  // 1. Update candidate stage
  const nextStage = getNextStage(candidate.etapa_atual)

  await supabase
    .from('candidatos')
    .update({
      etapa_atual: nextStage,
      progresso_processo: calculateProgress(nextStage),
      aprovado_por: currentUser.id,
      aprovado_em: new Date()
    })
    .eq('id', candidatoId)

  // 2. Log decision
  await supabase
    .from('decisoes_rh')
    .insert({
      candidato_id: candidatoId,
      tipo_decisao: 'aprovacao',
      etapa_origem: candidate.etapa_atual,
      etapa_destino: nextStage,
      usuario_rh_id: currentUser.id,
      notas: notes,
      data_decisao: new Date()
    })

  // 3. Send email notification
  if (sendEmail) {
    await sendApprovalEmail(candidatoId, nextStage)
  }

  // 4. Log activity
  await logActivity({
    type: 'aprovacao',
    candidato_id: candidatoId,
    usuario_rh_id: currentUser.id,
    detalhes: `Aprovado para ${nextStage}`
  })

  showSuccess('Candidato aprovado com sucesso!')
}
```

**Next Stage Mapping:**
```typescript
const stageFlow = {
  triagem: 'big_five',
  big_five: 'disc',
  disc: 'entrevista_online',
  entrevista_online: 'raven',
  raven: 'cultura',
  cultura: 'entrevista_presencial',
  entrevista_presencial: 'aprovado'
}
```

### FR-003: Rejection Flow
**Single Candidate Rejection:**

**Step 1: Click "Rejeitar" button**

**Step 2: Rejection Reason Modal**
```
┌─────────────────────────────────────────────────┐
│ Rejeitar Candidato                              │
├─────────────────────────────────────────────────┤
│                                                 │
│ Candidato: João Silva                           │
│ Vaga: Assistente de Vendas                     │
│ Etapa atual: DISC                               │
│                                                 │
│ Motivo da rejeição: *                           │
│ ○ Perfil incompatível com a vaga               │
│ ○ Baixo desempenho nos testes                  │
│ ○ Experiência insuficiente                     │
│ ○ Expectativa salarial acima do orçamento      │
│ ○ Indisponibilidade de horário                 │
│ ○ Candidato desistiu do processo               │
│ ● Outro (especificar abaixo)                   │
│                                                 │
│ Detalhes adicionais:                            │
│ ┌─────────────────────────────────────────────┐ │
│ │ Baixa pontuação em Conscienciosidade...     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ☑ Enviar email de feedback para candidato      │
│                                                 │
│ Template de email:                              │
│ [Rejeição Padrão ▼]                            │
│                                                 │
│ Pré-visualização:                               │
│ ┌─────────────────────────────────────────────┐ │
│ │ Olá João,                                   │ │
│ │ Agradecemos seu interesse...                │ │
│ │ Infelizmente, não prosseguiremos...         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Cancelar]                [Confirmar Rejeição]  │
└─────────────────────────────────────────────────┘
```

**Rejection Reason Categories:**

**Automated (Based on Test Scores):**
- Pontuação Big Five incompatível
- Perfil DISC não adequado
- Raciocínio lógico abaixo do mínimo

**Manual Selection:**
- Perfil incompatível com a vaga
- Baixo desempenho nos testes
- Experiência insuficiente
- Expectativa salarial incompatível
- Indisponibilidade de horário
- Competências técnicas insuficientes
- Soft skills inadequadas
- Candidato desistiu do processo
- Vaga preenchida por outro candidato
- Outro (campo de texto livre)

**Required Fields:**
- Motivo da rejeição (dropdown + texto adicional se "Outro")
- Detalhes adicionais (minimum 20 characters)

### FR-004: Email Notifications

**Approval Email Template:**
```html
Assunto: Próxima etapa - {{vaga_titulo}} - Beauty Smile

Olá {{nome_candidato}},

Boas notícias! Você foi aprovado para a próxima etapa do processo seletivo para a vaga de {{vaga_titulo}}.

Próximos passos:
{{#if etapa_destino == 'big_five'}}
  Você receberá em breve um link para realizar o Teste de Personalidade (Big Five). O teste leva aproximadamente 20-30 minutos.
{{/if}}
{{#if etapa_destino == 'disc'}}
  Você receberá em breve um link para realizar o Teste DISC (Perfil Comportamental). O teste leva aproximadamente 10-15 minutos.
{{/if}}
{{#if etapa_destino == 'entrevista_online'}}
  Nossa equipe entrará em contato em até 48 horas para agendar sua entrevista online.
{{/if}}
{{#if etapa_destino == 'raven'}}
  Você receberá em breve um link para realizar o Teste Raven (Raciocínio Lógico). O teste leva aproximadamente 40 minutos.
{{/if}}
{{#if etapa_destino == 'entrevista_presencial'}}
  Parabéns! Você foi selecionado para a entrevista presencial. Entraremos em contato para agendar.
{{/if}}
{{#if etapa_destino == 'aprovado'}}
  🎉 Parabéns! Você foi aprovado! Nossa equipe entrará em contato com os próximos passos para contratação.
{{/if}}

Acompanhe seu progresso no dashboard: {{dashboard_url}}

Atenciosamente,
Equipe de Recrutamento Beauty Smile
```

**Rejection Email Templates:**

**Template 1: Rejeição Padrão (Gentil)**
```
Assunto: Processo Seletivo - {{vaga_titulo}}

Olá {{nome_candidato}},

Agradecemos sinceramente seu interesse em fazer parte da equipe Beauty Smile e o tempo dedicado ao nosso processo seletivo.

Após cuidadosa análise, decidimos não prosseguir com sua candidatura neste momento. Esta decisão não reflete negativamente em suas qualificações, mas sim na busca pelo perfil mais alinhado com as necessidades específicas da vaga.

Manteremos seu currículo em nosso banco de talentos e entraremos em contato caso surjam oportunidades mais adequadas ao seu perfil.

Desejamos sucesso em sua jornada profissional!

Atenciosamente,
Equipe de Recrutamento Beauty Smile
```

**Template 2: Rejeição com Feedback (Construtivo)**
```
Assunto: Feedback - Processo Seletivo {{vaga_titulo}}

Olá {{nome_candidato}},

Agradecemos seu interesse na vaga de {{vaga_titulo}} e sua participação em nosso processo seletivo.

Após análise, decidimos não prosseguir com sua candidatura. Compartilhamos alguns pontos de feedback que podem ser úteis:

{{motivo_rejeicao}}

Valorizamos seu interesse na Beauty Smile e encorajamos você a se candidatar a futuras oportunidades que estejam mais alinhadas com seu perfil.

Desejamos sucesso!

Atenciosamente,
Equipe de Recrutamento Beauty Smile
```

**Template 3: Vaga Preenchida**
```
Assunto: Atualização - Processo Seletivo {{vaga_titulo}}

Olá {{nome_candidato}},

Agradecemos seu interesse na vaga de {{vaga_titulo}}.

Informamos que a vaga foi preenchida por outro candidato. Esta foi uma decisão difícil, dado o alto nível de qualificação dos candidatos.

Manteremos seu currículo em nosso sistema e entraremos em contato caso surjam novas oportunidades.

Obrigado por considerar a Beauty Smile!

Atenciosamente,
Equipe de Recrutamento Beauty Smile
```

**Email Configuration:**
```typescript
const emailTemplates = {
  aprovacao: {
    template_id: 'aprovacao-proxima-etapa',
    subject: 'Próxima etapa - {{vaga_titulo}}',
    body: approvalEmailBody
  },
  rejeicao_padrao: {
    template_id: 'rejeicao-padrao',
    subject: 'Processo Seletivo - {{vaga_titulo}}',
    body: rejectionStandardBody
  },
  rejeicao_feedback: {
    template_id: 'rejeicao-com-feedback',
    subject: 'Feedback - Processo Seletivo',
    body: rejectionFeedbackBody
  }
}
```

### FR-005: Bulk Approval/Rejection
**Bulk Approval:**

1. Select multiple candidates (checkbox in table)
2. Click "Aprovar Selecionados" in bulk toolbar
3. Modal shows:
   ```
   Aprovar 12 candidatos em lote

   Todos os candidatos serão movidos para a próxima etapa:
   • 5 candidatos em Triagem → Big Five
   • 4 candidatos em DISC → Entrevista Online
   • 3 candidatos em Raven → Cultura

   ☑ Enviar email de aprovação para todos

   [Cancelar] [Aprovar 12 candidatos]
   ```

4. Process approvals with progress bar:
   ```
   Processando aprovações...
   [████████░░] 8 de 12 candidatos processados
   ```

5. Show results:
   ```
   ✅ 11 candidatos aprovados com sucesso
   ⚠️ 1 falha: Maria Santos (já aprovada anteriormente)
   ```

**Bulk Rejection:**

1. Select multiple candidates
2. Click "Rejeitar Selecionados"
3. Modal requires single rejection reason for all:
   ```
   Rejeitar 8 candidatos em lote

   Motivo (aplicado a todos):
   [Perfil incompatível com a vaga ▼]

   Detalhes adicionais:
   ┌─────────────────────────────────────┐
   │                                     │
   └─────────────────────────────────────┘

   ☑ Enviar email de rejeição para todos

   [Cancelar] [Rejeitar 8 candidatos]
   ```

**Limitations:**
- Max 50 candidates per bulk action (prevent timeouts)
- All candidates must be in same stage (for consistency)
- Bulk rejection requires reason (no "Outro" option in bulk)

### FR-006: Decision Logging & Audit Trail
**Database Table:**
```sql
CREATE TABLE decisoes_rh (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidato_id UUID REFERENCES candidatos(id) NOT NULL,
  tipo_decisao TEXT NOT NULL, -- 'aprovacao' | 'rejeicao' | 'reversao'
  etapa_origem TEXT NOT NULL,
  etapa_destino TEXT, -- NULL for rejections
  motivo_rejeicao TEXT, -- Required if tipo_decisao = 'rejeicao'
  detalhes_rejeicao TEXT,
  usuario_rh_id UUID REFERENCES usuarios_rh(id) NOT NULL,
  notas_internas TEXT,
  email_enviado BOOLEAN DEFAULT false,
  template_email_usado TEXT,
  data_decisao TIMESTAMP DEFAULT NOW(),
  revertida BOOLEAN DEFAULT false,
  revertida_por UUID REFERENCES usuarios_rh(id),
  data_reversao TIMESTAMP,
  motivo_reversao TEXT
);

CREATE INDEX idx_decisoes_candidato ON decisoes_rh(candidato_id);
CREATE INDEX idx_decisoes_usuario ON decisoes_rh(usuario_rh_id);
CREATE INDEX idx_decisoes_tipo ON decisoes_rh(tipo_decisao);
```

**Audit View (Admin Only):**
```
Histórico de Decisões

Filtros:
[Tipo: Todas ▼] [Período: Último mês ▼] [Usuário: Todos ▼]

┌────────────┬────────────┬─────────┬──────────┬─────────┬──────────┐
│ Data       │ Candidato  │ Decisão │ Etapa    │ Por     │ Motivo   │
├────────────┼────────────┼─────────┼──────────┼─────────┼──────────┤
│ 15/01 14:32│ João Silva │ Aprovar │ DISC →   │ @carla  │ -        │
│            │            │         │ Entrevist│         │          │
├────────────┼────────────┼─────────┼──────────┼─────────┼──────────┤
│ 15/01 10:15│ Ana Costa  │ Rejeitar│ Big Five │ @paulo  │ Perfil   │
│            │            │         │          │         │ incomp.  │
└────────────┴────────────┴─────────┴──────────┴─────────┴──────────┘

[Exportar relatório]
```

### FR-007: Reversing Decisions
**Undo Rejection (Admin or Manager Only):**

1. Navigate to rejected candidate profile
2. See banner: "❌ Rejeitado em 15/01/2025 por @carla_rh"
3. Click "Reverter Rejeição" button
4. Modal:
   ```
   Reverter Rejeição

   Candidato: João Silva
   Rejeitado em: 15/01/2025
   Motivo original: Perfil incompatível

   Motivo da reversão: *
   ┌─────────────────────────────────────┐
   │ Reavaliação após análise de IA...  │
   └─────────────────────────────────────┘

   Restaurar para etapa:
   [DISC ▼] (etapa onde foi rejeitado)

   ☐ Notificar candidato da reversão

   [Cancelar] [Confirmar Reversão]
   ```

5. Execute reversal:
   ```typescript
   await supabase
     .from('candidatos')
     .update({
       etapa_atual: originalStage,
       status_processo: 'em_andamento'
     })
     .eq('id', candidatoId)

   await supabase
     .from('decisoes_rh')
     .update({
       revertida: true,
       revertida_por: currentUser.id,
       data_reversao: new Date(),
       motivo_reversao: reason
     })
     .eq('id', decisaoId)
   ```

**Undo Approval:**
- Similar flow
- Moves candidate back to previous stage
- Logs reversal in audit trail

### FR-008: Conditional Approvals
**Approve with Requirements:**

```
Aprovar com Ressalvas

Candidato: João Silva
Próxima etapa: Entrevista Presencial

Condições/Requisitos:
☑ Verificar referências profissionais
☑ Solicitar certificado de curso técnico
☐ Exigir exame médico admissional

Notas para o entrevistador:
┌─────────────────────────────────────┐
│ Atentar para estabilidade emocional│
│ (Neuroticismo alto no Big Five)    │
└─────────────────────────────────────┘

[Cancelar] [Aprovar com Condições]
```

**Tracking:**
- Conditions stored in JSONB field
- Visible to all HR users
- Checklist in candidate profile

### FR-009: Analytics Dashboard
**Rejection Analytics View:**
```
Análise de Rejeições - Últimos 30 dias

Total de rejeições: 89

Por Motivo:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Perfil incompatível:        34 (38%)
Baixo desempenho testes:    21 (24%)
Experiência insuficiente:   15 (17%)
Indisponibilidade horário:   8 (9%)
Candidato desistiu:          7 (8%)
Outros:                      4 (4%)

Por Etapa:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Triagem:                    42 (47%)
Big Five:                   23 (26%)
DISC:                       12 (13%)
Entrevista Online:           8 (9%)
Raven:                       4 (5%)

Por Recrutador:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@carla_rh:                  35 (39%)
@paulo_rh:                  28 (31%)
@ana_rh:                    26 (29%)

Taxa de Rejeição por Vaga:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assistente Vendas:      45% (18/40)
Recepcionista:          62% (25/40)
Auxiliar Clínico:       38% (15/40)

[Exportar Relatório Completo]
```

### FR-010: Permission Controls
**Role-Based Actions:**

| Action                  | RH Básico | RH Avançado | Admin |
|-------------------------|-----------|-------------|-------|
| Aprovar (triagem)       | ✅        | ✅          | ✅    |
| Aprovar (testes)        | ❌        | ✅          | ✅    |
| Aprovar (entrevistas)   | ❌        | ✅          | ✅    |
| Aprovar (final)         | ❌        | ⚠️ Requer aprovação adicional | ✅ |
| Rejeitar (qualquer)     | ❌        | ✅          | ✅    |
| Reverter decisão        | ❌        | ❌          | ✅    |
| Bulk approve/reject     | ❌        | ✅          | ✅    |
| Ver audit trail         | ❌        | ✅          | ✅    |

**Implementation:**
```typescript
function canApprove(user: User, stage: Stage): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'rh_avancado' && stage !== 'entrevista_presencial') return true
  if (user.role === 'rh_basico' && stage === 'triagem') return true
  return false
}
```

## 5. Non-Goals (Out of Scope)

1. **AI-powered rejection suggestions** - Manual decision only
2. **Scheduled rejections** - Immediate effect only
3. **Candidate appeals** - No re-application system
4. **Multi-level approval workflows** - Single approver for MVP
5. **Contract generation** - Separate onboarding process
6. **Background checks integration** - Manual process
7. **Offer letter templates** - HR Docs separate system
8. **Rejection reason ML analysis** - Manual categorization only
9. **Candidate feedback surveys** - Post-rejection surveys not included
10. **Integration with job boards** - Manual status updates

## 6. Design Considerations

**Visual Feedback:**
- Success: Green toast notification
- Error: Red alert banner
- Loading: Spinner + progress bar for bulk
- Confirmation: Modal with clear cancel option

**Accessibility:**
- Keyboard shortcuts (Ctrl+A approve, Ctrl+R reject)
- Screen reader announcements for actions
- High contrast mode for buttons

**Mobile:**
- Approve/Reject buttons accessible on tablet
- Simplified rejection modal on mobile

## 7. Technical Considerations

### Email Sending
```typescript
// Use Supabase Edge Function + Resend API
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: candidato.email,
    template: 'aprovacao',
    variables: {
      nome_candidato: candidato.nome_completo,
      vaga_titulo: vaga.titulo,
      etapa_destino: nextStage
    }
  }
})
```

### Performance
- Bulk actions use queue (prevent timeout)
- Progress updates via WebSocket
- Transaction rollback on partial failure

### Error Handling
```typescript
try {
  await approveCandidate(id)
} catch (error) {
  if (error.code === '23505') {
    showError('Candidato já aprovado')
  } else {
    showError('Erro ao processar. Tente novamente.')
    logError(error)
  }
}
```

## 8. Success Metrics

**Primary:**
1. Decision time: ≤2 minutes per candidate
2. Email delivery: ≥98% successful
3. Rejection reason completion: 100%

**Secondary:**
1. Bulk usage: ≥30% of decisions
2. Reversal rate: ≤5% of decisions
3. Template usage: ≥80% use standard templates

**Business:**
1. Time-to-decision: ↓40%
2. Candidate satisfaction: ≥3.5/5 (rejection emails)
3. Compliance: 100% documented decisions

## 9. Open Questions

1. **Final Approval Workflow:** Require manager sign-off for final hiring?
   - **Recommendation:** Yes, two-step for "Aprovado" final stage

2. **Rejection Appeal:** Allow candidates to request reconsideration?
   - **Recommendation:** Not for MVP, email contact only

3. **Rejection Retention:** Keep rejected candidates in system how long?
   - **Recommendation:** 2 years for compliance, then anonymize

---

## Acceptance Criteria Summary

✅ Approve button moves candidate to next stage
✅ Rejection modal requires reason selection
✅ Automated emails sent on approve/reject
✅ Bulk approve/reject processes multiple candidates
✅ Decision history logged in decisoes_rh table
✅ Audit trail shows all decisions with filters
✅ Admin can reverse decisions with reason
✅ Conditional approvals store requirements
✅ Analytics show rejection breakdown by reason/stage
✅ Role-based permissions enforce who can approve/reject
✅ Email templates render correctly with variables
✅ Progress bar shows bulk action status
✅ Manual QA passes
✅ E2E tests cover approve, reject, bulk, reversal

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 4-5 days
**Dependencies:**
- ⏳ Email service configured (Resend/Supabase)
- ⏳ Email templates created
- ⏳ decisoes_rh table
**Blocker Status:** 🚨 CRITICAL - Core decision-making workflow
