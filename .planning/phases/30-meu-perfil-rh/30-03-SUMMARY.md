---
phase: 30-meu-perfil-rh
plan: 03
subsystem: database
tags: [security-definer, rpc, seg-03, storage-rls, avatars, postgres, supabase]
requires:
  - phase: 30-01
    provides: "30-LIVE-STATE.md — usuarios_rh zero client-write baseline; avatar_url column present; log_auditoria live; no existing RPC/bucket"
  - phase: 28
    provides: "usuarios_rh self-promotion UPDATE policy dropped (SEG-03 baseline); DEFINER RPC + log_auditoria shape"
provides:
  - "atualizar_meu_perfil_rh(p_nome, p_avatar_url) — self-service SECURITY DEFINER write of the caller's OWN usuarios_rh row (SEG-03 by construction; GRANT authenticated)"
  - "private avatars-rh storage bucket (2MB, png/jpeg/webp) + 4 own-folder RLS policies (owner-only, no cross-user read)"
affects: [30-04, 30-05, 30-06, 30-07]
tech-stack:
  added: []
  patterns:
    - "Self-service DEFINER RPC (INVERSE of Phase-28 admin RPC): GRANT authenticated, safe because uid-scoped + column-limited"
    - "SEG-03 by construction — forbidden columns physically absent from the SET list (not merely policy-gated)"
    - "Own-folder-ONLY storage RLS (curriculos analog MINUS the rh/administrador reads-any SELECT clause)"
key-files:
  created:
    - supabase/migrations/20260714000001_perfil_rh_rpc_avatars.sql
  modified: []
key-decisions:
  - "One atomic commit for the single migration file (both tasks write the same file; objective mandates atomic commit)"
  - "No BEGIN/COMMIT wrapper — MCP apply_migration wraps it; curriculos precedent's wrapper trips 42601 on the CLI pooler"
  - "SELECT policy has NO rh/administrador reads-any clause — an RH avatar is owner-only (SEG-03 spirit, no cross-user read)"
  - "Audit is best-effort (EXCEPTION WHEN OTHERS THEN NULL) so an audit failure never aborts the profile save"
patterns-established:
  - "SEG-03-by-construction: the write path cannot escalate a role because role/ativo/cargo/email/deleted_at are not in the SET list"
requirements-completed: [PERFIL-01, PERFIL-03, SEG-03]
duration: ~2min
completed: 2026-07-14
---

# Phase 30 Plan 03: Self-Service Perfil RPC + Avatar Storage Summary

**`atualizar_meu_perfil_rh` SECURITY DEFINER RPC (GRANT authenticated, SEG-03 by construction) + a private `avatars-rh` bucket with 4 own-folder RLS policies — the self-service profile write path, authored as one migration ready for the 30-06 MCP apply.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-07-14T04:40:18Z
- **Completed:** 2026-07-14T04:41:57Z
- **Tasks:** 2 (single file, one atomic commit)
- **Files modified:** 1 (created)

## Accomplishments

- **`atualizar_meu_perfil_rh(p_nome text, p_avatar_url text DEFAULT NULL)`** — `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Body writes ONLY `nome_completo`, `avatar_url` (via `COALESCE(p_avatar_url, avatar_url)` so a name-only save never wipes the photo), `updated_by = auth.uid()`, `updated_at = now()` `WHERE user_id = auth.uid()`, `RETURNING id INTO v_row_id`; `NOT_FOUND → P0002` when the caller has no row. **`role`/`ativo`/`cargo`/`email`/`deleted_at` are physically absent from the SET list → SEG-03 holds by construction** (a self-service caller cannot escalate a role — the columns are unreachable, not merely policy-gated).
- **Best-effort in-RPC audit** — `PERFORM public.log_auditoria(p_usuario_tipo:='rh', p_acao:='editar_perfil', p_categoria:='usuario', p_severidade:='info', p_recurso_id:=v_row_id, p_sucesso:=true)` wrapped in `BEGIN ... EXCEPTION WHEN OTHERS THEN NULL; END;` so an audit failure never aborts the profile update.
- **`GRANT EXECUTE ... TO authenticated`** — the INVERSE privilege of the Phase-28 admin RPCs (which REVOKE). Safe precisely because the body is uid-scoped and column-limited. No client UPDATE RLS policy re-added; the Phase-28 self-promotion hole stays dropped.
- **Private `avatars-rh` bucket** — idempotent `INSERT ... ON CONFLICT (id) DO UPDATE`, `public=false`, `2097152` bytes, `ARRAY['image/png','image/jpeg','image/webp']`.
- **4 own-folder RLS policies** on `storage.objects` (SELECT/INSERT/UPDATE/DELETE), each gated `bucket_id='avatars-rh' AND (storage.foldername(name))[1] = (select auth.uid()::text)` (subquery-wrapped for the RLS perf cache — Pitfall 8). **No `rh/administrador reads-any` clause** — owner-only avatar access (SEG-03 spirit, no cross-user read); DROP POLICY IF EXISTS first for idempotency.

## Task Commits

Both tasks write the single migration file; committed atomically (per objective):

1. **Task 1 + Task 2** (RPC + bucket + 4 own-folder policies) — `6b1669d` (feat)

## Files Created/Modified

- `supabase/migrations/20260714000001_perfil_rh_rpc_avatars.sql` — the self-service profile write path (RPC) + private avatar storage + own-folder RLS. Authored only; NOT applied to PROD (30-06 owns the MCP apply). No BEGIN/COMMIT wrapper.

## Decisions Made

- **One atomic commit** — both plan tasks author the same migration file; the objective mandates an atomic commit and a half-file would not be a coherent migration.
- **No BEGIN/COMMIT wrapper** — deliberately dropped from the mirrored curriculos precedent (that outer wrapper is the SQLSTATE 42601 trigger on the CLI transaction pooler for adjacent `$$` bodies + GRANT/COMMENT); the MCP apply_migration path wraps the migration in its own implicit transaction.
- **Owner-only SELECT** — the curriculos SELECT policy's `(app_metadata,role) IN ('rh','administrador')` cross-user clause was omitted; an RH user reads only their own avatar folder.
- **Best-effort audit** — a name/avatar edit is low-sensitivity; the audit is kept in-RPC (atomic) but swallowed on failure so it never blocks the save (lighter than the Phase-28 dados_antes/depois snapshot).

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- **Task 1 grep guards — PASS:** `WHERE user_id = auth.uid` present; `GRANT EXECUTE ... TO authenticated` present; SET-guard-A (`SET (role|ativo|cargo|email|deleted_at)=`) → 0 hits; SET-guard-B (comma-preceded forbidden column) → 0 hits.
- **Task 2 grep guards — PASS:** `avatars-rh` present; `storage.foldername(name)` count = 5 (≥4 — the UPDATE policy contributes two predicates); no `app_metadata,role` clause; no `^BEGIN;`/`^COMMIT;` line.
- Post-commit deletion check: 1 file changed, 189 insertions, 0 deletions.

## Issues Encountered

None.

## User Setup Required

None — the migration is authored only. The [BLOCKING] 30-06 applies it to PROD via Supabase MCP `apply_migration`, and 30-07 runs the SEG-03 smoke (30-02) GREEN against the live RPC.

## Next Phase Readiness

- The self-service write path + avatar storage are authored and ready for the 30-06 MCP apply. After apply, the 30-02 SEG-03 smoke cases 1 + 3 (RPC-invoking, currently RED / `undefined_function`) flip GREEN.
- Not applied to PROD — 30-06 owns the apply; do not apply from this plan.

## Self-Check: PASSED

- `supabase/migrations/20260714000001_perfil_rh_rpc_avatars.sql` — FOUND
- `.planning/phases/30-meu-perfil-rh/30-03-SUMMARY.md` — FOUND
- Commit `6b1669d` — FOUND

---
*Phase: 30-meu-perfil-rh*
*Completed: 2026-07-14*
