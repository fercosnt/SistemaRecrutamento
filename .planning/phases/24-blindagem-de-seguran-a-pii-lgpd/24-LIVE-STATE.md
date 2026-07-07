# Phase 24 — Live-State Verification (PROD, via Supabase MCP)

**Run:** 2026-07-07 (read-only `execute_sql` against PROD before any migration authored)
**Verdict:** ✅ Every RESEARCH assumption A1–A7 resolved. All researched mechanisms **HOLD** — no divergence forces a scope/behavior change. Authoring waves (24-02..07) are cleared.

---

## Candidate-secrecy + horizontal-scope tables (SEC-01/02/05/07/08)

### Live RLS policies (pg_policies)

| Table | Policy | cmd | roles | qual (summary) |
|-------|--------|-----|-------|----------------|
| `cognitivo_itens` | `auth_le_cognitivo_itens` | SELECT | public | `auth.role() = 'authenticated'` → **any authed user reads whole row incl `gabarito_idx`** |
| `perguntas` | `cand_le_perguntas_ativas` | SELECT | public | `status = 'active'` → **candidate reads active rows incl `rubric`** |
| `perguntas` | `rh_gerencia_perguntas` | ALL | public | role ∈ {rh,administrador} |
| `redacoes_candidato` | `redacao_candidato_select` | SELECT | authenticated | own-row (candidatura→candidato→user) → **candidate reads own verdict cols** |
| `redacoes_candidato` | `redacao_rh_select` | SELECT | authenticated | role ∈ {rh,administrador} |
| `redacoes_candidato` | `redacao_rh_update` | UPDATE | authenticated | role ∈ {rh,administrador} |
| `redacoes_candidato` | `redacao_no_client_insert` | INSERT | authenticated | with_check `false` |
| `analise_candidato_vaga` | `rh_le_analise` | SELECT | public | **role-only** ∈ {rh,administrador} (NOT vaga-scoped) |
| `comparativo_solicitado` | `rh_le_comparativo` | SELECT | public | **role-only** ∈ {rh,administrador} (NOT vaga-scoped) |
| `candidaturas` | `rh_le_candidaturas` | SELECT | public | **role-only** ∈ {rh,administrador} |
| `candidaturas` | `RH vê candidaturas de suas vagas` | SELECT | authenticated | active-RH exists (**NOT** created_by/vaga-scoped despite the name) |
| `candidaturas` | `candidato_le_propria_candidatura` / `Candidato vê próprias candidaturas` | SELECT | public/auth | candidate own-row |
| `candidaturas` | `RH atualiza candidaturas` / `rh_avanca_etapa` | UPDATE | auth/public | active-RH / role-only |

### Column ACLs (information_schema.column_privileges, grantee ∈ authenticated/anon)

- `cognitivo_itens.gabarito_idx` → **`authenticated` HAS SELECT** ✅ (REVOKE target confirmed live)
- `perguntas.rubric` → **`authenticated` HAS SELECT** ✅ (REVOKE target confirmed live)
- `redacoes_candidato` verdict cols (`analise_ia`, `scores_dimensao`, `score_ponderado_0_100`, `classificacao_cor`, `red_flag_etico`, `flags`, `scores_humanos`, `notas_revisor`, `decisao_revisor`) → **`authenticated` HAS SELECT on all 9**. RH reads them via the SAME `authenticated` role → **column REVOKE is INVALID here** (would blind RH).

### Per-requirement go/no-go

| Req | Mechanism (researched) | Live state | Verdict |
|-----|------------------------|-----------|---------|
| **SEC-01** | column REVOKE `gabarito_idx` + `get_cognitivo_itens` DEFINER RPC | candidate reads gabarito_idx today; candidate role distinct | **mechanism holds** |
| **SEC-07** | column REVOKE `rubric` + candidate-facing allowlist drop | candidate reads rubric today | **mechanism holds** |
| **SEC-02** | candidate-DENY row RLS + `get_minha_redacao` DEFINER RPC (NOT column REVOKE) | candidate own-row policy leaks verdict; RH shares `authenticated` role | **mechanism holds — column REVOKE correctly excluded** |
| **SEC-05** | vaga-scope (WR-04) `analise_candidato_vaga` | role-only today | **mechanism holds** |
| **SEC-06** | vaga-scope `comparativo_solicitado` | role-only today | **mechanism holds** |
| **SEC-08** | vaga-scope `candidaturas` base-table RH SELECT | 2 role-only/active-RH policies today | **mechanism holds** |

- **A3 CONFIRMED:** grep `src/` for `gabarito_idx`/`.rubric` → only hit is `prova-cognitiva.test.tsx` asserting the candidate shape *lacks* `gabarito_idx`; zero authenticated readers → column REVOKE is safe (no hidden RH reader breaks).
- **A7 CONFIRMED:** candidate own-row redação read is a base-table policy (`redacao_candidato_select`) → dropping/denying it requires the client RPC rewire (`get_minha_redacao`) in the **same wave** (24-03).

---

## Declarations / erasure / item-bank (SEC-09/10, UX-08)

| Item | Query | Result | Assumption |
|------|-------|--------|------------|
| **SEC-09** auth_admin predicate | `pg_policies usuarios_rh/auth_admin_le_usuarios_rh` | `SELECT` · roles `{supabase_auth_admin}` · qual `true` | **A2 CONFIRMED** = `FOR SELECT TO supabase_auth_admin USING (true)` byte-for-behavior → pure drift-fix, NOT a behavior change |
| **SEC-09** grant | `role_table_grants` | `supabase_auth_admin:SELECT` present | grant confirmed |
| **SEC-10** backup existence | `to_regclass('backup_m2.candidaturas_pre_funil')` | non-null (**EXISTS**) | **A1 CONFIRMED** — DROP is a real op, not a no-op |
| **SEC-10** PII columns (LGPD erasure evidence) | `information_schema.columns backup_m2.candidaturas_pre_funil` | 35 cols incl `candidato_id`, `curriculo_url`, `curriculo_nome_original`, `analise_ia_*` (7), `score_geral`, `feedback_rejeicao`, `observacoes_rh`, `created_by` | captured for erasure record |
| **UX-08** item count | `count(*) bigfive_itens` | **120** | **A5 count confirmed** |
| **UX-08** O6 items | `bigfive_itens WHERE item_id IN (28,58,88,118)` | all 4 → dimensao `O`, faceta `28`; 88 & 118 reverse_keyed | **A5 CONFIRMED** — facet 28 = exactly these 4 (removing them drops the whole political facet; O domain 24→20 items → scorer must prorate O) |
| **UX-08** `ativo` column | `information_schema.columns bigfive_itens.ativo` | **absent (0)** | 24-07 `ALTER TABLE ... ADD COLUMN ativo` must ADD (not idempotent-skip) |

---

## Notes / out-of-scope observations (not acted on in Phase 24)

- `usuarios_rh` also carries two `{authenticated}` SELECT policies with `qual true` (`usuarios_rh_authenticated_read`, `usuarios_rh_simple_read`) — any authed user can read all RH rows. This is a broader PII surface but **outside SEC-09's scope** (SEC-09 only declares the pre-existing `auth_admin` policy in a migration file). Logged for a future phase, not touched here.

## Assumptions ledger

| ID | Statement | Status |
|----|-----------|--------|
| A1 | `backup_m2.candidaturas_pre_funil` exists | ✅ CONFIRMED (exists) |
| A2 | auth_admin predicate = `SELECT/supabase_auth_admin/USING true` | ✅ CONFIRMED (byte-for-behavior) |
| A3 | no authenticated client reads `gabarito_idx`/`rubric` | ✅ CONFIRMED (grep + column ACL) |
| A5 | `bigfive_itens` = 120 items; {28,58,88,118} all dim O | ✅ CONFIRMED |
| A7 | candidate own-row redação read is base-table policy → RPC rewire same wave | ✅ CONFIRMED |
