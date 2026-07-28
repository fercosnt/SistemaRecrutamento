# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — M1 MVP Candidato

**Shipped:** 2026-06-06
**Phases:** 7 (1, 2, 3, 4, 4.1, 4.2, 5) | **Plans:** 43 | **Tasks:** 95

### What Was Built
- A secure, mobile-first ATS candidate experience on Supabase: register → login → password recovery (OTP) → browse jobs → apply with CV upload → real-data profile with application status.
- Security foundation: `service_role` removed from the browser bundle, single unified Zustand auth store with JWT-derived role, single role-aware `RoleGuard`, RLS anon-SELECT replaced by a `SECURITY DEFINER` RPC.
- First-ever CI pipeline (GitHub Actions: unit + e2e + lighthouse) + Lighthouse CI + axe-core a11y at zero WCAG A/AA violations — fully GREEN on a live run (27076233734).

### What Worked
- **Root-cause-at-the-primitive fixes cascade.** The a11y contrast failure across all glass routes was fixed once at the shared `BackgroundImage` primitive (a solid dark base layer); the semantic-token break was fixed once at the HSL-channel-triplet source in `globals.css`. One edit, many routes healed.
- **Smoke-runtime gate (Phase 4.1).** Calibrating Wave-0 RED tests against deliberately-unusable pages *before* implementation caught the "gates green but page unusable end-to-end" failure mode that the autonomous plan checker missed in Phase 4.
- **`hydrateFromSession` / `waitForCandidatoHydrated` bridge.** A single shared async-hydration pattern closed the `onAuthStateChange`→navigate race across all three login paths (cadastro auto-login, direct login, OTP recovery) — one abstraction, three journeys.
- **Measure-first on performance (D-06).** Rather than chase an unreachable Lighthouse Performance target, the team measured (0.62–0.68), accepted a documented warn-baseline, and kept Accessibility as the hard gate — avoiding scope creep.

### What Was Inefficient
- **CI was wired late.** The pipeline's first live run only happened in Phase 5 and surfaced 5 genuine gaps (GAP-05-CI-1..5) that a local runbook had masked. Wiring CI in Phase 1 would have caught E2E/a11y drift continuously instead of in one batch at the end.
- **Frozen 292-error tsc baseline.** Commits across phases bypass the husky gate via `core.hooksPath=/dev/null` — a documented but accumulating deviation. The gate exists but isn't enforced; the real fix (burn down the baseline) keeps deferring.
- **Tracking-file lag.** Several requirement checkboxes (e.g. HARD-05) and a `partial` UAT status were stale at milestone-close despite the underlying work being verified — caught and corrected during the audit, but added close-out friction.
- **Carryover sprawl in Phase 4.** Three unnumbered `04-08-CARRYOVER*` sub-plans (no SUMMARY) folded into the main summary; clean but made the plan/summary count reconcile awkwardly at audit time.

### Patterns Established
- **Híbrido git→DB** versioning pattern (no `-vN` filename suffix; git is source of truth, DB is runtime) — carries into M2's AI Prompt Library.
- **3-layer secret redaction** (service-level redacted logs + Vitest console-spy + node:fs grep guard) for any auth/PII flow.
- **Tier-1 (mocked, unconditional) vs Tier-2 (env-gated real-auth) E2E split** so CI stays deterministic under placeholder Supabase.
- **D-08-sanctioned `.exclude` with tracked reasons** for genuine axe false-positives, keeping the a11y gate at zero-violations without suppressing real issues.

### Key Lessons
1. **Wire CI on day one of a milestone, not at the hardening phase.** A green local runbook is not a green CI check; the first live run will surface real gaps.
2. **Fix accessibility/styling defects at the shared primitive, not per-page.** One `BackgroundImage` / token-source edit cascades to every consumer.
3. **Calibrate test gates against the broken state before implementing.** RED-against-unusable catches integration failures that per-unit green checks miss.
4. **Keep tracking files (REQUIREMENTS checkboxes, UAT/VALIDATION status) in lockstep with verification**, or budget an audit pass to reconcile them at milestone-close.
5. **A documented deviation is still debt.** The `core.hooksPath=/dev/null` baseline-bypass worked per-commit but should have had a burn-down plan, not an open-ended exemption.

### Cost Observations
- Model mix: predominantly Opus (orchestration + execution) with Sonnet for verification/integration-checker agents; Haiku reserved for simple extraction (planned for M2's CV-summary).
- Notable: gap-closure (05-07) + carryover iterations show the cost of late integration — several small fix-cycles that an earlier CI gate would have collapsed into the main flow.

---

## Milestone: v3.0 — M3 Refinamento RH & Hardening

**Shipped:** 2026-06-30
**Phases:** 4 (18–21) | **Plans:** 16

### What Was Built
EF resilience (per-call AI timeout + retry/backoff, devolutiva 5-dim parallel, `<AsyncState>` 5-state contract on 5 AI screens) + 2 funnel bug regressions (P18); route+vendor code-splitting (eager index 2.7MB→904KB) + targeted cache invalidation ≤60s (P19); secure RH guide-edit write-path (authenticate-THEN-authorize RPC + merge-preserve anti-silent-discard) (P20); live PROD UAT closure for the M2/M3 deferred HUMAN-UATs (P21).

### What Worked
- **Live UAT execution surfaced real defects no test had caught.** Driving the actual EFs in PROD (curl + Supabase MCP) found 3 genuine prod-breakers: the Big Five devolutiva never persisted (FK auth-uid vs candidatos.id), guide generation 500'd on every call (RESIL-01's 25s timeout was too tight), and autosave was silent to screen readers. All three pass unit tests / look fine in code review — only a live round-trip exposed them.
- **RESIL-02 fixing the devolutiva timeout *unmasked* the latent persist bug** — a reminder that one fix can reveal the next defect behind it.
- Deterministic-first validation (Playwright nav E2E, Supabase SQL/logs, prod build chunk-assert) closed the verifiable half cheaply; the visual residue went to a human runbook.

### What Was Inefficient
- The Tier-B a11y Playwright test claims a "real-login axe sweep" but has no login wiring → it never exercised the populated screens. Test-claim drift that a live UAT caught.
- The unit-test mock for `gerar-devolutiva-bigfive` collapsed `candidatos.id` and the auth uid into one value — exactly why the FK bug survived to prod (the mock didn't model the two id-spaces). The shared-contract-test lesson (`feedback_integration_contract_gap`) recurred.

### Patterns Established
- **Per-call AI timeout override** on the shared `callAi` (backward-compatible; only the heavy EF opts in) — the right shape for "one EF needs more time" without weakening global fast-fail.
- **Persistent aria-live region** for autosave affordances (stable wrapper, content swaps inside) — the reliable announce pattern.

### Key Lessons
- Live PROD UATs are not a formality — for an AI funnel they are the only thing that catches FK/timeout/RLS-id-space bugs that unit tests + code review pass clean.
- Model id-space indirections (candidatos.id vs auth.uid) explicitly in mocks, or the FK that enforces them in prod will be the test.

### Cost Observations
- Single autonomous session (Opus 4.8, 1M context) drove discuss→plan→execute→audit→complete. 3 EFs redeployed, 6 commits.
- Gates at close: vitest 692/692 · tsc 257 · build 0 · Deno EF 19/19.

---

## Milestone: v4.0 — M4 Correção & Blindagem do Funil

**Shipped:** 2026-07-13
**Phases:** 6 (22–27) | **Plans:** 43

### What Was Built
- Closed every candidate-facing PII/gabarito leak (cognitive `gabarito_idx`, SJT `rubric`, essay verdict) via column REVOKE / SECURITY DEFINER reader RPCs, vaga-scoped SELECT policies, and IDOR closure on the privileged EFs — RLS row-level is never a column secret (P24).
- Revived the silently-dead AI stack: the 7 `call_types` run real library prompts (not the 1-line stub), on a shared circuit breaker with retriable timeouts, a fail-open cost kill-switch, and NaN env guards; raw percentile removed from candidate + RH screens (P23).
- Eliminated the M1→M2 drift: RH Kanban / Editar-Vaga / decisão now operate over enums+columns that exist, no reject escapes the audit trail (RNF-07a trigger), and the candidate reaches+completes every stage with a non-manipulable `pontuar_sjt`, reachable cognitive, and re-application after soft-delete (P25/P26).
- Wired the regression net that would have caught every live defect: Deno EF corpus green in a blocking CI job, tsc gate pinned to a measured baseline (257→104), real client↔EF `.safeParse` contract tests, bundle + verify_jwt gates, and coverage of the sole sanctioned auto-reject (submit-candidatura knockout) (P22/P27).
- Migrations ledger converged live (73/73 version+name exact, 0 drift/orphans/missing); the baseline-fill + from-zero rebuild *proof* is the single sanctioned deferral (DBMIG-01).

### What Worked
- **Pre-apply / at-review verification caught real regressions before prod damage.** Verifying the LIVE function body (`pg_get_functiondef`) before a re-authored `CREATE OR REPLACE` caught that the DBMIG-02 trigger migration — authored from the Phase-6 body — would have silently dropped the Phase-14 ENTREV-03 bias-review flag-guard; the migration was rewritten to preserve it. Separately, code review caught the DBMIG-02 backfill's WHERE clause corrupting every genuine knockout audit row (CR-01) — fixed, and the live-data integrity query confirmed **0 corrupted rows**. Neither reached a bad prod state.
- **Behavioral SQL/EF smokes beat structural greps.** Impersonated-JWT + `SET ROLE authenticated` smokes caught two leaks that pg_policies/grep checks passed clean: a column REVOKE that is a no-op against a table-level GRANT (SEC-07), and an M1-era duplicate role-only policy that OR-defeated the new vaga-scoping (SEC-08) — both remediated same-day.

### What Was Inefficient
- **DBMIG-01 baseline-fill + clean-room rebuild needed infra the headless autonomous session lacked** (Docker / Supabase CLI-auth rebuild loop; `SUPABASE_ACCESS_TOKEN` unavailable) → the from-zero rebuild proof was deferred as an environment-gated sanctioned partial, even though the ledger-convergence half (the actual pgTAP/reproducibility unblock) landed and was verified live.

### Key Lessons
- **MCP `apply_migration` ledger drift is real and reconcilable.** It stamps a timestamp version-row, not the filename — the drift accumulated across M2–M4 converged in P27 by writing the correct version rows, not by re-running migrations.
- **Live behavioral smokes > structural greps** for any RLS/column/policy claim: a green grep or pg_policies dump proves the object exists, not that the leak is closed; only an impersonated-role read proves the projection.
- **Verify the live function body before `CREATE OR REPLACE`.** A migration re-authored from an old body silently reverts whatever the current live body added; diff against `pg_get_functiondef` first.

### Cost Observations
- Single `/gsd-autonomous` run (Opus 4.8, 1M context) drove all 6 phases discuss→plan→execute + milestone lifecycle. PROD landings (migrations via Supabase MCP `apply_migration`, EF redeploys via CLI) authorized by Fernando in the BLOCKING waves.
- Gates at close: vitest 774/774 · tsc 104 · Deno EF corpus 192/0 · build 0.

---

## Milestone: v6.0 — Operação do Funil RH

**Shipped:** 2026-07-17
**Phases:** 5 (31–35) | **Plans:** 20 | **Tasks:** 25

### What Was Built
The operational "esteira" that makes the already-evaluative funnel move by the RH's hand: avançar/rejeitar/retroceder across all 6 stages + reject-from-comparativo through one auditable write-path (P31); closure of the two live horizontal leaks — CV signed-URL EF authenticate-THEN-authorize + `funil_kpis` DEFINER + `rh_le_historico` WR-04 (P32, BLOCKING); the interview-scheduling data layer with bidirectional RLS + own-row RPC (P33); the RH surfaces — CV/IA/histórico, agendamento form, cross-vaga Fila + SLA badges, KPI dashboard replacing the dead M1 aggregation (P34); and the candidate's read-only agendamento card + client-side `.ics` + ≤24h badge (P35, "panel is the only channel").

### What Worked
- **Security-first ordering held end-to-end:** P32 (BLOCKING) closed the leaks and was smoke-proven (JWT-impersonated) *before* P34 rendered any UI that reads them — no IDOR/PII embarked on day 1. The retro-verification of P32 this cycle (deno 6/6 + live PROD schema dump + EF 401/403/404 curl) confirmed the choice paid off.
- **Reuse-and-tighten discipline:** 1 new table, 2 new read-primitives, 0 new npm, trigger `avancar_etapa()` never edited. The integration checker found 9/9 seams wired, 0 orphaned primitives, 0 bypassed secure paths.
- **Plan-checker caught a real coverage gap pre-execution** (P35 W1: a grep can't catch an inverted boolean on the `.ics`/badge gating → upgraded the card RTL test from optional to required), and it paid off — the test shipped and passed.
- **Adversarial code review + fix chain caught real defects post-execution:** P34 CR-01 (CV `window.open` after `await` → popup-blocked silent failure of the flagship feature) and P35 WR-01 (unvalidated link scheme reaching a candidate anchor) were both fixed before close.

### What Was Inefficient
- **Stale bookkeeping carried across sessions:** P32 shipped in a prior session without a VERIFICATION.md, and REQUIREMENTS.md checkboxes for AGEND-01/SEG-01/02/03 stayed `[ ]` even though satisfied — surfaced only at milestone audit. A per-phase "flip the checkbox + write VERIFICATION.md at close" habit would avoid the retro-verify.
- **The husky strict-`tsc` pre-commit vs. the 97-error pre-existing baseline** forced `--no-verify` on nearly every commit — sanctioned, but noisy. The baseline (cadastro/vagas + KanbanBoard P25) is real debt that keeps taxing every phase.

### Patterns Established
- Candidate own-row reads via DEFINER RPC allowlist (never `select('*')`, never base table) — column isolation from the RPC signature, not RLS.
- Client-side `.ics` (RFC 5545, CRLF, octet-aware line folding, UTC) as the no-email substitute; Blob/anchor download idiom.
- Extract-to-shared-util when a formatter (SP timezone) is needed by two surfaces, rather than component-to-component import.

### Key Lessons
- W-1 (Histórico renders `ator` UUID instead of recruiter name) shows a class of gap that passes functional verification + code review + security review but fails the *rendered contract* — the UI-audit was the first pass to catch display-contract completeness. Worth a name-resolution join as the top M6 follow-up.

### Cost Observations
- Model mix: executors/planner/fixers opus; verifiers/reviewers/auditors/checkers sonnet.
- Run: single autonomous `/gsd-autonomous` session (resumed at P34 after /clear), all subagents backgrounded to keep the orchestrator lean.
- Gates at close: **vitest 1013/1013 · tsc 97 (≤104 baseline) · build 0** · integration 9/9 · audit tech_debt.

---

## Milestone: v7.0 — M7 Comunicação com o Candidato (COMM)

**Shipped:** 2026-07-28
**Phases:** 6 (36–41) | **Plans:** 25 | **Tasks:** 26

### What Was Built
The transactional email pipeline that lets the candidate *know* the funnel is moving: verified sender identity on a dedicated subdomain (P36); the `notificacoes_enviadas` ledger with `UNIQUE(dedupe_key)` idempotency, retry queue and candidate-DENY RLS, plus `config_sla_etapa` (P37); the self-authenticating `notificar-candidato` EF that resolves data by explicit allowlist, claims before sending, renders four hand-rolled Beauty Smile templates and ports the M6 `.ics` verbatim (P38); the canonical `CASE` trigger on `historico_candidatura` plus two satellites, with the four `trg_n8n_*` triggers DROPped in the same phase (P39); the SLA estimate on the candidate panel (P40); and the Svix webhook + `pg_cron` retry sweep that closes the fire-and-forget loop (P41).

### What Worked
- **Ordering as a load-bearing constraint, not a preference.** The close session inherited two live CRITICAL defects and a verified-domain gate. Redeploying the fix *before* enabling delivery was what kept them latent — verifying the domain first would have converted "approved candidate receives a rejection letter" from a bug into real harm to real people. The STATE file recorded that ordering explicitly, and it was followed literally.
- **Proving by execution instead of by reading.** Every requirement that could be exercised in production was: a real approval drove `trigger → EF → Resend → webhook → ledger` and reconciled in 5 s. This surfaced things static verification structurally cannot — including that the `403 domain not verified` had actually stopped.
- **Secrets never left the database.** The Svix signature for the webhook proof was computed inside Postgres (`extensions.hmac`), so only a single-use signature travelled. Same discipline let the `edge_invoke_key` dispatch happen via `net.http_post` without the key entering the agent's context.
- **Supply-chain gate proved by integrity, not by reputation.** `npm:svix@1.99.1` was cleared by comparing `deno.lock` sha512 against the registry 1:1 across the *entire* transitive closure, and by checking for `postinstall` on every package — not just the top-level one.

### What Was Inefficient
- **The P39 gate skip cost the most.** The milestone's highest-risk phase closed with no VERIFICATION.md and no code review. Two CRITICAL defects then lived in production for two days. Everything the close session spent on review, live UAT and re-deploy was work that a gate at the right moment would have prevented.
- **Stale traceability bookkeeping, again.** 14 requirements sat as `Pending` with `[ ]` checkboxes while their phase VERIFICATIONs read `passed` — the same failure mode v6.0 already recorded. The intent was defensible (SUMMARYs deliberately withheld `requirements_completed` until behaviour was live), but the audit still had to reconcile it by hand.
- **Test-invocation ergonomics.** Running `deno test` with explicit directory paths silently bypasses `deno.json`'s `exclude`, dragging a Vitest-only file into the Deno run and producing a failure that looks like a regression. Cost a detour to characterise.

### Patterns Established
- **Guard placement relative to the claim matters as much as the guard itself.** CR-02's fix worked because the survivor-guard runs *before* claim-before-send — a guard placed after would have suppressed the email while leaving an orphaned `pendente` row for the retry sweep to resurrect.
- **Async dispatch means the EF sees post-COMMIT state.** `net.http_post` delivers after commit, so state-dependent guards belong in the Edge Function, not in an `AFTER INSERT` trigger that reads pre-update rows.
- **Compute signed proofs inside the database** when verifying a signature-authenticated endpoint, so the signing secret never enters the tool context.
- **Distinguish "absent" from "deliberately off".** `NOTIFICACOES_MODO` unset and set to `teste` behave identically but read very differently to an operator — the silent-failure mode only closes when the value is explicit.

### Key Lessons
- **Each verification layer catches a different class of defect, and none subsumes the others.** Code review found CR-01/CR-02; the live UAT found W-01 (an unbranched preheader) that review *and* the full test suite both passed clean — because the preheader is `display:none` and every existing assertion inspected visible body text. Skipping a layer does not merely delay discovery; it forfeits a category.
- **A configuration accident is not a control.** The `403` was containing two critical defects, and it was tempting to treat that as safety. It was an unverified DNS record — one dashboard click from evaporating.
- **Idempotency belts are worth proving in production.** A re-test using the same `Idempotency-Key` with a modified body was rejected by Resend with `409`. That behaviour had only ever been covered by a unit test.

### Cost Observations
- Model mix: orchestrator opus throughout; the close session ran entirely in the main thread because GSD subagents don't receive Supabase MCP tools (anthropics/claude-code#13898) and every integration claim here is only verifiable against PROD.
- Run: one `/gsd-autonomous` session that began blocked (MCP pinned `read_only`) and ended with the milestone archived.
- Gates at close: **vitest 1025/1025 · Deno EF 139 · tsc 97 (≤104 baseline)** · integration 6/6 · E2E 4/4 · audit tech_debt (0 gaps).

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 (M1 MVP Candidato) | 7 | 43 | First CI pipeline established; smoke-runtime gate pattern introduced (Phase 4.1); measure-first performance baseline |
| v4.0 (M4 Correção & Blindagem) | 6 (22–27) | 43 | Behavioral SQL/EF smokes as the primary live-verification gate; MCP apply_migration + ledger reconcile (73/73); hardening-only milestone (no feature expansion) |
| v6.0 (M6 Operação do Funil RH) | 5 (31–35) | 20 | Security-first phase ordering (BLOCKING leak-closure before any UI that reads it); plan-checker upgraded a test from optional to required pre-execution |
| v7.0 (M7 Comunicação / COMM) | 6 (36–41) | 25 | **Live production execution as the primary verification** (not code reading); supply-chain gate by lockfile-integrity diff; signed proofs computed inside Postgres so secrets never leave the DB |

### Cumulative Quality

| Milestone | Unit Tests | E2E (CI) | a11y |
|-----------|-----------|----------|------|
| v1.0 | 358 passing (Vitest) | full chromium green (31 passed / 0 failed) | 0 WCAG A/AA violations (5 public routes) |
| v4.0 | 774 passing (Vitest) | Deno EF corpus 192/0 in a blocking CI job; tsc gate pinned 104 | WCAG AA held from v2.0 (no new axe work) |
| v6.0 | 1013 passing (Vitest) | tsc 97 (≤104 baseline); build 0 | WCAG AA held |
| v7.0 | 1025 passing (Vitest) | Deno EF 139; tsc 97 (≤104 baseline) | WCAG AA held (P40 only frontend surface) |

### Top Lessons (Verified Across Milestones)

1. Wire CI early — a green local runbook ≠ a green CI check. *(v1.0)*
2. Fix shared-primitive defects once at the source; they cascade. *(v1.0)*
3. Live behavioral smokes (impersonated JWT + `SET ROLE`) catch column/policy leaks that structural greps and unit tests pass clean. *(v4.0)*
4. MCP `apply_migration` stamps a timestamp version-row, not the filename — ledger drift is real but reconcilable without re-running migrations. *(v4.0)*
5. A phase that skips its verification gate does not merely delay discovery — each layer catches a *different class* of defect, so skipping one forfeits a category outright. The highest-risk phase of v7.0 was the one that skipped it, and shipped two CRITICAL defects to production. *(v7.0)*
6. A configuration accident is not a control. Two critical defects were contained only by an unverified DNS record — one dashboard click from evaporating. *(v7.0)*
7. Verification bookkeeping drifts from verification *reality* across sessions, in both directions — v6.0 saw satisfied requirements left unchecked, v7.0 saw 14 of them. Reconciling at audit works, but it is rework. *(v6.0, v7.0)*

---
