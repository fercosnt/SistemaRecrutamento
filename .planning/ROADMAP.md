# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06)
- ✅ **v2.0 — M2 Funil RH + Avaliação por IA** — Phases 6–16 (shipped 2026-06-26)
- 🔧 **Standalone (pós-v2.0)** — Phase 17 (Navegação & Arquitetura de Informação) — mini-fase fora de milestone (shipped 2026-06-28)
- 🚧 **v3.0 — M3 Refinamento RH & Hardening** — Phases 18–21 (in progress)

## Phases

<details>
<summary>✅ v1.0 — M1 MVP Candidato (Phases 1–5) — SHIPPED 2026-06-06</summary>

Full detail archived in `milestones/v1.0-ROADMAP.md`. Requirements: `milestones/v1.0-REQUIREMENTS.md`. Audit: `milestones/v1.0-MILESTONE-AUDIT.md` (PASSED, 38/38 reqs).

</details>

<details>
<summary>✅ v2.0 — M2 Funil RH + Avaliação por IA (Phases 6–16) — SHIPPED 2026-06-26</summary>

Full detail archived in `milestones/v2.0-ROADMAP.md`. Requirements: `milestones/v2.0-REQUIREMENTS.md`. Audit: `v2.0-MILESTONE-AUDIT.md` (PASSED, 42/42 reqs; the single BLOCKER AVAL-03 was fixed + redeployed + PROD-smoked post-audit).

The full RH hiring funnel + AI-assisted evaluation across 11 phases (63 plans): pipeline backbone & RLS (P6), vaga config + tags (P7), inscrição + objective knockouts (P8), shared AI prompt library + cost infra (P9), AI triagem + comparativo (P10), async evaluation — Work-Sample/SJT + Big Five + cultural redação with mandatory human review (P11–13), AI-companion interviews + cognitive (P14), auditable final decision + LGPD Art. 20 + bias audit (P15), and WCAG-AA / tech-debt hardening (P16). Invariant: the system NEVER auto-rejects on a score (RNF-07a); AI is always a recommendation with a human decision.

</details>

<details>
<summary>✅ Phase 17 — Navegação & Arquitetura de Informação (standalone mini-fase) — SHIPPED 2026-06-28</summary>

Cabeou na navegação real de produção o funil construído no M2 (avaliação do candidato + workspaces RH de entrevista/redação/decisão + telas admin), antes só alcançável por URL direta / DevNavigationMenu DEV-only. Hub de candidato real, Dashboard × Perfil consolidados, entrada às telas admin, 404 glass, remoção de legado morto, teste E2E de navegabilidade. 5/5 plans / 4 waves. Verifier 13/13, security 18/18 closed, 4 UATs live fechados 4/4. Standalone — sem lifecycle de milestone.

</details>

### 🚧 v3.0 — M3 Refinamento RH & Hardening (In Progress)

**Milestone Goal:** Endurecer o funil de IA recém-construído (M2) para uso real em produção — resiliência das Edge Functions, performance e fechamento de UATs live — e refinar a experiência do RH, **sem expandir superfície de features**. Invariante preservado: IA é recomendação, humano decide (RNF-07a); nenhuma escrita nova em `candidaturas` por trait/score/idade; write-paths privilegiados seguem authenticate-THEN-authorize.

- [x] **Phase 18: Resiliência das EFs de IA & Bugs do Funil** - EFs de IA resistem a latência/overload e os 4 achados live do E2E em PROD são corrigidos (completed 2026-06-29)
- [x] **Phase 19: Performance — Bundle & Cache** - Candidato mobile-first não paga 661 KiB no first paint e mudanças escritas aparecem em ≤60s (completed 2026-06-29)
- [ ] **Phase 20: Refino RH — Editar Guia de Entrevista (SEED-001)** - RH edita/adiciona/remove/reordena perguntas do guia por write-path seguro authenticate-THEN-authorize
- [ ] **Phase 21: Production-Readiness — UATs Live** - HUMAN-UAT live deferidos do M2 fechados com dados/contas reais em PROD

## Phase Details

### Phase 18: Resiliência das EFs de IA & Bugs do Funil
**Goal**: As Edge Functions de IA do funil resistem a latência alta e overload transiente da Anthropic sem falha dura, candidato e RH veem estado claro durante chamadas lentas/falhas, e os 4 achados do E2E live em PROD (candidatura `a1dd4c42`) deixam de travar o funil.
**Depends on**: Nothing (first phase of M3; builds on shipped M2 EFs)
**Requirements**: RESIL-01, RESIL-02, RESIL-03, FIX-01, FIX-02
**Success Criteria** (what must be TRUE):
  1. Uma EF de IA que recebe 429/529/overload da Anthropic não falha na 1ª tentativa — ela retenta com backoff exponencial dentro de um timeout configurável e só falha depois de esgotar as tentativas (RESIL-01).
  2. `gerar-devolutiva-bigfive` completa dentro do limite de execução sem estourar timeout, mesmo com o conjunto de chamadas de IA que hoje a derruba (RESIL-02).
  3. Quando uma EF de IA demora ou falha, a tela do candidato e a do RH mostram loading, erro legível e retry visível — nenhuma tela trava em branco (RESIL-03).
  4. `consolidar-decisao-final` produz um consolidado correto quando `work_sample_sjt='na'` e há caso aberto pendente — não trava nem zera o consolidado (FIX-01).
  5. A tela de avaliação do RH carrega as perguntas independentemente do mismatch `status='active'` vs filtro `'ativo'` — status e filtro alinhados na fonte (FIX-02).
**Plans**: 7 plans
- [x] 18-01-PLAN.md — RESIL-01: callAi per-call timeout + maxRetries:0 + env-config (hardening do helper compartilhado)
- [x] 18-02-PLAN.md — RESIL-02: paralelizar gerar-devolutiva-bigfive (5 dims, allSettled, 1 attempt, degrade)
- [x] 18-03-PLAN.md — FIX-01/FIX-02: travar bugs já corrigidos com testes de regressão (normalizeSjtComposite + status='active')
- [x] 18-04-PLAN.md — RESIL-03: shared <AsyncState> wrapper + contract test + refactor HubSection
- [x] 18-05-PLAN.md — RESIL-03: extractEfErrorCode helper + wire error_code nos services de IA
- [x] 18-06-PLAN.md — RESIL-03: adotar <AsyncState> nas 5 telas de IA (candidato + RH) — RESIL-03 DONE
- [x] 18-07-PLAN.md — [BLOCKING] redeploy de todas as EFs de IA em PROD (gate humano)

### Phase 19: Performance — Bundle & Cache
**Goal**: O candidato mobile-first deixa de pagar o bundle monolítico de 661 KiB no first paint, e qualquer mudança escrita por candidato ou RH aparece no perfil/dashboard do candidato em ≤60s.
**Depends on**: Nothing (independent of Phase 18; can run after it for stability)
**Requirements**: PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. O bundle é servido em chunks separados (code-splitting route-level + vendor) — o first paint do candidato carrega só o chunk da rota inicial, não os 661 KiB monolíticos (PERF-03, fecha HARD-02).
  2. Uma mudança escrita relevante (candidato ou RH) aparece no perfil/dashboard do candidato em ≤60s — invalidação de cache alvo nas mutations relevantes (PERF-04, fecha PERF-01).
  3. As rotas do candidato e do RH continuam funcionando após o code-splitting (sem regressão de navegação; chunks resolvem em runtime).
**Plans**: 3 plans
- [x] 19-01-PLAN.md — Wave 0: lazyNamed adapter + PageSkeleton fallback + chunk-assertion harness + 2 invalidation regression tests
- [x] 19-02-PLAN.md — PERF-03 code-split: manualChunks react-vendor + lazy /rh/* /admin/* (RoleGuard outside) + Suspense + dynamic-import jsPDF + E2E no-regression
- [x] 19-03-PLAN.md — PERF-04 cache: targeted decisaoKeys.consolidacao invalidation (2 gaps) + useCandidaturas refetchOnWindowFocus (≤60s)
**UI hint**: yes

### Phase 20: Refino RH — Editar Guia de Entrevista (SEED-001)
**Goal**: O RH consegue editar, adicionar, remover e reordenar perguntas no guia de entrevista, com as edições persistidas por um write-path seguro authenticate-THEN-authorize, marcação de origem por pergunta para auditoria, e sem que a regeneração por IA descarte edições manuais silenciosamente.
**Depends on**: Phase 18 (guia de entrevista é uma das superfícies de IA endurecidas)
**Requirements**: ENTREV-06, ENTREV-07, ENTREV-08
**Success Criteria** (what must be TRUE):
  1. RH edita o texto e a dimensão de uma pergunta existente no guia (online/presencial) e a mudança persiste (ENTREV-06).
  2. RH adiciona uma pergunta manual (texto + dimensão), remove uma pergunta e reordena as perguntas do guia (ENTREV-07).
  3. A persistência passa por RPC/EF authenticate-THEN-authorize: role RH derivado de `usuarios_rh` + posse via `candidatura → vaga.created_by`, `administrador` bypassa; um RH sem posse e um candidato recebem negação — **não** existe policy RH UPDATE ampla em `entrevista_guias` (ENTREV-08).
  4. Cada pergunta fica marcada `origem: 'ia' | 'manual'`, e regenerar o guia por IA **não** descarta as perguntas manuais silenciosamente (ENTREV-08).
  5. O guia continua sem escrever em `candidaturas` — RNF-07a preservada em todo o write-path (ENTREV-08).
**Plans**: 5 plans
- [x] 20-01-PLAN.md — Author migration (dedup→UNIQUE→updated_at→save_entrevista_guia_edits RPC role-from-usuarios_rh) + SQL smoke + Deno merge-preserve scaffold (RED)
- [ ] 20-02-PLAN.md — [BLOCKING] Apply migration via Supabase MCP + run authz SQL smokes + regen database.types.ts
- [ ] 20-03-PLAN.md — Service saveGuiaEdits + origem-aware normalizeGuia + updated_at allowlist + useGuiaEntrevista.saveEdits mutation + vitest
- [ ] 20-04-PLAN.md — [BLOCKING] EF gerar-guia-entrevista merge-preserve (INSERT→upsert, keep origem:'manual', failed-regen guard, origem:'ia' stamp) + Deno test green + redeploy
- [ ] 20-05-PLAN.md — Edit-mode UI: EditablePerguntaRow (inline edit, up/down, delete-confirm, add-manual), IA/Manual badges, batch Salvar edições + AsyncState states + workspace wiring + RTL test
**UI hint**: yes

### Phase 21: Production-Readiness — UATs Live
**Goal**: Os HUMAN-UAT live deferidos do M2 — que precisam de dados e contas reais em PROD — são executados e fechados, validando em produção o hardening feito nas fases anteriores deste milestone.
**Depends on**: Phase 18, Phase 19, Phase 20 (valida em PROD o que foi endurecido/refinado)
**Requirements**: PROD-01, PROD-02
**Success Criteria** (what must be TRUE):
  1. O UAT live da Phase 11 (Work-Sample/SJT open-case + redação — scoring round-trip com candidato real) é executado em PROD e marcado PASS (PROD-01).
  2. Os HUMAN-UAT live deferidos da Phase 16 (cold-start login RH, Tier-B R5/C5 axe sweep, keyboard roving-focus, Big Five aria-live) são fechados em PROD — ou explicitamente re-deferidos com justificativa registrada (PROD-02).
  3. Cada resultado de UAT (PASS / re-deferido) fica registrado com evidência (dados/contas reais usados, achados) no artefato de UAT da fase.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 18 → 19 → 20 → 21

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–5 (M1) | v1.0 | 40/40 | Complete | 2026-06-06 |
| 6–16 (M2) | v2.0 | 63/63 | Complete | 2026-06-26 |
| 17 | standalone | 5/5 | Complete | 2026-06-28 |
| 18. Resiliência EFs & Bugs Funil | v3.0 | 7/7 | Complete   | 2026-06-29 |
| 19. Performance — Bundle & Cache | v3.0 | 3/3 | Complete   | 2026-06-29 |
| 20. Refino RH — Editar Guia | v3.0 | 1/5 | In Progress|  |
| 21. Production-Readiness — UATs | v3.0 | 0/TBD | Not started | - |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/v1.0-*`.*
*v2.0 milestone shipped 2026-06-26 — full requirements and roadmap detail archived under `.planning/milestones/v2.0-*`. 11 phases (6–16), 42/42 requirements, audit PASSED.*
*v3.0 milestone roadmap created 2026-06-29 — 4 phases (18–21), 12/12 requirements mapped. Hardening/consolidação, não expansão. Phase numbering continues from M2 (Phase 17 was standalone post-M2).*
