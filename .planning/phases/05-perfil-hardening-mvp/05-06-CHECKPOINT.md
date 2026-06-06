---
plan: 05-06
status: paused-at-blocking-checkpoint
phase: 05-perfil-hardening-mvp
parked: 2026-06-06
tasks_done: 2          # code + tests committed
tasks_pending: 2       # both require human action
resume_owner: human (Fernando)
---

# 05-06 — PARKED at blocking human checkpoint (resume later)

PKCE→OTP password-recovery migration. **All code is implemented, tested, and committed.**
Only the two human gates below remain. The phase (Phase 5) is NOT complete until these pass
and the continuation finalizes 05-06-SUMMARY.md.

## Committed (done)
- `b67f87e` feat(05-06): OTP recovery service (`verifyRecoveryOtp`) + 6-digit token schema (D-15)
- `87c5811` feat(05-06): OTP recovery UI + perfil change-password `<form>` a11y + E2E rewrite
- `680b52d` docs(05-06): deferred-items log (`/vagas` a11y contrast flake, out of scope)

Verified: 33/33 service+schema tests pass; `e2e/password-recovery-flow.spec.ts` 6 pass/1 Tier-2 skip
(0 test.fixme); `e2e/a11y.spec.ts` recovery routes zero WCAG A/AA violations (05-04 gate not regressed);
`src/lib/supabase/client.ts` flowType:'pkce' untouched; build exit 0; lint baseline 292 held.

## ⚠ IMPORTANT — current state is half-migrated
The client now expects the recovery email to contain `{{ .Token }}` (6-digit OTP), but the LIVE
Supabase "Reset Password" template still sends the magic link (`{{ .ConfirmationURL }}`). Password
recovery will NOT work end-to-end until Task 3 below is done. (Safe for now — this code lives on the
`backup/local-state-2026-04` branch and is not deployed to prod.)

## Task 3 [BLOCKING human-action] — edit Supabase email template
Dashboard → project `isljnozzlvckrgjjbjwp` → Authentication → Email Templates → "Reset Password" (Recovery).
Paste a body that surfaces the 6-digit code (`{{ .Token }}` IS the OTP), then Save:

```html
<h2>Redefinição de senha — Beauty Smile</h2>
<p>Use o código de 6 dígitos abaixo para redefinir sua senha:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:16px 0;">{{ .Token }}</p>
<p>Digite este código na tela "Nova senha" do aplicativo, junto com a sua nova senha.</p>
<p>O código expira em 1 hora. Se você não solicitou esta redefinição, ignore este email.</p>
```
Keep OTP expiry at 3600s. (`{{ .ConfirmationURL }}` may remain as a secondary link.)

## Task 4 [BLOCKING human-verify] — real-email cross-browser UAT
1. Browser A: `/auth/esqueci-senha` → real email → "Enviar instruções".
2. Open email → confirm it shows a 6-digit code.
3. Browser B (different browser/device): `/auth/redefinir-senha` → email + code + new password → "Redefinir senha".
4. Confirm accepted, lands on `/candidato/perfil`, and the new password logs in CROSS-BROWSER (the PKCE failure mode is gone).
5. On `/candidato/perfil`, confirm the "Alterar Senha" widget is inside a `<form>` and submits.

## To resume
`npm run build && npm run preview` (serves on :4173). Do Task 3, then Task 4. Once both pass,
finalize: write `05-06-SUMMARY.md`, update STATE/ROADMAP/REQUIREMENTS (HARD-04), then run the
Phase 5 verification (`/gsd-verify-work 5` or the execute-phase verify step). Requirement HARD-04
also has coverage in 05-04; 05-06 adds the perfil change-password `<form>` part.
