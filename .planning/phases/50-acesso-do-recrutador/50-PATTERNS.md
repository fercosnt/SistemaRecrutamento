# Phase 50: Acesso do Recrutador - Pattern Map

**Mapped:** 2026-10-05
**Files analyzed:** 30 (3 migrations new, 1 smoke new, 2 scripts new, 1 EF source probe new, 5 EF `index.ts` modified, 4 EF Deno test files modified, ~12 legacy smokes modified, 4 front-end comment touch-ups)
**Analogs found:** 29 / 30. Only the optional `scripts/p50_sessao_real.cjs` has no in-repo analog.

Every analog below was checked with `git ls-files`: all are tracked source. No mirror paths.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/2026100X000001_p50_helper_policies.sql` (helper + 14 `ALTER POLICY` + `v_analises_presas` invoker) | migration (RLS) | request-response (authz predicate) | `20261003000001_p49_44_resposta_caso_aberto_rh.sql` (header, SET LOCAL, pre/post gate, helper ACL) + `20260713000001_usr_rh_rls_seg02.sql` (DEFINER helper used by a policy) + `20260921000017_fecha_views_legado_pii.sql` (`ALTER VIEW … SET (security_invoker = true)` + verification) | exact (composed) |
| `supabase/migrations/2026100X000002_p50_rpcs_leitura_filas.sql` (4 queue RPCs + `funil_kpis` + `listar_historico_candidatura` + `ler_resposta_caso_aberto_sjt`) | migration (DEFINER RPC rewrite) | request-response / CRUD-read | `20260929000003_p49_salvar_avaliacao_por_analise.sql` (md5(prosrc) pre-gate on a live body, then CREATE OR REPLACE of the transcribed body) | exact |
| `supabase/migrations/2026100X000003_p50_rpcs_escrita.sql` (11 write RPCs) | migration (DEFINER RPC rewrite) | CRUD-write | `20260929000003_p49_salvar_avaliacao_por_analise.sql` | exact |
| `supabase/tests/p50_acesso_recrutador_smoke.sql` | test (PROD smoke / gate) | batch (impersonation + catalog scan) | `supabase/tests/p49_44_resposta_caso_aberto_smoke.sql` (contract, subtransaction, per-call EXCEPTION blocks, `(z)` baseline) + `supabase/tests/p44_pedidos_dados_smoke.sql` (k)/(l) (seeding a pedido inside a rolled-back subtransaction) | exact |
| `scripts/p50_mutacoes.cjs` | utility (bite / mutation runner) | batch | `scripts/p49_44_mutacoes.cjs` | exact |
| EF source probe (`src/__tests__/p50-ef-sem-posse-de-vaga.test.ts` or `scripts/p50_ef_sem_posse.cjs`) | test (source-text probe) | file-I/O | `supabase/functions/_shared/__tests__/strict-schema.test.ts` + `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` | role-match |
| `scripts/p50_sessao_real.cjs` (optional) | utility | request-response (password grant) | none | no analog |
| `supabase/functions/comparativo-candidatos/index.ts` | EF (controller) | request-response | itself (deletion of block 3b, lines 270-290) | exact |
| `supabase/functions/get-curriculo-url/index.ts` | EF | request-response | itself (lines 175-194) | exact |
| `supabase/functions/consolidar-decisao-final/index.ts` | EF | request-response | itself (lines 324-339) | exact |
| `supabase/functions/gerar-guia-entrevista/index.ts` | EF | request-response | itself (lines 235-260) | exact |
| `supabase/functions/avaliar-transcricao-entrevista/index.ts` | EF | request-response | itself (lines 225-245) | exact |
| `supabase/functions/comparativo-candidatos/__tests__/index.test.ts` | test (Deno) | request-response | itself (line 295 test + mock line 212) | exact |
| `supabase/functions/get-curriculo-url/index.test.ts` | test (Deno) | request-response | itself (lines 183-196, 212-245) | exact |
| `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` | test (Deno) | request-response | itself (lines 404-422) | exact |
| `supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts` | test (Deno) | request-response | itself (lines 849-872) | exact |
| `supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts` | test (Deno) | — | itself (line 178 mock keeps `created_by`; harmless) | no change required |
| Legacy smokes: `oper31_rejeitar_candidatura_smokes.sql`, `funil34_kpis_smokes.sql`, `p37_lacunas_rls_idempotencia_smokes.sql`, `p37_fidelidade_schema_smoke.sql`, `p44_pedidos_dados_smoke.sql`, `seg32_smokes.sql`, `seg33_agendamento_smokes.sql`, `sec05_08_smokes.sql`, `p47_historico_smoke.sql`, `p49_44_resposta_caso_aberto_smoke.sql`, `p46_fixture_elegivel.sql` (comment) | test (PROD smoke) | batch | `p44_pedidos_dados_smoke.sql` (k)/(l) for the positive/negative pair shape | exact |
| `src/features/vagas/services/vagasService.ts:128-131`, `src/features/vagas/services/cvUploadService.ts:184-186`, `src/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo.ts:91-95`, `src/features/triagem/services/triagemService.ts:364` | service/hook (comment only) | — | n/a | comment-only |

---

## Pattern Assignments

### Migration header + skeleton (all 3 migrations)

**Analog:** `supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql`

**Header sections to reproduce, in this order** (lines 1-177): title block naming the objects; `Phase 50 / Plano 50-NN`; `O QUE ESTAVA ERRADO`; the operator decision quoted verbatim (lines 16-18 show the form: «Opção apresentada, texto literal: … Resposta, verbatim: …»); `MEDIDO EM PROD (2026-10-0X, só leitura, set transaction read only)` with the md5 baselines; `POR QUE OS DOIS SET LOCAL NO TOPO` (lines 145-153); `AUTHZ` (lines 160-165); `IDEMPOTÊNCIA` (lines 167-169); the no-BEGIN note and the APLICAR COM line:

```sql
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/COMMENT adjacentes é a forma exata do 42601, e o endpoint já roda a requisição inteira
-- numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
```

**Lock limits at the top of the body** (lines 179-181). The rationale paragraph (lines 145-153) explains why they must live IN the file (md5 of the ledger is the file's):

```sql
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';
```

**Version numbering:** must be greater than ledger head `20261003000001` (latest file in `supabase/migrations/`). Name must match `^\d{14}_.+\.sql$` (`p46apply.cjs:88-91`).

---

### `2026100X000001_p50_helper_policies.sql` (migration, RLS)

**Analogs:** `20261003000001_p49_44_…sql` (helper ACL + post-gate), `20260713000001_usr_rh_rls_seg02.sql` (existing DEFINER helper used inside a policy), `20260921000017_fecha_views_legado_pii.sql` (view invoker).

**Pre-gate pattern: assert the LIVE state equals what was measured** (p49_44 lines 187-221). Phase 50 changes the predicate from "does not exist" to "md5 of the live qual equals the baseline":

```sql
DO $pre_portao$
DECLARE
  v_pols  text;
  v_force boolean;
BEGIN
  IF to_regprocedure('public.ler_resposta_caso_aberto_sjt(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'P49-44 PRE-PORTAO: public.ler_resposta_caso_aberto_sjt(uuid) JA existe — esta migration a cria; reaplicar por cima sobrescreveria um corpo que ninguem mediu.';
  END IF;
  ...
  SELECT string_agg(p.policyname || ':' || p.permissive, ',' ORDER BY p.policyname) INTO v_pols
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'respostas_avaliacao';
  IF v_pols IS DISTINCT FROM 'cand_escreve_respostas_aval:PERMISSIVE,cand_le_respostas_aval:PERMISSIVE' THEN
    RAISE EXCEPTION 'P49-44 PRE-PORTAO: as policies vivas de respostas_avaliacao sao «%», e o medido em 2026-10-03 era so as duas do titular. ... medir de novo e decidir A MAO.', v_pols;
  END IF;
  ...
  RAISE NOTICE 'P49-44 PRE-PORTAO OK — RPC ausente ; policies = % ; force_rls = %', v_pols, v_force;
END
$pre_portao$;
```

Phase 50 form: for each of the 14 `(tablename, policyname)` pairs, compare `md5(coalesce(qual,'')||'|'||coalesce(with_check,''))` against the baseline table in `50-RESEARCH.md` §A (re-measured at execute time). Also assert `to_regprocedure('public.is_active_rh_user()') IS NULL`, and that `v_analises_presas` has no `security_invoker`. Note: the 14-pair list IS a deliberate scope (the objects this file rewrites), not a snapshot. Say so in a comment, per CLAUDE.md §Portões.

**Helper: existing precedent** (`20260713000001_usr_rh_rls_seg02.sql` lines 55-87):

```sql
-- (1) Recursion-safe admin predicate. LANGUAGE plpgsql (NOT sql) + SECURITY
--     DEFINER so it reads usuarios_rh as its owner, bypassing RLS -> the SELECT
--     inside does NOT re-trigger the usuarios_rh policies (no infinite recursion).
CREATE OR REPLACE FUNCTION public.is_active_rh_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_rh
    WHERE user_id = auth.uid()
      AND role = 'administrador'
      AND ativo
      AND deleted_at IS NULL
  ) INTO ok;
  RETURN COALESCE(ok, false);
END;
$$;
```

> ⚠ **Divergence the planner must settle.** `50-RESEARCH.md` Pattern 1 proposes `LANGUAGE sql`. The repo precedent (`is_active_rh_admin`, comment at lines 18-21 and 83-85) insists on **plpgsql**: «NEVER sql: a plain-sql helper is inlined during planning, loses the DEFINER context and re-introduces the RLS recursion trap». (Postgres does not inline SECURITY DEFINER SQL functions, so the SQL form is not actually unsafe. Still, plpgsql removes the question and matches the house idiom and the p49_44 helper `caso_aberto_sjt_enviado`, lines 306-334, which is also plpgsql.) Recommendation: plpgsql, `SET search_path = ''`, fully-qualified `public.usuarios_rh`, `(select auth.uid())`.
>
> **Do NOT copy the precedent's ACL.** `is_active_rh_admin` does `REVOKE … FROM public` only, and PROD shows `anon=X` on it (RESEARCH §H). Use the p49_44 ACL idiom below.

**Helper ACL + COMMENT** (p49_44 lines 336-341). `anon` must be named explicitly:

```sql
REVOKE ALL ON FUNCTION public.caso_aberto_sjt_enviado(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.caso_aberto_sjt_enviado(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.caso_aberto_sjt_enviado(uuid) TO authenticated, service_role;
```

The rationale is at line 165: «O helper tem o MESMO ACL: a policy roda com o papel de quem consulta, que precisa de EXECUTE». This is why all 14 policies go `TO authenticated` (RESEARCH Pitfall 5).

**Policy DDL:** there is no `ALTER POLICY` anywhere in `supabase/migrations/` (grep returns 0). The closest in-repo policy DDL is `CREATE POLICY … TO authenticated USING (public.<helper>())`, from `20260713000001` lines 109-113 and p49_44 lines 347-364. Use the `ALTER POLICY … TO authenticated USING (…) [WITH CHECK (…)]` text from RESEARCH Pattern 2. Keep the admin branch textually identical. Generate `rh_le_notificacoes` and `rh_gerencia_agendamento` from ONE string so `p37_fidelidade (e)` byte-equality holds (see legacy section).

**Policy COMMENT form** (p49_44 lines 366-371):

```sql
COMMENT ON POLICY cand_congela_caso_aberto_ins ON public.respostas_avaliacao IS
  'P49-44 / WR-07: ... RESTRICTIVE e aditiva (soma-se a trava por etapa); so TO authenticated, fora do alcance do motor de exclusao.';
```

**View invoker + verification** (`20260921000017_fecha_views_legado_pii.sql` lines 55, 86-90):

```sql
ALTER VIEW public.v_candidatos_ativos      SET (security_invoker = true);
...
    IF NOT EXISTS (SELECT 1 FROM pg_class c, pg_options_to_table(c.reloptions) o
                    WHERE c.oid = v_oid AND o.option_name = 'security_invoker'
                      AND o.option_value IN ('true', 'on')) THEN
      RAISE EXCEPTION 'VIEWS VERIFICA: public.% sem security_invoker', v_view;
    END IF;
```

Do NOT copy that file's `REVOKE ALL … FROM anon, authenticated`. `v_analises_presas` keeps `GRANT SELECT … TO authenticated` (RESEARCH §D), and only the invoker flag changes.

**Post-gate pattern** (p49_44 lines 377-440): SECURITY DEFINER + `search_path=""` + ACL check with `has_function_privilege`, plus the policy set read back from `pg_policies` and compared to the expected string:

```sql
  SELECT p.prosecdef, p.proconfig, md5(p.prosrc) INTO v_secdef, v_conf, v_md5
    FROM pg_catalog.pg_proc p WHERE p.oid = c_sig::regprocedure;
  IF v_secdef IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: % nao e SECURITY DEFINER — ...', c_sig;
  END IF;
  IF v_conf IS NULL OR NOT ('search_path=""' = ANY (v_conf)) THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: % sem search_path vazio (proconfig = %)', c_sig, v_conf;
  END IF;
  v_anon := has_function_privilege('anon',          c_sig::regprocedure, 'EXECUTE');
  v_auth := has_function_privilege('authenticated', c_sig::regprocedure, 'EXECUTE');
  IF v_anon THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: anon tem EXECUTE em % — o grant do pg_default_acl e DIRETO; o REVOKE nominal falhou', c_sig;
  END IF;
  ...
  RAISE NOTICE 'P49-44 POS-PORTAO OK — md5(prosrc) ... = % ; ... anon=% authenticated=% ; ...', ...;
```

Phase 50 additions: (i) none of the 14 quals or with_checks match `created_by`; (ii) each contains `is_active_rh_user` (unqualified, because of the deparse caveat in RESEARCH Pattern 5); (iii) `roles = {authenticated}` on all 14; (iv) `rh_le_notificacoes.qual = rh_gerencia_agendamento.qual`; (v) `v_analises_presas` has invoker set. Print the new md5s in the NOTICE so the evidence doc can copy them.

---

### `2026100X000002_p50_rpcs_leitura_filas.sql` and `2026100X000003_p50_rpcs_escrita.sql` (migration, DEFINER RPC rewrite)

**Analog:** `supabase/migrations/20260929000003_p49_salvar_avaliacao_por_analise.sql`

**md5(prosrc) pre-gate on a LIVE body** (lines 78-107). This is the exact shape for each of the 18 functions:

```sql
DO $pre_portao$
DECLARE
  v_md5 text;
  v_len int;
  c_esp constant text := '2b567aaa530fc32da4b074c7776d62ec';
BEGIN
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.salvar_avaliacao_entrevista(uuid,jsonb,text)'::regprocedure;
  IF v_md5 IS DISTINCT FROM c_esp THEN
    RAISE EXCEPTION 'P49-30 PRE-PORTAO: o corpo VIVO de salvar_avaliacao_entrevista(uuid,jsonb,text) tem md5 % (length %), e o medido em 2026-09-29 e % (3748). Esta migration transcreveu o corpo medido para a assinatura nova; um corpo diferente significa uma mudanca que ela apagaria em silencio. Medir de novo e reconciliar A MAO.',
      v_md5, v_len, c_esp;
  END IF;
  ...
  RAISE NOTICE 'P49-30 PRE-PORTAO OK — salvar(uuid,jsonb,text) = % (%) ; ...', v_md5, v_len;
END
$pre_portao$;
```

For 18 functions, a `VALUES (regprocedure_text, md5)` list iterated in one DO block is acceptable. It is a deliberate scope (what this file rewrites), so comment it as such. Baselines come from RESEARCH §B (re-measure first). `anonimizar_candidato` / `plano_exclusao_titular` must NOT appear. Their md5 is pinned at `supabase/tests/p45_motor_exclusao_smoke.sql:3055-3056`.

**Function body shape: the exact owner-guard lines that change** (lines 140-164 of the analog). This is the live form in `salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)`, and 9 other write RPCs share it:

```sql
  SELECT ea.id, v.created_by, ea.superada_em, ea.status_analise, ea.competencias
    INTO v_analise_id, v_vaga_owner, v_superada, v_status, v_comp
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.id = p_analise_id
     AND ea.candidatura_id = p_candidatura_id
     FOR UPDATE OF ea;
  ...
  -- Fail-closed: sem papel nenhum, RECUSA (a comparação direta sobre um v_role nulo
  -- devolve NULL e o IF não dispara).
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
```

After the rewrite: drop `v.created_by` from the SELECT list and `v_vaga_owner` from `INTO`/`DECLARE`. Keep the `vagas` JOIN only if another column needs it. Otherwise drop it too, which also keeps the SC3 gate (`prosrc ~* 'created_by' AND prosrc ~* '\mvagas\M'`) honest. Replace the second IF with:

```sql
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
```

**Fail-closed guard (D-04).** For `reprocessar_analise` and `salvar_revisao_redacao`, the canonical fail-closed form is p49_44 lines 241-247:

```sql
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  v_uid  := (select auth.uid());
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
```

**Revoke anon (D-04)** for the 6 rewritten functions that have `anon=X` (`funil_kpis`, `rejeitar_candidatura`, `reprocessar_analise`, `salvar_revisao_redacao`, `save_entrevista_guia_edits`, `upsert_pergunta_opcoes_metadata`). Use the 3-line ACL idiom (p49_44 lines 295-297):

```sql
REVOKE ALL ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) TO authenticated, service_role;
```

**`ler_resposta_caso_aberto_sjt` specifics.** Its live body (from the p49_44 file, lines 249-262) carries the «inexistente e alheia dão o MESMO 42501» logic:

```sql
  SELECT v.created_by INTO v_dono
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;
  v_achou := FOUND;

  IF v_role = 'rh' AND (NOT v_achou OR v_dono IS DISTINCT FROM v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT v_achou THEN
    RAISE EXCEPTION 'candidatura % nao encontrada', p_candidatura_id USING ERRCODE = 'no_data_found';
  END IF;
```

Rewrite: `IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN 42501` before the lookup, then `SELECT 1 … FROM public.candidaturas c WHERE c.id = …` (no `vagas` join), and `NOT FOUND → P0002` for both roles. Its `COMMENT ON FUNCTION` (line 299-300) says «Predicado WR-04 … rh dono da vaga (vagas.created_by = auth.uid())» and must be rewritten. That matters for SC3 too: the comment is not in `prosrc`, but it would be stale.

**Post-gate** (analog lines 331-401). It asserts body properties via `position(... IN prosrc)`, guard form and ACL. Example of asserting that the fail-OPEN form is absent (line 367):

```sql
    RAISE EXCEPTION 'P49-30 POS-PORTAO: a forma fail-OPEN do guard de papel apareceu (nova=%, antiga=%)',
```

Phase 50 post-gate per function: `prosrc !~* 'created_by'` (for the 18), `prosrc ~ 'is_active_rh_user'`, no `v_role NOT IN (` without `coalesce`, ACL anon=false / authenticated=true, and `prosecdef` + `search_path=""` unchanged. For REVISAO-05 / D-23 inside `registrar_decisao`, assert the literal `d.por_usuario = v_uid` is still present (SC5).

---

### `supabase/tests/p50_acesso_recrutador_smoke.sql` (test, PROD smoke / gate)

**Analog:** `supabase/tests/p49_44_resposta_caso_aberto_smoke.sql` (733 lines)

**Header contract** (lines 1-133): `O QUE ELE VIGIA`; `FIXTURES`; the `⚠ ESTE SMOKE ESCREVE` paragraph (lines 37-39); per-call EXCEPTION blocks (lines 41-43); `CLÁUSULAS` (a)…(z); `O PORTÃO MORDE` with the mutation table (lines 85-106); `Varredura D-56 (forma)` with the population count written (lines 108-124); `COMO RODAR`; `GATE VERDE = pass = esperado`. «Esperado FIXO = o número de cláusulas DESTE arquivo (escopo deliberado), não uma fotografia do banco.»

**Session reset + counters** (lines 135-139):

```sql
RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('smoke4944.pass', '0', false);
SELECT set_config('smoke4944.fixtures', '', false);
```

Use the prefix `smoke50.`.

**Baseline: actors read at runtime, never hard-coded** (lines 145-182):

```sql
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P49C FAIL (baseline): nenhum administrador ATIVO — a clausula (c) nao teria ator';
  END IF;
  ...
  PERFORM set_config('smoke4944.n_cand',  (SELECT count(*) FROM public.candidaturas)::text, false);
```

Phase 50 actors:
- the active-RH non-owner: an active `usuarios_rh` row with `NOT EXISTS (vagas.created_by = user_id)`. Today that resolves to `023abcd6`/`66412f96`, the same selection as `funil34_kpis_smokes.sql:40-43`.
- the inactive recrutador: `role='recrutador' AND NOT ativo`.
- the active admin.
- a candidato.
- one `ativa`, one `inativa` and one `arquivada` vaga that each have ≥1 live candidatura, read by status at runtime and NOT by the UUIDs in RESEARCH §I.

Fail loudly when an actor is missing, as above. Capture per-table `to_jsonb` fingerprints for candidato and anon here, for SC2.

**Impersonation inside the subtransaction** (lines 296-327). Use `SET LOCAL ROLE` + `set_config(..., true)`, with one EXCEPTION block per call:

```sql
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_a]);
      a_anon_rpc := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN a_anon_rpc := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_a]);
      b_sit := v_ret ->> 'situacao';  b_md5 := md5(v_ret ->> 'texto');  b_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN b_state := SQLSTATE || ':' || SQLERRM;
    END;
```

Also reuse the "sub valid, no role" probe (lines 350-360). Its purpose is to catch a missing `coalesce`, and it applies to every rewritten guard (D-04).

**Rollback envelope** (lines 514-531): the whole measurement block ends in a custom SQLSTATE, and judgment happens outside it:

```sql
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P49C1';
  EXCEPTION
    WHEN SQLSTATE 'P49C1' THEN
      NULL;  -- ROLLBACK da subtransação. Os valores medidos estão nas variáveis acima.
    WHEN OTHERS THEN
      v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  ...
  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION 'P49C FAIL (parte 1): a subtransacao abortou por erro INESPERADO (%) — nenhuma clausula foi julgada; o defeito e da FIXTURE, nao dos objetos vigiados (cada chamada tem bloco de excecao proprio)', v_err;
  END IF;
```

Use a distinct SQLSTATE (e.g. `P50C1`) and fail-message prefix `P50C FAIL (<letra>)`, so `p50_mutacoes.cjs` can parse it the same way (`/P49C FAIL \(([^)]+)\)(?::\s*\[([^\]]*)\])?/`, mutation script line 136).

**Judgment form: one `IF … RAISE` per clause, then increment** (lines 560-587):

```sql
  -- (d)
  IF d_alheio NOT LIKE '42501:%' OR d_sem NOT LIKE '42501:%' OR d_cand NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P49C FAIL (d): sobre a fixture POVOADA, rh de outra vaga=«%», sem claims=«%», candidato titular=«%» (esperado 42501 nos tres) — ...',
      d_alheio, d_sem, d_cand;
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);
```

For multi-probe clauses (SC2 over 12 tables + 18 RPCs), use the label-list form from (g), lines 625-643: collect failing labels into `text[]` and raise once with `[%]`. A `c_*` label means a vacuous control. Pair every negative with a positive control in the same run (RESEARCH anti-pattern «negative passes for the wrong reason»).

**Seeding a pedido inside a rolled-back subtransaction (SC4)**: `p44_pedidos_dados_smoke.sql` lines 606-665:

```sql
  BEGIN
    INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao, causa)
    VALUES (v_cand_com, 'acesso', 'pendente', 'falha_geracao')
    RETURNING id INTO v_id_com;
    ...
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_rec_auth::text,
                        'app_metadata', json_build_object('role', 'rh'))::text, false);
    SELECT EXISTS (SELECT 1 FROM public.listar_pedidos_dados(true) p WHERE p.id = v_id_com), ...
    RAISE EXCEPTION 'rollback_smoke44' USING ERRCODE = 'P4405';
  EXCEPTION
    WHEN sqlstate 'P4405' THEN
      NULL;  -- reversão esperada; as variáveis abaixo sobreviveram
  END;
```

The orphan candidato is read at runtime (p44 lines 160-170: «nenhum candidato SEM candidatura nenhuma … Fabricar um exigiria escrever em auth.users»). For SC4, compute `md5(jsonb_agg(to_jsonb(t) - 'pode_responder' ORDER BY …))` as admin and as active rh (RESEARCH §Code Examples), and assert equal with count > 0. Print the population.

**SC3 catalog scan + pg_temp bite:** no in-repo smoke iterates `pg_proc.prosrc` by regex over all schemas (grep: 0). Nearest catalog reads are `p49_44…smoke.sql:543` (`pg_proc JOIN pg_namespace` filtered by name) and `p45_motor_exclusao_smoke.sql:3394` (`position(... IN prosrc)`). Use the RESEARCH Pattern 5 SQL verbatim. It iterates the catalog (no literal list) and has no allowlist.

**(z) baseline + output contract** (lines 662-733): residue check, global counts compared with the baseline captured in the same run, a gate DO block, and a final SELECT:

```sql
DO $gate$
BEGIN
  IF current_setting('smoke4944.pass')::int <> 9 THEN
    RAISE EXCEPTION 'P49C FAIL (gate): pass = % de 9 — alguma clausula nao incrementou o contador', current_setting('smoke4944.pass');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',     'p49_44_resposta_caso_aberto',
  'pass',      current_setting('smoke4944.pass')::int,
  'esperado',  9,
  'n_cand',    current_setting('smoke4944.n_cand')::int,
  ...
) AS resultado;
```

Consumers read `JSON.parse(out)[0].resultado`.

---

### `scripts/p50_mutacoes.cjs` (utility, bite runner)

**Analog:** `scripts/p49_44_mutacoes.cjs` (191 lines). Copy it nearly whole.

**Constants and composition** (lines 33-39, 118-121):

```js
const MIG = 'supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql';
const SMOKE = 'supabase/tests/p49_44_resposta_caso_aberto_smoke.sql';
const APPLY = path.join(ROOT, 'p46apply.cjs');
const SENTINELA = 'ENSAIO_P49_44_TERMINOU';
const PREFIXO = "SET LOCAL lock_timeout = '3s';\nSET LOCAL statement_timeout = '5s';\n";
const FIM = `\nDO $ens$ BEGIN RAISE EXCEPTION '${SENTINELA}'; END $ens$;\n`;
...
  const corpo = PREFIXO + mig + '\n' + (mutacao ? `\n-- MUTACAO ${rodada}\n${mutacao}\n` : '') + '\n' + smoke + FIM;
```

Phase 50 adaptation: `MIGS` is an array of the 3 files concatenated in order before the run, and only while they are not yet applied. After apply, run with an empty migration prefix, because the pre-gates would abort a re-application. Planner should decide whether the script takes a `--pos-apply` flag.

**Anchored extraction and replacement** (lines 49-70). Every mutation is a literal-anchor replacement that must occur exactly once:

```js
function trocar(trecho, ancora, novo, rotulo) {
  const n = trecho.split(ancora).length - 1;
  if (n !== 1) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} («${ancora}» ocorre ${n} vez(es) no trecho)`);
  return trecho.replace(ancora, novo);
}
```

**Mutation table shape** (lines 72-116): `{ id, desc, letra, rotulo?, sql }`. Phase 50 mutations, minimum:
- reintroduce `created_by = (select auth.uid())` in one policy via `ALTER POLICY` → expect the SC3 letter
- reintroduce `v.created_by` + owner IF in one RPC → SC3
- the helper always true → SC2
- drop `coalesce` from a D-04 guard → the guard letter
- `GRANT EXECUTE` of the helper to anon → ACL letter
- `ALTER VIEW v_analises_presas RESET (security_invoker)` → SC2/view letter
- one queue RPC keeps an rh-only filter → SC4

**CONTROL / timeouts / instrument suspicion / persistence check** (lines 130-191): exit on `55P03`/`57014` without concluding; two consecutive non-biting mutations → «SUSPEITA DE INSTRUMENTO»; final read-only query confirms nothing persisted:

```js
const q =
  "set transaction read only; select to_regprocedure('public.ler_resposta_caso_aberto_sjt(uuid)') is null as sem_rpc, " +
  ...
  "(select count(*) from supabase_migrations.schema_migrations where version = '20261003000001') as ledger";
const s = execFileSync('node', [APPLY, 'sql', q], { cwd: ROOT, encoding: 'utf8' });
const row = JSON.parse(s.slice(s.indexOf('[')))[0];
```

Phase 50: check `to_regprocedure('public.is_active_rh_user()') is null`, ledger rows for the 3 versions = 0, and one policy's md5 still equals its baseline (pre-apply mode).

---

### EF source probe (test, file-I/O)

**Analogs:** `supabase/functions/_shared/__tests__/strict-schema.test.ts` (a Node/Vitest source-text probe over EF code) and `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` (regex scan over files).

**Imports / read idiom** (strict-schema lines 36-41):

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SCHEMAS_PATH = resolve(__dirname, '../schemas.ts')
const schemasSource = () => readFileSync(SCHEMAS_PATH, 'utf8')
```

**Location constraint** (`vite.config.ts:13, 19-31`): Vitest includes `**/__tests__/**/*.{test,spec}.{ts,tsx}` and EXCLUDES `supabase/functions/**/!(strict-schema).test.ts` and `scripts/**`. So:
- Option A: `src/__tests__/p50-ef-sem-posse-de-vaga.test.ts`. The `src/__tests__/` directory exists, and the file runs in `npm run test:run`.
- Option B: placing it under `supabase/functions/_shared/__tests__/` would require widening the exclude glob's named exception. Avoid that.
- Option C: a `node` script in `scripts/` (not part of CI Vitest).

Recommended: A.

**Iterate by FORM, not list.** `pitfall7.grep.test.ts` (lines 33-70) uses a literal path list, which is the anti-pattern CLAUDE.md §Portões names. Instead use `readdirSync(resolve(ROOT,'supabase/functions'))` → every `<slug>/index.ts`. Add a sanity floor (≥ N EFs found, as pitfall7 does with «resolved file count remains >= 10») so an empty directory cannot pass. Regex from RESEARCH Pattern 5: `/created_by\s*!==?\s*user\.id|created_by\s*===?\s*user\.id|vagaRow\.created_by/`. Bite: assert the same regex matches an inline fixture string holding the old line (e.g. `if (!vagaRow || vagaRow.created_by !== user.id) {`).

---

### The 5 EF `index.ts` edits (EF, request-response)

The analog is each file's own live code. All five derive `role` from a live `usuarios_rh` row (`comparativo-candidatos/index.ts:228-240`):

```ts
    .eq("ativo", true)
    .is("deleted_at", null)
    .maybeSingle();
  const dbRole = (rhRow?.role as string | undefined) ?? null;
  const role = dbRole === "recrutador"
    ? "rh"
    : dbRole === "administrador"
      ? "administrador"
      : dbRole;
  if (role !== "rh" && role !== "administrador") {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }
```

This block stays as is. It is the EF equivalent of `is_active_rh_user()`.

| EF | Delete | Keep (D-09 integrity) | Watch out |
|---|---|---|---|
| `comparativo-candidatos/index.ts` | lines 270-290 (block `3b`, `if (role === "rh") { … vagaRow.created_by !== user.id … }`) | block `3c` lines 292-330 (`forasteira = cands.length !== ids.length \|\| cands.some((c) => c.vaga_id !== body.vaga_id)`). Its comment at 316-320 says «a posse de `body.vaga_id` foi verificada acima»; reword it, because ownership no longer exists and `body.vaga_id` is only the integrity anchor | after deletion `body.vaga_id` is never checked to exist. `3c` still forces every candidatura to belong to it, so a nonexistent vaga yields 403 via `forasteira` |
| `get-curriculo-url/index.ts` | lines 175-194 (step 5, including the WR-01 oracle comment) | `.is("deleted_at", null)` at line 165; `NOT_FOUND` at 171; step 5b (404 sem CV) | `.select("curriculo_url, vaga_id")` may drop `vaga_id` if nothing else reads it |
| `consolidar-decisao-final/index.ts` | lines 336-338 (`if (role === "rh" && vagaRow.created_by !== user.id)`) | the `!vagaRow → 404` at 333-335 | `.select("created_by, pesos_avaliacao")` → `.select("pesos_avaliacao")` (line 328); update the step-3 comment (324-325) |
| `gerar-guia-entrevista/index.ts` | lines 247-249 | `!vagaRow → 403` (244-246) and the candidatura↔vaga cross-check (251-259) | drop `created_by` from the select at line 239; update comment 236-237 |
| `avaliar-transcricao-entrevista/index.ts` | lines 240-244 (`if (role === "rh") { … }`) | the `!candRow → 403` at 232-234 | `.select("titulo, created_by")` → `.select("titulo")`. Admin path tolerated `vagaRow` null before; check later reads of `vagaRow.titulo` are null-safe for rh too, since the rh branch previously guaranteed non-null |

Deploy each with `node efdeploy.cjs <slug>`. All five are `true` in the `VERIFY_JWT` table (`efdeploy.cjs:44-56`), so no flag is needed.

---

### EF Deno tests (flip ownership 403 → 200)

| File | Test to flip (line) | Mock knob | New assertions |
|---|---|---|---|
| `comparativo-candidatos/__tests__/index.test.ts` | `"C1 — rh who does NOT own the vaga → 403 FORBIDDEN"` (295-308) | `makeMockSupabaseAdmin(rowsForVaga("v1", ["c1","c2"]), "rh-other")`; `vagaOwner` feeds `{ created_by: vagaOwner }` at line 212 | active rh, vaga owned by `rh-other` → 200. Keep the test at ~line 620 (candidatura from another vaga → 403, `3c`). Its comment «O RH é dono de v1» needs rewording |
| `get-curriculo-url/index.test.ts` | `"authed rh NOT owning the vaga (created_by ≠ uid) → 403 FORBIDDEN"` (183-196); header list lines 17-27; `OTHER_UID` line 40 | `vaga: { created_by: OTHER_UID }` | → 200 with signedUrl. Test (5b) at 228-245 asserts admin `reads.vagas === 0`; after the edit rh also reads 0 vagas, so add that assertion for rh |
| `consolidar-decisao-final/__tests__/index.test.ts` | `"authorize — rh who does NOT own the vaga → 403 FORBIDDEN"` (404-413) | 3rd arg `"rh-other"` | → 200. The admin test at 415-422 stays |
| `avaliar-transcricao-entrevista/__tests__/index.test.ts` | `"RH que não é dono da vaga ⇒ 403, sem IA e sem gravação"` (849-860) | `makeMockSupabaseAdmin({ vagaOwner: "outro-rh" })`; mock line 252 | → success path (AI called, rpc recorded). Keep `"sem linha ativa em usuarios_rh ⇒ 403"` (862-871): it is the inactive/non-RH negative |
| `gerar-guia-entrevista` | no index test exists (only `_local/*.test.ts`); `merge-preserve.test.ts:178` mocks `created_by: OWNER_ID`, which becomes unused but harmless | — | optional new test; at minimum rely on the source probe |

Run: `deno test --allow-all supabase/functions/<slug>/`.

---

### Legacy smokes (test, PROD)

**Pair pattern analog:** `p44_pedidos_dados_smoke.sql` (k) lines 606-665 (positive and negative in the same rolled-back scenario, with the population check).

Concrete notes per file (from reading):
- `p44_pedidos_dados_smoke.sql` (k): the «dono-de-nada» actor is `gen_random_uuid()` with role `rh` (lines 637-643). After Phase 50 that uuid has **no `usuarios_rh` row**, so the helper is false and it still sees 0. The negative half stays valid, now standing for "rh claim without an active row" rather than "owns nothing". Its message at 660 («não está filtrando por created_by») becomes false. The `v_ve_orfao = false` assertion (656-658) and all of (l) (712-714) **invert**: the orphan becomes visible to active rh (D-03).
- `p37_fidelidade_schema_smoke.sql` (e) lines 439-466: stays green only if `rh_le_notificacoes.qual` equals `rh_gerencia_agendamento.qual` byte for byte and roles = `{authenticated}`. Also, `strpos(qual,'administrador') > 0` (line 449) must still hold. The messages «join-through vaga-scoped WR-04» at 462 and 466 need rewording.
- `funil34_kpis_smokes.sql` lines 37-41: recA/recB are chosen as "active usuarios_rh with no vagas". After Phase 50 both see everything. This smoke uses the older write-then-DELETE fixture idiom (lines 34-37, 46-51), not a subtransaction. Do not expand that idiom. Rewrite the clauses as a pair, and prefer wrapping the fixture in a P-SQLSTATE subtransaction.
- `p49_44_resposta_caso_aberto_smoke.sql` (d), lines 361-366 and 579-582: «inexistente com rh do dono ⇒ 42501» becomes P0002. Header lines 51-58 and the M1 row in the mutation table (line 94, «RPC sem a condição de posse do rh») become obsolete, and `p49_44_mutacoes.cjs` M1 (line 77, anchor `' OR v_dono IS DISTINCT FROM v_uid'`) will hit «ANCORA AUSENTE» against the new body. The p49_44 runner reads the **p49_44 migration file**, not the live body, so it keeps running as a historical proof. State that explicitly in the plan rather than editing the historical migration.
- `p45_motor_exclusao_smoke.sql:3055-3056`: md5 pins `35d451416c22e150e48a583d879fe48d` (plano) and `4624854408950110cbfebc971481145a` (anonimizar). Do not touch.

Before editing any smoke, run the CLAUDE.md shape sweep and write the population into the new smoke's header, as p49_44 lines 108-124 do («População da forma: 326 linhas. Achados que tocam esses objetos: 0 …»).

---

## Shared Patterns

### Apply path (all migrations)
**Source:** `p46apply.cjs` (usage at lines 25-30), and CLAUDE.md §Via de apply ATUAL
**Apply to:** the 3 migrations, the smoke, the mutation runs
```
node p46apply.cjs migrate <arquivo...>   aplica migration(s) + registra no ledger
node p46apply.cjs run <arquivo...>       executa arquivo(s) SEM registrar (smokes)
node p46apply.cjs sql "<query>"          executa uma query solta
```
After every apply visible in the UI: `git log --oneline origin/main..HEAD` must be empty.

### Rehearsal ("ensaio")
**Source:** `scripts/p49_44_mutacoes.cjs` lines 38-39, 119, 142-148
**Apply to:** each migration before its real apply
`PREFIXO + migration(s) + smoke + DO $ens$ BEGIN RAISE EXCEPTION '<SENTINELA>'; END $ens$;` run by `p46apply.cjs run`. It must reach the sentinel with no `P50C FAIL`. Then a read-only query confirms the ledger and catalog are unchanged.

### Fail-closed role guard (DEFINER RPCs)
**Source:** `20261003000001_p49_44_…sql` lines 241-247 (quoted above)
**Apply to:** all 18 rewritten functions, mandatory for `reprocessar_analise` and `salvar_revisao_redacao` (D-04)

### ACL idiom (DEFINER functions)
**Source:** `20261003000001_p49_44_…sql` lines 295-297 + rationale line 163-165
**Apply to:** `is_active_rh_user()` and the 6 rewritten functions with `anon=X`
`REVOKE ALL … FROM PUBLIC; REVOKE ALL … FROM anon; GRANT EXECUTE … TO authenticated, service_role;`

### Error codes
**Source:** p49_44 lines 155-158 and the bodies above
`RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege'` (42501) for authz, `no_data_found` (P0002) for not found. Keep each function's existing spelling: `'42501'` and `insufficient_privilege` are the same SQLSTATE.

### Messages and naming
Gate exception prefixes follow `P49-44 PRE-PORTAO:` / `POS-PORTAO:` / `P49C FAIL (<letra>):`. Use `P50-NN PRE-PORTAO`, `P50C FAIL`. Messages are in pt-BR without accents inside SQL string literals (house style throughout both analogs), and every message says what to do next («medir de novo e decidir A MAO»).

### EF error response
**Source:** all 5 EFs: `return errorResponse("FORBIDDEN", "Acesso negado.", 403);`. Unchanged. Only the ownership branches are removed.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `scripts/p50_sessao_real.cjs` (optional) | utility | request-response (GoTrue password grant with the anon key) | No script in the repo performs a real-user login. Follow RESEARCH §Environment Availability: credentials from env typed by the operator, never printed. Borrow the dependency-free (Node built-ins only) style of `scripts/p49_44_mutacoes.cjs` and the masked-output rule of `scripts/assert-no-secrets.mjs` (header lines 27-30: never echo the secret) |
| `ALTER POLICY` DDL | — | — | No migration in the repo uses `ALTER POLICY` (grep = 0). Use RESEARCH Pattern 2 text. The closest DDL is `CREATE POLICY … TO authenticated USING (public.helper())` in `20260713000001_usr_rh_rls_seg02.sql:109-113` |
| SC3 catalog-wide `prosrc` regex scan + `pg_temp` bite | — | — | No existing smoke scans `pg_proc.prosrc` by regex across schemas. Use RESEARCH Pattern 5 SQL verbatim |

---

## Metadata

**Analog search scope:** `supabase/migrations/` (latest p49 files + helper/view precedents), `supabase/tests/` (p49_44, p44, p37_fidelidade, funil34, p45), `scripts/`, `p46apply.cjs`, `efdeploy.cjs`, the 5 EF `index.ts` + their Deno tests, `vite.config.ts`, Vitest source-probe tests under `src/` and `supabase/functions/_shared/__tests__/`.
**Files scanned:** ~35 read or grepped; 15 analog paths confirmed tracked with `git ls-files`.
**Pattern extraction date:** 2026-10-05
