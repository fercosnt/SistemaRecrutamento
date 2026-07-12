# Phase 26: Correção do Funil (lado candidato — alcançabilidade & scoring) - Research

**Researched:** 2026-07-12
**Domain:** Candidate-side ATS funnel correction — server-authoritative SJT scoring (PL/pgSQL), question-battery filtering, cognitive-assessment reachability, re-inscription after soft-delete, neutral card-status derivation, honest wait-state copy, and moving an n8n PII webhook dispatch server-side. Stack: Supabase Postgres (SECURITY DEFINER RPCs + triggers + RLS) + React 18/Vite/TS + Vitest + SQL behavioral smokes.
**Confidence:** HIGH — this is a correction phase; every defect and target fix is precisely diagnosed in `26-CONTEXT.md` and cross-verified against the live source tree. Research grounded the HOW against the actual files, not training data.

<user_constraints>
## User Constraints (from 26-CONTEXT.md)

### Locked Decisions

**SJT Scoring Integrity (FUNIL-01 + FUNIL-12 overwrite)**
- **Duplicatas** de `{pergunta_id, opcao_id}` no submit → **rejeitar com RAISE** (server-authoritative; mata a inflação >100% do `marked` CTE sem DISTINCT em `20260611000004:84-88`).
- **Denominador** = **todas as perguntas ativas da bateria SJT da vaga** (não só as respondidas) — corrige `maxes` restrito a `pergunta_id IN (SELECT ... FROM marked)` em `20260611000004:95-100`.
- **Re-submit lock** (load-bearing): `pontuar_sjt` **rejeita** quando já existe row `scores_candidato` MC com status != 'falhou' para a candidatura. Fecha A41 (overwrite sem trilha via ON CONFLICT DO UPDATE `20260611000004:121-131`).
- **Submit incompleto** → **rejeitar**: exigir que todas as perguntas da bateria estejam respondidas (server valida `count(respostas) == count(bateria)`; grava expected vs answered em metadata).
- **Invariante:** RNF-07a — nunca escrever `candidaturas.status`; `pontuar_sjt` só grava `scores_candidato`, nunca rejeita.

**Question Filtering + Cognitive Reachability (FUNIL-07 + FUNIL-08)**
- **Filtro SJT (client):** `getAvaliacaoContext` filtra `perguntas` por **`itens_ids` do elemento work_sample_sjt de `testes_aplicaveis` quando presente, senão por `cargo`** (hoje só `.eq('status','active')`).
- **Validação server-side:** `pontuar_sjt` valida que **todo `pergunta_id` pertence à bateria da vaga** — rejeita (42501/400) caso contrário.
- **Prova cognitiva — Opção A (async hub):** renderizar um card cognitivo dentro de `AvaliacaoContainer` durante `avaliacao_assincrona`, gateado por **`vaga.aplica_cognitivo === true`** (NÃO pela entry de template); o card navega para a **rota real** `/candidato/prova-cognitiva/:candidaturaId` (corrigir o stub `/candidato/avaliacao/:id/cognitivo`); **relaxar o gate de `pontuar_cognitivo`** para aceitar `avaliacao_assincrona`.
- **Teste de contrato rota↔gate:** provar que a etapa onde o card aparece é a etapa que o RPC de submit aceita.
- **Label do card:** "Avaliação cognitiva".

**Card Status Source + Honest Copy (FUNIL-12 + UX-01)**
- **Status de conclusão do card:** derivado das **rows próprias do candidato** (`scores_candidato` / `respostas_avaliacao`) via **RPC neutra "já registrado"** (booleans por teste), NÃO do campo fantasma `entry.status`.
- **Copy padrão:** **"Acompanhe o andamento pelo seu painel."** — remover todas as promessas de e-mail; mirar `VagaDetalhePage.tsx:319` e `DashboardCandidatoPage.tsx:186`.
- **Escopo da copy (6 telas):** `AvaliacaoContainer.tsx:209`, `RedacaoEditorScreen.tsx:278`, `DevolutivaBigFiveView.tsx:157`, `ProvaCognitivaScreen.tsx:82` (+ prose `:18`), `SolicitarRevisaoCTA.tsx:45`, `SuporteRHPage.tsx:162-163`. **NÃO** tocar `AutorizacoesStep.tsx:58/93/185` (consent legítimo).
- **CI grep guard** bane a reintrodução de "avisaremos ... por e-mail" nas telas de espera.

**n8n PII Server-Side Dispatch (SEC-03 2nd leak)**
- **Fix shape:** mover `notifyCandidatoCriado` para **server-side (pg_net + Vault)** espelhando `20260706110005_sec03_n8n_serverside.sql`; **deletar** URLs hardcoded + payloads PII do client (`n8nService.ts` sem runtime callers → remoção limpa).
- **Evento/trigger:** **`AFTER INSERT ON candidatos`** (SECURITY DEFINER) → `net.http_post` com body **só ids/evento — sem PII**.
- **Secret ausente:** **graceful-skip** quando `vault.decrypted_secrets` `n8n_webhook_base` é NULL.
- **Bundle guard:** estender `src/__tests__/guards/n8n-bundle.grep.test.ts` para banir `n8n.srv881294.hstgr.cloud` + literais de PII.

### Claude's Discretion
- Formato exato da RPC neutra de status dos cards (nome, shape do retorno) — desde que não vaze score bruto.
- Estrutura interna do `metadata` de `pontuar_sjt` (expected/answered/versão) desde que auditável.
- Ordenação/wording fino dos cards e microcopy, respeitando o design system Beauty Smile.
- Onde exatamente adicionar o filtro cargo/itens_ids (dentro de `getAvaliacaoContext` vs nova RPC) — desde que server-side também valide.

### Deferred Ideas (OUT OF SCOPE)
- FUNIL-10 reconstrução do baseline/ledger de migrations (DBMIG-01) → **Phase 27**.
- A9/A12/A16/A42 (write-paths RH, RLS parent-table scoping) → **Phase 25 / fora do file-touch**.
- `database.types.ts` regen + drop dos casts confinados → **Phase 27**.
- Criar o Vault secret `n8n_webhook_base` em PROD → **human-action de Fernando** (graceful-skip até lá).
- A28 (`historico_candidatura.auto_rejeitado` semântica) → **Phase 27 ou backlog**.
- Banco de talentos + re-candidatura ampla → **M5/TALENT**.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **FUNIL-01** (A8, HIGH) | `pontuar_sjt` não-manipulável: dedup + denominador sobre a bateria completa + re-submit lock + rejeição de submit incompleto | §Code Example 1 (rewritten `pontuar_sjt`), §Pitfall 1/2/3, §Validation (SQL smokes) |
| **FUNIL-07** (A17, HIGH) | Banco SJT filtrado por cargo **e** `itens_ids` da vaga (client + server) | §Code Example 2 (client filter) + §Code Example 1 (server battery-membership check), §Pitfall 4 |
| **FUNIL-08** (A18, HIGH) | Prova cognitiva alcançável (card gateado por `aplica_cognitivo` → rota real; gate do RPC relaxado; contract test) | §Code Example 3 (relaxed `pontuar_cognitivo` gate) + §Code Example 4 (cognitivo card), §Pitfall 5/6 |
| **FUNIL-10** (A27, MEDI) | Reinscrição pós soft-delete: dropar o índice unique legado sem filtro `deleted_at` em PROD | §Code Example 5 (discovery + DROP), §Runtime State Inventory, §Pitfall 7 |
| **FUNIL-12** (A41, MEDI) | Cards derivam conclusão das rows próprias via RPC neutra (não do campo fantasma `entry.status`) | §Code Example 6 (neutral status RPC) + §Code Example 4 (deriveCards rewrite), §Pitfall 8 |
| **UX-01** (QW1) | Copy honesta ("acompanhe no painel") em 6 telas + CI grep guard | §Code Example 7 (copy + guard), 26-UI-SPEC §Copywriting Contract |
| **[routed pós-P24]** n8n PII | `n8nService.ts` não envia PII do browser; dispatch server-side (pg_net + Vault) + grep guard | §Code Example 8 (AFTER INSERT candidatos trigger) + §Code Example 9 (guard extension), §Pitfall 9 |
</phase_requirements>

## Summary

Phase 26 closes six candidate-side funnel defects plus one routed-in PII leak. Every fix is a **hardening edit to existing, live code** — no new library, no new feature. The center of gravity is the database tier: three `SECURITY DEFINER` PL/pgSQL functions are the load-bearing surfaces (`pontuar_sjt` rewrite, `pontuar_cognitivo` gate relax, a new neutral status RPC), plus one PROD-only index drop and one new `AFTER INSERT` trigger. The frontend edits are thin: a battery filter in `getAvaliacaoContext`, a cognitivo card + real route in `AvaliacaoContainer`, card-state derivation from a new RPC, and six copy replacements. `[VERIFIED: codebase]`

The dominant risk is **structural checks passing while behavior is broken** — the same trap Phases 24/25 hit (a column `REVOKE` that was a no-op vs a table `GRANT`; duplicate RLS policies OR-defeating a scope). The proven countermeasure is a **SQL behavioral smoke** per DB requirement: `set_config('request.jwt.claims', …)` + `SET ROLE authenticated` against a disposable fixture, asserting the real projection/denial/score, not the DDL text. This pattern lives in `supabase/tests/sec05_08_smokes.sql` and MUST be replicated here. `[VERIFIED: supabase/tests/sec05_08_smokes.sql]`

The repo-specific migration mechanic is non-negotiable: PROD migrations apply via **Supabase MCP `apply_migration`/`execute_sql`**, which bypasses the `42601` "cannot insert multiple commands into a prepared statement" error that `supabase db push --linked` throws on `$$` bodies, and writes the version row itself. Do **not** plan a `db push` step for the migrations; the apply task is `[BLOCKING]` and non-autonomous. `[VERIFIED: CLAUDE.md §Migrations + STATE.md M2-M4 decisions]`

**Primary recommendation:** Treat the three RPCs as one integrity unit (they share the `scores_candidato`/battery model), plan a SQL behavioral smoke as the acceptance gate for each DB requirement, do the FUNIL-10 index drop as an execution-time PROD discovery (the offending index is not in any migration file — must be found via `pg_indexes`), and mirror the SEC-03 trigger precedent verbatim for the n8n candidatos dispatch. Keep every candidate-facing return NEUTRAL (RNF-07a): no score, no threshold, no gabarito ever crosses the wire.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| FUNIL-01 SJT scoring integrity | Database (`pontuar_sjt` SECURITY DEFINER RPC) | Frontend (`avaliacaoService.pontuarSjt` submits picks only) | Client is bypassable; scoring + anti-tamper (dedup, denominator, re-submit lock, completeness) must be server-authoritative. `[CITED: 26-CONTEXT decisions]` |
| FUNIL-07 question-battery filtering | Database (server-side `pergunta_id ∈ battery` check in `pontuar_sjt`) | Frontend (`getAvaliacaoContext` presentational filter) | Filtering the UI is UX; the security teeth is server rejection of cross-battery ids. `[CITED: 26-CONTEXT decisions]` |
| FUNIL-08 cognitive reachability | Frontend (card render + real routing in `AvaliacaoContainer`) | Database (`pontuar_cognitivo` etapa-gate relax) | The unreachability is a client routing/gate bug; the RPC gate is the submit-time back-stop. `[VERIFIED: AvaliacaoContainer.tsx:88-93 + 20260625000001:99]` |
| FUNIL-10 re-inscription | Database (drop unversioned unique index in PROD) | — (EF 23505→DUPLICATE_CANDIDATURA unchanged) | A PROD schema-drift artifact; pure DDL fix. `[CITED: 26-CONTEXT / M4-SYSTEM-AUDIT A27]` |
| FUNIL-12 card status | Database (neutral status RPC over own rows) | Frontend (`deriveCards`/`statusInfo` consume it) | Truth lives in `scores_candidato`/`respostas_avaliacao`; the container merely renders it (never a raw score). `[CITED: 26-UI-SPEC §Card State Contract]` |
| UX-01 honest copy | Frontend (6 string edits) | CI (grep guard regression net) | Pure presentation; the guard prevents re-introduction. `[VERIFIED: grep of 6 files]` |
| n8n PII dispatch | Database (`AFTER INSERT ON candidatos` trigger) | Frontend (delete `n8nService.ts` subtree) + CI (guard) | The URL/PII must never ship in the public bundle; server-side pg_net is the only safe channel. `[CITED: SEC-03 precedent 20260706110005]` |

## Standard Stack

This is a correction phase over the **existing** stack. No new runtime or dev dependency is introduced. `[VERIFIED: package.json]`

### Core (already present — reused, not installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Postgres (PG15) | linked project | `SECURITY DEFINER` RPCs, RLS, triggers, `pg_net`, Vault | The entire backend; `UNIQUE NULLS NOT DISTINCT` (PG15) already used by `scores_candidato`. `[VERIFIED: 20260611000001:66-70]` |
| `pg_net` extension | enabled (`20260609000001:47`) | server-side `net.http_post` for the n8n trigger | Already the SEC-03 dispatch channel. `[VERIFIED: 26-CONTEXT code_context]` |
| Supabase Vault (`vault.decrypted_secrets`) | present | reads `n8n_webhook_base` secret | SEC-03 precedent reads the same secret name. `[VERIFIED: 20260706110005:61]` |
| React 18 + Vite + TS strict | per package.json | `AvaliacaoContainer`, `avaliacaoService`, copy edits | Existing SPA. `[VERIFIED: CLAUDE.md]` |
| `@tanstack/react-query` v5 | present | `getAvaliacaoContext`/status-RPC hooks | Server-state layer. `[VERIFIED: AvaliacaoContainer.tsx:28]` |
| `zod` | `^3.22.4` | `testesAplicaveisSchema` (itens_ids/cargo) | Existing schema layer. `[VERIFIED: package.json + testesAplicaveisSchema.ts:25]` |

### Supporting (test + CI, already present)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `^4.1.9` | unit + component + grep-guard tests | `**/__tests__/**/*.{test,spec}.{ts,tsx}`, happy-dom, `setupFiles ./tests/setup.ts`. `[VERIFIED: vite.config.ts test block]` |
| `@testing-library/react` | `^16.3.2` | `AvaliacaoContainer` render tests | Card-state + contract tests. `[VERIFIED: package.json]` |
| SQL behavioral smokes | n/a (raw `.sql`) | prove RPC/trigger/index behavior in PROD | The acceptance gate for every DB requirement (Phase 24/25 precedent). `[VERIFIED: supabase/tests/*.sql]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Neutral status RPC (booleans) | Candidate-facing RLS SELECT on `scores_candidato` | REJECTED — `scores_candidato` has NO candidate read policy by design (row-deny hides the score entirely); a SELECT policy would leak the verdict. RLS is row-level, cannot hide the `score` column. `[VERIFIED: 20260611000001:80-90 + reference_select_star_leaks_pii]` |
| Hard re-submit lock (RAISE) | Versioned score history rows | 26-CONTEXT locks the hard lock; simpler, closes A41 without a history table. `[CITED: 26-CONTEXT §specifics]` |
| Option A (async-hub cognitivo card) | Option B (interview-stage entry) | 26-CONTEXT locks Option A — cognitivo is an async assessment, same mental model as SJT. `[CITED: 26-CONTEXT §specifics]` |

**Installation:** None. No `npm install`, no new migration dependency. All edits are to existing files + new migration files applied via MCP.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** Every dependency used (Supabase, pg_net, Vault, React, TanStack Query, zod, Vitest) is already in the lockfile and was slopcheck-audited/pinned in Phase 22 (CI-09 pinned the 8 wildcard prod deps). No registry lookup, no slopcheck run, and no `checkpoint:human-verify` install gate is required for Phase 26. `[VERIFIED: package.json + STATE.md 22-02 decision]`

## Architecture Patterns

### System Architecture Diagram

```
CANDIDATE BROWSER (React SPA)
  │
  │  (1) SJT battery
  ├── getAvaliacaoContext(candidaturaId)
  │       └─► candidaturas (allowlist) + vaga.testes_aplicaveis
  │            └─► FILTER perguntas by  itens_ids (work_sample_sjt elem) ?? cargo   ← FUNIL-07 (client)
  │       └─► get_opcoes_sjt(perguntaId)  [DEFINER]  → (opcao_id, opcao_texto) only  (no peso/tag)
  │
  ├── pontuarSjt(candidaturaId, picks[])                          ← FUNIL-01
  │       └─► RPC pontuar_sjt  [SECURITY DEFINER, runs-as-owner, bypasses RLS]
  │             ├─ AUTHZ: auth.uid() owns candidatura AND etapa='avaliacao_assincrona' else 42501
  │             ├─ REJECT duplicate pergunta_id (RAISE)                        ← dedup
  │             ├─ REJECT any pergunta_id ∉ vaga battery (RAISE 42501/400)     ← FUNIL-07 (server)
  │             ├─ REJECT incomplete: answered != battery MC count (RAISE)     ← completeness
  │             ├─ REJECT re-submit: non-'falhou' MC row exists (RAISE)        ← FUNIL-12 lock
  │             ├─ denominator = Σ MAX(peso) over ALL active MC battery items  ← denominator fix
  │             ├─ status = pendente_humano | sucesso  (NEVER writes candidaturas ← RNF-07a)
  │             └─ INSERT one scores_candidato MC row  →  RETURN {ok,registrado} (NEUTRAL)
  │
  │  (2) cognitivo (async hub — Option A)                         ← FUNIL-08
  ├── AvaliacaoContainer  deriveCards()
  │       ├─ render cognitivo card  IFF vaga.aplica_cognitivo === true  (NOT template entry)
  │       └─ CTA → /candidato/prova-cognitiva/:candidaturaId  (REAL route, not stub)
  ├── ProvaCognitivaScreen (gates on aplica_cognitivo only — NO screen-level etapa gate)
  │       └─ submitProva → RPC pontuar_cognitivo [DEFINER]
  │             └─ AUTHZ etapa IN ('entrevista_online','entrevista_presencial',
  │                                 'avaliacao_assincrona')  ← ADD avaliacao_assincrona
  │
  │  (3) card status (own rows)                                   ← FUNIL-12
  ├── AvaliacaoContainer → RPC get_avaliacao_status(candidaturaId) [DEFINER]
  │       └─ per-test booleans {registrado, iniciado} from scores_candidato + respostas_avaliacao
  │          (NEVER a raw score/threshold)  → deriveCards uses THIS, not entry.status (phantom)
  │
  └── (4) cadastro (new candidato)
          INSERT candidatos  ──► AFTER INSERT trigger trg_n8n_novo_candidato [DEFINER] ← n8n fix
                                    ├─ read Vault n8n_webhook_base (graceful-skip if NULL)
                                    └─ net.http_post  body = { id, event }  (NO nome/email/cpf/telefone)

PROD SCHEMA (FUNIL-10): candidaturas has TWO unique idx on (candidato_id,vaga_id):
   ✅ candidaturas_candidato_vaga_unique_idx  WHERE deleted_at IS NULL  (KEEP — 20260425000004)
   ❌ <unversioned> full unique idx (NO filter)  → DROP  (blocks re-inscription; 23505)
```

### Component Responsibilities
| File | Responsibility in Phase 26 |
|------|----------------------------|
| `supabase/migrations/<new>_funil01_pontuar_sjt_v2.sql` | Rewrite `pontuar_sjt`: dedup, battery denominator, battery-membership, completeness, re-submit lock, metadata. `[VERIFIED: 20260611000004]` |
| `supabase/migrations/<new>_funil08_pontuar_cognitivo_gate.sql` | `CREATE OR REPLACE` the **5-arg** `pontuar_cognitivo` adding `'avaliacao_assincrona'` to the etapa `IN`. `[VERIFIED: 20260625000001:99]` |
| `supabase/migrations/<new>_funil12_avaliacao_status_rpc.sql` | New `get_avaliacao_status` DEFINER RPC (neutral booleans). `[NEW]` |
| `supabase/migrations/<new>_funil10_drop_dup_index.sql` | `DROP INDEX <discovered>` (PROD-only; discovered via `pg_indexes`). `[VERIFIED: 20260425000004 + A27]` |
| `supabase/migrations/<new>_n8n_novo_candidato.sql` | `AFTER INSERT ON candidatos` trigger (pg_net + Vault, no PII). `[VERIFIED: 20260706110005 precedent]` |
| `src/features/avaliacao/services/avaliacaoService.ts` | `getAvaliacaoContext` battery filter (FUNIL-07 client) + call `get_avaliacao_status` (FUNIL-12). `[VERIFIED: :140-146]` |
| `src/features/avaliacao/components/AvaliacaoContainer.tsx` | cognitivo card gate + real route (FUNIL-08) + card state from status RPC (FUNIL-12) + all-done copy (UX-01). `[VERIFIED: :88-93,:209,:303-326]` |
| `src/features/cadastro/services/n8nService.ts` (+ `index.ts` barrel) | DELETE the hstgr URLs + `notifyCandidatoCriado` PII subtree. `[VERIFIED: :122-168,:388-417; index.ts:11]` |
| `src/__tests__/guards/n8n-bundle.grep.test.ts` | Extend to ban `n8n.srv881294.hstgr.cloud` + PII literals. `[VERIFIED: current guard scope note :22-26]` |
| `src/__tests__/guards/<new>_wait-state-copy.grep.test.ts` | Ban `avisaremos…por e-mail` in the 6 wait-state files (UX-01). `[NEW]` |
| 5 copy files (`RedacaoEditorScreen`, `DevolutivaBigFiveView`, `ProvaCognitivaScreen`, `SolicitarRevisaoCTA`, `SuporteRHPage`) | Replace e-mail promise with canonical string. `[VERIFIED: grep]` |

### Pattern 1: SECURITY DEFINER RPC as the anti-tamper boundary
**What:** The candidate posts only identifiers/picks; the DEFINER function re-derives everything server-side, authorizes ownership + etapa via GUC-based `auth.uid()`, and returns a NEUTRAL payload.
**When to use:** Every candidate-writable scoring/status path in this phase.
**Example (the existing, correct posture — mirror it):**
```sql
-- Source: supabase/migrations/20260611000004_pontuar_sjt_rpc.sql:55-66 (VERIFIED)
SELECT EXISTS (
  SELECT 1 FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.id = p_candidatura_id
     AND ca.user_id = auth.uid()                       -- ownership via candidatos.user_id, NEVER candidato_id
     AND c.etapa_atual = 'avaliacao_assincrona'
) INTO v_owns;
IF NOT v_owns THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
-- ... SET search_path = '' on the function; REVOKE PUBLIC; GRANT authenticated.
```

### Pattern 2: SQL behavioral smoke as the acceptance gate
**What:** After the migration applies to PROD, prove behavior by impersonating JWTs (`set_config('request.jwt.claims', …)` + `SET ROLE authenticated`) against a disposable/discovered fixture, asserting the real result. `NOTICE = PASS`, `EXCEPTION = FAIL`.
**When to use:** FUNIL-01, FUNIL-07, FUNIL-08, FUNIL-10, FUNIL-12, n8n — every DB surface.
**Why load-bearing:** Phase 24 smokes caught two leaks structural checks missed (a no-op column REVOKE and duplicate role-only policies). `[VERIFIED: supabase/tests/sec05_08_smokes.sql:14-27 + STATE.md P24 decision]`

### Pattern 3: single-source contract test (route ↔ gate)
**What:** A Vitest test asserting the etapa in which the cognitivo card renders equals an etapa the `pontuar_cognitivo` RPC accepts — preventing the card from routing to a screen the RPC will 42501.
**When to use:** FUNIL-08. Mirror the FUNIL-05 contract test (`src/lib/testes/__tests__/testeContract.test.ts`) which already asserts `CONTAINER_RECOGNIZED` ⊇ the lib's emitted ids. `[VERIFIED: testeContract.ts:98-104 + 25-04 decision]`

### Anti-Patterns to Avoid
- **Reading `entry.status` off a `testes_aplicaveis` element** — that jsonb is vaga-level config; `testeAplicavelSchema` has NO `status` field. It is the phantom field FUNIL-12 removes. `[VERIFIED: testesAplicaveisSchema.ts:42-54 vs AvaliacaoContainer.tsx:312]`
- **Adding a candidate SELECT policy to `scores_candidato`** — leaks the verdict; use the neutral RPC. `[VERIFIED: 20260611000001:80-90]`
- **`select('*')` on any candidate read** — RLS is row-level; a star projection ships hidden columns (gabarito/score). `[VERIFIED: reference_select_star_leaks_pii + avaliacaoService allowlist idiom]`
- **`supabase db push --linked` for these `$$`-body migrations** — trips 42601; use MCP `apply_migration`. `[VERIFIED: CLAUDE.md §Migrations]`
- **`BEGIN; … COMMIT;` wrapper in migration files** — the CLI driver wraps each migration; the outer transaction is the 42601 trigger. `[VERIFIED: CLAUDE.md D-22]`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SJT % scoring | Client-side Σ peso / threshold | `pontuar_sjt` DEFINER RPC | Client is bypassable; the gabarito (peso/tag) must never reach the browser. `[VERIFIED: perguntas_opcao_sjt has no candidate SELECT policy]` |
| Duplicate-candidatura defense | Client duplicate check as the guard | Partial unique index + EF 23505→DUPLICATE_CANDIDATURA mapping | The DB constraint is the authority; the client check is only a UX hint. FUNIL-10 fixes the *index*, not the client. `[VERIFIED: 20260425000004 + submit-candidatura/index.ts:253-257]` |
| Card completion state | Deriving from a config field | Neutral status RPC over the candidate's own rows | The only truth is `scores_candidato`/`respostas_avaliacao`; config carries no per-candidate state. `[VERIFIED: FUNIL-12 decision]` |
| Webhook dispatch with PII | `fetch()` from the browser to a hardcoded n8n URL | `AFTER INSERT` trigger + pg_net + Vault, body sans PII | VITE_/hardcoded URLs inline into the public bundle; PII in the body is an LGPD leak. `[VERIFIED: n8n-bundle guard rationale + SEC-03]` |
| Copy regression prevention | Manual review | CI grep guard (node:fs, comment-aware) | The 6 files drift; a guard is the durable net. Mirror `rh-console`/`forbidden-strings`. `[VERIFIED: src/__tests__/guards/]` |

**Key insight:** In this ATS, *every* candidate-facing surface is an information-disclosure boundary. The gabarito, the score, the threshold, and PII are all secrets. The domain's hard-won rule (Phases 8/11/24): RLS hides rows, never columns — so secrets are protected by **denying the row entirely + reading through a DEFINER RPC that projects only safe fields**, and by **testing the projection over the wire (behavioral smoke), not the JSX**.

## Runtime State Inventory

> This is a correction phase touching PROD schema + live service config. The grep-visible fixes are the migrations; the following are the runtime states that migrations/greps do NOT surface.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `scores_candidato` MC rows (`tipo='sjt', subtipo='mc'`) already written by the *old* `pontuar_sjt` may carry inflated (>100%) or subset-denominator scores. The re-submit lock will now BLOCK re-scoring them. | Decision needed (see Open Q1): the [TESTE]-funil candidatura(s) used for UAT may need a one-time `DELETE FROM scores_candidato WHERE …` reset so a fresh complete submit can prove the new logic. No production-candidate backfill is in scope. |
| **Live service config** | `n8n.srv881294.hstgr.cloud` workflows (the personal n8n instance) expect the OLD PII payload shape (`candidato.{nome,email,telefone,cpf}`). The new trigger body is `{id, event}` only. | The n8n workflow on Fernando's side must be updated to consume the id-only body — OR it silently no-ops. Out of scope to edit n8n; **graceful-skip until `n8n_webhook_base` Vault secret exists** means dispatch is dormant anyway. Flag for Fernando. |
| **OS-registered state** | None. No cron/Task Scheduler/pm2 process references these strings. | None — verified: n8n workflows are remote (hstgr), not local OS jobs. |
| **Secrets/env vars** | Vault secret `n8n_webhook_base` — **read by the new trigger; NOT created by this phase** (human-action). No `.env` VITE_ var is added (that would re-leak into the bundle). The old `n8nService.ts` used **hardcoded** URLs (no env var), so there is no env var to remove. | None from Phase 26 code; the trigger graceful-skips (`RETURN NEW`) while the secret is NULL. Fernando creates the secret out-of-band. `[VERIFIED: 20260706110005:61-66]` |
| **Build artifacts** | The public **build bundle** currently inlines the hstgr host + (via `notifyCandidatoCriado`) the PII field names, because `n8nService.ts` is barrel-exported (`index.ts:11`) even though it has ZERO runtime callers — tree-shaking may retain the string constants. | Deleting the `n8nService.ts` subtree + the barrel re-export removes it from `build/`; the extended grep guard asserts `build/` is clean after `npm run build` (CI leg). `[VERIFIED: index.ts:11 + n8n-bundle guard build/ leg]` |

**Canonical question — after every file is updated, what runtime state still carries the old string?** (1) `scores_candidato` rows scored by the old algorithm; (2) the remote n8n workflow's expected payload shape; (3) the Vault secret (absent by design). All three are documented above; none is silently left.

## Common Pitfalls

### Pitfall 1: Denominator/completeness interaction (double-fix must be consistent)
**What goes wrong:** Fixing the denominator to span the full battery WITHOUT also requiring completeness would make an honest partial submit score artificially low (numerator over answered, denominator over all). Fixing completeness WITHOUT the denominator leaves the subset-inflation open.
**Why it happens:** They are two halves of one correctness property; the old code did neither. `[VERIFIED: 20260611000004:95-100]`
**How to avoid:** Do BOTH — reject incomplete submits (`answered == battery MC count`) AND compute the denominator as `Σ MAX(peso)` over all active MC items of the battery. When complete, answered set == battery set, so numerator and denominator are over the same questions → correct %.
**Warning signs:** A smoke where a complete honest submit scores < the same picks under the old code (means denominator over-counts) or a partial submit is accepted (means completeness not enforced).

### Pitfall 2: `caso_aberto` items pollute the MC battery count
**What goes wrong:** The battery (`itens_ids`/cargo) includes the open-case item (`formato='caso_aberto'`), which is scored by the `avaliar-redacao` EF, not `pontuar_sjt`. Counting it in the MC denominator/completeness breaks the math.
**Why it happens:** `perguntas` mixes `formato IN ('mc','caso_aberto')`. `[VERIFIED: 20260611000002:46]`
**How to avoid:** Scope the battery for `pontuar_sjt` to `formato='mc' AND status='active'` only. The open case is a separate score row (`subtipo='caso_aberto'`).
**Warning signs:** Completeness never satisfiable (candidate answers all MC but the open-case item is counted as unanswered).

### Pitfall 3: Re-submit lock must key on the SAME row shape as the upsert
**What goes wrong:** The lock checks for an existing `scores_candidato` MC row but the `ON CONFLICT` key is `(candidatura_id, tipo, subtipo, pergunta_id)` with `subtipo='mc', pergunta_id=NULL`. A lock query that omits `subtipo='mc'` or `pergunta_id IS NULL` may match the wrong row or miss it.
**Why it happens:** `scores_candidato` is a generic sink; the MC row is one specific `(tipo='sjt', subtipo='mc', pergunta_id=NULL)` tuple. `[VERIFIED: 20260611000001:66-71 + 20260611000004:124-131]`
**How to avoid:** Lock predicate = `EXISTS (SELECT 1 FROM scores_candidato WHERE candidatura_id=p AND tipo='sjt' AND subtipo='mc' AND pergunta_id IS NULL AND status <> 'falhou')` → RAISE. Keep (or replace) the `ON CONFLICT` accordingly; with a hard lock the conflict path becomes unreachable for a second valid submit.
**Warning signs:** A second submit succeeds (lock missed) or the first submit RAISEs (lock too broad / matched a `falhou` row).

### Pitfall 4: Client filter is presentation only — the server check is the security control
**What goes wrong:** Filtering `perguntas` by `itens_ids`/cargo in `getAvaliacaoContext` hides other-cargo questions from the UI, but a crafted `pontuar_sjt` call could still submit a foreign `pergunta_id`.
**Why it happens:** The client is bypassable; RLS on `perguntas` only gates `status='active'`, not cargo. `[VERIFIED: 20260611000002:69-72]`
**How to avoid:** `pontuar_sjt` MUST reject any submitted `pergunta_id` not in the vaga's battery (RAISE 42501/400). Both layers are required; the CONTEXT locks both. `[CITED: 26-CONTEXT §decisions]`
**Warning signs:** A smoke posting a valid-but-foreign `pergunta_id` scores instead of raising.

### Pitfall 5: `pontuar_cognitivo` — relax the LIVE 5-arg overload, and ADD (don't replace) the etapa
**What goes wrong:** Editing the old 2-arg version (`20260624000003`) does nothing — it was `DROP`ed. The live function is the **5-arg** overload in `20260625000001_phase14_gap_closure.sql:68`. Also, *replacing* the etapa list would break interview-stage cognitivo submits.
**Why it happens:** A signature-change migration (CR-02) superseded the original; two overloads once coexisted. `[VERIFIED: 20260625000001:63-66,99]`
**How to avoid:** `CREATE OR REPLACE FUNCTION public.pontuar_cognitivo(uuid, jsonb, text, int, jsonb)` with the authz `IN ('entrevista_online','entrevista_presencial','avaliacao_assincrona')`. Do not touch the 2-arg (already dropped).
**Warning signs:** Smoke: submit during `avaliacao_assincrona` still 42501s (edited the wrong overload) or an interview-stage submit regresses.

### Pitfall 6: The cognitivo screen has NO etapa gate — only `aplica_cognitivo`
**What goes wrong:** One might add etapa handling to `ProvaCognitivaScreen`. It gates ONLY on `optedIn = ctx.aplica_cognitivo === true` (`:121,:211`); the "Esta etapa não está disponível" copy fires on `!optedIn`, not etapa. So Option A needs NO screen change beyond the container card + route — the RPC gate is the sole submit-time blocker.
**Why it happens:** The screen was written opt-in-driven; `getContexto` returns etapa but the screen doesn't gate on it. `[VERIFIED: ProvaCognitivaScreen.tsx:121,211 + cognitivoService.getContexto]`
**How to avoid:** Keep the screen as-is; fix reachability at the container (card gate + route) + the RPC gate. Add the contract test.
**Warning signs:** Over-engineering an etapa branch into the screen that never existed.

### Pitfall 7: FUNIL-10 index is NOT in any migration file — discover in PROD
**What goes wrong:** Searching the repo for the offending index finds only the CORRECT partial index (`20260425000004`). The duplicate full index is un-versioned M1 schema drift living only in PROD.
**Why it happens:** The baseline migration is empty (candidaturas table pre-dates versioned migrations). `[VERIFIED: 26-CONTEXT §specifics + M4-SYSTEM-AUDIT A27]`
**How to avoid:** At execution time (BLOCKING, via MCP `execute_sql`), enumerate `pg_indexes`/`pg_constraint` on `public.candidaturas`, identify the unique index/constraint on `(candidato_id, vaga_id)` **without** `WHERE deleted_at IS NULL`, `DROP` it, and keep the partial one. See Code Example 5.
**Warning signs:** `db push`/repo grep "finds nothing to drop" → wrong layer; the drop is a PROD `execute_sql`, not a repo change alone. Add a smoke: insert→soft-delete→re-insert must NOT 23505.

### Pitfall 8: Neutral status RPC must not leak the score even indirectly
**What goes wrong:** Returning `status` (`sucesso`/`pendente_humano`) or the score/threshold leaks the verdict — a candidate could infer pass/fail, violating RNF-07a.
**Why it happens:** The natural join to `scores_candidato` exposes `status`/`score`. `[VERIFIED: 20260611000001 columns]`
**How to avoid:** Return ONLY booleans (e.g. `registrado`/`iniciado`) per test — presence of a row, not its content. Never `status`, `score`, `score_max`, or `metadata`. Test the projection with a behavioral smoke.
**Warning signs:** Any smoke where the candidate JWT can read a numeric/`status` field through the RPC.

### Pitfall 9: n8n subtree deletion must also drop the barrel re-export
**What goes wrong:** Deleting `n8nService.ts` but leaving `export * from './n8nService'` in `index.ts:11` breaks the build; leaving the file but deleting internals leaves the hstgr strings in the bundle.
**Why it happens:** The barrel re-exports it even though nothing calls it. `[VERIFIED: index.ts:11 + zero runtime callers]`
**How to avoid:** Remove the file AND the barrel line AND the test file (`n8nService.test.ts`) AND the README mention; then the extended grep guard proves `build/` + `src/` are clean.
**Warning signs:** tsc error (dangling re-export) or the guard's `build/` leg red after `npm run build`.

## Code Examples

> These are prescriptive templates grounded in the verified live source. Exact `metadata` shape and the status-RPC return shape are Claude's discretion per CONTEXT.

### Example 1 — `pontuar_sjt` rewrite (FUNIL-01 + FUNIL-07 server side)
```sql
-- Basis: supabase/migrations/20260611000004_pontuar_sjt_rpc.sql (VERIFIED)
-- Apply via MCP apply_migration (NOT db push). No BEGIN/COMMIT wrapper. SET search_path=''.
CREATE OR REPLACE FUNCTION public.pontuar_sjt(p_candidatura_id uuid, p_respostas jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owns boolean; v_vaga uuid; v_cargo text; v_itens_ids uuid[];
  v_battery uuid[]; v_answered int; v_expected int;
  v_score int := 0; v_max int := 0; v_has_atencao boolean := false;
  v_status public.status_score; v_breakdown jsonb; v_mc_min_pct numeric := 60;
BEGIN
  -- (A) AUTHZ — owner + avaliacao_assincrona (unchanged posture).
  SELECT c.vaga_id INTO v_vaga FROM public.candidaturas c
     JOIN public.candidatos ca ON ca.id = c.candidato_id
    WHERE c.id = p_candidatura_id AND ca.user_id = auth.uid()
      AND c.etapa_atual = 'avaliacao_assincrona';
  IF v_vaga IS NULL THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;

  -- (B) Re-submit LOCK (FUNIL-12 / A41) — a non-'falhou' MC row already exists → refuse.
  IF EXISTS (SELECT 1 FROM public.scores_candidato
              WHERE candidatura_id = p_candidatura_id
                AND tipo = 'sjt' AND subtipo = 'mc' AND pergunta_id IS NULL
                AND status <> 'falhou') THEN
    RAISE EXCEPTION 'avaliacao ja registrada' USING errcode = '42501';
  END IF;

  -- (C) Resolve the vaga SJT battery — itens_ids-when-present-else-cargo, MC + active only.
  SELECT elem->>'cargo',
         ARRAY(SELECT jsonb_array_elements_text(elem->'itens_ids'))::uuid[]
    INTO v_cargo, v_itens_ids
    FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) elem
   WHERE v.id = v_vaga AND elem->>'tipo' = 'sjt' LIMIT 1;

  SELECT array_agg(p.id) INTO v_battery
    FROM public.perguntas p
   WHERE p.status = 'active' AND p.formato = 'mc'
     AND ( (v_itens_ids IS NOT NULL AND array_length(v_itens_ids,1) > 0 AND p.id = ANY(v_itens_ids))
           OR ((v_itens_ids IS NULL OR array_length(v_itens_ids,1) IS NULL) AND p.cargo = v_cargo) );
  v_expected := COALESCE(array_length(v_battery, 1), 0);

  -- (D) DEDUP (FUNIL-01) — one answer per pergunta; a repeated pergunta_id is a manipulation.
  IF (SELECT count(*) FROM jsonb_array_elements(p_respostas))
     <> (SELECT count(DISTINCT r->>'pergunta_id') FROM jsonb_array_elements(p_respostas) r) THEN
    RAISE EXCEPTION 'resposta duplicada' USING errcode = '22023';
  END IF;

  -- (E) BATTERY MEMBERSHIP (FUNIL-07 server) — every submitted pergunta ∈ battery.
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_respostas) r
              WHERE (r->>'pergunta_id')::uuid <> ALL(v_battery)) THEN
    RAISE EXCEPTION 'pergunta fora da bateria' USING errcode = '42501';
  END IF;

  -- (F) COMPLETENESS — answered distinct == expected battery size.
  SELECT count(DISTINCT r->>'pergunta_id') INTO v_answered FROM jsonb_array_elements(p_respostas) r;
  IF v_answered <> v_expected THEN
    RAISE EXCEPTION 'bateria incompleta (% de %)', v_answered, v_expected USING errcode = '22023';
  END IF;

  -- (G) per-vaga mc_min_pct (unchanged read from threshold.mc_min_pct, default 60).
  SELECT COALESCE((SELECT (elem->'threshold'->>'mc_min_pct')::numeric
                     FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) elem
                    WHERE v.id = v_vaga AND elem->>'tipo'='sjt'
                      AND (elem->'threshold'->>'mc_min_pct') IS NOT NULL LIMIT 1), 60)
    INTO v_mc_min_pct;

  -- (H) Numerator over marked picks; DENOMINATOR over the FULL battery (FUNIL-01 fix).
  WITH marked AS (
    SELECT (r->>'pergunta_id')::uuid AS pergunta_id, (r->>'opcao_id')::uuid AS opcao_id
      FROM jsonb_array_elements(p_respostas) r),
  scored AS (
    SELECT m.pergunta_id, pos.opcao_id, pos.tag, pos.peso
      FROM marked m JOIN public.perguntas_opcao_sjt pos
        ON pos.pergunta_id = m.pergunta_id AND pos.opcao_id = m.opcao_id),
  maxes AS (
    SELECT pergunta_id, MAX(peso) AS peso_max
      FROM public.perguntas_opcao_sjt
     WHERE pergunta_id = ANY(v_battery)          -- ← full battery, NOT only answered
     GROUP BY pergunta_id)
  SELECT COALESCE(SUM(s.peso),0), COALESCE((SELECT SUM(peso_max) FROM maxes),0),
         COALESCE(bool_or(s.tag='atencao'),false),
         COALESCE(jsonb_agg(jsonb_build_object('pergunta_id',s.pergunta_id,'opcao_id',s.opcao_id,'tag',s.tag,'peso',s.peso)),'[]'::jsonb)
    INTO v_score, v_max, v_has_atencao, v_breakdown FROM scored s;

  v_status := CASE WHEN v_has_atencao OR (v_max>0 AND (v_score::numeric/v_max)*100 < v_mc_min_pct)
                   THEN 'pendente_humano'::public.status_score ELSE 'sucesso'::public.status_score END;

  -- (I) Insert exactly one MC row. With the hard lock, a valid second submit never reaches here.
  INSERT INTO public.scores_candidato (candidatura_id, tipo, subtipo, score, score_max, status, metadata)
  VALUES (p_candidatura_id, 'sjt', 'mc', v_score, v_max, v_status,
          jsonb_build_object('respostas', v_breakdown, 'has_atencao', v_has_atencao,
                             'mc_min_pct', v_mc_min_pct,
                             'expected', v_expected, 'answered', v_answered, 'versao', 2));
  -- RNF-07a: never touches candidaturas. NEUTRAL payload out.
  RETURN jsonb_build_object('ok', true, 'registrado', true);
END; $$;
REVOKE ALL ON FUNCTION public.pontuar_sjt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pontuar_sjt(uuid, jsonb) TO authenticated;
```
> Note: `perguntas.id`/`opcao_id` are `uuid`; the `::uuid[]` casts assume `itens_ids` holds uuid strings (it is `z.array(z.string())` — VERIFIED `testesAplicaveisSchema.ts:51`). If any battery is empty (`v_expected = 0`) decide whether to RAISE (no battery configured) — see Open Q2.

### Example 2 — client battery filter (FUNIL-07 presentation)
```typescript
// In getAvaliacaoContext (avaliacaoService.ts) AFTER resolving testesAplicaveis (VERIFIED :135-146).
// Pull the SJT element's itens_ids/cargo, then filter perguntas client-side.
const sjtElem = Array.isArray(testesAplicaveis)
  ? (testesAplicaveis as Array<Record<string, unknown>>).find((e) => e.tipo === 'sjt')
  : undefined
const itensIds = Array.isArray(sjtElem?.itens_ids) ? (sjtElem!.itens_ids as string[]) : []
const cargo = typeof sjtElem?.cargo === 'string' ? (sjtElem!.cargo as string) : undefined

let q = supabase.from('perguntas')
  .select('id, cargo, cenario, formato, tempo_est_min, status')
  .eq('status', 'active')
if (itensIds.length > 0) q = q.in('id', itensIds)
else if (cargo) q = q.eq('cargo', cargo)
const { data: perguntas, error: pErr } = await q
```

### Example 3 — relax `pontuar_cognitivo` gate (FUNIL-08)
```sql
-- Basis: supabase/migrations/20260625000001_phase14_gap_closure.sql:68-103 (the LIVE 5-arg overload).
-- CREATE OR REPLACE the SAME 5-arg signature; ADD 'avaliacao_assincrona' to the etapa IN.
CREATE OR REPLACE FUNCTION public.pontuar_cognitivo(
  p_candidatura_id uuid, p_respostas jsonb,
  p_shuffle_seed text DEFAULT NULL, p_completion_time_seconds int DEFAULT NULL,
  p_proctoring jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
-- ... identical body ...
--   AND c.etapa_atual IN ('entrevista_online', 'entrevista_presencial', 'avaliacao_assincrona')
-- ... rest unchanged (empty-bank guard, CTT soma, banding, insert, neutral return) ...
$$;
```

### Example 4 — cognitivo card + real route + state from status RPC (FUNIL-08 + FUNIL-12)
```typescript
// AvaliacaoContainer.tsx — CONTAINER_TESTE_CONFIG.cognitivo route fix (VERIFIED :88-93):
cognitivo: {
  label: 'Avaliação cognitiva',
  route: (id) => `/candidato/prova-cognitiva/${id}`,   // ← real route, replaces the stub
},

// deriveCards: append a cognitivo card IFF vaga.aplica_cognitivo === true (NOT the template entry),
// ordered LAST (26-UI-SPEC §Cognitivo card). aplica_cognitivo must be added to the getAvaliacaoContext
// allowlist join: `vaga:vagas ( testes_aplicaveis, aplica_cognitivo )`.
if (ctx.aplica_cognitivo === true) {
  cards.push({ teste: 'cognitivo', status: statusFor('cognitivo') /* from status RPC */ , tempoEstimadoMin: null })
}

// FUNIL-12: replace `String(entry.status ?? 'pendente')` (phantom) with the neutral status RPC result.
// Map container card id → status booleans: sjt_mc→(tipo='sjt',subtipo='mc'), redacao→tipo='redacao',
// big_five→tipo='big_five', cognitivo→tipo='cognitivo'; em_andamento when respostas_avaliacao row exists.
```

### Example 5 — FUNIL-10 PROD index discovery + drop (execution-time, BLOCKING via MCP)
```sql
-- STEP 1 (execute_sql, read-only) — enumerate unique indexes on candidaturas(candidato_id, vaga_id).
SELECT i.indexrelid::regclass AS index_name, pg_get_indexdef(i.indexrelid) AS def
  FROM pg_index i
  JOIN pg_class c ON c.oid = i.indrelid
 WHERE c.relname = 'candidaturas' AND i.indisunique
   AND pg_get_indexdef(i.indexrelid) ILIKE '%candidato_id%'
   AND pg_get_indexdef(i.indexrelid) ILIKE '%vaga_id%';
-- Expect TWO rows: the KEEPER (…WHERE (deleted_at IS NULL)) and the OFFENDER (no WHERE clause).
-- Also check pg_constraint in case the offender is a UNIQUE CONSTRAINT (drop via ALTER TABLE ... DROP CONSTRAINT).

-- STEP 2 (execute_sql / migration file) — drop ONLY the unfiltered one, keep the partial index.
-- DROP INDEX IF EXISTS public.<offender_index_name>;         -- if it is a plain index
-- ALTER TABLE public.candidaturas DROP CONSTRAINT IF EXISTS <offender_constraint_name>;  -- if a constraint
```

### Example 6 — neutral status RPC (FUNIL-12; return shape = Claude's discretion)
```sql
-- New. Returns per-test booleans ONLY — never score/status/metadata (Pitfall 8).
CREATE OR REPLACE FUNCTION public.get_avaliacao_status(p_candidatura_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owns boolean; r jsonb;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.candidaturas c
     JOIN public.candidatos ca ON ca.id = c.candidato_id
    WHERE c.id = p_candidatura_id AND ca.user_id = auth.uid()) INTO v_owns;
  IF NOT v_owns THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;

  SELECT jsonb_build_object(
    'sjt_mc',          jsonb_build_object(
        'registrado', EXISTS(SELECT 1 FROM public.scores_candidato WHERE candidatura_id=p_candidatura_id AND tipo='sjt' AND subtipo='mc'),
        'iniciado',   EXISTS(SELECT 1 FROM public.respostas_avaliacao WHERE candidatura_id=p_candidatura_id AND teste='sjt')),
    'redacao',         jsonb_build_object('registrado', EXISTS(SELECT 1 FROM public.scores_candidato WHERE candidatura_id=p_candidatura_id AND tipo='redacao')),
    'big_five',        jsonb_build_object('registrado', EXISTS(SELECT 1 FROM public.scores_candidato WHERE candidatura_id=p_candidatura_id AND tipo='big_five')),
    'cognitivo',       jsonb_build_object('registrado', EXISTS(SELECT 1 FROM public.scores_candidato WHERE candidatura_id=p_candidatura_id AND tipo='cognitivo'))
  ) INTO r;
  RETURN r;   -- NEUTRAL — presence booleans only (RNF-07a).
END; $$;
REVOKE ALL ON FUNCTION public.get_avaliacao_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_avaliacao_status(uuid) TO authenticated;
```
> The exact `respostas_avaliacao.teste` values for `em_andamento` (per-test) need confirmation against the SJT/redação/cognitivo screens' autosave keys — see Open Q3.

### Example 7 — UX-01 copy replacements (verbatim map from 26-UI-SPEC)
```
AvaliacaoContainer.tsx:209  → "Você concluiu todas as avaliações desta etapa. Acompanhe o andamento pelo seu painel."
RedacaoEditorScreen.tsx:278 → "Acompanhe o andamento pelo seu painel."
DevolutivaBigFiveView.tsx:157→ "Volte em alguns instantes. Acompanhe o andamento pelo seu painel."
ProvaCognitivaScreen.tsx:82 → "Prova registrada. Acompanhe o andamento pelo seu painel."   (+ update prose :18 to quote it)
SolicitarRevisaoCTA.tsx:45  → "Sua solicitação será enviada à equipe responsável, que revisará a decisão. Acompanhe o andamento pelo seu painel."
SuporteRHPage.tsx:162-163   → "Recebemos sua solicitação e nossa equipe técnica irá analisá-la em breve. Acompanhe o andamento pelo seu painel."
```
```typescript
// New guard src/__tests__/guards/wait-state-copy.grep.test.ts — mirror n8n-bundle guard (node:fs, comment-aware).
// Scope to the 6 files above ONLY (do NOT global-ban e-mail — RedefinirSenhaPage / AutorizacoesStep / the RH
// "Notificar candidato por email" toggle are legitimate). Ban patterns: /avisaremos[\s\S]*por e-?mail/i
// and /receber[áa][\s\S]*por e-?mail/i . Assert AutorizacoesStep consent copy is NOT flagged (allow sub-test).
```

### Example 8 — n8n `AFTER INSERT ON candidatos` server-side dispatch
```sql
-- Mirror of supabase/migrations/20260706110005_sec03_n8n_serverside.sql (VERIFIED). No PII in body.
CREATE OR REPLACE FUNCTION public.trg_n8n_novo_candidato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_base text;
BEGIN
  SELECT decrypted_secret INTO v_base FROM vault.decrypted_secrets WHERE name = 'n8n_webhook_base';
  IF v_base IS NULL THEN RETURN NEW; END IF;                      -- graceful-skip until Fernando sets it
  PERFORM net.http_post(
    url := v_base || '/novo-candidato',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('event','candidato.created','timestamp', now(),
                               'data', jsonb_build_object('candidato_id', NEW.id)));  -- NO nome/email/cpf/telefone
  RETURN NEW;                                                     -- RNF-07a: never writes candidatos
END; $$;
REVOKE ALL ON FUNCTION public.trg_n8n_novo_candidato() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_n8n_novo_candidato ON public.candidatos;
CREATE TRIGGER trg_n8n_novo_candidato AFTER INSERT ON public.candidatos
  FOR EACH ROW EXECUTE FUNCTION public.trg_n8n_novo_candidato();
```

### Example 9 — extend the n8n bundle grep guard
```typescript
// src/__tests__/guards/n8n-bundle.grep.test.ts — add the hstgr host + PII field literals.
// The current guard explicitly EXCLUDES 'n8n.srv881294.hstgr.cloud' (:22-26). Phase 26 removes that
// carve-out and ADDS it. Ban tokens in build/ AND src/: 'n8n.srv881294.hstgr.cloud' and the PII payload
// field names shipped by notifyCandidatoCriado (e.g. the object literal 'nome_completo'+'cpf'+'telefone'
// co-located with an n8n host). Keep the no-false-positive sub-tests (don't flag unrelated 'cpf' schema fields).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-tier `fetch` to hardcoded n8n URL with PII | Server-side `AFTER` trigger via pg_net + Vault, no PII | SEC-03 (Phase 24) established it; Phase 26 applies it to the last leak (`candidatos`) | URL never ships in the bundle; PII stays server-side (LGPD). `[VERIFIED: 20260706110005]` |
| MC score over answered questions only + overwrite | Score over full battery + hard re-submit lock + completeness | FUNIL-01 (this phase) | Non-manipulable, single authoritative score. `[CITED: 26-CONTEXT]` |
| `pontuar_cognitivo` accepts interview stages only | Also accepts `avaliacao_assincrona` (Option A) | FUNIL-08 (this phase) | Cognitivo reachable as an async assessment. `[VERIFIED: 20260625000001:99]` |

**Deprecated/outdated:**
- The 2-arg `pontuar_cognitivo(uuid, jsonb)` overload — already `DROP`ed in `20260625000001:66`. Do not edit it. `[VERIFIED]`
- `entry.status` on `testes_aplicaveis` elements — a phantom field; FUNIL-12 removes the read. `[VERIFIED: schema vs AvaliacaoContainer.tsx:312]`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A **second, unversioned** unique index/constraint on `candidaturas(candidato_id, vaga_id)` WITHOUT a `deleted_at` filter exists in PROD (the FUNIL-10 root cause). Could not query PROD directly (Supabase MCP tools are not callable from the research agent — upstream tool-restriction bug). Asserted by M4-SYSTEM-AUDIT A27. | Runtime State Inventory, Example 5, Pitfall 7 | If it does NOT exist, FUNIL-10 is a no-op and re-inscription is already working — but the smoke (insert→soft-delete→re-insert) is still the correct acceptance proof either way. Discovery SQL is provided; verify at exec time before dropping. |
| A2 | `respostas_avaliacao.teste` uses the value `'sjt'` for the SJT MC autosave (for the `iniciado`/em_andamento boolean). The table comment says "'sjt' or a teste id from testes_aplicaveis". | Example 6, Open Q3 | If the SJT screen writes a different key, the `iniciado` boolean mis-reports em_andamento. Confirm against the SJT MC/redação/cognitivo autosave callers before finalizing the status RPC. |
| A3 | Each candidate-facing test maps to exactly one `scores_candidato.tipo` (`sjt`/`redacao`/`big_five`/`cognitivo`) for the `registrado` boolean, and the open case is `subtipo='caso_aberto'`. | Example 6, Pitfall 2 | If a test writes an unexpected `tipo`, its card never flips to Concluído. Verify tipos actually written by `avaliar-redacao`/bigfive/cognitivo before shipping. |
| A4 | The remote n8n workflow can tolerate (or is dormant for) the id-only body; no candidate-facing feature depends on the old PII payload. n8nService has zero runtime callers. | Runtime State Inventory, Pitfall 9 | If some flow silently relied on the PII payload, it stops receiving it — acceptable per SEC-03 minimal-scope, but flag to Fernando. |

**These four assumptions should be confirmed during planning/discuss or resolved by the execution-time PROD discovery — none blocks planning.**

## Open Questions

1. **Reset of old `scores_candidato` MC rows for UAT.** The re-submit lock will block re-scoring any candidatura that already has an MC row from the old algorithm.
   - What we know: the [TESTE]-funil candidatura(s) used for live UAT likely already have an MC row.
   - What's unclear: whether to hard-delete those rows so a fresh complete submit can prove the new logic live.
   - Recommendation: include a scoped `DELETE FROM scores_candidato WHERE candidatura_id = '<teste>' AND tipo='sjt'` as a UAT-prep step in the BLOCKING apply wave (test data only, never production candidates).

2. **Empty/absent battery behavior.** If a vaga's `testes_aplicaveis` has no SJT element or `itens_ids=[]` and no `cargo` match, `v_expected = 0`.
   - Recommendation: RAISE a clear error (`'bateria SJT nao configurada'`) rather than silently scoring 0/0 — but confirm no live vaga is in that state first (a config gap would then block submit). Ties to `publish_vaga` deriving the battery.

3. **`respostas_avaliacao.teste` key per test (for `em_andamento`).** The neutral status RPC's `iniciado` boolean needs the exact autosave key each screen writes.
   - Recommendation: grep the SJT MC / redação / cognitivo autosave callers (`useAutosaveAvaliacao`, `upsertResposta` call sites) during planning to lock the key map; the container test then asserts em_andamento renders correctly.

4. **Should the client also send picks for the open case through `pontuar_sjt`?** No — the open case goes to `avaliar-redacao` (EF). Confirm the client never routes `caso_aberto` picks into `pontuarSjt` (Pitfall 2). Verified the two paths are separate in `avaliacaoService`; note for the planner to keep them separate.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP `apply_migration`/`execute_sql` | FUNIL-01/07/08/10/12 + n8n migrations & PROD index discovery | ✓ (used Phases 6-25) | linked project `isljnozzlvckrgjjbjwp` | None — this is THE apply path (bypasses 42601). `[VERIFIED: STATE.md]` |
| `pg_net` extension | n8n trigger `net.http_post` | ✓ enabled | `20260609000001:47` | Trigger graceful-skips if unusable. `[VERIFIED]` |
| Supabase Vault | trigger reads `n8n_webhook_base` | ✓ (SEC-03 reads it) | — | Secret itself is NULL until Fernando creates it → graceful-skip. `[VERIFIED]` |
| Vitest + happy-dom | unit/component/guard tests | ✓ | `^4.1.9` | None needed. `[VERIFIED: package.json]` |
| `psql`/SQL runner for smokes | behavioral smokes | ✓ via MCP `execute_sql` / Supabase SQL Editor | — | Same channel as migrations. `[VERIFIED: sec05_08_smokes.sql:27]` |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** Vault secret `n8n_webhook_base` (human-action) — trigger graceful-skips until set.

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section drives VALIDATION.md.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.9` (unit/component/grep-guards, happy-dom) + raw SQL behavioral smokes (the DB acceptance gate) + Deno (EF corpus — not touched this phase) |
| Config file | `vite.config.ts` (`test` block: `globals:true`, `environment:'happy-dom'`, `setupFiles:['./tests/setup.ts']`, `include:['**/__tests__/**/*.{test,spec}.{ts,tsx}']`) `[VERIFIED]` |
| Quick run command | `npx vitest run <path/to/file.test.ts>` |
| Full suite command | `npm run test:run` (currently 784/784 green; keep it green) `[VERIFIED: STATE.md]` |
| SQL smoke run | Supabase SQL Editor / MCP `execute_sql`, AFTER the migration applies (Phase 24/25 pattern) |
| CI gate | `.github/workflows/ci.yml`: tsc frozen baseline **107** (red on growth) + `npm run test:run` + blocking `deno test` + playwright + LHCI `[VERIFIED]` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command / Proof | File Exists? |
|--------|----------|-----------|---------------------------|-------------|
| FUNIL-01 | duplicate pergunta → RAISE | SQL smoke | `execute_sql` smoke: submit with a repeated pergunta_id → expect EXCEPTION | ❌ Wave 0 (`supabase/tests/funil01_pontuar_sjt_smokes.sql`) |
| FUNIL-01 | denominator over full battery (complete honest submit scores correctly) | SQL smoke | seed a 3-MC battery, submit all correct → score == full max; partial denominator NOT used | ❌ Wave 0 (same file) |
| FUNIL-01 | incomplete submit → RAISE | SQL smoke | submit a subset of the battery → expect EXCEPTION `bateria incompleta` | ❌ Wave 0 (same file) |
| FUNIL-01 | re-submit lock (non-'falhou' MC row exists → RAISE) | SQL smoke | submit twice → 2nd raises 42501; assert exactly ONE MC row | ❌ Wave 0 (same file) |
| FUNIL-01 | RNF-07a: never writes candidaturas.status | SQL smoke | assert `candidaturas.status`/`etapa_atual` unchanged after scoring | ❌ Wave 0 (same file) |
| FUNIL-01 | client maps 42501/duplicate errors to neutral LOCKED/DATABASE_ERROR | unit | `npx vitest run src/features/avaliacao/__tests__/avaliacaoService.*.test.ts` (extend) | ⚠️ extend existing |
| FUNIL-07 | cross-battery pergunta_id rejected server-side | SQL smoke | submit a valid-but-foreign pergunta_id → expect EXCEPTION 42501 | ❌ Wave 0 (`funil01_pontuar_sjt_smokes.sql` — same surface) |
| FUNIL-07 | client filters perguntas by itens_ids-else-cargo | unit | `npx vitest run` new `getAvaliacaoContext` filter test (mock supabase; assert `.in('id',itens)` / `.eq('cargo',…)`) | ❌ Wave 0 |
| FUNIL-08 | `pontuar_cognitivo` accepts `avaliacao_assincrona` (and still interview stages) | SQL smoke | submit during avaliacao_assincrona → registrado; interview stage → still registrado | ❌ Wave 0 (`funil08_pontuar_cognitivo_smokes.sql`) |
| FUNIL-08 | route↔gate contract (card etapa == RPC-accepted etapa) | contract (Vitest) | `npx vitest run src/features/avaliacao/**/*cognitivo-contract*.test.ts` (mirror testeContract.test.ts) | ❌ Wave 0 |
| FUNIL-08 | cognitivo card renders IFF aplica_cognitivo && routes to real path | component | `npx vitest run src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx` (extend) | ⚠️ extend existing |
| FUNIL-10 | insert→soft-delete→re-insert succeeds (no 23505) | SQL smoke | disposable fixture: insert candidatura, soft-delete, re-insert same (candidato,vaga) → no 23505; assert only the partial index remains via pg_indexes | ❌ Wave 0 (`funil10_reinscricao_smoke.sql`) |
| FUNIL-12 | neutral status RPC returns booleans only (no score/status leak) | SQL smoke | candidate JWT calls `get_avaliacao_status` → only booleans; foreign candidatura → 42501 | ❌ Wave 0 (`funil12_status_rpc_smoke.sql`) |
| FUNIL-12 | card state derived from own rows, phantom `entry.status` gone | component | `AvaliacaoContainer.test.tsx` — assert Concluído/Pendente/Em andamento from RPC data; grep-assert no `entry.status` read | ⚠️ extend existing |
| UX-01 | e-mail promise banned in 6 wait-state files; canonical string present | grep guard | `npx vitest run src/__tests__/guards/wait-state-copy.grep.test.ts` | ❌ Wave 0 |
| UX-01 | AutorizacoesStep consent copy NOT flagged | grep guard (sub-test) | same file — allowed-literal sub-test | ❌ Wave 0 |
| n8n | trigger fires no-PII body / graceful-skips when secret NULL / never writes candidatos | SQL smoke | insert a disposable candidato with secret NULL → no error, no PII; assert candidatos row unchanged | ❌ Wave 0 (`n8n_novo_candidato_smoke.sql`) |
| n8n | hstgr host + PII literals absent from build/ + src/ | grep guard | `npm run build && npx vitest run src/__tests__/guards/n8n-bundle.grep.test.ts` (extended) | ⚠️ extend existing |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched test file>` (quick) + tsc must stay ≤ 107.
- **Per wave merge:** `npm run test:run` (full Vitest) green; the SQL smokes for the wave's DB surface run in the BLOCKING apply step.
- **Phase gate:** Full Vitest green + all SQL behavioral smokes PASS on PROD (NOTICE, no EXCEPTION) + `npm run build` clean (n8n guard `build/` leg) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `supabase/tests/funil01_pontuar_sjt_smokes.sql` — FUNIL-01 + FUNIL-07 server (dedup/denominator/completeness/re-submit-lock/battery-membership/no-candidaturas-write)
- [ ] `supabase/tests/funil08_pontuar_cognitivo_smokes.sql` — etapa relax (async + interview)
- [ ] `supabase/tests/funil10_reinscricao_smoke.sql` — insert→soft-delete→re-insert + pg_indexes assertion
- [ ] `supabase/tests/funil12_status_rpc_smoke.sql` — neutral booleans + ownership 42501
- [ ] `supabase/tests/n8n_novo_candidato_smoke.sql` — no-PII body + graceful-skip
- [ ] `src/__tests__/guards/wait-state-copy.grep.test.ts` — UX-01 regression net (scoped to 6 files)
- [ ] `src/features/avaliacao/**/cognitivo-contract.test.ts` — route↔gate contract (mirror testeContract.test.ts)
- [ ] new `getAvaliacaoContext` battery-filter unit test
- [ ] extend `AvaliacaoContainer.test.tsx` (cognitivo card gate/route + card-state-from-RPC)
- [ ] extend `avaliacaoService.*.test.ts` (pontuarSjt error mapping for new RAISEs)
- [ ] extend `n8n-bundle.grep.test.ts` (add hstgr host + PII literals; drop the carve-out)

*(The smokes are the load-bearing gate: structural greps pass while behavior breaks — Phase 24/25 proved smokes catch what greps miss.)*

## Security Domain

> `security_enforcement` is ON (per phase brief; not disabled in config). Each PLAN.md needs a `<threat_model>` block.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No new auth; existing JWT/Custom Access Token Hook unchanged |
| V3 Session Management | no | Unchanged |
| V4 Access Control | **yes** | Ownership + etapa checks inside every DEFINER RPC (`auth.uid()` owns candidatura); `scores_candidato` candidate-DENY row policy; neutral status RPC 42501 on foreign candidatura `[VERIFIED: 20260611000001:80-90 + 20260611000004:55-66]` |
| V5 Input Validation | **yes** | Server-authoritative rejection of duplicate / cross-battery / incomplete / re-submit in `pontuar_sjt`; battery-membership check; open-case excluded from MC count `[CITED: 26-CONTEXT decisions]` |
| V6 Cryptography | no | Vault manages the n8n secret; no hand-rolled crypto |
| V7 Error Handling | **yes** | RAISE with precise SQLSTATE (42501/22023) mapped to neutral client copy; no score/gabarito in error payloads |
| V9 Data Protection (LGPD) | **yes** | No PII in the n8n webhook body; no gabarito/score to the candidate; grep guards ban re-introduction `[VERIFIED: SEC-03 precedent]` |

### Known Threat Patterns for {Supabase RPC + React SPA + pg_net}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client forges a high SJT score / posts a `score` field | Tampering | `pontuar_sjt` re-derives Σ peso server-side from `perguntas_opcao_sjt`; ignores any client score; NEUTRAL return `[VERIFIED]` |
| Duplicate/subset answers inflate the % | Tampering | Dedup RAISE + full-battery denominator + completeness RAISE `[CITED: 26-CONTEXT]` |
| Re-submit overwrites a recorded score without a trail | Tampering / Repudiation | Hard re-submit lock (RAISE on existing non-'falhou' MC row) `[CITED: 26-CONTEXT]` |
| Cross-cargo/battery question injection into scoring | Tampering / IDOR | Server-side `pergunta_id ∈ battery` RAISE 42501 (client filter is UX only) `[CITED: 26-CONTEXT]` |
| Candidate reads own score/gabarito/threshold | Information Disclosure | `scores_candidato` row-deny; status RPC returns booleans only; `get_opcoes_sjt` projects id+texto only `[VERIFIED: 20260611000001 + 20260611000002:107-130]` |
| Candidate reads another candidatura's status | IDOR | Status RPC ownership check → 42501 `[VERIFIED pattern]` |
| n8n webhook URL / candidate PII ships in the public bundle | Information Disclosure | Server-side `AFTER INSERT` trigger (pg_net + Vault); delete client subtree; grep guard bans host + PII literals `[VERIFIED: SEC-03]` |
| Forged n8n webhook (URL enumerable) | Spoofing / DoS | URL never leaves the server (Vault); body carries no PII to leak even if the endpoint is hit |
| Cognitivo submit bypasses etapa | Tampering | RPC etapa gate (add avaliacao_assincrona, keep interview stages) — ADD not replace `[VERIFIED: 20260625000001:99]` |

### `<threat_model>` seeds for the planner (per sensitive surface)
- **`pontuar_sjt`** — assets: gabarito (peso/tag), score. Threats: score forgery, inflation, cross-battery, re-submit. Controls: DEFINER re-derivation, dedup/completeness/membership/lock RAISEs, candidate-DENY sink, neutral return. Proof: `funil01_pontuar_sjt_smokes.sql`.
- **`get_avaliacao_status`** — assets: verdict. Threats: score/status leak, IDOR. Controls: booleans-only projection, ownership 42501. Proof: `funil12_status_rpc_smoke.sql`.
- **`trg_n8n_novo_candidato`** — assets: candidate PII, webhook URL. Threats: bundle leak, PII in body. Controls: server-side dispatch, Vault URL, id-only body, graceful-skip, grep guard. Proof: `n8n_novo_candidato_smoke.sql` + extended `n8n-bundle.grep.test.ts`.

## Project Constraints (from CLAUDE.md)

The planner MUST honor these — they carry locked-decision authority:
- **Idioma:** domínio em pt-BR (mensagens, enums), código técnico em en. New copy strings are pt-BR. `[VERIFIED]`
- **NUNCA** usar `supabaseAdmin`/service_role key no client-side. All privileged work is DEFINER RPCs / triggers. `[VERIFIED]`
- **RLS habilitado em 100%** das tabelas com dados de usuário. Do not add a candidate SELECT policy to `scores_candidato`. `[VERIFIED]`
- **Duplicate check via RPC SECURITY DEFINER** (não anon SELECT) — FUNIL-10 keeps the partial unique index + 23505 mapping. `[VERIFIED]`
- **Linguagem de produto:** "avaliação comportamental/cognitiva" (nunca "teste psicológico") — the LGPD-04 `forbidden-strings` guard already enforces this; new cognitivo card copy complies. `[VERIFIED]`
- **Sistema NUNCA rejeita candidato automaticamente por score (RNF-07a)** — `pontuar_sjt`/`pontuar_cognitivo`/status RPC never write `candidaturas`. `[VERIFIED]`
- **`database.types.ts` NUNCA editar manualmente** — regen is Phase 27; new RPCs (`get_avaliacao_status`) use a NARROW confined cast until then (mirror `cognitivoService.listItens`'s `get_cognitivo_itens` cast). `[VERIFIED: cognitivoService.ts:162-169]`
- **Migrations:** apply via Supabase MCP `apply_migration` (bypasses 42601); NO `db push` step; NO `BEGIN/COMMIT` wrapper; `SET search_path = ''` on every function. `[VERIFIED: CLAUDE.md §Migrations]`
- **Componentes:** PascalCase.tsx, export nomeado; features em `src/features/<dominio>/`. `[VERIFIED]`

## Sources

### Primary (HIGH confidence — read directly this session)
- `supabase/migrations/20260611000004_pontuar_sjt_rpc.sql` — the `pontuar_sjt` to rewrite (marked/scored/maxes CTEs, ON CONFLICT, authz).
- `supabase/migrations/20260611000001_scores_candidato.sql` — the score sink, `UNIQUE NULLS NOT DISTINCT` key, candidate-DENY RLS.
- `supabase/migrations/20260611000002_perguntas_sjt.sql` — SJT bank, `perguntas_opcao_sjt` (no candidate SELECT), `get_opcoes_sjt`, seed.
- `supabase/migrations/20260611000003_respostas_avaliacao.sql` — autosave table + back-lock RLS.
- `supabase/migrations/20260625000001_phase14_gap_closure.sql` — the LIVE 5-arg `pontuar_cognitivo` (etapa gate to relax).
- `supabase/migrations/20260624000003_pontuar_cognitivo_rpc.sql` — the DROPed 2-arg overload (do not edit).
- `supabase/migrations/20260706110005_sec03_n8n_serverside.sql` — the SEC-03 server-side trigger precedent to mirror.
- `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql` — the CORRECT partial unique index (keeper).
- `src/features/avaliacao/services/avaliacaoService.ts` — `getAvaliacaoContext` (:98-166), `pontuarSjt` (:261-300), allowlist idiom.
- `src/features/avaliacao/components/AvaliacaoContainer.tsx` — `deriveCards` (:303-326), `CONTAINER_TESTE_CONFIG` cognitivo stub (:88-93), all-done copy (:209), phantom `entry.status` (:312).
- `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx` + `services/cognitivoService.ts` — screen gates on `aplica_cognitivo` only; RPC call signature.
- `src/features/cadastro/services/n8nService.ts` + `index.ts` — hstgr URLs (:122-168), `notifyCandidatoCriado` PII (:388-417), barrel re-export (:11), zero runtime callers (grep).
- `src/lib/testes/testeContract.ts` + `src/lib/navegacao/funilNavMap.ts` — id contract + nav map (FUNIL-05/08 context).
- `src/config-vaga/schemas/testesAplicaveisSchema.ts` — `itens_ids`/`cargo`, no `status` field (phantom proof).
- `src/__tests__/guards/n8n-bundle.grep.test.ts` — guard to extend; current hstgr carve-out (:22-26).
- `supabase/tests/sec05_08_smokes.sql` — the behavioral-smoke pattern (set_config jwt.claims + SET ROLE).
- `vite.config.ts` test block + `.github/workflows/ci.yml` — test framework + CI gates.
- `26-CONTEXT.md`, `26-UI-SPEC.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `CLAUDE.md`.

### Secondary (MEDIUM)
- `.planning/M4-SYSTEM-AUDIT.md` (A8/A17/A18/A27/A41 diagnoses) — referenced via CONTEXT/REQUIREMENTS, not re-opened this session.

### Tertiary (LOW / to verify at exec time)
- PROD `pg_indexes`/`pg_constraint` state for FUNIL-10 (A1) — could not query (MCP tools not callable from research agent); discovery SQL provided.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all surfaces read directly.
- Architecture (RPC rewrites, trigger, index drop, status RPC): HIGH — grounded in the exact live migrations + precedents.
- FUNIL-10 PROD index identity: MEDIUM — asserted by audit; must be discovered in PROD before the drop (A1).
- Status-RPC/em_andamento key mapping: MEDIUM — `respostas_avaliacao.teste` values need one confirming grep (Open Q3 / A2).
- Pitfalls & Validation: HIGH — mirror the Phase 24/25 smoke discipline verified in-repo.

**Research date:** 2026-07-12
**Valid until:** ~2026-08-11 (30 days — stable internal codebase; re-verify the FUNIL-10 index + `respostas_avaliacao` keys at execution time regardless).
