# Phase 15: Decisão Final Auditável & LGPD Art. 20 - Research

**Researched:** 2026-06-25
**Domain:** Score consolidation (weighted aggregation, never re-score) · LGPD Art. 20 transparency/human-review UX · EEOC 4/5 adverse-impact (age-band) · Edge Function authorize-then-act · component reuse (Phase-10 Comparativo)
**Confidence:** HIGH (schema + reuse targets verified live in code/migrations; EEOC + LGPD framing cited; only the consolidation jsonb shape is Claude's discretion per CONTEXT)

## Summary

Phase 15 closes the funnel. It adds **one new Edge Function** (`consolidar-decisao-final`), **three new UI surfaces** (RH consolidated decision dashboard, candidate LGPD Art. 20 explanation page, admin bias-audit view), and **zero new tables** — every database object it needs already exists live (`decisao_final` with the LGPD Art. 20 columns, `bias_audit_log`, `scores_candidato`, `vagas.pesos_avaliacao`, the `avancar_etapa()` terminal trigger). The work is **composition over construction**: the Comparativo is reused verbatim from Phase 10, the admin view copies `AiCostsPage`, the EF clones the established authenticate-then-authorize idiom, and the candidate page is a read-mostly variant of the existing glass-over-gradient shell.

The single highest-risk technical decision is the **consolidation aggregation mapping**. `vaga.pesos_avaliacao` uses 4 weight keys (`triagem`, `work_sample_sjt`, `redacao_cultural`, `entrevista`) but the per-etapa scores live in **two different tables with heterogeneous scales**: triagem's score is `analise_candidato_vaga.score_match` (0–100), while sjt/redacao/entrevista scores live in `scores_candidato` (SJT-MC = raw Σ-pesos, SJT-caso-aberto = 0–25, redacao = 0–25, entrevista = null with BARS in `metadata`). `big_five` and `cognitivo` carry **no weight** (context-only). The EF must map weight-key → score-source explicitly, normalize each etapa to a common 0–100 scale before weighting, ponder only completed etapas, and renormalize the weights over the present etapas (missing → N/A, never blocks). This is documented in detail below.

The LGPD posture is defensively strong already: because **every decision has a human actor** (`decisao_final.por_usuario NOT NULL`), the system is arguably *outside* the strict Art. 20 trigger (which targets decisions taken *solely* on automated processing). Offering the explanation + human-review channel anyway is best practice and the correct conservative reading.

**Primary recommendation:** Build `consolidar-decisao-final` as a read-only aggregator that clones the `comparativo-candidatos` authorize-then-act skeleton (two-client, role from `usuarios_rh`, vaga ownership), maps the 4 weight keys to their score sources with explicit per-etapa normalization, renormalizes weights over present etapas, and emits a deterministic templated recommendation. Reuse the Comparativo and `AiCostsPage` verbatim. The candidate page and revision request are pure DB writes to existing `decisao_final` columns + the existing N8N webhook — no new EF required for the candidate side.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Área 1 — Dashboard de decisão consolidada (DECISAO-01/02)**
- Score consolidado = agregado PONDERADO dos scores por etapa usando `vaga.pesos_avaliacao` (Phase 7). A EF `consolidar-decisao-final` AGREGA, NUNCA re-pontua (lê `scores_candidato` já gravados).
- Etapas faltantes (ex.: cognitivo não aplicado / não respondido): mostrar breakdown parcial, ponderar só as etapas concluídas, marcar faltantes como N/A — NUNCA bloquear a decisão.
- Recomendação textual = DETERMINÍSTICA/templated a partir do breakdown (sem nova chamada LLM); é advisory — o RH decide (RNF-07a).
- Comparação lado-a-lado = REUSAR o Comparativo da Etapa 2 (`src/features/triagem` — ComparativoScreen/useComparativo/comparativo-candidatos EF), escopado aos finalistas em `decisao_final`.

**Área 2 — Captura da decisão final (DECISAO-03 / LGPD-02)**
- enum `decisao`: `aprovado` / `rejeitado` / `em_espera` (confirmar nome do enum type live; já criado na Phase 6 com o guardrail).
- Justificativa obrigatória ≥50 caracteres — validada no client E via DB CHECK constraint.
- Decidir FECHA o funil: grava `decisao_final` E dispara a transição terminal via `avancar_etapa` (com justificativa; `por_usuario NOT NULL` já é guardrail estrutural — LGPD-02).
- Uma decisão por candidatura; emenda = nova linha auditável (trilha append-only), NUNCA edição silenciosa.

**Área 3 — Explicação ao candidato LGPD Art. 20 (DECISAO-04)**
- O candidato rejeitado vê uma explicação RESPEITOSA e não-clínica (motivo derivado da justificativa) + resultado de alto nível — NUNCA scores/banda brutos (RNF-07a/LGPD-04).
- "Solicitar revisão por pessoa natural" → seta `decisao_final.revisao_solicitada_em` (COLUNA JÁ EXISTENTE — NÃO criar tabela nova) + notifica o RH responsável (`vaga.created_by`) via webhook N8N existente. `explicacao_solicitada_em` marca quando o candidato acessou a explicação. `revisao_resultado` (text) registra o desfecho da revisão humana.
- Acesso a `/candidato/explicacao/:id`: `RoleGuard role="candidato"` + RLS own-candidatura; só após existir uma `decisao_final` com `decisao='rejeitado'`.
- Detalhe de score exposto: MÍNIMO (resultado + motivo textual); sem gabarito/psicometria.

**Área 4 — Bias audit (LGPD-03)**
- V1 = selection-rate por FAIXA ETÁRIA com a regra 4/5 EEOC (adverse-impact ratio vs a faixa de maior taxa). Idade derivada de `data_nascimento` (único atributo demográfico coletado).
- Raça/gênero: DEFERIDOS / fora de escopo V1 — NÃO são coletados (LGPD-01 minimização). Documentar explicitamente a limitação no artefato + no dashboard de auditoria.
- Snapshot = RPC/EF disparada manualmente (admin) gravando uma linha em `bias_audit_log` (`periodo` + `dados` jsonb) + export CSV admin-only. Cron agendado DEFERIDO.
- Cálculo 4/5: razão de selection-rate por faixa etária contra a faixa de maior taxa (flag quando < 0.8).

### Claude's Discretion
- Nome exato do enum `decisao` + estrutura precisa do `dados` jsonb do bias audit + layout do dashboard consolidado — à discrição, guiado pelos padrões existentes (Phase 6 enum, Phase 10 comparativo, Phase 14 scorecard).

### Deferred Ideas (OUT OF SCOPE)
- Race/gender bias dimensions (would require collecting protected attributes — against LGPD-01 minimization; out of scope unless product decides to collect with consent).
- Scheduled (cron) monthly bias snapshot — V1 is admin-triggered manual.
- AI-generated personalized rejection letter (backlog §3.2).
- WCAG AA hardening of these new screens → Phase 16 (LGPD-05).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DECISAO-01 | EF `consolidar-decisao-final` agrega scorecards (não re-pontua) + pesos da vaga → dashboard JSON (score consolidado + breakdown + recomendação textual) | §Consolidation Aggregation (weight-key→score-source map, normalization, renormalization over present etapas), §Architecture Patterns (Pattern 1 EF skeleton), §Code Examples |
| DECISAO-02 | UI consolidada vê candidato lado-a-lado com finalistas (reusa Comparativo Etapa 2) | §Don't Hand-Roll (reuse ComparativoScreen/useComparativo/exportComparativo verbatim), §Standard Stack (no new comparison view) |
| DECISAO-03 | Decisão final exige justificativa ≥50 chars → `decisao_final` (por_usuario NOT NULL + enum + DB CHECK) | §Standard Stack (decisao_final live schema — CHECK + RLS already exist), §Architecture Patterns (Pattern 2 terminal transition), §Common Pitfalls (P2 append-only, P5 terminal map) |
| DECISAO-04 | `/candidato/explicacao/:id` (LGPD Art. 20) — motivo + resultado alto-nível + "Solicitar revisão por pessoa natural" → notifica RH | §LGPD Art. 20 Compliance, §Architecture Patterns (Pattern 3 candidate page + revision write), §Common Pitfalls (P1 PII leak, P6 reachability gate) |
| LGPD-03 | `bias_audit_log` snapshot selection-rate por faixa etária (regra 4/5 EEOC, export CSV manual V1) | §EEOC 4/5 Adverse-Impact Computation, §Architecture Patterns (Pattern 4 bias snapshot RPC/EF + age banding), §Common Pitfalls (P3 small-N, P4 banding) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Score consolidation (weighted aggregate, never re-score) | API / Backend (Edge Function) | Database (reads `scores_candidato` + `analise_candidato_vaga`) | Aggregation reads privileged scorecard PII; must run service_role after RH authorize — NEVER client-side (would over-expose scores). |
| RH consolidated decision dashboard | Frontend Server (SPA route, role-gated) | API (consumes EF JSON) | Pure presentation of EF output; role gate at route + EF re-authorizes (defense in depth). |
| Final-decision capture (write `decisao_final` + terminal transition) | Database (RLS-blocked client INSERT → EF/RPC service_role) | Frontend (form validation) | `decisao_final` blocks all client INSERT (`WITH CHECK (false)`); only a service_role writer may insert. Terminal `avancar_etapa()` fires in the same logical action. |
| Candidate LGPD Art. 20 explanation read | Browser/Client (own-row allowlist read) | Database (RLS own-candidatura) | Candidate reads ONLY own decision via the existing `candidato_le_propria_decisao` RLS policy + explicit column allowlist — no EF needed for the read. |
| Revision request write (`revisao_solicitada_em`) + RH notify | Database (RPC/EF) | API (N8N webhook fire-and-forget) | Setting `revisao_solicitada_em` + stamping `explicacao_solicitada_em` is an own-row UPDATE; client UPDATE on `decisao_final` is not granted, so route via a small SECURITY DEFINER RPC (own-row guard) or the EF. Notify reuses the existing N8N webhook. |
| Bias-audit snapshot (age-band selection rate, 4/5) | API / Backend (RPC or EF, admin-triggered) | Database (writes `bias_audit_log`, derives age server-side) | Age derivation from `data_nascimento` is PII-adjacent; compute server-side, persist only banded aggregates (no per-candidate rows) in `dados` jsonb. |
| Bias-audit view + CSV export | Frontend Server (admin route) | Database (read `bias_audit_log`) | Admin-only presentation; copies `AiCostsPage` read+export idiom. |

## Standard Stack

> **No new packages.** This phase composes existing vendored primitives + already-installed libraries. Verified present in `package.json`: `jspdf@^4.2.1`, `jspdf-autotable@^5.0.8` (Comparativo PDF reuse), `recharts@^2.15.2` (not needed — UI-SPEC says a `table` suffices for bias-audit V1), `zod`, `@tanstack/react-query`, `react-hook-form`, `sonner`.

### Core (all pre-existing in the codebase — reused, not installed)
| Library / Asset | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `decisao_final` (live table) | Phase 6 schema | Final-decision persistence + LGPD Art. 20 columns | `[VERIFIED: database.types.ts:1242 + migrations/20260607000003]` — already has `decisao`, `justificativa` (CHECK ≥50), `por_usuario NOT NULL`, `explicacao_solicitada_em`, `revisao_solicitada_em`, `revisao_resultado`; RLS done. |
| `bias_audit_log` (live table) | Phase 6 schema | Bias snapshot rows | `[VERIFIED: database.types.ts:434]` — `periodo text`, `dados jsonb`, `snapshot_em`, `criado_em`. Schema-only since Phase 6; LGPD-03 writes the first rows. |
| `scores_candidato` (live table) | Phase 11 generic | Source of per-etapa scores (read-only) | `[VERIFIED: database.types.ts:3235]` — `tipo` enum sjt/big_five/redacao/entrevista/cognitivo/decisao; `score`/`score_max`/`status`/`metadata`. |
| `vagas.pesos_avaliacao` (jsonb) | Phase 7 | Per-etapa weights | `[VERIFIED: migrations/20260607010002]` — keys `triagem`/`work_sample_sjt`/`redacao_cultural`/`entrevista`, sum=100 at publish. |
| `avancar_etapa()` trigger | Phase 6 | Terminal funnel transition + audit | `[VERIFIED: migrations/20260607000005]` — terminal `aprovado`/`rejeitado` allowed from any stage; writes one `historico_candidatura` row same-txn; `auth.uid()` survives SECURITY DEFINER. |
| `ComparativoScreen` + `useComparativo` + `exportComparativo` + `comparativo-candidatos` EF | Phase 10 | Finalist side-by-side (DECISAO-02) | `[VERIFIED: src/features/triagem/components/ComparativoScreen.tsx + hooks/useComparativo.ts + pdf/exportComparativo.ts]` — reused verbatim. |
| `AiCostsPage` admin pattern | Phase 9 | Bias-audit view template | `[VERIFIED: src/features/admin/ai-costs/components/AiCostsPage.tsx]` — RHLayout + GlassCard + Table + month select; copy structure. |
| `SugestaoIABadge` | Phase 10 | Advisory marker on recommendation block | `[VERIFIED: src/features/triagem/components/SugestaoIABadge.tsx]` — placed ONLY on the templated recommendation. |
| `ai-client.ts` two-client EF idiom | Phase 9/10 | Authorize-then-act skeleton | `[VERIFIED: supabase/functions/avaliar-transcricao-entrevista/index.ts + comparativo-candidatos/index.ts]` — but the consolidation EF makes **no LLM call** (deterministic), so it imports the `createClient` + auth idiom only, NOT `callAi`. |

### Supporting (vendored shadcn primitives — already in `src/components/ui/`)
| Primitive | Purpose | When to Use |
|---------|---------|-------------|
| `radio-group` | `decisao` 3-option selector | RegistrarDecisaoForm |
| `textarea` | Mandatory justificativa | RegistrarDecisaoForm (client ≥50 + counter) |
| `alert-dialog` | Decision confirm + revision-request confirm | Terminal action gate (irreversible at funnel level) |
| `table` | Per-etapa breakdown + bias-audit age-band rows | ConsolidacaoDashboard, BiasAuditPage |
| `tooltip` | N/A-etapa explanation + 4/5-rule explanation | Breakdown + bias rows |
| `Glass`/`GlassCard`/`GlassPanel`/`GlassButton` | Brand surfaces | All three views |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `consolidar-decisao-final` EF | A SECURITY DEFINER RPC | The consolidation reads two tables, normalizes heterogeneous scales, and templates a recommendation — feasible in PL/pgSQL but the established project idiom for "RH-authorized privileged read returning JSON" is an EF (`comparativo-candidatos`). EF gives testable TS + the proven authorize-then-act skeleton. **Recommend EF.** |
| New EF for the candidate revision write | A small SECURITY DEFINER RPC (`solicitar_revisao_decisao`) | The revision write is an own-row UPDATE on `decisao_final` (client UPDATE not granted). An RPC is lighter than an EF and the project already favors SECURITY DEFINER RPCs for own-row privileged writes (`reprocessar_analise`, `submit_candidatura_atomic`). **Recommend RPC for the revision write + the explicacao stamp; reuse the N8N webhook from the RPC via `pg_net` OR fire it from a thin client mutation after the RPC succeeds.** (Planner's discretion — both shapes documented in §Open Questions Q3.) |
| Bias snapshot as EF | SECURITY DEFINER RPC writing `bias_audit_log` | No external/LLM call needed — pure SQL aggregation over `candidaturas`/`decisao_final`/`candidatos.data_nascimento`. An RPC is the natural fit (admin-triggered, returns the snapshot). **Recommend RPC.** |

**Installation:** None. (No `npm install`. All assets pre-exist.)

**Version verification:** Not applicable — zero new packages. Existing deps confirmed in `package.json` via grep (jspdf 4.2.1, jspdf-autotable 5.0.8, recharts 2.15.2). `[VERIFIED: package.json]`

## Package Legitimacy Audit

> This phase installs **no external packages**. All UI is built from primitives already vendored in `src/components/ui/` since M1/Phase 7, plus the reused Phase-10 Comparativo (which already depends on the installed `jspdf`/`jspdf-autotable`). No registry interaction occurs.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| — (none) | — | — | — | — | n/a — slopcheck not installed; nothing to check | No-op |

**Packages removed due to slopcheck [SLOP] verdict:** none (no packages installed).
**Packages flagged as suspicious [SUS]:** none.

*slopcheck was not available at research time, but this phase introduces zero new dependencies, so the gate is vacuously satisfied. If the planner discovers a genuinely new dependency need (none anticipated), it must gate that install behind a `checkpoint:human-verify` task.*

## Architecture Patterns

### System Architecture Diagram

```
                          ┌─────────────────────────────────────────────────┐
                          │  RH (desktop, role-gated /rh/candidato/:id/decisao)│
                          └───────────────────┬─────────────────────────────┘
                                              │ invoke (JWT)
                                              ▼
            ┌───────────────────────────────────────────────────────────────┐
            │  EF consolidar-decisao-final  (JWT-on, two-client D-23)         │
            │  1. auth.getUser() via anon+Authorization                       │
            │  2. AUTHORIZE: role from usuarios_rh + vaga.created_by ownership │
            │  3. READ-ONLY aggregate (service_role):                         │
            │     • analise_candidato_vaga.score_match  → weight 'triagem'     │
            │     • scores_candidato tipo='sjt'         → weight 'work_sample_sjt'
            │     • scores_candidato tipo='redacao'     → weight 'redacao_cultural'
            │     • scores_candidato tipo='entrevista'  → weight 'entrevista'  │
            │     • big_five / cognitivo  → CONTEXT-ONLY (no weight)           │
            │  4. normalize each etapa → 0..100; renormalize weights over      │
            │     PRESENT etapas; missing → N/A (never blocks)                 │
            │  5. deterministic templated recommendation (NO LLM)             │
            └───────────────────────────┬───────────────────────────────────┘
                                        │ JSON { consolidated, breakdown[], recommendation }
                                        ▼
            ┌───────────────────────────────────────────────────────────────┐
            │ ConsolidacaoDashboard  +  ComparativoScreen (REUSED, finalists) │
            │ + RegistrarDecisaoForm (radio decisao + justificativa ≥50)      │
            └───────────────────────────┬───────────────────────────────────┘
                       confirm (alert-dialog) │ write decisao_final + terminal transition
                                              ▼
            ┌───────────────────────────────────────────────────────────────┐
            │ RPC/EF (service_role): INSERT decisao_final (por_usuario=auth.uid)│
            │ + UPDATE candidaturas.etapa_atual = 'aprovado'|'rejeitado'      │
            │   (only for aprovado/rejeitado) → fires avancar_etapa() audit    │
            │   ('em_espera' = decision row only, NO etapa change)            │
            └───────────────────────────────────────────────────────────────┘

   ── Candidate side (after a decisao='rejeitado' exists) ───────────────────
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ /candidato/explicacao/:id  (RoleGuard candidato + RLS own-candidatura)    │
   │  • own-row ALLOWLIST read of decisao_final (decisao, justificativa-derived │
   │    reason, revisao_solicitada_em, revisao_resultado) — NEVER scores/band  │
   │  • on visit: stamp explicacao_solicitada_em (RPC own-row UPDATE)          │
   │  • "Solicitar revisão" → RPC sets revisao_solicitada_em                   │
   │                        → N8N webhook notifies vaga.created_by (existing)  │
   └─────────────────────────────────────────────────────────────────────────┘

   ── Admin side (LGPD-03) ──────────────────────────────────────────────────
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ /admin/bias-audit  (RoleGuard administrador, copies AiCostsPage)         │
   │  • "Gerar snapshot" → RPC (service_role): age = derive(data_nascimento), │
   │    band → selection_rate per band → 4/5 ratio vs highest-rate band →     │
   │    INSERT bias_audit_log(periodo, dados jsonb) — banded aggregates ONLY   │
   │  • read latest snapshot → table (faixa / taxa / razão 4/5) + CSV export  │
   └─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/features/decisao/                  # NEW feature dir (CLAUDE.md feature convention)
├── components/
│   ├── DecisaoFinalPage.tsx           # RH top-level (RHLayout + Glass; /rh/candidato/:id/decisao)
│   ├── ConsolidacaoDashboard.tsx      # consolidated score + breakdown + recommendation
│   └── RegistrarDecisaoForm.tsx       # radio decisao + justificativa ≥50 + alert-dialog
├── hooks/
│   ├── useConsolidacao.ts             # query → consolidar-decisao-final EF
│   └── useRegistrarDecisao.ts         # mutation → decisao_final write + terminal transition
├── services/
│   └── decisaoService.ts              # allowlist reads + EF/RPC invokes + error class
└── schemas/
    └── decisaoSchema.ts               # zod: decisao enum + justificativa min(50)

src/features/explicacao/               # NEW (candidate LGPD Art. 20)
├── components/
│   ├── ExplicacaoCandidatoPage.tsx    # candidate glass-over-gradient shell + reason
│   └── SolicitarRevisaoCTA.tsx        # alert-dialog → revision RPC + N8N notify
├── hooks/useExplicacao.ts
└── services/explicacaoService.ts      # own-row ALLOWLIST read (NEVER select('*'), NEVER scores)

src/features/admin/bias-audit/         # NEW (mirrors admin/ai-costs structure)
├── components/BiasAuditPage.tsx       # copies AiCostsPage: RHLayout + GlassCard + table + CSV
├── hooks/useBiasAudit.ts
└── services/biasAuditService.ts       # read bias_audit_log + invoke snapshot RPC + CSV blob

supabase/functions/consolidar-decisao-final/
└── index.ts                           # clone comparativo-candidatos auth skeleton; NO callAi

supabase/migrations/
└── 2026MMDD000001_decisao_final_phase15.sql   # RPCs: registrar_decisao, solicitar_revisao,
                                                #       stamp_explicacao, gerar_bias_snapshot
```

### Pattern 1: Authorize-then-act read-only Edge Function (consolidation)
**What:** Clone the `comparativo-candidatos` / `avaliar-transcricao-entrevista` skeleton: two-client (anon+Authorization for `auth.getUser()`; service_role for privileged reads), authorize role from `usuarios_rh` (NOT JWT claims), check `vagas.created_by === user.id` ownership (administrador bypasses). The consolidation EF **makes no LLM call** — it reads, normalizes, weights, templates.
**When to use:** Any RH-invoked privileged read that returns JSON (DECISAO-01).
**Example:**
```typescript
// Source: supabase/functions/avaliar-transcricao-entrevista/index.ts:126-189 (verified live)
// 1. authenticate
const { data: userRes } = await supabaseUser.auth.getUser();
if (!userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;
// 1b. AUTHORIZE — role from usuarios_rh, NOT from JWT claims (silent-403 landmine)
const { data: rhRow } = await supabaseAdmin.from("usuarios_rh")
  .select("role").eq("user_id", user.id).eq("ativo", true).is("deleted_at", null).maybeSingle();
const role = rhRow?.role === "recrutador" ? "rh" : rhRow?.role; // "administrador" | "rh" | null
if (role !== "rh" && role !== "administrador") return errorResponse("FORBIDDEN", "Acesso negado.", 403);
// 4. ownership: rh must own the candidatura's vaga; administrador bypasses
const { data: candRow } = await supabaseAdmin.from("candidaturas")
  .select("id, vaga_id, candidato_id").eq("id", body.candidatura_id).maybeSingle();
if (!candRow) return errorResponse("FORBIDDEN", "Acesso negado.", 403);
if (role === "rh") {
  const { data: vagaRow } = await supabaseAdmin.from("vagas")
    .select("created_by").eq("id", candRow.vaga_id).maybeSingle();
  if (!vagaRow || vagaRow.created_by !== user.id) return errorResponse("FORBIDDEN", "Acesso negado.", 403);
}
```

### Pattern 2: Terminal transition on decision write
**What:** Writing `decisao_final` and advancing the funnel are one logical action. For `aprovado`/`rejeitado`, UPDATE `candidaturas.etapa_atual` to the terminal enum value — this fires `avancar_etapa()` which writes the audit row in the same transaction. For `em_espera`, write the decision row but DO NOT change `etapa_atual` (it stays at `decisao_final`). `decisao_final` client INSERT is blocked (`WITH CHECK (false)`), so this must run as a SECURITY DEFINER RPC that captures `por_usuario := auth.uid()`.
**When to use:** DECISAO-03 capture.
**Example:**
```sql
-- decisao enum 'aprovado'|'rejeitado'|'em_espera' → etapa_processo terminal map
-- aprovado  → candidaturas.etapa_atual = 'aprovado'
-- rejeitado → candidaturas.etapa_atual = 'rejeitado'
-- em_espera → NO etapa change (decision row only)
-- avancar_etapa() (migration 20260607000005) allows terminal from any stage and
-- records ator = auth.uid() (GUC-based, survives SECURITY DEFINER). [VERIFIED]
```

### Pattern 3: Candidate own-row allowlist read (LGPD Art. 20 page)
**What:** The candidate reads ONLY their own `decisao_final` via the existing `candidato_le_propria_decisao` RLS policy (scopes via `candidatos.user_id = auth.uid()`). The client read names an explicit column allowlist — `decisao`, `justificativa` (to DERIVE the reason; never shown raw if it contains internal notes — see Open Q5), `revisao_solicitada_em`, `revisao_resultado`, `explicacao_solicitada_em`. It NEVER reads `scores_candidato` (the candidate has no RLS policy there → denied at DB anyway).
**When to use:** DECISAO-04 candidate page.
**Anti-pattern:** `select('*')` on `decisao_final` — RLS is row-level only, does not hide columns; over-projecting risks leaking anything later added. `[CITED: MEMORY reference_select_star_leaks_pii]`

### Pattern 4: Bias snapshot RPC (age-band 4/5)
**What:** Admin-triggered SECURITY DEFINER RPC: compute each candidate's age from `candidatos.data_nascimento` server-side, bucket into age bands, compute per-band selection rate (selected / applicants where "selected" = `decisao='aprovado'` — see Open Q4 for the population definition), compute the 4/5 ratio of each band vs. the highest-rate band, INSERT one `bias_audit_log` row with `periodo` + `dados` jsonb. `dados` carries ONLY banded aggregates (counts + rates + ratios) — never per-candidate rows.
**When to use:** LGPD-03.

### Anti-Patterns to Avoid
- **Re-scoring during consolidation:** the EF reads already-recorded scores; it never re-invokes an evaluation EF or recomputes a scorecard. (CONTEXT lock + DECISAO-01.)
- **Auto-deciding from the consolidated number:** the consolidated score is an aggregate, NOT a verdict; the recommendation is advisory; `por_usuario NOT NULL` is the structural guardrail. (RNF-07a / LGPD-02.)
- **Showing the candidate any score/band/percentile/ratio:** the explanation page is a transparency surface, not a data dump. (RNF-07a / LGPD-04.)
- **Blocking the decision when an etapa is missing:** missing etapas → N/A, renormalize weights, never gate. (CONTEXT lock.)
- **Editing an existing `decisao_final` row silently:** an amendment is a NEW auditable row (append-only). Note: the live table has `UNIQUE(candidatura_id)` — see Pitfall 2 / Open Q2: the planner must decide how "append-only" reconciles with the unique constraint.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finalist side-by-side comparison | A new comparison view/table/PDF | `ComparativoScreen` + `useComparativo` + `exportComparativo` + `comparativo-candidatos` EF (Phase 10, verbatim) | CONTEXT decision DECISAO-02; the screen, hook, error mapping, and PDF export already exist and are tested. Scope it to `decisao_final` finalists. |
| Admin page shell + CSV export | A new admin layout + download logic | Copy `AiCostsPage` (RHLayout + GlassCard + Table) + its month-select/blob-download idiom | UI-SPEC mandates verbatim structural copy; the admin pattern + role gate (`RoleGuard role="administrador"`) is proven. |
| EF authenticate→authorize wiring | New auth code | Clone `comparativo-candidatos`/`avaliar-transcricao-entrevista` skeleton | authenticate≠authorize is a documented Phase-10 landmine (C1 critical); role from `usuarios_rh`, not JWT. `[CITED: MEMORY reference_ef_authenticate_vs_authorize]` |
| Terminal funnel transition + audit | A manual `historico_candidatura` INSERT | UPDATE `candidaturas.etapa_atual` → `avancar_etapa()` trigger writes the audit row same-txn | Manual INSERT would double-write (the Phase-8 survivor double-write bug). Let the trigger own the audit row. `[CITED: MEMORY Phase 8 survivor double-write]` |
| `por_usuario NOT NULL` / `justificativa ≥50` enforcement | Client-only validation | The live DB constraints already enforce both (CHECK + NOT NULL) | Defense in depth; client validation is UX, DB is truth. `[VERIFIED: migrations/20260607000003]` |
| PDF generation | New PDF lib | Reuse `jspdf`+`jspdf-autotable` via `exportComparativo` | Already installed + wired; no new dependency. |

**Key insight:** Phase 15 is ~80% composition. The genuinely new logic is narrow: (1) the consolidation weight-key→score-source normalization, (2) the deterministic recommendation template, (3) the age-band 4/5 computation. Everything else is reuse + small RPCs against existing tables.

## Consolidation Aggregation (DECISAO-01 — the load-bearing detail)

**The mapping problem (verified, non-obvious):** the 4 weight keys and the score sources do NOT line up 1:1, and the scales differ.

| Weight key (`pesos_avaliacao`) | Score source | Raw scale | Normalize to 0–100 |
|--------------------------------|--------------|-----------|--------------------|
| `triagem` | `analise_candidato_vaga.score_match` | 0–100 (int) `[VERIFIED: migrations/20260610000001:35]` | already 0–100 |
| `work_sample_sjt` | `scores_candidato` `tipo='sjt'` | MC subtipo = raw Σ-pesos (per-vaga max varies); caso_aberto subtipo `score`/`score_max=25` `[VERIFIED: avaliar-redacao/index.ts]` | `score / score_max * 100` (use `score_max` when present; for MC compute against the per-vaga max from `metadata`) |
| `redacao_cultural` | `scores_candidato` `tipo='redacao'` | 0–25 (`redacoes_candidato`/score) | `score / 25 * 100` |
| `entrevista` | `scores_candidato` `tipo='entrevista'` | `score` is NULL; BARS per-competency live in `metadata` with `status='pendente_humano'` `[VERIFIED: avaliar-transcricao-entrevista/index.ts:279]` | derive a 0–100 from the metadata BARS (avg of competency 1–5 → ×20), OR treat as N/A if no human-confirmed score — **planner decision, Open Q1** |
| (no key) `big_five` | `scores_candidato` `tipo='big_five'` | dimensions in `metadata` (no single score) | CONTEXT-ONLY — show in breakdown as context, **never weighted** `[VERIFIED: pesosAvaliacaoSchema.ts:6]` |
| (no key) `cognitivo` | `scores_candidato` `tipo='cognitivo'` | banded/contextual | CONTEXT-ONLY — never weighted (CONTEXT + RF-27 cognitivo never decides alone) |

**Aggregation algorithm (recommended):**
1. Read `vaga.pesos_avaliacao` (4 weights, sum 100).
2. For each weighted key, fetch its score from the correct source; normalize to 0–100.
3. Mark a key **PRESENT** if a usable score exists (status `sucesso`, or a human-confirmed value); else **N/A**.
4. Renormalize: `effective_weight[k] = weight[k] / Σ(weight[present])`. (If no etapa is present, consolidated = N/A; the decision is still allowed.)
5. `consolidated = Σ(normalized_score[k] × effective_weight[k])` over present keys.
6. `big_five` + `cognitivo` go into the breakdown as **context rows** (no weight, no contribution).
7. Recommendation = deterministic template keyed on `consolidated` band + N/A count + any `pendente_humano`/red-flag present (e.g., "Forte aderência nas etapas avaliadas; revisão humana pendente em entrevista"). Carries `SugestaoIABadge` + the "decisão é sempre humana" note.

**Critical:** `entrevista` scores are `status='pendente_humano'` until a human confirms (RNF-07a). The consolidation must decide whether to weight a pendente score or mark it N/A until confirmed (Open Q1). Defaulting to "weight only `status='sucesso'` rows; pendente/falhou → N/A" is the safest, most defensible choice and matches the never-auto-decide invariant.

## EEOC 4/5 Adverse-Impact Computation (LGPD-03)

**Formula** `[CITED: eeoc.gov Uniform Guidelines Q&A; 29 CFR §1607.4]`:
```
selection_rate(band)      = selected(band) / applicants(band)
adverse_impact_ratio(band) = selection_rate(band) / selection_rate(reference_band)
reference_band             = the band with the HIGHEST selection rate
FLAG when adverse_impact_ratio < 0.80   (the "four-fifths" / 80% rule)
```
Worked example `[CITED: eeoc.gov]`: white hire rate 50%, Hispanic 35% → 0.35/0.50 = 0.70 < 0.80 → adverse impact indicated.

**Age banding (recommended bands):** derive age from `candidatos.data_nascimento` at snapshot time (`age = date_part('year', age(data_nascimento))`). Recommended bands aligned to common labor-market age cohorts: `18–24`, `25–34`, `35–44`, `45–54`, `55+`. The exact bands are Claude's discretion (CONTEXT) but should be documented in the `dados` jsonb so the snapshot is self-describing.

**Population definitions (Open Q4 — planner must lock):**
- `applicants(band)` = candidates in the band who reached a decision point (recommend: have a `decisao_final` row, i.e., a final decision was made). Using "all applicants" inflates denominators with knockout/early-stage drops and muddies the selection-rate semantics.
- `selected(band)` = candidates in the band with `decisao='aprovado'`.
- Alternative valid framing: selection at the *funnel-advance* level rather than final-approve. Recommend final-approve for V1 clarity; document the choice in `dados`.

**`dados` jsonb shape (recommended, Claude's discretion):**
```json
{
  "metodo": "eeoc_4_5_age_band_v1",
  "limitacao": "apenas faixa etária — raça/gênero não coletados (LGPD-01)",
  "populacao": { "definicao_applicants": "tem decisao_final", "definicao_selected": "decisao='aprovado'" },
  "faixa_referencia": "25-34",
  "bands": [
    { "faixa": "18-24", "applicants": 12, "selected": 5, "selection_rate": 0.4167, "razao_4_5": 0.78, "flag": true },
    { "faixa": "25-34", "applicants": 30, "selected": 16, "selection_rate": 0.5333, "razao_4_5": 1.0, "flag": false }
  ],
  "n_total": 70,
  "small_sample_warning": false
}
```

**Small-N caveat (Pitfall 3):** the 4/5 rule is statistically unreliable below ~30 selections per group; surface a `small_sample_warning` when any band's applicants < a threshold (e.g., < 30) so the admin reads the ratio with appropriate skepticism. `[CITED: eeoc.gov — "practical means … not a legal definition"]`

## LGPD Art. 20 Compliance (DECISAO-04)

**The legal frame** `[CITED: lgpd-brasil.info/capitulo_03/artigo_20; blog.idp.edu.br]`:
- Art. 20 grants the data subject the right to request **review of decisions made *solely* on automated processing** that affect their interests (including profiling). It pairs with a right to **clear explanation of the criteria and procedures** used (subject to commercial/industrial secrecy).
- The law does **not** prescribe *who* must perform the review or *how* — and notably does not, on its face, require a *natural person* (a 2019 veto removed the explicit human-reviewer requirement; review by another automated system is legally debated).

**Why this system is in a strong position:** every decision here has a human actor (`decisao_final.por_usuario NOT NULL`); the AI output is always advisory (RNF-07a). A decision that is **not solely automated** arguably falls outside the strict Art. 20 trigger. Offering the explanation + a **human-natural-person** review channel anyway is the conservative, defensible posture and exceeds the statutory floor.

**Implementation requirements (all satisfiable with existing columns):**
- Explanation must be **respectful, non-clinical, high-level** — derived from the RH `justificativa`, NEVER raw scores/bands/percentiles (RNF-07a/LGPD-04). The UI-SPEC copy contract already encodes this.
- "Solicitar revisão por pessoa natural" → set `revisao_solicitada_em` (existing column) + notify `vaga.created_by` via the existing N8N webhook. `revisao_resultado` records the human review outcome.
- Stamp `explicacao_solicitada_em` when the candidate accesses the page (evidence of transparency provision).
- Reachable only after a `decisao='rejeitado'` row exists; `RoleGuard role="candidato"` + RLS own-candidatura.

**Open Q5 (justificativa exposure):** the RH `justificativa` is an *internal* audit field (it may contain candid, non-candidate-facing language). The candidate page should show a **derived, respectful reason**, not the raw justificativa verbatim. The planner must decide the derivation: (a) show the raw justificativa (risk: internal tone leaks), (b) a templated non-clinical reason keyed on `decisao` + breakdown (no LLM), or (c) a separate candidate-facing reason field. Recommend (b) — deterministic templated reason — to avoid leaking internal phrasing and to stay non-clinical. This is the safest reading of "motivo derivado da justificativa."

## Runtime State Inventory

> Phase 15 is **net-new feature work**, not a rename/refactor/migration. This section is included because the phase writes to pre-existing tables and triggers — verifying no stale runtime state interferes.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `decisao_final` is currently empty (feature lands now); `bias_audit_log` empty (schema-only since Phase 6). No legacy rows to migrate. `[VERIFIED: migrations comments + REQUIREMENTS traceability]` | None — first writers land in this phase. |
| Live service config | N8N webhook URL is read from `N8N_NOVA_CANDIDATURA_URL` env with a hardcoded fallback `https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura`. The revision-request notification should use its OWN webhook path/env (e.g., `N8N_REVISAO_DECISAO_URL`) so it doesn't collide with the candidatura-created event. `[VERIFIED: submit-candidatura/index.ts:303]` | Planner: define a distinct webhook env/path for the revision notification; do not reuse the `nova-candidatura` payload shape. |
| OS-registered state | None — no OS-level registrations involved. | None — verified by scope (web app + Supabase only). |
| Secrets/env vars | EF needs `SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY` (already set for every EF). No new AI keys (consolidation makes no LLM call). A new N8N webhook URL env may be added (above). | Set the new N8N env var at deploy if a distinct webhook is used. |
| Build artifacts / installed packages | `database.types.ts` must be regenerated after the new RPCs land (`npm run db:types`) so the client picks up new RPC signatures. No package reinstall. `[VERIFIED: project convention]` | Regenerate types after migration apply (orchestrator-owned, post-[BLOCKING] apply). |

**The canonical question:** after all files land, what runtime systems still need attention? Answer: (1) PROD migration apply for the new RPCs (via Supabase MCP `apply_migration` per project precedent — bypasses 42601), (2) `consolidar-decisao-final` EF deploy (JWT-on), (3) `database.types.ts` regen, (4) the new N8N webhook env if a distinct path is chosen. All are standard Phase-6..14 [BLOCKING]/checkpoint patterns.

## Common Pitfalls

### Pitfall 1: Leaking PII/scores on the candidate explanation page
**What goes wrong:** a `select('*')` on `decisao_final` or a join into `scores_candidato` exposes raw scores/bands/internal justificativa to the candidate.
**Why it happens:** RLS is row-level only — it does not hide columns; over-projecting "just works" until it leaks. `[CITED: MEMORY reference_select_star_leaks_pii — caught by Phase 8 security gate]`
**How to avoid:** explicit own-row column allowlist on `decisao_final`; NEVER read `scores_candidato` from the candidate page; show a derived reason, not raw justificativa (Open Q5).
**Warning signs:** any `*` in the candidate-facing select string; any score/percentile/band value reaching the candidate component.

### Pitfall 2: Append-only vs. the `UNIQUE(candidatura_id)` constraint
**What goes wrong:** CONTEXT says "uma decisão por candidatura; emenda = nova linha auditável (append-only)" but `decisao_final` has `candidatura_id uuid NOT NULL UNIQUE` `[VERIFIED: migrations/20260607000003:39]`. A second INSERT for the same candidatura violates the unique constraint — "append-only new row" is impossible as-is.
**Why it happens:** the Phase-6 schema modeled one-decision-per-candidatura; the Phase-15 CONTEXT wants amendment history.
**How to avoid:** the planner must reconcile this. Options: (a) treat amendments as UPSERT on `decisao_final` + capture amendment history in `historico_candidatura` (the existing audit trail), accepting one current decision row + a full audit trail; (b) drop the UNIQUE constraint and add an `is_current`/`em` ordering so multiple rows coexist (schema change). Recommend (a) — the audit trail already captures every transition; the UNIQUE row is the *current* decision, history lives in `historico_candidatura`. Flag as **Open Q2** for an explicit decision.
**Warning signs:** a 23505 unique-violation on the second decision write.

### Pitfall 3: 4/5 ratio on tiny samples
**What goes wrong:** with a handful of candidates per age band, one hire flips the ratio wildly; a spurious "adverse impact" flag fires (or a real one is masked).
**Why it happens:** the 4/5 rule is a practical screen, statistically unreliable below ~30/group. `[CITED: eeoc.gov]`
**How to avoid:** surface a `small_sample_warning` per band and in the UI; present the ratio as directional, never as proof.
**Warning signs:** bands with applicants < 30; ratios swinging between snapshots.

### Pitfall 4: Age banding off-by-one / null birthdates
**What goes wrong:** `age()` computed wrong (using birth year subtraction vs. full date), or candidates with null `data_nascimento` silently dropped, skewing denominators.
**Why it happens:** `candidatos.data_nascimento` is `string` (date); a naive `year - birth_year` is wrong near birthdays. Note there are two `data_nascimento` columns in types (candidatos NOT NULL at :725; a view/other at :4002 nullable) — read from `candidatos`.
**How to avoid:** use `date_part('year', age(data_nascimento))` server-side; explicitly count and report candidates excluded for null/invalid birthdate in `dados`.
**Warning signs:** band totals don't sum to the cohort size; "sem data" candidates unaccounted.

### Pitfall 5: Wrong terminal-transition mapping for `em_espera`
**What goes wrong:** mapping `em_espera` to a terminal `etapa_atual` value closes the funnel for a candidate who should stay open; or mapping `rejeitado` to a non-terminal value fails to close it.
**Why it happens:** `decisao_final_resultado` (aprovado/rejeitado/em_espera) ≠ `etapa_processo` (which has terminal `aprovado`/`rejeitado` but NO `em_espera`). `[VERIFIED: database.types.ts:4560 vs :4574]`
**How to avoid:** map only `aprovado`→`etapa_atual='aprovado'` and `rejeitado`→`etapa_atual='rejeitado'`; `em_espera` writes the decision row but leaves `etapa_atual='decisao_final'` (no transition).
**Warning signs:** an `em_espera` candidate shows as terminal; a `rejeitado` candidate still shows `decisao_final`.

### Pitfall 6: Candidate page reachable before a rejection exists
**What goes wrong:** the explanation page renders (or 500s) for candidates with no decision or a non-rejected decision.
**Why it happens:** the route guard checks role but not decision state.
**How to avoid:** gate rendering on the existence of a `decisao='rejeitado'` row (RLS already scopes to own-candidatura); show the "Esta página não está disponível" state otherwise (UI-SPEC copy).
**Warning signs:** the page loads for an `aprovado`/`em_espera` candidate.

### Pitfall 7: EF authenticate≠authorize (consolidation)
**What goes wrong:** the EF verifies the JWT but doesn't check role + ownership → any authenticated user reads any candidate's consolidated scores (IDOR/PII). `[CITED: MEMORY reference_ef_authenticate_vs_authorize — Phase 10 C1 critical]`
**How to avoid:** clone the verified skeleton in Pattern 1: role from `usuarios_rh`, `vagas.created_by` ownership for `rh`, administrator bypass.
**Warning signs:** the EF returns data after only `auth.getUser()` with no `usuarios_rh`/ownership check.

### Pitfall 8: EF `.join("npm:")` dynamic import / helper-wiring
**What goes wrong:** N/A for THIS EF (no LLM call), but worth stating: if any AI import is added, use STATIC `npm:` imports, never `["npm:",pkg].join("")`. `[CITED: MEMORY reference_ef_npm_join_import_bug]`
**How to avoid:** the consolidation EF imports only `createClient` from esm.sh — no AI SDK, no zod helpers, no dynamic import. Keeps the deploy surface minimal.

## Code Examples

### Read scores_candidato with an allowlist (RH-side aggregation source)
```typescript
// Source: src/features/avaliacao/services/scoresRhService.ts (verified live — NEVER select('*'))
const { data } = await supabaseAdmin
  .from('scores_candidato')
  .select('id, candidatura_id, tipo, subtipo, score, score_max, status, metadata')
  .eq('candidatura_id', candidaturaId);
// then map tipo → weight key; normalize score/score_max → 0..100; weight only status='sucesso'
```

### Read score_match (triagem weight) from analise_candidato_vaga
```typescript
// Source: migrations/20260610000001_analise_tables.sql (verified — score_match int 0..100)
const { data: analise } = await supabaseAdmin
  .from('analise_candidato_vaga')
  .select('candidatura_id, score_match, status')
  .eq('candidatura_id', candidaturaId).maybeSingle();
// score_match maps to pesos_avaliacao.triagem; already 0..100; N/A if status != 'sucesso' or null
```

### Reuse the Comparativo, scoped to finalists
```typescript
// Source: src/features/triagem/hooks/useComparativo.ts (verified — mutation over the EF)
const comparativo = useComparativo();
// finalists = candidaturas in this vaga that have a decisao_final row
comparativo.mutate({ vagaId, candidaturaIds: finalistCandidaturaIds });
```

### N8N fire-and-forget notify (revision request)
```typescript
// Source: supabase/functions/submit-candidatura/index.ts:303-323 (verified idiom)
const url = Deno.env.get('N8N_REVISAO_DECISAO_URL'); // distinct from nova-candidatura
fetch(url!, { method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ event:'decisao.revisao_solicitada', timestamp:new Date().toISOString(),
    data:{ candidatura_id, vaga_id, rh_responsavel: vagaCreatedBy } }) })
  .catch((e) => console.warn('[revisao] N8N webhook failed (non-blocking):', e?.message));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One-table-per-score-type | Generic `scores_candidato` with `tipo` enum | Phase 11 | Consolidation reads ONE table for sjt/redacao/entrevista/big_five/cognitivo; triagem is the exception (lives in `analise_candidato_vaga.score_match`). |
| Build new comparison UI per phase | Reuse `ComparativoScreen` | Phase 10 | DECISAO-02 is a reuse, not a build. |
| Cron-scheduled bias snapshot | Admin-triggered manual snapshot | Phase 15 V1 (cron deferred) | Simpler V1; LGPD-03 says CSV export manual in V1. |

**Deprecated/outdated:**
- PRD §8.3 RLS idioms are stale — use the verified live idioms (`user_id` FK column, roles `rh`/`administrador`/`candidato`, `auth.jwt() #>> '{app_metadata,role}'`). `[VERIFIED: migrations/20260607000003 header]`
- Race/gender bias dimensions in the original LGPD-03 wording ("raça/gênero/idade") — V1 is AGE-ONLY because race/gender are not collected (LGPD-01 minimization). Surface this honestly.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `entrevista` scores should be N/A in the weighted aggregate until human-confirmed (`status='sucesso'`) | Consolidation Aggregation | If the team wants pendente scores to provisionally weight, the consolidated number shifts; mitigated by treating pendente as N/A (conservative, defensible). Needs confirmation → Open Q1. |
| A2 | "Selected" for the 4/5 rule = `decisao='aprovado'`; "applicants" = has a `decisao_final` row | EEOC 4/5 | A different population definition (e.g., all candidaturas) changes every ratio. Needs confirmation → Open Q4. |
| A3 | Amendment history reconciles with `UNIQUE(candidatura_id)` via UPSERT + `historico_candidatura` trail (option a) | Pitfall 2 | If the team wants multiple coexisting decision rows, a schema change (drop UNIQUE) is needed. Needs confirmation → Open Q2. |
| A4 | The candidate sees a deterministic templated reason, NOT the raw RH justificativa | LGPD Art. 20 | Showing raw justificativa risks leaking internal tone; templated reason is safer. Needs confirmation → Open Q5. |
| A5 | The revision notification uses a NEW distinct N8N webhook path/env, not the `nova-candidatura` one | Runtime State Inventory | Reusing the candidatura webhook would mis-route the event; low risk, easy to set. |
| A6 | Recommended age bands 18–24/25–34/35–44/45–54/55+ | EEOC 4/5 | Band boundaries affect which bands flag; Claude's discretion per CONTEXT, self-described in `dados`. |

## Open Questions (RESOLVED)

> All 6 questions resolved per the recommendations below — adopted by the Phase-15 plans:
> Q1 RESOLVED: weight ONLY status='sucesso'; entrevista pendente_humano → N/A (Plan 02 EF).
> Q2 RESOLVED: option (a) — UPSERT current row via ON CONFLICT(candidatura_id), history in historico_candidatura (Plan 02 registrar_decisao).
> Q3 RESOLVED: two SECURITY DEFINER own-row RPCs; N8N notify via thin-client fire-and-forget (Plan 04 §b), NOT pg_net.
> Q4 RESOLVED: selected:=decisao='aprovado', applicants:=has a decisao_final row (Plan 02 gerar_bias_snapshot).
> Q5 RESOLVED: deterministic templated non-clinical reason, never raw justificativa (Plan 04 getExplicacao).
> Q6 RESOLVED: age bands 18-24/25-34/35-44/45-54/55+, self-described in dados (Plan 02/05).

1. **Should `pendente_humano` entrevista scores weight the consolidated aggregate, or be N/A until human-confirmed?**
   - What we know: entrevista `scores_candidato` rows are `status='pendente_humano'` with BARS in `metadata` and `score=null` until a human confirms (RNF-07a).
   - What's unclear: whether to derive a provisional 0–100 from metadata BARS and weight it, or mark N/A.
   - Recommendation: weight ONLY `status='sucesso'` rows; pendente/falhou → N/A + renormalize. Most defensible; never advances an unreviewed AI score into a decision number.

2. **How does "append-only amendment" reconcile with `decisao_final UNIQUE(candidatura_id)`?**
   - What we know: the live table has `UNIQUE(candidatura_id)`; CONTEXT wants amendments as new auditable rows.
   - What's unclear: keep UNIQUE (UPSERT + history in `historico_candidatura`) vs. drop it (true append-only rows + `is_current`).
   - Recommendation: option (a) — UPSERT the current row, rely on the existing audit trail for history; avoids a schema change and matches "trilha de auditoria."

3. **Revision write + explicacao stamp: SECURITY DEFINER RPC, or extend an EF?**
   - What we know: `decisao_final` client UPDATE is not granted; own-row writes must go through service_role.
   - What's unclear: RPC (lighter, project-favored for own-row writes) vs. EF.
   - Recommendation: two small SECURITY DEFINER RPCs (`stamp_explicacao_acessada`, `solicitar_revisao_decisao`) with own-row guards (candidato owns the candidatura); fire the N8N webhook either from the RPC via `pg_net` (precedent: `notify_cost_anomaly`) or from a thin client mutation after the RPC succeeds.

4. **4/5 population: final-approve vs. funnel-advance; applicant denominator = `decisao_final` rows vs. all candidaturas?**
   - Recommendation: V1 = selected:=`decisao='aprovado'`, applicants:=has a `decisao_final` row; document in `dados`. Revisit if the team prefers an advance-rate framing.

5. **Candidate-facing reason: raw justificativa vs. derived templated reason?**
   - Recommendation: deterministic templated, non-clinical reason — never the raw internal justificativa.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (PROD) | EF deploy + migration apply | ✓ | project `isljnozzlvckrgjjbjwp` ACTIVE | — |
| Supabase MCP `apply_migration` | PL/pgSQL migration apply (bypasses 42601) | ✓ | per Phase 6–14 precedent | D-22 SQL-Editor workaround |
| `supabase functions deploy` (CLI) | `consolidar-decisao-final` deploy (JWT-on) | ✓ | per Phase 10/14 precedent | — |
| N8N webhook endpoint | Revision-request notification | ✓ (existing instance) | `fernandocosta.app.n8n.cloud` | distinct path/env to be created |
| `jspdf`/`jspdf-autotable`/`recharts` | Comparativo reuse / (recharts optional) | ✓ | 4.2.1 / 5.0.8 / 2.15.2 `[VERIFIED: package.json]` | recharts not needed (table suffices) |
| Vitest + Playwright | Validation | ✓ | config in `vite.config.ts` + `playwright.config.ts` | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** N8N revision webhook path needs creating (trivial; env-driven). `apply_migration` if pooler 42601 → D-22 SQL-Editor workaround.

## Validation Architecture

> `workflow.nyquist_validation: true` `[VERIFIED: .planning/config.json]` — section required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit/component, config inline in `vite.config.ts`) + Playwright (E2E, `playwright.config.ts`) + Deno test (Edge Functions) |
| Config file | `vite.config.ts` (no standalone vitest.config); `playwright.config.ts` |
| Quick run command | `npm run test:run -- <pattern>` (Vitest single run, scoped) |
| Full suite command | `npm run test:run` (Vitest) + `npm run test:e2e` (Playwright) + `deno test` per EF |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DECISAO-01 | Consolidation maps 4 weight keys → correct score sources; normalizes scales; renormalizes over present etapas; missing → N/A; never re-scores | unit (Deno, EF handler with injected mocks) | `deno test supabase/functions/consolidar-decisao-final/` | ❌ Wave 0 |
| DECISAO-01 | EF authorize: non-RH → 403; rh non-owner → 403; admin bypass | unit (Deno) | `deno test supabase/functions/consolidar-decisao-final/` | ❌ Wave 0 |
| DECISAO-01 | Deterministic recommendation template (no LLM) given a breakdown | unit (Vitest or Deno) | `npm run test:run -- decisao` | ❌ Wave 0 |
| DECISAO-02 | Comparativo embeds + scopes to `decisao_final` finalists | component (Vitest, reuse `ComparativoScreen.test.tsx` pattern) | `npm run test:run -- ComparativoScreen` | ✅ (reuse) / ❌ scoping test Wave 0 |
| DECISAO-03 | Justificativa <50 blocks submit (client) | component (Vitest) | `npm run test:run -- RegistrarDecisaoForm` | ❌ Wave 0 |
| DECISAO-03 | DB rejects justificativa <50 (CHECK) + `por_usuario NOT NULL` | SQL smoke (live) | manual runbook smoke | ✅ constraint live `[VERIFIED]` |
| DECISAO-03 | `aprovado`/`rejeitado` fires terminal transition + 1 audit row; `em_espera` no transition | SQL smoke (live) | manual runbook smoke | ❌ Wave 0 runbook |
| DECISAO-04 | Candidate read uses allowlist, NEVER scores/`*` | unit (Vitest, assert select string) | `npm run test:run -- explicacao` | ❌ Wave 0 |
| DECISAO-04 | Page not reachable without `decisao='rejeitado'` | component/E2E | `npm run test:e2e -- explicacao` | ❌ Wave 0 |
| DECISAO-04 | Revision request sets `revisao_solicitada_em` + fires webhook | unit (mock fetch) + SQL smoke | `npm run test:run -- explicacao` | ❌ Wave 0 |
| LGPD-03 | 4/5 ratio math (selection rate, reference band, <0.8 flag) | unit (Vitest, pure fn) | `npm run test:run -- biasAudit` | ❌ Wave 0 |
| LGPD-03 | Age banding from `data_nascimento`; null-birthdate accounted | unit (Vitest/SQL) | `npm run test:run -- biasAudit` | ❌ Wave 0 |
| LGPD-03 | Snapshot writes `bias_audit_log` banded aggregates only (no per-candidate PII) | SQL smoke (live) | manual runbook smoke | ❌ Wave 0 runbook |
| LGPD-04 | No forbidden product language ("teste psicológico"/"QI"/raw band) on candidate surface | grep guard | `forbidden-strings.grep` (existing harness) | ✅ extend paths |

### Sampling Rate
- **Per task commit:** `npm run test:run -- <scoped pattern>` (Vitest) or `deno test supabase/functions/consolidar-decisao-final/` (EF).
- **Per wave merge:** `npm run test:run` (full Vitest) + `npm run lint` (tsc baseline; current ~291, zero-growth invariant).
- **Phase gate:** full Vitest + Playwright + per-EF Deno green; live SQL smokes (constraint, terminal transition, bias snapshot) PASS; `forbidden-strings.grep` GREEN; before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` — covers DECISAO-01 (mapping, normalization, authorize, no re-score) with injected mocks (no network).
- [ ] `src/features/decisao/components/__tests__/RegistrarDecisaoForm.test.tsx` — covers DECISAO-03 client validation.
- [ ] `src/features/decisao/services/__tests__/decisaoService.test.ts` — covers terminal-transition mapping + allowlist reads.
- [ ] `src/features/explicacao/services/__tests__/explicacaoService.test.ts` — covers DECISAO-04 allowlist (assert no `*`, no scores).
- [ ] `src/features/admin/bias-audit/__tests__/biasAudit.test.ts` — covers LGPD-03 4/5 math + age banding (pure fns).
- [ ] `e2e/explicacao-flow.spec.ts` — covers reachability gate + revision request.
- [ ] Extend `forbidden-strings.grep` path list to include the 3 new feature dirs.
- [ ] SQL smoke runbook: justificativa CHECK, terminal transition (aprovado/rejeitado/em_espera), bias snapshot no-PII.

## Security Domain

> `security_enforcement` not set to false → enabled. Section required.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Two-client EF (D-23); authorize-then-act; service_role never client-side (CLAUDE.md). |
| V2 Authentication | yes | `auth.getUser()` via anon+Authorization in the EF; `RoleGuard` at routes. |
| V4 Access Control | yes (core) | EF authorize: role from `usuarios_rh` + `vaga.created_by` ownership (IDOR mitigation, Phase-10 C1 lesson); RLS own-candidatura for the candidate read; `RoleGuard role="administrador"` on bias-audit; `decisao_final` client INSERT blocked (`WITH CHECK (false)`). |
| V5 Input Validation | yes | `.strict()` Zod bodies on the EF/RPC inputs; justificativa ≥50 (client + DB CHECK); decisao enum validated. |
| V6 Cryptography | no | No new crypto. |
| V7 Error/Logging | yes | Redacted logs (ids/counts only, never names/scores/justificativa — Pitfall 7 / Phase 4 B2 precedent). |
| V8 Data Protection (PII) | yes (core) | Allowlist reads everywhere; candidate NEVER reads `scores_candidato`; bias snapshot persists banded aggregates only (no per-candidate rows); `data_nascimento` derived server-side. |

### Known Threat Patterns for {Supabase + Edge Functions + React SPA}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — RH reads another RH's candidate consolidation | Elevation/Info Disclosure | EF ownership check (`vaga.created_by`); admin bypass explicit. `[CITED: reference_ef_authenticate_vs_authorize]` |
| PII/score leak to candidate | Info Disclosure | own-row allowlist; no scores join; derived reason not raw justificativa. `[CITED: reference_select_star_leaks_pii]` |
| Bias-audit re-identification (small bands) | Info Disclosure | banded aggregates only; small_sample_warning; no per-candidate rows in `dados`. |
| Tampered decision (no human actor) | Repudiation/Tampering | `por_usuario NOT NULL` (structural); client INSERT blocked; audit row via `avancar_etapa()`. |
| Authenticated-but-unauthorized EF call | Elevation | role from `usuarios_rh` (NOT JWT claims — silent-403 landmine). |
| Prompt injection | Tampering | N/A — consolidation makes NO LLM call (deterministic). Strictly lower attack surface than the AI EFs. |
| Forbidden product language on candidate surface | Compliance (LGPD-04) | `forbidden-strings.grep` extended to new dirs; copy contract from UI-SPEC. |

## Sources

### Primary (HIGH confidence)
- Live codebase (verified this session): `database.types.ts` (decisao_final :1242, bias_audit_log :434, scores_candidato :3235, enums :4560/:4574/:4641); migrations `20260607000003_decisao_final.sql`, `20260607000005_avancar_etapa_trigger.sql`, `20260607010002_vagas_config_columns.sql`, `20260610000001_analise_tables.sql`; EFs `comparativo-candidatos/index.ts`, `avaliar-transcricao-entrevista/index.ts`, `gerar-devolutiva-bigfive/index.ts`, `submit-candidatura/index.ts`; `src/features/triagem/{components/ComparativoScreen.tsx,hooks/useComparativo.ts,pdf/exportComparativo.ts,components/SugestaoIABadge.tsx}`; `src/features/admin/ai-costs/{components/AiCostsPage.tsx,services/aiCostsService.ts}`; `src/features/avaliacao/services/scoresRhService.ts`; `src/features/config-vaga/schemas/pesosAvaliacaoSchema.ts`; `package.json`; `.planning/config.json`.
- 15-CONTEXT.md + 15-UI-SPEC.md (locked decisions + approved UI contract).
- Project MEMORY references (reference_ef_authenticate_vs_authorize, reference_select_star_leaks_pii, reference_ef_npm_join_import_bug, Phase 8 survivor double-write).

### Secondary (MEDIUM confidence)
- EEOC Uniform Guidelines Q&A + 29 CFR §1607.4 — four-fifths rule formula + example.
- LGPD Art. 20 (lgpd-brasil.info, blog.idp.edu.br, migalhas.com.br) — review/explanation rights, "solely automated" trigger, removed human-reviewer requirement.

### Tertiary (LOW confidence)
- General adverse-impact practitioner sources (prevuehr, berkshireassociates) — corroborate the 0.80 threshold and small-N caveat; not load-bearing.

Sources:
- [EEOC Uniform Guidelines Q&A](https://www.eeoc.gov/laws/guidance/questions-and-answers-clarify-and-provide-common-interpretation-uniform-guidelines)
- [29 CFR § 1607.4 — Information on impact](https://www.law.cornell.edu/cfr/text/29/1607.4)
- [Four-Fifths Rule — adverse impact computation](https://www.prevuehr.com/resources/insights/adverse-impact-analysis-four-fifths-rule/)
- [LGPD Art. 20 — texto e interpretação](https://lgpd-brasil.info/capitulo_03/artigo_20)
- [Artigo 20 LGPD — revisão de decisões automatizadas (IDP)](https://blog.idp.edu.br/direito-digital/artigo-20-lgpd-revisao-decisoes-automatizadas/)
- [Direito à explicação sobre decisões automatizadas (Migalhas)](https://www.migalhas.com.br/depeso/432132/direito-a-explicacao-sobre-decisoes-automatizadas)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every table/EF/component reuse target verified live in code + migrations; zero new packages.
- Architecture (consolidation mapping + terminal transition + RPC/EF shapes): HIGH — verified against live schema and the established EF/RPC idioms; the heterogeneous score-scale mapping is the only non-obvious part and is documented explicitly.
- EEOC 4/5: MEDIUM-HIGH — formula cited from EEOC/CFR; population definition + bands are Claude's-discretion (flagged as Open Q).
- LGPD Art. 20: MEDIUM-HIGH — legal framing cited; the "solely automated" nuance and human-review-not-strictly-required point are well-sourced; the system's human-actor guardrail makes compliance comfortable.
- Pitfalls: HIGH — drawn from verified schema constraints (UNIQUE, enum mismatch, CHECK) + documented prior-phase incidents.

**Research date:** 2026-06-25
**Valid until:** 2026-07-25 (stable — internal schema + reuse targets; EEOC/LGPD framing is durable). Re-verify if the schema of `decisao_final`/`scores_candidato`/`pesos_avaliacao` changes before planning.
