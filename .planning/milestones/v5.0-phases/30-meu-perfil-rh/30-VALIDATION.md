---
phase: 30
slug: meu-perfil-rh
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-13
---

# Phase 30 — Validation Strategy

> SEG-03 behavioral SQL smoke (impersonated JWT) is the load-bearing gate; client service/component tests cover PERFIL-01/02/03. Derived from `30-RESEARCH.md` §Validation Architecture.

## Test Infrastructure
| Property | Value |
|----------|-------|
| Framework | Vitest + RTL (service/component) · SQL behavioral smoke (impersonated JWT, PROD via MCP `execute_sql`) |
| Config | `vite.config.ts` · migrations via Supabase MCP `apply_migration` |
| Quick run | `npm run test:run` · Type-check `npm run lint` (tsc ≤ frozen baseline 104) |

## Sampling Rate
- Per task commit: `npm run test:run` (scoped).
- Per wave: full Vitest + `npm run lint` (tsc ≤104) + relevant SQL smoke on PROD.
- Phase gate: full suite green + tsc ≤104 + build 0 + SEG-03 smoke GREEN before verify/secure.

## Per-Requirement Verification Map
| Req | Behavior | Test type | Command | Status |
|-----|----------|-----------|---------|--------|
| SEG-03 | `atualizar_meu_perfil_rh` updates ONLY the caller's own row (WHERE user_id=auth.uid()); a 2nd user's row is untouched | SQL smoke (impersonated recrutador JWT) | PROD smoke | ⬜ |
| SEG-03 | The RPC cannot set role/ativo (not in SET) — caller role unchanged after any args; recrutador direct `UPDATE usuarios_rh SET role='administrador'` still affects 0 rows (Phase-28 WR-01 regression) | SQL smoke | PROD smoke | ⬜ |
| SEG-03 | No client UPDATE RLS policy on `usuarios_rh` (Phase-28 state preserved) | SQL assertion (`pg_policies`) | PROD smoke | ⬜ |
| PERFIL-01 | `perfilRhService.atualizarPerfil` calls `rpc('atualizar_meu_perfil_rh')`; own-row read allowlist `.select().eq('user_id', uid)` (never `select('*')`) | service unit (mocked) | `npm run test:run` | ⬜ |
| PERFIL-02 | change-password: `signInWithPassword(email, current)` → `updateUser({password:new})`; wrong current → field error; new≠current/min8/confirm enforced; no logout | service + component unit | `npm run test:run` | ⬜ |
| PERFIL-03 | `validateAvatar` rejects >2MB + non-png/jpeg/webp; `uploadAvatar` → `{uid}/avatar.<ext>` upsert; avatar_url persists the PATH; render via createSignedUrl | service unit | `npm run test:run` | ⬜ |
| a11y | labels/aria per field, role="alert" errors, keyboard avatar upload, AA contrast (Phase-29 values, no text-white/50) | RTL + axe Tier-A | `npm run test:run` | ⬜ |
| Pitfall-7 | no password/token/signed-URL in any console.* on perfil-rh surfaces | grep guard | `npm run test:run` | ⬜ |

## Wave 0 Requirements
- [ ] Light live-state capture: confirm `usuarios_rh` has NO client UPDATE policy + own-row SELECT present + `avatar_url` column; `log_auditoria` signature; no existing `atualizar_meu_perfil_rh`. → `30-LIVE-STATE.md`.
- [ ] `perfilRhService.test.ts` (own-row read allowlist + RPC dispatch), change-password service test, avatar upload/validate test, Pitfall-7 grep extension.
- [ ] SEG-03 SQL smoke (own-row-only + role-unchanged + WR-01 regression) — impersonated JWT, disposable fixtures, cleanup.

## Manual-Only Verifications (→ HUMAN-UAT)
| Behavior | Requirement | Why manual |
|----------|-------------|------------|
| Real password change → re-login works with new password, session not dropped | PERFIL-02 | Live GoTrue round-trip |
| Real avatar upload → signed-URL renders the image | PERFIL-03 | Live storage round-trip |
| Visual/glass/AA sweep on the live profile page | UI-SPEC | Human/axe live |

---
*Nyquist: PERFIL-01/02/03 + SEG-03 each map to a smoke/test above. `nyquist_compliant` flips true when Wave 0 lands the harness.*
