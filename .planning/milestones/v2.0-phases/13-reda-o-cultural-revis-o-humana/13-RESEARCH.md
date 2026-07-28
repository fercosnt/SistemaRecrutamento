# Phase 13: Redação Cultural + Revisão Humana - Research

**Researched:** 2026-06-23
**Domain:** Candidate culture-fit essay (autosave editor) + AI essay scoring (new dedicated Edge Function, EssayScoringV1 BARS 4D + 3 caps + 3-color) + mandatory RH human-review queue. Etapa 3 (avaliação assíncrona), redação layer.
**Confidence:** HIGH (binding PRD v1.1 read fully; all reusable infra inspected in-repo; SDK pins verified on npm registry; enum/table state confirmed against generated types)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Spec source (binding):**
- Phase 13 is bound to `docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md` **v1.1** as the authoritative spec. `docs/prds/fit-cultural-prd.md` is DEPRECATED (old SJT/Likert model) — DO NOT use.
- Planner/researcher MUST read the v1.1 PRD in full and implement verbatim: BARS 4D rubric, the 3 special caps, the 3-color thresholds, the essay prompts (banco-itens / seed `perguntas_redacao` 13 rows), and the human-review policy. Also see `CULTURA-BEAUTY-SMILE-INPUT.md` and `fit-cultural-banco-itens-v1.md`.
- The 4 BARS dimensions = the **4 official Beauty Smile values** (Experiência UAU, Inovação, Atitude de Dono, Sede de Crescimento), with **Ética as a founding principle above the 4** (ethical red flags → cap/vermelho + mandatory human review even with high affinity).
- Only genuine PRD gaps are raised to the user during planning; the rest is direct PRD implementation.

**EF architecture:**
- A **NEW dedicated EF** for the culture-fit essay (name TBD in planning) that returns `EssayScoringV1` and persists `redacoes_candidato`. Clean separation of responsibility.
- The EXISTING `avaliar-redacao` EF stays untouched serving the SJT open-case (`tipo='sjt', subtipo='caso_aberto'`) from Phase 11 — do NOT overload/branch that function; zero risk to the live SJT path (deployed v5).
- The new EF reuses Phase 9 AI infra: `_shared/ai-client.ts` (callAi), prompt-loader (call_type `culture_fit_essay` — already in `llm_call_type` enum, prompt_versions row exists is_active=false → activate), audit-logger, pii-masker. **Apply the `reference_ef_npm_join_import_bug` chain:** STATIC `npm:` imports, `zodOutputFormat`/`zodResponseFormat` helpers injected, schema in `npm:zod@3.25.76/v4`, JWT-on, authorize-then-act (role+ownership after getUser).

**Red classification → progression:**
- Vermelho (and the 3 caps) → **`bloqueio_avanco = true`**: candidate does NOT progress past this etapa until a human reviewer decides. **Never auto-rejects** (RNF-07a) — the human always decides; bloqueio_avanco only holds the automatic advance.
- Every evaluated essay enters `pendente_humano` regardless of color (human review ALWAYS mandatory, not only for vermelho).

**Human-review UX & policy:**
- RH queue **1-essay-at-a-time** with **color sidebar**, ordered by **severity (vermelho → amarelo → verde)**.
- Override via **per-dimension BARS sliders** (recomputes composite/color on adjust).
- `notas_revisor` **≥50 chars mandatory on EVERY decision** (not only override/reprovado) + `decisao_revisor` ∈ {aprovado, reprovado, duvida}.
- `decisao_revisor = 'duvida'` **escalates to the gestor** (does not finalize).

### Claude's Discretion
- Exact name of the new EF, component layout, column/index names, autosave structure (reuse Phase 11 `useAutosaveAvaliacao` 30s local + 30s DB), and RLS details — all at planner discretion provided it honors PRD v1.1 + the decisions above.

### Deferred Ideas (OUT OF SCOPE)
- Essay devolutiva email / n8n notifications beyond in-app — out of scope (focus is evaluation + review).
- A11y/WCAG hardening of the redação UI → Phase 16.
- Naming reconciliation of `avaliar-redacao` (which serves SJT) vs the new essay EF — document only; do NOT rename the live SJT EF this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **AVAL-05** | Redação fit cultural v1.1 — 1 standard BS question + 1-2 customizable per template; 200-500 words hard min/max; autosave 30s local + 30s DB; seed `perguntas_redacao` [RF-16] | §Standard Stack (autosave hook reuse), §Architecture Pattern 1 (candidate editor as AvaliacaoContainer teste card), §Schema (perguntas_redacao + redacoes_candidato_em_progresso), §Code Examples (word-count gating). PRD RF-R-01..09. |
| **AVAL-06** | Essay evaluation by new EF — 4 BARS (equal weights V1) + 3 deterministic caps + 3-color system + cached few-shot; Zod `EssayScoringV1`; persists `redacoes_candidato` + `bloqueio_avanco` if vermelho [RF-17, RF-17b] | §Architecture Pattern 2 (new dedicated EF, static imports, two-client), §Don't Hand-Roll (callAi pipeline), §Code Examples (computeScoreAndCors, deps wiring), §Common Pitfalls 1-5. PRD RF-R-10..20, §7.4 EssayScoringV1, §8.3 pseudocode. |
| **AVAL-07** | Mandatory human review post-AI (`pendente_humano`) — 1-essay-at-a-time UI, color sidebar, override sliders, `notas_revisor ≥50`, `decisao_revisor` (aprovado/reprovado/duvida); "duvida" escalates to gestor [RF-17a] | §Architecture Pattern 3 (RH review panel + RLS review-fields trigger), §Schema (review columns + status flow), §Common Pitfalls 6-7 (RLS column-leak, review-fields-only trigger). PRD RF-R-21..28. |
</phase_requirements>

## Summary

Phase 13 adds the **culture-fit essay** as one more "teste" inside the existing Phase 11 `AvaliacaoContainer`, plus a **brand-new dedicated AI Edge Function** for essay scoring, plus an **RH human-review queue**. Every essay is mandatorily routed to `pendente_humano` and the AI never decides alone (RNF-07a). The binding spec is `PRD-redacao-fit-cultural.md v1.1` and it is unusually complete: it ships exact SQL DDL for all 3 tables, the full RLS policy set + the BEFORE UPDATE review-fields-only trigger, the `EssayScoringV1` Zod schema (§7.4), the deterministic `computeScoreAndCors` reference implementation (§8.3), and the 3-color thresholds. **The planner's primary job is faithful transcription of the PRD, not invention.**

The single highest-risk area is the **new Edge Function**, because the project has been bitten 4× by the same AI-EF bug class (`reference_ef_npm_join_import_bug`). The fix is fully understood and PROD-proven: copy `analise-candidato-individual`/`gerar-devolutiva-bigfive` exactly — STATIC `npm:` imports (`@anthropic-ai/sdk@0.102.0`, `@anthropic-ai/sdk@0.102.0/helpers/zod`, `openai@6.42.0`, `openai@6.42.0/helpers/zod`, `npm:zod@3.25.76/v4`), construct the SDK clients in `Deno.serve`, inject `zodOutputFormat`/`zodResponseFormat` adapters into `callAi`'s deps, build the `EssayScoringV1` schema on the **`/v4`** zod namespace (the SDK helpers `require("zod/v4")` — a v3-namespace schema crashes the real Anthropic call). All four SDK pins are verified live on the npm registry and match the deployed green EFs.

The second area requiring care is **authorization** and **PII leak prevention**. The new essay EF is candidate-invoked (JWT-on, two-client D-23): authenticate via the anon client `auth.getUser()`, then authorize ownership via the service_role client before any privileged read/write. The candidate's own-row reads of `redacoes_candidato` MUST use an explicit column allowlist that EXCLUDES `analise_ia`, `scores_dimensao`, `score_ponderado_0_100`, `classificacao_cor`, `red_flag_etico`, `flags`, and all `*_revisor` fields — the candidate never sees a verdict (RNF-07a; `reference_select_star_leaks_pii`). The 3-color triage system lives **only** on the RH surface.

**Primary recommendation:** Transcribe PRD v1.1 §8.1 (schema), §8.2 (RLS+trigger), §7.4 (EssayScoringV1), and §8.3 (computeScoreAndCors) verbatim into migrations + a new `_shared/essay-schemas.ts` + a new EF that clones `analise-candidato-individual`'s static-import/deps-wiring skeleton with the JWT-on two-client authorize block from `comparativo-candidatos`/`submit-bigfive-final`. Reuse `useAutosaveAvaliacao` + `AvaliacaoContainer` + `SugestaoIABadge` + `RoleGuard` as-is. Add a new `EssayScoringV1` schema on the `/v4` zod namespace.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Essay editor + word counter + autosave UX | Browser / Client (SPA) | — | Pure presentation + debounced sessionStorage; reuses `useAutosaveAvaliacao`. No verdict ever rendered. |
| Autosave persistence (cross-device) | Database (RLS) | Browser | `redacoes_candidato_em_progresso` written via Supabase client under candidate RLS; etapa-gated back-lock. |
| Essay submit (word_count validation + hash) | API / Edge Function | Database | Server-authoritative anti-tampering: word_count revalidated server-side, `texto_hash` computed server-side, INSERT via service_role (client INSERT denied by RLS `WITH CHECK (false)`). |
| AI scoring (BARS 4D + caps + 3-color) | API / Edge Function | External (Anthropic) | New dedicated EF; deterministic caps/color computed in EF code (NOT the LLM); Anthropic is an external dependency behind `callAi`. |
| 3-color classification + bloqueio_avanco | API / Edge Function | Database | Computed in EF `computeScoreAndCors`, persisted denormalized; `bloqueio_avanco` is a DB column the advance logic reads. |
| Human-review queue + override + decision | Browser / Client (SPA) | Database | RH desktop panel; writes review-fields only via RLS UPDATE policy + BEFORE UPDATE trigger that rejects non-review-field changes. |
| Candidate own-row reads (allowlist, no verdict) | Database (RLS) | Browser | RLS is row-level only; column-level secrecy enforced by explicit `.select()` allowlist in the client service. |
| Mandatory-human-review invariant (RNF-07a) | API / Edge Function | Database | EF always sets `status_analise='pendente_humano'`; EF NEVER writes `candidaturas`; no auto-advance/auto-reject anywhere. |
| "duvida" → gestor escalation | Browser / Client | Database + (n8n future) | In-app: a gestor-filtered list reads `decisao_revisor='duvida'`; notification beyond in-app is OUT OF SCOPE this phase. |

## Standard Stack

### Core (all already in-repo and PROD-proven — reuse, do not re-author)

| Library / Asset | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `_shared/ai-client.ts` (`callAi`, `loadPrompt`, `resolvedPromptFromLoaded`) | in-repo | AI call pipeline: idempotency → injection-detect → maskPII → circuit-breaker → Anthropic (cache+retry) → OpenAI fallback → cost → audit-log | The single AI runtime every Phase 10+ EF imports. NEVER re-implement injection/mask/retry/cost/log. |
| `@anthropic-ai/sdk` | `0.102.0` (static `npm:`) | Anthropic client + `messages.parse` structured output | [VERIFIED: npm registry] exists; identical pin in `analise-candidato-individual`, `gerar-devolutiva-bigfive` (both PROD-green). |
| `@anthropic-ai/sdk/helpers/zod` → `zodOutputFormat` | `0.102.0` | Builds `output_config.format` for `messages.parse` | [VERIFIED: npm registry] subpath of the pinned SDK; helper does `require("zod/v4")`. |
| `openai` | `6.42.0` (static `npm:`) | Fallback client when Anthropic circuit OPEN | [VERIFIED: npm registry] exists; same pin in green EFs. |
| `openai/helpers/zod` → `zodResponseFormat` | `6.42.0` | Builds `response_format` for OpenAI fallback | [VERIFIED: npm registry] subpath of pinned SDK. |
| `zod` | `3.25.76` imported as **`npm:zod@3.25.76/v4`** | EssayScoringV1 schema namespace | [VERIFIED: npm registry] exists. **`/v4` is load-bearing** — the SDK helpers read `.def` (v4) not `._def` (v3); a v3-namespace schema crashes the real Anthropic call (see analise-schemas.ts:24-27 comment). |
| `useAutosaveAvaliacao` | in-repo | 30s trailing-edge debounce flush + 42501 back-lock neutral state | Phase 11 hook; injectable `upsert` writer; teste-keyed. The essay is one more teste key. |
| `AvaliacaoContainer` + `BigFiveQuestionnaireScreen` ScreenShell | in-repo | Candidate glass-over-gradient shell; essay opens as one more teste card | UI-SPEC D-27: do NOT introduce a new shell. |
| `RoleGuard role={['rh','administrador']}` | in-repo (`src/router/routes.tsx`) | RH route gating for the review queue | Every `/rh/*` route already uses it. |
| `SugestaoIABadge` | in-repo (`src/features/triagem/components/`) | "Sugestão da IA — decisão é sempre humana" badge on every AI block (RH only) | UI-SPEC mandates verbatim reuse, accent `#35BFAD`. |
| `supabase-js` | `@supabase/supabase-js@2` (esm.sh in EF; project client on web) | DB/auth/storage | Project standard. |

### Supporting (new files this phase, modeled on existing)

| File | Purpose | Modeled on |
|------|---------|-----------|
| `supabase/functions/_shared/essay-schemas.ts` (name TBD) | `EssayScoringV1Schema` copied verbatim from PRD §7.4 + Citation/Score primitives | `analise-schemas.ts` (verbatim-copy rule; `docs/` is NOT deployed in EF bundle). **Import `npm:zod@3.25.76/v4`.** |
| `supabase/functions/<new-essay-ef>/index.ts` | New dedicated essay scoring EF (JWT-on, two-client, static imports, deps-injected callAi) | `analise-candidato-individual` (static imports + deps wiring) + `comparativo-candidatos`/`submit-bigfive-final` (two-client authorize) |
| `supabase/functions/submit-redacao/index.ts` (optional, PRD T-10) | Anti-tampering submit: server word_count + hash + INSERT redacoes_candidato (status='processando') then invoke scoring EF | `submit-bigfive-final` (server-authoritative submit) |
| `src/features/avaliacao/services/redacaoService.ts` | Candidate-side allowlist reads/writes (NEVER `select('*')`) | `avaliacaoService.ts` (allowlist `.select('id, cargo, ...')` precedent) |
| `src/features/triagem/services/redacaoRevisaoService.ts` | RH review reads + review-field UPDATE | `scoresRhService.ts` (`SCORES_ALLOWLIST`) + `triagemService.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New dedicated essay EF | Branch existing `avaliar-redacao` (SJT) by `tipo` | REJECTED by CONTEXT — overloading the live SJT path risks regression; clean separation chosen. |
| Separate `submit-redacao` EF (PRD T-10) | Direct client INSERT via RLS | PRD recommends a submit EF for server-side word_count + hash anti-tampering. Planner may collapse INSERT into the scoring EF if it computes hash/word_count server-side there — decide in PLAN (PRD Q-R-01). Either way: client INSERT into `redacoes_candidato` MUST stay denied (`WITH CHECK (false)`). |
| Client invokes scoring EF synchronously post-submit | DB trigger → pg_net → EF (Phase 10 analise pattern) | PRD Q-R-02 recommends synchronous client invoke (P95 ≤ 20s acceptable). Trigger/pg_net is the Phase 10 precedent if async becomes necessary in V2. |
| `redacoes_candidato_em_progresso` table | Reuse `respostas_avaliacao` (Phase 11) | PRD §8.1 specifies a dedicated 3-table model (em_progresso + final + banco) mirroring Big Five v0.3 — separate concerns + TTL only on em_progresso. Follow the PRD. |

**Installation:** No new web `npm install` (all UI primitives vendored since Phase 7). EF deps are `npm:`/`esm.sh` imports resolved by Deno at deploy — NO package.json entry.

**Version verification (run at execute time):**
```bash
npm view @anthropic-ai/sdk@0.102.0 version   # → 0.102.0  [VERIFIED 2026-06-23]
npm view openai@6.42.0 version               # → 6.42.0   [VERIFIED 2026-06-23]
npm view zod@3.25.76 version                 # → 3.25.76  [VERIFIED 2026-06-23]
```

## Package Legitimacy Audit

> slopcheck was unavailable at research time (pip install failed in sandbox). All packages below are nonetheless **PROD-proven**: identical pins are deployed and green in `analise-candidato-individual`, `comparativo-candidatos`, `gerar-devolutiva-bigfive`. Treat as established-baseline, not net-new dependencies.

| Package | Registry | Source Repo | slopcheck | Disposition |
|---------|----------|-------------|-----------|-------------|
| `@anthropic-ai/sdk@0.102.0` | npm [VERIFIED] | github.com/anthropics/anthropic-sdk-typescript | unavailable | Approved — official Anthropic SDK, deployed in 3 green EFs |
| `@anthropic-ai/sdk@0.102.0/helpers/zod` | npm (subpath) [VERIFIED] | (same) | unavailable | Approved — subpath of approved SDK |
| `openai@6.42.0` | npm [VERIFIED] | github.com/openai/openai-node | unavailable | Approved — official OpenAI SDK, deployed in 3 green EFs |
| `openai@6.42.0/helpers/zod` | npm (subpath) [VERIFIED] | (same) | unavailable | Approved — subpath of approved SDK |
| `zod@3.25.76` (`/v4` namespace) | npm [VERIFIED] | github.com/colinhacks/zod | unavailable | Approved — deployed pin; `/v4` namespace required by SDK helpers |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**Net-new packages this phase:** none — every EF import already ships in a green PROD EF.

## Architecture Patterns

### System Architecture Diagram

```
  CANDIDATE (SPA, mobile-first, glass-over-gradient)
  ┌─────────────────────────────────────────────────────┐
  │ AvaliacaoContainer → RedacaoEditorScreen (teste card)│
  │  • textarea + RedacaoCounter (200-500, 3-band color) │
  │  • RedacaoCronometro (informative, no countdown)     │
  │  • useAutosaveAvaliacao (30s) ── AutosaveAffordance  │
  └───────────┬──────────────────────────────┬──────────┘
              │ autosave (every 30s)          │ submit (per question)
              ▼                                ▼
  ┌───────────────────────────────┐  ┌──────────────────────────────────────┐
  │ redacoes_candidato_em_progresso│  │ POST <submit-redacao> EF (JWT-on)    │
  │  (Supabase client + candidate  │  │  • two-client: getUser() → authorize │
  │   RLS; etapa-gated back-lock)  │  │    ownership + etapa='avaliacao_assinc│
  │                                │  │  • revalidate word_count 200-500     │
  └───────────────────────────────┘  │  • compute texto_hash (sha256 norm)  │
                                      │  • INSERT redacoes_candidato          │
                                      │    (RLS client-INSERT denied; sr only)│
                                      │  • invoke <avaliar-redacao-cultural>  │
                                      └───────────────┬──────────────────────┘
                                                      ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ NEW EF <avaliar-redacao-cultural> (JWT-on, two-client, STATIC npm imports) │
  │  1. loadPrompt('culture_fit_essay') ── prompt_versions (activate is_active)│
  │  2. load RAG (4 fit-cultural .md, filesystem, cold-start cached)           │
  │  3. callAi(deps: anthropic/openai/supabase + zodOutputFormat/Response)     │
  │     → schema = EssayScoringV1 on npm:zod@3.25.76/v4                         │
  │  4. computeScoreAndCors() ── DETERMINISTIC: equal weights ×20, 3 caps,     │
  │     3-color (per-vaga threshold), flags  [NOT the LLM — EF code]           │
  │  5. sha256 anti-plágio intercandidato query → flag (no block)             │
  │  6. UPDATE redacoes_candidato: analise_ia, scores, cor, bloqueio_avanco=   │
  │     (cor==='vermelho'), status_analise='pendente_humano'  ←─ ALWAYS        │
  │  7. auditLog (LGPD-02)   ── EF NEVER writes candidaturas (RNF-07a)         │
  └───────────────────────────────────────────┬──────────────────────────────┘
                                               ▼
  RH (desktop, brand panel, RoleGuard rh/administrador)
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ /rh/candidato/:id/redacao  → RedacaoSidebar (color chips, severity sort,   │
  │   default filter vermelho+amarelo) + RedacaoReviewPanel (1-at-a-time):     │
  │   left 35% AI analysis (SugestaoIABadge) + BARS sliders override +         │
  │   notas_revisor (≥50) + decisao_revisor radio ;  right 65% essay @16-18px  │
  │   Save → UPDATE review-fields only (RLS UPDATE + BEFORE UPDATE trigger)    │
  │   aprovado/reprovado → status_analise='concluida' ; duvida → gestor list   │
  └──────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
supabase/functions/
├── avaliar-redacao-cultural/        # NEW essay EF (name TBD — NOT 'avaliar-redacao')
│   ├── index.ts                     # serve + handler(deps) — static npm imports
│   └── index.test.ts                # deno test, deps injected (no network)
├── submit-redacao/                  # NEW (optional per PRD T-10) anti-tampering submit
│   └── index.ts
├── avaliar-redacao/                 # UNTOUCHED — SJT caso_aberto (Phase 11)
└── _shared/
    └── essay-schemas.ts             # EssayScoringV1Schema (npm:zod@3.25.76/v4) — verbatim PRD §7.4

src/features/avaliacao/              # CANDIDATE (reuse Phase 11/12 shell)
├── components/
│   ├── RedacaoEditorScreen.tsx
│   ├── RedacaoCounter.tsx
│   └── RedacaoCronometro.tsx
├── hooks/  (reuse useAutosaveAvaliacao)
├── schemas/redacaoSchema.ts         # client Zod: 200-500 words
└── services/redacaoService.ts       # allowlist reads (no select('*'))

src/features/triagem/                # RH (desktop panel)
├── components/
│   ├── RedacaoReviewPanel.tsx
│   ├── RedacaoSidebar.tsx
│   ├── RedacaoCorBadge.tsx
│   └── RedacaoOverrideForm.tsx      # BARS sliders + notas + decisao + J/K/A/R/D
├── hooks/useRedacaoRevisao.ts
└── services/redacaoRevisaoService.ts

supabase/migrations/  (PL/pgSQL applied via MCP apply_migration; no BEGIN/COMMIT wrapper)
├── perguntas_redacao (DDL + unique padrão index)
├── seed perguntas_redacao (13 rows: PADRAO_BS + 12 templates)
├── redacoes_candidato_em_progresso (autosave + RLS)
├── redacoes_candidato (final + RLS + review-fields trigger)
└── alter vaga.testes_aplicaveis (redacao config shape)
```

### Pattern 1: Candidate essay editor as a teste card in AvaliacaoContainer
**What:** The essay screen is NOT a new shell — it is one more "teste" card inside the Phase 11 `AvaliacaoContainer`, opening into the `BigFiveQuestionnaireScreen` ScreenShell.
**When to use:** All candidate-facing essay UI.
**Key details:** Reuse `useAutosaveAvaliacao` keyed by a redação teste key. Word counter has a 200ms debounce and a 3-BAND color code (muted `<200` / `#35BFAD` `200-500` / amber `>500`) — **this is mechanical length guidance, NOT a verdict** (RNF-07a). Submit disabled outside `[200,500]`. Post-submit shows only "Resposta registrada." — no score, no color, no feedback.

### Pattern 2: New dedicated AI Edge Function (the `reference_ef_npm_join_import_bug` chain)
**What:** Clone the PROD-green EF skeleton exactly; never use the `await import([...].join(""))` runtime-constructed import.
**When to use:** The new essay scoring EF.
**Example (deps wiring — the load-bearing part):**
```typescript
// Source: supabase/functions/analise-candidato-individual/index.ts:38-54, 387-405
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAi, loadPrompt, resolvedPromptFromLoaded, type ResolvedPrompt } from "../_shared/ai-client.ts";
import { EssayScoringV1Schema } from "../_shared/essay-schemas.ts";
// STATIC npm imports — the .join("") form hid the package from the deploy bundle
// → ERR_MODULE_NOT_FOUND at runtime (the EF "deployed" but 500'd on every call).
import Anthropic from "npm:@anthropic-ai/sdk@0.102.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";
import OpenAI from "npm:openai@6.42.0";
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod";

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {        // two-client D-23
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

  return await handler(req, {
    anthropic, openai, supabaseAdmin, supabaseUser,
    // Adapters to callAi's (schema, name) signature — Anthropic ignores name.
    zodOutputFormat: (s, _n) => zodOutputFormat(s as never),
    zodResponseFormat: (s, n) => zodResponseFormat(s as never, n),
  });
});
```
Then inside `handler`, call `callAi({ prompt, rawInput: redacaoTexto, vagaRubricBlock, candidato_id, vaga_id, schema: EssayScoringV1Schema, idempotency_key }, deps)`. `callAi` already does injection/maskPII/retry/fallback/cost/audit-log — do NOT re-implement any of it.

### Pattern 3: Two-client authenticate-THEN-authorize (D-23, C1 lesson)
**What:** Authenticate the JWT via the anon client, then authorize ownership/role via the service_role client BEFORE any privileged read/write (service_role bypasses RLS, so the check is mandatory).
**When to use:** Both the new essay EF (candidate ownership) and any RH-invoked path.
**Example:**
```typescript
// Source: comparativo-candidatos/index.ts:114-188 (RH) + submit-bigfive-final:117-157 (candidate)
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "...", 401);
const user = userRes.user;
// Candidate ownership (essay EF): the candidatura must belong to auth.uid() AND be in etapa.
const { data: candRow } = await supabaseAdmin
  .from("candidaturas").select("id, candidato_id, etapa_atual, vaga_id")
  .eq("id", candidaturaId).maybeSingle();
// derive candidate.auth_user_id === user.id ; else 403. NEVER trust getUser().app_metadata for role
// (role lives only in the signed JWT via custom_access_token_hook; reference_auth_hook_rls_gap).
```

### Anti-Patterns to Avoid
- **`await import(["npm:", pkg].join(""))`** — the bug class that kept every AI EF from ever running in PROD (P10-13). Always static `npm:` imports.
- **Building the EssayScoringV1 schema on `npm:zod@3.25.76` (v3 namespace)** — the SDK helpers `require("zod/v4")`; v3 crashes the real call. Use `npm:zod@3.25.76/v4`.
- **`select('*')` for candidate-facing reads of `redacoes_candidato`** — leaks `analise_ia`/scores/color/`red_flag_etico`/revisor fields (RNF-07a violation). Use an explicit allowlist that excludes ALL verdict columns.
- **Letting the LLM decide the color or apply the caps** — caps + 3-color are DETERMINISTIC EF code (`computeScoreAndCors`); the LLM returns raw 1-5 BARS scores only.
- **EF writing `candidaturas`** — RNF-07a: the essay EF NEVER auto-advances or auto-rejects. `bloqueio_avanco` only HOLDS the automatic advance; the human always decides.
- **Showing the 3-color triage to the candidate** — it is RH-facing only.
- **Renaming/branching `avaliar-redacao`** (the live SJT EF) — out of scope; new EF gets a new name.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI call orchestration | Custom Anthropic call + retry + cost calc | `callAi` from `_shared/ai-client.ts` | Already does idempotency, injection-detect, maskPII, circuit-breaker, exp-backoff retry, OpenAI fallback, cost, audit-log. Re-implementing is the #1 regression source. |
| Prompt resolution (active/canary) | Hardcode prompt text in EF | `loadPrompt('culture_fit_essay', supabaseAdmin)` | DB-only resolution; `prompt_versions` row already exists (activate it). |
| Structured-output parsing | Manual JSON.parse + validation | `zodOutputFormat(schema)` via `messages.parse` → `parsed_output` | SDK helper handles schema→JSON-Schema conversion + validation. |
| Autosave debounce + back-lock | New timer/sessionStorage logic | `useAutosaveAvaliacao` | 30s trailing-edge collapse + 42501 neutral lock already battle-tested in Phase 11/12. |
| Candidate glass shell | New layout | `AvaliacaoContainer` + `BigFiveQuestionnaireScreen` ScreenShell | UI-SPEC D-27; one more teste card. |
| RH role gating | New auth guard | `RoleGuard role={['rh','administrador']}` | Every `/rh/*` route uses it. |
| "AI is a suggestion" badge | New component | `SugestaoIABadge` (verbatim) | UI-SPEC mandates reuse. |
| LGPD AI audit log | New logging table | `auditLog`/`logAiCall` (called inside `callAi`) | RNF-R-12/LGPD-02 already satisfied by the shared pipeline. |
| Review-field tamper protection | Client-side guard only | BEFORE UPDATE trigger `trg_redacao_rh_only_review_fields` (PRD §8.2, verbatim) | DB-enforced: rejects any change to texto/hash/IA fields by RH. |

**Key insight:** PRD v1.1 already wrote the hard parts — the trigger, the RLS set, the `computeScoreAndCors` deterministic pipeline, the `EssayScoringV1` schema. The win condition is faithful transcription + correct EF wiring, not design.

## Runtime State Inventory

> Phase 13 is greenfield-additive (new tables, new EF, new UI). No rename/refactor of existing live runtime state. Verified against generated `database.types.ts` (2026-06-22) + live enum lists.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None new to migrate.** `tipo_score` enum already contains `redacao` (forward-declared Phase 11); `llm_call_type` already contains `culture_fit_essay`. No existing rows reference the new tables (they don't exist yet). | Create 3 new tables + seed 13 perguntas_redacao rows. No backfill. |
| Live service config | `prompt_versions` row `culture_fit_essay` v1.0.0 exists with **`is_active=false`** (per CONTEXT + 06 template frontmatter). Activating it changes runtime AI behavior. | **Verify live `is_active` + `system_template` content via MCP `execute_sql` before activating** (see Open Questions Q1). Activate (`UPDATE prompt_versions SET is_active=true WHERE ...`) AND confirm `system_template` matches the PRD prompt (06 template + 3 few-shot inline). This config lives in the DB, not git. |
| OS-registered state | None — no cron/scheduler registration this phase (the em_progresso TTL cron RNF-R-14 is a V1+ operational job, deferred). | None. |
| Secrets/env vars | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — all already set for the existing green EFs. The new EF reuses them; no new secret. | None (verify the new EF's env at deploy; reuse). |
| Build artifacts | `database.types.ts` (project root, NOT `src/types/`) is stale until regenerated after the new migrations. EF bundle freeze (`reference_ef_shared_bundle_freeze`): editing `_shared/*` only affects EFs you redeploy. | Regenerate `database.types.ts` after migrations. Redeploy the new EF (no `_shared` edits affect other EFs unless they're redeployed). |

**The canonical question — after every file is updated, what runtime systems still hold old state?** Only the `prompt_versions.culture_fit_essay` row (is_active flag + system_template content) is live runtime config not derivable from git alone. Verify and sync it explicitly.

## Common Pitfalls

### Pitfall 1: The AI-EF `.join("npm:")` import bug (4× recurrence — P10-13)
**What goes wrong:** EF deploys "successfully" but 500s on every real call with `ERR_MODULE_NOT_FOUND`.
**Why:** `await import(["npm:", pkg].join(""))` hides the package from the deploy bundler.
**How to avoid:** STATIC top-level `npm:` imports only (Pattern 2). Reference green EFs: `analise-candidato-individual`, `gerar-devolutiva-bigfive`.
**Warning signs:** Any runtime-constructed import string; a `deno test` that passes but the EF never tested live.

### Pitfall 2: zod v3 vs v4 namespace mismatch
**What goes wrong:** `zodOutputFormat(schema)` throws / produces wrong JSON-Schema; the real Anthropic call fails.
**Why:** SDK helpers do `require("zod/v4")` and read `.def`; a v3-namespace schema exposes `._def`.
**How to avoid:** Import the EssayScoringV1 schema's `z` from `npm:zod@3.25.76/v4`. NOTE: the older `_shared/avaliacao-schemas.ts` (SJT, Phase 11) uses plain `npm:zod@3.25.76` (v3) — do NOT copy that import line; copy `analise-schemas.ts:27` (`/v4`).
**Warning signs:** Schema built in a file importing plain `npm:zod@3.25.76`.

### Pitfall 3: PII / verdict leak via `select('*')` (RNF-07a)
**What goes wrong:** Candidate sees scores/color/red_flag/revisor notes; or one candidate reads another's essay.
**Why:** RLS is ROW-level only — it does not hide columns; an own-row `select('*')` returns every column including verdicts.
**How to avoid:** Candidate-facing `redacoes_candidato` reads use an explicit allowlist of NON-verdict columns only (e.g. `id, pergunta_id, texto, word_count, submetida_em, status_analise` — and NOT `analise_ia, scores_dimensao, score_ponderado_0_100, classificacao_cor, red_flag_etico, flags, scores_humanos, notas_revisor, decisao_revisor`). Test the SELECT projection (the network shape), not the JSX. (`reference_select_star_leaks_pii`, caught in Phase 8 security gate.)
**Warning signs:** `.select('*')` or `.select()` with no args anywhere on a candidate path.

### Pitfall 4: EF authenticates but does not authorize (IDOR — C1 critical, Phase 10/11)
**What goes wrong:** Any authenticated candidate scores/reads another candidate's essay.
**Why:** service_role bypasses RLS; `getUser()` only proves identity, not ownership.
**How to avoid:** After `getUser()`, verify the candidatura belongs to `auth.uid()` AND `etapa_atual='avaliacao_assincrona'` → 403 otherwise (Pattern 3). Never read role from `getUser().app_metadata` — it's null there; role lives only in the signed JWT / `usuarios_rh` (`reference_auth_hook_rls_gap`, `reference_ef_authenticate_vs_authorize`).
**Warning signs:** Privileged `supabaseAdmin` read before an ownership check.

### Pitfall 5: Integration contract gap (client↔EF body mismatch — C1+C2, Phase 11 SJT)
**What goes wrong:** Both sides' mocks pass while the real contract is broken (e.g., client posts a field the EF's Zod body schema rejects, or references a nonexistent column).
**Why:** Mocks on each side of the boundary validate against themselves, not the shared contract.
**How to avoid:** Write a shared contract test — the client's exact request body must `.parse()` against the EF's Zod body schema. Drop any `as never`/`as any` casts the moment `database.types.ts` regenerates (they mask nonexistent columns). (`feedback_integration_contract_gap`.)
**Warning signs:** `as never` casts on Supabase calls; per-side mocks with no shared-contract test.

### Pitfall 6: Migration 42601 (`cannot insert multiple commands into a prepared statement`)
**What goes wrong:** PL/pgSQL migration with `$$` body + adjacent COMMENT/GRANT fails via `db push --linked` on the transaction pooler.
**Why:** The Supabase CLI driver wraps each migration in an implicit transaction; an outer BEGIN/COMMIT + multi-statement prepared statement triggers 42601.
**How to avoid:** Apply via **Supabase MCP `apply_migration`** (writes the version row itself, bypasses 42601 — the established M2 path) OR author with NO `BEGIN/COMMIT` wrapper for `db push`. The `redacoes_candidato` RLS+trigger migration is the high-risk one (PRD §8.2 note).
**Warning signs:** `BEGIN;`/`COMMIT;` wrapping a `CREATE FUNCTION` migration.

### Pitfall 7: Canonical schema ≠ PRD schema (EssayScoringV1 drift)
**What goes wrong:** Copying `CultureFitEssaySchema` from `00-shared-zod-schemas.ts` instead of the PRD's `EssayScoringV1`.
**Why:** The canonical `CultureFitEssaySchema` (line 250) DIFFERS from the PRD §7.4 `EssayScoringV1`: it has `dimension: z.string()` (not `z.enum(['D1'..'D4'])`), `1..6` dimensions (not exactly `.length(4)`), `style_neutralized_in_scoring: z.boolean()` (not `z.literal(true)`), `detected_writing_style` enum `regional` (PRD uses `outro`), and **lacks `red_flag_etico`** (PRD has it as an explicit boolean — load-bearing for the cap). The PRD is binding.
**How to avoid:** Transcribe the PRD §7.4 `EssayScoringV1Schema` verbatim into `_shared/essay-schemas.ts`. Treat `red_flag_etico`, `length(4)`, and the `D1..D4` enum as required. If the canonical doc schema needs updating to match, note it but the EF uses the PRD shape.
**Warning signs:** EF schema lacking `red_flag_etico` or allowing ≠4 dimensions.

## Code Examples

### EssayScoringV1 schema (transcribe verbatim from PRD §7.4, on /v4)
```typescript
// Source: PRD-redacao-fit-cultural.md §8.4 (lines 673-707). File: _shared/essay-schemas.ts
import { z } from "npm:zod@3.25.76/v4";   // /v4 — SDK helpers require zod/v4 (Pitfall 2)

const DimensionScoreSchema = z.object({
  dimension: z.enum(["D1","D2","D3","D4"]),
  dimension_name: z.string(),
  cited_evidence: z.array(z.object({ text: z.string().min(1), location: z.string() })).max(2),
  reasoning: z.string().min(20),
  score: z.union([z.number().int().min(1).max(5), z.literal("insufficient_evidence")]),
  level: z.enum(["exemplary","proficient","developing","basic","inadequate","insufficient_evidence"]),
});

export const EssayScoringV1Schema = z.object({
  preprocessing_check: z.object({
    word_count: z.number().int(),
    detected_writing_style: z.enum(["formal","informal","mixed","outro"]),
    style_neutralized_in_scoring: z.literal(true),
  }),
  dimension_scores: z.array(DimensionScoreSchema).length(4),
  overall_score: z.number().min(0).max(100),
  qualitative_summary: z.string().min(50).max(500),
  recommendation: z.enum(["strong_fit","good_fit","neutral","weak_fit","misfit"]),
  red_flag_etico: z.boolean(),
  bias_audit: z.object({
    formality_did_not_affect_score: z.boolean(),
    regional_markers_treated_as_neutral: z.boolean(),
    grammar_errors_did_not_affect_content_score: z.boolean(),
  }),
});
export type EssayScoringV1 = z.infer<typeof EssayScoringV1Schema>;
```

### Deterministic scoring + 3 caps + 3-color (transcribe verbatim from PRD §8.3)
```typescript
// Source: PRD §8.3 (lines 606-666). Lives in the new EF's _local/compute-score.ts.
// EQUAL WEIGHTS: score_geral = (Σ valid dims / n) × 20.
// CAP (a) red_flag_etico → MIN(score, 30) + flag 'red_flag_etico'
// CAP (b) D1 ≤ 2 → MIN(score, 50) + flag 'situacao_generica_ou_inventada'
// CAP (c) insufficient_evidence handled upstream (word_count<200 rejected at submit)
// flag 'tempo_anormalmente_curto' if tempo_gasto_segundos < 90
// COLOR (per-vaga threshold, default {vermelho_max:40, amarelo_max:64}):
//   vermelho if score ≤ vermelho_max OR red_flag_etico OR D1≤2
//   amarelo  if score ≤ amarelo_max
//   verde    otherwise
// normalizeForHash = lowercase + strip punctuation + collapse whitespace (sha256 anti-plágio)
```

### Persist + invariant (PRD §8.3 step 9-10)
```typescript
// Source: PRD §8.3. The EF ALWAYS sets pendente_humano; bloqueio only on vermelho.
await supabaseAdmin.from("redacoes_candidato").update({
  analise_ia: parsed, scores_dimensao, score_ponderado_0_100: scoreGeral,
  classificacao_cor, red_flag_etico, flags, referencia_match,
  prompt_version, model_version, input_hash, cost_tokens_input, cost_tokens_output,
  ia_processada_em: new Date().toISOString(),
  status_analise: "pendente_humano",                 // RNF-07a — ALWAYS human
  bloqueio_avanco: classificacao_cor === "vermelho", // HOLD only — never auto-reject
}).eq("id", redacao_id);
// The EF NEVER touches `candidaturas`. The candidate HTTP response is NEUTRAL ({ ok:true }).
```

### Candidate allowlist read (no verdict — RNF-07a)
```typescript
// Source: avaliacaoService.ts allowlist precedent (line 135). NEVER select('*').
const REDACAO_CANDIDATO_ALLOWLIST =
  'id, pergunta_id, texto, word_count, submetida_em, status_analise';
// EXCLUDES: analise_ia, scores_dimensao, score_ponderado_0_100, classificacao_cor,
//           red_flag_etico, flags, scores_humanos, notas_revisor, decisao_revisor.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `await import([...].join(""))` dynamic EF imports | Static top-level `npm:` imports | Phase 10/22 fix (2026-06-22) | Required — dynamic form 500s every AI EF in PROD. |
| zod v3 namespace for SDK structured output | `npm:zod@3.25.76/v4` | Phase 12/13 (gerar-devolutiva-bigfive, analise-schemas) | Required — SDK helpers `require("zod/v4")`. |
| EF authenticates only | Authenticate-THEN-authorize (two-client, ownership/role check) | Phase 10 C1 fix | Required — IDOR/PII otherwise. |
| `select('*')` own-row reads | Explicit column allowlist | Phase 8 security gate | Required — RLS is row-level, not column-level. |
| `db push --linked` for PL/pgSQL | Supabase MCP `apply_migration` | M2 (Phase 6+) | Bypasses 42601; writes version row. |

**Deprecated/outdated:**
- `docs/prds/fit-cultural-prd.md` (SJT/Likert/Ranking 25-item model) — DEPRECATED; do NOT use. The v1.1 redação PRD supersedes it.
- The Anthropic SDK latest is `0.105.0` (npm, ~June 2026) but the project PINS `0.102.0` to match green EFs — do NOT bump in this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `prompt_versions.culture_fit_essay` is live with `is_active=false` and `system_template` already contains the synced 06-template + 3 few-shot inline. | Runtime State Inventory | If `system_template` is a stub/unsynced, the EF will score with a weak prompt → bad κ. **Must verify via MCP `execute_sql` before activating** (Q1). |
| A2 | The 4 RAG files in `docs/conhecimento/fit-cultural/` are NOT bundled into the EF deploy (only `supabase/functions/` is). The PRD pseudocode reads them from a `_shared/rag/` filesystem path. | Architecture | If RAG content isn't copied under `supabase/functions/`, the EF can't load it at runtime (same class as the verbatim-copy rule for schemas). Planner must decide: copy RAG into `_shared/` OR inline into the prompt `system_template`. |
| A3 | `culture_fit_essay` prompt's `model_id` is `claude-sonnet-4-6` (per 06 template frontmatter). | Standard Stack | If the model id differs in the live row, cost/latency assumptions shift; verify in Q1. |
| A4 | The new EF is JWT-on (candidate-invoked, like `avaliar-redacao`/`submit-bigfive-final`), not `--no-verify-jwt`. | Pattern 2/3 | If the chosen architecture is trigger→pg_net (server-internal), it'd be `--no-verify-jwt` + Bearer self-auth (analise pattern). CONTEXT says JWT-on; confirm in PLAN. |
| A5 | No new web npm packages; all shadcn primitives vendored. | Standard Stack | UI-SPEC Registry Safety confirms all primitives vendored since Phase 7 — low risk. |

## Open Questions

1. **Live state of `prompt_versions.culture_fit_essay`** (is_active, system_template content, model_id)
   - What we know: the row exists; CONTEXT says `is_active=false`; the 06 template + 4 RAG files are authored in `docs/`.
   - What's unclear: whether `system_template` already contains the synced prompt + 3 few-shot inline, or is a stub.
   - Recommendation: Run `SELECT semver, is_active, model_id, length(system_template), schema_version_required FROM prompt_versions WHERE call_type='culture_fit_essay'` via MCP `execute_sql` at plan/execute time. If `system_template` is unsynced, a sync step precedes activation.

2. **submit-redacao as a separate EF vs collapsed into the scoring EF** (PRD Q-R-01/T-10)
   - What we know: PRD recommends a dedicated submit EF for server word_count + hash anti-tampering.
   - What's unclear: whether to keep 2 EFs or 1.
   - Recommendation: Decide in PLAN. Either is acceptable IF the client INSERT stays denied (`WITH CHECK (false)`) and word_count/hash are computed server-side. Two EFs mirror `submit-bigfive-final`; one EF is fewer moving parts.

3. **RAG delivery: filesystem-in-EF vs inlined into system_template**
   - What we know: only `supabase/functions/` is bundled; `docs/` is not deployed.
   - What's unclear: whether RAG is copied into `_shared/rag/` (filesystem read per PRD pseudocode) or folded into the cached `system_template`.
   - Recommendation: Prefer folding the curated RAG content into the cached `system_template` (simplest, cache-friendly, no filesystem-bundling risk), OR copy the 4 `.md` under `supabase/functions/_shared/rag/`. Decide in PLAN.

4. **Gestor "duvida" queue scope** (PRD RF-R-27)
   - What we know: `decisao_revisor='duvida'` escalates to the gestor; n8n notifications are OUT OF SCOPE this phase.
   - What's unclear: whether a `/rh/gestor/duvidas` route/list ships this phase or just the DB state.
   - Recommendation: Ship the in-app gestor-filtered list (reads `decisao_revisor='duvida'`); defer notification plumbing. Confirm route in PLAN.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (linked) | migrations, EF deploy, MCP | ✓ | ref `isljnozzlvckrgjjbjwp` | — |
| Supabase MCP `apply_migration`/`execute_sql` | PL/pgSQL migrations (42601 bypass) | ✓ | — | `db push --linked` (no BEGIN/COMMIT wrapper) |
| Supabase CLI `functions deploy` | EF deploy (auto-bundles `_shared`) | ✓ | — | — |
| Deno runtime (EF) | new essay EF | ✓ (managed by Supabase) | — | — |
| Anthropic API + `ANTHROPIC_API_KEY` | essay scoring | ✓ (green EFs use it) | — | OpenAI gpt-4o-mini fallback (in `callAi`) |
| `OPENAI_API_KEY` | circuit-breaker fallback | ✓ (green EFs use it) | — | — |
| Node + npm (verify SDK pins) | research/version-check only | ✓ | — | — |
| Vitest 4 + Playwright | web/E2E tests | ✓ | vitest 4.0.7, playwright 1.56.1 | — |
| Deno test | EF unit/contract tests | ✓ | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Anthropic API → OpenAI fallback already wired in `callAi`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (web) | Vitest 4.0.7 (`environment: happy-dom`, `setupFiles: ./tests/setup.ts`) |
| Framework (EF) | `deno test` (deps injected → no network) |
| Framework (E2E) | Playwright 1.56.1 (+ `@axe-core/playwright` for a11y, deferred to Phase 16) |
| Config file | `vite.config.ts` (`test:` block) |
| Quick run command | `npm run test:run` (single run) |
| Full suite command | `npm run test:run` + `deno test supabase/functions/...` + SQL smokes via MCP |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AVAL-05 | Word counter 3-band gating (submit disabled <200/>500) | unit (Vitest) | `npm run test:run RedacaoCounter` | ❌ Wave 0 |
| AVAL-05 | Autosave 30s flush + 42501 back-lock (reuse hook) | unit (Vitest) | `npm run test:run useAutosaveAvaliacao` | ✅ exists (Phase 11) — extend for redação teste key |
| AVAL-05 | `redacoes_candidato_em_progresso` RLS: candidate R/W own only; RH read | SQL-smoke (MCP) | `execute_sql` fixture w/ `set_config request.jwt.claims` | ❌ Wave 0 |
| AVAL-05 | Seed 13 perguntas_redacao rows present; 1 is_padrao | SQL-smoke (MCP) | `SELECT count(*), count(*) FILTER (WHERE is_padrao)` | ❌ Wave 0 |
| AVAL-06 | `computeScoreAndCors`: equal weights ×20, 3 caps, 3-color (table-driven) | unit (deno) | `deno test .../compute-score.test.ts` | ❌ Wave 0 |
| AVAL-06 | EssayScoringV1 schema parses valid output / rejects ≠4 dims / requires red_flag_etico | unit (deno) | `deno test .../essay-schemas.test.ts` | ❌ Wave 0 |
| AVAL-06 | EF: non-owner candidatura → 403 (authorize) | unit (deno, deps mocked) | `deno test .../<essay-ef>/index.test.ts` | ❌ Wave 0 |
| AVAL-06 | EF: always sets `pendente_humano`; vermelho → `bloqueio_avanco=true`; NEVER writes candidaturas | unit (deno) + SQL-smoke | mocked deps assert update payload; SQL asserts no candidaturas write | ❌ Wave 0 |
| AVAL-06 | Contract: client submit body parses against EF body Zod (Pitfall 5) | contract (Vitest/deno shared) | `npm run test:run redacao-contract` | ❌ Wave 0 |
| AVAL-06 | Candidate read excludes verdict columns (allowlist) | unit (Vitest, service projection) | `npm run test:run redacaoService` (assert `.select` string) | ❌ Wave 0 |
| AVAL-06 | `redacoes_candidato` RLS: candidate own SELECT only; client INSERT denied | SQL-smoke (MCP) | `execute_sql` w/ jwt.claims | ❌ Wave 0 |
| AVAL-07 | `notas_revisor` ≥50 chars CHECK + decisao_revisor enum | SQL-smoke (MCP) | INSERT/UPDATE assertions | ❌ Wave 0 |
| AVAL-07 | BEFORE UPDATE trigger rejects non-review-field change by RH | SQL-smoke (MCP) | UPDATE texto as RH → expect RAISE | ❌ Wave 0 |
| AVAL-07 | Override sliders recompute composite/color (client) | unit (Vitest) | `npm run test:run RedacaoOverrideForm` | ❌ Wave 0 |
| AVAL-07 | Sidebar severity sort + default filter vermelho+amarelo | unit (Vitest) | `npm run test:run RedacaoSidebar` | ❌ Wave 0 |
| AVAL-07 | aprovado/reprovado → status `concluida`; duvida → not finalized | unit (Vitest) + SQL-smoke | review service test + SQL | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:run <changed-area>` (+ `deno test` for EF tasks)
- **Per wave merge:** full `npm run test:run` + `deno test supabase/functions/` + the SQL smoke set via MCP
- **Phase gate:** full suite green + all SQL smokes PASS before `/gsd:verify-work`; EF live-smoke (one real essay scored end-to-end) is a human UAT item (live PROD, deferred per Phase 8/10/11 precedent)

### Wave 0 Gaps
- [ ] `supabase/functions/_shared/essay-schemas.test.ts` — EssayScoringV1 parse/reject (AVAL-06)
- [ ] `supabase/functions/<essay-ef>/_local/compute-score.test.ts` — caps + 3-color table-driven (AVAL-06)
- [ ] `supabase/functions/<essay-ef>/index.test.ts` — authorize 403 + pendente_humano + no-candidaturas-write (AVAL-06)
- [ ] `src/features/avaliacao/components/__tests__/RedacaoCounter.test.tsx` — 3-band gating (AVAL-05)
- [ ] `src/features/avaliacao/services/__tests__/redacaoService.test.ts` — allowlist projection (AVAL-06)
- [ ] `src/features/avaliacao/__tests__/redacao-contract.test.ts` — client↔EF body contract (Pitfall 5)
- [ ] `src/features/triagem/components/__tests__/RedacaoOverrideForm.test.tsx` + `RedacaoSidebar.test.tsx` (AVAL-07)
- [ ] SQL smoke set (MCP fixtures, `set_config request.jwt.claims`): em_progresso RLS, redacoes RLS + client-INSERT-deny, review-fields trigger, notas≥50 CHECK, seed count (AVAL-05/06/07)
- Existing infra covering this phase: `useAutosaveAvaliacao.test.ts` (extend), `callAi`/`loadPrompt`/`audit-logger` (already green — reused unchanged).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Two-client D-23 (anon auth + service_role privileged); EF never writes candidaturas (RNF-07a invariant) |
| V2 Authentication | yes | EF JWT-on `auth.getUser()` via anon client; role from `usuarios_rh`/signed JWT (never `getUser().app_metadata` — `reference_auth_hook_rls_gap`) |
| V4 Access Control | yes | Authenticate-THEN-authorize ownership/role before privileged read/write (Pitfall 4); RLS on all 3 new tables; client INSERT denied `WITH CHECK(false)`; RH UPDATE review-fields-only trigger |
| V5 Input Validation | yes | EssayScoringV1 Zod on AI output; client Zod 200-500 words; server word_count revalidation; `detectPromptInjection` + `maskPII` inside `callAi` (essay text is UNTRUSTED) |
| V6 Cryptography | yes | `sha256` for anti-plágio `texto_hash` + `input_hash` audit (never hand-roll; use Web Crypto `crypto.subtle`) |
| V7 Error/Logging | yes | LGPD-02 `auditLog` (mask-then-INSERT) inside `callAi`; logs carry ids/counts only — NEVER essay text/score/name |
| V8 Data Protection (LGPD) | yes | Essay text = sensitive personal data (RNF-R-06); candidate allowlist excludes verdict columns (`reference_select_star_leaks_pii`); CASCADE delete on candidatura (RNF-R-07); `_em_progresso` TTL anonymization (RNF-R-14, deferred op job) |

### Known Threat Patterns for {Supabase EF + candidate essay + RH review}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — candidate scores/reads another's essay | Elevation/Info | Ownership check after getUser (Pitfall 4); RLS own-row SELECT |
| Verdict/PII leak to candidate (RNF-07a) | Info disclosure | Explicit allowlist read; 3-color RH-only; neutral EF HTTP response (Pitfall 3) |
| Prompt injection in essay text | Tampering | `detectPromptInjection` short-circuit inside `callAi`; essay text always passes maskPII |
| RH tampering with texto/hash/IA fields | Tampering | BEFORE UPDATE trigger rejects non-review-field changes (PRD §8.2 verbatim) |
| Client forging score / bypassing word_count | Tampering | Server-side word_count revalidation + score derived in EF; client INSERT denied |
| AI auto-rejects a candidate | Repudiation/Integrity | RNF-07a — EF never writes candidaturas; `bloqueio_avanco` HOLDS only; human always decides |
| Style/regional bias in scoring | (fairness) | Style-neutralization prompt (Rao 2025) + `bias_audit` in EssayScoringV1 output; monthly audit (RNF-R-09/10) |
| Cost/DoS via huge essay | DoS | Hard 500-word cap server-side; max_tokens bound; temperature 0 |

## Sources

### Primary (HIGH confidence)
- `docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md` v1.1 (read in full, 927 lines) — binding spec: schema §8.1, RLS+trigger §8.2, pseudocode §8.3, EssayScoringV1 §8.4, RF-R-01..32, RNF-R-01..14
- `.planning/phases/13-.../13-CONTEXT.md` + `13-UI-SPEC.md` (approved) — locked decisions + UI contract
- `.planning/REQUIREMENTS.md` AVAL-05/06/07
- In-repo PROD-green code: `supabase/functions/_shared/ai-client.ts` (callAi/deps), `analise-candidato-individual/index.ts` (static imports + deps wiring), `comparativo-candidatos/index.ts` + `submit-bigfive-final/index.ts` (two-client authorize), `_shared/analise-schemas.ts` (zod `/v4` rule), `avaliar-redacao/index.ts` (the untouched SJT EF — naming clash confirmed), `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts`, `src/router/routes.tsx` (RoleGuard), `database.types.ts` (enums: `tipo_score` has `redacao`; `llm_call_type` has `culture_fit_essay`)
- `docs/conhecimento/fit-cultural/*` (4 RAG files + culture input) + `docs/conhecimento/prompts/templates/06-culture-fit-essay.md` + `00-shared-zod-schemas.ts` (canonical CultureFitEssaySchema — drift vs PRD documented)
- npm registry verification: `@anthropic-ai/sdk@0.102.0`, `openai@6.42.0`, `zod@3.25.76`, `unpdf@0.11.0` all exist [VERIFIED 2026-06-23]

### Secondary (MEDIUM confidence)
- [@anthropic-ai/sdk npm + helpers/zod docs](https://www.npmjs.com/package/@anthropic-ai/sdk) — confirms `zodOutputFormat` from `helpers/zod`, zod peer `^3.25.0 || ^4.0.0`, `messages.parse` → `parsed_output`; latest 0.105.0 (project pins 0.102.0)
- [anthropic-sdk-typescript helpers.md](https://github.com/anthropics/anthropic-sdk-typescript/blob/HEAD/helpers.md) — structured output via `output_config.format`

### Tertiary (LOW confidence)
- Live `prompt_versions.culture_fit_essay` row state (is_active/system_template content) — inferred from CONTEXT + 06 frontmatter; MUST verify via MCP `execute_sql` (Open Question 1)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every EF import is deployed and green in PROD; SDK pins verified on npm; UI primitives vendored.
- Architecture: HIGH — binding PRD ships exact DDL/RLS/trigger/schema/pseudocode; reuse patterns inspected in-repo.
- Pitfalls: HIGH — all 7 derive from documented project memory incidents (Phase 8/10/11) + the PRD's own notes.
- Runtime state: MEDIUM — table/enum state confirmed against generated types; the `culture_fit_essay` prompt row's live content is the one item needing MCP verification.

**Research date:** 2026-06-23
**Valid until:** 2026-07-23 (stable — pinned SDKs, internal patterns; re-verify the prompt row live before execute)
