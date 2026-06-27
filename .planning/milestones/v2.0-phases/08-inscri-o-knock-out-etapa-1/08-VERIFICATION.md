---
phase: 08-inscri-o-knock-out-etapa-1
verified: 2026-06-08T01:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "The candidate dashboard correctly filters, badges, and counts candidaturas by status"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Deploy `supabase functions deploy submit-candidatura`, then submit a candidatura with a knockout answer via the live form."
    expected: "Post-submit, the form renders the D-15 inline neutral message ('Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.') rather than the success confirmation. No navigation to /perfil."
    why_human: "EF redeploy requires an authenticated shell session. The DB-side knockout is live, but the client inline branch relies on status being forwarded in the EF response, which requires the new function to be deployed."
  - test: "Submit a knockout answer and observe the inline rejection result."
    expected: "Calm/muted GlassCard (not red alarm); Display 28px/600 heading; Body 16px/400 text; warm closer visible. No criterion text (the specific knockout question or answer) appears anywhere on screen."
    why_human: "Color palette, typography sizing, and visual tone cannot be verified by grep or tsc."
  - test: "Run E2E live knockout flow: `E2E_REAL_LOGIN=1 E2E_ALLOW_DB_WRITE=1 KNOCKOUT_VAGA_SLUG=<slug> npm run test:e2e -- e2e/inscricao-knockout.spec.ts` against a seeded knockout vaga."
    expected: "Chromium: 3/3 pass (inline message + /perfil feedback_rejeicao + no-leak). Mobile/tablet: equivalent."
    why_human: "Live env flags required; needs a seeded vaga with a knockout-tagged pergunta."
  - test: "Navigate to candidate dashboard as a knocked-out candidate (after EF deploy)."
    expected: "Status badge correctly shows 'Rejeitado'; feedback_rejeicao message renders below it; 6 stat counters (total/aguardando/em_analise/aprovadas/rejeitadas/finalizadas) show valid counts."
    why_human: "Cannot verify visual layout rendering programmatically; depends on EF deploy completing first."
---

# Phase 8: Inscrição & Knock-out (Etapa 1) — Verification Report

**Phase Goal:** O candidato se inscreve num form LGPD-clean com qualificação por cargo e knockouts objetivos, com auto-rejeição imediata e auditável — sem que nenhum trait/score participe da decisão.
**Verified:** 2026-06-08 (re-verification after gap fix)
**Status:** human_needed
**Re-verification:** Yes — after gap closure (CR-01 DashboardCandidatoPage field fix)

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Form de inscrição coleta apenas os campos permitidos (nome, email, telefone, CEP, LinkedIn, data nascimento, disponibilidade, pretensão, inglês, "como conheceu", Instagram); schema Zod rejeita campos proibidos (sem CPF/foto/estado civil/saúde), validando client + server | ✓ VERIFIED | `schemas.ts` has `.strict()` at L144 and L232 (2 schemas). `candidatoSchema.ts` comment at L20/22 confirms cpf/genero removed. `DadosPessoaisStep.tsx` has 0 occurrences of `field: 'cpf'` or `id="cpf"`. `validateCPF` retained as dead code but not invoked. Tests 418/418 pass. |
| SC-2 | Bloco de qualificação por template aparece na Etapa 1 (máx 10 perguntas, ≤1 aberta); persistido em `vaga.qualificacao_etapa1` | ✓ VERIFIED | `cargoTemplates.ts` has 11 `qualificacao` occurrences — factory + all 8 templates + deep-copy. `qualificacaoSchema.ts` exists. `publishGate.ts` enforces MAX=10/1 (L80-81). Migration adds `vagas.qualificacao_etapa1 jsonb NOT NULL DEFAULT '[]'` and `publish_vaga` builds + writes the snapshot. `database.types.ts` has `qualificacao_etapa1: Json` (grep=9). |
| SC-3 | Ao marcar opção `tag='knockout'`, a candidatura grava `status='rejeitado'`, `etapa='inscricao'`, `motivo='knockout_automatico'` + `opcao_knockout_id`; candidato vê mensagem padrão; linha `auto_rejeitado=true` entra em `historico_candidatura` | ✓ VERIFIED | Migration `submit_candidatura_atomic`: knockout branch at L186-207 sets all 4 fields + D-15 neutral `feedback_rejeicao`. Explicit INSERT into `historico_candidatura` with `auto_rejeitado=true, ator=NULL`. SMOKE-1 PASS (confirmed live). FormularioCandidaturaPage branches on `status==='rejeitado'` (L345/501) and renders exact D-15 message (grep=1). MeuPerfilCandidatoPage renders `feedback_rejeicao` (grep=5). `supabase db push --linked` = "Remote database is up to date". |
| SC-4 | Knockouts padrão funcionam: presencial SP = Não (todos os cargos) e harmonização orofacial = Não (apenas dentista) | ✓ VERIFIED | `cargoTemplates.ts`: `PRESENCIAL_SP_TEXTO` fixed string at L75-78; `baseQualificacao()` seeds presencial-SP for all 8 cargos; `dentistaQualificacao()` appends harmonização for dentista ONLY. `cargoTemplates.test.ts` INSCR-03/D-14 asserts 8 cargos × presencial + 1 dentista × harmonização — 47/47 pass in config-vaga suite. |

**Score:** 4/4 truths verified.

SC-3 qualifier (unchanged from initial report): the `historico_candidatura` row is stamped `auto_rejeitado=true` by the `avancar_etapa()` trigger because `auth.uid()` is NULL under service_role. This is Phase-6 documented "system write" semantics (trigger comment L26). The knockout row is factually correct (exactly one row, `auto_rejeitado=true`, ator NULL). ROADMAP SC-3 requires `auto_rejeitado=true` on the knockout row — that row IS correct. SC-3 is VERIFIED.

### Re-verification: Gap Closed

**Gap CR-01 from initial verification:** `DashboardCandidatoPage.tsx` used `status_candidatura` (non-existent field) at L18/22/249 and referenced non-existent `counts.aplicadas/em_teste/em_entrevista` at L147/155/159.

**Fix confirmed:**

| Check | Before | After | Verified |
|-------|--------|-------|---------|
| L18 filter type | `CandidaturasFilters['status_candidatura']` | `CandidaturasFilters['status']` | ✓ grep=0 for `status_candidatura` |
| L22 filter object | `{ status_candidatura: statusFilter }` | `{ status: statusFilter }` | ✓ grep confirms `{ status: statusFilter }` |
| L245 badge render | `getStatusInfo(candidatura.status_candidatura)` | `getStatusInfo(candidatura.status)` | ✓ grep confirms `candidatura.status` at L245 |
| L284 feedback gate | `candidatura.status === 'rejeitado'` | unchanged | ✓ correct pre-existing |
| Stat counters | `counts.aplicadas/em_teste/em_entrevista` | `counts.aguardando/em_analise/aprovadas/rejeitadas/finalizadas` in 6-card grid | ✓ no `counts.aplicadas` in file |
| tsc errors in file | 7 errors (TS2339×3, TS2322×2, TS2551) | 1 error (pre-existing GlassProps onClick TS2322) | ✓ old 7 errors gone |

The remaining single tsc error in `DashboardCandidatoPage.tsx` (L255, TS2322: `onClick` not in `GlassProps`) is the pre-existing shared Glass component prop-typing issue present in at least 6 other files (`ConfiguracoesPage.tsx` ×2, `DashboardRHPage.tsx` ×2, `VagaLPPage.tsx`, `MetricCard.tsx`). It pre-dates Phase 8, was in the 301-error baseline, and is explicitly out of scope.

Overall tsc error count: 293 (down from 301 baseline — net improvement of 8 errors, zero new errors from Phase 8).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/_shared/schemas.ts` | `.strict()` on both EF schemas; cpf/genero removed from required fields | ✓ VERIFIED | `.strict()` at L144 + L232 (2 occurrences). cpf removed from schema shape (comment L126 confirms). |
| `src/features/cadastro/schemas/candidatoSchema.ts` | DadosPessoais without required cpf/genero | ✓ VERIFIED | Comment L20-22: "cpf and genero are no longer collected at cadastro Etapa 1." No `cpf:` or required `genero:` in schema definition. |
| `src/features/cadastro/components/steps/DadosPessoaisStep.tsx` | CPF input removed, email-only dedup | ✓ VERIFIED | 0 occurrences of `field: 'cpf'` or `id="cpf"`. |
| `src/features/config-vaga/templates/cargoTemplates.ts` | qualificacao field + default knockouts seeded | ✓ VERIFIED | 11 `qualificacao` occurrences. Presencial-SP seed confirmed. |
| `src/features/config-vaga/schemas/qualificacaoSchema.ts` | QualificacaoPergunta type + Zod schema | ✓ VERIFIED | File exists. |
| `src/features/config-vaga/publishGate.ts` | ≤10 perguntas / ≤1 aberta gate (D-09) | ✓ VERIFIED | L80-81: `MAX_QUALIFICACAO_PERGUNTAS = 10`, `MAX_QUALIFICACAO_ABERTAS = 1`. Both conditions at L125-138. |
| `supabase/migrations/20260608000001_inscricao_knockout.sql` | new columns + knockout sweep + publish_vaga snapshot/gate | ✓ VERIFIED | 20 occurrences of `knockout_automatico/auto_rejeitado/qualificacao_etapa1/to_jsonb(m.opcao_texto)`. All DDL, sweep, and publish extensions present. Applied live. |
| `database.types.ts` | motivo_rejeicao, opcao_knockout_id, qualificacao_etapa1 | ✓ VERIFIED | grep count = 9 (≥3). |
| `src/components/pages/FormularioCandidaturaPage.tsx` | post-submit branch rejeitado → inline D-15 neutral result | ✓ VERIFIED | `submitResult` state at L135; branch at L345/501; D-15 message at L517 (grep=1); `opcao_knockout_id` absent (grep=0). |
| `src/components/pages/MeuPerfilCandidatoPage.tsx` | feedback_rejeicao below rejeitado badge | ✓ VERIFIED | grep=5. |
| `src/components/pages/DashboardCandidatoPage.tsx` | feedback_rejeicao below rejeitado status + correct status badge + working filter + correct stat counters | ✓ VERIFIED | `candidatura.status` at L245; `{ status: statusFilter }` at L22; `CandidaturasFilters['status']` at L18; feedback gate at L284; 6-card grid with `counts.aguardando/em_analise/aprovadas/rejeitadas/finalizadas` at L147-163. Old 7 tsc errors gone; 1 pre-existing GlassProps error remains (out of scope). |
| `supabase/functions/submit-candidatura/index.ts` | status/etapa_atual passthrough | ✓ VERIFIED (code) | L335-336: `status: rpcResult.status, etapa_atual: rpcResult.etapa_atual`. **NOTE: EF not yet redeployed to PROD (documented human action required).** |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `submit_candidatura_atomic` | `pergunta_opcao_metadata` | `@> to_jsonb(m.opcao_texto)` + `tag = 'knockout'` | ✓ WIRED | Migration L180-183: JOIN + WHERE predicates both present. |
| `submit_candidatura_atomic` knockout branch | `historico_candidatura` | explicit INSERT `auto_rejeitado=true, ator=NULL` | ✓ WIRED | Migration L200-204. SMOKE-3 PASS (single row). |
| `FormularioCandidaturaPage` | `submit_candidatura_atomic` RPC return | branch on `result.status` | ✓ WIRED | L345: `if (result.status === 'rejeitado')`. |
| `MeuPerfilCandidatoPage` | `candidaturas.feedback_rejeicao` | conditional render below Badge | ✓ WIRED | grep=5 in page. |
| `DashboardCandidatoPage` | `candidaturas.status` | `getStatusInfo(candidatura.status)` | ✓ WIRED | L245: `getStatusInfo(candidatura.status)`. Fixed (was `status_candidatura`). |
| `DashboardCandidatoPage` | `CandidaturasFilters` | `{ status: statusFilter }` | ✓ WIRED | L22: `{ status: statusFilter }`. Fixed (was `{ status_candidatura: statusFilter }`). |
| `supabase/functions/submit-candidatura/index.ts` | live PROD | `supabase functions deploy` | ✗ NOT_DEPLOYED | Status passthrough present in code (L335-336) but EF not yet redeployed. Until deployed, inline knockout branch is inoperative; DB-side rejection IS live. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `FormularioCandidaturaPage.tsx` | `submitResult` state | `result.status` from EF response | Yes (DB-written by RPC) | ✓ FLOWING — EF deploy pending (knockout path falls through to survivor branch until deploy) |
| `MeuPerfilCandidatoPage.tsx` | `feedback_rejeicao` | `candidaturas` wildcard select | Yes (written by RPC) | ✓ FLOWING |
| `DashboardCandidatoPage.tsx` | `statusInfo` (badge) | `getStatusInfo(candidatura.status)` | Yes — correct field | ✓ FLOWING (fixed from HOLLOW_PROP in initial verification) |
| `DashboardCandidatoPage.tsx` | `feedback_rejeicao` | `candidatura.feedback_rejeicao` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Migration applied to PROD | `supabase db push --linked` | "Remote database is up to date" | ✓ PASS |
| Database types regenerated | `grep -c "opcao_knockout_id"` database.types.ts | 9 | ✓ PASS |
| .strict() on both EF schemas | `grep -c "\.strict()" schemas.ts` | 2 | ✓ PASS |
| CPF removed from DadosPessoaisStep | `grep -c "field.*cpf" DadosPessoaisStep.tsx` | 0 | ✓ PASS |
| D-15 message in FormularioCandidaturaPage | `grep -c "Após análise" FormularioCandidaturaPage.tsx` | 1 | ✓ PASS |
| Criterion never rendered | `grep -c "opcao_knockout_id" FormularioCandidaturaPage.tsx` | 0 | ✓ PASS |
| status_candidatura removed from Dashboard | `grep -c "status_candidatura" DashboardCandidatoPage.tsx` | 0 | ✓ PASS |
| Dashboard filter uses correct key | `grep "{ status: statusFilter }" DashboardCandidatoPage.tsx` | match at L22 | ✓ PASS |
| Dashboard badge uses correct field | `grep "candidatura.status" DashboardCandidatoPage.tsx` | match at L245, L284 | ✓ PASS |
| Dashboard stat counters use real keys | `grep "counts\." DashboardCandidatoPage.tsx` | aguardando/em_analise/aprovadas/rejeitadas/finalizadas/total — all real keys | ✓ PASS |
| Full vitest suite | `npm run test:run` | 418/418 | ✓ PASS |
| Build | `npm run build` | exit 0 | ✓ PASS |
| tsc baseline | `npm run lint 2>&1 \| grep "error TS" \| wc -l` | 293 (improved from 301 baseline; 0 new errors) | ✓ PASS |

### Probe Execution

No `probe-*.sh` files declared for this phase. SQL smokes were run live against PROD in Plan 08-04 Task 2 and documented as SMOKE-1..4 PASS in the SUMMARY.

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| SMOKE-1 knockout-fires | Live PROD via `supabase db query` | status=rejeitado, etapa=inscricao, motivo=knockout_automatico, opcao_knockout_id set | PASS |
| SMOKE-2 survivor-passes | Live PROD via `supabase db query` | etapa=triagem, status=aguardando_resposta | PASS |
| SMOKE-3 single-history-row | Live PROD via `supabase db query` | hist_rows=1 knockout; hist_rows=1 survivor post-fix | PASS |
| SMOKE-4 publish snapshot/gate | Live PROD via `supabase db query` | publish→ativa, qualificacao_etapa1 written, D-09 fires P0001 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INSCR-01 | 08-02, 08-01 | Form LGPD-clean: name/email/phone/CEP/LinkedIn/DOB/availability/salary/english/how-known/Instagram; no CPF/foto/estado civil/saúde; Zod client+server | ✓ SATISFIED | .strict() on both schemas; cpf/genero removed from collection. DadosPessoaisStep verified. |
| INSCR-02 | 08-03, 08-04 | Qualification block Etapa 1 (max 10 perguntas, ≤1 aberta); persisted in `vaga.qualificacao_etapa1` | ✓ SATISFIED | publishGate D-09 enforced client + server. Migration adds column + snapshot write. |
| INSCR-03 | 08-03 | Configurable knockouts per vaga; default presencial SP (all cargos) + harmonização (dentista) | ✓ SATISFIED | cargoTemplates seeds both. Tests confirm dentista-only for harmonização. |
| INSCR-04 | 08-04, 08-05 | Auto-rejection on tag='knockout': status=rejeitado + opcao_knockout_id + historico row + candidate message | ✓ SATISFIED (with caveat) | Migration sweep verified live (SMOKE-1..3 PASS). UI branch wired. EF passthrough in code but not yet deployed. |
| LGPD-01 | 08-02 | PII minimization: no foto/CPF/estado civil/saúde; DOB collected with age-bias monitoring; Zod rejects forbidden fields | ✓ SATISFIED | .strict() fail-closed. CPF/genero removed. validateCPF retained as dead code (D-02 reversibility). |

All 5 required requirement IDs from PLAN frontmatter are accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/features/cadastro/components/steps/DadosPessoaisStep.tsx` | 60-68 | `existingCandidate?.nome_completo` — @deprecated field, always null/undefined | ⚠️ Warning | Error message renders "Email já cadastrado por undefined" |
| `src/features/cadastro/schemas/candidatoSchema.ts` | 332-343 | Date past-date comparison uses UTC midnight vs current instant | ⚠️ Warning | Today's date rejected as past for remainder of day |
| `supabase/functions/submit-candidatura/index.ts` | (committed) | EF passthrough committed but not yet deployed to PROD | ⚠️ Warning | Inline knockout branch (FormularioCandidaturaPage) non-functional until deploy; DB-side rejection is live |

The two previous 🛑 Blocker entries in `DashboardCandidatoPage.tsx` (wrong field `status_candidatura` and non-existent count fields) have been resolved. The remaining single TS2322 error in that file (L255: `onClick` not in `GlassProps`) is the pre-existing shared Glass component prop-typing issue present identically in 6 other files and in the 301-error baseline — it was not introduced by Phase 8. No new blockers.

### Human Verification Required

#### 1. EF Deployment — Inline Knockout Branch

**Test:** Deploy `supabase functions deploy submit-candidatura`, then submit a candidatura with a knockout answer via the live form.
**Expected:** Post-submit, the form renders the D-15 inline neutral message ("Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.") rather than the success confirmation. No navigation to /perfil.
**Why human:** EF redeploy requires an authenticated shell session. The DB-side knockout is live (rejection and feedback_rejeicao persistence work), but the client branch relies on `status` being forwarded in the EF response, which requires the new `submit-candidatura` function to be deployed.

#### 2. Neutral Rejection Visual Tone (UI-SPEC compliance)

**Test:** Submit a knockout answer, observe the inline rejection result.
**Expected:** Calm/muted GlassCard (not red alarm); Display 28px/600 heading; Body 16px/400 text; warm closer visible. No criterion text (the specific knockout question or answer) appears anywhere on screen.
**Why human:** Color palette, typography sizing, and visual tone cannot be verified by grep or tsc.

#### 3. E2E Live Knockout Flow

**Test:** Run `E2E_REAL_LOGIN=1 E2E_ALLOW_DB_WRITE=1 KNOCKOUT_VAGA_SLUG=<slug> npm run test:e2e -- e2e/inscricao-knockout.spec.ts` against a seeded knockout vaga.
**Expected:** Chromium: 3/3 pass (inline message + /perfil feedback_rejeicao + no-leak). Mobile/tablet: equivalent.
**Why human:** Live env flags required; needs a seeded vaga with a knockout-tagged pergunta.

#### 4. Dashboard Feedback Visibility (post-fix confirmation)

**Test:** Navigate to the candidate dashboard as a knocked-out candidate (after EF deploy).
**Expected:** Status badge correctly shows "Rejeitado"; `feedback_rejeicao` message renders below it; 6 stat counters (total/aguardando/em_analise/aprovadas/rejeitadas/finalizadas) show valid counts. No undefined values.
**Why human:** Visual layout rendering and regression verification requires a live session; also depends on EF deploy completing first for a real knockout candidatura to exist.

---

_Verified: 2026-06-08 (re-verification)_
_Verifier: Claude (gsd-verifier)_
