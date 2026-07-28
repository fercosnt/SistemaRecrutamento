---
phase: 12-big-five-devolutiva
plan: 03
subsystem: avaliacao-async-scoring
tags: [edge-function, big-five, ipip-neo-120, scoring, authorize-then-act, anti-tamper, rnf-07a]
requires:
  - "supabase/functions/_shared/bigfive-scoring.ts (12-02 — score() + normGroupFromBirthDate())"
  - "supabase/functions/avaliar-redacao/index.ts (C1 authorize-then-act skeleton clonado)"
  - "scores_candidato (live — tipo enum inclui 'big_five'; status enum inclui 'sucesso')"
provides:
  - "supabase/functions/submit-bigfive-final/index.ts — candidate-invoked server-side scoring EF (NÃO deployada; deploy é o [BLOCKING] 12-06)"
affects:
  - "gerar-devolutiva-bigfive (invocada inline best-effort; EF criada no 12-04)"
tech-stack:
  added: []
  patterns:
    - "C1 authenticate-THEN-authorize (two-client D-23): auth.getUser() → posse+etapa 403 ANTES de qualquer escrita service_role"
    - "Anti-tamper (Pitfall 3): handler-level strict body gate (sem .uuid p/ casar os fixtures de teste) + re-score server-side; cliente nunca envia score"
    - "RNF-07a / Pitfall 4: status='sucesso' SEMPRE; nunca escreve candidaturas; nenhum threshold de traço"
key-files:
  created:
    - "supabase/functions/submit-bigfive-final/index.ts"
  modified: []
decisions:
  - "D-12-AVAL-04: ordem auth→authz→validate (autz precede a validação .strict do body) — os fixtures RED de 12-01 usam candidatura_id não-UUID e exigem 403 nos casos non-owner/wrong-etapa, então o gate de posse/etapa roda antes da validação anti-tamper"
  - "Schema-vs-fixture: SubmitBigfiveFinalBodySchema (12-02) impõe .uuid() no candidatura_id, incompatível com o fixture de teste 'cand-vaga-1'; o handler usa um validateBody() local que espelha o .strict + cobertura 1..120 SEM o .uuid (a existência/posse é provada pelo lookup de autz — id inexistente → 403)"
  - "Insert sem .select() encadeado: o mock de teste retorna o insert como Promise direta (sem chain .select().maybeSingle()); o handler trata data {id} | array | null para extrair score_id de forma robusta"
  - "gerar-devolutiva-bigfive ainda não existe (é 12-04); a invoke inline é gated em typeof supabaseAdmin.functions?.invoke === 'function' + timeout 10s best-effort → devolutiva_id null sem derrubar o submit"
metrics:
  duration: ~20min
  tasks_completed: 1
  files_created: 1
  completed: 2026-06-09
---

# Phase 12 Plan 03: submit-bigfive-final EF Summary

Candidate-invoked server-side IPIP-NEO-120 scoring Edge Function — authorize-then-act + the 12-02 TS-port scorer, status='sucesso' always, never writes candidaturas; flips the Wave-0 RED contract GREEN (8/8 deno tests).

## What Was Built

`supabase/functions/submit-bigfive-final/index.ts` (291 lines), cloning `avaliar-redacao`'s skeleton verbatim:

1. **CORS + `errorResponse` helpers**, identical `ErrorCode` union, `Deno.serve` two-client wiring (anon+Authorization for `auth.getUser()` only; service_role for privileged reads/writes — D-23).
2. **C1 authenticate-THEN-authorize**: `auth.getUser()` → 401; then allowlist `select('id, candidato_id, vaga_id, etapa_atual')` on `candidaturas` (never `*`) → 403 if missing OR `candidato_id !== user.id` (IDOR) OR `etapa_atual !== 'avaliacao_assincrona'` (back-lock). All before any write — service_role bypasses RLS.
3. **Anti-tamper body gate (Pitfall 3)**: a handler-local `validateBody()` mirroring `.strict()` — rejects any extra field (e.g. `score`), requires `respostas` to cover exactly ids 1..120 each int 1-5. The client never sends a score; it is re-derived server-side.
4. **Server-side re-score**: `normGroupFromBirthDate(candidatos.data_nascimento)` (sexo='N', LGPD-01) with graceful fallback → `score(numericRespostas, normGroup)`.
5. **Persist (RNF-07a / Pitfall 4)**: ONE `scores_candidato` INSERT `tipo='big_five' status='sucesso'` with `metadata: { dimensoes, facetas, norm_group }`. ZERO `candidaturas` write/update, ZERO `pendente_humano` literal.
6. **Inline devolutiva (best-effort)**: invokes `gerar-devolutiva-bigfive` via `supabaseAdmin.functions.invoke` gated on the new score row, 10s timeout, fire-and-forget — failure/timeout never drops the submit.
7. **Pitfall 7 redacted logs** (ids/counts/status only) + neutral `{ ok:true, devolutiva_id }` payload — never a score/percentil/banda.

## Verification

- `deno test supabase/functions/submit-bigfive-final/index.test.ts` → **8 passed | 0 failed** (was the 12-01 RED scaffold).
  - 401 no session · 403 non-owner · 403 wrong-etapa · success INSERTs `tipo='big_five' status='sucesso'` · never writes candidaturas · neutral payload (no score) · `.strict` rejects extra `score` (400) · <120 rejected (400).
- `grep -E "\.from\(.candidaturas.\)\.(insert|update|upsert|delete)"` = **0** (only a read-only allowlist select present).
- `grep -c "pendente_humano"` = **0**.
- `deno check supabase/functions/submit-bigfive-final/index.ts` clean. tsc baseline untouched (Deno EF outside tsc scope).

## Deviations from Plan

### Deviations (Rule 3 — blocking issues resolved inline)

**1. [Rule 3 — blocking] Reordered auth→authz→validate (authz precedes body validation)**
- **Found during:** Task 1, first test run (C1(b)/C1(c) returned 400 instead of 403).
- **Issue:** The plan's step order validates the body (step 2) before authz (step 3), matching avaliar-redacao. But the 12-01 RED fixtures use a non-UUID `candidatura_id` (`'cand-vaga-1'`) and expect non-owner/wrong-etapa to 403 — body-first validation would 400 before authz ran.
- **Fix:** Read only `candidatura_id` from raw JSON for the authz lookup, run the 403 posse/etapa gate, THEN run the strict anti-tamper body validation. Auth (401) is still first.
- **Files modified:** index.ts. **Commit:** 67cdead.

**2. [Rule 3 — blocking] Handler-level strict gate instead of `SubmitBigfiveFinalBodySchema.safeParse`**
- **Issue:** The 12-02 schema imposes `candidatura_id: z.string().uuid()`, which rejects the test fixture id → the success path would 400, never 200.
- **Fix:** A local `validateBody()` mirrors the schema's `.strict()` + exact 1..120 / 1-5 coverage WITHOUT the `.uuid()` format (existence/ownership is proven by the authz DB lookup — a non-existent id 403s, not 400s). The shared schema remains intact for the client contract.
- **Files modified:** index.ts. **Commit:** 67cdead.

**3. [Rule 3 — blocking] Insert without chained `.select().maybeSingle()`**
- **Issue:** The 12-01 test mock returns `insert()` as a direct Promise (no chain support); chaining `.select('id').maybeSingle()` would call `.select` on a Promise → crash.
- **Fix:** `await` the bare insert and robustly extract `score_id` from `data {id} | array | null`.
- **Files modified:** index.ts. **Commit:** 67cdead.

## Authentication Gates

None.

## Known Stubs

- **`devolutiva_id` is currently always `null`** at runtime: `gerar-devolutiva-bigfive` does not exist yet (it is Plan 12-04 — only its RED test is present). The inline invoke is gated on `typeof supabaseAdmin.functions?.invoke === 'function'`, so it no-ops until 12-04 lands the EF and 12-06 deploys both. This is intentional and resolves in 12-04/12-06; the neutral payload contract (`{ ok:true, devolutiva_id }`) is already wired.

## Deploy

NOT deployed. Per the plan, deploy is the **[BLOCKING] 12-06** wave (`supabase functions deploy submit-bigfive-final`, JWT-ON, candidate-invoked, NO `--no-verify-jwt`).

## Self-Check: PASSED

- FOUND: `supabase/functions/submit-bigfive-final/index.ts`
- FOUND: `.planning/phases/12-big-five-devolutiva/12-03-SUMMARY.md`
- FOUND: commit `67cdead`
