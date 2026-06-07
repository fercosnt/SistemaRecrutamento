---
phase: 8
slug: inscri-o-knock-out-etapa-1
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-07
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit/integration) + Playwright (E2E) + SQL smoke runbook (disposable fixture, Phase 7 pattern) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` (existing) |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && npm run test:e2e && npm run lint` |
| **Estimated runtime** | ~60–120 seconds (vitest+lint); E2E adds ~30–60s |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (scoped to touched feature when possible)
- **After every plan wave:** Run `npm run test:run && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green (vitest + E2E + lint)
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

> Filled by the planner per task. Anchors below derive from the 4 Success Criteria + Validation Architecture in 08-RESEARCH.md.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-XX-XX | XX | 1 | INSCR-01 / LGPD-01 | T-8-01 / — | Zod `.strict()` rejects forbidden keys (cpf/foto/estado_civil/saude) client+server; allowlist = exactly INSCR-01 fields | unit | `npm run test:run` | ❌ W0 | ⬜ pending |
| 8-XX-XX | XX | 1 | INSCR-02 | — | publish gate enforces ≤10 perguntas / ≤1 aberta; knockout-bearing pergunta `obrigatoria=true`; `vaga.qualificacao_etapa1` snapshot written at Publicar | sql-smoke | SQL runbook (disposable fixture) | ❌ W0 | ⬜ pending |
| 8-XX-XX | XX | 2 | INSCR-04 | T-8-02 | knockout answer → `status='rejeitado'`, `etapa_atual='inscricao'`, `motivo='knockout_automatico'` + `opcao_knockout_id` in SAME transaction; survivors get `etapa='triagem'` | sql-smoke | SQL runbook (knockout + survivor paths) | ❌ W0 | ⬜ pending |
| 8-XX-XX | XX | 2 | INSCR-04 | — | one `historico_candidatura` row `auto_rejeitado=true`, `ator=NULL` (no double-write from `avancar_etapa()` trigger) | sql-smoke | SQL runbook (history count assertion) | ❌ W0 | ⬜ pending |
| 8-XX-XX | XX | 2 | INSCR-03 | — | seeded defaults fire: presencial-SP=Não (all cargos) + harmonização orofacial=Não (dentista only) | sql-smoke + e2e | SQL runbook + Playwright | ❌ W0 | ⬜ pending |
| 8-XX-XX | XX | 3 | INSCR-04 | — | candidate sees neutral message inline post-submit + `feedback_rejeicao` shown in `/perfil` dashboard | e2e | `npm run test:e2e` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Vitest stubs for the LGPD-clean Zod schema (allowlist + `.strict()` forbidden-key rejection)
- [ ] Vitest stubs for `opcoesNormalize` / answer-key matching used by the knockout join
- [ ] SQL smoke runbook scaffold (disposable fixture + `set_config('request.jwt.claims', ...)` to simulate candidato/RH, ROLLBACK-free cleanup — Phase 7 pattern) covering: knockout-fires, survivor-passes, single-history-row, seeded-defaults
- [ ] Playwright E2E stub for inscrição → knockout → neutral message + `/perfil` feedback display

*Existing Vitest/Playwright infra covers framework needs — Wave 0 adds test files only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration applied to PROD (new columns + RPC extension) via Supabase MCP `execute_sql` (42601 workaround) + version-row reconciliation | INSCR-04 | PROD apply is a privileged out-of-band step (CLAUDE.md migration workaround); not runnable in CI | Apply SQL in Supabase, then `supabase db push --linked` must say "up to date"; `npm run db:types` regenerates `database.types.ts` |
| Visual neutrality of rejection message (no criterion leaked, LGPD D-15) | INSCR-04 | Wording/UX judgment | Inspect inline message + `/perfil` text; confirm it matches the single neutral standard, exposes no knockout criterion |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
