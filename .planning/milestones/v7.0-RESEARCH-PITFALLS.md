# Pitfalls Research

**Domain:** Transactional email pipeline (Resend) + DB-trigger dispatch (pg_net) bolted onto a shipped Supabase/Deno ATS — M7 "Comunicação com o Candidato" (COMM)
**Researched:** 2026-07-17
**Confidence:** HIGH (Resend + pg_net facts verified via Context7 official docs + Supabase docs; repo scars from PROJECT.md / MEMORY / SEC-03 migration)

> Scope note: these are pitfalls specific to adding **this** email layer to **this** system, not generic email advice. Phase numbers are provisional groupings (M7 starts at **Phase 36**); the roadmapper assigns final numbers. Proposed groupings used below:
> - **P36 — Deliverability & Sender Identity** (domain verify, DKIM/SPF/DMARC, Vault secret, Resend account)
> - **P37 — Notification Data Layer** (`notificacoes_enviadas` table, idempotency constraint, state machine, RLS, retire/repoint SEC-03)
> - **P38 — EF `notificar-candidato`** (self-auth, allowlist reads, D-15 neutral templates, Resend Idempotency-Key, static `npm:` import)
> - **P39 — Trigger Dispatch & Reconciliation** (event→source mapping, single canonical source, pg_net wiring, webhook/poll reconcile)
> - **P40 — Candidate Timeline & `.ics`** (pull panel, `America/Sao_Paulo` correctness)
> - **P41 — Testing, Observability & Live UAT** (Resend test addresses, CI mocks, retention/LGPD)

---

## Critical Pitfalls

### Pitfall 1: Double-send — the same funnel event emails the candidate twice

**What goes wrong:**
A single logical event ("candidate advanced to async assessment") fires from *more than one place* and the candidate gets two identical emails. In this repo the collision surfaces are already wired and dormant:
- The three **SEC-03 triggers** (`trg_n8n_nova_candidatura` on `candidaturas` INSERT, `trg_n8n_status_candidatura` on `candidaturas` UPDATE OF status, `trg_n8n_revisao_decisao` on `decisao_final`) fire on the *table mutation*.
- A **new trigger on `historico_candidatura`** (the M6 canonical transition log written by `avancar_etapa()`) fires on the *same* transition — so a status change writes a `candidaturas` row AND a `historico_candidatura` row, double-firing.
- The `submit-candidatura` EF **also** fires nova-candidatura post-commit via its own `N8N_NOVA_CANDIDATURA_URL` env var (the SEC-03 migration header itself flags this as a redundant fire to drop in "24-09").
- `pg_net` gives *at-most-once per call*, but a trigger that re-fires (statement retry, a corrective RH re-save, an idempotent-looking UPDATE that still touches the watched column) produces *at-least-once from the caller's perspective* — no dedup in the pipe.

**Why it happens:**
The dispatch source was never consolidated — SEC-03 left three table-level triggers PLUS an EF env-var fire, and M7 adds a fourth surface (`historico_candidatura`) without retiring the others. Nobody owns "exactly one email per event."

**How to avoid:**
1. **Pick ONE canonical dispatch source per event and retire the rest.** `historico_candidatura` is the right spine for *transition* events (it's the audited M6 log); `candidaturas` INSERT is right for confirmation; `agendamentos_entrevista` INSERT for the interview invite; `decisao_final`/`rejeitar_candidatura` for the decision. Repoint or drop the three SEC-03 triggers and the `submit-candidatura` env-var fire in the same phase you add the new ones (SEC-03 is "resolved by substitution," not patched).
2. **Durable DB idempotency gate** in `notificacoes_enviadas`:
   ```sql
   UNIQUE (candidatura_id, evento)   -- natural idempotency key
   ```
   The trigger does `INSERT ... ON CONFLICT (candidatura_id, evento) DO NOTHING RETURNING id;` and **only** `PERFORM net.http_post(...)` when a row was actually inserted (`IF FOUND`). A second fire inserts nothing → no dispatch. This is the *durable* guarantee. (Caveat: the interview-invite event can legitimately recur on reschedule — for that event the key must include `agendamento_id` or a version, else a re-invite is wrongly suppressed.)
3. **Resend `Idempotency-Key` header** as a fast second belt: deterministic from the natural key, e.g. `notif/{candidatura_id}/{evento}`. Resend dedups identical keys — but the key **expires after 24h and max 256 chars**, so it only protects a 24h window. Treat it as belt-and-suspenders; the DB UNIQUE is the source of truth.
4. **Filter the `historico_candidatura` trigger by transition**, not "any row." That log also records **retrocesso** (RH moving a candidate backward to fix a mistake) — a backward move must NOT email "próxima etapa liberada." Fire only on the specific forward transitions you have a template for. Never modify `avancar_etapa()` itself (hard invariant) — add a *separate* AFTER trigger.

**Warning signs:**
- Two `notificacoes_enviadas` rows for one `(candidatura_id, evento)` — impossible if the UNIQUE exists; if you see it, the constraint is missing or the key is wrong.
- A candidate reports "I got the same email twice."
- `net._http_response` shows two POSTs to the EF within milliseconds for one transition.

**Phase to address:** P37 (constraint + state machine + retire SEC-03), P39 (single canonical source + event→source mapping + transition filter).

---

### Pitfall 2: `net.http_post` is fire-and-forget — the funnel advances but the email silently never sent

**What goes wrong:**
`net.http_post(...)` returns a `bigint` request_id **immediately and non-blocking**; the actual HTTP call is made later by the `pg_net` background worker. It **does not block the transaction and never reports failure back to it** — the AFTER trigger returns `NEW`, `candidaturas.etapa_atual` commits, the funnel moves on, and if the EF was down / the worker stalled / Resend 500'd, *the email is just gone*. pg_net is **at-most-once**: no automatic retry. The response lands in `net._http_response`, an **UNLOGGED table retained only ~6 hours** by default, then auto-deleted — so after 6h you can't even answer "did it send?"

**Why it happens:**
Developers read `PERFORM net.http_post(...)` as "send the email" the way a synchronous HTTP client would. It isn't — it's "enqueue a request and forget." The SEC-03 skeleton already has this shape (`PERFORM net.http_post` then `RETURN NEW`), so it's easy to copy the fire-and-forget without adding reconciliation.

**How to avoid:**
1. **`pendente → enviado → entregue / falhou / bounce` state machine** in `notificacoes_enviadas`. The trigger writes the row as `pendente` **synchronously** (this is also the idempotency gate from Pitfall 1) and stores the `net.http_post` `request_id`. The EF flips it to `enviado` and stores the `resend_email_id`. Reconciliation flips it to `entregue`/`falhou`/`bounce`.
2. **Reconcile — two options, prefer the webhook:**
   - **Resend webhooks** (`email.sent`, `email.delivered`, `email.bounced`, `email.complained`) → a small `--no-verify-jwt` EF that verifies the Svix signature and updates `notificacoes_enviadas` by `resend_email_id`. Durable, push-based, survives the 6h window.
   - **Poll `net._http_response`** via `pg_cron` (NOT a trigger — see Integration Gotchas) *within 6h* to catch requests that never reached the EF (worker stalled, timeout). Use it as a safety net for the "EF never answered" case the webhook can't cover.
3. **Raise the pg_net timeout.** Default `timeout_milliseconds` is **2000ms**. If the EF blocks on a Resend round-trip + template render it can exceed 2s, and pg_net marks the request `timed_out=true` even if the EF actually completes — producing a false "failed" (or a real drop). Pass an explicit higher timeout (e.g. 5000) **and** make the EF fast (send, then return; don't do heavy work after the Resend call).
4. **A pending-row sweeper**: rows stuck in `pendente` past N minutes are the queryable answer to "which candidates didn't get their email" — the whole point of the audit table.

**Warning signs:**
- No SQL query can answer "which candidates are missing their notification" → you have no state machine.
- `notificacoes_enviadas` rows exist but all say `pendente` (or the table has no status column at all).
- `net._http_response` shows `timed_out=true` or `status_code >= 500` for the EF URL.
- Emails arrive in dev but "sometimes don't" in prod and nobody can tell why.

**Phase to address:** P37 (state machine columns), P39 (pg_net wiring + timeout + reconciliation webhook/poll + cron sweeper).

---

### Pitfall 3: PII / criterion leak in the rejection email (breaks D-15, RNF-12a, RNF-07a)

**What goes wrong:**
Four distinct leaks, all live risks here:
1. **D-15 violation:** the rejection email interpolates the knockout reason / score / "you failed the SJT" / `motivo_rejeicao` / `opcao_knockout_id`. D-15 requires the rejection message to be **neutral — the criterion is NEVER exposed**. The candidate-facing surfaces already enforce this (P8 caught `listCandidaturas` leaking `opcao_knockout_id`/`motivo_rejeicao`); an email is a *new* candidate-facing surface that must inherit the same discipline.
2. **RNF-12a violation:** template copy says "teste psicológico" / raw Big Five percentile / trait labels instead of "avaliação comportamental/cognitiva," or exposes behavioral bands the product deliberately neutralized (UX-07).
3. **RNF-07a violation:** wiring the rejection email to fire off an *automatic score gate* rather than a *human-recorded decision*. The email must only dispatch off a human decision (`decisao_final` with `por_usuario IS NOT NULL`, or `rejeitar_candidatura` RPC), never "score < X → email rejection." (The one sanctioned exception — the Etapa-1 objective knockout in `submit_candidatura_atomic`, which uses no trait/score/idade — already has its own neutral D-15 path; do not build a second auto-reject.)
4. **RLS-as-column-secret (the recurring scar):** the EF reads candidate data with `select('*')` and ships internal fields into the template; or `notificacoes_enviadas` is exposed to the candidate via a too-broad RLS policy so they can read the stored body / other candidates' rows. RLS is **row-level, not column-level** — it does not hide `motivo_rejeicao` sitting in a selected row.

**Why it happens:**
Templates are written by copy-pasting the RH-facing decision view (which legitimately shows the criterion) into the candidate email. And "just `select('*')` the candidatura" is the path of least resistance in a fresh EF.

**How to avoid:**
- **Rejection template = a FIXED neutral string.** It interpolates only name + vaga title + a generic "não seguiremos com sua candidatura neste momento." Zero interpolation of score/criterion/trait. Add a grep/unit guard that the rejection template source contains none of `motivo_rejeicao|opcao_knockout|score|knockout|percentil|psicológic`.
- **EF reads via explicit allowlist**, never `select('*')` (reuse the P8/P24 allowlist discipline; the M6 own-row RPC pattern is the model). Select only `{ nome, email, vaga_titulo, evento }`.
- **`notificacoes_enviadas` RLS:** candidate **DENY** (RH/service-role only) is safest — the candidate doesn't need to read the audit log; the *panel timeline* (Pitfall 9's pull) reads `historico_candidatura` own-row, not this table. If any candidate read is ever needed, it's an own-row **allowlist RPC** that excludes `destinatario`, the rendered body, and internal status detail.
- **Don't persist full rendered HTML with PII.** Store `evento` + `resend_email_id` + `status` + timestamps. If you must store the body for debug, redact PII or set a short retention (Pitfall 8).
- **RNF-07a gate:** the decision-email trigger fires on the human write-path (`rejeitar_candidatura` / `decisao_final`), never on a score threshold.

**Warning signs:**
- The rejection template file mentions any scoring/criterion token.
- The EF's candidate query is `select('*')` or `select()` without an explicit column list.
- A candidate JWT can `SELECT` from `notificacoes_enviadas` (test it with an impersonated JWT smoke — the M4 pattern that caught SEC-07/08).
- Copy uses "teste psicológico" or shows a raw percentile.

**Phase to address:** P38 (allowlist reads + neutral templates + grep guard), P37 (`notificacoes_enviadas` RLS shape).

---

### Pitfall 4: Trigger→EF auth — a spoofable send endpoint, or an over-verified call that the DB can't make

**What goes wrong:**
Two failure modes at opposite ends:
- **Over-verified (blocked):** deploy `notificar-candidato` with `verify_jwt` ON (the default). The pg_net call from the trigger carries no end-user JWT → the EF returns **401** and no email ever sends. Silent, because pg_net won't report the 401 to the transaction (Pitfall 2).
- **Under-verified (spoofable):** deploy `--no-verify-jwt` with no self-auth → **anyone on the internet can `curl` the EF and send email as Beauty Smile**, forging notifications, burning quota, and torching domain reputation with spam complaints.

**Why it happens:**
The DB-originated call has no user identity, so `verify_jwt` ON is wrong; but flipping it off without a replacement check leaves the door open. The repo already has the exact right pattern (the `analise` EF is `--no-verify-jwt` + self-auth Bearer) and it's easy to not mirror it.

**How to avoid:**
**Mirror the `analise` EF pattern exactly:** deploy `--no-verify-jwt`, but **self-authenticate with a shared Bearer secret**. The trigger reads an invoke key from Vault (the repo already uses a Vault `edge_invoke_key` for `reprocessar_analise`) and passes it in the pg_net `headers` (`Authorization: Bearer <key>`); the EF compares against its own env/Vault copy and 401s on mismatch. This authenticates *the caller is our DB*, which is the correct authorization boundary for a system-originated dispatch (there's no end user to authorize — the trigger already proved the transition happened). If the EF *also* reads candidate PII, it reads via service-role + allowlist (Pitfall 3), and the Bearer check is the only "authorize" step needed because the payload identifies the candidatura.

**Warning signs:**
- `curl -X POST https://<proj>.functions.supabase.co/notificar-candidato -d '{...}'` with no auth header **sends an email**.
- EF logs show 401 for every trigger-originated call (verify_jwt left ON).
- The Bearer key lives in the client bundle or a `VITE_` var (it must be Vault/EF-env only — VITE_ vars inline into the public bundle, the exact SEC-03 leak class).

**Phase to address:** P38 (EF self-auth), P36/P39 (Vault invoke-key provisioning + trigger header wiring).

---

### Pitfall 5: Deliverability — verified-domain / DKIM / SPF / DMARC gaps land every email in spam

**What goes wrong:**
Emails send "successfully" (Resend 200) but never reach the inbox: they hit spam/quarantine or are outright rejected. Root causes, in order of frequency:
- Sending from an **unverified domain** or from `onboarding@resend.dev` in production.
- **No DMARC record** — Gmail and Yahoo have *required* DMARC for senders since 2024; without it, delivery to the two biggest providers degrades.
- **No reply-to**, or from-address at a bare domain the candidate doesn't recognize.
- **Link/domain mismatch** — links in the email pointing to a domain different from the sending domain trip spam filters (Resend "Attention Insights" flags this explicitly).
- Portuguese content with spammy phrasing / all-image emails / no plain-text part.

**Why it happens:**
DKIM+SPF are auto-configured by Resend *when you verify the domain*, so teams assume "verified = done" and skip DMARC (which Resend does **not** add automatically — it must be published manually). And the free-tier `onboarding@resend.dev` works in dev, masking the missing prod domain.

**How to avoid — actionable DKIM/deliverability checklist (do this in P36, before any send code):**
- [ ] Verify a **real Beauty Smile sending subdomain** in Resend (e.g. `mail.beautysmile.com.br` / `rh.beautysmile.com.br`) — this auto-publishes **SPF + DKIM** DNS records; confirm the domain shows "Verified" in the Resend dashboard.
- [ ] **Publish DMARC manually**: `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@beautysmile.com.br` (Resend does not add this).
- [ ] Set a real **From**: `Beauty Smile <nao-responda@mail.beautysmile.com.br>` — never `onboarding@resend.dev` in prod.
- [ ] Set a real **Reply-To**: a monitored RH inbox (`rh@beautysmile.com.br`) so candidate replies don't black-hole.
- [ ] Ensure **every link in the email is on the sending domain** (or the app domain that aligns with SPF/DKIM). No mismatched tracking domains.
- [ ] Send both **HTML and a plain-text** part.
- [ ] Smoke each template through `delivered@resend.dev`, `bounced@resend.dev`, `complained@resend.dev` and inspect the Resend dashboard/webhook (Pitfall 10).

**Warning signs:**
- Test emails land in Spam/Promotions in a real Gmail account.
- Resend dashboard shows the domain as "Pending"/"Not verified."
- Rising bounce/complaint rate in Resend analytics; From uses `resend.dev`.

**Phase to address:** P36 (domain verify + DKIM/SPF/DMARC + sender identity — a hard prerequisite for every later phase; largely a human/DNS action for Fernando).

---

### Pitfall 6: Hard bounces & complaints quietly poisoning domain reputation

**What goes wrong:**
Candidates fat-finger their email at signup; sending to those addresses generates **hard bounces**. A rising hard-bounce rate and spam-complaint rate degrade domain reputation, which then hurts deliverability for *every* candidate — a slow, invisible decay. Because the funnel writes `historico_candidatura` regardless of email outcome, the ATS keeps "notifying" bad addresses forever with no feedback loop.

**Why it happens:**
The pipeline treats "sent to Resend" as success and never ingests bounce/complaint webhooks, so bad addresses are re-hit every stage and Resend's suppression list is invisible to the ATS.

**How to avoid:**
- **Ingest `email.bounced` and `email.complained` webhooks** (same reconciliation EF as Pitfall 2) and mark the `notificacoes_enviadas` row `bounce`/`reclamado`.
- **Flag the candidato** (a soft `email_invalido` / `email_suprimido` marker) so RH sees "we couldn't reach this candidate" in the funnel and the pipeline stops re-sending to a known-bad address (Resend also auto-suppresses, but the ATS should reflect it).
- Validate email format at signup (already done via Zod) — but format-valid ≠ deliverable; the webhook is the only real signal.
- Keep hard-bounce rate low by not emailing addresses already marked suppressed.

**Warning signs:**
- Resend dashboard bounce rate climbing over time.
- Same address bounces on every stage transition.
- RH says "candidate never got anything" but pipeline shows `enviado`.

**Phase to address:** P39 (bounce/complaint webhook ingestion + suppression marker), surfaced to RH in the funnel.

---

### Pitfall 7: Re-authoring the SEC-03 triggers / migration-ledger drift (repo-specific scars)

**What goes wrong:**
M7 must repoint or drop three existing SEC-03 triggers and add new ones. Three known repo scars bite here:
1. **`CREATE OR REPLACE FUNCTION` silently dropping live guards** — a re-authored trigger body that doesn't reproduce the *live* function loses behavior. (M4/P27 DBMIG-02 caught a re-authored migration about to drop the ENTREV-03 flag-guard; the SEC-03 functions carry a `graceful-skip if secret NULL` guard and `RETURN NEW` semantics that must survive.)
2. **`42601` on PL/pgSQL `$$` bodies** — `supabase db push --linked` over the transaction pooler fails with "cannot insert multiple commands into a prepared statement" when `CREATE FUNCTION`/`DO $$…$$` sits next to adjacent `COMMENT`/`REVOKE`/`GRANT`.
3. **MCP `apply_migration` stamps a timestamp version-row** (not the filename version) → ledger drift; and **DBMIG-01 baseline debt is already open** — entangling the new email migrations with baseline-fill work compounds the drift.

**Why it happens:**
The obvious path (`db push`) fails on `$$` bodies; the workaround (MCP) introduces its own ledger accounting that must be reconciled; and re-authoring a live function from an old file is easy to get subtly wrong.

**How to avoid:**
- **Diff the LIVE function body first** (`pg_get_functiondef` / MCP `get_edge_function` for EFs) before any `CREATE OR REPLACE` — the DBMIG-02 discipline.
- **Apply via Supabase MCP `apply_migration` / `execute_sql`** (bypasses 42601), **no `BEGIN;…COMMIT;` wrapper** (CLAUDE.md D-22 — the CLI driver wraps each migration itself; the outer BEGIN/COMMIT is the 42601 trigger), add an inline note explaining why.
- **Reconcile the ledger after apply** (`supabase migration repair --status applied <version>` or the MCP-written version row) — record the version rows, don't re-migrate. Keep the M7 migrations **self-contained**; do **not** touch or depend on the DBMIG-01 baseline-fill (it's environment-gated/deferred — leave it out of scope).
- **Retire SEC-03 in the same phase** you add the replacement — either `DROP TRIGGER` the three n8n triggers or repoint their bodies to the new EF, and drop the `submit-candidatura` env-var fire. Don't leave both live.

**Warning signs:**
- `db push` errors with SQLSTATE 42601.
- `supabase migration list` shows drift after an MCP apply.
- The new trigger works but the graceful-skip/no-PII invariant regressed vs the live SEC-03 body.

**Phase to address:** P37 (data-layer migrations + SEC-03 retirement, applied via MCP with ledger reconcile).

---

### Pitfall 8: LGPD, timezone, and transactional-vs-marketing classification

**What goes wrong:**
- **Timezone drift:** timestamps stored in UTC but rendered in the email / `.ics` without converting to `America/Sao_Paulo` → the interview invite says the wrong hour. M6 already hand-rolled a client-side RFC-5545 `.ics` in `America/Sao_Paulo`; an email-attached `.ics` that uses a different TZ (or floating time) contradicts the panel card.
- **Reclassification risk:** the decision to send **transactional, no opt-out** is only defensible if the email *stays* transactional — triggered by the candidate's own action/decision, purely service content. Adding any promotional line ("conheça nossas outras vagas!"), a newsletter, or batching reclassifies it as marketing under LGPD and *retroactively* creates an opt-out/consent obligation.
- **Retention creep:** `notificacoes_enviadas` accumulates candidate email + (if stored) body forever — a growing PII liability with no retention policy, exactly the "passivo que cresce a cada candidatura" the M5-DRAFT LGPD-OPS group flags.

**Why it happens:**
Postgres `timestamptz` + naive rendering hides TZ bugs until a real invite goes out; and "it's just one helpful extra line" is how transactional email drifts into marketing.

**How to avoid:**
- **Render all candidate-facing times in `America/Sao_Paulo`** in both the email body and any `.ics`; reuse the M6 `.ics` generation (share the helper, don't fork it — Pitfall 11). Store UTC, convert at render.
- **Keep the four emails strictly transactional**: confirmation, next-stage-unlocked, interview invite, decision. No cross-sell, no batch, no promo. Footer is informative (who we are, why you got this), not a marketing opt-out.
- **Define `notificacoes_enviadas` retention up front** (discuss-phase decision per PROJECT.md): store minimal fields (event + resend_email_id + status + timestamps), avoid persisting full bodies with PII, and set a retention window / purge job aligned with LGPD minimization. Don't hoard.
- The `.ics`/invite must not leak internal RH notes (M6 already excludes `observacoes_rh` from the candidate own-row — the email must inherit that allowlist).

**Warning signs:**
- Interview email time ≠ panel card time.
- A template contains any non-service/promotional sentence.
- `notificacoes_enviadas` stores full HTML bodies with name/email and has no purge job.

**Phase to address:** P40 (TZ + `.ics` reuse), P37/P41 (retention policy on `notificacoes_enviadas`), P38 (template content discipline).

---

### Pitfall 9: The "estimativa de prazo / timeline" pull panel over-promises or contradicts the push

**What goes wrong:**
The dashboard timeline shows a hard date ("resposta até 12/07") the RH can't meet, creating a promise/expectation the business then breaks — worse anxiety than silence, and arguably a commitment. Or the *pull* (panel says "em triagem") contradicts the *push* (email said "avançou para avaliação") because they read different sources or update at different times.

**Why it happens:**
It's tempting to compute a precise SLA date; and the panel and the email evolve separately.

**How to avoid:**
- Show a **soft range in business days** ("triagem — costuma levar até X dias úteis"), not a hard calendar deadline the RH is contractually held to.
- Drive the panel timeline from the **same `historico_candidatura` source** the email dispatch reads, so push and pull can't disagree about the current stage.
- Keep copy neutral and consistent with D-15 (the waiting-state text must not hint at outcome/criterion either).

**Warning signs:**
- Panel shows a hard date; RH regularly blows past it.
- Panel stage ≠ the last email's stage for the same candidate.

**Phase to address:** P40 (timeline panel, sourced from `historico_candidatura`).

---

### Pitfall 10: Testing that spams real candidates or needs a live key in CI

**What goes wrong:**
An integration test (or a careless prod smoke) emails `candidato.funil@teste.com` — or worse a real applicant — repeatedly; or CI can't run because the EF hard-requires a live `RESEND_API_KEY`, so the email path ships untested.

**Why it happens:**
No test-mode discipline; the EF calls Resend unconditionally.

**How to avoid:**
- **Use Resend's dedicated test addresses** for behavior/UAT: `delivered@resend.dev` (success), `bounced@resend.dev` (SMTP 550 5.1.1 hard bounce), `complained@resend.dev` (spam report), `suppressed@resend.dev`. They exercise the full webhook/status path **without harming domain reputation** — but note they **count against sending quota**.
- **CI has no live key:** the Deno EF corpus (the existing `deno-test` job pattern) **mocks the Resend fetch/SDK** — inject the sender as a dependency (`deps.send`) so unit tests assert the payload (from/to/subject/idempotency-key/neutral-body) without a network call. Contract-test the trigger payload against the EF's Zod schema (the M4 "integration contract gap" lesson — mock both sides and the real contract can still be broken).
- **Env guard**: in non-prod, refuse to send to any address not on an allowlist (`*@resend.dev` + the known test accounts), so a stray test can't reach a real inbox.
- Reconciliation/webhook path is testable by POSTing recorded Resend webhook fixtures to the reconcile EF.

**Warning signs:**
- A test's assertion depends on an email actually arriving in a real mailbox.
- CI skips or red-X's the email EF for "missing RESEND_API_KEY."
- A prod smoke sent to a real candidate address.

**Phase to address:** P41 (test-address UAT + CI mocks + env allowlist guard + contract test).

---

### Pitfall 11: `_shared` bundle freeze + dynamic-import scar in the new EF

**What goes wrong:**
Two known EF scars recur:
1. **`await import([...].join("npm:"))`-style dynamic import hides the package from the Supabase deploy bundler → `ERR_MODULE_NOT_FOUND` 500 at runtime.** If the Resend SDK is imported dynamically/concatenated, the EF boots then 500s on first send.
2. **`_shared/*.ts` bundle freeze:** if `notificar-candidato` (and the reconcile EF, and any repointed dispatch) share a helper (cors, `efErrors`, auth) and you edit it, **only the EF you redeploy** picks up the change; the others keep the frozen bundle → silent drift.

**Why it happens:**
Copy-paste from an older EF that used the dynamic-import trick; and forgetting that shared-file edits require redeploying every consumer.

**How to avoid:**
- **Static `npm:` import** for the Resend SDK (`import { Resend } from 'npm:resend@x'`) — or skip the SDK entirely and `fetch('https://api.resend.com/emails', ...)` with the `Idempotency-Key` header, which sidesteps the bundler question and keeps the EF tiny.
- **Redeploy every EF that consumes an edited `_shared` file** in the same phase; use MCP `get_edge_function` to diff deployed-vs-local before declaring done.

**Warning signs:**
- EF boot smoke passes (401/health) but first real send returns 500 `ERR_MODULE_NOT_FOUND`.
- A shared helper change works in one EF and not another.

**Phase to address:** P38 (EF authoring — static import, shared-file redeploy discipline).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip `notificacoes_enviadas` state machine; just `PERFORM net.http_post` | Ship faster; mirrors SEC-03 skeleton | No idempotency (Pitfall 1) + no "did it send?" answer (Pitfall 2); silent drops in prod | **Never** — the audit/idempotency table is the whole point of the milestone |
| Resend `Idempotency-Key` as the *only* dedup | One header, no DB gate | 24h expiry → a re-fire >24h later double-sends; not durable | Only as a *second* belt behind the DB UNIQUE |
| Store full rendered HTML body in `notificacoes_enviadas` for debug | Easy replay/inspection | Growing PII liability, LGPD retention problem (Pitfall 8) | Short-lived, redacted, with a purge job — else never |
| Deploy EF `--no-verify-jwt` and defer self-auth | Trigger call works immediately | Public spoofable send endpoint (Pitfall 4) | **Never** ship without the Bearer self-auth |
| Poll `net._http_response` only (no webhook) | No extra EF | 6h retention → misses late delivery/bounce signals; no complaint feedback | Acceptable as a *safety net* alongside the webhook, not instead of it |
| Keep SEC-03 triggers live "temporarily" alongside new ones | Don't touch working code | Guaranteed double-send (Pitfall 1); SEC-03 never actually retired | Never — retire in the same phase |
| Reuse `onboarding@resend.dev` in prod | No DNS work | Spam-foldered, unbranded, reputation-less (Pitfall 5) | Dev/CI only |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Resend `/emails` API** | Treating a 200 as "delivered" | 200 = *accepted*; delivery/bounce arrives later via webhook — reconcile status |
| **Resend Idempotency-Key** | Assuming it dedups forever | Expires after **24h**, max 256 chars — durable dedup is the DB UNIQUE |
| **pg_net `net.http_post`** | Reading it as a blocking send | Non-blocking, **at-most-once**, returns a request_id; failures only in `net._http_response` (6h TTL) |
| **pg_net timeout** | Leaving default 2000ms with a slow EF | Set explicit higher `timeout_milliseconds`; keep EF fast; false `timed_out` otherwise |
| **`net._http_response`** | Adding a trigger to it to react to responses | **Never** — a trigger that calls a pg_net fn here can infinite-loop; poll via `pg_cron` instead |
| **Resend webhooks** | Not verifying the Svix signature | Verify signature in the reconcile EF (`--no-verify-jwt` + signature check), else spoofable status updates |
| **Vault secret** | Putting Resend key / invoke key in a `VITE_` env | `VITE_` inlines into the public bundle (the SEC-03 leak class) — Vault / EF-env only |
| **`historico_candidatura` trigger** | Firing on every row incl. retrocesso | Filter by the specific forward transitions with a template; never modify `avancar_etapa()` itself |
| **`.ics` in email** | Regenerating separately from M6's panel `.ics` | Share the M6 RFC-5545 helper; same `America/Sao_Paulo`; exclude `observacoes_rh` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `net.http_request_queue` backs up when EF/endpoint is slow or down | Emails delayed minutes/hours; worker busy | Keep EF fast (send-then-return); reasonable timeout; monitor queue depth | Sustained EF latency or outage; low volume masks it |
| pg_net background worker stalls | All dispatch stops silently, funnel keeps moving | Monitor; `pg_net` ≥0.8 has a worker restart fn; alert on `pendente` backlog | Any worker crash; recovers only on restart |
| `net._http_response` (UNLOGGED) growth | Table bloat if not auto-cleared | Rely on the default ~6h purge; don't disable it | High send volume without the purge |
| `notificacoes_enviadas` unbounded PII growth | Slow queries, LGPD liability | Retention/purge job (Pitfall 8); index `(candidatura_id, evento)` and `status` | Every candidature adds rows forever |
| Resend free-tier quota (incl. test-address sends) | Sends start failing at the cap | Track volume; test-address smokes count against quota | Bursty stage transitions + heavy testing |

> At Beauty Smile's single-tenant recruiting volume these are low-probability, but the *silent* failure modes (worker stall, queue backup) matter more than throughput — a stalled worker with a moving funnel is the dangerous case.

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| EF `--no-verify-jwt` with no self-auth | Anyone sends email as Beauty Smile → spoof/spam/reputation | Bearer invoke-key from Vault, checked in the EF (mirror `analise`) |
| `select('*')` in the EF's candidate read | PII / internal fields (motivo_rejeicao, score) into the email | Explicit allowlist column list only |
| `notificacoes_enviadas` readable by candidate | Reads other candidates' emails / internal status / body | Candidate DENY (RH/service only); RLS is row-level, not a column secret |
| Resend key or invoke key in bundle / `VITE_` var | Public key exfiltration, forged sends (the SEC-03 leak class) | Vault / EF-env only; grep guard against `VITE_.*RESEND` |
| Webhook EF trusts unsigned payloads | Forged delivery/bounce status flips `notificacoes_enviadas` | Verify Svix signature before any DB write |
| Rejection email exposes criterion/score | D-15 breach; LGPD/legal exposure | Fixed neutral template + grep guard; RNF-07a human-gated dispatch |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Rejection email reveals why they were cut | Distress, disputes, D-15 breach | Neutral fixed copy; criterion never exposed |
| Hard SLA date the RH misses | Broken promise worse than silence | Soft "até X dias úteis" range |
| Push email contradicts pull panel | Confusion, distrust | Both read `historico_candidatura`; single source |
| Interview time in wrong timezone | Missed interviews | `America/Sao_Paulo` everywhere; reuse M6 `.ics` |
| No reply-to / unbranded from | Replies black-hole; looks like phishing → spam-reported | Real From + monitored Reply-To on verified domain |
| "teste psicológico" / raw percentile in copy | RNF-12a breach; misleads candidate | "avaliação comportamental/cognitiva"; neutral bands |

## "Looks Done But Isn't" Checklist

- [ ] **Idempotency:** `notificacoes_enviadas` has a `UNIQUE (candidatura_id, evento)` and the trigger gates dispatch on `ON CONFLICT DO NOTHING RETURNING` — verify a double-fire produces exactly one email.
- [ ] **"Did it send?":** a single SQL query lists candidates whose notification is `pendente`/`falhou` — verify the state machine flips on a real send.
- [ ] **Reconciliation:** Resend webhook (or `pg_cron` poll of `net._http_response` within 6h) updates status — verify `bounced@resend.dev` flips a row to `bounce`.
- [ ] **SEC-03 retired:** the three n8n triggers + `submit-candidatura` env-var fire are dropped/repointed — verify no double-fire from the old path.
- [ ] **EF auth:** unauth `curl` to the EF is rejected (401) — verify the Bearer self-auth, not just verify_jwt behavior.
- [ ] **PII allowlist:** the EF's candidate read is an explicit column list, not `select('*')` — grep the EF.
- [ ] **D-15:** rejection template contains no criterion/score token — grep the template source.
- [ ] **Deliverability:** domain shows "Verified" in Resend; SPF+DKIM present; DMARC published manually; From/Reply-To real — verify a real Gmail inbox delivery (not test address).
- [ ] **Timezone:** email time == panel card time == `.ics` time, all `America/Sao_Paulo`.
- [ ] **Ledger:** M7 migrations applied via MCP with `schema_migrations` reconciled; no DBMIG-01 entanglement; `db push --linked` says "up to date."
- [ ] **CI:** email EF unit tests pass with no live `RESEND_API_KEY` (mocked sender); non-prod refuses non-allowlisted recipients.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Double-send shipped (no UNIQUE) | MEDIUM | Add `UNIQUE (candidatura_id, evento)` (dedup existing rows first), add `ON CONFLICT` gate, redeploy; apologize to affected candidates |
| Silent drops (no state machine) | MEDIUM | Add status columns + backfill `pendente` from `historico_candidatura`; add reconciliation; manually re-notify the gap |
| Criterion leaked in a rejection email | HIGH | Cannot unsend; fix template + grep guard immediately; assess LGPD notification obligation; audit `notificacoes_enviadas` for scope |
| Spoofable EF discovered | HIGH | Add Bearer self-auth + redeploy immediately; rotate the invoke key; check Resend logs for forged sends |
| Domain not verified → all spam | LOW | Verify domain (auto SPF/DKIM), publish DMARC, fix From/Reply-To; wait for DNS/reputation to recover |
| Ledger drift after MCP apply | LOW | `migration repair --status applied <version>`; do NOT re-run migrations |
| pg_net worker stalled | LOW | Restart worker (pg_net ≥0.8); reprocess `pendente` rows via the reconcile path |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 — Double-send | P37 (constraint) + P39 (single source + transition filter) | Double-fire test → exactly one `notificacoes_enviadas` row + one email |
| 2 — Fire-and-forget silent drop | P37 (state machine) + P39 (timeout + reconcile + cron sweep) | Query lists `pendente`/`falhou`; `bounced@resend.dev` flips status |
| 3 — PII / D-15 leak | P38 (allowlist + neutral template) + P37 (RLS) | Grep template for criterion tokens; impersonated-JWT smoke on `notificacoes_enviadas` |
| 4 — Trigger→EF auth | P38 (self-auth) + P36/P39 (Vault key + header) | Unauth `curl` → 401; trigger call → 200 |
| 5 — Deliverability | P36 (domain/DKIM/SPF/DMARC/sender) | Resend "Verified"; real Gmail inbox delivery |
| 6 — Bounce/complaint reputation | P39 (webhook ingest + suppression marker) | `bounced@`/`complained@` flip status + mark candidato |
| 7 — Migration/ledger | P37 (MCP apply + reconcile, SEC-03 retire) | `db push` "up to date"; live-body diff pre-replace |
| 8 — LGPD/TZ/retention | P40 (TZ/`.ics`) + P37/P41 (retention) | Email time == panel == `.ics`; retention/purge exists |
| 9 — Timeline over-promise | P40 (panel from `historico_candidatura`) | Soft range; push/pull stage agree |
| 10 — Testing/spam/CI | P41 (test addresses + mocks + env guard) | CI green without live key; no real inbox hit |
| 11 — `_shared` freeze / dynamic import | P38 (static import + redeploy discipline) | First real send ≠ 500; `get_edge_function` diff clean |

## Sources

- Resend — Idempotency-Key (POST /emails header: max 256 chars, expires 24h; SMTP `Resend-Idempotency-Key`): https://resend.com/docs (via Context7 `/websites/resend`) — HIGH
- Resend — Test addresses (`delivered@`/`bounced@`/`complained@`/`suppressed@resend.dev`; count against quota; safe for reputation): https://resend.com/docs/dashboard/emails/send-test-emails and /docs/knowledge-base/what-email-addresses-to-use-for-testing — HIGH
- Resend — Deliverability (SPF+DKIM auto on domain verify, DMARC manual, Gmail/Yahoo require DMARC since 2024, URL/domain match): https://resend.com/docs/knowledge-base/why-are-my-emails-going-to-spam — HIGH
- Resend — Webhooks (`email.sent`/`delivered`/`bounced`/`complained`, Svix signature, tags): https://resend.com/docs/webhooks/emails — HIGH
- Supabase pg_net — signature (returns bigint request_id, default timeout 2000ms), `net._http_response` UNLOGGED table: https://supabase.com/docs/guides/database/extensions/pg_net — HIGH
- Supabase pg_net — at-most-once, no retry, ~6h response retention, worker restart (≥0.8), do-not-trigger `net._http_response`: https://github.com/supabase/pg_net + https://supabase.com/docs/guides/troubleshooting/webhook-debugging-guide-M8sk47 — HIGH
- Repo scars: `.planning/PROJECT.md` (Key Decisions: MCP timestamp ledger, static `npm:` import, RLS-not-column-secret, EF authenticate-THEN-authorize), `CLAUDE.md` (42601 workaround / D-22), `supabase/migrations/20260706110005_sec03_n8n_serverside.sql` (dormant SEC-03 triggers, graceful-skip, RNF-07a comments, double-fire note), MEMORY (`reference_select_star_leaks_pii`, `reference_ef_authenticate_vs_authorize`, `reference_ef_shared_bundle_freeze`, `reference_ef_npm_join_import_bug`, `feedback_integration_contract_gap`) — HIGH

---
*Pitfalls research for: transactional email (Resend) + pg_net DB-trigger dispatch on a Supabase/Deno ATS (M7 COMM)*
*Researched: 2026-07-17*
