# Phase 15: Decisão Final Auditável & LGPD Art. 20 - Pattern Map

**Mapped:** 2026-06-25
**Files analyzed:** 18 new + 3 modified (routes + DB types regen + forbidden-strings grep)
**Analogs found:** 18 / 18 (every new file has a strong codebase analog — this phase is ~80% composition)

> Phase 15 is **composition, not construction**. Zero new tables (all DB objects live since Phase 6/7/11). One new EF (`consolidar-decisao-final`), three UI surfaces, one migration of RPCs. Every file below copies an existing, tested analog with concrete line references. The Comparativo + `SugestaoIABadge` + `AiCostsPage` are reused **verbatim** (not re-authored).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/consolidar-decisao-final/index.ts` | service (Edge Function) | request-response (read-only aggregate) | `supabase/functions/comparativo-candidatos/index.ts` | exact (authorize-then-act, JWT-on, two-client, NO LLM) |
| `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` | test (Deno) | request-response | `supabase/functions/comparativo-candidatos/__tests__/` | role-match (injected-deps handler test) |
| `supabase/migrations/2026MMDD000001_decisao_final_phase15.sql` | migration | CRUD (RPCs) | `supabase/migrations/20260625000001_phase14_gap_closure.sql` | exact (SECURITY DEFINER own-row RPCs + REVOKE/GRANT + 42601-safe authoring) |
| `src/features/decisao/components/DecisaoFinalPage.tsx` | component (RH page) | request-response | `src/features/admin/ai-costs/components/AiCostsPage.tsx` (RHLayout shell) + `EntrevistaWorkspace` namespace | role-match (RHLayout + Glass top-level page under `/rh/candidato/:id/*`) |
| `src/features/decisao/components/ConsolidacaoDashboard.tsx` | component | request-response | `AiCostsPage.tsx` (loading/error/empty + Table) + `ScorecardAvaliacao` neutral badges | role-match (EF-output presenter) |
| `src/features/decisao/components/RegistrarDecisaoForm.tsx` | component (form) | request-response | `ProvaCognitivaScreen.tsx` (radio-group + alert-dialog gate) | role-match (radio + textarea + irreversible alert-dialog) |
| `src/features/decisao/hooks/useConsolidacao.ts` | hook | request-response | `src/features/triagem/hooks/useComparativo.ts` | exact (query/mutation over an EF invoke) |
| `src/features/decisao/hooks/useRegistrarDecisao.ts` | hook | CRUD | `useComparativo.ts` (useMutation + toast onError) | exact (mutation over RPC write) |
| `src/features/decisao/services/decisaoService.ts` | service | request-response + CRUD | `src/features/triagem/services/triagemService.ts` | exact (allowlist read + EF/RPC invoke + custom error class) |
| `src/features/decisao/schemas/decisaoSchema.ts` | config (zod) | transform (validation) | `src/features/config-vaga/schemas/pesosAvaliacaoSchema.ts` | role-match (zod object + refine) |
| `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx` | component (candidate page) | request-response | `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx` | exact (glass-over-gradient ScreenShell + state machine) |
| `src/features/explicacao/components/SolicitarRevisaoCTA.tsx` | component | CRUD | `ProvaCognitivaScreen.tsx` (alert-dialog submit gate, lines 365-394) | role-match (alert-dialog → RPC mutation) |
| `src/features/explicacao/hooks/useExplicacao.ts` | hook | request-response | `useComparativo.ts` / cognitivo `useQuery` (ProvaCognitivaScreen:106-110) | exact (query + RPC mutation) |
| `src/features/explicacao/services/explicacaoService.ts` | service | request-response + CRUD | `src/features/avaliacao-cognitiva/services/cognitivoService.ts` | exact (own-row allowlist read + SECURITY DEFINER RPC invoke + error class) |
| `src/features/admin/bias-audit/components/BiasAuditPage.tsx` | component (admin page) | request-response | `src/features/admin/ai-costs/components/AiCostsPage.tsx` | exact (RHLayout + GlassCard + Table + states; copy structurally) |
| `src/features/admin/bias-audit/hooks/useBiasAudit.ts` | hook | request-response + CRUD | `src/features/admin/ai-costs/hooks/useAiCosts.ts` + `useComparativo.ts` (snapshot mutation) | role-match |
| `src/features/admin/bias-audit/services/biasAuditService.ts` | service | request-response + CRUD | `src/features/admin/ai-costs/services/aiCostsService.ts` | exact (allowlist read + month/period util + RPC invoke + CSV blob) |
| `src/features/admin/bias-audit/biasMath.ts` (pure fn module) | utility | transform | `src/features/avaliacao-cognitiva` scoring `bandaFromTotal` (cited in migration 20260625000001:138) | partial (pure deterministic calc, TS/SQL no-drift) |
| `src/router/routes.tsx` | route (MODIFY) | — | existing `/rh/candidato/:id/entrevista` + `/candidato/prova-cognitiva/:id` + `/admin/ai-costs` route blocks | exact (3 routes, copy the 3 existing namespaces) |
| `database.types.ts` (MODIFY — regen) | config | — | post-migration `npm run db:types` (orchestrator-owned) | n/a |
| `e2e/explicacao-flow.spec.ts` | test (Playwright) | request-response | existing candidate-flow specs in `e2e/` | role-match |

---

## Pattern Assignments

### `supabase/functions/consolidar-decisao-final/index.ts` (service / Edge Function, request-response)

**Analog:** `supabase/functions/comparativo-candidatos/index.ts` (verbatim auth skeleton; STRIP the AI/`callAi` parts — this EF makes **no LLM call**).

**Imports pattern** (`comparativo-candidatos/index.ts:36-50`) — import ONLY `createClient`; DROP every `callAi`/Anthropic/OpenAI/zod-helper import (no AI call, minimal deploy surface — RESEARCH Pitfall 8):
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// NO ai-client.ts, NO Anthropic/OpenAI, NO zodOutputFormat — this EF is deterministic.
```

**CORS + error helpers** (`comparativo-candidatos/index.ts:56-73`) — copy `corsHeaders`, `jsonResponse`, `errorResponse`, the `ErrorCode` union verbatim.

**Injectable-deps handler shape** (`comparativo-candidatos/index.ts:79-112`) — keep the `export interface Deps { supabaseAdmin; supabaseUser }` + `export async function handler(req, deps)` testability split (Deno tests inject mocks, no network). DROP `anthropic`/`openai`/zod-format from the interface.

**Authenticate → authorize (the load-bearing copy)** (`comparativo-candidatos/index.ts:114-190`) — copy EXACTLY. Role comes from `usuarios_rh`, NOT JWT claims (silent-403 landmine, [[reference_ef_authenticate_vs_authorize]]); vaga ownership via `vagas.created_by`; administrador bypasses:
```typescript
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;
const { data: rhRow } = await supabaseAdmin.from("usuarios_rh")
  .select("role").eq("user_id", user.id).eq("ativo", true).is("deleted_at", null).maybeSingle();
const dbRole = (rhRow?.role as string | undefined) ?? null;
const role = dbRole === "recrutador" ? "rh" : dbRole === "administrador" ? "administrador" : dbRole;
if (role !== "rh" && role !== "administrador") return errorResponse("FORBIDDEN", "Acesso negado.", 403);
// ownership: resolve candidatura → vaga; role='rh' must own vagas.created_by; administrador bypasses
if (role === "rh") {
  const { data: vagaRow } = await supabaseAdmin.from("vagas")
    .select("created_by").eq("id", body.vaga_id).maybeSingle();
  if (!vagaRow || vagaRow.created_by !== user.id) return errorResponse("FORBIDDEN", "Acesso negado.", 403);
}
```

**Privileged allowlist reads (aggregation sources — NEVER `select('*')`)** (`comparativo-candidatos/index.ts:194-200` is the allowlist idiom). The NEW logic maps 4 weight keys → 2 score tables (RESEARCH §Consolidation Aggregation). Two reads:
```typescript
// triagem weight ← analise_candidato_vaga.score_match (0..100 already)
const { data: analise } = await supabaseAdmin.from('analise_candidato_vaga')
  .select('candidatura_id, score_match, status').eq('candidatura_id', body.candidatura_id).maybeSingle();
// sjt/redacao/entrevista/big_five/cognitivo ← scores_candidato (allowlist, weight only status='sucesso')
const { data: scores } = await supabaseAdmin.from('scores_candidato')
  .select('id, candidatura_id, tipo, subtipo, score, score_max, status, metadata')
  .eq('candidatura_id', body.candidatura_id);
```

**Aggregation algorithm** (NEW — RESEARCH §Consolidation Aggregation steps 1-7): read `vaga.pesos_avaliacao` (4 keys, sum 100); normalize each present etapa → 0..100 (`triagem`=as-is; `work_sample_sjt`/`redacao`= `score/score_max*100`; `entrevista`= N/A unless `status='sucesso'` per Open Q1 recommendation); mark PRESENT only on `status='sucesso'`; renormalize `effective_weight[k]=weight[k]/Σ(present)`; `consolidated=Σ(norm × eff_weight)`; `big_five`+`cognitivo` = context rows (no weight); recommendation = deterministic template (NO LLM).

**Redacted log + Deno.serve wiring** (`comparativo-candidatos/index.ts:288-352`) — copy the redacted `console.log` (ids/counts only, NEVER scores/PII) + the production `Deno.serve` two-client wiring; DROP the Anthropic/OpenAI construction. Deploy JWT-on (NO `--no-verify-jwt`).

---

### `supabase/migrations/2026MMDD000001_decisao_final_phase15.sql` (migration, CRUD — the RPCs)

**Analog:** `supabase/migrations/20260625000001_phase14_gap_closure.sql` (the 14-07 gap-closure migration — both the own-row candidate-authorize RPC `pontuar_cognitivo` AND the RH-authorize own-vaga RPC `confirmar_revisao_entrevista` live here).

**File-level authoring convention** (`20260625000001:53-58`) — NO `BEGIN; ... COMMIT;` wrapper (D-22); PL/pgSQL `$$` bodies + adjacent `REVOKE`/`GRANT` are the canonical 42601 shape → applied LIVE by the orchestrator via Supabase MCP `apply_migration` AFTER the executor returns (AUTHORED-NOT-APPLIED header).

**RPC 1 — `registrar_decisao` (RH-authorize, terminal transition; DECISAO-03 / Pattern 2):** mirror the **role + own-vaga guard** from `confirmar_revisao_entrevista` (`20260625000001:235-245`):
```sql
v_role := (select auth.jwt() #>> '{app_metadata,role}');
IF v_role NOT IN ('rh', 'administrador') THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;
IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;
```
Then: INSERT/UPSERT `decisao_final` with `por_usuario := auth.uid()` (the structural LGPD-02 guardrail; client INSERT is blocked by `WITH CHECK (false)` so the DEFINER RPC is the ONLY writer — see schema below). Terminal map (Pitfall 5): `aprovado`→`UPDATE candidaturas SET etapa_atual='aprovado'`; `rejeitado`→`'rejeitado'`; `em_espera`→ NO etapa change. The `candidaturas` UPDATE fires `avancar_etapa()` which writes the ONE audit row same-txn (do NOT also INSERT `historico_candidatura` — Phase-8 survivor double-write lesson). UNIQUE(candidatura_id) reconciliation: UPSERT current row, history in `historico_candidatura` (RESEARCH Pitfall 2 / Open Q2 recommendation a).

**RPC 2 + 3 — candidate own-row writes (`stamp_explicacao_acessada`, `solicitar_revisao_decisao`; DECISAO-04):** mirror the **candidate-owns-candidatura guard** from `pontuar_cognitivo` (`20260625000001:91-103`) — own-row via `candidatos.user_id = auth.uid()` (NEVER `candidato_id === user.id`); auth.uid() survives SECURITY DEFINER (GUC-based):
```sql
SELECT EXISTS (
  SELECT 1 FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.id = p_candidatura_id AND ca.user_id = auth.uid()
) INTO v_owns;
IF NOT v_owns THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
```
`solicitar_revisao_decisao` sets `decisao_final.revisao_solicitada_em = now()`; `stamp_explicacao_acessada` sets `explicacao_solicitada_em = now()`. RETURN the updated row (readback — no silent 0-row success, the `confirmar_revisao_entrevista` lesson `20260625000001:256-261`).

**RPC 4 — `gerar_bias_snapshot` (admin-authorize; LGPD-03 / Pattern 4):** role guard `= 'administrador'` only; derive age server-side `date_part('year', age(data_nascimento))` from `candidatos`; band → per-band selection-rate → 4/5 ratio vs highest-rate band; INSERT ONE `bias_audit_log(periodo, dados)` row with **banded aggregates only** (no per-candidate rows). RETURN the snapshot.

**REVOKE/GRANT + COMMENT footer per RPC** (`20260625000001:193-199, 265-269`) — `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated;` + a `COMMENT ON FUNCTION` documenting the guard + invariant (RNF-07a) verbatim in shape.

---

### `src/features/decisao/services/decisaoService.ts` (service, request-response + CRUD)

**Analog:** `src/features/triagem/services/triagemService.ts`.

**Custom error class** (`triagemService.ts:27-42`) — copy the `class DecisaoServiceError extends Error` with a `code` union (`INVALID_INPUT | NETWORK_ERROR | DATABASE_ERROR | NOT_FOUND | UNAUTHORIZED`).

**EF invoke + error mapping** (`triagemService.ts:243-275`) — copy `invokeComparativo`'s `supabase.functions.invoke(...)` + `data?.ok` error-code branching for `invokeConsolidacao('consolidar-decisao-final', { candidatura_id })`.

**RPC invoke** (`triagemService.ts:220-236`) — copy `reprocessarAnalise`'s `supabase.rpc(...)` + error-throw shape for `registrarDecisao(...)` calling the `registrar_decisao` RPC.

---

### `src/features/decisao/components/RegistrarDecisaoForm.tsx` (component / form, request-response)

**Analog:** `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx` (radio-group + irreversible alert-dialog gate).

**Radio-group block** (`ProvaCognitivaScreen.tsx:314-338`) — the 3-option `decisao` selector (Aprovar/Rejeitar/Manter em espera); apply the selected-state tints from 15-UI-SPEC §Color (rejeitado=destructive, em_espera=amber, aprovado/unselected=neutral glass).

**Irreversible alert-dialog confirm** (`ProvaCognitivaScreen.tsx:365-394`) — copy the `AlertDialog`/`AlertDialogTrigger asChild`/`AlertDialogAction onClick={handleSubmit}` gate. Use the terminal-decision copy from 15-UI-SPEC (rejeitado dialog mentions LGPD Art. 20 review). Justificativa `textarea` ≥50 chars + char counter; CTA disabled until decisao selected AND ≥50 chars (client mirror of the DB CHECK).

---

### `src/features/explicacao/services/explicacaoService.ts` (service, request-response + CRUD)

**Analog:** `src/features/avaliacao-cognitiva/services/cognitivoService.ts` (own-row allowlist read + DEFINER-RPC invoke, the closest candidate-data-layer analog).

**Own-row column allowlist constant** (`cognitivoService.ts:~58` — `COGNITIVO_ITENS_ALLOWLIST`) — define `DECISAO_EXPLICACAO_ALLOWLIST = 'decisao, justificativa, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em'`. NEVER `'*'`, NEVER join `scores_candidato` ([[reference_select_star_leaks_pii]] / RESEARCH Pitfall 1). The candidate read relies on the LIVE `candidato_le_propria_decisao` RLS policy (`20260607000003_decisao_final.sql:64-72`).

**RPC invoke with 42501 → neutral outcome** (`cognitivoService.ts:201-243` — `submitProva`) — copy the `supabase.rpc(...)` + `code === '42501' || status === 403` handling for `solicitarRevisao` / `stampExplicacao` calling the new candidate RPCs. Custom error class per `cognitivoService.ts:35-50`.

**Reachability gate (Pitfall 6):** the service read returns the decision row only when `decisao='rejeitado'`; the page shows the "Esta página não está disponível" state otherwise (15-UI-SPEC copy). NEVER expose a score/band/percentile (RNF-07a/LGPD-04).

---

### `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx` (component / candidate page, request-response)

**Analog:** `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx`.

**Glass-over-gradient ScreenShell** (`ProvaCognitivaScreen.tsx:402-416`) — copy the `ScreenShell` (`BackgroundImage gradient` + `overlayColor="bg-black" overlayOpacity={15}` + `container mx-auto px-4 max-w-2xl` + `py-20`). The explanation page is a **read-mostly** variant.

**State-machine rendering** (`ProvaCognitivaScreen.tsx:172-272`) — copy the loading / load-error (retry) / not-available / done states as `GlassPanel variant="white" blur="xl"` cards. Map: `notAvailable` → "Esta página não está disponível" (no rejection / wrong candidatura, Pitfall 6); content state → high-level result + non-clinical reason + closing + `SolicitarRevisaoCTA`. `useQuery` mount pattern (`ProvaCognitivaScreen.tsx:104-110`) stamps `explicacao_solicitada_em` on visit. `min-h-[44px]` CTAs (mobile a11y floor).

---

### `src/features/admin/bias-audit/components/BiasAuditPage.tsx` (component / admin page, request-response)

**Analog:** `src/features/admin/ai-costs/components/AiCostsPage.tsx` (copy structurally — RESEARCH §Don't Hand-Roll mandates verbatim structural copy).

**Shell + states** (`AiCostsPage.tsx:130-178`) — `RHLayout` wrapper + header + the loading (`Skeleton` in `GlassCard`) / error (retry) / empty-state branches. Route-gated `RoleGuard role="administrador"` (NOT rh — `20260607000004_bias_audit_log.sql:34-37`).

**Table** (`AiCostsPage.tsx:234-267`) — copy the `Table`/`TableHeader`/`TableBody` block; columns = Faixa etária / Selection rate / Razão 4/5 (15-UI-SPEC). NO charts library (table suffices V1). The `<0.8` flagged rows get destructive tint + the reference band gets a "referência" micro-label (15-UI-SPEC §Color). Always-visible AGE-only limitation banner (honest, 15-UI-SPEC copy). "Gerar snapshot" + "Exportar CSV" buttons (`min-h-[44px]`).

---

### `src/features/admin/bias-audit/services/biasAuditService.ts` (service, request-response + CRUD)

**Analog:** `src/features/admin/ai-costs/services/aiCostsService.ts`.

**Allowlist read constant + error class** (`aiCostsService.ts:17-42`) — copy the `BIAS_AUDIT_COLUMNS = 'id, snapshot_em, periodo, dados, criado_em'` constant + the `BiasAuditServiceError` class. Read the latest `bias_audit_log` row (`listAiCostDaily` shape, `aiCostsService.ts:56-87`).

**RPC invoke for snapshot** — copy the `triagemService.reprocessarAnalise` `supabase.rpc('gerar_bias_snapshot', ...)` shape (the AiCosts service is read-only; the snapshot write mirrors the triagem RPC idiom).

**CSV export idiom** — `AiCostsPage` is the cited template for the blob-download (15-UI-SPEC §Don't Hand-Roll); build a CSV `Blob` + `URL.createObjectURL` download from the latest snapshot's `dados.bands[]`.

---

### Reused VERBATIM (do NOT re-author — embed/import as-is)

| File | Used by | Note |
|------|---------|------|
| `src/features/triagem/components/ComparativoScreen.tsx` | `DecisaoFinalPage` | finalist side-by-side (DECISAO-02), scoped to `decisao_final` finalists |
| `src/features/triagem/hooks/useComparativo.ts` | `DecisaoFinalPage` | `comparativo.mutate({ vagaId, candidaturaIds: finalistCandidaturaIds })` (RESEARCH §Code Examples) |
| `src/features/triagem/pdf/exportComparativo.ts` | `DecisaoFinalPage` | PDF export reuse (no new PDF lib) |
| `src/features/triagem/components/SugestaoIABadge.tsx` | `ConsolidacaoDashboard` | `variant="full"` on the **recommendation block ONLY** (NOT on the consolidated score or breakdown rows) |
| `ScorecardAvaliacao` neutral badge pattern (`src/features/avaliacao/components/ScorecardAvaliacao.tsx`) | `ConsolidacaoDashboard` | `border-white/15 bg-white/5 text-white/70` per-etapa breakdown badges (no red/green) |

---

## Shared Patterns

### Edge Function authenticate → authorize (authorize-then-act)
**Source:** `supabase/functions/comparativo-candidatos/index.ts:114-190`
**Apply to:** `consolidar-decisao-final` EF
Role from `usuarios_rh` (NOT JWT claims — silent-403 landmine); `vagas.created_by` ownership for `rh`; administrador bypass; two-client (anon+Authorization for `getUser`, service_role for privileged reads). [[reference_ef_authenticate_vs_authorize]] — Phase-10 C1 critical.

### SECURITY DEFINER own-row / own-vaga RPC guard
**Source:** `supabase/migrations/20260625000001_phase14_gap_closure.sql` — candidate guard `:91-103` (own-row via `candidatos.user_id=auth.uid()`); RH guard `:235-245` (role + `vagas.created_by` ownership)
**Apply to:** all 4 new RPCs (`registrar_decisao`, `solicitar_revisao_decisao`, `stamp_explicacao_acessada`, `gerar_bias_snapshot`)
`auth.uid()`/`auth.jwt()` read the request.jwt GUC and survive SECURITY DEFINER; `SET search_path = ''`; `REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated;`; RETURN the updated row (readback, no silent no-op).

### Allowlist reads — NEVER `select('*')`
**Source:** `src/features/triagem/services/triagemService.ts:123-138` + `src/features/avaliacao/services/scoresRhService.ts:1-14` (the invariant doc) + `cognitivoService` answer-key-excluding allowlist
**Apply to:** every read in `decisaoService`, `explicacaoService`, `biasAuditService`, and the EF privileged reads
RLS is row-level only — it does NOT hide columns. The candidate read (`explicacaoService`) names `decisao, justificativa, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em` and NEVER joins `scores_candidato`. [[reference_select_star_leaks_pii]] — Phase-8 security gate.

### Terminal funnel transition via `avancar_etapa()`
**Source:** `src/features/triagem/services/triagemService.ts:341-369` (`updateCandidaturaEtapa` — UPDATE `candidaturas.etapa_atual` fires the trigger) + the enum `EtapaFunilM2` (`triagemService.ts:293-301`)
**Apply to:** the `registrar_decisao` RPC
Let the `avancar_etapa()` trigger own the ONE `historico_candidatura` audit row (do NOT manual-INSERT — Phase-8 survivor double-write). `em_espera` writes the decision row only, NO etapa change (`decisao_final_resultado` has `em_espera`; `etapa_processo` does NOT — Pitfall 5).

### Service error class + hook toast.onError
**Source:** error class `triagemService.ts:27-42`; hook `src/features/triagem/hooks/useComparativo.ts:33-44`
**Apply to:** all 3 new services + all 5 new hooks
`camelCaseService.ts` convention (CLAUDE.md): `class XServiceError extends Error` with a typed `code`; `useMutation`/`useQuery` with `onError: (e) => toast.error(...)`.

### RNF-07a / LGPD-04 guardrails (cross-cutting invariants)
**Source:** the `SugestaoIABadge` copy (`SugestaoIABadge.tsx:19`); the neutral-payload precedent (`pontuar_cognitivo` RETURN, `20260625000001:188-189`); `por_usuario NOT NULL` (`20260607000003_decisao_final.sql:42`)
**Apply to:** every Phase-15 surface
The consolidated score is an aggregate NOT a verdict; the recommendation is advisory (`SugestaoIABadge` on the recommendation block only); the candidate NEVER sees a score/band/percentile; a decision NEVER persists without a human actor; AI/score NEVER auto-rejects. Extend `forbidden-strings.grep` to the 3 new feature dirs (RESEARCH §Validation, LGPD-04).

---

## Route Wiring (MODIFY `src/router/routes.tsx`)

| New route | Copy from (existing block) | Guard |
|-----------|----------------------------|-------|
| `/rh/candidato/:id/decisao` → `DecisaoFinalPage` | `:382-388` (`/rh/candidato/:id/entrevista` → `EntrevistaWorkspace`) | `RoleGuard role={['rh', 'administrador']}` |
| `/candidato/explicacao/:id` → `ExplicacaoCandidatoPage` | `:270-275` (`/candidato/prova-cognitiva/:candidaturaId`) | `RoleGuard role="candidato"` |
| `/admin/bias-audit` → `BiasAuditPage` | `:481-488` (`/admin/ai-costs` → `AiCostsPage`) | `RoleGuard role="administrador"` |

---

## No Analog Found

No file in this phase lacks a strong analog. Two narrow pieces are genuinely NEW logic (not "no analog" — they have structural templates but the math/mapping is new):

| Logic | Has structural analog | Genuinely new part |
|-------|----------------------|--------------------|
| Consolidation weight-key→score-source normalization | EF skeleton (`comparativo-candidatos`) + allowlist reads (`scoresRhService`) | the heterogeneous-scale mapping + renormalize-over-present (RESEARCH §Consolidation Aggregation — documented in detail) |
| EEOC 4/5 age-band math (`biasMath.ts`) | the deterministic-pure-fn + TS/SQL no-drift precedent (cognitivo `bandaFromTotal`, cited `20260625000001:138`) | the selection-rate + 4/5 ratio + small-N warning (RESEARCH §EEOC 4/5 — formula cited) |

---

## Metadata

**Analog search scope:** `supabase/functions/` (comparativo-candidatos, avaliar-transcricao-entrevista), `supabase/migrations/` (20260625000001, 20260607000003, 20260607000004), `src/features/triagem/`, `src/features/admin/ai-costs/`, `src/features/avaliacao-cognitiva/`, `src/features/avaliacao/`, `src/features/config-vaga/`, `src/router/routes.tsx`, `database.types.ts`.
**Files scanned:** ~16 (read in full or targeted range)
**Pattern extraction date:** 2026-06-25
