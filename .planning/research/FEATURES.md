# Feature Research — M7 "Comunicação com o Candidato" (COMM)

**Domain:** ATS transactional notification pipeline (candidate-facing email) + waiting-timeline / SLA-estimate layer, over a shipped 6-stage funnel + `historico_candidatura`/`agendamentos_entrevista`/`decisao_final`
**Researched:** 2026-07-17
**Confidence:** HIGH (event set, email content best-practices, idempotency/audit, bounce handling — Resend official docs + multiple corroborating industry sources + PRD §5.1.1) · MEDIUM (static-vs-computed timeline recommendation = engineering judgment; LGPD transactional-no-opt-out defensibility = legal judgment, not counsel)

> Replaces the M6 "Operação do Funil RH" feature research (2026-07-14, now archived to `milestones/v6.0-*`). Scope now = the **COMM** group of `.planning/M5-DRAFT.md`: the notification pipeline + candidate timeline only. Do **not** re-research the funnel, scheduling mechanics, CV/AI visibility, or KPIs — those shipped in M6.

---

## Framing: the *delta* of M7

M6 made the funnel **move** by the recruiter's hand; the candidate only learned of movement by logging in ("painel é o canal único"). This was a deliberate M6 stance, but it is exactly the PRD's **original pain**: *"Candidatos somem entre etapas por falta de notificação"* (PRD line 39). M7 adds the **push** (transactional email on funnel transitions) and sharpens the **pull** (a per-stage expected-turnaround estimate in the panel), so the panel stops being the *only* channel and becomes the *canonical* one that email mirrors.

Two invariants shape every feature below and are non-negotiable:
- **D-15 / RNF-12a:** decision/rejection email is *neutral* — criterion, score, band, or trait is **never** exposed; language is "avaliação comportamental/cognitiva", never "teste psicológico".
- **RNF-07a:** the system never auto-decides. Every decision email fires *after* a human recruiter action (a row already in `decisao_final`/`historico_candidatura`) — so the notification layer inherits the guarantee; it never *creates* a decision, only reports one.

A third, quieter invariant: **the panel is the source of truth.** Every email duplicates information the candidate can already see in the panel. Email is an *enhancement*, never the sole carrier of state. This is what makes bounce/deliverability failure survivable (see Deliverability).

---

## The 4 locked events — trivial vs product-nuance

The milestone locks **exactly four** events. They are *not* equal effort. Downstream (roadmap) should treat them as a difficulty gradient, front-loading the trivial ones to prove the pipeline end-to-end before the nuanced ones.

| # | Event | Fires on | Reads (allowlist) | Tech complexity | Product nuance | Verdict |
|---|-------|----------|-------------------|-----------------|----------------|---------|
| 1 | **Confirmação de candidatura recebida** | `candidaturas` insert (or `submit_candidatura`) | nome, título da vaga | LOW | LOW | **Trivial — build first.** "Easiest automation, fastest impact" (industry consensus). Proves EF + Resend + `notificacoes_enviadas` end-to-end with zero copy risk. |
| 2 | **Avanço p/ avaliação assíncrona** ("próxima etapa liberada") | `historico_candidatura` transition into the async-assessment stage | nome, vaga, deep-link ao painel `/candidato/testes`, prazo (SLA-02: 7 dias) | LOW–MEDIUM | LOW | **Near-trivial.** One nuance: which exact `etapa_atual` value is the trigger, and that the CTA deep-links to the panel (not a bare login). |
| 3 | **Convite de entrevista** (com `.ics`/link do agendamento M6) | `agendamentos_entrevista` insert (M6 table) | data/hora (`America/Sao_Paulo`), local **ou** link, `.ics` anexo — **NUNCA** `observacoes_rh` | MEDIUM | MEDIUM | **Highest-nuance of the four.** Depends hard on M6. The `.ics` must be generated *server-side in the EF* (M6's RFC-5545 generator is client-side — port/share it). Timezone must be correct incl. DST; calendar title must be neutral ("Entrevista — [Cargo]"), never salary/score/internal codes. |
| 4 | **Decisão / rejeição ≤24h** (neutra, LGPD-safe) | `decisao_final` write / transition to `rejeitado` or `aprovado` | nome, vaga; **nada de score/critério** | MEDIUM | **HIGH (copy)** | **Tech is easy; the copy is the risk.** Two sub-cases (aprovado = positive + next steps; rejeitado = neutral, no feedback). Honors D-15/RNF-07a by construction. See the RNF-SLA-06 "observação opcional do RH" trap below. |

**The RNF-SLA-06 trap (flag for discuss-phase).** PRD RNF-SLA-06 says the rejection email carries "Template padrão **+ observação opcional do RH**". A free-text recruiter note directly contradicts D-15 (criterion never exposed) — it is the single most likely place to leak a reason, a trait, or something a candidate could frame as discriminatory. **Recommendation:** v1 = template-only neutral copy, **no** free-text RH note. Defer the optional note to v1.x *only* behind an explicit guardrail (structured/pre-approved phrases, never raw text). This is the one place where the locked scope and an existing PRD requirement disagree — surface it explicitly.

---

## Feature Landscape

### Table Stakes (candidates assume these exist)

Missing these = the product feels broken or untrustworthy. Users give no credit for having them but penalize their absence.

| Feature | Why Expected | Complexity | Notes / Dependencies |
|---------|--------------|------------|----------------------|
| **Application-received confirmation email** | Silence after "Enviar candidatura" reads as "did it even work?"; universal ATS baseline | LOW | Event 1. Depends only on `candidaturas`. No funnel dependency. |
| **"Advanced to next stage" email** | Candidates want to know they moved; the "black hole" between stages is the #1 documented frustration | LOW–MEDIUM | Event 2. Depends on `historico_candidatura` (M6). |
| **Interview invite with date/time/location/link** | An interview with no confirmable details is unusable; must state date+time **with timezone** (`America/Sao_Paulo`), format, location or link, and a contact for rescheduling | MEDIUM | Event 3. Depends on M6 `agendamentos_entrevista` + own-row allowlist (M6 already excludes `observacoes_rh`). |
| **Decision/rejection email (neutral)** | Not hearing back after investing in assessments + interview is the top employer-brand killer; a *timely, respectful* close is expected even when the answer is no | MEDIUM | Event 4. Depends on `decisao_final`. Copy must be job-agnostic/neutral. |
| **`.ics` calendar attachment on the invite** | Standard for any interview invite; lets the candidate one-tap add to calendar and reduces no-shows | MEDIUM | Reuse M6's hand-rolled RFC-5545 generator, ported to the Deno EF; attach as base64 (`filename: 'entrevista.ics'`). Resend supports base64 attachments natively. |
| **Idempotent send (no duplicates)** | A candidate receiving the same "you were rejected" email 3× because a trigger re-fired is a trust-destroying bug | LOW–MEDIUM | Resend supports an `Idempotency-Key` header (`<event-type>/<entity-id>` pattern). Pair with a UNIQUE key column in `notificacoes_enviadas`. See idempotency section. |
| **Send-audit log (`notificacoes_enviadas`)** | LGPD accountability (prove what was sent to whom, when) + operational debugging of "não chegou" | LOW–MEDIUM | New table. Doubles as a lightweight queue/dead-letter and the join target for bounce webhooks. |
| **Authenticated sending domain (SPF/DKIM/DMARC)** | Without it, transactional mail lands in spam and the whole feature silently fails | LOW (config) | Resend domain verification; From = real Beauty Smile subdomain, Reply-To = a monitored RH inbox. Human/DNS action, not code. |
| **Consistent, branded, plain-ish template** | Candidates trust email that looks like it came from the company; heavy-image HTML hurts deliverability | LOW | One Beauty Smile shell, mobile-first, minimal images, purpose + company-identity footer (LGPD info footer, **no** unsubscribe — transactional). |
| **Panel timeline / expected-turnaround per stage** | 83% of candidates say a clear per-stage timeline would materially improve the experience; uncertainty is the core anxiety driver | LOW–MEDIUM | The *pull* half. Static per-stage SLA copy in each waiting state of the dashboard. See timeline section. |

### Differentiators (competitive edge, aligned to Core Value)

Not required to ship, but they are where COMM earns its keep against the "candidatos somem" pain.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Panel + email say the same thing** | Because email mirrors the canonical panel state, "email não chegou" is a non-event — the candidate opens the panel and sees identical, current status. Most ATSs treat email as an independent (and drift-prone) channel | LOW (it's a design discipline, not code) | Make the email body derive from the *same* allowlisted own-row read the panel uses. Prevents email/panel drift. |
| **Deep-link CTAs, not bare logins** | "Ver minha candidatura" / "Fazer avaliação" that lands *on the right panel screen* removes friction and reduces drop-off between stages | LOW | Normal app routes; the candidate is already an auth'd user. |
| **`America/Sao_Paulo`-correct, DST-aware invite** | A correctly-localized `.ics` + human-readable time (both in the email) is a small thing candidates *notice when wrong* | MEDIUM | Single-tenant BR → one timezone, but still validate the `.ics` VTIMEZONE/UTC offset; M6 already solved this client-side. |
| **Honest, conservative SLA phrasing** | "Retorno em até X dias úteis" framed as an *estimate, not a promise* builds trust; over-promised SLAs that slip do more damage than none | LOW | Copy discipline + a static config table. See timeline recommendation. |
| **Bounce-aware panel nudge** (v1.x) | If a hard bounce is recorded, show a gentle "confirme seu e-mail" affordance in the panel — closes the loop without blocking the funnel | MEDIUM | Requires Resend webhook (`email.bounced`) → update `notificacoes_enviadas`. Defer to v1.x. |

### Anti-Features (commonly requested / tempting, avoid in v1)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Marketing / nurture / "vagas que talvez te interessem" emails** | "We already have their email" | Not transactional → needs LGPD marketing consent + opt-out infra; contradicts the transactional-no-opt-out stance; scope creep | Out of scope. Belongs to a future TALENT/marketing milestone with its own consent basis. |
| **Digest / weekly-summary emails** | "Batch updates to reduce volume" | With only ~4 lifecycle events, there's nothing to digest; adds scheduling/cron + frequency-cap complexity for no candidate value | One event-driven email per transition. Volume is naturally low. |
| **Recurring "nudge every 2 days" reminders** (PRD RNF-SLA-03) | PRD literally asks for it while a candidate waits between async stages | Time-based cron + frequency capping + "am I being spammed?" risk; easy to annoy, hard to tune | v1 = event-driven only (one email per state change). Defer recurring reminders to a later milestone; the panel timeline covers "how long" in the meantime. |
| **Candidate notification-preferences center (granular opt-in/out toggles)** | "Let users choose what they receive" | Implies opt-out semantics that contradict the transactional stance; large new surface (UI + storage + enforcement) for 4 mandatory service emails | None needed in v1. Transactional = mandatory. A footer explains *why* they're receiving it. |
| **SMS / WhatsApp channel** | Faster, higher open rates | Explicitly deferred (M8+); WhatsApp is manual per PRD; adds a provider, opt-in law nuances, and templating gates | Out of scope by decision. Email only. |
| **Two-way / reply-parsing email** ("responda este e-mail para reagendar") | Feels natural | Inbound parsing + routing + auth is a whole subsystem; reschedule already lives in the M6 panel | Reply-To a monitored RH inbox (human-handled); "reagende pelo painel" CTA. |
| **Delivery/read receipts shown to the candidate** ("entregue"/"lido") | "Transparency" | No candidate value, mild privacy weirdness; read-tracking pixels hurt deliverability + trust | Keep delivery status internal (`notificacoes_enviadas` + webhooks) for RH/ops only. |
| **Computed-from-history SLA estimate in v1** | "Show a data-driven, personalized ETA" | Small N per stage → noisy; a computed ETA that slips is *worse* than a conservative static one; couples the panel to analytics quality | Static per-stage config in v1 (honest, conservative). Computed = v2 when volume justifies. |
| **Rich multi-image HTML brand emails** | "Make it beautiful" | Image-heavy transactional mail lands in Promotions/spam; slower; a11y risk | Simple, mostly-text branded shell; one logo; strong text fallback. |

---

## Email content best-practices per event type

Corroborated across ATS/recruiting sources and constrained by D-15/RNF-12a/LGPD.

**Global (all four):** personalization fields = candidate first name, job title, company name; warm, specific, action-oriented tone ("como um recrutador escreveria num bom dia"); one clear CTA linking back to the panel; From = branded Beauty Smile domain; Reply-To = monitored RH inbox; footer = who is sending + why (transactional purpose) + company legal identity. **No** unsubscribe link (transactional), **no** score/band/trait/criterion anywhere.

- **1 · Candidatura recebida:** confirm receipt, name the vaga, set the *very next* expectation ("nossa equipe fará a triagem — retorno em até X dias úteis"), CTA "Acompanhar minha candidatura". Zero risk; keep it short.
- **2 · Avanço p/ avaliação assíncrona:** state that the next stage is *unlocked*, what it is (in RNF-12a language — "avaliação comportamental/cognitiva", never "teste"), the deadline (SLA-02: 7 dias corridos), and a deep-link CTA "Fazer avaliação". Reassure it can be done at their own pace within the window.
- **3 · Convite de entrevista:** the 7 must-haves — cargo, **data + hora com fuso `America/Sao_Paulo`**, formato (online/presencial), local **ou** link, com quem (nome/cargo do entrevistador, if allowlisted), instruções de preparo, e um contato para reagendar. Attach `.ics`. Calendar title neutral ("Entrevista — [Cargo]"). Account for DST when building the `.ics`. Never surface `observacoes_rh`.
- **4 · Decisão/rejeição:** two sub-cases.
  - *Aprovado:* congratulatory, clear next step (the RH will contact / next-phase link), warm.
  - *Rejeitado:* neutral, respectful, timely (≤24h). Thank them, state the decision plainly, **give no reason and no feedback** (documented legal best practice: specific feedback in a rejection email creates inconsistency + discrimination-claim risk). Never reference any protected characteristic or "culture fit". Optionally invite future applications (talent-pool language) — but keep it generic. This copy should be reviewed once and frozen.

---

## Candidate-facing timeline / expected-turnaround — v1 recommendation

**Recommendation: static per-stage SLA config, phrased as an estimate. This is the honest v1.** Computed-from-history is a v2 differentiator.

Rationale:
- The PRD already *defines* the SLAs (§5.1.1): triagem ≤48h úteis, avaliação 7 dias, gap entre etapas ≤5 dias úteis, entrevista ≤7 dias úteis, decisão ≤3 dias úteis, feedback rejeição ≤24h. These are contractual intents, not observed data — so a static table is the *source-aligned* representation.
- Computed estimates need volume to be stable. With low per-stage N (single-tenant, spun-up funnel), a computed ETA is noisy and, worse, a *personalized* ETA that then slips reads as a broken promise — more anxiety-inducing than a conservative static "até X dias úteis".
- Static config is trivially auditable and tunable by the team without touching analytics.

Design:
- A small config source of truth for per-stage turnaround (a `etapa_sla`-style config table or typed constant), rendered in each *waiting* state of the dashboard: "Triagem — resposta em até 2 dias úteis", "Avaliação liberada — você tem 7 dias", etc.
- Frame every estimate as *estimativa, não garantia*. Never show a hard countdown that can hit zero and stay there.
- Complexity: LOW–MEDIUM. No new server dependency; reuses the candidate's own-row status the panel already reads.

Defer to v2: a computed "candidaturas nesta etapa costumam levar ~X dias" derived from `historico_candidatura` timestamps — genuinely valuable once there's enough throughput, and the data is *already being recorded* (M6). Gate it behind a volume threshold and always floor it with the static SLA so it can't under-promise absurdly.

---

## Idempotency + audit — `notificacoes_enviadas`

**Why it exists (four jobs in one table):** (1) LGPD accountability — provable record of what was sent to whom and when; (2) idempotency — never double-send on trigger re-fire or EF retry; (3) deliverability debugging — correlate provider bounce/complaint webhooks back to a send; (4) lightweight queue/dead-letter — a failed row is retryable/inspectable.

**Recommended columns:**

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `candidatura_id` (FK) / `candidato_id` | Who / which application |
| `tipo_evento` (enum) | `candidatura_recebida` · `avanco_avaliacao` · `convite_entrevista` · `decisao_final` |
| `destinatario_email` | **Snapshot at send time** (email may change later; audit needs the actual recipient) |
| `template` / `template_versao` | Which template + version rendered (audit + copy-change traceability) |
| `idempotency_key` **(UNIQUE)** | The dedup guarantee. Pattern: `<tipo_evento>/<candidatura_id>/<discriminador>` |
| `provider` | `resend` (future-proofs a provider swap) |
| `provider_message_id` | Resend's returned `id` — the join key for bounce/delivery webhooks |
| `status` (enum) | `enfileirado` · `enviado` · `entregue` · `falha` · `bounce` · `reclamacao` |
| `erro` (nullable) | Provider/EF error for the dead-letter/debug case |
| `referencia` (nullable) | Source row: `historico_candidatura.id` / `agendamentos_entrevista.id` / `decisao_final.id` — traceability |
| `criado_em` / `enviado_em` / `atualizado_em` | Timeline; `enviado_em` vs `criado_em` reveals lag |

**Idempotency key — the M6 retrocede subtlety (flag for discuss-phase).** M6 lets RH *retroceder* and re-advance. So an "avanço" transition into the same stage can legitimately recur. A naive key of `avanco_avaliacao/<candidatura>` would silently *suppress* the second (legitimate) notification after a back-and-forth; a key that includes a raw transition id would *double-send* on an idempotent retry. Recommendation: key on `tipo_evento + candidatura_id + etapa_destino` (suppresses true duplicates) **and** decide explicitly whether re-entry after a retrocede should re-notify (likely yes for entrevista/decisão, arguably no for a rapid correction). Resolve this in discuss-phase; it is the one genuinely non-obvious idempotency decision. Use Resend's `Idempotency-Key` header as belt-and-suspenders on top of the DB UNIQUE constraint.

---

## Deliverability-adjacent product concerns

- **Domain authentication is table stakes, not optional.** SPF/DKIM/DMARC on the Beauty Smile sending subdomain or the four emails land in spam and the feature silently fails. Resend domain verification handles this; it's a DNS/human action.
- **Bounce handling (from the candidate's POV).** A hard bounce means the candidate's address is invalid → they will not receive *any* email. Because **the panel is the canonical source of truth**, this is survivable: the candidate still sees every state change by logging in. v1: record the bounce in `notificacoes_enviadas` (via Resend `email.bounced` webhook, Svix-verified) and surface it to RH/ops. v1.x differentiator: a gentle in-panel "confirme seu e-mail" nudge. **Never block or fail the funnel on a bounce** — the funnel is RH-driven and email is an enhancement.
- **"Email não chegou" fallback.** Answer by design, not by feature: the panel already shows identical, current status (M6's "canal único" becomes "canal canônico"). Every email is a mirror of a panel screen the candidate can open any time. This is the single most important deliverability *product* decision — it de-risks the entire channel.
- **Spam-folder hygiene.** Plain, low-image, single-purpose transactional bodies; consistent From; company identity + purpose footer; no tracking pixels; no unsubscribe (transactional). Complaint webhook (`email.complained`) logged for monitoring.
- **LGPD basis (not legal advice).** These are transactional emails — part of the recruitment service the candidate *requested* by applying — so they sit on execution/legitimate-interest, not marketing consent, and correctly carry **no opt-out**. Brazil has no email-specific statute; ANPD is actively enforcing. Keep the footer informative (who/why), keep the emails strictly service-related, and never let one drift into marketing. Confirm the exact basis + `notificacoes_enviadas` retention window in discuss-phase.

---

## Feature Dependencies

```
[SPF/DKIM/DMARC domain auth] ──required──> [EF notificar-candidato]
                                                  │
[notificacoes_enviadas table] ──required──> [EF notificar-candidato]
[Resend secret in Vault]      ──required──> [EF notificar-candidato]
                                                  │
                    ┌──────────────┬──────────────┼──────────────┬───────────────┐
                    ▼              ▼              ▼              ▼               ▼
             [Event 1        [Event 2        [Event 3        [Event 4      (each = one
              candidatura     avanço          convite         decisão       template +
              recebida]       avaliação]      entrevista]     /rejeição]    one trigger)
                    │              │              │              │
              candidaturas   historico_      agendamentos_   decisao_final
              (M1)           candidatura     entrevista      (M2/M6)
                             (M6)            (M6)
                                                  │
                                          [server-side .ics
                                           (port M6 client-side
                                           RFC-5545 generator)]

[Resend bounce/complaint webhook] ──enhances──> [notificacoes_enviadas status]
                                        └──enables──> [v1.x panel "confirme seu e-mail" nudge]

[static per-stage SLA config] ──required──> [panel timeline / turnaround estimate]
     (the PULL half — independent of the email PUSH half; can ship in parallel)
```

### Dependency notes

- **Every event requires the EF + table + domain auth + Vault secret first.** These are the "pipeline plumbing" — one phase, before any event lights up. Event 1 (confirmação) should be the first event wired because it has zero copy risk and proves the whole path.
- **Events 2/3/4 depend on M6 tables** (`historico_candidatura`, `agendamentos_entrevista`, `decisao_final`) that already exist and are already RLS-secured with own-row allowlists — reuse, don't rebuild. The SEC-03 dormant triggers (`net.http_post` + Vault, graceful-skip) are the pre-wired hook: repoint them at the EF or add a fresh trigger on `historico_candidatura`.
- **Event 3 additionally requires a server-side `.ics`.** M6's generator is *client-side*. Porting it into the Deno EF (shared module) is the one net-new build in the event set; treat it as the higher-complexity item.
- **The timeline (pull) is independent of the email (push)** — no shared runtime dependency. It can ship in an earlier/parallel phase and delivers value even before a single email sends.

---

## MVP Definition

### Launch With (v1)

- [ ] **`notificacoes_enviadas` table** (audit + idempotency + webhook join target) — the spine of everything.
- [ ] **EF `notificar-candidato`** (Resend, Vault secret, own-row allowlist read, template render, idempotency key) — no `select('*')`.
- [ ] **Domain auth** (SPF/DKIM/DMARC verified in Resend) — deliverability gate.
- [ ] **Event 1 — candidatura recebida** — first, to prove the path.
- [ ] **Event 2 — avanço p/ avaliação assíncrona.**
- [ ] **Event 3 — convite de entrevista** with server-side `.ics` (ported from M6) + `America/Sao_Paulo`.
- [ ] **Event 4 — decisão/rejeição** with frozen neutral copy (template-only, **no** free-text RH note).
- [ ] **Panel timeline / turnaround estimate** — static per-stage SLA config, "estimativa, não garantia".
- [ ] **SEC-03 resolution by substitution** — repoint/replace the dormant n8n triggers with the EF (retires the personal n8n, closes SEC-03 without a patch).

### Add After Validation (v1.x)

- [ ] **Bounce/complaint webhook handling** (Resend Svix → update `notificacoes_enviadas.status`) — trigger: first "candidate says they never got it" report.
- [ ] **In-panel "confirme seu e-mail" nudge** on recorded hard bounce — trigger: bounce webhook is live.
- [ ] **Structured/guardrailed optional RH note** on rejection (never raw free-text) — trigger: RH demand + a copy/legal review that keeps D-15 intact.

### Future Consideration (v2+)

- [ ] **Computed-from-history turnaround** ("costuma levar ~X dias") — trigger: enough per-stage volume in `historico_candidatura` for a stable estimate; always floored by static SLA.
- [ ] **Recurring waiting-reminders** (PRD RNF-SLA-03 "a cada 2 dias") — trigger: evidence the one-shot event emails + timeline aren't enough; needs frequency capping first.
- [ ] **SMS / WhatsApp channel** — explicitly deferred (M8+); needs opt-in + provider + templating gates.
- [ ] **Notification-preferences center** — only if the product ever adds non-transactional email (it shouldn't in this milestone).

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `notificacoes_enviadas` + EF + domain auth (pipeline plumbing) | HIGH | MEDIUM | P1 |
| Event 1 — candidatura recebida | HIGH | LOW | P1 |
| Event 2 — avanço p/ avaliação | HIGH | LOW | P1 |
| Event 4 — decisão/rejeição (neutral copy) | HIGH | MEDIUM | P1 |
| Panel timeline (static SLA) | HIGH | LOW–MEDIUM | P1 |
| Event 3 — convite entrevista + `.ics` | HIGH | MEDIUM | P1 |
| Idempotency key (retrocede-aware) | HIGH | LOW–MEDIUM | P1 |
| SEC-03 retirement (n8n → EF) | MEDIUM (sec-debt) | LOW | P1 |
| Bounce webhook + panel nudge | MEDIUM | MEDIUM | P2 |
| Guardrailed optional RH rejection note | LOW | MEDIUM | P2 |
| Computed turnaround estimate | MEDIUM | HIGH | P3 |
| Recurring reminders / SMS / WhatsApp / prefs center | LOW (v1) | HIGH | P3 |

**Priority key:** P1 = must have for launch · P2 = should have, add when possible · P3 = future.

## Competitor / Market Reference

| Aspect | Market ATS (Workable/Greenhouse-class) | Our Approach |
|--------|----------------------------------------|--------------|
| Confirmation + stage emails | Standard, template-driven, per-stage | Same 4 events, event-driven from funnel transitions |
| Rejection email | Neutral, no specific feedback (legal best practice) | D-15 enforced by construction; copy frozen, template-only |
| Interview invite | Details + `.ics` + timezone + reschedule contact | Same; `.ics` ported from M6, `America/Sao_Paulo`, neutral cal title |
| Channel strategy | Often email + SMS + in-app | Email + canonical panel; SMS/WhatsApp deferred |
| Preferences | Granular opt-in/out center | None (transactional, no opt-out) — deliberate simplification |
| Timeline visibility | Increasingly a differentiator; candidates demand it (83%) | Static per-stage SLA in v1; computed later |

## Sources

- Resend official docs (via Context7 `/websites/resend`): idempotency key (`<event-type>/<entity-id>` pattern, `Idempotency-Key` header), base64 attachments (`.ics`), Svix-verified webhooks (`email.bounced`/`email.delivered`/`email.complained`), returned message `id`. Confidence HIGH.
- PRD-MASTER §5.1.1 (RNF-SLA-01..06), §5.2 (RNF-10a retention, RNF-12a language), Q-02 (email provider), lines 39/777/788/834 (original pain + intended email→panel deep-link). Confidence HIGH (project source of truth).
- Candidate rejection email best practices — neutral/job-related-only, no protected characteristics, no specific feedback (legal risk): factohr.com, testgorilla.com, barraiser.com, metaview.ai, treegarden.io, societyinsurance.com. Confidence HIGH (strong multi-source agreement).
- ATS transactional email best practices — confirmation-first, personalization, interview-invite must-haves, email-vs-SMS split: nimble.com, r2rrecruiting.com, recruitbpm.com, recruitwithatlas.com (deliverability). Confidence MEDIUM–HIGH.
- Interview invite / `.ics` / timezone / neutral calendar-title / DST: builtin.com, calendly.com, jobscore.com, resources.workable.com. Confidence HIGH.
- Candidate timeline/expectations — 83% want clear per-stage timeline, "black hole"/ghosting is top frustration, over-slow loses 42%: topechelon.com, qualtrics.com, hiresuccess.com, zoominfo pipeline, linkedin. Confidence HIGH.
- LGPD transactional-vs-marketing / legitimate-interest / consent / ANPD enforcement: ecommercebrasil.com.br, validity.com, migalhas.com.br, gov.br/anpd (guia legítimo interesse). Confidence MEDIUM (legal-adjacent; confirm basis + retention with counsel in discuss-phase).

---
*Feature research for: M7 "Comunicação com o Candidato" (COMM) — transactional notification pipeline + candidate waiting-timeline*
*Researched: 2026-07-17*
