# Plan 30-06 Summary — [BLOCKING] Apply RPC + bucket to PROD + regen types

**Status:** Complete · **Requirements:** PERFIL-01/03, SEG-03 (live) · **Autonomous:** false (PROD apply via MCP)

Applied migration 20260714000001 via Supabase MCP apply_migration. Live-verified: atualizar_meu_perfil_rh exists + authenticated can EXECUTE; avatars-rh bucket private; 4 own-folder policies; usuarios_rh UPDATE policies = 0 (SEG-03 baseline intact). Regenerated database.types.ts (RPC present); dropped the `as never` cast. Type-correct fix: p_avatar_url arg is optional (DEFAULT NULL → string|undefined) so name-only save passes undefined (RPC COALESCE keeps existing avatar); updated the service + its test. Gates: vitest 877/877, tsc 104.

## Self-Check: PASSED
