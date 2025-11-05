# PRD-DEV-013: Gestão de Candidatos

## 1. Introduction/Overview

The Gestão de Candidatos provides HR professionals with comprehensive tools to view, search, filter, sort, and manage all candidates in the recruitment system. This feature enables efficient candidate discovery, bulk operations, advanced filtering, and detailed profile viewing for informed hiring decisions.

**Problem it solves:** HR teams struggle to find specific candidates among hundreds of applications. Manual searching through lists is slow, filtering by test scores requires SQL knowledge, and comparing candidates side-by-side is impossible. This feature makes candidate management fast, intuitive, and data-driven.

**Goal:** Implement a powerful candidate management interface with advanced search and filtering, sortable data tables, bulk actions, detailed profile views, comparison tools, and export capabilities—enabling HR to efficiently manage the entire candidate database and make faster, better hiring decisions.

## 2. Goals

1. Display searchable, sortable table of all candidates with key information
2. Provide advanced filters (stage, test scores, match percentage, date ranges, tags)
3. Enable full-text search across name, email, phone, skills, and notes
4. Support bulk actions (send email, change stage, export, tag, archive)
5. Show detailed candidate profile with all tests, applications, and history
6. Allow side-by-side comparison of 2-4 candidates
7. Enable tagging system for custom organization (e.g., "High Potential", "Follow Up")
8. Provide CSV/Excel export with customizable columns
9. Track candidate interaction history (emails sent, notes added, stage changes)
10. Support saved filter presets for common queries (e.g., "Ready for Interview")

## 3. User Stories

### Primary Flow - Finding Candidates
**As an** HR professional
**I want to** search for candidates by name or email
**So that** I can quickly find specific applicants

**As a** recruiter
**I want to** filter candidates by test scores and match percentage
**So that** I can identify top performers for a role

**As an** HR manager
**I want to** see all candidates in a specific recruitment stage
**So that** I can manage the pipeline and prevent bottlenecks

### Secondary Flow - Bulk Operations
**As an** HR professional
**I want to** select multiple candidates and send them an email
**So that** I can communicate efficiently without individual messages

**As a** recruiter
**I want to** move multiple candidates to the next stage at once
**So that** I can process batches of approved applicants quickly

**As an** HR manager
**I want to** export a filtered list of candidates to Excel
**So that** I can share data with hiring managers or executives

### Advanced Features
**As an** HR professional
**I want to** compare test results of 3 candidates side-by-side
**So that** I can make objective hiring decisions

**As a** recruiter
**I want to** save my frequently used filters as presets
**So that** I don't have to recreate complex filters daily

**As an** HR professional
**I want to** tag candidates with custom labels
**So that** I can organize them beyond the standard stages

## 4. Functional Requirements

### FR-001: Candidate List Page
**URL:** `/admin/candidatos`

**Page Layout:**

**Header:**
- Title: "Gestão de Candidatos"
- Total count: "247 candidatos"
- Quick actions:
  - "Novo Candidato" button (manual registration)
  - "Importar CSV" button
  - "Exportar Selecionados" button (enabled when ≥1 selected)

**Filters Panel (Left Sidebar, Collapsible):**
```
┌─────────────────────────────┐
│ 🔍 Buscar                    │
│ [________________________]  │
│                             │
│ 📊 Filtros                   │
│                             │
│ Etapa:                      │
│ ☐ Triagem (58)              │
│ ☐ Big Five (42)             │
│ ☐ DISC (31)                 │
│ ☐ Entrevista Online (24)    │
│ ☐ Raven (18)                │
│ ☐ Cultura (12)              │
│ ☐ Entrevista Presencial (8) │
│ ☐ Aprovado (15)             │
│ ☐ Reprovado (39)            │
│                             │
│ Match Score:                │
│ [===|========] 0-100%       │
│                             │
│ Data de Cadastro:           │
│ ○ Última semana             │
│ ○ Último mês                │
│ ○ Últimos 3 meses           │
│ ● Personalizado             │
│   [01/01/2025] - [31/01/25] │
│                             │
│ Testes:                     │
│ ☐ Big Five completo         │
│ ☐ DISC completo             │
│ ☐ Raven completo            │
│ ☐ Todos os testes completos │
│                             │
│ Tags:                       │
│ ☐ Alto Potencial (12)       │
│ ☐ Follow Up (8)             │
│ ☐ Aguardando Resposta (5)   │
│                             │
│ [Limpar Filtros]            │
│ [Salvar Filtro Atual]       │
└─────────────────────────────┘
```

**Main Content: Data Table**
```
┌──┬──────────────────┬─────────┬──────────┬───────────┬─────────┬──────────┐
│☐│ Nome             │ Email   │ Etapa    │ Match     │ Testes  │ Ações    │
├──┼──────────────────┼─────────┼──────────┼───────────┼─────────┼──────────┤
│☐│ João Silva       │ joao@.. │ DISC     │ 87% ⭐    │ 2/3 ✓   │ [👁️📧✅❌]│
│☐│ Maria Santos     │ maria@..│ Big Five │ 72%       │ 1/3     │ [👁️📧✅❌]│
│☐│ Pedro Costa      │ pedro@..│ Raven    │ 91% ⭐⭐  │ 3/3 ✓✓  │ [👁️📧✅❌]│
│☐│ Ana Lima         │ ana@... │ Aprovado │ 85% ⭐    │ 3/3 ✓✓✓ │ [👁️📧]   │
└──┴──────────────────┴─────────┴──────────┴───────────┴─────────┴──────────┘

[← Anterior] Página 1 de 13 [Próxima →]
Mostrando 1-20 de 247 candidatos
```

**Table Columns (Customizable):**
- Checkbox (select for bulk actions)
- Nome (sortable, clickable → profile)
- Email
- Telefone
- Etapa Atual (badge with color)
- Match Score (%, with star icons for ≥85%)
- Testes Completos (X/3 with checkmarks)
- Data de Cadastro (sortable)
- Última Atividade (sortable)
- Tags (pills)
- Ações (icons: View, Email, Approve, Reject)

**Sorting:**
- Click column header to sort
- Arrow indicator (↑↓) shows sort direction
- Multi-column sort (hold Shift + click)

### FR-002: Search Functionality
**Search Input:**
- Placeholder: "Buscar por nome, email, telefone, CPF..."
- Debounced (300ms delay)
- Search as you type

**Search Scope:**
- `candidatos.nome_completo`
- `candidatos.email`
- `candidatos.telefone`
- `candidatos.cpf`
- `dados_profissionais.experiencia_descricao`
- Tags assigned to candidate

**Query Implementation:**
```typescript
const searchTerm = '%${query}%'

const { data } = await supabase
  .from('candidatos')
  .select(`
    *,
    dados_profissionais(*),
    tags_candidato(tags(*))
  `)
  .or(`
    nome_completo.ilike.${searchTerm},
    email.ilike.${searchTerm},
    telefone.ilike.${searchTerm},
    cpf.ilike.${searchTerm}
  `)
```

**Search Results:**
- Highlight matching terms in results
- Show result count: "23 resultados para 'silva'"
- Clear search button (X icon in input)

### FR-003: Advanced Filtering
**Filter Combinations:**
Filters use AND logic (all must match):
```typescript
let query = supabase.from('candidatos').select('*')

if (filters.stages.length > 0) {
  query = query.in('etapa_atual', filters.stages)
}

if (filters.matchMin && filters.matchMax) {
  query = query
    .gte('match_score', filters.matchMin)
    .lte('match_score', filters.matchMax)
}

if (filters.dateFrom && filters.dateTo) {
  query = query
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo)
}

if (filters.testsComplete) {
  query = query
    .not('resultados_big_five', 'is', null)
    .not('resultados_disc', 'is', null)
    .not('resultados_raven', 'is', null)
}
```

**Active Filters Display:**
Show active filters as removable pills above table:
```
Filtros ativos:
[Etapa: DISC ×] [Match: 80-100% ×] [Testes: Completos ×] [Limpar todos]
```

**Filter Presets:**
Save common filter combinations:
```
Presets salvos:
• Prontos para Entrevista
• Alto Potencial (Match ≥85%)
• Abandonaram no Big Five
• Aprovados esta semana
[+ Novo Preset]
```

**Save Preset Modal:**
```
Nome do preset: [___________________]
☑ Incluir busca atual
☑ Incluir ordenação
[Cancelar] [Salvar]
```

### FR-004: Bulk Actions
**Bulk Selection:**
- Checkbox in header selects all on page
- "Selecionar todos os 247 candidatos" link (if >1 page)
- Selected count badge: "12 selecionados"

**Bulk Action Toolbar (appears when ≥1 selected):**
```
┌─────────────────────────────────────────────────────────┐
│ 12 candidatos selecionados                              │
│ [📧 Enviar Email] [🏷️ Adicionar Tag] [📊 Mudar Etapa]   │
│ [📥 Exportar] [🗑️ Arquivar] [× Desselecionar Todos]     │
└─────────────────────────────────────────────────────────┘
```

**Bulk Email Modal:**
```
Enviar email para 12 candidatos

Assunto: [_________________________________]

Mensagem:
┌───────────────────────────────────────┐
│                                       │
│ [Rich text editor]                    │
│                                       │
└───────────────────────────────────────┘

Variáveis disponíveis:
{{nome}}, {{vaga}}, {{etapa_atual}}

☐ Agendar envio para: [___] [___]
☐ Anexar documento

[Cancelar] [Enviar para 12 candidatos]
```

**Bulk Stage Change:**
```
Mover 12 candidatos para:

○ Big Five
● DISC
○ Entrevista Online
○ Raven
○ Cultura
○ Entrevista Presencial
○ Aprovado
○ Reprovado

☐ Notificar candidatos por email

[Cancelar] [Mover candidatos]
```

**Bulk Tag:**
```
Adicionar tags aos 12 candidatos:

Selecione tags existentes:
☐ Alto Potencial
☐ Follow Up
☑ Aguardando Resposta

Ou crie nova:
[________________] [+ Criar tag]

[Cancelar] [Adicionar tags]
```

### FR-005: Candidate Detail Page
**URL:** `/admin/candidatos/:id`

**Page Sections:**

**Header:**
```
┌─────────────────────────────────────────────────────┐
│ [←] Voltar para lista                                │
│                                                      │
│ 📸  João Silva                    Match: 87% ⭐     │
│     joao.silva@email.com                            │
│     (11) 98765-4321                                 │
│     CPF: 123.456.789-00                             │
│                                                      │
│ Etapa: [DISC ▼]  Tags: [Alto Potencial ×] [+ Tag]  │
│                                                      │
│ [📧 Enviar Email] [📅 Agendar Entrevista] [✅ Aprovar] [❌ Rejeitar]
└─────────────────────────────────────────────────────┘
```

**Tabs:**
1. **Resumo** - Overview + AI analysis
2. **Dados Pessoais** - Profile information
3. **Testes** - Big Five, DISC, Raven results
4. **Candidaturas** - Job applications
5. **Documentos** - Uploaded files
6. **Histórico** - Timeline of all activities
7. **Notas** - Internal HR notes

**Tab 1: Resumo**
- AI-generated executive summary (from PRD-DEV-011)
- Quick stats (tests complete, days in process, applications)
- Match score breakdown (personality, behavior, cognitive)
- Recent activity timeline (last 5 events)

**Tab 2: Dados Pessoais**
```
Informações Pessoais:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nome Completo: João Silva
Email: joao.silva@email.com
Telefone: (11) 98765-4321
CPF: 123.456.789-00
Data de Nascimento: 15/03/1995 (29 anos)
Gênero: Masculino
Estado Civil: Solteiro

Endereço:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rua Exemplo, 123, Apto 45
Bairro Centro
São Paulo - SP
CEP: 01234-567

Dados Profissionais:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Escolaridade: Ensino Superior
Experiência em Odontologia: Não
Período Preferencial: Integral
Disponibilidade para viagens: Sim

[Editar Dados] [Exportar PDF]
```

**Tab 3: Testes**
Display all 3 test results (from PRD-DEV-010):
- Big Five radar chart + scores
- DISC bar chart + profile
- Raven score + percentile + set breakdown
- Link to full analysis page

**Tab 4: Candidaturas**
```
Histórico de Candidaturas

┌────────────────────────────────────────┐
│ 💼 Assistente de Vendas                │
│    Aplicado em: 10/01/2025             │
│    Status: Em análise                  │
│    Etapa: DISC                         │
│    Progresso: 42%                      │
│    [Ver detalhes da vaga]              │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 💼 Recepcionista                       │
│    Aplicado em: 08/01/2025             │
│    Status: Rejeitado                   │
│    Motivo: Perfil não compatível       │
│    [Ver histórico]                     │
└────────────────────────────────────────┘
```

**Tab 5: Documentos**
```
Documentos Enviados

┌────────────────────────────────────────┐
│ 📄 RG_Frente.pdf                       │
│    Enviado em: 10/01/2025              │
│    Tamanho: 2.3 MB                     │
│    [Visualizar] [Download] [Excluir]   │
└────────────────────────────────────────┘

[+ Upload novo documento]
```

**Tab 6: Histórico**
Timeline of all interactions:
```
────────────────────────────────────────
○ 15/01/2025 14:32 - Teste DISC completado
  Pontuação: D:68, I:85, S:52, C:41
  Perfil: ID (Influenciador Dominante)

────────────────────────────────────────
○ 12/01/2025 10:15 - Teste Big Five completado
  Pontuação geral: 75/100
  Análise de IA gerada

────────────────────────────────────────
○ 10/01/2025 09:00 - Aplicação enviada
  Vaga: Assistente de Vendas
  Confirmação enviada por email

────────────────────────────────────────
○ 10/01/2025 08:45 - Cadastro realizado
  Email de boas-vindas enviado
```

**Tab 7: Notas**
Internal notes (not visible to candidate):
```
Notas Internas do RH

┌────────────────────────────────────────┐
│ @carla_rh - 15/01/2025 16:20          │
│ Perfil muito bom para vendas! Ótima   │
│ comunicação e energia. Agendar         │
│ entrevista esta semana.                │
│ [Editar] [Excluir]                     │
└────────────────────────────────────────┘

[+ Adicionar nova nota]

┌───────────────────────────────────────┐
│ Escreva sua nota...                   │
│                                       │
└───────────────────────────────────────┘
[Salvar Nota]
```

### FR-006: Candidate Comparison
**URL:** `/admin/candidatos/comparar?ids=123,456,789`

**Trigger:**
- Select 2-4 candidates in table
- Click "Comparar Selecionados" button

**Layout:**
Side-by-side comparison table:
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│             │ João Silva  │ Maria Santos│ Pedro Costa │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ Match Score │ 87% ⭐      │ 72%         │ 91% ⭐⭐    │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ Big Five    │ [Radar]     │ [Radar]     │ [Radar]     │
│ Abertura    │ 75          │ 68          │ 82          │
│ Consciência │ 68          │ 72          │ 71          │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ DISC        │ [Bars]      │ [Bars]      │ [Bars]      │
│ Perfil      │ ID          │ SC          │ DI          │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ Raven       │ 42/60 (68%) │ 38/60 (58%) │ 51/60 (82%) │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ Experiência │ Sim         │ Não         │ Sim         │
│ Disponibil. │ Integral    │ Meio Período│ Integral    │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ Recomendação│ APROVAR     │ AGUARDAR    │ APROVAR     │
└─────────────┴─────────────┴─────────────┴─────────────┘

[Exportar Comparação] [Selecionar Candidato]
```

### FR-007: Tagging System
**Tag Structure:**
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  nome TEXT UNIQUE NOT NULL,
  cor TEXT, -- Hex color
  created_by UUID REFERENCES usuarios_rh(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tags_candidato (
  candidato_id UUID REFERENCES candidatos(id),
  tag_id UUID REFERENCES tags(id),
  adicionado_por UUID REFERENCES usuarios_rh(id),
  adicionado_em TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (candidato_id, tag_id)
);
```

**Pre-defined Tags:**
- Alto Potencial (green)
- Follow Up (yellow)
- Aguardando Resposta (orange)
- Red Flag (red)
- Experiência Prévia (blue)
- Recomendado (purple)

**Tag Management:**
- HR can create custom tags
- Tags displayed as colored pills
- Filter by tags in sidebar
- Bulk add/remove tags

### FR-008: Export Functionality
**Export Formats:**
- CSV (simple data)
- Excel (formatted with headers)
- PDF (formatted report)

**Export Modal:**
```
Exportar Candidatos

Formato: ● Excel  ○ CSV  ○ PDF

Colunas a exportar:
☑ Nome
☑ Email
☑ Telefone
☑ Etapa Atual
☑ Match Score
☑ Big Five - Abertura
☑ Big Five - Conscienciosidade
☑ Big Five - Extroversão
☑ Big Five - Amabilidade
☑ Big Five - Neuroticismo
☑ DISC - D
☑ DISC - I
☑ DISC - S
☑ DISC - C
☑ Raven - Pontuação
☑ Raven - Percentil
☑ Data de Cadastro
☑ Última Atividade

[Selecionar Tudo] [Desselecionar Tudo]

Candidatos: 12 selecionados
[Cancelar] [Exportar]
```

**Implementation:**
```typescript
import * as XLSX from 'xlsx'

function exportToExcel(candidates, columns) {
  const data = candidates.map(c => {
    const row = {}
    columns.forEach(col => {
      row[col.header] = c[col.field]
    })
    return row
  })

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Candidatos')
  XLSX.writeFile(wb, `candidatos_${Date.now()}.xlsx`)
}
```

### FR-009: Pagination & Performance
**Pagination:**
- Default: 20 candidates per page
- Options: 20, 50, 100, 200
- Virtual scrolling for large lists (optional)

**Query Optimization:**
```typescript
// Only fetch needed columns for table view
const { data, count } = await supabase
  .from('candidatos')
  .select(`
    id,
    nome_completo,
    email,
    telefone,
    etapa_atual,
    match_score,
    created_at,
    updated_at
  `, { count: 'exact' })
  .range(offset, offset + limit - 1)
  .order('created_at', { ascending: false })
```

**Caching:**
- Cache table data for 30 seconds
- Invalidate on create/update/delete
- Use TanStack Query for client-side caching

### FR-010: Mobile Responsiveness
**Tablet (768-1199px):**
- Collapse filter sidebar (overlay on click)
- Reduce table columns to essentials (Name, Stage, Match, Actions)
- Stack comparison view vertically

**Mobile (≤767px):**
- Show message: "Use tablet ou desktop para melhor experiência"
- Provide link to candidate details (individual view only)
- No table, no filters (not optimized)

## 5. Non-Goals (Out of Scope)

1. **Inline editing in table** - Click to profile for editing
2. **Drag-and-drop to change stage** - Dashboard kanban only
3. **Real-time collaboration** - No "User X is viewing this candidate"
4. **Version history of edits** - Only activity timeline
5. **Advanced analytics in candidate view** - Dashboard for analytics
6. **Integration with LinkedIn** - Manual import only
7. **Automated candidate matching** - Manual review required
8. **Custom fields** - Fixed schema for MVP
9. **Workflow automation** - N8N workflows only
10. **Multi-tenant support** - Single company only

## 6. Design Considerations

**Table Design:**
- Zebra striping for readability
- Hover highlight row
- Sticky header on scroll
- Responsive column widths

**Filter Panel:**
- Collapsible on smaller screens
- Badge counts next to each option
- Clear visual hierarchy

**Performance:**
- Virtualized scrolling for >500 rows
- Debounced search (300ms)
- Optimistic UI updates

## 7. Technical Considerations

### Stack
- TanStack Table v8 for data table
- TanStack Query for caching
- date-fns for date filtering
- XLSX.js for Excel export

### Database Indexes
```sql
-- Speed up filtering and sorting
CREATE INDEX idx_candidatos_etapa ON candidatos(etapa_atual);
CREATE INDEX idx_candidatos_match ON candidatos(match_score DESC);
CREATE INDEX idx_candidatos_created ON candidatos(created_at DESC);
CREATE INDEX idx_candidatos_search ON candidatos USING gin(to_tsvector('portuguese', nome_completo || ' ' || email));
```

## 8. Success Metrics

**Primary:**
1. Search usage: ≥60% of sessions
2. Filter usage: ≥40% of sessions
3. Time to find candidate: ≤30 seconds

**Secondary:**
1. Bulk actions usage: ≥20% of actions
2. Export usage: ≥10 exports/week
3. Comparison usage: ≥5 comparisons/week

**Business:**
1. Candidate review time: ↓50%
2. Missed follow-ups: ↓70%
3. HR satisfaction: ≥4.6/5

## 9. Open Questions

1. **Table Column Default:** Show all or minimal columns by default?
   - **Recommendation:** Minimal (Name, Stage, Match, Tests, Actions), customizable

2. **Search Scope:** Include notes/documents in search?
   - **Recommendation:** No for MVP (privacy + performance)

3. **Bulk Email Limit:** Max candidates per bulk email?
   - **Recommendation:** 100 (prevent spam)

---

## Acceptance Criteria Summary

✅ Table displays all candidates with pagination
✅ Search works across name, email, phone, CPF
✅ Filters work for stage, match, dates, tests, tags
✅ Active filters displayed as removable pills
✅ Sorting works on all sortable columns
✅ Bulk selection selects multiple candidates
✅ Bulk actions (email, stage change, tag, export) work
✅ Candidate detail page shows all 7 tabs
✅ Comparison view shows 2-4 candidates side-by-side
✅ Tags can be created, assigned, and filtered
✅ Export to Excel/CSV with customizable columns
✅ Filter presets can be saved and loaded
✅ Pagination shows correct page counts
✅ Performance: Table loads in ≤1 second for 1000 candidates
✅ Manual QA passes
✅ E2E tests cover search, filter, bulk actions, export

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 6-7 days
**Dependencies:**
- ✅ TanStack Table v8
- ✅ XLSX.js
- ⏳ All candidate data from previous PRDs
**Blocker Status:** 🚨 CRITICAL - Core HR workflow for candidate management
