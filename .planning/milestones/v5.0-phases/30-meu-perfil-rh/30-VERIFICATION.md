---
phase: 30-meu-perfil-rh
verified: 2026-07-14T05:23:46Z
status: human_needed
score: 4/4 must-haves verified (code + PROD-smoke level; live round-trips deferred to human)
overrides_applied: 0
human_verification:
  - test: "Password change (PERFIL-02) at /rh/perfil → Senha: wrong current password shows a field error; correct current + valid new → success toast, session NOT dropped, re-login works with the new password."
    expected: "Wrong current rejected inline on 'Senha atual'; correct current rotates the password on the live session without logout; new password authenticates on next login."
    why_human: "Live GoTrue re-auth + password rotation round-trip against the real Supabase Auth service — cannot be exercised by grep/vitest (mocks both sides of the boundary)."
  - test: "Avatar upload (PERFIL-03): upload a ≤2MB png/jpeg/webp → preview + signed-URL renders; the photo appears in the RH shell (top bar/sidebar) panel-wide; >2MB / wrong type rejected."
    expected: "Upload lands in the private avatars-rh bucket at {uid}/avatar.<ext>; signed URL renders the circular preview and the panel-wide shell avatar; oversize/wrong-mime rejected."
    why_human: "Live private-storage upload + signed-URL image render is a browser/network round-trip; RLS own-folder read cannot be confirmed programmatically here."
  - test: "Name propagation (PERFIL-01, Success Criterion #1): edit the display name → it persists and appears across the RH panel chrome (top bar + sidebar) WITHOUT a re-login."
    expected: "New nome_completo persists via the RPC and immediately surfaces in RHTopBar + RHSidebar (setAdminUser refresh) with no logout/login cycle."
    why_human: "The 'appears panel-wide without re-login' outcome is a live visual/state observation across the running SPA shell."
  - test: "Visual / AA sweep: axe-core Tier-A on the live profile page; confirm the glass admin theme + AA badge/text contrast (Phase-29 values)."
    expected: "No Tier-A axe violations; glass theme + AA contrast on badges/inputs/text."
    why_human: "Visual appearance + accessibility contrast are not verifiable via static analysis."
---

# Phase 30: Meu Perfil RH Verification Report

**Phase Goal:** Cada usuário RH gerencia o próprio perfil em `/rh/perfil` — edita nome (persiste + aparece no painel RH), troca a própria senha com re-autenticação, faz upload da própria foto — SEM jamais poder escalar papel (SEG-03).
**Verified:** 2026-07-14T05:23:46Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | **PERFIL-01** — RH edita o próprio nome; persiste e aparece ao longo do painel RH | ✓ VERIFIED (code); live visual → HUMAN-UAT #3 | RPC `atualizar_meu_perfil_rh` SET `nome_completo` (migration L67). `useAtualizarPerfil.onSuccess` merges edited fields → `setAdminUser` (usePerfilRh.ts:95-108) so chrome updates without re-login. `RHTopBar.tsx:32` + `RHSidebar.tsx:51` read `adminUser?.nome_completo`. |
| 2 | **PERFIL-02** — RH troca a própria senha só após senha atual correta; errada é rejeitada (re-auth) | ✓ VERIFIED (code); live round-trip → HUMAN-UAT #1 | `alterarSenha` calls `signInWithPassword(current)` BEFORE `updateUser({password})` (perfilRhService.ts:186-201); wrong current → typed `WRONG_CURRENT` → field error on "Senha atual" (SenhaSection.tsx:62-64). No logout. |
| 3 | **PERFIL-03** — RH faz upload/troca da própria foto em storage privado own-row RLS, exibida | ✓ VERIFIED (code); live upload+render → HUMAN-UAT #2 | Private `avatars-rh` bucket + 4 own-folder policies `(storage.foldername(name))[1] = auth.uid()` (migration L125-189). `uploadAvatar` → `{uid}/avatar.<ext>` upsert; `getAvatarSignedUrl` (1h). Rendered in AvatarUpload + shell (RHTopBar/RHSidebar signed-url query). |
| 4 | **SEG-03** — nenhuma ação self-service (UI/API/RLS) escreve `role`; recrutador não se auto-promove | ✓ VERIFIED | RPC SET list column-limited to `nome_completo`/`avatar_url` — `role/ativo/cargo/email` physically absent (migration L66-72). `grep` for client `.update/.upsert/.insert` on `usuarios_rh` → **NONE**. PerfilSection test asserts NO role/cargo/email affordance. SEG-03 smoke (5 cases) GREEN on PROD (30-07). 0 `cmd=UPDATE` policies on `usuarios_rh`. |

**Score:** 4/4 truths verified at code + PROD-smoke level. Live GoTrue/storage/visual round-trips deferred to HUMAN-UAT (not gaps — per phase design; these paths call the real Supabase Auth/Storage services).

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/features/perfil-rh/services/perfilRhService.ts` | own-row allowlist read · RPC dispatch · password re-auth · avatar upload/sign | ✓ VERIFIED | 302 lines. Allowlist `.select(PERFIL_RH_COLUMNS).eq('user_id', uid)` (no `select('*')`). Re-auth-before-rotate. Pitfall-7 redacted logs. Wired to hooks + shell. |
| `src/features/perfil-rh/hooks/usePerfilRh.ts` | query + 3 mutations + authStore refresh | ✓ VERIFIED | `useAtualizarPerfil` refreshes `setAdminUser` (Success Criterion #1). Wired to service + UI. |
| `src/features/perfil-rh/schemas/perfilRhSchemas.ts` | name + change-password zod | ✓ VERIFIED | `perfilNomeSchema` (3–255), `alterarSenhaSchema` (min 8, match, differ). Wired via zodResolver. |
| `src/features/perfil-rh/components/PerfilSection.tsx` | name + avatar + read-only SEG-03 context | ✓ VERIFIED | Only editable field is `nome_completo`; email/cargo/role as read-only `<dd>`. Wired in MeuPerfilPage. |
| `src/features/perfil-rh/components/SenhaSection.tsx` | 3 password fields + re-auth flow | ✓ VERIFIED | `mutateAsync` + try/catch routes WRONG_CURRENT/WEAK_PASSWORD to fields. |
| `src/features/perfil-rh/components/AvatarUpload.tsx` | signed preview + file input + a11y | ✓ VERIFIED | Real focusable button + hidden labeled input; validates before upload; aria-live status. |
| `src/components/pages/MeuPerfilPage.tsx` | stub replaced, RHLayout/route/RoleGuard preserved | ✓ VERIFIED | "em breve" empty-state gone; renders PerfilSection + SenhaSection under AsyncState. |
| `src/components/RHTopBar.tsx` / `RHSidebar.tsx` | identity from `adminUser` (name+avatar propagate) | ✓ VERIFIED | Both read `adminUser?.nome_completo` + `adminUser?.avatar_url` → signed-url avatar query. |
| `supabase/migrations/20260714000001_perfil_rh_rpc_avatars.sql` | DEFINER RPC + private bucket + 4 own-folder policies | ✓ VERIFIED | Column-limited SET (SEG-03), COALESCE avatar, uid-scoped. Applied to PROD (types regen picked up the RPC; SEG-03 smoke GREEN in 30-07). |
| `supabase/tests/perfil_rh_seg03_smoke.sql` | behavioral SEG-03 smoke | ✓ VERIFIED | 5 real behavioral cases (own-row/IDOR · role-untouched · COALESCE · WR-01 · 0 UPDATE policies). GREEN on PROD (30-07). |
| `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` | redaction guard extended to perfil-rh | ✓ VERIFIED | Covers `src/features/perfil-rh/{services,hooks,components,schemas}` for password/token/signed-URL leaks. |

### Key Link Verification

| From | To | Via | Status |
| --- | --- | --- | --- |
| routes.tsx | MeuPerfilPage | lazy import + `/rh/perfil` + RoleGuard(rh/administrador) | ✓ WIRED |
| MeuPerfilPage | perfilRhService.readMeuPerfil | usePerfilRh (own-row allowlist) | ✓ WIRED |
| PerfilSection | atualizar_meu_perfil_rh RPC | useAtualizarPerfil → atualizarPerfil | ✓ WIRED |
| useAtualizarPerfil.onSuccess | authStore.setAdminUser | merge nome/avatar (no re-login) | ✓ WIRED |
| RHTopBar / RHSidebar | adminUser.nome_completo + getAvatarSignedUrl | useAuthStore selector + signed-url query | ✓ WIRED |
| SenhaSection | GoTrue re-auth | useAlterarSenha → signInWithPassword→updateUser | ✓ WIRED |
| AvatarUpload | avatars-rh bucket | useUploadAvatar → uploadAvatar (own-folder) | ✓ WIRED |
| client write to usuarios_rh | (none — DEFINER RPC only) | grep `.update/.upsert/.insert` → NONE | ✓ WIRED (SEG-03: no client write path) |

### Behavioral Spot-Checks (Gates re-run independently)

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full test suite | `npm run test:run` | 111 files, 877 tests passed | ✓ PASS (expected 877/877) |
| Type-check | `npm run -s lint \| grep -c "error TS"` | 104 | ✓ PASS (≤104 baseline) |
| Production build | `npm run build` | exit 0; PERF-03 chunk assertions passed | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| --- | --- | --- | --- |
| SEG-03 behavioral smoke | `perfil_rh_seg03_smoke.sql` (PROD-only, MCP/SQL-editor) | 5/5 PASS on PROD per 30-07-SUMMARY; file is a real behavioral test (asserts touched rows/columns, not pg_policies metadata) | ✓ PASS (live — re-run requires PROD access outside verifier toolset) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| PERFIL-01 | 30-03/04/05 | RH edita o próprio nome | ✓ SATISFIED (code); live visual → human | RPC + authStore refresh + shell read |
| PERFIL-02 | 30-04/05 | RH troca a própria senha (re-auth) | ✓ SATISFIED (code); live round-trip → human | signInWithPassword→updateUser + WRONG_CURRENT field error |
| PERFIL-03 | 30-03/04/05 | Upload da própria foto (storage privado own-row) | ✓ SATISFIED (code); live upload/render → human | private bucket + 4 own-folder policies + signed-url render |
| SEG-03 | 30-02/03 | Self-service nunca altera `role` | ✓ SATISFIED | column-limited RPC + zero client write + smoke GREEN + no UI affordance |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| (none) | — | Debt-marker/stub scan on all Phase-30 files | ℹ️ Info | NONE FOUND. Only `console.log({ hasPassword })` / `{ sizeKb, mime, hasFile }` — Pitfall-7-safe redacted logs; no password/token/signed-URL logged. |
| routes.tsx / ROADMAP | — | Route path naming | ℹ️ Info | ROADMAP Goal text (line 73) says `/rh/meu-perfil`; the wired route + nav is `/rh/perfil`. Cosmetic naming difference — the requirement (own-profile route) is met; not a gap. |

### Human Verification Required

Harvested from `30-HUMAN-UAT.md` (deferred live GoTrue/storage/visual round-trips — explicitly designed as end-of-phase live UAT, NOT gaps). Account: `e2e.admin@beautysmile.com.br` (+ first recrutador from Phase 29).

1. **Password change (PERFIL-02)** — wrong current rejected inline; correct current + valid new → success toast, no logout, re-login with new password works.
2. **Avatar upload (PERFIL-03)** — ≤2MB png/jpeg/webp uploads, signed-URL preview renders, photo appears panel-wide; oversize/wrong-type rejected.
3. **Name propagation (PERFIL-01, SC#1)** — edited display name persists and appears across top bar + sidebar without re-login.
4. **Visual / AA sweep** — axe-core Tier-A on live profile page; glass theme + AA contrast.

### Gaps Summary

No gaps. All four ROADMAP success criteria (PERFIL-01/02/03 + SEG-03) are verified at the code + PROD-smoke level:
- The self-service write path is a single column-limited SECURITY DEFINER RPC; there is **no** client UPDATE/INSERT/UPSERT to `usuarios_rh` anywhere in `src/`, no editable role/cargo/email control in the UI, and the SEG-03 behavioral smoke (own-row/IDOR, role-untouched, COALESCE, WR-01 self-promotion, 0 UPDATE policies) is GREEN on PROD.
- Name/avatar propagate through `setAdminUser` into the shared RH shell without a re-login.
- Independent gates re-run clean: **877/877 tests, 104 TS errors (≤104), build exit 0**.

Status is `human_needed` solely because the live GoTrue password round-trip, live private-storage avatar upload/render, panel-wide visual propagation, and AA sweep require a running browser against the real Supabase services — these are deferred live confirmations (30-HUMAN-UAT.md), not implementation gaps.

---

_Verified: 2026-07-14T05:23:46Z_
_Verifier: Claude (gsd-verifier)_
