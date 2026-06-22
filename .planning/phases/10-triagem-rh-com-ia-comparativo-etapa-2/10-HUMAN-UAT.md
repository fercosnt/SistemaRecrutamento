---
status: partial
phase: 10-triagem-rh-com-ia-comparativo-etapa-2
source: [10-VERIFICATION.md]
started: 2026-06-09
updated: 2026-06-09T00:00:00Z
---

## Current Test

[BLOCKED 2026-06-21 — Phase 9 AI infra was never provisioned in PROD. TWO layers found:
 LAYER 1 (FIXED 2026-06-21): vault.secrets was EMPTY → project_url + edge_invoke_key created
   (edge_invoke_key == service_role; project_url=https://isljnozzlvckrgjjbjwp.supabase.co). Dispatch
   now fires (pg_net response observed).
 LAYER 2 (OPEN): with dispatch working, the EF `analise-candidato-individual` (v2) returns HTTP 500
   in ~168ms with generic "Internal Server Error" (uncaught throw, NOT the EF's structured error) and
   NO analise row. Cause: the Deno.serve wrapper (index.ts:376-377) eagerly constructs
   `new Anthropic({apiKey: Deno.env.get("ANTHROPIC_API_KEY")})` + `new OpenAI(...)` BEFORE handler()
   and OUTSIDE its never-absent try/catch; both SDK constructors throw on a missing key → opaque 500,
   no falhou row. ⇒ EF secrets ANTHROPIC_API_KEY / OPENAI_API_KEY are not set on the EF.
 FIX: set the EF API-key secrets (Dashboard → Edge Functions → Secrets, or `supabase secrets set`).
 CODE-HARDENING (latent, optional): move client construction inside the try/catch (or lazy) so a
 missing key yields a falhou row + structured error instead of an opaque 500. Then re-probe.
 UPDATE 2026-06-21 14:30: EF API keys SET (deploy bumped v2→v4), but EF STILL 500s in ~218ms with
 generic "Internal Server Error" → the throw is at module-load/startup (before handler), NOT the
 missing keys. ai-client.ts has no module-level throw (consts only); suspect a _shared transitive
 import (prompt-loader/audit-logger/etc.) or the esm.sh supabase-js import at load. BLOCKED on seeing
 the real stack trace — MCP get_logs only returns request-boundary lines, not the uncaught exception.
 NEXT: get the trace from Dashboard → Edge Functions → analise-candidato-individual → Logs, OR
 harden+redeploy to surface+fix it. Vault LAYER-1 fix stands (dispatch works).
 ROOT CAUSE CONFIRMED 2026-06-21 15:17 (dashboard EF runtime log):
   `TypeError: Could not find constraint '@anthropic-ai/sdk@0.102.0' in the list of packages.
    code: ERR_MODULE_NOT_FOUND` — the runtime-constructed dynamic import
   `await import(["npm:","@anthropic-ai/sdk@0.102.0"].join(""))` (index.ts:374-375) is NOT in the
   deploy-time dependency list, so the Supabase edge runtime has no such package. The `.join("")`
   trick (added to hide `npm:` from the offline test type-check) ALSO hides it from the deploy
   bundler. SYSTEMIC: same broken pattern in comparativo-candidatos (300-301), avaliar-redacao
   (356-357), gerar-devolutiva-bigfive (416/422-423), AND unpdf in analise (90, silently → cv_nao_extraido).
   ⇒ the ENTIRE AI EF layer (Phases 10-13) has never executed in PROD.
   FIX (same everywhere): convert to STATIC `npm:` imports — proven precedent `analise-schemas.ts:24`
   `import { z } from "npm:zod@3.25.76"` deploys AND passes the type-checked deno tests. Then redeploy
   each EF (CLI bundles _shared) + re-probe. This is a multi-EF code fix + redeploys → handle as a
   dedicated remediation, not inline UAT. Vault + EF API keys are now correctly set (layers 1-2 done).
 RESOLVED 2026-06-21 (code+config) for Phase-10 EFs: analise + comparativo converted to STATIC npm
 imports (+ unpdf); added @anthropic-ai/sdk@0.102.0 / openai@6.42.0 / unpdf@0.11.0 as devDeps so the
 byonm `deno test` type-check resolves them (deno 5/5 + 7/7 green); redeployed both via CLI. Bearer
 self-auth 401 fixed via SHARED SECRET: Vault `edge_invoke_key` updated + EF `ANALISE_SECRET` set to
 the same random value (was a value mismatch — likely new-vs-legacy service_role key). PIPELINE PROVEN
 END-TO-END: probe → HTTP 200 → handler ran → analise row written (never-absent invariant works).
 LAYER 4 (OPEN, EXTERNAL — not code/config): analise row = status='falhou', erro="429 You exceeded
 your current quota" (OpenAI). Active model = claude-sonnet-4-6 (Anthropic primary, gpt-4o-mini
 fallback) → Anthropic exhausted retries (ANTHROPIC_API_KEY present since constructor didn't throw, but
 the API call fails → invalid key or no credits) AND OpenAI fallback out of quota. ⇒ ONLY remaining
 blocker is AI-PROVIDER ACCOUNT CREDITS (Anthropic is primary). Re-probe (cheap) once a provider has
 quota — UAT #1-#5 should then go green.]

## Tests

### 1. Trigger ≤30s end-to-end (TRIAGEM-01 SLA)
expected: Submit a real survivor candidatura (status != 'rejeitado', opcao_knockout_id IS NULL) via the candidate flow for an active vaga. Within 30s an `analise_candidato_vaga` row appears in PROD with status='sucesso', score_match 0-100, pontos_fortes, gaps, resumo_cv. If the row never appears, confirm Vault secrets `project_url` + `edge_invoke_key` exist (Phase 9 P07 — the trigger skips silently when absent).
result: ISSUE (blocker) — DIAGNOSED 2026-06-21. The AI analysis pipeline has NEVER fired in PROD.
Confirmed root cause: **`vault.secrets` is empty** (0 rows) — `project_url` and `edge_invoke_key`
were never created (Phase 9 P07 setup never applied to PROD Vault). Both `trg_candidatura_analise`
and `reprocessar_analise(...)` read those secrets and hit `IF project_url IS NULL OR invoke_key IS
NULL THEN RETURN` → no `net.http_post`, no EF call. PROVEN: fired `reprocessar_analise` for an ASB
survivor (admin JWT sim) 2026-06-21 → `net.http_request_queue`=0, `net._http_response`=∅, no analise
row → the dispatch never happened. pg_net is installed (v0.19.5), so pg_net is NOT the issue.
FIX: create the 2 Vault secrets — `project_url='https://isljnozzlvckrgjjbjwp.supabase.co'` and
`edge_invoke_key`=<service_role key> (the EF self-auths the Bearer against SUPABASE_SERVICE_ROLE_KEY,
analise EF index.ts:365: `expectedSecret = ANALISE_SECRET ?? SERVICE_KEY`). Secondary: verify the EF
has ANTHROPIC_API_KEY/OPENAI_API_KEY env (else the analysis will land status='falhou'). Re-probe after.

### 2. Ranked panel visual (TRIAGEM-02)
expected: `/rh/vagas/:id/candidatos` as RH shows the candidate in a ranked table with a score band chip (verde ≥70 / amarelo 40-69 / vermelho <40), top fortes/gaps, pagination 20/page, default sort score DESC (pending/falhou at bottom).
result: [pending — visual. With 0 analyses, the panel currently renders the 6 survivors in the pending/falhou state; band chips need at least one status='sucesso' analysis to verify.]

### 3. Comparativo live call P95 ≤5s (TRIAGEM-03)
expected: Select 2-10 candidates → "Comparar (N)" → comparativo opens ≤5s, candidates-as-columns with ranking 1-N, Score IA band, fortes, gaps, justificativa, SugestaoIABadge at top, sticky-left first column. Selecting candidates from different vagas shows the pt-BR "vagas diferentes" copy (MIXED_VAGA fix).
result: [pending — visual + AI. EF `comparativo-candidatos` deployed (v3, ACTIVE, verify_jwt:true → no-auth curl returns 401 as expected). MIXED_VAGA pt-BR copy fix is in code (commit fc922cd).]

### 4. PDF export quality (TRIAGEM-04)
expected: "Exportar PDF" downloads a landscape `comparativo-candidatos.pdf` with attribute rows + candidate columns, **real candidate names** in the header (W1 fix), selectable text (not raster).
result: [pending — visual; downstream of #3 (need a comparativo rendered first).]

### 5. CV PDF text extraction (post-research decision)
expected: For a candidatura with a real CV PDF: `resumo_cv` contains meaningful extracted text. For a corrupted/image-only PDF: `flags` includes 'cv_nao_extraido', row still status='sucesso' with respostas-only analysis.
result: [pending — needs a real AI run on a candidatura that has a CV PDF; verify by querying `resumo_cv` + `flags @> '{cv_nao_extraido}'` after the analysis row appears.]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Technical evidence (2026-06-09, read-only)
- EFs ACTIVE: `analise-candidato-individual` v2, `comparativo-candidatos` v3 (verify_jwt:true).
- `reprocessar_analise` exists + SECURITY DEFINER (own-vaga backfill path live).
- `analise_candidato_vaga`: 0 rows → no AI analysis exercised in PROD yet (hard blocker for #1-#5; not a defect, just unrun).
- RLS: candidato has 0 SELECT path to analise/scores (verified via pg_policies).

## Gaps

- truth: "A survivor candidatura gets an AI analysis (score_match etc.) within 30s (TRIAGEM-01 SLA)"
  status: failed
  reason: "Vault secrets project_url + edge_invoke_key were never created in PROD (vault.secrets empty). Both the insert-trigger and reprocessar_analise graceful-return → EF never called → 0 analyses ever. Phase 9 P07 setup gap. Affects UAT #1-#5 (all downstream of an analysis existing) and Phase 11 AI scoring (same dispatch)."
  severity: blocker
  test: 1
  root_cause: "vault.secrets has 0 rows in PROD; trigger/RPC dispatch is gated on those secrets being non-NULL"
  artifacts:
    - path: "supabase/migrations (Phase 9 P07 secrets setup)"
      issue: "Vault secret creation never applied to PROD"
    - path: "supabase/functions/analise-candidato-individual/index.ts:365"
      issue: "EF self-auths Bearer == SUPABASE_SERVICE_ROLE_KEY → edge_invoke_key must equal service_role key"
  missing:
    - "vault.create_secret('https://isljnozzlvckrgjjbjwp.supabase.co','project_url',...)"
    - "vault.create_secret(<service_role key>,'edge_invoke_key',...)"
    - "verify EF env ANTHROPIC_API_KEY/OPENAI_API_KEY present (else analysis → falhou)"

(verifier gap "mixed-vaga pt-BR copy" — FIXED post-verification, commit fc922cd; covered by UAT #3)
(code-review C1 IDOR/PII + W1-W4 — FIXED, commits ef5f66a/dec7fb5/43b5e08/ecb6e31/5eff82e; EFs redeployed)
