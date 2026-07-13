# Phase 26: Correção do Funil (lado candidato — alcançabilidade & scoring) - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 21 (5 new migrations · 2 client edits · 6 copy screens · 1 n8n subtree deletion · 2 CI guards · 5 SQL smokes)
**Analogs found:** 21 / 21 (this is a CORRECTION phase — most analogs are the exact file being rewritten or a verbatim in-repo precedent)

> **Framing.** Nothing here is greenfield. Every DB surface has a live analog (the function being replaced, or the SEC-03/get_opcoes_sjt precedent); every client edit is in-place on a file whose own idioms are the pattern; every guard/smoke mirrors an existing one. The planner should copy the cited excerpt and change only the delta the requirement demands. The domain rule that dominates all of it: **RLS hides rows, never columns → the candidate reads through a DEFINER RPC that projects only safe fields, and behavior is proven by a SQL smoke over the wire, not by DDL text or JSX.**

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/<new>_funil01_pontuar_sjt_v2.sql` | migration (DEFINER RPC) | transform / request-response | `supabase/migrations/20260611000004_pontuar_sjt_rpc.sql` | exact (rewrite of this file) |
| `supabase/migrations/<new>_funil08_pontuar_cognitivo_gate.sql` | migration (DEFINER RPC) | transform / request-response | `supabase/migrations/20260625000001_phase14_gap_closure.sql:66-103` | exact (CREATE OR REPLACE same 5-arg sig) |
| `supabase/migrations/<new>_funil12_get_avaliacao_status.sql` | migration (DEFINER RPC) | request-response (read) | `supabase/migrations/20260611000002_perguntas_sjt.sql:107-130` (`get_opcoes_sjt`) | role-match (neutral DEFINER reader) |
| `supabase/migrations/<new>_funil10_drop_dup_index.sql` | migration (DDL) | schema | `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql:34-52` | role-match (the keeper index; drop its unfiltered twin) |
| `supabase/migrations/<new>_n8n_novo_candidato.sql` | migration (trigger) | event-driven (AFTER INSERT → pg_net) | `supabase/migrations/20260706110005_sec03_n8n_serverside.sql:52-99` | exact (SEC-03 precedent) |
| `src/features/avaliacao/services/avaliacaoService.ts` | service | request-response / CRUD | itself (`getAvaliacaoContext` :98-166, `pontuarSjt` :261-300) + `cognitivoService.listItens` cast idiom | exact (in-place edit) |
| `src/features/avaliacao/components/AvaliacaoContainer.tsx` | component | request-response (render + nav) | itself (`deriveCards` :303-326, `CONTAINER_TESTE_CONFIG` :88-93, `statusInfo` :116-127) | exact (in-place edit) |
| `src/features/avaliacao/components/RedacaoEditorScreen.tsx` (+ `DevolutivaBigFiveView`, `ProvaCognitivaScreen`, `SolicitarRevisaoCTA`, `SuporteRHPage`) | component (copy strings) | request-response | `VagaDetalhePage.tsx:319` + `DashboardCandidatoPage.tsx:186` (canonical honest copy) | exact (string swap) |
| `src/features/cadastro/services/n8nService.ts` (+ `index.ts:11`, `n8nService.test.ts`) | service (DELETE subtree) | — (dead code removal) | `n8nService.ts:122-168` (hstgr URLs) + `:388-417` (PII payload) | exact (delete-only) |
| `src/__tests__/guards/n8n-bundle.grep.test.ts` | test (CI grep guard) | file-I/O (node:fs scan) | itself (`FORBIDDEN_BUILD_TOKENS` :44-63) | exact (extend) |
| `src/__tests__/guards/wait-state-copy.grep.test.ts` | test (CI grep guard) | file-I/O (node:fs scan) | `n8n-bundle.grep.test.ts` + `forbidden-strings.grep.test.ts` | role-match (new guard, same idiom) |
| `supabase/tests/funil01_pontuar_sjt_smokes.sql` (+ funil08/funil10/funil12/n8n smokes) | test (SQL behavioral smoke) | request-response (impersonated JWT) | `supabase/tests/sec05_08_smokes.sql` | exact (same set_config + SET ROLE idiom) |
| `src/features/avaliacao/__tests__/cognitivo-contract.test.ts` | test (contract) | — | `src/lib/testes/testeContract.ts` + its FUNIL-05 contract test | role-match (route↔gate contract) |

---

## Pattern Assignments

### `supabase/migrations/<new>_funil01_pontuar_sjt_v2.sql` (migration, DEFINER RPC)

**Analog:** `supabase/migrations/20260611000004_pontuar_sjt_rpc.sql` — this is a full rewrite of that function via `CREATE OR REPLACE`. The **prescriptive rewrite already exists** in `26-RESEARCH.md` §Code Example 1 (lines 306-403); the planner should copy that template. Below are the load-bearing invariants to preserve verbatim from the live file, plus the exact defects to fix.

**Preserve — AUTHZ posture** (`20260611000004_pontuar_sjt_rpc.sql:55-66`, keep exactly):
```sql
SELECT EXISTS (
  SELECT 1 FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.id = p_candidatura_id
     AND ca.user_id = auth.uid()          -- ownership via candidatos.user_id, NEVER candidato_id
     AND c.etapa_atual = 'avaliacao_assincrona'
) INTO v_owns;
IF NOT v_owns THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
```

**Preserve — function envelope + grant tail** (`:37-45` and `:138-139`):
```sql
CREATE OR REPLACE FUNCTION public.pontuar_sjt(p_candidatura_id uuid, p_respostas jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ ... $$;
REVOKE ALL ON FUNCTION public.pontuar_sjt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pontuar_sjt(uuid, jsonb) TO authenticated;
```

**Preserve — NEUTRAL return + RNF-07a** (`:133-134`): never writes `candidaturas`; returns only `jsonb_build_object('ok', true, 'registrado', true)` — no score/threshold ever crosses the wire.

**Fix 1 — denominator over FULL battery** (the bug is `20260611000004:95-100`, `maxes` restricted to answered):
```sql
-- BUG (replace this):
maxes AS (
  SELECT pergunta_id, MAX(peso) AS peso_max
    FROM public.perguntas_opcao_sjt
   WHERE pergunta_id IN (SELECT pergunta_id FROM marked)   -- ← only answered
   GROUP BY pergunta_id)
-- FIX: WHERE pergunta_id = ANY(v_battery)  -- full active-MC battery of the vaga
```

**Fix 2 — dedup / battery-membership / completeness / re-submit-lock** (all new RAISEs; `26-RESEARCH.md` Example 1 blocks B/D/E/F). Re-submit lock predicate MUST match the exact MC row shape (`26-RESEARCH.md` Pitfall 3):
```sql
IF EXISTS (SELECT 1 FROM public.scores_candidato
            WHERE candidatura_id = p_candidatura_id
              AND tipo='sjt' AND subtipo='mc' AND pergunta_id IS NULL
              AND status <> 'falhou') THEN
  RAISE EXCEPTION 'avaliacao ja registrada' USING errcode = '42501';
END IF;
```

**Fix 3 — scope battery to `formato='mc' AND status='active'`** to exclude the `caso_aberto` item (`26-RESEARCH.md` Pitfall 2 — the open case is a separate `subtipo='caso_aberto'` score written by the `avaliar-redacao` EF, not by `pontuar_sjt`).

**Migration mechanics** (CLAUDE.md §Migrations + `20260611000004:31-34`): NO `BEGIN;/COMMIT;` wrapper; `SET search_path = ''`; apply via Supabase MCP `apply_migration` (bypasses 42601) — the apply task is `[BLOCKING]`/non-autonomous. Do NOT plan a `db push` step.

---

### `supabase/migrations/<new>_funil08_pontuar_cognitivo_gate.sql` (migration, DEFINER RPC)

**Analog:** `supabase/migrations/20260625000001_phase14_gap_closure.sql:66-103` — the **LIVE 5-arg overload**. Do NOT touch the 2-arg version (already `DROP`ed at `:66`; editing it is a no-op — Pitfall 5).

**Copy the signature verbatim, change ONLY the etapa `IN` list** (`20260625000001:68-99`):
```sql
CREATE OR REPLACE FUNCTION public.pontuar_cognitivo(
  p_candidatura_id uuid, p_respostas jsonb,
  p_shuffle_seed text DEFAULT NULL, p_completion_time_seconds int DEFAULT NULL,
  p_proctoring jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
...
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id AND ca.user_id = auth.uid()
       AND c.etapa_atual IN ('entrevista_online', 'entrevista_presencial')  -- ← ADD 'avaliacao_assincrona'
  ) INTO v_owns;
...
```
**ADD** `'avaliacao_assincrona'` to the `IN` list — do NOT replace the interview stages (that would regress interview-stage cognitivo submits). The rest of the body (empty-bank guard, CTT soma, banding, insert, neutral return) is copied unchanged.

---

### `supabase/migrations/<new>_funil12_get_avaliacao_status.sql` (migration, DEFINER RPC — NEW)

**Analog:** `supabase/migrations/20260611000002_perguntas_sjt.sql:107-130` (`get_opcoes_sjt`) — the neutral DEFINER-reader shape (envelope, `SET search_path=''`, REVOKE/GRANT tail). The **full prescriptive body** is `26-RESEARCH.md` §Code Example 6 (lines 476-500).

**Envelope + tail to copy** (`get_opcoes_sjt`, `20260611000002:107-130`):
```sql
CREATE OR REPLACE FUNCTION public.get_avaliacao_status(p_candidatura_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ ... $$;
REVOKE ALL ON FUNCTION public.get_avaliacao_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_avaliacao_status(uuid) TO authenticated;
```

**Ownership gate** (mirror `pontuar_sjt:55-66` but WITHOUT the etapa clause — status is readable across etapas):
```sql
SELECT EXISTS (SELECT 1 FROM public.candidaturas c
  JOIN public.candidatos ca ON ca.id = c.candidato_id
 WHERE c.id = p_candidatura_id AND ca.user_id = auth.uid()) INTO v_owns;
IF NOT v_owns THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
```

**Return — booleans ONLY** (`26-RESEARCH.md` Example 6 :488-496; Pitfall 8): presence of a row, never `status`/`score`/`score_max`/`metadata`:
```sql
SELECT jsonb_build_object(
  'sjt_mc',   jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato WHERE candidatura_id=p_candidatura_id AND tipo='sjt' AND subtipo='mc'),
      'iniciado',   EXISTS(SELECT 1 FROM public.respostas_avaliacao WHERE candidatura_id=p_candidatura_id AND teste='sjt')),
  'redacao',  jsonb_build_object('registrado', EXISTS(SELECT 1 FROM public.scores_candidato WHERE candidatura_id=p_candidatura_id AND tipo='redacao')),
  'big_five', jsonb_build_object('registrado', EXISTS(SELECT 1 FROM public.scores_candidato WHERE candidatura_id=p_candidatura_id AND tipo='big_five')),
  'cognitivo',jsonb_build_object('registrado', EXISTS(SELECT 1 FROM public.scores_candidato WHERE candidatura_id=p_candidatura_id AND tipo='cognitivo'))
) INTO r;
RETURN r;  -- NEUTRAL — presence booleans only (RNF-07a).
```
> **Open Q3 / A2 (confirm at plan time):** the `iniciado` boolean's `respostas_avaliacao.teste` key must match the exact autosave key each screen writes (grep the `upsertResposta`/`useAutosaveAvaliacao` call sites). Shape of the return is Claude's discretion per CONTEXT.

---

### `supabase/migrations/<new>_funil10_drop_dup_index.sql` (migration, DDL — PROD discovery)

**Analog:** `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql:34-52` — the CORRECT partial index (the KEEPER). The offender is an **unversioned** full unique index/constraint on `(candidato_id, vaga_id)` **without** `WHERE deleted_at IS NULL` — it is NOT in any migration file (Pitfall 7). It must be discovered in PROD at execution time (`[BLOCKING]` via MCP `execute_sql`).

**Keeper to preserve** (`20260425000004:41-43`):
```sql
CREATE UNIQUE INDEX candidaturas_candidato_vaga_unique_idx
  ON public.candidaturas (candidato_id, vaga_id)
  WHERE deleted_at IS NULL;   -- ← the partial filter that allows re-inscription after soft-delete
```

**Discovery + drop** (`26-RESEARCH.md` §Code Example 5, lines 459-474): enumerate `pg_index`/`pg_constraint` on `public.candidaturas`, find the one on `(candidato_id, vaga_id)` with NO `WHERE` clause, then `DROP INDEX IF EXISTS public.<offender>` (or `ALTER TABLE ... DROP CONSTRAINT IF EXISTS <offender>` if it is a constraint). Keep the partial index. **Verify existence before dropping** (Assumption A1 — could be a no-op).

---

### `supabase/migrations/<new>_n8n_novo_candidato.sql` (migration, AFTER INSERT trigger)

**Analog:** `supabase/migrations/20260706110005_sec03_n8n_serverside.sql:52-99` (the `trg_n8n_nova_candidatura` trigger) — mirror it verbatim, retargeting to `candidatos` and stripping to id-only body. Full prescriptive template is `26-RESEARCH.md` §Code Example 8 (lines 519-539).

**Copy the SEC-03 trigger-function shape** (`20260706110005:52-94`):
```sql
CREATE OR REPLACE FUNCTION public.trg_n8n_novo_candidato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_base text;
BEGIN
  SELECT decrypted_secret INTO v_base
    FROM vault.decrypted_secrets WHERE name = 'n8n_webhook_base';
  IF v_base IS NULL THEN RETURN NEW; END IF;          -- graceful-skip until Fernando sets the secret
  PERFORM net.http_post(
    url := v_base || '/novo-candidato',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('event','candidato.created','timestamp', now(),
      'data', jsonb_build_object('candidato_id', NEW.id)));   -- NO nome/email/cpf/telefone (LGPD)
  RETURN NEW;                                         -- RNF-07a: never writes candidatos
END; $$;
REVOKE ALL ON FUNCTION public.trg_n8n_novo_candidato() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_n8n_novo_candidato ON public.candidatos;
CREATE TRIGGER trg_n8n_novo_candidato AFTER INSERT ON public.candidatos
  FOR EACH ROW EXECUTE FUNCTION public.trg_n8n_novo_candidato();
```
**Critical delta vs SEC-03:** the old client `notifyCandidatoCriado` shipped `nome_completo, email, telefone, cpf` — the trigger body must carry **only** `candidato_id`. `pg_net` is already enabled; the `n8n_webhook_base` Vault secret is a human-action (graceful-skip until then).

---

### `src/features/avaliacao/services/avaliacaoService.ts` (service, in-place edit)

**Analog:** itself — the file's own idioms ARE the pattern. Three deltas.

**Delta A — battery filter in `getAvaliacaoContext`** (extend the existing `perguntas` query at `:140-146`). Current (presentation is only `.eq('status','active')`):
```typescript
const { data: perguntas, error: pErr } = await supabase
  .from('perguntas')
  .select('id, cargo, cenario, formato, tempo_est_min, status')
  .eq('status', 'active')
```
Add the itens_ids-else-cargo filter from the SJT element of `testes_aplicaveis` (`26-RESEARCH.md` §Code Example 2, lines 407-422) — build the query then `.in('id', itensIds)` when present, else `.eq('cargo', cargo)`. Keep the allowlist columns (never `select('*')` — the file's invariant #1, `:1-9`). **This is presentation only; the server-side membership check in `pontuar_sjt` is the security teeth** (Pitfall 4).

**Delta B — new `get_avaliacao_status` call.** Since the RPC is not yet in `database.types.ts` (regen is Phase 27), use the **NARROW confined cast** idiom from `cognitivoService.listItens` (`cognitivoService.ts:162-169`):
```typescript
const { data, error } = await (supabase.rpc as unknown as (
  fn: string, args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>)(
  'get_avaliacao_status', { p_candidatura_id: candidaturaId },
)
```
Return a narrowed interface (booleans per test); NEVER widen to a blanket `UntypedClient`. Add a `// Drop the cast after the Phase-27 regen.` note (mirrors `cognitivoService.ts:164`).

**Delta C — `pontuarSjt` error mapping** (extend `:274-295`). The rewrite adds new RAISEs (`22023` dup/incomplete, `42501` foreign/re-submit). The existing block already maps `42501`/`403` → `LOCKED`. Add a neutral branch for `22023` (or fold into `DATABASE_ERROR`) — keep every candidate-facing message NEUTRAL (no score/threshold). Preserve the `AvaliacaoServiceError` code union (`:36-44`).

---

### `src/features/avaliacao/components/AvaliacaoContainer.tsx` (component, in-place edit)

**Analog:** itself — `deriveCards` (:303-326), `CONTAINER_TESTE_CONFIG` (:66-94), `statusInfo` (:116-127), `AvaliacaoShell allDone` (:147-148). Full prescriptive deltas are `26-RESEARCH.md` §Code Example 4 (lines 439-457) + `26-UI-SPEC.md` §Card State Contract.

**Delta A — fix the cognitivo route stub** (`:88-93`, replace the stub with the real route):
```typescript
cognitivo: {
  label: 'Avaliação cognitiva',                       // keep the label (UI-SPEC locks it)
  route: (id) => `/candidato/prova-cognitiva/${id}`,  // ← REAL route (verified routes.tsx:269); replaces the /avaliacao/:id/cognitivo stub
},
```

**Delta B — cognitivo card gated by `vaga.aplica_cognitivo`** (NOT the template entry — `cargoTemplates.ts:71` always emits it). Requires adding `aplica_cognitivo` to the `getAvaliacaoContext` vaga join allowlist (`avaliacaoService.ts:110` → `vaga:vagas ( testes_aplicaveis, aplica_cognitivo )`) and to `AvaliacaoContext`. Append the card LAST in `deriveCards` (UI-SPEC ordering) when `ctx.aplica_cognitivo === true`.

**Delta C — card state from the status RPC, not the phantom `entry.status`** (the FUNIL-12 core). Current phantom read at `:312`:
```typescript
const status = String(entry.status ?? 'pendente')   // ← PHANTOM: testeAplicavelSchema has NO `status` field
```
Replace with a derivation from `get_avaliacao_status` booleans (map container card id → RPC key): `registrado` → `concluido`; `iniciado` (own `respostas_avaliacao` row) → `em_andamento`; else `pendente`. The neutral `statusInfo()` helper (`:116-127`) and the four-state contract (`26-UI-SPEC.md` Card State Contract table) are unchanged — only the source of truth changes. `allDone` (`:148`) still counts `Concluído`.

**Delta D — honest all-done copy** (`:209`, see Shared Pattern: Honest Copy below).

**Query-key note:** the container currently uses an inline key `['avaliacao', 'context', candidaturaId]` (`:348`). If a separate status-RPC query is added, follow the feature query-key-factory pattern (`candidaturasKeys`, `useCandidaturas.ts:55-74`) or extend the inline key consistently — do not scatter ad-hoc keys.

---

### 6 copy screens (component, string swap) — UX-01

**Analog (canonical CORRECT copy):** `VagaDetalhePage.tsx:319` ("Acompanhe o status da sua candidatura no dashboard") and `DashboardCandidatoPage.tsx:186` ("Acompanhe seu progresso no processo seletivo"). **Canonical string locked by CONTEXT:** `Acompanhe o andamento pelo seu painel.`

Verbatim replacement map (`26-UI-SPEC.md` §Copywriting Contract table + `26-RESEARCH.md` §Code Example 7):

| # | File : line | Replacement |
|---|-------------|-------------|
| 1 | `AvaliacaoContainer.tsx:209` | "Você concluiu todas as avaliações desta etapa. Acompanhe o andamento pelo seu painel." |
| 2 | `RedacaoEditorScreen.tsx:278` | "Acompanhe o andamento pelo seu painel." |
| 3 | `DevolutivaBigFiveView.tsx:157` | "Volte em alguns instantes. Acompanhe o andamento pelo seu painel." |
| 4 | `ProvaCognitivaScreen.tsx:82` (`postSubmit`) | "Prova registrada. Acompanhe o andamento pelo seu painel." |
| 4b | `ProvaCognitivaScreen.tsx:18` (prose comment) | update the doc-comment to quote the new `postSubmit` string verbatim (keeps grep guard + docs honest) |
| 5 | `SolicitarRevisaoCTA.tsx:45` (`dialogBody`) | "Sua solicitação será enviada à equipe responsável, que revisará a decisão. Acompanhe o andamento pelo seu painel." |
| 6 | `SuporteRHPage.tsx:162-163` (RH-facing) | "Recebemos sua solicitação e nossa equipe técnica irá analisá-la em breve. Acompanhe o andamento pelo seu painel." |

**Do NOT touch** `AutorizacoesStep.tsx:58/93/185` (legitimate LGPD consent, not a wait-state promise). Only the string changes — no layout/color/typography change (`26-UI-SPEC.md` Notes).

---

### `src/features/cadastro/services/n8nService.ts` (service, DELETE subtree) — n8n

**Analog:** the file itself is what gets deleted. **Verified zero runtime callers** (grep: `notifyCandidatoCriado`/`sendToN8N`/`N8N_WORKFLOWS` appear only inside `n8nService.ts`, the barrel `index.ts:11`, and tests). The subtree carries `n8n.srv881294.hstgr.cloud` × 18 URLs (`:122-168`) and the PII payload `notifyCandidatoCriado` (`:388-417` → `id, nome_completo, email, telefone, cpf`).

**Clean deletion (Pitfall 9 — do all four):**
1. Delete `src/features/cadastro/services/n8nService.ts`.
2. Remove the barrel line `export * from './n8nService'` at `src/features/cadastro/services/index.ts:11`.
3. Delete the test `n8nService.test.ts` (+ any README mention).
4. Confirm `tsc` clean (no dangling re-export) + the extended grep guard proves `build/` + `src/` are clean.

---

### `src/__tests__/guards/n8n-bundle.grep.test.ts` (test, CI grep guard) — extend

**Analog:** itself. The current guard **explicitly excludes** the hstgr host (`:21-26`, `:133-134`). Phase 26 removes that carve-out and ADDS the host + PII literals.

**Extend `FORBIDDEN_BUILD_TOKENS`** (`:44-45`) to include `'n8n.srv881294.hstgr.cloud'` and the PII payload field names co-located with an n8n host (e.g. `nome_completo`). Keep the two-plane structure (build/ leg `:89-106` + src/ leg `:108-125`), the comment-aware filter (`:69-72`), and the no-false-positive sub-test (`:127-137`) — but flip the hstgr assertion from `toBeNull()` to a positive match. Preserve the "don't flag unrelated `cpf` schema fields" no-false-positive guarantee.

---

### `src/__tests__/guards/wait-state-copy.grep.test.ts` (test, CI grep guard) — NEW

**Analog:** `n8n-bundle.grep.test.ts` (node:fs + comment-aware structure) + `forbidden-strings.grep.test.ts` (regex-based term ban with a regex-correctness sub-test). Full spec: `26-RESEARCH.md` §Code Example 7 (:512-517) + `26-UI-SPEC.md` §CI grep guard.

**Copy the `forbidden-strings` skeleton** (`forbidden-strings.grep.test.ts:47-95`): `node:fs` recursive `collectFiles`, `ROOT = resolve(__dirname, '../../..')`, a `FORBIDDEN` regex, and a regex-correctness sub-test. **Scope to the 6 wait-state files ONLY** (do NOT global-ban e-mail — `RedefinirSenhaPage`, `AutorizacoesStep` consent, and the RH "Notificar candidato por email" toggle are legitimate). Ban patterns: `/avisaremos[\s\S]*por e-?mail/i` and `/receber[áa][\s\S]*por e-?mail/i`. Add an allow sub-test asserting `AutorizacoesStep` consent copy is NOT flagged.

---

### SQL behavioral smokes (test) — 5 files under `supabase/tests/`

**Analog:** `supabase/tests/sec05_08_smokes.sql` — the canonical impersonation smoke. Applies to `funil01_pontuar_sjt_smokes.sql`, `funil08_pontuar_cognitivo_smokes.sql`, `funil10_reinscricao_smoke.sql`, `funil12_status_rpc_smoke.sql`, `n8n_novo_candidato_smoke.sql`.

**JWT-impersonation idiom to copy** (`sec05_08_smokes.sql:59-88`):
```sql
SET ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.owner'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM ... ;
  IF n = 0 THEN RAISE EXCEPTION 'FAIL: ...'; END IF;   -- EXCEPTION = FAIL
  RAISE NOTICE 'PASS: ...';                            -- NOTICE = PASS
END $$;
```

**Privileged discovery + GUC-stash idiom** (`sec05_08_smokes.sql:37-57`): `RESET ROLE` (RLS bypass) → `SELECT ... LIMIT 1` a real target → `set_config('smoke.<key>', v::text, false)` → skip-with-NOTICE if the fixture is empty (`:47-49`). **ROLLBACK-free cleanup** at the tail (`:311-313`):
```sql
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
```

Per-smoke assertions (from `26-RESEARCH.md` §Validation Test Map and §threat_model seeds):
- **funil01/07:** duplicate pergunta → EXCEPTION; complete honest submit → score over full battery; subset submit → `bateria incompleta` EXCEPTION; double submit → 2nd raises 42501 + exactly ONE MC row; foreign `pergunta_id` → 42501; `candidaturas.status`/`etapa_atual` unchanged (structural RNF-07a check like `:293-309`).
- **funil08:** submit during `avaliacao_assincrona` → registrado; interview stage → still registrado (no regression).
- **funil10:** disposable fixture insert → soft-delete → re-insert same `(candidato,vaga)` → NO 23505; assert only the partial index remains via `pg_indexes`.
- **funil12:** candidate JWT → booleans only (no numeric/`status` field reachable); foreign candidatura → 42501.
- **n8n:** insert a disposable candidato with secret NULL → no error, no PII, `candidatos` row unchanged (graceful-skip).

Smokes run in the `[BLOCKING]` apply wave via MCP `execute_sql` / SQL Editor AFTER the migration applies (Phase 24/25 precedent) — they are the acceptance gate, not the DDL text.

---

### `src/features/avaliacao/__tests__/cognitivo-contract.test.ts` (test, contract) — NEW

**Analog:** `src/lib/testes/testeContract.ts` + its FUNIL-05 contract test (the single-source contract idiom — `CONTAINER_RECOGNIZED ⊇` the lib's emitted ids, `AvaliacaoContainer.tsx:102-104`). Assert the etapa in which the cognitivo card renders (`avaliacao_assincrona`) equals an etapa the `pontuar_cognitivo` RPC gate accepts — preventing the card from routing to a screen the RPC would 42501 (Pitfall 6: the `ProvaCognitivaScreen` gates on `aplica_cognitivo` only, NO etapa gate — do not add one). Import the real container config, not a replica ([[feedback_integration_contract_gap]]).

---

## Shared Patterns

### SECURITY DEFINER RPC as the anti-tamper boundary
**Source:** `supabase/migrations/20260611000004_pontuar_sjt_rpc.sql:55-66` (authz) + `:37-45`/`:138-139` (envelope + REVOKE PUBLIC / GRANT authenticated tail).
**Apply to:** all 3 RPCs (`pontuar_sjt`, `pontuar_cognitivo`, `get_avaliacao_status`) + the n8n trigger.
- `SECURITY DEFINER SET search_path = ''` on every function.
- Ownership via `candidatos.user_id = auth.uid()` (NEVER `candidato_id`); `auth.uid()` is GUC-based → survives DEFINER.
- Candidate posts only identifiers/picks; the function re-derives everything server-side and returns a NEUTRAL payload (`jsonb_build_object('ok', true, 'registrado', true)`).

### RLS row-deny + neutral RPC projection (never column-level)
**Source:** `20260611000002_perguntas_sjt.sql:107-130` (`get_opcoes_sjt` projects id+texto only) + `26-RESEARCH.md` Anti-Patterns.
**Apply to:** `get_avaliacao_status` (booleans only), the `perguntas`/`respostas` reads in `avaliacaoService`.
- NEVER add a candidate SELECT policy to `scores_candidato` (leaks the verdict).
- NEVER `select('*')` on a candidate read — allowlist columns only ([[reference_select_star_leaks_pii]]); the score/gabarito are hidden columns RLS does not protect.

### SQL behavioral smoke as the acceptance gate
**Source:** `supabase/tests/sec05_08_smokes.sql` (`set_config('request.jwt.claims',…)` + `SET ROLE authenticated`, NOTICE=PASS/EXCEPTION=FAIL, ROLLBACK-free cleanup).
**Apply to:** every DB requirement (FUNIL-01/07/08/10/12 + n8n). Test the projection/denial/score over the wire — structural greps pass while behavior breaks (Phase 24/25 caught a no-op column REVOKE and duplicate role-only policies this way).

### Migration mechanics (repo-specific, non-negotiable)
**Source:** `CLAUDE.md` §Migrations + `20260611000004:31-34`.
**Apply to:** all 5 migrations.
- NO `BEGIN;/COMMIT;` wrapper (the CLI driver wraps each migration; the outer txn is the 42601 trigger).
- Apply via Supabase MCP `apply_migration`/`execute_sql` (bypasses 42601 on `$$` bodies, writes the version row). NO `db push` step. The apply wave is `[BLOCKING]`/non-autonomous.

### NARROW confined RPC cast (until Phase-27 regen)
**Source:** `src/features/avaliacao-cognitiva/services/cognitivoService.ts:162-169`.
**Apply to:** the `get_avaliacao_status` client call in `avaliacaoService.ts` (the RPC is not in `database.types.ts` until Phase 27). Widen ONLY the RPC name via `(supabase.rpc as unknown as (...) => ...)`, never a blanket `UntypedClient`; leave a `// Drop the cast after the regen` note.

### Honest wait-state copy
**Source (correct pattern):** `VagaDetalhePage.tsx:319` + `DashboardCandidatoPage.tsx:186`.
**Apply to:** the 6 wait-state screens. Canonical string `Acompanhe o andamento pelo seu painel.` — remove every "avisaremos por e-mail" promise entirely. Guard against regression with the scoped `wait-state-copy.grep.test.ts`.

### CI grep guard (node:fs, comment-aware)
**Source:** `src/__tests__/guards/n8n-bundle.grep.test.ts` + `forbidden-strings.grep.test.ts`.
**Apply to:** the extended n8n guard + the new wait-state-copy guard. Pure `node:fs` scan, `ROOT = resolve(__dirname, '../../..')`, skip `__tests__`/`node_modules`, comment-aware line filter, plus a regex/token-correctness sub-test and a no-false-positive sub-test. Rides the existing `npm run test:run` CI leg (no new workflow).

---

## No Analog Found

None. Every file in this correction phase maps to an exact live analog (the function being rewritten, the SEC-03 trigger precedent, `get_opcoes_sjt`, `sec05_08_smokes.sql`, `forbidden-strings.grep.test.ts`) or is an in-place edit whose own idioms are the pattern. The two MEDIUM-confidence items are runtime facts to confirm at execution time, not missing analogs:

| Item | Role | Data Flow | Note |
|------|------|-----------|------|
| FUNIL-10 offending index identity | migration (DDL) | schema | Not in any migration file — discover via `pg_indexes` in PROD (Assumption A1); may be a no-op if absent. |
| `respostas_avaliacao.teste` key per test | migration (RPC) | request-response | The `iniciado` boolean needs the exact autosave key (Assumption A2 / Open Q3) — grep the autosave call sites at plan time. |

---

## Metadata

**Analog search scope:** `supabase/migrations/` (pontuar_sjt, pontuar_cognitivo, get_opcoes_sjt, SEC-03 trigger, candidaturas unique index), `supabase/tests/` (sec05_08 smoke), `src/features/avaliacao/` (service + container + tests), `src/features/avaliacao-cognitiva/` (cognitivoService cast idiom + prova-cognitiva route), `src/features/cadastro/services/` (n8nService subtree + barrel), `src/lib/testes/` (testeContract), `src/features/vagas/hooks/` (query-key factory), `src/__tests__/guards/` (n8n-bundle + forbidden-strings guards), `src/router/routes.tsx`.
**Files scanned:** ~18 source/migration/test files read + 2 targeted greps (n8n runtime callers, prova-cognitiva route).
**Pattern extraction date:** 2026-07-12
