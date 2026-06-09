# Phase 12: Big Five + Devolutiva - Research

**Researched:** 2026-06-09
**Domain:** IPIP-NEO-120 server-side scoring (TS-port) + hybrid template+IA devolutiva + candidate Likert questionnaire (glass shell) + RH contextual scorecard
**Confidence:** HIGH (all stack reused from Phase 11/9; item bank + scoring algorithm + 25 templates all on-disk and machine-readable; no external deps)

## Summary

This phase is **overwhelmingly a composition phase, not a discovery phase**. Every infra primitive already exists and shipped: the `scores_candidato` sink (its `tipo_score` enum *already* forward-declares `'big_five'` — no `ALTER TYPE` needed), `respostas_avaliacao` + `useAutosaveAvaliacao` (30s debounce + 42501 back-lock), `get_opcoes_sjt` (the SECURITY DEFINER answer-key-safe reader pattern to mirror), the `avaliar-redacao` EF (the exact two-client C1-authorize-then-act + never-touch-`candidaturas` + neutral-`{ok}` template to copy), the Phase-9 AI infra (`callAi`/`loadPrompt`/audit-logger + git→DB prompt library), and the candidate glass shell + RH allowlist scorecard from Phase 11. The two genuinely new tables are `bigfive_itens` (the seeded 120-item bank, mirroring the SJT bank) and `devolutivas_candidato`.

The **scoring is fully specified and deterministic** — Johnson 2014 algorithm, all 120 PT-BR item texts, the 55 reverse-keyed IDs, the 30-facet→domain map, the T-score→percentile cubic, and band cutoffs are all on-disk (cited below). The single material gap: the **norm table (560 mean/sd values) is NOT inline** in any repo doc — it lives in `five-factor-e/ipipneo/norm.py` and must be transcribed into a constant in the EF (or seeded). This is the one item the planner must task explicitly. The **25 devolutiva band templates are complete and on-disk**, awaiting only CRP-name fill-in before go-live.

**Primary recommendation:** Build two migrations (`bigfive_itens` seeded from the on-disk JSON + facet/reverse formula; `devolutivas_candidato`), two EFs (`submit-bigfive-final` = TS-port scorer copying `avaliar-redacao`'s authorize-then-act skeleton; `gerar-devolutiva-bigfive` = band-template selection + IA polish via a new `bigfive_devolutiva` prompt), a SECURITY DEFINER item reader mirroring `get_opcoes_sjt`, and a 120-item paginated Likert questionnaire + in-app devolutiva view reusing the Phase-11 glass shell + autosave. Transcribe the Johnson norm table into the EF as the one new piece of "data not yet in the repo."

<user_constraints>
## User Constraints (from CONTEXT.md)

> CONTEXT.md is **autonomous-decision mode** — Fernando delegated all decisions while away. There is no "ask the user" loop; the decisions below are LOCKED and the planner must honor them verbatim. Grounded in PRD-bigfive-revisado.md + docs/conhecimento/big-five/ + Phase 11 infra.

### Locked Decisions

**Scoring server-side anti-tamper (AVAL-04 / RF-15):**
- EF `submit-bigfive-final` does the IPIP-NEO-120 TS-port scoring server-side: 5 OCEAN dimensions + 30 facets; reverse-keyed items handled server-side (the scoring/reverse key NEVER goes to the client — answer-key protection, exactly like the SJT). norm_group → percentiles. Persists `scores_candidato` `tipo='big_five'` (reuses the Phase-11 generic table; `tipo` already forward-declared) with `metadata` jsonb (5 dims + 30 facets + percentis + norm_group). **NEVER writes `candidaturas` / never rejects** (RNF-07a — Big Five is contextual). Authorizes: candidate-invoked (JWT), validates `auth.uid()` owns the candidatura + `etapa='avaliacao_assincrona'` before scoring. Client sends only Likert responses (1-5), NEVER a score (`.strict()`).
- **Item bank seed-direct V1:** the 120 IPIP-NEO-120 PT-BR items (public domain, CC0 — from `docs/conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md` / its JSON) seeded in a migration into a dedicated table `bigfive_itens` (item_id, texto, dimensao OCEAN, faceta, reverse_keyed bool, ordem). reverse_keyed/dimensao/faceta = scoring key → NOT exposed to the candidate (candidate reads only item_id + texto via a safe projection, like `get_opcoes_sjt`). Markdown as source; CI sync deferred to V2 (Phase 11 SJT bank precedent).

**Devolutiva D-lite (AVAL-08 / RF-19a/b):**
- EF `gerar-devolutiva-bigfive` — hybrid: 25 official band templates (5 dims × 5 bands) + IA to polish the text (~150-200 words/dim). Reuses Phase-9 infra (ai-client, loadPrompt, audit-logger). New prompt `bigfive_devolutiva` added to the library (git→DB, is_active flip on apply wave). Output: 5 dims + percentile + band (5 levels) + text/dim + LGPD disclaimers. **No CRP nominalization** ("avaliação comportamental", never "teste psicológico"/"diagnóstico" — LGPD-04). Persists new table `devolutivas_candidato`. In-app (candidate sees) + email via n8n (fire-and-forget, non-blocking). **NEVER generates a devolutiva for SJT/Redação** (RF-19b — explicit guard).
- Authz: the devolutiva belongs to the candidate → candidate reads THEIR OWN devolutiva (RLS own-row); RH/admin also read (allowlist). Generation is gated on `scores_candidato` big_five existing.

**UI (candidate + RH):**
- Big Five questionnaire: copy the candidate glass shell (TesteBigFivePage/DashboardCandidato), mobile-first, 120 Likert items paginated (e.g. 12 pages × 10), autosave 30s reusing `useAutosaveAvaliacao` + `respostas_avaliacao` (Phase 11) + back-lock; progress bar; submit → submit-bigfive-final. Candidate does NOT see score during (RNF-07a).
- Devolutiva in-app: respectful view (5 dims, bands, text, disclaimers) in the candidate area.
- RH big_five scorecard: reuse Phase-11 `ScorecardAvaliacao`/allowlist (contextual, role-gated, no `select('*')`); marked CONTEXTUAL (não eliminatório).
- Add the Big Five card to the `/candidato/avaliacao/:id` container (Phase 11).

### Claude's Discretion (Specific Ideas — implementer's call within the locked decisions)
- Reverse-keyed + dim/facet mapping is the Big Five "answer key" → server-side only (mirror SJT answer-key protection).
- Devolutiva tone: respectful, no clinical label, no CRP nominalization; reuse LGPD disclaimers. It is contextual, decides nothing.
- `scores_candidato` big_five metadata: `{ dimensoes:[{dim, raw, percentil, banda}], facetas:[{faceta, raw}], norm_group }`.

### Deferred Ideas (OUT OF SCOPE)
- CI sync of the item bank (markdown→DB) — V2 (seed-direct V1).
- Devolutiva for other tests — out of scope (RF-19b: Big Five only).
- n8n email pipeline beyond the fire-and-forget webhook — peripheral.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **AVAL-04** | Big Five IPIP-NEO-120 PT-BR (120 Likert items) — TS-port server-side scoring anti-tampering via `submit-bigfive-final`; 5 OCEAN dims + 30 facets + norm_group; persists `scores_candidato` `tipo='big_five'` with `metadata` jsonb [RF-15] | Scoring algorithm fully specified (Pattern Map §Scoring; reverse-key + facet map + cubic on-disk). EF skeleton = `avaliar-redacao` copy. `scores_candidato` + `tipo='big_five'` already exist. Norm table is the one gap (must transcribe — Open Q1). |
| **AVAL-08** | Big Five D-lite devolutiva (hybrid 25 official templates + IA; 5 dim + percentile + 5 bands + ~150-200 words/dim + LGPD disclaimers without CRP nominalization) via `gerar-devolutiva-bigfive`; in-app + email (n8n); persists `devolutivas_candidato`. **Never** a devolutiva for SJT/Redação [RF-19a, RF-19b] | 25 templates on-disk and complete (templates-devolutiva.md). Hybrid prompt pattern + Zod-validated output = Phase-9 `loadPrompt`/`callAi`. RF-19b guard = `tipo='big_five'` precondition. New `devolutivas_candidato` table + `bigfive_devolutiva` prompt. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 120 Likert questionnaire render + autosave | Browser / Client (React) | Frontend autosave hook → DB | Pure UI + 30s debounced upsert; copies the Phase-11 candidate flow exactly |
| Item bank read (item_id + texto only) | Database (SECURITY DEFINER RPC) | — | The scoring key (reverse/dim/facet) must never reach the client → projection enforced in DB, mirror `get_opcoes_sjt` |
| Scoring (reverse + facet/domain sum + T + percentile) | API / Backend (Edge Function) | — | Anti-tamper: client sends only 1-5 answers; the EF re-scores server-side. Never trust client math (Pitfall: SJT lesson). |
| Persist `scores_candidato` big_five | API / Backend (EF via service_role) | Database (RLS deny-candidate) | Service-role write; candidate has NO read policy on this table |
| Devolutiva generation (template select + IA polish) | API / Backend (Edge Function) | AI provider (Anthropic via callAi) | Hybrid: deterministic band pick + bounded IA personalization with Zod-validated structured output |
| Persist + read `devolutivas_candidato` | Database (RLS: candidate own-row + RH allowlist) | API/Frontend | The devolutiva is FOR the candidate → own-row read is correct here (unlike `scores_candidato`) |
| RH contextual scorecard | Frontend Server/Client (desktop RH shell) | Database (RH allowlist SELECT) | Reuse Phase-11 `ScorecardAvaliacao` + allowlist; mark CONTEXTUAL |
| Email devolutiva | External (n8n webhook) | — | Fire-and-forget, non-blocking — never gates the in-app response |

## Standard Stack

Everything is **already in the project** — no new external packages are installed in this phase. The "stack" is the set of existing modules to reuse.

### Core (reused, not installed)
| Module / Asset | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `scores_candidato` table + `tipo_score` enum | live (migration `20260611000001`) | big_five score sink | `'big_five'` already an enum value [VERIFIED: migration line 37] — no `ALTER TYPE` |
| `respostas_avaliacao` + `useAutosaveAvaliacao` | live (Phase 11) | autosave the 120-item draft | 30s debounce + 42501 back-lock already implemented |
| `get_opcoes_sjt` (SECURITY DEFINER) | live (migration `20260611...`) | the answer-key-safe reader pattern to mirror for `bigfive_itens` | candidate reads only safe columns |
| `avaliar-redacao` EF | live (Phase 11) | the C1 authorize-then-act + neutral-payload skeleton to copy | two-client D-23, never touches `candidaturas` |
| `_shared/ai-client.ts` (`callAi`, `loadPrompt`, `resolvedPromptFromLoaded`) | live (Phase 9) | devolutiva IA polish + audit/cost/retry/fallback | never re-implement injection/mask/retry/log |
| Phase-9 prompt library (git→DB via `sync-prompts.ts`) | live | host the new `bigfive_devolutiva` prompt | is_active flip on apply wave |
| Phase-11 glass candidate shell + `ScorecardAvaliacao` + allowlist | live | questionnaire + devolutiva + RH scorecard | persona pattern D-27, no `select('*')` |

### Supporting (reused)
| Module | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `_shared/avaliacao-schemas.ts` (Zod, Deno `npm:zod@3.25.76`) | live | add `SubmitBigfiveFinalBodySchema` + `BigfiveDevolutivaSchema` | shared client↔EF contract test ([[feedback_integration_contract_gap]]) |
| `00-shared-zod-schemas.ts` (prompt-library Zod) | live | the structured-output schema for `bigfive_devolutiva` | new SCHEMA_VERSION entry |
| n8n webhook (fire-and-forget, Phase 4 precedent) | live | email devolutiva | non-blocking after persist |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TS-port scorer inline in EF | Python `five-factor-e` microservice | PRD §9.2 prefers Python for embedded norms, BUT this project has no Python runtime — Deno EF + transcribed norms is the only fit. Decision: **TS-port** (CONTEXT-locked). |
| Seed `bigfive_itens` from the on-disk JSON | Hardcode items in the EF | A table lets the candidate read texts via RLS-safe RPC + keeps the key server-side; matches the SJT bank precedent. Decision: **table** (CONTEXT-locked). |
| BFI-2 (60 items, BR-validated) | — | Plan B per PRD; the schema is instrument-agnostic so a pivot is 1-2 days. NOT this phase. |

**Installation:** None. No `npm install`, no new Deno `npm:` specifiers. The Anthropic/OpenAI SDK pins (`@anthropic-ai/sdk@0.102.0`, `openai@6.42.0`, `npm:zod@3.25.76`) are already wired in `avaliar-redacao` and reused verbatim.

## Package Legitimacy Audit

> **Not applicable — no external packages installed in this phase.** All dependencies are existing project modules and the already-pinned, already-deployed AI SDKs from Phase 9/11. slopcheck/registry verification N/A: the AI SDK pins were verified live in Phase 9 (`npm view` confirmed `@anthropic-ai/sdk@0.102.0` / `openai@6.42.0` / `zod@3.25.76` per STATE.md Plan 09-05) and re-verified at Phase-11 deploy time.

| Package | Registry | Disposition |
|---------|----------|-------------|
| (none new) | — | Phase installs zero new packages |

## Architecture Patterns

### System Architecture Diagram

```
CANDIDATE BROWSER (glass shell, mobile-first)
  │
  │  GET items (item_id + texto ONLY — no key)
  ▼
[bigfive_itens reader RPC]  ──SECURITY DEFINER──►  bigfive_itens (texto, + dim/faceta/reverse HIDDEN)
  │
  │  answer 1-5 per item, 12 pages × 10
  ▼
useAutosaveAvaliacao (30s debounce) ──upsert──►  respostas_avaliacao (own-row RLS, 42501 back-lock)
  │
  │  submit: POST { candidatura_id, respostas: {item_id:1..5}[120] }   (NO score — .strict)
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ EF submit-bigfive-final  (two-client D-23, JWT-ON)                 │
│  1. auth.getUser() (anon+JWT)                                      │
│  2. AUTHORIZE: auth.uid() owns candidatura AND etapa='avaliacao_   │
│     assincrona'  → else 403  (service_role bypasses RLS)           │
│  3. Validate body Zod .strict (shape + 1..5 range, all 120 present)│
│  4. SCORE (TS-port): reverse 55 items → 30 facet raw → 5 domain    │
│     raw → T-score (norm_group) → percentile (cubic) → band         │
│  5. INSERT scores_candidato tipo='big_five' metadata jsonb         │
│     ── NEVER touches candidaturas (RNF-07a) ──                     │
│  6. call gerar-devolutiva-bigfive (inline, gated on the score row) │
│  7. fire n8n email webhook (fire-and-forget)                       │
│  8. return NEUTRAL { ok:true } (+ devolutiva_id)  — never a score  │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│ EF gerar-devolutiva-bigfive                                        │
│  guard: scores_candidato.tipo MUST be 'big_five' (RF-19b)          │
│  for each of 5 dims: band = bandOf(percentil); load template       │
│  loadPrompt('bigfive_devolutiva') → callAi (Sonnet, structured     │
│  output, Zod-validated, audit/cost/log) → 150-200 words/dim        │
│  retry 1× if word-count out of range; else graceful = raw template │
│  INSERT devolutivas_candidato conteudo_jsonb + audit fields        │
└──────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┴───────────────────────────┐
        ▼                                                      ▼
CANDIDATE in-app devolutiva view                    RH desktop scorecard (allowlist)
(devolutivas_candidato own-row RLS)                 (scores_candidato RH SELECT,
 5 dims + band + percentil + text                    marked CONTEXTUAL, SugestaoIABadge,
 + LGPD/emotional disclaimers)                       NEVER select('*'))
```

### Recommended Project Structure
```
supabase/
├── migrations/
│   ├── 2026XXXX_bigfive_itens.sql        # table + seed 120 + reader RPC + RLS (D-22 no-wrapper)
│   └── 2026XXXX_devolutivas_candidato.sql # table + RLS (own-row candidate + RH allowlist)
├── functions/
│   ├── submit-bigfive-final/index.ts     # copy avaliar-redacao skeleton; TS-port scorer
│   ├── gerar-devolutiva-bigfive/index.ts # template select + callAi polish
│   └── _shared/
│       ├── bigfive-scoring.ts            # REVERSED_ITEMS, FACET_TO_DOMAIN, norm table, score()
│       └── avaliacao-schemas.ts          # ADD SubmitBigfiveFinalBodySchema + BigfiveDevolutivaSchema
docs/conhecimento/prompts/templates/
│   └── 08-bigfive-devolutiva.md          # new prompt (git→DB, is_active flip on apply)
src/features/avaliacao/
├── components/
│   ├── BigFiveQuestionnaireScreen.tsx    # 120-item paginated Likert (glass shell)
│   ├── DevolutivaBigFiveView.tsx         # in-app 5-dim devolutiva view
│   └── ScorecardBigFive.tsx (or extend ScorecardAvaliacao) # RH contextual
├── hooks/  (reuse useAutosaveAvaliacao, useAvaliacaoDraft)
├── services/
│   ├── bigfiveService.ts                 # getBigfiveItens, submitBigfiveFinal, loadDevolutiva
│   └── (extend scoresRhService allowlist for big_five rows)
└── schemas/bigfiveSchema.ts              # client Likert schema (1..5, 120 items)
```

### Pattern 1: Authorize-then-act EF (copy `avaliar-redacao` exactly)
**What:** Two-client (D-23): `supabaseUser` (anon + Authorization) ONLY for `auth.getUser()`; `supabaseAdmin` (service_role) for all privileged reads/writes. Because service_role bypasses RLS, the EF MUST verify ownership + etapa BEFORE touching data.
**When to use:** `submit-bigfive-final` (candidate-invoked). `gerar-devolutiva-bigfive` is invoked internally by the submit EF (still re-validate the score row precondition).
**Example:**
```typescript
// Source: supabase/functions/avaliar-redacao/index.ts:154-191 (verbatim skeleton)
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;
// ... Zod .safeParse(raw) → 400 VALIDATION on fail ...
const { data: candRow } = await supabaseAdmin.from("candidaturas")
  .select("id, candidato_id, vaga_id, etapa_atual")        // allowlist, never *
  .eq("id", body.candidatura_id).maybeSingle();
if (!candRow || candRow.candidato_id !== user.id) return errorResponse("FORBIDDEN", "Acesso negado.", 403);
if (candRow.etapa_atual !== "avaliacao_assincrona") return errorResponse("FORBIDDEN", "Acesso negado.", 403);
// ... score ... insert scores_candidato ... return { ok: true } (NEVER candidaturas, NEVER a score)
```

### Pattern 2: IPIP-NEO-120 TS-port scorer (deterministic, fully specified)
**What:** Port the Johnson 2014 algorithm to TS. All constants are on-disk except the norm table.
**Example:**
```typescript
// Source: PESQUISA-big-five-ipip-neo-120-ptbr.md §5.3-5.5 (lines 285-413)
const REVERSED = new Set([ // 55 reverse-keyed item ids (lines 289-294)
  51,81,96,101,106,111,116,           // N
  62,67,92,97,102,107,                // E
  48,53,68,73,78,83,88,98,103,108,113,118, // O
  9,19,24,39,49,54,69,74,79,84,89,94,99,104,109,114,119, // A
  30,40,60,70,75,80,85,90,100,105,110,115,120,           // C
]);
const facetOf = (id: number) => ((id - 1) % 30) + 1;       // line 205 / 353
const FACET_TO_DOMAIN: Record<number,'O'|'C'|'E'|'A'|'N'> = { /* §5.5 lines 342-348 */ };
const reverse = (v: number) => 6 - v;                       // line 282
// percentile cubic (line 358): clamp(1,99, 210.335958661391 - 16.7379362643389*T
//   + 0.405936512733332*T**2 - 0.00270624341822222*T**3)
// T = 50 + 10*(raw - mean_norm)/sd_norm  (line 306)  ← norm_group mean/sd
// band(percentil): ≤15 muito_baixo | 16-35 mod_baixo | 36-64 medio | 65-84 mod_alto | ≥85 muito_alto
```

### Pattern 3: Hybrid template + IA devolutiva (Phase-9 `loadPrompt`/`callAi`)
**What:** Deterministically pick 1 of 25 band templates per dimension, then ask the IA to ONLY personalize (name/cargo/percentil) — never invent. Validate the output via Zod; retry 1× on word-count miss; graceful-degrade to the raw template.
**When to use:** `gerar-devolutiva-bigfive`.
**Example:**
```typescript
// Source: PRD-bigfive-revisado.md RFB-13..RFB-17 + templates-devolutiva.md
// band cutoffs are explicit in templates-devolutiva.md (≤15 / 16-35 / 36-64 / 65-84 / ≥85)
const loaded = await loadPrompt("bigfive_devolutiva", supabaseAdmin);     // git→DB active row
const resolved = resolvedPromptFromLoaded(loaded, "bigfive_devolutiva", "gpt-4o-mini");
const result = await callAi({ prompt: resolved, rawInput: officialTemplateForBand,
  schema: BigfiveDevolutivaSchema, candidato_id, vaga_id }, { anthropic, openai, supabase: supabaseAdmin });
```

### Anti-Patterns to Avoid
- **Client-side scoring or client-sent scores.** The client posts ONLY `{item_id: 1..5}[120]`. The body schema is `.strict()` and has no score field. Re-score server-side. (Mirrors the SJT answer-key lesson.)
- **Exposing dim/faceta/reverse_keyed to the candidate.** The questionnaire reads ONLY `item_id` + `texto` + `ordem`. The scoring key columns are never in the candidate-facing projection (RPC, like `get_opcoes_sjt`).
- **Writing `candidaturas` / changing etapa from the score.** Big Five is contextual. No auto-advance, no auto-reject, no `pendente_humano` threshold either (it is non-eliminatory — see Open Q3). Never (RNF-07a / LGPD-02).
- **`select('*')` on `scores_candidato` or `devolutivas_candidato`.** RLS is row-level only; it does not hide columns ([[reference_select_star_leaks_pii]]). Use explicit allowlists.
- **Generating a devolutiva for a non-big_five score.** RF-19b: guard on `tipo='big_five'` before generating.
- **Re-implementing injection/mask/retry/cost/log.** `callAi` already does all of it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 30s autosave + back-lock | a new debounce hook | `useAutosaveAvaliacao` (Phase 11) | 42501 back-lock + sessionStorage buffer + unmount flush already correct |
| Answer-key-safe item read | a candidate `select` with column omission | a `get_bigfive_itens` SECURITY DEFINER RPC (mirror `get_opcoes_sjt`) | RLS can't hide columns; an RPC enforces the projection |
| EF auth + IDOR + etapa gate | new auth code | copy `avaliar-redacao`'s authorize-then-act block | C1 lesson already battle-tested live |
| AI call (injection/mask/retry/fallback/cost/audit) | direct Anthropic SDK calls | `callAi` (Phase 9) | LGPD/cost/circuit-breaker all handled |
| Prompt versioning + activation | a new prompts mechanism | the git→DB `sync-prompts.ts` + is_active flip | hybrid pattern locked in Phase 9 |
| RH score read | a fresh query | `scoresRhService` allowlist + `ScorecardAvaliacao` | no `select('*')`, role-gated, SugestaoIABadge |
| Devolutiva interpretive text | LLM free-generation | the 25 curated CRP-reviewed band templates | LGPD/CFP-safe wording; IA only personalizes |

**Key insight:** This phase has almost no "new code surface" beyond the scorer math + two tables + one prompt + the questionnaire UI. The risk is not invention — it is **faithfully copying the established patterns** and **transcribing the scoring data correctly** (the reverse-key list is the #1 bug source).

## Pattern Map

> Analog files + line-cited excerpts the planner/executor copies. All paths absolute-from-repo-root.

### Scoring source-of-truth (the data the EF needs)
| Need | File | Lines | Note |
|------|------|-------|------|
| 120 PT-BR item texts (machine-readable) | `docs/conhecimento/big-five/fontes/ipip-neo-120-questions-pt-br.json` | full (id 1-120 + `select` 1-5 labels) | **THE seed source.** Genuine PT-BR. Likert labels: "Muito inadequado" → "Muito adequado". |
| 120 EN items (cross-check) | `docs/conhecimento/big-five/fontes/ipip-neo-120-questions-en.json` | full | optional validation pass |
| 55 reverse-keyed IDs | `docs/conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md` | 285-294 (table) + 329-340 (Python set) | **#1 correctness item.** Per-domain: N{51,81,96,101,106,111,116} E{62,67,92,97,102,107} O{48,53,68,73,78,83,88,98,103,108,113,118} A{9,19,24,39,49,54,69,74,79,84,89,94,99,104,109,114,119} C{30,40,60,70,75,80,85,90,100,105,110,115,120} |
| faceta(item) formula | same | 205-249 (table) | `faceta = ((id-1) % 30) + 1`; each facet has 4 items; 30 facets → ordered N,E,O,A,C cycling |
| 30-facet → domain map | same | 218-249 (named) + 342-348 (FACET_TO_DOMAIN) | facets at pos 1,6,11,16,21,26=N; 2,7,...=E; 3,8,...=O; 4,9,...=A; 5,10,...=C |
| reverse / T-score / percentile cubic | same | 282 (reverse), 304-314 (T + cubic coeffs), 316-319 (band) | cubic coeffs at line 358-361 |
| Full Python reference scorer | same | 321-413 | port verbatim to TS |
| Norm table strategy + where it lives | same | 416-429 | **NOT inline.** 560 values in `five-factor-e/ipipneo/norm.py` (8 groups × [5 dom mean+5 sd + 30 facet mean+30 sd]). Use Johnson 2014 international norms V1 (Open Q1). |
| `metadata` jsonb shape | `12-CONTEXT.md` | 57 | `{ dimensoes:[{dim,raw,percentil,banda}], facetas:[{faceta,raw}], norm_group }` |
| Likert intro copy (PT-BR) | PESQUISA md | 977-979 | "Descreva-se com sinceridade..." |

### Devolutiva source-of-truth
| Need | File | Lines | Note |
|------|------|-------|------|
| 25 band templates (5 dim × 5 band) | `docs/conhecimento/big-five/templates-devolutiva.md` | 48-281 | **Complete + CRP-reviewed-pending.** Band headers e.g. "O — Muito Baixo (percentil ≤ 15)". |
| Band cutoffs | same | 53/61/69/77/85 (per dim) | ≤15, 16-35, 36-64, 65-84, ≥85 (consistent across all 5 dims) |
| Fixed header / emotional disclaimer | same | 24-44 | rendered at top; `[PERCENTIL]`/`[ANALOGIA]`/`[CARGO_GENERICO]` placeholders |
| LGPD/CFP footer disclaimer | same | 42-44 | "self-assessment de estilo de trabalho — não é teste psicológico" + CRP responsible |
| "Sensibilidade Emocional" rename rule (N, not "Neuroticismo") | same | 241 | LGPD-04: avoid pathological term |
| IA instruction rules (never invent, 150-200 words, no clinical claims) | same | 10-21 | the system-prompt content for `bigfive_devolutiva` |
| Devolutiva audit fields + Zod output shape | `docs/prds/m2-funil-rh/PRD-bigfive-revisado.md` | 117, 233 (RFB-15 schema), 117/235 (audit) | `{cabecalho:{nome,dashboard:[{dim,percentil,banda}]×5}, paginas:[{dim,banda,percentil,texto_interpretativo,palavras}]×5, disclaimer_emocional, disclaimer_lgpd_crp}` |
| Layout/delivery contract (5 pages, in-app + email, latency P95≤5s) | same | 65, 109, 243-246 | RFB-20..24 |

### Code analogs to copy
| Need | File | Lines | Note |
|------|------|-------|------|
| EF authorize-then-act skeleton | `supabase/functions/avaliar-redacao/index.ts` | 148-324 | the EXACT template for `submit-bigfive-final`; copy CORS/errorResponse/two-client/Deno.serve too |
| Deno.serve prod wiring (SDK pins) | same | 330-363 | `@anthropic-ai/sdk@0.102.0` / `openai@6.42.0` runtime `npm:` join trick |
| Never-absent + neutral payload | same | 242-315 | how to handle ia-null / flagged → status; always `{ ok:true }` to client |
| `scores_candidato` schema + RLS | `supabase/migrations/20260611000001_scores_candidato.sql` | 35-91 | `tipo='big_five'` already in enum (37); candidate NO read policy; RH SELECT uses `'administrador'` not `'admin'` (88) |
| `get_opcoes_sjt`-style safe reader | `src/features/avaliacao/services/avaliacaoService.ts` | 158-191 (`getOpcoesSjt`) + EF/RPC | mirror for `getBigfiveItens` — RPC returns only safe cols |
| Autosave hook (reuse as-is) | `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts` | full (1-143) | `teste='big_five'`; back-lock isBackLock 42501/403 |
| `upsertResposta` / `respostas_avaliacao` write | `avaliacaoService.ts` | 232-244 | onConflict `candidatura_id,teste` |
| Client submit + LOCKED mapping | `avaliacaoService.ts` | 251-322 (`pontuarSjt`/`avaliarRedacao`) | model `submitBigfiveFinal` on these (neutral ack, 42501→LOCKED throw) |
| RH allowlist scorecard | `src/features/avaliacao/services/scoresRhService.ts` | 86-107 (`SCORES_ALLOWLIST`) + `ScorecardAvaliacao.tsx` | extend allowlist/types for big_five metadata; never `'*'` |
| Prompt template structure (frontmatter + system/user) | `docs/conhecimento/prompts/templates/07-work-sample-sjt.md` | 1-40 | model the `08-bigfive-devolutiva.md` frontmatter on this |
| Shared Zod schemas (prompt-library) | `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts` | header + SCHEMA_VERSIONS | add `BigfiveDevolutivaSchema` + version |
| EF body/scoring Zod | `supabase/functions/_shared/avaliacao-schemas.ts` | `AvaliarRedacaoBodySchema`, `WorkSampleScoringSchema` | add `SubmitBigfiveFinalBodySchema` (.strict, 120×1-5) |
| Routes registration | `src/router/routes.tsx` | 200-228 (avaliacao container + mc/caso) | add `/candidato/avaliacao/:candidaturaId/bigfive` + `/devolutiva`; the legacy `/testes/bigfive` (236) is a DEV-only legacy page — do NOT reuse for the production flow |
| Glass candidate shell to copy | `src/components/pages/DashboardCandidatoPage.tsx` (per UI-SPEC L30) | — | BackgroundImage gradient + sticky glass navbar + GlassCard |

### NOT a source (avoid confusion)
| File | Why NOT |
|------|---------|
| `docs/conhecimento/big-five/Big Five.md` | This is the **100-item BFAS** instrument (Jordan Peterson / understandmyself.com style, EN, "page 1 of 10"), NOT the 120-item IPIP-NEO. It is referenced only as a *devolutiva quality model* (PRD L12/38). Do not seed items from it. |
| `report big five.pdf` | A sample BFAS report — devolutiva quality reference only. |
| `src/components/pages/TesteBigFivePage.tsx` + `respostas_bigfive` (legacy) | Pre-M2 legacy DEV page. CONTEXT says "avaliar se reusa ou cria limpo" — recommend **create clean** in `src/features/avaliacao/` (consistent with Phase 11) and leave the legacy page untouched/DEV-gated. |

## UI Notes

> Frontend phase; we are skipping the dedicated UI-SPEC round to conserve context. This is the visual/interaction contract, grounded in the Phase-11 UI-SPEC (`11-UI-SPEC.md`) + the Beauty Smile glass brand. **The candidate NEVER sees a score, threshold, or pass/fail during the questionnaire (RNF-07a).** The devolutiva is the ONE place the candidate sees percentiles — and only their own, framed respectfully.

### Inherited contract (from `11-UI-SPEC.md` — do not re-derive)
- **Shell:** copy `DashboardCandidatoPage.tsx` — `BackgroundImage background="gradient"` over `bg-[#00109E]` solid base, sticky glass navbar (avatar + nome + email + Sair), `BeautySmileLogo`, `GlassPanel`/`GlassCard` (`variant="white"`). Do NOT introduce a new shell (D-27).
- **Glass primitives:** `Glass`, `GlassPanel`, `GlassCard`, `GlassButton` from `src/components/ui/glass.tsx`. White text + `drop-shadow-md` over the gradient.
- **shadcn in scope:** `radio-group`, `progress`, `badge`, `button`, `alert-dialog`, `skeleton`, `card`, `label` + Sonner toast — all already vendored.
- **Type:** Helvetica Neue, 4 sizes / 2 weights (400 body, 600 titles). Body/option = 16px @ 1.5; mobile min font 16px.
- **Color:** dominant `#00109E` gradient, secondary `bg-white/5..20` glass, accent `#35BFAD` **reserved** for the "Salvo automaticamente" affordance + completed-test check + (RH-only) `SugestaoIABadge`. Accent is NOT used for CTA/selection. Destructive `#EF4444` icon-only.
- **Touch targets ≥44px** (radio rows pad to `min-h-[44px]`).
- **Copy rule (LGPD-04):** "avaliação comportamental", NEVER "teste psicológico". Neutral, reassuring; no scores/thresholds/pass-fail in candidate copy.

### Screen 1 — Big Five questionnaire (`/candidato/avaliacao/:candidaturaId/bigfive`)
- **Pagination:** 12 pages × 10 items (CONTEXT). Each item = the statement (`text-base`, 16px) + a 5-point Likert `radio-group` row using the JSON's PT-BR labels: **Muito inadequado · Relativamente inadequado · Nem adequado, nem inadequado · Relativamente adequado · Muito adequado** (`ipip-neo-120-questions-pt-br.json` `select`). Selected option = glass-white (`bg-white/30`), NOT accent.
- **Progress:** `progress` bar across the top, "{respondidas}/120" — neutral count, no score. Page nav: **Voltar** / **Avançar**; last page → **Concluir avaliação** (alert-dialog confirm: "Enviar avaliação? Após enviar, você não poderá editar suas respostas." — Confirm "Enviar" / Cancel "Revisar", per UI-SPEC L179).
- **Autosave affordance** (top-right, persistent, per UI-SPEC L146-154): Saving… (`Loader2` spin, `text-white/70`) → **Salvo automaticamente** (`Check` `#35BFAD`, fades in) → transient fail "Não foi possível salvar agora — tentando novamente…". Fires on 30s debounce + on page change.
- **Intro screen (page 0):** the PESQUISA intro copy (L977-979) + the emotional disclaimer (templates-devolutiva.md L28). Frame as "avaliação comportamental" / "self-assessment de estilo de trabalho".
- **Submitting:** CTA → "Enviando…" disabled + spinner; inputs disabled. Success → `toast.success("Avaliação enviada com sucesso")` → route to the devolutiva view (or container with the big_five card now Concluído).
- **Back-lock / wrong-etapa states** (verbatim from UI-SPEC L165-171): "Esta avaliação já foi enviada." / "Esta avaliação não está disponível." / "Sua etapa avançou." — neutral, `Lock` icon, never alarming.
- **Validation gate:** **Concluir** disabled until all 120 answered (the EF also rejects partial via `.strict`, defense-in-depth).

### Screen 2 — In-app devolutiva (`/candidato/avaliacao/:candidaturaId/bigfive/devolutiva`)
- **Header dashboard** (mirrors templates-devolutiva.md L30-40 + PRD RFB-21): 5 rows — dimension name + **percentil cru numérico** + band label + a proportional `progress`/bar. Order: Abertura à Experiência, Conscienciosidade, Extroversão, Amabilidade, **Sensibilidade Emocional** (NOT "Neuroticismo" — L241). Emotional disclaimer rendered above (L28).
- **5 dimension pages/cards** (PRD RFB-20/22): tab (desktop) or swipe (mobile). Each: title "{Dim}: {Banda}" + percentil + analogy "Em um grupo de 100 pessoas, você seria mais [dim] que X e menos que Y" + the ~150-200-word interpretive text from the EF.
- **Footer:** the fixed LGPD/CFP disclaimer (L42-44) on every devolutiva — "não é teste psicológico", CRP responsible, Art. 20 review link.
- **Colors:** neutral/professional, NOT rosa-doce (PRD RFB-22). The percentile is informational, never a red/green judgment.
- **This is candidate-facing percentile** — the ONLY place. Allowed channels are candidate panel + email + RH/CRP panel ONLY (PRD MG-03). Never log it, never put it in aggregate metrics.

### Screen 3 — RH contextual scorecard (desktop RH shell, role-gated)
- Reuse `ScorecardAvaliacao` + the `scoresRhService` allowlist (no `select('*')`). One card per dimension: percentil + band + (optional) the 100-word executive summary (PRD RFB-25).
- **Mark CONTEXTUAL / não-eliminatório** explicitly. Carry the `SugestaoIABadge` ("Sugestão da IA — decisão é sempre humana") on any AI-derived text block (UI-SPEC L188). Scores use neutral presentation, never pass/fail tints. Candidate side reads zero score data (RLS deny + allowlist).

## Runtime State Inventory

> This is NOT a rename/refactor phase — it is greenfield additive (new tables, EFs, prompt, UI). Section included only to confirm no hidden runtime state is affected.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — two NEW tables (`bigfive_itens`, `devolutivas_candidato`); reuses existing `scores_candidato`/`respostas_avaliacao` | seed `bigfive_itens` once; no migration of existing data |
| Live service config | n8n: a NEW `bigfive-email-devolutiva` flow is referenced (PRD RFB-12/25). It lives in n8n (UI/SQLite, not git) | flagged: the n8n flow must be created in the n8n UI — Open Q4. Fire-and-forget; in-app devolutiva works without it. |
| OS-registered state | None | None — verified, no scheduled tasks/cron beyond the existing monthly anonymization cron (PRD §117, n8n-owned, peripheral) |
| Secrets/env vars | Reuses existing `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`SUPABASE_*` (already set for Phase 9/11 EFs) | None new for V1 |
| Build artifacts | `database.types.ts` (repo ROOT, per M2 convention) regenerated after the 2 migrations apply | `npm run db:types` on the apply wave |

## Common Pitfalls

### Pitfall 1: Reverse-key transcription error (THE #1 scoring bug source)
**What goes wrong:** A single wrong/missing reverse-keyed item ID silently corrupts that facet's raw → the domain T-score → the percentile → the band → the devolutiva band template. No error is thrown; the score is just wrong.
**Why it happens:** 55 of 120 items (46%) are reversed; the list is long and easy to mis-type.
**How to avoid:** Transcribe the set VERBATIM from PESQUISA md L289-294/329-340 (cited in Pattern Map). Write a **unit test asserting `REVERSED.size === 55`** and a per-domain count test (N7 E6 O12 A17 C13). Add a known-answers golden test: feed a fixed 120-response vector and assert the exact 5 domain raws + percentiles (compute the expected values once by hand/Python `five-factor-e` and pin them).
**Warning signs:** Facet/domain raws outside 4-20 / 24-120; percentiles clustering oddly; a domain that should be high reading low.

### Pitfall 2: Missing norm table → percentiles are fabricated
**What goes wrong:** The T-score formula needs `mean_norm`/`sd_norm` per (sex × age-band) group. These 560 values are NOT in any repo doc — only the strategy is.
**Why it happens:** The PESQUISA doc references `five-factor-e/ipipneo/norm.py` but doesn't inline it.
**How to avoid:** Transcribe the Johnson 2014 international norm table into `_shared/bigfive-scoring.ts` as a typed constant (or seed it). V1 uses the international norms with a UI disclaimer (PESQUISA L427: "comparado com amostra normativa internacional, ainda sem normas brasileiras"). Pin the source commit/file. **This is the one piece of data not yet in the repo — the planner MUST task fetching/transcribing it explicitly (Open Q1).** Also decide the `norm_group` selection: the candidate's sex/age may not be collected (LGPD-01 minimized PII) → default to a neutral/combined group (Open Q2).
**Warning signs:** All percentiles ~50; percentiles that don't move with raw changes.

### Pitfall 3: Client-sent score or leaked answer-key (anti-tamper)
**What goes wrong:** If the body schema accepts anything beyond `{item_id:1..5}`, or the questionnaire reads dim/faceta/reverse, a candidate can tamper or reverse-engineer the key.
**How to avoid:** Body schema `.strict()`, only `{ candidatura_id, respostas: Record<1..120, 1..5> }`. The item reader RPC projects ONLY `item_id`/`texto`/`ordem`. **Write the shared client↔EF contract test** ([[feedback_integration_contract_gap]]): assert the exact client body parses in `SubmitBigfiveFinalBodySchema` and that `.strict` rejects an extra `score` field.
**Warning signs:** A `score`/`dimensao` field anywhere in the client payload or the item read.

### Pitfall 4: Never-reject invariant violated
**What goes wrong:** Copying `avaliar-redacao` too literally — it computes a `<13/25 → pendente_humano` threshold. Big Five is **contextual / non-eliminatory** and must NOT carry a pass/fail or `pendente_humano` threshold derived from the trait scores, and must NEVER write `candidaturas`.
**How to avoid:** `submit-bigfive-final` writes `scores_candidato` with `status='sucesso'` (or `'falhou'` on a scoring error only) — never `pendente_humano` from a trait value. No threshold logic on OCEAN. No `candidaturas` write (RNF-07a / LGPD-02: 100% of decisions human). Grep guard in CI.
**Warning signs:** Any `if (domain < X)` branch that sets status or touches etapa.

### Pitfall 5: Devolutiva LGPD/CFP language drift
**What goes wrong:** The IA invents clinical claims, uses "teste psicológico"/"diagnóstico"/"transtorno", or fabricates social comparisons (gender/politics/crime) — a real CFP/LGPD exposure.
**How to avoid:** The IA gets a strict instruction (templates-devolutiva.md L10-21): personalize name/cargo/percentil ONLY, never invent. Validate output via Zod (word-count 100-250). Run the LGPD-04 forbidden-term grep guard (Phase 9 precedent) over the prompt template AND a sample output. Use "Sensibilidade Emocional" for N. Always render the fixed disclaimers.
**Warning signs:** Forbidden-term grep hits; word-count out of range; IA output diverging from the band template's stance.

### Pitfall 6: RF-19b — devolutiva generated for the wrong test
**What goes wrong:** `gerar-devolutiva-bigfive` runs against an SJT/Redação score.
**How to avoid:** Guard at the top of the EF: the precondition score row must be `tipo='big_five'`; else refuse. Unit-test the guard.

### Pitfall 7: PII/score leak via `select('*')` or unredacted logs
**What goes wrong:** `scores_candidato`/`devolutivas_candidato` projected with `*`, or the score logged.
**How to avoid:** Explicit allowlists everywhere (`scoresRhService` precedent). `console.log` only ids/counts/status, never the raw responses or score (avaliar-redacao L304-312 precedent). Candidate has NO read policy on `scores_candidato`; the devolutiva table is the candidate-facing one (own-row RLS).

### Pitfall 8: PL/pgSQL migration 42601 at push
**What goes wrong:** A migration with `CREATE FUNCTION`/`DO $$...$$` + adjacent `GRANT`/`COMMENT` fails on `db push` (CLAUDE.md).
**How to avoid:** Author migrations no-wrapper (D-22). The `bigfive_itens` table+seed is table+INSERT DDL (no `$$` body) → pushes clean like `scores_candidato` did. The reader RPC (`$$` body) may need the MCP `apply_migration` path or SQL-Editor + `migration repair` (per STATE.md / CLAUDE.md workaround). The apply wave is `[BLOCKING]` (CONTEXT).

## Code Examples

### Safe item reader (mirror `get_opcoes_sjt`)
```sql
-- Source: pattern from get_opcoes_sjt (avaliacaoService.ts:170-191 consumes it)
-- Projects ONLY candidate-safe columns; the scoring key (dimensao/faceta/reverse_keyed) stays server-side.
CREATE OR REPLACE FUNCTION public.get_bigfive_itens()
RETURNS TABLE (item_id int, texto text, ordem int)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT item_id, texto, ordem FROM public.bigfive_itens ORDER BY ordem;
$$;
```

### `bigfive_itens` seed shape (from the on-disk JSON + the facet/reverse formula)
```sql
-- texto from ipip-neo-120-questions-pt-br.json; dimensao/faceta/reverse derived per
-- PESQUISA md §4.4 + §5.3 (faceta = ((id-1)%30)+1; reverse ∈ the 55-id set).
CREATE TABLE public.bigfive_itens (
  item_id      int PRIMARY KEY,            -- 1..120 (canonical Johnson numbering)
  texto        text NOT NULL,
  dimensao     char(1) NOT NULL CHECK (dimensao IN ('O','C','E','A','N')),
  faceta       int NOT NULL CHECK (faceta BETWEEN 1 AND 30),
  reverse_keyed boolean NOT NULL,
  ordem        int NOT NULL               -- presentation order (= item_id for V1)
);
-- RLS: no candidate SELECT policy on the base table (read only via get_bigfive_itens).
```

### Submit body schema (`.strict`, no score)
```typescript
// Source: pattern from AvaliarRedacaoBodySchema in _shared/avaliacao-schemas.ts
export const SubmitBigfiveFinalBodySchema = z.object({
  candidatura_id: z.string().uuid(),
  // exactly 120 answers, each 1..5; no score field anywhere
  respostas: z.record(z.string(), z.number().int().min(1).max(5)),
}).strict();
// In the handler: assert Object.keys(respostas).length === 120 and ids cover 1..120.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Python `five-factor-e` microservice (PRD §9.2 default) | TS-port in a Deno Edge Function | this phase (no Python runtime) | norms must be transcribed into TS (Open Q1) |
| Candidate sees no percentile (Master v0.2 lock) | Candidate sees raw percentile in the devolutiva (BFAS-style) | PRD-bigfive-revisado reopened it (L33-34, RFB-21) | the devolutiva view shows percentiles; still gated to authorized channels |
| Free-form LLM devolutiva | Hybrid: 25 curated band templates + bounded IA personalization | PRD (RFB-13..17) | LGPD/CFP-safe; IA only personalizes |

**Deprecated/outdated:**
- `TesteBigFivePage.tsx` + `respostas_bigfive` (legacy DEV page) — superseded by the new `src/features/avaliacao/` flow. Leave DEV-gated; do not extend.
- The `report big five.pdf` / `Big Five.md` BFAS 100-item material — quality reference only, NOT the instrument.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `five-factor-e` PT-BR JSON on disk is the canonical 120-item bank to seed | Stack / Pattern Map | LOW — it's the file the PRD/CONTEXT both name; translation is community (not academically validated, acknowledged in PESQUISA §2.3) but CONTEXT locks it for V1 |
| A2 | Johnson 2014 international norms are acceptable for V1 (no BR norms exist) | Pitfall 2 | MEDIUM — percentiles biased vs BR population (PESQUISA L104); mitigated by the UI disclaimer + the V2 internal-norms plan. The norm.py values must be transcribed correctly. |
| A3 | The candidate's sex/age for `norm_group` may be unavailable (LGPD-minimized) → use a neutral/combined group | Pitfall 2 / Open Q2 | MEDIUM — wrong norm group skews percentiles; needs a decision (see Open Q2) |
| A4 | `bigfive_devolutiva` uses Claude Sonnet (Master default) with structured output, ≤R$0.03/devolutiva budget | Pattern 3 | LOW — matches PRD MG-01 + Phase-9 model routing |
| A5 | The legacy `TesteBigFivePage`/`respostas_bigfive` is NOT reused (build clean) | Pattern Map / SOTA | LOW — consistent with Phase-11 feature-folder convention; CONTEXT left it open ("avaliar se reusa ou cria limpo") |
| A6 | `submit-bigfive-final` calls `gerar-devolutiva-bigfive` inline/synchronously (P95≤5s), with n8n email as fire-and-forget fallback | Architecture / PRD RFB-11 | LOW — explicit in PRD RFB-11/24; 10s timeout → email fallback path |

## Open Questions (RESOLVED)

1. **Where does the norm table (560 mean/sd values) come from at build time?**
   - What we know: it exists in `NeuroQuestAi/five-factor-e/ipipneo/norm.py` (MIT, Johnson-approved); strategy is in PESQUISA §5.6.
   - What's unclear: the actual numbers are not in the repo. The file `fontes/` has the item JSONs but NOT norm.py.
   - Recommendation: **task an explicit step** to fetch/transcribe `norm.py` into a typed TS constant in `_shared/bigfive-scoring.ts`, with a golden test pinning expected percentiles. This is the single must-do data step.

2. **Which `norm_group` does a candidate map to (sex × age)?**
   - What we know: norms are stratified by sex (M/F/N) × 4 age bands; LGPD-01 minimized PII (no obligatory sex; birth date IS collected with bias monitoring per LGPD-01).
   - What's unclear: whether to use the collected birth date for age-band + a neutral sex group, or a single combined norm group.
   - Recommendation: default to **sex='N' (neutral) + age band from the collected birth date**, store `norm_group` in metadata for auditability. Flag for the CRP/Fernando if a different policy is preferred.

3. **Confirm: no `pendente_humano` for Big Five (truly never-eliminatory).**
   - What we know: SJT writes `pendente_humano` below threshold; Big Five is contextual (RNF-07a).
   - Recommendation: `submit-bigfive-final` writes `status='sucesso'` always (only `'falhou'` on a scoring exception). No trait-derived threshold. Verify with a code-review grep guard.

4. **The n8n `bigfive-email-devolutiva` flow does not exist yet (lives in n8n UI, not git).**
   - Recommendation: treat the email as fire-and-forget; the in-app devolutiva is the source of truth and works without n8n. Creating the n8n flow is a human/manual step (deferred per CONTEXT "n8n email pipeline beyond fire-and-forget — peripheral").

5. **CRP responsible-technician name in the disclaimers is still a placeholder (`Dra. [Nome], CRP-XX/XXXXX`).**
   - Recommendation: keep the placeholder token in the template; fill at go-live (PRD Q1). Not a blocker for the build.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase (Postgres + Auth + EF + Storage) | all | ✓ | live (project isljnozzlvckrgjjbjwp) | — |
| Supabase CLI / MCP apply_migration | migrations apply wave | ✓ | per Phase 6-11 | MCP `execute_sql`/`apply_migration` for PL/pgSQL (42601 workaround) |
| Deno (Edge Function runtime) | 2 EFs | ✓ | Supabase-hosted | — |
| Anthropic + OpenAI API keys | `gerar-devolutiva-bigfive` | ✓ | keys set since Phase 9 | OpenAI fallback via circuit breaker (callAi) |
| n8n | email devolutiva | ✓ (instance) | — | fire-and-forget; in-app works without it; flow not yet authored |
| `five-factor-e/ipipneo/norm.py` (norm data) | scorer | ✗ (not in repo) | — | **NO fallback — must transcribe** (Open Q1). Without it, percentiles cannot be computed. |

**Missing dependencies with no fallback:**
- The Johnson norm table (560 values). It must be transcribed into the codebase before scoring works. This is the one true prerequisite the planner must sequence first.

**Missing dependencies with fallback:**
- n8n email flow — in-app devolutiva is the fallback (and the primary channel).

## Validation Architecture

> `workflow.nyquist_validation` not disabled in config → section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (frontend/service) + Deno test (Edge Functions) — per Phase 9/11 |
| Config file | `vitest.config.*` (root) ; Deno tests run via `deno test` against `supabase/functions/**` |
| Quick run command | `npm run test:run -- <file>` (Vitest) / `deno test supabase/functions/_shared/bigfive-scoring.test.ts` |
| Full suite command | `npm run test:run` (Vitest, currently 419/419) + Deno EF suites |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AVAL-04 | reverse-key set is exactly 55, per-domain counts correct | unit (Deno) | `deno test ...bigfive-scoring.test.ts` | ❌ Wave 0 |
| AVAL-04 | golden vector → exact 5 domain raws + percentiles + bands | unit (Deno) | same | ❌ Wave 0 |
| AVAL-04 | body schema `.strict` rejects extra `score`; accepts 120×1-5 (client↔EF contract) | unit (Vitest + Deno) | `npm run test:run -- bigf-contract` | ❌ Wave 0 |
| AVAL-04 | EF rejects non-owner / wrong-etapa (403); never writes `candidaturas` | unit (Deno, mocked deps) | `deno test ...submit-bigfive-final.test.ts` | ❌ Wave 0 |
| AVAL-04 | item reader exposes only item_id/texto/ordem (no key) | SQL smoke | live `execute_sql` on apply wave | ❌ Wave 0 (smoke runbook) |
| AVAL-08 | band selection: percentil → correct 1-of-5 template | unit | `deno test ...devolutiva.test.ts` | ❌ Wave 0 |
| AVAL-08 | RF-19b guard: refuses non-big_five score | unit (Deno) | same | ❌ Wave 0 |
| AVAL-08 | LGPD-04 forbidden-term grep over template + sample output | grep guard (Vitest) | `npm run test:run -- forbidden-strings` | ✅ extend existing Phase-9 guard |
| AVAL-08 | devolutiva word-count 100-250 / retry / graceful-degrade | unit (Deno, mocked callAi) | same | ❌ Wave 0 |
| AVAL-04/08 | candidate cannot read `scores_candidato`; can read own `devolutivas_candidato`; RH allowlist | SQL smoke (set_config jwt claims) | live smoke runbook | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the relevant Deno/Vitest unit file (`deno test <file>` / `npm run test:run -- <file>`).
- **Per wave merge:** full Vitest (`npm run test:run`) + all Phase-12 Deno suites; `npm run lint` (tsc baseline ~291, zero growth); `npm run build` exit 0.
- **Phase gate:** full suite green + SQL smokes PASS on the live apply wave before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `supabase/functions/_shared/bigfive-scoring.test.ts` — reverse-set size/per-domain counts + golden-vector percentiles (AVAL-04)
- [ ] `supabase/functions/submit-bigfive-final/index.test.ts` — auth/IDOR/etapa, never-touch-candidaturas, neutral payload (AVAL-04)
- [ ] `supabase/functions/gerar-devolutiva-bigfive/index.test.ts` — band select, RF-19b guard, word-count retry/degrade (AVAL-08)
- [ ] client↔EF contract test for `SubmitBigfiveFinalBodySchema` ([[feedback_integration_contract_gap]])
- [ ] extend the Phase-9 LGPD-04 forbidden-strings grep to cover `08-bigfive-devolutiva.md`
- [ ] SQL smoke runbook: item-reader projection, candidate-deny on scores, candidate own-row devolutiva, RH allowlist
- [ ] the **norm-table transcription** + its golden test (Open Q1 — the gating prerequisite)

## Security Domain

> `security_enforcement` absent = enabled. Stack: Supabase RLS + Edge Functions + AI.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT via `auth.getUser()` (two-client D-23) in `submit-bigfive-final` |
| V3 Session Management | yes | Supabase session; n8n email link tokenized w/ 12-month TTL (PRD RFB-23) |
| V4 Access Control | yes | IDOR check (auth.uid() owns candidatura) + etapa gate; RLS deny-candidate on scores; own-row on devolutiva; RH allowlist |
| V5 Input Validation | yes | Zod `.strict` (1..5, 120 items) at the EF boundary; client↔EF contract test |
| V6 Cryptography | no | no new crypto; reuses Supabase-managed |
| V7 Error/Logging | yes | redacted logs (ids/counts/status only); audit-logger masks PII before INSERT (Phase 9) |
| V8 Data Protection (LGPD) | yes | minimized PII; 12-month TTL + monthly anonymization cron; percentile only in authorized channels (MG-03) |

### Known Threat Patterns for {Supabase EF + AI + scoring}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Score tampering (client sends score) | Tampering | `.strict` schema, server-side re-score, no score field |
| Answer-key exfiltration (read dim/reverse) | Information Disclosure | item reader projects only item_id/texto/ordem; key columns server-side |
| IDOR (score/devolutiva for another candidatura) | Elevation / Info Disclosure | auth.uid()-ownership check before any read/write; RLS own-row |
| Score leak to the scored person | Information Disclosure | `scores_candidato` has NO candidate read policy; `select('*')` forbidden |
| Prompt injection in… (no free text here — Likert only) | Tampering | N/A for the questionnaire (no candidate free text); devolutiva input is the template, not candidate text; `callAi` injection-detect still runs |
| LGPD/CFP clinical-language exposure | Repudiation / compliance | curated templates + Zod + forbidden-term grep + fixed disclaimers + CRP responsible |
| Auto-rejection by trait (EEOC/LGPD) | (compliance) | never write `candidaturas`; no trait threshold; LGPD-02 audit (100% decisions human) |

## Sources

### Primary (HIGH confidence — on-disk in this repo)
- `docs/conhecimento/big-five/fontes/ipip-neo-120-questions-pt-br.json` — the 120 PT-BR item texts + Likert labels (seed source)
- `docs/conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md` §4.4, §5.3-5.6 — facet/domain map, 55 reverse IDs, scoring algorithm, T/percentile cubic, norm strategy
- `docs/conhecimento/big-five/templates-devolutiva.md` — 25 band templates + band cutoffs + disclaimers + IA instructions
- `docs/prds/m2-funil-rh/PRD-bigfive-revisado.md` — RFB-06..25 (questionnaire, EFs, devolutiva schema, layout, delivery, audit)
- `supabase/functions/avaliar-redacao/index.ts` — the EF skeleton to copy
- `supabase/migrations/20260611000001_scores_candidato.sql` — score sink schema + `tipo='big_five'` + RLS
- `src/features/avaliacao/services/avaliacaoService.ts` + `hooks/useAutosaveAvaliacao.ts` + `services/scoresRhService.ts` — service/autosave/allowlist analogs
- `.planning/phases/11-.../11-UI-SPEC.md` — inherited glass UI contract
- `.planning/phases/12-big-five-devolutiva/12-CONTEXT.md` — locked decisions
- `CLAUDE.md` / `.planning/STATE.md` — conventions (D-22 no-wrapper, MCP apply, `git -c core.hooksPath=/dev/null`, tsc baseline)

### Secondary (MEDIUM — external, public-domain instrument)
- IPIP public-domain license (PESQUISA §4.1, ipip.ori.org/newPermission.htm) — CC0-equivalent, commercial use permitted
- `NeuroQuestAi/five-factor-e` (MIT, Johnson-approved) — canonical scorer + the norm.py the EF must transcribe (NOT yet in repo)

### Tertiary (LOW — referenced for context, not used as instrument)
- `docs/conhecimento/big-five/Big Five.md` / `report big five.pdf` — BFAS 100-item material; devolutiva quality reference only

## Project Constraints (from CLAUDE.md)
- TypeScript strict; `database.types.ts` is generated (NEVER edit by hand) — regen after migrations.
- NEVER `supabaseAdmin`/service_role on the client; privileged ops in Edge Functions.
- RLS on 100% of user-data tables; duplicate/sensitive reads via SECURITY DEFINER RPC, not anon SELECT.
- Product language: "avaliação comportamental/cognitiva", NEVER "teste psicológico" (LGPD-04).
- System NEVER auto-rejects a candidate by score (RNF-07a).
- Migrations no-wrapper (no `BEGIN; ... COMMIT;`); PL/pgSQL via SQL Editor + `migration repair` OR MCP `apply_migration` (42601 workaround).
- Feature-folder layout `src/features/<domain>/` (components/hooks/services/schemas/types); named exports, PascalCase.tsx, camelCaseService.ts with custom error classes.
- Query keys hierarchical; TanStack Query v5; RHF + Zod (pt-BR).
- Commits via `git -c core.hooksPath=/dev/null` (allowlisted); migration `execute_sql` needs the explicit MCP allow-rule.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — everything reused; verified on-disk (enum, EF, hooks, allowlist, prompt library).
- Scoring algorithm: HIGH — fully specified on-disk (items, reverse set, facet map, cubic). The norm table is the one gap (MEDIUM until transcribed — Open Q1).
- Architecture/patterns: HIGH — direct analogs (`avaliar-redacao`, `get_opcoes_sjt`, `useAutosaveAvaliacao`).
- Devolutiva: HIGH — 25 templates + Phase-9 IA infra on-disk; LGPD wording curated.
- Pitfalls: HIGH — drawn from the actual Phase-8/11 lessons (select-star leak, anti-tamper, never-reject, 42601).

**Research date:** 2026-06-09
**Valid until:** 2026-07-09 (stable — internal reuse phase; the only external dependency is the static public-domain norm table)
