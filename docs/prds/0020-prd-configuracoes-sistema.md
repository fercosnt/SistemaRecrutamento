# PRD-DEV-020: Configurações do Sistema

## 1. Introduction/Overview

The Configurações do Sistema (System Settings) provides a centralized administration panel where admin users can configure organization-wide settings, manage users and permissions, customize email templates, configure integrations, and monitor system health. This is the control center for all system-level configurations that affect the entire recruitment platform.

**Problem it solves:** Without centralized settings, admins must hard-code configurations, manually manage users in the database, and lack visibility into system health and usage. This creates maintenance overhead, security risks, and inability to quickly adapt the system to changing business needs.

**Goal:** Implement a comprehensive admin settings interface where administrators can configure all aspects of the recruitment system, manage users and permissions, customize workflows, integrate external services, monitor system activity, and ensure LGPD compliance—all through an intuitive web interface without touching code or database directly.

## 2. Goals

1. Provide organization-wide settings (company name, logo, contact info)
2. Enable user management (add/edit/delete HR users with role assignment)
3. Configure role-based permissions (customize what each role can do)
4. Manage email templates with variable placeholders
5. Configure recruitment pipeline stages and SLA targets
6. Set up integrations (N8N webhooks, Claude AI, email service)
7. Configure psychometric tests (question banks, scoring rules)
8. Manage notification settings (email frequency, alert thresholds)
9. View audit logs and system activity
10. Export system data and generate backup files
11. Configure LGPD compliance settings
12. Monitor system health and performance metrics

## 3. User Stories

### Primary Flow
**As an** admin user
**I want to** add new HR users and assign them roles
**So that** the HR team can access the system with appropriate permissions

**As an** admin user
**I want to** customize email templates
**So that** our communications match our brand voice and include relevant information

**As an** admin user
**I want to** configure pipeline stages and SLA targets
**So that** we can track performance against our hiring goals

### Secondary Flow
**As an** admin user
**I want to** view all system activity and audit logs
**So that** I can monitor usage and ensure LGPD compliance

**As an** admin user
**I want to** configure N8N webhook URLs
**So that** test results trigger AI analysis automatically

**As an** admin user
**I want to** export all system data
**So that** I can create backups and comply with data portability requirements

### Edge Cases
**As an** admin user
**I want** the system to prevent me from deleting my own admin account
**So that** the system always has at least one administrator

**As an** admin user
**I want to** receive alerts when system errors occur
**So that** I can respond quickly to technical issues

**As an** admin user
**I want** changes to critical settings to require confirmation
**So that** accidental changes don't disrupt recruitment processes

## 4. Functional Requirements

### FR-001: Settings Page Access
**URL:** `/admin/configuracoes`

**Access Control:**
- Only `admin` role can access
- Redirect to dashboard if insufficient permissions
- Show permission denied message

**Page Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️ Configurações do Sistema                                    │
├─────────────────────────────────────────────────────────────────┤
│  Navegação:                                                     │
│  [Organização] [Usuários] [Permissões] [Emails]                │
│  [Pipeline] [Integrações] [Testes] [Notificações]              │
│  [Auditoria] [LGPD] [Sistema]                                  │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  [Content area based on selected tab]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### FR-002: Tab 1 - Organização
**Organization Settings:**

```typescript
interface ConfiguracoesOrganizacao {
  nome_empresa: string
  logo_url: string
  site_url: string
  email_contato: string
  telefone_contato: string

  // Social media
  linkedin_url?: string
  instagram_url?: string
  facebook_url?: string

  // Address
  endereco_completo: string
  cep: string
  cidade: string
  estado: string
  pais: string

  // Branding
  cor_primaria: string      // Hex color
  cor_secundaria: string
  cor_acento: string
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🏢 Dados da Organização                                        │
├─────────────────────────────────────────────────────────────────┤
│  Logo da Empresa                                                │
│  ┌──────────┐                                                   │
│  │          │                                                   │
│  │   LOGO   │  [Upload Nova Logo]  (PNG/JPG, max 2MB)          │
│  │          │                                                   │
│  └──────────┘                                                   │
│                                                                 │
│  Nome da Empresa *                                              │
│  [Beauty Smile Odontologia                                ]     │
│                                                                 │
│  Site                          Email de Contato                 │
│  [beautysmile.com.br    ]      [rh@beautysmile.com.br    ]     │
│                                                                 │
│  Telefone                                                       │
│  [(11) 3456-7890                                          ]     │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Endereço                                                       │
│  [Av. Paulista, 1000 - São Paulo, SP                      ]     │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Redes Sociais                                                  │
│  LinkedIn  [linkedin.com/company/beautysmile              ]     │
│  Instagram [@beautysmile                                  ]     │
│  Facebook  [facebook.com/beautysmile                      ]     │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Cores da Marca                                                 │
│  Primária    [#0066CC  🎨]                                     │
│  Secundária  [#FF6600  🎨]                                     │
│  Acento      [#00CC66  🎨]                                     │
│                                                                 │
│  [Cancelar] [Salvar Alterações]                                │
└─────────────────────────────────────────────────────────────────┘
```

**Logo Upload:**
- Max 2MB
- PNG or JPG
- Auto-resize to 200x80 (preserve aspect ratio)
- Upload to Supabase Storage: `configuracoes/logo.png`

### FR-003: Tab 2 - Usuários RH
**User Management:**

**List View:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👥 Usuários RH                                         [+ Adicionar Usuário]│
├─────────────────────────────────────────────────────────────────────────────┤
│  [🔍 Buscar por nome ou email]  [Filtrar por role ▾]                        │
│                                                                             │
│  Nome              Email                Role          Status    Ações       │
│  ────────────────────────────────────────────────────────────────────────  │
│  João Silva        joao@beauty...       Admin         Ativo    [✏️][🗑️]   │
│  Maria Santos      maria@beauty...      RH Avançado   Ativo    [✏️][🗑️]   │
│  Pedro Costa       pedro@beauty...      RH Básico     Ativo    [✏️][🗑️]   │
│  Ana Lima          ana@beauty...        RH Avançado   Inativo  [✏️][🗑️]   │
│                                                                             │
│  Total: 4 usuários  •  3 ativos  •  1 inativo                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Add User Modal:**
```
┌─────────────────────────────────────────────────────┐
│  Adicionar Usuário RH                      [X]      │
├─────────────────────────────────────────────────────┤
│  Nome Completo *                                    │
│  [                                            ]     │
│                                                     │
│  Email *                                            │
│  [                                            ]     │
│                                                     │
│  Role *                                             │
│  [Selecionar role                           ▾]     │
│  ○ Admin                                            │
│  ○ RH Avançado                                      │
│  ○ RH Básico                                        │
│                                                     │
│  Senha Temporária *                                 │
│  [                                            ]     │
│  [Gerar Senha Aleatória]                            │
│                                                     │
│  ☑ Forçar troca de senha no primeiro login          │
│  ☑ Enviar email com credenciais                     │
│                                                     │
│  [Cancelar] [Adicionar Usuário]                     │
└─────────────────────────────────────────────────────┘
```

**Add User Logic:**
```typescript
async function addRHUser(data: AddUserForm) {
  // Create user in Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.senha_temporaria,
    email_confirm: true,
    user_metadata: {
      nome: data.nome_completo,
      role: data.role,
      force_password_change: data.forcar_troca_senha
    }
  })

  if (authError) throw authError

  // Create HR user record
  const { error: dbError } = await supabase
    .from('usuarios_rh')
    .insert([{
      user_id: authUser.user.id,
      nome: data.nome_completo,
      email: data.email,
      role: data.role,
      status: 'ativo',
      criado_por: currentAdmin.id
    }])

  if (dbError) throw dbError

  // Send welcome email
  if (data.enviar_email) {
    await sendEmail({
      to: data.email,
      template: 'rh_user_created',
      data: {
        nome: data.nome_completo,
        email: data.email,
        senha_temporaria: data.senha_temporaria,
        login_url: 'https://beautysmile.com.br/rh/login'
      }
    })
  }

  // Log action
  await supabase.from('auditoria_sistema').insert([{
    acao: 'usuario_criado',
    usuario_admin_id: currentAdmin.id,
    detalhes: { email: data.email, role: data.role }
  }])

  toast.success('Usuário criado com sucesso!')
}
```

**Edit User:**
- Can change: Nome, Role, Status
- Cannot change: Email (create new user instead)
- Deactivate user: Set `status = 'inativo'` (soft delete)

**Delete User:**
- Confirmation modal: "Tem certeza? Esta ação não pode ser desfeita."
- Cannot delete last admin user
- Cannot delete own account
- Soft delete: Set `deleted_at`, keep for audit log

### FR-004: Tab 3 - Permissões
**Role-Based Permissions Configuration:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🔐 Permissões por Role                                         │
├─────────────────────────────────────────────────────────────────┤
│  Role: [Admin                                               ▾]  │
│                                                                 │
│  Módulo              Permissão                     Admin  RH+  RHB│
│  ──────────────────────────────────────────────────────────────│
│  📋 Candidatos                                                  │
│    Visualizar todos                                ✓     ✓    ✓ │
│    Editar informações                              ✓     ✓    ○ │
│    Excluir candidatos                              ✓     ○    ○ │
│    Exportar dados                                  ✓     ✓    ○ │
│                                                                 │
│  💼 Vagas                                                       │
│    Criar vagas                                     ✓     ✓    ✓ │
│    Publicar vagas                                  ✓     ✓    ○ │
│    Editar vagas publicadas                         ✓     ✓    ○ │
│    Excluir vagas                                   ✓     ○    ○ │
│                                                                 │
│  ✅ Aprovação/Rejeição                                         │
│    Aprovar candidatos                              ✓     ✓    ○ │
│    Rejeitar candidatos                             ✓     ✓    ○ │
│    Reversão de decisões                            ✓     ○    ○ │
│    Aprovação em massa (>10)                        ✓     ○    ○ │
│                                                                 │
│  📧 Comunicação                                                 │
│    Enviar emails individuais                       ✓     ✓    ✓ │
│    Enviar emails em massa                          ✓     ✓    ○ │
│    Gerenciar templates                             ✓     ✓    ○ │
│                                                                 │
│  ⚙️ Configurações                                              │
│    Acessar configurações                           ✓     ○    ○ │
│    Gerenciar usuários                              ✓     ○    ○ │
│    Alterar integrações                             ✓     ○    ○ │
│                                                                 │
│  [Restaurar Padrões] [Salvar Permissões]                        │
└─────────────────────────────────────────────────────────────────┘
```

**Permission Storage:**
```typescript
interface PermissoesRH {
  role: 'admin' | 'rh_avancado' | 'rh_basico'
  permissoes: {
    candidatos: {
      visualizar: boolean
      editar: boolean
      excluir: boolean
      exportar: boolean
    }
    vagas: {
      criar: boolean
      publicar: boolean
      editar_publicadas: boolean
      excluir: boolean
    }
    aprovacao: {
      aprovar: boolean
      rejeitar: boolean
      reverter: boolean
      massa: boolean
    }
    comunicacao: {
      email_individual: boolean
      email_massa: boolean
      gerenciar_templates: boolean
    }
    configuracoes: {
      acessar: boolean
      gerenciar_usuarios: boolean
      alterar_integracoes: boolean
    }
  }
}
```

**Save to Database:**
```sql
CREATE TABLE permissoes_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT UNIQUE NOT NULL,
  permissoes JSONB NOT NULL,
  atualizado_em TIMESTAMP DEFAULT NOW(),
  atualizado_por UUID REFERENCES usuarios_rh(id)
);
```

### FR-005: Tab 4 - Templates de Email
**Email Template Management:**

**List View:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📧 Templates de Email                       [+ Novo Template]  │
├─────────────────────────────────────────────────────────────────┤
│  Nome                         Tipo            Última Edição     │
│  ─────────────────────────────────────────────────────────────  │
│  Convite Teste Big Five       Teste           01/11/2024  [✏️]  │
│  Agendamento Entrevista       Entrevista      28/10/2024  [✏️]  │
│  Solicitação Documentos       Documento       25/10/2024  [✏️]  │
│  Candidatura Recebida         Confirmação     20/10/2024  [✏️]  │
│  Rejeição Triagem             Rejeição        15/10/2024  [✏️]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Edit Template Modal:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Editar Template: Convite Teste Big Five            [X Fechar]  │
├─────────────────────────────────────────────────────────────────┤
│  Nome do Template *                                             │
│  [Convite Teste Big Five                                  ]     │
│                                                                 │
│  Assunto do Email *                                             │
│  [Próxima Etapa: Teste de Personalidade Big Five          ]     │
│                                                                 │
│  Corpo do Email (HTML suportado)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Olá {{nome}},                                           │   │
│  │                                                         │   │
│  │ Parabéns! Você foi aprovado(a) na triagem para a vaga  │   │
│  │ de {{vaga}}.                                            │   │
│  │                                                         │   │
│  │ A próxima etapa é o Teste de Personalidade Big Five.   │   │
│  │ Este teste avalia suas características comportamentais. │   │
│  │                                                         │   │
│  │ Acesse o teste aqui:                                    │   │
│  │ {{link_teste}}                                          │   │
│  │                                                         │   │
│  │ Atenciosamente,                                         │   │
│  │ Equipe RH {{empresa}}                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Variáveis Disponíveis:                                         │
│  {{nome}} {{email}} {{vaga}} {{empresa}} {{link_teste}}        │
│  {{data}} {{horario}} {{local}}                                 │
│                                                                 │
│  Preview:                                                       │
│  [Ver Preview com Dados de Teste]                               │
│                                                                 │
│  [Cancelar] [Salvar Template]                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Template Variables:**
- `{{nome}}` - Candidate name
- `{{email}}` - Candidate email
- `{{vaga}}` - Job title
- `{{empresa}}` - Company name
- `{{link_teste}}` - Test URL
- `{{data}}` - Date
- `{{horario}}` - Time
- `{{local}}` - Location
- `{{link_perfil}}` - Candidate profile URL

**Template Rendering:**
```typescript
function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    rendered = rendered.replace(regex, value || '')
  })

  return rendered
}
```

### FR-006: Tab 5 - Pipeline
**Pipeline Configuration:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🔄 Configuração do Pipeline                                    │
├─────────────────────────────────────────────────────────────────┤
│  Etapas do Processo de Recrutamento:                            │
│                                                                 │
│  Etapa                Ordem  SLA (dias)  Obrigatória  Ativa     │
│  ─────────────────────────────────────────────────────────────  │
│  Triagem               1     [3  ]         ✓          ✓         │
│  Big Five              2     [2  ]         ✓          ✓         │
│  DISC                  3     [5  ]         ✓          ✓         │
│  Entrevista Online     4     [7  ]         ✓          ✓         │
│  Raven                 5     [3  ]         ✓          ✓         │
│  Cultura               6     [7  ]         ○          ✓         │
│  Entrevista Presenc.   7     [10 ]         ✓          ✓         │
│  Aprovado              8      -            -          ✓         │
│                                                                 │
│  [+ Adicionar Etapa Customizada]                                │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Metas de Pipeline:                                             │
│                                                                 │
│  Taxa de Conversão Geral:      [15  ]%                         │
│  Tempo Médio de Contratação:   [15  ] dias                     │
│  SLA Compliance Mínimo:         [90  ]%                         │
│                                                                 │
│  [Salvar Configurações]                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Custom Stage:**
- Admins can add custom stages (e.g., "Teste Técnico", "Dinâmica de Grupo")
- Specify order, SLA, required/optional
- Cannot delete system stages (Triagem, Big Five, DISC, etc.)

### FR-007: Tab 6 - Integrações
**Integration Settings:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🔗 Integrações                                                 │
├─────────────────────────────────────────────────────────────────┤
│  N8N Webhooks:                                                  │
│                                                                 │
│  Big Five Completo                                              │
│  [https://fernandocosta.app.n8n.cloud/webhook/big-five    ]     │
│  Status: ✓ Conectado  •  Último uso: 01/11/2024 14:30          │
│  [Testar Webhook]                                               │
│                                                                 │
│  DISC Completo                                                  │
│  [https://fernandocosta.app.n8n.cloud/webhook/disc        ]     │
│  Status: ✓ Conectado  •  Último uso: 01/11/2024 12:15          │
│  [Testar Webhook]                                               │
│                                                                 │
│  Raven Completo                                                 │
│  [https://fernandocosta.app.n8n.cloud/webhook/raven       ]     │
│  Status: ⚠️ Não testado                                        │
│  [Testar Webhook]                                               │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Claude AI (Análise de Testes):                                │
│                                                                 │
│  API Key                                                        │
│  [sk-ant-api03-••••••••••••••••••••••••              ]  [🔄]  │
│  Modelo: claude-3-5-sonnet-20241022                             │
│  Status: ✓ Conectado  •  Último uso: 01/11/2024 14:35          │
│  [Testar Conexão]                                               │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Email Service (Resend):                                        │
│                                                                 │
│  API Key                                                        │
│  [re_••••••••••••••••••••••••                        ]  [🔄]  │
│  From Email: [rh@beautysmile.com.br                      ]     │
│  From Name:  [Beauty Smile RH                             ]     │
│  Status: ✓ Conectado  •  Último envio: 01/11/2024 15:00        │
│  [Enviar Email de Teste]                                        │
│                                                                 │
│  [Salvar Integrações]                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Test Webhook Button:**
```typescript
async function testWebhook(url: string) {
  const payload = {
    candidato_id: 'test-123',
    resultado_id: 'test-456',
    pontuacoes: { O: 75, C: 80, E: 68, A: 82, N: 45 },
    test: true
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      toast.success('Webhook testado com sucesso!')
    } else {
      toast.error(`Erro: ${response.statusText}`)
    }
  } catch (error) {
    toast.error('Falha ao conectar ao webhook')
  }
}
```

### FR-008: Tab 7 - Testes Psicométricos
**Test Configuration:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🧠 Configuração dos Testes                                     │
├─────────────────────────────────────────────────────────────────┤
│  [Big Five] [DISC] [Raven]                                      │
│                                                                 │
│  ━━ Big Five ━━                                                 │
│                                                                 │
│  Total de Questões: 120                                         │
│  Escala: Likert 5 pontos                                        │
│                                                                 │
│  Dimensões:                                                     │
│  • Abertura (O): 24 questões                                    │
│  • Conscienciosidade (C): 24 questões                           │
│  • Extroversão (E): 24 questões                                 │
│  • Amabilidade (A): 24 questões                                 │
│  • Neuroticismo (N): 24 questões                                │
│                                                                 │
│  Critérios de Aprovação:                                        │
│  Pontuação Mínima Geral: [60 ]%                                │
│  ☑ Analisar perfil com Claude AI                                │
│                                                                 │
│  [Gerenciar Banco de Perguntas] [Exportar Questões]            │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [Salvar Configurações]                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Question Bank Management:**
- View all questions for each test
- Add/edit/delete questions (admin only)
- Import questions from CSV/JSON
- Export questions for backup

### FR-009: Tab 8 - Notificações
**Notification Settings:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🔔 Configurações de Notificações                               │
├─────────────────────────────────────────────────────────────────┤
│  Relatórios Automáticos:                                        │
│                                                                 │
│  ☑ Relatório Semanal do Pipeline                                │
│     Enviar: Toda segunda-feira às 09:00                         │
│     Para: [maria@beautysmile.com.br                      ]      │
│           [joao@beautysmile.com.br                       ]      │
│           [+ Adicionar Destinatário]                            │
│                                                                 │
│  ☑ Relatório Mensal de Recrutamento                             │
│     Enviar: Primeiro dia do mês às 08:00                        │
│     Para: [diretoria@beautysmile.com.br              ]          │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Alertas em Tempo Real:                                         │
│                                                                 │
│  ☑ Candidatos Inativos >7 dias                                  │
│     Alertar quando: [7   ] dias                                 │
│     Enviar para: [Todos RH Avançado e Admin          ▾]        │
│                                                                 │
│  ☑ Taxa de Conversão Baixa                                      │
│     Alertar quando: Abaixo de [70  ]%                           │
│                                                                 │
│  ☑ SLA Excedido                                                 │
│     Alertar quando: >[50  ]% dos candidatos acima do SLA        │
│                                                                 │
│  ☐ Vaga sem Candidaturas                                        │
│     Alertar após: [7   ] dias sem aplicações                    │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [Salvar Preferências]                                          │
└─────────────────────────────────────────────────────────────────┘
```

### FR-010: Tab 9 - Auditoria
**Audit Log Viewer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📜 Log de Auditoria                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Filtros:                                                                   │
│  [Tipo de Ação ▾] [Usuário ▾] [Data ▾] [🔍 Buscar]                          │
│                                                                             │
│  Data/Hora            Usuário       Ação                  Detalhes          │
│  ──────────────────────────────────────────────────────────────────────────│
│  01/11/24 15:30       João Silva    candidato_aprovado   Ana Silva → Entr. │
│  01/11/24 14:20       Maria Santos  email_enviado        45 destinatários  │
│  01/11/24 13:15       Pedro Costa   vaga_criada          Dentista - SP     │
│  01/11/24 12:00       João Silva    config_alterada      SLA Triagem: 3→5  │
│  31/10/24 18:45       João Silva    usuario_criado       pedro@beauty...   │
│  31/10/24 16:30       Maria Santos  candidato_rejeitado  Carlos Souza      │
│                                                                             │
│  Página 1 de 127                                [Exportar CSV] [Exportar PDF]│
└─────────────────────────────────────────────────────────────────────────────┘
```

**Audit Log Events:**
- User actions: login, logout, password_changed, user_created, user_deleted
- Candidate actions: candidato_aprovado, candidato_rejeitado, etapa_alterada
- Data changes: perfil_editado, documento_uploaded, nota_adicionada
- System events: config_alterada, email_enviado, webhook_triggered, error_occurred

**Retention:**
- Keep audit logs for 5 years (LGPD requirement)
- Export to CSV/PDF for compliance reporting

### FR-011: Tab 10 - LGPD
**LGPD Compliance Settings:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🔐 Conformidade LGPD                                           │
├─────────────────────────────────────────────────────────────────┤
│  Encarregado de Dados (DPO):                                    │
│  Nome:  [João Silva                                       ]     │
│  Email: [dpo@beautysmile.com.br                           ]     │
│  Telefone: [(11) 3456-7890                                ]     │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Retenção de Dados:                                             │
│                                                                 │
│  Dados de Candidatos:                                           │
│  • Dados pessoais: [24 ] meses após última atividade           │
│  • Resultados de testes: [24 ] meses                            │
│  • Documentos: [24 ] meses                                      │
│  • Logs de auditoria: [60 ] meses (obrigatório)                │
│                                                                 │
│  ☑ Auto-anonimizar dados após período de retenção               │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Solicitações de Dados (Art. 18 LGPD):                          │
│                                                                 │
│  Pendentes: 2 solicitações                                      │
│  • Exclusão de conta - Ana Silva (3 dias restantes)             │
│  • Exportação de dados - Pedro Costa (5 dias restantes)         │
│  [Ver Solicitações]                                             │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Consentimentos:                                                │
│                                                                 │
│  ☑ Exigir consentimento para uso de dados                       │
│  ☑ Permitir revogação de consentimento                          │
│  ☑ Registrar histórico de consentimentos                        │
│                                                                 │
│  Texto do Termo de Consentimento:                               │
│  [Editar Termo]                                                 │
│                                                                 │
│  [Salvar Configurações]                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Data Retention Automation:**
```sql
-- Scheduled job: Run monthly
CREATE OR REPLACE FUNCTION anonimizar_dados_expirados()
RETURNS void AS $$
BEGIN
  -- Anonymize candidates older than retention period
  UPDATE candidatos
  SET
    nome_completo = 'Candidato Anonimizado',
    email = CONCAT('anonimizado_', id, '@beautysmile.local'),
    telefone = NULL,
    cpf = NULL,
    endereco = NULL,
    anonimizado_em = NOW()
  WHERE
    ultima_atividade < NOW() - INTERVAL '24 months'
    AND anonimizado_em IS NULL;
END;
$$ LANGUAGE plpgsql;
```

### FR-012: Tab 11 - Sistema
**System Health & Monitoring:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️ Sistema                                                     │
├─────────────────────────────────────────────────────────────────┤
│  Status do Sistema:                                             │
│                                                                 │
│  🟢 Banco de Dados: Online  •  Última conexão: há 2 segundos   │
│  🟢 Storage: Online  •  Uso: 2.3 GB / 10 GB (23%)              │
│  🟢 Email Service: Online  •  Última verificação: há 1 min     │
│  🟡 N8N Webhooks: 1 webhook não testado                         │
│  🟢 Claude AI: Online  •  Latência: 1.2s                       │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Uso de Recursos:                                               │
│                                                                 │
│  Candidatos Ativos: 342                                         │
│  Vagas Publicadas: 12                                           │
│  Testes Realizados (mês): 156                                   │
│  Emails Enviados (mês): 1,234                                   │
│  Storage Usado: 2.3 GB (documentos + fotos)                     │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Backup e Exportação:                                           │
│                                                                 │
│  Último Backup: 01/11/2024 03:00                                │
│  Próximo Backup: 02/11/2024 03:00                               │
│                                                                 │
│  [📥 Exportar Todos os Dados (JSON)]                           │
│  [📥 Exportar Banco de Dados (SQL)]                            │
│  [📥 Fazer Backup Completo Agora]                              │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Versão do Sistema:                                             │
│  v1.0.0  •  Última atualização: 15/10/2024                      │
│  [Ver Changelog] [Verificar Atualizações]                       │
└─────────────────────────────────────────────────────────────────┘
```

**System Health Check:**
```typescript
async function checkSystemHealth() {
  const health = {
    database: false,
    storage: false,
    email: false,
    webhooks: { tested: 0, total: 3 },
    ai: false
  }

  // Check database
  try {
    await supabase.from('candidatos').select('id').limit(1)
    health.database = true
  } catch {}

  // Check storage
  try {
    const { data } = await supabase.storage.getBucket('candidatos-avatars')
    health.storage = !!data
  } catch {}

  // Check email service
  try {
    const response = await fetch('https://api.resend.com/emails', {
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` }
    })
    health.email = response.ok
  } catch {}

  // Check webhooks (from database)
  const { data: webhooks } = await supabase
    .from('integracoes_webhooks')
    .select('testado')
  health.webhooks = {
    tested: webhooks?.filter(w => w.testado).length || 0,
    total: webhooks?.length || 0
  }

  // Check Claude AI
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      })
    })
    health.ai = response.ok
  } catch {}

  return health
}
```

## 5. Non-Goals (Out of Scope)

1. **Multi-tenant support** - Single organization only
2. **Role customization** - Fixed 3 roles (admin, rh_avancado, rh_basico)
3. **Advanced workflow builder** - Fixed recruitment pipeline
4. **Real-time collaboration** - No concurrent editing
5. **Custom fields** - Fixed database schema
6. **API access for third parties** - Internal use only
7. **Mobile app for HR** - Web interface only
8. **Advanced analytics/BI** - Basic metrics only
9. **Integration marketplace** - Hardcoded integrations only
10. **White-labeling** - Beauty Smile branding only

## 6. Design Considerations

**Visual Design:**
- Clean, admin-focused interface
- Tabbed navigation for organization
- Color-coded status indicators
- Confirmation modals for destructive actions

**Accessibility:**
- All settings have proper labels
- Keyboard navigation for all tabs
- Screen reader support for all forms
- High contrast mode for tables

**Security:**
- API keys masked (show only last 4 chars)
- Confirmation for sensitive operations
- Audit log for all changes
- Session timeout after 30 minutes

## 7. Technical Considerations

**State Management:**
```typescript
interface ConfiguracoesState {
  organizacao: ConfiguracoesOrganizacao
  usuarios: UsuarioRH[]
  permissoes: PermissoesRH[]
  templates: EmailTemplate[]
  pipeline: PipelineConfig
  integracoes: Integracoes
  notificacoes: NotificacoesConfig
  auditLog: AuditLogEntry[]
  systemHealth: SystemHealth

  updateOrganizacao: (data: Partial<ConfiguracoesOrganizacao>) => Promise<void>
  addUsuario: (user: AddUserForm) => Promise<void>
  updatePermissoes: (role: string, perms: Permissoes) => Promise<void>
  saveTemplate: (template: EmailTemplate) => Promise<void>
}
```

**Security:**
- Only admin role can access `/admin/configuracoes`
- Encrypt API keys at rest
- Log all configuration changes
- Rate limit API key updates (max 5/hour)

## 8. Success Metrics

**Primary:**
1. Settings load time: ≤ 2 seconds
2. User creation time: ≤ 30 seconds
3. Template save success rate: ≥ 99%
4. System health check: ≤ 5 seconds

**Secondary:**
1. Avg settings changes per month: 10-20
2. User creation frequency: 1-2 per month
3. Template usage: ≥ 80% of emails use templates
4. Audit log export frequency: 1 per quarter

## 9. Open Questions

1. **API Key Rotation:**
   - **Question:** Auto-rotate API keys every 90 days?
   - **Recommendation:** Manual rotation with expiry warnings for MVP

2. **Backup Frequency:**
   - **Question:** Daily or weekly automated backups?
   - **Recommendation:** Daily at 3am (low usage time)

3. **User Session Timeout:**
   - **Question:** 30 minutes or 4 hours?
   - **Recommendation:** 30 minutes for security, with "Remember me" option

---

## Acceptance Criteria Summary

✅ Admin can update organization settings (name, logo, colors)
✅ Admin can add/edit/delete HR users with role assignment
✅ Admin can configure permissions per role (admin, rh_avancado, rh_basico)
✅ Admin can create/edit email templates with variables
✅ Admin can configure pipeline stages and SLA targets
✅ Admin can update integration settings (N8N, Claude, email)
✅ Admin can view and export audit logs
✅ Admin can configure LGPD compliance settings (DPO, retention)
✅ System health dashboard shows all service statuses
✅ Backup/export functionality works for all data
✅ All configuration changes logged to auditoria_sistema
✅ Webhook test functionality validates connectivity
✅ Email template preview shows rendered output
✅ Cannot delete last admin user (validation)
✅ Cannot delete own admin account (validation)
✅ Manual QA passes with 0 critical bugs
✅ E2E test covers user creation → permission change → template edit flow

---

**Target Audience:** Senior Frontend Developer + Backend Developer
**Estimated Effort:** 9-10 days
**Dependencies:**
- ✅ `usuarios_rh` table with role field
- ✅ `permissoes_roles` table
- ✅ `email_templates` table
- ✅ `configuracoes_organizacao` table
- ✅ `integracoes_webhooks` table
- ✅ `auditoria_sistema` table
- ✅ `solicitacoes_exclusao_conta` table
- ✅ Supabase Auth admin functions
- ✅ Supabase Storage for org logo
- ✅ N8N webhook endpoints
- ✅ Claude AI API
- ✅ Resend API
**Blocker Status:** 🟡 MEDIUM - Important for system administration but not blocking core recruitment
