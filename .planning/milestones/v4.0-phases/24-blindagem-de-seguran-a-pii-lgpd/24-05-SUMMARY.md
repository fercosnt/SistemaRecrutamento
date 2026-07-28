---
phase: 24-blindagem-de-seguran-a-pii-lgpd
plan: 05
subsystem: edge-functions
tags: [idor, bearer-self-auth, pii, n8n, webhook, pg_net, vault, bundle-leak, lgpd, rnf-07a]

# Dependency graph
requires:
  - phase: 24-01
    provides: 24-LIVE-STATE.md (live-confirmed the devolutiva EF has zero caller authz + the 3 client n8n dispatch sites)
  - phase: 23 (cost-alerter)
    provides: Bearer self-auth pattern (cost-alerter/index.ts:90-113) re-emitted here for the devolutiva EF
  - phase: 10 (reprocessar_analise)
    provides: pg_net + vault.decrypted_secrets server-side dispatch template (20260610000003:63-82)
provides:
  - "SEC-04: gerar-devolutiva-bigfive (was ZERO auth — open IDOR) gated by exported guardDevolutivaBearer() — exact-match Bearer self-auth (DEVOLUTIVA_INVOKE_SECRET ?? SERVICE_KEY) at the top of Deno.serve before any score_id parse; no getUser()/JWT-metadata role read (Pitfall 4)"
  - "SEC-03: n8n dispatch moved server-side via migration 20260706110005 — 3 AFTER triggers (candidaturas INSERT/status UPDATE, decisao_final revisao NULL->NOT NULL) PERFORM net.http_post reading Vault n8n_webhook_base (graceful NULL skip); body = ids/status/event only, no PII; never writes candidaturas (RNF-07a)"
  - "SEC-03 client: candidaturasService + explicacaoService carry NO n8n URL / VITE_N8N / fetch — all constants, both webhook helper fns, WEBHOOK_CONFIG/webhookLogger/sleep/isRetryableError deleted; no fresh TS6133 (tsc 133->128)"
  - "SEC-03 guard: src/__tests__/guards/n8n-bundle.grep.test.ts — 0 n8n.cloud|fernandocosta in build/ (after npm run build) + 0 VITE_N8N in src/ (comment-aware)"
affects: [24-08, 24-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "privileged EF caller authz = Bearer self-auth for a server-to-server-only EF (cost-alerter idiom); NEVER a role read from decoded JWT metadata (Pitfall 4 — the hook writes role only into the signed token). Extracted the guard as an exported pure fn so deno test exercises no-Bearer/wrong-Bearer/correct-Bearer without standing up Deno.serve"
    - "move any client-tier URL server-side via a pg_net + Vault-secret trigger (reprocessar_analise idiom), graceful RETURN if the secret is NULL so a not-yet-created secret never breaks the row mutation; minimal id-only body (M4 depth, full notifier EF is M5)"
    - "VITE_-prefixed env vars are INLINED into the public bundle at build (Pitfall 5) — configurable != private; the build-artifact grep guard is the teeth, the src VITE_ grep is the source invariant"
    - "when deleting a client dispatch, remove the whole dead subtree (helper fns + their unused config/logger/util + newly-orphaned locals) to avoid inflating the frozen tsc baseline (the 22-03 TS6133 lesson)"

key-files:
  created:
    - supabase/migrations/20260706110005_sec03_n8n_serverside.sql
    - src/__tests__/guards/n8n-bundle.grep.test.ts
  modified:
    - supabase/functions/gerar-devolutiva-bigfive/index.ts
    - supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts
    - src/features/vagas/services/candidaturasService.ts
    - src/features/explicacao/services/explicacaoService.ts
    - src/features/explicacao/services/__tests__/explicacaoService.test.ts

key-decisions:
  - "SEC-04 = Bearer self-auth ONLY (user-approved): no getUser(), no role, no posse. The EF is server-to-server only (grep of src/ for a browser caller is empty; only submit-bigfive-final invokes it via service_role) so Bearer is the sufficient IDOR closure; role+posse has no end-user caller and would hit the Pitfall-4 landmine (role from decoded JWT is always undefined)"
  - "Extracted guardDevolutivaBearer() as an EXPORTED module-scope pure fn (returns Response|null) — testable directly (4 deno cases) without triggering the import.meta.main Deno.serve wrapper; mirrors the 23-03 cost-alerter/messages.ts testability extraction"
  - "SEC-03 dispatch anchored on the AUTHORITATIVE row mutation (DB triggers), strictly better than a client/EF fetch: fires on the actual INSERT/UPDATE regardless of code path (covers both the EF atomic-submit and the legacy createCandidatura path with one canonical trigger)"
  - "Single Vault secret n8n_webhook_base (the shared host+/webhook prefix); each trigger appends /nova-candidatura | /status-candidatura | /revisao-decisao — minimizes the 24-08 Vault work to one secret"
  - "Deleted the whole client webhook subtree (2 helper fns + WEBHOOK_CONFIG + webhookLogger + sleep + isRetryableError + 3 N8N type imports) and the 2 now-orphaned locals (notificar_candidato, statusAnterior) — removing the fetch alone would have left TS6133s"
  - "Updated 2 explicacaoService tests that asserted a CLIENT fetch fires → now assert NO client fetch (dispatch is server-side); the denied/unavailable no-fire cases already held"

patterns-established:
  - "SEC-04 posture: server-to-server EF = exact-match Bearer self-auth as an exported testable guard, never a decoded-JWT role read"
  - "SEC-03 posture: client URL leak → pg_net+Vault trigger on the row mutation + delete the entire client dispatch subtree + a build-artifact grep guard"

requirements-completed: [SEC-03, SEC-04]

# Metrics
duration: ~30min
completed: 2026-07-07
---

# Phase 24 Plan 05: SEC-04 Devolutiva EF Bearer Self-Auth + SEC-03 n8n Server-Side Summary

**Closed two infrastructure leaks. SEC-04: the `gerar-devolutiva-bigfive` Edge Function read a candidate's devolutiva via service_role with ZERO caller authorization (open IDOR) — now gated by an exported exact-match Bearer self-auth guard at the top of `Deno.serve`, mirroring cost-alerter, with NO decoded-JWT role read (Pitfall 4). SEC-03: three n8n webhook URLs were hardcoded in the client bundle (even `VITE_N8N_*` inlines publicly) — the dispatch moved server-side to a pg_net + Vault-secret migration (3 AFTER triggers), all client URL/VITE_/fetch/helper code deleted, locked by a build-artifact grep guard. Code + migration FILE only; EF redeploy = 24-09, migration apply + Vault secret = 24-08. tsc 133→128, no candidaturas write (RNF-07a).**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-07-07
- **Tasks:** 3
- **Files:** 7 (2 created, 5 modified)

## Accomplishments
- **SEC-04 Bearer self-auth (IDOR closed)** — added exported `guardDevolutivaBearer(req, expectedSecret): Response|null` (exact-match compare, mirrors `cost-alerter:90-113`) and wired it at the top of `Deno.serve` immediately after the env read, BEFORE the `score_id` parse / any service_role read. Secret = `DEVOLUTIVA_INVOKE_SECRET ?? SUPABASE_SERVICE_ROLE_KEY` (rotation-friendly). No `getUser()`/JWT-metadata role read added (RESEARCH Pitfall 4 — always `undefined`; the EF is server-to-server-only with no end-user caller for role+posse). 4 deno authz cases (no-Bearer/wrong-Bearer/no-scheme → 401, exact-match → proceed).
- **SEC-03 server-side dispatch** — authored `20260706110005_sec03_n8n_serverside.sql` (FILE ONLY): three `SECURITY DEFINER` + `search_path=''` trigger functions PERFORM `net.http_post` to the n8n URL read from Vault `n8n_webhook_base`, graceful `RETURN` if NULL. Fired on `candidaturas` INSERT (nova-candidatura), `candidaturas` UPDATE OF status on an actual transition (status-candidatura), and `decisao_final` UPDATE OF `revisao_solicitada_em` on the NULL→NOT NULL transition (revisao-decisao). Body carries ids/status/event only — NO PII (the old client payloads carried nome/email/cpf/telefone). No BEGIN/COMMIT wrapper; never writes candidaturas (RNF-07a).
- **SEC-03 client removal** — `candidaturasService.ts`: deleted both `VITE_N8N_*` URL constants + hardcoded fallbacks, `triggerN8NWebhook` + `triggerStatusUpdateWebhook`, `WEBHOOK_CONFIG`/`webhookLogger`/`sleep`/`isRetryableError`, the 3 unused N8N type imports, and the 2 newly-orphaned locals (`notificar_candidato`, `statusAnterior`). `explicacaoService.ts`: deleted `VITE_N8N_REVISAO_DECISAO_URL` + the client `fetch()` dispatch. Updated the 2 explicacaoService tests that asserted a client fetch → now assert NO client fetch (server-side). tsc 133→128 (the removed code carried typed errors); 71/71 vitest green.
- **SEC-03 build-artifact grep guard** — `src/__tests__/guards/n8n-bundle.grep.test.ts` (mirrors rh-console): after `npm run build`, 0 `n8n.cloud`|`fernandocosta` literals in `build/` (skipped when build/ absent; runs in CI where build precedes test) + 0 `VITE_N8N` in `src/` (comment-aware). Literal `.includes()` so it catches `...app.n8n.cloud/...` but NOT the out-of-scope `n8n.srv881294.hstgr.cloud` host; no-false-positive sub-test locks that. Green with a fresh build (5/5).

## Task Commits

Each task committed atomically via the allowlisted `git -c core.hooksPath=/dev/null` bypass (husky pre-commit runs the frozen 133-error tsc baseline):

1. **Task 1: SEC-04 Bearer self-auth in gerar-devolutiva-bigfive + 4 authz tests** — `595727d` (feat)
2. **Task 2: SEC-03 server-side pg_net dispatch migration + delete client n8n dispatch** — `cb02563` (feat)
3. **Task 3: SEC-03 build-artifact grep guard** — `5fb72fe` (test)

## Files Created/Modified
- `supabase/functions/gerar-devolutiva-bigfive/index.ts` (modified) — exported `guardDevolutivaBearer()` + the guard call at the top of Deno.serve; no role read (Pitfall 4)
- `supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts` (modified) — 4 SEC-04 authz cases
- `supabase/migrations/20260706110005_sec03_n8n_serverside.sql` (created) — 3 pg_net + Vault trigger functions/triggers; graceful NULL skip; no BEGIN/COMMIT; RNF-07a-safe
- `src/features/vagas/services/candidaturasService.ts` (modified) — deleted the entire client n8n webhook subtree + orphaned locals
- `src/features/explicacao/services/explicacaoService.ts` (modified) — deleted the VITE_N8N URL + client fetch
- `src/features/explicacao/services/__tests__/explicacaoService.test.ts` (modified) — assert NO client fetch (server-side dispatch)
- `src/__tests__/guards/n8n-bundle.grep.test.ts` (created) — build/ + src/ grep guard

## Decisions Made
- **SEC-04 = Bearer-only, per Fernando's explicit sign-off.** No `getUser()`, no role, no posse. Rationale (verified in-repo): grep of `src/` for a browser/candidate caller is empty — only `submit-bigfive-final` (service_role) invokes this EF — so there is no end-user identity to authorize; a decoded-JWT role read is always `undefined` (Pitfall 4). Bearer self-auth is the sufficient IDOR closure. Implemented the cost-alerter constant-comparison pattern verbatim.
- **Guard extracted as an exported pure fn.** `guardDevolutivaBearer` lives at module scope (not inside `import.meta.main`) so the deno suite exercises the no-/wrong-/correct-Bearer paths directly without spinning up `Deno.serve` — the same testability move as 23-03's `cost-alerter/messages.ts`.
- **Dispatch anchored on the DB row mutation, not a fetch.** Triggers fire on the actual INSERT/UPDATE regardless of which code path wrote the row, so one canonical trigger covers both the EF atomic-submit path and the legacy `createCandidatura` path. Single Vault secret `n8n_webhook_base` (shared host + `/webhook` prefix); each trigger appends its event path.
- **Full subtree deletion to protect the tsc baseline.** Removing only the `fetch()` would have left `WEBHOOK_CONFIG`/`webhookLogger`/`sleep`/`isRetryableError` and 2 locals as fresh TS6133s (the 22-03 lesson). Deleted the whole dead subtree; tsc dropped 133→128.

## Deviations from Plan

None — plan executed exactly as written. Two mechanical refinements the plan already anticipated: (1) removing the client fetch orphaned `notificar_candidato` + `statusAnterior` locals, both deleted to avoid a fresh TS6133 (the plan's explicit "remove cleanly … avoid a fresh TS6133" instruction); (2) two pre-existing explicacaoService tests asserted the CLIENT fetch fires — updated to assert the fetch does NOT fire (dispatch is now server-side), which is the correct post-SEC-03 contract.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: pii-in-bundle | src/features/cadastro/services/n8nService.ts | Pre-existing SECOND n8n bundle leak (out of 24-05 scope): 9 hardcoded `n8n.srv881294.hstgr.cloud` webhook URLs + client-side POST of candidate PII (nome/email/telefone/**cpf**). Contains NO `n8n.cloud`/`fernandocosta` literal so the 24-05 guard neither covers nor false-flags it. Logged to `deferred-items.md`; sweep in Phase 25 or a follow-up SEC item (same fix: pg_net+Vault server-side + delete client URLs/PII). |

## Issues Encountered
- None blocking. The 2 explicacaoService fetch-assertion tests failed after the client removal (expected — they asserted the old client dispatch); rewritten to the server-side contract, all 71 feature tests green.

## Verification
- **SEC-04:** `deno test … gerar-devolutiva-bigfive` = 12 passed / 0 failed (incl. the 4 new authz cases); `grep -c "getUser().app_metadata\|app_metadata?.role" index.ts` = **0** (no role read added).
- **SEC-03 client:** `grep -rc "VITE_N8N\|n8n.cloud\|fernandocosta"` on both services = **0 / 0**.
- **SEC-03 migration:** `net.http_post` present (3 trigger dispatches); no BEGIN/COMMIT wrapper; graceful NULL skip on `n8n_webhook_base`; no candidaturas write DDL (RNF-07a).
- **SEC-03 guard:** `npm run build` → `grep -rl "n8n.cloud|fernandocosta" build/` = **0**; `npm run test:run -- n8n-bundle.grep` = **5 passed**.
- **Cross-cutting:** all guards 57/57 green; affected feature suites (vagas + explicacao) 71/71; **tsc = 128** (≤ 133 baseline, improved). No EF redeploy, no Vault write, no migration applied — all deferred to 24-08/24-09.

## Handoff Notes
- **24-08 (PROD apply + Vault):** (1) create the Vault secret `n8n_webhook_base` = the n8n host + `/webhook` prefix (e.g. `https://fernandocosta.app.n8n.cloud/webhook`) — the triggers append `/nova-candidatura` | `/status-candidatura` | `/revisao-decisao`; until it exists every trigger gracefully RETURNs (no error). (2) Apply `20260706110005_sec03_n8n_serverside.sql` via Supabase MCP `apply_migration` (bypasses 42601 on the `$$` bodies + writes the version row). (3) Ensure `DEVOLUTIVA_INVOKE_SECRET` is set (or rely on the SERVICE_KEY fallback) before the 24-09 EF live smoke.
- **24-09 (EF redeploy):** redeploy `gerar-devolutiva-bigfive` (bundle-freeze) so the Bearer guard goes live, then run the 401 (no/wrong Bearer) + 200 (service Bearer) live smoke. ALSO: `submit-candidatura` currently fires the nova-candidatura webhook post-commit via its own `N8N_NOVA_CANDIDATURA_URL` **env var** (server-side, not a bundle leak) — once the DB trigger owns that dispatch, drop that redundant EF env-var fire in 24-09 to avoid a double fire.
- **Phase 25 / follow-up SEC:** sweep `src/features/cadastro/services/n8nService.ts` (the deferred second bundle+PII leak).

## Self-Check: PASSED

- All 7 files (2 created + 5 modified) + this SUMMARY exist on disk.
- All 3 task commits present in git (`595727d`, `cb02563`, `5fb72fe`).
- No tracked files deleted across the 3 task commits.

---
*Phase: 24-blindagem-de-seguran-a-pii-lgpd*
*Completed: 2026-07-07*
