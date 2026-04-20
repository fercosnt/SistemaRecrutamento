/**
 * Edge Function: cadastrar-candidato
 *
 * Registra um novo candidato executando operações privilegiadas server-side:
 * 1. `auth.admin.createUser` (com `email_confirm: true`) — requer service_role
 * 2. Insert em `public.candidatos` (bypassa RLS via service_role)
 * 3. Insert em `public.disponibilidade` (best-effort — tabela pode não existir
 *    no baseline atual; falha silenciosa registrada em log)
 * 4. Insert em `public.autorizacoes` (best-effort — idem)
 *
 * Rollback: se qualquer passo após createUser falhar de forma crítica, o
 * usuário Auth criado é removido via `auth.admin.deleteUser` para evitar
 * contas órfãs. Best-effort steps (disponibilidade, autorizacoes) NÃO
 * disparam rollback — falha de tabela inexistente não deve derrubar o cadastro.
 *
 * Contract (D-01b):
 *   body   -> ver `_shared/schemas.ts` (`cadastroCandidatoSchema`)
 *   return -> { ok: true,  data: { userId, candidatoId } }
 *          OR { ok: false, error: string }
 *
 * Chamado por: `src/features/cadastro/services/cadastroService.ts`
 * via `supabase.functions.invoke('cadastrar-candidato', { body })`.
 *
 * Segurança:
 * - Service role fica nas env vars do runtime (Deno.env), NUNCA retorna ao client
 * - Zod valida 100% do payload antes de qualquer operação no banco
 * - CPF é armazenado somente com dígitos (sem formatação) para consistência
 *   com a constraint UNIQUE
 * - IP do requester é registrado em `autorizacoes` para trilha LGPD
 *
 * @module supabase/functions/cadastrar-candidato
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { cadastroCandidatoSchema, type CadastroCandidatoInput } from '../_shared/schemas.ts'

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

/**
 * Headers CORS para permitir invocação pelo client browser via
 * `supabase.functions.invoke`. A própria biblioteca do Supabase JS adiciona
 * `authorization` (JWT anon) e `apikey`; respondemos ao preflight OPTIONS
 * aceitando esses cabeçalhos.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Helper para montar respostas JSON com headers CORS + Content-Type.
 */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Método não suportado' }, 405)
  }

  // ---- 1. Parse + validate body --------------------------------------------
  let input: CadastroCandidatoInput
  try {
    const rawBody = await req.json()
    const parsed = cadastroCandidatoSchema.safeParse(rawBody)
    if (!parsed.success) {
      const firstIssue = parsed.error.errors[0]
      const message = firstIssue?.message || 'Dados de cadastro inválidos'
      return jsonResponse({ ok: false, error: message }, 400)
    }
    input = parsed.data
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: 'Corpo da requisição inválido (JSON malformado)',
      },
      400,
    )
  }

  // ---- 2. Build service-role client ---------------------------------------
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[cadastrar-candidato] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env')
    return jsonResponse(
      { ok: false, error: 'Configuração do servidor indisponível' },
      500,
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ---- 3. Create auth user -------------------------------------------------
  const cleanedCpf = input.cpf.replace(/\D/g, '')
  const cleanedTelefone = input.telefone.replace(/\D/g, '')

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        nome_completo: input.nome_completo,
        cpf: cleanedCpf,
      },
    })

  if (authError || !authData?.user) {
    console.error('[cadastrar-candidato] auth.admin.createUser failed:', authError)
    // Mensagem amigável para o usuário: colidiu com email já cadastrado?
    const message =
      authError?.message?.toLowerCase().includes('already')
        ? 'Este email já está cadastrado.'
        : authError?.message || 'Não foi possível criar o usuário.'
    return jsonResponse({ ok: false, error: message }, 400)
  }

  const userId = authData.user.id

  // ---- 4. Insert candidato (crítico — falha dispara rollback) -------------
  // Schema real (baseline 20260419000000): candidatos tem coluna `celular`,
  // não `telefone`; endereço é flat (cep, logradouro, numero, bairro,
  // complemento, cidade, estado). cidade/estado são NOT NULL.
  const endereco = input.endereco ?? {}
  const candidatoPayload = {
    user_id: userId,
    nome_completo: input.nome_completo,
    email: input.email,
    celular: cleanedTelefone,
    cpf: cleanedCpf,
    data_nascimento: input.data_nascimento,
    genero: input.genero ?? null,
    cidade: endereco.cidade ?? '',
    estado: endereco.estado ?? '',
    cep: endereco.cep ?? null,
    logradouro: endereco.logradouro ?? null,
    numero: endereco.numero ?? null,
    bairro: endereco.bairro ?? null,
    complemento: endereco.complemento ?? null,
    instagram: input.instagram ?? null,
    linkedin: input.linkedin ?? null,
    como_conheceu: input.como_conheceu ?? null,
    como_conheceu_detalhes: input.como_conheceu_detalhes ?? null,
  }

  const { data: candidatoRow, error: candidatoError } = await supabaseAdmin
    .from('candidatos')
    .insert(candidatoPayload)
    .select('id')
    .single()

  if (candidatoError || !candidatoRow) {
    console.error('[cadastrar-candidato] insert candidatos failed:', candidatoError)
    // Rollback auth user para evitar conta órfã
    await supabaseAdmin.auth.admin.deleteUser(userId).catch((e) => {
      console.error('[cadastrar-candidato] rollback deleteUser failed:', e)
    })
    // Unique violation em cpf/email mapeia para mensagem amigável
    const raw = candidatoError?.message ?? ''
    const message = raw.includes('cpf')
      ? 'Este CPF já está cadastrado.'
      : raw.includes('email')
        ? 'Este email já está cadastrado.'
        : 'Não foi possível registrar o candidato.'
    return jsonResponse({ ok: false, error: message }, 400)
  }

  const candidatoId = candidatoRow.id as string

  // ---- 5. Insert disponibilidade (best-effort) -----------------------------
  // A tabela `disponibilidade` pode não existir no baseline atual (ver
  // `supabase/migrations/20260419000000_baseline.sql` — apenas candidatos,
  // vagas, usuarios_rh, candidaturas, logs_acesso). Inserimos se possível,
  // mas falha não deve bloquear o cadastro.
  let disponibilidadeId: string | undefined
  if (input.disponibilidade && Object.keys(input.disponibilidade).length > 0) {
    const { data: dispData, error: dispError } = await supabaseAdmin
      .from('disponibilidade')
      .insert({
        candidato_id: candidatoId,
        turno_preferido: input.disponibilidade.turno_preferido ?? null,
        modelo_trabalho: input.disponibilidade.modelo_trabalho ?? null,
        disponibilidade_imediata:
          input.disponibilidade.disponibilidade_imediata ?? false,
        data_disponibilidade: input.disponibilidade.data_disponibilidade ?? null,
      })
      .select('id')
      .maybeSingle()

    if (dispError) {
      // Best-effort: se a tabela não existe ou o schema mudou, registra
      // warning mas NÃO faz rollback — o candidato foi criado com sucesso.
      console.warn(
        '[cadastrar-candidato] disponibilidade insert skipped (best-effort):',
        dispError.message,
      )
    } else if (dispData) {
      disponibilidadeId = dispData.id as string
    }
  }

  // ---- 6. Insert autorizacoes LGPD (best-effort) ---------------------------
  // Trilha de auditoria LGPD: IP + timestamp + flags de consentimento.
  // Mesma lógica best-effort da disponibilidade.
  let autorizacoesId: string | undefined
  const ipAceite =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    null

  const { data: autData, error: autError } = await supabaseAdmin
    .from('autorizacoes')
    .insert({
      candidato_id: candidatoId,
      user_id: userId,
      autorizacao_uso_dados: input.autorizacoes.autorizacao_uso_dados,
      autorizacao_comunicacao: input.autorizacoes.autorizacao_comunicacao ?? true,
      autorizacao_retencao_curriculo:
        input.autorizacoes.autorizacao_retencao_curriculo ?? true,
      autorizacao_analise_video:
        input.autorizacoes.autorizacao_analise_video ?? false,
      ip_aceite: ipAceite,
      data_aceite: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle()

  if (autError) {
    console.warn(
      '[cadastrar-candidato] autorizacoes insert skipped (best-effort):',
      autError.message,
    )
  } else if (autData) {
    autorizacoesId = autData.id as string
  }

  // ---- 7. Success ----------------------------------------------------------
  return jsonResponse(
    {
      ok: true,
      data: {
        userId,
        candidatoId,
        disponibilidadeId,
        autorizacoesId,
      },
    },
    200,
  )
})
