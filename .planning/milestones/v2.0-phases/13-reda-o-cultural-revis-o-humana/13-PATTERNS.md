# Phase 13: Redação Cultural + Revisão Humana - Pattern Map

**Mapped:** 2026-06-23
**Files analyzed:** 16 (new/modified)
**Analogs found:** 16 / 16 (every file has an exact or strong in-repo analog — this phase is "Phase 11/12 again, essay flavor")

> **Planner orientation:** Phase 13 is structurally a re-run of the Phase 11 (SJT) + Phase 12 (Big Five) machinery with an essay payload and an *always*-mandatory human-review queue. Almost nothing is novel. The two genuinely new shapes are (1) the RH **human-review queue UI** (`src/features/triagem/components/`, desktop shell) and (2) a **mutating SECURITY DEFINER RPC that writes the reviewer decision** (`salvar_revisao_redacao` or similar) — and even those have close analogs (`ScorecardAvaliacao` + `reprocessar_analise`/`pontuar_sjt`).
>
> **Hard rules carried into every file (do NOT relax):**
> - **Never `select('*')`** — explicit allowlist on every read ([[reference_select_star_leaks_pii]]). The candidate has NO read policy on `redacoes_candidato` scoring columns.
> - **Server-authoritative scoring, neutral payload to candidate** (RNF-07a). The candidate never sees a score/color/threshold. `bloqueio_avanco`/`pendente_humano` never auto-rejects.
> - **New essay EF copies the PROD-green static-`npm:` import + injected helpers + zod/v4 chain** ([[reference_ef_npm_join_import_bug]]) — NOT the `.join("npm:")` dynamic import still present in `avaliar-redacao` line 356-357.
> - **EF is authenticate-THEN-authorize** (two-client D-23, C1 — [[reference_ef_authenticate_vs_authorize]]): `getUser()` on the anon client, then verify posse + etapa on the service_role client BEFORE any read/write.
> - **Migrations: no `BEGIN;…COMMIT;` wrapper** (D-22). PL/pgSQL `$$`-body migrations apply in PROD via Supabase MCP `apply_migration` (bypasses 42601).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/avaliar-redacao-cultural/index.ts` *(name TBD)* | EF (edge handler) | request-response (AI scoring) | `supabase/functions/submit-bigfive-final/index.ts` (auth shape) + `analise-candidato-individual/index.ts` (static imports + callAi) | exact (composite) |
| `supabase/functions/_shared/redacao-schemas.ts` *(or extend avaliacao-schemas.ts)* | schema (Zod, EF scope) | transform | `supabase/functions/_shared/avaliacao-schemas.ts` | exact |
| `supabase/migrations/2026XXXX_perguntas_redacao.sql` | migration (table + seed + RLS + RPC reader) | CRUD | `supabase/migrations/20260612000001_bigfive_itens.sql` (seed + answer-key-safe RPC reader) | exact |
| `supabase/migrations/2026XXXX_redacoes_candidato.sql` | migration (table + RLS) | CRUD | `supabase/migrations/20260611000001_scores_candidato.sql` (score sink, candidato-DENY) + `20260612000002_devolutivas_candidato.sql` (own-row shape) | exact (composite) |
| `supabase/migrations/2026XXXX_salvar_revisao_redacao_rpc.sql` *(human-review write)* | migration (mutating SECURITY DEFINER RPC) | request-response (RH write) | `supabase/migrations/20260610000003_reprocessar_rpc.sql` (RH role+own-vaga guard) + `20260611000004_pontuar_sjt_rpc.sql` ($$ body + REVOKE/GRANT) | role-match (composite) |
| `supabase/migrations/2026XXXX_culture_fit_essay_activate.sql` *(or MCP one-liner)* | migration (prompt activation) | CRUD | `supabase/migrations/20260609000004_prompt_library_seed.sql` (the `culture_fit_essay` row — flip `is_active=true`) | exact |
| `src/features/avaliacao/components/RedacaoEditorScreen.tsx` | component (candidate screen) | request-response | `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx` (textarea + word count + autosave + submit dialog) | exact |
| `src/features/avaliacao/components/RedacaoCounter.tsx` | component | transform | `SjtCasoAbertoScreen.tsx` `countWords` + `wordHelper` (lines 55-59, 191-195) | exact |
| `src/features/avaliacao/components/RedacaoCronometro.tsx` | component | event-driven (timer) | *no exact analog* — informative timer; closest is the `AutosaveAffordance` setInterval pattern | partial (see No Analog) |
| `src/features/avaliacao/services/redacaoService.ts` | service (candidate client) | request-response | `src/features/avaliacao/services/avaliacaoService.ts` (`avaliarRedacao` + `loadResposta` + allowlist) | exact |
| `src/features/avaliacao/schemas/redacaoSchema.ts` | schema (client Zod) | transform | `src/features/avaliacao/schemas/respostaAvaliacaoSchema.ts` (`.strict()` no-score body) | exact |
| `src/features/triagem/components/RedacaoReviewPanel.tsx` | component (RH desktop) | request-response | `src/features/avaliacao/components/ScorecardAvaliacao.tsx` (RH panel + SugestaoIABadge + neutral score) | role-match |
| `src/features/triagem/components/RedacaoSidebar.tsx` | component (RH queue list) | CRUD (list/filter/sort) | `src/features/triagem/components/TriagemTable.tsx` (queue + filter + sort) + `useTriagemPanel` | role-match |
| `src/features/triagem/components/RedacaoOverrideForm.tsx` | component (RH form) | request-response (write decision) | `RedacaoReviewPanel` sliders + `AlertDialog` from `BigFiveQuestionnaireScreen` + `radio-group` from `BigFiveQuestionnaireScreen` `LikertItem` | role-match (composite) |
| `src/features/triagem/components/RedacaoCorBadge.tsx` | component | transform | `src/features/triagem/components/SugestaoIABadge.tsx` (Badge tint convention) | role-match |
| `src/features/triagem/services/revisaoRedacaoService.ts` *(RH read+write)* | service (RH client) | CRUD | `src/features/avaliacao/services/scoresRhService.ts` (allowlist read) + `src/features/triagem/services/triagemService.ts` (`reprocessarAnalise` RPC write) | exact (composite) |
| `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts` *(REUSED as-is)* | hook | event-driven | — (reuse verbatim, `teste='redacao'`) | reuse |
| `src/router/routes.tsx` *(modified — 2 routes)* | route | — | existing `/candidato/avaliacao/:candidaturaId/caso` + `/rh/candidatos/:id` blocks | exact |

---

## Pattern Assignments

### `supabase/functions/avaliar-redacao-cultural/index.ts` (EF, request-response AI scoring)

**Primary analog:** `supabase/functions/submit-bigfive-final/index.ts` (two-client auth shape + `scores_candidato` write + neutral payload). **Secondary analog:** `supabase/functions/analise-candidato-individual/index.ts` (the PROD-green static-import + injected-helper block — copy this, NOT `avaliar-redacao`'s `.join` import).

**Static `npm:` imports + helper injection** — copy `analise-candidato-individual/index.ts` lines 38-54 and 392-404 VERBATIM (this is the [[reference_ef_npm_join_import_bug]] fix). Do NOT copy `avaliar-redacao/index.ts:356-357`:
```typescript
// TOP OF FILE — static, resolvable at deploy (analise-candidato-individual:50-54):
import Anthropic from "npm:@anthropic-ai/sdk@0.102.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";
import OpenAI from "npm:openai@6.42.0";
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod";
// ...
// IN Deno.serve (analise-candidato-individual:393-404): pass the REAL builders into callAi deps:
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
return await handler(req, {
  anthropic, openai, supabaseAdmin, supabaseUser,
  zodOutputFormat: (s, _n) => zodOutputFormat(s as never),
  zodResponseFormat: (s, n) => zodResponseFormat(s as never, n),
});
```
> ⚠️ `avaliar-redacao` (the EXISTING SJT EF) at lines 356-357 still uses `await import(["npm:", "..."].join(""))` — that is the bug. The new EF must NOT clone that line. The schema must be authored against `npm:zod@3.25.76/v4` (CONTEXT D requirement), and the injected `zodOutputFormat`/`zodResponseFormat` MUST be forwarded to `callAi` (without them callAi falls to the no-op `(s)=>s` and both providers break — see analise-candidato-individual:265-277).

**Two-client wiring (D-23) + CORS helpers** — copy `submit-bigfive-final/index.ts` lines 45-62 (CORS + `jsonResponse`/`errorResponse`) and 264-289 (`Deno.serve` two-client from env + Authorization):
```typescript
// submit-bigfive-final:280-286
const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
  global: { headers: { Authorization: authHeader } },   // anon + Authorization → auth.getUser()
});
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },  // privileged reads/writes ONLY
});
return await handler(req, { supabaseAdmin, supabaseUser /* + anthropic/openai/helpers */ });
```

**Authenticate-THEN-authorize (C1, [[reference_ef_authenticate_vs_authorize]])** — copy `avaliar-redacao/index.ts` lines 154-191 (this is the canonical essay-EF skeleton). Order is load-bearing: getUser → parse → AUTHORIZE posse+etapa → only then process:
```typescript
// avaliar-redacao:154-191 — auth then authz, allowlist (never *):
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;
// ... parse body (AvaliarRedacaoCulturalBodySchema.safeParse) ...
const { data: candRow } = await supabaseAdmin
  .from("candidaturas")
  .select("id, candidato_id, vaga_id, etapa_atual")   // allowlist, never *
  .eq("id", body.candidatura_id).maybeSingle();
if (!candRow || candRow.candidato_id !== user.id) return errorResponse("FORBIDDEN", "Acesso negado.", 403);
if (candRow.etapa_atual !== "avaliacao_assincrona")  return errorResponse("FORBIDDEN", "Acesso negado.", 403);
```

**Prompt resolve + callAi** — copy `avaliar-redacao/index.ts` lines 212-239 but with `loadPrompt("culture_fit_essay", supabaseAdmin)` (the row is seeded, `is_active=false` → must be activated; see the prompt-activation migration). `callAi` already owns injection/maskPII/retry/fallback/cost/log — never re-implement (ai-client.ts:17-31). The candidate essay text is UNTRUSTED → passes through callAi.

**Scoring → persist `redacoes_candidato` + the ALWAYS-pendente_humano invariant** — copy the threshold/persist shape from `avaliar-redacao/index.ts` lines 275-302 AND from `submit-bigfive-final/index.ts` lines 197-214 (`.select("id").single()` is MANDATORY to get the id back — see CR-03 note). **Phase-13 divergence (CONTEXT decisions):** unlike SJT (`<13 → pendente_humano, else sucesso`), EVERY essay row is `status='pendente_humano'` regardless of color; `bloqueio_avanco=true` only when vermelho (`score ≤40 OR red_flag_etico OR D1≤2` per UI-SPEC). The scoring is the 4-dim BARS + 3 caps + 3-color `EssayScoringV1` Zod (from the PRD, persisted as `metadata`/`conteudo_jsonb`):
```typescript
// shape mirrors avaliar-redacao:287-302 (insert ONE row, neutral payload out):
await supabaseAdmin.from("redacoes_candidato").insert({
  candidatura_id: body.candidatura_id,
  pergunta_id: body.pergunta_id,
  texto: body.texto,                       // essay persisted for RH reading (PRD RF-R-22)
  scoring_jsonb: parsedEssayScoringV1,      // EssayScoringV1: 4 BARS dims + caps + cor + reasoning + citations
  cor: derivedCor,                          // 'verde'|'amarelo'|'vermelho'
  bloqueio_avanco: derivedCor === 'vermelho',  // red OR caps → block auto-advance (NEVER auto-reject — RNF-07a)
  status: "pendente_humano",               // ALWAYS — human review mandatory regardless of color (D)
});
return jsonResponse({ ok: true }, 200);    // NEUTRAL — candidate never sees score/color (avaliar-redacao:314-315)
```

**Never-absent / injection guard** — copy `avaliar-redacao/index.ts` lines 241-273 (parsed==null → 'falhou' row; `flagged_for_human_review`/`prompt_injection_detected` → human-review row, never a fabricated success). Redacted logging: `console.log` only ids/counts/status, NEVER essay text/score (avaliar-redacao:304-312).

---

### `supabase/functions/_shared/redacao-schemas.ts` (schema, EF scope)

**Analog:** `supabase/functions/_shared/avaliacao-schemas.ts` (verbatim-copy convention — `docs/` is NOT deployed in the EF bundle, so schemas are copied into `_shared/`).

**Verbatim-copy rule + Zod pin** — copy the header convention (avaliacao-schemas.ts:1-23) and the body-schema-with-no-score-field pattern (lines 102-114):
```typescript
import { z } from "npm:zod@3.25.76";   // CONTEXT D requires the /v4 entrypoint for the structured-output schema: "npm:zod@3.25.76/v4"
// EF body — only identifiers + essay text, NEVER a score (Pitfall 5):
export const AvaliarRedacaoCulturalBodySchema = z.object({
  candidatura_id: z.string().min(1),
  pergunta_id: z.string().min(1),
  texto: z.string().min(1),
});
```
**`EssayScoringV1`** (the structured AI output — 4 BARS dims equal-weight V1 + 3 caps + 3-color) is authored fresh from the PRD v1.1, mirroring the `WorkSampleScoringSchema` primitives (`Score1to5`, `Citation`, `BarsLevel` — avaliacao-schemas.ts:35-94) but with the 4 Beauty Smile values as fixed dimensions and the ethical-cap/red-flag fields the PRD specifies. Author against `npm:zod@3.25.76/v4` per CONTEXT.

---

### `supabase/migrations/…_perguntas_redacao.sql` (migration: table + seed + answer-key-safe RPC reader)

**Analog:** `supabase/migrations/20260612000001_bigfive_itens.sql` (item bank + 120-row seed + `get_bigfive_itens()` SECURITY DEFINER reader). The essay prompt bank is the same shape — seed 13 rows from `fit-cultural-banco-itens-v1.md`.

**Table + RH-manage RLS + candidate-read RLS** — copy `perguntas_sjt` (`20260611000002_perguntas_sjt.sql`) lines 40-72 for the prompt-bank table (`perguntas` analog: the candidate DOES read the prompt text, so a `cand_le_perguntas_ativas` SELECT policy on `status='active'` is correct — UNLIKE the answer key). For the RH-manage policy use the live idiom (bigfive_itens.sql:59-63):
```sql
CREATE POLICY rh_gerencia_perguntas_redacao ON public.perguntas_redacao
  FOR ALL
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'))
  WITH CHECK ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
-- candidate reads active prompts (like cand_le_perguntas_ativas, perguntas_sjt:69-72):
CREATE POLICY cand_le_perguntas_redacao ON public.perguntas_redacao
  FOR SELECT USING (status = 'active');
```

**Seed block (13 rows)** — copy the `INSERT INTO … VALUES (…)` multi-row form from bigfive_itens.sql:72-192 (count-asserted in the apply-wave smokes). Texts verbatim from `fit-cultural-banco-itens-v1.md`; all must pass the LGPD-04 forbidden-strings grep guard (bigfive_itens.sql:25-27).

**No-BEGIN/COMMIT note** — copy bigfive_itens.sql:29-37 verbatim (this file has a `$$` reader body + adjacent GRANT → 42601-risk → apply via MCP).

> **Likely simpler than bigfive_itens:** the essay prompt text is candidate-visible (not an answer key), so a candidate SELECT policy is fine and a SECURITY DEFINER reader RPC may be UNNECESSARY (candidate can read `perguntas_redacao` directly via RLS, mirroring how `avaliacaoService.getAvaliacaoContext` reads `perguntas` at avaliacaoService.ts:133-137). Keep the reader-RPC pattern only if randomization/ordering needs server-side projection.

---

### `supabase/migrations/…_redacoes_candidato.sql` (migration: essay sink + RLS)

**Analog (security model):** `supabase/migrations/20260611000001_scores_candidato.sql` — the candidate has NO read policy on the scoring columns (RLS row-deny, never column-hide). **Analog (own-row / audit fields shape):** `20260612000002_devolutivas_candidato.sql`.

**Candidate-DENY scoring read + RH-only SELECT + service-role-only write** — copy scores_candidato.sql lines 80-90 (the only-RH-reads + no-INSERT/UPDATE-policy idiom):
```sql
ALTER TABLE public.redacoes_candidato ENABLE ROW LEVEL SECURITY;
-- ONLY RH/admin may read the score/color/scoring_jsonb. NO candidato policy → denied entirely
-- (RLS is row-level only; denying the row is the defense — [[reference_select_star_leaks_pii]]).
CREATE POLICY rh_le_redacoes ON public.redacoes_candidato
  FOR SELECT
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
-- (no candidate/anon INSERT/UPDATE policy → only the service_role EF + the review RPC write)
```
**Reviewer fields** — `redacoes_candidato` carries the columns the human-review queue writes: `notas_revisor text` (≥50 chars enforced by the RPC, not a DB CHECK — see the review RPC), `decisao_revisor` enum/text ∈ {aprovado, reprovado, duvida}, `revisado_por uuid`, `revisado_em timestamptz`, plus the IA fields (`scoring_jsonb`, `cor`, `bloqueio_avanco`, `status` reusing `status_score`/its 'pendente_humano' value). Audit fields (`modelo_ia`, `prompt_version`) mirror devolutivas_candidato.sql:34-35.

**No-BEGIN/COMMIT note** — table-only DDL → pushes clean (copy scores_candidato.sql:27-31 note).

---

### `supabase/migrations/…_salvar_revisao_redacao_rpc.sql` (mutating SECURITY DEFINER RPC — the human-review write)

**Analog (RH role + own-vaga guard):** `supabase/migrations/20260610000003_reprocessar_rpc.sql`. **Analog ($$ body + REVOKE/GRANT tail + own-candidatura authz):** `20260611000004_pontuar_sjt_rpc.sql`.

**RH role + own-vaga guard inside SECURITY DEFINER** — copy reprocessar_rpc.sql lines 50-59 verbatim (this is the canonical RH-writes-by-role+ownership guard; the review queue is RH-only, gestor escalation for `duvida` is a status, not a different guard):
```sql
v_role := (select auth.jwt() #>> '{app_metadata,role}');
IF v_role NOT IN ('rh', 'administrador') THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;
IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;
```

**Body validation + UPDATE shape + REVOKE/GRANT tail** — copy pontuar_sjt_rpc.sql structure (lines 37-139): `CREATE OR REPLACE FUNCTION … SECURITY DEFINER SET search_path = ''` + the `RAISE EXCEPTION … USING errcode` validation (notas ≥50 chars, decisao in the enum, optional BARS slider override recompute) + `REVOKE ALL … FROM PUBLIC; GRANT EXECUTE … TO authenticated;`. The decision write is the RNF-07a-safe analog of `updateCandidaturaEtapa` (triagemService.ts:341-369) — `duvida` sets a "escalated to gestor" status and does NOT finalize; `aprovado`/`reprovado` are recorded but advancing the funil stays a separate human action (never auto-advance from a score).

**No-BEGIN/COMMIT note** — copy pontuar_sjt_rpc.sql:31-35 ($$-body + REVOKE/GRANT = canonical 42601-risk → MCP apply).

---

### `supabase/migrations/…_culture_fit_essay_activate.sql` (prompt activation — or MCP one-liner)

**Analog:** `supabase/migrations/20260609000004_prompt_library_seed.sql` lines 92-101 — the `culture_fit_essay` v1.0.0 row already exists with `is_active=false`. Phase 13 flips it (CONTEXT: "prompt-row `culture_fit_essay` já em `prompt_versions` is_active=false → ativar"):
```sql
UPDATE public.prompt_versions SET is_active = true
 WHERE call_type = 'culture_fit_essay' AND semver = '1.0.0';
```
Activation is manual/one-time (prompt_library_seed.sql:23-26). The real template body is hydrated from `docs/conhecimento/prompts/templates/06-culture-fit-essay.md` via `sync-prompts.ts` (git→DB) BEFORE activation — verify the body is not still the `[SEED PLACEHOLDER]`.

---

### `src/features/avaliacao/components/RedacaoEditorScreen.tsx` (candidate screen)

**Analog:** `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx` — this is a near-exact template (textarea + word count + autosave + irreversible submit dialog + neutral back-lock).

**Glass shell (mobile-first)** — copy `SjtCasoAbertoScreen.tsx` lines 272-286 (`ScreenShell` with `BackgroundImage background="gradient"` + `max-w-2xl` + `GlassPanel variant="white" blur="xl"`). Do NOT author a new shell (UI-SPEC D-27).

**Autosave wiring (reuse hook as-is, `teste='redacao'`)** — copy SjtCasoAbertoScreen.tsx lines 106-118 (stable `useCallback` upsert closure + `useAutosaveAvaliacao`):
```typescript
const TESTE = 'redacao'
const upsert = useCallback(
  (payload: Parameters<typeof upsertResposta>[2]) =>
    upsertResposta(candidaturaId as string, TESTE, payload),
  [candidaturaId],
)
const { update, flushNow, status, locked } = useAutosaveAvaliacao({
  candidaturaId: candidaturaId ?? '', teste: TESTE, upsert,
})
```

**Textarea + counter + submit dialog** — copy SjtCasoAbertoScreen.tsx lines 216-266 (Textarea with `onChange`→`update`, `onBlur`→`flushNow`; counter helper; `AlertDialog` submit). **Phase-13 copy divergence (UI-SPEC):** the submit CTA is "Enviar redação" (not "Enviar resposta"); the in-range counter is `#35BFAD` accent (not amber) — see `RedacaoCounter`; the dialog title is "Enviar redação?". The post-submit message is "Resposta registrada." (RF-R-06, no score/feedback).

**Neutral back-lock + autosave affordance** — copy SjtCasoAbertoScreen.tsx lines 61-86 (`AutosaveIndicator`) and 150-166 (the `locked` state). Reuse the `AutosaveAffordance` accent (`#35BFAD` Check) from BigFiveQuestionnaireScreen.tsx:79-103.

---

### `src/features/avaliacao/components/RedacaoCounter.tsx` (word counter, 3-band code-of-colors)

**Analog:** `SjtCasoAbertoScreen.tsx` `countWords` (lines 55-59) + `wordHelper`/band logic (lines 120-122, 191-195, 228-232). Extract into a dedicated component per UI-SPEC.

**Phase-13 divergence (UI-SPEC §Candidate word counter):** the SJT used amber for both below-min and above-max. The essay counter has THREE bands: `< 200` → `text-white/60` muted; `200-500` → `#35BFAD` accent (in-range, submit enabled); `> 500` → `text-amber-300/80`. 200ms debounce. This drives submit-disabled.
```typescript
// from SjtCasoAbertoScreen:55-59 (reuse verbatim):
function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}
```

---

### `src/features/avaliacao/services/redacaoService.ts` (candidate client)

**Analog:** `src/features/avaliacao/services/avaliacaoService.ts` (`avaliarRedacao` EF-invoke at lines 297-322, the `AvaliacaoServiceError` class at 33-48, the `upsertResposta`/`loadResposta` allowlist reads at 197-244).

**Service error class + EF invoke + LOCKED mapping** — copy avaliacaoService.ts lines 33-48 (error class) and 297-322 (`avaliarRedacao` — invoke `avaliar-redacao-cultural`, neutral ack, never a score). For the 42501/403 back-lock map copy the `bigfiveService.ts:169-197` branch (LOCKED/INVALID_INPUT/NETWORK_ERROR):
```typescript
// avaliacaoService.ts:309-321 — invoke the new essay EF, neutral ack:
const { data, error } = await supabase.functions.invoke('avaliar-redacao-cultural', { body })
if (error) throw new RedacaoServiceError('Não foi possível enviar sua redação. Tente novamente.', 'NETWORK_ERROR', error)
return (data as NeutralAck) ?? { ok: true }   // NEVER a score (RNF-07a)
```
The prompt-bank read (`perguntas_redacao`) mirrors `getAvaliacaoContext` (avaliacaoService.ts:93-156) — allowlist columns, `.eq('status','active')`, never `*`.

---

### `src/features/avaliacao/schemas/redacaoSchema.ts` (client Zod, no-score body)

**Analog:** `src/features/avaliacao/schemas/respostaAvaliacaoSchema.ts` — the `.strict()` no-score anti-tamper convention.
```typescript
// respostaAvaliacaoSchema.ts:21-26 idiom — .strict() rejects an injected `score`/`pontuacao`:
import { z } from 'zod'
export const respostaRedacaoSchema = z.object({
  candidatura_id: z.string().uuid(),
  pergunta_id: z.string().uuid(),
  texto: z.string().min(1),       // word-count gate (200-500) is UI-side; the client never posts a score
}).strict()
```

---

### `src/features/triagem/components/RedacaoReviewPanel.tsx` (RH desktop review panel)

**Analog:** `src/features/avaliacao/components/ScorecardAvaliacao.tsx` — the RH desktop panel contract (NOT the candidate glass shell), neutral score display, `SugestaoIABadge` on every AI-derived block.

**Panel + SugestaoIABadge on AI blocks** — copy ScorecardAvaliacao.tsx lines 128-220 (`CasoAbertoBreakdown` — BARS dimensions + citations + red_flags, each AI block carries `<SugestaoIABadge variant="full"/>` at line 144 / `variant="compact"` per-dimension at line 171). The 4 Beauty Smile values render like the BARS dimensions; reasoning/citations render below each.

**Loading/error/empty states** — copy ScorecardAvaliacao.tsx lines 314-340 (Skeleton / neutral error / empty copy).

**Phase-13 layout (UI-SPEC):** two-column (left 35% analysis + Salvar CTA anchor, right 65% full essay at `text-base leading-relaxed` ≈16px/1.625, the one place line-height goes 1.6+). The essay-text right panel is novel content but uses the same `Card`/`text-white` primitives. RH shell is `RHLayout` + `Glass`/`GlassButton` (see PerfilCandidatoRHPage.tsx:602-609 for the wrapper). The candidate NEVER reaches this surface (RLS + allowlist deny — ScorecardAvaliacao.tsx:9-12).

---

### `src/features/triagem/components/RedacaoSidebar.tsx` (RH queue list, filter, severity sort)

**Analog:** `src/features/triagem/components/TriagemTable.tsx` (queue list) + `src/features/triagem/hooks/useTriagemPanel.ts` (the TanStack Query list hook with filter/sort/pagination keys).

**List hook shape** — copy `useTriagemPanel.ts` lines 24-56 (hierarchical `triagemKeys` + `useQuery` staleTime 5min/retry 2/`enabled:!!vagaId`). The redação queue keys add the color filter + severity sort dimensions.

**Filter + sort** — the sort is severity DESC (vermelho → amarelo → verde); default filter = vermelho+amarelo (verde on demand). The closest existing sort-by-derived-value precedent is `listTriagemPanel`'s `order('score_match', { nullsFirst: false })` (triagemService.ts:146-154) — but redação color sort is client-side or a view-ordered column. Color chips reuse the `RedacaoCorBadge` (below).

---

### `src/features/triagem/components/RedacaoOverrideForm.tsx` (4 BARS sliders + notes + decisão radio + confirm)

**Analog (composite):** `BigFiveQuestionnaireScreen.tsx` for the `radio-group` (lines 117-144 `LikertItem`) + `AlertDialog` (lines 326-355 submit confirm); `ScorecardAvaliacao.tsx` for the per-dimension layout. The `slider` primitive is vendored (`src/components/ui/slider`, UI-SPEC Registry Safety) — no in-repo usage analog yet but it follows the same controlled-value pattern.

**Radio group (decisão)** — copy the `RadioGroup`/`RadioGroupItem`/`Label` glass-selected pattern from BigFiveQuestionnaireScreen.tsx:117-144 (selected = `bg-white/30`, glass-white not accent). Decisão options: aprovado / reprovado / duvida.

**Notes ≥50 gate + Salvar disabled** — mirror the `disabled={!allAnswered || submitting}` + counter pattern (BigFiveQuestionnaireScreen.tsx:288-293 progress count idiom). The notes counter shows `{N}/50 — mínimo 50 caracteres` (muted, Salvar disabled) per UI-SPEC.

**A/R confirm dialogs** — copy the `AlertDialog` block (BigFiveQuestionnaireScreen.tsx:326-355). UI-SPEC: A and R require confirm; D escalates inline (no destructive confirm). Reprovar uses the `#EF4444` destructive affordance.

**Sliders recompute composite/color** — local state recompute on slider change (no analog needed; pure derived state). The save write goes through `revisaoRedacaoService.salvarRevisao` (the RPC).

---

### `src/features/triagem/components/RedacaoCorBadge.tsx` (verde/amarelo/vermelho chip + rule tooltip)

**Analog:** `src/features/triagem/components/SugestaoIABadge.tsx` — the `Badge` + `cn` tint convention (lines 30-42). Phase-13 maps the 3 triage colors per UI-SPEC §RH 3-color triage:
```typescript
// SugestaoIABadge.tsx:32-39 pattern → Badge with cn tint:
// verde:    'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
// amarelo:  'bg-amber-500/15 text-amber-300 border-amber-400/30'
// vermelho: 'bg-red-500/15 text-red-300 border-red-400/30'  + top badge w/ rule tooltip
```
The vermelho top badge tooltip names the firing rule ("score ≤40" / "red flag ético" / "D1≤2"). RH-facing ONLY — never on a candidate surface.

---

### `src/features/triagem/services/revisaoRedacaoService.ts` (RH read + write)

**Analog (read, allowlist):** `src/features/avaliacao/services/scoresRhService.ts` (`SCORES_ALLOWLIST` constant + `getScores` at lines 125-154). **Analog (write via RPC):** `src/features/triagem/services/triagemService.ts` (`reprocessarAnalise` at lines 220-236).

**Allowlist read of the review queue** — copy scoresRhService.ts lines 122-154 (explicit allowlist constant, never `*`, RH/admin only):
```typescript
// scoresRhService.ts:125-126 — single auditable allowlist constant:
const REDACAO_ALLOWLIST = 'id, candidatura_id, pergunta_id, texto, scoring_jsonb, cor, bloqueio_avanco, status, notas_revisor, decisao_revisor, revisado_por, revisado_em'
const { data, error } = await supabase.from('redacoes_candidato').select(REDACAO_ALLOWLIST).eq('vaga_id', vagaId)
```

**Decision write via RPC** — copy triagemService.ts lines 220-236 (`reprocessarAnalise` RPC-call + error mapping) for `salvarRevisao(redacaoId, { decisao, notas, overrides })` → `supabase.rpc('salvar_revisao_redacao', …)`.

---

### `src/router/routes.tsx` (modified — 2 new routes)

**Analog:** the existing avaliação routes (lines 199-242) for the candidate essay screen, and the RH `/rh/candidatos/:id` block (lines 323-330) for the review queue namespace.

```typescript
// candidate essay screen — mirror the /caso route (routes.tsx:217-224):
{ path: '/candidato/redacao/:candidaturaId', element: (
    <RoleGuard role="candidato"><RedacaoEditorScreen /></RoleGuard> ) },
// RH review queue — under the role-gated RH namespace (mirror routes.tsx:323-330):
{ path: '/rh/candidato/:id/redacao', element: (
    <RoleGuard role={['rh', 'administrador']}><RedacaoReviewPanel /></RoleGuard> ) },
```
> UI-SPEC names `/candidato/redacao/:candidatura_id` and `/rh/candidato/:id/redacao`. Note the candidate essay opens FROM `AvaliacaoContainer` as one more teste card (D-27) — the container's `handleOpenTeste` (AvaliacaoContainer.tsx:306-314) needs a `redacao` branch.

---

## Shared Patterns

### Authentication / Authorization (EF)
**Source:** `supabase/functions/submit-bigfive-final/index.ts:119-158` + `avaliar-redacao/index.ts:154-191`
**Apply to:** the new essay EF
Two-client (anon `getUser` + service_role privileged), then authorize posse + `etapa_atual='avaliacao_assincrona'` BEFORE any read/write ([[reference_ef_authenticate_vs_authorize]]). service_role bypasses RLS → the in-handler check is the real control.

### Authorization (RPC)
**Source:** `supabase/migrations/20260610000003_reprocessar_rpc.sql:50-59`
**Apply to:** the `salvar_revisao_redacao` RPC
`SECURITY DEFINER SET search_path=''` + role IN ('rh','administrador') guard + role='rh' must own the vaga (`vagas.created_by = auth.uid()`). `REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated;`.

### No-`select('*')` allowlist (LGPD-02)
**Source:** `src/features/avaliacao/services/scoresRhService.ts:122-154` (RH read) + `avaliacaoService.ts:100-156` (candidate read) + EF `analise-candidato-individual/index.ts:174-192`
**Apply to:** every read in every new service + the EF. RLS is row-level only — it does NOT hide columns. The candidate has NO read policy on `redacoes_candidato` scoring columns ([[reference_select_star_leaks_pii]]).

### Server-authoritative scoring + neutral candidate payload (RNF-07a)
**Source:** `avaliar-redacao/index.ts:287-315` + `submit-bigfive-final/index.ts:197-249` + `pontuar_sjt_rpc.sql:112-134`
**Apply to:** the essay EF + the review RPC. The candidate posts only text; the score/color is derived server-side and NEVER returned. `bloqueio_avanco`/`pendente_humano` never auto-rejects — the human always decides.

### Static-import + injected helpers EF chain (deploy-safe)
**Source:** `analise-candidato-individual/index.ts:38-54, 392-404`
**Apply to:** the new essay EF. Static `npm:` imports at top + forward `zodOutputFormat`/`zodResponseFormat` into `callAi` deps. NEVER the `.join("npm:")` dynamic import ([[reference_ef_npm_join_import_bug]]). Schema authored against `npm:zod@3.25.76/v4`.

### Autosave + 42501 back-lock (reuse)
**Source:** `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts` (whole file, reuse as-is, `teste='redacao'`) + `respostas_avaliacao` RLS (`20260611000003_respostas_avaliacao.sql:58-78`)
**Apply to:** `RedacaoEditorScreen`. 30s debounce; a denied post-advance write surfaces as `locked` → neutral "Sua etapa avançou…" (never an error toast).

### SugestaoIABadge guardrail (reuse verbatim)
**Source:** `src/features/triagem/components/SugestaoIABadge.tsx` (`SUGESTAO_IA_COPY`, `#35BFAD`, `Sparkles`)
**Apply to:** every AI-derived block in `RedacaoReviewPanel` + `RedacaoOverrideForm`. Never on a candidate surface.

### Migration apply (D-22 / 42601 workaround)
**Source:** `bigfive_itens.sql:29-37`, `pontuar_sjt_rpc.sql:31-35`
**Apply to:** all 4 new migrations. No `BEGIN;…COMMIT;` wrapper. PL/pgSQL `$$`-body migrations apply in PROD via **Supabase MCP `apply_migration`** (grays the version row, bypasses 42601). Table-only DDL pushes clean via `db push --linked`.

---

## No Analog Found

| File | Role | Data Flow | Reason | Planner guidance |
|------|------|-----------|--------|------------------|
| `src/features/avaliacao/components/RedacaoCronometro.tsx` | component | event-driven (timer) | No informative-elapsed-timer component exists in the repo (SJT/Big Five never showed a timer). | Build a small `useEffect` + `setInterval` elapsed counter rendering "Tempo nesta redação: {mm:ss}" — informative only, NO countdown, NO alarm color (UI-SPEC). Pattern is trivial; no analog needed. |
| `EssayScoringV1` Zod schema (the 4-BARS + 3-caps + 3-color shape) | schema | transform | The 4 Beauty Smile values as fixed dimensions + the ethical-cap fields are new to this phase; `WorkSampleScoringSchema` is the closest *structural* analog but the dimensions/caps are PRD-specific. | Author from PRD v1.1 §6 verbatim, reusing the `Score1to5`/`Citation`/`BarsLevel` primitives from `avaliacao-schemas.ts:35-94`. Pin `npm:zod@3.25.76/v4`. |
| BARS slider override recompute (live composite/color on slider change) | component logic | transform | No existing slider usage in the repo (slider primitive is vendored but unused). | Pure derived-state recompute in `RedacaoOverrideForm` — recompute composite = mean of the 4 BARS sliders, re-derive color from the PRD thresholds, on every `onValueChange`. No analog; it is local state math. |

---

## Metadata

**Analog search scope:** `supabase/functions/` (EFs + `_shared`), `supabase/migrations/` (Phase 9-12), `src/features/avaliacao/` (components, hooks, services, schemas), `src/features/triagem/` (components, hooks, services), `src/router/routes.tsx`, `src/components/pages/PerfilCandidatoRHPage.tsx`
**Files scanned:** ~24 read in full or targeted; ~40 listed
**Pattern extraction date:** 2026-06-23
