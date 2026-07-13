---
phase: 24-blindagem-de-seguran-a-pii-lgpd
reviewed: 2026-07-09T22:21:38Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - src/features/avaliacao-cognitiva/services/cognitivoService.ts
  - src/features/avaliacao/services/avaliacaoService.ts
  - src/features/avaliacao/services/redacaoService.ts
  - src/features/avaliacao/schemas/bigfiveSchema.ts
  - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx
  - src/features/explicacao/services/explicacaoService.ts
  - src/features/vagas/services/candidaturasService.ts
  - src/components/pages/ConfiguracoesPage.tsx
  - src/components/pages/MeuPerfilPage.tsx
  - supabase/functions/gerar-devolutiva-bigfive/index.ts
  - supabase/functions/submit-bigfive-final/index.ts
  - supabase/functions/_shared/bigfive-scoring.ts
  - supabase/migrations/20260706110001_sec01_cognitivo_gabarito.sql
  - supabase/migrations/20260706110002_sec07_rubric.sql
  - supabase/migrations/20260706110003_sec02_redacao_verdict.sql
  - supabase/migrations/20260706110004_sec05_08_vaga_scope.sql
  - supabase/migrations/20260706110005_sec03_n8n_serverside.sql
  - supabase/migrations/20260706110006_sec09_auth_admin_policy.sql
  - supabase/migrations/20260706110007_sec10_drop_backup.sql
  - supabase/migrations/20260706110008_ux08_o6_deactivate.sql
  - supabase/migrations/20260709000001_sec07_rubric_remediation.sql
  - supabase/migrations/20260709000002_sec08_candidaturas_dup_policy_remediation.sql
  - src/__tests__/guards/n8n-bundle.grep.test.ts
  - src/__tests__/guards/rh-console.grep.test.ts
  - supabase/functions/_shared/bigfive-scoring.test.ts
  - supabase/functions/submit-bigfive-final/index.test.ts
  - supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-07-09T22:21:38Z
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Phase 24's own stated scope (SEC-01/02/03/04/05/06/07/08/09/10/11 + UX-08) is largely
well-executed and internally consistent with its documentation:

- SEC-01 (`cognitivo_itens.gabarito_idx`) and the SEC-07 remediation
  (`perguntas.rubric`) both use the correct effective mechanism (row-deny / table-level
  REVOKE + column re-GRANT) after 24-08 correctly diagnosed and fixed the original
  no-op bare-column-REVOKE.
- SEC-02 (`redacoes_candidato` verdict) correctly avoids the SEC-07 landmine (RH shares
  the `authenticated` role) by using row-deny + a `get_minha_redacao` DEFINER RPC
  instead of a column REVOKE. `redacaoService.ts` reads exclusively via that RPC and
  the regression guard (`redacaoService.rpc.test.ts`) asserts the base table is never
  touched.
- SEC-05/06/08 vaga-scoping and its 24-09 remediation (duplicate M1-era role-only
  policy OR-leak on `candidaturas`) are correctly diagnosed and fixed; `administrador`
  bypass is preserved on every predicate; `is_rascunho`/`deleted_at` semantics are
  `NOT NULL DEFAULT`-safe so the re-emitted `rh_le_candidaturas` predicate cannot
  silently hide legacy rows via a NULL comparison.
- SEC-03 (n8n dispatch) is moved server-side correctly; all three new trigger
  functions are `SECURITY DEFINER` with `SET search_path = ''`, gracefully skip when
  the Vault secret is unset, and never write `candidaturas` (RNF-07a preserved). Every
  `SECURITY DEFINER` function introduced in this phase's 10 migrations sets
  `search_path = ''` — no gaps found there.
- UX-08's 116-item lockstep (scorer, `submit-bigfive-final`, `bigfiveSchema.ts`,
  `BigFiveQuestionnaireScreen.tsx`) is correct and well-tested: the reverse-key set
  drops exactly 88/118, the O-domain ×6/5 prorate is asserted algebraically by the
  Deno golden tests, and the 4 deactivated ids `{28,58,88,118}` are rejected by both
  the scorer's defensive coverage guard and the EF's `validateBody`.
- SEC-04's Bearer-only self-auth on `gerar-devolutiva-bigfive` is implemented and
  tested as specified (not re-flagged, per the review brief).

However, one finding in this same batch of files is a genuine, provable BLOCKER: the
LGPD Art. 20 "explicação" data layer (`explicacaoService.ts`) — touched in this very
phase for SEC-03 — still transmits the internal RH `justificativa` column to the
candidate's browser over the wire, in the exact "network payload leaks even when not
rendered" pattern this phase closed for `gabarito_idx`/`rubric` elsewhere. The
existing regression test only asserts the JS-level return value is safe, not the
network projection, so the leak was never caught. Three lower-severity gaps round out
the findings (a non-constant-time Bearer compare, a self-inflicted secret-rotation
footgun, and a residual SEC-11-class console-log gap in a service file the RH-console
guard does not cover).

## Critical Issues

### CR-01: `explicacaoService.getExplicacao` leaks the internal RH `justificativa` over the wire despite it being unused

**File:** `src/features/explicacao/services/explicacaoService.ts:80-81, 168, 182-188, 194-202`

**Issue:** `DECISAO_EXPLICACAO_ALLOWLIST` (line 81) includes `justificativa`, and
`getExplicacao` selects it directly off the candidate's own row of `decisao_final`:

```ts
export const DECISAO_EXPLICACAO_ALLOWLIST =
  'decisao, justificativa, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em'
...
const { data, error } = await supabase
  .from('decisao_final')
  .select(DECISAO_EXPLICACAO_ALLOWLIST)
  .eq('candidatura_id', candidaturaId)
  .maybeSingle()
```

`decisao_final` has no column-level REVOKE on `justificativa` (verified — grep across
every migration touching `decisao_final` and `justificativa` finds none), and RLS is
row-level only (`candidato_le_propria_decisao` — `USING` on `candidatura_id`, no column
masking is possible in Postgres). The candidate's own-row RLS policy is exactly what
this phase's own SEC-01/SEC-02/SEC-07 migrations repeatedly document as *not* hiding
columns ("RLS is ROW-level only and NEVER hides a column" — the phrase appears
verbatim in this file's own docstring three times: lines 4-5, 76, 121-123). The result:
every GET on the candidate's own `decisao_final` row returns the raw, internal RH
`justificativa` text (described in this file's own comments as "the raw internal RH
justificativa tone" that must "NEVER" reach the candidate, line 121-123) in the HTTP
response body — visible in the browser's Network tab regardless of what the JS layer
does with it afterward.

Worse: `raw.justificativa` is **never read** anywhere in the function body. The
returned `reason` field is derived purely from `raw.decisao` via the fixed
`REASON_BY_DECISAO` template map (line 198: `reasonForDecisao(raw.decisao)`), so the
column is fetched and shipped to the browser for **zero functional benefit** — it can
be dropped from the query with no behavior change. The existing regression test
(`explicacaoService.test.ts:75-84`) only asserts that the allowlist *contains exactly
these 5 named columns* (treating `justificativa` as an accepted, intentional column)
and that the JS-level `result.reason` string doesn't equal the raw text — it never
asserts anything about the network-level SELECT projection excluding `justificativa`,
so this leak is invisible to the test suite. This is precisely the class of defect
[[reference_select_star_leaks_pii]] documents (Phase-8 T-08-13) and that this same
phase fixed for `cognitivo_itens.gabarito_idx` and `perguntas.rubric` — but it survives
here in a file this phase directly touched (commit `cb02563`, SEC-03).

**Fix:** Drop `justificativa` from the allowlist and the query; it is unused.

```ts
export const DECISAO_EXPLICACAO_ALLOWLIST =
  'decisao, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em'
...
const raw = data as unknown as {
  decisao: DecisaoResultado
  revisao_solicitada_em: string | null
  revisao_resultado: string | null
  explicacao_solicitada_em: string | null
}
```

Update `explicacaoService.test.ts` to assert the allowlist does **not** contain
`justificativa` (mirroring the `VERDICT_KEYS` guard pattern already used in
`redacaoService.rpc.test.ts`), so a future regression re-fails loudly.

## Warnings

### WR-01: `guardDevolutivaBearer` compares the shared secret with `!==` (non-constant-time)

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:596-599`

**Issue:**

```ts
const bearer = authHeader.startsWith("Bearer ")
  ? authHeader.slice("Bearer ".length).trim()
  : "";
if (!bearer || bearer !== expectedSecret) {
```

A plain `!==` string comparison short-circuits on the first differing byte, which is a
textbook timing side-channel for a shared-secret / Bearer-token check (the same class
of issue CWE-208 / "Observable Timing Discrepancy" flags for credential comparisons).
The design choice to gate this EF on a Bearer secret instead of JWT role/posse checks
is approved per the review brief and not re-flagged here — only the comparison
primitive is at issue.

**Fix:** Use a constant-time comparison (e.g. hash both sides with a fixed-length
digest and compare, or use `crypto.subtle.timingSafeEqual`-equivalent; Deno's std lib
exposes `timingSafeEqual` in `std/crypto`):

```ts
import { timingSafeEqual } from "https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts";
const enc = new TextEncoder();
const bearerBytes = enc.encode(bearer.padEnd(expectedSecret.length, "\0"));
const expectedBytes = enc.encode(expectedSecret);
if (!bearer || bearerBytes.length !== expectedBytes.length || !timingSafeEqual(bearerBytes, expectedBytes)) { ... }
```

### WR-02: `DEVOLUTIVA_INVOKE_SECRET` "rotation-friendly override" is not actually wired to any caller — setting it silently breaks every devolutiva

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:631-639`; caller: `supabase/functions/submit-bigfive-final/index.ts:241-254`

**Issue:** The comment claims the override is "Rotation-friendly ... via
`DEVOLUTIVA_INVOKE_SECRET`":

```ts
const expectedSecret = Deno.env.get("DEVOLUTIVA_INVOKE_SECRET") ?? SERVICE_KEY;
```

But the only caller (`submit-bigfive-final`) invokes this EF via
`supabaseAdmin.functions.invoke(...)` with no header override (line 244), so it always
sends `Authorization: Bearer <SERVICE_KEY>` (the default the supabase-js client sends
for its own service-role key) — never `DEVOLUTIVA_INVOKE_SECRET`. A grep across the
whole repo confirms `DEVOLUTIVA_INVOKE_SECRET` is referenced in exactly one file (this
one) and nowhere is it read/forwarded by the caller. Today this is harmless because the
env var is presumably unset in PROD (falls back to `SERVICE_KEY`, which matches what
the caller sends). But the moment an operator sets `DEVOLUTIVA_INVOKE_SECRET` on this
function for the documented "rotation" purpose, every invocation from
`submit-bigfive-final` starts failing the Bearer guard (401), and because the call is
wrapped in a best-effort `try/catch`/timeout race (`submit-bigfive-final/index.ts:241-258`),
the failure is swallowed silently — `devolutiva_id` becomes permanently `null` for
every candidate, with no alarm.

**Fix:** Either (a) remove the misleading "rotation-friendly" claim and document that
`DEVOLUTIVA_INVOKE_SECRET` must never be set without also updating the caller to send
it explicitly (e.g. via a custom header the EF checks), or (b) actually wire it: have
`submit-bigfive-final` read the same env var and pass it as an explicit
`Authorization`/custom header on the `functions.invoke` call, so rotating the secret is
a real, safe operation instead of a footgun.

### WR-03: Residual SEC-11-class console logging in `candidaturasService.ts` on the RH-facing update path

**File:** `src/features/vagas/services/candidaturasService.ts:450-464, 481-494, 504-516`

**Issue:** SEC-11 (this phase) stripped operational `console.log` from
`ConfiguracoesPage.tsx` / `MeuPerfilPage.tsx` specifically because they leaked
candidate/RH data into the browser console, and the `rh-console.grep.test.ts` guard
was extended to cover both files. `candidaturasService.ts` — used by the same RH
console pages (`updateCandidaturaStatus`) — still does the same class of logging and
is not in the guard's `RH_PATH_FILES` list (it only lists page components, not
services):

```ts
console.log('🚀 Auto-avançando etapa:', { candidaturaId, etapaAnterior, proximaEtapa, ... })
...
console.error('❌ Erro no update da candidatura:', {
  candidaturaId, updateData, error: updateError.message, details: updateError.details,
  hint: updateError.hint, code: updateError.code,
})
```

`updateData` includes `feedback_rejeicao` (free-text RH commentary about a specific
candidate) whenever `motivo_rejeicao` is supplied — the same "operational state +
incidental PII into the browser console" pattern SEC-11 targeted, just reached via a
different file than the ones the guard enumerates.

**Fix:** Extend the SEC-11 sweep (or a follow-up) to strip/guard these calls too, and
add `src/features/vagas/services/candidaturasService.ts` to `RH_PATH_FILES` in
`rh-console.grep.test.ts` so a regression re-fails.

## Info

### IN-01: `bigfiveService.ts` docstring still says "120 Likert answers" post-UX-08

**File:** `src/features/avaliacao/services/bigfiveService.ts:142` (adjacent file, discovered via call-chain trace from `BigFiveQuestionnaireScreen.tsx`, which imports it)

**Issue:** `submitBigfiveFinal`'s docstring reads "Submits the 120 Likert answers for
server-side scoring" — stale since UX-08 dropped the administered set to 116
non-contiguous items. This is exactly the kind of "stale 120 literal" the review brief
called out; every other file in the 116-lockstep chain (`bigfiveSchema.ts`,
`BigFiveQuestionnaireScreen.tsx`, `bigfive-scoring.ts`, `submit-bigfive-final/index.ts`)
was updated — this comment in the sibling service file was missed. No functional
impact (comment only).

**Fix:** `Submits the 116 active Likert answers for server-side scoring (AVAL-04).`

### IN-02: `getRedacaoCandidato` is dead code (unused export)

**File:** `src/features/avaliacao/services/redacaoService.ts:168-199`

**Issue:** `getRedacaoCandidato` is exported but has zero production call sites (grep
confirms the only references are the function's own definition and its test file);
`RedacaoEditorScreen.tsx` uses `getMinhasRedacoes` exclusively. Beyond being dead code,
note for any future consumer: unlike the old base-table `.maybeSingle()` read (which
would error on >1 row), the RPC now returns an array and the function silently takes
`rows[0]`, so a candidatura with more than one redação would silently drop data with no
error — a footgun if this function is ever wired up again.

**Fix:** Remove `getRedacaoCandidato` (and its test coverage) if truly unused, or wire
it to a real caller and pass a `pergunta_id` filter so `rows[0]` is unambiguous.

---

_Reviewed: 2026-07-09T22:21:38Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
