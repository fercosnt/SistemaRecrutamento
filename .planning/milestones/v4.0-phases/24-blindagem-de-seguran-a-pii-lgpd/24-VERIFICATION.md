---
phase: 24-blindagem-de-seguran-a-pii-lgpd
verified: 2026-07-09T22:45:00Z
status: human_needed
score: 5/5 success criteria verified; 12/12 requirements satisfied
overrides_applied: 0
human_verification:
  - test: "UX-08 — live 116-item Big-Five submit (candidate session)"
    expected: "Big-Five screen shows 116 items (no political items); submit succeeds, scores_candidato written, candidaturas.status unchanged"
    why_human: "submit-bigfive-final is verify_jwt=true — a raw curl 401s at the gateway before body validation; needs a real candidate session on a candidatura in etapa avaliacao_assincrona"
  - test: "SEC-01/02/07 — live candidate API projection (candidate session)"
    expected: "GET /rest/v1/perguntas?select=rubric, GET /rest/v1/redacoes_candidato?select=red_flag_etico, GET /rest/v1/cognitivo_itens?select=gabarito_idx all return 0 sensitive values; candidate UI still renders via the DEFINER RPCs"
    why_human: "proves the real PostgREST projection a logged-in candidate's browser sees, beyond the simulated-JWT SQL smoke"
  - test: "SEC-05/06/08 — two-recruiter horizontal check (two RH sessions)"
    expected: "non-owner recruiter opens owner's vaga candidates/analyses → denied/empty; owner + administrador unaffected"
    why_human: "the SQL smoke simulated a non-owner via set_config; a real second-recruiter session is the belt-and-suspenders proof (no role='rh' test account existed at landing time)"
  - test: "SEC-04 — correct-Bearer devolutiva end-to-end (optional)"
    expected: "A full 200 with the correct service Bearer + a real score_id triggers a real devolutiva generation"
    why_human: "the no-Bearer/wrong-Bearer 401s are already proven live; a full 200 would expose the service key + trigger a real side-effect if curled directly, so it is deferred to a real invocation via submit-bigfive-final's own call path"
---

# Phase 24: Blindagem de Segurança / PII / LGPD — Verification Report

**Phase Goal:** Fechar todo vazamento de PII/gabarito e IDOR — RLS row-level nunca é segredo de coluna (→ column REVOKE / RPC SECURITY DEFINER), toda EF privilegiada autentica-E-autoriza, as SELECT policies são vaga-scoped, e dado sensível (gabarito cognitivo, veredito da redação, itens políticos) fica fora do alcance candidato. Invariante: IA recomenda, humano decide (RNF-07a).
**Verified:** 2026-07-09T22:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### ROADMAP Success Criteria (the contract)

| # | Success Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Candidato GET direto na tabela de gabarito cognitivo → 0 colunas de resposta (RPC-only); candidato não lê veredito da redação nem `rubric` | ✓ VERIFIED | `cognitivo_itens` row policy `auth_le_cognitivo_itens` DROPPED (migration `20260706110001`, live: 0 policies) + `get_cognitivo_itens()` DEFINER projects only id/secao/enunciado/alternativas/ordem. `perguntas.rubric`: bare column REVOKE (`20260706110002`) was proven a no-op live (`has_column_privilege=true`) — closed by remediation `20260709000001` (table REVOKE + 10-col re-GRANT); live smoke post-remediation: `has_column_privilege(authenticated/anon, rubric)=false`. `redacoes_candidato`: row policy `redacao_candidato_select` DROPPED (`20260706110003`) + `get_minha_redacao` DEFINER projects only safe cols; live smoke: candidate base-table read → 0 rows. |
| 2 | `gerar-devolutiva-bigfive` rejects caller sem Bearer+role+posse; recrutador não-dono não lê análise/comparativo/candidaturas de vaga alheia (vaga-scoped, não role-only) | ✓ VERIFIED | `guardDevolutivaBearer` (Bearer self-auth vs `SERVICE_KEY`) live in EF v13 — `supabase functions list` confirms `gerar-devolutiva-bigfive` ACTIVE v13, updated 2026-07-09 22:29:52, matching the WR-01 constant-time-compare redeploy. Live smoke: no-Bearer → 401, wrong-Bearer → 401. `analise_candidato_vaga`/`comparativo_solicitado`/`candidaturas` policies rewritten vaga-scoped (`20260706110004`, WR-04 predicate); a duplicate M1-era role-only policy pair on `candidaturas` that re-opened the leak via OR-combination was found by the behavioral smoke and closed by remediation `20260709000002`. Live smoke: non-owner → 0 rows on all 4 tables; owner/administrador unaffected. |
| 3 | Nenhuma URL de webhook n8n nem `console.log` operacional de RH aparece no bundle público / console PROD | ✓ VERIFIED | 3 n8n dispatch sites (candidaturasService ×2, explicacaoService) moved server-side to `pg_net`+Vault AFTER-triggers (`20260706110005`); client fetch/VITE_N8N reads deleted. `n8n-bundle.grep.test.ts` scans `build/` for `n8n.cloud`/`fernandocosta` literals + `src/` for `VITE_N8N` — both 0. `rh-console.grep.test.ts` covers `ConfiguracoesPage`/`MeuPerfilPage` (8 console.log stripped, incl. a candidate-email leak) + `decisao`/`entrevista`/`triagem` subtrees. |
| 4 | `supabase_auth_admin` SELECT policy sobre `usuarios_rh` declarada em migration file (sem drift execute_sql-only); backup PII `backup_m2.candidaturas_pre_funil` coberto por RLS/erasure ou removido | ✓ VERIFIED | `20260706110006_sec09_auth_admin_policy.sql` declares a byte-for-behavior mirror of the live predicate (`SELECT`/`{supabase_auth_admin}`/`USING(true)`) — confirmed against the 24-01 live-state capture, zero behavior change. `20260706110007_sec10_drop_backup.sql` DROP TABLE + DROP SCHEMA CASCADE; live smoke: `to_regclass('backup_m2.candidaturas_pre_funil')` → NULL (irreversible erasure done). |
| 5 | Os 4 itens políticos O6 do Big Five removidos do banco de itens | ✓ VERIFIED | `20260706110008_ux08_o6_deactivate.sql`: reversible `ativo` flag, items `{28,58,88,118}` set `ativo=false`, `get_bigfive_itens()` filters `WHERE b.ativo`. Live smoke: `bigfive_itens WHERE ativo`=116, `get_bigfive_itens()`=116, domains A/C/E/N=24/O=20. Scorer (`_shared/bigfive-scoring.ts`) accepts 116 non-contiguous items, prorates O ×6/5 (`BIGFIVE_TOTAL_ITENS=116`, `ACTIVE_ITEM_COUNT=116` — confirmed by direct grep of current source). `submit-bigfive-final` redeployed v7 (confirmed live: ACTIVE, updated 2026-07-09 22:10:38) bundles the 116-item validateBody. |

**Score:** 5/5 success criteria verified

### Requirements Coverage (SEC-01..11, UX-08)

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| SEC-01 | Gabarito cognitivo (`gabarito_idx`) — column REVOKE / RPC DEFINER-only | ✓ SATISFIED | Row-deny (real teeth) + `get_cognitivo_itens()` DEFINER + defense-in-depth column REVOKE. `cognitivoService.listItens` rewired to the RPC (grep-confirmed `.from('cognitivo_itens')`=0 in client). |
| SEC-02 | Candidato não lê veredito da redação — allowlist candidate-facing | ✓ SATISFIED | Row-deny (NOT column REVOKE, correctly — RH shares the `authenticated` role) + `get_minha_redacao` DEFINER own-row RPC, `status_analise` coarsened. `redacaoService.rpc.test.ts` regression-guards the base table is never touched. |
| SEC-03 | URLs n8n não hardcoded/expostas no bundle | ✓ SATISFIED | 3 fernandocosta-host dispatch sites (the audit-confirmed A11 scope) moved server-side via `pg_net`+Vault AFTER-triggers, graceful-skip if secret unset. `n8n-bundle.grep.test.ts` proves 0 in `build/` + `src/`. *Note: a second, pre-existing, out-of-scope n8n leak was discovered — see "Notable Finding (out of Phase 24 scope)" below.* |
| SEC-04 | `gerar-devolutiva-bigfive` autentica-E-autoriza | ✓ SATISFIED | Bearer self-auth (`guardDevolutivaBearer`) vs `SERVICE_KEY`; WR-01 fixed the timing side-channel with a constant-time compare (`timingSafeEqualStr`); WR-02 removed the unwired `DEVOLUTIVA_INVOKE_SECRET` override footgun. Live EF v13 confirmed via `supabase functions list` (ACTIVE, 2026-07-09 22:29:52). Live smoke: no-Bearer/wrong-Bearer → 401. |
| SEC-05 | `analise_candidato_vaga`/`comparativo_solicitado` SELECT vaga-scoped | ✓ SATISFIED | WR-04 predicate (administrador bypass OR rh-owns-vaga) applied (`20260706110004`). Live smoke: non-owner → 0 rows, owner → N rows, admin → all. |
| SEC-06 | Scoping horizontal aplicado a `analise_candidato_vaga` + reprocessar | ✓ SATISFIED | Same migration + `reprocessar_analise` (already vaga-scoped, Phase 14) regression-guarded — live smoke: non-owner call → 42501 `insufficient_privilege`. |
| SEC-07 | Serviço candidate-facing não seleciona `rubric` | ✓ SATISFIED | `avaliacaoService.ts` perguntas projection drops `rubric` from both the select string and the `PerguntaSjt` type. DB-level: table REVOKE + 10-col re-GRANT remediation (the bare column REVOKE was proven a no-op by the behavioral smoke and fixed same-day). |
| SEC-08 | RH policies de `candidaturas` (base-table) vaga-scoped | ✓ SATISFIED | WR-04 predicate applied to `rh_le_candidaturas`/`rh_avanca_etapa` (`20260706110004`); a duplicate M1-era role-only pair that re-opened the leak via OR-combination was found+fixed by remediation `20260709000002`. Live smoke: non-owner → 0 candidaturas + 0 redações after fix; owner → 7/4 (not over-blocked). |
| SEC-09 | Policy `supabase_auth_admin`/`usuarios_rh` declarada em migration file | ✓ SATISFIED | `20260706110006` — byte-for-behavior mirror, zero behavior change, drift ended (version-row reconcile explicitly deferred to Phase 27/DBMIG-01, tracked). |
| SEC-10 | Backup PII `backup_m2.candidaturas_pre_funil` coberto/removido | ✓ SATISFIED | `20260706110007` — DROP TABLE + DROP SCHEMA CASCADE. Live smoke: `to_regclass(...)` → NULL. Irreversible; erasure evidence (35 PII columns) captured in the migration comment before the drop. |
| SEC-11 | `console.log` operacional removido das páginas RH | ✓ SATISFIED (with a minor residual gap — see Anti-Patterns) | 8 console.log stripped from `ConfiguracoesPage`/`MeuPerfilPage` (incl. a candidate-email leak); `rh-console.grep.test.ts` extended to lock both. Code-review WR-03 found + fixed a residual instance in `candidaturasService.ts` (stripped `feedback_rejeicao`/operational logging from the RH update path in follow-up commit `bc72def`) — see Anti-Patterns for the guard-extension note. |
| UX-08 | 4 itens políticos O6 removidos do banco de itens | ✓ SATISFIED | Reversible `ativo` flag, `{28,58,88,118}` deactivated, `get_bigfive_itens()` filters `WHERE b.ativo`. Scorer/schema/screen/EF all moved to the 116-item lockstep (verified live in current source: `BIGFIVE_TOTAL_ITENS=116`, `ACTIVE_ITEM_COUNT=116`, `submit-bigfive-final` v7 deployed). |

**Score:** 12/12 requirements satisfied

### RNF-07a Invariant (IA recomenda, humano decide)

| Check | Status | Evidence |
|---|---|---|
| No migration in this phase writes `candidaturas.status` or auto-rejects | ✓ VERIFIED | `supabase/tests/sec05_08_smokes.sql` includes a structural RNF-07a check: scans every `pontuar_*` function body for `INSERT/UPDATE/DELETE ... candidaturas` — 0 matches, live-proven PASS. All 10 Phase-24 migrations reviewed directly (REVOKE/GRANT/DROP POLICY/CREATE POLICY/trigger-dispatch only) — none touch `candidaturas.status`. |
| `submit-bigfive-final` never auto-rejects | ✓ VERIFIED | Deno test `RNF-07a — never writes/updates candidaturas` passes; response body is the neutral `{ok:true}`, never a score. |

### Code Review Follow-up (CR-01 critical — closed)

| Item | Status | Evidence |
|---|---|---|
| CR-01 (critical): `explicacaoService.getExplicacao` shipped `decisao_final.justificativa` (internal RH reasoning, unused) over the wire to the candidate | ✓ FIXED | Follow-up commit `bc72def` (post-review) drops `justificativa` from `DECISAO_EXPLICACAO_ALLOWLIST` — confirmed by direct read of current `explicacaoService.ts` (allowlist is now exactly `decisao, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em`). Test `explicacaoService.test.ts` asserts the exclusion (`not.toMatch(/justificativa/)`). |
| WR-01 (warning): non-constant-time Bearer compare in `gerar-devolutiva-bigfive` | ✓ FIXED | `timingSafeEqualStr` now used in `guardDevolutivaBearer` (confirmed in current source); EF redeployed to v13 (confirmed live). |
| WR-02 (warning): unwired `DEVOLUTIVA_INVOKE_SECRET` override footgun | ✓ FIXED | Override removed; expected secret is now always `SERVICE_KEY` (confirmed in current source + commit message). |
| WR-03 (warning): residual SEC-11-class console logging in `candidaturasService.ts` | ✓ FIXED (leak closed); guard-list extension not applied | `feedback_rejeicao`/operational logging stripped from the RH update path (confirmed in current source: only `candidaturaId`/`error.message`/`error.code` logged). The reviewer's secondary suggestion — adding `candidaturasService.ts` to `rh-console.grep.test.ts`'s `RH_PATH_FILES` so a *future* regression re-fails — was not applied. The underlying leak is closed; this is a defense-in-depth gap, not an open leak (see Anti-Patterns). |
| IN-01 (info): stale "120" docstring in `bigfiveService.ts` | ✓ FIXED | Confirmed updated per commit `bc72def`. |
| IN-02 (info): dead `getRedacaoCandidato` export | Not fixed (info-only, accepted) | Reviewer explicitly flagged as info-level, no action required; zero production call sites, no security impact. |

### Gates (independently re-run, not trusted from SUMMARY)

| Gate | Claimed | Independently Verified | Status |
|---|---|---|---|
| `npm run lint` (tsc) | 128 | **128** (re-run) | ✓ MATCH |
| `npm run test:run` (vitest) | 752/752 | **752/752 passed** (re-run) | ✓ MATCH |
| `deno test` (EF/scorer corpus) | 187/187 | **187 passed, 0 failed** (re-run) | ✓ MATCH |
| `supabase functions list` (live PROD) | `gerar-devolutiva-bigfive` v13, `submit-bigfive-final` v7 | **Confirmed live**: `gerar-devolutiva-bigfive` ACTIVE v13 (updated 2026-07-09 22:29:52); `submit-bigfive-final` ACTIVE v7 (updated 2026-07-09 22:10:38) | ✓ MATCH |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/__tests__/guards/rh-console.grep.test.ts` | `RH_PATH_FILES` | `candidaturasService.ts` not added to the guard's file list despite carrying the same console-log class the reviewer flagged (WR-03) | ℹ️ Info | The actual leak (console.log with `feedback_rejeicao`) was already removed from the file directly — no live leak today. Without the guard entry, a *future* regression in this file would not be caught automatically. Recommend adding it in a follow-up. |
| `src/components/pages/ConfiguracoesPage.tsx`, `MeuPerfilPage.tsx` | multiple | `TODO(M5): ... (stub — sem log, SEC-11)` | ℹ️ Info | Pre-existing UI stub handlers (company data, webhook config, permissions, password-reset) explicitly deferred to M5. Each comment references the formal milestone (M5) and explicitly documents "no log" as the SEC-11-compliant state — not a debt marker requiring closure now. |
| `src/features/avaliacao/services/redacaoService.ts` | 168-199 | `getRedacaoCandidato` dead export (IN-02, accepted) | ℹ️ Info | Zero production call sites; a future consumer footgun (silently takes `rows[0]` from a multi-row RPC result) is documented in the review but not acted on — info-level, correctly left as-is. |

No `TBD`/`FIXME`/`XXX` unreferenced debt markers found in any file touched by this phase. No blocker-level anti-patterns found.

### Notable Finding (out of Phase 24's declared scope — not a gap)

`src/features/cadastro/services/n8nService.ts` hardcodes **9** n8n webhook URLs (a different host — `n8n.srv881294.hstgr.cloud` — distinct from the SEC-03 `fernandocosta.app.n8n.cloud` host that this phase closed) and POSTs candidate PII (nome, email, telefone, **cpf**) directly from the browser. This was discovered during Plan 24-05 and explicitly logged in `deferred-items.md` as DEFERRED, with a recommendation to sweep it in Phase 25 or a follow-up SEC item.

This is **not counted as a Phase 24 gap** because: (1) the phase's SEC-03 requirement is explicitly scoped to audit finding A11 (`M4-SYSTEM-AUDIT.md:551-560`), which names only `candidaturasService.ts` and `explicacaoService.ts` — not `n8nService.ts`; (2) it was transparently logged, not silently missed; (3) no later phase's ROADMAP success criteria explicitly claims this item (Phase 25's FUNIL-0x/UX-03/UX-06 requirements do not mention n8n/PII-in-bundle), so per Step 9b it cannot be formally deferred to a specific phase — it is surfaced here for a human tracking decision (new backlog item or explicit Phase 25/26 scope addition).

### Deferred Items (explicitly tracked, not gaps)

| # | Item | Tracked In | Rationale |
|---|---|---|---|
| 1 | SEC-03 n8n Vault secret (`n8n_webhook_base`) not created — server-side dispatch triggers graceful-skip until set | `deferred-items.md` | Operational secret Fernando owns; the *security* requirement (no URL in public bundle) is fully met without it. Human action, not a code gap. |
| 2 | `database.types.ts` regen + drop confined RPC casts (`get_cognitivo_itens`, `get_minha_redacao`) | `deferred-items.md` → Phase 27 | New RPCs live but untyped; confined casts are self-contained and green. Natural home is Phase 27 (migration/ledger reconstruction). |
| 3 | Ledger version-row reconcile (MCP `apply_migration` stamps its own timestamp, not the filename version) | `24-PROD-LANDING.md` → Phase 27/DBMIG-01 | Established project precedent (M2/M3/P23); `db push` drift is cosmetic, does not affect live enforcement. |
| 4 | Live 116-item candidate Big-Five submit; live candidate-session API projection checks; live two-recruiter horizontal check; live correct-Bearer devolutiva | `24-HUMAN-UAT.md` | Require a real authenticated session (candidate or a second RH account) the orchestrator cannot simulate; all underlying DB/RLS/EF boundaries are already proven live via SQL smokes + EF 401 smokes. See Human Verification section. |
| 5 | `usuarios_rh` also carries two `{authenticated} USING true` SELECT policies (broader RH-PII surface, any authed user reads all RH rows) | `24-LIVE-STATE.md` | Explicitly out of SEC-09's scope (SEC-09 only declares the pre-existing `auth_admin` policy). Logged for a future phase. |
| 6 | `devolutivas_candidato`/`historico_candidatura` role-only RH SELECT policies (same class as SEC-05/06/08 but lower sensitivity) | `20260706110004_sec05_08_vaga_scope.sql` inline note | Explicitly deferred to "Phase 25's funil-RH sweep" per the migration's own comment. |

## Human Verification Required

See frontmatter `human_verification`. All 4 items are documented in `24-HUMAN-UAT.md`, are optional/confirmatory (the DB/RLS/EF security boundaries are already proven live via SQL smokes + EF 401/200 smokes run during the 24-08/24-09 PROD landing), and require a real authenticated session (candidate or a second RH account) that cannot be simulated by an automated verifier.

## Gaps Summary

No BLOCKER-level gaps found. All 5 ROADMAP success criteria and all 12 requirements (SEC-01..11, UX-08) are independently verified against migration files, live EF versions (`supabase functions list`), live PROD smoke evidence documented in `24-PROD-LANDING.md`, and freshly re-run test gates (tsc 128, vitest 752/752, deno 187/187 — all matching claims exactly). The one CRITICAL code-review finding (CR-01, PII leak in `explicacaoService`) was verified FIXED in a follow-up commit, not left open. Two behavioral smokes during the PROD landing (SEC-07 bare-REVOKE no-op, SEC-08 duplicate-policy OR-leak) caught real structural gaps that the authored migrations alone did not close — both were remediated same-day with dedicated migrations, and the remediations are confirmed in the codebase.

The phase's only open items are (a) the 4 documented live HUMAN-UATs requiring a real session, (b) explicitly tracked deferred items (Vault secret, types regen, ledger reconcile — all routed to Phase 27 or human action), and (c) one out-of-scope discovery (`n8nService.ts` PII leak) that was transparently logged rather than silently missed, and does not map to Phase 24's declared requirement scope. Status is `human_needed` per the decision tree (human verification items present, even though all automated must-haves pass).

---

_Verified: 2026-07-09T22:45:00Z_
_Verifier: Claude (gsd-verifier)_
