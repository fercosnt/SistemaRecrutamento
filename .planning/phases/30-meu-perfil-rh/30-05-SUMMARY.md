---
phase: 30-meu-perfil-rh
plan: 05
subsystem: perfil-rh
tags: [perfil-rh, ui, rhf-zod, seg-03, avatar, password-reauth, shell-identity]
requires:
  - "30-04 (perfilRhService + usePerfilRh hooks + perfilRhSchemas — the consumed data layer)"
  - "authStore.setAdminUser (routes a nome_completo-bearing UsuarioRHRow into adminUser/profile/role)"
  - "AsyncState (M3 5-state wrapper) · GlassCard/Glass · Phase-29 bare-RHF idiom"
provides:
  - "the real /rh/perfil page: name edit + avatar upload + password re-auth + read-only SEG-03 context"
  - "RH panel chrome (RHTopBar + RHSidebar) identity from adminUser.nome_completo + signed avatar (no re-login)"
affects:
  - "src/components/pages/MeuPerfilPage.tsx (stub → real)"
  - "src/components/RHTopBar.tsx + src/components/RHSidebar.tsx (shell identity source)"
tech-stack:
  added: []
  patterns:
    - "bare RHF register/Controller + zodResolver (NOT shadcn Form-field — Phase-29 parity, grep-guarded)"
    - "avatar auto-save ALWAYS carries the loaded nome (WARNING #3 — unconditional RPC SET never blanks nome_completo)"
    - "SEG-03 read-only context as a definition-list (no input/select/button for role/cargo/email)"
    - "shell avatar signed via useQuery (staleTime 55min, never logged — Pitfall-7)"
key-files:
  created:
    - "src/features/perfil-rh/components/AvatarUpload.tsx"
    - "src/features/perfil-rh/components/PerfilSection.tsx"
    - "src/features/perfil-rh/components/SenhaSection.tsx"
    - "src/features/perfil-rh/components/__tests__/PerfilSection.test.tsx"
    - "src/features/perfil-rh/components/__tests__/SenhaSection.test.tsx"
    - "src/components/__tests__/RHShellIdentity.test.tsx"
  modified:
    - "src/components/pages/MeuPerfilPage.tsx"
    - "src/components/RHTopBar.tsx"
    - "src/components/RHSidebar.tsx"
    - "src/components/__tests__/RHSidebar.admin.test.tsx (Rule 1 regression fix)"
decisions:
  - "Avatar auto-saves on upload (not deferred to the Salvar submit) — carrying getValues('nome_completo') || loaded nome, so an avatar-only save can never blank nome_completo."
  - "SEG-03 rendered as a <dl> read-only context (Email/Cargo/Papel + honest 'geridos por um administrador' note + non-interactive Papel Badge) — the component test asserts the ABSENCE of any papel/cargo/email textbox/combobox/button."
  - "WRONG_CURRENT / WEAK_PASSWORD / generic failures routed to inline field errors (form stays open, session preserved) — no toast for the field error (the hook owns only the success toast)."
  - "Shell avatar signed via useQuery in each shell (not a shared hook) to stay within the plan's listed files; both shells now require a QueryClientProvider in tests."
metrics:
  duration_min: 7
  tasks: 3
  files: 10
  completed: 2026-07-14
---

# Phase 30 Plan 05: Meu Perfil RH — Profile UI + Shell Identity Propagation Summary

The real `/rh/perfil` page is live in code: a Perfil section (name edit + avatar upload + read-only SEG-03 context with NO role affordance), a Senha section (password change via GoTrue re-auth that keeps the session valid), composed under the single existing RHLayout/route/RoleGuard — and the edited name/avatar now propagate across the RH panel chrome (topbar + sidebar) WITHOUT a re-login.

## What was built

**Task 1 — AvatarUpload + PerfilSection (commit `2061e90`)**
- `AvatarUpload.tsx`: circular signed-URL preview (`getAvatarSignedUrl` via `useQuery`, staleTime 55min) with an initials-disc fallback; a real focusable `<button>` "Alterar foto" that triggers a visually-hidden but `aria-label`-ed `<input type=file accept="image/png,image/jpeg,image/webp">`; uploading spinner + `aria-live="polite"` status; honest helper "PNG, JPG ou WebP, até 2 MB."; `alt="Foto de perfil de {nome}"`. `validateAvatar` runs BEFORE upload → inline field error on FILE_TOO_LARGE / INVALID_MIME. It bubbles ONLY the returned storage PATH up via `onUploaded`.
- `PerfilSection.tsx`: bare RHF + `zodResolver(perfilNomeSchema)` "Nome de exibição" input (AA styling, inline `role="alert"`), the AvatarUpload block, and a READ-ONLY `<dl>` rendering Email / Cargo / Papel (label `text-white/60`, value `text-white/70`) + the honest note "Papel e cargo são geridos por um administrador." + a non-interactive Papel Badge (white on `#35BFAD/20`). Single turquoise "Salvar" CTA. **WARNING #3**: an avatar upload auto-saves via `atualizar.mutate({ nome: <loaded/edited nome>, avatarPath })` so the unconditional RPC SET never blanks `nome_completo`.
- `PerfilSection.test.tsx` (5/5): name save dispatch · **SEG-03 no-affordance** (no `textbox`/`combobox`/`button` for papel|cargo|email) · avatar-carries-loaded-nome · invalid-mime inline error.

**Task 2 — SenhaSection + wire MeuPerfilPage (commit `f4fab7a`)**
- `SenhaSection.tsx`: bare RHF + `zodResolver(alterarSenhaSchema)`, three `type="password"` fields, turquoise "Alterar senha" CTA. Reads the caller's own email from the loaded profile (never a field). WRONG_CURRENT → `setError('senha_atual', 'Senha atual incorreta.')`, form stays open, other fields preserved; success → hook toasts + fields cleared; NO logout, no invented "email de confirmação" copy. Passwords never rendered/logged.
- `MeuPerfilPage.tsx`: stub replaced — single RHLayout owner + kept header, `max-w-3xl space-y-6` body gated by `<AsyncState>` (own-row load), then `<PerfilSection>` + `<SenhaSection>` stacked. The old "Edição de perfil em breve" string is gone; `routes.tsx` untouched.
- `SenhaSection.test.tsx` (6/6): re-auth dispatch · WRONG_CURRENT field + form-open + no-signOut · Zod guards (nova<8 / mismatch / nova===atual block the invoke).

**Task 3 — Shell identity propagation (BLOCKER) (commit `e5acabb`)**
- `RHTopBar.tsx` + `RHSidebar.tsx`: subscribe to `adminUser` and derive `userName = adminUser?.nome_completo || candidato?.nome_completo || user?.email?.split('@')[0] || 'Usuário'` (email prefix is now the LAST-resort fallback — previously the RH chrome always showed the email prefix because `candidato` is null for an RH user). Both render `adminUser?.avatar_url` panel-wide (signed via `useQuery`, never logged) else the initials disc. D-13 nav-role gating (userRole label / administrador Admin item) unchanged.
- `RHShellIdentity.test.tsx` (4/4): both shells show the RH `nome_completo` (not the email prefix); after `setAdminUser` (as 30-04's `useAtualizarPerfil` does on a name edit) the chrome name updates WITHOUT a re-login.

## Verification

- `npm run test:run -- src/features/perfil-rh` → 32/32 GREEN (incl. SEG-03 no-affordance + WRONG_CURRENT + no-logout + Zod).
- `! grep -rn "FormField" src/features/perfil-rh` → passes (bare-RHF idiom locked; JSDoc reworded "FormField"→"Form-field").
- `RHShellIdentity.test.tsx` → 4/4 GREEN (BLOCKER / Success Criterion #1).
- Full suite: **877/877 vitest GREEN** across 111 files.
- `npm run lint` → **tsc flat 104** (no regression; baseline was 104).
- `npm run build` → **0 errors**, all PERF-03 chunk conditions met (eager index 882.58 kB < baseline, 42 chunks).
- `routes.tsx` unchanged (no diff).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing RHSidebar.admin.test.tsx broke after adding a `useQuery` to RHSidebar**
- **Found during:** Task 3.
- **Issue:** RHSidebar now signs the shell avatar via `useQuery`; the pre-existing `RHSidebar.admin.test.tsx` rendered `<RHSidebar>` without a QueryClientProvider → "No QueryClient set" (3/3 failing). Directly caused by this plan's change.
- **Fix:** Wrapped that test's `renderSidebar()` in a `QueryClientProvider` (avatar_url unseeded → the query stays disabled). No behavioral change to the Admin-nav assertions.
- **Files modified:** `src/components/__tests__/RHSidebar.admin.test.tsx`.
- **Commit:** `e5acabb`.

**2. [Rule 1 - Guard] JSDoc literal "FormField" tripped the feature grep guard**
- **Found during:** Task 2 verify (`! grep -rn "FormField" src/features/perfil-rh`).
- **Issue:** PerfilSection/SenhaSection docblocks wrote "NOT the shadcn FormField primitive" — the literal token failed the guard.
- **Fix:** Reworded to "Form-field" (the Phase-29 spelling). Code uses only bare `register`; no primitive was ever imported.
- **Commit:** `f4fab7a`.

No architectural (Rule 4) changes; no auth gates; no new packages.

## Known Stubs

None — all sections are wired to the 30-04 data layer. The only outstanding dependency is the [BLOCKING] PROD apply of the `atualizar_meu_perfil_rh` RPC + `avatars-rh` bucket (owned by 30-06) and the SEG-03 smoke (30-07); until then the `atualizarPerfil` service still carries the `as never` cast documented in 30-04 (`TODO(30-06)`).

## Self-Check: PASSED

- Files created — all FOUND: AvatarUpload.tsx, PerfilSection.tsx, SenhaSection.tsx, PerfilSection.test.tsx, SenhaSection.test.tsx, RHShellIdentity.test.tsx.
- Files modified — all FOUND: MeuPerfilPage.tsx, RHTopBar.tsx, RHSidebar.tsx, RHSidebar.admin.test.tsx.
- Commits FOUND: `2061e90`, `f4fab7a`, `e5acabb`.
