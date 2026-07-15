---
phase: 32
slug: fechar-os-dois-vazamentos-vivos-cv-signed-url-ef-kpi-definer
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-15
---

# Phase 32 — Validation Strategy

> Per-phase validation contract. Derived from 32-RESEARCH.md §Validation Architecture. Security-first: the JWT-impersonated behavioral smoke is the load-bearing gate (above structural pg_policies/greps).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (client)** | Vitest ^4.1.9 |
| **Framework (EF)** | Deno test (`deno.land/std@0.224.0/assert`) |
| **Framework (DB)** | JWT-impersonated PL/pgSQL behavioral smoke (`.sql`, via MCP `execute_sql`) |
| **Quick run (client)** | `npm run test:run -- src/features/vagas/services/__tests__/cvUploadService.test.ts src/__tests__/guards/no-service-role-src.grep.test.ts` |
| **Quick run (EF)** | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/get-curriculo-url` |
| **Full suite** | `npm run test:run && npm run lint && npm run build` (+ deno test + smokes via MCP post-apply) |

---

## Sampling Rate

- **After every task commit:** the quick-run for the touched surface (Vitest for client/guard; `deno test` for the EF).
- **After every plan wave:** `npm run test:run && npm run lint && npm run build` + `deno test`.
- **Phase gate:** all Vitest + deno green; then AFTER MCP `apply_migration` + EF deploy, run `seg32_smokes.sql` via MCP `execute_sql` — every assertion `NOTICE PASS` (an `EXCEPTION` = a real leak). Behavioral smoke is load-bearing.
- **Max feedback latency:** ~30s (client), ~15s (deno).

---

## Per-Task Verification Map

| Req ID | Behavior | Secure Behavior | Test Type | Automated Command | File | Status |
|--------|----------|-----------------|-----------|-------------------|------|--------|
| SEG-01 | No auth→401; candidato/non-owner rh→403; NULL/missing CV→404; owner/admin→200 | authorize-THEN-authenticate; NULL curriculo_url → 404 | EF unit (deno) | `deno test … get-curriculo-url` | index.test.ts | ⬜ W0 |
| SEG-01 | Recruiter A can't get CV of vaga B via EF | vaga-owner guard in EF | DB smoke + deno | `execute_sql seg32_smokes.sql (a)` | seg32_smokes.sql | ⬜ W0 |
| SEG-01 | Storage RH role-only READ gone; candidate own-folder intact | remove only RH branch | DB smoke | `execute_sql seg32_smokes.sql (a/e)` | seg32_smokes.sql | ⬜ W0 |
| SEG-01 | No service_role + no client createSignedUrl over curriculos in src/ | EF is the only privileged path | Vitest grep guard | `test:run -- …/no-service-role-src.grep.test.ts` | (extend) | ⚠️ extend |
| SEG-01 | `getSignedUrl(candidatura_id)` invokes the EF (not createSignedUrl) | client never signs curriculos | Vitest unit | `test:run -- …/cvUploadService.test.ts` | (update) | ⚠️ update |
| SEG-02 | Recruiter A can't see vaga B numbers via funil_kpis | DEFINER internal vaga-scope | DB smoke | `execute_sql seg32_smokes.sql (b)` | seg32_smokes.sql | ⬜ W0 |
| SEG-02 | Recruiter A can't SELECT vaga B historico (RLS deny) | rh_le_historico WR-04 | DB smoke | `execute_sql seg32_smokes.sql (c)` | seg32_smokes.sql | ⬜ W0 |
| SEG-02 | funil_kpis returns zero PII (aggregates only) | no ator/candidate join | DB smoke (walk jsonb) | `execute_sql seg32_smokes.sql (d)` | seg32_smokes.sql | ⬜ W0 |
| SEG-02 | admin sees all; admin+p_vaga_id narrows; owner scope holds | scoping by construction | DB smoke | `execute_sql seg32_smokes.sql` | seg32_smokes.sql | ⬜ W0 |

---

## Wave 0 Requirements

- [ ] `supabase/functions/get-curriculo-url/index.ts` — the EF (SEG-01)
- [ ] `supabase/functions/get-curriculo-url/index.test.ts` — deno unit: 401 / 403-role / 403-owner / 404-NULL-CV / 200 (harness cloned from `submit-candidatura/index.test.ts`: `loadHandler()` + `makeChainable` mocks for `usuarios_rh`/`candidaturas`/`vagas` + mock `storage.from().createSignedUrl`)
- [ ] `supabase/tests/seg32_smokes.sql` — JWT-impersonated (a)-(e); disposable fixture (2 recruiters owning distinct vagas + 1 candidatura w/ CV path + a couple historico rows for a median), ROLLBACK-free cleanup (clone `funil12_status_rpc_smoke.sql` / `sec02_smokes.sql`)
- [ ] `src/__tests__/guards/no-service-role-src.grep.test.ts` — EXTEND with the client-`createSignedUrl`-over-curriculos tripwire
- [ ] `src/features/vagas/services/__tests__/cvUploadService.test.ts` — UPDATE `getSignedUrl` block to mock `functions.invoke`
- Framework install: none (all runners present).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live curl: no-auth→401, `candidato` JWT→403, `administrador` JWT→200 signed URL | SEG-01 | Confirms the deployed EF behaves in PROD (deno mocks the clients) | gotrue `/token` grant_type=password for a candidato + admin account → curl the EF with each Bearer |
| Cross-recruiter EF 403 via **live curl** | SEG-01 | **BLOCKED: 0 `role='recrutador'` PROD accounts** (research Pitfall 6). The deno unit test + the SQL smoke (a) are the AUTHORITATIVE cross-recruiter 403/deny gates instead. | n/a — covered by deno + SQL smoke |

*The cross-recruiter deny (the actual SEG-01/02 security contract) is proven by the deno unit test + SQL smokes, which do NOT need a live recruiter account.*

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (EF + deno test + seg32 smokes + 2 extended)
- [x] Behavioral smoke (JWT-impersonated) is the load-bearing gate
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — Wave 0 captured as tasks in 32-01-PLAN.md; behavioral smoke (seg32_smokes.sql) is the load-bearing gate, run GREEN in 32-04.
