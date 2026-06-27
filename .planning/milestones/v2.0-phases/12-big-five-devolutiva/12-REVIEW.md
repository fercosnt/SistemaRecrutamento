---
phase: 12-big-five-devolutiva
reviewed: 2026-06-23T03:09:22Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts
  - docs/conhecimento/prompts/templates/08-bigfive-devolutiva.md
  - src/__tests__/guards/forbidden-strings.grep.test.ts
  - src/features/avaliacao/__tests__/bigfive-contract.test.ts
  - src/features/avaliacao/components/AvaliacaoContainer.tsx
  - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx
  - src/features/avaliacao/components/DevolutivaBigFiveView.tsx
  - src/features/avaliacao/components/ScorecardAvaliacao.tsx
  - src/features/avaliacao/components/index.ts
  - src/features/avaliacao/schemas/bigfiveSchema.ts
  - src/features/avaliacao/services/bigfiveService.ts
  - src/features/avaliacao/services/scoresRhService.ts
  - src/router/routes.tsx
  - supabase/functions/_shared/avaliacao-schemas.ts
  - supabase/functions/_shared/bigfive-scoring.test.ts
  - supabase/functions/_shared/bigfive-scoring.ts
  - supabase/functions/gerar-devolutiva-bigfive/index.test.ts
  - supabase/functions/gerar-devolutiva-bigfive/index.ts
  - supabase/functions/submit-bigfive-final/index.test.ts
  - supabase/functions/submit-bigfive-final/index.ts
  - supabase/migrations/20260612000001_bigfive_itens.sql
  - supabase/migrations/20260612000002_devolutivas_candidato.sql
findings:
  critical: 5
  warning: 6
  info: 5
  total: 16
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-06-23T03:09:22Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Retroactive adversarial review of the Big Five (IPIP-NEO-120) + D-lite devolutiva
phase, whose code is already deployed to PROD but was never verified. The scoring
core (`_shared/bigfive-scoring.ts`) and the candidate-facing UI/RLS are well
constructed and honor RNF-07a (the system never auto-rejects on a trait value),
the answer-key protection, and the PII allowlist invariants.

However, the **devolutiva generation chain is non-functional in production** and
will fail on **every** invocation, for three independent, mutually-reinforcing
reasons traced below (CR-01, CR-02, CR-03). The candidate flow ends with a
"Sua devolutiva ainda está sendo preparada" screen that never resolves, and
`submit-bigfive-final` reports a fabricated `devolutiva_id` to the client. These
are the exact failure-mode classes flagged in the project memory
([[reference_ef_npm_join_import_bug]], helper-wiring gap, insert-without-select),
re-occurring verbatim in this phase.

The unit/contract tests are GREEN only because they inject mocks that paper over
the production wiring (the dynamic import is never exercised; the mock
`SupabaseAdminLike` returns `{ data: { id }, ... }` for `.insert()` whereas the
real client returns `{ data: null }`). This is the classic
[[feedback_integration_contract_gap]]: both sides of the mock agree while the
real contract is broken.

## Critical Issues

### CR-01: Dynamic `.join("npm:")` / `.join("https://esm.sh/")` imports break `gerar-devolutiva-bigfive` at runtime (EF 500s on every call)

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:411-413, 416, 422, 423`
**Issue:** Every runtime dependency is loaded through a string-concatenated dynamic
`import()` that hides the specifier from the Deno deploy bundler:

```ts
const { createClient } = await import(["https://esm.sh/", "@supabase/supabase-js@2"].join(""));
const { z } = await import(["npm:", "zod@3.25.76"].join(""));
const { default: Anthropic } = await import(["npm:", "@anthropic-ai/sdk@0.102.0"].join(""));
const { default: OpenAI } = await import(["npm:", "openai@6.42.0"].join(""));
```

This is the confirmed PROD-breaking pattern documented in
[[reference_ef_npm_join_import_bug]] — the bundler never sees the package, so at
runtime the import throws `ERR_MODULE_NOT_FOUND` and the EF returns 500. The
sibling working EF `avaliar-redacao/index.ts:38-48` uses **static top-level
imports** and runs fine; this EF diverged. Note the contrast: `submit-bigfive-final`
(the same phase) DOES use a correct static import (`index.ts:38`), so only the
devolutiva EF is affected.

**Fix:** Replace all dynamic imports with static top-level imports at module scope,
exactly like `avaliar-redacao` and `submit-bigfive-final`:

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";
import Anthropic from "npm:@anthropic-ai/sdk@0.102.0";
import OpenAI from "npm:openai@6.42.0";
import {
  callAi,
  loadPrompt,
  resolvedPromptFromLoaded,
  type ResolvedPrompt,
} from "../_shared/ai-client.ts";
```

Then build `PaginaSchema` and the clients at module scope. The `import.meta.main`
guard already gates `Deno.serve`, so static imports do not pollute the test path
(the test only imports `handler`). Re-deploy the EF after the change.

---

### CR-02: `gerar-devolutiva-bigfive` INSERT omits the `NOT NULL` column `candidato_id` → every persist fails with a not-null violation

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:346-355` (insert) and `:286-290` (the precondition read)
**Issue:** The `devolutivas_candidato` table requires `candidato_id uuid NOT NULL`
(`20260612000002_devolutivas_candidato.sql:32`), and the candidate own-row RLS
read depends on it (`USING (candidato_id = auth.uid())`,
`20260612000002:51-53`). But the EF insert never provides `candidato_id`:

```ts
.insert({
  candidatura_id: scoreRow.candidatura_id,
  score_id: scoreRow.id,
  tipo: "big_five",
  conteudo_jsonb: conteudo,
  modelo_ia: "claude-sonnet-4-6",
  prompt_version: "1.0.0",
});   // ← no candidato_id
```

The precondition read at line 288 only selects
`"id, candidatura_id, tipo, status, metadata"` — it never fetches the candidate id,
so the value is not even in scope. Even after CR-01 is fixed, this insert raises
`23502 null value in column "candidato_id" violates not-null constraint` →
`status: "falhou"`. Additionally, `score_id` is inserted but is NOT a column on
`devolutivas_candidato` (the migration has no `score_id` column at all) — that
alone raises `42703 column "score_id" does not exist`. So this insert has **two**
schema mismatches.

**Fix:** Read the candidate id from the candidatura (the EF runs as service_role),
drop the non-existent `score_id` column, and include `candidato_id`:

```ts
// when reading the score row, also resolve the owning candidate:
const { data: scoreRow } = await supabaseAdmin
  .from("scores_candidato")
  .select("id, candidatura_id, tipo, status, metadata")
  .eq("id", args.score_id).maybeSingle();
// then look up the candidato_id via candidaturas:
const { data: cand } = await supabaseAdmin
  .from("candidaturas")
  .select("candidato_id")
  .eq("id", scoreRow.candidatura_id).maybeSingle();

.insert({
  candidatura_id: scoreRow.candidatura_id,
  candidato_id: cand.candidato_id,   // satisfy NOT NULL + own-row RLS
  conteudo_jsonb: conteudo,
  modelo_ia: "claude-sonnet-4-6",
  prompt_version: "1.0.0",
  // NO score_id — not a column on devolutivas_candidato
})
```

Verify against the regenerated `database.types.ts` once the 12-06 apply wave runs.

---

### CR-03: `submit-bigfive-final` INSERT has no `.select()` → `scoreId` is always `null`; the devolutiva is invoked with `score_id: null` and can never resolve

**File:** `supabase/functions/submit-bigfive-final/index.ts:193-215, 224`
**Issue:** The score insert does not chain `.select()`:

```ts
const { data: scoreRow } = await supabaseAdmin
  .from("scores_candidato")
  .insert({ candidatura_id, tipo: "big_five", status: "sucesso", metadata: {...} });
```

In supabase-js v2, `.insert()` WITHOUT `.select()` returns `{ data: null }` (no
representation by default). The subsequent `scoreId` extraction (lines 210-215)
therefore always evaluates to `null`. The devolutiva is then invoked with
`body: { candidatura_id, score_id: null }` (line 224). In
`gerar-devolutiva-bigfive`, `score_id` becomes `""` (line 485
`String(... ?? "")`), the precondition lookup `eq("id", "")` returns no row, and
the handler returns `{ status: "falhou" }`. The devolutiva is never generated even
if CR-01/CR-02 are fixed.

The unit test masks this: the mock admin's `insert()` returns
`{ data: { id: "score-1" }, error: null }` (`submit-bigfive-final/index.test.ts:66-69`),
so the test sees a non-null `scoreId` that production never produces.

**Fix:** Add `.select("id").single()` (or `.maybeSingle()`) to the insert so the
new row id is returned:

```ts
const { data: scoreRow, error: scoreErr } = await supabaseAdmin
  .from("scores_candidato")
  .insert({ candidatura_id, tipo: "big_five", status: "sucesso", metadata: {...} })
  .select("id")
  .single();
// scoreRow.id is now the real uuid
```

Then simplify the `scoreId` extraction. Update the mock contract in the test to
mirror real `.select()` chaining so the gap cannot reopen.

---

### CR-04: `gerar-devolutiva-bigfive` uses `.insert()` against a `UNIQUE (candidatura_id)` table — regeneration raises `23505`, contradicting the documented "idempotent upsert"

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:346-355`; constraint at `supabase/migrations/20260612000002_devolutivas_candidato.sql:38`
**Issue:** The migration declares `UNIQUE (candidatura_id)` and its own comment
states "One devolutiva per candidatura (idempotent regeneration **upserts** this
row)" (`:37`). The table COMMENT and the bigfiveService docstring likewise assume
idempotent regeneration. But the EF uses a plain `.insert()`, not `.upsert()`. The
first generation per candidatura may succeed (after CR-01/02/03 are fixed); any
re-run (the n8n retry path the submit EF explicitly relies on as "best-effort…
(re)generated by the async pipeline", `submit-bigfive-final/index.ts:235`) hits
`23505 duplicate key value violates unique constraint` → `status: "falhou"`. The
retry can therefore NEVER succeed, defeating the best-effort design.

**Fix:** Use an upsert keyed on the unique column:

```ts
.upsert(
  { candidatura_id, candidato_id, conteudo_jsonb, modelo_ia, prompt_version },
  { onConflict: "candidatura_id" },
)
.select("id")
.single();
```

---

### CR-05: `gerar-devolutiva-bigfive` returns a fabricated `devolutiva_id: "dev-1"` when the insert returns no representation, masking persistence failure

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:364`
**Issue:** Because the production insert (like CR-03) has no `.select()`, the real
client returns `{ data: null }`, so `inserted?.id` is `null` and the code
substitutes a hardcoded fake:

```ts
const devolutiva_id = inserted?.id ?? "dev-1";
```

This propagates a non-existent uuid `"dev-1"` up to `submit-bigfive-final`, which
logs it and returns `{ ok: true, devolutiva_id: "dev-1" }` to the candidate. The
candidate UI then queries `devolutivas_candidato` by `candidatura_id` (so the bad
id is not directly used to fetch), but the EF wrongly reports success: any
monitoring/audit keyed on `devolutiva_id` records a phantom row. The fallback to a
literal exists only because the test mock returns `{ data: { id: "dev-1" } }`
(`gerar-devolutiva-bigfive/index.test.ts:97`) — the `"dev-1"` literal is a test
fixture that leaked into production code.

**Fix:** Add `.select("id").single()` to the insert/upsert (CR-04 fix covers this),
remove the `?? "dev-1"` fallback, and treat a missing returned id as a persistence
failure (`return { status: "falhou", paginas }`).

## Warnings

### WR-01: Devolutiva EF never wires the `_shared` AI helpers' audit/cost/log path for its own call_type; `loadPrompt` is reachable but the structured-output schema/word-count contract drifts

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:418-420, 451-480`
**Issue:** The EF's local `PaginaSchema` (`.min(50)` text, `palavras` int 100-250,
lines 418-420) does NOT match the canonical `BigfiveDevolutivaSchema.paginas`
element (`texto_interpretativo` `.min(50)`, `palavras` int 100-250) nor the
word-count business rule (`WORD_MIN=150`/`WORD_MAX=200`, line 54-55). The schema
accepts 100-word output that the `inRange()` gate (150-200) then rejects, forcing a
retry/degrade on outputs the schema called valid — wasted AI calls and silent
degrade. More importantly the helper-wiring gap warned about in the prompt holds:
`callAi` IS invoked (good), but the EF passes empty `candidato_id: ""` /
`vaga_id: ""` (lines 470-471), so every `ai_call_logs` row written by `logAiCall`
for the devolutiva is unattributable (LGPD-02 traceability says 100% of AI
suggestions must be auditable — these are logged with no candidate/vaga linkage).

**Fix:** Pass the real `candidato_id`/`vaga_id` (resolvable from the candidatura
read added in CR-02) into `callAi` so the audit log is attributable; align
`PaginaSchema`'s `palavras` bounds with `WORD_MIN`/`WORD_MAX` (or drop the
redundant schema-level `palavras` and rely on the `inRange` gate) so the validator
and the business rule agree.

### WR-02: `zod@3.25.76` is loaded but `messages.parse` structured-output requires the schema be passed as the Anthropic `output_config.format` via `zodOutputFormat`; the devolutiva EF passes a raw schema and relies on `callAi`'s no-op default

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:472`, cross-ref `_shared/ai-client.ts:166-169, 254-255, 329`
**Issue:** `callAi` accepts an optional `zodOutputFormat`/`zodResponseFormat`
builder via `deps`; when omitted it defaults to a **no-op** passthrough
(`ai-client.ts:254` `((s) => s)`). The devolutiva EF calls `callAi(..., { anthropic,
openai, supabase })` (line 474) without supplying those builders, so the raw Zod
object is handed to `anthropic.messages.parse({ output_config: { format: schema }})`
un-adapted. Anthropic's helper requires `zodOutputFormat(schema, name)` to produce
the JSON-schema format wrapper; passing the bare schema will not produce valid
structured output → the call returns `parsed_output: null` → every dim degrades to
the raw template (the devolutiva is never actually personalized). This matches the
"schema /v4 mismatch / helper not wired" failure noted in the phase brief.

**Fix:** Import the helper builders statically and inject them, mirroring how the
working Phase-10/11 EFs construct `callAi` deps:

```ts
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod";
// ...
await aiClient.callAi({ ...args, schema: PaginaSchema },
  { anthropic, openai, supabase: supabaseAdmin, zodOutputFormat, zodResponseFormat });
```

Confirm against `avaliar-redacao`'s production deps construction.

### WR-03: Empty `respostas` object silently produces a full (zeroed) score instead of erroring — `score()` does not assert 120-key coverage

**File:** `supabase/functions/_shared/bigfive-scoring.ts:184-219`
**Issue:** `score()` initializes every facet raw to 0 then sums whatever keys
`respostas` contains (line 190-195). It never asserts that all 120 ids are present
or that ids fall in 1..120. If called with a partial/empty map (e.g. a future
caller that skips `validateBody`), it returns a structurally-valid but meaningless
all-zero score with `percentil` clamped to 1 across the board — no error thrown
(exactly RESEARCH Pitfall 1, "silently corrupts… with NO error thrown"). Today
`submit-bigfive-final.validateBody` gates this, but the scorer is exported and the
invariant lives only in the caller.

**Fix:** Add a defensive guard at the top of `score()`:

```ts
const keys = Object.keys(respostas);
if (keys.length !== 120) throw new Error(`expected 120 responses, got ${keys.length}`);
for (const k of keys) { const id = Number(k); if (!Number.isInteger(id) || id < 1 || id > 120) throw new Error(`invalid item id ${k}`); }
```

### WR-04: `analogia()` "menos que" count is wrong at the percentile boundaries (off-by-one / can sum to >100)

**File:** `src/features/avaliacao/components/DevolutivaBigFiveView.tsx:86-91`
**Issue:**

```ts
const acima = Math.max(0, Math.min(99, percentil - 1))
const abaixo = Math.max(0, 100 - percentil)
```

For `percentil = 50`: `acima = 49`, `abaixo = 50` → "mais … que 49 e menos que 50",
sum 99 (the person is the 100th) — acceptable. But for `percentil = 1`:
`acima = 0`, `abaixo = 99`; for `percentil = 99`: `acima = 98`, `abaixo = 1`. The
"Em um grupo de 100 pessoas" framing implies `acima + abaixo + 1 = 100`, which only
holds when `acima = percentil - 1` and `abaixo = 100 - percentil` — true here, so
the arithmetic is consistent, BUT the prompt template (`08-bigfive-devolutiva.md:66,107`)
renders the SAME analogy independently inside the AI text, producing two
differently-worded analogies on the same page (the dashboard card's
`analogia()` plus the AI's rendered sentence). They can disagree if the AI rounds
or rephrases. This is a correctness/consistency risk, not a crash.

**Fix:** Render the analogy in exactly one place. Either drop the client-side
`analogia()` and rely on the AI text, or strip the analogy instruction from the
prompt and keep the deterministic client render. Single source of truth.

### WR-05: `loadDevolutiva` allowlist omits `candidato_id`, so the candidate-facing read cannot defend-in-depth verify ownership; relies solely on RLS

**File:** `src/features/avaliacao/services/bigfiveService.ts:217`
**Issue:** The read selects `'id, candidatura_id, conteudo_jsonb, created_at'` and
filters only by `candidatura_id`. Ownership is enforced purely by the RLS policy
`candidato_id = auth.uid()`. That is correct defense at the DB, but the query
filters on `candidatura_id` (which the candidate supplies via the route param) with
no app-layer ownership assertion. If the RLS policy is ever dropped/misconfigured
(as has happened in this project — see the auth-hook RLS gap memory), this read
would return another candidate's devolutiva. Low likelihood, high impact (PII).

**Fix:** Keep relying on RLS (correct), but consider asserting the returned row's
`candidato_id` matches the session user as belt-and-suspenders, OR document that
the route param `candidaturaId` is itself authorization-checked upstream. At
minimum, add a test that a non-owner gets `null`.

### WR-06: `submitBigfiveFinal` maps a generic Edge Function error to `NETWORK_ERROR`, swallowing real `400 VALIDATION` (e.g. an incomplete body) as a retry-suggesting message

**File:** `src/features/avaliacao/services/bigfiveService.ts:163-184`
**Issue:** `supabase.functions.invoke` surfaces non-2xx as `error` with a
`FunctionsHttpError` whose `.status` is the HTTP code. The handler only special-cases
`42501`/`403` (LOCKED); a `400` (the EF's `VALIDATION` for a malformed/incomplete
`respostas`) falls through to "Não foi possível enviar sua avaliação. Tente
novamente." (`NETWORK_ERROR`), telling the candidate to retry an action that will
deterministically fail again. Given the client pre-gates with `isAllAnswered`, this
is unlikely but the mapping is wrong.

**Fix:** Branch on `e.status === 400` → a distinct `INVALID_INPUT` message
("Revise suas respostas…") rather than the network-retry copy.

## Info

### IN-01: Seed data has duplicate item texts that look like transcription errors

**File:** `supabase/migrations/20260612000001_bigfive_itens.sql:78, 108, 163`
**Issue:** "Me irrito facilmente." is the seed text for item 6 (`:78`), item 36
(`:108`), AND item 91 (`:163`) — three N-domain items with identical wording. The
IPIP-NEO-120 has distinct items per facet; identical text suggests a copy/paste
transcription slip from the source JSON. This does not corrupt scoring (scoring is
keyed by `item_id`/`faceta`, not text) but a candidate sees the same statement three
times, harming face validity. Verify against
`docs/conhecimento/big-five/fontes/ipip-neo-120-questions-pt-br.json`.

**Fix:** Re-check items 36 and 91 against the source JSON and correct the texts.

### IN-02: Inconsistent gendered/agreement forms in seed items

**File:** `supabase/migrations/20260612000001_bigfive_itens.sql:82, 102, 35`
**Issue:** Mixed conventions: item 10 "Gosta de organizar as coisas." (3rd person
— should be "Gosto" for 1st-person self-report), item 35 "Sou muito bom no que
faço(a)." (the "(a)" is misplaced — belongs on "bom(boa)"). Cosmetic, but
candidate-facing.

**Fix:** Normalize all items to 1st-person singular and consistent inclusive-form
markers.

### IN-03: `ScoreRow.tipo` typed as `string` instead of a union, weakening the `isBigFiveRow` discriminator

**File:** `src/features/avaliacao/services/scoresRhService.ts:94, 116-118`
**Issue:** `tipo: string` then `row.tipo === 'big_five'`. A typo in the literal
elsewhere would not be caught by the compiler. Minor type-safety improvement.

**Fix:** `tipo: 'sjt' | 'big_five' | 'redacao' | ...` mirroring the `tipo_score`
enum.

### IN-04: Dead `import.meta.main` divergence — `submit-bigfive-final` and `gerar-devolutiva-bigfive` use different DI shapes, raising maintenance cost

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:495`
**Issue:** The production wiring casts `supabaseAdmin as unknown as SupabaseAdminLike`
because the structural interface (`SupabaseAdminLike`, lines 196-205) is a hand-rolled
subset that does not match the real client. The double-cast defeats type checking
on the exact insert that is broken in CR-02. A shared `_shared` admin type (already
exists as `SupabaseLike` in ai-client) would have surfaced the missing column at
compile time.

**Fix:** Reuse/extend the shared client type rather than a local structural subset;
drop the `as unknown as` double cast.

### IN-05: `DISCLAIMER_LGPD_CRP` in the EF vs the client differ in wording ("Gerenciado por responsável técnica registrada no CRP-XX/XXXXX" vs "Gerenciado pela Dra. [Nome], CRP-XX/XXXXX")

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:158-162` vs `src/features/avaliacao/components/DevolutivaBigFiveView.tsx:63-68`
**Issue:** Two different "verbatim" disclaimer strings for the same legal footer.
The EF persists one into `conteudo_jsonb.disclaimer_lgpd_crp`; the client uses its
own only as a fallback when the EF value is absent. Today they diverge — the
template doc (`08-bigfive-devolutiva.md:125`) is the source of truth and matches
neither exactly. The "[Nome]" placeholder in the client copy would ship literally
if the EF value were ever missing. Both still contain "CRP-XX/XXXXX" placeholders —
a go-live blocker the prompt template flags ("Pendente revisão final CRP").

**Fix:** Single-source the disclaimer (e.g. a `_shared` constant the EF persists and
the client never re-authors), and resolve the CRP registration placeholder before
the 12-06 is_active flip / go-live.

---

_Reviewed: 2026-06-23T03:09:22Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
