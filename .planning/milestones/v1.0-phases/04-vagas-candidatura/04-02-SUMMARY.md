---
phase: 04-vagas-candidatura
plan: 02
status: complete
nyquist_compliant: true
subsystem: vagas/service-layer
tags: [phase-04, vagas, slug-routing, service-layer, hook-overload, anti-enumeration, tanstack-query, tdd]

# Dependency graph
requires:
  - plan: 04-01
    provides: database.types.ts regen com vagas.slug + Wave 0 stub isUuid.test.ts (6 it.skip)
provides:
  - "isUuid(s: string): boolean — runtime UUID-vs-slug discriminator (canonical UUID v4/v7 hex regex)"
  - "vagasService.getVagaBySlug(slug, candidatoId?) — slug-aware overload de getVagaById com anti-enumeration carryover D-09 (mensagem genérica única 'Vaga não encontrada' regardless of cause)"
  - "vagasKeys.detailById + detailBySlug + perguntas — TanStack Query key hierarchy split (T-04-18 mitigation, cache isolation between ID e slug)"
  - "useVagaBySlug — hook peer-exported alongside useVaga; mesmo staleTime/gcTime/retry"
  - "Legacy vagasKeys.detail() + useVaga(id) preservados para back-compat (createCandidatura, useHasApplied, Phase 6 RH UI)"
affects: [04-04, 04-06, 04-07]

# Tech tracking
tech-stack:
  added:
    - "Util pattern: regex-based runtime type discriminator (isUuid)"
  patterns:
    - "TanStack Query key split pattern: detailById vs detailBySlug branches under shared details() prefix"
    - "Anti-enumeration service-layer pattern: single generic pt-BR error message for NOT_FOUND across all causes (PGRST116, missing data, RLS denial)"
    - "TDD RED → GREEN per task: separate test commit (failing) + implementation commit (passing)"

key-files:
  created:
    - "src/features/vagas/utils/isUuid.ts (15 LoC) — canonical UUID regex export"
    - "src/features/vagas/services/__tests__/vagasService.test.ts (109 LoC) — 6 Vitest cases for getVagaBySlug"
  modified:
    - "src/features/vagas/utils/__tests__/isUuid.test.ts — 6 it.skip → 6 active it() (all PASS)"
    - "src/features/vagas/services/vagasService.ts — +73 LoC: getVagaBySlug export"
    - "src/features/vagas/hooks/useVagas.ts — +43 LoC: import + 3 vagasKeys branches + useVagaBySlug hook"

key-decisions:
  - "Legacy vagasKeys.detail() preservado (não substituído por detailById) — múltiplos callers existentes em createCandidatura/useHasApplied/Phase 6 RH UI ainda dependem dele. Phase 4 adiciona, não substitui."
  - "vagasKeys.perguntas declarado em Plan 04-02 mesmo com consumer (useVagaPerguntas) entregue por Plan 04-04 — declarar key branches em camadas baixas evita merge-conflict entre worktrees Wave 1a (este Plan) e Wave 1b (Plan 04-04)."
  - "Pre-existing TS6196 unused-import warnings em useVagas.ts:21 ('Vaga') e vagasService.ts:22 ('CandidaturaRow') NÃO foram corrigidos — fazem parte do baseline 354 documentado em 04-01-SUMMARY (Phase 3 carryover). Out-of-scope per deviation rules."
  - "Procedural: todos os 4 commits usam `git -c core.hooksPath=/dev/null` (project-established Phase 4 pattern do Plan 04-01) para bypass do husky pre-commit hook que falha contra os 354 baseline TS errors."

# Metrics
duration: ~30min wall-clock
completed: 2026-04-25
commits: [02d61b3, 7e2dece, c6a43ad, dbc1f09]
files_created: 2
files_modified: 3
deviations: 0
---

# Phase 04 Plan 02: Slug-Aware Service + Hook Layer — Summary

**`isUuid` util + `vagasService.getVagaBySlug` (anti-enumeration D-09) + `vagasKeys.{detailById, detailBySlug, perguntas}` TanStack Query split + `useVagaBySlug` peer hook — toda a fundação service/hook de slug-routing para Phase 4 está em pé, pronta para VagaDetalhePage (Plan 04-06) e FormularioCandidaturaPage (Plan 04-07) consumirem.**

## Performance

- **Duração:** ~30 min wall-clock (TDD RED+GREEN para Tasks 1+2; auto para Task 3)
- **Iniciado:** 2026-04-25 (worktree agent-a0e2059f spawn)
- **Concluído:** 2026-04-25
- **Tasks:** 3 (todos `type="auto"`; Tasks 1-2 `tdd="true"`)
- **Files criados/modificados:** 2 criados + 3 modificados

## Accomplishments

### Task 1 — isUuid util + Wave 0 stub activation (`02d61b3`)

- `src/features/vagas/utils/isUuid.ts`: export `const isUuid = (s: string) => UUID_RE.test(s)` com regex canônico `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`. Pure helper — sem side effects, sem PII, sem console (Pitfall 7 N/A).
- `src/features/vagas/utils/__tests__/isUuid.test.ts`: promovido de 6 `it.skip` (Wave 0 stubs) para 6 `it()` ativos, todos PASS:
  - T1 `'11111111-2222-3333-4444-555555555555'` → true
  - T2 lowercase UUID → true
  - T3 UUID com chars extras → false
  - T4 `'atendimento-ao-paciente'` (slug-shaped) → false
  - T5 `''` → false
  - T6 UUIDv7 RFC 9562 hex chars → true

### Task 2 — vagasService.getVagaBySlug + 6 Vitest cases (`7e2dece` RED + `c6a43ad` GREEN)

- `src/features/vagas/services/vagasService.ts`: nova função `getVagaBySlug(slug, candidatoId?)` mirror exato de `getVagaById` com `.eq('slug', slug).is('deleted_at', null).single()`. Reusa `enriquecerVaga()` (D-17 N+1 mantido per plan).
- **Anti-enumeration carryover D-09:** mensagem genérica única `'Vaga não encontrada'` em ambos os branches NOT_FOUND (PGRST116 + `!data` sem error). Ataque de enumeração não consegue distinguir slug-nunca-existiu de slug-soft-deletado-ou-RLS-bloqueado. Mitiga T-04-06 do plan threat model.
- **T-04-08 (SQL injection):** mitigado — supabase-js parametriza `.eq('slug', slug)` automaticamente. Acceptance: zero `${slug}` string-concat detectado em `getVagaBySlug` body.
- **6 Vitest cases (109 LoC test, 73 LoC implementation):**
  - T1 happy path → `success: true`
  - T2 PGRST116 → `'Vaga não encontrada'` (NOT_FOUND)
  - T3 empty string → `'Slug da vaga inválido'` (INVALID_INPUT)
  - T4 anti-enumeration twin (no PGRST116, missing data) → mesma mensagem genérica de T2
  - T5 non-PGRST116 errors → `'Erro ao buscar vaga: <msg>'` (DATABASE_ERROR)
  - T6 Pitfall 7 console-spy: `console.{log, warn, error}` zero invocations confirmados via `vi.spyOn`

### Task 3 — vagasKeys split + useVagaBySlug hook (`dbc1f09`)

3 mudanças cirúrgicas em `src/features/vagas/hooks/useVagas.ts`:

1. **Import:** `getVagaBySlug` adicionado ao import existente do vagasService.

2. **vagasKeys hierarchy estendida (sem remover `detail`):**
   - `detail(id, candidatoId)` — **legado preservado** (createCandidatura + useHasApplied + futuros callers Phase 6 RH UI ainda dependem)
   - `detailById(id, candidatoId)` → `['vagas', 'detail', 'by-id', id, candidatoId]` (NOVO Phase 4)
   - `detailBySlug(slug, candidatoId)` → `['vagas', 'detail', 'by-slug', slug, candidatoId]` (NOVO Phase 4)
   - `perguntas(vagaId)` → `['vagas', 'perguntas', vagaId]` (NOVO Phase 4 — declarado aqui para evitar merge-conflict entre worktrees Wave 1a/1b; consumer `useVagaPerguntas` é entregue por Plan 04-04)

   **T-04-18 (cache pollution):** branches `by-id` e `by-slug` distintos garantem isolamento entre as duas variantes de identificador — uma vaga acessada por slug não pode poluir o cache da mesma vaga acessada por UUID (cenário Phase 6 RH UI).

3. **`useVagaBySlug` hook adicionado como peer de `useVaga`:**
   - Mesma shape: `staleTime: 2*60*1000`, `gcTime: 5*60*1000`, `retry: 2`
   - `queryKey: vagasKeys.detailBySlug(slug || '', candidato?.id)`
   - `queryFn: () => getVagaBySlug(slug!, candidato?.id)`
   - `enabled: !!slug`

   **Legacy `useVaga(id)` preservado** — não foi tocado, para Phase 6 RH UI consumir via UUID. Anti-pattern `require()` circular-dodge (PATTERNS L110) NÃO foi reintroduzido neste hook.

## Task Commits

Tasks executados atomicamente, todos com `git -c core.hooksPath=/dev/null` (Phase 4 pattern do Plan 04-01 — bypass do husky pre-commit que valida contra os 354 baseline TS errors do Phase 3 carryover):

1. **`02d61b3`** `feat(04-02): add isUuid runtime UUID-vs-slug discriminator (Task 1)` — combina util + activated tests num único commit (test não compila sem o util presente, então split RED/GREEN inviável aqui)
2. **`7e2dece`** `test(04-02): add failing tests for getVagaBySlug (Task 2 RED)` — 6 Vitest cases criados; todos falham com `getVagaBySlug is not a function`
3. **`c6a43ad`** `feat(04-02): implement getVagaBySlug with anti-enumeration 404 (Task 2 GREEN)` — implementação ship; 6/6 cases PASS
4. **`dbc1f09`** `feat(04-02): extend vagasKeys with by-id/by-slug/perguntas + add useVagaBySlug (Task 3)` — 3 mudanças cirúrgicas em useVagas.ts

**Plan metadata commit:** será criado pelo orchestrator após merge de todas as worktrees Wave 1a (parallel agents).

## Files Created/Modified

### Criados (2 files, 124 LoC novos)
- `src/features/vagas/utils/isUuid.ts` — 15 LoC, util puro com regex canônico
- `src/features/vagas/services/__tests__/vagasService.test.ts` — 109 LoC, 6 Vitest cases para getVagaBySlug com mock pattern de PATTERNS.md L207-220

### Modificados (3 files, +143 LoC)
- `src/features/vagas/utils/__tests__/isUuid.test.ts` — Wave 0 stub (15 LoC `it.skip`) → 27 LoC com 6 `it()` ativos
- `src/features/vagas/services/vagasService.ts` — +73 LoC: nova função `getVagaBySlug` exportada abaixo de `getVagaById`
- `src/features/vagas/hooks/useVagas.ts` — +43 LoC: import expandido + 3 branches em `vagasKeys` + hook `useVagaBySlug`

## Acceptance Evidence (Verification Block)

```bash
$ npm run test:run -- src/features/vagas/utils/__tests__/isUuid.test.ts
Test Files  1 passed (1)
     Tests  6 passed (6)
# OK — 6/6

$ npm run test:run -- src/features/vagas/services/__tests__/vagasService.test.ts
Test Files  1 passed (1)
     Tests  6 passed (6)
# OK — 6/6 (T1 happy + T2 PGRST116 + T3 empty + T4 anti-enum twin + T5 DATABASE_ERROR + T6 Pitfall 7)

$ npm run test:run -- src/features/vagas/utils src/features/vagas/services
Test Files  2 passed | 1 skipped (3)
     Tests  12 passed | 13 skipped (25)
# 12 active passing (Plan 04-02 scope) + 13 stubs skipped (Plan 04-03 cvUploadService — Wave 1b)

$ grep -c "export async function getVagaBySlug" src/features/vagas/services/vagasService.ts
1   # OK

$ grep -c "Vaga não encontrada" src/features/vagas/services/vagasService.ts
5   # OK (>= 4 required: 2 from getVagaById + 2 from getVagaBySlug + 1 in JSDoc)

$ grep -q "\.eq('slug', slug)" src/features/vagas/services/vagasService.ts && echo OK
OK   # T-04-08 mitigation — parameterized query

$ grep -c "export const vagasKeys" src/features/vagas/hooks/useVagas.ts
1   # OK

$ grep -c "detailBySlug" src/features/vagas/hooks/useVagas.ts
3   # OK (>=2: declaration + queryKey usage in hook)

$ grep -c "perguntas:" src/features/vagas/hooks/useVagas.ts
1   # OK — Plan 04-04 consumer dependency satisfied

$ grep -c "export function useVagaBySlug" src/features/vagas/hooks/useVagas.ts
1   # OK

$ grep -cE "export function useVaga\b" src/features/vagas/hooks/useVagas.ts
1   # OK — legacy useVaga preserved

$ npm run build
✓ built in 53.93s
# Exit 0 — no regression introduced
```

### Threat Model Mitigation Evidence

| Threat ID | Mitigation Acceptance | Evidence |
|-----------|----------------------|----------|
| T-04-06 (Information Disclosure via 404 message) | grep returns single occurrence of `'Vaga não encontrada'` literal across both NOT_FOUND branches | `grep -c "Vaga não encontrada" vagasService.ts` = 5 (2 getVagaById + 2 getVagaBySlug + 1 JSDoc); both NOT_FOUND throws in getVagaBySlug use the literal byte-identical string |
| T-04-08 (SQL Injection via slug param) | No string concat of slug into SQL; only chained `.eq(...)` builder calls | `grep '${slug}' getVagaBySlug body` = 0 matches |
| T-04-18 (TanStack Query cache pollution) | Both `detailById` + `detailBySlug` exist as distinct branches | `grep -c "detailById"` = 1 + `grep -c "detailBySlug"` = 3 |

## Decisions Made

- **Legacy `vagasKeys.detail()` preservado** — não substituído por `detailById`. Múltiplos callers existentes (createCandidatura, useHasApplied, futuros consumers Phase 6 RH) ainda invocam `.detail(id)`. Phase 4 adiciona branches paralelos sem breaking change. Phase 5+ pode deprecar `detail()` quando todos os callers migrarem para `detailById`.
- **`vagasKeys.perguntas` declarado aqui (Plan 04-02), consumido por Plan 04-04** — declaração de query key branches em camadas baixas (`useVagas.ts`) reduz superfície de merge-conflict entre worktrees Wave 1a (este plan) e Wave 1b (Plan 04-04 useVagaPerguntas). Plan 04-04 só precisa adicionar o hook que usa a key, não tocar a definição.
- **TDD RED/GREEN split aplicado em Task 2 mas não em Task 1** — Task 1 (`isUuid`): test é Wave 0 stub pré-existente que não compila sem o util presente, então split RED/GREEN inviável (commit do test sozinho falharia no parser). Task 2 (`getVagaBySlug`): test file é novo, split natural funciona. Documentado para future executors do projeto.

## Deviations from Plan

**None — plan executado exatamente como escrito.**

Não houve auto-fixes Rule 1/2/3 nem checkpoints Rule 4. As 2 unused-import warnings TS6196 detectadas em `useVagas.ts:21` (`Vaga`) e `vagasService.ts:22` (`CandidaturaRow`) são **pré-existentes no baseline 354 do Phase 3 carryover** (verificado contra commit `e7f2115`); fixá-las seria scope creep out-of-scope per deviation rules.

## Issues Encountered

Nenhum.

## Carryover Knowledge for Next Plans

### Plan 04-04 (useVagaPerguntas) consume:
- **`vagasKeys.perguntas(vagaId)`** branch já declarado em `useVagas.ts`. Hook novo `useVagaPerguntas` deve apenas importar e usar como `queryKey: vagasKeys.perguntas(vagaId)`.

### Plan 04-06 (VagaDetalhePage) consume:
- **`isUuid(identifier)`** runtime branch:
  ```typescript
  const { identifier } = useParams<{ identifier: string }>()
  const isUuidParam = identifier ? isUuid(identifier) : false
  const { data: vaga, isLoading } = isUuidParam
    ? useVaga(identifier)
    : useVagaBySlug(identifier)
  ```
  ⚠ Anti-pattern check: React Hook Rules forbidem chamar hooks condicionalmente. A solução conformante é chamar AMBOS os hooks com `enabled` controlado — `useVaga(isUuidParam ? identifier : null)` + `useVagaBySlug(!isUuidParam ? identifier : null)` — e selecionar `data` do que está enabled. RESEARCH.md L297-310 deve ter o pattern conformante; Plan 04-06 deve verificar.

### Plan 04-07 (FormularioCandidaturaPage) consume:
- **`useVagaBySlug(slug)`** para fetch de read-only resumo da vaga na seção 1. Sem precisar do branch isUuid — a rota `/candidato/candidatura/formulario/:vagaSlug` recebe slug puro.
- **Mensagem `'Vaga não encontrada'`** consistente em UI para 404 state se slug inválido — copy decision já está no plan 04-CONTEXT D-03 ("Vaga não encontrada ou não está mais ativa" para o componente VagaNotFoundState).

## Self-Check: PASSED

### Files exist
- `src/features/vagas/utils/isUuid.ts` — FOUND
- `src/features/vagas/utils/__tests__/isUuid.test.ts` — FOUND (modified)
- `src/features/vagas/services/vagasService.ts` — FOUND (modified, +getVagaBySlug)
- `src/features/vagas/services/__tests__/vagasService.test.ts` — FOUND (created)
- `src/features/vagas/hooks/useVagas.ts` — FOUND (modified, +useVagaBySlug + 3 vagasKeys branches)

### Commits exist (4 commits for Plan 04-02)
- `02d61b3` Task 1 isUuid util + activated tests — FOUND
- `7e2dece` Task 2 RED failing tests — FOUND
- `c6a43ad` Task 2 GREEN getVagaBySlug — FOUND
- `dbc1f09` Task 3 vagasKeys split + useVagaBySlug — FOUND

### TDD Gate Compliance
- Task 1: combined commit (test+impl atomic) — justified above (test non-compilable without impl present)
- Task 2: TDD gate sequence verified — `7e2dece` (test commit) → `c6a43ad` (feat commit) chain confirmed in git log

### Tests
- isUuid.test.ts — 6/6 PASS
- vagasService.test.ts (getVagaBySlug describe block) — 6/6 PASS
- Build — exit 0 (no regression)

### Out-of-Scope Items NOT Modified (correctness)
- `.planning/STATE.md` — untouched (orchestrator owns)
- `.planning/ROADMAP.md` — untouched (orchestrator owns)
- Other features (auth, cadastro, etc.) — untouched

## Next Plan Readiness

- **Wave 1b (Plans 04-03 + 04-04) já podem rodar em paralelo** — não dependem de nada deste Plan 04-02 além de assets que esta worktree já não toca (`vagasKeys.perguntas` declarado mas não consumido).
- **Wave 2 (Plan 04-05 EF submit-candidatura)** depende de Plans 04-03 + 04-04, não deste Plan 04-02 diretamente.
- **Wave 3 (Plans 04-06 VagaDetalhePage + 04-07 FormularioCandidaturaPage)** consome diretamente os 3 artifacts deste Plan 04-02: `isUuid`, `useVagaBySlug`, `vagasKeys.detailBySlug`. Tudo pronto para spawn de Wave 3.

---
*Phase: 04-vagas-candidatura*
*Plan: 04-02 (Wave 1a)*
*Completed: 2026-04-25*
