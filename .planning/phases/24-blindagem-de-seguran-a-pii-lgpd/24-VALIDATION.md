---
phase: 24
slug: blindagem-de-seguran-a-pii-lgpd
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-06
---

# Phase 24 — Validation Strategy

> Security phase — the validation surface is SQL smokes simulating candidato / recrutador-não-dono (via `set_config('request.jwt.claims',...)`) proving 0-columns / 42501, plus Deno tests for EF authz and Vitest for candidate-facing projections. Populated per-task by the planner.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | SQL smokes via Supabase MCP `execute_sql` (RLS/GRANT proofs) + Deno test (EF authz) + Vitest (candidate-facing projection allowlists) + tsc |
| **Config file** | `supabase/functions/deno.json`, `vite.config.ts`, `tsconfig.json` |
| **Quick run command** | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` (EF authz) |
| **Full suite command** | `deno test … && npm run test:run && npm run lint` |
| **Estimated runtime** | ~100s |

---

## Sampling Rate
- **After every task commit:** scoped Deno/Vitest for the touched module; for DB tasks, the SQL smoke via MCP (fixture + `set_config request.jwt.claims` + ROLLBACK-free cleanup, M2 SECURITY-gate pattern).
- **After every plan wave:** full suite + the wave's SQL smokes.
- **Before verify:** all SQL smokes green (0-columns / 42501 for candidato + recrutador-não-dono) + Deno + Vitest + tsc ≤ 133.

---

## Per-Task Verification Map

> Populated by the planner. Each SEC req → a SQL smoke (simulate the attacker role) or a Deno/Vitest test.

| Task | Req | Threat | Secure Behavior | Test | Command | Status |
|------|-----|--------|-----------------|------|---------|--------|
| — | SEC-01 | gabarito leak | candidato GET cognitivo_itens → 0 answer columns; gabarito_idx only via DEFINER RPC | SQL smoke | `set_config jwt candidato → SELECT gabarito_idx` → denied/revoked | ⬜ |
| — | SEC-02 | essay verdict leak | candidato can't read score/cor/red_flag/notas of own redação; RH still can | SQL smoke + vitest | candidato base-SELECT denied + DEFINER RPC safe-projection | ⬜ |
| — | SEC-07 | rubric leak | candidate-facing perguntas projection omits `rubric` | vitest/grep | service select has no `rubric` | ⬜ |
| — | SEC-04 | devolutiva IDOR | gerar-devolutiva-bigfive rejects no-Bearer/wrong-owner | deno | EF returns 401/403 without Bearer+role+posse | ⬜ |
| — | SEC-05/06/08 | horizontal read | recrutador-não-dono → 0 rows / 42501 on analise/comparativo/candidaturas/redacoes | SQL smoke | `set_config jwt other-recruiter → SELECT` → 0 rows | ⬜ |
| — | SEC-03 | webhook in bundle | no n8n URL in `npm run build` output | grep | `grep -r 'n8n\|webhook' build/` → 0 | ⬜ |
| — | SEC-09 | auth_admin drift | policy declared in migration file (mirror live) | file | migration contains `auth_admin_le_usuarios_rh` | ⬜ |
| — | SEC-10 | permanent PII | backup_m2.candidaturas_pre_funil dropped | SQL smoke | `to_regclass(...)` → null | ⬜ |
| — | SEC-11 | console PII | no operational console.log in RH pages | grep guard | grep RH pages → 0 | ⬜ |
| — | UX-08 | political items exposed | 4 O6 items not administered; scorer prorates O ×6/5; 116-item set works | deno+vitest | scorer golden test green w/ 116 + O prorate | ⬜ |

---

## Wave 0 Requirements
- [ ] **[BLOCKING/non-autonomous] MCP live-state verification FIRST** (per RESEARCH): pg_policies + column ACLs on cognitivo_itens/perguntas_formulario/redacoes; exact `auth_admin_le_usuarios_rh` predicate (confirmed: SELECT, supabase_auth_admin, USING true); `backup_m2.candidaturas_pre_funil` existence (**confirmed EXISTS**). (Orchestrator already ran the key checks.)
- [ ] **[BLOCKING/non-autonomous] SEC migrations applied to PROD via Supabase MCP** (REVOKE + RPCs + policy swaps + backup DROP + auth_admin declaration + UX-08 item deactivation).
- [ ] **[BLOCKING/non-autonomous] Redeploy affected EFs** (gerar-devolutiva-bigfive SEC-04; any candidate-facing service EF; UX-08 submit-bigfive-final + scorer consumers).
- [ ] New Deno/Vitest test scaffolds for EF authz + candidate-facing projections + the UX-08 scorer golden test.

---

## Manual-Only Verifications

| Behavior | Req | Why Manual | Instructions |
|----------|-----|------------|--------------|
| Live candidato cannot read gabarito/verdict/rubric via the real API | SEC-01/02/07 | Only a real authenticated candidate request proves the API projection | Seed candidato → GET the endpoints → confirm 0 sensitive columns |
| Recrutador-não-dono blocked live | SEC-05/06/08 | Real second-recruiter session | Two RH accounts, one queries the other's vaga → denied |

*Most behaviors have automated SQL-smoke / Deno / Vitest verification.*

---

## Validation Sign-Off
- [ ] Every SEC req has a SQL smoke or automated test proving the attacker is denied
- [ ] UX-08 scorer golden test green with the 116-item + O-prorate change
- [ ] `nyquist_compliant: true` set by planner after per-task map filled

**Approval:** pending
