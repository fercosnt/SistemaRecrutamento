# Architecture Research — M8 LGPD-OPS (Retenção, Purga, Direitos do Titular, Fila Art. 20)

**Domain:** Data-governance layer (retention, erasure, portability, human-review queue) bolted onto a LIVE Supabase ATS (Postgres + Auth + Storage + Edge Functions/Deno) already in production with real candidates
**Researched:** 2026-07-29
**Confidence:** HIGH on the codebase integration points (every claim below is grepped from in-repo migrations / EF source / `database.types.ts`, not inferred from the roadmap) · HIGH on the Supabase platform constraints (verified against Supabase docs, not assumed) · MEDIUM on the legal window sizing (LGPD fixes no number; the recommendation is a defensible default, not a statutory one)

> **Scope note.** This is an INTEGRATION study against a system that is already live. The stack is locked. Every recommendation below is expressed as *additive vs. modified* against named files, tables and functions that exist today. The strong project prior — additive integration, never refactor a load-bearing live path — is respected, and where I recommend violating it I say so explicitly and name the risk.

---

## Executive Answer (the 8 decisions, up front)

1. **The central tension is real but the kickoff mis-names its mechanism.** `decisao_final.por_usuario NOT NULL` is the **recruiter's** id, not the candidate's — deleting a candidate never touches it. What *actually* blocks a hard delete is that three audit tables FK to `candidaturas(id)` with **no `ON DELETE` clause at all** (= `NO ACTION`): `historico_candidatura` (`20260607000001:39`), `decisao_final` (`20260607000003:39`), `decisao_final_historico` (`20260709000011:41`). Every other child table CASCADEs. So `DELETE FROM candidaturas` today raises **23503** against exactly the three tables that constitute the audit spine. That is not an accident to work around — it is the invariant, already encoded in DDL. M8 formalizes it; it does not break it.

2. **`bias_audit_log` is NOT an obstacle.** Verified: no FK, no per-candidate rows. `gerar_bias_snapshot()` builds temp tables and inserts **one** row of banded aggregates (`20260625100001:283-340`, source comment: *"BANDED AGGREGATES ONLY (no per-candidate rows; age never persisted per-row)"*). Historical snapshots are already frozen and already anonymous. **But there is a second-order bug the purge will introduce:** the function derives age by JOINing **live** `candidatos.data_nascimento`. Anonymizing that column silently pushes those candidaturas into `v_excluidos` — future snapshots quietly lose the cohort. This needs a fix inside the erasure design, not after it.

3. **Recommendation: anonymize-in-place + explicit tombstone.** Not crypto-shredding, not satellite-table extraction, not pseudonymize-at-write. Reasons and the tradeoff accepted are in §"The Central Tension" below. Short version: LGPD Art. 16 IV *names* anonymization as the conservation basis; FK integrity cost is zero; migration cost against the populated schema is an `UPDATE`, not a re-model; crypto-shredding's legal status as "erasure" is unsettled (EDPB 2025 pseudonymisation guidance treats data as still personal while any re-identifying key exists). **Tradeoff accepted: irreversibility, and free-text residue in `justificativa` / `criterio_texto` that anonymization does not reach.**

4. **SQL cannot delete Storage blobs — verified, and it got stricter.** Supabase docs: storage schema tables are read-only from SQL; a `DELETE FROM storage.objects` removes metadata and **orphans the S3 object** (inaccessible but still billed). Since the 2026-03 Storage release a statement-level trigger **rejects** `DELETE` on storage schema tables unless the session var `storage.allow_delete_query = true` (which only the Storage API sets). → **The purge's Storage half is Edge-Function-only.** And: **an Auth user cannot be deleted while they own Storage objects** — with the `{auth.uid()}/{uuid}.pdf` path schema, `storage.objects.owner = auth.uid()`, so the ordering **Storage → Auth is forced by the platform**, not by preference.

5. **The Art. 20 notification does NOT fit `notificar-candidato`'s event switch — and half of it is a different channel entirely.** `EVENTOS_VALIDOS` (`index.ts:66-71`) and the **live CHECK constraint** `evento IN ('confirmacao','avanco','convite','decisao')` (`20260721000001:75`) both hard-code four candidate-facing events, and recipient resolution is wired to `candidatos.nome_completo, email`. The *request* notification goes to the **RECRUITER** → new sibling EF `notificar-rh` sharing the `_shared/` templates and the same `notificacoes_enviadas` ledger via a new `destinatario_tipo` column. The *answer* notification goes to the candidate → that one **does** belong in `notificar-candidato`, and is the single place that live file must be modified.

6. **Purge orchestration: nominate in SQL, execute in an EF, confirm in a durable table.** `pg_cron` never deletes anything. It selects a capped batch into `solicitacoes_titular` and fires `net.http_post` at `executar-direito-titular`. Because `pg_net` is at-most-once and a 404 is silently dropped (this project already has `notif-retry-sweep` `*/15` precisely because of that), the durable queue + a claim-with-lease + a sweeper are mandatory, not optional.

7. **Export before erasure.** The "what data do we hold about this person" inventory is the *same* query the purge needs. Build it once as a read-only export (Art. 18 V/VI), prove it, then reuse it as the erasure plan. This flips the intuitive order and is the single highest-leverage sequencing decision in the milestone.

8. **Highest-risk piece, named: the erasure engine's Storage ↔ Postgres ↔ Auth boundary (recommended Phase 45).** It is an un-atomic three-system mutation, with irreversible failure modes, against live production data, on a project where subagents have no Supabase MCP so every apply is a human checkpoint. Runner-up risk: the `notificar-candidato` event-vocabulary edit — the one live path that has already burned this project twice (P39 CR-01/CR-02).

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND  (React 18 SPA · TanStack Query v5 · Zustand role store)            │
├──────────────────────────────────────────────────────────────────────────────┤
│  CANDIDATO (mobile-first)              │  RH / ADMIN (desktop-first)          │
│  ┌──────────────────┐ ┌─────────────┐  │  ┌──────────────┐ ┌───────────────┐ │
│  │ Meus Dados       │ │ Solicitar   │  │  │ Fila Art. 20 │ │ Painel de     │ │
│  │ (export/baixar)  │ │ exclusão    │  │  │ + SLA 15d    │ │ Retenção      │ │
│  └────────┬─────────┘ └──────┬──────┘  │  └───────┬──────┘ └──────┬────────┘ │
│           │  src/features/lgpd/        │          │ src/features/lgpd/       │
├───────────┼──────────────────┼─────────┼──────────┼───────────────┼──────────┤
│           ▼                  ▼         │          ▼               ▼          │
│  EDGE FUNCTIONS (Deno · service_role · authenticate-THEN-authorize)          │
│  ┌───────────────────────┐ ┌─────────────────────────┐ ┌───────────────────┐ │
│  │ exportar-dados-       │ │ executar-direito-titular│ │ notificar-rh      │ │
│  │ candidato   [NEW]     │ │              [NEW]      │ │        [NEW]      │ │
│  │ · allowlist inventory │ │ · claim-with-lease      │ │ · RH recipient    │ │
│  │ · streams JSON        │ │ · Storage.remove()      │ │   resolution      │ │
│  │ · CV via signed URL   │ │ · RPC anonimização      │ │ · same ledger     │ │
│  └───────────────────────┘ │ · auth.admin.deleteUser │ └─────────┬─────────┘ │
│                            └────────────┬────────────┘           │           │
│  ┌───────────────────────────────────────────────────────────────┼─────────┐ │
│  │ notificar-candidato  [MODIFIED — 5th evento 'revisao_respondida']        │ │
│  └───────────────────────────────────────────────────────────────┴─────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│  POSTGRES                                                                     │
│  ┌────────────────────┐  ┌──────────────────────┐  ┌───────────────────────┐ │
│  │ politica_retencao  │  │ solicitacoes_titular │  │ candidatos_anonimizados│ │
│  │ [NEW · kill switch]│  │ [NEW · durable queue]│  │ [NEW · tombstone]      │ │
│  └────────────────────┘  └──────────────────────┘  └───────────────────────┘ │
│  RPCs [NEW]: solicitar_exclusao_dados · executar_anonimizacao ·               │
│              responder_revisao_decisao · selecionar_candidatos_expirados ·    │
│              despachar_purga                                                  │
│  TRIGGERS [NEW]: trg_notif_revisao_solicitada · trg_notif_revisao_respondida  │
│                  (AFTER UPDATE OF … ON decisao_final)                         │
│  ┌───────────── AUDIT SPINE — FK NO ACTION, survives every purge ──────────┐  │
│  │  historico_candidatura   decisao_final   decisao_final_historico        │  │
│  │  (+ bias_audit_log — no FK at all, already aggregate-anonymous)         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│  pg_cron                        │  STORAGE (private buckets)                  │
│  · lgpd-retencao-sweep (daily)  │  · curriculos  {auth.uid()}/{uuid}.pdf      │
│  · lgpd-purge-sweep   (*/15)    │  · avatars     (perfil RH / candidato)      │
│  · notif-retry-sweep  (*/15)⟵live│  ⚠ SQL CANNOT delete blobs (verified)      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New / Modified | Implementation |
|-----------|----------------|----------------|----------------|
| `politica_retencao` | The retention *decision*, per candidatura state; carries `purga_ativa` (kill switch) + `dry_run` | **NEW** table | Single-row config or per-`etapa_processo` rows; precedent = `configuracoes_empresa.dias_retencao_logs` + `config_sla_etapa` |
| `solicitacoes_titular` | Durable work queue + audit for every Art. 18 exercise (exclusão, portabilidade) **and** every retention-nominated purge | **NEW** table | `origem ('titular'\|'retencao')`, `status`, `plano jsonb`, `tentativas`, `claimed_at`, `agendado_para`; UNIQUE on `(candidato_id, origem, status)` partial |
| `candidatos_anonimizados` | Tombstone / proof-of-execution. Survives forever, holds zero PII | **NEW** table | `candidato_id` (kept as opaque UUID), `anonimizado_em`, `base_legal`, `artefatos jsonb` (counts, not values), `faixa_etaria` |
| `executar-direito-titular` | The **only** thing allowed to mutate across Storage + Postgres + Auth | **NEW** EF | Self-auth Bearer via Vault (mirror `notificar-candidato`), `--no-verify-jwt`, deps-injectable for tests |
| `exportar-dados-candidato` | Read-only PII inventory → JSON stream + short-TTL signed CV URL | **NEW** EF | authenticate-THEN-authorize + own-row check; allowlist per table |
| `notificar-rh` | RH-facing transactional email (Art. 20 request landed) | **NEW** EF | Clone of `notificar-candidato` skeleton; shares `_shared/email-config.ts` + `email-templates.ts` |
| `notificar-candidato` | Candidate-facing email dispatcher | **MODIFIED** | +1 evento, +1 template, +1 dedupe grammar branch |
| `notificacoes_enviadas` | Ledger / idempotency / retry queue | **MODIFIED** | CHECK constraint swap + `destinatario_tipo` column + its own retention rule (P37 deferred it here explicitly) |
| `gerar_bias_snapshot()` | EEOC 4/5 evidence | **MODIFIED** | Must stop depending solely on live `data_nascimento` |
| Audit spine (3 tables) | Evidentiary record of every decision | **UNTOUCHED** | The FK `NO ACTION` stays; this is the invariant |
| `avancar_etapa()` | Single writer of `historico_candidatura` | **UNTOUCHED — D-12** | Never edited, in any phase |

---

## The Central Tension: purge vs. append-only audit trail

### What the code actually says (verified, not assumed)

```
candidaturas (id)
  ├─ NO ACTION  ← historico_candidatura.candidatura_id      20260607000001:39
  ├─ NO ACTION  ← decisao_final.candidatura_id  (UNIQUE)    20260607000003:39
  ├─ NO ACTION  ← decisao_final_historico.candidatura_id    20260709000011:41
  ├─ CASCADE    ← respostas_avaliacao / scores_candidato / redacoes_candidato(+_em_progresso)
  ├─ CASCADE    ← entrevistas_online / entrevista_analises / cognitivo_respostas
  ├─ CASCADE    ← agendamentos_entrevista / devolutivas_candidato / analise_candidato_vaga
  └─ CASCADE    ← notificacoes_enviadas
candidatos (id)
  ├─ SET NULL   ← ai_call_logs / candidate_ai_decisions / (prompt_library satellites)
  └─ CASCADE    ← notificacoes_enviadas.candidato_id, autorizacoes.candidato_id
bias_audit_log — NO FK AT ALL. dados jsonb = banded aggregates. Untouched by any purge.
```

So the schema already *decided*: the funnel's evidence survives; the candidate's raw material does not. M8's job is to make that decision explicit and executable, not to re-litigate it.

### The four candidate strategies, compared honestly

| Criterion | **A. Anonymize-in-place + tombstone** | B. Crypto-shredding | C. PII satellite table | D. Pseudonymize at write |
|---|---|---|---|---|
| Reversibility | **Irreversible by construction** (overwrite) | Reversible until the key is destroyed — and *that is the legal problem* | Irreversible (DROP the row) | Reversible while the map exists |
| FK integrity | **Zero impact** — spine UUIDs unchanged | Zero impact | Requires a new FK + backfill; `candidatos.id` still referenced from 8+ places | Zero impact |
| RLS implications | **None** — own-row / vaga-scoped join-through predicates all key on unchanged UUIDs | New policy surface for the keystore (a service_role-only secret store) | Every candidate-facing read must now join a second table → every allowlist rewritten | None |
| Migration cost vs. populated schema | **One `UPDATE` + one tombstone insert.** No re-model | Encryption boundary on every PII write path (`cadastrar-candidato`, `submit-candidatura`, perfil) **and** every allowlist read (`notificar-candidato` reads `nome_completo, email` in plaintext today) | ~25 columns moved out of `candidatos`; every `select(...)` allowlist in `src/` + 6 EFs rewritten | Same as B, plus it does not help data already collected |
| Defensibility to ANPD | **Highest.** LGPD Art. 16 IV literally conditions conservation on *"desde que anonimizados os dados"*; Art. 12 removes anonymized data from the law's scope | **Contested.** EDPB 2025 pseudonymisation guidance: while a re-identifying key exists the data remains personal; key destruction ≠ anonymisation automatically | High, but the story is "we deleted a table row", which invites "prove nothing else references it" | Weakest — pseudonymised ≠ anonymised under LGPD Art. 5 XI/XII |
| Blast radius on a LIVE system | **Low — additive** | **Very high** | **Very high** | High |

### Recommendation: **A — anonymize-in-place with an explicit tombstone**

**Tradeoffs I am accepting, stated plainly:**

1. **Irreversibility.** A wrongly-triggered erasure cannot be undone. Mitigations: (a) `solicitacoes_titular.status` passes through `pendente_confirmacao` → confirmed by e-mail link → `agendado_para` grace window before execution; (b) `dry_run` writes the computed `plano jsonb` and stops; (c) the tombstone records what happened even though it cannot undo it.
2. **Free-text residue.** `decisao_final.justificativa` (NOT NULL, recruiter-typed) and `historico_candidatura.criterio_texto` can contain a hand-typed candidate name. Anonymize-in-place does not reach them. **Do not regex-scrub these** — that buys false confidence and risks destroying the legal defensibility of the decision. Instead: keep them under Art. 16 I (obrigação legal — prova em eventual litígio), note that their read surface is already RH-only + vaga-scoped, and log this as a **residual, disclosed risk** with a write-time UI hint deferred to a later milestone. A regulator can be told the truth here; a silently-broken regex cannot.
3. **`bias_audit_log` degradation.** Because `gerar_bias_snapshot()` joins live `data_nascimento`, anonymization must **carry a `faixa_etaria` band forward** onto `candidatos_anonimizados` (or onto `candidaturas`) *at anonymization time*, and `gerar_bias_snapshot()` must `COALESCE` to it. This is a **verified-diff modification** of a live SECURITY DEFINER function — apply the M4/DBMIG-02 discipline (`pg_get_functiondef` first, byte-preserved diff, never a blind `CREATE OR REPLACE`).

### The per-artifact deletion ladder (this is the concrete policy the roadmapper needs)

| Artifact | Action | Basis |
|---|---|---|
| `candidatos`: `nome_completo`, `email`, `cpf`, `celular`, `data_nascimento`, `cep`/`logradouro`/`numero`/`complemento`/`bairro`/`cidade`/`estado`, `instagram*`, `linkedin*`, `genero`, `avatar_url`, `como_conheceu*` | **Overwrite** with deterministic tombstone values (`'[anonimizado]'`, NULLs); set `deleted_at`, `ativo=false` | Art. 16 IV |
| `candidatos.data_nascimento` | Overwrite **after** materializing `faixa_etaria` on the tombstone | Preserves EEOC 4/5 auditability |
| CV blob in `curriculos` | **Hard delete via Storage API** (EF only) | No surviving basis; also unblocks Auth delete |
| `candidaturas.curriculo_url` / `curriculo_nome_original` / `curriculo_tamanho_bytes` | NULL | Dangling pointer to a deleted blob |
| `respostas_avaliacao`, `respostas_bigfive`, `redacoes_candidato(+_em_progresso)`, `cognitivo_respostas`, `scores_*`, `devolutivas_candidato`, `entrevista_analises`, `analise_candidato_vaga` | **Hard delete** (already CASCADE-shaped) | Raw behavioural material; the *decision* is the evidence, not the raw responses |
| `historico_candidatura` | **KEEP** (`candidatura_id` + `etapa_de/para` + `criado_em` + `ator` carry no candidate PII once `candidatos` is anonymized) | Art. 16 I |
| `decisao_final` / `decisao_final_historico` | **KEEP** | Art. 16 I + RNF-07a evidence + the Art. 20 record itself |
| `notificacoes_enviadas` | Overwrite `destinatario_email` / `destinatario_original`; **KEEP the row** | The row proves the transactional obligation was met; the address itself has no surviving basis. **This is the retention that P37 explicitly deferred to M8.** |
| `autorizacoes` | **KEEP** the consent record; overwrite `ip_aceite` / `user_agent_aceite` | Art. 37 accountability — deleting the consent proof destroys your own defence |
| `bias_audit_log` | **UNTOUCHED** | Already aggregate-anonymous |
| `logs_auditoria` / `logs_acesso` / `sessoes_ativas` | Existing `limpar_logs_antigos()` window, with the live `categoria NOT IN ('usuario','seguranca')` exemption preserved | Precedent already shipped (`20260713000004`) |
| `auth.users` | `auth.admin.deleteUser(user_id)` — **only after** Storage objects are gone | Platform constraint (verified) |

---

## Where each component belongs (the three-tier assignment)

### Postgres migration (tables, RPCs, triggers, cron)

| Object | Kind | Notes |
|---|---|---|
| `politica_retencao` | table | Also carries `purga_ativa boolean NOT NULL DEFAULT false` (kill switch) and `dry_run boolean NOT NULL DEFAULT true` |
| `solicitacoes_titular` | table | RLS: candidate own-row SELECT/INSERT via `candidatos.user_id = auth.uid()`; **RH/admin read via a DEFINER RPC, not a vaga-scoped policy** — see the deliberate deviation below |
| `candidatos_anonimizados` | table | Append-only. No UPDATE/DELETE policy, `REVOKE` writes from `authenticated`/`anon` (mirror `20260713000004` §2) |
| `solicitar_exclusao_dados(p_motivo)` | RPC DEFINER | Own-row write path. `SET search_path = ''`. Mirror of `solicitar_revisao_decisao` |
| `responder_revisao_decisao(p_candidatura_id, p_resultado)` | RPC DEFINER | Writes `decisao_final.revisao_resultado`. **Role check + vaga-scope + server-enforced min length**, mirroring `rejeitar_candidatura`'s ≥50 rule. There is no RH `UPDATE` policy on `decisao_final` today and there must not be one — `registrar_decisao` is the precedent |
| `executar_anonimizacao(p_candidato_id, p_motivo)` | RPC DEFINER | **All** DB-side mutations in ONE transaction: cascade deletes + PII overwrite + tombstone insert. Keeps the Postgres half atomic even though the whole operation is not |
| `selecionar_candidatos_expirados()` | RPC DEFINER | Reads `politica_retencao` + `autorizacoes.autorizacao_retencao_curriculo`; `INSERT … ON CONFLICT DO NOTHING` into `solicitacoes_titular` |
| `despachar_purga()` | RPC DEFINER | Reads kill switch first; selects a capped batch; `net.http_post` per row |
| `trg_notif_revisao_solicitada` | trigger | `AFTER UPDATE OF revisao_solicitada_em ON decisao_final`, predicate `OLD IS NULL AND NEW IS NOT NULL`. **AFTER UPDATE, not INSERT** — the row already exists; `solicitar_revisao_decisao` UPDATEs it. Body copied verbatim from `trg_notif_transicao` (Vault graceful-skip + `BEGIN…EXCEPTION…RAISE WARNING` fail-open) |
| `trg_notif_revisao_respondida` | trigger | `AFTER UPDATE OF revisao_resultado ON decisao_final`, same NULL→NOT NULL predicate |
| `cron 'lgpd-retencao-sweep'` | cron | Daily, off-peak. Nominates only |
| `cron 'lgpd-purge-sweep'` | cron | `*/15`. Re-drives `pendente` / stale `em_execucao`. Mirror of `notif-retry-sweep` |
| `v_lgpd_purga_status` | view | RH observability: pendentes, em execução, falhas, próximos 30 dias, purgados nos últimos 90 |
| `sla_art20_dias` | config row | **Reuse `config_sla_etapa`** (shipped P37) rather than inventing a second SLA store |

### Edge Function (anything needing service_role, Storage Admin, or outbound HTTP)

| Function | Why it cannot be SQL |
|---|---|
| `executar-direito-titular` | `storage.from('curriculos').remove([...])` — **SQL is blocked by the storage delete-guard trigger and would orphan the blob anyway**; `auth.admin.deleteUser` — Admin API only |
| `exportar-dados-candidato` | `createSignedUrl` (Storage Admin) + streaming a JSON body to the browser |
| `notificar-rh` | Outbound `fetch` to Resend + Vault secret read |
| `notificar-candidato` (mod) | Already an EF |

### Frontend (`src/features/lgpd/`)

Follows the established feature layout (`components/ · hooks/ · services/ · schemas/ · types/`), hierarchical TanStack query keys (`lgpdKeys.filaArt20(filters)`, `lgpdKeys.minhasSolicitacoes()`).

- **Candidate:** `MeusDadosPage` (export/download), `SolicitarExclusaoDialog` (two-step confirm), status card for a pending request. Wires next to the existing `src/features/explicacao/` surface (`SolicitarRevisaoCTA.tsx` already exists — the Art. 20 *request* side is built; only the *answer* side is missing).
- **RH:** `FilaArt20Tab` — clone the shape of `src/features/funil/components/FilaTrabalhoTab.tsx` + `slaThresholds.ts` (badge SLA already solved there); `ResponderRevisaoForm` (calls `responder_revisao_decisao`); `PainelRetencaoPage` (reads `v_lgpd_purga_status`, toggles `purga_ativa`).

---

## The Art. 20 notification — the explicit call-out

**Two events, two recipient classes, and they are not symmetric.**

### Why it does not simply fit the existing switch

| Blocker | Evidence |
|---|---|
| Event vocabulary is closed in **two** places | `EVENTOS_VALIDOS` set (`notificar-candidato/index.ts:66-71`) **and** the live DB CHECK `evento IN ('confirmacao','avanco','convite','decisao')` (`20260721000001:75`). Adding an event = a `DROP CONSTRAINT` / `ADD CONSTRAINT` on a populated production table |
| Recipient resolution is candidate-hard-wired | `candidatos.select('nome_completo, email')` → `resolverDestinatario(candidato.email, …)`; `destinatario_original` + `exigirSinkTeste` are shaped around one candidate address |
| Dedupe grammar assumes one recipient | `montarDedupeKey` → `${candidatura_id}:${evento}` (`helpers.ts:29-40`) |
| Ledger RLS is candidate-DENY by design | `notificacoes_enviadas` has exactly one SELECT policy, RH vaga-scoped join-through; no candidate policy exists (`20260721000001` §4) |

### Recommended split

**(a) Request lands → notify the RECRUITER.** New EF **`notificar-rh`**, not a branch inside `notificar-candidato`.

- Writes to the **same** `notificacoes_enviadas` ledger via a new `destinatario_tipo text NOT NULL DEFAULT 'candidato'` column. Both `candidato_id` and `candidatura_id` stay NOT NULL and stay *true* — the row is *about* a candidatura, it is just addressed to a recruiter. Dedupe grammar extends to `${candidatura_id}:revisao_solicitada`.
- **Why the same ledger is worth it:** retention/purge, the Svix reconciliation EF (`resend-webhook`, keyed on `provider_message_id`), and `varrer_retry_notificacoes()` then all work on the new rows with **zero changes**. A sibling table would fork all three.
- **Why a separate EF and not a branch:** `notificar-candidato` is the highest-blast-radius live component in the system, and it shipped two CRITICAL defects that four gates missed. Every new branch inside it is a candidate-path regression risk. A sibling EF that imports the same `_shared/email-config.ts` + `_shared/email-templates.ts` is additive.
- **Recipient resolution** is genuinely different: `candidaturas.vaga_id → vagas.created_by → usuarios_rh.email` (the vaga owner), with a fallback to `configuracoes_empresa.email_notificacoes[]` when the owner is inactive. That resolution logic has no analogue in the candidate EF.

**(b) Answer written → notify the CANDIDATE.** This one **does** belong in `notificar-candidato`. It is the one surgical modification: `EventoLedger` union + `EVENTO_MAP` + `EVENTOS_VALIDOS` + a `revisao_respondida` template + the CHECK constraint swap. Keep the diff minimal, and — the P39 lesson — do **not** close that phase without VERIFICATION.md and a code review.

**(c) The `revisao_resultado` write path does not exist at all today.** `grep revisao_resultado src/` returns only the candidate read side. The RH screen + the `responder_revisao_decisao` DEFINER RPC are net-new, and the RPC (not a client `UPDATE`) is what makes `trg_notif_revisao_respondida` fire from a single auditable write path.

---

## Purge orchestration — the safe pattern

```
pg_cron 'lgpd-retencao-sweep'  (daily 03:30 BRT)
    │
    └─► selecionar_candidatos_expirados()          [SQL · DEFINER · nominates only]
            · JOIN politica_retencao × candidaturas.etapa_atual × historico.criado_em
            · AND autorizacoes.autorizacao_retencao_curriculo = false
              (the consent flag finally gets a consumer)
            · INSERT INTO solicitacoes_titular (origem='retencao', status='pendente',
              agendado_para = now() + grace) ON CONFLICT DO NOTHING   ← idempotent
                                    │
pg_cron 'lgpd-purge-sweep' (*/15)   │
    └─► despachar_purga()           ▼
            · IF NOT purga_ativa THEN RETURN;                      ← KILL SWITCH, read every tick
            · SELECT … WHERE status IN ('pendente','em_execucao')
                        AND agendado_para <= now()
                        AND tentativas < 5
              ORDER BY criado_em LIMIT 20                          ← BATCH CAP
            · per row: net.http_post('/functions/v1/executar-direito-titular',
                                     {solicitacao_id}, Bearer edge_invoke_key)
                                    │  (at-most-once — fine, the sweep re-drives)
                                    ▼
EF executar-direito-titular
    1. self-auth Bearer (Vault)                             — mirror notificar-candidato
    2. CLAIM WITH LEASE:
       UPDATE solicitacoes_titular SET status='em_execucao', tentativas=tentativas+1,
              claimed_at=now()
        WHERE id=$1 AND status IN ('pendente','em_execucao')
          AND (claimed_at IS NULL OR claimed_at < now() - interval '10 minutes')
       RETURNING *          → 0 rows = someone else owns it → 200, no-op
    3. BUILD PLAN → solicitacoes_titular.plano jsonb        ⚠ LOAD-BEARING (see below)
       IF dry_run → stop here, status='simulada', 200
    4. STORAGE FIRST:  storage.from('curriculos').remove(paths)   ← forced order
                       storage.from('avatars').remove([...])
    5. POSTGRES:       rpc('executar_anonimizacao', …)      ← ONE transaction
    6. AUTH LAST:      auth.admin.deleteUser(user_id)       ← blocked if 4 failed
    7. status='concluida' + tombstone receipt
    ✗ NEVER returns 5xx — pg_net would silently drop it and the failure would vanish
```

**Why step 3 is load-bearing.** The plan must snapshot every Storage path **before** any mutation. If you anonymize first, `candidaturas.curriculo_url` is NULLed and a retry after a partial Storage failure has **no way to find the remaining blobs**. That is the one unrecoverable ordering mistake available here.

**Why Storage-first is the correct order** (two independent reasons, both verified): the platform refuses to delete an Auth user who owns Storage objects; and a mid-flight failure with the CV already deleted but the row still populated is *retryable and no less private*, whereas the reverse leaves an orphan blob with a lost pointer.

**Partial-failure semantics — the honest statement.** This is a distributed transaction across three systems with no 2PC. There is no way to make it atomic; the design goal is that every intermediate state is **safe, retryable, and monotonically more private**. Concretely:

- Each step is idempotent: `storage.remove` on an absent path is a no-op; `executar_anonimizacao` is a no-op when the tombstone already exists; `deleteUser` on an absent user returns 404 → treat as success.
- `tentativas < 5` cap (mirroring `computeProximaTentativa`'s live 5-cap). Exhausted rows go `status='falhou'` and surface in `v_lgpd_purga_status` for a human, rather than looping and burning quota.
- The kill switch is a **row UPDATE**, not `cron.unschedule` — killing the sweep must not require a schema change or a migration checkpoint.
- First PROD activation is `dry_run = true`, and the diff between the simulated plan and the expected inventory is the acceptance gate.

---

## New vs. MODIFIED (the risk ledger the roadmapper needs)

### Purely additive — low risk

- Migrations: `politica_retencao`, `solicitacoes_titular`, `candidatos_anonimizados`, `v_lgpd_purga_status`
- RPCs: `solicitar_exclusao_dados`, `responder_revisao_decisao`, `executar_anonimizacao`, `selecionar_candidatos_expirados`, `despachar_purga`
- Triggers: `trg_notif_revisao_solicitada`, `trg_notif_revisao_respondida`
- Crons: `lgpd-retencao-sweep`, `lgpd-purge-sweep`
- EFs: `executar-direito-titular`, `exportar-dados-candidato`, `notificar-rh`
- Frontend: all of `src/features/lgpd/`
- Config: `sla_art20_dias` row inside the existing `config_sla_etapa`

### MODIFIED — name them, price them

| Component | Change | Risk | Mitigation |
|---|---|---|---|
| **`supabase/functions/notificar-candidato/{index.ts,helpers.ts}`** | `EventoLedger` · `EVENTO_MAP` · `EVENTOS_VALIDOS` · `montarDedupeKey` | **HIGH** — live candidate email path; two CRITICAL defects already shipped from this file | Surgical diff, mandatory VERIFICATION.md + code review, Deno test corpus green before deploy |
| `notificacoes_enviadas` CHECK `evento IN (…)` | DROP + ADD in one migration | **HIGH** — constraint swap on a populated live table | Single atomic migration; verify row count survives; MCP `apply_migration` (subagents have no MCP — orchestrator checkpoint) |
| `notificacoes_enviadas` | `+ destinatario_tipo NOT NULL DEFAULT 'candidato'` | LOW | Additive column with a default; precedent = `20260722000002` |
| `notificacoes_enviadas` retention | New purge rule (P37 deferred it here by name) | MEDIUM | Overwrite the address, keep the row — do not delete ledger rows |
| `_shared/email-templates.ts` + `email-config.ts` | New template(s), widened `EventoNotificacao` union | MEDIUM | Shared by both EFs — a break here breaks the live candidate path too |
| **`gerar_bias_snapshot()`** | Age band must survive anonymization | MEDIUM | **Verified diff** per DBMIG-02: `pg_get_functiondef` first, byte-preserve everything else |
| `limpar_logs_antigos()` | Optionally widen to `logs_acesso` / `sessoes_ativas` | LOW | Precedent shipped; keep the `categoria NOT IN ('usuario','seguranca')` exemption byte-intact |
| `cadastrar-candidato` EF + `src/features/cadastro/components/steps/AutorizacoesStep.tsx` + `candidatoSchema.ts` + `formTypes.ts` + `_shared/schemas.ts` | Only if `autorizacao_comunicacao` is **removed** rather than honored | LOW technically, **product-visible** | Decide honor-or-remove in discuss-phase; removing is 5 coordinated files |
| `database.types.ts` | Regenerate (`npm run db:types`) | Mechanical | Never hand-edit |
| `data_deletion_log` (existing stub) | **Decide: adopt or drop** | LOW | Its live schema is `(id, deletion_type, deleted_at, created_at)` — **no subject reference at all**. It is a Figma-Make artifact and **cannot** serve as the tombstone. Recommend: build `candidatos_anonimizados` fresh and drop the stub in the consolidation phase |

### Explicitly UNTOUCHED (invariants)

`avancar_etapa()` (D-12) · `historico_candidatura` schema · `decisao_final.por_usuario NOT NULL` · the three `NO ACTION` FKs · `bias_audit_log` rows · `trg_notif_transicao` / `trg_notif_confirmacao` / `trg_notif_convite` · `get-curriculo-url` · RNF-07a / RNF-12a / D-15 / allowlist-PII / service_role-never-client.

---

## Data Flow

### Art. 20 round trip (closes the live production hole)

```
Candidato clica "Solicitar revisão por pessoa natural"
   └─ src/features/explicacao/components/SolicitarRevisaoCTA.tsx   [EXISTS]
        └─ rpc solicitar_revisao_decisao(candidatura_id)           [EXISTS]
             └─ UPDATE decisao_final SET revisao_solicitada_em = now()
                  └─ trg_notif_revisao_solicitada  [NEW · AFTER UPDATE OF]
                       └─ net.http_post → EF notificar-rh  [NEW]
                            └─ resolve vagas.created_by → usuarios_rh.email
                            └─ claim-before-send on notificacoes_enviadas
                            └─ Resend → recrutador                    ⏱ SLA 15d starts
RH abre a Fila Art. 20                       [NEW · src/features/lgpd/]
   └─ rpc responder_revisao_decisao(candidatura_id, resultado)     [NEW · DEFINER]
        └─ UPDATE decisao_final SET revisao_resultado = …
             └─ trg_notif_revisao_respondida [NEW]
                  └─ net.http_post → EF notificar-candidato [MODIFIED · 5º evento]
                       └─ Resend → candidato
```

### Erasure / purge

```
(titular)  MeusDadosPage → rpc solicitar_exclusao_dados  ─┐
(retenção) cron → selecionar_candidatos_expirados()      ─┴─► solicitacoes_titular
                                                                    │ status='pendente'
cron */15 → despachar_purga() ── kill switch ── batch 20 ──► net.http_post
                                                                    ▼
                              EF executar-direito-titular  (claim-with-lease)
                                 plano jsonb ─► Storage.remove ─► executar_anonimizacao
                                                                  └─ CASCADE deletes
                                                                  └─ PII overwrite
                                                                  └─ tombstone insert
                                                              ─► auth.admin.deleteUser
                                                              ─► status='concluida'
AUDIT SPINE UNTOUCHED THROUGHOUT: historico_candidatura · decisao_final ·
decisao_final_historico · bias_audit_log
```

### Export / portability

```
Candidato → EF exportar-dados-candidato (authenticate → authorize own-row)
   · per-table ALLOWLIST projection (never select('*'))
   · streams JSON in the response body  ← NO new Storage artifact created
   · CV delivered as a 60s signed URL (mirror get-curriculo-url), not inlined bytes
   · WITHHELD by design: gabarito/rubric, motivo_rejeicao, opcao_knockout_id,
     observacoes_rh, justificativa/criterio_texto, score internals
```

---

## Architectural Patterns

### Pattern 1 — Nominate in SQL, execute in an Edge Function, confirm in a durable table

**What:** `pg_cron` never performs an irreversible side effect. It selects a capped batch, writes it to a durable queue, and fires an at-most-once HTTP nudge. The EF claims a row with a lease, does the work, and records the outcome. A second cron re-drives anything stale.
**When:** Any scheduled work that touches Storage, Auth, or an external API.
**Trade-offs:** One more table and one more cron than a naive `DELETE`. In exchange you get idempotency, observability, a kill switch, and survivability of `pg_net`'s at-most-once delivery — which this project has already been bitten by (that is why `notif-retry-sweep` exists).

```sql
-- claim-with-lease: safe under concurrent sweeps, no advisory lock needed
UPDATE public.solicitacoes_titular
   SET status = 'em_execucao', tentativas = tentativas + 1, claimed_at = now()
 WHERE id = p_id
   AND status IN ('pendente', 'em_execucao')
   AND (claimed_at IS NULL OR claimed_at < now() - interval '10 minutes')
RETURNING *;   -- zero rows ⇒ another worker owns it ⇒ return 200, no-op
```

### Pattern 2 — Anonymize-in-place behind a SECURITY DEFINER RPC, one transaction

**What:** All Postgres-side mutations of an erasure live in a single `SECURITY DEFINER … SET search_path = ''` function. The EF calls it exactly once. The three-system operation is not atomic, but its Postgres half is.
**When:** Whenever a multi-table mutation must be all-or-nothing and the caller is an EF.
**Trade-offs:** A large PL/pgSQL body (and therefore the known 42601 apply hazard — use MCP `apply_migration`, never `db push`). In exchange, a mid-flight EF crash cannot leave half a candidate anonymized.

### Pattern 3 — Allowlist-projected export (the inverse of the allowlist read)

**What:** The export enumerates, per table, exactly which columns the *titular* is entitled to — and is written as a literal column list, never `select('*')`.
**When:** Every Art. 18 V/VI surface.
**Trade-offs:** Verbose and must be maintained as the schema grows. The alternative is catastrophic: see Anti-Pattern 1.

### Pattern 4 — Extend the existing ledger rather than fork it

**What:** RH-facing notifications land in `notificacoes_enviadas` with `destinatario_tipo='rh'` instead of in a new table.
**When:** A new message class shares the same lifecycle (send → provider ack → webhook reconcile → retry → retention).
**Trade-offs:** One column and one CHECK-constraint edit on a live table (real risk, priced above). In exchange, `resend-webhook`, `varrer_retry_notificacoes()`, the retry index, and the new retention rule all cover the new rows for free.

---

## Anti-Patterns

### Anti-Pattern 1: building the export with `select('*')` per table

**What people do:** "It's the user's own data, just dump every row that references them."
**Why it's wrong:** In *this* schema that would ship, in one file, to the data subject: the SJT `rubric` and cognitive `gabarito` (deliberately REVOKEd in M4/P24 SEC-01/SEC-07), the essay `veredito` (SEC-02), `opcao_knockout_id` / `motivo_rejeicao` (the LGPD leak that P8's security gate caught), `observacoes_rh` (deliberately excluded from the candidate allowlist in M6/P33), and the recruiter's `justificativa`. It would be the single largest PII-and-trade-secret leak the project has ever shipped, and it would be *handed to the person most motivated to litigate*.
**Do this instead:** Explicit per-table column allowlists. LGPD Art. 18 V covers the titular's data; it does not compel disclosure of the controller's assessment instruments or commercial secrets (Art. 20 §1 expressly preserves segredo comercial e industrial).

### Anti-Pattern 2: `DELETE FROM storage.objects` in the purge SQL

**What people do:** Storage metadata is in Postgres, so they delete it there.
**Why it's wrong:** Verified against Supabase docs — the row disappears, the S3 object does not. You get an inaccessible-but-still-billed orphan and a *false* compliance record saying the CV was deleted. Since the 2026-03 Storage release the statement-level guard trigger will reject the statement outright unless `storage.allow_delete_query` is set, so on a current project it fails loudly instead of quietly — but the temptation to "just set the flag" is exactly the trap.
**Do this instead:** `supabaseAdmin.storage.from('curriculos').remove(paths)` from an Edge Function, with the paths snapshotted into `plano jsonb` first.

### Anti-Pattern 3: deleting the Auth user before the Storage objects

**What people do:** "Delete the account, everything else cascades."
**Why it's wrong:** Supabase refuses to delete an Auth user who owns Storage objects — and with the `{auth.uid()}/{uuid}.pdf` path schema, every candidate owns theirs. The call fails, the erasure stalls halfway, and the retry has no clean state to resume from.
**Do this instead:** Storage → Postgres → Auth, always, with the plan snapshotted before step one.

### Anti-Pattern 4: regex-scrubbing free-text audit fields

**What people do:** Run the candidate's name through `justificativa` and `criterio_texto` with a `regexp_replace`.
**Why it's wrong:** It cannot be verified, it silently corrupts the legal defensibility of a decision that RNF-07a says a human owns, and it produces a compliance claim you cannot substantiate under audit.
**Do this instead:** Retain under Art. 16 I, keep the read surface RH-only and vaga-scoped, disclose the residue as a known limitation, and fix it at the write path in a later milestone.

### Anti-Pattern 5: `cron.unschedule` as the kill switch

**What people do:** "If the purge misbehaves, unschedule the job."
**Why it's wrong:** It requires DB-level access at 3 a.m., it is a change to live infrastructure (and on this project every PROD DB action is an orchestrator checkpoint because subagents have no Supabase MCP), and re-scheduling risks drifting from the migration file.
**Do this instead:** `politica_retencao.purga_ativa`, read at the top of `despachar_purga()` on every tick. Turning the purge off becomes a one-row UPDATE from the RH panel.

### Anti-Pattern 6: making the candidate's deletion request instantaneous and self-service

**What people do:** Button → immediate hard delete.
**Why it's wrong:** A hijacked session becomes a data-destruction weapon, and there is no window to detect a mistaken or coerced request. LGPD requires a prompt *response*, not necessarily an instantaneous *execution*.
**Do this instead:** Immediate acknowledgement + `pendente_confirmacao` → e-mail confirmation → short `agendado_para` grace window → execution. Log every state transition in `solicitacoes_titular`. **Confirm the grace duration with legal before locking it — this is a MEDIUM-confidence recommendation, not a statutory reading.**

---

## Integration Points

### Internal boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `decisao_final` ↔ `notificar-rh` | DB trigger → `net.http_post` (Bearer from Vault) | New trigger; body copied verbatim from `trg_notif_transicao` including graceful-skip + fail-open |
| `decisao_final` ↔ `notificar-candidato` | Same | The 5th evento; the only modification to the live candidate path |
| `solicitacoes_titular` ↔ `executar-direito-titular` | cron → `net.http_post` + claim-with-lease | Durable queue absorbs `pg_net`'s at-most-once semantics |
| EF ↔ Storage | Storage Admin API only | SQL is structurally excluded (verified) |
| EF ↔ Auth | `auth.admin.deleteUser` | Must run last |
| `autorizacoes.autorizacao_retencao_curriculo` ↔ `selecionar_candidatos_expirados()` | Direct read | **This is the flag's first and only consumer** — the orphan-consent finding is closed here |
| `config_sla_etapa` ↔ Fila Art. 20 | Direct read | Reuse the P37 store; do not create a second SLA table |
| Frontend ↔ everything | TanStack Query v5, hierarchical keys | `lgpdKeys.*` |

### Deliberate deviation from the vaga-scoped RLS idiom — flagged

Every RH-facing table in this system is vaga-scoped via join-through (`rh_le_notificacoes`, `rh_gerencia_agendamento`, `rh_le_historico`/WR-04). **`solicitacoes_titular` cannot be**, because an erasure request is about a *person*, not about a vaga — a candidate may have applied to several vagas owned by different recruiters, or to none. Recommendation: candidate own-row policy for SELECT/INSERT, and **admin-only** read for the RH side (via a DEFINER RPC or an `is_active_rh_admin()`-gated policy — that helper already exists). Treat data-subject requests as an admin/DPO function, not a recruiter function. **Call this out in the phase plan so a reviewer does not read it as a missed vaga-scope.**

### External services

| Service | Integration | Gotchas |
|---|---|---|
| Resend | `fetch` from EF, key from Vault via `ler_resend_api_key()` | RH template is a new recipient class — the `exigirSinkTeste` non-prod guard must be extended to RH addresses or it will happily mail a real recruiter from a test run |
| Resend click tracking | Dashboard/API setting, not code | The milestone asks to disable it. It is a **provider-side config change**, not a migration — plan it as a human checkpoint alongside the Vault work, and verify by inspecting a delivered message's link |
| Supabase Storage | Admin API from EF | Delete-guard trigger; owner constraint on Auth delete |
| Supabase Auth Admin | `auth.admin.deleteUser` | Blocked while the user owns Storage objects |

---

## Suggested Build Order

| # | Phase | Depends on | Blocking? | Risk | Rationale |
|---|---|---|---|---|---|
| **42** | **Fila Art. 20 (request → RH, answer → candidate)** | Nothing inside M8 (COMM already paid) | **Blocking by legal urgency, not by dependency** | **HIGH** (touches the live email path) | There is an **active hole in PROD with a 15-day statutory clock**. Smallest surface, largest legal delta. Delivers: `responder_revisao_decisao`, 2 triggers, `notificar-rh`, the `notificar-candidato` 5th evento + CHECK swap, `destinatario_tipo`, RH queue screen |
| **43** | **Política de retenção + consentimentos órfãos** (SQL + config only, **zero destructive action**) | 42 (for the `config_sla_etapa`/config touch only — otherwise independent) | Blocking for 46 | LOW | Decides the window, creates `politica_retencao`, wires `autorizacao_retencao_curriculo` as a real consumer, resolves honor-or-remove for `autorizacao_comunicacao`, turns off Resend click tracking. Produces a **read-only** `v_lgpd_purga_status` preview: "these N candidates would be purged" — the number itself is the review artifact |
| **44** | **Exportação / portabilidade (Art. 18 V/VI)** | 43 for framing only | **Laterally parallel with 43** | LOW-MEDIUM (allowlist discipline is the whole game) | Read-only. **Deliberately before erasure**: this phase produces the per-table PII inventory that Phase 45 consumes as its erasure plan. Building it once, read-only first, means the destructive phase inherits a proven map |
| **45** | **Motor de exclusão** (`executar_anonimizacao` RPC + `executar-direito-titular` EF + tombstone + candidate-initiated flow) | 43 (policy) **and** 44 (inventory) | Blocking for 46 | **HIGHEST — this is the milestone's risk centre** | The un-atomic Storage↔Postgres↔Auth boundary. Irreversible. Live data. Every apply is a human checkpoint. Also carries the `gerar_bias_snapshot()` verified diff |
| **46** | **Purga automática** (cron wiring, batching, kill switch, observability, dry-run → live) | 45 (engine) + 43 (window) | — | MEDIUM | Pure orchestration on top of a proven engine. First PROD activation is `dry_run=true`; flipping to live is its own gated step. Includes the `notificacoes_enviadas` retention rule P37 deferred here |
| **47** | **Consolidação** (Nyquist das 6 fases sem veredito + W-1 `ator` UUID→nome + drop `data_deletion_log` stub) | All | — | LOW | **Fully parallelizable with 46** if worktrees allow — no shared files |

### Ordering rationale

- **42 first is a legal call, not a technical one.** Nothing depends on it; everything else could go first. It goes first because the clock is running.
- **44 before 45 is the non-obvious, high-leverage call.** Instinct says "delete, then export". But the export *is* the inventory, and building it read-only first means the irreversible phase starts from a tested artifact instead of a fresh guess.
- **43 and 44 are laterally parallelizable.** 43 is DB/config; 44 is an EF + a candidate screen. No file overlap.
- **45 and 46 must be sequential.** Wiring a cron to an unproven destructive engine is how you turn a bug into an incident.
- **47 is parallelizable with 46.**

### Highest-risk piece — stated explicitly

**Phase 45's `executar-direito-titular` Storage↔Postgres↔Auth boundary.** It is the only place in the entire system where a single logical operation spans three systems with no shared transaction, where the failure modes are irreversible, where the data is live production PII, and where the executor cannot self-verify (no Supabase MCP in subagents → every apply and every inspection is an orchestrator checkpoint). Everything about that phase should be planned as *gated*: dry-run first, one real candidate second (a test account), batch third.

**Runner-up: Phase 42's edit to `notificar-candidato`.** Not because the change is hard — it is four lines and a constraint — but because that file has already shipped two CRITICAL defects that four gates missed, and the mechanism was a phase that closed without VERIFICATION.md and without code review. The mitigation is procedural, not technical: that phase does not close without both.

---

## Open Question the Research Cannot Close

**The retention window number.** LGPD fixes no period; Art. 16 anchors it to purpose exhaustion plus the applicable prescription window. For a candidate who was **never hired there is no employment relationship**, so the CLT 2-year/5-year framing does not directly apply — the anchor is civil, plus the practical need to defend a discrimination claim. Market practice in the Brazilian sources surveyed clusters at 90–180 days, 6–12 months, or 1–2 years *with explicit talent-bank consent*. **Architecturally this does not matter** — `politica_retencao` is a config row, and the number can change without a migration. **Legally it is the milestone's central business decision** and should be set with counsel in discuss-phase, not inferred from this document. Confidence: MEDIUM.

---

## Sources

**Codebase (HIGH — read directly, this session):**
- `supabase/migrations/20260607000001_historico_candidatura.sql:39`, `20260607000003_decisao_final.sql:39`, `20260709000011_decisao_final_historico.sql:41` — the three `NO ACTION` FKs
- `supabase/migrations/20260607000004_bias_audit_log.sql`, `20260625100001_decisao_final_phase15.sql:283-340` — `gerar_bias_snapshot()` aggregate-only + live `data_nascimento` join
- `supabase/migrations/20260721000001_notificacoes_enviadas.sql` — CHECK constraint, RLS, indexes
- `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql` — the DROPped `trg_n8n_revisao_decisao`, the canonical trigger skeleton
- `supabase/migrations/20260727000001_p41_recon_retry.sql` — `pg_cron` + `pg_net` + Vault + backoff-cap precedent
- `supabase/migrations/20260713000004_logs_auditoria_append_only.sql` — `limpar_logs_antigos()` purge-exemption precedent
- `supabase/functions/notificar-candidato/{index.ts,helpers.ts}` — event vocabulary, allowlist resolution, claim-before-send
- `supabase/functions/get-curriculo-url/index.ts` — authenticate-THEN-authorize + signed-URL pattern
- `database.types.ts` — `autorizacoes`, `data_deletion_log` stub, `candidatos`, `decisao_final`, `configuracoes_empresa`

**Supabase platform (HIGH — Context7 / official docs):**
- Storage `delete-objects` + `schema/design` guides — SQL cannot delete blobs; storage tables are read-only from SQL
- Supabase blog 2026-03 Storage release — statement-level `DELETE` guard trigger on storage schema
- `auth/managing-user-data` — Auth user cannot be deleted while owning Storage objects
- `database/extensions/pg_net`, `cron/quickstart`, `ai/automatic-embeddings` — cron → EF batching pattern

**Legal / domain (MEDIUM — secondary sources, no ANPD numeric guidance exists):**
- LGPD Lei 13.709/2018 Art. 12, 16 (I–IV), 18, 20 — via [LGPD Brasil Art. 16](https://lgpd-brasil.info/capitulo_02/artigo_16), [ANPD FAQ 5.5](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-frequentes/5-adequacao-a-lgpd/5-5-por-quanto-tempo), [ConJur — LGPD nas relações de trabalho](https://www.conjur.com.br/2020-mar-14/leandro-araujo-impactos-lgpd-relacoes-trabalho/)
- Candidate CV retention practice — [LinkVagas](https://linkvagas.com.br/blog/ver/116/lgpd-no-recrutamento-sua-empresa-pode-guardar-curriculos-por-quanto-tempo), [Solides](https://blog.solides.com.br/lgpd-no-recrutamento-e-selecao/)
- Crypto-shredding vs. anonymization tradeoffs, EDPB 2025 pseudonymisation position — [Granit](https://granit-fx.dev/blog/crypto-shredding-gdpr-erasure-without-deleting-rows/), [VeritasChain](https://veritaschain.org/blog/posts/2026-01-18-crypto-shredding-gdpr-mifid-ii-reconciliation/), [RemoteReason](https://remotereason.com/blog/balancing-auditability-and-privacy-with-crypto-shredding)

---
*Architecture research for: LGPD data-governance integration into a live Supabase ATS*
*Researched: 2026-07-29*
