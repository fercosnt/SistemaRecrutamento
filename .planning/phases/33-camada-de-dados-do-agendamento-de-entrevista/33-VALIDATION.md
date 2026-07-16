---
phase: 33
slug: camada-de-dados-do-agendamento-de-entrevista
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-07-16
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **Phase 33 IS the security phase (SEG-03).** The JWT-impersonated behavioral smoke is the
> load-bearing acceptance gate, ABOVE any structural (`pg_policies`/grep) check.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **SQL behavioral smoke** run via Supabase MCP `execute_sql` (the DB-security "framework" in this repo — precedent `supabase/tests/seg32_smokes.sql`). Secondary: `tsc --noEmit` (type regen) + `vitest` (no new TS logic in P33). |
| **Config file** | none — smokes are self-contained `.sql` executed through MCP (P24/P31/P32 precedent) |
| **Quick run command** | MCP `execute_sql(<supabase/tests/seg33_agendamento_smokes.sql>)` → expect **8× `PASS (…)`** notices |
| **Full suite command** | `npm run lint` (tsc baseline ≤104) + `npm run test:run` (existing suite green) + the smoke above |
| **Estimated runtime** | smoke ~2s · lint ~30s · vitest ~40s |

---

## Sampling Rate

- **After every task commit:** `npm run lint` (tsc ≤104) after any `database.types.ts` change; grep the migration for the required policy/RPC shape (structural pre-check, **not** the gate).
- **After every plan wave:** `npm run test:run` (no regression — P33 adds no TS logic, so this is a guard, not a target).
- **Before phase gate (33-03):** the **8-assertion behavioral smoke GREEN in PROD** via MCP `execute_sql` — the SEG-03 acceptance gate — plus `supabase db push --linked` reporting "up to date" (ledger reconciled).
- **Max feedback latency:** ~40 seconds (vitest full run).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 33-02-01 | 02 | 0 | SEG-03 | T-33 (a) | cross-recruiter READ deny (A ⊄ B) | behavioral smoke | MCP `execute_sql seg33_agendamento_smokes.sql` | ❌ W0 | ⬜ pending |
| 33-02-02 | 02 | 0 | AGEND-01 | T-33 (b) | owner READ+WRITE allow; `agendado_por` set | behavioral smoke | same | ❌ W0 | ⬜ pending |
| 33-02-03 | 02 | 0 | SEG-03 | T-33 (c) | spoofed-`vaga_id` INSERT DENIED (Pitfall 1 discriminator) | behavioral smoke | same | ❌ W0 | ⬜ pending |
| 33-02-04 | 02 | 0 | SEG-03 | T-33 (d) | admin bypass reads any row | behavioral smoke | same | ❌ W0 | ⬜ pending |
| 33-02-05 | 02 | 0 | SEG-03 | T-33 (e) | candidate DIRECT base-table read → 0 rows (`observacoes_rh` unreachable) | behavioral smoke | same | ❌ W0 | ⬜ pending |
| 33-02-06 | 02 | 0 | SEG-03 | T-33 (f) | candidate RPC allow + column allowlist (no `observacoes_rh`/`entrevistador`/`agendado_por`/`updated_by`) | behavioral smoke | same | ❌ W0 | ⬜ pending |
| 33-02-07 | 02 | 0 | SEG-03 | T-33 (g) | cross-candidate RPC deny (other → 0 rows) | behavioral smoke | same | ❌ W0 | ⬜ pending |
| 33-02-08 | 02 | 0 | SEG-03 | T-33 (h) | candidate write deny (INSERT/UPDATE/DELETE → 42501/0) | behavioral smoke | same | ❌ W0 | ⬜ pending |
| 33-03-01 | 03 | GREEN | AGEND-01/SEG-03 | — | migration applied; types regen; tsc ≤104; **all 8 PASS** | build + smoke | `npm run db:types && npm run lint` + MCP smoke | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**GREEN gate rule (Pitfall 2):** count the `PASS (…)` notices — all **8** must be present. "No EXCEPTION raised" is INSUFFICIENT (a fixture failure that SKIPs every assertion can masquerade as success).

---

## Wave 0 Requirements

- [ ] `supabase/tests/seg33_agendamento_smokes.sql` — the 8 JWT-impersonated assertions (a–h) above; clone `seg32_smokes.sql` structure. Name avoids collision with the existing `perfil_rh_seg03_smoke.sql` (a different phase's SEG-03).
- [ ] Disposable fixed-UUID fixture: 2 real 0-vaga `usuarios_rh` users (recruiter A/B — **NOT synthetic**, `vagas.created_by` has FK `vagas_created_by_fkey`), a 3rd admin `usuarios_rh`, a real FK-bound candidato + a 2nd real candidato (assertion g), disposable vagaA(created_by=A, empty) + vagaB(created_by=B) + one candidatura on vagaB. Impersonate via `set_config('request.jwt.claims', …, false)` + `SET ROLE authenticated`. Cleanup deletes only disposable fixed-UUID rows.

*No conftest/framework install needed (SQL smokes are self-contained; MCP available).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | The full SEG-03 boundary is provable by the automated JWT-impersonated smoke in PROD | — |

*All phase behaviors have automated verification via the behavioral smoke.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`seg33_agendamento_smokes.sql`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 40s
- [ ] `nyquist_compliant: true` set in frontmatter (set by planner/executor once smoke authored)

**Approval:** pending
