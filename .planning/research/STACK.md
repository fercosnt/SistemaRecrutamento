# Stack Research

**Domain:** Transactional email notification layer (Resend) for an existing Supabase/Deno ATS
**Milestone:** M7 (v7.0) — Comunicação com o Candidato (COMM)
**Researched:** 2026-07-17
**Confidence:** HIGH (provider API, versions, Deno-import discipline verified against Resend docs + repo precedent; two items MEDIUM, flagged inline)

> Scope note: this is an **additive** research pass. The React/Vite/Supabase/Deno stack is already validated and is NOT re-litigated here. Everything below is the *net-new* surface needed to send transactional email via Resend from a Supabase Edge Function, wired into the **existing** SEC-03 `pg_net` + Vault trigger skeleton. Provider (Resend), server-side-only dispatch, and no-opt-out LGPD posture are **locked** — this doc researches HOW, not WHETHER.

---

## TL;DR (the opinionated calls)

1. **Topology = A** (DB trigger → `pg_net` → EF `notificar-candidato` → Resend). NOT B (trigger → Resend directly). Rationale below — the deciding factor is that PII + templating + audit + idempotency all belong in TypeScript, not in a PL/pgSQL trigger body.
2. **Send path = plain `fetch` to `https://api.resend.com/emails`** with an `Authorization: Bearer` + `Idempotency-Key` header. Zero new npm dependency, matches Resend's *own* Supabase Edge Functions guide, smallest failure surface in the Deno runtime. The `npm:resend@6.17.2` SDK is the sanctioned alternative (repo already proves static `npm:` SDK imports work) but is only *worth it* for the webhook-verification EF.
3. **Templates = plain HTML string templates** (a tiny `layout(html)` + per-event functions), NOT `@react-email/*`. For ~4 templates the react-email dependency is a net negative in Deno edge (documented `MessageChannel` / JSX / `eval` edge-runtime failures — see "What NOT to Use").
4. **New table `notificacoes_enviadas`** is the lightweight queue/audit/idempotency ledger. Do **not** add BullMQ/Redis/QStash/pgmq — `pg_net` + a `UNIQUE` constraint + Resend's `Idempotency-Key` is the intended three-layer dedupe.
5. **Fernando's one-time human task:** verify a sending domain (or subdomain like `mail.beautysmile.com.br`) in the Resend dashboard — add the SPF (MX) + DKIM (CNAME) + recommended DMARC records. Until a domain is verified you can only send to your own Resend account email (403 on external recipients).

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Resend HTTP API** (`POST https://api.resend.com/emails`) | API v1 (stable) | The actual send | Provider is locked. The REST endpoint is called with `fetch` — no SDK, no bundler resolution risk, no node-compat shim. This is **exactly** the shape in Resend's official Supabase Edge Functions guide. |
| **Deno `fetch`** (built-in) | Deno runtime (Supabase edge) | Transport to Resend | Native, zero-import, always available. The repo's other privileged reads use SDK clients; a pure outbound POST needs nothing more than `fetch`. Robust and un-buggable. |
| **`@supabase/supabase-js`** | `@2` (existing) | Own-row PII allowlist read + `notificacoes_enviadas` write inside the EF | Already the repo standard, imported as `https://esm.sh/@supabase/supabase-js@2` (static). Reuse verbatim — two-client pattern (anon for the rare auth case; service_role for the privileged own-row read + audit insert). |
| **`pg_net`** (`net.http_post`) | Supabase-managed extension (already enabled + in use) | DB trigger → EF hop | **Already load-bearing** in SEC-03. M7 repoints the same mechanism at the new EF instead of the dormant n8n base URL. No new infra. |
| **Supabase Vault** (`vault.decrypted_secrets`) | Existing | Stores `RESEND_API_KEY`, the EF invoke key, `project_url` | Established secret pattern (SEC-03 `n8n_webhook_base`, `reprocessar_analise` `edge_invoke_key`). The Resend key **never** touches the client bundle. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **`resend` (SDK)** | **6.17.2** (latest; `engines: node>=20`, deps `postal-mime`, `standardwebhooks`) | Typed `emails.send()` + **`webhooks.verify()`** (Svix/standardwebhooks signature check) | Import **statically** as `import { Resend } from "npm:resend@6.17.2"`. Recommended **only** inside a *separate* `resend-webhook` EF where `webhooks.verify()` earns its keep. Optional for the send path (fetch is leaner). |
| **`zod`** | `3.25.76` (existing, via `functions/deno.json` import map `"zod": "npm:zod@3.25.76"`) | `.strict()` contract for the trigger→EF payload | Reuse the existing shared-schema convention (`_shared/*-schemas.ts`). The EF that receives the `pg_net` POST validates the body before any Resend call. Add `import_map = "./functions/deno.json"` for this EF in `config.toml` (same as the other bare-`zod` EFs). |
| **`standardwebhooks`** | `1.0.0` (transitive dep of `resend`; can also be imported directly `npm:standardwebhooks@1.0.0`) | Verify Resend webhook signatures if you skip the full SDK | Only if you want webhook verification without pulling the whole `resend` SDK. Prefer `resend.webhooks.verify()` for ergonomics. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Resend test addresses** | Deterministic delivery outcomes in CI/dev without spending quota or hitting real inboxes | `delivered@resend.dev` (success), `bounced@resend.dev` (550 5.1.1 hard bounce), `complained@resend.dev` (spam report), `suppressed@resend.dev` (suppression). Supports `+label` sub-addressing (`delivered+p36@resend.dev`). |
| **`onboarding@resend.dev`** | The default verified `from` for smoke tests before your domain is verified | Sends only to your **own** Resend account email until a real domain is verified. Use for the very first end-to-end smoke, then switch `from` to `no-reply@<verified-domain>`. |
| **Supabase Edge Function secrets** | `RESEND_API_KEY` for local `supabase functions serve` and deployed runtime | Local: `.env` / `supabase secrets set`. PROD: Vault (read inside the EF), mirroring the SEC-03 secret discipline. Two API keys recommended: one **test-mode/dev** key, one **prod** key. |

## Installation

**No frontend `npm install` is required** — dispatch is 100% server-side (Deno edge), and the send path uses `fetch`. There is nothing to add to `package.json`.

```bash
# Nothing for the SEND path — plain fetch, zero deps.
# The Deno EF imports are resolved by the runtime at deploy, NOT by npm:

#   send EF (notificar-candidato/index.ts):
#     import { createClient } from "https://esm.sh/@supabase/supabase-js@2";   # existing convention
#     // Resend call = fetch("https://api.resend.com/emails", ...)  — no import

#   OPTIONAL webhook EF (resend-webhook/index.ts), only if/when you add delivery tracking:
#     import { Resend } from "npm:resend@6.17.2";   # STATIC npm: specifier (see discipline note)
```

**Secrets to provision (one-time, Fernando / executor):**

```bash
# Vault (PROD) — read inside the EF via vault.decrypted_secrets, never the bundle
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx        # prod send key
# plus the existing edge-invoke pattern (project_url + edge_invoke_key) reused from reprocessar_analise
# OPTIONAL, only with the webhook EF:
supabase secrets set RESEND_WEBHOOK_SECRET=whsec_xxxxxxxx  # from the Resend webhook endpoint config
```

---

## Import discipline (the repo's scar tissue — do not repeat)

The repo was burned by the **dynamic** form `await import(["npm:", pkg].join(""))` → `ERR_MODULE_NOT_FOUND` (hidden from the deploy bundler). That is a **dynamic-import** bug, NOT an npm-SDK bug.

- **Proven-safe:** static top-of-file `npm:` specifiers. The repo already runs `import Anthropic from "npm:@anthropic-ai/sdk@0.102.0"`, `npm:openai@6.42.0`, `npm:unpdf@0.11.0` in PROD.
- **Therefore:** if you use the Resend SDK, write **`import { Resend } from "npm:resend@6.17.2";`** at module top. Pin the exact version (matches the `@anthropic-ai/sdk@0.102.0` precedent). Never `npm:resend` unpinned, never a runtime-constructed specifier.
- **`@supabase/supabase-js`** stays on the repo's `https://esm.sh/@supabase/supabase-js@2` form (that is the existing, working convention for that one package).
- Any EF whose bundle reaches the bare-`zod` shared schema needs `import_map = "./functions/deno.json"` in `config.toml` (couples with CI-07). The send EF should validate its `pg_net` payload with the shared zod convention → add that line.

---

## Topology decision: A vs B (recommend **A**)

**A — DB trigger → `net.http_post` → EF `notificar-candidato` → Resend** ✅ RECOMMENDED
**B — DB trigger → `net.http_post` directly to `api.resend.com/emails`** ❌ reject

| Concern | A (trigger → EF → Resend) | B (trigger → Resend direct) |
|---------|---------------------------|------------------------------|
| **PII in transit** | Trigger payload stays **ids-only** (identical to the SEC-03 invariant "no PII in body"). The EF does the own-row **allowlist** read (`email, nome, vaga.titulo`) — never `select('*')`. | Trigger must itself look up email/nome inside PL/pgSQL and put PII in the `pg_net` body — breaks the SEC-03 "no PII" design and scatters PII reads into trigger code. |
| **Template rendering** | In TypeScript (HTML string helper) — trivial, testable, versionable. | In PL/pgSQL string concat — painful, untestable, unversioned. |
| **`notificacoes_enviadas` write + idempotency** | One place: the EF inserts the ledger row (with a `UNIQUE` dedupe key) *before* calling Resend and updates it with the Resend message id + status after. | The trigger would have to `INSERT` the ledger AND parse the async `net._http_response` later to backfill the message id — awkward, race-prone. |
| **Resend `Idempotency-Key` + retry** | EF sets the header from a deterministic key (`evento/candidatura_id/historico_id`); a duplicate trigger fire is absorbed by the ledger UNIQUE **and** by Resend's 24h idempotency window. | pg_net can't easily express per-request idempotency semantics tied to your domain keys. |
| **Delivery/bounce correlation** | EF stores `resend_message_id`; a later webhook EF updates the same ledger row by that id. Clean join. | You'd store the pg_net request id, not the Resend message id → webhook correlation is hard. |
| **Reuse of existing skeleton** | Repoint the existing dormant SEC-03 triggers' Vault base URL at the EF's `functions/v1/notificar-candidato` invoke URL (Bearer edge-invoke key), OR add one canonical `AFTER INSERT` trigger on `historico_candidatura` (M6's transition log). Same `pg_net` + Vault + graceful-skip mechanism. | Also reuses `pg_net`, but forfeits every advantage above. |
| **Auth model of the hop** | EF is server-to-server → deploy `verify_jwt = false` + self-auth on a Vault Bearer key (mirrors `analise-candidato-individual`, `cost-alerter`, `gerar-devolutiva-bigfive`). No `auth.getUser()` needed. | n/a |

**Verdict:** A. It is a near-verbatim extension of the SEC-03 pattern the repo already ships, keeps PII handling and templating in TypeScript, and makes the `notificacoes_enviadas` ledger the single auditable choke-point.

> Roadmap flag (belongs to ARCHITECTURE/REQUIREMENTS, noted here for completeness): the 4 events span **three** source tables — "candidatura recebida" = `AFTER INSERT candidaturas` (SEC-03 trigger #1), "avanço/decisão" = `historico_candidatura` (M6 canonical log, cleanest single source), "convite de entrevista" = `agendamentos_entrevista` (M6). Expect either one trigger per source or a small fan-in. Not a stack choice, but it shapes how many triggers point at the one EF.

---

## Send call: `fetch` vs Resend SDK (recommend **fetch** for the send path)

Both work in the Supabase Deno edge runtime. Decision:

| Criterion | Plain `fetch` (RECOMMEND for send) | `npm:resend@6.17.2` SDK |
|-----------|-------------------------------------|--------------------------|
| Dependency surface | **Zero** | +1 npm SDK (pulls `postal-mime` + `standardwebhooks`) |
| Bundler risk in Deno edge | **None** (no import at all) | Low — static `npm:` is proven safe in this repo, but non-zero |
| Matches Resend's own Supabase example | **Yes** (their Supabase guide uses `fetch`) | Their *Deno Deploy* guide uses `npm:resend` |
| Idempotency | `Idempotency-Key` request header (you set it) | `emails.send(payload, { idempotencyKey })` sugar → same header |
| Typed responses / error shape | You type it yourself (trivial: `{ id }` on success, `{ name, message }` on error) | Typed `{ data, error }` |
| Webhook signature verify | Not applicable to the send path | `resend.webhooks.verify()` — **the SDK's real value**, but that's a different EF |

**Recommendation:** use `fetch` in `notificar-candidato` (leanest, un-buggable, matches Resend's Supabase doc). Reserve the SDK for a *separate, later* `resend-webhook` EF where `resend.webhooks.verify()` saves hand-rolling Svix HMAC verification. This keeps the critical send path dependency-free while still getting SDK ergonomics exactly where they pay off.

Minimal send shape (illustrative — the load-bearing bits are the two headers):

```
POST https://api.resend.com/emails
Authorization: Bearer <RESEND_API_KEY from Vault>
Idempotency-Key: <evento>/<candidatura_id>        // 24h window, ≤256 chars, "type/id" convention
Content-Type: application/json

{ "from": "Beauty Smile <no-reply@mail.beautysmile.com.br>",
  "to": ["<candidate email — own-row allowlist read>"],
  "subject": "...", "html": "<rendered template>" }
```

---

## Template rendering: HTML strings vs react-email (recommend **HTML strings**)

| Criterion | Plain HTML string templates (RECOMMEND) | `@react-email/*` (`render` 2.1.0 / `components` 1.0.12) |
|-----------|------------------------------------------|----------------------------------------------------------|
| Deno edge runtime | Works everywhere, no runtime deps | **Documented failures** in edge runtimes: `MessageChannel` Node API not supported (react-email #1630), JSX unsupported in Supabase Deno (supabase discussion #40286), `eval`/`new Function` blocked (#1105). `renderAsync` deprecated → `render` now always-async. |
| Dependency weight for ~4 templates | ~0 | Heavy React SSR chain for 4 static emails — poor ROI |
| Consistency with repo | Matches repo minimalism (no new frontend dep, dispatch is server-only) | Adds React-render machinery to the edge bundle |
| Maintainability at this scale | A `layout()` helper + 4 functions returning strings; easy pt-BR copy + Beauty Smile inline CSS | Nicer *if* you had dozens of templates and a design team iterating in the react-email preview |

**Recommendation:** hand-rolled HTML string templates in a shared `_shared/email-templates.ts` (one `layout(bodyHtml, { preheader })` wrapper with inline styles + Beauty Smile branding + the LGPD transactional footer, plus one function per event). Inline all CSS (email clients strip `<style>`/external CSS). Revisit react-email only if template count grows past ~10 or a non-engineer needs to edit them — and even then run it as a **build-time** render (Vite/CI producing static HTML) rather than at edge runtime, to dodge the Deno-edge issues entirely.

---

## Idempotency + retry (three layers — all cheap, all already-available)

1. **`notificacoes_enviadas` UNIQUE constraint** (e.g. `UNIQUE (candidatura_id, evento)` or keyed on `historico_id`) — the EF inserts the ledger row first; a duplicate trigger fire hits the constraint and short-circuits **before** any Resend call. This is the primary dedupe and the audit record in one.
2. **Resend `Idempotency-Key` header** — deterministic `<evento>/<candidatura_id>`; **valid 24h, ≤256 chars**. Absorbs retries within the window even if the ledger check races. Belt-and-suspenders.
3. **`pg_net` is fire-and-forget async** — it does not retry on its own; a transient EF failure is retried by re-firing the trigger path or a small reconciliation sweep over `notificacoes_enviadas WHERE status='pendente'`. Keep the EF idempotent so re-fires are safe.

**Rate limits:** default **10 requests/second per team** (HIGH confidence — Resend account-quotas KB; older docs cite 2/s or 5/s, so treat the exact number as environment-verifiable), `429` on exceed, standard IETF rate-limit response headers. At this ATS's volume (≤ a few emails per candidate transition) you will not approach it; no client-side throttling infra needed. On `429`, retry with backoff (the repo already has retry/backoff idioms in `_shared/ai-client.ts` you can mirror).

**Free-tier caveat (MEDIUM confidence — pricing drifts):** Free = **3,000 emails/month, 100/day**. A burst hiring campaign (4 events × many candidates) can exceed 100/day → plan for Pro (~US$20/mo, ~50k/mo) before any volume push. This is a business note for the roadmap, not a code change.

---

## Bounce / delivery status: webhooks (recommend) vs polling

- **Webhooks (recommended, but a *later* phase):** a separate `resend-webhook` EF (`verify_jwt = false`, public) receives `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`. Verify the Svix signature (`svix-id` / `svix-timestamp` / `svix-signature` headers) via `resend.webhooks.verify({ payload, headers, webhookSecret })` (this is the one place the SDK is clearly worth importing). Update the matching `notificacoes_enviadas` row by `resend_message_id`. This gives real delivery/bounce state without polling.
- **Polling (`GET /emails/:id`):** possible but wasteful; only sensible for an ad-hoc debug check. Do not build a poller.
- **Sequencing:** ship the send path + ledger first; add the webhook EF as a follow-on slice. The ledger schema should reserve columns for `status` + `resend_message_id` + `bounce_type` from day one so the webhook phase is purely additive.

---

## Domain / DKIM / SPF — Fernando's one-time setup (outbound)

To send to real candidates you **must** verify a sending domain (unverified → `403`, and testing is restricted to your own account email). Steps:

1. Resend dashboard → **Domains → Add Domain**. Prefer a subdomain, e.g. `mail.beautysmile.com.br` (isolates sending reputation from the corporate root domain).
2. Add the DNS records Resend returns (via Amazon SES under the hood):
   - **SPF**: an `MX` record on `send.<domain>` → `feedback-smtp.<region>.amazonses.com` (+ the SPF `TXT`).
   - **DKIM**: a `CNAME` (`..._domainkey`) → `<token>.dkim.amazonses.com`.
   - **DMARC** (recommended): a `TXT` on `_dmarc.<domain>` (start `p=none` for monitoring, tighten later).
3. Click **Verify** (or `resend.domains.verify(id)`); wait for DNS propagation → status `verified`.
4. Set the EF `from` to `Beauty Smile <no-reply@mail.beautysmile.com.br>` and (recommended) a `reply-to` to a monitored inbox.
5. Region: pick the sending region nearest the audience (BR → `us-east-1` is the common default; not latency-critical for async email).

CI/dev never needs a verified domain — it uses `onboarding@resend.dev` → `delivered@resend.dev` (and `bounced@`/`complained@`) with a **test-mode API key**, so tests never touch real inboxes or reputation.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Plain `fetch` send | `npm:resend@6.17.2` SDK for send too | If you want one consistent client for send + webhooks and accept +1 dep. Fully supported (static `npm:` is proven in this repo). |
| HTML string templates | `@react-email` rendered at **build time** in CI | If template count grows >~10 or non-engineers edit them — but render to static HTML in the Vite/CI step, never at edge runtime. |
| Topology A (trigger → EF) | Client-invoked EF (`supabase.functions.invoke`) at the moment the RH advances a candidate | Only if you ever need a synchronous "email sent" confirmation in the RH UI. Costs you the auditable single write-path; the trigger path is preferred for guaranteed fire on *every* transition. |
| Resend | Supabase Auth SMTP (GoTrue) | GoTrue email is for **auth** flows (the repo already uses `resetPasswordForEmail` for RH accounts). It is NOT a general transactional sender — do not overload it for funnel notifications. |
| `notificacoes_enviadas` + pg_net | `pgmq` (Supabase message queue) | Only if you later need ordered/at-least-once queue semantics with visibility timeouts at high volume. Overkill for 4 event types at this scale. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Dynamic import `await import(["npm:",p].join(""))`** | Hides the package from the deploy bundler → `ERR_MODULE_NOT_FOUND` 500 (the repo's documented burn). | **Static** `import { Resend } from "npm:resend@6.17.2"` at module top. |
| **`@react-email/render` / `renderAsync` at edge runtime** | Documented Deno/edge failures: `MessageChannel` unsupported, JSX unsupported in Supabase Deno, `eval`/`new Function` blocked; `renderAsync` deprecated. | Plain HTML string templates in `_shared/email-templates.ts` (or react-email rendered at build time). |
| **Topology B (trigger → Resend direct from PL/pgSQL)** | Forces PII lookups + template string-concat + idempotency into a trigger body; breaks the SEC-03 "no PII in payload" invariant; awful message-id correlation. | Topology A (trigger → EF → Resend). |
| **BullMQ / Redis / QStash / SQS / any external queue** | Heavyweight infra for 4 event types; new failure mode + cost; there is no Node server to host a worker anyway. | `notificacoes_enviadas` (UNIQUE dedupe) + `pg_net` + Resend `Idempotency-Key` = the intended lightweight queue. |
| **Resend API key in any `VITE_`-prefixed env / client bundle** | `VITE_` vars are inlined into the public bundle (the exact SEC-03 leak that this milestone retires). | Vault (`vault.decrypted_secrets`) read **inside** the EF; dispatch server-side only. |
| **Overloading GoTrue SMTP for funnel emails** | GoTrue email is scoped to auth (magic link / recovery); not a transactional API, no templating/idempotency/webhooks. | Resend via the EF. |
| **Polling `GET /emails/:id` for delivery state** | Wasteful, racy, burns rate limit. | Resend webhooks → update `notificacoes_enviadas`. |
| **`onboarding@resend.dev` as the production `from`** | Only sends to your own account email; unverified-domain 403 for real recipients. | Verify `mail.beautysmile.com.br` and send from `no-reply@` it. |

---

## Stack Patterns by Variant

**If shipping the first slice (send only):**
- EF `notificar-candidato` (`verify_jwt=false`, Vault Bearer self-auth), `fetch` → Resend, HTML string templates, `notificacoes_enviadas` ledger with `status` + `resend_message_id` columns reserved.
- No SDK, no webhook EF yet. Fastest path to "candidate gets the email."

**If/when adding delivery + bounce tracking:**
- Add `resend-webhook` EF (`verify_jwt=false`, public) using `npm:resend@6.17.2` `webhooks.verify()`; update the ledger by `resend_message_id`.
- Provision `RESEND_WEBHOOK_SECRET` in Vault; register the endpoint + events in the Resend dashboard.

**If template count grows past ~10 or non-engineers must edit them:**
- Introduce `@react-email` but render to static HTML at **build time** (Vite/CI), shipping strings to the EF — never render at edge runtime.

---

## Version Compatibility

| Package / API | Compatible With | Notes |
|---------------|-----------------|-------|
| `resend@6.17.2` | Supabase Deno edge (npm compat) | `engines: node>=20`; deps `postal-mime@2.7.4` + `standardwebhooks@1.0.0` (both edge-safe). Import as `npm:resend@6.17.2` (static). Only needed for the webhook EF. |
| `fetch` send path | Any Deno version in Supabase edge | Zero deps; `Idempotency-Key` is a plain request header. Most robust option. |
| `@supabase/supabase-js@2` | Existing EF convention | Keep `https://esm.sh/@supabase/supabase-js@2` (the repo's working specifier for this one package). |
| `zod@3.25.76` (import map) | The send EF's payload contract | Requires `import_map = "./functions/deno.json"` in `config.toml` for that EF (CI-07 coupling), same as the other bare-`zod` EFs. |
| `pg_net` / Vault | Already enabled + in use (SEC-03, `reprocessar_analise`) | Reuse the `net.http_post(url, headers, body)` + `vault.decrypted_secrets` idiom verbatim. |
| `@react-email/render@2.1.0` | ❌ NOT recommended at edge runtime | Compatible only in Node/build-time contexts; edge-runtime failures documented. |

---

## Sources

- `/websites/resend` (Context7) — Deno Deploy send (`npm:resend`), Supabase Edge Functions send (`fetch` to `api.resend.com/emails`), idempotency key (24h, ≤256 chars, `type/id` convention), rate limits, test addresses, domain/DKIM/SPF (`POST /domains` DNS records), webhook signature verify (`resend.webhooks.verify` / Svix headers), 403 unverified-domain restriction — **HIGH**
- `npm view resend@version` → `6.17.2` (engines node>=20, deps postal-mime + standardwebhooks); `@react-email/render` → `2.1.0`; `@react-email/components` → `1.0.12` — **HIGH**
- https://resend.com/docs/knowledge-base/getting-started-with-resend-and-supabase (WebFetch) — the official Supabase example uses plain `fetch` + `RESEND_API_KEY` env, not the SDK — **HIGH**
- Supabase discussion #40286, resend/react-email issues #1054 / #1105 / #1630, discussion #1144 (WebSearch) — react-email edge-runtime incompatibilities (`MessageChannel`, JSX, `eval`; `renderAsync` deprecated) — **MEDIUM** (community/GitHub, multiple corroborating threads)
- Resend pricing (WebSearch: resend.com/pricing, resend.com/blog/new-free-tier) — free tier 3,000/mo, 100/day — **MEDIUM** (pricing drifts; verify before launch)
- Repo precedent (read directly): `supabase/functions/get-curriculo-url/index.ts`, `gerenciar-usuario-rh/index.ts` (two-client, error contract `{ok,error_code,message}`, static `esm.sh`/`npm:` imports, Vault), `supabase/functions/_shared/ai-client.ts` + `comparativo-candidatos/index.ts` (static `npm:@anthropic-ai/sdk@0.102.0` etc.), `supabase/functions/deno.json` (zod import map), `config.toml` (`verify_jwt` + `import_map` per EF), `migrations/20260706110005_sec03_n8n_serverside.sql` (pg_net + Vault graceful-skip trigger skeleton) — **HIGH**

---
*Stack research for: transactional email (Resend) additive layer on a Supabase/Deno ATS*
*Researched: 2026-07-17*
