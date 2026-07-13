# Phase 24: Blindagem de Segurança / PII / LGPD - Pattern Map

**Mapped:** 2026-07-06
**Files analyzed:** 27 (new + modified)
**Analogs found:** 25 / 27 (2 have no direct analog — SEC-10 DROP, SEC-03 Vault n8n secret)

> **Governing rule for the whole phase (do not violate):** RLS is row-level only — it never hides a column. Every fix has a shipped precedent in THIS repo. The failure mode is applying the *column REVOKE* precedent where the *candidate-DENY row + DEFINER RPC* precedent is required (SEC-02). See RESEARCH §Architecture "three column-secrecy mechanisms".

---

## File Classification

| New/Modified File | Role | Data Flow (who reads / who is denied) | Closest Analog | Match |
|-------------------|------|----------------------------------------|----------------|-------|
| `supabase/migrations/*_sec01_cognitivo_gabarito.sql` (NEW) | RPC + RLS + column REVOKE | candidate reads items id/texto only via DEFINER RPC; gabarito_idx denied to authenticated/anon | `20260612000001_bigfive_itens.sql:200-212` (`get_bigfive_itens`) | exact |
| `supabase/migrations/*_sec02_redacao_verdict.sql` (NEW) | RPC + RLS | candidate own-row via DEFINER RPC (safe cols); RH keeps base-table verdict read | `20260611000002:107-130` (`get_opcoes_sjt` DEFINER + guard) + `20260610000003:56-59` (auth.uid ownership) | role-match |
| `supabase/migrations/*_sec07_rubric.sql` (NEW) | column REVOKE | only `avaliar-redacao` EF (service_role) reads rubric; candidate keeps other `perguntas` cols | `20260612000001:211` REVOKE idiom | exact |
| `src/features/avaliacao-cognitiva/services/cognitivoService.ts` (MOD `:154-159`) | candidate-facing service | rewire `.from('cognitivo_itens').select(ALLOWLIST)` → `.rpc('get_cognitivo_itens')` | same file `:215` (`.rpc('pontuar_cognitivo')`) | exact |
| `src/features/avaliacao/services/redacaoService.ts` (MOD `:181,221`) | candidate-facing service | rewire `.from('redacoes_candidato').select(ALLOWLIST)` → `.rpc('get_minha_redacao')` | same file `:215` cognitivo RPC idiom | exact |
| `src/features/avaliacao/services/avaliacaoService.ts` (MOD `:136`) | candidate-facing service | drop `rubric` from the perguntas allowlist select | `cognitivoService.ts:59` (`COGNITIVO_ITENS_ALLOWLIST`) | exact |
| `supabase/migrations/*_sec05_08_vaga_scope.sql` (NEW) | RLS policy | recrutador-não-dono → 0 rows on analise/comparativo/candidaturas; admin bypass | `20260625000001:294-327` (WR-04) | exact |
| `supabase/functions/gerar-devolutiva-bigfive/index.ts` (MOD `:571-589`) | EF (privileged) | server-to-server only; Bearer self-auth gates the handler (closes IDOR) | `cost-alerter/index.ts:90-113` | exact |
| `supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts` (MOD) | test | no-Bearer→401, wrong-Bearer→401, service-Bearer→200 | `avaliar-redacao/__tests__/index.test.ts` (deps-injection harness) | role-match |
| `supabase/migrations/*_sec03_n8n_serverside.sql` (NEW) | RLS trigger + pg_net | server-side dispatch reads Vault URL; bundle never carries URL | `20260610000003:63-82` (pg_net + `vault.decrypted_secrets`) | role-match |
| `src/features/vagas/services/candidaturasService.ts` (MOD `:70-71,82-83`) | client service | delete URL constants + `VITE_N8N_*` + `fetch()` dispatch | (removal — no analog) | n/a |
| `src/features/explicacao/services/explicacaoService.ts` (MOD `:129-130`) | client service | delete `VITE_N8N_REVISAO_DECISAO_URL` + fallback + fetch | (removal — no analog) | n/a |
| `supabase/migrations/*_sec09_auth_admin_policy.sql` (NEW) | RLS policy (mirror) | declare live `auth_admin_le_usuarios_rh` (zero behavior change) | `20260420000002:100-102` (GRANTs) + memory `reference_auth_hook_rls_gap` | role-match |
| `supabase/migrations/*_sec10_drop_backup.sql` (NEW) | migration (DROP) | LGPD erasure — `backup_m2.candidaturas_pre_funil` gone | (no analog — plain DROP TABLE/SCHEMA) | none |
| `src/components/pages/ConfiguracoesPage.tsx` (MOD) `MeuPerfilPage.tsx` `VagasRHPage.tsx` | RH pages | strip operational `console.log` (esp. candidate email) | `PerfilCandidatoRHPage.tsx` FX-14 precedent | exact |
| `src/__tests__/guards/rh-console.grep.test.ts` (MOD `:46-52`) | test-guard | extend `RH_PATH_FILES` to include the 3 named pages | same file (self-extend) | exact |
| `supabase/migrations/*_ux08_o6_deactivate.sql` (NEW) | migration + RPC | add `ativo` flag, deactivate {28,58,88,118}, `get_bigfive_itens` filters `ativo` | `20260612000001:200-212` | exact |
| `supabase/functions/_shared/bigfive-scoring.ts` (MOD `:34-45,237,262-275`) | scorer | drop 88/118 from REVERSED; 120→116 count; prorate O ×6/5 | same file (edit in place) | exact |
| `supabase/functions/submit-bigfive-final/index.ts` (MOD `:97-107`) | EF (validateBody) | active-id-set validation, non-contiguous ids | same file `:82-107` | exact |
| `src/features/avaliacao/.../bigfiveSchema.ts` (MOD `:30,63-65`) | schema | drive count off loaded/active set, not `1..120` | same file `:62-72` | exact |
| `src/.../BigFiveQuestionnaireScreen.tsx` (MOD `:267,280`) | component | "120 afirmações" copy → dynamic count | same file (edit in place) | exact |
| `supabase/functions/_shared/bigfive-scoring.test.ts` (MOD) | test | golden 116/53 + prorate assert + non-contiguous NEUTRAL_VECTOR | same file (golden update) | exact |
| `supabase/tests/sec_rls_smokes.sql` (NEW) | test (SQL smoke) | `set_config('request.jwt.claims',…)` candidato-DENY / non-owner-42501 | M2 SECURITY-gate idiom (RESEARCH §Validation) | role-match |
| `src/__tests__/guards/*n8n*.grep.test.ts` (NEW, SEC-03) | test-guard | build-artifact grep `n8n.cloud\|fernandocosta` → 0 | `rh-console.grep.test.ts` / `forbidden-strings.grep.test.ts` | exact |

---

## Pattern Assignments

### Wave A — Column secrecy (SEC-01 / SEC-02 / SEC-07)

The **crux matrix** (RESEARCH). Get the mechanism right per column:

| Req | Column(s) | Any `authenticated` client reads it via API? | Mechanism |
|-----|-----------|----------------------------------------------|-----------|
| SEC-01 | `cognitivo_itens.gabarito_idx` | **No** (only `pontuar_cognitivo` DEFINER) | column REVOKE ✅ + candidate-DENY row + new DEFINER RPC |
| SEC-02 | `redacoes_candidato.{analise_ia,scores_dimensao,score_ponderado_0_100,classificacao_cor,red_flag_etico,flags,scores_humanos,notas_revisor,decisao_revisor}` | **Yes** — RH reads as `authenticated` | ❌ column REVOKE (breaks RH) → candidate-DENY row + DEFINER RPC |
| SEC-07 | `perguntas.rubric` | **No** (only `avaliar-redacao` EF) | client allowlist drop ✅ + column REVOKE ✅ |

---

#### `supabase/migrations/*_sec01_cognitivo_gabarito.sql` (migration, RPC + RLS + REVOKE)

**Analog:** `supabase/migrations/20260612000001_bigfive_itens.sql:200-212` (`get_bigfive_itens`) — the answer-key-safe DEFINER reader. Also `get_opcoes_sjt` (`20260611000002:107-130`).

**DEFINER answer-key reader pattern to copy** (`20260612000001:200-212`):
```sql
CREATE OR REPLACE FUNCTION public.get_bigfive_itens()
RETURNS TABLE (item_id int, texto text, ordem int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.item_id, b.texto, b.ordem
    FROM public.bigfive_itens b
   ORDER BY b.ordem;
$$;
REVOKE ALL ON FUNCTION public.get_bigfive_itens() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bigfive_itens() TO authenticated;
```

**Current SEC-01 target table + the row policy to DROP** (`20260624000001_entrevista_cognitivo_tables.sql:105-166`):
```sql
CREATE TABLE public.cognitivo_itens (
  ...
  alternativas  jsonb NOT NULL,
  gabarito_idx  int NOT NULL,   -- SERVER-ONLY (never in candidate projection)
  ...);
-- L162-165 — the broad authenticated SELECT (must be dropped; candidate rewired to RPC):
DROP POLICY IF EXISTS auth_le_cognitivo_itens ON public.cognitivo_itens;
CREATE POLICY auth_le_cognitivo_itens ON public.cognitivo_itens
  FOR SELECT USING ((select auth.role()) = 'authenticated');
```

**Transformation:** create `public.get_cognitivo_itens()` returning `(id, secao, enunciado, alternativas, ordem)` — NEVER `gabarito_idx`; `REVOKE SELECT (gabarito_idx) ON public.cognitivo_itens FROM authenticated, anon`; `DROP POLICY auth_le_cognitivo_itens` (defense-in-depth); then rewire the client (below). `cognitivo_itens` is EMPTY today (CC0 seed deferred to M5) → the leak is LATENT but must close before the seed (SEC-01 is the CC0 prerequisite). Keep `SET search_path = ''`, `REVOKE PUBLIC / GRANT authenticated`, and never write `candidaturas` (RNF-07a).

---

#### `supabase/migrations/*_sec02_redacao_verdict.sql` (migration, RPC + RLS — the one NOT to REVOKE)

**Analog:** `get_opcoes_sjt` DEFINER-with-guard (`20260611000002:107-130`) for the RPC shape; `reprocessar_analise:56-59` for the `auth.uid()` ownership guard inside a DEFINER.

**Current candidate row policy to DROP** (`20260623100003_redacoes_candidato.sql:107-115`) — this is the base-table read the candidate currently uses; dropping it forces the RPC path:
```sql
DROP POLICY IF EXISTS redacao_candidato_select ON public.redacoes_candidato;
CREATE POLICY redacao_candidato_select ON public.redacoes_candidato
  FOR SELECT TO authenticated
  USING ( candidatura_id IN (
    SELECT id FROM public.candidaturas
    WHERE candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = auth.uid())));
```

**RH policies that MUST stay intact** (`20260623100003:124-135`) — RH reads verdict as `authenticated`, so a column REVOKE would break these:
```sql
CREATE POLICY redacao_rh_select ON public.redacoes_candidato
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
CREATE POLICY redacao_rh_update ON public.redacoes_candidato ...; -- keep
```

**Transformation:** DROP `redacao_candidato_select`; CREATE `public.get_minha_redacao(p_candidatura_id uuid)` SECURITY DEFINER that JOINs `candidaturas → candidatos` and enforces `ca.user_id = auth.uid()` INSIDE the function, projecting ONLY the safe columns already named by `MinhaRedacaoRow` (`redacaoService.ts:88-95`): `id, pergunta_id, texto, word_count, submetida_em, status_analise` — NEVER a verdict column and NEVER `bloqueio_avanco`. **Discretion (RESEARCH):** consider coarsening `status_analise` so `pendente_humano` does not leak "you got a red flag". Do NOT column-REVOKE here (Pitfall 1).

---

#### `supabase/migrations/*_sec07_rubric.sql` + `avaliacaoService.ts:136` (column REVOKE + client allowlist drop)

**Analog:** `20260612000001:211` REVOKE idiom; `cognitivoService.ts:59` allowlist idiom.

**Current leak** (`src/features/avaliacao/services/avaliacaoService.ts:135-136`) — the ONLY candidate reader of `rubric`:
```ts
    .from('perguntas')
    .select('id, cargo, cenario, formato, tempo_est_min, rubric, status')  // rubric = BARS criteria (answer key)
```
**Existing allowlist idiom to mirror** (`cognitivoService.ts:59`):
```ts
export const COGNITIVO_ITENS_ALLOWLIST = 'id, secao, enunciado, alternativas, ordem'
```
**Transformation:** drop `rubric` from the select at `avaliacaoService.ts:136`; add `REVOKE SELECT (rubric) ON public.perguntas FROM authenticated, anon` (only the `avaliar-redacao` EF service_role reads it). Keep the `cand_le_perguntas_ativas` row policy (`20260611000002:69-72`) — the candidate still needs the other `perguntas` columns; only the column is revoked.

---

#### Client rewires (SEC-01 / SEC-02) — MUST land in the SAME wave as the migrations (Pitfall 2)

**SEC-01** `cognitivoService.ts:154-159` → the RPC idiom already used at `:215`:
```ts
// CURRENT (:154-159) — remove:
  const { data, error } = await supabase
    .from('cognitivo_itens').select(COGNITIVO_ITENS_ALLOWLIST).order('ordem', { ascending: true }).limit(ITENS_LIMIT)
// RPC idiom to mirror (SAME FILE :215):
  const { error } = await supabase.rpc('pontuar_cognitivo', { ... })
// → rewrite to: await supabase.rpc('get_cognitivo_itens')
```
Keep `COGNITIVO_ITENS_ALLOWLIST` + the `prova-cognitiva.test.tsx` regression as a second guard.

**SEC-02** `redacaoService.ts:181,221` (`.select(REDACAO_CANDIDATO_ALLOWLIST)`) → `.rpc('get_minha_redacao', { p_candidatura_id })`. Reuse `MinhaRedacaoRow` (`:88-95`) verbatim — it already names exactly the safe columns.

---

### Wave B — Vaga-ownership horizontal scoping (SEC-05 / SEC-06 / SEC-08)

#### `supabase/migrations/*_sec05_08_vaga_scope.sql` (RLS policies)

**Analog (copy verbatim):** `supabase/migrations/20260625000001_phase14_gap_closure.sql:294-327` (WR-04). The `20260625000001:294-311` block is the exact `administrador`-bypass + `rh`-own-vaga predicate:
```sql
CREATE POLICY rh_le_entrevista_analises ON public.entrevista_analises
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ( (select auth.jwt() #>> '{app_metadata,role}') = 'rh'
         AND candidatura_id IN (
           SELECT c.id FROM public.candidaturas c
             JOIN public.vagas v ON v.id = c.vaga_id
            WHERE v.created_by = (select auth.uid()) ) ) );
```

**Current role-only policies to REPLACE:**
- SEC-05 `20260610000001_analise_tables.sql:78-89` — `rh_le_analise` / `rh_le_comparativo` are `role IN ('rh','administrador')` only. Both tables carry `vaga_id` **directly** → scope on `vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid()))` (simpler than the candidaturas JOIN above).
- SEC-08 `20260607000006_rls_policies_m2_backbone.sql:44-58` — `rh_le_candidaturas` (SELECT) + `rh_avanca_etapa` (UPDATE) role-only. `candidaturas.vaga_id` exists directly → scope both (UPDATE needs USING **and** WITH CHECK). Leave `candidato_le_propria_candidatura` untouched.

**Exact replacement SQL** is in RESEARCH §Code Examples (lines 291-321) — copy those five DROP/CREATE blocks verbatim.

**SEC-06 is a REGRESSION-GUARD, not a change** — `reprocessar_analise` is ALREADY vaga-scoped (`20260610000003:52-59`):
```sql
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF v_role NOT IN ('rh', 'administrador') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege'; END IF;
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege'; END IF;
```
Add a SQL smoke proving non-owner → 42501; do not re-author.

**Adjacent role-only tables (A30/M15) — planner decision (RESEARCH Open Q1):** `redacoes_candidato` `redacao_rh_select`/`redacao_rh_update` (`20260623100003:124,131`) is confirmed role-only and EXPLICITLY named in A30 → include in the SEC-06 sweep (one extra DROP/CREATE each). `devolutivas_candidato` (`20260612000002:57`) + `historico_candidatura` (`20260607000006:74`) are cheap same-migration adds OR an explicit defer note. `scores_candidato`/`entrevista_analises`/`entrevista_guias`/`decisao_final` are ALREADY WR-04-scoped → regression-guard only, do NOT re-scope.

---

### Wave C — Privileged EF authz + n8n server-side (SEC-04 / SEC-03)

#### `supabase/functions/gerar-devolutiva-bigfive/index.ts:571-589` (EF Bearer self-auth)

**Analog:** `supabase/functions/cost-alerter/index.ts:90-113` (Bearer self-auth against the service-role key). The current `gerar-devolutiva-bigfive` handler has **ZERO auth** — `score_id` is parsed raw at `:699-708` straight into `handler`.

**Guard pattern to copy** (`cost-alerter/index.ts:100-114`):
```ts
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!SUPABASE_URL || !SERVICE_KEY) { return errorResponse('SERVER_ERROR', 'Servidor mal configurado', 500) }
const authHeader = req.headers.get('Authorization') ?? ''
const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
const expectedSecret = Deno.env.get('COST_ALERTER_SECRET') ?? SERVICE_KEY  // rotation-friendly override
if (!bearer || bearer !== expectedSecret) {
  console.warn('[cost-alerter] Rejected request: invalid/absent Bearer')
  return errorResponse('UNAUTHORIZED', 'Não autorizado.', 401)
}
```

**Exact insertion point** (`gerar-devolutiva-bigfive/index.ts`): `Deno.serve` starts `:571`; OPTIONS/method guard `:572-578`; env read `:580-589` (already reads `SERVICE_KEY`). Insert the Bearer block immediately AFTER `:589` and BEFORE the `score_id` parse at `:699-708`. Use `DEVOLUTIVA_INVOKE_SECRET ?? SERVICE_KEY`.

**Landmine (Pitfall 4):** do NOT read role from `getUser().app_metadata` — the hook injects role only into the signed JWT, never `raw_app_meta_data`; it is always `undefined`. This EF is server-to-server only (grep of `src/` for a caller is empty; only `submit-bigfive-final` invokes it via service_role) → Bearer self-auth is the sufficient guard, not role+posse. Redeploy `supabase functions deploy gerar-devolutiva-bigfive` (bundle-freeze).

#### `gerar-devolutiva-bigfive/__tests__/index.test.ts` (SEC-04 test)

**Analog:** `supabase/functions/avaliar-redacao/__tests__/index.test.ts` (deps-injection harness). Add three caller-authz cases: no-Bearer→401, wrong-Bearer→401, service-Bearer→200.

#### `supabase/migrations/*_sec03_n8n_serverside.sql` + client removals (SEC-03)

**Analog:** `reprocessar_analise` server-side dispatch (`20260610000003:63-82`) — pg_net + Vault:
```sql
SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
SELECT decrypted_secret INTO v_invoke_key  FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
IF v_project_url IS NULL OR v_invoke_key IS NULL THEN RETURN; END IF;  -- graceful skip
PERFORM net.http_post(
  url := v_project_url || '/functions/v1/analise-candidato-individual',
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_invoke_key),
  body := jsonb_build_object('candidatura_id', p_candidatura_id, 'vaga_id', v_vaga_id));
```

**Current leaks (3 hardcoded n8n URLs — REMOVE both the `VITE_N8N_*` read AND the fallback AND the client `fetch()`):**
- `candidaturasService.ts:70-71` (`VITE_N8N_NOVA_CANDIDATURA_URL` + `https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura`)
- `candidaturasService.ts:82-83` (`VITE_N8N_STATUS_UPDATE_URL` + `.../status-candidatura`)
- `explicacaoService.ts:129-130` (`VITE_N8N_REVISAO_DECISAO_URL` + `.../revisao-decisao`)

**Transformation:** add an n8n URL Vault secret; fire the 3 events server-side via a pg_net trigger reading the Vault URL (mirror `reprocessar_analise`). Delete all `VITE_N8N_*` reads + fallbacks + client `fetch()` dispatch. **Pitfall 5:** `VITE_`-prefixed vars are inlined into the public bundle — configurable ≠ private. Add a build-artifact grep guard (Wave 0). Full `notificar-candidato` EF is M5; M4 only removes the URL from the bundle.

> No direct analog for the **Vault secret creation** itself — the executor adds/rotates it at execution (not visible to research; DEFINER-only). Not a code pattern.

---

### Wave D — Declarations + hygiene (SEC-09 / SEC-10 / SEC-11)

#### `supabase/migrations/*_sec09_auth_admin_policy.sql` (mirror the live policy)

**Analog:** `20260420000002_unified_auth_role.sql:100-102` (the GRANTs the policy depends on) + memory `reference_auth_hook_rls_gap` (the exact live policy). The policy `auth_admin_le_usuarios_rh` exists in PROD via execute_sql ONLY (drift).

**GRANTs already shipped** (`20260420000002:100-102`):
```sql
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON public.usuarios_rh TO supabase_auth_admin;
GRANT SELECT ON public.candidatos  TO supabase_auth_admin;
```
**Exact mirror to declare** (RESEARCH §Code Examples, idempotent):
```sql
GRANT SELECT ON public.usuarios_rh TO supabase_auth_admin;   -- harmless repeat
DROP POLICY IF EXISTS auth_admin_le_usuarios_rh ON public.usuarios_rh;
CREATE POLICY auth_admin_le_usuarios_rh ON public.usuarios_rh
  AS PERMISSIVE FOR SELECT TO supabase_auth_admin USING (true);
```
**Transformation:** zero behavior change — this ends the drift, does not re-migrate. Executor MUST first `SELECT policyname, qual, roles FROM pg_policies WHERE tablename='usuarios_rh'` via MCP and confirm byte-for-behavior before applying (memory: "NÃO re-migrar"). Version-row reconcile is Phase 27, not here.

#### `supabase/migrations/*_sec10_drop_backup.sql` (no analog — plain DROP)

`DROP TABLE IF EXISTS backup_m2.candidaturas_pre_funil; DROP SCHEMA IF EXISTS backup_m2 CASCADE;`. **MCP-verify existence first** (`SELECT to_regclass('backup_m2.candidaturas_pre_funil')`) + capture the column list (LGPD evidence) before dropping. If already gone → no-op (`IF EXISTS`). Data-migration-adjacent — PII snapshot from the 2026-06-07 cutover, outside `data_deletion_log` (`20260609000001`) erasure coverage.

#### RH pages — strip `console.log` (SEC-11)

**Analog:** the FX-14 cleanup precedent that flipped `rh-console.grep.test.ts` green (removed logs from `PerfilCandidatoRHPage.tsx`/`SuporteRHPage.tsx`).

**Confirmed live console sites (grepped this session):**
| File | Lines | Action |
|------|-------|--------|
| `ConfiguracoesPage.tsx` | 418, 437, 474, **491 (candidate email — worst)**, 1255 | remove `console.log` |
| `MeuPerfilPage.tsx` | 39, 47, 52 | remove `console.log` |
| `VagasRHPage.tsx` | 90, 136, 158 | `console.error` — the FX-14 guard deliberately ALLOWS `console.error`; keep or gate behind `import.meta.env.DEV` (planner call) |
| `CriarEditarVagaPage.tsx` | 142 | `console.error` — same (keep/gate) |

#### `src/__tests__/guards/rh-console.grep.test.ts:46-52` (extend the guard)

**Analog:** the file itself. Extend `RH_PATH_FILES` (currently `PerfilCandidatoRHPage`, `SuporteRHPage`, `decisao`/`entrevista`/`triagem` subtrees) to also cover `src/components/pages/ConfiguracoesPage.tsx` + `MeuPerfilPage.tsx` (+ `VagasRHPage.tsx` if the plan strips its `console.error`). The `FORBIDDEN_CONSOLE = /console\.(log|debug|info|warn)\s*\(/` regex + `isCommentLine` comment-awareness stay as-is; note it does NOT forbid `console.error`.

---

### Wave E — Psychometric integrity (UX-08) — ISOLATE (highest risk, 6-file lockstep)

**Confirmed:** items to deactivate = **{28, 58, 88, 118}**, all `dimensao='O'`, `faceta=28` (O6 "Liberalism/Values"), verified in the seed (`20260612000001:100,130,160,190`). Two of them are reverse-keyed: **88 and 118** (present in `REVERSED` at `bigfive-scoring.ts:40`); 28 and 58 are not. So O reversed 12→10, total reversed 55→53.

#### `supabase/migrations/*_ux08_o6_deactivate.sql` (DB + RPC filter)

**Analog:** `get_bigfive_itens` (`20260612000001:200-212`). **Transformation** (RESEARCH §8 — reversible flag, NOT hard DELETE, so M5 re-add flips it back):
```sql
ALTER TABLE public.bigfive_itens ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
UPDATE public.bigfive_itens SET ativo = false WHERE item_id IN (28,58,88,118);  -- O6 political
-- get_bigfive_itens filters ativo (keep the exact projection + REVOKE/GRANT):
CREATE OR REPLACE FUNCTION public.get_bigfive_itens()
RETURNS TABLE (item_id int, texto text, ordem int)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT b.item_id, b.texto, b.ordem FROM public.bigfive_itens b WHERE b.ativo ORDER BY b.ordem;
$$;
```

#### `supabase/functions/_shared/bigfive-scoring.ts` (scorer — preserve Johnson norm via O-prorate)

**Current count guard to change** (`:235-238`):
```ts
  const keys = Object.keys(respostas);
  if (keys.length !== 120) { throw new Error(`bigfive-scoring: expected 120 responses, got ${keys.length}`); }
```
**Current REVERSED O block** (`:39-40`) — drop 88 and 118:
```ts
  // Abertura (O) — 12
  48, 53, 68, 73, 78, 83, 88, 98, 103, 108, 113, 118,   // → remove 88, 118 (O reversed 12→10, total 55→53)
```
**Current domain sum** (`:257-260`) — facet 28 becomes 0 → O summed over 5 facets; prorate:
```ts
  const domainRaw: Record<Domain, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  for (let f = 1; f <= 30; f++) { domainRaw[FACET_TO_DOMAIN[f]] += facetRaw[f]; }
  // ADD (RESEARCH §8): prorate O ×6/5 so the wired 24-item Johnson norm stays valid:
  // domainRaw.O = Math.round(domainRaw.O * 6 / 5);   // only O; N/E/A/C untouched
```
**Transformation:** count `120`→`116` (or derive from response length); drop 88/118 from REVERSED; prorate ONLY O ×6/5; facet 28 output at `:272-275` may stay raw 0 (devolutiva uses domain-level `paginas` only — cosmetic). Keep every other transcribed constant verbatim.

#### Downstream lockstep (all in the UX-08 wave — Pitfall 3):
- `submit-bigfive-final/index.ts:97-107` — `validateBody`: `Object.keys(rec).length !== 120` → active-set (116); the `for (let id=1; id<=120; id++)` loop MUST become active-id-set iteration (ids are **non-contiguous** — gaps at 28/58/88/118). **Redeploy** (bundles the scorer). RESEARCH recommends deriving the active set from the bank server-side.
- `bigfiveSchema.ts:30,62-65` — `BIGFIVE_TOTAL_ITENS = 120`; `isAllAnswered`/`countAnswered` loops (`:63-65` iterate `1..BIGFIVE_TOTAL_ITENS`) → drive off loaded items (which come from `get_bigfive_itens` = 116), not a literal range.
- `BigFiveQuestionnaireScreen.tsx:267,280` — `"120 afirmações"` / `"São 120 afirmações"` copy + `"{numero} / 120"` (`:133`) → dynamic count.
- `bigfive-scoring.test.ts` — golden: `REVERSED_O` drops 88,118; "exactly 55" → 53; `NEUTRAL_VECTOR` loop skips {28,58,88,118}; add a prorate assertion.

---

### Wave 0 — Tests (new)

#### `supabase/tests/sec_rls_smokes.sql` (SQL smokes)

**Analog:** the M2 SECURITY-gate idiom — `set_config('request.jwt.claims', …)` simulating candidato / recrutador-não-dono, asserting 0-columns / 0-rows / 42501 (used throughout Phases 8/10/11 SECURITY gates; no pgTAP committed). Commit the throwaway smokes as repeatable tests (closes A45/M17 for these tables). Cover: candidato-DENY on `gabarito_idx`/verdict; non-owner 0-rows on analise/comparativo/candidaturas/redacao; `pontuar_*` never writes `candidaturas` (RNF-07a regression).

#### `src/__tests__/guards/*n8n*.grep.test.ts` (SEC-03 build guard)

**Analog:** `src/__tests__/guards/rh-console.grep.test.ts` (node:fs recursive grep) / `forbidden-strings.grep.test.ts`. Assert `grep -r 'n8n.cloud\|fernandocosta' build/ ⇒ 0` after SEC-03 removes the URL constants.

---

## Shared Patterns (cross-cutting — apply to all relevant plans)

### SECURITY DEFINER answer-key reader (SEC-01 primary; SEC-02 shape; UX-08 RPC)
**Source:** `20260612000001:200-212` (`get_bigfive_itens`), `20260611000002:107-130` (`get_opcoes_sjt`).
**Invariants every new/edited RPC MUST keep:** `SECURITY DEFINER` · `SET search_path = ''` · project ONLY safe columns (never the answer key) · `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE … TO authenticated` · never writes `candidaturas` / never auto-rejects (RNF-07a). Own-row RPCs (SEC-02) enforce `auth.uid()` INSIDE the function (`reprocessar_analise:56-59` idiom — `auth.uid()` is GUC-based, survives DEFINER; Phase-6 proof).

### Vaga-ownership predicate (SEC-05 / SEC-06 / SEC-08)
**Source:** `20260625000001:294-327` (WR-04). **Apply to:** every RH SELECT/UPDATE policy that is currently role-only.
```sql
(select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
OR ( (select auth.jwt() #>> '{app_metadata,role}') = 'rh'
     AND <fk> IN (SELECT id/… FROM public.vagas WHERE created_by = (select auth.uid())) )
```
The `(select auth.…)` wrapper is the planner-cache idiom (keep it). `analise_candidato_vaga`/`comparativo_solicitado`/`candidaturas` scope on `vaga_id` directly; `entrevista_analises`/`redacoes_candidato` scope via the `candidaturas→vagas` JOIN.

### Privileged EF caller authz (SEC-04)
**Source:** `cost-alerter/index.ts:90-113`. **Apply to:** any EF that reads via service_role. Bearer self-auth for server-to-server; NEVER a role read from `getUser()` (Pitfall 4).

### Server-side pg_net + Vault dispatch (SEC-03)
**Source:** `reprocessar_analise` (`20260610000003:63-82`). **Apply to:** moving any client-tier URL server-side. Graceful skip if the Vault secret is NULL (no error raised).

### FX-14 console-log grep guard (SEC-11)
**Source:** `src/__tests__/guards/rh-console.grep.test.ts` (node:fs, comment-aware, allows `console.error`). **Apply to:** extending RH-page coverage.

### PROD apply mechanics (all migrations)
Apply via Supabase MCP `apply_migration`/`execute_sql` (bypasses 42601, writes the version row — CLAUDE.md §Commands / RESEARCH Pitfall 7). No outer `BEGIN;…COMMIT;` wrapper. Redeploy touched EFs (`gerar-devolutiva-bigfive`, `submit-bigfive-final`) via `supabase functions deploy` (bundle-freeze — `reference_ef_shared_bundle_freeze`).

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| `supabase/migrations/*_sec10_drop_backup.sql` | migration (DROP) | Plain `DROP TABLE/SCHEMA` for LGPD erasure — no existing "erasure migration" to mirror; MCP-verify existence + column list first |
| n8n URL Vault secret (SEC-03 secret creation) | infra secret | Not a code pattern — executor adds/rotates the Vault secret at execution (DEFINER-only, not visible to research). The pg_net *dispatch* has an analog; the *secret* does not |

---

## Metadata

**Analog search scope:** `supabase/migrations/*`, `supabase/functions/*` (+ `_shared`), `src/features/{avaliacao,avaliacao-cognitiva,vagas,explicacao}/services/*`, `src/components/pages/*RH*`, `src/__tests__/guards/*`.
**Files scanned:** ~24 (migrations, EFs, services, guard tests) — every anchor cited in RESEARCH §Sources verified in-repo this session.
**Live-state caveat:** PROD RLS/table state is INFERRED from migration files. The executor MUST run the RESEARCH §Environment-Availability live-state queries (`pg_policies` on target tables, `to_regclass('backup_m2.candidaturas_pre_funil')`, `cognitivo_itens` column ACLs, live `auth_admin_le_usuarios_rh` def) via MCP as the FIRST task, before authoring migrations.
**Pattern extraction date:** 2026-07-06
