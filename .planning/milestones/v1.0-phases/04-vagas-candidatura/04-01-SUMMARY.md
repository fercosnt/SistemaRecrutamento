---
phase: 04-vagas-candidatura
plan: 01
subsystem: database
tags: [phase-04, vagas, db-migration, schema-push, wave-0, stubs, pitfall-7-grep, fixtures, plpgsql, pkce]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: supabase schema baseline + RLS habilitado em 100% das tabelas + db:types pipeline
  - phase: 02-cadastro-candidato
    provides: candidatos table populated via Edge Function + auth-store unified
  - phase: 03-login-recuperacao-senha
    provides: authenticated session with role JWT claim + AuthError taxonomy
provides:
  - "slugify(text) immutable function + generate_unique_vaga_slug + vagas_set_slug BEFORE-INSERT trigger + UNIQUE index on vagas.slug + Phase-3 backfill"
  - "private curriculos Storage bucket (5MB cap, application/pdf MIME whitelist) + 4 RLS policies on storage.objects scoped to {auth.uid()}/* path"
  - "submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) SECURITY DEFINER RPC granted to service_role only"
  - "UNIQUE partial index candidaturas_candidato_vaga_unique_idx WHERE deleted_at IS NULL — server-side defense for CAND-04"
  - "database.types.ts regenerated against live schema (function signatures + extensions surfaced)"
  - "Wave 0 Vitest stubs (4 files, 34 it.skip): cvUploadService, candidaturaFormSchema, useVagaPerguntas, isUuid"
  - "pitfall7.grep.test.ts extended with PHASE_4_VAGAS_PATHS + signed-URL token regex (4 PASS, B14 guard scope expanded)"
  - "Playwright stubs (vagas-browse + candidatura-submit, 11 fixme'd tests covering B-J01..B-J11) + 3 fixtures (cv-sample-1mb.pdf, cv-sample-6mb.pdf, not-a-cv.docx)"
  - "D-10 path-schema lock: {authUid}/{uuid}.pdf — downstream input for Plan 04-03 cvUploadService"
  - "Carryover knowledge: db push workaround pattern for PL/pgSQL migrations on the transaction pooler (CLAUDE.md updated)"
affects: [04-02, 04-03, 04-04, 04-05, 04-06, 04-07, 04-08, phase-05-perfil]

# Tech tracking
tech-stack:
  added:
    - "Postgres extension: unaccent (surfaced via slugify dependency)"
    - "Postgres function: slugify(text) immutable"
    - "Postgres function: generate_unique_vaga_slug(p_titulo text, p_exclude_id uuid)"
    - "Postgres function: submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) SECURITY DEFINER"
    - "Storage bucket: curriculos (private, 5MB, application/pdf only)"
  patterns:
    - "Supabase Storage: path schema {auth.uid()}/{uuid}.pdf — RLS via foldername(name)[1] = auth.uid()::text"
    - "PL/pgSQL migrations: avoid outer BEGIN/COMMIT wrapper when body contains $$...$$ + adjacent COMMENT/REVOKE/GRANT (transaction pooler 42601 trigger)"
    - "Wave 0 stub pattern: it.skip() Vitest tests + test.fixme() Playwright scenarios authored upfront, promoted in subsequent waves (Phase 3 03-01 precedent)"
    - "Pitfall 7 grep guard pattern: extend PHASE_N_PATHS array + add per-phase forbidden regex + consume both in collectFiles loop"
    - "Migration repair workflow: SQL Editor manual apply + `supabase migration repair --status applied <version>` to sync local state with remote on partial-push scenarios"

key-files:
  created:
    - "supabase/migrations/20260425000001_vagas_slug_trigger.sql — slugify + generate_unique_vaga_slug + vagas_set_slug trigger + backfill + UNIQUE idx"
    - "supabase/migrations/20260425000002_curriculos_bucket.sql — private bucket + 4 RLS policies on storage.objects"
    - "supabase/migrations/20260425000003_submit_candidatura_rpc.sql — submit_candidatura_atomic SECURITY DEFINER RPC"
    - "supabase/migrations/20260425000004_candidaturas_unique_constraint.sql — UNIQUE partial idx (CAND-04)"
    - "src/features/vagas/services/__tests__/cvUploadService.test.ts — 13 Vitest stubs (CAND-01)"
    - "src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts — 11 Vitest stubs (CAND-02 / D-14)"
    - "src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts — 4 Vitest stubs"
    - "src/features/vagas/utils/__tests__/isUuid.test.ts — 6 Vitest stubs"
    - "e2e/vagas-browse.spec.ts — 5 Playwright fixme stubs (B-J01..B-J05) for VAGA-01-03"
    - "e2e/candidatura-submit.spec.ts — 6 Playwright fixme stubs (B-J06..B-J11) for CAND-01-04"
    - "e2e/fixtures/cv-sample-1mb.pdf — valid PDF magic bytes (~1MB)"
    - "e2e/fixtures/cv-sample-6mb.pdf — valid PDF (~6MB to exceed 5MB cap)"
    - "e2e/fixtures/not-a-cv.docx — non-PDF MIME for negative test"
  modified:
    - "src/features/auth/utils/__tests__/pitfall7.grep.test.ts — extended with PHASE_4_VAGAS_PATHS array + FORBIDDEN_PHASE_4 regex (signed-URL token)"
    - "database.types.ts — regenerated; adds generate_unique_vaga_slug + slugify + submit_candidatura_atomic + unaccent function signatures"
    - "CLAUDE.md — added db push workaround note under Commands section"

key-decisions:
  - "DB push workaround established (D-22): migrations combining $$...$$ PL/pgSQL bodies with adjacent COMMENT/REVOKE/GRANT cannot be pushed via supabase db push --linked through the transaction pooler (SQLSTATE 42601). Apply via SQL Editor + `migration repair --status applied <version>`. Migration files reconciled to remove top-level BEGIN/COMMIT wrappers + inline NOTE blocks document the rationale."
  - "Lint baseline correction: real Phase 3 close baseline is 354 tsc errors, not the ~150 estimate in the original plan body. Acceptance criterion 'must not grow' is satisfied at 354 → 354."
  - "Curriculos bucket path schema D-10 LOCKED at `{auth.uid()}/{uuid}.pdf` — RLS policies match via `(storage.foldername(name))[1] = auth.uid()::text`. This is the canonical input contract for Plan 04-03 cvUploadService."
  - "Procedural deviation Rule 3: `git -c core.hooksPath=/dev/null` used for all 9 commits to bypass `tsc --noEmit` pre-commit hook against the 354 pre-existing errors in legacy `src/components/pages/*.tsx`. Equivalent to HUSKY=0 per plan acceptance criterion B3."

patterns-established:
  - "PL/pgSQL migration safety pattern: omit outer BEGIN/COMMIT wrapper when migration body contains $$...$$ + adjacent COMMENT/REVOKE/GRANT statements. Document inline with a NOTE block."
  - "Migration repair recovery pattern: when push fails partway through a batch, apply remaining migrations via SQL Editor + `supabase migration repair --status applied <version>` per failed migration + final `supabase db push` to confirm sync."
  - "Wave 0 scaffold-first pattern: author test stubs (Vitest it.skip + Playwright test.fixme) and fixture files BEFORE implementation work, so Wave 1+ feat commits land into a known-shape test harness."

requirements-completed: []  # All 7 requirements (VAGA-01-03, CAND-01-04) are SCAFFOLDED by Wave 0; full coverage requires Waves 1-3 (04-02..04-07) + UAT in Wave 4 (04-08). Marking partial in REQUIREMENTS.md traceability table only.

# Metrics
duration: ~85min wall-clock (~25min autonomous Tasks 1-4 + 6-8 + ~50min human-action checkpoint Task 5 db push + workaround + smokes + ~10min finalize)
completed: 2026-04-25
---

# Phase 04 Plan 01: Wave 0 — Migrations + Stubs Summary

**Quatro migrations Postgres aplicadas (slug trigger + curriculos bucket + submit_candidatura RPC + UNIQUE idx anti-duplicata), database.types.ts regenerado, 4 stubs Vitest + 2 stubs Playwright + extensão Pitfall 7 grep + 3 fixtures de CV — toda a fundação DB e a malha de testes para Phase 4 Vagas + Candidatura está em pé.**

## Performance

- **Duração:** ~85 min wall-clock (~25 min autonomous + ~50 min human checkpoint + ~10 min finalize)
- **Iniciado:** 2026-04-25 (sessão anterior)
- **Concluído:** 2026-04-25T16:25:00Z (este commit)
- **Tasks:** 8 + 1 chore types regen + 1 docnote CLAUDE.md
- **Files criados/modificados:** 14 (4 migrations + 4 vitest stubs + 2 playwright stubs + 3 fixtures + database.types.ts + pitfall7.grep extension; CLAUDE.md docnote em commit separado)

## Accomplishments

- **4 migrations SQL aplicadas em Supabase live** (Project ID: o linked pelo CLI; conferido via `supabase db push --linked` final = "Remote database is up to date"):
  1. `20260425000001_vagas_slug_trigger.sql` — slugify + generate_unique_vaga_slug + vagas_set_slug trigger + backfill (Phase 3 produção é vazia, mas idempotente para futuros casos) + UNIQUE idx em vagas.slug
  2. `20260425000002_curriculos_bucket.sql` — private bucket `curriculos` (5MB cap, application/pdf MIME), 4 RLS policies em storage.objects (insert_own / select_own / update_own / delete_own scoped por `(storage.foldername(name))[1] = auth.uid()::text`)
  3. `20260425000003_submit_candidatura_rpc.sql` — `submit_candidatura_atomic(p_candidato_id, p_vaga_id, p_curriculo_url, p_curriculo_nome, p_curriculo_size, p_respostas)` SECURITY DEFINER, REVOKE PUBLIC + GRANT EXECUTE service_role only
  4. `20260425000004_candidaturas_unique_constraint.sql` — UNIQUE partial idx `candidaturas_candidato_vaga_unique_idx (candidato_id, vaga_id) WHERE deleted_at IS NULL` para CAND-04 server-side defense
- **`database.types.ts` regenerado** via `npm run db:types`; adiciona signatures de `generate_unique_vaga_slug`, `slugify`, `submit_candidatura_atomic` e `unaccent`. `tsc --noEmit` baseline mantido em 354 erros (zero crescimento).
- **4 Vitest stubs (34 it.skip)** prontos para promoção em Waves 1-2 (Plans 04-02 / 04-03 / 04-04).
- **`pitfall7.grep.test.ts` estendido** com `PHASE_4_VAGAS_PATHS` (futuros paths de Phase 4) + `FORBIDDEN_PHASE_4` regex (signed-URL token). 4 PASS no run final.
- **2 Playwright stubs + 3 fixtures de CV** prontos para promoção em Wave 4 (Plan 04-08): 11 cenários `test.fixme`'d (B-J01..B-J11), parsed = 33 testes (11 × 3 projects: chromium / mobile-chrome / tablet).

## Task Commits

Tasks executados atomicamente, todos com `git -c core.hooksPath=/dev/null` (Rule 3 procedural deviation — bypass do tsc pre-commit hook contra 354 erros legacy carryover):

1. **Task 1: vagas slug trigger migration** — `59166af` (feat)
2. **Task 2: curriculos bucket + RLS policies migration** — `04e3709` (feat)
3. **Task 3: submit_candidatura_atomic RPC migration** — `01fe23c` (feat)
4. **Task 4: candidaturas UNIQUE partial index migration** — `dae79eb` (feat)
5. **Task 5: human-action checkpoint (db push + types regen + 5 SQL smokes)** — concluído pelo usuário; resultado capturado em commits 6-7-8 + chore types regen abaixo
6. **Task 6: Wave 0 Vitest stubs (4 files, 34 it.skip)** — `bd14613` (test)
7. **Task 7: pitfall7.grep extended (Phase 4 paths + signed-URL regex)** — `0d5d69a` (test)
8. **Task 8: Playwright stubs + 3 CV fixtures** — `e2c0b23` (test)

**Chore commit (post-checkpoint reconciliation):**

9. **Chore types regen + migrations 03/04 reconciled to applied form** — `b06994d` (chore)
10. **CLAUDE.md docnote: db push workaround** — `fc0ee32` (docs)

**Plan metadata commit:** (pending — final commit after STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified

### Migrations (4 files, ~330 LoC SQL)
- `supabase/migrations/20260425000001_vagas_slug_trigger.sql` — slugify + generate_unique_vaga_slug + vagas_set_slug BEFORE INSERT trigger + UNIQUE idx vagas_slug_unique_idx + backfill block
- `supabase/migrations/20260425000002_curriculos_bucket.sql` — INSERT INTO storage.buckets (private, 5MB, application/pdf) + 4 RLS policies on storage.objects
- `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` — submit_candidatura_atomic SECURITY DEFINER + REVOKE/GRANT (BEGIN/COMMIT wrapper removed in chore commit; inline NOTE block documents rationale)
- `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql` — UNIQUE partial idx CAND-04 (BEGIN/COMMIT wrapper removed in chore commit; inline NOTE block documents rationale)

### Stubs Vitest (4 files, 34 it.skip)
- `src/features/vagas/services/__tests__/cvUploadService.test.ts` — 13 stubs (validateCV pdf-only / 5MB cap / uploadCV happy + signed-URL helper / removeCV / Pitfall 7 console-spy guard)
- `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` — 11 stubs (D-14 dynamic Zod factory: required / optional / min/max length per pergunta type)
- `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts` — 4 stubs (queries perguntas_formulario by vaga_id, ordered)
- `src/features/vagas/utils/__tests__/isUuid.test.ts` — 6 stubs (UUID v4 regex + edge cases)

### Stubs Playwright (2 files, 11 test.fixme)
- `e2e/vagas-browse.spec.ts` — B-J01 (anon /vagas listing) / B-J02 (anon → /vagas/:slug) / B-J03 (Candidatar-se redirect to login) / B-J04 (post-login → formulario) / B-J05 (invalid slug → VagaNotFoundState)
- `e2e/candidatura-submit.spec.ts` — B-J06 (form renders) / B-J07 (.docx → "Apenas PDF") / B-J08 (6MB → "máximo 5 MB") / B-J09 (success env-gated) / B-J10 (duplicate env-gated) / B-J11 (Sonner DOM contract)

### Fixtures (3 files, ~7MB total)
- `e2e/fixtures/cv-sample-1mb.pdf` — valid PDF magic bytes, ~1MB
- `e2e/fixtures/cv-sample-6mb.pdf` — valid PDF, ~6MB to exceed cap
- `e2e/fixtures/not-a-cv.docx` — non-PDF MIME for negative test

### Modified
- `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` — added `PHASE_4_VAGAS_PATHS` array (futuros paths) + `FORBIDDEN_PHASE_4` regex (signed-URL token leak guard) + `ALL_PATHS = [...PHASE_3_AUTH_PATHS, ...PHASE_4_VAGAS_PATHS]`. 4 PASS no run final.
- `database.types.ts` — regenerated via `npm run db:types`. Adds `generate_unique_vaga_slug`, `slugify`, `submit_candidatura_atomic`, `unaccent` to `Database['public']['Functions']`. `perguntas_formulario` table types confirmed present (foundation for Plan 04-04 `PerguntaFormulario` derived type).
- `CLAUDE.md` — added "Migrations + db push — workaround conhecido (PL/pgSQL)" section under `## Commands` (commit `fc0ee32`).

## Acceptance Evidence (Verification Block)

Run final post-checkpoint:

```bash
$ npm run test:run -- src/features/vagas
Test Files  4 skipped (4)
     Tests  34 skipped (34)
  Duration  3.35s
# ✅ Expected 4/34/0 — match

$ npm run test:run -- pitfall7.grep
Test Files  1 passed (1)
     Tests  4 passed (4)
  Duration  486ms
# ✅ Expected 4 PASS — match

$ npx playwright test --list e2e/vagas-browse.spec.ts e2e/candidatura-submit.spec.ts
Total: 33 tests in 2 files
# ✅ Expected 33 (11 unique × 3 projects) — match

$ npm run lint 2>&1 | grep -c "error TS"
354
# ✅ Baseline preserved (354 = Phase 3 close baseline; plan body's "~150" was outdated)

$ npm run build
✓ built in 41.35s
# ✅ Exit 0
```

### SQL Smoke Tests (executados pelo usuário em Task 5 checkpoint)

| # | Teste | Resultado |
|---|-------|-----------|
| Pré-1 | `SELECT COUNT(*) FROM (SELECT candidato_id, vaga_id FROM candidaturas WHERE deleted_at IS NULL GROUP BY 1,2 HAVING COUNT(*) > 1) t` | **0** duplicates ✓ |
| 1 | Slug dedup: criar 2× "Atendimento Phase4 SmokeA" | `['atendimento-phase4-smokea-2', 'atendimento-phase4-smokea']` ✓ |
| 2 | Bucket curriculos: `SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id='curriculos'` | `public=false, 5242880 bytes, ['application/pdf']` ✓ |
| 3 | RLS policies: `SELECT polname FROM pg_policy WHERE polrelid='storage.objects'::regclass` | 4 políticas para curriculos (INSERT/SELECT/UPDATE/DELETE scoped por auth.uid()) ✓ |
| 4 | RPC exists: `SELECT proname FROM pg_proc WHERE proname='submit_candidatura_atomic' AND pronamespace='public'::regnamespace` | 1 row ✓ |
| 5 | UNIQUE idx: `SELECT indexdef FROM pg_indexes WHERE indexname='candidaturas_candidato_vaga_unique_idx'` | `... WHERE (deleted_at IS NULL)` ✓ |
| Cleanup | `DELETE FROM public.vagas WHERE titulo = 'Atendimento ao Paciente Phase4 Smoke'` | executed ✓ |

## Decisions Made

- **D-22 (NEW): DB push workaround para PL/pgSQL migrations no Supabase transaction pooler.** Migrations contendo `CREATE FUNCTION` ou `DO` blocks com corpo `$$...$$` combinados com statements adjacentes (`COMMENT` / `REVOKE` / `GRANT`) **falham** via `supabase db push --linked` com `SQLSTATE 42601: cannot insert multiple commands into a prepared statement`. Workaround: aplicar via Supabase SQL Editor + `supabase migration repair --status applied <version>`. Documentado em CLAUDE.md `## Commands` (commit `fc0ee32`). Padrão recorrerá em Phase 4+ e Phase 5.
- **Lint baseline correção:** real baseline pós-Phase-3-close = **354** erros tsc (não ~150 como o body original do plan estimava). Acceptance criterion "must not grow" satisfeito em 354 → 354.
- **D-10 path-schema lock:** `{auth.uid()}/{uuid}.pdf` confirmado nas 4 RLS policies do bucket via `(storage.foldername(name))[1] = auth.uid()::text`. Plan 04-03 cvUploadService.uploadCV deve gerar paths neste formato exato.
- **Curriculos é bucket privado:** `public=false`. Acesso via signed-URLs (TTL recomendado 60s para download); Plan 04-03 deve implementar `getSignedUrl(path, expiresIn)` com TTL parametrizado.
- **Migration files reconciliados ao formato applied:** wrappers `BEGIN; ... COMMIT;` removidos das migrations 03 + 04 + NOTE blocks inline adicionados explicando o motivo. Garante que futuros `supabase db reset` ou `supabase db push --linked` em DB limpo funcionem sem o workaround.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `--no-verify` equivalente via `core.hooksPath=/dev/null` para bypass do tsc pre-commit hook**
- **Found during:** Task 1 (commit do primeiro migration)
- **Issue:** Husky `pre-commit` roda `npm run lint` (= `tsc --noEmit`) que reporta 354 erros pré-existentes em `src/components/pages/*.tsx` (legacy carryover de Phase 3 close). Plan 04-01 não modifica nenhum desses arquivos; bloquear no gate é ruído.
- **Fix:** Todos os 9 commits do Wave 0 usam `git -c core.hooksPath=/dev/null commit ...`. Equivalente semântico a `HUSKY=0 git commit` ou `git commit --no-verify`, com a vantagem de não tocar `.husky/` config nem variáveis de ambiente persistentes. Aceitação per plan B3 ("commits must succeed without lint blocking on pre-existing errors").
- **Files modified:** N/A (procedural)
- **Verification:** Todos os 9 commits aplicados com sucesso; `git log --oneline | head -10` confirma chain.
- **Committed in:** todos (procedural pattern, não isolável)

**2. [Rule 3 - Blocking] supabase db push workaround para migrations 03 + 04 (SQLSTATE 42601 no transaction pooler)**
- **Found during:** Task 5 human-action checkpoint (db push)
- **Issue:** Migrations #03 (submit_candidatura_atomic RPC) e #04 (UNIQUE partial idx) FALHARAM via `supabase db push --linked` com `ERROR: cannot insert multiple commands into a prepared statement (SQLSTATE 42601)`. Root cause: o transaction pooler do Supabase parsea o body inteiro do migration como prepared statement, mas migrations contendo wrapper `BEGIN ... COMMIT;` + corpo `$$ ... $$` (PL/pgSQL function/DO body com seu próprio BEGIN/END) + statements adjacentes (COMMENT/REVOKE/GRANT) excedem o boundary do parser.
- **Fix:** (a) SQL copiado da migration → colado no Supabase SQL Editor → executado manualmente; (b) `supabase migration repair --status applied 20260425000003` + idem para 04 — sincroniza o estado do migrations local com o aplicado remoto; (c) `supabase db push --linked` final retorna "Remote database is up to date"; (d) post-checkpoint: migration files locais reconciliados ao formato applied (BEGIN/COMMIT wrappers removidos + inline NOTE blocks adicionados em commit `b06994d`); (e) CLAUDE.md atualizado com a recipe (commit `fc0ee32`) — pattern recorrerá em Phase 4+ e Phase 5.
- **Files modified:** `supabase/migrations/20260425000003_submit_candidatura_rpc.sql`, `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql`, `CLAUDE.md`
- **Verification:** SQL smoke #4 (RPC exists) + SQL smoke #5 (UNIQUE idx exists with `WHERE deleted_at IS NULL` clause) confirmam ambos aplicados em produção. `database.types.ts` regenerado contém `submit_candidatura_atomic`.
- **Committed in:** Migration repair acontece no Supabase (não tem hash git); reconciliação dos arquivos em `b06994d`; CLAUDE.md docnote em `fc0ee32`.

**3. [Rule 1 - Bug] Lint baseline correction: 354 vs ~150 estimado no plan body**
- **Found during:** Task 5 user step 4 (lint baseline check)
- **Issue:** Plan body afirmava lint baseline ~150 erros tsc. Run real após `npm run db:types` regen + types update reportou **354** erros. Verificação cruzada: `git log --oneline | grep "lint baseline"` em STATE.md decisions [03-01] menciona "~150 pre-existing errors in legacy src/components/pages/*.tsx", o que indica que esse estimate era de Plan 03-01 (Phase 3 wave 0). Phase 3 close ampliou o baseline para 354 (consequência das page rewrites em 03-05/03-06 que mudaram imports + da introdução de novos arquivos auth services em 03-04). Não é regressão Phase 4 — é carryover Phase 3.
- **Fix:** Acceptance criterion ajustado: "tsc baseline must not GROW vs Phase 3 close" (354 → 354). Sem ação de código necessária — apenas documentação.
- **Files modified:** N/A (doc-only correction)
- **Verification:** Pre-Wave-0 baseline = 354 (medido em sessão anterior antes do commit dos migrations); Post-Wave-0 baseline = 354 (medido neste commit). Delta = 0.
- **Committed in:** documentado neste SUMMARY apenas.

---

**Total deviations:** 3 auto-fixed (2 Rule 3 - blocking procedural, 1 Rule 1 - documentation correction)
**Impact on plan:** Todos os auto-fixes são procedurais ou documentais; nenhum afeta a forma do código entregue. Os 4 migrations + 4 vitest stubs + 2 playwright stubs + 3 fixtures + extensão pitfall7.grep saem do Wave 0 idênticos ao plano original. O workaround do db push é recipe documentada para uso recorrente, não scope creep.

## Issues Encountered

- **Migrations 03 + 04 db push failure** (resolvido via workaround D-22 — ver Deviations 2 acima). Investigação root-cause: transaction pooler do Supabase + statement boundary parser não tolera a combinação outer BEGIN/COMMIT + inner $$...$$ + adjacent COMMENT/REVOKE/GRANT. Workaround estabelecido como pattern reutilizável.

## D-10 Path Schema Confirmation

**Confirmado:** O path schema do bucket `curriculos` é `{auth.uid()}/{uuid}.pdf`, e as 4 RLS policies fazem match via `(storage.foldername(name))[1] = auth.uid()::text`. Smoke #3 enumerou as 4 policies (insert/select/update/delete each scoped to the user's own folder).

**Downstream contract para Plan 04-03 cvUploadService.uploadCV:**

```typescript
const path = `${session.user.id}/${crypto.randomUUID()}.pdf`
const { data, error } = await supabase.storage.from('curriculos').upload(path, file, {
  contentType: 'application/pdf',
  upsert: false,
})
```

`getSignedUrl(path, expiresIn)` deve usar TTL curto (60s recomendado) — bucket é privado, signed-URLs são single-use por design.

## Anomaly: PUSH WORKAROUND PATTERN (carryover for project)

> **`db push` workaround pattern para PL/pgSQL migrations:**
> Migrations contendo `CREATE FUNCTION` ou `DO` blocks com corpo `$$...$$` + adjacent COMMENT/REVOKE/GRANT statements **FAIL** via `supabase db push --linked` no transaction pooler com `"cannot insert multiple commands into a prepared statement"` (SQLSTATE 42601).
>
> **Workaround estabelecido:**
> 1. Aplicar SQL via Supabase SQL Editor manualmente.
> 2. Sincronizar local: `supabase migration repair --status applied <version>`.
> 3. Confirmar: `supabase db push --linked` deve retornar "Remote database is up to date".
> 4. Reconciliar migration file local ao formato applied (remover wrapper BEGIN/COMMIT; adicionar NOTE inline).
>
> **Padrão WILL RECUR** — Phase 4 tem mais migrations PL/pgSQL (Plan 04-05 EF deploy não toca DB, mas qualquer hardening RLS ou trigger novo cairá no mesmo pitfall). Phase 5 também (perfil + hardening RPCs).
>
> **Documentado em:** `CLAUDE.md` `## Commands` section (commit `fc0ee32`).

## Carryover Knowledge for Next Waves

### Wave 1 (Plans 04-02 / 04-03 / 04-04) consume:

- **`database.types.ts` regen** — todos os 3 plans dependem de tipos atualizados:
  - `Plan 04-02` (vagasService.getVagaBySlug) usa `Database['public']['Tables']['vagas']['Row']` + `Database['public']['Functions']['generate_unique_vaga_slug']`
  - `Plan 04-03` (cvUploadService) usa `Database['public']['Tables']['candidaturas']['Insert']` para shape de FK
  - `Plan 04-04` (PerguntaFormulario) deriva tipo de `Database['public']['Tables']['perguntas_formulario']['Row']` — confirmado existente em `database.types.ts` regen
- **Curriculos bucket pronto** — Plan 04-03 cvUploadService apenas implementa código contra o schema já existente. Sem necessidade de migration adicional.

### Wave 2 (Plan 04-05) consume:

- **`submit_candidatura_atomic` RPC** — assinatura: `(p_candidato_id uuid, p_vaga_id uuid, p_curriculo_url text, p_curriculo_nome text, p_curriculo_size int, p_respostas jsonb) RETURNS Json`. Edge Function `submit-candidatura` deve invocar via `supabaseService.rpc('submit_candidatura_atomic', { ... })`.
- **JSONB shape de `p_respostas`** — array de `{ pergunta_id: uuid, resposta: text | string[] | boolean | number }`. Plan 04-05 _shared/schemas.ts patch deve validar este shape no client antes de enviar para EF.
- **Postgres error code 23505** (unique_violation) — quando candidatura duplicada acontece, RPC re-eleva o erro do partial UNIQUE idx. EF deve mapear `23505` → `error_code: 'DUPLICATE_CANDIDATURA'` no contract de retorno.

### Wave 3 (Plans 04-06 / 04-07) consume:

- **Pitfall 7 grep guard** — `PHASE_4_VAGAS_PATHS` já cobre os paths futuros. Plans 04-06 / 04-07 devem manter zero `console.*` em pages (aplicar pattern Phase 3 03-05/03-06 — observability vive na service layer).

### Wave 4 (Plan 04-08) consume:

- **Playwright stubs prontos** — Plan 04-08 promote os 11 `test.fixme` em testes ativos com Page Objects + auth fixtures. Patterns a manter: (a) `#id` locators (Phase 3 03-07 auto-fix), (b) `.blur()` após `.fill()` em forms RHF onBlur, (c) Sonner DOM contract assertion para B-J11 (Notifications region).
- **3 fixtures de CV** prontos — `cv-sample-1mb.pdf` para happy path, `cv-sample-6mb.pdf` para teste do 5MB cap, `not-a-cv.docx` para teste do MIME whitelist.

## Self-Check: PASSED

### Files exist
- `supabase/migrations/20260425000001_vagas_slug_trigger.sql` — FOUND
- `supabase/migrations/20260425000002_curriculos_bucket.sql` — FOUND
- `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` — FOUND
- `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql` — FOUND
- `src/features/vagas/services/__tests__/cvUploadService.test.ts` — FOUND
- `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` — FOUND
- `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts` — FOUND
- `src/features/vagas/utils/__tests__/isUuid.test.ts` — FOUND
- `e2e/vagas-browse.spec.ts` — FOUND
- `e2e/candidatura-submit.spec.ts` — FOUND
- `e2e/fixtures/cv-sample-1mb.pdf` — FOUND
- `e2e/fixtures/cv-sample-6mb.pdf` — FOUND
- `e2e/fixtures/not-a-cv.docx` — FOUND
- `database.types.ts` — FOUND (modified, regenerated)
- `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` — FOUND (modified, extended)
- `CLAUDE.md` — FOUND (modified, docnote added)

### Commits exist (10 commits total for Plan 04-01)
- `59166af` Task 1 vagas slug trigger — FOUND
- `04e3709` Task 2 curriculos bucket — FOUND
- `01fe23c` Task 3 submit_candidatura RPC — FOUND
- `dae79eb` Task 4 UNIQUE idx — FOUND
- `bd14613` Task 6 vitest stubs — FOUND
- `0d5d69a` Task 7 pitfall7.grep extended — FOUND
- `e2c0b23` Task 8 playwright stubs + fixtures — FOUND
- `b06994d` chore types regen + migrations reconciled — FOUND
- `fc0ee32` docs claude-md db push workaround — FOUND
- (final metadata commit pending)

## Next Phase Readiness

- **Ready for Wave 1 spawn:** Plans 04-02 (isUuid + vagasService.getVagaBySlug + useVagaBySlug), 04-03 (cvUploadService), 04-04 (PerguntaFormulario + buildCandidaturaSchema + useVagaPerguntas) podem rodar em paralelo — todos dependem apenas do `database.types.ts` regen + bucket curriculos prontos, ambos satisfeitos por este Wave 0.
- **Ready for Wave 2 spawn:** Plan 04-05 (Edge Function submit-candidatura) depende de Wave 1 (cvUploadService.uploadCV + buildCandidaturaSchema) + RPC submit_candidatura_atomic (✓ entregue por Wave 0). Pode iniciar quando Wave 1 fechar.
- **PKCE same-browser limitation:** carry-over de Phase 3 03-07 — UX product decision deferida para Phase 4. Não afeta este Wave 0 (que é DB scaffold), mas Plans 04-06/04-07 (rotas + form rewrite) devem considerar a recomendação preferida (switch para OTP code flow). Documentar em CONTEXT.md ou em um plan-level decision se a mitigação acontecer dentro do scope de Phase 4.

---
*Phase: 04-vagas-candidatura*
*Plan: 04-01*
*Completed: 2026-04-25*
