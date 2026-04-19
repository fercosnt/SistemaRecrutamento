# Integration Guide - Frontend + Supabase Backend
**Last Updated:** 2025-11-13
**Target:** Frontend developers integrating with Supabase

---

## Quick Start

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
npm install @supabase/auth-helpers-react  # For Next.js
npm install sonner  # Toast notifications (already installed)
```

### 2. Environment Variables

Create `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** Never commit these keys to Git!

### 3. Initialize Supabase Client

Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

---

## Authentication Integration

### Sign Up Flow (Already Implemented ✅)

The cadastro flow is **already implemented** in:
- `src/features/cadastro/services/cadastroService.ts`
- Uses `cadastrarCandidato()` function

**How it works:**
1. User fills multi-step form (4 steps)
2. Form validates with Zod schema
3. `cadastrarCandidato()` executes:
   - Creates auth user (`supabase.auth.signUp`)
   - Inserts into `candidatos`, `enderecos`, `disponibilidade`, `autorizacoes`
   - All in a single transaction
4. Returns success/error

**Usage:**
```typescript
import { cadastrarCandidato } from '@/features/cadastro/services/cadastroService'

const result = await cadastrarCandidato(formData)
// User is now registered and logged in!
```

### Login Flow

Create `src/features/auth/services/authService.ts`:
```typescript
import { supabase } from '@/lib/supabase'

export async function loginCandidato(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  return data
}

export async function loginRH(email: string, password: string) {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) throw authError

  // Verify user is actually RH
  const { data: rhUser, error: rhError } = await supabase
    .from('usuarios_rh')
    .select('*')
    .eq('user_id', authData.user.id)
    .single()

  if (rhError || !rhUser) {
    await supabase.auth.signOut()
    throw new Error('Usuário não autorizado como RH')
  }

  return { auth: authData, rh: rhUser }
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
```

### Session Management

Create `src/hooks/useAuth.ts`:
```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, session, loading }
}
```

### Protected Routes

Create `src/components/ProtectedRoute.tsx`:
```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/auth/login" />
  }

  return <>{children}</>
}
```

**Usage in routes:**
```typescript
{
  path: '/candidato/dashboard',
  element: (
    <ProtectedRoute>
      <DashboardCandidatoPage />
    </ProtectedRoute>
  )
}
```

---

## Querying Data with RLS

### Understanding RLS

**Row Level Security (RLS)** automatically filters queries based on the logged-in user.

**Example:**
```typescript
// This query automatically filters to show only YOUR candidaturas
// You don't need to add .eq('candidato_id', candidatoId)
const { data } = await supabase
  .from('candidaturas')
  .select('*')

// RLS policy automatically adds: WHERE candidato_id IN (
//   SELECT id FROM candidatos WHERE user_id = auth.uid()
// )
```

### Candidate Dashboard Example

```typescript
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export function DashboardCandidatoPage() {
  const { user } = useAuth()
  const [candidato, setCandidato] = useState(null)
  const [candidaturas, setCandidaturas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!user) return

      // Get candidate profile (RLS ensures you only get YOUR profile)
      const { data: candidatoData } = await supabase
        .from('candidatos')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setCandidato(candidatoData)

      // Get applications with job details (RLS filters automatically)
      const { data: candidaturasData } = await supabase
        .from('candidaturas')
        .select(`
          *,
          vagas (
            titulo,
            departamento,
            cidade,
            estado
          )
        `)
        .eq('candidato_id', candidatoData.id)
        .order('created_at', { ascending: false })

      setCandidaturas(candidaturasData || [])
      setLoading(false)
    }

    loadData()
  }, [user])

  if (loading) return <div>Carregando...</div>

  return (
    <div>
      <h1>Bem-vindo, {candidato.nome_completo}!</h1>

      <section>
        <h2>Minhas Candidaturas</h2>
        {candidaturas.map(c => (
          <div key={c.id}>
            <h3>{c.vagas.titulo}</h3>
            <p>Status: {c.status}</p>
            <p>Etapa: {c.etapa_atual}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
```

---

## File Upload (Storage)

### Upload Curriculum

```typescript
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export async function uploadCurriculum(
  candidatoId: string,
  file: File
) {
  try {
    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Arquivo muito grande. Máximo 5MB.')
    }

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato inválido. Use PDF ou DOC.')
    }

    // Upload to storage
    const fileName = `${candidatoId}/curriculum.pdf`
    const { data, error } = await supabase.storage
      .from('curriculos-candidatos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true, // Replace if exists
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('curriculos-candidatos')
      .getPublicUrl(fileName)

    toast.success('Currículo enviado com sucesso!')
    return { path: data.path, url: publicUrl }

  } catch (error) {
    toast.error(error.message)
    throw error
  }
}
```

### Download Curriculum (RH Only)

```typescript
export async function downloadCurriculum(candidatoId: string) {
  const fileName = `${candidatoId}/curriculum.pdf`

  const { data, error } = await supabase.storage
    .from('curriculos-candidatos')
    .download(fileName)

  if (error) throw error

  // Create download link
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = 'curriculum.pdf'
  a.click()
}
```

---

## Calling Custom Functions

### Advance Candidate to Next Stage

```typescript
export async function advanceCandidate(
  candidaturaId: string,
  novaEtapa: string,
  usuarioRHId: string,
  observacoes?: string
) {
  const { data, error } = await supabase.rpc('avancar_etapa', {
    p_candidatura_id: candidaturaId,
    p_nova_etapa: novaEtapa,
    p_usuario_rh_id: usuarioRHId,
    p_observacoes: observacoes || null,
  })

  if (error) throw error

  toast.success(`Candidato avançado para: ${novaEtapa}`)
  return data
}
```

### Reject Candidate

```typescript
export async function rejectCandidate(
  candidaturaId: string,
  usuarioRHId: string,
  motivo: string
) {
  const { data, error } = await supabase.rpc('rejeitar_candidato', {
    p_candidatura_id: candidaturaId,
    p_usuario_rh_id: usuarioRHId,
    p_motivo_rejeicao: motivo,
  })

  if (error) throw error

  toast.success('Candidato rejeitado')
  return data
}
```

---

## Real-time Updates

### Listen to Application Status Changes

```typescript
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function useApplicationUpdates(candidatoId: string) {
  useEffect(() => {
    // Subscribe to changes
    const subscription = supabase
      .channel('candidatura-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidaturas',
          filter: `candidato_id=eq.${candidatoId}`,
        },
        (payload) => {
          // Payload contains old and new values
          const old = payload.old
          const newVal = payload.new

          if (old.status !== newVal.status) {
            toast.info(`Sua candidatura foi atualizada: ${newVal.status}`)
          }

          if (old.etapa_atual !== newVal.etapa_atual) {
            toast.success(`Você avançou para: ${newVal.etapa_atual}!`)
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      subscription.unsubscribe()
    }
  }, [candidatoId])
}
```

**Usage:**
```typescript
function DashboardPage() {
  const { candidatoId } = useCandidato()
  useApplicationUpdates(candidatoId) // Automatically shows toasts on updates

  return <div>...</div>
}
```

---

## Form Submission Examples

### Submit Application Form

```typescript
export async function submitApplicationForm(
  candidaturaId: string,
  vagaId: string,
  answers: Record<string, string>
) {
  // 1. Get questions for this job
  const { data: perguntas } = await supabase
    .from('perguntas_formulario')
    .select('id')
    .eq('vaga_id', vagaId)

  // 2. Format answers
  const respostas = perguntas.map(p => ({
    candidatura_id: candidaturaId,
    pergunta_id: p.id,
    resposta_texto: answers[p.id] || '',
  }))

  // 3. Insert all answers
  const { error } = await supabase
    .from('respostas_formulario')
    .insert(respostas)

  if (error) throw error

  toast.success('Formulário enviado com sucesso!')
}
```

### Submit Psychometric Test

```typescript
export async function submitBigFiveTest(
  candidaturaId: string,
  answers: Record<string, number>
) {
  // answers = { questionId: selectedValue (1-5), ... }

  const respostas = Object.entries(answers).map(([questao_id, resposta]) => ({
    candidatura_id: candidaturaId,
    questao_id,
    resposta, // 1-5
  }))

  const { error } = await supabase
    .from('respostas_bigfive')
    .insert(respostas)

  if (error) throw error

  // Scores are auto-calculated by trigger!
  // Wait a moment for trigger to complete
  await new Promise(resolve => setTimeout(resolve, 500))

  // Fetch calculated scores
  const { data: scores } = await supabase
    .from('scores_bigfive')
    .select('*')
    .eq('candidatura_id', candidaturaId)
    .single()

  toast.success('Teste concluído! Seus resultados foram calculados.')
  return scores
}
```

---

## Error Handling Best Practices

### 1. Create Error Handler Utility

```typescript
// src/lib/errorHandler.ts
import { toast } from 'sonner'

export function handleSupabaseError(error: any) {
  console.error('Supabase Error:', error)

  // RLS policy violation
  if (error.code === 'PGRST301') {
    toast.error('Você não tem permissão para acessar este recurso')
    return
  }

  // Unique constraint violation
  if (error.code === '23505') {
    toast.error('Este registro já existe')
    return
  }

  // Foreign key violation
  if (error.code === '23503') {
    toast.error('Registro relacionado não encontrado')
    return
  }

  // Generic error
  toast.error(error.message || 'Erro ao processar requisição')
}
```

### 2. Use in Components

```typescript
import { handleSupabaseError } from '@/lib/errorHandler'

try {
  const { data, error } = await supabase.from('candidatos').select('*')
  if (error) throw error

  // Success
  setCandidatos(data)
} catch (error) {
  handleSupabaseError(error)
}
```

---

## TypeScript Integration

### 1. Import Types

```typescript
import type { Database } from '@/types/database.types'

// Table types
type Candidato = Database['public']['Tables']['candidatos']['Row']
type CandidatoInsert = Database['public']['Tables']['candidatos']['Insert']
type CandidatoUpdate = Database['public']['Tables']['candidatos']['Update']

// Enum types
type StatusCandidatura = Database['public']['Enums']['status_candidatura']
type EtapaProcesso = Database['public']['Enums']['etapa_processo']
```

### 2. Type-safe Queries

```typescript
// Supabase client is already typed!
const { data } = await supabase
  .from('candidatos')  // TypeScript knows all columns
  .select('nome_completo, email, cpf')
  .eq('user_id', userId)
  .single()

// data is typed as: Pick<Candidato, 'nome_completo' | 'email' | 'cpf'>
```

### 3. Type-safe Inserts

```typescript
const newCandidatura: CandidatoInsert = {
  candidato_id: 'uuid',
  vaga_id: 'uuid',
  status: 'nova', // TypeScript ensures valid enum value!
  etapa_atual: 'triagem',
}

await supabase.from('candidaturas').insert(newCandidatura)
```

---

## Performance Optimization

### 1. Use Select Sparingly

```typescript
// ❌ Don't fetch all columns if you only need a few
const { data } = await supabase.from('candidatos').select('*')

// ✅ Fetch only what you need
const { data } = await supabase
  .from('candidatos')
  .select('id, nome_completo, email')
```

### 2. Batch Inserts

```typescript
// ❌ Don't insert one-by-one
for (const answer of answers) {
  await supabase.from('respostas').insert(answer)
}

// ✅ Insert all at once
await supabase.from('respostas').insert(answers)
```

### 3. Use Pagination

```typescript
const PAGE_SIZE = 20

const { data, count } = await supabase
  .from('candidaturas')
  .select('*, vagas(*)', { count: 'exact' })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
```

### 4. Enable Caching (React Query)

```typescript
import { useQuery } from '@tanstack/react-query'

function useCandidato(userId: string) {
  return useQuery({
    queryKey: ['candidato', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('candidatos')
        .select('*')
        .eq('user_id', userId)
        .single()
      return data
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}
```

---

## Testing Integration

### 1. Mock Supabase Client

```typescript
// __mocks__/supabase.ts
export const supabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
}
```

### 2. Write Tests

```typescript
import { render, screen } from '@testing-library/react'
import { DashboardPage } from './DashboardPage'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')

test('loads candidate data', async () => {
  supabase.from.mockReturnValue({
    select: jest.fn().mockResolvedValue({
      data: { nome_completo: 'João Silva' },
      error: null,
    }),
  })

  render(<DashboardPage />)

  expect(await screen.findByText('João Silva')).toBeInTheDocument()
})
```

---

## Next Steps

1. **Read [API_ENDPOINTS.md](./API_ENDPOINTS.md)** for complete API reference
2. **Read [RLS_POLICIES.md](./RLS_POLICIES.md)** to understand access control
3. **Read [WEBHOOKS_N8N.md](./WEBHOOKS_N8N.md)** for webhook integration
4. **Start with authentication** - login/signup flows
5. **Build dashboard** - candidate/RH views
6. **Implement forms** - application form, tests
7. **Add real-time** - status update notifications

---

## Support

For questions or issues:
1. Check [Supabase Docs](https://supabase.com/docs)
2. Review error logs in Supabase Dashboard
3. Check RLS policies if getting permission errors
4. Verify environment variables are correct

Happy coding! 🚀
