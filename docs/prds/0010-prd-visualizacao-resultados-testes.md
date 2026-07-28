# PRD-DEV-010: Visualização de Resultados dos Testes

## 1. Introduction/Overview

The Visualização de Resultados dos Testes provides HR professionals and administrators with comprehensive dashboards to view, analyze, and compare psychometric test results (Big Five, DISC, Raven) across candidates. This feature transforms raw test data into actionable insights for hiring decisions.

**Problem it solves:** HR teams receive raw test scores but lack tools to interpret them, compare candidates, identify patterns, or match results to job requirements. Manual analysis is time-consuming and prone to bias. This feature provides visual analytics and AI-generated insights.

**Goal:** Implement interactive dashboards that display individual candidate test results, comparative analytics across multiple candidates, role-specific benchmarks, AI-generated personality/behavioral profiles, and exportable reports for hiring decisions.

## 2. Goals

1. Display individual candidate test results in visually intuitive formats (charts, graphs, radar plots)
2. Show AI-generated personality and behavioral profile summaries from N8N analysis
3. Provide side-by-side comparison of up to 4 candidates
4. Enable filtering and sorting candidates by test scores and dimensions
5. Display role-specific benchmarks and ideal profiles
6. Generate downloadable PDF reports with test results and recommendations
7. Show test completion timestamps and validity indicators
8. Provide drill-down capability to view specific question responses
9. Support mobile-responsive design for on-the-go review
10. Track and display analytics trends (average scores, distribution over time)

## 3. User Stories

### Primary Flow - HR Perspective
**As an** HR professional reviewing a candidate
**I want to** see all psychometric test results on a single dashboard
**So that** I can quickly assess their personality, behavior, and cognitive abilities

**As an** HR manager comparing candidates
**I want to** view multiple candidates' test results side-by-side
**So that** I can identify the best fit for a specific role

**As an** HR professional
**I want to** see AI-generated profile summaries
**So that** I save time interpreting raw scores and understand key traits

### Secondary Flow - Analysis & Reporting
**As an** HR analyst
**I want to** export test results as PDF reports
**So that** I can share insights with hiring managers and keep records

**As an** HR manager
**I want to** see how a candidate's scores compare to role benchmarks
**So that** I can objectively assess fit for technical vs. interpersonal roles

**As a** recruiter
**I want** to filter candidates by minimum score thresholds
**So that** I can quickly shortlist qualified applicants

### Candidate Perspective (Limited)
**As a** candidate
**I want to** see basic test completion confirmations in my dashboard
**So that** I know my tests were submitted successfully

**As a** candidate (post-hiring)
**I want to** access my personality profile summary
**So that** I can understand my strengths for personal development

## 4. Functional Requirements

### FR-001: Individual Candidate Results Page
**URL:** `/admin/candidatos/:id/resultados`

**Page Layout:**

**Header:**
- Candidate name and photo
- Application date and current stage
- Overall assessment score (composite of all tests)
- Quick actions: Export PDF, Send to hiring manager, Flag for review

**Tabs:**
1. **Visão Geral** - Summary of all tests
2. **Big Five** - Personality results
3. **DISC** - Behavioral profile
4. **Raven** - Cognitive assessment
5. **Análise de IA** - AI-generated insights

### FR-002: Visão Geral Tab
Display summary cards for each test:

**Big Five Card:**
```
┌─────────────────────────────────────────┐
│ 🧠 Big Five - Personalidade             │
│ Concluído: 15/01/2025 às 14:32          │
│                                         │
│ Radar Chart (5 dimensions):             │
│     Abertura:           75/100          │
│     Conscienciosidade:  68/100          │
│     Extroversão:        82/100          │
│     Amabilidade:        71/100          │
│     Neuroticismo:       34/100 (baixo)  │
│                                         │
│ Perfil: Extrovertido e Criativo        │
│ [Ver detalhes]                          │
└─────────────────────────────────────────┘
```

**DISC Card:**
```
┌─────────────────────────────────────────┐
│ 🎯 DISC - Comportamento                 │
│ Concluído: 15/01/2025 às 15:10          │
│                                         │
│ Bar Chart (4 dimensions):               │
│ D (Dominância):        ████████ 68      │
│ I (Influência):        ████████████ 85  │
│ S (Estabilidade):      ██████ 52        │
│ C (Conformidade):      ████ 41          │
│                                         │
│ Perfil: ID (Influenciador Dominante)    │
│ [Ver detalhes]                          │
└─────────────────────────────────────────┘
```

**Raven Card:**
```
┌─────────────────────────────────────────┐
│ 🧩 Raven - Raciocínio Lógico            │
│ Concluído: 16/01/2025 às 10:45          │
│                                         │
│ Pontuação: 42/60 (70%)                  │
│ Percentil: 68º (acima da média)         │
│ Classificação: Média Alta               │
│                                         │
│ Desempenho por conjunto:                │
│ A: 12/12  B: 10/12  C: 8/12             │
│ D: 6/12   E: 6/12                       │
│                                         │
│ Tempo: 38 minutos                       │
│ [Ver detalhes]                          │
└─────────────────────────────────────────┘
```

### FR-003: Big Five Tab (Detailed View)
**Radar Chart:**
- 5-axis radar showing each dimension (0-100 scale)
- Color-coded: Green for high, yellow for medium, red for low
- Hover shows exact score + percentile

**Dimension Breakdown:**
Each dimension shows:
- Score (0-100)
- Percentile (vs. population norm)
- Description: "Alta Abertura indica criatividade, curiosidade e gosto por novidades"
- Job fit: "Ideal para: Criativo, Inovação, Design"

**Interpretation Guide:**
```
Abertura a Experiências (75/100 - Alta)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Descrição:
Esta pessoa é criativa, curiosa e aberta a novas ideias.
Gosta de aprender coisas novas e explorar conceitos abstratos.

Características:
✓ Imaginativo e criativo
✓ Aprecia arte e cultura
✓ Intelectualmente curioso
✓ Gosta de desafios mentais

Adequação para Funções:
• Alto fit: Design, Marketing, Inovação
• Médio fit: Vendas, Atendimento
• Baixo fit: Trabalho repetitivo

Dicas de Gestão:
• Ofereça projetos variados
• Incentive ideias inovadoras
• Permita autonomia criativa
```

### FR-004: DISC Tab (Detailed View)
**4-Bar Chart:**
- Horizontal bars for D, I, S, C (0-100)
- Color-coded: D=Red, I=Yellow, S=Green, C=Blue
- Show primary and secondary styles clearly

**Behavioral Profile:**
```
Perfil DISC: ID (Influenciador Dominante)

Estilo Primário: I - Influência (85/100)
Estilo Secundário: D - Dominância (68/100)

Características do perfil ID:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Comunicativo e persuasivo
• Orientado a resultados
• Energético e entusiástico
• Gosta de liderar e influenciar outros
• Pode ser impulsivo e impaciente

Pontos Fortes:
✓ Excelente em vendas e negociações
✓ Motiva e inspira equipes
✓ Toma decisões rapidamente
✓ Boa habilidade de networking

Áreas de Desenvolvimento:
⚠ Pode ignorar detalhes importantes
⚠ Tendência a falar mais que ouvir
⚠ Pode ser visto como agressivo

Funções Recomendadas:
• Vendas (alto fit)
• Gerência de equipes
• Relações públicas
• Desenvolvimento de negócios

Como trabalhar com este perfil:
• Dê espaço para expressão e criatividade
• Reconheça conquistas publicamente
• Forneça metas desafiadoras
• Evite microgerenciamento
```

### FR-005: Raven Tab (Detailed View)
**Score Summary:**
- Large display: "42/60 (70%)"
- Percentile: "68º percentil - Acima da Média"
- Classification: Badge with color

**Set-by-Set Breakdown:**
```
Desempenho por Conjunto

Conjunto A (Básico - Padrões Simples)
████████████ 12/12 (100%) ✓
Tempo médio: 18s por questão

Conjunto B (Intermediário - Padrões Visuais)
██████████░░ 10/12 (83%)
Tempo médio: 32s por questão

Conjunto C (Avançado - Raciocínio Abstrato)
████████░░░░ 8/12 (67%)
Tempo médio: 48s por questão

Conjunto D (Difícil - Lógica Complexa)
██████░░░░░░ 6/12 (50%)
Tempo médio: 75s por questão

Conjunto E (Muito Difícil - Raciocínio Avançado)
████░░░░░░░░ 6/12 (50%)
Tempo médio: 82s por questão
```

**Time Analysis:**
- Total time: 38 minutes
- Avg time per question: 38s
- Fastest question: 8s (Set A, Q1)
- Slowest question: 156s (Set E, Q60)

**Cognitive Profile:**
```
Perfil Cognitivo

Raciocínio Visual: ██████████░ Alto
Identificou padrões visuais rapidamente (Sets A-B)

Raciocínio Abstrato: ████████░░░ Médio-Alto
Bom desempenho em padrões abstratos (Set C)

Lógica Complexa: ██████░░░░░ Médio
Desafios em problemas multi-etapas (Sets D-E)

Adequação para Funções:
• Análise de dados: Médio-Alto fit
• Programação: Médio fit
• Resolução de problemas: Alto fit
• Estratégia: Médio-Alto fit
```

### FR-006: Análise de IA Tab
Display AI-generated insights from N8N workflows:

**AI Summary Card:**
```
┌─────────────────────────────────────────┐
│ 🤖 Análise de IA - Claude 3.5           │
│ Gerado em: 16/01/2025 às 11:00          │
│                                         │
│ Perfil Geral:                           │
│ João é um profissional extrovertido e   │
│ criativo com forte orientação a         │
│ resultados. Seu perfil ID (DISC)        │
│ combinado com alta Abertura (Big Five)  │
│ sugere excelente fit para funções de    │
│ vendas consultivas e desenvolvimento    │
│ de negócios. Raciocínio lógico acima    │
│ da média permite lidar com problemas    │
│ complexos.                              │
│                                         │
│ Recomendação: APROVAR para Vendas       │
│ Confiança: 87%                          │
└─────────────────────────────────────────┘
```

**Detailed AI Insights:**
```
Análise Detalhada por IA

Compatibilidade com Vaga: Assistente de Vendas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Match Score: 87/100 (Excelente)

Pontos Fortes para Esta Função:
✓ Alta Extroversão (82) - Ótimo para interação com clientes
✓ Perfil DISC ID - Natural para persuasão e vendas
✓ Alta Influência (85) - Capacidade de convencer e motivar
✓ Raciocínio lógico adequado (68º percentil) - Resolve problemas de clientes

Pontos de Atenção:
⚠ Baixa Conscienciosidade (68) - Pode precisar de suporte para organização
⚠ Alta Dominância (68) - Treine para equilibrar assertividade com empatia
⚠ Desempenho menor em lógica complexa (Sets D-E) - Pode ter dificuldade com produtos muito técnicos

Recomendações de Onboarding:
• Forneça CRM estruturado para compensar menor organização
• Treinamento em escuta ativa (balanço com Influência alta)
• Mentoria em produtos técnicos se aplicável
• Ambiente com metas claras e reconhecimento frequente

Fit Cultural:
✓ Alta energia e entusiasmo (Extroversão 82)
✓ Colaborativo e sociável (Amabilidade 71)
✓ Adapta-se bem a mudanças (Abertura 75)

Risco de Turnover: Baixo
Probabilidade de Sucesso: 85%
```

### FR-007: Candidate Comparison View
**URL:** `/admin/candidatos/comparar?ids=123,456,789,101`

**Layout:**
```
Comparação de Candidatos (Máximo 4)

┌─────────┬─────────┬─────────┬─────────┐
│ João    │ Maria   │ Pedro   │ Ana     │
│ Silva   │ Santos  │ Costa   │ Lima    │
├─────────┼─────────┼─────────┼─────────┤
│ Big Five Radar Charts lado a lado      │
├─────────┼─────────┼─────────┼─────────┤
│ DISC Bars lado a lado                  │
├─────────┼─────────┼─────────┼─────────┤
│ Raven:  │ Raven:  │ Raven:  │ Raven:  │
│ 42/60   │ 51/60   │ 38/60   │55/60   │
│ 68º %   │ 82º %   │ 58º %   │ 91º %   │
├─────────┼─────────┼─────────┼─────────┤
│ Match:  │ Match:  │ Match:  │ Match:  │
│ 87%     │ 65%     │ 72%     │ 91%     │
└─────────┴─────────┴─────────┴─────────┘

Classificação por Match:
1. Ana Lima (91%) - Recomendado
2. João Silva (87%) - Recomendado
3. Pedro Costa (72%) - Adequado
4. Maria Santos (65%) - Reserva

[Exportar comparação] [Agendar entrevistas]
```

### FR-008: Role Benchmarks
**URL:** `/admin/vagas/:id/benchmark`

**Display ideal profile for a role:**
```
Vaga: Assistente de Vendas - Perfil Ideal

Big Five Ideal:
Abertura:          60-80 (Criativo mas prático)
Conscienciosidade: 50-70 (Organizado mas flexível)
Extroversão:       70-90 (Muito sociável)
Amabilidade:       60-80 (Empático e cooperativo)
Neuroticismo:      20-40 (Estável emocionalmente)

DISC Ideal:
Perfis recomendados: ID, DI, IS, SI
D: 50-80
I: 70-90 (Essencial)
S: 40-70
C: 30-60

Raven Mínimo:
Percentil ≥ 40º (Raciocínio médio adequado)

Candidatos que atendem critérios: 3 de 12
[Ver candidatos compatíveis]
```

### FR-009: Analytics Dashboard
**URL:** `/admin/analytics/testes`

**Aggregate Statistics:**
```
Estatísticas Gerais - Últimos 30 dias

Total de testes realizados:
Big Five: 145 | DISC: 142 | Raven: 138

Médias de pontuação:
Big Five (Abertura):      58.3/100
Big Five (Extroversão):   62.1/100
DISC (Influência):        55.7/100
Raven (Pontuação bruta):  36.8/60 (61%)

Taxa de conclusão:
Big Five: 87% | DISC: 92% | Raven: 82%

Tempo médio:
Big Five: 24 min | DISC: 13 min | Raven: 41 min

Gráficos:
• Distribuição de scores (histograma)
• Evolução temporal (line chart)
• Perfis DISC mais comuns (pie chart)
• Correlação Raven x aprovação (scatter plot)
```

### FR-010: PDF Export
**Generate downloadable PDF report:**

**Report Sections:**
1. **Capa:** Candidate name, photo, date
2. **Sumário Executivo:** AI summary + recommendation
3. **Big Five:** Radar chart + dimension descriptions
4. **DISC:** Bar chart + behavioral profile
5. **Raven:** Score, percentile, set breakdown
6. **Análise de Match:** Compatibility with role
7. **Recomendações:** Onboarding tips, training needs

**PDF Generation:**
```typescript
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

async function generatePDF(candidato: Candidato, resultados: AllResults) {
  const pdf = new jsPDF()

  // Page 1: Cover
  pdf.text(`Relatório de Testes Psicométricos`, 20, 20)
  pdf.text(`Candidato: ${candidato.nome_completo}`, 20, 30)
  pdf.text(`Data: ${new Date().toLocaleDateString()}`, 20, 40)

  // Page 2: Big Five Chart
  pdf.addPage()
  const radarChart = document.getElementById('big-five-radar')
  const canvas = await html2canvas(radarChart)
  const imgData = canvas.toDataURL('image/png')
  pdf.addImage(imgData, 'PNG', 15, 40, 180, 160)

  // ... more pages

  pdf.save(`${candidato.nome_completo}-testes-psicometricos.pdf`)
}
```

## 5. Non-Goals (Out of Scope)

1. **Candidate access to detailed results** - Basic confirmation only
2. **Real-time test taking monitoring** - Results only after completion
3. **Manual score editing** - Results are read-only
4. **Custom benchmark creation** - Use predefined role templates
5. **Multi-company comparison** - Single company analytics only
6. **Historical trend analysis (>6 months)** - MVP focuses on current data
7. **Integration with external ATS** - Standalone for MVP
8. **Video interview analysis** - Text/data only
9. **Personality-based team recommendations** - Individual assessment only
10. **Automated rejection emails** - Manual HR decision required

## 6. Design Considerations

**Visual Hierarchy:**
- Most important info (AI summary, match score) at top
- Charts prominently displayed (large, colorful)
- Supporting details below (time, percentiles, etc.)

**Color Coding:**
- Consistent across tests: Green=Good, Yellow=Medium, Red=Low
- DISC colors: D=Red, I=Yellow, S=Green, C=Blue
- Big Five: Use color gradient (cool to warm)

**Accessibility:**
- All charts have text equivalents
- Color-blind safe palettes
- Keyboard navigation for all interactive elements

**Component Library:**
- shadcn/ui: Card, Tabs, Table
- Recharts: Radar, Bar, Line charts
- React-PDF: PDF generation

## 7. Technical Considerations

### Frontend Stack
- React + TypeScript
- Recharts for all visualizations
- jsPDF for PDF export
- TanStack Table for candidate lists

### API Queries
**Fetch All Results for Candidate:**
```typescript
const { data } = await supabase
  .from('candidatos')
  .select(`
    *,
    resultados_big_five(*),
    resultados_disc(*),
    resultados_raven(*),
    analise_ia(*)
  `)
  .eq('id', candidatoId)
  .single()
```

**Fetch Comparative Data:**
```typescript
const { data } = await supabase
  .from('candidatos')
  .select(`
    id,
    nome_completo,
    resultados_big_five(*),
    resultados_disc(*),
    resultados_raven(*)
  `)
  .in('id', [123, 456, 789])
```

### Caching Strategy
- Cache individual results for 5 minutes
- Cache analytics for 1 hour
- Invalidate on new test completion

## 8. Success Metrics

**Primary:**
1. HR uses results view ≥3 times per candidate
2. PDF export used for ≥40% of candidates
3. Comparison view used when ≥3 candidates for role

**Secondary:**
1. Time to hiring decision ↓20% (faster with visual insights)
2. HR satisfaction with test interpretation ≥4.5/5
3. Match score correlates with actual job performance (validate over time)

## 9. Open Questions

1. **Candidate Results Access:** Show limited results to candidates post-hire?
   - **Recommendation:** Yes, personality summary only (for self-development)

2. **Benchmark Source:** Use industry standards or create custom?
   - **Recommendation:** Start with HR input, refine with data over time

3. **AI Analysis Frequency:** Re-run analysis when new data available?
   - **Recommendation:** Yes, trigger on test completion + weekly batch

---

## Acceptance Criteria Summary

✅ Individual results page shows all 3 tests with charts
✅ Big Five radar chart displays all 5 dimensions
✅ DISC bar chart shows 4 dimensions with color coding
✅ Raven displays score, percentile, and set breakdown
✅ AI analysis tab shows generated insights
✅ Comparison view supports up to 4 candidates side-by-side
✅ PDF export includes all tests + AI summary
✅ Analytics dashboard shows aggregate statistics
✅ Role benchmarks display ideal profiles
✅ All visualizations are responsive
✅ HR can filter/sort candidates by scores
✅ Manual QA passes
✅ E2E tests cover viewing and exporting results

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 4-5 days
**Dependencies:**
- ⏳ PRD-DEV-007, 008, 009 (all tests completed)
- ⏳ PRD-DEV-011 (N8N integration for AI analysis)
- ✅ Recharts library
- ✅ jsPDF library
**Blocker Status:** 🟡 HIGH PRIORITY - Required for HR decision-making
