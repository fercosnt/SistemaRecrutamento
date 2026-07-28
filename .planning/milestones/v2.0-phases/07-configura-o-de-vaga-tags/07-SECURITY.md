---
phase: 7
slug: configura-o-de-vaga-tags
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-07
---

# Phase 7 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Audit method: FORCE stance — every declared mitigation confirmed by grep/read of the
> implementation source (migrations + client), corroborated by the orchestrator's live-prod
> smoke run (project isljnozzlvckrgjjbjwp, 2026-06-07). Documentation/intent alone was NOT
> accepted as evidence.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser (RH/admin) → Supabase anon client | All config-vaga writes originate from the authenticated RH/admin SPA using the ANON key only (never service_role). | Vaga config (testes_aplicaveis, pesos_avaliacao), option tags (tag/peso/nota_ia), publish intent — RH-internal, no candidate PII. |
| Anon client → SECURITY DEFINER RPCs | `upsert_pergunta_opcoes_metadata` + `publish_vaga` run as definer; RLS does NOT apply in-body, so each carries an explicit `auth.jwt() #>> '{app_metadata,role}' IN ('rh','administrador')` check (raises 42501 otherwise). | Pergunta option payloads; vaga publish transition (rascunho→ativa). |
| Anon client → `pergunta_opcao_metadata` table (direct DML) | Table is RLS-protected (FOR ALL USING+WITH CHECK role gate); candidato/anon have no policy → denied. | Option tag metadata rows. |
| Candidato form (Phase-4 reader) → opcoes_resposta jsonb shape | D-13 shape migration string[] → [{id,texto}]; neutral `@/lib/opcoes/opcoesNormalize` bridges both shapes idempotently so the shipped candidato form keeps building correct z.enum option strings. | Public candidate-facing form schema (no privilege boundary, data-integrity boundary). |
| SQL smoke runbook (operator) | Procedure-only artifact; operator supplies live JWTs at runtime — no secrets committed. | Live RH/candidato JWTs (runtime only, never in repo). |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-07-01-RB | Information Disclosure | SQL smoke runbook | accept | Runbook is procedure-only; `<PERGUNTA_ID>`/`<OID>` placeholders + explicit secrets note (07-SQL-SMOKE-RUNBOOK.md:23-24); grep for JWT/secret patterns returned none. Operator supplies live JWTs at runtime. | closed |
| T-07-01-SC | Tampering | npm installs | mitigate | No Phase-7 commit touches package.json/package-lock.json (last dep change = Phase 5 commit 0814af1); Vitest/Playwright already in tree. | closed |
| T-07-02-01 | Elevation of Privilege | upsert_pergunta_opcoes_metadata RPC | mitigate | In-body role gate `v_role NOT IN ('rh','administrador') → RAISE 42501` (010003 L51-54); `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated` (L96-97). Live smoke §3a: candidato JWT → 42501. | closed |
| T-07-02-02 | Elevation of Privilege | pergunta_opcao_metadata table | mitigate | `ENABLE ROW LEVEL SECURITY` + FOR ALL policy USING+WITH CHECK `auth.jwt()#>>'{app_metadata,role}' IN ('rh','administrador')` (010001 L69-76); candidato/anon no policy → denied. Live smoke §3b: candidato INSERT → RLS violation. | closed |
| T-07-02-03 | Tampering | vagas.status publish path | mitigate | publish_vaga RPC re-checks 3 D-12 conditions server-side (010004 L74-108) and `UPDATE … WHERE id=p_vaga_id AND status='rascunho'` (L111-113). Live smoke §4: sum=95 rejected (stayed rascunho), sum=100 →ativa. | closed |
| T-07-02-04 | Tampering (data integrity) | jsonb↔table sync | mitigate | Single transactional DEFINER RPC: `DELETE … WHERE pergunta_id` + loop re-INSERT + jsonb writeback to opcoes_resposta (010003 L57-86). Live smoke §1/§2: idempotent (row_count stable=2, stable opcao_ids). | closed |
| T-07-02-05 | Tampering | peso overflow/negative | mitigate | DB `CHECK (peso BETWEEN -999 AND 100)` (010001 L51) + client Zod `.int().min(-999).max(100)` (tagOpcaoSchema.ts:36-40) + UI input min/max (PerguntaWithTagsForm.tsx:194-195). | closed |
| T-07-02-06 | Information Disclosure | search_path injection | mitigate | `SET search_path = ''` on both DEFINER fns (010003 L42, 010004 L41); all identifiers schema-qualified (public.*). Confirmed in source. | closed |
| T-07-02-SC | Tampering | npm/migration apply | mitigate | No new packages (see T-07-01-SC); migrations applied via blocking-human checkpoint (D-22 SQL-Editor / Supabase MCP), not autonomous push. | closed |
| T-07-03-01 | Elevation of Privilege | configVagaService | mitigate | Imports `@/lib/supabase/client` (anon) only; grep for service_role/supabaseAdmin in feature returns only the "never supabaseAdmin" doc comment (configVagaService.ts:10). Authz server-side (RPCs + RLS). | closed |
| T-07-03-02 | Tampering (data integrity) | Phase-4 candidato form | mitigate | `opcoesToStrings` neutral lib idempotent across string[] and [{id,texto}] (opcoesNormalize.ts:50-59); candidaturaFormSchema imports it (L30, used L71/L85); Wave-0 regression T3.1/T3.2 (candidaturaFormSchema.test.ts:328-353). Full Vitest 395/395. | closed |
| T-07-03-03 | Spoofing | publishVaga error mapping | accept | Client `isForbidden` maps 42501→FORBIDDEN for UX copy only (configVagaService.ts:47-53,136-142); authoritative gate is the server publish_vaga RPC in-body role check (010004 L55). | closed |
| T-07-03-SC | Tampering | npm installs | mitigate | No new packages (see T-07-01-SC). | closed |
| T-07-04-01 | Tampering | Publicar flow | mitigate | Client publishGate UX-only (publishGate.ts:59-94); server publish_vaga re-checks 3 D-12 conditions (010004 L74-108). Live smoke §4 corroborates. | closed |
| T-07-04-02 | Elevation of Privilege | tag save / config write | mitigate | All writes via configVagaService (anon) → DEFINER RPC in-body role check + table RLS; no service_role in UI (grep clean across feature + components). | closed |
| T-07-04-03 | Information Disclosure | toasts/logs | mitigate | No PII/secrets in config toasts (CriarEditarVagaPage.tsx:312-372 use generic pt-BR copy); grep `console.*` across config-vaga services + components returns none. | closed |
| T-07-04-04 | Tampering | peso input | mitigate | Client tagOpcaoSchema `.int().min(-999).max(100)` (tagOpcaoSchema.ts:36-40) + UI clamp (PerguntaWithTagsForm.tsx:194-195) + DB CHECK (010001 L51). | closed |
| T-07-04-05 | Tampering | non-rascunho publish no-op | mitigate | Publicar CTA renders only when `dbStatus === 'rascunho'` (CriarEditarVagaPage.tsx:1102-1117) + in-handler guard (L327-331); server backstop `UPDATE … WHERE status='rascunho'` (010004 L113). | closed |
| T-07-04-SC | Tampering | npm installs | mitigate | No new packages; shadcn primitives vendored (see T-07-01-SC). | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

### Unregistered Flags

None. 07-04-SUMMARY.md `## Threat Flags` declares "None — no new network endpoints, auth paths, or trust-boundary surface introduced." (07-01/02/03 SUMMARYs carry no Threat Flags section.) No new attack surface required registration.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-07-01 | T-07-01-RB | SQL smoke runbook is procedure-only: `<PERGUNTA_ID>`/`<OID>` placeholders, explicit secrets note (lines 23-24), no committed JWTs/keys (grep clean). Operator supplies live JWTs at runtime — never persisted to repo. Residual risk: operator error pasting a live JWT into the file; mitigated by the inline warning. | gsd-security-auditor (audit) | 2026-06-07 |
| AR-07-02 | T-07-03-03 | Client 42501→FORBIDDEN mapping (configVagaService isForbidden) is UX-only and non-authoritative. A spoofed client could suppress/alter the toast, but the authoritative authorization gate is the server-side in-body role check inside the SECURITY DEFINER RPCs (`publish_vaga`/`upsert_pergunta_opcoes_metadata`), which raise 42501 independently of any client mapping. No privilege can be gained client-side. | gsd-security-auditor (audit) | 2026-06-07 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-07 | 19 | 19 | 0 | gsd-security-auditor (Opus 4.8) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-07
