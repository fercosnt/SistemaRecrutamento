# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06)
- ✅ **v2.0 — M2 Funil RH + Avaliação por IA** — Phases 6–16 (shipped 2026-06-26)
- 🔧 **Standalone (pós-v2.0)** — Phase 17 (Navegação & Arquitetura de Informação) — mini-fase fora de milestone (shipped 2026-06-28)
- ✅ **v3.0 — M3 Refinamento RH & Hardening** — Phases 18–21 (shipped 2026-06-30)
- 🚧 **v4.0 — M4 Correção & Blindagem do Funil** — Phases 22–27 (in progress)

## Overview

M4 é hardening/correção do funil ponta-a-ponta — **não** expansão. Depois de M1–M3 terem construído e resfriado o produto, duas auditorias adversariais (56 achados técnicos + 74 recs de produto de 6 personas) expuseram o débito estrutural: gabarito/PII legíveis por RLS row-level, uma stack de IA silenciosamente morta, o drift M1→M2 (enums mortos, colunas fantasma, contratos quebrados, scoring manipulável), migrations que não reconstroem o banco, e a ausência da rede de testes que teria pego cada defeito live. O milestone fecha isso em 6 fases: primeiro a rede de testes/CI + typecheck destravado + a varredura de honestidade imediata (P22); depois ressuscita a IA (P23); blinda toda a superfície de PII/gabarito/IDOR (P24); corrige o funil pelo lado RH (P25) e pelo lado candidato (P26); e fecha com a reconstrução de migrations + o endurecimento da rede de testes sobre o código já corrigido (P27). Invariante em todas as fases: **IA recomenda, humano decide** — o sistema nunca auto-rejeita por score (RNF-07a), a linguagem é "avaliação comportamental/cognitiva" (RNF-12a).

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

M4 continua a numeração a partir da **Phase 22** (M3 terminou na Phase 21).

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

<details>
<summary>✅ v3.0 — M3 Refinamento RH & Hardening (Phases 18–21) — SHIPPED 2026-06-30</summary>

Full detail archived in `milestones/v3.0-ROADMAP.md`. Requirements: `milestones/v3.0-REQUIREMENTS.md`. Audit: `milestones/v3.0-MILESTONE-AUDIT.md` (12/12 reqs, integration OK, status tech_debt — known/tracked items to M4).

Hardening (não expansão) do funil de IA do M2 para uso real em PROD: resiliência das Edge Functions (RESIL-01 per-call timeout+backoff, RESIL-02 devolutiva 5-dim paralela, RESIL-03 `<AsyncState>` nas 5 telas de IA) + 2 bugs de funil (FIX-01/02) (P18); code-splitting route+vendor e invalidação de cache ≤60s (PERF-03/04) (P19); RH edita/adiciona/remove/reordena o guia de entrevista por write-path seguro authenticate-THEN-authorize + merge-preserve anti-silent-discard (ENTREV-06/07/08) (P20); e fechamento dos HUMAN-UAT live deferidos do M2/M3 em PROD (PROD-01/02) (P21). **A Phase 21 achou + corrigiu 3 defeitos live em PROD: devolutiva-bigfive nunca persistia (FK auth uid vs candidatos.id), gerar-guia-entrevista 500 em toda geração (timeout 25s RESIL-01 curto demais → override per-call), e autosave sem região aria-live (P16 #4).** Invariante preservada: IA recomenda, humano decide (RNF-07a); write-paths privilegiados authenticate-THEN-authorize.

</details>

### 🚧 v4.0 — M4 Correção & Blindagem do Funil (In Progress)

**Milestone Goal:** Endurecer e corrigir o funil ponta-a-ponta (hardening, **não** expansão) — fechar todo vazamento de PII/gabarito e IDOR, ressuscitar a stack de IA silenciosamente morta, eliminar o drift M1→M2 (enums mortos, colunas fantasma, contratos quebrados, scoring manipulável), fazer as migrations reconstruírem o banco do zero, e blindar tudo com a rede de testes/CI que originou todos os defeitos live. 56 requirements (SEC 11 · AI 7 · FUNIL 12 · DBMIG 2 · CI 15 · UX 9). Invariante em toda fase: IA recomenda, humano decide (RNF-07a); linguagem "avaliação comportamental/cognitiva" (RNF-12a).

- [x] **Phase 22: Rede de Testes, Destravamento & Varredura de Honestidade** - Corpus Deno em CI + typecheck destravado + varredura Onda-1 de copy/login honestos (completed 2026-07-05)
- [x] **Phase 23: Ressurreição da Stack de IA** - Prompts reais nos 7 call_types + circuit breaker/retry/guardrails que funcionam + honestidade psicométrica (completed 2026-07-06)
- [x] **Phase 24: Blindagem de Segurança / PII / LGPD** - RLS nunca é segredo de coluna + toda EF privilegiada autentica-E-autoriza + IDOR/PII fechados (completed 2026-07-09)
- [ ] **Phase 25: Correção do Funil (lado RH — enums, colunas & contratos)** - RH opera Kanban/Editar-Vaga/decisão sobre enums+colunas que existem, sem rejeição sem trilha
- [ ] **Phase 26: Correção do Funil (lado candidato — alcançabilidade & scoring)** - Candidato alcança e conclui cada etapa com scoring íntegro + reinscrição pós soft-delete
- [ ] **Phase 27: Integridade de Migrations & Fechamento da Rede de Testes** - Migrations reconstroem o banco do zero + rede de testes cobre auto-reject sancionado e contratos

## Phase Details

### Phase 22: Rede de Testes, Destravamento & Varredura de Honestidade

**Goal**: A rede de testes que originou todos os defeitos live roda verde em CI, o typecheck destrava, e o candidato encontra copy honesta com login que funciona sem gambiarra — a fundação de regressão sobre a qual todas as fases seguintes se guardam.
**Depends on**: Nothing (primeira fase do milestone)
**Requirements**: CI-01, CI-02, CI-04, CI-05, CI-08, CI-09, CI-11, CI-12, CI-14, UX-02, UX-04, UX-05
**Success Criteria** (what must be TRUE):

  1. O corpus Deno das EFs (~126 testes) roda num job de CI e passa **verde** — casts stale e asserts corrigidos, a suíte para de apodrecer (CI-01, CI-02).
  2. `npm run lint` (tsc) cobre `e2e/`, `scripts/` e `playwright.config`, os 65 TS2307 de imports versionados estão resolvidos, e o gate de CI fica **vermelho** se um novo type-error subir acima do baseline real 257 (não 290 frouxo) (CI-04, CI-05, CI-14).
  3. Botões de login (candidato, RH, esqueci/redefinir) habilitam corretamente sem `!isValid` — os E2E não precisam mais do hack `blur()` — e nenhum email/senha de conta de teste vive no repo (UX-04, CI-08).
  4. A landing não usa "testes psicométricos"/"análise de perfil" e oferece CTA "Já sou candidato" (RNF-12a); `?redirect` sobrevive login→cadastro→pós-login com `localStorage` órfão limpo (UX-02, UX-05).
  5. As 8 deps wildcard `"*"` ficam pinadas, as vulns críticas/altas do dev-tooling (vitest/@vitest/ui RCE, happy-dom) resolvidas, e as deps nunca-importadas (`motion`, `@supabase/auth-helpers-react`) removidas (CI-09, CI-11, CI-12).

**Plans**: 6 plans (2 waves)
Plans:
**Wave 1**

- [x] 22-01-PLAN.md — Deno EF corpus green under type-check (CI-02) [Wave 1]
- [x] 22-02-PLAN.md — Supply-chain: pin 8 wildcards, bump vitest/happy-dom vulns, drop 2 dead deps (CI-09/11/12) [Wave 1]
- [x] 22-03-PLAN.md — Login buttons sem !isValid + ?redirect propagado (shared resolveRedirect) + orphan localStorage limpo (UX-04/05) [Wave 1]
- [x] 22-04-PLAN.md — Landing honesta + estender forbidden-strings guard (UX-02) [Wave 1]
- [x] 22-05-PLAN.md — Credenciais de teste fora do repo + .env.test.example + guard (CI-08) [Wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 22-06-PLAN.md — tsconfig paths+coverage + Deno CI job + measure-and-pin do baseline tsc real 133 (CI-01/04/05/14) [Wave 2]

**UI hint**: yes

### Phase 23: Ressurreição da Stack de IA

**Goal**: A stack de IA silenciosamente morta volta a rodar os prompts reais nos 7 call_types, com circuit breaker vivo, retry de timeout que casa e guardrails de custo que alarmam de verdade — e as telas param de expor percentil bruto. IA continua recomendação, nunca decisão.
**Depends on**: Phase 22 (usa a rede de testes/typecheck para regress-guard das mudanças de EF)
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, UX-07, UX-09
**Success Criteria** (what must be TRUE):

  1. Os 7 call_types de IA rodam com o prompt real da library (não o stub de 1 linha do `SCHEMA_VERSIONS` órfão) e um alarme dispara nos ai-logs quando um call_type cai para versão 0.0.0 (AI-01).
  2. Um timeout do SDK (`'Request timed out.'`) é retriável, `avaliar-transcricao-entrevista` recebe timeout adequado ao seu perfil Sonnet/4000-tokens, e o circuit breaker é instância **compartilhada** entre chamadas com `THRESHOLD ≤ MAX_ATTEMPTS` (AI-02, AI-03, AI-04).
  3. Após uma falha cacheada, o RH consegue reprocessar (replay de idempotência regenerável) em vez de receber a mesma falha para sempre (AI-05).
  4. Um env var malformado (`MAX_ATTEMPTS`/`AI_CALL_TIMEOUT_MS`) não derruba a stack (guarda de NaN), e os guardrails de custo alarmam com escopo/janela/canal corretos — não detect-only com 1 dia de atraso (AI-06, AI-07).
  5. Devolutiva e telas RH mostram **descritores qualitativos** (sem percentil numérico) e o peso de `triagem` sai das chaves ponderadas da consolidação (ou cap ≤15), com número consolidado exigindo ≥2 etapas (UX-07, UX-09).

**Plans**: 6 plans (4 waves)
Plans:
**Wave 1** *(código local, Deno/Vitest-testável, sem conflito de arquivo)*

- [x] 23-01-PLAN.md — Núcleo de resiliência: sharedBreaker + THRESHOLD≤MAX_ATTEMPTS + isRetryable(timeout) + cap de retry + replay success-only + parseIntEnv (AI-02/03/04/05/07) [Wave 1]
- [x] 23-02-PLAN.md — Prompt library revival: SCHEMA_VERSIONS espelha o enum + catch estreitado nas 7 EFs + alarme ai_prompt_stub_fired + transcricao 60s + percentil fora do prompt da devolutiva (AI-01/04, UX-07) [Wave 1]
- [x] 23-04-PLAN.md — Honestidade psicométrica: devolutiva + telas RH sem percentil cru (bandas) + triagem fora da consolidação + ≥2 etapas (UX-07/09) [Wave 1]

**Wave 2** *(toca ai-client.ts — serializado após 23-01)*

- [x] 23-03-PLAN.md — Guardrails de custo: kill-switch pré-chamada por-vaga (fail-open) + cost-alerter alertMessage testável (candidate_cost_over_1) (AI-06) [Wave 2]

**Wave 3** *(BLOCKING · non-autonomous · escreve PROD via Supabase MCP)*

- [x] 23-05-PLAN.md — Migrations PROD: enum bigfive_devolutiva + seed/activate + ativar 3 call_types + fix do trigger de custo + reconciliar ledger (AI-01/06) [Wave 3]

**Wave 4** *(BLOCKING · non-autonomous · deploy PROD)*

- [x] 23-06-PLAN.md — Redeploy das 9 EFs (bundle-freeze) + smoke live (semver real, não 0.0.0) — sem tocar verify_jwt (AI-01/04/06, UX-07/09) [Wave 4]

**UI hint**: yes

### Phase 24: Blindagem de Segurança / PII / LGPD

**Goal**: Fechar todo vazamento de PII/gabarito e IDOR — RLS row-level nunca é segredo de coluna (→ column REVOKE / RPC SECURITY DEFINER), toda EF privilegiada autentica-**E**-autoriza, as SELECT policies são vaga-scoped, e dado sensível (gabarito cognitivo, veredito da redação, itens políticos) fica fora do alcance candidato. SEC-01 (blindar o gabarito cognitivo) é pré-requisito do seed CC0 diferido ao M5.
**Depends on**: Phase 22 (regress-guard pela rede de testes); Phase 23 (EFs de IA já vivas antes de apertar sua autorização)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11, UX-08
**Success Criteria** (what must be TRUE):

  1. Um candidato autenticado que faz GET direto na tabela de gabarito cognitivo recebe **0 colunas de resposta** (`gabarito_idx` só via RPC SECURITY DEFINER); o candidato também não lê o veredito da IA da própria redação (score/cor/red_flag/notas) nem a coluna `rubric` das perguntas (SEC-01, SEC-02, SEC-07).
  2. `gerar-devolutiva-bigfive` rejeita um caller sem Bearer interno + role + posse (IDOR fechado), e um recrutador não-dono **não** lê análise/comparativo/candidaturas de vaga alheia — policies vaga-scoped, não role-only (SEC-04, SEC-05, SEC-06, SEC-08).
  3. Nenhuma URL de webhook n8n nem `console.log` operacional de RH aparece no bundle público / console de PROD (SEC-03, SEC-11).
  4. A policy SELECT de `supabase_auth_admin` sobre `usuarios_rh` (dependência do `custom_access_token_hook`) está declarada em migration file — sem drift execute_sql-only — e o backup PII `backup_m2.candidaturas_pre_funil` fica coberto por RLS/erasure ou é removido (SEC-09, SEC-10).
  5. Os 4 itens políticos O6 do Big Five são removidos do banco de itens (dado sensível, mesma natureza LGPD) (UX-08).

**Plans**: 9 plans (4 waves)
Plans:
**Wave 1** *(BLOCKING · non-autonomous · MCP live-state reads — first task of the phase)*

- [x] 24-01-PLAN.md — Live-state verification via Supabase MCP (pg_policies + column ACLs + backup existence + auth_admin predicate) → 24-LIVE-STATE.md [Wave 1]

**Wave 2** *(código local, disjoint files — migration FILES + client rewires + EF edits + tests)*

- [x] 24-02-PLAN.md — SEC-01 gabarito (column REVOKE + get_cognitivo_itens DEFINER RPC) + SEC-07 rubric (REVOKE + allowlist drop) [Wave 2]
- [x] 24-03-PLAN.md — SEC-02 veredito redação (candidate-DENY row + get_minha_redacao DEFINER RPC — NOT column REVOKE) [Wave 2]
- [x] 24-04-PLAN.md — SEC-05/06/08 policies vaga-scoped (WR-04) em analise/comparativo/candidaturas/redacoes RH + reprocessar regression-guard [Wave 2]
- [x] 24-05-PLAN.md — SEC-04 devolutiva EF Bearer self-auth + SEC-03 n8n server-side (pg_net+Vault) + remoção do bundle + grep guard [Wave 2]
- [x] 24-06-PLAN.md — SEC-09 auth_admin policy em migration file + SEC-10 DROP backup PII + SEC-11 strip console.log RH + guard [Wave 2]
- [x] 24-07-PLAN.md — UX-08 desativar 4 itens O6 {28,58,88,118} + scorer 116-item/O-prorate + submit-final/schema/copy/golden lockstep [Wave 2]

**Wave 3** *(BLOCKING · non-autonomous · escreve PROD via Supabase MCP)*

- [x] 24-08-PLAN.md — Aplicar as 8 migrations via apply_migration + n8n Vault secret + SQL smokes ao vivo (candidato-DENY / non-owner-0-rows / 42501 / to_regclass NULL / 116 ativos) [Wave 3]

**Wave 4** *(BLOCKING · non-autonomous · redeploy PROD)*

- [x] 24-09-PLAN.md — Redeploy gerar-devolutiva-bigfive (401/200) + submit-bigfive-final (116-item bundle) + smokes ao vivo [Wave 4]

**UI hint**: no

### Phase 25: Correção do Funil (lado RH — enums, colunas & contratos)

**Goal**: O RH opera o funil sobre enums e colunas que **existem** — Kanban, UpdateStatus, Editar Vaga e decisão funcionam sem tocar em artefatos M1 mortos — e ninguém rejeita candidato sem trilha de auditoria/justificativa (RNF-07a). No mesmo file-touch, o hub RH e as affordances mortas são corrigidos/ocultados.
**Depends on**: Phase 24 (as projeções candidate-facing e policies já blindadas antes de reescrever os write-paths RH)
**Requirements**: FUNIL-02, FUNIL-03, FUNIL-04, FUNIL-05, FUNIL-06, FUNIL-09, FUNIL-11, UX-03, UX-06
**Success Criteria** (what must be TRUE):

  1. O RH Kanban e o UpdateStatusModal operam sobre o enum de etapas que existe no DB, e a ação legada 'Aprovado para Próxima Etapa' não grava mais uma etapa M1 inexistente (FUNIL-03, FUNIL-06).
  2. Editar uma vaga e recarregar **mantém** os pesos/testes configurados — persiste a config e hidrata só colunas existentes (sem as 8 colunas fantasma) — e os ids de teste do `cargoTemplate` casam com o runtime do container (FUNIL-04, FUNIL-05).
  3. Um recrutador **não** consegue rejeitar candidato via UPDATE direto de `candidaturas.status` sem justificativa/auditoria, e `registrar_decisao` preserva a decisão anterior (`por_usuario`/justificativa) no histórico (FUNIL-02, FUNIL-09).
  4. Editar opções de uma vaga **ATIVA** é bloqueado/controlado por guard de status (FUNIL-11).
  5. A navegação do hub RH usa `candidatura.id` (com estado 404 no hub) e as affordances mortas — menus, badges 12/5, botões no-op, tiles "-", os no-op de avançar/rejeitar da DecisaoFinalPage e as telas mock A14/A37 — ficam ligadas ou ocultas (UX-03, UX-06).

**Plans**: 8 plans (2 waves)
Plans:
**Wave 1** *(parallel — file-disjoint, autonomous)*

- [x] 25-01-PLAN.md — DB migrations (files): reject-guard trigger + decisao_final_historico + registrar_decisao/upsert/submit amendments (FUNIL-02/09/11) [Wave 1]
- [ ] 25-02-PLAN.md — Enum cutover + Kanban rewire (M2 audited path) + reject reroute via registrar_decisao + Kanban nav (FUNIL-02/03/06, UX-03) [Wave 1]
- [ ] 25-03-PLAN.md — Editar Vaga: real-column hydration + updateVagaBase persist + no-op button removal (FUNIL-04, UX-06) [Wave 1]
- [ ] 25-04-PLAN.md — cargoTemplates<->container test-id contract lib + contract test + deriveCards rewire (FUNIL-05) [Wave 1]
- [ ] 25-05-PLAN.md — Hub nav (candidatura.id) + in-shell 404 not-found (UX-03) [Wave 1]
- [ ] 25-06-PLAN.md — Dead-affordance sweep + mock-screen empty-state gating A14/A37 (UX-06) [Wave 1]

**Wave 2** *(25-07 BLOCKING - non-autonomous - PROD apply; 25-08 CI re-pin)*

- [ ] 25-07-PLAN.md — [BLOCKING] Apply 5 migrations via Supabase MCP + regen types + live SQL smokes A-E (FUNIL-02/09/11) [Wave 2]
- [ ] 25-08-PLAN.md — Re-measure + re-pin ci.yml tsc baseline (stale 133 -> measured) (FUNIL-04) [Wave 2]

**UI hint**: yes

### Phase 26: Correção do Funil (lado candidato — alcançabilidade & scoring)

**Goal**: O candidato **alcança** e **conclui** cada etapa da avaliação com scoring íntegro e não-manipulável, vê apenas perguntas do próprio cargo/vaga, e consegue se reinscrever após soft-delete — com cards e copy que refletem o estado real. O sistema nunca auto-rejeita por score (RNF-07a).
**Depends on**: Phase 25 (config/enum RH já consistentes antes de corrigir a navegação e o scoring do candidato)
**Requirements**: FUNIL-01, FUNIL-07, FUNIL-08, FUNIL-10, FUNIL-12, UX-01
**Success Criteria** (what must be TRUE):

  1. `pontuar_sjt` não é manipulável — deduplicação de respostas + denominador sobre **todas** as perguntas da vaga (não só as respondidas) (FUNIL-01).
  2. O candidato só responde perguntas SJT do próprio cargo **e** filtradas por `itens_ids` da vaga — nunca vê pergunta de outro cargo (FUNIL-07).
  3. A prova cognitiva é **alcançável** pela navegação (`funilNavMap` ↔ `AvaliacaoContainer` consistentes + roteamento/label/filtro por `aplica_cognitivo`) (FUNIL-08).
  4. Os cards da avaliação refletem conclusão (status derivado de campo que existe no payload, não de um campo fantasma), e a copy de espera diz "acompanhe no painel" — não "avisaremos por e-mail" — em 5+ telas (FUNIL-12, UX-01).
  5. Um candidato soft-deletado consegue se reinscrever — índice unique com filtro `deleted_at` em PROD (FUNIL-10).
  6. **[Adicionado pós-P24, roteado por Fernando 2026-07-09]** O `src/features/cadastro/services/n8nService.ts` NÃO envia PII do candidato (nome/email/telefone/**cpf**) do browser nem embute URLs n8n (`n8n.srv881294.hstgr.cloud`) no bundle — dispatch movido server-side (pg_net + Vault, padrão SEC-03) + grep guard. Segundo vazamento n8n, fora do escopo A11 do SEC-03; ver `24-deferred-items.md`.

**Plans**: TBD
**UI hint**: yes

### Phase 27: Integridade de Migrations & Fechamento da Rede de Testes

**Goal**: As 49 migrations reconstroem o banco do zero e o ledger de versões converge (destrava pgTAP e reprodutibilidade), e a rede de testes fecha sobre o código já corrigido — cobrindo o único auto-reject sancionado, os contratos client↔EF reais e os gates de bundle/verify_jwt — a blindagem que impede regressão verde silenciosa.
**Depends on**: Phase 26 (regress-guarda o código já corrigido em P23–26; DBMIG-01 é âncora/risco L, natural late)
**Requirements**: DBMIG-01, DBMIG-02, CI-03, CI-06, CI-07, CI-10, CI-13, CI-15
**Success Criteria** (what must be TRUE):

  1. As 49 migrations reconstroem o banco do zero num ambiente limpo e o ledger de versões converge — sem baseline vazio nem objetos só-em-PROD (DBMIG-01).
  2. `submit-candidatura` (EF + RPC de knockout — o único auto-reject sancionado do sistema) tem cobertura de teste, e a semântica de `historico_candidatura.auto_rejeitado` distingue 'escrita do sistema' de 'auto-rejeição' (CI-03, DBMIG-02).
  3. Os contract tests client↔EF são **reais** — o corpo do client parseia no Zod schema da EF, não replicam ambos os lados dentro do teste — e `extractEfErrorCode` fica deduplicado no helper compartilhado `@/lib/efErrors` (CI-07, CI-06).
  4. O gate de bundle PERF-03 (`assert-chunks.mjs`) está wired em build **e** CI, o `verify_jwt` por Edge Function está declarado em `supabase/config.toml`, e o teste de `sync-prompts` (pipeline que escreve em PROD com service_role) roda no CI (CI-10, CI-13, CI-15).

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 22 → 23 → 24 → 25 → 26 → 27

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–5 (M1) | v1.0 | 40/40 | Complete | 2026-06-06 |
| 6–16 (M2) | v2.0 | 63/63 | Complete | 2026-06-26 |
| 17 | standalone | 5/5 | Complete | 2026-06-28 |
| 18–21 (M3) | v3.0 | 16/16 | Complete | 2026-06-30 |
| 22. Rede de Testes & Destravamento | v4.0 | 6/6 | Complete    | 2026-07-05 |
| 23. Ressurreição da Stack de IA | v4.0 | 6/6 | Complete    | 2026-07-06 |
| 24. Blindagem Segurança / PII / LGPD | v4.0 | 9/9 | Complete   | 2026-07-09 |
| 25. Funil — lado RH | v4.0 | 1/8 | In Progress|  |
| 26. Funil — lado candidato | v4.0 | 0/TBD | Not started | - |
| 27. Migrations & Rede de Testes | v4.0 | 0/TBD | Not started | - |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/v1.0-*`.*
*v2.0 milestone shipped 2026-06-26 — full requirements and roadmap detail archived under `.planning/milestones/v2.0-*`. 11 phases (6–16), 42/42 requirements, audit PASSED.*
*v3.0 milestone shipped 2026-06-30 — full requirements and roadmap detail archived under `.planning/milestones/v3.0-*`. 4 phases (18–21), 12/12 requirements, audit OK (tech_debt accepted). Phase 21 found+fixed 3 live PROD defects beyond the planned UAT scope.*
*v4.0 milestone opened 2026-07-05 — 6 phases (22–27), 56 requirements (SEC 11 · AI 7 · FUNIL 12 · DBMIG 2 · CI 15 · UX 9), 100% mapped. Hardening/correção, não expansão. Scope from `.planning/M4-SCOPE-PROPOSAL.md` ← `.planning/M4-SYSTEM-AUDIT.md` + `.planning/M4-PRODUCT-EVALUATION.md`.*
