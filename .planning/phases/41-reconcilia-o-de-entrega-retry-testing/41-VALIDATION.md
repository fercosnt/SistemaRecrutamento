---
phase: 41
slug: reconcilia-o-de-entrega-retry-testing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-26
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Deno test (EFs) + Vitest (src utils, se houver) |
| **Config file** | `supabase/functions/deno.json` (EFs); `vitest.config.ts` (src) |
| **Quick run command** | `deno test supabase/functions/resend-webhook/ supabase/functions/notificar-candidato/` |
| **Full suite command** | `deno test supabase/functions/ && npm run test:run` |
| **Estimated runtime** | ~30–60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick command for the touched EF
- **After every plan wave:** Run the full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (a preencher pelo planner/nyquist-auditor a partir dos PLAN.md) | — | — | RECON-01/02/03 | — | — | unit | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Refatorar `notificar-candidato/index.ts` para deps injetáveis (fetch/createClient) — pré-req do mock do Resend em CI (gap identificado na RESEARCH.md)
- [ ] Stubs/fixtures de teste para o webhook (payload delivered/bounced/complained + headers Svix) e para o modo retry
- [ ] `deno test` roda sem `--allow-net` (prova de que o Resend está mockado)

*Preenchido em detalhe pelo planner; este é o esqueleto Nyquist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UAT ao vivo delivered@/bounced@/complained@resend.dev | RECON-02, RECON-03 | Exige domínio verificado (DELIV-01 aberto) + registro do webhook no dashboard Resend | Deferido atrás de DELIV-01; ver 41-HUMAN-UAT quando gerado |

*Reconciliação real de entrega/bounce/complaint só fecha após DELIV-01.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
