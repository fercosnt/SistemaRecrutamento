# Phase 11: Avaliação Assíncrona — Infra + Work Sample/SJT (Etapa 3) - Pattern Map

**Mapped:** 2026-06-09
**Files analyzed:** 16 new/modified (4 migrations + 1 EF + 1 shared schema + 1 route + 1 schema-extend + 8 feature-dir files)
**Analogs found:** 16 / 16 (100% — RESEARCH already cited exact analogs; this map extracts the load-bearing excerpts)

> **Build profile:** ~90% wiring of shipped Phase 6/7/9/10 primitives. The genuinely novel surface is small: the etapa-gated RLS back-lock and the 1-5→0-25 BARS composite. Everything else is a near-clone of an in-production file. **Use call_type `work_sample_sjt` everywhere — NOT `sjt_evaluation` (orphan key, see RESEARCH Pitfall 1).**

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/…_scores_candidato.sql` | migration (table+enums+RLS) | CRUD | `20260610000001_analise_tables.sql` | exact (candidato-DENY/RH-allow RLS) |
| `supabase/migrations/…_perguntas_sjt.sql` | migration (table+RLS+seed) | CRUD / batch-seed | `20260607010001_pergunta_opcao_metadata.sql` | exact (option taxonomy + seed) |
| `supabase/migrations/…_respostas_avaliacao.sql` | migration (table+etapa-gate RLS) | CRUD (autosave) | `20260607000006_rls_policies_m2_backbone.sql` | role-match + NEW etapa-gate clause |
| `supabase/migrations/…_pontuar_sjt_rpc.sql` | migration (SECURITY DEFINER RPC) | transform (Σ peso) | `20260610000003_reprocessar_rpc.sql` + `20260607000005_avancar_etapa_trigger.sql` | exact (DEFINER guard + auth.uid GUC) |
| `supabase/functions/avaliar-redacao/index.ts` | edge function | request-response (AI) | `comparativo-candidatos/index.ts` + `analise-candidato-individual/index.ts` | exact (two-client C1 authz + callAi) |
| `supabase/functions/_shared/avaliacao-schemas.ts` | shared schema (Zod) | validation | `_shared/analise-schemas.ts` | exact (verbatim-copy rule) |
| `supabase/functions/avaliar-redacao/__tests__/index.test.ts` | test (deno) | — | `comparativo-candidatos/__tests__/index.test.ts` | exact (401/403 authz cases) |
| `src/router/routes.tsx` (modify) | route | — | existing `/candidato/*` RoleGuard entries | exact |
| `src/features/config-vaga/schemas/testesAplicaveisSchema.ts` (modify) | schema | validation | itself (extend in place) | exact |
| `src/features/avaliacao/components/AvaliacaoContainer.tsx` | component (page shell) | request-response | `src/components/pages/DashboardCandidatoPage.tsx` | exact (D-27 persona shell) |
| `src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx` | component | request-response | DashboardCandidatoPage shell + shadcn `radio-group` | role-match |
| `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx` | component | request-response | DashboardCandidatoPage shell + shadcn `textarea` | role-match |
| `src/features/avaliacao/hooks/useAvaliacaoDraft.ts` | hook | file-I/O (sessionStorage) | `src/features/cadastro/hooks/useCadastroDraft.ts` | exact |
| `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts` | hook | event-driven (debounced upsert) | useCadastroDraft (buffer) + TanStack mutation | role-match (no exact debounce analog) |
| `src/features/avaliacao/services/avaliacaoService.ts` | service | CRUD + RPC + EF invoke | `src/features/triagem/services/triagemService.ts` | exact (allowlist select) |
| `src/features/avaliacao/schemas/respostaAvaliacaoSchema.ts` | schema | validation | testesAplicaveisSchema (zod idiom) | role-match |

---

## Pattern Assignments

### `…_scores_candidato.sql` (migration, CRUD) — generic score sink, candidato-DENY RLS

**Analog:** `supabase/migrations/20260610000001_analise_tables.sql`

**RLS pattern — candidato DENY / RH-admin SELECT only** (analog lines 74–92). Copy this exact shape; candidato gets NO policy → denied; service_role (RPC/EF) writes bypass RLS:
```sql
ALTER TABLE public.scores_candidato ENABLE ROW LEVEL SECURITY;
-- ONLY RH/admin may read. NO candidato/anon policy → candidato denied entirely.
CREATE POLICY rh_le_scores ON public.scores_candidato
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
  );
-- (no INSERT/UPDATE policy → only SECURITY DEFINER RPC / service_role EF writes)
```
**Why this analog:** `analise_candidato_vaga` is the freshest score-bearing PII table and already proves the "candidato has no policy of any kind → score/flags/gaps can never leak" pattern ([[reference_select_star_leaks_pii]]). Table shape (enums `tipo_score`/`status_score`, `metadata jsonb`, idempotent UNIQUE) is in RESEARCH §Pattern 1 lines 232–272 — design generic for P12–15.

**Note for planner:** the UNIQUE idempotency key has nullable `subtipo`/`pergunta_id` → use `UNIQUE NULLS NOT DISTINCT` (PG15, verify A2) OR a coalesced expression index (RESEARCH Pitfall 7).

---

### `…_perguntas_sjt.sql` (migration, CRUD + batch-seed) — SJT item bank + weights + seed

**Analog:** `supabase/migrations/20260607010001_pergunta_opcao_metadata.sql`

**Option-weight taxonomy already exists — REUSE, do not re-author** (analog lines 39–57). The SJT scale (`fortemente_pontua=4, pontua=2, neutro=1, atencao=0`) maps onto the live `enum_tag_opcao` + `peso`:
```sql
CREATE TYPE public.enum_tag_opcao AS ENUM (
  'knockout', 'atencao', 'neutro', 'pontua', 'fortemente_pontua'
);
CREATE TABLE public.pergunta_opcao_metadata (
  pergunta_id  uuid NOT NULL REFERENCES public.perguntas_formulario(id) ON DELETE CASCADE,
  opcao_id     uuid NOT NULL,
  opcao_texto  text NOT NULL,
  tag          public.enum_tag_opcao NOT NULL DEFAULT 'neutro',
  peso         int  NOT NULL DEFAULT 0 CHECK (peso BETWEEN -999 AND 100),
  ...
  UNIQUE (pergunta_id, opcao_id)
);
```
**Critical:** this phase seeds SJT `perguntas` (new table, NOT `perguntas_formulario`) with stable `opcao_id`s and writes matching `pergunta_opcao_metadata` rows — so `pontuar_sjt` can JOIN by `opcao_id` (primary), unlike the Phase-4 candidate writer which writes answer strings (analog lines 20–23 / RESEARCH §Pattern 3 line 333).

**RH-manage RLS idiom** (analog lines 71–76 — the LIVE role is `administrador`, never the stale `admin`):
```sql
CREATE POLICY rh_gerencia_perguntas ON public.perguntas
  FOR ALL
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'))
  WITH CHECK ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
-- PLUS a candidato SELECT policy scoped to active items (candidate must read the battery).
```
**Seed source:** `docs/conhecimento/sjt/banco-sjt-<cargo>.md` (8 cargos; RESEARCH lines 589–599). `content_hash` via existing `extensions.digest(...,'sha256')`.

---

### `…_respostas_avaliacao.sql` (migration, autosave CRUD) — THE etapa-gated back-lock

**Analog:** `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql` (ownership-join idiom)

**Ownership-join SELECT idiom** (analog lines 60–70 — copy verbatim, swap table name):
```sql
CREATE POLICY cand_le_respostas_aval ON public.respostas_avaliacao
  FOR SELECT USING (
    candidatura_id IN (
      SELECT id FROM public.candidaturas
       WHERE candidato_id IN (
         SELECT id FROM public.candidatos WHERE user_id = (select auth.uid())
       )
    )
  );
```

**NEW element — the back-lock:** add `AND c.etapa_atual = 'avaliacao_assincrona'` to BOTH `USING` (UPDATE old-row) AND `WITH CHECK` (INSERT/UPDATE new-row). This is the only genuinely novel RLS in the phase (RESEARCH §Pattern 2 lines 308–327):
```sql
CREATE POLICY cand_escreve_respostas_aval ON public.respostas_avaliacao
  FOR ALL
  USING ( candidatura_id IN (
      SELECT c.id FROM public.candidaturas c
       JOIN public.candidatos ca ON ca.id = c.candidato_id
      WHERE ca.user_id = (select auth.uid())
        AND c.etapa_atual = 'avaliacao_assincrona' ) )   -- ← BACK-LOCK
  WITH CHECK ( /* identical predicate */ );
```
**Pitfall (RESEARCH Pitfall 3):** once `avancar_etapa` moves the candidate past this etapa, autosave fails RLS (42501) — the frontend MUST catch it and show the neutral "Sua etapa avançou…" state (UI-SPEC:171), not an error toast. Test BOTH: in-etapa autosave OK, post-advance denied.

---

### `…_pontuar_sjt_rpc.sql` (migration, SECURITY DEFINER transform) — deterministic MC scoring

**Analogs:** `20260610000003_reprocessar_rpc.sql` (DEFINER role/own guard) + `20260607000005_avancar_etapa_trigger.sql` (auth.uid GUC survives DEFINER)

**SECURITY DEFINER + auth.uid() ownership guard** — `auth.uid()` is GUC-based (request.jwt.claims), so it survives DEFINER even though the fn runs as owner (avancar_etapa analog lines 18–27, 58; reprocessar analog lines 50–59). Authorize inside (C1 — owns candidatura AND in-etapa) and RAISE `42501` on failure:
```sql
CREATE OR REPLACE FUNCTION public.pontuar_sjt(p_candidatura_id uuid, p_respostas jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owns boolean; ...
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()                      -- GUC-based, survives DEFINER (Phase 6 proof)
       AND c.etapa_atual = 'avaliacao_assincrona'       -- back-lock re-asserted server-side
  ) INTO v_owns;
  IF NOT v_owns THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
  -- Σ peso(opcao marcada) from pergunta_opcao_metadata; threshold <mc_min_pct OR atencao → pendente_humano
  -- INSERT scores_candidato ... ON CONFLICT DO UPDATE   (NEVER touch candidaturas.etapa_atual)
  RETURN jsonb_build_object('ok', true, 'registrado', true);  -- NEUTRAL payload (RNF-07a — no score to candidate)
END; $$;
REVOKE ALL ON FUNCTION public.pontuar_sjt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pontuar_sjt(uuid, jsonb) TO authenticated;
```
**Full Σ-peso CTE + threshold logic:** RESEARCH §Pattern 3 lines 336–411 (copy). **REVOKE-then-GRANT tail** mirrors reprocessar lines 19 / avancar_etapa line 115. **Never write `candidaturas`** — no auto-advance/reject (RNF-07a, Pitfall 4). Threshold `mc_min_pct` is per-vaga from `testes_aplicaveis.threshold` (default 60).

---

### `supabase/functions/avaliar-redacao/index.ts` (edge function, request-response AI)

**Analogs:** `comparativo-candidatos/index.ts` (two-client + C1 403) + `analise-candidato-individual/index.ts` (callAi/loadPrompt composition)

**Imports + injectable-deps skeleton** (comparativo lines 36–43, 72–98 — testable handler, real clients built in `Deno.serve`):
```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAi, loadPrompt, resolvedPromptFromLoaded, type ResolvedPrompt } from "../_shared/ai-client.ts";
import { WorkSampleScoringSchema, /* EF body schema */ } from "../_shared/avaliacao-schemas.ts";

export interface AvaliarRedacaoDeps { anthropic; openai; supabaseAdmin; supabaseUser; }
export async function handler(req: Request, deps: AvaliarRedacaoDeps): Promise<Response> { ... }
```

**Two-client authenticate-THEN-authorize (C1)** — the load-bearing security pattern (comparativo lines 104–120). For a **candidate**-invoked EF the authorize step is OWNERSHIP, not RH-role:
```ts
// 1. authenticate: anon client + Authorization → auth.getUser()  (401 if no/invalid session)
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;
// 2. AUTHORIZE (C1): service_role bypasses RLS, so the EF MUST verify ownership BEFORE touching data.
//    candidate variant: supabaseAdmin reads candidaturas; verify candidato_id maps to user.id
//    AND etapa_atual = 'avaliacao_assincrona'  → else 403 (the analog uses role∈('rh','administrador'))
```
> The analog's authorize is `if (role !== "rh" && role !== "administrador") return 403` (lines 117–120) + own-vaga cross-check (lines 151–163). The candidate clone swaps that for an own-candidatura + correct-etapa check.

**callAi + loadPrompt composition** (analise lines 219, 247–278 — `callAi` owns injection/maskPII/retry/fallback/cost/log; never re-implement):
```ts
const loaded = await loadPrompt("work_sample_sjt", supabaseAdmin);   // NOT 'sjt_evaluation' (orphan)
const resolved = resolvedPromptFromLoaded(loaded, "work_sample_sjt", "gpt-4o-mini");
const result = await callAi(
  { prompt: resolved, rawInput: scenario + candidateAnswer, schema: WorkSampleScoringSchema,
    candidato_id, vaga_id },
  { anthropic, openai, supabase: supabaseAdmin },
);
if (result.parsed == null) throw new Error(result.error_code ?? "ia_sem_resultado");   // never-absent
if (result.flagged_for_human_review === true || result.error_code === "prompt_injection_detected")
  throw new Error(result.error_code ?? "prompt_injection_detected");                    // injection → pendente_humano, not a fabricated score
```

**Allowlist read (never `select('*')`)** — analise/comparativo lines 167–170: explicit column list when reading candidatura/answer via service_role.

**Real-client tail** (analise lines 355–386): runtime `import(["npm:","@anthropic-ai/sdk@0.102.0"].join(""))` (SDKs never imported in tests).

**Post-AI work specific to this EF (document in code):** map `result.parsed.dimension_scores` (1-5 each, weighted by the pergunta's rubric) → composite 0-25; `insufficient_evidence` → `pendente_humano` (don't fabricate); threshold `<13/25 OR red_flags.length>0 → pendente_humano`; UPSERT `scores_candidato {tipo:'sjt', subtipo:'caso_aberto', citacoes, red_flags}`; NEVER touch `candidaturas.etapa_atual`; return neutral `{ok:true}` (RESEARCH §Pattern 4 lines 421–434, Pitfall 2).

**Deploy:** `supabase functions deploy avaliar-redacao` **JWT-ON** (candidate-invoked — do NOT use `--no-verify-jwt`, unlike server-internal analise/cost-alerter). [BLOCKING] human checkpoint.

---

### `supabase/functions/_shared/avaliacao-schemas.ts` (shared Zod schema)

**Analog:** `supabase/functions/_shared/analise-schemas.ts`

**Verbatim-copy rule:** `docs/` is NOT in the EF bundle — copy `WorkSampleScoringSchema` verbatim from `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts:284–316` into this file (analise-schemas documents this exact rule at lines 9–13). Full schema in RESEARCH lines 527–550. Add the EF **body** schema (input = candidatura_id + pergunta_id + answer text ONLY — **no score field**, Pitfall 5), mirroring `ComparativoBodySchema`.
> The schema's own `overall_score` is 0-100; the EF derives the 0-25 composite from per-dimension 1-5 scores (weighted) — do not use overall_score blindly (RESEARCH line 552 / Pitfall 2).

---

### `supabase/functions/avaliar-redacao/__tests__/index.test.ts` (deno test)

**Analog:** `supabase/functions/comparativo-candidatos/__tests__/index.test.ts`

Clone the C1 authz cases: 401 (no session), 403 (not owner), 403 (wrong etapa). Add mapping tests (mock `callAi` returning fixed dims → assert composite 0-25 + `<13 OR red_flag → pendente_humano`) and a never-etapa assertion (mock asserts no `candidaturas` write). Mocks are dependency-injected via `deps` — no real SDK/network (RESEARCH lines 636–653).

---

### `src/router/routes.tsx` (modify, route)

**Analog:** existing `/candidato/*` entries (lines 142–172). Add after them, RoleGuard pattern verified at the analog:
```tsx
{ path: '/candidato/avaliacao/:candidaturaId',
  element: ( <RoleGuard role="candidato"><AvaliacaoContainer /></RoleGuard> ) },
```

---

### `src/features/config-vaga/schemas/testesAplicaveisSchema.ts` (modify, schema)

**Analog:** the file itself (current shape lines 14–24). Extend `testeAplicavelSchema` with optional SJT keys (`tipo:'sjt'`, `cargo`, `itens_ids[]`, `bateria_size`, `threshold:{mc_min_pct=60, case_min=13, flag_on_atencao=true}`). Full extension in RESEARCH lines 557–572. Keep existing keys (`teste`, `obrigatorio`, `customizado`, `perguntas?`) intact; extend its `.test.ts`.

---

### `src/features/avaliacao/components/AvaliacaoContainer.tsx` (component, page shell)

**Analog:** `src/components/pages/DashboardCandidatoPage.tsx` (D-27 persona shell — copy, do not re-author)

**Shell imports + structure** (analog lines 1–10): `BackgroundImage` (`background="gradient" overlayColor="bg-black" overlayOpacity={15}`) + `BeautySmileLogo` + `Glass/GlassPanel/GlassCard/GlassButton` from `../ui/glass` + sticky glass navbar (avatar/nome/email/Sair) + `useAuthStore`/`useCandidato` + `sonner` toast. Render one `GlassCard` per pending teste (status pill + tempo estimado + CTA). All copy/states/status-colors per UI-SPEC (neutral, RNF-07a-safe — candidate sees no score). Heading downscaled to `text-3xl` for mobile (UI-SPEC:68).

**SJT MC + open-case screens** reuse this shell + shadcn `radio-group` / `textarea` (vendored). The MC submit calls `avaliacaoService.pontuarSjt(...)` (RPC); the open-case submit invokes the `avaliar-redacao` EF — both gated by the `alert-dialog` "Enviar avaliação?" confirm (UI-SPEC:179).

---

### `src/features/avaliacao/hooks/useAvaliacaoDraft.ts` (hook, sessionStorage)

**Analog:** `src/features/cadastro/hooks/useCadastroDraft.ts` (copy structure)

**sessionStorage dies-with-tab + secret-stripping pattern** (analog lines 28–69): `save/load/clear` via `useCallback`, `sessionStorage` (NOT localStorage — LGPD, analog lines 9–11), strip any sensitive fields, `_savedAt` stamp, try/catch-swallow. Adapt the payload type to the SJT answer shape.

---

### `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts` (hook, debounced upsert)

**Analog:** useCadastroDraft (buffer half) + TanStack Query v5 mutation (no exact debounce analog in repo — role-match). Buffer to `useAvaliacaoDraft` immediately; debounced 30s server upsert to `respostas_avaliacao` via a TanStack `useMutation`. MUST catch the RLS 42501 on post-advance writes and surface the neutral back-lock state (Pitfall 3). Autosave affordance copy/visual per UI-SPEC:146–154.

---

### `src/features/avaliacao/services/avaliacaoService.ts` (service, CRUD + RPC + EF invoke)

**Analog:** `src/features/triagem/services/triagemService.ts` (allowlist select)

**Allowlist projection — never `select('*')`** (analog lines 128–138):
```ts
// Allowlist explícita — sem `*`, sem colunas PII.
const { data } = await supabase
  .from('candidaturas')
  .select(`id, status, etapa_atual, ...`)   // ← explicit columns only
  .eq(...)
```
RH scorecard read of `scores_candidato` uses this same allowlist idiom (candidato denied by RLS). The candidate service reads its own candidatura/perguntas/respostas (RLS own-row), calls `pontuar_sjt` RPC, and invokes the `avaliar-redacao` EF. Custom error classes per the `camelCaseService.ts` convention (CLAUDE.md).

---

### `src/features/avaliacao/schemas/respostaAvaliacaoSchema.ts` (schema)

**Analog:** testesAplicaveisSchema (project zod idiom). Client-side answer shape (Zod) — MC `{pergunta_id, opcao_id}[]` + open-case `{pergunta_id, texto}`. **No score field** (Pitfall 5 — score is server-derived).

---

## Shared Patterns

### Authentication / Authorization (authenticate-THEN-authorize, C1)
**Source:** `supabase/functions/comparativo-candidatos/index.ts:104–120, 151–163`
**Apply to:** `avaliar-redacao` EF (ownership variant) + re-asserted in `pontuar_sjt` RPC.
**Rule:** service_role bypasses RLS → every EF/RPC reading or writing via service_role MUST verify `auth.uid()` owns the candidatura AND `etapa_atual='avaliacao_assincrona'` BEFORE touching data. EF → 403; RPC → RAISE 42501.

### SECURITY DEFINER hardening + auth.uid() GUC
**Source:** `20260607000005_avancar_etapa_trigger.sql:18–27, 54–58, 115` + `20260610000003_reprocessar_rpc.sql:26–31, 50–59`
**Apply to:** `pontuar_sjt` RPC.
**Rule:** `LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''`; `auth.uid()` survives DEFINER (GUC-based); tail `REVOKE ALL … FROM PUBLIC; GRANT EXECUTE … TO authenticated`.

### RLS — candidato-DENY / RH-allowlist (the live role is `administrador`)
**Source:** `20260610000001_analise_tables.sql:74–92` + `20260607000006_rls_policies_m2_backbone.sql:44–58`
**Apply to:** `scores_candidato` (candidato no policy → denied), `perguntas` (RH manage + candidato active-read), RH read paths.
```sql
(select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')   -- NEVER 'admin'
```

### Ownership-join RLS (+ etapa-gate back-lock)
**Source:** `20260607000006_rls_policies_m2_backbone.sql:60–70`
**Apply to:** `respostas_avaliacao` (own-row) + add `AND c.etapa_atual='avaliacao_assincrona'` in USING **and** WITH CHECK for the back-lock.

### Allowlist projection (never `select('*')` — PII)
**Source:** `triagemService.ts:128–138` + `comparativo/analise EF:167–170`
**Apply to:** `avaliacaoService` reads + RH scorecard read of `scores_candidato`. ([[reference_select_star_leaks_pii]])

### AI runtime (don't hand-roll)
**Source:** `analise-candidato-individual/index.ts:219, 247–278, 355–386`
**Apply to:** `avaliar-redacao`. `callAi` owns injection/maskPII/retry/fallback/cost/log. `loadPrompt('work_sample_sjt', …)`. Never-absent invariant (`result.parsed == null` → throw → persist falhou). Injection stub → `pendente_humano`, never a fabricated success.

### sessionStorage draft (LGPD dies-with-tab)
**Source:** `useCadastroDraft.ts:28–69` → `useAvaliacaoDraft`.

### RNF-07a RH guardrail badge
**Source:** `src/features/triagem/components/SugestaoIABadge.tsx` (reuse, do not re-author) — every AI-derived score block on the RH scorecard (UI-SPEC:188).

### No-wrapper migration authoring (D-22)
**Source:** every analog migration header (e.g. `20260607010001:30–37`, `avancar_etapa:41–47`). No outer `BEGIN;…COMMIT;`. Tables usually push clean; the PL/pgSQL RPC (`$$` + adjacent REVOKE/GRANT) is the 42601-risk one → Supabase MCP `apply_migration`/`execute_sql` + `migration repair --status applied` fallback.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `useAutosaveAvaliacao.ts` (debounce mechanics only) | hook | event-driven | No existing 30s-debounced server-upsert hook; compose from useCadastroDraft buffer + a TanStack mutation. The PATTERN halves exist; the timer/flush wiring is new (small, testable — RESEARCH lines 642, 652). |

> Everything else has an exact or strong role-match analog. This phase is integration, not greenfield.

---

## BLOCKING Runtime Checklist (for the planner to schedule)

These are non-autonomous live-infra steps (Phase 8/9/10 precedent). Schedule them as explicit `[BLOCKING]` plan actions:

1. **Apply the 4 migrations to PROD** (`scores_candidato`, `perguntas`+seed, `respostas_avaliacao`, `pontuar_sjt`) via `db push --linked` or Supabase MCP `apply_migration` + version reconcile. The RPC is the 42601-risk migration (D-22).
2. **Flip `work_sample_sjt` prompt `is_active=false → true` in PROD** — seeded inactive (`20260609000004_prompt_library_seed.sql:11–24`); `loadPrompt` reads active rows only → EF throws `PromptNotConfiguredError` until flipped (RESEARCH lines 465, 704, 714–716).
3. **Deploy `avaliar-redacao` EF** — `supabase functions deploy avaliar-redacao` **JWT-ON** (no `--no-verify-jwt`). Reuses existing Phase-10 EF secrets (Anthropic/OpenAI/service_role).
4. **Regenerate `database.types.ts` (repo ROOT)** — `npm run db:types` after migrations (3 new tables + `tipo_score`/`status_score` enums + RPC); commit the regenerated file.

---

## Metadata

**Analog search scope:** `supabase/migrations/`, `supabase/functions/{comparativo-candidatos,analise-candidato-individual,_shared}/`, `src/features/{cadastro,config-vaga,triagem,avaliacao}/`, `src/components/pages/`, `src/router/`
**Files read this session:** comparativo EF (1–180), avancar_etapa migration (full), pergunta_opcao_metadata migration (full), m2-backbone RLS (30–79), analise EF (213–282, 355–386), useCadastroDraft (full), testesAplicaveisSchema (full), routes.tsx (140–174), reprocessar_rpc (1–70), triagemService (128–147), analise_tables RLS (grep), DashboardCandidatoPage (imports)
**Pattern extraction date:** 2026-06-09
