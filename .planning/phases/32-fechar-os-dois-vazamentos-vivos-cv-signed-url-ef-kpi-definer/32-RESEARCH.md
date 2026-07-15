# Phase 32: Fechar os Dois Vazamentos Vivos — CV Signed-URL EF + KPI DEFINER RPC (BLOCKING) - Research

**Researched:** 2026-07-15
**Domain:** Supabase Edge Function (Deno) authorize-THEN-authenticate + Postgres SECURITY DEFINER RPC + Storage RLS hardening + behavioral JWT-impersonated smokes
**Confidence:** HIGH (every pattern is a verbatim copy of shipped, PROD-live code in this repo)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**EF `get-curriculo-url` + policy do bucket `curriculos` (SEG-01)**
- **Input:** `candidatura_id` (a EF resolve `curriculo_url` + `vaga_id` + posse server-side). **Nunca** aceitar um `path` bruto do cliente (forjável).
- **Authorize-THEN-authenticate:** copiar o padrão two-client (D-23) da `comparativo-candidatos`: `supabaseUser` (anon + Authorization header) faz `getUser()`; `supabaseAdmin` (service_role) lê o papel de `usuarios_rh` (mapear `recrutador→rh`) e checa posse da vaga (`vagas.created_by = user.id`, admin bypassa). 403 se não for dono/admin.
- **Signed URL:** `supabaseAdmin.storage.from('curriculos').createSignedUrl(path, 60)` — TTL curto de 60s (one-shot open/download).
- **JWT mode:** deploy **JWT-ON** (`verify_jwt` default) — só chamadores autenticados chegam; a autorização acontece dentro.
- **Policy change:** remover **apenas** o branch RH role-only de `curriculos_select_own_or_rh` (`20260425000002_curriculos_bucket.sql` L64-67: `role IN ('rh','administrador')`). **Manter** o branch candidato own-folder (`(storage.foldername(name))[1] = auth.uid()::text`) e as policies de upload (`curriculos_insert_own`/`update_own`/`delete_own`). A EF (via service_role) é o único caminho RH ao CV.
- **Client rewire:** `cvUploadService.getSignedUrl()` passa a chamar `supabase.functions.invoke('get-curriculo-url', { body: { candidatura_id } })` em vez de `createSignedUrl` client-side. (Hoje `getSignedUrl` não tem consumidor de componente vivo — só testes — então o blast radius é mínimo; a Phase 34 é quem consome de fato.)

**RPC `funil_kpis` (SEG-02)**
- **DEFINER + `SET search_path=''`;** scoping interno `WHERE v.created_by = (select auth.uid())` salvo `administrador` (bypassa). Param opcional `p_vaga_id uuid DEFAULT NULL` — null = todas as vagas do dono; específico = aquela vaga (ainda owner-checked). REVOKE FROM PUBLIC + GRANT EXECUTE TO authenticated.
- **Conjunto de KPIs (P32):** os 3 agregados core PII-safe — **mediana de tempo por etapa** (`percentile_cont(0.5)` sobre deltas de `criado_em` entre transições em `historico_candidatura`, via window/LEAD), **conversão etapa→etapa** (contagem bruta em P32), **volume por etapa**. Os KPIs adicionais (time-to-hire, taxa de knockout, drop-por-etapa, no-show) são Phase 34.
- **Base da conversão:** contagem bruta stage→stage em P32; o refinamento de coorte fechada por janela (K4) é **deferido à Phase 34**.
- **Retorno:** um único `jsonb`. **Nunca** retorna identidade de candidato (nome/email/id) — apenas agregados.

**`rh_le_historico` + harness de smoke (SEG-02)**
- **`rh_le_historico`** de `historico_candidatura` (`20260607000006:73-77`, role-only) endurecido para o predicado WR-04 vaga-scoped (copiar `redacao_rh_select` de `sec05_08_vaga_scope.sql` — mesma forma de join sem `vaga_id` direto: admin OR `rh AND candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id=c.vaga_id WHERE v.created_by=auth.uid())`). Belt-and-suspenders **junto** com a RPC DEFINER. Manter `candidato_le_proprio_historico` intacto.
- **Smokes (JWT-impersonado, fixture descartável, ROLLBACK-free):** (a) recrutador A **não** obtém o CV de um candidato da vaga de B via a EF (403/deny); (b) recrutador A **não** vê números da vaga de B via `funil_kpis`; (c) recrutador A **não** faz SELECT em `historico_candidatura` da vaga de B (RLS deny); (d) `funil_kpis` retorna zero PII (só agregados); (e) grep-guard de bundle — nenhuma `service_role` no bundle do cliente e nenhum `createSignedUrl` client-side sobre `curriculos`.
- **Teste da EF:** deno unit test para o branch de autorização (getUser → role → posse) **+** um curl smoke ao vivo pós-deploy (JWT do recrutador A vs candidatura da vaga B → 403).

### Claude's Discretion
- Nome exato/assinatura da RPC (`funil_kpis(p_vaga_id uuid DEFAULT NULL) RETURNS jsonb`), forma interna dos agregados jsonb, e naming do deno test ficam a critério no plano, seguindo `registrar_decisao`/`comparativo-candidatos`.
- Se a mediana de tempo-por-etapa precisar de um CTE com `LEAD(criado_em) OVER (PARTITION BY candidatura_id ORDER BY criado_em)` para computar deltas por transição — decisão de implementação no plano.

### Deferred Ideas (OUT OF SCOPE)
- **Dashboard de KPIs / fila de trabalho / CV+IA+feed na tela** — Phase 34 (VISRH/KPI), consome os primitivos seguros desta fase.
- **KPIs adicionais** (time-to-hire, knockout rate, drop-per-stage, no-show) — Phase 34 (KPI-04; no-show depende de AGEND-03).
- **Refinamento de coorte fechada da conversão (K4)** — Phase 34.
- **Remoção do `RelatoriosRHPage` legado** — cleanup opcional (substituído pelo dashboard P34).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **SEG-01** | O acesso ao CV é vaga-scoped — a policy de leitura role-only do bucket `curriculos` é **removida** e substituída pela EF (única via RH); um smoke com JWT impersonado prova que o recrutador A não obtém o CV de um candidato da vaga de B. | EF skeleton (§Code Examples #1), bucket policy edit (§Code Examples #2), client rewire (§Code Examples #5), bundle grep-guard (§Code Examples #6), deno test + live curl (§Validation Architecture) |
| **SEG-02** | A agregação de KPIs é vaga-scoped por construção (scoping interno no RPC DEFINER) e o read role-only de `historico_candidatura` (`rh_le_historico`, diferido na P24 e nunca varrido) é endurecido para o predicado vaga-scoped WR-04 (defense-in-depth); smoke prova que o recrutador A não vê números da vaga de B. | `funil_kpis` DEFINER + median SQL (§Code Examples #3), `rh_le_historico` WR-04 hardening (§Code Examples #4), JWT-impersonated SQL smokes (§Validation Architecture) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Actionable directives this phase MUST honor (same authority as locked decisions):

1. **NUNCA `supabaseAdmin`/service_role no client-side** — service_role lives ONLY in the Edge Function. Enforced by the existing grep guard `src/__tests__/guards/no-service-role-src.grep.test.ts`.
2. **Operações privilegiadas → Edge Functions** — the RH→CV read is exactly such an operation; it belongs in `get-curriculo-url`, not the client.
3. **RLS habilitado em 100% das tabelas** — do not disable RLS on `storage.objects` or `historico_candidatura`; only tighten predicates.
4. **Duplicate/privileged reads via RPC SECURITY DEFINER (não anon SELECT)** — `funil_kpis` is the DEFINER read; the client never SELECTs `historico_candidatura` aggregates directly.
5. **Migrations PL/pgSQL** — `CREATE FUNCTION`/`$$` bodies + adjacent `REVOKE`/`GRANT`/`COMMENT` trip SQLSTATE 42601 via `db push --linked` in the pooler. Apply via **Supabase MCP `apply_migration`** (bypasses 42601, writes its own version row). NO outer `BEGIN;…COMMIT;` wrapper (the MCP/CLI wraps each migration itself — D-22).
6. **`database.types.ts` gerado (NUNCA editar manualmente)** — regen via `npm run db:types` after `funil_kpis` lands. File lives at the **repo ROOT**, not `src/types/`.
7. **`import.meta.env.DEV` gating / product language / RNF-07a (nunca auto-rejeita)** — not exercised by this phase (read-only primitives), but the RPC returns aggregates only, never a verdict/decision.
8. **tsc-only lint** — `npm run lint` is `tsc --noEmit`. The client rewire must keep the type-check green.

## Summary

Phase 32 closes two **live, PROD-confirmed** horizontal-leak surfaces by building two vaga-scoped read-primitives that Phase 34's RH screens will consume. Both are pure copies of already-shipped, PROD-live patterns in this repo — the phase is *reuse-and-tighten*, not new invention. There is **zero end-user UI** and **zero new npm dependency**.

**Leak 1 (SEG-01 — CV):** the `curriculos` bucket's SELECT policy grants read to *any* `rh`/`administrador` — not vaga-scoped. A recruiter can read every candidate's CV. The fix removes the RH branch of that Storage policy (candidate own-folder branch stays) and routes all RH CV access through a new Edge Function `get-curriculo-url` that copies the `comparativo-candidatos` two-client authorize-THEN-authenticate skeleton verbatim: authenticate the JWT with the anon client, then read role from `usuarios_rh` and check `vagas.created_by` with the service_role client, then mint a 60-second signed URL. The client's `cvUploadService.getSignedUrl(path)` becomes `functions.invoke('get-curriculo-url', { body: { candidatura_id } })`.

**Leak 2 (SEG-02 — KPIs + audit trail):** the `funil_kpis` SECURITY DEFINER RPC computes median-time-per-stage (`percentile_cont(0.5)` over `LEAD`-derived transition deltas in `historico_candidatura`), stage→stage raw conversion counts, and volume-by-stage — all internally scoped to the caller's owned vagas (admin bypasses), returning a single PII-free `jsonb`. Belt-and-suspenders, the role-only `rh_le_historico` policy (explicitly deferred by Phase 24 and never swept) is hardened to the shipped WR-04 vaga-scoped predicate by copying `redacao_rh_select` verbatim.

**Primary recommendation:** Clone `comparativo-candidatos/index.ts` for the EF and `get_avaliacao_status` (jsonb DEFINER) + `redacao_rh_select` (WR-04 join) for the migration, character-for-character on the security-load-bearing lines. The acceptance gate is the **behavioral JWT-impersonated smoke** (precedent P24: smokes caught a REVOKE no-op and an OR-defeat that structural `pg_policies` checks passed) — treat it as authoritative above any structural grep.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Authenticate RH caller (verify JWT) | Edge Function (anon client `getUser()`) | — | Auth belongs server-side; `verify_jwt` on the EF ensures only authenticated callers reach the handler |
| Authorize RH caller (role + vaga ownership) | Edge Function (service_role reads `usuarios_rh` + `vagas.created_by`) | Storage RLS (candidate own-folder branch) | authenticate ≠ authorize; the EF is the ONLY privileged CV path after the role-only Storage branch is removed |
| Mint short-lived CV URL | Edge Function (`createSignedUrl(path, 60)` via service_role) | — | Signing requires privileged storage access; must never touch the browser bundle |
| KPI aggregation (median/conversion/volume) | Database (SECURITY DEFINER RPC) | — | Aggregation over `historico_candidatura` needs to bypass row RLS but re-impose vaga-scope internally; DEFINER is the sanctioned channel (CLAUDE.md §Security Rules) |
| Vaga-scope the audit-trail read | Database (RLS policy `rh_le_historico` WR-04) | DEFINER RPC (does not depend on this policy) | Direct client SELECTs on `historico_candidatura` still pass through RLS; the policy closes the direct leak, the RPC closes the aggregate leak |
| Invoke the EF / call the RPC from the app | Browser / Client (`supabase.functions.invoke` / `supabase.rpc`) | — | Client holds only the anon key + user JWT; it dispatches, never privileges |
| Regression tripwire (no service_role, no client `createSignedUrl`) | Build-time (Vitest grep guard) | — | Static guard keeps the bundle clean across future edits |

## Standard Stack

No new packages. Every dependency below is already pinned and PROD-live in this repo.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | `2` (esm.sh) in EF; `^2.104.0` in client | EF two-client (anon + service_role); client `functions.invoke` + `.rpc` | Established D-23 two-client pattern across all 15 EFs [VERIFIED: codebase `comparativo-candidatos/index.ts:36`, `package.json:34`] |
| Deno runtime | Supabase EF default | Runs `get-curriculo-url` | All existing EFs are Deno [VERIFIED: codebase `supabase/functions/`] |
| PostgreSQL `plpgsql` | Supabase managed | `funil_kpis` SECURITY DEFINER RPC | DEFINER RPC is the sanctioned privileged-read channel [VERIFIED: codebase `get_avaliacao_status.sql`] |
| `deno.land/std` assert | `0.224.0` | EF deno unit test | Precedent `submit-candidatura/index.test.ts:37` [VERIFIED: codebase] |
| Vitest | `^4.1.9` | Client-side unit + grep-guard tests | Project test runner [VERIFIED: codebase `package.json:93`] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/efErrors` (`extractEfErrorCode`) | in-repo | Normalize EF `{ok,error_code,message}` into service errors | The client rewire's error handling (mirror `usuariosRhService.invokeWrite`) [VERIFIED: codebase `usuariosRhService.ts:32,136`] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EF-minted signed URL | Keep client `createSignedUrl` but tighten the Storage RLS to vaga-scope | REJECTED by CONTEXT: Storage RLS on `storage.objects` cannot cheaply join `curriculos` path → `candidaturas` → `vagas.created_by` (path is `{auth.uid}/{uuid}.pdf`, no candidatura link); the EF is the clean vaga-scope boundary |
| `funil_kpis` DEFINER RPC | Materialized view / client aggregate over an RLS-scoped `historico_candidatura` | REJECTED: client aggregation forces the full row set (PII `ator`/timestamps) into the browser; DEFINER returns only PII-free aggregates |

**Installation:** none — zero new packages.

## Package Legitimacy Audit

**N/A — this phase installs zero external packages.** All libraries are already pinned and PROD-live in the repo (`@supabase/supabase-js`, Deno std, plpgsql, Vitest). The Package Legitimacy Gate is not triggered. The milestone thesis is explicit: *"Zero dependências npm novas"* [VERIFIED: codebase `.planning/REQUIREMENTS.md:5`].

## Architecture Patterns

### System Architecture Diagram

```
CV READ PATH (SEG-01) — after the fix
─────────────────────────────────────
  RH browser (anon key + user JWT)
        │  supabase.functions.invoke('get-curriculo-url', {body:{candidatura_id}})
        ▼
  Edge Function get-curriculo-url   [verify_jwt = ON]
        │
        ├─ OPTIONS? → 200 CORS short-circuit (before any auth)
        │
        ├─ 1. supabaseUser (anon + Authorization).auth.getUser()
        │        └─ null/err ────────────────────────────► 401 UNAUTHORIZED
        │
        ├─ 2. supabaseAdmin (service_role) reads role from usuarios_rh
        │        (recrutador→rh, administrador→administrador)
        │        └─ role ∉ {rh, administrador} ──────────► 403 FORBIDDEN
        │
        ├─ 3. supabaseAdmin reads candidaturas{curriculo_url, vaga_id}
        │        └─ no row / curriculo_url NULL ─────────► 404 NOT_FOUND
        │
        ├─ 4. if role='rh': vagas.created_by == user.id ?
        │        └─ not owner ───────────────────────────► 403 FORBIDDEN
        │        (administrador bypasses this check)
        │
        └─ 5. supabaseAdmin.storage.from('curriculos')
                 .createSignedUrl(curriculo_url, 60)
                 └─ 200 { ok:true, signedUrl }  (TTL 60s)

  Storage bucket curriculos (RLS)
     candidate own-folder SELECT branch ...... KEPT
     RH role-only SELECT branch .............. REMOVED  ← the closed leak
     candidate insert/update/delete own ...... KEPT


KPI + AUDIT PATH (SEG-02)
─────────────────────────
  RH browser ──supabase.rpc('funil_kpis', {p_vaga_id})──►
  funil_kpis()  [SECURITY DEFINER · SET search_path='']
     ├─ admin?  (auth.jwt() #>> '{app_metadata,role}' = 'administrador')
     │     └─ scope = all vagas
     ├─ else    scope = vagas WHERE created_by = auth.uid()
     ├─ (optional) narrow to p_vaga_id (still owner-checked)
     └─ RETURN jsonb {
           median_time_per_stage,   ← percentile_cont(0.5) over LEAD deltas
           conversion_stage_to_stage,← raw counts
           volume_by_stage           ← counts
        }   ── NO ator, NO candidate identity ──

  Direct client SELECT historico_candidatura
     └─ RLS rh_le_historico (WR-04 vaga-scoped) ─── belt-and-suspenders
```

### Recommended Project Structure
```
supabase/
├── functions/
│   └── get-curriculo-url/
│       ├── index.ts            # two-client authorize-THEN-authenticate + createSignedUrl(path,60)
│       └── index.test.ts       # deno unit test: 401 / 403-role / 403-owner / 404 / 200
├── migrations/
│   ├── 2026071500000X_curriculos_drop_rh_read.sql   # DROP+CREATE curriculos_select_own_or_rh (candidate branch only)
│   └── 2026071500000Y_funil_kpis_and_rh_le_historico.sql  # RPC DEFINER + rh_le_historico WR-04
└── tests/
    └── seg32_smokes.sql        # JWT-impersonated behavioral smokes (a)-(e)

src/features/vagas/services/
├── cvUploadService.ts          # getSignedUrl(candidatura_id) → functions.invoke
└── __tests__/cvUploadService.test.ts   # updated: mock functions.invoke, not createSignedUrl

src/__tests__/guards/
└── no-service-role-src.grep.test.ts    # EXTEND: also forbid client createSignedUrl over curriculos
database.types.ts               # regen (ROOT) after funil_kpis
```

### Pattern 1: EF two-client authorize-THEN-authenticate (D-23)
**What:** anon client (with the caller's `Authorization` header) does `getUser()` to authenticate; service_role client does the privileged role/ownership reads and the signing. Role comes from `usuarios_rh` (NOT `getUser().app_metadata` — the hook injects role only into the signed JWT claims, not the DB `raw_app_meta_data`).
**When to use:** any EF that reads privileged data on behalf of an RH.
**Source:** `supabase/functions/comparativo-candidatos/index.ts:112-194,310-354` [VERIFIED: codebase]

### Pattern 2: SECURITY DEFINER jsonb reader with internal scope
**What:** `LANGUAGE plpgsql SECURITY DEFINER SET search_path=''`, ownership/scope enforced in the body via `auth.uid()`/`auth.jwt()` (both survive DEFINER — they read the per-request `request.jwt.claims` GUC), returns a single `jsonb`, `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE … TO authenticated`. With `search_path=''` every object is schema-qualified (`public.`, `auth.`).
**Source:** `supabase/migrations/20260712100003_funil12_get_avaliacao_status.sql:56-116` [VERIFIED: codebase]

### Pattern 3: WR-04 vaga-scoped RLS predicate (join form, no direct vaga_id)
**What:** `admin bypass OR (rh AND candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id=c.vaga_id WHERE v.created_by=(select auth.uid())))`. The `(select auth.uid())`/`(select auth.jwt() …)` wrapping is the planner-cache idiom — keep it verbatim.
**Source:** `supabase/migrations/20260706110004_sec05_08_vaga_scope.sql:94-104` (`redacao_rh_select`) [VERIFIED: codebase]

### Pattern 4: Client → EF invoke with normalized error
**What:** `const { data, error } = await supabase.functions.invoke(name, { body })`; run `extractEfErrorCode(data, error)`; throw a typed service error carrying `error_code` in `.details`. SafeParse the body (zod) BEFORE invoke to mirror the EF contract.
**Source:** `src/features/admin/services/usuariosRhService.ts:130-152` [VERIFIED: codebase]

### Anti-Patterns to Avoid
- **Accepting a raw `path` from the client** into `get-curriculo-url` — forgeable; the client would name any storage key. Always take `candidatura_id` and resolve the path server-side.
- **Authenticate-only EF** (the P10/P11 landmine): calling `getUser()` then reading via service_role WITHOUT the role+ownership check → any authenticated candidate reads any CV. authenticate ≠ authorize [VERIFIED: codebase `reference_ef_authenticate_vs_authorize`, comment `comparativo-candidatos/index.ts:125-135`].
- **Reading role from `getUser().app_metadata.role`** — it is `null` there (the custom_access_token_hook injects role only into the JWT claims). Read from `usuarios_rh` via service_role [VERIFIED: codebase `comparativo-candidatos/index.ts:131-135`].
- **`SET search_path='public'` or omitting it** in the DEFINER RPC — must be `SET search_path=''` with fully-qualified names (hijack-safe) [VERIFIED: codebase pattern].
- **Complementing (not removing) the role-only Storage branch** — CONTEXT is explicit: the RH branch is *removed*, not left as a fallback. Leaving it defeats SEG-01.
- **Returning `ator` / any candidate identity from `funil_kpis`** — the RPC is PII-free by construction; joining to `candidatos`/`ator` re-introduces the leak the phase closes.
- **Outer `BEGIN;…COMMIT;` in the migration file** — trips SQLSTATE 42601 in the pooler; the MCP/CLI wraps each migration itself (D-22).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RH JWT verification | Manual JWT decode/verify in the EF | `supabaseUser.auth.getUser()` (anon client + Authorization header) | Handles signature/exp verification; the shipped D-23 idiom |
| Role resolution | Trust `app_metadata` / decode custom claims | `usuarios_rh` SELECT via service_role (`recrutador→rh` map) | The hook does NOT write role to `raw_app_meta_data`; `usuarios_rh` is the source of truth |
| Signed URL generation | Construct a presigned URL / token by hand | `storage.from('curriculos').createSignedUrl(path, 60)` | Supabase mints the HMAC-signed token; hand-rolling is a crypto footgun |
| Median time-per-stage | Fetch rows to JS and sort | Postgres `percentile_cont(0.5) WITHIN GROUP` over a `LEAD` window CTE | Set-based, server-side, PII stays in the DB |
| EF↔client error contract | Ad-hoc `catch` string matching | `extractEfErrorCode` + typed service error (mirror `usuariosRhService`) | Code-only (never PII), already-shipped normalization |
| Bundle safety check | Manual review | Extend `no-service-role-src.grep.test.ts` | Deterministic build-time tripwire; review misses regressions |

**Key insight:** every "hard" part of this phase already ships somewhere in the repo. The failure mode (P24 lesson) is *inventing a new predicate/skeleton instead of copying the one that already passes its smoke*.

## Runtime State Inventory

This is a security-hardening migration + policy change + EF deploy, so runtime state beyond the repo files matters.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `candidaturas.curriculo_url` holds the storage path `{auth.uid()}/{uuid}.pdf` (relative to bucket, no bucket prefix, no leading slash) — this is exactly what `createSignedUrl(path, 60)` expects [VERIFIED: codebase `cvUploadService.ts:63-72,131`, `database.types.ts` `curriculo_url: string \| null`]. No data migration; the EF reads it as-is. **Note:** `curriculo_url` is nullable → the EF must 404 on NULL. | code (EF handles NULL) |
| **Live service config** | Storage bucket `curriculos` RLS policy `curriculos_select_own_or_rh` is **live on PROD** with the role-only RH branch. Removing it via migration changes a live authorization surface — the CV read path breaks the instant the policy drops UNLESS the EF is deployed first (see Pitfall 1 ordering). `historico_candidatura.rh_le_historico` is live role-only. | migration + EF deploy ordering |
| **OS-registered state** | None — no OS-level registrations (cron, scheduler) touch these objects. Verified: no scheduled job references `curriculos`/`funil_kpis`/`historico`. | none |
| **Secrets/env vars** | The EF needs ONLY the auto-injected `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase injects these into every EF). **No Vault secret** (`project_url`/`edge_invoke_key` are for DB→EF pg_net, NOT client→EF invoke) [VERIFIED: codebase CONTEXT §Vault secrets, `comparativo-candidatos/index.ts:318-320`]. | none |
| **Build artifacts** | `database.types.ts` (repo ROOT) is a generated artifact that goes stale the moment `funil_kpis` lands — the client `supabase.rpc('funil_kpis', …)` won't be typed until regen (`npm run db:types`). MCP `apply_migration` writes a timestamp version row ≠ filename → reconcile `supabase_migrations.schema_migrations` (P31/P11 precedent). | `npm run db:types` + version-row reconcile |

**The canonical question — after every repo file is updated, what runtime systems still have the old behavior?** The **live Storage policy** and the **live `rh_le_historico` policy** — both closed by the two migrations; and the **deployed EF** must be live before the policy drop, else RH CV reads break in the gap.

## Common Pitfalls

### Pitfall 1: Deploy/migration ordering breaks CV reads mid-flight
**What goes wrong:** dropping the role-only Storage branch before the EF is deployed leaves RH with no CV path at all (client `createSignedUrl` now denied, EF not yet live).
**Why it happens:** two independent artifacts (EF deploy + migration) with an implicit dependency.
**How to avoid:** sequence as **(1) deploy `get-curriculo-url` JWT-ON → (2) rewire client → (3) apply the policy-drop migration → (4) run smokes**. Because there is no live component consumer today (only tests), the true blast radius is minimal — but keep the order for correctness and for when P34 lands.
**Warning signs:** a live RH CV open returns 403 from Storage instead of a signed URL.

### Pitfall 2: `search_path=''` with unqualified names → function errors at runtime
**What goes wrong:** `funil_kpis` references `historico_candidatura` / `auth.uid()` unqualified; with `SET search_path=''` they don't resolve → `relation does not exist` / `function does not exist`.
**Why it happens:** DEFINER hardening requires the empty search_path, which removes `public`/`auth` from resolution.
**How to avoid:** qualify EVERYTHING: `public.historico_candidatura`, `public.candidaturas`, `public.vagas`, `auth.uid()`, `auth.jwt()`. Copy the qualification discipline from `get_avaliacao_status.sql`.
**Warning signs:** the smoke's first RPC call raises `42P01`/`42883`.

### Pitfall 3: The role-only branch survives because the DROP names the wrong policy/branch
**What goes wrong:** the migration DROPs a stale-named policy or re-CREATEs the policy still containing the RH branch → the leak stays open while the migration "succeeds."
**Why it happens:** RLS branch edits are copy-paste-fragile; there is no per-branch DROP — you DROP the whole policy and re-CREATE it with only the candidate branch.
**How to avoid:** `DROP POLICY IF EXISTS "curriculos_select_own_or_rh" ON storage.objects;` then `CREATE POLICY … USING (bucket_id='curriculos' AND (storage.foldername(name))[1] = (select auth.uid()::text))` — candidate branch ONLY. The behavioral smoke (RH via base storage read denied) is the gate, not `pg_policies`.
**Warning signs:** smoke (e) or a base-table RH storage read still returns rows.

### Pitfall 4: Structural checks pass while a behavioral leak remains (P24 lesson)
**What goes wrong:** `pg_policies`/grep confirm the predicate text but a `REVOKE` no-ops or an `OR` branch defeats the scope — the real leak is only caught by an impersonated read.
**Why it happens:** structural checks assert *shape*, not *effect*.
**How to avoid:** the JWT-impersonated behavioral smoke is the mandatory, authoritative gate for every assertion (a)-(e). This is a CONTEXT `<specifics>` requirement.
**Warning signs:** "policy looks right" but you never impersonated recruiter A against vaga B.

### Pitfall 5: `funil_kpis` medians undercounted by including in-progress stages
**What goes wrong:** the current (last) stage of an in-progress candidatura has no exit transition; naïvely treating its "time so far" as a completed duration skews the median.
**Why it happens:** `LEAD(criado_em)` is NULL for the last transition of each candidatura.
**How to avoid:** compute per-transition delta as `LEAD(criado_em) OVER (PARTITION BY candidatura_id ORDER BY criado_em) - criado_em`, then `percentile_cont` only over NON-NULL deltas (completed transitions). Group by the stage the candidate was *in* during that interval (`etapa_para` of the entering row).
**Warning signs:** median times skew toward 0 or include partial durations.

### Pitfall 6: Live cross-recruiter EF 403 can't be curl-tested (no recruiter accounts)
**What goes wrong:** the plan assumes a live curl of "recruiter A JWT vs vaga B → 403" but the DB has **0 accounts with role='recrutador'** — only `administrador` test accounts exist.
**Why it happens:** test-account gap (documented in MEMORY: `e2e.admin@beautysmile.com.br` is admin; no recruiter seed).
**How to avoid:** make the **deno unit test** the authoritative gate for the role='rh'-non-owner→403 branch (deterministic, mocked `usuarios_rh`/`vagas`). The **SQL smokes** cover cross-recruiter DENY at the DB layer via impersonated claims (no real account needed). The **live curl** covers: no-auth→401, `candidato` JWT→403, `administrador` JWT→200 happy path. See §Open Questions Q1.
**Warning signs:** plan blocks on a recruiter-vs-recruiter live curl that has no account to run it.

## Code Examples

### 1. EF `get-curriculo-url/index.ts` — copyable handler shape
```typescript
// Source: cloned verbatim from supabase/functions/comparativo-candidatos/index.ts:112-194,310-354
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "SERVER_ERROR";
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status);
}

export interface Deps { supabaseAdmin: any; supabaseUser: any } // deno-lint-ignore no-explicit-any

export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);
  const { supabaseAdmin, supabaseUser } = deps;

  // 1. AUTHENTICATE — anon client verifies the RH JWT
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  const user = userRes.user;

  // 2. AUTHORIZE role — read from usuarios_rh (NOT app_metadata); map recrutador→rh
  const { data: rhRow } = await supabaseAdmin
    .from("usuarios_rh").select("role")
    .eq("user_id", user.id).eq("ativo", true).is("deleted_at", null).maybeSingle();
  const dbRole = (rhRow?.role as string | undefined) ?? null;
  const role = dbRole === "recrutador" ? "rh" : dbRole === "administrador" ? "administrador" : dbRole;
  if (role !== "rh" && role !== "administrador") return errorResponse("FORBIDDEN", "Acesso negado.", 403);

  // 3. Parse body — candidatura_id ONLY (never a raw path). (zod .strict() recommended.)
  let candidatura_id: string;
  try {
    const raw = await req.json();
    if (typeof raw?.candidatura_id !== "string") return errorResponse("VALIDATION", "candidatura_id inválido.");
    candidatura_id = raw.candidatura_id;
  } catch { return errorResponse("VALIDATION", "Corpo inválido (JSON malformado)."); }

  try {
    // 4. Resolve path + vaga server-side (allowlist projection — never select('*'))
    const { data: cand, error: candErr } = await supabaseAdmin
      .from("candidaturas").select("curriculo_url, vaga_id").eq("id", candidatura_id).maybeSingle();
    if (candErr) return errorResponse("SERVER_ERROR", "Falha ao carregar a candidatura.", 500);
    if (!cand || !cand.curriculo_url) return errorResponse("NOT_FOUND", "Currículo não encontrado.", 404);

    // 5. AUTHORIZE ownership — role='rh' must own the vaga; administrador bypasses
    if (role === "rh") {
      const { data: vaga, error: vagaErr } = await supabaseAdmin
        .from("vagas").select("created_by").eq("id", cand.vaga_id).maybeSingle();
      if (vagaErr) return errorResponse("SERVER_ERROR", "Falha ao verificar a vaga.", 500);
      if (!vaga || vaga.created_by !== user.id) return errorResponse("FORBIDDEN", "Acesso negado.", 403);
    }

    // 6. Mint the 60s signed URL (service_role — the only privileged CV path)
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("curriculos").createSignedUrl(cand.curriculo_url, 60);
    if (signErr || !signed?.signedUrl) return errorResponse("SERVER_ERROR", "Falha ao gerar a URL.", 500);

    // NEVER log signed.signedUrl (Pitfall 7 redaction)
    console.log("[get-curriculo-url] ok", { candidatura_id, role });
    return jsonResponse({ ok: true, signedUrl: signed.signedUrl }, 200);
  } catch (e) {
    console.error("[get-curriculo-url] erro", { candidatura_id, error: e instanceof Error ? e.message : String(e) });
    return errorResponse("SERVER_ERROR", "Falha ao gerar a URL do currículo.", 500);
  }
}

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    return await handler(req, { supabaseAdmin, supabaseUser });
  });
}
```
**401 vs 403 distinction:** no/invalid JWT → **401 UNAUTHORIZED** (step 1); authenticated but wrong role or non-owner vaga → **403 FORBIDDEN** (steps 2 & 5); missing candidatura/NULL CV → **404**. This mirrors `comparativo-candidatos` exactly.

### 2. Migration A — drop the RH read branch (candidate branch KEPT)
```sql
-- Source: DROP+CREATE form of 20260425000002_curriculos_bucket.sql:55-68 (RH branch removed)
-- Apply via Supabase MCP apply_migration. NO BEGIN/COMMIT wrapper (D-22).
DROP POLICY IF EXISTS "curriculos_select_own_or_rh" ON storage.objects;

-- Recreate with the candidate own-folder branch ONLY. The RH/admin role branch
-- (previously an OR clause) is REMOVED — the EF (service_role) is the only RH CV path.
CREATE POLICY "curriculos_select_own_or_rh"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'curriculos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);
-- curriculos_insert_own / curriculos_update_own / curriculos_delete_own: UNTOUCHED.
```
Consider renaming the policy to `curriculos_select_own` in a COMMENT for clarity, but keeping the name avoids churn; either is Claude's discretion.

### 3. Migration B (part 1) — `funil_kpis` DEFINER RPC with median
```sql
-- Source: DEFINER/jsonb/REVOKE-GRANT skeleton from 20260712100003_funil12_get_avaliacao_status.sql:56-116
-- Median idiom: LEAD window → per-transition delta → percentile_cont(0.5). All names schema-qualified.
CREATE OR REPLACE FUNCTION public.funil_kpis(p_vaga_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_admin boolean := (auth.jwt() #>> '{app_metadata,role}') = 'administrador';
  v_uid uuid := auth.uid();
  r jsonb;
BEGIN
  WITH scoped_hist AS (
    -- historico rows for candidaturas of vagas the caller owns (admin = all);
    -- optional p_vaga_id narrows further (still owner-checked by the same join).
    SELECT h.candidatura_id, h.etapa_de, h.etapa_para, h.criado_em, c.vaga_id
      FROM public.historico_candidatura h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
      JOIN public.vagas v        ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
  ),
  deltas AS (
    -- time-in-stage(etapa_para) = next transition's criado_em − this criado_em.
    -- NULL for each candidatura's last (in-progress) transition → excluded from median.
    SELECT etapa_para AS stage,
           (LEAD(criado_em) OVER (PARTITION BY candidatura_id ORDER BY criado_em) - criado_em) AS dwell
      FROM scoped_hist
  ),
  median AS (
    SELECT stage,
           percentile_cont(0.5) WITHIN GROUP (
             ORDER BY EXTRACT(EPOCH FROM dwell)
           ) AS median_seconds
      FROM deltas
     WHERE dwell IS NOT NULL
     GROUP BY stage
  ),
  conversion AS (
    -- raw stage→stage transition counts (cohort refinement K4 deferred to P34)
    SELECT etapa_de AS from_stage, etapa_para AS to_stage, COUNT(*) AS n
      FROM scoped_hist
     WHERE etapa_de IS NOT NULL
     GROUP BY etapa_de, etapa_para
  ),
  volume AS (
    -- current volume by stage (candidaturas presently in each etapa_atual, owner-scoped)
    SELECT c.etapa_atual AS stage, COUNT(*) AS n
      FROM public.candidaturas c
      JOIN public.vagas v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
     GROUP BY c.etapa_atual
  )
  SELECT jsonb_build_object(
    'median_time_per_stage',
      COALESCE((SELECT jsonb_object_agg(stage, round(median_seconds)::bigint) FROM median), '{}'::jsonb),
    'conversion_stage_to_stage',
      COALESCE((SELECT jsonb_agg(jsonb_build_object('de', from_stage, 'para', to_stage, 'n', n)) FROM conversion), '[]'::jsonb),
    'volume_by_stage',
      COALESCE((SELECT jsonb_object_agg(stage, n) FROM volume), '{}'::jsonb)
  ) INTO r;

  RETURN r;   -- aggregates ONLY — no ator, no candidate identity (PII-safe by construction)
END;
$$;

REVOKE ALL ON FUNCTION public.funil_kpis(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.funil_kpis(uuid) TO authenticated;
```
**PII-safe confirmation:** the CTEs select only `candidatura_id`, `etapa_*`, `criado_em`, `vaga_id` — never `ator`, never any `candidatos` column. The output jsonb keys are stage names + counts + median seconds. No candidate identity is reachable. `etapa_processo` enum stages: `inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final, aprovado, rejeitado` [VERIFIED: codebase `database.types.ts:5039`].

### 4. Migration B (part 2) — `rh_le_historico` WR-04 hardening
```sql
-- Source: verbatim WR-04 join form from redacao_rh_select (sec05_08_vaga_scope.sql:94-104)
-- historico_candidatura has NO direct vaga_id → scope via candidatura_id → candidaturas → vagas.
DROP POLICY IF EXISTS rh_le_historico ON public.historico_candidatura;
CREATE POLICY rh_le_historico ON public.historico_candidatura
  FOR SELECT TO authenticated
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  );
-- candidato_le_proprio_historico: UNTOUCHED (candidate own-row audit trail stays intact).
-- NO INSERT policy added (historico is written only by the avancar_etapa trigger inside
-- the authorized candidaturas UPDATE txn — 20260607000006:79-81).
```

### 5. Client rewire — `cvUploadService.getSignedUrl`
```typescript
// Source: functions.invoke idiom from usuariosRhService.ts:130-152.
// Signature changes from getSignedUrl(path) to getSignedUrl(candidaturaId).
// Update the sole caller surface (tests) accordingly; there is NO live component consumer today.
export async function getSignedUrl(candidaturaId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-curriculo-url', {
    body: { candidatura_id: candidaturaId },
  })
  if (error || !data?.signedUrl) {
    throw new CVUploadServiceError('Não foi possível gerar URL de download', 'UPLOAD_FAILED', error ?? data)
  }
  // DO NOT log data.signedUrl — Pitfall 7
  return data.signedUrl as string
}
```
Update `src/features/vagas/services/__tests__/cvUploadService.test.ts` (`getSignedUrl` block, T3.1/T3.2) to mock `supabase.functions.invoke` instead of `storage.from().createSignedUrl` [VERIFIED: codebase current test at `:230-260`].

### 6. Bundle grep-guard extension (SEG-01 success criterion (e))
```typescript
// EXTEND src/__tests__/guards/no-service-role-src.grep.test.ts (already GREEN, service_role-only).
// Add a second forbidden pattern: a client-side createSignedUrl over the curriculos bucket
// must NOT appear anywhere in src/ (the EF is the only signer now).
const CURRICULOS_SIGN_RE = /createSignedUrl/   // scoped: any createSignedUrl in src/ features/vagas CV path
// Preferred: assert cvUploadService.ts contains functions.invoke('get-curriculo-url') and
// contains NO 'createSignedUrl' token, so the tripwire is precise and comment-aware.
```
Two viable shapes (Claude's discretion): (a) extend the existing `no-service-role-src` guard with a `createSignedUrl`-in-src check, or (b) add a focused assertion in `forbidden-strings.grep.test.ts`. The existing guard's `collectFiles`/`isCommentLine`/positive-negative-contract scaffold is the copy target [VERIFIED: codebase `no-service-role-src.grep.test.ts:50-157`].

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client `createSignedUrl` + role-only Storage read | EF-minted 60s signed URL, vaga-scoped | Phase 32 (this) | RH CV access is vaga-scoped; service_role never in the bundle |
| Role-only `rh_le_historico` (deferred P24) | WR-04 vaga-scoped predicate | Phase 32 (this) | Direct audit-trail reads are vaga-scoped |
| `db push --linked` for PL/pgSQL | Supabase MCP `apply_migration` + `schema_migrations` reconcile | M2 (P6+) | Bypasses SQLSTATE 42601; version-row must be reconciled |

**Deprecated/outdated:**
- `RelatoriosRHPage.tsx` `useFunilConversao` (L603-660) references non-existent columns — DEAD; do NOT reuse. `funil_kpis` replaces it. Its removal is deferred cleanup (P34) [VERIFIED: codebase CONTEXT §Reusable Assets].
- The old `getSignedUrl(path, 3600)` (1h TTL) is replaced by the EF's 60s TTL.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `volume_by_stage` should reflect *current* `candidaturas.etapa_atual` distribution (vs. cumulative entries per stage). CONTEXT says "volume por etapa" without specifying. | Code Examples #3 | LOW — a jsonb shape tweak; P34 dashboard consumes flexibly. Confirm desired semantics with planner. |
| A2 | Median unit is seconds (`EXTRACT(EPOCH …)` rounded to bigint). CONTEXT leaves the jsonb shape to discretion. | Code Examples #3 | LOW — presentation-only; P34 formats. |
| A3 | The EF returns `{ ok, signedUrl }` (mirroring the repo's `{ ok, … }` envelope); P34 will consume `data.signedUrl`. | Code Examples #1/#5 | LOW — internal contract set now; keep client + EF in lockstep ([[feedback_integration_contract_gap]]). |
| A4 | No recruiter (`role='recrutador'`) test account exists in PROD; cross-recruiter live curl is not runnable and must be proven at the deno-test/SQL-smoke layer. | Pitfall 6 / Open Q1 | MEDIUM — if a recruiter account exists, a fuller live curl is possible; verify at plan time. |
| A5 | `funil_kpis` reads `auth.jwt()`/`auth.uid()` successfully inside SECURITY DEFINER (the "Phase-6 proof" that these read the per-request GUC). | Code Examples #3 | LOW — verified pattern in `get_avaliacao_status`; the smoke will catch any regression. |

## Open Questions

1. **Cross-recruiter EF 403 live proof without a recruiter account**
   - What we know: only `administrador` test accounts exist (`e2e.admin@beautysmile.com.br`); MEMORY notes 0 `role='recrutador'` accounts. The deno unit test deterministically covers the role='rh'-non-owner→403 branch (mocked `usuarios_rh`+`vagas`). The SQL smokes cover cross-recruiter DENY at the DB layer via impersonated claims.
   - What's unclear: whether the plan should seed a temporary recruiter account for a fuller live curl, or rely on deno test + SQL smoke as the authoritative 403 gate.
   - Recommendation: **deno unit test + SQL smokes are the authoritative 403 gates**; live curl proves no-auth→401, `candidato` JWT→403, `administrador`→200. Do NOT block the phase on a recruiter-vs-recruiter live curl. (Optionally seed a disposable recruiter in a HUMAN-UAT step if P34 needs it.)

2. **Policy rename vs. keep name**
   - What we know: after removing the RH branch, `curriculos_select_own_or_rh` is misnamed (it's now own-only).
   - Recommendation: keep the name to avoid churn (a rename is cosmetic), or rename to `curriculos_select_own` — Claude's discretion; either passes the smoke.

3. **`p_vaga_id` for admin scoping**
   - What we know: admin bypasses owner-scope; `p_vaga_id` narrows to one vaga.
   - Recommendation: when admin + `p_vaga_id` is set, still narrow to that vaga (no owner check needed since admin) — the CTE `WHERE (v_is_admin OR …) AND (p_vaga_id IS NULL OR v.id=p_vaga_id)` handles both. Confirm the smoke covers admin-sees-all AND admin+p_vaga_id-narrows.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI (`supabase functions deploy`) | EF deploy | ✓ (repo uses it throughout) | project-pinned | — |
| Supabase MCP `apply_migration`/`execute_sql` | Migrations (bypass 42601) + run smokes | ✓ (MCP server active) | — | SQL Editor manual paste (D-22 workaround) |
| `npm run db:types` (Supabase CLI type-gen) | Regen `database.types.ts` after RPC | ✓ | project-pinned | — |
| Deno | `deno test` for the EF unit test | ✓ (all EFs are Deno) | Supabase EF default | — |
| Vitest | Client rewire + grep-guard tests | ✓ | `^4.1.9` | — |
| gotrue `/token?grant_type=password` | Live curl JWT for post-deploy smoke | ✓ (admin/candidate accounts in `.env.test`) | — | Admin JWT covers the 200 path; SQL smokes cover cross-scope DENY |
| Recruiter (`role='recrutador'`) PROD account | Live cross-recruiter EF 403 curl | ✗ | — | deno unit test + SQL smoke prove the 403/deny branch (see Open Q1) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** recruiter test account — fallback is deno unit test + JWT-impersonated SQL smoke.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (client) | Vitest `^4.1.9` |
| Framework (EF) | Deno test (`deno.land/std@0.224.0/assert`) |
| Framework (DB) | JWT-impersonated PL/pgSQL behavioral smoke (`.sql`, run via MCP `execute_sql`) |
| Config file | `supabase/functions/deno.json` (EF); root Vitest config; smokes are standalone `.sql` |
| Quick run command (client) | `npm run test:run -- src/features/vagas/services/__tests__/cvUploadService.test.ts src/__tests__/guards/no-service-role-src.grep.test.ts` |
| Quick run command (EF) | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/get-curriculo-url` |
| Full suite command | `npm run test:run && npm run lint && npm run build` (+ deno test + smokes via MCP post-apply) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEG-01 | No auth → EF 401; `candidato`/non-owner `rh` → 403; missing/NULL CV → 404; owner/admin → 200 signed URL | EF unit (deno) | `deno test … supabase/functions/get-curriculo-url` | ❌ Wave 0 (`index.test.ts`) |
| SEG-01 | Recruiter A cannot obtain CV of vaga B via the EF | DB smoke (impersonated) + deno unit | MCP `execute_sql seg32_smokes.sql` (a) | ❌ Wave 0 (`seg32_smokes.sql`) |
| SEG-01 | Storage RH role-only read is gone (candidate own-folder intact) | DB smoke (impersonated base-storage read) | MCP `execute_sql seg32_smokes.sql` (a/e) | ❌ Wave 0 |
| SEG-01 | No `service_role` and no client `createSignedUrl` over curriculos in `src/` bundle | Vitest grep guard | `npm run test:run -- src/__tests__/guards/no-service-role-src.grep.test.ts` | ⚠️ EXISTS (extend) |
| SEG-01 | `getSignedUrl(candidatura_id)` invokes the EF (not `createSignedUrl`) | Vitest unit | `npm run test:run -- …/cvUploadService.test.ts` | ⚠️ EXISTS (update T3.x) |
| SEG-02 | Recruiter A cannot see vaga B numbers via `funil_kpis` | DB smoke (impersonated) | MCP `execute_sql seg32_smokes.sql` (b) | ❌ Wave 0 |
| SEG-02 | Recruiter A cannot SELECT vaga B `historico_candidatura` (RLS deny) | DB smoke (impersonated) | MCP `execute_sql seg32_smokes.sql` (c) | ❌ Wave 0 |
| SEG-02 | `funil_kpis` returns zero PII (aggregates only) | DB smoke (walk jsonb — no candidate-id/name/email/ator key) | MCP `execute_sql seg32_smokes.sql` (d) | ❌ Wave 0 |
| SEG-02 | admin sees all; admin+`p_vaga_id` narrows; owner scope holds | DB smoke (impersonated admin vs rh) | MCP `execute_sql seg32_smokes.sql` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the quick-run command for the touched surface (Vitest for client/guard; `deno test` for the EF).
- **Per wave merge:** `npm run test:run && npm run lint && npm run build` + `deno test` for the EF.
- **Phase gate:** all Vitest + deno green; then, AFTER MCP `apply_migration` + EF deploy, run `seg32_smokes.sql` via MCP `execute_sql` — every assertion must `NOTICE PASS` (an `EXCEPTION` = a real leak). The behavioral smoke is the load-bearing gate (above structural checks).

### Wave 0 Gaps
- [ ] `supabase/functions/get-curriculo-url/index.ts` — the EF (SEG-01)
- [ ] `supabase/functions/get-curriculo-url/index.test.ts` — deno unit test: 401/403-role/403-owner/404/200 (harness cloned from `submit-candidatura/index.test.ts` — `loadHandler()` + `makeChainable` mocks for `usuarios_rh`/`candidaturas`/`vagas` + mock `storage.from().createSignedUrl`)
- [ ] `supabase/tests/seg32_smokes.sql` — JWT-impersonated behavioral smokes (a)-(e); disposable fixture (2 recruiters owning distinct vagas + 1 candidatura with a CV path + a couple of `historico_candidatura` rows for a median), ROLLBACK-free cleanup (clone `funil12_status_rpc_smoke.sql` / `sec02_smokes.sql` idiom)
- [ ] `src/__tests__/guards/no-service-role-src.grep.test.ts` — EXTEND with the client-`createSignedUrl`-over-curriculos tripwire
- [ ] `src/features/vagas/services/__tests__/cvUploadService.test.ts` — UPDATE `getSignedUrl` block to mock `functions.invoke`
- Framework install: none (all runners present).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | authorize-THEN-authenticate EF boundary; DEFINER RPC as the only privileged aggregate channel |
| V2 Authentication | yes | `supabaseUser.auth.getUser()` verifies the RH JWT; EF deployed `verify_jwt` ON |
| V4 Access Control (IDOR/horizontal) | **yes (core)** | role from `usuarios_rh` + `vagas.created_by` ownership (EF); WR-04 vaga-scope (RLS); internal owner-scope (RPC) |
| V5 Input Validation | yes | EF accepts `candidatura_id` only (zod `.strict()` recommended); never a raw path |
| V6 Cryptography | yes (delegated) | `createSignedUrl` mints the HMAC-signed token — never hand-rolled |
| V7 Errors & Logging | yes | code-only errors (`extractEfErrorCode`); NEVER log the signed URL / PII (Pitfall 7 redaction) |
| V8 Data Protection (PII) | **yes (core)** | `funil_kpis` returns aggregates only (no `ator`/candidate identity); CV path resolved server-side; RLS allowlist reads |

### Known Threat Patterns for {Supabase EF + Postgres RLS/DEFINER + Storage}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Recruiter A reads CV of a candidate on recruiter B's vaga | Information Disclosure / Elevation | EF ownership check (`vagas.created_by`) after role check; Storage RH branch removed |
| Forged storage path in the request | Tampering | EF ignores any client path; resolves `curriculo_url` from `candidatura_id` server-side |
| authenticate-only EF (candidate reads any CV) | Elevation of Privilege | authorize-THEN-authenticate: role from `usuarios_rh` + ownership BEFORE any privileged read |
| Cross-recruiter KPI aggregate leak | Information Disclosure | DEFINER RPC internal `v.created_by = auth.uid()` scope (admin bypass) |
| Candidate identity leaked through aggregates | Information Disclosure | RPC selects no `ator`/`candidatos` columns; smoke (d) walks the jsonb for forbidden keys |
| Direct client SELECT on `historico_candidatura` bypasses the RPC | Information Disclosure | `rh_le_historico` WR-04 vaga-scoped RLS (belt-and-suspenders) |
| `search_path` hijack of the DEFINER function | Elevation of Privilege | `SET search_path=''` + fully-qualified names |
| service_role key shipped in the browser bundle | Information Disclosure / Elevation | `no-service-role-src.grep.test.ts` build-time tripwire; service_role only in the EF |
| Signed URL / token leaked via logs | Information Disclosure | Pitfall 7 redaction; never `console.*` the URL; 60s TTL bounds exposure |
| Structural check passes while behavioral leak remains | (meta) | JWT-impersonated behavioral smoke is the authoritative gate (P24 precedent) |

## Sources

### Primary (HIGH confidence — codebase, PROD-live patterns)
- `supabase/functions/comparativo-candidatos/index.ts` — two-client authorize-THEN-authenticate skeleton, CORS/env wiring, static `npm:` imports [VERIFIED: read in full]
- `supabase/migrations/20260712100003_funil12_get_avaliacao_status.sql` — SECURITY DEFINER jsonb reader, `search_path=''`, REVOKE/GRANT, `auth.uid()` survives DEFINER [VERIFIED]
- `supabase/migrations/20260706110004_sec05_08_vaga_scope.sql:94-124` — WR-04 join-form predicate (`redacao_rh_select`); L126-131 explicitly defers `rh_le_historico` [VERIFIED]
- `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:60-77` — current role-only `rh_le_historico` + `candidato_le_proprio_historico` [VERIFIED]
- `supabase/migrations/20260425000002_curriculos_bucket.sql:55-102` — the bucket policy (RH branch L64-67 to remove; candidate branch + uploads to keep) [VERIFIED]
- `src/features/vagas/services/cvUploadService.ts:193-206` — current `getSignedUrl`; path stored in `candidaturas.curriculo_url` [VERIFIED]
- `src/features/admin/services/usuariosRhService.ts:130-152` — client `functions.invoke` + `extractEfErrorCode` normalization [VERIFIED]
- `src/__tests__/guards/no-service-role-src.grep.test.ts` — the extendable bundle tripwire [VERIFIED]
- `supabase/tests/sec02_smokes.sql`, `funil12_status_rpc_smoke.sql` — JWT-impersonated smoke idiom (set_config `request.jwt.claims` + `SET ROLE authenticated`, disposable fixture, ROLLBACK-free) [VERIFIED]
- `supabase/functions/submit-candidatura/index.test.ts` — deno EF unit-test harness (`loadHandler` + chainable mocks) [VERIFIED]
- `database.types.ts` — `historico_candidatura` columns (ator/auto_rejeitado/candidatura_id/criado_em/etapa_de/etapa_para), `candidaturas.curriculo_url: string|null`, `etapa_processo` enum [VERIFIED]
- `.planning/REQUIREMENTS.md:49-58,115-126`, `.planning/STATE.md:40-83` — SEG-01/SEG-02 text, K4, WR-04 lineage, MCP apply reconcile [VERIFIED]
- `CLAUDE.md` — Security Rules, migration 42601 workaround, `db:types` [VERIFIED]

### Secondary (MEDIUM confidence — repo memory)
- `MEMORY.md` — `.env.test` accounts (`e2e.admin@beautysmile.com.br`, `candidato.funil@teste.com`), gotrue `/token grant_type=password` → curl EFs; 0 recruiter accounts; MCP `apply_migration` version-row reconcile precedent [CITED: memory]
- `reference_ef_authenticate_vs_authorize`, `reference_select_star_leaks_pii` — authorize-then-authenticate + RLS-is-row-level lessons [CITED: memory]

### Tertiary (LOW confidence)
- None — no external/unverified sources were needed; the phase is entirely codebase-pattern-driven.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; all pinned + PROD-live.
- Architecture (EF/RPC/RLS): HIGH — verbatim copies of shipped code read in full this session.
- Median SQL: MEDIUM-HIGH — `LEAD`+`percentile_cont` is standard Postgres; the exact jsonb shape is Claude's discretion and the smoke will validate PII-safety.
- Live-curl 403 gate: MEDIUM — gated by the missing recruiter account (Open Q1); deno test + SQL smoke are the fallback authoritative gates.
- Pitfalls: HIGH — drawn from P24/P10/P11 documented incidents in this repo.

**Research date:** 2026-07-15
**Valid until:** 2026-08-14 (stable — internal patterns; no fast-moving external deps)
</content>
</invoke>
