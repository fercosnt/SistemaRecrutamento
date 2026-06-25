---
phase: 14-entrevistas-com-ia-companion-etapas-4-5
reviewed: 2026-06-25T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - e2e/prova-cognitiva.spec.ts
  - src/features/avaliacao-cognitiva/__tests__/prova-cognitiva.test.tsx
  - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
  - src/features/avaliacao-cognitiva/hooks/useProctoring.ts
  - src/features/avaliacao-cognitiva/services/cognitivoService.ts
  - src/features/entrevista/__tests__/entrevista-allowlist.test.ts
  - src/features/entrevista/components/CognitivoBandCard.tsx
  - src/features/entrevista/components/EntrevistaDashboard.tsx
  - src/features/entrevista/components/EntrevistaScorecardInline.tsx
  - src/features/entrevista/components/EntrevistaWorkspace.tsx
  - src/features/entrevista/components/GuiaEntrevistaPanel.tsx
  - src/features/entrevista/components/TranscricaoReviewPanel.tsx
  - src/features/entrevista/hooks/useEntrevistaScorecard.ts
  - src/features/entrevista/services/entrevistaService.ts
  - src/router/routes.tsx
  - supabase/functions/_shared/cognitivo/item-bank.ts
  - supabase/functions/_shared/cognitivo/scoring.ts
  - supabase/functions/_shared/interview-output-schemas.ts
  - supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.ts
  - supabase/functions/avaliar-transcricao-entrevista/index.ts
  - supabase/functions/gerar-guia-entrevista/_local/weak-dim-coverage.ts
  - supabase/functions/gerar-guia-entrevista/index.ts
  - supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql
  - supabase/migrations/20260624000002_salvar_avaliacao_entrevista_rpc.sql
  - supabase/migrations/20260624000003_pontuar_cognitivo_rpc.sql
  - supabase/migrations/20260624000004_avancar_etapa_flag_guard.sql
findings:
  critical: 4
  warning: 7
  info: 4
  total: 15
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-06-25
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Phase 14 ships the RH interview workspace (guide generation, transcript analysis with
the anti-regional-bias flag block, inline scorecard, RH-only cognitive band) plus the
candidate cognitive prova. The security posture on the privileged surfaces is strong:
both Edge Functions authenticate-then-authorize correctly (getUser → role from
`usuarios_rh` → vaga ownership), use static `npm:` imports (the deploy-bundler trap is
avoided), keep `.strict()` anti-tamper body schemas, and the SECURITY DEFINER RPCs guard
ownership + etapa before scoring. The RNF-07a invariant (AI never auto-rejects) holds
everywhere I traced. No `select('*')` on candidate-readable tables.

However, the data flow has multiple **wiring breaks that make core features non-functional
end-to-end**, plus one **silent authorization failure** in the flag-release path. The
most serious: (1) the cognitive item bank seed is empty and no migration populates
`cognitivo_itens`, so the prova never renders any items in production; (2) the candidate's
picks/proctoring are never persisted (`cognitivo_respostas` has zero writers — the table
and its entire back-lock RLS are dead); (3) the "Confirmar revisão humana" release path
does a direct table UPDATE that RLS will silently reject (no UPDATE policy exists), leaving
flagged candidates permanently un-advanceable via the documented path; (4) a field-name
mismatch (`competency` vs `competencia`) between what the EF writes and what every RH
component reads means transcript competencies, AI-seeded scorecard defaults, and citations
never display.

These are correctness/robustness defects, not security holes — but several render the
shipped feature inoperative.

## Critical Issues

### CR-01: Cognitive prova has no items — empty seed, no seeding migration

**File:** `supabase/functions/_shared/cognitivo/item-bank.ts:106`
**Issue:** `SEED_ITENS_RACIOCINIO` is `[]` (still flagged `[PENDING CC0 DOWNLOAD]`), and no
migration inserts into `public.cognitivo_itens` (grep confirms zero `INSERT INTO ... cognitivo_itens`).
In production `cognitivo_itens` is therefore empty. Consequences traced end-to-end:
- `listItens()` returns `[]` → `ProvaCognitivaScreen` hits the `perguntas.length === 0`
  branch and shows "Esta etapa não está disponível" **even when the vaga opted in**. The
  prova is unreachable.
- If picks were ever submitted, `pontuar_cognitivo` scores over `COUNT(*) = 0` items →
  `v_n_total = 0` → band defaults to `na_media` for every candidate, and
  `scores_candidato.score = 0, score_max = 0`. The RH band card would show "Banda 3 de 5 —
  mediana" for everyone, which is misleading data, not a neutral absence.

This is not a "pending content" footnote — the feature cannot function and the failure mode
(silent na_media) is worse than an explicit "not configured" state.
**Fix:** Either (a) gate the prova/RPC on a non-empty item set with an explicit "prova não
configurada" state, or (b) land the CC0 seed + a seeding migration before this ships. At
minimum, `pontuar_cognitivo` must refuse to persist a row when `v_n_total = 0`:
```sql
IF v_n_total = 0 THEN
  RAISE EXCEPTION 'prova cognitiva sem itens configurados' USING ERRCODE = 'no_data_found';
END IF;
```

### CR-02: Candidate picks + proctoring are never persisted (`cognitivo_respostas` has no writer)

**File:** `supabase/migrations/20260624000003_pontuar_cognitivo_rpc.sql:116` and `supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql:122`
**Issue:** `pontuar_cognitivo` only `INSERT ... INTO public.scores_candidato`. Nothing —
not the RPC, not the EF, not the client — ever writes `public.cognitivo_respostas`. A grep
for any insert/upsert/update of that table returns nothing. As a result:
- `raw_responses`, `shuffle_seed`, `completion_time_seconds`, and the `proctoring` jsonb
  are never stored. The entire `cognitivo_respostas` table — and its carefully-built
  candidate own-row SELECT policy + etapa-gated back-lock `FOR ALL` policy (migration 01,
  lines 168-206) — is **dead code**. The migration's "back-lock" security control protects a
  table no one writes.
- `useProctoring` accumulates `events`/`blurCount`, but `ProvaCognitivaScreen` never reads
  them and `submitProva` never sends them (the `_shuffleSeed`/`_clientTimings` params are
  unused). The "registramos quando a aba perde o foco" disclosure shown to the candidate is
  not truthful — nothing is recorded server-side.
**Fix:** Persist the candidate's raw picks + proctoring context to `cognitivo_respostas`
(either inside `pontuar_cognitivo` as an additional INSERT keyed by candidatura, or via a
client write under the existing back-lock policy before scoring), and wire
`submitProva(candidaturaId, respostas, shuffleSeed, proctoringEvents)` to actually pass the
collected context. If persistence is intentionally deferred, remove the dead table + the
disclosure copy claiming events are registered.

### CR-03: "Confirmar revisão humana" silently fails — RLS denies the direct UPDATE

**File:** `src/features/entrevista/services/entrevistaService.ts:465-479`
**Issue:** `confirmarRevisaoHumana` performs a direct `supabase.from('entrevista_analises')
.update({ revisao_confirmada_em }).eq('id', analiseId)` from the RH **client** (anon key +
JWT). But `entrevista_analises` has RLS enabled with **only a SELECT policy** — migration 01
(line 156) explicitly states "(no INSERT/UPDATE policy → only service_role EF / SECURITY
DEFINER RPC writes)". With RLS on and no UPDATE policy, PostgREST applies the policy as a
0-row filter: the UPDATE **affects no rows and returns no error** (RLS-filtered UPDATEs are
not errors in PostgREST). So `revisao_confirmada_em` is never set.
The service docstring claims this write is "Authorized via the allowlisted update (RLS + the
rh-only review-fields trigger backstop the write at the DB)" — but no such UPDATE policy and
no review-fields trigger exist anywhere in the migrations (verified by grep). The claimed
backstop is fictional.
Impact: this is the **only enabled release path** the UI exposes while the language/accent
flag block is active (`TranscricaoReviewPanel` lines 199-208). Because it no-ops, a flagged
candidatura can never have `revisao_confirmada_em` set through this button, so the
`avancar_etapa` guard (migration 04) blocks the advance **forever** via this path. (The
candidate is stuck unless the gestor happens to save a full scorecard, which sets the marker
via the RPC — an undocumented side door.)
**Fix:** Route confirmation through a SECURITY DEFINER RPC (mirror `salvar_avaliacao_entrevista`),
or add a dedicated `confirmar_revisao_entrevista(p_analise_id uuid)` RPC that enforces
role + vaga ownership and sets the marker. Do not rely on a client-side UPDATE against a
table with no UPDATE policy. Also fix the false docstring.

### CR-04: Field-name mismatch (`competency` vs `competencia`) hides all transcript competencies in the RH UI

**File:** `supabase/functions/avaliar-transcricao-entrevista/index.ts:108-114` (write) vs `src/features/entrevista/services/entrevistaService.ts:114-125` / `src/features/entrevista/components/EntrevistaScorecardInline.tsx:62-68` / `src/features/entrevista/components/TranscricaoReviewPanel.tsx:50-60` (read)
**Issue:** The EF persists `entrevista_analises.competencias` as
`[{ competency: string, score: ... }]` (English key — `extractCompetencias` maps to
`{ competency, score }`). But every RH consumer reads the **Portuguese** key:
- `AnaliseCompetencia` interface declares `competencia` (pt-BR) + `score`.
- `EntrevistaScorecardInline` filters `(c) => typeof c.competencia === 'string'` and keys
  on `c.competencia` — with the EF's `competency` key this filter drops **every** AI item,
  so the scorecard always falls back to `DEFAULT_COMPETENCIAS` with no AI-seeded slider
  values, and the `SugestaoIABadge` never shows.
- `TranscricaoReviewPanel.DimensaoRow` renders `c.competencia` → always `undefined` →
  blank competency labels in the analysis readout.
Net effect: the transcript analysis produces competency scores that **never reach the RH**,
defeating the central ENTREV-03 surface. No test catches this because the allowlist test
only source-probes for `select('*')` and the prova test doesn't exercise this shape.
**Fix:** Make the write and read agree on one key. Either map in the EF
(`{ competencia: c.competency, score: c.score }`) or normalize in the service read layer:
```ts
// in getAnalise, normalize EF 'competency' → 'competencia'
competencias: (raw.competencias ?? []).map((c) => ({
  competencia: c.competencia ?? c.competency,
  score: c.score ?? null,
  ...c,
})),
```
The `citacoes`/`bias_flags` arrays written by the EF (lines 260-267) carry the same
`competency` English key — audit those consumers too.

## Warnings

### WR-01: `salvar_avaliacao_entrevista` requires non-empty notes, but the scorecard labels notes "opcional"

**File:** `supabase/migrations/20260624000002_salvar_avaliacao_entrevista_rpc.sql:78-80` vs `src/features/entrevista/components/EntrevistaScorecardInline.tsx:124` / `src/features/entrevista/services/entrevistaService.ts:374`
**Issue:** The RPC raises `check_violation` when `p_notas` is empty
(`IF p_notas IS NULL OR length(btrim(p_notas)) = 0 THEN RAISE ...`). But the UI Label says
"Notas do gestor (opcional)" and `salvarAvaliacao` sends `payload.notas ?? ''`. A gestor
who leaves notes blank (as the UI invites) gets a `23514` → mapped to
"Dados inválidos. Verifique os campos." toast with no indication that notes are actually
required. Contract drift between UI affordance and server validation.
**Fix:** Either make notes genuinely optional in the RPC (drop the non-empty check, since
scores_humanos is the real payload), or make the UI require notes (remove "opcional",
disable Save while empty) to match the server.

### WR-02: `EntrevistaWorkspace` never wires `onAvancarEtapa` — the "Avançar etapa" CTA is a dead button

**File:** `src/features/entrevista/components/EntrevistaWorkspace.tsx:172-183`
**Issue:** `TranscricaoReviewPanel` exposes `onAvancarEtapa` (used by the "Avançar etapa"
button, lines 211-214), but the workspace mounts it without that prop. So even after the
flag is (supposedly) released, clicking "Avançar etapa" does nothing — there is no funil
advance handler anywhere in the workspace. The whole advance flow is unreachable from this
surface.
**Fix:** Wire an advance mutation (call the funil-advance RPC/service) into
`onAvancarEtapa`, or remove the CTA if advancing is handled elsewhere.

### WR-03: `registrarRejeicaoCognitiva` writes the audit log but never effects (or records) the rejection

**File:** `src/features/entrevista/services/entrevistaService.ts:488-515` and `src/features/entrevista/components/EntrevistaWorkspace.tsx:98-106`
**Issue:** The reject-by-cognitive flow writes a `bias_audit_log` row and toasts "Decisão
registrada no log de auditoria de viés" — but nothing actually rejects the candidate, nor
is the decision linked to a funil action. The audit row is keyed only by
`dados.candidatura` (a jsonb field), not a real FK, so it's orphaned context. The UI button
reads "Registrar e rejeitar", implying a rejection occurs; none does. This is misleading at
best (the gestor believes they rejected; the candidate's etapa is unchanged) and, combined
with no FK, makes the audit trail hard to correlate. (RNF-07a is satisfied — no auto-reject —
but the human's explicit reject is also dropped.)
**Fix:** Decide the intended behavior: if the gestor is rejecting, perform the funil
transition (regression to `rejeitado` with justificativa) after the audit write, in the same
flow; if this is audit-only context, change the button label so it does not promise a
rejection.

### WR-04: `getScores` is not vaga-ownership scoped — any RH sees any candidate's interview/cognitive scores

**File:** `src/features/entrevista/services/entrevistaService.ts:306-325`
**Issue:** `getScores` / `getGuia` / `getAnalise` / `getEntrevistaContexto` read from the
client (anon + JWT) filtered only by `candidatura_id`. The RLS on these tables is
`role IN ('rh','administrador')` (migration 01, lines 145-155) — it is **not** scoped to the
RH's own vagas. So a recrutador can read the interview transcript analysis, BARS scores,
cognitive band, and guide of a candidate on a vaga owned by a *different* recrutador, just by
navigating to `/rh/candidato/:id/entrevista` with any candidatura id. Contrast: the write
RPCs and the EFs *do* enforce `vagas.created_by = auth.uid()` for `role='rh'`. The read path
is the weaker link. Given these rows are sensitive PII (transcript analysis, scores), this
is a horizontal-access gap among RH users. (Not BLOCKER only because all readers are
authenticated RH staff, but it violates the same ownership boundary the writes enforce.)
**Fix:** Add `created_by = (auth.jwt() #>> '{app_metadata,role}') = 'administrador' OR
vaga.created_by = auth.uid()`-style scoping to the SELECT policies (join through
candidaturas → vagas), so a recrutador only reads interview data for their own vagas.

### WR-05: `analisarTranscricao` client length guard (`> 0`) is far below the EF's 200-char floor

**File:** `src/features/entrevista/services/entrevistaService.ts:435-437` vs `supabase/functions/avaliar-transcricao-entrevista/index.ts:87,165`
**Issue:** The client only rejects empty/whitespace transcripts, but the EF rejects anything
under `MIN_TRANSCRICAO_LEN = 200` chars with a `VALIDATION` error. A gestor pasting a short
transcript passes the client guard, invokes the EF, and gets a generic
"Não foi possível analisar a transcrição. Tente novamente." (the service collapses all EF
errors to NETWORK_ERROR) — with no hint that the transcript is too short. Poor error
fidelity; the retryable framing is wrong for a deterministic validation failure.
**Fix:** Mirror the 200-char floor client-side with a specific message, and/or surface the
EF's `error_code: "VALIDATION"` distinctly instead of mapping every EF error to NETWORK_ERROR.

### WR-06: EF persists analysis even when `competency_evaluations` is absent — `.competencias` filters silently drop it, but flag derivation assumes the field exists

**File:** `supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.ts:62-63` and `supabase/functions/avaliar-transcricao-entrevista/index.ts:255`
**Issue:** `deriveLanguageAccentFlag` iterates `parsed.competency_evaluations ?? []` and
reads `c.bias_flags.regional_markers_ignored`. The slice type requires `bias_flags` to be a
non-null object, but `parsed` here is the loosely-cast LLM output
(`TranscriptAnalysisSlice & {...}`), only reached after the `parsed == null` guard. If the
model returns a `competency_evaluations` entry missing `bias_flags` (schema parse can be
bypassed when `zodOutputFormat` is the no-op in some provider paths, or on partial parse),
`c.bias_flags.regional_markers_ignored` throws `TypeError`, caught by the outer try/catch →
500 `SERVER_ERROR`, and **no analysis row is persisted at all** — violating the
"never-absent persist" invariant the EF documents (lines 232-250).
**Fix:** Guard the access: `const bf = c.bias_flags ?? {}; const fires = (c.score ?? 5) < 3
&& bf.regional_markers_ignored === false;`. Treat missing fields as non-firing rather than
throwing.

### WR-07: `confirmarRevisaoHumana` error map mislabels a 0-row success and misroutes errors

**File:** `src/features/entrevista/services/entrevistaService.ts:465-479`
**Issue:** Independent of CR-03: this function uses `.maybeSingle()` after `.update()`. When
RLS filters the row, `data` is `null` and `error` is `null`, so the function returns
"success" while nothing changed — the caller (mutation `onSuccess`) invalidates the query
and the UI optimistically shows "released" though the DB marker is unset. There is no
post-write read-back to confirm the marker landed. Even apart from the RLS issue, a missing
analiseId would not be detected.
**Fix:** After the write, assert the returned row exists and `revisao_confirmada_em` is set;
throw `NOT_FOUND` when `data == null`. (Best fixed together with CR-03 by moving to an RPC.)

## Info

### IN-01: `cognitivoService.submitProva` has dead branches and unused params

**File:** `src/features/avaliacao-cognitiva/services/cognitivoService.ts:182-216`
**Issue:** `_shuffleSeed` and `_clientTimings` are accepted but never used (underscore-prefixed,
but still part of the public signature and documented as "advisory anti-cheat context"). The
back-lock branch checks `code === '42501' || String(status) === '42501' || status === 403` —
`String(status) === '42501'` can never be true for an HTTP status (status is numeric 403/401),
so that disjunct is dead. `ProvaCognitivaScreen.handleSubmit` (lines 147-152) has an
`if/else` where both branches show the identical toast — collapse it.
**Fix:** Drop the unused params (or wire them per CR-02), remove the impossible
`String(status) === '42501'` check, and collapse the duplicate-toast if/else.

### IN-02: `scoring.ts` `defaultSecaoOf` fallback contradicts its own docstring and is unreachable in PROD

**File:** `supabase/functions/_shared/cognitivo/scoring.ts:97-112`
**Issue:** The long docstring (lines 97-106) describes a "split the gabarito at 12" / position
convention that the code does not implement; the actual fallback regex-matches `ln|letra|numero`
in the id, else `matriz`. The pure scorer is also never the PROD scoring path — `pontuar_cognitivo`
(the live RPC) reimplements scoring in SQL and does not call `scoreRaciocinio`. So this module
exists only for the golden test. Confusing dead/divergent documentation.
**Fix:** Trim the stale docstring to match the implementation, and note that the PROD scorer is
the SQL RPC (the TS module is the test oracle / future EF path only).

### IN-03: `weakDimsFromScores` depends on the broken `competencias` shape

**File:** `supabase/functions/gerar-guia-entrevista/index.ts:117-131`
**Issue:** `weakDimsFromScores` reads `metadata.competencias` expecting
`[{ competency, score }]`. The transcript EF writes `scores_candidato.metadata.competencias`
via `extractCompetencias` as `[{ competency, score }]` — so the English key matches *here*
(this consumer uses `c.competency ?? c.name`, unlike CR-04's pt-BR consumers). It works, but
only by coincidence of using a different key than the RH UI. Once CR-04 is fixed by renaming
to `competencia`, this function will silently stop finding weak dims (all `< threshold`
detection breaks) → the presencial guide loses its gap-targeting. Cross-module coupling on an
inconsistent key.
**Fix:** When fixing CR-04, standardize the competency key across the write path and update
this reader in lockstep (`c.competencia ?? c.competency ?? c.name`).

### IN-04: `formatDataHora`/`compute24hMarker` use local-timezone parsing of a `timestamptz`

**File:** `src/features/entrevista/components/EntrevistaDashboard.tsx:40-90`
**Issue:** `new Date(iso).getHours()/getDate()` render in the browser's local timezone. For a
`timestamptz` set by RH, candidates/gestores in different timezones see different "agendada"
times and the 24h amber window shifts. For an in-app V1 marker this is likely acceptable, but
the displayed time is not timezone-pinned to America/Sao_Paulo as the domain would expect.
**Fix:** Format with an explicit `timeZone: 'America/Sao_Paulo'` via `Intl.DateTimeFormat`, or
document that times are shown in the viewer's local zone.

---

## Structural Findings (fallow)

No `<structural_findings>` block was provided with this review; none to reconcile.

---

_Reviewed: 2026-06-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
