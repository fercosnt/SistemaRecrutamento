# Milestones

## v5.0 M5 — Gestão de Usuários & Perfil RH (Shipped: 2026-07-14)

**Phases completed:** 3 phases (28–30), 19 plans

**Audit:** tech_debt — 13/13 requirements Complete, 0 gaps, 0 blockers. See `milestones/v5.0-MILESTONE-AUDIT.md`.

**Delivered:** The RH internal account-management the earlier milestones left gated/stubbed — feature-work with **security as the axis**:

- **Gestão de Usuários RH (A14)** — the admin console at `/rh/configuracoes`: an `administrador` lists, creates, changes role (recrutador↔administrador), deactivates/reactivates and resets passwords of RH users. Every privileged write goes through the `gerenciar-usuario-rh` Edge Function (service_role, **authenticate-THEN-authorize**, admin-only), never the client. `usuarios_rh` RLS is admin-only (the two `qual=true` roster leaks **and** the WITH-CHECK-less self-promotion UPDATE policy dropped — closing a live escalation hole), the audit trail is append-only + purge-exempt, and a race-safe `pg_advisory_xact_lock` anti-lockout trigger guarantees ≥1 active administrador. Live on PROD; SEG-02/USR-06/USR-07 behavioral SQL smokes GREEN.
- **Meu Perfil RH (A37)** — self-service at `/rh/perfil`: edit own name (propagates panel-wide via the authStore, no re-login), change own password with GoTrue re-authentication (`signInWithPassword`→`updateUser`, no logout), upload own avatar to a private own-folder bucket. The write path is a `SECURITY DEFINER` RPC whose SET list physically excludes `role`/`ativo`/`cargo`/`email` — **SEG-03 closed by construction**; the SEG-03 smoke (own-row-only, role-unchanged, self-promotion still 0 rows) is GREEN on PROD.
- **Security axis proven inline** — no self-service role escalation, service_role never in the client bundle (grep-guard), RLS 100%, Pitfall-7 secret redaction. Gates at close: vitest 881/881, tsc 104, build 0.

**Carried tech-debt → M6:** live HUMAN-UAT round-trips (SMTP email delivery, real password/avatar round-trips, 2-session anti-lockout concurrency, visual/AA sweeps); 2 accepted UI-review cosmetics (turquoise-accent dilution, blue focus-ring); IN-01 avatar extension-orphan; plus carried DBMIG-01 baseline+rebuild, SEC-03 Vault secret, CC0-01. Optional retroactive `/gsd-secure-phase` for standalone `*-SECURITY.md` artifacts (security was proven inline via PROD smokes + 0-Critical code-reviews).

---

## v4.0 M4 Correção & Blindagem do Funil (Shipped: 2026-07-13)

**Phases completed:** 6 phases, 43 plans, 89 tasks

**Key accomplishments:**

- The never-CI-run Deno Edge-Function test corpus now runs GREEN under type-check ON (148 passed / 0 failed, exit 0) — strict-schema Vitest probe excluded from the Deno runner, stale local `timeoutMs` type corrected — with zero product change, unblocking the blocking `deno-test` CI job in Plan 22-06.
- Extracted the anti-open-redirect guard into ONE shared util, enabled both login submit buttons by default (killing the E2E blur() hack), threaded a resolveRedirect-guarded `?redirect` through login→cadastro→post-login, and cleared the orphan `candidatura_vaga_id` localStorage key on login — zero new type errors.
- Landing copy made honest under RNF-12a ("avaliação comportamental/cognitiva", no "psicométricos"/"análise de perfil"), a "Já sou candidato" CTA to `/auth/login` added, and the forbidden-strings CI guard extended so the two marketing terms can never silently return — whole-src guard now GREEN 19/19.
- Every real test-account credential removed from e2e/ — specs read env vars with skip-if-unset, `.env.test.example` documents keys value-free, and a new `no-hardcoded-test-creds` CI guard permanently blocks any credential literal from returning.
- The 65 phantom versioned-import `TS2307` are resolved via tsconfig `paths` (cascading the tsc total 257 -> 133, finally type-checking the shadcn UI layer that was silently typed `any`), tsc coverage now spans e2e/scripts/playwright with the Deno files excluded (no `TS2304 'Deno'`), and ci.yml gains a BLOCKING `deno-test` job plus a tsc gate pinned to the REAL measured green baseline of 133 (down from the loose 290) — the phase's full regression net is now wired and red-on-growth.
- Reanimou o núcleo de resiliência em `_shared/`: circuit breaker compartilhado que abre de verdade (AI-02), timeout do SDK retriável por name+regex (AI-03), cap de retry-budget p/ caber sob ~150s do EF (AI-04), replay de idempotência regenerável só de sucesso (AI-05) e guarda de NaN nos envs numéricos (AI-07) — puro/local, corpus Deno verde 154/0.
- Religou os 7 call_types à prompt library REAL: `SCHEMA_VERSIONS` espelha o enum `llm_call_type` (5 chaves órfãs de Fase 9 removidas), o catch mudo das 7 EFs foi estreitado para propagar `SchemaVersionMismatchError`/`PromptNotConfiguredError` como 500 estruturado + alarme `ai_prompt_stub_fired` no ponto de degradação (nunca a avaliação-stub de 12 palavras), o `avaliar-transcricao-entrevista` recebeu o override de 60s (AI-04) e o prompt da devolutiva Big Five passou a banda-only sem percentil cru (UX-07) — corpus Deno verde 166/0, tsc baseline 133 inalterado.
- Kill-switch de custo PRÉ-chamada em callAi (soma cost_usd do dia por vaga vs AI_DAILY_COST_CAP_USD, fail-OPEN, hold nunca reject) + alertMessage do cost-alerter extraído para módulo puro testável cobrindo os 4 canais incluindo candidate_cost_over_1.
- Percentil cru removido da devolutiva do candidato e das telas RH (Big Five = 5 bandas neutras, cognitivo = banda avaliativa 3-níveis provisória) + triagem tirada da consolidação (vira contexto sem peso) com gate server-authoritative de ≥2 etapas antes de exibir um número consolidado.
- Plan:
- Plan:
- Status:
- Closed the two candidate-facing column leaks whose columns no authenticated client legitimately reads: cognitive `gabarito_idx` (row-deny + get_cognitivo_itens DEFINER reader + column REVOKE) and SJT `rubric` (column REVOKE + avaliacaoService allowlist drop), with a leak-detecting candidato-DENY SQL smoke for the 24-08 PROD apply.
- Closed the essay-verdict leak with the phase's landmine mechanism done right: DROP the candidate's base-table row-SELECT on `redacoes_candidato` + a `get_minha_redacao` SECURITY DEFINER RPC (own-row guard, safe projection, coarsened status) — NOT a column REVOKE, because RH reads the verdict via the same `authenticated` role. Candidate client rewired to the RPC in lockstep; RH verdict reads untouched.
- Closed the cross-recruiter horizontal read/write leak: re-emitted the shipped WR-04 predicate (administrador bypass OR rh-owns-the-vaga) verbatim onto the 6 role-only RH policies that let any `role='rh'` recruiter read/update every vaga's analysis, comparative, candidaturas and essay verdict. Scope on direct `vaga_id` (analise/comparativo/candidaturas) or the `candidaturas→vagas` JOIN (redacoes); `reprocessar_analise` (already scoped) regression-guarded, not rewritten. File-only; PROD apply is 24-08.
- Declared the execute_sql-only auth_admin RLS policy in a migration file (rebuild-safe), authored the LGPD DROP of the backup_m2 PII snapshot, and stripped operational console.log (incl. a candidate-email leak) from RH pages with the grep guard extended to lock it.
- The 4 political-opinion O6 Big Five items {28,58,88,118} are removed from administration via a reversible `ativo` flag; the scorer accepts 116 non-contiguous items and prorates the O domain ×6/5 so the Johnson norm stays byte-identical, with all 6 count-invariant sites moved in lockstep and every golden/scorer test green.
- Status:
- Status:
- Five files-only Postgres migrations that make the RH funnel tamper-resistant: a hybrid BEFORE-UPDATE reject guard backed by a new txn-local GUC, an append-only decision-history table + snapshot trigger, and status/ownership guards on the decision + option-edit DEFINER RPCs — authored, greps green, apply deferred to the [BLOCKING] 25-07 wave.
- The RH Kanban now operates over the real 6-stage `etapa_processo` funnel via the server-authoritative M2 write-path, the dead M1 auto-advance (the 22P02 crash vector) is gone, and no reject escapes the audit trail — the frontend finally caught up to the M2 enum cutover.
- Editar Vaga finally persists: hydration reads the real `vagas` columns (the 8 phantom reads that silently no-op'd persistence are gone), a new `updateVagaBase` writer + "Salvar alterações" accent CTA save the base fields + status alongside the already-working config, and the dead "Usar da Biblioteca" buttons are removed — clearing −9 tsc (124→115).
- 1. `src/lib/testes/testeContract.ts` (new — the canonical contract)
- 1. `src/components/pages/CandidatosRHPage.tsx` (nav param semantics — Task 1)
- Task 1 — dead-affordance removals (`b325624`)
- The 5 Phase-25 migrations are LIVE on PROD and the FUNIL-02/09/11 guarantees are proven by 8/8 behavioral smoke checks — a status-only reject can no longer escape the audit trail, decision amendments are archived, and option edits on active/non-owned vagas are blocked.
- Re-pinned the CI `tsc --noEmit` frozen baseline from a stale 133 to the MEASURED post-Phase-25 count of 107 (a real -21 clearance from the 128 that entered the phase), locking in the enum-cutover + phantom-column + mock-screen reductions and closing the FUNIL-04 regression hole where CI stayed green until 134.
- Closed the 2 open UX-06 dead-affordance items from 25-VERIFICATION: swept the 3 no-op RH dropdown items (Enviar Email / WhatsApp / Exportar PDF) from both CandidatosRHPage views, and gave the VagasRHPage per-vaga tiles real RH-session counts via an `includeCounts` flag that decouples the count query from candidatoId while preserving the WR-10 anon skip.
- Rewrote the `pontuar_sjt` SECURITY DEFINER RPC so SJT scoring is non-manipulable — dedup + full-battery denominator + battery-membership (FUNIL-07 server teeth) + completeness + empty-battery loud-fail + a hard re-submit lock — and authored its 7-assertion impersonated-JWT behavioral smoke; both files-only, live apply deferred to the Wave 4 BLOCKING plan 26-07.
- Authored the two DB halves that make the cognitive assessment reachable and give the candidate cards a neutral own-row truth source: `CREATE OR REPLACE` the LIVE 5-arg `pontuar_cognitivo` adding `avaliacao_assincrona` to the etapa gate (interview stages kept — no regression), and a new `get_avaliacao_status` DEFINER RPC returning per-test PRESENCE booleans only for the 5 cards; both plus their behavioral smokes are files-only, live apply deferred to the Wave 4 BLOCKING plan 26-07.
- Deleted the zero-caller client `n8nService.ts` subtree (18 hardcoded `n8n.srv881294.hstgr.cloud` URLs + candidate PII payload), moved the candidato-created dispatch server-side to an `AFTER INSERT ON candidatos` trigger (pg_net + Vault, id-only body, graceful-skip), and extended the bundle grep guard to ban the hstgr host + PII field names across build/ and src/.
- Replaced every dishonest "avisaremos … por e-mail" / "receberá … por e-mail" wait-state promise across 6 candidate/RH screens with the single canonical pt-BR line "Acompanhe o andamento pelo seu painel." (the panel is the real status source — there is no e-mail infra), and added a scoped CI grep guard that bans the promise pattern from re-appearing in exactly those 6 files while proving it does not false-flag legitimate consent / password-reset / RH-notify copy.
- Wired the single candidate SJT data boundary to the Wave-1 DB contracts: `getAvaliacaoContext` now battery-filters the `perguntas` query by the vaga's SJT `itens_ids` (else `cargo`) and surfaces `aplica_cognitivo`, a new `getAvaliacaoStatus` reads the neutral `get_avaliacao_status` RPC via a narrow confined cast returning per-card presence booleans, and `pontuarSjt` maps the rewritten RPC's `42501`/`22023` RAISEs to NEUTRAL codes+messages — every projection stays allowlist-only and no score/threshold ever reaches the candidate.
- Made the cognitive assessment reachable in the candidate assessment hub and rebuilt the four-state neutral card contract on the candidate's own rows: `deriveCards` now SKIPs the always-emitted template `cognitivo` entry and appends exactly one cognitivo card gated on `vaga.aplica_cognitivo` (zero when false, one when true) routing to the REAL `/candidato/prova-cognitiva/:id` screen, and EVERY card's completion state derives from the neutral `get_avaliacao_status` booleans (registrado→Concluído, iniciado→Em andamento, else Pendente) — the phantom `entry.status` read is gone for all five cards — with a route↔gate contract test and connected-mode component tests locking both behaviors.
- Plan:
- Deduped the inverted `extractEfErrorCode` in entrevistaService onto the canonical `@/lib/efErrors` helper, wired the `assert-chunks.mjs` bundle gate into build (postbuild) + CI, and repaired the latent TS2352 in the sync-prompts Deno test so it runs type-check-ON as a distinct blocking CI step.
- Turned the replica+`fs`-probe contract idiom into a real cross-runtime net: one bare-`zod` shared schema module (resolved by Deno via a new `deno.json` import map and by Node via `node_modules`) is now imported by BOTH the EF and the client test with a real `.safeParse`; the consolidar EF was de-drifted onto the shared `.uuid()` schema; and `supabase/config.toml` declares the 12-function `verify_jwt` deploy posture as code.
- The system's ONLY sanctioned auto-reject is now regression-covered at the request layer (a CI-runnable Deno unit test on an extracted testable handler), the anti-tamper contract is a real cross-runtime `.safeParse`, the RPC layer has an authored knockout/survivor/dedup + DBMIG-02 smoke (RED until 27-05), and the CI tsc gate is pinned to the real measured 104.
- avancar_etapa() now marks auto_rejeitado=true ONLY for a GUC-sanctioned terminal auto-reject (a survivor advance writes false), a distinct one-time backfill corrects the historically-mismarked rows, and the stale "49 migrations" count is fixed to 71 — all file-only, applied later in the BLOCKING wave 27-05.

---

## v3.0 M3 — Refinamento RH & Hardening (Shipped: 2026-06-30)

**Phases completed:** 4 phases, 16 plans, 32 tasks

**Key accomplishments:**

- Per-call wall-clock timeout (25s default, env-configurable) + `maxRetries:0` added to both the Anthropic `messages.parse()` and OpenAI fallback `parse()` calls in the shared `callAi()` orchestrator — closing the live 38–102s hang (achado #1) without rebuilding the existing retry/backoff/circuit-breaker/fallback machinery.
- gerar-devolutiva-bigfive now fans out its 5 OCEAN dims via Promise.allSettled at 1 attempt/dim with per-dim deterministic degrade and preserved O-C-E-A-N order — killing the 5×2 sequential AI-call timeout (achado #2) while keeping RNF-07a (degrade writes only templates, never a decision).
- Exported `normalizeSjtComposite` (body byte-unchanged) + 2 Deno cases locking the SJT-composite aggregation, and a multi-table mocked-supabase Vitest locking the avaliação perguntas `status='active'` sentinel — the two live PROD bugs (350e994, 686c460) now have the regression coverage that would have caught each.
- Extracted ONE shared `<AsyncState>` presentational wrapper that renders the binding 5-state contract (loading → slow@8s → error → empty → success) with single-sourced verbatim PT-BR copy, an `AI_UNAVAILABLE`-driven sobrecarga/generic error split, and the standardized "Tentar novamente" retry — then refactored `HubSection` to delegate to it with zero behavior drift.
- 1. [Scope clarification] bigfiveService has no client-side `gerar-devolutiva-bigfive` invoke.
- Wired the shared `<AsyncState>` (18-04) + the `error_code` service plumbing (18-05) onto the five AI-backed screens — Consolidação, Comparativo, BigFive, SJT caso aberto, Redação — so candidate and RH always see loading / slow / error / retry (never a blank screen), with `AI_UNAVAILABLE` rendering the sobrecarga copy, generic errors the generic copy, and `MIXED_VAGA` preserved.
- Plan:
- 1. [Rule 3 - Blocking] Relaxed the `lazyNamed` generic so a mixed-export module type-checks
- Gap A — `useEntrevistaScorecard` (Task 1):
- 1. [Rule 3 - Blocking] Migration grep gate tripped on an explanatory comment
- Plan:
- One-liner:
- One-liner:
- One-liner:

---

## v1.0 M1 — MVP Candidato (Shipped: 2026-06-06)

**Phases completed:** 7 phases (1, 2, 3, 4, 4.1, 4.2, 5), 43 plans, 95 tasks
**Audit:** PASSED — 38/38 requirements satisfied, integration sound, CI green (run 27076233734). See `milestones/v1.0-MILESTONE-AUDIT.md`.
**Timeline:** 2025-11-05 → 2026-06-06 · ~47.9k LOC (src) · branch `backup/local-state-2026-04`

**Delivered:** A secure, mobile-first ATS candidate experience — register, log in, recover password, browse jobs, apply with CV upload, and view real application status on a profile page — built security-first on Supabase (Auth + DB + Storage + Edge Functions).

**Key accomplishments:**

- **Security foundation (Phase 1):** Removed the `service_role` client from the browser bundle (privileged ops moved to Edge Functions), unified auth into a single Zustand store with role derived from the JWT `app_metadata` (DB-lookup fallback), and replaced the dual ProtectedRoute/ProtectedAdminRoute system with a single role-aware `RoleGuard` (auth → role → children, preserved redirect). RLS anon-SELECT on `candidatos` moved to a `SECURITY DEFINER` RPC returning only a boolean.
- **Candidate registration (Phase 2):** End-to-end 4-step cadastro wired to a Deno Edge Function (Zod validation + atomic `candidatos` insert with rollback + LGPD consent), CPF/email duplicate-check via RPC, ViaCEP autofill, sessionStorage draft persistence, auto-login → `/candidato/perfil`. Verified by 13 Playwright scenarios + iPhone 12 Pro UAT.
- **Login + password recovery (Phase 3):** Login with remember-me (`persistSession`), anti-enumeration recovery flow, and a 3-state redefinir-senha machine — later migrated PKCE→email-OTP (Phase 5) to eliminate the cross-browser `code_verifier` deeplink failure. ~1.5k LoC of legacy auth code deleted.
- **Jobs + application (Phase 4):** Public job listing filtered by `status='ativa'`, slug-routed detail pages (anti-enumeration), and an atomic candidatura submit via Edge Function (two-client pattern, IDOR cross-check, 23505→DUPLICATE mapping) with private-bucket CV upload. VAGA-03 `?redirect=` preserved through login with an anti-open-redirect guard.
- **Auth hydration gate (Phase 4.1/4.2):** Introduced `hydrateFromSession` + `waitForCandidatoHydrated` to close the async gap between `onAuthStateChange` and navigation across all three login paths, plus a `RoleGuard` redirect-loop guard — establishing the smoke-runtime test gate Phase 4 lacked. Phase 1 verification artifacts backfilled.
- **Profile + hardening (Phase 5):** Real-data candidate profile, repaired the semantic-token system at its source (HSL channel triplets), root-level ErrorBoundary, first-ever GitHub Actions CI (unit + e2e + lighthouse) + Lighthouse CI + axe-core a11y at **zero WCAG A/AA violations**, two DB data-hygiene migrations, and a **fully green live CI run**.

**Known tech debt (deferred to M2 backlog):** PERF-01 ≤60s apply→display cache-invalidation window · HARD-02 Lighthouse Performance 0.62–0.68 (user-approved warn-baseline; bundle work post-M1) · FOUND-08 husky tsc gate bypassed pending 292-error baseline burn-down · stray RH-path debug `console.log`. Full detail in `milestones/v1.0-MILESTONE-AUDIT.md`.

---

## v2.0 M2 — Funil RH + Avaliação por IA (Shipped: 2026-06-26)

**Phases completed:** 11 phases (6–16), 63 plans
**Audit:** PASSED — 42/42 requirements satisfied, 11/11 phases, 5/5 e2e flows. The single BLOCKER (AVAL-03) was fixed + redeployed + PROD-smoked post-audit (commit `39a164e`). See `v2.0-MILESTONE-AUDIT.md`.
**Timeline:** 2026-06-06 → 2026-06-26 · 344 commits (99 `feat`) · 463 files changed (+78.2k / −0.8k) · ~67.4k LOC (src) · branch `backup/local-state-2026-04` · git range `8841c40` → `d565d33`

**Delivered:** The full RH (recruiter) hiring funnel with AI-assisted evaluation — a 6-stage auditable pipeline where the candidate registers, applies, completes async evaluation, and is interviewed, while the recruiter triages with AI, compares candidates, reviews structured BARS scorecards, and makes an auditable final decision. The invariant throughout: the system **never auto-rejects on a score** (RNF-07a); AI is always a recommendation, a human always decides.

**Key accomplishments:**

- **Pipeline backbone & RLS (Phase 6):** Deprecated the legacy 10-value `etapa_processo` enum (with backup) for a 6-stage enum + 2 terminals; `avancar_etapa()` PL/pgSQL trigger auto-advances and blocks unjustified regression, writing the `historico_candidatura` audit row in the same transaction; structural guardrail forbids any `decisao_final` with `por_usuario IS NULL`; RLS on 100% of new tables. 6 migrations live in PROD via Supabase MCP.
- **Vaga config + inscrição + knockouts (Phases 7–8):** Per-role templates (8 cargos) with default `testes_aplicaveis` + weight sliders (Σ=100%) + an option-tag wizard. LGPD-clean inscription form (no CPF/foto/saúde, Zod `.strict()` client + server) with a **server-authoritative knockout sweep** inside `submit_candidatura_atomic` (tag-only, no trait/score/idade) → synchronous auto-rejection + 1 audit row. Security gate caught + fixed a HIGH LGPD `select('*')` leak.
- **AI prompt library + cost infra + triagem (Phases 9–10):** 7 versioned prompts (system + user + Zod schema), hybrid git→DB versioning, mandatory cost/token logging, ephemeral prompt caching (≤R$0,50/candidate), `cost-alerter` EF, and a CI grep guard for forbidden product-language (LGPD-04). On top: AI `score_match` per application (≤30s, Zod-validated) + a 2-10 side-by-side comparativo with relative ranking + PDF export. Code review caught + fixed a CRITICAL IDOR/PII gap in the comparativo EF.
- **Async evaluation — SJT + Big Five + redação (Phases 11–13):** Deterministic Work-Sample/SJT (Σ peso 4/2/1/0, answer-keys RLS-protected, options via SECURITY DEFINER RPC) + open-case BARS; anti-tampering server-side Big Five (IPIP-NEO-120 PT-BR, 5 OCEAN + 30 facets) with a respectful hybrid D-lite devolutiva; cultural-fit redação scored by a dedicated AI EF (4 BARS dims + 3-color) with **mandatory human review** (every essay → `pendente_humano`, slider override, ≥50-char notes, escalation on "duvida"). Autosave + back-lock; never auto-rejects.
- **Interviews + cognitive + final decision (Phases 14–15):** AI-companion STAR/PEI interview guides (≥1 question per weak dimension) + transcript analysis (BARS + flags + citations; a language/accent flag at <3 blocks advance until human review) + opt-in CC0 cognitive reasoning marked **CONTEXTUAL**. Final decision consolidates all scorecards (never re-scores), requires a ≥50-char justification (`por_usuario` NOT NULL, DB-enforced), exposes an LGPD Art. 20 candidate explanation endpoint ("Solicitar revisão por pessoa natural" → internal ticket), and records a monthly EEOC 4/5 bias snapshot with CSV export.
- **WCAG-AA + tech-debt hardening (Phase 16):** Main M2 RH + candidate screens pass axe-core Tier-A GREEN **15/15** (zero serious/critical, WCAG AA) enforced in CI — hand-rolled tabs/radiogroups → Radix vendored, contrast bumps, slider `aria-valuetext`, keyboard-focusable tooltips. M1 tech-debt triaged (RH-path `console.*` removed, dead biasMath fns removed, RHSidebar mobile-menu bug fixed → tsc 291→290, ci.yml gate tightened).

**Known deferred items at close (non-blocking):** 5 live HUMAN-UAT round-trips (real PROD data/accounts — Phases 10/11/14 + others) · 4 advisory WARNINGs from audit (bigfive_devolutiva prompt not seeded → in-EF fallback; two `select('*')` allowlist-discipline gaps with no active leak; consolidar-decisao-final shows Big-Five/cognitivo as context-only). **Carried tech debt:** HARD-02 bundle code-splitting · PERF-01 cache-invalidation ≤60s · FOUND-08 tsc burn-down tail · CC0 cognitive item-bank real seed (pontuar_cognitivo has empty-bank guard). Full detail in `v2.0-MILESTONE-AUDIT.md`.

---
