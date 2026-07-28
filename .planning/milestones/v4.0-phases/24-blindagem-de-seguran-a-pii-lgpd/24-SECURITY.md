---
phase: 24-blindagem-de-seguran-a-pii-lgpd
secured: 2026-07-09
status: verified
asvs_level: 1
block_on: high
threats_total: 39
threats_closed: 39
threats_open: 0
mitigate_closed: 30
accept_closed: 9
smoke_driven_remediations_verified: 2
unregistered_flags: 1
register_authored_at_plan_time: true
---

# Phase 24 — Security Audit: Blindagem de Segurança / PII / LGPD

**Verdict:** SECURED — every declared mitigation is present in the implementation and,
where the mitigation is a live-DB/EF property, corroborated by the 24-PROD-LANDING.md
live-smoke evidence. Implementation files were treated as READ-ONLY (grep/read only).
Threat register was authored at plan time (`register_authored_at_plan_time: true`), so
verification confirmed each declared mitigation EXISTS in the right location rather than
scanning for net-new vulnerabilities.

**ASVS Level 1 · block_on: high.** No high/blocker-level gap found. The one out-of-scope
discovery (`n8nService.ts` second n8n leak) is a WARNING (`unregistered_flag`), not a
blocker, and is explicitly out of the SEC-03 (audit A11) scope.

---

## Threat Verification (39/39 CLOSED)

Each `mitigate` threat was verified by locating the actual mitigation (grep/read) in the
cited migration file, EF source, client service, or guard test — plus the live-smoke row
in 24-PROD-LANDING.md for DB/EF boundary properties. Each `accept` (`-SC`) threat is a
supply-chain zero-install claim, verified: no `package.json`/lockfile change since Phase-24
start (git log clean; last dep touch was Phase 22-02). Logged below in the accepted-risks
section.

### Plan 24-01 — Live-state grounding

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-24-01-01 | Tampering | mitigate | CLOSED — 24-LIVE-STATE captured live `auth_admin_le_usuarios_rh` = `SELECT/{supabase_auth_admin}/USING(true)`; `20260706110006_sec09_auth_admin_policy.sql:52-56` mirrors byte-for-behavior; live smoke "present & byte-for-behavior identical" (PROD-LANDING SEC-09). |
| T-24-01-02 | Information Disclosure | mitigate | CLOSED — `20260706110007_sec10_drop_backup.sql:13-18` records the 35 PII columns as erasure evidence before the DROP (captured in 24-01). |
| T-24-01-03 | Denial of Service | mitigate | CLOSED — A3 confirmed no authenticated reader of `gabarito_idx`/`rubric`; `avaliacaoService.ts:142` allowlist omits `rubric`; only `avaliar-redacao` (service_role) reads it. |
| T-24-01-SC | Tampering (supply-chain) | accept | CLOSED — zero new packages (see Accepted Risks). |

### Plan 24-02 — SEC-01 (gabarito) + SEC-07 (rubric)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-24-02-01 | Information Disclosure | mitigate | CLOSED — `20260706110001_sec01_cognitivo_gabarito.sql`: `DROP POLICY auth_le_cognitivo_itens` (L38) + `get_cognitivo_itens()` DEFINER projecting id/secao/enunciado/alternativas/ordem — no `gabarito_idx` (L42-51) + column REVOKE (L60). Live smoke: 0 candidate policies, RPC signature carries no key (PROD-LANDING SEC-01). |
| T-24-02-02 | Information Disclosure | mitigate | CLOSED — `sec07_rubric.sql:38` column REVOKE (noted as possible no-op) + remediation `20260709000001_sec07_rubric_remediation.sql:30-34` (table REVOKE + 10-col re-GRANT excluding rubric). Live smoke: `has_column_privilege(authenticated/anon, rubric)=false` (PROD-LANDING SEC-07). |
| T-24-02-03 | Denial of Service | mitigate | CLOSED — `cognitivoService.ts:168` reads via `.rpc('get_cognitivo_itens')`; no `.from('cognitivo_itens').select` list read remains. |
| T-24-02-SC | Tampering (supply-chain) | accept | CLOSED — zero new packages. |

### Plan 24-03 — SEC-02 (redação verdict)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-24-03-01 | Information Disclosure | mitigate | CLOSED — `20260706110003_sec02_redacao_verdict.sql`: `DROP POLICY redacao_candidato_select` (L46) + `get_minha_redacao(uuid)` DEFINER with `ca.user_id = auth.uid()` own-row guard (L82), projecting only safe cols — no verdict column (L68-77). Live smoke: candidate base-table read → 0 rows (PROD-LANDING SEC-02). |
| T-24-03-02 | Denial of Service | mitigate | CLOSED — mechanism is row-deny, NOT column REVOKE (Pitfall-1 avoided); `redacao_rh_select/update` untouched by this file; live smoke: RH still reads verdict (PROD-LANDING SEC-02). |
| T-24-03-03 | Information Disclosure | mitigate | CLOSED — `status_analise` coarsened in RPC (L75-77): only `'concluida'` verbatim, all other states → neutral `'em_analise'`. |
| T-24-03-SC | Tampering (supply-chain) | accept | CLOSED — zero new packages. |

### Plan 24-04 — SEC-05 / SEC-06 / SEC-08 (vaga-scoping)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-24-04-01 | Information Disclosure | mitigate | CLOSED — `20260706110004_sec05_08_vaga_scope.sql:41-57`: `rh_le_analise` + `rh_le_comparativo` swapped to WR-04 vaga-scoped (`created_by = (select auth.uid())`, admin bypass). Live smoke: non-owner → 0 rows on both (PROD-LANDING SEC-05/06). |
| T-24-04-02 | Information Disclosure / Tampering | mitigate | CLOSED — same file L62-87: `rh_le_candidaturas` (SELECT) + `rh_avanca_etapa` (UPDATE USING+WITH CHECK) vaga-scoped; **plus** remediation `20260709000002_sec08_candidaturas_dup_policy_remediation.sql` drops the M1-era role-only OR-leak pair and re-emits `rh_le_candidaturas` vaga-scoped preserving the non-draft filter. Live smoke: non-owner → 0 candidaturas after fix; owner → 7 (PROD-LANDING SEC-08). |
| T-24-04-03 | Information Disclosure | mitigate | CLOSED — same file L94-124: `redacao_rh_select/update` scoped via candidaturas→vagas JOIN. Live smoke: non-owner redacoes → 0 rows (PROD-LANDING SEC-08). |
| T-24-04-04 | Elevation of Privilege | mitigate | CLOSED — `reprocessar_analise` left as-is (already scoped, Phase 14); `sec05_08_smokes.sql` regression-guards non-owner call → 42501. Live smoke: 42501 insufficient_privilege (PROD-LANDING SEC-06 / VERIFICATION). |
| T-24-04-SC | Tampering (supply-chain) | accept | CLOSED — zero new packages. |

### Plan 24-05 — SEC-04 (devolutiva IDOR) + SEC-03 (n8n bundle)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-24-05-01 | Elevation / Information Disclosure | mitigate | CLOSED — `gerar-devolutiva-bigfive/index.ts:610-626` `guardDevolutivaBearer` (timing-safe exact-match vs SERVICE_KEY) invoked at L659, BEFORE any candidate row read. Live smoke: no-Bearer → 401, wrong-Bearer → 401 (PROD-LANDING SEC-04, EF v13). |
| T-24-05-02 | Information Disclosure / DoS | mitigate | CLOSED — `20260706110005_sec03_n8n_serverside.sql`: 3 AFTER-triggers PERFORM `net.http_post` reading Vault `n8n_webhook_base` (graceful NULL skip). Client removals: 0 `VITE_N8N`/`n8n.cloud`/`fernandocosta` in candidaturasService + explicacaoService. `n8n-bundle.grep.test.ts` guards build/ + src/. Live smoke: 3 triggers live, graceful-skip active (PROD-LANDING SEC-03). |
| T-24-05-03 | Spoofing | mitigate | CLOSED — no `getUser().app_metadata`/`app_metadata?.role` read in the EF (grep = 0); Bearer self-auth is the sole control (Pitfall-4 avoided). |
| T-24-05-SC | Tampering (supply-chain) | accept | CLOSED — zero new packages. |

### Plan 24-06 — SEC-09 (auth_admin) + SEC-10 (backup) + SEC-11 (console.log)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-24-06-01 | Denial of Service | mitigate | CLOSED — `20260706110006_sec09_auth_admin_policy.sql:47-56`: idempotent GRANT + DROP/CREATE `auth_admin_le_usuarios_rh` byte-for-behavior mirror. Live smoke: policy present, RH login unaffected (PROD-LANDING SEC-09). |
| T-24-06-02 | Information Disclosure / Compliance | mitigate | CLOSED — `20260706110007_sec10_drop_backup.sql:32-35`: DROP TABLE + DROP SCHEMA backup_m2 CASCADE. Live smoke: `to_regclass(...)` → NULL, irreversible erasure done (PROD-LANDING SEC-10). |
| T-24-06-03 | Information Disclosure | mitigate | CLOSED — 8 `console.log` stripped from ConfiguracoesPage + MeuPerfilPage (grep for forbidden console = 0); `rh-console.grep.test.ts:53-54` extends RH_PATH_FILES to both; FORBIDDEN_CONSOLE allows `console.error` (FX-14). |
| T-24-06-SC | Tampering (supply-chain) | accept | CLOSED — zero new packages. |

### Plan 24-07 — UX-08 (political O6 items + 116-item scorer)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-24-07-01 | Information Disclosure / Compliance | mitigate | CLOSED — `20260706110008_ux08_o6_deactivate.sql`: reversible `ativo` flag, `UPDATE ... ativo=false WHERE item_id IN (28,58,88,118)` (L56-58), `get_bigfive_itens()` `WHERE b.ativo` (L74). Live smoke: 116 active, {28,58,88,118} ativo=false (PROD-LANDING UX-08). |
| T-24-07-02 | Tampering (integrity) | mitigate | CLOSED — `bigfive-scoring.ts`: `ACTIVE_ITEM_COUNT=116`, count guard throws unless 116 (L261-262), REVERSED drops 88/118, `domainRaw.O = round((O*6)/5)` prorate only-O (L291). Golden Deno test asserts 116/53/prorate (187/187 pass). |
| T-24-07-03 | Denial of Service | mitigate | CLOSED — 6-site lockstep: scorer + `submit-bigfive-final` validateBody (ACTIVE_ITEM_IDS coverage, rejects 120-body, L108-110) + bigfiveSchema + screen copy + golden tests. No `for id=1..120` contiguity loop remains. |
| T-24-07-04 | RNF-07a (non-eliminatory) | accept/mitigate | CLOSED — scorer/submit write nothing to candidaturas, never auto-reject on trait/percentile; bands (UX-07) unchanged. Deno RNF-07a test passes. |
| T-24-07-SC | Tampering (supply-chain) | accept | CLOSED — zero new packages. |

### Plan 24-08 — PROD landing (apply + live smokes)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-24-08-01 | Information Disclosure | mitigate | CLOSED — 24-PROD-LANDING.md logs 10 version rows applied via MCP `apply_migration` + per-requirement live smokes (structural + behavioral attacker-JWT). |
| T-24-08-02 | Tampering (42601) | mitigate | CLOSED — applied via Supabase MCP apply_migration (bypasses 42601, writes version row); no outer BEGIN/COMMIT in any file. |
| T-24-08-03 | Denial of Service | mitigate | CLOSED — SEC-09 applied only after 24-01 byte-for-behavior confirmation; idempotent DROP/CREATE; live smoke: RH login unaffected. |
| T-24-08-04 | RNF-07a | mitigate | CLOSED — `sec05_08_smokes.sql` scans all `pontuar_*` bodies for candidaturas DML → 0; every applied statement only tightens SELECT/UPDATE / adds a reader / deactivates / drops. |
| T-24-08-SC | Tampering / Vault handling | accept/mitigate | CLOSED — zero new packages; n8n Vault secret set/rotated by Fernando, never committed (deferred human-action, does not affect the "no URL in bundle" security property). |

### Plan 24-09 — EF redeploys (bundle-freeze)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-24-09-01 | Elevation / Information Disclosure | mitigate | CLOSED — `gerar-devolutiva-bigfive` redeployed (v12→v13 after WR-01/WR-02 fixes); live smoke no-Bearer/wrong-Bearer → 401; `get_edge_function` confirms Bearer block in deployed bundle (PROD-LANDING Wave 4). |
| T-24-09-02 | Denial of Service / Tampering | mitigate | CLOSED — `submit-bigfive-final` redeployed v6→v7 bundling the 116-item scorer; deployed bundle carries the active-set validateBody (deno 10/10 incl. 116-active + 120-rejection). |
| T-24-09-03 | RNF-07a | mitigate | CLOSED — submit writes only `scores_candidato` (status='sucesso'), never candidaturas / never auto-rejects; verify_jwt unchanged on both EFs. |
| T-24-09-SC | Tampering (supply-chain) | accept | CLOSED — zero new packages. |

---

## Smoke-Driven Remediations (verified beyond the original register)

Both structural authored migrations passed their grep checks but the **behavioral**
live smokes (simulated attacker JWT under RLS) exposed real leaks the plan's original
migrations did not fully close. Both remediation migrations are present in the codebase
and confirmed by live smokes:

| Remediation | File | Verification |
|-------------|------|--------------|
| SEC-07 table-level REVOKE + column re-GRANT (the bare column REVOKE was a no-op vs Supabase's table GRANT) | `supabase/migrations/20260709000001_sec07_rubric_remediation.sql` | Present (REVOKE SELECT ON perguntas + GRANT on 10 non-rubric cols). Live smoke post-remediation: `has_column_privilege(authenticated/anon, rubric)=false`; 10 legit cols true. |
| SEC-08 duplicate-policy fix (M1-era role-only pair OR-defeated the vaga-scoping; a non-owner saw all 8 candidaturas) | `supabase/migrations/20260709000002_sec08_candidaturas_dup_policy_remediation.sql` | Present (drops "RH vê candidaturas de suas vagas" + "RH atualiza candidaturas"; re-emits vaga-scoped `rh_le_candidaturas`). Live smoke: non-owner → 0 candidaturas; owner → 7 (not over-blocked). |

---

## Code-Review Follow-up (independently re-confirmed present in source)

The Phase-24 code review (24-REVIEW.md) raised 1 CRITICAL + 3 WARNINGS + 2 INFO. All
security-relevant items are confirmed FIXED in the current source (READ-only checks):

| Item | Status | Evidence |
|------|--------|----------|
| CR-01 (critical) — `explicacaoService.getExplicacao` shipped internal RH `justificativa` PII over the wire | FIXED | `DECISAO_EXPLICACAO_ALLOWLIST` (explicacaoService.ts:84-85) = `decisao, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em` — `justificativa` removed. |
| WR-01 — non-constant-time Bearer compare | FIXED | `timingSafeEqualStr` (gerar-devolutiva-bigfive/index.ts:598-608) used in the guard (L618). |
| WR-02 — unwired `DEVOLUTIVA_INVOKE_SECRET` override footgun | FIXED | Override removed; guard compares to SERVICE_KEY only (L659; comment L654-658). |
| WR-03 — residual SEC-11-class console logging in candidaturasService | Leak CLOSED; guard-list extension NOT applied | `feedback_rejeicao` no longer logged (candidaturasService.ts:471 logs only id + error fields). Defense-in-depth gap (file not in RH_PATH_FILES) — INFO, not an open leak. |
| IN-01 — stale "120" docstring in bigfiveService | FIXED | per commit bc72def. |
| IN-02 — dead `getRedacaoCandidato` export | Accepted (info-only) | Zero production call sites; no security impact. |

---

## Unregistered Flags (WARNING — not a blocker under block_on: high)

| Flag | File | Description | Disposition |
|------|------|-------------|-------------|
| pii-in-bundle | `src/features/cadastro/services/n8nService.ts` | New attack surface surfaced in 24-05-SUMMARY `## Threat Flags` with NO mapping to a register threat: a SECOND n8n bundle leak — 9 hardcoded `n8n.srv881294.hstgr.cloud` webhook URLs + client-side POST of candidate PII (nome/email/telefone/**cpf**). Distinct host from the SEC-03 `fernandocosta.app.n8n.cloud` scope (audit A11), so the SEC-03 grep guard neither covers nor false-flags it. | Out of Phase-24 scope by construction (SEC-03 = A11, names only candidaturasService + explicacaoService). Transparently logged in `deferred-items.md` → sweep in Phase 25 (funil RH) or a follow-up SEC item (same fix: pg_net+Vault server-side + delete client URLs/PII). Per the audit constraints, NOT counted as a Phase-24 open threat. |

---

## Accepted Risks Log

| ID | Risk | Rationale | Verification |
|----|------|-----------|--------------|
| T-24-0N-SC (×9) | Supply-chain: package installs during Phase 24 | Phase 24 installs ZERO new packages (RESEARCH §Package Legitimacy Audit — vacuous). | Confirmed READ-only: no `package.json`/lockfile change since Phase-24 start (git log clean; last dep touch was Phase 22-02 vitest/happy-dom security bumps). |
| AR-08-SC (Vault handling) | The n8n `n8n_webhook_base` Vault secret is set/rotated by Fernando, never committed | Operational secret; the SEC-03 *security* requirement (no URL in the public bundle) is fully met by the migration + client removal without the secret. Server-side dispatch graceful-skips (no error) until the secret is set. | Deferred human-action, tracked in `deferred-items.md`; does not affect the enforced bundle-secrecy boundary. |

---

## Deferred Items (tracked, not gaps)

Routed elsewhere per project process — none is a Phase-24 security gap:

1. SEC-03 n8n Vault secret creation → human-action (`deferred-items.md`); bundle-secrecy already met.
2. `database.types.ts` regen + drop confined RPC casts (`get_cognitivo_itens`, `get_minha_redacao`) → Phase 27.
3. Ledger version-row reconcile (MCP apply stamps its own timestamp) → Phase 27 / DBMIG-01.
4. Live confirmatory HUMAN-UATs (116-item candidate submit; candidate-session API projection; two-recruiter horizontal; correct-Bearer devolutiva) → `24-HUMAN-UAT.md` — all underlying DB/RLS/EF boundaries already proven via SQL + EF 401 smokes.
5. `usuarios_rh` two `{authenticated} USING true` SELECT policies (broader RH-PII surface) → future phase; out of SEC-09 scope (SEC-09 only declares the auth_admin policy).
6. `devolutivas_candidato` / `historico_candidatura` role-only RH SELECT (same class as SEC-05/06/08, lower sensitivity) → Phase 25 funil-RH sweep (migration inline note).

---

## Verdict

**SECURED — threats_open: 0.** All 39 declared threats (30 mitigate + 9 supply-chain
accept) are CLOSED with the mitigation present in the implementation and, for DB/EF
boundary properties, corroborated by live-smoke evidence in 24-PROD-LANDING.md. The 2
smoke-driven remediations (SEC-07 table REVOKE, SEC-08 duplicate-policy) are present and
live-proven. One out-of-scope discovery (`n8nService.ts` pii-in-bundle) is logged as an
`unregistered_flag` WARNING — under `block_on: high` it does not block the phase, and it
is transparently tracked in `deferred-items.md` for Phase 25. No implementation file was
modified during this audit.

_Audited: 2026-07-09 · gsd-security-auditor · ASVS L1 · register_authored_at_plan_time=true_
