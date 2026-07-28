# Phase 25: Correção do Funil (lado RH — enums, colunas & contratos) - Research

**Researched:** 2026-07-09
**Domain:** Full-stack correction/hardening — Postgres triggers + SECURITY DEFINER RPCs (Supabase), React/TS enum cutover, form persistence wiring, dead-affordance sweep
**Confidence:** HIGH (drift verified live via codebase reads + tsc measurement + DB type introspection; every claim below is grep/read-backed unless tagged `[ASSUMED]`)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Area 1 — Rejection audit trail & legacy Kanban (FUNIL-02/03/06)**
- Rejection guard = DB trigger. `BEFORE UPDATE` trigger on `candidaturas` (no `OF` clause, or covering `status`) blocking `status`→`rejeitado`/`aprovado` outside sanctioned paths. Sanctioned = `registrar_decisao` / `submit_candidatura_atomic`, detected by **GUC flag** set inside those DEFINER RPCs (precedent named: `avancar_etapa_flag_guard` migration `20260624000004`). Server-authoritative; not client-bypassable. Must NOT break `trg_n8n_status_candidatura AFTER UPDATE OF status` (Phase 24 SEC-03) nor `candidaturas_avancar_etapa_trg BEFORE UPDATE OF etapa_atual`.
- Kanban + UpdateStatusModal = rewire to the real enum. `KanbanBoard.tsx` columns use the 6 real stages (`inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final`) and the M2 flow (`updateCandidaturaEtapa` / trigger `avancar_etapa`) instead of the raw UPDATE + `getProximaEtapa`.
- Delete legacy auto-advance from `updateCandidaturaStatus` (candidaturasService) and dead M1 symbols in `vagasTypes.ts`: `EtapaProcesso` (10-value), `ETAPAS_SEQUENCIA`, `getProximaEtapa`, `ETAPA_PROCESSO_LABELS`/`ETAPA_PROGRESS`/`ETAPA_TO_KANBAN` (to the extent coupled to dead values).
- Type `candidaturas.etapa_atual` as `Database['public']['Enums']['etapa_processo']` so the drift doesn't recur.

**Area 2 — Editar Vaga persistence & cargoTemplates contract (FUNIL-04/05)**
- Hydration → real columns (8 phantom fields mapped, see Area 2 below). Confirm exact names against `database.types.ts`.
- Persist base fields. Add a real `.from('vagas').update(...)` on edit save for base fields + status radio — today only `pesos_avaliacao`/`testes_aplicaveis` persist (via `configVagaService`, which works). Config M2 keeps saving as-is.
- test-id contract = ONE canonical shared enum (lib). `cargoTemplates` emits `{triagem, work_sample_sjt, redacao_cultural, big_five, cognitivo, entrevista}`; `AvaliacaoContainer` recognizes `{sjt_mc, sjt_caso_aberto, big_five, redacao}`. Canonical set in a lib; `deriveCards` **filters** to candidate-facing tests only; map `work_sample_sjt`→mc+caso, `redacao_cultural`→`redacao`, `cognitivo`→prova cognitiva (reachability itself is Phase 26 — here only the id contract).
- Add a contract test template↔container (parse every template through the container branch-map).

**Area 3 — Decision history & option-edit guard (FUNIL-09/11)**
- `registrar_decisao` preserves history via an append-only table. Create `decisao_final_historico` (does not exist), fed by an `AFTER UPDATE` trigger on `decisao_final` copying `OLD.*` before overwrite. Covers paths that today write no history row (amendment without etapa change, `em_espera`).
- Honest `criterio_texto`. Set `candidaturas.etapa_justificativa = p_justificativa` **before** the etapa UPDATE in the RPC, so the `historico_candidatura` row carries the real decision justificativa.
- `upsert_pergunta_opcoes_metadata` = hard-block on active vaga. `RAISE` if the pergunta's vaga has `status <> 'rascunho'` (mirror `publish_vaga`'s gate). Editing options of an ACTIVE vaga is blocked — prevents regenerating `opcao_id`s, orphaning `opcao_knockout_id`, and desyncing the `qualificacao_etapa1` snapshot.
- Ownership check in the same RPC: besides `role IN ('rh','administrador')`, require vaga ownership (`vaga.created_by = auth.uid()` OR administrador), consistent with Phase 24 scoping.

**Area 4 — Dead affordances & mock screens (UX-03/06)**
- Mock screens A14/A37 = "não disponível" empty-state. `/rh/configuracoes` (mock user management) and RH `MeuPerfilPage` (save/password/photo stubs) hidden behind a clear empty-state. Real impl → M5. Minimum offboarding-LGPD fix. **Not** DEV-gate, **not** route deletion.
- No-op affordances removed (or wired to real data when trivial): hardcoded `12`/`5` badges in `RHSidebar`, "—" tiles, no-op buttons ("📚 Usar da Biblioteca", template "Preview", RHTopBar global search).
- `DecisaoFinalPage` no-op avançar/rejeitar = hidden (the embedded `ComparativoScreen` with `onAvancar={()=>{}}`/`onRejeitar={()=>{}}`) — the real decision path is `registrar_decisao`.
- Hub nav = `candidatura.id`. Fix `CandidatosRHPage.handleVerPerfil` (+ `KanbanBoard.onViewPerfil` forward) to pass `candidatura.id`, not `candidato.id`, to `/rh/candidatos/:id` (which `HubCandidatoRH` reads as candidaturaId). Add a 404/not-found state in the hub when the id doesn't resolve.

### Claude's Discretion
- Exact column/symbol names, GUC flag shape, empty-state layout, and whether any M1 symbol has a live consumer that blocks clean deletion (deprecate instead of delete) — decide in the plan against real code.

### Deferred Ideas (OUT OF SCOPE)
- Real RH user management + real RH profile (A14/A37 implementation) → **M5** (here only empty-state).
- RHTopBar global search → M5.
- Candidate reachability + integral scoring, SJT filtered by cargo, reachable cognitivo (A17/A18) → **Phase 26**.
- Migrations baseline/ledger (A10), `auto_rejeitado` semantics (A28), reinscription post soft-delete (A27) → **Phase 27**.
- Horizontal scoping of `analise_candidato_vaga`/`redacoes_candidato` (A30) — SEC/Phase 24 territory; do not reopen unless the planner finds it open.
- Real FK `candidaturas.opcao_knockout_id → pergunta_opcao_metadata` + denormalized text column (part of A29) — consider in plan; if heavy, the status hard-block already closes the main vector.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FUNIL-02 | RH cannot reject a candidate via direct `candidaturas.status` UPDATE without audit/justificativa — mandatory trail (RNF-07a). `(A9)` | §Area 1 — reject-guard trigger + GUC flag; three sanctioned/allowed write-paths enumerated; the exact A9 hole (`updateCandidaturaStatus` L464 status-only UPDATE) traced. |
| FUNIL-03 | RH Kanban and UpdateStatusModal operate on the DB etapa enum (not the removed M1 enum). `(A12)` | §Area 1 — Kanban rewire to `etapa_processo` (8 real values) + `ETAPA_M2_LABELS` single source; UpdateStatusModal already on `status_candidatura`. |
| FUNIL-04 | Editar Vaga hydrates only existing columns AND persists config fields. `(A13)` | §Area 2 — 8 phantom→real column map (verified against vagas Row); missing base-field write-path; tsc reduction quantified. |
| FUNIL-05 | cargoTemplates↔container contract honored — test ids match. `(A15)` | §Area 2 — canonical id set, template→container mapping, `deriveCards` filter, contract test shape. |
| FUNIL-06 | Legacy "Aprovado para Próxima Etapa" action doesn't write a nonexistent M1 etapa — removed/redirected. `(A16)` | §Area 1 — delete `getProximaEtapa` auto-advance; `triagem`→`bigfive` is a live 22P02 vector. |
| FUNIL-09 | `registrar_decisao` doesn't destroy the previous decision — `por_usuario`/justificativa preserved in history. `(A26)` | §Area 3 — append-only `decisao_final_historico` + AFTER UPDATE trigger; `etapa_justificativa` honesty fix. |
| FUNIL-11 | `upsert_pergunta_opcoes_metadata` has a vaga-status guard — editing options of an ACTIVE vaga is blocked/controlled. `(A29)` | §Area 3 — status hard-block mirroring `publish_vaga` + ownership check. |
| UX-03 | Hub nav uses `candidatura.id` (not `candidato.id`) + 404 state. `(QW4)` | §Area 4 — exact bug at `CandidatosRHPage.handleVerPerfil` L252-254; hub 404 in-shell GlassCard. |
| UX-06 | Dead-affordance sweep — menus, 12/5 badges, no-op buttons, "—" tiles, incl. hiding DecisaoFinalPage avançar/rejeitar. `(QW11)` | §Area 4 — file:line list; UI-SPEC dead-affordance table. |
</phase_requirements>

## Summary

This is a **correction/hardening** phase with a pre-verified drift map. The core work splits into two engines: **(a) DB migrations** — one new `BEFORE UPDATE` guard trigger closing the reject-without-trail hole (FUNIL-02), plus `CREATE OR REPLACE` of two existing DEFINER RPCs (`registrar_decisao`, `upsert_pergunta_opcoes_metadata`) and one new append-only history table + trigger (FUNIL-09/11); and **(b) frontend rewiring** — swap the dead M1 `EtapaProcesso` 10-value enum for the live `etapa_processo` 8-value enum across `KanbanBoard`/`candidaturasService`/`vagasTypes`, map 8 phantom `vagas` reads to real columns + add a base-field write-path (FUNIL-04), define a canonical test-id contract (FUNIL-05), and sweep dead affordances (UX-03/06).

The single most consequential finding: **the tsc CI gate is currently pinned at 133 in `ci.yml`, but the real error count is 128** — the gate was never re-tightened after Phase 24 dropped it to 128. This phase's FUNIL-04 (8 phantom columns) + FUNIL-03/06 (enum cutover) fixes clear **~14 of the 128 buried errors**, so the plan must re-measure and re-pin the gate to a new lower number. Naively "keeping 128 green" is wrong — CI won't fail until 134.

The second consequential finding: **the named GUC precedent (`avancar_etapa_flag_guard`) does NOT use a session GUC** — it is a data-column flag (`entrevista_analises.bloqueio_avanco`). There is no existing `set_config`/`current_setting('app.*')` custom-flag precedent in the repo (only `current_setting('request.headers', true)` for XFF). The correct transaction-local GUC idiom is documented below.

**Primary recommendation:** Structure as ~5 DB-migration plans (guard trigger; registrar_decisao amendment; upsert guard; history table) applied via **Supabase MCP `apply_migration`** in `[BLOCKING]` waves, plus frontend plans (enum cutover; Editar Vaga wiring; test-id contract lib + contract test; dead-affordance sweep; hub 404). Re-measure and re-pin the tsc gate as the final CI-touching task. Version-row reconcile stays deferred to Phase 27.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Reject-without-trail guard (FUNIL-02) | Database (BEFORE UPDATE trigger + DEFINER RPC GUC flag) | — | A9 is explicit: RLS is row-level, not a structural invariant. Must be server-authoritative and unbypassable — cannot live in the UI or the client service. |
| Kanban stage move (FUNIL-03/06) | API/DB (`avancar_etapa` trigger validates + audits) | Browser (drag→drop intent) | The transition validator + audit row are DB-owned; the browser only expresses intent via `updateCandidaturaEtapa`. |
| Editar Vaga persistence (FUNIL-04) | API/DB (`.from('vagas').update` + `configVagaService`) | Browser (form state) | Base-field write is a plain authenticated table UPDATE under RLS; config write already server-gated (`publish_vaga`). |
| test-id contract (FUNIL-05) | Browser/Frontend (shared lib + `deriveCards`) | — | Pure client-side mapping between the template config shape and the candidate avaliação container. No tier boundary crossed; reachability (DB) is Phase 26. |
| Decision history (FUNIL-09) | Database (append-only table + AFTER UPDATE trigger) | — | History integrity must survive any writer; a trigger is the only place that captures `OLD.*` atomically. |
| Option-edit guard (FUNIL-11) | Database (DEFINER RPC in-body check) | — | RLS does not apply inside a DEFINER body; the status + ownership check must be explicit in-RPC. |
| Hub 404 / dead affordances (UX-03/06) | Browser/Frontend | — | Pure presentation + navigation-param correctness. |

## Standard Stack

**No new packages are installed in this phase.** All work reuses the existing, already-vendored stack. Verified against `package.json` and live code.

### Core (existing — reused, not added)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | (installed) | anon client for RLS-scoped table UPDATE + `.rpc()` calls | Project standard; all DB access flows through `@/lib/supabase/client`. |
| `react-dnd` + `react-dnd-html5-backend` | 16.0.1 (pinned, CI-09) | Kanban drag-drop | Already the Kanban engine (`KanbanBoard.tsx`); rewire columns only, no lib change. |
| `@tanstack/react-query` | v5 | mutation hooks (`useUpdateCandidaturaStatus` and any new `useUpdateCandidaturaEtapa`) | Project server-state standard (staleTime 5min, retry 2). |
| `zod` | (installed) | `testesAplicaveisSchema`, any new canonical-id schema | Project validation standard; `testeAplicavelSchema` already exists. |
| `vitest` | ^4.1.9 | unit + contract tests | Project test runner; `npm run test:run` is the CI gate. |
| Postgres PL/pgSQL (Supabase) | — | trigger + DEFINER RPCs | The only place FUNIL-02/09/11 invariants can be enforced structurally. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BEFORE UPDATE trigger (FUNIL-02) | RLS `WITH CHECK` policy on `candidaturas` UPDATE | RLS cannot express "status→rejeitado is allowed only from a specific function context"; it has no cross-statement session-flag awareness. A trigger + GUC is the only structural fit. (This is exactly the A9 audit point.) |
| New `decisao_final_historico` table (FUNIL-09) | Rely on existing `historico_candidatura` | `historico_candidatura` keys on etapa transitions; an amendment or `em_espera` decision writes NO etapa transition → no history row. A dedicated AFTER UPDATE trigger on `decisao_final` is the only capture point for `OLD.*`. |

**Package Legitimacy Audit:** Not applicable — this phase installs zero external packages. All libraries are already present and pinned (verified: `package.json` + CI-09 supply-chain pins from Phase 22).

## Area 1 — Rejection guard, enum cutover & legacy auto-advance (FUNIL-02/03/06)

### 1a. The reject-without-trail hole (FUNIL-02 / A9) — VERIFIED write-path inventory

There are **four** paths that can set `candidaturas.status = 'rejeitado'`. The guard must block exactly one of them (the hole) without breaking the other three:

| # | Path | File / RPC | What it writes | Fires `avancar_etapa`? | Audited today? |
|---|------|-----------|----------------|------------------------|----------------|
| 1 | **THE HOLE** — UpdateStatusModal reject | `candidaturasService.updateCandidaturaStatus` L464-467 (via `UpdateStatusModal` L141 → `useUpdateCandidaturaStatus`) | raw `UPDATE {status:'rejeitado', etapa_atual: <unchanged>, feedback_rejeicao}` | **No** (etapa unchanged → `IS NOT DISTINCT FROM` guard skips) | **No historico row** — only `feedback_rejeicao` column. This is A9. |
| 2 | Comparativo inline "Rejeitar" | `ComparativoCandidatosPage.tsx` L125 → `triagemService.updateCandidaturaEtapa(id,'rejeitado')` L350-378 | raw `UPDATE {etapa_atual:'rejeitado', status:'rejeitado'}` | **Yes** (etapa `X`→`rejeitado`) | Yes — `avancar_etapa` writes 1 historico row (but `criterio_texto` may be null; no justificativa required here) |
| 3 | Decisão Final | `registrar_decisao` RPC (DEFINER) `20260625100001` L139-143 | `UPDATE {etapa_atual:'rejeitado'}` (does **NOT** set `status`) | Yes | Yes — `avancar_etapa` writes 1 row; justificativa ≥50 enforced |
| 4 | Knockout auto-reject (CI-03) | `submit_candidatura_atomic` RPC (DEFINER) `20260608000001` L192-204 | `UPDATE {status:'rejeitado', etapa_atual:'inscricao' (unchanged), motivo_rejeicao}` + **explicit** historico INSERT | No (etapa unchanged) | Yes — explicit INSERT (auto_rejeitado=true, ator NULL) |

**Key structural insight (verified live):** path #4 (knockout) sets `status='rejeitado'` with `etapa_atual` UNCHANGED and writes its own audit row explicitly. Path #2 sets `status='rejeitado'` WITH an etapa transition (audited by `avancar_etapa`). So a guard that keys only on "status→rejeitado" and requires the GUC flag would **break path #2** (a raw client update that cannot set a session GUC). A guard that requires "etapa also transitions" would **break path #4** (etapa stays `inscricao`). **Both branches are needed.**

### 1b. Recommended guard design (hybrid — robust, minimal breakage)

```sql
-- Migration: guard_rejeicao_auditada — BEFORE UPDATE OF status on candidaturas (FUNIL-02/A9)
CREATE OR REPLACE FUNCTION public.guard_rejeicao_auditada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only fires when status CROSSES INTO 'rejeitado'.
  IF NEW.status = 'rejeitado' AND OLD.status IS DISTINCT FROM 'rejeitado' THEN
    -- Allowed iff EITHER a sanctioned DEFINER RPC set the txn-local flag,
    -- OR this same UPDATE also drives an etapa_atual transition (which fires
    -- avancar_etapa() BEFORE UPDATE OF etapa_atual → writes the historico audit row).
    IF current_setting('app.rejeicao_sancionada', true) IS DISTINCT FROM 'on'
       AND NEW.etapa_atual IS NOT DISTINCT FROM OLD.etapa_atual THEN
      RAISE EXCEPTION 'Rejeição sem trilha de auditoria não é permitida (RNF-07a / LGPD-02)'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_candidaturas_guard_rejeicao
  BEFORE UPDATE OF status ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.guard_rejeicao_auditada();

REVOKE ALL ON FUNCTION public.guard_rejeicao_auditada() FROM PUBLIC;
```

Then in `submit_candidatura_atomic` (before its knockout UPDATE at L192) and in `registrar_decisao` (before/around its rejeitado UPDATE at L141), add:

```sql
PERFORM set_config('app.rejeicao_sancionada', 'on', true);  -- is_local = true → auto-resets at txn end
```

**Effect matrix (verified against the 4 paths):**
- Path #1 (hole): status→rejeitado, etapa unchanged, no flag → **BLOCKED** ✓ → forces reroute (see 1c).
- Path #2 (comparativo): status→rejeitado + etapa→rejeitado → allowed via etapa-transition branch ✓ (unchanged behavior).
- Path #3 (registrar_decisao): sets flag + etapa→rejeitado → allowed ✓.
- Path #4 (knockout): sets flag, etapa unchanged → allowed via flag branch ✓.

**GUC idiom notes** `[CITED: Postgres SET/current_setting docs]`:
- `set_config(setting, value, is_local)` with `is_local = true` = `SET LOCAL` semantics = transaction-scoped, auto-reset on commit/rollback. This prevents flag leakage into pooled connections (the Supabase transaction pooler reuses connections — a non-local flag would be a real hazard).
- `current_setting('app.rejeicao_sancionada', true)` — the second arg `true` = `missing_ok`, returns `NULL` (not an error) when the GUC was never set. This is the `[VERIFIED: codebase]` idiom already used at `20260421000001_rate_limit_duplicate_check.sql:100` (`current_setting('request.headers', true)`).
- Use a **custom namespaced key** (`app.*`). Custom GUCs with a dotted prefix are allowed without `postgresql.conf` registration.

**⚠️ CONTEXT correction (surface to planner):** The CONTEXT names `avancar_etapa_flag_guard` (`20260624000004`) as the "GUC flag" precedent. **That migration does NOT use a session GUC** — its "flag" is the data column `entrevista_analises.bloqueio_avanco` (a boolean row-flag), read via a subquery. It IS a good precedent for *how to add a BEFORE-UPDATE guard on candidaturas without breaking the existing trigger* (it `CREATE OR REPLACE`s the fn and idempotently re-binds the trigger), but the session-GUC idiom above is new to this repo.

### 1c. FUNIL-02 completion requires a reroute, not only a guard

The guard is a **backstop**. To actually deliver "no rejection without justificativa", path #1 (`UpdateStatusModal` reject) must be **rerouted** to `registrar_decisao` (which enforces justificativa ≥ 50 chars + writes the audit row + sets the flag). Options for the planner:
- **(Recommended)** Route the modal's `precisaMotivoRejeicao` (`UpdateStatusModal.tsx` L116) reject branch through `registrar_decisao` (needs the modal to collect a ≥50-char justificativa; UI-SPEC §Interaction Contracts already says the reject action stays disabled until a justification is entered).
- Alternatively, a new thin `rejeitar_candidatura(p_candidatura_id, p_justificativa)` DEFINER RPC that sets the flag, writes `feedback_rejeicao` + status + a historico row. More surface, but keeps Decisão Final and inline reject semantically separate.

**Open decision (see Open Questions):** whether path #2 (comparativo inline reject, currently justificativa-optional) should ALSO be tightened to require a justificativa. The hybrid guard leaves it working as-is (audited but justificativa-optional); strict RNF-07a reading argues for routing it through `registrar_decisao` too.

### 1d. Trigger coexistence (VERIFIED — must not break)

Live triggers on `candidaturas`:
- `candidaturas_avancar_etapa_trg` — **BEFORE UPDATE OF etapa_atual** (Phase 6/14). Writes 1 `historico_candidatura` row per etapa transition.
- `trg_n8n_status_candidatura` — **AFTER UPDATE OF status** (Phase 24 SEC-03, pg_net + Vault). Preserve.
- `trg_candidaturas_analise` — AFTER INSERT.
- `update_candidaturas_updated_at`.

New `trg_candidaturas_guard_rejeicao` is **BEFORE UPDATE OF status**. Firing order for BEFORE row-triggers = **alphabetical by trigger name**: `candidaturas_avancar_etapa_trg` < `trg_candidaturas_guard_rejeicao` (c < t), so `avancar_etapa` fires first (writes the audit row), then the guard validates. If the guard RAISEs, the whole statement rolls back including the audit INSERT (atomic — correct). The AFTER n8n trigger only fires if the statement succeeds → a blocked reject never dispatches n8n (correct — no spurious webhook). **No conflict.**

### 1e. Enum cutover (FUNIL-03/06 / A12/A16) — VERIFIED consumer map

**Live enum** `etapa_processo` (verified in `database.types.ts` L4661-4669): `inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final, aprovado, rejeitado` (6 stages + 2 terminals).

**Dead M1 `EtapaProcesso`** (`vagasTypes.ts` L200-210): `triagem, bigfive, disc, entrevista_online, raven, cultura, avaliacao_final, aprovado, rejeitado` — only `triagem`/`entrevista_online`/`entrevista_presencial`/`aprovado`/`rejeitado` overlap; `bigfive/disc/raven/cultura/avaliacao_final` are **nonexistent in the DB** → any `.eq('etapa_atual','bigfive')` throws Postgres **22P02** (invalid enum). This is the A16 live-crash vector.

**Consumers of the dead symbols (grepped, complete):**
| Symbol | Live consumers (non-test) | Action |
|--------|---------------------------|--------|
| `EtapaProcesso` (type) | `KanbanBoard.tsx` (L23,37,45,83,201,207,284,297,311), `candidaturasService.ts` (L33 import, L435), and 5 interface fields **within** `vagasTypes.ts` (L265 `CandidaturasFilters.etapa`, L351/409/439/470) | Re-point to the DB enum. **Recommended:** change the `EtapaProcesso` alias itself to `Database['public']['Enums']['etapa_processo']` (keeps the name, self-corrects all interface fields), OR reuse the already-live `EtapaFunilM2` (`triagemService.ts` L302-310 — hand-written mirror of the same 8 values). Prefer a single source: alias `EtapaProcesso = Database['public']['Enums']['etapa_processo']` and consider making `EtapaFunilM2` the same alias to kill the duplicate. |
| `getProximaEtapa` | `candidaturasService.ts` L35 import, L443 (inside `updateCandidaturaStatus`) | **Delete** the auto-advance (L437-453). `getProximaEtapa('triagem')`→`'bigfive'` = the 22P02 vector. |
| `ETAPAS_SEQUENCIA` | none outside `vagasTypes.ts` | Delete (dead). |
| `ETAPA_PROCESSO_LABELS` | none outside `vagasTypes.ts` | Delete — `triagemService.ETAPA_M2_LABELS` is the live single source (already used by `DashboardCandidatoPage`, `HubCandidatoRH`, the triagem panel). |
| `ETAPA_PROGRESS` | none outside `vagasTypes.ts` | Delete (dead). |
| `ETAPA_TO_KANBAN` | none outside `vagasTypes.ts`; **already a tsc error** (L734 `big_five` key doesn't exist in `EtapaProcesso`) | Delete (dead + broken). |

**Kanban rewire (`KanbanBoard.tsx`):**
- `KANBAN_COLUMNS` (L44-57): replace the 4 dead columns with the 6 real working stages, labels from `ETAPA_M2_LABELS` (do not hardcode a 2nd copy). See UI-SPEC §1 for the binding column order/glyphs/hues. Terminals (`aprovado`/`rejeitado`) are **not** drop columns — render a terminal pill on the card instead.
- `groupedCandidaturas` (L283-308): rebuild the `Record` keyed on the 8 real values; delete the `console.warn`→`triagem` fallback (every live etapa now maps).
- `handleDrop` (L311-358): stop calling `useUpdateCandidaturaStatus` (which invokes the raw `updateCandidaturaStatus` with auto-advance). Route drag→drop through `updateCandidaturaEtapa` (M2 path) — a thin new `useUpdateCandidaturaEtapa` mutation hook, or call the service directly. This fires `avancar_etapa` (validates + audits). Grid `lg:grid-cols-[repeat(7,…)]` → `repeat(6,…)`.
- `onViewPerfil(candidato?.id)` (L176) → must forward `candidatura.id` (UX-03, see Area 4).

## Area 2 — Editar Vaga persistence & test-id contract (FUNIL-04/05)

### 2a. Phantom→real column map (FUNIL-04 / A13) — VERIFIED against `vagas` Row (`database.types.ts` L3613-3655)

The hydration at `CriarEditarVagaPage.tsx` L150-173 reads **8 columns that do not exist** (each is a current tsc error — see below). Confirmed mapping:

| Phantom read (L#) | tsc error | Real column(s) in `vagas` Row | Notes |
|-------------------|-----------|-------------------------------|-------|
| `data.faixa_salarial` (158) | TS2551 | `faixa_salarial_min` + `faixa_salarial_max` (both `number \| null`) | split into two numeric fields |
| `data.carga_horaria` (159) | TS2339 | `jornada_trabalho` (`string \| null`) | — |
| `data.descricao_completa` (163) | TS2551 | `responsabilidades` and/or `sobre_cargo` (both `string \| null`) | planner picks the semantic target for `responsabilidades` form field |
| `data.requisito_formacao` (164) | TS2551 | `requisitos_formacao` | plural |
| `data.requisito_experiencia` (165) | TS2551 | `requisitos_experiencia` | plural |
| `data.requisito_tecnico` (166) | TS2551 | `requisitos_tecnicos` | plural |
| `data.requisito_comportamental` (167) | TS2339 | `requisitos_habilidades` | — |
| `data.requisito_diferencial` (168) | TS2339 | `diferenciais` and/or `perfil_ideal` | note: form field `diferenciais` currently maps from `data.beneficios` (L169) — a real column; the planner must disentangle `diferenciais`/`perfil_ideal`/`beneficios`/`pessoaCerta` field semantics |

Other real columns available for the base form (verified): `titulo, slug, departamento, cidade, estado, tipo_contrato, modelo_trabalho, nivel_senioridade, descricao_curta, sobre_empresa, subtitulo, total_vagas, modelo_trabalho, exibir_salario, status`.

### 2b. Missing base-field write-path (FUNIL-04 / A13) — VERIFIED

`CriarEditarVagaPage` has **no** write for base fields on edit. The footer (L1088-1118) exposes only:
- **"Salvar Rascunho"** → `handleSalvarRascunho` (L302-318) → `updateVagaConfigMut` = config only (`testes_aplicaveis` + `pesos_avaliacao`) via `configVagaService` (`configVagaService.ts` L64-68 — works).
- **"Publicar vaga →"** → `handlePublicar` (L322-374) → config save + `publish_vaga` RPC.

So editing `titulo`/`departamento`/`cidade`/status radio/etc. and saving persists **nothing** of the base form. FUNIL-04 requires a real `.from('vagas').update({...base fields..., status})` on the edit-save path. Per UI-SPEC §5, add a **"Salvar alterações"** (accent) primary CTA on the edit path that persists base fields + status radio + existing config (config controls unchanged). This is a plain authenticated table UPDATE under RLS (Phase 24 vaga-scoping already governs who can UPDATE which vaga).

**Note:** `handlePublicar` calls `publishGate` with `perguntas: []` (L341) — the F7 question bank is still deferred; do not expand it here.

### 2c. tsc baseline impact (FUNIL-04 + enum cutover) — MEASURED

Current real count: **128** (`npx tsc --noEmit | grep -c "error TS"` — measured 2026-07-09). Phase-25 target files carry:
- `CriarEditarVagaPage.tsx`: **12** errors — 8 are the phantom columns (L158-168), plus incidental: L1 unused `React` (TS6133), L187 `.finally` on a `PromiseLike<void>` (TS2339), L393/405 `RHLayout` prop mismatch (TS2322). Fixing the 8 phantom reads clears **−8**; the `.finally` sits on the hydration `.then()` chain being edited (likely fixed incidentally).
- `candidaturasService.ts`: **5** errors (L166, 321, 458, 580, 709) — all `EtapaProcesso` (M1) assigned to the DB-enum-typed `etapa_atual`. Re-aliasing `EtapaProcesso` clears **−5** (all five, including three outside `updateCandidaturaStatus`).
- `KanbanBoard.tsx`: **1** error (L284 `avaliacao_final` missing in the grouped Record) — cleared by the enum cutover **−1**.
- `vagasTypes.ts`: **3** errors — L734 `big_five` (ETAPA_TO_KANBAN, in scope, **−1** on deletion); L569 `tempo_integral`, L581 `clinica` are `TipoVaga`/`Departamento` label bugs **out of scope** (leave).

**Expected reduction ≈ −14** (8 + 5 + 1). New measured baseline likely **~113-114**. **The plan MUST**: (1) re-run `npx tsc --noEmit | grep -c "error TS"` after the fixes; (2) re-pin `ci.yml` L51/54/55/56 from `133` to the new measured number; (3) note that the gate currently sits at **133** (stale from Phase 22), not 128 — "keep 128 green" is a false assumption (CI passes up to 133 today).

### 2d. Canonical test-id contract (FUNIL-05 / A15) — VERIFIED mismatch

**cargoTemplates side** (`config-vaga/templates/cargoTemplates.ts` L55-73, `baseTestes`): emits `testes_aplicaveis` entries with `teste ∈ {triagem, work_sample_sjt, redacao_cultural, big_five, cognitivo, entrevista}` (`TesteAplicavel['teste']` is `z.string()` — `testesAplicaveisSchema.ts` L43, so unconstrained today).

**AvaliacaoContainer side** (`avaliacao/components/AvaliacaoContainer.tsx`): `deriveCards` (L255-269) copies `t.teste` **verbatim** from `vaga.testes_aplicaveis`; `testeLabel` (L56-72) + `handleOpenTeste` (L308-322) only recognize `{sjt_mc, sjt_caso_aberto, big_five/bigfive, redacao}`. **Zero overlap except `big_five`.**

Concrete breakage when a real vaga's `testes_aplicaveis` reaches the container:
- `work_sample_sjt` → default label ("Work Sample Sjt"), `handleOpenTeste` default `target='mc'` (accidentally MC-only; no `caso` card).
- `redacao_cultural` → default label, `target='mc'` (**WRONG** — should route `/candidato/redacao/:id`).
- `cognitivo` → default label, `target='mc'` (**WRONG**).
- `triagem`, `entrevista` → not candidate-facing avaliação-assíncrona cards, but would render as cards (should be **filtered out**).

**Recommended contract (id-only; reachability = Phase 26):**
1. New shared lib (e.g. `src/lib/testes/testeContract.ts`) exporting: the canonical template-id union, the container-id union, a `CANDIDATE_FACING` set, and a mapping function `templateTesteToContainerCards(templateTeste): ContainerTeste[]`:
   - `work_sample_sjt` → `['sjt_mc','sjt_caso_aberto']`
   - `redacao_cultural` → `['redacao']`
   - `big_five` → `['big_five']`
   - `cognitivo` → `['cognitivo']` (label + route stub; actual reachability Phase 26)
   - `triagem`, `entrevista` → `[]` (not candidate-facing → filtered by `deriveCards`)
2. `deriveCards` **filters** to candidate-facing template tests and maps through the lib (instead of copying `t.teste` verbatim). `handleOpenTeste`/`testeLabel` consume the container-id union.
3. **Contract test** (Vitest — precedent: Phase 11 SJT open-case contract test): iterate every `cargoTemplates` entry's `testes_aplicaveis`, run each `teste` through the lib's branch-map, and assert every emitted container id is one `handleOpenTeste`/`testeLabel` recognizes (no id falls to the default branch). This is the regress-guard.

## Area 3 — Decision history & option-edit guard (FUNIL-09/11)

### 3a. `decisao_final_historico` append-only table + trigger (FUNIL-09 / A26)

**Verified:** `decisao_final` has `UNIQUE(candidatura_id)` (`isOneToOne: true`, `database.types.ts` L1280) → `registrar_decisao` UPSERTs (`ON CONFLICT(candidatura_id) DO UPDATE`, migration `20260625100001` L126-131), which **overwrites** `decisao`/`justificativa`/`por_usuario`/`em`. An amendment (2nd `registrar_decisao` for the same candidatura) or an `em_espera` decision writes **no** `historico_candidatura` row (only `aprovado`/`rejeitado` change etapa → fire `avancar_etapa`). So the prior decision is destroyed with no trail — this is A26.

Recommended: new append-only table mirroring `decisao_final`'s columns + a snapshot timestamp:
```sql
CREATE TABLE public.decisao_final_historico (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id   uuid NOT NULL REFERENCES public.candidaturas(id),
  decisao          public.decisao_final_resultado NOT NULL,  -- OLD value
  justificativa    text NOT NULL,                            -- OLD value
  por_usuario      uuid NOT NULL,                            -- OLD actor (preserved!)
  decidido_em      timestamptz NOT NULL,                     -- OLD.em
  arquivado_em     timestamptz NOT NULL DEFAULT now()
);
-- AFTER UPDATE trigger copies OLD.* before the overwrite lands:
CREATE OR REPLACE FUNCTION public.snapshot_decisao_final()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  INSERT INTO public.decisao_final_historico
    (candidatura_id, decisao, justificativa, por_usuario, decidido_em)
  VALUES (OLD.candidatura_id, OLD.decisao, OLD.justificativa, OLD.por_usuario, OLD.em);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_decisao_final_snapshot
  AFTER UPDATE ON public.decisao_final
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_decisao_final();
```
RLS: block all client writes to `decisao_final_historico` (like `decisao_final`); reads via RH-scoped policy or a DEFINER RPC (Phase 24 pattern). The trigger is `SECURITY DEFINER` so the INSERT bypasses the write-block. Regenerate `database.types.ts` is Phase 27 territory — but the executor may need a local `as never`/manual type shim (the Phase-8/11 precedent) if TS needs the new table before regen.

### 3b. Honest `criterio_texto` (FUNIL-09 / A26 part 2)

In `registrar_decisao`, set `candidaturas.etapa_justificativa = p_justificativa` **before** the terminal etapa UPDATE (currently L139-143 only sets `etapa_atual`). `avancar_etapa` writes `criterio_texto := NEW.etapa_justificativa` (verified `20260624000004` L87). Today the historico row inherits a **stale** `etapa_justificativa` from a prior transition. Fix: prepend `UPDATE candidaturas SET etapa_justificativa = p_justificativa WHERE id = p_candidatura_id;` (or fold into the terminal UPDATE's SET list) so the audit row carries the real decision justificativa.

**Interaction with 1b:** since `registrar_decisao` will also `set_config('app.rejeicao_sancionada','on',true)` and (recommended) set `status='rejeitado'` for the rejeitado branch, fold all three (`status`, `etapa_atual`, `etapa_justificativa`) into a single UPDATE inside the flag context.

### 3c. `upsert_pergunta_opcoes_metadata` status + ownership guard (FUNIL-11 / A29)

**Verified current fn** (`20260607010003` L34-91): only a role check (L50-54); then DELETEs all `pergunta_opcao_metadata` for the pergunta (L57) and regenerates `opcao_id`s with `gen_random_uuid()` (L62). On an ACTIVE vaga this orphans `candidaturas.opcao_knockout_id` and desyncs the `qualificacao_etapa1` snapshot.

Add two in-body checks (mirror `publish_vaga` `20260607010004` L53-72), keeping the existing DELETE/regenerate logic **only when allowed**:
```sql
-- resolve the pergunta's vaga + owner:
SELECT v.status, v.created_by INTO v_status, v_owner
  FROM public.perguntas_formulario p JOIN public.vagas v ON v.id = p.vaga_id
 WHERE p.id = p_pergunta_id;
IF NOT FOUND THEN RAISE EXCEPTION 'pergunta não encontrada' USING ERRCODE='no_data_found'; END IF;

-- (A29) status hard-block — mirror publish_vaga's gate:
IF v_status <> 'rascunho' THEN
  RAISE EXCEPTION 'Não é possível editar opções de uma vaga % (apenas rascunho).', v_status
    USING ERRCODE='P0001';
END IF;

-- ownership (Phase 24 scoping): rh must own the vaga; administrador bypasses:
v_role := (auth.jwt() #>> '{app_metadata,role}');
IF v_role NOT IN ('rh','administrador') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
IF v_role = 'rh' AND v_owner IS DISTINCT FROM auth.uid() THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
END IF;
```
Keep `CREATE OR REPLACE` (idempotent) + the existing `REVOKE/GRANT authenticated` footer.

## Area 4 — Dead affordances, mock screens & hub 404 (UX-03/06)

### 4a. Hub nav bug (UX-03) — VERIFIED

- `CandidatosRHPage.handleVerPerfil` (L252-254): `navigate('/rh/candidatos/${candidatoId}')` — but it's called with `candidato?.id` (L409/L774, where `candidato = candidatura.candidato`) and passed to `<KanbanBoard onViewPerfil={handleVerPerfil}/>` (L963). `KanbanBoard` calls it with `candidato?.id` (L176). The route `/rh/candidatos/:id` is read by `HubCandidatoRH` as **candidaturaId** (`HubCandidatoRH.tsx` L78-79). **Fix:** pass `candidatura.id` everywhere (rename the param, fix both the `CandidatosRHPage` call sites and the `KanbanBoard.onViewPerfil` forward to receive `candidatura.id`).
- **Hub 404:** `HubCandidatoRH` degrades silently — `nomeCandidato = contexto?.candidato_nome ?? 'Candidato'`, `etapaLabel = etapaAtual ? … : '—'` (L104-105). When `useEntrevistaContexto(candidaturaId)` resolves to no row (`isError` or `data == null` after load), render an **in-shell** `GlassCard` not-found state (UI-SPEC §3: "Candidatura não encontrada" + accent "Voltar aos candidatos" → `/rh/candidatos`), **not** the global `NotFoundPage`.

### 4b. Mock-screen gating (UX-06 / A14/A37)

Per UI-SPEC §2: replace the mock **content region** with a centered `GlassCard` empty-state; **keep** the RH shell + route + `RoleGuard`. **Do NOT** DEV-gate or delete routes (`routes.tsx` L399-406 `/rh/perfil` role `['rh','administrador']`, L407-414 `/rh/configuracoes` role `administrador`).
- `ConfiguracoesPage.tsx` (A14): mock user list L169-207 + local/stub handlers (L461-494, L417/436/473); webhooks with dead M1 names L153-157 → replace body with "Gestão de usuários ainda não disponível" empty-state.
- `MeuPerfilPage.tsx` (A37): `handleSalvarDados` L38-40, `handleAlterarSenha` L42-49, `handleAlterarFoto` L51-53 (all TODO(M5)) → replace body with "Edição de perfil em breve" empty-state.

### 4c. No-op affordance removal (UX-06) — VERIFIED file:line (see UI-SPEC §4 for actions)

| Affordance | Location | Action |
|------------|----------|--------|
| Hardcoded badges `12`/`5` | `RHSidebar.tsx` L74/L80 (render L224-227) | Remove badge element |
| Global search box (no-op) | `RHTopBar.tsx` `handleSearch` L31-35; box L84-95 | Remove input + handler |
| "📚 Usar da Biblioteca" (no-op) | `CriarEditarVagaPage.tsx` L887-893 / L999-1005 (`onClick={(e)=>e.preventDefault()}`) | Remove buttons |
| Template "Preview" line | `CriarEditarVagaPage.tsx` L506 | Remove / wire to real slug preview |
| `avançar`/`rejeitar` no-op | `DecisaoFinalPage.tsx` embedded `<ComparativoScreen onAvancar={()=>{}} onRejeitar={()=>{}}/>` L194-207 (L197-198) | Hide the two buttons; real path = `registrar_decisao` |

**No-visual-regression rule (UI-SPEC):** after removal, no empty container, dangling border, orphaned label, or `0`/`—` placeholder may remain — layouts reflow.

## Runtime State Inventory

> Not a rename phase, but it touches DB migrations + a live enum cutover + stored config. Runtime-state audit:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (enum values) | `candidaturas.etapa_atual` in PROD already holds M2 values (`inscricao`…`decisao_final`, verified enum). The M1 values (`bigfive/disc/raven/cultura/avaliacao_final`) were **already dropped** by cutover migration `20260607000002_etapa_processo_v2_cutover.sql`. No live row carries a dead value. | **Code-only** — delete the dead frontend symbols; no data migration. The drift is entirely in the TS layer. |
| Stored config (`testes_aplicaveis`) | Every published vaga's `testes_aplicaveis` jsonb uses cargoTemplates ids (`work_sample_sjt`…). The container reads these verbatim. | **Code-only** — the FUNIL-05 lib maps ids at read time; **do not** rewrite stored jsonb. |
| `decisao_final` rows | UNIQUE(candidatura_id); amendments overwrite in place. Existing rows have NO historico backfill. | **Forward-only** — the AFTER UPDATE trigger captures OLD.* on *future* amendments; existing single-decision rows are unaffected. No backfill needed (A26 is about not-destroying-going-forward). |
| Live triggers on `candidaturas` | 4 existing (etapa guard, n8n status, analise insert, updated_at) — the new BEFORE UPDATE OF status guard coexists (§1d). | Add trigger; verify firing order + n8n coexistence via SQL smoke. |
| `database.types.ts` (build artifact) | New table `decisao_final_historico` + amended RPC signatures won't appear until regen (Phase 27). | Executor may need a local type shim (`as never` precedent, Phase 8/11) until Phase 27 regenerates. Note in plan. |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reject-audit enforcement | A client-side `if (rejecting) requireJustificativa()` check | BEFORE UPDATE trigger + DEFINER-RPC GUC flag | Client checks are bypassable; A9 is explicit that the invariant must be structural/server-authoritative. |
| Cross-statement "is this a sanctioned call" signal | A boolean column / side table / advisory lock | `set_config('app.*', 'on', true)` + `current_setting('app.*', true)` | Transaction-local GUC auto-resets (pooler-safe) and needs no schema. |
| Decision-history capture | Manual INSERT in every RPC that touches `decisao_final` | ONE `AFTER UPDATE` trigger copying `OLD.*` | Guarantees capture for *any* future writer; no double-write, no missed path. |
| etapa label duplication | A 2nd hardcoded label map in `KanbanBoard` | `triagemService.ETAPA_M2_LABELS` (single source) | A duplicate re-introduces exactly the drift this phase fixes. |
| test-id mapping scattered across container branches | Inline `switch` copies in `deriveCards` + `handleOpenTeste` + `testeLabel` | ONE shared lib + a contract test | The Phase-11 lesson: mocks on both sides of a boundary pass while the real contract is broken ([[feedback_integration_contract_gap]]). |

**Key insight:** every hole this phase closes was originally a hand-rolled shortcut (client-side status write, verbatim id copy, duplicated enum). The fix is consolidation onto server-authoritative + single-source primitives, then a regress-guard test.

## Common Pitfalls

### Pitfall 1: Assuming the tsc gate is 128
**What goes wrong:** Plan "keeps baseline 128 green"; CI actually gates at **133** (`ci.yml` L55, stale from Phase 22). New drift up to 133 passes silently; the phase's own reduction isn't locked in.
**How to avoid:** Re-measure (`npx tsc --noEmit | grep -c "error TS"`) after fixes and re-pin `ci.yml` L51/54/55/56 to the new lower number. Verified current real count = 128; expected post-fix ≈ 113-114.

### Pitfall 2: GUC-only guard breaks the raw-update reject paths
**What goes wrong:** A guard that requires `app.rejeicao_sancionada='on'` for ANY status→rejeitado blocks the comparativo inline reject (path #2, a raw client update that can't set a GUC) and would require rerouting it too.
**How to avoid:** Use the hybrid (§1b): allow when the flag is set **OR** the same UPDATE transitions `etapa_atual` (audited by `avancar_etapa`). Verify all 4 paths with SQL smokes.

### Pitfall 3: Forgetting `is_local=true` on `set_config`
**What goes wrong:** `set_config('app.x','on', false)` (or `SET` instead of `SET LOCAL`) leaks the flag across the Supabase transaction-pooler connection → a later unrelated status write on the same pooled connection passes the guard.
**How to avoid:** Always `set_config(key, val, true)`; read with `current_setting(key, true)` (missing_ok).

### Pitfall 4: `avancar_etapa` terminal transition allows a null-justificativa reject
**What goes wrong:** The etapa-transition branch of the guard (§1b) treats "etapa→rejeitado" as sufficient trail, but `avancar_etapa` writes `criterio_texto := NEW.etapa_justificativa` which may be NULL (the comparativo inline reject sets no justificativa). Trail exists, justificativa may not.
**How to avoid:** Decide (Open Q) whether the inline reject must also carry a justificativa. If strict RNF-07a, route it through `registrar_decisao` (≥50-char enforce).

### Pitfall 5: Migration application via `db push` on PL/pgSQL bodies (42601)
**What goes wrong:** `supabase db push --linked` on a `$$…$$` body + adjacent COMMENT/REVOKE/GRANT can raise `42601` (CLAUDE.md §Commands / D-22).
**How to avoid:** Apply via **Supabase MCP `apply_migration`** (writes the version row itself, bypasses 42601 — the established Phase 6-15/24 path). Version-row reconcile → Phase 27; do NOT force `db push`.

### Pitfall 6: Deleting `EtapaProcesso` outright breaks 5 interface fields
**What goes wrong:** `EtapaProcesso` is a field type in 5 `vagasTypes.ts` interfaces (L265/351/409/439/470), not just the Kanban.
**How to avoid:** Re-alias `EtapaProcesso = Database['public']['Enums']['etapa_processo']` (keeps the name, self-corrects fields) rather than deleting the type name; delete only the dead *value maps* (`ETAPAS_SEQUENCIA`/`getProximaEtapa`/`ETAPA_PROCESSO_LABELS`/`ETAPA_PROGRESS`/`ETAPA_TO_KANBAN`).

## Code Examples

### Verify all reject paths behave (SQL smoke skeleton — run live via MCP `execute_sql`)
```sql
-- Precedent: Phase 24 behavioral smokes (set_config jwt.claims + SET ROLE authenticated,
-- disposable fixture, ROLLBACK-free cleanup). Run inside a savepoint or fixture vaga/candidatura.

-- SMOKE A (hole closed): a status-only reject with etapa unchanged, no flag → must RAISE.
--   UPDATE candidaturas SET status='rejeitado' WHERE id = <fixture> AND etapa_atual unchanged;
--   EXPECT: exception 'Rejeição sem trilha…'

-- SMOKE B (sanctioned RPC works): SELECT registrar_decisao(<fixture>, 'rejeitado', <≥50 chars>);
--   EXPECT: ok; 1 new historico_candidatura row; candidaturas.etapa_atual='rejeitado'.

-- SMOKE C (etapa-transition allowed): UPDATE candidaturas SET status='rejeitado', etapa_atual='rejeitado' …
--   EXPECT: ok; 1 historico row via avancar_etapa.

-- SMOKE D (decision history): call registrar_decisao twice (amend) → decisao_final_historico gets 1 row (the OLD.*).

-- SMOKE E (option-edit guard): upsert_pergunta_opcoes_metadata on a pergunta of an 'ativa' vaga → must RAISE P0001.
```

### `set_config` inside the sanctioned RPC (add to registrar_decisao + submit_candidatura_atomic)
```sql
-- Before the terminal/knockout status UPDATE, mark the txn as sanctioned:
PERFORM set_config('app.rejeicao_sancionada', 'on', true);
UPDATE public.candidaturas
   SET status = 'rejeitado', etapa_atual = 'rejeitado', etapa_justificativa = p_justificativa
 WHERE id = p_candidatura_id;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| M1 10-value `EtapaProcesso` enum (bigfive/disc/raven/cultura/avaliacao_final) | 8-value `etapa_processo` (inscricao…decisao_final + 2 terminals) | Migration `20260607000002` (M2 Phase 6) | The frontend never caught up → this phase's cutover. Selecting a dead value = 22P02. |
| Client-side status write with `getProximaEtapa` auto-advance | Server-authoritative `avancar_etapa` trigger + `updateCandidaturaEtapa` (M2) | M2 Phase 6+ | The raw path is the A9 hole + the A16 crash vector — both deleted here. |
| `historico_candidatura` as the only decision trail | + append-only `decisao_final_historico` | This phase | Amendments/`em_espera` now leave a trail. |

**Deprecated/outdated:**
- `vagasTypes.ts` M1 value maps (`ETAPAS_SEQUENCIA`, `getProximaEtapa`, `ETAPA_PROCESSO_LABELS`, `ETAPA_PROGRESS`, `ETAPA_TO_KANBAN`) — dead, some already tsc-broken. `ETAPA_M2_LABELS` (triagemService) is the live single source.

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` → this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (frontend) + Deno test (EF corpus) |
| Config file | none dedicated (`vitest.config.*` absent) — Vitest picks up config via `vite.config.ts` / defaults; test script `"test": "vitest"`, CI = `npm run test:run` |
| Quick run command | `npm run test:run` (Vitest single run) |
| Full suite command | `npm run test:run` + `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` + `npx tsc --noEmit` (gate) + `npm run build` |
| SQL behavioral smokes | run live during `[BLOCKING]` apply via Supabase MCP `execute_sql` (Phase 24 precedent — not a CI test) |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| FUNIL-02 | status-only reject (etapa unchanged, no flag) is BLOCKED | SQL smoke (live) | MCP `execute_sql` SMOKE A | ❌ Wave 0 (live, not CI) |
| FUNIL-02 | sanctioned RPC reject still works + writes historico | SQL smoke (live) | SMOKE B | ❌ Wave 0 |
| FUNIL-02 | comparativo etapa-transition reject still works | SQL smoke (live) | SMOKE C | ❌ Wave 0 |
| FUNIL-03/06 | no `.eq('etapa_atual', <M1 value>)` remains; Kanban groups all 8 real values | unit | `npm run test:run` (KanbanBoard grouping test) | ⚠️ extend `KanbanBoard`/`candidaturasService` tests |
| FUNIL-04 | edit save persists base fields (round-trip) | unit/integration | `npm run test:run` (CriarEditarVagaPage save test) | ❌ Wave 0 |
| FUNIL-04 | tsc reduced + re-pinned | gate | `npx tsc --noEmit \| grep -c "error TS"` | n/a (CI gate) |
| FUNIL-05 | every template teste maps to a recognized container id (no default-branch fall-through) | **contract test** | `npm run test:run` (new `testeContract` test) | ❌ Wave 0 — the key regress-guard |
| FUNIL-09 | `decisao_final_historico` gets 1 row on amendment; `criterio_texto` honest | SQL smoke (live) | SMOKE D | ❌ Wave 0 |
| FUNIL-11 | upsert on ATIVA vaga RAISEs; non-owner RH RAISEs | SQL smoke (live) | SMOKE E | ❌ Wave 0 |
| UX-03 | hub renders not-found on unresolved id; nav passes candidatura.id | unit (RTL) | `npm run test:run` (HubCandidatoRH not-found test) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:run` (targeted file) + `npx tsc --noEmit` count check.
- **Per wave merge:** full Vitest + Deno corpus + tsc gate + build.
- **Phase gate:** all green + the live SQL smokes (A-E) PASS during the `[BLOCKING]` apply wave before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/lib/testes/__tests__/testeContract.test.ts` — FUNIL-05 contract test (parse every `cargoTemplates` teste through the branch-map).
- [ ] `src/components/__tests__/KanbanBoard.test.tsx` (or extend) — asserts 6 real columns + no M1 value + drag routes to `updateCandidaturaEtapa`.
- [ ] `src/features/hub-candidato/**/__tests__` — hub not-found state on unresolved id.
- [ ] `CriarEditarVagaPage` save round-trip test (base fields persisted).
- [ ] SQL smokes A-E authored as an MCP `execute_sql` block (live-apply wave), not CI.

## Security Domain

> `security_enforcement` absent in config → enabled. This phase is security-load-bearing (FUNIL-02 = LGPD-02 audit trail; FUNIL-11 = ownership/status guard).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | **yes** | FUNIL-11 ownership check (`created_by = auth.uid()` OR admin) + FUNIL-02 sanctioned-path guard; Phase-24 vaga-scoping pattern |
| V5 Input Validation | yes | Zod on the new canonical-id lib; `registrar_decisao` justificativa ≥50 re-asserted server-side |
| V7 Error Handling / Logging | **yes** | The FUNIL-02 audit trail IS the logging control (historico_candidatura + decisao_final_historico); never leak criterio_texto to the candidate (D-15 precedent) |
| V8 Data Protection / Privacy | yes | RNF-07a (no auto-reject by score) preserved; LGPD-02 (no decision without a human actor — `por_usuario NOT NULL`) preserved |

### Known Threat Patterns for {Supabase RLS + DEFINER RPC + trigger}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| RH rejects a candidate via raw `status` UPDATE, no trail (A9) | Repudiation / Tampering | BEFORE UPDATE guard + sanctioned-path GUC (§1b) |
| GUC flag leaks across pooled connections | Elevation of Privilege | `set_config(..., true)` (txn-local); `current_setting(..., true)` |
| Non-owner RH edits another vaga's options (IDOR) | Tampering | FUNIL-11 ownership check in-RPC body (RLS doesn't apply in DEFINER) |
| Editing options of an ACTIVE vaga orphans knockout ids | Tampering | FUNIL-11 status hard-block (mirror `publish_vaga`) |
| `criterio_texto`/justificativa leaks to candidate | Information Disclosure | Never `select('*')`; allowlist projection ([[reference_select_star_leaks_pii]]); D-15 neutral feedback |
| Guard trigger accidentally blocks the sanctioned knockout auto-reject (CI-03) | Denial of Service (self-inflicted) | Flag branch covers etapa-unchanged knockout; SMOKE verifies |

## Assumptions Log
| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `registrar_decisao` should also set `status='rejeitado'` (today it only sets `etapa_atual`), so the terminal status reflects the decision | §1b/§3b | If left, `candidaturas.status` stays stale after a Decisão Final reject (badge/filter may mislead); but the guard's etapa-branch still audits. Planner decision. |
| A2 | The comparativo inline reject (path #2) may remain justificativa-optional (hybrid guard preserves it) | §1c/Pitfall 4 | If strict RNF-07a intended, this path needs rerouting through `registrar_decisao` — larger scope. |
| A3 | `decisao_final_historico` reads are RH-scoped (not candidate-facing) | §3a | If a candidate-facing read is later needed, RLS + allowlist must be designed then. |
| A4 | Expected tsc post-fix baseline ≈ 113-114 (from −14 measured error clearance) | §2c | Actual depends on incidental fixes (`.finally`, RHLayout props); MUST re-measure, not assume. |
| A5 | `cognitivo` container id needs only a label + route stub here (reachability = Phase 26) | §2d | If the container must actually route cognitivo now, that pulls Phase-26 scope forward. |
| A6 | No new npm package needed | §Standard Stack | If a helper is wanted (unlikely), the Package Legitimacy Gate must run. |

## Open Questions (RESOLVED)
1. **Should `registrar_decisao` set `candidaturas.status='rejeitado'` (not only `etapa_atual`)?**
   - Known: today it sets etapa only; status stays whatever it was. The dashboard/filter read `status`.
   - Recommendation: YES — fold `status`, `etapa_atual`, `etapa_justificativa` into one UPDATE inside the flag context, so the terminal is consistent across both columns.
   - **RESOLVED: YES** — planned in 25-01 Task 2 (registrar_decisao amend folds status/etapa_atual/etapa_justificativa in one UPDATE inside the flag context).
2. **Does the comparativo inline "Rejeitar" (path #2) need a mandatory justificativa?**
   - Known: it's audited (etapa transition) but justificativa-optional today.
   - Recommendation: for a clean RNF-07a story, route it through `registrar_decisao` too; if out of budget, the hybrid guard keeps it working (audited) and this is a documented residual.
   - **RESOLVED: DEFERRED (accepted residual)** — operator decision 2026-07-09. Path stays audited-but-justificativa-optional; the hybrid guard keeps it safe. Tracked in `.planning/todos/pending/funil-02-comparativo-reject-justificativa.md`. Out of M4 hardening scope (would add UI + change screening→decisão semantics).
3. **Reroute target for the UpdateStatusModal reject (path #1):** `registrar_decisao` directly, or a new thin `rejeitar_candidatura` RPC? Recommendation: reuse `registrar_decisao` (already enforces justificativa + audit) unless the modal's UX diverges from Decisão Final.
   - **RESOLVED: reuse `registrar_decisao`** — planned in 25-02 Task 3 (UpdateStatusModal reject rerouted through registrar_decisao).
4. **Should `EtapaFunilM2` (triagemService) and `EtapaProcesso` (vagasTypes) be collapsed into one alias of the DB enum?** Recommendation: yes — one `Database['public']['Enums']['etapa_processo']` alias, re-exported, to kill the duplicate hand-written union (prevents future drift).
   - **RESOLVED: re-alias to the DB enum (Claude's discretion in 25-02 Task 1)** — `EtapaProcesso` re-aliased to `Database['public']['Enums']['etapa_processo']` (Pitfall 6: re-alias, don't delete the name). Full collapse of the duplicate union is at the executor's discretion within 25-02.

## Environment Availability
| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP `apply_migration`/`execute_sql` | PROD migration apply + live SQL smokes | ✓ (established Phase 6-24 path) | — | none needed (do NOT use `db push` on PL/pgSQL — 42601) |
| Node + Vitest | frontend tests + tsc gate | ✓ | Node 20 / Vitest 4.1.9 | — |
| Deno | EF corpus (no EF touched this phase, but CI job blocks) | ✓ | 2.7.7 (CI) | — |
| `git -c core.hooksPath=/dev/null` | commits (allowlisted) | ✓ | — | — |

**Missing dependencies:** none. This phase's DB writes go through the proven MCP path; no new tooling.

## Sources

### Primary (HIGH confidence — verified this session via Read/grep/tsc)
- `database.types.ts` — `vagas` Row (L3612-3731), `etapa_processo`/`status_candidatura`/`status_vaga`/`decisao_final_resultado` enums (L4647-4697), `candidaturas`/`decisao_final`/`historico_candidatura` Rows (L814, L1242, L1805).
- `supabase/migrations/20260624000004_avancar_etapa_flag_guard.sql` — BEFORE-UPDATE guard + idempotent re-bind precedent (the "flag" is a data column, not a GUC).
- `supabase/migrations/20260625100001_decisao_final_phase15.sql` — `registrar_decisao` UPSERT + terminal map (L122-143).
- `supabase/migrations/20260607010003_upsert_pergunta_opcoes_metadata_rpc.sql` — current fn (role-only guard, DELETE+regenerate).
- `supabase/migrations/20260607010004_publish_vaga_rpc.sql` — status-gate + ownership idiom to mirror.
- `supabase/migrations/20260608000001_inscricao_knockout.sql` L186-228 — knockout auto-reject (status→rejeitado, etapa unchanged, explicit historico).
- `KanbanBoard.tsx`, `candidaturasService.ts` L390-525, `triagemService.ts` (ETAPA_M2_LABELS/updateCandidaturaEtapa), `CriarEditarVagaPage.tsx` L130-374/L1075-1124, `cargoTemplates.ts`, `AvaliacaoContainer.tsx`, `HubCandidatoRH.tsx`, `CandidatosRHPage.tsx`, `ComparativoCandidatosPage.tsx`, `vagasTypes.ts` — drift confirmed.
- `.github/workflows/ci.yml` L48-90 — tsc gate pinned 133; `npx tsc --noEmit` measured = **128**; target-file error breakdown.
- `20260421000001_rate_limit_duplicate_check.sql` L100 — the `current_setting(key, true)` missing_ok precedent.

### Secondary (MEDIUM confidence)
- `.planning/STATE.md`, `.planning/REQUIREMENTS.md`, MEMORY.md — phase context, established patterns, deferred scope.
- `25-UI-SPEC.md` — binding surface contracts (Kanban columns, empty-states, hub 404, dead-affordance table).

### Tertiary (LOW confidence)
- Postgres `SET LOCAL`/`set_config`/`current_setting` semantics — `[ASSUMED]` from training + partially corroborated by the repo's XFF usage; verify the exact GUC behavior on the Supabase pooler during the live smoke.

## Metadata
**Confidence breakdown:**
- Drift map / column & enum facts: HIGH — every claim read-backed against source + database.types.ts + tsc.
- Guard design (hybrid + GUC): HIGH on the write-path inventory (verified all 4 paths); MEDIUM on the exact GUC idiom behavior under the Supabase pooler (verify live).
- FUNIL-05 contract: HIGH — mismatch confirmed by reading both sides.
- FUNIL-09/11 RPC amendments: HIGH — current signatures + gaps read from the exact migrations.

**Research date:** 2026-07-09
**Valid until:** 2026-08-08 (30 days — stable internal codebase; re-verify tsc count if other phases land first)
