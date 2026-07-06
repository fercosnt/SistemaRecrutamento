# Phase 24: Blindagem de Segurança / PII / LGPD - Research

**Researched:** 2026-07-06
**Domain:** Supabase RLS / column-level access control · privileged Edge Function authz · IDOR/PII closure · psychometric scorer integrity (LGPD)
**Confidence:** HIGH (all anchors read from migrations + services in-repo; live PROD RLS INFERRED — see Environment Availability)

<user_constraints>
## User Constraints (from 24-CONTEXT.md)

### Locked Decisions

**Proteção column-level de PII (SEC-01/02/07)**
- **SEC-01 gabarito cognitivo (`gabarito_idx`):** column REVOKE de `authenticated` (e `anon`) + leitura só via **RPC SECURITY DEFINER** (padrão answer-key M2). Candidato autenticado que faz GET direto → 0 colunas de resposta. Defense-in-depth (REVOKE + RPC), não RPC-only.
- **SEC-02 veredito da redação:** candidato NÃO lê score/cor/red_flag ético/notas do revisor da própria redação — **allowlist projection** candidate-facing (nunca `select('*')`) + column REVOKE / RLS column-level onde o candidato lê a própria row. Testar a projeção de rede, não o JSX.
- **SEC-07 rubric:** o service candidate-facing **dropa a coluna `rubric`** (critérios BARS) da projeção de perguntas — allowlist explícita sem `rubric`.
- **Mecanismo:** RPC SECURITY DEFINER p/ gabarito (candidato lê id+texto-only via RPC); allowlist + column REVOKE p/ veredito/rubric.

**EF authz + policies vaga-scoped + n8n (SEC-03/04/05/06/08/09)**
- **SEC-04 `gerar-devolutiva-bigfive`:** two-client **authenticate-THEN-authorize** — depois de `getUser()`, checar role + **posse** (Bearer interno + role + posse), fechando o IDOR de leitura de devolutiva alheia. Padrão Phase-10.
- **SEC-05/06/08 policies vaga-scoped:** trocar SELECT policies **role-only** por **vaga-scoped** — recrutador não-dono NÃO lê análise/comparativo/candidaturas de vaga alheia. Escopo horizontal por `created_by`/posse (padrão WR-03/WR-04). Aplica a `analise_candidato_vaga`, `comparativo_solicitado`, o caminho de `reprocessar`, e a base-table `candidaturas`.
- **SEC-03 n8n webhook:** mover o trigger **server-side** — a EF segura a URL (via Vault/env server-side); o **bundle público NUNCA contém a URL**. Resolver por substituição via EF, não patch no client.
- **SEC-09 `supabase_auth_admin` policy sobre `usuarios_rh`:** declarar a policy execute_sql-only atual num **migration file** (mirror da policy viva, zero mudança de comportamento). NÃO re-migrar se já existe; só declará-la.

**Backup PII, logs, itens O6 (SEC-10/11, UX-08)**
- **SEC-10 backup PII:** **DROP** `backup_m2.candidaturas_pre_funil`. Migration de drop via MCP.
- **SEC-11 console.log RH:** remover `console.log` operacional das páginas RH + grep guard (padrão FX-14).
- **UX-08 itens O6 políticos:** **desativar/excluir os 4 itens O6 políticos da administração** **E ajustar o scorer** (`bigfive-scoring.ts`) para dropar/renormalizar a faceta O6 de modo que o instrumento NÃO quebre (o scorer lança se ≠120 itens). Replacement autoral (4 itens O6 não-políticos) → **M5/psicólogo**. M4 só remove a exposição sensível sem quebrar o cálculo.

### Claude's Discretion
- Nome/assinatura exata das RPCs SECURITY DEFINER novas + colunas do allowlist.
- Forma exata do scorer O6-adjust (dropar a faceta do domínio O vs renormalizar O sobre 5 facetas) — preservar a norma Johnson já wired.
- Onde a URL n8n vive server-side (Vault secret vs env da EF).
- Quais páginas RH têm console.log (grep no plan).

### Deferred Ideas (OUT OF SCOPE)
- Replacement autoral dos 4 itens O6 (não-políticos) → M5/psicólogo. UX-08 no M4 só remove exposição + ajusta scorer.
- Seed CC0 cognitivo real → M5 (SEC-01 só blinda o gabarito).
- A14/A37 (gestão usuários RH + perfil RH reais) → M5.
- Correção do funil RH/candidato (P25/26), migrations reconstruindo o banco (P27). SEC-01 é pré-requisito do seed CC0 diferido ao M5.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Gabarito cognitivo (`cognitivo_itens.gabarito_idx`) deixa de ser legível por qualquer autenticado — column REVOKE / RPC SECURITY DEFINER `(A1, CRIT)` | Table+column confirmed (`20260624000001:105-116`); mechanism §1 (REVOKE valid — no authenticated client reads gabarito); RPC mirrors `get_bigfive_itens`/`get_opcoes_sjt`; client rewire `cognitivoService.listItens:156` |
| SEC-02 | Candidato não lê veredito IA da própria redação `(A7, HIGH)` | `redacoes_candidato` verdict cols confirmed (`20260623100003:64-83`); **column REVOKE INVALID here** (RH shares `authenticated` role) → candidate-DENY base + DEFINER RPC (§1, Pitfall 1) |
| SEC-03 | URLs webhook n8n fora do bundle público `(A11, HIGH)` | 3 hardcoded URLs: `candidaturasService.ts:70-71,82-83`, `explicacaoService.ts:129-130`; **VITE_ vars ARE bundled** (Pitfall 5); server-side pg_net+Vault pattern (`reprocessar_analise`) |
| SEC-04 | `gerar-devolutiva-bigfive` autentica-E-autoriza `(A19≡A25, HIGH)` | Handler `index.ts:571-713` has ZERO auth; server-to-server only (no `src/` caller); mirror `cost-alerter:90-113` Bearer self-auth (§4) |
| SEC-05 | SELECT policies `analise_candidato_vaga`/`comparativo_solicitado` vaga-scoped `(A20, HIGH)` | Current role-only (`20260610000001:78-89`); WR-04 pattern (`20260625000001:294-327`) |
| SEC-06 | Scoping horizontal por vaga em `analise_candidato_vaga` + caminho reprocessar `(A30, MEDI)` | `reprocessar_analise` ALREADY vaga-scoped (`20260610000003:50-59`) — regression-guard only; +`redacoes_candidato` RH policies role-only (A30/M15, §5) |
| SEC-07 | Service candidate-facing não seleciona `rubric` `(A40, MEDI)` | `avaliacaoService.ts:136` selects rubric; ONLY candidate reads it (grep) → allowlist drop + safe column REVOKE (§1) |
| SEC-08 | RH policies base-table `candidaturas` vaga-scoped `(A42, MEDI)` | `rh_le_candidaturas`+`rh_avanca_etapa` role-only (`20260607000006:45-58`); latent (no `role='rh'` accounts yet) |
| SEC-09 | Policy `auth_admin_le_usuarios_rh` declarada em migration `(A43, MEDI)` | Exact live def captured from memory (§6); GRANTs in `20260420000002:100-102`, policy execute_sql-only drift |
| SEC-10 | `backup_m2.candidaturas_pre_funil` coberto/removido `(A49, LOW/LGPD)` | DROP TABLE+SCHEMA; PII snapshot from 2026-06-07 cutover; live existence must be MCP-verified |
| SEC-11 | `console.log` operacional removido das páginas RH `(A54, LOW)` | Enumerated §7: `ConfiguracoesPage`(5), `MeuPerfilPage`(3), `VagasRHPage`(3 — `console.error`) |
| UX-08 | Remoção dos 4 itens políticos O6 do Big Five + scorer não quebra `(QW7)` | Items {28,58,88,118}=faceta 28=O6 confirmed; **6-layer lockstep count invariant + O prorate** (§8, HIGHEST RISK) |
</phase_requirements>

## Summary

Phase 24 closes eleven confirmed PII/answer-key/IDOR leaks plus one psychometric-LGPD exposure (the 4 political O6 Big Five items). Every leak is an instance of the same root cause documented across M2: **RLS is row-level only — it never hides a column**. A candidate JWT with `?select=secret_column` reads any column the row-SELECT policy admits; a service_role Edge Function that authenticates a JWT but never authorizes it hands a candidate another candidate's PII.

The **central mechanism finding** governs the whole phase: RH and candidate share ONE Postgres role — `authenticated`. Column-level `GRANT/REVOKE` operates on that role, NOT on the app-level `app_metadata.role` claim. Therefore a column REVOKE from `authenticated` is only valid for a column that **no authenticated client legitimately reads via the API** (only a SECURITY DEFINER function or service_role reads it). This makes the three "column-level" requirements structurally different: SEC-01 (gabarito) and SEC-07 (rubric) can use column REVOKE because only the DEFINER RPC / EF reads them; **SEC-02 (redação verdict) cannot** — RH legitimately reads the verdict as `authenticated`, so a REVOKE would break RH. SEC-02's real fix is candidate-DENY the base-table row-SELECT + a DEFINER RPC for the candidate's safe own-row read (the answer-key pattern applied to the verdict). This is the single most important thing the planner must not get wrong.

**Primary recommendation:** Build every fix on the two established M2 precedents — `get_bigfive_itens`/`get_opcoes_sjt` (SECURITY DEFINER answer-key readers, projected columns only) and WR-03/WR-04 (`20260625100002` / `20260625000001` vaga-ownership-scoped SELECT policies). Apply migrations to PROD via Supabase MCP `apply_migration` (bypasses 42601; writes the version row). Redeploy the two touched EFs. Sequence UX-08 last and treat it as a distributed 6-file count invariant, not a "delete 4 rows" task.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Answer-key / verdict column secrecy (SEC-01/02/07) | Database (RLS + column GRANT + DEFINER RPC) | Client (allowlist projection = defense-in-depth, NOT the boundary) | Postgres is the only tier that can bind PostgREST; the client allowlist does not stop `?select=col` |
| Horizontal (per-vaga) access control (SEC-05/06/08) | Database (RLS policy predicate) | API/EF (RPC ownership guard — already done for reprocessar) | RLS predicate is the enforcement point; role-only policies leak across recruiters |
| Privileged EF caller authz (SEC-04) | API/Edge Function (Bearer self-auth) | — | service_role bypasses RLS; the handler must gate itself |
| Secret URL custody (SEC-03) | Database trigger (pg_net) + Vault OR EF env | — | Any client-tier URL (incl. `VITE_` env) ships in the public bundle |
| Auth-hook policy declaration (SEC-09) | Database (migration file) | — | Removes execute_sql-only drift; consumed by `custom_access_token_hook` |
| PII backup erasure (SEC-10) | Database (DROP) | — | LGPD erasure completeness |
| Operational log hygiene (SEC-11) | Client (RH pages) | — | `console.log` in browser DevTools |
| Psychometric scorer integrity (UX-08) | Shared scorer (`_shared/bigfive-scoring.ts`) + Database (item bank) + EF (validateBody) + Client (schema/UI) | — | The 116-item count is a cross-tier invariant that must move in lockstep |

## Standard Stack

No new libraries. This phase uses the existing stack exclusively.

| Component | What | Where |
|-----------|------|-------|
| Supabase RLS / column GRANT / SECURITY DEFINER RPC | PII/answer-key boundary | `supabase/migrations/*` |
| `pg_net` + `vault.decrypted_secrets` | server-side webhook dispatch | precedent `20260610000003_reprocessar_rpc.sql` |
| Deno Edge Functions (static `npm:` imports) | privileged AI/notification handlers | `supabase/functions/*` |
| zod (Deno + client twin) | body validation | existing `_shared/*-schemas.ts` + `src/features/avaliacao/schemas/*` |
| Supabase MCP `apply_migration` / `execute_sql` | PROD DDL (bypasses 42601) | orchestrator/executor |
| Supabase CLI `functions deploy` | EF redeploy (bundle-freeze) | orchestrator |

## Package Legitimacy Audit

**Not applicable.** Phase 24 installs **zero** new packages. All changes are SQL migrations, edits to existing Deno Edge Functions, and edits to existing client services/schemas using dependencies already pinned in `package.json` / `supabase/functions/deno.lock` (locked in Phase 22 CI-09/CI-11). No `npm install` / `pip install` / dependency addition occurs. The Package Legitimacy Gate is therefore vacuously satisfied.

## Architecture Patterns

### The three column-secrecy mechanisms (the crux — read this first)

Postgres roles in Supabase: every logged-in browser (candidate OR RH) is the `authenticated` role; anon is `anon`; EFs with the service key are `service_role` (BYPASSRLS). The `app_metadata.role` claim (`candidato`/`rh`/`administrador`) lives **inside RLS policy predicates**, NOT in the role system. Consequence:

| Requirement | Column(s) | Does any `authenticated` client legitimately read it via API? | Correct mechanism |
|-------------|-----------|---------------------------------------------------------------|-------------------|
| **SEC-01** gabarito | `cognitivo_itens.gabarito_idx` | **No** — only `pontuar_cognitivo` (DEFINER) reads it; no RH client reads it (grep clean) | Column REVOKE FROM `authenticated,anon` ✅ + candidate-DENY base row-SELECT + new DEFINER RPC `get_cognitivo_itens()` |
| **SEC-02** verdict | `redacoes_candidato.{analise_ia, scores_dimensao, score_ponderado_0_100, classificacao_cor, red_flag_etico, flags, referencia_match, scores_humanos, notas_revisor, decisao_revisor}` | **Yes** — RH reads them as `authenticated` (`revisaoRedacaoService.ts:138,165`) | ❌ Column REVOKE breaks RH → candidate-DENY the base row-SELECT policy + DEFINER RPC for the candidate's safe own-row read |
| **SEC-07** rubric | `perguntas.rubric` | **No** — only `avaliar-redacao` EF (service_role) + the candidate service being fixed; no RH client reads it (grep clean) | Client allowlist drop ✅ + column REVOKE FROM `authenticated,anon` (candidate still needs OTHER `perguntas` columns → keep the row policy, drop only the column) |

**Pattern: SECURITY DEFINER answer-key reader** (mirror `get_bigfive_itens` `20260612000001:200-212` and `get_opcoes_sjt` `20260611000002:107-130`):
```sql
-- SEC-01 — the candidate reads items with NO answer key
CREATE OR REPLACE FUNCTION public.get_cognitivo_itens()
RETURNS TABLE (id uuid, secao text, enunciado text, alternativas jsonb, ordem int)
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT c.id, c.secao, c.enunciado, c.alternativas, c.ordem
    FROM public.cognitivo_itens c
   ORDER BY c.ordem;
$$;
REVOKE ALL ON FUNCTION public.get_cognitivo_itens() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cognitivo_itens() TO authenticated;

-- defense-in-depth: bind PostgREST even if a future policy re-grants the row
REVOKE SELECT (gabarito_idx) ON public.cognitivo_itens FROM authenticated, anon;

-- candidate-DENY the base row (mirror bigfive_itens): drop the broad authenticated SELECT
DROP POLICY IF EXISTS auth_le_cognitivo_itens ON public.cognitivo_itens;
```
Then rewire `cognitivoService.listItens` (`src/features/avaliacao-cognitiva/services/cognitivoService.ts:154-179`) from `.from('cognitivo_itens').select(COGNITIVO_ITENS_ALLOWLIST)` → `.rpc('get_cognitivo_itens')`. The existing `COGNITIVO_ITENS_ALLOWLIST` regression tests (`prova-cognitiva.test.tsx:128-155`) stay valid as a second guard.

**Pattern: candidate-DENY verdict + safe own-row RPC** (SEC-02):
```sql
-- The candidate own-row read of the verdict must NOT be a base-table SELECT.
DROP POLICY IF EXISTS redacao_candidato_select ON public.redacoes_candidato;  -- was full own-row

CREATE OR REPLACE FUNCTION public.get_minha_redacao(p_candidatura_id uuid)
RETURNS TABLE (id uuid, pergunta_id uuid, ordem smallint, texto text,
               word_count int, submetida_em timestamptz, status_analise text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
    SELECT r.id, r.pergunta_id, r.ordem, r.texto, r.word_count, r.submetida_em,
           r.status_analise                    -- NEVER a verdict column
      FROM public.redacoes_candidato r
      JOIN public.candidaturas c ON c.id = r.candidatura_id
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE r.candidatura_id = p_candidatura_id
       AND ca.user_id = auth.uid();            -- own-row enforced inside the DEFINER
END;
$$;
REVOKE ALL ON FUNCTION public.get_minha_redacao(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_minha_redacao(uuid) TO authenticated;
```
Client rewire: `redacaoService.ts:180-181,220-221` `.from('redacoes_candidato').select(REDACAO_CANDIDATO_ALLOWLIST)` → `.rpc('get_minha_redacao', { p_candidatura_id })`. The existing `MinhaRedacaoRow` interface (`redacaoService.ts:88-96`) already names exactly the safe columns — reuse it. `redacao_rh_select` / `redacao_rh_update` / `redacao_no_client_insert` stay intact.
> **Discretion call for the planner:** `status_analise` has values `pendente/processando/concluida/falhou/pendente_humano`; `bloqueio_avanco=true` means "vermelho — revisão obrigatória". Do NOT project `bloqueio_avanco`, and consider coarsening `status_analise` to a neutral candidate-facing value so "pendente_humano" does not leak "you got a red flag". The current client allowlist already excludes `bloqueio_avanco`; keep it excluded from the RPC.

**Pattern: vaga-ownership-scoped RH SELECT** (SEC-05/06/08 — verbatim WR-04, `20260625000001:294-327`):
```sql
DROP POLICY IF EXISTS rh_le_analise ON public.analise_candidato_vaga;
CREATE POLICY rh_le_analise ON public.analise_candidato_vaga
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ( (select auth.jwt() #>> '{app_metadata,role}') = 'rh'
         AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid())) )
  );
```
`analise_candidato_vaga` and `comparativo_solicitado` both carry a `vaga_id` column directly → scope on `vaga_id IN (owned vagas)` (no candidaturas join needed). `candidaturas` (SEC-08) also has `vaga_id` directly → scope both `rh_le_candidaturas` (SELECT) and `rh_avanca_etapa` (UPDATE, USING+WITH CHECK). `candidato_le_propria_candidatura` stays untouched.

**Pattern: privileged EF Bearer self-auth** (SEC-04 — mirror `cost-alerter/index.ts:90-113`):
```ts
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const authHeader = req.headers.get("Authorization") ?? "";
const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
const expected = Deno.env.get("DEVOLUTIVA_INVOKE_SECRET") ?? SERVICE_KEY;
if (!bearer || bearer !== expected) {
  return new Response(JSON.stringify({ error: "Não autorizado." }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
```
Insert this at the TOP of the `Deno.serve` handler in `gerar-devolutiva-bigfive/index.ts` (after the OPTIONS/method guard `~line 573`, before parsing `score_id` at `line 701`).

### System Architecture Diagram (the leak surface)
```
                          ┌─────────────────────────── ATTACK PATHS THIS PHASE CLOSES ───────────────────────────┐
  candidate JWT ──►  PostgREST  ──?select=gabarito_idx────► cognitivo_itens ..... SEC-01 (col REVOKE + DENY row + RPC)
  candidate JWT ──►  PostgREST  ──?select=red_flag_etico─► redacoes_candidato ... SEC-02 (DENY row + DEFINER RPC; NOT col REVOKE)
  candidate JWT ──►  PostgREST  ──?select=rubric─────────► perguntas ........... SEC-07 (allowlist drop + col REVOKE)
  recruiter-not-owner JWT ─► PostgREST ─► analise/comparativo/candidaturas/redacao ... SEC-05/06/08 (role-only → vaga-scoped)
  any authed JWT ─► POST /functions/v1/gerar-devolutiva-bigfive {score_id} ─► service_role read ... SEC-04 (Bearer self-auth)
  public browser ─► bundle.js contains n8n URL (incl VITE_ vars) ............... SEC-03 (server-side pg_net + Vault)
  DB rebuild ─► login RH degrades to 'candidato' (policy only in PROD) ......... SEC-09 (declare in migration)
  LGPD erasure ─► public.candidaturas cleared, backup_m2 copy survives ......... SEC-10 (DROP)
  candidate ─► reads O6 political opinion items in the Big Five ................ UX-08 (deactivate + scorer prorate)
```
Enforcement tier for each arrow is the Database (RLS/GRANT/RPC) or the EF handler — never the client allowlist alone.

### Recommended change structure (waves)
```
Wave A  DB column-secrecy (candidate-facing)      SEC-01, SEC-02, SEC-07  → migrations + client rewires
Wave B  DB horizontal scoping                     SEC-05, SEC-06, SEC-08  → policy migrations (regression-guard reprocessar)
Wave C  EF + infra                                SEC-04 (redeploy), SEC-03 (server-side dispatch)
Wave D  Declarations + hygiene                    SEC-09 (migration), SEC-10 (drop), SEC-11 (client)
Wave E  Psychometric (isolate — highest risk)     UX-08  → DB + scorer + EF redeploy + client + golden test, in lockstep
```

### Anti-Patterns to Avoid
- **Client allowlist as the security boundary.** The existing `COGNITIVO_ITENS_ALLOWLIST` / `REDACAO_CANDIDATO_ALLOWLIST` do NOT bind PostgREST. They are defense-in-depth; the DB migration is the boundary.
- **Column REVOKE on a column RH legitimately reads.** Breaks RH silently (SEC-02). See Pitfall 1.
- **Trusting `VITE_` env vars to hide a URL.** They are inlined into the public bundle at build. See Pitfall 5.
- **Deleting the 4 O6 items without touching all 6 count-guards + the norm.** Silent score corruption or 500s. See Pitfall 3.
- **Reading role from `getUser().app_metadata` inside the EF.** It is always `undefined` (the hook injects role only into the signed JWT, not `raw_app_meta_data`). For SEC-04 use Bearer self-auth (server-to-server), not a role read.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Candidate-safe answer-key read | Ad-hoc view / client filter | `get_bigfive_itens`/`get_opcoes_sjt` DEFINER-RPC pattern | Proven, projects columns only, randomization option, bypasses RLS safely |
| Per-vaga RH access control | New predicate from scratch | Verbatim WR-04 predicate (`20260625000001:294-327`) | Handles admin bypass + `(select auth.…)` planner-cache idiom; already ships in 4 tables |
| EF caller authz | New JWT-decode + role derivation | `cost-alerter` Bearer self-auth (`:90-113`) | The EF is server-to-server only; simplest correct guard closes the IDOR completely |
| Server-side webhook dispatch | New EF from scratch (M4) | `pg_net.http_post` + `vault.decrypted_secrets` (`reprocessar_analise:63-82`) | Full notification EF is M5; M4 only needs the URL out of the bundle |
| Auth-admin policy | Invent a new predicate | Copy the live one verbatim (§6) | Decision: mirror, zero behavior change |
| Big Five norm re-derivation | Re-compute Johnson norms for 5 facets | **Prorate** the O raw × 6/5 onto the wired 24-item norm | Norm.py provides only 6-facet domain norms; prorating preserves them exactly |

**Key insight:** Every fix in this phase already has a shipped precedent in this same repo. The work is applying the right precedent to the right table — the failure mode is applying the *column REVOKE* precedent where the *candidate-DENY + RPC* precedent is required (SEC-02).

## Runtime State Inventory

> Rename/migration-adjacent (SEC-10 drop, SEC-09 declaration, UX-08 item deactivation touch live PROD state).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `backup_m2.candidaturas_pre_funil` — full PII snapshot (curriculo_url, feedback_rejeicao, timestamps) from the 2026-06-07 enum cutover; NOT reachable by LGPD erasure (`data_deletion_log` `20260609000001` does not cover schema `backup_m2`) | **Data migration:** `DROP TABLE backup_m2.candidaturas_pre_funil; DROP SCHEMA backup_m2 CASCADE;` (SEC-10). Live existence + column list MUST be MCP-verified first. |
| Stored data | `bigfive_itens` live rows = 120 (seeded `20260612000001:72-192`). UX-08 removes items {28,58,88,118} | **Data migration:** deactivate/delete 4 rows in PROD (via MCP). `cognitivo_itens` is EMPTY today (CC0 seed deferred) → SEC-01 gabarito leak is LATENT but must be closed before the M5 seed. |
| Live service config | Auth Hook `custom_access_token_hook` enabled in GoTrue dashboard (memory: confirmed enabled 2026-06-26). SEC-09 only declares the DB policy it depends on — does NOT touch the GoTrue enablement | **None** for GoTrue; SEC-09 is a DB migration only. |
| Live service config | n8n workflows at `fernandocosta.app.n8n.cloud/webhook/{nova-candidatura,status-candidatura,revisao-decisao}` (personal account) | **None** on n8n side; SEC-03 moves the CALLER server-side + hides the URL. Workflows keep receiving events. |
| Secrets/env vars | Vault secrets `project_url` + `edge_invoke_key` (read only in SECURITY DEFINER context — not visible to the MCP role, per memory; NOT evidence of absence). SEC-03 needs an n8n URL secret; SEC-04 may use a new `DEVOLUTIVA_INVOKE_SECRET` (optional — service_role key works) | **Add:** an n8n URL Vault secret (or reuse EF env) for SEC-03; optionally `DEVOLUTIVA_INVOKE_SECRET` for SEC-04. |
| RLS/policy drift | `auth_admin_le_usuarios_rh` policy + `GRANT SELECT ... TO supabase_auth_admin` exist in PROD via execute_sql ONLY (no migration file). Migration-version-row drift (MCP `apply_migration` writes timestamp versions ≠ filenames) is a known open item (deferred to DBMIG-01/Phase 27) | **Declare** the policy in a migration (SEC-09). Do NOT re-apply if present (idempotent DDL). Version-row reconcile is Phase 27, not here. |
| Build artifacts | Client bundle currently contains the 3 n8n URLs (confirmed in PROD bundle per audit A11) | **Rebuild** frontend after SEC-03 removes the URL constants + `VITE_N8N_*` reads. |

**Nothing found in category "OS-registered state":** None — no Task Scheduler / launchd / pm2 state references the changed identifiers.

## Common Pitfalls

### Pitfall 1: Column REVOKE on a column RH reads as `authenticated` (SEC-02) — HIGH
**What goes wrong:** Applying `REVOKE SELECT (red_flag_etico, notas_revisor, …) ON redacoes_candidato FROM authenticated` to protect the candidate ALSO revokes it from RH — RH and candidate are the SAME Postgres role (`authenticated`). Every RH verdict read (`revisaoRedacaoService.ts:138,165`) breaks.
**Why it happens:** The `app_metadata.role` distinction is an RLS-predicate concept, not a Postgres role; column privileges are role-level only.
**How to avoid:** For SEC-02 do NOT column-REVOKE. Drop the candidate's broad `redacao_candidato_select` policy and route the candidate own-row read through a DEFINER RPC that projects only safe columns (pattern §Architecture). Keep `redacao_rh_select` intact. (SEC-01/SEC-07 differ — there NO authenticated client reads the secret, so REVOKE is valid there.)
**Warning signs:** RH review panel suddenly shows null/empty verdicts; a `permission denied for column` in RH network traces.

### Pitfall 2: The candidate-DENY drop breaks the candidate's legitimate own-row read (SEC-01/SEC-02) — MEDIUM
**What goes wrong:** Dropping `auth_le_cognitivo_itens` (SEC-01) or `redacao_candidato_select` (SEC-02) without rewiring the client leaves the candidate's prova/redação screens with zero rows (the direct `.from().select()` now returns nothing).
**Why it happens:** The client currently reads these tables directly; removing the row policy removes the client's access.
**How to avoid:** The migration and the client rewire (`cognitivoService.listItens:156` → RPC; `redacaoService.ts:180,220` → RPC) MUST land together in the same plan/wave. Add a Deno/Vitest assertion that the service calls the RPC, not `.from()`.
**Warning signs:** Prova cognitiva empty; "minha redação" panel blank after apply.

### Pitfall 3: UX-08 count invariant is distributed across 6 files — HIGHEST RISK
**What goes wrong:** Removing items {28,58,88,118} makes the answer set 116 items AND **non-contiguous** (gaps at 28/58/88/118). Every `for id = 1..120 { require rec[id] }` loop breaks on the gaps; every `length !== 120` guard rejects a correct 116-item submission; the O-domain raw drops 4 items and its Johnson percentile silently skews low; the golden test asserts 55 reversed / 120 items.
**Why it happens:** The 120 constant is duplicated in `bigfive-scoring.ts:237`, `submit-bigfive-final:97,99`, `bigfiveSchema.ts:30,62,72`, `BigFiveQuestionnaireScreen.tsx:267,280`, and `bigfive-scoring.test.ts`. The submit + client loops assume contiguity.
**How to avoid:** Drive the count/coverage from the ACTIVE id set, not a literal range. Server (submit-bigfive-final + scorer): validate `respostas` keys === active-id set (fetch active ids from the bank, or a shared `EXCLUDED_ITEM_IDS = {28,58,88,118}` constant + count 116). Client: `isAllAnswered` = "all loaded items answered" (items come from `get_bigfive_itens`, which returns 116). Prorate the O domain (see §8). Update the golden test (116 items, 53 reversed, O reversed 10). Redeploy `submit-bigfive-final` (bundles `_shared/bigfive-scoring.ts` — bundle-freeze). Land all six in ONE wave.
**Warning signs:** Every Big Five submit returns 400 in PROD; O percentiles cluster low; `deno test` red on the golden count asserts.

### Pitfall 4: EF role read from `getUser()` is always undefined (SEC-04) — MEDIUM
**What goes wrong:** Adding "authorize by role" via `user.app_metadata?.role` from `getUser()` returns `undefined` → 403 for everyone (or a false pass). The hook injects role only into the signed JWT, never into `raw_app_meta_data`.
**Why it happens:** Documented in `reference_ef_authenticate_vs_authorize` — the exact bug that 403'd all RH in Phase 10.
**How to avoid:** `gerar-devolutiva-bigfive` is server-to-server only (no `src/` caller — grep empty). Use Bearer self-auth (compare to `SUPABASE_SERVICE_ROLE_KEY`/`DEVOLUTIVA_INVOKE_SECRET`), NOT a role read. This satisfies the SEC-04 intent (close the IDOR) without the role-derivation landmine.
**Warning signs:** Devolutiva generation 401s for the legitimate `submit-bigfive-final` invoker, or accepts a candidate JWT.

### Pitfall 5: `VITE_` env vars are NOT secret (SEC-03) — MEDIUM
**What goes wrong:** The code comments (`candidaturasService.ts:60`, `explicacaoService.ts:123`) claim reading the URL from `VITE_N8N_*` is the safe pattern. Every `VITE_`-prefixed var is inlined into the client bundle at build → the URL ships publicly even with the hardcoded fallback removed.
**Why it happens:** Vite exposes only `VITE_`-prefixed vars to client code precisely because they are public; teams misread this as "configurable = private".
**How to avoid:** Move the dispatch server-side (pg_net trigger reading a Vault secret, mirroring `reprocessar_analise`), delete the `VITE_N8N_*` reads AND the hardcoded fallbacks AND the client `fetch()` dispatch. Add a build-artifact grep guard (`grep -r 'n8n.cloud\|fernandocosta' build/` → 0).
**Warning signs:** `n8n.cloud` still greppable in `build/assets/*.js` after the fix.

### Pitfall 6: Tightening `candidaturas`/`analise` SELECT surprises an "all candidates" RH view (SEC-05/08) — LOW (latent)
**What goes wrong:** After vaga-scoping, a non-owner recruiter sees only their own vagas' candidates. Any RH page that assumed "see all" (`listAllCandidaturas`) shows a narrower set.
**Why it happens:** Today only `administrador` accounts exist (no `role='rh'` — audit), so the gap and its fix are both latent; admins bypass. It becomes visible the moment a `recrutador` account exists.
**How to avoid:** This is the intended behavior (horizontal isolation). Note it for Phase 25 (funil RH). Ensure test-vaga `created_by` is set (a NULL owner → RH 403, per `reference_ef_authenticate_vs_authorize`).
**Warning signs:** A recruiter reports "missing candidates" — that is correct scoping, not a bug.

### Pitfall 7: 42601 on PL/pgSQL migrations via `db push` — LOW (known, mitigated)
**What goes wrong:** Migrations with `$$` bodies + adjacent GRANT/REVOKE trip `SQLSTATE 42601` in the transaction pooler.
**How to avoid:** Apply PROD migrations via Supabase MCP `apply_migration` (writes the version row, bypasses 42601) — the established M2–M3 path. No outer `BEGIN;…COMMIT;` wrapper (CLAUDE.md §Commands / D-22).
**Warning signs:** "cannot insert multiple commands into a prepared statement".

## Code Examples

### SEC-05/06/08 — the three vaga-scoped policies (verbatim WR-04)
```sql
-- analise_candidato_vaga (SEC-05) — vaga_id column exists directly
DROP POLICY IF EXISTS rh_le_analise ON public.analise_candidato_vaga;
CREATE POLICY rh_le_analise ON public.analise_candidato_vaga FOR SELECT USING (
  (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
  OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
      AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid()))));

-- comparativo_solicitado (SEC-05) — vaga_id column exists directly
DROP POLICY IF EXISTS rh_le_comparativo ON public.comparativo_solicitado;
CREATE POLICY rh_le_comparativo ON public.comparativo_solicitado FOR SELECT USING (
  (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
  OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
      AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid()))));

-- candidaturas base table (SEC-08) — SELECT + UPDATE; vaga_id column exists directly
DROP POLICY IF EXISTS rh_le_candidaturas ON public.candidaturas;
CREATE POLICY rh_le_candidaturas ON public.candidaturas FOR SELECT USING (
  (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
  OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
      AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid()))));

DROP POLICY IF EXISTS rh_avanca_etapa ON public.candidaturas;
CREATE POLICY rh_avanca_etapa ON public.candidaturas FOR UPDATE
  USING (   (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
         OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
             AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid()))))
  WITH CHECK ((select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
         OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
             AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid()))));
-- candidato_le_propria_candidatura stays untouched.
```
**Adjacent tables the audit (A30/M15/H6) flags with the SAME role-only gap — planner should include in the SEC-06 sweep or explicitly defer:** `redacoes_candidato` (`redacao_rh_select` + `redacao_rh_update`, `20260623100003:125,132` — CONFIRMED role-only), `devolutivas_candidato` (`rh_le_devolutivas`, `20260612000002:57`), `historico_candidatura` (`rh_le_historico`, `20260607000006:74`). `scores_candidato`, `entrevista_analises`, `entrevista_guias`, `decisao_final` are ALREADY WR-04-scoped (Phase 14/15) — do not re-scope; regression-guard only.

### SEC-09 — declare the auth-admin policy (exact live definition)
```sql
-- Mirror of the live execute_sql-only policy (from reference_auth_hook_rls_gap). Idempotent.
GRANT SELECT ON public.usuarios_rh TO supabase_auth_admin;   -- already in 20260420000002; harmless repeat
DROP POLICY IF EXISTS auth_admin_le_usuarios_rh ON public.usuarios_rh;
CREATE POLICY auth_admin_le_usuarios_rh ON public.usuarios_rh
  AS PERMISSIVE FOR SELECT TO supabase_auth_admin USING (true);
```
> Executor MUST first `SELECT policyname, qual, roles FROM pg_policies WHERE tablename='usuarios_rh'` via MCP and confirm the migration matches the live policy byte-for-behavior before applying (the memory says the live chain is correct — "NÃO re-migrar"). The migration exists to end the drift, not to change behavior.

### SEC-04 — the guard's exact insertion point
`gerar-devolutiva-bigfive/index.ts`: `Deno.serve` starts ~L571; OPTIONS/method guard L572-578; env read L581-589; the Bearer self-auth block goes immediately after env read and BEFORE the `score_id` parse at L699-708. Redeploy with `supabase functions deploy gerar-devolutiva-bigfive` (default `verify_jwt=true` is fine — the Bearer check is the real control). Add the config to `supabase/config.toml` (CI-13 territory, but declare `verify_jwt` here if touched).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side column allowlist as "protection" | DB DEFINER-RPC + column GRANT as the boundary; allowlist = defense-in-depth | M2 Phase 8/11/12 | SEC-01/02/07 must land the DB layer, not just the client |
| Role-only RH RLS (`role IN ('rh','administrador')`) | Vaga-ownership-scoped (`created_by = auth.uid()`, admin bypass) | M2 Phase 14/15 (WR-03/WR-04) | SEC-05/06/08 = re-emit with the WR-04 predicate |
| EF authenticates JWT then reads via service_role | EF also authorizes (Bearer self-auth OR role+posse) | M2 Phase 10 (C1) | SEC-04 = Bearer self-auth (server-to-server) |
| n8n URL in `VITE_` env / client fetch | server-side pg_net + Vault dispatch | this phase (SEC-03) | URL leaves the public bundle |

**Deprecated/outdated:** the comment in `cognitivo_itens` migration (`20260624000001:100-116`) claiming "READ-layer column-omission (the 14-06 allowlist)" is exactly the false-security this phase corrects — the allowlist never bound PostgREST (audit C1). The comments in `candidaturasService.ts:60` / `explicacaoService.ts:123` claiming `VITE_N8N_*` is the safe pattern are wrong (Pitfall 5).

## §Detailed anchors per requirement

**§1 SEC-01/02/07 (column secrecy)** — table §Architecture. Files: `cognitivo_itens` (`20260624000001:105-166`, gabarito_idx L111, policy L162-165); `redacoes_candidato` (`20260623100003:49-135`, verdict cols L64-83, candidate policy L107-115, RH policies L124-135); `perguntas.rubric` (`20260611000002:50`, candidate policy `cand_le_perguntas_ativas` L69-72). Client: `cognitivoService.ts:59,156`; `redacaoService.ts:88-96,180,220`; `avaliacaoService.ts:58,136`. RH verdict reader (must keep working): `revisaoRedacaoService.ts:88(RH allowlist),138,165`.

**§4 SEC-04** — `gerar-devolutiva-bigfive/index.ts` handler L571-720; NO auth (confirmed: `score_id` parsed raw L699-708, straight into `handler`). Only caller is `submit-bigfive-final/index.ts:232-239` via service_role (+ non-existent n8n retry). Mirror `cost-alerter/index.ts:90-113`.

**§5 SEC-05/06** — `analise_candidato_vaga`/`comparativo_solicitado` role-only policies `20260610000001:78-89`. **`reprocessar_analise` `20260610000003:50-59` is ALREADY vaga-scoped (role+ownership) — SEC-06's "reprocessar path" is a REGRESSION-GUARD, not a change.** WR-04 template `20260625000001:294-327` / `20260625100002:53-66`.

**§6 SEC-09** — see Code Examples. GRANTs already in `20260420000002:100-102`.

**§7 SEC-11 console.log inventory** (RH pages):
| File | Lines | Nature |
|------|-------|--------|
| `ConfiguracoesPage.tsx` | 418, 437, 474, 491, 1255 | `console.log` of company data, webhook config, permissions, **candidate email** (L491 reset), template preview |
| `MeuPerfilPage.tsx` | 39, 47, 52 | `console.log` of personal data / password-change / photo (stubs — M5, but strip the logs) |
| `VagasRHPage.tsx` | 90, 136, 158 | `console.error` in vaga mutations (keep? gate behind `import.meta.env.DEV`) |
| `CriarEditarVagaPage.tsx` | 1 occurrence | verify in plan |

Recommended: strip operational `console.log` on RH mutation paths (esp. `ConfiguracoesPage:491` candidate email) or replace with a `import.meta.env.DEV`-gated no-op logger (FX-14 pattern). Add a grep guard over `src/components/pages/*` for `console.log` on candidate-PII strings.

**§8 UX-08 (the scorer)** — items to deactivate = **{28, 58, 88, 118}** = faceta 28 = O6 "Liberalism/Values" (abertura a valores): "Tendo a votar em candidatos progressistas" (28), "Acredito que certo e errado são relativos" (58), "Tende a votar em políticos conservadores" (88), "Acredito que precisamos ser rígidos com o crime" (118). Verified: `((id-1) % 30) + 1 = 28` ⇔ `id ∈ {28,58,88,118}`; all `dimensao='O'` in the seed (`20260612000001:100,130,160,190`).

Recommended DB approach — **add an `ativo` flag** (reversible; M5 re-add flips it back), not a hard DELETE:
```sql
ALTER TABLE public.bigfive_itens ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
UPDATE public.bigfive_itens SET ativo = false WHERE item_id IN (28,58,88,118);  -- O6 political
-- get_bigfive_itens filters ativo:
CREATE OR REPLACE FUNCTION public.get_bigfive_itens()
RETURNS TABLE (item_id int, texto text, ordem int)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT b.item_id, b.texto, b.ordem FROM public.bigfive_itens b WHERE b.ativo ORDER BY b.ordem;
$$;
```

Scorer (`_shared/bigfive-scoring.ts`) changes — **preserve the wired Johnson norm via O-prorate**:
1. Count guard L237: `120` → `116` (or derive from the response length dynamically).
2. `REVERSED` set L34-45: remove `88` and `118` (the two reversed O6 ids). O reversed 12→10; total 55→53.
3. Domain sum: facet 28 (`facetRaw[28]`) is now 0 → O raw is summed over 5 facets (20 items, range 20-100). **Prorate O onto the 24-item scale so the Johnson O norm (mean~87/sd~12, calibrated on 6 facets) stays valid:**
   ```ts
   const O_ACTIVE_FACETS = 5, O_FULL_FACETS = 6;
   domainRaw.O = Math.round(domainRaw.O * O_FULL_FACETS / O_ACTIVE_FACETS); // ×6/5 = ×1.2
   ```
   This is the standard "prorated scale score" (assumes the missing facet ≈ domain mean) and is an explicit V1 stopgap until M5 restores a real O6 facet. Only O is prorated; N/E/A/C are untouched (24 items each).
4. `facetas` output L272-275: exclude faceta 28 (or leave raw 0 — but the devolutiva only uses domain-level `paginas`, so this is cosmetic).

**Alternative (more conservative, degrades devolutiva):** suppress the O percentile/band for V1 (report O raw only, like the facets) since content was removed mid-instrument. Tradeoff: the devolutiva loses one of five domains. **Recommend prorate** (keeps all 5 domains, honors "preservar a norma Johnson já wired").

Downstream lockstep (all in the UX-08 wave):
- `submit-bigfive-final/index.ts:82-107` — `validateBody`: `length !== 120` → active-set check; the `for id=1..120` loop MUST become active-id-set iteration (ids are non-contiguous). **Redeploy** (bundles the scorer).
- `bigfiveSchema.ts:30,62,72` — `BIGFIVE_TOTAL_ITENS`; `isAllAnswered`/`countAnswered` loops → drive off loaded items, not 1..120.
- `BigFiveQuestionnaireScreen.tsx:133,267,280` — "120 afirmações" / "{n}/120" copy → dynamic count.
- `bigfive-scoring.test.ts:40-50,92-94` — `REVERSED_O` drops 88,118; "exactly 55" → 53; `NEUTRAL_VECTOR` loop skips {28,58,88,118}; add a prorate assertion.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `backup_m2.candidaturas_pre_funil` still EXISTS in PROD with PII columns | SEC-10 | If already dropped, SEC-10 is a no-op (`DROP TABLE IF EXISTS`) — low risk. MCP-verify. |
| A2 | Live `auth_admin_le_usuarios_rh` = `FOR SELECT TO supabase_auth_admin USING (true)` (from memory) | SEC-09 | If the live predicate differs, the migration would change behavior. Executor MUST diff live via MCP before applying. |
| A3 | NO RH/authenticated client reads `cognitivo_itens.gabarito_idx` or `perguntas.rubric` via API (grep-confirmed in `src/`) | SEC-01/07 | If a future/hidden RH admin UI reads them, the column REVOKE breaks it. Low today (no such UI in M4). |
| A4 | `gerar-devolutiva-bigfive` has NO candidate-facing caller (grep of `src/` empty; only `submit-bigfive-final` via service_role) | SEC-04 | If a browser caller exists, Bearer self-auth would 401 it. Verified grep empty; server-to-server confirmed. |
| A5 | The 4 O6 items are exactly {28,58,88,118} and prorating O ×6/5 preserves the Johnson norm acceptably for V1 | UX-08 | Wrong ids → wrong facet removed; wrong prorate → skewed O percentile. IDs verified against seed + facet formula. Prorate is a documented V1 stopgap (M5 restores real O6). |
| A6 | Supabase MCP `apply_migration`/`execute_sql` is available to the executor/orchestrator (it was NOT available to this research agent) | all migrations | If MCP is unavailable at execution, PROD apply falls back to the D-22 SQL-Editor workaround (`migration repair`). |
| A7 | The `redacoes_candidato` candidate own-row read currently relies on the base-table policy (client `.from().select()`), so dropping it requires the client RPC rewire in the same wave | SEC-02 | Confirmed in `redacaoService.ts:180,220`. If missed, "minha redação" goes blank. |

## Open Questions

1. **SEC-06 adjacent-table scope.** Does the planner include `redacoes_candidato` RH policies (confirmed role-only, A30/M15) + `devolutivas_candidato` + `historico_candidatura` in the vaga-scoping sweep, or scope SEC-06 strictly to `analise_candidato_vaga` + reprocessar per the requirement text?
   - What we know: all three are role-only; `redacoes_candidato` is EXPLICITLY named in A30/M15; the fix is one extra `DROP/CREATE POLICY` each in the same migration.
   - Recommendation: include `redacoes_candidato` (in A30's evidence) in SEC-06; flag `devolutivas_candidato`/`historico_candidatura` as a cheap same-migration add or an explicit defer note.
2. **SEC-04 mechanism reconciliation.** The decision says "role + posse (Bearer interno + role + posse)". The EF is server-to-server only, so Bearer self-auth alone closes the IDOR; "role + posse" has no end-user caller to apply to.
   - Recommendation: implement Bearer self-auth (cost-alerter precedent) as the sufficient guard; document that role+posse is the fallback only if a user-facing invocation is later added.
3. **SEC-03 M4 depth.** Server-side dispatch via a new pg_net trigger (reading Vault) vs. relying on the existing `submit-candidatura` EF webhook + thin new dispatch for status/revisão.
   - Recommendation: minimal M4 = remove all client URL constants + `VITE_N8N_*` + `fetch()`; fire the 3 events server-side (pg_net trigger + Vault URL), URL never in a `VITE_` var. Full `notificar-candidato` EF is M5.
4. **UX-08 count source of truth.** Hardcode `EXCLUDED_ITEM_IDS={28,58,88,118}` + 116, or derive the active set from the bank at submit time (a DB round-trip)?
   - Recommendation: derive from the bank server-side (robust across the M5 re-add so the EF never needs re-touching); derive from loaded items client-side.

## Environment Availability

| Dependency | Required By | Available (research session) | Version | Fallback |
|------------|------------|------------------------------|---------|----------|
| Supabase MCP `apply_migration`/`execute_sql`/`list_tables` | ALL DB migrations + live-state verification (SEC-09/10, RLS audit) | ✗ (agent tool restriction — see note) | — | D-22 SQL-Editor + `supabase migration repair`; executor/orchestrator has MCP per M2-M3 history |
| Supabase CLI `functions deploy` | SEC-04 + UX-08 EF redeploy | ✓ (assumed — used throughout M2-M3) | — | — |
| Deno + `supabase/functions/deno.json` | scorer/EF tests (Nyquist) | ✓ | 2.7.7 (CI, Phase 22) | — |
| Vitest | client service/schema tests | ✓ | 4.1.9 (Phase 22) | — |
| Vault secrets (n8n URL, edge_invoke_key) | SEC-03/04 | ✗ visible to research (DEFINER-only) | — | add/rotate at execution |

**Missing dependencies with no fallback:** None that block planning. **Missing with fallback:** Supabase MCP was not exposed to THIS research agent — live PROD RLS/policy/table state (SEC-09 exact policy, SEC-10 table existence, deployed-vs-migration policy drift) is INFERRED from migration files + `reference_auth_hook_rls_gap` memory. **The executor MUST run the live-state verification queries (pg_policies on the target tables, `to_regclass('backup_m2.candidaturas_pre_funil')`, column ACLs on `cognitivo_itens`) via MCP as the first task of the phase**, before authoring the migrations.

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` → this section is REQUIRED.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (client) · Deno 2.7.7 (EFs, `supabase/functions/deno.json`) · Playwright (e2e) |
| DB invariant tests | SQL smokes via `set_config('request.jwt.claims', …)` — the M2 SECURITY-gate idiom (no pgTAP committed; M17/A45 backlog) |
| Quick run | `npm run test:run` (Vitest) · `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` |
| Full suite | above + `npm run test:e2e` (mocked Tier-1) |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Command / Method | Exists? |
|-----|----------|-----------|------------------|---------|
| SEC-01 | candidato `SELECT gabarito_idx` denied; `get_cognitivo_itens()` returns no key; base row denied | SQL smoke (jwt.claims=candidato) + Vitest projection | new `supabase/tests/*.sql` smoke + `cognitivoService` RPC test | ❌ Wave 0 (smoke) / ⚠️ extend existing `prova-cognitiva.test.tsx` |
| SEC-02 | candidato cannot read any verdict col; RH still reads verdict; `get_minha_redacao` returns only safe cols | SQL smoke (candidato vs RH) + Vitest | new smoke + `redacaoService`/`revisaoRedacaoService` tests | ❌ Wave 0 |
| SEC-03 | no n8n URL in `build/`; no `VITE_N8N_*` in `src/` | build-artifact grep guard | `grep -r 'n8n.cloud\|fernandocosta' build/ ⇒ 0` | ❌ Wave 0 |
| SEC-04 | candidate JWT / no-Bearer → 401; correct service Bearer → 200 | Deno test (deps-injected harness) | clone `avaliar-redacao/__tests__` pattern → `gerar-devolutiva-bigfive/__tests__` | ⚠️ extend (index.test.ts exists) |
| SEC-05/06 | recrutador-não-dono → 0 rows on analise/comparativo(/redacao); owner → rows; admin → all; reprocessar 42501 non-owner | SQL smoke (3 jwt.claims) | new smoke; regression-guard `reprocessar_analise` | ❌ Wave 0 |
| SEC-08 | recrutador-não-dono → 0 candidaturas of other vaga; UPDATE denied; candidato own-row intact | SQL smoke | new smoke | ❌ Wave 0 |
| SEC-09 | policy present after a fresh `supabase db reset` / declared in a file | migration-presence + rebuild | `grep auth_admin_le_usuarios_rh supabase/migrations/*` + rebuild check (Phase 27 seals) | ❌ Wave 0 |
| SEC-10 | `to_regclass('backup_m2.candidaturas_pre_funil') IS NULL` post-drop | SQL smoke | one-liner via MCP | ❌ Wave 0 |
| SEC-11 | no `console.log(candidate-PII)` in `src/components/pages/*` | grep guard | `grep -rn 'console\.log' src/components/pages/*RH*` allowlist | ❌ Wave 0 |
| UX-08 | scorer: 116 items, 53 reversed, O prorated; bank 116 active; submit validates 116; get_bigfive_itens=116 | Deno golden test + SQL smoke | UPDATE `bigfive-scoring.test.ts`; extend `submit-bigfive-final` test | ⚠️ UPDATE existing golden test |

### Sampling Rate
- **Per task commit:** `deno test … supabase/functions` (EF/scorer) + `npm run test:run -- <touched>` (client).
- **Per wave merge:** full `deno test` + full `npm run test:run`.
- **Phase gate:** both suites green + the DB SQL smokes executed against PROD (candidato-DENY / non-owner-42501) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `supabase/tests/sec_rls_smokes.sql` (or Deno) — candidato-DENY on gabarito/verdict; non-owner 0-rows on analise/comparativo/candidaturas/redacao; `pontuar_*` never writes `candidaturas` (RNF-07a regression). Commits the throwaway M2 SECURITY-gate smokes as repeatable tests (closes A45/M17 for these tables).
- [ ] `gerar-devolutiva-bigfive/__tests__/index.test.ts` — add caller-authz cases (no-Bearer→401, wrong-Bearer→401, service-Bearer→200) via the deps-injection harness.
- [ ] `bigfive-scoring.test.ts` — retarget golden counts (116/53) + a prorate assertion + non-contiguous NEUTRAL_VECTOR.
- [ ] Build/grep guards for SEC-03 (bundle) + SEC-11 (RH console.log).
- [ ] Framework install: none — all runners exist.

## Security Domain

> `security_enforcement` absent in config ⇒ enabled ⇒ section REQUIRED. This phase IS the security phase.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control (this phase) |
|---------------|---------|-------------------------------|
| V1 Architecture | yes | Enforcement-tier discipline: DB/EF is the boundary, client allowlist is defense-in-depth |
| V4 Access Control | **yes (core)** | RLS row-scope + column GRANT/REVOKE + DEFINER RPC (SEC-01/02/07); vaga-ownership horizontal AC (SEC-05/06/08); EF caller authz (SEC-04) — IDOR closure |
| V5 Input Validation | yes | `submit-bigfive-final` `.strict()` + active-set coverage (UX-08); `zod` twins |
| V7 Error/Logging | yes | Strip candidate-PII `console.log` (SEC-11); redacted EF logs (ids/counts only, existing Pitfall-7 idiom) |
| V8 Data Protection | **yes (core)** | Answer-key/verdict never crosses to candidate (SEC-01/02/07); LGPD erasure completeness (SEC-10 backup drop); political-opinion special-category data removed (UX-08) |
| V6 Cryptography | no (n/a) | SEC-04 Bearer compare — use exact/constant-time match on the shared secret; never hand-roll crypto |
| V2 Auth / V3 Session | partial | SEC-09 keeps the auth-hook role-injection intact (do not alter behavior) |

### Known Threat Patterns for Supabase RLS + PostgREST + Deno EFs
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `?select=secret_column` column disclosure (RLS ≠ column secrecy) | Information Disclosure | Column REVOKE (where no authed client needs it) OR candidate-DENY row + DEFINER RPC |
| IDOR via privileged EF (service_role bypasses RLS) | Elevation / Info Disclosure | Authenticate **and** authorize; Bearer self-auth for server-to-server EFs |
| Horizontal access across recruiters (role-only RLS) | Info Disclosure | Vaga-ownership predicate (`created_by = auth.uid()`, admin bypass) |
| Secret URL in public bundle (`VITE_` inlined) | Info Disclosure / DoS (forged events) | Server-side dispatch (pg_net + Vault); shared-secret auth on the receiver |
| LGPD special-category data (political opinion) exposed to subject | Info Disclosure / Compliance | Remove the O6 political items; preserve non-eliminatory scoring (RNF-07a) |
| Incomplete erasure (backup schema outside erasure flow) | Repudiation / Compliance | DROP the backup (SEC-10) |
| Auth-hook RLS drift (rebuild demotes RH → candidato) | DoS (self-lockout) | Declare the `supabase_auth_admin` policy in a migration (SEC-09) |

**RNF-07a invariant (preserve everywhere):** no path in this phase writes `candidaturas`, advances the funil, or auto-rejects. Every migration only tightens a SELECT/UPDATE policy, adds a DEFINER reader, or removes an item. The Big Five scorer stays non-eliminatory (percentile is contextual). Confirm every new/edited RPC keeps `SET search_path = ''` and `REVOKE PUBLIC / GRANT authenticated`.

## Sources

### Primary (HIGH confidence — read in-repo this session)
- `supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql` (SEC-01 table/policy) · `20260624000003_pontuar_cognitivo_rpc.sql` (gabarito DEFINER reader)
- `supabase/migrations/20260623100003_redacoes_candidato.sql` (SEC-02 verdict cols + RH/candidate policies)
- `supabase/migrations/20260611000002_perguntas_sjt.sql` (`get_opcoes_sjt` pattern + `rubric`) · `20260612000001_bigfive_itens.sql` (`get_bigfive_itens` + 120-item seed)
- `supabase/migrations/20260610000001_analise_tables.sql` (SEC-05 role-only) · `20260610000003_reprocessar_rpc.sql` (SEC-06 already-scoped) · `20260607000006_rls_policies_m2_backbone.sql` (SEC-08)
- `supabase/migrations/20260625000001_phase14_gap_closure.sql` + `20260625100002_decisao_final_rh_vaga_scope.sql` (WR-04/WR-03 templates)
- `supabase/migrations/20260420000002_unified_auth_role.sql` (SEC-09 GRANTs + hook)
- `supabase/functions/gerar-devolutiva-bigfive/index.ts` (SEC-04 no-auth) · `supabase/functions/cost-alerter/index.ts:90-113` (Bearer guard) · `supabase/functions/_shared/bigfive-scoring.ts` (UX-08 scorer) · `supabase/functions/submit-bigfive-final/index.ts` (validateBody)
- Client: `cognitivoService.ts` · `redacaoService.ts` · `revisaoRedacaoService.ts` · `avaliacaoService.ts` · `candidaturasService.ts` · `explicacaoService.ts` · `bigfiveSchema.ts`
- `.planning/M4-SYSTEM-AUDIT.md` (C1, H5/H14/H6/H20, M4/M5/M6/M15, A19/A25/A43/A49/A54, L4/L5)

### Secondary (MEDIUM — project memory)
- `reference_auth_hook_rls_gap.md` (SEC-09 exact live policy) · `reference_select_star_leaks_pii.md` (column-secrecy rule) · `reference_ef_authenticate_vs_authorize.md` (SEC-04 role-read landmine + Bearer pattern) · `reference_ef_shared_bundle_freeze.md` (EF redeploy rule)

### Not available this session
- Supabase MCP (live PROD RLS/policy/table state) — INFERRED from the above; executor must MCP-verify (Environment Availability).

## Metadata

**Confidence breakdown:**
- Column-secrecy mechanism (SEC-01/02/07): HIGH — all tables/policies/services read; shared-role analysis grep-verified.
- Vaga-scoping (SEC-05/06/08): HIGH — WR-04 template + current role-only policies read verbatim.
- SEC-04 EF authz: HIGH — no-auth handler + cost-alerter mirror confirmed.
- SEC-09/10: MEDIUM — live state inferred from memory + migration GRANTs; requires MCP diff before apply.
- UX-08 scorer: HIGH on the mechanics (ids, count-coupling, prorate math); MEDIUM on the exact prorate-vs-suppress product call (flagged for the psychometrics-aware plan/discuss).

**Research date:** 2026-07-06
**Valid until:** 2026-08-05 (stable — internal codebase; re-verify only if migrations 20260706+ or the EFs change before execution)
