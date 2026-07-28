---
phase: 20
slug: refino-rh-editar-guia-de-entrevista-seed-001
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-30
---

# Phase 20 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Phase 20 is the milestone's most security-sensitive write-path (RH edits the interview
> guide). The register below was authored at plan time across the five 20-0N-PLAN.md
> `<threat_model>` blocks and VERIFIED against the implemented code (not documentation).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client (RH browser) → `save_entrevista_guia_edits` RPC | RH-supplied `candidatura_id` + `guia` jsonb cross into a SECURITY DEFINER that bypasses RLS — the in-body guard IS the control | candidatura_id (uuid), edited `perguntas[]` jsonb (pergunta/dimensao/origem) |
| `public.usuarios_rh` table → role decision | role is read from the authoritative table, NOT the (possibly drifted/forged) JWT claim | role string (recrutador/administrador) |
| candidatura → vaga.created_by | ownership check: rh must own the vaga; admin bypasses | created_by (uuid) vs auth.uid() |
| AI generation → persisted guide (EF) | LLM output merged with existing manual questions before persist; a failed/poisoned regen must not destroy manual edits | guide jsonb, origem:'manual' questions |
| deployed EF bundle → PROD behavior | the live bundle is frozen until redeploy; a stale INSERT would orphan manual edits | n/a (deployment surface) |
| RPC/EF error → UI copy | errors must surface as static PT-BR copy keyed by code, never the raw RPC/PII string | error code only |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-20-01 | EoP (IDOR) | save_entrevista_guia_edits | mitigate | own-vaga guard `candidaturas→vagas.created_by IS DISTINCT FROM auth.uid()` → 42501 for rh-no-posse; admin bypass — migration L121-132 | closed |
| T-20-02 | Spoofing (JWT-claim role) | RPC role check | mitigate | role from `public.usuarios_rh` (ativo + deleted_at IS NULL, recrutador→rh) NOT `auth.jwt` — migration L104-117; claim-liar smoke 6/6 PASS (20-02) | closed |
| T-20-03 | EoP (candidate calls RPC) | GRANT scope | mitigate | no usuarios_rh row → v_role NULL → 42501 (L115-117); `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated` (L153-154) | closed |
| T-20-04 | Tampering (manual question dropped on regen) | EF merge / Deno test | mitigate | merge-preserve invariant: EF splits by `origem === 'manual'`, keeps all (index.ts L338-343); Deno test 3/3 GREEN (20-04) | closed |
| T-20-05 | Tampering (guide write feeds candidaturas) | RPC body | mitigate | RNF-07a — RPC body never touches candidaturas (grep-verified; migration comment L142) | closed |
| T-20-06 | Tampering (PROD data, smoke run) | SQL smoke run | mitigate | every smoke wrapped BEGIN/ROLLBACK; vaga owner unchanged post-smoke (20-02 SUMMARY) | closed |
| T-20-07 | EoP (the live RPC) | save_entrevista_guia_edits in PROD | mitigate | 6/6 authz smokes PASS pre-UI: candidato→42501, RH-no-posse→42501, RH-own→ok, admin→ok, upsert→1 row, claim-liar→DENY (20-02) | closed |
| T-20-08 | Info disclosure (apply errors) | apply_migration | mitigate | MCP apply path (no raw pooler error echo); applied live as version `20260629190949` (20-02) | closed |
| T-20-09 | Tampering (client posts score/band) | saveGuiaEdits payload | mitigate | payload is `{ perguntas }` only — pergunta/dimensao/origem; no score/band; entrevista-contract anti-tamper test; guide never feeds candidaturas (entrevistaService L537-549) | closed |
| T-20-10 | Info disclosure (over-projection) | getGuia / allowlist | mitigate | `ENTREVISTA_GUIA_ALLOWLIST` = explicit columns incl. updated_at, NEVER select('*') (entrevistaService L64-65) | closed |
| T-20-11 | Repudiation (manual loses provenance on read) | normalizeGuia | mitigate | origem carried through; legacy/missing → 'ia' (entrevistaService L331-334) | closed |
| T-20-12 | Tampering/Repudiation (manual dropped by regen) | EF merge | mitigate | split by `origem === 'manual'`, keep all, prepend to merged set (index.ts L338-343) | closed |
| T-20-13 | Tampering (failed/poisoned regen wipes row) | guide ?? {incompleto} fallback | mitigate | merge runs BEFORE fallback; incompleto payload carries `manualQs` (index.ts L354-356); failed-regen Deno assertion GREEN | closed |
| T-20-14 | Info disclosure (over-projection on read-current) | EF select on entrevista_guias | mitigate | read-current uses `select("guia")` allowlist, never select('*') (index.ts L328-333) | closed |
| T-20-15 | Spoofing/EoP (EF auth regression) | two-client auth block | accept (unchanged) | two-client authenticate-THEN-authorize UNCHANGED + verified intact: role from usuarios_rh (L153-168), own-vaga + candidatura↔vaga cross-check (L186-209) | closed |
| T-20-16 | Info disclosure (raw error/PII echoed in UI) | save-error region | mitigate | AsyncState static PT-BR copy keyed by errorCode (FORBIDDEN/insufficient_privilege → permission copy); never echoes raw error (GuiaEntrevistaPanel L567-578, L89-108) | closed |
| T-20-17 | Tampering (client posts score/band) | edit state → onSaveEdits payload | mitigate | UI edits only pergunta/dimensao/origem/order; addManual stamps only origem:'manual' (L464-471); no score field editable | closed |
| T-20-18 | EoP (UI bypasses server guard) | client-only checks | accept | RPC is the authoritative guard (T-20-01/02/03 proven); UI is convenience only — a forged client still hits the DEFINER role+own-vaga check (42501) | closed |
| T-20-SC | Tampering (supply chain) | npm/pip/cargo installs | accept | zero external packages added this phase; EF `npm:` SDK imports are STATIC (index.ts L56-59); UI primitives vendored; zod/v4 pin untouched | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Code Review Findings — Verified Fixed

The Phase 20 code review (20-REVIEW.md) raised 1 BLOCKER (CR-01) and 4 warnings. The
fixes carry direct security weight on the ENTREV-08 anti-silent-discard invariant and
were verified present in the implemented code:

| Finding | Severity | Security relevance | Verified Fix |
|---------|----------|--------------------|--------------|
| CR-01 | Critical | manual question text blanked on regen read-back (effective data loss — defeats ENTREV-08 spirit) | `normalizeGuia` reads BOTH shapes: `pergunta = q.pergunta ?? q.question` (entrevistaService L315-322) — manual row text survives the regen-merge | FIXED |
| WR-02 | Warning | manual row dimension lost on regen | `dimensao = q.dimensao ?? q.competency` (entrevistaService L323-330) | FIXED |
| WR-04 | Warning | swallowed upsert error → fabricated `{ok:true}` while write never landed (anti-silent-discard hole at persistence layer) | EF captures + checks `upsertErr`, returns structured 500, no fabricated ok (index.ts L350, L362-370) | FIXED |
| WR-03 | Warning | EF-only fields (BARS/probes) overwritten on save | Addressed by review (data-fidelity, not an authz/disclosure gap); not a threat-register item — no security disposition required | N/A |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-20-01 | T-20-15 | The `gerar-guia-entrevista` two-client authenticate-THEN-authorize block was UNCHANGED by Phase 20 (already correct from Phase 14: role from usuarios_rh, own-vaga, admin bypass, candidatura↔vaga cross-check). Verified intact, not edited. | fernando (orchestrator) | 2026-06-30 |
| AR-20-02 | T-20-18 | The edit-mode UI is a convenience surface only. The `save_entrevista_guia_edits` RPC (SECURITY DEFINER, role-from-usuarios_rh, own-vaga, 42501) is the authoritative guard; a forged client cannot bypass it. | fernando (orchestrator) | 2026-06-30 |
| AR-20-SC | T-20-SC | Zero external packages added this phase. EF `npm:` SDK imports are static; UI primitives are vendored (UI-SPEC §Registry Safety); `npm run db:types`/`lint` use already-installed CLI/tsc. No install attack surface introduced. | fernando (orchestrator) | 2026-06-30 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-30 | 19 | 19 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-30
