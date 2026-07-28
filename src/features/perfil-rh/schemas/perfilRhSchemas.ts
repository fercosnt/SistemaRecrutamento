/**
 * Phase 30 / Plan 30-04 — client Zod schemas for the "Meu Perfil RH" self-service
 * page (PERFIL-01 name edit + PERFIL-02 password change).
 *
 * Two pure input shapes consumed by the 30-05 UI:
 *   - `perfilNomeSchema` — the name-edit form (nome_completo min(3)/max(255)), the
 *     same bounds the `atualizar_meu_perfil_rh` RPC + the Phase-29 create form use.
 *   - `alterarSenhaSchema` — the change-password form: senha_atual required, nova_senha
 *     min(8), plus two cross-field `.refine`s (nova===confirmar, nova!==atual). The
 *     server-side re-auth (signInWithPassword) is the AUTHORITATIVE gate for the current
 *     password; this client validation is UX (defense in depth), NOT the security check.
 *
 * All messages are pt-BR (domain language). The schemas deliberately OMIT any transport
 * discriminator — the service builds the RPC / GoTrue calls from these validated values.
 *
 * @module features/perfil-rh/schemas/perfilRhSchemas
 * @see src/features/admin/schemas/usuarioRhSchemas.ts (the client zod-object + pt-BR idiom)
 */
import { z } from 'zod'

/**
 * The name-edit form. Mirrors the `atualizar_meu_perfil_rh(p_nome ...)` bound and the
 * Phase-29 create-form `nome_completo` field (min 3 / max 255) with the same pt-BR copy.
 */
export const perfilNomeSchema = z.object({
  nome_completo: z
    .string()
    .trim()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(255, 'Nome muito longo'),
})

/** The validated name-edit values (the service passes `nome_completo` as `p_nome`). */
export type PerfilNomeForm = z.infer<typeof perfilNomeSchema>

/**
 * The change-password form (PERFIL-02). `senha_atual` is re-auth material — the service
 * feeds it to `signInWithPassword` BEFORE `updateUser` (a wrong value maps to a typed
 * WRONG_CURRENT field error). The two `.refine`s enforce the UX rules the UI-SPEC states:
 * the confirmation must match, and the new password must differ from the current one.
 */
export const alterarSenhaSchema = z
  .object({
    senha_atual: z.string().min(1, 'Informe sua senha atual'),
    nova_senha: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar_senha: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.nova_senha === data.confirmar_senha, {
    message: 'As senhas não conferem',
    path: ['confirmar_senha'],
  })
  .refine((data) => data.nova_senha !== data.senha_atual, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['nova_senha'],
  })

/** The validated change-password values. */
export type AlterarSenhaForm = z.infer<typeof alterarSenhaSchema>
