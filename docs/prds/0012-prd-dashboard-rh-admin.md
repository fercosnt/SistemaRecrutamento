# PRD-DEV-012: Dashboard RH/Admin

## 1. Introduction/Overview

The Dashboard RH/Admin is the central command center for HR professionals and administrators to monitor recruitment metrics, manage candidates across all stages, track job openings, view analytics, and access quick actions for daily recruitment operations.

**Problem it solves:** HR teams lack a unified view of the recruitment pipeline. They need to switch between multiple tools to see active jobs, pending applications, test completions, and interview schedules. This fragmentation slows down hiring and increases errors.

**Goal:** Implement a comprehensive admin dashboard that provides real-time visibility into all recruitment activities, key performance metrics, candidate pipeline status, urgent actions requiring attention, and quick access to all administrative features—all optimized for desktop and tablet workflows.

## 2. Goals

1. Display real-time recruitment metrics (active jobs, total candidates, applications today, conversion rates)
2. Show urgent action items requiring HR attention (pending reviews, incomplete profiles, overdue interviews)
3. Provide visual pipeline overview with drag-and-drop candidate management
4. Display recent activity feed (new applications, test completions, status changes)
5. Show role-based widgets (admins see all data, RH básico sees limited view)
6. Enable quick actions without leaving dashboard (approve/reject, send email, schedule interview)
7. Support customizable date range filters for all metrics
8. Display top performer candidates and flagged issues
9. Provide direct navigation to all major admin sections
10. Track and display team performance metrics (recruiter productivity, time-to-hire by role)

## 3. User Stories

### Primary Flow - Daily Operations
**As an** HR professional starting my workday
**I want to** see a dashboard with pending tasks and key metrics
**So that** I can prioritize my work and know what needs immediate attention

**As an** HR manager
**I want to** see the recruitment pipeline at a glance
**So that** I can identify bottlenecks and move candidates efficiently

**As a** recruiter
**I want** to see new applications and test completions in real-time
**So that** I can respond quickly to high-potential candidates

### Secondary Flow - Analytics & Monitoring
**As an** HR director
**I want to** view aggregate recruitment metrics over time
**So that** I can assess our hiring effectiveness and report to leadership

**As an** admin
**I want to** see system health indicators (N8N status, email delivery, database usage)
**So that** I can proactively address technical issues

**As a** recruiter assigned to specific jobs
**I want to** see only my assigned vacancies and candidates
**So that** I can focus on my responsibilities without clutter

### Quick Actions
**As an** HR professional
**I want** to approve or reject candidates directly from the dashboard
**So that** I don't have to navigate to individual candidate pages for simple decisions

**As a** recruiter
**I want** to send bulk emails to candidates in specific stages
**So that** I can communicate efficiently with multiple people at once

## 4. Functional Requirements

### FR-001: Dashboard Layout Structure
**URL:** `/admin/dashboard`

**Layout Sections:**

**Header:**
- Logo + "Painel Administrativo Beauty Smile"
- Global search (candidates, jobs, emails)
- Notifications bell (unread count)
- User profile dropdown (settings, logout)

**Main Content Grid (3 columns on desktop, 1 column mobile):**

**Row 1: Key Metrics (4 cards)**
1. Candidatos Ativos
2. Vagas Abertas
3. Aplicações Hoje
4. Taxa de Conversão

**Row 2: Urgent Actions + Pipeline**
- Left (2/3 width): Pipeline Kanban Board
- Right (1/3 width): Ações Urgentes

**Row 3: Recent Activity + Top Candidates**
- Left (2/3 width): Feed de Atividades
- Right (1/3 width): Candidatos Destaque

**Row 4: Analytics Charts**
- Applications Over Time (Line chart)
- Candidates by Stage (Donut chart)
- Time-to-Hire by Role (Bar chart)

**Sidebar Navigation:**
- 🏠 Dashboard (active)
- 👥 Candidatos
- 💼 Vagas
- 📊 Relatórios
- ⚙️ Configurações
- 📧 Comunicações
- 🔐 Usuários RH (admin only)

### FR-002: Key Metrics Cards
**Card 1: Candidatos Ativos**
```
┌──────────────────────────────┐
│ 👥 Candidatos Ativos          │
│                              │
│       247                    │
│   +12 esta semana            │
│                              │
│ Em processo: 189             │
│ Aguardando: 58               │
└──────────────────────────────┘
```

**Query:**
```typescript
const { count: total } = await supabase
  .from('candidatos')
  .select('*', { count: 'exact', head: true })
  .neq('etapa_atual', 'reprovado')
  .is('deleted_at', null)

const { count: thisWeek } = await supabase
  .from('candidatos')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', startOfWeek)
```

**Card 2: Vagas Abertas**
```
┌──────────────────────────────┐
│ 💼 Vagas Abertas              │
│                              │
│        15                    │
│   3 publicadas hoje          │
│                              │
│ Com candidatos: 12           │
│ Sem candidatos: 3            │
└──────────────────────────────┘
```

**Card 3: Aplicações Hoje**
```
┌──────────────────────────────┐
│ 📨 Aplicações Hoje            │
│                              │
│        34                    │
│   vs. 28 ontem (+21%)        │
│                              │
│ Revisadas: 18 (53%)          │
│ Pendentes: 16                │
└──────────────────────────────┘
```

**Card 4: Taxa de Conversão**
```
┌──────────────────────────────┐
│ 📈 Taxa de Conversão          │
│                              │
│       68%                    │
│   Triagem → Big Five         │
│                              │
│ Meta: 75%                    │
│ ↓ 7 pontos percentuais       │
└──────────────────────────────┘
```

**Calculation:**
```typescript
const { count: triagem } = await supabase
  .from('candidatos')
  .select('*', { count: 'exact', head: true })
  .eq('etapa_atual', 'triagem')

const { count: bigFive } = await supabase
  .from('candidatos')
  .select('*', { count: 'exact', head: true })
  .in('etapa_atual', ['big_five', 'disc', 'entrevista_online', 'raven', 'cultura', 'entrevista_presencial', 'aprovado'])

const conversionRate = (bigFive / triagem) * 100
```

### FR-003: Pipeline Kanban Board
Visual representation of 7-stage recruitment pipeline:

```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Triagem │Big Five │  DISC   │Entrev.  │ Raven   │ Cultura │Presenc. │
│   58    │   42    │   31    │   24    │   18    │   12    │    8    │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│[Card 1] │[Card 1] │[Card 1] │[Card 1] │[Card 1] │[Card 1] │[Card 1] │
│[Card 2] │[Card 2] │[Card 2] │[Card 2] │[Card 2] │[Card 2] │[Card 2] │
│[Card 3] │[Card 3] │         │         │         │         │         │
│  ...    │  ...    │         │         │         │         │         │
│Ver mais │Ver mais │Ver mais │Ver mais │Ver mais │Ver mais │Ver mais │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

**Candidate Card:**
```
┌─────────────────────────────┐
│ 📸 João Silva               │
│    Assistente de Vendas     │
│                             │
│    Match: 87% ⭐            │
│    Big Five: ✅ DISC: ✅    │
│                             │
│ [👁️ Ver] [✅ Aprovar] [❌]  │
└─────────────────────────────┘
```

**Drag-and-Drop:**
- Drag candidate card to move between stages
- On drop: Show confirmation modal
- Update `candidatos.etapa_atual`
- Log stage change
- Send notification to candidate

**Implementation:**
```typescript
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

function onDragEnd(result) {
  if (!result.destination) return

  const candidatoId = result.draggableId
  const newStage = result.destination.droppableId

  // Update database
  await supabase
    .from('candidatos')
    .update({ etapa_atual: newStage })
    .eq('id', candidatoId)

  // Log activity
  await logActivity({
    type: 'stage_change',
    candidato_id: candidatoId,
    old_stage: result.source.droppableId,
    new_stage: newStage,
    usuario_rh_id: currentUser.id
  })
}
```

### FR-004: Ações Urgentes (Action Items)
Display tasks requiring immediate attention:

```
┌─────────────────────────────────────┐
│ ⚠️ Ações Urgentes (8)                │
├─────────────────────────────────────┤
│ 🔴 3 candidatos há +5 dias em Big   │
│    Five (sem completar)             │
│    [Ver candidatos]                 │
├─────────────────────────────────────┤
│ 🟡 5 entrevistas agendadas hoje     │
│    [Ver agenda]                     │
├─────────────────────────────────────┤
│ 🟢 12 candidatos aguardando review  │
│    (testes completos)               │
│    [Revisar agora]                  │
├─────────────────────────────────────┤
│ 🔵 2 vagas sem candidatos há 7 dias │
│    [Promover vagas]                 │
└─────────────────────────────────────┘
```

**Priority Levels:**
- 🔴 Critical: Overdue tasks, stuck candidates
- 🟡 High: Today's interviews, pending approvals
- 🟢 Medium: Ready for review
- 🔵 Low: Informational notices

**Query Logic:**
```typescript
// Stuck candidates (>5 days in same stage)
const { data: stuckCandidates } = await supabase
  .from('candidatos')
  .select('*')
  .lt('updated_at', fiveDaysAgo)
  .in('etapa_atual', ['big_five', 'disc', 'raven'])

// Pending reviews (all tests complete)
const { data: pendingReview } = await supabase
  .from('candidatos')
  .select('*, resultados_big_five(*), resultados_disc(*), resultados_raven(*)')
  .eq('etapa_atual', 'raven')
  .not('resultados_raven', 'is', null)
  .is('reviewed_by_hr', null)
```

### FR-005: Feed de Atividades
Real-time activity log:

```
┌─────────────────────────────────────────────┐
│ 📋 Atividades Recentes                      │
├─────────────────────────────────────────────┤
│ há 2 min                                    │
│ 👤 Maria Santos completou teste DISC       │
│    Match: 72% | [Ver perfil]               │
├─────────────────────────────────────────────┤
│ há 15 min                                   │
│ 💼 Nova aplicação para "Recepcionista"     │
│    Pedro Costa | [Revisar]                 │
├─────────────────────────────────────────────┤
│ há 1 hora                                   │
│ ✅ Ana Lima aprovada por @carla_rh         │
│    Movida para Entrevista Presencial       │
├─────────────────────────────────────────────┤
│ há 2 horas                                  │
│ 📧 Email enviado para 15 candidatos        │
│    Assunto: "Convite para Entrevista..."   │
└─────────────────────────────────────────────┘
```

**Activity Types:**
- New application
- Test completion
- Stage change
- Approval/Rejection
- Interview scheduled
- Email sent
- Comment added

**Real-time Updates:**
```typescript
// Subscribe to activities table
const subscription = supabase
  .channel('dashboard_activities')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'atividades_rh'
  }, (payload) => {
    setActivities(prev => [payload.new, ...prev])
  })
  .subscribe()
```

### FR-006: Candidatos Destaque
Highlight top performers and flagged candidates:

```
┌─────────────────────────────────────┐
│ ⭐ Candidatos Destaque               │
├─────────────────────────────────────┤
│ 🏆 João Silva                       │
│    Match: 92% | Todos os testes ✅  │
│    [Agendar entrevista]             │
├─────────────────────────────────────┤
│ 🌟 Ana Costa                        │
│    Match: 89% | Raven: 95º percentil│
│    [Ver perfil completo]            │
├─────────────────────────────────────┤
│ ⚠️ Pedro Oliveira                   │
│    Red flag: Baixa Conscienciosidade│
│    [Revisar análise]                │
└─────────────────────────────────────┘
```

**Criteria:**
- 🏆 High Match (≥90%)
- 🌟 Outstanding Test Score (≥90th percentile Raven)
- ⚠️ Red Flags (AI detected concerns)

### FR-007: Analytics Charts
**Chart 1: Applications Over Time (Line)**
```typescript
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={applicationsData}>
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="applications" stroke="#8884d8" />
    <Line type="monotone" dataKey="approvals" stroke="#82ca9d" />
  </LineChart>
</ResponsiveContainer>
```

**Data Query:**
```typescript
const { data } = await supabase
  .from('candidaturas')
  .select('created_at')
  .gte('created_at', thirtyDaysAgo)
  .order('created_at')

// Group by day
const grouped = groupByDay(data, 'created_at')
```

**Chart 2: Candidates by Stage (Donut)**
```typescript
<PieChart>
  <Pie
    data={stageData}
    dataKey="value"
    nameKey="stage"
    cx="50%"
    cy="50%"
    innerRadius={60}
    outerRadius={80}
    label
  />
  <Tooltip />
</PieChart>
```

**Chart 3: Time-to-Hire by Role (Bar)**
Shows average days from application to approval per job type.

### FR-008: Role-Based Dashboard Views
**Admin View:**
- All widgets visible
- System health indicators
- User management shortcuts
- Global statistics

**RH Avançado View:**
- All candidate widgets
- Analytics charts
- No system admin features

**RH Básico View:**
- Limited to assigned candidates
- Recent activity (own actions only)
- No analytics charts
- No bulk actions

**Implementation:**
```typescript
const { role } = useAdminAuthStore()

const widgets = {
  admin: ['metrics', 'pipeline', 'actions', 'activity', 'featured', 'analytics', 'system'],
  rh_avancado: ['metrics', 'pipeline', 'actions', 'activity', 'featured', 'analytics'],
  rh_basico: ['metrics', 'pipeline', 'actions', 'activity']
}

const visibleWidgets = widgets[role]
```

### FR-009: Quick Actions
**Global Actions (Top Bar):**
- "Nova Vaga" button
- "Importar Candidatos" button (CSV)
- "Enviar Email em Massa" button
- "Exportar Relatório" button

**Candidate Card Actions:**
- ✅ Aprovar (moves to next stage)
- ❌ Rejeitar (opens rejection modal)
- 📧 Enviar Email (opens compose modal)
- 📅 Agendar Entrevista (opens calendar)

**Bulk Selection:**
- Checkbox on each candidate card
- Select all in stage
- Bulk actions toolbar appears when ≥1 selected

### FR-010: Responsive Design
**Desktop (≥1200px):**
- 3-column grid
- Sidebar expanded with labels
- All charts visible
- Kanban board shows all 7 stages

**Tablet (768-1199px):**
- 2-column grid
- Sidebar collapsed (icons only)
- Charts stacked vertically
- Kanban board horizontal scroll

**Mobile (≤767px):**
- Not optimized (desktop/tablet only for admin)
- Show message: "Use desktop para melhor experiência"

## 5. Non-Goals (Out of Scope)

1. **Customizable widget layout** - Fixed layout for consistency
2. **Dark mode** - Light theme only for MVP
3. **Real-time chat** - Email communication only
4. **Video conferencing** - Link to external tools
5. **Calendar integration** - Manual scheduling
6. **Mobile app** - Desktop/tablet web only
7. **Multi-language** - Portuguese only
8. **Dashboard templates** - Single default layout
9. **Widget export** - Export full reports only
10. **Third-party integrations** - Standalone system

## 6. Design Considerations

**Visual Hierarchy:**
- Most critical info at top (metrics + urgent actions)
- Pipeline board prominent (center focus)
- Supporting details below (activity, analytics)

**Color System:**
- Primary: Blue (#3B82F6) for actions
- Success: Green (#10B981) for approvals
- Warning: Amber (#F59E0B) for pending
- Danger: Red (#EF4444) for rejections
- Neutral: Gray for inactive/archived

**Component Library:**
- shadcn/ui: Card, Badge, Button, Dropdown
- Recharts: All data visualizations
- react-beautiful-dnd: Drag-and-drop kanban

**Loading States:**
- Skeleton cards for metrics
- Shimmer effect on charts
- Spinner on pipeline loading

## 7. Technical Considerations

### Performance
- Cache metrics for 1 minute (reduce DB load)
- Lazy load charts (below fold)
- Virtualize long activity feeds
- Debounce real-time updates (max 1/second)

### Data Queries
**Dashboard Summary:**
```typescript
// Parallel queries for speed
const [metrics, pipeline, activities, featured] = await Promise.all([
  fetchMetrics(),
  fetchPipelineCounts(),
  fetchRecentActivities(),
  fetchFeaturedCandidates()
])
```

### Real-time
```typescript
// Subscribe to multiple changes
supabase
  .channel('dashboard')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'candidatos' }, handleCandidateChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'candidaturas' }, handleApplicationChange)
  .subscribe()
```

## 8. Success Metrics

**Primary:**
1. Dashboard load time: ≤2 seconds
2. Daily active HR users: ≥80% of team
3. Time spent on dashboard: ≥30% of session time

**Secondary:**
1. Quick actions usage: ≥50% of approvals via dashboard
2. Pipeline drag-drop usage: ≥30% of stage changes
3. Real-time accuracy: Updates appear within 5 seconds

**Business:**
1. Time to first action: ↓40% (faster triage)
2. Missed follow-ups: ↓60% (urgent actions widget)
3. HR satisfaction: ≥4.5/5

## 9. Open Questions

1. **Refresh Frequency:** Auto-refresh every N seconds or manual?
   - **Recommendation:** Real-time for activity feed, manual refresh for metrics

2. **Default Date Range:** Last 7 days, 30 days, or all time?
   - **Recommendation:** Last 30 days, with dropdown to change

3. **Kanban Card Limit:** Show top 5, 10, or 20 per column?
   - **Recommendation:** Top 10, with "Ver mais" link

---

## Acceptance Criteria Summary

✅ Dashboard loads in ≤2 seconds with all widgets
✅ 4 metric cards display real-time counts
✅ Pipeline kanban shows 7 stages with candidate cards
✅ Drag-and-drop updates candidate stage
✅ Urgent actions widget shows prioritized tasks
✅ Activity feed updates in real-time
✅ Featured candidates highlight high-match and red flags
✅ 3 analytics charts display historical data
✅ Role-based views hide/show widgets appropriately
✅ Quick actions (approve, reject, email) work from dashboard
✅ Responsive design works on desktop and tablet
✅ All data queries optimized with indexes
✅ Manual QA passes
✅ E2E test covers dashboard load and interactions

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 5-6 days
**Dependencies:**
- ⏳ All previous PRDs (data must exist to display)
- ✅ Recharts library
- ✅ react-beautiful-dnd
- ✅ Real-time subscriptions setup
**Blocker Status:** 🚨 CRITICAL - Central hub for HR operations
