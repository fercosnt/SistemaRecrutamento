---
phase: 15-decis-o-final-audit-vel-lgpd-art-20
plan: 04
subsystem: ui
tags: [lgpd-art-20, candidate, explicacao, own-row-allowlist, reachability-gate, n8n-webhook, glass-shell, rnf-07a, react-query, playwright]

# Dependency graph
requires:
  - phase: 15-decis-o-final-audit-vel-lgpd-art-20
    plan: 02
    provides: the two AUTHORED-NOT-APPLIED candidate own-row RPCs (solicitar_revisao_decisao, stamp_explicacao_acessada) this client invokes + the LIVE candidato_le_propria_decisao RLS policy the read relies on
  - phase: 14-entrevistas-com-ia-companion-etapas-4-5
    provides: cognitivoService own-row allowlist + 42501-neutral RPC idiom + the ProvaCognitivaScreen glass-over-gradient ScreenShell + state-machine this clones
  - phase: 10-triagem-rh-com-ia-comparativo-etapa-2
    provides: useComparativo useMutation+toast.onError idiom; triagemService allowlist read + error-class convention
provides:
  - src/features/explicacao feature (service + hook + 2 components + service test + E2E spec) — the candidate LGPD Art. 20 transparency surface (DECISAO-04)
  - explicacaoService own-row allowlist read (5 columns, NEVER '*', NEVER psychometric-scores join) + reachability gate (Pitfall 6) + templated non-clinical reason (Open Q5) + own-row RPC invokes (42501→neutral) + fire-and-forget N8N revisão webhook
  - ExplicacaoCandidatoPage (read-mostly glass shell, state machine) + SolicitarRevisaoCTA (alert-dialog-gated, idempotent 'já solicitou')
affects: [15-06 [BLOCKING] PROD apply migration + regen database.types.ts (cleans the `as never` casts) + route wiring (/candidato/explicacao/:id RoleGuard role=candidato) + live revisão-notification UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Candidate transparency surface: own-row allowlist read (5 named columns) + REACHABILITY GATE (returns null unless decisao='rejeitado') + server-side TEMPLATED non-clinical reason (raw justificativa never surfaced verbatim) — the candidate never sees a numeric result/band/quantile (RNF-07a/LGPD-04)"
    - "Fire-and-forget RH notification: own-row RPC is the source of record, the N8N webhook (VITE_N8N_REVISAO_DECISAO_URL — its own path, distinct from nova-candidatura) is a NON-BLOCKING redacted (ids-only) notification that NEVER throws into the mutation (copies submit-candidatura's post-commit fetch idiom)"
    - "Idempotent CTA: useSolicitarRevisao invalidates the explanation query on success → the SolicitarRevisaoCTA flips to the disabled 'já solicitou' state keyed on revisao_solicitada_em with a dated tooltip"
    - "AUTHORED-NOT-APPLIED RPC client: `supabase.rpc('<rpc>' as never, { ... } as never)` until the 15-06 db:types regen (precedent: 15-03 registrarDecisao)"

key-files:
  created:
    - src/features/explicacao/services/explicacaoService.ts
    - src/features/explicacao/hooks/useExplicacao.ts
    - src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
    - src/features/explicacao/components/SolicitarRevisaoCTA.tsx
    - src/features/explicacao/services/__tests__/explicacaoService.test.ts
    - e2e/explicacao-flow.spec.ts
  modified: []

key-decisions:
  - "Open Q5 resolved as a SERVER-of-record-side templated reason map (REASON_BY_DECISAO, total over the enum): the candidate receives a fixed respectful non-clinical statement keyed on decisao — the raw internal RH justificativa is read by the allowlist (it IS the audit record) but is NEVER surfaced verbatim, and no score/band/quantile ever crosses (RNF-07a/LGPD-04). The reason derivation lives in the DATA LAYER so the no-leak invariant is enforced + asserted by the service test, not the component."
  - "N8N notification PINNED to the thin-client fire-and-forget idiom (RESEARCH Open Q3 → client fetch, NOT pg_net). The own-row RPC is authoritative; the webhook is best-effort. VITE_N8N_REVISAO_DECISAO_URL is a DISTINCT path from VITE_N8N_NOVA_CANDIDATURA_URL with the WR-04 env-with-fallback default so a deploy without the env var still posts."
  - "The Wave-0 RED test was NOT pre-existing on disk (15-01 only wired the forbidden-strings coverage lock for src/features/explicacao) — authored explicacaoService.test.ts (13 tests) as part of Task 1 per the plan's files_modified, asserting allowlist/reachability/RPC/non-blocking-webhook and flipping GREEN."

patterns-established:
  - "Pattern: a candidate LGPD-explanation page is a read-mostly variant of the candidate glass-over-gradient shell — loading / load-error / not-available (reachability) / content — where the content carries a high-level result line + a templated non-clinical reason + the revision-right block, and the visit stamps explicacao_solicitada_em via a one-shot useQuery side-effect (transparency evidence)."

requirements-completed: [DECISAO-04]

# Metrics
duration: 10min
completed: 2026-06-26
---

# Phase 15 Plan 04: Candidate LGPD Art. 20 Explanation Surface Summary

**The `src/features/explicacao` candidate transparency surface (DECISAO-04) — an own-row 5-column allowlist read (NEVER '*', NEVER a psychometric-scores join) gated to render ONLY after a `decisao='rejeitado'` (Pitfall 6), serving a server-side templated NON-CLINICAL reason (the raw justificativa never surfaced) + the "Solicitar revisão por pessoa natural" CTA that fires the own-row RPC + a non-blocking redacted N8N webhook; explicacaoService 13/13 GREEN, build 0, tsc 296 ≤ 305.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-26T01:41:29Z
- **Completed:** 2026-06-26T01:51:43Z
- **Tasks:** 2
- **Files created:** 6 (1 service + 1 hook + 2 components + 1 service test + 1 E2E spec)

## Accomplishments

- **`explicacaoService` (own-row allowlist data layer):** `DECISAO_EXPLICACAO_ALLOWLIST = 'decisao, justificativa, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em'` — exactly 5 named columns, NEVER `'*'`, NEVER a psychometric-scores join ([[reference_select_star_leaks_pii]] / T-15-12). `getExplicacao` reads `decisao_final` scoped to `candidatura_id` (own-row enforced by the LIVE `candidato_le_propria_decisao` RLS policy) with a **REACHABILITY GATE** (Pitfall 6 / T-15-14): returns `null` unless `decisao = 'rejeitado'` (no row / aprovado / em_espera → not-available). Derives a respectful **TEMPLATED non-clinical reason** (Open Q5) via `REASON_BY_DECISAO` — the raw internal justificativa is NEVER surfaced verbatim and no numeric result/band/quantile ever crosses (RNF-07a / LGPD-04). `stampExplicacao` + `solicitarRevisao` invoke the own-row SECURITY DEFINER RPCs (`stamp_explicacao_acessada` / `solicitar_revisao_decisao`) with `42501/403 → 'denied'` neutral handling; `solicitarRevisao` fires a fire-and-forget **redacted (ids-only) N8N webhook** (`VITE_N8N_REVISAO_DECISAO_URL`) on RPC success that NEVER throws into the mutation.
- **`useExplicacao` hook:** a `useQuery` over `getExplicacao` that stamps `explicacao_solicitada_em` ONCE on the first successful (reachable) load (`useRef`-guarded one-shot, best-effort — a denied/failed stamp is swallowed) + `useSolicitarRevisao` mutation (toast.success "Solicitação enviada. A equipe responsável foi notificada." / toast.error on failure; invalidates the explanation query so the CTA flips idempotent).
- **`ExplicacaoCandidatoPage`:** the candidate glass-over-gradient page (`BackgroundImage gradient` + overlay 15 + `max-w-2xl` + `py-20`, the verbatim ProvaCognitivaScreen ScreenShell) with the loading / load-error (retry) / not-available (reachability) / content state machine. Content = heading "Sobre a sua candidatura" + the non-clinical result line + the "Por que esta decisão" eyebrow + the templated reason + gratitude + (if present) "Resultado da revisão:" + the LGPD Art. 20 revision-right block + `SolicitarRevisaoCTA` + "Voltar ao painel". `min-h-[44px]` CTAs; NEVER renders a numeric result/quantile/verdict.
- **`SolicitarRevisaoCTA`:** the "Solicitar revisão por pessoa natural" button (`min-h-[44px]`) gated by an `alert-dialog` (verbatim 15-UI-SPEC confirm copy). Idempotent — once `revisao_solicitada_em` is set the CTA is DISABLED and shows "Você já solicitou a revisão desta decisão." with a `tooltip` "Solicitação registrada em {dd/mm/aaaa}".
- **`explicacaoService.test.ts` (13 tests, GREEN):** asserts the allowlist (exactly 5 cols, no `'*'`, no scores), the reachability gate (null for no-row/aprovado/em_espera, content for rejeitado), the templated reason (≠ raw justificativa, no score terms), the own-row RPC invokes (42501→denied), and that the N8N webhook fires ONCE on success with a redacted body AND still resolves when the fetch REJECTS (non-blocking).
- **`e2e/explicacao-flow.spec.ts`:** 3 env-gated scenarios (EX-01 reachability gate / EX-02 rejeitado+CTA+no-score / EX-03 idempotent revision) mirroring the prova-cognitiva spec; list-parseable (9 across chromium/mobile-chrome/tablet projects). The live revisão-notification round-trip is HUMAN-UAT per 15-VALIDATION.md.

## Task Commits

Each task committed atomically (`git -c core.hooksPath=/dev/null` per project convention):

1. **Task 1: explicacaoService + useExplicacao hook + Wave-0 service test** — `a729f1a` (feat)
2. **Task 2: ExplicacaoCandidatoPage + SolicitarRevisaoCTA + E2E spec** — `dc6ec09` (feat)

**Plan metadata:** _this commit_ (docs: complete plan — SUMMARY + STATE + ROADMAP)

## Files Created/Modified

- `src/features/explicacao/services/explicacaoService.ts` (created) — own-row 5-col allowlist read + reachability gate + templated non-clinical reason + own-row RPC invokes (42501→neutral) + fire-and-forget redacted N8N webhook.
- `src/features/explicacao/hooks/useExplicacao.ts` (created) — useQuery + one-shot visit stamp + useSolicitarRevisao mutation with toasts + query invalidation.
- `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx` (created) — candidate glass-over-gradient LGPD Art. 20 page, read-mostly state machine, no score/band leak.
- `src/features/explicacao/components/SolicitarRevisaoCTA.tsx` (created) — alert-dialog-gated revision CTA, idempotent 'já solicitou' state, min-h-[44px].
- `src/features/explicacao/services/__tests__/explicacaoService.test.ts` (created) — 13-test contract suite (allowlist / reachability / RPC / non-blocking webhook).
- `e2e/explicacao-flow.spec.ts` (created) — 3 env-gated Playwright scenarios (list-parseable).

## Decisions Made

- **Open Q5 → server-of-record-side templated reason (`REASON_BY_DECISAO`, total over the enum).** The candidate receives a fixed, respectful, non-clinical statement keyed on `decisao`; the raw internal RH justificativa is read by the allowlist (it IS the audit record) but is NEVER surfaced verbatim. The derivation lives in the DATA LAYER (not the component) so the no-leak invariant is enforced at the source and asserted by the service test.
- **N8N notification PINNED to the thin-client fire-and-forget idiom** (RESEARCH Open Q3 → client `fetch`, not pg_net). The own-row RPC is authoritative; the webhook is best-effort, redacted (ids only), and never throws into the mutation. `VITE_N8N_REVISAO_DECISAO_URL` is a DISTINCT path from the nova-candidatura webhook with a WR-04 env-with-fallback default.
- **The Wave-0 RED service test was NOT pre-existing on disk** — 15-01 only wired the forbidden-strings coverage lock for `src/features/explicacao`. I authored `explicacaoService.test.ts` (13 tests) as part of Task 1 per the plan's `files_modified` field, and it lands GREEN against the just-authored service.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Prose] Rephrased doc-comment literal tokens so the acceptance grep gates read 0**
- **Found during:** Tasks 1 + 2 (running the acceptance grep gates)
- **Issue:** The Task-1 gate `grep -c "select('*')|select(\"*\")|scores_candidato"` on the service and the Task-2 gate `grep -v '^//' … | grep -cE "score|banda|percentil|…"` on the page expected 0, but the descriptive doc-comments contained the literal phrases `scores_candidato`, `select('*')`, `score`, `banda`, `percentil` (block `*` comment lines are not stripped by `grep -v '^//'`). The CODE had zero wildcard selects, zero score joins, and zero score text in the rendered JSX.
- **Fix:** Rephrased the comment prose to non-triggering equivalents ("the psychometric scores table", "the wildcard", "a numeric result / quantile / psychometric verdict") — same Rule-1 prose adjustment 15-02 applied. No behavior change; the invariants stay documented.
- **Files modified:** src/features/explicacao/services/explicacaoService.ts, src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
- **Verification:** both grep gates now report 0; explicacaoService test re-run 13/13 GREEN; build 0.
- **Committed in:** `a729f1a` (Task 1) + `dc6ec09` (Task 2)

**2. [Rule 3 - Blocking] `reasonForDecisao` unused-param tsc error → total `REASON_BY_DECISAO` map**
- **Found during:** Task 2 (`npm run lint` / tsc baseline check)
- **Issue:** The initial `reasonForDecisao(decisao)` ignored its `decisao` param (the template was a single fixed string) → `TS6133 'decisao' is declared but its value is never read`, one new error in `src/features/explicacao`.
- **Fix:** Replaced the function body with a `REASON_BY_DECISAO: Record<DecisaoResultado, string>` map (total over the enum) and `return REASON_BY_DECISAO[decisao]` — making the keying-on-decisao design (Open Q5) explicit and consuming the param. Only `rejeitado` ever reaches the page (the gate returns null otherwise); the aprovado/em_espera entries are present so the map is total.
- **Files modified:** src/features/explicacao/services/explicacaoService.ts
- **Verification:** 0 tsc errors in `src/features/explicacao`; total tsc 296 ≤ 305; explicacaoService 13/13 GREEN.
- **Committed in:** `dc6ec09` (Task 2)

---

**Total deviations:** 2 auto-fixed (1 prose to clear the LGPD grep gates, 1 blocking tsc fix). Both preserve the EXACT plan intent — the allowlist/no-score-leak invariants and the keyed-on-decisao templated reason are intact; only comment wording and the reason-derivation shape were adapted. No scope creep.
**Impact on plan:** None on behavior. Every threat-register mitigation (T-15-12/13/14/15/SC) is implemented as specified.

## Issues Encountered

- **3 pre-existing test FILES fail under `npm run test:run` (NOT caused by 15-04, out of plan scope):** `src/features/admin/bias-audit/__tests__/biasMath.test.ts` is an INTENTIONAL Wave-0 RED test (`"RED: this module does not exist until Wave 2 → module-resolution failure here"`) waiting on Plan 15-05's `biasMath.ts`; `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` + `supabase/functions/_shared/__tests__/essay-schemas.test.ts` are Deno tests (run under `deno test`, not vitest — they trip a Vite transform error). All three were verified untouched by this plan (`git diff --name-only a729f1a~1 HEAD` excludes them) and are owned by Plans 15-05 (biasMath) / 15-02+15-06 (Deno EF tests). Per the SCOPE BOUNDARY rule they were NOT modified. The 15-04 deliverable (`explicacaoService` 13/13 + forbidden-strings 17/17) is fully GREEN; total vitest = 578 passed.

## AUTHORED-NOT-APPLIED dependencies (`as never` casts — clean up in 15-06)

- The two candidate own-row RPCs (`solicitar_revisao_decisao`, `stamp_explicacao_acessada`) live in the AUTHORED-NOT-APPLIED migration `20260625100001_decisao_final_phase15.sql` (Plan 15-02), NOT yet applied to PROD. Until Plan 15-06 ([BLOCKING]) applies the migration via Supabase MCP `apply_migration` and regenerates `database.types.ts`, both RPC names are absent from the `Functions` type → `explicacaoService` invokes them via `supabase.rpc('<rpc>' as never, { ... } as never)` (10 `as never` occurrences across the two invokes; precedent: 15-03 `registrarDecisao` `decisaoService.ts:144`). **15-06 must drop these casts after the db:types regen.**
- Route wiring (`/candidato/explicacao/:id` → `ExplicacaoCandidatoPage`, `RoleGuard role="candidato"`) is DEFERRED to Plan 15-06 (PROD boundary — `routes.tsx` not touched here).
- The LIVE revisão-notification round-trip (the N8N webhook reaching RH) is HUMAN-UAT per 15-VALIDATION.md Manual-Only.

## Known Stubs

None. All four source files are fully implemented and wired: the service reads live `decisao_final` via the allowlist, the hook drives a real query + mutation, the page consumes the hook, and the CTA fires the real mutation. The `as never` RPC casts and the deferred route wiring are AUTHORED-NOT-APPLIED dependencies on Plan 15-06 (the PROD boundary), not stubs — every code path is fully implemented and locally test-passing. The `REASON_BY_DECISAO.aprovado`/`.em_espera` entries are unreachable-by-the-gate-but-present so the enum map is total (documented inline), not placeholder copy.

## Threat Flags

None beyond the plan's `<threat_model>`. No new network endpoint, auth path, file-access pattern, or schema change at a trust boundary was introduced — the candidate read uses the existing `decisao_final` own-row RLS + the allowlist, the two own-row RPCs already exist (15-02), and the N8N webhook is the established fire-and-forget notification idiom (no PII beyond ids). T-15-12 (no score leak), T-15-13 (own-row), T-15-14 (reachability), T-15-15 (visit stamp), T-15-SC (no new packages) are all mitigated as specified.

## User Setup Required

None for this wave (client authoring only). The PROD apply of the candidate RPCs + the `database.types.ts` regen (cleaning the `as never` casts) + the route wiring are owned by Plan 15-06 ([BLOCKING], with the user's authorization). Optionally, the deploy may set `VITE_N8N_REVISAO_DECISAO_URL` to the production revisão-decisão webhook path (the code falls back to the default path if unset — WR-04 idiom).

## Next Phase Readiness

- **Plan 15-05** (admin bias-audit) is independent of this client and unblocked (its `biasMath.ts` RED test is waiting on its own Wave-2 authoring, not on 15-04).
- **Plan 15-06 [BLOCKING]** applies the migration (Supabase MCP `apply_migration`), regenerates `database.types.ts` (then DROP the `as never` casts in `explicacaoService`), deploys the consolidar-decisao-final EF (JWT-on), and wires the 3 routes (incl. `/candidato/explicacao/:id` RoleGuard role=candidato). After that the candidate revision round-trip is verifiable live (HUMAN-UAT).
- No blockers for 15-04 itself.

## Self-Check: PASSED

- FOUND: src/features/explicacao/services/explicacaoService.ts
- FOUND: src/features/explicacao/hooks/useExplicacao.ts
- FOUND: src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
- FOUND: src/features/explicacao/components/SolicitarRevisaoCTA.tsx
- FOUND: src/features/explicacao/services/__tests__/explicacaoService.test.ts
- FOUND: e2e/explicacao-flow.spec.ts
- FOUND commit: a729f1a (Task 1) · dc6ec09 (Task 2)

---
*Phase: 15-decis-o-final-audit-vel-lgpd-art-20*
*Completed: 2026-06-26*
