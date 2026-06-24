# Phase 14: Entrevistas com IA Companion (Etapas 4+5) - Pattern Map

**Mapped:** 2026-06-24
**Files analyzed:** 20 (new/modified)
**Analogs found:** 19 / 20 (1 partial — CC0 cognitive item-bank seed has no in-repo content analog)

> Phase 14 is the 5th AI-EF phase. Almost nothing is greenfield at the AI/infra layer: every
> primitive (the `callAi` pipeline, the two-client authenticate-THEN-authorize EF skeleton, the
> generic `scores_candidato` sink, the SECURITY DEFINER human-override RPC, the SJT candidate
> shell, the RH review panel) is PROD-green and named below with the exact lines to copy. The
> genuinely-novel work is (a) the CC0 cognitive item-bank seed and (b) the deterministic
> language/accent flag derivation — both flagged in **No Analog Found**.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/gerar-guia-entrevista/index.ts` | edge-function (EF) | request-response (LLM, RH-invoked) | `supabase/functions/comparativo-candidatos/index.ts` | exact (RH-authorize EF) |
| `supabase/functions/avaliar-transcricao-entrevista/index.ts` | edge-function (EF) | request-response (LLM, RH-invoked, untrusted text) | `supabase/functions/avaliar-redacao-cultural/index.ts` | exact (LLM + persist + never-absent) |
| `supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.ts` | utility (server-deterministic) | transform | `supabase/functions/avaliar-redacao-cultural/_local/compute-score.ts` | role-match (deterministic derive) |
| `supabase/functions/_shared/entrevista-schemas.ts` | schema (EF body) | request-response | `supabase/functions/_shared/redacao-schemas.ts` | exact (`.strict()` anti-tamper body) |
| `supabase/functions/_shared/cognitivo-schemas.ts` | schema (EF/RPC body) | request-response | `supabase/functions/_shared/redacao-schemas.ts` + `avaliacao-schemas.ts` | exact |
| `supabase/functions/_shared/cognitivo/scoring.ts` | utility (deterministic scorer) | transform | `supabase/functions/_shared/bigfive-scoring.ts` | exact (CTT soma, no-LLM, server-only key) |
| `supabase/migrations/*_scores_entrevista_cognitivo_tables.sql` (interview guides + transcript analyses + cognitive items/responses) | migration (DDL + RLS) | CRUD | `supabase/migrations/20260611000001_scores_candidato.sql` | exact (candidate-DENY RLS idiom) |
| `supabase/migrations/*_salvar_avaliacao_entrevista_rpc.sql` (review/notes write) | migration (SECURITY DEFINER RPC) | request-response (privileged write) | `supabase/migrations/20260623100004_salvar_revisao_redacao_rpc.sql` | exact |
| `supabase/migrations/*_pontuar_cognitivo_rpc.sql` (deterministic cognitive scoring) | migration (SECURITY DEFINER RPC) | transform (server-authoritative score) | `supabase/migrations/20260611000004_pontuar_sjt_rpc.sql` | exact |
| `supabase/migrations/*_avancar_etapa_flag_guard.sql` (block on lang/accent flag) | migration (trigger/RPC guard) | event-driven (funil invariant) | `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` | role-match |
| `src/features/entrevista/components/EntrevistaWorkspace.tsx` (+ Dashboard, GuiaPanel) | component (RH desktop) | request-response | `src/features/triagem/components/RedacaoReviewPanel.tsx` | exact (RHLayout tabs host) |
| `src/features/entrevista/components/EntrevistaScorecardInline.tsx` | component (RH desktop, editable) | CRUD (override write) | `src/features/triagem/components/RedacaoOverrideForm.tsx` | exact (BARS sliders + notes + confirm) |
| `src/features/entrevista/components/TranscricaoReviewPanel.tsx` | component (RH desktop) | request-response | `src/features/triagem/components/RedacaoReviewPanel.tsx` + `ScorecardAvaliacao.tsx` | exact |
| `src/features/entrevista/components/CognitivoBandCard.tsx` | component (RH desktop) | request-response | `src/features/avaliacao/components/ScorecardAvaliacao.tsx` (BigFiveBreakdown) | exact (CONTEXTUAL badge verbatim) |
| `src/features/entrevista/services/entrevistaService.ts` | service | CRUD (allowlist reads + RPC write) | `src/features/triagem/services/revisaoRedacaoService.ts` | exact |
| `src/features/entrevista/hooks/useEntrevistaScorecard.ts` (+ useGuia, useTranscricao) | hook | request-response | `src/features/triagem/hooks/useRedacaoRevisao.ts` | exact |
| `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx` | component (candidate mobile) | request-response | `src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx` | exact (ScreenShell + soft timer) |
| `src/features/avaliacao-cognitiva/hooks/useProctoring.ts` | hook (DOM listeners) | event-driven | `SjtMultiplaEscolhaScreen.tsx` soft-timer + `useAutosaveAvaliacao.ts` | role-match |
| `src/router/routes.tsx` (add `/rh/candidato/:id/entrevista` + `/candidato/prova-cognitiva/:candidaturaId`) | route | request-response | existing `/rh/candidato/:id/redacao` + `/candidato/avaliacao/:candidaturaId/mc` blocks | exact |
| cognitive item-bank seed (CC0 items → `cognitivo_itens`) | migration (seed) + content acquisition | batch | — | **NO ANALOG** (net-new content) |

---

## Pattern Assignments

### `supabase/functions/gerar-guia-entrevista/index.ts` (EF, request-response, RH-invoked)

**Analog:** `supabase/functions/comparativo-candidatos/index.ts` (RH-authorize EF) + `avaliar-redacao-cultural/index.ts` (LLM-call shape).

**Static `npm:` imports + helper-injection (the `.join` fix — copy verbatim)** — `comparativo-candidatos/index.ts:36-50`:
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAi, loadPrompt, resolvedPromptFromLoaded, type ResolvedPrompt } from "../_shared/ai-client.ts";
import { ComparativoBodySchema, ComparativeRankingSchema } from "../_shared/analise-schemas.ts";
// SDKs ESTÁTICOS — o runtime-constructed `["npm:",pkg].join("")` escondia o pacote do bundler do deploy → ERR_MODULE_NOT_FOUND.
import Anthropic from "npm:@anthropic-ai/sdk@0.102.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";
import OpenAI from "npm:openai@6.42.0";
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod";
```
For P14 swap the schema imports to `../_shared/entrevista-schemas.ts` + the `InterviewGuideSchema` (defined `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts:190-203`).

**RH authenticate-THEN-authorize (role from `usuarios_rh`, NOT JWT claims — copy verbatim)** — `comparativo-candidatos/index.ts:114-147, 178-190`:
```typescript
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;
// role NÃO vem de getUser().app_metadata (null → silent 403). Fonte de verdade = usuarios_rh via service_role.
const { data: rhRow } = await supabaseAdmin.from("usuarios_rh").select("role")
  .eq("user_id", user.id).eq("ativo", true).is("deleted_at", null).maybeSingle();
const dbRole = (rhRow?.role as string | undefined) ?? null;
const role = dbRole === "recrutador" ? "rh" : dbRole === "administrador" ? "administrador" : dbRole;
if (role !== "rh" && role !== "administrador") return errorResponse("FORBIDDEN", "Acesso negado.", 403);
// ownership: role='rh' DEVE possuir a vaga (vagas.created_by === user.id); administrador bypassa.
if (role === "rh") {
  const { data: vagaRow } = await supabaseAdmin.from("vagas").select("created_by")
    .eq("id", body.vaga_id).maybeSingle();
  if (!vagaRow || vagaRow.created_by !== user.id) return errorResponse("FORBIDDEN", "Acesso negado.", 403);
}
```

**`callAi` + prompt resolution (copy shape)** — `avaliar-redacao-cultural/index.ts:225-273`. Resolve `loadPrompt("interview_guide", supabaseAdmin)`; the prior scorecard (read from `scores_candidato` tipo='entrevista' for the `presencial` gap branch) feeds the input block; pass injected builders (`deps.zodOutputFormat`/`deps.zodResponseFormat`).

**Two-client `Deno.serve` wiring (copy verbatim, with the OPTIONS-before-auth fix)** — `comparativo-candidatos/index.ts:308-352`. Note line 314: `if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });` MUST precede the `authHeader` 401 guard or the CORS preflight breaks the browser call.

**P14-specific (NOT in analog — add, do not copy):** server-side weak-dim coverage post-validation (Pitfall 4) in `_local/` — compute weak dims (score<3 online / score<4 presencial) from the prior scorecard, assert `questions[].competency` covers each; if uncovered, bounded re-prompt OR flag for human. Never silently pass an incomplete guide.

---

### `supabase/functions/avaliar-transcricao-entrevista/index.ts` (EF, request-response, untrusted text)

**Analog:** `supabase/functions/avaliar-redacao-cultural/index.ts` — the closest match (untrusted text → `callAi` → never-absent persist → neutral payload).

**Module doc-comment invariant + never-absent persist (copy structure)** — `avaliar-redacao-cultural/index.ts:19-23, 275-311`:
```typescript
// INVARIANTE (RNF-07a): a EF NUNCA escreve `candidaturas`. status_analise='pendente_humano'
// SEMPRE; bloqueio_avanco SÓ quando a flag dispara (apenas SEGURA o avanço — o humano decide).
// Even on failure (parsed==null / flagged / injection) persist a pendente_humano row, never a fabricated success.
```
On parse-failure/injection, persist the analysis row with `status_analise='pendente_humano'`, `bloqueio_avanco:false`, then return `{ ok: true }` (lines 285-311).

**Untrusted text through `callAi` (copy)** — `avaliar-redacao-cultural/index.ts:247-273`: `rawInput: body.transcricao` (the pasted transcript is UNTRUSTED — `callAi` does injection-detect + maskPII inside; never bypass). Use `TranscriptAnalysisSchema` (`00-shared-zod-schemas.ts:211-242`). Add a transcript length guard (`len(transcricao) >= 200` → else VALIDATION "muito curta") mirroring the redação's word-count guard (lines 214-217).

**Persist to `scores_candidato` tipo='entrevista' (NOT a bespoke table — use the generic sink).** The `tipo_score` enum already has `'entrevista'` (`20260611000001_scores_candidato.sql:39`) — NO `ALTER TYPE`. Persist BARS competency scores + citations + flags into `metadata`/`citacoes`/`red_flags` columns; store `bloqueio_avanco` semantics on a `entrevista_analises` row (or `scores_candidato.metadata`) per planner's table decision.

**Language/accent flag derivation (P14-specific — DERIVE, do not ask the LLM)** — see `_local/derive-flags.ts` below. The `TranscriptAnalysisSchema` has NO first-class language flag (Pitfall 5): it carries per-competency `bias_flags { content_dependent_only, regional_markers_ignored, disfluencies_ignored }` (`00-shared-zod-schemas.ts:230-234`). Derive: `score < 3 && bias_flags.regional_markers_ignored === false` → flag → `bloqueio_avanco = true` (SEGURA o avanço).

---

### `supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.ts` (utility, transform)

**Analog:** `supabase/functions/avaliar-redacao-cultural/_local/compute-score.ts` — a pure, deterministic, server-authoritative derivation module (NOT the LLM). Mirror its pattern: a pure function over the parsed schema returning `{ flag, blockedCompetencies[] }`, with a colocated truth-table test (`derive-flags.test.ts`). The block predicate (`score<3 && regional_markers_ignored===false`) is an interpretation of RF-24 — **confirm with the planner** (Assumptions Log A3).

---

### `supabase/functions/_shared/entrevista-schemas.ts` (schema, EF body — anti-tamper)

**Analog:** `supabase/functions/_shared/redacao-schemas.ts` (copy verbatim, swap fields).

**`.strict()` body with NO score fields (copy)** — `redacao-schemas.ts:34-45`:
```typescript
import { z } from "npm:zod@3.25.76";
export const AvaliarTranscricaoBodySchema = z.object({
  candidatura_id: z.string().min(1),
  transcricao: z.string().min(1),   // length≥200 revalidated server-side in the EF
}).strict();   // .strict() rejects any injected score/band field (RNF-07a anti-tamper)
```
Per the [[feedback_integration_contract_gap]] lesson, write a client↔EF contract test (`src/features/entrevista/__tests__/*-contract.test.ts`) proving the client body parses under this schema; drop any `as never` casts after `database.types.ts` regenerates. Body schemas pin plain `npm:zod@3.25.76` (v3); the `/v4` import is load-bearing ONLY where the SDK structured-output helpers consume the OUTPUT schema (Pitfall 3).

---

### `supabase/functions/_shared/cognitivo/scoring.ts` (utility, deterministic scorer)

**Analog:** `supabase/functions/_shared/bigfive-scoring.ts` — the canonical no-LLM, server-only scorer with the scoring key NEVER exposed to the candidate.

**Server-only key + verbatim-from-source + golden test (copy posture)** — `bigfive-scoring.ts:25-50`:
```typescript
// SCORING KEY (server-side only — NEVER exposed to the candidate)
// transcribed VERBATIM from the on-disk source (cite the PRD-cognitivo §8.2 line),
// re-scored server-side from raw answers (anti-tamper); the candidate posts only raw picks.
export const REVERSED: Set<number> = new Set<number>([ ... ]);
```
For P14: a `scoreRaciocinio(rawResponses, gabarito)` deep module — CTT soma simples + shuffle-reverse + 5-faixa banding (PRD-cognitivo §8.2). Author the golden test `cognitivo/scoring.test.ts` (10 synthetic profiles → expected band) cloning `bigfive-scoring.test.ts`.

---

### `supabase/migrations/*_pontuar_cognitivo_rpc.sql` (SECURITY DEFINER RPC, deterministic scoring)

**Analog:** `supabase/migrations/20260611000004_pontuar_sjt_rpc.sql` — deterministic server-authoritative scoring RPC, candidate never submits/receives a score.

**Authorize inside DEFINER + threshold-never-rejects (copy verbatim)** — `pontuar_sjt_rpc.sql:54-66, 112-135`:
```sql
CREATE OR REPLACE FUNCTION public.pontuar_cognitivo(p_candidatura_id uuid, p_respostas jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owns boolean; ...
BEGIN
  -- AUTHORIZE (C1): caller owns candidatura AND is in the right etapa. auth.uid() is GUC-based → survives DEFINER (Phase-6 proof).
  SELECT EXISTS (SELECT 1 FROM public.candidaturas c JOIN public.candidatos ca ON ca.id = c.candidato_id
    WHERE c.id = p_candidatura_id AND ca.user_id = auth.uid() AND c.etapa_atual = <etapa_4_5>) INTO v_owns;
  IF NOT v_owns THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
  -- ... server-side Σ from p_respostas (NEVER trust a client score) ...
  INSERT INTO public.scores_candidato (candidatura_id, tipo, subtipo, score, score_max, status, metadata)
  VALUES (p_candidatura_id, 'cognitivo', 'raciocinio_logico', v_score, v_max, v_status,
          jsonb_build_object('banda', v_banda, 'raw_responses', p_respostas, 'flags', v_flags))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id) DO UPDATE SET ...;
  RETURN jsonb_build_object('ok', true, 'registrado', true);  -- NEUTRAL — candidate never sees score/band (RNF-07a)
END; $$;
REVOKE ALL ON FUNCTION public.pontuar_cognitivo(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pontuar_cognitivo(uuid, jsonb) TO authenticated;
```
Use `tipo='cognitivo'` (live enum) + `subtipo='raciocinio_logico'` — NO `ALTER TYPE`, no PRD `raciocinio_logico` enum value (Open Q1; document the PRD-prose deviation). The cognitive `status` NEVER drives etapa (RNF-07a). **RPC vs EF:** RESEARCH recommends the RPC (no LLM, matches `pontuar_sjt`); confirm with planner (Open Q3).

---

### `supabase/migrations/*_salvar_avaliacao_entrevista_rpc.sql` (SECURITY DEFINER RPC, human override write)

**Analog:** `supabase/migrations/20260623100004_salvar_revisao_redacao_rpc.sql` — the RH human-override write template.

**Role + own-vaga guard + never-touches-candidaturas (copy verbatim)** — `salvar_revisao_redacao_rpc.sql:44-115`:
```sql
CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(
  p_candidatura_id uuid, p_scores_humanos jsonb, p_notas text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_vaga_owner uuid; v_role text; ...
BEGIN
  -- resolve the candidatura's vaga owner, then guard:
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF v_role NOT IN ('rh', 'administrador') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege'; END IF;
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege'; END IF;
  -- record notas_humanas + scores; NEVER writes candidaturas, NEVER advances the funil (RNF-07a)
  ...
END; $$;
REVOKE ALL ON FUNCTION public.salvar_avaliacao_entrevista(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_avaliacao_entrevista(...) TO authenticated;
```
NOTE the `$$` body + adjacent REVOKE/GRANT is the canonical 42601-risk migration: NO `BEGIN;...COMMIT;` wrapper; apply via Supabase MCP `apply_migration` (D-22).

---

### `supabase/migrations/*_scores_entrevista_cognitivo_tables.sql` (migration, DDL + RLS)

**Analog:** `supabase/migrations/20260611000001_scores_candidato.sql` — the candidate-DENY RLS idiom + forward-declared enum + no-`BEGIN/COMMIT` note.

**Candidate-DENY RLS (copy verbatim for every new candidate-adjacent table)** — `scores_candidato.sql:80-90`:
```sql
ALTER TABLE public.<entrevista_guias|entrevista_analises|cognitivo_itens|cognitivo_respostas> ENABLE ROW LEVEL SECURITY;
-- ONLY RH/admin may read. NO candidato/anon policy → candidato denied entirely (RLS is row-level, can't hide cols).
CREATE POLICY rh_le_<table> ON public.<table>
  FOR SELECT USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
-- (no INSERT/UPDATE policy → only SECURITY DEFINER RPC / service_role EF writes)
```
For the candidate-writable `cognitivo_respostas`, clone the **etapa-gated USING + WITH CHECK back-lock** RLS from Phase 11 `respostas_avaliacao` (back-lock surfaces as 42501 once the etapa advances — see `useAutosaveAvaliacao.ts:62-70`). Use the forward-declared enum verbatim (`scores_candidato.sql:35-49`) — `'entrevista'`/`'cognitivo'` already exist. **Namespace new indexes** to avoid collisions (Pitfall 7 — `idx_entrevista_guias_candidatura`, `idx_cognitivo_itens_secao`; grep existing `idx_*` first, incl. legacy `entrevistas_*` and Phase 13 `idx_perguntas_cargo`).

---

### `supabase/migrations/*_avancar_etapa_flag_guard.sql` (migration, funil invariant)

**Analog:** `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` — `avancar_etapa()` is a BEFORE-UPDATE trigger/RPC (transition validator + audit writer). RESEARCH Open Q2 recommends enforcing the language/accent block INSIDE `avancar_etapa` (server-authoritative invariant — UI-only blocking is bypassable). The "human-confirmed" state lives on the `entrevista_analises` row (a `revisao_confirmada_em` column); `avancar_etapa` reads it and RAISEs if a firing flag is unresolved.

---

### `src/features/entrevista/components/EntrevistaWorkspace.tsx` + Dashboard + GuiaPanel (RH desktop)

**Analog:** `src/features/triagem/components/RedacaoReviewPanel.tsx` — the RHLayout-shelled, role-gated RH workspace under `/rh/candidato/:id/*`.

**RHLayout shell + tabs + per-AI-block badge (copy structure)** — `RedacaoReviewPanel.tsx:23-44, 202-228`:
```tsx
import { RHLayout } from '@/components/RHLayout'
import { Glass } from '@/components/ui/glass'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'  // reuse VERBATIM
// ... tab buttons: min-h-[44px] rounded-lg border ... aria-pressed; the :id route param is a candidatura id
//     → resolve its vaga via getVagaIdForCandidatura (RedacaoReviewPanel.tsx:147-153).
return (<RHLayout> ... </RHLayout>)
```
Default landing tab = **Painel do candidato** (UI-SPEC §Visuals). Every AI-derived block (STAR/PEI guide header, each transcript BARS dimension) carries `<SugestaoIABadge variant="full"|"compact" />` — `RedacaoReviewPanel.tsx:60-119` shows the per-dimension `{v} / 5` + `SugestaoIABadge variant="compact"` + uppercase micro-label idiom verbatim. The transcript reads at `text-base leading-relaxed` (≈16px/1.625, never compressed — `RedacaoReviewPanel.tsx:121-141`).

---

### `src/features/entrevista/components/EntrevistaScorecardInline.tsx` (RH desktop, editable)

**Analog:** `src/features/triagem/components/RedacaoOverrideForm.tsx` — BARS sliders + mandatory notes + decision + confirm.

**BARS `Slider` rows + notes gate + `SugestaoIABadge` (copy structure)** — `RedacaoOverrideForm.tsx:196-315`:
```tsx
<Slider min={1} max={5} step={1} value={[scores[dim.key]]} onValueChange={(v) => setDim(dim.key, v[0])} disabled={saving} />
// per-dim header: <span>{dim.label}</span> <span>{scores[dim.key]} / 5</span>
// notes Textarea with the ≥N-char gate readout; "Salvar" disabled until notes + decisão; A/R AlertDialog confirm.
```
Reuse `ScorecardAvaliacao`'s neutral presentation as the base (no red/green tint on scores). Save through the new `salvar_avaliacao_entrevista` RPC via the service layer.

---

### `src/features/entrevista/components/CognitivoBandCard.tsx` (RH desktop)

**Analog:** `src/features/avaliacao/components/ScorecardAvaliacao.tsx` → `BigFiveBreakdown` (lines 245-303) — the CONTEXTUAL/não-eliminatório card.

**Reuse the "Contextual · não-eliminatório" badge VERBATIM** — `ScorecardAvaliacao.tsx:253-261`:
```tsx
<Badge className="border-white/15 bg-white/5 text-white/70 text-xs font-semibold">
  Contextual · não-eliminatório
</Badge>
<CardDescription className="text-white/70">Sinaliza … — não decide a etapa. Decisão sempre humana.</CardDescription>
```
The band (5 faixas) is descriptive ("Banda {n} de 5 — {rótulo}"), NO red/green tint. Reject-by-cognitive-alone forces the expanded-justification + `bias_audit_log` path via an AlertDialog (UI-SPEC §RH cognitive band gate). The RH-facing neutral `RevisaoHumanaMarker` pill is `ScorecardAvaliacao.tsx:48-55` (`CircleDashed`, `border-white/20 bg-white/5 text-white/80`).

---

### `src/features/entrevista/services/entrevistaService.ts` (service)

**Analog:** `src/features/triagem/services/revisaoRedacaoService.ts` — allowlist reads + RPC write + error map.

**Explicit allowlist (NEVER `select('*')`) + custom error class (copy verbatim)** — `revisaoRedacaoService.ts:23-37, 87-92, 137-153`:
```typescript
export class EntrevistaServiceError extends Error { constructor(message, public code: 'INVALID_INPUT'|'NETWORK_ERROR'|'DATABASE_ERROR'|'FORBIDDEN'|'NOT_FOUND', public details?) {...} }
export const ENTREVISTA_ALLOWLIST = 'id, candidatura_id, ...explicit columns...'  // NEVER '*' ([[reference_select_star_leaks_pii]])
const { data, error } = await supabase.from('<table>').select(ENTREVISTA_ALLOWLIST).eq(...).limit(QUEUE_LIMIT)
```
**RPC write + error-code map (copy verbatim)** — `revisaoRedacaoService.ts:231-280`: `supabase.rpc('salvar_avaliacao_entrevista', {...})`; map `42501`→FORBIDDEN, `23514`→INVALID_INPUT, `P0002`/`no_data_found`→NOT_FOUND, else→NETWORK_ERROR. RH transcript/notes/scores reads MUST use the allowlist (LGPD — the candidate's transcript box and gestor notes are PII).

---

### `src/features/entrevista/hooks/useEntrevistaScorecard.ts` (+ useGuia, useTranscricao)

**Analog:** `src/features/triagem/hooks/useRedacaoRevisao.ts` — hierarchical query keys + `useQuery(staleTime 5min, retry 2, enabled:!!id)` + a mutation that invalidates on success.

**Query-key namespace + mutation invalidation (copy verbatim)** — `useRedacaoRevisao.ts:27-67`:
```typescript
export const entrevistaKeys = { all: ['entrevista'] as const, scorecard: (id) => [...entrevistaKeys.all, 'scorecard', id] as const, ... }
const query = useQuery({ queryKey: entrevistaKeys.scorecard(id||''), queryFn: () => ..., enabled: !!id, staleTime: 5*60*1000, retry: 2 })
const salvar = useMutation({ mutationFn: ..., onSuccess: () => queryClient.invalidateQueries({ queryKey: entrevistaKeys.scorecard(id||'') }) })
```

---

### `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx` (candidate mobile)

**Analog:** `src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx` — the SJT `ScreenShell` + soft count-up timer + one item at a time + irreversible-submit AlertDialog.

**`ScreenShell` + soft timer + radio-group + submit dialog (copy verbatim)** — `SjtMultiplaEscolhaScreen.tsx:289-303` (ScreenShell), `:134-138` (soft timer), `:99-110` (radio-group `min-h-[44px]` option labels), `:252-281` (irreversible AlertDialog), `:142-161` (submit posts ONLY raw picks → `pontuarCognitivo`, never a score; 42501 → neutral "Sua etapa avançou"):
```tsx
function ScreenShell({ children }) { return (<BackgroundImage background="gradient" overlayColor="bg-black" overlayOpacity={15} className="min-h-screen py-20"><div className="container mx-auto px-4 max-w-2xl mt-8">{children}</div></BackgroundImage>) }
useEffect(() => { const id = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(id) }, [])  // soft timer, NO cutoff
```
The candidate NEVER sees a score/band/threshold (RNF-07a) — neutral "Prova registrada" post-submit. Opt-in: only mounts when `vaga.aplica_cognitivo` is true.

**P14-specific proctoring (add to the SJT pattern)** — paste-block on the answer field (`onPaste={(e) => e.preventDefault()}` + neutral `toast.info`) + tab-blur/`visibilitychange` listeners logged as context to `bias_audit_log` (NEVER auto-rejects). NO webcam/screen/biometria (CONTEXT decision).

---

### `src/features/avaliacao-cognitiva/hooks/useProctoring.ts` (hook, event-driven)

**Analog:** the SJT soft-timer `useEffect` interval (`SjtMultiplaEscolhaScreen.tsx:134-138`) + `useAutosaveAvaliacao.ts` (the listener-lifecycle + cleanup pattern, lines 132-140). Compose DOM `blur`/`visibilitychange` listeners + paste-block; log events as context. If the prova autosaves progress, reuse `useAutosaveAvaliacao` verbatim (teste-keyed, 30s, 42501 back-lock — `useAutosaveAvaliacao.ts:72-143`).

---

### `src/router/routes.tsx` (route additions)

**Analog:** the existing `/rh/candidato/:id/redacao` (RH) + `/candidato/avaliacao/:candidaturaId/mc` (candidate) route blocks.

**RH route guard (copy verbatim)** — `routes.tsx:349-356`:
```tsx
{ path: '/rh/candidato/:id/entrevista', element: (<RoleGuard role={['rh', 'administrador']}><EntrevistaWorkspace /></RoleGuard>) },
```
**Candidate route guard (copy verbatim)** — `routes.tsx:213-220`:
```tsx
{ path: '/candidato/prova-cognitiva/:candidaturaId', element: (<RoleGuard role="candidato"><ProvaCognitivaScreen /></RoleGuard>) },
```

---

## Shared Patterns

### Authentication / Authorization (EFs)
**Source:** `supabase/functions/comparativo-candidatos/index.ts:114-147, 178-190`
**Apply to:** both new EFs (`gerar-guia-entrevista`, `avaliar-transcricao-entrevista`).
Two-client (D-23): `supabaseUser` (anon + Authorization) for `auth.getUser()` ONLY; `supabaseAdmin` (service_role) for privileged reads/writes. Role from `usuarios_rh` (NOT JWT claims — silent-403 landmine). Ownership via `vagas.created_by === user.id` (admin bypasses). Candidate-owned ownership (if any candidate-invoked path) via `candidatos.user_id = auth.uid()`, NEVER `candidato_id === user.id` (`avaliar-redacao-cultural/index.ts:161-189`).

### Static `npm:` imports + helper injection (the `.join` fix)
**Source:** `avaliar-redacao-cultural/index.ts:54-60, 422-430`
**Apply to:** both new EFs. STATIC imports at module top; inject `zodOutputFormat`/`zodResponseFormat` in the `Deno.serve` wiring (without them `callAi` falls back to no-op `(s)=>s` and breaks both providers). Output schemas consuming the SDK helpers import zod as `npm:zod@3.25.76/v4` (Pitfall 3).

### RNF-07a — never auto-reject, flag only SEGURA the advance
**Source:** `avaliar-redacao-cultural/index.ts:19-23, 361-362`; `pontuar_sjt_rpc.sql:112-135`; `salvar_revisao_redacao_rpc.sql:19-22`
**Apply to:** both EFs, both RPCs, the `avancar_etapa` guard, all RH scorecard components, the candidate prova.
No scoring path writes `candidaturas`. `status='pendente_humano'` is the only output; a flag holds (not decides) the advance; the human always confirms. The candidate never receives a score/band/threshold (neutral `{ ok: true }` / "registrado").

### `SugestaoIABadge` on every AI-derived block (reuse verbatim)
**Source:** `src/features/triagem/components/SugestaoIABadge.tsx` (`SUGESTAO_IA_COPY = 'Sugestão da IA — decisão é sempre humana'`, accent `#35BFAD`, `Sparkles`)
**Apply to:** STAR/PEI guide header, each transcript BARS dimension, the cognitive RH band summary. RH panel only — NEVER candidate-facing. Do NOT re-author.

### Allowlist projection — NEVER `select('*')`
**Source:** `revisaoRedacaoService.ts:80-92, 137-153`; `scores_candidato.sql:19-25`
**Apply to:** `entrevistaService.ts` and every read of transcript/notes/scores/cognitive band. RLS is row-level only — it cannot hide columns; over-projection leaks PII ([[reference_select_star_leaks_pii]], pego no Phase 8 security gate). Test the network select, not the JSX.

### Migration apply path (PL/pgSQL → PROD)
**Source:** the `-- NOTE: No BEGIN;...COMMIT; wrapper (D-22)` header in every migration analog (`pontuar_sjt_rpc.sql:31-35`, `salvar_revisao_redacao_rpc.sql:37-42`, `scores_candidato.sql:27-32`)
**Apply to:** every new migration. `$$` bodies + adjacent REVOKE/GRANT trigger SQLSTATE 42601 with `db push`; apply via Supabase MCP `apply_migration` (it writes the version row itself, bypasses 42601). Deploy EFs via CLI `supabase functions deploy <name>` (JWT-on for both RH EFs; auto-bundles `_shared`). Prompt hydrate (`interview_guide`/`transcript_analysis`): `execute_sql` UPDATE system/user_template + `is_active=true` BEFORE/without touching `deployed_at` (immutability trigger locks template/hash after `deployed_at` — Pitfall 6, Phase 13 `culture_fit_essay` precedent). Regenerate root `database.types.ts` via `npm run db:types` after migrations.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| cognitive item-bank seed → `cognitivo_itens` (CC0 ICAR items: matriz + letra-número + `superKey60` gabarito) | migration (seed) + content acquisition | batch | **No in-repo CC0 item content exists.** The legacy Raven `.webp` blobs in git history MUST NOT be used (PRD-cognitivo Q-C5 — CC0 items only). Source from Harvard Dataverse `doi:10.7910/DVN/TZJGAT` + commit `LICENSE-CC0.md` (PRD §8.5). This is the one blocking content step for ENTREV-05 — may need a human checkpoint (RESEARCH Environment Availability). |
| `_local/derive-flags.ts` language/accent predicate | utility | transform | The *module shape* clones `avaliar-redacao-cultural/_local/compute-score.ts`, but the predicate itself (`score<3 && regional_markers_ignored===false`) is a net-new interpretation of RF-24 with NO prior analog — **confirm with the user** (Assumptions Log A3) before locking. |

**Legacy `entrevistas_online`/`entrevistas_presenciais`/`avaliacoes_entrevista`/`scores_raven` tables:** present in `database.types.ts` but in NO tracked migration, with unaudited RLS, shaped for Bookings/video. **Do NOT reuse** — author new M2 tables. Recommend leaving dormant (drop is a Phase 16 cleanup candidate). Watch for index-name collisions with their legacy `idx_*`.

---

## Metadata

**Analog search scope:** `supabase/functions/` (10 EF dirs + `_shared/`), `supabase/migrations/` (scores/sjt/redacao/bias/avancar_etapa), `src/features/{triagem,avaliacao}/{components,hooks,services}`, `src/router/routes.tsx`, `docs/conhecimento/prompts/templates/`.
**Files scanned:** ~22 read in full or targeted; analog set narrowed to 12 strong PROD-green matches (early-stop at sufficient coverage).
**Pattern extraction date:** 2026-06-24
