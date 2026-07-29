# Stack Research

**Domain:** LGPD data-subject rights (Art. 18/20), retention policy and automated purge on an existing, live Supabase-backed ATS
**Milestone:** M8 (v8.0) — Dados do Candidato & Direitos do Titular (LGPD-OPS)
**Researched:** 2026-07-29
**Confidence:** MEDIUM-HIGH overall — platform mechanics verified against Supabase's own docs (HIGH where quoted); the *legal* retention numbers are MEDIUM at best and are flagged inline as a defensible default requiring counsel sign-off, not a verified fact.

> **Scope note.** This is an **additive** research pass on a system that is already in production. React/Vite/TS/Tailwind/TanStack/Zustand/RHF/Zod and Supabase (Postgres + Auth + Storage + Edge Functions + Vault + `pg_cron` + `pg_net`) are validated and are NOT re-litigated. Everything below is only the net-new surface for erasure, export, retention and purge.

---

## TL;DR — the opinionated calls

1. **Add ZERO npm dependencies. Add ZERO Postgres extensions.** Everything M8 needs is already live: `pg_cron`, `pg_net`, Vault, Edge Functions, `@supabase/supabase-js` (Auth Admin + Storage Admin are on the *same* client already bundled in the EFs). The M7 pipeline (`trigger → pg_net → EF → ledger`) is literally the same shape as the purge pipeline. Reuse it.
2. **Anonymize-in-place is the erasure primitive. Hard-delete is reserved for two things only: the Storage blob and the `auth.users` row.** LGPD Art. 12 *caput* says anonymized data is not personal data, and Art. 16 IV explicitly permits retaining anonymized data for the controller's exclusive use. That is the legal instrument that resolves the milestone's stated "purga vs. trilha de auditoria" tension without weakening `decisao_final.por_usuario NOT NULL`.
3. **`anon` / PostgreSQL Anonymizer is NOT available on hosted Supabase.** Do not plan around it. (MEDIUM confidence — negative claim; verification command given below. Run it before Phase planning.)
4. **You cannot purge Storage from SQL.** Supabase's own docs say deleting `storage.objects` rows orphans the S3 blob. The only bridge is `pg_cron` → `net.http_post` → Edge Function → `storage.remove()`. Exactly the M7 hop.
5. **You cannot `deleteUser` a candidate today.** Two of the repo's five FKs to `auth.users` carry the default `NO ACTION`, and Supabase refuses to delete a user who still owns Storage objects. An FK-audit migration is a *prerequisite* of any deletion phase, not a detail inside it.
6. **Export format: JSON, delivered as a signed URL from a new private bucket.** Never inline a multi-MB body from an Edge Function; never make PDF the only artifact (it is not "leitura por máquina").
7. **`pg_cron` purge must be a `PROCEDURE`, not a `FUNCTION`** — so it can `COMMIT` per batch and be resumable within Supabase's ≤10-minute job guidance.

---

## Recommended Stack

### Core Technologies (all ALREADY INSTALLED — this is a "use what you have" milestone)

| Technology | Version | Purpose in M8 | Why Recommended |
|------------|---------|---------------|-----------------|
| `pg_cron` | already live in PROD (`notif-retry-sweep` runs `*/15`; `cron.schedule` used since migration `20260609000003`) | Schedules the retention sweep and the export-artifact GC | Already proven in this codebase; no external scheduler = no re-creation of the n8n dependency M7 just retired. Supabase caps: **≤8 concurrent jobs**, each job should run **≤10 min** — which is *why* the purge must be batched and resumable. Runs recorded in `cron.job_run_details`. |
| `pg_net` | already live (`net.http_post` + Vault Bearer, pattern in `20260610000002_analise_trigger.sql`) | The only bridge from SQL to Storage deletion and to the Art. 20 notification | **Fire-and-forget**: the request doesn't start until COMMIT, returns a request id immediately. Responses land in the **UNLOGGED** `net._http_response`, retained **~6 h**. Default timeout **2000 ms**, overridable via `timeout_milliseconds`. → *Never* use the pg_net response as the purge success signal. |
| Supabase Edge Functions (Deno) | existing runtime, 17 functions deployed | `purgar-artefatos` (Storage deletes), `exportar-meus-dados` (build + upload + sign), `excluir-minha-conta` (Storage → auth) | The only place `service_role` may live. Auth Admin API and Storage Admin API are on the same `@supabase/supabase-js` client already imported by every EF — **no new dependency**. |
| `@supabase/supabase-js` | `^2.104.0` (client) / `npm:@supabase/supabase-js@2` (EFs) — already in `package.json` | `auth.admin.deleteUser()`, `storage.from().remove()`, `.list()`, `.upload()`, `.createSignedUrl()` | Same package, same major, already pinned. Zero delta. |
| Supabase Vault | already live (`project_url`, `edge_invoke_key`, `resend_api_key`) | Bearer secret for the cron → EF hop | Established idiom with graceful-skip on NULL. Add nothing; reuse `edge_invoke_key`. |
| Postgres `PROCEDURE` + `pg_try_advisory_lock` | Postgres 15+ (Supabase hosted) | Batched, resumable, single-instance purge | Core SQL. See "Purge job pattern" below. |
| Supabase Storage (new private bucket `exportacoes-lgpd`) | n/a | Holds generated portability artifacts | Keeps large payloads off the EF response path; signed URL with TTL is the safe delivery channel. |

### Supporting Libraries

**None recommended.** This is deliberate and is the headline finding.

| Library | Verdict | Reasoning |
|---------|---------|-----------|
| `jszip` / `@zip-js/zip-js` / `archiver` | **NO** | One candidate's export is a few KB of JSON plus a signed URL to the CV. Zipping adds a dependency, a Deno-compat risk, and a supply-chain gate for zero user benefit. |
| `@react-pdf/renderer` / `react-pdf` | **NO** | Same failure class the project already ate in M7 with `react-email` (breaks in the Deno edge runtime). `jspdf@^4.2.1` + `jspdf-autotable@^5.0.8` are **already** in `package.json` and already do client-side PDF export for RH — if a human-readable PDF companion is wanted, render it client-side from the JSON. |
| `pg_partman` | **NO** (available, wrong tool) | Partition-drop is uniform time-slicing. This purge is **per-subject and predicate-driven** — it must read `autorizacao_retencao_curriculo` and candidatura state per row. A partition drop cannot honor per-row consent. |
| `pgcrypto` | **available, not needed** | Pre-installed on Supabase. Only relevant if you choose crypto-shredding (see "Anonymization approaches" — recommended against). `gen_random_uuid()` is native in PG13+ anyway. |
| `anon` (PostgreSQL Anonymizer) | **NOT AVAILABLE** | See "What NOT to Use". |
| OneTrust / Transcend / Ketch / Osano (DSAR SaaS) | **NO** | Enterprise-priced, GDPR-shaped, and every one of them still needs you to hand-write the Supabase connector — i.e. exactly the code you'd write anyway, plus a vendor. |
| BullMQ / Inngest / Trigger.dev / QStash | **NO** | `pg_cron` + `pg_net` is the proven in-house bridge. Adding an external scheduler re-introduces the exact external-dependency posture M7 spent a milestone retiring. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase MCP `apply_migration` | Land M8 migrations in PROD | **Mandatory.** `supabase db push --linked` fails with SQLSTATE 42601 on PL/pgSQL `$$` bodies adjacent to `COMMENT`/`GRANT`/`cron.schedule` — this milestone is almost entirely PL/pgSQL procedures. Follow the repo's documented workaround (no outer `BEGIN;/COMMIT;`, then `migration repair --status applied`). |
| `cron.job_run_details` | Observability for the sweep | Query it in verification; it is the only native record that a job ran. |
| A `purga_execucoes` ledger table (new) | Dry-run counts + real-run counts + per-artifact outcome | The pg_net response is unusable as a signal (6 h retention, unlogged, 2 s timeout). Mirror the `notificacoes_enviadas` shape the project already trusts. |
| Deno test corpus (existing, 139 tests) | Cover the three new EFs | Established gate; extend, don't replace. |

## Installation

```bash
# npm dependencies to add:
#   (none)

# Postgres extensions to add:
#   (none — pg_cron, pg_net and pgcrypto are already available/installed)
```

**The only "installation" step in M8 is a verification step. Run this against PROD before Phase planning:**

```sql
-- 1) Confirm the negative claim about anonymizer availability (do not assume it)
select name, default_version, installed_version
from pg_available_extensions
where name in ('anon','pgcrypto','pg_cron','pg_net','pg_partman')
order by name;

-- 2) AUDIT THE FK GRAPH TO auth.users — this is the blocking precondition for deletion
select
  c.conname,
  n.nspname || '.' || t.relname as referencing_table,
  a.attname                     as referencing_column,
  case c.confdeltype
    when 'a' then 'NO ACTION  <-- BLOCKS deleteUser'
    when 'r' then 'RESTRICT   <-- BLOCKS deleteUser'
    when 'c' then 'CASCADE'
    when 'n' then 'SET NULL'
    when 'd' then 'SET DEFAULT'
  end as on_delete
from pg_constraint c
join pg_class      t  on t.oid  = c.conrelid
join pg_namespace  n  on n.oid  = t.relnamespace
join pg_class      rt on rt.oid = c.confrelid
join pg_namespace  rn on rn.oid = rt.relnamespace
join unnest(c.conkey) with ordinality k(attnum, ord) on true
join pg_attribute  a  on a.attrelid = t.oid and a.attnum = k.attnum
where c.contype = 'f'
  and rn.nspname = 'auth' and rt.relname = 'users'
order by 4, 2;
```

---

## The four hard mechanics, resolved

### 1. Deleting a user across Postgres + `auth.users` + Storage

**What Supabase natively offers**

- `supabase.auth.admin.deleteUser(id, shouldSoftDelete?)` — `service_role` only, so it must live in an Edge Function (the project's `service_role`-never-in-client invariant already forces this). `shouldSoftDelete: true` sets `auth.users.deleted_at` instead of removing the row; default is `false` (hard delete). *(MEDIUM — Supabase JS reference via Context7.)*
- **Nothing else.** Supabase has **no** native user-data export, no native DSAR flow, no native "delete everything for this user". Their own GDPR guidance tells you to build an admin endpoint and cascade yourself. *(MEDIUM — corroborated across Supabase discussions + third-party guides; consistent with the absence of any such API in the reference docs.)*

**What must be hand-rolled — and what breaks**

- **There is no supported cascade beyond the `ON DELETE` clauses you declared.** Deleting `auth.users` fires only your own FK rules.
- 🔴 **Supabase docs, verbatim: _"You cannot delete a user if they are the owner of any objects in Supabase Storage."_** `storage.objects.owner` FKs `auth.users` and is not cascading. Guidance: *"try deleting all the objects for that user, or reassign ownership to another user."* → **Ordering is a hard constraint: Storage objects FIRST, then `auth.users`.** *(HIGH — direct quote from `supabase.com/docs/guides/auth/managing-user-data`.)*
- Any app FK with the default `NO ACTION` produces `500 Database error deleting user` from the Admin API — an opaque failure that will look like a Supabase bug and isn't. *(MEDIUM — multiple corroborating Supabase issues/discussions.)*

**This repo's actual FK graph to `auth.users` (grepped from `supabase/migrations/`, 2026-07-29):**

| Constraint | `ON DELETE` | Impact on candidate erasure |
|---|---|---|
| `historico_candidatura.ator` (`20260607000001`) | *(none)* → **NO ACTION** | 🔴 **BLOCKER.** The candidate is the `ator` on their own transitions. Any candidate who ever acted cannot be deleted. |
| `decisao_final.por_usuario NOT NULL` (`20260607000003`) | *(none)* → **NO ACTION** | 🟡 RH user only. **Do not touch** — this is the LGPD-02 / RNF-07a guardrail. It correctly makes RH hard-delete impossible. |
| `redacoes.revisada_por` (`20260623100003`) | *(none)* → **NO ACTION** | 🟡 RH user only. Leave as-is; RH offboarding is deactivation, not deletion. |
| `devolutivas_candidato.candidato_id NOT NULL` (`20260612000002`) | **CASCADE** | ⚠️ Will silently vaporize the Big Five devolutiva on delete. Intentional? Decide explicitly — it is candidate PII, so probably fine, but it must be *decided*, not discovered. |
| `rate_limit….user_id` (`20260421000001`) | **SET NULL** | ✅ Correct. |
| `candidatos.user_id` | **UNVERIFIED** — legacy table, predates the repo's migration ledger | ❓ Run the audit query above. This is the single most important unknown. |

**Three different `ON DELETE` semantics across five constraints, two of them the accidental default.** That inconsistency is itself the finding: the FK graph was never designed for erasure.

**Recommended shape**

```
EF `excluir-minha-conta`  (authenticate-THEN-authorize; caller must be the titular)
  1. INSERT into a request ledger  (proof-of-request survives a mid-flight failure)
  2. storage.from('curriculos').list(`${user_id}/`) → remove(paths)      <-- MUST be first
     (also 'avatars-rh' if applicable, and any 'exportacoes-lgpd' artifacts)
  3. RPC anonimizar_candidato(user_id)  SECURITY DEFINER, in ONE transaction
     — tombstone every PII column; sever the identifiers
  4. auth.admin.deleteUser(user_id)      <-- only now can this succeed
  5. UPDATE the ledger to 'concluido'
```

Steps 2 and 4 are non-transactional against step 3. Make the whole thing **idempotent and re-runnable** and drive it from a ledger row with a status column — the exact claim-before-send discipline the M7 EF already implements.

**On `shouldSoftDelete`:** ⚠️ **Do not use it for LGPD erasure.** A soft-deleted `auth.users` row still holds the email — which is PII — so it does not satisfy Art. 18 VI. Whether the email remains *reserved* against re-signup is **not documented** (`supabase/supabase#20057` is an open complaint about exactly this documentation gap). That matters here because the project already supports *reinscrição pós soft-delete* (M4/P26). **Verify empirically on a throwaway user before designing around it; do not assume either way.** *(LOW confidence — undocumented behavior.)*

### 2. Data export / portability

**Format.** **JSON is the artifact of record.** LGPD Art. 18 V asks for portability in an interoperable form, and the market/ANPD reading is "formato de uso comum e leitura por máquina". JSON is that. Optionally render a human-readable HTML/PDF *companion* — but PDF alone is not machine-readable and is not defensible as the sole format. The project already has `jspdf` client-side, so a companion PDF costs no new dependency and can be produced in the browser from the same JSON.

**Delivery.** ⚠️ **Never return the export inline** from an Edge Function. Do this instead:

```ts
// inside EF `exportar-meus-dados` (service_role)
const payload = await buildExport(userId)          // explicit column allowlists, never select('*')
const path = `${userId}/${requestId}.json`
await admin.storage.from('exportacoes-lgpd')
  .upload(path, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
          { contentType: 'application/json', upsert: false })
const { data } = await admin.storage.from('exportacoes-lgpd')
  .createSignedUrl(path, 3600)                     // 1 h — the artifact is regenerable
return new Response(JSON.stringify({ url: data.signedUrl, expiresIn: 3600 }))
```

- `createSignedUrl(path, expiresInSeconds)` — seconds, required, **no documented hard maximum**. *(MEDIUM.)* Recommend **3600 s**: short enough that a leaked link expires fast, long enough for a human to click it. The candidate can always re-request.
- **The CV itself: do NOT base64 it into the JSON.** Emit a second signed URL to the existing `curriculos` object with the same TTL. Reuse the authorize logic already proven in the `get-curriculo-url` EF (M6/P32) rather than writing a second one.
- 🔴 **Meta-gotcha: `exportacoes-lgpd` is itself a PII store.** It must be in the retention policy from day one — a `pg_cron` job that deletes export artifacts older than ~7 days, via the *same* Storage bridge (see below). An export bucket that accumulates forever is a worse leak than the problem it solved.

**Native option:** none. Supabase provides infrastructure and a DPA; portability is entirely application-level. *(MEDIUM.)*

### 3. Scheduled purge

**Purging Postgres — the pattern.**

```sql
CREATE OR REPLACE PROCEDURE purgar_dados_expirados(
  p_dry_run boolean DEFAULT true,
  p_batch   integer DEFAULT 500
)
LANGUAGE plpgsql AS $proc$
DECLARE
  v_lock    constant bigint := hashtext('purgar_dados_expirados');
  v_started timestamptz := clock_timestamp();
  v_n       integer;
BEGIN
  -- session-level, NOT xact-level: a procedure that COMMITs cannot hold an xact lock across commits
  IF NOT pg_try_advisory_lock(v_lock) THEN
    RAISE NOTICE 'purga ja em execucao — saindo';
    RETURN;
  END IF;

  LOOP
    EXIT WHEN clock_timestamp() - v_started > interval '8 minutes';  -- Supabase guidance: job <= 10 min

    IF p_dry_run THEN
      SELECT count(*) INTO v_n FROM (SELECT 1 FROM <alvo> WHERE <predicado> LIMIT p_batch) s;
      INSERT INTO purga_execucoes(alvo, modo, linhas) VALUES ('<alvo>', 'dry_run', v_n);
      EXIT;                                     -- dry run never loops
    END IF;

    -- DELETE has no LIMIT in Postgres; the ctid subselect is the idiom
    DELETE FROM <alvo>
     WHERE ctid IN (SELECT ctid FROM <alvo> WHERE <predicado> LIMIT p_batch);
    GET DIAGNOSTICS v_n = ROW_COUNT;

    INSERT INTO purga_execucoes(alvo, modo, linhas) VALUES ('<alvo>', 'real', v_n);
    COMMIT;                                     -- <-- only a PROCEDURE can do this
    EXIT WHEN v_n < p_batch;
    PERFORM pg_sleep(0.1);                      -- throttle I/O
  END LOOP;

  PERFORM pg_advisory_unlock(v_lock);
END;
$proc$;

SELECT cron.schedule('purga-lgpd-diaria', '30 3 * * *', 'CALL purgar_dados_expirados(false, 500)');
```

Four properties, each earning its place: **advisory lock** (single instance, and it *fails fast* rather than queueing behind the previous run), **`COMMIT` per batch** (short locks, resumable, no 10-minute transaction), **wall-clock deadline** (a run can never collide with the next schedule), **`purga_execucoes` ledger** (the only durable answer to "did it run, what did it touch"). *(MEDIUM — standard Postgres practice, multiple corroborating sources; Supabase job limits from Supabase's own cron docs.)*

⚠️ **Note the lock-variant trap:** the codebase already uses `pg_advisory_xact_lock` (anti-lockout trigger, M5). Same family, **wrong variant here** — an xact lock is released by the first `COMMIT` inside the loop. Use `pg_try_advisory_lock` / `pg_advisory_unlock`.

**Ship `p_dry_run := true` first.** Schedule it, watch `purga_execucoes` for one full retention cycle, read the counts, *then* flip to `false`. On a live system holding real people's data, a purge that ran correctly and a purge that ran wrong look identical afterwards.

**Purging Storage — you genuinely cannot do it from SQL.**

🔴 Supabase docs: *"Deleting objects should always be done via the Storage API and NOT via a SQL query. Deleting objects via a SQL query will not remove the object from the bucket and will result in the object being orphaned."* Deleting from `storage.objects` removes metadata only; the S3 blob survives, invisible, still containing the CV. *(HIGH — Supabase docs + `supabase/storage#601`.)* For LGPD this is the worst possible failure mode: the audit log says "deleted", and the PII is still there.

**The actual bridge — identical in shape to the M7 send path:**

```
pg_cron  ->  CALL purgar_artefatos_storage()      -- selects due rows, marks them 'em_purga'
              +- net.http_post(                   -- Vault: project_url + edge_invoke_key
                   url     => project_url || '/functions/v1/purgar-artefatos',
                   body    => jsonb_build_object('lote', <ids>),
                   headers => Bearer edge_invoke_key,
                   timeout_milliseconds => 5000   -- override the 2 s default
                 )
         ->  EF `purgar-artefatos` (service_role)
              +- storage.from('curriculos').list(prefix, {limit: 100, offset})   <-- paginate
              +- storage.from('curriculos').remove(paths)
              +- UPDATE purga_execucoes SET status='concluido', ...              <-- the real signal
```

Three constraints to design around:

- **Storage has no recursive delete and no folder concept.** `remove()` takes an explicit path array. You must `list()` with pagination (default limit 100) and loop. *(MEDIUM-HIGH.)*
- **`net.http_post` is fire-and-forget with a 2000 ms default timeout**, and its response lands in the **unlogged** `net._http_response` retained **~6 h**. Set `timeout_milliseconds` explicitly, and **do not read the response for correctness** — the EF writes its own outcome. *(MEDIUM-HIGH — Supabase pg_net docs.)*
- **Claim-before-purge.** Mark rows `em_purga` *before* the HTTP call so a retry can't double-fire and a crash leaves a visible stuck row. This is precisely the idempotency discipline M7's `notificacoes_enviadas` already proves — copy it.

### 4. Anonymization in Postgres

| Approach | Available here? | Verdict |
|---|---|---|
| **In-place `UPDATE` tombstone** via `SECURITY DEFINER` RPC | ✅ plain SQL | ✅ **RECOMMENDED** |
| `anon` / PostgreSQL Anonymizer extension | ❌ **not on hosted Supabase** | ❌ Not an option |
| Crypto-shredding (per-subject key, destroy key) | ⚙️ technically possible (`pgcrypto` available) | ❌ Wrong milestone — see below |
| `shouldSoftDelete` on `auth.users` | ✅ | ❌ Retains the email; not erasure |

**On `anon` availability — stated with its confidence, as required.**
The `anon` extension is **not** in Supabase's documented extension catalogue (~64 extensions; `pg_cron`, `pg_net`, `pgcrypto`, `pg_partman`, `pg_jsonschema` are all present, `anon` is not), and the request to add it (`supabase/postgres#204`, opened 2022) is **closed without having shipped**. **Confidence: MEDIUM** — this is a negative claim built on absence-from-catalogue plus a closed request, not on an explicit Supabase statement of non-support. **It is cheap to make it HIGH: run `select * from pg_available_extensions where name = 'anon';` against PROD.** Do that in the discuss-phase. **Do not plan any phase that depends on `anon`.** Even if it turned out to be present, it is the wrong tool: `anon` is built for *masking a dump for non-production use*, not for irreversibly erasing one data subject in a live OLTP table.

**Why in-place tombstone wins.**
LGPD Art. 12 *caput*: anonymized data is not personal data. Art. 16 IV: anonymized data may be retained for the controller's exclusive use with third-party access barred. Together these are the legal instrument that dissolves the milestone's central tension — you keep `decisao_final`, `historico_candidatura` and `bias_audit_log` intact and append-only, because after anonymization they no longer hold personal data. No schema weakening. No touching `por_usuario NOT NULL`. *(MEDIUM — legal reading, corroborated across Brazilian practitioner sources; needs counsel confirmation.)*

🔴 **The trap that makes this fail:** LGPD Art. 12 §1 — data that can be reversed to an individual *with reasonable effort* is **pseudonymized**, not anonymized, and remains personal data. Blanking `nome_completo` while leaving `user_id` joining a live `auth.users` row is pseudonymization and does **not** discharge Art. 18 VI. The tombstone must **sever the identifiers**, not merely blank the display fields. Concretely:

- Keep `candidatos.id` (surrogate PK) so FK integrity and audit joins survive.
- Null or randomize `candidatos.user_id` **after** the `auth.users` row is gone.
- Tombstone every PII column deterministically, so re-runs are idempotent and `UNIQUE`/`NOT NULL` constraints survive:
  - `email` → `'anonimizado+' || id || '@invalido.local'` (unique per row — a constant would collide on the second erasure)
  - `nome_completo` → `'[titular removido a pedido]'`
  - `cpf`, `celular`, `data_nascimento`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `instagram*`, `linkedin*`, `avatar_url`, `como_conheceu_detalhes` → `NULL`
  - `cidade` / `estado` → keep only if aggregate reporting needs them; a city is low-identifiability, but say so explicitly rather than by accident.
- Free-text is where anonymization quietly fails: the **redação cultural** and any RH `observacoes` fields can contain a self-identifying narrative. Decide per-field between hard-delete and tombstone — do not assume column-name-based PII detection covers it.

**Why crypto-shredding is the right idea at the wrong time.** It is legitimate — EDPB Guidelines 5/2019, the UK ICO and CNIL all recognise cryptographic erasure — and it is the canonical answer to "immutable ledger vs. right to erasure". But adopting it here means: a per-subject key store, re-encrypting every existing PII column in a live table, and rewriting **every read path** — RLS policies, the candidate-facing column allowlists, the EF resolvers, the AI prompt builders. That is a re-architecture of a production system to reach a compliance posture that Art. 12/16 IV already grants via anonymization. **Revisit only if a future obligation demands bit-preserving audit rows that anonymization would break.** Record the decision; don't re-open it every phase.

---

## Retention windows — a defensible default (⚠️ MEDIUM confidence, requires counsel sign-off)

The milestone flags the window as the open business decision. Research does not hand you a statutory number — Brazilian law sets **no fixed retention period for candidate data**; it sets a *principle* (Art. 15/16: retain only while the purpose lasts). What research does give is the practitioner consensus and the legal bases available. Proposed defaults, to be argued *against* in discuss-phase rather than accepted silently:

| Artifact | Window | Legal basis / rationale |
|---|---|---|
| CV binary in `curriculos` (Storage) | **180 days** after the candidatura closes | Highest-density PII, zero audit value. Practitioner consensus for non-hired candidates is 90–180 days. |
| Candidate PII, `autorizacao_retencao_curriculo = false` | **anonymize at 180 days** after closure | Purpose exhausted (Art. 15 I). |
| Candidate PII, `autorizacao_retencao_curriculo = true` | **anonymize at 24 months** | Consent (Art. 7 I) — **and the consent text must state the window and be withdrawable**. This is the M8 pre-condition for TALENT. |
| `decisao_final`, `historico_candidatura`, `bias_audit_log` | **retain indefinitely, anonymized** | Art. 16 IV (exclusive controller use) + the RNF-07a / LGPD-02 audit invariant. Never deleted, never weakened. |
| `notificacoes_enviadas` | **strip payload + recipient email at 180 days; keep status/counts/timestamps indefinitely** | Closes the retention question P37 explicitly deferred "a LGPD-OPS (M8+)". The delivery *proof* is audit; the *content and address* are PII. |
| `exportacoes-lgpd` artifacts | **7 days** | Regenerable on demand; an export bucket is a PII honeypot. |
| Art. 18 request ledger | **retain (anonymized) indefinitely** | It is your proof that you honored the right within the 15-day deadline. |

**The 15-day clock is real:** LGPD Art. 18 §1º — a complete response is owed within **15 days** of the request (an immediate simplified response is also permitted). That number should drive the RH queue's SLA badge, and it is the same primitive `config_sla_etapa` already models. *(MEDIUM-HIGH — consistent across all sources including gov.br.)*

**Two-year variant:** where the controller wants to retain for defense in a judicial/administrative proceeding (Art. 7 §3 / Art. 16 I), ~2 years is the commonly defended ceiling. If Beauty Smile's counsel wants that posture, the window changes but **nothing in the stack changes** — it is one interval literal in a `config_retencao` table. Make the window **data, not code**, so the legal decision can move without a deploy.

---

## Alternatives Considered

| Recommended | Alternative | When the alternative wins |
|---|---|---|
| Anonymize in place | Hard-delete all candidate rows | If counsel rules that Art. 16 IV retention is unacceptable for this data class. Cost: an FK-audit migration + weakening `decisao_final.por_usuario NOT NULL`, which breaks the LGPD-02 / RNF-07a guardrail. Do not do this casually. |
| Anonymize in place | Crypto-shredding | If a future obligation requires bit-preserving audit rows that tombstoning would corrupt. Requires per-subject keys + rewriting all read paths. |
| `pg_cron` → `pg_net` → EF | GitHub Actions cron calling the EF | Only if `pg_cron` were unavailable (it isn't). External cron adds an out-of-band secret and a second place to look when the purge silently stops. |
| Signed URL from a private bucket | Inline JSON response from the EF | Fine *only* if the export is provably small (< ~1 MB) and never includes the CV. Simpler; but it couples export size to EF response limits, and you'll hit it the first time someone has 15 candidaturas. |
| JSON export | CSV | CSV wins if the recipient is a spreadsheet-only human. But the data is nested (candidaturas → respostas → scores) and CSV flattening is lossy. Offer CSV as a *derived* view, never as the artifact of record. |
| `PROCEDURE` + `COMMIT` per batch | Single-transaction `DELETE` | Fine for tiny tables (< a few thousand rows). Breaks the moment it exceeds 10 minutes or takes a long lock on a live table. |
| Delete Art. 20 review data on erasure | Preserve it anonymized | Preserve. The Art. 20 review record is evidence you honored a right; destroying it destroys your own defense. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `anon` / PostgreSQL Anonymizer | Not available on hosted Supabase (MEDIUM — verify with `pg_available_extensions`). Also designed for dump-masking, not live per-subject erasure. | `SECURITY DEFINER` RPC doing an in-place tombstone `UPDATE` |
| `DELETE FROM storage.objects` (SQL) | 🔴 Orphans the S3 blob. Audit log says "deleted"; the CV is still there. Worst-case LGPD failure. | `pg_net` → EF → `storage.from(b).remove(paths)` |
| The `net._http_response` row as the purge success signal | Unlogged table, ~6 h retention, 2 s default timeout — a slow-but-successful EF looks like a failure. | The EF writes its own outcome to `purga_execucoes` |
| `pg_advisory_xact_lock` inside the purge procedure | Released by the first `COMMIT` in the batch loop → concurrent runs. | `pg_try_advisory_lock` / `pg_advisory_unlock` (session-level) |
| `shouldSoftDelete: true` for LGPD erasure | Retains the email in `auth.users` — still PII, does not satisfy Art. 18 VI. Re-signup behavior undocumented. | Hard delete, *after* Storage objects are removed |
| Calling `deleteUser` before deleting Storage objects | Supabase refuses: "You cannot delete a user if they are the owner of any objects in Supabase Storage." | Storage → anonymize → `deleteUser`, in that order |
| Weakening `decisao_final.por_usuario NOT NULL`, or adding `ON DELETE CASCADE` to it | It is the LGPD-02 / RNF-07a guardrail: a decision with no human actor. Erasure must not be the vector that removes it. | Anonymize the *candidate*; leave the decision row and its RH actor intact |
| Hard-deleting RH users | `decisao_final.por_usuario` and `redacoes.revisada_por` are `NO ACTION` by design. | Deactivate via the existing `gerenciar-usuario-rh` EF (`usuarios_rh.ativo = false`) — already built in M5 |
| `pg_partman` for retention | Partition-drop is uniform time-slicing; it cannot honor per-row `autorizacao_retencao_curriculo`. | Predicate-driven batched `DELETE` / `UPDATE` |
| `@react-pdf/renderer`, `react-email`-class libs in Deno EFs | Known to break in the Supabase edge runtime — the project already paid this cost in M7. | Hand-rolled JSON; `jspdf` (already installed) client-side if a PDF companion is wanted |
| `jszip` / `archiver` | A single-candidate export is KBs. A new dep + supply-chain gate for nothing. | Plain JSON + a separate signed URL for the CV |
| DSAR SaaS (OneTrust / Transcend / Ketch / Osano) | GDPR-shaped, enterprise-priced, and each still requires you to write the Supabase connector by hand. | Build it — the surface is three Edge Functions |
| BullMQ / Inngest / Trigger.dev / QStash | Re-introduces an external scheduler dependency one milestone after retiring n8n. | `pg_cron` + `pg_net`, already proven in PROD |
| `supabase db push --linked` for M8 migrations | SQLSTATE 42601 on PL/pgSQL `$$` bodies — and M8 is almost entirely procedures. | Supabase MCP `apply_migration` + `migration repair --status applied` (documented repo workaround) |
| `select('*')` anywhere in the export builder | The export is candidate-facing by definition. A `select('*')` here leaks RH-only columns (`observacoes_rh`, `motivo_rejeicao`, `rubric`, `opcao_knockout_id`) *directly to the data subject*, dressed as a compliance feature. | Explicit column allowlists — the project's standing invariant, and never more load-bearing than here |

---

## Stack Patterns by Variant

**If counsel rules that anonymization does not discharge Art. 18 VI:**
- Switch to hard-delete, and add an FK-remediation migration as a **blocking prerequisite phase**: `historico_candidatura.ator` → `ON DELETE SET NULL` (the column is already nullable and D-09 already assigns NULL the meaning "system"), plus whatever the `candidatos.user_id` audit reveals.
- `decisao_final.por_usuario` still cannot be nulled → you would need a `decisao_final_anonimizada` archive row or a documented exception. This is the expensive path. Get the ruling before planning the phase.

**If the retention window ends up ≥ 2 years:**
- No stack change. Move the interval into a `config_retencao` table read by the purge predicate, so the legal decision is data, not a deploy.

**If export volume grows (RH-side bulk export, M9+ reporting):**
- Same bucket + signed-URL pattern, but move generation to a `pg_cron`-driven background job writing to `exportacoes-lgpd`, and notify via the existing `notificar-candidato` / COMM pipeline when ready. The synchronous EF path only works for single-subject exports.

**If `pg_available_extensions` unexpectedly shows `anon`:**
- Still don't use it for erasure. It may be worth it for **masked non-production dumps** (which would incidentally close part of the DBMIG-01 rebuild-from-zero debt). Different problem, different phase.

---

## Version Compatibility

| Package / extension | Status | Notes |
|---|---|---|
| `@supabase/supabase-js@^2.104.0` (client) / `npm:@supabase/supabase-js@2` (EF) | already pinned | Auth Admin + Storage Admin live on this same client. No version bump needed for M8. |
| `pg_cron` | installed in PROD | Supabase: **≤8 concurrent jobs**, each job **≤10 min**. Pro plan or above (the project already uses it). Runs logged in `cron.job_run_details`. |
| `pg_net` | installed in PROD | Fire-and-forget; default timeout **2000 ms**; `net._http_response` **unlogged**, ~**6 h** retention; ~200 req/s ceiling. |
| `pgcrypto` | available (pre-installed on Supabase) | Not required under the recommended path. `gen_random_uuid()` is native in PG13+ regardless. |
| `anon` | **NOT available** (MEDIUM) | Verify before planning. Do not depend on it. |
| `jspdf@^4.2.1` + `jspdf-autotable@^5.0.8` | already in `package.json` | Client-side only. Sufficient for a human-readable export companion; must never become the sole portability format. |
| `svix@1.99.1` | already in the webhook EF only | Unrelated to M8; do not extend its blast radius. |

---

## Open questions the roadmapper must route (do not let these become discoveries mid-phase)

1. **Run the FK audit query.** `candidatos.user_id`'s `ON DELETE` is unknown, and it is the single constraint that decides whether deletion is a one-migration problem or a schema-remediation phase. *(Blocking.)*
2. **Run `pg_available_extensions` for `anon`.** Cheap; upgrades a MEDIUM negative to a HIGH fact.
3. **Empirically test `shouldSoftDelete` + re-signup** on a throwaway user. Undocumented, and the project already supports reinscrição pós soft-delete.
4. **Get a legal ruling on the retention window and on anonymization-as-erasure** before the purge phase is planned. The stack absorbs any number; it does not absorb a change of *mechanism*.
5. **Decide the `devolutivas_candidato` `ON DELETE CASCADE`** explicitly — it currently vaporizes silently.
6. **Decide free-text fields** (redação cultural, `observacoes_rh`) per-field: tombstone or hard-delete. Column-name-based PII detection will miss these.

---

## Sources

| Source | How verified | Confidence |
|---|---|---|
| `supabase.com/docs/guides/auth/managing-user-data` — "You cannot delete a user if they are the owner of any objects in Supabase Storage"; FK-to-`auth.users` guidance | direct quote via WebFetch | **HIGH** |
| `supabase.com/docs/guides/database/extensions/pg_net` — fire-and-forget, `net._http_response` unlogged / 6 h, 2000 ms default timeout, ~200 req/s | direct fetch | **HIGH** |
| `supabase.com/docs/guides/cron` — `cron.job`, `cron.job_run_details`, ≤8 concurrent jobs, ≤10 min per job | direct fetch | **HIGH** |
| `supabase.com/docs/guides/storage/management/delete-objects` + `supabase/storage#601` — SQL delete orphans the blob | web search, multiple corroborating | **MEDIUM-HIGH** |
| Context7 `/websites/supabase` — `deleteUser(id, shouldSoftDelete)`, `storage.remove(paths)`, `createSignedUrl(path, expiresIn)`, EF upload pattern | Context7 (curated docs mirror) | **MEDIUM** |
| `supabase/postgres#204` (closed, unshipped) + Supabase extension catalogue (~64, `anon` absent) | web search + fetch | **MEDIUM** (negative claim — verify on PROD) |
| `supabase/supabase#20057` — `shouldSoftDelete` semantics undocumented | web search | **LOW** (documents the *absence* of documentation) |
| LGPD Art. 5 XI / Art. 12 *caput* & §1 / Art. 16 IV / Art. 18 §1º (15 days) — Brazilian practitioner sources (Conjur, Migalhas, gov.br, lgpdbrasil) | web search, multiple corroborating | **MEDIUM** — legal reading, needs counsel |
| Recruitment retention practice 90–180 days; ~2 years under Art. 7 §3 / Art. 16 I | web search, multiple corroborating | **MEDIUM** — practice consensus, not statute |
| Postgres batched-delete / advisory-lock / `ctid`-LIMIT patterns (Crunchy Data, Sequin, community) | web search, multiple corroborating | **MEDIUM** |
| Crypto-shredding recognition (EDPB Guidelines 5/2019, ICO, CNIL) as cryptographic erasure | web search, secondary sources | **LOW-MEDIUM** — reported, not read at source |
| Repo evidence: `supabase/migrations/*.sql` FK grep, `database.types.ts` `candidatos` shape, `package.json` deps | read directly | **HIGH** |

---
*Stack research for: LGPD data-subject rights, retention and automated purge on hosted Supabase*
*Researched: 2026-07-29*
