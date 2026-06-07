---
phase: 01-foundation-saneada
plan: 04
checkpoint_type: human-action
status: awaiting_user
created: 2026-04-20
---

# Phase 01 Plan 04 — Human Action Checkpoint

Two manual steps remain before Plan 04 can be considered fully applied.
Both require access the sandbox cannot grant to an agent:

1. **Enable Custom Access Token Hook** in Supabase Dashboard
2. **Install `.husky/pre-commit` hook** locally (sandbox blocks writes to `.husky/`)

Both steps must be completed by a human developer with repo + Supabase
access. Neither is blocking for code-level correctness — the migrations and
service code are committed and ready — but the foundation is not operational
until both are done.

---

## Step 1 — Enable Custom Access Token Hook (Supabase Dashboard)

**What was built**

`supabase/migrations/20260420000002_unified_auth_role.sql` creates the
`public.custom_access_token_hook(event jsonb)` PL/pgSQL function that maps
`usuarios_rh.role = 'recrutador'` to JWT `app_metadata.role = 'rh'` and
`'administrador'` to `'administrador'`. Candidatos default to `'candidato'`.
GRANT EXECUTE is restricted to `supabase_auth_admin`; REVOKE from
`authenticated, anon, public`.

However, creating the function does NOT activate it. Supabase requires a
Dashboard action to register the function in the auth pipeline.

**What the user must do**

1. Apply migrations to the target environment first:
   ```bash
   cd "/Users/fernando/Cursor Repo/DB Sistema de recrutamento"
   npx supabase link --project-ref isljnozzlvckrgjjbjwp    # one-time
   npx supabase db push                                    # applies migrations
   ```
2. Open the Supabase Dashboard for project `isljnozzlvckrgjjbjwp`:
   https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/auth/hooks
3. Find the **Custom Access Token** section.
4. Click **Enable** (or **Add hook**).
5. Select:
   - **Schema:** `public`
   - **Function name:** `custom_access_token_hook`
6. Save.

**How to verify**

1. Log in to the app as a candidato (or RH user).
2. Open browser DevTools → Application → Local Storage → find the Supabase
   session key (commonly `sb-<project-ref>-auth-token`).
3. Copy the `access_token` JWT value.
4. Paste it at https://jwt.io and inspect the decoded payload.
5. Confirm the payload contains:
   ```json
   {
     "app_metadata": {
       "role": "candidato"   // or "rh" / "administrador"
     }
   }
   ```
6. The unified auth store (`src/store/authStore.ts`) reads this via
   `session.user.app_metadata.role` and the DB-lookup fallback becomes a
   no-op once the claim is present.

If the role claim is absent, the hook is not enabled — revisit step 5.

---

## Step 2 — Install `.husky/pre-commit` hook locally

**What was built**

`docs/husky/pre-commit` (tracked in git) contains the hook script:
```sh
#!/usr/bin/env sh
npm run lint
```

`husky@^9.1.7` is added to `devDependencies` in `package.json`, with a
`"prepare": "husky"` script so `npm install` will auto-initialize husky.

**Why this step is manual**

The agent sandbox denies writes under `.husky/` (git hooks are a
security-sensitive path). The content is committed at `docs/husky/pre-commit`
for the user to copy into place.

**What the user must do**

```bash
cd "/Users/fernando/Cursor Repo/DB Sistema de recrutamento"

# 1. Install husky devDependency
npm install

# 2. (Optional) Run the prepare script if npm did not auto-run it
npm run prepare

# 3. Copy the hook script into place
mkdir -p .husky
cp docs/husky/pre-commit .husky/pre-commit
chmod +x .husky/pre-commit

# 4. Verify
cat .husky/pre-commit         # should print the hook body
ls -la .husky/pre-commit      # executable bit set
```

**How to verify**

```bash
# This should trigger `npm run lint` before the commit is created.
# Expected: tsc runs, errors (if any) are printed, commit is blocked or
# allowed based on tsc exit code. Use --no-verify to override.
git commit --allow-empty -m "test: husky pre-commit hook"
```

If lint runs, the hook is installed correctly.

---

## Why this cannot be fully automated

- **Supabase Dashboard** — hook activation requires a human to click in the
  Dashboard or make a Management API call with an owner-level PAT. Neither
  is available to a worktree agent.
- **.husky/ directory** — sandbox denial per agent security policy.

---

## Rollback

If either step causes issues in production:

- **Dashboard hook:** Disable the hook in Authentication → Hooks → Custom
  Access Token. The store's DB-lookup fallback takes over.
- **Husky hook:** `rm .husky/pre-commit` or `git commit --no-verify` to
  bypass per-commit.

---

*Agent: parallel executor `worktree-agent-a28a9c89`*
*Plan: 01-04 (migrations + types pipeline + husky + duplicate-check RPC)*
