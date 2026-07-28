# PRD-DEV-018: Pipeline de Recrutamento

## 1. Introduction/Overview

The Pipeline de Recrutamento (Recruitment Pipeline Management) system provides a comprehensive, organization-wide view of all recruitment activity across all job postings and stages. This is the strategic command center where HR managers monitor pipeline health, identify bottlenecks, track conversion rates, and optimize the recruitment process at scale.

**Problem it solves:** HR managers need visibility into the entire recruitment funnel to identify where candidates drop off, which stages take too long, which jobs are underperforming, and where to allocate resources. Without this system, recruitment is reactive rather than strategic, leading to slow hiring, poor candidate experience, and inefficient resource use.

**Goal:** Implement an analytics-driven pipeline dashboard that shows real-time recruitment metrics across all jobs, stage-by-stage conversion rates, bottleneck detection, SLA tracking, trend analysis, and actionable recommendations for pipeline optimization—enabling data-driven hiring decisions.

## 2. Goals

1. Display aggregate pipeline view across all active jobs
2. Show stage-by-stage conversion funnel with drop-off rates
3. Identify bottlenecks (stages where candidates get stuck)
4. Track time-to-hire and time-per-stage metrics
5. Monitor SLA compliance for each recruitment stage
6. Provide job-by-job pipeline comparison
7. Detect and alert on stalled candidates (inactive >7 days)
8. Show historical trends (week-over-week, month-over-month)
9. Generate automated pipeline health reports
10. Provide AI-powered optimization recommendations
11. Enable pipeline goal setting and tracking
12. Support custom pipeline stage configuration

## 3. User Stories

### Primary Flow
**As an** HR manager
**I want to** see an overview of all recruitment activity across all jobs
**So that** I can identify which stages need attention and where candidates are dropping off

**As an** HR director
**I want to** track time-to-hire for different job types
**So that** I can optimize our recruitment process and reduce time-to-fill

**As an** HR analyst
**I want to** see conversion rates between recruitment stages
**So that** I can identify which stages have the highest drop-off and need improvement

### Secondary Flow
**As an** HR manager
**I want to** receive alerts when candidates are inactive for >7 days at a stage
**So that** I can follow up and prevent candidate dropout

**As an** admin user
**I want to** compare pipeline performance across different job postings
**So that** I can understand which positions are easier/harder to fill

**As an** HR professional
**I want to** see AI-powered recommendations for improving pipeline flow
**So that** I can make data-driven process improvements

### Edge Cases
**As an** HR manager
**I want** the system to detect when a stage is taking 2x longer than average
**So that** I can investigate and resolve bottlenecks quickly

**As an** admin user
**I want to** see pipeline metrics split by job location or department
**So that** I can identify regional or departmental hiring challenges

**As an** HR analyst
**I want to** export pipeline data for executive presentations
**So that** I can demonstrate recruitment ROI to leadership

## 4. Functional Requirements

### FR-001: Pipeline Dashboard Overview
**URL:** `/admin/pipeline`

**Access Control:**
- `rh_basico`: Read-only access to pipeline view
- `rh_avancado`: Full access + can set SLA targets
- `admin`: Full access + can configure pipeline stages

**Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 Pipeline de Recrutamento                                   [⚙️ Config]  │
│  Período: [Últimos 30 dias ▾]  •  Vagas: [Todas ▾]  •  [📥 Exportar]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📈 Métricas Gerais                                                         │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐             │
│  │ Total        │ Tempo Médio  │ Taxa         │ Candidatos   │             │
│  │ Candidatos   │ Contratação  │ Aprovação    │ Ativos       │             │
│  │              │              │              │              │             │
│  │   342        │   18 dias    │   12%        │   156        │             │
│  │ +15% vs mês  │ -2 dias      │ +3%          │ 45% do total │             │
│  └──────────────┴──────────────┴──────────────┴──────────────┘             │
│                                                                             │
│  🔄 Funil de Conversão Geral                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Aplicação     ████████████████████████████████████ 342 (100%)      │   │
│  │               ↓ 89% conversão                                        │   │
│  │ Triagem       ███████████████████████████░░░░░░░░ 305 (89%)        │   │
│  │               ↓ 72% conversão                                        │   │
│  │ Big Five      ████████████████████░░░░░░░░░░░░░░░ 220 (64%)        │   │
│  │               ↓ 85% conversão                                        │   │
│  │ DISC          ██████████████████░░░░░░░░░░░░░░░░░ 187 (55%)        │   │
│  │               ↓ 68% conversão ⚠️ (alerta: <70%)                    │   │
│  │ Entrevista    ███████████░░░░░░░░░░░░░░░░░░░░░░░░ 127 (37%)        │   │
│  │ Online                                                               │   │
│  │               ↓ 90% conversão                                        │   │
│  │ Raven         ██████████░░░░░░░░░░░░░░░░░░░░░░░░ 114 (33%)        │   │
│  │               ↓ 75% conversão                                        │   │
│  │ Cultura       ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░  85 (25%)        │   │
│  │               ↓ 82% conversão                                        │   │
│  │ Entrevista    ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  70 (20%)        │   │
│  │ Presencial                                                           │   │
│  │               ↓ 60% conversão ⚠️ (alerta: <70%)                    │   │
│  │ Aprovado      ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  42 (12%)        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ⚠️ Alertas e Recomendações                                                │
│  • 23 candidatos inativos há >7 dias na etapa "DISC"                       │
│  • Taxa de conversão DISC→Entrevista (68%) abaixo da meta (70%)           │
│  • Tempo médio em "Entrevista Online" (12 dias) acima do SLA (7 dias)     │
│  [Ver Todas Recomendações]                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### FR-002: Funil de Conversão Detalhado
**Interactive Funnel Chart:**
- Click on stage to drill down into details
- Hover to see conversion % and absolute numbers
- Color-coding:
  - 🟢 Green: Conversion ≥ 70% (healthy)
  - 🟡 Yellow: Conversion 50-69% (needs attention)
  - 🔴 Red: Conversion < 50% (critical)

**Drill-Down Modal (click on stage):**
```
┌─────────────────────────────────────────────────────────────────┐
│  Etapa: DISC → Entrevista Online                               │
│  Taxa de Conversão: 68% (127/187) ⚠️                           │
├─────────────────────────────────────────────────────────────────┤
│  📊 Análise:                                                    │
│  • 127 candidatos avançaram (68%)                               │
│  • 60 candidatos rejeitados ou desistiram (32%)                 │
│  • Meta de conversão: 70% (2% abaixo)                           │
│                                                                 │
│  Motivos de Rejeição (dos 60):                                 │
│  • Perfil DISC incompatível: 35 (58%)                           │
│  • Desistência do candidato: 15 (25%)                           │
│  • Outro: 10 (17%)                                              │
│                                                                 │
│  💡 Recomendações:                                              │
│  1. Revisar critérios de aprovação DISC (muito restritivos?)   │
│  2. Melhorar comunicação pós-DISC (15 desistências)            │
│  3. Investigar os 35 rejeitados por perfil incompatível         │
│                                                                 │
│  [Ver Candidatos Rejeitados] [Exportar Dados]                  │
└─────────────────────────────────────────────────────────────────┘
```

### FR-003: Tempo por Etapa (Stage Duration)
**Metrics:**
```typescript
interface StageDuration {
  etapa: EtapaProcesso
  tempo_medio_dias: number
  tempo_mediano_dias: number
  tempo_minimo_dias: number
  tempo_maximo_dias: number
  sla_dias: number              // Target SLA
  candidatos_acima_sla: number  // Count above SLA
  percentual_dentro_sla: number // % meeting SLA
}
```

**Visual Display:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⏱️ Tempo Médio por Etapa                                       │
├─────────────────────────────────────────────────────────────────┤
│  Etapa                Médio   SLA    Dentro SLA   Status        │
│  ─────────────────────────────────────────────────────────────  │
│  Triagem              2 dias  3 dias    95%       🟢 Ótimo      │
│  Big Five             1 dia   2 dias    98%       🟢 Ótimo      │
│  DISC                 3 dias  5 dias    85%       🟢 Bom        │
│  Entrevista Online   12 dias  7 dias    42%       🔴 Crítico    │
│  Raven                2 dias  3 dias    90%       🟢 Ótimo      │
│  Cultura              5 dias  7 dias    78%       🟡 Atenção    │
│  Entrevista Pres.     8 dias  10 dias   88%       🟢 Bom        │
│                                                                 │
│  ⚠️ Alerta: Entrevista Online excedendo SLA em 58% dos casos   │
│  [Investigar] [Ajustar SLA]                                     │
└─────────────────────────────────────────────────────────────────┘
```

**SLA Configuration (admin only):**
```
┌─────────────────────────────────────────────┐
│  ⚙️ Configurar SLA por Etapa                │
├─────────────────────────────────────────────┤
│  Etapa              SLA (dias)              │
│  ───────────────────────────────────────    │
│  Triagem            [3    ] dias            │
│  Big Five           [2    ] dias            │
│  DISC               [5    ] dias            │
│  Entrevista Online  [7    ] dias            │
│  Raven              [3    ] dias            │
│  Cultura            [7    ] dias            │
│  Entrevista Pres.   [10   ] dias            │
│                                             │
│  [Restaurar Padrões] [Salvar Alterações]    │
└─────────────────────────────────────────────┘
```

### FR-004: Candidatos Inativos (Stalled Candidates)
**Detection Logic:**
```typescript
const stalled = await supabase
  .from('candidatos')
  .select(`
    *,
    vaga:vagas(titulo),
    tempo_na_etapa:candidatos_historico(
      data_evento
    )
  `)
  .eq('status_processo', 'em_andamento')
  .lt('ultima_atividade', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  .order('ultima_atividade', { ascending: true })
```

**Stalled Candidates Widget:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Candidatos Inativos (>7 dias)                       [Ver 23]│
├─────────────────────────────────────────────────────────────────┤
│  Candidato           Vaga          Etapa      Inativo há        │
│  ─────────────────────────────────────────────────────────────  │
│  João Silva          Dentista SP   DISC       14 dias 🔴        │
│  Maria Santos        Recepção RJ   Big Five   10 dias 🔴        │
│  Pedro Souza         Auxiliar BH   Entrev.    8 dias  🟡        │
│                                    Online                        │
│  [Enviar Lembretes] [Marcar como Desistente]                    │
│                                                                 │
│  💡 Ação Recomendada: Enviar email de acompanhamento para       │
│  candidatos inativos há >10 dias.                               │
└─────────────────────────────────────────────────────────────────┘
```

**Auto-Actions:**
- Email reminder after 7 days inactive
- Second reminder after 14 days
- Auto-mark as "desistente" after 30 days (optional, configurable)

### FR-005: Pipeline por Vaga (Job Comparison)
**Comparative View:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 Comparação de Pipeline por Vaga                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Vaga                    Aplicações  Taxa Aprov.  Tempo Médio  Aprovados   │
│  ──────────────────────────────────────────────────────────────────────────│
│  Dentista SP             145         15%          16 dias      22          │
│  Recepcionista RJ        89          10%          22 dias      9  🔴       │
│  Auxiliar Dentista BH    67          18%          14 dias      12          │
│  Gerente RH SP           41          5%           35 dias      2  🔴       │
│                                                                             │
│  🔴 Vagas com desempenho abaixo da média (≤8% aprovação ou ≥25 dias)       │
│  [Exportar Comparação]                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Drill-Down (click on job):**
Shows individual funnel for that job (same as FR-002 but scoped to job).

### FR-006: Tendências Históricas (Trends)
**Time Series Charts:**

**1. Aplicações ao Longo do Tempo:**
```
Candidaturas por Semana
│
│     ╱╲
│    ╱  ╲      ╱╲
│   ╱    ╲    ╱  ╲
│  ╱      ╲  ╱    ╲
│ ╱        ╲╱      ╲___
└───────────────────────────
 S1  S2  S3  S4  S5  S6
```

**2. Taxa de Conversão por Mês:**
```
Taxa de Aprovação Mensal
│
│ 15%─────────●
│             │╲
│ 12%────●────│ ●
│        │    │
│  9%────│────│
│        │    │
│  6%────●────│
│
└───────────────────────
  Jan  Fev  Mar  Abr
```

**3. Tempo de Contratação:**
```
Tempo Médio de Contratação (dias)
│
│ 25─────●
│        │╲
│ 20────│─●───●
│       │
│ 15────●─────│───●
│             │
│ 10──────────●
│
└───────────────────────
  Jan  Fev  Mar  Abr
```

**Trend Insights:**
- Show % change from previous period
- Highlight positive/negative trends
- Seasonal patterns (if data spans >1 year)

### FR-007: Análise de Bottlenecks
**Automated Bottleneck Detection:**

```typescript
interface Bottleneck {
  etapa: EtapaProcesso
  severity: 'high' | 'medium' | 'low'
  metrics: {
    baixa_conversao: boolean         // <70%
    tempo_acima_sla: boolean         // >SLA
    alta_taxa_desistencia: boolean   // >15% dropout
    candidatos_inativos: number      // Count >7 days
  }
  score: number  // 0-100, higher = worse
  recomendacoes: string[]
}
```

**Bottleneck Dashboard Section:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🚨 Gargalos Detectados                                         │
├─────────────────────────────────────────────────────────────────┤
│  1. Entrevista Online (Score: 85/100) 🔴 ALTO                  │
│     • Tempo médio (12 dias) 71% acima do SLA                    │
│     • 23 candidatos inativos há >7 dias                         │
│     • Taxa de agendamento: apenas 58%                           │
│                                                                 │
│     💡 Recomendações:                                           │
│     → Adicionar mais horários disponíveis para entrevistas      │
│     → Automatizar agendamento via Calendly/Google Calendar      │
│     → Enviar lembretes automáticos 48h antes da entrevista      │
│                                                                 │
│  2. DISC (Score: 62/100) 🟡 MÉDIO                              │
│     • Conversão para próxima etapa: 68% (meta: 70%)            │
│     • 18% dos candidatos desistem após DISC                     │
│                                                                 │
│     💡 Recomendações:                                           │
│     → Revisar critérios de aprovação (podem estar restritivos)  │
│     → Enviar feedback aos candidatos sobre perfil DISC          │
│     → Investigar motivos de desistência                         │
│                                                                 │
│  [Ver Análise Completa] [Ignorar] [Marcar como Resolvido]      │
└─────────────────────────────────────────────────────────────────┘
```

**Bottleneck Calculation:**
```typescript
function calculateBottleneckScore(etapa: EtapaProcesso): number {
  let score = 0

  // Low conversion (<70%)
  if (etapa.conversao < 0.7) {
    score += (0.7 - etapa.conversao) * 100
  }

  // Time above SLA
  if (etapa.tempo_medio > etapa.sla) {
    score += ((etapa.tempo_medio / etapa.sla) - 1) * 50
  }

  // High dropout rate (>15%)
  if (etapa.taxa_desistencia > 0.15) {
    score += (etapa.taxa_desistencia - 0.15) * 100
  }

  // Stalled candidates
  score += etapa.candidatos_inativos * 2

  return Math.min(100, Math.round(score))
}
```

### FR-008: Relatórios Automatizados
**Report Types:**

**1. Weekly Pipeline Report:**
- Sent every Monday at 9am to `rh_avancado` and `admin`
- Email subject: "Relatório Semanal do Pipeline - [Semana XX/2024]"
- Content:
  - Total applications this week
  - New approvals
  - Bottlenecks detected
  - Candidates needing follow-up
  - Week-over-week trends

**2. Monthly Performance Report:**
- Sent first day of each month
- Email subject: "Relatório Mensal de Recrutamento - [Mês/Ano]"
- Content:
  - Full funnel metrics
  - Time-to-hire averages
  - Job-by-job performance
  - Conversion rate trends
  - SLA compliance %
  - Top 3 recommendations

**3. Real-time Critical Alerts:**
- Sent immediately when triggered
- Triggers:
  - SLA compliance drops below 50% for any stage
  - >50 candidates inactive >7 days
  - Conversion rate drops >10% from previous period
  - Job receives 0 applications for 7+ days

**Report Generation:**
```typescript
async function generateWeeklyReport() {
  const data = await fetchPipelineMetrics({ period: 'last_7_days' })

  const report = {
    periodo: 'Semana 45/2024',
    metricas: {
      total_aplicacoes: data.total_applications,
      novos_aprovados: data.new_approvals,
      tempo_medio_contratacao: data.avg_time_to_hire,
      taxa_conversao_geral: data.overall_conversion
    },
    alertas: data.bottlenecks.filter(b => b.severity === 'high'),
    candidatos_atencao: data.stalled_candidates,
    tendencias: calculateTrends(data)
  }

  // Send via email (using PRD-DEV-015 system)
  await sendEmail({
    to: rhAvancadoUsers,
    template: 'weekly_pipeline_report',
    data: report
  })

  // Also save to database
  await supabase.from('relatorios_pipeline').insert([report])
}
```

### FR-009: AI-Powered Recommendations
**Integration with Claude AI (via N8N):**

**Recommendation Engine:**
```typescript
interface PipelineRecommendation {
  id: string
  tipo: 'conversao' | 'tempo' | 'sla' | 'desistencia' | 'outro'
  severidade: 'alta' | 'media' | 'baixa'
  titulo: string
  descricao: string
  impacto_estimado: string  // e.g., "+5% conversão", "-3 dias tempo médio"
  acoes_sugeridas: string[]
  prioridade: number  // 1-5
}
```

**AI Analysis Trigger:**
- Weekly automatic analysis via N8N webhook
- On-demand: "Gerar Recomendações IA" button

**N8N Workflow:**
```
1. Fetch Pipeline Data
   ↓
2. Format for Claude AI
   ↓
3. POST to Claude API with prompt:
   """
   Você é um especialista em recrutamento. Analise os seguintes dados
   de pipeline e forneça 5 recomendações acionáveis para melhorar:
   - Taxa de conversão
   - Tempo de contratação
   - Experiência do candidato

   Dados do Pipeline:
   {pipeline_metrics}

   Formato da resposta: JSON com estrutura PipelineRecommendation[]
   """
   ↓
4. Parse Claude Response
   ↓
5. Save to Supabase: recomendacoes_pipeline table
   ↓
6. Display in Dashboard
```

**Recommendations Display:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 Recomendações de IA (geradas em 04/11/2024)                │
├─────────────────────────────────────────────────────────────────┤
│  🔴 ALTA PRIORIDADE                                             │
│                                                                 │
│  1. Reduzir Tempo de Agendamento de Entrevistas Online         │
│     Impacto estimado: -5 dias no tempo médio                    │
│                                                                 │
│     Análise: 42% dos candidatos aguardam >7 dias para          │
│     entrevista online devido a poucos horários disponíveis.     │
│                                                                 │
│     Ações sugeridas:                                            │
│     → Aumentar horários de entrevista de 10h-18h para 8h-20h   │
│     → Adicionar entrevistadores: atualmente 2, recomendar 4     │
│     → Implementar auto-agendamento via Calendly                 │
│                                                                 │
│     [Marcar como Implementada] [Ignorar]                        │
│                                                                 │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│  🟡 MÉDIA PRIORIDADE                                            │
│                                                                 │
│  2. Revisar Critérios de Aprovação DISC                        │
│     Impacto estimado: +8% conversão DISC→Entrevista            │
│                                                                 │
│     [Ver Detalhes]                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### FR-010: Metas e Objetivos (Goals)
**Goal Setting:**
```
┌─────────────────────────────────────────────────────┐
│  🎯 Metas do Pipeline                               │
├─────────────────────────────────────────────────────┤
│  Meta                        Atual   Meta   Status  │
│  ───────────────────────────────────────────────    │
│  Taxa de Conversão Geral     12%    15%    🟡 80%  │
│  Tempo Médio de Contratação  18d    15d    🔴 83%  │
│  SLA Compliance Geral        78%    90%    🟡 87%  │
│  Candidatos Aprovados/Mês    42     50     🟡 84%  │
│                                                     │
│  [Editar Metas] [Histórico de Metas]                │
└─────────────────────────────────────────────────────┘
```

**Goal Tracking:**
- Progress bars show % of goal achieved
- Color coding: 🟢 ≥100%, 🟡 80-99%, 🔴 <80%
- Historical goal tracking (see past months)

**Database Schema:**
```sql
CREATE TABLE metas_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE,
  taxa_conversao_meta DECIMAL,
  tempo_contratacao_dias_meta INTEGER,
  sla_compliance_meta DECIMAL,
  aprovacoes_mensais_meta INTEGER,
  criado_por UUID REFERENCES usuarios_rh(id),
  criado_em TIMESTAMP DEFAULT NOW()
);
```

### FR-011: Export e Compartilhamento
**Export Options:**

**1. Export to Excel:**
- All pipeline metrics
- Funnel data per stage
- Job-by-job comparison
- Trend charts (as images embedded)

**2. Export to PDF (Executive Report):**
- Professional formatting
- Charts and graphs
- Key insights highlighted
- Beauty Smile branding

**3. Scheduled Reports:**
- Configure email delivery schedule
- Select recipients
- Choose report type (weekly/monthly)

**Share Link:**
- Generate shareable read-only link
- Expires after 7 days
- No authentication required (for external stakeholders)
- Example: `https://beautysmile.com.br/pipeline/share/abc123xyz`

### FR-012: Pipeline Configuration
**Admin Settings:**

**1. Stage Configuration:**
```
┌─────────────────────────────────────────────────────┐
│  ⚙️ Configurar Etapas do Pipeline                   │
├─────────────────────────────────────────────────────┤
│  Etapa          Ordem  Ativa  SLA   Obrigatória     │
│  ─────────────────────────────────────────────────  │
│  Triagem        1      ✓      3d    ✓               │
│  Big Five       2      ✓      2d    ✓               │
│  DISC           3      ✓      5d    ✓               │
│  Entrevista     4      ✓      7d    ✓               │
│  Online                                             │
│  Raven          5      ✓      3d    ✓               │
│  Cultura        6      ✓      7d    ○               │
│  Entrevista     7      ✓      10d   ✓               │
│  Presencial                                         │
│                                                     │
│  [+ Adicionar Etapa Customizada]                    │
│  [Salvar Alterações]                                │
└─────────────────────────────────────────────────────┘
```

**2. Notification Settings:**
- Email frequency (daily/weekly/monthly)
- Alert thresholds (e.g., alert when >X candidates inactive)
- Recipients per alert type

**3. Integration Settings:**
- N8N webhook URLs
- Claude AI API key
- Email service configuration

### FR-013: Mobile Dashboard
**Responsive Design:**

**Mobile Metrics View:**
```
┌──────────────────────────────┐
│  📊 Pipeline                 │
│  [Últimos 30 dias ▾]         │
├──────────────────────────────┤
│  Total Candidatos            │
│  342  (+15% vs mês)          │
│                              │
│  Tempo Médio Contratação     │
│  18 dias  (-2 dias)          │
│                              │
│  Taxa de Aprovação           │
│  12%  (+3%)                  │
├──────────────────────────────┤
│  🔄 Funil                    │
│  [Ver Gráfico ▾]             │
│                              │
│  ⚠️ Alertas (3)              │
│  • 23 candidatos inativos    │
│  • DISC conversão baixa      │
│  • Entrevist. acima SLA      │
│                              │
│  [Ver Pipeline Completo]     │
└──────────────────────────────┘
```

**Touch Gestures:**
- Swipe left/right to navigate between time periods
- Tap chart to expand full-screen
- Pull to refresh data

## 5. Non-Goals (Out of Scope)

1. **Predictive hiring analytics** - No ML predictions for MVP
2. **Candidate scoring algorithms** - Manual evaluation only
3. **Integration with external ATS** - Standalone system
4. **Advanced workforce planning** - Recruitment only, not HR planning
5. **Salary benchmarking tools** - Pipeline metrics only
6. **Automated interview scheduling** - Manual for MVP
7. **Video interview integration** - External tools only
8. **Reference check tracking** - Out of pipeline scope
9. **Offer management** - Post-pipeline activity
10. **Multi-company/multi-tenant** - Single organization only

## 6. Design Considerations

**Visual Design:**
- Dashboard-first layout with at-a-glance metrics
- Color-coded alerts (🟢🟡🔴) for quick status assessment
- Clean, professional charts (Recharts library)
- Minimalist card-based design

**Accessibility:**
- All charts have text alternatives
- Keyboard navigation for all interactions
- ARIA labels for metrics and alerts
- High contrast mode support

**Performance:**
- Cache pipeline data (React Query, 5-minute stale time)
- Lazy load historical data
- Paginate large data sets
- Web workers for complex calculations

## 7. Technical Considerations

**State Management:**
```typescript
interface PipelineState {
  metrics: PipelineMetrics
  funnel: FunnelStage[]
  bottlenecks: Bottleneck[]
  stalledCandidates: Candidato[]
  trends: TrendData[]
  goals: PipelineMeta[]
  recommendations: PipelineRecommendation[]
  filters: {
    periodo: '7d' | '30d' | '90d' | 'custom'
    vagas: string[]  // Job IDs, empty = all
  }
  isLoading: boolean

  fetchPipeline: () => Promise<void>
  generateReport: (type: string) => Promise<void>
  updateGoals: (goals: PipelineMeta) => Promise<void>
}
```

**Database Queries:**

**Funnel Metrics:**
```typescript
const funnelData = await supabase.rpc('calcular_funil_pipeline', {
  data_inicio: startDate,
  data_fim: endDate,
  vaga_ids: filters.vagas
})

// Returns:
// [
//   { etapa: 'triagem', total: 342, conversao: 0.89 },
//   { etapa: 'big_five', total: 305, conversao: 0.72 },
//   ...
// ]
```

**Bottleneck Detection:**
```typescript
const bottlenecks = await supabase.rpc('detectar_gargalos', {
  threshold_conversao: 0.7,
  threshold_sla: 1.0  // 100% of SLA
})
```

**Trend Analysis:**
```typescript
const trends = await supabase.rpc('calcular_tendencias', {
  metrica: 'taxa_conversao',  // or 'tempo_contratacao', 'aplicacoes'
  periodo: 'semanal',          // or 'mensal'
  ultimos_n_periodos: 12
})
```

**Real-time Updates:**
```typescript
const subscription = supabase
  .channel('pipeline_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'candidatos'
  }, () => {
    // Refresh pipeline metrics
    queryClient.invalidateQueries(['pipeline'])
  })
  .subscribe()
```

**Scheduled Jobs (Supabase Edge Functions + pg_cron):**
```sql
-- Weekly report generation
SELECT cron.schedule(
  'gerar-relatorio-semanal',
  '0 9 * * 1',  -- Every Monday at 9am
  $$
    SELECT net.http_post(
      url := 'https://fernandocosta.app.n8n.cloud/webhook/pipeline-weekly-report',
      body := jsonb_build_object('trigger', 'cron')
    );
  $$
);
```

## 8. Success Metrics

**Primary:**
1. Dashboard load time: ≤ 2 seconds
2. Report generation time: ≤ 10 seconds
3. Weekly report email open rate: ≥ 60%
4. Bottleneck detection accuracy: ≥ 80%

**Secondary:**
1. AI recommendation acceptance rate: ≥ 30%
2. Goal achievement rate: ≥ 70% of goals met quarterly
3. Export usage: Avg 5 exports per week
4. Mobile usage: ≥ 25% of dashboard views on mobile

**Business Impact:**
1. Reduce time-to-hire by 15% within 3 months
2. Increase overall conversion rate by 5% within 6 months
3. Reduce candidates inactive >7 days by 50%
4. Achieve 85%+ SLA compliance across all stages

## 9. Open Questions

1. **AI Recommendations:**
   - **Question:** Use Claude AI or build simpler rule-based system for MVP?
   - **Recommendation:** Start with rule-based, add Claude AI in Phase 2

2. **Automated Actions:**
   - **Question:** Auto-send reminders to inactive candidates or require manual approval?
   - **Recommendation:** Auto-send after 7 days, but allow admin to disable

3. **Custom Stages:**
   - **Question:** Allow HR to add custom pipeline stages or fixed 7 stages?
   - **Recommendation:** Fixed for MVP (complexity), custom in Phase 2

4. **Historical Data:**
   - **Question:** How far back should trend analysis go?
   - **Recommendation:** 12 months rolling window, archive older data

---

## Acceptance Criteria Summary

✅ Pipeline dashboard shows aggregate funnel across all jobs
✅ Conversion rates displayed per stage with color coding (🟢🟡🔴)
✅ Time-per-stage metrics compared against SLA targets
✅ Bottleneck detection identifies stages needing attention
✅ Stalled candidates widget shows inactive >7 days
✅ Job-by-job comparison table shows performance differences
✅ Historical trends show week/month-over-week changes
✅ Weekly automated reports sent via email
✅ AI-powered recommendations generated and displayed
✅ Goals can be set and progress tracked
✅ Export to Excel/PDF includes all pipeline data
✅ Shareable read-only links work without auth
✅ Mobile-responsive dashboard with key metrics
✅ SLA configuration works for all stages
✅ Real-time updates when candidates change stages
✅ Manual QA passes with 0 critical bugs
✅ E2E test covers dashboard → drill-down → export flow

---

**Target Audience:** Junior Frontend Developer + Junior Backend Developer
**Estimated Effort:** 8-10 days
**Dependencies:**
- ✅ All candidate and job tables
- ✅ Test results tables (Big Five, DISC, Raven)
- ✅ `candidatos_historico` table for timeline data
- ✅ `relatorios_pipeline` table for storing reports
- ✅ `metas_pipeline` table for goals
- ✅ `recomendacoes_pipeline` table for AI suggestions
- ✅ PostgreSQL stored procedures for funnel/trend calculations
- ✅ Supabase Edge Functions for scheduled reports
- ✅ N8N webhook integration
- ✅ Claude AI API (optional for MVP)
- ✅ Recharts for data visualization
- ✅ jsPDF for PDF export
- ✅ XLSX.js for Excel export
**Blocker Status:** 🟡 MEDIUM - Enhances efficiency but not blocking core recruitment
