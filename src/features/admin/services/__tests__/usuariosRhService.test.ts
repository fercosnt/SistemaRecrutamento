/**
 * Phase 29 / Plan 29-01 Task 2 — `usuariosRhService` contract test (USR-01..05).
 *
 * Asserts the EXACT contracts the console data layer must satisfy — the same idioms
 * the Phase-10/15 triagem/decisao service tests encode:
 *  - ALLOWLIST projection on `listUsuariosRh` (the exact 9-column string, NEVER
 *    `select('*')`, NEVER off-list PII cols) — RLS is row-level and does NOT hide
 *    columns ([[reference_select_star_leaks_pii]], T-29-01).
 *  - all 5 write actions dispatch through `functions.invoke('gerenciar-usuario-rh')`
 *    with the EF's exact discriminated-union body — the client NEVER writes
 *    `usuarios_rh` directly (T-29-02).
 *  - every EF `error_code` round-trips to `.details.error_code`; UNAUTHORIZED is a
 *    DISTINCT session-expired outcome; EMAIL_SEND_FAILED is success-with-warning
 *    (resolve, NOT throw).
 *  - CONTRACT-DRIFT guard: a body built from a valid NovoUsuarioForm parses under the
 *    EF's OWN shared `.strict()` schema — the client↔EF contract cannot drift
 *    ([[feedback_integration_contract_gap]]).
 *
 * @see src/features/decisao/services/__tests__/decisaoService.test.ts (the mock idiom)
 * @see src/features/cadastro/__tests__/submitCandidaturaContract.test.ts (shared-schema drift guard)
 * @see .planning/phases/29-console-de-gest-o-de-usu-rios-rh/29-01-PLAN.md (Task 2)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the supabase client BEFORE importing the service ──────────────────────
// Capture the .select() projection and the functions.invoke() calls to assert the
// allowlist + the EF contract without a network round-trip.
const { selects, invokeMock, fromMock, orderMock } = vi.hoisted(() => ({
  selects: [] as string[],
  invokeMock: vi.fn(),
  fromMock: vi.fn(),
  orderMock: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      selects.push(cols)
      return q
    })
    // `.order()` is the terminal await for listUsuariosRh (`.select().order()`).
    q.order = orderMock
    return q
  }
  fromMock.mockImplementation(() => makeQuery())
  return {
    supabase: {
      from: fromMock,
      functions: { invoke: invokeMock },
    },
  }
})

import {
  listUsuariosRh,
  criarUsuario,
  mudarPapel,
  ativarDesativar,
  resetarSenha,
  USUARIOS_RH_LIST_COLUMNS,
} from '../usuariosRhService'
import { novoUsuarioSchema } from '../../schemas/usuarioRhSchemas'
// The SAME shared module the EF imports (Deno via import-map, Node via node_modules —
// byte-identical zod 3.25.76). Importing it here is what makes the drift guard real.
import { gerenciarUsuarioRhSchema } from '../../../../../supabase/functions/_shared/usuario-rh-schemas'

const TARGET = '33333333-3333-4333-8333-333333333333'
const VALID_FORM = {
  email: 'novo@beautysmile.com.br',
  nome_completo: 'Novo Usuário',
  cargo: 'Recrutador',
  papel: 'recrutador' as const,
}

beforeEach(() => {
  selects.length = 0
  invokeMock.mockReset()
  orderMock.mockReset()
  orderMock.mockResolvedValue({ data: [], error: null })
  fromMock.mockClear()
})

describe('usuariosRhService — listUsuariosRh (USR-01 allowlist read, T-29-01)', () => {
  it('reads usuarios_rh with the EXACT 9-column allowlist (never *)', async () => {
    await listUsuariosRh()
    expect(fromMock).toHaveBeenCalledWith('usuarios_rh')
    expect(selects).toContain(USUARIOS_RH_LIST_COLUMNS)
    expect(USUARIOS_RH_LIST_COLUMNS).toBe(
      'id, user_id, nome_completo, email, cargo, role, ativo, primeiro_acesso, data_ultimo_login',
    )
  })

  it('NEVER projects the wildcard or off-allowlist PII columns', async () => {
    await listUsuariosRh()
    const proj = selects.join(' | ')
    expect(proj).not.toContain('*')
    expect(proj).not.toContain('avatar_url')
    expect(proj).not.toContain('telefone')
    expect(proj).not.toContain('created_by')
    expect(proj).not.toContain('deleted_at')
  })

  it('returns the typed roster rows on success', async () => {
    const rows = [
      {
        id: 'u1',
        user_id: 'a1',
        nome_completo: 'Ana',
        email: 'ana@x.com',
        cargo: 'RH',
        role: 'administrador',
        ativo: true,
        primeiro_acesso: false,
        data_ultimo_login: null,
      },
    ]
    orderMock.mockResolvedValue({ data: rows, error: null })
    await expect(listUsuariosRh()).resolves.toEqual(rows)
  })

  it('throws DATABASE_ERROR when the roster read fails', async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(listUsuariosRh()).rejects.toMatchObject({ code: 'DATABASE_ERROR' })
  })
})

describe('usuariosRhService — writes dispatch through the EF (USR-02..05, T-29-02)', () => {
  it('criarUsuario invokes gerenciar-usuario-rh with action:criar + the form fields', async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, data: { userId: 'x', usuarioRhId: 'y' } },
      error: null,
    })
    await criarUsuario(VALID_FORM)
    expect(invokeMock).toHaveBeenCalledWith(
      'gerenciar-usuario-rh',
      expect.objectContaining({
        body: expect.objectContaining({
          action: 'criar',
          email: 'novo@beautysmile.com.br',
          nome_completo: 'Novo Usuário',
          cargo: 'Recrutador',
          papel: 'recrutador',
        }),
      }),
    )
  })

  it('criarUsuario safeParses the input BEFORE invoking (INVALID_INPUT, no network)', async () => {
    await expect(
      criarUsuario({ ...VALID_FORM, email: 'not-an-email' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('mudarPapel invokes action:mudar_papel with target_id + novo_papel', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null })
    await mudarPapel(TARGET, 'administrador')
    expect(invokeMock).toHaveBeenCalledWith(
      'gerenciar-usuario-rh',
      expect.objectContaining({
        body: { action: 'mudar_papel', target_id: TARGET, novo_papel: 'administrador' },
      }),
    )
  })

  it('ativarDesativar sends action:ativar when ativar=true', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null })
    await ativarDesativar(TARGET, true)
    expect(invokeMock).toHaveBeenCalledWith(
      'gerenciar-usuario-rh',
      expect.objectContaining({ body: { action: 'ativar', target_id: TARGET } }),
    )
  })

  it('ativarDesativar sends action:desativar when ativar=false', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null })
    await ativarDesativar(TARGET, false)
    expect(invokeMock).toHaveBeenCalledWith(
      'gerenciar-usuario-rh',
      expect.objectContaining({ body: { action: 'desativar', target_id: TARGET } }),
    )
  })

  it('resetarSenha invokes action:resetar_senha with target_id', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null })
    await resetarSenha(TARGET)
    expect(invokeMock).toHaveBeenCalledWith(
      'gerenciar-usuario-rh',
      expect.objectContaining({ body: { action: 'resetar_senha', target_id: TARGET } }),
    )
  })

  it('row writes resolve { ok:true } on success', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null })
    await expect(mudarPapel(TARGET, 'recrutador')).resolves.toMatchObject({ ok: true })
  })
})

describe('usuariosRhService — error_code mapping (every code → .details.error_code)', () => {
  const CODES = [
    'LAST_ADMIN',
    'EMAIL_EXISTS',
    'VALIDATION',
    'FORBIDDEN',
    'NOT_FOUND',
    'SERVER_ERROR',
    'UNAUTHORIZED',
  ] as const

  it.each(CODES)('maps EF { ok:false, error_code:%s } onto .details.error_code', async (code) => {
    invokeMock.mockResolvedValue({ data: { ok: false, error_code: code, message: 'x' }, error: null })
    await expect(mudarPapel(TARGET, 'recrutador')).rejects.toMatchObject({
      details: expect.objectContaining({ error_code: code }),
    })
  })

  it('EMAIL_EXISTS surfaces error_code + field=email (create dialog routing)', async () => {
    invokeMock.mockResolvedValue({
      data: { ok: false, error_code: 'EMAIL_EXISTS', message: 'exists', field: 'email' },
      error: null,
    })
    await expect(criarUsuario(VALID_FORM)).rejects.toMatchObject({
      details: expect.objectContaining({ error_code: 'EMAIL_EXISTS', field: 'email' }),
    })
  })

  it('UNAUTHORIZED throws a DISTINCT session-expired outcome (code UNAUTHORIZED, not the generic bucket)', async () => {
    invokeMock.mockResolvedValue({ data: { ok: false, error_code: 'UNAUTHORIZED', message: 'x' }, error: null })
    await expect(resetarSenha(TARGET)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      details: expect.objectContaining({ error_code: 'UNAUTHORIZED' }),
    })
  })

  it('a transport error surfaces the error_code via extractEfErrorCode (context.json body)', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { context: { json: async () => ({ error_code: 'SERVER_ERROR' }) } },
    })
    await expect(resetarSenha(TARGET)).rejects.toMatchObject({
      details: expect.objectContaining({ error_code: 'SERVER_ERROR' }),
    })
  })
})

describe('usuariosRhService — EMAIL_SEND_FAILED is success-with-warning (NOT a throw)', () => {
  it('criarUsuario resolves { ok:true, warning } when the EF reports EMAIL_SEND_FAILED', async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, data: { userId: 'x', usuarioRhId: 'y' }, warning: 'EMAIL_SEND_FAILED' },
      error: null,
    })
    const result = await criarUsuario(VALID_FORM)
    expect(result).toMatchObject({ ok: true, warning: 'EMAIL_SEND_FAILED' })
  })

  it('resetarSenha resolves { ok:true, warning } when the reset email fails to send', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true, warning: 'EMAIL_SEND_FAILED' }, error: null })
    await expect(resetarSenha(TARGET)).resolves.toMatchObject({
      ok: true,
      warning: 'EMAIL_SEND_FAILED',
    })
  })
})

describe('usuariosRhService — client↔EF contract-drift guard (feedback_integration_contract_gap)', () => {
  it('a criar body built from a valid NovoUsuarioForm parses under the EF _shared .strict() schema', () => {
    const body = { action: 'criar' as const, ...novoUsuarioSchema.parse(VALID_FORM) }
    expect(gerenciarUsuarioRhSchema.safeParse(body).success).toBe(true)
  })

  it('a mudar_papel body parses under the EF _shared schema', () => {
    const body = { action: 'mudar_papel' as const, target_id: TARGET, novo_papel: 'administrador' as const }
    expect(gerenciarUsuarioRhSchema.safeParse(body).success).toBe(true)
  })

  it('the EF _shared schema REJECTS an injected extra key (fail-closed .strict())', () => {
    const tampered = { action: 'criar' as const, ...novoUsuarioSchema.parse(VALID_FORM), role: 'administrador' }
    expect(gerenciarUsuarioRhSchema.safeParse(tampered).success).toBe(false)
  })
})
