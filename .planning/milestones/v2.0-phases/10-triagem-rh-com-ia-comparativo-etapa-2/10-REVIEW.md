---
phase: 10
status: fixed
critical: 1
warning: 4
info: 6
reviewed: 2026-06-09
fixed: 2026-06-09
---

# Phase 10 Review — Triagem RH com IA + Comparativo (Etapa 2)

Reviewed the 14 Phase-10 source files + migrations (`20260610000001/2/3`), `_shared/ai-client.ts`, RLS backbone (`20260607000006`), the `avancar_etapa` trigger, `database.types.ts`, and EF test mocks. The previously-flagged MIXED_VAGA mismatch is now consistent. English→pt-BR mapping, never-absent falhou-row, upsert idempotency, CV-extraction fallback, analise EF Bearer self-auth, and RNF-07a "Sugestão da IA" framing are all correct.

## Critical

### C1 — `comparativo-candidatos` EF authenticates but never authorizes (IDOR / PII exposure)
**File:** `supabase/functions/comparativo-candidatos/index.ts:104-161` (confidence 85)

The EF calls `supabaseUser.auth.getUser()` to verify the JWT is *valid*, then reads `analise_candidato_vaga` via `supabaseAdmin` (service_role) which **bypasses RLS**. It never checks the caller's role is `rh`/`administrador`, nor that the caller owns the vaga. The only gate is the same-vaga + count cross-check, which stops cross-vaga mixing but not a non-RH caller. Deployed JWT-ON → any *authenticated* user (incl. a `candidato`) can POST `{vaga_id, candidatura_ids[]}` and receive an AI ranking built from other candidates' `score_match`/`pontos_fortes`/`gaps`/`resumo_cv` (raw CV text = PII) — exactly the data the table RLS denies to candidatos. The analog `submit-candidatura/index.ts:157-178` does the missing authorization step; the comparativo EF copied the authentication shape but dropped authorization. The EF test mocks `app_metadata.role:"rh"` but the code never reads it; no test asserts a candidato-role caller is rejected.

**Fix:** after `getUser()`, read `user.app_metadata?.role`, reject 403 unless `rh`/`administrador`; for `rh`, verify ownership of `body.vaga_id` (`vagas.created_by === user.id`, the column `reprocessar_analise` already guards on). Mirror the RPC guard.

## Warning

### W1 — Comparativo PDF exports blank candidate names
**Files:** `src/features/triagem/components/ComparativoScreen.tsx:90` + `src/features/triagem/pdf/exportComparativo.ts:57,65` (confidence 85)

`handleExport` passes the raw EF `ranking` to `exportComparativo`, which reads `c.nome` from `ranking.ranked_candidates`. But the EF anonymizes candidates to `C1/C2…` and never populates `nome` (names are resolved client-side into the separate `candidates` prop). The PDF header renders blank/`undefined` per column.
**Fix:** pass the resolved `candidates` (carry `.nome`+`candidaturaId`) into `exportComparativo`, or merge `nome` into ranking objects before export.

### W2 — Etapa filter + label use the legacy M1 enum against M2 data
**Files:** `VagaCandidatosRHPage.tsx:61,131-133,255-263` + `TriagemTable.tsx:301` (confidence 80)

The panel etapa filter + table label use the legacy `EtapaProcesso` enum (`triagem, bigfive, disc, raven, cultura, avaliacao_final`). DB `candidaturas.etapa_atual` is the M2 enum (`inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final, aprovado, rejeitado`). Selecting an M1-only etapa → `eq('etapa_atual','bigfive')` → Postgres `22P02 invalid enum`; M2-only etapas aren't selectable; `ETAPA_PROCESSO_LABELS[...] ?? raw` shows raw enum strings to RH.
**Fix:** drive filter + label map from the M2 `etapa_processo` enum (`Constants.public.Enums.etapa_processo`) with pt-BR labels.

### W3 — Candidate name search does not filter parent rows
**File:** `src/features/triagem/services/triagemService.ts:135-137` (confidence 80)

`query.ilike('candidato.nome_completo', ...)` filters the embedded resource, not the parent — without `!inner`, PostgREST keeps every parent row (nulling the embed), so name search returns all candidaturas and `count:'exact'` reports the unfiltered total (breaks pagination).
**Fix:** `candidato:candidatos!inner(...)` when `filters.nome` is set (left-join otherwise).

### W4 — Prompt-injection input persisted as "sucesso" with fabricated score, no flag
**File:** `supabase/functions/analise-candidato-individual/index.ts:247-296` (confidence 75)

On injection, `callAi` returns a non-null stub (`match_score:10, flagged_for_human_review:true`, `error_code:'prompt_injection_detected'`). The EF only guards `parsed == null`, so it writes `status:'sucesso'`, `score_match:10`, ignoring `error_code`/`flagged_for_human_review`. Panel shows a real-looking red 10 as a successful analysis. Not an RNF-07a violation (no auto-reject; logged in `ai_call_logs`) but a transparency gap that drops an available signal.
**Fix:** when `result.flagged_for_human_review` or `error_code==='prompt_injection_detected'`, push a flag (`'verificacao_humana'`) and/or set `status='falhou'` with `erro=error_code`.

## Info

- **I1** — `pendente` "Analisando…" UI is unreachable (EF only writes sucesso/falhou; a not-yet-analyzed survivor has no row → "—"). Relabel null-analysis as "Analisando…" or seed a pendente row in the trigger.
- **I2** — Comparativo "Flags" row always empty (`resolveCandidates` hardcodes `flags:[]`; EF returns no per-candidate flags). Dead UI.
- **I3** — `C{n}`→candidate index mapping fragile under score ties / sort changes; the EF has the real `candidatura_id` inline — echo it in the ranking schema to drop the index dependency.
- **I4** — `resumo_cv` stores raw `cvText.slice(0,2000)` (verbatim CV head = PII), contradicting the "resumo fiel" doc-comment; RLS-protected so not a leak, but naming/routing worth a note.
- **I5** — `analise_candidato_vaga` RLS is all-RH-reads-all, not own-vaga (matches shipped backbone `rh_le_candidaturas`, so consistent, not a regression; candidato still denied). Broader than the stated "RH own vagas" contract.
- **I6** — Minor: reprocess toast shows success even when Vault secrets absent (no dispatch); analise EF omits `idempotency_key` so each pg_net retry is a fresh paid AI call (bounded by T-10-12); "Ver Perfil" uses raw `<a href>` → full SPA reload.

## Fix plan (autonomous --fix scope: Critical + Warning)
- C1: add role+ownership authorization to comparativo EF → redeploy.
- W4: flag/falhou on injection stub in analise EF → redeploy.
- W1/W2/W3: frontend fixes (PDF names, M2 enum filter/labels, !inner name search).
- Info I1-I6: noted; low priority / consistent-with-backbone — deferred.

## Fixes Applied

Scope: Critical + Warning (5/5 fixed). Info I1-I6 deferred (low priority /
consistent-with-backbone, as planned). Commits via `git -c core.hooksPath=/dev/null`
(documented project convention — tsc pre-commit hook vs legacy baseline).

| Finding | Commit | Summary |
|---------|--------|---------|
| **C1** (Critical) | `ef5f66a` | comparativo-candidatos EF now AUTHORIZES, not just authenticates. Added `FORBIDDEN`(403) to the ErrorCode union. After `getUser()`: reject unless `app_metadata.role` ∈ {rh, administrador}; for `rh`, verify `vagas.created_by === user.id` (administrador bypasses ownership). Mirrors `reprocessar_analise` (migration 000003) + submit-candidatura IDOR cross-check. Test: RH happy-path now owns the vaga; added candidato→403 and rh-not-owner→403. |
| **W4** (Warning) | `dec7fb5` | analise-candidato-individual EF no longer persists the prompt-injection stub as `status:'sucesso'` score 10. When `result.flagged_for_human_review === true` OR `result.error_code === 'prompt_injection_detected'`, throws → never-absent `status:'falhou'` row with `erro=error_code` → panel shows "— Falhou / Reprocessar análise". Not an auto-reject (RNF-07a). Test asserts injection path writes `falhou` (no `sucesso`). |
| **W1** (Warning) | `43b5e08` | Comparativo PDF header used `ranking.ranked_candidates[i].nome` (EF never populates it → blank). Changed `exportComparativo(ranking)` → `exportComparativo(candidates)` and pass the client-resolved candidates (carry real `.nome`). ComparativoScreen drops the now-unused `ranking` destructure; vitest asserts call with `candidates`. |
| **W2** (Warning) | `ecb6e31` | Panel etapa filter + TriagemTable label used the legacy M1 `EtapaProcesso` enum (would emit `eq('etapa_atual','bigfive')` → Postgres 22P02). Added `ETAPA_M2_LABELS` + `ETAPA_M2_OPTIONS` (mirror `Constants.public.Enums.etapa_processo`); filter + label now driven from the M2 enum with pt-BR labels. Retyped `TriagemFilters.etapa`, `TriagemRow.etapa_atual`, `TriagemTableRow.etapa_atual` to `EtapaFunilM2`. |
| **W3** (Warning) | `5eff82e` | Name search: `ilike('candidato.nome_completo', ...)` filtered the embed, not the parent. Now uses `candidatos!inner` ONLY when `filters.nome` is set (so the ilike filters candidaturas + `count:'exact'` is correct); left-join kept otherwise so analise-less/candidato-less rows still show. |

**Verification (all green):**
- `npm run test:run` — 448/448 frontend tests pass (42 files).
- `npm run build` — succeeds.
- `deno test --allow-all supabase/functions/comparativo-candidatos/` — 7/7 (incl. 2 new 403 tests).
- `deno test --allow-all supabase/functions/analise-candidato-individual/` — 5/5 (incl. new injection→falhou test).
- `npm run lint` (tsc baseline): 292 → **291** (one fewer; removed unused `EtapaProcesso` import). ≤293 ✅. No new errors in any edited file.

**⚠️ REDEPLOY REQUIRED (orchestrator):** C1 and W4 edit Edge Function source.
The `comparativo-candidatos` and `analise-candidato-individual` EFs must be
redeployed for the authorization guard (C1) and the injection-falhou behavior (W4)
to take effect in PROD. (W1/W2/W3 are frontend-only — no deploy needed beyond the
normal build.)
