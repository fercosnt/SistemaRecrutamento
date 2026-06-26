---
phase: 15-decis-o-final-audit-vel-lgpd-art-20
verified: 2026-06-26T00:35:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
deferred: []
human_verification:
  - test: "LGPD Art. 20 candidate round-trip over a REAL rejected candidatura — log in as a candidate whose decisao_final.decisao='rejeitado', open /candidato/explicacao/:id, confirm the non-clinical reason renders (no score/band), explicacao_solicitada_em stamps, click 'Solicitar revisão por pessoa natural', and confirm the N8N webhook reaches the responsible RH (vaga.created_by)."
    expected: "Page shows the respectful templated reason (never a score), the visit stamps explicacao_solicitada_em, the revision CTA sets revisao_solicitada_em idempotently, and the RH gets the 'decisao.revisao_solicitada' notification. Approved/em_espera/no-row candidates see 'Esta página não está disponível'."
    why_human: "Requires a live decided candidatura with decisao='rejeitado' + the live N8N webhook endpoint — the round-trip and the notification delivery cannot be exercised by grep/unit tests."
  - test: "Bias-audit snapshot + CSV export over a REAL decided population — log in as administrador, open /admin/bias-audit, click 'Gerar snapshot' for a period that has decided candidaturas with birthdates, and verify the bands, the 4/5 flag tint, the AGE-only limitation banner, the excluidos_sem_data footnote (when >0), and the CSV download."
    expected: "One bias_audit_log row writes with banded aggregates only (no per-candidate PII), selection_rate + razao_4_5 + flag<0.8 render per band, reference-band micro-label is correct, the honest 'apenas faixa etária' banner is always visible, the excluidos_sem_data footnote appears when birthdates are missing, and the CSV exports dados.bands[]."
    why_human: "Requires a live population of decided candidaturas with data_nascimento so the EEOC 4/5 banding produces real (non-empty) bands — the live snapshot math + CSV blob cannot be exercised without real rows."
---

# Phase 15: Decisão Final Auditável & LGPD Art. 20 — Verification Report

**Phase Goal:** O RH decide com visão consolidada de todos os scorecards e justificativa textual obrigatória, e o candidato rejeitado pode exercer seu direito LGPD Art. 20 — com bias audit mensal como trilha de defesa.
**Verified:** 2026-06-26T00:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria — the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `consolidar-decisao-final` aggregates all scorecards (does NOT re-score) + applies vaga weights → dashboard JSON (consolidated score + per-etapa breakdown + textual recommendation). **[DECISAO-01]** | ✓ VERIFIED | `supabase/functions/consolidar-decisao-final/index.ts` — deterministic (no LLM; static `npm:zod` import), `normalizeWeighted` reads already-recorded `analise_candidato_vaga.score_match` + `scores_candidato` (sjt/redacao/entrevista) and NEVER invokes an eval EF; weights renormalized over PRESENT etapas (`effective_weight = w/Σ present`, lines 312-324); big_five/cognitivo context-only (lines 327-333); `buildRecommendation` templated. Returns `{ consolidated, breakdown, recommendation }`. Wired client→EF via `getConsolidacao` → `useConsolidacao` → `ConsolidacaoDashboard` renders all three. |
| 2 | UI consolidada shows the candidate side-by-side with finalists, reusing the Etapa-2 Comparativo. **[DECISAO-02]** | ✓ VERIFIED | `DecisaoFinalPage.tsx:32-34,187` imports `ComparativoScreen` from `@/features/triagem` VERBATIM and embeds it scoped to `listFinalistas(vagaId)` (decisaoService:165-190, allowlist `candidatura_id, decisao` via `candidaturas!inner(vaga_id)`). Finalist resolution wired (lines 55-115). |
| 3 | Final decision requires justificativa ≥50 chars and persists `decisao_final` with `por_usuario` NOT NULL + `decisao` enum (aprovado/rejeitado/em_espera) — DB constraints guarantee. **[DECISAO-03]** | ✓ VERIFIED | Table DDL `20260607000003_decisao_final.sql:35-54`: `decisao_final_resultado AS ENUM ('aprovado','rejeitado','em_espera')`, `justificativa NOT NULL CHECK (length>=50)`, `por_usuario uuid NOT NULL REFERENCES auth.users`, `candidatura_id UNIQUE`, client INSERT `WITH CHECK(false)`. RPC `registrar_decisao` (phase15 mig:73-149) is sole writer: re-asserts ≥50 (lines 90-93), `por_usuario := auth.uid()` ALWAYS (LGPD-02), terminal map fires `avancar_etapa()`. Client gate: `RegistrarDecisaoForm.tsx:74-75` `canSubmit = decisao!==null && !tooShort` + alert-dialog confirm. SM1 smoke: <50 → check_violation (15-06). |
| 4 | Rejected candidate accesses `/candidato/explicacao/:id`, sees motivo + result, and "Solicitar revisão por pessoa natural" opens an internal ticket + notifies RH. **[DECISAO-04 / LGPD Art. 20]** | ✓ VERIFIED | Route wired `routes.tsx:286` (RoleGuard candidato). `explicacaoService.getExplicacao` reads 5-col own-row allowlist (`DECISAO_EXPLICACAO_ALLOWLIST` — NO score/band/join), reachability gate returns null unless `decisao='rejeitado'`, surfaces deterministic non-clinical `reason` (justificativa NEVER verbatim). `solicitarRevisao` → `solicitar_revisao_decisao` RPC (own-row, idempotent) + fire-and-forget N8N webhook to vaga.created_by; `stampExplicacao` one-shot on visit (`useExplicacao` stampedRef). |
| 5 | `bias_audit_log` records monthly selection-rate snapshot by race/gender/age (EEOC 4/5) with manual CSV export. **[LGPD-03]** | ✓ VERIFIED (AGE-only by honest design) | `gerar_bias_snapshot` RPC (phase15 mig:290-430) admin-only, age derived server-side via `date_part('year', age(data_nascimento))`, bands 18-24…55+, per-band selection_rate + reference (highest) + razao_4_5 + flag<0.8 + small_sample<30; writes ONE row banded-aggregates-only (no per-candidate PII); `limitacao: 'apenas faixa etária — raça/gênero não coletados (LGPD-01)'`. Race/gender intentionally NOT collected (LGPD-01 minimization), surfaced honestly. `BiasAuditPage` renders bands + AGE-only banner + CSV blob export; reads `dados.excluidos_sem_data` (WR-01 fixed). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260625100001_decisao_final_phase15.sql` | 4 SECURITY DEFINER RPCs | ✓ VERIFIED | All 4 RPCs present + correct authz; live in PROD (15-06). |
| `supabase/migrations/20260625100002_decisao_final_rh_vaga_scope.sql` | WR-03 vaga-scoped rh_le_decisao_final | ✓ VERIFIED | DROP+CREATE policy scoped to vagas.created_by (admin bypass); applied to PROD this session, confirmed live. |
| `supabase/functions/consolidar-decisao-final/index.ts` | deterministic consolidation EF | ✓ VERIFIED (395 lines) | authorize-then-aggregate, role from usuarios_rh, per-vaga ownership, allowlist reads, static npm:zod, deployed JWT-on (401 no-auth, 15-06). |
| `src/features/decisao/schemas/consolidacaoSchema.ts` | shared .strict() contract | ✓ VERIFIED | `.strict()`, imported by client; EF re-declares identical shape; contract test GREEN. |
| `src/features/decisao/services/decisaoService.ts` | allowlist reads + EF/RPC invoke | ✓ VERIFIED | All reads allowlisted; no `as never`; WR-04 JSDoc cleaned. |
| `src/features/decisao/components/DecisaoFinalPage.tsx` | dashboard + Comparativo + form | ✓ VERIFIED (214 lines) | All 3 sections wired. |
| `src/features/decisao/components/ConsolidacaoDashboard.tsx` | EF output render | ✓ VERIFIED (165 lines) | renders consolidated/breakdown/recommendation; SugestaoIABadge only on recommendation. |
| `src/features/decisao/components/RegistrarDecisaoForm.tsx` | ≥50 gate + alert-dialog | ✓ VERIFIED (191 lines) | gate + confirm + registrar_decisao. |
| `src/features/explicacao/services/explicacaoService.ts` | own-row allowlist + RPC | ✓ VERIFIED | 5-col allowlist, reachability gate, non-clinical reason, WR-05 'unavailable'. |
| `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx` | LGPD Art. 20 page | ✓ VERIFIED (199 lines) | reason + revision CTA + not-available; never renders score. |
| `src/features/explicacao/components/SolicitarRevisaoCTA.tsx` | revision CTA | ✓ VERIFIED (131 lines) | idempotent disabled-when-requested; outcome-aware. |
| `src/features/admin/bias-audit/biasMath.ts` | EEOC 4/5 parity oracle | ✓ VERIFIED | WR-01/02 aligned to SQL (excluidos_sem_data, n_total=Σ applicants, faixa-ASC tie-break). |
| `src/features/admin/bias-audit/services/biasAuditService.ts` | allowlist read + RPC | ✓ VERIFIED | `BIAS_AUDIT_COLUMNS` allowlist, gerar_bias_snapshot RPC. |
| `src/features/admin/bias-audit/components/BiasAuditPage.tsx` | banner + table + snapshot + CSV | ✓ VERIFIED (228 lines) | reads correct excluidos_sem_data key; CSV blob; AGE-only banner. |
| `src/router/routes.tsx` | 3 routes w/ guards | ✓ VERIFIED | /rh/candidato/:id/decisao (rh+admin), /candidato/explicacao/:id (candidato), /admin/bias-audit (administrador). |
| `database.types.ts` | regenerated w/ 4 RPCs | ✓ VERIFIED | All 4 RPCs + bias_audit_log + decisao_final typed (15-06 regen). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| useConsolidacao | consolidar-decisao-final EF | supabase.functions.invoke | ✓ WIRED | getConsolidacao → invoke('consolidar-decisao-final', body=parsed.strict). |
| DecisaoFinalPage | ComparativoScreen | verbatim import scoped to finalists | ✓ WIRED | imports + embeds with listFinalistas scope. |
| useRegistrarDecisao | registrar_decisao RPC | supabase.rpc | ✓ WIRED | RegistrarDecisaoForm onConfirm → mutation → rpc. |
| explicacaoService | decisao_final (own-row allowlist) | candidato_le_propria_decisao RLS + 5 cols | ✓ WIRED | DECISAO_EXPLICACAO_ALLOWLIST, no star, no scores join. |
| SolicitarRevisaoCTA | solicitar_revisao_decisao RPC | supabase.rpc + N8N webhook | ✓ WIRED | mutate → rpc → fire-and-forget webhook to vaga.created_by. |
| ExplicacaoCandidatoPage | stamp_explicacao_acessada RPC | useQuery mount one-shot | ✓ WIRED | useExplicacao stampedRef one-shot. |
| biasAuditService | gerar_bias_snapshot RPC | supabase.rpc | ✓ WIRED | admin RPC + allowlist read. |
| EF | usuarios_rh + vagas.created_by | role + ownership before reads | ✓ WIRED | index.ts:223-269 authorize-before-aggregate. |
| registrar_decisao | candidaturas.etapa_atual | avancar_etapa() for aprovado/rejeitado | ✓ WIRED | mig:139-143 terminal map; em_espera no change. |
| registrar_decisao | decisao_final.por_usuario | por_usuario := auth.uid() | ✓ WIRED | mig:125,129 (LGPD-02 guardrail). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ConsolidacaoDashboard | data (consolidated/breakdown/recommendation) | useConsolidacao → getConsolidacao → EF (reads analise_candidato_vaga + scores_candidato) | Yes — EF reads real recorded scores | ✓ FLOWING (live data needs human, see below) |
| ExplicacaoCandidatoPage | explicacao.reason/decisao | useExplicacao → getExplicacao → decisao_final own-row allowlist | Yes — reads live decisao_final row (gated to rejeitado) | ✓ FLOWING (live rejected row needs human) |
| BiasAuditPage | snapshot.dados.bands | useBiasAudit → listLatestSnapshot → bias_audit_log; gerar_bias_snapshot writes it | Yes — SQL RPC computes over real cohort | ✓ FLOWING (live population needs human) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full vitest suite | `npm run test:run` | 600/600 tests passed; 2 suites fail to LOAD (Deno EF tests under vitest — known non-regression) | ✓ PASS |
| Phase-15 golden/contract suites | `npm run test:run -- biasMath consolidacaoContract explicacaoService` | 41/41 passed (3 files) | ✓ PASS |
| LGPD-04 forbidden-strings lock | `npm run test:run -- forbidden-strings` | 17/17 passed (no clinical strings in 3 new dirs) | ✓ PASS |
| Build | `npm run build` | exit 0 (only HARD-02 chunk-size warning — known tech-debt) | ✓ PASS |
| tsc baseline | `npm run lint` | 291 errors (flat vs documented 291 baseline; ≤305 cap) | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` declared for this phase; verification is vitest + Deno + live SQL smokes. SQL smokes SM1-SM5 were run live in the [BLOCKING] 15-06 apply task (justificativa<50→check_violation, non-admin bias→insufficient_privilege, non-owner candidate→42501 ×2, ≥50 passes / missing→no_data_found). Not re-runnable read-only without live DB writes — covered by GREEN golden unit tests + line-verified migration.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DECISAO-01 | 15-02/15-03/15-06 | EF aggregates scorecards (no re-score) + vaga weights → dashboard JSON | ✓ SATISFIED | Truth #1 |
| DECISAO-02 | 15-03/15-06 | UI side-by-side w/ finalists reusing Comparativo | ✓ SATISFIED | Truth #2 |
| DECISAO-03 | 15-02/15-03/15-06/15-07 | justificativa ≥50 + por_usuario NOT NULL + enum + DB constraints | ✓ SATISFIED | Truth #3 |
| DECISAO-04 | 15-04/15-06/15-07 | /candidato/explicacao/:id motivo+result + revisão por pessoa natural ticket+notify | ✓ SATISFIED (live round-trip → human) | Truth #4 |
| LGPD-03 | 15-05/15-06/15-07 | bias_audit_log monthly snapshot EEOC 4/5 + CSV | ✓ SATISFIED (AGE-only honest; live snapshot → human) | Truth #5 |

All 5 REQ-IDs the ROADMAP maps to Phase 15 are claimed by plans and satisfied. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | No TBD/FIXME/XXX in any Phase-15 source/migration | — | Clean — no unreferenced debt markers |
| RegistrarDecisaoForm.tsx | 141,143 | `placeholder=` (HTML textarea attr) | ℹ️ Info | Not a stub — legitimate input placeholder text |
| 3 services | header JSDoc | "no `as never` casts remain" | ℹ️ Info | Positive WR-04 evidence, not residue; `AUTHORED-NOT-APPLIED` removed |

No blocker or warning anti-patterns. The 5 code-review WARNINGs (WR-01..05) were all closed in 15-07 and re-verified in code: WR-01 (excluidos_sem_data key) fixed in BiasAuditPage; WR-02 (parity oracle drift) aligned to SQL; WR-03 (RH cross-vaga gap) closed via the vaga-scoped RLS migration applied this session; WR-04 (stale JSDoc) cleaned; WR-05 ('unavailable' outcome) implemented. IN-01..IN-04 (info-tier) remain advisory for Phase 16.

### Human Verification Required

Two live round-trips genuinely cannot be exercised by static/unit verification (see frontmatter `human_verification`):

1. **LGPD Art. 20 candidate round-trip over a real rejected candidatura** — needs a live `decisao='rejeitado'` row + the live N8N webhook to confirm the explanation page render (no score), the visit stamp, the idempotent revision request, and the RH notification delivery.
2. **Bias-audit snapshot + CSV over a real decided population** — needs live decided candidaturas with birthdates so the EEOC 4/5 banding produces real bands; verify flag tint, reference-band label, AGE-only banner, excluidos footnote, and CSV download.

These are the two Manual-Only Verifications declared in 15-VALIDATION.md (deferred to HUMAN-UAT). They are surfaced as human items, NOT gaps — the codebase implements the full path; only the live data + webhook delivery are unobservable without a real population.

### Gaps Summary

**No gaps.** All 5 ROADMAP success criteria are observably implemented and wired in the codebase:
- The consolidation EF is deterministic, authorize-then-aggregate, never re-scores, never auto-decides (RNF-07a), and is live JWT-on.
- The decision write path enforces justificativa ≥50 + `por_usuario` NOT NULL via DB constraints AND the SECURITY DEFINER RPC (LGPD-02 structural guardrail).
- The candidate LGPD Art. 20 surface reads a 5-column own-row allowlist (no score/band/PII leak), gates on rejection, surfaces a non-clinical reason, and wires the revision request + RH notification.
- The bias-audit subsystem writes banded-aggregates-only EEOC 4/5 snapshots (AGE-only by honest LGPD-01 design) with CSV export.
- The WR-03 horizontal-access finding is closed (vaga-scoped RH RLS policy applied to PROD this session).

Known non-regressions confirmed and discounted: the 2 Deno-under-vitest suite-collection failures (`consolidar-decisao-final/__tests__`, `essay-schemas`) are pre-existing harness-mismatch load errors, not behavioral failures (600/600 tests pass). The RH-login auth-hook RLS gap and CC0 cognitive item-bank seed are out-of-scope deferrals routed elsewhere, not Phase-15 regressions.

Status is `human_needed` solely because two live round-trips require a real decided population — every code-level truth is VERIFIED.

---

_Verified: 2026-06-26T00:35:00Z_
_Verifier: Claude (gsd-verifier)_
