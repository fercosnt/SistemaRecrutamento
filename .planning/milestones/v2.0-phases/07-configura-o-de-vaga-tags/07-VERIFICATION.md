---
phase: 7
slug: configura-o-de-vaga-tags
created: 2026-06-07
verified: 2026-06-07
status: passed
nyquist_compliant: true
requirements_verified: [VAGACFG-01, VAGACFG-02, VAGACFG-03]
verified_by: orchestrator (gsd-verifier died on transient socket error mid-run; orchestrator completed goal-backward verification inline with first-hand live-DB + test evidence)
---

# Phase 7 — Verification Artifact

> Status: `passed` — all 3 ROADMAP Phase 7 success criteria evidenced via live-DB
> smoke verification (isljnozzlvckrgjjbjwp) + the full Vitest suite (395/395) + a
> source-artifact audit. The 3 VAGACFG requirements are accounted for in
> REQUIREMENTS.md (all `[x]` Complete, mapped to Phase 7).
>
> **Authorship note:** The spawned `gsd-verifier` subagent terminated on a
> transient API socket error after 47 read tool-uses, before it could write this
> file. The orchestrator had already independently verified the load-bearing
> facts (live schema apply + 5 SQL smokes + 395-test suite + build + schema-drift
> gate) during Wave-2 checkpoint handling and the post-execution gates, and
> completed the remaining goal-backward checks inline. Evidence is first-hand, not
> a relayed subagent claim.

## Success Criteria — ROADMAP Phase 7

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | RH cria vaga escolhendo um dos 8 templates de cargo real; `testes_aplicaveis` + pesos default pré-preenchidos, com override permitido | ✓ passed | `src/features/config-vaga/templates/cargoTemplates.ts` declares all 8 real cargo slugs — live grep returns exactly `{asb, assistente_financeiro, consultor_vendas_premium, dentista, recepcionista, sdr_social_seller, tsb, vaga_generica}`. `cargoTemplates.test.ts` 10/10 GREEN asserting every one of the 8 templates' `pesos` sum to exactly 100 AND that template selection yields a deep copy (mutating the copy does not mutate `cargoTemplates` → override-on-vaga is safe). `TemplateVagaSelector.test.tsx` GREEN: 8 cards render, deep-copy-on-select callback, "Trocar template" AlertDialog on re-select. Persistence target live in prod DB: `vagas.testes_aplicaveis jsonb` + `vagas.pesos_avaliacao jsonb` columns confirmed present (information_schema query 2026-06-07). Wired into `CriarEditarVagaPage` (⚙️ Avaliação tab) with real `updateVagaConfig` persistence (stub `console.log` save removed). |
| 2 | RH ajusta `pesos_avaliacao` via sliders; UI mostra erro inline se a soma ≠ 100% | ✓ passed | `pesosAvaliacaoSchema.test.ts` GREEN: `safeParse` REJECTS sum≠100, ACCEPTS sum=100, integer-guard rejects floats; `somaPesos` returns the live partial sum. `PesosSliders.test.tsx` GREEN: live-sum indicator shows the error color/copy when sum≠100 and the valid copy at 100, AND dragging one slider does NOT auto-rebalance the others (D-08 — no silent rebalance). Server defense-in-depth: `publish_vaga` RPC re-checks pesos sum=100 in-body — live smoke §4a (sum=95) raised `P0001 / Os pesos de avaliacao precisam somar 100% (soma atual: 95).` and left status `rascunho`; §4b (sum=100) transitioned to `ativa`. |
| 3 | RH marca tags em opções (5 tags + peso + nota_ia) com bulk-mark "tudo informativa"; validação só dispara no "Publicar vaga" | ✓ passed (mechanism + schema + tests; end-to-end page exercise deferred to F11 per D-05) | Live prod schema: `enum_tag_opcao` = 5 values `{knockout, atencao, neutro, pontua, fortemente_pontua}`; `pergunta_opcao_metadata` with `opcao_id` + `opcao_texto` (D-14) + `peso int CHECK (peso BETWEEN -999 AND 100)` + `nota_ia text` + RLS policy `rh_gerencia_opcao_metadata` (role `administrador`, NOT stale `admin`). `PerguntaWithTagsForm.test.tsx` GREEN (choice-only render + empty-state copy for texto/numerico, D-11). `BulkMarkDialog.test.tsx` GREEN (confirm sets every option neutro/peso 0/nota_ia null). `publishGate.test.ts` GREEN: all 3 D-12 conditions flagged + the all-pass case. The tag write path is the atomic `upsert_pergunta_opcoes_metadata` RPC — live smoke §1 (idempotency: row_count=2, stable ids) + §2 (opcao_id backfill null→uuid, jsonb rewritten to `[{id,texto}]`) PASS. **By-design (D-05, plan-04-sanctioned):** the wizard renders its empty-state in the page today because the SJT/choice question bank lands in Phase 11; the marking mechanism, schema, RPC, and tests are all present and exercised — which is the Phase-7 scope. |

## Requirement Traceability — REQUIREMENTS.md

| Requirement | Status in REQUIREMENTS.md | Mapped | Closing artifact |
|-------------|---------------------------|--------|------------------|
| VAGACFG-01 (RF-33) | `[x]` Complete | Phase 7 | 07-01 (template test) + 07-03 (cargoTemplates) + 07-04 (TemplateVagaSelector + wire-up) |
| VAGACFG-02 (RF-34) | `[x]` Complete | Phase 7 | 07-01 (pesos test) + 07-02 (`vagas.pesos_avaliacao` + publish_vaga sum-gate) + 07-03 (schema/somaPesos) + 07-04 (PesosSliders) |
| VAGACFG-03 (RF-35, RF-36) | `[x]` Complete | Phase 7 | 07-01 (publishGate/tag tests) + 07-02 (`enum_tag_opcao` + `pergunta_opcao_metadata` + RPCs + RLS) + 07-03 (tagOpcaoSchema/service) + 07-04 (PerguntaWithTagsForm + BulkMarkDialog) |

All 3 phase requirement IDs accounted for — none orphaned.

## Decision Honored Check (07-CONTEXT.md D-01..D-14)

| Decision | Honored | Evidence |
|----------|---------|----------|
| D-06 (only `testes_aplicaveis` + `pesos_avaliacao` added; NOT `qualificacao_etapa1`) | ✓ | Live `vagas` columns confirmed; `qualificacao_etapa1` absent (Phase 8). |
| D-07 (4 weighted keys triagem/work_sample_sjt/redacao_cultural/entrevista sum=100; big_five/cognitivo context-only) | ✓ | `pesos_avaliacao` default + publish_vaga sum check use exactly the 4 keys. |
| D-08 (free sliders + inline error, no silent rebalance) | ✓ | PesosSliders.test.tsx asserts no auto-rebalance. |
| D-10 / D-14 (relational `pergunta_opcao_metadata` keyed by stable `opcao_id`; stores BOTH opcao_id + opcao_texto) | ✓ | Live table + smoke §2 jsonb↔table sync; join contract documented in 07-02-SUMMARY for F8/F10/F15. |
| D-11 (5-tag taxonomy + peso default 0 + nota_ia null; choice-only wizard; bulk-mark) | ✓ | enum + table CHECK + BulkMarkDialog/PerguntaWithTagsForm tests. |
| D-12 (3-condition publish gate, only on Publicar) | ✓ | publishGate fn + publish_vaga RPC; smoke §4 sad/happy. |
| D-13 (migrate `opcoes_resposta` string[]→[{id,texto}] + update Phase-4 reader w/ regression) | ✓ | `candidaturaFormSchema.test.ts` 18/18 (16 legacy preserved + 2 new object-shape cases) via neutral `@/lib/opcoes/opcoesNormalize`. |
| D-22 (PL/pgSQL apply via SQL-Editor/MCP, not autonomous push; SQLSTATE 42601 workaround) | ✓ | Applied via Supabase MCP `execute_sql`; version rows reconciled; `db push` = "Remote database is up to date". |

## Quality Gates

| Gate | Result |
|------|--------|
| Full Vitest suite | **395/395 passing** (36 test files), 0 failures (2026-06-07) |
| `npm run build` | exit 0 (`✓ built in ~8s`) |
| tsc lint baseline (FOUND-08) | held at **301**, zero growth — Phase-7 net-new src files add no new errors |
| Live SQL smoke runbook (07-SQL-SMOKE-RUNBOOK.md) | §1–§5 **all PASS** |
| Schema-drift gate | `drift_detected: false`, `unpushed_orms: []` |
| `nyquist_compliant` | `true` (every Phase-7 module has a green automated verify) |
| Self-Check FAILED markers in SUMMARYs | none (4/4 SUMMARYs clean) |

## Notes / Carry-forward

- **Security gate:** `workflow.security_enforcement=true` and no `07-SECURITY.md` exists yet. Each plan carries an inline threat model (RLS + in-body 42501 role checks + publish_vaga defense-in-depth verified live), but a formal `/gsd:secure-phase 7` pass is recommended before milestone close.
- **F8/F10/F15 join contract (D-14):** documented in `07-02-SUMMARY.md` — join on `opcao_id` primary, `opcao_texto` fallback/audit. Phase 8 must not re-litigate.
- **Tag wizard end-to-end** becomes user-exercisable once Phase 11 populates the SJT/choice question bank (D-05).
- **One bug caught + fixed during apply** (`8f1941b`): `publish_vaga` pesos-mismatch `RAISE` doubled `%%` → corrected to single `%`; validated by smoke §4a.
