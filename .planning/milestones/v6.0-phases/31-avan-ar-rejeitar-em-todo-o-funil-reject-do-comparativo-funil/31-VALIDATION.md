---
phase: 31
slug: avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-14
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from 31-RESEARCH.md §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 (happy-dom) + Supabase MCP `execute_sql` for SQL behavioral smokes |
| **Config file** | `vite.config.ts` (`test:` block, `setupFiles: ['./tests/setup.ts']`) |
| **Quick run command** | `npx vitest run src/features/triagem` |
| **Full suite command** | `npm run test:run && npm run lint && npm run build` |
| **Estimated runtime** | ~30s targeted; full suite ~2-3 min |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched feature dir>` (< 30s)
- **After every plan wave:** Run `npm run test:run && npm run lint` (full Vitest + tsc baseline — must NOT regress baseline ~104 tsc after M5)
- **Before `/gsd:verify-work`:** Full suite green + `npm run build` + the 5-assertion SQL behavioral smoke PASS (via MCP `execute_sql`, AFTER the [BLOCKING] apply wave)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-----------------|-----------|-------------------|-------------|--------|
| OPER-02 | reject `<50` justificativa → server RAISE | T-31 V5 | client counter is NOT authority; server `char_length>=50` RAISE | SQL smoke | `oper31_rejeitar_candidatura_smokes.sql` (assert a) | ❌ W0 | ⬜ pending |
| OPER-02 | cross-recruiter reject denied (`insufficient_privilege`/42501) | T-31 V4 (IDOR) | in-RPC `vagas.created_by=auth.uid()` guard | SQL smoke | same file (assert e) | ❌ W0 | ⬜ pending |
| OPER-02 | human reject → `auto_rejeitado=false` (RNF-07a) | T-31 (score) | no score path; `ator=auth.uid()`→false | SQL smoke | same file (assert b) | ❌ W0 | ⬜ pending |
| OPER-01/02/04 | exactly ONE `historico_candidatura` row per transition | T-31 (integrity) | trigger is sole writer; RPC never INSERTs | SQL smoke | same file (assert d) | ❌ W0 | ⬜ pending |
| OPER-03 | regression with empty justificativa → trigger RAISE | T-31 | trigger's regression guard | SQL smoke | same file (assert c) | ❌ W0 | ⬜ pending |
| OPER-02 | dialog confirm disabled until motivo set + btrim≥50 | — | UX mirror of server gate | component | `npx vitest run RejeitarCandidaturaDialog` | ❌ W0 | ⬜ pending |
| OPER-02 | `rejeitarCandidatura` maps RPC error → `TriagemServiceError` | — | N/A | unit | `npx vitest run triagemService` | ⚠️ extend | ⬜ pending |
| OPER-01/03 | `updateCandidaturaEtapa` includes `etapa_justificativa` in UPDATE | T-31 (stale-just.) | always SET `etapa_justificativa` (never stale OLD) | unit | `npx vitest run triagemService` | ⚠️ extend | ⬜ pending |
| OPER-04 | `ComparativoScreen` reject routes to new RPC (not old path) | — | N/A | component | `npx vitest run ComparativoScreen` | ⚠️ rewire | ⬜ pending |
| OPER-01/02/03 | `useRejeitarCandidatura` invalidates the 3 key trees | — | N/A | hook | `npx vitest run useRejeitarCandidatura` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/oper31_rejeitar_candidatura_smokes.sql` — JWT-impersonated: (a) `<50` RAISE, (b) `auto_rejeitado=false`, (c) regression empty→RAISE, (d) exactly 1 `historico_candidatura` row, (e) cross-recruiter denied. RED until the RPC is live.
- [ ] `src/features/triagem/components/__tests__/RejeitarCandidaturaDialog.test.tsx` — gate + counter + btrim behavior
- [ ] `src/features/triagem/hooks/__tests__/useRejeitarCandidatura.test.ts` — invalidation keys
- [ ] Extend `src/features/triagem/services/__tests__/triagemService.test.ts` — `rejeitarCandidatura` + extended `updateCandidaturaEtapa` (currently NOT covered)
- [ ] Rewire `src/features/triagem/components/__tests__/ComparativoScreen.test.tsx` — assert reject uses the new RPC path
- Framework install: none (Vitest present)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end reject/advance/regress against live PROD with a real RH JWT | OPER-01/02/03/04 | Needs a live seeded candidatura + real Supabase Auth session (deferred UAT, per prior-phase precedent) | Log in as RH, open Kanban/perfil/comparativo, exercise each action, confirm the trail row + candidate panel status |

*The 5 SQL assertions cover the server-authoritative invariants without a live session; the UAT is confirmatory.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (5 SQL asserts + 3 new test files + 2 extended)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
