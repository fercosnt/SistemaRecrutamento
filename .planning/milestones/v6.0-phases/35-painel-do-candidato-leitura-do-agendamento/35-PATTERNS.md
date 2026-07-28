# Phase 35: Painel do Candidato — Leitura do Agendamento - Pattern Map

**Mapped:** 2026-07-17
**Files analyzed:** 8 (5 new, 2 modified, + 1 modified test-adjacent host)
**Analogs found:** 8 / 8 (every new/modified file has a concrete in-repo analog)

> Frontend-only phase. Zero schema, zero npm, zero migration. Every file below either
> **extracts**, **mirrors**, or **edits** an existing proven idiom. The only genuinely
> new code is the `.ics` builder (small, pure, RFC 5545). Planner: copy the anchored
> excerpts directly into the plan action sections.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/datetime/formatDataHoraSP.ts` | utility | transform | `src/features/entrevista/components/EntrevistaDashboard.tsx:44-73` | exact (verbatim extract) |
| `src/features/entrevista/components/EntrevistaDashboard.tsx` (EDIT) | component | transform | self (remove local fn, re-import util) | exact |
| `src/features/agendamento/services/agendamentoCandidatoService.ts` | service | request-response + transform | `src/features/avaliacao/services/redacaoService.ts:158-199` (RPC read) + `agendamentoService.ts:26-73` (error/enums/Row) + `biasAuditService.ts:147-155` (blob) | exact (composite) |
| `src/features/agendamento/hooks/useMeuAgendamento.ts` | hook | request-response | `src/features/agendamento/hooks/useAgendamento.ts:15-79` | exact |
| `src/features/agendamento/components/AgendamentoCandidatoCard.tsx` | component | request-response | `src/components/pages/DashboardCandidatoPage.tsx:300-398` (glass chip/footer) + `EntrevistaDashboard.tsx` (read-row render) | role-match |
| `src/components/pages/DashboardCandidatoPage.tsx` (EDIT) | page (component) | request-response | self (`:300-398` map + footer) | exact |
| `src/lib/datetime/__tests__/formatDataHoraSP.test.ts` | test | transform | (new — pure-fn unit; no direct analog) | no analog (pure-fn) |
| `src/features/agendamento/services/__tests__/agendamentoCandidatoService.test.ts` | test | request-response | `src/features/avaliacao/__tests__/redacaoService.rpc.test.ts:15-119` | exact (harness) |

---

## Pattern Assignments

### `src/lib/datetime/formatDataHoraSP.ts` (utility, transform)

**Analog:** `src/features/entrevista/components/EntrevistaDashboard.tsx:44-73` — **extract verbatim**. Grep-confirmed (RESEARCH A3): the exported `formatDataHora`/`compute24hMarker` are imported by **no other module** (only the component is imported, by `EntrevistaWorkspace`), so lifting `saoPauloParts` + `formatDataHora` into a shared home breaks no caller.

**Core pattern to move** (EntrevistaDashboard.tsx:44-73, copy as-is, rename export `formatDataHora` → `formatDataHoraSP`):
```typescript
const DISPLAY_TIME_ZONE = 'America/Sao_Paulo'

function saoPauloParts(iso: string):
  { dd: string; mm: string; yyyy: string; hh: string; min: string } | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: DISPLAY_TIME_ZONE, day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const hh = pick('hour') === '24' ? '00' : pick('hour')  // engine edge: midnight → '00'
  return { dd: pick('day'), mm: pick('month'), yyyy: pick('year'), hh, min: pick('minute') }
}

export function formatDataHoraSP(iso: string | null): string | null {
  if (!iso) return null
  const p = saoPauloParts(iso)
  return p ? `${p.dd}/${p.mm}/${p.yyyy} às ${p.hh}:${p.min}` : null
}
```

**Keep LOCAL to EntrevistaDashboard** (do NOT move): `formatCurto` (tooltip-only) and `compute24hMarker` (RH label). The candidate card needs neither — it has its own boolean predicates. Export `saoPauloParts` too (test seam for the midnight-'24' edge).

---

### `src/features/entrevista/components/EntrevistaDashboard.tsx` (EDIT, component)

**Analog:** self. Delete the local `DISPLAY_TIME_ZONE`/`saoPauloParts`/`formatDataHora` (lines 44-73), add `import { formatDataHoraSP, saoPauloParts } from '@/lib/datetime/formatDataHoraSP'`, and re-point the local `formatCurto` (75-81) + any `formatDataHora(...)` call sites to the imported names. `compute24hMarker` (88+) stays but now consumes the imported `saoPauloParts` if it referenced it. **Behavior-preserving refactor only** — no visual/logic change to the RH surface.

---

### `src/features/agendamento/services/agendamentoCandidatoService.ts` (service, request-response + transform)

Composite — three distinct analogs, one file.

**(a) RPC read — analog `src/features/avaliacao/services/redacaoService.ts:168-199`** BUT **without the confined cast**. `get_meu_agendamento` IS in `database.types.ts:4792-4803` (verified), so call `.rpc` directly typed — do NOT copy `redacaoService`'s `supabase.rpc as unknown as (...)` cast (that exists only because `get_minha_redacao` is absent from the types).

redacaoService.ts:168-198 (the shape to mirror — take rows[0] ?? null, never base table):
```typescript
export async function getRedacaoCandidato(candidaturaId: string): Promise<MinhaRedacaoRow | null> {
  if (!candidaturaId) throw new RedacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  // ... candidate own-row read goes through the DEFINER RPC — NOT the base table ...
  const { data, error } = await (/* RPC call */)
  if (error) throw new RedacaoServiceError(`Não foi possível carregar sua redação: ${error.message}`, 'DATABASE_ERROR', error)
  const rows = (data as MinhaRedacaoRow[] | null) ?? []
  return rows[0] ?? null   // RPC already ORDER BY; take the newest
}
```

Target (typed, no cast — RESEARCH Pattern 2):
```typescript
const { data, error } = await supabase.rpc('get_meu_agendamento', { p_candidatura_id: candidaturaId })
```

**(b) Error class + enums + Row — analog `agendamentoService.ts:26-73`.** REUSE the union types by import (`import type { TipoAgendamento, StatusAgendamento } from './agendamentoService'`). Mirror the `XServiceError` class (26-40). **CRITICAL nullability gotcha** — `database.types.ts:4799` types `local_ou_link: string` and `4796 compareceu: boolean` as **non-null**, but the DDL columns are nullable. Declare the domain Row with `| null` exactly like `AgendamentoRow` does (agendamentoService.ts:63-73):
```typescript
export interface MeuAgendamentoRow {
  id: string
  candidatura_id: string
  tipo: TipoAgendamento
  data_hora: string
  local_ou_link: string | null   // ⚠ generated says `string`; column is nullable
  status: StatusAgendamento
  compareceu: boolean | null      // not rendered, but nullable
}
```

**(c) `.ics` blob download — analog `biasAuditService.ts:147-155`** (mirror VERBATIM):
```typescript
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
const url = URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = url
link.download = `bias-audit-${periodo ?? currentPeriod()}.csv`
document.body.appendChild(link)
link.click()
document.body.removeChild(link)
URL.revokeObjectURL(url)
```
Swap `type: 'text/calendar;charset=utf-8'`, filename `entrevista-beauty-smile.ics`, content = `gerarIcsAgendamento(row)`. The `.ics` builder itself (`toIcsUtc`/`escapeIcsText`/`gerarIcsAgendamento`) + the pure predicates (`ehUpcomingNaoCancelada`/`estaDentroDe24h`) are new — full source in **RESEARCH §Code Examples + Pattern 4/5** (RFC 5545, CRLF `\r\n`, escape `\ , ; \n`, `DTSTART` UTC `Z`, `DTEND` +1h, SUMMARY generic).

**Anti-pattern (LOCKED):** never `supabase.from('agendamentos_entrevista').select('*')` on the candidate path — no base-table candidate SELECT policy exists (returns 0 rows) and `select('*')` re-leaks columns the RPC excludes ([[reference_select_star_leaks_pii]]).

---

### `src/features/agendamento/hooks/useMeuAgendamento.ts` (hook, request-response)

**Analog:** `src/features/agendamento/hooks/useAgendamento.ts:15-79` — mirror the read half (drop the four write mutations; candidate is read-only).

Key factory + useQuery (useAgendamento.ts:27-49):
```typescript
export const agendamentoKeys = {
  all: ['agendamento'] as const,
  byCandidatura: (id: string) => [...agendamentoKeys.all, id] as const,
}
const STALE = 5 * 60 * 1000
export function useAgendamento(candidaturaId: string | undefined) {
  const query = useQuery({
    queryKey: agendamentoKeys.byCandidatura(candidaturaId || ''),
    queryFn: () => getAgendamento(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: STALE, gcTime: STALE, retry: 2,
  })
  // ... mutations (OMIT for candidate) ...
}
```
Target: `meuAgendamentoKeys` (`['meu-agendamento']`), `queryFn: () => getMeuAgendamento(candidaturaId!)`, same `staleTime/gcTime 5min, retry 2, enabled:!!candidaturaId`. `enabled` is the seam that keeps the RPC from firing on non-interview etapas (the parent only mounts the card for the two entrevista stages — belt-and-suspenders).

---

### `src/features/agendamento/components/AgendamentoCandidatoCard.tsx` (component, request-response)

**Analog:** `src/components/pages/DashboardCandidatoPage.tsx:300-398` for the glass idiom (this is the surface it embeds into) + `EntrevistaDashboard.tsx` for the "render one read-row with states" structure. Role-match: no existing child-component-owns-its-own-hook-per-map-item precedent — this is the Rules-of-Hooks fix (RESEARCH Pattern 3 / Pitfall 4). The hook lives HERE, always called; the parent decides whether to MOUNT this child.

**Status chip markup to reuse verbatim** (DashboardCandidatoPage.tsx:363-368 — the file's `statusInfo` chip; the UI-SPEC semantic table maps each `status_entrevista` to the same `{color}/{bg}` grammar):
```tsx
<div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusInfo.bg} border border-white/20`}>
  <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
  <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
</div>
```

**Turquoise CTA class to reuse verbatim** for the `.ics` button (DashboardCandidatoPage.tsx:389-393):
```
bg-[#35BFAD] hover:bg-[#35BFAD]/90 shadow-lg   // + min-h-[44px] w-full sm:w-auto (UI-SPEC touch target)
```

**Container** reuses the existing footer separator (DashboardCandidatoPage.tsx:379): `mt-4 border-t border-white/10 pt-4 flex flex-col gap-3`. Glass surface = `GlassCard variant="white"` family (already imported in the host). Amber ≤24h badge token (UI-SPEC, AA-verified): `bg-amber-500/25 text-amber-100 border-amber-300/40`. States (loading/no-agendamento/has/cancelada-visible/error) + copy = **35-UI-SPEC §States Contract + §Copywriting** (verbatim strings). Never render `presencial` as a link; `online` link = `<a target="_blank" rel="noopener noreferrer">`.

---

### `src/components/pages/DashboardCandidatoPage.tsx` (EDIT, page)

**Analog:** self. Inside the per-candidatura `.map` (:300-398), the vars `stepCTA`/`mostrarLGPD` are already derived at :303-304 using the drift-guard cast `candidatura.etapa_atual as EtapaFunilM2` (:110,138). Add the same-idiom gate and swap the footer:
```tsx
// with the existing per-item vars (~:303):
const etapa = candidatura.etapa_atual as EtapaFunilM2   // SAME cast idiom already in file
const ehEntrevista = etapa === 'entrevista_online' || etapa === 'entrevista_presencial'
// ... at the footer block (:379-398), replace ONLY when ehEntrevista:
{ehEntrevista
  ? <AgendamentoCandidatoCard candidaturaId={candidatura.id} tipoEtapa={etapa} />
  : (/* existing "Próximo passo" footer :379-398, UNCHANGED */)}
```
All imports the child needs are already resolvable in this file (`EtapaFunilM2` :12, glass :7, lucide :3). `funilNavMap` returns `rotaCandidato: () => null` for both entrevista etapas (funilNavMap.ts:95,102) — so the footer button was already a dead no-op there; the card replaces dead affordance with real info. No route change in `routes.tsx`.

---

### `src/features/agendamento/services/__tests__/agendamentoCandidatoService.test.ts` (test)

**Analog:** `src/features/avaliacao/__tests__/redacaoService.rpc.test.ts:15-119` — copy the harness. `vi.hoisted` capture of `rpcCalls`/`fromTables` + `vi.mock('@/lib/supabase/client')`, then assert the candidate read goes through `.rpc('get_meu_agendamento')` with `{ p_candidatura_id }` and **never** `.from('agendamentos_entrevista')`, and that the returned row carries **no RH-internal key** (`observacoes_rh`, `entrevistador`, `agendado_por`, `updated_by`, `vaga_id`).

Harness to mirror (redacaoService.rpc.test.ts:19-55):
```typescript
const { rpcCalls, fromTables } = vi.hoisted(() => ({
  rpcCalls: [] as Array<{ fn: string; args: unknown }>,
  fromTables: [] as string[],
}))
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: vi.fn((fn: string, args: unknown) => { rpcCalls.push({ fn, args }); return Promise.resolve({ data: [SAFE_ROW], error: null }) }),
    from: vi.fn((table: string) => { fromTables.push(table); /* chainable stub */ }),
  },
}))
```
Guard assertion (redacaoService.rpc.test.ts:87-96): `expect(rpcCalls[0].fn).toBe('get_meu_agendamento')`, `expect(fromTables).not.toContain('agendamentos_entrevista')`, loop `expect(row).not.toHaveProperty(k)` over the RH-internal keys. Same file also covers the pure `.ics` builder (CRLF, escaped comma in LOCATION, `DTSTART` `Z`, `DTEND` +1h, generic SUMMARY) and the predicate boundaries (exactly-24h, under, over, past, cancelada) with an injectable `now`.

---

### `src/lib/datetime/__tests__/formatDataHoraSP.test.ts` (test)

No direct analog (new pure-fn unit). Assert `formatDataHoraSP` yields `dd/mm/aaaa às hh:mm` in SP for a known UTC instant, the midnight-'24'→'00' edge (saoPauloParts), and `null` in / `null` out. Deterministic, no mocks.

---

## Shared Patterns

### Candidate own-row read via DEFINER RPC (never base table, never `select('*')`)
**Source:** `redacaoService.ts:158-199` (RPC read shape) + `agendamentoService.ts:55-73` (allowlist Row + `| null` discipline) + migration `20260716000001_agendamentos_entrevista.sql:133-168` (the RPC, posse `ca.user_id = auth.uid()` inside).
**Apply to:** `agendamentoCandidatoService.ts` (the only data path this phase adds).
The RPC's 7-col `RETURNS TABLE` IS the column allowlist — server-enforced, tested P33 (9/9). Client just projects. `[[reference_select_star_leaks_pii]]`, `[[reference_ef_authenticate_vs_authorize]]`.

### Typed `.rpc` — NO confined cast (differs from redacaoService)
**Source:** `database.types.ts:4792-4803` — `get_meu_agendamento` is present & typed (Args `{ p_candidatura_id: string }`).
**Apply to:** `agendamentoCandidatoService.ts`. Call `supabase.rpc('get_meu_agendamento', …)` directly. **Do NOT** copy `redacaoService.ts:179-185`'s `as unknown as (...)` cast — that is only needed for functions absent from the generated types. But DO override the generator's non-null `local_ou_link`/`compareceu` with `| null` (the one place the types lie).

### Service error class convention
**Source:** `agendamentoService.ts:26-40` (`AgendamentoServiceError` with `code` union + `details`).
**Apply to:** `agendamentoCandidatoService.ts` → `MeuAgendamentoServiceError` (codes `INVALID_INPUT`/`DATABASE_ERROR`/`NOT_FOUND`). CLAUDE.md `camelCaseService.ts` + `class XServiceError` convention.

### Blob client-download idiom
**Source:** `biasAuditService.ts:147-155` (`Blob` → `createObjectURL` → temp `<a download>` → `click` → `removeChild` → `revokeObjectURL`).
**Apply to:** `agendamentoCandidatoService.ts` `.ics` download. Zero npm (LOCKED).

### TanStack Query key factory + read hook
**Source:** `useAgendamento.ts:27-49` (hierarchical `xKeys` + `useQuery` staleTime/gcTime 5min, retry 2, `enabled:!!id`).
**Apply to:** `useMeuAgendamento.ts` (read-only; drop the mutations).

### `etapa_atual as EtapaFunilM2` drift-guard cast
**Source:** `DashboardCandidatoPage.tsx:110,138` (D-09 — runtime is M2 enum, static type is M1 legacy `EtapaProcesso`).
**Apply to:** the mount gate in `DashboardCandidatoPage.tsx` and the `tipoEtapa` prop of `AgendamentoCandidatoCard`.

### Named exports, pt-BR domain, `@/` imports
**Source:** CLAUDE.md + every analog above. Components PascalCase.tsx **named export** (never default); hooks `useCamelCase.ts`; services `camelCaseService.ts`; feature dirs `src/features/agendamento/{services,hooks,components}`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/datetime/__tests__/formatDataHoraSP.test.ts` | test | transform | New pure-fn unit; no sibling pure-datetime test to mirror. Trivial (deterministic, no mocks) — planner writes fresh. |
| `.ics` builder (`toIcsUtc`/`escapeIcsText`/`gerarIcsAgendamento` inside the service) | utility | transform | No calendar/RFC-5545 code exists in the repo. Deliberate hand-roll (LOCKED: zero npm). Full source pre-written in **35-RESEARCH §Code Examples**. |

> Everything else has a concrete analog. Where an analog is only role-match
> (`AgendamentoCandidatoCard`), the visual contract in **35-UI-SPEC** fully specifies
> layout/states/copy so the planner is not left to invent.

## Metadata

**Analog search scope:** `src/features/agendamento/`, `src/features/avaliacao/services/` (+ tests), `src/features/entrevista/components/`, `src/features/admin/bias-audit/services/`, `src/components/pages/`, `src/lib/navegacao/`, `database.types.ts`, `supabase/migrations/20260716000001_*`.
**Files scanned:** 9 read + 3 grep sweeps.
**Pattern extraction date:** 2026-07-17
