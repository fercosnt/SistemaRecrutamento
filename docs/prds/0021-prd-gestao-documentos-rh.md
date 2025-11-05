# PRD-DEV-021: Gestão de Documentos (RH)

## 1. Introduction/Overview

The Gestão de Documentos (Document Management for HR) system provides HR professionals with tools to request, review, verify, approve, and manage all candidate documents throughout the recruitment process. While candidates upload documents through their profile (PRD-DEV-019), this system handles the HR workflow for document verification, compliance checking, batch requests, and audit trails.

**Problem it solves:** HR needs to verify candidate documents (CV, diplomas, certifications, background checks) before making hiring decisions. Without a structured document management system, HR manually tracks document submissions via email, loses track of pending documents, cannot verify authenticity efficiently, and risks hiring unqualified candidates due to incomplete documentation.

**Goal:** Implement a comprehensive document management interface where HR can view all candidate documents, request missing documents in bulk, verify and approve submissions, track document status, flag fraudulent documents, maintain compliance checklists, and generate document reports—all with proper audit logging and LGPD compliance.

## 2. Goals

1. Display all documents submitted by candidates with filtering
2. Enable HR to request specific documents from candidates
3. Support bulk document requests (e.g., "Request CV from all in stage X")
4. Provide document verification workflow (pending → verified → approved/rejected)
5. Flag documents for manual review or fraud detection
6. Track document submission status per candidate
7. Generate document compliance reports
8. Support document templates (e.g., standard consent forms)
9. Enable document preview and download
10. Implement document expiration tracking (e.g., certifications)
11. Provide document audit trail (who viewed, when)
12. Support document categorization and tagging

## 3. User Stories

### Primary Flow
**As an** HR professional
**I want to** see all documents submitted by a specific candidate
**So that** I can verify their qualifications before advancing them in the process

**As an** HR recruiter
**I want to** request missing documents from multiple candidates at once
**So that** I can efficiently complete background checks without individual emails

**As an** HR manager
**I want to** verify and approve submitted documents
**So that** we only hire candidates with validated credentials

### Secondary Flow
**As an** HR professional
**I want to** see which candidates haven't submitted required documents
**So that** I can follow up before interview stages

**As an** admin user
**I want to** generate a document compliance report
**So that** I can demonstrate to leadership that all hires are properly vetted

**As an** HR recruiter
**I want to** preview documents without downloading
**So that** I can quickly assess submissions

### Edge Cases
**As an** HR professional
**I want** to flag a document as potentially fraudulent
**So that** it can be reviewed by management before proceeding

**As an** admin user
**I want** to track when certifications expire
**So that** we can request updated documents from hired employees

**As an** HR user
**I want** to see who viewed sensitive documents and when
**So that** we maintain LGPD compliance and data security

## 4. Functional Requirements

### FR-001: Document Dashboard
**URL:** `/admin/documentos`

**Access Control:**
- `rh_basico`: View all, cannot approve/reject
- `rh_avancado`: Full access
- `admin`: Full access + delete documents

**Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📄 Gestão de Documentos                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Filtros:                                                                   │
│  [Tipo ▾] [Status ▾] [Candidato ▾] [Vaga ▾] [🔍 Buscar]                   │
│                                                                             │
│  📊 Resumo:                                                                 │
│  • Pendentes Verificação: 23  • Aprovados: 156  • Rejeitados: 4            │
│  • Faltando: 12 candidatos sem documentos obrigatórios                      │
│                                                                             │
│  [Solicitar Documentos] [Exportar Relatório]                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Candidato    Documento        Tipo          Status         Data    Ações  │
│  ──────────────────────────────────────────────────────────────────────────│
│  Ana Silva    CV_Ana.pdf       Currículo     ✓ Aprovado    01/11  [👁️⬇️]│
│  Ana Silva    Diploma_USP.pdf  Diploma       ⏳ Pendente   28/10  [✓✗👁️]│
│  Bruno Costa  CV_Bruno.docx    Currículo     ⚠️ Flagged    27/10  [✓✗👁️]│
│  Carla Souza  Cert_CRO.pdf     Certificação  ✓ Aprovado    25/10  [👁️⬇️]│
│  Daniel Lima  -                Currículo     ❌ Faltando    -     [📧]   │
│                                                                             │
│  Página 1 de 15                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Filters:**
- **Tipo:** Currículo, Diploma, Certificação, RG, CPF, Comprovante Residência, Outro
- **Status:** Pendente, Aprovado, Rejeitado, Flagged, Faltando
- **Candidato:** Search by name
- **Vaga:** Filter by job posting

### FR-002: Document Status Workflow
**Status Types:**
```typescript
type DocumentStatus =
  | 'pendente'           // Uploaded, awaiting review
  | 'em_revisao'         // HR is reviewing
  | 'aprovado'           // Verified and approved
  | 'rejeitado'          // Invalid/fraudulent
  | 'flagged'            // Needs manual review
  | 'faltando'           // Not uploaded yet
  | 'expirado'           // Expired certification

interface DocumentoStatus {
  id: string
  documento_id: string
  status: DocumentStatus
  alterado_por: string   // User ID
  data_alteracao: Date
  motivo?: string        // For rejeitado/flagged
  notas?: string         // Additional notes
}
```

**Status Transitions:**
```
Faltando → (candidate uploads) → Pendente
Pendente → Em Revisão → Aprovado
                      → Rejeitado
                      → Flagged → (manual review) → Aprovado/Rejeitado
Aprovado → (time passes) → Expirado (for certifications)
```

**Approve/Reject Actions:**
```
┌─────────────────────────────────────────────────┐
│  Verificar Documento: Diploma_USP.pdf  [X]      │
├─────────────────────────────────────────────────┤
│  [Preview do documento aparece aqui]            │
│                                                 │
│  Candidato: Ana Silva                           │
│  Tipo: Diploma                                  │
│  Enviado em: 28/10/2024                         │
│                                                 │
│  Verificação:                                   │
│  ○ Aprovar documento                            │
│  ○ Rejeitar documento                           │
│  ○ Flag para revisão manual                     │
│                                                 │
│  Motivo (se rejeitar/flag):                     │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Cancelar] [Salvar Decisão]                    │
└─────────────────────────────────────────────────┘
```

**Approve Logic:**
```typescript
async function approveDocument(documentoId: string, notas?: string) {
  // Update status
  await supabase
    .from('documentos_candidatos')
    .update({ status: 'aprovado' })
    .eq('id', documentoId)

  // Log status change
  await supabase.from('documentos_status_historico').insert([{
    documento_id: documentoId,
    status: 'aprovado',
    alterado_por: currentUser.id,
    data_alteracao: new Date(),
    notas
  }])

  // Notify candidate
  const { data: documento } = await supabase
    .from('documentos_candidatos')
    .select('*, candidato:candidatos(*)')
    .eq('id', documentoId)
    .single()

  await sendEmail({
    to: documento.candidato.email,
    template: 'document_approved',
    data: {
      nome: documento.candidato.nome_completo,
      tipo_documento: documento.tipo
    }
  })

  toast.success('Documento aprovado!')
}
```

### FR-003: Bulk Document Request
**Request Documents Modal:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Solicitar Documentos em Massa                         [X]      │
├─────────────────────────────────────────────────────────────────┤
│  Filtrar Candidatos:                                            │
│  Etapa:       [Entrevista Presencial                     ▾]     │
│  Vaga:        [Todas as vagas                            ▾]     │
│  Status Doc:  [Faltando documentos                       ▾]     │
│                                                                 │
│  Candidatos Selecionados: 12                                    │
│  [Ver Lista]                                                    │
│                                                                 │
│  Documentos a Solicitar:                                        │
│  ☑ Currículo atualizado                                         │
│  ☑ RG e CPF                                                     │
│  ☑ Comprovante de residência                                    │
│  ☑ Diploma ou certificado de conclusão                          │
│  ☐ Certidões negativas (criminal e civil)                       │
│  ☐ Carteira de trabalho                                         │
│                                                                 │
│  Prazo para Envio:                                              │
│  [7 dias                                                  ▾]    │
│                                                                 │
│  Mensagem Personalizada (opcional):                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Para avançar para a próxima etapa, precisamos dos      │   │
│  │ documentos listados acima. Por favor, envie até        │   │
│  │ {{prazo}}.                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Cancelar] [Enviar Solicitação]                                │
└─────────────────────────────────────────────────────────────────┘
```

**Request Logic:**
```typescript
async function requestDocuments(
  candidateIds: string[],
  docTypes: string[],
  deadline: Date,
  message?: string
) {
  // Create document requests
  const requests = candidateIds.flatMap(candidatoId =>
    docTypes.map(tipo => ({
      candidato_id: candidatoId,
      tipo_documento: tipo,
      status: 'solicitado',
      prazo: deadline,
      solicitado_por: currentUser.id,
      solicitado_em: new Date()
    }))
  )

  await supabase.from('solicitacoes_documentos').insert(requests)

  // Send emails
  for (const candidatoId of candidateIds) {
    const { data: candidato } = await supabase
      .from('candidatos')
      .select('nome_completo, email')
      .eq('id', candidatoId)
      .single()

    await sendEmail({
      to: candidato.email,
      template: 'documents_requested',
      data: {
        nome: candidato.nome_completo,
        documentos: docTypes.map(t => t.replace('_', ' ')).join(', '),
        prazo: format(deadline, 'dd/MM/yyyy'),
        mensagem: message || '',
        link_upload: `https://beautysmile.com.br/perfil#documentos`
      }
    })
  }

  toast.success(`Solicitação enviada para ${candidateIds.length} candidatos`)
}
```

### FR-004: Document Preview
**In-Browser Preview:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Preview: CV_Ana_Silva.pdf                            [X]       │
├─────────────────────────────────────────────────────────────────┤
│  [◀️ Prev] [▶️ Next] [⬇️ Download] [🖨️ Print]                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │                                                         │   │
│  │                PDF VIEWER                               │   │
│  │              (react-pdf or pdf.js)                      │   │
│  │                                                         │   │
│  │                                                         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Página 1 de 2         Zoom: [100%  ▾]                         │
│                                                                 │
│  Metadados:                                                     │
│  • Candidato: Ana Silva                                         │
│  • Tipo: Currículo                                              │
│  • Tamanho: 2.3 MB                                              │
│  • Enviado: 01/11/2024 14:30                                    │
│  • Visualizado por: João Silva, Maria Santos                    │
│                                                                 │
│  [✓ Aprovar] [✗ Rejeitar] [⚠️ Flag]                           │
└─────────────────────────────────────────────────────────────────┘
```

**Supported Formats:**
- PDF: In-browser preview with react-pdf
- Images (JPG, PNG): Direct display
- Word (DOC, DOCX): Convert to PDF on server or download only
- Other: Download only

**Preview Tracking:**
```typescript
async function trackDocumentView(documentoId: string) {
  await supabase.from('documentos_visualizacoes').insert([{
    documento_id: documentoId,
    visualizado_por: currentUser.id,
    data_visualizacao: new Date(),
    ip_address: getUserIP()
  }])
}
```

### FR-005: Document Compliance Checklist
**Per-Candidate Compliance:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Checklist de Documentos - Ana Silva                  [X]       │
├─────────────────────────────────────────────────────────────────┤
│  Vaga: Dentista Recepcionista - São Paulo                      │
│  Etapa: Entrevista Presencial                                   │
│                                                                 │
│  Documentos Obrigatórios:                                       │
│  ✓ Currículo atualizado                 Aprovado em 01/11/2024 │
│  ✓ RG e CPF                              Aprovado em 28/10/2024 │
│  ⏳ Comprovante de residência            Pendente verificação   │
│  ✓ Diploma de formação                   Aprovado em 25/10/2024 │
│  ❌ Certidões negativas                  Faltando               │
│                                                                 │
│  Documentos Opcionais:                                          │
│  ✓ Certificações profissionais           Aprovado em 22/10/2024 │
│  ○ Carta de recomendação                 Não enviado            │
│                                                                 │
│  Status Geral: ⚠️ 80% Completo (4/5 obrigatórios)              │
│                                                                 │
│  [Solicitar Documentos Faltantes]                               │
└─────────────────────────────────────────────────────────────────┘
```

**Checklist Configuration (Admin):**
```typescript
interface DocumentChecklist {
  id: string
  vaga_id?: string          // Specific job or null for all jobs
  etapa_minima: string      // Minimum stage to require docs
  documentos: {
    tipo: string
    obrigatorio: boolean
    descricao: string
  }[]
}

// Example:
const defaultChecklist: DocumentChecklist = {
  id: 'default',
  vaga_id: null,
  etapa_minima: 'entrevista_presencial',
  documentos: [
    { tipo: 'curriculo', obrigatorio: true, descricao: 'CV atualizado' },
    { tipo: 'rg_cpf', obrigatorio: true, descricao: 'RG e CPF (frente e verso)' },
    { tipo: 'comprovante_residencia', obrigatorio: true, descricao: 'Comprovante de residência (últimos 3 meses)' },
    { tipo: 'diploma', obrigatorio: true, descricao: 'Diploma ou certificado de conclusão' },
    { tipo: 'certidoes', obrigatorio: true, descricao: 'Certidões negativas (criminal e civil)' },
    { tipo: 'certificacoes', obrigatorio: false, descricao: 'Certificações profissionais' }
  ]
}
```

### FR-006: Document Expiration Tracking
**For Time-Sensitive Documents:**

```typescript
interface DocumentoExpiracao {
  id: string
  documento_id: string
  data_validade: Date
  dias_aviso_antecedencia: number  // Alert X days before expiry
  status: 'valido' | 'expirando_em_breve' | 'expirado'
}
```

**Expiration Widget:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Documentos Expirando em Breve                              │
├─────────────────────────────────────────────────────────────────┤
│  Candidato        Documento          Vencimento    Dias         │
│  ────────────────────────────────────────────────────────────  │
│  Ana Silva        Certificação CRO   15/11/2024    14 dias 🟡  │
│  Carlos Souza     Carteira CREA      05/11/2024    4 dias  🔴  │
│  Elena Martins    Cert. Primeiro     01/12/2024    30 dias 🟢  │
│                   Socorros                                      │
│                                                                 │
│  [Solicitar Renovação] [Ver Todos]                              │
└─────────────────────────────────────────────────────────────────┘
```

**Auto-Reminder (Cron Job):**
```typescript
async function checkExpiringDocuments() {
  const { data: expiring } = await supabase
    .from('documentos_candidatos')
    .select(`
      *,
      candidato:candidatos(nome_completo, email)
    `)
    .not('data_validade', 'is', null)
    .lt('data_validade', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    .eq('status', 'aprovado')

  for (const doc of expiring) {
    const daysUntilExpiry = differenceInDays(doc.data_validade, new Date())

    await sendEmail({
      to: doc.candidato.email,
      template: 'document_expiring',
      data: {
        nome: doc.candidato.nome_completo,
        documento: doc.tipo,
        data_vencimento: format(doc.data_validade, 'dd/MM/yyyy'),
        dias_restantes: daysUntilExpiry
      }
    })
  }
}
```

### FR-007: Document Templates
**Provide Templates for Candidates:**

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Templates de Documentos                  [+ Novo Template]  │
├─────────────────────────────────────────────────────────────────┤
│  Nome                         Tipo          Downloads           │
│  ─────────────────────────────────────────────────────────────  │
│  Termo de Consentimento       Formulário    156  [⬇️][✏️][🗑️] │
│  Declaração de Experiência    Formulário    89   [⬇️][✏️][🗑️] │
│  Formulário de Dados Pessoais Formulário    234  [⬇️][✏️][🗑️] │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Template Upload:**
- HR uploads blank template (PDF or DOCX)
- Template available on candidate document upload page
- Candidate downloads, fills, uploads back

**Template Structure:**
```typescript
interface DocumentoTemplate {
  id: string
  nome: string
  descricao: string
  tipo: 'formulario' | 'declaracao' | 'termo'
  arquivo_url: string      // Blank template in Storage
  criado_por: string
  criado_em: Date
  downloads_count: number
}
```

### FR-008: Document Audit Trail
**Who Viewed What and When:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Auditoria - CV_Ana_Silva.pdf                          [X]      │
├─────────────────────────────────────────────────────────────────┤
│  Evento              Usuário       Data/Hora        Detalhes    │
│  ────────────────────────────────────────────────────────────  │
│  Upload               Ana Silva    01/11/24 14:30   -           │
│  Visualização         João Silva   01/11/24 15:00   IP: 192... │
│  Visualização         Maria Santos 01/11/24 16:15   IP: 192... │
│  Aprovado             João Silva   01/11/24 16:45   -           │
│  Visualização         Pedro Costa  02/11/24 09:00   IP: 192... │
│  Download             Maria Santos 02/11/24 10:30   -           │
│                                                                 │
│  Total de Visualizações: 3                                      │
│  Total de Downloads: 1                                          │
│                                                                 │
│  [Exportar Log]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**LGPD Compliance:**
- Log all document access
- Show audit trail to candidates (transparency)
- Retain logs for 5 years

### FR-009: Document Reports
**Generate Compliance Reports:**

**Report Types:**
1. **Document Compliance by Candidate**
   - Shows which candidates have complete docs
   - Filter by job, stage, date range

2. **Document Approval Rate**
   - % of docs approved vs rejected
   - Reasons for rejection

3. **Document Request Fulfillment**
   - Requested vs received
   - Avg time to submit

**Report Export:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Gerar Relatório de Documentos                         [X]      │
├─────────────────────────────────────────────────────────────────┤
│  Tipo de Relatório:                                             │
│  [Compliance por Candidato                              ▾]      │
│                                                                 │
│  Período:                                                       │
│  De: [01/10/2024    ]  Até: [01/11/2024    ]                   │
│                                                                 │
│  Filtros:                                                       │
│  Vaga:       [Todas                                     ▾]      │
│  Etapa:      [Todas                                     ▾]      │
│  Status Doc: [Todos                                     ▾]      │
│                                                                 │
│  Formato:                                                       │
│  ○ PDF  ○ Excel  ○ CSV                                          │
│                                                                 │
│  [Cancelar] [Gerar Relatório]                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Sample Report (Excel):**
```
Candidato       Vaga           Etapa    CV  RG  Diploma  Certidão  Status
Ana Silva       Dentista SP    Entr.P   ✓   ✓   ✓        ✓         100%
Bruno Costa     Recep. RJ      Entr.O   ✓   ✓   ✓        ✗         75%
Carla Souza     Aux. BH        DISC     ✓   ✗   ✗        ✗         25%
```

### FR-010: Mobile Responsiveness
**Mobile View:**
- Simplified document list (card layout)
- Preview opens full-screen
- Approve/reject via bottom sheet
- Filters in drawer menu

```
┌──────────────────────────────┐
│  📄 Documentos               │
│  [Filtros ▾]                 │
├──────────────────────────────┤
│  ┌────────────────────────┐ │
│  │ 📄 CV_Ana_Silva.pdf    │ │
│  │ Ana Silva              │ │
│  │ Currículo              │ │
│  │ ⏳ Pendente            │ │
│  │ 01/11/2024             │ │
│  │ [Ver] [✓] [✗]         │ │
│  └────────────────────────┘ │
│                              │
│  ┌────────────────────────┐ │
│  │ 📄 Diploma_USP.pdf     │ │
│  │ Ana Silva              │ │
│  │ Diploma                │ │
│  │ ✓ Aprovado             │ │
│  │ 28/10/2024             │ │
│  │ [Ver] [⬇️]             │ │
│  └────────────────────────┘ │
└──────────────────────────────┘
```

## 5. Non-Goals (Out of Scope)

1. **Automated document verification (AI/OCR)** - Manual verification only for MVP
2. **E-signature collection** - Upload only, no DocuSign integration
3. **Document version control** - Latest upload only
4. **Collaborative document review** - Single reviewer at a time
5. **Document annotation/markup** - View-only, no edits
6. **Video uploads** - Documents only (PDF, images, Word)
7. **Blockchain verification** - Standard database storage
8. **Integration with government databases** - Manual verification
9. **Automated background checks** - External service, not integrated
10. **Document translation** - Portuguese only

## 6. Design Considerations

**Visual Design:**
- Clean, table-based layout for document lists
- Color-coded status badges (🟢🟡🔴)
- PDF preview with zoom controls
- Document compliance progress bars

**Accessibility:**
- All document actions keyboard accessible
- Screen reader support for status updates
- High contrast mode for PDF viewer
- ARIA labels for all buttons

**Security:**
- Document URLs expire after 1 hour (signed URLs)
- RLS policies prevent cross-candidate access
- Audit all document downloads
- Encrypt sensitive docs at rest

## 7. Technical Considerations

**State Management:**
```typescript
interface DocumentosRHState {
  documentos: DocumentoCandidato[]
  filters: DocumentFilters
  selectedDocumento: DocumentoCandidato | null
  checklists: DocumentChecklist[]
  templates: DocumentoTemplate[]
  isLoading: boolean

  fetchDocumentos: () => Promise<void>
  approveDocument: (id: string, notas?: string) => Promise<void>
  rejectDocument: (id: string, motivo: string) => Promise<void>
  requestDocuments: (candidateIds: string[], types: string[]) => Promise<void>
  generateReport: (type: string, filters: any) => Promise<void>
}
```

**Database Queries:**
```typescript
const { data: documentos } = await supabase
  .from('documentos_candidatos')
  .select(`
    *,
    candidato:candidatos(nome_completo, email, vaga:vagas(titulo)),
    visualizacoes:documentos_visualizacoes(count),
    historico:documentos_status_historico(*)
  `)
  .eq('visivel_rh', true)
  .in('status', filters.status)
  .in('tipo', filters.tipos)
  .order('data_upload', { ascending: false })
```

**Performance:**
- Lazy load document previews
- Paginate document list (20 per page)
- Cache frequently accessed docs (CDN)
- Background job for expiration checks

## 8. Success Metrics

**Primary:**
1. Document review time: ≤ 3 minutes per document
2. Approval rate: ≥ 90% of valid docs approved
3. Request fulfillment: ≥ 80% submitted within deadline
4. Compliance rate: ≥ 95% of candidates at final stage have all docs

**Secondary:**
1. Avg docs per candidate: 4-6 documents
2. Rejection rate: ≤ 5% due to fraud/invalid
3. Document request usage: ≥ 60% of HR use bulk requests
4. Mobile usage: ≥ 20% of reviews on mobile

## 9. Open Questions

1. **Document Retention:**
   - **Question:** How long to keep rejected candidate documents?
   - **Recommendation:** 6 months for rejected, 24 months for hired

2. **Fraud Detection:**
   - **Question:** Implement automated fraud detection (AI)?
   - **Recommendation:** Phase 2, manual flagging for MVP

3. **Document Re-upload:**
   - **Question:** Allow candidates to re-upload rejected docs?
   - **Recommendation:** Yes, unlimited attempts with HR notification

---

## Acceptance Criteria Summary

✅ HR can view all candidate documents with filtering
✅ HR can approve/reject documents with reasons
✅ HR can flag documents for manual review
✅ Bulk document request works for multiple candidates
✅ Document preview works for PDF and images
✅ Document compliance checklist tracks required docs
✅ Expiration tracking alerts for time-sensitive docs
✅ Document templates available for download
✅ Audit trail logs all document views and downloads
✅ Compliance reports exportable to Excel/PDF
✅ Mobile-responsive document list and preview
✅ RLS policies prevent unauthorized access
✅ Email notifications sent for requests and approvals
✅ All actions logged to auditoria_sistema
✅ Manual QA passes with 0 critical bugs
✅ E2E test covers request → upload → approve flow

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 5-6 days
**Dependencies:**
- ✅ `documentos_candidatos` table (from PRD-DEV-019)
- ✅ `documentos_status_historico` table
- ✅ `documentos_visualizacoes` table (audit)
- ✅ `solicitacoes_documentos` table
- ✅ `documentos_templates` table
- ✅ `document_checklists` table
- ✅ Supabase Storage with signed URLs
- ✅ react-pdf for PDF preview
- ✅ Email service (Resend) for notifications
- ✅ XLSX.js for Excel reports
- ✅ jsPDF for PDF reports
**Blocker Status:** 🟡 MEDIUM - Important for compliance but not blocking early recruitment stages
