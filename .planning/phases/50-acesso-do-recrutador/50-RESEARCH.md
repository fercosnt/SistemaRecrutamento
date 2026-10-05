# Phase 50: Acesso do Recrutador - Research

**Researched:** 2026-10-05
**Domain:** Postgres RLS + SECURITY DEFINER authorization rewrite (Supabase), Edge Function authz, access-control gates
**Confidence:** HIGH for the inventory (measured live in PROD this session, read-only). MEDIUM for design choices. Every choice is flagged where the operator could reasonably pick differently.

> **How this was measured.** Every PROD number below comes from `node p46apply.cjs sql "SET TRANSACTION READ ONLY; …"`, run in this session on 2026-10-05. Nothing was written to PROD. Impersonation reads used `SET LOCAL ROLE authenticated|anon` plus `set_config('request.jwt.claims', …, true)` inside a read-only transaction.

<user_constraints>
## User Constraints (no CONTEXT.md — operator decision recorded in ROADMAP.md §Phase 50 and `44-PENDENCIAS-2026-10-03.md` §G4-b)

### Locked Decisions (verbatim from the sources)
- `44-PENDENCIAS-2026-10-03.md:84-86`, operator, 2026-10-04: «acho nesse momento melhor deixar o recrutador ver todas as vagas abertas, nao precisamos selecionar neste momento, ou se achar melhor assiciar vagas a recrutadores, mas nao ele so ver as que ele criou»
- `44-PENDENCIAS-2026-10-03.md:88-89`: «**Decidido:** o predicado `vagas.created_by = auth.uid()` **sai**. Preferência do operador: recrutador ativo vê **todas** as vagas; associação por vaga é alternativa aceitável. Opção (d) descartada.»
- ROADMAP.md §Phase 50 **Origem**: «"todas" = inclusive inativas e arquivadas» (operator answer of 2026-10-05, per STATE.md:28 «respondido «todas» (2026-10-05) → **Phase 50 criada**»).
- ROADMAP **Guardrails** (verbatim): «migrations pelo `p46apply.cjs` (SQL lido do arquivo, md5 conferido no ledger), EFs pelo `efdeploy.cjs`, `git log --oneline origin/main..HEAD` vazio depois de todo apply visível. É mudança de **controle de acesso** (alarga leitura): review bloqueante antes do apply, e prova de que nada abriu para `anon`/candidato (lembrar: views sem `security_invoker` ignoram RLS)»
- ROADMAP Success Criteria 1–5 (copied in `<phase_requirements>` below) are binding.

### Claude's Discretion (no CONTEXT.md exists, so everything not locked above is discretion)
- Helper predicate name and shape, migration split, smoke design, EF edit shape, how the "sessão real" proof is collected.

### Deferred Ideas (OUT OF SCOPE — verbatim from ROADMAP)
- «associação vaga↔recrutador e qualquer granularidade por vaga; JORN-42..49 (Bloco 3, fase a criar)»
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXPORT-05 (half «visível ao RH», gap G4-b) | `REQUIREMENTS.md:96`: «Pedido de acesso atendido dentro do prazo do **Art. 19, II** (15 dias corridos) — ⚠ marca da fase, **rebaixada a parcial** pela `44-VERIFICATION.md`: a metade «visível ao RH» não vale para recrutador nenhum» | The live bodies of `listar_pedidos_dados` / `contar_pedidos_dados_pendentes` (§Inventory F) carry `WHERE vg.created_by = v_uid`. The rewrite in §Pattern 3 makes the `rh` branch return exactly the admin's set (SC4). |
| SC1 | An **active** recrutador who created no vaga sees, in PROD, candidaturas of an active, an inactive and an archived vaga. Proven with a real recrutador session, not only by impersonation | §Inventory A/B (14 policies), §SC1 targets (3 vagas with real candidaturas measured), §Validation (real-session checkpoint) |
| SC2 | An **inactive** recrutador and a candidato still see none of it (negative assertion per role). The administrator loses nothing | §Helper (live `ativo` check closes the 1 h stale-JWT window), §Baselines (anon/candidato/admin measured pre-change) |
| SC3 | The shape sweep no longer finds `created_by = auth.uid()` in any RH read/write policy or function (except where `created_by` means authorship, not authorization). The gate bites: reintroducing the predicate in an object fails | §Inventory classification (18 AUTHZ / 4 AUTHORSHIP functions; 14/14 policies AUTHZ; 5 EFs), §Pattern 5 (gate + pg_temp bite) |
| SC4 | The review-request and data-request queues show the recrutador the same items they show the administrador | §Pattern 3 (queue RPCs: `rh` branch identical to admin), §Validation SC4 (row-set equality excluding `pode_responder`) |
| SC5 | Owner gates that exist as a business rule (e.g. REVISAO-05) still hold | §Inventory G: REVISAO-05 lives in `responder_revisao_decisao` (`v_uid = v_row.por_usuario`), D-23 in `registrar_decisao` (`d.por_usuario = v_uid`). Neither uses `created_by`, and both stay untouched |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Migrations are applied with **`node p46apply.cjs migrate <file>`**: SQL read from the file, migration plus ledger row in ONE request, md5 checked against the ledger. No `BEGIN;…COMMIT;` wrapper (42601 trigger). The header carries `APLICAR COM: node p46apply.cjs migrate <path>`.
- Edge Functions are deployed with **`node efdeploy.cjs <slug>`**. `verify_jwt` comes from the script's table. All 5 EFs touched here are `true`.
- After every apply with a visible effect: `git log --oneline origin/main..HEAD` must print **empty**. Vercel deploys from `main`, and Supabase is a separate channel.
- **Gates by FORM, not by symptom.** No smoke may compare against a constant that will age. Use a baseline captured in the same run (`to_jsonb` fingerprint). Prove the gate still bites after a fix. Before adding an object watched by a smoke, run the CLAUDE.md shape regex over `supabase/tests/*.sql`.
- Never use service_role on the client. Privileged operations go through EFs.
- RLS is on for 100% of user-data tables.
- `database.types.ts` is never edited by hand. The memory note says `npm run db:types` can hang and truncate the file: run it with `< /dev/null` and check the size is non-zero.
- Product language: «avaliação comportamental/cognitiva». The system NEVER rejects a candidato automatically (RNF-07a). Neither rule is touched here.
- Domain in pt-BR, technical code in en. Components use named exports.
- Memory rules that apply: writes to PROD are additive-autonomous and destructive-gated; re-review the fix before apply; "população vazia mente nas duas direções"; "exposição a anon inclui views"; "portão é código: varrer pela forma"; "janelas paralelas: esta é a verificadora".

## Summary

The defect is narrower than "the recrutador can't see vagas" and wider than the ROADMAP snapshot.

**Narrower.** The recrutador **already sees every vaga**. The `vagas` policy «RH vê todas vagas» is `EXISTS (usuarios_rh … ativo = true AND deleted_at IS NULL)` with no ownership. What he cannot see is everything hanging off a candidatura. Measured today: an active `rh` claim that owns no vaga sees **15 vagas, 0 candidaturas, 0 decisões, 0 revisões, 0 pedidos**. The administrador sees **40 / 7 / 3 / 3**.

**Wider than the ROADMAP.**
- Policies: **14**, which matches the snapshot.
- Functions mentioning `created_by`: **22**, not ~14. Of these, **18** are authorization gates and **4** are authorship (keep).
- Edge Functions: **5** gate on `vagas.created_by`, not just the 49-08 comparativo: `comparativo-candidatos`, `get-curriculo-url`, `consolidar-decisao-final`, `gerar-guia-entrevista`, `avaliar-transcricao-entrevista`. The ROADMAP named only one. Missing `get-curriculo-url` would leave the recrutador unable to open any CV.

**Front end.** No client-side `created_by` filter exists. Widening RLS alone surfaces the rows, and the UI needs only comment updates.

**Recommended approach.** Add one helper, `public.is_active_rh_user()`: SECURITY DEFINER, STABLE, `search_path = ''`, a live `EXISTS` on `usuarios_rh` for the caller with `ativo` and `deleted_at IS NULL`. Every widened object calls it.
- **Policies:** every one keeps its `administrador` branch byte-identical, which makes SC2 "admin loses nothing" true by construction. The `rh` branch's `vaga_id IN (… created_by = auth.uid())` subquery becomes `(select public.is_active_rh_user())`. Rewrite with `ALTER POLICY … TO authenticated USING … [WITH CHECK …]`, not DROP+CREATE.
- **Functions:** the `IF v_role = 'rh' AND v_owner IS DISTINCT FROM auth.uid()` lines become `IF v_role = 'rh' AND NOT public.is_active_rh_user()`.
- **EFs:** they already derive the role from a **live, active** `usuarios_rh` row, so the `created_by !== user.id` comparisons are simply deleted.

The live check matters. `jwt_exp` is **3600 s** and «desativar» does not sign the user out. Without the check, a deactivated recrutador keeps all-vagas access for up to an hour on his old token.

**Primary recommendation:** ship it as three atomic migrations (helper + 14 policies → queue/read RPCs → write RPCs), 5 EF redeploys, one new form-based gate smoke with a `pg_temp` bite proof, and rewritten legacy smokes. Rehearse each migration plus smoke in a single rolled-back request (the 49-44 "ensaio" idiom). Then collect the real-session proof with a recrutador the **operator** creates in `/rh/configuracoes`. Do NOT reactivate `recrutador.rh@teste.com`: its address hard-bounces.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Who counts as "active recrutador" | Database (`usuarios_rh` + helper) | Auth hook (JWT `app_metadata.role`) | The hook stamps the role at token issue. Only a live DB read reflects «desativar» within the 1 h token lifetime |
| Row visibility of candidatura-derived tables | Database (RLS, 14 policies) | — | PostgREST reads directly. RLS is the only barrier, and anon has table SELECT on most of these tables |
| Queue contents (pedidos de dados, revisões) | Database (SECURITY DEFINER RPCs) | — | DEFINER bypasses RLS, so the body's predicate is the whole control |
| Write actions (decidir, rejeitar, liberar cognitivo, salvar avaliação…) | Database (SECURITY DEFINER RPCs) | — | Same: the body guard is the only control |
| AI / CV operations (comparativo, guia, transcrição, consolidação, CV URL) | API (Edge Functions, service_role) | Database (`usuarios_rh` lookup) | The EF reads with service_role, so the EF body is the only control |
| Showing the rows | Browser (React) | — | No client filter exists. RoleGuard already admits `['rh','administrador']` on all RH routes |

## Live Inventory (the plan)

### A. RLS policies with `created_by`: **14** (all AUTHORIZATION, all widen) [VERIFIED: PROD `pg_policies`, 2026-10-05]

Two predicate shapes, quoted verbatim from `pg_policies.qual`.

**Shape A (keyed by `vaga_id`)** — `analise_candidato_vaga.rh_le_analise`, `comparativo_solicitado.rh_le_comparativo`, `candidaturas.rh_avanca_etapa` (USING and WITH CHECK):
```
((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (vaga_id IN ( SELECT vagas.id
   FROM vagas
  WHERE (vagas.created_by = ( SELECT auth.uid() AS uid))))))
```
`candidaturas.rh_le_candidaturas` is Shape A plus `AND (deleted_at IS NULL) AND (is_rascunho = false)` in the `rh` branch.

**Shape B (keyed by `candidatura_id`, join-through)** — all the others:
```
((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (candidatura_id IN ( SELECT c.id
   FROM (candidaturas c
     JOIN vagas v ON ((v.id = c.vaga_id)))
  WHERE (v.created_by = ( SELECT auth.uid() AS uid))))))
```

| # | table.policy | cmd | roles | shape | md5(qual‖'\|'‖with_check) baseline |
|---|---|---|---|---|---|
| 1 | agendamentos_entrevista.rh_gerencia_agendamento | ALL | {authenticated} | B (USING+CHECK) | c754871ab4282a43970ac4ff7adcc2a3 |
| 2 | analise_candidato_vaga.rh_le_analise | SELECT | {public} | A | d4e7e94c496cb493efc9c31e923f6cbd |
| 3 | candidaturas.rh_avanca_etapa | UPDATE | {public} | A (USING+CHECK) | 7cbcf97ad0b1da27c508eaacba5ab0aa |
| 4 | candidaturas.rh_le_candidaturas | SELECT | {public} | A + deleted/rascunho | 34060c39f6f61e65613e15a093222691 |
| 5 | comparativo_solicitado.rh_le_comparativo | SELECT | {public} | A | d4e7e94c496cb493efc9c31e923f6cbd |
| 6 | decisao_final.rh_le_decisao_final | SELECT | {public} | B | b6abcc34e20e42c3d08fbe81251d381c |
| 7 | decisao_final_historico.rh_le_decisao_final_historico | SELECT | {public} | B | b6abcc34e20e42c3d08fbe81251d381c |
| 8 | entrevista_analises.rh_le_entrevista_analises | SELECT | {public} | B | b6abcc34e20e42c3d08fbe81251d381c |
| 9 | entrevista_guias.rh_le_entrevista_guias | SELECT | {public} | B | b6abcc34e20e42c3d08fbe81251d381c |
| 10 | historico_candidatura.rh_le_historico | SELECT | {authenticated} | B | b6abcc34e20e42c3d08fbe81251d381c |
| 11 | notificacoes_enviadas.rh_le_notificacoes | SELECT | {authenticated} | B | b6abcc34e20e42c3d08fbe81251d381c |
| 12 | redacoes_candidato.redacao_rh_select | SELECT | {authenticated} | B | b6abcc34e20e42c3d08fbe81251d381c |
| 13 | redacoes_candidato.redacao_rh_update | UPDATE | {authenticated} | B (USING+CHECK) | c754871ab4282a43970ac4ff7adcc2a3 |
| 14 | scores_candidato.rh_le_scores | SELECT | {public} | B | b6abcc34e20e42c3d08fbe81251d381c |

**Delta vs ROADMAP (2026-10-04):** none for policies. There are 14, and the names match. Storage policies: **0** mention `created_by` (curriculos are reached only through the `get-curriculo-url` EF).

**What the rest of the RH surface already does (precedent for the helper's shape)** [VERIFIED: PROD `pg_policies`]:
- `vagas."RH vê todas vagas"`: `(EXISTS ( SELECT 1 FROM usuarios_rh WHERE ((usuarios_rh.user_id = ( SELECT auth.uid() AS uid)) AND (usuarios_rh.ativo = true) AND (usuarios_rh.deleted_at IS NULL))))`
- `candidatos."RH pode ler todos os candidatos"`: the same `EXISTS … ativo = true AND deleted_at IS NULL`.
- 9 role-only policies (e.g. `devolutivas_candidato.rh_le_devolutivas`): `(( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = ANY (ARRAY['rh'::text, 'administrador'::text]))`.

So "active RH sees all" is **already the rule** for vagas and candidatos. The 14 policies are the inconsistent minority.

### B. Functions in `public` whose source mentions `created_by`: **22** [VERIFIED: PROD `pg_proc.prosrc`, 2026-10-05]

All 22 are `SECURITY DEFINER` except `criar_preferencias_padrao` (trigger, invoker). The md5 is `md5(prosrc)`, to be used as the migration pre-gate baseline.

| Function | Class | The authz line today (verbatim) | md5(prosrc) |
|---|---|---|---|
| `confirmar_revisao_entrevista(uuid)` | AUTHZ-write | `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` | 43df21b884807c2f9ee57d45bdd70065 |
| `contar_pedidos_dados_pendentes()` | AUTHZ-queue | `WHERE vg.created_by = v_uid)))` | fea910fd19a23a219307d1068024c06f |
| `contar_revisoes_pendentes()` | AUTHZ-queue | `AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))` | 14ef44037db54fa70304743ae8ef0010 |
| `funil_kpis(uuid)` | AUTHZ-read | `WHERE (v_is_admin OR v.created_by = v_uid)` (×4 CTEs) | c4eb15744881377baac7c0e246d1a538 |
| `ler_resposta_caso_aberto_sjt(uuid)` | AUTHZ-read | `IF v_role = 'rh' AND (NOT v_achou OR v_dono IS DISTINCT FROM v_uid) THEN` | 6d15c5cc05edfc370eb48253541cbecd |
| `liberar_cognitivo(uuid,text)` | AUTHZ-write | `IF v_role = 'rh' AND v_owner IS DISTINCT FROM v_uid THEN` | 5d72a3d5137c82d29e49ef8e9f61e13d |
| `listar_historico_candidatura(uuid)` | AUTHZ-read | `IF v_role = 'rh' AND NOT EXISTS ( … AND v.created_by = (select auth.uid()) ) THEN` | 770e20574cd086d05db796939f8e9298 |
| `listar_pedidos_dados(boolean)` | AUTHZ-queue | `WHERE vg.created_by = v_uid)))` | a161e8ca5a30cacdf2b33b770752f601 |
| `listar_revisoes_decisao(boolean)` | AUTHZ-queue | `AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))` | d3d4c3a3b956af0f84f41b5c048c4ad9 |
| `registrar_decisao(uuid,decisao_final_resultado,text)` | AUTHZ-write | `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` | 5042fa9331f21ad873cb462208490dcc |
| `rejeitar_candidatura(uuid,motivo_rejeicao_rh,text)` | AUTHZ-write | `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` | 10498a0bef7c8381d58f7634019778b1 |
| `reprocessar_analise(uuid)` | AUTHZ-write | `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` | e0c0f259bff9a9b3b404ef8b26255f17 |
| `revogar_cognitivo(uuid,text)` | AUTHZ-write | `IF v_role = 'rh' AND v_owner IS DISTINCT FROM v_uid THEN` | 7bf59ed2770a48463b0bdce1ab582393 |
| `salvar_avaliacao_entrevista(uuid,jsonb,text)` | AUTHZ-write | `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` | 874a3244acd9f1426ee1a42af7de7c4a |
| `salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` | AUTHZ-write | `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` | 53393f15f0901703203bb315795e5e09 |
| `salvar_revisao_redacao(uuid,text,text,jsonb)` | AUTHZ-write | `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` | 765e2beca39b7479f960986dcee3f1cb |
| `save_entrevista_guia_edits(uuid,text,jsonb)` | AUTHZ-write | `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN` | bfb84079af12449d9563f0ea7af75be7 |
| `upsert_pergunta_opcoes_metadata(uuid,jsonb)` | AUTHZ-write (vaga config) | `IF v_role = 'rh' AND v_owner IS DISTINCT FROM (select auth.uid()) THEN` | c6f8728f78a550d92c1af473343a6797 |
| `anonimizar_candidato(uuid,boolean)` | **AUTHORSHIP** (severs FKs `candidatos/candidaturas/preferencias_notificacoes.created_by` in the erasure motor) | — keep, **md5-pinned by `p45_motor_exclusao_smoke.sql` (C3)** | 4624854408950110cbfebc971481145a |
| `plano_exclusao_titular(uuid)` | **AUTHORSHIP** (lists the same FK columns for the erasure plan) | — keep, **md5-pinned by p45 (C3)** | 35d451416c22e150e48a583d879fe48d |
| `criar_preferencias_padrao()` | **AUTHORSHIP** (`INSERT INTO preferencias_notificacoes (usuario_rh_id, created_by)`) | — keep | 78c56e0f6f9f0a1149c1af31074f630c |
| `criar_usuario_rh_com_audit(uuid,uuid,text,text,text,text)` | **AUTHORSHIP** (INSERT sets `created_by`) | — keep | aae37006bc24b9ba005bd7bda3a726e7 |

**Delta vs ROADMAP:** ROADMAP said «~14 funções que leem `vagas.created_by`» plus 2 queue RPCs. Measured: **18 AUTHZ functions** (16 + the 2 queue RPCs) plus **2 more queue RPCs not named** (`listar_revisoes_decisao`, `contar_revisoes_pendentes` — the **revisões** queue that SC4 covers) plus 4 authorship functions.

**Indirect owner forms checked:** other owner-like columns on `vagas`: only `created_by, updated_by` (plus `responsabilidades`, a text field). No function compares `updated_by` to the caller. `v_dono` / `IS DISTINCT FROM v_uid` without `created_by` appears only in `cancelar_pedido_exclusao`, `registrar_pedido_exclusao`, `retirar_candidatura`. These are **titular (candidato) ownership** gates, out of scope, keep. No policy or function reads `vagas_associadas_recrutadores` besides its own policies (0 rows) [VERIFIED: PROD].

### C. Edge Functions with a `vagas.created_by` gate: **5** [VERIFIED: grep + Read this session]

All five derive the role from a **live** `usuarios_rh` row (`.eq("ativo", true).is("deleted_at", null)`, `recrutador→rh`, `administrador→administrador`). So `role === "rh"` already means "active recrutador", and the fix is pure deletion of the ownership comparison.

| EF | File:lines | Gate (verbatim) | Fix |
|---|---|---|---|
| comparativo-candidatos (the 49-08 one) | `supabase/functions/comparativo-candidatos/index.ts:274-290` | `if (!vagaRow \|\| vagaRow.created_by !== user.id) { return errorResponse("FORBIDDEN", "Acesso negado.", 403); }` inside `if (role === "rh") {…}` | Delete the `3b` block. **Keep `3c`** (`:313-325`, every candidatura must belong to `body.vaga_id`). That is integrity, not ownership |
| get-curriculo-url | `supabase/functions/get-curriculo-url/index.ts:176-194` | `if (!vagaRow \|\| vagaRow.created_by !== user.id) { return errorResponse("FORBIDDEN", …, 403); }` | Delete the `role === "rh"` block. The `NOT_FOUND` order (WR-01 oracle reasoning) becomes moot. Keep the soft-delete filter `.is("deleted_at", null)` |
| consolidar-decisao-final | `supabase/functions/consolidar-decisao-final/index.ts:325-339` | `if (role === "rh" && vagaRow.created_by !== user.id) {` | Delete that `if`. Change `.select("created_by, pesos_avaliacao")` to `.select("pesos_avaliacao")` |
| gerar-guia-entrevista | `supabase/functions/gerar-guia-entrevista/index.ts:235-250` | `if (role === "rh" && vagaRow.created_by !== user.id) {` | Delete that `if`. Drop `created_by` from the select. Keep the candidatura↔vaga cross-check |
| avaliar-transcricao-entrevista | `supabase/functions/avaliar-transcricao-entrevista/index.ts:226-245` | `if (role === "rh") { if (!vagaRow \|\| vagaRow.created_by !== user.id) {` | Delete the block. Change `.select("titulo, created_by")` to `.select("titulo")` |

Each has Deno tests that assert the old ownership 403. Those must flip (§Legacy test disposition). Deploy: `node efdeploy.cjs <slug>` (all `verify_jwt=true` in the `VERIFY_JWT` table, `efdeploy.cjs:44-56`). Test: `deno test --allow-all supabase/functions/<slug>/`.

### D. Views over these tables [VERIFIED: PROD `pg_class.reloptions` + `has_table_privilege`]

| view | security_invoker | owner | anon SELECT | authenticated SELECT | Note |
|---|---|---|---|---|---|
| **v_analises_presas** | **no** (`opts` empty) | postgres | false | **true** | ⚠ **Ignores RLS**, and any authenticated user (a candidato included) can read `candidatura_id, vaga_id, vaga_slug, situacao, erro, …` of stuck analyses. Pre-existing (`20260826000003…:59-60`: `REVOKE ALL … FROM PUBLIC, anon; GRANT SELECT … TO authenticated`). Measured rows today: **0** (so it leaks nothing *today*, which is the empty-population trap). No reader in `src/` |
| v_fila_trabalho | true | postgres | **true** | true | invoker, so it follows RLS. anon currently gets `42501 permission denied for table candidaturas` |
| v_triagem_panel | true | postgres | **true** | true | same |
| v_candidatos_ativos, v_usuarios_rh_ativos (mention created_by) | true | postgres | false | false | no grants, inert |
| others (5) | true | postgres | false | false/— | n/a |

**Recommendation:** in migration 1, `ALTER VIEW public.v_analises_presas SET (security_invoker = true);`. After Phase 50 the RH can read `candidaturas`/`analise_candidato_vaga` through RLS, so the view keeps working for RH and returns nothing to a candidato. Without this change the SC2 negative proof "candidato continua sem ver nada disso" is only true while the view happens to be empty.

### E. Front-end readers [VERIFIED: grep `src/`]

- **No client-side `created_by` filter** anywhere (`grep created_by|createdBy src/**/*.ts{,x}` hits only comments, the admin user table, the receipt constant and `configVagaService.ts:326`, which *writes* authorship).
- All RH routes use `RoleGuard role={['rh','administrador']}` (`src/router/routes.tsx:353-520`). `/rh/revisoes` and `/rh/pedidos-dados` included.
- `VagasRHPage.tsx:64` fetches with `{ apenasAtivas: false }`, meaning all statuses. Status `arquivada` shows under the «todas» filter (`:205-210`). `buildVagasQuery` always filters `.is('deleted_at', null)` (`vagasService.ts:167`).
- The dashboard's «0 Candidatos» (GUIA §7.6) and the vaga list counts come from `candidaturas` via RLS (`vagasService.ts:128-146`), so they widen automatically.
- **Stale comments to update** (no behavior): `vagasService.ts:128-131` («of the vagas they own»), `cvUploadService.ts:184-186`, `useLiberacaoCognitivo.ts:91-95`, `triagemService.ts:364`.
- **Conclusion:** widening RLS + RPCs + EFs alone surfaces the rows. No front-end code change is needed for SC1/SC4.

### F. Queue RPCs (SC4) [VERIFIED: PROD `pg_get_functiondef`]

| RPC | Today's `rh` branch | Admin branch | Population today |
|---|---|---|---|
| `listar_pedidos_dados(true)` | `v_role = 'rh' AND EXISTS (candidatura viva não-rascunho … AND cd.vaga_id IN (… vg.created_by = v_uid))` | `v_role = 'administrador'` (sees orphans too) | **3** rows (0 pending), **0** orphans |
| `contar_pedidos_dados_pendentes()` | same | same | **0** (pending = 0, so this comparison is trivially equal: needs a fixture) |
| `listar_revisoes_decisao(bool)` | `v_role='rh' AND c.deleted_at IS NULL AND c.is_rascunho = false AND c.vaga_id IN (… vg2.created_by = v_uid)` | `v_role = 'administrador'` | **3** total, **2** pending |
| `contar_revisoes_pendentes()` | same | same | **2** |

Measured delta (items admin sees that the rh-only filters would hide): **0** orphan pedidos, **0** revisões on dead/rascunho candidaturas, **0** deleted or rascunho candidaturas in total. So today either design yields equal sets, but only the "identical branch" design is equal **by construction** (§Pattern 3).

`listar_revisoes_decisao` returns `pode_responder = (d.revisao_respondida_em IS NULL AND d.por_usuario IS DISTINCT FROM v_uid)`. This column legitimately differs per caller (it encodes REVISAO-05) and must be **excluded** from the SC4 equality.

### G. Business-rule owner gates that must survive (SC5) [VERIFIED: PROD bodies]

- **REVISAO-05** — `responder_revisao_decisao`: `IF v_uid = v_row.por_usuario THEN RAISE EXCEPTION 'quem registrou a decisao nao pode responder a revisao dela (decisor)' USING errcode = '42501';`. Also `IF v_row.por_usuario IS NULL THEN … '42501'`. No `created_by`. **No vaga-ownership check at all today**, so the RPC already lets any rh respond, and only the queue hid the items.
- **D-23** — `registrar_decisao` (2b): `… d.revisao_veredito = 'revertida' AND d.decisao = 'rejeitado' AND d.por_usuario = v_uid` (also over `decisao_final_historico`). Stays untouched (it sits in the body we rewrite; keep it byte-identical).
- UI copy that depends on it: `FilaRevisoesTable.tsx:98` / `ResponderRevisaoDialog.tsx:118` «Quem registrou a decisão não pode responder à revisão dela…». Unchanged.

### H. How "recrutador ativo" is defined today [VERIFIED: PROD `custom_access_token_hook`, executed read-only]

- The hook reads `usuarios_rh WHERE user_id = … AND ativo = true AND deleted_at IS NULL`, mapping `'recrutador' → 'rh'` and `'administrador' → 'administrador'` (`ELSE rh_role_db`). With no active RH row it falls to `candidatos`, then defaults to `COALESCE(user_role, 'candidato')`.
- **Executed read-only today:** for `fba9bc0f-…` (recrutador, `ativo=false`) the hook returns `{"role": "candidato"}`. For `023abcd6-…` (admin, active) it returns `{"role": "administrador"}`.
- `usuarios_rh.check_role`: `CHECK (((role)::text = ANY ((ARRAY['administrador'::character varying, 'gerente'::character varying, 'recrutador'::character varying, 'visualizador'::character varying])::text[])))`. `gerente` and `visualizador` get JWT roles `gerente` / `visualizador`, which enter no branch today and none after.
- Auth config (Management API `GET /config/auth`, read-only): `jwt_exp: 3600`, `hook_custom_access_token_enabled: True`, `hook_custom_access_token_uri: 'pg-functions://postgres/public/custom_access_token_hook'`.
- `gerenciar-usuario-rh` «desativar» is a DB-only mutation. grep finds **no `signOut`** in the EF, so the old JWT stays valid for up to 1 h.
- Existing helper: `public.is_active_rh_admin()` — STABLE SECURITY DEFINER, `SET search_path TO 'public'`, `EXISTS (… user_id = auth.uid() AND role = 'administrador' AND ativo AND deleted_at IS NULL)`, ACL includes `anon=X`. Used by `usuarios_rh.usuarios_rh_admin_select`.

### I. Roster and data available for proofs [VERIFIED: PROD]

`usuarios_rh` (7 rows):
- `fernando…` admins `4fceff36-…` (active, 3 vagas, also has a candidatos row), `023abcd6-…` (active, 0 vagas), `66412f96-…` (active, 0 vagas).
- `e2e.admin@beautysmile.com.br` admin inactive.
- `admin.rh@teste.com` admin inactive.
- `recruiter@teste.com` **administrador** (despite the name), inactive, 3 vagas.
- `recrutador.rh@teste.com` **the only recrutador**, `ativo=false`, 0 vagas, last sign-in 2026-06-26.
- **There is no active recrutador in PROD today.**

Vagas: 2 `ativa`, 4 `inativa`, 9 `arquivada` (1 of them soft-deleted). Vagas with live candidaturas (SC1 targets):

| status | vaga id | título (truncated) | live candidaturas |
|---|---|---|---|
| ativa | e897f709-d4e7-4f6c-a25b-a433d2eda525 | Social Media — Produção e Captação de Conteúd… | 11 |
| ativa | fdbe1a4a-0c15-4659-a589-e9d8f2f9ff98 | Consultor(a) de Relacionamento e Pré-vendas | 8 |
| inativa | 629a5f31-aee1-4034-9071-240ae2937250 | [TESTE E2E] Social Media junior 1— Produção e… | 1 (**the only** inactive vaga with a candidatura) |
| arquivada | 9f6ccf1a-ef25-4425-a312-6cc2a23a388e | Dev Backend | 3 |
| arquivada | (7 more, incl. 3 `fixture-p46 … (sintetica)` with 9 synthetic candidaturas) | | |

Total live candidaturas: **40** (= what the admin sees).

**Pre-change baselines (read-only impersonation, 2026-10-05):**

| caller | candidaturas | vagas | decisao_final | listar_revisoes_decisao(true) | listar_pedidos_dados(true) |
|---|---|---|---|---|---|
| `rh` claim, sub `023abcd6` (active RH row, owns 0 vagas) | **0** | 15 | 0 | 0 | 0 |
| `rh` claim, sub `fba9bc0f` (inactive recrutador = stale token) | 0 | 2 | 0 | 0 | 0 |
| `administrador` claim, sub `4fceff36` | **40** | — | **7** | **3** | **3** |
| `candidato` claim, sub `9da88a43-…` | 2 (own) | — | 0 | — | — |

anon per table today: `42501` on `candidaturas`, `decisao_final`, `decisao_final_historico`, `historico_candidatura`, `entrevista_guias`, `entrevista_analises`, `scores_candidato`, `notificacoes_enviadas`, `v_analises_presas`, `v_fila_trabalho`, `v_triagem_panel`. **0 rows** on `analise_candidato_vaga`, `comparativo_solicitado`, `redacoes_candidato`, `agendamentos_entrevista`. (anon has table SELECT on most of these. The 42501s come from candidate-own policies subquerying `candidatos`, which anon cannot read.)

## Standard Stack

No new library. Everything uses what the repo already runs.

| Component | Version (measured) | Purpose |
|---|---|---|
| Postgres RLS + `ALTER POLICY` | Supabase PROD | Rewrite the 14 policies in place |
| `p46apply.cjs` | repo root | Apply migrations (file to Management API, ledger md5 check), run smokes (`run`), read-only queries (`sql`) |
| `efdeploy.cjs` | repo root | Deploy the 5 EFs (files read from disk, import closure checked) |
| Deno | 2.9.4 | `deno test --allow-all supabase/functions/<slug>/` |
| Vitest | repo (`npm run test:run`) | Front-end tests. Optional source probe for the EF gate |
| Node | v24.18.0 | Scripts (`p46apply`, `efdeploy`, mutation script, optional real-session script) |
| Supabase CLI | 2.116.0 | Only for `npm run db:types`, if regenerated |

**Installation:** none.

## Package Legitimacy Audit

Not applicable: this phase installs **no** external packages (SQL, existing Deno EFs, existing Node scripts).

**Packages removed due to [SLOP] verdict:** none · **Packages flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
                     ┌────────────────────────────── login (GoTrue) ───────────────────────────┐
 recrutador ─────────►  custom_access_token_hook: usuarios_rh(ativo, !deleted) → app_metadata.role│
                     └──────────────────────┬──────────────────────────────────────────────────┘
                                            │ JWT (role='rh', exp 3600s)
             ┌──────────────────────────────┼───────────────────────────────┐
             ▼                              ▼                               ▼
   PostgREST table read             PostgREST /rpc/<fn>              functions.invoke(EF)
   (candidaturas, decisao_…)        (SECURITY DEFINER)               (service_role inside)
             │                              │                               │
             ▼                              ▼                               ▼
   RLS policy (14)                  body guard:                      EF: role ← usuarios_rh
   admin branch  ── unchanged       coalesce(role) ∈ {rh,admin}      (ativo, !deleted) live
   rh branch: jwt='rh' AND          rh: NOT is_active_rh_user()      rh: NO ownership compare
   (select is_active_rh_user()) ◄───┴──── same helper ──────────────► (already live-active)
             │                              │                               │
             └──────────────► is_active_rh_user(): EXISTS usuarios_rh ◄─────┘ (EF uses its own
                              WHERE user_id = auth.uid() AND ativo                 equivalent lookup)
                              AND deleted_at IS NULL   (DEFINER, STABLE, search_path='')
                                            │
                     business gates untouched: REVISAO-05 (por_usuario ≠ uid),
                     D-23 (revertida decisor), candidatura↔vaga integrity (comparativo 3c,
                     trg_agendamento_normaliza_vaga)
```

### Recommended file layout

```
supabase/migrations/
  2026100X000001_p50_helper_policies.sql      # helper + 14 ALTER POLICY + v_analises_presas invoker
  2026100X000002_p50_rpcs_leitura_filas.sql   # 4 queue RPCs + funil_kpis + listar_historico + ler_resposta_caso_aberto_sjt
  2026100X000003_p50_rpcs_escrita.sql         # 11 write RPCs (registrar_decisao … upsert_pergunta_opcoes_metadata)
supabase/tests/
  p50_acesso_recrutador_smoke.sql             # SC1-SC5 + shape gate + pg_temp bite; ends in SELECT json_build_object(...) AS resultado
scripts/
  p50_mutacoes.cjs                            # bite proofs per migration (49-44 idiom)
  p50_sessao_real.cjs                         # optional: password-grant real JWT → counts (operator-run)
supabase/functions/{comparativo-candidatos,get-curriculo-url,consolidar-decisao-final,
                    gerar-guia-entrevista,avaliar-transcricao-entrevista}/index.ts (+ tests)
```
The version must be greater than the ledger head `20261003000001` [VERIFIED: PROD ledger]. File names follow `^\d{14}_.+\.sql$` (`p46apply.cjs:88-91`).

### Pattern 1: The helper (the ONE predicate every widened object calls)

**What:** a live "is the caller an active, non-deleted RH user" check, mirroring the predicate already used by «RH vê todas vagas».
**Why not JWT-only:** JWT `rh` survives deactivation for up to `jwt_exp = 3600` s, because desativar does not sign the user out.
**Why not role-filtered (`role = 'recrutador'`) inside the helper:** every caller already requires JWT `= 'rh'`, which the hook issues only for `recrutador`. Keeping the helper role-agnostic makes it byte-for-byte the predicate the vagas/candidatos policies already use, and lets smokes impersonate with real active rows without writing to PROD (no active recrutador exists). Trade-off: a token issued while `recrutador` stays valid for ≤1 h if the role is changed to `visualizador` while still `ativo`. Accept, or add `AND role = 'recrutador'` (then smokes must flip `recrutador.rh@teste.com` to `ativo=true` inside their rolled-back transaction). Planner's call. Recommended: role-agnostic.

```sql
-- Proposed new object (name is a proposal, not an existing repo value).
-- Shape follows the Supabase-documented DEFINER helper [CITED: supabase.com/docs/guides/auth/row-level-security]
-- and the live predicate of vagas."RH vê todas vagas" [VERIFIED: PROD pg_policies].
CREATE OR REPLACE FUNCTION public.is_active_rh_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_rh u
     WHERE u.user_id = (SELECT auth.uid())
       AND u.ativo = true
       AND u.deleted_at IS NULL
  );
$$;
REVOKE ALL ON FUNCTION public.is_active_rh_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_rh_user() FROM anon;      -- anon NAMED: pg_default_acl grants anon=X directly
GRANT EXECUTE ON FUNCTION public.is_active_rh_user() TO authenticated, service_role;
```
- `usuarios_rh_user_id_key` (unique btree on `user_id`) exists, so the lookup is an index probe [VERIFIED: PROD `pg_indexes`].
- The ACL idiom (`REVOKE … FROM anon` named, `GRANT … TO authenticated, service_role`) is the one `20261003000001_p49_44_resposta_caso_aberto_rh.sql` documents: «`REVOKE ALL … FROM anon` com `anon` NOMEADO (o `pg_default_acl` concede EXECUTE a `anon` como grant direto)» [VERIFIED: that file, header].

### Pattern 2: Policy rewrite with `ALTER POLICY … TO authenticated`

`ALTER POLICY` changes roles, USING and WITH CHECK in place. Name, command and permissive/restrictive stay [CITED: postgresql.org/docs/current/sql-alterpolicy.html]. No DROP/CREATE window, no rename risk.

```sql
-- Shape A (vaga_id) — rh_le_analise, rh_le_comparativo, rh_avanca_etapa (USING + WITH CHECK)
ALTER POLICY rh_le_analise ON public.analise_candidato_vaga
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh')
        AND (SELECT public.is_active_rh_user()))
  );

-- rh_le_candidaturas keeps its product filters in the rh branch:
--   … = 'rh') AND (deleted_at IS NULL) AND (is_rascunho = false) AND (SELECT public.is_active_rh_user()))

-- Shape B (candidatura_id) — the 10 join-through policies.
-- Recommended: keep "only children of LIVE candidaturas" for rh, which is today's effective
-- semantics. (Today the subquery over `candidaturas` is itself filtered by rh_le_candidaturas'
-- deleted_at/is_rascunho for the rh caller, because RLS applies inside policy subqueries.)
ALTER POLICY rh_le_decisao_final ON public.decisao_final
  TO authenticated
  USING (
    ((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'administrador')
    OR (((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh')
        AND (SELECT public.is_active_rh_user())
        AND candidatura_id IN (SELECT c.id FROM public.candidaturas c
                                WHERE c.deleted_at IS NULL AND c.is_rascunho = false))
  );
```
- **Write the admin branch with the same source text as today** so the deparsed `qual` of the admin half is unchanged.
- **`TO authenticated` on all 14.** 9 are `{public}` today, which makes anon evaluate them. With the helper's EXECUTE revoked from anon, a `{public}` policy would make anon queries fail with "permission denied for function" (expressions are permission-checked at executor init). Narrowing to `authenticated` gives anon no policy, which means default deny. [ASSUMED: init-time ACL check. The design avoids depending on it, and the smoke's anon clause measures the outcome.]
- **p37_fidelidade (e) constraint:** it asserts `rh_le_notificacoes.qual` is **byte-identical** to `rh_gerencia_agendamento.qual` and `roles = {authenticated}` (`supabase/tests/p37_fidelidade_schema_smoke.sql:443-466`). Write both with the identical Shape-B text. Update that clause's narrative («join-through vaga-scoped WR-04») because its message becomes stale.
- **Lock budget:** `ALTER POLICY` takes `AccessExclusiveLock` on each of 12 tables, including hot `candidaturas`. Put `SET LOCAL lock_timeout = '3s'; SET LOCAL statement_timeout = '5s';` at the top of the file. This is the 49-44 idiom, under `authenticated`/`authenticator` `statement_timeout=8s` [VERIFIED: PROD `pg_roles.rolconfig`].

### Pattern 3: Queue RPCs — `rh` branch identical to admin (SC4 by construction)

```sql
-- listar_pedidos_dados / contar_pedidos_dados_pendentes: replace the whole rh EXISTS(...) with:
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh' AND public.is_active_rh_user())
         )
-- listar_revisoes_decisao / contar_revisoes_pendentes: same; drop the rh-only
-- c.deleted_at / c.is_rascunho / created_by filters.
```
Keep each RPC's existing NULL-safe role guard and `v_uid IS NULL` guard as they are. Keep `#variable_conflict use_column`, `LIMIT 200`, the composite `ORDER BY` and `pode_responder` byte-identical. Only the scope predicate changes.

### Pattern 4: Write / read RPC rewrite (18 bodies)

Copy each body from **live** `pg_get_functiondef` (not from repo migrations, which may drift). Change only:
1. Delete `v.created_by` from the SELECT list and its `INTO v_vaga_owner/v_owner/v_dono` target. Keep the join if it supplies other columns (e.g. `reprocessar_analise` needs `c.vaga_id`). Keep the `FOUND` / not-found checks.
2. Replace the owner comparison with `IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege'; END IF;`. Keep the function's existing errcode spelling (`'42501'` vs `insufficient_privilege` are the same SQLSTATE).
3. `funil_kpis`: add `v_role text := (select auth.jwt() #>> '{app_metadata,role}'); v_ve_tudo boolean := v_role = 'administrador' OR (v_role = 'rh' AND public.is_active_rh_user());`, then `WHERE v_ve_tudo` in the 4 CTEs. **Never `WHERE true`**: funil_kpis has no role guard and anon has EXECUTE, so the predicate is its only scope.
4. `ler_resposta_caso_aberto_sjt`: «inexistente e alheia dão o MESMO 42501» stops mattering (there is no "alheia" for an active rh). Move the rh check before the lookup (`IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN 42501`), then `NOT FOUND → P0002` for both roles. This changes one assertion in `p49_44_resposta_caso_aberto_smoke.sql` (d).
5. `save_entrevista_guia_edits`: **latent bug.** It uses `IF v_vaga_owner IS NULL THEN RAISE … 'candidatura % nao encontrada'` as the not-found test. A candidatura on an **orphan vaga** (`created_by IS NULL`, 9 vagas) is therefore reported "not found" **even to the administrador**. Switch to `IF NOT FOUND`. Its role comes from `usuarios_rh` (live, active), so the rh branch needs only the ownership check deleted.
6. **Fail-open guards inside bodies being rewritten** (body-read this session, not probed):
   - `reprocessar_analise`: `IF v_role NOT IN ('rh', 'administrador') THEN`, followed by `net.http_post` to the analysis EF.
   - `salvar_revisao_redacao`: `IF v_role NOT IN ('rh', 'administrador') THEN`, followed by an `UPDATE redacoes_candidato` with `decisao_revisor`.
   - Both have `anon=X` in `proacl`. With a NULL role, `NOT IN` evaluates NULL and the `IF` is skipped (tracked in `.planning/todos/pending/42-anon-execute-definer-sistemico.md`).
   - Recommended: since Phase 50 rewrites these exact lines, change them to `coalesce(v_role, '') NOT IN (…)` and add `REVOKE ALL … FROM anon` for the 6 rewritten functions that have `anon=X`: `funil_kpis`, `rejeitar_candidatura`, `reprocessar_analise`, `salvar_revisao_redacao`, `save_entrevista_guia_edits`, `upsert_pergunta_opcoes_metadata`. **Operator decision** (Open Question 2): the 42 todo said "fase própria".
7. `CREATE OR REPLACE FUNCTION` **preserves** the existing ACL [ASSUMED: standard Postgres behavior]. Assert `proacl` unchanged (or exactly as decided in 6) in the post-gate.

### Pattern 5: SC3 gate by FORM + bite in `pg_temp`

The detection is a catalog scan over **every non-system schema, `pg_temp_*` included**, so the bite can plant offenders in `pg_temp`. That means no lock on PROD tables and nothing persists.

```sql
-- Detection (inside p50_acesso_recrutador_smoke.sql). No literal object list: it iterates the catalog.
-- Offending policy: any qual/with_check mentioning created_by (there is no legitimate authorship use in RLS today).
SELECT format('%s.%s.%s', schemaname, tablename, policyname)
  FROM pg_catalog.pg_policies
 WHERE schemaname NOT IN ('pg_catalog','information_schema','storage','auth','realtime','cron','net','vault','extensions')
   AND (coalesce(qual,'') || coalesce(with_check,'')) ~* 'created_by';
-- Offending function: source mentions created_by AND the vagas table. NO allowlist needed (measured below).
SELECT p.oid::regprocedure::text
  FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname NOT IN ('pg_catalog','information_schema','storage','auth','realtime','cron','net','vault','extensions','graphql','graphql_public','pgsodium','supabase_functions','pgbouncer')
   AND p.prosrc ~* 'created_by'
   AND p.prosrc ~* '\mvagas\M';
-- Plus the indirect form (belt and suspenders): rh branch compared to an owner variable
--   prosrc ~* 'v_role\s*=\s*''rh''\s+AND\s+v_(vaga_)?(owner|dono)'
-- Positive half: every policy with an 'rh' literal on the 12 tables calls the helper:
--   qual ~ '''rh''' AND qual !~ 'is_active_rh_user'  → offender
```
- **Measured 2026-10-05 (read-only), the discriminator is exact.** `prosrc ~* 'created_by' AND prosrc ~* '\mvagas\M'` is TRUE for **all 18** AUTHZ functions and FALSE for **all 4** authorship functions (`anonimizar_candidato`, `plano_exclusao_titular`, `criar_preferencias_padrao`, `criar_usuario_rh_com_audit` → `vagas= False`). The gate therefore has **no allowlist**: today it fails on exactly the 18, and after the phase it must find 0. The indirect regex alone hits 12 of the 18; it misses `ler_resposta_caso_aberto_sjt`, whose form is `AND (NOT v_achou OR v_dono …`, and the 6 set-based ones. Use it only as a second detector.
- If a future authorship function legitimately reads `vagas.created_by` (e.g. a "criado por" label), add a **named, commented** scope exception at that point. The scan iterates the catalog, so new objects are caught by default.
- **Bite (must FAIL the gate, then roll back):** inside `BEGIN … EXCEPTION WHEN sqlstate 'P5099' THEN … END`:
  - `CREATE TEMP TABLE p50_bite(vaga_id uuid); ALTER TABLE p50_bite ENABLE ROW LEVEL SECURITY; CREATE POLICY p50_bite_pol ON p50_bite USING (vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid())));`
  - `CREATE FUNCTION pg_temp.p50_bite_fn() … SELECT v.created_by … FROM public.vagas v …; IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM …`
  - Run the detection. Assert it returns **exactly** the two planted names (and the indirect-form detector flags the function). Then `RAISE EXCEPTION USING ERRCODE = 'P5099'` to roll back the subtransaction.
- **EF half of the gate** (EFs are "functions" too): a Node or Vitest source probe over `supabase/functions/*/index.ts` with `/created_by\s*!==?\s*user\.id|created_by\s*===?\s*user\.id|vagaRow\.created_by/`. Bite: run the same regex against an inline fixture string that contains the old line.
- **Deparse caveat:** `pg_policies.qual` shows the helper **unqualified** when `public` is on the reader's search_path (`( SELECT is_active_rh_user() AS is_active_rh_user)`). Match `is_active_rh_user`, not `public.is_active_rh_user`.

### Pattern 6: Migration skeleton (per file)

1. Header: what was wrong, `MEDIDO EM PROD (2026-10-05, só leitura)` with the md5 baselines above, the decision quote, and `APLICAR COM: node p46apply.cjs migrate supabase/migrations/<file>`. No `BEGIN;`/`COMMIT;`.
2. `SET LOCAL lock_timeout = '3s'; SET LOCAL statement_timeout = '5s';`
3. **PRÉ-PORTÃO** `DO $pre$`. For each target, assert the live `md5(prosrc)` (functions) or `md5(coalesce(qual,'')||'|'||coalesce(with_check,''))` (policies) equals the baseline measured at plan time. Otherwise `RAISE` («medir de novo e decidir à mão»). Re-measure the baselines at plan/execute time; the table above is 2026-10-05.
4. The DDL.
5. **PÓS-PORTÃO** `DO $pos$`: no targeted object still matches `created_by`, every rewritten policy contains `is_active_rh_user`, `proacl` is as decided, the admin branch text is unchanged (compare the admin half of the deparsed qual).
6. `COMMENT ON FUNCTION/POLICY` stating the new rule and the operator decision.

### Pattern 7: Rehearsal ("ensaio") before apply — 49-44 idiom

Concatenate `migration + smoke + DO $$ BEGIN RAISE EXCEPTION 'ENSAIO_P50_TERMINOU'; END $$;` and run it with `node p46apply.cjs run`. The endpoint runs the whole body in one transaction [VERIFIED: CLAUDE.md §Via de apply ATUAL, property 1], so nothing persists. Then confirm by a read-only query that the ledger has no new version and the helper does not exist. `scripts/p49_44_mutacoes.cjs` is the template for the per-mutation bite runs (CONTROL first, then M1..Mn each expected to fail at a named clause).

### Anti-Patterns to Avoid

- **`USING (true)` or `v_role IN ('rh','administrador')` without the helper:** reopens the 1 h stale-token window for deactivated recrutadores.
- **Rewriting only the queue RPCs:** the recrutador still sees «0 Candidatos» and an empty decision page. The ROADMAP's own lesson (`REQUIREMENTS.md` EXPORT-05 note).
- **DROP POLICY + CREATE POLICY:** use `ALTER POLICY`. Same result, no rename or cmd drift.
- **Copying function bodies from repo migrations:** copy from live `pg_get_functiondef` and pin `md5(prosrc)` in the pre-gate.
- **Touching `anonimizar_candidato` / `plano_exclusao_titular`:** their `md5(prosrc)` is pinned by `p45_motor_exclusao_smoke.sql` (C3). Editing them breaks the erasure-motor proof.
- **Deleting the comparativo `3c` check or `trg_agendamento_normaliza_vaga`:** those are candidatura↔vaga integrity, not ownership.
- **Proving SC4 on `contar_pedidos_dados_pendentes` with today's data:** 0 = 0 is trivially equal. Seed a pending pedido (and an orphan) inside a rolled-back subtransaction (the p44 (k)/(l) idiom).
- **A negative test that passes "for the wrong reason":** e.g. the inactive-recrutador clause passing because the rh claim owns no vaga. Pair every negative with a positive control in the same run (the same query flips to non-zero for an active row).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Is this caller an active RH user?" in 32 places | 32 inline `EXISTS` copies or JWT-only checks | One `public.is_active_rh_user()` wrapped as `(SELECT …)` | One form for the gate to check, an initPlan cached per statement [CITED: supabase.com/docs/guides/auth/row-level-security], and live deactivation |
| Applying SQL to PROD | MCP `apply_migration` / SQL Editor paste | `node p46apply.cjs migrate` | Transcription dropped comments twice in M8. The ledger md5 is checked |
| Deploying EFs | MCP deploy with transcribed files | `node efdeploy.cjs <slug>` | Files read from disk, import closure checked |
| Pre-apply proof | "apply then test" | 49-44 ensaio (migration + smoke + sentinel in one rolled-back request) | Zero persistence, full PROD fidelity |
| Gate bite proof | Editing PROD objects to see the gate fail | `pg_temp` table/policy/function inside a rolled-back subtransaction | No lock on PROD tables, nothing persists |
| Role mapping in EFs | New helper call from EFs | The EFs' existing live `usuarios_rh` lookup | Already equivalent to the helper |

**Key insight:** the access rule "active RH sees all" already exists in three places (vagas, candidatos, the EFs' role lookup). This phase makes the 14 + 18 + 5 stragglers say the same thing in one checkable form.

## Runtime State Inventory (access-control refactor)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None encodes the old rule: `vagas.created_by` stays as authorship, `vagas_associadas_recrutadores` has 0 rows. ⚠ 3 `fixture-p46 … (sintetica)` vagas (9 synthetic candidaturas) and 6+ `[TESTE]` vagas are live in PROD as `arquivada`/`inativa`. After this phase the recrutador **sees them** | Operator decision (Open Question 3). No migration needed for the rule itself |
| Live service config | 5 deployed EF versions carry the ownership check. The Auth hook config is unchanged | Redeploy the 5 EFs via `efdeploy.cjs`. Record the new `version` of each |
| OS-registered state | None (no cron or job depends on ownership). Verified: `notificar-rh` has no `created_by` (grep) | none |
| Secrets/env vars | None renamed | none |
| Build artifacts | `src/types/database.types.ts` lacks the new helper signature (not called from the client) | Optional `npm run db:types < /dev/null`, then check the size is non-zero (memory: it can hang and truncate) |

## Common Pitfalls

### Pitfall 1: Legacy smokes go red. That is correct, and they must be rewritten, not deleted
**What goes wrong:** about 10 smokes assert "non-owner rh is denied". They pick subs with `usuarios_rh … ativo AND NOT EXISTS (vagas WHERE created_by = u.user_id) ORDER BY user_id LIMIT 1`, which today resolves to the **active admins** `023abcd6` / `66412f96` impersonated with an `rh` claim [VERIFIED: `funil34_kpis_smokes.sql:40-43`, `p37_lacunas…:133-140`, `seg32_smokes.sql:68-75`]. With the helper they become visible, and the negatives fail.
**How to avoid:** rewrite each clause as a pair. (i) **Positive:** an active rh row (non-owner) now sees the row / succeeds. (ii) **Negative:** an inactive recrutador (`fba9bc0f`, `ativo=false`) with an `rh` claim (simulating a stale token) is denied, plus `candidato` and no-claim are denied. See the disposition table in §Validation.
**Warning signs:** a rewritten smoke whose negative passes but whose positive control was never run.

### Pitfall 2: `p37_fidelidade (e)` byte-equality between two policies
**What goes wrong:** `rh_le_notificacoes.qual` must equal `rh_gerencia_agendamento.qual` byte for byte, and roles must be `{authenticated}`.
**How to avoid:** generate both ALTERs from one string constant in the migration. The post-gate compares them.

### Pitfall 3: The deactivated recrutador with an old token
**What goes wrong:** `jwt_exp = 3600` and desativar does not sign out. A JWT-only predicate keeps access for up to 1 h.
**How to avoid:** use the helper everywhere. The smoke's stale-token clause (rh claim + inactive row) proves it.

### Pitfall 4: Empty populations prove nothing
**What goes wrong:** pending pedidos = 0, orphan pedidos = 0, `v_analises_presas` = 0 rows, deleted candidaturas = 0. Every equality and negative on these passes for any implementation.
**How to avoid:** seed a pending pedido, an orphan pedido and a pending revisão inside rolled-back subtransactions. The p44 smoke already does exactly this (`solicitacoes_dados` writes inside `RAISE`-reverted subtransactions). Print the population next to each verdict, as 49-PROVA-PROD did («21/21 com 8/8 de população»).

### Pitfall 5: anon evaluating a `{public}` policy that calls a non-anon function
**What goes wrong:** anon has table SELECT on most of these tables (measured). If a `{public}` policy calls the helper and anon lacks EXECUTE, anon reads switch from "0 rows" to an error, or worse, someone "fixes" it by granting anon EXECUTE broadly.
**How to avoid:** `TO authenticated` on all 14. The smoke's anon clause compares each table's outcome (rows / SQLSTATE) to the baseline captured in the same run.

### Pitfall 6: Hybrid candidato+RH accounts
**What goes wrong:** `4fceff36` is an active administrador **and** has a `candidatos` row. The hook prefers the RH row, so the JWT is `administrador`. A recrutador who also applied as a candidato would see competitors' data. That is acceptable by the operator decision, but it is a conflict-of-interest scenario worth one sentence in the review.
**How to avoid:** none required. Mention it in VERIFICATION as a known property.

### Pitfall 7: The front-end channel
**What goes wrong:** only comments change in `src/`, but any commit left unpushed violates the guardrail and makes the GUIA screenshots ambiguous.
**How to avoid:** after each apply, `git log --oneline origin/main..HEAD` must be empty. To confirm a lazy-chunk marker, `grep -rl "<marcador>" build/assets/` (CLAUDE.md).

### Pitfall 8: Statement timeouts during the policy ALTERs
**What goes wrong:** a user query waiting more than 8 s behind the `AccessExclusiveLock` fails.
**How to avoid:** `SET LOCAL lock_timeout = '3s'; SET LOCAL statement_timeout = '5s';` at the top. If it times out, the request aborts atomically, so re-run in a quiet window. Raising the ceilings is the operator's call.

## Code Examples

### SC4 equality inside the smoke (excluding the per-caller column)
```sql
-- as admin (claims administrador) then as active rh (claims rh, sub = active usuarios_rh row):
SELECT md5(coalesce(jsonb_agg(to_jsonb(t) - 'pode_responder' ORDER BY t.candidatura_id)::text,'[]'))
  FROM public.listar_revisoes_decisao(true) t;
SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text,'[]'))
  FROM public.listar_pedidos_dados(true) t;
-- assert admin_md5 = rh_md5 AND count > 0 (population printed beside the verdict)
```
The column names `pode_responder`, `candidatura_id`, `id` are from the RETURNS TABLE of the live functions [VERIFIED: PROD `pg_get_functiondef`: `listar_revisoes_decisao` RETURNS TABLE(candidatura_id uuid, …, pode_responder boolean); `listar_pedidos_dados` RETURNS TABLE(id uuid, candidato_id uuid, …)].

### Impersonation header (repo idiom)
```sql
SET ROLE authenticated;
PERFORM set_config('request.jwt.claims', jsonb_build_object(
  'sub', <uuid>, 'role', 'authenticated',
  'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
```
[VERIFIED: `supabase/tests/seg33_agendamento_smokes.sql:145`, verbatim form `jsonb_build_object('sub', current_setting('smoke.recruiterA'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'rh'))::text, false)`]

### Smoke output contract (49 idiom)
Last statement: `SELECT json_build_object('smoke','p50_acesso_recrutador','pass', current_setting('smoke50.pass')::int, 'esperado', <n>, …population…) AS resultado;`, read as `JSON.parse(out)[0].resultado` [VERIFIED: `supabase/tests/p49_44_resposta_caso_aberto_smoke.sql:713-733`].

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RH scope = `vagas.created_by = auth.uid()` (WR-04, Phase 25/32/33) | Active RH sees all (operator decision, 2026-10-04/05) | This phase | 14 policies, 18 RPCs, 5 EFs, ~10 smokes |
| JWT claim as the only RH proof in RLS | JWT claim + live `usuarios_rh` check | This phase | Closes the 1 h post-deactivation window |
| `{public}` RH policies | `TO authenticated` | This phase | anon never evaluates RH branches |

**Deprecated/outdated after this phase:**
- WR-04 «own-vaga guard» comments in the 18 bodies, the 5 EFs and their tests.
- `49-PATTERNS.md:663-665` (comparativo ownership as the authorization model).
- `44-09-EVIDENCIA-BD8.md`'s premise.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Postgres checks EXECUTE on functions referenced in a policy at executor init, even in an un-taken OR branch, so anon with no EXECUTE plus a `{public}` policy produces an error | Pattern 2 / Pitfall 5 | Low. The recommended `TO authenticated` makes it irrelevant, and the smoke's anon clause measures the outcome |
| A2 | `CREATE OR REPLACE FUNCTION` preserves the existing `proacl` | Pattern 4 | Low. The post-gate asserts `proacl` explicitly |
| A3 | SC4 «mesmos itens» means byte-equal row sets, including orphan pedidos and revisões on dead candidaturas (so the rh branch becomes identical to admin) | Pattern 3 | Medium. If the operator wants rh to keep the live-candidatura filter, SC4 must be reworded. Delta today is 0 either way |
| A4 | The helper should be role-agnostic (active RH row of any role), because callers already require JWT `rh` | Pattern 1 | Low. ≤1 h window only if a recrutador is re-roled while active |
| A5 | Shape-B policies should keep "only children of live (non-deleted, non-rascunho) candidaturas" for rh, matching today's effective semantics via nested RLS | Pattern 2 | Low. 0 such candidaturas today |
| A6 | Fixing the two fail-open guards (`reprocessar_analise`, `salvar_revisao_redacao`) and revoking anon on the 6 rewritten functions belongs in this phase | Pattern 4.6 | Medium. The scope was assigned to a "fase própria" in the 42 todo. Needs operator OK |
| — | ~~A7: authorship functions need a gate allowlist~~ **Resolved by measurement:** none of the 4 match `\mvagas\M`, so no allowlist is needed (Pattern 5) | — | — |

## Open Questions (operator decisions → plan checkpoints)

1. **Who is the real recrutador, and with what email?** (blocks SC1 real session)
   - Known: no active recrutador exists. The only one, `recrutador.rh@teste.com`, is inactive with an address that hard-bounces (`42-recrutador-email-indeliveravel`, UAT doc: «Não reative»). `GUIA-VALIDACAO-FINAL.md:117` A1 (create RH2 in `/rh/configuracoes`) is still `⏸ pendente`.
   - Recommendation: a `checkpoint:human-action`. The operator creates RH2 (role `recrutador`, a mailbox he can open) via `/rh/configuracoes` (EF `gerenciar-usuario-rh` `criar`, which sends a set-password link), sets the password, and logs in.
2. **Fix the two fail-open guards and revoke anon on the 6 rewritten functions now?** (A6) Recommendation: yes, because the rewrite touches those lines and the blocking review will flag them. Otherwise record an explicit exclusion in the plan.
3. **Synthetic and test data visible to the real recrutador.** 3 `fixture-p46` vagas (9 synthetic candidaturas, likely tied to the Phase 46 purge evidence) and the `[TESTE]` vagas become visible to RH2. Accept, or clean up in a separate, gated plan (destructive, so a portão is required).
4. **`v_analises_presas` → `security_invoker = true`** in this phase? Recommendation: yes (§D).
5. **`upsert_pergunta_opcoes_metadata` (vaga configuration) widens too?** Its table policy `rh_gerencia_opcao_metadata` is already role-only `ALL` for `rh`, so the RPC check protects nothing. Widening makes them consistent. Recommendation: widen (SC3 forbids the predicate anyway).
6. **Is the stale-token proof required in a real session, or is impersonation enough for SC2?** SC2 doesn't demand a real session. Recommendation: smoke for SC2, plus an optional real check: deactivate RH2, confirm a fresh login yields role `candidato` and sees nothing, then reactivate.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase Management API token (Keychain «Supabase CLI»/«supabase») | p46apply, efdeploy | ✓ (used this session) | — | env `SUPABASE_ACCESS_TOKEN` |
| `p46apply.cjs` | migrations, smokes | ✓ | repo root | contract in CLAUDE.md |
| `efdeploy.cjs` | 5 EF deploys | ✓ | repo root | — |
| Deno | EF tests | ✓ | 2.9.4 | — |
| Node | scripts | ✓ | v24.18.0 | — |
| Supabase CLI | `db:types` (optional) | ✓ | 2.116.0 | skip regen |
| An active recrutador account with a real mailbox | SC1 real session | ✗ | — | **none**: the operator must create it (Open Question 1) |
| Operator browser session | SC1 real session evidence | human | — | optional `p50_sessao_real.cjs`: password grant on `/auth/v1/token` with the public anon key, credentials from env typed by the operator, never printed |

**Missing dependencies with no fallback:** an active recrutador (operator action).
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | SQL smokes on PROD via `p46apply.cjs run` (single atomic request) · Deno test 2.9.4 (EFs) · Vitest (front, `vite.config.ts` `test:` block) |
| Config file | `vite.config.ts` (vitest; excludes `supabase/functions/**/*.test.ts` by form) · none for Deno |
| Quick run command | `node p46apply.cjs run supabase/tests/p50_acesso_recrutador_smoke.sql` · `deno test --allow-all supabase/functions/<slug>/` |
| Full suite command | p50 smoke + rewritten legacy smokes (table below) + `deno test --allow-all supabase/functions` + `CI=true npx vitest run` + `npm run lint` |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| SC1 (impersonation half) | Active rh row that owns no vaga sees, for one `ativa`, one `inativa` and one `arquivada` vaga, the same candidatura count as admin (both > 0). Same for decisao_final/scores/historico on those candidaturas | smoke (PROD) | `node p46apply.cjs run supabase/tests/p50_acesso_recrutador_smoke.sql` | ❌ Wave 0 |
| SC1 (real session) | RH2 logs in. `/rh/vagas` «todas» → candidatos pages of `e897f709…` (ativa), `629a5f31…` (inativa), `9f6ccf1a…` (arquivada) list candidaturas. Optional script prints the JWT `app_metadata.role='rh'` plus per-vaga counts equal to admin's | checkpoint:human-verify (+ optional script) | `node scripts/p50_sessao_real.cjs` (operator env) | ❌ Wave 0 |
| SC2 | rh claim + inactive row (`fba9bc0f`) → 0 rows on the 12 tables, `42501` on the 18 RPCs. candidato → per-table `to_jsonb` fingerprint equals pre-apply. anon → per-table outcome (rows/SQLSTATE) equals pre-apply. admin → counts equal postgres totals before and after. Hook for the inactive user → `candidato` | smoke | same | ❌ Wave 0 |
| SC3 | Catalog scan finds 0 offending policies/functions. Positive half: every rh-branch policy calls `is_active_rh_user`. Bite: planted `pg_temp` policy + function are flagged exactly. EF source probe finds 0, and its bite flags a fixture | smoke + node/vitest probe + mutation script | p50 smoke · `node scripts/p50_mutacoes.cjs` · EF probe | ❌ Wave 0 |
| SC4 | `listar_pedidos_dados(true)`, `contar_pedidos_dados_pendentes()`, `listar_revisoes_decisao(true/false)` (minus `pode_responder`), `contar_revisoes_pendentes()` md5-equal admin vs active rh, with seeded pending + orphan pedido inside rolled-back subtransactions | smoke | p50 smoke | ❌ Wave 0 |
| SC5 | Active rh whose sub = `decisao_final.por_usuario` → `responder_revisao_decisao` raises 42501 `%decisor%`. `pode_responder=false` on own rows. D-23 still raises. `p42_revisao_art20_smoke.sql` stays green | smoke | p50 smoke + `node p46apply.cjs run supabase/tests/p42_revisao_art20_smoke.sql` | partial (p42 exists) |
| EF widening | 5 EFs: active rh non-owner → 200/OK path. Non-RH or inactive (no `usuarios_rh` active row) → 403. Comparativo 3c foreign candidatura → still 403 | deno unit | `deno test --allow-all supabase/functions/{comparativo-candidatos,get-curriculo-url,consolidar-decisao-final,gerar-guia-entrevista,avaliar-transcricao-entrevista}/` | ✅ (tests exist and must flip) |

### Legacy test disposition (must be updated in the same phase)

| File | Clause(s) | After Phase 50 | Action |
|---|---|---|---|
| `supabase/tests/oper31_rejeitar_candidatura_smokes.sql` | (e) cross-recruiter reject → 42501 | **breaks** | Positive: active non-owner rejects. Negative: inactive rh-claim → 42501 |
| `supabase/tests/funil34_kpis_smokes.sql` | recruiter A/B scoping | **breaks** | A sees all = admin. Inactive → empty KPIs |
| `supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql` | (h) non-owner reads 0 notificações | **breaks** | Same pair pattern |
| `supabase/tests/p37_fidelidade_schema_smoke.sql` | (e) byte-equality of 2 quals + roles | stays green **iff** both ALTERed identically | Update narrative/message |
| `supabase/tests/p44_pedidos_dados_smoke.sql` | (k) BD-8 scope ±, (l) orphan invisible to rh, (m) fila≡contador in 2 roles | **breaks** (k, l) | (k) rh = admin. (l) orphan **visible** to rh. Keep (i)(j) (no claim / candidato → 42501) |
| `supabase/tests/seg32_smokes.sql` | (c) + ownership clauses | **breaks** | Pair pattern |
| `supabase/tests/seg33_agendamento_smokes.sql` | (a) cross read 0. (c) spoofed `vaga_id` INSERT → 42501 | **breaks** | (a) pair. (c) becomes: insert succeeds and `trg_agendamento_normaliza_vaga` rewrites `vaga_id` to the candidatura's vaga (integrity still holds) |
| `supabase/tests/sec05_08_smokes.sql` | non-owner-rh blocked (reprocessar etc.) | **breaks** | Pair pattern |
| `supabase/tests/p47_historico_smoke.sql` | (b) rh not creator → 42501 | **breaks** | Pair pattern. Note `listar_historico_candidatura` md5 `770e2057…` is cited in `47-EVIDENCIA-APPLY-CONSOL-02.md` (historical, fine) |
| `supabase/tests/p49_44_resposta_caso_aberto_smoke.sql` | (d) random-sub rh → 42501 (still holds). Nonexistent with owner rh → 42501 | partially breaks | Nonexistent → P0002 for active rh |
| `supabase/tests/p45_motor_exclusao_smoke.sql` | (C3) md5 pins of `anonimizar_candidato` / `plano_exclusao_titular` | stays green **iff untouched** | Do not touch these two functions |
| `supabase/tests/p46_fixture_elegivel.sql:351-355` | comment: orphan vagas invisible to recrutadores | premise becomes false | Update the comment. Synthetic data visible (Open Question 3) |
| 5 EF Deno test files | «authed rh NOT owning the vaga → 403» | **breaks** | Flip to 200. Keep the 403 for non-RH/inactive |

Before editing any watched smoke, run the CLAUDE.md shape sweep over `supabase/tests/*.sql`: `grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql`. Classify every hit that touches the 14 policies or 18 functions (the 49-44 «Varredura D-56» check is the template).

### Sampling Rate
- **Per task commit:** the touched EF's `deno test`, or the migration's static node check (49-44 style) plus the ensaio run.
- **Per wave merge:** p50 smoke (ensaio before apply, real after) + the legacy smokes touched in that wave.
- **Phase gate:** full suite green, then the SC1 real-session checkpoint, then `git log --oneline origin/main..HEAD` empty, then `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `supabase/tests/p50_acesso_recrutador_smoke.sql` covers SC1 (impersonation), SC2, SC3, SC4, SC5.
- [ ] `scripts/p50_mutacoes.cjs` covers SC3 bite: reintroduce `created_by` in one policy and one RPC after the migration, expecting the smoke to fail at the gate clause.
- [ ] EF source-probe gate (node script or Vitest source-text test) with an inline bite fixture.
- [ ] Optional `scripts/p50_sessao_real.cjs` (SC1 real JWT, operator-run).
- [ ] Rewrites of the legacy smokes and Deno tests in the disposition table.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (unchanged) | GoTrue + custom access token hook |
| V3 Session Management | yes (stale token) | Live `usuarios_rh.ativo` check in the helper. `jwt_exp` 3600 |
| V4 Access Control | **yes, primary** | RLS `TO authenticated` + one DEFINER helper. Fail-closed NULL-safe guards in RPCs. EF role from a live DB row |
| V5 Input Validation | unchanged | Existing zod in EFs, UUID checks |
| V6 Cryptography | no | — |
| V8 Data Protection | yes | Widening exposes candidate PII (CVs, scores, justificativas) to every active recrutador, as decided by the operator. Record the decision in VERIFICATION. BD-9 / exportAllowlist unaffected |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Deactivated staff keeps access via an unexpired JWT | Elevation of Privilege | Live helper in every branch (Pitfall 3) |
| anon reaching RH branches (anon has table SELECT on 12 of these tables) | Information Disclosure | `TO authenticated`. anon per-table outcome = baseline |
| View owned by postgres without `security_invoker` | Information Disclosure | `v_analises_presas` → `security_invoker = true` (§D) |
| SECURITY DEFINER guard fails open on NULL role (`NOT IN`) | Elevation of Privilege | `coalesce(v_role,'')` + `v_uid IS NULL` reject. Revoke anon EXECUTE (A6) |
| IDOR inside a widened EF (candidaturas not belonging to `body.vaga_id`) | Tampering / Info Disclosure | Keep comparativo `3c` and the gerar-guia cross-check. Widening ≠ removing integrity checks |
| Self-review of one's own decision | Repudiation / process bypass | REVISAO-05 and D-23 untouched, asserted in the smoke (SC5) |

## Sources

### Primary (HIGH confidence, measured this session)
- PROD catalog, read-only via `p46apply.cjs sql "SET TRANSACTION READ ONLY; …"`: `pg_policies`, `pg_proc`/`pg_get_functiondef` (22 bodies dumped and read), `pg_class.reloptions`, `has_table_privilege`, `has_function_privilege`/`proacl`, `pg_default_acl`, `pg_indexes`, `pg_roles.rolconfig`, `pg_constraint`, `pg_trigger`, ledger, row counts, impersonation baselines, the token hook executed read-only.
- Supabase Management API `GET /v1/projects/isljnozzlvckrgjjbjwp/config/auth` (`jwt_exp`, hook URI).
- Repo files read: `CLAUDE.md`, `.planning/ROADMAP.md` §Phase 50, `.planning/REQUIREMENTS.md:40-50,96,140-175`, `.planning/STATE.md`, `44-PENDENCIAS-2026-10-03.md`, `p46apply.cjs`, `efdeploy.cjs`, the 5 EF `index.ts` gate regions, `supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql` (header/pre-gate), `supabase/tests/{p44_pedidos_dados,p49_44_resposta_caso_aberto,p37_fidelidade_schema,seg33_agendamento,funil34_kpis,p37_lacunas_rls_idempotencia,seg32,p46_fixture_elegivel}`, `scripts/p49_44_mutacoes.cjs`, `src/router/routes.tsx`, `src/features/vagas/services/vagasService.ts`, `src/components/pages/VagasRHPage.tsx`, `.planning/todos/pending/{42-anon-execute-definer-sistemico,42-recrutador-email-indeliveravel}.md`, `.planning/UAT-SESSAO-CONSOLIDADA.md:195-210`, `.planning/GUIA-VALIDACAO-FINAL.md:87,117`.

### Secondary (MEDIUM confidence, official docs)
- Context7 `/websites/supabase_guides`: RLS performance (`(select fn())` initPlan, DEFINER helper with `search_path=''`, `TO authenticated`). https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL docs, `ALTER POLICY`: https://www.postgresql.org/docs/current/sql-alterpolicy.html

### Tertiary (LOW confidence)
- A1 (init-time EXECUTE check in un-taken branches): training knowledge. The design does not depend on it.

## Metadata

**Confidence breakdown:**
- Inventory (policies, functions, EFs, views, baselines): HIGH, measured live and bodies read.
- Architecture (helper, ALTER POLICY, branch shapes): MEDIUM-HIGH, docs-backed and consistent with existing PROD predicates. A3/A5/A6 need operator confirmation.
- Pitfalls / legacy-smoke breakage: HIGH for the identified files (subject selection read). The full list should be re-derived by the plan's shape sweep.

**Research date:** 2026-10-05
**Valid until:** re-measure the md5 baselines and counts at plan time. Any phase that touches these objects invalidates the table (the pre-gate will catch it).
