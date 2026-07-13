---
phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring
verified: 2026-07-12T14:19:41Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
---

# Phase 26: Correção do Funil (lado candidato — alcançabilidade & scoring) Verification Report

**Phase Goal:** O candidato alcança e conclui cada etapa da avaliação com scoring íntegro e não-manipulável, vê apenas perguntas do próprio cargo/vaga, e consegue se reinscrever após soft-delete — com cards e copy que refletem o estado real. NUNCA auto-rejeita por score (RNF-07a).
**Verified:** 2026-07-12T14:19:41Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | FUNIL-01 — `pontuar_sjt` non-manipulable (dedup, full-battery denominator, re-submit lock, incomplete/empty-battery RAISEs, RNF-07a) | ✓ VERIFIED | Read `supabase/migrations/20260712100001_funil01_pontuar_sjt_v2.sql` in full: dedup RAISE 22023 (:134-138), denominator `ANY(v_battery)` in the `maxes` CTE (:181-186), re-submit lock keyed on `tipo='sjt' AND subtipo='mc' AND pergunta_id IS NULL AND status <> 'falhou'` → RAISE 42501 (:99-106), completeness RAISE 22023 (:148-154), empty-battery RAISE 22023 `'bateria SJT nao configurada'` placed BEFORE the dedup/completeness checks (:126-132). Zero `INSERT/UPDATE` into `candidaturas` anywhere in the file (grep confirms 0). Live-PROD proof: 26-07-SUMMARY.md assertions #1,#3,#4,#5,#6,#7 all PASS (dedup, subset-incomplete, full-battery denominator equality, re-submit-lock+single-row, empty-battery, RNF-07a unchanged) via impersonated-JWT smoke `funil01_pontuar_sjt_smokes.sql` (9 PASS notices, read in full). |
| 2 | FUNIL-07 — server battery-membership rejects out-of-battery `pergunta_id` (42501); client filters by `itens_ids`-else-cargo | ✓ VERIFIED | Server: block (E) in the same migration — `pergunta_id <> ALL(v_battery)` → RAISE 42501 `'pergunta fora da bateria'` (:140-146). Client: `avaliacaoService.ts` `getAvaliacaoContext` resolves the `tipo==='sjt'` element and applies `.in('id', itensIds)` when `itensIds.length>0` else `.eq('cargo', cargo)` (:151-176), read directly in the file. Live proof: 26-07-SUMMARY.md assertion #2 (foreign pergunta → 42501) PASS. |
| 3 | FUNIL-08 — `pontuar_cognitivo` (5-arg) gate ADDS `avaliacao_assincrona` while KEEPING interview stages; CR-01/CR-02 preserved; exactly ONE cognitivo card gated by `aplica_cognitivo`, routing to real `/candidato/prova-cognitiva/:id` | ✓ VERIFIED | Migration `20260712100002_funil08_pontuar_cognitivo_gate.sql` read in full: etapa gate `IN ('entrevista_online','entrevista_presencial','avaliacao_assincrona')` (:83), CR-01 empty-bank guard (`no_data_found`, :116-118) and CR-02 `cognitivo_respostas` insert (:140-149) both present/byte-preserved. `AvaliacaoContainer.tsx` read in full: `deriveCards` `continue`s the main loop on `templateTeste === 'cognitivo'` (:364) and appends exactly one gated card when `ctx.aplica_cognitivo === true` (:385-391); `CONTAINER_TESTE_CONFIG.cognitivo.route` = `/candidato/prova-cognitiva/${id}` (:96), no stub route remains. `cognitivo-contract.test.ts` locks the route↔gate invariant against the REAL exports. `src/lib/testes/testeContract.ts` confirmed untouched since Phase 25 (`git log` shows last commit `f8d3428`, pre-dating Phase 26). Live proof: 26-07-SUMMARY.md assertions #8/#8b PASS (async accepted, non-eligible etapa still rejected). |
| 4 | FUNIL-12 — `get_avaliacao_status` returns presence-booleans only (IDOR 42501); container derives ALL card state from it, zero `entry.status` reads | ✓ VERIFIED | Migration `20260712100003_funil12_get_avaliacao_status.sql` read in full: ownership-only gate (no etapa clause) RAISEs 42501 (:75-77); return payload is `jsonb_build_object` of `registrado`/`iniciado` booleans for all 5 cards, no `score`/`status`/`score_max`/`metadata` key anywhere. `AvaliacaoContainer.tsx`: `grep -c "entry.status"` on the live file = 0; `deriveCardState()` (:323-331) maps every one of the 5 container card ids 1:1 onto the RPC's booleans and every `templateTesteToContainerCards` fan-out plus the gated cognitivo append calls it (:376, :388). Live proof: 26-07-SUMMARY.md assertions #9 (booleans-only, no verdict key) and #10 (foreign caller → 42501) PASS. |
| 5 | FUNIL-10 — legacy unfiltered unique index/constraint on `candidaturas(candidato_id,vaga_id)` dropped; partial keeper remains; reinscription smoke authored | ✓ VERIFIED | `supabase/tests/funil10_reinscricao_smoke.sql` read in full: asserts insert→soft-delete→re-insert with no 23505, plus a `pg_index` count assertion that exactly one partial (`WHERE deleted_at IS NULL`) unique index remains. 26-07-SUMMARY.md Task 2 records the discovery (`unique_candidato_vaga` UNIQUE constraint, no `deleted_at` filter — dropped via `ALTER TABLE ... DROP CONSTRAINT`) and the live smoke result: PASS (assertion #11 in Task 3 table). Confirmed NOT a no-op — a real offender was found and removed. |
| 6 | UX-01 — canonical "Acompanhe o andamento pelo seu painel." on 6 screens + grep guard; `AutorizacoesStep` untouched | ✓ VERIFIED | Directly grepped all 6 files (`AvaliacaoContainer.tsx:229`, `RedacaoEditorScreen.tsx:278`, `DevolutivaBigFiveView.tsx:157`, `ProvaCognitivaScreen.tsx:18+82`, `SolicitarRevisaoCTA.tsx:45`, `SuporteRHPage.tsx:163`) — canonical string present in all 6, zero residual `avisaremos…e-mail`/`receberá…e-mail` promise in any. `src/__tests__/guards/wait-state-copy.grep.test.ts` read in full: scoped 6-file allowlist, ban regex, positive assertion, `AutorizacoesStep` no-false-positive sub-test. `AutorizacoesStep.tsx` confirmed untouched by `git log` (last touch is a Phase-2 commit, `53b5e75`). |
| 7 | n8n 2nd leak — client `n8nService.ts` subtree deleted (zero runtime callers), server-side `AFTER INSERT` trigger (PII-free body, graceful-skip), bundle grep guard extended | ✓ VERIFIED | `n8nService.ts` and its test confirmed deleted from disk; barrel `index.ts` has 0 occurrences of `n8nService`; `grep -rn "notifyCandidatoCriado\|N8N_WORKFLOWS\|sendToN8N" src/` = 0 dangling references. Migration `20260712100004_n8n_novo_candidato.sql` read in full: body carries only `NEW.id` (no PII field names), graceful `RETURN NEW` when the Vault secret is NULL, never writes `candidatos`. `n8n-bundle.grep.test.ts` read in full: bans the hstgr host as an exact token (carve-out dropped) plus PII-field-co-located-with-n8n-host detection, with no-false-positive sub-tests. Live proof: 26-07-SUMMARY.md confirms the trigger + `to_regprocedure` exist live and the trigger smoke graceful-skips (Vault secret still NULL, expected/deferred). |
| 8 | Gates: vitest 774/774, tsc ≤ 107, all 4 migrations LIVE on PROD, 11/11 behavioral assertions PASS | ✓ VERIFIED | Independently ran `npm run lint` → 104 TS errors (≤ 107 frozen baseline). Independently ran `npm run test:run` → **774 passed (774)**, 98 test files, 0 failures — matches the SUMMARY claim exactly (not just trusted). 26-07-SUMMARY.md (the authoritative live-PROD evidence per this phase's own discipline) records all 4 migrations applied via MCP `apply_migration` with live object verification (`to_regprocedure`/`pg_get_functiondef`/trigger presence) and an 11-row assertion table, all PASS, plus a zero-residue confirmation. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260712100001_funil01_pontuar_sjt_v2.sql` | Non-manipulable `pontuar_sjt` v2 | ✓ VERIFIED | Read in full; all guards/denominator/lock present; no txn wrapper; correct REVOKE/GRANT tail |
| `supabase/migrations/20260712100002_funil08_pontuar_cognitivo_gate.sql` | 5-arg `pontuar_cognitivo` gate relax | ✓ VERIFIED | Read in full; etapa IN list widened, CR-01/CR-02/CTT preserved byte-for-byte |
| `supabase/migrations/20260712100003_funil12_get_avaliacao_status.sql` | Neutral status RPC | ✓ VERIFIED | Read in full; booleans-only, IDOR-gated, correct card→source map |
| `supabase/migrations/20260712100004_n8n_novo_candidato.sql` | Server-side n8n dispatch trigger | ✓ VERIFIED | Read in full; PII-free id-only body, graceful-skip, RNF-07a |
| `supabase/tests/funil01_pontuar_sjt_smokes.sql` | 7-assertion behavioral smoke | ✓ VERIFIED | 9 PASS notices present; impersonation idiom confirmed |
| `supabase/tests/funil08_pontuar_cognitivo_smokes.sql` | async+interview smoke | ✓ VERIFIED | 3 PASS notices present |
| `supabase/tests/funil12_status_rpc_smoke.sql` | booleans-only + IDOR smoke | ✓ VERIFIED | 3 PASS notices present; read setup/assertions in full |
| `supabase/tests/funil10_reinscricao_smoke.sql` | reinscription smoke | ✓ VERIFIED | Read in full; insert→soft-delete→re-insert + index-count assertion |
| `supabase/tests/n8n_novo_candidato_smoke.sql` | graceful-skip smoke | ✓ VERIFIED | 3 PASS notices present |
| `src/features/avaliacao/services/avaliacaoService.ts` | battery filter, `aplica_cognitivo`, `getAvaliacaoStatus`, neutral error mapping | ✓ VERIFIED | Read in full; all 4 deltas present, no `select('*')` introduced |
| `src/features/avaliacao/components/AvaliacaoContainer.tsx` | cognitivo gate/route + card-state-from-RPC | ✓ VERIFIED | Read in full; phantom `entry.status` = 0 occurrences; gated single card |
| `src/__tests__/guards/n8n-bundle.grep.test.ts` | extended host/PII ban | ✓ VERIFIED | Read in full; hstgr host banned, no-false-positive sub-tests present |
| `src/__tests__/guards/wait-state-copy.grep.test.ts` | scoped UX-01 regression net | ✓ VERIFIED | Exists, scoped to 6 files, canonical assertion + AutorizacoesStep allow-test |
| `src/features/avaliacao/__tests__/cognitivo-contract.test.ts` | route↔gate contract | ✓ VERIFIED | Read in full; imports real container exports, not a replica |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `pontuar_sjt` v2 | `scores_candidato` | one MC row insert, re-submit lock keys same tuple | ✓ WIRED | Confirmed in migration body |
| `pontuar_sjt` v2 | `perguntas_opcao_sjt` | Σ peso re-derivation + MAX(peso) over full battery | ✓ WIRED | Confirmed in `maxes`/`scored` CTEs |
| `get_avaliacao_status` | `scores_candidato`/`redacoes_candidato`/`respostas_avaliacao` | EXISTS presence booleans | ✓ WIRED | Confirmed — redacao correctly sourced from `redacoes_candidato`, not a phantom `scores_candidato` key |
| `pontuar_cognitivo` gate | `candidaturas.etapa_atual` | authz IN-list includes `avaliacao_assincrona` | ✓ WIRED | Confirmed live per 26-07-SUMMARY assertion #8 |
| `avaliacaoService.ts` | `supabase.from('perguntas')` | `.in('id', itensIds)` else `.eq('cargo', cargo)` | ✓ WIRED | Confirmed in file, both branches present |
| `avaliacaoService.ts` | `get_avaliacao_status` RPC | narrow confined cast | ✓ WIRED | Confirmed, with "Drop the cast after Phase-27 regen" note |
| `AvaliacaoContainer.tsx` | `getAvaliacaoStatus` | TanStack Query sibling query, `deriveCardState` | ✓ WIRED | Confirmed — feeds all 5 cards, not just cognitivo |
| `n8n_novo_candidato.sql` trigger | `vault.decrypted_secrets` + `net.http_post` | read secret → graceful skip if NULL → id-only body | ✓ WIRED | Confirmed; live behavior is the expected graceful-skip (secret still unset) |
| `index.ts` (cadastro barrel) | (deleted) `n8nService` | removed re-export line | ✓ WIRED (removal confirmed) | `grep -c "n8nService"` = 0 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `AvaliacaoContainer` cards | `cards` (from `deriveCards(data, statusData)`) | `getAvaliacaoContext` (candidatura+vaga) + `getAvaliacaoStatus` (RPC booleans) | Yes — both are live TanStack Queries hitting real RPCs/tables, confirmed live on PROD via 26-07 smokes | ✓ FLOWING |
| `pontuar_sjt` score | `v_score`/`v_max` | `perguntas_opcao_sjt` server-side re-derivation, never client-supplied | Yes — confirmed live-PROD assertion #4 (denominator = Σ MAX(peso) over full battery, not client input) | ✓ FLOWING |
| `get_avaliacao_status` payload | per-card booleans | `EXISTS` queries against the candidate's own rows (not vaga-level config) | Yes — confirmed live-PROD assertion #9 (booleans only, own-row truth) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `npm run test:run` | 774 passed (774), 98 files, 0 failed | ✓ PASS |
| Type-check baseline held | `npm run lint` (tsc --noEmit) | 104 errors (≤ 107 frozen baseline) | ✓ PASS |
| No debt markers in Phase-26 touched files | `grep -inE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across all migrations/services/components/guards/smokes/tests | 0 matches | ✓ PASS |
| n8nService fully removed, zero dangling runtime refs | `grep -rn "notifyCandidatoCriado\|N8N_WORKFLOWS\|sendToN8N" src/` | 0 matches | ✓ PASS |
| `testeContract.ts` untouched (Phase-25 FUNIL-05 guard integrity) | `git log --oneline -- src/lib/testes/testeContract.ts` | Last commit `f8d3428` (Phase 25), no Phase-26 commit | ✓ PASS |

### Probe Execution

Not applicable in the conventional sense (no `scripts/*/tests/probe-*.sh` files) — this phase's load-bearing acceptance gate is the SQL behavioral smoke suite (`supabase/tests/funil*.sql` + `n8n_novo_candidato_smoke.sql`), run live against PROD via Supabase MCP `execute_sql` in the BLOCKING plan 26-07 (non-autonomous, human-verify checkpoint). Per the phase's own stated discipline and this verification task's explicit instruction, 26-07-SUMMARY.md is treated as the authoritative record of that live run (this verifier has no direct Supabase MCP access in this session to re-run the smokes independently). All 5 smoke files were read in full and their assertions cross-checked against the applied migration bodies (also read in full) — the code-level guards genuinely implement what the smokes assert, so the live-PASS claim is corroborated by structural proof, not accepted blindly.

| Smoke | Assertions | Live Result (per 26-07-SUMMARY.md) |
|-------|-----------|--------------------------------------|
| `funil01_pontuar_sjt_smokes.sql` | dedup/denominator/completeness/re-submit-lock/foreign-42501/RNF-07a | PASS (6/6 corresponding assertions in the Task-3 table) |
| `funil08_pontuar_cognitivo_smokes.sql` | async accepted + interview still accepted + non-eligible etapa rejected | PASS (3/3) |
| `funil12_status_rpc_smoke.sql` | booleans-only + IDOR 42501 | PASS (2/2) |
| `funil10_reinscricao_smoke.sql` | insert→soft-delete→re-insert, index count | PASS (1/1) |
| `n8n_novo_candidato_smoke.sql` | graceful-skip / no-PII / row-unchanged | PASS (dormant, expected — Vault secret not yet set) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FUNIL-01 | 26-01, 26-05, 26-07 | `pontuar_sjt` non-manipulable | ✓ SATISFIED | REQUIREMENTS.md marks Complete; migration + smoke + live PASS confirmed |
| FUNIL-07 | 26-01, 26-05, 26-07 | Battery filtered by cargo + itens_ids | ✓ SATISFIED | Server membership check + client filter both confirmed in code |
| FUNIL-08 | 26-02, 26-05, 26-06, 26-07 | Cognitive assessment reachable | ✓ SATISFIED | Gate relax + gated single card + real route, all confirmed |
| FUNIL-10 | 26-07 | Reinscription after soft-delete | ✓ SATISFIED | Real offender found + dropped; partial keeper confirmed; smoke PASS |
| FUNIL-12 | 26-02, 26-05, 26-06, 26-07 | Cards derive real completion | ✓ SATISFIED | Phantom `entry.status` read removed (0 occurrences); neutral RPC live |
| UX-01 | 26-04 | Honest wait-state copy | ✓ SATISFIED | All 6 screens carry canonical string; guard extended and green |
| n8n-2nd-leak (routed post-P24) | 26-03, 26-07 | Client PII/URL leak closed | ✓ SATISFIED | Client subtree deleted; server-side trigger live; guard extended |

No orphaned requirements found — REQUIREMENTS.md's Phase 26 mapping (FUNIL-01/07/08/10/12, UX-01) matches exactly what every plan in this phase claims via its `requirements` frontmatter field.

### Anti-Patterns Found

None. Scanned every file touched by this phase (4 migrations, 5 SQL smokes, `avaliacaoService.ts`, `AvaliacaoContainer.tsx`, 2 CI guards, 5 wait-state screens, 3 test files) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/"coming soon"/"not yet implemented" — zero genuine matches (a few grep hits were legitimate HTML `placeholder=` form-field attributes and pre-existing unrelated copy, not code stubs).

### Human Verification Required

None. The phase's only human-gated checkpoint (26-07 Task 3 — confirm all 5 PROD behavioral smokes PASS) was already executed and its SUMMARY records `Status: COMPLETE` with the full 11-assertion PASS table and a zero-residue confirmation, consistent with this phase's explicit instruction to treat that SUMMARY as the authoritative live-behavior evidence (this verifier corroborated it via full reads of the applied migration bodies and smoke files rather than accepting the narrative alone). No visual/UX items were flagged for separate human sign-off in any of the 7 plans beyond that checkpoint.

### Gaps Summary

No gaps. All 8 must-haves verified against the actual codebase (not SUMMARY narrative): the 4 migrations were read in full and their guards/gates/return shapes match every claim; the client wiring (`avaliacaoService.ts`, `AvaliacaoContainer.tsx`) was read in full and shows zero phantom-field reads and correct gating; the n8n deletion was independently confirmed via filesystem checks and a repo-wide grep for dangling references; the 6 UX-01 copy sites were independently grepped file-by-file; `vitest` (774/774) and `tsc` (104 ≤ 107) were re-run independently rather than trusted from the SUMMARY; all referenced commit hashes exist in the repository. The deliberately deferred items (Vault secret `n8n_webhook_base` creation, `database.types.ts` regen, migration ledger/baseline reconstruction — all explicitly routed to Phase 27 / Fernando human-action per 26-CONTEXT.md) are correctly out of scope for this phase and are not counted as gaps.

One minor, non-blocking observation: `.planning/STATE.md`'s `stopped_at`/per-plan log has not yet been updated to record 26-07's completion (it still reads "Next: 26-07..."), even though `26-07-SUMMARY.md` and its docs commit `c1de6fa` already exist. This is a documentation-sequencing lag, not a functional gap — the orchestrator's next STATE.md update will naturally close it.

---

*Verified: 2026-07-12T14:19:41Z*
*Verifier: Claude (gsd-verifier)*
