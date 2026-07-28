# PRD-DEV-019: Edição de Perfil Candidato

## 1. Introduction/Overview

The Edição de Perfil Candidato (Candidate Profile Editing) system enables candidates to view and update their personal information, professional experience, education, and account settings after initial registration. This is essential for maintaining accurate candidate data and improving the recruitment experience by allowing candidates to keep their profiles current.

**Problem it solves:** Candidates need to update their information as they gain new experience, change contact details, or correct mistakes made during registration. Without profile editing, candidate data becomes stale, HR makes decisions based on outdated information, and candidates have poor experience if they can't update errors.

**Goal:** Implement a comprehensive profile management interface where candidates can edit all personal and professional information, upload documents and photos, change passwords, track profile completeness, and exercise LGPD data rights—all with proper validation, audit logging, and security controls.

## 2. Goals

1. Enable candidates to edit personal information (name, email, phone, address)
2. Support updating professional experience with multiple positions
3. Allow editing education history with multiple degrees/courses
4. Implement profile photo upload and crop functionality
5. Provide password change with current password verification
6. Show profile completeness percentage with suggestions
7. Support document uploads (CV, certifications, etc.)
8. Implement email change verification (confirm new email)
9. Log all profile changes for LGPD compliance
10. Provide data export (download my data) functionality
11. Support account deletion requests (LGPD right to be forgotten)
12. Validate all inputs with clear error messages

## 3. User Stories

### Primary Flow
**As a** candidate
**I want to** update my contact information and professional experience
**So that** HR has my most current details during the recruitment process

**As a** candidate
**I want to** upload my profile photo
**So that** HR can put a face to my application and I personalize my profile

**As a** candidate
**I want to** see how complete my profile is
**So that** I know what information I'm missing and can improve my application

### Secondary Flow
**As a** candidate
**I want to** change my password
**So that** I can keep my account secure if I suspect it's compromised

**As a** candidate
**I want to** download all my data stored in the system
**So that** I can exercise my LGPD rights and have a backup

**As a** candidate
**I want to** delete my account if I'm no longer interested
**So that** my personal data is removed from the system (LGPD compliance)

### Edge Cases
**As a** candidate
**I want** the system to verify my new email address before changing it
**So that** I don't lose access to my account due to typos

**As a** candidate who made a mistake during registration
**I want to** correct my CPF or date of birth
**So that** my profile matches my official documents

**As a** candidate
**I want** to see what changed in my profile and when
**So that** I can track my updates and verify nothing changed without my knowledge

## 4. Functional Requirements

### FR-001: Profile Page Access
**URL:** `/perfil` or `/meu-perfil`

**Access Control:**
- Only authenticated candidates
- Cannot view other candidates' profiles
- RLS: `auth.uid() = candidato.user_id`

**Page Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Meu Perfil                                       [⚙️ Config]   │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐                                                 │
│  │            │  Ana Silva                                      │
│  │   FOTO     │  ana.silva@email.com                            │
│  │            │  (11) 98765-4321                                │
│  └────────────┘                                                 │
│  [Alterar foto]                                                 │
│                                                                 │
│  📊 Completude do Perfil: ████████░░ 85%                       │
│  Faltam: Experiência profissional, Certificações               │
│                                                                 │
│  Tabs: [Dados Pessoais] [Profissional] [Educação]              │
│        [Documentos] [Segurança] [LGPD]                          │
└─────────────────────────────────────────────────────────────────┘
```

### FR-002: Tab 1 - Dados Pessoais
**Fields (editable):**

```typescript
interface DadosPessoais {
  nome_completo: string           // Required, min 5 chars
  data_nascimento: Date           // Required, 18-80 years old
  cpf: string                     // Required, immutable after verification
  genero: 'M' | 'F' | 'Outro' | 'Prefiro não informar'
  telefone: string                // Required, (XX) XXXXX-XXXX format
  telefone_alternativo?: string   // Optional
  email: string                   // Required, verification on change

  // Address
  cep: string                     // Required, auto-fill via ViaCEP
  endereco: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
}
```

**Form Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Dados Pessoais                                              │
├─────────────────────────────────────────────────────────────────┤
│  Nome Completo *                                                │
│  [Ana Silva                                               ]     │
│                                                                 │
│  Data de Nascimento *              Gênero                       │
│  [15/03/1995        ]              [Feminino            ▾]     │
│                                                                 │
│  CPF *                             Telefone *                   │
│  [123.456.789-00    ] 🔒           [(11) 98765-4321      ]     │
│  ⚠️ CPF não pode ser alterado                                  │
│                                                                 │
│  Telefone Alternativo (opcional)                                │
│  [(11) 3456-7890                                          ]     │
│                                                                 │
│  Email *                                                        │
│  [ana.silva@email.com                                     ]     │
│  ⚠️ Alterar email requer verificação do novo endereço          │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Endereço                                                       │
│                                                                 │
│  CEP *                                                          │
│  [01310-100         ] [Buscar]                                 │
│                                                                 │
│  Logradouro *                      Número *                     │
│  [Avenida Paulista               ] [1000      ]                │
│                                                                 │
│  Complemento (opcional)            Bairro *                     │
│  [Apto 52                        ] [Bela Vista]                │
│                                                                 │
│  Cidade *                          Estado *                     │
│  [São Paulo                      ] [SP        ▾]               │
│                                                                 │
│  [Cancelar] [Salvar Alterações]                                │
└─────────────────────────────────────────────────────────────────┘
```

**CEP Auto-fill:**
```typescript
async function buscarCEP(cep: string) {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  const data = await response.json()

  if (!data.erro) {
    setFormData({
      ...formData,
      endereco: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf
    })
  }
}
```

**Email Change Flow:**
```
1. User enters new email
2. Click "Salvar Alterações"
3. Modal appears:
   ┌─────────────────────────────────────────────┐
   │  Confirmar Mudança de Email                 │
   ├─────────────────────────────────────────────┤
   │  Enviamos um código de verificação para:    │
   │  novo.email@example.com                     │
   │                                             │
   │  Digite o código de 6 dígitos:              │
   │  [  ][  ][  ][  ][  ][  ]                  │
   │                                             │
   │  Não recebeu? [Reenviar código]             │
   │                                             │
   │  [Cancelar] [Verificar]                     │
   └─────────────────────────────────────────────┘

4. On verification success:
   - Update email in `candidatos` table
   - Log change in `candidatos_historico`
   - Send confirmation to OLD email
   - Send welcome to NEW email
```

**CPF Immutability:**
- CPF field is disabled (grayed out)
- Tooltip: "CPF não pode ser alterado. Entre em contato com RH se houver erro."
- Only admin can change CPF (via admin panel, with audit log)

### FR-003: Tab 2 - Experiência Profissional
**Data Structure:**
```typescript
interface ExperienciaProfissional {
  id: string
  candidato_id: string
  empresa: string
  cargo: string
  data_inicio: Date
  data_fim?: Date               // Null if current job
  trabalho_atual: boolean
  descricao_atividades: string  // Rich text, max 1000 chars
  ordem: number                 // Display order
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  💼 Experiência Profissional                 [+ Adicionar]      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Recepcionista                                   [✏️][🗑️]│   │
│  │  Clínica Sorriso Odontologia                             │   │
│  │  Jan 2021 - Atualmente  (3 anos 10 meses)               │   │
│  │                                                          │   │
│  │  • Atendimento ao público e agendamento de consultas    │   │
│  │  • Gestão de prontuários e faturamento                  │   │
│  │  • Controle de estoque de materiais                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Auxiliar Administrativo                         [✏️][🗑️]│   │
│  │  Clínica Dental Care                                     │   │
│  │  Mar 2019 - Dez 2020  (1 ano 9 meses)                   │   │
│  │                                                          │   │
│  │  • Suporte administrativo geral                         │   │
│  │  • Atendimento telefônico                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Add/Edit Experience Modal:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Adicionar Experiência Profissional                  [X Fechar] │
├─────────────────────────────────────────────────────────────────┤
│  Cargo *                                                        │
│  [Recepcionista                                           ]     │
│                                                                 │
│  Empresa *                                                      │
│  [Clínica Sorriso Odontologia                             ]     │
│                                                                 │
│  Data Início *              Data Fim                            │
│  [Jan/2021         ▾]       [Mai/2024          ▾]              │
│                                                                 │
│  ☑ Trabalho atual (deixe Data Fim em branco)                   │
│                                                                 │
│  Descrição das Atividades *                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Atendimento ao público e agendamento de consultas     │   │
│  │ • Gestão de prontuários eletrônicos                     │   │
│  │ • Controle de estoque de materiais odontológicos        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  0/1000 caracteres                                              │
│                                                                 │
│  [Cancelar] [Salvar]                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Automatic Duration Calculation:**
```typescript
function calcularDuracao(dataInicio: Date, dataFim: Date | null): string {
  const fim = dataFim || new Date()
  const meses = differenceInMonths(fim, dataInicio)
  const anos = Math.floor(meses / 12)
  const mesesRestantes = meses % 12

  if (anos > 0) {
    return `${anos} ano${anos > 1 ? 's' : ''} ${mesesRestantes} mes${mesesRestantes !== 1 ? 'es' : ''}`
  }
  return `${meses} mes${meses !== 1 ? 'es' : ''}`
}
```

### FR-004: Tab 3 - Educação
**Data Structure:**
```typescript
interface Educacao {
  id: string
  candidato_id: string
  nivel: 'Fundamental' | 'Médio' | 'Técnico' | 'Superior' | 'Pós-graduação' | 'Mestrado' | 'Doutorado'
  instituicao: string
  curso: string
  area_estudo?: string
  data_inicio: Date
  data_conclusao?: Date
  em_andamento: boolean
  ordem: number
}
```

**UI Layout (similar to Experiência):**
```
┌─────────────────────────────────────────────────────────────────┐
│  🎓 Educação                                     [+ Adicionar]   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Superior - Odontologia                          [✏️][🗑️]│   │
│  │  Universidade de São Paulo (USP)                         │   │
│  │  Mar 2015 - Dez 2019                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Ensino Médio                                    [✏️][🗑️]│   │
│  │  Colégio Objetivo                                        │   │
│  │  Jan 2012 - Dez 2014                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Validation:**
- Ensino Médio completion date must be before Superior start date
- Cannot have multiple "em andamento" at same level

### FR-005: Tab 4 - Documentos
**Supported Document Types:**
```typescript
interface DocumentoCandidato {
  id: string
  candidato_id: string
  tipo: 'curriculo' | 'certificacao' | 'diploma' | 'outro'
  nome_arquivo: string
  tamanho_kb: number
  url_storage: string        // Supabase Storage URL
  data_upload: Date
  visivel_rh: boolean        // Allow RH to see this doc?
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📄 Documentos                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [Upload de Arquivo]  Max 5MB  •  PDF, DOC, DOCX, JPG, PNG     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Tipo de Documento:                                      │   │
│  │  [Currículo                                          ▾]  │   │
│  │  ○ Currículo  ○ Certificação  ○ Diploma  ○ Outro        │   │
│  │                                                          │   │
│  │  Arraste arquivos aqui ou clique para selecionar        │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │                                                  │   │   │
│  │  │           📁 SOLTAR ARQUIVO AQUI                │   │   │
│  │  │                                                  │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  │  ☑ Visível para RH (marque para compartilhar)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Meus Documentos:                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📄 Curriculo_Ana_Silva.pdf           2.3 MB   [🗑️][⬇️]│   │
│  │     Upload em: 01/11/2024  •  ✓ Visível para RH         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎓 Diploma_Odontologia_USP.pdf       1.8 MB   [🗑️][⬇️]│   │
│  │     Upload em: 28/10/2024  •  ✓ Visível para RH         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Upload Logic:**
```typescript
async function uploadDocument(file: File, tipo: string) {
  // Validate
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Arquivo muito grande (máx 5MB)')
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png',
                        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo de arquivo não permitido')
  }

  // Upload to Supabase Storage
  const fileName = `${candidatoId}/${tipo}/${Date.now()}_${file.name}`
  const { data, error } = await supabase.storage
    .from('documentos-candidatos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documentos-candidatos')
    .getPublicUrl(fileName)

  // Save metadata to database
  await supabase.from('documentos_candidatos').insert([{
    candidato_id: candidatoId,
    tipo,
    nome_arquivo: file.name,
    tamanho_kb: Math.round(file.size / 1024),
    url_storage: publicUrl,
    visivel_rh: true
  }])
}
```

**Storage RLS Policies:**
```sql
-- Candidates can only upload to their own folder
CREATE POLICY "Candidates can upload own docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documentos-candidatos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Candidates can view their own docs
CREATE POLICY "Candidates can view own docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documentos-candidatos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- HR can view docs marked as visivel_rh
CREATE POLICY "RH can view shared docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documentos-candidatos' AND
  EXISTS (
    SELECT 1 FROM documentos_candidatos
    WHERE url_storage = (storage.bucketid() || '/' || name)
    AND visivel_rh = true
  )
);
```

### FR-006: Tab 5 - Segurança
**Password Change:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🔒 Segurança da Conta                                          │
├─────────────────────────────────────────────────────────────────┤
│  Alterar Senha                                                  │
│                                                                 │
│  Senha Atual *                                                  │
│  [••••••••••                                              ]     │
│                                                                 │
│  Nova Senha *                                                   │
│  [••••••••••                                              ]     │
│                                                                 │
│  Força da Senha: ████░░░░░░ Média                              │
│  ✓ Mínimo 8 caracteres                                          │
│  ✓ Letra maiúscula                                              │
│  ✓ Letra minúscula                                              │
│  ✗ Número                                                       │
│  ✗ Caractere especial                                           │
│                                                                 │
│  Confirmar Nova Senha *                                         │
│  [••••••••••                                              ]     │
│                                                                 │
│  [Alterar Senha]                                                │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Histórico de Login                                             │
│                                                                 │
│  📅 01/11/2024 14:30  •  Chrome/Windows  •  IP: 192.168.1.10   │
│  📅 31/10/2024 09:15  •  Safari/iPhone   •  IP: 192.168.1.25   │
│  📅 29/10/2024 18:45  •  Chrome/Windows  •  IP: 192.168.1.10   │
│                                                                 │
│  ⚠️ Detectou atividade suspeita? [Fazer logout de todos]       │
└─────────────────────────────────────────────────────────────────┘
```

**Password Change Logic:**
```typescript
async function changePassword(senhaAtual: string, novaSenha: string) {
  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: currentUser.email,
    password: senhaAtual
  })

  if (signInError) {
    throw new Error('Senha atual incorreta')
  }

  // Update password
  const { error } = await supabase.auth.updateUser({
    password: novaSenha
  })

  if (error) throw error

  // Log change
  await supabase.from('candidatos_historico').insert([{
    candidato_id: candidatoId,
    campo_alterado: 'senha',
    data_alteracao: new Date()
  }])

  // Send confirmation email
  await sendEmail({
    to: currentUser.email,
    template: 'password_changed',
    data: { nome: candidato.nome_completo }
  })

  toast.success('Senha alterada com sucesso!')
}
```

**Login History:**
- Fetch from Supabase Auth logs
- Show last 10 login attempts
- Device, browser, IP, timestamp
- "Logout de todos os dispositivos" button for security

### FR-007: Tab 6 - LGPD (Data Rights)
**LGPD Compliance Features:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🔐 Privacidade e Dados (LGPD)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Seus Direitos:                                                 │
│                                                                 │
│  1️⃣ Acessar Meus Dados                                         │
│     Baixe uma cópia de todos os dados que temos sobre você.     │
│     [📥 Baixar Meus Dados (JSON)]                              │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  2️⃣ Exportar Meus Dados (formato legível)                      │
│     Exportar perfil e histórico em PDF para leitura.            │
│     [📄 Exportar PDF]                                           │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  3️⃣ Solicitar Exclusão de Conta                                │
│     ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL.                      │
│                                                                 │
│     Ao excluir sua conta:                                       │
│     • Todos os seus dados pessoais serão removidos              │
│     • Suas candidaturas serão anonimizadas                      │
│     • Você não poderá mais acessar o sistema                    │
│     • Alguns dados podem ser retidos por obrigação legal        │
│                                                                 │
│     [🗑️ Solicitar Exclusão de Conta]                          │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  Histórico de Alterações:                                       │
│  📅 01/11/2024 14:30 - Telefone atualizado                     │
│  📅 28/10/2024 09:15 - Endereço atualizado                     │
│  📅 25/10/2024 16:45 - Foto de perfil adicionada               │
│                                                                 │
│  [Ver Histórico Completo (120 eventos)]                         │
└─────────────────────────────────────────────────────────────────┘
```

**Data Export (JSON):**
```typescript
async function exportMyData() {
  // Fetch all candidate data
  const { data: candidato } = await supabase
    .from('candidatos')
    .select(`
      *,
      experiencias:experiencias_profissionais(*),
      educacao:educacao(*),
      documentos:documentos_candidatos(*),
      resultados_big_five(*),
      resultados_disc(*),
      resultados_raven(*),
      candidaturas:candidaturas(*),
      historico:candidatos_historico(*)
    `)
    .eq('id', candidatoId)
    .single()

  // Format as JSON
  const dataExport = {
    exportado_em: new Date().toISOString(),
    candidato: candidato,
    total_registros: Object.keys(candidato).length
  }

  // Download as JSON file
  const blob = new Blob([JSON.stringify(dataExport, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `meus_dados_beautysmile_${Date.now()}.json`
  link.click()

  // Log export
  await supabase.from('candidatos_historico').insert([{
    candidato_id: candidatoId,
    campo_alterado: 'lgpd_export',
    data_alteracao: new Date()
  }])
}
```

**Account Deletion:**
```typescript
async function requestAccountDeletion() {
  // Confirmation modal
  const confirmed = await confirmDialog({
    title: 'Confirmar Exclusão de Conta',
    message: 'Você tem certeza? Esta ação não pode ser desfeita.',
    confirmText: 'Sim, excluir minha conta',
    cancelText: 'Cancelar'
  })

  if (!confirmed) return

  // Create deletion request (not immediate)
  const { data: request } = await supabase
    .from('solicitacoes_exclusao_conta')
    .insert([{
      candidato_id: candidatoId,
      data_solicitacao: new Date(),
      status: 'pendente',
      processado_em: null
    }])
    .select()
    .single()

  // Send confirmation email with cancellation link
  await sendEmail({
    to: candidato.email,
    template: 'account_deletion_requested',
    data: {
      nome: candidato.nome_completo,
      cancel_url: `https://beautysmile.com.br/cancelar-exclusao/${request.id}`
    }
  })

  // Logout user
  await supabase.auth.signOut()

  // Show message
  toast.success('Solicitação de exclusão enviada. Você tem 7 dias para cancelar.')

  // Navigate to goodbye page
  router.push('/conta-excluida')
}

// Cron job (runs daily): Process deletion requests after 7 days
async function processAccountDeletions() {
  const { data: requests } = await supabase
    .from('solicitacoes_exclusao_conta')
    .select('*')
    .eq('status', 'pendente')
    .lt('data_solicitacao', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

  for (const request of requests) {
    // Anonymize candidate data
    await supabase.from('candidatos').update({
      nome_completo: 'Usuário Excluído',
      email: `deleted_${request.candidato_id}@beautysmile.local`,
      telefone: '***',
      cpf: '***',
      data_nascimento: null,
      endereco: null,
      deleted_at: new Date()
    }).eq('id', request.candidato_id)

    // Delete user from auth
    await supabase.auth.admin.deleteUser(request.candidato_id)

    // Mark as processed
    await supabase.from('solicitacoes_exclusao_conta')
      .update({ status: 'processada', processado_em: new Date() })
      .eq('id', request.id)
  }
}
```

### FR-008: Profile Photo Upload
**Photo Upload Component:**
```
┌─────────────────────────────────────────────────┐
│  Alterar Foto de Perfil                 [X]     │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │          PREVIEW DA IMAGEM              │   │
│  │          (200x200px circular)           │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Escolher Arquivo]  ou  [Usar Webcam]          │
│                                                 │
│  Crop & Ajustes:                                │
│  Zoom: ─────●───── 100%                         │
│                                                 │
│  [Cancelar] [Salvar Foto]                       │
└─────────────────────────────────────────────────┘
```

**Image Processing:**
```typescript
async function uploadProfilePhoto(file: File) {
  // Validate
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Apenas JPG ou PNG')
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Máximo 2MB')
  }

  // Resize and crop to 400x400 (use browser-image-compression)
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 400,
    useWebWorker: true
  }
  const compressedFile = await imageCompression(file, options)

  // Upload to Supabase Storage
  const fileName = `avatars/${candidatoId}.jpg`
  const { error } = await supabase.storage
    .from('candidatos-avatars')
    .upload(fileName, compressedFile, {
      upsert: true,
      cacheControl: '3600'
    })

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('candidatos-avatars')
    .getPublicUrl(fileName)

  // Update candidato
  await supabase.from('candidatos').update({
    foto_perfil_url: publicUrl
  }).eq('id', candidatoId)

  toast.success('Foto atualizada!')
}
```

**Webcam Capture (optional):**
- Use `react-webcam` library
- Capture photo → crop → upload
- Fallback to file upload if webcam not available

### FR-009: Profile Completeness Indicator
**Calculation:**
```typescript
function calculateProfileCompleteness(candidato: Candidato): number {
  let score = 0
  const weights = {
    nome_completo: 5,
    email: 5,
    telefone: 5,
    cpf: 5,
    data_nascimento: 5,
    endereco_completo: 10,
    foto_perfil: 10,
    experiencias: 20,          // At least 1
    educacao: 15,              // At least 1
    curriculo: 20,             // At least 1 CV uploaded
    certificacoes: 5           // Optional bonus
  }

  if (candidato.nome_completo) score += weights.nome_completo
  if (candidato.email) score += weights.email
  if (candidato.telefone) score += weights.telefone
  if (candidato.cpf) score += weights.cpf
  if (candidato.data_nascimento) score += weights.data_nascimento
  if (candidato.endereco && candidato.cep) score += weights.endereco_completo
  if (candidato.foto_perfil_url) score += weights.foto_perfil
  if (candidato.experiencias?.length > 0) score += weights.experiencias
  if (candidato.educacao?.length > 0) score += weights.educacao
  if (candidato.documentos?.some(d => d.tipo === 'curriculo')) score += weights.curriculo
  if (candidato.documentos?.some(d => d.tipo === 'certificacao')) score += weights.certificacoes

  return score
}
```

**Display:**
```
📊 Completude do Perfil: ████████░░ 85%

Faltam para 100%:
• Adicionar pelo menos 1 experiência profissional (+20%)
• Upload do currículo (+15%)
```

**Gamification (optional):**
- Show badge when profile reaches 100%
- "Perfil Completo ⭐" badge visible to HR
- Email notification: "Complete seu perfil para melhorar suas chances!"

### FR-010: Validation and Error Handling
**Real-time Validation:**
- Email format validation
- CPF validation (Luhn algorithm)
- Phone format (Brazilian pattern)
- CEP format (XXXXX-XXX)
- Age validation (18-80 years)
- Date range validation (end date > start date)

**Error Display:**
```
Nome Completo *
[Ana                                                      ]
❌ Nome muito curto. Mínimo 5 caracteres.

Email *
[ana.silva@                                               ]
❌ Email inválido. Exemplo: nome@email.com

CPF *
[123.456.789-00                                           ]
✓ CPF válido
```

**Server-side Validation:**
- All validations duplicated on backend
- Return structured error messages
- Log validation failures for security monitoring

### FR-011: Audit Logging
**All Changes Logged:**
```sql
CREATE TABLE candidatos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID REFERENCES candidatos(id),
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  data_alteracao TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);
```

**Log Entry Example:**
```json
{
  "candidato_id": "abc-123",
  "campo_alterado": "telefone",
  "valor_anterior": "(11) 98765-4321",
  "valor_novo": "(11) 91234-5678",
  "data_alteracao": "2024-11-01T14:30:00Z",
  "ip_address": "192.168.1.10",
  "user_agent": "Mozilla/5.0 Chrome/120.0"
}
```

**Retention:**
- Keep logs for 5 years (LGPD compliance)
- Anonymize after account deletion

## 5. Non-Goals (Out of Scope)

1. **Social login** (Google, Facebook) - Email/password only for MVP
2. **Multi-factor authentication (MFA)** - Future enhancement
3. **Profile privacy settings** - All data visible to HR by default
4. **Candidate-to-candidate messaging** - No social features
5. **Video profile** - Photo only
6. **Skills endorsements** - Self-reported only
7. **LinkedIn import** - Manual entry only
8. **Resume parsing** - Upload only, no auto-fill from resume
9. **Real-time collaboration** - One user editing at a time
10. **Profile versioning** - Audit log only, no rollback

## 6. Design Considerations

**Visual Design:**
- Clean, form-focused layout
- Progress indicator for profile completeness
- Tabbed interface for organization
- Inline validation with clear error messages

**Accessibility:**
- All form fields have proper labels
- Error messages associated with fields (ARIA)
- Keyboard navigation for all tabs
- Screen reader support for profile completeness

**Mobile Responsiveness:**
- Stack tabs vertically on mobile
- Large tap targets for buttons
- Mobile-optimized file upload
- Simplified photo crop on small screens

## 7. Technical Considerations

**State Management:**
```typescript
interface PerfilCandidatoState {
  candidato: Candidato
  experiencias: ExperienciaProfissional[]
  educacao: Educacao[]
  documentos: DocumentoCandidato[]
  isLoading: boolean
  isSaving: boolean
  completeness: number

  updateDadosPessoais: (data: Partial<Candidato>) => Promise<void>
  addExperiencia: (exp: ExperienciaProfissional) => Promise<void>
  uploadDocument: (file: File, tipo: string) => Promise<void>
  changePassword: (senhaAtual: string, novaSenha: string) => Promise<void>
  exportData: () => void
  requestDeletion: () => Promise<void>
}
```

**Performance:**
- Debounce auto-save (1 second after typing stops)
- Lazy load tabs (only load data when tab clicked)
- Image optimization before upload
- Paginate audit log (20 entries per page)

## 8. Success Metrics

**Primary:**
1. Profile completion rate: ≥ 80% of candidates reach 100%
2. Time to complete profile: ≤ 10 minutes
3. Photo upload rate: ≥ 60% of candidates
4. Document upload rate: ≥ 70% (at least CV)

**Secondary:**
1. Password change frequency: Avg 1 per 6 months
2. Data export requests: ≤ 5% of candidates
3. Account deletion requests: ≤ 2% of candidates
4. Edit frequency: Avg 3 edits per month per candidate

## 9. Open Questions

1. **Email Verification Delay:**
   - **Question:** How long should verification code be valid?
   - **Recommendation:** 15 minutes, resend allowed after 1 minute

2. **Account Deletion Grace Period:**
   - **Question:** 7 days grace period sufficient?
   - **Recommendation:** Yes, industry standard

3. **Profile Photo Requirement:**
   - **Question:** Make photo required or optional?
   - **Recommendation:** Optional but strongly encouraged (affects completeness score)

---

## Acceptance Criteria Summary

✅ Candidates can edit all personal information with validation
✅ Email change requires verification code
✅ CPF is immutable (disabled field)
✅ CEP auto-fill works via ViaCEP API
✅ Candidates can add/edit/delete professional experience
✅ Candidates can add/edit/delete education history
✅ Profile photo upload with resize/crop to 400x400
✅ Document upload (CV, certs) to Supabase Storage with 5MB limit
✅ Password change requires current password verification
✅ Profile completeness calculated and displayed
✅ Login history shows last 10 sessions
✅ Data export (JSON) works with all candidate data
✅ Account deletion request creates 7-day grace period
✅ All changes logged to candidatos_historico table
✅ Mobile-responsive form and file upload
✅ LGPD compliance (export, deletion, audit log)
✅ Manual QA passes with 0 critical bugs
✅ E2E test covers edit → upload → password change flow

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 6-7 days
**Dependencies:**
- ✅ `candidatos` table with all fields
- ✅ `experiencias_profissionais` table
- ✅ `educacao` table
- ✅ `documentos_candidatos` table
- ✅ `candidatos_historico` table for audit log
- ✅ `solicitacoes_exclusao_conta` table
- ✅ Supabase Storage buckets: `candidatos-avatars`, `documentos-candidatos`
- ✅ ViaCEP API for address lookup
- ✅ Email service (Resend/SendGrid) for verification codes
- ✅ Image compression library (browser-image-compression)
- ✅ Form validation (React Hook Form + Zod)
**Blocker Status:** 🟡 MEDIUM - Important for candidate experience but not blocking recruitment flow
