---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: Operação do Funil RH
status: executing
stopped_at: "Phase 34 Plan 34-02 COMPLETE — VISRH-01/02/03 (CV button + full IA analysis + read-only Historico) wired on HubCandidatoRH against P32/P33/P10 shipped-secure primitives; 22 tests GREEN, tsc 104, build green. Remaining P34: 34-03/04/05 (agendamento form, Fila tab, KPI dashboard)."
last_updated: "2026-07-16T17:42:37.551Z"
last_activity: 2026-07-16
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 18
  completed_plans: 17
  percent: 60
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-14 — M6/v6.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 34 — Superfícies do RH — CV/IA, Agendamento, Fila de Trabalho + KPIs

## Current Position

Phase: 34 (Superfícies do RH — CV/IA, Agendamento, Fila de Trabalho + KPIs) — EXECUTING
Plan: 4 of 5
Status: Ready to execute
Last activity: 2026-07-16

Completed this run (M6 autonomous): P31 ✅ · P32 ✅ · P33 ✅ · **P34 34-01 ✅** (DB foundation) · **34-02 ✅** (VISRH CV/IA/Histórico) · **34-03 ✅** (AGEND-02/03 agendamento form). Remaining in P34: 34-04 (Fila) · 34-05 (KPI dashboard). Then P35.

### Phase 33 (prior) — ✅ COMPLETE + SHIPPED LIVE PROD 2026-07-16

3/3 plans; SEG-03 gate 9/9 GREEN (a–i); verifier PASSED 9/9; code-review resolved. agendamentos_entrevista + WR-04 RLS + get_meu_agendamento RPC + write-stamp trigger.

## Roadmap (M6 — Phases 31–35)

Ordem de execução: 31 → 32 → 33 → 34 → 35.

| Phase | Goal | Requirements |
|-------|------|--------------|
| 31 — Avançar/Rejeitar em Todo o Funil + Reject-do-Comparativo (funil-02) | RH move cada candidatura por qualquer das 6 etapas (avançar/rejeitar/retroceder) + rejeita do comparativo, tudo pelo write-path auditável único (trigger `avancar_etapa()`); justificativa ≥50 server-enforced; RNF-07a. Puro reuso — trigger NÃO editado, nenhum INSERT direto em `historico_candidatura` | OPER-01, OPER-02, OPER-03, OPER-04 |
| 32 — Fechar os Dois Vazamentos Vivos (BLOCKING, server-only) | EF `get-curriculo-url` authenticate-THEN-authorize (policy role-only do bucket `curriculos` removida) + RPC `funil_kpis` DEFINER vaga-scoped + `rh_le_historico` endurecido WR-04; provado por smoke comportamental (JWT impersonado). Zero UI — gatilho da Phase 34 | SEG-01, SEG-02 |
| 33 — Camada de Dados do Agendamento de Entrevista | Tabela nova `agendamentos_entrevista` + RLS bidirecional (RH vaga-scoped WR-04 via join `candidaturas→vagas`, candidato own-row allowlist SEM `observacoes_rh`); smokes cross-recrutador/cross-candidato antes de qualquer UI | AGEND-01, SEG-03 |
| 34 — Superfícies do RH — CV/IA, Agendamento, Fila + KPIs | Telas do RH contra primitivos já seguros: CV via EF + análise IA completa + feed de histórico read-only; form de agendar/reagendar/cancelar + `compareceu`; fila de trabalho cross-vaga + badge SLA + dashboard de KPIs (recharts) substituindo a agregação M1 morta | VISRH-01, VISRH-02, VISRH-03, KPI-01, KPI-02, KPI-03, KPI-04, AGEND-02, AGEND-03 |
| 35 — Painel do Candidato — Leitura do Agendamento | Card do agendamento own-row (`America/Sao_Paulo`) na superfície "Próximo passo" (com `rotaCandidato` para etapas `entrevista_*` no `funilNavMap`) + download `.ics` client-side + badge de lembrete ≤24h; painel é o canal único (sem e-mail) | AGEND-04, AGEND-05 |

Coverage: 19/19 requirements mapeados ✓ · 0 unmapped. **Phase 32 é BLOCKING** — fecha os 2 leaks horizontais vivos (CV role-only + `rh_le_historico` role-only) antes de a Phase 34 renderizar qualquer UI que os leia. Fases candidatas a `/gsd-secure-phase`: **32** (núcleo dos read-primitives seguros) e **33** (RLS bidirecional do agendamento). UI hint: Phases 31, 34, 35.

## Performance Metrics

**Velocity (histórico de milestones):**

- M1 (v1.0): 7 fases / ~40 plans — shipped 2026-06-06. · M2 (v2.0): 11 fases / 63 plans — shipped 2026-06-26. · Phase 17 standalone: 5 plans — shipped 2026-06-28. · M3 (v3.0): 4 fases / 16 plans — shipped 2026-06-30. · M4 (v4.0): 6 fases / 43 plans — shipped 2026-07-13. · M5 (v5.0): 3 fases / 19 plans — shipped 2026-07-14.
- Ledger detalhado por plano arquivado em `milestones/v*.0-*` e nos SUMMARY de cada fase.

**By Phase (M6):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 31 | TBD | - | - |
| 32 | TBD | - | - |
| 33 | TBD | - | - |
| 34 | TBD | - | - |
| 35 | TBD | - | - |

*Updated after each plan completion.*
| Phase 31 P01 | 30min | 2 tasks | 2 files |
| Phase 31 P02 | ~12min | 2 tasks (TDD) | 5 files |
| Phase 31 P03 | ~8min | 2 tasks (1 TDD) | 3 files |
| Phase 31 P04 | ~10min | 2 tasks | 3 files |
| Phase 31 P05 | 8min | 2 tasks | 3 files |
| Phase 32 P01 | ~8min | 3 tasks | 4 files (2 new / 2 mod) |
| Phase 32 P02 | ~5min | 3 tasks | 3 files (2 new / 1 mod) |
| Phase 32 P03 | ~8min | 2 tasks | 1 file (1 new) |
| Phase 34 P02 | 11min | 3 tasks | 13 files |
| Phase 34 P03 | 12min | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions. As que ancoram o M6 (reuse-and-tighten, security-first):

- [M2/Phase 6]: `historico_candidatura` + o trigger `avancar_etapa()` BEFORE-UPDATE são o backbone do funil; o trigger é o **único escritor** da trilha (`ator=auth.uid()`, GUC-gated `auto_rejeitado`) — base direta de OPER-01/02/03/04. **NÃO editar o trigger** (near-miss P27 quase dropou o guard ENTREV-03; diff `pg_get_functiondef` antes de qualquer `CREATE OR REPLACE`).
- [M2/Phase 8]: bug histórico do double-write (`INSERT historico_candidatura` explícito + trigger → 2 rows, corrompe KPIs). Invariante M6: **nenhum código faz INSERT direto** em `historico_candidatura`; toda transição é `UPDATE candidaturas.etapa_atual` (+ `etapa_justificativa`).
- [M4/Phase 24 · WR-04]: predicado RLS vaga-scoped (admin bypass OR `vaga_id IN (SELECT id FROM vagas WHERE created_by=auth.uid())`; join via `candidaturas` quando não há `vaga_id` direto) — base de SEG-02 (`rh_le_historico`) e da RLS bidirecional do `agendamentos_entrevista` (SEG-03). A P24 **deferiu** o re-scope de `rh_le_historico` (nunca varrido) → o leak que a Phase 32 fecha.
- [M4/Phase 24 · smokes comportamentais]: JWT impersonado (`set_config` + `SET ROLE authenticated`) como gate de verificação, acima de `pg_policies`/greps estruturais — os smokes pegaram REVOKE no-op + policy OR-defeat que checagens estruturais passaram. Gate obrigatório de SEG-01/02/03.
- [M2/Phase 10]: EFs privilegiadas = two-client + **autorizar DEPOIS de autenticar** (`getUser()` → checar papel em `usuarios_rh` + posse da vaga) — base direta da EF `get-curriculo-url` (SEG-01/VISRH-01). Ver [[reference_ef_authenticate_vs_authorize]].
- [M2/Phases 8/11 · M4/Phase 24]: RLS é row-level, **não** column-level; `select('*')` vaza — leituras candidato-facing por allowlist explícita. Base de SEG-03 (candidato nunca lê `observacoes_rh`) e VISRH-03. Ver [[reference_select_star_leaks_pii]].
- [M2/Phases 6–15 · M4]: Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL `$$`; grava version row sozinho; no-BEGIN/COMMIT-wrapper) — caminho para as migrations da Phase 32/33.
- [Projeto/invariante]: service_role NUNCA no client — a EF `get-curriculo-url` é o único caminho privilegiado ao CV (guard de bundle grep). Bucket `curriculos` = leak role-only vivo a fechar (a policy role-only é **removida**, não só complementada).
- [Stack/M6]: **zero dependências npm novas** — recharts (via `@/components/ui/chart`), date-fns + `Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo'})` (idioma já em `EntrevistaDashboard.tsx`), shadcn Calendar + `<input type="time">`, `cvUploadService.getSignedUrl` — tudo já instalado/usado.
- [Phase ?]: Phase 31/OPER-04: comparativo reject rewired to shared RejeitarCandidaturaDialog → rejeitar_candidatura RPC (dialog owns the write; page handleRejeitar is post-success, no page-level mutate → no double-write); showActions gate + read-only DecisaoFinalPage embed preserved
- [Phase 32/32-03]: SEG-02 authored (Migration B `20260715000002_funil_kpis_and_rh_le_historico.sql`, one file, no BEGIN/COMMIT — D-22). Part 1 `funil_kpis(p_vaga_id uuid DEFAULT NULL) RETURNS jsonb` = `get_avaliacao_status` DEFINER/`search_path=''`/REVOKE-PUBLIC/GRANT-authenticated skeleton cloned; internal scope `WHERE (v_is_admin OR v.created_by=v_uid) AND (p_vaga_id IS NULL OR v.id=p_vaga_id)`; 3 PII-safe aggregates via CTEs (median = `LEAD(criado_em) OVER (PARTITION BY candidatura_id ORDER BY criado_em)−criado_em` deltas → `percentile_cont(0.5)` over NON-NULL dwell, excludes in-progress last transition — Pitfall 5; raw stage→stage conversion `WHERE etapa_de IS NOT NULL`; volume by current `etapa_atual` — Assumption A1); `COALESCE` guards; **PII-safe by construction** — CTEs project only candidatura_id/etapa_*/criado_em/vaga_id, never the transition-author column, never candidatos (verify grep: 0 `.ator` on code lines). Part 2 `rh_le_historico` DROP+CREATE with WR-04 vaga-scoped predicate copied verbatim from `redacao_rh_select` (admin bypass OR `rh AND candidatura_id IN (candidaturas JOIN vagas WHERE created_by=(select auth.uid()))`); candidate own-row historico policy untouched; NO write policy (trigger `avancar_etapa()` is the sole writer). **Authored-not-applied** — 32-04 applies via MCP + reconciles ledger + regens `database.types.ts`; `seg32_smokes.sql` (b/c/d/e) stays RED until then. Both task greps PASS, tsc baseline 104 held (no TS touched). Commit `941d8e5`.
- [Phase 32/32-02]: SEG-01 code layer greened — EF `get-curriculo-url/index.ts` clones the `comparativo-candidatos` two-client D-23 skeleton verbatim (getUser 401 → role from `usuarios_rh` recrutador→rh 403 → `candidatura_id`-only body → `candidaturas` allowlist projection NULL→404 → `vagas.created_by` ownership, admin bypasses 403 → `createSignedUrl(path, 60)`); static `esm.sh` import (never `.join("npm:")`); signed URL never logged. Migration A (`20260715000001`) DROP+CREATE `curriculos_select_own_or_rh` candidate-own-folder-branch ONLY (role-only OR removed), upload policies untouched, no BEGIN/COMMIT — **authored, applied in 32-04** (RESEARCH Pitfall 1: deploy EF FIRST). `cvUploadService.getSignedUrl(path→candidaturaId)` rewired to `functions.invoke('get-curriculo-url', { body: { candidatura_id } })`; last client `createSignedUrl` over `curriculos` removed from `src/`. deno test 6/6 GREEN, cvUploadService+guard 23/23 GREEN, tsc baseline 104 held, build green. `candidatura_id` parsed with a manual `typeof string` guard (no zod dep); Tampering guard by construction (EF never reads a client path). `seg32_smokes.sql` stays RED until 32-03 (funil_kpis + rh_le_historico) + 32-04 apply/deploy.
- [Phase 32/32-01]: Phase 32 RED acceptance harness authored (Wave 0) — deno EF test (5 branches: 401/403-role/403-owner/404/200) targeting the not-yet-authored `get-curriculo-url`; `seg32_smokes.sql` (a-e) whose **assertion (a) is a DIRECT `storage.objects` deny/allow proof** (recruiter-A rh JWT → 0 rows, owning candidate → 1 row) — the load-bearing SEG-01 gate, above pg_policies (P24 precedent); guard tripwire `firstCurriculosSignViolation` (curriculos-scoped, avatar signer not flagged); cvUploadService `getSignedUrl` → `functions.invoke('get-curriculo-url')`. All RED for known reasons: EF absent → GREEN 32-02; funil_kpis + tightened policies absent → GREEN 32-04. Smoke fixture = real discovered candidato (FK-bound CV owner) + **synthetic recruiters** (vagas.created_by has no FK) for deterministic vaga-scope assertions.
- [Phase 34/34-02]: VISRH-01/02/03 wired on HubCandidatoRH against shipped-secure primitives — CvButton imperative getSignedUrl->window.open (URL never cached/logged, Pitfall 7); AnaliseIABlock renders FULL pontos_fortes/gaps (no slice — that truncation is vaga-table-only) via allowlist analiseCandidatoService (score_match/pontos_fortes/gaps/flags/status->analise_status, never star); HistoricoBlock read-only newest-first via allowlist historicoCandidaturaService. IA block RH-only (candidate DB-denied rh_le_analise). Zero new npm; 22 tests GREEN; tsc 104.
- [Phase 34/34-02 · exec]: pre-commit runs strict tsc (npm run lint), which FAILS on the 104 pre-existing errors baseline (all cadastro/*·vagas/*, 0 in hub-candidato) → sequential executor used --no-verify (the hook's own documented GSD-executor protocol); each task re-proved tsc<=104 + 0 new errors to preserve the type-check gate intent.
- [Phase 34]: 34-03 AGEND-02/03 agendamento surface — agendamentoService writes DIRECT to agendamentos_entrevista; every payload built LITERALLY with only client-writable cols so the trigger-stamped scope/audit cols never touch a body (T-34-03-01); insert body cast at the boundary (as never) because the generated Insert still requires the NOT-NULL trigger-stamped col we intentionally omit. cancelar=UPDATE status cancelada (row kept — never a delete); reagendar=status reagendada; compareceu true/false/null = KPI-04 no-show source. AgendamentoBlock etapa-gated (HubSection futuro outside entrevista_*), RHF+zod Calendar+time Popover, Cancelar via AlertDialog. 15 tests GREEN, tsc 104.

### Pending Todos

Herdados/deferidos, fora do escopo do M6 (rastreados p/ M7/backlog):

- **Carregados do M5:** live HUMAN-UATs P28/29/30 (SMTP/senha/avatar/concorrência/AA), 2 cosméticos UI aceitos (turquoise dilution, focus-ring), IN-01 avatar extension-orphan, secure-phase retroativo opcional (P28/29/30).
- **Carregados do M4:** DBMIG-01 baseline+rebuild (environment-gated — Docker/CLI-auth), SEC-03 Vault secret `n8n_webhook_base` (human-action), CC0-01 seed cognitivo, confirmatory HUMAN-UATs P22/23/24. Ver `.planning/todos/`.
- **Deferidos deste ciclo (M6 v1.x / M7+):** retrocesso auditado adicional, `.ics`/lembrete-24h já em v1 (P35), COMM (notificação por e-mail), TALENT (banco de talentos), LGPD-OPS (retenção/Art. 20 queue), PSICO, relatórios completos + export CSV/PDF, source-of-hire por-vaga.

### Blockers/Concerns

- None. Roadmap M6 criado; aguardando `/gsd-plan-phase 31`.
- **Security-first é a ordem** — a Phase 32 (BLOCKING) fecha os 2 leaks horizontais vivos (CV role-only no bucket + `rh_le_historico` role-only diferido na P24) **antes** de a Phase 34 renderizar qualquer UI que os leia; senão o milestone embarca um IDOR/PII no dia 1.
- **Não editar o trigger `avancar_etapa()`** — carrega o guard ENTREV-03 + o predicado GUC `auto_rejeitado`; a Phase 31 enforce justificativa na camada RPC/serviço, não no trigger (near-miss P27).
- **Contas de teste PROD:** `e2e.admin@beautysmile.com.br` (administrador) + a 1ª conta `recrutador` criada no M5 (exercita o caminho vaga-scoped cross-recrutador dos smokes SEG-01/02/03).

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Feature (M6 v1.x) | Retrocesso auditado extra · flag "manter no banco" na rejeição | Deferred → M6-v1.x/backlog | M6 kickoff |
| Feature | COMM (notificação e-mail) · TALENT (banco de talentos) · LGPD-OPS (retenção/Art. 20) · PSICO · relatórios completos + export | Deferred → M7+ | M6 kickoff |
| Tech-debt | DBMIG-01 baseline+rebuild (environment-gated) · SEC-03 Vault secret · CC0-01 seed cognitivo | Deferred → M7/backlog | M4/M5 close |
| Tech-debt | live HUMAN-UATs P28/29/30 · IN-01 avatar orphan · UI cosmetics · secure-phase retroativo P28/29/30 | Deferred → backlog | M5 close |

## Session Continuity

Last session: 2026-07-16T17:27:32.584Z
Stopped at: Phase 34 Plan 34-02 COMPLETE — VISRH-01/02/03 (CV button + full IA analysis + read-only Historico) wired on HubCandidatoRH against P32/P33/P10 shipped-secure primitives; 22 tests GREEN, tsc 104, build green. Remaining P34: 34-03/04/05 (agendamento form, Fila tab, KPI dashboard).
Resume file: None

**P33 key learnings (for P34/P35):**

- **Table `agendamentos_entrevista`**: per-candidatura; RH reads/writes DIRECT (`.insert/.update/.delete`, RLS-gated); candidate reads ONLY via `public.get_meu_agendamento(candidatura_id)` DEFINER RPC (7-col allowlist, NO `observacoes_rh`). P35's card calls this RPC. P34 writes trust the trigger for `vaga_id`/`agendado_por`/`updated_by`/`updated_at` (do NOT pass them — trigger overwrites).
- **Reused enums** `status_entrevista` (agendada/em_andamento/concluida/cancelada/reagendada/nao_compareceu) + `tipo_entrevista_avaliacao` (online/presencial). Reagendar=update in place (status reagendada); cancelar=status cancelada (row kept, candidate sees it); `compareceu` boolean nullable = KPI-04 no-show source.
- **⚠ MCP apply drift is REAL**: `apply_migration` records a fresh-timestamp version ≠ filename → must reconcile `schema_migrations.version` to filename prefix (P27 idiom) after EVERY apply. Did it for both P33 migrations.
- **⚠ `db push --linked` NOT "up to date"** = pre-existing **DBMIG-01** debt (7 remote M5 timestamp-versions `20260713*/20260714*`, 2 of them fileless: `usr_rh_review_fixes_wr01_wr03`, `perfil_rh_rpc_hardening`). NOT a P33 defect; P33 rows reconciled on both sides. Deferred.
- **⚠ MCP `execute_sql` does NOT surface `RAISE NOTICE`** → SEG smokes verified via a result-returning adaptation (per-assertion `set_config('seg33.<x>',...)` + final SELECT). Canonical `.sql` keeps NOTICE form for SQL Editor.

## Operator Next Steps

- Phase 32 Plan 03 (Migration B) complete — SEG-02 authored: `funil_kpis` DEFINER vaga-scoped PII-safe jsonb (median/conversion/volume) + `rh_le_historico` WR-04 hardening, both in `20260715000002_funil_kpis_and_rh_le_historico.sql`, authored-not-applied (commit `941d8e5`). Próximo: `/gsd-execute-phase 32` → Plan 04 [BLOCKING, non-autonomous] — deploy EF `get-curriculo-url` (JWT-ON) FIRST → apply Migration A (`...0001` curriculos drop) + Migration B (`...0002` funil_kpis + rh_le_historico) via Supabase MCP `apply_migration` (ordered per Pitfall 1) → reconcile `supabase_migrations.schema_migrations` + regen `database.types.ts` (repo ROOT) → run `seg32_smokes.sql` via MCP `execute_sql` (the load-bearing gate — every assertion must NOTICE PASS) + live curl (no-auth→401, candidato→403, admin→200).
- Ordem de execução: 31 → 32 → 33 → 34 → 35. **Phase 32 é BLOCKING** para a Phase 34.
- 32-04 ordering landmine (RESEARCH Pitfall 1): deploy EF → rewire client → drop the `curriculos` RH Storage branch → run smokes. Reconcile `supabase_migrations.schema_migrations` + regen `database.types.ts` (repo ROOT) after `funil_kpis` lands.
- Research flags (pesquisa mais profunda no planejamento): **Phase 33** (agendamento — divergência no-email sem precedente de mercado; reschedule/cancel semantics; schema `agendamentos_entrevista`) e **Phase 34** (work-queue UX + 1ª RPC DEFINER com window-functions `LEAD`/`LAG` neste codebase; decisão de coorte K4). Phases 31/32/35 são HIGH confidence (precedente aplicado — skip research-phase).
