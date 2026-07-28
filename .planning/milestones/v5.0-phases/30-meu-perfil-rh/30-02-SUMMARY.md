---
phase: 30-meu-perfil-rh
plan: 02
subsystem: security-harness
tags: [seg-03, sql-smoke, pitfall-7, red-harness, perfil-rh]
requires: [30-01 (30-LIVE-STATE.md — usuarios_rh zero client-write baseline)]
provides:
  - "SEG-03 behavioral SQL smoke (own-row-only + role/ativo-untouched + WR-01 regression + no-client-UPDATE-policy)"
  - "Pitfall-7 grep guard extended to perfil-rh surfaces (password/token + signed-URL scans)"
affects: [30-06 (RPC apply flips cases 1+3 GREEN), 30-07 (paste-and-run GREEN gate)]
tech-stack:
  added: []
  patterns: [impersonated-JWT-smoke, rollback-free-cleanup, tolerant-grep-guard]
key-files:
  created:
    - supabase/tests/perfil_rh_seg03_smoke.sql
  modified:
    - src/features/auth/utils/__tests__/pitfall7.grep.test.ts
decisions:
  - "SEG-03 smoke authored RED-by-design: cases 1+3 (RPC-invoking) fail undefined_function until 30-06; regression cases 2/4/5 GREEN today"
  - "Two disposable recrutador fixtures with REAL auth.users FK targets (updated_by=auth.uid() is FK'd to auth.users) → own-row-only vs IDOR provable"
  - "No BEGIN/COMMIT wrapper → per-statement autocommit isolates the RED RPC calls from the regression cases + cleanup"
metrics:
  duration: ~8min
  tasks: 2
  files: 2
  completed: 2026-07-14
---

# Phase 30 Plan 02: SEG-03 RED Harness Summary

The load-bearing SEG-03 axis gate and the Pitfall-7 redaction guard now exist **before** the RPC or any perfil-rh source code — Nyquist: the security invariant has a behavioral test before the code that must satisfy it is written.

## What was built

- **`supabase/tests/perfil_rh_seg03_smoke.sql`** — the SEG-03 behavioral gate, mirroring `usr_rh_seg02_smoke.sql` exactly (impersonated JWT via `request.jwt.claims` → `SET ROLE authenticated`; privileged setup discovers **two** free `auth.users` ids and inserts two disposable recrutador fixtures at fixed UUIDs `30020003-…-001`/`-002`; ROLLBACK-free cleanup by fixed UUID; SKIP-with-NOTICE when fewer than two free auth users). Five cases:
  1. **own-row-only** — after the caller-recrutador calls `atualizar_meu_perfil_rh('SMOKE Novo Nome', NULL)`, only the caller row is renamed; the second fixture is untouched (uid-scoped DEFINER write ⇒ IDOR impossible). *RED until 30-06.*
  2. **role/ativo untouched** — caller `role` stays `recrutador`, `ativo` unchanged (role/ativo/cargo/email not in the SET list). *GREEN today.*
  3. **COALESCE avatar** — NULL avatar arg preserves the seeded `avatar_url`; a non-null arg updates it. *RED until 30-06.*
  4. **WR-01 regression** — a recrutador direct `UPDATE usuarios_rh SET role='administrador'` affects **0 rows** (no client UPDATE policy); caller role stays `recrutador`. *GREEN today.*
  5. **no client UPDATE policy** — `pg_policies` has zero `cmd='UPDATE'` policy on `usuarios_rh` (Phase-28 hole-drop preserved). *GREEN today.*

- **`pitfall7.grep.test.ts` extended** — added `PHASE_30_PERFIL_PATHS` (perfil-rh services/hooks/components/schemas + `MeuPerfilPage.tsx`) folded into `ALL_PATHS` (password/token scan, PERFIL-02) plus a Phase-30 signed-URL scan reusing `signedurl|signed_url|signedURL|?token=` (PERFIL-03) and a tolerant Wave-1 sanity test. GREEN 6/6 today (perfil-rh subtree absent → graceful skip; `MeuPerfilPage` stub is clean).

## RED-by-design contract

Because there is no `BEGIN/COMMIT` wrapper, each statement auto-commits independently: the `undefined_function` (42883) raised by cases 1+3's `PERFORM public.atualizar_meu_perfil_rh(...)` does **not** abort the regression cases (2/4/5) or the cleanup. 30-07 pastes-and-runs the file on PROD after 30-06 applies the RPC → all five cases + cleanup GREEN.

## Deviations from Plan

None — plan executed exactly as written. (Task-1 SETUP discovers **two** free `auth.users` ids rather than "an admin + a free auth id" as the plan action text loosely phrased; this is the correct FK-satisfying shape for two recrutador fixtures — the SEG-03 assertions never need an admin, unlike the SEG-02 analog. Acceptance criteria — two disposable fixtures, real FK targets, ROLLBACK-free cleanup — met verbatim.)

## Verification

- `test -f … && grep atualizar_meu_perfil_rh && grep smoke30.ready` → PASS; 5 PASS notices, 4 RPC PERFORM sites.
- `npm run test:run -- …pitfall7.grep.test.ts` → 6/6 GREEN.
- `npm run lint` → 104 `error TS` (baseline ≤104, unchanged — test-file edit adds no production types).

## Commits

- `8f0d094` test(30-02): author SEG-03 profile behavioral smoke (RED, MCP-run)
- `847d371` test(30-02): extend Pitfall-7 redaction guard to perfil-rh surfaces

## Self-Check: PASSED

- `supabase/tests/perfil_rh_seg03_smoke.sql` — FOUND
- `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` — FOUND
- Commit `8f0d094` — FOUND · Commit `847d371` — FOUND
