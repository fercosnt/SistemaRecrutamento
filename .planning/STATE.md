---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: M3 — Refinamento RH & Hardening
status: executing
stopped_at: Completed 20-05-PLAN.md (edit-mode GuiaEntrevistaPanel UI; 13 RTL tests; tsc 257; vitest 688/688; build green — Phase 20 plans 5/5 done)
last_updated: "2026-06-30T01:22:30.000Z"
last_activity: 2026-06-30
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 15
  completed_plans: 15
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-29 — M3/v3.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 20 — Refino RH — Editar Guia de Entrevista (SEED-001)

## Current Position

Phase: 20 (Refino RH — Editar Guia de Entrevista (SEED-001)) — ALL PLANS DONE
Plan: 5 of 5 (complete)
Status: Phase 20 plans 5/5 done. 20-05 edit-mode UI shipped — toggle 'Editar guia' + EditablePerguntaRow (inline edit, up/down, delete-confirm, add-manual), IA/Manual badges, batch 'Salvar edições' via saveEdits + AsyncState save-error contract, workspace wiring. 13 RTL tests, tsc 257, vitest 688/688, build green. ENTREV-06/07/08 user-observable surface closed. Next = /gsd-verify-work Phase 20 (then /gsd-secure-phase 20), then Phase 21 (UATs live). [BLOCKING] reminders still open from prior plans: 20-04 EF gerar-guia-entrevista PROD redeploy (merge-preserve) at orchestrator gate.
Last activity: 2026-06-30

Progress: [██████████] 100%

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
| Phase 19 P01 | 5min | 3 tasks | 6 files |
| Phase 19 P02 | 7min | 2 tasks | 7 files |
| Phase Phase 19 P03 P03 | 6min | 2 tasks | 6 files |
| Phase 20 P01 | 4min | 2 tasks | 3 files |
| Phase 20 P03 | 9min | 2 tasks | 5 files |
| Phase 20 P04 | 6min | 1 task | 1 file |
| Phase 20 P05 | 5min | 2 tasks | 3 files |

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
- [Phase 19]: [Phase 19/19-01] PERF-03/04 Wave-0 scaffolds (interface-first, no source hooks/routes/vite.config touched). `src/router/lazyNamed.ts` = `lazyNamed(loader,name)` adapter que remapeia o NAMED export sobre o `{default}` que React.lazy exige (CLAUDE.md proíbe default exports — é A razão do helper existir; PRIMEIRO uso de React.lazy no codebase). `PageSkeleton.tsx` = fallback de Suspense glass de marca, self-contained (sem data/hooks), reusa o idiom do AsyncState. `scripts/assert-chunks.mjs` = gate de build-output (só `node:` built-ins, ZERO deps novas; roda sob `npm run build`, NÃO Vitest — `scripts/**` excluído; sai non-zero contra o monolito pré-split, prova que é gate real). 2 testes de regressão PERF-04 RED-by-design (salvarAvaliacao/salvarRevisao ainda NÃO invalidam `decisaoKeys.consolidacao` → 19-03 vira GREEN); estabelece o PRIMEIRO pattern `vi.spyOn(queryClient,'invalidateQueries')` do repo; chamadas contract-typed (cast ScorecardWithVagaId / SalvarRevisaoVars) mantêm tsc flat em 258. lazyNamed.test GREEN. **vitest 659 pass / 2 RED-by-design (661 total), tsc 258, build não rebuildado (Plan 19-02 dono do split+rebuild).**
- [Phase ?]: [Phase 19/19-02] PERF-03 code-split: narrow react-vendor manualChunks (react/react-dom/react-router/scheduler ONLY — broad node_modules→vendor forbidden, re-triggers prod circular-init blank screen; @radix-ui auto-chunked). 20 /rh/* + /admin/* pages → lazyNamed per-page behind single RootLayout <Suspense fallback={PageSkeleton}>; candidate/auth/avaliação routes EAGER. RoleGuard OUTSIDE every lazy element (31 <RoleGuard> JSX tags intact). jsPDF via call-site await import() (ComparativoScreen chunk 428→7.7 kB; jsPDF isolated 421 kB on-demand). Eager candidate index 2,788→904 kB; react-vendor 207 kB; 41 chunks; assert-chunks PASS; tsc 258; vitest 659 pass / 2 RED-by-design (PERF-04 → 19-03). Deviations: lazyNamed generic relaxed to <T,K> (RedacaoReviewPanel re-exports redacaoRevisaoKeys — Rule 3); ComparativoScreen export test → async+waitFor (Rule 1).
- [Phase 19]: [Phase 19/19-03] PERF-04 cache invalidation + freshness (fecha tech-debt PERF-01; **Phase 19 COMPLETE**). Gap A `useEntrevistaScorecard` ganhou `vagaId` posicional (ANTES de options); salvarAvaliacao.onSuccess invalida TARGETED `decisaoKeys.consolidacao(candidaturaId, vagaId)` (mantém scorecard) — NUNCA `decisaoKeys.all` (CONTEXT Área 2 ALVO). Gap B `useRedacaoRevisao` thread per-row `candidaturaId` nas mutation VARS (carregado só p/ invalidação — mutationFn AINDA chama salvarRevisao(redacaoId, payload), service signature intacta); onSuccess(_d, vars) adiciona TARGETED consolidacao (mantém queue+duvidas). Freshness: `useCandidaturas` ganhou per-query `refetchOnWindowFocus:true` (staleTime 1min já ≤60s; precisa dos DOIS p/ disparar — RESEARCH Pitfall 5); global default `App.tsx:43` segue `false` (RH/AI reads não refetcham). Audit: useCandidaturas é o ÚNICO read candidato-facing mutável que precisa do par (useExplicacao estático; useAllCandidaturas/useVagaCandidaturas = RH OOS). RNF-07a preservado (cache-only, zero candidaturas writes; consolidacao read-only/advisory). **Deviation (Rule 3): 2º caller `HubCandidatoRH.tsx:90` (read-only, fora de files_modified) exigiu o novo arg posicional vagaId após a mudança de assinatura → threaded o vagaId já em escopo; tsc voltou 258.** Os 2 testes RED-by-design de 19-01 agora GREEN; **vitest 661/661, tsc 258.** Cross-client ≤60s live = UAT Phase 21.
- [Phase ?]: [Phase 20/20-01] ENTREV-08 authored (NOT applied): save_entrevista_guia_edits SECURITY DEFINER deriva role de public.usuarios_rh (NÃO do claim JWT — desvio ENTREV-08; ativo+deleted_at IS NULL, recrutador→rh, administrador→administrador) + own-vaga via candidaturas→vagas.created_by + admin bypass; RH-sem-posse+candidato→42501. Migration order load-bearing: dedup(DISTINCT ON keep-latest)→updated_at→UNIQUE(candidatura_id,tipo)→CREATE FUNCTION; ON CONFLICT upsert; REVOKE PUBLIC+GRANT authenticated; search_path=''; NO BEGIN/COMMIT (D-22); never escreve candidaturas (RNF-07a). SQL smoke (BEGIN/ROLLBACK) cobre 7 casos incl. claim-says-rh-no-table-row→DENY (prova role-from-table). Deno merge-preserve test RED-by-design (3/3 fail calibrado) até 20-04. vitest 662/662, tsc 257.
- [Phase 20]: [Phase 20/20-03] ENTREV-06/07/08 service+hook layer (clone-with-one-swap): saveGuiaEdits(candidaturaId, tipo, perguntas) clona salvarAvaliacao → chama save_entrevista_guia_edits RPC com { p_candidatura_id, p_tipo, p_guia:{ perguntas } }, mapRpcError REUSADO verbatim (42501→FORBIDDEN, nunca expõe erro cru/PII), read-back via getGuia; nunca escreve candidaturas (RNF-07a). normalizeGuia agora origem-aware — carrega q.origem, default legacy/missing/garbled → 'ia' (A2, sem backfill), só 'manual' explícito preservado (read layer carrega proveniência p/ ENTREV-08 audit). ENTREVISTA_GUIA_ALLOWLIST += updated_at (NUNCA select('*') — Pitfall 6). GuiaPergunta += origem?:'ia'|'manual'; EntrevistaGuiaRow += updated_at. useGuiaEntrevista.saveEdits useMutation (vars { tipo, perguntas }) invalida entrevistaKeys.guia(candidaturaId) — MESMA key do read+gerar (batch-save plumbing p/ 20-05). Deviation (Rule 3): p_guia cast `as unknown as Json` no boundary do RPC (GuiaPergunta `[k]:unknown` é structuralmente wider que Json; precedente configVagaService p_opcoes) → tsc voltou 257. vitest 675/675 (+13 novos: origem normalize, saveGuiaEdits contract anti-tamper, hook invalidation), tsc 257 baseline. Anti-tamper test pin: p_guia payload não carrega banda/band/veredito/threshold. Próximo = 20-04 (EF merge-preserve, [BLOCKING] redeploy) + 20-05 (edit UI).
- [Phase 20]: [Phase 20/20-05] ENTREV-06/07/08 edit-mode UI (user-observable surface — Phase 20 plans 5/5 done): read-only GuiaEntrevistaPanel → edit mode. Toggle 'Editar guia' (disabled when no guide) → EditablePerguntaRow: inline `Input` (pergunta) + Radix `Select` (dimensão; options = closed union of the guide's dimensões + the row's current value, since AI dimensões have no fixed enum) + up/down `ChevronUp/Down` (aria-labels, boundary buttons `disabled` not hidden) + delete `Trash2`→`AlertDialog` ('Remover esta pergunta?'/confirm 'Remover pergunta'; removal staged in draft, persisted on save). Add-manual inline form (Pergunta Input + Dimensão Input → free-text so a NEW dimensão isn't trapped by a closed Select) stamps `origem:'manual'`. Per-question IA (accent #35BFAD + Sparkles) / Manual (neutral) `OrigemBadge`; missing origem → IA — the ENTREV-08 audit affordance, rendered in BOTH modes. Batch footer 'Salvar edições' (accent GlassButton, disabled-until-dirty + 'Salvando…' while saving) calling `onSaveEdits({ tipo: guia.tipo, perguntas: draft })` + 'Cancelar' (neutral, reverts to last-saved WITHOUT a dialog). Edit state = local `draft[]` reset via `useEffect` on saved-guide reference change → a successful save invalidates the guide key (20-03 hook), the saved guide flows in, effect exits edit mode. Save-error band = static PT-BR copy keyed by code (FORBIDDEN/insufficient_privilege → 'Você não tem permissão para editar este guia.'; else generic) — NEVER echoes the raw RPC error/SQLSTATE/table (T-20-16/T-18-04-ID); test pins no leak of '42501'/'insufficient_privilege'/'entrevista_guias'. IA-only Âncoras BARS read-only in both modes. Accent ONLY on IA badge/Sparkles/Salvar (UI-SPEC §Color). Panel only edits the guide jsonb — never touches candidaturas (RNF-07a). EntrevistaWorkspace destructures `saveEdits`, passes onSaveEdits/saving/saveError/saveErrorCode (code cast via EntrevistaServiceError), fires Sonner toast 'Edições do guia salvas.' on isSuccess; no other tabs touched. RTL idiom = fireEvent (repo convention); Radix Select popper NOT driven under happy-dom (flaky) → dimensão exercised via the deterministic add-manual Input. **13 new RTL tests; vitest 688/688 (was 675); tsc 257 baseline; build green.** Commits `eb2aeb2` (panel+test) + `100548b` (workspace wiring). ENTREV-06/07/08 user-observable half CLOSED (backend already live 20-02/20-04). Next = /gsd-verify-work + /gsd-secure-phase Phase 20.
- [Phase 20]: [Phase 20/20-04] ENTREV-08 EF merge-preserve (CODE half — [BLOCKING] PROD redeploy DEFERRED ao gate do orchestrator, precedente Phase-18): gerar-guia-entrevista trocou o blind `.insert()` por read-merge-upsert ON CONFLICT(candidatura_id,tipo). Lê a guia atual via `select("guia")` allowlist (NUNCA select('*') — reference_select_star_leaks_pii), separa por `q.origem==='manual'` (campo autoritativo, NÃO match por texto/ordem), PRESERVA toda pergunta manual, estampa as frescas `origem:'ia'` POST-parse (schema zod/v4 + helper zodOutputFormat/zodResponseFormat intactos — A1), merge `[manualQs, freshIaQs]`. CRÍTICO Pitfall 3: o merge roda ANTES do fallback `guide ?? {incompleto}` — um regen FALHO/poisoned (guide==null) carrega `manualQs` no payload incompleto, NUNCA apaga uma edição manual. Two-client auth (L143-199) + log LGPD redigido + persistFlags build UNCHANGED; nunca escreve candidaturas (RNF-07a); imports `npm:` estáticos. O teste Deno merge-preserve RED-by-design de 20-01 agora GREEN 3/3 (manual-sobrevive + failed-regen-mantém-manual + ia-stamp); tsc 257 baseline; vitest 675/675. **EF NÃO redeployada** — Task 2 (deploy PROD) é orchestrator-gated/human-gated; round-trip live = Phase 21. Commit `099ade9`.

### Pending Todos

SEED-001 (`ENTREV-GUIA-EDIT-01`) absorvido como ENTREV-06/07/08 → Phase 20. Demais: ver `.planning/todos/`.

### Blockers/Concerns

- None. Phase 19 ✅ complete — PERF-03 (code-split, 19-02) + PERF-04 (cache invalidation + freshness, 19-03) shipped; vitest 661/661, tsc 258 baseline. Cross-client ≤60s live freshness check deferred to Phase 21 UAT. Next = /gsd-verify-work Phase 19, then Phase 20 (Refino RH — Editar Guia).

## Deferred Items

Carregados do fechamento do M2. HARD-02 + PERF-01 entraram no M3 como PERF-03/PERF-04; o resto fica para M4.

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Tech-debt | FOUND-08 (tsc burn-down tail) | Deferred → M4 | M2 close + M3 kickoff |
| Tech-debt | CC0-01 (item-bank cognitivo real seed) | Deferred → M4 | M2 close + M3 kickoff |
| Feature | SCHED-01 / BIAS-01 / JUDGE-01 / NORM-01 / DEVOL-01 | Deferred → M4 candidates | M3 kickoff |

## Session Continuity

Last session: 2026-06-30T01:22:30.000Z
Stopped at: Completed 20-05-PLAN.md (edit-mode GuiaEntrevistaPanel UI; 13 RTL tests; tsc 257; vitest 688/688; build green — Phase 20 plans 5/5 done)
Resume file: None
