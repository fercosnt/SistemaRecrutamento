# Phase 7: Configuração de Vaga & Tags - Research

**Researched:** 2026-06-07
**Domain:** Supabase (Postgres jsonb↔relational sync, RLS, PL/pgSQL RPC) + React 18 feature scaffold (TanStack Query v5, RHF+Zod, shadcn/ui Glass)
**Confidence:** HIGH (schema/RLS/migration mechanics grounded on LIVE DB + shipped migrations; UI grounded on UI-SPEC + legacy page; numeric template defaults are ASSUMED starter values per D-09)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Híbrido — nova feature `src/features/config-vaga/` (components/hooks/services/schemas) **reusando a casca visual Glass/Tabs** da `CriarEditarVagaPage` legada. O save legado é stub → em persistência o terreno é greenfield.
- **D-02:** Escopo = só os 3 blocos M2 novos (TemplateSelector + PesosSliders + TagWizard). Abas legadas Básicas/Landing/Perguntas/IA ficam visualmente como estão. A persistência *dos campos novos* (`testes_aplicaveis`, `pesos_avaliacao`, metadata de tags) tem que ser ligada de verdade, **sem reescrever os campos legados**.
- **D-03:** "Publicar vaga" reusa a transição `status_vaga` rascunho→ativa existente, gateada pelas validações M2 (D-12). Sem estado de publicação novo.
- **D-04:** Templates de cargo = TS config module em git (`features/config-vaga/templates/cargoTemplates.ts` — naming a confirmar). 8 cargos. RH não edita templates no V1 — escolhe um e faz override *na vaga*. Ao selecionar template a UI **copia** os defaults para `vaga.testes_aplicaveis` + `vaga.pesos_avaliacao`. **Sem tabela `vaga_templates` e sem sync pipeline no V1.**
- **D-05:** Banco SJT (perguntas+opções por cargo) defere pra Phase 11. Phase 7 só precisa que o template referencie *quais* testes aplicam.
- **D-06:** Colunas novas em `vagas` nesta fase: **só `testes_aplicaveis jsonb` + `pesos_avaliacao jsonb`.** `qualificacao_etapa1 jsonb` é Phase 8. Shape de `testes_aplicaveis` segue RF-11.
- **D-07:** Chaves que somam 100% = 4 etapas pontuadas: `triagem`, `work_sample_sjt`, `redacao_cultural`, `entrevista`. Fora da soma, como contexto: `big_five` e `cognitivo`.
- **D-08:** UX do slider = sliders livres + erro inline (sem auto-rebalance). Indicador ao vivo "Soma: X% (faltam Y%)" + bloqueia Publicar se ≠100. Botão opcional "normalizar p/ 100" permitido; nunca rebalance silencioso.
- **D-09:** Pesos default por template = starter defaults razoáveis, calibrados em UAT. Planner/Fernando escolhe os números; não trava a fase.
- **D-10:** Path 1 — tabela relacional `pergunta_opcao_metadata` + `opcao_id` estável (uuid) DENTRO do `opcoes_resposta` jsonb. Custo aceito: manter jsonb↔tabela em sync na escrita. **Path 2 (tags embutidas no jsonb) rejeitado.**
- **D-11:** Taxonomia (alinhada PRD §8.2): 5 tags `knockout/atencao/neutro/pontua/fortemente_pontua` (enum `enum_tag_opcao`) + `peso int` (range -999..100, default 0) + `nota_ia text nullable`. Opção não-marcada = `neutro` + peso 0 + nota_ia null. Bulk-mark "tudo informativa". Tag wizard só renderiza pra `single_choice`/`multiple_choice`.
- **D-12:** Gate de publicação (rascunho→ativa) valida: (1) `pesos_avaliacao` soma=100%; (2) ≥1 teste em `testes_aplicaveis` com `obrigatorio=true`; (3) toda pergunta com opção `tag=knockout` deve estar `obrigatoria=true`. Rascunho não valida nada.

### Claude's Discretion
- Naming exato: TS config module (`cargoTemplates.ts`), colunas jsonb, enum `enum_tag_opcao`, tabela `pergunta_opcao_metadata` (convenção pt-BR snake_case).
- Shape interno exato dos jsonb `testes_aplicaveis` e `pesos_avaliacao` (seguindo RF-11 + D-07).
- Números concretos dos pesos default por cargo (D-09 — starter, calibrado em UAT).
- Mecânica fina do sync jsonb↔`pergunta_opcao_metadata` na escrita (RPC SECURITY DEFINER ou EF se a atomicidade exigir).
- Índices em `pergunta_opcao_metadata` (provável `pergunta_id` + parcial `WHERE tag='knockout'`).

### Deferred Ideas (OUT OF SCOPE)
- Banco de perguntas SJT por cargo (conteúdo + `sync-sjt.ts` git→DB) — Phase 11.
- Knockouts padrão + auto-rejeição auditável — Phase 8 (RF-02/RF-03). Phase 7 entrega só o mecanismo de tags.
- `vaga.qualificacao_etapa1` — Phase 8 (RF-01a).
- Tabela `vaga_templates` editável + UI de edição de template — não no V1.
- Calibração dos pesos default por cargo — UAT Phase 1.
- Reescrita completa da tela (Básicas/Landing/Perguntas/IA como feature coesa) — candidato a Phase 16.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **VAGACFG-01** (RF-33) | Templates de vaga pelos 8 cargos reais com `testes_aplicaveis` + pesos default; RH escolhe no create, override depois. | §Standard Stack (TS config module pattern), §Code Examples (`cargoTemplates.ts` shape + the 8 cargos), §Architecture Patterns (TemplateVagaSelector copies-into-vaga). Banco SJT *content* explicitly deferred to F11 (D-05) — VAGACFG-01 here = the **template→vaga copy mechanism**, not the SJT bank. |
| **VAGACFG-02** (RF-34) | `vaga.pesos_avaliacao` jsonb via sliders, validação soma=100% com erro inline. | §Code Examples (PesosSliders live-sum + Zod `.refine(sum===100)`), §Architecture (4-key shape from D-07), §Pitfalls (float rounding on slider sum). |
| **VAGACFG-03** (RF-35, RF-36) | Wizard de tags em opções (5 tags + peso + nota_ia), bulk-mark "tudo informativa", validação progressiva só no Publicar. | §Architecture (jsonb↔metadata sync RPC), §Standard Stack (`pergunta_opcao_metadata` schema), §Code Examples (`upsert_pergunta_opcoes_metadata` RPC + opcao_id backfill), §Pitfalls (jsonb-without-id reality). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **pt-BR domain, en technical code.** Enums DB = snake_case pt-BR (`enum_tag_opcao`, `pergunta_opcao_metadata`).
- **`database.types.ts` é GERADO** (`npm run db:types`) — NUNCA editar à mão. Regenerar após as migrations (file lives at REPO ROOT `./database.types.ts`, NOT `src/types/` — verified).
- **Features:** `src/features/<dominio>/` com components/, hooks/, services/, schemas/, types/. Export nomeado (nunca default). Hooks `useCamelCase.ts`. Services `camelCaseService.ts` com classes de erro customizadas. Query keys hierárquicas.
- **Forms:** React Hook Form + Zod (schemas pt-BR, validação por step).
- **Security:** NUNCA `supabaseAdmin`/service_role no client. Operações privilegiadas → Edge Functions OU RPC SECURITY DEFINER. RLS habilitado em 100% das tabelas. Config de vaga é operação RH/admin (RLS por role).
- **Migration workaround (§Commands):** PL/pgSQL `CREATE FUNCTION`/`DO $$` + statements adjacentes (`COMMENT`/`REVOKE`/`GRANT`) falham via `supabase db push --linked` com SQLSTATE 42601 no transaction pooler. Workaround: SQL Editor manual → `supabase migration repair --status applied <version>` → confirmar `db push` up-to-date. Sem wrappers `BEGIN/COMMIT` (o driver CLI já envolve cada migration em transação).
- **Commits bloqueados pelo hook tsc (FOUND-08, baseline ~292-296 erros):** convenção = `git -c core.hooksPath=/dev/null`. Fernando commita no terminal dele.
- **Linguagem de produto:** "avaliação comportamental/cognitiva", nunca "teste psicológico". Sistema NUNCA rejeita por score (RNF-07a) — não há auto-rejeição nesta fase de qualquer modo.

---

## Summary

Phase 7 has two cleanly separable workstreams: **(A) schema + write-path** (2 new jsonb columns on `vagas`, 1 new enum `enum_tag_opcao`, 1 new relational table `pergunta_opcao_metadata`, plus the jsonb↔table sync mechanism) and **(B) a new frontend feature** `src/features/config-vaga/` that mirrors the established `src/features/vagas/` conventions and wires real persistence of the new fields into the legacy Glass+Tabs shell (whose save is a stub).

The single load-bearing landmine — verified LIVE against the production DB — is that `perguntas_formulario.opcoes_resposta` today is a **flat JSON array of plain strings** (`["Imediata","Em até 15 dias",...]`), with **no per-option id and no object structure**. The Phase 4 candidato form already depends on this exact shape: `candidaturaFormSchema.ts` casts `opcoes_resposta as string[]` and builds `z.enum(opts)` directly from the string values (lines 66, 80). D-10's requirement to give each option a stable `opcao_id` uuid *inside* the jsonb is therefore a **breaking change to a shipped consumer**. This dominates the design: the recommended approach migrates `string[]` → `[{id, texto}]` and **simultaneously updates the Phase-4 reader** in the same phase, OR (lower-risk-but-more-code) keeps the legacy `string[]` shape and stores `opcao_id` only in a parallel structure. The research recommends the migrate-and-update-reader path with a normalization helper, because keeping two parallel option representations is exactly the auditability mess D-10's Path 1 was chosen to avoid.

The sync atomicity question (D-10 discretion) resolves to a **single PL/pgSQL `SECURITY DEFINER` RPC** (`upsert_pergunta_opcoes_metadata`) that, per pergunta, (1) ensures every option in the jsonb has an `opcao_id`, (2) writes the jsonb back, and (3) replaces the `pergunta_opcao_metadata` rows for that pergunta — all in one transaction. This mirrors the *already shipped and UAT-passed* `submit_candidatura_atomic` RPC (a SECURITY DEFINER function that loops `jsonb_array_elements` and writes multiple tables atomically). An Edge Function is **not** needed: there is no cross-service orchestration, no secret beyond the DB, and the RPC pattern is the project's established idiom for atomic multi-table writes. RLS/role enforcement is the live-verified idiom `(select auth.jwt() #>> '{app_metadata,role}') IN ('rh','administrador')`.

**Primary recommendation:** Build the schema in one migration set (enum + 2 vagas columns + table + indexes + the sync RPC), applied via the D-22 SQL-Editor-manual + `migration repair` flow (the 42601 workaround WILL recur — this set has both PL/pgSQL `$$` and adjacent `COMMENT/GRANT`). Scaffold `src/features/config-vaga/` mirroring `features/vagas/` (custom error class, `configVagaKeys` hierarchy, RHF+Zod pt-BR, `cargoTemplates.ts` TS module). Persist the new vaga fields with a dedicated `configVagaService` (plain `vagas` UPDATE for the 2 jsonb columns; the sync RPC for tags) without touching the legacy stub save. Publish-gate (D-12) validation lives in **both** layers: client Zod `.refine` for instant UX + a server-side guard in the publish path.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cargo template defaults (8 cargos) | Frontend / Client (TS config in git) | — | D-04: templates are static, not RH-editable in V1; git is source of truth; UI copies into the vaga. No DB table. |
| Copy template → `vaga.{testes_aplicaveis,pesos_avaliacao}` | Frontend (RHF state) → API (vagas UPDATE) | DB (column defaults) | The vaga owns the copy; override is a plain column write. |
| Pesos slider sum=100% validation | Frontend (Zod `.refine` + live indicator) | API (publish-gate server guard) | Instant UX is client; defense-in-depth server check at publish (D-12). |
| Tag marking on options | Frontend (RHF form) → API (sync RPC) | DB (`pergunta_opcao_metadata` + jsonb opcao_id) | Atomic jsonb↔table write must be server-side transactional → SECURITY DEFINER RPC. |
| `opcao_id` generation + backfill | DB (RPC, `gen_random_uuid()`) | — | Stable ids must be generated and persisted server-side, not client-side, so downstream FKs (F8/F10) are authoritative. |
| Publish gate (rascunho→ativa) | Frontend (Zod) | API (vagas UPDATE status + server validation) | D-03/D-12: reuses existing status transition; validation gates the transition. |
| RH/admin authorization | DB (RLS on vagas + perguntas_formulario + pergunta_opcao_metadata + RPC GRANT) | — | RLS is 100% per CLAUDE.md; role read from JWT claim. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | already in tree (`^2.x`) | Anon client for `vagas` UPDATE + `.rpc()` calls | Project's only DB client; `supabase.rpc('fn', args)` is the call path for SECURITY DEFINER functions. |
| `@tanstack/react-query` | v5 (in tree, staleTime 5min/retry 2 per CLAUDE.md) | Server-state for vaga config + perguntas + mutations | Established pattern (`vagasKeys`, `useVagaPerguntas`). |
| `react-hook-form` | in tree | Form state for the 3 blocks | CLAUDE.md mandates RHF+Zod. |
| `zod` | in tree | pt-BR schemas; pesos `.refine(sum===100)`; tag-row schema | Established (`candidaturaFormSchema.ts`). |
| `@hookform/resolvers` | in tree (`zodResolver`) | Wire Zod → RHF | Used across auth/cadastro/vagas. Note Resolver v5 input/output cast caveat (STATE [03-05]). |
| shadcn/ui primitives | vendored under `src/components/ui/` | `Slider`, `Dialog`, `AlertDialog`, `Select`, `Tabs`, `RadioGroup`, `Badge`, `Form`, `Button`, `Switch`, `Tooltip`, `Sonner` | **All already vendored — verified `ls src/components/ui/`.** No registry fetch (UI-SPEC §Registry Safety). |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | in tree | Icons (project default) | Block headers, tag badges, slider affordances. |
| `sonner` | in tree (deduped per STATE [02-06]) | Toasts (publish success/error) | Reuse the deduped instance; do NOT re-alias (Sonner split-instance bug). |
| custom `Glass` (`src/components/ui/glass.tsx`) | in tree | Card surfaces on dark `#00109E` bg | UI-SPEC mandates `Glass variant="white"` cards, white text. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SECURITY DEFINER RPC for tag sync | Edge Function (two-client pattern, D-23) | EF adds a deploy step + cold start + a second auth surface for **zero** cross-service benefit here. The write is pure DB. RPC is the established idiom for atomic multi-table writes (`submit_candidatura_atomic`). **Use RPC.** |
| SECURITY DEFINER RPC | Client-orchestrated multi-statement (UPDATE jsonb then DELETE+INSERT metadata) | Not atomic — a failed second statement leaves jsonb with ids but no metadata rows (or vice-versa). RLS would also need INSERT/DELETE policies on the metadata table exposed to anon. **Reject.** |
| `opcao_id` uuid inside jsonb (D-10 Path 1) | tags embedded in jsonb (D-10 Path 2) | Path 2 already rejected by D-10 — pushes jsonb-querying into every downstream EF and is not SQL-auditable. **Locked: Path 1.** |
| TS config module for templates | DB `vaga_templates` table | D-04 locked: TS config, no table in V1. |

**Installation:** No new packages. All dependencies already in `package.json`. (Package Legitimacy Audit therefore N/A — see below.)

**Version verification:** No new packages to verify. Existing stack confirmed present via `ls node_modules/@supabase/supabase-js` and CLAUDE.md §Tech declarations.

## Package Legitimacy Audit

**Not applicable.** Phase 7 installs **zero** new external packages — all required libraries (`@supabase/supabase-js`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `lucide-react`, `sonner`, vendored shadcn primitives) are already present in the project tree. No slopcheck/registry verification needed because no install occurs. If the planner discovers a new package is needed (not anticipated), run the Package Legitimacy Gate before adding it.

## Architecture Patterns

### System Architecture Diagram

```
RH user (desktop, role=rh|administrador)
        │
        ▼  (renders inside legacy CriarEditarVagaPage Glass+Tabs shell — D-01)
┌─────────────────────────────────────────────────────────────────┐
│  src/features/config-vaga/  (NEW)                                 │
│                                                                   │
│  ┌──────────────────┐  ┌───────────────┐  ┌────────────────────┐ │
│  │TemplateVagaSelector│ │ PesosSliders  │  │  Tag Wizard        │ │
│  │ reads cargoTemplates│ │ 4 sliders +   │  │ PerguntaWithTagsForm│ │
│  │ .ts (TS, git)      │ │ live sum +    │  │ + BulkMarkDialog   │ │
│  │ on select →copies  │ │ Zod refine    │  │ (single/multi only)│ │
│  └────────┬─────────┘  └──────┬────────┘  └─────────┬──────────┘ │
│           │ writes RHF form state (one form / vaga)              │
│           ▼                    ▼                     ▼            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ configVagaService (custom error class + TanStack mutations)│   │
│  └───────┬──────────────────────────┬────────────────────────┘  │
└──────────┼──────────────────────────┼───────────────────────────┘
           │ Salvar/Publicar:         │ Tag wizard save:
           │ supabase.from('vagas')   │ supabase.rpc(
           │  .update({testes_aplic., │   'upsert_pergunta_opcoes_metadata',
           │   pesos_avaliacao,       │   {pergunta_id, opcoes:[{id?,texto}],
           │   status})               │    metadata:[{opcao_id,tag,peso,nota_ia,ordem}]})
           ▼                          ▼
┌─────────────────────┐    ┌──────────────────────────────────────┐
│ TABLE vagas         │    │ RPC (SECURITY DEFINER, search_path='')│
│  +testes_aplicaveis │    │  1. ensure each opcao has opcao_id    │
│  +pesos_avaliacao   │    │  2. UPDATE perguntas_formulario       │
│  RLS: rh/admin write │    │     SET opcoes_resposta = <new jsonb> │
└─────────────────────┘    │  3. DELETE + INSERT                    │
                           │     pergunta_opcao_metadata rows      │
                           │  (one transaction)                    │
                           └──────────────┬───────────────────────┘
                                          ▼
                           ┌──────────────────────────────────────┐
                           │ TABLE pergunta_opcao_metadata (NEW)   │
                           │  (pergunta_id, opcao_id, tag, peso,   │
                           │   nota_ia, ordem)  RLS rh/admin       │
                           └──────────────┬───────────────────────┘
                                          ▼  consumed downstream by:
                  F8 knockout (reads tag='knockout' + opcao_id)
                  F10 score_match (reads tag/peso per matched answer)
                  F15 audit (reads tag history)
```

### Recommended Project Structure
```
src/features/config-vaga/                 # NEW — mirrors src/features/vagas/
├── components/
│   ├── TemplateVagaSelector.tsx          # 8 cargo cards; on-select copies defaults; AlertDialog on swap
│   ├── PesosSliders.tsx                  # 4 sliders + live "Soma:X%" + big_five/cognitivo context chips
│   ├── PerguntaWithTagsForm.tsx          # per-pergunta option rows (tag Select + peso input + nota_ia)
│   └── BulkMarkDialog.tsx                # "Marcar tudo como informativa"
├── hooks/
│   ├── useConfigVaga.ts                  # configVagaKeys + read/mutate vaga config
│   ├── usePerguntaOpcaoMetadata.ts       # read existing metadata per vaga/pergunta
│   └── index.ts
├── services/
│   └── configVagaService.ts              # ConfigVagaServiceError + updateVagaConfig + upsertOpcoesMetadata + publishVaga
├── schemas/
│   ├── pesosAvaliacaoSchema.ts           # Zod 4-key + .refine(sum===100)
│   ├── testesAplicaveisSchema.ts         # Zod list of {teste,obrigatorio,customizado,perguntas?}
│   └── tagOpcaoSchema.ts                 # Zod tag-row {tag, peso(-999..100), nota_ia?}
├── templates/
│   └── cargoTemplates.ts                 # 8 cargos → {testes_aplicaveis, pesos_avaliacao} defaults
└── types/
    └── configVagaTypes.ts                # TS types derived from Database['public'] + jsonb shapes
```

### Pattern 1: SECURITY DEFINER RPC for atomic jsonb↔table sync
**What:** A single PL/pgSQL function, called via `supabase.rpc(...)`, performs the whole tag-write transaction.
**When to use:** Any write that must keep `opcoes_resposta` jsonb and `pergunta_opcao_metadata` consistent (D-10).
**Example (the established idiom — verified shipped):** `submit_candidatura_atomic` (`20260425000003_submit_candidatura_rpc.sql`) is SECURITY DEFINER, `SET search_path=''`, loops `jsonb_array_elements`, writes 2 tables atomically, `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO ...`. **Mirror this exactly.** See §Code Examples for the Phase-7 RPC.

### Pattern 2: Feature scaffold mirroring `src/features/vagas/`
**What:** Service with a custom Error class (`code` union), TanStack `*Keys` hierarchy, RHF+Zod pt-BR schemas, named exports.
**When to use:** All of `config-vaga`.
**Example:** `VagasServiceError` (vagasService.ts:28-42) with `code: 'INVALID_INPUT'|'NETWORK_ERROR'|'DATABASE_ERROR'|'NOT_FOUND'|'UNAUTHORIZED'`; `vagasKeys` (useVagas.ts:38-60). Copy the shape, rename to `ConfigVagaServiceError` / `configVagaKeys`.

### Pattern 3: Defense-in-depth publish gate (client Zod + server guard)
**What:** D-12 validation runs client-side (Zod `.refine`, instant) AND server-side (the `vagas` UPDATE to `status='ativa'` is gated by a check).
**When to use:** The "Publicar vaga" action only (rascunho never validates).
**Where the server guard lives:** Cheapest correct option = a small `publish_vaga(vaga_id)` SECURITY DEFINER RPC that re-checks the 3 conditions before flipping `status`, so a malicious/buggy client can't activate an invalid vaga. (The plain client UPDATE path is fine for "Salvar rascunho" which writes `status='rascunho'` with no validation.) The plain UPDATE remains available for rascunho; the publish RPC is the only path that writes `status='ativa'`.

### Anti-Patterns to Avoid
- **Client-orchestrated jsonb+metadata write:** non-atomic; leaves inconsistent state on partial failure (see Alternatives). Always go through the RPC.
- **Generating `opcao_id` on the client:** ids must be server-authoritative so F8/F10 FKs are trustworthy. Generate in the RPC with `gen_random_uuid()`.
- **Editing `database.types.ts` by hand:** it is generated. Run `npm run db:types` after migrations.
- **Re-aliasing `sonner`:** reintroduces the split-instance toast bug (STATE [02-06]). Use the deduped instance.
- **Wrapping migrations in `BEGIN; ... COMMIT;`:** triggers SQLSTATE 42601 in the pooler (CLAUDE.md §Commands, STATE [04-01]).
- **Silent slider rebalance:** D-08 forbids it. Sliders stay where the user left them; only "Normalizar para 100%" touches values, on explicit click.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic jsonb+metadata write | Multi-step client transaction | SECURITY DEFINER RPC (`submit_candidatura_atomic` pattern) | Atomicity + RLS authorization in one place; established idiom. |
| Stable option ids | Client-side `crypto.randomUUID()` per option | `gen_random_uuid()` in RPC | Server-authoritative ids; survives reorder/edit; trustworthy FK source. |
| Role authorization | Manual `if (role !== 'rh')` in service | RLS policy `(select auth.jwt() #>> '{app_metadata,role}') IN ('rh','administrador')` | 100% RLS per CLAUDE.md; defense at the DB boundary. Live-verified idiom in `20260607000006`. |
| Template defaults storage | DB table + admin UI | `cargoTemplates.ts` TS module (D-04) | Static, deploy-time data; git is source of truth in V1. |
| Sum=100 validation UX | Manual onChange math + manual error string | Zod `.refine` + RHF `formState` + live computed sum | RHF/Zod is the project form stack; refine gives both the publish gate and the live hint source. |
| TypeScript DB types | Hand-written interfaces | `npm run db:types` → `./database.types.ts` | Generated; never edit by hand (CLAUDE.md). |

**Key insight:** Every "atomic write touching two representations of the same data" in this codebase already goes through a SECURITY DEFINER RPC. Re-inventing client orchestration here would be the single most likely source of data drift between the jsonb and the relational table — exactly the failure mode D-10's Path 1 chose the relational table to *avoid*.

## Runtime State Inventory

> This is primarily a greenfield-schema phase, but D-10 introduces a **backfill of existing data** (adding `opcao_id` to existing `opcoes_resposta` jsonb), so the inventory matters.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `perguntas_formulario.opcoes_resposta` LIVE = flat `string[]` (verified: `["Imediata","Em até 15 dias","Em até 30 dias","Mais de 30 dias"]`). NO per-option id today. Very low row count of choice questions currently (probe returned 2 rows, both the same "disponibilidade" question). | **Backfill:** transform `string[]` → `[{id:uuid, texto:string}]` for every `single_choice`/`multiple_choice` row. Handle BOTH legacy `string[]` and already-migrated `[{id,texto}]` (idempotent). Do this *inside the sync RPC on first write* per pergunta, OR as a one-shot backfill migration — recommend RPC-on-write (idempotent, lazy, no big-bang). |
| **Live service config** | None. No external service stores option ids/tags. The SJT git→DB pipeline (`sync-sjt.ts`) that *would* write `pergunta_opcao_metadata` is **Phase 11**, not now (D-05). | None this phase. Note for F11: `sync-sjt.ts` must use the same opcao_id contract. |
| **OS-registered state** | None. | None. |
| **Secrets/env vars** | None new. RPC uses `service_role` GRANT (server-side only); no new client secret. | None. |
| **Build artifacts** | `./database.types.ts` (generated) becomes stale after the migration adds the enum + table + columns. | `npm run db:types` after applying migrations; commit the regenerated file (Fernando, terminal). |
| **Shipped consumer dependency** | `src/features/vagas/schemas/candidaturaFormSchema.ts` (Phase 4 candidato form) reads `opcoes_resposta as string[]` and `z.enum(opts)` at lines 66, 80. Changing the jsonb shape **breaks this reader**. | If the migrate-shape path is chosen: update this reader to normalize `[{id,texto}]` → `string[]` (or read `.texto`) **in the same phase**, with a Phase-4 regression test. This is a REQUIRED task, not optional. |

## Common Pitfalls

### Pitfall 1: `opcoes_resposta` is `string[]`, not objects — and a shipped consumer depends on it
**What goes wrong:** D-10 says "give each option an id inside the jsonb." A naive migration rewrites the jsonb to `[{id,texto}]`. The Phase-4 candidato form (`candidaturaFormSchema.ts:66,80`) then receives objects where it expects strings → `z.enum([{...}])` produces garbage and the candidato can't submit.
**Why it happens:** The legacy shape predates M2; no per-option id was ever needed for a write-once candidato form.
**How to avoid:** Treat "migrate jsonb shape" and "update the Phase-4 reader" as a single inseparable unit. Add a normalization helper (`opcoesToStrings(jsonb): string[]` and `opcoesToObjects(jsonb): {id,texto}[]`) used by both readers. Write a Phase-4 regression test (the candidato form still builds the right enum) as a verification step. The sync RPC must accept input in *either* shape and emit the object shape.
**Warning signs:** Candidato form choice questions render empty/broken; `z.enum` throws on non-string members.

### Pitfall 2: SQLSTATE 42601 on `supabase db push` (WILL recur)
**What goes wrong:** This migration set has a PL/pgSQL `$$` body (the sync RPC) AND adjacent `COMMENT`/`REVOKE`/`GRANT` — the exact combination that breaks the prepared-statement parser in the transaction pooler.
**Why it happens:** The CLI driver wraps each migration in an implicit transaction; an outer transaction + multi-statement DDL trips the parser (CLAUDE.md §Commands; STATE [04-01], [06]).
**How to avoid:** Apply via the D-22 workaround — paste the SQL into the Supabase SQL Editor, run manually, then `supabase migration repair --status applied <version>`, then confirm `supabase db push --linked` says up-to-date. **No `BEGIN/COMMIT` wrappers** in the file. Per project memory, Phase 6 actually applied via Supabase MCP `execute_sql` (which bypasses 42601 and reconciles by writing version rows). Either path is acceptable; **the plan must mark every PL/pgSQL migration as a human-action / MCP checkpoint, not an autonomous `db push`.**
**Warning signs:** `ERROR: cannot insert multiple commands into a prepared statement (SQLSTATE 42601)`.

### Pitfall 3: RLS role idiom drift — `'admin'` vs `'administrador'`, `->>'role'` vs `#>> '{...}'`
**What goes wrong:** Copying the stale PRD §8.3 template uses `'admin'` (wrong; live is `'administrador'`) and/or `auth_user_id` (wrong; live is `user_id`). A verbatim copy silently matches nothing and breaks every read/write.
**Why it happens:** PRD predates the live cutover; CONTEXT itself describes the claim as `auth.jwt()->'app_metadata'->>'role'` but the **shipped, live-verified** idiom is `(select auth.jwt() #>> '{app_metadata,role}')`.
**How to avoid:** Use the EXACT shipped idiom from `20260607000006_rls_policies_m2_backbone.sql`:
```sql
(select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
```
Both forms are semantically equivalent JSON path extraction, but match the shipped one for consistency and to avoid review churn. The claim is set by `custom_access_token_hook` (`20260420000002`) at `{app_metadata,role}` with values `candidato`/`rh`/`administrador`.
**Warning signs:** RH user sees zero rows / gets permission denied despite correct role; policy that "should" match returns nothing.

### Pitfall 4: Float rounding makes the slider sum "look" 100 but fail `=== 100`
**What goes wrong:** Four sliders at 33.33/33.33/16.67/16.67 sum to 100.00000001 or 99.99999999; `sum === 100` is false; Publicar blocked with a confusing "faltam 0%".
**Why it happens:** IEEE-754 float arithmetic.
**How to avoid:** Constrain sliders to integer steps (`step={1}`, store integers) and validate `sum === 100` on integers — no floats in `pesos_avaliacao`. Zod: `z.number().int().min(0).max(100)` per key + `.refine(o => o.triagem+o.work_sample_sjt+o.redacao_cultural+o.entrevista === 100, 'A soma deve ser 100%')`. The "Normalizar para 100%" helper distributes the remainder to keep integers.
**Warning signs:** Publicar blocked when the displayed sum reads "100%".

### Pitfall 5: `status_vaga` has 4 values, not 3
**What goes wrong:** CONTEXT D-03 says enum = `ativa | inativa | rascunho`. **Live enum is `rascunho | ativa | inativa | arquivada`** (verified `database.types.ts:3048`). Code/UI that assumes only 3 values may mishandle `arquivada`.
**Why it happens:** CONTEXT summarized; the live enum gained `arquivada`.
**How to avoid:** Publish gate only transitions `rascunho → ativa`. Treat `arquivada`/`inativa` as out-of-scope states the publish action ignores. Type everything off `Database['public']['Enums']['status_vaga']`, not a hand-written union.
**Warning signs:** TS exhaustiveness errors on `status_vaga` switches; a vaga in `arquivada` showing a Publicar CTA.

### Pitfall 6: `resposta_opcoes` stores answer values (strings), not opcao_ids
**What goes wrong:** F8 (knockout) and F10 (score) need to map a candidate's chosen answer to a tagged option. Today `respostas_formulario.resposta_opcoes` stores the chosen *string value(s)*, not opcao_ids. If F8/F10 assume they can join on `opcao_id`, the join is empty.
**Why it happens:** The candidato form writes the selected string, with no knowledge of opcao_id (it never had one).
**How to avoid (scope note):** This is a **Phase 8/10 concern**, but Phase 7's schema must make it *possible*. Two viable contracts: (a) downstream matches `resposta_opcoes` string ↔ `pergunta_opcao_metadata` via the option `texto` (requires storing `opcao_texto` alongside `opcao_id` in the metadata table — recommend storing **both** `opcao_id` AND `opcao_texto`), or (b) Phase 8 updates the candidato form to write opcao_ids. **Recommendation: store `opcao_texto` in `pergunta_opcao_metadata` too** (cheap, makes F8/F10 join-able by text without breaking the Phase-4 writer). This also matches the PRD §8.2 design which used `opcao_texto`.
**Warning signs:** (Surfaces in F8/F10, not F7.) Document the chosen contract in the SUMMARY so F8 doesn't re-discover it.

## Code Examples

### `pergunta_opcao_metadata` table + enum + indexes (migration)
```sql
-- Source: synthesizes PRD §8.2 schema + D-10/D-11 (opcao_id added) + live idioms
-- NO BEGIN/COMMIT wrapper (CLAUDE.md §Commands / D-22). Apply via SQL Editor + migration repair.

CREATE TYPE public.enum_tag_opcao AS ENUM (
  'knockout', 'atencao', 'neutro', 'pontua', 'fortemente_pontua'
);

CREATE TABLE public.pergunta_opcao_metadata (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id  uuid NOT NULL REFERENCES public.perguntas_formulario(id) ON DELETE CASCADE,
  opcao_id     uuid NOT NULL,                       -- mirrors the id stored inside opcoes_resposta jsonb
  opcao_texto  text NOT NULL,                       -- denormalized for F8/F10 join-by-text (Pitfall 6)
  tag          public.enum_tag_opcao NOT NULL DEFAULT 'neutro',
  peso         int  NOT NULL DEFAULT 0 CHECK (peso BETWEEN -999 AND 100),
  nota_ia      text,
  ordem        int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pergunta_id, opcao_id)
);

-- Index strategy (D-10 discretion):
CREATE INDEX idx_pom_pergunta ON public.pergunta_opcao_metadata (pergunta_id);
-- Partial index for F8 knockout sweep (the hot downstream read):
CREATE INDEX idx_pom_knockout ON public.pergunta_opcao_metadata (pergunta_id)
  WHERE tag = 'knockout';

ALTER TABLE public.pergunta_opcao_metadata ENABLE ROW LEVEL SECURITY;

-- RH/admin full access (config is an RH operation) — live-verified idiom:
CREATE POLICY rh_gerencia_opcao_metadata ON public.pergunta_opcao_metadata
  FOR ALL
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'))
  WITH CHECK ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));

-- (If F10 needs candidato-side reads later, add a SELECT policy in that phase. F7 = RH only.)
```

### New columns on `vagas` (migration)
```sql
-- Source: D-06 (only these 2 columns) + RF-11 (testes_aplicaveis shape) + D-07 (4 weighted keys)
ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS testes_aplicaveis jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pesos_avaliacao  jsonb NOT NULL DEFAULT
    '{"triagem":0,"work_sample_sjt":0,"redacao_cultural":0,"entrevista":0}'::jsonb;

-- Optional soft CHECK (sum validation is enforced at publish, not at every draft write — D-12):
-- Do NOT add a CHECK forcing sum=100 on the column — drafts are allowed to be invalid (D-12).
```

**`testes_aplicaveis` jsonb shape (RF-11, recommended):**
```jsonc
[
  { "teste": "triagem",          "obrigatorio": true,  "customizado": false },
  { "teste": "work_sample_sjt",  "obrigatorio": true,  "customizado": false, "perguntas": [] },
  { "teste": "redacao_cultural", "obrigatorio": false, "customizado": false },
  { "teste": "big_five",         "obrigatorio": false, "customizado": false },
  { "teste": "cognitivo",        "obrigatorio": false, "customizado": false },
  { "teste": "entrevista",       "obrigatorio": true,  "customizado": false }
]
```
`perguntas?` is the optional pointer the F11 SJT bank will populate; F7 leaves it empty (D-05).

**`pesos_avaliacao` jsonb shape (D-07):**
```jsonc
{ "triagem": 30, "work_sample_sjt": 30, "redacao_cultural": 15, "entrevista": 25 }
// big_five and cognitivo are NOT keys here — they are context-only (D-07), rendered as read-only chips.
```

### Sync RPC — `upsert_pergunta_opcoes_metadata` (atomic jsonb↔table)
```sql
-- Source: mirrors submit_candidatura_atomic (20260425000003) SECURITY DEFINER + jsonb_array_elements idiom.
-- NO BEGIN/COMMIT wrapper. Apply via SQL Editor + migration repair (Pitfall 2).
CREATE OR REPLACE FUNCTION public.upsert_pergunta_opcoes_metadata(
  p_pergunta_id uuid,
  -- [{ "opcao_id": uuid|null, "texto": text, "tag": text, "peso": int, "nota_ia": text|null, "ordem": int }]
  p_opcoes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_opcao        jsonb;
  v_opcao_id     uuid;
  v_new_jsonb    jsonb := '[]'::jsonb;
  v_role         text;
BEGIN
  -- Authorization inside DEFINER fn (RLS does not apply to DEFINER body — must check explicitly):
  v_role := (auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Replace metadata for this pergunta (idempotent):
  DELETE FROM public.pergunta_opcao_metadata WHERE pergunta_id = p_pergunta_id;

  FOR v_opcao IN SELECT * FROM jsonb_array_elements(p_opcoes)
  LOOP
    -- ensure a stable opcao_id (generate if client sent null = new option / backfill):
    v_opcao_id := COALESCE(NULLIF(v_opcao->>'opcao_id','')::uuid, gen_random_uuid());

    -- accumulate the new opcoes_resposta jsonb in object shape [{id, texto}]:
    v_new_jsonb := v_new_jsonb || jsonb_build_object(
      'id',    v_opcao_id,
      'texto', v_opcao->>'texto'
    );

    INSERT INTO public.pergunta_opcao_metadata
      (pergunta_id, opcao_id, opcao_texto, tag, peso, nota_ia, ordem)
    VALUES (
      p_pergunta_id,
      v_opcao_id,
      v_opcao->>'texto',
      COALESCE(v_opcao->>'tag','neutro')::public.enum_tag_opcao,
      COALESCE((v_opcao->>'peso')::int, 0),
      v_opcao->>'nota_ia',
      COALESCE((v_opcao->>'ordem')::int, 0)
    );
  END LOOP;

  -- write the id-bearing jsonb back to the source of truth:
  UPDATE public.perguntas_formulario
     SET opcoes_resposta = v_new_jsonb, updated_at = now()
   WHERE id = p_pergunta_id;

  RETURN jsonb_build_object('pergunta_id', p_pergunta_id,
                            'opcoes_count', jsonb_array_length(v_new_jsonb));
END;
$$;

COMMENT ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) IS
  'Phase 7 / VAGACFG-03: atomic sync of opcoes_resposta jsonb (with stable opcao_id) and pergunta_opcao_metadata. Idempotent (DELETE+re-INSERT). RH/admin only (checked in body).';

REVOKE ALL ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) TO authenticated;
```
> **Authorization note:** SECURITY DEFINER bodies bypass RLS, so the role check is done explicitly in-body (the shipped `submit_candidatura_atomic` instead GRANTs only to `service_role` because it's called from an EF; this one is called directly from the authenticated client, so GRANT to `authenticated` + in-body role check is the correct pattern).

### Pesos Zod schema (client, integer-safe — Pitfall 4)
```typescript
// src/features/config-vaga/schemas/pesosAvaliacaoSchema.ts
import { z } from 'zod'
const peso = z.number().int().min(0).max(100)
export const pesosAvaliacaoSchema = z.object({
  triagem: peso,
  work_sample_sjt: peso,
  redacao_cultural: peso,
  entrevista: peso,
}).refine(
  (p) => p.triagem + p.work_sample_sjt + p.redacao_cultural + p.entrevista === 100,
  { message: 'Os pesos precisam somar 100%.' }
)
export type PesosAvaliacao = z.infer<typeof pesosAvaliacaoSchema>
// Live sum for the indicator (non-blocking hint) — compute outside refine:
export const somaPesos = (p: Partial<PesosAvaliacao>) =>
  (p.triagem ?? 0) + (p.work_sample_sjt ?? 0) + (p.redacao_cultural ?? 0) + (p.entrevista ?? 0)
```

### `cargoTemplates.ts` shape (8 cargos, D-04/D-09 starter defaults)
```typescript
// src/features/config-vaga/templates/cargoTemplates.ts
// [ASSUMED] numeric defaults — D-09 starter values, calibrated in UAT (PRD §10 Q8).
import type { PesosAvaliacao } from '../schemas/pesosAvaliacaoSchema'
import type { TesteAplicavel } from '../schemas/testesAplicaveisSchema'

export type CargoSlug =
  | 'dentista' | 'recepcionista' | 'consultor_vendas_premium' | 'sdr_social_seller'
  | 'assistente_financeiro' | 'asb' | 'tsb' | 'vaga_generica'

export interface CargoTemplate {
  slug: CargoSlug
  label: string                       // pt-BR display
  pesos_avaliacao: PesosAvaliacao     // sums to 100
  testes_aplicaveis: TesteAplicavel[]
}

export const cargoTemplates: Record<CargoSlug, CargoTemplate> = {
  dentista: { slug: 'dentista', label: 'Dentista',
    pesos_avaliacao: { triagem: 20, work_sample_sjt: 35, redacao_cultural: 15, entrevista: 30 },
    testes_aplicaveis: [
      { teste: 'triagem', obrigatorio: true, customizado: false },
      { teste: 'work_sample_sjt', obrigatorio: true, customizado: false, perguntas: [] },
      { teste: 'redacao_cultural', obrigatorio: true, customizado: false },
      { teste: 'big_five', obrigatorio: false, customizado: false },
      { teste: 'cognitivo', obrigatorio: false, customizado: false },
      { teste: 'entrevista', obrigatorio: true, customizado: false },
    ] },
  // ... recepcionista / consultor_vendas_premium / sdr_social_seller /
  //     assistente_financeiro / asb / tsb / vaga_generica
}
```
**[ASSUMED] per-cargo starter pesos (D-09 — planner/Fernando finalizes, UAT calibrates):**
| Cargo | triagem | work_sample_sjt | redacao_cultural | entrevista | Rationale (assumed) |
|-------|---------|-----------------|------------------|------------|---------------------|
| dentista | 20 | 35 | 15 | 30 | Clinical judgment (SJT) dominant; structured interview heavy. |
| recepcionista | 25 | 30 | 20 | 25 | Customer-facing; cultural fit + SJT balanced. |
| consultor_vendas_premium | 20 | 35 | 15 | 30 | Consultive-sell work sample heavy. |
| sdr_social_seller | 25 | 35 | 15 | 25 | Outbound work sample heavy. |
| assistente_financeiro | 30 | 30 | 15 | 25 | Screening/accuracy + in-basket SJT. |
| asb | 35 | 25 | 15 | 25 | More screening-driven (technical credentials). |
| tsb | 30 | 30 | 15 | 25 | Like ASB with clinical SJT weight. |
| vaga_generica | 30 | 25 | 20 | 25 | Neutral baseline. |

> All 8 must sum to 100 (Pitfall 4). These are **starter** numbers — the only real requirement is internal validity; UAT calibrates.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PRD §8.2 `pergunta_opcao_metadata(opcao_texto)` only | CONTEXT D-10: add stable `opcao_id uuid` (+ keep `opcao_texto` denormalized — this research) | Phase 7 discuss | Survives reorder/text-edit; F8/F10 get a stable FK target. |
| PRD §8.2 references table `perguntas` | Real table is `perguntas_formulario` | Pre-M2 (M1 schema) | FK targets `perguntas_formulario(id)`. PRD name is stale. |
| `etapa_processo` legacy 10-value enum | v2 8-value pipeline enum (Phase 6) | Phase 6 cutover | Not directly relevant to F7, but the v2 enum is now live. |
| `db push` for PL/pgSQL migrations | SQL Editor manual / Supabase MCP `execute_sql` + `migration repair` | Phase 4 (D-22) / Phase 6 | F7's RPC migrations MUST use this path (Pitfall 2). |

**Deprecated/outdated:**
- PRD §8.3 RLS template (`auth_user_id`, `'admin'`) — do NOT copy. Use live idiom (Pitfall 3).
- CONTEXT D-03 claim that `status_vaga` has 3 values — live has 4 (`+arquivada`, Pitfall 5).
- CONTEXT description of the JWT claim as `->'app_metadata'->>'role'` — shipped form is `#>> '{app_metadata,role}'` (equivalent, but match the shipped form).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Per-cargo starter pesos (the 8-row table) | Code Examples / cargoTemplates | LOW — explicitly starter values; D-09 defers to UAT. Wrong numbers → recalibrate, no rework. |
| A2 | `testes_aplicaveis` jsonb shape `{teste,obrigatorio,customizado,perguntas?}` | Code Examples | MEDIUM — F11 consumes `perguntas?`. If F11 needs a different key name, a follow-up migration adjusts existing rows. RF-11 text supports this shape. |
| A3 | Storing `opcao_texto` denormalized in `pergunta_opcao_metadata` solves F8/F10 join | Pitfall 6 | MEDIUM — F8/F10 are future phases; if they instead rewrite the candidato form to write opcao_ids, the denormalized column is harmless extra data. Cheap insurance. |
| A4 | Migrate-shape-and-update-Phase-4-reader is preferable to dual representation | Summary / Pitfall 1 | MEDIUM — if the planner prefers minimal blast radius, the alternative (keep `string[]`, store ids only in metadata keyed by texto) avoids touching Phase 4 but loses reorder-stability. Recommend confirming with Fernando. |
| A5 | A `publish_vaga` RPC is the right home for the server-side D-12 guard | Architecture Pattern 3 | LOW — alternative is a client-only gate (weaker) or a CHECK/trigger (heavier). Any of the three satisfies D-12; RPC is the cleanest. |
| A6 | Phase 6's actual apply path was Supabase MCP `execute_sql` (per project memory), and the same will work for F7 | Pitfall 2 | LOW — both MCP and SQL-Editor-manual are documented working paths; planner marks as human/MCP checkpoint either way. |

**Note:** A1, A2, A4 should be surfaced to the planner/discuss-phase. A1 is starter-by-design (no confirmation needed beyond UAT). A4 is the one genuine open design choice worth a one-line confirmation.

## Open Questions (RESOLVED)

1. **Shape-migration strategy (A4) — ✅ RESOLVED 2026-06-07 by CONTEXT D-13 (Fernando confirmed).**
   - What we knew: live `opcoes_resposta` is `string[]`; Phase-4 form depends on it; D-10 wants stable ids.
   - The fork: migrate jsonb to `[{id,texto}]` + update Phase-4 reader (recommended) vs. keep `string[]` + store ids only in metadata keyed by `opcao_texto`.
   - **RESOLVED → migrate.** D-13 locks: migrate to `[{id,texto}]` + update the shipped Phase-4 reader (`candidaturaFormSchema.ts`) in the same inseparable task + normalization helper + regression test + backfill. FK on `opcao_id`.

2. **Does F8/F10 join on `opcao_id` or on answer text? (A3) — ✅ RESOLVED 2026-06-07 by CONTEXT D-14 (Fernando confirmed).**
   - What we knew: `respostas_formulario.resposta_opcoes` stores answer *strings* today; future join key unclear.
   - **RESOLVED → store both.** D-14 locks: `pergunta_opcao_metadata` stores BOTH `opcao_id` AND `opcao_texto` (denormalized); the F8/F10 join contract (id primary, texto fallback/audit) is documented in the eventual SUMMARY.

3. **Exact column/enum/table naming (Claude's discretion) — ✅ RESOLVED (planner adopted the recommendation).**
   - Adopted (pt-BR snake_case, PRD-aligned): table `pergunta_opcao_metadata`, enum `enum_tag_opcao`, columns `vagas.testes_aplicaveis` + `vagas.pesos_avaliacao`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (linked) | All DB work | ✓ | project `isljnozzlvckrgjjbjwp` (linked, verified `supabase projects list`) | — |
| Supabase CLI | migrations + `db:types` | ✓ | present (dev dep) | SQL Editor manual (D-22) |
| Supabase MCP `execute_sql` | PL/pgSQL apply (Phase 6 path) | ⚠ (not exposed as a tool in this research session) | — | SQL Editor manual + `migration repair` (D-22) — fully documented & sufficient |
| `@supabase/supabase-js` | client RPC/UPDATE | ✓ | in `node_modules` | — |
| Vitest / Playwright | validation | ✓ | in tree (`npm run test:run`, `test:e2e`) | — |
| `npm run db:types` | regenerate types | ✓ | requires CLI | manual type-gen via CLI |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** Supabase MCP `execute_sql` was not callable in this session — the SQL-Editor-manual + `migration repair` path (CLAUDE.md D-22) is the documented, sufficient fallback and is what the plan should specify as the human-action checkpoint.

## Validation Architecture

> `workflow.nyquist_validation: true` (verified `.planning/config.json`) — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit) + Playwright (e2e) — both in tree |
| Config file | project root (vitest config + playwright config; existing) |
| Quick run command | `npm run test:run` (Vitest single run) |
| Full suite command | `npm run test:run && npm run test:e2e` |
| Baseline note | tsc baseline ~292-296 pre-existing errors (FOUND-08); commits via `git -c core.hooksPath=/dev/null`. 1 pre-existing LoadingProgress Vitest failure carried since Phase 2 — not a regression. |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VAGACFG-01 | Selecting a cargo template copies its pesos+testes into the vaga form state | unit | `npm run test:run -- config-vaga/templates` | ❌ Wave 0 |
| VAGACFG-01 | All 8 `cargoTemplates` pesos sum to exactly 100 | unit | `npm run test:run -- cargoTemplates` | ❌ Wave 0 |
| VAGACFG-02 | `pesosAvaliacaoSchema.refine` rejects sum≠100, accepts sum=100 | unit | `npm run test:run -- pesosAvaliacaoSchema` | ❌ Wave 0 |
| VAGACFG-02 | Live "Soma: X%" indicator renders red when ≠100, accent when =100 | component (vitest+RTL) | `npm run test:run -- PesosSliders` | ❌ Wave 0 |
| VAGACFG-03 | `upsert_pergunta_opcoes_metadata` RPC: idempotent, generates opcao_id, writes both jsonb + table | integration (live RPC smoke) | manual SQL smoke in runbook | ❌ Wave 0 |
| VAGACFG-03 | Bulk-mark sets all options to neutro/0/null | unit + component | `npm run test:run -- BulkMarkDialog` | ❌ Wave 0 |
| VAGACFG-03 | Tag wizard renders only for single/multiple_choice; empty-state otherwise | component | `npm run test:run -- PerguntaWithTagsForm` | ❌ Wave 0 |
| D-12 | Publish gate blocks when (sum≠100) OR (no obrigatorio test) OR (knockout pergunta not obrigatoria) | unit (validation fn) + e2e | `npm run test:run -- publishGate` | ❌ Wave 0 |
| Pitfall 1 (regression) | Phase-4 candidato form still builds correct `z.enum` after jsonb shape change | unit (regression) | `npm run test:run -- candidaturaFormSchema` | ✅ exists (extend) |
| Pitfall 2 | Migration applies via D-22 path; `db push` up-to-date | manual checkpoint | runbook §smoke | ❌ Wave 0 |
| RLS | RH/admin can write metadata; candidato/anon cannot | integration (RLS smoke) | SQL smoke in runbook | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:run -- <touched-module>` (quick).
- **Per wave merge:** `npm run test:run` (full Vitest) + `npm run build` (exit 0) + lint baseline ≤296.
- **Phase gate:** Full Vitest + Playwright green + live SQL smoke runbook (RPC idempotency, RLS deny for candidato, opcao_id generation, db push up-to-date) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/features/config-vaga/schemas/__tests__/pesosAvaliacaoSchema.test.ts` — VAGACFG-02 refine + integer guard (Pitfall 4)
- [ ] `src/features/config-vaga/templates/__tests__/cargoTemplates.test.ts` — VAGACFG-01 all 8 sum to 100 + copy semantics
- [ ] `src/features/config-vaga/components/__tests__/PesosSliders.test.tsx` — live-sum color states (no silent rebalance, D-08)
- [ ] `src/features/config-vaga/components/__tests__/PerguntaWithTagsForm.test.tsx` — choice-only render + empty state (D-11)
- [ ] `src/features/config-vaga/components/__tests__/BulkMarkDialog.test.tsx` — bulk neutro/0/null
- [ ] `src/features/config-vaga/services/__tests__/configVagaService.test.ts` — error mapping + RPC call shape (mock supabase)
- [ ] `src/features/config-vaga/__tests__/publishGate.test.ts` — D-12 three conditions
- [ ] Extend `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` — Pitfall 1 regression (objects→enum)
- [ ] SQL smoke runbook `.planning/phases/07-.../07-SQL-SMOKE-RUNBOOK.md` — RPC idempotency, opcao_id gen, RLS deny, db push up-to-date
- [ ] (Optional) Playwright e2e for the publish-gate happy/sad path (desktop RH)

*(Framework already present — no install needed.)*

## Security Domain

> `security_enforcement` absent in config → treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (auth handled upstream) | JWT via Supabase Auth (existing) |
| V3 Session Management | no | Supabase session (existing) |
| V4 Access Control | **yes** | RLS `(select auth.jwt() #>> '{app_metadata,role}') IN ('rh','administrador')` on `pergunta_opcao_metadata` + `vagas`; in-body role check inside the SECURITY DEFINER RPC (RLS doesn't apply to DEFINER bodies); `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated`. |
| V5 Input Validation | **yes** | Zod (client) for pesos/tags/testes; PL/pgSQL casts + CHECK (`peso BETWEEN -999 AND 100`) server-side. `tag` validated by enum type. |
| V6 Cryptography | no | none (no secrets/crypto in this phase) |

### Known Threat Patterns for Supabase + React config screen

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Candidato/anon calling the tag RPC to tamper config | Elevation of Privilege | In-body role check raises `42501`; GRANT only to `authenticated`; RLS on table denies non-RH. |
| Buggy/malicious client activating an invalid vaga (skipping D-12) | Tampering | Server-side `publish_vaga` RPC re-checks the 3 D-12 conditions before flipping `status='ativa'`. |
| Non-atomic write leaving jsonb/metadata inconsistent | Tampering / data integrity | Single transactional SECURITY DEFINER RPC (DELETE+re-INSERT + jsonb writeback). |
| IDOR — RH editing options of a pergunta from another vaga | Broken Access Control | RH/admin role is org-wide in this system (no per-vaga ownership in V1); RLS gates by role. If per-recruiter scoping is needed later (`vagas_associadas_recrutadores` exists), add an ownership clause. **Note for planner.** |
| `peso` overflow / negative abuse | Tampering | CHECK `peso BETWEEN -999 AND 100` + Zod `.int().min(-999).max(100)`. |
| SQL injection via jsonb text | Tampering | Parameterized RPC args + cast operators; never string-concatenate SQL. |

## Sources

### Primary (HIGH confidence)
- **LIVE Supabase DB** (project `isljnozzlvckrgjjbjwp`, anon probe): `perguntas_formulario.opcoes_resposta` shape = `string[]` (the load-bearing finding); `pergunta_opcao_metadata` confirmed ABSENT (PGRST205); `bias_audit_log` present (Phase 6 applied); `vagas` live sample.
- `database.types.ts` (repo root, generated): `vagas` columns (no testes/pesos/cargo today), `perguntas_formulario` columns, enums `status_vaga` (4 values), `tipo_resposta_pergunta` (`single_choice`/`multiple_choice` confirmed), `etapa_processo` v2, `respostas_formulario` shape.
- `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` — the SECURITY DEFINER atomic-write idiom to mirror.
- `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql` — live RLS role idiom + the explicit "do NOT copy stale PRD" warning.
- `supabase/migrations/20260420000002_unified_auth_role.sql` — JWT claim path `{app_metadata,role}` + values.
- `src/features/vagas/{services/vagasService.ts,hooks/useVagas.ts,hooks/useVagaPerguntas.ts,schemas/candidaturaFormSchema.ts}` — feature conventions to mirror + the Phase-4 `string[]` dependency (Pitfall 1).
- `src/components/pages/CriarEditarVagaPage.tsx:256-262` — stub save confirmed.
- `.planning/phases/07-.../07-CONTEXT.md` + `07-UI-SPEC.md` — locked decisions + UI contract.
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §6 (RF-11/33/34/35/36), §8.2 (schema), §8.5 (component tree).
- `docs/prds/m2-funil-rh/PRD-sjt-work-sample-odontologia.md` — 8-cargo taxonomy + 4/2/1/0 scoring (template defaults grounding).
- `CLAUDE.md` — conventions + §Commands D-22 workaround.

### Secondary (MEDIUM confidence)
- Project memory (`MEMORY.md`) — Phase 6 applied via Supabase MCP `execute_sql`; tsc hook commit block.
- `.planning/STATE.md` — D-22/D-23/D-24 locked decisions; lint baseline; Sonner dedupe.

### Tertiary (LOW confidence)
- Per-cargo starter pesos (A1) — engineering judgment from PRD cargo descriptions; UAT-calibrated, not authoritative.

## Metadata

**Confidence breakdown:**
- Schema/enum/table/RLS/RPC mechanics: HIGH — grounded on live DB + shipped migrations with identical idioms.
- jsonb-shape landmine + Phase-4 dependency: HIGH — verified live + in source.
- Migration apply path (42601 workaround): HIGH — documented in CLAUDE.md + STATE, confirmed recurring.
- Feature scaffold conventions: HIGH — directly mirroring shipped `features/vagas/`.
- Template numeric defaults: LOW (by design — D-09 starter values, UAT-calibrated).
- F8/F10 downstream join contract: MEDIUM — future phases; recommendation is cheap insurance.

**Research date:** 2026-06-07
**Valid until:** 2026-07-07 (stable — internal schema + project conventions; revisit if M2 schema or `opcoes_resposta` shape changes upstream)
