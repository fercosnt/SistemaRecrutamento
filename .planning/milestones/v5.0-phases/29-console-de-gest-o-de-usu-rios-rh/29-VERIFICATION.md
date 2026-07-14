---
phase: 29-console-de-gest-o-de-usu-rios-rh
verified: 2026-07-13T20:37:45Z
status: human_needed
score: 7/7 must-haves verified (code-level dispatch/wiring); 6 live round-trips → HUMAN-UAT
re_verification: false
human_verification:
  - test: "Log in as administrador (e2e.admin@beautysmile.com.br) and open /rh/configuracoes"
    expected: "Real roster renders (nome/email, cargo, papel badge, status Ativo/Inativo, 'Aguardando 1º acesso' chip, último acesso) — NOT the old empty-state; '(você)' marks your own row"
    why_human: "Requires a real administrador session + live usuarios_rh data; the render/data-path is code-verified but the live visual roster is not grep-checkable (SC1/USR-01)"
  - test: "Click 'Novo usuário', create a recrutador (email + papel), and have that person open the set-password email and sign in to the RH panel"
    expected: "Success toast; new user receives the define-password e-mail; sets password and reaches the RH panel — exercising the first-ever recrutador account"
    why_human: "Live EF + SMTP round-trip (create → e-mail delivery → sign-in). Server enforcement is Phase-28's guarantee; Phase 29 only dispatches action:'criar' (verified) (SC2/USR-02)"
  - test: "Change a user's papel (recrutador ↔ administrador) via 'Editar papel', then have that user sign out and back in"
    expected: "'Papel atualizado.' toast; on the next sign-in the JWT/role reflects the new papel"
    why_human: "The role-takes-effect-on-next-JWT behavior is a live GoTrue custom-access-token-hook round-trip (Phase 28). Phase 29 dispatches action:'mudar_papel' correctly (verified) (SC3/USR-03)"
  - test: "Deactivate an active RH user (confirm dialog), verify they can no longer access the RH panel, then reactivate them and verify access is restored"
    expected: "'Usuário desativado.' / 'Usuário reativado.' toasts; deactivated user is blocked from the panel; reactivation restores access; the identity is never hard-deleted"
    why_human: "Access-block enforcement is Phase-28 RLS/auth on a live session. Phase 29 dispatches action:'desativar'|'ativar' (verified); no hard-delete path exists in code (verified) (SC4/USR-04)"
  - test: "Trigger 'Resetar senha' for a user (confirm dialog) and verify the reset e-mail arrives at that user's inbox"
    expected: "'E-mail de redefinição de senha enviado.' toast; the user receives the password-reset path"
    why_human: "Live SMTP delivery. Phase 29 dispatches action:'resetar_senha' (verified) (SC5/USR-05)"
  - test: "Run the visual / glass-UI / AA-contrast sweep on the live console (roster table, badges, dialogs, dropdown, tooltips, AlertDialogs)"
    expected: "Glass Beauty-Smile styling consistent; ≥44px touch targets; AA contrast; anti-lockout tooltip keyboard-reachable on the last active admin row"
    why_human: "Visual appearance + axe contrast on the rendered console are not grep-verifiable"
---

# Phase 29: Console de Gestão de Usuários RH Verification Report

**Phase Goal:** O `administrador` opera o console real de gestão de usuários em `/rh/configuracoes` — lista os usuários RH e executa toda ação de conta ponta-a-ponta através do write-path seguro da Phase 28 (nunca escrevendo direto do client).

**Verified:** 2026-07-13T20:37:45Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

The console is code-complete and correctly wired. Every one of the 5 ROADMAP success criteria is dispatched through the Phase-28 secure EF with a byte-matching contract; the roster read is an allowlist projection; no client-side direct write to `usuarios_rh` exists; the route keeps `RoleGuard role="administrador"`. All three gates pass independently (832/832 tests, tsc 104 ≤104, build exit 0). The *server-side enforcement* of criteria 2/3/4/5 is Phase-28's already-live guarantee — Phase 29's job was to DISPATCH correctly, which is verified. The remaining live round-trips (SMTP, JWT-on-next-signin, session block) and the visual sweep are routed to HUMAN-UAT per the phase's own validation strategy, not counted as gaps.

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | (SC1/USR-01) Console renders the real roster (nome/email, cargo, papel, status ativo/inativo), replacing the empty-state | ✓ VERIFIED (code); live visual → HUMAN | `listUsuariosRh` allowlist read → `useUsuariosRh` → `UsuariosRhTable` renders nome_completo/email/cargo/papel Badge/status Badge/1º-acesso chip; `GestaoUsuariosPage` gates it with `AsyncState`; `ConfiguracoesPage` mounts it under one `RHLayout`; old empty-state removed (only a docstring mentions the replaced M4 text) |
| 2 | (SC2/USR-02) Create RH user dispatches the secure create path; new user sets password + signs in | ✓ DISPATCH VERIFIED; live round-trip → HUMAN | `NovoUsuarioDialog` onSubmit → `useCriarUsuario` → `criarUsuario` → `invokeWrite({action:'criar',...parsed.data})`; client schema mirrors EF `.strict()` criar branch field-for-field; honest helper copy present |
| 3 | (SC3/USR-03) Role change dispatches `mudar_papel`; takes effect on next JWT | ✓ DISPATCH VERIFIED; live JWT → HUMAN | `EditarPapelDialog` Controller Select → `useMudarPapel` → `mudarPapel(targetId, novoPapel)` → `invokeWrite({action:'mudar_papel', target_id, novo_papel})` matching EF contract |
| 4 | (SC4/USR-04) Deactivate blocks access; reactivate restores; no hard-delete | ✓ DISPATCH VERIFIED; live block → HUMAN | Desativar behind `AlertDialog` → `ativarDesativar({ativar:false})`; Ativar direct → `{ativar:true}`; → `invokeWrite({action:'desativar'|'ativar', target_id})`; grep confirms ZERO hard-delete of `usuarios_rh` in src/ or EF |
| 5 | (SC5/USR-05) Password reset dispatches the reset path | ✓ DISPATCH VERIFIED; live SMTP → HUMAN | Resetar senha behind `AlertDialog` → `useResetarSenha` → `resetarSenha(id)` → `invokeWrite({action:'resetar_senha', target_id})`; honest copy states only that an e-mail is dispatched |
| 6 | (Security invariant) Every write goes through the EF; roster read is allowlist; RoleGuard intact | ✓ VERIFIED | grep: 0 `.from('usuarios_rh').update/insert/delete/upsert` in src/; the only Phase-29 `.from('usuarios_rh')` is the allowlist `.select(USUARIOS_RH_LIST_COLUMNS)`; no wildcard select in the admin roster path; `routes.tsx` `/rh/configuracoes` wrapped in `<RoleGuard role="administrador">` |
| 7 | (USR-07 UX) Last active administrador row disables Desativar/demote + tooltip; LAST_ADMIN → authoritative toast | ✓ VERIFIED | `UsuariosRhTable` derives `lastActiveAdminId`; disables Desativar behind keyboard-safe `inline-flex` tooltip; `EditarPapelDialog` blocks demote via `wouldDemoteLastAdmin`; hook `toastRowError` maps `LAST_ADMIN` |

**Score:** 7/7 truths verified at the code/dispatch level. 6 items require live HUMAN-UAT confirmation.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/features/admin/schemas/usuarioRhSchemas.ts` | Client create/edit Zod schemas mirroring EF | ✓ VERIFIED | `novoUsuarioSchema`+`editarPapelSchema`+`PAPEL_OPTIONS`; byte-matches EF `.strict()` branches |
| `src/features/admin/services/usuariosRhService.ts` | Allowlist read + 5 EF-backed writes | ✓ VERIFIED | `listUsuariosRh` (9-col allowlist, never `*`) + `criar/mudarPapel/ativarDesativar/resetarSenha` via `invokeWrite`; every error_code normalized to `.details.error_code`; EMAIL_SEND_FAILED = resolve-with-warning; UNAUTHORIZED distinct |
| `src/features/admin/hooks/useUsuariosRh.ts` | Query + 4 mutations, invalidate-on-success | ✓ VERIFIED | `useUsuariosRh` (staleTime 5min, retry 2) + 4 mutation hooks; all invalidate `usuariosRhKeys.list()`; LAST_ADMIN/UNAUTHORIZED mapped on row mutations |
| `src/features/admin/components/NovoUsuarioDialog.tsx` | Create dialog → action:'criar' | ✓ VERIFIED | bare RHF + zodResolver; honest copy; EMAIL_EXISTS→field, others→toast; pending disable; no `ui/form` primitive |
| `src/features/admin/components/EditarPapelDialog.tsx` | Role-change dialog → mudar_papel | ✓ VERIFIED | Controller Select pre-set to current role; demote-last-admin disabled + tooltip; legacy role normalized |
| `src/features/admin/components/UsuariosRhTable.tsx` | Glass roster + per-row actions | ✓ VERIFIED | avatar/badges/chip/último-acesso; Ações menu (Editar papel · Ativar direct · Desativar/Resetar behind AlertDialog); anti-lockout disable; allowlisted columns only |
| `src/features/admin/components/GestaoUsuariosPage.tsx` | Composed console body (query→AsyncState→table+CTA) | ✓ VERIFIED | `useUsuariosRh`→`AsyncState` 5-state→`UsuariosRhTable`; header CTA owns `NovoUsuarioDialog`; body-only (no RHLayout self-mount) |
| `src/components/pages/ConfiguracoesPage.tsx` | Wired host, single RHLayout owner | ✓ VERIFIED | `<RHLayout><GestaoUsuariosPage/></RHLayout>`; empty-state removed; export name preserved for lazy route import |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `ConfiguracoesPage` | `GestaoUsuariosPage` | JSX child under RHLayout | ✓ WIRED | import + render confirmed |
| `GestaoUsuariosPage` | `useUsuariosRh` | hook call → AsyncState | ✓ WIRED | `data` piped to `UsuariosRhTable rows=` |
| `usuariosRhService` | `usuarios_rh` (read) | `.select(USUARIOS_RH_LIST_COLUMNS)` | ✓ WIRED | allowlist projection, order by nome |
| all 5 write actions | `gerenciar-usuario-rh` EF | `supabase.functions.invoke` | ✓ WIRED | EF exists on disk (Phase 28) + live PROD; body shapes match `gerenciarUsuarioRhSchema` |
| service error path | `extractEfErrorCode` | `@/lib/efErrors` | ✓ WIRED | code-only normalization (never PII) |
| `/rh/configuracoes` | `ConfiguracoesPage` | `RoleGuard role="administrador"` | ✓ WIRED | routes.tsx:408-414 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `UsuariosRhTable` | `rows` | `useUsuariosRh().data` ← `listUsuariosRh()` ← real `usuarios_rh` allowlist SELECT (admin-only RLS) | Yes (live table query; not hardcoded — `rows={data ?? []}`, empty handled by AsyncState) | ✓ FLOWING (live roster content is HUMAN-UAT) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full test suite | `npm run test:run` | 104 files, 832/832 passed | ✓ PASS |
| Type-check baseline | `npm run -s lint \| grep -c "error TS"` | 104 (≤104 gate) | ✓ PASS |
| Production build | `npm run build` | exit 0; PERF-03 chunk assertions pass | ✓ PASS |
| No direct client write to usuarios_rh | grep `.from('usuarios_rh').update/insert/delete/upsert` in src/ | 0 matches | ✓ PASS |
| Roster read is allowlist (no wildcard) | grep `select('*')` in admin roster path | 0 real queries (docstrings only) | ✓ PASS |
| Route guard intact | grep `RoleGuard role="administrador"` at /rh/configuracoes | present (routes.tsx:410) | ✓ PASS |
| No hard-delete of usuarios_rh | grep delete of usuarios_rh in src/ + EF | 0 matches | ✓ PASS |
| Service contract test substantive | grep key assertion terms in usuariosRhService.test.ts | 41 matches | ✓ PASS |

### Probe Execution

Not applicable — Phase 29 is a UI/dispatch phase with no `scripts/*/tests/probe-*.sh` declared. Validation strategy is component/service RTL + gate checks (all green above).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| USR-01 | 29-01, 29-03, 29-04 | administrador visualiza a lista de usuários RH | ✓ SATISFIED (code); live visual → HUMAN | allowlist read + roster table + wired host |
| USR-02 | 29-01, 29-02, 29-04 | administrador cria usuário RH; usuário define senha + acessa | ✓ SATISFIED (dispatch); live round-trip → HUMAN | create dialog → action:'criar' |
| USR-03 | 29-01, 29-03 | administrador altera papel; reflete no JWT | ✓ SATISFIED (dispatch); live JWT → HUMAN | edit dialog → action:'mudar_papel' |
| USR-04 | 29-01, 29-03 | administrador desativa/reativa (soft, no hard-delete) | ✓ SATISFIED (dispatch); live block → HUMAN | ativar/desativar dispatch; zero hard-delete |
| USR-05 | 29-01, 29-03 | administrador dispara reset de senha | ✓ SATISFIED (dispatch); live SMTP → HUMAN | resetar_senha dispatch |

No orphaned requirements: REQUIREMENTS.md maps exactly USR-01..05 to Phase 29, all claimed by plans and covered above. (USR-06/USR-07 server backing is Phase 28; USR-07 UX hint is verified here.)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | none | — | No TBD/FIXME/XXX, no TODO/HACK/PLACEHOLDER, no stub returns, no hardcoded-empty render props in any Phase-29 file |

### Human Verification Required

See the `human_verification` frontmatter block. Six live items (SC1 visual roster, SC2 create→email→sign-in, SC3 role→JWT, SC4 deactivate→block→reactivate, SC5 reset→email, plus the visual/glass/AA sweep). Every one depends on a live admin session, live SMTP, live GoTrue/RLS, or human visual judgment — none is grep-verifiable, and all are Phase-28 server guarantees that Phase 29 only dispatches into. Per the phase validation strategy these are HUMAN-UAT, not gaps.

### Gaps Summary

No gaps. The console is code-complete and every write path is correctly and securely wired through the Phase-28 EF; the roster read is a strict allowlist; the route guard is intact; all three gates pass independently at the expected values (832/832, tsc 104, build 0). The phase goal — "administrador operates the real console and executes every account action end-to-end through the secure Phase-28 write-path, never writing directly from the client" — is achieved in the codebase at the dispatch/wiring level. The status is `human_needed` solely because criteria 2/3/4/5 close only over live SMTP/JWT/session round-trips and criterion 1 plus the styling need a human/axe visual pass — exactly the items the phase intentionally deferred to HUMAN-UAT.

---

_Verified: 2026-07-13T20:37:45Z_
_Verifier: Claude (gsd-verifier)_
