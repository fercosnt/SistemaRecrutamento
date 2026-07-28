# Phase 7: Configuração de Vaga & Tags - Pattern Map

**Mapped:** 2026-06-07
**Files analyzed:** 24 (new feature folder + 3 SQL migrations + 1 Phase-4 reader edit + 9 Wave-0 tests)
**Analogs found:** 22 / 24 (2 no-analog: `cargoTemplates.ts` TS-config-as-data, `BulkMarkDialog.tsx` bulk-reset UX)

> Read order for the planner: this file rides on `07-RESEARCH.md` §Code Examples (concrete
> SQL/TS the planner copies) + §Architecture Patterns. PATTERNS.md adds the **per-file analog +
> exact line-anchored excerpts** that RESEARCH summarized abstractly. Where RESEARCH already
> printed a full code block (the RPC, the migration DDL, the Zod schema, `cargoTemplates.ts`),
> this file points to it rather than duplicating it.

---

## File Classification

### Workstream A — Schema + write path (SQL migrations)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/<ts>_pergunta_opcao_metadata.sql` (enum + table + indexes + RLS) | migration | DDL / CRUD-table | `20260607000003_decisao_final.sql` + `20260607000006_rls_policies_m2_backbone.sql` | role-match (table+RLS) |
| `supabase/migrations/<ts>_vagas_config_columns.sql` (`testes_aplicaveis` + `pesos_avaliacao` jsonb) | migration | DDL / column-add | `20260607000002_etapa_processo_v2_cutover.sql` (ALTER TABLE pattern) | role-match |
| `supabase/migrations/<ts>_upsert_pergunta_opcoes_metadata.sql` (sync RPC) | migration / RPC | transform / atomic-multi-table-write | `20260425000003_submit_candidatura_rpc.sql` | **exact** |
| `supabase/migrations/<ts>_publish_vaga_rpc.sql` (server publish gate, A5) | migration / RPC | request-response / guarded UPDATE | `20260425000003_submit_candidatura_rpc.sql` (DEFINER shape) | role-match |

> Migration grouping is the planner's call (one bundle vs. several files). The 42601 workaround
> (Pitfall 2) applies to every file containing a `$$` body OR adjacent `COMMENT`/`GRANT`/`REVOKE`
> — i.e. all four. Mark each as a **human/MCP apply checkpoint**, not autonomous `db push`.

### Workstream B — `src/features/config-vaga/` (new feature, mirrors `src/features/vagas/`)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `services/configVagaService.ts` | service | CRUD + RPC call | `src/features/vagas/services/vagasService.ts` | **exact** |
| `hooks/useConfigVaga.ts` (`configVagaKeys` + read/mutate) | hook | request-response | `src/features/vagas/hooks/useVagas.ts` | **exact** |
| `hooks/usePerguntaOpcaoMetadata.ts` | hook | request-response (read) | `src/features/vagas/hooks/useVagaPerguntas.ts` | **exact** |
| `hooks/index.ts` | barrel | — | `src/features/vagas/hooks/index.ts` | exact |
| `schemas/pesosAvaliacaoSchema.ts` | schema | validation | `src/features/vagas/schemas/candidaturaFormSchema.ts` (Zod idiom) | role-match |
| `schemas/testesAplicaveisSchema.ts` | schema | validation | `candidaturaFormSchema.ts` (Zod idiom) | role-match |
| `schemas/tagOpcaoSchema.ts` | schema | validation | `candidaturaFormSchema.ts` (Zod idiom) | role-match |
| `types/configVagaTypes.ts` | types | — | `src/features/vagas/types/vagasTypes.ts` | role-match |
| `templates/cargoTemplates.ts` | config-data | — | (none — see No Analog) | **no analog** |
| `components/TemplateVagaSelector.tsx` | component | event-driven (select→copy) | `CriarEditarVagaPage.tsx` (Glass/Tabs shell) | partial (visual only) |
| `components/PesosSliders.tsx` | component | controlled-input | `CriarEditarVagaPage.tsx` + shadcn `slider.tsx` | partial |
| `components/PerguntaWithTagsForm.tsx` | component | controlled-form | `CriarEditarVagaPage.tsx` + shadcn `select.tsx`/`badge.tsx` | partial |
| `components/BulkMarkDialog.tsx` | component | event-driven (bulk reset) | shadcn `dialog.tsx` (see No Analog for UX) | partial |
| `__tests__/publishGate.test.ts` (+ a `publishGate.ts` validation fn) | test + utility | validation | `src/features/vagas/utils/__tests__/isUuid.test.ts` | role-match |

### Modified shipped file (Pitfall 1 — inseparable from D-13)

| Modified File | Role | Data Flow | Analog | Match Quality |
|---------------|------|-----------|--------|---------------|
| `src/features/vagas/schemas/candidaturaFormSchema.ts` (lines 66, 80 — `as string[]`) | schema (edit) | transform | self (in-place normalization) | self |

### Wave-0 test files (all mirror existing `__tests__/` siblings)

| New Test File | Mirrors |
|---------------|---------|
| `services/__tests__/configVagaService.test.ts` | `src/features/vagas/services/__tests__/vagasService.test.ts` |
| `schemas/__tests__/pesosAvaliacaoSchema.test.ts` | `candidaturaFormSchema.test.ts` |
| `templates/__tests__/cargoTemplates.test.ts` | (new shape — pure data assertions) |
| `components/__tests__/PesosSliders.test.tsx` | (RTL component test) |
| `components/__tests__/PerguntaWithTagsForm.test.tsx` | (RTL component test) |
| `components/__tests__/BulkMarkDialog.test.tsx` | (RTL component test) |
| `__tests__/publishGate.test.ts` | `src/features/vagas/utils/__tests__/isUuid.test.ts` (pure-fn test) |
| extend `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` | self (add objects→enum regression) |

---

## Pattern Assignments

### `services/configVagaService.ts` (service, CRUD + RPC)

**Analog:** `src/features/vagas/services/vagasService.ts` (read fully)

**Custom error class** — copy the shape, rename (lines 28-42):
```typescript
export class VagasServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: unknown
  ) {
    super(message)
    this.name = 'VagasServiceError'
  }
}
```
→ `ConfigVagaServiceError` with the same `code` union (add `'FORBIDDEN'` for the RPC `42501`
in-body raise; map RPC error → that code).

**Supabase client import** (line 13): `import { supabase } from '@/lib/supabase/client'` — the
anon client only; never `supabaseAdmin` (Security Rules).

**try/catch + error-mapping idiom** (lines 270-318, the `listVagas` body): every async fn wraps in
`try`, throws `XServiceError('DATABASE_ERROR', error)` on a Supabase `error`, re-throws known
`instanceof` and maps unknown → `'NETWORK_ERROR'`. The `getVagaById` variant (lines 384-397)
returns `{ success, error }` instead of throwing — pick the throw-style for mutations, the
result-object style for reads, matching whichever the calling hook expects.

**Methods this service needs (greenfield persistence — D-02 stub replaced):**
- `updateVagaConfig(vagaId, { testes_aplicaveis, pesos_avaliacao })` → plain `supabase.from('vagas').update({...}).eq('id', vagaId)` (mirrors the `.from('vagas')` query builder at vagasService.ts:141-149). Used by "Salvar rascunho" (no validation, D-12).
- `upsertOpcoesMetadata(perguntaId, opcoes)` → `supabase.rpc('upsert_pergunta_opcoes_metadata', { p_pergunta_id, p_opcoes })` — see RESEARCH §Code Examples for the exact arg shape.
- `publishVaga(vagaId, payload)` → `supabase.rpc('publish_vaga', { p_vaga_id })` (server re-validates D-12, A5). The only path that writes `status='ativa'`.

---

### `hooks/useConfigVaga.ts` (hook, request-response)

**Analog:** `src/features/vagas/hooks/useVagas.ts` (read fully)

**Query-keys hierarchy** — copy the `vagasKeys` pattern (lines 38-60), rename to `configVagaKeys`:
```typescript
export const vagasKeys = {
  all: ['vagas'] as const,
  lists: () => [...vagasKeys.all, 'list'] as const,
  list: (filters?, orderBy?, pagination?) => [...vagasKeys.lists(), { filters, orderBy, pagination }] as const,
  details: () => [...vagasKeys.all, 'detail'] as const,
  perguntas: (vagaId: string) => [...vagasKeys.all, 'perguntas', vagaId] as const,
} as const
```
→ `configVagaKeys` with `config(vagaId)`, `opcoesMetadata(vagaId)` / `opcoesMetadata(perguntaId)`.

**Query defaults** (lines 105-109): `staleTime: 5*60*1000`, `gcTime: 10*60*1000`, `retry: 2` —
CLAUDE.md mandated staleTime/retry. Mirror exactly.

**Mutations note:** `useVagas.ts` has only `useQuery`. For the write hooks, use TanStack
`useMutation` with `queryClient.invalidateQueries({ queryKey: configVagaKeys.config(vagaId) })` in
`onSuccess`. (No mutation analog in `vagas`; follow standard TanStack v5 `useMutation` — there is a
mutation precedent in `candidaturasService` consumers if a closer copy is wanted.)

**Auth store read** (line 13, 92): `const candidato = useAuthStore(...)` — for config-vaga the
relevant claim is the RH/admin role; the RPC enforces role server-side, the hook just calls it.

---

### `hooks/usePerguntaOpcaoMetadata.ts` (hook, read)

**Analog:** `src/features/vagas/hooks/useVagaPerguntas.ts` (read fully)

**Inline-queryFn read pattern** (lines 54-74) — the closest idiom for "read a child table of a
vaga":
```typescript
return useQuery({
  queryKey: vagasKeys.perguntas(vagaId ?? ''),
  queryFn: async (): Promise<PerguntaFormulario[]> => {
    const { data, error } = await supabase
      .from('perguntas_formulario')
      .select('*')
      .eq('vaga_id', vagaId!)
      .is('deleted_at', null)
      .order('ordem', { ascending: true })
    if (error) throw new Error(`Erro ao buscar perguntas: ${error.message}`)
    return (data ?? []) as PerguntaFormulario[]
  },
  enabled: !!vagaId,
  staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000, retry: 2,
  ...options,
})
```
→ Mirror for `.from('pergunta_opcao_metadata').eq('pergunta_id', ...)` (or join via pergunta_id IN
the vaga's perguntas). `enabled: !!id` gate is load-bearing (null/undefined/'' all disable).

---

### `schemas/pesosAvaliacaoSchema.ts` / `testesAplicaveisSchema.ts` / `tagOpcaoSchema.ts` (schema, validation)

**Analog (idiom):** `src/features/vagas/schemas/candidaturaFormSchema.ts`
**Concrete code:** RESEARCH §Code Examples already prints the full `pesosAvaliacaoSchema` (integer
guard + `.refine(sum===100)` + `somaPesos` live helper) — copy it verbatim (Pitfall 4).

From the analog, reuse these conventions:
- `import { z, type ZodType } from 'zod'` (line 24) — pt-BR messages inline (e.g. line 44 `'Resposta obrigatória'`). Tag/pesos messages also pt-BR.
- `z.coerce.number()` for numeric inputs (line 59) — but pesos use `z.number().int()` (Pitfall 4: integers only, no floats in the sum).
- `tagOpcaoSchema`: `tag: z.enum([...5 tags])`, `peso: z.number().int().min(-999).max(100)` (matches the DB CHECK), `nota_ia: z.string().nullable().optional()`.
- `export type X = z.infer<typeof schema>` (line 154) — type derivation convention.

---

### `templates/cargoTemplates.ts` (config-data)

**Analog:** none in codebase (see No Analog Found).
**Concrete code:** RESEARCH §Code Examples prints the full `CargoTemplate` interface + `cargoTemplates`
record + the 8-cargo starter-pesos table — copy it. All 8 pesos must sum to 100 (Wave-0 test
`cargoTemplates.test.ts` enforces). Pesos numbers are D-09 starter values (UAT-calibrated).

---

### SQL migrations

**`upsert_pergunta_opcoes_metadata.sql` (RPC) — analog: `20260425000003_submit_candidatura_rpc.sql` (exact idiom)**

Mirror these exact elements (read fully):

DEFINER header (lines 26-30):
```sql
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
```

`jsonb_array_elements` loop (lines 60-81) — the multi-row write pattern:
```sql
IF p_respostas IS NOT NULL AND jsonb_array_length(p_respostas) > 0 THEN
  FOR v_resposta IN SELECT * FROM jsonb_array_elements(p_respostas)
  LOOP
    INSERT INTO public.respostas_formulario (...) VALUES (
      (v_resposta->>'pergunta_id')::uuid, ...
    );
  END LOOP;
END IF;
```

GRANT/REVOKE footer (lines 93-94):
```sql
REVOKE ALL ON FUNCTION public.submit_candidatura_atomic(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_candidatura_atomic(...) TO service_role;
```

The "No `BEGIN/COMMIT`" header comment (lines 9-16) — copy that explanatory block verbatim into
the new RPC migrations.

**DEVIATION from the analog (important):** `submit_candidatura_atomic` GRANTs to `service_role`
(called from an Edge Function). The Phase-7 RPC is called **directly from the authenticated
client**, so it must instead `GRANT EXECUTE ... TO authenticated` AND do an **in-body role check**
(RLS does not apply to DEFINER bodies):
```sql
v_role := (auth.jwt() #>> '{app_metadata,role}');
IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
  RAISE EXCEPTION 'forbidden' USING errcode = '42501';
END IF;
```
(Full RPC body is in RESEARCH §Code Examples — including `gen_random_uuid()` opcao_id backfill +
jsonb writeback. Use it.)

**`pergunta_opcao_metadata.sql` + `vagas` columns + RLS — analog: `20260607000006_rls_policies_m2_backbone.sql`**

RLS role idiom (lines 46-49, 55-58) — copy EXACTLY (Pitfall 3 — do NOT use the stale PRD `'admin'`):
```sql
CREATE POLICY rh_le_candidaturas ON public.candidaturas
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
  );
```
→ For `pergunta_opcao_metadata`, a `FOR ALL` policy with both `USING` + `WITH CHECK` (RH/admin write
config). Full table DDL + indexes + policy are in RESEARCH §Code Examples.

The 42601 header note (lines 27-31) — copy the "if `db push` fails with 42601, apply via D-22
SQL-Editor workaround + `migration repair`" block.

---

### `src/features/vagas/schemas/candidaturaFormSchema.ts` (MODIFY — Pitfall 1 / D-13)

**This is an edit to a shipped file, inseparable from the jsonb-shape migration.**

The two breakage sites — `single_choice` (line 66) and `multiple_choice` (line 80):
```typescript
// line 66 (single_choice):
const opts = (p.opcoes_resposta as string[] | null) ?? []
// ...used at line 69: z.enum(opts as [string, ...string[]])

// line 80 (multiple_choice):
const opts = (p.opcoes_resposta as string[] | null) ?? []
// ...used at line 84: z.enum(opts as [string, ...string[]])
```
After the migration rewrites `opcoes_resposta` from `string[]` → `[{id, texto}]`, both `as string[]`
casts produce objects where `z.enum` expects strings. **Fix:** introduce a normalization helper
(`opcoesToStrings(jsonb): string[]` reading `.texto`) that accepts BOTH legacy `string[]` and new
`[{id,texto}]` (idempotent), and replace both `opts` lines with `opcoesToStrings(p.opcoes_resposta)`.
Add the objects→enum regression case to `candidaturaFormSchema.test.ts` (Wave 0) — REQUIRED, not
optional.

---

### Components (visual analog only — `CriarEditarVagaPage.tsx`)

**Analog:** `src/components/pages/CriarEditarVagaPage.tsx` — reuse the **Glass + Tabs visual shell**
(D-01) and the `status_vaga` RadioGroup; do NOT reuse the save logic (it is a stub).

**Stub save confirmed** (lines 256-262) — both handlers are `console.log`:
```typescript
const handleSalvarRascunho = () => { console.log('Salvar rascunho:', dados); };
const handlePublicar = () => { console.log('Publicar vaga:', dados); };
```
→ The new feature wires real persistence here via `configVagaService` (D-02 "ligar de verdade").

shadcn primitives to use (all vendored, verified under `src/components/ui/`): `slider.tsx`
(PesosSliders), `dialog.tsx` (BulkMarkDialog), `alert-dialog.tsx` (Trocar template confirm),
`select.tsx` + `badge.tsx` (tag rows), `switch.tsx`, `tooltip.tsx`. UI-SPEC `07-UI-SPEC.md` is the
visual/color/copy contract (tag taxonomy colors, accent `#35BFAD`, pt-BR copy).

---

## Shared Patterns

### Authentication / Authorization (RLS)
**Source:** `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:46-58`
**Apply to:** `pergunta_opcao_metadata` table policy + both RPCs (in-body check).
```sql
(select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
```
Live-verified idiom. Role values are `'rh'` / `'administrador'` / `'candidato'` — **NOT `'admin'`**
(Pitfall 3). Set by `custom_access_token_hook` (20260420000002) at `{app_metadata,role}`.

### Atomic multi-table write
**Source:** `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` (whole file)
**Apply to:** `upsert_pergunta_opcoes_metadata` (and structurally `publish_vaga`).
`SECURITY DEFINER` + `SET search_path = ''` + `jsonb_array_elements` loop + `REVOKE ALL FROM PUBLIC`
+ explicit GRANT. **Deviation:** GRANT `authenticated` (not `service_role`) + in-body role check,
because Phase-7 RPCs are called directly from the client (RESEARCH §Architecture Pattern 1 note).

### Service error class
**Source:** `src/features/vagas/services/vagasService.ts:28-42`
**Apply to:** `configVagaService.ts` → `ConfigVagaServiceError` (same `code` union + `'FORBIDDEN'`).

### TanStack query keys + defaults
**Source:** `src/features/vagas/hooks/useVagas.ts:38-60` (keys), `:105-109` (defaults)
**Apply to:** `configVagaKeys` + every config-vaga query. `staleTime 5min / retry 2` per CLAUDE.md.

### Zod pt-BR schema + type inference
**Source:** `src/features/vagas/schemas/candidaturaFormSchema.ts:24, 154`
**Apply to:** all 3 config-vaga schemas. `import { z }`, pt-BR messages, `z.infer` exported type.
Note `@hookform/resolvers` v5 input/output cast caveat (comment at lines 14-18) if a schema uses
`.optional().default()`.

### Migration apply path (42601 workaround)
**Source:** `20260425000003_submit_candidatura_rpc.sql:9-16` + `20260607000006...:27-31` (header notes)
**Apply to:** all 4 Phase-7 migration files. No `BEGIN/COMMIT` wrapper; apply via Supabase MCP
`execute_sql` or SQL-Editor-manual + `supabase migration repair --status applied <version>`. Mark as
human/MCP checkpoint. Regenerate `./database.types.ts` (repo ROOT) via `npm run db:types` after.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `templates/cargoTemplates.ts` | config-data | static | No "TS-config-as-data" module exists in the tree yet (vagas uses DB + types, not static record maps). Full shape is in RESEARCH §Code Examples — use it as the source pattern. |
| `components/BulkMarkDialog.tsx` (UX) | component | bulk-reset | No existing "bulk reset to default" dialog. Build on shadcn `dialog.tsx` (lightweight confirm, not AlertDialog — UI-SPEC: reversible action). UI-SPEC copy: "Marcar tudo como informativa". |
| `__tests__/publishGate.test.ts` (the D-12 3-condition fn) | utility/test | validation | No multi-condition publish-gate fn exists. Closest test idiom = `src/features/vagas/utils/__tests__/isUuid.test.ts` (pure-fn unit test). Conditions defined in CONTEXT D-12. |

> For these three, the planner uses RESEARCH.md §Code Examples + §Architecture Patterns + UI-SPEC
> rather than a codebase analog.

## Metadata

**Analog search scope:** `src/features/vagas/{services,hooks,schemas,types,utils}`,
`supabase/migrations/` (18 files), `src/components/ui/`, `src/components/pages/CriarEditarVagaPage.tsx`.
**Files scanned/read:** vagasService.ts, useVagas.ts, useVagaPerguntas.ts, candidaturaFormSchema.ts,
20260425000003_submit_candidatura_rpc.sql, 20260607000006_rls_policies_m2_backbone.sql,
CriarEditarVagaPage.tsx (stub region), migration directory listing, ui primitives listing.
**Pattern extraction date:** 2026-06-07
