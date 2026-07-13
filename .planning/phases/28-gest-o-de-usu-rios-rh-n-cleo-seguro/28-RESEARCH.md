# Phase 28: Gestão de Usuários RH — Núcleo Seguro - Research

**Researched:** 2026-07-13
**Domain:** Supabase privileged Edge Function (GoTrue admin API) + Postgres RLS/triggers/SECURITY DEFINER RPC + append-only audit
**Confidence:** HIGH (in-repo precedents + official Supabase docs) with 3 flagged live-verify items

## Summary

Phase 28 builds the **server-side write-path** for RH account management: one JWT-verifying, service_role Edge Function `gerenciar-usuario-rh` that authenticates-THEN-authorizes every mutation, backed by (a) tightened `usuarios_rh` RLS (admin-only list + own-row, writes denied to all client roles), (b) a race-safe anti-lockout trigger, (c) SECURITY DEFINER mutation RPC(s) that write the row change **and** the audit row in one transaction, and (d) append-only hardening of the existing `logs_auditoria`. No UI (Phase 29).

The project already contains every pattern this phase needs. The authenticate-THEN-authorize EF skeleton is `consolidar-decisao-final` / `comparativo-candidatos` (two-client D-23: anon client for `getUser()`, service_role for privileged reads/writes, role read from `usuarios_rh` by `user_id`). The `auth.admin.createUser` + rollback-via-`deleteUser` two-write pattern is `cadastrar-candidato`. The audit substrate (`logs_auditoria` table + `log_auditoria()` SECURITY DEFINER RPC + `categoria='usuario'` enum value) already exists. The recovery/OTP landing page (`/auth/redefinir-senha`, `verifyRecoveryOtp` → `setNewPassword`) already exists for password-set flows.

Three findings materially shape the plan: **(1)** the LIVE `usuarios_rh` today has two permissive `{authenticated}` `qual=true` SELECT policies (`usuarios_rh_authenticated_read`, `usuarios_rh_simple_read`) — **any authenticated user, including candidato/recrutador, can read the entire RH roster**. This is the exact SEG-02 gap and must be dropped. **(2)** The obvious admin-only policy (a subquery `SELECT … FROM usuarios_rh WHERE role='administrador'` inside a policy *on* `usuarios_rh`) causes **infinite-recursion** — this is almost certainly why the original self-referencing policies were long ago replaced by the `qual=true` ones. The correct fix is a **PL/pgSQL (not SQL) `SECURITY DEFINER` helper** `is_active_rh_admin()`. **(3)** A naïve `COUNT(active admins) > 0` anti-lockout check is subject to **write-skew** under concurrent demotions (two admins demoting each other → 0 admins). The trigger must serialize via `pg_advisory_xact_lock` (or lock the admin row-set) before counting.

**Primary recommendation:** One `gerenciar-usuario-rh` EF (JWT-ON) with a Zod discriminated-union `action`; role authorized from `usuarios_rh` (not JWT); DB-only mutations run through a `SECURITY DEFINER` RPC that mutates + audits atomically; `createUser`/`resetar_senha` touch GoTrue then audit best-effort; anti-lockout enforced by a `pg_advisory_xact_lock`-guarded `BEFORE UPDATE OR DELETE` trigger; `usuarios_rh` RLS = admin-only (via PL/pgSQL DEFINER helper) + own-row, all client writes denied; `logs_auditoria` hardened by dropping the authenticated INSERT policy so only the DEFINER path writes. Deliver **password-set via `resetPasswordForEmail`** (auto-sends over the project's existing SMTP) rather than `generateLink` (which does NOT send email).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Área 1 — Edge Function privilegiada & autorização (SEG-01, USR-02, USR-03)**
- **EF única `gerenciar-usuario-rh`** com `action` discriminada via Zod discriminated-union (`criar` / `mudar_papel` / `ativar` / `desativar` / `resetar_senha`) — um só ponto authenticate-THEN-authorize. Reusa `_shared` helpers.
- **Autorização = fonte de verdade, não o JWT:** `getUser()` (autentica) → SELECT `role` de `usuarios_rh` pelo `user_id` com service_role → exige `role='administrador' AND ativo=true AND deleted_at IS NULL` (autoriza) ANTES de qualquer escrita. Não-autenticado → 401; autenticado não-admin → 403.
- **Criar usuário (USR-02):** `supabase.auth.admin.createUser` (senha temporária aleatória, `email_confirm:true`) + linha `usuarios_rh` (`primeiro_acesso=true`, `created_by`=ator, `ativo=true`) na mesma operação; depois gera/dispara link de **recovery** do GoTrue. Convite-por-email com lifecycle completo → v2 (USR-09).
- **Mudança de papel (USR-03) vale no próximo login/refresh** — o `custom_access_token_hook` relê `usuarios_rh` a cada emissão de token; sessão ativa não muta instantaneamente (sem force-logout remoto no M5).

**Área 2 — Modelo de dados, RLS & anti-lockout (SEG-02, USR-04, USR-07)**
- **Desativar (USR-04) = `ativo=false`** (reversível; reativar = `ativo=true`). `deleted_at` reservado, **não usado no M5** (nunca hard-delete de identidade — LGPD).
- **Usuário desativado bloqueado de logar (defesa em profundidade):** login/auth-hook nega papel/sessão RH quando `NOT ativo OR deleted_at IS NOT NULL`; ban via `auth.admin` opcional como reforço. **Verificar o corpo LIVE do `custom_access_token_hook` antes de alterá-lo** (precedente M4/DBMIG-02) — preservar `auth_admin_le_usuarios_rh` e a resolução de papel existente.
- **RLS de `usuarios_rh` (SEG-02):** SELECT admin-only + own-row (o próprio usuário lê seu registro — necessário p/ A37 na Phase 30); INSERT/UPDATE/DELETE **negados a todos os roles no client** — só a EF service_role escreve. `recrutador`/candidato leem 0 linhas da lista. Policy `auth_admin_le_usuarios_rh` (SEC-09) **preservada intacta**.
- **Anti-lockout (USR-07, defesa em profundidade):** checagem no corpo da EF (erro amigável) **+** trigger `BEFORE UPDATE/DELETE` em `usuarios_rh` que recusa qualquer mutação que resultaria em 0 administradores ativos.

**Área 3 — Trilha de auditoria (USR-06)**
- **Reusar `logs_auditoria` + RPC `log_auditoria()`** com `categoria='usuario'`. Mapeamento: `usuario_id`=ator, `recurso_id`=alvo, `recurso_tipo='usuarios_rh'`, `acao` ∈ {criar, mudar_papel, desativar, reativar, resetar_senha}, `dados_antes`/`dados_depois`, `sucesso=true`, `severidade` apropriada.
- **Append-only:** garantir que `logs_auditoria` não tem policy de UPDATE/DELETE (INSERT só via RPC SECURITY DEFINER); verificar estado atual e endurecer.
- **Atomicidade ação↔log:** mutações puramente-DB (mudar_papel, ativar, desativar) numa RPC SECURITY DEFINER que muta **e** grava a auditoria na MESMA transação; ações que tocam GoTrue (criar, reset) logam best-effort + alarme se o log falhar.
- **O que é auditado:** as 5 ações mutantes, 1 linha cada; leituras da lista **não** são auditadas.

### Claude's Discretion
- Nomes exatos de arquivos de migration/EF, shape preciso do Zod schema, formato das mensagens de erro (seguir contrato `{ ok, error_code, message, field? }`), e se a checagem anti-lockout na EF reusa a mesma RPC do trigger.
- Se o reset de senha (USR-05) usa `auth.admin.generateLink({type:'recovery'})` vs `resetPasswordForEmail` — escolher o que entrega o link mais confiável no GoTrue SMTP do Supabase Pro. **→ Research recommends `resetPasswordForEmail` (see §Standard Stack + §Pitfall 6).**

### Deferred Ideas (OUT OF SCOPE)
- USR-08 troca de email do usuário RH (fluxo de confirmação GoTrue) → v2.
- USR-09 convite-por-email com lifecycle completo (expiração/reenvio) → v2 (M5 usa createUser+recovery).
- USR-10 UI de auditoria navegável/filtrável → v2 (M5 grava a trilha; consulta rica depois).
- Force-logout remoto / revogação de sessão ao mudar papel → não no M5 (papel vale no próximo refresh).
- **UI/console de qualquer tipo → Phase 29.** Self-service de perfil → Phase 30.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| USR-06 | Trilha de auditoria append-only (ator, alvo, ação, timestamp) de toda ação de gestão | Reuse `logs_auditoria` + `log_auditoria()` DEFINER RPC (§Standard Stack, §Code Examples); atomic mutate+audit RPC; append-only hardening drops the `qual=true` authenticated INSERT policy (§Pitfall 5) |
| USR-07 | Anti-lockout: impedir remover/rebaixar/desativar o **último administrador ativo** | Race-safe `BEFORE UPDATE OR DELETE` trigger with `pg_advisory_xact_lock` + count (§Code Examples, §Pitfall 3); EF-body soft-check for friendly error |
| SEG-01 | Escrita privilegiada via EF authenticate-THEN-authorize; zero service_role no client | `gerenciar-usuario-rh` two-client EF; role from `usuarios_rh` not JWT (§Architecture Pattern 1); bundle-grep guard `no service_role in src/` (§Validation Architecture) |
| SEG-02 | RLS `usuarios_rh` admin-only + own-row; `recrutador`/candidato leem 0 linhas; preserve `auth_admin_le_usuarios_rh` | Drop 2 permissive `qual=true` policies (§Pitfall 2/§Runtime State); admin-only via PL/pgSQL DEFINER helper (§Pitfall 1); own-row `user_id=auth.uid()`; SEC-09 policy untouched |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Authenticate caller (verify RH JWT) | API/Backend (EF, anon client `getUser()`) | — | JWT verification needs auth context; never service_role for auth |
| Authorize caller (is active admin?) | API/Backend (EF, service_role read of `usuarios_rh`) | Database (RLS as backstop) | Source of truth = table, not JWT claim (project invariant) |
| Create GoTrue identity | API/Backend (EF `auth.admin.createUser`) | — | Requires service_role; only server-side (SEG-01) |
| Create/mutate `usuarios_rh` row + audit | Database (SECURITY DEFINER RPC, atomic tx) | API/Backend (EF orchestrates) | Row+audit must be one transaction (USR-06 atomicity) |
| Anti-lockout invariant (≥1 active admin) | Database (`BEFORE UPDATE/DELETE` trigger) | API/Backend (EF soft pre-check) | DB trigger is the only race-safe, bypass-proof teeth (USR-07) |
| Deny non-admin roster reads / client writes | Database (RLS on `usuarios_rh`) | — | Row-level enforcement independent of app code (SEG-02) |
| Deliver set-password link to new/reset user | API/Backend (EF → GoTrue `resetPasswordForEmail`) + GoTrue SMTP | Browser (`/auth/redefinir-senha` OTP page) | Email delivery is a GoTrue/SMTP concern; landing UI already exists |
| Block deactivated user at login | GoTrue auth pipeline (`custom_access_token_hook`, already filters `ativo AND deleted_at IS NULL`) | Optional `auth.admin` ban | Hook already denies inactive RH → resolves to `candidato` on next token |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | `2` (via `https://esm.sh/@supabase/supabase-js@2`) | GoTrue admin API + service_role DB client inside the EF | Exact import already used by every EF in repo (`consolidar-decisao-final:45`, `cadastrar-candidato:39`) `[VERIFIED: repo grep]` |
| `zod` | `npm:zod@3.25.76` (import map `supabase/functions/deno.json`) | Discriminated-union `action` validation, `.strict()` fail-closed | Shared bare-`zod` specifier resolves in Deno + Vitest identically (CI-07) `[VERIFIED: supabase/functions/deno.json]` |
| Postgres PL/pgSQL | (managed by Supabase) | DEFINER helper, anti-lockout trigger, atomic mutate+audit RPC | Established pattern (`log_auditoria`, `submit_candidatura_atomic`) `[VERIFIED: repo]` |

**No new external packages are installed by this phase.** The EF reuses the esm.sh supabase-js pin and the vendored `npm:zod@3.25.76` already present. See §Package Legitimacy Audit.

### GoTrue admin API surface (the load-bearing calls)
| Call | Signature | Behavior | Use in this phase |
|------|-----------|----------|-------------------|
| `supabase.auth.admin.createUser` | `{ email, password?, email_confirm, user_metadata? }` | Password is **optional**; `email_confirm:true` auto-confirms (no confirmation email). Returns `{ data:{user}, error }`. `[CITED: supabase.com/docs/reference/javascript/auth-admin-createuser]` | USR-02 create (temp random password + `email_confirm:true`) |
| `supabase.auth.admin.deleteUser` | `(userId)` | Hard-deletes the GoTrue user | USR-02 **rollback** if the `usuarios_rh` insert fails (precedent `cadastrar-candidato:224`) |
| `supabase.auth.admin.updateUserById` | `(userId, { ban_duration })` | `ban_duration:'876000h'` bans (≈100y); `'none'` unbans. Banned users cannot authenticate. Applied directly (no confirmation flow). `[CITED: supabase.com/docs/reference/javascript/auth-admin-updateuserbyid]` | USR-04 **optional** reinforcement (defense-in-depth beside `ativo=false`) |
| `supabase.auth.resetPasswordForEmail` | `(email, { redirectTo })` | Triggers GoTrue `/recover` → **sends the recovery email via the project's configured SMTP**. Auto-send (unlike `generateLink`). Subject to email rate limits. `[CITED: repo passwordService.ts + supabase docs]` | USR-02 set-initial-password **and** USR-05 reset — reuses the existing `/auth/redefinir-senha` OTP flow |
| `supabase.auth.admin.generateLink` | `{ type:'recovery', email, redirectTo? }` | **Returns** `action_link`/`hashed_token`/`email_otp` but does **NOT send any email** — you must deliver it yourself. `[CITED: supabase.com/docs/reference/javascript/auth-admin-generatelink]` | **NOT recommended** (no server-side email sender exists) — see Pitfall 6 |

**Recommendation (resolves the discretion item):** use `resetPasswordForEmail` for both the USR-02 initial set-password and USR-05 reset. It auto-sends over the same SMTP that the candidate/RH self-reset already uses successfully, and lands on the existing `/auth/redefinir-senha?tipo=rh` page (`verifyRecoveryOtp` → `setNewPassword`). `generateLink` only returns a link and would require building an email sender — out of scope and less reliable. `[VERIFIED: repo passwordService.ts:61-103 shows resetPasswordForEmail is the live delivery mechanism]`

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `crypto.getRandomValues` (Deno global) | built-in | Generate the throwaway temp password for `createUser` | USR-02 — user never learns it; they set their own via recovery |
| `_shared/schemas.ts` conventions | in-repo | Structured error contract `{ ok, error_code, message, field? }`, `.strict()` allowlist, `zodPathToFieldName` | The `gerenciar-usuario-rh` request schema + error responses |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `resetPasswordForEmail` (auto-send) | `admin.generateLink({type:'recovery'})` | generateLink gives link control but sends nothing → needs a custom mailer (none exists). Reject. |
| `admin.createUser` + recovery | `admin.inviteUserByEmail` | invite sends+creates in one call, but the locked decision defers full invite lifecycle to v2 (USR-09). Reject for M5. |
| PL/pgSQL DEFINER helper for admin RLS | JWT claim `auth.jwt()->'app_metadata'->>'role'` | JWT claim avoids recursion with zero function, but reflects role as of last token refresh (stale after demote/deactivate). DEFINER reads live table → aligns with "source of truth = table". Prefer DEFINER. |
| `pg_advisory_xact_lock` in trigger | `SERIALIZABLE` isolation | SERIALIZABLE would abort the write-skew tx but can't be forced per-statement from supabase-js. Advisory lock is deterministic and local. Prefer advisory lock. |
| `ativo=false` (+hook denies) | `auth.admin` ban only | Ban alone leaves `usuarios_rh` inconsistent and is GoTrue-only; `ativo=false` is the DB source of truth the hook + RLS already read. Use `ativo=false` primary, ban optional. |

**Installation:** none. (Deno EF imports are URL/import-map based; no `npm install`.)

**Version verification:** `@supabase/supabase-js@2` and `zod@3.25.76` are already pinned in-repo (`supabase/functions/deno.json`, `deno.lock`) and in `node_modules` for Vitest — no registry fetch needed. `[VERIFIED: repo]`

## Package Legitimacy Audit

> This phase installs **no new external packages**. It reuses dependencies already vendored and in production use.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@supabase/supabase-js@2` | npm/esm.sh | mature | very high | github.com/supabase/supabase-js | not run (no new install) | Approved — already in prod (every EF) |
| `zod@3.25.76` | npm | mature | very high | github.com/colinhacks/zod | not run (no new install) | Approved — pinned in `deno.json`/`deno.lock` |

**Packages removed due to slopcheck [SLOP] verdict:** none (no new packages).
**Packages flagged as suspicious [SUS]:** none.

*slopcheck was not run because no `npm install`/`pip install`/`cargo add` occurs in this phase. If the planner introduces any new dependency, run the Package Legitimacy Gate before adding it.*

## Architecture Patterns

### System Architecture Diagram

```
  Admin (RH, authenticated)                                         New/target RH user
        │  supabase.functions.invoke('gerenciar-usuario-rh', {action,...})    ▲
        ▼  (Authorization: Bearer <admin JWT>)                                 │ recovery email
┌─────────────────────────────────────────────────────────────────────┐      │ (SMTP)
│  EF gerenciar-usuario-rh  (Deno, JWT-ON)                             │      │
│  1. anon client + Authorization → auth.getUser()      [AUTHENTICATE] │      │
│       └─ no user → 401 UNAUTHORIZED                                  │      │
│  2. service_role client → SELECT role FROM usuarios_rh              │      │
│       WHERE user_id=<caller> AND ativo AND deleted_at IS NULL        │      │
│       └─ role != 'administrador' → 403 FORBIDDEN       [AUTHORIZE]   │      │
│  3. Zod discriminated-union .strict() parse(body.action)            │      │
│       └─ invalid → 400 VALIDATION                                    │      │
│  4. dispatch on action ─────────────────┐                           │      │
└───────────────────────────┬─────────────┼───────────────────────────┘      │
                            │             │                                   │
     criar / resetar_senha  │             │ mudar_papel / ativar / desativar  │
     (touches GoTrue)       ▼             ▼  (DB-only)                         │
   ┌───────────────────────────┐   ┌──────────────────────────────────────┐   │
   │ auth.admin.createUser      │   │ RPC gerir_usuario_rh_mutacao()       │   │
   │  (temp pw, email_confirm)  │   │  SECURITY DEFINER, ONE transaction:  │   │
   │  ↓ on row-insert failure   │   │   • read dados_antes                 │   │
   │  auth.admin.deleteUser     │   │   • pg_advisory_xact_lock (guard)    │   │
   │  (compensating rollback)   │   │   • UPDATE usuarios_rh (mutate)      │   │
   │  ↓ then                     │   │   • INSERT logs_auditoria (audit)   │   │
   │ RPC criar_usuario_rh()     │   └───────────────┬──────────────────────┘   │
   │  (INSERT row + audit, tx)  │                   │ BEFORE UPDATE/DELETE      │
   │  ↓ then                     │                   ▼ trigger (backstop)        │
   │ resetPasswordForEmail ─────┼───────────────► anti-lockout guard ──────────┘
   │  (auto-send recovery)      │        (advisory-lock + count active admins)
   └───────────────────────────┘        refuse if would reach 0 active admins
                            │
                            ▼
        { ok:true, ... } | { ok:false, error_code, message }
```

RLS on `usuarios_rh` (admin-only SELECT via DEFINER helper + own-row; all client writes denied) and on `logs_auditoria` (admin-only SELECT; INSERT only via DEFINER) enforce the boundary underneath — the service_role EF/RPC bypass RLS; the trigger fires even for them.

### Recommended Project Structure
```
supabase/functions/
├── gerenciar-usuario-rh/
│   ├── index.ts              # handler(req, deps) + Deno.serve wiring (two-client)
│   └── __tests__/
│       └── index.test.ts     # Deno test, injected mock deps (per consolidar precedent)
├── _shared/
│   └── usuario-rh-schemas.ts # Zod discriminated union + error codes (mirrors schemas.ts style)
supabase/migrations/
├── <ts>_usr_rh_rls_seg02.sql          # drop qual=true policies, DEFINER helper, admin+own-row, deny writes
├── <ts>_usr_rh_anti_lockout.sql       # trigger fn + BEFORE UPDATE/DELETE trigger
├── <ts>_usr_rh_mutacao_rpc.sql        # SECURITY DEFINER mutate+audit RPC(s)
└── <ts>_logs_auditoria_append_only.sql # drop authenticated INSERT policy; confirm no UPDATE/DELETE policy
database.types.ts             # regenerate at REPO ROOT after migrations
```

### Pattern 1: Authenticate-THEN-Authorize (SEG-01)
**What:** Two-client EF. Anon client (with the caller's `Authorization` header) does `auth.getUser()`; service_role client reads `usuarios_rh` to authorize. Role comes from the **table**, never `getUser().app_metadata` (which does not carry the injected role).
**When to use:** every privileged write in this phase.
**Example:** verbatim skeleton from `consolidar-decisao-final/index.ts:227-261` (see §Code Examples). `[VERIFIED: repo]`

### Pattern 2: Two-write consistency with compensating rollback (USR-02)
**What:** GoTrue `createUser` (external system) then Postgres row insert (transactional). If the row insert fails, delete the just-created GoTrue user to avoid an orphan identity.
**When to use:** `criar`.
**Recommended sequence:**
1. `createUser({ email, password: <random>, email_confirm:true, user_metadata:{nome_completo} })` → `userId`.
2. `rpc('criar_usuario_rh_com_audit', {...})` — SECURITY DEFINER, **one tx**: INSERT `usuarios_rh` (`user_id=userId, role, cargo, nome_completo, email, primeiro_acesso=true, ativo=true, created_by=<actor>`) + INSERT audit row. On unique-violation (email/user_id) or any error → the whole tx rolls back.
3. If step 2 errored → `auth.admin.deleteUser(userId)` (compensate; log if the compensate itself fails) → return structured error.
4. On success → `resetPasswordForEmail(email, {redirectTo: '<origin>/auth/redefinir-senha?tipo=rh'})` **best-effort** (if it fails, the account exists; admin can re-trigger via USR-05 — do not roll back).
**Why this order:** the atomic step (row+audit) is the last thing that can fail transactionally; GoTrue create is the only compensable side-effect; email is idempotent-retriable so it goes last and never blocks success. `[VERIFIED: cadastrar-candidato:149-235 rollback precedent]`

### Pattern 3: Atomic mutate + audit via SECURITY DEFINER RPC (USR-06)
**What:** DB-only actions (`mudar_papel`, `ativar`, `desativar`) execute inside a single `SECURITY DEFINER` PL/pgSQL function that reads `dados_antes`, performs the `UPDATE`, and inserts the `logs_auditoria` row in the same transaction (so the mutation and its audit can never diverge). The GoTrue-touching actions (`criar`, `resetar_senha`) audit best-effort after the external call.
**When to use:** all five actions; DB-only ones get transactional audit, GoTrue ones get best-effort audit.

### Pattern 4: Admin-only RLS without recursion (SEG-02)
**What:** A `LANGUAGE plpgsql SECURITY DEFINER` helper `is_active_rh_admin()` reads `usuarios_rh` for `auth.uid()` and returns boolean. The SELECT policy uses `USING (public.is_active_rh_admin())`. Own-row uses `USING (user_id = (select auth.uid()))` (no subquery, no recursion). `[VERIFIED: web — Supabase recursion guidance + repo original design shows the recursion trap]`

### Anti-Patterns to Avoid
- **Admin RLS by subquerying `usuarios_rh` inside a `usuarios_rh` policy** → `infinite recursion detected in policy` (this is the original `docs/sql/sql/03` design; do NOT copy it). Use the DEFINER helper.
- **`LANGUAGE sql` DEFINER helper** → Postgres inlines simple SQL functions during planning, losing the DEFINER context and re-introducing recursion. Must be `LANGUAGE plpgsql`. `[CITED: dev.to Postgres RLS SECURITY DEFINER gotcha]`
- **Plain `COUNT()` anti-lockout without a lock** → write-skew to zero admins under concurrency (Pitfall 3).
- **`FORCE ROW LEVEL SECURITY` on `logs_auditoria`/`usuarios_rh`** → would subject the SECURITY DEFINER inserts/reads (owner=postgres) to RLS and break the audit write. Do not enable FORCE.
- **Reading role from `getUser().app_metadata`** → the injected role lives only in the signed JWT claims, not in `raw_app_meta_data`; `getUser()` will not return it. Read the table. `[VERIFIED: consolidar-decisao-final:240-245 comment]`
- **`generateLink` expecting an email to arrive** → it never sends (Pitfall 6).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Create an auth identity + set password | Custom user table + password hashing | `auth.admin.createUser` + `resetPasswordForEmail` | GoTrue owns identity, hashing, confirmation, recovery-OTP |
| Deliver a set-password link | A custom SMTP/mailer in the EF | `resetPasswordForEmail` (auto-send via project SMTP) | Existing infra already delivers the candidate/RH recovery email |
| Audit table + retention | New audit table | `logs_auditoria` + `log_auditoria()` RPC (`categoria='usuario'`) | Table, enum value, indexes, DEFINER RPC already exist |
| Row+audit atomicity | App-level "then log" (can diverge) | One SECURITY DEFINER RPC (single tx) | Guarantees mutation and audit commit together |
| Serialize concurrent admin demotions | Optimistic app checks | `pg_advisory_xact_lock` in the trigger | DB-level, race-safe, bypass-proof |
| Block a deactivated RH login | New login guard code | The existing `custom_access_token_hook` already filters `ativo AND deleted_at IS NULL` | Deactivated user resolves to `candidato` on next token — teeth already present |

**Key insight:** almost nothing in this phase is net-new logic; it is *composing and hardening* substrate that already exists. The scarce, genuinely hard parts are (a) the recursion-safe admin RLS and (b) the race-safe anti-lockout — both have exact, documented mechanisms below.

## Runtime State Inventory

> This is a brownfield security/data-model change (RLS rewrite, a live auth hook, live triggers, live audit function). It stores/registers no new external runtime state, but it **modifies live policies/functions/triggers** — so the inventory is about what live objects the plan must reconcile.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `usuarios_rh` live rows: `e2e.admin@beautysmile.com.br` (administrador, active). **0 rows with `role='recrutador'`** today. Admin count = 1 (verify live). | Live-verify active-admin count before enabling the anti-lockout trigger; the single admin is the anti-lockout floor. No data migration. |
| Live service config (RLS/policies not in git) | LIVE `usuarios_rh` policies (per 24-LIVE-STATE.md 2026-07-07): `auth_admin_le_usuarios_rh` (SELECT/supabase_auth_admin/USING true — **PRESERVE**), `usuarios_rh_authenticated_read` (SELECT/authenticated/`qual true` — **PII LEAK, DROP**), `usuarios_rh_simple_read` (SELECT/authenticated/`qual true` — **DROP**). Original `docs/sql/03` policies (`usuarios_rh_read_own`, `_admin_read_all`, `_admin_insert`, `_admin_update_all`) are **not** in the 2026-07-07 capture → assume already replaced; **live-verify full policy list via `pg_policies` in Wave 0**. | Migration: drop the two `qual=true` policies; add DEFINER-helper admin SELECT + own-row SELECT; ensure no client INSERT/UPDATE/DELETE policy remains. Preserve SEC-09. |
| OS-registered state | None. No cron/pg_cron confirmed for `limpar_logs_antigos()` (docs say "run via cron" but no scheduler found in repo). | None (note: `limpar_logs_antigos` is the only DELETE path on `logs_auditoria` — DEFINER, likely unscheduled; see Pitfall 5). |
| Secrets/env vars | EF needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (already present for other EFs). No new secret. | None — confirm the 3 env vars exist for the new function (Supabase injects them by default). |
| Build artifacts / installed packages | `database.types.ts` at REPO ROOT becomes stale after the migrations (new RPCs/policies don't change columns, but regenerate to be safe if any column/constraint is touched). Live triggers on `usuarios_rh`: `update_usuarios_rh_updated_at` (BEFORE UPDATE) and `trigger_criar_preferencias_padrao` (AFTER INSERT) — **live-verify both still exist** (§Open Questions Q3). | Regenerate `database.types.ts` after migrations. Verify the AFTER INSERT trigger won't fail a fresh `usuarios_rh` insert (untested app path — 0 recrutador rows ever created via app). |

**Canonical question — after every file is updated, what live systems still carry old/leaky state?** The two `qual=true` SELECT policies (candidate/recrutador can read the RH roster) persist until the SEG-02 migration drops them; the anti-lockout invariant is unenforced until the trigger lands. Nothing is cached outside Postgres/GoTrue.

## Common Pitfalls

### Pitfall 1: Admin RLS recursion on `usuarios_rh`
**What goes wrong:** A policy `USING (EXISTS (SELECT 1 FROM usuarios_rh WHERE user_id=auth.uid() AND role='administrador'))` on `usuarios_rh` throws `infinite recursion detected in policy for relation "usuarios_rh"`.
**Why it happens:** evaluating the policy runs a SELECT on the same table, which re-triggers RLS. This is exactly the original `docs/sql/sql/03-tabela-usuarios-rh.sql:114-150` design — almost certainly why it was replaced live by the `qual=true` policies.
**How to avoid:** a `LANGUAGE plpgsql SECURITY DEFINER STABLE` helper `is_active_rh_admin()` (bypasses RLS as owner; PL/pgSQL so it is not inlined). Own-row policy uses only `user_id = (select auth.uid())` (never subqueries the table).
**Warning signs:** RH login 406/500 after policy change; `pg_policies` shows a self-referencing `qual`.

### Pitfall 2: The SEG-02 gap is already live — you're removing a leak, not adding a guard
**What goes wrong:** treating `usuarios_rh` as if it were already admin-locked and only "adding own-row" — leaving the two `qual=true` authenticated SELECT policies in place. The roster stays world-readable to every authenticated candidate/recrutador.
**Why it happens:** the 24-LIVE-STATE note flags `usuarios_rh_authenticated_read` + `usuarios_rh_simple_read` as an out-of-scope leak logged "for a future phase" — this **is** that phase.
**How to avoid:** the migration must **DROP** both policies. Add a behavioral smoke that impersonates a candidato/recrutador JWT and asserts `SELECT * FROM usuarios_rh` returns 0 rows (a structural `pg_policies` grep is insufficient — M4/SEC-07/08 lesson).
**Warning signs:** smoke returns >0 rows for a non-admin.

### Pitfall 3: Anti-lockout write-skew (the "two admins demote each other" race)
**What goes wrong:** `COUNT(*) WHERE role='administrador' AND ativo AND deleted_at IS NULL AND id<>OLD.id > 0` passes for both of two concurrent demotions (each sees the other as still active in its snapshot) → both commit → 0 admins → total lockout.
**Why it happens:** READ COMMITTED snapshots don't see each other's uncommitted change; a bare COUNT is a classic write-skew.
**How to avoid:** take `PERFORM pg_advisory_xact_lock( hashtext('usuarios_rh_admin_guard') );` **before** counting, inside the trigger (and optionally the RPC). The advisory lock serializes all admin-count-affecting mutations, so the COUNT is always accurate; concurrent mutations queue rather than deadlock. (Alternative: `SELECT id FROM usuarios_rh WHERE <active admin> ORDER BY id FOR UPDATE` — locks the admin row-set — but the advisory lock is simpler and deadlock-free. Note: `SELECT count(*) … FOR UPDATE` is illegal — FOR UPDATE cannot combine with aggregates.)
**Warning signs:** a concurrency smoke (two parallel demote calls) leaves 0 active admins.

### Pitfall 4: Blind `CREATE OR REPLACE` on the live `custom_access_token_hook`
**What goes wrong:** rewriting the hook to "add the inactive check" drops an existing guard (precedent M4/DBMIG-02 and M4/P27 both silently lost live logic this way).
**Why it happens:** the file in git (`20260420000002_unified_auth_role.sql`) may not byte-match the live body.
**How to avoid:** **the hook already denies inactive/soft-deleted RH** — its `SELECT role FROM usuarios_rh WHERE user_id=… AND ativo=true AND deleted_at IS NULL` means a deactivated user resolves to `candidato` on the next token. **You likely do NOT need to touch the hook at all for USR-04.** If any change is truly required, first `SELECT pg_get_functiondef('public.custom_access_token_hook(jsonb)'::regprocedure)` and diff against the file, preserve every branch, and keep the `auth_admin_le_usuarios_rh` dependency. `[VERIFIED: 20260420000002_unified_auth_role.sql:43-49]`
**Warning signs:** all RH logins demote to `candidato` after a hook edit (the [[reference_auth_hook_rls_gap]] failure mode).

### Pitfall 5: `logs_auditoria` append-only is undermined by a permissive INSERT policy
**What goes wrong:** the live table has (per `docs/sql/28`) a `"Sistema insere logs"` INSERT policy `TO authenticated WITH CHECK (true)` — any authenticated user can forge audit rows. Append-only integrity requires INSERT only via the SECURITY DEFINER path.
**Why it happens:** the original design granted authenticated INSERT and relied on convention.
**How to avoid:** DROP the authenticated INSERT policy (the DEFINER `log_auditoria()`/mutation RPC still writes because the function owner bypasses RLS — do NOT enable FORCE RLS). Confirm there is **no** UPDATE and **no** DELETE policy for authenticated/anon (there isn't per `docs/sql/28`, keep it that way). No client code inserts `logs_auditoria` directly (`grep src/ → 0 hits`) so dropping the policy breaks nothing. Optionally `REVOKE INSERT,UPDATE,DELETE ON logs_auditoria FROM authenticated, anon` for defense-in-depth. **Retention caveat:** `limpar_logs_antigos()` deletes `severidade IN ('info','aviso')` older than 730 days — user-management rows logged at `aviso` would eventually be purged. If USR-06 needs indefinite retention, either log at `critico`/`erro` (kept forever) or exclude `categoria IN ('usuario','seguranca')` from `limpar_logs_antigos` (Open Question Q2).
**Warning signs:** a candidato-JWT smoke can `INSERT INTO logs_auditoria` and succeed.

### Pitfall 6: `generateLink` sends no email
**What goes wrong:** using `admin.generateLink({type:'recovery'})` and expecting the new user to receive a set-password email — nothing arrives.
**Why it happens:** `generateLink` only **returns** the link/OTP for a custom mailer; it does not send. `[CITED: supabase docs]`
**How to avoid:** use `resetPasswordForEmail` (auto-send). See §Standard Stack.
**Warning signs:** user never gets the email; no SMTP activity for created users.

### Pitfall 7: Built-in SMTP is 2 emails/hour — USR-02/USR-05 can silently fail to deliver
**What goes wrong:** if the project relies on Supabase's **built-in** email service, only ~2 recovery/reset emails send per hour; the 3rd admin action's email is dropped/429.
**Why it happens:** built-in email is testing-grade (2/hr); custom SMTP defaults to 30/hr, adjustable. `[CITED: supabase.com/docs/guides/auth/rate-limits + auth-smtp]`
**How to avoid:** confirm the project has **custom SMTP** configured (the candidate/RH reset flow already works, suggesting SMTP is set — but low volume can mask the 2/hr cap). Treat "is custom SMTP configured + rate limit" as an environment dependency (Open Question Q1). The EF should surface a send failure as a non-fatal structured warning (account already created), and USR-05 lets the admin retry.
**Warning signs:** `resetPasswordForEmail` returns `over_email_send_rate_limit`; new users report no email.

### Pitfall 8: `usuarios_rh` NOT NULL columns vs "email + papel only"
**What goes wrong:** the `criar` insert fails because `usuarios_rh` requires `nome_completo`, `cargo`, `email`, `role`, `user_id` all NOT NULL, but USR-02 is framed as "email + papel".
**Why it happens:** `cargo VARCHAR(100) NOT NULL` and `nome_completo VARCHAR(255) NOT NULL` on the table. `[VERIFIED: docs/sql/03 + database.types.ts Insert]`
**How to avoid:** the `criar` action's Zod input must include `nome_completo` and `cargo` (P29's form supplies them), or the EF provides safe defaults. Do NOT relax the NOT NULLs. Also note the DB `role` CHECK allows the legacy set `('administrador','gerente','recrutador','visualizador')` — constrain `role`/`novo_papel` to `{'recrutador','administrador'}` at the Zod layer.
**Warning signs:** 23502 not-null violation on create; a role like `'gerente'` slips through.

## Code Examples

### Authenticate-THEN-Authorize skeleton (adapt verbatim)
```typescript
// Source: supabase/functions/consolidar-decisao-final/index.ts:227-261 [VERIFIED: repo]
// 1. authenticate (anon client carries the caller Authorization header)
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;

// 1b. authorize from the TABLE (not the JWT claim), service_role read
const { data: rhRow } = await supabaseAdmin
  .from("usuarios_rh").select("role")
  .eq("user_id", user.id).eq("ativo", true).is("deleted_at", null)
  .maybeSingle();
if (rhRow?.role !== "administrador") return errorResponse("FORBIDDEN", "Acesso negado.", 403);
// ... only now parse body + dispatch action
```

### Zod discriminated-union action schema (new `_shared/usuario-rh-schemas.ts`)
```typescript
// Pattern mirrors _shared/schemas.ts (.strict(), pt-BR msgs, structured error codes)
import { z } from "zod";
const papel = z.enum(["recrutador", "administrador"]); // NOT the legacy 4-value CHECK
export const gerenciarUsuarioRhSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("criar"),
             email: z.string().email().toLowerCase().trim(),
             nome_completo: z.string().min(3).max(255),
             cargo: z.string().min(1).max(100),           // NOT NULL on usuarios_rh
             papel }).strict(),
  z.object({ action: z.literal("mudar_papel"),
             target_id: z.string().uuid(), novo_papel: papel }).strict(),
  z.object({ action: z.literal("ativar"),   target_id: z.string().uuid() }).strict(),
  z.object({ action: z.literal("desativar"),target_id: z.string().uuid() }).strict(),
  z.object({ action: z.literal("resetar_senha"), target_id: z.string().uuid() }).strict(),
]);
export type GerenciarUsuarioRhInput = z.infer<typeof gerenciarUsuarioRhSchema>;
export type UsuarioRhErrorCode =
  | "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND"
  | "EMAIL_EXISTS" | "LAST_ADMIN" | "EMAIL_SEND_FAILED" | "SERVER_ERROR";
```

### Recursion-safe admin RLS helper + policies (SEG-02)
```sql
-- PL/pgSQL (NOT sql) SECURITY DEFINER so it is NOT inlined and bypasses RLS → no recursion.
CREATE OR REPLACE FUNCTION public.is_active_rh_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_rh
    WHERE user_id = auth.uid() AND role = 'administrador' AND ativo AND deleted_at IS NULL
  ) INTO ok;
  RETURN COALESCE(ok, false);
END; $$;
REVOKE EXECUTE ON FUNCTION public.is_active_rh_admin() FROM public;
GRANT  EXECUTE ON FUNCTION public.is_active_rh_admin() TO authenticated;

-- Remove the world-readable leak (SEG-02) — see 24-LIVE-STATE.md
DROP POLICY IF EXISTS usuarios_rh_authenticated_read ON public.usuarios_rh;
DROP POLICY IF EXISTS usuarios_rh_simple_read        ON public.usuarios_rh;

-- Admin reads the whole roster (no recursion via the DEFINER helper)
CREATE POLICY usuarios_rh_admin_select ON public.usuarios_rh
  FOR SELECT TO authenticated USING (public.is_active_rh_admin());
-- Every RH user reads their OWN row (A37 / authStore profile fetch depends on this)
CREATE POLICY usuarios_rh_own_select ON public.usuarios_rh
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
-- No INSERT/UPDATE/DELETE policy for authenticated/anon → all client writes denied.
-- service_role EF/RPC bypass RLS for writes. Do NOT enable FORCE ROW LEVEL SECURITY.
-- PRESERVE auth_admin_le_usuarios_rh (SEC-09) untouched.
```
*Note: `authStore.fetchProfile` does `.select('*').eq('user_id', userId)` on the caller's own row — the own-row policy is mandatory or a `recrutador` login breaks. `[VERIFIED: src/store/authStore.ts:164-170]`*

### Race-safe anti-lockout trigger (USR-07)
```sql
CREATE OR REPLACE FUNCTION public.tg_usuarios_rh_anti_lockout()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE others int;
BEGIN
  -- Only the removal of an ACTIVE administrador threatens the invariant.
  IF NOT (OLD.role='administrador' AND OLD.ativo AND OLD.deleted_at IS NULL) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP='UPDATE' AND NEW.role='administrador' AND NEW.ativo AND NEW.deleted_at IS NULL THEN
    RETURN NEW;  -- stays an active admin — no threat
  END IF;
  -- Serialize all admin-count mutations to prevent write-skew to zero.
  PERFORM pg_advisory_xact_lock(hashtext('usuarios_rh_admin_guard'));
  SELECT count(*) INTO others FROM public.usuarios_rh
   WHERE role='administrador' AND ativo AND deleted_at IS NULL AND id <> OLD.id;
  IF others = 0 THEN
    RAISE EXCEPTION 'anti_lockout: cannot remove/demote/deactivate the last active administrator'
      USING ERRCODE='P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_usuarios_rh_anti_lockout
  BEFORE UPDATE OR DELETE ON public.usuarios_rh
  FOR EACH ROW EXECUTE FUNCTION public.tg_usuarios_rh_anti_lockout();
```
*The RPC/EF should catch SQLSTATE `P0001` from this and map to `error_code:'LAST_ADMIN'` with a friendly pt-BR message. The EF may also do a non-authoritative pre-count for a nicer UX, but the trigger is the real teeth.*

### Atomic mutate + audit RPC (USR-06)
```sql
-- One transaction: read before-state, guard, mutate, audit. SECURITY DEFINER bypasses RLS.
CREATE OR REPLACE FUNCTION public.gerir_usuario_rh_mutacao(
  p_actor uuid, p_target uuid, p_action text, p_novo_papel text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE antes jsonb; depois jsonb; v_sev severidade_log;
BEGIN
  SELECT to_jsonb(u) INTO antes FROM public.usuarios_rh u WHERE id = p_target FOR UPDATE;
  IF antes IS NULL THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE='P0002'; END IF;

  IF p_action = 'mudar_papel' THEN
    UPDATE public.usuarios_rh SET role = p_novo_papel, updated_by = p_actor WHERE id = p_target;
    v_sev := 'critico';
  ELSIF p_action = 'desativar' THEN
    UPDATE public.usuarios_rh SET ativo = false, updated_by = p_actor WHERE id = p_target;
    v_sev := 'critico';
  ELSIF p_action = 'ativar' THEN
    UPDATE public.usuarios_rh SET ativo = true, updated_by = p_actor WHERE id = p_target;
    v_sev := 'aviso';
  ELSE RAISE EXCEPTION 'VALIDATION' USING ERRCODE='P0001'; END IF;

  SELECT to_jsonb(u) INTO depois FROM public.usuarios_rh u WHERE id = p_target;
  PERFORM public.log_auditoria(
    p_usuario_id := p_actor, p_usuario_tipo := 'admin',
    p_acao := p_action, p_categoria := 'usuario',
    p_descricao := format('Ação %s sobre usuário RH %s', p_action, p_target),
    p_severidade := v_sev, p_recurso_tipo := 'usuarios_rh', p_recurso_id := p_target,
    p_dados_antes := antes, p_dados_depois := depois, p_sucesso := true);
END; $$;
REVOKE EXECUTE ON FUNCTION public.gerir_usuario_rh_mutacao(uuid,uuid,text,text) FROM public, authenticated, anon;
-- Only the service_role EF calls it. The BEFORE UPDATE trigger still fires inside → anti-lockout enforced.
```
*Redact `dados_antes/depois` to non-secret columns if desired (they never contain a password — GoTrue owns credentials). `log_auditoria` is the existing DEFINER RPC. `[VERIFIED: docs/sql/25 log_auditoria signature]`*

### Append-only hardening (USR-06)
```sql
-- Any authenticated user could forge audit rows via this policy — drop it.
DROP POLICY IF EXISTS "Sistema insere logs" ON public.logs_auditoria;
-- Keep admin-only SELECT ("Admin vê logs"); confirm NO update/delete policy exists (append-only).
-- INSERT now happens ONLY through SECURITY DEFINER functions (owner bypasses RLS). Do NOT force RLS.
REVOKE INSERT, UPDATE, DELETE ON public.logs_auditoria FROM authenticated, anon; -- defense in depth
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Self-referencing `EXISTS(SELECT … FROM usuarios_rh)` admin policy | PL/pgSQL `SECURITY DEFINER` helper `is_active_rh_admin()` | long-standing Supabase guidance | avoids `infinite recursion detected in policy` |
| `resetPasswordForEmail` PKCE magic-link | email-OTP (`verifyOtp type:'recovery'`) landing on `/auth/redefinir-senha` | this project M1 (D-15/D-16) | recovery works cross-browser/device; reuse it for USR-02/05 |
| Built-in Supabase email (2/hr) | Custom SMTP (30/hr default, adjustable) | Supabase production guidance | USR-02/05 delivery reliability depends on custom SMTP being configured |

**Deprecated/outdated:**
- The original `docs/sql/sql/03-tabela-usuarios-rh.sql` RLS block (self-referencing admin policies) — superseded live by `qual=true` policies; do not resurrect it verbatim.
- `docs/sql` RLS predicate `usuarios_rh.id = auth.uid()` (compares the table PK to the auth uid) is **wrong** for this schema — the auth linkage is `user_id`, not `id`. Use `user_id = auth.uid()`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Live `usuarios_rh` still has exactly the 2 permissive `qual=true` SELECT policies + `auth_admin_le_usuarios_rh` (per 2026-07-07 capture); no other client write policies remain | Runtime State / Pitfall 2 | If extra write policies exist live, the SEG-02 migration must also drop them — Wave 0 `pg_policies` capture resolves this |
| A2 | `custom_access_token_hook` live body still filters `ativo=true AND deleted_at IS NULL` (matches `20260420000002`) → USR-04 needs no hook change | Pitfall 4 | If the live body drifted, deactivated users might still get an RH token — `pg_get_functiondef` in Wave 0 confirms |
| A3 | Project has custom SMTP configured (candidate reset works) so USR-02/05 email delivers above 2/hr | Pitfall 7 / Env | If only built-in SMTP, bulk user creation drops emails — verify in dashboard |
| A4 | `log_auditoria()` and its dependents (`usuarios_rh`, `logs_auditoria`) are owned by `postgres` so SECURITY DEFINER bypasses RLS for the audit INSERT | Pitfall 5 / Code Examples | If owner is a non-BYPASSRLS role, dropping the INSERT policy could block audit writes — verify owner / keep a service_role path |
| A5 | The AFTER INSERT trigger `trigger_criar_preferencias_padrao` (from `docs/sql/03`) either no longer exists or won't fail a fresh `usuarios_rh` insert | Runtime State / Open Q3 | A failing/absent-table trigger would break USR-02 create — live-verify triggers on `usuarios_rh` |
| A6 | `resetPasswordForEmail` is callable from the EF (service_role runtime) using an anon-key client and sends via project SMTP | Standard Stack | If it must be called with a user session, USR-02/05 delivery path changes — validate in an EF smoke |

**If this table looks large:** it is deliberately explicit — every A# maps to a Wave 0 live-verify step, consistent with the M4 24-01 "capture live state before authoring migrations" discipline.

## Open Questions

1. **Is custom SMTP configured, and what is the auth-email rate limit?**
   - What we know: candidate/RH `resetPasswordForEmail` works today; built-in is 2/hr, custom defaults to 30/hr.
   - What's unclear: whether the project is on built-in or custom SMTP.
   - Recommendation: verify in Supabase dashboard (Auth → SMTP + Rate Limits) during Wave 0; make the EF treat email-send failure as non-fatal (`EMAIL_SEND_FAILED` warning, account already created; USR-05 retries).

2. **Retention of user-management audit rows vs `limpar_logs_antigos()`.**
   - What we know: `limpar_logs_antigos()` deletes `severidade IN ('info','aviso')` older than 730 days; there's no confirmed scheduler.
   - What's unclear: whether USR-06 requires indefinite retention.
   - Recommendation: log user-management actions at `critico` (role change, deactivate) / `aviso` (reactivate) and, if indefinite retention is required, exclude `categoria IN ('usuario','seguranca')` from `limpar_logs_antigos` (a tiny, in-scope hardening).

3. **Live triggers on `usuarios_rh` (does a fresh insert fire anything that can fail?).**
   - What we know: `docs/sql/03` declares `update_usuarios_rh_updated_at` (BEFORE UPDATE) and `trigger_criar_preferencias_padrao` (AFTER INSERT); 0 RH rows have ever been created through the app.
   - What's unclear: whether the AFTER INSERT trigger (and its target table/function) still exist and succeed.
   - Recommendation: Wave 0 `pg_get_triggerdef` on `usuarios_rh`; if the preferences trigger references a missing table, drop it or make the create RPC resilient.

4. **`cargo`/`nome_completo` for `criar` (NOT NULL).**
   - What we know: both are NOT NULL; USR-02 is framed as "email + papel".
   - Recommendation: the `criar` Zod input includes `nome_completo` + `cargo` (P29 form provides them). Coordinate the request contract with Phase 29 now so the EF isn't reworked later.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP `apply_migration` | Applying the 4 migrations to PROD (bypasses 42601) | ✓ (used every phase) | — | `supabase db push --linked` (risk of 42601 on `$$` bodies) |
| Supabase CLI `functions deploy` | Deploy `gerenciar-usuario-rh` (JWT-ON) | ✓ | — | Dashboard function editor |
| Supabase CLI `gen types` | Regenerate `database.types.ts` at repo root | ✓ | — | manual edit (discouraged) |
| GoTrue SMTP (custom) | USR-02/05 email delivery | ? verify | — | built-in 2/hr (inadequate) → non-fatal warning + USR-05 retry |
| Deno | EF runtime + `deno test` | ✓ | — | — |
| `SUPABASE_SERVICE_ROLE_KEY` / `ANON_KEY` / `URL` env | EF two-client | ✓ (auto-injected) | — | — |

**Missing dependencies with no fallback:** none blocking.
**Missing dependencies with fallback:** custom SMTP unverified — fallback is a non-fatal email-send warning; the account/mutation still succeeds.

## Validation Architecture

> nyquist_validation is enabled (config `workflow.nyquist_validation: true`). Behavioral SQL smokes with impersonated JWT are the load-bearing gate — structural `pg_policies`/greps pass while a real leak persists (M4/SEC-07/08 lesson).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit/component, config in `vite.config.ts` `test` block) · Deno test (EF handler with injected mock deps) · SQL behavioral smokes (impersonated JWT, PROD, via MCP `execute_sql`) · Playwright (e2e, gated — N/A this backend phase) |
| Config file | `vite.config.ts` · `supabase/functions/deno.json` |
| Quick run command | `npm run test:run` |
| Full suite command | `npm run test:run && deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` |
| Type-check | `npm run lint` (tsc --noEmit; must not inflate the frozen baseline) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated / Smoke Command | File Exists? |
|--------|----------|-----------|---------------------------|-------------|
| SEG-01 | Unauthenticated invoke → 401; authenticated non-admin → 403; admin → dispatch | Deno test (injected `getUser`/`usuarios_rh` mocks) | `deno test … supabase/functions/gerenciar-usuario-rh` | ❌ Wave 0 |
| SEG-01 | No service_role key / privileged client in `src/` bundle | grep-guard (Vitest) | `npm run test:run` | ❌ Wave 0 (extend `src/__tests__/guards/`) |
| SEG-02 | Candidato JWT + recrutador JWT `SELECT * FROM usuarios_rh` → **0 rows** | SQL smoke (`set_config request.jwt.claims` + `SET ROLE authenticated`) | PROD smoke via MCP | ❌ Wave 0 |
| SEG-02 | Admin JWT reads full roster; own-row read works for a non-admin RH (`user_id=auth.uid()`) | SQL smoke | PROD smoke | ❌ Wave 0 |
| SEG-02 | `auth_admin_le_usuarios_rh` still present + `USING true` after migration | SQL assertion (`pg_policies`) | PROD smoke | ❌ Wave 0 |
| USR-07 | Demote/deactivate/delete the **last** active admin → raises `LAST_ADMIN` (P0001), 0 mutation | SQL smoke (single-admin fixture) | PROD smoke | ❌ Wave 0 |
| USR-07 | Concurrency: two parallel demotions of two admins → exactly one succeeds, ≥1 admin remains | SQL smoke (2 sessions / advisory-lock proof) | PROD smoke | ❌ Wave 0 |
| USR-06 | DB-only mutation writes row change **and** one `logs_auditoria` row (`categoria='usuario'`) atomically; forced failure rolls back both | SQL smoke (disposable fixture) | PROD smoke | ❌ Wave 0 |
| USR-06 | Candidato/recrutador JWT cannot `INSERT`/`UPDATE`/`DELETE` `logs_auditoria`; admin cannot UPDATE/DELETE either | SQL smoke | PROD smoke | ❌ Wave 0 |
| USR-02 | `criar` orphan-rollback: forced `usuarios_rh` insert failure → `deleteUser` called (no orphan GoTrue user) | Deno test (mock `admin.*` + rpc) | `deno test …` | ❌ Wave 0 |
| USR-02/05 | Recovery email path: `resetPasswordForEmail` invoked with correct `redirectTo`; send-failure → `EMAIL_SEND_FAILED` non-fatal | Deno test | `deno test …` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:run` (scoped where possible).
- **Per wave merge:** full suite (Vitest + Deno) + the SQL smokes relevant to that wave on PROD.
- **Phase gate:** full suite green + `npm run lint` not above baseline + all SEG-01/02, USR-06/07 SQL smokes PASS before `/gsd:verify-work` / `/gsd-secure-phase`.

### Wave 0 Gaps
- [ ] Live-state capture (Wave 0): `pg_policies` on `usuarios_rh` + `logs_auditoria`; `pg_get_functiondef('custom_access_token_hook')`; `pg_get_triggerdef` on `usuarios_rh`; active-admin `count(*)`; function owners (resolves A1–A6).
- [ ] `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts` — SEG-01 auth/authz + USR-02 rollback + email path (injected deps, per `consolidar` precedent).
- [ ] SQL smoke harness file for SEG-02 (roster leak), USR-07 (last-admin + concurrency), USR-06 (atomic audit + append-only) — impersonated JWT, disposable fixtures, cleanup.
- [ ] Grep guard extension: no service_role/privileged client in `src/` (SEG-01).

## Security Domain

> `security_enforcement` is not disabled in config → enabled. This phase **is** the security surface (privilege escalation), so `/gsd-secure-phase` is expected after.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture / Trust boundaries | yes | Two-client EF; service_role only server-side; RLS + trigger as independent DB teeth |
| V2 Authentication | yes | GoTrue `auth.getUser()` verifies JWT; `createUser`/recovery own credentials; temp password never returned to client |
| V4 Access Control (authz, IDOR, privilege escalation) | yes | Authorize from `usuarios_rh` (active admin) before any write; RLS admin-only + own-row; anti-lockout invariant |
| V5 Input Validation | yes | Zod discriminated-union `.strict()` fail-closed; `role` constrained to `{recrutador,administrador}` |
| V7 Logging & Error handling / audit | yes | Append-only `logs_auditoria` via DEFINER RPC; no secrets in `dados_antes/depois`; structured error contract, no stack/PII leakage |
| V6 Cryptography | partial | Temp password via `crypto.getRandomValues`; never log passwords/OTP/tokens (Pitfall-7 precedent in `passwordService`) |

### Known Threat Patterns for {Supabase EF + Postgres RLS + GoTrue admin}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Non-admin invokes the EF to create/promote a user | Elevation of Privilege | Authenticate-THEN-authorize from `usuarios_rh` (active admin) before any action; 401/403 |
| Candidate/recrutador reads the RH roster (PII) | Information Disclosure | Drop `qual=true` policies; admin-only SELECT via DEFINER helper; own-row only otherwise (SEG-02) |
| Self-promotion `recrutador → administrador` via profile path | Elevation of Privilege | This phase makes the EF the **only** writer of `role`; RLS denies client UPDATE (SEG-03 verified in P30 against that fact) |
| Last-admin lockout (accidental or malicious) | Denial of Service | Advisory-lock-guarded `BEFORE UPDATE/DELETE` trigger refusing to reach 0 active admins (race-safe) |
| Forged / tampered audit entries | Repudiation / Tampering | Append-only: drop authenticated INSERT policy, no UPDATE/DELETE policy, INSERT only via DEFINER RPC in the same tx as the mutation |
| Orphan GoTrue identity after partial create | Tampering / integrity | `createUser` → row+audit RPC → compensating `deleteUser` on failure |
| Recovery-link email hijack / enumeration | Info Disclosure | Reuse the existing OTP recovery flow + anti-enumeration copy; never log email/OTP/token (Pitfall-7) |
| SQL injection via `role`/free-text | Tampering | Parameterized RPC args; enum-constrained `role`; `.strict()` Zod |
| Blind `CREATE OR REPLACE` drops a live hook guard | Tampering | `pg_get_functiondef` diff before touching `custom_access_token_hook`; ideally don't touch it (already denies inactive) |

## Sources

### Primary (HIGH confidence)
- Repo: `supabase/functions/consolidar-decisao-final/index.ts` (authenticate-THEN-authorize, two-client) — VERIFIED
- Repo: `supabase/functions/cadastrar-candidato/index.ts` (`createUser` + rollback `deleteUser`) — VERIFIED
- Repo: `supabase/functions/_shared/schemas.ts` (`.strict()`, structured error contract, bare-zod) — VERIFIED
- Repo: `supabase/migrations/20260420000002_unified_auth_role.sql` (`custom_access_token_hook` filters `ativo AND deleted_at IS NULL`) — VERIFIED
- Repo: `supabase/migrations/20260706110006_sec09_auth_admin_policy.sql` (`auth_admin_le_usuarios_rh` = SELECT/supabase_auth_admin/USING true) — VERIFIED
- Repo: `.planning/milestones/v4.0-phases/24-…/24-LIVE-STATE.md` (live `usuarios_rh` policies incl. the two `qual=true` leaks; SEC-09 predicate) — VERIFIED
- Repo: `docs/sql/sql/03-tabela-usuarios-rh.sql`, `24-tabela-logs-auditoria.sql`, `25-functions-configuracoes.sql`, `28-rls-configuracoes.sql`, `19-enums-configuracoes.sql` (schema, `log_auditoria` signature, enum values, original RLS) — CITED
- Repo: `src/store/authStore.ts:158-225` (own-row profile read `.eq('user_id',…)`) · `src/features/auth/services/passwordService.ts` (recovery/OTP delivery) — VERIFIED
- Supabase docs: `reference/javascript/auth-admin-generatelink` (no email send), `auth-admin-updateuserbyid` (`ban_duration`), `auth-admin-createuser` (optional password, `email_confirm`), `guides/auth/rate-limits` + `guides/auth/auth-smtp` (2/hr vs 30/hr) — CITED

### Secondary (MEDIUM confidence)
- WebSearch (multiple, cross-verified): Supabase RLS infinite-recursion + PL/pgSQL SECURITY DEFINER gotcha (SQL functions inlined lose DEFINER context) — dev.to, Supabase discussions #1138/#3328
- WebSearch: Supabase built-in SMTP 2/hr, custom SMTP 30/hr adjustable — Supabase docs + community

### Tertiary (LOW confidence / live-verify required)
- Exact current full policy list + write policies on `usuarios_rh` (A1), live hook body (A2), SMTP config (A3), function ownership (A4), live triggers (A5) — all deferred to Wave 0 live capture (MCP `execute_sql`), since the Supabase MCP tools were not exposed to the research agent.

## Metadata

**Confidence breakdown:**
- Standard stack / GoTrue API: HIGH — official docs + exact in-repo precedents for every call.
- Architecture (EF authz, atomic RPC, RLS): HIGH — cloned from live, working EFs; recursion + write-skew mechanisms are documented.
- Live DB state (policies/hook/triggers/SMTP): MEDIUM — best available is the 2026-07-07 capture + git files; the research agent could not run MCP `execute_sql`, so A1–A6 are Wave-0 verify items.
- Pitfalls: HIGH — each is either observed in-repo (leaks, hook guard) or documented (recursion, write-skew, SMTP, generateLink).

**Research date:** 2026-07-13
**Valid until:** ~2026-08-13 (stable domain; re-verify live DB state at plan time regardless — it changes independently of this doc)
