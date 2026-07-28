---
phase: 08
slug: inscri-o-knock-out-etapa-1
status: verified
threats_open: 0
asvs_level: 2
created: 2026-06-08
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time across all 5 PLAN.md files (`register_authored_at_plan_time: true`).
> Auditor mode: verify mitigations exist (not retroactive-STRIDE). block_on: high.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → cadastrar-candidato EF → DB | Public candidate submits cadastro; Zod `.strict()` is the fail-closed gate | PII (minimized: no CPF/gênero) |
| client → submit-candidatura EF → submit_candidatura_atomic RPC | Candidate-controlled answers cross into a privileged SECURITY DEFINER write; knockout re-evaluated server-side | candidate answers, knockout decision |
| authenticated RH client → publish_vaga RPC | RH-controlled publish; in-body role check is the access gate | vaga config, qualificacao snapshot |
| RPC → historico_candidatura | Append-only audit; ator/auto_rejeitado semantics | rejection audit trail |
| DB → candidate own-row read (listCandidaturas) | Candidate reads own candidaturas; RLS is row-level only (no column hiding) | own candidatura state (criterion MUST NOT cross) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-08-00-FP | Tampering | Wave-0 RED scaffolds | accept | Test-only; miscalibration surfaces as a non-flipping test at wave merge. No prod surface. | closed |
| T-08-01 | Tampering / Info-Disc | cadastro EF schema | mitigate | `.strict()` on `cadastroCandidatoSchema` + `submitCandidaturaSchema` (schemas.ts:144,232) → unknown keys → 400 VALIDATION before insert | closed |
| T-08-02 | Info-Disc (LGPD) | cadastrar-candidato EF | mitigate | `cpf` removed from EF insert + `user_metadata` (cadastrar-candidato:170-173,193-213); column kept nullable (D-02), never written | closed |
| T-08-03 | Info-Disc (LGPD) | duplicate check | mitigate | Dedup email-only (useDuplicateCheck:149-186); RPC booleans + rate-limit (live); CPF probe path no longer invoked | closed |
| T-08-04 | Tampering | publish gate (≤10/≤1-aberta) | mitigate | Client gate = defense-in-depth (publishGate.ts:124-140); authoritative server gate in `publish_vaga` (migration:341-354). Enum bug `'texto'`→`texto_curto/longo` fixed so the open-ended gate fires | closed |
| T-08-05 | Process integrity | knockout seeding | mitigate | `baseQualificacao`/`dentistaQualificacao` seed knockout perguntas `obrigatoria=true` (cargoTemplates:98,116); `publish_vaga` rejects knockout-on-non-obrigatoria | closed |
| T-08-06 (HIGH) | Tampering / Elevation | submit_candidatura_atomic | mitigate | Server-side knockout sweep inside SECURITY DEFINER RPC (migration:171-198); `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE … service_role` only. Client answer cannot self-approve | closed |
| T-08-07 (HIGH) | Repudiation / Integrity | historico_candidatura | mitigate | Deterministic texto-join `@> to_jsonb(opcao_texto)`; knockout writes exactly ONE audit row (`auto_rejeitado=true, ator NULL`) same txn; SMOKE-3 hist_rows=1. (Survivor-row flag nuance — see Accepted Risks AR-08-01.) | closed |
| T-08-08 (HIGH) | LGPD / Fairness | knockout predicate | mitigate | Sweep matches ONLY `tag='knockout'` option text; no `data_nascimento`/`genero`/`score` read anywhere in the RPC — structurally excluded (RNF-07a) | closed |
| T-08-09 | Info-Disc (LGPD) | candidate own-row read (GET) | mitigate | `listCandidaturas` projects an explicit candidate allowlist; `opcao_knockout_id`/`motivo_rejeicao` never returned. EF return path also clean (submit-candidatura:285-340). **Remediated this audit** (see trail). Regression guard added. | closed |
| T-08-10 | Tampering | candidaturas write path | mitigate | Writes via SECURITY DEFINER RPC (service_role grant) + EF; RLS blocks direct candidate INSERT | closed |
| T-08-11 | Elevation | publish_vaga | mitigate | In-body role check `auth.jwt() #>> '{app_metadata,role}' IN ('rh','administrador')` raising 42501 | closed |
| T-08-12 | Process integrity | etapa routing | mitigate | Only survivors reach `etapa='triagem'`; knocked-out stay `inscricao`+`rejeitado`. Phase-10 AI trigger filter flagged (08-04-SUMMARY) | closed |
| T-08-13 (HIGH) | Info-Disc (LGPD) | candidate own-row read (wire) | mitigate | `listCandidaturas` no longer `select('*')` — explicit allowlist excludes `opcao_knockout_id`/`motivo_rejeicao`; only neutral `feedback_rejeicao` is candidate-facing. **Remediated this audit** (see trail). Regression guard locks the projection | closed |
| T-08-14 | Spoofing / Access | candidaturas RLS | mitigate | `listCandidaturas` scoped `.eq('candidato_id', …).is('deleted_at', null)`; RLS row-scope unchanged from Phase 6 | closed |
| T-08-SC | Tampering | supply chain | accept | Zero new packages this phase (`tech-stack.added: []`); RESEARCH Package Legitimacy Audit | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-08-00 | T-08-00-FP | Wave-0 RED scaffolds are test-only; any miscalibration surfaces as a non-flipping test at wave merge. No production surface touched. | Fernando | 2026-06-08 |
| AR-08-SC | T-08-SC | Phase installs zero new packages; no supply-chain checkpoint needed. | Fernando | 2026-06-08 |
| AR-08-01 | T-08-07 (data-quality nuance) | To avoid a double-write, the survivor `historico_candidatura` row is stamped `auto_rejeitado=true` by the `avancar_etapa` trigger (service_role → `auth.uid()=NULL`). The KNOCKOUT row remains exactly correct (one row, `auto_rejeitado=true`, `ator NULL`). An analyst querying `WHERE auto_rejeitado=true` to count rejections would over-count survivor transitions. Knockout auditability (the actual threat) is intact; the survivor-flag disambiguation is deferred to a follow-up (would require another PROD apply). | Fernando | 2026-06-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Open Follow-ups (non-blocking, tracked)

- **WR-01 (knockout fails open on text drift):** the sweep matches the answer against `pergunta_opcao_metadata.opcao_texto` by exact text containment (`@> to_jsonb(opcao_texto)`). If a vaga's option text is edited after answers are stored, a knockout could silently stop firing. Mitigated in practice by the qualificacao snapshot at publish, but worth an integrity check in a later phase.
- **AR-08-01 survivor-row flag** disambiguation (see Accepted Risks).
- **EF redeploy:** `submit-candidatura` passthrough is committed but not yet deployed (tracked in 08-HUMAN-UAT.md).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-08 | 16 | 14 | 2 | gsd-security-auditor (initial — found T-08-09 + T-08-13 OPEN, HIGH leak via `listCandidaturas` `select('*')`) |
| 2026-06-08 | 16 | 16 | 0 | gsd-security-auditor (re-verify — explicit candidate allowlist + regression guard confirmed; both CLOSED) |

**Remediation (between the two runs):** `listCandidaturas` (candidate own-row read) changed from `select('*')` to an explicit candidate-facing allowlist that excludes `opcao_knockout_id`, `motivo_rejeicao`, and the pre-existing broader internals (`observacoes_rh`, `score_geral`, 8× `analise_ia_*`, `etapa_justificativa`, `created_by/updated_by`); `feedback_rejeicao` retained. Regression guard added in `candidaturasService.test.ts`. RH paths (`listAllCandidaturas`/`listCandidaturasByVaga`) unaffected.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-08
