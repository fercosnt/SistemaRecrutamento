# Architecture Research — M7 Transactional Email Pipeline (COMM)

**Domain:** Transactional email/notification layer bolted onto an existing Supabase (Postgres + Auth + Storage + Edge Functions/Deno) ATS
**Researched:** 2026-07-17
**Confidence:** HIGH (every integration point verified against shipped in-repo code; only cross-checked external detail is the Resend attachments API, verified against Resend docs)

> Scope note: this is an INTEGRATION study, not a greenfield stack study. The stack is locked (Resend, server-side dispatch, 4 events, transactional LGPD, panel timeline). Everything below answers "how does the new notification layer wire into the existing architecture" and hands the roadmapper explicit new-vs-modified components + a dependency-ordered build sequence.

---

## Executive Answer (the 6 decisions, up front)

1. **Trigger source of truth = a MIX, and that is the correct answer.** Two of the four events are `historico_candidatura` INSERTs (the canonical transition log); two are NOT recorded there and must fire off their own table mutation. `historico_candidatura` is written by `avancar_etapa()` which is a **BEFORE UPDATE OF etapa_atual** trigger — so a candidatura INSERT and an interview-scheduling INSERT produce **no** transition row. Forcing all four through `historico_candidatura` is impossible; forcing them through the per-table SEC-03 status triggers loses the fine-grained etapa mapping. Use the transition log for the two real transitions (event 2, event 4) and satellite triggers for the two non-transition mutations (event 1, event 3).
2. **Dispatch topology = DB trigger → `net.http_post` → EF `notificar-candidato` → Resend.** Reject trigger→direct-Resend-REST. PII resolution (allowlist read of nome/email) and template rendering live in the EF. The trigger body carries **ids only, zero PII** (SEC-03 discipline). The EF authenticates the DB-originated request by **self-authenticating a shared-secret Bearer** (`--no-verify-jwt` deploy + `Bearer == NOTIFICAR_SECRET ?? service_role`), mirroring `analise-candidato-individual` verbatim.
3. **`notificacoes_enviadas` is one table doing triple duty:** audit log + idempotency guard (UNIQUE `dedupe_key`) + retry queue (partial index on `status IN ('pendente','falhou')`). RH-readable (vaga-scoped), candidate-hidden (no candidate SELECT policy). Retry = **pg_cron sweep** (pg_cron already live in this project), tentativas-capped; manual RH re-send is a deferrable enhancement.
4. **`.ics` for the interview invite is regenerated server-side in the EF** — the existing client-side RFC-5545 builder (`agendamentoCandidatoService.gerarIcsAgendamento`) is a **pure function**; port it verbatim into a Deno `_shared/ics.ts` and attach as a base64 Resend attachment (`content_type: 'text/calendar'`).
5. **Timeline estimate = a small static per-stage SLA config table** (`config_sla_etapa`, non-PII, public-read), surfaced in the candidate dashboard waiting-state cards. A DEFINER-RPC computing turnaround from `historico_candidatura` history is a **future** upgrade (needs data volume M6 hasn't accumulated) — note it, don't build it in M7.
6. **Build order:** enums+tables → EF+Resend+ics port+templates (deploy dormant) → triggers rewire (retire n8n, resolve SEC-03) → timeline (parallelizable) → pg_cron retry sweep → (deferred) RH re-send.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│  POSTGRES (source-of-truth mutations)                                      │
│                                                                            │
│  candidaturas ──INSERT──────────────────► trg_notif_candidatura_recebida   │  event 1
│      │  UPDATE OF etapa_atual                                              │
│      ▼                                                                      │
│  avancar_etapa() [BEFORE UPDATE, unbypassable] ──writes one row──►         │
│  historico_candidatura ──INSERT──► trg_notif_transicao (CASE etapa_para)   │  events 2 & 4
│                                                                            │
│  agendamentos_entrevista ──INSERT──► trg_notif_convite_entrevista          │  event 3
│                                                                            │
│  Each trigger: SECURITY DEFINER, search_path='', reads Vault               │
│  (project_url + edge_invoke_key), graceful-skip if NULL,                   │
│  PERFORM net.http_post(body = IDS ONLY, no PII)                            │
└───────────────────────────────┬───────────────────────────────────────────┘
                                 │  pg_net (async, fire-and-forget)
                                 │  Authorization: Bearer <edge_invoke_key>
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  EDGE FUNCTION  notificar-candidato   (Deno, --no-verify-jwt)              │
│   1. self-auth Bearer == NOTIFICAR_SECRET ?? service_role  → 401 else      │
│   2. parse { evento, candidatura_id, [historico_id|agendamento_id] }       │
│   3. IDEMPOTENT CLAIM: INSERT notificacoes_enviadas(status='pendente')     │
│         ON CONFLICT (dedupe_key) DO NOTHING RETURNING id  → 0 rows = skip   │
│   4. allowlist read: candidatos(nome_completo,email) + vaga/agendamento    │
│         (NEVER select('*'); never observacoes_rh)                          │
│   5. render Beauty Smile template (4 variants; D-15 neutral for rejection) │
│   6. [event 3] build .ics via _shared/ics.ts → base64 attachment          │
│   7. POST api.resend.com/emails  (reuse cost-alerter fetch pattern)        │
│   8. UPDATE row → status='enviado'+provider_message_id  |  'falhou'+erro   │
└───────────────────────────────┬───────────────────────────────────────────┘
                                 │  HTTPS
                                 ▼
                          ┌───────────────┐       ┌──────────────────────────┐
                          │    RESEND     │       │  pg_cron sweep (retry)   │
                          │ (DKIM/domain) │       │  falhou/pendente rows,   │
                          └───────────────┘       │  tentativas<MAX →         │
                                                  │  re-net.http_post the EF │
                                                  └──────────────────────────┘

CANDIDATE PANEL (pull, complements the push)
  DashboardCandidatoPage waiting-state card
     └─ reads config_sla_etapa (etapa → prazo_dias) → "triagem — resposta em até X dias"
```

### Component Responsibilities

| Component | Responsibility | New / Modified | Implementation basis |
|-----------|----------------|----------------|----------------------|
| `trg_notif_candidatura_recebida` | Fire event 1 on `AFTER INSERT ON candidaturas` | **NEW** | clone of `trg_candidatura_analise` (10-02) |
| `trg_notif_transicao` | Fire events 2 & 4 on `AFTER INSERT ON historico_candidatura`, CASE on `etapa_para` | **NEW** | new trigger on the canonical log |
| `trg_notif_convite_entrevista` | Fire event 3 on `AFTER INSERT ON agendamentos_entrevista` | **NEW** | clone of 10-02 pattern |
| SEC-03 n8n triggers (`trg_n8n_nova_candidatura`, `_status_candidatura`, `_revisao_decisao`) + `trg_n8n_novo_candidato` | — | **DROPPED** (retire n8n; resolves SEC-03 by substitution) | were dormant/graceful-skip |
| EF `notificar-candidato` | Self-auth, idempotent claim, allowlist PII read, template render, Resend send, log outcome | **NEW** | structure = `analise-candidato-individual`; Resend call = `cost-alerter` |
| `_shared/ics.ts` (Deno) | Server-side RFC-5545 `.ics` builder | **NEW (verbatim port)** | port of `agendamentoCandidatoService.gerarIcsAgendamento` |
| `notificacoes_enviadas` + 2 enums | Audit + idempotency + retry queue | **NEW** | schema below |
| `config_sla_etapa` + seed | Static per-stage turnaround estimate | **NEW** | non-PII reference table |
| pg_cron retry job | Sweep failed/pending sends, re-fire EF | **NEW** | reuse pg_cron (Phase 9 precedent) |
| DashboardCandidatoPage waiting-state card | Surface the estimate | **MODIFIED** | existing candidate dashboard |
| `avancar_etapa()` trigger + `historico_candidatura` table | — | **UNTOUCHED** (reuse-and-tighten) | canonical write-path |
| Vault secrets `project_url` + `edge_invoke_key` | DB→EF invoke auth | **REUSED as-is** | live since Phase 9; NOT `n8n_webhook_base` |

---

## Architectural Patterns

### Pattern 1: Canonical-transition-log trigger + two satellites (the source-of-truth mix)

**What:** Events that ARE etapa transitions fire from `historico_candidatura` (one row per transition, already written by `avancar_etapa()` for every advance/reject/knockout). Events that are NOT transitions fire from their own mutation.

**Why the mix is forced (not a compromise):**
- `avancar_etapa()` is **BEFORE UPDATE OF etapa_atual** — a candidatura INSERT writes **no** historico row (verified: `20260607000005_avancar_etapa_trigger.sql:96-99` binds `BEFORE UPDATE OF etapa_atual`). So **event 1 (confirmation) cannot come from the log.**
- Interview scheduling is an `agendamentos_entrevista` INSERT (M6), independent of the etapa move; the etapa may already be `entrevista_online` with no date yet. The invite needs `data_hora`/`local_ou_link`, which only the agendamento row carries. So **event 3 cannot come from the log.**
- Events 2 and 4 ARE transitions and DO land in the log: `avancar_etapa()` writes `etapa_de → etapa_para` for every `UPDATE OF etapa_atual`, including the `rejeitar_candidatura` RPC (`20260714100001:146-151` sets `etapa_atual='rejeitado'`) and the synchronous knockout auto-reject (ator NULL, auto_rejeitado=true).

**Event → trigger mapping (LOCKED recommendation):**

| # | Event | Trigger | Predicate | dedupe_key |
|---|-------|---------|-----------|------------|
| 1 | `candidatura_recebida` | `AFTER INSERT ON candidaturas` | (optional survivor guard — see Open Q1) | `candidatura_id \|\| ':candidatura_recebida'` |
| 2 | `avaliacao_liberada` | `AFTER INSERT ON historico_candidatura` | `etapa_para = 'avaliacao_assincrona'` | `historico_id` (unique per transition) |
| 3 | `convite_entrevista` | `AFTER INSERT ON agendamentos_entrevista` | `status <> 'cancelada'` | `agendamento_id` |
| 4 | `decisao_final` | `AFTER INSERT ON historico_candidatura` | `etapa_para IN ('aprovado','rejeitado')` | `historico_id` |

Events 2 and 4 are **one trigger** (`trg_notif_transicao`) with a CASE on `etapa_para` selecting the event — one place to reason about all transition-driven mail.

**Avoiding double-fire:**
- The SEC-03 `trg_n8n_status_candidatura` fires on `UPDATE OF status`. A single reject changes BOTH `status` and `etapa_atual`, so keeping it alongside the historico trigger would double-fire. **Resolution: drop all SEC-03 n8n triggers entirely** (they are dormant graceful-skips; M7 replaces the mechanism, not patches it — PROJECT.md "resolve SEC-03 por substituição").
- Belt-and-suspenders: the `dedupe_key` UNIQUE index makes a second delivery physically impossible even if a trigger double-fires (pg_net retry, a double UPDATE). This is the same idempotency posture as `analise-candidato-individual`'s `UNIQUE(candidatura_id) + UPSERT`.

**Trade-off:** three triggers instead of one. Accepted — it is the minimum that covers all four events without losing the etapa granularity or inventing PII-carrying payloads.

### Pattern 2: DB-trigger → pg_net → EF self-auth (dispatch + auth), NOT trigger → direct Resend

**What:** The trigger does one thing — `PERFORM net.http_post` to the EF with an ids-only body and a Vault Bearer. All logic (PII resolution, templating, Resend call, logging, idempotency) lives in the Deno EF.

**Why not trigger → direct Resend REST from PL/pgSQL:**
- HTML templating, base64 `.ics` attachment assembly, Resend error handling, and per-send audit-row writes are miserable in PL/pgSQL and trivial in TypeScript.
- `net.http_post` is fire-and-forget async — it cannot do read→render→send→capture-result in one place. The EF can.
- The precedent is already shipped and proven: `trg_candidatura_analise` (10-02) → `analise-candidato-individual`. Cloning it is zero-novelty.

**The DB→EF auth mechanism (chosen, with rationale):**
`net.http_post` carries **no user JWT** (there is no user session behind a trigger). Three candidates were considered:

| Mechanism | Verdict |
|-----------|---------|
| Service-role JWT via `--no-verify-jwt` + EF self-auth of a shared-secret Bearer | **CHOSEN** — exact `analise-candidato-individual` pattern |
| Supabase gateway JWT verification (default deploy) | Rejected — no user token exists to verify; would 401 every trigger call |
| Anon key | Rejected — grants nothing; EF still needs service_role internally |

Concretely, mirroring `analise-candidato-individual/index.ts:148-156` and its `Deno.serve` wiring (`ANALISE_SECRET ?? SERVICE_KEY`):
- Trigger sends `Authorization: 'Bearer ' || <edge_invoke_key>` (the existing Vault secret, value == service_role — verified in 10-02 comment "the EF validates the Bearer == service_role").
- EF deployed `--no-verify-jwt`; on entry compares `bearer !== (Deno.env NOTIFICAR_SECRET ?? SUPABASE_SERVICE_ROLE_KEY)` → 401. The env override exists purely for secret rotation without touching the service_role key.

**PII placement:** the trigger body is **ids only** (`evento`, `candidatura_id`, and one of `historico_id` / `agendamento_id`) — never nome/email/cpf. This is the exact SEC-03 rule ("Body = ids/status/event only, no PII"). The EF resolves `candidato_id` + nome + email from `candidatura_id` via an allowlist projection (`candidatos.select('nome_completo, email')`, never `select('*')` — [[reference_select_star_leaks_pii]]).

**Example (trigger body — clone of 10-02):**
```sql
PERFORM net.http_post(
  url := v_project_url || '/functions/v1/notificar-candidato',
  headers := jsonb_build_object('Content-Type','application/json',
                                'Authorization','Bearer ' || v_invoke_key),
  body := jsonb_build_object('evento','avaliacao_liberada',
                             'candidatura_id', NEW.candidatura_id,
                             'historico_id',   NEW.id)   -- ids only, no PII
);
```

### Pattern 3: The audit row IS the idempotency guard AND the retry queue

**What:** `notificacoes_enviadas` is not a passive log. The EF's first DB write is an **idempotent claim**: insert a `pendente` row `ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`. Zero rows returned ⇒ a prior attempt already owns this send ⇒ skip (exactly-once). After a successful Resend call it flips the row to `enviado` + `provider_message_id`; on failure to `falhou` + `erro` and `tentativas = tentativas + 1`. The partial index over `status IN ('pendente','falhou')` is the retry queue the pg_cron sweep drains.

**When to use:** any at-least-once delivery source (pg_net can retry; a double UPDATE can double-fire) that must become exactly-once. Same discipline as the analise EF's UPSERT-on-unique.

**Trade-off:** one extra round-trip (the claim) before every send. Cheap, and it is the single mechanism that makes double-fire, replay, and retry all safe.

### Pattern 4: Pure `.ics` builder ported across the Deno boundary (don't re-derive, don't share-import)

**What:** `agendamentoCandidatoService.gerarIcsAgendamento` + `escapeIcsText` + `foldIcsLine` + `toIcsUtc` are **pure, dependency-free** (verified — RFC-5545 CRLF joins, §3.3.11 TEXT escaping, §3.1 75-octet folding, basic-UTC timestamps, generic non-PII `SUMMARY`). They live in `src/` (browser); the EF lives in `supabase/functions/` (Deno) — the two trees can't share a module cleanly.

**Recommendation:** port them **verbatim** into `supabase/functions/_shared/ics.ts` (a ~60-line copy). Regenerate the `.ics` in the EF from the agendamento allowlist read, then attach to Resend as `{ filename:'entrevista-beauty-smile.ics', content: base64(ics), content_type:'text/calendar' }` (Resend attachments API confirmed: `content` accepts a base64 string, `content_type` derivable/overridable). Keep the generic `SUMMARY` constant — `vaga_id` stays outside the projection, so no vaga name / no PII reaches the file (matches the client builder's T-35-01/04 note).

**Do NOT** re-invent the ics logic in the EF (drift risk) and do NOT try to import the `src/` module (cross-runtime). A verbatim port with a comment pointing back to the source is the honest choice. (Minor: the ported builder emits `METHOD:PUBLISH` — an "add to calendar" attachment, not a REQUEST/accept-decline invite. That matches the existing client behavior and is fine for MVP; flag REQUEST semantics as a future nicety.)

---

## Data Flow (per event, end-to-end)

**Event 1 — candidatura_recebida**
`INSERT candidaturas` → `trg_notif_candidatura_recebida` → pg_net(body: `{evento, candidatura_id, candidato_id:NEW.candidato_id}`) → EF: claim(`candidatura_id:candidatura_recebida`) → allowlist read `candidatos(nome,email)` + `vagas(titulo)` → render "recebemos sua candidatura para <vaga>" → Resend (no attachment) → log. *No `.ics`.* Survivor-guard decision flagged in Open Q1.

**Event 2 — avaliacao_liberada**
`UPDATE candidaturas.etapa_atual='avaliacao_assincrona'` → `avancar_etapa()` writes historico row → `trg_notif_transicao` (etapa_para match) → pg_net(`{evento:'avaliacao_liberada', candidatura_id, historico_id}`) → EF resolves candidato_id + PII from candidatura_id → render "sua próxima etapa está liberada" + panel link → Resend → log(dedupe=historico_id). *No `.ics`.*

**Event 3 — convite_entrevista**
`INSERT agendamentos_entrevista(status='agendada')` → `trg_notif_convite_entrevista` → pg_net(`{evento:'convite_entrevista', candidatura_id, agendamento_id}`) → EF: allowlist read `agendamentos_entrevista(data_hora, local_ou_link, tipo)` (NEVER observacoes_rh) + `candidatos(nome,email)` → render invite (date/time/local, `America/Sao_Paulo`) → **build `.ics` via `_shared/ics.ts` → base64 attachment** → Resend → log(dedupe=agendamento_id). *Reagendamento handling (fire on `UPDATE OF data_hora` too, dedupe = agendamento_id + data_hora) is a discuss-phase decision; MVP = INSERT only.*

**Event 4 — decisao_final**
`UPDATE candidaturas.etapa_atual IN ('aprovado','rejeitado')` (via `rejeitar_candidatura` RPC, the approve path, or synchronous knockout) → historico terminal row → `trg_notif_transicao` → pg_net(`{evento:'decisao_final', candidatura_id, historico_id, resultado:etapa_para}`) → EF renders **neutral D-15** language for rejeitado (criterio_texto/score NEVER in the email — RNF-12a/D-15), congrats+next-steps for aprovado → Resend → log(dedupe=historico_id). Unifies human reject + approve + knockout auto-reject in one path.

---

## Proposed Schema — `notificacoes_enviadas`

```sql
-- enums (pt-BR domain; DO $$ ... duplicate_object guard for MCP replay-idempotency)
CREATE TYPE public.evento_notificacao AS ENUM
  ('candidatura_recebida','avaliacao_liberada','convite_entrevista','decisao_final');
CREATE TYPE public.status_notificacao AS ENUM
  ('pendente','enviado','falhou','ignorado');   -- ignorado = deliberately skipped (e.g. no-email policy)

CREATE TABLE public.notificacoes_enviadas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id      uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  candidato_id        uuid NOT NULL REFERENCES public.candidatos(id),
  evento              public.evento_notificacao NOT NULL,
  status              public.status_notificacao NOT NULL DEFAULT 'pendente',
  destino_email       text NOT NULL,                -- snapshot of the address sent-to (audit; email may later change)
  provider            text NOT NULL DEFAULT 'resend',
  provider_message_id text,                          -- Resend id; NULL until delivered
  erro                text,                          -- last error on failure
  tentativas          smallint NOT NULL DEFAULT 0,
  dedupe_key          text NOT NULL,                 -- idempotency (see Pattern 3)
  historico_id        uuid REFERENCES public.historico_candidatura(id),      -- events 2,4; NULL otherwise
  agendamento_id      uuid REFERENCES public.agendamentos_entrevista(id),    -- event 3; NULL otherwise
  criado_em           timestamptz NOT NULL DEFAULT now(),
  enviado_em          timestamptz,                   -- set when status='enviado'
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX notificacoes_dedupe_uidx ON public.notificacoes_enviadas (dedupe_key);
CREATE INDEX notificacoes_retry_idx
  ON public.notificacoes_enviadas (status, criado_em)
  WHERE status IN ('pendente','falhou');            -- the retry queue

ALTER TABLE public.notificacoes_enviadas ENABLE ROW LEVEL SECURITY;
```

**RLS (mirror `rh_gerencia_agendamento` WR-04 join-through):**
- ONE RH SELECT policy, vaga-scoped: `administrador` bypass OR `rh` owning the candidatura's real vaga (`candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id=c.vaga_id WHERE v.created_by = auth.uid())`). The **direct `vaga_id IN (...)` form is forbidden** (Pitfall-1 spoof) — join through candidaturas.
- **No candidate SELECT/INSERT/UPDATE policy.** It is an internal delivery log; the candidate learns of delivery by receiving the email + reading the panel timeline, not by reading this table. `destino_email` and `erro` are internal.
- All writes are by the EF via service_role (bypasses RLS). No second permissive policy (OR-defeat, SEC-08 lesson).

**Retention:** define in discuss-phase (PROJECT.md flags it). A pg_cron purge of rows past a retention window is the natural mechanism (pg_cron already used for `ai-logs-retention-cleanup`, `20260609000003`).

**Retry:** a pg_cron job (every ~5-15 min) selects `notificacoes_retry_idx` rows with `tentativas < MAX` (e.g. 3) and re-fires `net.http_post` to the EF (or a small batch variant). Resend does not re-drive a failed **API call** to us (it retries downstream delivery/bounces, not our request), so the sweep is required for send-time failures. Manual RH re-send (a button → JWT-ON invoke or an authorize-first RPC that re-enqueues) is a **deferrable** enhancement; the sweep covers automatic recovery.

---

## Timeline / SLA Estimate (the pull side)

**Recommendation: static per-stage config table, surfaced in the candidate dashboard.**

```sql
CREATE TABLE public.config_sla_etapa (
  etapa      public.etapa_processo PRIMARY KEY,
  prazo_dias smallint NOT NULL,
  rotulo     text NOT NULL          -- e.g. 'Triagem de currículos'
);
-- seed one row per waiting etapa (triagem/avaliacao_assincrona/entrevista_*/decisao_final)
ALTER TABLE public.config_sla_etapa ENABLE ROW LEVEL SECURITY;
-- non-PII reference data → single permissive SELECT policy for authenticated (or anon), no client writes
```

- **Data source = the config table**, not a computation. The candidate dashboard (`DashboardCandidatoPage.tsx`, the existing waiting-state cards keyed on `etapa_atual`/`status`) does an etapa→config lookup and renders "triagem — resposta em até X dias." Framed explicitly as an estimate (anxiety reduction, not a promise).
- **Why not a DEFINER RPC over `historico_candidatura` history now:** a data-driven median-time-in-stage estimate needs volume M6 has not accumulated (funnel operations just shipped), and adds complexity for little early value. It is the right **future** upgrade — note it for M8+, when the log has enough transitions to compute honest turnarounds. (Same table, `historico_candidatura`, is already the KPI source — the plumbing will exist.)
- The table (vs a frontend TS constant) is chosen so RH can tune prazos without a redeploy; a TS constant is the zero-infra fallback if a table feels heavy for MVP.

---

## Suggested Build Order (dependency-ordered, for the roadmapper)

1. **Foundation — enums + tables** (no deps): `evento_notificacao` + `status_notificacao` enums, `notificacoes_enviadas` (+ RLS RH-read vaga-scoped, no candidate policy, dedupe UNIQUE, retry partial index), `config_sla_etapa` + seed. Apply via **Supabase MCP `apply_migration`** (bypasses 42601 on `$$` bodies) → **ledger reconcile** (MCP stamps a timestamp version-row ≠ filename → `migration repair` / `schema_migrations` UPDATE, per M4 DBMIG-01 lesson).
2. **EF `notificar-candidato` + Resend + `_shared/ics.ts` port + 4 templates** (needs 1 — it writes the table): structure cloned from `analise-candidato-individual` (self-auth Bearer, injectable deps, `import.meta.main` wiring, redacted logs), Resend `fetch` cloned from `cost-alerter`, `.ics` ported from `agendamentoCandidatoService`. Set the `RESEND_API_KEY` (+ optional `NOTIFICAR_SECRET`) EF secret via `supabase secrets set` (**never** the bundle). Deploy `--no-verify-jwt`. Testable in isolation via a manual `net.http_post` before any trigger exists (dormant, like SEC-03 was). Templates can be a parallel sub-task inside this step (a `_shared/templates` module).
3. **Triggers rewire — retire n8n, resolve SEC-03** (needs 2 deployed so pg_net has a live target): DROP `trg_n8n_nova_candidatura` / `_status_candidatura` / `_revisao_decisao` / `trg_n8n_novo_candidato`; CREATE `trg_notif_candidatura_recebida` (candidaturas INSERT), `trg_notif_transicao` (historico_candidatura INSERT, CASE etapa_para → events 2+4), `trg_notif_convite_entrevista` (agendamentos_entrevista INSERT) — all reusing the 10-02 skeleton (SECURITY DEFINER, `search_path=''`, Vault `project_url`+`edge_invoke_key`, graceful-skip, REVOKE FROM PUBLIC), ids-only bodies. This step is where "aposenta o n8n / resolve SEC-03 por substituição" lands. Apply via MCP + ledger reconcile.
4. **Timeline** (needs 1's config table; independent of 2-3 — parallelizable): DashboardCandidatoPage waiting-state estimate from `config_sla_etapa`.
5. **Retry sweep (pg_cron)** (needs 1+2+3): the sweep job re-firing the EF for `falhou`/`pendente` rows under the tentativas cap. Resilience — the pipeline works without it; add last.
6. **Deferred:** manual RH re-send button/RPC; reagendamento-triggered invite; retention purge cron; data-driven SLA RPC.

---

## Anti-Patterns

### Anti-Pattern 1: Force all four events through one trigger on `historico_candidatura`
**What people do:** "the transition log is canonical, put one trigger there." **Why it's wrong:** `avancar_etapa()` is BEFORE UPDATE — candidatura INSERT and agendamento INSERT write no log row, so events 1 and 3 would never fire. **Instead:** the documented mix — log trigger for the two real transitions, satellite triggers for the two non-transition mutations.

### Anti-Pattern 2: Trigger → direct Resend REST from PL/pgSQL
**What people do:** read `RESEND_API_KEY` from Vault in the trigger and `net.http_post` straight to `api.resend.com`. **Why it's wrong:** buries HTML templating, base64 `.ics`, error capture, and per-send audit writes in Postgres; no clean place to write `notificacoes_enviadas` with `provider_message_id`/`erro`. **Instead:** trigger → EF → Resend; the EF owns render + send + log.

### Anti-Pattern 3: PII in the trigger payload
**What people do:** put nome/email in the `net.http_post` body "to save a query." **Why it's wrong:** breaks the SEC-03 "ids only, no PII" discipline; PII in pg_net request logs. **Instead:** ids only; the EF resolves PII via an allowlist `select` (never `select('*')`).

### Anti-Pattern 4: `select('*')` on candidatos/agendamentos in the EF
**What people do:** `candidatos.select('*')` to grab nome+email. **Why it's wrong:** RLS is row-level, not column-level — a star select drags cpf/telefone/endereço (and, for agendamentos, `observacoes_rh`) into the render path ([[reference_select_star_leaks_pii]]). **Instead:** explicit `nome_completo, email` (and `data_hora, local_ou_link, tipo` for agendamentos — never `observacoes_rh`).

### Anti-Pattern 5: No idempotency claim → double emails
**What people do:** send first, log after. **Why it's wrong:** pg_net retry or a double UPDATE sends twice. **Instead:** claim-then-send on a UNIQUE `dedupe_key` (Pattern 3).

### Anti-Pattern 6: Editing `avancar_etapa()` / `historico_candidatura` to add a "notified" flag
**What people do:** add a column or CREATE OR REPLACE the trigger body to track notifications. **Why it's wrong:** near-miss P27 lesson — re-authoring a live trigger body drops guards; M6 reuse-and-tighten forbids touching the canonical write-path. **Instead:** all notification state lives in `notificacoes_enviadas`; read the log, never mutate it.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Resend | EF `fetch('https://api.resend.com/emails', Bearer RESEND_API_KEY)` — clone of `cost-alerter/index.ts:216-234` | `html`+`text` bodies; `attachments:[{filename, content:base64, content_type:'text/calendar'}]` for the invite (40MB post-base64 cap; `.ics` is ~1KB). DKIM/verified domain required. Key is an EF secret, never bundle. |
| Supabase Vault | Trigger reads `project_url` + `edge_invoke_key` (existing) for the pg_net invoke | Reuse the analise pair; do NOT introduce/keep `n8n_webhook_base` (that path is retired). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Postgres trigger ↔ EF | pg_net async `net.http_post`, Bearer edge_invoke_key | fire-and-forget; graceful-skip if Vault NULL; EF self-auths |
| EF ↔ `notificacoes_enviadas` | service_role writes (claim/update) | bypasses RLS; RH reads via vaga-scoped policy |
| EF ↔ candidatos/candidaturas/agendamentos/vagas | service_role allowlist reads | never `select('*')`; never `observacoes_rh` |
| Candidate dashboard ↔ `config_sla_etapa` | anon/authenticated SELECT (non-PII reference) | the pull half; independent of the email path |
| `_shared/ics.ts` (Deno) ↔ `agendamentoCandidatoService` (browser) | verbatim code port (no shared import) | keep in sync manually; comment the provenance |

---

## Open Questions for discuss-phase / requirements (flag for roadmapper)

1. **Confirmation for knockouts?** Event 1 fires on candidaturas INSERT; a knockout is auto-rejected synchronously in the same txn → the candidate would get "recebemos sua candidatura" AND a neutral rejection near-simultaneously. Decide: add a survivor guard to event 1 (mirror `trg_candidatura_analise`'s `status<>'rejeitado' AND opcao_knockout_id IS NULL`), or accept both. *(Product decision; both are one-line implementations.)*
2. **Does the APPROVE path move `etapa_atual` to `'aprovado'`?** Event 4 keys on the historico terminal transition. The reject RPC provably sets `etapa_atual='rejeitado'` (`20260714100001`). **Verify** the approve/consolidation path (`registrar_decisao`/`consolidar-decisao-final`) also UPDATEs `etapa_atual='aprovado'` (writes a historico row). If approval only writes `decisao_final` without moving etapa, add a satellite trigger on `decisao_final` for approvals. *(One SQL check against the decisao flow resolves this — do it in discuss-phase.)*
3. **Reagendamento (event 3):** MVP fires on agendamento INSERT only. A reschedule (`UPDATE OF data_hora`) sending a fresh invite (dedupe = agendamento_id + data_hora) is a scoped enhancement — in or out for M7?
4. **`notificacoes_enviadas` retention window** — PROJECT.md explicitly defers this to discuss-phase; needed before any volume campaign.
5. **`.ics` METHOD:PUBLISH vs REQUEST** — the ported builder emits PUBLISH ("add to calendar"). REQUEST (accept/decline, organizer) is a future nicety; confirm PUBLISH is acceptable for MVP.

## Sources

- `supabase/migrations/20260610000002_analise_trigger.sql` — the DB→EF pg_net pattern reused for all three triggers (HIGH)
- `supabase/functions/analise-candidato-individual/index.ts` — DB-triggered EF self-auth (`--no-verify-jwt` + Bearer) reused for `notificar-candidato` (HIGH)
- `supabase/functions/get-curriculo-url/index.ts` — authenticate-THEN-authorize + allowlist projection discipline (HIGH)
- `supabase/functions/cost-alerter/index.ts:204-235` — the Resend `fetch` call, cloned verbatim (HIGH)
- `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` — proves `historico_candidatura` is written only on BEFORE UPDATE OF etapa_atual (source-of-truth mix rationale) (HIGH)
- `supabase/migrations/20260607000001_historico_candidatura.sql` — canonical transition-log schema (HIGH)
- `supabase/migrations/20260716000001_agendamentos_entrevista.sql` — event-3 source table + `get_meu_agendamento` allowlist + WR-04 RLS pattern reused for `notificacoes_enviadas` RLS (HIGH)
- `supabase/migrations/20260714100001_rejeitar_candidatura_rpc.sql` — reject funnels through `etapa_atual` → historico (event-4 unification) (HIGH)
- `src/features/agendamento/services/agendamentoCandidatoService.ts` — the pure RFC-5545 `.ics` builder to port server-side (HIGH)
- `supabase/migrations/20260706110005_sec03_n8n_serverside.sql` + `20260712100004_n8n_novo_candidato.sql` — the dormant n8n triggers retired by M7 (HIGH)
- `supabase/migrations/20260609000003_prompt_library_cron.sql` — pg_cron is live in this project (retry sweep + retention feasibility) (HIGH)
- Resend send-email API docs (attachments `content` base64 + `content_type`; `html`/`text` bodies) — https://resend.com/docs/api-reference/emails/send-email (HIGH, verified 2026-07-17)

---
*Architecture research for: M7 transactional email pipeline integration into the Beauty Smile ATS*
*Researched: 2026-07-17*
