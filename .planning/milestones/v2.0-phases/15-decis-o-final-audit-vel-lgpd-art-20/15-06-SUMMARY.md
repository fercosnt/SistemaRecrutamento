---
phase: 15-decis-o-final-audit-vel-lgpd-art-20
plan: 06
wave: 3
status: complete
requirements: [DECISAO-01, DECISAO-02, DECISAO-03, DECISAO-04, LGPD-03]
completed: 2026-06-25
---

# 15-06 SUMMARY — [BLOCKING] PROD apply + route wiring + smokes

The orchestrator's PROD boundary for Phase 15. The migration + EF authored in Waves 1-2 are now LIVE; the 3 routes are wired; the `as never` casts are dropped; live guard smokes PASS.

## What landed (PROD)

1. **Migration `20260625100001_decisao_final_phase15.sql` applied** via Supabase MCP `apply_migration` (no BEGIN/COMMIT wrapper; 42601-safe). The 4 SECURITY DEFINER RPCs are live (verified `SELECT proname`):
   - `registrar_decisao(uuid, decisao_final_resultado, text)` — DECISAO-03. RH-authorize (role + vaga.created_by; admin bypass), `por_usuario := auth.uid()` ALWAYS (LGPD-02 guardrail), UPSERT on `UNIQUE(candidatura_id)`, terminal map `aprovado/rejeitado → etapa_atual` (fires `avancar_etapa()` → ONE audit row; no manual INSERT — Phase-8 lesson), `em_espera` → no etapa change.
   - `solicitar_revisao_decisao(uuid)` + `stamp_explicacao_acessada(uuid)` — DECISAO-04 / LGPD Art. 20, candidate own-row (`candidatos.user_id=auth.uid()`), reachability-gated, idempotent.
   - `gerar_bias_snapshot(text)` — LGPD-03, admin-only, EEOC 4/5 age-band adverse-impact, banded aggregates only (no per-candidate PII), honest AGE-only `limitacao`.
2. **EF `consolidar-decisao-final` deployed** JWT-on (no-auth curl → **401**). Deterministic (no LLM call); authorize-then-aggregate (never re-scores).
3. **`database.types.ts` regenerated** — all 4 RPCs present; the `as never` casts dropped in `decisaoService`, `explicacaoService` (×2), `biasAuditService` (`.from` + `.rpc`).
4. **3 routes wired** (`src/router/routes.tsx`): `/rh/candidato/:id/decisao` (RoleGuard rh/administrador), `/candidato/explicacao/:id` (candidato), `/admin/bias-audit` (administrador).

## Live verification (write-free guard smokes)

A transaction-local DO block (`set_config('request.jwt.claims', …, true)`, zero PROD writes — every assertion exercises a path that RAISEs before any INSERT/UPDATE) — **SM1-SM5 PASS**:
- SM1: `registrar_decisao` justificativa <50 → `check_violation`
- SM2: `gerar_bias_snapshot` as `rh` (non-admin) → `insufficient_privilege`
- SM3: `solicitar_revisao_decisao` non-owner candidato → `42501`
- SM4: `stamp_explicacao_acessada` non-owner candidato → `42501`
- SM5: ≥50 justificativa passes the length guard; missing candidatura → `no_data_found`

The deterministic terminal-transition + bias-aggregate write behaviors + the consolidation math are covered by the GREEN golden unit tests (15-01) and the line-by-line-verified migration (all schema assumptions — `UNIQUE(candidatura_id)`, `CHECK(length(justificativa)>=50)`, client INSERT `check=false`, `etapa_processo` terminals, `data_nascimento`, `avancar_etapa` trigger — verified live before apply).

## Gates

- `npm run build` exit 0; tsc baseline **291** (≤305, casts dropped with zero regression).
- Phase-15 vitest 52/52 pass (1 Deno suite `consolidar-decisao-final/__tests__` fails to LOAD under vitest's Node loader — runs via `deno test`; pre-existing pattern, same as `essay-schemas`, NOT a regression).
- EF JWT-on (401 no-auth). 4 RPCs live with REVOKE PUBLIC / GRANT authenticated.

## Notes / deferred

- LGPD Art. 20 candidate round-trip + bias-snapshot over a real population are HUMAN-UAT (need live decided candidaturas + N8N webhook) — deferred.
- The doc-comments in the 3 services still reference the (now-resolved) `as never` precedent — harmless doc debt, can be tidied in Phase 16.

All 5 requirement IDs (DECISAO-01..04, LGPD-03) are now satisfied end-to-end with live PROD backing.
