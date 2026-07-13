/**
 * Zod request contract + error vocabulary for the `gerenciar-usuario-rh` Edge Function
 * (Phase 28 / Plan 28-06 — SEG-01 / USR-02 / USR-05 / USR-06).
 *
 * This module is the SINGLE, fail-closed request contract for the ONE privileged
 * RH-account write-path. The EF authenticates-THEN-authorizes (administrador-only,
 * read from `usuarios_rh`, never the JWT) and then validates the body against the
 * `.strict()` discriminated union below BEFORE any privileged write.
 *
 * Structural decisions (mirror `_shared/schemas.ts`):
 * - **Bare `zod` import (CI-07):** the specifier resolves in both runtimes — Deno via
 *   `supabase/functions/deno.json`'s import map (`"zod": "npm:zod@3.25.76"`) and
 *   Node/Vitest via `node_modules` (byte-identical 3.25.76). One module, no drift.
 * - **`.strict()` on every object (fail-closed allowlist):** any unknown key yields a
 *   Zod failure → the EF maps it to `error_code: 'VALIDATION'` / HTTP 400 BEFORE any
 *   write. Defends against role/free-text tampering (T-28-08).
 * - **`papel` enum-constrained to `{recrutador, administrador}`:** the legacy 4-value
 *   `usuarios_rh` role CHECK (`gerente`/`visualizador`) is deliberately NARROWED here —
 *   only the two roles the console (Phase 29) manages are accepted.
 * - **`nome_completo` + `cargo` required on `criar`:** both columns are NOT NULL on
 *   `usuarios_rh` (RESEARCH Pitfall 8) — the schema enforces them at the boundary.
 *
 * @module supabase/functions/_shared/usuario-rh-schemas
 * @see supabase/functions/_shared/schemas.ts (the `.strict()` bare-zod idiom + zodPathToFieldName)
 * @see supabase/functions/gerenciar-usuario-rh/index.ts (the sole consumer)
 */

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

/**
 * The two RH roles this feature manages. NOT the legacy DB CHECK's 4 values —
 * `gerente` / `visualizador` are excluded (they are not part of the M5 console).
 */
const papel = z.enum(["recrutador", "administrador"]);

// ============================================================================
// Request contract — a `.strict()` discriminated union on `action`
// ============================================================================

/**
 * The single request shape for `gerenciar-usuario-rh`. The `action` discriminator
 * selects one of five mutually-exclusive bodies; every branch is `.strict()`
 * (fail-closed) so an unknown key rejects instead of being silently stripped.
 *
 * - `criar`         → email + nome_completo + cargo + papel (both text cols NOT NULL).
 * - `mudar_papel`   → target_id + novo_papel (∈ {recrutador, administrador}).
 * - `ativar`        → target_id.
 * - `desativar`     → target_id.
 * - `resetar_senha` → target_id.
 */
export const gerenciarUsuarioRhSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("criar"),
      email: z.string().email("Email inválido").toLowerCase().trim(),
      nome_completo: z
        .string()
        .min(3, "Nome deve ter no mínimo 3 caracteres")
        .max(255, "Nome muito longo"),
      cargo: z.string().min(1, "Cargo é obrigatório").max(100, "Cargo muito longo"),
      papel,
    })
    .strict(),
  z
    .object({
      action: z.literal("mudar_papel"),
      target_id: z.string().uuid("target_id inválido"),
      novo_papel: papel,
    })
    .strict(),
  z
    .object({
      action: z.literal("ativar"),
      target_id: z.string().uuid("target_id inválido"),
    })
    .strict(),
  z
    .object({
      action: z.literal("desativar"),
      target_id: z.string().uuid("target_id inválido"),
    })
    .strict(),
  z
    .object({
      action: z.literal("resetar_senha"),
      target_id: z.string().uuid("target_id inválido"),
    })
    .strict(),
]);

/** Inferred type of the validated request body (discriminated on `action`). */
export type GerenciarUsuarioRhInput = z.infer<typeof gerenciarUsuarioRhSchema>;

// ============================================================================
// Structured error contract — `{ ok, error_code, message, field? }`
// ============================================================================

/**
 * The error-code vocabulary for the EF's structured error contract. DB SQLSTATEs
 * map here: `P0001` (anti-lockout RAISE) → `LAST_ADMIN`, `P0002` → `NOT_FOUND`,
 * a GoTrue "already registered" → `EMAIL_EXISTS`, an SMTP send failure →
 * `EMAIL_SEND_FAILED`.
 */
export type UsuarioRhErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "EMAIL_EXISTS"
  | "LAST_ADMIN"
  | "EMAIL_SEND_FAILED"
  | "SERVER_ERROR";

/**
 * Maps a Zod issue path (e.g. `['papel']` or `['nome_completo']`) to a FLAT field
 * name (the leaf segment) for the structured error's `field?` slot. Returns
 * `undefined` when the path is empty (e.g. an `unrecognized_keys` failure from
 * `.strict()`, whose path is `[]`) or when the leaf is an array index.
 * Mirrors `_shared/schemas.ts:192-198`.
 */
export function zodPathToFieldName(
  path: (string | number)[] | undefined,
): string | undefined {
  if (!path || path.length === 0) return undefined;
  const leaf = path[path.length - 1];
  return typeof leaf === "string" ? leaf : undefined;
}
