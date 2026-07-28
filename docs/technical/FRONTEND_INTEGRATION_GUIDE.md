# Frontend Integration Guide - Sistema de Recrutamento

**Data:** 2025-11-04
**Projeto Supabase:** isljnozzlvckrgjjbjwp
**Status:** ✅ Backend 100% Pronto para Integração

---

## 📋 Índice

1. [Setup Inicial](#setup-inicial)
2. [Geração de TypeScript Types](#geração-de-typescript-types)
3. [Autenticação Supabase](#autenticação-supabase)
4. [Queries e Mutations](#queries-e-mutations)
5. [RLS Policies - Comportamento no Frontend](#rls-policies---comportamento-no-frontend)
6. [Storage - Upload de Arquivos](#storage---upload-de-arquivos)
7. [Real-time Subscriptions](#real-time-subscriptions)
8. [Error Handling](#error-handling)

---

## 🚀 Setup Inicial

### 1. Instalar Supabase Client

```bash
npm install @supabase/supabase-js
# ou
yarn add @supabase/supabase-js
# ou
pnpm add @supabase/supabase-js
```

### 2. Variáveis de Ambiente

Crie um arquivo `.env.local` (Next.js) ou `.env` (React/Vite):

```env
VITE_SUPABASE_URL=https://isljnozzlvckrgjjbjwp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbGpub3p6bHZja3JnampiandwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNDUyODQsImV4cCI6MjA3NjkyMTI4NH0.Ua9n-UjbZK98ANDRPDdTPb0dxOBWQmEEvW21kFQ5Nww
```

### 3. Configurar Supabase Client

**lib/supabase.ts (ou src/lib/supabase.ts)**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage, // ou AsyncStorage para React Native
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limiting para real-time
    },
  },
})
```

---

## 📝 Geração de TypeScript Types

### Opção 1: Supabase CLI (Recomendado)

```bash
# Instalar Supabase CLI globalmente
npm install -g supabase

# Gerar tipos do projeto
npx supabase gen types typescript --project-id isljnozzlvckrgjjbjwp > src/types/database.types.ts
```

### Opção 2: Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/api
2. Vá para "API Docs" → "TypeScript"
3. Copie os tipos gerados

### Estrutura de Types Esperada

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      candidatos: {
        Row: {
          id: string
          user_id: string
          email: string
          nome_completo: string
          cpf: string
          // ... todos os campos
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          // ... campos obrigatórios/opcionais
        }
        Update: {
          id?: string
          email?: string
          // ... todos opcionais
        }
      }
      // ... outras 22 tabelas
    }
    Views: {
      v_candidatos_ativos: {
        Row: {
          id: string
          email: string
          // ... campos da view
        }
      }
      // ... outras 8 views
    }
    Functions: {
      calcular_score_geral: {
        Args: { candidatura_uuid: string }
        Returns: number
      }
      // ... outras 23 functions
    }
    Enums: {
      status_vaga: 'rascunho' | 'ativa' | 'inativa' | 'arquivada'
      // ... outros 18 enums
    }
  }
}
```

---

## 🔐 Autenticação Supabase

### Sign Up (Candidato)

```typescript
import { supabase } from '@/lib/supabase'

async function signUpCandidato(email: string, password: string, userData: {
  nome_completo: string
  cpf: string
  celular: string
  data_nascimento: string
  cidade: string
  estado: string
}) {
  // 1. Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        role: 'candidato', // metadata
      },
    },
  })

  if (authError) throw authError

  // 2. Criar registro na tabela candidatos
  // IMPORTANTE: Isso acontece automaticamente via RLS policies
  // Mas você pode querer inserir dados adicionais:
  const { data: candidato, error: candidatoError } = await supabase
    .from('candidatos')
    .insert({
      user_id: authData.user!.id,
      email,
      nome_completo: userData.nome_completo,
      cpf: userData.cpf,
      celular: userData.celular,
      data_nascimento: userData.data_nascimento,
      cidade: userData.cidade,
      estado: userData.estado,
      ativo: true,
      bloqueado: false,
    })
    .select()
    .single()

  if (candidatoError) throw candidatoError

  return { user: authData.user, candidato }
}
```

### Sign Up (Usuário RH)

```typescript
async function signUpUsuarioRH(email: string, password: string, userData: {
  nome_completo: string
  cargo: string
  role: 'administrador' | 'recrutador' | 'analista'
}) {
  // 1. Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        role: 'rh', // metadata
      },
    },
  })

  if (authError) throw authError

  // 2. Criar registro na tabela usuarios_rh
  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios_rh')
    .insert({
      user_id: authData.user!.id,
      email,
      nome_completo: userData.nome_completo,
      cargo: userData.cargo,
      role: userData.role,
      ativo: true,
    })
    .select()
    .single()

  if (usuarioError) throw usuarioError

  // 3. Criar preferências padrão (trigger automático cria)
  // Mas você pode verificar:
  const { data: preferencias } = await supabase
    .from('preferencias_notificacoes')
    .select('*')
    .eq('usuario_rh_id', usuario.id)
    .single()

  return { user: authData.user, usuario, preferencias }
}
```

### Sign In

```typescript
async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  // Verificar tipo de usuário (candidato ou RH)
  const { data: candidato } = await supabase
    .from('candidatos')
    .select('id, nome_completo, ativo, bloqueado')
    .eq('user_id', data.user.id)
    .single()

  if (candidato) {
    if (candidato.bloqueado) {
      throw new Error('Usuário bloqueado. Entre em contato com o suporte.')
    }
    if (!candidato.ativo) {
      throw new Error('Usuário inativo.')
    }
    return { user: data.user, type: 'candidato', profile: candidato }
  }

  const { data: rh } = await supabase
    .from('usuarios_rh')
    .select('id, nome_completo, cargo, role, ativo')
    .eq('user_id', data.user.id)
    .single()

  if (rh) {
    if (!rh.ativo) {
      throw new Error('Usuário inativo.')
    }
    return { user: data.user, type: 'rh', profile: rh }
  }

  throw new Error('Perfil de usuário não encontrado.')
}
```

### Sign Out

```typescript
async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
```

### Session Management

```typescript
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obter sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, loading }
}
```

---

## 📊 Queries e Mutations

### Buscar Vagas Ativas

```typescript
async function buscarVagasAtivas() {
  const { data, error } = await supabase
    .from('vagas')
    .select(`
      *,
      usuarios_rh!vagas_created_by_fkey(nome_completo, cargo)
    `)
    .eq('status', 'ativa')
    .eq('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
```

### Buscar Vaga por Slug (Landing Page)

```typescript
async function buscarVagaPorSlug(slug: string) {
  const { data, error } = await supabase
    .from('vagas')
    .select(`
      *,
      perguntas_cultura(
        id,
        ordem,
        texto_pergunta,
        texto_ajuda,
        obrigatoria,
        limite_caracteres
      )
    `)
    .eq('slug', slug)
    .eq('status', 'ativa')
    .eq('deleted_at', null)
    .single()

  if (error) throw error
  return data
}
```

### Criar Candidatura

```typescript
async function criarCandidatura(
  vagaId: string,
  candidatoId: string,
  dadosFormulario: {
    respostas_formulario: Array<{
      pergunta_id: string
      resposta_texto?: string
      resposta_opcoes?: string[]
      resposta_numerica?: number
    }>
    respostas_cultura: Array<{
      pergunta_id: string
      resposta_texto: string
      tempo_resposta_segundos?: number
    }>
    curriculo?: File
    origem_candidatura?: string
  }
) {
  // 1. Upload do currículo (se fornecido)
  let curriculo_url = null
  if (dadosFormulario.curriculo) {
    const fileName = `${candidatoId}/${vagaId}/${Date.now()}_${dadosFormulario.curriculo.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('curriculos')
      .upload(fileName, dadosFormulario.curriculo, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError
    curriculo_url = uploadData.path
  }

  // 2. Criar candidatura
  const { data: candidatura, error: candidaturaError } = await supabase
    .from('candidaturas')
    .insert({
      vaga_id: vagaId,
      candidato_id: candidatoId,
      etapa_atual: 'triagem',
      status: 'aguardando_resposta',
      curriculo_url,
      curriculo_nome_original: dadosFormulario.curriculo?.name,
      curriculo_tamanho_bytes: dadosFormulario.curriculo?.size,
      origem_candidatura: dadosFormulario.origem_candidatura || 'website',
      data_candidatura: new Date().toISOString(),
    })
    .select()
    .single()

  if (candidaturaError) throw candidaturaError

  // 3. Inserir respostas do formulário
  if (dadosFormulario.respostas_formulario.length > 0) {
    const respostasFormulario = dadosFormulario.respostas_formulario.map((r) => ({
      candidatura_id: candidatura.id,
      pergunta_id: r.pergunta_id,
      resposta_texto: r.resposta_texto,
      resposta_opcoes: r.resposta_opcoes,
      resposta_numerica: r.resposta_numerica,
    }))

    const { error: respostasError } = await supabase
      .from('respostas_formulario')
      .insert(respostasFormulario)

    if (respostasError) throw respostasError
  }

  // 4. Inserir respostas de cultura
  if (dadosFormulario.respostas_cultura.length > 0) {
    const respostasCultura = dadosFormulario.respostas_cultura.map((r) => ({
      candidatura_id: candidatura.id,
      pergunta_id: r.pergunta_id,
      resposta_texto: r.resposta_texto,
      tempo_resposta_segundos: r.tempo_resposta_segundos,
    }))

    const { error: culturaError } = await supabase
      .from('respostas_cultura')
      .insert(respostasCultura)

    if (culturaError) throw culturaError
  }

  return candidatura
}
```

### Buscar Candidaturas do Candidato

```typescript
async function buscarMinhasCandidaturas(candidatoId: string) {
  const { data, error } = await supabase
    .from('candidaturas')
    .select(`
      *,
      vagas(
        id,
        titulo,
        subtitulo,
        departamento,
        cidade,
        estado,
        modelo_trabalho,
        status
      )
    `)
    .eq('candidato_id', candidatoId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
```

### Buscar Candidatos de uma Vaga (RH)

```typescript
async function buscarCandidatosVaga(vagaId: string, filtros?: {
  etapa?: string
  status?: string
}) {
  let query = supabase
    .from('candidaturas')
    .select(`
      *,
      candidatos(
        id,
        nome_completo,
        email,
        celular,
        cidade,
        estado
      ),
      scores_bigfive(score_total),
      scores_disc(perfil_dominante),
      scores_raven(classificacao)
    `)
    .eq('vaga_id', vagaId)

  if (filtros?.etapa) {
    query = query.eq('etapa_atual', filtros.etapa)
  }

  if (filtros?.status) {
    query = query.eq('status', filtros.status)
  }

  query = query.order('score_geral', { ascending: false, nullsFirst: false })

  const { data, error } = await query

  if (error) throw error
  return data
}
```

### Avançar Candidato para Próxima Etapa (RH)

```typescript
async function avancarCandidato(candidaturaId: string, usuarioRhId: string) {
  const { data, error } = await supabase.rpc('avancar_etapa', {
    candidatura_uuid: candidaturaId,
    usuario_rh_uuid: usuarioRhId,
  })

  if (error) throw error
  return data
}
```

### Rejeitar Candidato (RH)

```typescript
async function rejeitarCandidato(
  candidaturaId: string,
  usuarioRhId: string,
  motivo: string
) {
  const { data, error } = await supabase.rpc('rejeitar_candidato', {
    candidatura_uuid: candidaturaId,
    usuario_rh_uuid: usuarioRhId,
    motivo: motivo,
  })

  if (error) throw error
  return data
}
```

---

## 🔒 RLS Policies - Comportamento no Frontend

### Como RLS Funciona

**Row Level Security (RLS)** é uma camada de segurança no PostgreSQL que filtra automaticamente dados baseado no usuário autenticado. No frontend, você **não precisa** adicionar filtros manualmente - o Supabase faz isso por você.

### Exemplo: Candidatos

```typescript
// ❌ ERRADO: Adicionar filtro manualmente
const { data } = await supabase
  .from('candidatos')
  .select('*')
  .eq('user_id', session.user.id) // NÃO NECESSÁRIO!

// ✅ CORRETO: RLS filtra automaticamente
const { data } = await supabase
  .from('candidatos')
  .select('*')
// Retorna apenas o candidato do usuário autenticado
```

### RLS Policies por Tabela

#### **candidatos**
- ✅ Candidato vê apenas seus próprios dados
- ✅ RH (admin/recrutador/analista) vê todos os candidatos

```typescript
// Como candidato autenticado:
const { data } = await supabase.from('candidatos').select('*')
// Retorna: [{ id: 'meu-id', nome_completo: 'Meu Nome', ... }]

// Como RH autenticado:
const { data } = await supabase.from('candidatos').select('*')
// Retorna: TODOS os candidatos
```

#### **candidaturas**
- ✅ Candidato vê apenas suas próprias candidaturas
- ✅ RH vê candidaturas das vagas que tem acesso (Admin vê todas)

```typescript
// Como candidato:
const { data } = await supabase.from('candidaturas').select('*')
// Retorna: Apenas candidaturas onde candidato_id = meu_id

// Como RH (Recrutador):
const { data } = await supabase.from('candidaturas').select('*')
// Retorna: Candidaturas das vagas associadas ao recrutador
```

#### **vagas**
- ✅ Qualquer pessoa autenticada pode LER vagas ativas
- ✅ Apenas RH (Admin/Recrutador) pode CRIAR/EDITAR/DELETAR

```typescript
// Qualquer usuário autenticado:
const { data } = await supabase
  .from('vagas')
  .select('*')
  .eq('status', 'ativa')
// Retorna: Todas as vagas ativas

// Apenas RH pode criar:
const { data, error } = await supabase.from('vagas').insert({
  titulo: 'Nova Vaga',
  // ...
})
// error se não for RH
```

#### **respostas_bigfive, respostas_disc, respostas_raven**
- ✅ Candidato vê apenas suas próprias respostas
- ✅ RH vê respostas de candidatos de suas vagas

```typescript
// Como candidato:
const { data } = await supabase
  .from('respostas_bigfive')
  .select('*')
  .eq('candidatura_id', minhaCanditaturaId)
// Retorna: Apenas minhas respostas

// Como RH:
const { data } = await supabase
  .from('respostas_bigfive')
  .select('*')
  .eq('candidatura_id', candidaturaId)
// Retorna: Respostas se a candidatura for de vaga acessível
```

### Tratamento de Erros de Permissão

```typescript
try {
  const { data, error } = await supabase
    .from('candidatos')
    .update({ ativo: false })
    .eq('id', outroCandidatoId)

  if (error) {
    if (error.code === 'PGRST301') {
      // RLS rejeitou a operação
      console.error('Você não tem permissão para atualizar este candidato')
    } else {
      console.error('Erro:', error.message)
    }
  }
} catch (err) {
  console.error('Erro inesperado:', err)
}
```

---

## 📁 Storage - Upload de Arquivos

### Buckets Disponíveis

| Bucket | Privado | Tamanho Máx | Formatos Permitidos | Uso |
|--------|---------|-------------|---------------------|-----|
| `avatars` | ❌ Não | 2MB | jpg, jpeg, png, webp | Fotos de perfil |
| `curriculos` | ✅ Sim | 5MB | pdf, doc, docx | Currículos |
| `gravacoes-entrevistas` | ✅ Sim | 100MB | webm, mp4, mp3, wav | Transcrições |

### Upload de Avatar

```typescript
async function uploadAvatar(file: File, candidatoId: string) {
  // Validar tamanho (2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Arquivo muito grande. Máximo: 2MB')
  }

  // Validar formato
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Formato não permitido. Use: JPG, PNG ou WebP')
  }

  // Gerar nome único
  const fileExt = file.name.split('.').pop()
  const fileName = `${candidatoId}/avatar.${fileExt}`

  // Upload
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true, // Substituir avatar antigo
    })

  if (error) throw error

  // Obter URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  // Atualizar candidato com URL do avatar
  await supabase
    .from('candidatos')
    .update({ foto_perfil_url: publicUrl })
    .eq('id', candidatoId)

  return publicUrl
}
```

### Upload de Currículo

```typescript
async function uploadCurriculo(file: File, candidatoId: string, vagaId: string) {
  // Validar tamanho (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Arquivo muito grande. Máximo: 5MB')
  }

  // Validar formato
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Formato não permitido. Use: PDF, DOC ou DOCX')
  }

  // Estrutura de pastas: {candidato_id}/{vaga_id}/curriculo.{ext}
  const fileExt = file.name.split('.').pop()
  const fileName = `${candidatoId}/${vagaId}/curriculo.${fileExt}`

  // Upload (RLS permite apenas na própria pasta do candidato)
  const { data, error } = await supabase.storage
    .from('curriculos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw error

  return data.path
}
```

### Download de Arquivo (RH)

```typescript
async function downloadCurriculo(path: string) {
  const { data, error } = await supabase.storage
    .from('curriculos')
    .download(path)

  if (error) throw error

  // Criar URL para download
  const url = URL.createObjectURL(data)

  // Abrir em nova aba ou baixar
  const link = document.createElement('a')
  link.href = url
  link.download = path.split('/').pop() || 'curriculo.pdf'
  link.click()

  URL.revokeObjectURL(url)
}
```

### Deletar Arquivo

```typescript
async function deletarArquivo(bucket: string, path: string) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) throw error
}
```

---

## 🔔 Real-time Subscriptions

### Escutar Mudanças em Candidaturas

```typescript
function useRealtimeCandidaturas(candidatoId: string) {
  const [candidaturas, setCandidaturas] = useState<any[]>([])

  useEffect(() => {
    // Buscar dados iniciais
    supabase
      .from('candidaturas')
      .select('*')
      .eq('candidato_id', candidatoId)
      .then(({ data }) => {
        if (data) setCandidaturas(data)
      })

    // Escutar mudanças em tempo real
    const subscription = supabase
      .channel('candidaturas_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'candidaturas',
          filter: `candidato_id=eq.${candidatoId}`,
        },
        (payload) => {
          console.log('Change received!', payload)

          if (payload.eventType === 'INSERT') {
            setCandidaturas((prev) => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setCandidaturas((prev) =>
              prev.map((c) =>
                c.id === payload.new.id ? payload.new : c
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setCandidaturas((prev) =>
              prev.filter((c) => c.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [candidatoId])

  return candidaturas
}
```

### Escutar Novas Candidaturas (RH)

```typescript
function useNovasCandidaturas(vagaId: string) {
  useEffect(() => {
    const subscription = supabase
      .channel('novas_candidaturas')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'candidaturas',
          filter: `vaga_id=eq.${vagaId}`,
        },
        (payload) => {
          // Mostrar notificação
          console.log('Nova candidatura recebida:', payload.new)

          // Você pode disparar um toast/notification aqui
          toast.success('Nova candidatura recebida!')
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [vagaId])
}
```

---

## ⚠️ Error Handling

### Tipos Comuns de Erros

```typescript
import type { PostgrestError } from '@supabase/supabase-js'

function handleSupabaseError(error: PostgrestError) {
  // RLS rejection
  if (error.code === 'PGRST301' || error.code === '42501') {
    return 'Você não tem permissão para acessar este recurso.'
  }

  // Unique constraint violation
  if (error.code === '23505') {
    return 'Este registro já existe.'
  }

  // Foreign key violation
  if (error.code === '23503') {
    return 'Registro relacionado não encontrado.'
  }

  // Check constraint violation
  if (error.code === '23514') {
    return 'Valor inválido fornecido.'
  }

  // Not null violation
  if (error.code === '23502') {
    return 'Campo obrigatório não foi preenchido.'
  }

  // Generic error
  return error.message || 'Erro desconhecido.'
}
```

### Exemplo de Uso

```typescript
async function criarVaga(dados: any) {
  try {
    const { data, error } = await supabase
      .from('vagas')
      .insert(dados)
      .select()
      .single()

    if (error) {
      const errorMessage = handleSupabaseError(error)
      throw new Error(errorMessage)
    }

    return data
  } catch (err) {
    console.error('Erro ao criar vaga:', err)
    throw err
  }
}
```

---

## 📚 Próximos Passos

1. **Implementar Autenticação**
   - Sign up / Sign in
   - Email verification
   - Password recovery
   - Session management

2. **Criar Rotas Protegidas**
   - Middleware para verificar autenticação
   - Redirect para login se não autenticado

3. **Implementar Fluxo de Candidatura**
   - Landing page de vaga
   - Formulário de candidatura
   - Upload de currículo
   - Respostas de cultura

4. **Dashboard Candidato**
   - Minhas candidaturas
   - Status de cada etapa
   - Agendar entrevistas

5. **Dashboard RH**
   - Lista de vagas
   - Candidatos por vaga
   - Avançar/Rejeitar candidatos
   - Visualizar testes psicométricos

6. **Testes Psicométricos**
   - Big Five (100 questões)
   - DISC (28 questões)
   - Raven (60 questões com imagens)
   - Cultura (até 7 perguntas por vaga)

---

**Documentação Relacionada:**
- [Backend API Documentation](BACKEND_API_DOCUMENTATION.md)
- [RLS Policies Reference](RLS_POLICIES_REFERENCE.md)
- [Webhooks & N8N Integration](WEBHOOKS_N8N_INTEGRATION.md)
- [Test Report Consolidated](TEST_REPORT_CONSOLIDATED.md)
