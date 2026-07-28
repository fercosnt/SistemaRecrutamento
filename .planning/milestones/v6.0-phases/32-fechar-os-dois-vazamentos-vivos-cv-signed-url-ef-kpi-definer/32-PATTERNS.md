# Phase 32: Fechar os Dois Vazamentos Vivos — CV Signed-URL EF + KPI DEFINER RPC - Pattern Map

**Mapped:** 2026-07-15
**Files analyzed:** 8 (5 new / 3 modified)
**Analogs found:** 8 / 8 (every file has an exact, PROD-live in-repo analog)

> This phase is *reuse-and-tighten*, not new invention. Every load-bearing line below is a verbatim copy of shipped, PROD-live code named by 32-RESEARCH.md §Sources. The behavioral JWT-impersonated smoke (`seg32_smokes.sql`) is the authoritative acceptance gate — above any structural `pg_policies`/grep check (P24 precedent).

## ⚠️ Sequencing Landmine (read before planning waves)

The EF deploy and the policy-drop migration have an **implicit runtime dependency**. Order the waves:

1. **Deploy `get-curriculo-url`** (JWT-ON) — the new privileged CV path must be live first.
2. **Rewire client** `cvUploadService.getSignedUrl` → `functions.invoke`.
3. **Apply the policy-drop migration** (removes the RH role-only Storage read branch).
4. **Run `seg32_smokes.sql`** via MCP `execute_sql` (+ `deno test` for the EF, + Vitest for client/guard).

Dropping the Storage branch before the EF is live leaves RH with **no CV path at all** (client `createSignedUrl` denied, EF not yet deployed). Blast radius today is minimal (no live component consumer — only tests), but the order is correctness-load-bearing for P34.

Also: MCP `apply_migration` writes a timestamp version row ≠ filename → **reconcile `supabase_migrations.schema_migrations`** (P31/P11 precedent). Regen `database.types.ts` (repo ROOT, not `src/types/`) via `npm run db:types` after `funil_kpis` lands.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/get-curriculo-url/index.ts` (NEW) | edge-function (controller) | request-response | `supabase/functions/comparativo-candidatos/index.ts` | exact |
| `supabase/functions/get-curriculo-url/index.test.ts` (NEW) | test (deno unit) | request-response | `supabase/functions/submit-candidatura/index.test.ts` | exact |
| `supabase/migrations/…_curriculos_drop_rh_read.sql` (NEW) | migration (Storage RLS) | policy DROP+CREATE | `supabase/migrations/20260425000002_curriculos_bucket.sql` | exact |
| `supabase/migrations/…_funil_kpis_and_rh_le_historico.sql` (NEW) | migration (DEFINER RPC + RLS) | CRUD-aggregate / policy | `…get_avaliacao_status.sql` + `redacao_rh_select` + `rh_le_historico` | exact (3 composed) |
| `supabase/tests/seg32_smokes.sql` (NEW) | test (behavioral smoke) | JWT-impersonated | `supabase/tests/funil12_status_rpc_smoke.sql` + `sec02_smokes.sql` | exact |
| `src/features/vagas/services/cvUploadService.ts` (MOD) | service | request-response (invoke) | `src/features/admin/services/usuariosRhService.ts` (`invokeWrite`) | role+flow match |
| `src/__tests__/guards/no-service-role-src.grep.test.ts` (MOD) | test (build-time guard) | static scan | *self* (extend existing scaffold) | self-extend |
| `src/features/vagas/services/__tests__/cvUploadService.test.ts` (MOD) | test (Vitest unit) | request-response | *self* (T3.1/T3.2 block) + mock idiom | self-modify |

---

## Pattern Assignments

### `supabase/functions/get-curriculo-url/index.ts` (edge-function, request-response)

**Analog:** `supabase/functions/comparativo-candidatos/index.ts` — clone the two-client authorize-THEN-authenticate skeleton character-for-character on the security-load-bearing lines.

**Imports + CORS + response helpers** (`comparativo-candidatos/index.ts:36`, `60-77`):
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";   // static npm/esm — NOT .join("npm:")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "SERVER_ERROR";
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status);
}
```
> Note: `comparativo` uses `"MIXED_VAGA"` in its ErrorCode union; `get-curriculo-url` swaps that for `"NOT_FOUND"` (nullable `curriculo_url` → 404). Same envelope `{ ok, error_code, message }`.

**Injectable deps + testable handler entry** (`comparativo-candidatos/index.ts:83-114`):
```typescript
export interface Deps { supabaseAdmin: any; supabaseUser: any }  // deno-lint-ignore no-explicit-any

export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);
  const { supabaseAdmin, supabaseUser } = deps;
```

**AUTHENTICATE (anon client) — verbatim** (`comparativo-candidatos/index.ts:118-123`):
```typescript
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;
```

**AUTHORIZE role — read from `usuarios_rh` via service_role, map `recrutador→rh`** (`comparativo-candidatos/index.ts:136-151` — the load-bearing block; the comment at `:131-135` explains why role is NOT `getUser().app_metadata`):
```typescript
const { data: rhRow } = await supabaseAdmin
  .from("usuarios_rh").select("role")
  .eq("user_id", user.id).eq("ativo", true).is("deleted_at", null).maybeSingle();
const dbRole = (rhRow?.role as string | undefined) ?? null;
const role = dbRole === "recrutador" ? "rh" : dbRole === "administrador" ? "administrador" : dbRole;
if (role !== "rh" && role !== "administrador") return errorResponse("FORBIDDEN", "Acesso negado.", 403);
```

**AUTHORIZE ownership — role='rh' must own the vaga; administrador bypasses** (`comparativo-candidatos/index.ts:182-194`):
```typescript
if (role === "rh") {
  const { data: vagaRow, error: vagaErr } = await supabaseAdmin
    .from("vagas").select("created_by").eq("id", <cand.vaga_id>).maybeSingle();
  if (vagaErr) return errorResponse("SERVER_ERROR", "Falha ao verificar a vaga.", 500);
  if (!vagaRow || vagaRow.created_by !== user.id) return errorResponse("FORBIDDEN", "Acesso negado.", 403);
}
```

**Deno.serve production wiring — two-client from env + Authorization** (`comparativo-candidatos/index.ts:310-338`; drop the Anthropic/OpenAI construction — get-curriculo-url has no AI):
```typescript
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });   // preflight BEFORE authHeader guard
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    return await handler(req, { supabaseAdmin, supabaseUser });
  });
}
```

**Phase-specific body (NOT in the analog — from 32-RESEARCH §Code Examples #1):**
- Parse body → `candidatura_id: string` ONLY (never a raw `path`; forgeable). Recommend zod `.strict()`.
- Resolve path server-side, allowlist projection (never `select('*')` — [[reference_select_star_leaks_pii]]):
  `supabaseAdmin.from("candidaturas").select("curriculo_url, vaga_id").eq("id", candidatura_id).maybeSingle()`
  → `!cand || !cand.curriculo_url` → **404 NOT_FOUND**.
- Mint 60s URL: `supabaseAdmin.storage.from("curriculos").createSignedUrl(cand.curriculo_url, 60)` → `{ ok: true, signedUrl }` 200.
- **NEVER `console.*` the signedUrl** (Pitfall 7 redaction). `curriculo_url` is stored as `{auth.uid()}/{uuid}.pdf` (no bucket prefix, no leading slash) — exactly what `createSignedUrl(path,…)` expects.

**Env note:** needs ONLY the auto-injected `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`. **No Vault secret** (`project_url`/`edge_invoke_key` are for DB→EF pg_net, not client→EF invoke).

---

### `supabase/functions/get-curriculo-url/index.test.ts` (test, deno unit)

**Analog:** `supabase/functions/submit-candidatura/index.test.ts` — `loadHandler()` + `makeChainable` mocks (index.ts guards `Deno.serve` with `import.meta.main`, so importing does NOT boot a server).

**Chainable query-builder mock** (`submit-candidatura/index.test.ts:61-75`):
```typescript
// deno-lint-ignore no-explicit-any
function makeChainable(result: { data: unknown; error: unknown }): any {
  const chain: any = {
    select: () => chain, eq: () => chain, is: () => chain, in: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (onF, onR?) => Promise.resolve(result).then(onF, onR),
  };
  return chain;
}
```
> For this EF, `makeMockSupabaseAdmin` routes `from("usuarios_rh")` → role row, `from("candidaturas")` → `{curriculo_url, vaga_id}`, `from("vagas")` → `{created_by}`, and stubs `storage.from("curriculos").createSignedUrl` → `{ data: { signedUrl }, error: null }`.

**getUser mock** (`submit-candidatura/index.test.ts:123-133`):
```typescript
function makeMockSupabaseUser(user: Record<string, unknown> | null) {
  return { auth: { getUser: () => Promise.resolve({ data: { user }, error: user ? null : new Error("no user") }) } };
}
```

**loadHandler + makeRequest** (`submit-candidatura/index.test.ts:135-153`):
```typescript
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
async function loadHandler() {
  const mod = await import("./index.ts");
  return mod as { handler: (req: Request, deps: { supabaseAdmin: unknown; supabaseUser: unknown }) => Promise<Response> };
}
function makeRequest(body: unknown, withAuth = true): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withAuth) headers.Authorization = "Bearer rh-jwt";
  return new Request("http://localhost/functions/v1/get-curriculo-url",
    { method: "POST", headers, body: JSON.stringify(body) });
}
```

**Assertion shape** (`submit-candidatura/index.test.ts:171-179`) — 5 branches to cover (per 32-RESEARCH §Test Map): no session → **401**; `candidato`/non-owner `rh` → **403**; missing/NULL CV → **404**; owner/admin → **200 signedUrl**. This is the authoritative role='rh'-non-owner→403 gate (no recruiter PROD account for a live curl — Pitfall 6).

Run: `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/get-curriculo-url`

---

### `…_curriculos_drop_rh_read.sql` (migration, Storage RLS)

**Analog:** `supabase/migrations/20260425000002_curriculos_bucket.sql:54-68` — DROP the whole policy, re-CREATE with the **candidate own-folder branch ONLY** (there is no per-branch DROP; the RH `OR` clause at L64-67 is removed).

**Current policy (the leak) — `20260425000002_curriculos_bucket.sql:55-68`:**
```sql
CREATE POLICY "curriculos_select_own_or_rh"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'curriculos'
  AND (
    (storage.foldername(name))[1] = (select auth.uid()::text)                    -- KEEP (candidate own-folder)
    OR
    (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')     -- REMOVE (role-only RH leak, L64-67)
  )
);
```

**New form (candidate branch only; no BEGIN/COMMIT wrapper — D-22):**
```sql
DROP POLICY IF EXISTS "curriculos_select_own_or_rh" ON storage.objects;
CREATE POLICY "curriculos_select_own_or_rh"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'curriculos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);
```
> `curriculos_insert_own` / `update_own` / `delete_own` (`20260425000002:70-102`): **UNTOUCHED**. The EF (service_role) is the only RH CV path after this. Policy-rename to `curriculos_select_own` is cosmetic — Claude's discretion. The behavioral smoke (RH base-storage read denied) is the gate, not `pg_policies` (Pitfall 3).

---

### `…_funil_kpis_and_rh_le_historico.sql` (migration, DEFINER RPC + RLS) — 3 composed analogs

**Analog A — DEFINER jsonb skeleton:** `supabase/migrations/20260712100003_funil12_get_avaliacao_status.sql:56-116`.

**Copy the header discipline verbatim** (`get_avaliacao_status.sql:56-61`, `:115-116`):
```sql
CREATE OR REPLACE FUNCTION public.funil_kpis(p_vaga_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''          -- Pitfall 2: EVERY object must be schema-qualified (public./auth.)
AS $$
...
$$;
REVOKE ALL ON FUNCTION public.funil_kpis(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.funil_kpis(uuid) TO authenticated;
```
Body scope-guard idiom (`get_avaliacao_status.sql:66-77`): `auth.uid()` / `auth.jwt()` read the per-request `request.jwt.claims` GUC → survive `SECURITY DEFINER` (the "Phase-6 proof"). Internal scope: `WHERE (v_is_admin OR v.created_by = auth.uid()) AND (p_vaga_id IS NULL OR v.id = p_vaga_id)`. Return a single `jsonb` (median-time-per-stage via `percentile_cont(0.5)` over `LEAD` deltas + raw stage→stage counts + volume). **PII-safe by construction** — CTEs select only `candidatura_id / etapa_* / criado_em / vaga_id`; NEVER `ator` or any `candidatos` column (see 32-RESEARCH §Code Examples #3 for the full CTE shape + Pitfall 5 on excluding NULL `LEAD` deltas).

**Analog B — `rh_le_historico` WR-04 hardening:** copy the join form of `redacao_rh_select` from `20260706110004_sec05_08_vaga_scope.sql:94-104` verbatim (this is the sweep `sec05_08` explicitly deferred at `:126-131`).

Current role-only policy to replace (`20260607000006_rls_policies_m2_backbone.sql:73-77`):
```sql
CREATE POLICY rh_le_historico ON public.historico_candidatura FOR SELECT USING (
  (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')   -- role-only leak
);
```

WR-04 predicate to copy (`sec05_08_vaga_scope.sql:94-104` — `historico_candidatura` has no direct `vaga_id`, so scope via `candidatura_id` → `candidaturas` → `vagas`):
```sql
DROP POLICY IF EXISTS rh_le_historico ON public.historico_candidatura;
CREATE POLICY rh_le_historico ON public.historico_candidatura
  FOR SELECT TO authenticated
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  );
```
> Keep `candidato_le_proprio_historico` (`20260607000006:61-70`) **UNTOUCHED**. Add **NO** INSERT policy — `historico_candidatura` is written only by the `avancar_etapa` trigger inside the authorized `candidaturas` UPDATE txn (`20260607000006:79-81`). The `(select auth.jwt() …)` / `(select auth.uid())` wrapping is the planner-cache idiom — keep verbatim.

Apply via **MCP `apply_migration`** (bypasses SQLSTATE 42601 on `$$`+adjacent REVOKE/GRANT), NO outer `BEGIN;…COMMIT;` (D-22), then reconcile `supabase_migrations.schema_migrations`.

---

### `supabase/tests/seg32_smokes.sql` (test, JWT-impersonated behavioral smoke)

**Analog:** `supabase/tests/funil12_status_rpc_smoke.sql` (disposable fixture + walk-the-jsonb + IDOR) and `supabase/tests/sec02_smokes.sql:26-92` (impersonate-and-deny form). This smoke is the **load-bearing acceptance gate** (P24: smokes caught a REVOKE no-op + OR-defeat that structural checks passed).

**Fixture + impersonation idiom** (`funil12_status_rpc_smoke.sql:41-88`) — privileged setup discovers a real candidato with `user_id`, builds a **disposable** fixture (fixed UUIDs, idempotent pre-delete, ROLLBACK-free cleanup, real rows NEVER deleted). For SEG-32 the fixture needs **two recruiters owning distinct vagas** (A + B), one candidatura on B's vaga with a CV path, and a couple of `historico_candidatura` rows for a median:
```sql
RESET ROLE;
DO $$ DECLARE ... BEGIN
  DELETE FROM public.candidaturas WHERE id = '<fixed>';   -- idempotent (children cascade)
  DELETE FROM public.vagas WHERE id IN ('<vagaA>','<vagaB>');
  INSERT INTO public.vagas (...) VALUES (...);             -- vagaA created_by=recruiterA, vagaB created_by=recruiterB
  ...
  PERFORM set_config('smoke.ready', 'y', false);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke.ready', 'n', false);
  RAISE NOTICE 'SEG-32 SKIP: fixture could not be built (%: %)', SQLSTATE, SQLERRM;
END $$;
```

**Impersonate + assert (per assertion: NOTICE 'PASS …' = PASS, EXCEPTION = FAIL)** (`funil12_status_rpc_smoke.sql:94-107`, `sec02_smokes.sql:26-43`):
```sql
SET ROLE authenticated;
DO $$ BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-32 SKIP'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.recruiterA'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  -- ... run the assertion, RAISE EXCEPTION on leak, RAISE NOTICE 'PASS ...' on deny
END $$;
```

**Cleanup — ROLLBACK-free** (`funil12_status_rpc_smoke.sql:155-160`):
```sql
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
DELETE FROM public.candidaturas WHERE id = '<fixed>';
DELETE FROM public.vagas WHERE id IN ('<vagaA>','<vagaB>');
SELECT set_config('smoke.ready', '', false);
```

**The 5 assertions (32-CONTEXT `<decisions>` / RESEARCH §Test Map):**
- (a) recruiter A does NOT obtain B's candidate CV via the EF (403/deny) — DB-layer deny + the deno unit test.
- (b) recruiter A does NOT see B's vaga numbers via `funil_kpis` (aggregates scoped to A's owned vagas).
- (c) recruiter A cannot SELECT B's `historico_candidatura` (RLS deny — walk `sec02_smokes.sql:36-43` deny form: 42501 OR 0 rows = PASS; a value = FAIL).
- (d) `funil_kpis` returns zero PII — walk the jsonb (`funil12_status_rpc_smoke.sql:109-123`) asserting no `ator`/candidate-id/name/email key.
- (e) admin sees all; admin+`p_vaga_id` narrows; owner scope holds.

Run via MCP `execute_sql` AFTER the migration applies + EF deploy.

---

### `src/features/vagas/services/cvUploadService.ts` (service, MODIFIED)

**Analog:** `src/features/admin/services/usuariosRhService.ts:130-152` (`invokeWrite`) for the `functions.invoke` idiom. Signature changes `getSignedUrl(path)` → `getSignedUrl(candidaturaId)`.

**Current implementation to replace** (`cvUploadService.ts:193-206`):
```typescript
export async function getSignedUrl(path: string): Promise<string> {
  const EXPIRES_IN_SECONDS = 3600
  const { data, error } = await supabase.storage.from('curriculos').createSignedUrl(path, EXPIRES_IN_SECONDS)
  if (error || !data?.signedUrl) {
    throw new CVUploadServiceError('Não foi possível gerar URL de download', 'UPLOAD_FAILED', error)
  }
  return data.signedUrl   // DO NOT log — Pitfall 7
}
```

**invoke idiom to adopt** (`usuariosRhService.ts:133-139`):
```typescript
const { data, error } = await supabase.functions.invoke('gerenciar-usuario-rh', { body })
const error_code = await extractEfErrorCode(data, error)   // @/lib/efErrors — code-only, never PII
if (error) { throw toServiceError(error_code, { error_code, raw: error }) }
```

**New shape (32-RESEARCH §Code Examples #5):**
```typescript
export async function getSignedUrl(candidaturaId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-curriculo-url', {
    body: { candidatura_id: candidaturaId },
  })
  if (error || !data?.signedUrl) {
    throw new CVUploadServiceError('Não foi possível gerar URL de download', 'UPLOAD_FAILED', error ?? data)
  }
  return data.signedUrl as string   // DO NOT log — Pitfall 7
}
```
> `CVUploadServiceError` (`cvUploadService.ts:34-45`) already carries `'UPLOAD_FAILED'` + `details` — keep it. `import { supabase } from '@/lib/supabase/client'` is already present (`:25`). Optionally normalize the EF error via `extractEfErrorCode` from `@/lib/efErrors` (usuariosRhService precedent) into `.details`. There is NO live component consumer today — only the test — so the type-check-green rewire is the whole surface.

---

### `src/__tests__/guards/no-service-role-src.grep.test.ts` (test, MODIFIED — self-extend)

**Analog:** *self* — the existing `collectFiles` / `isCommentLine` / positive-negative-contract scaffold (`no-service-role-src.grep.test.ts:50-157`) is the copy target. It already scans `src/` (skips `__tests__`, comment-aware). Extend with a second tripwire: a **client-side `createSignedUrl` over the `curriculos` bucket must not appear anywhere in `src/`** (the EF is the only signer now — SEG-01 success criterion (e)).

**Existing forbidden-token structure to extend** (`no-service-role-src.grep.test.ts:50-73`):
```typescript
const FORBIDDEN_TOKENS: { name: string; re: RegExp }[] = [
  { name: 'SUPABASE_SERVICE_ROLE_KEY', re: /\bSUPABASE_SERVICE_ROLE_KEY\b/ },
  { name: 'service_role', re: /\bservice_role\b/i },
  { name: 'serviceRoleKey', re: /\bserviceRoleKey\b/ },
  // ADD (SEG-01): a client createSignedUrl must not survive under src/ (EF-only signer now)
  // { name: 'createSignedUrl', re: /\bcreateSignedUrl\b/ },
]
export function firstServiceRoleViolation(text: string): string | null {
  for (const { name, re } of FORBIDDEN_TOKENS) { if (re.test(text)) return name }
  if (CREATE_CLIENT_ADMIN_RE.test(text)) return 'createClient(service_role)'
  return null
}
```
> Two viable shapes (Claude's discretion): (a) add a `createSignedUrl`-in-`src/` token here, OR (b) a focused assertion in `forbidden-strings.grep.test.ts`. Preferred precise form: assert `cvUploadService.ts` contains `functions.invoke('get-curriculo-url')` and NO `createSignedUrl` token. Add matching positive/negative-contract `it()` cases (`:125-151` scaffold) so the guard cannot self-trip.

---

### `src/features/vagas/services/__tests__/cvUploadService.test.ts` (test, MODIFIED)

**Analog:** *self* — the `getSignedUrl` block (`cvUploadService.test.ts:230-260`, T3.1/T3.2) plus the `vi.hoisted` supabase-mock idiom (`:23-39`). Swap the `storage.from().createSignedUrl` mock for a `supabase.functions.invoke` mock.

**Current mock (to change)** (`cvUploadService.test.ts:23-39`):
```typescript
const { mockUpload, mockCreateSignedUrl, mockRemove, mockFrom } = vi.hoisted(() => { ... })
vi.mock('@/lib/supabase/client', () => ({ supabase: { storage: { from: mockFrom } } }))
```
Add a hoisted `mockInvoke = vi.fn()` and extend the mock: `supabase: { storage: { from: mockFrom }, functions: { invoke: mockInvoke } }`.

**Current T3.1/T3.2 (to rewrite)** (`cvUploadService.test.ts:230-259`):
```typescript
it('T3.1: happy path returns signed URL string', async () => {
  mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.com/signed?token=abc' }, error: null })
  const url = await getSignedUrl('auth-uid/file.pdf')
  expect(url).toBe('https://example.com/signed?token=abc')
  expect(mockCreateSignedUrl).toHaveBeenCalledWith('auth-uid/file.pdf', 3600)   // ← becomes functions.invoke(...)
})
```
New: `mockInvoke.mockResolvedValue({ data: { signedUrl }, error: null })`; call `getSignedUrl(candidaturaId)`; assert `mockInvoke` was called with `'get-curriculo-url'`, `{ body: { candidatura_id: candidaturaId } }`. T3.2 error case → `mockInvoke.mockResolvedValue({ data: null, error: {...} })` still throws `UPLOAD_FAILED`. Also update the Pitfall-7 console-spy path at `:299,318` (still exercises `getSignedUrl`).

---

## Shared Patterns

### Authorize-THEN-authenticate (D-23 two-client)
**Source:** `supabase/functions/comparativo-candidatos/index.ts:118-194,310-338`
**Apply to:** `get-curriculo-url/index.ts`
- Authenticate with the anon client (`supabaseUser.auth.getUser()`); authorize (role + ownership) with the service_role client. `authenticate ≠ authorize` — [[reference_ef_authenticate_vs_authorize]].
- Role comes from `usuarios_rh` (NOT `getUser().app_metadata.role` — the hook injects role only into signed JWT claims, `raw_app_meta_data` is null). Map `recrutador→rh`, `administrador→administrador`.
- Never accept a raw `path` from the client — resolve it from `candidatura_id` server-side (Tampering guard).

### SECURITY DEFINER hardening
**Source:** `supabase/migrations/20260712100003_funil12_get_avaliacao_status.sql:56-116`
**Apply to:** `funil_kpis` RPC
- `LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''` + fully-qualified names (`public.`, `auth.`) — Pitfall 2.
- `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE … TO authenticated`.
- `auth.uid()`/`auth.jwt()` survive DEFINER (read the request GUC). Return `jsonb` aggregates only — no PII.

### WR-04 vaga-scoped RLS predicate (join form, no direct vaga_id)
**Source:** `supabase/migrations/20260706110004_sec05_08_vaga_scope.sql:94-104` (`redacao_rh_select`)
**Apply to:** `rh_le_historico` hardening
- `admin bypass OR (rh AND <id> IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id=c.vaga_id WHERE v.created_by=(select auth.uid())))`.
- Keep the `(select auth.jwt() …)` / `(select auth.uid())` subquery-wrapping (planner-cache idiom) verbatim.

### Client → EF invoke with normalized error
**Source:** `src/features/admin/services/usuariosRhService.ts:130-152`
**Apply to:** `cvUploadService.getSignedUrl`
- `supabase.functions.invoke(name, { body })`; `extractEfErrorCode(data, error)` (`@/lib/efErrors`, code-only never PII); throw a typed service error. NEVER log the signed URL (Pitfall 7).

### JWT-impersonated behavioral smoke (the authoritative gate)
**Source:** `supabase/tests/funil12_status_rpc_smoke.sql`, `supabase/tests/sec02_smokes.sql`
**Apply to:** `seg32_smokes.sql`
- `SET ROLE authenticated` + `set_config('request.jwt.claims', …)` to impersonate; disposable fixed-UUID fixture; ROLLBACK-free cleanup; real rows never deleted; NOTICE 'PASS …' per assertion, EXCEPTION = FAIL. Above `pg_policies`/grep (P24 precedent).

## No Analog Found

None. Every new/modified file maps to a PROD-live in-repo analog (32-RESEARCH §Sources, HIGH confidence — all read in full this session).

## Metadata

**Analog search scope:** `supabase/functions/` (comparativo-candidatos, submit-candidatura), `supabase/migrations/` (get_avaliacao_status, sec05_08_vaga_scope, rls_policies_m2_backbone, curriculos_bucket), `supabase/tests/` (funil12_status_rpc_smoke, sec02_smokes), `src/features/vagas/services/` (cvUploadService + test), `src/features/admin/services/` (usuariosRhService), `src/__tests__/guards/` (no-service-role-src)
**Files scanned:** 11 analog files (all named with line numbers by 32-RESEARCH §Sources)
**Pattern extraction date:** 2026-07-15
