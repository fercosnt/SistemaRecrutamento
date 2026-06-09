---
phase: 11
status: fixed
critical: 2
warning: 3
info: 2
reviewed: 2026-06-09
fixed: 2026-06-09
---

# Phase 11 — Code Review: Avaliação Assíncrona (Infra + Work Sample/SJT, Etapa 3)

Security spine solid: avaliar-redacao EF applies the C1 lesson (authenticate-THEN-authorize: ownership + etapa before any service_role read/write, 403 else; candidate text via callAi; redacted logs; candidaturas never touched), `.strict()` anti-tamper schemas (no client score), answer-key peso/tag never reach the candidate (getOpcoesSjt → get_opcoes_sjt projects id+texto only), RNF-07a honored (neutral payloads, pendente_humano only, no auto-reject), scoresRhService allowlist (no select('*'), no cpf/data_nascimento). The 2 Criticals are an integration-contract break that makes the SJT open-case submit fail 100% (the deno test mocked the EF's own schema; vitest mocked the service — neither exercised the real client↔EF contract).

## Critical

### C1 — Open-case submit fails every time: client↔EF body-shape mismatch
**Files:** `src/features/avaliacao/services/avaliacaoService.ts:309-323`, `supabase/functions/_shared/avaliacao-schemas.ts:108-112`, `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx:123-127` (confidence 95)
Client posts `{ candidatura_id, pergunta_id, texto }`; EF `AvaliarRedacaoBodySchema` requires `{ candidatura_id, teste, resposta }`. safeParse fails → EF returns 400 VALIDATION for every open-case submission; no score row ever written.
**Fix:** Align on `{ candidatura_id, pergunta_id, texto }` (the cleaner contract — lets the EF read the exact pergunta/rubric by id, fixing C2). Update the EF body schema + handler + the deno test.

### C2 — EF queries non-existent column `cargo_teste`; rubric weights never applied
**File:** `supabase/functions/avaliar-redacao/index.ts:198-202` (confidence 90)
`.eq("cargo_teste", body.teste)` — `perguntas` has no `cargo_teste` column (→ 42703), swallowed best-effort → falls through to empty scenario + uniform weights, so the rubric-weighted 0-25 composite (dentista 25/20/25/15/15) is never applied. Also compares a test-id against a cargo (wrong semantics).
**Fix:** look up by the real id: after C1, `.eq("id", body.pergunta_id)` so scenario + rubric weights flow into the composite.

## Warning

### W1 — Stale `as never`/`UntypedClient` casts now unnecessary + masking C2
**Files:** `avaliacaoService.ts:87-105,260`, `scoresRhService.ts:106-114` (confidence 85)
The casts are justified as "types regenerated only in the apply wave" — but 11-04 ALREADY regenerated database.types.ts (it contains respostas_avaliacao/scores_candidato/perguntas/get_opcoes_sjt/pontuar_sjt). The casts now defeat compile-time checking — exactly what let C2's `cargo_teste` typo through.
**Fix:** drop the casts; use the typed client (`supabase.from('scores_candidato').select(ALLOWLIST)`, `.rpc('pontuar_sjt')`, `.rpc('get_opcoes_sjt')`, `.from('respostas_avaliacao').upsert(...)`). Restores the tsc guard.

### W2 — Autosave unmount-flush re-arms on every render (redundant writes)
**File:** `useAutosaveAvaliacao.ts:131-140` + `SjtCasoAbertoScreen.tsx:109` (confidence 80)
The injected `upsert` is a new closure each render → `flush` + the unmount-flush effect re-run every render; cleanup `void flush()` can fire mid-typing (guarded by lockedRef, but redundant network writes).
**Fix:** `useCallback` the injected `upsert` (deps `[candidaturaId]`) or depend the unmount-flush on a stable ref.

### W3 — `pontuarSjt` maps only 42501 to LOCKED, not 403
**File:** `avaliacaoService.ts:284-299` (confidence 80)
A SECURITY DEFINER RPC denial can surface as 403 (function-call path) not raw 42501; then the MC screen shows an alarming error toast instead of the neutral "Sua etapa avançou" lock (the autosave hook already treats both as back-lock).
**Fix:** also map `status===403` to `'LOCKED'` in pontuarSjt (mirror the hook's isBackLock).

## Info
- **I1** — `WorkSampleScoringSchema.overall_score` (0-100) required by schema but unused (EF derives 0-25 from dimension_scores). Add a comment so it isn't wired by mistake.
- **I2** — `deriveCards` reads `tempoEstimadoMin`/`tempo_est_min` which testesAplicaveisSchema never defines → always falls back to "~10 min" placeholder. Note for UAT (not a bug).

## Fix plan (autonomous --fix: Critical + Warning)
- C1+C2+W1: align avaliar-redacao EF body to `{candidatura_id, pergunta_id, texto}`, look up pergunta by id, drop the stale casts (typed client) → redeploy EF + update deno test.
- W2: useCallback the autosave upsert. W3: map 403→LOCKED in pontuarSjt.
- Info I1/I2: noted, deferred.

## Fixes Applied (2026-06-09)

All Critical + Warning findings fixed. Each fix committed atomically on the
reviewfix worktree (fast-forwarded onto `backup/local-state-2026-04`).

| Finding | Status | Commit | Summary |
|---------|--------|--------|---------|
| C1 + C2 | fixed | `c183cd3` | `AvaliarRedacaoBodySchema` → `{candidatura_id, pergunta_id, texto}` (drops `teste`/`resposta`), matching the client. EF looks the pergunta up by `id` (allowlist `id,cenario,rubric,formato`); missing or non-`caso_aberto` → 400 (no silent fall-through to empty scenario / uniform weights). Real `cenario` feeds callAi; real `rubric` weights feed the 1-5→weighted-0-25 composite. Score rows persist `pergunta_id`. Authz (ownership + etapa before any service_role read) + RNF-07a unchanged. deno test: fixtures use the new shape, supabaseAdmin mock returns a `caso_aberto` pergunta with rubric weights, added missing/non-caso_aberto→400 + a rubric-weighting assertion (18.82 weighted vs 17.5 uniform). 9/9 green. |
| W1 | fixed | `5d74397` | Dropped the `UntypedClient`/`LooseQuery`/`as never` casts in `avaliacaoService.ts` + the inline cast in `scoresRhService.ts`; both now use the typed `supabase` client (allowlists preserved, no `select('*')`). Restores the compile-time guard that would have caught C2's `cargo_teste` typo. Remaining casts are confined value casts on RPC/upsert Json args + the neutral Json→NeutralAck return. tsc 291 (≤293 baseline), 0 errors in edited files. |
| W2 | fixed | `46bfd68` | `useCallback`-wrapped the autosave `upsert` closure (deps `[candidaturaId]`) in `SjtCasoAbertoScreen.tsx`, so `useAutosaveAvaliacao`'s flush + unmount-flush effect no longer re-arm every render. |
| W3 | fixed | `556db0d` | `pontuarSjt` now maps `status===403` and `String(status)==='42501'` (in addition to `code==='42501'`) to the neutral `LOCKED` throw, mirroring `useAutosaveAvaliacao`'s `isBackLock`. |

**Info I1/I2:** deferred (noted, not bugs).

**Test results:** deno 9/9 · vitest 462/462 · `npm run build` green · tsc 291 (≤293 baseline).

**⚠️ Redeploy required:** the `avaliar-redacao` Edge Function changed (schema + handler) and MUST be redeployed by the orchestrator (`supabase functions deploy avaliar-redacao`, JWT-ON, no `--no-verify-jwt`). This fixer did NOT deploy.
