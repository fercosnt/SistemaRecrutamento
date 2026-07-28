---
phase: 39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03
reviewed: 2026-07-28T01:03:56Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql
  - supabase/tests/p39_rewire_triggers_smoke.sql
  - supabase/functions/submit-candidatura/index.ts
  - supabase/functions/submit-candidatura/index.test.ts
findings:
  critical: 3
  warning: 13
  info: 5
  total: 21
status: issues_found
---

# Phase 39: Code Review Report

**Reviewed:** 2026-07-28T01:03:56Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

---

## ⚖ Adjudicação do orquestrador (2026-07-28, evidência PROD ao vivo)

O reviewer roda como subagente e **não recebe os tools MCP do Supabase** (bug upstream
anthropics/claude-code#13898), então os 3 CRITICAL foram re-checados no main thread contra
PROD e contra os arquivos. Veredito:

| ID | Veredito | Evidência |
|----|----------|-----------|
| **CR-01** — aprovado recebe e-mail de rejeição | ✅ **CONFIRMADO** | Cadeia provada: trigger vivo mapeia `etapa_para IN ('aprovado','rejeitado') → 'decisao'` (corpo ids-only, sem discriminador) → `helpers.ts` `EVENTO_MAP.decisao='decisao_final'` → `email-templates.ts:151` `decisao_final: corpoDecisao` → `corpoDecisao` (:128-136) usa **exclusivamente** `COPY_REJEICAO` = *"Sua candidatura não seguirá para as próximas etapas…"*. O "NEUTRO" do docblock é neutro quanto a **dado de avaliação** (D-15/RNF-07a), não neutro entre aprovar/rejeitar. |
| **CR-02** — survivor-guard é dead code | ✅ **CONFIRMADO** | `20260709000014:61-73` INSERE sem `opcao_knockout_id` e sem status rejeitado; o knockout é aplicado por **UPDATE posterior** (`:138-144`). `trg_notif_confirmacao` é AFTER **INSERT** → `NEW.status`/`NEW.opcao_knockout_id` são os do INSERT → guarda nunca verdadeira. Viola a decisão de kickoff "knockout = zero e-mail". |
| **CR-03** — Bearer mismatch, todo dispatch 401 | ❌ **REFUTADO** | `net._http_response` ao vivo: o 401 é o id **57** (2026-07-26 17:54) = o gap da P38 **já corrigido** (`NOTIFICAR_SECRET`=`edge_invoke_key`). Os dispatches **seguintes** (ids 58, 60, 61) retornam **200 `{"ok":true}`**. O "zero rows é a assinatura" também cai: não há tráfego de funil desde **2026-06-26** (última candidatura e último histórico em 06-26; zero agendamentos), então os triggers nunca dispararam em dado real — e a linha do smoke da P38 foi limpa deliberadamente. |

**Consequência de risco (mais importante que qualquer finding isolado):** CR-01 e CR-02 estão
**latentes** hoje só porque a entrega está quebrada (`403 domain not verified`). O DNS do
`rh.beautysmile.com.br` **já subiu** (SPF + DKIM + MX Resend live em 2026-07-28) e o 41-05
ativaria a varredura `pg_cron`. Fechar DELIV-01 e/ou aplicar o 41-05 **converte os dois bugs em
dano real a candidatos**: aprovados recebendo rejeição, knockouts recebendo confirmação.
**Corrigir CR-01/CR-02 antes de habilitar entrega.**

## Summary

The phase does what its title says — the four `trg_n8n_*` triggers are gone, three
`trg_notif_*` triggers replace them, and the hardcoded n8n `fetch` is out of
`submit-candidatura`. The *hardening* of the new triggers is genuinely good: SECURITY
DEFINER + `SET search_path = ''`, Vault-only secrets, ids-only bodies, graceful-skip on
NULL secrets, fail-open `EXCEPTION WHEN OTHERS`, `REVOKE ALL … FROM PUBLIC`. Nothing is
logged that contains a secret.

The **semantics**, however, are broken in three independent, provable ways, and the smoke
test is structured so that none of the three can fail it:

1. `etapa_para = 'aprovado'` is mapped to the `decisao` event, and the `decisao` event
   renders a template whose body is a **frozen rejection copy**. An *approved* candidate
   receives a rejection e-mail. (CR-01)
2. The survivor-guard on `trg_notif_confirmacao` is **unreachable in the production write
   path** — the AFTER-INSERT trigger observes the row before `submit_candidatura_atomic`
   applies the knockout UPDATE, so `NEW.status` is always `aguardando_resposta` and
   `NEW.opcao_knockout_id` is always NULL. Knockouts get the confirmation e-mail. (CR-02)
3. The triggers authenticate with the Vault `edge_invoke_key`, but `notificar-candidato`
   compares the Bearer to `NOTIFICAR_SECRET ?? SUPABASE_SERVICE_ROLE_KEY`. Per the phase
   brief the `edge_invoke_key == service_role` invariant is broken by a key rotation, so
   every dispatch 401s — silently, because `net.http_post` never inspects the response.
   `notificacoes_enviadas` having **zero rows** post-apply is consistent with exactly this.
   (CR-03)

The smoke test is the deepest quality problem. Its structural assertions are substring
greps that also match the `COMMENT ON FUNCTION` prose (`'aprovado'`, `'rejeitado'` appear
in the comments), its behavioral assertions test a synthetic `INSERT … status='rejeitado'`
that production never performs, and its "adaptive expected count" plus catch-all
`EXCEPTION WHEN OTHERS` mean any fixture failure downgrades the run to 6/6 GREEN. It
cannot fail on the behavioral half. Assertion (a) actively *pins the CR-01 bug in place*.

`submit-candidatura/index.ts` is clean with respect to the phase's change (zero outbound
network remains, the docstring is accurate about the new dispatch owner), but the test file
adds no assertion covering that removal, and the EF's security-critical branches (IDOR
cross-check, `curriculo_url` prefix, perguntas pre-check) still have zero coverage.

## Critical Issues

### CR-01: An APPROVED candidate is sent the frozen rejection e-mail

**File:** `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql:77-78`

**Issue:** The CASE collapses both terminal etapas into a single event:

```sql
ELSIF NEW.etapa_para IN ('aprovado', 'rejeitado') AND NEW.auto_rejeitado = false THEN
  v_evento := 'decisao';
```

The ids-only body (`evento` + `candidatura_id`) carries **no outcome discriminator**, and
downstream there is none either:

- `helpers.ts:18` — `decisao` → `decisao_final` template.
- `email-templates.ts:128-137` — `corpoDecisao()` interpolates **only** `COPY_REJEICAO`,
  which is the frozen constant *"Sua candidatura não seguirá para as próximas etapas
  deste processo seletivo."* (`email-templates.ts:38-40`). There is no approval branch and
  no parameter that could select one.

Trace of the live approval path: `registrar_decisao` is invoked **from the client**
(`src/features/decisao/services/decisaoService.ts:151`) with the RH user's JWT, so
`auth.uid()` is non-NULL inside `avancar_etapa()`. Per
`20260712110001_avancar_etapa_auto_rejeitado_fix.sql:110-117`, `auto_rejeitado` is
`(v_ator IS NULL AND …)` → **false**. `registrar_decisao` sets `etapa_atual='aprovado'`
(`20260709000012_registrar_decisao_amend.sql:112`), `avancar_etapa` writes
`etapa_para='aprovado', auto_rejeitado=false` → `trg_notif_transicao` fires `decisao` →
the approved candidate receives the rejection copy.

This is a user-facing data/communication failure with legal and reputational exposure, and
it is the *default* outcome of every approval since the migration went live.

**Fix:** Restrict the decision branch to rejections until the EF supports an approval
template, and open a follow-up for the approval e-mail:

```sql
  ELSIF NEW.etapa_para = 'rejeitado' AND NEW.auto_rejeitado = false THEN
    v_evento := 'decisao';   -- SÓ rejeição: o template decisao_final é COPY_REJEICAO fixo
  -- TODO(P4x): 'aprovado' exige um evento/template próprio antes de notificar.
```

Alternatively, add an `aprovacao` event end-to-end (trigger CASE → `EventoLedger` →
`EVENTO_MAP` → `SUBJECTS`/`CORPOS`/`PREHEADERS` → `notificacoes_enviadas.evento` CHECK) and
map `etapa_para='aprovado'` to it. Do **not** ship the current mapping either way.

---

### CR-02: The survivor-guard in `trg_notif_confirmacao` is dead code — knockouts receive the confirmation e-mail

**File:** `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql:139-141`

**Issue:** The guard reads knockout state off the NEW row of an **AFTER INSERT** trigger:

```sql
IF NEW.status = 'rejeitado' OR NEW.opcao_knockout_id IS NOT NULL THEN
  RETURN NEW;
END IF;
```

But the only production writer of `candidaturas` is `submit_candidatura_atomic`
(`20260709000014_submit_candidatura_flag.sql`), and it applies the knockout **after** the
INSERT statement:

- `:61-81` — `INSERT INTO public.candidaturas (candidato_id, vaga_id, status, etapa_atual,
  curriculo_url, …)` with `status = 'aguardando_resposta'`, `etapa_atual = 'inscricao'`.
  `opcao_knockout_id` is **not in the column list** → NULL.
- `:124-144` — the knockout sweep runs, then `UPDATE public.candidaturas SET
  status='rejeitado', … opcao_knockout_id = v_ko_opcao_id`.

PostgreSQL fires non-deferred `AFTER … FOR EACH ROW` triggers at the end of the *triggering
statement*, i.e. immediately after the INSERT and **before** the sweep. Therefore
`NEW.status` is always `'aguardando_resposta'` and `NEW.opcao_knockout_id` is always NULL
at trigger time. The guard can never be true. Every knockout candidate is auto-rejected in
the same transaction *and* sent "Recebemos sua candidatura" — directly contradicting the
phase's stated D-03/D-05 requirement.

The guard was copied "verbatim" (comment at `:137`) from
`20260610000002_analise_trigger.sql:37`, which carries the identical latent defect for the
analysis dispatch — worth a separate ticket.

**Fix:** Do not derive knockout state from the INSERT-time NEW row. Re-read the committed
row, or move the confirmation dispatch to the point where the knockout outcome is final.
Minimal in-trigger fix (re-read is safe here because the sweep runs later in the same txn —
so it must be a *deferred* constraint-style trigger):

```sql
DROP TRIGGER IF EXISTS trg_notif_confirmacao ON public.candidaturas;
CREATE CONSTRAINT TRIGGER trg_notif_confirmacao
  AFTER INSERT ON public.candidaturas
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notif_confirmacao();
```

…and inside the function re-read the authoritative state instead of trusting NEW:

```sql
  SELECT c.status, c.opcao_knockout_id
    INTO v_status, v_ko
    FROM public.candidaturas c WHERE c.id = NEW.id;
  IF v_status = 'rejeitado' OR v_ko IS NOT NULL THEN
    RETURN NEW;
  END IF;
```

Whichever route is chosen, add a behavioral test that goes through
`submit_candidatura_atomic` with a knockout-tagged answer — not a hand-written
`INSERT … status='rejeitado'` (see WR-07).

---

### CR-03: Trigger Bearer (`edge_invoke_key`) does not match what `notificar-candidato` accepts — every dispatch 401s, silently

**File:** `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql:85-86, 96` (and `:146,156` / `:199-200,210`)

**Issue:** All three triggers send:

```sql
'Authorization', 'Bearer ' || v_invoke_key   -- v_invoke_key = vault 'edge_invoke_key'
```

The receiving EF authenticates against a *different* secret
(`supabase/functions/notificar-candidato/index.ts:116` and `:412`):

```ts
const expectedSecret = Deno.env.get("NOTIFICAR_SECRET") ?? SERVICE_KEY;  // SUPABASE_SERVICE_ROLE_KEY
…
if (!bearer || bearer !== deps.serviceKey) return errorResponse("UNAUTHORIZED", …, 401);
```

The migration silently relies on the invariant `edge_invoke_key == service_role`. Per the
phase brief that invariant is **broken by a key rotation**, and the migration contains no
verification, no comment acknowledging the coupling, and no fallback. Result: every
`net.http_post` gets a 401 from the EF.

The failure is **completely invisible**:
- `net.http_post` is fire-and-queue; it returns a request id, not the response. The
  `EXCEPTION WHEN OTHERS` wrapper (`:103-105`) only catches *enqueue* errors, never a 401.
- The EF returns 401 *before* the claim step, so no `notificacoes_enviadas` row is written
  and the P41 retry sweep has nothing to pick up.
- Nothing reads `net._http_response`.

`notificacoes_enviadas` currently holding **zero rows** is exactly the signature of this.

**Fix:** Make the shared secret explicit rather than assumed. Either (a) set the
`NOTIFICAR_SECRET` EF env var to the current Vault `edge_invoke_key` value and record that
coupling in the migration header and in `config.toml`'s comment block, or (b) give the
notification hop its own Vault secret and read it in the triggers:

```sql
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'notificar_invoke_key';
```

Independently of the choice, add a post-apply verification step (see WR-03) that asserts a
2xx in `net._http_response` for at least one dispatch, and treat "zero rows in
`notificacoes_enviadas` after a real funnel event" as a failed apply, not a clean one.

## Warnings

### WR-01: `trg_notif_convite` has no guard at all — invites can go out for cancelled/soft-deleted schedules and rejected candidaturas

**File:** `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql:187-232`

**Issue:** Unlike the other two triggers, this one dispatches on *every* row inserted into
`agendamentos_entrevista` with no predicate (the COMMENT at `:235-236` states this is
intentional). But the table (`20260716000001_agendamentos_entrevista.sql:23-38`) carries
`status public.status_entrevista NOT NULL DEFAULT 'agendada'` and `deleted_at`. A row
inserted directly with `status='cancelada'`, a backfill/data-migration insert, or a schedule
attached to a candidatura whose `status` is already `'rejeitado'` all e-mail the candidate
an interview invitation.

**Fix:** Add a guard symmetric with the other two triggers:

```sql
  IF NEW.status <> 'agendada' OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.candidaturas c
              WHERE c.id = NEW.candidatura_id AND c.status = 'rejeitado') THEN
    RETURN NEW;
  END IF;
```

---

### WR-02: The `decisao` dedupe key collapses amended decisions — the second decision is never communicated

**File:** `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql:77-78`
(interacts with `supabase/functions/notificar-candidato/helpers.ts:40`)

**Issue:** `montarDedupeKey` returns `${candidaturaId}:decisao` for the event. Because
`aprovado` and `rejeitado` share the single `decisao` event, a decision that is later
amended — and `20260709000012_registrar_decisao_amend.sql` exists precisely because
amendments are a supported flow — collapses into `skipped: "duplicate"` at
`notificar-candidato/index.ts:257-264`. The candidate is told the first outcome and never
the corrected one.

**Fix:** Falls out of the CR-01 fix if `aprovado` gets its own event (distinct dedupe key).
If the events stay merged, include the outcome in the key, e.g. pass `etapa_para` in the
body and key on `${candidaturaId}:decisao:${resultado}`.

---

### WR-03: Zero observability on dispatch outcome — the fail-open wrapper cannot see an HTTP failure

**File:** `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql:91-105` (×3)

**Issue:** `PERFORM net.http_post(...)` enqueues; the response lands asynchronously in
`net._http_response`. The `EXCEPTION WHEN OTHERS → RAISE WARNING` block therefore only
covers enqueue-time errors (pg_net missing, bad args). A 401/404/5xx from the EF, a DNS
failure, or a timeout produce **no warning, no ledger row, and no metric**. Combined with
CR-03 this is how a 100% notification outage went unnoticed. It is also why `pg_net` being
at-most-once is not, by itself, an acceptable design without a reconciliation read.

**Fix:** Add a reconciliation query/alert over `net._http_response` (join on the request id
returned by `net.http_post`, which the trigger currently discards via `PERFORM`), or a
scheduled check that alerts when a funnel event has no matching `notificacoes_enviadas`
row within N minutes. At minimum, capture the id:

```sql
  v_req_id := net.http_post(...);
  -- persist v_req_id alongside candidatura_id so a sweep can reconcile the response
```

---

### WR-04: The Vault-read + dispatch block is duplicated verbatim three times

**File:** `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql:83-105, 143-165, 197-220`

**Issue:** ~23 identical lines (two Vault SELECTs, NULL check, `net.http_post` with the
same URL/headers, the same fail-open block) are repeated in each function. Every fix in this
review (CR-03's secret name, WR-03's request-id capture, any URL or header change) must now
be applied in three places and can silently diverge. The `RAISE WARNING` text is the only
intentional difference.

**Fix:** Extract one SECURITY DEFINER helper and call it from all three:

```sql
CREATE OR REPLACE FUNCTION public.dispatch_notificacao(p_body jsonb, p_origem text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ … $$;
```

Each trigger then reduces to its predicate plus
`PERFORM public.dispatch_notificacao(jsonb_build_object(…), 'trg_notif_transicao');`.

---

### WR-05: The orphaned `n8n_webhook_base` Vault secret is left live

**File:** `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql:12`

**Issue:** The header explicitly notes *"o segredo n8n_webhook_base fica órfão"* and the
migration does nothing about it. The phase's stated purpose is to *resolve SEC-03 by
substitution*, but the credential/endpoint at the centre of SEC-03 remains readable in the
Vault by every SECURITY DEFINER function in the database, with no remaining consumer. A
stale secret with no owner is exactly the residue that gets reused by the next copy-paste.

**Fix:** Drop it in the same phase (`SELECT vault.delete_secret('n8n_webhook_base');` or the
project's equivalent), or file a tracked follow-up and record the decision in the header
instead of a passing mention.

---

### WR-06: The smoke gate can never fail on the behavioral half — any error downgrades the run to GREEN

**File:** `supabase/tests/p39_rewire_triggers_smoke.sql:204-254, 344-355`

**Issue:** The setup block wraps its entire body in `EXCEPTION WHEN OTHERS THEN … set_config
('smoke39.behavioral','n') … RAISE NOTICE` (`:251-253`). The final gate then computes
`v_esperado := 6 + (CASE WHEN v_beh = 'y' THEN 3 ELSE 0 END)` (`:349`). So *any* failure to
build the fixture — a missing FK, a schema change, an RLS denial, a genuine trigger bug that
aborts the INSERT — sets `behavioral='n'`, lowers the expectation to 6, and the run reports
`gate VERDE`. The header's own claim that "um run todo-SKIP mascara falha" is the exact
failure mode the design permits.

**Fix:** Make the environment decision explicit and *up front*, not a consequence of an
error. Probe the Vault first, set `behavioral` from that probe only, and let fixture
construction errors propagate:

```sql
-- decide the path from the Vault probe ALONE; then build the fixture with NO catch-all
IF v_secret_set THEN … RETURN; END IF;
PERFORM set_config('smoke39.behavioral','y', false);
INSERT INTO public.vagas … ;   -- an error here must FAIL the run, not skip it
```

---

### WR-07: The behavioral assertions exercise a write path production never takes

**File:** `supabase/tests/p39_rewire_triggers_smoke.sql:265-269, 287-291`

**Issue:** (g) and (h) hand-write `INSERT INTO public.candidaturas (… status, etapa_atual …)`
with `status='rejeitado'`. Production never inserts a candidatura in that state — it inserts
`aguardando_resposta` and *then* updates (see CR-02). So (h) "proves" the survivor-guard on a
row shape that only the test produces, while the real path bypasses the guard entirely. The
test manufactures the confidence that hid CR-02.

**Fix:** Drive the behavioral assertions through the real entry point:

```sql
PERFORM public.submit_candidatura_atomic(
  v_cand, '39010039-…-a1', 'smoke/cv.pdf', 'cv.pdf', 1, '[{"pergunta_id":…,"resposta_opcoes":["Não"]}]'::jsonb);
-- then assert no `confirmacao` dispatch/ledger row for the knockout candidatura
```

---

### WR-08: Structural assertions are substring greps that also match the function's own COMMENT prose

**File:** `supabase/tests/p39_rewire_triggers_smoke.sql:59-67, 80-85, 98-100`

**Issue:** `pg_get_functiondef` returns the whole definition including the body's inline
comments. Assertion (b) checks `strpos(v_def,'rejeitado') = 0` — the word `rejeitado`
appears in `trg_notif_confirmacao`'s body comment at migration `:137-138` regardless of
whether the guard exists. Assertion (a) checks `'aprovado'` and `'rejeitado'` the same way.
These pass on a function whose predicate has been deleted, as long as the comment survives.
Assertion (a) additionally *pins CR-01 in place*: fixing CR-01 (dropping `'aprovado'` from
the branch) makes the smoke go RED for the correct behaviour.

**Fix:** Assert on catalog structure rather than text where possible, and where text is
unavoidable, match the full predicate, not a token:

```sql
IF strpos(v_def, 'NEW.etapa_para = ' || chr(39) || 'rejeitado' || chr(39)
                 || ' AND NEW.auto_rejeitado = false') = 0 THEN …
```

Update (a) as part of the CR-01 fix so the test asserts the *intended* mapping.

---

### WR-09: The smoke script runs unconditional DELETEs against production tables outside the safety gate

**File:** `supabase/tests/p39_rewire_triggers_smoke.sql:210-214, 334-338`

**Issue:** The idempotency cleanup at `:210-214` executes **before** the Vault probe that is
supposed to make the script safe in PROD, and the cleanup at `:334-338` executes
unconditionally even when the whole behavioral half was skipped. They are namespace-scoped
to `39010039-*` so today they are harmless, but the script's own safety contract ("SEM
INSERT — seguro em PROD vivo") is not actually enforced for destructive statements, and a
single typo in a UUID literal deletes a real `vagas`/`candidaturas` row from production.

**Fix:** Move both DELETE groups inside the `behavioral = 'y'` branch, and add a belt on the
predicate itself:

```sql
DELETE FROM public.vagas WHERE id = '39010039-…-a1' AND slug = 'smoke-39-vaga';
```

---

### WR-10: Nothing guards against a bulk/backfill INSERT into `historico_candidatura` blasting e-mails

**File:** `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql:114-117`

**Issue:** `trg_notif_transicao` is `FOR EACH ROW` with no recency or origin predicate. The
project already has precedent for bulk history writes
(`20260607000002_etapa_processo_v2_cutover.sql:117`, `20260712110002_backfill_auto_rejeitado.sql`).
Any future data migration that inserts historical rows with `etapa_para='avaliacao_assincrona'`
or a terminal etapa fires one live e-mail per row. The `dedupe_key` protects against
*repeats*, not against a first-time mass send of historical transitions.

**Fix:** Add a bypass GUC honoured by all three triggers, and document it as required for
any bulk write:

```sql
  IF current_setting('app.suprimir_notificacoes', true) IS NOT DISTINCT FROM 'on' THEN
    RETURN NEW;
  END IF;
```

---

### WR-11: `index.test.ts` adds no assertion covering the phase's actual change

**File:** `supabase/functions/submit-candidatura/index.test.ts:1-241`

**Issue:** The phase's substantive edit to this EF was the removal of a live outbound n8n
`fetch` (the anti-double-send change, per `index.ts:15-18`). The test file was not touched
to pin that: nothing asserts the handler performs zero network I/O. A future edit
reintroducing a webhook call — the precise regression this phase exists to prevent — passes
every existing test.

**Fix:** Stub the global fetch and assert it is never reached:

```ts
Deno.test("o handler não faz NENHUMA chamada de rede (n8n aposentado — P39)", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = ((..._a: unknown[]) => { calls++; return Promise.resolve(new Response("{}")); }) as typeof fetch;
  try {
    const { handler } = await loadHandler();
    const admin = makeMockSupabaseAdmin();
    await handler(makeRequest(VALID_BODY), { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) });
    assertEquals(calls, 0, "a EF não pode disparar nenhum webhook (P39)");
  } finally { globalThis.fetch = original; }
});
```

---

### WR-12: The EF's security-critical branches have zero test coverage

**File:** `supabase/functions/submit-candidatura/index.test.ts:155-240`

**Issue:** Five tests cover auth-absent, `.strict()` tampering, the happy path, and two RPC
error mappings. Untested: the **IDOR cross-check** (`index.ts:178-185`, `candidato.id !==
input.candidato_id` → 403), the `curriculo_url` prefix gate (`index.ts:191-197`), the
perguntas-belong-to-vaga pre-check rejection (`index.ts:232-239`), the missing-candidato
403 (`index.ts:170-177`), and the 413 body cap (`index.ts:118-125`). The IDOR check is the
single most security-relevant line in the file and is the one with no test. The mock already
supports all of these via `AdminOpts` — the gap is assertions, not harness.

**Fix:** Add, at minimum:

```ts
Deno.test("candidato_id divergente do dono autenticado → 403, nunca chega na RPC", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidatoOwner: { id: "outro-candidato-id" } });
  const res = await handler(makeRequest(VALID_BODY), { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) });
  assertEquals(res.status, 403);
  assertEquals(admin.rpcCalls.length, 0);
});

Deno.test("curriculo_url fora do prefixo do usuário → 400", async () => { /* … `outro-uid/cv.pdf` … */ });
Deno.test("pergunta_id que não pertence à vaga → 400 field=pergunta_id", async () => { /* perguntasResult: [] */ });
```

---

### WR-13: The body-size cap is bypassable — a missing or malformed `Content-Length` disables it

**File:** `supabase/functions/submit-candidatura/index.ts:114-125`

**Issue:**

```ts
const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10)
if (contentLength > 64 * 1024) { … 413 … }
```

A chunked/streamed request has no `Content-Length` → `'0'` → cap disabled. A malformed
header (`"abc"`) → `NaN` → `NaN > 65536` is `false` → cap disabled. `req.json()` then buffers
the entire body regardless. The comment at `:112-114` acknowledges the missing-header case
and leans on Zod's `.max(100)`, but Zod runs *after* the whole body is in memory, so it is
not a defence against the memory-exhaustion vector the cap exists to stop.

**Fix:** Treat an absent/unparseable header as untrusted and bound the read itself:

```ts
const rawLen = req.headers.get('content-length')
const contentLength = rawLen === null ? null : Number.parseInt(rawLen, 10)
if (contentLength === null || Number.isNaN(contentLength) || contentLength > 64 * 1024) {
  return errorResponse('VALIDATION', 'Payload muito grande ou tamanho não declarado', undefined, 413)
}
```

…or read the body through a length-limited stream before parsing.

## Info

### IN-01: `pg_trigger` counts in the smoke are not schema-qualified

**File:** `supabase/tests/p39_rewire_triggers_smoke.sql:178, 181`

**Issue:** `SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg\_notif\_%'` counts
triggers across **every** schema. The function count at `:179-180` correctly filters
`n.nspname = 'public'`; the trigger counts do not. A same-named trigger in any other schema
(including `backup_m2`, which this project uses) breaks the `= 3` assertion or masks a
missing one in `public`.

**Fix:** Join through `pg_class`/`pg_namespace`:

```sql
SELECT count(*) INTO v_notif_trg
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND t.tgname LIKE 'trg\_notif\_%' AND NOT t.tgisinternal;
```

---

### IN-02: Session GUCs leak past the end of the smoke script

**File:** `supabase/tests/p39_rewire_triggers_smoke.sql:248, 357`

**Issue:** `smoke39.pass` and `smoke39.cand` are set with `is_local = false` (session scope)
and only `smoke39.behavioral` is cleared at `:357`. In a pooled session the leftover
`smoke39.cand` (a real candidato UUID) and `smoke39.pass` persist for whatever runs next.

**Fix:** Clear all three at the end:
`SELECT set_config('smoke39.pass','',false), set_config('smoke39.cand','',false), set_config('smoke39.behavioral','',false);`

---

### IN-03: `error_code: 'UNAUTHORIZED'` is returned with HTTP 403

**File:** `supabase/functions/submit-candidatura/index.ts:170-185`

**Issue:** Both the missing-candidato and the candidato_id-mismatch branches return
`errorResponse('UNAUTHORIZED', …, 403)`. 401 means unauthenticated, 403 means authenticated
but forbidden; the code says one thing and the status another, so a client branching on
either signal gets an inconsistent story.

**Fix:** Introduce a `FORBIDDEN` code in `SubmitCandidaturaErrorCode` for these two branches,
or keep the code and use 401 consistently. Pick one and document it.

---

### IN-04: The `curriculo_url` prefix check permits `..` segments

**File:** `supabase/functions/submit-candidatura/index.ts:191`

**Issue:** `input.curriculo_url.startsWith(`${user.id}/`)` accepts
`"<uid>/../outro-uid/cv.pdf"`. Supabase Storage treats object names as opaque keys rather
than filesystem paths, so this does not currently resolve to another user's object — but the
check is presented as a defence-in-depth path guard and does not actually normalise the path,
which is a trap for anyone who later feeds this value to something that *does* normalise.

**Fix:** Reject traversal segments explicitly:

```ts
const path = input.curriculo_url
if (!path.startsWith(`${user.id}/`) || path.split('/').includes('..')) { … }
```

---

### IN-05: Two round-trips to `vault.decrypted_secrets` per trigger invocation

**File:** `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql:83-86` (×3)

**Issue:** Each function issues two separate `SELECT decrypted_secret … WHERE name = …`
against the decrypting view, per affected row. Beyond the redundant decrypt work, two
statements make the "both present or skip" invariant non-atomic in a way one statement would
not be.

**Fix:** Fold into a single aggregate read:

```sql
SELECT max(decrypted_secret) FILTER (WHERE name = 'project_url'),
       max(decrypted_secret) FILTER (WHERE name = 'edge_invoke_key')
  INTO v_project_url, v_invoke_key
  FROM vault.decrypted_secrets
 WHERE name IN ('project_url', 'edge_invoke_key');
```

---

_Reviewed: 2026-07-28T01:03:56Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
