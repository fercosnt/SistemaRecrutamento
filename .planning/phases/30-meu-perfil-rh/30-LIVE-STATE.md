# Phase 30 — Live DB State Capture (Wave 0)

**Captured:** 2026-07-14 via Supabase MCP `execute_sql` (read-only). Confirms the Phase-28 state the profile write-path relies on.

## Findings

- **`usuarios_rh` policies (LIVE) = 3 SELECT, ZERO write:** `RH pode ler seu próprio perfil` (own-row SELECT — the profile self-read uses it), `auth_admin_le_usuarios_rh` (SEC-09), `usuarios_rh_admin_select` (Phase-28 admin roster). **No client INSERT/UPDATE/DELETE policy** → the self-service write MUST go through the new DEFINER RPC (30-03). The Phase-28 self-promotion-hole drop is intact — do NOT re-add a client UPDATE policy. (SEG-03 regression baseline.)
- **`usuarios_rh.avatar_url` column exists** ✓ → the RPC writes it; no ALTER needed.
- **`atualizar_meu_perfil_rh` does NOT exist** → 30-03 creates it fresh (no CREATE OR REPLACE diff risk).
- **`avatars-rh` bucket does NOT exist** → 30-03 creates it fresh (idempotent INSERT...ON CONFLICT).
- **`log_auditoria(...)` exists** → the RPC's best-effort audit call resolves.

## Authoring contract (for 30-03)
- CREATE the RPC + bucket + 4 own-folder policies fresh (no existing objects to preserve). No BEGIN/COMMIT wrapper. Apply via MCP (30-06).
- The own-row SELECT policy is PRESERVED (not touched); the profile page reads via allowlist `.select(...).eq('user_id', auth.uid())`.
- SEG-03 baseline to re-prove in 30-07: a recrutador direct `UPDATE usuarios_rh SET role='administrador'` still affects 0 rows (Phase-28 WR-01), and the RPC cannot set role/ativo.
