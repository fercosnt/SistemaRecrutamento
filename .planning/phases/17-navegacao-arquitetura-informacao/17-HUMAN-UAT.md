---
status: partial
phase: 17-navegacao-arquitetura-informacao
source: [17-VERIFICATION.md]
started: 2026-06-28T00:00:00Z
updated: 2026-06-28T00:00:00Z
---

## Current Test

[awaiting human testing — requires live auth: an `administrador` credential + a seeded candidatura]

## Setup

All 4 gated journeys need real-auth env vars in `.env.test`, then `npx playwright test navegacao`:

```
E2E_AUTH_TEST_USERS=true
TEST_USER_EMAIL=…            # candidato
TEST_USER_PASSWORD=…
TEST_ADMIN_EMAIL=…           # administrador
TEST_ADMIN_PASSWORD=…
E2E_CANDIDATURA_ID=…         # seeded candidatura (for J1, ideally at etapa avaliacao_assincrona)
E2E_VAGA_ID=…
```

(The unconditional J4/404 journey + all unit specs already pass automated.)

## Tests

### 1. J1 — candidato → Dashboard step-CTA → avaliação
expected: Login as test candidato → lands on `/candidato/dashboard` (ROLE_HOME repointed, D-09). Click "Continuar para Avaliação Assíncrona" → URL becomes `/candidato/avaliacao/:id`. For a non-routable stage the neutral "Acompanhar candidatura" CTA stays on `/candidato/dashboard`.
result: [pending]

### 2. J2 — RH TriagemTable → hub → each of the 3 workspaces
expected: Login as administrador → click a candidate row in TriagemTable (SPA Link carrying `row.id` = candidaturaId) → hub heading renders → dominant CTA opens the current-stage workspace (entrevista/decisão) → the "Abrir workspace de redação" CTA opens `/rh/candidato/:id/redacao` (RedacaoReviewPanel). Validates D-04 + the redação-reachability fix (commit bbeab99).
result: [pending]

### 3. J3 — Admin sidebar → /admin/*
expected: Login as administrador → "Admin" (ShieldCheck) item visible in the RH sidebar → click → `/admin/ai-logs`. The item is ABSENT for the `rh` role (cosmetic gate; RoleGuard + RLS are the real control).
result: [pending]

### 4. Hub data sections — per-candidate scope + step-guided states
expected: Open a candidate's hub → the Redação section reflects ONLY this candidatura's data, not the whole-vaga queue (WR-01 fix). Future stages show "Etapa ainda não iniciada"; the current stage shows the dominant turquoise "Abrir {label}" CTA; no hardcoded/invented values anywhere (D-07).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
