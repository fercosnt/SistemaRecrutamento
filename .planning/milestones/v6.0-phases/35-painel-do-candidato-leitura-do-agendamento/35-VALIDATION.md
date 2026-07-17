---
phase: 35
slug: painel-do-candidato-leitura-do-agendamento
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-17
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (already installed) |
| **Config file** | vitest.config.ts (existing) |
| **Quick run command** | `npx vitest run src/features/agendamento src/lib/datetime` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~20s full suite; <3s scoped |

---

## Sampling Rate

- **After every task commit:** Run the scoped quick command for the touched feature
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd:verify-work`:** Full suite must be green (980+ baseline)
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

> Planner fills this from the RESEARCH.md "Validation Architecture" section. The three pure functions are the primary test seams (all unit-testable, no network):
> 1. `.ics` builder (VCALENDAR/VEVENT string) — deterministic string output given a fixed agendamento + fixed clock
> 2. ≤24h "upcoming & not-cancelled" predicate — boundary cases (now, +23h59m, +24h01m, past, cancelada)
> 3. SP-timezone formatter `formatDataHoraSP` — fixed instant → `dd/mm/aaaa às hh:mm` in America/Sao_Paulo

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _to be filled by planner_ | | | AGEND-04/05 | SEG-03 (allowlist read, no PII leak) | candidate reads only the 7 allowlist cols via DEFINER RPC; never observacoes_rh | unit | `npx vitest run …` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Unit test file(s) for the `.ics` builder, the ≤24h predicate, and the SP-timezone formatter (the three pure functions from RESEARCH Validation Architecture)
- [ ] Service test asserting the candidate read goes through `rpc('get_meu_agendamento')` and the typed Row exposes ONLY the 7 allowlist columns (never `observacoes_rh`/`entrevistador`/`vaga_id`, never `select('*')`)

*Existing vitest infrastructure covers everything else — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card renders in the candidate dashboard with correct SP time, clickable link/local, and the ≤24h badge; `.ics` downloads and imports into a real calendar | AGEND-04/05 | Visual rendering + real file-download + calendar-import + real candidate login are browser-only | Log in as the seeded candidate with an entrevista-stage candidatura; open /candidato/dashboard; verify the card, badge, and `.ics` download/import |

*The three pure functions above all have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
