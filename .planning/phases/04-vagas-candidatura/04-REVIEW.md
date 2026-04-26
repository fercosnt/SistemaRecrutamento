---
phase: 04-vagas-candidatura
reviewed: 2026-04-26T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - .gitignore
  - CLAUDE.md
  - database.types.ts
  - e2e/candidatura-submit.spec.ts
  - e2e/vagas-browse.spec.ts
  - src/components/pages/FormularioCandidaturaPage.tsx
  - src/components/pages/LoginCandidatoPage.tsx
  - src/components/pages/VagaDetalhePage.tsx
  - src/components/pages/__tests__/LoginCandidatoPage.test.tsx
  - src/features/auth/utils/__tests__/pitfall7.grep.test.ts
  - src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts
  - src/features/vagas/hooks/useVagaPerguntas.ts
  - src/features/vagas/hooks/useVagas.ts
  - src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts
  - src/features/vagas/schemas/candidaturaFormSchema.ts
  - src/features/vagas/services/__tests__/candidaturasService.test.ts
  - src/features/vagas/services/__tests__/cvUploadService.test.ts
  - src/features/vagas/services/__tests__/vagasService.test.ts
  - src/features/vagas/services/candidaturasService.ts
  - src/features/vagas/services/cvUploadService.ts
  - src/features/vagas/services/vagasService.ts
  - src/features/vagas/types/vagasTypes.ts
  - src/features/vagas/utils/__tests__/isUuid.test.ts
  - src/features/vagas/utils/isUuid.ts
  - src/router/routes.tsx
  - supabase/functions/_shared/schemas.ts
  - supabase/functions/submit-candidatura/index.ts
  - supabase/migrations/20260425000001_vagas_slug_trigger.sql
  - supabase/migrations/20260425000002_curriculos_bucket.sql
  - supabase/migrations/20260425000003_submit_candidatura_rpc.sql
  - supabase/migrations/20260425000004_candidaturas_unique_constraint.sql
findings:
  critical: 0
  warning: 6
  info: 9
  total: 15
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 24 source files (database.types.ts skipped — auto-generated, never hand-edit per CLAUDE.md)
**Status:** issues_found

## Summary

Phase 4 (`vagas-candidatura`) is the candidate-facing flow for browsing job postings, viewing vaga detail with anti-enumeration 404, uploading a private-bucket CV PDF, completing a dynamic Zod-validated form, and submitting via a SECURITY DEFINER RPC behind an Edge Function. The phase shows strong security hygiene overall: the two-client EF pattern (anon-with-Authorization for `auth.getUser()` + service_role for the privileged RPC) is implemented correctly, the `curriculos` bucket has bucket-level MIME/size caps plus tight RLS using `(storage.foldername(name))[1] = auth.uid()::text`, the `submit-candidatura` EF re-validates the path prefix server-side as defense-in-depth (T-04-04), the unique partial index on `candidaturas (candidato_id, vaga_id) WHERE deleted_at IS NULL` correctly raises 23505 on race-condition duplicate submits and the EF maps that to `DUPLICATE_CANDIDATURA`, and `resolveRedirect` correctly rejects open-redirect, protocol-relative, and `javascript:` payloads. Pitfall 7 (PII redaction) is enforced by both unit tests and a static grep guard, and the new `submitCandidaturaWithRespostas` service log uses the redacted `{vaga_id, candidato_id, respostas_count}` shape only.

The findings below are all Warning or Info — no Critical issues found in this phase. The most consequential are (W1) an orphan-CV cleanup gap when an unexpected (non-`CandidaturasServiceError`) error escapes after the upload succeeded, (W2) a stale `etapaAtual` foreign-key risk in the `submit_candidatura_atomic` RPC if a pergunta is deleted mid-flight (the EF maps it generically), and (W4) a pre-existing N8N webhook URL hardcoded in two places (frontend + EF) — the FE caller may be dead code now that the EF fires the same webhook post-commit. Several Info-level issues flag pre-existing inconsistencies surfaced in `vagasTypes.ts` that the Phase 4 surface depends on (TIPO_VAGA / DEPARTAMENTO / KANBAN label maps reference enum values that no longer match the union type aliases), but these are baseline tsc errors per scope and only flagged because they sit in a Phase 4 file.

## Warnings

### WR-01: Orphan CV cleanup only fires for `CandidaturasServiceError`, leaking storage objects on unexpected errors

**File:** `src/components/pages/FormularioCandidaturaPage.tsx:325-423`
**Issue:** In `onSubmit`, the orphan-cleanup branch (`void removeCV(uploadedPath).catch(...)`) is gated on `if (err instanceof CandidaturasServiceError)`. If the EF call throws anything else — a `TypeError` from a malformed response, an aborted fetch surfaced as a generic `Error`, an SDK invariant violation — execution falls through to the final generic `toast.error('Erro inesperado. Tente novamente.')` (line 423), and the freshly uploaded `{user.id}/{uuid}.pdf` is left orphaned in the `curriculos` bucket. The candidate will retry, `uploadedPath` is null again on the retry path because we re-enter `onSubmit` from scratch, and a new orphan accumulates per attempt. The `CVUploadServiceError` branch above is fine — by definition it implies the upload itself failed and there is nothing to clean. Only the post-upload-but-pre-success window is exposed.
**Fix:** Hoist the cleanup so it runs whenever `uploadedPath !== cvPath` was set AND the submit did not return success. Concretely, restructure as:
```ts
} catch (err) {
  setCvUploading(false)
  // If upload succeeded but submit didn't, always clean — regardless of error class.
  // The CV upload error path (CVUploadServiceError) implies upload failed, so uploadedPath
  // === null and removeCV is a no-op (path falsy → guard).
  if (uploadedPath && !(err instanceof CVUploadServiceError)) {
    void removeCV(uploadedPath).catch(() => undefined)
    setCvPath(null)
  }
  // ...existing branching...
}
```

### WR-02: `submit_candidatura_atomic` lacks per-pergunta validation; FK 23503 raises a generic VALIDATION error without identifying which pergunta failed

**File:** `supabase/migrations/20260425000003_submit_candidatura_rpc.sql:60-80` and `supabase/functions/submit-candidatura/index.ts:204-208`
**Issue:** The RPC inserts each `respostas_formulario` row inside the `FOR v_resposta IN ... LOOP` without any validation that (a) the `pergunta_id` actually belongs to `p_vaga_id`, or (b) the `tipo_resposta` matches the column populated. A client (or a stale schema cache after a vaga edit) could submit a `pergunta_id` from a different vaga and the insert would succeed if the FK is satisfied (the RPC only knows about a generic `pergunta_id` column). When the FK fails, Postgres raises 23503 and the EF returns `'VALIDATION'` with the message `'Vaga ou pergunta não encontrada.'` without the `field` hint that the rest of the EF sets via `zodPathToFieldName`. The candidate gets a generic toast (`'Dados inválidos'`) with no actionable guidance.
**Fix:** Add a `WHERE pergunta_id IN (SELECT id FROM perguntas_formulario WHERE vaga_id = p_vaga_id AND deleted_at IS NULL)` cross-check at the top of the RPC and `RAISE EXCEPTION` with a structured SQLSTATE on mismatch. Alternatively, add an explicit pre-check in the EF before the RPC call:
```ts
const perguntaIds = input.respostas.map((r) => r.pergunta_id)
if (perguntaIds.length > 0) {
  const { data: validPerguntas } = await supabaseAdmin
    .from('perguntas_formulario').select('id')
    .eq('vaga_id', input.vaga_id).is('deleted_at', null).in('id', perguntaIds)
  const validSet = new Set((validPerguntas ?? []).map(p => p.id))
  const missing = perguntaIds.find((id) => !validSet.has(id))
  if (missing) return errorResponse('VALIDATION', 'Pergunta não pertence à vaga.', 'pergunta_id')
}
```

### WR-03: `useEffect` race: `alreadyApplied` redirect can fire before the data is settled, silently dismissing a transient `false → true` flip

**File:** `src/components/pages/FormularioCandidaturaPage.tsx:153-158`
**Issue:** The `useEffect` watches `alreadyApplied` and triggers `navigate(...)` whenever it becomes truthy. `useHasApplied` returns `data` which is `boolean | undefined`. On first mount with stale-while-revalidate cache, `data` may briefly be `undefined`, then `false`, then `true` if the candidate just submitted in another tab. Because the effect only checks `if (alreadyApplied)`, the candidate could see the form briefly and then be bounced. More importantly, the redirect runs even if the user has already started filling the form (no confirmation prompt to preserve in-flight state) — this silently destroys progress on a flap. While the server-side UNIQUE is the authoritative gate, this client-side bounce is purely UX defense and shouldn't redirect-by-surprise.
**Fix:** Either (a) gate the redirect on `useHasApplied`'s `isSuccess` so it only fires when the query has definitively settled with a `true`, or (b) remove this client-side gate entirely and rely on the EF returning `DUPLICATE_APPLICATION` after submit (the existing handler already redirects to `/vagas/:slug` in that case). Concrete (a) version:
```ts
const { data: alreadyApplied, isSuccess: appliedQuerySettled } = useHasApplied(vaga?.id ?? null)
useEffect(() => {
  if (appliedQuerySettled && alreadyApplied === true) {
    toast.info('Você já se candidatou a esta vaga', { duration: 4000 })
    navigate(`/vagas/${vagaSlug ?? ''}`, { replace: true })
  }
}, [appliedQuerySettled, alreadyApplied, navigate, vagaSlug])
```

### WR-04: Hardcoded N8N webhook URL appears in both frontend service AND Edge Function — drift risk + frontend webhook caller is likely dead code post-Phase 4

**File:** `src/features/vagas/services/candidaturasService.ts:60-65, 218-342, 583-606` and `supabase/functions/submit-candidatura/index.ts:226-243`
**Issue:** Two problems compound here. (1) The N8N webhook URL `https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura` is hardcoded in two places — the frontend service (`triggerN8NWebhook`, called from `createCandidatura`) and the Edge Function (`submit-candidatura/index.ts:226`). Any URL change requires editing both files. (2) Now that `submit-candidatura` fires the webhook post-commit, the frontend `createCandidatura` path is duplicating the webhook (or relying on it as a fallback for the old non-EF path). If `createCandidatura` is no longer the primary submit path in Phase 4 (the page calls `submitCandidaturaWithRespostas` instead), then the entire 200-line `triggerN8NWebhook` + `triggerStatusUpdateWebhook` machinery in `candidaturasService.ts` may be dead code OR a duplicate-fire risk if some legacy caller still exists. There is no `// DEPRECATED` annotation to clarify intent.
**Fix:** (a) Move the webhook URL to an env var (`Deno.env.get('N8N_NOVA_CANDIDATURA_URL')`) on the EF side and to `import.meta.env.VITE_N8N_*` on the frontend. (b) Audit callers of `createCandidatura` — if it has no remaining callers from production code paths, mark it `@deprecated` with a JSDoc tag pointing at `submitCandidaturaWithRespostas`, and consider removing in Phase 5 cleanup. If it is still active for some legacy flow, add a `// duplicate-fire-by-design` comment explaining why both paths invoke the webhook.

### WR-05: `useVagasWithStore` uses synchronous `require()` inside a hook, breaking ESM and circular-dep safety

**File:** `src/features/vagas/hooks/useVagas.ts:220-227`
**Issue:** This hook calls `require('../store/vagasStore')` synchronously inside the function body. (1) Vite's ESM build does not provide a CommonJS `require` at runtime in the browser — this code path will throw `ReferenceError: require is not defined` if any component actually mounts it. (2) The pattern bypasses the static-import dependency graph, defeating tree-shaking and circular-dep detection. (3) The `(state: any)` casts erase the store's TypeScript shape, so any rename in `vagasStore` will silently break this consumer. This is not a Phase 4 regression — it predates the phase — but it sits in a Phase 4 file and is reachable at runtime if `useVagasWithStore` is ever wired up.
**Fix:** Replace with a top-level static import:
```ts
import { useVagasStore } from '../store/vagasStore'
// ...
export function useVagasWithStore() {
  const filters = useVagasStore((state) => state.filters)
  const orderBy = useVagasStore((state) => state.orderBy)
  const pagination = useVagasStore((state) => state.pagination)
  return useVagas(filters, orderBy, pagination)
}
```
If this introduces a real circular import, that's a structural problem the static import would surface (correctly) at build time.

### WR-06: `enriquecerVaga` issues 3 sequential count queries per vaga — N+1 amplification on list endpoints

**File:** `src/features/vagas/services/vagasService.ts:65-116, 272-274`
**Issue:** `enriquecerVaga` performs (up to) 4 round-trips per vaga: `hasUserApplied` lookup (when `candidatoId` set), then three serial `count: 'exact'` queries (`totalCandidatos`, `candidatosEmAnalise`, `candidatosAprovados`). `listVagas` then `await Promise.all(data.map(enriquecerVaga))` fans out — for a 12-vaga page that's 36-48 round-trips. The author's docstring (`vagasService.ts:387-390`) flags this as "D-17 — otimização deferida para Phase 5 hardening", which acknowledges the issue, but performance is technically out of scope for this review. **The reason this is flagged as Warning, not skipped per scope:** all three count queries scan the same `candidaturas WHERE vaga_id = ? AND deleted_at IS NULL` rowset. If the table grows past ~100K rows under heavy candidate volume, the cumulative query load could become a latency cliff that affects correctness (timeouts → empty `count` → renders 0 candidates → misleading UX badge). Functional risk is low today but the architectural shape is brittle.
**Fix:** Replace the three count queries with a single grouped aggregate query, or compute totals via a single SELECT with conditional aggregates:
```ts
const { data: stats } = await supabase
  .from('candidaturas')
  .select('status, count:status.count()')
  .eq('vaga_id', vaga.id)
  .is('deleted_at', null)
// Or use an RPC that returns { total, em_analise, aprovados } in one call.
```
For the list path specifically, consider a single grouped query keyed by all vaga IDs in the page batch, then map to vagas client-side — that collapses the N+1 to O(1) per page.

## Info

### IN-01: `vagasTypes.ts` const maps reference enum values that no longer exist (TIPO_VAGA, DEPARTAMENTO, ETAPA_TO_KANBAN)

**File:** `src/features/vagas/types/vagasTypes.ts:568-587, 732-740`
**Issue:** Three `Record<EnumType, string>` const maps reference enum values that don't exist in their union types:
- `TIPO_VAGA_LABELS` (L568-573) keys are `tempo_integral | meio_periodo | estagio | temporario`, but `TipoVaga` (L90) is `'CLT' | 'PJ'` only.
- `DEPARTAMENTO_LABELS` (L578-587) keys include `clinica | ti | rh | outro`, but `Departamento` (L96-104) is the snake_case `clinico | tecnologia | recursos_humanos` (no `outro` value).
- `ETAPA_TO_KANBAN` (L732-740) keys include `big_five | entrevista_telefonica | analise_final | contratacao`, but `EtapaProcesso` (L200-210) uses `bigfive | entrevista_online | avaliacao_final | aprovado`.

These produce TS2741 / TS2322 errors but were called out as part of the 354 pre-existing tsc baseline. Flagged here only because Phase 4 expanded `vagasTypes.ts` (added `PerguntaFormulario` aliases at L68-80) so a future contributor might assume the file is clean.
**Fix:** Reconcile the const maps with the current enum values, or split the legacy/aspirational mappings into a `vagasTypesLegacy.ts` file with a clear `// PRE-MIGRATION ENUM SHAPE` header.

### IN-02: `cvUploadService.uploadCV` MIME mapping uses substring match on `'mime'` — false positive risk

**File:** `src/features/vagas/services/cvUploadService.ts:140-167`
**Issue:** The error-mapping switch uses `msg.includes('mime')` to map to `INVALID_MIME`. Supabase Storage error messages are not stable contracts; a future error like `'rate limit exceeded for endpoint mime-validator'` would incorrectly map to `INVALID_MIME` and confuse the candidate. Same risk for `'jwt'` (could match `'jwt-decoder unavailable'`) and `'quota'` (matches `'connection quota exhausted'` in some libraries).
**Fix:** Anchor the regex more carefully (`/\bmime\s+type/i`, `/jwt\s+(expired|invalid|malformed)/i`) or, if Supabase exposes typed error codes via `error.statusCode` or `error.error`, switch on those instead of `error.message`.

### IN-03: `submitCandidaturaWithRespostas` allows `Promise.all` body to be inspected via `console.log` shape change

**File:** `src/features/vagas/services/candidaturasService.ts:1260-1264, 1276-1279, 1291`
**Issue:** The redacted log on L1260 includes `vaga_id` and `candidato_id` (UUIDs) which are PII-adjacent — strictly not file/CV PII (covered by Pitfall 7) but still identifiers that link to candidate identity. The Pitfall 7 grep test (`pitfall7.grep.test.ts:118-136`) only forbids `signedurl|signed_url|?token=|curriculo_nome|file.name`, not bare UUIDs. This is consistent with the existing redaction discipline, but downstream log aggregation should be aware that vaga_id+candidato_id are jointly equivalent to a candidatura_id and could be used to correlate sessions.
**Fix:** No code change required; consider adding a comment noting that these UUIDs are intentionally NOT redacted (used for production-incident correlation by design) so future contributors don't try to "harden" by removing them.

### IN-04: `formatBytes` rounds 1023 B to "1023 B" but 1024 to "1 KB" — boundary inconsistency

**File:** `src/components/pages/FormularioCandidaturaPage.tsx:71-75`
**Issue:** Pure cosmetic — at the 1024-byte boundary the unit jumps from B to KB cleanly, but `Math.round(bytes / 1024)` for `1024` gives `1` while for `1500` gives `1` (truncates the meaningful difference). 1.5 KB and 1 KB display identically.
**Fix:** Add a decimal place for KB display: `Math.round((bytes / 1024) * 10) / 10` and `${result.toFixed(1)} KB`.

### IN-05: Unused legacy query key `vagasKeys.detail` kept for back-compat — flag for Phase 5 cleanup

**File:** `src/features/vagas/hooks/useVagas.ts:46-48`
**Issue:** `vagasKeys.detail` is documented as "Legacy — kept for back-compat (createCandidatura, useHasApplied still call detail(id))". Phase 4 introduced `detailById` and `detailBySlug` to prevent cache pollution. If WR-04's audit confirms `createCandidatura` is dead code, `detail` may also be removable.
**Fix:** Track in Phase 5 cleanup. Either delete `detail` or add `@deprecated` JSDoc with replacement pointer.

### IN-06: `requireAdmin` not used; `console.error` for missing env vars exposes timing channel

**File:** `supabase/functions/submit-candidatura/index.ts:107-113`
**Issue:** When the EF starts and an env var is missing, it returns 500 with body `'Servidor mal configurado'`. The check happens AFTER body parsing (which means an attacker can probe the endpoint with arbitrary JSON to trigger the log line in production). Low impact (and the env vars are set at deploy time, so this only fires during misconfiguration), but the parse-then-check ordering means a misconfigured deploy would still log every junk POST. Move the env-var guard before `req.json()` so misconfigured deployments fast-fail without consuming the body.
**Fix:**
```ts
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse('SERVER_ERROR', '...', undefined, 405)
  // Env check FIRST — fail fast on misconfig
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  // ...
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) { ... }
  // Then parse body
})
```

### IN-07: Slug trigger `generate_unique_vaga_slug` 1000-iteration cap fallback uses UUID-with-hyphens-stripped

**File:** `supabase/migrations/20260425000001_vagas_slug_trigger.sql:90-91`
**Issue:** The pathological-fallback returns `v_base || '-' || replace(gen_random_uuid()::text, '-', '')` — a 32-char hex append. This is fine functionally but the resulting slug exceeds the 100-char hard cap on L50 if `v_base` is long. The cap is enforced BEFORE the fallback path, so the final slug could be 100 + 32 = ~132 chars, violating the documented invariant.
**Fix:** Re-apply the cap at the very end of the function:
```sql
v_candidate := v_base || '-' || replace(gen_random_uuid()::text, '-', '');
RETURN substring(v_candidate from 1 for 100);
```

### IN-08: `triggerStatusUpdateWebhook` logs `statusAnterior`, `statusNovo` — consider whether status transitions are PII

**File:** `src/features/vagas/services/candidaturasService.ts:362-368, 444-450, 464-468, 922-928`
**Issue:** The status update webhook logger includes `statusAnterior` and `statusNovo` in structured logs. Status values themselves are not PII, but combined with `candidaturaId` they reveal the candidate's hiring funnel position. Phase 4 doesn't change this behavior — it's pre-existing — but the same observability discipline that motivated Pitfall 7 should be applied here in Phase 5+. No immediate action.
**Fix:** Defer to Phase 5 when broader logging policy review happens. Add a TODO comment noting the surface.

### IN-09: `VagaDetalhePage` `handleShare` writes to clipboard without user-feedback fallback for permission denial

**File:** `src/components/pages/VagaDetalhePage.tsx:148-153`
**Issue:** `navigator.clipboard.writeText(url)` returns a Promise that rejects on permission denial (e.g., insecure context, blocked by user gesture policy). The current code does not `.catch()`, so a denial produces an unhandled promise rejection AND the success toast still fires (because the `toast.success` runs synchronously after the unawaited call). Candidate sees "Link copiado!" without the link actually being on the clipboard.
**Fix:**
```ts
case 'copy':
  navigator.clipboard.writeText(url)
    .then(() => toast.success('Link copiado!', { description: '...' }))
    .catch(() => toast.error('Não foi possível copiar', { description: 'Copie manualmente da barra de endereço.' }))
  break
```

---

_Reviewed: 2026-04-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
