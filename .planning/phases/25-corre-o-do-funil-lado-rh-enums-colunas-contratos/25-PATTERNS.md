# Phase 25: Correção do Funil (lado RH — enums, colunas & contratos) - Pattern Map

**Mapped:** 2026-07-09
**Files analyzed:** 26 (4 new DB objects · 3 modified DEFINER RPCs · 12 modified frontend files · 4 new tests · 1 CI config · 2 read-only reference modules)
**Analogs found:** 24 / 26 (2 files have no direct analog — the `testeContract` mapping lib and the CI re-pin)

> **Framing (binding):** This is a CORRECTION/HARDENING phase. Almost every file already exists and is being MODIFIED. For those, the "analog" is either (a) the correct sibling pattern already live in the same codebase that the drifted file must be rewired onto (e.g. `triagemService.ETAPA_M2_LABELS` / `updateCandidaturaEtapa`), or (b) an established DB idiom (`publish_vaga` status-gate, `registrar_decisao` ownership guard, the `avancar_etapa` guard-trigger shape). Each assignment below gives the **current (broken) pattern** with line refs and the **target pattern to replicate** with the analog's line refs.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/<ts>_guard_rejeicao_auditada.sql` **(NEW)** | migration (trigger fn) | event-driven | `20260624000004_avancar_etapa_flag_guard.sql` | exact (guard-trigger shape); GUC idiom = partial (`20260421000001:100`) |
| `supabase/migrations/<ts>_decisao_final_historico.sql` **(NEW)** | migration (table + AFTER trigger) | event-driven | `20260608000001_inscricao_knockout.sql` L200-204 (append-only INSERT) + `avancar_etapa()` fn body | role-match |
| `registrar_decisao` amendment (CREATE OR REPLACE) | migration (DEFINER RPC) | request-response | itself (`20260625100001` L73-149) + `publish_vaga` ownership | exact (self) |
| `upsert_pergunta_opcoes_metadata` guard (CREATE OR REPLACE) | migration (DEFINER RPC) | request-response | `publish_vaga` L59-72 (status-gate) + `registrar_decisao` L96-117 (ownership) | exact |
| `submit_candidatura_atomic` flag add (CREATE OR REPLACE) | migration (DEFINER RPC) | request-response | `20260608000001` L186-207 (knockout UPDATE — insert flag before it) | exact (self) |
| `src/components/KanbanBoard.tsx` | component | event-driven (DnD) | `triagemService.ts` (`ETAPA_M2_LABELS`, `updateCandidaturaEtapa`, `ETAPA_M2_OPTIONS`) | exact (correct M2 path) |
| `src/features/vagas/services/candidaturasService.ts` | service | CRUD | `triagemService.updateCandidaturaEtapa` L350-378 (the server-authoritative replacement) | role-match |
| `src/features/vagas/types/vagasTypes.ts` | model (types) | — | `triagemService.EtapaFunilM2` L302-310 + `database.types.ts` `Enums.etapa_processo` | exact |
| `src/lib/testes/testeContract.ts` **(NEW)** | utility (mapping lib) | transform | `triagemService.ETAPA_M2_LABELS` (single-source map idiom) + `@/lib/efErrors` (shared lib) | partial (no id-mapping lib exists yet) |
| `src/features/avaliacao/components/AvaliacaoContainer.tsx` | component | transform | its own `deriveCards`/`handleOpenTeste`/`testeLabel` L254-322 (rewire onto lib) | exact (self) |
| `src/components/pages/CriarEditarVagaPage.tsx` | component/page | CRUD | `configVagaService.updateVagaConfig` L59-85 (real `.from('vagas').update`) | role-match |
| `src/features/config-vaga/services/configVagaService.ts` | service | CRUD | `updateVagaConfig` L59-85 (add sibling `updateVagaBase` writer) | exact (self) |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx` | component | request-response | `NotFoundPage.tsx` (glass 404) + `AsyncState`/`WrongEtapaState` (in-shell empty) | role-match |
| `src/components/pages/CandidatosRHPage.tsx` | component/page | request-response | `HubCandidatoRH` L78-79 (`:id` IS candidaturaId) | exact |
| `src/components/pages/ConfiguracoesPage.tsx` | component/page | — | `AsyncState.EstadoVazio` L104-110 + `AvaliacaoContainer` empty-state block L155-170 | role-match |
| `src/components/pages/MeuPerfilPage.tsx` | component/page | — | same empty-state analog as ConfiguracoesPage | role-match |
| `src/components/modals/UpdateStatusModal.tsx` | component (modal) | request-response | `registrar_decisao` RPC call via a service (justificativa ≥50) | role-match |
| `src/components/RHSidebar.tsx` | component | — | UI-SPEC §4 (remove badge element) | trivial (removal) |
| `src/components/RHTopBar.tsx` | component | — | UI-SPEC §4 (remove search input + handler) | trivial (removal) |
| `src/features/decisao/components/DecisaoFinalPage.tsx` | component | — | UI-SPEC §4 (hide no-op avançar/rejeitar) | trivial (removal) |
| `src/lib/testes/__tests__/testeContract.test.ts` **(NEW)** | test | contract | `bigfive-contract.test.ts` (Part 1 runtime replica idiom) | role-match |
| `src/components/__tests__/KanbanBoard.test.tsx` **(NEW/extend)** | test | — | `TriagemTable.test.tsx` (RTL RH component test) | role-match |
| `src/features/hub-candidato/**/__tests__/hubNotFound.test.tsx` **(NEW)** | test | — | `hubEmptyState.test.tsx` (hub RTL empty-state) | exact |
| CriarEditarVagaPage save round-trip test **(NEW)** | test | — | existing vitest service/round-trip tests | role-match |
| `.github/workflows/ci.yml` | config (CI) | — | **no analog** — re-measure + re-pin the tsc number | none |

---

## Pattern Assignments

### A — DB migrations (apply via Supabase MCP `apply_migration`; NEVER `db push` on PL/pgSQL — 42601, D-22)

---

### `guard_rejeicao_auditada` trigger migration (NEW) — FUNIL-02 / A9

**Analog (guard-trigger shape):** `supabase/migrations/20260624000004_avancar_etapa_flag_guard.sql`
**Analog (GUC missing_ok read):** `supabase/migrations/20260421000001_rate_limit_duplicate_check.sql:100` (`current_setting('request.headers', true)`)

**⚠ CONTEXT/RESEARCH correction (surface to planner):** the named precedent `avancar_etapa_flag_guard` does **NOT** use a session GUC — its "flag" is the data column `entrevista_analises.bloqueio_avanco` (a subquery-read boolean). It is a good precedent for the **BEFORE-UPDATE guard fn + idempotent re-bind** shape, but `set_config('app.*', …, true)` / `current_setting('app.*', true)` is **new to this repo**.

**Function header pattern to copy** (analog L35-40 — every guard fn uses this exact preamble):
```sql
CREATE OR REPLACE FUNCTION public.<name>()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
```

**Hybrid guard body** (RESEARCH §1b — both branches required: flag OR etapa-transition; keys only on `status` crossing into `rejeitado`):
```sql
IF NEW.status = 'rejeitado' AND OLD.status IS DISTINCT FROM 'rejeitado' THEN
  IF current_setting('app.rejeicao_sancionada', true) IS DISTINCT FROM 'on'
     AND NEW.etapa_atual IS NOT DISTINCT FROM OLD.etapa_atual THEN
    RAISE EXCEPTION 'Rejeição sem trilha de auditoria não é permitida (RNF-07a / LGPD-02)'
      USING ERRCODE = 'check_violation';
  END IF;
END IF;
RETURN NEW;
```

**Idempotent trigger re-bind + hardening** (copy analog L94-119 verbatim, changing name/timing to `BEFORE UPDATE OF status`):
```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_candidaturas_guard_rejeicao'
      AND tgrelid = 'public.candidaturas'::regclass) THEN
    EXECUTE 'CREATE TRIGGER trg_candidaturas_guard_rejeicao
             BEFORE UPDATE OF status ON public.candidaturas
             FOR EACH ROW EXECUTE FUNCTION public.guard_rejeicao_auditada()';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.guard_rejeicao_auditada() FROM PUBLIC;
```

**Firing-order note (verified, RESEARCH §1d):** BEFORE row-triggers fire alphabetically: `candidaturas_avancar_etapa_trg` (c) < `trg_candidaturas_guard_rejeicao` (t) → `avancar_etapa` writes its audit row first, then the guard validates; a RAISE rolls back both atomically. The AFTER `trg_n8n_status_candidatura` (Phase 24 SEC-03) only fires on statement success → a blocked reject never dispatches n8n. **Must not break either.**

**No-BEGIN/COMMIT-wrapper + apply-note pattern** — copy the header comment block idiom from analog L26-32 (declares "apply via Supabase MCP apply_migration in the [BLOCKING] wave — NOT applied here").

---

### `decisao_final_historico` table + AFTER UPDATE trigger (NEW) — FUNIL-09 / A26

**Analog (append-only INSERT):** `supabase/migrations/20260608000001_inscricao_knockout.sql` L200-204 (the explicit `INSERT INTO public.historico_candidatura (...) VALUES (...)` append idiom).
**Analog (AFTER-trigger fn body + DEFINER):** `avancar_etapa()` (`20260624000004` L35-92) and the snapshot skeleton in RESEARCH §3a.

**Table shape** (RESEARCH §3a — mirrors `decisao_final` columns + a snapshot timestamp; `por_usuario` NOT NULL preserves the actor):
```sql
CREATE TABLE public.decisao_final_historico (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid NOT NULL REFERENCES public.candidaturas(id),
  decisao        public.decisao_final_resultado NOT NULL,  -- OLD value
  justificativa  text NOT NULL,                            -- OLD value
  por_usuario    uuid NOT NULL,                            -- OLD actor (preserved!)
  decidido_em    timestamptz NOT NULL,                     -- OLD.em
  arquivado_em   timestamptz NOT NULL DEFAULT now()
);
```

**Snapshot trigger fn** — same DEFINER preamble as every trigger fn (copy `avancar_etapa` L35-40); captures `OLD.*` before the UPSERT overwrite lands:
```sql
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

**RLS pattern to copy:** `decisao_final` blocks all client writes (`FOR INSERT WITH CHECK (false)`, no client UPDATE policy — see `20260625100001` header L9-12). Mirror it: block client writes on `decisao_final_historico`; the DEFINER trigger bypasses the block. Reads RH-scoped or via a DEFINER RPC (Phase 24 pattern). **Types regen deferred to Phase 27** → executor may need a local `as never` shim (Phase 8/11 precedent) if TS needs the table before regen.

---

### `registrar_decisao` amendment (CREATE OR REPLACE) — FUNIL-09 / A26 part 2

**Analog:** itself, `supabase/migrations/20260625100001_decisao_final_phase15.sql` L73-149.

**Current terminal UPDATE** (L139-143 — sets only `etapa_atual`, split into two branches):
```sql
IF p_decisao = 'aprovado' THEN
  UPDATE public.candidaturas SET etapa_atual = 'aprovado' WHERE id = p_candidatura_id;
ELSIF p_decisao = 'rejeitado' THEN
  UPDATE public.candidaturas SET etapa_atual = 'rejeitado' WHERE id = p_candidatura_id;
END IF;
```

**Target pattern** (RESEARCH §3b + §Code Examples — fold `status` + `etapa_atual` + honest `etapa_justificativa` into ONE UPDATE inside the sanctioned-flag context; the existing ownership guard L96-117 and justificativa≥50 check L88-93 stay verbatim):
```sql
PERFORM set_config('app.rejeicao_sancionada', 'on', true);   -- is_local=true → txn-scoped, pooler-safe
UPDATE public.candidaturas
   SET etapa_atual = 'rejeitado',
       status = 'rejeitado',                 -- Open Q1 rec: terminal reflects the decision (was stale)
       etapa_justificativa = p_justificativa -- avancar_etapa writes criterio_texto := NEW.etapa_justificativa
 WHERE id = p_candidatura_id;
```
- Keep the `aprovado` branch analogously (set the flag is only needed for the `rejeitado` write; `avancar_etapa` still fires for both).
- Do **NOT** add a manual `historico_candidatura` INSERT — the etapa UPDATE fires `avancar_etapa` which writes the ONE audit row (existing comment L133-138; Phase-8 survivor double-write lesson).
- The AFTER UPDATE `snapshot_decisao_final` trigger (new above) captures the OLD decision on the UPSERT (L122-131) — no change needed there.

---

### `upsert_pergunta_opcoes_metadata` guard (CREATE OR REPLACE) — FUNIL-11 / A29

**Analog (status-gate):** `publish_vaga` `20260607010004` L59-72.
**Analog (ownership guard):** `registrar_decisao` `20260625100001` L96-117.
**File being replaced:** `supabase/migrations/20260607010003_upsert_pergunta_opcoes_metadata_rpc.sql` L34-91.

**Current guard** (L50-54 — role-only, then DELETEs all metadata L57 + regenerates `opcao_id` L62):
```sql
v_role := (auth.jwt() #>> '{app_metadata,role}');
IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
  RAISE EXCEPTION 'forbidden' USING errcode = '42501';
END IF;
```

**Target — add BEFORE the DELETE** (mirror `publish_vaga` L59-72 for the status hard-block + `registrar_decisao` L96-117 for ownership; keep the existing DELETE/regenerate/write-back body L56-90 unchanged when allowed):
```sql
-- resolve the pergunta's vaga + owner (publish_vaga load idiom L59-67):
SELECT v.status, v.created_by INTO v_status, v_owner
  FROM public.perguntas_formulario p JOIN public.vagas v ON v.id = p.vaga_id
 WHERE p.id = p_pergunta_id;
IF NOT FOUND THEN RAISE EXCEPTION 'pergunta não encontrada' USING ERRCODE='no_data_found'; END IF;

-- A29 status hard-block (mirror publish_vaga L69-72):
IF v_status <> 'rascunho' THEN
  RAISE EXCEPTION 'Não é possível editar opções de uma vaga % (apenas rascunho).', v_status
    USING ERRCODE='P0001';
END IF;

-- ownership (mirror registrar_decisao L111-117): rh must own the vaga; administrador bypasses:
IF v_role = 'rh' AND v_owner IS DISTINCT FROM (select auth.uid()) THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
END IF;
```
Keep the `REVOKE ALL … / GRANT EXECUTE … TO authenticated` footer (L96-97) verbatim.

---

### `submit_candidatura_atomic` flag add (CREATE OR REPLACE) — FUNIL-02 knockout coexistence

**Analog:** itself, `20260608000001_inscricao_knockout.sql` L186-207 (knockout auto-reject: status→rejeitado, etapa stays `inscricao`).

**Target:** insert `PERFORM set_config('app.rejeicao_sancionada', 'on', true);` immediately BEFORE the knockout `UPDATE public.candidaturas SET status='rejeitado'…` at L192. This is why the guard's **flag branch** is required (path #4 sets status→rejeitado with etapa unchanged → the etapa-transition branch would not cover it). SMOKE verifies knockout still auto-rejects (RESEARCH §1a path #4, Pitfall — guard must not block CI-03).

---

### B — Frontend services & types

---

### `src/features/vagas/types/vagasTypes.ts` (model) — FUNIL-03/06 / A12/A16

**Analog:** `triagemService.EtapaFunilM2` L302-310 (hand-written mirror of the live 8-value enum) + `database.types.ts` `Enums.etapa_processo`.

**Current dead symbols** (all over M1 values `bigfive/disc/raven/cultura/avaliacao_final` that do not exist in the DB → `.eq('etapa_atual',<dead>)` = Postgres 22P02):
- `EtapaProcesso` union L200-210 (10-value)
- `ETAPA_PROCESSO_LABELS` L604-615
- `ETAPA_PROGRESS` L635-646
- `ETAPAS_SEQUENCIA` L652-663
- `getProximaEtapa` L670-680
- `ETAPA_TO_KANBAN` L732+ (already a tsc error — L734 `big_five` key not in `EtapaProcesso`)

**Target pattern (Pitfall 6 — re-alias, do NOT delete the type name):** `EtapaProcesso` is a field type in 5 interfaces (L265/351/409/439/470). Re-point the alias so all self-correct:
```ts
export type EtapaProcesso = Database['public']['Enums']['etapa_processo']
```
Then **delete** the dead value maps (`ETAPAS_SEQUENCIA`/`getProximaEtapa`/`ETAPA_PROCESSO_LABELS`/`ETAPA_PROGRESS`/`ETAPA_TO_KANBAN`) — none have consumers outside this file (RESEARCH §1e grep table). `ETAPA_M2_LABELS` (triagemService L325-334) is the live single-source label map — do not re-create a copy. **Consider collapsing `EtapaFunilM2` into the same DB-enum alias (Open Q4) to kill the duplicate union.** Clears −3 tsc here.

---

### `src/features/vagas/services/candidaturasService.ts` (service, CRUD) — FUNIL-06 / A16

**Analog (the server-authoritative replacement):** `triagemService.updateCandidaturaEtapa` L350-378.

**Current hole/crash** (`updateCandidaturaStatus` L437-453 — `getProximaEtapa('triagem')`→`'bigfive'` = 22P02):
```ts
if (status_candidatura === 'aprovado_proxima') {
  const proximaEtapa = getProximaEtapa(etapaAtualAnterior)  // ← dead M1 auto-advance
  if (proximaEtapa) { novaEtapa = proximaEtapa; novoStatus = 'aguardando_resposta' }
}
```

**Target pattern** — delete the auto-advance block (L437-453), drop the `getProximaEtapa` import (L35) and `EtapaProcesso` cast usage now that the type re-aliases. The raw `.from('candidaturas').update({status, etapa_atual, ...})` L464-467 stays for the status-only path, but the etapa-move path routes through the M2 service. Clears −5 tsc (L166/321/458/580/709). Keep the SEC-11 console-log discipline (L470-477 — never log `updateData`).

**Reference — the target M2 write** (`updateCandidaturaEtapa` L350-378, already handles the terminal `status='rejeitado'` sync L362-364 and fires `avancar_etapa`):
```ts
const update: { etapa_atual: EtapaFunilM2; status?: StatusCandidatura } = { etapa_atual: novaEtapa }
if (novaEtapa === 'rejeitado') { update.status = 'rejeitado' }
await supabase.from('candidaturas').update(update as never).eq('id', candidaturaId)
```

---

### `src/features/config-vaga/services/configVagaService.ts` (service, CRUD) — FUNIL-04 / A13

**Analog:** its own `updateVagaConfig` L59-85 (the working real `.from('vagas').update`).

**Target pattern — add a sibling `updateVagaBase` writer** for the base fields + status, mirroring the exact error-mapping/`isForbidden` idiom (L46-53, L71-84). The config writer is untouched:
```ts
export async function updateVagaBase(vagaId: string, base: VagaBaseInput): Promise<void> {
  const { error } = await supabase.from('vagas').update({
    titulo: base.titulo, departamento: base.departamento, cidade: base.cidade, estado: base.estado,
    faixa_salarial_min: base.faixaSalarialMin, faixa_salarial_max: base.faixaSalarialMax,
    jornada_trabalho: base.jornada, responsabilidades: base.responsabilidades,
    requisitos_formacao: base.formacao, requisitos_experiencia: base.experiencia,
    requisitos_tecnicos: base.tecnicos, requisitos_habilidades: base.habilidades,
    diferenciais: base.diferenciais, status: base.status,
  }).eq('id', vagaId)
  if (error) { if (isForbidden(error)) throw new ConfigVagaServiceError('Sem permissão…', 'FORBIDDEN', error)
    throw new ConfigVagaServiceError(`Erro ao salvar a vaga: ${error.message}`, 'DATABASE_ERROR', error) }
}
```
(Confirm exact column names against `database.types.ts` vagas Row L3612-3731 — RESEARCH §2a phantom→real map is verified.)

---

### `src/features/config-vaga/templates/cargoTemplates.ts` (config data) — FUNIL-05 (reference only)

Read-only reference. `baseTestes` L55-73 emits `{triagem, work_sample_sjt, redacao_cultural, big_five, cognitivo, entrevista}`. The new `testeContract` lib consumes this union; the template file itself likely does **not** change (optionally narrow `TesteAplicavel['teste']` from `z.string()` to the canonical union — Claude's discretion). Its `getCargoTemplateDefaults` deep-copy idiom L227-247 is unrelated.

---

### `src/lib/testes/testeContract.ts` (utility, transform) — FUNIL-05 / A15 **(NEW — no direct analog)**

**Closest idiom:** the single-source map pattern of `triagemService.ETAPA_M2_LABELS` L325-334 (one exported `Record`, no duplicate copies) and the shared-helper pattern of `@/lib/efErrors` (`extractEfErrorCode`, imported by triagemService L17). There is no existing id-mapping lib — this is genuinely new, but its shape follows RESEARCH §2d:

**Target contract** (id-only; reachability = Phase 26):
- canonical template-id union `{triagem, work_sample_sjt, redacao_cultural, big_five, cognitivo, entrevista}`
- container-id union `{sjt_mc, sjt_caso_aberto, big_five, redacao, cognitivo}`
- `CANDIDATE_FACING` set
- `templateTesteToContainerCards(t): ContainerTeste[]` mapping:
  - `work_sample_sjt → ['sjt_mc','sjt_caso_aberto']`
  - `redacao_cultural → ['redacao']`
  - `big_five → ['big_five']`
  - `cognitivo → ['cognitivo']`
  - `triagem`, `entrevista → []` (not candidate-facing → filtered out)

---

### `src/features/avaliacao/components/AvaliacaoContainer.tsx` (component, transform) — FUNIL-05 / A15

**Analog:** itself — `deriveCards` L254-270, `handleOpenTeste` L308-322, `testeLabel` L56-72.

**Current break** — `deriveCards` copies `t.teste` **verbatim** (L259-260), so a real vaga's `work_sample_sjt`/`redacao_cultural`/`cognitivo` fall to the default label + accidental `target='mc'` (RESEARCH §2d). Container recognizes only `{sjt_mc, sjt_caso_aberto, big_five, redacao}` (`testeLabel` L57-66; `handleOpenTeste` L311-320).

**Target pattern:** `deriveCards` **filters** to candidate-facing template tests and maps through `templateTesteToContainerCards` (from the lib) instead of copying `t.teste`. `testeLabel`/`handleOpenTeste` consume the container-id union. `handleOpenTeste`'s existing routing (redação → `/candidato/redacao/:id` L311-313; big_five → `target='bigfive'` L316-317; caso → `target='caso'` L318-319) is the branch-map the contract test parses against.

---

### C — Frontend components (Kanban, hub, nav, empty-states, dead affordances)

---

### `src/components/KanbanBoard.tsx` (component, event-driven DnD) — FUNIL-03/06 / A12/A16

**Analog:** `triagemService.ts` — `ETAPA_M2_LABELS` L325-334 (labels), `ETAPA_M2_OPTIONS` L337-348, `updateCandidaturaEtapa` L350-378 (the M2 write), `EtapaFunilM2` L302-310.

**Current drift:**
- `KANBAN_COLUMNS` L44-57 — 4 dead columns (`bigfive/disc/raven/cultura`), missing `inscricao/avaliacao_assincrona/decisao_final`.
- `groupedCandidaturas` L283-308 — `Record` keyed on dead values; `console.warn`→`triagem` fallback L301-303.
- `handleDrop` L311-358 → `useUpdateCandidaturaStatus` (the raw auto-advance service).
- Grid `lg:grid-cols-[repeat(7,…)]` L366.
- `onViewPerfil(candidato?.id)` L176 (nav bug — see UX-03 below).

**Target pattern (UI-SPEC §1, binding):**
- Replace `KANBAN_COLUMNS` with the 6 real working stages in funnel order (`inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final`), labels sourced from `ETAPA_M2_LABELS` (do NOT hardcode a 2nd copy). Glyph/hue table in UI-SPEC §1.
- Terminals (`aprovado`/`rejeitado`) are **not** drop columns → render a terminal pill on the card (existing status color language); no "Rejeitado" drop column (closes the reject vector at the UI).
- Rebuild `groupedCandidaturas` on the 8 real values; delete the `console.warn` fallback.
- Route drag→drop through `updateCandidaturaEtapa` (a thin `useUpdateCandidaturaEtapa` mutation, or call the service) — fires `avancar_etapa` (validates + audits). Grid → `repeat(6,…)`.
- Reuse the existing `Glass` column + gradient header + glyph + count + "Solte aqui" drop indicator (KanbanColumn L192-273) — no new column component.
- The card/column visual composition (draggable `Glass variant="white"`, `getScoreColor` L62-68) stays. Clears −1 tsc (L284).

---

### `src/features/hub-candidato/components/HubCandidatoRH.tsx` (component) — UX-03 (404 state)

**Analog (in-shell glass empty/404):** `NotFoundPage.tsx` glass composition (L61-97: `GlassCard variant="dark"` + heading + body + single accent `GlassButton` back-link) and `AvaliacaoContainer.WrongEtapaState` L226-252 (in-shell centered `GlassPanel` with a back CTA). **Use an in-shell state within `RHLayout`, NOT the global `NotFoundPage`** (UI-SPEC §3).

**Current silent degradation** (L104-105):
```ts
const nomeCandidato = contexto?.candidato_nome ?? 'Candidato'
const etapaLabel = etapaAtual ? ETAPA_M2_LABELS[etapaAtual] : '—'
```
`useEntrevistaContexto(candidaturaId)` L83-84 already exposes `isError` and `data == null`.

**Target pattern (UI-SPEC §3):** when the query resolves to no row for the id (after load, `!loadingContexto && (errorContexto || !contexto)`), render a centered `GlassCard` inside `<RHLayout>`:
- heading (20px/600): "Candidatura não encontrada"
- body (16px/400): "Não encontramos essa candidatura. Ela pode ter sido removida ou o link está incorreto."
- single accent `GlassButton variant="accent"` + leading `ArrowLeft` (aria-hidden), label "Voltar aos candidatos" → `/rh/candidatos`, `min-h-11` (copy the NotFoundPage back-link idiom L88-95).

---

### `src/components/pages/CandidatosRHPage.tsx` (component/page) — UX-03 nav bug

**Analog:** `HubCandidatoRH` L78-79 — the `:id` route param IS a **candidaturaId** ("⚠ candidaturaId, NOT candidato.id (Pitfall 1)").

**Current bug** (`handleVerPerfil` L252-254 navigates with `candidatoId`; called with `candidato?.id` at L409/L774; forwarded to `<KanbanBoard onViewPerfil={handleVerPerfil}/>` L963; KanbanBoard calls it with `candidato?.id` L176):
```ts
const handleVerPerfil = (candidatoId: string) => { navigate(`/rh/candidatos/${candidatoId}`) }
```

**Target pattern:** pass `candidatura.id` everywhere — rename the param, fix both `CandidatosRHPage` call sites (L409/L774) and the `KanbanBoard.onViewPerfil` forward (KanbanBoard L172-177 must pass `candidatura.id`, not `candidato?.id`). The route then resolves in `HubCandidatoRH` as the candidaturaId it expects.

---

### `ConfiguracoesPage.tsx` (A14) + `MeuPerfilPage.tsx` (A37) — UX-06 gated mock screens

**Analog (empty-state block):** `AsyncState.EstadoVazio` L104-110 (centered `py-12`, heading `text-base font-semibold`, body `text-sm text-white/70`) and `AvaliacaoContainer`'s glass empty-state L155-170 (muted lucide icon + `p-12 text-center`).

**Target pattern (UI-SPEC §2, binding):** replace the **entire mock content region** with a single centered `GlassCard` empty-state; **keep** the RH shell (nav/sidebar) + header/title + route + `RoleGuard`. **Do NOT** DEV-gate, **do NOT** delete the route. No CTA (feature unavailable).
- `/rh/configuracoes` (mock user list L169-207 + stub handlers L461-494): icon `Users`/`Settings`, heading "Gestão de usuários ainda não disponível", body per UI-SPEC §2 table.
- RH `MeuPerfilPage` (stub `handleSalvarDados` L38-40 / `handleAlterarSenha` L42-49 / `handleAlterarFoto` L51-53): icon `UserRound`, heading "Edição de perfil em breve", body per table.

---

### Dead-affordance removals (UX-06) — trivial, remove not disable (UI-SPEC §4)

| File | Location | Action |
|------|----------|--------|
| `src/components/RHSidebar.tsx` | `badge:12` L74, `badge:5` L80 (render L224-227) | Remove the badge element (never render "0"); row reflows |
| `src/components/RHTopBar.tsx` | `handleSearch` L31-35, search box L84-95 | Remove input + handler; TopBar reflows |
| `src/components/pages/CriarEditarVagaPage.tsx` | "📚 Usar da Biblioteca" L887-893 / L999-1005; "Preview" L506 | Remove the no-op buttons |
| `src/features/decisao/components/DecisaoFinalPage.tsx` | `<ComparativoScreen onAvancar={()=>{}} onRejeitar={()=>{}}/>` L194-207 (L197-198) | Hide the two no-op buttons; comparison content stays |

**No-visual-regression rule (UI-SPEC §4):** after removal no empty container, dangling border, orphaned label, or `0`/`—` placeholder may remain — layouts reflow.

---

### `src/components/pages/CriarEditarVagaPage.tsx` (component/page, CRUD) — FUNIL-04 / A13

**Analog:** `configVagaService.updateVagaConfig` L59-85 (working real update) + the new `updateVagaBase` writer above.

**Current phantom hydration** (L150-173 reads 8 columns that do not exist — each a tsc error):
```ts
salario: data.faixa_salarial || '',            // TS2551 → faixa_salarial_min/max
jornada: data.carga_horaria || '',             // TS2339 → jornada_trabalho
responsabilidades: data.descricao_completa,    // TS2551 → responsabilidades/sobre_cargo
formacao: data.requisito_formacao,             // TS2551 → requisitos_formacao
experiencia: data.requisito_experiencia,       // TS2551 → requisitos_experiencia
conhecimentosTecnicos: data.requisito_tecnico, // TS2551 → requisitos_tecnicos
habilidadesEssenciais: data.requisito_comportamental, // TS2339 → requisitos_habilidades
pessoaCerta: data.requisito_diferencial,       // TS2339 → diferenciais/perfil_ideal
```

**Current save gap:** the footer save handlers only persist config — `handleSalvarRascunho` L302-318 and `handlePublicar` L322-374 both go through `updateVagaConfigMut` (config only). Base fields + status radio persist **nothing** on edit.

**Target pattern (UI-SPEC §5, FUNIL-04):**
1. Rewire hydration L150-173 to the real columns (RESEARCH §2a verified map); clears −8 tsc. The `.finally` on the hydration chain (L187) likely clears incidentally.
2. Add a **"Salvar alterações"** (accent) primary CTA on the edit path that calls the new `updateVagaBase` (base fields + status radio) **plus** the existing config save — config controls unchanged (`handlePublicar` still calls `publishGate` with `perguntas: []` L341, F7 deferred — do not expand).

---

## Shared Patterns

### SECURITY DEFINER RPC preamble (all migrations)
**Source:** every DEFINER fn — `registrar_decisao` `20260625100001` L79-82, `publish_vaga` `20260607010004` L39-42.
**Apply to:** the guard trigger fn, the snapshot trigger fn, the two amended RPCs.
```sql
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
```
`auth.uid()`/`auth.jwt()` read the request.jwt GUC and **survive** DEFINER (D-09 / Phase-6 proof). Footer every fn with `REVOKE ALL … FROM PUBLIC` (+ `GRANT EXECUTE … TO authenticated` for callable RPCs).

### In-body authorization (RLS does NOT apply inside a DEFINER body)
**Source:** `publish_vaga` L53-57 (role), `registrar_decisao` L107-117 (role + own-vaga).
**Apply to:** `upsert_pergunta_opcoes_metadata` (add ownership), `registrar_decisao` (unchanged).
```sql
v_role := (select auth.jwt() #>> '{app_metadata,role}');
IF v_role NOT IN ('rh','administrador') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
IF v_role = 'rh' AND v_owner IS DISTINCT FROM (select auth.uid()) THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
```

### Transaction-local GUC flag (NEW idiom — pooler-safe)
**Source:** RESEARCH §1b + the `current_setting(key, true)` missing_ok precedent at `20260421000001:100`.
**Apply to:** the guard trigger (read) + `registrar_decisao` & `submit_candidatura_atomic` (write).
- write: `PERFORM set_config('app.rejeicao_sancionada', 'on', true);` — `is_local=true` = `SET LOCAL` = txn-scoped, auto-resets (Pitfall 3 — a non-local flag leaks across the Supabase pooler).
- read: `current_setting('app.rejeicao_sancionada', true)` — 2nd arg `true` = missing_ok → NULL when unset (not an error).

### Append-only audit via trigger (never a manual per-writer INSERT)
**Source:** `avancar_etapa` writes the ONE `historico_candidatura` row per transition (`20260624000004` L84-88); the knockout explicit INSERT idiom (`20260608000001` L200-204).
**Apply to:** `decisao_final_historico` (AFTER UPDATE trigger owns capture); `registrar_decisao` must NOT manual-INSERT (Phase-8 survivor double-write lesson, existing comment L133-138).

### Migration apply path (D-22 / Pitfall 5)
**Source:** header comment idiom in `20260624000004` L26-32, `20260625100001` L58-63.
**Apply to:** all migrations — author with NO `BEGIN;…COMMIT;` wrapper; apply LIVE via Supabase MCP `apply_migration` in a `[BLOCKING]` wave; NEVER `db push` on a PL/pgSQL `$$…$$` body + adjacent COMMENT/REVOKE/GRANT (42601). Version-row reconcile → Phase 27.

### Service error-class + `isForbidden` mapping (frontend services)
**Source:** `ConfigVagaServiceError` + `isForbidden` `configVagaService.ts` L29-53; mirrored by `TriagemServiceError` (triagemService L28-43) and `CandidaturasServiceError` (candidaturasService L40-56).
**Apply to:** the new `updateVagaBase` writer + any reject-reroute service call. Maps Supabase `42501` → `'FORBIDDEN'`; anon client only (never `supabaseAdmin` — CLAUDE.md Security Rules).

### Single-source enum label map (no duplicate copies)
**Source:** `triagemService.ETAPA_M2_LABELS` L325-334 + `ETAPA_M2_OPTIONS` L337-348.
**Apply to:** KanbanBoard columns, any etapa-labeled surface — import the map, never hardcode a 2nd copy (the exact drift this phase fixes; Don't-Hand-Roll table).

### In-shell empty/not-found state (glass, no fabricated data)
**Source:** `AsyncState.EstadoVazio` L104-110 (typography) + `NotFoundPage` glass composition L61-97 + `AvaliacaoContainer.WrongEtapaState` L226-252 (in-shell within layout).
**Apply to:** hub 404, ConfiguracoesPage/MeuPerfilPage empty-states. Keep the persona shell; single accent back-CTA where an action exists; `min-h-11` touch target; no mock numbers.

### Contract test = Node-local runtime replica + branch-map assertion
**Source:** `bigfive-contract.test.ts` Part 1 (L40-82 — runtime replica that parses the exact shape both sides must honor); `hubEmptyState.test.tsx` (RTL copy/no-mock-data invariant).
**Apply to:** the FUNIL-05 `testeContract.test.ts` — iterate every `cargoTemplates` entry's `testes_aplicaveis`, run each `teste` through the lib's branch-map, assert every emitted container id is one `handleOpenTeste`/`testeLabel` recognizes (no default-branch fall-through). This is the regress-guard ([[feedback_integration_contract_gap]] — mocks on both sides pass while the real contract is broken).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/testes/testeContract.ts` | utility (id-mapping lib) | transform | No existing template↔container id-mapping lib. Closest idioms: `ETAPA_M2_LABELS` (single-source map) + `@/lib/efErrors` (shared lib shape). Build per RESEARCH §2d. |
| `.github/workflows/ci.yml` (tsc re-pin) | config (CI) | — | No pattern to copy — a measurement task. Re-run `npx tsc --noEmit \| grep -c "error TS"` after the fixes and re-pin L51/54/55/56 from the stale **133** to the new measured number (expected ≈113-114 after −14 clearance). "Keep 128 green" is a false assumption — CI passes up to 133 today (Pitfall 1). |

---

## Metadata

**Analog search scope:** `supabase/migrations/` (guard-trigger, DEFINER RPC, append-only, publish-gate idioms) · `src/features/triagem/services/` (live M2 path) · `src/features/vagas/{types,services}/` · `src/features/config-vaga/{templates,services}/` · `src/features/avaliacao/components/` + `__tests__/` · `src/features/hub-candidato/components/` + `__tests__/` · `src/components/{ui,pages,modals}/`.
**Files scanned:** ~24 source files read (migrations 20260624000004 / 20260625100001 / 20260607010003 / 20260607010004 / 20260608000001; triagemService; KanbanBoard; candidaturasService; vagasTypes; cargoTemplates; AvaliacaoContainer; configVagaService; HubCandidatoRH; CandidatosRHPage; CriarEditarVagaPage; AsyncState; NotFoundPage; bigfive-contract.test; hubEmptyState.test) + 25-CONTEXT / 25-RESEARCH / 25-UI-SPEC.
**Pattern extraction date:** 2026-07-09
