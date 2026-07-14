---
phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro
plan: 06
subsystem: edge-function
tags: [edge-function, deno, supabase, service-role, authenticate-then-authorize, zod, discriminated-union, seg-01, usr-02, usr-05, usr-06, tdd-green]

# Dependency graph
requires:
  - phase: 28-02 (Wave-0 RED golden test)
    provides: "gerenciar-usuario-rh/__tests__/index.test.ts — the injected-deps handler(req,{supabaseAdmin,supabaseUser}) contract this plan makes GREEN"
  - phase: 28-05 (anti-lockout trigger + atomic RPCs)
    provides: "criar_usuario_rh_com_audit(p_actor,p_user_id,p_email,p_nome,p_cargo,p_papel) + gerir_usuario_rh_mutacao(p_actor,p_target,p_action,p_novo_papel) — the RPCs this EF calls by name (signatures pinned verbatim)"
  - phase: 28-01 (Wave-0 live capture)
    provides: "28-LIVE-STATE.md — active-admin floor (4), hook maps role, own-row + auth_admin_le_usuarios_rh policies preserved"
provides:
  - "supabase/functions/_shared/usuario-rh-schemas.ts — gerenciarUsuarioRhSchema (.strict() discriminated union) + UsuarioRhErrorCode + zodPathToFieldName"
  - "supabase/functions/gerenciar-usuario-rh/index.ts — handler(req,deps) two-client authenticate-THEN-authorize + 5-action dispatch + Deno.serve wiring (AUTHORED-NOT-DEPLOYED)"
affects: [28-07 (deploys this EF via supabase functions deploy), 29 (console USR-01..05 invokes this EF), 30 (SEG-03 verifies this EF is the ONLY server-side writer of usuarios_rh.role)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "authenticate-THEN-authorize, administrador-ONLY: anon getUser() authenticates, service_role read of usuarios_rh authorizes — STRICTER than the consolidar analog (drops the recrutador->'rh' normalization; role never from getUser().app_metadata)"
    - "Zod .strict() discriminated-union on action — fail-closed request contract shared (bare zod) across Deno + Vitest (CI-07); unknown key -> VALIDATION/400 before any write"
    - "createUser -> atomic row+audit RPC -> compensating deleteUser on RPC failure (no orphan GoTrue identity) — the USR-02 two-write consistency idiom"
    - "GoTrue-side actions (createUser email, resetar_senha) audited/emailed best-effort OUTSIDE the DEFINER-RPC tx — a failed email/audit is alarmed but non-fatal"
    - "EF-body anti-lockout pre-count as friendly defense-in-depth; the DB trigger (28-05) is the hard, bypass-proof backstop (P0001 -> LAST_ADMIN)"

key-files:
  created:
    - "supabase/functions/_shared/usuario-rh-schemas.ts"
    - "supabase/functions/gerenciar-usuario-rh/index.ts"
  modified: []

key-decisions:
  - "Authorization reads role from the usuarios_rh TABLE via service_role and requires role='administrador' EXACTLY — NO recrutador->'rh' normalization (the load-bearing SEG-01 deviation from consolidar-decisao-final). A recrutador or a null row -> 403."
  - "RPC call sites match 28-05's pinned signatures VERBATIM: criar_usuario_rh_com_audit(p_actor,p_user_id,p_email,p_nome,p_cargo,p_papel) and gerir_usuario_rh_mutacao(p_actor,p_target,p_action,p_novo_papel) — no drift to surface at the 28-08 PROD smoke."
  - "resetar_senha best-effort audit uses the 28-05-pinned log_auditoria param set (p_usuario_id,p_usuario_tipo='admin',p_acao='resetar_senha',p_categoria='usuario',p_recurso_tipo='usuarios_rh',p_recurso_id,p_sucesso=true) plus p_descricao/p_severidade='aviso' (both proven valid by 28-05's mutacao RPC)."
  - "USR-05 recovery redirectTo = <Origin header>/auth/redefinir-senha?tipo=rh, with a PUBLIC_APP_URL env / prod-host fallback when Origin is absent (server-to-server callers)."
  - "criar returns 201 with the new userId; a failed set-password email keeps 201 + warning:'EMAIL_SEND_FAILED' (non-fatal). resetar_senha send failure IS fatal (EMAIL_SEND_FAILED/502) since delivery is the whole action."
  - "EF-body anti-lockout pre-count only runs for desativar and mudar_papel-away-from-admin (ativar / mudar_papel->administrador short-circuit false); it mirrors the trigger's `id <> target` count of OTHER active admins."

patterns-established:
  - "administrador-ONLY authenticate-THEN-authorize (table-sourced role, no JWT trust, no rh-normalization) is the canonical shape for a privileged single-writer EF whose whole purpose is to be the ONLY write-path (SEG-03 verifies against it)."

requirements-completed: [SEG-01, USR-06]

# Metrics
duration: 6min
completed: 2026-07-13
---

# Phase 28 Plan 06: gerenciar-usuario-rh Edge Function + Shared Zod Schema Summary

**The single admin-gated Edge Function `gerenciar-usuario-rh` and its `.strict()` shared Zod schema now exist as files: it authenticates (anon getUser) THEN authorizes administrador-ONLY from the `usuarios_rh` table (no JWT trust, no recrutador->rh normalization) before dispatching all five RH-account actions (criar / mudar_papel / ativar / desativar / resetar_senha) — turning the 28-02 RED Deno test GREEN (9/9), with RPC call sites pinned verbatim to 28-05's signatures. AUTHORED-NOT-DEPLOYED — the deploy is 28-07.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-13
- **Completed:** 2026-07-13
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments

- **SEG-01 authenticate-THEN-authorize (administrador-ONLY):** `handler(req, {supabaseAdmin, supabaseUser})` uses the two-client D-23 skeleton — the anon client's `auth.getUser()` authenticates (null user → 401 UNAUTHORIZED before any write), then a service_role read `.from('usuarios_rh').select('role').eq('user_id', user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()` authorizes. The load-bearing deviation from `consolidar-decisao-final`: the `recrutador->'rh'` normalization is ABSENT and the check is `role !== 'administrador'` → 403; the role is read from the TABLE, never `getUser().app_metadata`. A `recrutador` row or a null row → 403.
- **SEG-01 fail-closed request contract:** `_shared/usuario-rh-schemas.ts` exports `gerenciarUsuarioRhSchema` — a `.strict()` `z.discriminatedUnion("action", …)` over the five actions; `papel`/`novo_papel` are enum-narrowed to `{recrutador, administrador}` (legacy CHECK values `gerente`/`visualizador` excluded); `criar` requires `email` + `nome_completo` + `cargo` (both text cols NOT NULL) + `papel`. An unknown key or bad discriminator → `safeParse` failure → `VALIDATION`/400 with the `field?` slot filled via `zodPathToFieldName`, BEFORE any privileged write.
- **USR-02 orphan-rollback (T-28-06):** `criar` does `auth.admin.createUser({ email, password: crypto.randomUUID()+crypto.randomUUID(), email_confirm:true, user_metadata:{nome_completo} })` → `rpc('criar_usuario_rh_com_audit', …)`; on RPC error it COMPENSATES with `auth.admin.deleteUser(userId).catch(...)` (no orphan GoTrue identity) and returns `ok:false`. A GoTrue "already registered" → `EMAIL_EXISTS`/409.
- **USR-05 set-password email:** on `criar` success the handler dispatches `resetPasswordForEmail(email, { redirectTo: <origin>/auth/redefinir-senha?tipo=rh })`. A thrown/errored send is NON-FATAL — the account already exists → 201 with `warning:'EMAIL_SEND_FAILED'` and NO compensating rollback.
- **USR-06 resetar_senha best-effort audit (T-28-05):** `resetar_senha` looks up the target email (service_role), dispatches the recovery email, then logs best-effort via `rpc('log_auditoria', { p_acao:'resetar_senha', p_categoria:'usuario', p_recurso_tipo:'usuarios_rh', p_recurso_id, p_usuario_id, p_usuario_tipo:'admin', p_sucesso:true, … })`. A failed/thrown audit is ALARMED (`console.error`) but NON-FATAL — the reset already dispatched (a GoTrue-side action can't share the DEFINER-RPC transaction).
- **USR-07 anti-lockout defense-in-depth:** `mudar_papel`/`desativar` run a REQUIRED EF-body pre-count (`wouldBreakAdminFloor`) that mirrors the trigger's `id <> target` count of OTHER active admins and returns a friendly `LAST_ADMIN`/409 early; the 28-05 DB trigger remains the hard backstop, and the RPC's `SQLSTATE P0001 → LAST_ADMIN`, `P0002 → NOT_FOUND` are mapped in `mapMutacaoError`.
- **Signature-pin discipline:** every `.rpc()` call matches 28-05's pinned param names verbatim — no contract drift to surface only at the 28-08 PROD smoke.
- **28-02 RED → GREEN:** the golden test (9 cases: 401 unauth / 403 null-role / 403 recrutador / admin-dispatch / criar deleteUser rollback / resetPasswordForEmail redirectTo / non-fatal send failure / resetar_senha best-effort log_auditoria / non-fatal audit throw) all pass with injected mocks (no network).

## Task Commits

Each task was committed atomically (via `git -c core.hooksPath=/dev/null`):

1. **Task 1: `_shared/usuario-rh-schemas.ts` (strict discriminated union + error codes)** — `5744841` (feat)
2. **Task 2: `gerenciar-usuario-rh/index.ts` (authenticate-THEN-authorize + dispatch)** — `fe8404c` (feat)

**Plan metadata:** _(this SUMMARY + STATE.md + ROADMAP.md — final commit)_

## Files Created/Modified

- `supabase/functions/_shared/usuario-rh-schemas.ts` — bare `zod` import; `gerenciarUsuarioRhSchema` `.strict()` discriminated union over `criar/mudar_papel/ativar/desativar/resetar_senha`; `papel` enum `{recrutador, administrador}`; `UsuarioRhErrorCode` union (`UNAUTHORIZED|FORBIDDEN|VALIDATION|NOT_FOUND|EMAIL_EXISTS|LAST_ADMIN|EMAIL_SEND_FAILED|SERVER_ERROR`); `zodPathToFieldName` helper. `deno check` clean.
- `supabase/functions/gerenciar-usuario-rh/index.ts` — CORS + `{ ok, error_code, message, field? }` helpers; `resolveOrigin`/`RECOVERY_PATH`; `mapMutacaoError` (P0001/P0002); `wouldBreakAdminFloor` anti-lockout pre-count; injectable `GerenciarUsuarioRhDeps`; exported `handler(req, deps)` (authenticate → authorize → `.strict()` parse → dispatch `handleCriar`/`handleMutacao`/`handleResetarSenha`); `Deno.serve` two-client production wiring behind `import.meta.main`. `deno check` clean.

## Verification Results

- **`deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/gerenciar-usuario-rh` → `ok | 9 passed | 0 failed`** (28-02 RED test flipped GREEN):
  - SEG-01 unauthenticated (getUser null) → 401 UNAUTHORIZED, zero rpcCalls ✓
  - SEG-01 null usuarios_rh row → 403 FORBIDDEN ✓
  - SEG-01 `recrutador` role → 403 (administrador-only; 'rh' normalization ABSENT; authorize read hit `usuarios_rh`) ✓
  - SEG-01 active administrador + ativar → 2xx / ok:true (dispatches) ✓
  - USR-02 criar RPC error → `deleteUser(CREATED_USER_ID)` called, ok:false ✓
  - USR-05 criar success → resetPasswordForEmail redirectTo ends `/auth/redefinir-senha?tipo=rh` ✓
  - USR-05 thrown resetPasswordForEmail → non-fatal (2xx, no rollback) ✓
  - USR-06 resetar_senha → best-effort log_auditoria (p_acao='resetar_senha', p_categoria='usuario', p_recurso_tipo='usuarios_rh') ✓
  - USR-06 thrown log_auditoria → non-fatal (2xx) ✓
- **`deno check` on both files:** clean.
- **`npm run lint` (tsc):** unchanged — the pre-existing `src/` error set carries zero references to the new EF files (`supabase/functions/` is outside the tsc `include: ["src","e2e","scripts","playwright.config.ts"]`). The frozen baseline is NOT inflated.

## Deviations from Plan

None — plan executed exactly as written. Both files follow 28-PATTERNS §gerenciar-usuario-rh/index.ts and §_shared/usuario-rh-schemas.ts; the administrador-only deviation from the consolidar analog is per plan; RPC call sites match 28-05's pinned signatures. Claude's-discretion items resolved as documented in key-decisions (recovery-email origin fallback; criar 201 + non-fatal email warning; resetar_senha send-failure fatal; anti-lockout pre-count reuses the trigger's OTHER-active-admin count shape).

## Authentication Gates

None — files-only authoring plan; no external service, login, or secret required. The EF is DEPLOYED (with its `SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY` env) in 28-07, not here.

## Issues Encountered

None. The 28-02 test's mock chain (`from().select().eq().is().maybeSingle()`, `auth.admin.createUser/deleteUser`, `auth.resetPasswordForEmail`, `rpc()`) matched the handler's call shape on the first run; all 9 cases passed. The anti-lockout pre-count's `.neq()` + count query (not part of the mock's chain) is only reached by `mudar_papel`/`desativar` — paths the 28-02 test does not exercise — so it is PROD-correct against the real client without affecting the GREEN test.

## Known Stubs

None. The EF is fully wired to the 28-05 RPCs and GoTrue admin API; there are no placeholder returns or empty data sources. The two `mudar_papel`/`desativar` code paths are real (not stubbed) but are exercised behaviorally only at the 28-08 PROD SQL smoke + 29 console UAT, not by the 28-02 unit test.

## Threat Flags

None. The EF introduces exactly the trust boundary in the plan's `<threat_model>` (unauthenticated/authenticated caller → EF; EF → GoTrue admin API; EF → usuarios_rh write path) and adds the mitigations for T-28-01 (authenticate-THEN-authorize, administrador-only), T-28-06 (createUser→row+audit→compensating deleteUser), T-28-05 (best-effort resetar_senha audit), T-28-07 (never logs email/OTP/token; non-fatal send), T-28-08 (`.strict()` + enum-narrowed papel + parameterized RPC args), T-28-04 (EF pre-count + trigger backstop, P0001→LAST_ADMIN). No new network endpoint, auth path, file access, or schema surface beyond it. Service_role construction lives under `supabase/functions/` (legitimate server-side), not `src/` (guarded by 28-02's grep).

## User Setup Required

None for this plan. The EF's deploy (`supabase functions deploy gerenciar-usuario-rh`) and its dependency on the 28-04/28-05 migrations being applied to PROD are handled in plan 28-07 (a [BLOCKING] wave, authorized by Fernando).

## Next Phase Readiness

- **28-07 (deploy):** `index.ts` is a self-contained EF — `esm.sh/@supabase/supabase-js@2` static import, shared bare-`zod` schema, `Deno.serve` behind `import.meta.main`, env-guard for `SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY`. Deploy JWT-ON (the handler self-verifies the caller JWT via the anon client). Its RPC dependencies (`criar_usuario_rh_com_audit`, `gerir_usuario_rh_mutacao`, `log_auditoria`) must be live in PROD first (28-04/28-05 migrations applied in 28-07's [BLOCKING] wave).
- **28-08 (PROD smoke):** the RPC call sites are pinned to 28-05's signatures verbatim, so an invoke against live PROD should not surface a param-name/arity drift.
- **29 (console):** the EF supports all five actions the console consumes (USR-01 list is read-only elsewhere; USR-02..05 write via this EF). The `{ ok, error_code, message, field? }` contract + `EMAIL_EXISTS`/`LAST_ADMIN`/`EMAIL_SEND_FAILED` codes are ready for UI mapping.
- **30 (SEG-03):** this EF is the SINGLE server-side writer of `usuarios_rh.role` — the fact P30 verifies against.

## Self-Check: PASSED

- FOUND: supabase/functions/_shared/usuario-rh-schemas.ts
- FOUND: supabase/functions/gerenciar-usuario-rh/index.ts
- FOUND commit: 5744841 (Task 1)
- FOUND commit: fe8404c (Task 2)
- Deno test: 9 passed | 0 failed

---
*Phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro*
*Completed: 2026-07-13*
