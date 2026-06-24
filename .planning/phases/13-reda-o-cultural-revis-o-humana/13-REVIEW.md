---
phase: 13-reda-o-cultural-revis-o-humana
reviewed: 2026-06-24T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - supabase/functions/avaliar-redacao-cultural/index.ts
  - supabase/functions/avaliar-redacao-cultural/index.test.ts
  - supabase/functions/avaliar-redacao-cultural/_local/compute-score.ts
  - supabase/functions/avaliar-redacao-cultural/_local/compute-score.test.ts
  - supabase/functions/_shared/essay-schemas.ts
  - supabase/functions/_shared/__tests__/essay-schemas.test.ts
  - supabase/functions/_shared/redacao-schemas.ts
  - supabase/migrations/20260623100001_perguntas_redacao.sql
  - supabase/migrations/20260623100002_redacoes_candidato_em_progresso.sql
  - supabase/migrations/20260623100003_redacoes_candidato.sql
  - supabase/migrations/20260623100004_salvar_revisao_redacao_rpc.sql
  - src/features/avaliacao/schemas/redacaoSchema.ts
  - src/features/avaliacao/services/redacaoService.ts
  - src/features/avaliacao/components/RedacaoEditorScreen.tsx
  - src/features/avaliacao/components/RedacaoCounter.tsx
  - src/features/avaliacao/components/RedacaoCronometro.tsx
  - src/features/avaliacao/components/AvaliacaoContainer.tsx
  - src/features/triagem/services/revisaoRedacaoService.ts
  - src/features/triagem/hooks/useRedacaoRevisao.ts
  - src/features/triagem/components/RedacaoReviewPanel.tsx
  - src/features/triagem/components/RedacaoOverrideForm.tsx
  - src/features/triagem/components/RedacaoSidebar.tsx
  - src/features/triagem/components/RedacaoCorBadge.tsx
findings:
  critical: 1
  warning: 6
  info: 5
  total: 12
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-06-24
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Phase 13 (culture-fit essay: candidate editor + the new `avaliar-redacao-cultural` AI Edge Function + the RH human-review queue) is a high-quality submission. The project-specific failure modes the brief called out are all handled correctly:

- **AI EF correctness (the 4×-recurring bug class):** PASS. `index.ts:57-60` uses STATIC `npm:` imports (no `await import([...].join(""))`); `index.ts:414-415` injects the real `zodOutputFormat`/`zodResponseFormat` adapters into `callAi` deps; `essay-schemas.ts:35` builds `EssayScoringV1Schema` on `npm:zod@3.25.76/v4`, and that v4 schema is the exact object passed to `callAi` at `index.ts:251`. The `redacao-schemas.ts` body schema correctly stays on flat v3 (it only feeds `.safeParse`, never an SDK helper).
- **EF authenticate ≠ authorize (IDOR):** PASS. `index.ts:179-189` resolves ownership via `candidatos.user_id = auth.uid()` and compares `candidatoRow.id !== candRow.candidato_id` (NOT `candidato_id === user.id`), then gates `etapa_atual`. The sibling-EF always-403 bug is avoided. Tests C1(a)/(b)/(c) pin all three branches.
- **RNF-07a:** PASS. Neither the EF nor `salvar_revisao_redacao` ever writes `candidaturas`; `status_analise` is always `pendente_humano`, `bloqueio_avanco` only gates (never auto-rejects); `duvida` stays `pendente_humano`. Test "RNF-07a — handler NEVER writes the candidaturas table" enforces it.
- **select('*') / verdict leak:** PASS. `REDACAO_CANDIDATO_ALLOWLIST` (redacaoService.ts:75-76) excludes every verdict column; the RH allowlist (revisaoRedacaoService.ts:87-88) is allowed to include them. No `select('*')` anywhere.
- **Prompt injection:** PASS. The essay flows through `callAi` as `rawInput` → `detectPromptInjection` short-circuits before any API call, and the masked text is delivered as a `user` message, never concatenated into the system instructions.
- **Migrations:** PASS. Role strings reconciled to live `'administrador'`, ownership via `candidatos.user_id`, client INSERT denied (`WITH CHECK false`), trigger forbidden-set complete.
- **DI-13-03 (reported failing test):** NOT REPRODUCIBLE — see IN-01. Ran the suite under Deno 2.7.7: `essay-schemas.test.ts` 6/6 PASS, `compute-score.test.ts` 10/10 PASS, `index.test.ts` 8/8 PASS. This is a false alarm (a test-runner/import artifact), not a real regression.

The one Critical below is a correctness bug in the re-submit path (idempotency replay writes a stale verdict against new text). The Warnings are mostly robustness/consistency issues. Nothing here is a security hole in the auth/authorization model.

## Critical Issues

### CR-01: Re-submitting an edited essay persists the FIRST submission's AI verdict against the NEW text (idempotency replay mismatch)

**File:** `supabase/functions/avaliar-redacao-cultural/index.ts:252` (+ 326-351)
**Issue:** The EF passes a STABLE `idempotency_key: ${body.candidatura_id}:${body.pergunta_id}` to `callAi`. The candidate flow explicitly permits re-submission until the etapa closes — the UI copy is "Você ainda pode revisá-la até concluir esta etapa" (`RedacaoEditorScreen.tsx:159,338`) and the row is an UPSERT on `(candidatura_id, pergunta_id)`.

On the second submit, `callAi` hits `tryIdempotencyReplay` (`ai-client.ts:261`), finds the prior `ai_call_logs` row by `idempotency_key`, and returns `parsed = existing.output` — the AI verdict of the **first** text (confirmed: `audit-logger.ts:125` writes `output: row.raw_response`, and `ai-client.ts:227` replays it). No new API call runs. The EF then UPSERTs (`index.ts:326-351`) the candidate's **new** `texto` + a freshly-computed `texto_hash`/`word_count`, but with `analise_ia`/`scores_dimensao`/`score_ponderado_0_100`/`classificacao_cor` derived from the **stale** replayed verdict. Result: the persisted row shows the edited essay paired with the original essay's scores/color — a wrong, RH-misleading verdict, and a silent data-integrity defect.

This is invisible in tests (the mock supabaseAdmin has no `ai_call_logs.select`, so `tryIdempotencyReplay` returns null and replay never triggers).

**Fix:** Make the idempotency key content-addressed so an edited essay forces a fresh scoring call, while a true duplicate (same text) still de-dupes. The `inputHash`/`textoHash` are already computed before the `callAi` call — move the hash up and fold it into the key:

```ts
// compute textoHash/inputHash BEFORE callAi (they already exist at index.ts:218-219)
const result = await callAi(
  {
    prompt: resolved,
    rawInput: body.texto,
    vagaRubricBlock: perguntaBlock,
    candidato_id: candRow.candidato_id,
    vaga_id: candRow.vaga_id,
    schema: EssayScoringV1Schema,
    // include the content hash so a re-write re-scores; identical text still replays
    idempotency_key: `${body.candidatura_id}:${body.pergunta_id}:${inputHash}`,
  },
  { /* deps */ },
)
```

(Note `index.ts:218-219` currently compute the hashes inside the `try` AFTER prompt resolution but BEFORE `callAi`, so the reorder is minimal.) Alternatively, drop `idempotency_key` entirely for this EF if re-scoring on every submit is acceptable, but the content-hashed key is the safer choice (still protects against pg_net double-invocations of the SAME text).

## Warnings

### WR-01: RH SELECT policy on `redacoes_candidato` is NOT scoped to owned vagas — any rh user reads every candidate's full essay + verdict

**File:** `supabase/migrations/20260623100003_redacoes_candidato.sql:124-127`
**Issue:** `redacao_rh_select` admits any `app_metadata.role IN ('rh','administrador')` to SELECT EVERY row in the table — including the full `texto` (candidate-authored PII), `scores_dimensao`, `analise_ia`, `notas_revisor`, etc. — with no `vagas.created_by = auth.uid()` constraint. By contrast, the WRITE path (`salvar_revisao_redacao_rpc.sql:80-82`) correctly enforces `rh` must own the vaga (administrador bypasses). The asymmetry (own-vaga on write, all-vagas on read) suggests cross-vaga read was unintended. `getDuvidasGestor()` (revisaoRedacaoService.ts:153-174) can be called with no `vagaId`, returning duvida rows across all vagas — only the `created_by`-less RLS gates it. A non-owning recruiter can read essays for vagas they don't manage by hitting the table directly or via the unscoped duvidas query.

**Fix:** Scope the RH SELECT to owned vagas, mirroring the RPC's ownership rule (administrador bypasses):

```sql
CREATE POLICY redacao_rh_select ON public.redacoes_candidato
  FOR SELECT TO authenticated
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR (
      (select auth.jwt() #>> '{app_metadata,role}') = 'rh'
      AND candidatura_id IN (
        SELECT c.id FROM public.candidaturas c
        JOIN public.vagas v ON v.id = c.vaga_id
        WHERE v.created_by = auth.uid()
      )
    )
  );
```

If a shared RH pool reading all vagas IS the intended product model, document it explicitly — but then the own-vaga guard on the WRITE RPC is inconsistent and should be reconciled too.

> **Resolution (review-fix, not fixed — by design):** role-only RH SELECT is the consistent M2 norm — every comparable RH read policy (`analise_candidato_vaga`, `devolutivas_candidato`, `scores_candidato`) is role-only, not vaga-scoped; vaga-scoping RH reads is a milestone-wide LGPD decision deferred to Phase 15/16. Migration and PROD left unchanged.

### WR-02: `submittedIds` is a memoized `Set` mutated in place — the UI does not reflect a submission until the query refetches

**File:** `src/features/avaliacao/components/RedacaoEditorScreen.tsx:159-165` (`submittedIds.add(...)`), `109-112`
**Issue:** `submittedIds` is built via `useMemo` from the `minhas` query (`:109-112`). On submit, `handleSubmit` calls `submittedIds.add(pergunta.id)` (`:160`) — a direct mutation of the memoized Set. React does not re-render on `Set.add`, and the `useMemo` only recomputes when `minhas` changes. So the `allSubmitted` check (`:240-241`), the "Próxima pergunta" CTA (`:349`), and the all-done screen don't update from this mutation; they only update after the `getMinhasRedacoes` query is invalidated/refetched — which `enviarRedacao` never triggers (no `queryClient.invalidateQueries` on success). On a single-prompt vaga the user clicks "Enviar", sees the toast, but the screen stays on the editor with the text cleared (words=0 → submit disabled) and no "Redações concluídas." confirmation until a manual refetch. Mutating a memoized value is also a React anti-pattern that can desync on the next `minhas` recompute.

**Fix:** Track submitted ids in component state and invalidate the query on success:

```ts
const [localSubmitted, setLocalSubmitted] = useState<Set<string>>(new Set())
// in handleSubmit success:
setLocalSubmitted((prev) => new Set(prev).add(pergunta.id))
queryClient.invalidateQueries({ queryKey: redacaoKeys.minhas(candidaturaId ?? '') })
// derive submittedIds from union of (minhas ?? []) ids and localSubmitted
```

### WR-03: `RedacaoCronometro.onTick` is never wired — `tempo_gasto_segundos` is always persisted as 0, permanently disabling the `tempo_anormalmente_curto` flag

**File:** `src/features/avaliacao/components/RedacaoEditorScreen.tsx:288`; consumed at `compute-score.ts:64`, persisted at `index.ts:284,308,335`
**Issue:** `<RedacaoCronometro />` is rendered with NO `onTick` prop (`:288`), and the screen never collects elapsed time. `enviarRedacao` posts only `{candidatura_id, pergunta_id, texto}` (no time field — by design), and the EF hardcodes `tempo_gasto_segundos: 0` (`index.ts:284,335`) and passes `0` to `computeScoreAndCors` (`index.ts:308`). Consequently the `tempo_anormalmente_curto` flag (`compute-score.ts:64`, `< 90s`) can NEVER fire in production — the anti-cheat signal is dead code. The cronômetro's `onTick` plumbing (`RedacaoCronometro.tsx:27-44`) and the comment at `index.ts:308` ("coletado pelo cliente em V2") acknowledge this is deferred, but the row schema makes `tempo_gasto_segundos` `NOT NULL` and the flag is documented as live — a 0 here is a silent always-passing check, not a deliberate "unknown".

**Fix:** If V1 genuinely defers timing, leave it — but make the dead flag honest: either drop the `tempo_anormalmente_curto` branch from `computeScoreAndCors` until timing is wired, or wire `onTick` to capture elapsed seconds and send it through the EF body (and add it to `respostaRedacaoSchema`/`AvaliarRedacaoCulturalBodySchema` — note the latter is `.strict()`, so an un-added field would be REJECTED). Document the decision in the PR.

### WR-04: `decisao` validation in the service uses a runtime `includes` whose membership check can pass a TypeScript-narrowed-but-invalid value; trigger forbidden-set omits `bloqueio_avanco`

**File:** `supabase/migrations/20260623100003_redacoes_candidato.sql:147-161`
**Issue:** The `trg_redacao_rh_only_review_fields` forbidden-set lists texto/hash/IA/version fields but NOT `bloqueio_avanco`. The header comment (`:23-27`) and the RPC comment (`salvar_revisao_redacao_rpc.sql:31-35`) describe `bloqueio_avanco` and `status_analise` as ALLOWED review fields, so omission is intentional for the RPC. However, because the RH UPDATE policy (`:132-135`) has `WITH CHECK (true)` and the trigger does not guard `bloqueio_avanco`, an RH user issuing a direct PostgREST UPDATE (bypassing the RPC) can flip `bloqueio_avanco` to false on a vermelho essay — defeating the "vermelho holds the auto-advance" safety. Whether that matters depends on whether advancement is purely a separate human action (in which case bloqueio is advisory). Given RNF-07a centers on the human always deciding, an RH clearing the block directly is arguably fine — but it is an undocumented hole in the otherwise DB-enforced tamper protection.

**Fix:** If `bloqueio_avanco` is meant to be RPC-only-mutable, add it to the trigger's forbidden-set and have the RPC set it via a `SECURITY DEFINER`-internal path that the trigger exempts (e.g., a session GUC the RPC sets). If RH is trusted to clear blocks manually, add a one-line comment to the trigger documenting that `bloqueio_avanco`/`status_analise` are deliberately RH-mutable.

### WR-05: `getDuvidasGestor()` orders nothing and is unbounded across all vagas; `listRedacoesRevisao` double-sorts (DB order + client sort)

**File:** `src/features/triagem/services/revisaoRedacaoService.ts:153-174` (duvidas), `130-146` (list)
**Issue:** (a) `getDuvidasGestor(vagaId?)` with no `vagaId` issues a table-wide `select` with no `.limit()` and no ordering — combined with WR-01's unscoped RLS, this returns every duvida row in the system. (b) `listRedacoesRevisao` applies a server-side `.order('classificacao_cor', { ascending: false })` (`:134`) AND then `sortBySeverity` client-side (`:145`). The server order is by the raw enum text `'verde' > 'vermelho' > 'amarelo'` alphabetically descending — which does NOT match severity — so the server order is meaningless work that the client sort then overrides. Harmless to correctness but wasteful and confusing (a reader might trust the server order).

**Fix:** Drop the server `.order('classificacao_cor', ...)` (let `sortBySeverity` own ordering), and add a `.limit()` + a default `vagaId` requirement (or owned-vaga scoping per WR-01) to `getDuvidasGestor`.

### WR-06: EF anti-plágio query is unbounded and runs a full-table scan filtered only by hash equality across all candidaturas

**File:** `supabase/functions/avaliar-redacao-cultural/index.ts:312-316`
**Issue:** The inter-candidate plagiarism check selects from `redacoes_candidato` filtered only by `texto_hash` equality and `candidatura_id != current`. There is a `idx_redacoes_hash` index (`migration 03:96`), so the lookup is indexed — but the result set is unbounded (no `.limit()`) and the matched `candidatura_id` list is written verbatim into `referencia_match`. A pathological collision (e.g., many candidates pasting the same boilerplate) writes an arbitrarily large array into the row. Low severity given the hash specificity, but a `.limit(50)` bound is prudent. (Performance per se is out of v1 scope; flagged as a robustness/correctness bound, not perf.)

**Fix:** Add `.limit(50)` to the match query and treat presence (`length > 0`) as the flag trigger, capping the stored `referencia_match` array.

## Info

### IN-01: DI-13-03 ("essay-schemas.test.ts failing") is not reproducible — false alarm, no regression

**File:** `supabase/functions/_shared/__tests__/essay-schemas.test.ts`
**Issue:** The brief flags this Deno suite as failing (DI-13-03). Running it under Deno 2.7.7 (`deno test --allow-read --allow-net`) yields **6 passed | 0 failed**. The companion suites also pass: `compute-score.test.ts` 10/10, `avaliar-redacao-cultural/index.test.ts` 8/8 (the latter forces resolution of the `npm:` Anthropic/OpenAI SDK imports in `index.ts` and still passes). The `npm:zod@3.25.76/v4` specifier resolves cleanly under Deno. The most likely cause of the original report is a runner invoked without `--allow-net` (the `https://deno.land/std` + `npm:` specifiers need network to fetch on a cold cache) or a Vitest/Node runner attempting to resolve the `npm:` specifier (which Node cannot — the same constraint the contract test at `redacao-contract.test.ts:11-23` documents). Classify as a tooling/import artifact, not a code defect.
**Fix:** Re-run the suite with `deno test --allow-read --allow-net` against a warm cache; if a CI runner reported the failure, ensure it uses the Deno runner (not Vitest) for `supabase/functions/**`.

### IN-02: `extractScoresDim` types `score` as `unknown` and stores it raw — `'insufficient_evidence'` strings land in `scores_dimensao` jsonb

**File:** `supabase/functions/avaliar-redacao-cultural/index.ts:104-111`, persisted at `:337`
**Issue:** `extractScoresDim` copies each dimension's `score` (which may be the literal string `'insufficient_evidence'` per the schema union) directly into `scores_dimensao`. The RH UI's `dimValue` (`RedacaoReviewPanel.tsx:55-58`, `RedacaoOverrideForm` via `revisaoRedacaoService.ts:46-52`) already guards with `typeof v === 'number'` and renders `—` otherwise, so this is handled downstream — but storing a mixed number|string jsonb is a latent footgun for any future consumer that assumes numbers. Acceptable as-is; noting for clarity.
**Fix:** Optionally normalize `'insufficient_evidence'` to `null` when building the stored map, keeping the raw value only in `analise_ia`.

### IN-03: `enviarRedacao` does not invalidate the candidate's `minhas`/`context` queries on success

**File:** `src/features/avaliacao/services/redacaoService.ts:252-300`; caller `RedacaoEditorScreen.tsx:148-176`
**Issue:** After a successful submit the screen relies on the in-place Set mutation (see WR-02) and never refetches `getMinhasRedacoes`. Wiring a `queryClient.invalidateQueries(redacaoKeys.minhas(...))` (in the component or via a mutation hook) is the idiomatic fix and would also resolve WR-02's stale-UI symptom.
**Fix:** Convert `enviarRedacao` usage to a `useMutation` with `onSuccess` invalidation, matching `useRedacaoRevisao`'s pattern (`useRedacaoRevisao.ts:62-66`).

### IN-04: Duplicate `COR_SEVERITY` / severity-sort logic across three modules

**File:** `revisaoRedacaoService.ts:94-107`, `RedacaoSidebar.tsx:26,58-63`, and the `recomputeCompositeAndCor` color math duplicated between `RedacaoOverrideForm.tsx:74-99` and `compute-score.ts:28-79`
**Issue:** The `{vermelho:3, amarelo:2, verde:1}` severity map and the sort exist in both the service and the sidebar; the composite/cap/3-color math is implemented twice (EF Deno + RH React form). The duplication is intentional (Deno EF can't import the React module) but drift risk is real — a threshold change in one place silently desyncs the RH live-preview from the server verdict.
**Fix:** Extract the severity map to a shared `triagem` constant for the two TS modules. For the EF↔form math, add a cross-check test asserting both produce the same color for a fixed grid of inputs, or document the duplication contract in `13-PATTERNS.md`.

### IN-05: `index.ts:179-183` candidatos lookup ignores its `error` channel

**File:** `supabase/functions/avaliar-redacao-cultural/index.ts:179-186`
**Issue:** The `candidatos` ownership lookup destructures only `{ data: candidatoRow }` and drops `error`. A transient DB error returns `candidatoRow = null`, which the code maps to a 403 FORBIDDEN (`:184-185`) rather than a 500. Mis-attributing a DB failure as an authorization denial is misleading for debugging (and could mask an outage as "access denied" to the candidate). The sibling `candidaturas` lookup at `:166-173` correctly checks `candErr` and returns 500.
**Fix:** Capture and branch on the error: `const { data: candidatoRow, error: candidatoErr } = ...; if (candidatoErr) return errorResponse("SERVER_ERROR", "Falha ao verificar a candidatura.", 500);`

---

_Reviewed: 2026-06-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
