---
phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring
plan: 03
subsystem: database
tags: [n8n, pg_net, vault, lgpd, pii, security, trigger, ci-guard, cadastro]

# Dependency graph
requires:
  - phase: 24-blindagem-seguran-a-pii-lgpd
    provides: "SEC-03 server-side n8n dispatch precedent (20260706110005) + the n8n-bundle grep guard"
provides:
  - "trg_n8n_novo_candidato AFTER INSERT ON candidatos (pg_net + Vault, id-only body, graceful-skip) — files-only, apply=26-07"
  - "n8n_novo_candidato_smoke.sql (graceful-skip / no-PII-body / row-unchanged) — RED until 26-07 apply"
  - "client n8nService.ts subtree DELETED (18 hstgr URLs + candidate PII) + barrel re-export removed + test removed"
  - "extended n8n-bundle grep guard: bans the hstgr host + PII field names co-located with an n8n host, across build/ and src/"
affects: [26-07, phase-27-migrations, secure-phase-26]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SEC-03 server-side dispatch retargeted to candidatos with a PII-free id-only body"
    - "grep guard: exact host tokens + tight hostname regex for PII co-location (no-false-positive on bare schema fields)"

key-files:
  created:
    - supabase/migrations/20260712100004_n8n_novo_candidato.sql
    - supabase/tests/n8n_novo_candidato_smoke.sql
  modified:
    - src/features/cadastro/services/index.ts
    - src/features/cadastro/README.md
    - src/__tests__/guards/n8n-bundle.grep.test.ts
  deleted:
    - src/features/cadastro/services/n8nService.ts
    - src/features/cadastro/services/__tests__/n8nService.test.ts

key-decisions:
  - "Trigger body carries ONLY candidato_id — never any candidate personal data (LGPD / D-n8n-ServerSide); the rich EF is M5"
  - "PII field names are banned only when co-located with a recognizable n8n hostname (tight regex) — bare cadastro schema fields never trip"
  - "Migration is files-only; PROD apply + smoke are 26-07 (MCP apply_migration; graceful-skip is the live behavior until Fernando sets the Vault secret)"

patterns-established:
  - "Defense-in-depth grep guard: an n8n hostname regex (n8n<subdomains>.<tld>) gives PII co-location teeth beyond the 3 exact host tokens without false-flagging N8NWebhookPayload / cadastro schema fields"

requirements-completed: [n8n-2nd-leak]

# Metrics
duration: ~12min
completed: 2026-07-12
---

# Phase 26 Plan 03: Close the 2nd n8n PII/URL leak Summary

**Deleted the zero-caller client `n8nService.ts` subtree (18 hardcoded `n8n.srv881294.hstgr.cloud` URLs + candidate PII payload), moved the candidato-created dispatch server-side to an `AFTER INSERT ON candidatos` trigger (pg_net + Vault, id-only body, graceful-skip), and extended the bundle grep guard to ban the hstgr host + PII field names across build/ and src/.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-12T06:19Z (approx)
- **Completed:** 2026-07-12T06:29Z
- **Tasks:** 2
- **Files touched:** 7 (2 created, 2 deleted, 3 modified)

## Accomplishments

- **Server-side dispatch (files-only):** `trg_n8n_novo_candidato()` mirrors the SEC-03 precedent (`20260706110005:52-99`) retargeted to `candidatos` — SECURITY DEFINER, `SET search_path=''`, reads the Vault secret `n8n_webhook_base`, graceful `RETURN NEW` when it is NULL, and PERFORMs `net.http_post` with a body carrying only `candidato_id` (never any personal data). RNF-07a preserved (never writes candidatos). No `BEGIN/COMMIT` wrapper; apply is 26-07 via MCP.
- **Client leak deleted:** removed `n8nService.ts` (18 `n8n.srv881294.hstgr.cloud` URLs + the candidate-PII payload helper — verified zero runtime callers), its barrel re-export line, its test, and the README doc-tree mention. tsc dropped 107 → 104 (deletion, no growth).
- **Durable regression net:** the `n8n-bundle.grep.test.ts` guard now bans `n8n.srv881294.hstgr.cloud` (24-05 carve-out dropped) plus the PII payload field names when co-located with a recognizable n8n hostname, on BOTH the build/ artifact plane and the src/ plane — while preserving the no-false-positive contract (a bare `nome_completo` schema field and the `N8NWebhookPayload` type identifier are never flagged).
- **Behavioral smoke authored:** `n8n_novo_candidato_smoke.sql` proves graceful-skip (disposable candidato INSERT commits with the secret NULL), a PII-free trigger body (only `NEW.id`, no personal-data column reference), and an unchanged candidatos row — self-contained disposable fixture, skip-on-failure, ROLLBACK-free cleanup. RED until the 26-07 apply.

## Task Commits

1. **Task 1: Author the AFTER INSERT trigger migration + smoke** — `06e9727` (feat)
2. **Task 2: Delete the n8nService subtree + extend the bundle guard** — `201bbc7` (fix)

_Plan metadata commit follows this summary._

## Files Created/Modified

- `supabase/migrations/20260712100004_n8n_novo_candidato.sql` — server-side `AFTER INSERT ON candidatos` trigger (pg_net + Vault, id-only body, graceful-skip). **Files-only — apply=26-07.**
- `supabase/tests/n8n_novo_candidato_smoke.sql` — graceful-skip / no-PII-body / row-unchanged smoke (RED until 26-07).
- `src/features/cadastro/services/n8nService.ts` — **DELETED** (the leaking subtree).
- `src/features/cadastro/services/__tests__/n8nService.test.ts` — **DELETED** (tests for the deleted subtree).
- `src/features/cadastro/services/index.ts` — removed the `export * from './n8nService'` barrel line.
- `src/features/cadastro/README.md` — removed the `n8nService.ts` doc-tree line.
- `src/__tests__/guards/n8n-bundle.grep.test.ts` — extended guard (hstgr host + PII co-location, build/ + src/).

## Verification

- Task 1 automated verify: `AFTER INSERT ON public.candidatos` == 1; PII words (`nome_completo|telefone|cpf|email`) in the migration == 0; `RETURN NEW` present; smoke exists with 3 `RAISE NOTICE 'PASS'`.
- Task 2: both files deleted; barrel `n8nService` count == 0; zero dangling runtime references (`notifyCandidatoCriado|N8N_WORKFLOWS|sendToN8N` == 0 in src/); guard bans the hstgr host.
- `npm run build` clean; `npx vitest run` of the guard 7/7 against the **fresh** build; `npm run test:run` 752/752 (−32 = the removed n8nService test file); `npm run lint` (tsc) = **104** (≤ 107, no growth).

## Decisions Made

- **Id-only body, PII stays server-side:** the trigger body posts only `candidato_id`; the old client payload's identity/contact/document fields never cross the wire (LGPD). The rich `notificar-candidato` EF is deferred to M5.
- **PII co-location via a tight hostname regex:** rather than banning bare PII field names (which would false-flag legitimate cadastro/form/schema code), the guard flags a PII field name only when a recognizable n8n hostname (`n8n<subdomains>.<tld>`) is present — giving defense-in-depth teeth beyond the 3 exact host tokens while keeping `N8NWebhookPayload`/`nome_completo`-as-schema-field green.

## Deviations from Plan

### Auto-fixed / doc-hygiene adjustments

**1. [Rule 3 - Blocking] Removed banned runtime symbols from the guard's own docblock**
- **Found during:** Task 2 (guard extension)
- **Issue:** The rewritten guard docblock mentioned `notifyCandidatoCriado` and `N8N_WORKFLOWS` in prose, which would make the plan's "zero dangling runtime reference" acceptance grep (`grep -rE "notifyCandidatoCriado|N8N_WORKFLOWS|sendToN8N" src/`) non-zero.
- **Fix:** Reworded the prose to describe the deleted helper generically (kept the non-banned `N8NWebhookPayload` type name).
- **Files modified:** src/__tests__/guards/n8n-bundle.grep.test.ts
- **Verification:** `grep -rE "notifyCandidatoCriado|N8N_WORKFLOWS|sendToN8N" src/` → 0.
- **Committed in:** 201bbc7 (Task 2 commit)

**2. [Rule 3 - Doc hygiene] Removed the n8nService README doc-tree line**
- **Found during:** Task 2 (subtree deletion)
- **Issue:** `src/features/cadastro/README.md` still listed the now-deleted `n8nService.ts` in its file-tree diagram (dangling doc reference). The 26-PATTERNS.md deletion checklist explicitly calls out "+ any README mention".
- **Fix:** Removed the `n8nService.ts` line from the services tree. (README.md was not in the plan's `files_modified` frontmatter; low-risk doc-only edit aligned with the plan's own guidance.)
- **Files modified:** src/features/cadastro/README.md
- **Committed in:** 201bbc7 (Task 2 commit)

---

**Total deviations:** 2 (1 blocking prose-fix to satisfy the acceptance grep, 1 doc-hygiene). No scope creep — both keep the deletion clean.

## Issues Encountered / Observations

- **Orphan N8N types left in place (out of scope):** `src/features/cadastro/types/formTypes.ts` still defines `N8NWebhookPayload` / `N8NWebhookResponse` (zero consumers). These carry PII field *names* but NO n8n host and are type-only (erased at build), so they are not a bundle leak and the extended guard does not (and should not) flag them. Left untouched to keep the change surgical (not in `files_modified`); a candidate for a Phase-27 dead-code sweep.
- **Migration + smoke are RED until 26-07:** per the phase's files-only convention, `20260712100004` is applied to PROD via MCP `apply_migration` in Wave 4 (26-07); the smoke is the acceptance gate there. Graceful-skip is the expected live behavior (the `n8n_webhook_base` Vault secret is Fernando's deferred human-action).

## User Setup Required

None new in this plan. Standing deferred human-action (from SEC-03): create the Vault secret `n8n_webhook_base` in PROD to activate the server-side dispatch. Until then the trigger graceful-skips (no error, no dispatch).

## Next Phase Readiness

- The 2nd n8n client leak is closed at the source (subtree deleted, guard is the durable net). The server-side dispatch and its smoke are authored and queued for the 26-07 apply wave.
- No blockers. `secure-phase 26` will find the client PII/URL leak surface removed and the grep guard extended.

## Self-Check: PASSED

- Created files present: migration, smoke, extended guard, SUMMARY.
- Deleted files gone: n8nService.ts, n8nService.test.ts.
- Commits present: `06e9727` (Task 1), `201bbc7` (Task 2).

---
*Phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring*
*Completed: 2026-07-12*
