# Phase 28: Gestão de Usuários RH — Núcleo Seguro - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 9 (1 EF + 1 EF test + 1 shared schema + 4 migrations + 1 SQL smoke + 1 grep guard) + 1 regenerated artifact
**Analogs found:** 9 / 9 (every file has an in-repo precedent — this phase composes/hardens existing substrate; net-new logic is only the recursion-safe RLS helper + advisory-lock anti-lockout)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/gerenciar-usuario-rh/index.ts` | controller (EF handler) | request-response | `supabase/functions/consolidar-decisao-final/index.ts` (auth skeleton) + `supabase/functions/cadastrar-candidato/index.ts` (createUser+rollback) | exact (two analogs, split by concern) |
| `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts` | test (Deno, injected deps) | request-response | `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` | exact |
| `supabase/functions/_shared/usuario-rh-schemas.ts` | utility (Zod schema + error contract) | transform/validation | `supabase/functions/_shared/schemas.ts` | exact (same `.strict()` bare-zod idiom) |
| `supabase/migrations/<ts>_usr_rh_rls_seg02.sql` | migration (RLS policy rewrite + DEFINER helper) | event-driven (DB policy) | `supabase/migrations/20260706110006_sec09_auth_admin_policy.sql` (idempotent DROP+CREATE) + AVOID `docs/sql/sql/03-tabela-usuarios-rh.sql:114-150` (recursion trap) | exact + anti-pattern reference |
| `supabase/migrations/<ts>_usr_rh_anti_lockout.sql` | migration (trigger fn + BEFORE UPDATE/DELETE trigger) | event-driven (trigger) | `supabase/migrations/20260709000010_guard_rejeicao_auditada.sql` | exact (guard-fn + RAISE + idempotent bind + REVOKE) |
| `supabase/migrations/<ts>_usr_rh_mutacao_rpc.sql` | migration (SECURITY DEFINER mutate+audit RPC) | CRUD (atomic tx) | `docs/sql/sql/25-functions-configuracoes.sql:63-120` (`log_auditoria` sig + DEFINER) + `20260709000010:104` (REVOKE) | exact |
| `supabase/migrations/<ts>_logs_auditoria_append_only.sql` | migration (RLS hardening) | event-driven (DB policy) | `docs/sql/sql/28-rls-configuracoes.sql:232-259` (the exact `"Sistema insere logs"` policy to DROP + `"Admin vê logs"` to KEEP) | exact |
| `supabase/tests/usr_rh_*_smoke.sql` | test (behavioral SQL smoke, impersonated JWT) | event-driven | `supabase/tests/submit_candidatura_atomic_smokes.sql` | exact (set_config JWT claims, disposable fixture, ROLLBACK-free cleanup) |
| `src/__tests__/guards/no-service-role-src.grep.test.ts` (SEG-01) | test (Vitest node:fs grep guard) | file-I/O (read-only scan) | `src/__tests__/guards/rh-console.grep.test.ts` / `n8n-bundle.grep.test.ts` | exact (comment-aware node:fs walk) |
| `database.types.ts` (repo ROOT) | config (generated artifact) | — | — (regenerated via `supabase gen types`, NEVER hand-edited) | n/a |

---

## Pattern Assignments

### `supabase/functions/gerenciar-usuario-rh/index.ts` (controller, request-response)

**Primary analog:** `supabase/functions/consolidar-decisao-final/index.ts` (two-client authenticate-THEN-authorize)
**Secondary analog:** `supabase/functions/cadastrar-candidato/index.ts` (createUser + compensating rollback)

**Imports + CORS + error-contract helpers** (mirror `consolidar-decisao-final/index.ts:45-74`):
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gerenciarUsuarioRhSchema } from "../_shared/usuario-rh-schemas.ts"; // new module (see below)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status); // { ok, error_code, message, field? } contract
}
```

**Testable handler + injectable deps** (mirror `consolidar-decisao-final/index.ts:216-231`): export a `handler(req, { supabaseAdmin, supabaseUser })` so the Deno test injects mocks with no network; the `Deno.serve` block only wires real clients.

**Authenticate-THEN-authorize skeleton** — copy verbatim from `consolidar-decisao-final/index.ts:233-261` (this is THE load-bearing SEG-01 pattern):
```typescript
// 1. authenticate — anon client carries the caller Authorization header (two-client D-23)
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;

// 1b. authorize from the TABLE (never getUser().app_metadata — the injected role is NOT
//     in raw_app_meta_data). service_role read of usuarios_rh.
const { data: rhRow } = await supabaseAdmin
  .from("usuarios_rh").select("role")
  .eq("user_id", user.id).eq("ativo", true).is("deleted_at", null)
  .maybeSingle();
if (rhRow?.role !== "administrador") return errorResponse("FORBIDDEN", "Acesso negado.", 403);
// ...only now parse body + dispatch on action
```
> NOTE the deviation from the analog: consolidar maps `recrutador→'rh'` and allows both `rh` and `administrador`. This EF requires `role === 'administrador'` ONLY (a recrutador cannot manage users). Do NOT copy consolidar's `dbRole === "recrutador" ? "rh" : …` normalization — collapse it to the single admin check above.

**Body parse with `.strict()` Zod** (mirror `consolidar-decisao-final/index.ts:263-274` — safeParse → `VALIDATION` on failure):
```typescript
const raw = await req.json();
const parsed = gerenciarUsuarioRhSchema.safeParse(raw);
if (!parsed.success) return errorResponse("VALIDATION", "Payload inválido.");
const body = parsed.data; // discriminated union — body.action is narrowed
```

**createUser + compensating rollback** (`criar` action) — copy the two-write consistency from `cadastrar-candidato/index.ts:165-235`:
```typescript
// (a) createUser — password OPTIONAL; email_confirm:true auto-confirms (no confirmation mail)
const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
  email: input.email,
  password: crypto.randomUUID() + crypto.randomUUID(), // throwaway; user sets own via recovery
  email_confirm: true,
  user_metadata: { nome_completo: input.nome_completo },
});
if (authError || !authData?.user) {
  if (authError?.message?.toLowerCase().includes("already"))
    return errorResponse("EMAIL_EXISTS", "Este email já está cadastrado.", 409);
  return errorResponse("SERVER_ERROR", "Não foi possível criar o usuário.", 400);
}
const userId = authData.user.id;

// (b) row+audit in ONE tx via the DEFINER RPC (see mutacao_rpc). On failure → COMPENSATE.
const { error: rpcErr } = await supabaseAdmin.rpc("criar_usuario_rh_com_audit", { /* … */ });
if (rpcErr) {
  await supabaseAdmin.auth.admin.deleteUser(userId).catch((rollbackErr) => {
    console.error("[gerenciar-usuario-rh] rollback deleteUser failed:", { userId, rollbackErr });
  });
  return errorResponse("SERVER_ERROR", "Não foi possível registrar o usuário.");
}
// (c) best-effort recovery email — do NOT roll back on send failure (account exists; USR-05 retries)
```
> The `.catch()`-on-`deleteUser` orphan-cleanup at `cadastrar-candidato/index.ts:224-226` is the exact idiom.

**Deliver set-password link** (RESEARCH §Standard Stack decision — `resetPasswordForEmail`, NOT `generateLink`):
```typescript
await supabaseAdmin.auth.resetPasswordForEmail(input.email, {
  redirectTo: `${origin}/auth/redefinir-senha?tipo=rh`,
}).catch(() => {/* non-fatal → surface EMAIL_SEND_FAILED warning; account already created */});
```

**Deno.serve production wiring** — copy `consolidar-decisao-final/index.ts:429-458` verbatim (OPTIONS short-circuit, env-var guard, anon client WITH Authorization header, service_role client with `autoRefreshToken:false, persistSession:false`).

**Error codes** (structured contract, from RESEARCH §Code Examples): `"UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "EMAIL_EXISTS" | "LAST_ADMIN" | "EMAIL_SEND_FAILED" | "SERVER_ERROR"`. Map SQLSTATE `P0001` (anti-lockout RAISE) → `LAST_ADMIN`.

---

### `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts` (test, injected deps)

**Analog:** `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts`

**Test harness idiom** (mirror lines `39`, `142-158`): std assert import, dynamic `import("../index.ts")` in a `loadHandler()`, a `makeRequest(body)` builder with `Authorization: Bearer …`.
```typescript
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
async function loadHandler() { const mod = await import("../index.ts"); return mod as { handler: (req: Request, deps: { supabaseAdmin: unknown; supabaseUser: unknown }) => Promise<Response> }; }
```

**Mock two-client** (mirror `makeMockSupabaseAdmin` :70-132 and `makeMockSupabaseUser` :134-140): a chainable `from(table)` returning `.select().eq().eq().is().maybeSingle()` for the `usuarios_rh` role lookup, and `auth.getUser()` returning `{ data:{ user }, error }`. Add `auth.admin.createUser` / `auth.admin.deleteUser` / `rpc()` mocks for the `criar` rollback test.

**Authorize assertions** — clone the four cases at `:393-430`:
- unauthenticated (`makeMockSupabaseUser(null)`) → **401**
- authenticated non-admin (usuarios_rh role null / `'recrutador'`) → **403**
- active admin → dispatches (200)
- (this phase adds) `criar` orphan-rollback: force the `rpc` mock to error → assert `admin.deleteUser` was called (no orphan GoTrue user), per RESEARCH §Test Map.

---

### `supabase/functions/_shared/usuario-rh-schemas.ts` (utility, transform/validation)

**Analog:** `supabase/functions/_shared/schemas.ts`

**Bare-zod import + `.strict()` allowlist** (mirror `_shared/schemas.ts:28`, `:118-147`): import `{ z } from "zod"` (resolved by `supabase/functions/deno.json` import map `"zod":"npm:zod@3.25.76"` in Deno and by `node_modules` in Vitest — one module, no drift, CI-07). Every object gets `.strict()` (fail-closed: unknown key → Zod failure → EF maps to `VALIDATION`/400 BEFORE any write).

**Discriminated-union shape** (from RESEARCH §Code Examples — mirrors the `submitCandidaturaSchema` `.uuid()` + `.strict()` style at `_shared/schemas.ts:204-235`):
```typescript
import { z } from "zod";
const papel = z.enum(["recrutador", "administrador"]); // NOT the legacy 4-value DB CHECK ('gerente'/'visualizador' excluded)
export const gerenciarUsuarioRhSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("criar"),
             email: z.string().email().toLowerCase().trim(),
             nome_completo: z.string().min(3).max(255),   // NOT NULL on usuarios_rh (Pitfall 8)
             cargo: z.string().min(1).max(100),           // NOT NULL on usuarios_rh
             papel }).strict(),
  z.object({ action: z.literal("mudar_papel"), target_id: z.string().uuid(), novo_papel: papel }).strict(),
  z.object({ action: z.literal("ativar"),    target_id: z.string().uuid() }).strict(),
  z.object({ action: z.literal("desativar"), target_id: z.string().uuid() }).strict(),
  z.object({ action: z.literal("resetar_senha"), target_id: z.string().uuid() }).strict(),
]);
export type GerenciarUsuarioRhInput = z.infer<typeof gerenciarUsuarioRhSchema>;
```

**Error-code union + `zodPathToFieldName`** — reuse the exported-type pattern at `_shared/schemas.ts:159-198` (structured error contract + flat field-name mapping for the `field?` slot).

---

### `supabase/migrations/<ts>_usr_rh_rls_seg02.sql` (migration, RLS rewrite + DEFINER helper)

**Analog (structure):** `supabase/migrations/20260706110006_sec09_auth_admin_policy.sql`
**Anti-pattern to AVOID (verbatim recursion trap):** `docs/sql/sql/03-tabela-usuarios-rh.sql:114-150` (Policy 3/4/5 subquery `usuarios_rh` inside a `usuarios_rh` policy → `infinite recursion detected in policy`). Do NOT resurrect it.
**Preserve untouched:** the SEC-09 policy `auth_admin_le_usuarios_rh` (mirrored in `20260706110006`) and the hook `custom_access_token_hook` (`20260420000002_unified_auth_role.sql:32-98` — do NOT `CREATE OR REPLACE` it; RESEARCH Pitfall 4 / A2 — the live body already filters `ativo AND deleted_at IS NULL`, so USR-04 needs NO hook change; `pg_get_functiondef` in Wave 0 before any touch).

**Authoring conventions** (from `20260706110006:40-42`): NO outer `BEGIN;/COMMIT;` wrapper (the driver wraps each migration; an outer wrapper triggers 42601). Applied via Supabase MCP `apply_migration` in a [BLOCKING] wave.

**Idempotent DROP+CREATE policy idiom** (mirror `20260706110006:51-56`):
```sql
DROP POLICY IF EXISTS <name> ON public.usuarios_rh;
CREATE POLICY <name> ON public.usuarios_rh AS PERMISSIVE FOR SELECT TO authenticated USING (...);
```

**Recursion-safe helper + policies** (RESEARCH §Code Examples — the genuinely net-new bit; `LANGUAGE plpgsql` NOT `sql` so it is not inlined and bypasses RLS as owner):
```sql
CREATE OR REPLACE FUNCTION public.is_active_rh_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.usuarios_rh
    WHERE user_id = auth.uid() AND role = 'administrador' AND ativo AND deleted_at IS NULL) INTO ok;
  RETURN COALESCE(ok, false);
END; $$;
REVOKE EXECUTE ON FUNCTION public.is_active_rh_admin() FROM public;
GRANT  EXECUTE ON FUNCTION public.is_active_rh_admin() TO authenticated;

-- SEG-02 leak removal (per 24-LIVE-STATE.md — these two live qual=true policies let ANY
-- authenticated candidato/recrutador read the whole RH roster):
DROP POLICY IF EXISTS usuarios_rh_authenticated_read ON public.usuarios_rh;
DROP POLICY IF EXISTS usuarios_rh_simple_read        ON public.usuarios_rh;

CREATE POLICY usuarios_rh_admin_select ON public.usuarios_rh
  FOR SELECT TO authenticated USING (public.is_active_rh_admin());
CREATE POLICY usuarios_rh_own_select ON public.usuarios_rh
  FOR SELECT TO authenticated USING (user_id = (select auth.uid())); -- MANDATORY (see note)
-- NO INSERT/UPDATE/DELETE policy for authenticated/anon → all client writes denied.
-- Do NOT enable FORCE ROW LEVEL SECURITY (would subject the DEFINER writes to RLS).
```
> **Own-row policy is mandatory, not optional.** `src/store/authStore.ts:164-170` (`fetchProfile`) does `supabase.from('usuarios_rh').select('*').eq('user_id', userId).eq('ativo', true).is('deleted_at', null).single()` on the caller's OWN row on every RH login. Drop the own-row policy and a non-admin RH (recrutador) login breaks (0 rows → the [[reference_auth_hook_rls_gap]] failure mode). Also required for A37 in Phase 30.
> Wave 0 must `pg_policies`-capture the live full policy list first (A1) — if any extra client write policy exists live, drop it here too.

---

### `supabase/migrations/<ts>_usr_rh_anti_lockout.sql` (migration, trigger)

**Analog:** `supabase/migrations/20260709000010_guard_rejeicao_auditada.sql` (BEFORE UPDATE guard-fn + RAISE + idempotent trigger bind + REVOKE hardening)

**Guard-fn + RAISE shape** (mirror `20260709000010:53-73` — a `RETURNS trigger LANGUAGE plpgsql` that RAISEs an EXCEPTION with an explicit ERRCODE on the forbidden transition). The net-new bit vs the analog is the `pg_advisory_xact_lock` before the count (RESEARCH Pitfall 3 — write-skew to zero admins):
```sql
CREATE OR REPLACE FUNCTION public.tg_usuarios_rh_anti_lockout()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE others int;
BEGIN
  IF NOT (OLD.role='administrador' AND OLD.ativo AND OLD.deleted_at IS NULL) THEN
    RETURN COALESCE(NEW, OLD); -- not removing an active admin → no threat
  END IF;
  IF TG_OP='UPDATE' AND NEW.role='administrador' AND NEW.ativo AND NEW.deleted_at IS NULL THEN
    RETURN NEW; -- stays an active admin
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('usuarios_rh_admin_guard')); -- serialize count (anti write-skew)
  SELECT count(*) INTO others FROM public.usuarios_rh
    WHERE role='administrador' AND ativo AND deleted_at IS NULL AND id <> OLD.id;
  IF others = 0 THEN
    RAISE EXCEPTION 'anti_lockout: cannot remove/demote/deactivate the last active administrator'
      USING ERRCODE='P0001'; -- EF maps → error_code 'LAST_ADMIN'
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
```

**Idempotent trigger bind** (mirror the `DO $$ … IF NOT EXISTS (SELECT 1 FROM pg_trigger …) THEN EXECUTE 'CREATE TRIGGER …'` block at `20260709000010:79-91`) — note this is `BEFORE UPDATE OR DELETE` (analog was `BEFORE UPDATE OF status`). It coexists with the live `update_usuarios_rh_updated_at` BEFORE UPDATE trigger (`docs/sql/03:84-87`); alphabetical BEFORE-order is safe here.

**REVOKE hardening** (mirror `20260709000010:104`): `REVOKE ALL ON FUNCTION public.tg_usuarios_rh_anti_lockout() FROM PUBLIC;`

---

### `supabase/migrations/<ts>_usr_rh_mutacao_rpc.sql` (migration, atomic mutate+audit RPC)

**Analog (audit call + DEFINER):** `docs/sql/sql/25-functions-configuracoes.sql:63-120` (the live `log_auditoria()` signature) + `:258-266` (a `PERFORM log_auditoria(p_… := …)` call site inside another DEFINER fn).
**Analog (REVOKE):** `20260709000010:104`.

**`log_auditoria` signature to call** (exact named params from `25-functions:63-77`):
```sql
log_auditoria(
  p_usuario_id UUID, p_usuario_tipo TEXT, p_acao TEXT,
  p_categoria categoria_log_auditoria,  -- use 'usuario'
  p_descricao TEXT, p_severidade severidade_log, -- 'critico' role-change/deactivate, 'aviso' reactivate
  p_recurso_tipo TEXT,                  -- 'usuarios_rh'
  p_recurso_id UUID,                    -- the target user
  p_dados_antes JSONB, p_dados_depois JSONB,
  p_ip_address INET, p_sucesso BOOLEAN, p_erro_mensagem TEXT
) RETURNS UUID  -- SECURITY DEFINER, owner bypasses RLS
```

**Atomic mutate+audit RPC** (RESEARCH §Code Examples — one tx: read `dados_antes` `FOR UPDATE`, mutate, then `PERFORM log_auditoria(...)`; the anti-lockout trigger still fires inside):
```sql
CREATE OR REPLACE FUNCTION public.gerir_usuario_rh_mutacao(
  p_actor uuid, p_target uuid, p_action text, p_novo_papel text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE antes jsonb; depois jsonb; v_sev severidade_log;
BEGIN
  SELECT to_jsonb(u) INTO antes FROM public.usuarios_rh u WHERE id = p_target FOR UPDATE;
  IF antes IS NULL THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF    p_action='mudar_papel' THEN UPDATE public.usuarios_rh SET role=p_novo_papel, updated_by=p_actor WHERE id=p_target; v_sev:='critico';
  ELSIF p_action='desativar'   THEN UPDATE public.usuarios_rh SET ativo=false,       updated_by=p_actor WHERE id=p_target; v_sev:='critico';
  ELSIF p_action='ativar'      THEN UPDATE public.usuarios_rh SET ativo=true,        updated_by=p_actor WHERE id=p_target; v_sev:='aviso';
  ELSE RAISE EXCEPTION 'VALIDATION' USING ERRCODE='P0001'; END IF;
  SELECT to_jsonb(u) INTO depois FROM public.usuarios_rh u WHERE id = p_target;
  PERFORM public.log_auditoria(
    p_usuario_id := p_actor, p_usuario_tipo := 'admin', p_acao := p_action, p_categoria := 'usuario',
    p_descricao := format('Ação %s sobre usuário RH %s', p_action, p_target),
    p_severidade := v_sev, p_recurso_tipo := 'usuarios_rh', p_recurso_id := p_target,
    p_dados_antes := antes, p_dados_depois := depois, p_sucesso := true);
END; $$;
REVOKE EXECUTE ON FUNCTION public.gerir_usuario_rh_mutacao(uuid,uuid,text,text) FROM public, authenticated, anon;
```
> A separate `criar_usuario_rh_com_audit(...)` RPC follows the same shape for the `criar` action (INSERT usuarios_rh with `primeiro_acesso=true, ativo=true, created_by=p_actor` + audit row in one tx). `dados_antes/depois` never contain a password (GoTrue owns credentials). Same NO-`BEGIN/COMMIT`-wrapper / MCP-apply conventions.

---

### `supabase/migrations/<ts>_logs_auditoria_append_only.sql` (migration, RLS hardening)

**Analog (the exact live policies):** `docs/sql/sql/28-rls-configuracoes.sql:232-259`.

The live table has (per `docs/sql/28:254-259`) `"Sistema insere logs"` `FOR INSERT TO authenticated WITH CHECK (TRUE)` — **any authenticated user can forge audit rows** (RESEARCH Pitfall 5). Drop it; the DEFINER `log_auditoria()` path still writes (owner bypasses RLS). Keep `"Admin vê logs"` SELECT (`:240-252`). Confirm NO UPDATE/DELETE policy exists (there is none per `docs/sql/28` — append-only).
```sql
DROP POLICY IF EXISTS "Sistema insere logs" ON public.logs_auditoria;
REVOKE INSERT, UPDATE, DELETE ON public.logs_auditoria FROM authenticated, anon; -- defense in depth
-- Do NOT enable FORCE ROW LEVEL SECURITY (would break the DEFINER audit INSERT). Wave 0: verify
-- log_auditoria/logs_auditoria owner is a BYPASSRLS role (A4) before dropping the policy.
```

---

### `supabase/tests/usr_rh_*_smoke.sql` (test, behavioral SQL smoke)

**Analog:** `supabase/tests/submit_candidatura_atomic_smokes.sql`

**Impersonation + disposable-fixture idiom** (mirror `submit_candidatura_atomic_smokes.sql:56-129, 253-271`):
- `RESET ROLE;` + a privileged `DO $$` setup block that discovers a real row and builds a disposable fixture with fixed UUID prefixes (idempotent setup + cleanup).
- Impersonate a role by writing the JWT claims: `PERFORM set_config('request.jwt.claims', '<json>', true);` then `SET ROLE authenticated;` — for SEG-02 assert a candidato/recrutador JWT `SELECT * FROM usuarios_rh` returns **0 rows** (Pitfall 2 — structural `pg_policies` grep is insufficient; assert the row projection).
- Clearing claims (`set_config('request.jwt.claims','',true)` → `auth.uid()=NULL`) reproduces the service_role NULL-actor context (mirror `:143-145`).
- Assertions as `RAISE NOTICE 'PASS …'` / `RAISE EXCEPTION '… FAIL …'` inside `DO $$` blocks (mirror `:136-177`); a `smoke.ready='n'` skip-guard when the fixture can't be built (mirror `:126-128`).
- ROLLBACK-free cleanup that deletes only disposable rows and NEVER the discovered real row (mirror `:248-271`).

**Smokes required** (RESEARCH §Test Map): SEG-02 roster-leak (candidato+recrutador → 0 rows) + admin full-roster + own-row read + `auth_admin_le_usuarios_rh` still present; USR-07 last-admin RAISE (P0001) + concurrency (two parallel demotes → ≥1 admin survives); USR-06 atomic mutate+audit (one `logs_auditoria` row, `categoria='usuario'`, rolls back together on forced failure) + append-only (candidato/recrutador cannot INSERT/UPDATE/DELETE `logs_auditoria`).

---

### `src/__tests__/guards/no-service-role-src.grep.test.ts` (test, SEG-01 grep guard)

**Analog:** `src/__tests__/guards/rh-console.grep.test.ts` (and `n8n-bundle.grep.test.ts` for the build-artifact leg).

**node:fs comment-aware walk** (mirror `rh-console.grep.test.ts:32-94`): `import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'`; `ROOT = resolve(__dirname, '../../..')`; a recursive `collectFiles()` that skips `__tests__`/`node_modules` and only reads `.ts|.tsx`; an `isCommentLine()` strip so a doc-comment mentioning the token cannot self-trip; collect `violations[]` and throw with file:line context. Add the positive/negative regex unit assertions + a sanity `files.length` floor (mirror `:118-137`).

**Forbidden pattern** (SEG-01 — no privileged client / service_role key ever in the shipped bundle): scan `src/` for `SUPABASE_SERVICE_ROLE_KEY` / `service_role` / a `createClient(..., serviceRoleKey)` construction. There is currently NO such guard (`grep` of `src/__tests__/guards/` for `service_role` = 0 hits), so this is a net-new guard following the exact idiom. Consider extending to the `build/` artifact leg like `n8n-bundle.grep.test.ts` (skipped when `build/` absent, runs in CI).

---

## Shared Patterns

### Authenticate-THEN-Authorize (SEG-01)
**Source:** `supabase/functions/consolidar-decisao-final/index.ts:233-261`
**Apply to:** the EF handler (the ONLY entrypoint). Two-client: anon+Authorization → `getUser()` (authenticate); service_role → `select role from usuarios_rh` (authorize). Role from the TABLE, never `getUser().app_metadata`. This EF requires `role='administrador'` exactly (stricter than the analog's rh-OR-admin).

### Structured error contract `{ ok, error_code, message, field? }`
**Source:** `supabase/functions/cadastrar-candidato/index.ts:83-97` + `_shared/schemas.ts:159-198`
**Apply to:** every EF response + the shared schema's error-code union. Map DB SQLSTATEs: `P0001`→`LAST_ADMIN`, `P0002`→`NOT_FOUND`, unique-violation on email→`EMAIL_EXISTS`.

### `.strict()` fail-closed Zod validation (CI-07 bare-zod)
**Source:** `supabase/functions/_shared/schemas.ts:118-147, 204-235`
**Apply to:** the new `_shared/usuario-rh-schemas.ts` — bare `import { z } from "zod"`, every object `.strict()`, `role` enum-constrained to `{recrutador, administrador}` (excludes the legacy DB CHECK's `gerente`/`visualizador`).

### SECURITY DEFINER + REVOKE hardening (privileged DB writes)
**Source:** `docs/sql/sql/25-functions-configuracoes.sql:63-120` (DEFINER + `SET search_path`) + `20260709000010_guard_rejeicao_auditada.sql:104` (`REVOKE ALL … FROM PUBLIC`)
**Apply to:** `is_active_rh_admin()`, `gerir_usuario_rh_mutacao()`, `criar_usuario_rh_com_audit()`, `tg_usuarios_rh_anti_lockout()`. All `LANGUAGE plpgsql` (NOT `sql` — inlining loses DEFINER context → re-introduces RLS recursion). No FORCE ROW LEVEL SECURITY.

### Migration authoring + apply discipline
**Source:** `20260706110006_sec09_auth_admin_policy.sql:40-42` + `20260709000010:48-50`
**Apply to:** all 4 migrations. NO outer `BEGIN;/COMMIT;` wrapper (42601 trigger). Idempotent `DROP POLICY IF EXISTS` / `IF NOT EXISTS (pg_trigger)` binds. Applied via Supabase MCP `apply_migration` in a [BLOCKING] wave. `pg_get_functiondef` / `pg_get_triggerdef` / `pg_policies` live-capture in Wave 0 BEFORE any `CREATE OR REPLACE` on a live object (A1-A6; Pitfall 4). Regenerate `database.types.ts` at repo ROOT after apply.

### Behavioral SQL smoke with impersonated JWT
**Source:** `supabase/tests/submit_candidatura_atomic_smokes.sql:56-177, 248-271`
**Apply to:** all SEG-02 / USR-06 / USR-07 smokes. `set_config('request.jwt.claims', …, true)` + `SET ROLE authenticated` to impersonate; disposable fixed-UUID fixture; assert the row projection (not `pg_policies`); ROLLBACK-free cleanup; skip-guard when fixture can't build.

---

## No Analog Found

None. Every deliverable maps to an in-repo precedent. The only genuinely net-new *logic* (not net-new file type) lives inside analog-shaped files:
- `is_active_rh_admin()` PL/pgSQL DEFINER helper (recursion-safe admin RLS) — no prior admin-RLS-without-recursion helper exists; the closest prior art is the recursion TRAP at `docs/sql/03:114-150` (a what-NOT-to-do reference).
- `pg_advisory_xact_lock` in the anti-lockout trigger — no prior advisory-lock use in repo; the trigger *shell* is `20260709000010`.

Planner: for these two, follow the RESEARCH §Code Examples excerpts (reproduced above), not a codebase clone.

## Metadata

**Analog search scope:** `supabase/functions/` (EFs + `_shared`), `supabase/migrations/`, `supabase/tests/`, `docs/sql/sql/`, `src/__tests__/guards/`, `src/store/`
**Files scanned (read in full or targeted):** `consolidar-decisao-final/index.ts`, `consolidar-decisao-final/__tests__/index.test.ts`, `cadastrar-candidato/index.ts`, `_shared/schemas.ts`, `20260706110006_sec09_auth_admin_policy.sql`, `20260420000002_unified_auth_role.sql`, `20260709000010_guard_rejeicao_auditada.sql`, `docs/sql/sql/25-functions-configuracoes.sql`, `docs/sql/sql/28-rls-configuracoes.sql`, `docs/sql/sql/03-tabela-usuarios-rh.sql`, `submit_candidatura_atomic_smokes.sql`, `rh-console.grep.test.ts`, `n8n-bundle.grep.test.ts`, `src/store/authStore.ts` (own-row read)
**Pattern extraction date:** 2026-07-13
