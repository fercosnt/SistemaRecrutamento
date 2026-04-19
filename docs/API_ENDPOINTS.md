# API Endpoints - Beauty Smile Recruitment System
**Last Updated:** 2025-11-13
**Supabase Project:** Beauty Smile Sistema de Recrutamento

---

## Table of Contents
- [Authentication Endpoints](#authentication-endpoints)
- [CRUD Endpoints](#crud-endpoints)
- [Custom Functions](#custom-functions)
- [Storage Buckets](#storage-buckets)
- [Real-time Subscriptions](#real-time-subscriptions)

---

## Authentication Endpoints

### Base URL
```
https://your-project.supabase.co/auth/v1
```

### 1. Sign Up (Create Account)
**Endpoint:** `POST /signup`

**Frontend Implementation:**
```typescript
import { supabase } from '@/lib/supabase'
import { cadastrarCandidato } from '@/features/cadastro/services/cadastroService'

// Use existing cadastrarCandidato() service - already handles:
// 1. Create auth user (supabase.auth.signUp)
// 2. Insert into candidatos table
// 3. Insert into enderecos, disponibilidade, autorizacoes tables
// 4. All in a single transaction

const result = await cadastrarCandidato(formData)
```

**What It Does:**
- Creates auth user with email/password
- Automatically inserts candidato record
- Returns session token
- Sends verification email (if enabled)

---

### 2. Sign In (Login)
**Endpoint:** `POST /token?grant_type=password`

**Frontend Implementation:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'candidate@example.com',
  password: 'SecurePass123'
})

// Returns:
// - data.user: User object
// - data.session: Session with access_token
```

---

### 3. Sign Out (Logout)
**Endpoint:** `POST /logout`

**Frontend Implementation:**
```typescript
const { error } = await supabase.auth.signOut()
```

---

### 4. Get Current Session
**Frontend Implementation:**
```typescript
const { data: { session } } = await supabase.auth.getSession()
const { data: { user } } = await supabase.auth.getUser()
```

---

### 5. Password Reset
**Request Reset:**
```typescript
const { error } = await supabase.auth.resetPasswordForEmail('user@example.com', {
  redirectTo: 'https://yourapp.com/reset-password'
})
```

**Update Password:**
```typescript
const { error } = await supabase.auth.updateUser({
  password: 'NewSecurePass123'
})
```

---

## CRUD Endpoints

All CRUD operations are done via Supabase client with **automatic RLS enforcement**.

### Base Pattern
```typescript
// READ
const { data, error } = await supabase.from('table_name').select('*')

// INSERT
const { data, error } = await supabase.from('table_name').insert({ ... })

// UPDATE
const { data, error } = await supabase.from('table_name').update({ ... }).eq('id', id)

// DELETE (soft delete recommended)
const { data, error } = await supabase.from('table_name').update({ deleted_at: new Date() }).eq('id', id)
```

---

### Candidate Endpoints

#### 1. Get Candidate Profile
```typescript
// RLS: Only returns own profile
const { data: candidato } = await supabase
  .from('candidatos')
  .select('*')
  .eq('user_id', user.id)
  .single()
```

#### 2. Update Candidate Profile
```typescript
// RLS: Can only update own profile
const { data, error } = await supabase
  .from('candidatos')
  .update({
    nome_completo: 'Updated Name',
    instagram: '@newhandle'
  })
  .eq('user_id', user.id)
```

#### 3. Get Candidate Address
```typescript
const { data: endereco } = await supabase
  .from('enderecos')
  .select('*')
  .eq('candidato_id', candidatoId)
  .single()
```

#### 4. Get Candidate Availability
```typescript
const { data: disponibilidade } = await supabase
  .from('disponibilidade')
  .select('*')
  .eq('candidato_id', candidatoId)
  .single()
```

#### 5. Get Candidate LGPD Authorizations
```typescript
const { data: autorizacoes } = await supabase
  .from('autorizacoes')
  .select('*')
  .eq('candidato_id', candidatoId)
  .single()
```

---

### Job (Vagas) Endpoints

#### 1. List Active Jobs (Public)
```typescript
const { data: vagas } = await supabase
  .from('vagas')
  .select('*')
  .eq('status', 'aberta')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
```

#### 2. Get Job Details
```typescript
const { data: vaga } = await supabase
  .from('vagas')
  .select('*')
  .eq('id', vagaId)
  .single()
```

#### 3. Create Job (RH/Admin Only)
```typescript
// RLS: Only RH/Admin can create
const { data, error } = await supabase
  .from('vagas')
  .insert({
    titulo: 'Assistente Odontológico',
    departamento: 'Clinico',
    status: 'rascunho',
    // ... other fields
  })
```

---

### Application (Candidaturas) Endpoints

#### 1. Apply to Job
```typescript
const { data, error } = await supabase
  .from('candidaturas')
  .insert({
    candidato_id: candidatoId,
    vaga_id: vagaId,
    status: 'nova',
    etapa_atual: 'triagem'
  })
```

#### 2. Get My Applications
```typescript
// RLS: Only returns own applications
const { data: candidaturas } = await supabase
  .from('candidaturas')
  .select(`
    *,
    vagas (
      titulo,
      departamento,
      status
    )
  `)
  .eq('candidato_id', candidatoId)
  .order('created_at', { ascending: false })
```

#### 3. Get Application Status
```typescript
const { data } = await supabase
  .from('candidaturas')
  .select('status, etapa_atual, observacoes_rh')
  .eq('id', candidaturaId)
  .single()
```

---

### Form Questions (Perguntas Formulario) Endpoints

#### 1. Get Questions for Job
```typescript
const { data: perguntas } = await supabase
  .from('perguntas_formulario')
  .select('*')
  .eq('vaga_id', vagaId)
  .order('bloco_pergunta, ordem_exibicao')
```

#### 2. Submit Form Answers
```typescript
// Submit multiple answers at once
const answers = perguntas.map(p => ({
  candidatura_id: candidaturaId,
  pergunta_id: p.id,
  resposta_texto: formValues[p.id]
}))

const { data, error } = await supabase
  .from('respostas_formulario')
  .insert(answers)
```

---

### Psychometric Tests Endpoints

#### Big Five Test

```typescript
// 1. Get questions
const { data: questoes } = await supabase
  .from('questoes_bigfive')
  .select('*')
  .is('deleted_at', null)
  .order('numero_questao')

// 2. Submit answers
const answers = questoes.map(q => ({
  candidatura_id: candidaturaId,
  questao_id: q.id,
  resposta: selectedValue // 1-5
}))

await supabase.from('respostas_bigfive').insert(answers)

// 3. Scores auto-calculated by trigger!
const { data: scores } = await supabase
  .from('scores_bigfive')
  .select('*')
  .eq('candidatura_id', candidaturaId)
  .single()
```

#### DISC Test

```typescript
// Same pattern as Big Five
const { data: questoes } = await supabase.from('questoes_disc').select('*')
const { data: scores } = await supabase.from('scores_disc').select('*').eq('candidatura_id', candidaturaId).single()
```

#### Raven Test

```typescript
// Same pattern
const { data: questoes } = await supabase.from('questoes_raven').select('*')
const { data: scores } = await supabase.from('scores_raven').select('*').eq('candidatura_id', candidaturaId).single()
```

---

### Interview Endpoints (RH Only)

#### 1. Schedule Online Interview
```typescript
// RLS: Only RH can create
const { data, error } = await supabase
  .from('entrevistas_online')
  .insert({
    candidatura_id: candidaturaId,
    data_agendada: '2025-01-15T10:00:00Z',
    duracao_estimada_minutos: 60,
    link_videochamada: 'https://meet.google.com/xxx',
    plataforma: 'Google Meet',
    agendado_por: usuarioRHId
  })
```

#### 2. Update Interview Status
```typescript
const { data, error } = await supabase
  .from('entrevistas_online')
  .update({
    status: 'realizada',
    data_inicio_real: startTime,
    data_fim_real: endTime,
    observacoes_gerais: 'Candidato demonstrou...'
  })
  .eq('id', entrevistaId)
```

---

## Custom Functions

### 1. Advance Candidate Stage
```typescript
const { data, error } = await supabase.rpc('avancar_etapa', {
  p_candidatura_id: candidaturaId,
  p_nova_etapa: 'entrevista',
  p_usuario_rh_id: rhUserId,
  p_observacoes: 'Aprovado na triagem'
})
```

### 2. Reject Candidate
```typescript
const { data, error } = await supabase.rpc('rejeitar_candidato', {
  p_candidatura_id: candidaturaId,
  p_usuario_rh_id: rhUserId,
  p_motivo_rejeicao: 'Não atende requisitos mínimos'
})
```

### 3. Calculate Overall Score
```typescript
const { data: score } = await supabase.rpc('calcular_score_geral', {
  p_candidatura_id: candidaturaId
})
// Returns: average of all test scores
```

### 4. Get Interview Details
```typescript
const { data: details } = await supabase.rpc('obter_detalhes_entrevista', {
  p_entrevista_id: entrevistaId,
  p_tipo_entrevista: 'online' // or 'presencial'
})
```

### 5. Test Webhook
```typescript
const { data, error } = await supabase.rpc('testar_webhook', {
  p_webhook_id: webhookId
})
```

---

## Storage Buckets

### 1. Curriculos Bucket

**Name:** `curriculos-candidatos`
**RLS:** Enabled (candidates upload own, RH read all)

#### Upload Curriculum
```typescript
const { data, error } = await supabase.storage
  .from('curriculos-candidatos')
  .upload(`${candidatoId}/curriculum.pdf`, file, {
    cacheControl: '3600',
    upsert: true
  })

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('curriculos-candidatos')
  .getPublicUrl(`${candidatoId}/curriculum.pdf`)
```

#### Download Curriculum (RH Only)
```typescript
const { data, error } = await supabase.storage
  .from('curriculos-candidatos')
  .download(`${candidatoId}/curriculum.pdf`)
```

---

## Real-time Subscriptions

### 1. Listen to Candidatura Status Changes
```typescript
const subscription = supabase
  .channel('candidatura-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'candidaturas',
      filter: `candidato_id=eq.${candidatoId}`
    },
    (payload) => {
      console.log('Status changed:', payload.new.status)
      // Update UI
    }
  )
  .subscribe()

// Cleanup
subscription.unsubscribe()
```

### 2. Listen to New Messages
```typescript
const subscription = supabase
  .channel('new-notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'historico_acoes',
      filter: `candidatura_id=eq.${candidaturaId}`
    },
    (payload) => {
      // Show toast notification
    }
  )
  .subscribe()
```

---

## Error Handling

### Common Errors

```typescript
try {
  const { data, error } = await supabase.from('candidatos').select('*')

  if (error) {
    // Handle Supabase errors
    if (error.code === 'PGRST301') {
      // RLS policy violation - user not authorized
      toast.error('Você não tem permissão para acessar este recurso')
    } else if (error.code === '23505') {
      // Unique constraint violation
      toast.error('Este registro já existe')
    } else {
      // Generic error
      toast.error(error.message)
    }
  }
} catch (err) {
  // Network or other errors
  console.error(err)
  toast.error('Erro de conexão. Tente novamente.')
}
```

---

## Rate Limiting

Supabase has built-in rate limiting:
- **Anonymous requests:** 100 req/minute
- **Authenticated requests:** 200 req/minute
- **Storage uploads:** 50 MB/min

For production, consider implementing client-side throttling for expensive operations.

---

## Best Practices

1. **Always check for errors:**
   ```typescript
   const { data, error } = await supabase.from('table').select('*')
   if (error) throw error
   ```

2. **Use TypeScript types:**
   ```typescript
   import { Database } from '@/types/database.types'
   type Candidato = Database['public']['Tables']['candidatos']['Row']
   ```

3. **Leverage RLS:**
   - Don't manually filter by user_id
   - RLS policies automatically enforce access control

4. **Batch inserts when possible:**
   ```typescript
   await supabase.from('respostas').insert([answer1, answer2, answer3])
   ```

5. **Use `.single()` for single-row queries:**
   ```typescript
   const { data } = await supabase.from('candidatos').select('*').eq('id', id).single()
   ```

6. **Handle loading states:**
   ```typescript
   const [loading, setLoading] = useState(true)
   const { data } = await supabase.from('vagas').select('*')
   setLoading(false)
   ```

---

For more details, see:
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - How to integrate with frontend
- [RLS_POLICIES.md](./RLS_POLICIES.md) - Complete RLS documentation
- [WEBHOOKS_N8N.md](./WEBHOOKS_N8N.md) - N8N webhook integration

