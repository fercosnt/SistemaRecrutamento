# PRD-DEV-016: CRUD de Vagas

## 1. Introduction/Overview

The CRUD de Vagas (Job Posting Management) system enables HR and admin users to create, edit, publish, and manage job openings for the Beauty Smile recruitment process. This is the central hub where all available positions are defined, maintained, and made available to candidates.

**Problem it solves:** HR teams need a streamlined way to manage job postings with proper validation, version control, and publication workflows. Without this system, HR cannot create positions for candidates to apply to, blocking the entire recruitment funnel.

**Goal:** Implement a comprehensive job posting management interface where HR/admin users can create detailed job listings with rich content, manage multiple positions simultaneously, track applications per job, and control publication status—all while maintaining data integrity and providing excellent UX.

## 2. Goals

1. Enable HR to create new job postings with all required fields
2. Support rich text editing for job descriptions and requirements
3. Implement draft/preview/publish workflow
4. Allow editing of active job postings with change tracking
5. Provide soft delete functionality with restore capability
6. Support job duplication for similar positions
7. Display application counts and candidate pipeline per job
8. Implement job templates for common positions
9. Enable bulk status changes (pause/resume multiple jobs)
10. Provide SEO-friendly public job pages for candidates
11. Track job posting analytics (views, applications, conversion rates)
12. Support internal vs. external job postings

## 3. User Stories

### Primary Flow
**As an** HR professional
**I want to** create a new job posting with all relevant details
**So that** candidates can find and apply to open positions

**As an** HR recruiter
**I want to** preview how the job will look to candidates before publishing
**So that** I can ensure accuracy and proper formatting

**As an** admin user
**I want to** edit active job postings to update requirements or deadlines
**So that** job information stays current without creating duplicate posts

### Secondary Flow
**As an** HR manager
**I want to** see how many candidates applied to each job
**So that** I can assess posting effectiveness and adjust recruitment strategies

**As an** HR professional
**I want to** duplicate existing job postings
**So that** I can quickly create similar positions without re-entering data

**As an** admin user
**I want to** close or pause job postings when positions are filled
**So that** candidates don't apply to unavailable positions

### Edge Cases
**As an** HR user
**I want** the system to prevent publishing jobs with incomplete required fields
**So that** candidates always see complete, professional job listings

**As an** admin
**I want** to restore accidentally deleted job postings
**So that** work isn't lost due to user errors

**As an** HR recruiter
**I want** to save draft jobs and return later to finish them
**So that** I don't need to complete postings in one session

## 4. Functional Requirements

### FR-001: Access Control
**Permissions:**
```typescript
const jobPermissions = {
  rh_basico: {
    create: true,
    edit_own: true,    // Only jobs they created
    delete_own: false,  // Cannot delete
    publish: false,     // Cannot publish (needs approval)
    view_all: true
  },
  rh_avancado: {
    create: true,
    edit_all: true,
    delete_own: true,
    publish: true,      // Can publish without approval
    view_all: true,
    approve: true       // Can approve rh_basico drafts
  },
  admin: {
    create: true,
    edit_all: true,
    delete_all: true,
    publish: true,
    view_all: true,
    approve: true,
    restore: true       // Restore soft-deleted jobs
  }
}
```

**RLS Policies:**
- `rh_basico` can only edit jobs where `criado_por = auth.uid()`
- `rh_avancado` and `admin` can edit all jobs
- Candidates see only jobs where `status = 'publicada'` AND `data_fechamento >= NOW()`

### FR-002: Job Listing View
**URL:** `/admin/vagas`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Vagas Abertas                         [+ Nova Vaga]        │
├─────────────────────────────────────────────────────────────┤
│  Filtros:                                                   │
│  [Status ▾] [Localização ▾] [Tipo Contrato ▾] [🔍 Buscar] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Visão Geral:                                           │
│  • Ativas: 12  • Pausadas: 3  • Rascunhos: 5  • Fechadas: 8│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Título          Status    Candidatos  Criada    Ações     │
│  ─────────────────────────────────────────────────────────  │
│  💼 Dentista     🟢 Ativa     45      01/11/25  [✏️📊🗑️]  │
│     Recepcionista                                           │
│     São Paulo                                               │
│                                                             │
│  💼 Auxiliar     🟡 Pausa     12      28/10/25  [✏️📊🗑️]  │
│     de Dentista                                             │
│     Rio de Janeiro                                          │
│                                                             │
│  💼 Gerente RH   🔵 Rascun    0       29/10/25  [✏️📊🗑️]  │
│     São Paulo         ho                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Sorting:**
- Default: Created date (descending)
- Options: Title, Status, Application count, Closing date

**Bulk Actions:**
- Select multiple jobs
- Actions: Pause, Resume, Close, Export (Excel/PDF)

### FR-003: Create New Job Form
**URL:** `/admin/vagas/nova`

**Form Fields:**
```typescript
interface VagaFormData {
  // Basic Information
  titulo: string                    // Required, max 100 chars
  departamento: string              // Select: Clínico, Administrativo, RH, etc.
  localizacao: string               // Required, autocomplete cities
  tipo_contrato: 'CLT' | 'PJ' | 'Estagio' | 'Temporario'

  // Job Details
  descricao: string                 // Rich text editor, required
  responsabilidades: string         // Rich text editor, required
  requisitos_obrigatorios: string   // Rich text editor, required
  requisitos_desejaveis: string     // Rich text editor, optional

  // Compensation
  salario_min: number              // Optional, BRL
  salario_max: number              // Optional, BRL
  mostrar_salario: boolean         // Show on public listing?
  beneficios: string[]             // Multi-select: VT, VR, Plano Saúde, etc.

  // Position Details
  numero_vagas: number             // Default: 1
  jornada_trabalho: string         // e.g., "Segunda a Sexta, 8h-18h"
  modalidade: 'Presencial' | 'Remoto' | 'Híbrido'

  // Timeline
  data_abertura: Date              // Default: today
  data_fechamento: Date            // Optional, auto-close after this date

  // Advanced
  status: 'rascunho' | 'aguardando_aprovacao' | 'publicada' | 'pausada' | 'fechada'
  visibilidade: 'interna' | 'externa' | 'ambas'  // Who can see this job?
  destaque: boolean                // Featured job (show first)?

  // SEO (auto-generated, editable)
  slug: string                     // URL-friendly: "dentista-sao-paulo-2024"
  meta_titulo: string              // SEO title, default: job title
  meta_descricao: string           // SEO description, max 160 chars
}
```

**Rich Text Editor:**
- Use TipTap or Quill
- Toolbar: Bold, Italic, Underline, Lists, Links, Headings
- Max content: 10,000 characters per field
- Paste from Word support

**Validation Rules:**
```typescript
const vagaValidation = z.object({
  titulo: z.string().min(10, "Mínimo 10 caracteres").max(100),
  descricao: z.string().min(50, "Descrição muito curta"),
  responsabilidades: z.string().min(30),
  requisitos_obrigatorios: z.string().min(20),
  localizacao: z.string().min(3),
  tipo_contrato: z.enum(['CLT', 'PJ', 'Estagio', 'Temporario']),
  numero_vagas: z.number().min(1).max(50),
  salario_max: z.number().optional().refine((max) => {
    if (max && formData.salario_min) {
      return max >= formData.salario_min
    }
    return true
  }, "Salário máximo deve ser >= mínimo"),
  data_fechamento: z.date().optional().refine((date) => {
    if (date) return date > new Date()
    return true
  }, "Data de fechamento deve ser futura")
})
```

**Auto-Save:**
- Save draft to localStorage every 30 seconds
- Show "Salvando rascunho..." indicator
- Restore draft on page reload if unsaved changes exist

### FR-004: Job Preview
**Trigger:** "Pré-visualizar" button on create/edit form

**Preview Modal:**
Shows exactly how candidates will see the job on public job board and detail page.

```
┌─────────────────────────────────────────────────────────┐
│  Pré-visualização da Vaga                      [X Fechar]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  💼 Dentista Recepcionista                             │
│  Beauty Smile Odontologia                               │
│  📍 São Paulo, SP  •  💼 CLT  •  ⏰ Integral           │
│  💰 R$ 3.000 - R$ 4.500                                │
│  📅 Publicada em: 01/11/2024                           │
│                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│  📋 Sobre a Vaga                                       │
│  [Rich text content rendered here...]                   │
│                                                         │
│  ✅ Responsabilidades                                  │
│  • Atendimento ao público                              │
│  • Agendamento de consultas                            │
│  • Gestão de prontuários                               │
│                                                         │
│  🎯 Requisitos Obrigatórios                            │
│  • Ensino médio completo                               │
│  • Experiência em recepção (min. 1 ano)                │
│                                                         │
│  🌟 Benefícios                                         │
│  • Vale transporte                                      │
│  • Vale refeição                                        │
│  • Plano de saúde                                       │
│                                                         │
│  [Candidatar-se a esta vaga]                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Actions in Preview:**
- [Editar] - Return to form
- [Publicar] - Save and publish (if user has permission)
- [Salvar Rascunho] - Save without publishing

### FR-005: Publish Workflow
**Status Transitions:**
```
Rascunho → Aguardando Aprovação → Publicada
   ↓              ↓                   ↓
  [Delete]    [Approve/Reject]    [Pause/Close]
```

**For rh_basico:**
1. Click "Enviar para Aprovação"
2. Status changes to `aguardando_aprovacao`
3. Notification sent to `rh_avancado` users
4. Cannot edit until approved/rejected

**For rh_avancado/admin:**
1. Click "Publicar"
2. Status changes to `publicada` immediately
3. Job appears on public board
4. Webhook triggered to N8N (job-published event)

**Approval Interface (for rh_avancado/admin):**
```
┌─────────────────────────────────────────────────────────┐
│  Aprovar Vaga: Auxiliar de Dentista                    │
├─────────────────────────────────────────────────────────┤
│  Criada por: João Silva (rh_basico)                    │
│  Data: 29/10/2024                                       │
│                                                         │
│  [View full job preview]                                │
│                                                         │
│  Comentários (opcional):                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [❌ Rejeitar]  [✅ Aprovar e Publicar]                │
└─────────────────────────────────────────────────────────┘
```

**On Rejection:**
- Status returns to `rascunho`
- Comment stored in `aprovacoes_vagas` table
- Email sent to creator with feedback
- Creator can edit and resubmit

### FR-006: Edit Job
**URL:** `/admin/vagas/:id/editar`

**Change Tracking:**
```typescript
interface VagaHistorico {
  id: string
  vaga_id: string
  usuario_id: string
  campos_alterados: {
    campo: string
    valor_anterior: any
    valor_novo: any
  }[]
  data_alteracao: Date
  motivo: string  // Optional: "Aumento salarial aprovado"
}
```

**Edit Behavior:**
- For `rascunho`: Full edit, no tracking
- For `publicada`: Track all changes, log to `vagas_historico` table
- Show warning: "Esta vaga está ativa com X candidatos. Alterações afetarão a listagem pública."

**Audit Log Display (at bottom of edit form):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 Histórico de Alterações

• 01/11/2024 10:30 - Maria Santos
  Salário alterado: R$ 3.000-4.000 → R$ 3.000-4.500
  Motivo: Ajuste aprovado pela diretoria

• 29/10/2024 15:20 - João Silva
  Status: Rascunho → Publicada
```

### FR-007: Delete/Archive Job
**Soft Delete:**
- Jobs never permanently deleted from database
- Set `deleted_at = NOW()` and `status = 'arquivada'`
- Remove from public listings immediately
- Retain all candidate data and application history

**Delete Confirmation Modal:**
```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ Arquivar Vaga                                       │
├─────────────────────────────────────────────────────────┤
│  Você está prestes a arquivar:                          │
│  "Dentista Recepcionista - São Paulo"                  │
│                                                         │
│  Esta vaga possui:                                      │
│  • 45 candidatos em processo                            │
│  • 12 em triagem, 8 em testes, 3 em entrevista         │
│                                                         │
│  ⚠️ A vaga será removida do site público, mas os       │
│     candidatos em processo serão preservados.           │
│                                                         │
│  Motivo do arquivamento (opcional):                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ○ Vaga preenchida                               │   │
│  │ ○ Vaga cancelada                                │   │
│  │ ○ Duplicada                                     │   │
│  │ ○ Outro: ___________________________            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Cancelar]  [Arquivar Vaga]                           │
└─────────────────────────────────────────────────────────┘
```

**Restore (Admin only):**
- Filter view: "Mostrar vagas arquivadas"
- [Restaurar] button: Set `deleted_at = NULL`, `status = 'pausada'`
- Requires confirmation: "Restaurar vaga? Ela ficará pausada até você publicá-la novamente."

### FR-008: Duplicate Job
**Trigger:** Duplicate button on job listing or detail page

**Behavior:**
```typescript
async function duplicateJob(originalJobId: string) {
  const { data: original } = await supabase
    .from('vagas')
    .select('*')
    .eq('id', originalJobId)
    .single()

  const newJob = {
    ...original,
    id: undefined,              // Generate new ID
    titulo: `${original.titulo} (Cópia)`,
    slug: `${original.slug}-copia-${Date.now()}`,
    status: 'rascunho',
    numero_candidatos: 0,
    data_abertura: new Date(),
    data_fechamento: null,
    criado_por: currentUser.id,
    criado_em: new Date(),
    deleted_at: null
  }

  const { data: duplicated } = await supabase
    .from('vagas')
    .insert([newJob])
    .select()
    .single()

  // Redirect to edit page
  router.push(`/admin/vagas/${duplicated.id}/editar`)
}
```

**Success Toast:**
"Vaga duplicada com sucesso. Edite os detalhes e publique quando pronto."

### FR-009: Job Templates
**Pre-built Templates:**
Create templates for common positions to speed up job creation.

**Template Structure:**
```typescript
interface VagaTemplate {
  id: string
  nome: string
  departamento: string
  descricao_template: string
  responsabilidades_template: string
  requisitos_template: string
  beneficios_padrao: string[]
  tipo_contrato_padrao: string
  modalidade_padrao: string
  criado_por: 'sistema' | string  // System templates vs user-created
}
```

**System Templates (pre-populated):**
1. Dentista Clínico Geral
2. Auxiliar de Dentista
3. Recepcionista
4. Coordenador de RH
5. Gerente Administrativo

**Template Usage:**
- On `/admin/vagas/nova` page, show "Usar template" button
- Template selector modal appears
- User selects template → form pre-fills with template data
- User can edit all fields before saving

**Create Template from Existing Job:**
- On edit page of any job: "Salvar como template" button
- Opens modal: "Nome do template: ___________"
- Saves template to `vagas_templates` table
- Available for future use

### FR-010: Job Analytics
**Per-Job Metrics (displayed on job detail page):**

```typescript
interface VagaAnalytics {
  // Candidate Funnel
  total_visualizacoes: number      // Page views
  total_candidaturas: number       // Applications submitted
  taxa_conversao: number           // (candidaturas / visualizacoes) * 100

  // Candidate Pipeline
  por_etapa: {
    triagem: number
    big_five: number
    disc: number
    entrevista_online: number
    raven: number
    cultura: number
    entrevista_presencial: number
    aprovado: number
  }

  // Time Metrics
  tempo_medio_processo_dias: number   // Avg days from application to approval
  tempo_ate_primeira_candidatura: number  // Days from publish to first application

  // Demographics (aggregated)
  candidatos_por_genero: { M: number; F: number; Outro: number }
  candidatos_por_idade_media: number
  candidatos_por_escolaridade: { [key: string]: number }
}
```

**Analytics Dashboard (per job):**
```
┌─────────────────────────────────────────────────────────┐
│  📊 Analytics: Dentista Recepcionista                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Funil de Conversão:                                   │
│  👁️ Visualizações: 1,234                              │
│  📝 Candidaturas: 45 (3.6% conversão)                  │
│                                                         │
│  Pipeline de Candidatos:                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Triagem           ████████░░ 12 (27%)            │  │
│  │ Big Five          ████░░░░░░  8 (18%)            │  │
│  │ DISC              ███░░░░░░░  6 (13%)            │  │
│  │ Entrevista Online ██░░░░░░░░  4 (9%)             │  │
│  │ Raven             ██░░░░░░░░  3 (7%)             │  │
│  │ Cultura           █░░░░░░░░░  2 (4%)             │  │
│  │ Entrevista Pres.  █░░░░░░░░░  1 (2%)             │  │
│  │ Aprovado          ░░░░░░░░░░  0 (0%)             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Tempo Médio de Processo: 18 dias                      │
│  Tempo até 1ª Candidatura: 2 dias                      │
│                                                         │
│  [Exportar Relatório PDF]                              │
└─────────────────────────────────────────────────────────┘
```

### FR-011: Pause/Resume Job
**Pause Job:**
- Changes status to `pausada`
- Removes from public listings
- Preserves all candidate progress
- Use case: "Paused hiring while reviewing current applicants"

**Resume Job:**
- Changes status to `publicada`
- Re-appears on public listings
- All previous applications remain intact

**Bulk Pause:**
- Select multiple jobs
- Click "Pausar selecionadas"
- Confirmation: "Pausar X vagas? Elas serão removidas do site."

### FR-012: Close Job
**Close vs Archive:**
- **Close:** Status = `fechada`, vaga preenchida com sucesso
- **Archive:** Status = `arquivada`, vaga cancelada/duplicada

**Close Job Flow:**
```
1. Click "Fechar vaga"
2. Modal appears:
   ┌─────────────────────────────────────────────────┐
   │  Fechar Vaga: Dentista Recepcionista           │
   ├─────────────────────────────────────────────────┤
   │  Esta vaga foi preenchida?                      │
   │  ○ Sim, contratamos um candidato                │
   │  ○ Não, cancelamos a contratação                │
   │                                                 │
   │  Candidato contratado (se aplicável):           │
   │  [Selecionar candidato ▾]                       │
   │                                                 │
   │  Observações:                                   │
   │  ┌───────────────────────────────────────────┐ │
   │  │                                           │ │
   │  └───────────────────────────────────────────┘ │
   │                                                 │
   │  [Cancelar]  [Fechar Vaga]                     │
   └─────────────────────────────────────────────────┘

3. If candidate selected:
   - Update candidate: `status_processo = 'aprovado'`
   - Link candidate to job: `vaga_id_contratado = job.id`

4. Status = `fechada`
5. Remove from public listings
6. Send notifications to remaining candidates (template: "Vaga preenchida")
```

### FR-013: SEO & Public Job Page
**Public URL Structure:**
- Pattern: `https://beautysmile.com.br/vagas/:slug`
- Example: `https://beautysmile.com.br/vagas/dentista-sao-paulo-2024`

**SEO Meta Tags:**
```html
<title>{{ meta_titulo || titulo }} - Beauty Smile Vagas</title>
<meta name="description" content="{{ meta_descricao || descricao.substring(0, 160) }}">
<meta property="og:title" content="{{ titulo }}">
<meta property="og:description" content="{{ meta_descricao }}">
<meta property="og:type" content="job">
<meta property="og:url" content="https://beautysmile.com.br/vagas/{{ slug }}">

<!-- JSON-LD Structured Data for Google Jobs -->
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "{{ titulo }}",
  "description": "{{ descricao }}",
  "datePosted": "{{ data_abertura }}",
  "validThrough": "{{ data_fechamento }}",
  "employmentType": "{{ tipo_contrato }}",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Beauty Smile Odontologia",
    "sameAs": "https://beautysmile.com.br"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "{{ localizacao }}"
    }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "BRL",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": {{ salario_min }},
      "maxValue": {{ salario_max }},
      "unitText": "MONTH"
    }
  }
}
</script>
```

**Page View Tracking:**
```typescript
// On public job page load
async function trackJobView(vagaId: string) {
  await supabase
    .from('vagas_visualizacoes')
    .insert([{
      vaga_id: vagaId,
      data_visualizacao: new Date(),
      user_agent: navigator.userAgent,
      referrer: document.referrer
    }])

  // Also increment counter in vagas table
  await supabase.rpc('increment_vaga_views', { vaga_id: vagaId })
}
```

### FR-014: Mobile Responsiveness
**Mobile Optimizations:**
- Collapse filters into drawer on mobile
- Stack form fields vertically
- Use mobile-friendly date pickers
- Rich text editor with simplified toolbar on mobile
- Tap targets min 48x48px for all buttons
- Sticky "Salvar" button at bottom of form on mobile

## 5. Non-Goals (Out of Scope)

1. **Job boards integration** (Indeed, LinkedIn) - Future enhancement
2. **Video job descriptions** - Text/images only for MVP
3. **Salary benchmarking** - Manual input only
4. **Automated job posting** - All manual for MVP
5. **Multi-language job postings** - Portuguese only
6. **Advanced SEO tools** - Basic meta tags only
7. **Job posting scheduling** - Publish immediately or draft only
8. **Collaborative editing** - One user at a time
9. **Job posting A/B testing** - Single version only
10. **Integration with external ATS** - Standalone system

## 6. Design Considerations

**Visual Design:**
- Clean, professional form layout with clear sections
- Rich text preview side-by-side with editor (desktop)
- Color-coded status badges: 🟢 Active, 🟡 Paused, 🔵 Draft, ⚫ Closed
- Card-based job listing with hover states

**Accessibility:**
- All form inputs have proper labels
- Rich text editor keyboard shortcuts documented
- ARIA labels for status badges
- Form validation errors announced to screen readers
- High contrast mode support

**Responsive Breakpoints:**
- Desktop: 1024px+ (side-by-side preview)
- Tablet: 768px-1023px (stacked layout)
- Mobile: <768px (simplified interface)

## 7. Technical Considerations

**State Management:**
```typescript
interface VagaCRUDState {
  vagas: Vaga[]
  selectedVaga: Vaga | null
  filters: {
    status: string[]
    localizacao: string[]
    tipo_contrato: string[]
    busca: string
  }
  isLoading: boolean
  isSaving: boolean

  fetchVagas: () => Promise<void>
  createVaga: (data: VagaFormData) => Promise<Vaga>
  updateVaga: (id: string, data: Partial<VagaFormData>) => Promise<void>
  deleteVaga: (id: string, motivo: string) => Promise<void>
  duplicateVaga: (id: string) => Promise<Vaga>
}
```

**Database Queries:**
```typescript
// Fetch all jobs with filters
const { data: vagas } = await supabase
  .from('vagas')
  .select(`
    *,
    criador:usuarios_rh!criado_por(nome, email),
    candidaturas_count:candidaturas(count)
  `)
  .is('deleted_at', null)
  .in('status', filters.status)
  .ilike('titulo', `%${filters.busca}%`)
  .order('criado_em', { ascending: false })
```

**Real-time Subscriptions (for collaborative awareness):**
```typescript
const subscription = supabase
  .channel('vagas_changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'vagas'
  }, (payload) => {
    // Show toast: "João Silva atualizou a vaga 'Dentista SP'"
    toast.info(`${payload.new.updated_by} atualizou uma vaga`)
  })
  .subscribe()
```

**Performance:**
- Paginate job listings (20 per page)
- Debounce search input (300ms)
- Cache templates in localStorage
- Lazy load analytics data (separate API call)
- Use Supabase count queries for totals

## 8. Success Metrics

**Primary:**
1. Time to create job: ≤ 5 minutes for experienced user
2. Form completion rate: ≥ 90% (drafts that become published)
3. Duplicate job usage: ≥ 30% of new jobs use duplicate feature
4. Zero data loss: 100% draft auto-save success rate

**Secondary:**
1. Template usage: ≥ 40% of jobs created from templates
2. Edit frequency: Avg ≤ 2 edits per published job
3. Time to approval (rh_basico): ≤ 24 hours
4. Mobile job creation: ≥ 20% of jobs created on mobile

**Analytics Tracking:**
- Jobs created per week
- Avg time from draft to published
- Most popular templates
- Approval vs rejection rate (for rh_basico)

## 9. Open Questions

1. **Salary Visibility:**
   - **Question:** Should salary be required or optional?
   - **Recommendation:** Optional, but strongly encourage with tooltip: "Vagas com salário recebem 40% mais candidaturas"

2. **Approval Workflow:**
   - **Question:** Should rh_avancado review ALL jobs or only rh_basico jobs?
   - **Recommendation:** Only rh_basico jobs require approval. rh_avancado can publish directly.

3. **Job Expiration:**
   - **Question:** Auto-close jobs after X days with no applications?
   - **Recommendation:** Send email warning after 30 days, but don't auto-close (manual decision)

4. **Application Limits:**
   - **Question:** Should we limit applications per job (e.g., max 100 candidates)?
   - **Recommendation:** No limits for MVP, but show warning at 50+ applications

---

## Acceptance Criteria Summary

✅ HR can create new job postings with all required fields
✅ Rich text editor works for descriptions and requirements
✅ Draft/preview/publish workflow implemented
✅ Job duplication works and creates proper copies
✅ Soft delete with restore capability (admin only)
✅ Change tracking logs all edits to published jobs
✅ Approval workflow for rh_basico users
✅ Job templates pre-populated and user-creatable
✅ Public job pages have proper SEO meta tags and JSON-LD
✅ Analytics show funnel metrics and candidate pipeline
✅ Pause/resume functionality works without data loss
✅ Close job workflow links to hired candidate
✅ Bulk actions (pause/close/export) work for multiple jobs
✅ Mobile-responsive form and listing views
✅ Form validation prevents invalid submissions
✅ Auto-save prevents draft loss
✅ Manual QA passes with 0 critical bugs
✅ E2E test covers create → publish → edit → close flow

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 6-7 days
**Dependencies:**
- ✅ `vagas` table with all fields
- ✅ `vagas_historico` table for change tracking
- ✅ `vagas_templates` table
- ✅ `vagas_visualizacoes` table for analytics
- ✅ `aprovacoes_vagas` table for approval workflow
- ✅ Rich text editor library (TipTap/Quill)
- ✅ Role-based access control (RLS policies)
**Blocker Status:** 🔥 CRITICAL - Without jobs, candidates cannot apply, blocking entire system
