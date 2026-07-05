# Sistema de Recrutamento Beauty Smile

## What This Is

ATS (Applicant Tracking System) web para a Beauty Smile, rede de clinicas odontologicas com tecnologia laser Fotona. Duas personas: Candidato (publico, mobile-first) e RH/Admin (interno, desktop-first). O candidato se cadastra, se candidata a vagas, faz avaliacoes comportamentais/cognitivas e acompanha seu status. O RH gerencia vagas, faz triagem via kanban de 8 etapas, compara scores e toma decisoes de aprovacao/rejeicao com revisao humana obrigatoria.

Brownfield rebuild: sistema iniciado em out/2025 via Figma Make, desenvolvido em modo firefighting ate nov/2025. Reaproveitando ~70% UI/forms/schemas, reconstruindo ~20% fundacao (auth, client, types, RLS, guards), deletando ~10% (duplicatas, artefatos).

## Core Value

Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao — e o RH consegue triar, avaliar e decidir sobre candidatos num unico sistema rastreavel com scores comparaveis.

## Current State

**v3.0 — M3 (Refinamento RH & Hardening) ✅ SHIPPED 2026-06-30.** Hardening (não expansão) do funil de IA do M2 para uso real em PROD. 4 fases (18–21), 16 plans, 12/12 requirements, audit OK (status tech_debt — itens conhecidos/rastreados p/ M4). Entregue: resiliência das EFs de IA (per-call timeout + retry/backoff, devolutiva 5-dim paralela, `<AsyncState>` nas 5 telas) + 2 bugs de funil (P18); code-splitting route+vendor (eager index 2.7MB→904KB) + invalidação de cache ≤60s (P19); RH edita/adiciona/remove/reordena o guia de entrevista por write-path seguro authenticate-THEN-authorize + merge-preserve anti-silent-discard (P20); fechamento dos HUMAN-UAT live deferidos do M2/M3 em PROD (P21). **A Phase 21 achou + corrigiu 3 defeitos live em PROD além do escopo planejado: (1) `gerar-devolutiva-bigfive` nunca persistia (gravava `candidatos.id` numa coluna FK→`auth.users` + RLS `auth.uid()` → 23503); (2) `gerar-guia-entrevista` retornava 500 em TODA geração (o timeout global de 25s do RESIL-01 era curto demais p/ a geração Sonnet ~40s → override per-call de 60s); (3) affordances de autosave sem região aria-live (silenciosas a leitores de tela).** EFs redeployadas; round-trips live verdes. Invariante preservada: IA recomenda, humano decide (RNF-07a). Gates: vitest 692/692, tsc 257, build 0, Deno EF 19/19.

**v2.0 — M2 (Funil RH + Avaliação por IA) ✅ SHIPPED 2026-06-26.** Com o M2, o ATS agora cobre o ciclo completo de contratação: o candidato se cadastra, se candidata, faz a avaliação assíncrona e é avaliado em entrevista; o RH tria com IA, compara candidatos, revisa scorecards e toma a decisão final auditável — IA sempre como *recomendação*, nunca decisão (RNF-07a). 11 fases (6–16), 63 plans, 42/42 requirements, milestone audit **PASSED**.

Entregue no M2: pipeline backbone de 6 etapas + RLS 100% (P6); config de vaga + tags por cargo (P7); inscrição LGPD-clean + knockouts objetivos auditáveis (P8); AI Prompt Library versionada + cost infra + cost-alerter (P9); triagem com IA `score_match` + comparativo + export PDF (P10); avaliação assíncrona — Work-Sample/SJT determinístico + Big Five anti-tampering com devolutiva D-lite + redação cultural com **revisão humana obrigatória** (P11–13); entrevistas com IA companion (guias STAR/PEI + análise de transcrição) + cognitivo CC0 opt-in marcado CONTEXTUAL (P14); decisão final com justificativa obrigatória (`por_usuario` NOT NULL) + explicação LGPD Art. 20 + bias audit EEOC 4/5 (P15); WCAG-AA + fechamento de tech-debt do M1 (P16).

**Codebase atual:** ~67.4k LoC (src). 584/584 vitest, build 0, axe-core Tier-A 15/15 (WCAG AA) em CI. Baseline tsc ~290 (husky pre-commit via `core.hooksPath=/dev/null`, deviation documentada).

**Tech-debt carregado p/ próximo milestone:** HARD-02 bundle code-splitting (661 KiB monolítico), PERF-01 cache-invalidation ≤60s, FOUND-08 tail estrutural do baseline tsc, CC0 cognitive item-bank real seed (pontuar_cognitivo tem empty-bank guard).

**Itens deferidos (não-bloqueantes):** 5 HUMAN-UAT round-trips ao vivo (precisam de dados/contas reais em PROD) + 4 WARNINGs advisory do audit (bigfive_devolutiva prompt não-seeded → fallback in-EF; dois `select('*')` allowlist-discipline sem leak ativo; consolidar-decisao-final mostra Big-Five/cognitivo só como contexto).

**Próximo milestone (M4):** a definir via `/gsd-new-milestone` (requirements frescos). Tech-debt carregado p/ M4: FOUND-08 (tsc burn-down tail, baseline 257), CC0-01 (item-bank cognitivo real seed), consolidar `extractEfErrorCode` do entrevistaService no helper compartilhado `@/lib/efErrors` (WARNING do audit M3). Candidatos de feature: MS Bookings auto-scheduling, bias audit automatizado, LLM-as-judge calibrado, norma local do cognitivo, carta de devolução por IA. Resíduo visual de UAT (AsyncState UX, cross-client ≤60s, teclado vidente, leitor de tela literal, axe Tier-B populado) documentado em `.planning/phases/21-production-readiness-uats-live/21-RUNBOOK.md` p/ validação humana.

<details>
<summary>Histórico — escopo & contexto do M2 (congelado no kickoff 2026-06-07)</summary>

**Goal:** Entregar o lado RH do ATS — funil de contratação de 6 etapas com avaliação assistida por IA (recomendação, nunca decisão automática), scorecards estruturados via BARS e trilha de auditoria LGPD-compliant — partindo do handoff do M1 (`etapa_atual='triagem'`).

**Target features:**
- **Triagem com IA + Comparativo** — análise individual automática por candidatura (`score_match` 0-100 + resumo CV), comparativo de até 10 candidatos lado-a-lado com ranking IA justificado + export PDF
- **Avaliação Assíncrona Estruturada (Etapa 3)** — bloco único ~60min (Work Sample/SJT por cargo + Big Five contextual + Redação cultural) com timer + autosave + back-lock; scorecards BARS por dimensão
- **Entrevista Online com IA Companion** — guias de entrevista STAR/PEI gerados por IA + análise de transcrição contra rubric BARS; dashboard do candidato pro gestor 24h antes
- **Decisão Final Auditável** — dashboard consolidado por candidato + justificativa obrigatória (NOT NULL) + endpoint LGPD Art. 20 + auditoria mensal de bias (regra 4/5 EEOC)
- **AI Prompt Library** — 7 prompts versionados (system + user + Zod schema), logging estruturado de custo/tokens + cost-alerter EF (híbrido git→DB versioning)
- **LGPD / Bias compliance** — form Etapa 1 LGPD-clean, `bias_audit_log` mensal, zero auto-rejeição por trait (RNF-07a)

**Key context:** Design congelado em `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` (v1.1) + 5 mini-PRDs + knowledge base RAG em `docs/conhecimento/`. Pipeline reorganizado de 8→6 etapas (Modelo B); Work Sample/SJT é o núcleo eliminatório; Big Five degradado a contextual; Raven + ICAR60 descartados (prova de raciocínio CC0 os substitui); cultura vira dimensão da redação. Numeração de fases continua do M1 → M2 começa na **Phase 6**.

</details>

## Current Milestone: v4.0 M4 — Correção & Blindagem do Funil

**Goal:** Endurecer e corrigir o funil ponta-a-ponta (hardening, **não** expansão) — fechar todo vazamento de PII/gabarito e IDOR, ressuscitar a stack de IA silenciosamente morta, eliminar o drift M1→M2 (enums mortos, colunas fantasma, contratos quebrados, scoring manipulável), fazer as migrations reconstruírem o banco do zero, e blindar tudo com a rede de testes/CI que originou todos os defeitos live.

**Target features (5 categorias-fase, 50 achados aprovados ~100pt · ~47 requirements efetivos após 3 pares deduplicados):**
- **M4-A · 🔒 Segurança / PII / LGPD** (12) — RLS row-level nunca é segredo de coluna → RPC SECURITY DEFINER / column REVOKE; toda EF privilegiada autentica-**E**-autoriza (fecha IDOR/PII em devolutiva-bigfive, análise/comparativo, redação, cognitivo; webhook n8n sem auth; backup PII fora de RLS; console.log RH em PROD)
- **M4-B · 🤖 Confiabilidade & Versionamento de IA** (7) — prompt library ativa nos 7 call_types (não stub de 1 linha), circuit breaker real, retry de timeout que casa, guardrails de custo com escopo/alarme corretos, replay de idempotência regenerável, guarda de NaN em env
- **M4-C · 🔀 Correção do Funil (drift M1→M2)** (12) — `pontuar_sjt` anti-tampering, RH não rejeita sem trilha (RNF-07a), Kanban/UpdateStatus/Editar-Vaga sobre enums+colunas que existem, contrato cargoTemplates↔container, SJT filtrado por cargo/vaga, cognitivo alcançável, `registrar_decisao` sem destruir histórico, reinscrição pós-soft-delete, cards refletem conclusão
- **M4-D · 🗄️ Integridade de Migrations/DB** (2) — 49 migrations reconstroem o banco do zero + ledger de versões converge (destrava pgTAP e reprodutibilidade); semântica de `auto_rejeitado` corrigida
- **M4-E · 🧪 Rede de Testes & Higiene de CI** (17) — corpus Deno das EFs (~126 testes) roda em CI e não apodrece; testes da EF submit-candidatura (único auto-reject sancionado); gates tsc/bundle/lint wired; supply-chain (wildcards, vulns dev-tooling); credenciais fora do repo; contract tests reais; imports versionados no tsconfig
- **+ Overlay de produto (12 quick-wins)** — o *lado de experiência* dos achados já escopados, feito no mesmo file-touch: copy honesta ("acompanhe no painel" vs "avisaremos por e-mail"), roteamento+alcançabilidade do cognitivo, landing sem "teste psicométrico", hub `candidatura.id`, login sem `!isValid`, percentil→descritor qualitativo, affordances mortas

**Key context:**
- **Filosofia:** hardening/correção, não features. Feature-work sai para **M5 (Operação & Comunicação)** — draft em `.planning/M5-DRAFT.md` (pipeline de notificação, agendamento, relatórios/KPIs, banco de talentos, LGPD retenção, substância psicométrica).
- **Fontes aprovadas:** `.planning/M4-SYSTEM-AUDIT.md` (56 achados técnicos adversariais), `.planning/M4-PRODUCT-EVALUATION.md` (74 recs de 6 personas), `.planning/M4-SCOPE-PROPOSAL.md` (recorte APROVADO 2026-07-05), `.planning/M4-CANDIDATE-JOURNEY.md` (jornada tela-a-tela).
- **Diferidos:** A14/A37 (gestão de usuários RH + perfil RH reais) → M5 (no M4 são gateados/ocultados); A45/A46 (pgTAP + e2e real completos) → backlog stretch; A53/A55 (UX low) → backlog.
- **Sequência recomendada:** M4-B → M4-A → M4-C (+ Onda 2 de produto no mesmo touch) → M4-D/E em paralelo, com os 12 quick-wins como varredura imediata.
- **Numeração de fases:** continua a partir da **Phase 22** (M3 terminou na Phase 21).

## Last Milestone: v3.0 Refinamento RH & Hardening ✅ SHIPPED 2026-06-30

**Goal (atingido):** Endurecer o funil de IA recém-construído (M2) para uso real em produção — resiliência das Edge Functions, performance e fechamento de UATs live — e refinar a experiência do RH, **sem expandir superfície de features**. Todos os 12 requirements atingidos; a Phase 21 ainda achou+corrigiu 3 defeitos live em PROD (ver `## Current State`).

**Target features:**
- **Resiliência das EFs de IA** — timeouts/retry/backoff nas EFs lentas + correção dos 4 achados live: (1) latência 38–102s + overload transiente da Anthropic, (2) `devolutiva-bigfive` estoura timeout com 5 chamadas de IA, (3) `consolidar-decisao-final` edge case (`work_sample_sjt='na'` + caso aberto pendente), (4) bug de UI perguntas `status='active'` vs filtro `'ativo'` trava a tela de avaliação.
- **Performance** — HARD-02 code-splitting do bundle 661 KiB monolítico + PERF-01 cache-invalidation ≤60s no perfil do candidato.
- **Refino RH (SEED-001 / ENTREV-GUIA-EDIT-01)** — RH editar/adicionar/remover/reordenar perguntas no guia de entrevista, via **novo write-path seguro** em `entrevista_guias` (authenticate-THEN-authorize; role RH de `usuarios_rh` + posse via `vaga.created_by`; **sem** policy RH UPDATE ampla; RNF-07a preservada — guia nunca escreve `candidaturas`).
- **Production-readiness** — fechar os HUMAN-UAT live deferidos do M2 (ex: Phase 11 redação open-case) com dados/contas reais em PROD.

**Fora do escopo (deferido p/ M4):** FOUND-08 (tsc burn-down tail), CC0 (item-bank cognitivo real seed), MS Bookings auto-scheduling, bias audit automatizado, LLM-as-judge calibrado, norma local do cognitivo, carta de devolução por IA.

**Numeração de fases:** continua a partir da **Phase 18** (M2 terminou na Phase 16; Phase 17 foi mini-fase standalone pós-M2).

## Requirements

### Validated

<!-- Existente e funcional no codebase atual (pre-rebuild ou validated em fases concluidas) -->

- ✓ **M4 — Phase 22: Rede de Testes, Destravamento & Varredura de Honestidade** — SHIPPED 2026-07-05 (6 plans / 2 waves, sequential no-worktree). A fundação de regressão do M4: corpus Deno das EFs agora roda **verde em CI** (job `deno-test` bloqueante, `denoland/setup-deno@v2`, 148/0) e o typecheck **destravou** — `paths` no tsconfig resolveram os 65 TS2307 versionados, cascateando o baseline real de 257→**133** (pinado no `ci.yml`, red-on-growth; substitui o gate frouxo 290 — **resolve FOUND-08** via CI-04); cobertura tsc estendida a e2e/scripts/playwright com os arquivos Deno excluídos. Supply-chain endurecida: 8 wildcards `"*"` pinados no lockfile, vitest/@vitest/ui (RCE) + happy-dom (code-exec) bumpados, `motion`+`@supabase/auth-helpers-react` removidos. Honestidade candidate-facing: landing sem linguagem psicométrica + CTA "Já sou candidato" (RNF-12a), botões de login habilitados sem `!isValid` (mata o hack `blur()`), `resolveRedirect` anti-open-redirect extraído p/ util compartilhado + **endurecido contra bypass `/\` e control-chars** (code-review CR-01), `?redirect` propagado + limpeza de `candidatura_vaga_id` órfão (WR-01 read-then-clear). Credenciais de teste fora do repo (`.env.test.example` keys-only + guard). Gates: vitest **727/727**, deno **148/0**, tsc **133**, build 0. Verifier 12/12 reqs, status **human_needed** (2 checks live diferidos: run real do Actions + smoke WR-01 — `22-HUMAN-UAT.md`). Code review 1 crit + 3 warn (CR-01+WR-01 corrigidos; WR-02/03 diferidos). Requirements: CI-01/02/04/05/08/09/11/12/14, UX-02/04/05 ✓.
- ✓ **M3 — Refinamento RH & Hardening (Fases 18–21)** — v3.0 SHIPPED 2026-06-30, audit 12/12 reqs, integration OK (tech_debt aceito). **RESIL-01/02/03** (callAi per-call timeout + maxRetries:0 + retry/backoff; devolutiva-bigfive 5-dim `Promise.allSettled` + degrade; `<AsyncState>` 5-state contract nas 5 telas de IA) + **FIX-01/02** (consolidar `work_sample_sjt='na'`+caso pendente; perguntas `status='active'`) — Phase 18. **PERF-03/04** (code-split route+vendor, RoleGuard fora do lazy, jsPDF dynamic-import, eager index 2.7MB→904KB; invalidação alvo `decisaoKeys.consolidacao` + `refetchOnWindowFocus` ≤60s) — Phase 19. **ENTREV-06/07/08** (RH edita/adiciona/remove/reordena guia; `save_entrevista_guia_edits` RPC authenticate-THEN-authorize role-from-`usuarios_rh`+posse, sem policy RH UPDATE ampla; merge-preserve `origem:'manual'`; RNF-07a) — Phase 20. **PROD-01/02** (HUMAN-UAT live deferidos do M2/M3 fechados em PROD; re-deferrals literais — leitor de tela, overload 429/529 — justificados) — Phase 21. **3 defeitos live achados+corrigidos na P21:** devolutiva FK auth-uid (6501f70), gerar-guia timeout regression (0e85ee6), autosave aria-live (ce2d683). Invariante: IA recomenda, humano decide (RNF-07a). Requirements: RESIL-01..03, FIX-01/02, PERF-03/04, ENTREV-06/07/08, PROD-01/02 ✓. Detalhe em `milestones/v3.0-ROADMAP.md` + `milestones/v3.0-REQUIREMENTS.md` + `milestones/v3.0-MILESTONE-AUDIT.md`.
- ✓ **M2 — Funil RH + Avaliação por IA (Fases 6–15 core)** — v2.0 SHIPPED 2026-06-26, audit PASSED 42/42. Pipeline de 6 etapas auditável + RLS 100% + guardrail zero-auto-rejeição (P6: FUNIL-01..04, LGPD-02); config de vaga por cargo + pesos sliders + tag wizard (P7: VAGACFG-01..03); AI Prompt Library 7-prompts híbrido git→DB + logging custo/tokens + caching + cost-alerter + lint LGPD-04 (P9: IA-01..04, LGPD-04); triagem IA `score_match` + comparativo até 10 + export PDF (P10: TRIAGEM-01..04); Work-Sample/SJT determinístico 4/2/1/0 + open-case BARS (P11: AVAL-01/02/03/09); Big Five IPIP-NEO-120 PT-BR anti-tampering server-side + devolutiva D-lite híbrida (P12: AVAL-04, AVAL-08); redação cultural 4-dim BARS 3-cores + revisão humana obrigatória (P13: AVAL-05/06/07); entrevistas com IA companion STAR/PEI + análise de transcrição + cognitivo CC0 opt-in CONTEXTUAL (P14: ENTREV-01..05); decisão final consolidada + justificativa NOT NULL + explicação LGPD Art. 20 + bias audit EEOC 4/5 (P15: DECISAO-01..04, LGPD-03). Invariante: IA é recomendação, humano decide (RNF-07a). Requirements: FUNIL-01..04, VAGACFG-01..03, IA-01..04, TRIAGEM-01..04, AVAL-01..09, ENTREV-01..05, DECISAO-01..04, LGPD-02/03/04 ✓ (AVAL-03 audit-BLOCKER resolvido pós-audit — EF `avaliar-redacao` redeploy v6, commit 39a164e). Detalhe completo em `milestones/v2.0-ROADMAP.md` + `milestones/v2.0-REQUIREMENTS.md`.
- ✓ **Compliance & A11y Hardening** — v2.0 / Phase 16 completa (FINAL phase do milestone M2): todo o lado RH + candidato do M2 passa WCAG AA. **LGPD-05**: axe-core Tier-A GREEN **15/15** (zero serious/critical) sobre as telas principais M2, enforced em CI (`e2e/a11y.spec.ts` loop incondicional; R5/C5 Tier-B `E2E_REAL_LOGIN` por design — axe sub-testa telas live pesadas). Fixes: hand-rolled tabs/radiogroups → Radix vendored (Tabs/RadioGroup/Tooltip), contrast bumps (amber-on-translucent + low-alpha eyebrows AA), slider `aria-valuetext`, tooltip triggers keyboard-focusable, RHSidebar icon-button accessible-name. Tech-debt M1 triado: FX-14 console.* removido do RH-path (grep guard GREEN 4/4), FX-15 dead biasMath runtime fns removidas com type exports preservados, **RHSidebar WR-01 bug corrigido** (`setIsMobileOpen`→`setInternalMobileOpen`, mobile menu voltou a abrir) → tsc **291→290**, ci.yml gate apertado p/ 290. Deferidos + documentados: HARD-02 bundle code-split, PERF-01 cache, FOUND-08 structural tsc tail (enum renames provaram load-bearing → revertidos + map-realignment diferido). LoginRHPage race+gate fix commitado (poll 100ms→3s cold-DB usuarios_rh + gate {rh,administrador}); NO migration (auth-hook RLS chain já PROD-verified). Validated 2026-06-26 via 16-VERIFICATION human_needed 10/10 must-haves (4 itens live deferidos em 16-HUMAN-UAT.md: RH cold-start login round-trip, Tier-B R5/C5 axe sweep, keyboard roving-focus AB-5/6, BigFive aria-live AB-8) + 16-REVIEW 0 Critical/2 Warning (WR-01 fixed, WR-02 Deno-runner deferido). vitest 584/584, build 0, tsc 290. Requirements: LGPD-05 ✓
- ✓ **Inscrição & Knock-out (Etapa 1)** — v2.0 / Phase 8 completa: form `/cadastro` LGPD-clean (CPF + gênero fora da coleta, dedup email-only D-03, Zod `.strict()` fail-closed D-04), qualificação Etapa-1 por cargo + knockouts objetivos seeded (D-14), publish gate ≤10/≤1-aberta cliente **e servidor** (D-09). DB-core ao vivo em PROD (migration `20260608000001` via MCP): colunas novas + sweep de knockout server-authoritative dentro de `submit_candidatura_atomic` (auto-rejeição síncrona + 1 linha de auditoria, **nenhum trait/score/idade** participa — RNF-07a), `publish_vaga` deriva `qualificacao_etapa1`. SMOKE-1..4 PASS (2 bugs pegos pelos smokes e corrigidos: survivor double-write + enum `publish_vaga`). Resultado candidato: mensagem neutra D-15 inline + `feedback_rejeicao` em `/perfil` + dashboard (critério nunca exposto). Validated 2026-06-08 via 08-VERIFICATION 4/4 must-haves (human_needed p/ EF redeploy + checks visuais/E2E, rastreados em 08-HUMAN-UAT.md) + **08-SECURITY 16/16 threats closed, threats_open:0** (o gate de segurança pegou e corrigiu um vazamento LGPD HIGH: `listCandidaturas` `select('*')` transmitia `opcao_knockout_id`/`motivo_rejeicao` ao candidato — agora allowlist fail-closed + regression guard). vitest 419/419, lint 293 (↓ de 301), build 0. Requirements: INSCR-01, INSCR-02, INSCR-03, INSCR-04, LGPD-01 ✓
- ✓ **Perfil + Hardening MVP end-to-end** — v1.0 / Phase 5 completa: `/candidato/perfil` com dados reais (candidaturas via live DB, sem mock), sistema de tokens semânticos reparado na fonte (HSL channel triplets), ErrorBoundary no root do App, **primeira pipeline CI (unit + e2e + lighthouse) GREEN em run real** (GitHub Actions 27076233734), a11y axe-core **zero violações WCAG A/AA** nas 5 rotas públicas, Lighthouse mobile Accessibility 0.96–1.00, recuperação de senha migrada PKCE→email-OTP (fecha a limitação cross-browser do AUTH-04), e 2 migrations de data-hygiene (vaga soft-deleted não fica `status='ativa'` + reconcile `bloco_valido_check`). Validated 2026-06-06 via 05-VERIFICATION 8/8 + HUMAN-UAT passed + audit v1.0 PASSED. Requirements: PERF-01, PERF-02, HARD-01..HARD-06 ✓ (HARD-02 Performance warn-baseline aceito; PERF-01 com tech-debt de cache-invalidation ≤60s)
- ✓ **Auth hydration + verification backfill** — Phases 4.1 + 4.2 completas: `hydrateFromSession` + `waitForCandidatoHydrated` fecham o gap async entre `onAuthStateChange` e navegação em todos os 3 login paths; RoleGuard redirect-loop guard; smoke-runtime test gate estabelecido; 12 FOUND-* movidos de partial → satisfied. Validated 2026-04-27.
- ✓ **Vagas + Candidatura end-to-end** — Phase 4 completa: 8 standard plans + 3 carryovers (folded em 04-08-SUMMARY) + 1 gap-closure (04-09 persona shell + GlassButton inline-flex). Inclui: vagas slug trigger + curriculos bucket privado 5MB + submit_candidatura RPC atomic (status='aguardando_resposta', etapa='triagem') + UNIQUE partial idx para CAND-04 + Edge Function submit-candidatura (two-client D-23) + cvUploadService (D-10 path schema {auth.uid()}/{uuid}.pdf) + dynamic Zod factory para perguntas + VagaDetalhePage slug routing + FormularioCandidaturaPage rewrite + persona shell auth-guarded em /vagas e /vagas/:identifier (D-27 extension com link 'Área do candidato'). Validated 2026-04-26 via real-world UAT 6/6 PASS (candidato d8ef9db1 + vaga 53f75c81 + 1 candidatura + 3 respostas + 1 storage object + duplicate guard via useHasApplied + slug-roundtrip + Pitfall 7 redaction) + phase-level UAT 9/10 PASS (1 issue closed by 04-09; 2 side-findings deferred a Phase 5 backlog) + verifier passed 5/5 success criteria + 7/7 requirements SATISFIED + code review 3 iterations (10 WRs resolved + 2 deferred). Requirements: VAGA-01, VAGA-02, VAGA-03, CAND-01, CAND-02, CAND-03, CAND-04 ✓
- ✓ **Login + Recuperação de senha end-to-end** — Phase 3 completa: AuthError taxonomy + mapSupabaseError + 4 Zod schemas + extractRole (jwt-decode, fecha Bug 1/D-13) + rememberMeStorage adapter (D-19) + authService (signIn order-lock setRememberMeMode antes de signInWithPassword) + passwordService (D-09 anti-enum) + 3 hooks (useRateLimitCooldown in-memory T-03-06, useRecoverySession 3-path state machine, useAuthFlowVariant) + 4 page rewrites (LoginCandidato/LoginRH com bounded polling 5×20ms fechando Bug 2-3/D-14, EsqueciSenha 2-state, RedefinirSenha 3-state) + cadastro compat shim Option A. Validated 2026-04-25 via Playwright 11 cenários + Vitest 96/96 auth + UAT 6/6 PASS + verifier passed 3/3 success criteria. Requirements: AUTH-01, AUTH-02, AUTH-03 ✓ + AUTH-04 ✓ (com limitação documentada PKCE cross-browser deferida a Phase 4 — OTP code flow é a mitigação preferida)
- ✓ **Cadastro candidato end-to-end em produção** — Phase 2 completa: 4-step form + draft persistence (sans senha via sessionStorage) + LGPD mandatory guard + structured error_code routing + auto-login + redirect `/candidato/perfil`. Validated 2026-04-24 via Chrome UAT + Playwright 13/13 passing. Requirements: CAD-01, CAD-02, CAD-03, CAD-04, CAD-05, CAD-06, CAD-07 ✓
- ✓ **Foundation saneada** — Phase 1 completa: service_role removido do bundle, auth unificado, RoleGuard, Custom Access Token Hook, types pipeline, migrations. Requirements: FOUND-01..FOUND-12 ✓ (Bug 1/D-13 + Bug 2-3/D-14 fechados em Phase 3; Bug 6/D-15 RPC CPF carryover ainda diferido a Phase 4)
- ✓ Multi-step form de cadastro (4 steps: Dados, Endereco, Disponibilidade, Autorizacoes LGPD) — existing (`CadastroMultiStepForm`), now end-to-end wired by Phase 2
- ✓ Validacao CPF (digito verificador + formato) com 35 testes — existing (`cpfValidator.ts`)
- ✓ Duplicate check de CPF/email com debounce + abort — existing (`useDuplicateCheck`)
- ✓ Auto-preenchimento de endereco via ViaCEP — existing (`useViaCEP`)
- ✓ Design system Beauty Smile (Tailwind + shadcn/ui + 29 Radix primitives + glass UI) — existing
- ✓ TanStack Query hooks para vagas e candidaturas (query keys hierarquicas) — existing
- ✓ Schemas Zod por step + agregado — existing
- ✓ Layouts RH (Sidebar + TopBar + main) — existing
- ✓ Paginas visuais de todas as areas (34 paginas) — existing (migrar para features/)
- ✓ Playwright config + estrutura E2E (4 specs) — existing
- ✓ CRUD vagas RH (apos round de fix) — existing
- ✓ Dashboard RH com metricas 100% DB (apos correcao) — existing
- ✓ RLS: 103 policies em 34 tabelas — existing

### Active

<!-- M1 (Fases 1-5) shipped v1.0 2026-06-06 — 38 requirements em Validated. -->
<!-- M2 (Fases 6-16) shipped v2.0 2026-06-26 — 42 requirements em Validated (ver Validated acima + summary do M2 + archive milestones/v2.0-REQUIREMENTS.md). -->

**M1 (v1.0) + M2 (v2.0) + M3 (v3.0) ✅ SHIPPED** — 92 reqs todos em Validated.

**M4 (v4.0) — Correção & Blindagem do Funil 🟢 ABERTO 2026-07-05** via `/gsd-new-milestone`. Requirements frescos em `.planning/REQUIREMENTS.md` (categorias SEC · AI · FUNIL · DBMIG · CI · UX), derivados do recorte aprovado `.planning/M4-SCOPE-PROPOSAL.md`. Hardening/correção, não expansão. Absorve o tech-debt carregado do M3: FOUND-08 (tsc burn-down tail, baseline 257 → CI-04), CC0-01 (item-bank cognitivo real seed — *fica em M5/PSICO*, no M4 só o gabarito é blindado SEC), `extractEfErrorCode` dedup no `@/lib/efErrors` (A39 → CI). Feature-work (MS Bookings, banco de talentos, relatórios/KPIs, pipeline de notificação, norma local do cognitivo, carta de devolução) → **M5 (Operação & Comunicação)**, draft em `.planning/M5-DRAFT.md`.

### Out of Scope

- Landing page dedicada por vaga (VagaLPPage) — removida do escopo por decisao do usuario; pagina simples `/vagas/:slug` atende
- Raven Progressive Matrices — SATEPSI-desfavoravel desde 2023 + licenca Pearson inviavel; substituido por ICAR
- Automacoes n8n no MVP (Fases 0-8) — dependencia externa fragil; Fase 10
- App mobile nativo — SPA responsivo mobile-first atende
- Multi-tenant — single-tenant Beauty Smile, sem `tenant_id`
- Sentry no MVP — Vercel Runtime Logs nativos atendem; Sentry so em V3+ se volume justificar
- Psicologo consultor externo — equipe interna + IA; linguagem "avaliacao comportamental" (nao "teste psicologico")
- IA generativa para triagem automatica de CV — custo e risco de vies
- Chatbot com candidato — WhatsApp manual atende

## Context

**Estado atual (v1.0 — M1 MVP Candidato SHIPPED 2026-06-06):**
- Todas as 7 fases (1, 2, 3, 4, 4.1, 4.2, 5) completas e verificadas; milestone audit v1.0 PASSED (38/38 requirements, integração sound, 0 blockers).
- **CI totalmente verde** (GitHub Actions run 27076233734 em `backup/local-state-2026-04`): unit + e2e + lighthouse. Primeira pipeline CI do projeto.
- Fluxo candidato completo em produção: cadastro → login → recuperação de senha (OTP) → browse vagas → candidatura com CV upload → perfil com dados reais. Mobile-first, a11y zero-violações, ErrorBoundary no root.
- Codebase: ~47.9k LoC (src). Baseline tsc congelado em 292 erros (commits via `core.hooksPath=/dev/null`, deviation documentada — burn-down planejado pós-M1).
- Tech-debt rastreado para M2: PERF-01 cache-invalidation (≤60s window), HARD-02 Lighthouse Performance (0.62–0.68 warn-baseline, bundle 661 KiB monolítico), FOUND-08 husky gate bypass, console.log debug RH-path.
- DevNavigationMenu gateado por `import.meta.env.DEV`.

**Próximo:** M2 (Funil RH + Avaliação por IA) — design congelado (PRD-MASTER v1.1 + 5 mini-PRDs); iniciar via `/gsd-new-milestone`.

**Estado historico (pre-Phase 1):**
- 43 arquivos WIP commitados em `backup/local-state-2026-04`
- Arquivos orfaos deletados (`.tmp`, `.backup`, shell scripts)
- 9/21 E2E de login falhando (rotas protegidas nao redirecionam, logout nao funciona) — resolved pela Phase 1
- service_role exposto no client-side bundle — resolved pela Phase 1 (FOUND-01)

**Documentacao existente:**
- PRD-Mestre: `docs/prds/PRD-MASTER-sistema-recrutamento.md` (1187 linhas, v1.2)
- Plano faseado aprovado: `~/.claude/plans/cached-painting-stearns.md` (12 fases)
- Analise brownfield: `.planning/codebase/` (7 docs, 2753 linhas)
- 5 mini-PRDs dos testes psicometricos em `docs/prds/`
- Banco de 25 itens Fit Cultural ja gerado

**Supabase:** Pro ja contratado. Edge Functions (Deno) para operacoes privilegiadas.
**Vercel:** Pro ja contratado. Frontend hosting + preview URLs.

## Constraints

- **Branch base**: `backup/local-state-2026-04` (main desatualizado 5 meses, so tem export Figma Make inicial)
- **Seguranca**: service_role NUNCA no client; RLS em 100% das tabelas; LGPD compliance
- **Stack**: React 18 + Vite + TypeScript strict + Supabase + shadcn/ui + TanStack Query + Zustand + RHF + Zod
- **Pipeline**: `database.types.ts` gerado automaticamente; `tsc --noEmit` passa sempre
- **Idioma**: dominio em pt-BR (tabelas, enums, mensagens), codigo tecnico em en
- **Legal**: linguagem de produto usa "avaliacao comportamental/cognitiva" (nunca "teste psicologico") — RNF-12a
- **Decisao humana**: sistema NUNCA rejeita candidato automaticamente por score (RNF-07a)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Auth unificado em 1 store com `role` | 2 stores paralelos causavam bypass de rotas protegidas (E2E provou) | ✓ Shipped (Phase 1) |
| service_role → Edge Functions | service_role exposto no browser e risco critico de seguranca | ✓ Shipped (Phase 1 + 2) |
| Structured Edge Function error contract `{ ok, error_code, message, field? }` | Forms precisam rotear erros de servidor para o campo correto + step correto | ✓ Shipped (Phase 2) |
| Sonner single-instance via Vite `resolve.dedupe` | Aliases versionados em vite.config.ts criam pre-bundles separados; module-level singletons (ToastState) silenciosamente quebram | ✓ Shipped (Phase 2 UAT fix) |
| Schema-qualify extensions under hardened `SET search_path = ''` RPCs | Hosted Supabase instala pgcrypto em `extensions`, não `public` — local CLI não reproduz o bug | ✓ Shipped (Phase 2 UAT carryover fix) |
| extractRole decodifica JWT payload (não SDK-populated user record) | Bug 1/D-13: SDK `session.user.app_metadata` não inclui custom claims do JWT hook; só o token decodificado tem `role` | ✓ Shipped (Phase 3) |
| LoginRH bounded polling 5×20ms (≤100ms) sobre `useAuthStore.getState().role` | Bug 2-3/D-14: `setTimeout(0)` é macrotask race sob React 18 Concurrent Mode; bounded polling com early-exit é determinístico | ✓ Shipped (Phase 3) |
| `setRememberMeMode` ANTES de `signInWithPassword` (order-lock) | SDK escreve a sessão no storage corrente; flipping o mode flag depois deixa a sessão no store errado | ✓ Shipped (Phase 3) |
| `passwordService.requestPasswordReset` engole tudo exceto RATE_LIMITED | D-09 anti-enumeration: revelar "email não existe" permite enumeração de contas; RATE_LIMITED é a única classe que precisa surfacing (cooldown UI) | ✓ Shipped (Phase 3) |
| `extractRetryAfterSeconds` clamp [1, 3600] (não silent fallback 60) | ISSUE-007: server pode dizer >3600s; UI não pode mostrar countdown maior que 1h sem desync — clamp truthful em ambos extremos | ✓ Shipped (Phase 3) |
| Pitfall 7 redaction enforced em 3 camadas | Service-level redacted logs + Vitest console-spy + node:fs grep guard (`pitfall7.grep.test.ts`) — defense-in-depth pra evitar leak de senha/token em qualquer fluxo de log | ✓ Shipped (Phase 3) |
| Raven descartado, ICAR substitui | SATEPSI-desfavoravel desde 2023 + licenca Pearson inviavel | ✓ Good |
| DISC = contexto, nao eliminatorio | Informa gestor na entrevista; nao filtra | ✓ Good |
| Pipeline 8 etapas com testes_async paralelo | Reduz dropout candidato; gestor entra na entrevista com perfil completo | ✓ Good |
| VagaLPPage removida do escopo | Pagina simples `/vagas/:slug` atende; complexidade WYSIWYG desnecessaria | ✓ Good |
| n8n fora do MVP | Dependencia externa fragil (conta pessoal n8n.cloud); isolavel | ✓ Good |
| Branch base = backup branch | main desatualizado 5 meses; todo trabalho reaproveitavel no backup | ✓ Good |
| M1 = Fases 1-5 (MVP Candidato) | Entrega fluxo candidato completo e testavel antes de tocar area RH | ✓ Shipped (v1.0, 2026-06-06) |
| Recovery PKCE → email-OTP (`verifyOtp({type:'recovery'})`) | PKCE deeplink falhava silenciosamente cross-browser (`code_verifier` vive no localStorage do browser originador); OTP de 6 dígitos é flowType-independente e cross-device | ✓ Shipped (Phase 5) |
| Primeira CI pipeline (unit+e2e+lighthouse) como gate de HARD-01 | "E2E 100%" exige um green check real, não um runbook local; a primeira run live surfou gaps genuínos (GAP-05-CI-1..5) fechados no 05-07 | ✓ Shipped (Phase 5) |
| Lighthouse Performance = warn-baseline (não error gate) | D-06 measure-first: Performance medida 0.62–0.68 (bundle 661 KiB monolítico); remédio real (code-splitting) é trabalho dedicado pós-M1; Accessibility fica como error-gate >= 0.8 | ✓ Shipped (Phase 5) — revisitar no M2 |
| a11y contrast fix na fonte (`BackgroundImage` solid dark layer) | axe não computa contraste contra background-image e cai pro body claro (falso white-on-light); 1 fix no primitivo compartilhado cascateia pra todas as rotas glass | ✓ Shipped (Phase 5) |
| `scores_candidato` como sink genérico com enum `tipo_score` forward-declarado | Forward-declara sjt/big_five/redacao/entrevista/cognitivo/decisao p/ P12-15 sem `ALTER TYPE` recorrente | ✓ Shipped (Phase 11) |
| Answer-keys em `*_metadata`/`pergunta_opcao_sjt` com candidato-DENY RLS; opções via RPC SECURITY DEFINER | RLS é row-level, não column-level — `select('*')` vazaria gabarito; candidato lê id+texto-only randomizado | ✓ Shipped (Phases 8/11) |
| Versionamento de prompts híbrido git→DB (git = verdade, DB = runtime) com UPSERT idempotente por content-hash | Permite canary/rollback runtime + audit em git sem filename-suffix `-vN` | ✓ Shipped (Phase 9) |
| EFs privilegiadas: two-client + autorizar DEPOIS de autenticar | EF que lê via service_role bypassa RLS; só getUser() não basta — checar role + posse senão IDOR/PII | ✓ Shipped (pego como CRITICAL na Phase 10) |
| Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` | Bypassa o 42601 (prepared-statement) em corpos PL/pgSQL `$$`; grava version row sozinho; no-BEGIN/COMMIT-wrapper authoring | ✓ Shipped (Phases 6–15) |
| Imports `npm:` ESTÁTICOS em toda EF de IA (nunca `await import([...].join(""))`) | O bundler de deploy do Supabase não resolve o pacote concatenado → ERR_MODULE_NOT_FOUND em runtime (AVAL-03 BLOCKER) | ✓ Shipped (fix v6 pós-audit, commit 39a164e) |
| Revisão humana SEMPRE obrigatória pós-IA na redação (todo essay → `pendente_humano`); zero auto-rejeição por score | RNF-07a / LGPD-02 — IA é recomendação; `decisao_final` sempre `por_usuario IS NOT NULL` (DB constraint) | ✓ Shipped (Phases 6/13/15) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-05 — **Phase 22 (Rede de Testes, Destravamento & Varredura de Honestidade) SHIPPED** — fundação de regressão do M4 (Deno verde em CI, tsc destravado 257→133 pinado, supply-chain, honestidade candidate-facing); FOUND-08 resolvido; verifier human_needed (2 live checks diferidos). Próximo: Phase 23 (Ressurreição da Stack de IA). — milestone **v4.0 (M4 — Correção & Blindagem do Funil) ABERTO** via `/gsd-new-milestone` (escopo: hardening/correção do funil, **não** expansão — 50 achados aprovados das 5 categorias A–E + overlay de produto; ver `## Current Milestone` + `.planning/REQUIREMENTS.md` + `.planning/M4-SCOPE-PROPOSAL.md`). Fases continuam a partir da Phase 22. Feature-work diferido p/ M5 (`.planning/M5-DRAFT.md`). — histórico: milestone **v3.0 (M3 — Refinamento RH & Hardening) SHIPPED** (4 fases 18–21, 16 plans, 12/12 reqs, audit OK/tech_debt; Phase 21 achou+corrigiu 3 defeitos live em PROD). Roadmap+requirements+audit arquivados em `milestones/v3.0-*`. Próximo: M4 via `/gsd-new-milestone`. — histórico: milestone **v3.0** iniciado 2026-06-29 via `/gsd-new-milestone` (escopo: hardening/consolidação, **não** expansão). Ver `## Current Milestone` + `.planning/REQUIREMENTS.md` (definido neste ciclo). Fases continuam a partir da Phase 18. SEED-001 incluído; FOUND-08 + CC0 + features novas deferidas p/ M4. Histórico v2.0: SHIPPED 2026-06-26 — 11 fases (6–16), 63 plans, 42/42 requirements, audit PASSED (AVAL-03 BLOCKER resolvido pós-audit — EF redeploy v6, commit 39a164e); roadmap+requirements arquivados em `milestones/v2.0-ROADMAP.md` + `milestones/v2.0-REQUIREMENTS.md`.*
