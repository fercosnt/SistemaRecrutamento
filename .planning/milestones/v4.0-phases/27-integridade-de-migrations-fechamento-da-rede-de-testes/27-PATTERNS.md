# Phase 27: Integridade de Migrations & Fechamento da Rede de Testes - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 16 new/modified artifacts
**Analogs found:** 13 with matches / 16 (3 are net-new with no in-repo analog: `config.toml`, the empty-baseline dump, the ledger reconcile procedure)

All paths below are repo-relative to `/Users/fernando/Cursor Repo/DB Sistema de recrutamento`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/submit-candidatura/index.test.ts` (NEW, CI-03) | test (Deno EF) | request-response | `supabase/functions/submit-bigfive-final/index.test.ts` | exact |
| `supabase/functions/submit-candidatura/index.ts` (MODIFY — export testable handler + bare-zod) | controller (Deno EF) | request-response | `supabase/functions/submit-bigfive-final/index.ts` (handler+deps) | role-match |
| `supabase/functions/_shared/schemas.ts` (MODIFY — bare `zod` import, CI-07) | model/schema | transform/validation | `src/features/decisao/schemas/consolidacaoSchema.ts` | exact (shared-schema precedent) |
| `supabase/functions/deno.json` (MODIFY — `imports` map, CI-07) | config | — | RESEARCH §3b shape (no in-repo prior) | role-match |
| `src/features/avaliacao/__tests__/redacao-contract.test.ts` (MODIFY, CI-07) | test | transform/validation | current file (replica+fs-probe idiom to replace) | exact (self) |
| `src/features/entrevista/__tests__/entrevista-contract.test.ts` (MODIFY, CI-07) | test | transform/validation | current file (same idiom) | exact (self) |
| `src/features/decisao/schemas/__tests__/consolidacaoContract.test.ts` (MODIFY, CI-07) | test | transform/validation | current file (same idiom) | exact (self) |
| DBMIG-02 trigger-fix migration (NEW `.sql`) | migration (trigger) | event-driven | `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` + GUC in `20260709000014` | exact |
| DBMIG-02 backfill (NEW `.sql` — distinct task) | migration (data) | batch | RESEARCH §2c `UPDATE … SET auto_rejeitado=false` | role-match |
| `supabase/tests/submit_candidatura_atomic_smokes.sql` (NEW, CI-03) | test (SQL smoke) | CRUD + event | `supabase/tests/funil01_pontuar_sjt_smokes.sql` | exact |
| `src/features/entrevista/services/entrevistaService.ts` (MODIFY, CI-06 dedup) | service | request-response | `src/lib/efErrors.ts` (canonical helper) | exact |
| `scripts/assert-chunks.mjs` wiring (MODIFY package.json + ci.yml, CI-10) | config/CI | — | `package.json` `build` + `.github/workflows/ci.yml` jobs | role-match |
| `.github/workflows/ci.yml` (MODIFY — CI-10 step + CI-15 step + tsc re-pin) | config/CI | — | existing `deno-test` / `e2e` jobs | exact |
| `package.json` (MODIFY — `assert:chunks` + `postbuild`) | config | — | existing `scripts` block | exact |
| `supabase/config.toml` (NEW, CI-13) | config | — | none in-repo (RESEARCH §6 12-fn table) | no-analog |
| `supabase/migrations/20260419000000_baseline.sql` (MODIFY — fill 0→dump, DBMIG-01) | migration (schema dump) | — | none (procedural `db dump`) | no-analog |

## Pattern Assignments

### `supabase/functions/submit-candidatura/index.test.ts` (test, request-response) — CI-03 layer (a)

**Analog:** `supabase/functions/submit-bigfive-final/index.test.ts` — the closest EF test: candidate-invoked, JWT-ON, mock-client-via-deps, asserts 401 / 403 / `.strict()` 400 / never-write invariants. Clone its harness verbatim.

**Deno std import + dynamic handler loader** (`submit-bigfive-final/index.test.ts:36`, `128-136`):
```typescript
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

async function loadHandler() {
  const mod = await import("./index.ts");
  return mod as {
    handler: (
      req: Request,
      deps: { supabaseAdmin: unknown; supabaseUser: unknown },
    ) => Promise<Response>;
  };
}
```

**Injected mock supabase client — captures inserts/updates, resolves ownership row** (`submit-bigfive-final/index.test.ts:73-126`):
```typescript
function makeMockSupabaseAdmin(candidaturaRow, candidatoOwnerRow = { id: CANDIDATO_ROW_ID }) {
  const inserts = []; const updates = [];
  return { inserts, updates,
    from(table) {
      const row = table === "candidatos" ? candidatoOwnerRow : candidaturaRow;
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }) }),
        insert: (r) => { inserts.push({ table, row: r }); /* …thenable + .select().single() chain… */ },
        update: (r) => { updates.push({ table, row: r }); return { eq: () => Promise.resolve({ data: null, error: null }) }; },
      };
    },
  };
}
function makeMockSupabaseUser(user) {
  return { auth: { getUser: () => Promise.resolve({ data: { user }, error: user ? null : new Error("no user") }) } };
}
```

**Deno.test idiom — 401 / RPC-call-shape / `.strict()` anti-tamper** (`submit-bigfive-final/index.test.ts:149-156`, `248-257`):
```typescript
Deno.test("no session (getUser null) → 401, never writes", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: CANDIDATO_ROW_ID, etapa_atual: "avaliacao_assincrona" });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(null) };
  const res = await handler(makeRequest(VALID_BODY, false), deps);
  assertEquals(res.status, 401);
  assertEquals(admin.inserts.length, 0);
});
Deno.test("a body with an extra field is rejected 400 (.strict)", async () => {
  const tampered = { ...VALID_BODY, score: 99 };
  const res = await handler(makeRequest(tampered), deps);
  assertEquals(res.status, 400);
});
```

**PLANNER NOTE (blocking prerequisite):** the analog test calls an **exported** `handler(req, deps)`. The current `submit-candidatura/index.ts` does NOT export one — it inlines everything in `Deno.serve(async (req) => {…})` at `index.ts:76`, resolves auth at `:145` (`supabaseUser.auth.getUser()`), validates at `:109` (`submitCandidaturaSchema.safeParse(raw)`), and calls the RPC at `:238` (`'submit_candidatura_atomic'`). To make CI-03 layer (a) runnable, `index.ts` must be refactored to **export a `handler(req, deps)`** with the two clients injected via `deps` (exactly the `submit-bigfive-final/index.ts` shape). That refactor is a modify-task paired with the test. The RPC-shape assertion should assert the `rpc('submit_candidatura_atomic', {...})` arg object; error mapping to assert: `DUPLICATE_CANDIDATURA` (23505) and `VALIDATION` (23503) per `index.ts:11-12`.

---

### `supabase/functions/_shared/schemas.ts` (model/schema, transform) — CI-07 shared body-schema

**Analog (precedent):** `src/features/decisao/schemas/consolidacaoSchema.ts` — the ONE module both the EF and the client import; uses **bare `import { z } from 'zod'`** and `.strict()`.

**The bare-specifier + `.strict()` shape to converge on** (`consolidacaoSchema.ts:21`, `27-34`):
```typescript
import { z } from 'zod'                       // ← bare specifier: Node/Vitest AND (with deno.json map) Deno
export const ConsolidacaoRequestSchema = z
  .object({ candidatura_id: z.string().uuid(), vaga_id: z.string().uuid() })
  .strict()                                    // rejects any extra/injected key (anti-tamper, RNF-07a)
export type ConsolidacaoRequest = z.infer<typeof ConsolidacaoRequestSchema>
```

**The current EF schema that must switch its import** — `submitCandidaturaSchema` already exists and is already `.strict()`; ONLY its top-of-file zod import changes (`supabase/functions/_shared/schemas.ts:25`):
```typescript
import { z } from 'https://esm.sh/zod@3'      // ← CI-07: rewrite to `import { z } from 'zod'`
```
The schema body itself is unchanged (`_shared/schemas.ts:201-232`): `candidato_id`/`vaga_id` uuid, `curriculo_url`/`curriculo_nome` min(1), `curriculo_size` int positive max 5 MB, `respostas` array max(100) default([]), closed by `.strict()`. Node resolves bare `zod` from `node_modules` (3.25.76); Deno resolves it via the new `deno.json` import map (below). Do NOT touch the other `_shared/*.ts` schema imports unless their contract test migrates (redacao-cultural, entrevista pair, consolidar) — each rewrite forces an EF redeploy (Pitfall 3).

**Where the client builds the matching body** — the EF handler parses `req.json()` at `index.ts:109`; the client contract test must build the exact `{ candidato_id, vaga_id, curriculo_url, curriculo_nome, curriculo_size, respostas }` body and `.safeParse` it against this real schema.

---

### `supabase/functions/deno.json` (config) — CI-07 import map

**Analog:** none in-repo (current file is `{"exclude": [...]}` only). Shape from RESEARCH §3b — add an `imports` map so bare `zod`/`zod/v4` resolve under `deno test` and Deno-deploy:
```jsonc
{
  "imports": {
    "zod": "npm:zod@3.25.76",
    "zod/v4": "npm:zod@3.25.76/v4"
  },
  "exclude": ["_shared/__tests__/strict-schema.test.ts"]
}
```
(`npm:zod@3.25.76/v4` subpath resolution is already proven — multiple EFs import it and pass `deno test` in CI. Keep the existing `exclude` entry.)

---

### The 3 migrated contract tests (test, transform/validation) — CI-07

**Analog = the current files themselves** (the replica+fs-probe idiom to REPLACE). All three share the identical shape; migrate each to a real `.safeParse` against the shared schema.

**Current idiom to remove** (`consolidacaoContract.test.ts:36-48`, `86-103`; same in `redacao-contract.test.ts:32-47,84-110` and `entrevista-contract.test.ts:29-31,166-225`):
```typescript
import { existsSync, readFileSync } from 'node:fs'          // ← fs-probe: DELETE
import { z } from 'zod'
const ConsolidacaoRequestSchemaReplica = z.object({ … }).strict()   // ← Node-local REPLICA: DELETE
// …
const SHARED_SCHEMA_PATH = resolve(__dirname, '../consolidacaoSchema.ts')
function sharedSchemaSource() { return existsSync(SHARED_SCHEMA_PATH) ? readFileSync(SHARED_SCHEMA_PATH, 'utf8') : '' }
it('…EXPORTS ConsolidacaoRequestSchema (RED until Wave 2)', () => {
  expect(sharedSchemaSource()).toMatch(/export\s+const\s+ConsolidacaoRequestSchema\b/)   // ← source-text probe: REPLACE
})
```

**Target idiom (real parse)** — keep the runtime `.safeParse` assertions the file already has (`consolidacaoContract.test.ts:60-78`), but point them at the **imported real schema** instead of the replica, and drop the `node:fs` block:
```typescript
import { submitCandidaturaSchema } from '../../../../supabase/functions/_shared/schemas'
expect(submitCandidaturaSchema.safeParse(buildClientBody()).success).toBe(true)
expect(submitCandidaturaSchema.safeParse({ ...buildClientBody(), score: 9 }).success).toBe(false)  // .strict() rejects
```
The already-present accept/reject/anti-tamper `it()` blocks (e.g. `consolidacaoContract.test.ts:60,65,70,75`; `redacao-contract.test.ts:60,65,70,75`) are reused verbatim — only their schema reference and the Part-2 fs-probe change. Import path per RESEARCH §3b: `'../../../../supabase/functions/_shared/schemas'` (redacao → `_shared/redacao-schemas`, entrevista → `_shared/entrevista-schemas`, consolidar → `../consolidacaoSchema`). No `@/` alias in the shared files keeps tsc from pulling extra program roots (no baseline inflation).

---

### DBMIG-02 trigger-fix migration (migration, event-driven)

**Analog:** `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` (the trigger to `CREATE OR REPLACE`) + the GUC precedent in `20260709000014_submit_candidatura_flag.sql`.

**The exact defect predicate to change** (`20260607000005_avancar_etapa_trigger.sql:78-82`):
```sql
INSERT INTO public.historico_candidatura
  (candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em)
VALUES
  (NEW.id, OLD.etapa_atual, NEW.etapa_atual, NEW.etapa_justificativa,
   v_ator, (v_ator IS NULL), now());        -- ← DEFECT: marks EVERY system write auto_rejeitado
```

**Replace the `(v_ator IS NULL)` literal with the CONTEXT-locked predicate** (RESEARCH §2b — reuse `ator IS NULL` + GUC, zero new column):
```sql
   v_ator,
   (v_ator IS NULL
    AND current_setting('app.rejeicao_sancionada', true) IS NOT DISTINCT FROM 'on'
    AND NEW.etapa_atual = 'rejeitado'),      -- system write AND sanctioned AND terminal
   now());
```

**GUC precedent** — the txn-local flag already exists, set by the knockout path (`20260709000014_submit_candidatura_flag.sql:136`):
```sql
PERFORM set_config('app.rejeicao_sancionada', 'on', true);   -- is_local=true → SET LOCAL, pooler-safe
```
The knockout writes its OWN explicit history row `auto_rejeitado=true, ator NULL` at `20260709000014:146-150` and does NOT go through this trigger (etapa unchanged → the trigger's `IS NOT DISTINCT FROM` guard at `20260607000005:61` skips) — leave that literal `true` as-is (already correct; planner may gate it symmetrically per Open Q3).

**Migration-file header/structure to mirror** (from `20260709000014:1-36`, `184-195`) — no `BEGIN/COMMIT` wrapper (D-22), `CREATE OR REPLACE FUNCTION … SECURITY DEFINER SET search_path = '' AS $$ … $$;` then `COMMENT ON FUNCTION …` + `REVOKE ALL … FROM PUBLIC;`. Apply posture (RESEARCH §2d): PL/pgSQL `$$` body + adjacent `COMMENT`/`REVOKE` → **MCP `apply_migration`** in the BLOCKING wave (the 42601 pooler trap); factor its auto-inserted version row into the §1 ledger reconcile (Pitfall 5).

---

### DBMIG-02 backfill (migration, batch — DISTINCT task, Pitfall 4)

**Analog:** RESEARCH §2c (no code precedent — a one-time data `UPDATE`). Ship SEPARATELY from the trigger code fix (a `CREATE OR REPLACE` does not retro-correct existing rows):
```sql
UPDATE public.historico_candidatura
   SET auto_rejeitado = false
 WHERE auto_rejeitado = true
   AND etapa_para <> 'rejeitado';   -- system advances mismarked as rejections
```
Safe: audit-only table, zero client reads of `auto_rejeitado` in `src/` (grep = 0). Terminal-rejection rows (`etapa_para='rejeitado'`) keep `true`.

---

### `supabase/tests/submit_candidatura_atomic_smokes.sql` (test, CRUD+event) — CI-03 layer (c)

**Analog:** `supabase/tests/funil01_pontuar_sjt_smokes.sql` — the disposable-fixture + impersonated-JWT smoke idiom. Runs via SQL Editor / MCP `execute_sql` in the BLOCKING wave, NOT the CI runner.

**Fixture + skip-guard header** (`funil01_pontuar_sjt_smokes.sql:21-40`, `45-66`): privileged `RESET ROLE` setup discovers a REAL `candidatos` row with a `user_id`, builds disposable rows on fixed `26010001-*` UUIDs (idempotent delete-then-insert), and sets `smoke.ready='n'` + RETURN when the fixture can't be built (never a false-fail).

**Impersonation + PASS/FAIL assertion idiom** (`funil01_pontuar_sjt_smokes.sql:135-151`):
```sql
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.user'), 'role','authenticated')::text, true);
  BEGIN
    -- <exercise the RPC/behavior>
    RAISE EXCEPTION 'FUNIL-01 FAIL (…): <unexpected success>';
  EXCEPTION WHEN … THEN
    RAISE NOTICE 'PASS (…): <expected behavior>';
  END;
END $$;
```
Row-value checks run under the privileged role (`RESET ROLE`) so RLS never blinds the assertion; cleanup is ROLLBACK-free (reset claims/role, delete disposable fixture, never delete the discovered real candidato).

**Assertions this smoke must carry** (RESEARCH §4 layer c + DBMIG-02): (1) knockout sanctioned-reject → `status='rejeitado'`, `etapa='inscricao'`, `motivo_rejeicao='knockout_automatico'`, exactly ONE `historico_candidatura` row `auto_rejeitado=true, ator NULL`; (2) survivor advance → `etapa→triagem` and — post-DBMIG-02 — `auto_rejeitado=false`; (3) dedup → UNIQUE `candidato_id+vaga_id` throws → DUPLICATE. **RED until the §2 trigger fix applies** — pair with the DBMIG-02 apply in the same BLOCKING wave.

---

### `src/features/entrevista/services/entrevistaService.ts` (service, request-response) — CI-06 dedup

**Analog (canonical):** `src/lib/efErrors.ts:38` — `extractEfErrorCode(data, error) → Promise<string|undefined>`, reads `error.context.json()` FIRST then `data` (`efErrors.ts:49-67`).

**The duplicate to DELETE** (`entrevistaService.ts:662`) — inverted args, `data`-first, returns `string|null`:
```typescript
async function extractEfErrorCode(error: unknown, data: unknown): Promise<string | null> {
  const fromData = (data as { error_code?: string } | null)?.error_code
  if (typeof fromData === 'string') return fromData
  const ctx = (error as { context?: unknown }).context
  // …returns null on failure…
}
```

**The call site to fix** (`entrevistaService.ts:637`) — currently `(error, data)`, must swap to canonical `(data, error)`:
```typescript
const efCode = await extractEfErrorCode(error, data)   // ← swap to (data, error)
if (efCode === 'VALIDATION') { … }                     // === compare unaffected by null→undefined
```

**Fix recipe** (RESEARCH §5a): delete the local fn at `:662`, add `import { extractEfErrorCode } from '@/lib/efErrors'` (top block is at `entrevistaService.ts:27-28`), swap the `:637` call to `(data, error)`. Watch `noUnusedLocals` — prune any leftover import/type so no fresh TS6133 (Phase-22 pitfall inflates tsc). File-disjoint, autonomous.

---

### CI-10 / CI-15 wiring — `package.json` + `.github/workflows/ci.yml`

**Analog (package.json build):** `package.json:97` `"build": "vite build"` and the `scripts` block (`:95-111`). Add:
```json
"assert:chunks": "node scripts/assert-chunks.mjs",
"postbuild": "node scripts/assert-chunks.mjs"
```
`assert-chunks.mjs` already exists and self-exits non-zero on regression (`scripts/assert-chunks.mjs:141-149`); it reads `build/assets/*.js` (`:31`) so it MUST run after `vite build`. A `postbuild` lifecycle makes `npm run build` self-gate locally and inherits into the e2e/lighthouse build steps.

**Analog (ci.yml deno-test job = template for a new scripts step, CI-15):** `.github/workflows/ci.yml:73-81`:
```yaml
  deno-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v2
        with: { deno-version: v2.x }
      - name: Deno EF corpus (blocking, type-check on)
        run: deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions
```
Add a SEPARATE step in this same job (reuses `setup-deno`, distinct failure signal, no `--config`):
```yaml
      - name: Deno scripts test (sync-prompts)
        run: deno test --allow-env --allow-read scripts/__tests__/
```
(The target test `scripts/__tests__/sync-prompts.test.ts:25,29` imports `deno.land/std@0.224.0/assert` + dynamic-imports `../sync-prompts.ts`; the Supabase client is built only under `if (import.meta.main)` so import needs only read perms.)

**Analog (ci.yml e2e job = template for the CI-10 bundle step):** `.github/workflows/ci.yml:83-96` already runs `npm run build` (`:93-94`). Add a dedicated step AFTER build in a job that builds (new `bundle-gate` job or a step in `e2e`/`lighthouse`):
```yaml
      - run: node scripts/assert-chunks.mjs
```
Do BOTH (postbuild for build, explicit CI step for a clean signal) per CONTEXT.

**tsc baseline re-pin** (`.github/workflows/ci.yml:55-63`): the frozen `107` gate is `if [ "$COUNT" -gt 107 ]`. Re-measure with the EXACT CI command `npm run -s lint 2>&1 | grep -c "error TS"` and pin the MEASURED value (real is 104, may drop after CI-06 dedup) — never leave 107 stale, never inflate (Pitfall 2). Update the comment banner at `:19-27` when re-pinning.

---

### `supabase/config.toml` (config) — CI-13, NEW from scratch

**Analog:** none in-repo (`cat` confirms no config.toml anywhere). Shape from RESEARCH §6 (CLI 2.105.0): top-level `project_id` (bare key, ref from `supabase/.temp/project-ref`) + per-function `[functions.<name>]` blocks. `verify_jwt` derived from each EF's grep-verified deploy posture:
```toml
project_id = "<ref>"

[functions.submit-candidatura]
verify_jwt = true
import_map = "./functions/deno.json"   # couples with CI-07 §3b for the redeployed EFs
```
**12-function `verify_jwt` table** (RESEARCH §6): `false` for `analise-candidato-individual`, `cost-alerter`, `gerar-devolutiva-bigfive` (Vault Bearer self-auth — do NOT flip to `true`); `true` for `avaliar-redacao`, `avaliar-redacao-cultural`, `avaliar-transcricao-entrevista`, `comparativo-candidatos`, `consolidar-decisao-final`, `gerar-guia-entrevista`, `submit-bigfive-final`, `submit-candidatura`, `cadastrar-candidato`. Writing config.toml changes nothing live by itself (EFs already deployed with these flags) — value is drift-proofing + enabling `import_map`; live-smoke each after any redeploy (issue #4059 caveat).

---

### `supabase/migrations/20260419000000_baseline.sql` (migration, schema dump) — DBMIG-01, NEW content into 0-line file

**Analog:** none (procedural). Per RESEARCH §1c: `supabase db dump --schema public --schema-only` against PROD, subtract what the 70 non-baseline migrations create, write the remainder (Figma-Make base schema the first real migration `20260420000001` assumes pre-exists) into this file. Validate via the preview-branch catalog-diff loop (§1b) — iterate until a from-zero replay succeeds with an empty diff. NEVER run `seed.sql` in the loop (Pitfall 6). Ledger reconcile (`migration repair` / `execute_sql` so filenames == version rows) is the BLOCKING-wave close; `supabase db push --linked` = "Remote database is up to date" is the convergence acceptance signal.

## Shared Patterns

### Anti-tamper `.strict()` body schema
**Source:** `src/features/decisao/schemas/consolidacaoSchema.ts:27-32` + `supabase/functions/_shared/schemas.ts:201-232`
**Apply to:** every CI-07 shared schema + the submit-candidatura EF + all 3 migrated contract tests. The body carries only identifiers/text — NEVER a score/peso/threshold; `.strict()` rejects any injected key (RNF-07a). The contract test asserts BOTH `safeParse(validBody).success === true` AND `safeParse({...validBody, score}).success === false`.

### GUC txn-local sanction flag (`app.rejeicao_sancionada`)
**Source:** `supabase/migrations/20260709000014_submit_candidatura_flag.sql:136` (set) + `20260607000005_avancar_etapa_trigger.sql:78-82` (to be read)
**Apply to:** the DBMIG-02 trigger predicate. `set_config('app.rejeicao_sancionada','on',true)` (is_local → SET LOCAL, pooler-safe) discriminates the ONE sanctioned auto-reject from ordinary system writes. Zero new column.

### SECURITY DEFINER migration footer (no BEGIN/COMMIT, D-22)
**Source:** `supabase/migrations/20260709000014_submit_candidatura_flag.sql:38-49,184-195` and `20260607000005:51-56,103-115`
**Apply to:** the DBMIG-02 trigger migration. `CREATE OR REPLACE FUNCTION … SECURITY DEFINER SET search_path = '' AS $$ … $$;` + `COMMENT ON FUNCTION …` + `REVOKE ALL … FROM PUBLIC;`, NO outer transaction wrapper, applied via MCP `apply_migration` in the BLOCKING wave.

### Disposable-fixture SQL smoke (impersonated JWT)
**Source:** `supabase/tests/funil01_pontuar_sjt_smokes.sql:21-40,45-66,135-151`
**Apply to:** the new `submit_candidatura_atomic_smokes.sql`. Fixed-UUID disposable rows, `smoke.ready` skip-guard, `SET ROLE authenticated` + `set_config('request.jwt.claims',…)`, `RAISE NOTICE 'PASS …'` / `RAISE EXCEPTION '… FAIL …'`, ROLLBACK-free cleanup, real discovered candidato never deleted.

### Canonical EF error-code extractor
**Source:** `src/lib/efErrors.ts:38-67`
**Apply to:** `entrevistaService.ts` (CI-06). One `(data, error) → Promise<string|undefined>` helper — error-context-first read; delete every local reimplementation.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `supabase/config.toml` | config | — | No config.toml exists anywhere in-repo; created from scratch (RESEARCH §6 shape). |
| `supabase/migrations/20260419000000_baseline.sql` (fill) | migration | — | No prior schema-dump baseline; produced by `supabase db dump --schema-only` minus the 70 later migrations (procedural, not a copy target). |
| DBMIG-01 ledger reconcile | procedure | — | `migration repair` / `execute_sql` on `schema_migrations` — a BLOCKING-wave procedure, not a file with an analog. |

## Metadata

**Analog search scope:** `supabase/functions/**` (23 `*.test.ts`, EF handlers, `_shared/schemas.ts`, `deno.json`), `supabase/migrations/**`, `supabase/tests/*.sql`, `src/features/{decisao,avaliacao,entrevista}/**`, `src/lib/efErrors.ts`, `scripts/**`, `package.json`, `.github/workflows/ci.yml`
**Files scanned:** ~18 read in full/targeted + directory listings
**Pattern extraction date:** 2026-07-12
