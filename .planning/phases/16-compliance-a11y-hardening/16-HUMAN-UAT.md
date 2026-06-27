---
status: partial
phase: 16-compliance-a11y-hardening
source: [16-VERIFICATION.md]
started: 2026-06-26T13:57:04Z
updated: 2026-06-26T13:57:04Z
---

## Current Test

[live 2026-06-26 — item #1 PASS; #2/#3/#4 ainda pendentes]

## Resultado da sessão live 2026-06-26

- **#1 RH cold-start login: ✅ PASS** — `recruiter@teste.com` (admin) e
  `recrutador.rh@teste.com` (role rh) logam em `/rh/dashboard` sem o bounce "sem acesso
  ao painel RH". O login RH também foi provado end-to-end via GoTrue API (JWT
  `app_metadata.role` = administrador / rh; o auth-hook RLS chain já estava aplicado em
  PROD). LoginRHPage race+gate fix (464ead8) confirmado.
- **#2 / #3 / #4** (axe Tier-B em R5/C5, teclado roving-focus, screen-reader aria-live):
  pendentes — exigem sweep com login real + leitor de tela.

## Tests

### 1. RH cold-start login round-trip (LoginRHPage race+gate fix)
expected: After an idle period (COLD-START — the stress case for the widened 3s poll window), go to `/auth/login-rh`. (a) Log in with a real `recrutador` (role 'rh') account → land on `/rh/dashboard`, NOT bounced to /vagas with "Esta conta não tem acesso ao painel RH." (b) Log in with a real `administrador` account → same (no false "sem acesso" bounce). (c) In devtools, inspect JWT `app_metadata.role` (or authStore role) → confirm it is 'rh' or 'administrador' respectively. The frontend fix is committed (464ead8: poll widened 5×20ms=100ms → 60×50ms=3s for the cold-DB usuarios_rh fetchProfile hydration race; gate widened admin-only → {rh, administrador}). NO new migration — the usuarios_rh RLS+grant+hook chain is already PROD-verified (CONTEXT fact #1). Code review confirmed the poll loop is a properly throttled async poll (not a busy-wait) and the widened gate boolean is correct. The ONLY remaining gate is the live round-trip — no real RH account was available in-session.
result: [pending]

### 2. Tier-B R5 (RedacaoReviewPanel) + C5 (BigFiveQuestionnaireScreen) live axe sweep
expected: Run `E2E_REAL_LOGIN=1 npx playwright test e2e/a11y.spec.ts --project=chromium` against seeded live state — R5 needs a live `redacoes_candidato` + review state; C5 needs a live BigFive 120-Likert + scores. Confirm axe-core reports zero serious/critical (WCAG AA) on both. These are Tier-B by design (the documented A1 assumption — axe under-tests heavy live screens, so they are skip-with-reason in the unconditional Tier-A gate and need a real-login E2E run). The 15 Tier-A screens already pass GREEN unconditionally in CI.
result: [pending]

### 3. Keyboard roving-focus on the migrated Radix Tabs/RadioGroup (AB-5/AB-6)
expected: With a real keyboard (no mouse), tab to the migrated controls and confirm: (a) DecisaoFinalPage / EntrevistaWorkspace Tabs — arrow keys move between tabs, Enter/Space activates, focus ring visible on the glass background; (b) RegistrarDecisaoForm decision RadioGroup + SjtMultiplaEscolha option groups — ArrowUp/Down/Left/Right move selection (roving focus), visible focus indicator at the composited glass background. axe does not model keyboard event routing or focus-ring visibility, so this is a sighted manual check.
result: [pending]

### 4. BigFive autosave aria-live announce (AB-8)
expected: With a screen reader active (VoiceOver/NVDA), interact with the BigFive questionnaire and any autosave-bearing surface and confirm any "Salvo automaticamente" / save-state change is announced via an aria-live region (not silent). Note: ProvaCognitivaScreen took the softened-copy FX-13 branch (no autosave there — copy no longer promises persistence), so this item applies to surfaces that DO autosave. axe does not test live-region announcements, so this is a screen-reader manual check.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

<!-- None — these are deferred human-verification items (no real RH account / live PROD data / sighted-keyboard / screen-reader in-session), NOT failed must-haves. All 10/10 automated must-haves verified (16-VERIFICATION.md). -->
