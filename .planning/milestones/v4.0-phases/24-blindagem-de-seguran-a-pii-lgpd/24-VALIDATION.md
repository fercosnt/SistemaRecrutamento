---
phase: 24
slug: blindagem-de-seguran-a-pii-lgpd
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-06
updated: 2026-07-06
---

# Phase 24 — Validation Strategy

> Security phase — the validation surface is SQL smokes simulating candidato / recrutador-não-dono (via `set_config('request.jwt.claims',...)`) proving 0-columns / 42501, plus Deno tests for EF authz and Vitest for candidate-facing projections. Per-task map populated by the planner (9 plans, 4 waves).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | SQL smokes via Supabase MCP `execute_sql` (RLS/GRANT proofs) + Deno test (EF authz + scorer golden) + Vitest (candidate-facing projection allowlists + grep guards) + tsc |
| **Config file** | `supabase/functions/deno.json`, `vite.config.ts`, `tsconfig.json` |
| **Quick run command** | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` (EF/scorer) · `npm run test:run` (client) |
| **Full suite command** | `deno test … && npm run test:run && npm run lint` |
| **Estimated runtime** | ~100s (code-local) + live SQL smokes via MCP at landing |

---

## Sampling Rate
- **After every task commit:** scoped Deno/Vitest for the touched module; SQL smoke FILE authored (executed live at landing).
- **After every plan wave:** full suite + the wave's SQL smokes.
- **Before verify:** all live SQL smokes green (0-columns / 42501 for candidato + recrutador-não-dono) via MCP + Deno + Vitest + tsc ≤ 133.

---

## Per-Task Verification Map

| Plan/Task | Req | Threat | Secure Behavior | Test | Command / Method | Status |
|-----------|-----|--------|-----------------|------|------------------|--------|
| 24-01 T1/T2 | all SEC + UX-08 | inferred-vs-live drift | live PROD policy/ACL/backup/predicate captured before authoring | MCP read | `execute_sql` pg_policies + column_privileges + to_regclass + auth_admin predicate → 24-LIVE-STATE.md | ⬜ Wave 1 |
| 24-02 T1 | SEC-01 | gabarito leak | candidato SELECT gabarito_idx denied; get_cognitivo_itens no key; base row denied | SQL smoke + vitest | sec01_07_smokes.sql (jwt=candidato) + cognitivoService.rpc.test.ts | ⬜ |
| 24-02 T2 | SEC-07 | rubric leak | candidate perguntas projection omits rubric; column REVOKE-bound | SQL smoke + vitest | sec01_07_smokes.sql + avaliacaoService.rubric.test.ts | ⬜ |
| 24-02 T3 | SEC-01/07 | — | repeatable candidato-DENY smoke + projection guards | SQL + vitest | `npm run test:run` + sec01_07_smokes.sql @ 24-08 | ⬜ |
| 24-03 T1/T2 | SEC-02 | essay verdict leak | candidato base-SELECT verdict denied; RH still reads; get_minha_redacao safe cols only | SQL smoke + vitest | sec02_smokes.sql (candidato vs RH) + redacaoService.rpc.test.ts | ⬜ |
| 24-03 T3 | SEC-02 | — | candidato-DENY + RH-intact + RPC-safe-projection | SQL + vitest | `npm run test:run` + sec02_smokes.sql @ 24-08 | ⬜ |
| 24-04 T1/T2 | SEC-05/06/08 | horizontal read | recrutador-não-dono → 0 rows analise/comparativo/candidaturas/redacoes; reprocessar 42501 | SQL smoke (3 jwt.claims) | sec05_08_smokes.sql; regression-guard reprocessar_analise | ⬜ |
| 24-05 T1 | SEC-04 | devolutiva IDOR | no-Bearer/wrong-Bearer → 401; service Bearer → 200 | Deno test | gerar-devolutiva-bigfive/__tests__/index.test.ts | ⬜ |
| 24-05 T2/T3 | SEC-03 | webhook in bundle | no n8n URL in build/; no VITE_N8N in src/ | grep guard | n8n-bundle.grep.test.ts (`grep -r 'n8n.cloud\|fernandocosta' build/ ⇒ 0`) | ⬜ |
| 24-06 T1 | SEC-09 | auth_admin drift | policy declared in migration (mirror live) | file + rebuild | grep auth_admin_le_usuarios_rh in migration; Phase-27 rebuild seals | ⬜ |
| 24-06 T1 | SEC-10 | permanent PII | backup_m2.candidaturas_pre_funil dropped | SQL smoke | `to_regclass(...)` → NULL @ 24-08 | ⬜ |
| 24-06 T2 | SEC-11 | console PII | no operational console.log in RH pages | grep guard | rh-console.grep.test.ts (ConfiguracoesPage + MeuPerfilPage) | ⬜ |
| 24-07 T1 | UX-08 | political items exposed | 4 O6 items inactive; get_bigfive_itens=116 | SQL smoke | count(*) WHERE ativo → 116 @ 24-08 | ⬜ |
| 24-07 T2/T3 | UX-08 | scorer integrity | scorer 116 items, 53 reversed, O prorated ×6/5; submit validates 116 | Deno golden + vitest | bigfive-scoring.test.ts + submit-bigfive-final test + bigfiveSchema test | ⬜ |
| 24-08 (Wave 3) | all DB reqs | migrations inert | all 8 migrations applied via MCP; live smokes prove enforcement | MCP apply + live SQL smoke | apply_migration + execute_sql set_config jwt.claims | ⬜ Wave 3 |
| 24-09 (Wave 4) | SEC-04, UX-08 | bundle-freeze | EFs redeployed; live 401/200 + 116-item submit | MCP + live EF smoke | functions deploy + live POST | ⬜ Wave 4 |

---

## Wave / Plan Layout

| Wave | Plans | Autonomous | Nature |
|------|-------|------------|--------|
| 1 | 24-01 | no | [BLOCKING] MCP live-state reads (first task of the phase) |
| 2 | 24-02, 24-03, 24-04, 24-05, 24-06, 24-07 | yes | code-local: migration FILES + client rewires + EF edits + tests (disjoint files) |
| 3 | 24-08 | no | [BLOCKING] apply 8 migrations via MCP + n8n Vault secret + live SQL smokes |
| 4 | 24-09 | no | [BLOCKING] redeploy gerar-devolutiva-bigfive + submit-bigfive-final + live EF smokes |

---

## Wave 0 Requirements
- [x] **[BLOCKING/non-autonomous] MCP live-state verification FIRST** → 24-01 (pg_policies + column ACLs on cognitivo_itens/perguntas/redacoes; exact auth_admin_le_usuarios_rh predicate; backup_m2 existence + column list; bigfive_itens count).
- [x] **[BLOCKING/non-autonomous] SEC migrations applied to PROD via Supabase MCP** → 24-08 (REVOKE + RPCs + policy swaps + backup DROP + auth_admin declaration + UX-08 deactivation + n8n Vault secret).
- [x] **[BLOCKING/non-autonomous] Redeploy affected EFs** → 24-09 (gerar-devolutiva-bigfive SEC-04; submit-bigfive-final UX-08 scorer bundle-freeze).
- [x] New Deno/Vitest test scaffolds → authored within their code-local plans (24-05 authz, 24-02/03 projections, 24-07 scorer golden, 24-05/06 grep guards).

---

## Manual-Only Verifications

| Behavior | Req | Why Manual | Instructions |
|----------|-----|------------|--------------|
| Live candidato cannot read gabarito/verdict/rubric via the real API | SEC-01/02/07 | Only a real authenticated candidate request proves the API projection | Seed candidato → GET the endpoints → confirm 0 sensitive columns (defer-friendly; the SQL smoke via MCP is the primary proof) |
| Recrutador-não-dono blocked live | SEC-05/06/08 | Real second-recruiter session | Two RH accounts, one queries the other's vaga → denied (no `role='rh'` account exists today — latent; admin bypass verified via jwt.claims simulation) |

*Most behaviors have automated SQL-smoke / Deno / Vitest verification; the live-session UATs above are optional confirmation.*

---

## Validation Sign-Off
- [x] Every SEC req has a SQL smoke or automated test proving the attacker is denied (per-task map above)
- [x] UX-08 scorer golden test targeted at 116-item + O-prorate (24-07 T2)
- [x] `nyquist_compliant: true` — per-task map filled

**Approval:** planner-approved 2026-07-06; live smokes execute at 24-08/24-09.
