---
phase: 33-camada-de-dados-do-agendamento-de-entrevista
plan: 03
status: complete
wave: 3
requirements: [AGEND-01, SEG-03]
completed: 2026-07-16
gate: SEG-03 acceptance — 8/8 smoke PASS (zero SKIP) in PROD
---

# 33-03 SUMMARY — [BLOCKING] live PROD apply + SEG-03 acceptance gate GREEN

## What was done

**Task 1 — Applied to PROD via MCP + ledger reconciled.**
- `mcp__supabase__apply_migration(name='20260716000001_agendamentos_entrevista', query=<full file>)` → `success:true`.
- Live objects confirmed: `public.agendamentos_entrevista` (table), `rh_gerencia_agendamento`
  (exactly **1** policy), `public.get_meu_agendamento(uuid)` (function), `trg_agendamento_normaliza_vaga`
  (trigger), RLS enabled = true.
- **Ledger drift reconciled (Pitfall 6):** MCP recorded version `20260716031250` (fresh timestamp) —
  a single `UPDATE supabase_migrations.schema_migrations SET version='20260716000001' WHERE version='20260716031250'`
  (P27 idiom) reconciled it. Ledger now has exactly one row `version=name-prefix=20260716000001`,
  present on BOTH remote ledger and local file.

**Task 2 — Regenerated `database.types.ts` at repo ROOT + tsc baseline held.**
- `npx supabase gen types typescript --linked` (CLI authenticated + linked) → clean diff: **+88 lines,
  0 removed**, all the new `agendamentos_entrevista` Row/Insert/Update/Relationships + `get_meu_agendamento`
  function type. File regenerated, not hand-edited.
- `npm run lint` (`tsc --noEmit`) = **104 errors = baseline** (no increase; P33 added no TS logic).

**Task 3 — SEG-03 acceptance gate GREEN (blocking human-verify).**
- Ran the seg33 smoke logic in PROD via MCP `execute_sql`. Because MCP `execute_sql` does NOT surface
  `RAISE NOTICE` output, the gate was run via a **result-returning adaptation** (each assertion records
  its outcome into a session GUC `seg33.<x>`; a real leak still `RAISE EXCEPTION`s → MCP error; the final
  `SELECT` returns a definitive 8-row result set — this makes SKIP-vs-PASS unambiguous, satisfying Pitfall 2).
  The canonical `supabase/tests/seg33_agendamento_smokes.sql` (NOTICE form, SQL-Editor-runnable) is unchanged.
- **Result — all 8 PASS, ZERO SKIP, ZERO MISSING:**

  | assertion | result | proves |
  |-----------|--------|--------|
  | a | PASS | cross-recruiter READ deny (WR-04 USING) |
  | b | PASS | owner WRITE+READ with `agendado_por` (AGEND-01) |
  | c | PASS | spoofed-`vaga_id` INSERT deny (42501) |
  | d | PASS | admin bypass |
  | e | PASS | candidate direct base-table read = 0 (`observacoes_rh` unreachable) |
  | f | PASS | candidate RPC allow + allowlist (no RH-internal cols) |
  | g | PASS | cross-candidate RPC deny (DEFINER ownership join) |
  | h | PASS | candidate write deny (INSERT 42501; UPDATE/DELETE 0 rows) |

- Disposable `33010033-*` fixture cleaned up (0 leftover rows verified).

## Known limitation (NOT a P33 defect — pre-existing, deferred)

`supabase db push --linked` does **not** report "Remote database is up to date". Root cause is the
**pre-existing DBMIG-01 ledger debt from M5 (P28–30)**, NOT this migration: 7 remote ledger rows in the
`20260713*/20260714*` range carry MCP timestamp-versions, of which 5 map by `name` to local filename-version
files (version drift) and **2 are genuinely fileless MCP applies** (`usr_rh_review_fixes_wr01_wr03`,
`perfil_rh_rpc_hardening`) with no committed migration file. My P33 row (`20260716000001`) is correctly
reconciled on both sides. Fully reconciling M5's ledger (remap + retroactive files for the 2 fileless
applies) is **DBMIG-01 baseline+rebuild** — explicitly deferred to backlog, out of M6 scope. The
load-bearing SEG-03 acceptance gate (8/8 behavioral PASS) is the authoritative proof and it is GREEN;
`db push` cleanliness is ledger hygiene, not a security gate.

## Key files
- modified: `database.types.ts` (regenerated — +agendamentos_entrevista +get_meu_agendamento)
- modified: `.planning/phases/33-.../33-VALIDATION.md` (nyquist_compliant → true)
- (live) PROD: migration applied, ledger row reconciled

## Self-Check: PASSED
