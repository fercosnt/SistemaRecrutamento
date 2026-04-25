---
plan: 03-01
type: dashboard-audit
phase: 03-login-recuperacao-senha
project: isljnozzlvckrgjjbjwp
updated: 2026-04-24
status: pending
---

# Wave 0 — Supabase Dashboard Audit (03-01)

> **Runbook skeleton authored by Claude.** Human (the user) must complete each
> step in the Supabase Dashboard for project `isljnozzlvckrgjjbjwp`,
> screenshot the final state, fill in the four checkboxes, then commit this
> file. Until the four boxes are checked and the doc is committed,
> `gate=blocking` keeps Wave 1 (03-02) from starting.

---

## Scope

Two configuration gates that **block AUTH-03 and AUTH-04 at runtime** regardless
of code correctness — they live in Supabase Dashboard state, not in this repo:

| Gate | Why it matters | Threat refs |
|------|----------------|-------------|
| **Email OTP Expiration = 3600s (1 hour)** | AUTH-03 user-facing copy says *"link válido por 1 hora"*. Supabase default is `86400s` (24h) — if left at default, the copy lies and B12 (`InvalidLinkState` after expiry) is untestable in UAT. | T-03-09 (Tampering) |
| **Redirect URLs allow-list contains `/auth/redefinir-senha`** | Without the URL on the allow-list, recovery-email deeplinks redirect to a Supabase-hosted page leaking the recovery session to the wrong origin. Blocks AUTH-04 (B10 deeplink → form → updateUser flow). | T-03-09b (Info Disclosure) |

A third sanity check (Custom Access Token Hook) verifies that the upstream
fix from Phase 1 still ships `role` in the JWT payload — required for the
Wave 2 D-13/Bug 1 fix in `extractRole`.

References:
- 03-RESEARCH.md §Environment Availability (Pitfall 4 + Pitfall 8)
- 03-PLAN.md task 3 `<how-to-verify>`
- 03-VALIDATION.md §Wave 0 Requirements (gates A1, A2)

---

## Step 1 — Email OTP Expiration

**Dashboard path:** Auth → Providers → Email → Email OTP Expiration

1. Open <https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/auth/providers>
2. Expand the **Email** provider panel.
3. Locate **Email OTP Expiration** input.
4. Record the current value below.
5. If different from `3600`, change to `3600` and click **Save**.
6. Take a screenshot showing the saved final value.

| Field | Value |
|-------|-------|
| **Prior value (s)** | _<!-- e.g. 86400 -->_ |
| **Final value (s)** | _<!-- expected: 3600 -->_ |
| **Saved at (UTC)** | _<!-- ISO8601 timestamp from the Dashboard "saved" toast -->_ |

---

## Step 2 — Redirect URLs allow-list

**Dashboard path:** Auth → URL Configuration → Redirect URLs

1. Open <https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/auth/url-configuration>
2. Inspect the **Redirect URLs** section.
3. Confirm the allow-list contains BOTH variants below (or a wildcard that
   matches them — e.g. `http://localhost:3003/auth/redefinir-senha**`):
   - `http://localhost:3003/auth/redefinir-senha`
   - `http://localhost:3003/auth/redefinir-senha?tipo=rh`
4. If either is missing, click **Add URL**, paste the URL, and **Save**.
5. Take a screenshot showing the full allow-list after save.

| Variant | Was present? | Final value |
|---------|--------------|-------------|
| `http://localhost:3003/auth/redefinir-senha` | _<!-- yes / no / wildcard -->_ | _<!-- exact entry -->_ |
| `http://localhost:3003/auth/redefinir-senha?tipo=rh` | _<!-- yes / no / wildcard -->_ | _<!-- exact entry -->_ |

> **Note on production URL.** Adding the production-deployment equivalent
> (e.g. `https://recrutamento.beautysmile.com.br/auth/redefinir-senha`) is
> recommended but **NOT blocking** for Phase 3 — flag it here if added so
> Phase 5 deployment doesn't repeat the audit.

---

## Step 3 — Custom Access Token Hook sanity check

**Why:** Wave 2 (`extractRole` rewrite, D-13/Bug 1 fix) depends on the JWT
payload exposing `app_metadata.role`. Phase 1 enabled this via the Custom
Access Token Hook. We re-verify here so a Wave 2 regression on a stale
Dashboard state is caught at Wave 0.

1. In a separate tab, log in to the running app (`npm run dev` → port 3003)
   with any candidato account, OR run a quick `curl` against the Supabase
   `/auth/v1/token?grant_type=password` endpoint to obtain a fresh
   `access_token`.
2. Paste the `access_token` into <https://jwt.io>.
3. Confirm the decoded **payload** includes:
   - `app_metadata.role` (value: `candidato` | `rh` | `administrador`)
   - NOT `app_metadata` empty/missing
4. Record the decoded role claim below.

| Probe | Value |
|-------|-------|
| **Account email used** | _<!-- e.g. fernando@beautysmile.com.br -->_ |
| **Decoded `app_metadata.role`** | _<!-- expected: non-null string -->_ |
| **JWT decode timestamp (UTC)** | _<!-- ISO8601 -->_ |

---

## Verification checkboxes

Check ALL FOUR. Leave any unchecked → **STOP** and report `issues:` to
Claude with the specific gap.

- [ ] OTP expiry set to **3600s** (was: <prior value>) — Step 1 confirmed + screenshot attached
- [ ] Redirect URL `/auth/redefinir-senha` allow-listed (variant 1) — Step 2 confirmed + screenshot attached
- [ ] Redirect URL `/auth/redefinir-senha?tipo=rh` allow-listed (variant 2 or wildcard match) — Step 2 confirmed
- [ ] Custom Access Token Hook still emits `app_metadata.role` (verified via jwt.io decode of fresh access_token) — Step 3 confirmed

---

## Screenshot evidence

Paste image links / file paths below. Drag-drop into the markdown editor or
reference local paths under `.planning/phases/03-login-recuperacao-senha/screenshots/`.

### Email OTP Expiration (final = 3600s)

<!-- paste path or attach inline -->

### Redirect URLs allow-list

<!-- paste path or attach inline -->

### JWT decode showing role claim (jwt.io payload tab)

<!-- paste path or attach inline. REDACT the signature portion -->

---

## Notes / observations

<!-- Anything noteworthy: e.g. OTP was already 3600s (no change needed), wildcard syntax accepted, custom SMTP detected, etc. -->

---

## Resume signal

Once all four boxes are checked AND screenshots are attached AND this file
is committed:

```bash
git add .planning/phases/03-login-recuperacao-senha/03-01-DASHBOARD-AUDIT.md
git commit -m "docs(03-01): Supabase Dashboard audit — OTP 3600s + Redirect URLs confirmed"
```

Then reply to Claude with `approved` (all four boxes checked) **or**
`issues: <list>` if anything was off.

---

*Authored by Claude (executor) at Wave 0, plan 03-01. Tasks 1 and 2 already
committed (jwt-decode@4.0.0 + 7 Vitest + 2 extended Playwright stubs). This
is the human-gated finale of Wave 0; Wave 1 (03-02) cannot start until the
four checkboxes above are checked and this file is committed.*
