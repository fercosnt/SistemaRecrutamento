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
 quota — UAT #1-#5 should then go green.
 ✅ RESOLVED 2026-06-22 — PIPELINE GREEN. After credits added, two more bugs surfaced+fixed in
 _shared/ai-client.ts (never run live before): (a) zodOutputFormat/zodResponseFormat defaulted to
 no-op `(s)=>s` → EFs now inject the real helpers via deps; (b) 3 schema fields .optional() w/o
 .nullable() (OpenAI strict); (c) THE primary fix: schemas built with classic zod v3 (`._def`) but the
 SDK helpers `require("zod/v4")` (`.def`) → Anthropic zodOutputFormat crashed "Cannot read properties
 of undefined (reading 'def')" → switched analise-schemas.ts to `npm:zod@3.25.76/v4`. Also added
 fallback observability (surface the swallowed Anthropic error). Both ASB candidaturas now
 status='sucesso': Joao Jose score 75, Fernando score 70, both CV extracted (unpdf working). UAT #1
 (analysis ≤30s w/ score_match/fortes/gaps/resumo_cv) + #5 (CV extraction) PASS backend-verified.
 #2/#3/#4 now DATA-READY for the visual browser check (2 ranked candidates on the ASB vaga).]

## Tests

### 1. Trigger ≤30s end-to-end (TRIAGEM-01 SLA)
expected: Submit a real survivor candidatura (status != 'rejeitado', opcao_knockout_id IS NULL) via the candidate flow for an active vaga. Within 30s an `analise_candidato_vaga` row appears in PROD with status='sucesso', score_match 0-100, pontos_fortes, gaps, resumo_cv. If the row never appears, confirm Vault secrets `project_url` + `edge_invoke_key` exist (Phase 9 P07 — the trigger skips silently when absent).
result: PASS (backend) 2026-06-22 — after the full fix chain (see Current Test), the analysis runs
end-to-end: ASB candidaturas got status='sucesso' with score_match (70 & 75), pontos_fortes, gaps,
resumo_cv. Generated via reprocessar_analise (admin sim) — the literal insert-trigger SLA timing
wasn't separately stopwatched, but it's the identical net.http_post dispatch. (Diagnostic history of
the 4-layer PROD provisioning gap retained below.)
--- DIAGNOSED 2026-06-21 (now fixed). The AI analysis pipeline had NEVER fired in PROD.
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
result: ✅ PASS 2026-06-22 — sort fix CONFIRMED by user re-test (Joao Jose 75 now on top, DESC). UAT
(recruiter@teste.com): the 2 candidates render with GREEN score-band chips + correct numbers (75/70) +
top fortes/gaps + "✨ Sugestão da IA" badge. BUG (now fixed): sort was ASCENDING (Fernando 70 above
Joao Jose 75), not DESC. Root cause:
triagemService ordered `score_match` with `referencedTable:'analise'` (embedded resource) — PostgREST
only orders the inner array, never the parent rows, so candidaturas came back in default order. FIX
(commit pending): new `security_invoker` view `v_triagem_panel` flattens score_match to top-level →
`order('score_match' DESC)` + `.range()` pagination now correct; service reads the view (migration
20260623000001, applied via MCP; verified Joao Jose 75 → Fernando 70). Cosmetic: fortes/gaps text
truncates mid-sentence → Phase 16. RE-TEST: refresh the panel, confirm 75 on top.

### 3. Comparativo live call P95 ≤5s (TRIAGEM-03)
expected: Select 2-10 candidates → "Comparar (N)" → comparativo opens ≤5s, candidates-as-columns with ranking 1-N, Score IA band, fortes, gaps, justificativa, SugestaoIABadge at top, sticky-left first column. Selecting candidates from different vagas shows the pt-BR "vagas diferentes" copy (MIXED_VAGA fix).
result: ✅ PASS 2026-06-22 — CONFIRMED by user re-test: comparativo opens end-to-end (João José 1º /
Fernando 2º as columns; Ranking IA, Score IA green chips 75/70, Pontos fortes, Gaps, Justificativa IA,
Flags, Avançar/Rejeitar per candidate; SugestaoIABadge; coherent AI content). NON-BLOCKING caveats:
(a) generation took >5s once — TRIAGEM-03 targets P95≤5s (single-eval Sonnet; MONITOR, not a functional
fail); (b) "Voltar" button rendered unstyled/black → Phase 16. — Fix history below.
THREE bugs fixed to get here. UAT 2026-06-22: "Comparar (2)" enabled, but the
comparativo showed "Não foi possível gerar o comparativo" — CORS preflight `OPTIONS` returned 401.
TWO causes: (1) EF was `verify_jwt:true` → the Supabase gateway demanded a JWT on the preflight (browser
sends OPTIONS without Authorization) → 401 → CORS block. FIX: redeploy `--no-verify-jwt` (auth stays —
done inside the EF: getUser + role + vaga ownership, the C1/IDOR fix). (2) Even after that, the EF's own
`Deno.serve` wrapper returned 401 on a missing Authorization header BEFORE its OPTIONS check → still
preflight 401. FIX: added an `OPTIONS` short-circuit at the top of the wrapper. Verified: OPTIONS now
200 (curl). (3) AUTHORIZATION 403: the EF read role from `getUser().app_metadata?.role` — always null
(getUser reflects DB raw_app_meta_data; the custom_access_token_hook injects role only into the signed
JWT) → 403 for EVERY RH user (authz never actually worked; CORS hid it). FIX: derive role from
`usuarios_rh` via service_role (recrutador→rh, administrador→administrador) — see
[[reference_ef_authenticate_vs_authorize]]. Swept all EFs — only comparativo had it. ALSO: ASB vaga had
`created_by=NULL` → set owner = recruiter@teste.com so the rh ownership check passes. deno 7/7.
MIXED_VAGA pt-BR copy already in code (fc922cd).

### 4. PDF export quality (TRIAGEM-04)
expected: "Exportar PDF" downloads a landscape `comparativo-candidatos.pdf` with attribute rows + candidate columns, **real candidate names** in the header (W1 fix), selectable text (not raster).
result: ISSUE → FIX APPLIED (re-test pending). UAT 2026-06-22: PDF downloads landscape, real name in
header ("Joao Jose"), selectable text (good) — BUT only the 1st candidate rendered; the 2nd (Fernando)
was dropped and text clipped. Root cause: exportComparativo.ts used `styles: { cellWidth: 'wrap' }` with
no per-column widths → the 1st candidate's long text stretched its column and pushed the rest off the
landscape page width → 2nd+ column off-sheet/clipped. FIX (commit pending): compute candidate-column
width = (pageWidth − 2·margin − 32 attr col) / nCandidates, set explicit columnStyles + `overflow:
'linebreak'` (autotable wraps long text within the fixed column) + margins; smaller font when >6
candidates. tsc clean (291 baseline), vitest triagem 20/20. RE-TEST: re-export the PDF → BOTH candidates
as columns, no clipping. (W1 real-name fix confirmed working.)

### 5. CV PDF text extraction (post-research decision)
expected: For a candidatura with a real CV PDF: `resumo_cv` contains meaningful extracted text. For a corrupted/image-only PDF: `flags` includes 'cv_nao_extraido', row still status='sucesso' with respostas-only analysis.
result: PASS (backend) 2026-06-22 — both ASB analyses returned a `resumo_cv` with meaningful extracted
text (e.g. "IDIOMAS Inglês - Fluente… HABILIDADES Microsoft Office, Premiere/Clipchamp…") and `flags`
empty (no cv_nao_extraido) → unpdf extraction works (was broken by the same `.join("npm:")` bug,
fixed via static import). Corrupted/image-only fallback path not separately exercised.

## Summary

total: 5
passed: 4
issues: 0
pending: 1
skipped: 0
blocked: 0
# 2026-06-22: #1+#5 PASS (backend), #2+#3 PASS (user re-test confirmed). #4 fix applied (PDF column
# widths) → pending user re-export. Non-blocking → Phase 16: #3 latency monitor + "Voltar" button style;
# #2 fortes/gaps truncation. After #4 re-test passes → Phase 10 = 5/5.

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
