# PRD-DEV-017: Gestão de Candidaturas por Vaga

## 1. Introduction/Overview

The Gestão de Candidaturas por Vaga (Application Management per Job) system enables HR to view, filter, compare, and manage all candidates who applied to a specific job posting. This is the operational hub where recruiters spend most of their time reviewing applicants, advancing qualified candidates, and making hiring decisions.

**Problem it solves:** HR needs a centralized view of all applicants for each job with the ability to filter by recruitment stage, compare candidates, take bulk actions, and track application history. Without this system, recruiters cannot efficiently manage high-volume job postings or make data-driven hiring decisions.

**Goal:** Implement a comprehensive candidate management interface scoped to individual job postings, where HR can see all applicants in a table/Kanban view, filter by test results and stages, compare multiple candidates side-by-side, move candidates through the pipeline, add notes, and export applicant data—all optimized for high-volume recruitment.

## 2. Goals

1. Display all candidates who applied to a specific job
2. Provide table and Kanban board view options
3. Enable filtering by recruitment stage, test scores, and demographics
4. Support candidate comparison (up to 4 candidates side-by-side)
5. Implement drag-and-drop stage changes in Kanban view
6. Allow bulk stage changes and bulk email sending
7. Show candidate test results inline (Big Five, DISC, Raven)
8. Enable per-candidate notes and tags
9. Track application timeline (applied → current stage)
10. Export candidate lists (Excel, PDF) with filters applied
11. Provide quick actions (approve, reject, schedule interview)
12. Display candidate ranking/scoring if available

## 3. User Stories

### Primary Flow
**As an** HR recruiter
**I want to** see all candidates who applied to my "Dentista SP" job posting
**So that** I can review applications and advance qualified candidates

**As an** HR professional
**I want to** filter candidates by recruitment stage
**So that** I can focus on candidates in specific phases (e.g., only those who completed DISC)

**As an** HR manager
**I want to** compare 3 candidates side-by-side with their test results
**So that** I can make informed hiring decisions

### Secondary Flow
**As an** HR recruiter
**I want to** drag a candidate from "Big Five" to "DISC" stage in Kanban view
**So that** I can quickly advance candidates through the pipeline

**As an** HR professional
**I want to** add private notes to specific applications
**So that** I can record interview feedback and observations

**As an** admin user
**I want to** export all applicants for a job to Excel
**So that** I can create reports for hiring managers

### Edge Cases
**As an** HR recruiter
**I want to** see candidates who applied but haven't completed triagem
**So that** I can send reminder emails

**As an** HR user
**I want** the system to show when candidates are stuck at a stage for >7 days
**So that** I can follow up on inactive candidates

**As an** admin
**I want to** see duplicate applications from the same candidate
**So that** I can merge or remove duplicates

## 4. Functional Requirements

### FR-001: Access to Application Management
**URL:** `/admin/vagas/:vagaId/candidatos`

**Breadcrumb Navigation:**
```
Vagas > Dentista Recepcionista - São Paulo > Candidatos (45)
```

**Access Control:**
- `rh_basico`: Can view all, cannot bulk approve/reject
- `rh_avancado`: Full access
- `admin`: Full access + delete applications

**Header:**
```
┌─────────────────────────────────────────────────────────────┐
│  💼 Dentista Recepcionista - São Paulo                      │
│  45 candidatos  •  Publicada em 01/11/2024                  │
│  [📊 Ver Analytics da Vaga]  [✏️ Editar Vaga]              │
└─────────────────────────────────────────────────────────────┘
```

### FR-002: View Toggle (Table vs Kanban)
**Toggle Buttons:**
```
[📋 Tabela]  [📊 Kanban]
```

**Default View:** Tabela (better for detailed data)
**Persistence:** Save user preference to localStorage

### FR-003: Table View
**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Filtros:                                                                   │
│  [Etapa ▾] [Big Five ▾] [DISC ▾] [Raven ▾] [Tags ▾] [🔍 Buscar nome/email]│
│                                                                             │
│  [☐] Nome            Email         Etapa      Big5  DISC  Raven  Ações    │
│  ──────────────────────────────────────────────────────────────────────────│
│  [☐] Ana Silva      ana@email     Triagem     -     -     -    [Ver][✉️] │
│  [☐] Bruno Costa    bruno@email   Big Five   78%    -     -    [Ver][✉️] │
│  [☐] Carla Souza    carla@email   DISC       82%   IC     -    [Ver][✉️] │
│  [☐] Daniel Lima    daniel@email  Raven      76%   DS    65%   [Ver][✉️] │
│  [☐] Elena Martins  elena@email   Entre...   88%   DI    82%   [Ver][✉️] │
│                                                                             │
│  ☐ Selecionar todos (45)                                Página 1 de 3       │
│                                                                             │
│  Ações em massa: [✉️ Enviar Email] [🔄 Mudar Etapa] [📥 Exportar]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Table Columns:**
1. **Checkbox** - Select for bulk actions
2. **Nome** - Clickable, opens candidate detail
3. **Email** - Copyable on click
4. **Data Aplicação** - Sortable
5. **Etapa Atual** - Color-coded badge
6. **Big Five Score** - Percentage (e.g., 78%)
7. **DISC Profile** - Primary style (e.g., "IC")
8. **Raven Score** - Percentage
9. **Tags** - Custom tags (e.g., "Destaque", "Urgente")
10. **Ações** - Quick action buttons

**Sorting:**
- Click column header to sort
- Default: Data de aplicação (descending)
- Multi-column sort (shift+click)

**Pagination:**
- 20 candidates per page
- Show total count
- Jump to page input

### FR-004: Kanban View
**Layout:**
```
┌───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
│ Triagem   │ Big Five  │ DISC      │ Entrevist │ Raven     │ Cultura   │ Entrevist │
│ (12)      │ (8)       │ (6)       │ Online(4) │ (3)       │ (2)       │ Pres.(1)  │
├───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┤
│┌─────────┐│┌─────────┐│┌─────────┐│┌─────────┐│┌─────────┐│┌─────────┐│┌─────────┐│
││Ana Silva│││Bruno    │││Carla    │││Daniel   │││Elena    │││Fernanda │││Gabriel  ││
││📅 2 dias│││Costa    │││Souza    │││Lima     │││Martins  │││Rocha    │││Santos   ││
││         │││📅 5 dias│││📅 3 dias│││📅 1 dia │││📅 4 dias│││📅 6 dias│││📅 2 dias││
││[Ver]    │││Big5:78% │││DISC: IC │││Raven:65%│││B5:88%   │││B5:76%   │││B5:82%   ││
│└─────────┘││[Ver]    │││[Ver]    │││[Ver]    │││DISC:DI  │││DISC:SC  │││DISC:IS  ││
│           │└─────────┘│└─────────┘│└─────────┘││Raven:82%│││Raven:71%│││Raven:88%││
│           │           │           │           ││[Ver]    │││[Ver]    │││[Ver]    ││
│           │           │           │           │└─────────┘│└─────────┘│└─────────┘│
│  [+Novo]  │           │           │           │           │           │           │
└───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
```

**Drag-and-Drop:**
- Use `react-beautiful-dnd` or `@dnd-kit/core`
- Drag candidate card between columns to change stage
- Show confirmation modal if moving backwards:
  ```
  ⚠️ Você está movendo Elena Martins de "Entrevista Online" para "DISC".
  Isso é uma regressão no processo. Confirmar?
  [Cancelar] [Confirmar]
  ```

**Stage Change Logic:**
```typescript
async function onDragEnd(result: DropResult) {
  if (!result.destination) return

  const candidatoId = result.draggableId
  const newStage = result.destination.droppableId as EtapaProcesso

  const { error } = await supabase
    .from('candidatos')
    .update({
      etapa_atual: newStage,
      progresso_processo: calculateProgress(newStage)
    })
    .eq('id', candidatoId)

  if (!error) {
    // Log stage change
    await supabase.from('candidatos_historico').insert([{
      candidato_id: candidatoId,
      campo_alterado: 'etapa_atual',
      valor_anterior: result.source.droppableId,
      valor_novo: newStage,
      alterado_por: currentUser.id
    }])

    toast.success('Candidato movido para ' + newStage)
  }
}
```

**Card Content:**
- Candidate name
- Days at current stage (e.g., "📅 3 dias")
- Latest test score if available
- Tag indicators
- [Ver Perfil] button

### FR-005: Filtering System
**Filter Options:**

**1. Etapa (Stage):**
```typescript
const etapaOptions = [
  'Todos',
  'Triagem',
  'Big Five',
  'DISC',
  'Entrevista Online',
  'Raven',
  'Cultura',
  'Entrevista Presencial',
  'Aprovado'
]
```

**2. Big Five Score:**
- Todos
- Excelente (≥80%)
- Bom (60-79%)
- Médio (40-59%)
- Baixo (<40%)
- Não realizado

**3. DISC Profile:**
- Todos
- D (Dominância)
- I (Influência)
- S (Estabilidade)
- C (Conformidade)
- Combinações (DI, IS, SC, etc.)
- Não realizado

**4. Raven Score:**
- Todos
- Superior (≥75%)
- Acima da Média (50-74%)
- Média (25-49%)
- Abaixo da Média (<25%)
- Não realizado

**5. Data de Aplicação:**
- Últimos 7 dias
- Últimos 30 dias
- Últimos 90 dias
- Personalizado (date range picker)

**6. Tags:**
- Multi-select dropdown
- Shows all tags used across candidates
- Example: "Destaque", "Urgente", "Reconsiderar"

**7. Busca por Texto:**
- Search: Nome, Email, CPF, Telefone
- Debounced search (300ms)
- Clear button

**Active Filters Display:**
```
Filtros ativos:
[Etapa: DISC ✕] [Big Five: Excelente ✕] [Tag: Destaque ✕]
[Limpar todos filtros]
```

**Filter Persistence:**
- Save to URL query params for shareability
- Example: `/admin/vagas/123/candidatos?etapa=disc&bigfive=excellent&tag=destaque`

### FR-006: Candidate Comparison
**Trigger:** Select 2-4 candidates (checkboxes) → Click "Comparar Selecionados"

**Comparison Modal (Full-screen):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Comparação de Candidatos                                        [X Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Critério        │  Ana Silva    │  Bruno Costa  │  Carla Souza │          │
│  ────────────────┼───────────────┼───────────────┼──────────────┤          │
│  📅 Aplicação    │  01/11/2024   │  02/11/2024   │  03/11/2024  │          │
│  📍 Etapa Atual  │  DISC         │  Raven        │  Entrevista  │          │
│                  │               │               │  Online      │          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          │
│  🧠 Big Five                                                                │
│  ────────────────┼───────────────┼───────────────┼──────────────┤          │
│  Abertura        │  ████████ 82% │  ██████░░ 65% │  █████████ 88%│          │
│  Conscienciosid. │  ███████░ 75% │  ████████ 80% │  ██████░░ 70%│          │
│  Extroversão     │  ██████░░ 68% │  ████████ 82% │  █████████ 90%│          │
│  Amabilidade     │  ████████ 80% │  ███████░ 72% │  ████████ 85%│          │
│  Neuroticismo    │  ████░░░░ 45% │  ██████░░ 55% │  ███░░░░░ 38%│          │
│                  │               │               │              │          │
│  🎯 DISC                                                                    │
│  ────────────────┼───────────────┼───────────────┼──────────────┤          │
│  Perfil          │  IC           │  DS           │  DI          │          │
│  Dominância      │  ██████░░ 65% │  ████████ 78% │  █████████ 88%│          │
│  Influência      │  ████████ 82% │  ████░░░░ 42% │  ████████ 80%│          │
│  Estabilidade    │  ████░░░░ 45% │  ████████ 85% │  ███░░░░░ 35%│          │
│  Conformidade    │  ████████ 85% │  ██████░░ 68% │  ██████░░ 60%│          │
│                  │               │               │              │          │
│  🧩 Raven                                                                   │
│  ────────────────┼───────────────┼───────────────┼──────────────┤          │
│  Pontuação       │  Não realiz.  │  65%          │  78%         │          │
│  Percentil       │  -            │  P60          │  P75         │          │
│                  │               │               │              │          │
│  📝 Notas                                                                   │
│  ────────────────┼───────────────┼───────────────┼──────────────┤          │
│                  │  "Perfil      │  "Experiência │  "Comunicação│          │
│                  │  técnico      │  em gestão"   │  excelente"  │          │
│                  │  forte"       │               │              │          │
│                                                                             │
│  [📥 Exportar Comparação PDF]                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Export Comparison:**
- Generate PDF with side-by-side comparison
- Include charts for Big Five and DISC
- Add notes and tags
- Filename: `comparacao_candidatos_vaga_123_${Date.now()}.pdf`

### FR-007: Quick Actions (per candidate)
**Action Buttons (in table row):**

**1. Ver Perfil:**
- Opens candidate detail modal or navigates to `/admin/candidatos/:id`

**2. Enviar Email:**
- Opens email composition modal pre-filled with candidate info
- Template selector available
- Uses PRD-DEV-015 email system

**3. Agendar Entrevista:**
- Opens scheduling modal
- Select: Online ou Presencial
- Date/time picker
- Send calendar invite (.ics file)

**4. Aprovar:**
- Quick approval (rh_avancado+)
- Confirmation: "Aprovar Ana Silva para próxima etapa?"
- Updates `etapa_atual` based on current stage

**5. Rejeitar:**
- Opens rejection modal (from PRD-DEV-014)
- Select rejection reason
- Send automated email to candidate

**6. Adicionar Nota:**
- Opens note input modal
- Save to `candidatos_notas` table
- Markdown support

**7. Adicionar Tag:**
- Tag input with autocomplete
- Create new tags on the fly
- Save to `candidatos_tags` table

### FR-008: Bulk Actions
**Trigger:** Select ≥2 candidates → Bulk action menu appears

**Available Bulk Actions:**

**1. Mudar Etapa:**
```
┌─────────────────────────────────────────────────┐
│  Mudar Etapa de 5 candidatos selecionados      │
├─────────────────────────────────────────────────┤
│  Nova etapa:                                    │
│  [Selecionar etapa ▾]                           │
│  ○ Triagem                                      │
│  ○ Big Five                                     │
│  ○ DISC                                         │
│  ○ Entrevista Online                            │
│  ○ Raven                                        │
│  ○ Cultura                                      │
│  ○ Entrevista Presencial                        │
│                                                 │
│  ☐ Notificar candidatos por email              │
│                                                 │
│  [Cancelar]  [Mudar Etapa]                     │
└─────────────────────────────────────────────────┘
```

**2. Enviar Email em Massa:**
- Opens email composer (PRD-DEV-015)
- Template selector
- Variable substitution for each candidate
- Max 100 recipients

**3. Adicionar Tag:**
- Input tag name
- Apply to all selected candidates

**4. Exportar Selecionados:**
- Export selected candidates to Excel/CSV/PDF
- Include all visible columns + test results

**5. Rejeitar em Massa:**
- Only for admin users
- Requires rejection reason (same for all)
- Confirmation required
- Max 20 candidates at once

**Bulk Action Limits:**
- Stage change: Max 50 candidates
- Email: Max 100 candidates
- Tag: No limit
- Export: Max 500 candidates
- Reject: Max 20 candidates

### FR-009: Application Timeline
**Per Candidate Detail View:**

Shows chronological history of candidate's journey through recruitment process.

```
┌─────────────────────────────────────────────────────────┐
│  Timeline - Ana Silva                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🟢 01/11/2024 10:30 - Candidatura Recebida            │
│     Vaga: Dentista Recepcionista - São Paulo           │
│                                                         │
│  🟢 01/11/2024 14:20 - Triagem Aprovada                │
│     Por: João Silva (RH)                                │
│     Nota: "Perfil adequado, encaminhar para testes"    │
│                                                         │
│  🟢 02/11/2024 09:15 - Big Five Iniciado               │
│                                                         │
│  🟢 02/11/2024 11:42 - Big Five Concluído              │
│     Pontuação: 78% (Bom)                                │
│                                                         │
│  🟢 03/11/2024 08:30 - DISC Concluído                  │
│     Perfil: IC (Influência + Conformidade)              │
│                                                         │
│  🟡 03/11/2024 14:00 - Aguardando Entrevista Online    │
│     Status: Pendente agendamento                        │
│                                                         │
│  [Ver Todos os Eventos (12)]                            │
└─────────────────────────────────────────────────────────┘
```

**Event Types:**
- Application received
- Stage changes
- Test completions
- Emails sent/received
- Notes added
- Tags added
- Interviews scheduled
- Approvals/rejections
- Document uploads

**Data Source:**
```typescript
const { data: timeline } = await supabase
  .from('candidatos_historico')
  .select('*, usuario:usuarios_rh(nome)')
  .eq('candidato_id', candidatoId)
  .order('data_evento', { ascending: false })
```

### FR-010: Candidate Notes System
**Note Types:**
1. **Private Notes** - Only visible to HR (default)
2. **Shared Notes** - Visible to all HR users
3. **Interview Notes** - Specific to interview stages

**Note Creation:**
```
┌─────────────────────────────────────────────────┐
│  Adicionar Nota - Ana Silva                     │
├─────────────────────────────────────────────────┤
│  Tipo:                                          │
│  ○ Nota privada (só eu vejo)                    │
│  ○ Nota compartilhada (todos os RH)             │
│  ○ Nota de entrevista                           │
│                                                 │
│  Nota:                                          │
│  ┌─────────────────────────────────────────┐   │
│  │ Candidata demonstrou excelente          │   │
│  │ comunicação durante triagem telefônica. │   │
│  │ Experiência prévia em recepção (3 anos).│   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Cancelar]  [Salvar Nota]                     │
└─────────────────────────────────────────────────┘
```

**Display Notes:**
- Show in candidate detail modal/page
- Show note author and timestamp
- Markdown rendering support
- Edit/delete own notes (admin can delete all)

**Database Schema:**
```sql
CREATE TABLE candidatos_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID REFERENCES candidatos(id),
  vaga_id UUID REFERENCES vagas(id),
  autor_id UUID REFERENCES usuarios_rh(id),
  tipo_nota TEXT CHECK (tipo_nota IN ('privada', 'compartilhada', 'entrevista')),
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### FR-011: Tagging System
**Tag Management:**
- Tags are free-form text labels
- Auto-complete from existing tags
- Color-coded (auto-assigned or manual)

**Common Tags:**
- 🌟 Destaque
- ⚡ Urgente
- 🔄 Reconsiderar
- 📞 Aguardando Contato
- ✅ Pré-Aprovado
- 💼 Experiência Senior

**Tag Display:**
- Show as colored badges in table view
- Max 3 tags visible (+ "2 more" indicator)
- Hover to see all tags

**Tag Filtering:**
- Multi-select dropdown filter
- OR logic (show candidates with ANY selected tag)

**Database Schema:**
```sql
CREATE TABLE candidatos_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID REFERENCES candidatos(id),
  vaga_id UUID REFERENCES vagas(id),
  tag_nome TEXT NOT NULL,
  cor_tag TEXT, -- Hex color code
  criado_por UUID REFERENCES usuarios_rh(id),
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tags_candidato ON candidatos_tags(candidato_id);
CREATE INDEX idx_tags_vaga ON candidatos_tags(vaga_id);
```

### FR-012: Export Functionality
**Export Options:**

**1. Export to Excel (.xlsx):**
- All filtered candidates
- Columns: Nome, Email, CPF, Etapa, Big Five %, DISC, Raven %, Tags, Data Aplicação
- Include summary sheet with metrics

**2. Export to CSV:**
- Same data as Excel
- UTF-8 encoding with BOM (for Excel compatibility)

**3. Export to PDF:**
- Formatted report with table
- Include filters applied
- Beauty Smile branding

**Export Code:**
```typescript
async function exportToExcel(candidates: Candidato[], filters: Filters) {
  const data = candidates.map(c => ({
    'Nome': c.nome_completo,
    'Email': c.email,
    'CPF': c.cpf,
    'Telefone': c.telefone,
    'Etapa Atual': c.etapa_atual,
    'Big Five': c.resultados_big_five?.pontuacao_geral
      ? `${c.resultados_big_five.pontuacao_geral}%`
      : 'Não realizado',
    'DISC': c.resultados_disc?.estilo_primario || 'Não realizado',
    'Raven': c.resultados_raven?.percentil
      ? `P${c.resultados_raven.percentil}`
      : 'Não realizado',
    'Tags': c.tags?.map(t => t.tag_nome).join(', ') || '-',
    'Data Aplicação': format(c.data_aplicacao, 'dd/MM/yyyy')
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Candidatos')

  // Add summary sheet
  const summary = {
    'Total Candidatos': candidates.length,
    'Por Etapa': countByStage(candidates),
    'Filtros Aplicados': formatFilters(filters)
  }
  const wsSum = XLSX.utils.json_to_sheet([summary])
  XLSX.utils.book_append_sheet(wb, wsSum, 'Resumo')

  XLSX.writeFile(wb, `candidatos_vaga_${vagaId}_${Date.now()}.xlsx`)
}
```

### FR-013: Candidate Detail Modal
**Trigger:** Click candidate name in table or "Ver Perfil" button

**Modal Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Ana Silva                                           [X Fechar]  │
│  ana.silva@email.com  •  (11) 98765-4321                        │
├─────────────────────────────────────────────────────────────────┤
│  [📧 Enviar Email] [📅 Agendar] [✅ Aprovar] [❌ Rejeitar]     │
├─────────────────────────────────────────────────────────────────┤
│  Tabs: [Visão Geral] [Testes] [Timeline] [Notas] [Documentos]  │
│  ──────────────────────────────────────────────────────────────│
│  📋 Visão Geral                                                 │
│                                                                 │
│  Informações Pessoais:                                          │
│  • CPF: 123.456.789-00                                          │
│  • Data Nascimento: 15/03/1995 (29 anos)                        │
│  • Gênero: Feminino                                             │
│  • Endereço: São Paulo, SP                                      │
│                                                                 │
│  Status no Processo:                                            │
│  • Etapa Atual: DISC                                            │
│  • Progresso: ████████░░ 43% (3/7 etapas)                      │
│  • Tempo no processo: 3 dias                                    │
│  • Tempo na etapa atual: 12 horas                               │
│                                                                 │
│  Informações Profissionais:                                     │
│  • Escolaridade: Superior Completo - Odontologia                │
│  • Experiência: 3 anos em recepção odontológica                 │
│  • Último Emprego: Clínica Sorriso (2020-2024)                  │
│                                                                 │
│  Tags:                                                          │
│  [🌟 Destaque] [💼 Experiência Senior]                         │
│                                                                 │
│  ──────────────────────────────────────────────────────────────│
│  📊 Testes (Tab 2 - if clicked)                                │
│                                                                 │
│  🧠 Big Five - Concluído em 02/11/2024                         │
│  Pontuação Geral: 78% (Bom)                                     │
│  • Abertura: ████████░░ 82%                                    │
│  • Conscienciosidade: ███████░░░ 75%                           │
│  • Extroversão: ██████░░░░ 68%                                 │
│  • Amabilidade: ████████░░ 80%                                 │
│  • Neuroticismo: ████░░░░░░ 45%                                │
│  [Ver Análise Completa]                                         │
│                                                                 │
│  🎯 DISC - Concluído em 03/11/2024                             │
│  Perfil: IC (Influência + Conformidade)                         │
│  • Dominância: ██████░░░░ 65%                                  │
│  • Influência: ████████░░ 82%                                  │
│  • Estabilidade: ████░░░░░░ 45%                                │
│  • Conformidade: ████████░░ 85%                                │
│  [Ver Análise Completa]                                         │
│                                                                 │
│  🧩 Raven - Não realizado                                      │
│  Status: Aguardando conclusão da Entrevista Online              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Quick Actions from Modal:**
- Send email
- Schedule interview
- Approve/reject
- Add note
- Add tag
- Download candidate PDF report

### FR-014: Analytics Summary (per job)
**Display at top of candidate list:**

```
┌─────────────────────────────────────────────────────────┐
│  📊 Resumo Rápido                                       │
├─────────────────────────────────────────────────────────┤
│  Total Candidatos: 45                                   │
│                                                         │
│  Por Etapa:                                             │
│  Triagem (12)  Big Five (8)  DISC (6)  Entrevist. (4)  │
│  Raven (3)  Cultura (2)  Entrevist. Pres. (1)          │
│                                                         │
│  Aprovados: 0  •  Rejeitados: 9                        │
│  Taxa Aprovação Triagem: 80% (36/45)                    │
│                                                         │
│  Tempo Médio no Processo: 8 dias                        │
│  Candidatos Inativos (>7 dias): 5                      │
│                                                         │
│  [Ver Analytics Detalhado]                              │
└─────────────────────────────────────────────────────────┘
```

### FR-015: Mobile Responsiveness
**Mobile Optimizations:**
- Table view switches to card layout on mobile
- Filters collapse into drawer
- Kanban board scrollable horizontally
- Quick actions in slide-up menu
- Comparison limited to 2 candidates on mobile

**Mobile Card View:**
```
┌──────────────────────────────────┐
│  👤 Ana Silva                    │
│  📧 ana.silva@email.com          │
│  📍 Etapa: DISC                  │
│                                  │
│  🧠 Big Five: 78%                │
│  🎯 DISC: IC                     │
│  🧩 Raven: Não realizado         │
│                                  │
│  🏷️ Destaque, Urgente           │
│                                  │
│  [Ver Perfil] [📧]              │
└──────────────────────────────────┘
```

## 5. Non-Goals (Out of Scope)

1. **Video interviews in-app** - Schedule only, external tools
2. **Automated AI screening** - Manual review only for MVP
3. **Candidate self-scheduling** - HR schedules interviews
4. **Reference checking module** - External process
5. **Background check integration** - Manual process
6. **Salary negotiation tracking** - HR handles externally
7. **Offer letter generation** - Use templates, not in-app
8. **Onboarding workflow** - Post-hiring, separate system
9. **Team collaboration comments** - Notes only, no threads
10. **Advanced analytics/ML** - Basic metrics only

## 6. Design Considerations

**Visual Design:**
- Clean, data-dense table with good whitespace
- Color-coded stage badges for quick scanning
- Hover states on all interactive elements
- Skeleton loaders during data fetch

**Accessibility:**
- Keyboard navigation for table (arrow keys)
- ARIA labels for all actions
- Screen reader support for Kanban drag-and-drop
- High contrast mode for comparison view

**Performance:**
- Virtual scrolling for >100 candidates (react-window)
- Debounced search and filters
- Optimistic UI updates for stage changes
- Cache candidate list with React Query

## 7. Technical Considerations

**State Management:**
```typescript
interface VagaCandidatosState {
  candidates: Candidato[]
  selectedIds: string[]
  filters: CandidateFilters
  viewMode: 'table' | 'kanban'
  isLoading: boolean
  pagination: {
    page: number
    perPage: number
    total: number
  }

  fetchCandidates: () => Promise<void>
  updateCandidateStage: (id: string, stage: string) => Promise<void>
  bulkUpdateStage: (ids: string[], stage: string) => Promise<void>
  exportCandidates: (format: 'xlsx' | 'csv' | 'pdf') => void
}
```

**Database Query:**
```typescript
const { data: candidates, count } = await supabase
  .from('candidatos')
  .select(`
    *,
    resultados_big_five(pontuacao_geral),
    resultados_disc(estilo_primario, estilo_secundario),
    resultados_raven(percentil),
    tags:candidatos_tags(tag_nome, cor_tag),
    notas:candidatos_notas(id, conteudo, criado_em, autor:usuarios_rh(nome))
  `, { count: 'exact' })
  .eq('vaga_aplicada_id', vagaId)
  .in('etapa_atual', filters.stages)
  .ilike('nome_completo', `%${filters.search}%`)
  .order('data_aplicacao', { ascending: false })
  .range(from, to)
```

**Real-time Updates:**
```typescript
const subscription = supabase
  .channel(`vaga_${vagaId}_candidates`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'candidatos',
    filter: `vaga_aplicada_id=eq.${vagaId}`
  }, (payload) => {
    // Update local state
    if (payload.eventType === 'UPDATE') {
      updateCandidateInList(payload.new)
    }
  })
  .subscribe()
```

## 8. Success Metrics

**Primary:**
1. Time to review candidate: ≤ 2 minutes per candidate
2. Stage change speed: ≤ 5 seconds from drag to update
3. Comparison usage: ≥ 40% of hiring decisions use comparison
4. Filter usage: ≥ 60% of sessions apply filters

**Secondary:**
1. Export frequency: Avg 2 exports per job posting
2. Bulk actions: 25% of stage changes are bulk
3. Note taking: Avg 1.5 notes per candidate
4. Mobile usage: ≥ 15% of candidate reviews on mobile

**Analytics Tracking:**
- Candidates reviewed per day
- Avg time spent per candidate
- Most used filters
- Stage change frequency
- Bulk action usage

## 9. Open Questions

1. **Candidate Ranking:**
   - **Question:** Should we add AI-powered candidate ranking/scoring?
   - **Recommendation:** Not for MVP, add in Phase 2 with ML integration

2. **Interview Scheduling:**
   - **Question:** Integrate with Google Calendar/Outlook or manual only?
   - **Recommendation:** Manual for MVP (just send .ics file), integrate later

3. **Rejection Notifications:**
   - **Question:** Auto-send rejection emails or require manual send?
   - **Recommendation:** Auto-send with 24-hour delay (allow undo)

4. **Tag Standardization:**
   - **Question:** Free-form tags or predefined list?
   - **Recommendation:** Hybrid - suggest common tags but allow custom

---

## Acceptance Criteria Summary

✅ Table view displays all candidates with key info (name, stage, test scores)
✅ Kanban view shows candidates grouped by stage with drag-and-drop
✅ Filters work for stage, test scores, tags, and search
✅ Comparison modal shows 2-4 candidates side-by-side with charts
✅ Quick actions (email, approve, reject, schedule) work from table
✅ Bulk actions support stage change, email, tagging, export
✅ Application timeline shows chronological event history
✅ Notes system allows private/shared notes with markdown
✅ Tags can be added, filtered, and color-coded
✅ Export to Excel/CSV/PDF includes filtered data
✅ Candidate detail modal shows all info and test results
✅ Analytics summary shows funnel metrics and inactive candidates
✅ Real-time updates when other users change candidate stages
✅ Mobile-responsive with card view and horizontal Kanban
✅ Performance: Virtual scrolling for >100 candidates
✅ Manual QA passes with 0 critical bugs
✅ E2E test covers filter → compare → bulk update → export flow

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 7-8 days
**Dependencies:**
- ✅ `candidatos` table with all fields
- ✅ `resultados_big_five`, `resultados_disc`, `resultados_raven` tables
- ✅ `candidatos_historico` table for timeline
- ✅ `candidatos_notas` table
- ✅ `candidatos_tags` table
- ✅ PRD-DEV-013 (Gestão de Candidatos) for shared components
- ✅ PRD-DEV-015 (Email system) for email integration
- ✅ react-beautiful-dnd for Kanban drag-and-drop
- ✅ TanStack Table for advanced table features
- ✅ Recharts for comparison charts
- ✅ XLSX.js for Excel export
**Blocker Status:** 🔥 HIGH - Critical for efficient candidate management and hiring decisions
