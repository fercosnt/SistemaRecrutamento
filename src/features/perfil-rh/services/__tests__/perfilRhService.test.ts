/**
 * Phase 30 / Plan 30-04 Task 1 — `perfilRhService` contract test (PERFIL-01/02/03).
 *
 * Asserts the EXACT contracts the profile data layer must satisfy:
 *  - ALLOWLIST projection on `readMeuPerfil` (the exact 7-column string, NEVER `select('*')`)
 *    filtered by `.eq('user_id', uid)` — RLS is row-level and does NOT hide columns
 *    ([[reference_select_star_leaks_pii]], T-30-06).
 *  - `atualizarPerfil` dispatches to `rpc('atualizar_meu_perfil_rh', {p_nome, p_avatar_url})`;
 *    a name-only save passes `p_avatar_url: null`.
 *  - `alterarSenha` re-auths via `signInWithPassword({email, password: current})` BEFORE
 *    `updateUser({password: new})`; a wrong current password → WRONG_CURRENT (field), NO
 *    signOut (no logout).
 *  - `validateAvatar` rejects >2MB (FILE_TOO_LARGE) + non-png/jpeg/webp (INVALID_MIME).
 *  - `uploadAvatar` writes `{uid}/avatar.<ext>` with `upsert:true` and returns the PATH.
 *
 * @see src/features/admin/services/__tests__/usuariosRhService.test.ts (the mock idiom)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the supabase client BEFORE importing the service ──────────────────────
const {
  selects,
  eqMock,
  singleMock,
  rpcMock,
  signInMock,
  updateUserMock,
  signOutMock,
  uploadMock,
  createSignedUrlMock,
  fromMock,
  storageFromMock,
} = vi.hoisted(() => ({
  selects: [] as string[],
  eqMock: vi.fn(),
  singleMock: vi.fn(),
  rpcMock: vi.fn(),
  signInMock: vi.fn(),
  updateUserMock: vi.fn(),
  signOutMock: vi.fn(),
  uploadMock: vi.fn(),
  createSignedUrlMock: vi.fn(),
  fromMock: vi.fn(),
  storageFromMock: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      selects.push(cols)
      return q
    })
    q.eq = eqMock.mockImplementation(() => q)
    q.single = singleMock
    return q
  }
  fromMock.mockImplementation(() => makeQuery())
  storageFromMock.mockImplementation(() => ({
    upload: uploadMock,
    createSignedUrl: createSignedUrlMock,
  }))
  return {
    supabase: {
      from: fromMock,
      rpc: rpcMock,
      auth: {
        signInWithPassword: signInMock,
        updateUser: updateUserMock,
        signOut: signOutMock,
      },
      storage: { from: storageFromMock },
    },
  }
})

import {
  readMeuPerfil,
  atualizarPerfil,
  alterarSenha,
  validateAvatar,
  uploadAvatar,
  getAvatarSignedUrl,
  PerfilRhServiceError,
  PERFIL_RH_COLUMNS,
} from '../perfilRhService'

const UID = '11111111-1111-4111-8111-111111111111'

/** Builds a fake File with a controllable size + MIME (jsdom File.size follows the blob). */
function makeFile(bytes: number, type: string): File {
  const blob = new Blob([new Uint8Array(bytes)], { type })
  return new File([blob], 'avatar', { type })
}

beforeEach(() => {
  vi.clearAllMocks()
  selects.length = 0
})

describe('readMeuPerfil — own-row allowlist read (T-30-06)', () => {
  it('selects the EXACT 7-column allowlist (no wildcard) filtered by user_id', async () => {
    singleMock.mockResolvedValue({
      data: {
        id: 'row-1',
        user_id: UID,
        nome_completo: 'Ana',
        email: 'ana@bs.com',
        cargo: 'Recrutadora',
        role: 'recrutador',
        avatar_url: null,
      },
      error: null,
    })

    const row = await readMeuPerfil(UID)

    // The projection is the exact allowlist — and contains NO wildcard.
    expect(selects).toContain(PERFIL_RH_COLUMNS)
    expect(PERFIL_RH_COLUMNS).not.toContain('*')
    expect(selects.every((s) => !s.includes('*'))).toBe(true)
    // Filtered by the caller's own user_id.
    expect(eqMock).toHaveBeenCalledWith('user_id', UID)
    expect(row.nome_completo).toBe('Ana')
  })

  it('throws DATABASE_ERROR on a read error', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(readMeuPerfil(UID)).rejects.toMatchObject({ code: 'DATABASE_ERROR' })
  })
})

describe('atualizarPerfil — RPC dispatch (PERFIL-01)', () => {
  it('dispatches to atualizar_meu_perfil_rh with p_nome + p_avatar_url', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    await atualizarPerfil('Novo Nome', 'uid/avatar.png')
    expect(rpcMock).toHaveBeenCalledWith('atualizar_meu_perfil_rh', {
      p_nome: 'Novo Nome',
      p_avatar_url: 'uid/avatar.png',
    })
  })

  it('a name-only save omits the avatar arg (p_avatar_url: undefined → RPC keeps existing via COALESCE)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    await atualizarPerfil('Só Nome')
    expect(rpcMock).toHaveBeenCalledWith('atualizar_meu_perfil_rh', {
      p_nome: 'Só Nome',
      p_avatar_url: undefined,
    })
  })

  it('throws DATABASE_ERROR on an RPC error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'nope' } })
    await expect(atualizarPerfil('X')).rejects.toMatchObject({ code: 'DATABASE_ERROR' })
  })
})

describe('alterarSenha — GoTrue re-auth (PERFIL-02, T-30-03)', () => {
  it('re-auths with signInWithPassword BEFORE updateUser, no logout', async () => {
    signInMock.mockResolvedValue({ data: {}, error: null })
    updateUserMock.mockResolvedValue({ data: {}, error: null })

    await alterarSenha('ana@bs.com', 'atual123', 'novaSenha8')

    expect(signInMock).toHaveBeenCalledWith({ email: 'ana@bs.com', password: 'atual123' })
    expect(updateUserMock).toHaveBeenCalledWith({ password: 'novaSenha8' })
    // Order: signIn resolved before updateUser was called.
    expect(signInMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateUserMock.mock.invocationCallOrder[0],
    )
    // No logout.
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('a wrong current password → WRONG_CURRENT and never rotates', async () => {
    signInMock.mockResolvedValue({
      data: {},
      error: { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' },
    })

    await expect(alterarSenha('ana@bs.com', 'errada', 'novaSenha8')).rejects.toMatchObject({
      code: 'WRONG_CURRENT',
    })
    // Rotation never attempted after a failed re-auth.
    expect(updateUserMock).not.toHaveBeenCalled()
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('a 429 rate-limit on re-auth maps to NETWORK_ERROR (NOT WRONG_CURRENT)', async () => {
    // A transient signIn failure did NOT verify the password one way or the other —
    // surfacing WRONG_CURRENT here would falsely accuse the user (WR-01).
    signInMock.mockResolvedValue({
      data: {},
      error: { code: 'over_request_rate_limit', status: 429, message: 'Rate limit exceeded' },
    })

    await expect(alterarSenha('ana@bs.com', 'atual123', 'novaSenha8')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    })
    // Never rotates after a failed re-auth.
    expect(updateUserMock).not.toHaveBeenCalled()
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('a network/5xx error on re-auth maps to NETWORK_ERROR (NOT WRONG_CURRENT)', async () => {
    signInMock.mockResolvedValue({
      data: {},
      error: { code: undefined, status: 503, message: 'Service unavailable' },
    })

    await expect(alterarSenha('ana@bs.com', 'atual123', 'novaSenha8')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    })
    expect(updateUserMock).not.toHaveBeenCalled()
  })

  it('a weak new password maps to WEAK_PASSWORD', async () => {
    signInMock.mockResolvedValue({ data: {}, error: null })
    updateUserMock.mockResolvedValue({
      data: {},
      error: { code: 'weak_password', status: 422, message: 'Password is too weak' },
    })

    await expect(alterarSenha('ana@bs.com', 'atual123', 'fraca123')).rejects.toMatchObject({
      code: 'WEAK_PASSWORD',
    })
  })
})

describe('validateAvatar — client-side UX guard (PERFIL-03)', () => {
  it('rejects a file > 2MB with FILE_TOO_LARGE', () => {
    const big = makeFile(2 * 1024 * 1024 + 1, 'image/png')
    expect(() => validateAvatar(big)).toThrow(PerfilRhServiceError)
    try {
      validateAvatar(big)
    } catch (e) {
      expect((e as PerfilRhServiceError).code).toBe('FILE_TOO_LARGE')
    }
  })

  it('rejects a non-png/jpeg/webp MIME with INVALID_MIME', () => {
    const pdf = makeFile(10, 'application/pdf')
    try {
      validateAvatar(pdf)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as PerfilRhServiceError).code).toBe('INVALID_MIME')
    }
  })

  it('passes for a valid png under the cap', () => {
    expect(() => validateAvatar(makeFile(1024, 'image/png'))).not.toThrow()
  })
})

describe('uploadAvatar — own-folder stable path (PERFIL-03)', () => {
  it('writes {uid}/avatar.<ext> with upsert:true and returns the PATH', async () => {
    uploadMock.mockResolvedValue({ data: { path: `${UID}/avatar.jpg` }, error: null })
    const file = makeFile(1024, 'image/jpeg')

    const path = await uploadAvatar(file, UID)

    expect(storageFromMock).toHaveBeenCalledWith('avatars-rh')
    expect(uploadMock).toHaveBeenCalledWith(
      `${UID}/avatar.jpg`,
      file,
      expect.objectContaining({ upsert: true, contentType: 'image/jpeg' }),
    )
    // Returns the STABLE PATH, never a signed URL.
    expect(path).toBe(`${UID}/avatar.jpg`)
  })

  it('validates before upload — a >2MB file never reaches storage', async () => {
    const big = makeFile(2 * 1024 * 1024 + 1, 'image/png')
    await expect(uploadAvatar(big, UID)).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' })
    expect(uploadMock).not.toHaveBeenCalled()
  })
})

describe('getAvatarSignedUrl — sign on read', () => {
  it('returns the signed URL from createSignedUrl(path, 3600)', async () => {
    createSignedUrlMock.mockResolvedValue({ data: { signedUrl: 'https://x/y?token=abc' }, error: null })
    const url = await getAvatarSignedUrl(`${UID}/avatar.png`)
    expect(createSignedUrlMock).toHaveBeenCalledWith(`${UID}/avatar.png`, 3600)
    expect(url).toBe('https://x/y?token=abc')
  })

  it('throws UPLOAD_FAILED on an empty response', async () => {
    createSignedUrlMock.mockResolvedValue({ data: null, error: { message: 'no' } })
    await expect(getAvatarSignedUrl('p')).rejects.toMatchObject({ code: 'UPLOAD_FAILED' })
  })
})
