# Phase 10: Triagem RH com IA + Comparativo (Etapa 2) - Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 14 (4 backend, 1 schema, 2 migrations, 7 frontend) new/modified
**Analogs found:** 13 / 14 (1 no-analog: PDF export util)

> Phase 10 is a **composition phase** — every hard subsystem (AI runtime, pg_net dispatch, two-client EF, RLS idiom, allowlist read, paginated panel) already shipped in Phases 4/6/8/9 and is cited below with exact line numbers. New EFs should be ~150 LoC of input-assembly + output-mapping + persistence; no AI plumbing is re-implemented.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/analise-candidato-individual/index.ts` | edge-function (trigger sink) | event-driven (pg_net) | `supabase/functions/cost-alerter/index.ts` | exact (same Vault-Bearer sink shape) |
| `supabase/functions/comparativo-candidatos/index.ts` | edge-function (RH-invoked) | request-response | `supabase/functions/submit-candidatura/index.ts` | exact (two-client D-23) |
| `supabase/functions/_shared/ai-client.ts` (consume only) | service (AI runtime) | transform | — (reuse as-is, do not modify) | n/a — import surface |
| `supabase/functions/_shared/prompt-loader.ts` (EDIT) | config (schema registry) | n/a | self (`SCHEMA_VERSIONS` map, line 33) | exact — add `comparative_ranking` key |
| `supabase/functions/_shared/schemas.ts` (EXTEND) + `_shared/` Zod copy | schema (EF body + output) | transform | `docs/.../00-shared-zod-schemas.ts` (`CvJobMatchSchema` L106, `ComparativeRankingSchema` L139) | role-match (copy into `_shared/` import scope) |
| `supabase/migrations/…_analise_tables.sql` | migration (DDL + RLS) | CRUD | `20260607000006_rls_policies_m2_backbone.sql:34-77` | exact (app_metadata.role idiom) |
| `supabase/migrations/…_analise_trigger.sql` | migration (trigger + pg_net) | event-driven | `20260609000002_prompt_library_rpcs.sql:249-327` (`notify_cost_anomaly`) | exact (verbatim pg_net template) |
| `src/features/triagem/services/triagemService.ts` | service (read + invoke) | CRUD + request-response | `candidaturasService.ts:1145-1229` (read) + `:1328-1382` (invoke) | exact (split between two methods) |
| `src/features/triagem/hooks/useTriagemPanel.ts` | hook (query) | request-response | `useCandidaturas.ts:51-117` (keys + useQuery) | exact |
| `src/features/triagem/hooks/useComparativo.ts` | hook (mutation) | request-response | `candidaturasService.ts:1340-1382` invoke + TanStack mutation | role-match |
| `src/components/pages/VagaCandidatosRHPage.tsx` (REWORK) | component (page) | request-response | self (RHLayout/glass shell, lines 13-45, 74-90) | exact (keep shell, swap cards→table) |
| `src/features/triagem/components/TriagemTable.tsx` | component | request-response | `src/components/ui/table.tsx` (first RH use) + UI-SPEC §A | role-match |
| `src/features/triagem/components/ComparativoScreen.tsx` | component (route) | request-response | UI-SPEC §B + `alert-dialog.tsx` confirm pattern | partial (no candidates-as-columns precedent) |
| `src/features/triagem/components/SugestaoIABadge.tsx` | component (shared) | n/a | `src/components/ui/badge.tsx` + UI-SPEC §C | role-match |
| `src/features/triagem/pdf/exportComparativo.ts` | utility (PDF) | file-I/O (download) | **NO ANALOG** (no PDF lib in repo) | none → use RESEARCH §Code Examples |

---

## Pattern Assignments

### `supabase/functions/analise-candidato-individual/index.ts` (edge-function, event-driven)

**Analog:** `supabase/functions/cost-alerter/index.ts` (trigger-sink shape, `--no-verify-jwt`, Vault Bearer self-auth)

**CORS + response helpers** (`cost-alerter/index.ts:45-70`) — copy verbatim:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function jsonResponse(body: unknown, status: number): Response { /* ... */ }
function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status)
}
```

**Vault Bearer self-auth — CRITICAL** (`cost-alerter/index.ts:113-137`): this EF is deployed `--no-verify-jwt`, pg_net carries NO user JWT, so it CANNOT call `auth.getUser()`. Compare the incoming Bearer against `SUPABASE_SERVICE_ROLE_KEY`:
```typescript
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const authHeader = req.headers.get('Authorization') ?? ''
const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
const expectedSecret = Deno.env.get('ANALISE_SECRET') ?? SERVICE_KEY   // optional rotation override
if (!bearer || bearer !== expectedSecret) {
  console.warn('[analise] Rejected: invalid/absent Bearer')
  return errorResponse('UNAUTHORIZED', 'Não autorizado.', 401)
}
```

**Service-role client** (`cost-alerter/index.ts:164-166`):
```typescript
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
```

**AI call composition** (`ai-client.ts:85-101` resolvedPromptFromLoaded, `:249` callAi signature) — see Shared Pattern A below. Body shape mirrors the trigger POST: `{ candidatura_id, vaga_id }`.

**Output mapping (English Zod → pt-BR cols)** — `CvJobMatchSchema` (`00-shared-zod-schemas.ts:106-131`) returns English keys; the table is pt-BR. Map explicitly (CONTEXT D resolved: flatten objects to `text[]`):
```typescript
// result.parsed: CvJobMatch
const p = result.parsed as CvJobMatch
const row = {
  candidatura_id, vaga_id,
  score_match: p.match_score,                                    // L123
  pontos_fortes: p.strengths.map(s => s.competency),            // L109-113 → text[]
  gaps: p.gaps.map(g => g.requirement),                          // L115-119 → text[]
  resumo_respostas: p.reasoning,                                 // L107 (CoT)
  // resumo_cv: CvJobMatchSchema has NO resumo_cv field — CONTEXT resolves: EF extracts
  //   CV PDF text (unpdf), summarizes into resumo_cv; on extraction failure → flag 'cv_nao_extraido'
  flags: [...],
  status: 'sucesso',
}
```

**Never-absent-row invariant** (CONTEXT "não deixa row ausente"): wrap the whole analysis in try/catch; on ANY throw (`PromptNotConfiguredError`, `SchemaVersionMismatchError`, storage/PDF/DB) upsert `{ candidatura_id, status: 'falhou', erro }`. `UNIQUE(candidatura_id)` + `ON CONFLICT (candidatura_id) DO UPDATE` keeps exactly one row.

---

### `supabase/functions/comparativo-candidatos/index.ts` (edge-function, request-response)

**Analog:** `supabase/functions/submit-candidatura/index.ts` (two-client D-23, JWT verification ON)

**Body validation + JSON guards** (`submit-candidatura/index.ts:85-124`): content-length cap → `req.json()` → Zod `safeParse` → first-issue error. For comparativo, validate `{ vaga_id, candidatura_ids[] }` with 2-10 length.

**Two-client D-23** (`submit-candidatura/index.ts:126-170`) — JWT ON here (deploy WITHOUT `--no-verify-jwt`):
```typescript
const authHeader = req.headers.get('Authorization')
if (!authHeader) return errorResponse('UNAUTHORIZED', 'Sessão inválida.', undefined, 401)
// anon client WITH Authorization → auth.getUser() decodes the RH JWT
const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser()
if (userErr || !userRes?.user) return errorResponse('UNAUTHORIZED', 'Sessão inválida.', undefined, 401)
// service_role client ONLY for privileged reads/writes (never for auth)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
```

**Same-vaga validation** (RESEARCH §Code Examples, derived from `submit-candidatura` IDOR cross-check at `:151-178`):
```typescript
if (ids.length < 2 || ids.length > 10) return errorResponse('VALIDATION', 'Selecione 2 a 10 candidatos.', 400)
const { data: rows } = await supabaseAdmin
  .from('analise_candidato_vaga')
  .select('candidatura_id, vaga_id, score_match, pontos_fortes, gaps, flags, resumo_cv')  // ALLOWLIST
  .in('candidatura_id', ids)
const vagas = new Set(rows.map(r => r.vaga_id))
if (vagas.size !== 1 || rows.length !== ids.length)
  return errorResponse('VALIDATION', 'Os candidatos pertencem a vagas diferentes.', 400)
```

**AI call:** `loadPrompt('comparative_ranking', supabaseAdmin)` → `callAi` with `ComparativeRankingSchema` (`00-shared-zod-schemas.ts:139-164`). Feed the COMPACT pre-computed analyses (not raw CVs) + single-eval (CONTEXT resolved P95 ≤5s) — order candidates by `score_match` before building the prompt to anchor position-bias.

**Audit persistence:** `INSERT comparativo_solicitado (candidatura_ids, ranking JSON, latencia_ms)` via `supabaseAdmin` (RF-09 trail).

---

### `supabase/functions/_shared/prompt-loader.ts` (EDIT — config)

**Analog:** self. Add `comparative_ranking` to the `SCHEMA_VERSIONS` map (line 33-41) BEFORE wiring the comparativo EF — `loadPrompt('comparative_ranking', ...)` throws `SchemaVersionMismatchError` (line 57-72) otherwise:
```typescript
export const SCHEMA_VERSIONS: Record<string, string> = {
  cv_summary: "1.0.0",
  cv_job_match: "1.0.0",
  comparative_ranking: "1.0.0",   // ← ADD (Pitfall 1) — confirm seed semver matches
  sjt_evaluation: "1.0.0",
  // ...
}
```
Note the allowlist read convention at line 28-30 (`PROMPT_COLUMNS`, never `select('*')`) — the new tables' reads must follow the same.

---

### `supabase/migrations/…_analise_trigger.sql` (migration, event-driven)

**Analog:** `notify_cost_anomaly()` in `20260609000002_prompt_library_rpcs.sql:249-327` (verbatim pg_net template)

**Trigger function** — copy structure from L249-322, adapt guard + URL + body:
```sql
CREATE OR REPLACE FUNCTION public.trg_candidatura_analise()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_project_url text; v_invoke_key text;
BEGIN
  -- Only survivors (post-knockout). Knockouts are status='rejeitado' (20260608000001:193).
  IF NEW.status = 'rejeitado' OR NEW.opcao_knockout_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name='project_url';   -- L296-297
  SELECT decrypted_secret INTO v_invoke_key  FROM vault.decrypted_secrets WHERE name='edge_invoke_key'; -- L298-299
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN RETURN NEW; END IF;   -- graceful skip L301-303
  PERFORM net.http_post(                                                       -- L305-318
    url := v_project_url || '/functions/v1/analise-candidato-individual',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || v_invoke_key),
    body := jsonb_build_object('candidatura_id', NEW.id, 'vaga_id', NEW.vaga_id)
  );
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_candidaturas_analise ON public.candidaturas;       -- L324-327
CREATE TRIGGER trg_candidaturas_analise AFTER INSERT ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.trg_candidatura_analise();
```
**Vault secrets** `project_url` + `edge_invoke_key` already exist (Phase 9 P07) — REUSE, no new secret. **Authoring:** NO `BEGIN;…COMMIT;` wrapper (D-22 / Pitfall 7 / CLAUDE.md §Migrations); if 42601 still fires, apply via Supabase MCP `execute_sql` + reconcile version rows.

---

### `supabase/migrations/…_analise_tables.sql` (migration, CRUD + RLS)

**Analog:** `20260607000006_rls_policies_m2_backbone.sql:34-77` (RLS app_metadata.role idiom)

**RLS pattern** — `analise_candidato_vaga` + `comparativo_solicitado`: candidato DENY entirely; RH/admin read (and the EF writes via service_role, which bypasses RLS). Copy the JWT idiom (L46-49):
```sql
ALTER TABLE public.analise_candidato_vaga ENABLE ROW LEVEL SECURITY;
-- RH/admin read (candidato gets NO policy → denied, the [[reference_select_star_leaks_pii]] lesson)
DROP POLICY IF EXISTS rh_le_analise ON public.analise_candidato_vaga;
CREATE POLICY rh_le_analise ON public.analise_candidato_vaga
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')   -- L48
  );
-- NO candidato SELECT policy, NO anon policy → candidato cannot read score/flags/gaps.
-- NO INSERT/UPDATE policy → only service_role (EF) writes (bypasses RLS).
```
Note `(select auth.uid())` / `(select auth.jwt() …)` are wrapped in subselects (L41, L48) for the RLS init-plan optimization — keep that form.

---

### `src/features/triagem/services/triagemService.ts` (service, CRUD + request-response)

**Analog (read):** `candidaturasService.ts:1145-1229` (`listCandidaturasByVaga`)

**Allowlist projection — REPLACES the `select('*')` hazard** (the analog at `:1158-1176` does `select('*', candidato:candidatos(…, data_nascimento, cpf, …))` — the exact anti-pattern [[reference_select_star_leaks_pii]] warns against). The new read MUST be explicit, joining `analise_candidato_vaga`, with NO cpf/data_nascimento/email/celular:
```typescript
let query = supabase
  .from('candidaturas')
  .select(`
    id, status, etapa_atual, created_at, curriculo_nome_original,
    candidato:candidatos ( id, nome_completo ),
    analise:analise_candidato_vaga ( score_match, pontos_fortes, gaps, flags, status )
  `, { count: 'exact' })
  .eq('vaga_id', vagaId)
  .is('deleted_at', null)
```

**Pagination + ordering** (`:1197-1214`): keep `.range(from, to)` math (`from = (page-1)*limit`); default order `score_match DESC` with **nulls-last** (pendente/falhou rows sort to the end — CONTEXT). Filters via `.eq('status', …)` / `.eq('etapa_atual', …)` (`:1181-1187`). Error → throw `CandidaturasServiceError`-style class (`:1219-1225`).

**Analog (invoke):** `candidaturasService.ts:1328-1382` (`submitCandidaturaWithRespostas`) — the `supabase.functions.invoke` wrapper shape for the comparativo call:
```typescript
const { data, error } = await supabase.functions.invoke('comparativo-candidatos', {
  body: { vaga_id, candidatura_ids },   // mirrors :1341-1344
})
if (error) throw /* NETWORK_ERROR */    // :1346-1358
if (!data?.ok) /* map error_code */     // :1360-1382 — incl. EF 400 mixed-vaga → UI copy
return data   // { ranking, latencia_ms }
```

---

### `src/features/triagem/hooks/useTriagemPanel.ts` + `useComparativo.ts` (hooks)

**Analog:** `useCandidaturas.ts:51-117`

**Query keys** (hierarchical, mirror `candidaturasKeys` L51-70):
```typescript
export const triagemKeys = {
  all: ['triagem'] as const,
  panel: (vagaId: string, filters?, orderBy?, pagination?) =>
    [...triagemKeys.all, 'panel', vagaId, { filters, orderBy, pagination }] as const,
  comparativo: (vagaId: string, ids: string[]) =>
    [...triagemKeys.all, 'comparativo', vagaId, ids.slice().sort()] as const,
}
```

**useQuery shape** (`useCandidaturas.ts:102-116`): `queryKey: triagemKeys.panel(...)`, `queryFn`, `enabled: !!vagaId`, `staleTime`, `gcTime`, `retry: 2`. **useComparativo** = `useMutation` wrapping the invoke service method (no analog mutation cited inline — follow the invoke service + `toast` (line 21) on error).

---

### `src/components/pages/VagaCandidatosRHPage.tsx` (REWORK, component)

**Analog:** self — KEEP the RHLayout/glass shell, header block, filter bar; SWAP the glass-cards list for `<TriagemTable>`.

**Preserved imports/shell** (lines 13-45): `RHLayout`, `Glass`/`GlassButton`, lucide icons (add `Sparkles`, `RefreshCw`, `Download`, `AlertTriangle`), `useParams`/`useNavigate`, `format`/`ptBR`. **Reuse** `STATUS_COLORS`/`STATUS_LABELS` (lines 50-69) for the Status column badge (UI-SPEC §A col 7). Swap the data hook to `useTriagemPanel`.

---

### `src/features/triagem/components/TriagemTable.tsx` + `ComparativoScreen.tsx` + `SugestaoIABadge.tsx`

**Analog:** `src/components/ui/{table,badge,checkbox,pagination,tooltip,alert-dialog}.tsx` (all vendored) + UI-SPEC §A/§B/§C. First RH use of `table.tsx`. Score-band chip rules, accent reservations, copy strings are fully specified in UI-SPEC (do not invent). Inline Avançar/Rejeitar call the existing `avancar_etapa` RPC flow via `alert-dialog.tsx` confirm.

---

## Shared Patterns

### A. AI runtime composition (apply to BOTH new EFs)
**Source:** `supabase/functions/_shared/ai-client.ts:85-101` (`resolvedPromptFromLoaded`), `:249-387` (`callAi`)
**Apply to:** `analise-candidato-individual`, `comparativo-candidatos`
```typescript
import { callAi, loadPrompt, resolvedPromptFromLoaded } from "../_shared/ai-client.ts"
import Anthropic from "npm:@anthropic-ai/sdk@0.102.0"
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod"
import OpenAI from "npm:openai@6.42.0"
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod"

const loaded = await loadPrompt('cv_job_match', supabaseAdmin)
const prompt = resolvedPromptFromLoaded(loaded, 'cv_job_match', 'gpt-4o-mini')
const result = await callAi(
  { prompt, rawInput, vagaRubricBlock, candidato_id, vaga_id,
    schema: CvJobMatchSchema, idempotency_key: candidatura_id },
  { anthropic: new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') }),
    openai:    new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') }),
    supabase:  supabaseAdmin, zodOutputFormat, zodResponseFormat })
```
**Key invariant (ai-client.ts:249-359):** `callAi` ALREADY does idempotency-replay → injection-detect → maskPII → breaker → Anthropic(parse+ephemeral-cache+3x retry) → OpenAI fallback → cost → `logAiCall` (writes `ai_call_logs`). **DO NOT re-implement any of it.** For a deliberate reprocess, pass a FRESH `idempotency_key` (e.g. `${candidatura_id}:retry:${ts}`) so it doesn't replay the stale failed result (Pitfall 8 / `ai-client.ts:212-239`).

### B. Zod schemas copied into `_shared/` (EF import scope)
**Source:** `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts:106` (CvJobMatch), `:139` (ComparativeRanking)
**Apply to:** both EFs — **`docs/` is NOT deployed with the function.** Copy the two schemas into `supabase/functions/_shared/` and import from there (anti-pattern: reaching into `docs/` at EF runtime).

### C. Service-role write client
**Source:** `cost-alerter/index.ts:164-166` / `submit-candidatura/index.ts:154-156`
**Apply to:** both EFs — `createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })` for all privileged reads/writes; never for auth.

### D. Redacted logging (Pitfall 7 / LGPD)
**Source:** `candidaturasService.ts:1331-1337`, `cost-alerter/index.ts:190-193,261-264`
**Apply to:** every new file — log only ids + counts + error `.message`/`.code`; never CV text, respostas, score, nome, cpf. Extend the existing `forbidden-strings.grep` allowlist to the new paths.

### E. Migration authoring (no BEGIN/COMMIT wrapper)
**Source:** CLAUDE.md §Migrations / D-22 / Pitfall 7
**Apply to:** both new migrations — author WITHOUT `BEGIN;…COMMIT;`; on 42601, apply via Supabase MCP `execute_sql` + reconcile version rows; regenerate `database.types.ts` (repo ROOT) after apply.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/features/triagem/pdf/exportComparativo.ts` | utility | file-I/O | No PDF lib exists in repo; `jspdf@4.2.1` + `jspdf-autotable@5.0.8` are NEW deps. Use RESEARCH §Code Examples "PDF export (candidates as columns)" as the template (`autoTable(doc, { head, body })`, attributes-as-rows, `doc.save(...)`). |

---

## Cross-cutting BLOCKING runtime steps (planner: schedule as human/MCP-gated tasks)
1. **Flip prompts active** (Pitfall 2): `UPDATE prompt_versions SET is_active=true WHERE call_type IN ('cv_job_match','comparative_ranking') AND is_canary=false` in PROD — seeded `is_active=false` (`20260609000004_prompt_library_seed.sql`).
2. **Deploy EFs:** `analise-candidato-individual` WITH `--no-verify-jwt`; `comparativo-candidatos` WITHOUT.
3. **Confirm Vault secrets** exist: `select name from vault.decrypted_secrets` (expect `project_url`, `edge_invoke_key`).
4. **Confirm EF secrets:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` deployed to the new functions.
5. **`npm install jspdf@4.2.1 jspdf-autotable@5.0.8`** + commit lockfile; **`npm run db:types`** after migration apply.

---

## Metadata

**Analog search scope:** `supabase/functions/` (cost-alerter, submit-candidatura, _shared), `supabase/migrations/` (RLS backbone, prompt_library_rpcs, knockout), `docs/conhecimento/prompts/templates/`, `src/features/vagas/{services,hooks}`, `src/components/pages/`, `src/components/ui/`
**Files scanned:** ~12 read (targeted, non-overlapping ranges) + grep sweeps for `functions.invoke` and knockout columns
**Pattern extraction date:** 2026-06-08
