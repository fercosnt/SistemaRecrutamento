---
phase: 01-foundation-saneada
plan: 05
type: human-action
status: pending-user-deploy
created: 2026-04-20
---

# Phase 01 Plan 05 — Checkpoint: Deploy Edge Function

**Type:** `human-action` (deploy cannot be performed inside the sandboxed
executor — requires authenticated Supabase CLI session on a machine with
outbound network access to `api.supabase.com`).

## Why this is non-autonomous

The code for `cadastrar-candidato` and `_shared/schemas.ts` is committed
on the working branch (commits `2e55a0a` and `617f4b9`). However, until
the Edge Function is deployed to the hosted Supabase project, any call
to `supabase.functions.invoke('cadastrar-candidato')` from the client
will return a 404 (function not found) at runtime.

Deploy is a one-time action that creates the function slot in the
Supabase project. Subsequent code updates will redeploy automatically
via CI (when configured) or on the next manual deploy.

## What the user must do

### 1. Deploy the function

From the repo root on a machine where `supabase login` has already
authenticated:

```bash
npx supabase functions deploy cadastrar-candidato --project-ref isljnozzlvckrgjjbjwp
```

The CLI will bundle both `supabase/functions/cadastrar-candidato/index.ts`
and the shared `_shared/schemas.ts` (it walks the dependency graph) and
upload to Supabase Edge Runtime. Expect the upload to take ~10-30s.

### 2. Verify the required secrets exist

The function reads two environment variables at runtime:

| Env var                     | Source                                         |
| --------------------------- | ---------------------------------------------- |
| `SUPABASE_URL`              | Auto-injected by Supabase Edge Runtime         |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase Edge Runtime         |

Both are provisioned automatically by Supabase — no `supabase secrets
set` call is needed. If a previous manual set operation overwrote them,
verify with:

```bash
npx supabase secrets list --project-ref isljnozzlvckrgjjbjwp
```

Both keys should be present. If they are missing (unusual), re-provision
with:

```bash
# Only if missing — normally these are auto-injected
npx supabase secrets set \
  SUPABASE_URL=https://isljnozzlvckrgjjbjwp.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<your-rotated-service-role-key> \
  --project-ref isljnozzlvckrgjjbjwp
```

Use the ROTATED service_role key (the old one that was previously
exposed in the browser bundle should be considered compromised and must
not be re-used — see Plan 01 User Setup Required).

### 3. Smoke-test the function

Open the deployed app (or `npm run dev`) and run in the browser console:

```javascript
const { data, error } = await window.__SUPABASE_CLIENT__?.functions.invoke?.(
  'cadastrar-candidato',
  { body: { email: 'invalid', password: '1', autorizacoes: {} } }
)
console.log({ data, error })
```

If the Supabase client is not exposed on `window`, use any page that
already has `supabase` in scope (via devtools "React Components" tab).

**Expected result:**
```
{ data: { ok: false, error: 'Email inválido' }, error: null }
```
(The first Zod issue to fail is the email format check.)

Any response with `ok: false` and a Portuguese validation message means
the function is deployed, reachable, and the schemas/CORS/env vars are
all working. A `404` error, CORS error, or "Function not found" means
the deploy did not complete — re-run step 1.

### 4. End-to-end test

After the invalid-payload smoke test passes, run a full happy-path test:

1. Navigate to `/candidato/cadastro` in the running app
2. Fill the multi-step form with valid data + a fresh email/CPF
3. Submit
4. Expected: redirect to dashboard/confirmation; a new row appears in
   `auth.users` and `public.candidatos`

If `disponibilidade` or `autorizacoes` tables do not exist in the
database, you will see warnings in the function logs
(`npx supabase functions logs cadastrar-candidato`) but the candidato
WILL be successfully created — these inserts are best-effort by design
(see index.ts section 5/6).

## What the orchestrator / executor does NOT do

- Does NOT run `supabase functions deploy` (sandbox blocks outbound
  network + lacks authenticated `supabase login` state)
- Does NOT manage service_role rotation (user action per Plan 01)
- Does NOT enable the Custom Access Token Hook (Plan 04 user action,
  separate checkpoint)

## Resume signal

Type "deployed" once `supabase functions deploy cadastrar-candidato`
has completed successfully and step 3 smoke test returns the expected
`{ ok: false, error: 'Email inválido' }` response.
