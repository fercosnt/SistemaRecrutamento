# PRD-DEV-005: Fluxo de Aplicação a Vagas

## 1. Introduction/Overview

The Fluxo de Aplicação a Vagas enables registered candidates to browse available job openings (vagas) and apply to positions that match their qualifications. This feature connects candidates with specific job opportunities and initiates the recruitment process for each application.

**Problem it solves:** Currently, candidates register but cannot see or apply to specific job openings. There's no connection between candidate profiles and available positions. HR needs a way to track which candidates applied to which jobs.

**Goal:** Implement a job application system that allows candidates to browse active job openings, view detailed job descriptions, apply to positions with one click, and track their application status. HR can then manage applications per vacancy and move candidates through the recruitment funnel.

## 2. Goals

1. Display a browsable list of active job openings (vagas) to authenticated candidates
2. Show detailed job information (title, description, requirements, benefits, location)
3. Enable one-click job application for authenticated candidates
4. Prevent duplicate applications (one application per candidate per vaga)
5. Track application status (applied, in_process, approved, rejected)
6. Trigger N8N webhook to initiate recruitment workflow for new applications
7. Send confirmation email to candidate after successful application
8. Allow candidates to view their application history in their dashboard
9. Enable HR to view all applications per vacancy in the admin panel
10. Support job filtering by location, type, and department

## 3. User Stories

### Primary Flow - Candidate Perspective
**As a** registered candidate
**I want to** see a list of available job openings at Beauty Smile
**So that** I can find positions that match my skills and interests

**As a** candidate viewing a job listing
**I want to** see detailed information about the position (requirements, benefits, location)
**So that** I can decide if I'm qualified and interested before applying

**As a** candidate interested in a position
**I want to** apply to the job with one click
**So that** I can express my interest quickly without filling out additional forms

**As a** candidate who already applied to a job
**I want to** see an indication that I've already applied
**So that** I don't accidentally apply twice

**As a** candidate tracking my applications
**I want to** view all jobs I've applied to and their current status
**So that** I can follow my progress in the recruitment process

### Secondary Flow - HR Perspective
**As an** HR manager
**I want to** view all candidates who applied to a specific vacancy
**So that** I can manage the recruitment pipeline for that position

**As an** HR manager
**I want to** see candidate qualifications when they apply
**So that** I can quickly assess if they meet the job requirements

**As an** HR professional
**I want** new applications to automatically trigger the recruitment workflow (Big Five test invitation)
**So that** candidates can start the assessment process immediately

### Edge Cases
**As a** candidate
**I want** to be notified if a job I'm viewing is no longer accepting applications
**So that** I don't waste time preparing to apply

**As a** candidate
**I want** to see a message if there are no active job openings
**So that** I know to check back later

**As an** HR manager
**I want** to see application timestamps
**So that** I can prioritize recent applicants

## 4. Functional Requirements

### FR-001: Job Listings Page
The system **must** provide a job listings page accessible to authenticated candidates:

**URL:** `/vagas` or `/oportunidades`

**Page Layout:**
- Header: "Vagas Disponíveis" with count (e.g., "12 oportunidades abertas")
- Filter sidebar (see FR-002)
- Grid/list of job cards (see FR-003)
- Empty state if no jobs available: "No momento não há vagas abertas. Fique atento!"

**Access Control:**
- Only authenticated candidates can view job listings
- Unauthenticated users redirected to login with message: "Faça login para ver vagas disponíveis"

### FR-002: Job Filtering & Sorting
The system **must** provide filtering and sorting options:

**Filters:**
- **Tipo de vaga:** Tempo integral, Meio período, Estágio, Temporário
- **Localização:** Dropdown de cidades (populated from `vagas.localizacao`)
- **Departamento:** Atendimento, Administrativo, Clínica, etc. (from `vagas.departamento`)
- **Status:** Apenas vagas ativas (default), ver todas

**Sorting:**
- Mais recentes (default: `created_at DESC`)
- Ordem alfabética (A-Z)
- Localização (agrupar por cidade)

**Filter Behavior:**
- Multiple filters combine with AND logic
- Filter count badge shows number of active filters
- "Limpar filtros" button resets all filters
- URL query params preserve filter state (shareable links)

**Example Query:**
```typescript
let query = supabase
  .from('vagas')
  .select('*')
  .eq('ativa', true)
  .eq('deleted_at', null)
  .order('created_at', { ascending: false })

if (filters.tipo_vaga) {
  query = query.eq('tipo_vaga', filters.tipo_vaga)
}
if (filters.localizacao) {
  query = query.eq('localizacao', filters.localizacao)
}
if (filters.departamento) {
  query = query.eq('departamento', filters.departamento)
}

const { data: vagas, error } = await query
```

### FR-003: Job Card Display
Each job card **must** display:

**Visual Elements:**
- Job title (e.g., "Assistente de Atendimento")
- Company logo (Beauty Smile logo)
- Location icon + city
- Department badge (color-coded)
- Posted date (e.g., "Publicado há 3 dias")

**Text Content:**
- Brief description (first 150 characters of `descricao`)
- Key requirements (bullet points, max 3)
- Benefits highlight (if available)

**Actions:**
- "Ver detalhes" button (secondary) → Opens job detail page/modal
- "Candidatar-se" button (primary) → Applies to job immediately
  - If already applied: Show "Já candidatado" badge (disabled button)

**Card States:**
- **Default:** White background, hover effect
- **Applied:** Green border, "Candidatura enviada" badge
- **Closed:** Gray overlay, "Vaga encerrada" badge (if `ativa = false`)

### FR-004: Job Detail Page/Modal
The system **must** show detailed job information:

**URL:** `/vagas/:id` or modal overlay

**Content Sections:**
1. **Header:**
   - Job title
   - Location, department, type (badges)
   - Posted date + application deadline (if set)
   - "Candidatar-se" CTA button (prominent)

2. **Descrição da Vaga:**
   - Full job description (markdown supported)
   - Responsibilities and day-to-day activities

3. **Requisitos:**
   - Required qualifications (bullet list)
   - Preferred qualifications (bullet list)
   - Required experience level

4. **Benefícios:**
   - Salary range (if disclosed)
   - Benefits package (health insurance, transportation, etc.)
   - Work schedule/hours

5. **Sobre a Beauty Smile:**
   - Brief company description
   - Company values
   - Team size, culture highlights

6. **Processo Seletivo:**
   - Overview of 7-stage recruitment process
   - Estimated timeline (e.g., "Processo completo: 2-3 semanas")
   - Next steps after application

**Actions:**
- Primary CTA: "Candidatar-se a esta vaga" button
- Secondary: "Voltar para lista de vagas" link
- Share button (copy link to clipboard)

### FR-005: Job Application Submission
The system **must** handle job applications:

**Prerequisite Check:**
1. User must be authenticated (redirect to login if not)
2. User must have completed profile (redirect to profile completion if not)
3. User cannot have already applied to this vaga

**Application Process:**
```typescript
// 1. Check for existing application
const { data: existingApp } = await supabase
  .from('candidaturas')
  .select('id')
  .eq('candidato_id', candidato.id)
  .eq('vaga_id', vaga.id)
  .eq('deleted_at', null)
  .single()

if (existingApp) {
  showError('Você já se candidatou a esta vaga.')
  return
}

// 2. Create candidatura record
const { data: candidatura, error } = await supabase
  .from('candidaturas')
  .insert([{
    candidato_id: candidato.id,
    vaga_id: vaga.id,
    status_candidatura: 'aplicado',
    data_aplicacao: new Date(),
    etapa_atual: 'triagem'
  }])
  .select()
  .single()

if (error) {
  showError('Erro ao enviar candidatura. Tente novamente.')
  return
}

// 3. Update candidate's candidaturas_ids array
const { error: updateError } = await supabase
  .from('candidatos')
  .update({
    candidaturas_ids: [...candidato.candidaturas_ids, candidatura.id]
  })
  .eq('id', candidato.id)

// 4. Trigger N8N webhook
await fetch('https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    candidatura_id: candidatura.id,
    candidato_id: candidato.id,
    vaga_id: vaga.id,
    nome_candidato: candidato.nome_completo,
    titulo_vaga: vaga.titulo
  })
})

// 5. Show success message
showSuccess('Candidatura enviada com sucesso! Você receberá um email com os próximos passos.')

// 6. Update UI to show "Já candidatado" state
```

**Success Actions:**
1. Create record in `candidaturas` table
2. Update `candidatos.candidaturas_ids` array (JSONB)
3. Trigger N8N webhook for "Nova Candidatura"
4. Send confirmation email (via Supabase trigger or N8N)
5. Show success toast notification
6. Update job card to show "Já candidatado" state
7. Log application event for analytics

### FR-006: Application Confirmation Email
The system **must** send an email after successful application:

**Email Template:** `candidato-confirmacao-candidatura`
**Subject:** "Candidatura recebida - [Título da Vaga] - Beauty Smile"
**Content:**
```
Olá [nome_completo],

Recebemos sua candidatura para a vaga de [titulo_vaga]!

Próximos passos:
1. Nossa equipe analisará seu perfil nas próximas 24-48 horas
2. Você receberá um email com o link para o Teste de Personalidade (Big Five)
3. Após a conclusão dos testes, agendaremos entrevistas com os candidatos aprovados

Detalhes da vaga:
- Título: [titulo_vaga]
- Localização: [localizacao]
- Departamento: [departamento]
- Data da candidatura: [data_aplicacao]

Você pode acompanhar o status da sua candidatura no seu dashboard.

Boa sorte!
Equipe Beauty Smile
```

**Trigger:** Supabase trigger on `candidaturas` insert OR N8N workflow

### FR-007: Application History (Candidate Dashboard)
The system **must** show application history in candidate dashboard:

**Location:** `/dashboard-candidato` section "Minhas Candidaturas"

**Display Format:**
- Table or card list of all applications
- Columns:
  - Vaga (job title, clickable link)
  - Data de candidatura (application date)
  - Status (badge: Aplicado, Em análise, Aprovado, Rejeitado)
  - Etapa atual (current recruitment stage: Triagem, Big Five, DISC, etc.)
  - Ações (Ver detalhes, Cancelar candidatura)

**Sorting:**
- Default: Most recent first
- Allow sort by status, date, job title

**Filters:**
- Status: Todas, Em andamento, Aprovadas, Rejeitadas
- Data: Último mês, Últimos 3 meses, Todas

**Empty State:**
"Você ainda não se candidatou a nenhuma vaga. Explore as oportunidades disponíveis!"
+ CTA button: "Ver vagas abertas"

### FR-008: Application Management (HR Dashboard)
The system **must** show applications per vacancy in HR dashboard:

**Location:** `/admin/vagas/:id/candidatos`

**Display:**
- List of all candidates who applied to this vaga
- Candidate cards showing:
  - Nome completo
  - Email, telefone
  - Data de aplicação
  - Status atual (triagem, big_five, disc, etc.)
  - Progresso (0-100%)
  - Ações: Ver perfil, Aprovar/Rejeitar, Enviar mensagem

**Filters:**
- Status: Todos, Triagem, Em teste, Em entrevista, Aprovados, Rejeitados
- Data de aplicação: Hoje, Esta semana, Este mês
- Progresso: 0-25%, 26-50%, 51-75%, 76-100%

**Bulk Actions:**
- Select multiple candidates
- Bulk send email
- Bulk move to next stage
- Bulk reject

### FR-009: Application Status Updates
The system **must** allow HR to update application status:

**Status Flow:**
```
aplicado → em_analise → em_teste → em_entrevista → aprovado
                                              ↓
                                         rejeitado
```

**Update Interface (HR Dashboard):**
- Dropdown to change status
- Text area for rejection reason (required if rejecting)
- Checkbox: "Notificar candidato por email"
- "Salvar" button

**When status changes:**
1. Update `candidaturas.status_candidatura`
2. Update `candidaturas.etapa_atual` if advancing stages
3. Send email to candidate (if notification checked)
4. Log event in `logs_acesso` or activity log
5. Update candidate's `progresso_processo` percentage

**Email Templates:**
- `candidato-status-aprovado` - Advancing to next stage
- `candidato-status-rejeitado` - Application rejected
- `candidato-status-em-entrevista` - Interview scheduled

### FR-010: Duplicate Application Prevention
The system **must** prevent duplicate applications:

**Frontend Check:**
- Before showing "Candidatar-se" button, query existing applications
- If application exists, show "Já candidatado" badge instead of button
- Disable button if application in progress

**Backend Check (RLS Policy):**
```sql
-- Prevent duplicate candidaturas via unique constraint
ALTER TABLE candidaturas
ADD CONSTRAINT unique_candidato_vaga
UNIQUE (candidato_id, vaga_id)
WHERE deleted_at IS NULL;
```

**Error Handling:**
- If duplicate insert attempted: Show "Você já se candidatou a esta vaga"
- Link to dashboard: "Ver minhas candidaturas"

## 5. Non-Goals (Out of Scope)

The following are **NOT** part of this PRD:

1. **Resume/CV upload during application** - Profile is already complete
2. **Cover letter submission** - Not required for MVP
3. **Application withdrawal** - Candidates cannot cancel applications (contact HR instead)
4. **Job alerts/notifications** - Future feature (email when new jobs posted)
5. **Saved/bookmarked jobs** - Future feature
6. **Application deadline enforcement** - Not implementing deadline automation for MVP
7. **Internal job referrals** - Future feature
8. **Application scoring/ranking** - AI scoring via N8N, not in application flow
9. **Interview scheduling in application flow** - Separate PRD
10. **Multiple applications at once** - One application at a time

## 6. Design Considerations

### UI/UX Requirements

**Job Listings Page:**
- Clean, modern job board design (reference: LinkedIn, Indeed)
- Mobile-responsive grid (1 column mobile, 2-3 columns desktop)
- Filter sidebar collapsible on mobile
- Infinite scroll or pagination (show 12 jobs per page)

**Job Cards:**
- Consistent height for visual alignment
- Clear visual hierarchy (title most prominent)
- Hover effect: subtle shadow + scale
- Applied state: Green checkmark icon + border

**Job Detail Page:**
- Full-screen modal OR dedicated page (decision needed)
- Print-friendly layout
- Social share buttons (WhatsApp, Email, Copy link)
- Sticky apply button (visible when scrolling)

**Accessibility:**
- WCAG 2.1 AA compliance
- Keyboard navigation for all filters and cards
- Screen reader announcements for application success
- Focus management for modals

### Visual Design
- **Component Library:** shadcn/ui (Card, Badge, Button, Modal, Select)
- **Icons:** Lucide React (MapPin, Briefcase, Clock, Check, etc.)
- **Colors:**
  - Primary: Beauty Smile brand blue
  - Success: Green for applied state
  - Warning: Amber for closing soon
  - Muted: Gray for closed jobs

### Loading States
- **Initial page load:** Skeleton cards (4-6 skeletons)
- **Applying to job:** Button spinner + "Candidatando..." text
- **Filter changes:** Fade out cards, show new results

## 7. Technical Considerations

### Frontend Stack
- **Framework:** React 18.3.1 + TypeScript
- **Routing:** React Router
- **State Management:** Zustand for candidate state, TanStack Query for server state
- **UI Components:** shadcn/ui + Tailwind CSS

### Backend Integration

**Database Tables:**
- `vagas` - Job openings (already created)
- `candidaturas` - Applications (many-to-many join table)
- `candidatos` - Candidate profiles

**Key Relationships:**
- `candidaturas.candidato_id` → `candidatos.id`
- `candidaturas.vaga_id` → `vagas.id`
- `candidatos.candidaturas_ids` → JSONB array of candidatura IDs

**RLS Policies:**
- `vagas_select_active` - Anyone can view active jobs (where `ativa = true`)
- `candidaturas_insert_own` - Candidates can create their own applications
- `candidaturas_select_own` - Candidates can view their own applications
- `candidaturas_select_hr` - HR can view all applications

### API Calls

**Fetch Active Jobs:**
```typescript
const { data: vagas, error } = await supabase
  .from('vagas')
  .select('*')
  .eq('ativa', true)
  .eq('deleted_at', null)
  .order('created_at', { ascending: false })
```

**Fetch Job with Application Status:**
```typescript
const { data: vaga, error } = await supabase
  .from('vagas')
  .select(`
    *,
    candidaturas!inner(
      id,
      status_candidatura,
      data_aplicacao
    )
  `)
  .eq('id', vagaId)
  .eq('candidaturas.candidato_id', candidatoId)
  .single()

// If candidaturas array is empty, user hasn't applied
const hasApplied = vaga.candidaturas.length > 0
```

**Create Application:**
```typescript
const { data, error } = await supabase
  .from('candidaturas')
  .insert([{
    candidato_id: candidatoId,
    vaga_id: vagaId,
    status_candidatura: 'aplicado',
    etapa_atual: 'triagem',
    data_aplicacao: new Date()
  }])
  .select()
  .single()
```

**Fetch Candidate's Applications:**
```typescript
const { data: applications, error } = await supabase
  .from('candidaturas')
  .select(`
    *,
    vagas(
      id,
      titulo,
      localizacao,
      departamento,
      ativa
    )
  `)
  .eq('candidato_id', candidatoId)
  .eq('deleted_at', null)
  .order('data_aplicacao', { ascending: false })
```

### N8N Webhook Integration

**Webhook URL:** `https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura`

**Payload:**
```json
{
  "candidatura_id": 123,
  "candidato_id": 456,
  "vaga_id": 789,
  "nome_candidato": "João Silva",
  "email_candidato": "joao@example.com",
  "titulo_vaga": "Assistente de Atendimento",
  "data_aplicacao": "2025-01-15T10:30:00Z"
}
```

**N8N Workflow Actions:**
1. Receive webhook
2. Log application event
3. Send confirmation email to candidate
4. Notify HR team of new application
5. Trigger Big Five test invitation (if configured)
6. Update analytics dashboard

### Performance Optimization
- **Query Optimization:** Index on `vagas.ativa`, `candidaturas.candidato_id`, `candidaturas.vaga_id`
- **Pagination:** Limit 12 jobs per page, use cursor-based pagination for large datasets
- **Caching:** Cache job listings for 5 minutes (invalidate on new job created)
- **Image Optimization:** Lazy load company logos, use WebP format

### Error Scenarios
1. **No jobs available:** Show empty state with "Check back soon" message
2. **Network failure:** Retry with exponential backoff, show error toast
3. **Duplicate application:** Show friendly error, link to dashboard
4. **Job closed mid-application:** Refresh job status, show "Vaga encerrada" error
5. **Webhook failure:** Log error but allow application to succeed (async operation)

## 8. Success Metrics

### Primary Metrics
1. **Application Completion Rate:** ≥ 80% of candidates who click "Candidatar-se" complete the application
2. **Average Applications per Candidate:** ≥ 2 applications per candidate
3. **Time to Apply:** Median ≤ 30 seconds from viewing job to applying
4. **Job View to Apply Conversion:** ≥ 25% of job views result in application

### Secondary Metrics
1. **Filter Usage:** ≥ 40% of users use filters before applying
2. **Mobile Application Rate:** Mobile applications ≥ 30% of total
3. **Duplicate Application Attempts:** ≤ 5% of apply attempts are duplicates (good UX prevents this)
4. **Email Confirmation Delivery:** ≥ 98% of applications trigger confirmation email

### User Experience Metrics
1. **Job Detail Views:** ≥ 60% of users view job details before applying
2. **Application Abandonment:** ≤ 10% of users start application but don't complete
3. **Return Visit Rate:** ≥ 50% of candidates return to check new jobs within 7 days
4. **Application History Views:** ≥ 70% of candidates check their application status

### Business Metrics
1. **Applications per Vacancy:** Average ≥ 10 applications per active job
2. **Time to First Application:** ≤ 24 hours from job posting to first application
3. **Quality of Applicants:** ≥ 60% of applicants meet minimum requirements (HR assessment)

## 9. Open Questions

### Critical (Must Resolve Before Development)
1. **Application Prerequisites:** What profile fields must be complete before applying?
   - Option A: Only basic fields required (nome, email, telefone)
   - Option B: Full profile including address, professional data
   - **Recommendation:** Option B (ensures complete candidate data for HR review)

2. **Job Detail Display:** Modal overlay or dedicated page?
   - Option A: Modal overlay (faster, no page reload)
   - Option B: Dedicated page `/vagas/:id` (shareable URLs, better SEO)
   - **Recommendation:** Option B for better UX and SEO

3. **Application Withdrawal:** Can candidates cancel their application?
   - Option A: Yes, allow self-service withdrawal
   - Option B: No, contact HR required
   - **Recommendation:** Option B for MVP (prevents impulsive withdrawals)

### Medium Priority (Can Resolve During Development)
4. **Vacancy Capacity:** Should jobs have application limits (e.g., max 50 applicants)?
   - **Recommendation:** Not for MVP, add if needed based on HR feedback

5. **Job Expiration:** Should jobs auto-close after X days?
   - **Recommendation:** Manual close only for MVP

6. **Application Confirmation:** Should we show intermediate "Confirmar candidatura" step?
   - **Recommendation:** No, one-click apply is better UX

7. **Job Sharing:** Should candidates be able to share job links?
   - **Recommendation:** Yes, add share button (WhatsApp, email, copy link)

### Low Priority (Nice to Have)
8. **Job Alerts:** Email notifications for new jobs matching candidate profile?
   - **Recommendation:** Post-MVP feature

9. **Save for Later:** Bookmark jobs to apply later?
   - **Recommendation:** Post-MVP feature

10. **Application Notes:** Allow candidates to add notes to their application?
    - **Recommendation:** Not needed for MVP

---

## Acceptance Criteria Summary

**This feature is considered complete when:**

✅ Authenticated candidates can view a list of active job openings
✅ Job cards display title, location, department, and posted date
✅ Candidates can filter jobs by type, location, and department
✅ Clicking a job opens detailed job description page
✅ Job detail page shows full description, requirements, benefits, and recruitment process
✅ "Candidatar-se" button is prominently displayed and functional
✅ Clicking "Candidatar-se" creates a record in `candidaturas` table
✅ Duplicate applications are prevented (both frontend and backend)
✅ Applied jobs show "Já candidatado" badge instead of apply button
✅ Confirmation email is sent after successful application
✅ N8N webhook is triggered for new applications
✅ Candidates can view their application history in dashboard
✅ Application history shows job title, date, status, and current stage
✅ HR can view all applications per vacancy in admin panel
✅ HR can filter applications by status and date
✅ Job listings page is responsive on mobile and desktop
✅ Empty states are shown when no jobs or no applications exist
✅ All error scenarios display user-friendly messages
✅ Page loading and application submission have appropriate loading states
✅ Manual QA testing passes with 0 critical bugs
✅ Automated E2E tests cover job browsing, filtering, and application flow

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 3-4 days
**Dependencies:**
- ✅ Supabase backend with `vagas` and `candidaturas` tables
- ✅ N8N webhook for nova-candidatura
- ⏳ PRD-DEV-001 (Registration) for candidate profiles
- ⏳ PRD-DEV-002 (Login) for authentication
- ⏳ PRD-DEV-006 (Candidate Dashboard) for application history display
**Blocker Status:** 🚨 CRITICAL - Core feature that connects candidates to jobs, enables recruitment workflow
