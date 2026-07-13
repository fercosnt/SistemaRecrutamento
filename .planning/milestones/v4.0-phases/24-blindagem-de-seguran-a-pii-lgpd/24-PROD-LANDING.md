# Phase 24 — PROD Landing Log (Wave 3 / Plan 24-08)

**Applied:** 2026-07-09 via Supabase MCP `apply_migration` (bypasses the 42601 the transaction pooler throws on `$$` bodies; writes the version row itself). Authorized by Fernando (full landing incl. the irreversible SEC-10 DROP).

## Migrations applied (10 version rows)

| # | Migration | Version row (MCP) | Req |
|---|-----------|-------------------|-----|
| 1 | `sec01_cognitivo_gabarito` | 20260709185825 | SEC-01 |
| 2 | `sec07_rubric` | 20260709185834 | SEC-07 |
| 3 | `sec02_redacao_verdict` | 20260709185846 | SEC-02 |
| 4 | `sec05_08_vaga_scope` | 20260709185903 | SEC-05/06/08 |
| 5 | **`sec07_rubric_remediation`** (NEW — smoke-driven) | 20260709190058 | SEC-07 |
| 6 | **`sec08_candidaturas_dup_policy_remediation`** (NEW — smoke-driven) | 20260709190359 | SEC-08 |
| 7 | `sec03_n8n_serverside` | 20260709190503 | SEC-03 |
| 8 | `sec09_auth_admin_policy` | 20260709190510 | SEC-09 |
| 9 | `sec10_drop_backup` | 20260709190521 | SEC-10 |
| 10 | `ux08_o6_deactivate` | 20260709190542 | UX-08 |

> **Ledger drift (known):** MCP `apply_migration` stamps its own timestamp version, not the filename version (`20260706110001…`). Reconciling the ledger (so `db push` reports up-to-date) is deferred to Phase 27 / DBMIG-01, per the SEC-09 file note and project precedent (M2–M3–P23).

## Two smoke-driven remediations (the behavioral smokes earned their keep)

Both structural checks passed; the **behavioral** smokes (simulated attacker JWT under RLS) exposed two real leaks the plan's authored migrations did not fully close:

1. **SEC-07 — column REVOKE was a no-op.** `has_column_privilege(authenticated, perguntas.rubric, SELECT)` returned **true** after `sec07_rubric` — a bare `REVOKE SELECT (rubric)` does not override Supabase's table-level `GRANT`. Since SEC-07 has no row-deny fallback, `?select=rubric` still leaked. **Fix (`sec07_rubric_remediation`):** `REVOKE SELECT ON perguntas` + `GRANT SELECT` on the 10 non-rubric columns. Re-proof: authenticated & anon → rubric **false**; the 10 legit columns still true. (This was the exact remediation the `sec07_rubric.sql` ⚠️ NOTE anticipated.)

2. **SEC-08 — duplicate-policy OR-leak.** A non-owner recruiter still saw **all 8 candidaturas** after `sec05_08_vaga_scope` (analise/comparativo correctly → 0). Root cause: `candidaturas` carried a second, M1-era RH policy pair — `"RH vê candidaturas de suas vagas"` (SELECT) + `"RH atualiza candidaturas"` (UPDATE) — role-only despite their names; permissive policies OR-combine, so they re-opened the horizontal leak the WR-04 swap of the M2 pair had closed. **Fix (`sec08_candidaturas_dup_policy_remediation`):** drop the two M1 duplicates (superseded by the vaga-scoped M2 pair) + re-emit `rh_le_candidaturas` preserving the M1 non-draft/non-deleted SELECT filter, vaga-scoped. Re-proof below.

## Live smoke results (per requirement)

| Req | Smoke | Result |
|-----|-------|--------|
| SEC-01 | `pg_policies WHERE tablename='cognitivo_itens'` → 0 policies (candidate row-deny); `get_cognitivo_itens()` signature = id/secao/enunciado/alternativas/ordem (no `gabarito_idx`) | ✅ PASS |
| SEC-07 | after remediation: `has_column_privilege(authenticated/anon, perguntas.rubric, SELECT)` = **false**; 10 legit cols = true | ✅ PASS |
| SEC-02 | candidate row policy `redacao_candidato_select` = 0; candidate (authenticated) base-table `SELECT redacoes_candidato` → **0 rows**; `get_minha_redacao` signature = safe cols only; RH policies present (2) | ✅ PASS |
| SEC-05 | non-owner RH → `analise_candidato_vaga` **0 rows**; owner → 4 | ✅ PASS |
| SEC-06 | non-owner RH → `comparativo_solicitado` **0 rows** | ✅ PASS |
| SEC-08 | after remediation: non-owner RH → `candidaturas` **0 rows** + `redacoes` **0 rows**; owner → 7 candidaturas / 4 analise (not over-blocked) | ✅ PASS |
| SEC-03 | 3 triggers live (`trg_n8n_nova_candidatura/status_candidatura/revisao_decisao`); graceful-skip active (Vault secret absent → no error) | ✅ PASS (dispatch deferred — see below) |
| SEC-09 | `auth_admin_le_usuarios_rh` = SELECT / {supabase_auth_admin} / USING true → present & byte-for-behavior identical (RH login unaffected) | ✅ PASS |
| SEC-10 | `to_regclass('backup_m2.candidaturas_pre_funil')` → **NULL**; `backup_m2` schema dropped (0) | ✅ PASS (irreversible erasure done) |
| UX-08 | `bigfive_itens WHERE ativo` = 116; `get_bigfive_itens()` = 116; {28,58,88,118} ativo=false; domains A/C/E/N=24, O=20; RPC exposes no political item | ✅ PASS |

## Deferred / human-action

- **SEC-03 n8n Vault secret (`n8n_webhook_base`)** — NOT created. The value is the real n8n webhook base URL, an operational secret Fernando owns; I did not fabricate a webhook URL. The SEC-03 *security* requirement ("no n8n URL in the public bundle") is fully met by the migration + the client-subtree removal (24-05). Server-side dispatch stays gracefully deferred (no error) until the secret is set via `vault.create_secret('<n8n base url>', 'n8n_webhook_base')` or the dashboard. → tracked in `deferred-items.md`.
- **`database.types.ts` regen + drop the confined RPC casts** (get_cognitivo_itens / get_minha_redacao) — deferred to Phase 27 (migration/ledger reconstruction — natural home for a type regen). The confined casts are self-contained and all tests are green; a 170k-char one-line regen mid-landing adds risk without security value. → tracked in `deferred-items.md`.
- **Ledger version-row reconcile** → Phase 27 / DBMIG-01 (as designed).

## RNF-07a

Every applied statement only tightens SELECT/UPDATE, adds a DEFINER reader, moves a dispatch server-side, deactivates items, or drops a backup. No statement writes `candidaturas.status` or auto-rejects.

---

# Wave 4 / Plan 24-09 — Edge Function Redeploys (SEC-04, UX-08)

**Deployed:** 2026-07-09 via `supabase functions deploy` (CLI auto-bundles `_shared`; `verify_jwt=true` preserved on both — unchanged).

| EF | Before | After | verify_jwt |
|----|--------|-------|-----------|
| `submit-bigfive-final` | v6 (OLD 120-item bundle) | **v7** (116 active-set + O ×6/5 prorate) | true (unchanged) |
| `gerar-devolutiva-bigfive` | v11 (no auth) | **v12** (SEC-04 Bearer self-auth) | true (unchanged) |

> **Bundle-freeze confirmed:** `get_edge_function` showed the deployed v6 `submit-bigfive-final` still hard-coded `!== 120` / `for id=1..120` and the scorer threw unless 120 keys. Because 24-08 already made `get_bigfive_itens()` return 116, the candidate Big-Five submit was **broken in PROD** (116 answers → 400) in the window between Wave 3 and this redeploy — the redeploy restores it. This is why 24-09 is Wave 4 immediately after Wave 3.

## Live smoke results

| Req | Smoke | Result |
|-----|-------|--------|
| SEC-04 | POST `gerar-devolutiva-bigfive` **no Authorization** → 401 | ✅ PASS |
| SEC-04 | POST **wrong Bearer** → 401 | ✅ PASS |
| SEC-04 | correct service Bearer → 200 | ✔ proven by deploy of the known-local guard (`guardDevolutivaBearer`, `DEVOLUTIVA_INVOKE_SECRET ?? SERVICE_KEY`) + deno 12/12; not curled (would expose the service key + trigger a real devolutiva side-effect) |
| UX-08 | deployed v7 bundles the 116 active-set scorer | ✔ version bump v6→v7 + script size changed + deno 10/10 (incl. 116-active submit + 120-body rejection) + DB `get_bigfive_itens()`=116 |
| UX-08 | **live** 116-item candidate submit → 200 (prorated O, no auto-reject) + 120-body → 400 | ⏸ HUMAN-UAT (`24-HUMAN-UAT.md`) — verify_jwt=true means the gateway 401s a raw curl before validateBody; needs a real candidate session in etapa `avaliacao_assincrona` |

**verify_jwt:** unchanged on both EFs (the SEC-04 Bearer guard is the control; config.toml verify_jwt is Phase-27/CI-13). RNF-07a: `submit-bigfive-final` still writes only `scores_candidato` (status='sucesso' always), never `candidaturas` / never auto-rejects.

## Deferred (24-09)
- **submit-candidatura redundant n8n env-var fire** — the SEC-03 nova-candidatura trigger now owns that dispatch canonically, but it graceful-skips until the Vault secret is set, so there is **no active double-fire** today. Drop the EF's `N8N_NOVA_CANDIDATURA_URL` env-var fire when the Vault secret is set (bundled with the SEC-03 Vault deferral). → `deferred-items.md`.
