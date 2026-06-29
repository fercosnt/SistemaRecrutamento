---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: M3 — Refinamento RH & Hardening
status: executing
stopped_at: Completed 18-06-PLAN.md (RESIL-03 <AsyncState> adopted on all 5 AI-backed screens — RESIL-03 done)
last_updated: "2026-06-29T03:50:00.000Z"
last_activity: 2026-06-29
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 7
  completed_plans: 6
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-29 — M3/v3.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 18 — Resiliência das EFs de IA & Bugs do Funil

## Current Position

Phase: 18 (Resiliência das EFs de IA & Bugs do Funil) — EXECUTING
Plan: 7 of 7
Status: 18-06 complete (RESIL-03 done) — only 18-07 [BLOCKING] EF redeploy remains
Last activity: 2026-06-29

Progress: [████████░░] 86%

## Roadmap (M3 — Phases 18–21)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 18 — Resiliência EFs & Bugs Funil | EFs de IA resistem a latência/overload + 4 achados live corrigidos | RESIL-01/02/03, FIX-01/02 |
| 19 — Performance (Bundle & Cache) | First paint sem 661 KiB monolítico + mudanças escritas em ≤60s | PERF-03, PERF-04 |
| 20 — Refino RH (Editar Guia) | RH edita guia de entrevista por write-path seguro auth-then-authz | ENTREV-06/07/08 |
| 21 — Production-Readiness (UATs) | UATs live deferidos do M2 fechados em PROD | PROD-01, PROD-02 |

Coverage: 12/12 requirements mapeados ✓ · 0 unmapped. Execução numérica: 18 → 19 → 20 → 21.

## Performance Metrics

**Velocity (histórico de milestones):**

- M1 (v1.0): 7 fases / ~32 plans — shipped 2026-06-06. · M2 (v2.0): 11 fases / 63 plans — shipped 2026-06-26. · Phase 17 standalone: 5 plans — shipped 2026-06-28.
- Ledger detalhado por plano arquivado em `milestones/v1.0-*`, `milestones/v2.0-*` e nos SUMMARY de cada fase.

**By Phase (M3):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 18 | TBD | - | - |
| 19 | TBD | - | - |
| 20 | TBD | - | - |
| 21 | TBD | - | - |

*Updated after each plan completion.*
| Phase 18 P01 | 18min | 3 tasks | 2 files |
| Phase 18 P02 | 7min | 2 tasks | 3 files |
| Phase 18 P03 | 4min | 2 tasks | 3 files |
| Phase 18 P04 | 9min | 3 tasks | 3 files |
| Phase 18 P05 | 7min | 2 tasks | 6 files |
| Phase 18 P06 | 12min | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions. Recentes que afetam o M3:

- [M2/Phases 6–15]: Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL `$$`; grava version row sozinho).
- [M2/Phase 10]: EFs privilegiadas = two-client + autorizar DEPOIS de autenticar (IDOR/PII guard) — base direta do write-path do ENTREV-08.
- [M2/AVAL-03]: Imports `npm:` ESTÁTICOS em toda EF de IA (nunca `await import([...].join(""))`) — relevante p/ RESIL-01/02.
- [M2/Phases 6/13/15]: Revisão humana sempre obrigatória pós-IA; zero auto-rejeição por score (RNF-07a) — invariante a preservar no guia (ENTREV-08).
- [Phase ?]: [Phase 18/18-01] RESIL-01: callAi passa { timeout: AI_CALL_TIMEOUT_MS (25s default), maxRetries:0 } no 2o arg de parse() em ambos os provedores; loop hand-rolled e o unico dono do retry (Pitfall 1). Env-config com default-guard.
- [Phase ?]: [Phase 18/18-01] Open Question A2 RESOLVIDA: parse() aceita 2o arg RequestOptions em @anthropic-ai/sdk@0.102.0 + openai@6.42.0 (verificado nos .d.ts cacheados); rota per-call escolhida (sem fallback de constructor). _shared change so vale em PROD apos redeploy (Plan 18-07, Pitfall 6).
- [Phase 18]: [Phase 18/18-02] RESIL-02: gerar-devolutiva-bigfive paraleliza as 5 dims OCEAN via Promise.allSettled (index-mapped → ordem O-C-E-A-N preservada), 1 tentativa/dim (era 2), degrade per-dim inline ao BAND_TEMPLATES; mata o timeout achado #2. NOT Promise.all. Code-only — live so apos redeploy Plan 18-07 (bundle freeze).
- [Phase ?]: [Phase 18/18-03] FIX-01/FIX-02 travados por testes de regressão SEM re-fix: única mudança de produção é o keyword export em normalizeSjtComposite (corpo byte-unchanged 350e994). FIX-01 = 2 casos Deno (pendente-único→null; MC 8/10→80 preservado); FIX-02 = Vitest mock multi-tabela assertando .eq('status','active') retorna rows. consolidar segue NO-LLM (RNF-07a).
- [Phase 18]: [Phase 18/18-04] RESIL-03 (component half): shared `<AsyncState>` (src/components/ui/) generaliza o pattern do HubSection + retry exemplar do ConsolidacaoDashboard → contrato único de 5 estados (loading → slow@8s → error → empty → success) em priority order vinculante. errorCode==='AI_UNAVAILABLE' → copy de sobrecarga; senão genérica. COPY PT-BR verbatim single-sourced; retry só no error state (GlassButton variant=white min-h-[44px], 'Tentando…'+disabled). Renderiza só copy estática por errorCode — nunca ecoa erro cru/PII (T-18-04-ID). HubSection delega (glass={false}, mantém shell+título), futuro/sem_dados/erro preservados como overrides via copy prop, sem onRetry → error stays retry-less (no drift; hubEmptyState D-07 verde). +AsyncStateCopyOverride (slot+field optional). tsc 258. Plan 05 = extractEfErrorCode + wire error_code nos services; Plan 06 = adotar nas 5 telas de IA.
- [Phase 18]: [Phase 18/18-06] RESIL-03 (adoption — DONE): `<AsyncState>` adotado nas 5 telas de IA. RH: ConsolidacaoDashboard (bloco inline de retry — o exemplar — removido → `<AsyncState glass={false}>`, errorCode de useConsolidacao().error, success body extraído p/ ConsolidacaoBody, empty domínio fica success-branch) · ComparativoScreen (tela presentacional pura ganhou props async OPCIONAIS + hospeda `<AsyncState glass={false}>`; estado real do invoke threaded de ComparativoCandidatosPage + DecisaoFinalPage via errorCodeOf(TriagemServiceError); **MIXED_VAGA PRESERVADO via copy override** — T-18-06-T2). Candidato: BigFiveQuestionnaireScreen (skeleton bare → loading→slow~30s→error+retry sobre getBigfiveItens; submit mantém 'Enviando…') · SjtCasoAbertoScreen (loading-only → +error+retry) · RedacaoEditorScreen ('Tentar novamente' bespoke → wrapper compartilhado). errorCode code-only via errorCodeOf() local (NÃO editou os services — 18-05 é dono); reads de DB → genérico, AI_UNAVAILABLE surge nos invokes. Nunca tela em branco; min-h-[44px] no retry. tsc 258. **657/657 vitest verdes.** Deviation (Rule 3): editou 2 consumer pages fora de files_modified p/ threadar o errorCode que os must_haves exigem. Deferred: DevolutivaBigFiveView (~30s devolutiva literal) fora de files_modified → follow-up. Live visual UAT → Phase 21.
- [Phase 18]: [Phase 18/18-05] RESIL-03 (service-plumbing half): shared `extractEfErrorCode(data, error)` em `src/lib/efErrors.ts` — lê error_code do body 200 (`data.error_code`) E do FunctionsHttpError não-2xx (`await error.context.json()`), degrada p/ undefined em body não-JSON, NUNCA throwa, retorna só o código (sem PII, ASVS V7/T-18-05-ID). Wired nos 4 serviços de IA (avaliacaoService.avaliarRedacao=AI_UNAVAILABLE primário · bigfiveService.submitBigfiveFinal=fallback NETWORK_ERROR, LOCKED/INVALID_INPUT intactos · triagemService.invokeComparativo=MIXED_VAGA PRESERVADO+AI_UNAVAILABLE via helper · decisaoService.getConsolidacao=branch error + legacy data.ok===false KEPT, consolidar é NO-LLM) → cada `*ServiceError` carrega `{ error_code, raw }` em details p/ `<AsyncState errorCode>` ramificar sobrecarga-vs-genérico (adoção = Plan 06). Generaliza o read inline MIXED_VAGA num único helper (anti-drift). Achado: bigfiveService NÃO invoca gerar-devolutiva-bigfive do client (server-side off submit-bigfive-final); duplicata inline de extractEfErrorCode existe em entrevistaService L573 (fora de escopo, candidato a follow-up). tsc 258 baseline. 80 testes verdes (7 novos efErrors + 73 existentes).

### Pending Todos

SEED-001 (`ENTREV-GUIA-EDIT-01`) absorvido como ENTREV-06/07/08 → Phase 20. Demais: ver `.planning/todos/`.

### Blockers/Concerns

- Phase 18 sem CONTEXT.md ainda — recomendado `/gsd-discuss-phase 18` antes de planejar (achados live #1–4 têm detalhe operacional em MEMORY `project_funil_e2e_seed_achados`).

## Deferred Items

Carregados do fechamento do M2. HARD-02 + PERF-01 entraram no M3 como PERF-03/PERF-04; o resto fica para M4.

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Tech-debt | FOUND-08 (tsc burn-down tail) | Deferred → M4 | M2 close + M3 kickoff |
| Tech-debt | CC0-01 (item-bank cognitivo real seed) | Deferred → M4 | M2 close + M3 kickoff |
| Feature | SCHED-01 / BIAS-01 / JUDGE-01 / NORM-01 / DEVOL-01 | Deferred → M4 candidates | M3 kickoff |

## Session Continuity

Last session: 2026-06-29T03:50:00.000Z
Stopped at: Completed 18-06-PLAN.md (RESIL-03 <AsyncState> adopted on all 5 AI-backed screens — RESIL-03 done; only 18-07 [BLOCKING] EF redeploy remains)
Resume file: None
