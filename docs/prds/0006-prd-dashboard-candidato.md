# PRD-DEV-006: Dashboard do Candidato

## 1. Introduction/Overview

The Dashboard do Candidato is the central hub where authenticated candidates view their recruitment progress, access psychometric tests, check application status, update their profile, and track their journey through the 7-stage Beauty Smile recruitment process.

**Problem it solves:** Currently, candidates have no centralized view of their recruitment status. They cannot see where they are in the process, which tests they need to complete, or what the next steps are. This creates confusion and reduces engagement.

**Goal:** Implement a personalized candidate dashboard that provides clear visibility into recruitment progress, actionable next steps, test access, application history, and profile management—all in one intuitive interface.

## 2. Goals

1. Display candidate's current recruitment stage and overall progress (0-100%)
2. Show next steps and actionable tasks (e.g., "Complete Big Five test")
3. Provide quick access to pending psychometric tests
4. Display application history with status for each job
5. Show recruitment timeline with completed and upcoming stages
6. Provide profile editing and document upload capabilities
7. Display notifications and important messages from HR
8. Show personalized greetings and motivational messages
9. Support mobile-responsive layout for access on any device
10. Track and display key statistics (tests completed, days in process, etc.)

## 3. User Stories

### Primary Flow
**As a** candidate logged into my dashboard
**I want to** see my current position in the recruitment process at a glance
**So that** I understand where I am and what I need to do next

**As a** candidate with pending tests
**I want to** see prominent calls-to-action for incomplete tests
**So that** I can easily access and complete them without searching

**As a** candidate who completed all required steps
**I want to** see a clear indication that I'm waiting for HR review
**So that** I know there's nothing more I need to do right now

### Secondary Flow
**As a** candidate tracking multiple applications
**I want to** see all my job applications with current status
**So that** I can monitor progress for each position separately

**As a** candidate who wants to update my information
**I want to** access my profile editing from the dashboard
**So that** I can keep my data current without navigating away

**As a** candidate receiving messages from HR
**I want to** see notifications prominently displayed
**So that** I don't miss important communications

### Progress Tracking
**As a** candidate
**I want to** see a visual representation of the 7-stage recruitment process
**So that** I understand the full journey and my current position

**As a** candidate
**I want to** see estimated completion time for the recruitment process
**So that** I can set expectations for when I'll hear back

**As a** candidate who completed a test
**I want to** see confirmation that it was received
**So that** I have peace of mind that my effort wasn't lost

## 4. Functional Requirements

### FR-001: Dashboard Layout Structure
The dashboard **must** include the following sections:

**Header:**
- Personalized greeting: "Olá, [nome_completo]!" or "Bem-vindo de volta, [nome]!"
- Current date and time
- Notification bell icon with badge (unread count)
- Profile dropdown menu (settings, logout)

**Main Content Area:**
1. **Hero Section** - Recruitment progress overview
2. **Ações Necessárias** - Cards for pending tasks (tests, profile completion, etc.)
3. **Minhas Candidaturas** - Application history table
4. **Linha do Tempo** - Visual 7-stage timeline
5. **Estatísticas** - Key metrics and achievements
6. **Mensagens e Notificações** - Recent communications

**Sidebar (Desktop) / Bottom Nav (Mobile):**
- Dashboard (home icon)
- Minhas Candidaturas (briefcase icon)
- Meu Perfil (user icon)
- Vagas Disponíveis (search icon)
- Mensagens (envelope icon)
- Ajuda (question icon)

### FR-002: Hero Section - Progress Overview
The hero section **must** display:

**Visual Elements:**
- Large progress circle showing percentage (0-100%)
- Current stage badge (e.g., "Etapa: Big Five")
- Days in process counter (e.g., "7 dias no processo")

**Text Content:**
- Status headline based on current stage:
  - Triagem: "Bem-vindo! Vamos começar sua jornada."
  - Big Five: "Próximo passo: Teste de Personalidade"
  - DISC: "Quase lá! Complete o teste DISC"
  - Entrevista Online: "Parabéns! Agora é hora da entrevista"
  - Raven: "Continue assim! Teste de Raciocínio Lógico"
  - Cultura: "Ótimo progresso! Avaliação de Cultura"
  - Entrevista Presencial: "Última etapa! Entrevista presencial"
  - Aprovado: "🎉 Parabéns! Você foi aprovado!"
  - Reprovado: "Obrigado por participar. Veja oportunidades futuras."

**Progress Calculation:**
```typescript
const stageWeights = {
  triagem: 0,
  big_five: 14,  // 100% / 7 stages ≈ 14% per stage
  disc: 28,
  entrevista_online: 42,
  raven: 57,
  cultura: 71,
  entrevista_presencial: 85,
  aprovado: 100,
  reprovado: 0  // Special case
}

const progress = stageWeights[candidato.etapa_atual] || 0
```

**CTA Button:**
- Dynamically changes based on stage:
  - Triagem: "Ver vagas disponíveis"
  - Big Five/DISC/Raven: "Iniciar teste"
  - Entrevista: "Ver detalhes da entrevista"
  - Aprovado: "Ver próximos passos"

### FR-003: Ações Necessárias (Action Items)
This section **must** display actionable task cards:

**Card Types:**

1. **Pending Test Card:**
   - Icon: Clipboard/test icon
   - Title: "Teste de Personalidade (Big Five) pendente"
   - Description: "Complete em 20-30 minutos. Sem resposta certa ou errada."
   - CTA: "Iniciar teste" button (primary)
   - Due date (if applicable): "Prazo: 2 dias restantes"

2. **Profile Incomplete Card:**
   - Icon: Warning triangle
   - Title: "Complete seu perfil"
   - Description: "Faltam informações importantes: Endereço, Dados profissionais"
   - CTA: "Completar perfil" button (warning)

3. **Document Upload Card:**
   - Icon: Upload icon
   - Title: "Envie seus documentos"
   - Description: "RG, CPF, comprovante de residência"
   - CTA: "Fazer upload" button

4. **Interview Scheduled Card:**
   - Icon: Calendar icon
   - Title: "Entrevista Online agendada"
   - Description: "Data: 20/01/2025 às 14:00"
   - CTA: "Entrar na sala" button (if within 15 min) or "Ver detalhes"

**Dynamic Display Logic:**
```typescript
const actionItems = []

// Check for pending tests based on etapa_atual
if (candidato.etapa_atual === 'big_five' && !candidato.big_five_completo) {
  actionItems.push({ type: 'test', test: 'big_five' })
}
if (candidato.etapa_atual === 'disc' && !candidato.disc_completo) {
  actionItems.push({ type: 'test', test: 'disc' })
}
if (candidato.etapa_atual === 'raven' && !candidato.raven_completo) {
  actionItems.push({ type: 'test', test: 'raven' })
}

// Check profile completeness
if (!candidato.perfil_completo) {
  actionItems.push({ type: 'profile_incomplete' })
}

// Check for upcoming interviews
const upcomingInterviews = await fetchInterviews(candidato.id)
if (upcomingInterviews.length > 0) {
  actionItems.push({ type: 'interview', data: upcomingInterviews[0] })
}

// If no actions, show motivational message
if (actionItems.length === 0) {
  return <Message>Tudo certo! Aguarde nosso contato para os próximos passos.</Message>
}
```

### FR-004: Minhas Candidaturas (Application History)
This section **must** display all job applications:

**Table Columns:**
- Vaga (job title, clickable link to job detail)
- Data de aplicação (date applied)
- Status (badge: Aplicado, Em análise, Em teste, Aprovado, Rejeitado)
- Etapa atual (current stage in 7-stage process)
- Progresso (progress bar 0-100%)
- Ações (view details button)

**Row States:**
- **Active:** White background
- **Approved:** Green tint
- **Rejected:** Gray tint, crossed out
- **In Progress:** Blue tint (if tests pending)

**Sorting:**
- Default: Most recent first
- Clickable column headers to sort by date, status, progress

**Empty State:**
"Você ainda não se candidatou a nenhuma vaga."
CTA: "Explorar vagas disponíveis" button

**Query:**
```typescript
const { data: candidaturas } = await supabase
  .from('candidaturas')
  .select(`
    *,
    vagas(id, titulo, localizacao, departamento, ativa)
  `)
  .eq('candidato_id', candidato.id)
  .eq('deleted_at', null)
  .order('data_aplicacao', { ascending: false })
```

### FR-005: Linha do Tempo (7-Stage Timeline)
This section **must** visually represent the recruitment process:

**Visual Design:**
- Horizontal timeline on desktop, vertical on mobile
- 7 stages represented as circles/nodes connected by lines
- Each stage shows:
  - Stage icon (clipboard, video, brain, etc.)
  - Stage name
  - Completion status (✅ completed, 🔵 current, ⚪ upcoming)
  - Completion date (if completed)

**Stages:**
1. ✅ **Triagem** - Completed: 10/01/2025
2. ✅ **Big Five** - Completed: 12/01/2025
3. 🔵 **DISC** - Em andamento
4. ⚪ **Entrevista Online** - Aguardando
5. ⚪ **Raven** - Aguardando
6. ⚪ **Cultura** - Aguardando
7. ⚪ **Entrevista Presencial** - Aguardando

**Interactive:**
- Hover over completed stages to see details
- Click on stage to expand more information (if available)
- Estimated time for each stage (e.g., "DISC: ~15 minutos")

**Implementation:**
```typescript
const stages = [
  { key: 'triagem', label: 'Triagem', icon: CheckIcon },
  { key: 'big_five', label: 'Big Five', icon: BrainIcon },
  { key: 'disc', label: 'DISC', icon: TargetIcon },
  { key: 'entrevista_online', label: 'Entrevista Online', icon: VideoIcon },
  { key: 'raven', label: 'Raven', icon: PuzzleIcon },
  { key: 'cultura', label: 'Cultura', icon: HeartIcon },
  { key: 'entrevista_presencial', label: 'Presencial', icon: UsersIcon }
]

const currentStageIndex = stages.findIndex(s => s.key === candidato.etapa_atual)

stages.forEach((stage, index) => {
  if (index < currentStageIndex) stage.status = 'completed'
  else if (index === currentStageIndex) stage.status = 'current'
  else stage.status = 'upcoming'
})
```

### FR-006: Estatísticas (Key Metrics)
This section **must** display candidate statistics:

**Metric Cards:**

1. **Tempo no Processo**
   - Icon: Clock
   - Value: "7 dias"
   - Calculation: `Date.now() - candidato.data_cadastro`

2. **Testes Concluídos**
   - Icon: Checkmark
   - Value: "2 de 3"
   - Calculation: Count of completed tests

3. **Taxa de Conclusão**
   - Icon: Target
   - Value: "67%"
   - Calculation: `(completed_stages / total_stages) * 100`

4. **Próxima Etapa**
   - Icon: Arrow right
   - Value: "DISC"
   - Calculation: Next stage after current

**Layout:**
- 4-column grid on desktop
- 2-column grid on tablet
- 1-column stack on mobile
- Each card has colored background (gradient)

### FR-007: Mensagens e Notificações
This section **must** display communications:

**Notification Types:**

1. **System Notifications:**
   - Test invitation received
   - Interview scheduled
   - Application status changed
   - Profile update required

2. **HR Messages:**
   - Personalized messages from recruiter
   - Feedback on tests
   - Next steps instructions

**Display Format:**
- List of notification cards
- Each card shows:
  - Icon (based on type)
  - Message title
  - Message preview (first 100 chars)
  - Timestamp (e.g., "há 2 horas")
  - Unread badge (if not read)

**Actions:**
- Click to expand full message
- Mark as read
- Delete notification

**Empty State:**
"Nenhuma mensagem no momento."

**Query:**
```typescript
const { data: notifications } = await supabase
  .from('notificacoes')
  .select('*')
  .eq('candidato_id', candidato.id)
  .eq('lida', false)
  .order('created_at', { ascending: false })
  .limit(5)
```

### FR-008: Sidebar Navigation
The sidebar **must** provide quick navigation:

**Menu Items:**
- 🏠 Dashboard (active by default)
- 💼 Minhas Candidaturas (link to `/dashboard-candidato/candidaturas`)
- 👤 Meu Perfil (link to `/dashboard-candidato/perfil`)
- 🔍 Vagas Disponíveis (link to `/vagas`)
- ✉️ Mensagens (link to `/dashboard-candidato/mensagens`)
- ❓ Ajuda (link to `/ajuda` or help modal)
- 🚪 Sair (logout action)

**Visual Design:**
- Active item highlighted with background color
- Icons + labels on desktop
- Icons only on collapsed sidebar
- Hover effects for better UX

**Mobile:**
- Bottom navigation bar with 5 most important items
- Hamburger menu for additional items

### FR-009: Profile Quick View
The dashboard **must** show profile summary:

**Profile Card (Sidebar or Top-Right):**
- Profile photo (or initials if no photo)
- Nome completo
- Email
- Current stage badge
- "Editar perfil" link

**Profile Completeness Indicator:**
- Progress bar showing profile completion (0-100%)
- List of missing fields (if incomplete)
- Example: "85% completo - Falta: Dados profissionais"

### FR-010: Responsive Design
The dashboard **must** adapt to different screen sizes:

**Desktop (≥1024px):**
- Full sidebar navigation
- 3-column grid for action cards
- Horizontal timeline
- All sections visible without scrolling

**Tablet (768-1023px):**
- Collapsible sidebar (icons only)
- 2-column grid for action cards
- Horizontal timeline (scrollable)
- Some sections require scrolling

**Mobile (≤767px):**
- Bottom navigation bar
- 1-column stack
- Vertical timeline
- Hamburger menu for profile/settings
- Sticky header with greeting

### FR-011: Data Refresh
The dashboard **must** keep data current:

**Real-time Updates:**
- Use Supabase real-time subscriptions for:
  - Notification arrivals
  - Application status changes
  - Interview schedule updates

**Refresh Strategy:**
- Fetch latest data on page load
- Subscribe to relevant tables for real-time updates
- Manual refresh button (pull-to-refresh on mobile)
- Auto-refresh every 5 minutes if tab is active

**Implementation:**
```typescript
useEffect(() => {
  // Subscribe to candidato changes
  const subscription = supabase
    .channel('candidato_changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'candidatos',
      filter: `id=eq.${candidato.id}`
    }, (payload) => {
      setCandidato(payload.new)
    })
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [candidato.id])
```

## 5. Non-Goals (Out of Scope)

The following are **NOT** part of this PRD:

1. **Direct messaging with HR** - Email communication only for MVP
2. **Document preview** - Upload only, no in-dashboard PDF/image viewer
3. **Calendar integration** - No sync with Google Calendar/Outlook
4. **Video interview from dashboard** - Links to external video platform
5. **Test results visualization** - Basic pass/fail only, detailed results in separate PRD
6. **Gamification elements** - No badges, points, or achievements
7. **Social features** - No candidate-to-candidate networking
8. **Mobile app** - Responsive web only, no native app
9. **Customizable dashboard** - Fixed layout, no drag-and-drop widgets
10. **Export/download data** - No candidate data export feature

## 6. Design Considerations

### UI/UX Requirements

**Visual Hierarchy:**
- Most important info at top (hero section with progress)
- Action items prominently displayed (larger cards)
- Supporting info below (timeline, stats, applications)

**Color Coding:**
- Success green: Completed stages, approved applications
- Warning amber: Pending actions, incomplete profile
- Info blue: Current stage, in-progress
- Muted gray: Upcoming stages, inactive items

**Accessibility:**
- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Screen reader announcements for progress updates
- High contrast mode support

### Component Library
- **shadcn/ui:** Card, Progress, Badge, Table, Button, Tabs
- **Recharts:** For progress circle and statistics visualizations
- **Lucide React:** Icons throughout dashboard

### Loading States
- **Initial load:** Full-page skeleton with placeholders for all sections
- **Section updates:** Individual section skeletons
- **Action buttons:** Spinner during submission

### Empty States
- **No applications:** Friendly illustration + CTA to browse jobs
- **No notifications:** "All caught up!" message
- **No pending actions:** Motivational message

## 7. Technical Considerations

### Frontend Stack
- **Framework:** React 18.3.1 + TypeScript
- **State Management:** Zustand for candidate state, TanStack Query for server state caching
- **Routing:** React Router
- **Real-time:** Supabase real-time subscriptions
- **Charts:** Recharts for progress visualizations

### Backend Integration

**Database Tables:**
- `candidatos` - Profile and progress data
- `candidaturas` - Job applications
- `notificacoes` - Notifications and messages
- `entrevistas` - Interview schedules
- `testes_realizados` - Test completion tracking

**Key Queries:**

**Fetch Candidate Dashboard Data:**
```typescript
const { data: candidate } = await supabase
  .from('candidatos')
  .select(`
    *,
    candidaturas(*, vagas(*)),
    notificacoes(*, lida),
    entrevistas(*),
    resultados_big_five(*),
    resultados_disc(*),
    resultados_raven(*)
  `)
  .eq('user_id', user.id)
  .single()
```

**Calculate Progress:**
```typescript
function calculateProgress(candidato: Candidato): number {
  const stageProgress = {
    triagem: 0,
    big_five: 14,
    disc: 28,
    entrevista_online: 42,
    raven: 57,
    cultura: 71,
    entrevista_presencial: 85,
    aprovado: 100
  }
  return stageProgress[candidato.etapa_atual] || 0
}
```

### Performance Optimization
- **Code splitting:** Lazy load dashboard sections
- **Caching:** TanStack Query caching with 5-minute stale time
- **Memoization:** Memoize expensive calculations (progress, stats)
- **Virtual scrolling:** For long application lists (>20 items)
- **Image optimization:** Lazy load profile photos, use WebP

### Real-time Updates
```typescript
// Subscribe to candidato updates
supabase
  .channel('candidato_updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'candidatos',
    filter: `user_id=eq.${user.id}`
  }, handleCandidateUpdate)
  .subscribe()

// Subscribe to new notifications
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notificacoes',
    filter: `candidato_id=eq.${candidato.id}`
  }, handleNewNotification)
  .subscribe()
```

### Error Handling
- Network errors: Retry with exponential backoff, show offline indicator
- Data loading errors: Show error state with retry button
- Real-time connection loss: Fallback to polling every 30 seconds

## 8. Success Metrics

### Primary Metrics
1. **Dashboard Engagement:** ≥ 70% of candidates visit dashboard within 24 hours of registration
2. **Daily Active Users:** ≥ 50% of active candidates check dashboard daily
3. **Action Completion Rate:** ≥ 80% of displayed action items completed within 48 hours
4. **Time to Next Action:** Median ≤ 2 hours from dashboard visit to completing pending action

### Secondary Metrics
1. **Profile Completeness:** ≥ 90% of candidates complete profile within 7 days
2. **Test Initiation Rate:** ≥ 75% of candidates start tests within 24 hours of notification
3. **Mobile Usage:** ≥ 40% of dashboard visits from mobile devices
4. **Return Visit Rate:** ≥ 60% of candidates return to dashboard within 3 days

### User Experience Metrics
1. **Page Load Time:** ≤ 2 seconds for initial dashboard load (90th percentile)
2. **Task Success Rate:** ≥ 95% of users successfully navigate to target action (e.g., start test)
3. **Confusion Indicators:** ≤ 5% of users contact support asking "what to do next"
4. **Session Duration:** Median ≥ 3 minutes (engaged exploration)

### Business Metrics
1. **Conversion Rate:** Dashboard users ≥ 15% more likely to complete recruitment than non-users
2. **Drop-off Reduction:** ≤ 10% candidate drop-off between stages (down from current baseline)
3. **Time to Hire:** Dashboard reduces average time-to-hire by ≥ 20%

## 9. Open Questions

### Critical (Must Resolve Before Development)
1. **Default Landing Page:** After login, should candidates land on dashboard or vagas page?
   - Option A: Dashboard (shows progress, next steps)
   - Option B: Vagas (browse jobs immediately)
   - **Recommendation:** Option A (dashboard first, vagas easily accessible)

2. **Test Access:** Should tests be accessible only from dashboard or also direct URLs?
   - Option A: Dashboard only (controlled access)
   - Option B: Direct URLs allowed (easier sharing)
   - **Recommendation:** Option B (flexibility, but dashboard is primary entry)

3. **Progress Calculation:** Should progress account for test scores or only completion?
   - Option A: Only completion (simpler)
   - Option B: Weighted by scores (more accurate)
   - **Recommendation:** Option A for MVP (completion only)

### Medium Priority (Can Resolve During Development)
4. **Notification Storage:** Store in database or use Supabase Auth notifications?
   - **Recommendation:** Database table `notificacoes` for full control

5. **Timeline Interactivity:** Should clicking on timeline stages show detailed info?
   - **Recommendation:** Yes, expand accordion with stage details

6. **Dashboard Customization:** Allow candidates to hide/reorder sections?
   - **Recommendation:** Not for MVP, fixed layout only

7. **Application Filtering:** Should application history have filters (by status, date)?
   - **Recommendation:** Yes if >10 applications, otherwise simple list is fine

### Low Priority (Nice to Have)
8. **Dark Mode:** Should we support dark theme?
   - **Recommendation:** Post-MVP feature

9. **Dashboard Tutorials:** First-time user tour/walkthrough?
   - **Recommendation:** Yes, simple tooltip tour on first visit

10. **Achievements:** Show badges for milestones (e.g., "Completed all tests")?
    - **Recommendation:** Post-MVP gamification feature

---

## Acceptance Criteria Summary

**This feature is considered complete when:**

✅ Authenticated candidates can access their personalized dashboard
✅ Hero section displays current recruitment stage and progress percentage
✅ Action items section shows pending tasks (tests, profile completion, etc.)
✅ Application history table displays all job applications with status
✅ 7-stage timeline visually represents recruitment progress
✅ Statistics section shows key metrics (days in process, tests completed, etc.)
✅ Notifications section displays messages from HR and system alerts
✅ Sidebar navigation provides access to all major sections
✅ Profile quick view shows completeness and edit link
✅ Real-time updates work for notifications and application status changes
✅ Dashboard is fully responsive (mobile, tablet, desktop)
✅ Empty states are shown for sections with no data
✅ All loading states provide visual feedback
✅ All error scenarios display user-friendly messages
✅ Page loads in ≤2 seconds on 4G connection
✅ All interactive elements are keyboard accessible
✅ Screen reader announcements work for dynamic updates
✅ Manual QA testing passes with 0 critical bugs
✅ Automated E2E tests cover dashboard load, navigation, and action item clicks

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 4-5 days
**Dependencies:**
- ✅ Supabase backend with all candidate tables
- ⏳ PRD-DEV-001 (Registration) for candidate data
- ⏳ PRD-DEV-002 (Login) for authentication
- ⏳ PRD-DEV-005 (Job Application) for candidaturas data
- ⏳ Psychometric test PRDs (for test access links)
**Blocker Status:** 🚨 CRITICAL - Central hub for candidate experience, required for test access and progress tracking
