---
phase: 27-integridade-de-migrations-fechamento-da-rede-de-testes
reviewed: 2026-07-12T21:01:39Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - .github/workflows/ci.yml
  - package.json
  - scripts/__tests__/sync-prompts.test.ts
  - src/features/avaliacao/__tests__/redacao-contract.test.ts
  - src/features/cadastro/__tests__/submitCandidaturaContract.test.ts
  - src/features/decisao/schemas/__tests__/consolidacaoContract.test.ts
  - src/features/entrevista/__tests__/entrevista-contract.test.ts
  - src/features/entrevista/services/entrevistaService.ts
  - supabase/config.toml
  - supabase/functions/_shared/entrevista-schemas.ts
  - supabase/functions/_shared/redacao-schemas.ts
  - supabase/functions/_shared/schemas.ts
  - supabase/functions/consolidar-decisao-final/__tests__/index.test.ts
  - supabase/functions/consolidar-decisao-final/index.ts
  - supabase/functions/deno.json
  - supabase/functions/submit-candidatura/index.test.ts
  - supabase/functions/submit-candidatura/index.ts
  - supabase/migrations/20260419000000_baseline.sql
  - supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql
  - supabase/migrations/20260712110002_backfill_auto_rejeitado.sql
  - supabase/tests/submit_candidatura_atomic_smokes.sql
findings:
  critical: 1
  warning: 2
  info: 3
  total: 6
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-07-12T21:01:39Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Phase 27 closes the migration ledger (DBMIG-01), corrects the `auto_rejeitado`
audit semantics (DBMIG-02), makes the `submit-candidatura` handler testable
(CI-03), converts four client↔EF contract tests to real shared-schema `.safeParse`
(CI-07), pins deploy posture in `config.toml` (CI-13), and dedupes
`extractEfErrorCode` (CI-06).

Most of the intent was executed correctly and I verified it against the source:
- **CI-06 — CORRECT.** `entrevistaService.ts:638` calls `await extractEfErrorCode(data, error)` in the canonical `(data, error) → string|undefined` order; all 5 service call sites repo-wide use the same order; the `efCode === 'VALIDATION'` comparison degrades safely on `undefined`.
- **CI-07 — CORRECT.** The four migrated contract tests import and `.safeParse` the ONE shared module (redacao/entrevista/schemas via bare `zod`, consolidacao via the shared `src` schema). Installed `zod` is `3.25.76` (byte-identical to the Deno import map), so the anti-tamper injected-`score`/unknown-key rejections are real, not replica assertions.
- **CI-13 — CORRECT.** `config.toml` declares exactly 12 functions (matches the 12 EF directories); exactly the 3 named self-auth EFs are `verify_jwt=false`, the other 9 `true`; the 5 bare-zod importers carry `import_map`.
- **CI-03 — CORRECT.** The refactored `submit-candidatura` `handler(req,deps)` preserves the auth-401-before-RPC / `.strict()`-400 / ownership-403 / RPC-arg-shape ordering, and knockout remains the only sanctioned auto-reject.
- **DBMIG-02 trigger (20260712110001) — CORRECT.** The Phase-14 flag guard (`v_blocked` + `entrevista_analises`) is preserved verbatim; only the `auto_rejeitado` predicate changed to `(v_ator IS NULL AND app.rejeicao_sancionada='on' AND NEW.etapa_atual='rejeitado')`.

**However, the paired DATA migration (`20260712110002_backfill_auto_rejeitado.sql`) is broken** — its WHERE clause corrupts every genuine knockout auto-rejection audit row, contradicting the migration's own stated safety guarantee, and the accompanying smoke does not detect it. This is a BLOCKER and it was already applied to live PROD (per the baseline header).

## Critical Issues

### CR-01: Backfill corrupts every genuine knockout auto-rejection audit row (LGPD Art. 20)

**File:** `supabase/migrations/20260712110002_backfill_auto_rejeitado.sql:39-42`
**Issue:**
The backfill relabels mismarked survivor-advance rows but is supposed to PRESERVE
genuine auto-rejections. Its own header states: *"Genuine terminal-rejection rows
(etapa landing on the terminal reject, e.g. the knockout's own explicit history
row) are preserved as `true` by the terminal-etapa guard in the WHERE clause below
— the backfill never over-corrects a real auto-rejection (T-27-04-02)."*

That guarantee is false. The guard is `etapa_para <> 'rejeitado'`, but the knockout's
own explicit history row does **not** land on `'rejeitado'`. In BOTH the current live
knockout (`20260709000014_submit_candidatura_flag.sql:146-150`) and the Phase-8
original (`20260608000001:201-207`), the explicit row is written as:

```sql
INSERT INTO public.historico_candidatura
  (candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em)
VALUES
  (v_candidatura_id, 'inscricao'::etapa_processo, 'inscricao'::etapa_processo,  -- etapa_para = 'inscricao', NOT 'rejeitado'
   'knockout automático (Etapa 1)', NULL, true, now());
```

A knockout keeps `etapa_atual='inscricao'` and only flips `status→'rejeitado'`
(confirmed by smoke assertion 1, which asserts `etapa_atual='inscricao'`). So every
real knockout audit row has `etapa_para='inscricao'` AND `auto_rejeitado=true`, which
`WHERE auto_rejeitado = true AND etapa_para <> 'rejeitado'` **matches** — the UPDATE
flips it to `false`. The migration therefore mislabels every historical genuine
auto-rejection as "not an auto-rejection", the exact over-correction (T-27-04-02) it
claims to avoid. Since the entire phase intent is "honest audit semantics", this
inverts the truth it set out to fix, and the baseline header records that DBMIG-02
was already "applied + smoked green on live PROD" — so the corruption is likely live.

Why the smoke misses it (`submit_candidatura_atomic_smokes.sql:167-175`): assertion 1
creates a NEW knockout AFTER both migrations apply and checks the fresh row is
`auto_rejeitado=true`. The RPC writes that `true` directly, and the one-time backfill
never re-runs on new rows — so the smoke validates fresh-write behavior, never the
backfill's effect on pre-existing knockout rows. Greps and smokes both pass while the
data fix is wrong.

**Fix:** Exclude the knockout self-loop rows (etapa unchanged) from the backfill.
Only true survivor advances (a system write that CHANGED etapa) were mismarked:

```sql
UPDATE public.historico_candidatura
   SET auto_rejeitado = false
 WHERE auto_rejeitado = true
   AND etapa_de IS DISTINCT FROM etapa_para          -- knockout row is inscricao→inscricao (self-loop): skip
   AND etapa_para <> 'rejeitado';                    -- genuine terminal rejects stay true
```

(Equivalently, `AND criterio_texto NOT LIKE 'knockout%'`, or positively target only
`etapa_para = 'triagem' AND ator IS NULL`.) Then ship a corrective re-UPDATE to restore
the knockout rows already flipped in PROD:

```sql
-- Repair rows wrongly flipped by the shipped backfill.
UPDATE public.historico_candidatura
   SET auto_rejeitado = true
 WHERE auto_rejeitado = false
   AND ator IS NULL
   AND etapa_de = 'inscricao' AND etapa_para = 'inscricao'
   AND criterio_texto LIKE 'knockout%';
```

Add a smoke assertion that re-reads a PRE-EXISTING knockout row's `auto_rejeitado`
after the backfill (not just a freshly-created one) so this class of defect is caught.

## Warnings

### WR-01: `consolidar-decisao-final` EF now imports across the `supabase/functions` boundary into `src/`

**File:** `supabase/functions/consolidar-decisao-final/index.ts:51`
**Issue:**
CI-07 changed this EF from re-declaring its body schema inline to
`import { ConsolidacaoRequestSchema } from "../../../src/features/decisao/schemas/consolidacaoSchema.ts";`
— a relative import that resolves to the repo-root `src/` tree, OUTSIDE
`supabase/functions/`. This is inconsistent with the OTHER four shared-schema EFs
(submit-candidatura / avaliar-redacao-cultural / avaliar-transcricao-entrevista /
gerar-guia-entrevista), which all import from `_shared/` (inside the functions dir),
and it directly contradicts the documented constraint in
`_shared/schemas.ts:16` ("Edge Functions não podem importar de fora de
`supabase/functions/`"). The Deno test corpus reads it fine (unrestricted
`--allow-read` + the `deno.json` import map), but the EF was previously deployed in
Phase 15 with the schema INLINE — the cross-boundary `src/` import has never been
bundled/deployed, and the redeploy is deferred to Plan 27-06. If the Supabase deploy
bundler does not follow the import into `src/` (or does not apply the `import_map` to
the bare `zod` inside that file), the redeploy will fail or ship a broken bundle.
**Fix:** Prefer relocating the shared consolidation schema into
`supabase/functions/_shared/` (with the `src` side re-exporting it), matching the
other four EFs and the documented convention. At minimum, verify the 27-06 redeploy
bundle actually includes `consolidacaoSchema.ts` and resolves `zod` (curl no-auth →
401 plus a live `.strict()`/`.uuid()` rejection check) before treating it as shipped.

### WR-02: cognitivo client↔EF contract is still a drift-prone Node-local replica

**File:** `src/features/entrevista/__tests__/entrevista-contract.test.ts:51-66, 122-141`
**Issue:**
CI-07 exists specifically to eliminate the Node-local replica pattern (the Phase-11
SJT C1/C2 lesson — a replica passes while the real EF schema drifts). This test
migrated the entrevista bodies to the shared module but left the SubmitCognitivo body
(`SubmitCognitivoBodySchemaReplica`) and `BandaCognitivaEnumReplica` as hand-rolled
Node replicas. The cognitivo contract assertions (`.strict()` rejects `score`/`banda`,
enum options) therefore test a copy, not `_shared/cognitivo-schemas.ts` — the exact
false-confidence failure mode the phase set out to close. The header documents the
scope-out (migrating the module forces an EF redeploy out of 27-02 scope), so this is
a known residual, but the "rede de testes" is not actually closed for the cognitivo
boundary. **Fix:** Track the cognitivo shared-schema migration (bare `zod` +
`import_map` for the cognitivo EF) as an explicit follow-up so the replica is retired;
until then, note in the test that the cognitivo contract is UNGUARDED against drift.

## Info

### IN-01: Stale doc comment in the shared consolidation schema

**File:** `src/features/decisao/schemas/consolidacaoSchema.ts:15-16`
**Issue:** The comment says *"The EF (Deno runtime) re-declares this same shape via a
static `npm:zod` import; this module is the Node/Vite-side source..."* — but after
CI-07 the EF no longer re-declares the shape; it IMPORTS this module
(`consolidar-decisao-final/index.ts:51`). The comment describes the pre-27-02 design
and now misleads a reader about where the single source of truth lives.
**Fix:** Update to "The EF imports this exact module (via the `deno.json` `zod` import
map); there is one shared source, no re-declaration."

### IN-02: DBMIG-01 baseline is still an empty no-op (replay-from-zero deferred)

**File:** `supabase/migrations/20260419000000_baseline.sql:1-37`
**Issue:** The baseline requirement ("sem baseline vazio" — the 72 later migrations
must replay onto a clean DB from zero) is NOT met: the file is comment-only and the
from-empty rebuild is explicitly deferred to a CLI/Docker-gated human task
(27-HUMAN-UAT.md). This is honestly documented and routed by the maintainer, not a
hidden gap, but the ledger-close claim ("0 drift, 0 orphans") coexists with a baseline
that cannot actually reconstruct the base schema. **Fix:** None required this phase
(deferral is sanctioned); keep the residual tracked so DBMIG-01 isn't marked "done".

### IN-03: Hardcoded n8n webhook fallback URL (pre-existing, out of scope)

**File:** `supabase/functions/submit-candidatura/index.ts:310-312`
**Issue:** `N8N_NOVA_CANDIDATURA_URL` falls back to a hardcoded
`https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura`. Not a secret and the
payload carries only UUIDs (no PII), and it predates Phase 27 (WR-04), so it is not a
Phase-27 defect — flagged only for the standing n8n-client backlog item (M5).
**Fix:** Make the env var required (fail-closed) when the n8n integration is finalized.

---

_Reviewed: 2026-07-12T21:01:39Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
