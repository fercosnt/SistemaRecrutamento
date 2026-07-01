---
phase: 20
slug: refino-rh-editar-guia-de-entrevista-seed-001
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | SQL smokes (MCP `execute_sql`, ROLLBACK fixture) + deno test (EF merge) + vitest (service/hook/UI) |
| **Config file** | vite.config.ts; deno.json per EF |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && deno test supabase/functions/gerar-guia-entrevista` + SQL smokes |
| **Estimated runtime** | ~30s vitest + EF deno + manual SQL smokes |

---

## Sampling Rate

- **After every task commit:** `npm run test:run` (scoped where possible)
- **After the migration+RPC apply (PROD via MCP):** run the 5 SQL smokes (DENY/OK/upsert/dedup/role-from-table)
- **After the EF merge change:** deno test (merge-preserve incl. failed-regen + origem stamp)
- **Before `/gsd:verify-work`:** full suite green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (filled by planner / nyquist-auditor) | — | — | ENTREV-08 | RPC authenticate-THEN-authorize; RH-no-posse + candidato → 42501 | SQL smoke (MCP) | `execute_sql ROLLBACK fixture` | — | ⬜ pending |
| TBD | — | — | ENTREV-08 | merge never drops origem:'manual' (incl. failed regen) | unit (Deno) | `deno test gerar-guia-entrevista` | — | ⬜ pending |
| TBD | — | — | ENTREV-06/07 | edit/add/remove/reorder persists via RPC | unit (vitest) | `npm run test:run` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] SQL smoke harness for the RPC: set_config request.jwt.claims to simulate RH-with-posse (OK), RH-without-posse (42501), candidato (42501); upsert idempotency; dedup result; role-from-usuarios_rh resolution. Run via MCP `execute_sql` inside a ROLLBACK fixture.
- [ ] Deno test for the EF merge-preserve: a manual question survives a regen; a failed-regen (`guide ?? {incompleto}`) does NOT clobber manual questions; generated questions stamped origem:'ia'.
- [ ] vitest: saveGuiaEdits service + saveEdits hook (invalidates entrevistaKeys.guia) + EditablePerguntaRow + origem normalization (legacy → 'ia').

*The migration apply + EF redeploy are [BLOCKING] human-gated PROD steps; their live effect is verified by the SQL smokes (apply) and Phase 21 (round-trip).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RH edits/add/remove/reorder a real guide in PROD and it persists; regen preserves manual edits | ENTREV-06/07/08 | Needs real RH account + candidatura + live RPC/EF | Phase 21 live UAT |

*Automated layer covers the RPC authz logic (SQL smokes), the EF merge invariant (deno), and the service/hook/UI (vitest). The live RH round-trip is Phase 21.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
