/**
 * Phase 29 / Plan 29-01 — client Zod schemas for the RH user-management console
 * (USR-02 create form + USR-03 change-role form).
 *
 * These MIRROR the EF's `criar` / `mudar_papel` branches EXACTLY
 * (`supabase/functions/_shared/usuario-rh-schemas.ts:38,55-93`) so the client↔EF
 * contract cannot drift silently ([[feedback_integration_contract_gap]]). The four
 * validation messages are byte-identical to the EF strings, and `papel` is the same
 * two-value enum {recrutador, administrador} — the console's client validation is UX,
 * the EF's `.strict()` re-validation is the authoritative gate (defense in depth).
 *
 * The form schemas deliberately OMIT the `action` discriminator — the service adds
 * `action:'criar'` / `action:'mudar_papel'` when building the invoke body — so the
 * form types stay pure input shapes.
 *
 * @module features/admin/schemas/usuarioRhSchemas
 * @see supabase/functions/_shared/usuario-rh-schemas.ts (the EF contract mirrored here)
 * @see src/features/decisao/schemas/decisaoSchema.ts (the client zod-object + OPTIONS analog)
 */
import { z } from 'zod'

/**
 * The two RH roles this console manages — mirrors the EF's `papel` enum
 * (NOT the legacy 4-value DB CHECK; `gerente`/`visualizador` are excluded).
 */
export const papelSchema = z.enum(['recrutador', 'administrador'])

/** The role union the console assigns / edits. */
export type Papel = z.infer<typeof papelSchema>

/**
 * The "Novo usuário" create form. Mirrors the EF `criar` branch field-for-field
 * (email trim+toLowerCase+email, nome_completo min(3)/max(255), cargo min(1)/max(100),
 * papel enum) with the EXACT pt-BR messages so client and server agree.
 */
export const novoUsuarioSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  nome_completo: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(255, 'Nome muito longo'),
  cargo: z.string().min(1, 'Cargo é obrigatório').max(100, 'Cargo muito longo'),
  papel: papelSchema,
})

/** The validated create-form values (the service spreads these under `action:'criar'`). */
export type NovoUsuarioForm = z.infer<typeof novoUsuarioSchema>

/** The "Editar papel" form — a single role select (mirrors the EF `mudar_papel` branch). */
export const editarPapelSchema = z.object({
  novo_papel: papelSchema,
})

/** The validated change-role form values. */
export type EditarPapelForm = z.infer<typeof editarPapelSchema>

/** The role options for the create/edit selects, in UI order with pt-BR labels. */
export const PAPEL_OPTIONS: { value: Papel; label: string }[] = [
  { value: 'recrutador', label: 'Recrutador' },
  { value: 'administrador', label: 'Administrador' },
]
