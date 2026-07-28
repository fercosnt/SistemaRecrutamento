# Phase 38: EF `notificar-candidato` (COMM) - Research

**Researched:** 2026-07-23
**Domain:** Supabase Edge Function (Deno) · Resend transactional email · idempotent ledger writes · `.ics` (RFC-5545) attachment
**Confidence:** HIGH for in-repo patterns (verified by codebase reads); MEDIUM for Resend `attachments[]` shape (cross-check against live Resend docs during execute — flagged below).

> **Provenance note:** The `gsd-phase-researcher` subagent repeatedly failed to persist its output (API connection dropped mid-write, 3×). This RESEARCH.md was authored by the orchestrator from direct reads of the reference implementations (`cost-alerter`, `analise-candidato-individual`, `email-config.ts`, the M6 `.ics` generator) plus the locked CONTEXT.md decisions. Every in-repo claim is grounded in a file read; the one external-API detail with residual uncertainty (Resend `attachments[]`) is explicitly flagged for execute-time verification.

## Summary

The EF is a **thin, self-authenticating dispatcher**: authenticate the Vault Bearer → parse an ids-only body → claim idempotency against `notificacoes_enviadas` → resolve candidate/vaga/agendamento data by allowlist → render one of 4 Beauty Smile HTML templates (convite carries a base64 `.ics` attachment) → `fetch` Resend → write the outcome back to the ledger → always return 200 (fire-and-forget). It is **deployed dormant** (`--no-verify-jwt`) and proven end-to-end by a manual `net.http_post` before any trigger exists (P39). Zero new npm deps: plain `fetch`, imports static.

Nearly every mechanic already has a **live in-repo analog** — this phase is 80% assembly of proven patterns, 20% new surface (the 4 templates, the `.ics` attachment encoding, and the claim-before-send idempotency).

## Architectural Responsibility Map

| File | Role | Analog / Source |
|------|------|-----------------|
| `supabase/functions/notificar-candidato/index.ts` | The EF: self-auth → claim → resolve → render → send → record | `analise-candidato-individual/index.ts` (self-auth, allowlist, try/catch never-absent) + `cost-alerter/index.ts` (Resend fetch, idempotent-return) |
| `supabase/functions/_shared/ics.ts` | `.ics` RFC-5545 generator, **ported verbatim** from M6 | `src/features/agendamento/services/agendamentoCandidatoService.ts::gerarIcsAgendamento` |
| `supabase/functions/_shared/email-templates.ts` | Shared wrapper + 4 event bodies, inline-CSS, hand-rolled | new — brand from `beauty-smile-design-system` skill |
| `supabase/functions/_shared/__tests__/email-templates.test.ts` | Deno tests: render each template + **grep-guard** on rejection (COMM-06) | `_shared/__tests__/` existing patterns |
| `supabase/functions/_shared/__tests__/ics.test.ts` | Parity test: ported `.ics` output == M6 output | M6 `agendamentoCandidatoService.test.ts` |
| (import) `supabase/functions/_shared/email-config.ts` | Sender/recipient/mode contract — **imported, not reimplemented** | P36 (exists) |

**Orchestrator-checkpoint tasks (NOT executor-autonomous — GSD subagents lack Supabase MCP tools):** EF deploy (`supabase functions deploy notificar-candidato --no-verify-jwt`) and the manual `net.http_post` smoke (COMM-01 criterion 4). Plan these with `autonomous: false`.

## Q1 — Resend send-with-attachment via plain `fetch` (Deno EF)

**Confirmed in-repo** (`cost-alerter/index.ts:216`): the request is `POST https://api.resend.com/emails`, headers `{ Authorization: 'Bearer <key>', 'Content-Type': 'application/json' }`, JSON body. cost-alerter sends `{ from, to, subject, text }`. For P38 use `html` instead of `text`, add `reply_to`, and for the invite add `attachments`.

```ts
const resp = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: FROM,               // from _shared/email-config.ts
    to: destinatario.para,    // resolverDestinatario(...) — teste ⇒ delivered+<evento>@resend.dev
    reply_to: REPLY_TO,
    subject,                  // pt-BR per evento
    html,                     // rendered template
    attachments: [            // ONLY for convite
      { filename: 'entrevista-beautysmile.ics', content: icsBase64 },
    ],
  }),
})
```

- **Success:** Resend returns `2xx` with JSON `{ id: "<uuid>" }` → that `id` is the `provider_message_id` to persist (reconciliation key for P41's webhook).
- **Non-2xx error shape:** `{ statusCode, name, message }` (e.g. `{ statusCode: 422, name: 'validation_error', message: '...' }`, or `401` on bad key). Read `resp.ok`; on false, capture `resp.status` + parsed body message into the ledger `erro` column, mark `falhou`, schedule `proxima_tentativa_em`.
- **⚠ VERIFY AT EXECUTE:** the exact `attachments[]` key names (`filename` + `content` as base64 string, optionally `content_type`). This is the one detail not exercised by an existing in-repo call — confirm against `https://resend.com/docs/api-reference/emails/send-email` before finalizing the convite path. cost-alerter proves the top-level request shape; only the attachment sub-object is unverified in-repo.

## Q2 — Base64-encoding the `.ics` string in Deno (no new npm)

`btoa()` throws on non-Latin1 chars; the `.ics` may carry accented candidate names / vaga titles (SUMMARY, LOCATION, DESCRIPTION). **Safe idiom, zero deps:**

```ts
const icsBase64 = btoa(String.fromCharCode(...new TextEncoder().encode(icsString)))
```

`TextEncoder().encode` → UTF-8 bytes (Uint8Array); `String.fromCharCode(...bytes)` → a binary (Latin1) string `btoa` accepts. For long strings avoid spread-arg stack overflow by chunking, but `.ics` invites are small (<8 KB) so the direct spread is safe. Alternative if a helper is preferred: `import { encodeBase64 } from 'jsr:@std/encoding/base64'` (static import, part of Deno std, no npm registry) — but the zero-import `TextEncoder`+`btoa` idiom is preferred to keep `_shared/ics.ts` importless like `email-config.ts`.

**Also required:** RFC-5545 CRLF line endings (`\r\n`) — verify the ported generator emits them (M6 code already builds the array and joins; confirm the join uses `\r\n`).

## Q3 — Claim-before-send idempotency (win-detection)

The ledger already ships `uq_notif_dedupe UNIQUE (dedupe_key)`. Pattern with supabase-js:

```ts
const { data: claimed, error } = await supabaseAdmin
  .from('notificacoes_enviadas')
  .insert({ dedupe_key, evento, candidatura_id, candidato_id, destinatario_original, status: 'pendente', /* ... */ })
  .onConflict('dedupe_key')      // ⚠ supabase-js expresses this via upsert; see note
  .select('id')
```

**Win-detection detail:** supabase-js `.insert()` does NOT expose `ON CONFLICT DO NOTHING` directly. Two viable approaches (planner picks one):
- **(A) `.upsert(..., { onConflict: 'dedupe_key', ignoreDuplicates: true }).select('id')`** — `ignoreDuplicates:true` compiles to `ON CONFLICT DO NOTHING`; a **duplicate returns an empty `data` array** (no row selected) → that is the "already claimed" signal. A returned row = this invocation won the claim. This is the cleanest win-detector.
- **(B)** Plain `.insert().select('id').single()` and catch the `23505` unique-violation error code as the "already claimed" branch.

Recommend **(A)** — it is race-safe (atomic at the DB) and the empty-vs-nonempty `data` is an unambiguous win signal, no error-parsing. After a successful send: `UPDATE ... SET status='enviado', provider_message_id=... WHERE dedupe_key=...`. On failure: `SET status='falhou', erro=..., proxima_tentativa_em=now()+interval`.

`destinatario_original` is **NOT NULL** in the Insert type — it must be set at claim time (from `resolverDestinatario().destinatario_original`, i.e. the real candidate email, even in teste mode).

## Q4 — Self-auth Bearer (mirror)

**Confirmed** (`cost-alerter/index.ts:102`): the Bearer is compared against the service-role key.

```ts
const authHeader = req.headers.get('Authorization') ?? ''
const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
if (!bearer || bearer !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
  return errorResponse('UNAUTHORIZED', 'Não autorizado.', 401)
}
```

The trigger (P39) will send `Bearer <edge_invoke_key>` (the service_role JWT from Vault). Deploy `--no-verify-jwt` so this handler owns auth. Reuse cost-alerter's `jsonResponse`/`errorResponse`/CORS helpers verbatim.

## Q5 — Allowlist data resolution (never `select('*')`)

The EF resolves everything from ids. Minimal column allowlist per email (confirm exact names against `src/types/database.types.ts` at execute):
- **candidato** (via `candidaturas.candidato_id` → `candidatos`): `nome`, `email`. (email feeds `resolverDestinatario`.)
- **vaga** (via `candidaturas.vaga_id` → `vagas`): `titulo`.
- **agendamento** (convite, via `agendamento_id` → `agendamentos_entrevista`): `data_hora` (or start/end), `modalidade`/`local`, `link`. This row is also the input to the `.ics` generator.
- **candidatura**: `id`, `etapa_atual` (may inform decisao template branch aprovado/rejeitado, but copy stays neutral either way).

One join-through query per event (or a couple of targeted selects). NEVER `select('*')` — RLS is row-level not column-level; `*` would over-read PII. This mirrors `analise-candidato-individual`'s explicit allowlist discipline.

## Q6 — `.ics` port surface

`gerarIcsAgendamento(row: MeuAgendamentoRow): string` (M6) is a pure function taking one agendamento row and returning the RFC-5545 string with `METHOD:PUBLISH`, `PRODID:-//Beauty Smile//Recrutamento//PT-BR`. Port **verbatim** to `_shared/ics.ts`. The EF must construct a `MeuAgendamentoRow`-shaped object from its allowlist-resolved agendamento columns (map DB column names → the row type's field names). Keep the function byte-identical; only the surrounding import/export changes. Add a Deno parity test asserting the ported output equals a known M6 fixture.

## Q7 — Testing without a live key

- **Unit (deno test, no live key):** inject/stub `fetch` (e.g. pass a fetch impl or use a module-level indirection) so tests assert the **request** the EF builds (URL, headers minus secret, body JSON: correct `from`/`to`/`subject`/`html`, and `attachments` present ONLY for convite) without hitting the network. Assert each of the 4 events renders the right template and subject.
- **grep-guard (COMM-06):** render the rejection template and assert the HTML does NOT match `/score|percentil|trait|motivo|nota|ranking|pontuaç|critério/i`. This is the executable proof of D-15/RNF-07a neutrality.
- **`.ics` parity (COMM-04):** assert ported generator output == M6 fixture; assert base64 round-trips (`atob` → original bytes).
- **Manual smoke (COMM-01 criterion 4, orchestrator checkpoint):** after dormant deploy, `net.http_post` to the EF (Vault Bearer) with a real test candidatura id and `evento` → assert (a) an email lands at `delivered+<evento>@resend.dev`, (b) a `notificacoes_enviadas` row exists with `status='enviado'` + `provider_message_id`. Runs in **teste** mode (`NOTIFICACOES_MODO` unset ⇒ fail-safe teste ⇒ `resolverDestinatario` redirects to `resend.dev`).

## Key Pitfalls (surface to planner)

1. **Runtime-constructed imports hide packages from deploy** — any external import MUST be static top-of-file (`["npm:",pkg].join("")` → `ERR_MODULE_NOT_FOUND` in prod). Goal is zero new imports anyway.
2. **`btoa` on non-ASCII throws** — use the `TextEncoder`+`String.fromCharCode` idiom (Q2).
3. **`destinatario_original` NOT NULL** — must be set at claim time or the Insert type won't compile / the row rejects.
4. **`evento` naming bridge** — ledger enum (`confirmacao|avanco|convite|decisao`) ≠ `email-config.ts` `EventoNotificacao` (`candidatura_recebida|...`). The EF owns the map; keep it a single explicit literal so both directions are auditable.
5. **Never throw to the trigger** — non-2xx Resend / send failure records `falhou` and returns 200. A 500 back to `net.http_post` is silently dropped (at-most-once) and loses the failure record.
6. **`select('*')` leaks PII** (RLS is row-level) — allowlist only.
7. **Survivor-guard (COMM-02)** — confirmation must be suppressed when the candidatura is born auto-rejected (knockout). In P38 the EF is invoked manually, so this is a rendering/branch concern (the `confirmacao` event simply isn't dispatched for a knockout row); the enforcement lives at the P39 trigger. Note it but don't build trigger logic here.

## Validation Architecture

| Requirement | Proof | Type | Autonomous? |
|-------------|-------|------|-------------|
| COMM-01 (EF exists, self-auth, allowlist, Resend, ledger write) | deno test asserts request shape + ledger 2-phase write against mocked fetch/db; source-grep asserts no `select('*')` | unit + source | yes (unit) / no (live smoke) |
| COMM-02 (confirmação; survivor-guard suppresses on knockout) | deno test renders `confirmacao` template; note suppression enforced at P39 | unit | yes |
| COMM-03 (avanço) | deno test renders `avanco` template + subject | unit | yes |
| COMM-04 (convite + `.ics` PUBLISH attachment, TZ America/Sao_Paulo) | `.ics` parity test vs M6 fixture; base64 round-trip; request includes `attachments[]` only for convite | unit | yes |
| COMM-05 (decisão ≤24h, neutral fixed template, human-triggered) | deno test renders `decisao` template; copy is a frozen constant | unit | yes |
| COMM-06 (4 hand-rolled inline-CSS templates; rejection grep-guard) | **grep-guard test** fails if rejection HTML matches scoring-token regex; assert no react-email import | unit + source | yes |
| COMM-01 criterion 4 (end-to-end manual smoke) | `net.http_post` → email at `resend.dev` + `enviado` ledger row | integration | **no — orchestrator checkpoint** |

**Nyquist coverage:** every COMM requirement has at least one executable assertion; the only non-autonomous proof is the live smoke (requires deploy + Vault key + MCP), correctly gated as an orchestrator checkpoint. VALIDATION.md derives directly from this table.

## RESEARCH COMPLETE
