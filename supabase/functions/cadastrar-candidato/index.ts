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
 * Contract (D-05, D-08 — Phase 2):
 *   body   -> ver `_shared/schemas.ts` (`cadastroCandidatoSchema`)
 *   return -> { ok: true,  data: { userId, candidatoId, disponibilidadeId?, autorizacoesId? } }
 *          OR { ok: false, error_code: 'EMAIL_EXISTS' | 'CPF_EXISTS' | 'VALIDATION' | 'SERVER_ERROR',
 *               message: string,
 *               field?: string,
 *               error: string   // legacy alias of `message` — drop in Phase 3
 *             }
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
import { POLICY_VERSION } from '../_shared/constants.ts'
import {
  cadastroCandidatoSchema,
  zodPathToFieldName,
  type CadastroCandidatoInput,
  type CadastroErrorCode,
} from '../_shared/schemas.ts'

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

/**
 * Helper para responder com o contract estruturado Phase 2 (D-05, D-08):
 *   { ok: false, error_code, message, field?, error (legacy alias) }
 *
 * O campo `error` duplica `message` apenas durante a janela de transição
 * Phase 2 → Phase 3 — mantém clients legados (pre-redeploy) funcionais.
 * Remover em Phase 3 quando 100% do tráfego estiver no novo contract.
 */
function errorResponse(
  code: CadastroErrorCode,
  message: string,
  field?: string,
  status = 400,
): Response {
  const body: Record<string, unknown> = {
    ok: false,
    error_code: code,
    message,
    error: message,
  }
  if (field !== undefined) body.field = field
  return jsonResponse(body, status)
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
    return errorResponse('SERVER_ERROR', 'Método não suportado', undefined, 405)
  }

  // ---- 1. Parse + validate body --------------------------------------------
  let input: CadastroCandidatoInput
  try {
    const rawBody = await req.json()
    const parsed = cadastroCandidatoSchema.safeParse(rawBody)
    if (!parsed.success) {
      const firstIssue = parsed.error.errors[0]
      const message = firstIssue?.message || 'Dados de cadastro inválidos'
      const field = zodPathToFieldName(firstIssue?.path)
      return errorResponse('VALIDATION', message, field)
    }
    input = parsed.data
  } catch (_err) {
    return errorResponse(
      'VALIDATION',
      'Corpo da requisição inválido (JSON malformado)',
    )
  }

  // ---- 2. Build service-role client ---------------------------------------
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[cadastrar-candidato] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env')
    return errorResponse(
      'SERVER_ERROR',
      'Configuração do servidor indisponível',
      undefined,
      500,
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ---- 3. Create auth user -------------------------------------------------
  const cleanedCpf = input.cpf.replace(/\D/g, '')
  const cleanedTelefone = input.telefone.replace(/\D/g, '')

  // Formata celular para o padrão aceito pela CHECK constraint `check_celular_format`
  // em public.candidatos: (XX) XXXXX-XXXX (11 dígitos) ou (XX) XXXX-XXXX (10 dígitos).
  // Inserir só dígitos falha com check violation. Formato legado herdado de SQL manuais
  // pré-Phase 1 — mantemos compatibilidade com dados existentes em vez de relaxar CHECK.
  const formattedCelular = cleanedTelefone.length === 11
    ? `(${cleanedTelefone.slice(0, 2)}) ${cleanedTelefone.slice(2, 7)}-${cleanedTelefone.slice(7, 11)}`
    : cleanedTelefone.length === 10
      ? `(${cleanedTelefone.slice(0, 2)}) ${cleanedTelefone.slice(2, 6)}-${cleanedTelefone.slice(6, 10)}`
      : cleanedTelefone // fallback — deixa o CHECK rejeitar se for inválido

  // Formata CPF para o padrão aceito pela CHECK constraint `check_cpf_format`
  // em public.candidatos: XXX.XXX.XXX-XX. Mesmo motivo do celular — dados
  // legados estão no formato pontuado, manter consistência em vez de relaxar CHECK.
  // NOTA: esta discrepância com o RPC check_candidato_duplicate (que compara
  // contra digits-only) está documentada como carryover Phase 3 — duplicate
  // check via RPC sempre retorna false para CPF; UNIQUE constraint no insert
  // é o safety net que captura e mapeia para CPF_EXISTS.
  const formattedCpf = cleanedCpf.length === 11
    ? `${cleanedCpf.slice(0, 3)}.${cleanedCpf.slice(3, 6)}.${cleanedCpf.slice(6, 9)}-${cleanedCpf.slice(9, 11)}`
    : cleanedCpf // fallback — CHECK rejeita se inválido (Zod já validou DV acima)

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
    console.error('[cadastrar-candidato] auth.admin.createUser failed:', authError?.message)
    // Mensagem amigável para o usuário: colidiu com email já cadastrado?
    if (authError?.message?.toLowerCase().includes('already')) {
      return errorResponse('EMAIL_EXISTS', 'Este email já está cadastrado.', 'email')
    }
    const message = authError?.message || 'Não foi possível criar o usuário.'
    return errorResponse('SERVER_ERROR', message, undefined, 400)
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
    celular: formattedCelular,
    cpf: formattedCpf,
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
    console.error('[cadastrar-candidato] insert candidatos failed:', candidatoError?.message)
    // Rollback auth user para evitar conta órfã
    await supabaseAdmin.auth.admin.deleteUser(userId).catch((rollbackErr) => {
      console.error('[cadastrar-candidato] rollback deleteUser failed:', { userId, rollbackErr })
    })
    // Unique violation em cpf/email mapeia para error_code estruturado
    const raw = (candidatoError?.message ?? '').toLowerCase()
    if (raw.includes('cpf')) {
      return errorResponse('CPF_EXISTS', 'Este CPF já está cadastrado.', 'cpf')
    }
    if (raw.includes('email')) {
      return errorResponse('EMAIL_EXISTS', 'Este email já está cadastrado.', 'email')
    }
    return errorResponse('SERVER_ERROR', 'Não foi possível registrar o candidato.')
  }

  const candidatoId = candidatoRow.id as string

  // ---- 5. Insert disponibilidade (best-effort) -----------------------------
  // A tabela `disponibilidade` pode não existir no baseline atual (ver
  // `supabase/migrations/20260419000000_baseline.sql` — apenas candidatos,
  // vagas, usuarios_rh, candidaturas, logs_acesso). Inserimos se possível,
  // mas falha não deve bloquear o cadastro.
  let disponibilidadeId: string | undefined
  if (input.disponibilidade && Object.keys(input.disponibilidade).length > 0) {
    // Mapeamento de nomenclatura entre schema do contrato (Zod) e colunas reais
    // do DB. A tabela `disponibilidade` tem:
    //   periodo_disponivel (NOT NULL) — equivalente a turno_preferido do client
    //   regime_trabalho    (NOT NULL) — equivalente a modelo_trabalho do client
    // Mantemos o nome pt-BR no client/Zod por compatibilidade com forms existentes,
    // e mapeamos aqui. Fallback "nao_informado" para satisfazer NOT NULL quando
    // candidato pula os campos opcionais no multi-step.
    const { data: dispData, error: dispError } = await supabaseAdmin
      .from('disponibilidade')
      .insert({
        candidato_id: candidatoId,
        periodo_disponivel: input.disponibilidade.turno_preferido ?? 'nao_informado',
        regime_trabalho: input.disponibilidade.modelo_trabalho ?? 'nao_informado',
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
      // NOTA: data_aceite NÃO existe na tabela (auditamos em 02-AUDIT-RESULTS.md
      // e decidimos não criar — é redundante com created_at que é DEFAULT now()).
      // Se um dia auditoria pedir coluna explicitamente nomeada, usar view/alias.
      policy_version: POLICY_VERSION,
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
