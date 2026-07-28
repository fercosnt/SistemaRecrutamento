# Phase 8: Inscrição & Knock-out (Etapa 1) - Pattern Map

**Mapped:** 2026-06-07
**Files analyzed:** 12 (new/modified)
**Analogs found:** 12 / 12

> **Mandate (consistent with Phases 6/7):** Phase 8 is ~90% wiring of existing live machinery.
> Every new file copies a same-role, same-data-flow analog that already shipped. The genuinely
> new code is: 2 candidaturas columns + 1 vagas column + a knockout branch inside ONE existing
> RPC + a Zod `.strict()` flip + a `feedback_rejeicao` display + a template seed. Resist building
> parallel structures (RESEARCH.md "Don't Hand-Roll").

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/2026XXXX_inscricao_knockout.sql` (RPC extension + cols) | migration + rpc | event-driven (knockout sweep, same txn) | `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` | exact (extend it) |
| `qualificacao_etapa1` snapshot write (extend `publish_vaga`) | rpc | transform (derived projection at publish) | `supabase/migrations/20260607010004_publish_vaga_rpc.sql` | exact (extend it) |
| `candidaturas` new columns (`motivo_rejeicao`, `opcao_knockout_id`) + `vagas.qualificacao_etapa1` | migration | CRUD (DDL) | `supabase/migrations/20260607010002_vagas_config_columns.sql` | exact |
| knockout audit INSERT into `historico_candidatura` (in RPC) | migration (SQL fragment) | event-driven (append-only audit) | `supabase/migrations/20260607000001_historico_candidatura.sql` + `20260607000005_avancar_etapa_trigger.sql` | exact |
| `supabase/functions/_shared/schemas.ts` (`.strict()` allowlist) | schema | request-response (validation) | same file, `submitCandidaturaSchema` (L199-227) | exact (edit in place) |
| `supabase/functions/submit-candidatura/index.ts` (RPC call passthrough) | edge-function | request-response | same file | exact (mostly unchanged) |
| `src/features/config-vaga/templates/cargoTemplates.ts` (add `qualificacao` + default knockouts) | config | batch (git→DB copy-into-vaga) | same file (`CargoTemplate` + `getCargoTemplateDefaults`) | exact (extend) |
| `src/features/cadastro/schemas/candidatoSchema.ts` (drop cpf/genero) | schema | request-response | same file | exact (edit) |
| `src/features/cadastro/components/steps/DadosPessoaisStep.tsx` (drop cpf/genero UI + cpf dedup) | component | request-response | same file + `duplicateCheckService.ts` email path | exact (edit) |
| `src/features/cadastro/services/duplicateCheckService.ts` (email-only) | service | request-response | same file (`checkEmailDuplicate`) | exact (already supports it) |
| `src/components/pages/FormularioCandidaturaPage.tsx` (rejection/survivor result state) | component (page) | request-response | same file (submit handler L320-329 + status surfaces) | exact (extend) |
| `src/components/pages/{DashboardCandidatoPage,MeuPerfilCandidatoPage}.tsx` (`feedback_rejeicao` display) | component (page) | CRUD (read+render) | `MeuPerfilCandidatoPage.tsx` `getStatusBadge` (L323-347) | exact (extend) |

---

## Pattern Assignments

### `2026XXXX_inscricao_knockout.sql` — knockout sweep (rpc, event-driven)

**Analog:** `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` — **this is the RPC you EXTEND, not a new RPC** (RESEARCH D-10; "Don't Hand-Roll"). Atomicity + synchronicity (INSCR-04 "imediata") require the knockout to run in the same txn as the candidatura/respostas INSERT.

**Migration-header pattern** (lines 9-16) — every Phase 6/7/8 PL/pgSQL migration opens with the 42601 no-wrapper note. Copy this verbatim and add the D-22 apply note from the Phase 7 RPC header (publish_vaga lines 27-33):
```sql
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver
-- already wraps each migration in its own implicit transaction; an outer
-- BEGIN/COMMIT combined with the `$$ ... $$` PL/pgSQL body breaks the
-- prepared-statement boundary parser and raises SQLSTATE 42601 at push time.
-- If `supabase db push` fails with 42601, apply via the D-22 SQL-Editor
-- (or Supabase MCP execute_sql) workaround, then
-- `supabase migration repair --status applied <version>`.
```

**RPC signature + DEFINER + grant pattern** (lines 18-30, 90-94) — copy exactly. `SECURITY DEFINER`, `SET search_path = ''`, schema-qualify everything (`public.`), `RETURNS jsonb`, then `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO service_role`:
```sql
CREATE OR REPLACE FUNCTION public.submit_candidatura_atomic(
  p_candidato_id uuid, p_vaga_id uuid, p_curriculo_url text,
  p_curriculo_nome text, p_curriculo_size int, p_respostas jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_candidatura_id uuid; v_resposta jsonb;
BEGIN
  -- ... body ...
END; $$;
REVOKE ALL ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) TO service_role;
```

**Existing INSERT step to MODIFY** (lines 35-57) — the current INSERT **hardcodes** `etapa_atual='triagem'` (line 51). Per RESEARCH D-10, change the initial INSERT to `'inscricao'`, then UPDATE to either `'triagem'` (survivor) or set rejection state (knockout):
```sql
-- CURRENT (line 49-51): change 'triagem' → 'inscricao' on INSERT
'aguardando_resposta'::public.status_candidatura,
'triagem'::public.etapa_processo,   -- ← becomes 'inscricao' in Phase 8
```

**Respostas loop to KEEP** (lines 59-81) — the `jsonb_array_elements(p_respostas)` loop is unchanged. **Critical:** `resposta_opcoes` is stored as a **jsonb passthrough of option TEXT strings** (line 78 `v_resposta->'resposta_opcoes'`). Confirmed at the writer side: `FormularioCandidaturaPage.tsx` L284-311 builds `resposta_opcoes` from selected option **TEXT** values, never `opcao_id`. **The knockout join MUST match on `opcao_texto`** (RESEARCH Pitfall 1 — joining on `opcao_id` silently never fires).

**NEW knockout sweep (step 2.5) — texto-join pattern** (RESEARCH D-10 strategy A, Pattern 2):
```sql
-- after the respostas loop, before RETURN:
SELECT m.opcao_id, m.opcao_texto
  INTO v_ko_opcao_id, v_ko_texto
  FROM public.respostas_formulario r
  JOIN public.pergunta_opcao_metadata m ON m.pergunta_id = r.pergunta_id
 WHERE r.candidatura_id = v_candidatura_id
   AND m.tag = 'knockout'
   AND r.resposta_opcoes @> to_jsonb(m.opcao_texto)   -- text containment
 LIMIT 1;
```
> `[VERIFY LIVE — A4]` re-confirm the actual `resposta_opcoes` shape via Supabase MCP `execute_sql` against an existing candidatura before locking the `@>` predicate (knockout perguntas are not `permite_outros`, so the `{outros:...}` object case does not apply; the simple `["Não"]` array holds).

**NEW knockout branch UPDATE + audit INSERT** (D-11/D-12/D-13/D-15):
```sql
IF FOUND THEN
  UPDATE public.candidaturas
     SET status = 'rejeitado'::public.status_candidatura,
         etapa_atual = 'inscricao'::public.etapa_processo,
         motivo_rejeicao = 'knockout_automatico',
         opcao_knockout_id = v_ko_opcao_id,
         feedback_rejeicao = 'Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.'  -- D-15 neutral
   WHERE id = v_candidatura_id;
  INSERT INTO public.historico_candidatura
    (candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em)
  VALUES
    (v_candidatura_id, 'inscricao', 'inscricao', 'knockout automático (Etapa 1)', NULL, true, now());
ELSE
  UPDATE public.candidaturas SET etapa_atual = 'triagem'::public.etapa_processo
   WHERE id = v_candidatura_id;
END IF;
```
> **Double-write is SAFE (verified, no Phase 6 change).** Knockout keeps `etapa_atual='inscricao'` (no change) → the `avancar_etapa()` trigger's `IS NOT DISTINCT FROM` guard skips it (see analog below) → the explicit INSERT is the only history row. The survivor `→'triagem'` UPDATE fires the trigger once (intended). **Planner decision (RESEARCH Open Q3):** decide survivor-history ownership — let the trigger write it (gets `auto_rejeitado=true` because service_role `auth.uid()` is NULL) vs. an explicit `auto_rejeitado=false` INSERT for semantic honesty.

---

### audit INSERT into `historico_candidatura` (event-driven, append-only)

**Analog (table shape):** `supabase/migrations/20260607000001_historico_candidatura.sql` lines 37-46.
```sql
CREATE TABLE public.historico_candidatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid NOT NULL REFERENCES public.candidaturas(id),
  etapa_de public.etapa_processo,                  -- NULL-able
  etapa_para public.etapa_processo NOT NULL,
  criterio_texto text,
  ator uuid REFERENCES auth.users(id),             -- NULL for system/service_role (D-09)
  auto_rejeitado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
```
**Semantics to copy (Phase 6 D-09):** `ator=NULL` + `auto_rejeitado=true` marks a system/knockout action; a human action carries `auth.uid()` + `auto_rejeitado=false`.

**Analog (trigger no-double-write proof):** `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` — fires `BEFORE UPDATE OF etapa_atual` only (never INSERT), and its first guard is `IF NEW.etapa_atual IS NOT DISTINCT FROM OLD.etapa_atual THEN RETURN NEW`. **No Phase 6 trigger adjustment is required** — flag confirmed by RESEARCH D-13.

---

### `qualificacao_etapa1` snapshot write — extend `publish_vaga` (rpc, transform)

**Analog:** `supabase/migrations/20260607010004_publish_vaga_rpc.sql` — the publish gate. Phase 8 extends it to (a) write the derived `qualificacao_etapa1` snapshot at publish (D-07, "espelha `testes_aplicaveis`") and optionally (b) add the ≤10-perguntas / ≤1-aberta gate (D-09, RESEARCH Open Q5).

**Authorization-in-body pattern** (lines 53-57) — RLS does NOT apply inside a DEFINER body; the role check is explicit (raises 42501). Copy this for any new DEFINER write; note `publish_vaga` is `GRANT EXECUTE TO authenticated` (called from the authenticated client), NOT service_role:
```sql
v_role := (auth.jwt() #>> '{app_metadata,role}');
IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
  RAISE EXCEPTION 'forbidden' USING errcode = '42501';
END IF;
```

**Gate-check pattern** (lines 95-108) — the EXISTING D-12 knockout-obrigatoria check (every pergunta with a `tag='knockout'` option must be `obrigatoria`). The new ≤10/≤1-aberta check copies this `SELECT EXISTS(...) INTO v_flag; IF v_flag THEN RAISE EXCEPTION ... USING errcode='P0001'` idiom:
```sql
SELECT EXISTS (
  SELECT 1 FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario p ON p.id = m.pergunta_id
   WHERE p.vaga_id = p_vaga_id AND m.tag = 'knockout' AND p.obrigatoria = false
) INTO v_knockout_invalido;
IF v_knockout_invalido THEN
  RAISE EXCEPTION 'Toda pergunta com opcao eliminatoria (knockout) precisa ser obrigatoria.'
    USING errcode = 'P0001';
END IF;
```
**Escaping note (Phase 7 bug 8f1941b):** literal `%` in a `RAISE EXCEPTION` format string must be `%%` (see line 80 `somar 100%%`).

---

### `candidaturas` + `vagas` new columns (migration, CRUD/DDL)

**Analog:** `supabase/migrations/20260607010002_vagas_config_columns.sql` (the `testes_aplicaveis`/`pesos_avaliacao` jsonb add). Same idempotent `ADD COLUMN IF NOT EXISTS` + partial-index pattern (RESEARCH §Code Examples):
```sql
ALTER TABLE public.candidaturas
  ADD COLUMN IF NOT EXISTS motivo_rejeicao   text,        -- begins with 'knockout_automatico' (D-12; text vs enum = planner Open Q2)
  ADD COLUMN IF NOT EXISTS opcao_knockout_id uuid;        -- logical FK → pergunta_opcao_metadata.opcao_id
CREATE INDEX IF NOT EXISTS idx_candidaturas_knockout
  ON public.candidaturas (opcao_knockout_id) WHERE opcao_knockout_id IS NOT NULL;

ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS qualificacao_etapa1 jsonb NOT NULL DEFAULT '[]'::jsonb;  -- D-07 derived snapshot
```
**Reuse `feedback_rejeicao`** — already exists on `candidaturas` (do NOT add a new message column).

**CPF nullable (D-02):** `ALTER TABLE public.candidatos ALTER COLUMN cpf DROP NOT NULL` + relax/drop `check_cpf_format`. `[VERIFY LIVE — A2]` inspect the CHECK predicate first; if it's `cpf ~ '^...'` it rejects NULL → replace with `cpf IS NULL OR cpf ~ '^...'`. **Do NOT drop the column** (reversible).

**Partial-index for knockout reads:** mirror the Phase 7 hot-path index `idx_pom_knockout ON pergunta_opcao_metadata (pergunta_id) WHERE tag = 'knockout'` (`20260607010001` lines 64-66).

---

### `supabase/functions/_shared/schemas.ts` — `.strict()` allowlist (schema, request-response)

**Analog:** same file, `submitCandidaturaSchema` (lines 199-227). Phase 8 appends `.strict()` so unknown keys (cpf/foto/estado_civil/saude) → 400 fail-closed (D-04, LGPD-01):
```typescript
export const submitCandidaturaSchema = z.object({
  candidato_id: z.string().uuid('candidato_id inválido'),
  vaga_id: z.string().uuid('vaga_id inválido'),
  curriculo_url: z.string().min(1),
  curriculo_nome: z.string().min(1),
  curriculo_size: z.number().int().positive().max(5_242_880),
  respostas: z.array(/* ... */).max(100).default([]),
}).strict()   // ← D-04: any extra key → 400 VALIDATION
```
> **Decide which surface the LGPD test asserts against** (RESEARCH Pattern 1): `submitCandidaturaSchema` never carried cpf — the schema that currently *accepts* cpf is `cadastroCandidatoSchema` (the cadastro EF). The forbidden-field allowlist matters most there. Add `.strict()` to both for defense in depth.

**Error-mapping pattern** (EF index.ts lines 56-65, 110-124, 249-278) — Zod `safeParse` → `errorResponse('VALIDATION', issue.message, fieldName)`; Postgres `23505`→`DUPLICATE_CANDIDATURA`, `23503`→`VALIDATION`. The RPC's new RAISE paths surface through this same `rpcErr.code` switch — no new error plumbing needed.

---

### `submit-candidatura/index.ts` — EF (edge-function, request-response)

**Analog:** same file — **largely unchanged**. The two-client pattern (anon-with-Authorization for `auth.getUser()`, service_role for the RPC), the IDOR cross-check (`candidato.id !== input.candidato_id`), the curriculo path-prefix check, and the fire-and-forget n8n webhook all stay (lines 140-178, 184-190, 282-309). The RPC return now includes the rejection state — the EF can pass it through to the client so `FormularioCandidaturaPage` can branch on `status==='rejeitado'`.
> **Flag (A5):** the n8n `nova-candidatura` webhook (lines 289-309) will ALSO fire for knocked-out candidaturas. Confirm with Fernando whether to fire or gate on survivor-only.

---

### `cargoTemplates.ts` — default knockout seed (config, batch git→DB)

**Analog:** same file. Phase 8 extends `CargoTemplate` (lines 33-40) with a `qualificacao` field (questions + per-option tags) and the deep-copy in `getCargoTemplateDefaults` (lines 163-172). Copy the `baseTestes(overrides)` factory idiom (lines 47-65) for a `baseQualificacao()` carrying the **presencial-SP knockout** (fixed clinic text, ALL cargos) + **harmonização orofacial** (dentista ONLY, D-14):
```typescript
export interface CargoTemplate {
  slug: CargoSlug
  label: string
  pesos_avaliacao: PesosAvaliacao
  testes_aplicaveis: TesteAplicavel[]
  qualificacao: QualificacaoPergunta[]   // ← NEW: Etapa-1 questions + per-option tags (D-14)
}
```
**Presencial-SP fixed text** (verified identical across all 8 cargos, RESEARCH D-14): `"Você tem disponibilidade para trabalhar presencialmente em São Paulo, perto dos metros Brigadeiro e Paraíso?"` → option `"Não"` carries `tag='knockout'`. Single-tenant, single-clinic → fixed text, NOT derived from `vaga.cidade`.

**Deep-copy mandate** (lines 158-172) — selecting a template must deep-copy into the vaga; the `qualificacao` array must be cloned the same way `testes_aplicaveis.map(t => ({...t, perguntas: [...]}))` is. The copy-into-vaga write reuses the Phase 7 `upsert_pergunta_opcoes_metadata` sync RPC.

---

### cadastro dedup → email-only (service + component, request-response)

**Analog:** `src/features/cadastro/services/duplicateCheckService.ts` — `checkEmailDuplicate` already calls the RPC with `p_cpf=''` (which makes the CASE return `cpf_exists=false`). **The RPC is forward-compatible; do NOT rewrite it** (D-03). The change is client-side only:
- `DadosPessoaisStep.tsx`: **drop the cpf `useDuplicateCheck` invocation**, keep only the email one.
- `candidatoSchema.ts`: remove `cpfSchema`/`.genero` required fields.
- `cadastroService.ts`: stop sending cpf to the EF.
- `cadastrar-candidato/index.ts`: stop inserting cpf into `candidatos` AND `auth.users` user_metadata (L180).
```typescript
// DadosPessoaisStep.tsx (edited) — keep only:
const { isDuplicate: emailDuplicate } = useDuplicateCheck(email || '', { field: 'email' })
```

---

### rejection/survivor result + dashboard `feedback_rejeicao` (page components, request-response/CRUD)

**Analog (submit handler):** `FormularioCandidaturaPage.tsx` L320-329 (`submitCandidaturaWithRespostas`). The EF response now carries the rejection state; branch on it to render the D-15 inline neutral result (calm muted glass card, no red alarm) vs. the "Candidatura enviada!" survivor confirmation (UI-SPEC surfaces 3 & 5).

**Analog (status badge):** `MeuPerfilCandidatoPage.tsx` `getStatusBadge` (lines 323-347) — the `rejeitado` badge already exists (`STATUS_CANDIDATURA_LABELS.rejeitado`, red className). Phase 8 **adds the `feedback_rejeicao` body below the badge** (D-16) — today only the badge renders, never the reason. Same pattern in `DashboardCandidatoPage.tsx`. Note: `candidaturasService.ts` L859 is currently the only `feedback_rejeicao` reference (a write path) — the read+render is the new wiring.
```tsx
// after the existing <Badge> (MeuPerfilCandidatoPage L683-685):
{candidatura.status === 'rejeitado' && candidatura.feedback_rejeicao && (
  <p className="text-base text-muted-foreground mt-2">{candidatura.feedback_rejeicao}</p>
)}
```
**UI-SPEC constraints:** neutral/muted tone (not alarmist red-on-red), 16px body, never expose the criterion. `opcao_knockout_id` is server-side audit only — never rendered.

---

## Shared Patterns

### Migration apply (42601 / D-22)
**Source:** every Phase 6/7 migration header (e.g. `publish_vaga_rpc.sql` lines 27-33).
**Apply to:** the Phase 8 SQL migration.
- No outer `BEGIN; ... COMMIT;` wrapper (CLI wraps each migration).
- If `db push` fails with 42601 → apply via **Supabase MCP `execute_sql`** (or SQL Editor), then `supabase migration repair --status applied <version>`, then `db push` shows "up to date".
- Regenerate `database.types.ts` (root, never edit by hand) via `npm run db:types` after apply.

### SECURITY DEFINER write contract
**Source:** `submit_candidatura_atomic` (service_role grant) + `publish_vaga` (authenticated grant).
**Apply to:** any new/extended RPC.
- `SECURITY DEFINER` + `SET search_path = ''` + schema-qualify all objects (`public.`).
- RLS does NOT apply in a DEFINER body → role check explicit in-body, `RAISE EXCEPTION ... USING errcode='42501'`.
- `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO {service_role | authenticated}` (knockout RPC = service_role; publish = authenticated). NEVER service_role on the client.

### Audit semantics (ator / auto_rejeitado)
**Source:** `historico_candidatura.sql` + `avancar_etapa_trigger.sql` (Phase 6 D-09).
**Apply to:** the knockout audit INSERT + survivor-history decision.
- System/knockout action → `ator=NULL`, `auto_rejeitado=true`.
- Human action → `ator=auth.uid()`, `auto_rejeitado=false`.
- Caveat: inside the RPC (service_role) `auth.uid()` is NULL → a survivor forward-advance via the trigger gets `auto_rejeitado=true` (semantic wrinkle — planner picks explicit-INSERT vs trigger).

### Answer-key join (texto, not id)
**Source:** `pergunta_opcao_metadata.sql` lines 20-23 + 48-49 (dual `opcao_id`+`opcao_texto` keys); `FormularioCandidaturaPage.tsx` L284-311 (writer stores TEXT).
**Apply to:** the knockout sweep + any F10/F15 join.
- Form writes `resposta_opcoes` as option **TEXT strings**. Join knockout on `opcao_texto` (`@> to_jsonb(m.opcao_texto)`); record `opcao_knockout_id` from the matched row's `opcao_id`. Joining on `opcao_id` silently never fires (Pitfall 1).

### RLS role idiom
**Source:** `pergunta_opcao_metadata.sql` lines 71-76.
**Apply to:** any new RLS policy.
- Live-verified shipped idiom: `(select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')`. Role is `'administrador'`, NOT the stale PRD `'admin'`. Candidate reads/writes own row only.

### Test scaffold (Wave 0 RED)
**Source:** `cargoTemplates.test.ts` (Vitest, import-the-planned-module pattern).
**Apply to:** new unit tests. SQL behavior (knockout sweep, single-history-row, no-double-write) → an `08-SQL-SMOKE-RUNBOOK.md` using a disposable fixture + `set_config('request.jwt.claims', ...)` to simulate roles (Phase 7 idiom). Extend existing: `duplicateCheckService.test.ts` (email-only), `cargoTemplates.test.ts` (default knockouts), `publishGate.test.ts` (≤10/≤1-aberta).

---

## No Analog Found

None. Every Phase 8 file extends or copies a same-role, same-data-flow analog that already shipped in Phases 4/6/7. The "new" surface is incremental wiring, not a new module — consistent with the thin-M2-layer mandate.

---

## Metadata

**Analog search scope:** `supabase/migrations/`, `supabase/functions/`, `src/features/cadastro/`, `src/features/config-vaga/`, `src/features/vagas/`, `src/components/pages/`.
**Files scanned:** ~14 (3 RPCs, 2 schema/table migrations, 1 trigger, 1 EF, 1 shared schema, cargoTemplates + test, dedup service, 3 page components).
**Live-verify flags for planner (use Supabase MCP `execute_sql` before locking the migration):** A2 (`check_cpf_format` predicate vs NULL), A4 (`resposta_opcoes` stored shape for the `@>` join).
**Pattern extraction date:** 2026-06-07
