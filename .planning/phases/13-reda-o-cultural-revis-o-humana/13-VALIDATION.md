---
phase: 13
slug: reda-o-cultural-revis-o-humana
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-23
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 13-RESEARCH.md §Validation Architecture. The planner fills the
> Per-Task Verification Map + Wave 0 requirements from the research.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (frontend/services) + Deno test (Edge Functions) |
| **Config file** | vitest.config.ts ; deno test per-function |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run` + `deno test --allow-read --allow-env supabase/functions/avaliar-redacao-cultural/` + SQL smokes |
| **Estimated runtime** | ~30-60 seconds (vitest) + EF deno + manual SQL smokes |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (scoped to touched feature where possible)
- **After every plan wave:** Run full suite + relevant deno EF tests
- **Before `/gsd:verify-work`:** Full suite green + SQL smokes PASS
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

> Filled by the planner from 13-RESEARCH.md §Validation Architecture (AVAL-05/06/07).
> Wave 0 lands RED tests for: EssayScoringV1 schema (4 BARS + caps + 3-color), the
> deterministic computeScoreAndCors, the new EF authz (IDOR/RNF-07a), candidate
> allowlist (no verdict columns), the review-fields-only UPDATE trigger, and the
> autosave/word-count gates.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | AVAL-05/06/07 | T-13-* | (planner) | unit/contract/SQL | `npm run test:run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Enumerated by the planner. Expected coverage (from research):
- [ ] EssayScoringV1 Zod schema contract test (4 dims D1-D4 + red_flag_etico + caps + 3-color)
- [ ] computeScoreAndCors determinism test (PRD §8.3 reference cases)
- [ ] New EF authz test (authenticate≠authorize: non-owner → 403; RNF-07a never-reject)
- [ ] Candidate allowlist test (read projection excludes all verdict/BARS/color columns)
- [ ] redacoes_candidato review-fields-only UPDATE trigger test
- [ ] Candidate essay autosave + 200-500 hard min/max word-count gate test

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live AI essay scoring end-to-end (real Anthropic call) | AVAL-06 | Needs real candidate essay + live EF + API key | Human UAT: submit a real essay, confirm EssayScoringV1 persisted + 3-color + pendente_humano |
| RH reviewer override + escalation flow | AVAL-07 | Needs RH session + queued essay | Human UAT: override sliders, write ≥50-char note, test aprovado/reprovado/duvida→gestor |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
