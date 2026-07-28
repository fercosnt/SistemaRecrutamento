/**
 * `usuariosRhService` — the RH user-management console data layer (USR-01..05).
 *
 * Two responsibilities, both consuming ALREADY-SHIPPED Phase-28 backend surface:
 *   - `listUsuariosRh` — an ALLOWLIST read of `usuarios_rh` (the admin-only RLS
 *     delivers the full roster; no EF needed for the read). NEVER the wildcard
 *     projection — RLS is row-level and does NOT hide columns; the roster is PII
 *     ([[reference_select_star_leaks_pii]], T-29-01).
 *   - `criarUsuario` / `mudarPapel` / `ativarDesativar` / `resetarSenha` — the 5
 *     privileged write actions, ALL dispatched through the single secure EF
 *     `gerenciar-usuario-rh` (authenticate-THEN-authorize, Phase 28). The client
 *     NEVER writes `usuarios_rh` directly (T-29-02); no service_role in the bundle.
 *
 * The EF's structured `{ ok, error_code, message, field? }` contract is normalized
 * here: transport errors and `{ ok:false }` bodies BOTH surface the `error_code` on
 * `.details.error_code` (via the shared `extractEfErrorCode`, code-only/never-PII) so
 * the hook layer can branch the pt-BR toast copy. `EMAIL_SEND_FAILED` is
 * success-with-warning (resolve, NOT throw). `UNAUTHORIZED` (expired session) is a
 * DISTINCT outcome, not the generic bucket.
 *
 * The create body is built from `novoUsuarioSchema` (safeParse BEFORE invoke), which
 * MIRRORS the EF's own `.strict()` `criar` branch — the client↔EF contract cannot
 * drift silently ([[feedback_integration_contract_gap]]).
 *
 * @module features/admin/services/usuariosRhService
 * @see supabase/functions/_shared/usuario-rh-schemas.ts (the EF request contract)
 * @see src/features/decisao/services/decisaoService.ts (invoke + extractEfErrorCode + error class analog)
 * @see src/features/admin/bias-audit/services/biasAuditService.ts (allowlist read idiom)
 */

import { supabase } from '@/lib/supabase/client'
import { extractEfErrorCode } from '@/lib/efErrors'
import type { Database } from '../../../../database.types'
import { novoUsuarioSchema, type NovoUsuarioForm, type Papel } from '../schemas/usuarioRhSchemas'

/** Erro do serviço de usuários RH (espelha DecisaoServiceError). Carrega o `error_code` da EF em `.details`. */
export class UsuariosRhServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: { error_code?: string; field?: string; raw?: unknown },
  ) {
    super(message)
    this.name = 'UsuariosRhServiceError'
  }
}

/**
 * Uma linha do roster — a projeção ALLOWLIST exata (9 colunas), tipada da Row de
 * `usuarios_rh`. NUNCA inclui `avatar_url` / `telefone` / `created_by` / `updated_by`
 * / `deleted_at` (não usadas pela UI e PII interna).
 */
export type UsuarioRhRow = Pick<
  Database['public']['Tables']['usuarios_rh']['Row'],
  | 'id'
  | 'user_id'
  | 'nome_completo'
  | 'email'
  | 'cargo'
  | 'role'
  | 'ativo'
  | 'primeiro_acesso'
  | 'data_ultimo_login'
>

/** Allowlist de colunas — nunca a estrela (T-29-01 / [[reference_select_star_leaks_pii]]). */
export const USUARIOS_RH_LIST_COLUMNS =
  'id, user_id, nome_completo, email, cargo, role, ativo, primeiro_acesso, data_ultimo_login'

/** Resultado de uma escrita de linha (mudar_papel / ativar / desativar / resetar_senha). */
export interface WriteResult {
  ok: true
  /** `EMAIL_SEND_FAILED` quando a ação teve sucesso mas o email não pôde ser enviado. */
  warning?: string
}

/** Resultado do criar — carrega os ids retornados pela EF além do warning opcional. */
export interface CriarResult extends WriteResult {
  data?: { userId: string; usuarioRhId: string }
}

/**
 * Mapeia um `error_code` da EF para o `UsuariosRhServiceError` correto (código + cópia
 * base). O `.details.error_code` é a fonte que o hook lê para a cópia pt-BR final;
 * `UNAUTHORIZED` recebe um código DISTINTO (sessão expirada), não o balde genérico.
 */
function toServiceError(
  error_code: string | undefined,
  details: { error_code?: string; field?: string; raw?: unknown },
): UsuariosRhServiceError {
  switch (error_code) {
    case 'UNAUTHORIZED':
      return new UsuariosRhServiceError('Sua sessão expirou. Entre novamente.', 'UNAUTHORIZED', details)
    case 'NOT_FOUND':
      return new UsuariosRhServiceError('Usuário não encontrado.', 'NOT_FOUND', details)
    case 'EMAIL_EXISTS':
      return new UsuariosRhServiceError('Já existe um usuário com este e-mail.', 'INVALID_INPUT', details)
    case 'VALIDATION':
      return new UsuariosRhServiceError(
        'Dados inválidos. Verifique os campos e tente novamente.',
        'INVALID_INPUT',
        details,
      )
    case 'LAST_ADMIN':
      return new UsuariosRhServiceError(
        'Não é possível remover o último administrador ativo do sistema.',
        'NETWORK_ERROR',
        details,
      )
    default:
      // FORBIDDEN / SERVER_ERROR / undefined → balde genérico (a cópia final é do hook).
      return new UsuariosRhServiceError(
        'Não foi possível concluir a ação. Tente novamente.',
        'NETWORK_ERROR',
        details,
      )
  }
}

/**
 * Invoca a EF `gerenciar-usuario-rh` com um corpo já montado e normaliza a resposta.
 * Erros de transporte E corpos `{ ok:false }` fazem throw carregando `error_code` em
 * `.details`; um `{ ok:true }` (com ou sem `warning`) resolve.
 */
async function invokeWrite(
  body: Record<string, unknown>,
): Promise<{ ok: true; warning?: string; data?: unknown }> {
  const { data, error } = await supabase.functions.invoke('gerenciar-usuario-rh', { body })

  // Code-only, never PII (ASVS V7). Lê de AMBOS: o body 200 e o FunctionsHttpError não-2xx.
  const error_code = await extractEfErrorCode(data, error)

  if (error) {
    throw toServiceError(error_code, { error_code, raw: error })
  }

  // Forward-compat guard: today the EF signals failure via a non-2xx status (`error` above),
  // so a 2xx body with `ok:false` is currently unreachable. Kept intentionally for a future
  // EF shape that reports failures in a 200 envelope — do NOT remove (IN-02).
  if (data && (data as { ok?: boolean }).ok === false) {
    const field = (data as { field?: string }).field
    throw toServiceError(error_code, { error_code, field, raw: data })
  }

  const ok = (data ?? {}) as { warning?: string; data?: unknown }
  return { ok: true, warning: ok.warning, data: ok.data }
}

/**
 * Lê o roster completo de `usuarios_rh` (USR-01) com o allowlist explícito, ordenado
 * por nome. A RLS admin-only já entrega apenas o que o `administrador` pode ver.
 */
export async function listUsuariosRh(): Promise<UsuarioRhRow[]> {
  const { data, error } = await supabase
    .from('usuarios_rh')
    .select(USUARIOS_RH_LIST_COLUMNS)
    .order('nome_completo', { ascending: true })

  if (error) {
    throw new UsuariosRhServiceError(
      `Não foi possível carregar os usuários: ${error.message}`,
      'DATABASE_ERROR',
      { raw: error },
    )
  }

  return (data ?? []) as unknown as UsuarioRhRow[]
}

/**
 * Cria um novo usuário RH (USR-02). SafeParse ANTES do invoke (o mesmo shape que a EF
 * re-valida com `.strict()`); um `EMAIL_SEND_FAILED` retorna sucesso-com-aviso.
 */
export async function criarUsuario(input: NovoUsuarioForm): Promise<CriarResult> {
  const parsed = novoUsuarioSchema.safeParse(input)
  if (!parsed.success) {
    throw new UsuariosRhServiceError('Dados do novo usuário inválidos.', 'INVALID_INPUT', {
      raw: parsed.error,
    })
  }

  const result = await invokeWrite({ action: 'criar', ...parsed.data })
  return { ok: true, warning: result.warning, data: result.data as CriarResult['data'] }
}

/** Muda o papel de um usuário RH (USR-03) via `action:'mudar_papel'`. */
export async function mudarPapel(targetId: string, novoPapel: Papel): Promise<WriteResult> {
  const result = await invokeWrite({ action: 'mudar_papel', target_id: targetId, novo_papel: novoPapel })
  return { ok: true, warning: result.warning }
}

/** Ativa (true) ou desativa (false) um usuário RH (USR-04) via `action:'ativar'|'desativar'`. */
export async function ativarDesativar(targetId: string, ativar: boolean): Promise<WriteResult> {
  const result = await invokeWrite({ action: ativar ? 'ativar' : 'desativar', target_id: targetId })
  return { ok: true, warning: result.warning }
}

/** Dispara o reset de senha de um usuário RH (USR-05) via `action:'resetar_senha'`. */
export async function resetarSenha(targetId: string): Promise<WriteResult> {
  const result = await invokeWrite({ action: 'resetar_senha', target_id: targetId })
  return { ok: true, warning: result.warning }
}

/** Superfície namespaced do serviço (espelha `decisaoService`). */
export const usuariosRhService = {
  listUsuariosRh,
  criarUsuario,
  mudarPapel,
  ativarDesativar,
  resetarSenha,
}
