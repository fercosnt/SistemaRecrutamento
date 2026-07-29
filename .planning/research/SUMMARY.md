# Project Research Summary

**Project:** Sistema de Recrutamento Beauty Smile — M8 "Dados do Candidato & Direitos do Titular" (LGPD-OPS)
**Domain:** LGPD data-subject-rights layer (Art. 18/19/20), retention and automated purge, bolted onto a LIVE Supabase ATS
**Researched:** 2026-07-29
**Confidence:** MEDIUM-HIGH — platform mechanics and live-DB facts are HIGH (verified via `pg_constraint`/Supabase docs); legal citations are HIGH as verbatim text but the *numbers* (retention window, review SLA) are business decisions, not statutory facts

> **Precedence note:** `.planning/research/FK-AUDIT-LIVE.md` was collected live against production (`pg_constraint`) after the four dimension researchers ran in parallel, and corrects several premises they inherited from the kickoff and from reading migration files instead of the live schema. Where STACK/FEATURES/ARCHITECTURE/PITFALLS disagree with FK-AUDIT-LIVE, this summary follows FK-AUDIT-LIVE. The corrections are folded in below, not treated as footnotes.

## Executive Summary

M8 closes an active production hole (a "Solicitar revisão por pessoa natural" button that writes a timestamp nobody reads) and, while doing so, **removes pre-existing compliance theater** rather than adding compliance to a neutral system: `data_deletion_log` has sat empty since 2026-06-09 with a comment deferring `delete_candidate_data()` to "Phase 15" — Phase 15 shipped in M2 and the function was never written; `limpar_logs_antigos()` has a commented-out `cron.schedule`; `notificacoes_enviadas` carries a literal "Retention INDEFINITE, deferred to LGPD-OPS (M8+)" comment. Every dimension of research converges on the same primitive — **anonymize-in-place via a `SECURITY DEFINER` tombstone RPC, never hard-delete, never crypto-shredding, never the `anon` extension (confirmed absent from `pg_available_extensions`, not merely uninstalled)** — because Art. 12 *caput* + Art. 16 IV make anonymized data fall outside the law's scope and because the schema's audit spine (`historico_candidatura`, `decisao_final`, `decisao_final_historico`) is FK-protected by `NO ACTION` constraints that make hard-delete structurally impossible without breaking RNF-07a's evidentiary guarantee.

The central engineering risk is a genuinely un-atomic three-system mutation — Storage (S3 blob) → Postgres (candidate row) → Auth (`auth.users`) — with a platform-enforced ordering (Supabase refuses to delete a user who owns Storage objects) and irreversible failure modes on live PII, seven-day backup coverage that **does not include Storage at all**, and no PITR confirmed active. The kickoff's stated blocker was also wrong and matters for planning: `decisao_final.por_usuario NOT NULL` is the *recruiter's* id and is never touched by erasing a candidate; the real blocker is `historico_candidatura.ator`, populated by the candidate's own funnel transitions. A live drift was also found and explained: the repo claims `candidatos.user_id` is `ON DELETE SET NULL`, but production has `ON DELETE CASCADE` (an `ADD COLUMN IF NOT EXISTS` silently no-op'd against a pre-existing legacy column) — meaning any plan drawn from the migration files alone is drawn against a database that does not exist.

Legally, the milestone is narrower and more forgiving than the kickoff assumed: the 15-day deadline belongs to Art. 19 II (access), not Art. 18 §1º (which is the right to petition ANPD); Art. 20 (automated-decision review) carries **no statutory deadline at all** — the live "revisão por pessoa natural" button is a voluntary contractual promise, not a legal clock, though it should still be honored because it's cheap and RNF-07a already delivers the substance; and the erasure right (Art. 18 VI) only reaches consent-based processing, which the candidatura's core record is not (it runs on Art. 7 V, contractual preliminaries) — so the correct basis for purging expired records is Art. 18 IV (unnecessary/excessive data), and the retention trail survives under Art. 16 IV precisely because anonymization removes it from LGPD's scope. Critically, the retention window is **not fully open**: the registration consent copy already promises "por até 2 anos" for the CV, so the business decision is a number *within* [0, 2 years], not an unbounded choice — and CLT's 2-year prescrição argument does not apply to a candidate who never had a contract (real exposure is Lei 9.029/1995, admission-stage discrimination).

## Key Findings

### Recommended Stack

Zero new npm dependencies, zero new Postgres extensions. Everything M8 needs — `pg_cron`, `pg_net`, Vault, Edge Functions, `@supabase/supabase-js` (Auth Admin + Storage Admin on the same already-bundled client) — is live and version-confirmed in production (`pg_cron` 1.6.4, `pg_net` 0.19.5, `pgcrypto` 1.3, `supabase_vault` 0.3.1). The M7 `trigger → pg_net → EF → ledger` pipeline is the exact shape to reuse for both the purge dispatcher and the export/erasure orchestrators.

**Core technologies:**
- `pg_cron` + `pg_net`: nominate-in-SQL / execute-in-EF orchestration — same bridge M7 already proved, avoids reintroducing an external scheduler
- Supabase Edge Functions (Deno, service_role): the only place allowed to call Storage Admin (`storage.remove()`) and Auth Admin (`deleteUser`) — SQL cannot delete Storage blobs (platform-enforced since a 2026-03 guard trigger)
- `SECURITY DEFINER` RPC doing an in-place `UPDATE` tombstone: the anonymization primitive, since `anon`/PostgreSQL Anonymizer is confirmed **not installable** on this project (absent from `pg_available_extensions`, promoted from MEDIUM to HIGH confidence by the live check)
- A new private Storage bucket for export artifacts, delivered via short-TTL signed URL — never inline JSON, never zipped (a candidate export is a few KB)
- A retention window as **data, not code** (`politica_retencao`/`config_retencao` table) — the legal number will change at least twice (counsel sign-off, then TALENT in M9)

### Expected Features

**Must have (table stakes):** a working Art. 20 review queue with RH notification and candidate response (the button that already exists in PROD reaches nobody today); the anonymization/tombstone primitive; a bias-audit snapshot mechanism that survives purges; a retention engine with a purge ledger and configurable window; honoring or removing the four consent checkboxes (`autorizacao_uso_dados`, `autorizacao_comunicacao`, `autorizacao_retencao_curriculo`, `autorizacao_analise_video`); an honest two-column deletion receipt ("apagamos X / mantivemos Y, anonimizado, sob artigo Z"); retention cleanup of `notificacoes_enviadas` (explicitly deferred here by P37's own code comment).

**Should have (competitive):** a "what we keep and why" transparency page (nearly free once the retention matrix exists as data); a reviewer-≠-decider guard on Art. 20; a cancelable grace window on deletion requests (market practice: Gupy uses 10 days); a pre-purge bias snapshot (resolves the milestone's central tension, ordering-critical); a dry-run report for RH before any real purge executes.

**Defer (v2+):** true Art. 18 V portability to another controller (dormant pending ANPD regulation that does not exist yet — do not build against a non-existent norm); the "invite to stay in the talent pool" flow (natural fit for M9/TALENT); manual dry-run review can substitute for automated tooling in the first cycle.

### Architecture Approach

This is a strictly additive integration onto a live system: the schema already encodes the answer to "purge vs. audit trail" — 25 of 28 FKs to `candidaturas(id)` CASCADE (the raw psychometric/behavioral body), while exactly 3 (`historico_candidatura`, `decisao_final`, `decisao_final_historico`) are `NO ACTION` by accidental default and constitute the audit spine that must never be weakened. M8's job is to make that decision explicit and executable, not renegotiate it. `bias_audit_log` carries no FK at all and is already a banded aggregate — but its snapshot function joins live `data_nascimento`, so anonymizing that column will silently corrupt future snapshots unless an age-band is materialized onto the tombstone first.

**Major components:**
1. `executar-direito-titular` (new EF) — the only component permitted to mutate across Storage + Postgres + Auth, in that forced order (platform will not delete an Auth user who owns Storage objects)
2. `exportar-dados-candidato` (new EF) — read-only, allowlist-projected inventory; built and proven **before** the erasure engine consumes it as its erasure plan
3. `notificar-rh` (new sibling EF, not a branch inside the existing `notificar-candidato`) — the request-side Art. 20 notification, because the live event vocabulary is closed in two places (an in-code union and a live DB CHECK constraint) and recipient resolution is candidate-hard-wired
4. `politica_retencao` / `solicitacoes_titular` / `candidatos_anonimizados` (new tables) — the durable, resumable, kill-switch-gated queue and tombstone ledger
5. Audit spine (`historico_candidatura`, `decisao_final`, `decisao_final_historico`, `bias_audit_log`) — explicitly UNTOUCHED

### Critical Pitfalls

1. **"We'll restore from backup" is not a safety net** — Pro-tier backups retain 7 days, PITR is a paid add-on that may not be enabled, restoring is whole-project with downtime, and **Storage objects are never included in any backup path** — a deleted CV cannot be recovered by any means once removed. Verify PITR status as a hard gate before any destructive code exists.
2. **CASCADE will delete evidence if a `NO ACTION` FK is "fixed"** — the reflexive fix for the first `23503` error is to change `NO ACTION` to `CASCADE`. This is never correct: it destroys the human-decision audit trail that RNF-07a exists to protect. The correct response is to anonymize the child row and desever the pointer, not to relax the constraint.
3. **Storage cannot be purged from SQL, and doing so anyway orphans the blob permanently** — `DELETE FROM storage.objects` removes metadata only; the S3 object survives, inaccessible, un-deletable by any supported path thereafter. This is the single worst possible failure mode for an erasure feature and must go through the Storage Admin API from an Edge Function only, with paths snapshotted before any mutation begins.
4. **The retention predicate silently swallows rows via NULL** — `WHERE data_decisao < now() - interval` is NULL (never true) for every candidatura without a decision, so those rows are never purged and the system falsely believes it has a working policy. Requires a single canonical view with explicit `COALESCE` and a terminal-state allowlist (never a denylist of active states).
5. **A dry-run that diverges from the real predicate, or is never exercised against live-shaped data, is decoration, not a guard** — this project has already shipped this exact failure class once (P39/CR-02: a guard that was dead code). The dry-run must be the same query as the real delete, wrapped in a rollback, run in production for weeks before the real mode is flipped, and the flip itself must be a separate, evidenced orchestrator checkpoint.

## Implications for Roadmap

### Chosen build order and why

Three different orderings were proposed across the four research passes (Architecture: Art.20 → retention‖export → deletion engine → purge → consolidation; Features: Art.20 → consents/transparency → tombstone+bias-snapshot → purge → deletion+export → consolidation; Pitfalls: inventory/policy → Art.20 → deletion+portability → purge last → consents‖consolidation). These are not averaged. **The Architecture ordering is adopted, with the Pitfalls inventory/gate work pulled into its first phase and the Features consent-default fixes pulled forward alongside it** — because Architecture's ordering is the only one of the three that treats "build the export first because it IS the erasure engine's inventory" as a first-class sequencing decision, and because Pitfalls independently converges on the same phase-42-must-be-non-destructive principle. The result:

### Phase 42: Inventário, gates e Fila Art. 20 (request → RH, answer → candidate)
**Rationale:** Two things must happen before any destructive line of code exists, and one active legal/contractual hole should close as early as possible because nothing in the rest of the milestone depends on it going first — it goes first because the clock (voluntary but real) is running. Bundling them is efficient: both are low-risk, both are prerequisites, and the Art. 20 notification reuses the already-proven COMM pipeline.
**Delivers:** PII inventory (per-column classification into hard-delete / anonymize / preserve-intact, seeded from FK-AUDIT-LIVE, not from migration files); PITR/backup status verified and recorded as a dated artifact; a live `cron.job` vs. repository diff (closing the identified drift-cause pattern: `ADD COLUMN IF NOT EXISTS` against pre-existing columns silently no-ops FK clauses — grep all migrations for the idiom); consent-default fixes pulled forward (unmarked checkboxes for new registrations, a `consentimento_versao`/`consentimento_em` column so pre/post-enforcement candidates are distinguishable by data, not inference — this window closes with every new signup); the Art. 20 request-and-response round trip (`responder_revisao_decisao` RPC, `notificar-rh` sibling EF, the one surgical edit to `notificar-candidato`'s event vocabulary + CHECK constraint, reviewer-≠-decider guard, and — first deliverable, before the UI — a query answering "how many Art. 20 requests are already pending in PROD today, unanswered."
**Addresses:** TS-1/TS-2/TS-3 (Art. 20 queue), the drift/gate items from Pitfalls 1/15/16
**Avoids:** Pitfall 1 (phantom backup safety net), Pitfall 15 (compliance theater), Pitfall 16 (out-of-repo write path), Pitfall 14 (pre-marked consent as false legal basis), Pitfall 11 (Art. 20 queue as theater)

### Phase 43: Política de retenção (config only, zero destructive action)
**Rationale:** Decides the window and the consent basis in data, not code, before anything reads it destructively. Depends on Phase 42 only for the config-table convention (`config_sla_etapa` precedent), otherwise independent.
**Delivers:** `politica_retencao`/`config_retencao` table (per-state retention matrix, kill switch, dry-run flag); `autorizacao_retencao_curriculo` wired as the actual (first) consumer of a previously-orphaned consent flag; honor-or-remove decision executed for `autorizacao_comunicacao`; Resend click-tracking disabled. Produces a **read-only** preview view ("these N candidates would be purged") as its own review artifact.
**Uses:** the `config_sla_etapa` (P37) pattern, reused rather than reinvented

### Phase 44: Exportação / portabilidade (Art. 19 §3, framed as "cópia dos seus dados," not Art. 18 V)
**Rationale:** **Hard, non-negotiable ordering constraint.** Build the read-only PII inventory/export first — it is the same query the erasure engine needs as its erasure plan. This is the single highest-leverage sequencing call in the milestone: an irreversible phase that starts from a tested, exercised artifact instead of a fresh guess.
**Delivers:** allowlist-projected JSON export (never `select('*')` — this project's #1 recurring vulnerability class, already responsible for two prior incidents), CV delivered via short-TTL signed URL, snapshot-tested export keys so a new DB column cannot silently leak.
**Implements:** the export builder as the shared inventory consumed by Phase 45

### Phase 45: Motor de exclusão (anonymization RPC + orchestrating EF + tombstone)
**Rationale:** This is the milestone's risk center and must not be rushed or parallelized with anything destructive. **Hard constraint:** the bias-audit aggregate snapshot (age-band materialization onto the tombstone) must happen *before* any anonymization runs, or `gerar_bias_snapshot()`'s live join to `data_nascimento` silently and permanently corrupts the longitudinal EEOC 4/5 series. **Hard constraint:** Storage deletion must precede the Auth `deleteUser` call — this is platform-enforced (Supabase refuses to delete a user who owns Storage objects), not a preference. **Hard constraint:** consent-proof (versioned text + hash + timestamp) is impossible to establish retroactively — if it does not ship as part of this phase's supporting work, the historical record has no proof of consent, permanently.
**Delivers:** `executar_anonimizacao` (SECURITY DEFINER, one transaction for the Postgres half), `executar-direito-titular` EF (claim-with-lease, Storage→Postgres→Auth ordering, idempotent at every step), the tombstone table, candidate-initiated deletion flow with confirmation + grace window.
**Depends on:** 43 (policy) and 44 (inventory) both completed

### Phase 46: Purga automática (cron wiring, batching, kill switch, dry-run → live)
**Rationale:** Must be sequential after 45, never parallel with it — wiring a cron to an unproven destructive engine is how a bug becomes an incident.
**Delivers:** `pg_cron` nomination + dispatch jobs mirroring the already-proven `notif-retry-sweep` pattern; blast-radius cap; dead-man-switch alerting; the `notificacoes_enviadas` retention rule P37 explicitly deferred to this milestone. First PROD activation is `dry_run=true`, running for a documented period before a separately-gated, evidenced flip to live — mirroring the `NOTIFICACOES_MODO=teste→producao` discipline already used in M7.
**Depends on:** 45 (engine) and 43 (window)

### Phase 47: Consolidação
**Rationale:** Fully parallelizable with Phase 46 if worktrees allow — no shared files.
**Delivers:** Nyquist verification pass across all prior phases without a verdict yet, the `historico_candidatura.ator` UUID→name join (W-1), removal of the `data_deletion_log` zombie stub (or its adoption with real writes — recommend building `candidatos_anonimizados` fresh and dropping the stub), and the "compliance zombie" checklist from Pitfalls (does every retention/deletion claim in a migration comment or doc have code that executes it?).

### Escalated business decisions (not engineering choices — carry to the operator/counsel)

These must be resolved by Fernando (operator) and/or labor counsel, not inferred by planning:

- **BD-1 — Retention window per candidatura state.** Already contractually capped at ≤2 years for CV retention (existing consent copy). The remaining decision is the number *within* [0, 2 years] per state (rejected/withdrawn/talent-pool), plus a separate basis (Art. 7 V) for non-CV data. Do not lock a number in the roadmap — lock the structure (config table), leave the number as a seed pending counsel sign-off.
- **BD-2 — `autorizacao_comunicacao`: honor or remove.** Research recommends removing the checkbox (it's not real consent — Art. 7 V governs transactional funnel email) and replacing it with an informational notice, but M7 already locked "transacional sem opt-out," so this is a product call, not engineering's to make silently. **Adjacent, previously-unflagged finding:** the checkbox copy also bundles marketing ("novas oportunidades de vagas") with transactional ("andamento do processo") — this split needs its own decision: separate the two consents, rewrite the copy, or build a real opt-out for the marketing half.
- **BD-3 — Keep or rewrite the "revisão por pessoa natural" label.** Not legally required (the phrase was vetoed from Art. 20 and the veto upheld by Congress in 2019); recommend keeping it, since RNF-07a already delivers the substance for free.
- **BD-4 — SLA for the Art. 20 queue.** Art. 20 carries no statutory deadline. Any number here is a voluntary product commitment, not a legal clock — frame it internally that way and never as "legal deadline" in candidate-facing copy (Pitfall 8 names this exact mislabeling risk).
- **BD-5 — Whether deletion is allowed during an active candidatura**, or whether "withdraw" (stops the funnel) must be distinguished from "erase" (executes after closure).
- **BD-9 — Whether to redact or preserve** the ≥50-character recruiter justification text on `decisao_final`, given it can contain hand-typed PII and is simultaneously the legal proof of non-discrimination (Art. 7 VI).
- **PITR / backup posture.** Whether the paid PITR add-on is enabled is a spending decision with direct bearing on the milestone's single greatest irreversibility risk (Storage has *no* backup path regardless of PITR). This should be resolved and documented as a dated fact before Phase 45 plans destructive code, and it is itself an operator decision (cost), not a technical one.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Platform mechanics (pg_cron/pg_net limits, Storage delete-guard, Auth Admin ordering) verified against official Supabase docs and live `pg_available_extensions`; zero new dependencies is a low-risk recommendation |
| Features | MEDIUM-HIGH | Legal text verified verbatim against ≥2 independent sources including gov.br/ANPD (HIGH); market-practice retention numbers and product patterns are explicitly labeled MEDIUM/practice, not law |
| Architecture | HIGH | Every integration claim grepped directly from live migrations/EF source/`database.types.ts`; the one legal-window sizing recommendation is explicitly MEDIUM and flagged as needing counsel |
| Pitfalls | HIGH | Codebase-specific facts (HIGH, file:line cited); the live FK graph (HIGH, from FK-AUDIT-LIVE); legal/regulatory context MEDIUM (no ANPD numeric guidance exists for any of these questions) |

**Overall confidence:** HIGH on what to build and in what order; MEDIUM on the specific legal numbers (retention window, review SLA), which are explicitly business/counsel decisions carried forward above rather than resolved by research.

### Gaps to Address

- **The retention window number itself** — architecturally a non-issue (it's a config row), but the milestone's central open business decision. Do not let a phase plan silently pick a number; route it to discuss-phase with the BD-1 framing above.
- **Pre-contractual claim prescription** (3 years Código Civil Art. 206 §3º V vs. labor-court application) — unresolved by this research; anchors part of BD-1 and needs labor counsel, not more search.
- **DPO/encarregado designation and small-agent flexibilization** (Res. CD/ANPD 2/2022) — not verified whether Beauty Smile qualifies; separate from M8's engineering scope but should be tracked (BD-8).
- **International transfer to the AI/LLM provider** (Art. 33 + Res. 19/2024) — identified as a real, undeveloped exposure; likely its own requirement or an M9 item, not resolved here.
- **`shouldSoftDelete` re-signup semantics on `auth.users`** — undocumented by Supabase (open issue `supabase/supabase#20057`); must be empirically tested on a throwaway account before Phase 45 designs around it, not assumed.
- **PITR/backup posture** — must be verified as a dated fact (on/off, window) before Phase 45, not assumed either way; this is also BD-listed above since enabling it is a spending decision.
- **Whether the `gerar_bias_snapshot()` per-cell k-anonymity threshold is safe** (PIT-2: small demographic cells in a single-tenant clinic-chain context can re-identify even without names) — flagged but not resolved; needs a minimum-cell-size rule in the snapshot design, decided during Phase 45 planning.

## Sources

### Primary (HIGH confidence)
- `.planning/research/FK-AUDIT-LIVE.md` — live `pg_constraint` query against PROD, 2026-07-29; authoritative over migration-file-derived claims
- `supabase.com/docs/guides/auth/managing-user-data`, `.../storage/management/delete-objects`, `.../database/extensions/pg_net`, `.../cron` — platform constraints, fetched directly
- Codebase: `supabase/migrations/*.sql` (grepped, file:line cited throughout), `supabase/functions/notificar-candidato/*`, `database.types.ts`, `src/features/cadastro/**`
- LGPD Lei 13.709/2018 Art. 7, 12, 15, 16, 18, 19, 20, 41 — verbatim text cross-checked against lgpd-brasil.info + gov.br/ANPD

### Secondary (MEDIUM confidence)
- Brazilian legal-practitioner sources (ConJur, Migalhas, Solides, lgpdbrasil) — retention practice consensus (90–180 days / 6–12 months / 1–2 years with consent), explicitly labeled market practice not statute
- Gupy / Greenhouse / Lever product documentation — competitor mechanism comparison
- EDPB right-to-erasure report, WP251/SCHUFA (CJEU C-634/21) — GDPR-analogy quality bar for meaningful review, not binding in Brazil

### Tertiary (LOW confidence)
- `supabase/supabase#20057` (undocumented `shouldSoftDelete` re-signup behavior) — needs empirical verification, not assumption
- Crypto-shredding legal-status commentary — reported secondhand, not read at source; recommendation is to not use it regardless (wrong tool for this milestone)

---
*Research completed: 2026-07-29*
*Ready for roadmap: yes*
