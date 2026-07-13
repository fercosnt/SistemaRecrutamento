---
phase: 25
slug: corre-o-do-funil-lado-rh-enums-colunas-contratos
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-09
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth for the behavioral invariants: `25-RESEARCH.md` § Validation Architecture (smokes A–E + FUNIL-05 contract test).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (unit/contract) · Deno test (EF corpus) · live SQL smokes via Supabase MCP `execute_sql` (DB invariants) |
| **Config file** | `vite.config.ts` / `vitest` · `supabase/functions/deno.json` |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` |
| **Estimated runtime** | ~60–90 seconds (vitest) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (scoped where possible)
- **After every plan wave:** Run full suite + `npm run lint` (tsc baseline gate) + `npm run build`
- **Before `/gsd:verify-work`:** Full suite green; DB smokes A–E PASS on PROD via MCP
- **Max feedback latency:** ~90 seconds

---

## Behavioral Invariants (from RESEARCH § Validation Architecture)

| ID | Invariant | Verify method |
|----|-----------|---------------|
| A | Status-only UPDATE to `status='rejeitado'` outside a sanctioned RPC is BLOCKED (raises) | SQL smoke (set_config jwt.claims RH; raw UPDATE → expect exception) |
| B | The sanctioned path (`registrar_decisao`) still rejects successfully + writes audit | SQL smoke (call RPC → row in decisao_final + historico) |
| C | `decisao_final_historico` receives a row on amendment (incl. same-etapa / em_espera) | SQL smoke (amend decision twice → prior row preserved) |
| D | `upsert_pergunta_opcoes_metadata` on an ATIVA vaga RAISEs; on rascunho succeeds | SQL smoke (status guard both branches) |
| E | Template↔container test-id contract holds | vitest contract test (parse every cargoTemplate through the container branch-map) |

---

## Per-Task Verification Map

*Populated by the planner (each task cites its invariant A–E or a unit/contract test) and finalized by the nyquist audit.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | — | — | — | — | — | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] FUNIL-05 contract test scaffold (`src/features/config-vaga/templates/__tests__/cargoTemplates.contract.test.ts` or nearest analog) — RED before the id-mapping fix
- [ ] DB smoke fixtures reuse the disposable-fixture + `set_config('request.jwt.claims', …)` pattern (precedent: Phases 8/11/24 smokes)

*Existing vitest + Deno infrastructure covers the rest.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Kanban drag-drop visually maps candidates into the 6 real stage columns | FUNIL-03 | Drag interaction / visual reflow | RH board: verify each stage column present, cards land in correct column, terminals show as badges not columns |
| Editar Vaga round-trip (edit → reload keeps salary/requirements/config) | FUNIL-04 | Full form round-trip in browser | Edit a published vaga, change base fields + weights, save, reload → values persist |
| Mock-screen empty-states + hub 404 render | UX-03/06 | Visual | Visit /rh/configuracoes, /rh/perfil, and a bad /rh/candidatos/:id → empty-state / not-found shown |

*These are the confirmatory live UATs — deferrable to a HUMAN-UAT doc per standing preference.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or map to invariant A–E / Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
