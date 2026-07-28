# Phase 27: Integridade de Migrations & Fechamento da Rede de Testes - Research

**Researched:** 2026-07-12
**Domain:** Supabase migration/ledger integrity + cross-runtime (Deno/Node) test infrastructure + CI gate wiring
**Confidence:** HIGH on the local codebase mechanics (grep-verified); MEDIUM on Supabase `create_branch` internals and config.toml deploy-time propagation (documented caveats flagged inline).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**DBMIG-01 — Reconstrução de migrations & convergência do ledger**
- **Estratégia: Catch-up + reconcile.** Mantém os **71** migration files; preenche o baseline vazio `20260419000000_baseline.sql` (hoje 0 linhas) com um dump real do schema pré-migrations **ou** escreve catch-up files para objetos que só existem em PROD; repara o ledger para que **filenames == version rows**. (Rejeitados: squash p/ baseline único; schema declarativo.)
- **Verificação do rebuild-from-zero: Supabase preview branch via MCP (`create_branch`)** — ambiente limpo efêmero; detector de "objetos só-em-PROD" e "baseline vazio". NÃO tocar PROD na verificação; NÃO rodar o `seed.sql` quebrado (FK a `auth.users`). Ciclo create→test→(iterar catch-up)→drop.
- **Reconcile do ledger no PROD: BLOCKING · non-autonomous wave** (precedente 24-08/25-07/26-07). `execute_sql` / `migration repair` semantics para reparar os version rows dos migrations aplicados via MCP `apply_migration`. Convergência é critério de aceite — não deixar como drift cosmético.

**DBMIG-02 / CI-03 — Semântica auto_rejeitado + cobertura submit-candidatura**
- **Distinção semântica: reusar `ator IS NULL` como "escrita do sistema"**; corrigir o trigger `avancar_etapa` (`20260607000005`) para `auto_rejeitado=true` **só** na auto-rejeição sancionada, discriminando via GUC txn-local `app.rejeicao_sancionada`. **Zero coluna nova.**
- **Backfill: UPDATE one-time** corrigindo linhas históricas mismarcadas (escrita-do-sistema com `auto_rejeitado=true`) para `false`. Seguro: audit-only, **zero client reads** de `auto_rejeitado` em `src/`.
- **Cobertura CI-03:** Deno test da RPC `submit_candidatura_atomic` (knockout sancionado + survivor advance + dedup) **+** contract test do body client↔EF (Zod).

**CI-06/07/10/13/15 — Fechamento da rede de testes**
- **CI-07 (contract real): módulo `.ts` de schema compartilhado.** Importável por ambos: EF (Deno) via import-map `zod` no `deno.json`; client-test (Node/Vite) via `zod` do Node. Body do client parseia no schema **real** da EF. Precedente `consolidacaoSchema.ts`.
- **CI-07 (escopo):** `submit-candidatura` (CI-03) **+** migrar os 3 contract tests existentes (redacao, entrevista, consolidacao) do idiom replica+fs-probe para o schema compartilhado. (12 EFs completas → deferido.)
- **CI-13:** criar `supabase/config.toml` **do zero** com as **12** funções + `verify_jwt` derivado do código.

### Claude's Discretion
- **CI-06:** deletar a cópia local invertida `extractEfErrorCode(error, data)` do `entrevistaService.ts` (`:662`, call `:637`, `string|null`); importar `@/lib/efErrors` (`(data, error)`, `string|undefined`); corrigir ordem dos args + reconciliar `null`→`undefined`.
- **CI-10:** `scripts/assert-chunks.mjs` já existe mas está **unwired** — npm script (`assert:chunks`) + wire em build **e** step CI dedicado após `npm run build`.
- **CI-15:** o job `deno-test` cobre só `supabase/functions` — incluir `scripts/__tests__` (ou step separado) para rodar `sync-prompts.test.ts` (Deno).
- Ordem de waves, atomicidade de commits, nomes de arquivos/migrations a critério do planner/executor. Baseline tsc de CI re-medido/re-pinado se mudar (atual pinado 107, real 104).

### Deferred Ideas (OUT OF SCOPE)
- **Squash de migrations** p/ baseline único e **schema declarativo** (`supabase/schemas/`) — rejeitados.
- **Contract tests reais das 12 EFs** — escopo limitado a submit-candidatura + os 3 existentes.
- Pipeline de notificação / agendamento / relatórios-KPIs / banco de talentos / retenção LGPD → **M5**.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DBMIG-01 | As migrations reconstroem o banco do zero e o ledger converge — sem baseline vazio nem objetos só-em-PROD | §1 (preview-branch rebuild + catalog-diff acceptance + ledger reconcile); Runtime State Inventory (ledger drift). **Requirement says "49" — real count is 71; update at close.** |
| DBMIG-02 | Semântica de `historico_candidatura.auto_rejeitado` distingue 'escrita do sistema' de 'auto-rejeição' | §2 (trigger predicate fix via GUC `app.rejeicao_sancionada` + one-time backfill); grep-verified defect at `20260607000005:82` |
| CI-03 | `submit-candidatura` (EF + RPC de knockout) tem cobertura de teste | §4 (Deno EF handler/validation test [CI-runnable] + shared-schema body contract [CI-07] + branch SQL smoke [BLOCKING wave]) |
| CI-06 | `extractEfErrorCode` deduplicado no `@/lib/efErrors` | §5a (delete `entrevistaService.ts:662`, swap args at `:637`, `null`→`undefined`) |
| CI-07 | Contract tests client↔EF reais (body do client parseia no Zod schema da EF) | §3 (deno.json import map `zod`/`zod/v4` + shared module + config.toml `import_map` + redeploy caveat) |
| CI-10 | Gate de bundle PERF-03 (`assert-chunks.mjs`) wired em build **e** CI | §5b (npm `assert:chunks` script + `build` chain + dedicated ci.yml step) |
| CI-13 | Config `verify_jwt` por EF em `supabase/config.toml` | §6 (12-function verify_jwt table + minimal config.toml shape) |
| CI-15 | Teste de `sync-prompts` roda no CI | §5c (separate `deno test scripts/__tests__` step in the deno-test job) |
</phase_requirements>

## Summary

This is a **hardening/testing phase — no product expansion, no new npm packages**. The work splits cleanly into (a) repo-only, file-disjoint changes that land green in autonomous waves (CI-06/07-authoring/10/13/15 + DBMIG-02 trigger-file authoring + SQL-smoke authoring) and (b) a single **BLOCKING non-autonomous wave** that touches PROD: the DBMIG-01 branch-rebuild verification loop, the PROD ledger reconcile, the DBMIG-02 trigger+backfill apply, and any EF redeploys CI-07 requires.

The two genuinely uncertain mechanics are: (1) **how `create_branch` rebuilds** — it *replays the tracked migration history (the `supabase_migrations.schema_migrations` statements), not the raw local files*, which changes the detection strategy; and (2) **CI-07's cross-runtime zod** — the clean recipe is a `deno.json` import map (`zod` → `npm:zod@3.25.76`, `zod/v4` → `npm:zod@3.25.76/v4`) plus a `config.toml` `import_map` so the same bare-`zod` shared module resolves under Deno-deploy, `deno test`, and Node/Vitest — but this forces a **redeploy of the affected EFs** and must be live-smoked (bundle-freeze lesson).

**Primary recommendation:** Center DBMIG-01 acceptance on a **mechanism-independent catalog diff** (rebuild target vs live PROD schema fingerprint) rather than trusting `create_branch` internals, iterate baseline/catch-up files until the diff is empty, then reconcile the ledger last. Scope CI-07 tightly (submit-candidatura + the 3 named tests), stage EF redeploys into the BLOCKING wave, and re-pin the tsc baseline to the **measured** value (104, possibly lower after CI-06) — never inflate it.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Migration file authoring (baseline, catch-up) | Database / Storage | — | DDL is DB-tier; files live in `supabase/migrations/` |
| Ledger reconcile (`schema_migrations` version rows) | Database / Storage | — | `supabase_migrations` is server-side state; touched via `migration repair` / `execute_sql` |
| `auto_rejeitado` semantics (trigger + backfill) | Database / Storage | — | PL/pgSQL trigger + one UPDATE; zero client reads |
| submit-candidatura EF request handling test | API / Backend (Deno EF) | — | EF validates body + shapes the RPC call; unit-testable in Deno |
| submit_candidatura_atomic RPC behavior (knockout/survivor/dedup) | Database / Storage | — | PL/pgSQL; needs a live DB → branch/PROD smoke, NOT the CI runner |
| Cross-runtime Zod contract schema | API / Backend (shared) | Browser/Client (test) | One module imported by EF (Deno) + client test (Node) |
| `extractEfErrorCode` dedup | Browser/Client | — | Pure client util in `src/lib/` |
| Bundle gate (`assert-chunks.mjs`) | CDN / Static (build output) | CI | Reads `build/assets/*.js`; wired into build + CI |
| `verify_jwt` declaration (config.toml) | API / Backend (deploy config) | — | Deploy-posture-as-code for the 12 EFs |
| sync-prompts test in CI | CI | — | Deno test over `scripts/` |

## Standard Stack

**No new packages are installed in this phase.** All tooling already present and version-verified in the repo:

| Tool | Version (verified) | Purpose | Source |
|------|--------------------|---------|--------|
| Supabase CLI | 2.105.0 | migration repair, db push, functions deploy, branching | `supabase --version` [VERIFIED: local] |
| Deno | 2.x (setup-deno@v2 in CI) | EF + scripts test runtime | `.github/workflows/ci.yml` [VERIFIED: grep] |
| zod (client) | 3.25.76 (installed; `^3.22.4` in package.json) | shared contract schemas | `node_modules/zod/package.json` [VERIFIED: node -e] |
| zod (EF/Deno) | `npm:zod@3.25.76` (+ `/v4` subpath) | EF body schemas | `supabase/functions/deno.lock:7` [VERIFIED: grep] |
| Vitest | ^4.1.9 | client contract + unit tests | `package.json` [VERIFIED: read] |

**zod cross-runtime faithfulness (load-bearing for CI-07):** client `node_modules/zod` is **3.25.76** — byte-identical major/minor to the EF's `npm:zod@3.25.76`. The installed package exports BOTH the v3 API (`.` / `./v3`) and the v4 API (`./v4`) — `node -e` confirmed `exports` keys include `"./v4"`. So a shared module using either `import { z } from 'zod'` (v3 API) or `import { z } from 'zod/v4'` (v4 API) validates identically on both sides. [VERIFIED: node -e exports probe]

## Package Legitimacy Audit

**N/A — this phase installs zero external packages.** All dependencies (`zod`, Deno std, `@supabase/supabase-js`) are already present, version-pinned, and in active use. No slopcheck gate required.

## Runtime State Inventory

> DBMIG-01/02 are migration + data-migration work → runtime state beyond files IS in scope.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `historico_candidatura` rows written by the `avancar_etapa` trigger with `auto_rejeitado=true` on **survivor advances** (system writes, `ator IS NULL`, `etapa_para <> 'rejeitado'`) — mismarked per DBMIG-02. | **One-time backfill UPDATE** (data migration): `SET auto_rejeitado=false WHERE auto_rejeitado=true AND etapa_para <> 'rejeitado'`. Separate task from the trigger code fix. Safe — zero client reads of the column (grep `src/` = 0). |
| **Live service config (ledger)** | `supabase_migrations.schema_migrations` on PROD: version rows written by MCP `apply_migration` (Phases 24/25/26 = at least the 20260706110001-08, 20260709000001-14, 20260712100001-04 blocks) — these carry inline `statements` but their **version values may not correspond 1:1 to local filenames** (Phase 11 precedent: "apply_migration grava timestamp-version não filename → db push 'migration versions not found'"). Also objects possibly created via bare `execute_sql`/dashboard (Figma-Make base schema) that have **no** version row at all. | **Ledger reconcile (BLOCKING wave):** `migration repair --status applied/reverted` and/or `execute_sql` on `schema_migrations` so `filenames == version rows`. Convergence is an acceptance criterion. |
| **OS-registered state** | None — no cron/scheduler/OS registration embeds migration identifiers. `pg_cron` jobs exist (prompt_library_cron, cost guardrail) but reference function names, not migration versions. | None — verified by scope (migration versions are DB-internal). |
| **Secrets/env vars** | None renamed. Vault secrets (`n8n_webhook_base`, `edge_invoke_key`, AI keys) are unaffected by baseline/ledger work. | None. |
| **Build artifacts / empty baseline** | `20260419000000_baseline.sql` = **0 bytes** [VERIFIED: `wc -l`]. The Figma-Make-era base schema (candidatos, vagas, usuarios_rh, candidaturas, respostas_formulario, perguntas_formulario, enums, `historico_acoes`, storage buckets) is assumed-pre-existing by the first real migration `20260420000001` but is created by **no** migration file. | **Author the baseline** = a schema-only dump of the objects the migrations reference but never create (see §1). Without this, a from-zero replay fails at the first `relation ... does not exist`. |

## §1 — DBMIG-01: Preview-branch rebuild + ledger convergence (HOW)

### 1a. What `create_branch` actually does (MEDIUM confidence)

The Supabase MCP `create_branch` **clones the production branch's *migration history* and replays all tracked migrations in version order on a fresh branch database** (`applyMigrations()` — sequential, fail-fast on first error, no rollback). [CITED: deepwiki.com/supabase-community/supabase-mcp — Branching Tools]. It is a **billable** operation requiring cost confirmation.

**Critical implication for drift detection:** `create_branch` replays what is *tracked in `schema_migrations`* (the stored `statements`), **not the raw `supabase/migrations/*.sql` files by filename**. Consequences:
- Objects created via MCP `apply_migration` → have a `statements` row → **reproduced** on the branch (even if their version drifted from the filename).
- Objects created via bare `execute_sql` or the dashboard (Figma-Make base) → **no** `statements` row → **NOT reproduced** → the replay of the first dependent migration **fails** with `relation/type does not exist`. That failure is itself the detector for "objetos só-em-PROD / baseline vazio."

Because of this, **do not trust `create_branch` alone as the from-zero-*files* test** — it can reproduce PROD's tracked history (drift and all) rather than prove the 71 files are self-sufficient. Use the mechanism-independent acceptance below.

### 1b. Recommended acceptance: mechanism-independent catalog diff (HIGH confidence)

1. **Fingerprint PROD** — capture the authoritative schema via catalog queries (works via `execute_sql` or `supabase db dump --schema public`):
   ```sql
   -- tables + columns
   SELECT table_name, column_name, data_type, is_nullable
     FROM information_schema.columns WHERE table_schema='public' ORDER BY 1,2;
   -- enums + values
   SELECT t.typname, e.enumlabel, e.enumsortorder
     FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
     JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY 1,3;
   -- functions / triggers / policies / indexes
   SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc
     WHERE pronamespace='public'::regnamespace ORDER BY 1;
   SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE NOT tgisinternal ORDER BY 2,1;
   SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public' ORDER BY 2,3;
   SELECT indexname FROM pg_indexes WHERE schemaname='public' ORDER BY 1;
   ```
2. **Rebuild the 71 files into a clean target** (preview branch — the locked path). To force a *files* replay rather than a history clone, the reliable primitive is: `create_branch` → then push the **local files** to the branch (`supabase db push` targeting the branch, or `reset_branch` to an empty version then push). Confirm empirically which primitive gives a true empty→files replay (see Open Questions).
3. **Fingerprint the rebuild** identically and **diff**:
   - *In PROD, absent in rebuild* → untracked/only-in-PROD → author a **catch-up migration file** (or add to the **baseline** if it is base schema).
   - *In rebuild, absent in PROD* → a file creates something never applied to PROD → apply it to PROD or reconcile.
4. **Iterate** (create→test→add catch-up/baseline→drop→repeat) until the diff is **empty**. Empty diff = "the 71 files reconstruct the DB from zero" ✓.

### 1c. Authoring the empty baseline (HIGH confidence on approach)

The baseline must contain everything the first migration (`20260420000001_rls_anon_to_rpc.sql`) and its successors *assume pre-exists*. Practical authoring:
- `supabase db dump --schema public --schema-only` (or `pg_dump --schema-only --schema=public`) against PROD to get all object definitions.
- Subtract what the 70 non-baseline migrations create → the remainder is the base schema → write to `20260419000000_baseline.sql`.
- Validate by the iterate loop in 1b: replay `baseline + 20260420…latest` from empty; each `relation X does not exist` / `type Y does not exist` names an object still missing from the baseline. Add it. Repeat until a clean from-zero replay succeeds.
- **Do NOT run `seed.sql`** during this loop (its placeholder UUIDs FK to `auth.users` and break `db reset`). If a local `db reset` path is ever needed, temporarily point `db reset` away from seed or fix the seed — out of scope here.

### 1d. Ledger reconcile mechanics (BLOCKING PROD wave)

- `supabase migration list --linked` shows local-file versions vs remote `schema_migrations` versions side by side (the drift map). *(Needs the DB password; run it interactively in the BLOCKING wave — it was not run during research to avoid a password prompt.)*
- `supabase migration repair --status applied <version>` → **inserts** a `schema_migrations` version row **without running SQL** (use when the SQL is already live but the version isn't recorded / needs a matching filename version).
- `supabase migration repair --status reverted <version>` → **deletes** a version row (use to remove a spurious timestamp-only row so the real filename-versioned file can be `db push`ed).
- Goal state: `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version` equals the set of 71 filename timestamps exactly. Then `supabase db push --linked` must report **"Remote database is up to date"** (the convergence acceptance signal — CLAUDE.md D-22 step 3).
- Prefer the **non-destructive** alignment per row (repair-applied to add a missing filename version, or rename a local file to match an existing version row) over dropping/re-pushing, to avoid re-running live DDL.

### 1e. Risks (flag for planner)
- **Branch cost/plan:** branching requires **Pro plan or above** (Free excludes it); a Micro-compute branch bills **$0.01344/hr (~$9.70/mo if left running)** and Compute Credits do **not** offset it. [CITED: supabase.com/docs/guides/platform/manage-your-usage/branching]. Mitigation: `create→verify→drop` promptly; never leave the branch running.
- **`create_branch` replays history, not files** (§1a) — the catalog-diff acceptance (1b) is the guard against a false "rebuild passed."
- **No rollback in `applyMigrations()`** — a mid-replay failure leaves a partial branch; drop and recreate.

## §2 — DBMIG-02: `auto_rejeitado` semantics fix (HOW)

### 2a. The defect (grep-verified)
`avancar_etapa()` (`20260607000005_avancar_etapa_trigger.sql:82`) writes the audit row with:
```sql
VALUES (NEW.id, OLD.etapa_atual, NEW.etapa_atual, NEW.etapa_justificativa,
        v_ator, (v_ator IS NULL), now());   -- ← auto_rejeitado = (v_ator IS NULL)
```
`v_ator = auth.uid()` is NULL for service_role/system writes. The **survivor advance** in `submit_candidatura_atomic` (`20260709000014:165-168`) runs under service_role and drives `etapa inscricao→triagem` → the trigger fires with `v_ator IS NULL` → the advance row is written `auto_rejeitado=true`, **even though it is an advance, not a rejection**. That conflation is the DBMIG-02 defect. [VERIFIED: read of both migrations]

### 2b. The fix (CONTEXT-locked: reuse `ator IS NULL` + GUC discriminator, zero new column)
Change the trigger predicate so `auto_rejeitado=true` requires **both** "system write" **and** "sanctioned auto-rejection". The txn-local GUC `app.rejeicao_sancionada` already exists (set by `submit_candidatura_atomic` at `:136`; read by `guard_rejeicao_auditada` at `20260709000010:65` via `current_setting('app.rejeicao_sancionada', true)`). Recommended predicate:
```sql
-- system write AND sanctioned auto-reject AND actually landing on 'rejeitado'
(v_ator IS NULL
 AND current_setting('app.rejeicao_sancionada', true) IS NOT DISTINCT FROM 'on'
 AND NEW.etapa_atual = 'rejeitado')
```
- Survivor advance: GUC unset + `etapa_para='triagem'` → **false** ✓ (defect fixed).
- Any future sanctioned auto-reject routed *through* the trigger → GUC on + terminal → **true** ✓.
- The **knockout path writes its own explicit history row** (`20260709000014:146-150`, `auto_rejeitado=true, ator NULL`, GUC set) — it does **not** go through the trigger (etapa unchanged → `IS NOT DISTINCT FROM` guard skips). Leave that explicit `true` as-is; it is a genuine sanctioned auto-reject. *(Planner: decide whether to also gate that explicit INSERT's literal on the same predicate for symmetry, or leave the literal — it is already correct.)*

### 2c. Backfill (one-time data migration — separate task)
```sql
UPDATE public.historico_candidatura
   SET auto_rejeitado = false
 WHERE auto_rejeitado = true
   AND etapa_para <> 'rejeitado';   -- system advances mismarked as rejections
```
Genuine terminal-rejection rows (`etapa_para='rejeitado'`) keep `true`. Safe: audit-only table, zero client reads. Both the **code fix** (CREATE OR REPLACE trigger) and the **data fix** (UPDATE) must appear as distinct tasks (a code change does not retro-correct existing rows).

### 2d. Apply posture
The trigger is `CREATE FUNCTION + DO $$ + COMMENT` PL/pgSQL → the D-22 42601 pooler trap applies → apply via **MCP `apply_migration`** in the BLOCKING wave (precedent: every Phase 24/25/26 PL/pgSQL migration). `apply_migration` records its own version row — factor this into the §1 ledger reconcile so it does not add fresh drift.

## §3 — CI-07: one Zod schema importable by both Deno (EF) and Node (Vitest)

### 3a. Why the current "precedent" is a half-measure (answers the CONTEXT cross-check)
`consolidacaoSchema.ts` (`src/features/decisao/schemas/`) was **not** actually shared across runtimes:
- The consolidar EF **re-declares** the shape with its own `import { z } from "npm:zod@3.25.76/v4"` and even loosens it (`candidatura_id: z.string()` vs the src file's `z.string().uuid()`) — [VERIFIED: `consolidar-decisao-final/index.ts:87-89`].
- The contract test (`consolidacaoContract.test.ts`) still uses a **Node-local replica + `node:fs` source-text probe**, because a live `import` of the EF schema fails Vitest resolution (Deno `npm:`/`esm.sh` specifiers). Same idiom in `redacao-contract.test.ts` and `entrevista-contract.test.ts`.

So the drift the pattern was meant to kill can still happen (the EF and the src file diverged). CI-07's job is to make **one module the EF imports AND the client test imports**, with a **real `.safeParse`** (no replica, no fs-probe).

### 3b. The clean recipe (MEDIUM confidence — verify deploy propagation)

**Step 1 — `deno.json` import map.** Current `supabase/functions/deno.json` = `{"exclude": [...]}` only [VERIFIED: read]. Add an `imports` map so bare `zod`/`zod/v4` resolve under Deno:
```jsonc
{
  "imports": {
    "zod": "npm:zod@3.25.76",
    "zod/v4": "npm:zod@3.25.76/v4"
  },
  "exclude": ["_shared/__tests__/strict-schema.test.ts"]
}
```
(`npm:zod@3.25.76/v4` subpath resolution is already proven — multiple EFs import it today and pass `deno test` in CI.)

**Step 2 — shared body-schema modules use bare specifiers.** Rewrite the request-body schema files' zod import from the Deno-only specifier to the bare one so Node/Vitest can also import them:
- `_shared/schemas.ts` (`submitCandidaturaSchema`): `https://esm.sh/zod@3` → `import { z } from 'zod'` (v3 API).
- `_shared/redacao-schemas.ts` (`AvaliarRedacaoCulturalBodySchema`): `npm:zod@3.25.76` → `import { z } from 'zod'`.
- `_shared/entrevista-schemas.ts` (`GerarGuiaBodySchema`, `AvaliarTranscricaoBodySchema`): `npm:zod@3.25.76` → `import { z } from 'zod'`.
- consolidar body (`/v4`): `npm:zod@3.25.76/v4` → `import { z } from 'zod/v4'`.

**Step 3 — client contract tests import the real schema + live parse.** Replace the Node replica + fs-probe with:
```ts
import { submitCandidaturaSchema } from '../../../../supabase/functions/_shared/schemas'
// real parse: the exact client body must succeed; an injected extra key / score must fail (.strict())
expect(submitCandidaturaSchema.safeParse(buildClientBody()).success).toBe(true)
expect(submitCandidaturaSchema.safeParse({ ...buildClientBody(), score: 9 }).success).toBe(false)
```
Node resolves bare `zod` from `node_modules` (3.25.76 — identical to the EF). No `@/` aliases in the shared files → tsc pulls only `schema.ts → zod` into the program → clean, no baseline inflation.

**Step 4 — make it deploy-safe via config.toml (couples with CI-13).** `supabase functions deploy` (CLI v2 "config as code") reads `config.toml`. Set each affected function's `import_map` to the shared `deno.json` so bare `zod` resolves at **deploy** time, not only under `deno test`:
```toml
[functions.submit-candidatura]
verify_jwt = true
import_map = "./functions/deno.json"
```

### 3c. Operational cost + caveats (flag prominently)
- **Redeploy required.** Rewriting an EF's zod import (or having it import a bare-`zod` shared module) only takes effect after `supabase functions deploy <name>`. The affected EFs — **submit-candidatura, avaliar-redacao-cultural, avaliar-transcricao-entrevista/gerar-guia-entrevista, consolidar-decisao-final** — must be redeployed in the **BLOCKING wave** and **live-smoked** (bundle-freeze lesson: `_shared` edits only take effect for the EFs you actually redeploy). Cheaper alternative if redeploy proves fragile: keep the EF's `npm:zod` import and have the EF `import` the shared module *by relative path* while the shared module uses bare `zod` — but the EF bundle still needs the import map at deploy, so the redeploy cost is unavoidable for any EF whose import graph reaches the shared bare-`zod` module.
- **Known CLI caveat:** GitHub issues #4059 / #41693 report `config.toml verify_jwt`/settings occasionally **ignored on function update** and locally. Treat config.toml as declared intent; **verify the live posture after deploy** (curl no-auth → expect 401 for verify_jwt=true; 200/handled for the Bearer-self-auth ones).
- **`strict-schema.test.ts` interaction:** this Vitest probe currently reads `_shared/schemas.ts` as **text** (it can't `import` it because of `https://esm.sh/zod@3`). After Step 2 changes that import to bare `zod`, the probe *could* be upgraded to a live `.safeParse`, but at minimum ensure the existing source-text assertions (grep for `.strict()`) still pass — they are import-specifier-agnostic, so a plain specifier swap keeps them green. [VERIFIED: read of strict-schema.test.ts]
- **Scope discipline:** migrate exactly the 3 named tests (redacao, entrevista, consolidacao) + add submit-candidatura. Do NOT touch the other EF schemas' imports (avoids gratuitous redeploys).

## §4 — CI-03: testing `submit_candidatura_atomic` + the EF

pgTAP is **not** set up (grep found no pgTAP/pg_prove/`supabase test db` anywhere). The existing DB-behavior idiom is **plain psql smoke files** under `supabase/tests/*.sql` (8 already exist: `funil01_pontuar_sjt_smokes.sql`, `sec05_08_smokes.sql`, etc.) run **manually against a live DB**, never in the GitHub CI runner. [VERIFIED: `ls supabase/tests/`]. CI has **no live DB** (Tier-1 mocks everything).

**Recommended three-layer strategy:**

| Layer | What it tests | Runnable where | Plan-ready |
|-------|---------------|----------------|-----------|
| (a) Deno EF unit test | `submit-candidatura/index.ts` request handling: 401 on missing/invalid Authorization; body `.strict()` validation (via the shared schema, §3); the shape of the RPC call (`submit_candidatura_atomic` args) via an **injected mock** supabase client; error mapping (DUPLICATE_CANDIDATURA, VALIDATION) | **CI now** (deno-test job) | ✅ — no live DB; mirrors the existing EF test corpus |
| (b) Shared-schema body contract | client body ↔ EF `.strict()` schema (CI-07 overlap) — the anti-tamper `.strict()` reject | **CI now** (Vitest) | ✅ |
| (c) SQL smoke of the RPC | knockout **sanctioned-reject** (`status='rejeitado'`, `etapa='inscricao'`, `motivo='knockout_automatico'`, exactly **one** `historico_candidatura` row `auto_rejeitado=true, ator NULL`); **survivor advance** (`etapa→triagem`, guard does NOT fire, and — post-DBMIG-02 — `auto_rejeitado=false`); **dedup** (unique `candidato_id+vaga_id` → throws → DUPLICATE) | **Branch/PROD** (BLOCKING wave) — **NOT** the CI runner | ✅ authoring; runs in BLOCKING wave |

- Layer (c) is authored as `supabase/tests/submit_candidatura_atomic_smokes.sql` following the disposable-fixture idiom (impersonated JWT via `set_config('request.jwt.claims', …)`, a throwaway candidato, cleanup) already used by `funil01_pontuar_sjt_smokes.sql`. It is **RED until the DBMIG-02 trigger fix is applied** (survivor `auto_rejeitado=false` assertion) — pair it with the §2 apply in the same BLOCKING wave.
- This same smoke file is the natural home for the **DBMIG-02** assertions (survivor advance now `false`; knockout still `true`).
- The `submit-candidatura` EF currently has **zero** test coverage [VERIFIED: CONTEXT + grep] — layer (a) closes CI-03's CI-runnable half; layer (c) closes the RPC-behavior half.

## §5 — CI-06 / CI-10 / CI-15 wiring (Claude's Discretion)

### 5a. CI-06 — dedup `extractEfErrorCode`
- Shared canonical: `src/lib/efErrors.ts:38` `extractEfErrorCode(data, error) → Promise<string|undefined>` (reads `error.context.json()` first, then `data`) [VERIFIED: read].
- Duplicate: `src/features/entrevista/services/entrevistaService.ts:662` `extractEfErrorCode(error, data) → Promise<string|null>` — **inverted args**, `data`-first, returns `null`. Called at `:637` as `extractEfErrorCode(error, data)`.
- Fix: delete the local copy (`:662`), add `import { extractEfErrorCode } from '@/lib/efErrors'`, change the call site `:637` from `(error, data)` → **`(data, error)`**, and reconcile the `=== 'VALIDATION'` branch (shared returns `undefined`, not `null` — the `=== 'VALIDATION'` compare is unaffected). File-disjoint, autonomous. Watch `noUnusedLocals`: if removing the local fn leaves an unused import/type, prune it (Pitfall from Phase 22 — a leftover unused local inflates tsc).

### 5b. CI-10 — wire `assert-chunks.mjs`
`scripts/assert-chunks.mjs` exists (4 PERF-03 assertions, reads `build/assets/*.js`, exits non-zero on regression) but is **unwired** — no npm script, no CI step [VERIFIED: read + grep]. Recommended:
- **package.json:** add `"assert:chunks": "node scripts/assert-chunks.mjs"`. Chain after build via a `postbuild` hook OR an explicit compound: `"build": "vite build && node scripts/assert-chunks.mjs"`. Prefer an explicit **`postbuild` npm lifecycle** (`"postbuild": "node scripts/assert-chunks.mjs"`) so `npm run build` self-gates locally AND the existing CI `e2e`/`lighthouse` build steps inherit it — but note that makes **every** `npm run build` fail on a bundle regression (desired). If that is too aggressive for the e2e/lighthouse jobs, instead keep build clean and add a **dedicated CI step** after build.
- **ci.yml:** add a dedicated step in a job that already runs `npm run build` (e.g. a new `bundle-gate` job, or a step in `e2e`/`lighthouse` after `npm run build`): `- run: node scripts/assert-chunks.mjs`. CONTEXT wants it wired in **build AND CI** → do both (postbuild for build, explicit step for a clean CI signal). The assertion's `BASELINE_INDEX_BYTES`/`PRESPLIT_CHUNK_FLOOR` are already tuned from Phase 19 — do not retune unless the split changes.

### 5c. CI-15 — run `sync-prompts.test.ts` in CI
- The test (`scripts/__tests__/sync-prompts.test.ts`, 7 cases) imports `https://deno.land/std@0.224.0/assert` and dynamically imports `../sync-prompts.ts` (which imports `npm:zod@3.25.76` + `npm:@supabase/supabase-js@2`). The Supabase client is constructed **only under `if (import.meta.main)`** (`sync-prompts.ts:287`) → **importing the module builds no client** → runtime needs only `--allow-read` (module fetch of the npm/std graph is default-allowed; no `--allow-net` at runtime). [VERIFIED: grep `import.meta.main`].
- The existing `deno-test` job runs `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` — its `--config` points at the **functions** deno.json (whose `exclude` is functions-scoped) and its target path is `supabase/functions`. Mixing `scripts/__tests__` into that exact command is fragile (config scoping + a different target root).
- **Recommendation:** add a **separate step in the same `deno-test` job** (reuses `setup-deno`):
  ```yaml
  - name: Deno scripts test (sync-prompts)
    run: deno test --allow-env --allow-read scripts/__tests__/
  ```
  No `--config` (scripts don't need the functions exclude), `--allow-env --allow-read` (superset of the header's `--allow-read`, harmless). A separate step (not a separate job) keeps CI minutes low and gives a distinct failure signal.

## §6 — CI-13: `supabase/config.toml` verify_jwt

**No config.toml exists anywhere** [VERIFIED: `cat` returns "NO config.toml"]. Create from scratch. Shape (current CLI 2.105.0):
- Top-level **`project_id`** is required (a bare top-level key, not under a `[project]` section). Get the ref from `supabase/.temp/project-ref`.
- Per-function `[functions.<name>]` with `verify_jwt` (default `true`), optionally `import_map` (§3b) and `enabled`. `--no-verify-jwt` / `--import-map` CLI flags override. [CITED: supabase.com/docs/guides/local-development/cli/config + functions/function-configuration]

**Per-function `verify_jwt` (derived from each EF's live deploy posture — grep-verified headers):**

| EF | Auth posture (evidence) | `verify_jwt` |
|----|-------------------------|:---:|
| `analise-candidato-individual` | `--no-verify-jwt`; Vault Bearer self-auth (header L8-10, L32) | **false** |
| `cost-alerter` | `--no-verify-jwt`; Vault Bearer self-auth, cron (header L12, L33) | **false** |
| `gerar-devolutiva-bigfive` | SEC-04 Bearer self-auth guard, server-to-server only (L570-587) | **false** |
| `avaliar-redacao` | "JWT-ON; SEM --no-verify-jwt" (L30); `getUser()` | **true** |
| `avaliar-redacao-cultural` | "JWT-ON" (L35); `getUser()` | **true** |
| `avaliar-transcricao-entrevista` | "JWT-ON" (L34); `getUser()` | **true** |
| `comparativo-candidatos` | "JWT-ON; SEM --no-verify-jwt" (L30-31); `getUser()` | **true** |
| `consolidar-decisao-final` | "JWT-ON; SEM --no-verify-jwt" (L36-37); `getUser()` | **true** |
| `gerar-guia-entrevista` | "JWT-ON; RH-invoked" (L35); `getUser()` | **true** |
| `submit-bigfive-final` | "JWT-ON; candidate-invoked" (L29); `getUser()` | **true** |
| `submit-candidatura` | "JWT verification ON; do NOT pass --no-verify-jwt" (L20); `getUser()` | **true** |
| `cadastrar-candidato` | Public signup; no Bearer guard, no `getUser()`; invoked with anon key (a valid JWT satisfies the gate) | **true** (default; MEDIUM — no explicit deploy note) |

Minimal valid file is just `project_id` + `[functions.*]` blocks; all other sections default. Note the three `false` functions are the **security-load-bearing** ones (they self-authenticate a Vault Bearer) — a wrong `true` there would break the server-to-server invocation; a wrong `false` on any of the nine `true` functions would open an auth hole. Cross-check `verify_jwt=false` against SEC-04 (Phase 24) before finalizing.

**Caveat:** because CI-13 declares deploy posture as code but the EFs are **already deployed** with these flags, writing config.toml changes nothing live by itself — its value is (1) drift-proofing future deploys, (2) enabling §3b's `import_map` wiring. If any config.toml `verify_jwt` is later found to differ from the live posture, that is a real drift to reconcile (and issue #4059 means a redeploy may be needed to make config.toml authoritative).

## Common Pitfalls

### Pitfall 1: Trusting `create_branch` as a from-zero *files* test
`create_branch` replays the tracked `schema_migrations` **statements**, not the local files — it can reproduce PROD's drift and pass a rebuild that the raw files could not. **Avoid:** center acceptance on the catalog-diff (§1b), not on "the branch came up."

### Pitfall 2: tsc baseline inflation
Frozen baseline in `ci.yml` is **107**; the **real** measured value is **104** [VERIFIED: STATE 26-05/06]. CI-06's dedup may lower it further. **Avoid:** re-measure with the exact CI command (`npm run -s lint 2>&1 | grep -c "error TS"`) and pin the **measured** number; never pin an estimate or leave 107 stale. A leftover unused local/import after the dedup is a fresh TS6133 (Phase 22 Pitfall).

### Pitfall 3: EF redeploy bundle-freeze for CI-07
Editing `_shared/*` only affects EFs you actually **redeploy**. **Avoid:** enumerate the exact EFs whose contract test migrates (submit-candidatura + redacao-cultural + entrevista pair + consolidar), redeploy each, and live-smoke; don't assume a `_shared` edit propagates.

### Pitfall 4: Backfill vs code-fix conflation (DBMIG-02)
The trigger `CREATE OR REPLACE` does not retro-correct existing mismarked rows. **Avoid:** ship the code fix and the one-time `UPDATE` as **two** tasks.

### Pitfall 5: Ledger reconcile adds fresh drift
Applying the DBMIG-02 trigger via MCP `apply_migration` writes another version row. **Avoid:** sequence the apply **before** the final ledger-convergence check, and include its version in the reconcile.

### Pitfall 6: `seed.sql` in the rebuild loop
`seed.sql` (139 lines) breaks `db reset` via placeholder-UUID FKs to `auth.users`. **Avoid:** never run seed during branch/rebuild verification (CONTEXT-locked).

### Pitfall 7: "49 migrations" stale count
REQUIREMENTS.md:63 + ROADMAP say "49"; the real count is **71** [VERIFIED: `ls | wc -l`]. **Avoid:** update the count in REQUIREMENTS/ROADMAP/STATE at phase close (a documentation task).

### Pitfall 8: RNF-07a invariant
The knockout in `submit_candidatura_atomic` is the **only** sanctioned auto-reject. The DBMIG-02 predicate change must not create a second auto-reject path, and no test may assert a score-driven auto-reject. **Avoid:** keep the terminal-only + GUC-gated predicate; the guard `guard_rejeicao_auditada` remains the backstop.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Client framework | Vitest ^4.1.9 (`npm run test:run`) |
| EF/scripts framework | Deno 2.x (`deno test`) |
| tsc gate | `npm run -s lint` (frozen baseline 107, real 104 — re-pin measured) |
| DB behavior | plain psql smokes under `supabase/tests/*.sql` (manual/branch, NOT CI runner) |
| Quick run | `npm run test:run` · `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CI-03 | submit-candidatura EF: 401 no-auth, `.strict()` body reject, RPC call shape, error mapping | Deno unit (mock client) | `deno test … supabase/functions/submit-candidatura` | ❌ Wave 0 |
| CI-03/07 | client body ↔ real EF `.strict()` schema, anti-tamper reject | Vitest contract (real `.safeParse`) | `npm run test:run -- submit-candidatura` | ❌ Wave 0 |
| CI-03 | knockout sanctioned-reject + survivor advance + dedup | psql smoke (branch/PROD) | `psql < supabase/tests/submit_candidatura_atomic_smokes.sql` | ❌ Wave 0 (RED until §2 apply) |
| DBMIG-02 | survivor advance now `auto_rejeitado=false`; knockout still `true` | psql smoke (branch/PROD) | same smoke file | ❌ Wave 0 |
| DBMIG-01 | rebuild-from-zero: catalog diff (rebuild vs PROD) empty; `db push` "up to date" | manual (BLOCKING wave) | catalog queries §1b + `supabase db push --linked` | ❌ (procedure) |
| CI-06 | entrevistaService uses shared `extractEfErrorCode`; no local dup | Vitest (existing efErrors + entrevista suites) | `npm run test:run` | ✅ (regression) |
| CI-07 | redacao/entrevista/consolidacao contract tests do real `.safeParse` against shared schema | Vitest | `npm run test:run -- contract` | ✅ migrate 3 |
| CI-10 | bundle regression fails build + CI | node script | `node scripts/assert-chunks.mjs` (postbuild + CI step) | ✅ exists, wire |
| CI-13 | 12-function verify_jwt declared | (declarative) | file presence + shape lint | ❌ create |
| CI-15 | sync-prompts test runs in CI | Deno | `deno test --allow-env --allow-read scripts/__tests__/` | ✅ exists, wire |

### Sampling Rate
- **Per task commit:** `npm run test:run` (Vitest) + `npm run -s lint` (tsc gate).
- **Per wave merge:** full Vitest + `deno test` corpus + (once scripts step lands) `deno test scripts/__tests__/`.
- **Phase gate (BLOCKING wave):** branch catalog-diff empty · `supabase db push --linked` = "up to date" · submit_candidatura + DBMIG-02 smokes green on PROD · affected EFs redeployed + live-smoked · full Vitest/Deno/tsc green.

### Wave 0 Gaps
- [ ] `supabase/functions/submit-candidatura/*.test.ts` — Deno EF handler/validation test (CI-03)
- [ ] client contract test importing the real shared `submitCandidaturaSchema` (CI-03/07)
- [ ] `supabase/tests/submit_candidatura_atomic_smokes.sql` — knockout/survivor/dedup + DBMIG-02 (RED until §2 apply)
- [ ] `supabase/functions/deno.json` `imports` map (`zod`, `zod/v4`) — CI-07
- [ ] `supabase/config.toml` — CI-13 (+ `import_map` per §3b)
- [ ] `package.json` `assert:chunks`/`postbuild` + `ci.yml` bundle step — CI-10
- [ ] `ci.yml` deno scripts step — CI-15

## Security Domain

> `security_enforcement` not explicitly false → included. This phase is hardening; the security surface is the `verify_jwt` declaration + not weakening existing controls.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `verify_jwt` per-EF (CI-13) must match live posture; the 3 `false` EFs rely on Vault Bearer self-auth (SEC-04) — do not flip to `true` (breaks server-to-server) or leave a real EF `false` (auth hole) |
| V4 Access Control | yes | RNF-07a: no new auto-reject path (DBMIG-02); `guard_rejeicao_auditada` backstop preserved |
| V5 Input Validation | yes | shared `.strict()` body schemas reject unknown keys / injected scores (CI-07 anti-tamper) |
| V6 Cryptography | no | none introduced |
| V14 Config | yes | config.toml declares deploy posture as code; service_role key never VITE_-prefixed (unchanged) |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Wrong `verify_jwt` opens/breaks an EF | Elevation / DoS | Derive from grep-verified deploy headers (§6); live-smoke each after config.toml lands |
| Anti-tamper bypass (client injects `score`) | Tampering | `.strict()` on the shared body schema, real `.safeParse` in the contract test |
| Ledger reconcile runs unintended DDL on PROD | Tampering | Prefer non-destructive `migration repair` (version-row only) over drop/re-push; BLOCKING human-gated wave |

## State of the Art
| Old Approach | Current Approach | When | Impact |
|--------------|------------------|------|--------|
| Contract test = Node replica + `node:fs` source-text probe | One shared `.ts` schema, real `.safeParse` on both runtimes via import map | This phase (CI-07) | Kills the drift the replica idiom couldn't catch |
| EF flags set only at deploy time (`--no-verify-jwt`) | Deploy posture as code in `config.toml` (CLI v2) | CLI v2 config-as-code | verify_jwt/import_map declared + versioned (CI-13) |
| Migrations applied ad-hoc via MCP `apply_migration` (timestamp version rows) | Ledger reconciled so filenames == version rows; `db push` "up to date" | This phase (DBMIG-01) | Unblocks reproducible rebuild + future `db push` |

## Assumptions Log
| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `create_branch` replays tracked `schema_migrations` statements (not local files) | §1a | If it actually pulls repo files (GitHub-integration mode), the branch IS a true files test and the catalog-diff is still valid but the "iterate baseline" loop mechanics simplify. MEDIUM confidence; catalog-diff acceptance is robust either way. |
| A2 | `config.toml` `import_map` propagates to `supabase functions deploy` (CLI v2) | §3b/§6 | If ignored (issue #4059-class), bare `zod` fails at EF runtime → 500. Verify with ONE EF redeploy before migrating all. |
| A3 | `cadastrar-candidato` verify_jwt=true (default) is correct for anon signup | §6 | If it needs `false`, anon signup could 401. Confirm by checking how the client invokes it (anon key present?). |
| A4 | Rewriting `_shared/schemas.ts` zod import to bare `zod` keeps all consuming EFs + strict-schema probe green | §3b | A missed consumer could break the deno-test corpus; the corpus is the guard — run it before merge. |
| A5 | The Figma-Make base schema is dashboard-created and absent from all migration files | Runtime State Inventory | If some base objects ARE in an early migration, the baseline authoring is smaller than assumed — the iterate loop self-corrects. |

## Open Questions (RESOLVED)

> All three resolved during Phase-27 planning + the plan-checker revision (2026-07-12). Inline resolutions appended below.

1. **Exact `create_branch`→empty→files primitive.** Which MCP/CLI sequence yields a *true empty-then-local-files* replay on a branch (vs a history clone)? Recommendation: in the BLOCKING wave, `create_branch`, inspect its `schema_migrations`, then `supabase db push` the local files to the branch and diff — determine empirically. Don't block autonomous waves on this.
   - **RESOLVED (27-05 Task 1):** after `create_branch`, RESET the branch to an empty/pre-baseline ledger (`reset_branch` to version zero) and PRE-CHECK `supabase_migrations.schema_migrations` count==0 BEFORE pushing, THEN `supabase db push` the local 71 files onto the emptied branch and diff — the pre-check proves the branch was NOT auto-populated from create_branch's tracked-history clone (Pitfall 1 false-green guard).
2. **config.toml deploy propagation (A2).** Verify with a single low-risk EF redeploy that `import_map`/`verify_jwt` from config.toml take effect before committing to migrating all 4-5 EFs.
   - **RESOLVED (27-06 Task 1):** the canary redeploy of `avaliar-redacao-cultural` (with a curl-status boot smoke + an authed live-invoke) de-risks config.toml→deploy `import_map` propagation before the remaining four EFs redeploy; `--import-map supabase/functions/deno.json` is the documented fallback.
3. **Scope of the explicit knockout `auto_rejeitado=true` literal.** Leave the literal in `submit_candidatura_atomic:150` (already correct) or gate it on the same predicate for symmetry — planner's call; both are behavior-equivalent today.
   - **RESOLVED (27-04 Task 1):** leave the explicit knockout `auto_rejeitado=true` literal in `submit_candidatura_atomic` as-is (already a genuine sanctioned auto-reject; it does not flow through the trigger). Not-on-Pro fallback for the rebuild = local `db reset` with the seed disabled (27-05 user_setup).

## Environment Availability
| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | migration repair, db push, branching, functions deploy | ✓ | 2.105.0 | — |
| Deno | EF + scripts tests | ✓ (CI: setup-deno@v2) | 2.x | — |
| zod (node) | shared contract schemas | ✓ | 3.25.76 | — |
| Supabase Pro plan (branching) | DBMIG-01 preview branch | ⚠️ unverified | — | local `db reset` (needs Docker + seed disabled) — heavier |
| Docker / local Supabase stack | fallback rebuild path | ⚠️ unverified | — | branch (preferred) |

**Missing/unverified with impact:** Branching requires **Pro plan or above** — confirm the project is on Pro before the BLOCKING wave, or fall back to a local `db reset` shadow (with seed disabled). This is the one hard external dependency for DBMIG-01.

## Sources
### Primary (HIGH confidence)
- Repo grep/read: all migration files, `ci.yml`, `deno.json`, `efErrors.ts`, `assert-chunks.mjs`, `sync-prompts.ts`, EF headers, `package.json`, `supabase/tests/` — [VERIFIED: this session]
- `node -e` zod exports probe (3.25.76, `./v4` present) — [VERIFIED]
- supabase.com/docs/guides/local-development/cli/config — config.toml `project_id` + `[functions.<name>] verify_jwt/import_map`
- supabase.com/docs/guides/functions/function-configuration — per-function verify_jwt/import_map/entrypoint

### Secondary (MEDIUM confidence)
- deepwiki.com/supabase-community/supabase-mcp — Branching Tools / Migration Workflows (`create_branch` replays tracked history via `applyMigrations()`)
- supabase.com/docs/guides/platform/manage-your-usage/branching — branching pricing ($0.01344/hr, Pro+)
- github.com/supabase/cli#4059, github.com/supabase/supabase#41693 — config.toml verify_jwt sometimes ignored on update/local (caveat)

### Tertiary (LOW confidence)
- General branching guide (didn't confirm files-vs-history replay for MCP path) — cross-checked with DeepWiki + mechanism-independent acceptance

## Metadata
**Confidence breakdown:**
- Local mechanics (trigger defect, dup helper, wiring, verify_jwt derivation): **HIGH** — all grep/read-verified in-session
- CI-07 recipe: **MEDIUM** — import-map is sound; deploy-time propagation (A2) needs a live check
- DBMIG-01 branch internals: **MEDIUM** — `create_branch` replays history (documented); acceptance is made mechanism-independent to compensate

**Research date:** 2026-07-12
**Valid until:** 2026-08-11 (stable domain; re-verify Supabase CLI/branching behavior if the CLI is upgraded past 2.105.0)
