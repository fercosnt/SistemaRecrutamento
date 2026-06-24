# Phase 14: Entrevistas com IA Companion (Etapas 4+5) - Research

**Researched:** 2026-06-24
**Domain:** AI-assisted structured interviewing (STAR/PEI guide generation + BARS transcript scoring) + opt-in light-proctored cognitive reasoning prova, on Supabase (Postgres + Edge Functions Deno) + React 18 SPA
**Confidence:** HIGH (every recommendation is a clone of a PROD-green Phase 10/11/13 pattern verified in-codebase; the only LOW areas are the two spec/schema conflicts surfaced in Open Questions)

## Summary

Phase 14 is **not a greenfield AI phase** — it is the fifth AI Edge Function phase in this project, and every primitive it needs already exists and is PROD-green: the `callAi` pipeline (injection-detect → maskPII → retry → circuit-breaker fallback → cost → audit-log) from Phase 9, the two-client authenticate-THEN-authorize EF skeleton from Phase 10, the generic `scores_candidato` sink (whose `tipo_score` enum already contains `'entrevista'` and `'cognitivo'` — **no `ALTER TYPE` needed**), the human-review-mandatory + flag-blocks-`avancar_etapa` flow from Phase 13's `avaliar-redacao-cultural`, and the `salvar_revisao_redacao` SECURITY DEFINER RPC template. The two AI prompt templates (`interview_guide`, `transcript_analysis`) already exist on disk with full BARS/STAR/PEI bodies, their Zod output schemas (`InterviewGuideSchema`, `TranscriptAnalysisSchema`) are already defined, and the `llm_call_type` enum already holds both call_types. The dominant work is **wiring** these together correctly and authoring the new tables + RLS + the cognitive prova item bank.

The single highest-risk landmine is **not** technical novelty — it is the `.join("npm:")` dynamic-import bug that silently 500s every AI EF in PROD (documented; the fix is the static `npm:` import + helper-injection chain that `avaliar-redacao-cultural` already proves). The second is a pair of **spec/schema conflicts**: (a) the cognitive PRD says `tipo='raciocinio_logico'` + EF `submit-cognitivo-final` at Etapa 3, but the live DB enum says `tipo='cognitivo'` and CONTEXT places it at Etapa 4/5; (b) the `TranscriptAnalysisSchema` carries per-competency `bias_flags` but **no explicit "language/accent flag" field**, so the ENTREV-03/RF-24 blocking rule must be DERIVED server-side. The third is **pre-existing M1-legacy `entrevistas_online`/`entrevistas_presenciais` tables** that exist in PROD but in NO tracked migration — the planner must decide reuse-vs-new and audit their RLS.

**Primary recommendation:** Build 2 new dedicated EFs (`gerar-guia-entrevista`, `avaliar-transcricao-entrevista`) by cloning `avaliar-redacao-cultural` verbatim (static `npm:` imports + injected `zodOutputFormat`/`zodResponseFormat` + two-client RH-authorize via `usuarios_rh` role + `vagas.created_by` ownership). Persist interview BARS scores to `scores_candidato` (`tipo='entrevista'`), cognitive band to `tipo='cognitivo'`. Author new M2 tables (`entrevista_guias`, `entrevista_analises`, `cognitivo_itens` + `cognitivo_respostas`) rather than reusing the untracked M1-legacy interview tables. Activate+hydrate the two `prompt_versions` rows in the apply wave exactly as Phase 13 did for `culture_fit_essay`. Apply all PL/pgSQL via Supabase MCP `apply_migration` (D-22), deploy EFs via CLI `supabase functions deploy`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Guia STAR/PEI generation (ENTREV-01/04) | API / Edge Function (`gerar-guia-entrevista`) | Database (read scorecard, persist guia) | LLM call + structured-output validation belongs server-side; RH-invoked, JWT-on, role-authorized |
| Transcript BARS scoring (ENTREV-03) | API / Edge Function (`avaliar-transcricao-entrevista`) | Database (persist `scores_candidato` tipo='entrevista') | Untrusted transcript text must pass through `callAi` (injection/maskPII); deterministic flag-derivation server-side |
| Language/accent flag → block avancar (RF-24) | Database (RPC / `avancar_etapa` guard) | API (sets the flag) | The block is a funil-state invariant; must be enforced in the advance RPC, not just UI (RNF-07a) |
| Interview dashboard + 24h marker (ENTREV-02) | Frontend Server (SPA route `/rh/candidato/:id/entrevista`) | Database (read etapa + scheduled datetime) | Pure presentation + client-side time math; no email/calendar pipeline in V1 |
| Inline editable scorecard `notas_humanas` (ENTREV-02) | Frontend (RH desktop) | Database (SECURITY DEFINER write RPC) | Human override write — clone `salvar_revisao_redacao` RPC pattern |
| Cognitive prova delivery + light proctoring (ENTREV-05) | Browser / Client (mobile-first SJT shell) | Frontend Server (route, opt-in gate) | Timer/tab-blur/paste-block are DOM-level; logged as context, never auto-rejects |
| Cognitive scoring server-side (anti-tampering) | API / Edge Function (`submit-cognitivo-final` or RPC) | Database (`scores_candidato` tipo='cognitivo') | Client never scores; server recomputes from raw_responses (clone `submit-bigfive-final` / `pontuar_sjt`) |
| Reject-by-cognitive-alone gate + bias_audit_log | Database (decision-path guard) + Frontend (expanded-justification UI) | — | RNF-07a — never auto-reject; forces justification + audit row |

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Spec source (binding):** `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` (interview sections: guia STAR/PEI, dashboard, transcript analysis) + `docs/prds/m2-funil-rh/PRD-cognitivo-raciocinio.md` (ENTREV-05 — itens CC0, banda qualitativa, CONTEXTUAL, bias_audit_log). Consult also `docs/prds/prd-db-004-entrevistas-avaliacoes.md` (prior). Planner/researcher consolidate and implement verbatim (rubric BARS, STAR/PEI, CC0 items, banding); only genuine gaps go to the user.
- **EF architecture:** 2 NEW dedicated EFs, both cloning the PROD-green pattern (`analise-candidato-individual` / `avaliar-redacao-cultural`):
  1. `gerar-guia-entrevista` — branch by `tipo` (`online` → 5-7 STAR/PEI questions with BARS 1-5 anchors + dimension, ≥1 covering a dimension with score<3; `presencial` → guide focused on GAPS of the online interview, dimensions score<4).
  2. `avaliar-transcricao-entrevista` — RH pastes transcript → BARS scores per competency + flags + citations; language/accent flag at score<3 → blocks `avancar_etapa` until human review.
  - Mandatory pattern: STATIC `npm:` imports + injected `zodOutputFormat`/`zodResponseFormat` helpers + schema `npm:zod@3.25.76/v4` + **authenticate-THEN-authorize** (role + ownership via `candidatos.user_id`=auth.uid() / `vagas.created_by` for RH — NEVER `candidato_id===user.id`) + JWT-on + NEVER writes candidaturas decision (RNF-07a). call_types `interview_guide` + `transcript_analysis` already exist in `llm_call_type` (prompt_versions is_active=false → activate+hydrate in apply wave, like culture_fit_essay).
- **Cognitive prova proctoring (ENTREV-05):** Light proctoring MINIMUM V1 — soft timer + tab-blur/visibilitychange logging + paste-block on the answer field. NO webcam, NO screen capture, NO biometria. Logged as context in `bias_audit_log`, NEVER auto-rejects. opt-in via `vaga.aplica_cognitivo` (default false). Qualitative band (5 faixas) marked CONTEXTUAL; rejection by cognitive alone requires expanded justification + `bias_audit_log`.
- **24h gestor notification:** V1 = in-app + MANUAL scheduling. RH sets interview datetime; in-app dashboard surfaces upcoming interviews + computes/displays the 24h marker. NO automated email/calendar pipeline this phase (auto-scheduling deferred → Future per ENTREV-02). Do NOT wire n8n email now.

### Claude's Discretion
- Exact table/column/index names (watch index-name collisions — see Phase 13 `idx_perguntas_cargo`), component structure, RLS specifics, and the exact set of interview BARS competencies — all at planner discretion provided it honors the PRDs + the decisions above.

### Deferred Ideas (OUT OF SCOPE)
- Auto-scheduling / calendar integration (Google / MS Bookings) → Future (per ENTREV-02 + milestone scope).
- Email automation n8n for the 24h notification → out of this phase.
- A11y/WCAG of the interview UI + prova → Phase 16.
- Final consolidated decision → Phase 15.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENTREV-01 | EF `gerar-guia-entrevista` (`online`) → 5-7 STAR/PEI questions, BARS 1-5 anchors + dimension; ≥1 question per dimension with score<3 | `InterviewGuideSchema` (lines 190-203 of `00-shared-zod-schemas.ts`) already enforces `.min(5).max(7)` + `bars_anchors.length(5)`; `interview_guide` template + call_type exist. The "≥1 covers weak dim" guarantee is NOT in the schema — must be enforced as a server-side post-validation retry/augment step (see Pitfall 4). |
| ENTREV-02 | RH screen `/rh/candidato/:id/entrevista` = dashboard + guide + inline editable scorecard (`notas_humanas`); gestor notified 24h before (manual V1) | Route namespace `/rh/candidato/:id/*` exists (`RedacaoReviewPanel` mounts at `/rh/candidato/:id/redacao`). Scorecard write = clone `salvar_revisao_redacao` RPC. 24h marker = pure client-side date math on a manually-set datetime column. |
| ENTREV-03 | EF `avaliar-transcricao-entrevista` → BARS scores + flags + citations; language/accent flag at score<3 blocks `avancar_etapa` until human review | `TranscriptAnalysisSchema` (lines 211-244) has per-competency `cited_evidence` + `bias_flags` + `score`. **The language/accent flag must be DERIVED** (`bias_flags.regional_markers_ignored===false && score<3`) — there is no first-class flag field. The block must live in `avancar_etapa` (see Open Q2). |
| ENTREV-04 | EF `gerar-guia-entrevista` (`presencial`) → guide focused on GAPS of online interview (dimensions score<4) | Same EF, `format` branch. The online-interview scorecard (Etapa 4 `scores_candidato` tipo='entrevista') feeds the gap computation. |
| ENTREV-05 | Cognitive reasoning prova (CC0 items), opt-in `vaga.aplica_cognitivo`, light proctoring, qualitative band (5 faixas) CONTEXTUAL, blocks reject-by-cognitive-alone (justification + `bias_audit_log`) | `tipo_score` enum has `'cognitivo'`. Server-side scoring = clone `submit-bigfive-final`/`pontuar_sjt`. Band enum + item bank are net-new. `bias_audit_log` table exists (generic `dados jsonb`). PRD-cognitivo §8 fully specifies scoring/shuffle/banding. |

## Standard Stack

### Core (all already in the project — reuse, do NOT re-introduce)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.102.0 (pinned) | Anthropic Messages + `helpers/zod` `zodOutputFormat` | Project-pinned; `messages.parse` + structured output proven PROD-green in 3 EFs [VERIFIED: codebase + npm — 0.106.0 is newer but project deliberately pins 0.102.0] |
| `openai` | 6.42.0 (pinned) | OpenAI fallback after circuit breaker + `helpers/zod` `zodResponseFormat` | Fallback provider in `callAi`; pinned [VERIFIED: codebase + npm] |
| `zod` | 3.25.76 (with `/v4` import for SDK helpers) | Body + structured-output schema validation | `/v4` is load-bearing for the SDK structured-output helpers; `npm view zod` confirms 4.4.3 latest but project pins 3.25.76 [VERIFIED: codebase + npm] |
| `@supabase/supabase-js` | 2 (via esm.sh) | Two-client (anon+Authorization for auth.getUser; service_role for privileged reads/writes) | D-23 two-client pattern, project-wide [VERIFIED: codebase] |
| `_shared/ai-client.ts` (`callAi`, `loadPrompt`, `resolvedPromptFromLoaded`) | Phase 9 | injection-detect → maskPII → retry → breaker → fallback → cost → audit-log | NEVER re-implement any of these; both EFs call `callAi` for the untrusted text [VERIFIED: codebase] |

### Supporting (frontend — all already vendored)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui primitives | vendored since M1/Phase 7 | textarea, slider, radio-group, alert-dialog, tabs, tooltip, calendar, select | Per 14-UI-SPEC §Registry Safety — all already in `src/components/ui/` |
| `@tanstack/react-query` v5 | project | server-state for guide/transcript/scorecard reads | staleTime 5min, retry 2 (CLAUDE.md) |
| React Hook Form + Zod | project | inline scorecard + manual datetime form | pt-BR schemas, per-field validation |
| Glass primitives (`Glass`, `GlassPanel`, `GlassButton`) | `src/components/ui/glass.tsx` | RH desktop + candidate mobile shells | reuse, do not re-author (14-UI-SPEC) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `submit-cognitivo-final` EF (PRD-cognitivo §8.4) | A SECURITY DEFINER RPC `pontuar_cognitivo` (like `pontuar_sjt`) | Cognitive scoring has **no LLM** (CTT soma simples per PRD §8.2) → an RPC is simpler/cheaper than an EF and matches `pontuar_sjt`. **Recommend RPC** unless PDF/file work is needed (it isn't). Surfaced as Open Q3. |
| New `entrevista_guias`/`entrevista_analises` tables | Reuse legacy `entrevistas_online.analise_ia` / `notas_durante` columns | Legacy tables are M1-era, in NO migration, with unaudited RLS, and shaped for Bookings/video (not paste-transcript). **Recommend new M2 tables.** See Runtime State Inventory. |
| Bumping SDK to 0.106.0 / openai 6.44.0 | Keep pinned 0.102.0 / 6.42.0 | Project deliberately pins; the 3 PROD-green EFs run on the pins. **Do NOT bump** — out of phase scope. |

**Installation:** No new packages. All imports are the project-pinned `npm:` specifiers in the EF files. Confirm at execute time:
```bash
npm view @anthropic-ai/sdk@0.102.0 version   # → 0.102.0 (exists)
npm view openai@6.42.0 version               # → 6.42.0 (exists)
npm view zod@3.25.76 version                 # → 3.25.76 (exists)
```

## Package Legitimacy Audit

> No NEW external packages are installed in this phase. All EF imports reuse the exact project-pinned `npm:` specifiers already deployed PROD-green in `avaliar-redacao-cultural` / `analise-candidato-individual`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@anthropic-ai/sdk@0.102.0` | npm | mature | very high | github.com/anthropics/anthropic-sdk-typescript | n/a (slopcheck not installed) | Approved — already PROD-deployed in 3 EFs |
| `openai@6.42.0` | npm | mature | very high | github.com/openai/openai-node | n/a | Approved — already PROD-deployed |
| `zod@3.25.76` | npm | mature | very high | github.com/colinhacks/zod | n/a | Approved — already PROD-deployed |
| `@supabase/supabase-js@2` | esm.sh | mature | very high | github.com/supabase/supabase-js | n/a | Approved — project-wide |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was not installed at research time. This is a no-op risk here: the phase installs ZERO new packages — every import is an exact reuse of a specifier already running in PROD. If the planner adds any new package, it must run the Package Legitimacy Gate and gate the install behind `checkpoint:human-verify`.*

## Architecture Patterns

### System Architecture Diagram

```
ENTREV-01/04 (guia)                        ENTREV-03 (transcrição)
┌──────────────────┐                       ┌──────────────────────┐
│ RH desktop       │  POST {candidatura,   │ RH desktop pastes    │
│ /rh/candidato/   │  vaga, tipo:online|   │ transcript textarea  │
│  :id/entrevista  │  presencial}          │ "Analisar"           │
│ "Gerar guia"     │                       └──────────┬───────────┘
└────────┬─────────┘                                  │ POST {candidatura, transcricao}
         │ JWT (RH)                                    │ JWT (RH)
         ▼                                             ▼
┌─────────────────────────────┐         ┌──────────────────────────────────┐
│ EF gerar-guia-entrevista    │         │ EF avaliar-transcricao-entrevista │
│ 1 auth.getUser (anon+JWT)   │         │ 1 auth.getUser                    │
│ 2 role from usuarios_rh     │         │ 2 role from usuarios_rh           │
│   (recrutador→rh) + vaga    │         │   + vaga.created_by ownership     │
│   .created_by ownership     │         │ 3 len(transcricao)≥200 guard      │
│ 3 read scorecard (etapas    │         │ 4 callAi(transcript_analysis,     │
│   anteriores) via service   │         │   UNTRUSTED transcript) ──────┐   │
│ 4 callAi(interview_guide) ──┼──┐      │   → TranscriptAnalysisSchema  │   │
│   → InterviewGuideSchema    │  │      │ 5 DERIVE lang/accent flag     │   │
│ 5 post-validate ≥1 weak-dim │  │      │   (bias_flags + score<3)      │   │
└────────┬────────────────────┘  │      │ 6 persist scores_candidato    │   │
         │ persist                │      │   tipo='entrevista' + flag    │   │
         ▼                        │      └──────────┬────────────────────┘   │
┌─────────────────────┐          │                 │                         │
│ entrevista_guias     │         ▼                 ▼                         ▼
│ (guia jsonb, tipo,   │   ┌──────────────┐  ┌────────────────┐    ┌──────────────────┐
│  prompt_version)     │   │ callAi (P9)  │  │ scores_candidato│    │ avancar_etapa()  │
└─────────────────────┘    │ inj→mask→    │  │ + entrevista_   │    │ GUARD: blocks if │
                           │ retry→break→ │  │ analises        │    │ unresolved lang/ │
                           │ fallback→    │  └────────────────┘    │ accent flag      │
ENTREV-02 (scorecard)      │ cost→audit   │  RH "Confirmar         │ (RNF-07a)        │
┌─────────────────────┐    └──────────────┘  revisão humana"───────┴──────────────────┘
│ EntrevistaScorecard  │                       unblocks
│ Inline → RPC         │
│ salvar_avaliacao_    │   ENTREV-05 (cognitivo, opt-in vaga.aplica_cognitivo)
│ entrevista (DEFINER) │   ┌────────────────┐  POST {candidatura,raw_responses,seed}
│ → notas_humanas      │   │ Candidate      │  ───────────────────────────────────┐
└─────────────────────┘    │ mobile prova   │  (NO score/band ever returned)       │
                           │ + soft timer   │                                      ▼
                           │ + tab-blur log │              ┌──────────────────────────────┐
                           │ + paste-block  │              │ RPC pontuar_cognitivo OR EF   │
                           └────────────────┘              │ submit-cognitivo-final        │
                                                           │ CTT soma server-side (NO LLM) │
                                                           │ → scores_candidato            │
                                                           │   tipo='cognitivo' + banda    │
                                                           │ NEVER auto-rejects (RNF-07a)  │
                                                           └───────────────┬───────────────┘
                                                                           ▼
                                          RH CognitivoBandCard (CONTEXTUAL · não-eliminatório)
                                          reject-by-cognitive-alone → expanded justification
                                          + bias_audit_log row (DECISAO path, Phase 15 gate)
```

### Recommended Project Structure (mirrors PRD-MASTER §8.6 + Phase 13 layout)
```
supabase/functions/
├── gerar-guia-entrevista/
│   ├── index.ts                 # clone of avaliar-redacao-cultural skeleton (RH-authorize)
│   └── _local/                  # post-validation helpers (weak-dim coverage check)
├── avaliar-transcricao-entrevista/
│   ├── index.ts                 # clone; derives lang/accent flag server-side
│   └── _local/derive-flags.ts   # bias_flags + score<3 → flag (deterministic, NOT the LLM)
├── submit-cognitivo-final/      # OR a pontuar_cognitivo RPC — see Open Q3
└── _shared/
    ├── entrevista-schemas.ts    # NEW — body schemas (no score fields, anti-tamper)
    └── cognitivo-schemas.ts     # NEW — body + metadata jsonb schema (band enum)
src/features/entrevista/         # NEW feature folder (per CLAUDE.md feature convention)
│   ├── components/              # EntrevistaWorkspace, Dashboard, GuiaPanel, ScorecardInline, TranscricaoReviewPanel, CognitivoBandCard
│   ├── hooks/                   # useGuiaEntrevista, useTranscricaoAnalise, useEntrevistaScorecard
│   └── services/                # entrevistaService (allowlist reads — NEVER select('*'))
src/features/avaliacao-cognitiva/  # NEW — candidate prova (mobile)
│   └── components/ProvaCognitivaScreen.tsx  # clones SjtMultiplaEscolhaScreen ScreenShell
supabase/migrations/             # apply via MCP apply_migration (D-22)
```

### Pattern 1: RH-invoked EF — authenticate THEN authorize via usuarios_rh
**What:** RH EFs verify the JWT (anon+Authorization → `auth.getUser()`), then read the role from `usuarios_rh` (NOT from JWT claims), map `recrutador→rh`, and enforce `vagas.created_by === user.id` for non-admins.
**When to use:** Both `gerar-guia-entrevista` and `avaliar-transcricao-entrevista`.
**Why role comes from the DB, not the JWT:** `getUser()` reflects `raw_app_meta_data` (no role); the custom_access_token_hook injects role ONLY into the signed JWT claims, which `getUser()` does not decode. Reading role from claims returns null → silent 403. (Documented landmine, fixed in `comparativo-candidatos`.)
**Example:**
```typescript
// Source: supabase/functions/comparativo-candidatos/index.ts:114-188 (PROD-green)
const { data: userRes } = await supabaseUser.auth.getUser();
if (!userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;
// role from usuarios_rh via service_role (NOT from JWT claims — landmine)
const { data: rhRow } = await supabaseAdmin.from("usuarios_rh").select("role")
  .eq("id", user.id).maybeSingle();
const dbRole = rhRow?.role ?? null;
const role = dbRole === "recrutador" ? "rh" : dbRole; // map to the two effective roles
if (role !== "rh" && role !== "administrador") return errorResponse("FORBIDDEN", "Acesso negado.", 403);
// ownership: role='rh' MUST own the vaga; 'administrador' bypasses
if (role === "rh") {
  const { data: vagaRow } = await supabaseAdmin.from("vagas").select("created_by")
    .eq("id", vagaId).maybeSingle();
  if (!vagaRow || vagaRow.created_by !== user.id) return errorResponse("FORBIDDEN", "Acesso negado.", 403);
}
```

### Pattern 2: STATIC npm: imports + injected structured-output helpers (the .join fix)
**What:** Import SDKs and the zod helpers STATICALLY at module top; pass the helper builders into `callAi` via `deps`.
**When to use:** Every AI EF, no exceptions.
**Why:** `await import(["npm:",pkg].join(""))` hides the package from the deploy bundler → `ERR_MODULE_NOT_FOUND` at runtime (the EF "deploys" but 500s on every call). Without injecting the helpers, `callAi` falls back to the no-op `(s)=>s` and breaks BOTH providers.
**Example:**
```typescript
// Source: supabase/functions/avaliar-redacao-cultural/index.ts:57-60, 428-429 (PROD-green)
import Anthropic from "npm:@anthropic-ai/sdk@0.102.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";
import OpenAI from "npm:openai@6.42.0";
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod";
// ... in Deno.serve wiring:
return await handler(req, {
  anthropic, openai, supabaseAdmin, supabaseUser,
  zodOutputFormat: (s, _n) => zodOutputFormat(s as never),
  zodResponseFormat: (s, n) => zodResponseFormat(s as never, n),
});
```

### Pattern 3: Human-review-mandatory + flag-blocks-advance (never auto-reject, RNF-07a)
**What:** The EF NEVER writes `candidaturas`. It persists a score row with a status; a flag SEGURA (holds) the auto-advance, but the human always confirms. For Phase 14 the language/accent flag at score<3 must block `avancar_etapa` until a human confirms review.
**Why:** Same philosophy as Phase 13's `bloqueio_avanco`. The block must be enforced in `avancar_etapa` (a funil-state invariant), NOT only in the UI.
**Example (the invariant comment from the cultural EF):**
```typescript
// Source: avaliar-redacao-cultural/index.ts:19-23, 361-362
// INVARIANTE (RNF-07a): a EF NUNCA escreve `candidaturas`. status_analise='pendente_humano'
// SEMPRE; bloqueio_avanco SÓ quando a flag dispara (apenas SEGURA o avanço — o humano decide).
status_analise: "pendente_humano",
bloqueio_avanco: languageAccentFlag && score < 3, // SEGURA — nunca auto-reject
```

### Pattern 4: SECURITY DEFINER write RPC for human overrides (notas_humanas)
**What:** The inline scorecard write goes through a SECURITY DEFINER RPC (role + own-vaga guarded), not a direct table write.
**Template:** `salvar_revisao_redacao(p_redacao_id, p_decisao, p_notas, p_scores_humanos jsonb) → json`.
**For Phase 14:** author `salvar_avaliacao_entrevista(p_candidatura_id, p_scores_humanos jsonb, p_notas text)` — same shape, guards role='rh'/'administrador' + vaga ownership.

### Anti-Patterns to Avoid
- **`select('*')` on any candidate-readable surface:** RLS is row-level only and does NOT hide columns. Candidate own-row reads + RH reads of transcript/notes/scores use explicit allowlist projections (`reference_select_star_leaks_pii`, pego no Phase 8 security gate).
- **`candidato_id === user.id`:** `candidato_id` is `candidatos.id`, NOT the auth uid. Resolve ownership via `candidatos.user_id = auth.uid()` (the latent SJT bug).
- **Reading role from JWT claims inside an EF:** returns null → silent 403. Read from `usuarios_rh`.
- **`ALTER TYPE tipo_score ADD VALUE`:** unnecessary — `'entrevista'` and `'cognitivo'` already exist. Adding inside a txn fails anyway.
- **`BEGIN; ... COMMIT;` wrapper in PL/pgSQL migrations:** triggers SQLSTATE 42601 (D-22). Apply via MCP `apply_migration`.
- **Returning a score/band to the candidate from the cognitive EF:** the candidate NEVER sees score/band/pass-fail (RNF-07a). Return a neutral `{ ok: true }`.
- **Letting the LLM decide the language/accent block:** the flag is DERIVED deterministically server-side from `bias_flags` + score, not asked of the model.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM call + injection-detect + PII-mask + retry + fallback + cost + audit-log | A new fetch-to-Anthropic wrapper | `callAi` from `_shared/ai-client.ts` | 6 cross-cutting concerns, all PROD-tested; re-implementing re-introduces the LGPD/injection landmines |
| Prompt resolution (active row, canary, version) | Hardcoded prompt strings | `loadPrompt(call_type, supabaseAdmin)` + `resolvedPromptFromLoaded` | DB-active prompt library (IA-01); hardcoding breaks versioning/audit |
| Structured-output JSON validation | Hand-parsing model JSON | `zodOutputFormat`/`zodResponseFormat` + the existing `InterviewGuideSchema`/`TranscriptAnalysisSchema` | Schemas already define the exact BARS contract with constraints (5 anchors, 5-7 questions) |
| Cognitive scoring (CTT soma + shuffle-reverse + banding) | Inline ad-hoc summation in the EF | A deep module `scoring.ts` with stable interface (`scoreRaciocinio`) + synthetic-profile fixtures | PRD-cognitivo §8.2 mandates this; mirrors `bigfive-scoring.ts` (already in `_shared`) |
| Anti-tampering re-score | Trusting client-sent scores | Server recomputes from `raw_responses`, ignores any client score (clone `submit-bigfive-final`) | Client never scores (anti-tamper invariant) |
| Two-client auth | One service_role client doing `getUser` | `supabaseUser` (anon+Authorization) for getUser + `supabaseAdmin` (service_role) for privileged ops | service_role has no `auth.uid()` context (D-23) |
| RH human-override write | Direct table UPDATE from the client | SECURITY DEFINER RPC guarded by role + ownership | RLS + audit; clone `salvar_revisao_redacao` |

**Key insight:** Phase 14 has almost nothing to invent at the AI/infra layer — the entire value is correct wiring of existing PROD-green modules plus net-new schema (interview tables + cognitive item bank + band enum). The genuinely novel work is (a) the CC0 cognitive item bank sourcing/seeding and (b) the deterministic language/accent flag derivation.

## Runtime State Inventory

> This phase adds new tables and EFs AND touches a `prompt_versions` activation. It also collides with pre-existing M1-legacy interview/cognitive schema. All five categories checked.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `prompt_versions` rows for `interview_guide` + `transcript_analysis`: seeded `is_active=false` with `[SEED PLACEHOLDER]` content (Phase 9 seed migration `20260609000004`). The two templates' real `system_template`/`user_template`/`content_hash` are NOT yet in the DB. | Apply-wave: `execute_sql` UPDATE (dollar-quote) the system/user templates from `04-interview-guide.md`/`05-transcript-analysis.md` + set `is_active=true` (mirror Phase 13 `culture_fit_essay` hydration). Do NOT set `deployed_at` before content (immutability trigger locks template/hash after deployed_at). |
| **Live service config** | None new. The 24h notification is in-app only (no n8n/email/calendar wired this phase, per CONTEXT). No new Vault secret needed (EFs reuse the existing ANTHROPIC/OPENAI keys + service_role Bearer). | None — verified by CONTEXT decision (no n8n now). |
| **OS-registered state** | None. No cron/scheduler registration in this phase (the cost cron from Phase 9 is unaffected). | None — verified (no new pg_cron job required for in-app 24h marker; it's client-side date math). |
| **Secrets/env vars** | EFs reuse `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` (already set in PROD for the Phase 10/13 EFs). | None — code reuse only. Confirm the keys are present in the EF env at deploy (they are, since 3 EFs run). |
| **Build artifacts / installed packages** | `database.types.ts` (at repo ROOT, NOT `src/types/`) will be stale after the new tables/RPCs land. The new EFs auto-bundle `_shared` at deploy (CLI). | Apply-wave: regenerate `database.types.ts` via `npm run db:types` after migrations. Deploy EFs via `supabase functions deploy <name>` (JWT-on for both RH EFs). |

**⚠️ Pre-existing M1-LEGACY interview/cognitive schema (NOT in any tracked migration — discovered via `grep -rln entrevistas_online supabase/migrations` → empty):**
- `entrevistas_online`, `entrevistas_presenciais` — full tables with Bookings/video columns (`link_videochamada`, `gravacao_url`, `transcricao`, `analise_ia`, `notas_durante`, `status_entrevista` enum). These are M1-era scaffolding, present in `database.types.ts` but created OUTSIDE the GSD migration flow.
- `avaliacoes_entrevista` (`tipo_entrevista_avaliacao` enum online|presencial), legacy RPCs `obter_detalhes_entrevista`, `validar_referencia_entrevista`.
- `scores_raven`, `serie_raven` enum, `calcular_scores_raven` RPC, `teste_raven_*` history actions, `InstrucoesRavenPage`/`TesteRavenPage` routes + 60 `.webp` Raven blobs in git history (PRD-cognitivo Q-C5: decided NOT to `git filter-repo` now; do NOT use those images — CC0 items only).

**Action for the planner:** Do NOT reuse the legacy `entrevistas_*` tables. They are untracked, unaudited-RLS, and shaped for Bookings/video (deferred to Future), not paste-transcript V1. Author NEW M2 tables (`entrevista_guias`, `entrevista_analises`/scores via `scores_candidato`, `cognitivo_itens`, `cognitivo_respostas`). Surface to the user whether the legacy tables should be deprecated/dropped (a cleanup task) or left dormant — recommend leaving dormant in this phase and adding a deprecation note (drop is a Phase 16 cleanup candidate). Watch for **index-name collisions** with legacy indexes when naming new ones.

## Common Pitfalls

### Pitfall 1: The `.join("npm:")` dynamic-import bug (silent PROD 500)
**What goes wrong:** EF deploys successfully, then 500s on every call with `ERR_MODULE_NOT_FOUND`.
**Why it happens:** `await import(["npm:",pkg].join(""))` hides the package from the deploy bundler's dependency scan.
**How to avoid:** STATIC `npm:` imports at module top (Pattern 2). Verified fix in `avaliar-redacao-cultural`/`analise-candidato-individual`.
**Warning signs:** EF logs show module-resolution errors; the EF "works" in `deno test` (which imports differently) but fails live.

### Pitfall 2: helper-wiring gap → callAi no-op
**What goes wrong:** `callAi` returns garbage / breaks both providers even though SDKs import fine.
**Why it happens:** `zodOutputFormat`/`zodResponseFormat` not injected via `deps` → `callAi` falls back to `(s)=>s`.
**How to avoid:** Pass both builders in the `Deno.serve` wiring (Pattern 2). Tests omit them deliberately (no-op for offline mocking).

### Pitfall 3: Zod schema needs `/v4` for the SDK structured-output helpers
**What goes wrong:** structured output mis-validates or the helper throws.
**Why it happens:** the SDK `helpers/zod` expects the zod v4 surface; the body schemas pin `npm:zod@3.25.76` (v3 is fine for `.safeParse` of the body) but the OUTPUT schema path needs the `/v4` import.
**How to avoid:** import the output-schema zod as `npm:zod@3.25.76/v4` where the SDK helper consumes it (the existing EFs already do this for `EssayScoringV1Schema`).

### Pitfall 4: InterviewGuideSchema does NOT enforce "≥1 question covers each weak dimension"
**What goes wrong:** ENTREV-01 acceptance ("≥1 pergunta para cada dimensão com score<3") passes Zod but the model may not actually cover every weak dimension.
**Why it happens:** the schema enforces 5-7 questions with BARS anchors, but the weak-dimension-coverage guarantee is a SEMANTIC constraint the LLM is instructed to honor, not a structural one.
**How to avoid:** server-side post-validation in the EF — compute the set of weak dimensions (score<3 from the prior scorecard), check the generated `questions[].competency` covers each; if a weak dim is uncovered, either (a) one bounded re-prompt with the missing dims emphasized, or (b) flag for human review. Do NOT silently pass an incomplete guide. (Same defensive posture as the cultural EF's never-absent invariant.)

### Pitfall 5: Language/accent flag has no first-class schema field — it must be derived
**What goes wrong:** Plan assumes the model returns a "language flag"; it doesn't.
**Why it happens:** `TranscriptAnalysisSchema` carries per-competency `bias_flags { content_dependent_only, regional_markers_ignored, disfluencies_ignored }` — NOT a top-level language/accent flag.
**How to avoid:** DERIVE deterministically in `_local/derive-flags.ts`: a language/accent flag fires when a competency has `score < 3` AND its `bias_flags.regional_markers_ignored === false` (i.e., the model did NOT ignore regional markers → possible regional bias). This is the anti-regional-bias safety net (PRD risk #8). The derivation is server-authoritative, never the LLM's decision.

### Pitfall 6: prompt hydration ordering (immutability trigger)
**What goes wrong:** `execute_sql` UPDATE of the template fails or the row gets locked.
**Why it happens:** the immutability trigger (Phase 9) locks `template`/`content_hash`/`semver` once `deployed_at` is set.
**How to avoid:** hydrate content + set `is_active=true` BEFORE/without touching `deployed_at`. Exact precedent: Phase 13 `culture_fit_essay` activation.

### Pitfall 7: Index-name collisions with legacy + sibling phases
**What goes wrong:** migration fails with "relation idx_... already exists".
**Why it happens:** Phase 13 already created `idx_perguntas_cargo`; the legacy schema has many `idx_*` on `entrevistas_*`/`scores_raven`.
**How to avoid:** namespace new indexes (`idx_entrevista_guias_candidatura`, `idx_cognitivo_itens_secao`, etc.); grep existing index names before authoring.

### Pitfall 8: tsc baseline + commit hook
**What goes wrong:** commit blocked by pre-commit tsc against ~291-305 legacy errors.
**How to avoid:** commit via `git -c core.hooksPath=/dev/null` (project convention, allowlisted). Keep tsc baseline ≤305 (Phase 8 close was 305; aim for zero growth). Wave-0 RED tests are required (smoke-runtime gate).

## Code Examples

### Two-client production wiring (clone target for both EFs)
```typescript
// Source: avaliar-redacao-cultural/index.ts:394-431 (PROD-green)
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    const supabaseUser = createClient(SUPABASE_URL!, ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
    return await handler(req, { anthropic, openai, supabaseAdmin, supabaseUser,
      zodOutputFormat: (s, _n) => zodOutputFormat(s as never),
      zodResponseFormat: (s, n) => zodResponseFormat(s as never, n) });
  });
}
```

### Generic score-sink RLS (clone for any new Phase-14 table the candidate must not read)
```sql
-- Source: supabase/migrations/20260611000001_scores_candidato.sql:80-90 (PROD-green)
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
-- ONLY RH/admin may read; NO candidato/anon policy → candidato denied entirely.
CREATE POLICY rh_le_<table> ON public.<table>
  FOR SELECT
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
-- no INSERT/UPDATE policy → only SECURITY DEFINER RPC / service_role EF writes
```

### Cognitive scores persistence (no LLM — clone submit-bigfive-final shape)
```typescript
// Persist to the existing generic sink — tipo='cognitivo', NO ALTER TYPE.
await supabaseAdmin.from("scores_candidato").upsert({
  candidatura_id, tipo: "cognitivo", subtipo: "raciocinio_logico",
  score: scoreTotalRaw, score_max: nItens,
  status: "sucesso", // informational ONLY — never drives etapa (RNF-07a)
  metadata: { instrumento: "raciocinio_logico_cc0", versao_item_bank: "v1",
    secoes, banda, raw_responses, shuffle_seed, completion_time_seconds, flags },
}, { onConflict: "candidatura_id,tipo,subtipo,pergunta_id" }).select("id").single();
// Return NEUTRAL payload — candidate never sees score/band.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ICAR60 / Raven as the cognitive instrument | CC0 reasoning items (matriz + letra-número) repositioned as a non-psychological technical prova, online + light proctoring | 2026-06-05 (PRD-cognitivo pivot) | No psychologist RT needed; out of SATEPSI/CFP jurisdiction; only CC0 items, never the Raven `.webp` blobs |
| MS Bookings auto-scheduling (RF-20a/b/c) | Manual datetime + in-app 24h marker, no n8n/calendar | This phase (CONTEXT) | V1 ships without the Bookings webhook/`agendamentos_entrevista` pipeline (deferred to Future) |
| `tipo='icar60'`/`'raciocinio_logico'` (PRD prose) | `tipo='cognitivo'` (live enum, forward-declared Phase 11) | 2026-06-11 (scores_candidato migration) | **Resolve the naming conflict before authoring** — the live enum is the source of truth (`subtipo='raciocinio_logico'` reconciles the PRD label) |
| `submit-cognitivo-final` EF (PRD §8.4) | A `pontuar_cognitivo` RPC is the cheaper match (no LLM) | recommended this phase | Surfaced as Open Q3 — RPC vs EF for no-LLM scoring |

**Deprecated/outdated:**
- Legacy `entrevistas_online`/`entrevistas_presenciais`/`avaliacoes_entrevista`/`scores_raven` tables — M1 scaffolding, untracked, shaped for video/Bookings. Leave dormant; do not reuse.
- `InstrucoesRavenPage`/`TesteRavenPage` routes — Raven shell; the cognitive prova clones the SJT `ScreenShell` instead (per 14-UI-SPEC), not these.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The two `prompt_versions` rows (`interview_guide`, `transcript_analysis`) are currently `is_active=false` with placeholder content (seeded by Phase 9, never hydrated). | Runtime State Inventory | If already active/hydrated, the apply-wave UPDATE is a no-op (harmless). Confirm via a live `SELECT call_type, is_active, left(system_template,40) FROM prompt_versions WHERE call_type IN ('interview_guide','transcript_analysis')` at execute time. |
| A2 | The legacy `entrevistas_*` tables have unaudited/permissive RLS and should be left dormant, not reused. | Runtime State Inventory | If they have correct RLS and the right shape, the planner could reuse them and save a migration — but their video/Bookings shape makes this unlikely. Recommend the security gate audit their RLS regardless (they're candidate-adjacent). |
| A3 | The language/accent flag is derived as `score<3 && bias_flags.regional_markers_ignored===false`. | Pitfall 5 / ENTREV-03 | The exact boolean predicate is an interpretation of RF-24 ("score<3 + flag linguagem/sotaque"). If the intended semantics differ, the block may over/under-fire. **Confirm the derivation predicate with the user** before locking. |
| A4 | A `pontuar_cognitivo` RPC (no LLM) is preferable to an EF for cognitive scoring. | Open Q3 | If file/PDF or future LLM devolutiva is wanted in-scope, an EF is better. PRD-cognitivo §8.4 names an EF; the RPC is a recommendation, not a locked decision. |
| A5 | The 24h marker needs no pg_cron — it is pure client-side date math on a manually-set datetime column. | Runtime State Inventory | True for the in-app marker. If the user later wants a server-side "fire at T-24h" signal (even in-app), a cron/trigger would be needed — but CONTEXT explicitly defers that. |
| A6 | The cognitive item bank uses ONLY ICAR CC0 items (Harvard Dataverse `doi:10.7910/DVN/TZJGAT`), ~18 matriz + ~10 letra-número, per PRD-cognitivo Q-C1/Q-C4. | ENTREV-05 | If MaRs-IB or a different source is wanted, item sourcing changes. PRD locks ICAR-CC0-only for V1. |

**The above are the decisions that need user confirmation before execution** — especially A3 (the bias-flag predicate) and the `tipo='cognitivo'` vs PRD `raciocinio_logico` reconciliation (Open Q1).

## Open Questions

1. **Cognitive `tipo` naming: `cognitivo` (live enum) vs `raciocinio_logico` (PRD prose).**
   - What we know: `tipo_score` enum in PROD has `'cognitivo'` (forward-declared Phase 11). PRD-cognitivo §6/§8 says `tipo='raciocinio_logico'` and EF `submit-cognitivo-final`. Phase position also differs (PRD: Etapa 3; CONTEXT: Etapa 4/5).
   - What's unclear: whether to honor the live enum (`tipo='cognitivo'`, `subtipo='raciocinio_logico'`) or add the PRD value.
   - Recommendation: **Use the live enum** `tipo='cognitivo'` with `subtipo='raciocinio_logico'` (no `ALTER TYPE`). Position per CONTEXT (Etapa 4/5, opt-in). This is non-blocking but should be stated explicitly in the plan so the PRD-prose mismatch is a documented deviation, not a surprise.

2. **Where does the language/accent block live — `avancar_etapa` RPC or a separate guard?**
   - What we know: RF-24 says the system "bloqueia `avancar_etapa()` até gestor confirmar revisão". `avancar_etapa(candidatura_uuid, usuario_rh_uuid)` is an existing RPC.
   - What's unclear: whether to add a guard clause inside `avancar_etapa` (CREATE OR REPLACE) or a precondition check the UI calls first.
   - Recommendation: enforce in `avancar_etapa` itself (server-authoritative invariant) — UI-only blocking is bypassable. The flag's "human-confirmed" state lives on the `entrevista_analises` row (a `revisao_confirmada_em` column); `avancar_etapa` reads it.

3. **Cognitive scoring: EF `submit-cognitivo-final` vs RPC `pontuar_cognitivo`.**
   - What we know: scoring has NO LLM (CTT soma simples). PRD names an EF; `pontuar_sjt` is a precedent RPC for deterministic scoring.
   - Recommendation: an RPC is simpler/cheaper for no-LLM work and matches `pontuar_sjt`. Use an EF only if the candidate flow needs server-side file handling (it doesn't). Confirm with the user.

4. **Interview BARS competency set (Claude's discretion per CONTEXT).**
   - What we know: the rubric is per-vaga/per-cargo; `bars-rubrics-por-dimensao.md` exists in `docs/conhecimento/sjt/`.
   - Recommendation: derive the competency set from the vaga's critical competencies (the same source the guide EF reads). Do not hardcode a fixed set; pass them as the `{{BARS_RUBRIC_PER_COMPETENCY}}` block.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (linked) | all migrations + EFs | ✓ | ref `isljnozzlvckrgjjbjwp` | — |
| Supabase MCP `apply_migration` | PL/pgSQL apply (D-22) | ✓ | MCP server present | `supabase db push --linked` (no-wrapper authoring) |
| `supabase functions deploy` (CLI) | EF deploy | ✓ (used in Phase 10/13) | — | — |
| Anthropic + OpenAI API keys (EF env) | `callAi` | ✓ (3 EFs run on them) | — | — |
| ICAR CC0 item dataset | ENTREV-05 item bank | ✗ (not yet downloaded/committed) | — | **No fallback — blocking for ENTREV-05.** Source from Harvard Dataverse `doi:10.7910/DVN/TZJGAT` + commit `LICENSE-CC0.md` to a `cognitivo-itens` bucket (PRD §8.5). |
| `slopcheck` | package legitimacy gate | ✗ | — | No-op — zero new packages this phase |

**Missing dependencies with no fallback:**
- ICAR CC0 cognitive item assets (matriz + letra-número + `superKey60` gabarito). The cognitive prova (ENTREV-05) cannot ship without seeded items. The planner must include an item-sourcing/seeding task (download from Harvard Dataverse, commit CC0 license, seed `cognitivo_itens`) — this is a content-acquisition step that may need a human checkpoint.

**Missing dependencies with fallback:**
- `slopcheck` — irrelevant (no new packages).

## Validation Architecture

> `workflow.nyquist_validation` is not disabled in config → this section is included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (frontend + `_shared` TS) + `deno test` (EFs) + Playwright (E2E) |
| Config file | `vitest.config.ts` (frontend); EFs tested via `deno test` with dependency-injection mocks (no network) |
| Quick run command | `npm run test:run` (Vitest single run) |
| Full suite command | `npm run test:run && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENTREV-01 | guia online: 5-7 STAR/PEI, 5 BARS anchors, ≥1 covers weak dim (score<3) | unit (deno) | `deno test supabase/functions/gerar-guia-entrevista/` | ❌ Wave 0 |
| ENTREV-01 | InterviewGuideSchema validates `.min(5).max(7)` + anchors length 5 | unit | `npm run test:run -- entrevista-schemas` | ❌ Wave 0 |
| ENTREV-03 | transcript<200 chars → reject "muito curta" | unit (deno) | `deno test .../avaliar-transcricao-entrevista/` | ❌ Wave 0 |
| ENTREV-03 | language/accent flag derivation (score<3 + regional_markers_ignored=false → flag) | unit | `deno test .../_local/derive-flags.test.ts` | ❌ Wave 0 |
| ENTREV-03 | flag blocks `avancar_etapa` until `revisao_confirmada` (SQL smoke) | integration (SQL) | live SQL smoke in apply wave | ❌ Wave 0 |
| ENTREV-03 | EF never writes candidaturas (RNF-07a) | unit (deno) | mock asserts no `from('candidaturas').update` | ❌ Wave 0 |
| ENTREV-04 | guia presencial: format branch, gaps score<4 | unit (deno) | `deno test .../gerar-guia-entrevista/` | ❌ Wave 0 |
| ENTREV-05 | cognitive scoring CTT soma (10 synthetic profiles → expected band) | unit | `deno test supabase/functions/_shared/cognitivo/scoring.test.ts` | ❌ Wave 0 |
| ENTREV-05 | anti-tampering: client-sent score ignored | unit (deno) | `deno test .../submit-cognitivo*` or RPC SQL smoke | ❌ Wave 0 |
| ENTREV-05 | opt-in: `aplica_cognitivo=false` → candidate never invited | e2e | `npm run test:e2e -- prova-cognitiva` | ❌ Wave 0 |
| ENTREV-05 | reject-by-cognitive-alone writes bias_audit_log + needs justification | unit + SQL smoke | RPC/decision-path test | ❌ Wave 0 |
| ENTREV-02 | scorecard write via RPC (role + own-vaga guarded) | SQL smoke | live smoke (fixture + set_config jwt.claims) | ❌ Wave 0 |
| ENTREV-02 | candidate never reads transcript/notes/scores (allowlist) | unit (contract) | network-projection test, NOT JSX | ❌ Wave 0 |
| RNF-12/LGPD-04 | no forbidden terms ("teste psicológico"/"QI") in new UI/EF strings | grep guard | `npm run test:run -- forbidden-strings.grep` | ✅ (Phase 9 guard — extend paths) |

### Sampling Rate
- **Per task commit:** `npm run test:run` (Vitest, <30s) + `deno test <touched EF dir>` for EF tasks.
- **Per wave merge:** full Vitest + `deno test supabase/functions/` + the LGPD-04 forbidden-strings grep.
- **Phase gate:** full Vitest + deno + Playwright green + live SQL smokes (flag-blocks-advance, RPC denial, never-auto-reject, opt-in gate) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `supabase/functions/_shared/entrevista-schemas.ts` test — body schema rejects score fields (anti-tamper contract)
- [ ] `supabase/functions/_shared/cognitivo/scoring.test.ts` — 10 synthetic profiles → expected band (clone `bigfive-scoring.test.ts`)
- [ ] `supabase/functions/gerar-guia-entrevista/` deno test — weak-dim coverage post-validation
- [ ] `supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.test.ts` — flag derivation truth table
- [ ] client↔EF contract test (the [[feedback_integration_contract_gap]] lesson — body parses under the EF's Zod schema; drop any `as never` casts after types regen)
- [ ] `src/features/entrevista/__tests__/` allowlist-projection test (candidate cannot read transcript/notes/scores — test the network select, not the JSX)
- [ ] extend the Phase 9 `forbidden-strings.grep` guard to cover `src/features/entrevista/**` + `src/features/avaliacao-cognitiva/**` + the two new EF dirs
- [ ] Framework install: none — Vitest/deno/Playwright already configured

*The smoke-runtime gate (Phase 4 lesson) applies: every Phase-14 surface needs a calibrated failing test before its implementation lands; autonomous green gates do NOT substitute for live SQL smokes + UAT.*

## Security Domain

> `security_enforcement` is enabled (absent = enabled). Section included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Two-client EF (D-23); authenticate-THEN-authorize; service_role never used for getUser |
| V2 Authentication | yes | JWT-on on both RH EFs; role from `usuarios_rh` (not JWT claims) |
| V4 Access Control | yes | RH ownership via `vagas.created_by`; candidate fully denied on scores/transcript (RLS + allowlist); IDOR via `candidatos.user_id=auth.uid()` |
| V5 Input Validation | yes | Zod `.strict()` body schemas (no score fields — anti-tamper); transcript length guard; untrusted text → `callAi` injection-detect |
| V6 Cryptography | partial | sha256 (Web Crypto) for input_hash/anti-tamper; never hand-roll |
| V7 Logging | yes | LGPD-02 redacted logs (ids/counts/status only — NEVER transcript/score/nome); `callAi` audit-logger masks PII before INSERT |
| V8 Data Protection | yes | `bias_audit_log` for cognitive rejections; LGPD-04 forbidden-terms grep; cognitive band CONTEXTUAL never shown to candidate |

### Known Threat Patterns for {Supabase EF + React SPA, AI-scored interview}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — RH reads/scores another recruiter's candidate | Elevation | `vagas.created_by === user.id` ownership check (admin bypass); candidate resolved via `candidatos.user_id` |
| PII leak via `select('*')` on transcript/notes/scores | Information disclosure | explicit allowlist projection (`reference_select_star_leaks_pii`); candidate has NO read policy on scores |
| Prompt injection in pasted transcript / candidate answers | Tampering | untrusted text passes through `callAi` (detectPromptInjection + maskPII) — never bypassed; token cap on transcript |
| Score/band tampering by candidate (cognitive) | Tampering | server recomputes from raw_responses; body schema `.strict()` rejects any score field |
| Auto-reject by AI / cognitive alone (LGPD Art. 20, Lei 9.029) | Repudiation/legal | RNF-07a — EF never writes candidaturas; cognitive never eliminatory; reject-by-cognitive forces justification + bias_audit_log |
| Regional/accent bias in transcript scoring | (fairness) | content-dependent-only prompt + derived language/accent flag blocks advance until human review (RF-24) |
| Silent 403 from JWT-claim role read | DoS (self) | read role from `usuarios_rh`, not claims (documented landmine) |
| EF self-auth bypass (if any service-internal trigger added) | Spoofing | not applicable in V1 (both EFs are RH-JWT-invoked, not trigger-invoked); if a trigger sink is added later, clone the Vault-Bearer self-auth of `analise-candidato-individual` |

## Sources

### Primary (HIGH confidence)
- Codebase: `supabase/functions/avaliar-redacao-cultural/index.ts` — clone-target EF (static imports, two-client, RNF-07a, human-review-mandatory)
- Codebase: `supabase/functions/analise-candidato-individual/index.ts` — static-import + allowlist + token-cap + never-absent patterns
- Codebase: `supabase/functions/comparativo-candidatos/index.ts:114-188` — RH role-from-`usuarios_rh` + `vagas.created_by` ownership (the JWT-claim landmine)
- Codebase: `supabase/migrations/20260611000001_scores_candidato.sql` — generic sink + `tipo_score` enum (`entrevista`+`cognitivo` forward-declared) + RLS idiom
- Codebase: `database.types.ts` (root) — live enums (`tipo_score`, `llm_call_type`, `status_score`, `status_entrevista`), legacy `entrevistas_*` tables, `avancar_etapa`/`salvar_revisao_redacao` signatures
- Codebase: `docs/conhecimento/prompts/templates/04-interview-guide.md` + `05-transcript-analysis.md` — full STAR/PEI/BARS prompt bodies
- Codebase: `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts:169-244` — `InterviewGuideSchema` + `TranscriptAnalysisSchema` (the EF output contracts)
- PRD: `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §6.4/6.5 (RF-20..27), §8.2/8.4 (schema + EF table)
- PRD: `docs/prds/m2-funil-rh/PRD-cognitivo-raciocinio.md` (full ENTREV-05 spec: CC0 items, CTT scoring, banding, bias audit, proctoring)
- Requirements: `.planning/REQUIREMENTS.md` (ENTREV-01..05), `.planning/STATE.md` (Phase 10/11/13 landmine ledger), `14-CONTEXT.md`, `14-UI-SPEC.md`
- `npm view` (executed): `@anthropic-ai/sdk` 0.106.0 latest / 0.102.0 exists; `openai` 6.44.0 / 6.42.0 exists; `zod` 4.4.3 / 3.25.76 exists; `unpdf` 1.6.2

### Secondary (MEDIUM confidence)
- Memory references: `reference_ef_npm_join_import_bug`, `reference_ef_authenticate_vs_authorize`, `reference_select_star_leaks_pii`, `feedback_integration_contract_gap`, `reference_ef_shared_bundle_freeze`, `reference_auth_hook_rls_gap`

### Tertiary (LOW confidence)
- The legacy `entrevistas_*` RLS posture is inferred (not in any migration → not auditable from git); flagged A2 for the security gate to verify live.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency is an exact reuse of a PROD-green pinned specifier, verified in-codebase + against npm.
- Architecture: HIGH — all four core patterns are direct clones of Phase 10/11/13 PROD-green EFs/migrations; the only novel pieces (flag derivation, weak-dim post-validation, CC0 item bank) are clearly scoped with defensive guidance.
- Pitfalls: HIGH — drawn from the documented STATE.md/memory landmine ledger that already bit Phases 8/10/11/13.
- Open conflicts (cognitive `tipo` naming, flag-block location, EF-vs-RPC): MEDIUM — these are spec/implementation choices, recommended but needing user/planner confirmation (Assumptions Log + Open Questions).

**Research date:** 2026-06-24
**Valid until:** 2026-07-24 (stable — internal codebase patterns; the only external surface is the pinned SDKs which the project deliberately freezes)
