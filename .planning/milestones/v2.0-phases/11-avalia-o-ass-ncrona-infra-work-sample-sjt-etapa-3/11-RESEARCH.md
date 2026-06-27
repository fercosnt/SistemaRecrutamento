# Phase 11: Avaliação Assíncrona — Infra + Work Sample/SJT (Etapa 3) - Research

**Researched:** 2026-06-09
**Domain:** Supabase (Postgres RLS + SECURITY DEFINER RPC + Edge Function/Deno) + React/TanStack candidate flow + deterministic + AI scoring
**Confidence:** HIGH (all key claims grounded in shipped Phase 6/7/8/9/10 code read this session)

## Summary

Phase 11 builds the Etapa-3 assessment infrastructure on top of fully-shipped M2 backbone. Nearly every primitive this phase needs already exists as a verified, in-production pattern: the etapa state machine (`avancar_etapa()` trigger, Phase 6), the option-weight taxonomy (`pergunta_opcao_metadata` + `enum_tag_opcao`, Phase 7), the two-client authenticate-then-authorize Edge Function pattern with the C1 IDOR/403 fix (`comparativo-candidatos`/`analise-candidato-individual`, Phase 10), the AI runtime (`callAi`/`loadPrompt`/`WorkSampleScoringSchema`, Phase 9), and the allowlist-projection + `SugestaoIABadge` RH read pattern (Phase 10). This phase is **integration + three new tables + one new RPC + one new EF + one candidate container**, not greenfield research.

The phase creates: (1) `scores_candidato` — a generic per-candidatura score sink reused by P12-P15; (2) `perguntas` — the SJT item bank (seed-direct V1, 1-2 items/cargo from `docs/conhecimento/sjt/banco-sjt-*.md`); (3) `respostas_avaliacao` — autosave/progress with candidato-own-row + etapa-gated RLS (the back-lock); (4) `pontuar_sjt` SECURITY DEFINER RPC for deterministic MC scoring; (5) the `avaliar-redacao` EF for the SJT open-case (consuming the `work_sample_sjt` prompt). The invariant across all of it: **scoring never changes etapa and never auto-rejects** (RNF-07a) — `<threshold` only writes `status='pendente_humano'`.

**Primary recommendation:** Reuse aggressively. Design `scores_candidato` generic once. Express the back-lock as an etapa-gated RLS `USING`/`WITH CHECK` joining `candidaturas.etapa_atual = 'avaliacao_assincrona'`, AND re-assert it server-side in the scoring RPC + EF (defense in depth). Build the EF as a near-clone of `comparativo-candidatos` (two-client + role/ownership 403) but candidate-invoked: verify `auth.uid()` owns the candidatura AND etapa is correct before scoring. **Use the `work_sample_sjt` prompt call_type — NOT `sjt_evaluation`** (see Critical Discrepancy below).

---

## CRITICAL DISCREPANCY — prompt call_type is `work_sample_sjt`, not `sjt_evaluation`

CONTEXT.md and the orchestrator brief repeatedly say the EF consumes the `sjt_evaluation` prompt and that `prompt-loader SCHEMA_VERSIONS` already has `sjt_evaluation:1.0.0`. **This is wrong.** Verified this session:

- `prompt-loader.ts` `SCHEMA_VERSIONS` HAS `sjt_evaluation: "1.0.0"` [VERIFIED: read `supabase/functions/_shared/prompt-loader.ts:33-42`] — BUT
- The seeded DB row, the template, the enum, and the Zod schema all use **`work_sample_sjt`**:
  - `docs/conhecimento/prompts/templates/07-work-sample-sjt.md` frontmatter: `call_type: work_sample_sjt` [VERIFIED]
  - `supabase/migrations/20260609000004_prompt_library_seed.sql:103` seeds `'work_sample_sjt'` [VERIFIED]
  - `database.types.ts:3699` `llm_call_type` enum includes `"work_sample_sjt"` (NOT `sjt_evaluation`) [VERIFIED]
  - `00-shared-zod-schemas.ts:340` `PROMPT_VERSIONS.work_sample_sjt` + `WORK_SAMPLE_SJT_SCHEMA_VERSION` [VERIFIED]

`loadPrompt('work_sample_sjt', supabaseAdmin)` will find the seeded row; `loadPrompt('sjt_evaluation', ...)` will throw `PromptNotConfiguredError` because no DB row has that call_type. **The planner MUST use `work_sample_sjt`.** The `sjt_evaluation` key in `SCHEMA_VERSIONS` is a stray (it lists a different 8-call-type set than the template directory) and should be treated as dead — do not rely on it. Optionally flag for a follow-up cleanup, but it does not block this phase.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Container & navegação (AVAL-01 / RF-11/12):**
- Layout: lista de cards (1 por teste pendente) no shell candidato glass (copy `DashboardCandidatoPage`), mobile-first, ordem livre, cada card mostra tempo estimado + status.
- `testes_aplicaveis`: estende o schema Phase-7 (`src/features/config-vaga/schemas/testesAplicaveisSchema.ts`) com chaves SJT (`cargo`, `itens_ids[]`, `bateria_size`, `threshold`); default por template de cargo; ≥1 obrigatório validado no publish.
- Gating: rota `/candidato/avaliacao/:candidatura_id` guarded + RLS keyed a `candidaturas.etapa_atual='avaliacao_assincrona'`; etapa errada → bloqueado/redirect (mensagem neutra).
- Independência: cada teste salvo independentemente; conclusão parcial permitida.

**SJT múltipla escolha — scoring determinístico (AVAL-02 / RF-13):**
- Fórmula `Score_sjt = Σ peso(opcao_marcada)`, determinístico, server-side (RPC/EF SECURITY DEFINER, NUNCA client). Escala via `pergunta_opcao_metadata`: `fortemente_pontua=4`, `pontua=2`, `neutro=1`, `atencao=0`+flag.
- Threshold: `<60% do máximo OU ≥1 atencao` → `status='pendente_humano'`, NUNCA auto-reject (RNF-07a — nenhuma mudança de etapa por score). Persiste `scores_candidato` tipo='sjt' + metadata jsonb.
- Banco: **seed-direct V1** — 1-2 itens SJT por cargo seedados diretamente num migration; markdown `docs/conhecimento/sjt/banco-sjt-<cargo>.md` como fonte. CI `sync-sjt.ts` DIFERIDO para V2.
- Anti-cheat: randomiza ordem das opções por sessão + soft timer no V1; cláusula TCLE.

**SJT caso aberto — scoring por IA (AVAL-03 / RF-14):**
- EF nova `supabase/functions/avaliar-redacao/index.ts` consumindo o prompt `work_sample_sjt` (template 07, Sonnet), reusando infra Phase 9. Candidate-invoked (JWT-ON).
- Escala BARS: prompt retorna 1-5 por dimensão (ou `insufficient_evidence`); a EF mapeia para composto 0-25. Persiste `scores_candidato` tipo='sjt' (caso aberto) + citações + red_flags Zod-validados.
- Threshold: `<13/25 OU ≥1 red_flag` → `pendente_humano`, nunca auto-reject.
- Authz (C1 Phase 10): a EF DEVE validar `auth.uid()` é dono da `candidatura_id` E `etapa_atual='avaliacao_assincrona'` antes de escrever.

**Autosave & back-lock + scorecards RH (AVAL-09 / RF-18/19):**
- Autosave 30s — buffer `sessionStorage` (padrão `useCadastroDraft`) + upsert server debounced 30s numa tabela de progresso.
- Back-lock: RLS keyed a `etapa_atual='avaliacao_assincrona'` na tabela de respostas/progresso + guard na EF/RPC de submit.
- Tabela de progresso nova `respostas_avaliacao` — `candidatura_id`, `teste`, `respostas jsonb`, `updated_at`; RLS own-row do candidato + etapa gate; service_role/EF escreve scores.
- Scorecards RH: RH lê `scores_candidato` via allowlist role-gated (reusa o padrão do painel Phase 10 — NÃO `select('*')`); candidato denied.

### Claude's Discretion
- Index strategy on the new tables.
- Exact column set of `scores_candidato.metadata` jsonb (this research proposes one — planner may refine).
- Whether MC scoring is an RPC vs EF (this research recommends **RPC** — see Architecture).
- Autosave debounce/flush mechanics and the server upsert hook shape.

### Deferred Ideas (OUT OF SCOPE)
- CI `sync-sjt.ts` hybrid markdown→DB completo (PRD §8.1) — V2.
- Pool>bateria com draw aleatório — V2.
- Banco SJT completo p/ todos os cargos — V1 tem 1-2/cargo.
- Big Five (AVAL-04 → P12), Redação cultural + revisão humana (AVAL-05/06/07 → P13), Devolutiva (AVAL-08 → P12).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AVAL-01 | `vaga.testes_aplicaveis` configures active tests; `/candidato/avaliacao/:id` shows pending + tempo, ordem livre, each test saved independently [RF-11, RF-12] | testesAplicaveisSchema extension (§Standard Stack); container copies `DashboardCandidatoPage` shell; RoleGuard route pattern (§Code Examples) |
| AVAL-02 | SJT MC deterministic Σ pesos (4/2/1/0), `<60% OR ≥1 atencao` → revisão humana (never auto-reject); persist `scores_candidato` tipo=`sjt` [RF-13] | `pontuar_sjt` RPC reads `pergunta_opcao_metadata` (§Pattern 3); scores_candidato design (§Pattern 1) |
| AVAL-03 | SJT open case via `avaliar-redacao` EF, BARS 0-25 + citations + red_flags Zod, `<13/25 OR red flag` → revisão humana [RF-14] | `avaliar-redacao` EF clones `comparativo-candidatos` authz (§Pattern 4); `WorkSampleScoringSchema` (§Code Examples); 1-5→0-25 mapping (§Pitfall 2) |
| AVAL-09 | Autosave 30s + back-lock after etapa advance; RLS + EF block tests outside `etapa_atual='avaliacao_assincrona'` [RF-18, RF-19] | etapa-gated RLS idiom (§Pattern 2); `useAvaliacaoDraft` from `useCadastroDraft`; RH scorecard allowlist |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 11 |
|-----------|--------------------|
| `database.types.ts` na RAIZ (gerado, NUNCA editar manual) | Regenerate after migration via `npm run db:types`; the 3 new tables + `scores_candidato` enums land here |
| Migrations PL/pgSQL: no-wrapper authoring (D-22) | `pontuar_sjt` RPC + table migrations: NO outer `BEGIN;...COMMIT;`. Phase 8 proved `db push --linked` is clean if no-wrapper authoring holds; PL/pgSQL `$$` + adjacent COMMENT/GRANT may still trip 42601 → Supabase MCP `apply_migration` / SQL-Editor + `migration repair --status applied` |
| NUNCA `supabaseAdmin`/service_role client-side | MC scoring + AI scoring server-side only (RPC SECURITY DEFINER + EF service_role). Client never computes or submits a score. |
| Operações privilegiadas → Edge Functions | `avaliar-redacao` EF; `pontuar_sjt` is a SECURITY DEFINER RPC (callable by candidate JWT but runs as owner, gated by ownership check inside) |
| RLS 100% das tabelas com dados de usuário | All 3 new tables get RLS. `respostas_avaliacao` = candidato own-row + etapa gate. `scores_candidato` = candidato NO read, RH/admin allowlist read. `perguntas` = candidato read active items, RH manage. |
| Linguagem "avaliação comportamental/cognitiva", NUNCA "teste psicológico" (LGPD-04) | All candidate copy + seed text + UI strings pass the `pitfall7`/LGPD-04 grep guard. Candidate never sees score/threshold/pass-fail. |
| Sistema NUNCA rejeita por score (RNF-07a) | Scoring RPC/EF write `scores_candidato.status='pendente_humano'` ONLY — NEVER touch `candidaturas.etapa_atual`. The `avancar_etapa` trigger stays untouched by this phase. |
| Commits `git -c core.hooksPath=/dev/null` | Bypass tsc pre-commit hook against the legacy baseline (~293-301). Zero-growth invariant on the baseline. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Etapa gate / back-lock | Database (RLS) | API (EF/RPC re-assert) | RLS is the unbypassable enforcement; EF/RPC re-check is defense-in-depth so a service_role write can't bypass intent |
| MC deterministic scoring | Database (SECURITY DEFINER RPC) | — | Pure SQL Σ over `pergunta_opcao_metadata`; no AI, no network. Server-authoritative anti-tamper. |
| AI open-case scoring | API (Edge Function) | Database (persist) | Needs `callAi`/`loadPrompt` (Deno-only) + Anthropic SDK; EF owns authz + Zod validation + 1-5→0-25 mapping |
| Autosave progress | Browser (sessionStorage buffer) | Database (debounced upsert) | sessionStorage dies-with-tab (LGPD); DB upsert is the durable + RLS-gated store |
| Score persistence | Database (`scores_candidato`) | — | Single generic sink reused P12-P15 |
| RH scorecard read | API/Frontend (allowlist projection) | Database (RLS) | Never `select('*')` (PII leak lesson); RLS denies candidato, allows RH/admin |
| Candidate container UI | Browser (React + TanStack) | API (Supabase reads) | Mobile-first glass shell; reads its own candidatura/respostas; never reads scores |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.x (esm.sh `@2`) | Client reads + RPC calls + EF clients | Already the project's only data layer; EFs import `https://esm.sh/@supabase/supabase-js@2` [VERIFIED: analise EF:38] |
| @anthropic-ai/sdk | 0.102.0 (npm: pin) | Open-case scoring via `callAi` | Pinned across Phase 9/10 EFs; built in prod only, injected in tests [VERIFIED: ai-client.ts:43, analise EF:374] |
| openai | 6.42.0 (npm: pin) | Fallback model gpt-4o-mini | Same pin [VERIFIED: ai-client.ts:45] |
| zod | 3.25.76 (npm: in EF; `zod` workspace in frontend) | EF schema validation + frontend testesAplicaveis schema | EF pin is 3.25.76 (structured-output peer-dep); frontend uses workspace `zod` [VERIFIED: analise-schemas.ts:24, testesAplicaveisSchema.ts:12] |
| @tanstack/react-query | v5 | Container data fetching + autosave mutation | Project standard (staleTime 5min, retry 2) [CITED: CLAUDE.md] |
| react-hook-form + @hookform/resolvers | (project) | SJT MC radio-group form + open-case textarea | Project standard for forms [CITED: CLAUDE.md] |

### Supporting (all already vendored — NO new installs)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| shadcn/ui primitives | `radio-group`, `textarea`, `progress`, `badge`, `button`, `alert-dialog`, `skeleton`, `card`, `label` | All in `src/components/ui/` since M1 — UI-SPEC §Registry Safety confirms no install/vetting gate [VERIFIED: 11-UI-SPEC.md:200-203] |
| Glass primitives | `Glass`, `GlassPanel`, `GlassCard`, `GlassButton` (`src/components/ui/glass.tsx`) | Candidate glass-over-gradient shell |
| lucide-react | icons (`Circle`, `CheckCircle2`, `Lock`, `Loader2`, `Check`, `AlertCircle`, `Sparkles`) | Status pills + autosave affordance |
| sonner | toast transient feedback | Submit success/failure |
| `SugestaoIABadge` (`src/features/triagem/components/SugestaoIABadge.tsx`) | RNF-07a guardrail on AI-derived RH scorecard blocks | Reuse, do not re-author [VERIFIED: file exists] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MC scoring as SECURITY DEFINER RPC | MC scoring inside the `avaliar-redacao` EF | RPC is simpler (pure SQL, no AI, no network), atomic with the read of `pergunta_opcao_metadata`, and testable via SQL smokes. EF adds Deno deploy overhead for zero benefit. **Recommend RPC.** |
| One EF for both MC + open-case | Separate RPC (MC) + EF (open-case) | Splitting keeps the deterministic path in pure SQL (auditable, no LLM cost) and the AI path in the EF. Cleaner separation. **Recommend split.** |
| `avaliar-redacao` candidate-invoked submit | trigger-driven (pg_net like analise) | The open-case is candidate-initiated at submit time; candidate-invoked JWT-ON EF (like `comparativo`) is the right shape — the candidate authorizes the scoring of their own answer. |

**Installation:** No new packages. All EF deps are existing npm: pins; all frontend deps are vendored.

**Version verification:** SDK pins re-verified in Phase 9/10 execution (`npm view`): `@anthropic-ai/sdk@0.102.0`, `openai@6.42.0`, `zod@3.25.76` exist [VERIFIED: ai-client.ts:31-32 execution note]. No new versions to verify for this phase.

## Package Legitimacy Audit

> No external packages are installed in this phase. All EF SDK deps are pre-existing pins already audited in Phase 9 (`@anthropic-ai/sdk@0.102.0`, `openai@6.42.0`, `zod@3.25.76`, `unpdf@0.11.0`). All frontend deps are vendored shadcn primitives present since M1.

| Package | Registry | Disposition |
|---------|----------|-------------|
| (none new) | — | N/A — phase installs zero packages |

**Packages removed due to slopcheck [SLOP] verdict:** none (no new packages).
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
CANDIDATE FLOW (mobile-first)
                                                         RLS gate: candidato own-row
  /candidato/avaliacao/:candidatura_id                   + candidaturas.etapa_atual
        │  (RoleGuard role="candidato")                  = 'avaliacao_assincrona'
        ▼                                                        │
  ┌─────────────────────┐   reads own candidatura +              │
  │ AvaliacaoContainer  │── testes_aplicaveis + perguntas ───────┤
  │  (cards per teste)  │   (active items for cargo)             │
  └─────────┬───────────┘                                        │
            │ navigate                                           ▼
   ┌────────┴─────────┐                              ┌───────────────────────┐
   ▼                  ▼                              │  respostas_avaliacao  │
 SJT MC screen    SJT open-case screen               │  (autosave/progress)  │
 (radio-group)    (textarea 200-500w)                └───────────┬───────────┘
   │                  │      ▲                                    │
   │ autosave 30s ────┴──────┘  sessionStorage buffer + debounced upsert
   │                  │
   │ SUBMIT           │ SUBMIT
   ▼                  ▼
 RPC pontuar_sjt   EF avaliar-redacao  ◄── auth.getUser() (two-client)
 (SECURITY         (candidate JWT)         → role/ownership 403 + etapa check (C1)
  DEFINER)            │                     → loadPrompt('work_sample_sjt')
   │  Σ peso from     │  callAi → WorkSampleScoringSchema (Zod)
   │  pergunta_opcao_ │  map 1-5 dims → composite 0-25
   │  metadata        │  threshold <13/25 OR red_flag → pendente_humano
   │  threshold       ▼
   │  <60% OR atencao ┌──────────────────────┐
   └─────────────────►│   scores_candidato   │  tipo='sjt' | status | metadata jsonb
                      │  (generic sink P11-15)│  ── NEVER touches candidaturas.etapa_atual
                      └──────────┬───────────┘     (RNF-07a: no auto-reject, no etapa change)
                                 │
            RH read (allowlist projection, NOT select('*'))   RLS: candidato DENIED
                                 ▼
                      RH Scorecard (desktop) + SugestaoIABadge (RNF-07a)
```

### Recommended Project Structure
```
supabase/migrations/
├── 20260611000001_scores_candidato.sql          # generic score sink + tipo/status enums + RLS
├── 20260611000002_perguntas_sjt.sql             # SJT item bank table + RLS + seed (1-2/cargo)
├── 20260611000003_respostas_avaliacao.sql       # autosave/progress + etapa-gated RLS
└── 20260611000004_pontuar_sjt_rpc.sql           # SECURITY DEFINER deterministic MC scoring

supabase/functions/
└── avaliar-redacao/
    ├── index.ts                                  # clone comparativo authz + callAi(work_sample_sjt)
    └── __tests__/index.test.ts                   # deno tests (mock SDK + 401/403 authz cases)
supabase/functions/_shared/
└── avaliacao-schemas.ts                          # copy WorkSampleScoringSchema verbatim (docs/ not deployed)

src/features/avaliacao/                           # NEW feature dir
├── components/
│   ├── AvaliacaoContainer.tsx                    # cards per teste (copy DashboardCandidatoPage shell)
│   ├── SjtMultiplaEscolhaScreen.tsx              # radio-group + soft timer + Avançar
│   └── SjtCasoAbertoScreen.tsx                   # textarea 200-500w + word-count + alert-dialog
├── hooks/
│   ├── useAvaliacaoDraft.ts                      # sessionStorage (copy useCadastroDraft)
│   └── useAutosaveAvaliacao.ts                   # debounced 30s server upsert
├── services/
│   └── avaliacaoService.ts                       # reads (allowlist) + pontuar_sjt RPC + EF invoke
├── schemas/
│   └── respostaAvaliacaoSchema.ts                # client-side answer shape (Zod)
└── types/

src/features/config-vaga/schemas/
└── testesAplicaveisSchema.ts                     # EXTEND: add cargo/itens_ids/bateria_size/threshold
```

### Pattern 1: Generic `scores_candidato` sink (design once, reuse P12-P15)
**What:** A single table keyed by `candidatura_id` + `tipo` enum, with a `metadata` jsonb for per-type breakdown.
**When to use:** This phase writes `tipo='sjt'`; P12 writes `'big_five'`, P13 `'redacao'`, P14 `'entrevista'`, P15 `'decisao'`.
**Confirmed enum values needed:** The PRD-MASTER pipeline + REQUIREMENTS map the downstream tipos. Recommend a forward-declared enum so P12-15 don't need an `ALTER TYPE ... ADD VALUE` migration each (Postgres can't add enum values inside a txn easily, and can't drop them):

```sql
-- 20260611000001_scores_candidato.sql  (no BEGIN/COMMIT wrapper — D-22)
CREATE TYPE public.tipo_score AS ENUM (
  'sjt',          -- Phase 11 (this phase): both MC and open-case
  'big_five',     -- Phase 12 (AVAL-04)
  'redacao',      -- Phase 13 (AVAL-05/06)
  'entrevista',   -- Phase 14 (ENTREV-03)
  'cognitivo',    -- Phase 14 (ENTREV-05, contextual)
  'decisao'       -- Phase 15 (DECISAO-01)
);

CREATE TYPE public.status_score AS ENUM (
  'sucesso',           -- score computed, above threshold (informational; never auto-advance)
  'pendente_humano',   -- below threshold OR red_flag/atencao → requires human review
  'falhou'             -- scoring errored (never-absent invariant, like analise)
);

CREATE TABLE public.scores_candidato (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id  uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  tipo            public.tipo_score NOT NULL,
  subtipo         text,                          -- e.g. 'mc' | 'caso_aberto' for SJT; nullable
  pergunta_id     uuid,                          -- nullable; set for per-item open-case scores
  score           numeric,                       -- raw score (Σ pesos for MC; composite 0-25 for case)
  score_max       numeric,                       -- denominator (e.g. 12 for a 3-item MC battery)
  status          public.status_score NOT NULL DEFAULT 'sucesso',
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,   -- per-item / per-dimension breakdown
  citacoes        jsonb,                         -- AI types only (open-case): Citation[]
  red_flags       jsonb,                         -- AI types only: string[]
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidatura_id, tipo, subtipo, pergunta_id)   -- idempotent upsert key (see Pitfall 7)
);

ALTER TABLE public.scores_candidato ENABLE ROW LEVEL SECURITY;

-- RH/admin read (allowlist projection at app layer; RLS allows the role) — live idiom:
CREATE POLICY rh_le_scores ON public.scores_candidato
  FOR SELECT USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh','administrador'));
-- candidato: NO SELECT policy → denied. Writes only by SECURITY DEFINER RPC / service_role EF.
```

> The `UNIQUE` key must tolerate NULLs in `subtipo`/`pergunta_id`. Postgres treats NULL as distinct in UNIQUE by default — for true idempotency on the MC row (one per candidatura+tipo+subtipo) use `UNIQUE NULLS NOT DISTINCT` (PG15+, Supabase is PG15) OR a coalesced expression index. **Verify the PG version supports `NULLS NOT DISTINCT`** at plan time. [CITED: PostgreSQL 15 release notes — UNIQUE NULLS NOT DISTINCT]

**`metadata` jsonb shape (from PRD §8.2, adapt):**
```jsonc
// MC: { score, max, respostas:[{pergunta_id, opcao_id, tag, peso}], flags:["atencao:Dx"] }
// open-case: { scenario_id, dimension_scores:[{dimension, score_1_5, level, reasoning}],
//              composite_0_25, recommendation, confidence }
```

### Pattern 2: Etapa-gated RLS (the back-lock) — `respostas_avaliacao`
**What:** Candidate may insert/update their own progress ONLY while their candidatura is in `avaliacao_assincrona`. Once `avancar_etapa` moves them past it, writes are denied.
**When to use:** `respostas_avaliacao` INSERT/UPDATE policies.
**Example (live idiom + etapa join):**
```sql
-- 20260611000003_respostas_avaliacao.sql  (no wrapper — D-22)
CREATE TABLE public.respostas_avaliacao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id  uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  teste           text NOT NULL,                 -- which test ('sjt' or a teste id from testes_aplicaveis)
  respostas       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidatura_id, teste)
);
ALTER TABLE public.respostas_avaliacao ENABLE ROW LEVEL SECURITY;

-- Candidato reads own progress (ownership join — Phase 6 idiom):
CREATE POLICY cand_le_respostas_aval ON public.respostas_avaliacao
  FOR SELECT USING (
    candidatura_id IN (
      SELECT id FROM public.candidaturas
       WHERE candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = (select auth.uid()))
    )
  );

-- Candidato writes own progress ONLY while in avaliacao_assincrona (THE BACK-LOCK).
-- The etapa predicate is in BOTH USING (UPDATE old-row) and WITH CHECK (INSERT/UPDATE new-row):
CREATE POLICY cand_escreve_respostas_aval ON public.respostas_avaliacao
  FOR ALL
  USING (
    candidatura_id IN (
      SELECT c.id FROM public.candidaturas c
       JOIN public.candidatos ca ON ca.id = c.candidato_id
      WHERE ca.user_id = (select auth.uid())
        AND c.etapa_atual = 'avaliacao_assincrona'
    )
  )
  WITH CHECK (
    candidatura_id IN (
      SELECT c.id FROM public.candidaturas c
       JOIN public.candidatos ca ON ca.id = c.candidato_id
      WHERE ca.user_id = (select auth.uid())
        AND c.etapa_atual = 'avaliacao_assincrona'
    )
  );
```
**Source:** ownership join is the verified Phase-6 idiom [VERIFIED: `20260607000006_rls_policies_m2_backbone.sql:39-42, 62-70`]; the `etapa_atual = 'avaliacao_assincrona'` predicate is the new back-lock element (the enum value is in production [VERIFIED: `database.types.ts:3686`]).

### Pattern 3: Deterministic MC scoring RPC (`pontuar_sjt`)
**What:** SECURITY DEFINER RPC: given `candidatura_id` + submitted `{pergunta_id, opcao_id}[]`, compute `Σ peso` from `pergunta_opcao_metadata`, apply threshold, write `scores_candidato`. Authorizes inside (ownership + etapa) since it runs as owner.
**Source for weights:** `pergunta_opcao_metadata (pergunta_id, opcao_id, tag, peso)` [VERIFIED: `20260607010001_pergunta_opcao_metadata.sql:45-57`]. Join by `opcao_id` (primary) — the SJT items are seeded with stable `opcao_id`s in this phase, so unlike the Phase-4 candidate writer (which writes strings), here we control the write and can submit `opcao_id`s.
```sql
-- 20260611000004_pontuar_sjt_rpc.sql  (PL/pgSQL $$ → may need MCP apply / SQL-Editor per D-22)
CREATE OR REPLACE FUNCTION public.pontuar_sjt(
  p_candidatura_id uuid,
  p_respostas      jsonb   -- [{ "pergunta_id": uuid, "opcao_id": uuid }, ...]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owns        boolean;
  v_score       int := 0;
  v_max         int := 0;
  v_has_atencao boolean := false;
  v_status      public.status_score;
  v_breakdown   jsonb;
BEGIN
  -- AUTHORIZE (C1): caller owns candidatura AND is in avaliacao_assincrona
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()                 -- GUC-based, survives DEFINER (Phase 6 proof)
       AND c.etapa_atual = 'avaliacao_assincrona'
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Σ peso(opcao marcada) + max(peso) per pergunta for the denominator + atencao flag
  WITH marked AS (
    SELECT (r->>'pergunta_id')::uuid AS pergunta_id, (r->>'opcao_id')::uuid AS opcao_id
      FROM jsonb_array_elements(p_respostas) r
  ),
  scored AS (
    SELECT m.pergunta_id, pom.opcao_id, pom.tag, pom.peso
      FROM marked m
      JOIN public.pergunta_opcao_metadata pom
        ON pom.pergunta_id = m.pergunta_id AND pom.opcao_id = m.opcao_id
  ),
  maxes AS (
    SELECT pergunta_id, MAX(peso) AS peso_max
      FROM public.pergunta_opcao_metadata
     WHERE pergunta_id IN (SELECT pergunta_id FROM marked)
     GROUP BY pergunta_id
  )
  SELECT COALESCE(SUM(s.peso),0),
         COALESCE((SELECT SUM(peso_max) FROM maxes),0),
         bool_or(s.tag = 'atencao'),
         jsonb_agg(jsonb_build_object('pergunta_id', s.pergunta_id,
                                      'opcao_id', s.opcao_id, 'tag', s.tag, 'peso', s.peso))
    INTO v_score, v_max, v_has_atencao, v_breakdown
    FROM scored s;

  -- Threshold (RNF-07a): <60% OR ≥1 atencao → pendente_humano. NEVER auto-reject / no etapa change.
  v_status := CASE
    WHEN v_has_atencao OR (v_max > 0 AND v_score::numeric / v_max < 0.60)
    THEN 'pendente_humano'::public.status_score
    ELSE 'sucesso'::public.status_score
  END;

  INSERT INTO public.scores_candidato
    (candidatura_id, tipo, subtipo, score, score_max, status, metadata)
  VALUES
    (p_candidatura_id, 'sjt', 'mc', v_score, v_max, v_status,
     jsonb_build_object('respostas', v_breakdown, 'has_atencao', v_has_atencao))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)
  DO UPDATE SET score = EXCLUDED.score, score_max = EXCLUDED.score_max,
                status = EXCLUDED.status, metadata = EXCLUDED.metadata, updated_at = now();

  -- Return NEUTRAL payload to the candidate: NO score, NO threshold (RNF-07a / UI-SPEC)
  RETURN jsonb_build_object('ok', true, 'registrado', true);
END;
$$;
REVOKE ALL ON FUNCTION public.pontuar_sjt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pontuar_sjt(uuid, jsonb) TO authenticated;
```
**Key correctness notes:**
- `auth.uid()` survives SECURITY DEFINER because it reads the request.jwt GUC, not the execution role — empirically proven in Phase 6 [VERIFIED: `20260607000005_avancar_etapa_trigger.sql:22-27`]. So the ownership check works even though the fn runs as owner.
- The RPC returns a NEUTRAL payload — the candidate never receives the score/threshold (RNF-07a + UI-SPEC: candidate sees only "Concluído").
- It writes `scores_candidato` but NEVER updates `candidaturas.etapa_atual`. No auto-advance, no auto-reject.

### Pattern 4: `avaliar-redacao` EF — two-client authenticate-then-authorize (C1)
**What:** Candidate-invoked EF (JWT-ON). Clones the `comparativo-candidatos` shape but for a candidate: authenticate via anon client `auth.getUser()`, then AUTHORIZE (owns candidatura AND etapa correct) → 403 if not, then score via `callAi('work_sample_sjt')`.
**Source:** `comparativo-candidatos/index.ts` two-client + C1 IDOR 403 [VERIFIED: lines 104-119, 161]. The candidate variant authorizes by ownership instead of RH role.
```ts
// supabase/functions/avaliar-redacao/index.ts (clone comparativo skeleton)
// 1. supabaseUser (anon + Authorization) → auth.getUser()  → 401 if no/invalid session
// 2. AUTHORIZE (C1): supabaseAdmin reads candidaturas; verify
//      candidato_id maps to this user.id AND etapa_atual = 'avaliacao_assincrona'  → else 403
// 3. loadPrompt('work_sample_sjt', supabaseAdmin)  // NOT 'sjt_evaluation'
// 4. callAi({ prompt, rawInput: candidateAnswer + scenario, schema: WorkSampleScoringSchema, ... })
//      callAi already does injection/maskPII/retry/fallback/cost/log — never re-implement
// 5. map result.parsed.dimension_scores (1-5 each) → composite 0-25 (see Pitfall 2)
// 6. threshold: composite < 13 OR red_flags.length > 0  → status 'pendente_humano'
// 7. UPSERT scores_candidato { tipo:'sjt', subtipo:'caso_aberto', pergunta_id,
//      score: composite, score_max: 25, status, metadata, citacoes, red_flags }
// 8. NEVER touch candidaturas.etapa_atual. Return neutral { ok:true } to candidate.
```
**Deploy:** `supabase functions deploy avaliar-redacao` (JWT verify ON — default; do NOT use `--no-verify-jwt` here, unlike `analise`/`cost-alerter` which are server-internal). This is a [BLOCKING] human checkpoint (live infra), per Phase 8/10 precedent.

### Anti-Patterns to Avoid
- **`select('*')` on candidatura/scores in the EF or RH read** — leaks PII columns RLS can't hide (row-level only). Use explicit allowlist [VERIFIED: analise EF:167, `reference_select_star_leaks_pii`].
- **Trusting a client-submitted score** — the client submits answers (`opcao_id`s / answer text) ONLY; the score is always computed server-side. Never accept a `score` field from the client.
- **Touching `candidaturas.etapa_atual` from scoring** — would auto-advance/reject (RNF-07a violation). Scoring writes `scores_candidato` only.
- **Importing schemas from `docs/`** — `docs/` is not in the EF bundle; copy `WorkSampleScoringSchema` verbatim into `_shared/avaliacao-schemas.ts` [VERIFIED: analise-schemas.ts:9-13 documents this exact rule].
- **`--no-verify-jwt` on `avaliar-redacao`** — it's candidate-invoked; JWT must be verified by the gateway. (Only server-internal EFs like `analise`/`cost-alerter` self-auth a Vault Bearer with `--no-verify-jwt`.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI call (retry/fallback/cost/log/injection/maskPII) | Custom Anthropic fetch loop | `callAi()` from `_shared/ai-client.ts` | It owns ALL of injection detection, PII masking, exp-backoff retry, OpenAI fallback, cost calc, audit log [VERIFIED: ai-client.ts:17-30] |
| Prompt version resolution | Hardcoded prompt string | `loadPrompt('work_sample_sjt', supabaseAdmin)` | DB-only active/canary routing + schema-version fail-fast [VERIFIED: prompt-loader.ts] |
| Option weight lookup | New weights table | `pergunta_opcao_metadata` (Phase 7) | Already the source-of-truth taxonomy (tag/peso/nota_ia) [VERIFIED] |
| Etapa transition validation | Manual etapa update logic | The existing `avancar_etapa()` trigger — and this phase simply DOESN'T move etapa | Scoring is decoupled from etapa entirely (RNF-07a) |
| sessionStorage draft (PII-safe) | New storage util | Copy `useCadastroDraft` pattern (dies-with-tab, strips secrets) | LGPD-compliant precedent [VERIFIED: useCadastroDraft.ts:1-12] |
| RH AI-score guardrail badge | New badge | `SugestaoIABadge` (`src/features/triagem/components/`) | RNF-07a "Sugestão da IA — decisão é sempre humana" already built |
| Candidate shell | New layout | Copy `DashboardCandidatoPage` (BackgroundImage gradient + GlassCard) | D-27 persona-shell rule [VERIFIED: 11-UI-SPEC.md:30] |

**Key insight:** This phase is ~90% wiring existing, battle-tested primitives. The genuinely new code is: 4 migrations, 1 EF (cloning comparativo), 1 RPC, 1 feature dir. The novel risk surface is the etapa-gated RLS and the 1-5→0-25 mapping — both small and testable.

## Runtime State Inventory

> This is a greenfield-additive phase (new tables, new EF, new feature) — no rename/refactor. But two integration-state items matter:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no existing data is renamed/migrated. `scores_candidato`/`perguntas`/`respostas_avaliacao` are all NEW empty tables. | Seed SJT items into `perguntas` + `pergunta_opcao_metadata` (1-2/cargo) via migration. |
| Live service config | **`prompt_versions` row for `work_sample_sjt` is seeded with `is_active=false`** [VERIFIED: `20260609000004_prompt_library_seed.sql:11-24`]. `loadPrompt` reads `is_active=true` rows only → if not activated, the EF throws `PromptNotConfiguredError`. | **One-time manual activation SQL** to flip `work_sample_sjt` to `is_active=true` before the EF can score (BLOCKING human step, like Phase 9). |
| OS-registered state | None. | None. |
| Secrets/env vars | EF needs `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY` — already set for Phase 10 EFs. | None — reuse existing EF secrets. |
| Build artifacts | `database.types.ts` (repo ROOT) must be regenerated after the 4 migrations (3 new tables + 2 new enums + RPC). | `npm run db:types` (or Supabase MCP) post-apply; commit regenerated types. |

**The canonical question:** After all migrations apply, the only runtime state still needing a touch is the `work_sample_sjt` prompt activation (currently seeded inactive) — flag this as a BLOCKING checkpoint in the plan.

## Common Pitfalls

### Pitfall 1: Wrong prompt call_type (`sjt_evaluation` vs `work_sample_sjt`)
**What goes wrong:** Following CONTEXT.md literally → `loadPrompt('sjt_evaluation')` → `PromptNotConfiguredError` at runtime; the EF persists `status='falhou'` for every open-case.
**Why:** `SCHEMA_VERSIONS` in prompt-loader has a stray `sjt_evaluation` key, but no DB row, template, or enum uses it. The live key is `work_sample_sjt`.
**How to avoid:** Use `work_sample_sjt` everywhere. Verify against the seeded row + `llm_call_type` enum.
**Warning signs:** A deno smoke that asserts `loadPrompt` resolves the SJT prompt fails; `prompt_versions` has zero rows for the requested call_type.

### Pitfall 2: 1-5 → 0-25 composite mapping (the BARS aggregation)
**What goes wrong:** The prompt returns N `dimension_scores`, each 1-5 (or `insufficient_evidence`). Naively summing 5 dims of max-5 gives 0-25 only if there are exactly 5 dims AND none are `insufficient_evidence`. The dentista case has 5 dims with weights (25/20/25/15/15%) [VERIFIED: banco-sjt-dentista.md:83-89] — so the mapping is WEIGHTED, not a raw sum.
**Why:** Dimensions are weighted per the BARS rubric; `insufficient_evidence` is a string, not a number; dim count varies by case (schema allows 1-8 dims).
**How to avoid:** Document the mapping explicitly in the EF (CONTEXT says "documenta o mapeamento no código"). Recommended: composite_0_25 = `round(Σ (weight_i × score_i) / Σ weight_i × 5) ... ` normalized to 25. Treat `insufficient_evidence` as a defined policy (e.g., contributes 0 OR excludes that weight — decide and document). The dentista rubric's own scale ("Total 0-25 · ≥18 avança · 13-17 entrevista · <13 revisão") confirms 0-25 is the target band [VERIFIED: banco-sjt-dentista.md:91].
**Warning signs:** Composite > 25 or < 0; a case with 3 dims producing the same composite as a 5-dim case.

### Pitfall 3: Etapa-gate RLS breaking legit mid-assessment writes
**What goes wrong:** The back-lock predicate `etapa_atual = 'avaliacao_assincrona'` is correct ONLY if the candidate stays in that etapa for the whole assessment. If anything advances etapa mid-session (e.g., a premature trigger), the candidate's next autosave silently fails RLS.
**Why:** The gate is in `WITH CHECK` — a failing autosave returns an RLS violation, not a clean "locked" UX, unless the frontend handles it.
**How to avoid:** (1) Nothing in this phase advances etapa on partial completion (independence: tests saved independently, conclusão parcial permitida). (2) The frontend must catch the RLS error on autosave and surface the neutral "Sua etapa avançou. Esta avaliação foi encerrada e suas respostas já estão salvas." state (UI-SPEC:171). (3) Test BOTH: a legit mid-assessment autosave succeeds while in-etapa; a post-advance autosave is denied.
**Warning signs:** Autosave 403/42501 mid-flow while still in `avaliacao_assincrona`; candidate sees an error toast instead of the neutral locked state.

### Pitfall 4: Never-auto-reject invariant across BOTH SJT types
**What goes wrong:** A `<60%` MC OR a `<13/25` open-case accidentally triggers an etapa change or status='rejeitado'.
**Why:** Easy to conflate `scores_candidato.status='pendente_humano'` with `candidaturas.status`/etapa.
**How to avoid:** Neither the RPC nor the EF may ever write `candidaturas`. The ONLY status they write is `scores_candidato.status`. Add an SQL smoke asserting that after a deliberately-failing score, `candidaturas.etapa_atual` is UNCHANGED and no `historico_candidatura` row was written.
**Warning signs:** A `historico_candidatura` row appears after scoring; `etapa_atual` changed; `status='rejeitado'`.

### Pitfall 5: Trusting client-submitted scores (anti-tamper)
**What goes wrong:** Client posts a `score` or pre-computed weights; server stores them.
**Why:** Convenience.
**How to avoid:** RPC/EF accept ONLY answer identifiers (`opcao_id`s, answer text). They look up weights from `pergunta_opcao_metadata` server-side. The Zod EF body schema must NOT include a score field. Mirror the analise/comparativo pattern: input is untrusted, output is server-derived.
**Warning signs:** EF/RPC signature accepts a numeric score; a manipulated request changes the stored score.

### Pitfall 6: Submit idempotency
**What goes wrong:** Double-submit (network retry, double-click) creates two score rows or double-charges an AI call.
**Why:** No idempotency key.
**How to avoid:** (1) `scores_candidato` `ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id) DO UPDATE` makes re-scoring overwrite, not duplicate — but verify the NULLS-distinct behavior (Pitfall 7). (2) For the open-case EF, pass `callAi`'s `idempotency_key` OR rely on the upsert; the analise EF deliberately does NOT pass idempotency_key (re-process = fresh) [VERIFIED: analise EF:241-246] — decide per the desired UX (re-submit overwrites). (3) Frontend disables the submit button while in-flight (UI-SPEC "Enviando…" disabled).
**Warning signs:** Two `scores_candidato` rows for one candidatura+type; duplicate `ai_call_logs` rows.

### Pitfall 7: UNIQUE with NULL columns (idempotency key)
**What goes wrong:** `UNIQUE (candidatura_id, tipo, subtipo, pergunta_id)` with NULL `pergunta_id`/`subtipo` does NOT prevent duplicates by default (NULL ≠ NULL in standard UNIQUE).
**Why:** SQL standard treats NULLs as distinct in unique constraints.
**How to avoid:** Use `UNIQUE NULLS NOT DISTINCT (...)` (PG15+, Supabase is PG15 — verify) OR coalesce the nullable cols in a unique expression index (e.g., `COALESCE(subtipo,'')`, `COALESCE(pergunta_id,'00000000-...'::uuid)`). The MC row (subtipo='mc', pergunta_id=NULL) needs exactly one row per candidatura.
**Warning signs:** Re-running `pontuar_sjt` inserts a second MC row instead of updating.

### Pitfall 8: D-22 migration push (42601)
**What goes wrong:** The `pontuar_sjt` migration (PL/pgSQL `$$` + adjacent REVOKE/GRANT/COMMENT) trips `SQLSTATE 42601` in the transaction pooler.
**Why:** Documented driver behavior [CITED: CLAUDE.md §Migrations + db push].
**How to avoid:** No-wrapper authoring (no outer BEGIN/COMMIT). Phase 8 proved a clean `db push --linked` is possible with no-wrapper authoring; if it still trips, apply via Supabase MCP `apply_migration`/`execute_sql` or SQL-Editor, then `supabase migration repair --status applied <version>`. Table-only migrations (scores_candidato, respostas_avaliacao, perguntas) usually push clean; the RPC is the at-risk one.
**Warning signs:** `cannot insert multiple commands into a prepared statement` on push.

## Code Examples

### `WorkSampleScoringSchema` (the open-case Zod output — copy verbatim into `_shared/avaliacao-schemas.ts`)
```ts
// Source: docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts:284-316 [VERIFIED]
export const WorkSampleScoringSchema = z.object({
  scenario_understanding: z.object({
    candidate_understood_scenario: z.boolean(),
    scenario_id: z.string(),
    notes: z.string().optional(),
  }),
  dimension_scores: z.array(z.object({
    dimension: z.string(),
    inclusion_criteria_met: z.array(z.string()),
    exclusion_criteria_violated: z.array(z.string()),
    cited_evidence: z.array(Citation).min(0).max(3),
    reasoning: z.string().min(50).max(800),
    score: Score1to5,                                  // z.union([int 1-5, literal 'insufficient_evidence'])
    level: z.union([BarsLevel, z.literal('insufficient_evidence')]),
  })).min(1).max(8),
  overall_score: z.number().int().min(0).max(100),     // NOTE: this is 0-100; the EF derives the 0-25 composite (Pitfall 2)
  recommendation: RecommendationEnum,                  // advance | hold | reject
  confidence: ConfidenceEnum,
  red_flags: z.array(z.string()).max(5),               // → drives <... OR red_flag → pendente_humano
  bias_audit: z.object({
    used_inclusion_exclusion_criteria: z.boolean(),
    no_demographic_proxies_used: z.boolean(),
  }),
});
```
> Note: the schema's own `overall_score` is 0-100. The phase's 0-25 composite (CONTEXT/UI-SPEC) is derived by the EF from the per-dimension 1-5 scores (Pitfall 2) — decide whether to use `overall_score` directly (rescaled /4) or the weighted dimension aggregate. The dentista rubric implies weighted-dimension. **Document the chosen derivation.**

### `testesAplicaveisSchema` extension (Phase-7 schema, add SJT keys)
```ts
// EXTEND src/features/config-vaga/schemas/testesAplicaveisSchema.ts [VERIFIED current shape]
export const testeAplicavelSchema = z.object({
  teste: z.string().min(1),
  obrigatorio: z.boolean(),
  customizado: z.boolean(),
  perguntas: z.array(z.string()).optional(),
  // NEW (D-05, AVAL-01):
  tipo: z.literal('sjt').optional(),
  cargo: z.string().optional(),
  itens_ids: z.array(z.string()).optional(),          // SJT pergunta ids for the battery
  bateria_size: z.number().int().positive().optional(),
  threshold: z.object({
    mc_min_pct: z.number().default(60),
    case_min: z.number().default(13),
    flag_on_atencao: z.boolean().default(true),
  }).optional(),
});
```
**Source for the extension shape:** PRD-sjt §8.2 [VERIFIED: PRD line 150].

### Candidate container route (RoleGuard pattern)
```tsx
// src/router/routes.tsx — add after the existing candidato routes [VERIFIED pattern at :142-189]
{
  path: '/candidato/avaliacao/:candidaturaId',
  element: (
    <RoleGuard role="candidato">
      <AvaliacaoContainer />
    </RoleGuard>
  ),
},
```

### SJT seed (from `banco-sjt-*.md` → migration)
```sql
-- Per cargo, seed perguntas + pergunta_opcao_metadata (scale: fortemente_pontua=4,pontua=2,neutro=1,atencao=0)
-- Source markdown: docs/conhecimento/sjt/banco-sjt-dentista.md (3 MC + 1 case) [VERIFIED]
INSERT INTO public.perguntas (id, tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, content_hash, status)
VALUES (gen_random_uuid(), 'sjt', 'dentista', 'D6_humanizacao',
        'Você realiza uma extração de terceiro molar inferior quando...', 'mc', 5,
        encode(extensions.digest('sjt:dentista:D1:v1.0', 'sha256'),'hex'), 'active');
-- then 4 pergunta_opcao_metadata rows for that pergunta (tag/peso per the markdown table)
```
> The 8 cargos with banks: dentista, recepcao, consultor-vendas, sdr-social-seller, assistente-financeiro, asb-tsb (shared), vaga-generica [VERIFIED: `docs/conhecimento/sjt/` listing + README.md:14-21]. Formats: dentista/consultor/sdr/assistente = híbrido (MC + 1 case); recepcao = 5 MC; asb-tsb = 2 MC shared; vaga-generica = 3 MC.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-test score columns on `candidaturas` (legacy `analise_ia_bigfive`, `analise_ia_cultura`, ... jsonb columns) | Generic `scores_candidato` table (tipo enum + metadata jsonb) | This phase | Designed once, reused P12-15; the legacy `analise_ia_*` columns on `candidaturas` [VERIFIED: database.types.ts:751-757] are M1 cruft NOT used by M2 — do not write to them |
| Manual RH "lê tudo no olho" (no structured scoring) | Deterministic Σ pesos (MC) + BARS-rubric AI (open-case) | M2 design | Defensible, comparable scores per PRD problem statement [CITED: PRD-sjt:25] |
| `sync-sjt.ts` hybrid CI hydration | Seed-direct migration (V1) | This phase (D-05) | Hybrid deferred to V2; the prompt-library hybrid pattern is the proven precedent for V2 |

**Deprecated/outdated:**
- `sjt_evaluation` call_type in `SCHEMA_VERSIONS` — stray/dead; the real key is `work_sample_sjt` (Pitfall 1).
- `candidaturas.analise_ia_*` jsonb columns — M1 legacy; M2 uses `analise_candidato_vaga` (Phase 10) + `scores_candidato` (this phase).

## Validation Architecture

> nyquist_validation enabled (config absent = enabled). Frontend = Vitest; EFs = `deno test`; DB = SQL smokes (the project's established 3-layer pattern across Phase 6-10).

### Test Framework
| Property | Value |
|----------|-------|
| Frontend framework | Vitest (`npm run test:run`); RTL for components [VERIFIED: package.json:101-104] |
| EF framework | `deno test` with dependency-injected mocks (no real SDK/network) [VERIFIED: comparativo `__tests__/index.test.ts`] |
| DB framework | SQL smokes (manual SQL via Supabase MCP `execute_sql` / `db query --linked`; `set_config('request.jwt.claims',...)` to simulate candidato/RH roles — Phase 7/8 precedent) |
| E2E | Playwright (`npm run test:e2e`) — promote container happy-path |
| Quick run | `npm run test:run` (frontend) / `deno test supabase/functions/avaliar-redacao` (EF) |
| Full suite | `npm run test:run && npm run build` (lint baseline zero-growth) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AVAL-01 | Container lists pending tests; ordem livre; partial save | vitest (RTL) | `npm run test:run -- AvaliacaoContainer` | ❌ Wave 0 |
| AVAL-01 | testesAplicaveis SJT-key extension parses | vitest | `npm run test:run -- testesAplicaveisSchema` | ⚠️ extend existing |
| AVAL-01 | route guarded + happy path | playwright | `npm run test:e2e -- avaliacao` | ❌ Wave 0 |
| AVAL-02 | `pontuar_sjt` Σ pesos correct + `<60%`→pendente_humano + atencao flag | SQL smoke | manual SQL (fixture candidatura + perguntas) | ❌ Wave 0 |
| AVAL-02 | RPC does NOT change etapa / no historico row (RNF-07a) | SQL smoke | manual SQL assert | ❌ Wave 0 |
| AVAL-02 | RPC rejects non-owner / wrong-etapa (42501) | SQL smoke | `set_config request.jwt.claims` as other user | ❌ Wave 0 |
| AVAL-03 | EF authz: candidate not owning candidatura → 403 | deno | `deno test avaliar-redacao` (C1 case, mock) | ❌ Wave 0 |
| AVAL-03 | EF authz: wrong etapa → 403 | deno | same | ❌ Wave 0 |
| AVAL-03 | EF 1-5→0-25 mapping + `<13 OR red_flag`→pendente_humano | deno | mocked callAi returning fixed dims | ❌ Wave 0 |
| AVAL-03 | EF never writes candidaturas.etapa_atual | deno | assert no etapa write in mock | ❌ Wave 0 |
| AVAL-09 | etapa-gate RLS: in-etapa autosave OK; post-advance denied | SQL smoke | `set_config` candidato JWT, two etapa states | ❌ Wave 0 |
| AVAL-09 | candidato denied SELECT on scores_candidato; RH allowed | SQL smoke | `set_config` candidato vs RH | ❌ Wave 0 |
| AVAL-09 | autosave hook debounces + flushes 30s | vitest | `npm run test:run -- useAutosaveAvaliacao` | ❌ Wave 0 |
| LGPD-04 | candidate copy/seed has no forbidden term | grep guard | existing `pitfall7`/LGPD-04 grep test | ⚠️ extend paths |

### Sampling Rate
- **Per task commit:** `npm run test:run -- <touched module>` (frontend) or `deno test <ef>` (EF).
- **Per wave merge:** full `npm run test:run && npm run build`; run the SQL smokes against a fixture candidatura.
- **Phase gate:** full suite green + all SQL smokes pass + EF deno tests pass before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx` — AVAL-01
- [ ] `src/features/avaliacao/hooks/__tests__/useAutosaveAvaliacao.test.ts` — AVAL-09 debounce
- [ ] `supabase/functions/avaliar-redacao/__tests__/index.test.ts` — AVAL-03 (authz 401/403 + mapping + never-etapa); clone `comparativo-candidatos/__tests__/index.test.ts` C1 cases
- [ ] `supabase/functions/_shared/avaliacao-schemas.ts` — WorkSampleScoringSchema copy + EF body schema
- [ ] SQL smoke runbook (`11-VALIDATION.md`) — `pontuar_sjt` scoring/threshold/authz, etapa-gate RLS, scores_candidato RLS, never-auto-reject
- [ ] Extend `testesAplicaveisSchema.test.ts` for SJT keys
- [ ] Extend the LGPD-04/pitfall7 grep guard paths to include `src/features/avaliacao/` + the SJT seed migration

## Security Domain

> `security_enforcement` enabled (absent = enabled). This phase has high-sensitivity surfaces: candidate-invoked AI scoring, PII in scores, etapa-gated access.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Two-client EF (D-23); SECURITY DEFINER RPC with explicit ownership check |
| V2 Authentication | yes | EF gateway JWT verify ON (candidate-invoked); RPC `auth.uid()` GUC |
| V4 Access Control | **yes (primary)** | RLS etapa-gate + ownership; EF authenticate-then-authorize (C1 403); RPC `42501` on non-owner; scores_candidato candidato-DENY |
| V5 Input Validation | yes | Zod EF body schema (no score field); `pontuar_sjt` accepts only ids; `callAi` runs injection detection + maskPII on untrusted answer text |
| V6 Cryptography | no | No new crypto; content_hash via existing `extensions.digest` |
| V7 Error Handling/Logging | yes | Redacted logs (ids/counts only — Pitfall 7); `ai_call_logs` masked by `callAi` |
| V8 Data Protection (PII) | **yes** | Allowlist projection (never `select('*')`); candidate never reads scores; answer text masked before AI |

### Known Threat Patterns for {Supabase RLS + candidate-invoked EF + AI scoring}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: candidate scores/reads another's candidatura | Elevation/Info | EF authorize ownership → 403 (C1); RPC `auth.uid()` ownership → 42501; RLS own-row [VERIFIED: comparativo C1 pattern] |
| Back-lock bypass: write progress after etapa advanced | Tampering | etapa-gate in RLS `WITH CHECK` + RPC/EF re-assert `etapa_atual='avaliacao_assincrona'` |
| Score tampering: client posts a forged score | Tampering | Server computes score from `pergunta_opcao_metadata`; client posts only answer ids/text; Zod body has no score field |
| PII leak via `select('*')` | Info disclosure | Explicit column allowlist on every candidatura/scores read [VERIFIED: analise EF:167; `reference_select_star_leaks_pii`] |
| Prompt injection via open-case answer text | Tampering | `callAi` runs `detectPromptInjection` + `maskPII` before the API; injection → low-score stub flagged for human review (never scored as success) [VERIFIED: ai-client.ts:20-23] |
| Auto-rejection by score (LGPD/EEOC) | (compliance) | Scoring writes `scores_candidato.status` only; NEVER `candidaturas.etapa_atual`; SQL smoke asserts no etapa/historico change (RNF-07a) |
| Cost DoS via repeated open-case submits | DoS | Submit-button disable + upsert idempotency + `callAi` cost log; consider rate-limit if needed (V2) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tipo_score` enum values `sjt/big_five/redacao/entrevista/cognitivo/decisao` cover P12-15 needs | Pattern 1 | If a downstream phase needs another tipo, an `ALTER TYPE ADD VALUE` migration is required (cheap but non-txn). Confirm the full set at plan time against PRD-MASTER §8.2. |
| A2 | Supabase is PostgreSQL 15+ (supports `UNIQUE NULLS NOT DISTINCT`) | Pattern 1, Pitfall 7 | If PG14, use coalesced expression index instead. Verify project PG version via `select version()`. |
| A3 | The `perguntas` table does not yet exist and is created fresh here (PRD says "já existe" but it's NOT in migrations/types) | Standard Stack | If a `perguntas` table was created out-of-band, reconcile rather than CREATE. Verified absent this session [VERIFIED: grep returned nothing], but re-confirm against live DB before CREATE. |
| A4 | `scores_candidato` does not yet exist (PRD §8.2 says "já existe" — it does NOT) | Pattern 1 | Same — verified absent in migrations/types; re-confirm against live DB (the PRD wording is aspirational). |
| A5 | The 0-25 composite is derived from weighted per-dimension 1-5 scores (not the schema's `overall_score` 0-100 / 4) | Pitfall 2, Code Examples | If the team prefers `overall_score`, the mapping differs. The dentista rubric implies weighted-dimension. Confirm with the user/SME at plan time. |
| A6 | `respostas_avaliacao` keyed `(candidatura_id, teste)` is sufficient granularity for autosave | Pattern 2 | If per-pergunta progress is needed, the key/shape changes. The "each test saved independently" decision suggests per-teste is right. |

## Open Questions (RESOLVED)

> All closed during plan-phase; see CONTEXT.md `<post_research>` block.

1. **0-25 composite derivation (insufficient_evidence policy)** — **RESOLVED:** weighted-by-rubric composite (PRD-fiel) — soma ponderada das dimensões (pesos do rubric da pergunta) × score 1-5 escalado p/ 0-25; qualquer dimensão `insufficient_evidence` → `pendente_humano` (não fabrica score). (User decision.)
2. **MC denominator for "60%"** — **RESOLVED:** threshold **per-vaga configurável** via `testes_aplicaveis.threshold.mc_min_pct` (default 60); cada banco/cargo pode sobrescrever (dentista 83% / `<10/12`). Sempre `<threshold OU ≥1 atencao → pendente_humano`. (User decision.)
3. **`work_sample_sjt` prompt activation timing** — **RESOLVED:** seeded `is_active=false`; o flip `is_active=true` em PROD é um passo [BLOCKING] no wave de apply (precedente Phase 10). Plus the call_type is `work_sample_sjt` (not `sjt_evaluation` — orphan key in SCHEMA_VERSIONS).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (live) | migrations + EF deploy | ✓ | PG15 (assumed A2) | — |
| Supabase CLI / MCP | migration apply (D-22) | ✓ | — | SQL-Editor manual + `migration repair` |
| Deno | `deno test` for the EF | ✓ (Phase 9/10 used it) | — | — |
| Anthropic/OpenAI keys | `avaliar-redacao` live scoring | ✓ (Phase 10 EFs) | — | circuit-breaker → gpt-4o-mini fallback (built into callAi) |
| `work_sample_sjt` active prompt | EF open-case scoring | ✗ (seeded inactive) | — | **BLOCKING: activate before live use** |

**Missing dependencies with no fallback:** `work_sample_sjt` prompt activation (one-time manual SQL — BLOCKING checkpoint).
**Missing dependencies with fallback:** AI provider — callAi's circuit breaker falls back to OpenAI automatically.

## Sources

### Primary (HIGH confidence — read this session)
- `supabase/migrations/20260607010001_pergunta_opcao_metadata.sql` — option weight taxonomy (tag/peso/nota_ia), live RLS idiom
- `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` — etapa machine, SECURITY DEFINER + auth.uid() GUC proof
- `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql` — ownership-join RLS idiom, candidato/RH policies
- `supabase/functions/analise-candidato-individual/index.ts` — allowlist projection, callAi usage, never-absent invariant, npm: pin pattern
- `supabase/functions/comparativo-candidatos/index.ts` + `__tests__/index.test.ts` — two-client authenticate-then-authorize (C1 403), deno test authz cases
- `supabase/functions/_shared/{ai-client,prompt-loader,analise-schemas}.ts` — callAi contract, loadPrompt (DB-only, schema-version fail-fast), schema-copy rule
- `docs/conhecimento/prompts/templates/{00-shared-zod-schemas.ts,07-work-sample-sjt.md}` — WorkSampleScoringSchema, work_sample_sjt call_type
- `docs/conhecimento/sjt/banco-sjt-dentista.md` + `README.md` — SJT bank structure, 8 cargos, scale 4/2/1/0, BARS rubric, 0-25 band
- `docs/prds/m2-funil-rh/PRD-sjt-work-sample-odontologia.md` — schema §8.2, threshold, seed-direct vs CI
- `database.types.ts` — etapa_processo/status_candidatura/llm_call_type enums; candidaturas columns; scores_candidato/perguntas absence
- `src/features/config-vaga/schemas/testesAplicaveisSchema.ts` — current shape to extend
- `src/features/cadastro/hooks/useCadastroDraft.ts` — sessionStorage draft pattern
- `src/router/routes.tsx` — RoleGuard candidato route pattern
- `11-CONTEXT.md`, `11-UI-SPEC.md`, `REQUIREMENTS.md`, `CLAUDE.md`

### Secondary (MEDIUM)
- `supabase/migrations/20260609000004_prompt_library_seed.sql` — work_sample_sjt seeded is_active=false

### Tertiary (LOW)
- PostgreSQL 15 `UNIQUE NULLS NOT DISTINCT` — verify project PG version (A2)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all primitives are shipped, verified code; zero new packages.
- Architecture: HIGH — every pattern (RLS idiom, two-client EF, SECURITY DEFINER RPC, generic score sink) is a direct extension of in-production Phase 6/7/9/10 code read this session.
- Pitfalls: HIGH — the `sjt_evaluation` discrepancy, the MC 60%-vs-83% threshold conflict, and the 0-25 mapping ambiguity were all caught by reading the actual seed/template/bank files.

**Research date:** 2026-06-09
**Valid until:** 2026-07-09 (stable — internal codebase patterns; the only external surface is the Anthropic/OpenAI SDK pins already locked)
