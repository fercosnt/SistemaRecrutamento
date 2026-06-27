# Phase 8: Inscrição & Knock-out (Etapa 1) - Research

**Researched:** 2026-06-07
**Domain:** Form LGPD-clean + per-cargo qualification + synchronous knockout auto-rejection inside an atomic Postgres RPC (Supabase + React/Vite/TS strict)
**Confidence:** HIGH (live schema confirmed via `database.types.ts` + Phase 6/7 migrations + PRD-MASTER §6/§8.2/§8.5 + the real-questions RAG doc)

> **Tooling note:** The Supabase MCP tools (`list_tables`, `execute_sql`) were NOT available in this research session (the server failed to resolve). The live schema was therefore confirmed against the **regenerated `database.types.ts`** (root, 2026-06-07 15:19 — post-Phase-7, source of truth per CLAUDE.md) plus the applied-and-reconciled Phase 6/7 migration files. Every schema claim below is `[VERIFIED: database.types.ts]` or `[VERIFIED: migration <file>]`. Where the planner can cheaply re-confirm against live PROD via MCP before locking a migration, it is flagged.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-03 [LOCKED]:** Candidate dedup/identity becomes **EMAIL** (already lowercase-normalized in M1). The duplicate-check RPC (SECURITY DEFINER) must use email as the uniqueness key — **not CPF**.
- **D-06 [LOCKED]:** Knockout = **an OPTION tagged `tag='knockout'` inside a qualification question**; the tag on the option decides the effect. One container only — no visually separate "knockout block". Matches Phase 7 (`pergunta_opcao_metadata` keyed by `opcao_id`).
- **D-15 [LOCKED]:** Rejection message is **NEUTRAL**, never exposes the criterion that fired the knockout. Single standard message. (LGPD Art. 20 detailed-explanation right is Phase 15 / DECISAO-04.)

### Claude's Discretion (delegated — researcher recommends, planner locks)
- D-01: where the inscrição form lives (`/cadastro` rework vs new `features/inscricao/`).
- Naming of new columns: `qualificacao_etapa1` (jsonb on `vagas`), `motivo_rejeicao` + `opcao_knockout_id` (on `candidaturas`), and the Etapa-1 marker in `perguntas_formulario`.
- Type of `motivo_rejeicao` (dedicated enum vs text) and the jsonb shape of `qualificacao_etapa1`.
- Parametrization of the "presencial SP" knockout (fixed text vs derived from vaga) — D-14.
- New indexes (likely `candidaturas(opcao_knockout_id)` partial, plus whatever score_match/filter queries need over `qualificacao_etapa1`).
- Whether `genero` also leaves the collection (with CPF) — D-02.
- Whether to keep the existing duplicate-check vs rewrite to email-only — D-03.

### Deferred Ideas (OUT OF SCOPE)
- LGPD Art. 20 detailed explanation + "request human review" + internal ticket — Phase 15 (DECISAO-04). Message stays neutral here (D-15).
- Monthly bias / selection-rate snapshot (4/5 EEOC) — Phase 15 (LGPD-03). Here we only guarantee age never enters a decision.
- Forbidden-string CI lint ("teste psicológico") — primarily LGPD-04 (Phase 9); may start here if trivial.
- score_match + RH panel + AI trigger — Phase 10 (TRIAGEM); this phase only FEEDS it.
- CPF legacy purge/anonymization policy (after nullable) — decided later, outside V1.
- Full `/cadastro` rework as a cohesive feature — if blast-radius is large, planner limits to minimal LGPD-clean and defers broad refactor to Phase 16.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INSCR-01 | Form de inscrição LGPD-clean (nome, email, telefone, CEP, LinkedIn, data nasc., disponibilidade início, pretensão, inglês, "como conheceu", Instagram por-cargo); sem CPF/foto/estado civil/saúde; Zod client+server | D-01 field→table map (below); most PII already in `candidatos`; per-vaga contextual fields → qualification questions; `.strict()` server schema (D-04) |
| INSCR-02 | Bloco de qualificação por template (máx 10 perguntas, ≤1 aberta); `vaga.qualificacao_etapa1` jsonb alimenta score_match + filtros | D-07 derived-jsonb confirmed by PRD RF-01a ("espelha padrão de `vaga.testes_aplicaveis`"); reuse `perguntas_formulario` + `respostas_formulario` + render path |
| INSCR-03 | Knock-out questions configuráveis (binárias/single_choice) com tag por opção; padrões: presencial SP (todos) + harmonização orofacial (dentista) | D-06 mechanism = Phase 7 `pergunta_opcao_metadata.tag='knockout'`; D-14 seed via `cargoTemplates.ts`; canonical question texts confirmed in `perguntas-vagas.md` |
| INSCR-04 | Auto-rejeição imediata (`status='rejeitado'`, `etapa='inscricao'`, `motivo='knockout_automatico'`, `opcao_knockout_id`) + mensagem + linha `auto_rejeitado=true` em `historico_candidatura` | D-10 knockout join inside `submit_candidatura_atomic`; D-13 explicit INSERT into `historico_candidatura` (trigger is UPDATE-only → no double-write) |
| LGPD-01 | Minimização PII Etapa 1; data nasc. coletada com monitoramento de viés; Zod rejeita campos proibidos | D-04 `.strict()` allowlist; D-05 age structurally excluded from any knockout/qualification/score logic |
</phase_requirements>

---

## Summary

Phase 8 is a thin, well-scoped layer on the M1 foundation, in the same spirit as Phases 6/7. The hard work — the option-tag mechanism (`pergunta_opcao_metadata`, `enum_tag_opcao` with `knockout`), the stable `opcao_id`, the per-cargo templates (`cargoTemplates.ts`), the atomic candidatura RPC (`submit_candidatura_atomic`), the audit table (`historico_candidatura`), and the 6-stage enum (`etapa_processo` including `inscricao`) — all already exist live. Phase 8 wires them together: (1) make the form LGPD-clean (drop CPF/genero from collection, switch dedup to email), (2) add a derived `vaga.qualificacao_etapa1` jsonb snapshot written at publish, (3) extend the atomic RPC to run a knockout sweep in the same transaction and set the rejection state + audit row synchronously, and (4) wire `feedback_rejeicao` display into the candidate dashboard.

The single biggest technical risk — and the central planning decision — is the **answer-key mismatch (Pitfall 6, inherited from Phase 4):** the candidate form today writes `respostas_formulario.resposta_opcoes` as an array of option **TEXT strings** (e.g. `["Não"]`), built via `opcoesToStrings` → `z.enum`. But `pergunta_opcao_metadata` is keyed primarily by `opcao_id` (uuid). The knockout join must therefore match on `opcao_texto` (the denormalized fallback key Phase 7 deliberately stored for exactly this), OR Phase 8 must upgrade the form/RPC to carry `opcao_id`. Both are viable; the texto-join is the smaller blast-radius and is what Phase 7's schema comment anticipates. This must be decided before the RPC is written.

The second confirmation worth flagging: **the `avancar_etapa()` trigger fires `BEFORE UPDATE OF etapa_atual` only — never on INSERT.** Since the knockout happens on the candidatura INSERT, there is **zero double-write risk** for the D-13 explicit history INSERT. No Phase 6 trigger adjustment is needed.

**Primary recommendation:** Build Phase 8 as a DB-first layer: one migration (new columns + extended RPC, applied via the D-22 MCP/SQL-Editor path), reusing the Phase 7 mechanism wholesale. Resolve the answer-key strategy (texto-join, recommended) up front. Keep the `/cadastro` change minimal (CPF/genero out of collection + email dedup), deferring a broad rework to Phase 16. Match the knockout on `opcao_texto` and write the rejection state + history row inside `submit_candidatura_atomic`. Seed default knockouts in `cargoTemplates.ts`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| LGPD-clean form validation (allowlist, forbidden-field reject) | API/Backend (EF Zod `.strict()`) | Browser (RHF+Zod mirror) | Defense in depth (D-04); server is authoritative, client is UX |
| Candidate dedup by email | Database (RPC SECURITY DEFINER) | — | Privileged check, never anon SELECT (CLAUDE.md) |
| Qualification questions render | Browser (dynamic form) | API (perguntas read) | Reuses `useVagaPerguntas` + `buildCandidaturaSchema` |
| `qualificacao_etapa1` snapshot write | Database (publish_vaga RPC extension) | — | Derived projection at publish — source of truth is relational |
| Knockout evaluation + auto-rejection | Database (`submit_candidatura_atomic` RPC, same txn) | — | Must be atomic + synchronous (INSCR-04 "imediata") |
| Knockout audit trail | Database (explicit INSERT in RPC) | — | INSERT-time event; trigger is UPDATE-only (D-13) |
| Rejection message display | Browser (dashboard/perfil pages) | API (candidaturas read) | `feedback_rejeicao` persisted server-side, rendered client (D-16) |
| Default knockout seeding | Browser/git (`cargoTemplates.ts` copy-into-vaga) | Database (perguntas + metadata via sync RPC) | Source of truth in git, vaga owns the copy (D-14, Phase 7 pattern) |

---

## Resolved [REC] Questions (the planning blockers)

### D-01 — field→table mapping (RESOLVED: minimal /cadastro change + per-vaga qualification)

**Live `candidatos` columns** `[VERIFIED: database.types.ts L324-356]`:
`nome_completo`, `email`, `celular` (= telefone), `cep` + full address, `data_nascimento` (NOT NULL), `linkedin`/`linkedin_url`, `instagram`/`instagram_url`, `como_conheceu`/`como_conheceu_detalhes`, `genero` (nullable), **`cpf` (NOT NULL)**.

| INSCR-01 field | Lives where today | Phase 8 action |
|----------------|-------------------|----------------|
| nome, email, telefone (`celular`), CEP, data nascimento, LinkedIn | `candidatos` (profile, M1 Phase 2) | Keep — already collected at `/cadastro` |
| "como conheceu" | `candidatos.como_conheceu` (enum in `candidatoSchema`) | Keep (profile-level) |
| Instagram (por-cargo) | `candidatos.instagram` exists, but PRD says "por cargo" | **Per-vaga** qualification question when the cargo wants it (e.g. SDR/Social Seller) — NOT a forced profile field |
| pretensão salarial | nowhere | **Per-vaga** qualification question (`perguntas_formulario`, Etapa-1) |
| disponibilidade início | nowhere (cadastro has a flexible `disponibilidade` sub-object but not "start date" per vaga) | **Per-vaga** qualification question |
| inglês (proficiência) | nowhere | **Per-vaga** qualification question (canonical text confirmed in `perguntas-vagas.md`) |

**Recommendation:** The "contextual per-vaga" fields (pretensão, disponibilidade início, inglês, Instagram-by-cargo) are naturally **qualification questions** in `perguntas_formulario` marked Etapa-1, NOT new `candidatos` columns. This means Phase 8 does **not** need a new "inscrição form" feature for those — they ride the existing dynamic-render path (`useVagaPerguntas` + `buildCandidaturaSchema` + `FormularioCandidaturaPage`). The ONLY `/cadastro` change required is **dropping CPF + genero from collection** and **switching dedup to email** (D-02/D-03). [CITED: PRD §8.5 — no dedicated `inscricao` feature folder exists in the frozen component tree, confirming this is discretion, not a designed module.]
**Hard constraint honored:** the final collected set = exactly INSCR-01 fields. The form already over-collects CPF/genero; Phase 8 removes them. `[ASSUMED — A1]` that no INSCR-01 field is currently *missing* beyond the three per-vaga ones (verify the cadastro multi-step covers nome/email/telefone/CEP/data-nasc/LinkedIn — it does per `candidatoSchema`).

### D-02 — CPF/genero legacy (RESOLVED: nullable + drop from collection/UI, do NOT drop column)

`candidatos.cpf` is `string` **NOT NULL** with a CHECK constraint `check_cpf_format` (XXX.XXX.XXX-XX) `[VERIFIED: database.types.ts L336 + supabase/functions/cadastrar-candidato/index.ts L162-163]`. `genero` is already nullable (`string | null`).

**CPF consumers** `[VERIFIED: grep src/]` — all confined to the cadastro write path:
- `src/features/cadastro/schemas/candidatoSchema.ts` (`cpfSchema`, required)
- `src/features/cadastro/components/steps/DadosPessoaisStep.tsx` (CPF input + duplicate UI)
- `src/features/cadastro/components/CadastroMultiStepForm.tsx` (setError dadosPessoais.cpf)
- `src/features/cadastro/services/cadastroService.ts` (sends cpf to EF)
- `supabase/functions/cadastrar-candidato/index.ts` (formats + inserts cpf; UNIQUE→CPF_EXISTS)
- `_shared/schemas.ts` `cadastroCandidatoSchema.cpf` (required, `validateCPF`)

**No read consumer** outside the cadastro flow (no RH panel, profile, or candidatura code reads `candidatos.cpf`). `authStore.ts` exposes `.cpf` on the candidato type but a comment flags it as removable in M2.

**Plan:** (1) migration: `ALTER TABLE candidatos ALTER COLUMN cpf DROP NOT NULL` + relax/drop `check_cpf_format` so NULL is allowed (the CHECK currently rejects empty — verify its exact predicate against live before applying; `[ASSUMED — A2]` it's `cpf ~ '^\d{3}...'` and will reject NULL unless `cpf IS NULL OR ...`). (2) Remove cpf field from `candidatoSchema`, `DadosPessoaisStep`, EF schema + insert. (3) Remove the CPF branch of the duplicate check. **genero:** same treatment — drop from collection (`dadosPessoaisSchema.genero` is currently a required `z.enum`); it is already nullable in DB so no migration needed, just stop collecting it. **Do NOT drop columns** (reversible; purge policy deferred).
**Note:** `cadastrar-candidato` EF stores cpf in `auth.users` user_metadata too (L180) and the `candidatos` row — both must stop sending it.

### D-03 — duplicate-check → email (RESOLVED: RPC already supports it; flip the client)

`check_candidato_duplicate(p_cpf, p_email)` `[VERIFIED: migration 20260420000003 + rate-limit migration 20260421000001]` already returns `{cpf_exists, email_exists, rate_limited}` and **already supports email-only** checks: passing `p_cpf=''` makes the CASE return `cpf_exists=false`. The email check is already `lower(email)=...` against `candidatos WHERE deleted_at IS NULL`.

**Recommendation:** **Do NOT rewrite the RPC.** The minimal change is client-side: the cadastro flow calls only `checkEmailDuplicate(email)` (already exists in `duplicateCheckService.ts`) and drops `checkCPFDuplicate`/the CPF branch of `checkBothDuplicates`. `useDuplicateCheck` is invoked twice in `DadosPessoaisStep` (cpf + email) — drop the cpf invocation. Optionally, in a later cleanup, add `cpf_exists` deprecation, but the RPC is forward-compatible as-is. This keeps the change small and reversible (CLAUDE.md "RPC SECURITY DEFINER, não anon SELECT" honored — unchanged).
Rate-limit (30/60s composite IP+uid) is preserved.

### D-07 — `qualificacao_etapa1` jsonb (RESOLVED: derived snapshot — PRD CONFIRMS, no contradiction)

PRD RF-01a `[CITED: PRD-MASTER §6.1 line 407]`: *"Schema novo `vaga.qualificacao_etapa1` jsonb (**espelha padrão de `vaga.testes_aplicaveis`**)"*. PRD §8.2 (Tabelas-chave) does **NOT** define a `qualificacao_etapa1` table — it is only ever a **`vagas` jsonb column** `[VERIFIED: PRD §8.2 L547-605 enumerates pergunta_opcao_metadata, analise_candidato_vaga, comparativo_solicitado, decisao_final — no qualificacao container]`.

`vaga.testes_aplicaveis` is itself a **projection** written at config time `[VERIFIED: migration 20260607010002]`. So D-07's "derived snapshot, source of truth = `perguntas_formulario` + `pergunta_opcao_metadata`" is **fully consistent with the PRD** — there is no "two-container source-of-truth" design in the PRD to contradict it. **No need to reopen with Fernando.**

**Recommended jsonb shape** (mirroring `testes_aplicaveis`'s `[{...}]` style):
```jsonc
// vaga.qualificacao_etapa1 — derived snapshot written by publish_vaga
[
  {
    "pergunta_id": "uuid",
    "texto_pergunta": "Qual o seu nível de proficiência em inglês?",
    "tipo_resposta": "single_choice",
    "obrigatoria": true,
    "ordem": 3,
    "tem_knockout": false,          // any option tagged knockout?
    "opcoes": [                      // scoring projection for F10 score_match
      { "opcao_id": "uuid", "texto": "Avançado", "tag": "pontua", "peso": 10 }
    ]
  }
]
```
Written at publish (extend `publish_vaga`), read by F10 (score_match) + RH-panel filters without re-deriving joins. `[ASSUMED — A3]` exact key names are discretion; the only hard requirement is it be a derivable projection.

### D-10 — knockout check inside `submit_candidatura_atomic` (RESOLVED: insertion point + answer-key strategy)

**Live RPC** `[VERIFIED: migration 20260425000003]` currently: INSERT candidatura with hardcoded `status='aguardando_resposta'`, `etapa_atual='triagem'`, then loop-INSERT `respostas_formulario`, then RETURN. It is `SECURITY DEFINER`, `GRANT EXECUTE TO service_role` only, called by the `submit-candidatura` EF.

**Insertion point (the new step 2.5, after respostas are written):**
1. Keep step 1 (INSERT candidatura) but **do not hardcode etapa='triagem'** — insert with `etapa_atual='inscricao'` initially (or compute below).
2. Keep step 2 (INSERT respostas_formulario).
3. **NEW:** sweep for a knockout. Join the just-written respostas against `pergunta_opcao_metadata WHERE tag='knockout'` for this vaga's perguntas.
4. If a knockout matched → UPDATE the candidatura row (same txn) to `status='rejeitado'`, `etapa_atual='inscricao'`, set `motivo_rejeicao='knockout_automatico'`, `opcao_knockout_id=<matched opcao_id>`, `feedback_rejeicao=<neutral message>`; INSERT the audit row (D-13).
5. Else (survivor) → UPDATE `etapa_atual='triagem'` (the F10/TRIAGEM-01 trigger contract).

**⚠️ Answer-key mismatch (the critical design call — Pitfall 6):** the form writes `resposta_opcoes` as **text strings** (e.g. `["Não"]`) `[VERIFIED: FormularioCandidaturaPage L284-311 — single_choice/multiple_choice → array of selected values, values are option TEXT from z.enum(opcoesToStrings(...))]`. `pergunta_opcao_metadata` carries BOTH `opcao_id` AND `opcao_texto` exactly so F8/F10 stay joinable `[VERIFIED: migration 20260607010001 L48-49 + comment L21-23]`.

Two strategies:
- **(A) Match on `opcao_texto`** (RECOMMENDED — smallest blast radius). The knockout sweep joins `pergunta_opcao_metadata.opcao_texto` against the text values in `respostas_formulario.resposta_opcoes`. No form change. `opcao_knockout_id` is still recorded (from the matched metadata row's `opcao_id`). Risk: text drift if an option's text is edited after candidaturas exist — acceptable for V1 (knockout questions are stable binary "Sim/Não"). Phase 7 explicitly stored `opcao_texto` as the "join-by-text fallback" for this.
- **(B) Upgrade the form to submit `opcao_id`** (cleaner long-term, larger change). Requires changing `opcoesToStrings`→an id-bearing path in `FormularioCandidaturaPage`, the EF schema, and the resposta shape — touches the shipped Phase-4 writer + its regression tests.

Recommendation: **(A) for V1.** Document the text-drift caveat. Re-confirm against live PROD (MCP `execute_sql`) what `resposta_opcoes` actually contains for any existing candidatura before locking the join predicate.

**F10 contract:** TRIAGEM-01 `[CITED: REQUIREMENTS.md L31]` = "Trigger no INSERT de candidatura (pós-knockout) … gera `analise_candidato_vaga` …". The Phase-10 AI trigger fires for survivors. The cleanest contract: **only survivors reach `etapa_atual='triagem'`**; knocked-out rows stay `etapa_atual='inscricao'` + `status='rejeitado'`. Phase 10's trigger should be written to fire only on rows landing in `triagem` (or to skip `status='rejeitado'`). Note: since the RPC does INSERT-then-UPDATE, a Phase-10 trigger on INSERT would see `inscricao` first; a trigger on the `etapa_atual→triagem` UPDATE (the `avancar_etapa` path) is the natural hook. Flag this for Phase 10 planning.

### D-13 — audit row + Phase 6 trigger interaction (RESOLVED: no double-write, no Phase 6 change)

`avancar_etapa()` fires **`BEFORE UPDATE OF etapa_atual`** `[VERIFIED: migration 20260607000005 L97 — `BEFORE UPDATE OF etapa_atual ON public.candidaturas`]`. It does **NOT** fire on INSERT. The knockout audit row is written on the candidatura INSERT path.

**Double-write analysis:**
- If the RPC writes the audit row via **explicit INSERT** (D-13) AND also does an `UPDATE candidaturas SET etapa_atual=...` that changes `etapa_atual`, the trigger WOULD fire and write a *second* history row.
- **Knockout case:** candidatura is INSERTed at `etapa_atual='inscricao'`, then UPDATEd to `status='rejeitado'` keeping `etapa_atual='inscricao'`. Since `etapa_atual` does NOT change, the trigger's first guard (`IF NEW.etapa_atual IS NOT DISTINCT FROM OLD.etapa_atual THEN RETURN NEW`) skips it `[VERIFIED: migration 20260607000005 L61-63]`. So the explicit D-13 INSERT is the ONLY history row. ✅ No double-write.
- **Survivor case:** INSERT at `inscricao`, then UPDATE `etapa_atual='triagem'` — the trigger fires and writes ONE history row (inscricao→triagem) automatically. So for survivors, you may NOT need an explicit history INSERT at all — let the trigger do it (set `etapa_justificativa` so it doesn't block; forward transition is allowed freely so a blank justificativa is fine for forward). This is cleaner: **survivor history comes free from the trigger; only the knockout needs the explicit INSERT with `auto_rejeitado=true`, `ator=NULL`.**

**No Phase 6 trigger adjustment required.** The trigger's `auto_rejeitado = (v_ator IS NULL)` logic and `ator=auth.uid()` (GUC-based, survives DEFINER) are already correct. Caveat: inside the RPC (service_role context), `auth.uid()` is NULL → survivor trigger rows would get `auto_rejeitado=true` even though it's a normal forward advance. This is a **semantic wrinkle**: a service-role-driven forward advance is logged as `auto_rejeitado=true`. Recommendation: for the survivor forward, write the explicit history INSERT in the RPC with `auto_rejeitado=false` and a `criterio_texto='inscrição concluída — encaminhado para triagem'`, AND avoid the `etapa_atual` change firing the trigger redundantly — OR accept the trigger row and ensure `auto_rejeitado` semantics are documented. **Flag for planner:** decide survivor-history ownership (explicit RPC INSERT vs trigger) to keep `auto_rejeitado` semantically honest. `[VERIFIED]` the mechanism; the choice is a design call.

### D-14 — presencial-SP parametrization (RESOLVED: fixed clinic-SP text, single-tenant)

The presencial-SP question is **identical across all 8 cargos** in the real forms: *"Você tem disponibilidade para trabalhar presencialmente em São Paulo, perto dos metros Brigadeiro e Paraíso?"* `[VERIFIED: docs/conhecimento/perguntas-vagas.md L37/294/773/1087/1494/1779 — same text every cargo]`. Beauty Smile is **single-tenant, single clinic** (REQUIREMENTS.md "Out of Scope: Multi-tenant"). Therefore the simplest correct parametrization is a **fixed clinic-SP text constant** seeded into every template, NOT derived from `vaga.cidade`/`modelo_trabalho`.

`vagas` does carry `cidade`, `estado`, `modelo_trabalho`, `endereco_completo` `[VERIFIED: database.types.ts L2273-2289]` — a future multi-location V2 could derive it, but for V1 a fixed text is correct and matches the source data. Harmonização orofacial question is dentista-only `[VERIFIED: perguntas-vagas.md L103, under "Etapa 2 - Dentista"]`.

**Seed path confirmed:** `src/features/config-vaga/templates/cargoTemplates.ts` `[VERIFIED: file exists, exports `cargoTemplates: Record<CargoSlug, CargoTemplate>` + `getCargoTemplateDefaults` deep-copy]`. Phase 8 extends `CargoTemplate` with a `qualificacao` field (questions + per-option tags), and the create-vaga flow copies them into `perguntas_formulario` + `pergunta_opcao_metadata` (via the existing `upsert_pergunta_opcoes_metadata` sync RPC) — same copy-into-vaga pattern Phase 7 uses for testes/pesos.

---

## Standard Stack

No new external packages are required. Phase 8 is entirely built on the existing, verified stack.

### Core (already installed — reused)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | 3 (esm.sh pin in EFs; project `zod` in src) | Server `.strict()` allowlist (D-04) + client mirror | Project convention; `.strict()` is the LGPD forbidden-field gate |
| `react-hook-form` + `@hookform/resolvers` | v5 resolvers | Form steps + dynamic schema | M1/Phase 4 pattern (`buildCandidaturaSchema`) |
| `@tanstack/react-query` | v5 | candidaturas/perguntas reads | CLAUDE.md staleTime 5min |
| `@supabase/supabase-js` | 2 | client + EF clients | anon client only on src; two-client in EF |
| PL/pgSQL | Postgres 15 (Supabase) | RPC extension + migration | D-22 apply path |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| texto-join knockout (A) | opcao_id-join (B) | (B) is cleaner but touches shipped Phase-4 form + EF + tests; (A) uses Phase 7's deliberate `opcao_texto` fallback. Use A for V1. |
| Extend `submit_candidatura_atomic` | New separate `evaluate_knockout` RPC called after submit | Separate RPC breaks atomicity/synchronicity (INSCR-04 "imediata, mesma transação"). Extend the existing RPC. |
| `motivo_rejeicao` as `text` | dedicated enum `motivo_rejeicao_candidatura` | enum is cleaner/auditable but adds a migration + future values (Phase 15 adds human-rejection motives). Recommend `text` for V1 with a documented value set, OR a small enum starting `{knockout_automatico}`. Planner's call. |

**Installation:** none.

## Package Legitimacy Audit

> Not applicable — Phase 8 installs **zero** new external packages. All capabilities are delivered via existing project dependencies (verified present in `package.json`) and new SQL/TS code. No slopcheck/registry verification required.

---

## Architecture Patterns

### System Architecture Diagram (the inscrição → knockout flow)

```
Candidate browser
   │  (1) /cadastro — LGPD-clean: nome,email,telefone,CEP,data_nasc,LinkedIn
   │       email dedup → check_candidato_duplicate(p_cpf='', p_email)   [D-03]
   │       NO cpf, NO genero collected                                  [D-02]
   ▼
   │  (2) /candidato/candidatura/formulario/:slug — qualification block
   │       perguntas (Etapa-1, bloco marker) rendered via useVagaPerguntas
   │       + buildCandidaturaSchema (single_choice knockout questions)
   │       RHF+Zod client validation
   ▼
submit-candidatura  Edge Function  (two-client; JWT verify ON)
   │  Zod .strict() allowlist — rejects cpf/foto/estado_civil/saude → 400  [D-04]
   │  auth.getUser() → IDOR cross-check → curriculo path check
   ▼
submit_candidatura_atomic  RPC  (SECURITY DEFINER, one transaction)
   │  1. INSERT candidaturas (etapa_atual='inscricao', status=aguardando)
   │  2. INSERT respostas_formulario (resposta_opcoes = option TEXT)
   │  3. KNOCKOUT SWEEP: join respostas ⋈ pergunta_opcao_metadata
   │       WHERE tag='knockout' (match on opcao_texto)                 [D-10/A]
   │     ┌─ matched ──────────────────────────────┐   ┌─ no match ──────────┐
   │     │ UPDATE status='rejeitado',             │   │ UPDATE etapa='triagem'│
   │     │   etapa='inscricao',                   │   │ (trigger writes hist  │
   │     │   motivo_rejeicao='knockout_automatico'│   │  inscricao→triagem)   │
   │     │   opcao_knockout_id, feedback_rejeicao │   │ → F10 AI trigger fires│
   │     │ INSERT historico_candidatura           │   └───────────────────────┘
   │     │   (auto_rejeitado=true, ator=NULL)     │           [D-13]
   │     └────────────────────────────────────────┘
   ▼
Candidate browser
   (4) inline result post-submit + /perfil shows feedback_rejeicao      [D-16]
```

### Recommended Project Structure
```
src/features/inscricao/            # NEW (thin) — OR fold into existing vagas/cadastro per D-01
  schemas/                          # inscricaoSubmitSchema (.strict() mirror) — optional
src/features/config-vaga/
  templates/cargoTemplates.ts       # EXTEND: add qualificacao + default knockouts (D-14)
src/features/cadastro/              # EDIT: drop cpf/genero collection, email-only dedup
supabase/migrations/
  2026XXXX_inscricao_knockout.sql   # candidaturas cols + vagas col + RPC extension (D-22 apply)
supabase/functions/_shared/schemas.ts   # EDIT: submitCandidaturaSchema → .strict() (D-04)
```

### Pattern 1: `.strict()` server allowlist (D-04, LGPD-01)
**What:** Zod `.strict()` makes the EF reject any unknown key → fail-closed on cpf/foto/estado_civil/saude.
**Example:**
```typescript
// supabase/functions/_shared/schemas.ts — extend submitCandidaturaSchema
export const submitCandidaturaSchema = z.object({
  candidato_id: z.string().uuid(),
  vaga_id: z.string().uuid(),
  curriculo_url: z.string().min(1),
  curriculo_nome: z.string().min(1),
  curriculo_size: z.number().int().positive().max(5_242_880),
  respostas: z.array(/* ... */).max(100).default([]),
}).strict()   // ← D-04: any extra key (cpf, foto, ...) → 400 VALIDATION
```
Note: the cadastro EF schema (`cadastroCandidatoSchema`) is the one that currently *accepts* cpf — that is where the allowlist matters for the form, not submitCandidaturaSchema (which never had cpf). Decide which surface the LGPD allowlist test asserts against.

### Pattern 2: Knockout sweep inside the atomic RPC (D-10, texto-join)
```sql
-- inside submit_candidatura_atomic, after respostas are inserted:
SELECT m.opcao_id, m.opcao_texto
  INTO v_ko_opcao_id, v_ko_texto
  FROM public.respostas_formulario r
  JOIN public.pergunta_opcao_metadata m ON m.pergunta_id = r.pergunta_id
 WHERE r.candidatura_id = v_candidatura_id
   AND m.tag = 'knockout'
   -- resposta_opcoes is a jsonb array of option TEXT strings (Phase 4 writer):
   AND r.resposta_opcoes @> to_jsonb(m.opcao_texto)   -- text containment
 LIMIT 1;

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
  UPDATE public.candidaturas
     SET etapa_atual = 'triagem'::public.etapa_processo
   WHERE id = v_candidatura_id;  -- trigger writes inscricao→triagem history
END IF;
```
`[ASSUMED — A4]` the `@>` text-containment predicate against `resposta_opcoes` jsonb — **verify the actual stored shape against live PROD** (it may be `["Não"]` or could include the `{outros:...}` object for permite_outros perguntas). Knockout questions are not permite_outros, so the simple array case holds. Recommend the planner re-confirm via MCP `execute_sql` against an existing candidatura before locking.

### Anti-Patterns to Avoid
- **Async knockout job** — INSCR-04 requires synchronous/same-transaction. Never a webhook/queue.
- **Hardcoding `etapa='triagem'` on INSERT then never reverting** — knocked-out rows must NOT reach triagem (F10 would analyze a rejected candidate).
- **Matching knockout on `opcao_id` while the form writes text** — silent never-fires (Phase 7 Pitfall 6). Either match on texto OR upgrade the writer; do not assume id.
- **Dropping the `cpf` column in V1** — D-02 says nullable only (reversible).
- **A second history row for knockout** — only the explicit RPC INSERT; the trigger is UPDATE-only and the knockout keeps `etapa_atual` unchanged so it won't fire.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic candidatura + respostas + knockout | New transaction orchestration in TS | Extend `submit_candidatura_atomic` RPC | Atomicity guaranteed in one txn; EF already wired |
| Option tag taxonomy / metadata | New table | `pergunta_opcao_metadata` + `enum_tag_opcao` (Phase 7) | Already live, indexed (partial idx on knockout) |
| Per-option stable id | Re-mint ids | `opcoes_resposta:[{id,texto}]` + `opcoesNormalize` | Phase 7 D-13 shipped this |
| Transition audit | Manual history writes everywhere | `historico_candidatura` + `avancar_etapa()` trigger | Trigger writes survivor history for free |
| Duplicate check | anon SELECT on candidatos | `check_candidato_duplicate` RPC (email mode) | SECURITY DEFINER, rate-limited, no PII leak |
| Default knockout questions | DB-only seed UI | `cargoTemplates.ts` copy-into-vaga | git source of truth, vaga owns override (D-14) |
| Publish gate (knockout-must-be-obrigatoria) | New validation | `publish_vaga` already enforces it (D-12 cond 3) | Already live — Phase 8 may extend with ≤10/≤1-aberta (D-09) |

**Key insight:** Phase 8 is ~90% wiring of existing live machinery. The genuinely new code is: 2 candidatura columns + 1 vagas column + the knockout branch in one RPC + the `.strict()` flip + the `feedback_rejeicao` display + the template seed. Resist building parallel structures.

## Runtime State Inventory

> Phase 8 has a refactor edge (CPF/genero removal + dedup key change), so this inventory applies.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `candidatos.cpf` populated for all existing M1 candidates (NOT NULL today). Making it nullable does NOT erase existing values. `auth.users` user_metadata also stores cpf (cadastrar EF L180). | Code edit (stop writing) + migration (drop NOT NULL). Existing data RETAINED (D-02 reversible). No data migration. |
| Live service config | n8n `nova-candidatura` webhook fires after candidatura commit (EF L289-309) with `{candidatura_id, vaga_id, candidato_id}`. Knocked-out candidaturas will ALSO fire it. | Verify n8n flow tolerates a knocked-out candidatura (or gate the webhook on survivor-only). Flag for planner — `[ASSUMED — A5]` webhook should still fire (RH may want the record) but confirm with Fernando. |
| OS-registered state | None — no OS-level registrations touch these strings. | None — verified by absence of scheduler/pm2 refs in repo. |
| Secrets/env vars | `N8N_NOVA_CANDIDATURA_URL` (EF env) — unchanged. No cpf/genero in env/secrets. | None. |
| Build artifacts | `database.types.ts` (root) is regenerated after every migration via `npm run db:types`. After Phase 8 migration it MUST be regenerated (new candidaturas/vagas columns). | Run `npm run db:types` post-apply (Phase 6/7 pattern). |

**The canonical question — after every repo file is updated, what runtime systems still hold the old shape?** The n8n webhook (will receive knocked-out candidaturas) and `database.types.ts` (must regenerate). Existing `candidatos.cpf` values persist by design.

## Common Pitfalls

### Pitfall 1: Knockout join keyed by opcao_id while the form writes text (Pitfall 6 inherited)
**What goes wrong:** Join `respostas ⋈ metadata ON opcao_id` returns zero rows → knockout NEVER fires → candidate who answered "Não" reaches triagem.
**Why:** `FormularioCandidaturaPage` builds `resposta_opcoes` from `z.enum(opcoesToStrings(...))` = option TEXT, not ids `[VERIFIED]`.
**Avoid:** Match on `opcao_texto` (D-10 strategy A), OR upgrade the writer to carry `opcao_id` (strategy B).
**Warning sign:** SQL smoke where a "Não" answer to a knockout question yields `status='aguardando_resposta'` instead of `'rejeitado'`.

### Pitfall 2: cpf CHECK constraint rejects NULL
**What goes wrong:** `ALTER COLUMN cpf DROP NOT NULL` succeeds but inserts with `cpf=NULL` fail because `check_cpf_format` doesn't allow NULL.
**Avoid:** Inspect the live CHECK predicate; if it's `cpf ~ '^...'` it rejects NULL — replace with `cpf IS NULL OR cpf ~ '^...'` or drop the CHECK. `[ASSUMED — A2]`, verify live.
**Warning sign:** cadastro EF returns 23514 (check_violation) after dropping cpf from the insert body if it still sends `cpf: null`.

### Pitfall 3: Double history row (false alarm — verified safe, but verify the survivor path)
**What goes wrong:** Worry that the RPC's explicit INSERT + the trigger both write history.
**Reality:** Knockout keeps `etapa_atual='inscricao'` (no change) → trigger's `IS NOT DISTINCT FROM` guard skips it → single row `[VERIFIED]`. Survivor's `etapa_atual→triagem` UPDATE fires the trigger once (intended).
**Avoid:** For survivors, decide whether the trigger row (with `auto_rejeitado=true` due to service_role NULL uid) is acceptable, or write an explicit `auto_rejeitado=false` row and avoid the trigger. **Plan must pick one** to keep `auto_rejeitado` honest.

### Pitfall 4: SQLSTATE 42601 on migration apply
**What goes wrong:** `supabase db push` fails on the `CREATE OR REPLACE FUNCTION ... $$...$$` + adjacent COMMENT/REVOKE/GRANT.
**Avoid:** D-22 path — apply via Supabase MCP `execute_sql` (or SQL Editor), then `migration repair --status applied <version>`, then `db push` shows "up to date". No outer BEGIN/COMMIT in the file. `[VERIFIED: CLAUDE.md §Commands + every Phase 6/7 migration header]`.

### Pitfall 5: F10 trigger analyzing a knocked-out candidate
**What goes wrong:** A Phase-10 AI trigger on candidatura INSERT sees the row at `etapa='inscricao'` then again at `triagem`, or analyzes a `rejeitado` row.
**Avoid:** Phase 10's trigger should hook the `etapa_atual→'triagem'` transition (the `avancar_etapa` path) or filter `status<>'rejeitado'`. Flag in the F10 contract note now.

### Pitfall 6: PRD vs D-15 message wording drift (minor)
**What:** PRD RF-03 quotes *"Infelizmente não atendemos os critérios desta vaga no momento"*; D-15 LOCKED example is *"Após análise dos requisitos da vaga, não seguiremos…"*. Both neutral.
**Avoid:** Both satisfy D-15 (neutral, no criterion exposed). Use the D-15 wording (it's the locked decision) but note the PRD variant exists. Not blocking.

## Code Examples

### LGPD-clean dedup (client) — email only (D-03)
```typescript
// src/features/cadastro/components/steps/DadosPessoaisStep.tsx (edited)
// DROP the cpf invocation; keep only:
const { isDuplicate: emailDuplicate, error: emailError } =
  useDuplicateCheck(email || '', { field: 'email' })
// checkEmailDuplicate already calls RPC with p_cpf='' (skips cpf check) [VERIFIED]
```

### candidaturas new columns (migration)
```sql
ALTER TABLE public.candidaturas
  ADD COLUMN IF NOT EXISTS motivo_rejeicao   text,        -- begins with 'knockout_automatico'
  ADD COLUMN IF NOT EXISTS opcao_knockout_id uuid;        -- logical FK → pergunta_opcao_metadata.opcao_id
CREATE INDEX IF NOT EXISTS idx_candidaturas_knockout
  ON public.candidaturas (opcao_knockout_id) WHERE opcao_knockout_id IS NOT NULL;

ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS qualificacao_etapa1 jsonb NOT NULL DEFAULT '[]'::jsonb;  -- D-07 derived snapshot
```
(Reuse `feedback_rejeicao` — already exists `[VERIFIED: database.types.ts L455]`.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CPF as identity/dedup key | Email (lowercase) | Phase 8 (D-03) | RPC already supports it; client flip only |
| 10-value legacy `etapa_processo` | 6-stage + 2 terminal enum (incl. `inscricao`) | Phase 6 | Knockout target enum already live |
| `opcoes_resposta: string[]` | `[{id,texto}]` + `opcao_id` | Phase 7 (D-13) | Stable join key exists; but form still WRITES text answers (Pitfall 1) |
| CPF/genero/foto collected | LGPD-clean minimization | Phase 8 (D-02/LGPD-01) | Drop from collection; columns retained nullable |

**Deprecated/outdated:** the CPF branch of the cadastro duplicate check; `dadosPessoaisSchema.cpf`/`.genero` as required fields.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Cadastro multi-step already collects all non-per-vaga INSCR-01 fields (nome/email/telefone/CEP/data-nasc/LinkedIn) | D-01 | A missing field would need a new collection point; low risk (`candidatoSchema` covers them) |
| A2 | `check_cpf_format` CHECK rejects NULL and must be relaxed | D-02 / Pitfall 2 | Insert failures after dropping cpf; verify predicate live before migration |
| A3 | `qualificacao_etapa1` exact jsonb key names are discretion | D-07 | None — shape is derivable; F10 reads it, design together |
| A4 | `resposta_opcoes` stored as `["<texto>"]` jsonb array for single_choice knockout questions | D-10 / Pitfall 1 | Wrong shape → join predicate wrong → knockout misfires; **verify live before locking RPC** |
| A5 | n8n `nova-candidatura` webhook should still fire for knocked-out candidaturas | Runtime Inventory | Spurious RH notification / wrong downstream; confirm with Fernando |
| A6 | Text-drift on `opcao_texto` is acceptable for V1 (binary Sim/Não knockouts are stable) | D-10 strategy A | If RH edits option text after candidaturas exist, historical joins drift; documented caveat |

## Open Questions

1. **Answer-key strategy (A texto-join vs B opcao_id upgrade)** — recommend A; needs explicit lock. What we know: form writes text, metadata has both keys. What's unclear: whether Fernando wants the cleaner B now. Recommendation: A for V1, document caveat A6.
2. **`motivo_rejeicao` type** — text vs enum. Recommendation: `text` (Phase 15 will add human-rejection motives; a premature enum churns). Planner decides.
3. **Survivor history ownership** — trigger row (with `auto_rejeitado=true` quirk under service_role) vs explicit RPC INSERT. Recommendation: explicit `auto_rejeitado=false` INSERT for honesty; flag.
4. **n8n webhook for knocked-out rows** — fire or suppress? Needs Fernando.
5. **D-09 publish gate extension** — `publish_vaga` already enforces "knockout option ⇒ pergunta obrigatoria" (D-12 cond 3 `[VERIFIED]`). Does Phase 8 also add ≤10-perguntas / ≤1-aberta to the gate? Recommendation: yes, extend `publish_vaga` (cheap, server-authoritative) — but confirm it should hard-block vs warn.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (PROD) | All DB work | ✓ (live, Phases 6/7 applied) | Postgres 15 | — |
| Supabase MCP `execute_sql` | D-22 migration apply + live verify | ✗ this session (server unavailable) | — | SQL Editor manual + `migration repair` (CLAUDE.md D-22) |
| Supabase CLI (`db push`, `db:types`) | reconcile + types regen | ✓ (used Phases 4/6/7) | — | — |
| Vitest | unit tests | ✓ | 4.0.7 | — |
| Playwright | E2E | ✓ | 1.56.1 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Supabase MCP was unavailable at research time — the planner/executor should use it for the migration apply + the live verification of A2/A4 if it returns; otherwise fall back to the documented SQL-Editor D-22 path.

## Validation Architecture

> nyquist_validation: **true** `[VERIFIED: .planning/config.json]` — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.7 (unit) + Playwright 1.56.1 (E2E) + @axe-core/playwright (a11y) |
| Config file | vitest config in repo; `npm run test` / `test:run` / `test:e2e` |
| Quick run command | `npm run test:run -- <path>` |
| Full suite command | `npm run test:run` (currently 395/395 green post-Phase-7) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LGPD-01 / D-04 | Server schema rejects forbidden keys (cpf/foto/estado_civil/saude) | unit | `npm run test:run -- supabase/functions/_shared/__tests__` or a new `.strict()` reject test | ❌ Wave 0 |
| LGPD-01 / D-02 | candidatoSchema no longer requires cpf/genero; cadastro builds without them | unit | `npm run test:run -- src/features/cadastro/schemas` | ❌ Wave 0 (edit existing) |
| D-03 | email-only dedup path calls RPC with p_cpf='' | unit | `npm run test:run -- src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` | ✅ (extend) |
| INSCR-02 | qualification block renders Etapa-1 perguntas; ≤10/≤1-aberta gate | unit | `npm run test:run -- src/features/config-vaga/__tests__/publishGate.test.ts` | ✅ (extend) |
| INSCR-03 / D-14 | cargoTemplates seed presencial-SP (all) + harmonização (dentista only) | unit | `npm run test:run -- src/features/config-vaga/templates/__tests__/cargoTemplates.test.ts` | ✅ (extend) |
| INSCR-04 / D-10 | knockout sweep sets rejeitado/inscricao/motivo/opcao_knockout_id; survivor → triagem | SQL smoke | disposable fixture + `set_config('request.jwt.claims',...)` (Phase 7 pattern) in an `08-SQL-SMOKE-RUNBOOK.md` | ❌ Wave 0 |
| INSCR-04 / D-13 | exactly one `historico_candidatura` row (auto_rejeitado=true, ator NULL) on knockout; no double-write | SQL smoke | same runbook | ❌ Wave 0 |
| INSCR-04 / D-16 | dashboard/perfil renders feedback_rejeicao for rejeitado | E2E | `npm run test:e2e -- <inscricao-knockout.spec>` | ❌ Wave 0 |
| INSCR-01..04 | end-to-end inscrição → knockout → neutral message | E2E (UAT) | Playwright + manual UAT runbook (smoke-runtime gate, Phase 5 precedent) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:run -- <touched path>` (quick) + `npm run build`.
- **Per wave merge:** `npm run test:run` (full Vitest) + relevant SQL smokes.
- **Phase gate:** full Vitest green + all SQL smokes PASS + E2E/UAT for the knockout flow before `/gsd:verify-work`. Live PROD apply is a human-action checkpoint (Phase 4/6/7 precedent).

### Wave 0 Gaps
- [ ] `supabase/functions/_shared/__tests__/strict-schema.test.ts` — D-04 forbidden-key rejection.
- [ ] `.planning/phases/08-.../08-SQL-SMOKE-RUNBOOK.md` — knockout sweep (rejeitado path + survivor path + single-history-row + no-double-write) via disposable fixture + `set_config request.jwt.claims` (Phase 7 idiom).
- [ ] `e2e/inscricao-knockout.spec.ts` — full flow + feedback_rejeicao display.
- [ ] Extend existing: `duplicateCheckService.test.ts` (email-only), `cargoTemplates.test.ts` (default knockouts), `publishGate.test.ts` (≤10/≤1-aberta), cadastro schema tests (no cpf/genero).

## Security Domain

> `security_enforcement` treated as **enabled** (absent in config → enabled; STATE.md confirms `security_enforcement=true`). `/gsd:secure-phase 8` recommended after planning.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | EF two-client `auth.getUser()` (JWT verify ON); knockout RPC is service_role-only |
| V3 Session Management | yes (reuse) | Supabase JWT; unchanged |
| V4 Access Control | yes | RLS on candidaturas/historico/metadata; candidate writes own row only; IDOR cross-check (candidato_id == user.id) already in EF |
| V5 Input Validation | yes | Zod `.strict()` allowlist (D-04) — the core LGPD control; client mirror |
| V6 Cryptography | no | No new crypto; CPF digit-check code remains but cpf no longer collected |
| V8 Data Protection (LGPD) | yes | PII minimization (drop cpf/genero/foto); age structurally excluded from decisions (D-05); neutral rejection message (D-15) |

### Known Threat Patterns for {Supabase + EF + RPC}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forbidden PII smuggled in submit body | Tampering / Info Disclosure | Zod `.strict()` fail-closed (D-04) |
| Direct candidaturas INSERT bypassing knockout | Tampering / Elevation | Writes go through SECURITY DEFINER RPC (service_role grant only); candidate cannot INSERT directly (RLS + EF) |
| Knockout bypass via crafted resposta payload | Tampering | RPC re-evaluates server-side against `pergunta_opcao_metadata`; client answer cannot self-approve |
| Rejection reason leaks discriminatory criterion | Info Disclosure / LGPD | Neutral message only (D-15); criterion stored server-side (opcao_knockout_id) but never shown |
| Age/genero used in a decision | LGPD / fairness | Structural: no knockout/qualification/score logic reads `data_nascimento` or `genero` (D-05); genero dropped from collection |
| Duplicate-check PII enumeration | Info Disclosure | RPC returns booleans only + rate-limit 30/60s (already live) |
| Knocked-out candidate analyzed by AI (F10) | Process integrity | Survivors-only reach `triagem`; F10 trigger filters rejeitado (Pitfall 5) |

## Project Constraints (from CLAUDE.md)

- pt-BR domain naming (tables, enums, messages); technical code in en. New columns: `motivo_rejeicao`, `opcao_knockout_id`, `qualificacao_etapa1` (snake_case pt-BR).
- `database.types.ts` is **generated** (root, not `src/types/`) — NEVER edit by hand; regenerate via `npm run db:types` after migration.
- NEVER `supabaseAdmin`/service_role on client; privileged ops in EF/RPC. Knockout RPC stays service_role-grant-only; called via the EF.
- RLS on 100% of user-data tables (already enabled on M2 tables).
- Duplicate check via RPC SECURITY DEFINER (not anon SELECT) — unchanged (D-03 flips key, not mechanism).
- Migration 42601 workaround mandatory for PL/pgSQL (`CREATE FUNCTION`/`$$`) — D-22 MCP/SQL-Editor path + `migration repair` + reconcile, no outer BEGIN/COMMIT.
- Product language: "avaliação comportamental/cognitiva", never "teste psicológico". System NEVER auto-rejects by score/trait (RNF-07a) — knockout is an OBJECTIVE criterion (presencial/specialty), which is the permitted, audited exception (Phase 6 guardrail lives only in `decisao_final.por_usuario`).
- DevNavigationMenu gated by `import.meta.env.DEV`.
- Commits via `git -c core.hooksPath=/dev/null` (tsc baseline ~301); Fernando commits in his terminal.

## Sources

### Primary (HIGH confidence)
- `database.types.ts` (root, regenerated 2026-06-07) — live shapes of candidatos, candidaturas, vagas, perguntas_formulario, respostas_formulario, pergunta_opcao_metadata, historico_candidatura + all enums.
- `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` — RPC to extend (D-10).
- `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` — trigger is `BEFORE UPDATE OF etapa_atual` (D-13 no double-write).
- `supabase/migrations/20260607000001_historico_candidatura.sql` — audit table shape + ator/auto_rejeitado semantics.
- `supabase/migrations/20260607010001_pergunta_opcao_metadata.sql` — knockout mechanism + opcao_id/opcao_texto dual key (D-10 Pitfall 6).
- `supabase/migrations/20260607010002_vagas_config_columns.sql` — qualificacao_etapa1 explicitly deferred to Phase 8.
- `supabase/migrations/20260607010004_publish_vaga_rpc.sql` — D-12 gate already enforces knockout-must-be-obrigatoria.
- `supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql` — dedup RPC supports email-only (D-03).
- `supabase/functions/submit-candidatura/index.ts` + `_shared/schemas.ts` — EF + Zod model for `.strict()` (D-04).
- `src/components/pages/FormularioCandidaturaPage.tsx` — confirms respostas write option TEXT (Pitfall 1).
- `src/features/vagas/schemas/candidaturaFormSchema.ts` + `src/lib/opcoes/opcoesNormalize.ts` — render/normalize path.
- `src/features/config-vaga/templates/cargoTemplates.ts` — seed target (D-14).
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §6.1 (RF-01/01a/02/03), §8.2, §8.5 — confirms qualificacao_etapa1 = derived jsonb (D-07), neutral message, no inscricao feature module.
- `docs/conhecimento/perguntas-vagas.md` — canonical knockout question texts (presencial-SP identical across cargos; harmonização dentista-only) (D-14).
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `08-CONTEXT.md`, `CLAUDE.md`.

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` (MEMORY) — Phase 6/7 apply path (MCP execute_sql), D-22, baselines.

### Tertiary (LOW confidence)
- None — all claims tied to live types or migration files.

## Metadata

**Confidence breakdown:**
- Live schema / decisions resolution: HIGH — confirmed against regenerated `database.types.ts` + applied migrations + PRD.
- Knockout RPC design: HIGH on insertion point + no-double-write; MEDIUM on the exact `resposta_opcoes` predicate (A4 — verify live via MCP before locking).
- D-02 CPF nullable: HIGH on consumer audit; MEDIUM on CHECK predicate (A2 — verify live).
- D-07 derived jsonb: HIGH — PRD explicitly states "espelha testes_aplicaveis"; no contradiction.

**Research date:** 2026-06-07
**Valid until:** 2026-07-07 (stable internal codebase; re-verify only if Phase 8 migration alters the assumed shapes). Re-confirm A2 + A4 against live PROD via Supabase MCP `execute_sql` at plan/execute time.
