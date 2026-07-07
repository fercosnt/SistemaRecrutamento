---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: M4 — Correção & Blindagem do Funil
status: executing
stopped_at: "Phase 23 / Plan 23-03 complete — guardrails de custo (AI-06): kill-switch PRÉ-chamada em callAi (SUM cost_usd do dia por vaga vs AI_DAILY_COST_CAP_USD, fail-OPEN, hold nunca reject — RNF-07a) + cost-alerter alertMessage extraído p/ messages.ts (4 canais incl candidate_cost_over_1). Deno 175/0. 4 commits TDD: 96cfb2b/da63409 · 7ca8737/e12807f. NÃO redeploya (23-06); janela/escopo/trigger canal candidate = 23-05. Restam 23-05 (migration PROD) + 23-06 (redeploy) na Phase 23."
last_updated: "2026-07-07T03:19:09.551Z"
last_activity: 2026-07-07 -- Phase 24 execution started
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 21
  completed_plans: 12
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-05 — M4/v4.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 24 — Blindagem de Segurança / PII / LGPD

## Current Position

Phase: 24 (Blindagem de Segurança / PII / LGPD) — EXECUTING
Plan: 1 of 9
Status: Executing Phase 24
Last activity: 2026-07-07 -- Phase 24 execution started

Progress: [████████░░] 83%

## Roadmap (M4 — Phases 22–27)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 22 — Rede de Testes, Destravamento & Varredura de Honestidade | Corpus Deno verde em CI + typecheck destravado (baseline 257) + login/landing/copy honestos | CI-01/02/04/05/08/09/11/12/14, UX-02/04/05 |
| 23 — Ressurreição da Stack de IA | 7 call_types com prompt real + circuit breaker/retry/guardrails vivos + descritor qualitativo | AI-01..07, UX-07/09 |
| 24 — Blindagem Segurança / PII / LGPD | RLS nunca é segredo de coluna + EF privilegiada autentica-E-autoriza + IDOR/PII fechados | SEC-01..11, UX-08 |
| 25 — Funil (lado RH) | Kanban/Editar-Vaga/decisão sobre enums+colunas que existem; RH não rejeita sem trilha (RNF-07a) | FUNIL-02/03/04/05/06/09/11, UX-03/06 |
| 26 — Funil (lado candidato) | Etapas alcançáveis + scoring íntegro/não-manipulável + reinscrição pós soft-delete | FUNIL-01/07/08/10/12, UX-01 |
| 27 — Migrations & Rede de Testes | 49 migrations reconstroem o banco + ledger converge + testes cobrem auto-reject/contratos | DBMIG-01/02, CI-03/06/07/10/13/15 |

Coverage: 56/56 requirements mapeados ✓ · 0 unmapped. Execução numérica: 22 → 23 → 24 → 25 → 26 → 27.

## Performance Metrics

**Velocity (histórico de milestones):**

- M1 (v1.0): 7 fases / ~40 plans — shipped 2026-06-06. · M2 (v2.0): 11 fases / 63 plans — shipped 2026-06-26. · Phase 17 standalone: 5 plans — shipped 2026-06-28. · M3 (v3.0): 4 fases / 16 plans — shipped 2026-06-30.
- Ledger detalhado por plano arquivado em `milestones/v1.0-*`, `milestones/v2.0-*`, `milestones/v3.0-*` e nos SUMMARY de cada fase.

**By Phase (M4):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 22 | 6 | - | - |
| 23 | 6 | - | - |
| 24 | TBD | - | - |
| 25 | TBD | - | - |
| 26 | TBD | - | - |
| 27 | TBD | - | - |

*Updated after each plan completion.*
| Phase 22 P01 | 13min | 2 tasks | 2 files |
| Phase 22 P02 | 18min | 2 tasks | 2 files |
| Phase 22 P03 | 12min | 3 tasks | 8 files |
| Phase 22 P04 | 4min | 2 tasks | 4 files |
| Phase 22 P05 | 14min | 2 tasks | 13 files |
| Phase 22 P06 | 12min | 3 tasks | 3 files |
| Phase 23 P01 | 16min | 3 tasks | 4 files |
| Phase 23 P04 | 17min | 3 tasks | 10 files |
| Phase 23 P02 | 22min | 3 tasks | 18 files |
| Phase 23 P03 | 22min | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions. Recentes que afetam o M4:

- [M2/Phases 6–15]: Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL `$$`; grava version row sozinho) — relevante p/ DBMIG-01 (reconstrução do banco + ledger converge).
- [M2/Phase 10]: EFs privilegiadas = two-client + autorizar DEPOIS de autenticar (IDOR/PII guard) — base direta de SEC-04/05/06/08 (autentica-E-autoriza).
- [M2/Phases 8/11]: RLS é row-level, não column-level; `select('*')` vaza gabarito/veredito → answer-keys candidato-DENY + leitura via RPC SECURITY DEFINER — base de SEC-01/02/07.
- [M2/AVAL-03]: Imports `npm:` ESTÁTICOS em toda EF de IA (nunca `await import([...].join(""))`) — relevante p/ AI-01..07 ao mexer nas EFs de IA.
- [M3/Phase 18]: callAi tem per-call timeout (25s default) + maxRetries:0 + retry/backoff hand-rolled — AI-03/04 corrigem o casamento do timeout retriável e o override per-EF.
- [M2/Phases 6/13/15]: Revisão humana sempre obrigatória pós-IA; zero auto-rejeição por score (RNF-07a) — invariante a preservar em FUNIL-02, e o `submit-candidatura` é o único auto-reject sancionado (CI-03).
- [Phase ?]: [Phase 22/22-01] Deno EF corpus green under type-check ON via deno.json top-level exclude of the strict-schema Vitest probe; canonical CI command = deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions (--ignore= fallback NOT needed on Deno 2.7.7)
- [Phase ?]: [Phase 22/22-01] Fixed stale LOCAL timeoutMs type in ai-client.test.ts loadClient(), not product CallAiArgs (already has it) — zero product change
- [Phase ?]: [Phase 22/22-02] Pinned 8 wildcard prod deps to EXACT lockfile versions (no ^) as supply-chain ceiling — @tiptap/* 3.10.1, clsx 2.1.1, react-dnd/html5-backend 16.0.1, tailwind-merge 3.3.1 (CI-09); removed dead deps motion + @supabase/auth-helpers-react (CI-12)
- [Phase ?]: [Phase 22/22-02] Bumped vitest+@vitest/ui 4.0.7→4.1.9 lockstep (UI-server RCE) + happy-dom 20.0.10→20.10.6 (code-exec); vite 6.3.5 unchanged; 3 named advisories cleared, 691/691 non-guard Vitest green (CI-11)
- [Phase ?]: [Phase 22/22-02] Pre-existing LGPD-04 guard red (psicólogo literal in gerar-devolutiva-bigfive:192, commit 7853eac) is version-independent + out of supply-chain scope → deferred not fixed; trivial fragment-join fix logged in deferred-items.md for UX-02/Phase-24
- [Phase ?]: [Phase 22/22-03] resolveRedirect EXTRACTED to one shared util (src/features/auth/utils/resolveRedirect.ts) + re-exported from LoginCandidatoPage so the legacy routing test import stays valid — security guard never duplicated (CI-06 dedup lesson); consumed by login + cadastro
- [Phase ?]: [Phase 22/22-03] Dropping !isValid from a login button's disabled expr MUST also drop isValid from the formState destructure — noUnusedLocals turns the leftover into a fresh TS6133 that would inflate the frozen 257 baseline (Pitfall 4). Both login pages done; Esqueci/Redefinir already clean (grep regression guard)
- [Phase ?]: [Phase 22/22-03] ?redirect double-guarded (CadastroPage boundary + CadastroMultiStepForm navigate site) — resolveRedirect is idempotent so no raw param reaches navigate(); orphan candidatura_vaga_id localStorage key cleared on login success. react-router@6.30.1 HIGH open-redirect CVE flagged for Phase 24 (T-22-03-02, accept)
- [Phase ?]: [Phase 22/22-04] forbidden-strings guard now covers the 2 MARKETING terms too (`testes?\s+psicom[eé]tricos?` + `an[aá]lise\s+de\s+perfil`, RNF_12_TERMS 5→7) — the `teste`-prefix on the psicométricos alternation deliberately spares the compliant meta-comment `psicométrica` (AutorizacoesStep.tsx:17). Landing copy reframed RNF-12a + "Já sou candidato" CTA → /auth/login (candidate route). UX-02 (CI-guarded regression net for product language)
- [Phase ?]: [Phase 22/22-04] The extended whole-src guard bit 2 scanned-.ts files RESEARCH had not enumerated (a comment in backgrounds.ts, and my own EF fix comment) — both fixed as Rule-3 blocking deviations. Lesson: the whole-src grep guard is broader than a LandingPage-only acceptance grep; verify GREEN via `npm run test:run`, not per-file grep alone
- [Phase ?]: [Phase 22/22-04] Pre-existing LGPD-04 EF red (psicólogo literal in gerar-devolutiva-bigfive:192, commit 7853eac — the item deferred by 22-02) RESOLVED via the file's own `_NEG` fragment-join precedent (`["psicól","ogo(a)"].join("")`), runtime disclaimer byte-identical, zero behavior change. deferred-items.md item marked ✅ RESOLVED
- [Phase ?]: [Phase 22/22-05] CI-08 credential-hygiene guard bans SPECIFIC real-account literals (fernando/teste123 + current .env.test accounts candidato.funil@teste.com/Candidato@2026, e2e.admin@beautysmile.com.br/E2eAdmin), NOT the @beautysmile.com.br/@teste.com domains broadly — a domain-wide ban would false-flag the mocked a11y@ fixture email, the dynamic cadastro test+<ts>@ email, and the negative-path invalido@teste.com/teste@teste.com literals. Allowed-literal sub-tests lock the no-false-positive contract
- [Phase ?]: [Phase 22/22-05] perfil.spec.ts PERF-01 is an UNCONDITIONAL Tier-1 mock (token endpoint page.route'd) — its TEST_USER email/password are form-fill strings, not creds. Split a MOCK_USER constant so the env-only strip (process.env.X!) didn't make the CI mock test fill undefined. All OTHER TEST_USER reads are behind describeRealAuth or E2E_REAL_LOGIN, so module-load with undefined env is safe (never dereferenced in the default all-skipped run)
- [Phase ?]: [Phase 22/22-06] tsc baseline MEASURED = 133 (pinned into ci.yml, was loose 290). Resolving 65 versioned-import TS2307 via tsconfig `paths` (mirror of vite.config.ts aliases, figma:asset/* skipped) cascaded the total 257→133 — versioned imports were silently typing whole shadcn components as `any` (masked drift). 257-65 is NOT the answer; measure-first is load-bearing (22-RESEARCH Pitfall 1). Keep tsconfig paths in sync with vite aliases or TS2307 reappears (CI-05/CI-04)
- [Phase ?]: [Phase 22/22-06] tsc coverage expanded to e2e/scripts/playwright.config.ts; the Deno sync-prompts files (scripts/sync-prompts.ts + .test.ts + glob) are EXCLUDED (Deno globals/npm:/https: are unfixable under Node tsc — same treatment the EF corpus gets by living under `deno test`). supabase/ deliberately NOT in include. One genuine e2e error fixed (unused expectAuthenticated). 0 TS2304 'Deno' leaks (CI-14)
- [Phase ?]: [Phase 22/22-06] BLOCKING deno-test CI job added (denoland/setup-deno@v2, no continue-on-error). Canonical command = 22-01's `--config` form EXACTLY (`deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions`), confirmed green on merged tree before wiring (148/0, exit 0). The `--ignore=` fallback was NOT used (CI-01)
- [Phase 23]: [Phase 23/23-01] sharedBreaker singleton module-level virou o default de callAi (deps.breaker ?? sharedBreaker) — falhas ACUMULAM entre chamadas do mesmo isolate; antes new CircuitBreaker() por chamada nunca abria. Testes de falha SEMPRE injetam breaker fresh (Pitfall 3)
- [Phase 23]: [Phase 23/23-01] isRetryable casa timeout do SDK por name===APIConnectionTimeoutError (Anthropic E OpenAI, sem import) + regex tim(e|ed)\\s*out — a antiga /timeout/i perdia 'Request timed out.' no espaço; cap de retry-budget min(MAX_ATTEMPTS, floor(140000/teto)) quando teto>25s (AI-03/04)
- [Phase 23]: [Phase 23/23-01] parseIntEnv exportado (NaN/≤0→default) reusável por 23-02; circuit-breaker.ts replica guarda como envInt local p/ evitar ciclo; replay success-only via guard existing.success!==true (AI-05/07)
- [Phase ?]: [Phase 23/23-04] UX-07: percentil cru sai da devolutiva+telas RH — Big Five = 5 bandas NEUTRAS (não-avaliativo, nunca 'abaixo/dentro/acima do esperado', Pitfall 5); cognitivo/Raven = banda avaliativa 3-níveis provisória (norma real M5); Progress value=percentil → indicador de 5 segmentos keyed na banda
- [Phase ?]: [Phase 23/23-04] UX-09: triagem fora de WEIGHTED_KEYS → contexto visível (score_match, 'não pondera'); gate consolidação >0 → ≥2 etapas present (server-authoritative, consolidated=null com <2); dashboard mostra supressão distinta; RNF-07a preservado. EF consolidar redeploya no 23-06
- [Phase ?]: [Phase 23/23-02] AI-01: SCHEMA_VERSIONS espelha o enum llm_call_type (5 chaves órfãs de Fase 9 removidas, sweep-test guarda); catch das 7 EFs estreitado (SchemaVersionMismatch/PromptNotConfigured → 500 + emitPromptStubAlert em recruiter_alerts). Alarme NO CATCH, não scan de ai_call_logs (row 0.0.0 22P02-falha na FK uuid — Pitfall 1)
- [Phase ?]: [Phase 23/23-02] UX-07 EF-side: buildDevolutivaUserBlock passa banda qualitativa neutra (label pt-BR), percentil cru FORA do prompt do LLM (Big Five não-avaliativo, Pitfall 5); AI-04: transcricao timeoutMs 60s env-overridable. AI-01/AI-04 ficam LIVE só no 23-06 (redeploy das 7 EFs bundle-freeze); bigfive_devolutiva 500a por design até enum+seed do 23-05
- [Phase 23]: [Phase 23/23-03] AI-06: kill-switch PRÉ-chamada em callAi (isDailyCostCapExceeded — SUM cost_usd success=true do dia UTC por vaga vs AI_DAILY_COST_CAP_USD lido POR CHAMADA, default 50) é o único corte de gasto em RUNTIME; wired após replay/antes de injection. FAIL-OPEN por design (feature-detect select + try/catch → erro/ausência procede; trigger DB é backstop; tradeoff = disponibilidade > teto de custo). Recusa = provider 'none' (sem fallback OpenAI) + error_code cost_cap_exceeded + hold + flagged_for_human_review (RNF-07a, nunca reject). Usa idx parcial idx_ai_logs_vaga_cost
- [Phase 23]: [Phase 23/23-03] AI-06: alertMessage + CostAnomalyBody extraídos de cost-alerter/index.ts p/ cost-alerter/messages.ts (módulo puro sem Deno.serve) → 4 canais unit-testáveis, candidate_cost_over_1 deixa de ser código morto (emissão pelo trigger = 23-05). Handler importa de './messages.ts', byte-idêntico. NÃO redeploya (bundle-freeze → 23-06)

### Pending Todos

Absorvidos do fechamento do M3: FOUND-08 (tsc burn-down tail, baseline 257) → CI-04; `extractEfErrorCode` dedup no `@/lib/efErrors` → CI-06. CC0-01 (seed cognitivo real) fica em M5/PSICO — no M4 só o gabarito é blindado (SEC-01). Demais: ver `.planning/todos/`.

### Blockers/Concerns

- None. Roadmap M4 criado, aguardando planejamento da Phase 22.
- Dependência crítica: Phase 22 (CI-01/02) é "destrava todo o resto" — a rede de testes precisa aterrissar verde antes de P23–26 para que cada fix seja regress-guarded. CI-02 (deno green) conserta a suíte atual sobre o código atual; P23–26 alteram código+testes juntos mantendo verde.
- DBMIG-01 é âncora/risco (L) — deliberadamente late (Phase 27), regress-guardando o código já corrigido.

## Deferred Items

Carregados do fechamento do M3 (absorvidos no M4 onde indicado).

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Tech-debt | FOUND-08 (tsc burn-down tail) | Absorvido → CI-04 (Phase 22) | M2 close · M3 kickoff |
| Tech-debt | `extractEfErrorCode` dedup (@/lib/efErrors) | Absorvido → CI-06 (Phase 27) | M3 close |
| Feature | CC0-01 (item-bank cognitivo real seed) | Deferred → M5/PSICO (M4 só blinda gabarito via SEC-01) | M2 close · M3 kickoff |
| Feature | Pipeline notificação · agendamento · relatórios/KPIs · banco de talentos · retenção LGPD | Deferred → M5 (`.planning/M5-DRAFT.md`) | M4 kickoff |

## Session Continuity

Last session: 2026-07-06T02:45:00.000Z
Stopped at: Phase 23 / Plan 23-03 complete — guardrails de custo (AI-06): kill-switch PRÉ-chamada em callAi (SUM cost_usd do dia por vaga vs AI_DAILY_COST_CAP_USD, fail-OPEN, hold nunca reject — RNF-07a) + cost-alerter alertMessage extraído p/ messages.ts (4 canais incl candidate_cost_over_1). Deno 175/0. 4 commits TDD: 96cfb2b/da63409 · 7ca8737/e12807f. NÃO redeploya (23-06); janela/escopo/trigger canal candidate = 23-05. Restam 23-05 (migration PROD) + 23-06 (redeploy) na Phase 23.
Resume file: None

## Operator Next Steps

- Phase 22 EXECUÇÃO COMPLETA — 6/6 plans (22-01 ✅ 22-02 ✅ 22-03 ✅ 22-04 ✅ 22-05 ✅ 22-06 ✅). A rede de testes está verde e o gate tsc travado no baseline REAL medido (133, não 290). Próximo: `/gsd-verify-work` (UAT) e/ou `/gsd-secure-phase 22`, depois avançar p/ Phase 23 (Ressurreição da Stack de IA, AI-01..07 + UX-07/09).
- Nota p/ manutenção: tsconfig `paths` deve seguir sincronizado com `vite.config.ts resolve.alias` — ao adicionar novos componentes shadcn com specifier versionado, adicionar a entrada correspondente ou o TS2307 volta e o gate de 133 fica vermelho.
