# Project Research Summary

**Project:** Sistema de Recrutamento Beauty Smile — M7 (v7.0) "Comunicação com o Candidato" (COMM)
**Domain:** Transactional email notification pipeline (Resend) + candidate waiting-timeline, bolted onto a shipped Supabase/Deno ATS
**Researched:** 2026-07-17
**Confidence:** HIGH

## Executive Summary

M7 is an **additive integration**, not a greenfield build: the React/Vite/Supabase/Deno stack, the funnel (`avancar_etapa()`, `historico_candidatura`), and the DB-trigger→`pg_net`→EF dispatch mechanism are all already shipped and proven (SEC-03's dormant n8n triggers, `analise-candidato-individual`, `cost-alerter`'s Resend `fetch`). All four research passes converge on the same shape: **Topology A** — `historico_candidatura`/`candidaturas`/`agendamentos_entrevista` triggers → `net.http_post` (ids-only body, Vault Bearer) → a new EF `notificar-candidato` (self-auth, allowlist PII read, plain-HTML templating, `fetch` to `api.resend.com/emails`, zero new npm deps) → Resend. This is a near-verbatim clone of the existing `trg_candidatura_analise` + `analise-candidato-individual` pattern, which is precisely why confidence is HIGH: almost every architectural decision has a shipped precedent to mirror rather than invent.

The one place research disagrees with the PRD-locked scope, and the one place the "obvious" design is wrong, matter more than the stack choices. First, the trigger source-of-truth is a **deliberate mix**, not a compromise: `avancar_etapa()` only fires `BEFORE UPDATE OF etapa_atual`, so a candidatura INSERT (event 1) and an agendamento INSERT (event 3) never produce a `historico_candidatura` row — forcing satellite triggers on those two tables alongside one CASE-based trigger on the transition log for events 2 and 4. Second, **double-send is the top structural risk**: this repo already has three dormant SEC-03 n8n triggers plus a `submit-candidatura` env-var fire that collide with the new dispatch surface unless retired in the *same* phase, backstopped by a durable `UNIQUE(dedupe_key)` gate (not just Resend's 24h `Idempotency-Key`). Third, `net.http_post` is fire-and-forget/at-most-once with a 2000ms default timeout and a 6-hour-TTL response log — the funnel commits regardless of send outcome, so a `pendente→enviado→entregue/falhou/bounce` state machine reconciled by Resend webhooks (plus a `pg_cron` poll safety net) is required, not optional.

Recommended mitigations, all converged across the four files: hand-rolled HTML templates (not react-email, which is documented-broken in Deno edge runtimes); a verbatim server-side port of M6's pure RFC-5545 `.ics` generator into `supabase/functions/_shared/ics.ts`; a single `notificacoes_enviadas` table doing triple duty as audit log, idempotency guard, and retry queue with RH-only vaga-scoped RLS (candidate-DENY, mirroring the row-level-not-column-secret lesson); a static `config_sla_etapa` table for the candidate timeline (computed-from-history is an explicit v2+ deferral, not a v1 gap); and a human-gated prerequisite — Fernando must verify a Beauty Smile sending subdomain in Resend (SPF/DKIM auto, DMARC manual) before any real send, while dev/CI uses Resend's `*@resend.dev` test addresses with a mocked sender in unit tests. Several genuinely open product/engineering questions (rejection-email free-text note vs D-15, whether the approve path actually writes `etapa_atual`, retention window, reconciliation scope, knockout double-send, exact rate limits) are deliberately unresolved here and flagged for discuss-phase below.

## Key Findings

### Recommended Stack

The send path needs **zero new npm dependencies**: plain Deno `fetch` to `https://api.resend.com/emails` with `Authorization: Bearer` + `Idempotency-Key` headers, matching Resend's own official Supabase Edge Functions guide (not their Deno-Deploy guide, which uses the SDK). The `resend@6.17.2` SDK is reserved for a *later, separate* webhook-verification EF where `resend.webhooks.verify()` (Svix signature check) earns its keep — if used there, it must be a **static** `import { Resend } from "npm:resend@6.17.2"` at module top (the repo was previously burned by a dynamic `await import([...].join("npm:"))` form that hides packages from the bundler). Everything else reuses existing repo infrastructure verbatim: `pg_net`/`net.http_post` (already live via SEC-03), Supabase Vault (`project_url` + `edge_invoke_key` — explicitly **not** the retired `n8n_webhook_base`), `@supabase/supabase-js@2` via the repo's `esm.sh` convention, and the shared `zod` import-map convention for payload validation.

**Core technologies:**
- Resend HTTP API via plain `fetch` — the send call; zero dependency surface, matches Resend's official Supabase example
- `pg_net` (`net.http_post`) — DB trigger → EF hop; already load-bearing infrastructure from SEC-03, repointed rather than reinvented
- Supabase Vault — stores `RESEND_API_KEY` + reuses the existing `project_url`/`edge_invoke_key` pair; never touches the client bundle or `VITE_` env
- Hand-rolled HTML string templates (`_shared/email-templates.ts`) — NOT `@react-email/*`, which has documented `MessageChannel`/JSX/`eval` failures in Deno edge runtimes
- `notificacoes_enviadas` (new table) — the lightweight queue/audit/idempotency ledger; explicitly NOT BullMQ/Redis/QStash/pgmq (overkill for 4 event types at this volume)

### Expected Features

The milestone locks exactly 4 events, but they are not equal effort — research recommends front-loading the trivial ones to prove the pipeline before the nuanced ones. Event 1 (confirmação) is lowest-risk and should be wired first; Event 3 (convite de entrevista) is the highest-nuance (depends hardest on M6, needs the server-side `.ics` port, timezone/DST correctness); Event 4 (decisão/rejeição) is technically easy but carries the highest *copy* risk (D-15 neutrality).

**Must have (table stakes):**
- Application-received confirmation email (Event 1) — silence after "Enviar candidatura" reads as broken
- "Advanced to next stage" email (Event 2) — the "black hole" between stages is the #1 documented candidate frustration
- Interview invite with date/time/location/link + `.ics` (Event 3) — must be `America/Sao_Paulo`-correct including DST
- Neutral decision/rejection email ≤24h (Event 4) — timely close is expected even for a "no"; copy must never leak criterion/score
- Idempotent send (no duplicates) + a send-audit log (`notificacoes_enviadas`)
- Authenticated sending domain (SPF/DKIM/DMARC) — without it the whole feature silently spam-folders
- Panel timeline / expected-turnaround per stage — 83% of candidates say a clear per-stage timeline materially improves the experience

**Should have (competitive):**
- Panel and email deriving from the same allowlisted own-row read, so "email não chegou" is a non-event (the panel is canonical, email is a mirror)
- Deep-link CTAs into the correct panel screen (not bare logins)
- Bounce-aware panel nudge on a recorded hard bounce (v1.x, needs the webhook first)

**Defer (v2+/anti-features):**
- Free-text RH note on rejection emails (PRD RNF-SLA-06) — directly contradicts D-15; recommend dropping from v1, flagged as an open question below
- Computed-from-history turnaround estimate — needs volume M6 hasn't accumulated yet; a static SLA table is the honest v1
- Recurring "nudge every N days" reminders (PRD RNF-SLA-03), SMS/WhatsApp, notification-preferences center, marketing/nurture emails, digest emails, two-way reply-parsing, delivery/read receipts shown to candidates — all explicitly out of scope for v1

### Architecture Approach

The integration is layered exactly like the shipped SEC-03/analise pattern: Postgres triggers on three source tables carry ids-only payloads (no PII) via `net.http_post` to a new self-authenticating Deno EF (`notificar-candidato`), which does the allowlist PII read, claims idempotency, renders the template, calls Resend, and logs the outcome — all in TypeScript, none of it in PL/pgSQL. The candidate timeline is architecturally independent (reads a static config table, no runtime coupling to the email push) and can ship in parallel.

**Major components:**
1. **Three triggers** (`trg_notif_candidatura_recebida` on `candidaturas` INSERT; `trg_notif_transicao` on `historico_candidatura` INSERT with a CASE on `etapa_para` covering events 2 & 4; `trg_notif_convite_entrevista` on `agendamentos_entrevista` INSERT) — SECURITY DEFINER, `search_path=''`, Vault-read, graceful-skip, ids-only bodies, cloned from the 10-02 SEC-03 skeleton
2. **EF `notificar-candidato`** — self-auth Bearer (mirrors `analise-candidato-individual`), idempotent claim (`ON CONFLICT DO NOTHING RETURNING`), allowlist reads, template render, `.ics` build for Event 3, Resend `fetch`, status write-back
3. **`notificacoes_enviadas`** — audit log + `UNIQUE(dedupe_key)` idempotency guard + retry queue (partial index on `pendente`/`falhou`), RH vaga-scoped SELECT only (join-through mirroring `rh_gerencia_agendamento`), no candidate policy
4. **`_shared/ics.ts`** — verbatim Deno port of `agendamentoCandidatoService.gerarIcsAgendamento` (pure function, no shared-runtime import possible across `src/`↔`supabase/functions/`)
5. **`config_sla_etapa`** — static non-PII per-stage turnaround table, surfaced in the candidate dashboard's waiting-state cards; independent of the push pipeline
6. **pg_cron retry sweep** — reuses the already-live pg_cron infrastructure to re-fire failed/pending sends under a `tentativas` cap; complements (not replaces) Resend webhook reconciliation

### Critical Pitfalls

1. **Double-send** — three dormant SEC-03 n8n triggers + a `submit-candidatura` env-var fire will collide with the new triggers unless retired in the *same* phase. Prevention: one canonical dispatch source per event, a durable `UNIQUE(dedupe_key)` gate (keyed to include `etapa_destino`/`agendamento_id` so a legitimate M6 retrocede-then-readvance or reschedule still re-notifies rather than being wrongly suppressed), Resend's `Idempotency-Key` as a secondary 24h belt.
2. **`net.http_post` fire-and-forget** — the funnel advances even if the email silently drops (at-most-once, no auto-retry, `net._http_response` is UNLOGGED with only a ~6h TTL, default 2000ms timeout can false-time-out a slow EF). Prevention: a `pendente→enviado→entregue/falhou/bounce` state machine in `notificacoes_enviadas`, reconciled by Resend webhooks (durable, push) plus a `pg_cron` poll as a safety net, explicit higher `timeout_milliseconds`, and a fast EF (send-then-return).
3. **PII/criterion leak in the rejection email** — breaks D-15/RNF-12a/RNF-07a if templates interpolate `motivo_rejeicao`/score/trait, use `select('*')`, or expose `observacoes_rh`. Prevention: a fixed neutral rejection template with a grep guard against scoring tokens, explicit column allowlists everywhere, candidate-DENY RLS on `notificacoes_enviadas`, dispatch gated strictly on a human-recorded decision (never a score threshold).
4. **Trigger→EF auth gap** — default `verify_jwt` blocks the DB-originated call (401, silently dropped per Pitfall 2); `--no-verify-jwt` with no replacement check makes the EF a spoofable public send endpoint. Prevention: mirror the `analise` EF exactly — `--no-verify-jwt` + self-authenticated Vault Bearer shared secret.
5. **Deliverability gaps** — unverified domain, missing DMARC (Resend does NOT auto-publish it; Gmail/Yahoo have required it since 2024), or leftover `onboarding@resend.dev` in prod silently spam-folders every email. Prevention: Fernando verifies a real Beauty Smile subdomain (auto SPF+DKIM), manually publishes DMARC, sets a real From/Reply-To, before any live-candidate send — a hard human/DNS prerequisite, largely gating rather than blocking parallel engineering work.

## Implications for Roadmap

Based on combined research, M7 (continuing from Phase 36) decomposes into six dependency-ordered slices. The pipeline-plumbing phases (data layer → EF → triggers) must run in sequence because each writes to or reads from the prior; the timeline phase is architecturally independent and can run in parallel; reconciliation/testing closes the loop last.

### Phase 36: Deliverability & Sender Identity
**Rationale:** A hard prerequisite gate for every real send in every later phase, but almost entirely a human/DNS action (Fernando) rather than code — so it can start immediately and run in parallel with the data-layer/EF phases below, as long as it lands before the first live-candidate send.
**Delivers:** Verified Beauty Smile sending subdomain in Resend (auto SPF+DKIM), manually-published DMARC record, `RESEND_API_KEY` provisioned in Vault + EF secrets, real From/Reply-To addresses decided.
**Addresses:** The "authenticated sending domain" table-stakes feature; unblocks every subsequent event.
**Avoids:** Pitfall 5 (deliverability gaps silently spam-foldering the whole feature).

### Phase 37: Notification Data Layer
**Rationale:** Every later phase either writes to or reads from these tables; migrations must land first and be applied via the established MCP `apply_migration` + ledger-reconcile workaround (this repo's known `42601`/DBMIG-01 pattern), self-contained and not entangled with the open DBMIG-01 baseline-fill debt.
**Delivers:** `evento_notificacao`/`status_notificacao` enums, `notificacoes_enviadas` (UNIQUE `dedupe_key`, retry partial index, RH vaga-scoped RLS, candidate-DENY), `config_sla_etapa` + seed data.
**Uses:** Supabase MCP `apply_migration` (bypasses the transaction-pooler `42601` failure); the M6 `rh_gerencia_agendamento` join-through RLS pattern as the template.
**Implements:** The `notificacoes_enviadas` triple-duty table from Architecture (audit + idempotency + retry queue).

### Phase 38: EF `notificar-candidato`
**Rationale:** Can be built and smoke-tested (via manual `net.http_post`) before any trigger exists — deployable dormant, exactly like SEC-03 was — reducing the blast radius of Phase 39's trigger rewire.
**Delivers:** The EF itself — self-auth Bearer, idempotent claim, allowlist PII reads, `_shared/ics.ts` (verbatim port of `agendamentoCandidatoService.gerarIcsAgendamento`), 4 hand-rolled HTML templates with D-15-neutral rejection copy, Resend `fetch` call, status write-back.
**Uses:** `resend` plain `fetch` (zero deps); static `npm:` import discipline if the SDK is ever touched; the `cost-alerter`/`analise-candidato-individual` EFs as structural clones.
**Implements:** Architecture Pattern 2 (DB-trigger → EF self-auth) and Pattern 4 (pure `.ics` port).

### Phase 39: Trigger Dispatch & SEC-03 Retirement
**Rationale:** This is where "aposenta o n8n / resolve SEC-03 por substituição" lands — the DROP of the old triggers and the CREATE of the new ones must happen in the **same** phase to avoid the double-send collision that is this milestone's #1 structural risk.
**Delivers:** `trg_notif_candidatura_recebida`, `trg_notif_transicao` (CASE on `etapa_para`, covering events 2 & 4), `trg_notif_convite_entrevista`; DROP of the three SEC-03 n8n triggers + retirement of the `submit-candidatura` env-var fire.
**Implements:** Architecture Pattern 1 (canonical-transition-log trigger + two satellites) — the deliberate source-of-truth mix.
**Avoids:** Pitfall 1 (double-send) and Pitfall 7 (migration/ledger drift — diff the live function body before any `CREATE OR REPLACE`, no `BEGIN;...COMMIT;` wrapper).

### Phase 40: Candidate Timeline
**Rationale:** No runtime dependency on the email pipeline — reads only `config_sla_etapa` (seeded in Phase 37) — so it is genuinely parallelizable with Phases 38-39 and delivers value even before a single email sends.
**Delivers:** Waiting-state cards on `DashboardCandidatoPage` showing static per-stage SLA estimates ("triagem — resposta em até X dias úteis"), explicitly framed as an estimate, never a hard countdown.
**Addresses:** The "pull" half of the milestone's core value proposition (candidates want a clear per-stage timeline).
**Avoids:** Pitfall 9 (timeline over-promising a hard date, or contradicting the email push — both should read the same `historico_candidatura`-derived stage).

### Phase 41: Reconciliation, Retry & Testing
**Rationale:** Closes the loop on Pitfall 2 (silent drops) — must come after the EF and triggers exist so there is something to reconcile against; also where the CI/test-mode discipline gets locked down before any live-candidate send.
**Delivers:** Resend webhook EF (Svix-verified) updating `notificacoes_enviadas` by `provider_message_id`; `pg_cron` sweep of `pendente`/`falhou` rows as a safety net; CI unit tests with a mocked Resend sender (no live key); non-prod recipient allowlist guard; live UAT using Resend's `delivered@`/`bounced@`/`complained@resend.dev` test addresses.
**Avoids:** Pitfall 2 (fire-and-forget silent drop), Pitfall 6 (bounce/complaint reputation decay), Pitfall 10 (tests spamming real candidates or CI requiring a live key).

### Phase Ordering Rationale

- **37 → 38 → 39 is a strict dependency chain**: the EF needs the table to write to (37 before 38); the triggers need a live EF target to point at (38 before 39). Reversing any pair either leaves the EF with nowhere to log, or leaves triggers firing at a 404.
- **36 and 40 are laterally parallelizable**: 36 is DNS/human work with no code dependency on 37-39 (it only needs to land before the first live send); 40 depends only on the Phase-37 config table and has zero coupling to the email push.
- **39 is the single highest-risk phase** because it is where the double-send collision surface (four dormant/live triggers) gets resolved — research unanimously recommends DROP-and-CREATE in one phase rather than a "keep both temporarily" step.
- **41 comes last** because reconciliation and CI-mock discipline are meaningless without a working send path to reconcile/test against, but must land before any volume of real candidate traffic hits the pipeline.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 39 (Trigger Dispatch & SEC-03 Retirement):** the exact live SEC-03 trigger/function bodies must be diffed before DROP/CREATE (DBMIG-02 discipline); also needs the Open Question #2 resolution (does the approve path actually write `etapa_atual='aprovado'`?) before the CASE predicate can be finalized.
- **Phase 38 (EF `notificar-candidato`):** template copy for Event 4 (rejection) needs a frozen, reviewed neutral string before it can be considered done — not a technical unknown, but a content/legal-adjacent gate worth a discuss-phase pass.
- **Phase 41 (Reconciliation):** exact Resend rate-limit/free-tier numbers should be verified live (pricing drifts) before any burst-campaign volume assumption is baked into the retry-sweep cadence.

Phases with standard patterns (skip research-phase):
- **Phase 36 (Deliverability):** a documented DNS/Resend-dashboard checklist, no engineering ambiguity.
- **Phase 37 (Data Layer):** schema is fully specified in ARCHITECTURE.md with a proven RLS template (`rh_gerencia_agendamento`) to mirror.
- **Phase 40 (Timeline):** a static config table + existing dashboard component — no new pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Provider API, versions, and Deno-import discipline verified against Resend's official docs and direct repo precedent (`analise-candidato-individual`, `cost-alerter`). Two sub-items MEDIUM: react-email edge-runtime failure reports (community/GitHub, multiple corroborating threads, not first-party) and exact Resend pricing/rate-limit numbers (drifts over time). |
| Features | HIGH | Event set, email content best-practices, and idempotency/audit design corroborated by Resend official docs, multiple industry ATS sources, and PRD §5.1.1. MEDIUM on two judgment calls: static-vs-computed timeline recommendation (engineering judgment, though well-reasoned) and LGPD transactional-no-opt-out defensibility (legal-adjacent, explicitly not counsel). |
| Architecture | HIGH | Every integration point verified directly against shipped in-repo code (`avancar_etapa()` trigger binding, `historico_candidatura` schema, `agendamentos_entrevista` RLS, SEC-03 migration); only the Resend attachments API detail is externally sourced (verified against official docs). |
| Pitfalls | HIGH | Resend and `pg_net` behavioral facts verified via official docs (Context7 + Supabase docs); repo-specific scars (double-send surfaces, migration-ledger drift, `_shared` bundle freeze, dynamic-import bug) drawn directly from `PROJECT.md`/`CLAUDE.md`/prior-milestone memory. |

**Overall confidence:** HIGH

### Gaps to Address

The following are deliberately left open for the discuss-phase rather than resolved here — all four research files converge on flagging them:

- **RNF-SLA-06 (rejection free-text note) vs D-15:** PRD asks for an optional RH free-text note on the rejection email; this directly contradicts the neutral-rejection invariant. Recommendation carried forward: drop the free-text note from v1 entirely; revisit only behind a structured/pre-approved-phrases guardrail in v1.x.
- **Approve-path transition verification:** Event 4 keys on a terminal `historico_candidatura` transition. The reject RPC provably sets `etapa_atual='rejeitado'`; the approve/consolidation path needs a one-query check to confirm it also writes `etapa_atual='aprovado'` — if it only writes `decisao_final` without moving etapa, a satellite trigger on `decisao_final` is needed for approvals.
- **`notificacoes_enviadas` retention window:** LGPD data-minimization requires a defined purge/retention policy; not yet decided.
- **Reconciliation scope:** whether to ship webhook-only, `pg_cron`-poll-only, or both (research recommends both — webhook as durable primary, poll as a 6h-window safety net) needs an explicit scope decision for Phase 41.
- **Confirmation-for-knockouts survivor guard:** Event 1 fires on `candidaturas` INSERT; a synchronous knockout auto-reject in the same transaction means a candidate could receive "recebemos sua candidatura" and a neutral rejection near-simultaneously. Needs a one-line survivor-guard decision (mirror `trg_candidatura_analise`'s existing guard) or an explicit accept-both call.
- **Exact Resend rate-limit/free-tier numbers:** cited figures (10 req/s per team; free tier 3,000/mo, 100/day) are MEDIUM confidence and pricing-drift-prone — verify against the live Resend dashboard before any launch/campaign-volume commitment.

## Sources

### Primary (HIGH confidence)
- `/websites/resend` (Context7) — send API, idempotency key semantics, test addresses, domain/DKIM/SPF/DMARC setup, webhook signature verification, attachments API
- Supabase `pg_net` official docs + GitHub — `net.http_post` signature, at-most-once semantics, default timeout, `net._http_response` UNLOGGED ~6h retention
- Repo source directly read: `supabase/migrations/20260706110005_sec03_n8n_serverside.sql`, `20260610000002_analise_trigger.sql`, `20260607000005_avancar_etapa_trigger.sql`, `20260607000001_historico_candidatura.sql`, `20260716000001_agendamentos_entrevista.sql`, `20260714100001_rejeitar_candidatura_rpc.sql`; `supabase/functions/analise-candidato-individual/index.ts`, `cost-alerter/index.ts`, `get-curriculo-url/index.ts`; `src/features/agendamento/services/agendamentoCandidatoService.ts`
- `.planning/PROJECT.md`, `CLAUDE.md`, PRD-MASTER §5.1.1/§5.2/Q-02 — project-source-of-truth decisions and locked scope

### Secondary (MEDIUM confidence)
- Supabase discussion #40286, resend/react-email GitHub issues #1054/#1105/#1630 — react-email edge-runtime incompatibilities (community-corroborated, not first-party)
- Resend pricing pages (resend.com/pricing, resend.com/blog/new-free-tier) — free-tier/rate-limit figures, drift-prone
- Candidate rejection-email best practices (factohr.com, testgorilla.com, barraiser.com, metaview.ai, treegarden.io, societyinsurance.com) — strong multi-source agreement on neutral/no-feedback rejection copy
- LGPD transactional-vs-marketing classification (ecommercebrasil.com.br, validity.com, migalhas.com.br, gov.br/anpd) — legal-adjacent, not counsel

### Tertiary (LOW confidence)
- None flagged as LOW in any of the four research files; all findings cleared at least MEDIUM.

---
*Research completed: 2026-07-17*
*Ready for roadmap: yes*
